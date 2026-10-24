/*
 * Laboratorio "Il condensatore a piatti" (capitolo 6).
 * Due piatti affacciati, visti di lato in leggera prospettiva, che un commutatore a tre
 * vie collega alla pila, lascia isolati o scarica nel flash. Superficie, distanza e
 * dielettrico decidono la capacità C = ε0·εr·A/d; le cariche sui piatti (in numero
 * compresso), le linee del campo (più fitte se V/d cresce) e i dipoli del dielettrico
 * che si allineano mostrano che cosa succede dentro. Con l'interruttore aperto la carica
 * resta: allontanare i piatti alza la tensione. Distanze e lampo non sono in scala.
 */
(function () {
  'use strict';

  // εr tipici: carta circa 3,5, vetro da 4 a 10 (Pyrex circa 4,7), titanato di bario da 1200 in su.
  const MATERIALI = {
    aria: { nome: 'aria', del: 'dell\'aria', er: 1, testo: '1' },
    carta: { nome: 'carta', del: 'della carta', er: 3.5, testo: '3,5' },
    vetro: { nome: 'vetro', del: 'del vetro', er: 5, testo: '5' },
    ceramica: { nome: 'ceramica', del: 'della ceramica', er: 1200, testo: '1 200' },
  };
  const FLASH_J = 0.5 * 160e-6 * 300 * 300; // flash usa e getta: 160 µF a 300 V, circa 7 J
  const RIGIDITA_ARIA = 3e6; // V/m: l'aria regge circa 3 kV per millimetro
  const PX_CM = 8.5; // lato dei piatti
  const SP = 12; // spessore disegnato dei piatti
  const CX = 300;
  const CY = 196;
  const PERNO = { x: 300, y: 74 };
  const LEVA = 44;
  const ANGOLO = { carica: -57, isolato: 0, scarica: 57 };
  const POSIZIONI = ['carica', 'isolato', 'scarica'];
  const YA = 50;
  const YB = 330;
  const XP = 42;
  const XF = 540;
  const N_CARICHE = 18;
  const N_LINEE = 24;
  const N_DIPOLI = 28;
  const N_ELETTRONI = 12;

  const punta = (a) => ({ x: PERNO.x + LEVA * Math.sin(a * Math.PI / 180), y: PERNO.y - LEVA * Math.cos(a * Math.PI / 180) });
  const C1 = punta(ANGOLO.carica);
  const C3 = punta(ANGOLO.scarica);
  const f1 = (v) => v.toFixed(1);
  const P = (x, y) => f1(x) + ' ' + f1(y);
  const intero = (x) => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  // Distanza disegnata: esagerata e un po' compressa, perché 1 mm resti leggibile.
  const gapDa = (d) => 26 * Math.pow(d, 0.8);
  const dDaGap = (g) => Math.pow(Math.max(g, 0) / 26, 1.25);
  const caso = (k) => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  function geo(w, gap) {
    const dx = 0.17 * w;
    const dy = -0.1 * w;
    return { w: w, gap: gap, dx: dx, dy: dy, x0: CX - w / 2 - dx / 2, yT: CY - gap / 2, yB: CY + gap / 2 };
  }

  // Spezzata percorsa dagli elettroni: punto a una frazione u della lunghezza.
  function spezzata(punti) {
    const l = [0];
    for (let i = 1; i < punti.length; i++) l.push(l[i - 1] + Math.hypot(punti[i][0] - punti[i - 1][0], punti[i][1] - punti[i - 1][1]));
    return { p: punti, l: l, tot: l[l.length - 1] };
  }
  function punto(sp, u) {
    const d = u * sp.tot;
    let i = 1;
    while (i < sp.l.length - 1 && sp.l[i] < d) i++;
    const t = (d - sp.l[i - 1]) / ((sp.l[i] - sp.l[i - 1]) || 1);
    const a = sp.p[i - 1];
    const b = sp.p[i];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }

  EB.laboratorio('condensatore', {
    monta(ctx) {
      const { h, s, fmt, num } = ctx;
      const clamp = EB.clamp;
      const uid = EB.uid('con');
      const stato = { A: 400, d: 2, mat: 'aria', vb: 9, sw: 'isolato', q: 0 };

      const capacita = () => ctx.F.capacitaPiatti(stato.A * 1e-4, stato.d * 1e-3, MATERIALI[stato.mat].er);
      const tensione = () => (stato.q > 0 ? stato.q / capacita() : 0);
      const energia = () => (stato.q > 0 ? stato.q * stato.q / (2 * capacita()) : 0);
      const istantanea = () => ({ A: stato.A, d: stato.d, mat: stato.mat, vb: stato.vb, sw: stato.sw, q: stato.q, C: capacita(), V: tensione(), E: energia() });
      const cm2 = (a) => num(a, 0) + ' cm²';
      const mm = (d) => num(d, 1) + ' mm';
      const F = (v, u) => '**' + fmt(v, u) + '**';

      function fattore(k) {
        const r = k >= 1 ? k : 1 / k;
        const t = r >= 10 ? intero(r) : num(Math.round(r * 10) / 10, Math.abs(r - Math.round(r)) < 0.05 ? 0 : 1);
        return (k >= 1 ? '×' : '÷') + t;
      }
      function volte(r) {
        const x = Number(r.toPrecision(2));
        if (x >= 1e9) return (x === 1e9 ? 'un miliardo' : num(x / 1e9, (x / 1e9) % 1 ? 1 : 0) + ' miliardi') + ' di volte';
        if (x >= 1e6) return (x === 1e6 ? 'un milione' : num(x / 1e6, (x / 1e6) % 1 ? 1 : 0) + ' milioni') + ' di volte';
        return intero(x) + ' volte';
      }

      /* --- scena --- */
      const svg = s('svg', { viewBox: '0 0 600 362', class: 'con-svg', role: 'group' });
      svg.append(s('defs', null, s('radialGradient', { id: uid + '-alone' },
        s('stop', { offset: '0', class: 'con-alone-a' }), s('stop', { offset: '.42', class: 'con-alone-b' }), s('stop', { offset: '1', class: 'con-alone-c' }))));

      const tracciato = 'M' + XP + ' 125V' + YA + 'H' + f1(C1.x) + 'M' + f1(C3.x) + ' ' + YA + 'H' + XF + 'V140M' + XP + ' 256V' + YB + 'H' + XF + 'V264';
      const steli = [0, 1].map(() => [s('line', { class: 'con-filo' }), s('line', { class: 'con-filo-rame' })]);
      svg.append(s('g', { 'aria-hidden': 'true' },
        s('path', { d: tracciato, class: 'con-filo' }), s('path', { d: tracciato, class: 'con-filo-rame' }),
        steli[0], steli[1], s('circle', { cx: CX, cy: YB, r: 4.5, class: 'con-nodo' })));

      const livello = s('rect', { x: 20, y: 138, width: 44, height: 110, rx: 5, class: 'con-pila-livello' });
      const pilaTesto = s('text', { x: XP, y: 199, 'text-anchor': 'middle', class: 'con-pila-testo' });
      svg.append(s('g', { 'aria-hidden': 'true' },
        s('rect', { x: 34, y: 124, width: 16, height: 9, rx: 2, class: 'con-pila-polo' }),
        s('rect', { x: 14, y: 131, width: 56, height: 124, rx: 9, class: 'con-pila-corpo' }),
        livello, pilaTesto,
        s('text', { x: 80, y: 149, class: 'con-segno pos' }, '+'),
        s('text', { x: 80, y: 252, class: 'con-segno neg' }, '−'),
        s('text', { x: XP, y: 352, 'text-anchor': 'middle', class: 'con-et' }, 'pila')));

      const vetroLuce = s('rect', { x: 516, y: 150, width: 48, height: 104, rx: 6, class: 'con-flash-luce', opacity: 0 });
      const tuboLuce = s('rect', { x: 534, y: 158, width: 12, height: 88, rx: 6, class: 'con-flash-luce', opacity: 0 });
      const fresnel = [];
      for (let y = 164; y < 250; y += 14) fresnel.push(s('line', { x1: 519, x2: 561, y1: y, y2: y, class: 'con-fresnel' }));
      svg.append(s('g', { 'aria-hidden': 'true' },
        s('rect', { x: 508, y: 140, width: 64, height: 124, rx: 10, class: 'con-flash-corpo' }),
        s('rect', { x: 516, y: 150, width: 48, height: 104, rx: 6, class: 'con-flash-vetro' }),
        vetroLuce, fresnel,
        s('rect', { x: 534, y: 158, width: 12, height: 88, rx: 6, class: 'con-flash-tubo' }),
        s('rect', { x: 536, y: 153, width: 8, height: 8, rx: 1.5, class: 'con-flash-elettrodo' }),
        s('rect', { x: 536, y: 243, width: 8, height: 8, rx: 1.5, class: 'con-flash-elettrodo' }),
        tuboLuce,
        s('text', { x: XF, y: 352, 'text-anchor': 'middle', class: 'con-et' }, 'flash')));

      const contatti = POSIZIONI.map((k) => { const p = punta(ANGOLO[k]); return s('circle', { cx: f1(p.x), cy: f1(p.y), r: 5, class: 'con-contatto' }); });
      const leva = s('line', { x1: PERNO.x, y1: PERNO.y, class: 'con-leva' });
      svg.append(s('g', { 'aria-hidden': 'true' }, contatti,
        s('text', { x: 254, y: 40, 'text-anchor': 'end', class: 'con-et' }, 'carica'),
        s('text', { x: 300, y: 17, 'text-anchor': 'middle', class: 'con-et' }, 'isolato'),
        s('text', { x: 346, y: 40, class: 'con-et' }, 'scarica'),
        leva, s('circle', { cx: PERNO.x, cy: PERNO.y, r: 7, class: 'con-perno' })));

      // condensatore: dal fondo al davanti
      const sottoB = s('path', { class: 'con-piatto-sopra' });
      const dielF = s('rect', { class: 'con-diel-fronte' });
      const dielL = s('path', { class: 'con-diel-lato' });
      const dielR = s('path', { class: 'con-diel-riflesso' });
      const diel = s('g', { class: 'con-diel con-mat-aria' }, dielL, dielF, dielR);
      const gLinee = s('g', { class: 'con-linee' });
      const linee = [];
      for (let k = 0; k < N_LINEE; k++) { const p = s('path', { opacity: 0 }); gLinee.append(p); linee.push({ p: p, vis: false }); }
      const gDipoli = s('g', { class: 'con-dipoli' });
      const dipoli = [];
      for (let k = 0; k < N_DIPOLI; k++) {
        const g = s('g', { opacity: 0 },
          s('path', { d: 'M0-4H-5A4 4 0 0 0-5 4H0Z', class: 'con-dip-neg' }),
          s('path', { d: 'M0-4H5A4 4 0 0 1 5 4H0Z', class: 'con-dip-pos' }),
          s('path', { d: 'M-7.2 0H-3.6M3.6 0H7.2M5.4-1.8V1.8', class: 'con-dip-segni' }));
        gDipoli.append(g);
        dipoli.push({ g: g, base: caso(k) * 300 - 150, rig: 70 + 60 * caso(k + 40), ang: 0, vel: 0, x: 0, y: 0, o: 0, fermo: true, vis: false });
      }
      const fronteB = s('rect', { height: SP, class: 'con-piatto-fronte' });
      const latoB = s('path', { class: 'con-piatto-lato' });
      const fronteA = s('rect', { height: SP, class: 'con-piatto-fronte' });
      const sopraA = s('path', { class: 'con-piatto-sopra' });
      const latoA = s('path', { class: 'con-piatto-lato' });
      const gPos = s('g', { class: 'con-cariche pos' });
      const gNeg = s('g', { class: 'con-cariche neg' });
      const cariche = [];
      for (let k = 0; k < N_CARICHE; k++) {
        const p = s('g', { opacity: 0 }, s('circle', { r: 4.6 }), s('path', { d: 'M-2.5 0H2.5M0-2.5V2.5' }));
        const n = s('g', { opacity: 0 }, s('circle', { r: 4.6 }), s('path', { d: 'M-2.5 0H2.5' }));
        gPos.append(p);
        gNeg.append(n);
        cariche.push({ p: p, n: n, vis: false });
      }
      const scintillaP = s('path', { class: 'con-scintilla', opacity: 0 });
      const quotaL = s('path', { class: 'con-quota' });
      const quotaT = s('text', { 'text-anchor': 'end', class: 'con-val' });
      const tagMat = s('text', { x: 288, y: 306, 'text-anchor': 'end', class: 'con-et' });
      svg.append(s('g', { 'aria-hidden': 'true' }, sottoB, diel, gLinee, gDipoli, fronteB, latoB, fronteA, sopraA, latoA, gPos, gNeg, scintillaP, quotaL, quotaT, tagMat));

      const gEl = s('g', { 'aria-hidden': 'true' });
      const elettroni = [];
      for (let k = 0; k < N_ELETTRONI; k++) {
        const g = s('g', { class: 'con-elettrone', opacity: 0 }, s('circle', { r: 4.2 }), s('path', { d: 'M-2.2 0H2.2' }));
        gEl.append(g);
        elettroni.push(g);
      }
      const alone = s('circle', { cx: XF, cy: 202, r: 120, fill: 'url(#' + uid + '-alone)', opacity: 0, class: 'con-alone' });
      const lampoT = s('text', { x: 530, y: 304, 'text-anchor': 'end', class: 'con-lampo-t' });
      const presaR = s('rect', { rx: 8, class: 'con-presa' });
      const anello = s('rect', { rx: 8, class: 'con-anello' });
      const maniglia = s('g', { class: 'con-maniglia' }, presaR, anello);
      svg.append(gEl, s('g', { 'aria-hidden': 'true' }, alone, lampoT), maniglia);

      const legenda = h('div', { class: 'con-legenda' },
        h('span', { class: 'con-leg' }, h('span', { class: 'con-leg-q', 'aria-hidden': 'true' }, '+'), h('span', { class: 'con-leg-q neg', 'aria-hidden': 'true' }, '−'), 'Cariche sui piatti, in numero compresso'),
        h('span', { class: 'con-leg' }, h('span', { class: 'con-leg-campo', 'aria-hidden': 'true' }), 'Campo elettrico: linee più fitte, campo più intenso'),
        h('span', { class: 'con-leg' }, h('span', { class: 'con-leg-dip', 'aria-hidden': 'true' }), 'Dipoli del dielettrico'),
        h('span', { class: 'con-leg' }, 'Distanze e lampo non in scala'));
      ctx.scena.append(h('div', { class: 'con-scena' }, svg, legenda));

      /* --- letture e comandi --- */
      const lC = ctx.ui.lettura({ etichetta: 'Capacità', grandezza: 'q' });
      const lV = ctx.ui.lettura({ etichetta: 'Tensione tra i piatti', grandezza: 'v' });
      const lQ = ctx.ui.lettura({ etichetta: 'Carica', grandezza: 'q', nota: 'Q = C · V' });
      const lE = ctx.ui.lettura({ etichetta: 'Energia', grandezza: 'p', nota: 'E = ½ · C · V²' });
      const formula = ctx.ui.formulaViva();
      ctx.pannello.append(lC.el, lV.el, lQ.el, lE.el, h('div', { class: 'con-formula' }, EB.formula('C = ε₀ · εr · A / d'), formula.el));

      const curA = ctx.ui.cursore({ etichetta: 'Superficie dei piatti', min: 100, max: 900, passo: 50, valore: stato.A, formato: cm2, cambia: (v) => cambia('A', v) });
      const curD = ctx.ui.cursore({ etichetta: 'Distanza tra i piatti', min: 1, max: 8, passo: 0.5, valore: stato.d, formato: mm, cambia: (v) => cambia('d', v) });
      const curV = ctx.ui.cursore({ etichetta: 'Tensione della pila', min: 1, max: 12, passo: 0.5, valore: stato.vb, unita: 'V', grandezza: 'v', cambia: (v) => cambia('vb', v) });
      curA.el.classList.add('con-geom');
      curD.el.classList.add('con-geom');
      const scMat = ctx.ui.scelta({
        etichetta: 'Materiale tra i piatti (εr tipico)', valore: stato.mat,
        opzioni: Object.keys(MATERIALI).map((k) => ({ valore: k, etichetta: MATERIALI[k].nome[0].toUpperCase() + MATERIALI[k].nome.slice(1) })),
        cambia: (v) => cambia('mat', v),
      });
      const scInt = ctx.ui.scelta({
        etichetta: 'Interruttore', valore: stato.sw,
        opzioni: [{ valore: 'carica', etichetta: 'Carica' }, { valore: 'isolato', etichetta: 'Isolato' }, { valore: 'scarica', etichetta: 'Scarica nel flash' }],
        cambia: interruttore,
      });
      scMat.el.classList.add('con-mat');
      ctx.comandi.append(h('div', { class: 'con-comandi' }, curA.el, curD.el, curV.el, scMat.el, scInt.el));

      /* --- stato mostrato, che insegue i bersagli --- */
      const m = { w: 0, gap: 0, liv: 0, nq: 0, nl: 0, leva: 0, levaV: 0 };
      let B = null;
      let flusso = null;
      let lampo = null;
      let scintilla = null;
      let notato = istantanea();
      let ultimaNota = '';
      let timerNota = 0;
      let viste = new Map();

      function bersagli() {
        const w = PX_CM * Math.sqrt(stato.A);
        const carico = stato.q > 0;
        const campo = tensione() / (stato.d * 1e-3);
        const tq = clamp((Math.log10(stato.q || 1e-20) + 10.5) / 4.8, 0, 1);
        const passo = clamp(36 * Math.pow(campo / 1500, -0.45), 8, 56);
        return {
          w: w,
          gap: gapDa(stato.d),
          liv: carico ? 1 : 0,
          nq: carico ? clamp(Math.round(2 + 16 * tq), 1, Math.max(2, Math.floor(w / 11))) : m.nq,
          nl: carico ? clamp(Math.round(w / passo), 1, N_LINEE) : m.nl,
          al: carico && stato.mat !== 'aria' ? clamp(0.55 + 0.45 * Math.log10(campo / 100) / 2.3, 0.55, 1) : 0,
          leva: ANGOLO[stato.sw],
        };
      }

      function percorsi(tipo, g) {
        const yA = g.yT - SP + g.dy / 2;
        const yB = g.yB + SP / 2;
        if (tipo === 'carica') {
          return [spezzata([[CX, yA], [PERNO.x, PERNO.y], [C1.x, C1.y], [XP, YA], [XP, 125]]), spezzata([[XP, 256], [XP, YB], [CX, YB], [CX, yB]])];
        }
        return [spezzata([[CX, yB], [CX, YB], [XF, YB], [XF, 264]]), spezzata([[XF, 140], [XF, YA], [C3.x, C3.y], [PERNO.x, PERNO.y], [CX, yA]])];
      }

      function disegna(dt, subito) {
        const g = geo(m.w, m.gap);
        const { x0, w, dx, dy, yT, yB } = g;
        sottoB.setAttribute('d', 'M' + P(x0, yB) + 'h' + f1(w) + 'l' + P(dx, dy) + 'h' + f1(-w) + 'z');
        fronteB.setAttribute('x', f1(x0)); fronteB.setAttribute('y', f1(yB)); fronteB.setAttribute('width', f1(w));
        latoB.setAttribute('d', 'M' + P(x0 + w, yB) + 'l' + P(dx, dy) + 'v' + SP + 'l' + P(-dx, -dy) + 'z');
        fronteA.setAttribute('x', f1(x0)); fronteA.setAttribute('y', f1(yT - SP)); fronteA.setAttribute('width', f1(w));
        sopraA.setAttribute('d', 'M' + P(x0, yT - SP) + 'h' + f1(w) + 'l' + P(dx, dy) + 'h' + f1(-w) + 'z');
        latoA.setAttribute('d', 'M' + P(x0 + w, yT - SP) + 'l' + P(dx, dy) + 'v' + SP + 'l' + P(-dx, -dy) + 'z');
        dielF.setAttribute('x', f1(x0)); dielF.setAttribute('y', f1(yT)); dielF.setAttribute('width', f1(w)); dielF.setAttribute('height', f1(yB - yT));
        dielL.setAttribute('d', 'M' + P(x0 + w, yT) + 'l' + P(dx, dy) + 'V' + f1(yB + dy) + 'l' + P(-dx, -dy) + 'z');
        dielR.setAttribute('d', 'M' + P(x0 + w * 0.1, yB - 4) + 'L' + P(x0 + w * 0.1 + Math.min(40, (yB - yT) * 0.6), yT + 4));
        const ySopra = yT - SP + dy / 2;
        steli[0].forEach((l) => { l.setAttribute('x1', CX); l.setAttribute('y1', PERNO.y); l.setAttribute('x2', CX); l.setAttribute('y2', f1(ySopra)); });
        steli[1].forEach((l) => { l.setAttribute('x1', CX); l.setAttribute('y1', YB); l.setAttribute('x2', CX); l.setAttribute('y2', f1(yB + SP / 2)); });
        const xq = x0 - 13;
        quotaL.setAttribute('d', 'M' + P(xq, yT) + 'V' + f1(yB) + 'M' + P(xq - 4, yT) + 'h8M' + P(xq - 4, yB) + 'h8');
        quotaT.setAttribute('x', f1(xq - 8));
        quotaT.setAttribute('y', f1(CY + 4));
        const alto = Math.max(46, SP - dy + 20);
        [presaR, anello].forEach((r) => {
          r.setAttribute('x', f1(x0 - 8)); r.setAttribute('y', f1(yT - SP / 2 + dy / 2 - alto / 2));
          r.setAttribute('width', f1(w + dx + 16)); r.setAttribute('height', f1(alto));
        });
        const pl = punta(m.leva);
        leva.setAttribute('x2', f1(pl.x));
        leva.setAttribute('y2', f1(pl.y));

        // linee del campo, a metà profondità
        linee.forEach((L, k) => {
          const a = clamp(m.nl - k, 0, 1) * m.liv;
          if (a < 0.01) { if (L.vis) { L.p.setAttribute('opacity', 0); L.vis = false; } return; }
          L.vis = true;
          const x = x0 + w * (k + 0.5) / Math.max(m.nl, k + 1) + dx * 0.35;
          const y1 = yT + dy * 0.35;
          const y2 = yB + dy * 0.35;
          const ym = (y1 + y2) / 2 + 3;
          L.p.setAttribute('d', 'M' + P(x, y1) + 'V' + f1(y2) + 'M' + P(x - 3, ym - 4) + 'L' + P(x, ym) + 'L' + P(x + 3, ym - 4));
          L.p.setAttribute('opacity', a.toFixed(3));
        });

        // cariche: compaiono da sinistra mentre il condensatore si carica
        cariche.forEach((c, k) => {
          const a = clamp(m.liv * m.nq - k, 0, 1);
          if (a < 0.01) { if (c.vis) { c.p.setAttribute('opacity', 0); c.n.setAttribute('opacity', 0); c.vis = false; } return; }
          c.vis = true;
          const x = f1(x0 + w * (k + 0.5) / Math.max(m.nq, k + 1));
          c.p.setAttribute('transform', 'translate(' + x + ' ' + f1(yT - SP / 2) + ')');
          c.n.setAttribute('transform', 'translate(' + x + ' ' + f1(yB + SP / 2) + ')');
          c.p.setAttribute('opacity', a.toFixed(3));
          c.n.setAttribute('opacity', a.toFixed(3));
        });

        // dipoli: posizione su una griglia, angolo con una molla verso l'allineamento
        const cols = clamp(Math.round(w / 30), 2, 7);
        const rows = clamp(Math.round(m.gap / 34), 1, 4);
        const quanti = stato.mat === 'aria' ? 0 : cols * rows;
        const scala = clamp((m.gap - 2) / 24, 0.5, 1);
        const kp = subito ? 1 : 1 - Math.exp(-dt * 10);
        const ko = subito ? 1 : 1 - Math.exp(-dt * 6);
        dipoli.forEach((D, i) => {
          const tx = x0 + w * ((i % cols) + 0.5) / cols + dx * 0.15;
          const ty = yT + m.gap * (Math.floor(i / cols) + 0.5) / rows + dy * 0.15;
          const to = i < quanti ? 1 : 0;
          const ta = D.base + (90 - D.base) * B.al;
          if (D.o < 0.02 || subito) { D.x = tx; D.y = ty; }
          else { D.x += (tx - D.x) * kp; D.y += (ty - D.y) * kp; }
          D.o += (to - D.o) * ko;
          if (subito) { D.ang = ta; D.vel = 0; } else {
            const n = dt > 0.02 ? 2 : 1;
            for (let j = 0; j < n; j++) {
              D.vel += (-D.rig * (D.ang - ta) - 1.1 * Math.sqrt(D.rig) * D.vel) * dt / n;
              D.ang += D.vel * dt / n;
            }
          }
          D.fermo = Math.abs(D.ang - ta) < 0.1 && Math.abs(D.vel) < 0.1 && Math.abs(D.o - to) < 0.005 && Math.abs(D.x - tx) < 0.05 && Math.abs(D.y - ty) < 0.05;
          if (D.o < 0.01 && to === 0) { if (D.vis) { D.g.setAttribute('opacity', 0); D.vis = false; } D.o = 0; return; }
          D.vis = true;
          D.g.setAttribute('transform', 'translate(' + P(D.x, D.y) + ') rotate(' + D.ang.toFixed(1) + ') scale(' + scala.toFixed(3) + ')');
          D.g.setAttribute('opacity', D.o.toFixed(3));
        });

        // elettroni durante la carica e la scarica
        if (flusso) {
          flusso.t += dt;
          const vie = percorsi(flusso.tipo, g);
          const alfa = Math.min(1, flusso.t / 0.12) * clamp((flusso.T - flusso.t) / 0.25, 0, 1);
          elettroni.forEach((e, j) => {
            let u = (Math.floor(j / 2) / (N_ELETTRONI / 2) + flusso.t * flusso.vel) % 1;
            if (flusso.inverso) u = 1 - u;
            const pt = punto(vie[j % 2], u);
            e.setAttribute('transform', 'translate(' + P(pt[0], pt[1]) + ')');
            e.setAttribute('opacity', (alfa * Math.min(1, Math.sin(Math.PI * u) * 3)).toFixed(3));
          });
          if (flusso.t >= flusso.T) { flusso = null; elettroni.forEach((e) => e.setAttribute('opacity', 0)); }
        }
        if (lampo) {
          lampo.t += dt;
          const t = lampo.t;
          const luce = lampo.b * (t < 0.06 ? t / 0.06 : Math.exp(-(t - 0.06) * 4));
          alone.setAttribute('opacity', (0.9 * luce).toFixed(3));
          tuboLuce.setAttribute('opacity', luce.toFixed(3));
          vetroLuce.setAttribute('opacity', (0.35 * luce).toFixed(3));
          if (t > 1.8) { lampo = null; [alone, tuboLuce, vetroLuce].forEach((x) => x.setAttribute('opacity', 0)); }
        }
        if (scintilla) {
          scintilla.t += dt;
          scintillaP.setAttribute('opacity', Math.max(0, Math.min(1, scintilla.t / 0.04) * Math.exp(-scintilla.t * 6)).toFixed(3));
          if (scintilla.t > 0.8) { scintilla = null; scintillaP.setAttribute('opacity', 0); }
        }
      }

      function fermo() {
        if (flusso || lampo || scintilla) return false;
        if (Math.abs(B.w - m.w) > 0.05 || Math.abs(B.gap - m.gap) > 0.05 || Math.abs(B.liv - m.liv) > 0.001) return false;
        if (Math.abs(B.nq - m.nq) > 0.01 || Math.abs(B.nl - m.nl) > 0.01) return false;
        if (Math.abs(B.leva - m.leva) > 0.05 || Math.abs(m.levaV) > 0.05) return false;
        return dipoli.every((D) => D.fermo);
      }

      const ciclo = ctx.ciclo((dt) => {
        const k = 1 - Math.exp(-dt * 9);
        const k6 = 1 - Math.exp(-dt * 6);
        m.w += (B.w - m.w) * k;
        m.gap += (B.gap - m.gap) * k;
        m.liv += (B.liv - m.liv) * (1 - Math.exp(-dt * (B.liv > m.liv ? 3.4 : 14)));
        m.nq += (B.nq - m.nq) * k6;
        m.nl += (B.nl - m.nl) * k6;
        const n = dt > 0.02 ? 2 : 1;
        for (let j = 0; j < n; j++) {
          m.levaV += (-260 * (m.leva - B.leva) - 22 * m.levaV) * dt / n;
          m.leva += m.levaV * dt / n;
        }
        disegna(dt, false);
        if (fermo()) {
          assesta();
          ciclo.ferma();
        }
      });

      function assesta() {
        Object.assign(m, { w: B.w, gap: B.gap, liv: B.liv, nq: B.nq, nl: B.nl, leva: B.leva, levaV: 0 });
        disegna(0, true);
      }

      /* --- testo, sfide, aggiornamenti --- */
      function descrizione() {
        const mat = MATERIALI[stato.mat];
        return 'Condensatore a piatti piani visto di lato: due piatti di ' + cm2(stato.A) + ' distanti ' + mm(stato.d) + ', con ' + mat.nome + ' in mezzo (εr circa ' + mat.testo + '). ' +
          'A sinistra la pila da ' + fmt(stato.vb, 'V') + ', a destra il flash; il commutatore è su «' + { carica: 'carica', isolato: 'isolato', scarica: 'scarica nel flash' }[stato.sw] + '». ' +
          (stato.q > 0 ? 'Il condensatore è carico: ' + fmt(stato.q, 'C') + ' su ogni piatto, ' + fmt(tensione(), 'V') + ' tra i piatti.' : 'Il condensatore è scarico.');
      }

      function aggiorna() {
        const C = capacita();
        const mat = MATERIALI[stato.mat];
        lC.imposta(fmt(C, 'F'));
        lV.imposta(fmt(tensione(), 'V'));
        lQ.imposta(fmt(stato.q, 'C'));
        lE.imposta(fmt(energia(), 'J'));
        formula.imposta(['= 8,85 pF/m · ' + mat.testo + ' · ' + num(stato.A * 1e-4, 3) + ' m² / ' + num(stato.d * 1e-3, 4) + ' m\n= ', [fmt(C, 'F'), 'q']]);
        livello.style.transform = 'scaleY(' + (stato.vb / 12).toFixed(3) + ')';
        pilaTesto.textContent = fmt(stato.vb, 'V');
        pilaTesto.setAttribute('class', 'con-pila-testo' + (stato.vb / 12 >= 0.6 ? '' : ' fuori'));
        tagMat.textContent = mat.nome + ' · εr ≈ ' + mat.testo;
        quotaT.textContent = mm(stato.d);
        diel.setAttribute('class', 'con-diel con-mat-' + stato.mat);
        contatti.forEach((c, i) => c.classList.toggle('attivo', POSIZIONI[i] === stato.sw));
        maniglia.setAttribute('aria-label', 'Piatto superiore a ' + mm(stato.d) + ' dall\'altro: frecce su e giù per allontanarlo o avvicinarlo');
        svg.setAttribute('aria-label', descrizione());
        if (stato.mat === 'vetro' && stato.sw === 'carica' && stato.q > 0) ctx.completa('dielettrico');
        B = bersagli();
        if (ctx.ridotto) assesta();
        else ciclo.avvia();
      }

      function dici(t) {
        if (!t || t === ultimaNota) return;
        ultimaNota = t;
        ctx.nota(t);
      }

      function registraC(controlla) {
        const c = capacita();
        if (controlla) {
          for (const c0 of viste.values()) {
            if (Math.abs(c / (2 * c0) - 1) <= 0.03) { ctx.completa('doppia-capacita'); break; }
          }
        }
        viste.set(stato.A + '|' + stato.d, c);
      }

      function avviaFlusso(tipo, inverso) {
        if (ctx.ridotto) return;
        if (flusso && flusso.tipo === tipo && flusso.inverso === inverso) { flusso.T = Math.max(flusso.T, flusso.t + 0.7); return; }
        flusso = { tipo: tipo, inverso: inverso, t: 0, T: tipo === 'carica' ? 0.95 : 0.55, vel: tipo === 'carica' ? 1.1 : 2.2 };
      }

      // Isolato e senza dielettrico: oltre circa 3 kV/mm l'aria cede e scocca una scintilla.
      function scintillaSeServe() {
        if (stato.sw !== 'isolato' || stato.q <= 0 || stato.mat !== 'aria') return false;
        const v = tensione();
        if (v / (stato.d * 1e-3) <= RIGIDITA_ARIA) return false;
        stato.q = 0;
        lampoT.textContent = '';
        if (!ctx.ridotto) {
          const g = geo(m.w, m.gap);
          const x = g.x0 + g.w * 0.22 + g.dx * 0.3;
          const y1 = g.yT + g.dy * 0.3;
          const y2 = g.yB + g.dy * 0.3;
          let d = 'M' + P(x, y1);
          for (let i = 1; i <= 6; i++) d += 'L' + P(x + (i < 6 ? (i % 2 ? 6 : -5) : 0), y1 + (y2 - y1) * i / 6);
          scintillaP.setAttribute('d', d);
          scintilla = { t: 0 };
        }
        clearTimeout(timerNota);
        notato = istantanea();
        dici('Con la stessa carica e una capacità così piccola, la tensione salirebbe a ' + F(v, 'V') + ': troppa per ' + mm(stato.d) + ' d\'aria, che regge circa 3 kV per millimetro. Scocca una **scintilla** tra i piatti e il condensatore si scarica.');
        return true;
      }

      function cambia(chiave, v) {
        const prima = stato.q;
        stato[chiave] = v;
        if (stato.sw === 'carica') stato.q = capacita() * stato.vb;
        if (chiave === 'mat') { viste = new Map(); registraC(false); } else if (chiave !== 'vb') registraC(true);
        if (stato.sw === 'carica' && Math.abs(stato.q - prima) > prima * 0.002) avviaFlusso('carica', stato.q < prima);
        if (!scintillaSeServe()) {
          clearTimeout(timerNota);
          timerNota = setTimeout(scriviNota, 350);
        }
        aggiorna();
      }

      function interruttore(sw) {
        const p = istantanea();
        stato.sw = sw;
        if (sw === 'carica') stato.q = capacita() * stato.vb;
        else if (sw === 'scarica') stato.q = 0;
        const n = istantanea();
        let t;
        if (sw === 'scarica') {
          if (p.q > 0) {
            avviaFlusso('scarica', false);
            lampoT.textContent = 'lampo: ' + fmt(p.E, 'J');
            if (!ctx.ridotto) lampo = { t: 0, b: 0.25 + 0.75 * clamp((Math.log10(p.E) + 11.5) / 7.5, 0, 1) };
            ctx.completa('lampo');
            t = 'Scarica nel flash: gli elettroni tornano dal piatto in basso a quello in alto passando per il tubo, e i ' + F(p.E, 'J') + ' immagazzinati diventano luce e calore. Il condensatore del flash di una fotocamera usa e getta (circa 160 µF a 300 V) ne accumula circa **7 J**: ' + volte(FLASH_J / p.E) + ' di più.';
          } else {
            t = 'Il condensatore è scarico: nel flash non arriva nulla. Prima caricalo con la pila.';
          }
        } else if (sw === 'carica') {
          if (p.q === 0) {
            t = 'Interruttore su **Carica**: la pila toglie elettroni al piatto in alto e li spinge su quello in basso, finché tra i piatti ci sono ' + F(n.vb, 'V') + '. Ogni piatto ha ora una carica di ' + F(n.q, 'C') + ' (`Q = C · V`, cioè ' + fmt(n.C, 'F') + ' × ' + fmt(n.vb, 'V') + '): positiva in alto, negativa in basso.';
            const mat = MATERIALI[n.mat];
            if (n.mat !== 'aria') t += ' Con l\'aria al posto ' + mat.del + ' sarebbe ' + mat.testo + ' volte più piccola, ' + fmt(n.q / mat.er, 'C') + ': il dielettrico fa entrare più carica a parità di tensione.';
          } else if (Math.abs(n.q - p.q) > p.q * 0.002) {
            t = 'Interruttore su **Carica**: la pila riporta la tensione tra i piatti da ' + fmt(p.V, 'V') + ' a ' + F(n.vb, 'V') + ' e la carica passa da ' + fmt(p.q, 'C') + ' a ' + F(n.q, 'C') + '.';
          } else {
            t = 'Interruttore su **Carica**: il condensatore era già a ' + fmt(n.vb, 'V') + ', quindi la carica resta ' + F(n.q, 'C') + '.';
          }
          if (Math.abs(n.q - p.q) > p.q * 0.002) avviaFlusso('carica', n.q < p.q);
          lampoT.textContent = '';
        } else {
          t = p.q > 0
            ? 'Interruttore su **Isolato**: la carica, ' + F(p.q, 'C') + ', resta sui piatti anche senza pila, e con lei l\'energia, ' + F(p.E, 'J') + '. Prova ad allontanare i piatti: la carica non può cambiare, la tensione sì.'
            : 'Interruttore su **Isolato**: il condensatore è scarico e resta così. Per caricarlo porta l\'interruttore su **Carica**.';
        }
        clearTimeout(timerNota);
        notato = istantanea();
        dici(t);
        aggiorna();
        if (p.q === 0 && n.q > 0) { m.nq = B.nq; m.nl = B.nl; }
      }

      function notaGeometria(p, n) {
        const cosa = n.d === p.d ? 'Superficie da ' + cm2(p.A) + ' a ' + cm2(n.A)
          : n.A === p.A ? 'Distanza da ' + mm(p.d) + ' a ' + mm(n.d)
            : 'Superficie ' + cm2(n.A) + ' e distanza ' + mm(n.d);
        const c = ': la capacità passa da ' + fmt(p.C, 'F') + ' a ' + F(n.C, 'F') + ' (' + fattore(n.C / p.C) + ')';
        if (n.sw === 'carica') {
          return cosa + c + '. La pila, sempre a ' + fmt(n.vb, 'V') + ', adegua la carica: ora è ' + F(n.q, 'C') + '.' +
            (n.d < p.d ? ' Con i piatti più vicini il campo tra loro è più intenso: le linee si infittiscono.' : n.d > p.d ? ' Con i piatti più lontani il campo si indebolisce.' : '');
        }
        if (n.q > 0) {
          return cosa + ', ma con l\'interruttore aperto la carica resta ' + F(n.q, 'C') + '. La capacità va da ' + fmt(p.C, 'F') + ' a ' + fmt(n.C, 'F') +
            ', quindi la tensione passa da ' + fmt(p.V, 'V') + ' a ' + F(n.V, 'V') + ' (`V = Q / C`) e l\'energia da ' + fmt(p.E, 'J') + ' a ' + F(n.E, 'J') + '.' +
            (n.d > p.d && n.A === p.A ? ' L\'energia in più l\'hai data tu, allontanando piatti che si attraggono; il campo invece resta uguale.' : n.E > p.E ? ' L\'energia in più viene dal lavoro che hai fatto.' : '');
        }
        return cosa + c + '. Il condensatore però è scarico: porta l\'interruttore su **Carica** per riempirlo.';
      }

      function notaMateriale(p, n) {
        const mat = MATERIALI[n.mat];
        const tag = '**' + mat.nome[0].toUpperCase() + mat.nome.slice(1) + '** tra i piatti (εr ≈ ' + mat.testo + (n.mat === 'aria' ? '' : ', valore tipico') + ')';
        if (n.sw === 'carica') {
          return tag + ': la capacità passa da ' + fmt(p.C, 'F') + ' a ' + F(n.C, 'F') + ' (' + fattore(n.C / p.C) + ') e, con la stessa pila da ' + fmt(n.vb, 'V') +
            ', la carica da ' + fmt(p.q, 'C') + ' a ' + F(n.q, 'C') + '.' +
            (n.mat === 'aria' ? '' : ' A parità di tensione è ' + (mat.er >= 10 ? intero(mat.er) : num(mat.er, mat.er % 1 ? 1 : 0)) + ' volte la carica che ci sarebbe con l\'aria: le molecole ' + mat.del + ' si orientano nel campo e ne compensano una parte, così la pila riesce a spingere altra carica sui piatti.');
        }
        if (n.q > 0) {
          return tag + ': con l\'interruttore aperto la carica resta ' + F(n.q, 'C') + ', ma la capacità passa da ' + fmt(p.C, 'F') + ' a ' + fmt(n.C, 'F') +
            ', quindi la tensione va da ' + fmt(p.V, 'V') + ' a ' + F(n.V, 'V') + ' (`V = Q / C`).' + (n.C > p.C ? ' Il dielettrico indebolisce il campo tra i piatti.' : ' Senza quel dielettrico il campo torna più intenso.');
        }
        return tag + ': la capacità passa da ' + fmt(p.C, 'F') + ' a ' + F(n.C, 'F') + ' (' + fattore(n.C / p.C) + '). Carica il condensatore per vedere quanta carica in più accumula.';
      }

      function scriviNota() {
        const p = notato;
        const n = istantanea();
        let t = null;
        if (n.mat !== p.mat) t = notaMateriale(p, n);
        else if (n.A !== p.A || n.d !== p.d) t = notaGeometria(p, n);
        else if (n.vb !== p.vb) {
          t = n.sw === 'carica'
            ? 'Pila da ' + fmt(p.vb, 'V') + ' a ' + F(n.vb, 'V') + ': la carica cambia nella stessa proporzione, da ' + fmt(p.q, 'C') + ' a ' + F(n.q, 'C') + ', mentre l\'energia segue il quadrato della tensione: da ' + fmt(p.E, 'J') + ' a ' + F(n.E, 'J') + ' (' + fattore(n.E / p.E) + ').'
            : 'La pila ora dà ' + F(n.vb, 'V') + ', ma è scollegata: il condensatore non se ne accorge finché non porti l\'interruttore su **Carica**.';
        }
        notato = n;
        dici(t);
      }

      /* --- trascinamento del piatto superiore --- */
      let presaDy = null;
      EB.trascina(maniglia, {
        svg: svg,
        etichetta: 'Piatto superiore',
        muovi(x, y) {
          const g = geo(m.w, m.gap);
          if (presaDy === null) presaDy = g.yT - y;
          const d = clamp(Math.round(dDaGap(2 * (CY - y - presaDy)) * 2) / 2, 1, 8);
          if (d !== stato.d) curD.imposta(d);
        },
        sposta(dx, dy) {
          if (!dy) return;
          const d = clamp(stato.d + (dy < 0 ? 1 : -1) * (Math.abs(dy) > 6 ? 2 : 0.5), 1, 8);
          if (d !== stato.d) curD.imposta(d);
        },
        fine() { presaDy = null; },
      });

      ctx.pulizia(() => clearTimeout(timerNota));
      registraC(false);
      aggiorna();
      assesta();
      dici('Il condensatore è **scarico**: due piatti di metallo affacciati, con l\'aria in mezzo. Porta l\'interruttore su **Carica** per collegarlo alla pila; puoi anche trascinare il piatto in alto per cambiare la distanza.');
    },
  });
})();
