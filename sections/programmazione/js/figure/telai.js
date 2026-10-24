/*
 * Illustrazioni del capitolo 1 · Le schede che comandano.
 *   telaio-jacquard     telaio a mano con la macchina Jacquard, vista di fronte e in sezione:
 *                       la scheda sul prisma, gli aghi, gli uncini, le cordicelle, l'ordito e la navetta
 *   macchina-analitica  la macchina analitica di Babbage vista dall'alto, semplificata dal Plan 25 (1840)
 * Colori dalla tavolozza --fig-* e --cap, così il disegno segue il tema chiaro o scuro.
 * Le animazioni sono solo CSS (transform e opacità) e si fermano con il movimento ridotto.
 */
(function (root) {
  'use strict';
  if (!root.ProgStoria) return;

  const n2 = (v) => Math.round(v * 100) / 100;

  // @keyframes da coppie [percentuale, dichiarazioni]; a parità di percentuale vale l'ordine dato
  function kf(nome, passi) {
    return '@keyframes ' + nome + ' {' + passi
      .map((p, i) => [p[0], i, p[1]])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])
      .map((p) => ' ' + n2(p[0]) + '% { ' + p[2] + ' }').join('') + ' }';
  }

  function griglia(cls) {
    const d = [];
    for (let x = 40; x < 800; x += 40) d.push('M' + x + ' 0V500');
    for (let y = 40; y < 500; y += 40) d.push('M0 ' + y + 'H800');
    return '<path class="' + cls + '" d="' + d.join('') + '"/>';
  }

  // linea guida con pallino sul bersaglio
  function guida(cls, punti) {
    const ult = punti[punti.length - 1];
    return '<path class="' + cls + '-guida" d="M' + punti.map((p) => p.join(' ')).join('L') + '"/>' +
      '<circle class="' + cls + '-punto" cx="' + ult[0] + '" cy="' + ult[1] + '" r="3.5"/>';
  }

  /* ===================== telaio-jacquard ===================== */

  const TJ = 'fig-telaio-jacquard';
  // Quattro schede da quattro posizioni: 1 = foro (l'ago passa, l'uncino resta sulla barra e sale), 0 = pieno.
  // È una saia: a ogni scheda i fili alzati scivolano di un posto e il tessuto mostra una diagonale.
  const SCHEDE = [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 1], [1, 0, 0, 1]];
  const COLPO = 4;                          // secondi per un colpo di navetta
  const CICLO = COLPO * SCHEDE.length;      // 16 s, poi la catena ricomincia
  const HX = [300, 324, 348, 372];          // uncini
  const NY = [90, 104, 118, 132];           // aghi (e fori della scheda)
  const SALITA = 22;                        // corsa della barra e degli uncini agganciati
  const SPINTA = 10;                        // di quanto la scheda piena respinge ago e uncino
  const FUORI = 16;                         // il prisma si scosta dagli aghi per girare
  const PASSO = 56;                         // lato del prisma = una scheda della catena
  const WX = (j) => n2(230 + j * (260 / 23));   // 24 fili d'ordito: l'uncino i comanda i fili i, i+4, i+8…
  const NAVCORSA = 314;
  // fasi di un colpo, in frazioni: il prisma accosta, la barra sale, la navetta passa, la barra scende, il prisma gira
  const FASE = { dentro: 0.10, su: 0.30, via: 0.62, giu: 0.80, fuori: 0.88 };

  const cssTelaio = (function () {
    const q = 100 / SCHEDE.length;
    const at = (k, f) => q * (k + f);
    const ty = (v) => 'transform: translateY(' + v + 'px)';
    const tx = (v) => 'transform: translateX(' + v + 'px)';
    const regole = [];
    const statico = [];

    HX.forEach((_, i) => {
      const su = [[0, ty(0)], [100, ty(0)]];
      const sp = [[0, tx(0)], [100, tx(0)]];
      SCHEDE.forEach((s, k) => {
        if (s[i]) su.push([at(k, FASE.dentro), ty(0)], [at(k, FASE.su), ty(-SALITA)], [at(k, FASE.via), ty(-SALITA)], [at(k, FASE.giu), ty(0)]);
        else sp.push([at(k, 0), tx(0)], [at(k, FASE.dentro), tx(-SPINTA)], [at(k, FASE.giu), tx(-SPINTA)], [at(k, FASE.fuori), tx(0)]);
      });
      regole.push(kf(TJ + '-k-su' + i, su), kf(TJ + '-k-sp' + i, sp));
      regole.push('.' + TJ + '-su' + i + ' { animation-name: ' + TJ + '-k-su' + i + '; }');
      regole.push('.' + TJ + '-sp' + i + ' { animation-name: ' + TJ + '-k-sp' + i + '; }');
      statico.push('.' + TJ + '-su' + i + ' { ' + (SCHEDE[0][i] ? ty(-SALITA) : 'transform: none') + '; }');
      statico.push('.' + TJ + '-sp' + i + ' { ' + (SCHEDE[0][i] ? 'transform: none' : tx(-SPINTA)) + '; }');
    });

    // la navetta va e viene: un colpo da sinistra, il successivo da destra
    const nav = [[0, tx(0)], [100, tx(0)]];
    SCHEDE.forEach((_, k) => {
      const da = k % 2 ? NAVCORSA : 0;
      nav.push([at(k, FASE.su), tx(da)], [at(k, FASE.via), tx(NAVCORSA - da)]);
    });
    regole.push(kf(TJ + '-k-navetta', nav));

    // la scheda sulla faccia del prisma: compare quando arriva, sparisce quando il prisma gira
    SCHEDE.forEach((_, k) => {
      const op = (v) => 'opacity: ' + v;
      const p = k === 0
        ? [[0, op(1)], [at(0, FASE.fuori), op(1)], [at(0, FASE.fuori + 0.06), op(0)], [100 - q * 0.06, op(0)], [100, op(1)]]
        : [[0, op(0)], [at(k, -0.06), op(0)], [at(k, 0), op(1)], [at(k, FASE.fuori), op(1)], [at(k, FASE.fuori + 0.06), op(0)], [100, op(0)]];
      regole.push(kf(TJ + '-k-scheda' + k, p));
      regole.push('.' + TJ + '-scheda' + k + ' { animation-name: ' + TJ + '-k-scheda' + k + '; }');
      statico.push('.' + TJ + '-scheda' + k + ' { opacity: ' + (k === 0 ? 1 : 0) + '; }');
    });

    // un colpo (4 s): il prisma accosta, resta, si scosta e gira di un quarto; la catena scorre di una scheda
    const pr = (x, a) => 'transform: translateX(' + x + 'px) rotate(' + a + 'deg)';
    regole.push(kf(TJ + '-k-prisma', [[0, pr(FUORI, 0)], [10, pr(0, 0)], [80, pr(0, 0)], [88, pr(FUORI, 0)], [100, pr(FUORI, 90)]]));
    regole.push(kf(TJ + '-k-carro', [[0, tx(FUORI)], [10, tx(0)], [80, tx(0)], [88, tx(FUORI)], [100, tx(FUORI)]]));
    regole.push(kf(TJ + '-k-griffa', [[0, ty(0)], [10, ty(0)], [30, ty(-SALITA)], [62, ty(-SALITA)], [80, ty(0)], [100, ty(0)]]));
    regole.push(kf(TJ + '-k-sale', [[0, ty(0)], [88, ty(0)], [100, ty(-PASSO)]]));
    regole.push(kf(TJ + '-k-scende', [[0, ty(0)], [88, ty(0)], [100, ty(PASSO)]]));

    return `
    .${TJ}-sfondo { fill: var(--fig-paper); }
    .${TJ}-griglia { fill: none; stroke: var(--fig-line); stroke-width: 1; opacity: .16; }
    .${TJ}-legno { fill: var(--fig-2); stroke: var(--fig-ink); stroke-width: 2; }
    .${TJ}-legno-2 { fill: var(--fig-3); stroke: var(--fig-ink); stroke-width: 2; }
    .${TJ}-vano { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${TJ}-ferro { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${TJ}-ferro-2 { fill: var(--fig-metal-2); }
    .${TJ}-uncino { fill: none; stroke: var(--fig-ink); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
    .${TJ}-ago { fill: none; stroke: var(--fig-ink); stroke-width: 2.2; stroke-linecap: round; }
    .${TJ}-occhio { fill: none; stroke: var(--fig-ink); stroke-width: 1.6; }
    .${TJ}-molla { fill: none; stroke: var(--fig-ink); stroke-width: 1.3; stroke-linejoin: round; }
    .${TJ}-corda { fill: none; stroke: var(--fig-line); stroke-width: 1.4; }
    .${TJ}-maglia { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.3; }
    .${TJ}-ordito { fill: var(--cap); }
    .${TJ}-piombo-filo { fill: none; stroke: var(--fig-line); stroke-width: 1; }
    .${TJ}-piombo { fill: var(--fig-metal-2); }
    .${TJ}-tessuto { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${TJ}-trama { fill: none; stroke: var(--fig-3); stroke-width: 1; opacity: .7; }
    .${TJ}-disegno { fill: var(--cap); }
    .${TJ}-scheda { fill: var(--fig-3); stroke: var(--fig-ink); stroke-width: 1.2; }
    .${TJ}-tasca { fill: var(--fig-4); }
    .${TJ}-giunto { fill: var(--fig-ink); }
    .${TJ}-ansa { fill: none; stroke: var(--fig-ink); stroke-width: 8.4; }
    .${TJ}-ansa-2 { fill: none; stroke: var(--fig-3); stroke-width: 5.2; stroke-dasharray: 52 4; }
    .${TJ}-navetta-corpo { fill: var(--fig-3); stroke: var(--fig-ink); stroke-width: 1.8; }
    .${TJ}-spola { fill: none; stroke: var(--fig-paper); stroke-width: 3; stroke-linecap: round; }
    .${TJ}-traccia { fill: none; stroke: var(--fig-line); stroke-width: 1.5; stroke-dasharray: 2 6; stroke-linecap: round; }
    .${TJ}-pavimento { fill: none; stroke: var(--fig-line); stroke-width: 2; }
    .${TJ}-tratteggio { fill: none; stroke: var(--fig-line); stroke-width: 1.2; opacity: .7; }
    .${TJ}-guida { fill: none; stroke: var(--cap); stroke-width: 1.5; }
    .${TJ}-punto { fill: var(--cap); }
    .${TJ}-t { font: 700 19px var(--font, sans-serif); fill: var(--fig-ink); }
    .${TJ}-nota { font: 600 17px var(--font, sans-serif); fill: var(--fig-ink); }
    .${TJ}-nota-cap { font: 800 17px var(--font, sans-serif); fill: var(--cap); }
    .${TJ}-tit { font: 800 15px var(--mono, monospace); fill: var(--fig-ink); letter-spacing: .12em; }

    .${TJ}-a { animation-duration: ${CICLO}s; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
    .${TJ}-b { animation-duration: ${COLPO}s; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
    .${TJ}-navetta { animation-name: ${TJ}-k-navetta; }
    .${TJ}-prisma { animation-name: ${TJ}-k-prisma; transform-box: view-box; transform-origin: 450px 111px; }
    .${TJ}-carro { animation-name: ${TJ}-k-carro; }
    .${TJ}-griffa { animation-name: ${TJ}-k-griffa; }
    .${TJ}-sale { animation-name: ${TJ}-k-sale; }
    .${TJ}-scende { animation-name: ${TJ}-k-scende; }
    ${regole.join('\n    ')}
    @media (prefers-reduced-motion: reduce) {
      .${TJ}-a, .${TJ}-b { animation: none; }
      .${TJ}-griffa { transform: translateY(-${SALITA}px); }
      .${TJ}-navetta { transform: translateX(${NAVCORSA / 2}px); }
      .${TJ}-prisma, .${TJ}-carro, .${TJ}-sale, .${TJ}-scende { transform: none; }
      ${statico.join('\n      ')}
    }
  `;
  })();

  // una scheda vista di taglio, con i vuoti dove la sezione attraversa un foro
  function schedaDiTaglio(x, y0, y1, fori, cls) {
    const pezzi = [];
    let y = y0;
    fori.slice().sort((a, b) => a - b).forEach((f) => {
      if (f - 4 > y) pezzi.push([y, f - 4]);
      y = f + 4;
    });
    if (y1 > y) pezzi.push([y, y1]);
    return '<g class="' + cls + '">' + pezzi.map((p) =>
      '<rect class="' + TJ + '-scheda" x="' + x + '" y="' + n2(p[0]) + '" width="6" height="' + n2(p[1] - p[0]) + '"/>').join('') + '</g>';
  }

  function svgTelaio(ctx) {
    const u = ctx && ctx.uid ? ctx.uid('tj') : 'tj';
    const c = (s) => TJ + '-' + s;
    const out = [];

    out.push('<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">');
    out.push('<defs>' +
      '<clipPath id="' + u + '-sx"><rect x="408" y="139" width="22" height="75"/></clipPath>' +
      '<clipPath id="' + u + '-dx"><rect x="470" y="139" width="22" height="75"/></clipPath>' +
      '</defs>');
    out.push('<rect class="' + c('sfondo') + '" width="800" height="500"/>' + griglia(c('griglia')));
    out.push('<text class="' + c('tit') + '" x="24" y="36">VISTA DI FRONTE</text>');

    // pavimento e telaio di legno
    const tr = [];
    for (let x = 30; x <= 770; x += 20) tr.push('M' + x + ' 478l-9 11');
    out.push('<path class="' + c('pavimento') + '" d="M20 478H780"/><path class="' + c('tratteggio') + '" d="' + tr.join('') + '"/>');
    out.push('<rect class="' + c('legno-2') + '" x="196" y="452" width="328" height="10"/>');
    out.push('<rect class="' + c('legno') + '" x="196" y="164" width="16" height="314"/>');
    out.push('<rect class="' + c('legno') + '" x="508" y="164" width="16" height="314"/>');

    // testa Jacquard in sezione: cassa, vano interno, tetto
    out.push('<rect class="' + c('legno') + '" x="262" y="16" width="146" height="134"/>');
    out.push('<rect class="' + c('vano') + '" x="270" y="24" width="130" height="118"/>');
    out.push('<rect class="' + c('legno-2') + '" x="254" y="8" width="162" height="10"/>');

    // la barra che sale (griffa) con una lama sotto il becco di ogni uncino
    out.push('<g class="' + c('b') + ' ' + c('griffa') + '"><rect class="' + c('ferro-2') + '" x="302" y="66" width="94" height="4"/>' +
      HX.map((x) => '<rect class="' + c('ferro') + '" x="' + (x + 8) + '" y="54" width="8" height="14"/>').join('') + '</g>');

    // uncini con le loro cordicelle, le maglie, i fili d'ordito e i piombini: salgono insieme
    HX.forEach((x, i) => {
      const fili = [];
      for (let j = i; j < 24; j += 4) {
        const w = WX(j);
        fili.push('<path class="' + c('corda') + '" d="M' + x + ' 150V170L' + w + ' 266V318"/>' +
          '<rect class="' + c('maglia') + '" x="' + n2(w - 2.6) + '" y="318" width="5.2" height="13" rx="2.2"/>' +
          '<circle class="' + c('ordito') + '" cx="' + w + '" cy="324.5" r="2.8"/>' +
          '<path class="' + c('piombo-filo') + '" d="M' + w + ' 331V352"/>' +
          '<rect class="' + c('piombo') + '" x="' + n2(w - 1.6) + '" y="352" width="3.2" height="9" rx="1"/>');
      }
      out.push('<g class="' + c('a') + ' ' + c('su' + i) + '">' + fili.join('') +
        '<g class="' + c('a') + ' ' + c('sp' + i) + '"><path class="' + c('uncino') + '" d="M' + x + ' 150V50C' + x + ' 40 ' + (x + 12) + ' 40 ' + (x + 12) + ' 50V53"/></g>' +
        '</g>');
    });

    // aghi: ognuno passa nell'occhiello del suo uncino; la scheda piena li respinge
    NY.forEach((y, i) => {
      out.push('<g class="' + c('a') + ' ' + c('sp' + i) + '"><path class="' + c('ago') + '" d="M286 ' + y + 'H426"/>' +
        '<circle class="' + c('occhio') + '" cx="' + HX[i] + '" cy="' + y + '" r="4.6"/></g>');
    });
    // scatola delle molle che riportano gli aghi in avanti
    out.push('<rect class="' + c('ferro') + '" x="270" y="82" width="14" height="58"/>' +
      NY.map((y) => '<path class="' + c('molla') + '" d="M271 ' + y + 'l2 -3 2 6 2 -6 2 6 2 -6 2 3"/>').join(''));
    // fondo della cassa e trave del telaio (le cordicelle ci passano attraverso)
    out.push('<rect class="' + c('legno') + '" x="262" y="142" width="146" height="8"/>');
    out.push('<rect class="' + c('legno-2') + '" x="180" y="150" width="360" height="14"/>');
    out.push('<rect class="' + c('legno-2') + '" x="214" y="264" width="294" height="8"/>');

    // subbio anteriore, tessuto con il disegno (saia) e subbio del tessuto
    out.push('<rect class="' + c('legno-2') + '" x="186" y="370" width="348" height="12"/>');
    const cella = 260 / 23;
    const celle = [];
    for (let r = 0; r < 4; r++) {
      const s = SCHEDE[(3 - r + 4) % 4];
      for (let j = 0; j < 24; j++) {
        if (s[j % 4]) celle.push('<rect class="' + c('disegno') + '" x="' + n2(WX(j) - cella / 2) + '" y="' + (382 + r * 11.5) + '" width="' + n2(cella) + '" height="11.5"/>');
      }
    }
    const trame = [];
    for (let r = 1; r < 4; r++) trame.push('M' + n2(WX(0) - cella / 2) + ' ' + (382 + r * 11.5) + 'H' + n2(WX(23) + cella / 2));
    out.push('<rect class="' + c('tessuto') + '" x="' + n2(WX(0) - cella / 2) + '" y="382" width="' + n2(24 * cella) + '" height="46"/>' +
      celle.join('') + '<path class="' + c('trama') + '" d="' + trame.join('') + '"/>');
    out.push('<rect class="' + c('legno') + '" x="214" y="428" width="294" height="18" rx="9"/><path class="' + c('trama') + '" d="M222 437H500"/>');

    // la navetta corre nel varco fra i fili alzati e quelli rimasti giù
    out.push('<path class="' + c('traccia') + '" d="M230 314H490"/>');
    out.push('<g class="' + c('a') + ' ' + c('navetta') + '"><path class="' + c('navetta-corpo') + '" d="M180 314Q186 308 198 308H206Q218 308 224 314Q218 320 206 320H198Q186 320 180 314Z"/>' +
      '<path class="' + c('spola') + '" d="M195 314H209"/></g>');

    // prisma e catena di schede: tutto il carrello si scosta dagli aghi, il prisma gira, la catena scorre
    const tasche = [];
    [-21, -7, 7, 21].forEach((o) => {
      tasche.push([422, 111 + o - 3.5], [471, 111 + o - 3.5], [450 + o - 3.5, 83], [450 + o - 3.5, 132]);
    });
    const tratto = (x, da, a, cls) => {
      const s = [];
      for (let n = da; n <= a; n++) {
        const y = 139 + n * PASSO;
        s.push('<rect class="' + c('scheda') + '" x="' + x + '" y="' + (y + 1) + '" width="6" height="15"/>' +
          '<rect class="' + c('scheda') + '" x="' + x + '" y="' + (y + 21) + '" width="6" height="14"/>' +
          '<rect class="' + c('scheda') + '" x="' + x + '" y="' + (y + 41) + '" width="6" height="14"/>' +
          '<circle class="' + c('giunto') + '" cx="' + (x + 3) + '" cy="' + y + '" r="2.2"/>');
      }
      return '<g class="' + c('b') + ' ' + c(cls) + '">' + s.join('') + '</g>';
    };
    out.push('<g class="' + c('b') + ' ' + c('carro') + '">' +
      '<g clip-path="url(#' + u + '-sx)">' + tratto(416, 0, 2, 'sale') + '</g>' +
      '<g clip-path="url(#' + u + '-dx)">' + tratto(478, -1, 1, 'scende') + '</g>' +
      '<path class="' + c('ansa') + '" d="M419 213A31 31 0 0 0 481 213"/><path class="' + c('ansa-2') + '" d="M419 213A31 31 0 0 0 481 213"/>' +
      '</g>');
    out.push('<g class="' + c('b') + ' ' + c('prisma') + '"><rect class="' + c('legno') + '" x="422" y="83" width="56" height="56" rx="3"/>' +
      tasche.map((t) => '<rect class="' + c('tasca') + '" x="' + n2(t[0]) + '" y="' + n2(t[1]) + '" width="7" height="7"/>').join('') +
      '<circle class="' + c('ferro') + '" cx="450" cy="111" r="7"/><circle class="' + c('giunto') + '" cx="450" cy="111" r="2"/></g>');
    out.push('<g class="' + c('b') + ' ' + c('carro') + '">' +
      '<rect class="' + c('scheda') + '" x="416" y="77" width="68" height="6"/>' +
      '<rect class="' + c('scheda') + '" x="478" y="83" width="6" height="56"/>' +
      SCHEDE.map((s, k) => schedaDiTaglio(416, 83, 139, NY.filter((_, i) => s[i]), c('a') + ' ' + c('scheda' + k))).join('') +
      '</g>');

    // didascalie
    out.push(guida(TJ, [[94, 70], [300, 76]]) + '<text class="' + c('t') + '" x="24" y="76">uncini</text>');
    out.push(guida(TJ, [[78, 117], [292, 118]]) + '<text class="' + c('t') + '" x="24" y="123">aghi</text>');
    out.push(guida(TJ, [[130, 226], [258, 227]]) + '<text class="' + c('t') + '" x="24" y="232">cordicelle</text>');
    out.push(guida(TJ, [[148, 324], [226, 324]]) + '<text class="' + c('t') + '" x="24" y="330">fili d\'ordito</text>');
    out.push(guida(TJ, [[552, 66], [470, 79]]) + '<text class="' + c('t') + '" x="560" y="72">scheda</text>');
    out.push(guida(TJ, [[552, 112], [466, 112]]) + '<text class="' + c('t') + '" x="560" y="118">prisma</text>');
    out.push(guida(TJ, [[552, 190], [488, 190]]) + '<text class="' + c('t') + '" x="560" y="196">catena di schede</text>');
    out.push(guida(TJ, [[552, 312], [492, 314]]) + '<text class="' + c('t') + '" x="560" y="318">navetta</text>');
    out.push(guida(TJ, [[552, 404], [488, 404]]) + '<text class="' + c('t') + '" x="560" y="410">tessuto</text>');
    out.push('<text class="' + c('nota') + '" x="560" y="250"><tspan class="' + c('nota-cap') + '">foro</tspan>: l\'uncino sale</text>');
    out.push('<text class="' + c('nota') + '" x="560" y="274"><tspan class="' + c('nota-cap') + '">pieno</tspan>: resta giù</text>');
    out.push('</svg>');
    return out.join('');
  }

  root.ProgStoria.figura('telaio-jacquard', {
    alt: 'Telaio a mano visto di fronte, con la macchina Jacquard in cima disegnata in sezione. A destra della macchina un prisma di legno porta la catena di schede, che pende sotto in un lungo anello. Quattro aghi orizzontali toccano la scheda: dove c\'è un foro l\'ago passa e il suo uncino resta sopra la lama della barra che sale; dove la scheda è piena l\'ago arretra e sposta l\'uncino. Quando la barra sale, gli uncini agganciati tirano le cordicelle e alzano i loro fili d\'ordito; la navetta passa nel varco, poi il prisma gira e presenta la scheda successiva. In basso il tessuto mostra il disegno a diagonale che nasce dalle quattro schede.',
    css: cssTelaio,
    disegna(ctx) { return svgTelaio(ctx); },
  });

  /* ===================== macchina-analitica ===================== */

  const MA = 'fig-macchina-analitica';
  const MX = 190, MY = 210;                  // centro del mulino
  const COL = (n) => 340 + 46 * n;           // colonne del magazzino
  const SU = 170, GIU = 250;                 // le due file di colonne, sopra e sotto le cremagliere

  const cssAnalitica = `
    .${MA}-sfondo { fill: var(--fig-paper); }
    .${MA}-griglia { fill: none; stroke: var(--fig-line); stroke-width: 1; opacity: .16; }
    .${MA}-ottone { fill: var(--fig-2); stroke: var(--fig-ink); stroke-width: 2; }
    .${MA}-ferro { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; }
    .${MA}-ferro-1 { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${MA}-mozzo { fill: var(--fig-metal-2); }
    .${MA}-indice { fill: none; stroke: var(--fig-ink); stroke-width: 2; stroke-linecap: round; }
    .${MA}-denti { fill: none; stroke: var(--fig-ink); stroke-width: 3; stroke-dasharray: 3 4; }
    .${MA}-raggi { fill: none; stroke: var(--fig-ink); stroke-width: 3; stroke-linecap: round; }
    .${MA}-anello { fill: none; stroke: var(--fig-line); stroke-width: 1.5; stroke-dasharray: 4 6; }
    .${MA}-dentatura { fill: none; stroke: var(--fig-ink); stroke-width: 1.4; }
    .${MA}-continua { fill: none; stroke: var(--fig-line); stroke-width: 2; stroke-dasharray: 6 6; }
    .${MA}-sbiadito { opacity: .45; }
    .${MA}-scheda { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${MA}-scheda-dietro { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1.2; opacity: .75; }
    .${MA}-foro { fill: var(--fig-ink); }
    .${MA}-op { fill: var(--fig-warm); }
    .${MA}-var { fill: var(--fig-cool); }
    .${MA}-comando { fill: none; stroke: var(--fig-ink); stroke-width: 1.6; stroke-dasharray: 5 5; }
    .${MA}-freccia { fill: var(--fig-ink); }
    .${MA}-quota { fill: none; stroke: var(--fig-ink); stroke-width: 1.4; }
    .${MA}-cifra { font: 700 14px var(--mono, monospace); fill: var(--fig-ink); text-anchor: middle; }
    .${MA}-numero { fill: var(--cap); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${MA}-alone { fill: none; stroke: var(--cap); stroke-width: 3.5; }
    .${MA}-alone-op { fill: none; stroke: var(--fig-warm); stroke-width: 4; }
    .${MA}-alone-var { fill: none; stroke: var(--fig-cool); stroke-width: 4; }
    .${MA}-guida { fill: none; stroke: var(--cap); stroke-width: 1.5; }
    .${MA}-punto { fill: var(--cap); }
    .${MA}-t { font: 700 18px var(--font, sans-serif); fill: var(--fig-ink); }
    .${MA}-t-m { font: 700 18px var(--font, sans-serif); fill: var(--fig-ink); text-anchor: middle; }
    .${MA}-orig { font-weight: 500; font-style: italic; }
    .${MA}-nota { font: 600 15px var(--font, sans-serif); fill: var(--fig-ink); }
    .${MA}-tit { font: 800 15px var(--mono, monospace); fill: var(--fig-ink); letter-spacing: .12em; }
    .${MA}-sotto { font: 600 15px var(--font, sans-serif); fill: var(--fig-ink); opacity: .8; }

    .${MA}-a { animation-duration: 9s; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
    .${MA}-ruota { animation-name: ${MA}-gira; transform-box: view-box; transform-origin: ${MX}px ${MY}px; }
    .${MA}-numero-g { animation-name: ${MA}-viaggio, ${MA}-appare; }
    .${MA}-h-op { animation-name: ${MA}-h-op; }
    .${MA}-h-var { animation-name: ${MA}-h-var; }
    .${MA}-h-v1 { animation-name: ${MA}-h-v1; }
    .${MA}-h-v2 { animation-name: ${MA}-h-v2; }
    @keyframes ${MA}-gira { 0%, 46% { transform: rotate(0deg); } 58%, 100% { transform: rotate(90deg); } }
    @keyframes ${MA}-viaggio { 0%, 20% { transform: translateX(${COL(1) - 286}px); } 42%, 58% { transform: translateX(0); } 80%, 100% { transform: translateX(${COL(3) - 286}px); } }
    @keyframes ${MA}-appare { 0%, 18% { opacity: 0; } 22%, 42% { opacity: 1; } 46%, 56% { opacity: 0; } 60%, 80% { opacity: 1; } 86%, 100% { opacity: 0; } }
    @keyframes ${MA}-h-op { 0% { opacity: 0; } 5%, 55% { opacity: 1; } 60%, 100% { opacity: 0; } }
    @keyframes ${MA}-h-var { 0%, 8% { opacity: 0; } 13%, 30% { opacity: 1; } 35%, 62% { opacity: 0; } 67%, 88% { opacity: 1; } 93%, 100% { opacity: 0; } }
    @keyframes ${MA}-h-v1 { 0%, 12% { opacity: 0; } 17%, 32% { opacity: 1; } 40%, 100% { opacity: 0; } }
    @keyframes ${MA}-h-v2 { 0%, 78% { opacity: 0; } 82%, 92% { opacity: 1; } 99%, 100% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      .${MA}-a { animation: none; }
      .${MA}-ruota { transform: none; }
      .${MA}-numero-g { transform: translateX(${(COL(1) - 286) / 2}px); opacity: 1; }
      .${MA}-h-op, .${MA}-h-var, .${MA}-h-v1 { opacity: 1; }
      .${MA}-h-v2 { opacity: 0; }
    }
  `;

  // una colonna di ruote vista dall'alto, con il pignone che la collega alle cremagliere
  function colonna(x, y, versoRack, cls, ang) {
    const a = (ang || 0) * Math.PI / 180;
    const py = y + versoRack * 25;
    return '<g' + (cls ? ' class="' + cls + '"' : '') + '>' +
      '<path class="' + MA + '-indice" d="M' + x + ' ' + y + 'V' + py + '" style="stroke-width:3"/>' +
      '<circle class="' + MA + '-ferro-1" cx="' + x + '" cy="' + py + '" r="6"/>' +
      '<circle class="' + MA + '-ottone" cx="' + x + '" cy="' + y + '" r="16"/>' +
      '<circle class="' + MA + '-mozzo" cx="' + x + '" cy="' + y + '" r="5"/>' +
      '<path class="' + MA + '-indice" d="M' + x + ' ' + y + 'L' + n2(x + 12 * Math.sin(a)) + ' ' + n2(y - 12 * Math.cos(a)) + '"/>' +
      '</g>';
  }

  function scheda(x, y, w, h, fori, tipo) {
    const f = [];
    fori.forEach((riga, r) => riga.forEach((v, i) => {
      if (v) f.push('<circle class="' + MA + '-foro" cx="' + (x + 24 + i * 15) + '" cy="' + (y + 12 + r * 14) + '" r="3.4"/>');
    }));
    return '<rect class="' + MA + '-scheda-dietro" x="' + (x + 8) + '" y="' + (y - 8) + '" width="' + w + '" height="' + h + '"/>' +
      '<rect class="' + MA + '-scheda-dietro" x="' + (x + 4) + '" y="' + (y - 4) + '" width="' + w + '" height="' + h + '"/>' +
      '<rect class="' + MA + '-scheda" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>' +
      '<rect class="' + MA + '-' + tipo + '" x="' + (x + 1) + '" y="' + (y + 1) + '" width="9" height="' + (h - 2) + '"/>' + f.join('');
  }

  function svgAnalitica() {
    const out = [];
    const c = (s) => MA + '-' + s;
    out.push('<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">');
    out.push('<rect class="' + c('sfondo') + '" width="800" height="500"/>' + griglia(c('griglia')));
    out.push('<text class="' + c('tit') + '" x="24" y="36">PIANTA · VISTA DALL\'ALTO</text>');

    // cremagliere: portano i numeri fra il magazzino e il mulino; il magazzino continua oltre il foglio
    const denti = [];
    for (let x = 304; x < 742; x += 8) denti.push('M' + x + ' 203v-4M' + x + ' 217v4');
    out.push('<path class="' + c('dentatura') + '" d="' + denti.join('') + '"/>');
    out.push('<rect class="' + c('ferro') + '" x="298" y="203" width="446" height="14"/>');
    out.push('<path class="' + c('continua') + '" d="M748 210H796"/>');

    // magazzino: due file di colonne lungo le cremagliere
    const angoli = [40, 300, 150, 220, 90, 330, 10, 260, 120];
    for (let n = 0; n < 9; n++) {
      const sb = n >= 7 ? c('sbiadito') : '';
      out.push(colonna(COL(n), SU, 1, sb, angoli[n]));
      out.push(colonna(COL(n), GIU, -1, sb, angoli[8 - n]));
    }
    out.push('<text class="' + c('t') + '" x="742" y="176" style="opacity:.6">…</text><text class="' + c('t') + '" x="742" y="256" style="opacity:.6">…</text>');
    // evidenza delle due colonne usate: si legge V1, il risultato va in V3
    out.push('<circle class="' + c('a') + ' ' + c('h-v1') + ' ' + c('alone') + '" cx="' + COL(1) + '" cy="' + SU + '" r="22"/>');
    out.push('<circle class="' + c('a') + ' ' + c('h-v2') + ' ' + c('alone') + '" cx="' + COL(3) + '" cy="' + GIU + '" r="22"/>');
    // quota del magazzino
    out.push('<path class="' + c('quota') + '" d="M324 124V138M324 131H760M760 124V138"/>');
    out.push('<text class="' + c('t-m') + '" x="542" y="118">magazzino <tspan class="' + c('orig') + '">(Store)</tspan></text>');

    // mulino: grandi ruote centrali e, tutto intorno, gli assi delle cifre
    out.push('<circle class="' + c('anello') + '" cx="' + MX + '" cy="' + MY + '" r="96"/>');
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      const x = n2(MX + 96 * Math.cos(a)), y = n2(MY + 96 * Math.sin(a));
      const xi = n2(MX + 62 * Math.cos(a)), yi = n2(MY + 62 * Math.sin(a));
      out.push('<path class="' + c('indice') + '" d="M' + xi + ' ' + yi + 'L' + x + ' ' + y + '" style="stroke-width:3"/>' +
        '<circle class="' + c('ferro-1') + '" cx="' + xi + '" cy="' + yi + '" r="6"/>' +
        '<circle class="' + c('ottone') + '" cx="' + x + '" cy="' + y + '" r="15"/>' +
        '<circle class="' + c('mozzo') + '" cx="' + x + '" cy="' + y + '" r="5"/>' +
        '<path class="' + c('indice') + '" d="M' + x + ' ' + y + 'l' + n2(10 * Math.cos(a * 3 + 1)) + ' ' + n2(10 * Math.sin(a * 3 + 1)) + '"/>');
    }
    out.push('<g class="' + c('a') + ' ' + c('ruota') + '">' +
      '<circle class="' + c('ferro') + '" cx="' + MX + '" cy="' + MY + '" r="46"/>' +
      '<circle class="' + c('denti') + '" cx="' + MX + '" cy="' + MY + '" r="42"/>' +
      '<path class="' + c('raggi') + '" d="M' + (MX - 34) + ' ' + MY + 'H' + (MX + 34) + 'M' + MX + ' ' + (MY - 34) + 'V' + (MY + 34) + '"/>' +
      '<circle class="' + c('ottone') + '" cx="' + MX + '" cy="' + MY + '" r="11"/></g>');
    out.push('<text class="' + c('t-m') + '" x="' + MX + '" y="86">mulino <tspan class="' + c('orig') + '">(Mill)</tspan></text>');

    // il numero che viaggia lungo le cremagliere: dal magazzino al mulino e ritorno
    out.push('<g class="' + c('a') + ' ' + c('numero-g') + '"><rect class="' + c('numero') + '" x="272" y="201" width="28" height="18" rx="9"/>' +
      '<circle cx="281" cy="210" r="2.2" fill="var(--fig-paper)"/><circle cx="291" cy="210" r="2.2" fill="var(--fig-paper)"/></g>');

    // lettori di schede
    out.push(scheda(116, 366, 148, 42, [[1, 0, 0, 1, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0, 0, 0]], 'op'));
    out.push(scheda(336, 366, 148, 42, [[0, 1, 1, 0, 1, 0, 0, 1], [1, 0, 0, 0, 1, 1, 0, 0]], 'var'));
    out.push('<rect class="' + c('a') + ' ' + c('h-op') + ' ' + c('alone-op') + '" x="110" y="360" width="160" height="54" rx="4"/>');
    out.push('<rect class="' + c('a') + ' ' + c('h-var') + ' ' + c('alone-var') + '" x="330" y="360" width="160" height="54" rx="4"/>');
    out.push('<text class="' + c('t-m') + '" x="190" y="444">schede delle operazioni</text>');
    out.push('<text class="' + c('t-m') + '" x="410" y="444">schede delle variabili</text>');
    out.push('<text class="' + c('sotto') + '" x="190" y="466" text-anchor="middle">che cosa fare: + − × ÷</text>');
    out.push('<text class="' + c('sotto') + '" x="410" y="466" text-anchor="middle">quali colonne usare</text>');
    // comandi: le schede delle operazioni guidano il mulino, quelle delle variabili scelgono le colonne
    out.push('<path class="' + c('comando') + '" d="M' + MX + ' 354V' + (MY + 120) + '"/><path class="' + c('freccia') + '" d="M' + MX + ' ' + (MY + 113) + 'l-6 10h12Z"/>');
    out.push('<path class="' + c('comando') + '" d="M432 354V280"/><path class="' + c('freccia') + '" d="M432 272l-6 10h12Z"/>');

    // cremagliere (didascalia)
    out.push(guida(MA, [[318, 300], [318, 218]]) + '<text class="' + c('t') + '" x="300" y="322">cremagliere</text>');

    // una colonna vista di lato: una ruota per cifra
    const cifre = ['0', '3', '1', '4', '1'];
    out.push('<path class="' + c('comando') + '" d="M' + COL(6) + ' 268L630 300"/>');
    out.push('<path class="' + c('indice') + '" d="M650 296V420" style="stroke-width:3"/>');
    cifre.forEach((d, i) => {
      const y = 302 + i * 22;
      out.push('<rect class="' + c('ottone') + '" x="620" y="' + y + '" width="60" height="16" rx="5"/>' +
        '<text class="' + c('cifra') + '" x="650" y="' + (y + 13) + '">' + d + '</text>');
    });
    out.push('<text class="' + c('t') + '" x="618" y="436" style="opacity:.7">⋮</text>');
    out.push('<text class="' + c('t') + '" x="696" y="324">una</text><text class="' + c('t') + '" x="696" y="346">colonna:</text>');
    out.push('<text class="' + c('nota') + '" x="696" y="372">un numero,</text><text class="' + c('nota') + '" x="696" y="392">una ruota</text><text class="' + c('nota') + '" x="696" y="412">per cifra</text>');
    out.push('</svg>');
    return out.join('');
  }

  root.ProgStoria.figura('macchina-analitica', {
    alt: 'Pianta semplificata della macchina analitica di Charles Babbage. A sinistra il mulino: grandi ruote centrali circondate da un anello di dodici assi. Dal mulino parte verso destra una lunga cremagliera; ai suoi lati, sopra e sotto, due file di colonne di ruote numerate formano il magazzino, che continua oltre il bordo del disegno. In basso due lettori di schede perforate: le schede delle operazioni, collegate al mulino, e le schede delle variabili, collegate alle colonne. Un piccolo dettaglio mostra una colonna vista di lato, con una ruota per ogni cifra. Un segnale colorato parte da una colonna, corre lungo la cremagliera fino al mulino, le ruote centrali girano e il risultato torna in un\'altra colonna.',
    css: cssAnalitica,
    disegna() { return svgAnalitica(); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
