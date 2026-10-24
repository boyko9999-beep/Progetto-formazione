/*
 * Laboratorio «Il percettrone che impara» (capitolo 13 · Quando il software impara).
 *
 * Un neurone artificiale con due ingressi x1, x2 ∈ {0, 1}, due pesi w1, w2, un bias b e una soglia
 * a gradino: y = 1 se w1·x1 + w2·x2 + b ≥ 0, altrimenti y = 0. Si addestra con la regola di Rosenblatt
 *   w ← w + η (t − y) x        (t = risposta attesa, y = risposta data, η = passo di apprendimento)
 * sulle tavole di verità di AND, OR e XOR. AND e OR si imparano in poche epoche; lo XOR mai, perché
 * nessuna retta separa i suoi casi. La soluzione è una rete a due strati con pesi scelti a mano:
 * un neurone OR e un neurone NAND che alimentano un neurone AND.
 *
 * La logica è pura (niente DOM) ed è esportata per i test in Node; l'interfaccia vive in monta().
 */
(function (root) {
  'use strict';

  /* ---------- logica pura ---------- */

  const INGRESSI = [[0, 0], [0, 1], [1, 0], [1, 1]];

  const FUNZIONI = {
    AND: { nome: 'AND', uscite: [0, 0, 0, 1], regola: 'vale 1 solo se entrambi gli ingressi valgono 1' },
    OR: { nome: 'OR', uscite: [0, 1, 1, 1], regola: 'vale 1 se almeno uno dei due ingressi vale 1' },
    XOR: { nome: 'XOR', uscite: [0, 1, 1, 0], regola: 'vale 1 solo se i due ingressi sono diversi' },
  };

  // Pesi scelti a mano per la rete a due strati che calcola lo XOR.
  const DUE_STRATI = {
    h1: { nome: 'OR', w1: 1, w2: 1, b: -0.5 },
    h2: { nome: 'NAND', w1: -1, w2: -1, b: 1.5 },
    y: { nome: 'AND', w1: 1, w2: 1, b: -1.5 },
  };

  const SEME_INIZIALE = 2;   // pesi di partenza: w1 = 0,47, w2 = −0,35, b = −0,43
  const ETA_INIZIALE = 0.25;
  const EPOCHE_MAX = 60;     // tetto per AND e OR: con η ≥ 0,05 e pesi iniziali in [−1, 1] bastano sempre meno di 50 epoche
  const EPOCHE_XOR = 12;     // dopo tante epoche senza successo sullo XOR arriva la spiegazione

  // Arrotonda per evitare residui come 0,30000000000000004 (e lo zero negativo).
  function pulisci(v, cifre) {
    const f = Math.pow(10, cifre == null ? 6 : cifre);
    const r = Math.round(v * f) / f;
    return r === 0 ? 0 : r;
  }

  function gradino(z) { return z >= 0 ? 1 : 0; }
  function somma(p, x) { return pulisci(p.w1 * x[0] + p.w2 * x[1] + p.b, 9); }
  function predici(p, x) { return gradino(somma(p, x)); }
  function previsioni(p) { return INGRESSI.map((x) => predici(p, x)); }

  function contaErrori(p, funzione) {
    const t = FUNZIONI[funzione].uscite;
    let n = 0;
    INGRESSI.forEach((x, i) => { if (predici(p, x) !== t[i]) n += 1; });
    return n;
  }

  // Un esempio con la regola del percettrone: w ← w + η (t − y) x, b ← b + η (t − y).
  function regola(p, x, t, eta) {
    const z = somma(p, x);
    const y = gradino(z);
    const errore = t - y;
    const delta = { w1: pulisci(eta * errore * x[0]), w2: pulisci(eta * errore * x[1]), b: pulisci(eta * errore) };
    const prima = { w1: p.w1, w2: p.w2, b: p.b };
    const dopo = errore === 0 ? { w1: p.w1, w2: p.w2, b: p.b }
      : { w1: pulisci(p.w1 + delta.w1), w2: pulisci(p.w2 + delta.w2), b: pulisci(p.b + delta.b) };
    return { z: z, y: y, t: t, errore: errore, delta: delta, prima: prima, dopo: dopo };
  }

  // Stato di un addestramento: gli esempi si presentano sempre nello stesso ordine (00, 01, 10, 11).
  function nuovo(pesi, funzione, eta) {
    const p = { w1: pesi.w1, w2: pesi.w2, b: pesi.b };
    return {
      funzione: funzione, eta: eta, pesi: p,
      indice: 0, epoca: 0, erroriEpoca: 0, erroriUltimaEpoca: null, aggiornamenti: 0,
      imparato: contaErrori(p, funzione) === 0,
    };
  }

  function passo(stato) {
    const i = stato.indice;
    const x = INGRESSI[i];
    const t = FUNZIONI[stato.funzione].uscite[i];
    const r = regola(stato.pesi, x, t, stato.eta);
    const sbagliato = r.errore !== 0;
    const s = Object.assign({}, stato, {
      pesi: r.dopo,
      indice: (i + 1) % INGRESSI.length,
      erroriEpoca: stato.erroriEpoca + (sbagliato ? 1 : 0),
      aggiornamenti: stato.aggiornamenti + (sbagliato ? 1 : 0),
    });
    const fineEpoca = i === INGRESSI.length - 1;
    if (fineEpoca) {
      s.epoca = stato.epoca + 1;
      s.erroriUltimaEpoca = s.erroriEpoca;
      s.erroriEpoca = 0;
    }
    s.imparato = contaErrori(s.pesi, s.funzione) === 0;
    return { stato: s, esempio: Object.assign({ indice: i, x: x }, r), fineEpoca: fineEpoca };
  }

  // Completa l'epoca in corso (quattro esempi se si parte dall'inizio).
  function epoca(stato) {
    const passi = [];
    let s = stato;
    do {
      const r = passo(s);
      passi.push(r);
      s = r.stato;
    } while (s.indice !== 0);
    return { stato: s, passi: passi };
  }

  // Addestra finché il neurone risponde giusto ai quattro esempi o finché si arriva a maxEpoche.
  function addestra(stato, maxEpoche) {
    const limite = maxEpoche == null ? EPOCHE_MAX : maxEpoche;
    let s = stato;
    let guardia = 0;
    while (!s.imparato && s.epoca < limite && guardia < 1e5) {
      s = passo(s).stato;
      guardia += 1;
    }
    return s;
  }

  function dueStrati(x) {
    const h1 = predici(DUE_STRATI.h1, x);
    const h2 = predici(DUE_STRATI.h2, x);
    return { h1: h1, h2: h2, y: predici(DUE_STRATI.y, [h1, h2]) };
  }

  // Generatore pseudocasuale con seme (mulberry32): lo stesso seme dà sempre gli stessi pesi.
  function mulberry32(seme) {
    let a = seme | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pesiCasuali(seme) {
    const r = mulberry32(seme);
    const v = () => pulisci(Math.round((r() * 2 - 1) * 100) / 100, 2);
    return { w1: v(), w2: v(), b: v() };
  }

  /* geometria del piano degli ingressi */

  function riquadro(min, max) { return [[min, min], [max, min], [max, max], [min, max]]; }

  // Tiene la parte di un poligono convesso in cui w1·x1 + w2·x2 + b ≥ 0 (Sutherland–Hodgman).
  function ritaglia(poligono, p) {
    const f = (q) => p.w1 * q[0] + p.w2 * q[1] + p.b;
    const out = [];
    for (let i = 0; i < poligono.length; i++) {
      const a = poligono[i];
      const c = poligono[(i + 1) % poligono.length];
      const fa = f(a);
      const fc = f(c);
      if (fa >= 0) out.push(a);
      if ((fa >= 0) !== (fc >= 0)) {
        const k = fa / (fa - fc);
        out.push([a[0] + k * (c[0] - a[0]), a[1] + k * (c[1] - a[1])]);
      }
    }
    return out;
  }

  function zonaUno(p, min, max) { return ritaglia(riquadro(min, max), p); }

  // Segmento della retta w1·x1 + w2·x2 + b = 0 dentro il riquadro, oppure null.
  function retta(p, min, max) {
    const eps = 1e-9;
    if (Math.abs(p.w1) < eps && Math.abs(p.w2) < eps) return null;
    const pts = [];
    const dentro = (q) => q[0] >= min - eps && q[0] <= max + eps && q[1] >= min - eps && q[1] <= max + eps;
    const aggiungi = (q) => {
      if (dentro(q) && !pts.some((r) => Math.abs(r[0] - q[0]) < 1e-7 && Math.abs(r[1] - q[1]) < 1e-7)) pts.push(q);
    };
    if (Math.abs(p.w2) >= eps) [min, max].forEach((x) => aggiungi([x, -(p.w1 * x + p.b) / p.w2]));
    if (Math.abs(p.w1) >= eps) [min, max].forEach((y) => aggiungi([-(p.w2 * y + p.b) / p.w1, y]));
    let migliore = null;
    let d = 1e-10;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dd = Math.pow(pts[i][0] - pts[j][0], 2) + Math.pow(pts[i][1] - pts[j][1], 2);
        if (dd > d) { d = dd; migliore = [pts[i], pts[j]]; }
      }
    }
    return migliore;
  }

  const Logica = {
    INGRESSI: INGRESSI,
    FUNZIONI: FUNZIONI,
    DUE_STRATI: DUE_STRATI,
    SEME_INIZIALE: SEME_INIZIALE,
    ETA_INIZIALE: ETA_INIZIALE,
    EPOCHE_MAX: EPOCHE_MAX,
    EPOCHE_XOR: EPOCHE_XOR,
    pulisci: pulisci,
    gradino: gradino,
    somma: somma,
    predici: predici,
    previsioni: previsioni,
    contaErrori: contaErrori,
    regola: regola,
    nuovo: nuovo,
    passo: passo,
    epoca: epoca,
    addestra: addestra,
    dueStrati: dueStrati,
    mulberry32: mulberry32,
    pesiCasuali: pesiCasuali,
    riquadro: riquadro,
    ritaglia: ritaglia,
    zonaUno: zonaUno,
    retta: retta,
  };

  /* ---------- aspetto ---------- */

  const css = `
.lab-percettrone {
  container-type: inline-size;
  --lp-pos: var(--trace-3);
  --lp-neg: var(--trace-4);
  --lp-uno: var(--trace-2);
  --lp-ok: var(--trace-1);
  --lp-ko: #ff6f61;
  --lp-sel: var(--lab-bright);
}
.lab-percettrone-barra { row-gap: 12px; }
.lab-percettrone-barra .pg-gruppo .pg-btn { min-width: 62px; font-family: var(--mono); font-weight: 800; letter-spacing: .04em; }
.lab-percettrone-eta { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.lab-percettrone-eta .pg-cursore { width: 132px; min-height: 40px; }
.lab-percettrone-eta output { font: 800 1rem var(--mono); color: var(--lab-bright); min-width: 4ch; font-variant-numeric: tabular-nums; }
.lab-percettrone-cont { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 16px; margin: 0 0 0 auto; font: 600 .8125rem var(--mono); color: var(--lab-text); }
.lab-percettrone-cont b { color: var(--lab-bright); font-size: 1rem; margin-left: 5px; font-variant-numeric: tabular-nums; }
.lab-percettrone-cont .ko { color: var(--lp-ko); }
.lab-percettrone-cont .ok { color: var(--lp-ok); }

.lab-percettrone-palco { display: grid; gap: 14px; padding: 16px 18px 18px; }
@container (min-width: 720px) {
  .lab-percettrone-palco { grid-template-columns: minmax(0, 1.08fr) minmax(0, .92fr); grid-template-areas: "neurone piano" "tavola piano"; align-items: start; }
  .lab-percettrone-neurone { grid-area: neurone; }
  .lab-percettrone-piano { grid-area: piano; }
  .lab-percettrone-tavola { grid-area: tavola; }
}
.lab-percettrone .pg-pannello { min-width: 0; }
.lab-percettrone-tit { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 10px; margin: 0 0 10px; font: 800 .8125rem/1.3 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--lab-text); }
.lab-percettrone-tit span { color: var(--lp-uno); letter-spacing: .06em; }
.lab-percettrone-svg { display: block; width: 100%; height: auto; margin: 0 auto; max-width: 430px; overflow: visible; }
.lab-percettrone-svg--piano { max-width: 380px; }

.lab-percettrone svg text { font-family: var(--mono); fill: var(--lab-text); text-anchor: middle; dominant-baseline: central; }
.lab-percettrone svg .lab-percettrone-etic { font-size: 18px; font-weight: 800; fill: var(--lab-bright); }
.lab-percettrone svg .lab-percettrone-nome { font-size: 17px; font-weight: 700; paint-order: stroke; stroke: var(--lab-panel); stroke-width: 6px; stroke-linejoin: round; }
.lab-percettrone svg .lab-percettrone-val { font-size: 18px; font-weight: 800; fill: var(--lab-bright); }
.lab-percettrone svg .lab-percettrone-val.su { fill: #2a1b00; }
.lab-percettrone svg .lab-percettrone-gate { font-size: 17px; font-weight: 800; fill: var(--lab-bright); }
.lab-percettrone svg .lab-percettrone-gate.su { fill: #2a1b00; }
.lab-percettrone-nodo { fill: var(--lab-bg); stroke: var(--lab-line); stroke-width: 2; }
.lab-percettrone-nodo.tratt { stroke-dasharray: 4 4; stroke: var(--lab-text); }
.lab-percettrone-luce { fill: var(--lp-uno); opacity: 0; transition: opacity var(--pg-dur-veloce) ease; }
.lab-percettrone-luce.on { opacity: 1; }
.lab-percettrone-luce.tenue { opacity: .5; }
.lab-percettrone-arco { stroke: var(--lab-line); stroke-linecap: round; fill: none; }
.lab-percettrone-arco.pos { stroke: var(--lp-pos); }
.lab-percettrone-arco.neg { stroke: var(--lp-neg); stroke-dasharray: 9 6; stroke-linecap: butt; }
.lab-percettrone-filo { stroke: var(--lab-line); stroke-width: 2.5; stroke-linecap: round; }
.lab-percettrone svg .lab-percettrone-sigma-t { font-size: 26px; font-weight: 700; fill: var(--lab-bright); }
.lab-percettrone-sum { transform-box: fill-box; transform-origin: center; }
.lab-percettrone-sum.via { animation: lab-percettrone-pulsa var(--pg-dur-normale) var(--pg-ease-smooth); }
.lab-percettrone-gbox { fill: var(--lab-bg); stroke: var(--lab-line); stroke-width: 2; }
.lab-percettrone-gpath { fill: none; stroke: var(--lab-bright); stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }
.lab-percettrone-gcur { fill: var(--lp-uno); stroke: var(--lab-bg); stroke-width: 2; opacity: 0; }
.lab-percettrone-gcur.on { opacity: 1; }
.lab-percettrone-anello { fill: none; stroke-width: 3.5; opacity: 0; transition: opacity var(--pg-dur-veloce) ease; }
.lab-percettrone-anello.ok { stroke: var(--lp-ok); opacity: 1; }
.lab-percettrone-anello.ko { stroke: var(--lp-ko); opacity: 1; }
.lab-percettrone-imp { fill: var(--lp-uno); stroke: var(--lab-bg); stroke-width: 2; }

.lab-percettrone-fondo { fill: var(--lab-bg); stroke: var(--lab-line); stroke-width: 1.5; }
.lab-percettrone-quad { fill: none; stroke: var(--lab-line); stroke-width: 1.5; stroke-dasharray: 5 5; }
.lab-percettrone-zona { fill: var(--lp-uno); opacity: .17; }
.lab-percettrone-alone { stroke: var(--lab-bright); stroke-width: 10; opacity: .1; stroke-linecap: round; }
.lab-percettrone-retta { stroke: var(--lab-bright); stroke-width: 2.5; stroke-linecap: round; }
.lab-percettrone-retta.porta { stroke: var(--lp-pos); }
.lab-percettrone svg .lab-percettrone-tacca { font-size: 17px; }
.lab-percettrone svg .lab-percettrone-asse { font-size: 18px; font-weight: 800; fill: var(--lab-bright); }
.lab-percettrone svg .lab-percettrone-nomeretta { font-size: 17px; font-weight: 800; fill: var(--lp-pos); paint-order: stroke; stroke: var(--lab-bg); stroke-width: 6px; stroke-linejoin: round; }
.lab-percettrone-pt { fill: var(--lab-bg); stroke: var(--lp-uno); stroke-width: 3; }
.lab-percettrone-pt.pieno { fill: var(--lp-uno); }
.lab-percettrone-ko { fill: none; stroke: var(--lp-ko); stroke-width: 2.5; stroke-dasharray: 4 3.3; opacity: 0; }
.lab-percettrone-ko.on { opacity: 1; }
.lab-percettrone-sel { fill: none; stroke: var(--lp-sel); stroke-width: 2.5; opacity: 0; transition: opacity var(--pg-dur-veloce) ease; }
.lab-percettrone-sel.on { opacity: 1; }
.lab-percettrone-ping { fill: none; stroke: var(--lp-sel); stroke-width: 2; opacity: 0; transform-box: fill-box; transform-origin: center; }
.lab-percettrone-ping.via { animation: lab-percettrone-ping var(--pg-dur-lenta) var(--pg-ease-smooth) both; }

.lab-percettrone-legenda { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 16px; font-size: .8125rem; color: var(--lab-text); }
.lab-percettrone-legenda li { display: inline-flex; align-items: center; gap: 7px; }
.lab-percettrone-legenda i { flex: none; display: inline-block; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid var(--lp-uno); }
.lab-percettrone-legenda i.pieno { background: var(--lp-uno); }
.lab-percettrone-legenda i.zona { border-radius: 3px; border: 1px solid color-mix(in srgb, var(--lp-uno) 45%, transparent); background: color-mix(in srgb, var(--lp-uno) 24%, transparent); }
.lab-percettrone-legenda i.ko { border: 2.5px dashed var(--lp-ko); }

.lab-percettrone-pesi { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 10px; }
.lab-percettrone-chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 8px; background: var(--lab-bg); border: 1px solid var(--lab-line); font: 600 .9rem var(--mono); color: var(--lab-text); font-variant-numeric: tabular-nums; }
.lab-percettrone-chip b { color: var(--lab-bright); min-width: 5ch; text-align: right; }
.lab-percettrone-chip i { flex: none; width: 18px; height: 0; border-top: 3px solid var(--lab-line); }
.lab-percettrone-chip.pos i { border-top-color: var(--lp-pos); }
.lab-percettrone-chip.neg i { border-top: 3px dashed var(--lp-neg); }
.lab-percettrone-calc { margin: 0; font: 500 .875rem/1.6 var(--mono); color: var(--lab-text); overflow-wrap: anywhere; }
.lab-percettrone-calc + .lab-percettrone-calc { margin-top: 4px; }
.lab-percettrone-calc strong { color: var(--lab-bright); }
.lab-percettrone .ok { color: var(--lp-ok); font-weight: 800; }
.lab-percettrone .ko { color: var(--lp-ko); font-weight: 800; }
.lab-percettrone-seme { margin: 8px 0 0; font-size: .8125rem; color: var(--lab-text); opacity: .85; }

.lab-percettrone-tabella { width: 100%; min-width: 0; border-collapse: separate; border-spacing: 0 5px; font: 700 1rem var(--mono); font-variant-numeric: tabular-nums; }
.lab-percettrone-tabella th { position: static; background: none; border: 0; padding: 0 6px 2px; font: 700 .8125rem var(--font); text-transform: none; letter-spacing: 0; color: var(--lab-text); text-align: center; vertical-align: bottom; }
.lab-percettrone-tabella td { padding: 7px 6px; text-align: center; color: var(--lab-bright); background: var(--lab-bg); border: 0; border-top: 1.5px solid transparent; border-bottom: 1.5px solid transparent; vertical-align: middle; }
.lab-percettrone-tabella td:first-child { border-left: 1.5px solid transparent; border-radius: 8px 0 0 8px; color: var(--lp-sel); width: 2em; }
.lab-percettrone-tabella td:last-child { border-right: 1.5px solid transparent; border-radius: 0 8px 8px 0; }
.lab-percettrone-tabella tr.corrente td { border-color: var(--lp-sel); background: color-mix(in srgb, var(--lp-sel) 9%, var(--lab-bg)); }
.lab-percettrone-tabella td.att { color: var(--lp-uno); }
.lab-percettrone-nota { margin: 6px 0 0; font-size: .875rem; line-height: 1.5; color: var(--lab-text); }

.lab-percettrone-esito { margin: 0 18px 18px; padding: 14px 16px; border-radius: 12px; background: var(--lab-panel); border: 1px solid var(--lab-line); border-left: 4px solid var(--lp-ok); display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 14px; align-items: start; animation: lab-percettrone-entra var(--pg-dur-normale) var(--pg-ease-smooth) both; }
.lab-percettrone-esito[hidden] { display: none; }
.lab-percettrone-esito.xor, .lab-percettrone-esito.lungo { border-left-color: var(--lp-ko); }
.lab-percettrone-esito p { margin: 0 0 .55em; line-height: 1.6; color: var(--lab-text); }
.lab-percettrone-esito p:last-child { margin-bottom: 0; }
.lab-percettrone-esito strong { color: var(--lab-bright); }
.lab-percettrone-esito .pg-btn { margin-top: 4px; }
.lab-percettrone-porta { width: 64px; height: 48px; display: block; }
.lab-percettrone-porta path, .lab-percettrone-porta line { fill: none; stroke: var(--lp-ok); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.lab-percettrone-porta text { font: 800 11px var(--mono); fill: var(--lp-ok); text-anchor: middle; }
.lab-percettrone-esito.xor .lab-percettrone-porta path, .lab-percettrone-esito.xor .lab-percettrone-porta line, .lab-percettrone-esito.lungo .lab-percettrone-porta path, .lab-percettrone-esito.lungo .lab-percettrone-porta line { stroke: var(--lp-ko); }
.lab-percettrone-esito.xor .lab-percettrone-porta text, .lab-percettrone-esito.lungo .lab-percettrone-porta text { fill: var(--lp-ko); }

.lab-percettrone-due { margin: 0 18px 18px; padding: 16px; border-radius: 12px; background: var(--lab-panel); border: 1px solid var(--lab-line); border-top: 3px solid var(--lp-pos); animation: lab-percettrone-entra var(--pg-dur-lenta) var(--pg-ease-smooth) both; }
.lab-percettrone-due[hidden] { display: none; }
.lab-percettrone-due h4 { margin: 0 0 6px; color: var(--lab-bright); font-size: 1.08rem; }
.lab-percettrone-due h4:focus { outline: none; }
.lab-percettrone-due h4:focus-visible { outline: 3px solid var(--trace-1); outline-offset: 3px; border-radius: 4px; }
.lab-percettrone-due > p { margin: 0 0 12px; line-height: 1.6; max-width: 72ch; }
.lab-percettrone-due > p strong { color: var(--lab-bright); }
.lab-percettrone-due-griglia { display: grid; gap: 14px; align-items: center; }
@container (min-width: 720px) {
  .lab-percettrone-due-griglia { grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); }
}
.lab-percettrone-due-ctrl { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin: 14px 0 10px; }
.lab-percettrone-due-ctrl .pg-gruppo .pg-btn { font-family: var(--mono); font-weight: 800; min-width: 56px; }
.lab-percettrone-due-lettura { margin: 0 0 10px; font: 600 .9rem/1.6 var(--mono); color: var(--lab-text); }
.lab-percettrone-due-lettura strong { color: var(--lab-bright); }
.lab-percettrone-due-pesi { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 8px; }
.lab-percettrone-due-pesi li { padding: 6px 10px; border-radius: 8px; background: var(--lab-bg); border: 1px solid var(--lab-line); font: 600 .84rem var(--mono); color: var(--lab-text); }
.lab-percettrone-due-pesi b { color: var(--lab-bright); }

.lab-percettrone-spiega p { max-width: 80ch; }

@keyframes lab-percettrone-ping { from { opacity: .95; transform: scale(.7); } to { opacity: 0; transform: scale(1.9); } }
@keyframes lab-percettrone-pulsa { 0% { transform: scale(1); } 40% { transform: scale(1.12); } 100% { transform: scale(1); } }
@keyframes lab-percettrone-entra { from { opacity: 0; transform: translateY(8px); } }

@container (max-width: 520px) {
  .lab-percettrone-palco { padding: 12px; gap: 12px; }
  .lab-percettrone .pg-pannello { padding: 12px; }
  .lab-percettrone-esito { margin: 0 12px 14px; grid-template-columns: minmax(0, 1fr); }
  .lab-percettrone-esito .lab-percettrone-porta { display: none; }
  .lab-percettrone-due { margin: 0 12px 14px; padding: 14px 12px; }
  .lab-percettrone-cont { margin-left: 0; width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .lab-percettrone *, .lab-percettrone *::before, .lab-percettrone *::after { animation: none !important; transition: none !important; }
}
`;

  /* ---------- interfaccia ---------- */

  const MENO = '−';
  const RIQ = { min: -0.6, max: 1.6 };   // porzione di piano disegnata, in coordinate degli ingressi

  function num(v, cifre) {
    const testo = Math.abs(v).toFixed(cifre == null ? 2 : cifre).replace('.', ',');
    return (v < 0 && /[1-9]/.test(testo) ? MENO : '') + testo;
  }
  function numSegno(v) {
    const t = num(v);
    return t.charAt(0) === MENO || !/[1-9]/.test(t) ? t : '+' + t;
  }
  function inFormula(v) { return v < 0 && /[1-9]/.test(num(v)) ? '(' + num(v) + ')' : num(v); }
  function casi(n) { return n === 1 ? 'un caso' : n + ' casi'; }
  function errori(n) { return n === 0 ? 'nessun errore' : (n === 1 ? 'un errore' : n + ' errori'); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpPesi(a, b, t) { return { w1: lerp(a.w1, b.w1, t), w2: lerp(a.w2, b.w2, t), b: lerp(a.b, b.b, t) }; }
  function uguali(a, b) { return a.w1 === b.w1 && a.w2 === b.w2 && a.b === b.b; }
  function coppia(x) { return '(' + x[0] + ', ' + x[1] + ')'; }

  // Velocità delle animazioni (millisecondi): flusso dei segnali, cursore della soglia, pausa sul confronto, spostamento dei pesi.
  const PASSO = {
    lento: { flusso: 560, soglia: 260, confronto: 340, pesi: 620, dopo: 0 },
    medio: { flusso: 300, soglia: 150, confronto: 160, pesi: 360, dopo: 60 },
    veloce: { flusso: 0, soglia: 0, confronto: 50, pesi: 170, dopo: 30 },
    lampo: { flusso: 0, soglia: 0, confronto: 0, pesi: 70, dopo: 25 },
  };

  function monta(el, ctx) {
    const h = ctx.h;
    const s = ctx.s;
    const L = Logica;

    let seme = SEME_INIZIALE;
    let st = nuovo(pesiCasuali(seme), 'AND', ETA_INIZIALE);
    let ultimo = null;          // ultimo esempio esaminato (risultato di passo())
    let gen = 0;                // ogni comando nuovo rende superate le animazioni in corso
    let inCorsa = false;        // «▶ Addestra» in esecuzione
    let esitoAttuale = null;    // 'imparato' | 'xor' | 'lungo' | null
    const visti = { AND: false, OR: false, XOR: false };
    let completato = false;
    let due = null;             // pannello «due strati», creato al primo uso

    const idEta = ctx.uid('lp-eta');
    const idTitN = ctx.uid('lp-n');
    const idTitP = ctx.uid('lp-p');
    const idTitT = ctx.uid('lp-t');

    /* barra: funzione e passo di apprendimento */

    const btnFunz = {};
    const gruppoFunz = h('div', { class: 'pg-gruppo', role: 'group', 'aria-label': 'Funzione da insegnare al neurone' },
      ['AND', 'OR', 'XOR'].map((f) => {
        btnFunz[f] = h('button', { type: 'button', class: 'pg-btn', 'aria-pressed': f === st.funzione ? 'true' : 'false', onclick: () => scegliFunzione(f) }, f);
        return btnFunz[f];
      }));
    const cursoreEta = h('input', { type: 'range', class: 'pg-cursore', id: idEta, min: '0.05', max: '1', step: '0.05', value: String(ETA_INIZIALE), oninput: cambiaEta });
    const letturaEta = h('output', { for: idEta }, num(ETA_INIZIALE));
    const barra = h('div', { class: 'pg-strumenti lab-percettrone-barra' },
      h('span', { class: 'pg-etichetta' }, 'Insegna la funzione'), gruppoFunz,
      h('span', { class: 'pg-spazio' }),
      h('span', { class: 'lab-percettrone-eta' },
        h('label', { class: 'pg-etichetta', for: idEta }, 'Passo di apprendimento η'), cursoreEta, letturaEta));

    /* barra dei comandi */

    const btnEsempio = h('button', { type: 'button', class: 'pg-btn', onclick: unEsempio }, 'Un esempio');
    const btnEpoca = h('button', { type: 'button', class: 'pg-btn', onclick: unEpoca }, 'Un\'epoca');
    const btnAddestra = h('button', { type: 'button', class: 'pg-btn pg-btn--primario', onclick: addestraTutto }, '▶ Addestra');
    const btnCasuali = h('button', { type: 'button', class: 'pg-btn', onclick: pesiNuovi }, '↺ Pesi casuali');
    const contEpoca = h('b', null, '0');
    const contCorr = h('b', null, '0');
    const contErr = h('b', null, '0/4');
    const contatori = h('p', { class: 'lab-percettrone-cont' },
      h('span', null, 'Epoca', contEpoca), h('span', null, 'Correzioni', contCorr), h('span', null, 'Errori ora', contErr));
    const azioni = h('div', { class: 'pg-strumenti' }, btnEsempio, btnEpoca, btnAddestra, btnCasuali, contatori);

    /* il neurone */

    const N = {
      in1: { x: 70, y: 40 }, in2: { x: 70, y: 108 }, bias: { x: 70, y: 176 },
      sum: { x: 190, y: 108, r: 27 }, out: { x: 316, y: 108, r: 19 },
      step: { x: 232, y: 86, w: 54, h: 44 }, rIn: 19, rBias: 15,
    };
    function segmento(da, rDa, a, rA) {
      const dx = a.x - da.x;
      const dy = a.y - da.y;
      const l = Math.hypot(dx, dy);
      const ux = dx / l;
      const uy = dy / l;
      return { x1: da.x + ux * rDa, y1: da.y + uy * rDa, x2: a.x - ux * rA, y2: a.y - uy * rA, ux: ux, uy: uy };
    }
    const archi = [segmento(N.in1, N.rIn, N.sum, N.sum.r), segmento(N.in2, N.rIn, N.sum, N.sum.r), segmento(N.bias, N.rBias, N.sum, N.sum.r)];
    const NOMI = ['w₁', 'w₂', 'b'];
    const lineeArchi = archi.map((a) => s('line', { class: 'lab-percettrone-arco', x1: a.x1.toFixed(1), y1: a.y1.toFixed(1), x2: a.x2.toFixed(1), y2: a.y2.toFixed(1) }));
    const nomiArchi = archi.map((a, k) => {
      const t = 0.4;
      const px = a.x1 + (a.x2 - a.x1) * t;
      const py = a.y1 + (a.y2 - a.y1) * t;
      const lato = k === 2 ? 1 : -1;
      return s('text', { class: 'lab-percettrone-nome', x: (px - a.uy * 16 * lato).toFixed(1), y: (py + a.ux * 16 * lato).toFixed(1) }, NOMI[k]);
    });
    function nodo(c, r, tratteggiato) {
      const base = s('circle', { class: 'lab-percettrone-nodo' + (tratteggiato ? ' tratt' : ''), cx: c.x, cy: c.y, r: r });
      const luce = s('circle', { class: 'lab-percettrone-luce', cx: c.x, cy: c.y, r: r - 1 });
      const val = s('text', { class: 'lab-percettrone-val', x: c.x, y: c.y }, '');
      return { g: s('g', null, base, luce, val), luce: luce, val: val };
    }
    const nIn = [nodo(N.in1, N.rIn), nodo(N.in2, N.rIn)];
    const nBias = nodo(N.bias, N.rBias, true);
    nBias.luce.classList.add('tenue');
    nBias.val.textContent = '1';
    const nOut = nodo(N.out, N.out.r);
    const anello = s('circle', { class: 'lab-percettrone-anello', cx: N.out.x, cy: N.out.y, r: N.out.r + 5 });
    const S = N.step;
    const xs0 = S.x + 7;
    const xs1 = S.x + S.w - 7;
    const xsM = (xs0 + xs1) / 2;
    const yBasso = S.y + S.h - 9;
    const yAlto = S.y + 9;
    const cursoreSoglia = s('circle', { class: 'lab-percettrone-gcur', cx: xsM, cy: yBasso, r: 5 });
    const gSomma = s('g', { class: 'lab-percettrone-sum' },
      s('circle', { class: 'lab-percettrone-nodo', cx: N.sum.x, cy: N.sum.y, r: N.sum.r }),
      s('text', { class: 'lab-percettrone-sigma-t', x: N.sum.x, y: N.sum.y + 1 }, 'Σ'));
    const gImpulsi = s('g');
    const svgNeurone = s('svg', { viewBox: '0 0 344 214', class: 'lab-percettrone-svg', 'aria-hidden': 'true', focusable: 'false' },
      lineeArchi,
      s('line', { class: 'lab-percettrone-filo', x1: N.sum.x + N.sum.r, y1: N.sum.y, x2: S.x, y2: N.sum.y }),
      s('line', { class: 'lab-percettrone-filo', x1: S.x + S.w, y1: N.sum.y, x2: N.out.x - N.out.r, y2: N.sum.y }),
      nomiArchi,
      s('text', { class: 'lab-percettrone-etic', x: 25, y: N.in1.y }, 'x₁'),
      s('text', { class: 'lab-percettrone-etic', x: 25, y: N.in2.y }, 'x₂'),
      nIn[0].g, nIn[1].g, nBias.g, gSomma,
      s('rect', { class: 'lab-percettrone-gbox', x: S.x, y: S.y, width: S.w, height: S.h, rx: 7 }),
      s('path', { class: 'lab-percettrone-gpath', d: 'M' + xs0 + ' ' + yBasso + ' H' + xsM + ' V' + yAlto + ' H' + xs1 }),
      cursoreSoglia,
      s('text', { class: 'lab-percettrone-nome', x: S.x + S.w / 2, y: S.y - 14 }, '≥ 0 ?'),
      s('text', { class: 'lab-percettrone-etic', x: N.out.x, y: N.out.y - 38 }, 'y'),
      nOut.g, anello, gImpulsi);

    const chips = NOMI.map((nome) => {
      const val = h('b', null, '');
      const chip = h('span', { class: 'lab-percettrone-chip' }, h('i', { 'aria-hidden': 'true' }), nome + (nome === 'b' ? ' (bias)' : ''), val);
      return { chip: chip, val: val };
    });
    const calcolo = h('p', { class: 'lab-percettrone-calc' });
    const correzione = h('p', { class: 'lab-percettrone-calc' });
    const notaSeme = h('p', { class: 'lab-percettrone-seme' });
    const pannelloNeurone = h('section', { class: 'pg-pannello lab-percettrone-neurone', 'aria-labelledby': idTitN },
      h('h4', { class: 'lab-percettrone-tit', id: idTitN }, 'Il neurone', h('span', null, 'y = 1 se w₁x₁ + w₂x₂ + b ≥ 0')),
      svgNeurone,
      h('div', { class: 'lab-percettrone-pesi' }, chips.map((c) => c.chip)),
      calcolo, correzione, notaSeme);

    /* il piano degli ingressi */

    function creaPiano(opz) {
      const X0 = 44;
      const X1 = 288;
      const Y0 = 12;
      const Y1 = 256;
      const px = (x) => X0 + (x - RIQ.min) / (RIQ.max - RIQ.min) * (X1 - X0);
      const py = (y) => Y1 - (y - RIQ.min) / (RIQ.max - RIQ.min) * (Y1 - Y0);
      const svg = s('svg', { viewBox: '0 0 300 290', class: 'lab-percettrone-svg lab-percettrone-svg--piano', role: 'img', 'aria-label': opz.etichetta || 'Piano degli ingressi' });
      const zona = s('polygon', { class: 'lab-percettrone-zona', points: '' });
      const gRette = s('g');
      svg.append(
        s('rect', { class: 'lab-percettrone-fondo', x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, rx: 6 }),
        zona,
        s('rect', { class: 'lab-percettrone-quad', x: px(0), y: py(1), width: px(1) - px(0), height: py(0) - py(1) }),
        gRette);
      [0, 1].forEach((v) => {
        svg.append(s('text', { class: 'lab-percettrone-tacca', x: px(v), y: Y1 + 18 }, String(v)));
        svg.append(s('text', { class: 'lab-percettrone-tacca', x: X0 - 16, y: py(v) }, String(v)));
      });
      svg.append(s('text', { class: 'lab-percettrone-asse', x: X1 - 14, y: Y1 + 18 }, 'x₁'));
      svg.append(s('text', { class: 'lab-percettrone-asse', x: X0 - 16, y: Y0 + 12 }, 'x₂'));
      const punti = INGRESSI.map((x) => {
        const cx = px(x[0]);
        const cy = py(x[1]);
        const sel = s('circle', { class: 'lab-percettrone-sel', cx: cx, cy: cy, r: 21 });
        const ping = s('circle', { class: 'lab-percettrone-ping', cx: cx, cy: cy, r: 14 });
        const ko = s('circle', { class: 'lab-percettrone-ko', cx: cx, cy: cy, r: 17 });
        const pt = s('circle', { class: 'lab-percettrone-pt', cx: cx, cy: cy, r: 11 });
        svg.append(s('g', null, sel, ping, ko, pt));
        return { sel: sel, ping: ping, ko: ko, pt: pt };
      });
      function linea(classe) {
        const alone = s('line', { class: 'lab-percettrone-alone' });
        const l = s('line', { class: 'lab-percettrone-retta' + (classe ? ' ' + classe : '') });
        gRette.append(alone, l);
        return {
          metti(p) {
            const seg = retta(p, RIQ.min, RIQ.max);
            [alone, l].forEach((e) => {
              if (!seg) { e.setAttribute('visibility', 'hidden'); return; }
              e.removeAttribute('visibility');
              e.setAttribute('x1', px(seg[0][0]).toFixed(1));
              e.setAttribute('y1', py(seg[0][1]).toFixed(1));
              e.setAttribute('x2', px(seg[1][0]).toFixed(1));
              e.setAttribute('y2', py(seg[1][1]).toFixed(1));
            });
          },
        };
      }
      function poligono(poli) {
        zona.setAttribute('points', poli.map((q) => px(q[0]).toFixed(1) + ',' + py(q[1]).toFixed(1)).join(' '));
      }
      return { svg: svg, px: px, py: py, punti: punti, linea: linea, poligono: poligono, gRette: gRette };
    }

    const piano = creaPiano({ etichetta: 'Piano degli ingressi' });
    const rettaPrincipale = piano.linea();
    const pannelloPiano = h('section', { class: 'pg-pannello lab-percettrone-piano', 'aria-labelledby': idTitP },
      h('h4', { class: 'lab-percettrone-tit', id: idTitP }, 'Il piano degli ingressi', h('span', null, 'w₁x₁ + w₂x₂ + b = 0')),
      piano.svg,
      h('ul', { class: 'lab-percettrone-legenda' },
        h('li', null, h('i', { class: 'zona', 'aria-hidden': 'true' }), 'qui risponde 1'),
        h('li', null, h('i', { class: 'pieno', 'aria-hidden': 'true' }), 'atteso 1'),
        h('li', null, h('i', { 'aria-hidden': 'true' }), 'atteso 0'),
        h('li', null, h('i', { class: 'ko', 'aria-hidden': 'true' }), 'risposta sbagliata')));

    /* la tavola di verità */

    const titoloTavola = h('span', null, 'AND');
    const righe = INGRESSI.map((x) => {
      const prossimo = h('td', null, '');
      const att = h('td', { class: 'att' }, '');
      const risp = h('td', null, '');
      const tr = h('tr', null, prossimo, h('td', null, String(x[0])), h('td', null, String(x[1])), att, risp);
      return { tr: tr, prossimo: prossimo, att: att, risp: risp };
    });
    const notaTavola = h('p', { class: 'lab-percettrone-nota' });
    const pannelloTavola = h('section', { class: 'pg-pannello lab-percettrone-tavola', 'aria-labelledby': idTitT },
      h('h4', { class: 'lab-percettrone-tit', id: idTitT }, 'Tavola di verità', titoloTavola),
      h('table', { class: 'lab-percettrone-tabella' },
        h('thead', null, h('tr', null,
          h('th', { scope: 'col' }, h('span', { class: 'pg-sr' }, 'prossimo esempio')),
          h('th', { scope: 'col' }, 'x₁'), h('th', { scope: 'col' }, 'x₂'),
          h('th', { scope: 'col' }, 'atteso'), h('th', { scope: 'col' }, 'risponde'))),
        h('tbody', null, righe.map((r) => r.tr))),
      notaTavola);

    const palco = h('div', { class: 'lab-percettrone-palco' }, pannelloNeurone, pannelloPiano, pannelloTavola);
    const esito = h('div', { class: 'lab-percettrone-esito', hidden: true });
    const postoDue = h('div');
    const spiega = h('div', { class: 'pg-spiega lab-percettrone-spiega' });
    el.append(h('div', { class: 'lab-percettrone' }, barra, azioni, palco, esito, postoDue, spiega));

    /* ---------- disegno ---------- */

    function disegnaPesi(p) {
      [p.w1, p.w2, p.b].forEach((w, k) => {
        const l = lineeArchi[k];
        l.setAttribute('stroke-width', (1.6 + 6.4 * Math.min(Math.abs(w), 1.5) / 1.5).toFixed(2));
        const segno = w > 0.004 ? 'pos' : (w < -0.004 ? 'neg' : '');
        l.classList.toggle('pos', segno === 'pos');
        l.classList.toggle('neg', segno === 'neg');
        chips[k].chip.classList.toggle('pos', segno === 'pos');
        chips[k].chip.classList.toggle('neg', segno === 'neg');
        chips[k].val.textContent = numSegno(w);
      });
      piano.poligono(zonaUno(p, RIQ.min, RIQ.max));
      rettaPrincipale.metti(p);
      const t = FUNZIONI[st.funzione].uscite;
      piano.punti.forEach((pt, i) => {
        pt.pt.classList.toggle('pieno', t[i] === 1);
        pt.ko.classList.toggle('on', predici(p, INGRESSI[i]) !== t[i]);
      });
    }

    function disegnaIngressi(x) {
      nIn.forEach((n, k) => {
        const v = x ? x[k] : null;
        n.luce.classList.toggle('on', v === 1);
        n.val.classList.toggle('su', v === 1);
        n.val.textContent = v == null ? '·' : String(v);
      });
    }

    function posSoglia(z) {
      const k = Math.max(-1, Math.min(1, z / 1.5));
      return { x: xsM + k * (xsM - xs0), y: z >= 0 ? yAlto : yBasso };
    }

    function disegnaSoglia(z) {
      if (z == null) { cursoreSoglia.classList.remove('on'); return; }
      const q = posSoglia(z);
      cursoreSoglia.setAttribute('cx', q.x.toFixed(1));
      cursoreSoglia.setAttribute('cy', q.y.toFixed(1));
      cursoreSoglia.classList.add('on');
    }

    function disegnaUscita(y, giusto) {
      nOut.luce.classList.toggle('on', y === 1);
      nOut.val.classList.toggle('su', y === 1);
      nOut.val.textContent = y == null ? '·' : String(y);
      anello.classList.toggle('ok', giusto === true);
      anello.classList.toggle('ko', giusto === false);
    }

    function scriviCalcolo(es) {
      if (!es) {
        const x = INGRESSI[st.indice];
        calcolo.replaceChildren('Prossimo esempio: ', h('strong', null, 'x₁ = ' + x[0] + ', x₂ = ' + x[1]),
          ' · per ' + st.funzione + ' la risposta attesa è ', h('strong', null, String(FUNZIONI[st.funzione].uscite[st.indice])), '.');
        correzione.replaceChildren('Premi «Un esempio» per vedere il calcolo.');
        return;
      }
      const p = es.prima;
      const giusto = es.errore === 0;
      calcolo.replaceChildren('z = ' + inFormula(p.w1) + '·' + es.x[0] + ' + ' + inFormula(p.w2) + '·' + es.x[1] + ' + ' + inFormula(p.b) + ' = ',
        h('strong', null, num(es.z)), ' → y = ', h('strong', null, String(es.y)), ' · atteso ' + es.t + ' ',
        h('span', { class: giusto ? 'ok' : 'ko' }, giusto ? '✓' : '✗'));
      if (giusto) {
        correzione.replaceChildren('Risposta giusta: nessuna correzione.');
        return;
      }
      const cambi = [];
      ['w1', 'w2', 'b'].forEach((k, i) => {
        if (es.dopo[k] !== p[k]) cambi.push(NOMI[i] + ' ' + num(p[k]) + ' → ' + num(es.dopo[k]));
      });
      correzione.replaceChildren('Correzione η·(t − y) = ' + num(st.eta) + '·(' + (es.errore > 0 ? '+1' : MENO + '1') + '): ', h('strong', null, cambi.join(' · ')));
    }

    // Tavola di verità e descrizione del piano; p = pesi con cui calcolare le risposte (quelli disegnati).
    function disegnaTavola(p) {
      const pesi = p || st.pesi;
      const t = FUNZIONI[st.funzione].uscite;
      titoloTavola.textContent = st.funzione;
      righe.forEach((r, i) => {
        const y = predici(pesi, INGRESSI[i]);
        const giusto = y === t[i];
        r.att.textContent = String(t[i]);
        r.risp.replaceChildren(String(y) + ' ', h('span', { class: giusto ? 'ok' : 'ko' }, giusto ? '✓' : '✗'),
          h('span', { class: 'pg-sr' }, giusto ? ' giusto' : ' sbagliato'));
        r.tr.classList.toggle('corrente', !!ultimo && ultimo.indice === i);
        const prossimo = !inCorsa && st.indice === i;
        r.prossimo.replaceChildren(prossimo ? '▸' : '', prossimo ? h('span', { class: 'pg-sr' }, 'prossimo') : '');
      });
      const n = contaErrori(pesi, st.funzione);
      notaTavola.textContent = n === 0 ? 'Con questi pesi risponde giusto in tutti e quattro i casi.'
        : 'Con questi pesi sbaglia ' + casi(n) + ' su quattro.';
      piano.punti.forEach((pt, i) => pt.sel.classList.toggle('on', !!ultimo && ultimo.indice === i));
      const uni = INGRESSI.filter((x) => predici(pesi, x) === 1).map(coppia);
      piano.svg.setAttribute('aria-label', 'Piano degli ingressi. La retta del neurone lascia nella zona in cui risponde 1 ' +
        (uni.length ? (uni.length === 1 ? 'il punto ' : 'i punti ') + uni.join(', ') : 'nessuno dei quattro punti') +
        '; per ' + st.funzione + ' sbaglia ' + casi(n) + ' su quattro.');
    }

    function disegnaContatori() {
      contEpoca.textContent = String(st.epoca);
      contCorr.textContent = String(st.aggiornamenti);
      const n = contaErrori(st.pesi, st.funzione);
      contErr.textContent = n + '/4';
      contErr.className = n === 0 ? 'ok' : '';
    }

    // Disegna lo stato logico così com'è, senza animazioni.
    function disegna() {
      disegnaPesi(st.pesi);
      if (ultimo) {
        disegnaIngressi(ultimo.x);
        disegnaSoglia(ultimo.z);
        disegnaUscita(ultimo.y, ultimo.errore === 0);
      } else {
        disegnaIngressi(null);
        disegnaSoglia(null);
        disegnaUscita(null, null);
      }
      scriviCalcolo(ultimo);
      disegnaTavola();
      disegnaContatori();
      notaSeme.textContent = 'Pesi di partenza estratti a caso con il seme ' + seme + ': lo stesso seme dà sempre gli stessi pesi.';
    }

    function racconta(testo) { spiega.replaceChildren(h('p', null, ctx.inline(testo))); }

    function aggiornaComandi() {
      btnAddestra.textContent = inCorsa ? '⏸ Ferma' : '▶ Addestra';
      btnAddestra.setAttribute('aria-pressed', inCorsa ? 'true' : 'false');
      ['AND', 'OR', 'XOR'].forEach((f) => btnFunz[f].setAttribute('aria-pressed', f === st.funzione ? 'true' : 'false'));
    }

    /* ---------- animazioni ---------- */

    function ping(i) {
      const c = piano.punti[i].ping;
      c.classList.remove('via');
      void c.getBoundingClientRect();
      c.classList.add('via');
    }

    function pulsaSomma() {
      gSomma.classList.remove('via');
      void gSomma.getBoundingClientRect();
      gSomma.classList.add('via');
    }

    function flusso(x, durata) {
      if (ctx.riduci || !durata) return Promise.resolve();
      const attivi = [];
      if (x[0]) attivi.push(archi[0]);
      if (x[1]) attivi.push(archi[1]);
      attivi.push(archi[2]);
      const punti = attivi.map((a) => {
        const c = s('circle', { class: 'lab-percettrone-imp', cx: a.x1.toFixed(1), cy: a.y1.toFixed(1), r: 5.5 });
        gImpulsi.append(c);
        return { c: c, a: a };
      });
      return ctx.anima({
        durata: durata,
        easing: 'sharp',
        aggiorna(t) {
          punti.forEach((q) => {
            q.c.setAttribute('transform', 'translate(' + ((q.a.x2 - q.a.x1) * t).toFixed(1) + ' ' + ((q.a.y2 - q.a.y1) * t).toFixed(1) + ')');
          });
        },
      }).finally(() => punti.forEach((q) => q.c.remove()));
    }

    function soglia(zDa, zA, durata) {
      if (ctx.riduci || !durata) { disegnaSoglia(zA); return Promise.resolve(); }
      const da = posSoglia(zDa);
      const a = posSoglia(zA);
      cursoreSoglia.classList.add('on');
      return ctx.anima({
        durata: durata,
        aggiorna(t) {
          cursoreSoglia.setAttribute('cx', lerp(da.x, a.x, t).toFixed(1));
          cursoreSoglia.setAttribute('cy', (t < 0.55 ? da.y : a.y).toFixed(1));
        },
      });
    }

    function spostaPesi(da, a, durata) {
      if (uguali(da, a) || ctx.riduci || !durata) { disegnaPesi(a); return Promise.resolve(); }
      return ctx.anima({ durata: durata, aggiorna(t) { disegnaPesi(lerpPesi(da, a, t)); } });
    }

    // Anima un passo già calcolato: r = risultato di passo(), velocita = chiave di PASSO.
    async function animaPasso(r, velocita) {
      const v = PASSO[velocita];
      const es = r.esempio;
      const zPrima = ultimo ? ultimo.z : 0;
      ultimo = es;
      disegnaTavola(es.prima);
      disegnaIngressi(es.x);
      disegnaUscita(null, null);
      if (v.flusso) ping(es.indice);
      if (v.flusso) await flusso(es.x, v.flusso);
      if (v.soglia) pulsaSomma();
      scriviCalcolo(es);
      await soglia(zPrima, es.z, v.soglia);
      disegnaUscita(es.y, es.errore === 0);
      if (v.confronto) await ctx.attendi(v.confronto);
      await spostaPesi(es.prima, es.dopo, es.errore ? v.pesi : 0);
      disegnaContatori();
      disegnaTavola();
      if (v.dopo) await ctx.attendi(v.dopo);
    }

    // Interrompe animazioni e addestramento in corso e ridisegna lo stato attuale.
    function interrompi() {
      gen += 1;
      ctx.annulla();
      gImpulsi.replaceChildren();
      if (inCorsa) { inCorsa = false; aggiornaComandi(); }
      disegna();
      return gen;
    }

    function annullato(err) {
      if (!ctx.annullato(err)) throw err;
    }

    /* ---------- comandi ---------- */

    function narraPasso(es) {
      const f = st.funzione;
      const coord = coppia(es.x);
      if (es.errore === 0) {
        return 'Esempio ' + coord + ': la somma pesata vale ' + num(es.z) + ', quindi il neurone risponde **' + es.y + '**. Per ' + f +
          ' la risposta giusta è proprio ' + es.t + ': nessuna correzione, i pesi restano com\'erano.';
      }
      const verso = es.errore > 0 ? 'salgono' : 'scendono';
      const spenti = es.x[0] === 0 || es.x[1] === 0 ? ' Gli ingressi spenti (0) non hanno contribuito all\'errore, quindi il loro peso non cambia.' : '';
      return 'Esempio ' + coord + ': il neurone risponde **' + es.y + '**, ma per ' + f + ' doveva rispondere **' + es.t + '**. L\'errore t − y vale ' +
        (es.errore > 0 ? '+1' : MENO + '1') + ': i pesi degli ingressi accesi e il bias ' + verso + ' di η = ' + num(st.eta) + '.' + spenti + ' Guarda la retta che si sposta.';
    }

    function dopoPasso(r) {
      if (r.fineEpoca && st.funzione === 'XOR') visti.XOR = true;
      controllaEsito();
      controllaCompletato();
    }

    async function unEsempio() {
      const mio = interrompi();
      const r = passo(st);
      st = r.stato;
      ctx.annuncia('Esempio ' + coppia(r.esempio.x) + ': risponde ' + r.esempio.y + ', atteso ' + r.esempio.t + (r.esempio.errore ? '. Pesi corretti.' : '. Giusto.'));
      racconta(narraPasso(r.esempio));
      try {
        await animaPasso(r, ctx.riduci ? 'lampo' : 'lento');
      } catch (err) { annullato(err); }
      if (mio !== gen) return;
      disegna();
      dopoPasso(r);
    }

    async function unEpoca() {
      const mio = interrompi();
      const funzione = st.funzione;
      const res = epoca(st);
      const fine = res.stato;
      const sbagli = res.passi.filter((r) => r.esempio.errore !== 0).length;
      const testo = 'Epoca ' + fine.epoca + ' completata: ' + errori(sbagli) + ' su ' + res.passi.length + ' esempi' +
        (sbagli ? (sbagli === 1 ? ', e l\'errore ha spostato la retta.' : ', e ogni errore ha spostato la retta.') : '.');
      racconta(testo + (fine.imparato ? '' : (funzione === 'XOR' ? ' Per lo XOR la retta continua a saltare da una posizione all\'altra.' : ' Continua finché non sbaglia più.')));
      ctx.annuncia(testo);
      try {
        // Gli esempi dell'epoca si animano uno dopo l'altro; se arriva un altro comando, lo stato resta all'ultimo esempio mostrato.
        for (const r of res.passi) {
          st = r.stato;
          await animaPasso(r, ctx.riduci ? 'lampo' : 'medio');
          if (mio !== gen) return;
        }
      } catch (err) { annullato(err); }
      if (mio !== gen) return;
      st = fine;
      ultimo = res.passi[res.passi.length - 1].esempio;
      disegna();
      dopoPasso(res.passi[res.passi.length - 1]);
    }

    async function addestraTutto() {
      if (inCorsa) {
        interrompi();
        racconta('Addestramento fermato all\'epoca ' + st.epoca + '. Puoi continuare un passo alla volta o premere di nuovo «▶ Addestra».');
        ctx.annuncia('Addestramento fermato.');
        return;
      }
      const mio = interrompi();
      if (st.imparato) {
        mostraEsito();
        racconta('Il neurone risponde già giusto a tutti e quattro gli esempi di ' + st.funzione + ': non c\'è niente da correggere. Prova «↺ Pesi casuali» per farlo ripartire da capo.');
        return;
      }
      const limite = st.epoca + (st.funzione === 'XOR' ? EPOCHE_XOR : EPOCHE_MAX);
      inCorsa = true;
      aggiornaComandi();
      disegnaTavola();
      racconta('Addestramento in corso: il neurone esamina gli esempi uno dopo l\'altro e corregge i pesi a ogni errore.');
      let n = 0;
      try {
        while (!st.imparato && st.epoca < limite) {
          const r = passo(st);
          st = r.stato;
          if (ctx.riduci) {
            ultimo = r.esempio;
            if (r.fineEpoca) {
              disegna();
              racconta('Epoca ' + st.epoca + ': ' + errori(st.erroriUltimaEpoca) + '.');
              await ctx.attendi(380);
            }
          } else {
            const velocita = n < 4 ? 'medio' : (st.epoca < 6 ? 'veloce' : 'lampo');
            await animaPasso(r, velocita);
            if (r.fineEpoca && n >= 4) racconta('Epoca ' + st.epoca + ': ' + errori(st.erroriUltimaEpoca) + '.');
          }
          if (mio !== gen) return;
          if (r.fineEpoca && st.funzione === 'XOR') visti.XOR = true;
          n += 1;
        }
      } catch (err) {
        annullato(err);
        return;
      }
      if (mio !== gen) return;
      inCorsa = false;
      aggiornaComandi();
      disegna();
      if (st.imparato) {
        racconta('Fatto: dopo ' + st.aggiornamenti + ' correzioni il neurone risponde giusto a tutti e quattro gli esempi di ' + st.funzione + '.');
      } else if (st.funzione === 'XOR') {
        racconta('Dopo ' + st.epoca + ' epoche il neurone sbaglia ancora: la retta continua a saltare, perché non esiste una posizione che vada bene per tutti e quattro i punti.');
      } else {
        racconta('Non ha ancora finito: con un passo η così piccolo servono più epoche. Premi di nuovo «▶ Addestra» oppure aumenta η.');
      }
      controllaEsito(true);
      controllaCompletato();
    }

    function pesiNuovi() {
      interrompi();
      seme += 1;
      st = nuovo(pesiCasuali(seme), st.funzione, st.eta);
      ultimo = null;
      nascondiEsito();
      disegna();
      const n = contaErrori(st.pesi, st.funzione);
      racconta('Nuovi pesi casuali (seme ' + seme + '): w₁ = ' + num(st.pesi.w1) + ', w₂ = ' + num(st.pesi.w2) + ', b = ' + num(st.pesi.b) + '. ' +
        (n === 0 ? 'Per caso rispondono già giusto a tutti gli esempi di ' + st.funzione + '!' : 'Per ' + st.funzione + ' sbagliano ' + casi(n) + ' su quattro.'));
      ctx.annuncia('Nuovi pesi casuali, seme ' + seme + '.');
      if (st.imparato) mostraEsito();
    }

    function scegliFunzione(f) {
      interrompi();
      st = nuovo(st.pesi, f, st.eta);
      ultimo = null;
      aggiornaComandi();
      nascondiEsito();
      disegna();
      const n = contaErrori(st.pesi, f);
      racconta('Ora il neurone deve imparare **' + f + '**: ' + FUNZIONI[f].regola + '. ' +
        (n === 0 ? 'Con i pesi attuali risponde già giusto in tutti i casi.' : 'Con i pesi attuali sbaglia ' + casi(n) + ' su quattro: premi «▶ Addestra» o procedi un esempio alla volta.') +
        (f === 'XOR' ? ' Guarda bene dove stanno i punti pieni.' : ''));
      ctx.annuncia('Funzione ' + f + '.');
      if (st.imparato) mostraEsito();
    }

    function cambiaEta() {
      const v = pulisci(Number(cursoreEta.value), 2);
      st = Object.assign({}, st, { eta: v });
      letturaEta.textContent = num(v);
    }

    /* ---------- esiti ---------- */

    function porta(nome) {
      const eAnd = nome === 'AND';
      const forma = nome === 'XOR'
        ? s('g', null, s('path', { d: 'M14 6 Q22 20 14 34 Q36 34 50 20 Q36 6 14 6 Z' }), s('path', { d: 'M8 6 Q16 20 8 34' }))
        : (eAnd ? s('path', { d: 'M12 6 H30 A14 14 0 0 1 30 34 H12 Z' }) : s('path', { d: 'M12 6 Q20 20 12 34 Q34 34 48 20 Q34 6 12 6 Z' }));
      return s('svg', { class: 'lab-percettrone-porta', viewBox: '0 0 64 48', 'aria-hidden': 'true', focusable: 'false' },
        s('line', { x1: 0, y1: 14, x2: 14, y2: 14 }), s('line', { x1: 0, y1: 26, x2: 14, y2: 26 }),
        forma, s('line', { x1: eAnd ? 44 : 48, y1: 20, x2: 62, y2: 20 }),
        s('text', { x: 30, y: 46 }, nome));
    }

    function nascondiEsito() {
      esito.hidden = true;
      esito.replaceChildren();
      esitoAttuale = null;
    }

    function mostraEsito() {
      const f = st.funzione;
      const p = st.pesi;
      esito.className = 'lab-percettrone-esito';
      esitoAttuale = 'imparato';
      visti[f] = true;
      const epoche = st.epoca + (st.indice ? 1 : 0);
      const quando = st.aggiornamenti === 0 ? 'Senza nessuna correzione'
        : 'In ' + (epoche === 1 ? 'una epoca' : epoche + ' epoche') + ' e ' + (st.aggiornamenti === 1 ? 'una correzione' : st.aggiornamenti + ' correzioni');
      esito.replaceChildren(porta(f), h('div', null,
        h('p', null, ctx.inline('**Imparato!** ' + quando + ' il percettrone è arrivato a w₁ = ' + num(p.w1) + ', w₂ = ' + num(p.w2) + ', b = ' + num(p.b) +
          ': ora risponde come una porta **' + f + '**.')),
        h('p', null, ctx.inline('Un percettrone con i pesi giusti è una porta logica. Questi pesi, però, non li ha scritti nessuno: li ha trovati correggendo i propri errori. ' +
          (f === 'AND' ? 'Prova con OR, poi con XOR.' : 'Ora prova con XOR.')))));
      esito.hidden = false;
      ctx.annuncia('Imparato: il neurone risponde come una porta ' + f + '.');
    }

    function mostraXor() {
      esito.className = 'lab-percettrone-esito xor';
      esitoAttuale = 'xor';
      const btn = h('button', { type: 'button', class: 'pg-btn pg-btn--primario', onclick: apriDueStrati }, 'La soluzione: due strati');
      esito.replaceChildren(porta('XOR'), h('div', null,
        h('p', null, ctx.inline('**Dopo ' + st.epoca + ' epoche sbaglia ancora.** Guarda il piano: i due punti pieni stanno su una diagonale, i due vuoti sull\'altra, e nessuna retta può lasciare i pieni da una parte e i vuoti dall\'altra. Un percettrone da solo non imparerà mai lo XOR, per quanto si alleni.')),
        h('p', null, ctx.inline('Lo dimostrarono nel 1969 Marvin Minsky e Seymour Papert nel libro «Perceptrons». La delusione raffreddò l\'interesse per le reti neurali e contribuì al primo «inverno» dell\'intelligenza artificiale.')),
        btn));
      esito.hidden = false;
      ctx.annuncia('Dopo ' + st.epoca + ' epoche il percettrone sbaglia ancora lo XOR: nessuna retta separa i casi.');
    }

    function mostraLungo() {
      esito.className = 'lab-percettrone-esito lungo';
      esitoAttuale = 'lungo';
      esito.replaceChildren(porta(st.funzione), h('div', null,
        h('p', null, ctx.inline('**Non ha ancora finito.** Con un passo η = ' + num(st.eta) + ' ogni correzione sposta la retta di poco: servono più epoche. Premi di nuovo «▶ Addestra» oppure aumenta η.'))));
      esito.hidden = false;
    }

    function controllaEsito(fineAddestramento) {
      if (st.imparato) {
        if (esitoAttuale !== 'imparato') mostraEsito();
        return;
      }
      if (st.funzione === 'XOR' && st.epoca >= EPOCHE_XOR) {
        if (esitoAttuale !== 'xor') mostraXor();
        return;
      }
      if (fineAddestramento && st.funzione !== 'XOR') mostraLungo();
    }

    function controllaCompletato() {
      if (!completato && (visti.AND || visti.OR) && visti.XOR) {
        completato = true;
        ctx.completa();
      }
    }

    /* ---------- la soluzione a due strati ---------- */

    function creaDue() {
      const idTit = ctx.uid('lp-due');
      const D = {
        x1: { x: 50, y: 58 }, x2: { x: 50, y: 170 },
        h1: { x: 172, y: 58 }, h2: { x: 172, y: 170 }, y: { x: 292, y: 114 },
        rIn: 19, r: 29,
      };
      const collegamenti = [
        { da: 'x1', a: 'h1', w: DUE_STRATI.h1.w1 }, { da: 'x2', a: 'h1', w: DUE_STRATI.h1.w2 },
        { da: 'x1', a: 'h2', w: DUE_STRATI.h2.w1 }, { da: 'x2', a: 'h2', w: DUE_STRATI.h2.w2 },
        { da: 'h1', a: 'y', w: DUE_STRATI.y.w1 }, { da: 'h2', a: 'y', w: DUE_STRATI.y.w2 },
      ].map((c) => {
        const r1 = c.da.charAt(0) === 'x' ? D.rIn : D.r;
        const seg = segmento(D[c.da], r1, D[c.a], D.r);
        const linea = s('line', { class: 'lab-percettrone-arco ' + (c.w > 0 ? 'pos' : 'neg'), x1: seg.x1.toFixed(1), y1: seg.y1.toFixed(1), x2: seg.x2.toFixed(1), y2: seg.y2.toFixed(1), 'stroke-width': '4' });
        return Object.assign({ seg: seg, linea: linea }, c);
      });
      const nodi = {};
      ['x1', 'x2'].forEach((k) => { nodi[k] = nodo(D[k], D.rIn); });
      [['h1', 'OR'], ['h2', 'NAND'], ['y', 'AND']].forEach(([k, nome]) => {
        const base = s('circle', { class: 'lab-percettrone-nodo', cx: D[k].x, cy: D[k].y, r: D.r });
        const luce = s('circle', { class: 'lab-percettrone-luce', cx: D[k].x, cy: D[k].y, r: D.r - 1 });
        const val = s('text', { class: 'lab-percettrone-gate', x: D[k].x, y: D[k].y }, nome);
        nodi[k] = { g: s('g', null, base, luce, val), luce: luce, val: val };
      });
      const gImp = s('g');
      const svgRete = s('svg', { viewBox: '0 0 344 228', class: 'lab-percettrone-svg', 'aria-hidden': 'true', focusable: 'false' },
        collegamenti.map((c) => c.linea),
        s('text', { class: 'lab-percettrone-etic', x: 14, y: D.x1.y }, 'x₁'),
        s('text', { class: 'lab-percettrone-etic', x: 14, y: D.x2.y }, 'x₂'),
        s('text', { class: 'lab-percettrone-etic', x: D.y.x, y: D.y.y - 48 }, 'y'),
        Object.keys(nodi).map((k) => nodi[k].g), gImp);

      const pianoDue = creaPiano({ etichetta: 'Piano degli ingressi della rete a due strati: le rette di OR e di NAND delimitano una striscia che contiene solo i punti (0, 1) e (1, 0).' });
      pianoDue.poligono(ritaglia(zonaUno(DUE_STRATI.h1, RIQ.min, RIQ.max), DUE_STRATI.h2));
      pianoDue.linea('porta').metti(DUE_STRATI.h1);
      pianoDue.linea('porta').metti(DUE_STRATI.h2);
      pianoDue.svg.append(
        s('text', { class: 'lab-percettrone-nomeretta', x: pianoDue.px(-0.38).toFixed(1), y: pianoDue.py(1.13).toFixed(1) }, 'OR'),
        s('text', { class: 'lab-percettrone-nomeretta', x: pianoDue.px(0.32).toFixed(1), y: pianoDue.py(1.43).toFixed(1) }, 'NAND'));
      pianoDue.punti.forEach((pt, i) => pt.pt.classList.toggle('pieno', FUNZIONI.XOR.uscite[i] === 1));

      const btnIn = {};
      const scelte = h('div', { class: 'pg-gruppo', role: 'group', 'aria-label': 'Ingressi da provare' },
        INGRESSI.map((x, i) => {
          btnIn[i] = h('button', { type: 'button', class: 'pg-btn', 'aria-pressed': 'false', 'aria-label': 'x₁ = ' + x[0] + ', x₂ = ' + x[1], onclick: () => prova(i) }, x[0] + ' ' + x[1]);
          return btnIn[i];
        }));
      const btnTutti = h('button', { type: 'button', class: 'pg-btn', onclick: provaTutti }, '▶ Prova tutti');
      const lettura = h('p', { class: 'lab-percettrone-due-lettura', 'aria-live': 'polite' });
      const titolo = h('h4', { id: idTit, tabindex: '-1' }, 'La soluzione: due strati');
      const box = h('section', { class: 'lab-percettrone-due', 'aria-labelledby': idTit, hidden: true },
        titolo,
        h('p', null, ctx.inline('Il neurone **OR** esclude il punto (0, 0), il neurone **NAND** esclude (1, 1); il neurone **AND** in uscita risponde 1 solo dove sono d\'accordo entrambi, cioè nella striscia tra le due rette. Ogni neurone, con i pesi giusti, è una porta logica: insieme fanno ciò che nessuno dei tre sa fare da solo.')),
        h('div', { class: 'lab-percettrone-due-griglia' },
          h('div', null, svgRete,
            h('div', { class: 'lab-percettrone-due-ctrl' }, scelte, btnTutti),
            lettura,
            h('ul', { class: 'lab-percettrone-due-pesi', 'aria-label': 'Pesi scelti a mano' },
              [DUE_STRATI.h1, DUE_STRATI.h2, DUE_STRATI.y].map((n) => h('li', null, h('b', null, n.nome), ' w₁ = ' + num(n.w1, 0) + ', w₂ = ' + num(n.w2, 0) + ', b = ' + num(n.b, 1))))),
          pianoDue.svg),
        h('p', null, ctx.inline('Questi pesi li abbiamo scelti noi, a mano. Il problema, per quasi vent\'anni, fu trovare un modo perché una rete a più strati li trovasse da sola: la risposta si diffuse nel 1986 con la **retropropagazione dell\'errore**.')));
      postoDue.append(box);

      let genDue = 0;
      let scelto = 1;
      function mostra(i) {
        const x = INGRESSI[i];
        const r = dueStrati(x);
        nodi.x1.luce.classList.toggle('on', x[0] === 1); nodi.x1.val.textContent = String(x[0]); nodi.x1.val.classList.toggle('su', x[0] === 1);
        nodi.x2.luce.classList.toggle('on', x[1] === 1); nodi.x2.val.textContent = String(x[1]); nodi.x2.val.classList.toggle('su', x[1] === 1);
        return r;
      }
      function accendi(k, v) {
        nodi[k].luce.classList.toggle('on', v === 1);
        nodi[k].val.classList.toggle('su', v === 1);
      }
      function scrivi(i, r) {
        const x = INGRESSI[i];
        const atteso = FUNZIONI.XOR.uscite[i];
        lettura.replaceChildren('x₁ = ' + x[0] + ', x₂ = ' + x[1] + ' → OR ', h('strong', null, String(r.h1)), ', NAND ', h('strong', null, String(r.h2)),
          ' → AND ', h('strong', null, String(r.y)), ' ', h('span', { class: r.y === atteso ? 'ok' : 'ko' }, r.y === atteso ? '✓' : '✗'),
          ' · lo XOR di ' + x[0] + ' e ' + x[1] + ' vale ' + atteso);
        pianoDue.punti.forEach((pt, j) => pt.sel.classList.toggle('on', j === i));
        Object.keys(btnIn).forEach((j) => btnIn[j].setAttribute('aria-pressed', String(Number(j) === i)));
      }
      function impulsi(lista, durata) {
        if (ctx.riduci || !lista.length) return Promise.resolve();
        const pts = lista.map((c) => {
          const e = s('circle', { class: 'lab-percettrone-imp', cx: c.seg.x1.toFixed(1), cy: c.seg.y1.toFixed(1), r: 5.5 });
          gImp.append(e);
          return { e: e, seg: c.seg };
        });
        return ctx.anima({
          durata: durata,
          easing: 'sharp',
          aggiorna(t) { pts.forEach((q) => q.e.setAttribute('transform', 'translate(' + ((q.seg.x2 - q.seg.x1) * t).toFixed(1) + ' ' + ((q.seg.y2 - q.seg.y1) * t).toFixed(1) + ')')); },
        }).finally(() => pts.forEach((q) => q.e.remove()));
      }
      async function prova(i, daTutti) {
        const mio = daTutti || ++genDue;
        scelto = i;
        gImp.replaceChildren();
        const x = INGRESSI[i];
        const r = mostra(i);
        accendi('h1', null); accendi('h2', null); accendi('y', null);
        scrivi(i, r);
        try {
          await impulsi(collegamenti.filter((c) => (c.da === 'x1' && x[0]) || (c.da === 'x2' && x[1])), 420);
          if (mio !== genDue) return;
          accendi('h1', r.h1); accendi('h2', r.h2);
          await impulsi(collegamenti.filter((c) => (c.da === 'h1' && r.h1) || (c.da === 'h2' && r.h2)), 420);
          if (mio !== genDue) return;
        } catch (err) {
          annullato(err);
          if (mio !== genDue) return;
        }
        accendi('h1', r.h1); accendi('h2', r.h2); accendi('y', r.y);
      }
      async function provaTutti() {
        const mio = ++genDue;
        try {
          for (let i = 0; i < 4; i++) {
            await prova(i, mio);
            if (mio !== genDue) return;
            await ctx.attendi(ctx.riduci ? 900 : 520);
            if (mio !== genDue) return;
          }
        } catch (err) { annullato(err); }
      }
      return { box: box, titolo: titolo, prova: prova, get scelto() { return scelto; } };
    }

    function apriDueStrati() {
      const primo = !due;
      if (!due) due = creaDue();
      due.box.hidden = false;
      due.titolo.focus({ preventScroll: true });
      due.box.scrollIntoView({ block: 'nearest', behavior: ctx.riduci ? 'auto' : 'smooth' });
      if (primo) due.prova(1);
      ctx.annuncia('Si apre la rete a due strati che calcola lo XOR.');
    }

    /* ---------- avvio ---------- */

    aggiornaComandi();
    disegna();
    racconta('Il neurone deve imparare **AND**: ' + FUNZIONI.AND.regola + '. Con questi pesi casuali sbaglia ' + casi(contaErrori(st.pesi, 'AND')) +
      ' su quattro. Premi **Un esempio** per seguire una correzione da vicino, oppure **▶ Addestra** e guarda la retta spostarsi finché i punti pieni restano nella zona colorata e quelli vuoti fuori.');

    return {};
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('percettrone', { titolo: 'Il percettrone che impara', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
