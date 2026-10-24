/*
 * Laboratorio «Dal pannello di cavi al programma memorizzato» (capitolo 3).
 *
 * Due modi, scelti con un controllo a segmenti:
 *   A) ENIAC: il programma è nei cavi. Un pannello stilizzato con cinque unità:
 *      per cambiare problema si staccano e si ricollegano i cavi e si girano le manopole.
 *   B) Von Neumann: il programma è nella memoria. La CPU giocattolo (js/lib/cpu-giocattolo.js)
 *      esegue il ciclo prelievo, decodifica, esecuzione; le parole viaggiano sul bus.
 *      Basta un clic su una cella per cambiare il programma.
 *
 * La logica pura qui sotto non tocca il DOM: la provano i test in Node
 * (test/programma-memorizzato.test.js).
 */
(function (root) {
  'use strict';

  const P = 'lab-programma-memorizzato';

  function cpu() {
    if (root.CpuGiocattolo) return root.CpuGiocattolo;
    if (typeof require === 'function') return require('../lib/cpu-giocattolo.js');
    return null;
  }

  /* =====================================================================
   * A) ENIAC: unità, cavi, manopole, esecuzione
   * ===================================================================== */

  // Le cinque unità del pannello, da sinistra a destra (o dall'alto in basso).
  // prese: 'p' = cavo di programma (impulsi di controllo), 'd' = cavo dei dati (numeri).
  const UNITA = [
    { id: 'pp', sigla: 'PP', nome: 'Programmatore principale', prese: ['p'], manopola: 'ripetizioni', posizioni: ['1 volta', '5 volte'] },
    { id: 'tf', sigla: 'TF', nome: 'Tavola delle funzioni', prese: ['p', 'd'], manopola: 'valore', posizioni: ['spenta', 'dà 1'] },
    { id: 'a1', sigla: 'A1', nome: 'Accumulatore 1', prese: ['p', 'd'], manopola: 'operazione', posizioni: ['spento', 'riceve', 'trasmette', 'riceve e trasmette', 'azzera e riceve'] },
    { id: 'mol', sigla: 'M', nome: 'Moltiplicatore', prese: ['p', 'd'], manopola: 'operazione', posizioni: ['spento', 'quadrato'] },
    { id: 'a2', sigla: 'A2', nome: 'Accumulatore 2', prese: ['p', 'd'], manopola: 'operazione', posizioni: ['spento', 'riceve', 'trasmette', 'riceve e trasmette', 'azzera e riceve'] },
  ];
  const PER_ID = Object.fromEntries(UNITA.map((u) => [u.id, u]));

  const PROBLEMI = {
    somma: {
      id: 'somma',
      nome: 'Somma',
      dettaglio: '2 + 3',
      manopole: { pp: 0, tf: 0, a1: 2, mol: 0, a2: 1 },
      valori: { pp: 0, tf: null, a1: 2, mol: null, a2: 3 },
      cavi: [
        { tipo: 'p', da: 'pp', a: 'a1' },
        { tipo: 'p', da: 'a1', a: 'a2' },
        { tipo: 'd', da: 'a1', a: 'a2' },
        { tipo: 'p', da: 'a2', a: 'pp' },
      ],
    },
    quadrati: {
      id: 'quadrati',
      nome: 'Quadrati',
      dettaglio: 'da 1 a 5',
      manopole: { pp: 1, tf: 1, a1: 3, mol: 1, a2: 4 },
      valori: { pp: 0, tf: 1, a1: 0, mol: 0, a2: 0 },
      cavi: [
        { tipo: 'p', da: 'pp', a: 'tf' },
        { tipo: 'p', da: 'tf', a: 'a1' },
        { tipo: 'd', da: 'tf', a: 'a1' },
        { tipo: 'p', da: 'a1', a: 'mol' },
        { tipo: 'd', da: 'a1', a: 'mol' },
        { tipo: 'p', da: 'mol', a: 'a2' },
        { tipo: 'd', da: 'mol', a: 'a2' },
        { tipo: 'p', da: 'a2', a: 'pp' },
      ],
    },
  };

  function chiaveCavo(c) { return c.tipo + ':' + c.da + '>' + c.a; }

  // Che cosa cambia passando da un cablaggio all'altro: cavi da staccare, da lasciare, da collegare.
  function differenzaCavi(prima, dopo) {
    const kDopo = new Set(dopo.map(chiaveCavo));
    const kPrima = new Set(prima.map(chiaveCavo));
    return {
      togli: prima.filter((c) => !kDopo.has(chiaveCavo(c))),
      tieni: prima.filter((c) => kDopo.has(chiaveCavo(c))),
      metti: dopo.filter((c) => !kPrima.has(chiaveCavo(c))),
    };
  }

  // Le manopole da girare (solo quelle che cambiano posizione).
  function differenzaManopole(prima, dopo) {
    return UNITA.filter((u) => (prima[u.id] || 0) !== (dopo[u.id] || 0))
      .map((u) => ({ unita: u.id, da: prima[u.id] || 0, a: dopo[u.id] || 0 }));
  }

  // La sequenza di impulsi e numeri che percorre i cavi quando si avvia il calcolo.
  // Ogni passo: il cavo percorso, l'unità che agisce, i valori mostrati dopo il passo, l'eventuale numero perforato.
  function passiEniac(id) {
    const passi = [];
    if (id === 'somma') {
      passi.push({ cavo: 'p:pp>a1', unita: 'a1', valori: {}, testo: 'Il programmatore principale manda l\'impulso di partenza all\'accumulatore 1.' });
      passi.push({ cavo: 'p:a1>a2', unita: 'a2', valori: {}, testo: 'L\'accumulatore 1 passa l\'impulso all\'accumulatore 2: «preparati a ricevere».' });
      passi.push({ cavo: 'd:a1>a2', unita: 'a2', numero: 2, valori: { a2: 5 }, testo: 'Sul cavo dei dati viaggia il 2: l\'accumulatore 2 lo somma al suo 3 e ottiene 5.' });
      passi.push({ cavo: 'p:a2>pp', unita: 'pp', valori: { pp: 1 }, uscita: 5, testo: 'L\'impulso torna al programmatore principale: 1 ripetizione su 1, il calcolo è finito. Il risultato, 5, viene perforato su una scheda.' });
      return passi;
    }
    if (id === 'quadrati') {
      for (let k = 1; k <= 5; k++) {
        const q = k * k;
        passi.push({ cavo: 'p:pp>tf', unita: 'tf', giro: k, valori: {}, testo: 'Giro ' + k + ' di 5: il programmatore principale avvia la tavola delle funzioni.' });
        passi.push({ cavo: 'p:tf>a1', unita: 'a1', giro: k, valori: {}, testo: 'La tavola passa l\'impulso all\'accumulatore 1.' });
        passi.push({ cavo: 'd:tf>a1', unita: 'a1', giro: k, numero: 1, valori: { a1: k }, testo: 'La tavola trasmette un 1: l\'accumulatore 1 passa da ' + (k - 1) + ' a ' + k + '.' });
        passi.push({ cavo: 'p:a1>mol', unita: 'mol', giro: k, valori: {}, testo: 'L\'accumulatore 1 avvia il moltiplicatore.' });
        passi.push({ cavo: 'd:a1>mol', unita: 'mol', giro: k, numero: k, valori: { mol: q }, testo: 'Il ' + k + ' viaggia verso il moltiplicatore: ' + k + ' × ' + k + ' = ' + q + '.' });
        passi.push({ cavo: 'p:mol>a2', unita: 'a2', giro: k, valori: {}, testo: 'Il moltiplicatore passa l\'impulso all\'accumulatore 2.' });
        passi.push({ cavo: 'd:mol>a2', unita: 'a2', giro: k, numero: q, valori: { a2: q }, uscita: q, testo: 'L\'accumulatore 2 si azzera e riceve ' + q + ', che viene perforato su una scheda.' });
        passi.push({ cavo: 'p:a2>pp', unita: 'pp', giro: k, valori: { pp: k }, testo: 'L\'impulso torna al programmatore principale: ' + k + (k === 1 ? ' ripetizione' : ' ripetizioni') + ' su 5.' + (k < 5 ? ' Si ricomincia.' : ' Fine.') });
      }
      return passi;
    }
    return passi;
  }

  /* ---------- geometria dei cavi (curve di Bézier cubiche) ---------- */

  // verso 'giu': il cavo pende sotto le unità (pannelli affiancati);
  // verso 'destra': il cavo fa un'ansa a destra (pannelli impilati, schermi stretti).
  function controlliCavo(a, b, opz) {
    const o = opz || {};
    const max = o.max == null ? 120 : o.max;
    const extra = o.scarto || 0;
    if (o.verso === 'destra') {
      const s = Math.min(max, 26 + 0.2 * Math.abs(b.y - a.y)) + extra;
      return [a, { x: a.x + s, y: a.y }, { x: b.x + s, y: b.y }, b];
    }
    const s = Math.min(max, 34 + 0.17 * Math.abs(b.x - a.x)) + extra;
    return [a, { x: a.x, y: a.y + s }, { x: b.x, y: b.y + s }, b];
  }

  function puntoBezier(c, t) {
    const u = 1 - t;
    const k0 = u * u * u, k1 = 3 * u * u * t, k2 = 3 * u * t * t, k3 = t * t * t;
    return {
      x: k0 * c[0].x + k1 * c[1].x + k2 * c[2].x + k3 * c[3].x,
      y: k0 * c[0].y + k1 * c[1].y + k2 * c[2].y + k3 * c[3].y,
    };
  }

  function arrotonda(n) { return Math.round(n * 10) / 10; }

  function percorsoCavo(a, b, opz) {
    const c = controlliCavo(a, b, opz);
    return 'M' + arrotonda(c[0].x) + ' ' + arrotonda(c[0].y) +
      ' C' + arrotonda(c[1].x) + ' ' + arrotonda(c[1].y) + ' ' + arrotonda(c[2].x) + ' ' + arrotonda(c[2].y) +
      ' ' + arrotonda(c[3].x) + ' ' + arrotonda(c[3].y);
  }

  // Lunghezza approssimata di una curva (spezzata con n segmenti): serve al tratteggio animato.
  function lunghezzaBezier(c, n) {
    const passi = n || 24;
    let l = 0;
    let p = c[0];
    for (let i = 1; i <= passi; i++) {
      const q = puntoBezier(c, i / passi);
      l += Math.hypot(q.x - p.x, q.y - p.y);
      p = q;
    }
    return l;
  }

  /* =====================================================================
   * B) Von Neumann: bus, fasi, racconto
   * ===================================================================== */

  // Percorso di una parola sul bus: dalla sorgente si raggiunge la corsia del bus,
  // la si percorre e si esce verso la destinazione (come le piste di un circuito stampato).
  function percorsoBus(a, b, asse, orientamento) {
    if (orientamento === 'verticale') return [a, { x: asse, y: a.y }, { x: asse, y: b.y }, b];
    return [a, { x: a.x, y: asse }, { x: b.x, y: asse }, b];
  }

  function lunghezzaPercorso(punti) {
    let l = 0;
    for (let i = 1; i < punti.length; i++) l += Math.hypot(punti[i].x - punti[i - 1].x, punti[i].y - punti[i - 1].y);
    return l;
  }

  // Punto alla frazione t (0..1) della lunghezza di una spezzata, a velocità costante.
  function puntoSuPercorso(punti, t) {
    if (!punti.length) return { x: 0, y: 0 };
    const totale = lunghezzaPercorso(punti);
    if (totale === 0 || t <= 0) return { x: punti[0].x, y: punti[0].y };
    if (t >= 1) { const u = punti[punti.length - 1]; return { x: u.x, y: u.y }; }
    let resto = t * totale;
    for (let i = 1; i < punti.length; i++) {
      const a = punti[i - 1], b = punti[i];
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      if (l === 0) continue;
      if (resto <= l) { const f = resto / l; return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }; }
      resto -= l;
    }
    const u = punti[punti.length - 1];
    return { x: u.x, y: u.y };
  }

  function bin(n, cifre) { return (n >>> 0).toString(2).padStart(cifre, '0').slice(-cifre); }

  // Il racconto di una fase, con parole nostre (mini-markup: **grassetto**, `codice`).
  function racconta(ev, fase, memPrima) {
    const op = ev.op;
    const arg = ev.arg;
    const mem = memPrima || [];
    if (fase === 'prelievo') {
      return '**Prelievo.** Il contatore di programma vale ' + ev.indirizzo + ': l\'indirizzo ' + ev.indirizzo +
        ' viaggia sul bus fino alla memoria, che risponde con il contenuto della cella, `' + bin(ev.parola, 8) +
        '`. La parola entra nel registro istruzione e il contatore avanza a ' + ((ev.indirizzo + 1) % 32) + '.';
    }
    if (fase === 'decodifica') {
      if (op === 0) return '**Decodifica.** I primi 3 bit, `000`, sono il codice di **HALT**: fermati. Gli altri 5 bit qui non contano.';
      const ruolo = op === 6 || op === 7 ? 'la cella a cui saltare' : 'l\'indirizzo della cella da usare';
      return '**Decodifica.** I primi 3 bit, `' + bin(op, 3) + '`, sono il codice di **' + ev.nome + '**; gli altri 5, `' +
        bin(arg, 5) + '`, sono il numero ' + arg + ': ' + ruolo + '.';
    }
    const a = ev.accPrima;
    const r = ev.accDopo;
    const v = mem[arg] == null ? null : mem[arg];
    switch (op) {
      case 0: return '**Esecuzione.** La macchina si ferma: il programma è finito.';
      case 1: return '**Esecuzione.** La CPU chiede la cella ' + arg + ': il numero ' + r + ' viaggia sul bus e finisce nell\'accumulatore.';
      case 2:
        if (arg === 31) return '**Esecuzione.** L\'accumulatore, ' + r + ', viaggia sul bus fino alla cella 31: è l\'uscita, e il numero viene stampato.';
        return '**Esecuzione.** L\'accumulatore, ' + r + ', viaggia sul bus e viene scritto nella cella ' + arg + ': il numero che c\'era prima è perso.';
      case 3: {
        const x = v == null ? (r - a) & 255 : v;
        return '**Esecuzione.** Dalla cella ' + arg + ' arriva ' + x + ': l\'accumulatore fa ' + a + ' + ' + x + ' = ' + r + '.' +
          (a + x > 255 ? ' Con 8 bit, dopo 255 si riparte da zero.' : '');
      }
      case 4: {
        const x = v == null ? (a - r) & 255 : v;
        return '**Esecuzione.** Dalla cella ' + arg + ' arriva ' + x + ': l\'accumulatore fa ' + a + ' − ' + x + ' = ' + r + '.' +
          (a < x ? ' Sotto lo zero, con 8 bit, si riparte da 255.' : '');
      }
      case 5: {
        const x = v == null ? 0 : v;
        return '**Esecuzione.** Dalla cella ' + arg + ' arriva ' + x + ': l\'accumulatore fa ' + a + ' × ' + x + ' = ' + r + '.' +
          (a * x > 255 ? ' Il risultato vero, ' + (a * x) + ', non sta in 8 bit: restano solo gli ultimi 8.' : '');
      }
      case 6: return '**Esecuzione.** Il contatore di programma diventa ' + arg + ': la prossima istruzione sarà quella della cella ' + arg + '.';
      case 7:
        if (ev.saltato) return '**Esecuzione.** L\'accumulatore vale 0, quindi si salta: il contatore di programma diventa ' + arg + '.';
        return '**Esecuzione.** L\'accumulatore vale ' + r + ', non 0: niente salto, si prosegue con la cella ' + ev.pcDopo + '.';
      default: return '';
    }
  }

  // Le tre fasi di un'istruzione già eseguita da CpuGiocattolo.passo(), con i movimenti sul bus.
  // memPrima è la memoria com'era prima dell'istruzione (serve per sapere che cosa si è letto).
  function fasiIstruzione(ev, memPrima) {
    const mem = memPrima || [];
    const esecuzione = [];
    const letto = mem[ev.arg] == null ? null : mem[ev.arg];
    if (ev.op === 1 || ev.op === 3 || ev.op === 4 || ev.op === 5) {
      esecuzione.push({ tipo: 'indirizzo', da: 'ir', a: 'cella', cella: ev.arg, valore: ev.arg });
      esecuzione.push({ tipo: 'dato', da: 'cella', a: 'acc', cella: ev.arg, valore: ev.op === 1 ? ev.accDopo : letto });
    } else if (ev.op === 2) {
      esecuzione.push({ tipo: 'indirizzo', da: 'ir', a: 'cella', cella: ev.arg, valore: ev.arg });
      esecuzione.push({ tipo: 'dato', da: 'acc', a: 'cella', cella: ev.arg, valore: ev.accDopo });
    } else if (ev.op === 6 || (ev.op === 7 && ev.saltato)) {
      esecuzione.push({ tipo: 'indirizzo', da: 'ir', a: 'pc', valore: ev.arg });
    }
    return [
      {
        fase: 'prelievo',
        movimenti: [
          { tipo: 'indirizzo', da: 'pc', a: 'cella', cella: ev.indirizzo, valore: ev.indirizzo },
          { tipo: 'istruzione', da: 'cella', a: 'ir', cella: ev.indirizzo, valore: ev.parola },
        ],
        testo: racconta(ev, 'prelievo', mem),
      },
      { fase: 'decodifica', movimenti: [], testo: racconta(ev, 'decodifica', mem) },
      { fase: 'esecuzione', movimenti: esecuzione, testo: racconta(ev, 'esecuzione', mem) },
    ];
  }

  // Come mostrare ogni cella: istruzione, dato, vuota o uscita (dipende solo da come è stato scritto il programma:
  // per la memoria sono tutti numeri).
  function ruoliCelle(assemblato) {
    const ruoli = new Array(32).fill('vuota');
    for (const r of (assemblato && assemblato.righe) || []) {
      if (r.indirizzo == null || r.istruzione == null) continue;
      ruoli[r.indirizzo] = r.istruzione === 'DATA' ? 'dato' : 'codice';
    }
    ruoli[31] = 'uscita';
    return ruoli;
  }

  // Accende o spegne un bit; i = 0 è il bit più a sinistra (il più pesante).
  function attivaBit(parola, i) { return (parola ^ (1 << (7 - i))) & 255; }

  function formattaSecondi(ms) {
    const s = Math.max(0, Math.round(ms / 100) / 10);
    return s.toFixed(1).replace('.', ',') + ' s';
  }

  // Durata di un volo sul bus secondo la velocità scelta (1 = lenta, 5 = veloce).
  function durataVolo(velocita) {
    const v = Math.min(5, Math.max(1, Math.round(velocita || 3)));
    return [0, 1100, 760, 480, 260, 110][v];
  }
  function pausaFasi(velocita) {
    const v = Math.min(5, Math.max(1, Math.round(velocita || 3)));
    return [0, 900, 560, 320, 150, 40][v];
  }

  const Logica = {
    UNITA: UNITA,
    PROBLEMI: PROBLEMI,
    chiaveCavo: chiaveCavo,
    differenzaCavi: differenzaCavi,
    differenzaManopole: differenzaManopole,
    passiEniac: passiEniac,
    controlliCavo: controlliCavo,
    puntoBezier: puntoBezier,
    percorsoCavo: percorsoCavo,
    lunghezzaBezier: lunghezzaBezier,
    percorsoBus: percorsoBus,
    lunghezzaPercorso: lunghezzaPercorso,
    puntoSuPercorso: puntoSuPercorso,
    racconta: racconta,
    fasiIstruzione: fasiIstruzione,
    ruoliCelle: ruoliCelle,
    attivaBit: attivaBit,
    formattaSecondi: formattaSecondi,
    durataVolo: durataVolo,
    pausaFasi: pausaFasi,
  };

  /* =====================================================================
   * Stile (tutte le classi iniziano con lab-programma-memorizzato-)
   * Colori fissi in tutto il laboratorio: ambra = che cosa fare (codice operativo, impulsi di programma),
   * azzurro = indirizzi, verde = numeri (dati), rosa = uscita.
   * ===================================================================== */
  const css = `
.${P} { container: pm / inline-size; font-size: 14px; color: var(--lab-text); }
.${P} *, .${P} *::before, .${P} *::after { box-sizing: border-box; }
.${P} [hidden] { display: none !important; }
.${P}-modi { padding: 14px 18px; }
.${P}-modi .pg-gruppo { display: flex; width: 100%; }
.${P}-modi .pg-btn { flex: 1 1 220px; display: grid; gap: 1px; align-content: center; justify-content: start; text-align: left; white-space: normal; min-height: 58px; padding: 9px 16px; }
.${P}-modo-num { font: 800 13px var(--mono); letter-spacing: .08em; color: var(--trace-2); }
.${P}-modo-tit { font-weight: 700; font-size: 14px; color: var(--lab-bright); }
.${P}-btn-dett { font: 600 13px var(--mono); color: var(--lab-text); }
.${P} .pg-btn[aria-pressed="true"] .${P}-btn-dett { color: #d9f3ff; }
.${P}-leg { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 13px; }
.${P}-leg span { display: inline-flex; align-items: center; gap: 7px; }
.${P}-leg i { width: 12px; height: 12px; border-radius: 3px; background: var(--c); box-shadow: 0 0 8px color-mix(in srgb, var(--c) 55%, transparent); }
.${P}-c-op { --c: var(--trace-2); } .${P}-c-ind { --c: var(--trace-3); } .${P}-c-dato { --c: var(--trace-1); } .${P}-c-out { --c: var(--trace-4); }
.${P}-spiega { min-height: 6.4em; }
.${P}-spiega code { white-space: nowrap; }
.${P}-spiega .pg-btn { margin-top: 6px; }

/* ---------- A) il pannello dell'ENIAC ---------- */
.${P}-quadro { position: relative; margin: 16px 18px 4px; padding: 12px 74px 12px 12px; border-radius: 14px; background: linear-gradient(180deg, #0e1715, #090f0e); border: 1px solid var(--lab-line); }
.${P}-unita-lista { position: relative; display: grid; gap: 10px; }
.${P}-unita { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: linear-gradient(180deg, #18241f, #121b18); border: 1px solid #263631; }
.${P}-unita::after { content: ""; position: absolute; inset: -1px; border-radius: 10px; border: 2px solid var(--trace-2); opacity: 0; pointer-events: none; }
.${P}-unita.is-attiva::after { animation: ${P}-lampo var(--pg-dur-lenta) ease-out; }
.${P}-unita-testa { min-width: 0; }
.${P}-unita-sigla { display: block; font: 800 15px var(--mono); color: var(--lab-bright); letter-spacing: .04em; }
.${P}-unita-nome { display: block; font-size: 13px; line-height: 1.3; color: var(--lab-text); }
.${P}-neon { min-width: 3.4ch; padding: 5px 8px; border-radius: 6px; background: #040907; border: 1px solid #22332d; font: 700 20px/1 var(--mono); text-align: center; font-variant-numeric: tabular-nums; color: var(--trace-1); text-shadow: 0 0 9px color-mix(in srgb, var(--trace-1) 70%, transparent); }
.${P}-neon.is-spento { color: color-mix(in srgb, var(--trace-1) 22%, transparent); text-shadow: none; }
.${P}-manopola { display: grid; justify-items: center; gap: 3px; min-width: 74px; }
.${P}-disco { position: relative; width: 32px; height: 32px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #44544e, #111917 72%); border: 2px solid #2f403a; transform: rotate(var(--angolo, -120deg)); transition: transform var(--pg-dur-normale) var(--pg-ease-bounce); }
.${P}-disco::after { content: ""; position: absolute; left: 50%; top: 2px; width: 3px; height: 11px; margin-left: -1.5px; border-radius: 2px; background: var(--trace-2); }
.${P}-manopola-testo { font-size: 13px; line-height: 1.2; text-align: center; color: var(--lab-bright); }
.${P}-prese { display: flex; flex-direction: column; gap: 8px; }
.${P}-presa-box { display: grid; justify-items: center; gap: 2px; font-size: 13px; line-height: 1; }
.${P}-presa { width: 22px; height: 22px; border-radius: 50%; background: #020504; border: 3px solid var(--c); box-shadow: inset 0 0 0 3px #1a2622; transition: box-shadow var(--pg-dur-veloce) ease; }
.${P}-presa.is-collegata { box-shadow: inset 0 0 0 3px #1a2622, 0 0 10px var(--c); }
.${P}-presa--p { --c: var(--trace-2); } .${P}-presa--d { --c: var(--trace-1); }
.${P}-presa-vuota { width: 22px; height: 22px; }
.${P}-cavi { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.${P}-cavo-ombra { fill: none; stroke: rgba(0, 0, 0, .6); stroke-width: 8; stroke-linecap: round; }
.${P}-cavo-filo { fill: none; stroke: var(--c); stroke-width: 4; stroke-linecap: round; }
.${P}-cavo--p { --c: var(--trace-2); } .${P}-cavo--d { --c: var(--trace-1); }
.${P}-cavo.is-tenuto .${P}-cavo-filo { stroke-dasharray: 2 7; }
.${P}-spina { fill: var(--c); stroke: #050807; stroke-width: 2; transform-box: fill-box; transform-origin: center; }
.${P}-spina.is-innesto { animation: ${P}-innesto var(--pg-dur-normale) var(--pg-ease-bounce); }
.${P}-impulso { fill: #fff8e6; stroke: var(--trace-2); stroke-width: 3; }
.${P}-numero rect { fill: #04120b; stroke: var(--trace-1); stroke-width: 2; }
.${P}-numero text { fill: var(--trace-1); font: 700 13px var(--mono); }
.${P}-conti { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; padding: 12px 18px 16px; }
.${P}-conto { padding: 10px 12px; border-radius: 12px; background: var(--lab-panel); border: 1px solid var(--lab-line); min-width: 0; }
.${P}-conto-t { margin: 0 0 6px; font: 800 13px var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--lab-text); }
.${P}-conto-v { margin: 0; font: 700 15px/1.45 var(--mono); color: var(--lab-bright); font-variant-numeric: tabular-nums; }
.${P}-tempi { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; align-items: center; }
.${P}-cal { position: relative; width: 46px; height: 46px; border-radius: 7px; background: #f3efe4; color: #2a2621; display: grid; place-items: center; font: 800 13px var(--mono); overflow: hidden; perspective: 200px; }
.${P}-cal::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 9px; background: var(--trace-4); }
.${P}-cal span { padding-top: 7px; }
.${P}-cal span.is-giro { animation: ${P}-sfoglia var(--pg-dur-normale) var(--pg-ease-smooth); }
.${P}-qui { font: 700 20px var(--mono); color: var(--trace-1); font-variant-numeric: tabular-nums; }
.${P}-schede { display: flex; flex-wrap: wrap; gap: 6px; min-height: 32px; align-items: center; }
.${P}-num-out { font: 700 16px var(--mono); color: var(--trace-4); padding: 3px 9px; border-radius: 7px; border: 1px solid color-mix(in srgb, var(--trace-4) 55%, transparent); background: color-mix(in srgb, var(--trace-4) 10%, transparent); animation: ${P}-entra var(--pg-dur-normale) var(--pg-ease-smooth); }
.${P}-vuoto { font-size: 13px; color: color-mix(in srgb, var(--lab-text) 80%, transparent); }
@container pm (min-width: 620px) {
  .${P}-quadro { padding: 14px 14px 120px; }
  .${P}-unita-lista { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .${P}-unita { grid-template-columns: 1fr; justify-items: center; align-content: start; text-align: center; gap: 10px; padding: 12px 8px 12px; min-height: 236px; }
  .${P}-unita-nome { min-height: 2.6em; }
  .${P}-prese { flex-direction: row; gap: 14px; margin-top: 4px; }
}

/* ---------- B) la macchina di von Neumann ---------- */
.${P}-vn-testa { display: grid; gap: 8px; padding: 12px 18px; border-bottom: 1px solid var(--lab-line); }
.${P}-banco { position: relative; display: grid; gap: 12px; padding: 16px 18px; grid-template-columns: minmax(0, 1fr); grid-template-areas: "cpu" "bus" "mem" "out"; }
.${P}-sez-t { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 10px; margin: 0 0 8px; font: 800 13px var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--lab-bright); }
.${P}-sez-t small { font: 500 13px var(--font); letter-spacing: 0; text-transform: none; color: var(--lab-text); }
.${P}-mem { grid-area: mem; min-width: 0; }
.${P}-griglia { position: relative; list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.${P}-griglia li { min-width: 0; }
.${P}-cella { position: relative; width: 100%; min-height: 50px; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 6px; align-items: center; padding: 6px 7px; border-radius: 8px; border: 1px solid var(--lab-line); background: var(--lab-panel); color: var(--lab-text); font: 13px/1.2 var(--mono); text-align: left; cursor: pointer; transition: border-color var(--pg-dur-veloce) ease, background-color var(--pg-dur-veloce) ease; }
.${P}-cella:hover { border-color: color-mix(in srgb, var(--lab-bright) 45%, var(--lab-line)); }
.${P}-cella::after { content: ""; position: absolute; inset: -2px; border-radius: 9px; border: 2px solid var(--lampo, var(--trace-1)); opacity: 0; pointer-events: none; }
.${P}-cella.is-lampo::after, .${P}-reg.is-lampo::after { animation: ${P}-lampo var(--pg-dur-lenta) ease-out; }
.${P}-cella.is-sorgente, .${P}-reg.is-sorgente { border-color: var(--lampo, var(--trace-1)); }
.${P}-cella.is-aperta { border-color: var(--lab-bright); background: color-mix(in srgb, var(--lab-bright) 8%, var(--lab-panel)); }
.${P}-cella-ind { color: var(--trace-3); }
.${P}-cella-dec { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; color: var(--lab-bright); }
.${P}-cella--vuota .${P}-cella-dec { font-weight: 400; color: color-mix(in srgb, var(--lab-text) 75%, transparent); }
.${P}-cella--dato .${P}-cella-dec { color: var(--trace-1); }
.${P}-cella--uscita { border-color: color-mix(in srgb, var(--trace-4) 50%, var(--lab-line)); }
.${P}-cella--uscita .${P}-cella-dec { color: var(--trace-4); }
.${P}-cella-bit { grid-column: 1 / -1; display: flex; gap: 2px; }
.${P}-b { width: 8px; height: 8px; border-radius: 2px; background: #1b2824; --c: var(--trace-3); }
.${P}-cella--codice .${P}-b:nth-child(-n+3) { --c: var(--trace-2); }
.${P}-cella--codice .${P}-b:nth-child(3) { margin-right: 4px; }
.${P}-cella--dato .${P}-b, .${P}-cella--vuota .${P}-b { --c: var(--trace-1); }
.${P}-cella--uscita .${P}-b { --c: var(--trace-4); }
.${P}-b.is-1 { background: var(--c); box-shadow: 0 0 5px color-mix(in srgb, var(--c) 65%, transparent); }
.${P}-cursore { position: absolute; left: 0; top: 0; border: 2px solid var(--trace-3); border-radius: 9px; pointer-events: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--trace-3) 22%, transparent), 0 0 16px color-mix(in srgb, var(--trace-3) 35%, transparent); transition: transform var(--pg-dur-normale) var(--pg-ease-smooth), opacity var(--pg-dur-veloce) ease; }
.${P}-bus { grid-area: bus; position: relative; min-height: 46px; }
.${P}-corsia { position: absolute; left: 0; right: 0; height: 6px; border-radius: 3px; background: color-mix(in srgb, var(--c) 20%, #0b1411); }
.${P}-corsia::after { content: ""; position: absolute; inset: -2px; border-radius: 4px; background: var(--c); box-shadow: 0 0 12px var(--c); opacity: 0; transition: opacity var(--pg-dur-veloce) ease; }
.${P}-corsia.is-attiva::after { opacity: .85; }
.${P}-corsia--ind { --c: var(--trace-3); top: 8px; } .${P}-corsia--dati { --c: var(--trace-1); top: 32px; }
.${P}-corsia-t { position: absolute; right: 0; font: 600 13px/1 var(--mono); color: var(--c); background: var(--lab-bg); padding: 0 0 0 8px; transform: translateY(-50%); top: 3px; }
.${P}-cpu { grid-area: cpu; display: grid; gap: 10px; padding: 12px; border-radius: 14px; background: var(--lab-panel); border: 1px solid var(--lab-line); min-width: 0; }
.${P}-regs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.${P}-reg { position: relative; display: grid; align-content: start; gap: 2px; padding: 8px 9px; border-radius: 10px; background: #060c0a; border: 1px solid var(--lab-line); min-width: 0; --lampo: var(--c); }
.${P}-reg::after { content: ""; position: absolute; inset: -2px; border-radius: 11px; border: 2px solid var(--c); opacity: 0; pointer-events: none; }
.${P}-reg--pc { --c: var(--trace-3); } .${P}-reg--ir { --c: var(--trace-2); } .${P}-reg--acc { --c: var(--trace-1); }
.${P}-reg-nome { font: 800 13px var(--mono); color: var(--c); }
.${P}-reg-desc { font-size: 13px; line-height: 1.25; color: var(--lab-text); }
.${P}-reg-val { font: 700 20px/1.25 var(--mono); color: var(--lab-bright); font-variant-numeric: tabular-nums; white-space: nowrap; }
.${P}-reg--ir .${P}-reg-val { font-size: 15px; letter-spacing: .02em; }
.${P}-reg-sub { font: 13px var(--mono); color: var(--lab-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.${P}-op { color: var(--trace-2); transition: text-shadow var(--pg-dur-veloce) ease; } .${P}-arg { color: var(--trace-3); transition: text-shadow var(--pg-dur-veloce) ease; }
.${P}-reg--ir.is-decodifica .${P}-op { text-shadow: 0 0 10px var(--trace-2); }
.${P}-reg--ir.is-decodifica .${P}-arg { text-shadow: 0 0 10px var(--trace-3); }
.${P}-fasi { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.${P}-fase { padding: 6px 4px; border-radius: 8px; border: 1px solid var(--lab-line); text-align: center; font-size: 13px; color: var(--lab-text); transition: background-color var(--pg-dur-veloce) ease, color var(--pg-dur-veloce) ease; }
.${P}-fase.is-attiva { background: var(--lab-bright); color: #06120d; border-color: var(--lab-bright); font-weight: 700; }
.${P}-fase.is-fatta { color: var(--lab-bright); }
.${P}-out { grid-area: out; padding: 12px; border-radius: 14px; background: var(--lab-panel); border: 1px solid color-mix(in srgb, var(--trace-4) 35%, var(--lab-line)); min-width: 0; }
.${P}-stato { font: 700 13px var(--mono); color: var(--lab-text); }
.${P}-stato.is-fermo { color: var(--trace-4); }
.${P}-pacchetto { position: absolute; left: 0; top: 0; z-index: 3; pointer-events: none; padding: 3px 8px; border-radius: 7px; border: 2px solid var(--c); background: #03100b; color: var(--c); font: 700 13px/1.3 var(--mono); white-space: nowrap; box-shadow: 0 0 16px color-mix(in srgb, var(--c) 55%, transparent); will-change: transform; }
.${P}-pacchetto--indirizzo { --c: var(--trace-3); } .${P}-pacchetto--dato { --c: var(--trace-1); } .${P}-pacchetto--istruzione { --c: var(--trace-2); }
.${P}-editor { margin-top: 12px; padding: 12px; border-radius: 12px; background: var(--lab-raised); border: 1px solid color-mix(in srgb, var(--lab-bright) 30%, var(--lab-line)); display: grid; gap: 10px; }
.${P}-editor-t { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px; margin: 0; font-weight: 700; color: var(--lab-bright); }
.${P}-ebits { display: flex; flex-wrap: wrap; gap: 8px 14px; }
.${P}-ecampo { display: grid; gap: 4px; }
.${P}-ecampo-t { font-size: 13px; color: var(--c); }
.${P}-ecampo-b { display: flex; gap: 4px; }
.${P}-ebit { width: 40px; min-width: 40px; padding: 0; font: 700 16px var(--mono); }
.${P}-ebit[aria-pressed="true"] { background: color-mix(in srgb, var(--c) 30%, var(--lab-raised)); border-color: var(--c); color: #fff; }
.${P}-ebit[aria-pressed="false"] { color: color-mix(in srgb, var(--lab-text) 80%, transparent); }
.${P}-eletture { display: flex; flex-wrap: wrap; gap: 4px 18px; font: 13px var(--mono); color: var(--lab-text); }
.${P}-eletture b { color: var(--lab-bright); }
.${P}-ecomandi { display: flex; flex-wrap: wrap; gap: 8px; }
.${P}-vel { display: inline-flex; align-items: center; gap: 8px; }
@container pm (max-width: 379px) {
  .${P}-griglia { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .${P}-regs { grid-template-columns: 1fr 1fr; }
  .${P}-reg--ir { grid-column: 1 / -1; order: -1; }
}
@container pm (min-width: 820px) {
  .${P}-banco { grid-template-columns: minmax(0, 1.9fr) 64px minmax(0, 1fr); grid-template-areas: "mem bus cpu" "mem bus out"; grid-template-rows: auto 1fr; align-items: start; }
  .${P}-bus { min-height: 0; align-self: stretch; margin-top: 30px; }
  .${P}-corsia { left: auto; right: auto; top: 0; bottom: 0; width: 6px; height: auto; }
  .${P}-corsia--ind { left: 16px; } .${P}-corsia--dati { left: 40px; }
  .${P}-corsia-t { right: auto; top: 50%; left: 50%; padding: 8px 0; writing-mode: vertical-rl; transform: translate(-50%, -50%); }
  .${P}-regs { grid-template-columns: 1fr; }
  .${P}-reg { grid-template-columns: auto minmax(0, 1fr); column-gap: 10px; }
  .${P}-reg-nome { grid-row: span 2; align-self: center; font-size: 15px; min-width: 3ch; }
  .${P}-reg-desc, .${P}-reg-val, .${P}-reg-sub { grid-column: 2; }
}
@keyframes ${P}-lampo { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.06); } }
@keyframes ${P}-innesto { 0% { transform: scale(1.8); } 100% { transform: scale(1); } }
@keyframes ${P}-entra { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes ${P}-sfoglia { from { opacity: 0; transform: rotateX(-80deg); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .${P} *, .${P} *::before, .${P} *::after { transition-duration: 1ms !important; animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
}
`;

  /* =====================================================================
   * Interfaccia
   * ===================================================================== */

  const GIORNI = ['LUN', 'MAR', 'MER'];

  function testoSemplice(t) { return String(t || '').replace(/\*\*/g, '').replace(/`/g, ''); }

  function angoloManopola(i, n) { return n <= 1 ? 0 : -120 + i * 240 / (n - 1); }

  function monta(el, ctx) {
    const { h } = ctx;
    const radice = h('div', { class: P });
    el.append(radice);

    // Un solo flusso animato alla volta: un'azione nuova interrompe quella in corso.
    // fn riceve vivo(): diventa falso appena un'altra azione prende il suo posto.
    let coda = Promise.resolve();
    let gen = 0;
    function esclusivo(fn) {
      const mio = ++gen;
      ctx.annulla();
      coda = coda.then(async () => {
        if (mio !== gen) return;
        try { await fn(() => mio === gen); } catch (err) { if (!ctx.annullato(err)) console.error(err); }
      });
      return coda;
    }

    const modi = [
      { id: 'eniac', num: 'A · ENIAC 1946', tit: 'Il programma è nei cavi' },
      { id: 'vn', num: 'B · Von Neumann 1945', tit: 'Il programma è nella memoria' },
    ];
    const bottoni = {};
    const gruppo = h('div', { class: 'pg-gruppo', role: 'group', 'aria-label': 'Scegli la macchina' }, modi.map((m) => {
      bottoni[m.id] = h('button', { type: 'button', class: 'pg-btn', 'aria-pressed': 'false', onclick: () => vai(m.id) },
        h('span', { class: P + '-modo-num' }, m.num), h('span', { class: P + '-modo-tit' }, m.tit));
      return bottoni[m.id];
    }));
    radice.append(h('div', { class: 'pg-strumenti ' + P + '-modi' }, gruppo));

    let modo = null;
    const eniac = creaEniac(ctx, { esclusivo: esclusivo, vai: (id) => { vai(id); bottoni[id].focus(); } });
    const vn = creaVonNeumann(ctx, { esclusivo: esclusivo });
    radice.append(eniac.el, vn.el);

    function vai(id) {
      if (modo === id) return;
      const vecchio = modo === 'eniac' ? eniac : modo === 'vn' ? vn : null;
      if (vecchio) vecchio.nascondi();
      esclusivo(async () => {});
      modo = id;
      for (const m of modi) bottoni[m.id].setAttribute('aria-pressed', String(m.id === id));
      eniac.el.hidden = id !== 'eniac';
      vn.el.hidden = id !== 'vn';
      (id === 'eniac' ? eniac : vn).mostra();
      ctx.annuncia(id === 'eniac' ? 'ENIAC: il programma è nei cavi.' : 'Macchina di von Neumann: il programma è nella memoria.');
    }
    vai('eniac');

    return {
      pausa() { /* il motore ferma già attese e animazioni */ },
      riprendi() { eniac.misura(); vn.misura(); },
    };
  }

  /* ---------- A) ENIAC: il programma è nei cavi ---------- */

  function creaEniac(ctx, api) {
    const { h, s } = ctx;
    let attuale = 'somma';
    let valori = Object.assign({}, PROBLEMI.somma.valori);
    let manopole = Object.assign({}, PROBLEMI.somma.manopole);
    let caviAttivi = PROBLEMI.somma.cavi.map((c) => Object.assign({}, c));
    let uscite = [];
    let verso = 'giu';
    let visibile = false;
    const unitaEl = {};
    const caviEl = {};

    const idEt = ctx.uid(P + '-prob');
    const btn = {};
    for (const id of Object.keys(PROBLEMI)) {
      const pb = PROBLEMI[id];
      btn[id] = h('button', { type: 'button', class: 'pg-btn', 'aria-pressed': String(id === attuale), onclick: () => scegli(id) },
        h('span', null, pb.nome), h('span', { class: P + '-btn-dett' }, pb.dettaglio));
    }
    const bAvvia = h('button', { type: 'button', class: 'pg-btn pg-btn--primario', onclick: () => api.esclusivo((vivo) => calcola(vivo)) }, '▶ Avvia il calcolo');
    const barra = h('div', { class: 'pg-strumenti' },
      h('span', { class: 'pg-etichetta', id: idEt }, 'Problema'),
      h('div', { class: 'pg-gruppo', role: 'group', 'aria-labelledby': idEt }, btn.somma, btn.quadrati),
      h('span', { class: 'pg-spazio' }),
      bAvvia);
    const legenda = h('div', { class: 'pg-strumenti ' + P + '-leg' },
      h('span', { class: P + '-c-op' }, h('i'), 'cavo di programma: quale unità deve agire'),
      h('span', { class: P + '-c-dato' }, h('i'), 'cavo dei dati: porta i numeri'),
      h('span', { class: P + '-c-out' }, h('i'), 'risultato perforato'));

    function creaUnita(u) {
      const neon = h('span', { class: P + '-neon', 'aria-hidden': 'true' });
      const disco = h('span', { class: P + '-disco', 'aria-hidden': 'true' });
      const testoMan = h('span', { class: P + '-manopola-testo' });
      const prese = {};
      const preseBox = h('div', { class: P + '-prese' }, ['p', 'd'].map((t) => {
        if (!u.prese.includes(t)) return h('span', { class: P + '-presa-box', 'aria-hidden': 'true' }, h('span', null, ''), h('span', { class: P + '-presa-vuota' }));
        prese[t] = h('span', { class: P + '-presa ' + P + '-presa--' + t });
        return h('span', { class: P + '-presa-box' }, h('span', null, t === 'p' ? 'prog.' : 'dati'), prese[t]);
      }));
      const box = h('div', { class: P + '-unita', 'data-u': u.id },
        h('div', { class: P + '-unita-testa' }, h('span', { class: P + '-unita-sigla' }, u.sigla), h('span', { class: P + '-unita-nome' }, u.nome)),
        neon,
        h('div', { class: P + '-manopola', title: u.manopola }, disco, testoMan),
        preseBox);
      unitaEl[u.id] = { box: box, neon: neon, disco: disco, testoMan: testoMan, prese: prese };
      return box;
    }

    const svg = s('svg', { class: P + '-cavi', 'aria-hidden': 'true', focusable: 'false' });
    const gCavi = s('g');
    const gMoto = s('g');
    svg.append(gCavi, gMoto);
    const descr = h('p', { class: 'pg-sr' });
    const quadro = h('div', { class: P + '-quadro' }, h('div', { class: P + '-unita-lista' }, UNITA.map(creaUnita)), svg, descr);

    const vLavoro = h('p', { class: P + '-conto-v' }, 'Il pannello è cablato per la somma.');
    const cal = h('span', { class: P + '-cal', 'aria-hidden': 'true' }, h('span', null, GIORNI[0]));
    const qui = h('span', { class: P + '-qui' }, '0,0 s');
    const schede = h('div', { class: P + '-schede', 'aria-live': 'off' });
    const conti = h('div', { class: P + '-conti' },
      h('div', { class: P + '-conto' }, h('p', { class: P + '-conto-t' }, 'Ricablaggio'), vLavoro),
      h('div', { class: P + '-conto' }, h('p', { class: P + '-conto-t' }, 'Per cambiare problema'),
        h('div', { class: P + '-tempi' },
          cal, h('p', { class: P + '-conto-v' }, 'ENIAC vero: ', h('strong', null, 'giorni')),
          h('span', { class: P + '-conto-v' }, 'Qui:'), qui)),
      h('div', { class: P + '-conto' }, h('p', { class: P + '-conto-t' }, 'Schede perforate'), schede));
    const spiega = h('div', { class: 'pg-spiega ' + P + '-spiega' });
    const el = h('div', { class: P + '-modo', 'data-modo': 'eniac', hidden: true }, barra, legenda, quadro, conti, spiega);

    function racconto(testo, extra) {
      spiega.replaceChildren(...[h('p', null, ctx.inline(testo)), extra].filter(Boolean));
    }
    const nomeU = (id) => PER_ID[id].nome.toLowerCase();

    function testoNeon(id, v) {
      if (v == null) return '––';
      if (id === 'pp') return v + '/' + (manopole.pp ? 5 : 1);
      return String(v).padStart(2, '0');
    }

    function aggiornaPrese() {
      for (const u of UNITA) {
        for (const t of Object.keys(unitaEl[u.id].prese)) {
          unitaEl[u.id].prese[t].classList.toggle('is-collegata', caviAttivi.some((c) => c.tipo === t && (c.da === u.id || c.a === u.id)));
        }
      }
      descr.textContent = 'Collegamenti del pannello: ' + caviAttivi.map((c) => 'da ' + nomeU(c.da) + ' a ' + nomeU(c.a) + ' (' + (c.tipo === 'p' ? 'programma' : 'dati') + ')').join('; ') + '.';
    }

    function disegnaStato() {
      for (const u of UNITA) {
        const e = unitaEl[u.id];
        const v = valori[u.id];
        e.neon.textContent = testoNeon(u.id, v);
        e.neon.classList.toggle('is-spento', v == null);
        const i = manopole[u.id] || 0;
        e.disco.style.setProperty('--angolo', angoloManopola(i, u.posizioni.length) + 'deg');
        e.testoMan.textContent = u.posizioni[i];
      }
      aggiornaPrese();
    }

    function disegnaSchede(nuova) {
      if (!uscite.length) { schede.replaceChildren(h('span', { class: P + '-vuoto' }, 'Nessuna scheda, per ora.')); return; }
      schede.replaceChildren(...uscite.map((n, i) => h('span', { class: P + '-num-out', style: nuova && i === uscite.length - 1 ? null : 'animation: none' }, String(n))));
    }

    function lampo(nodo) {
      nodo.classList.remove('is-attiva');
      requestAnimationFrame(() => nodo.classList.add('is-attiva'));
      setTimeout(() => nodo.classList.remove('is-attiva'), ctx.DURATA.lenta + 50);
    }

    /* geometria dei cavi */
    function centroPresa(uid, tipo) {
      const presa = unitaEl[uid].prese[tipo];
      const r = presa.getBoundingClientRect();
      const q = quadro.getBoundingClientRect();
      return { x: r.left + r.width / 2 - q.left - quadro.clientLeft, y: r.top + r.height / 2 - q.top - quadro.clientTop };
    }

    function geometriaCavo(rec) {
      const a = centroPresa(rec.c.da, rec.c.tipo);
      const b = centroPresa(rec.c.a, rec.c.tipo);
      const opz = { verso: verso, max: verso === 'giu' ? 118 : 72, scarto: rec.c.tipo === 'd' ? 9 : 0 };
      rec.ctrl = controlliCavo(a, b, opz);
      const d = percorsoCavo(a, b, opz);
      rec.ombra.setAttribute('d', d);
      rec.filo.setAttribute('d', d);
      rec.L = typeof rec.filo.getTotalLength === 'function' ? rec.filo.getTotalLength() : lunghezzaBezier(rec.ctrl);
      rec.spinaA.setAttribute('cx', a.x);
      rec.spinaA.setAttribute('cy', a.y);
      if (!rec.inMoto) { rec.spinaB.setAttribute('cx', b.x); rec.spinaB.setAttribute('cy', b.y); }
    }

    function punto(rec, l) {
      const x = Math.max(0, Math.min(rec.L, l));
      if (typeof rec.filo.getPointAtLength === 'function') { const p = rec.filo.getPointAtLength(x); return { x: p.x, y: p.y }; }
      return puntoBezier(rec.ctrl, rec.L ? x / rec.L : 0);
    }

    function creaCavo(c) {
      const k = chiaveCavo(c);
      const rec = {
        c: c, k: k, inMoto: false, L: 0, ctrl: null,
        ombra: s('path', { class: P + '-cavo-ombra' }),
        filo: s('path', { class: P + '-cavo-filo' }),
        spinaA: s('circle', { class: P + '-spina', r: 6 }),
        spinaB: s('circle', { class: P + '-spina', r: 6 }),
      };
      rec.g = s('g', { class: P + '-cavo ' + P + '-cavo--' + c.tipo, 'data-k': k }, rec.ombra, rec.filo, rec.spinaA, rec.spinaB);
      gCavi.append(rec.g);
      caviEl[k] = rec;
      if (visibile) geometriaCavo(rec);
      return rec;
    }

    function tratteggio(rec, off) {
      const v = off == null ? '' : rec.L + ' ' + (rec.L + 4);
      rec.filo.style.strokeDasharray = v;
      rec.ombra.style.strokeDasharray = v;
      rec.filo.style.strokeDashoffset = off == null ? '' : off;
      rec.ombra.style.strokeDashoffset = off == null ? '' : off;
    }

    // Riporta i cavi disegnati allo stato di caviAttivi (dopo un'interruzione o al primo disegno).
    function allineaCavi() {
      const voluti = new Set(caviAttivi.map(chiaveCavo));
      for (const k of Object.keys(caviEl)) if (!voluti.has(k)) { caviEl[k].g.remove(); delete caviEl[k]; }
      for (const c of caviAttivi) if (!caviEl[chiaveCavo(c)]) creaCavo(c);
      for (const k of Object.keys(caviEl)) {
        const rec = caviEl[k];
        rec.inMoto = false;
        tratteggio(rec, null);
        rec.spinaA.style.opacity = '';
        if (visibile) geometriaCavo(rec);
      }
      aggiornaPrese();
    }

    function misura() {
      if (!visibile || !quadro.isConnected || !quadro.clientWidth) return;
      const r0 = unitaEl.pp.box.getBoundingClientRect();
      const r1 = unitaEl.tf.box.getBoundingClientRect();
      verso = Math.abs(r0.top - r1.top) < 4 ? 'giu' : 'destra';
      svg.setAttribute('viewBox', '0 0 ' + quadro.clientWidth + ' ' + quadro.clientHeight);
      for (const k of Object.keys(caviEl)) geometriaCavo(caviEl[k]);
    }
    let rafMisura = 0;
    const pianifica = () => { if (!rafMisura) rafMisura = requestAnimationFrame(() => { rafMisura = 0; misura(); }); };
    if (typeof ResizeObserver === 'function') new ResizeObserver(pianifica).observe(quadro);
    else window.addEventListener('resize', pianifica);

    /* ricablaggio animato */
    async function stacca(c) {
      const rec = caviEl[chiaveCavo(c)];
      if (!rec) return;
      if (!ctx.riduci && rec.L) {
        rec.inMoto = true;
        tratteggio(rec, 0);
        await ctx.anima({
          durata: 420,
          easing: 'sharp',
          aggiorna(t) {
            const off = rec.L * t;
            rec.filo.style.strokeDashoffset = off;
            rec.ombra.style.strokeDashoffset = off;
            const p = punto(rec, rec.L * (1 - t));
            rec.spinaB.setAttribute('cx', p.x);
            rec.spinaB.setAttribute('cy', p.y);
            rec.spinaA.style.opacity = t > 0.85 ? String(Math.max(0, (1 - t) / 0.15)) : '';
          },
        });
      }
      rec.g.remove();
      delete caviEl[rec.k];
      caviAttivi = caviAttivi.filter((x) => chiaveCavo(x) !== rec.k);
      aggiornaPrese();
    }

    async function collega(c) {
      caviAttivi.push(Object.assign({}, c));
      const rec = creaCavo(c);
      if (!ctx.riduci && rec.L) {
        rec.inMoto = true;
        tratteggio(rec, rec.L);
        await ctx.anima({
          durata: 480,
          easing: 'smooth',
          aggiorna(t) {
            const off = rec.L * (1 - t);
            rec.filo.style.strokeDashoffset = off;
            rec.ombra.style.strokeDashoffset = off;
            const p = punto(rec, rec.L * t);
            rec.spinaB.setAttribute('cx', p.x);
            rec.spinaB.setAttribute('cy', p.y);
          },
        });
        rec.inMoto = false;
        tratteggio(rec, null);
        geometriaCavo(rec);
        rec.spinaB.classList.remove('is-innesto');
        requestAnimationFrame(() => rec.spinaB.classList.add('is-innesto'));
      }
      aggiornaPrese();
    }

    function sfoglia(i) {
      cal.replaceChildren(h('span', { class: ctx.riduci ? null : 'is-giro' }, GIORNI[i]));
    }

    function scegli(id) {
      if (id === attuale) return;
      api.esclusivo((vivo) => ricabla(id, vivo));
    }

    async function ricabla(id, vivo) {
      const a = PROBLEMI[id];
      const diff = differenzaCavi(caviAttivi, a.cavi);
      const man = differenzaManopole(manopole, a.manopole);
      const riass = diff.togli.length + ' cavi staccati, ' + diff.metti.length + ' collegati, ' + man.length + ' manopole girate';
      attuale = id;
      for (const k of Object.keys(btn)) btn[k].setAttribute('aria-pressed', String(k === id));
      bAvvia.disabled = true;
      uscite = [];
      disegnaSchede();
      valori = {};
      disegnaStato();
      sfoglia(0);
      vLavoro.textContent = 'Ricablaggio in corso…';
      racconto('Ricablaggio per **' + a.nome + '** (' + a.dettaglio + '): ' + diff.togli.length + ' cavi da staccare, ' +
        man.length + ' manopole da girare, ' + diff.metti.length + ' cavi da collegare.');
      let tempo = 0;
      const fermaTempo = ctx.ciclo((dt) => { tempo += dt; qui.textContent = formattaSecondi(tempo); });
      const totale = diff.togli.length + man.length + diff.metti.length;
      let fatti = 0;
      let giorno = 0;
      const avanza = () => {
        fatti += 1;
        const g = Math.min(GIORNI.length - 1, Math.floor(GIORNI.length * fatti / Math.max(1, totale)));
        if (g !== giorno) { giorno = g; sfoglia(g); }
      };
      try {
        for (const c of diff.togli) { if (!vivo()) return; await stacca(c); avanza(); }
        for (const m of man) { manopole[m.unita] = m.a; avanza(); }
        disegnaStato();
        if (!ctx.riduci) await ctx.attendi(ctx.DURATA.lenta);
        for (const c of diff.metti) { if (!vivo()) return; await collega(c); avanza(); }
      } finally {
        fermaTempo();
        caviAttivi = a.cavi.map((c) => Object.assign({}, c));
        manopole = Object.assign({}, a.manopole);
        valori = Object.assign({}, a.valori);
        allineaCavi();
        disegnaStato();
        bAvvia.disabled = false;
        vLavoro.textContent = riass.charAt(0).toUpperCase() + riass.slice(1) + '.';
      }
      if (ctx.riduci) qui.textContent = 'un clic';
      const quanto = ctx.riduci ? 'con un clic' : 'in ' + formattaSecondi(tempo);
      racconto('Fatto: ' + riass + ', ' + quanto + '. Su un ENIAC vero lo stesso lavoro richiedeva **giorni**, più le settimane di progetto sulla carta: per cambiare programma bisognava cambiare la macchina. Ora premi **▶ Avvia il calcolo**.');
      ctx.annuncia('Pannello ricablato per ' + a.nome + ': ' + riass + '.');
    }

    /* esecuzione: gli impulsi seguono i cavi */
    async function viaggia(p, durata) {
      const rec = caviEl[p.cavo];
      if (!rec || ctx.riduci || !rec.L) return;
      let nodo;
      if (p.numero != null) {
        const w = 14 + String(p.numero).length * 8;
        nodo = s('g', { class: P + '-numero' }, s('rect', { x: -w / 2, y: -10, width: w, height: 20, rx: 6 }), s('text', { x: 0, y: 4.5, 'text-anchor': 'middle' }, String(p.numero)));
      } else {
        nodo = s('circle', { class: P + '-impulso', r: 6 });
      }
      gMoto.append(nodo);
      try {
        await ctx.anima({
          durata: durata,
          easing: 'sharp',
          aggiorna(t) { const q = punto(rec, rec.L * t); nodo.setAttribute('transform', 'translate(' + q.x.toFixed(1) + ' ' + q.y.toFixed(1) + ')'); },
        });
      } finally {
        nodo.remove();
      }
    }

    function applica(p, nuova) {
      Object.assign(valori, p.valori);
      if (p.uscita != null) uscite.push(p.uscita);
      disegnaStato();
      if (p.uscita != null) disegnaSchede(nuova);
      if (nuova) lampo(unitaEl[p.unita].box);
    }

    async function calcola(vivo) {
      const pb = PROBLEMI[attuale];
      const passi = passiEniac(attuale);
      valori = Object.assign({}, pb.valori);
      uscite = [];
      disegnaStato();
      disegnaSchede();
      bAvvia.disabled = true;
      ctx.annuncia('Calcolo avviato: ' + pb.nome + '.');
      let i = 0;
      try {
        for (const p of passi) {
          if (!vivo()) return;
          const veloce = (p.giro || 1) > 1;
          racconto(p.testo);
          await viaggia(p, veloce ? 190 : 620);
          applica(p, true);
          i += 1;
          await ctx.attendi(ctx.riduci ? (veloce ? 150 : 900) : (veloce ? 60 : 420));
        }
      } finally {
        for (; i < passi.length; i++) applica(passi[i], false);
        disegnaSchede();
        bAvvia.disabled = false;
      }
      const vaiB = h('button', { type: 'button', class: 'pg-btn', onclick: () => api.vai('vn') }, 'Prova il programma memorizzato →');
      if (attuale === 'somma') {
        racconto('Risultato perforato: **5**. L\'ordine delle operazioni l\'hanno deciso i cavi: l\'impulso è passato dal programmatore principale all\'accumulatore 1 e poi al 2, e il numero ha seguito il cavo dei dati. Per un altro calcolo bisogna ricablare: prova **Quadrati**.', vaiB);
      } else {
        racconto('Schede perforate: **1, 4, 9, 16, 25**, mostrate al rallentatore: l\'ENIAC vero eseguiva 5.000 somme al secondo. Il programma era il cablaggio, e per cambiarlo servivano mani esperte e giorni di lavoro. L\'idea di von Neumann: mettere il programma in memoria, come i numeri.', vaiB);
      }
      ctx.annuncia('Calcolo finito. Risultati: ' + uscite.join(', ') + '.');
    }

    disegnaStato();
    disegnaSchede();
    caviAttivi.forEach(creaCavo);
    racconto('Il pannello è cablato per la **Somma** (2 + 3): i cavi ambra portano gli impulsi di programma, quelli verdi i numeri. Premi **▶ Avvia il calcolo**, poi scegli **Quadrati** e guarda quanto lavoro serve per cambiare problema.');

    return {
      el: el,
      misura: misura,
      mostra() { visibile = true; requestAnimationFrame(() => { misura(); allineaCavi(); }); },
      nascondi() { visibile = false; },
    };
  }

/*@@VN@@*/
