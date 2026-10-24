/*
 * Illustrazioni del capitolo 3 · Programmare con le mani.
 *   eniac   la sala dell'ENIAC in prospettiva: i pannelli disposti a U, i cavi di programma,
 *           una tavola delle funzioni su ruote, due programmatrici (sagome) e le lampadine al neon
 *   falena  la pagina del registro dell'Harvard Mark II (9 settembre 1947) con la falena fissata
 *           con il nastro adesivo, e il relè 70 del pannello F che non riesce a chiudersi
 * Colori dalla tavolozza --fig-* e --cap, così il disegno segue il tema chiaro o scuro.
 */
(function (root) {
  'use strict';
  if (!root.ProgStoria) return;

  const n2 = (v) => Math.round(v * 100) / 100;
  const tratto = (pts, chiudi) => 'M' + pts.map((p) => p[0] + ' ' + p[1]).join('L') + (chiudi ? 'Z' : '');

  function griglia(cls) {
    const d = [];
    for (let x = 40; x < 800; x += 40) d.push('M' + x + ' 0V500');
    for (let y = 40; y < 500; y += 40) d.push('M0 ' + y + 'H800');
    return '<path class="' + cls + '" d="' + d.join('') + '"/>';
  }

  // numeri pseudo-casuali ripetibili: il disegno è sempre lo stesso
  function generatore(seme) {
    let s = seme;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  /* ===================== eniac ===================== */

  const EN = 'fig-eniac';
  // prospettiva centrale: occhio a 1,55 m da terra, in fondo alla U, guardando verso il lato chiuso
  const F = 330, CX = 400, CY = 262;
  const BOT = -1.55, TOP = 2.45 - 1.55;     // pannelli alti circa 2,4 m (8 piedi)
  const XF = 2.4, XM = 3.0;                 // faccia dei pannelli e muro (armadi profondi 60 cm)
  const Z0 = 3.0, ZF = 9.0, ZM = 9.6;       // inizio dei bracci della U, faccia e muro di fondo
  const LP = 0.6;                           // larghezza di un pannello (2 piedi)
  const SOFFITTO = 1.85;
  const P = (x, y, z) => [n2(CX + F * x / z), n2(CY - F * y / z)];

  const cssEniac = `
    .${EN}-sfondo { fill: var(--fig-paper); }
    .${EN}-griglia { fill: none; stroke: var(--fig-line); stroke-width: 1; opacity: .12; }
    .${EN}-pavimento { fill: var(--fig-1); }
    .${EN}-piastrelle { fill: none; stroke: var(--fig-line); stroke-width: 1; opacity: .45; }
    .${EN}-stanza { fill: none; stroke: var(--fig-line); stroke-width: 1.5; }
    .${EN}-pannello { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 1.5; stroke-linejoin: round; }
    .${EN}-fianco { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.5; stroke-linejoin: round; }
    .${EN}-cornice { fill: none; stroke: var(--fig-ink); stroke-width: .8; opacity: .55; }
    .${EN}-manopola { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: .7; }
    .${EN}-presa { fill: var(--fig-ink); }
    .${EN}-neon-spento { fill: var(--fig-ink); opacity: .45; }
    .${EN}-neon { fill: var(--fig-warm); }
    .${EN}-canalina { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1; }
    .${EN}-cavo { fill: none; stroke: var(--cap); stroke-linecap: round; stroke-linejoin: round; }
    .${EN}-cavo-2 { fill: none; stroke: var(--fig-ink); stroke-linecap: round; stroke-linejoin: round; }
    .${EN}-tavola { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 1.5; stroke-linejoin: round; }
    .${EN}-tavola-f { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.5; stroke-linejoin: round; }
    .${EN}-ruota { fill: var(--fig-ink); }
    .${EN}-sagoma { fill: var(--fig-ink); }
    .${EN}-braccio { fill: none; stroke: var(--fig-ink); stroke-width: 3.6; stroke-linecap: round; stroke-linejoin: round; }
    .${EN}-spina { fill: var(--cap); }
    .${EN}-quota { fill: none; stroke: var(--fig-ink); stroke-width: 1.4; }
    .${EN}-guida { fill: none; stroke: var(--cap); stroke-width: 1.5; }
    .${EN}-punto { fill: var(--cap); }
    .${EN}-t { font: 700 19px var(--font, sans-serif); fill: var(--fig-ink); }
    .${EN}-nota { font: 600 16px var(--font, sans-serif); fill: var(--fig-ink); }
    .${EN}-mappa { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${EN}-mappa-u { fill: none; stroke: var(--fig-metal-2); stroke-width: 7; stroke-linejoin: round; }
    .${EN}-mappa-p { fill: none; stroke: var(--fig-paper); stroke-width: 1.2; }
    .${EN}-occhio { fill: var(--cap); }
    .${EN}-cono { fill: var(--cap); opacity: .14; }
    .${EN}-mappa-t { font: 700 15px var(--font, sans-serif); fill: var(--fig-ink); text-anchor: middle; }
    .${EN}-lampeggia { animation: ${EN}-neon 2s linear infinite; }
    @keyframes ${EN}-neon { 0%, 46% { opacity: 1; } 52%, 94% { opacity: .1; } 100% { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      .${EN}-lampeggia { animation: none; }
    }
  `;

  // un punto sulla faccia di un pannello: u lungo il pannello, v in altezza (0 in basso, 1 in alto)
  function suPannello(pan, u, v) {
    const y = BOT + v * (TOP - BOT);
    if (pan.lato === 'fondo') return [pan.a + u * (pan.b - pan.a), y, ZF];
    return [pan.lato === 'sx' ? -XF : XF, y, pan.a + u * (pan.b - pan.a)];
  }

  // un cerchietto disegnato su un pannello: sulle pareti laterali diventa un'ellisse schiacciata
  function tondo(p3, r, cls, extra) {
    const pt = P(p3[0], p3[1], p3[2]);
    const ry = Math.max(0.8, F * r / p3[2]);
    const rx = p3[2] === ZF ? ry : Math.max(0.6, ry * Math.abs(p3[0]) / p3[2]);
    return '<ellipse class="' + cls + '" cx="' + pt[0] + '" cy="' + pt[1] + '" rx="' + n2(rx) + '" ry="' + n2(ry) + '"' + (extra || '') + '/>';
  }

  // un cavo che pende fra due punti (in metri): la curva si calcola nello spazio e poi si proietta
  function cavo(p0, p1, cala, cls, larg) {
    const pts = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      pts.push(P(p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t - cala * 4 * t * (1 - t), p0[2] + (p1[2] - p0[2]) * t));
    }
    return '<path class="' + cls + '" d="' + tratto(pts) + '" style="stroke-width:' + larg + '"/>';
  }

  function pannello(pan, caso, neon) {
    const c = (s) => EN + '-' + s;
    const q = (u, v) => { const p = suPannello(pan, u, v); return P(p[0], p[1], p[2]); };
    let s = '<path class="' + c('pannello') + '" d="' + tratto([q(0, 1), q(1, 1), q(1, 0), q(0, 0)], true) + '"/>' +
      '<path class="' + c('cornice') + '" d="' + tratto([q(.08, .97), q(.92, .97), q(.92, .04), q(.08, .04)], true) + '"/>';
    if (pan.tipo === 'acc') {
      // accumulatore: in alto le lampadine al neon che mostrano le cifre
      [.84, .89, .94].forEach((v) => [.2, .35, .5, .65, .8].forEach((u) => {
        const p = suPannello(pan, u, v);
        const r = caso();
        if (r < 0.34) {
          const lamp = neon.length < 22 && r < 0.2;
          if (lamp) neon.push(1);
          s += tondo(p, 0.028, c('neon') + (lamp ? ' ' + c('lampeggia') : ''),
            lamp ? ' style="animation-duration:' + n2(1.4 + caso() * 1.8) + 's;animation-delay:-' + n2(caso() * 3) + 's"' : '');
        } else s += tondo(p, 0.022, c('neon-spento'));
      }));
      [.62, .7].forEach((v) => [.28, .5, .72].forEach((u) => { s += tondo(suPannello(pan, u, v), 0.045, c('manopola')); }));
    } else {
      // programmatore principale, moltiplicatore…: file di commutatori rotativi
      [.5, .58, .66, .74, .82].forEach((v) => [.28, .5, .72].forEach((u) => { s += tondo(suPannello(pan, u, v), 0.04, c('manopola')); }));
    }
    [.2, .4, .6, .8].forEach((u) => { s += tondo(suPannello(pan, u, .4), 0.024, c('presa')); });
    return s;
  }

  // sagome stilizzate (piedi nell'origine, alte 100 unità), senza volti
  const SAGOMA_PROFILO = // di profilo, rivolta a sinistra, con il braccio teso verso il pannello
    '<circle cx="-1" cy="-91" r="6.6"/><circle cx="5" cy="-93" r="4.4"/>' +
    '<path d="M-2.8 -86H2L2.2 -80H-2.4Z"/>' +
    '<path d="M-6.6 -81Q-1 -84 5.6 -81L6.6 -70Q5.8 -62 4.6 -56H-4.8Q-6.4 -63 -7.6 -71Z"/>' +
    '<path d="M-5 -57H5L8.6 -29H-8.2Z"/>' +
    '<path d="M-4.2 -29.5H-1L-1.4 -3.2H-3.6ZM1 -29.5H4.2L3.8 -3.2H1.4Z"/>' +
    '<path d="M-8 0H-1L-1.2 -3.6H-3.8Q-8 -2.6 -8 0ZM-3 0H3.8L3.6 -3.6H1.2Q-3 -2.6 -3 0Z"/>';
  const SAGOMA_SCHIENA = // di spalle, con un braccio alzato
    '<circle cx="0" cy="-91" r="6.8"/><circle cx="0" cy="-97.4" r="4.2"/>' +
    '<path d="M-2.2 -85H2.2V-80H-2.2Z"/>' +
    '<path d="M-7.2 -81Q0 -84 7.2 -81L6.2 -56H-6.2Z"/>' +
    '<path d="M-6.2 -57H6.2L9.4 -29H-9.4Z"/>' +
    '<path d="M-5.2 -29.5H-1.6L-2 -3.2H-4.6ZM1.6 -29.5H5.2L4.6 -3.2H2Z"/>' +
    '<path d="M-5.6 0H-1.4L-1.8 -3.4H-5ZM1.4 0H5.6L5 -3.4H1.8Z"/>';

  function persona(x, z, alta, sagoma, braccio, spina) {
    const pt = P(x, BOT, z);
    const sc = n2(alta * F / z / 100);
    return '<g transform="translate(' + pt[0] + ' ' + pt[1] + ') scale(' + sc + ')">' +
      '<g class="' + EN + '-sagoma">' + sagoma + '</g>' +
      '<path class="' + EN + '-braccio" d="' + braccio + '"/>' +
      '<rect class="' + EN + '-spina" x="' + spina[0] + '" y="' + spina[1] + '" width="5" height="4" rx="1"/>' +
      '</g>';
  }

  function svgEniac() {
    const c = (s) => EN + '-' + s;
    const caso = generatore(17);
    const neon = [];
    const out = [];
    out.push('<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">');
    out.push('<rect class="' + c('sfondo') + '" width="800" height="500"/>' + griglia(c('griglia')));

    // la stanza: pavimento a piastrelle, spigoli dei muri e del soffitto
    const zBordo = F * XM / CX;               // dove il muro laterale esce dal disegno
    const pav = [P(-XM, BOT, zBordo), P(-XM, BOT, Z0), P(-XF, BOT, Z0), P(-XF, BOT, ZF), P(XF, BOT, ZF), P(XF, BOT, Z0), P(XM, BOT, Z0), P(XM, BOT, zBordo), [800, 500], [0, 500]];
    out.push('<path class="' + c('pavimento') + '" d="' + tratto(pav, true) + '"/>');
    const pz = [];
    for (let x = -2; x <= 2; x += 1) pz.push(tratto([P(x, BOT, 2.2), P(x, BOT, ZF)]));
    for (let z = 3.5; z < ZF; z += 1.1) pz.push(tratto([P(-XF, BOT, z), P(XF, BOT, z)]));
    out.push('<path class="' + c('piastrelle') + '" d="' + pz.join('') + '"/>');
    out.push('<path class="' + c('stanza') + '" d="' + tratto([P(-XM, SOFFITTO, zBordo), P(-XM, SOFFITTO, ZM), P(XM, SOFFITTO, ZM), P(XM, SOFFITTO, zBordo)]) +
      tratto([P(-XM, SOFFITTO, ZM), P(-XM, TOP, ZM)]) + tratto([P(XM, SOFFITTO, ZM), P(XM, TOP, ZM)]) +
      tratto([P(-XM, BOT, zBordo), P(-XM, BOT, Z0)]) + tratto([P(XM, BOT, zBordo), P(XM, BOT, Z0)]) + '"/>');

    // i pannelli: lato di fondo e i due bracci della U
    const pannelli = [];
    const tipiFondo = ['acc', 'acc', 'prog', 'prog', 'acc', 'mult', 'acc', 'acc'];
    for (let k = 0; k < 8; k++) pannelli.push({ lato: 'fondo', a: -XF + k * LP, b: -XF + (k + 1) * LP, tipo: tipiFondo[k] });
    const tipiSx = ['acc', 'acc', 'prog', 'acc', 'mult', 'acc', 'acc', 'prog', 'acc', 'acc'];
    const tipiDx = ['acc', 'mult', 'acc', 'acc', 'prog', 'acc', 'acc', 'mult', 'acc', 'acc'];
    for (let k = 9; k >= 0; k--) {
      pannelli.push({ lato: 'sx', a: Z0 + k * LP, b: Z0 + (k + 1) * LP, tipo: tipiSx[k] });
      pannelli.push({ lato: 'dx', a: Z0 + k * LP, b: Z0 + (k + 1) * LP, tipo: tipiDx[k] });
    }
    pannelli.forEach((p) => out.push(pannello(p, caso, neon)));
    // testate dei bracci della U: si vede lo spessore degli armadi
    out.push('<path class="' + c('fianco') + '" d="' + tratto([P(-XM, TOP, Z0), P(-XF, TOP, Z0), P(-XF, BOT, Z0), P(-XM, BOT, Z0)], true) + '"/>');
    out.push('<path class="' + c('fianco') + '" d="' + tratto([P(XF, TOP, Z0), P(XM, TOP, Z0), P(XM, BOT, Z0), P(XF, BOT, Z0)], true) + '"/>');

    // canaline delle cifre lungo la base dei pannelli
    const yc0 = BOT + 0.5, yc1 = BOT + 0.6, xc = XF - 0.07, zc = ZF - 0.07;
    out.push('<path class="' + c('canalina') + '" d="' + tratto([P(-xc, yc1, Z0), P(-xc, yc1, zc), P(-xc, yc0, zc), P(-xc, yc0, Z0)], true) + '"/>');
    out.push('<path class="' + c('canalina') + '" d="' + tratto([P(xc, yc1, Z0), P(xc, yc1, zc), P(xc, yc0, zc), P(xc, yc0, Z0)], true) + '"/>');
    out.push('<path class="' + c('canalina') + '" d="' + tratto([P(-xc, yc1, zc), P(xc, yc1, zc), P(xc, yc0, zc), P(-xc, yc0, zc)], true) + '"/>');

    // cavi di programma fra le prese (y della fila di prese: 40% dell'altezza)
    const yp = BOT + 0.4 * (TOP - BOT);
    const xs = -XF + 0.05, xd = XF - 0.05, zf = ZF - 0.05;
    const larg = (z) => n2(Math.max(1.1, 0.03 * F / z));
    [[[xs, yp, 3.72], [xs, yp, 4.68], 0.45], [[xs, yp, 4.08], [xs, yp, 5.88], 0.75], [[xs, yp, 6.12], [xs, yp, 7.32], 0.5],
      [[xs, yp, 7.68], [xs, yc1, 8.4], 0.25], [[xs, yp, 5.28], [xs, yc1, 5.6], 0.15]].forEach((k) => out.push(cavo(k[0], k[1], k[2], c('cavo'), larg((k[0][2] + k[1][2]) / 2))));
    [[[-1.92, yp, zf], [-0.6, yp, zf], 0.5], [[-1.32, yp, zf], [0.72, yp, zf], 0.8], [[0.24, yp, zf], [1.56, yp, zf], 0.45], [[1.92, yp, zf], [2.1, yc1, zf], 0.2],
      [[-0.36, yp, zf], [-0.2, yc1, zf], 0.15]].forEach((k) => out.push(cavo(k[0], k[1], k[2], c('cavo'), larg(ZF))));
    [[[xd, yp, 3.48], [xd, yp, 4.92], 0.55], [[xd, yp, 6.48], [xd, yp, 7.08], 0.35], [[xd, yp, 7.92], [xd, yp, 8.76], 0.4]].forEach((k) => out.push(cavo(k[0], k[1], k[2], c('cavo'), larg((k[0][2] + k[1][2]) / 2))));

    // tavola delle funzioni portatile, su ruote, collegata alla canalina
    const tx0 = 0.7, tx1 = 1.7, tz0 = 5.2, tz1 = 5.8, ty0 = BOT + 0.2, ty1 = BOT + 1.9;
    out.push(cavo([tx1, BOT + 0.5, tz0 + 0.3], [xc, yc0 + 0.02, 6.4], 0.25, c('cavo-2'), 2.2));
    out.push('<path class="' + c('tavola-f') + '" d="' + tratto([P(tx0, ty1, tz0), P(tx0, ty1, tz1), P(tx0, ty0, tz1), P(tx0, ty0, tz0)], true) + '"/>');
    out.push('<path class="' + c('tavola') + '" d="' + tratto([P(tx0, ty1, tz0), P(tx1, ty1, tz0), P(tx1, ty0, tz0), P(tx0, ty0, tz0)], true) + '"/>');
    const tv = [];
    for (let r = 0; r < 13; r++) for (let k = 0; k < 6; k++) {
      const pt = P(tx0 + 0.14 + k * 0.144, ty1 - 0.22 - r * 0.1, tz0);
      tv.push('<circle class="' + c('manopola') + '" cx="' + pt[0] + '" cy="' + pt[1] + '" r="1.5"/>');
    }
    out.push(tv.join(''));
    [[tx0 + 0.1, tz0], [tx1 - 0.1, tz0], [tx0, tz1 - 0.1]].forEach((w) => {
      const pt = P(w[0], BOT + 0.08, w[1]);
      out.push('<circle class="' + c('ruota') + '" cx="' + pt[0] + '" cy="' + pt[1] + '" r="' + n2(0.08 * F / w[1]) + '"/>');
    });

    // due programmatrici: una collega un cavo sul braccio sinistro, l'altra sul lato di fondo
    const yMano = yp;   // la presa
    const zp1 = 4.4, xp1 = -1.95, alta1 = 1.65;
    const sc1 = alta1 * F / zp1 / 100;
    const base1 = P(xp1, BOT, zp1), presa1 = P(xs, yMano, 4.32);
    const mano1 = [n2((presa1[0] - base1[0]) / sc1 + 3), n2((presa1[1] - base1[1]) / sc1)];
    out.push(cavo([xs + 0.1, yMano - 0.02, 4.34], [xs, yc1, 4.9], 0.35, c('cavo'), larg(4.6)));
    out.push(persona(xp1, zp1, alta1, SAGOMA_PROFILO, 'M-2 -79L-11 -72L' + mano1[0] + ' ' + mano1[1], [mano1[0] - 4.5, mano1[1] - 2]));
    out.push(persona(0.62, 8.5, 1.62, SAGOMA_SCHIENA, 'M-7 -80L-9.4 -58M6.6 -80L11.6 -91L13 -99', [11, -104]));

    // quota: un pannello è più alto di una persona
    const q0 = P(-XM, TOP, Z0), q1 = P(-XM, BOT, Z0);
    const qx = q0[0] - 16;
    out.push('<path class="' + c('quota') + '" d="M' + qx + ' ' + q0[1] + 'V' + q1[1] + 'M' + (qx - 6) + ' ' + q0[1] + 'H' + (qx + 6) + 'M' + (qx - 6) + ' ' + q1[1] + 'H' + (qx + 6) + '"/>');
    out.push('<text class="' + c('nota') + '" transform="translate(' + (qx - 8) + ' ' + n2((q0[1] + q1[1]) / 2) + ') rotate(-90)" text-anchor="middle">circa 2,4 m</text>');

    // didascalie
    const neonPt = P(-XF, BOT + 0.89 * (TOP - BOT), Z0 + 1.5 * LP);
    out.push('<path class="' + c('guida') + '" d="M118 108L' + neonPt[0] + ' ' + neonPt[1] + '"/><circle class="' + c('punto') + '" cx="' + neonPt[0] + '" cy="' + neonPt[1] + '" r="3.5"/>');
    out.push('<text class="' + c('t') + '" x="24" y="80">accumulatori</text><text class="' + c('nota') + '" x="24" y="102">con lampadine al neon</text>');
    const cavoPt = P(-0.95, yp - 0.62, zf);
    out.push('<path class="' + c('guida') + '" d="M400 176L' + cavoPt[0] + ' ' + cavoPt[1] + '"/><circle class="' + c('punto') + '" cx="' + cavoPt[0] + '" cy="' + cavoPt[1] + '" r="3.5"/>');
    out.push('<text class="' + c('t') + '" x="400" y="166" text-anchor="middle">cavi di programma</text>');
    const tavPt = P(tx1 - 0.2, BOT + 0.5, tz0);
    out.push('<path class="' + c('guida') + '" d="M640 452L' + tavPt[0] + ' ' + tavPt[1] + '"/><circle class="' + c('punto') + '" cx="' + tavPt[0] + '" cy="' + tavPt[1] + '" r="3.5"/>');
    out.push('<text class="' + c('t') + '" x="776" y="476" text-anchor="end">tavola delle funzioni</text>');
    const p1 = P(xp1, BOT + 1.05, zp1), p2 = P(0.62, BOT + 1.0, 8.5);
    out.push('<path class="' + c('guida') + '" d="M160 458L' + p1[0] + ' ' + p1[1] + 'M160 458L' + p2[0] + ' ' + p2[1] + '"/>' +
      '<circle class="' + c('punto') + '" cx="' + p1[0] + '" cy="' + p1[1] + '" r="3.5"/><circle class="' + c('punto') + '" cx="' + p2[0] + '" cy="' + p2[1] + '" r="3.5"/>');
    out.push('<text class="' + c('t') + '" x="24" y="482">programmatrici</text>');

    // piccola pianta: dove stanno i pannelli e da dove guardiamo
    out.push('<rect class="' + c('mappa') + '" x="632" y="16" width="148" height="112" rx="6"/>');
    out.push('<path class="' + c('cono') + '" d="M706 112L650 40H762Z"/>');
    out.push('<path class="' + c('mappa-u') + '" d="M656 96V36H756V96"/>');
    const tic = [];
    for (let y = 46; y < 96; y += 9) tic.push('M652.5 ' + y + 'h7M752.5 ' + y + 'h7');
    for (let x = 666; x < 756; x += 9) tic.push('M' + x + ' 32.5v7');
    out.push('<path class="' + c('mappa-p') + '" d="' + tic.join('') + '"/>');
    out.push('<path class="' + c('occhio') + '" d="M706 104l-6 10h12Z"/>');
    out.push('<text class="' + c('mappa-t') + '" x="706" y="72">40 pannelli</text>');
    out.push('</svg>');
    return out.join('');
  }

  root.ProgStoria.figura('eniac', {
    alt: 'La sala dell\'ENIAC vista in prospettiva dall\'estremità aperta della U: lungo le due pareti laterali e sul fondo corrono i pannelli metallici, alti circa 2,4 metri, più di una persona. Sui pannelli ci sono file di manopole, prese e, negli accumulatori, piccole lampadine al neon che si accendono e si spengono. Cavi di programma colorati pendono fra le prese e scendono verso le canaline alla base dei pannelli. Al centro della sala c\'è una tavola delle funzioni su ruote, coperta di commutatori. Due programmatrici, disegnate come sagome scure senza volto, collegano i cavi: una sul braccio sinistro della U, l\'altra sul lato di fondo. In alto a destra una piccola pianta mostra i quaranta pannelli disposti a U e il punto da cui si guarda.',
    css: cssEniac,
    disegna() { return svgEniac(); },
  });

  /* ===================== falena ===================== */

  const FA = 'fig-falena';
  const cssFalena = `
    .${FA}-sfondo { fill: var(--fig-paper); }
    .${FA}-griglia { fill: none; stroke: var(--fig-line); stroke-width: 1; opacity: .16; }
    .${FA}-ombra { fill: var(--fig-line); opacity: .25; }
    .${FA}-pagina { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${FA}-righe { fill: none; stroke: var(--fig-cool); stroke-width: 1; opacity: .35; }
    .${FA}-margine { fill: none; stroke: var(--fig-red); stroke-width: 1.5; opacity: .55; }
    .${FA}-scarabocchio { fill: none; stroke: var(--fig-ink); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; opacity: .5; }
    .${FA}-mano { font: italic 500 20px var(--pg-serif, Georgia, serif); fill: var(--fig-ink); }
    .${FA}-mano-g { font: italic 600 23px var(--pg-serif, Georgia, serif); fill: var(--fig-ink); }
    .${FA}-ala { fill: var(--fig-3); stroke: var(--fig-ink); stroke-width: 1.3; stroke-linejoin: round; }
    .${FA}-ala-2 { fill: var(--fig-4); stroke: var(--fig-ink); stroke-width: 1.3; stroke-linejoin: round; }
    .${FA}-venature { fill: none; stroke: var(--fig-ink); stroke-width: .9; opacity: .45; }
    .${FA}-corpo { fill: var(--fig-4); stroke: var(--fig-ink); stroke-width: 1.2; }
    .${FA}-antenne { fill: none; stroke: var(--fig-ink); stroke-width: 1.2; stroke-linecap: round; }
    .${FA}-nastro { fill: var(--fig-paper); fill-opacity: .5; stroke: var(--fig-line); stroke-width: 1; }
    .${FA}-lente { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; }
    .${FA}-filo { fill: none; stroke: var(--fig-ink); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
    .${FA}-ferro { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 1.8; }
    .${FA}-giogo { fill: none; stroke: var(--fig-metal-2); stroke-width: 7; stroke-linejoin: round; }
    .${FA}-avvolgimento { fill: none; stroke: var(--fig-ink); stroke-width: 1.2; }
    .${FA}-eccita { fill: var(--cap); opacity: 0; }
    .${FA}-lamina { fill: none; stroke: var(--fig-ink); stroke-width: 5; stroke-linecap: round; }
    .${FA}-ancora { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.2; }
    .${FA}-perno { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; }
    .${FA}-corrente { fill: none; stroke: var(--fig-warm); stroke-width: 4.5; stroke-linecap: round; stroke-dasharray: 2 11; opacity: 0; }
    .${FA}-blocco { fill: none; stroke: var(--fig-red); stroke-width: 3.5; stroke-linecap: round; opacity: 0; }
    .${FA}-tit { font: 800 15px var(--mono, monospace); fill: var(--fig-ink); letter-spacing: .1em; }
    .${FA}-t { font: 700 17px var(--font, sans-serif); fill: var(--fig-ink); }
    .${FA}-trad { font: italic 500 17px var(--pg-serif, Georgia, serif); fill: var(--fig-ink); }

    .${FA}-a { animation-duration: 3.6s; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
    .${FA}-scatta { animation-name: ${FA}-scatta; transform-box: view-box; transform-origin: 604px 122px; transform: rotate(-12deg); }
    .${FA}-eccita { animation-name: ${FA}-on; }
    .${FA}-corrente { animation-name: ${FA}-on, ${FA}-scorre; animation-timing-function: ease-in-out, linear; animation-duration: 3.6s, .8s; }
    .${FA}-blocco { animation-name: ${FA}-blocco; }
    @keyframes ${FA}-scatta { 0%, 22% { transform: rotate(-12deg); } 32%, 70% { transform: rotate(-5deg); } 34% { transform: rotate(-4.2deg); } 80%, 100% { transform: rotate(-12deg); } }
    @keyframes ${FA}-on { 0%, 18% { opacity: 0; } 24%, 72% { opacity: 1; } 78%, 100% { opacity: 0; } }
    @keyframes ${FA}-blocco { 0%, 32% { opacity: 0; } 38%, 66% { opacity: 1; } 72%, 100% { opacity: 0; } }
    @keyframes ${FA}-scorre { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -26; } }
    @media (prefers-reduced-motion: reduce) {
      .${FA}-a { animation: none; }
      .${FA}-scatta { transform: rotate(-5deg); }
      .${FA}-eccita, .${FA}-corrente, .${FA}-blocco { opacity: 1; }
    }
  `;

  // una riga di scrittura illeggibile (le altre annotazioni della pagina, non trascritte)
  function scarabocchio(x0, x1, y, caso) {
    // una fila di gobbe come nel corsivo, con qualche asta più alta e gli spazi fra le parole
    let d = 'M' + x0 + ' ' + (y - 1);
    let x = x0;
    while (x < x1) {
      const w = 4 + caso() * 4;
      const h = caso() < 0.16 ? 13 + caso() * 4 : 5 + caso() * 5;
      d += 'Q' + n2(x + w / 2) + ' ' + n2(y - 1 - h * 2) + ' ' + n2(x + w) + ' ' + n2(y - caso() * 2);
      x += w;
      if (caso() < 0.13) { x += 9; d += 'M' + n2(x) + ' ' + n2(y - 1); }
    }
    return d;
  }

  function falena(cls) {
    const c = (s) => FA + '-' + s;
    return '<g' + (cls ? ' ' + cls : '') + '>' +
      '<path class="' + c('ala-2') + '" d="M198 294C182 296 168 306 175 316C186 318 194 307 199 299Z"/>' +
      '<path class="' + c('ala-2') + '" d="M202 294C218 296 232 306 225 316C214 318 206 307 201 299Z"/>' +
      '<path class="' + c('ala') + '" d="M199 284C186 271 168 264 157 269C155 281 165 291 198 296Z"/>' +
      '<path class="' + c('ala') + '" d="M201 284C214 271 232 264 243 269C245 281 235 291 202 296Z"/>' +
      '<path class="' + c('venature') + '" d="M196 287L164 273M195 291L163 283M204 287L236 273M205 291L237 283M196 299L180 310M204 299L220 310"/>' +
      '<ellipse class="' + c('corpo') + '" cx="200" cy="296" rx="3.6" ry="15"/>' +
      '<circle class="' + c('corpo') + '" cx="200" cy="280" r="3.8"/>' +
      '<path class="' + c('antenne') + '" d="M198.6 277C196 268 192 264 185 262M201.4 277C204 268 208 264 215 262"/>' +
      '</g>';
  }

  function svgFalena(ctx) {
    const c = (s) => FA + '-' + s;
    const caso = generatore(29);
    const lente = ctx && ctx.uid ? ctx.uid('falena') : FA + '-lente';
    const out = [];
    out.push('<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">');
    out.push('<defs><clipPath id="' + lente + '"><circle cx="672" cy="152" r="99"/></clipPath></defs>');
    out.push('<rect class="' + c('sfondo') + '" width="800" height="500"/>' + griglia(c('griglia')));

    // la pagina del registro, appena storta
    out.push('<g transform="rotate(-1.2 280 254)">');
    out.push('<rect class="' + c('ombra') + '" x="47" y="35" width="480" height="452"/>');
    out.push('<rect class="' + c('pagina') + '" x="40" y="28" width="480" height="452"/>');
    const righe = [];
    for (let y = 96; y <= 456; y += 30) righe.push('M44 ' + y + 'H516');
    out.push('<path class="' + c('righe') + '" d="' + righe.join('') + '"/><path class="' + c('margine') + '" d="M128 30V478"/>');
    out.push('<text class="' + c('mano-g') + '" x="60" y="76">9/9</text>');
    // annotazioni precedenti, illeggibili
    const sc = [];
    [120, 150, 180, 210, 240].forEach((y, i) => {
      if (i !== 2 && i !== 3) sc.push(scarabocchio(58, 108, y, caso));
      sc.push(scarabocchio(140, 260 + caso() * 220, y, caso));
    });
    [420, 450].forEach((y) => { sc.push(scarabocchio(58, 108, y, caso)); sc.push(scarabocchio(140, 220 + caso() * 160, y, caso)); });
    out.push('<path class="' + c('scarabocchio') + '" d="' + sc.join('') + '"/>');
    // l'annotazione delle 15:45, con la falena attaccata
    out.push('<text class="' + c('mano-g') + '" x="56" y="300">1545</text>');
    out.push(falena());
    out.push('<path class="' + c('nastro') + '" d="M150 279L252 276L253 304L151 308Z"/>');
    out.push('<text class="' + c('mano') + '" x="268" y="290">Relay #70 Panel F</text>');
    out.push('<text class="' + c('mano') + '" x="268" y="318">(moth) in relay.</text>');
    out.push('<text class="' + c('mano') + '" x="146" y="360">First actual case of bug being found.</text>');
    out.push('</g>');

    // la lente sul relè 70: la bobina attira la lamina, ma la falena impedisce il contatto
    out.push('<text class="' + c('tit') + '" x="566" y="36">RELÈ 70 · PANNELLO F</text>');
    out.push('<circle class="' + c('lente') + '" cx="672" cy="152" r="100"/>');
    const av = [];
    for (let x = 640; x <= 692; x += 8) av.push('M' + x + ' 150v42');
    out.push('<g clip-path="url(#' + lente + ')">' +
      '<path class="' + c('filo') + '" d="M560 122H604M728 150V214H790M650 196V260M682 196V260"/>' +
      '<path class="' + c('a') + ' ' + c('corrente') + '" d="M650 262V196M682 196V262"/>' +
      '<path class="' + c('giogo') + '" d="M634 196H616V128"/>' +
      '<rect class="' + c('ferro') + '" x="632" y="146" width="68" height="50" rx="5"/>' +
      '<path class="' + c('avvolgimento') + '" d="' + av.join('') + '"/>' +
      '<rect class="' + c('a') + ' ' + c('eccita') + '" x="632" y="146" width="68" height="50" rx="5" style="fill-opacity:.5"/>' +
      '<rect class="' + c('ferro') + '" x="652" y="136" width="28" height="10"/>' +
      '<rect class="' + c('ferro') + '" x="721" y="130" width="14" height="22" rx="2"/>' +
      falena('transform="translate(728 125) scale(.36) translate(-200 -292)"') +
      '<g class="' + c('a') + ' ' + c('scatta') + '">' +
        '<rect class="' + c('ancora') + '" x="650" y="124" width="32" height="7" rx="1.5"/>' +
        '<path class="' + c('lamina') + '" d="M604 122H730"/>' +
      '</g>' +
      '<circle class="' + c('perno') + '" cx="604" cy="122" r="5.5"/>' +
      '<path class="' + c('a') + ' ' + c('blocco') + '" d="M744 94l12 12M756 94l-12 12"/>' +
      '</g>');
    out.push('<text class="' + c('t') + '" x="566" y="282">la falena impedisce</text>');
    out.push('<text class="' + c('t') + '" x="566" y="304">al contatto di chiudersi</text>');

    // traduzione dell'annotazione
    out.push('<text class="' + c('tit') + '" x="566" y="352">TRADUZIONE</text>');
    out.push('<text class="' + c('trad') + '" x="566" y="380">15:45 Relè n. 70,</text>');
    out.push('<text class="' + c('trad') + '" x="566" y="402">pannello F (falena) nel relè.</text>');
    out.push('<text class="' + c('trad') + '" x="566" y="430">Primo caso concreto</text>');
    out.push('<text class="' + c('trad') + '" x="566" y="452">di bug trovato.</text>');
    out.push('</svg>');
    return out.join('');
  }

  root.ProgStoria.figura('falena', {
    alt: 'A sinistra una pagina a righe del registro dell\'Harvard Mark II, datata 9/9. Fra righe di appunti a matita illeggibili, accanto all\'ora 1545, c\'è una falena con le ali aperte fissata con una striscia di nastro adesivo; a fianco è scritto a mano «Relay #70 Panel F (moth) in relay.» e sotto «First actual case of bug being found.». A destra una lente mostra il relè 70 del pannello F: la bobina si eccita e attira la lamina, ma la falena incastrata fra i contatti le impedisce di chiudersi, e una crocetta rossa segnala che il contatto non avviene. Sotto, la traduzione: alle 15:45, relè n. 70, pannello F, falena nel relè; primo caso concreto di bug trovato.',
    css: cssFalena,
    disegna(ctx) { return svgFalena(ctx); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
