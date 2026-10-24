/*
 * Illustrazioni del capitolo 10 · Oggetti e finestre.
 *   primo-mouse      il mouse di legno di Engelbart ed English (1964): vista dall'alto, dal basso e sullo schermo
 *   desktop-anni-80  una scrivania a 1 bit del 1984: menu, icone, finestre e il puntatore che apre un documento
 * Colori dalla tavolozza --fig-* e --cap, così il disegno segue il tema chiaro o scuro.
 */
(function (root) {
  'use strict';
  if (!root.ProgStoria) return;

  /* ===================== primo-mouse ===================== */

  const cssMouse = `
    .fig-primo-mouse-sfondo { fill: var(--fig-paper); }
    .fig-primo-mouse-griglia { stroke: var(--fig-line); stroke-width: 1; opacity: .16; }
    .fig-primo-mouse-legno { fill: var(--fig-2); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-primo-mouse-legno-2 { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-primo-mouse-venatura { fill: none; stroke: var(--fig-3); stroke-width: 1.6; stroke-linecap: round; }
    .fig-primo-mouse-tasto { fill: var(--cap); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-primo-mouse-cavo { fill: none; stroke: var(--fig-ink); stroke-width: 3.5; stroke-linecap: round; }
    .fig-primo-mouse-metallo { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-primo-mouse-metallo-2 { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-primo-mouse-asse { stroke: var(--fig-ink); stroke-width: 3; stroke-linecap: round; }
    .fig-primo-mouse-tacche { fill: none; stroke: var(--fig-ink); stroke-width: 2; stroke-dasharray: 3 6; }
    .fig-primo-mouse-filo-a { fill: none; stroke: var(--fig-red); stroke-width: 2; }
    .fig-primo-mouse-filo-b { fill: none; stroke: var(--fig-cool); stroke-width: 2; }
    .fig-primo-mouse-piede { fill: var(--fig-4); }
    .fig-primo-mouse-freccia { fill: none; stroke: var(--fig-cool); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .fig-primo-mouse-guida { fill: none; stroke: var(--cap); stroke-width: 1.5; }
    .fig-primo-mouse-punto { fill: var(--cap); }
    .fig-primo-mouse-schermo { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-primo-mouse-vetro { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-primo-mouse-assi { stroke: var(--fig-line); stroke-width: 1; stroke-dasharray: 3 4; }
    .fig-primo-mouse-cursore { fill: var(--cap); stroke: var(--fig-paper); stroke-width: 1.5; }
    .fig-primo-mouse-livello { fill: var(--fig-glow); }
    .fig-primo-mouse-vaso { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-primo-mouse-cartiglio { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-primo-mouse-t { font: 700 19px var(--font, sans-serif); fill: var(--fig-ink); letter-spacing: .02em; }
    .fig-primo-mouse-tit { font: 800 16px var(--mono, monospace); fill: var(--fig-ink); letter-spacing: .12em; }
    .fig-primo-mouse-asse-t { font: 800 20px var(--mono, monospace); fill: var(--fig-cool); }
    .fig-primo-mouse-carti-1 { font: 800 16px var(--mono, monospace); fill: var(--fig-ink); letter-spacing: .06em; }
    .fig-primo-mouse-carti-2 { font: 600 15px var(--font, sans-serif); fill: var(--fig-ink); }

    .fig-primo-mouse-sopra, .fig-primo-mouse-cursore-g, .fig-primo-mouse-tx, .fig-primo-mouse-ty, .fig-primo-mouse-px, .fig-primo-mouse-py, .fig-primo-mouse-lx, .fig-primo-mouse-ly {
      animation-duration: 9s; animation-iteration-count: infinite; animation-timing-function: ease-in-out;
    }
    .fig-primo-mouse-sopra { animation-name: fig-primo-mouse-muovi; }
    .fig-primo-mouse-cursore-g { animation-name: fig-primo-mouse-punta; }
    .fig-primo-mouse-tx { animation-name: fig-primo-mouse-gira-x; }
    .fig-primo-mouse-ty { animation-name: fig-primo-mouse-gira-y; }
    .fig-primo-mouse-px, .fig-primo-mouse-py { transform-box: fill-box; transform-origin: 50% 50%; }
    .fig-primo-mouse-px { animation-name: fig-primo-mouse-pot-x; }
    .fig-primo-mouse-py { animation-name: fig-primo-mouse-pot-y; }
    .fig-primo-mouse-lx, .fig-primo-mouse-ly { transform-box: fill-box; transform-origin: 50% 100%; }
    .fig-primo-mouse-lx { animation-name: fig-primo-mouse-liv-x; }
    .fig-primo-mouse-ly { animation-name: fig-primo-mouse-liv-y; }
    @keyframes fig-primo-mouse-muovi { 0%, 12% { transform: translate(0, 0); } 30%, 42% { transform: translate(34px, 0); } 60%, 70% { transform: translate(34px, -30px); } 88%, 100% { transform: translate(0, 0); } }
    @keyframes fig-primo-mouse-punta { 0%, 12% { transform: translate(0, 0); } 30%, 42% { transform: translate(52px, 0); } 60%, 70% { transform: translate(52px, -40px); } 88%, 100% { transform: translate(0, 0); } }
    @keyframes fig-primo-mouse-gira-x { 0%, 12% { stroke-dashoffset: 0; } 30%, 70% { stroke-dashoffset: -34; } 88%, 100% { stroke-dashoffset: 0; } }
    @keyframes fig-primo-mouse-gira-y { 0%, 42% { stroke-dashoffset: 0; } 60%, 70% { stroke-dashoffset: 30; } 88%, 100% { stroke-dashoffset: 0; } }
    @keyframes fig-primo-mouse-pot-x { 0%, 12% { transform: rotate(0deg); } 30%, 70% { transform: rotate(130deg); } 88%, 100% { transform: rotate(0deg); } }
    @keyframes fig-primo-mouse-pot-y { 0%, 42% { transform: rotate(0deg); } 60%, 70% { transform: rotate(115deg); } 88%, 100% { transform: rotate(0deg); } }
    @keyframes fig-primo-mouse-liv-x { 0%, 12% { transform: scaleY(.35); } 30%, 70% { transform: scaleY(.85); } 88%, 100% { transform: scaleY(.35); } }
    @keyframes fig-primo-mouse-liv-y { 0%, 42% { transform: scaleY(.35); } 60%, 70% { transform: scaleY(.8); } 88%, 100% { transform: scaleY(.35); } }
    @media (prefers-reduced-motion: reduce) {
      .fig-primo-mouse-sopra, .fig-primo-mouse-cursore-g, .fig-primo-mouse-tx, .fig-primo-mouse-ty, .fig-primo-mouse-px, .fig-primo-mouse-py, .fig-primo-mouse-lx, .fig-primo-mouse-ly { animation: none; }
      .fig-primo-mouse-lx, .fig-primo-mouse-ly { transform: scaleY(.35); }
    }
  `;

  function svgMouse() {
    const g = [];
    for (let x = 40; x < 800; x += 40) g.push('<path d="M' + x + ' 0V500"/>');
    for (let y = 40; y < 500; y += 40) g.push('<path d="M0 ' + y + 'H800"/>');
    return '<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="fig-primo-mouse-sfondo" width="800" height="500"/>' +
      '<g class="fig-primo-mouse-griglia">' + g.join('') + '</g>' +

      // titoli delle tre viste
      '<text class="fig-primo-mouse-tit" x="34" y="44">VISTA DALL\'ALTO</text>' +
      '<text class="fig-primo-mouse-tit" x="306" y="44">VISTA DAL BASSO</text>' +
      '<text class="fig-primo-mouse-tit" x="596" y="44">SULLO SCHERMO</text>' +

      // --- vista dall'alto: il mouse si sposta prima a destra, poi in avanti ---
      '<path class="fig-primo-mouse-freccia" d="M96 376H230M96 376l9-6M96 376l9 6M230 376l-9-6M230 376l-9 6"/>' +
      '<text class="fig-primo-mouse-asse-t" x="156" y="406">X</text>' +
      '<path class="fig-primo-mouse-freccia" d="M262 146V310M262 146l-6 9M262 146l6 9M262 310l-6-9M262 310l6-9"/>' +
      '<text class="fig-primo-mouse-asse-t" x="272" y="236">Y</text>' +
      '<g class="fig-primo-mouse-sopra">' +
        '<path class="fig-primo-mouse-cavo" d="M163 132C163 104 152 94 128 90S66 84 30 98"/>' +
        '<rect class="fig-primo-mouse-legno" x="98" y="130" width="130" height="196" rx="18"/>' +
        '<rect x="107" y="139" width="112" height="178" rx="12" fill="none" stroke="var(--fig-3)" stroke-width="1.5" opacity=".7"/>' +
        '<path class="fig-primo-mouse-venatura" d="M118 160c16 22 4 44 18 70s2 54 12 78"/>' +
        '<path class="fig-primo-mouse-venatura" d="M146 150c10 26-4 50 10 78s0 50 8 82"/>' +
        '<path class="fig-primo-mouse-venatura" d="M176 196c8 18 2 36 10 54s-2 34 4 50"/>' +
        '<path class="fig-primo-mouse-venatura" d="M200 228c6 14 0 26 6 40"/>' +
        '<rect class="fig-primo-mouse-tasto" x="184" y="144" width="30" height="30" rx="6"/>' +
        '<rect x="189" y="149" width="12" height="6" rx="3" fill="var(--fig-paper)" opacity=".55"/>' +
      '</g>' +
      '<path class="fig-primo-mouse-guida" d="M226 124 205 150"/><circle class="fig-primo-mouse-punto" cx="205" cy="150" r="3"/>' +
      '<text class="fig-primo-mouse-t" x="200" y="116">pulsante</text>' +
      '<text class="fig-primo-mouse-t" x="34" y="78">cavo</text>' +

      // --- vista dal basso: due rotelle perpendicolari, ciascuna con il suo potenziometro ---
      '<rect class="fig-primo-mouse-legno-2" x="356" y="120" width="150" height="214" rx="18"/>' +
      '<circle class="fig-primo-mouse-piede" cx="374" cy="138" r="5"/><circle class="fig-primo-mouse-piede" cx="488" cy="138" r="5"/>' +
      '<circle class="fig-primo-mouse-piede" cx="374" cy="316" r="5"/><circle class="fig-primo-mouse-piede" cx="488" cy="316" r="5"/>' +
      '<path class="fig-primo-mouse-cavo" d="M431 120V84"/>' +
      '<path class="fig-primo-mouse-filo-a" d="M437 128C470 136 486 230 470 244"/>' +
      '<path class="fig-primo-mouse-filo-b" d="M425 128C410 140 432 168 432 178"/>' +
      // rotella Y (gira quando il mouse va avanti o indietro)
      '<rect class="fig-primo-mouse-metallo" x="380" y="150" width="14" height="88" rx="5"/>' +
      '<path class="fig-primo-mouse-tacche fig-primo-mouse-ty" d="M387 154V234"/>' +
      '<path class="fig-primo-mouse-asse" d="M394 194H414"/>' +
      '<rect class="fig-primo-mouse-metallo-2" x="414" y="178" width="22" height="32" rx="4"/>' +
      '<g class="fig-primo-mouse-py"><circle cx="425" cy="194" r="6.5" fill="var(--fig-paper)" stroke="var(--fig-ink)" stroke-width="1.6"/><path d="M425 194V188.5" stroke="var(--fig-ink)" stroke-width="2" stroke-linecap="round"/></g>' +
      // rotella X (gira quando il mouse va a destra o a sinistra)
      '<rect class="fig-primo-mouse-metallo" x="410" y="284" width="88" height="14" rx="5"/>' +
      '<path class="fig-primo-mouse-tacche fig-primo-mouse-tx" d="M414 291H494"/>' +
      '<path class="fig-primo-mouse-asse" d="M454 284V266"/>' +
      '<rect class="fig-primo-mouse-metallo-2" x="438" y="244" width="32" height="22" rx="4"/>' +
      '<g class="fig-primo-mouse-px"><circle cx="454" cy="255" r="6.5" fill="var(--fig-paper)" stroke="var(--fig-ink)" stroke-width="1.6"/><path d="M454 255V249.5" stroke="var(--fig-ink)" stroke-width="2" stroke-linecap="round"/></g>' +
      // didascalie con linee guida
      '<path class="fig-primo-mouse-guida" d="M524 158H452L396 168"/><circle class="fig-primo-mouse-punto" cx="396" cy="168" r="3"/>' +
      '<text class="fig-primo-mouse-t" x="526" y="164">rotella Y</text>' +
      '<path class="fig-primo-mouse-guida" d="M524 222H478L436 204"/><circle class="fig-primo-mouse-punto" cx="436" cy="204" r="3"/>' +
      '<text class="fig-primo-mouse-t" x="526" y="214">poten-</text>' +
      '<text class="fig-primo-mouse-t" x="526" y="236">ziometro</text>' +
      '<path class="fig-primo-mouse-guida" d="M524 306H500L494 298"/><circle class="fig-primo-mouse-punto" cx="494" cy="298" r="3"/>' +
      '<text class="fig-primo-mouse-t" x="526" y="312">rotella X</text>' +

      // --- sullo schermo: due tensioni diventano una posizione ---
      '<rect class="fig-primo-mouse-schermo" x="610" y="70" width="166" height="132" rx="14"/>' +
      '<rect class="fig-primo-mouse-vetro" x="622" y="82" width="142" height="108" rx="8"/>' +
      '<path class="fig-primo-mouse-assi" d="M640 160H750M650 96V178"/>' +
      '<g class="fig-primo-mouse-cursore-g"><path class="fig-primo-mouse-cursore" d="M662 160V140l14 14h-8l5 9-4 2-5-9Z"/></g>' +
      '<rect class="fig-primo-mouse-vaso" x="640" y="232" width="30" height="96" rx="4"/>' +
      '<rect class="fig-primo-mouse-livello fig-primo-mouse-lx" x="645" y="237" width="20" height="86" rx="2"/>' +
      '<text class="fig-primo-mouse-asse-t" x="647" y="356">X</text>' +
      '<rect class="fig-primo-mouse-vaso" x="716" y="232" width="30" height="96" rx="4"/>' +
      '<rect class="fig-primo-mouse-livello fig-primo-mouse-ly" x="721" y="237" width="20" height="86" rx="2"/>' +
      '<text class="fig-primo-mouse-asse-t" x="723" y="356">Y</text>' +
      '<text class="fig-primo-mouse-t" x="606" y="390">tensione dei due</text>' +
      '<text class="fig-primo-mouse-t" x="606" y="412">potenziometri</text>' +

      // cartiglio
      '<rect class="fig-primo-mouse-cartiglio" x="34" y="428" width="420" height="50"/>' +
      '<path d="M34 452H454" stroke="var(--fig-ink)" stroke-width="1.5"/>' +
      '<text class="fig-primo-mouse-carti-1" x="46" y="446">INDICATORE DI POSIZIONE X-Y</text>' +
      '<text class="fig-primo-mouse-carti-2" x="46" y="471">SRI, 1964 · disegno di ricostruzione</text>' +
      '</svg>';
  }

  root.ProgStoria.figura('primo-mouse', {
    alt: 'Disegno tecnico del primo mouse, del 1964: dall\'alto è una scatola di legno con un pulsante e un cavo; dal basso si vedono due rotelle metalliche perpendicolari, una per i movimenti a destra e sinistra (X) e una per quelli avanti e indietro (Y), ciascuna collegata a un potenziometro. Quando il mouse si sposta, le rotelle girano e il puntatore sullo schermo si muove allo stesso modo.',
    css: cssMouse,
    disegna() { return svgMouse(); },
  });

  /* ===================== desktop-anni-80 ===================== */

  const cssDesktop = `
    .fig-desktop-anni-80-sfondo { fill: var(--fig-paper); }
    .fig-desktop-anni-80-plastica { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-desktop-anni-80-plastica-2 { fill: var(--fig-2); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-desktop-anni-80-carta { fill: var(--fig-paper); }
    .fig-desktop-anni-80-pieno { fill: var(--fig-ink); }
    .fig-desktop-anni-80-bordo { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-desktop-anni-80-tratto { fill: none; stroke: var(--fig-ink); stroke-width: 2; }
    .fig-desktop-anni-80-sottile { fill: none; stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-desktop-anni-80-zoom { fill: none; stroke: var(--fig-ink); stroke-width: 2; stroke-dasharray: 4 3; opacity: 0; }
    .fig-desktop-anni-80-menu { font: 700 15px var(--font, sans-serif); fill: var(--fig-ink); }
    .fig-desktop-anni-80-tit { font: 700 14px var(--font, sans-serif); fill: var(--fig-ink); }
    .fig-desktop-anni-80-icona-t { font: 600 13px var(--font, sans-serif); fill: var(--fig-ink); }
    .fig-desktop-anni-80-testo { font: 700 22px var(--pg-serif, Georgia, serif); fill: var(--fig-ink); }
    .fig-desktop-anni-80-nota { font: 700 19px var(--font, sans-serif); fill: var(--cap); }
    .fig-desktop-anni-80-guida { fill: none; stroke: var(--cap); stroke-width: 1.5; }
    .fig-desktop-anni-80-punto { fill: var(--cap); }
    .fig-desktop-anni-80-freccia { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.6; stroke-linejoin: round; }

    .fig-desktop-anni-80-puntatore, .fig-desktop-anni-80-fin, .fig-desktop-anni-80-sel, .fig-desktop-anni-80-chiudi, .fig-desktop-anni-80-zoom {
      animation-duration: 11s; animation-iteration-count: infinite;
    }
    .fig-desktop-anni-80-puntatore { transform: translate(436px, 286px); animation-name: fig-desktop-anni-80-vai; animation-timing-function: ease-in-out; }
    .fig-desktop-anni-80-fin { animation-name: fig-desktop-anni-80-apri; animation-timing-function: step-end; }
    .fig-desktop-anni-80-sel { opacity: 0; animation-name: fig-desktop-anni-80-scegli; animation-timing-function: step-end; }
    .fig-desktop-anni-80-chiudi { opacity: 0; animation-name: fig-desktop-anni-80-premi; animation-timing-function: step-end; }
    .fig-desktop-anni-80-z1 { animation-name: fig-desktop-anni-80-z1; animation-timing-function: step-end; }
    .fig-desktop-anni-80-z2 { animation-name: fig-desktop-anni-80-z2; animation-timing-function: step-end; }
    .fig-desktop-anni-80-z3 { animation-name: fig-desktop-anni-80-z3; animation-timing-function: step-end; }
    .fig-desktop-anni-80-z4 { animation-name: fig-desktop-anni-80-z4; animation-timing-function: step-end; }
    @keyframes fig-desktop-anni-80-vai {
      0%, 4% { transform: translate(436px, 286px); }
      18%, 36% { transform: translate(602px, 200px); }
      52%, 60% { transform: translate(318px, 165px); }
      78%, 100% { transform: translate(436px, 286px); }
    }
    @keyframes fig-desktop-anni-80-apri { 0% { opacity: 0; } 34% { opacity: 1; } 58% { opacity: 0; } 100% { opacity: 0; } }
    @keyframes fig-desktop-anni-80-scegli { 0% { opacity: 0; } 19% { opacity: 1; } 20.5% { opacity: 0; } 22% { opacity: 1; } 58.5% { opacity: 0; } 100% { opacity: 0; } }
    @keyframes fig-desktop-anni-80-premi { 0% { opacity: 0; } 55% { opacity: 1; } 57.5% { opacity: 0; } 100% { opacity: 0; } }
    @keyframes fig-desktop-anni-80-z1 { 0% { opacity: 0; } 25% { opacity: 1; } 27.5% { opacity: 0; } 100% { opacity: 0; } }
    @keyframes fig-desktop-anni-80-z2 { 0% { opacity: 0; } 27.5% { opacity: 1; } 30% { opacity: 0; } 100% { opacity: 0; } }
    @keyframes fig-desktop-anni-80-z3 { 0% { opacity: 0; } 30% { opacity: 1; } 32% { opacity: 0; } 100% { opacity: 0; } }
    @keyframes fig-desktop-anni-80-z4 { 0% { opacity: 0; } 32% { opacity: 1; } 34% { opacity: 0; } 100% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      .fig-desktop-anni-80-puntatore, .fig-desktop-anni-80-fin, .fig-desktop-anni-80-sel, .fig-desktop-anni-80-chiudi, .fig-desktop-anni-80-zoom { animation: none; }
      .fig-desktop-anni-80-sel { opacity: 1; }
    }
  `;

  // Una finestra del 1984: barra del titolo a righe, casella di chiusura, barre di scorrimento.
  function finestra(x, y, w, hh, titolo, retino) {
    const righe = [];
    for (let i = 0; i < 6; i++) righe.push('<path d="M' + (x + 4) + ' ' + (y + 5 + i * 2.6).toFixed(1) + 'H' + (x + w - 4) + '" stroke="var(--fig-ink)" stroke-width="1.2"/>');
    const lt = titolo.length * 8 + 18;
    return '<rect x="' + (x + 3) + '" y="' + (y + 3) + '" width="' + w + '" height="' + hh + '" class="fig-desktop-anni-80-pieno"/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" class="fig-desktop-anni-80-bordo"/>' +
      righe.join('') +
      '<path d="M' + x + ' ' + (y + 22) + 'H' + (x + w) + '" class="fig-desktop-anni-80-tratto"/>' +
      '<rect x="' + (x + 10) + '" y="' + (y + 5) + '" width="13" height="13" class="fig-desktop-anni-80-bordo"/>' +
      '<rect x="' + (x + w / 2 - lt / 2) + '" y="' + (y + 3) + '" width="' + lt + '" height="17" class="fig-desktop-anni-80-carta"/>' +
      '<text class="fig-desktop-anni-80-tit" x="' + (x + w / 2) + '" y="' + (y + 16) + '" text-anchor="middle">' + titolo + '</text>' +
      '<rect x="' + (x + w - 16) + '" y="' + (y + 22) + '" width="16" height="' + (hh - 38) + '" fill="url(#' + retino + ')" stroke="var(--fig-ink)" stroke-width="1.5"/>' +
      '<rect x="' + x + '" y="' + (y + hh - 16) + '" width="' + (w - 16) + '" height="16" fill="url(#' + retino + ')" stroke="var(--fig-ink)" stroke-width="1.5"/>' +
      '<rect x="' + (x + w - 16) + '" y="' + (y + hh - 16) + '" width="16" height="16" class="fig-desktop-anni-80-bordo"/>' +
      '<rect x="' + (x + w - 15) + '" y="' + (y + 52) + '" width="14" height="14" class="fig-desktop-anni-80-bordo"/>' +
      '<rect x="' + (x + 70) + '" y="' + (y + hh - 15) + '" width="14" height="14" class="fig-desktop-anni-80-bordo"/>';
  }

  function icona(x, y, tipo, nome) {
    let disegno;
    if (tipo === 'disco') {
      disegno = '<rect x="' + x + '" y="' + y + '" width="34" height="34" rx="2" class="fig-desktop-anni-80-bordo"/>' +
        '<rect x="' + (x + 8) + '" y="' + y + '" width="18" height="11" class="fig-desktop-anni-80-pieno"/>' +
        '<rect x="' + (x + 18) + '" y="' + (y + 2) + '" width="4" height="7" class="fig-desktop-anni-80-carta"/>' +
        '<rect x="' + (x + 6) + '" y="' + (y + 18) + '" width="22" height="14" class="fig-desktop-anni-80-sottile"/>';
    } else if (tipo === 'foglio') {
      disegno = '<path d="M' + (x + 4) + ' ' + y + 'H' + (x + 22) + 'L' + (x + 31) + ' ' + (y + 9) + 'V' + (y + 36) + 'H' + (x + 4) + 'Z" class="fig-desktop-anni-80-bordo"/>' +
        '<path d="M' + (x + 22) + ' ' + y + 'V' + (y + 9) + 'H' + (x + 31) + '" class="fig-desktop-anni-80-sottile"/>' +
        '<path d="M' + (x + 9) + ' ' + (y + 16) + 'H' + (x + 26) + 'M' + (x + 9) + ' ' + (y + 22) + 'H' + (x + 26) + 'M' + (x + 9) + ' ' + (y + 28) + 'H' + (x + 21) + '" class="fig-desktop-anni-80-sottile"/>';
    } else {
      disegno = '<path d="M' + (x + 6) + ' ' + (y + 8) + 'H' + (x + 30) + 'L' + (x + 27) + ' ' + (y + 36) + 'H' + (x + 9) + 'Z" class="fig-desktop-anni-80-bordo"/>' +
        '<path d="M' + (x + 3) + ' ' + (y + 6) + 'H' + (x + 33) + 'M' + (x + 14) + ' ' + (y + 6) + 'V' + (y + 2) + 'H' + (x + 22) + 'V' + (y + 6) + 'M' + (x + 13) + ' ' + (y + 13) + 'V' + (y + 31) + 'M' + (x + 18) + ' ' + (y + 13) + 'V' + (y + 31) + 'M' + (x + 23) + ' ' + (y + 13) + 'V' + (y + 31) + '" class="fig-desktop-anni-80-sottile"/>';
    }
    const lw = nome.length * 7.4 + 10;
    return disegno +
      '<rect x="' + (x + 17 - lw / 2) + '" y="' + (y + 40) + '" width="' + lw + '" height="17" class="fig-desktop-anni-80-carta"/>' +
      '<text class="fig-desktop-anni-80-icona-t" x="' + (x + 17) + '" y="' + (y + 53) + '" text-anchor="middle">' + nome + '</text>';
  }

  function svgDesktop(ctx) {
    const id = (ctx && ctx.uid ? ctx.uid('fig-desktop') : 'fig-desktop-1');
    const retino = id + '-r';
    const retino2 = id + '-s';
    const ritaglio = id + '-c';
    // rettangoli dello «zoom»: dall'icona «Lettera» (590..624, 176..212) alla finestra (300..560, 150..344)
    const da = { x: 590, y: 176, w: 34, h: 36 };
    const a = { x: 300, y: 150, w: 260, h: 194 };
    const zoom = [0.2, 0.42, 0.66, 0.88].map((t, i) => {
      const x = da.x + (a.x - da.x) * t;
      const y = da.y + (a.y - da.y) * t;
      const w = da.w + (a.w - da.w) * t;
      const hh = da.h + (a.h - da.h) * t;
      return '<rect class="fig-desktop-anni-80-zoom fig-desktop-anni-80-z' + (i + 1) + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + hh.toFixed(1) + '"/>';
    }).join('');
    const righeTesto = [];
    for (let i = 0; i < 5; i++) righeTesto.push('<rect x="316" y="' + (236 + i * 15) + '" width="' + [210, 188, 220, 160, 120][i] + '" height="6" fill="url(#' + retino2 + ')"/>');

    return '<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<pattern id="' + retino + '" width="4" height="4" patternUnits="userSpaceOnUse">' +
          '<rect width="4" height="4" class="fig-desktop-anni-80-carta"/>' +
          '<rect width="1.4" height="1.4" class="fig-desktop-anni-80-pieno"/><rect x="2" y="2" width="1.4" height="1.4" class="fig-desktop-anni-80-pieno"/>' +
        '</pattern>' +
        '<pattern id="' + retino2 + '" width="3" height="3" patternUnits="userSpaceOnUse">' +
          '<rect width="3" height="3" class="fig-desktop-anni-80-carta"/><rect width="1.5" height="1.5" class="fig-desktop-anni-80-pieno"/><rect x="1.5" y="1.5" width="1.5" height="1.5" class="fig-desktop-anni-80-pieno"/>' +
        '</pattern>' +
        '<clipPath id="' + ritaglio + '"><rect x="160" y="62" width="480" height="318" rx="6"/></clipPath>' +
      '</defs>' +
      '<rect class="fig-desktop-anni-80-sfondo" width="800" height="500"/>' +

      // monitor generico
      '<path class="fig-desktop-anni-80-plastica-2" d="M340 424H460L474 458H326Z"/>' +
      '<rect class="fig-desktop-anni-80-plastica" x="280" y="456" width="240" height="16" rx="5"/>' +
      '<rect class="fig-desktop-anni-80-plastica" x="128" y="30" width="544" height="398" rx="28"/>' +
      '<rect class="fig-desktop-anni-80-plastica-2" x="146" y="48" width="508" height="346" rx="14"/>' +
      '<circle cx="626" cy="410" r="5" fill="var(--fig-glow)" stroke="var(--fig-ink)" stroke-width="1.5"/>' +

      // lo schermo a 1 bit
      '<g clip-path="url(#' + ritaglio + ')">' +
        '<rect x="160" y="62" width="480" height="318" fill="url(#' + retino + ')"/>' +
        '<rect x="160" y="62" width="480" height="22" class="fig-desktop-anni-80-carta"/>' +
        '<path d="M160 84H640" class="fig-desktop-anni-80-tratto"/>' +
        '<path d="M178 67l6 6-6 6-6-6Z" class="fig-desktop-anni-80-pieno"/>' +
        '<text class="fig-desktop-anni-80-menu" x="200" y="79">File</text>' +
        '<text class="fig-desktop-anni-80-menu" x="244" y="79">Modifica</text>' +
        '<text class="fig-desktop-anni-80-menu" x="324" y="79">Vista</text>' +
        '<text class="fig-desktop-anni-80-menu" x="374" y="79">Speciale</text>' +

        // icone
        icona(590, 100, 'disco', 'Sistema') +
        icona(590, 176, 'foglio', 'Lettera') +
        '<g class="fig-desktop-anni-80-sel">' +
          '<path d="M594 176H612L621 185V212H594Z" class="fig-desktop-anni-80-pieno"/>' +
          '<rect x="580" y="216" width="64" height="17" class="fig-desktop-anni-80-pieno"/>' +
          '<text class="fig-desktop-anni-80-icona-t" x="607" y="229" text-anchor="middle" style="fill: var(--fig-paper)">Lettera</text>' +
        '</g>' +
        icona(590, 300, 'cestino', 'Cestino') +

        // finestra di disegno, dietro
        finestra(184, 104, 276, 200, 'Disegno', retino2) +
        '<circle cx="262" cy="196" r="34" class="fig-desktop-anni-80-tratto"/>' +
        '<rect x="300" y="160" width="64" height="64" fill="url(#' + retino2 + ')" stroke="var(--fig-ink)" stroke-width="2"/>' +
        '<path d="M214 268 252 236 276 254 316 222 360 262" class="fig-desktop-anni-80-tratto"/>' +
        '<path d="M380 140l9 24 25 0-20 15 8 24-22-15-21 15 8-24-20-15 25 0Z" class="fig-desktop-anni-80-tratto"/>' +

        zoom +

        // finestra «Lettera», davanti: si apre con il doppio clic sull'icona
        '<g class="fig-desktop-anni-80-fin">' +
          finestra(300, 150, 260, 194, 'Lettera', retino2) +
          '<text class="fig-desktop-anni-80-testo" x="316" y="206">Ciao, mondo!</text>' +
          righeTesto.join('') +
          '<rect class="fig-desktop-anni-80-chiudi fig-desktop-anni-80-pieno" x="310" y="155" width="13" height="13"/>' +
        '</g>' +

        // il puntatore
        '<g class="fig-desktop-anni-80-puntatore"><path class="fig-desktop-anni-80-freccia" d="M0 0V24L6 18.5 10.5 28.5 15 26.5 10.5 16.8H18Z"/></g>' +
      '</g>' +

      // didascalie
      '<path class="fig-desktop-anni-80-guida" d="M118 92H138L170 74"/><circle class="fig-desktop-anni-80-punto" cx="170" cy="74" r="3.5"/>' +
      '<text class="fig-desktop-anni-80-nota" x="22" y="86">barra</text>' +
      '<text class="fig-desktop-anni-80-nota" x="22" y="108">dei menu</text>' +
      '<path class="fig-desktop-anni-80-guida" d="M118 196H150L190 160"/><circle class="fig-desktop-anni-80-punto" cx="190" cy="160" r="3.5"/>' +
      '<text class="fig-desktop-anni-80-nota" x="22" y="190">finestre</text>' +
      '<text class="fig-desktop-anni-80-nota" x="22" y="212">sovrapposte</text>' +
      '<path class="fig-desktop-anni-80-guida" d="M686 128H664L628 118"/><circle class="fig-desktop-anni-80-punto" cx="628" cy="118" r="3.5"/>' +
      '<text class="fig-desktop-anni-80-nota" x="690" y="134">icone</text>' +
      '<path class="fig-desktop-anni-80-guida" d="M686 280H664L616 330"/><circle class="fig-desktop-anni-80-punto" cx="616" cy="330" r="3.5"/>' +
      '<text class="fig-desktop-anni-80-nota" x="690" y="274">sfondo</text>' +
      '<text class="fig-desktop-anni-80-nota" x="690" y="296">a retino</text>' +
      '</svg>';
  }

  root.ProgStoria.figura('desktop-anni-80', {
    alt: 'Uno schermo in bianco e nero degli anni Ottanta dentro un monitor: in alto la barra dei menu (File, Modifica, Vista, Speciale), a destra le icone Sistema, Lettera e Cestino, al centro una finestra con un disegno. Il puntatore va sull\'icona Lettera, fa doppio clic, una serie di rettangoli tratteggiati si allarga e si apre la finestra «Lettera» con la scritta «Ciao, mondo!»; poi il puntatore la chiude con la casella in alto a sinistra.',
    css: cssDesktop,
    disegna(ctx) { return svgDesktop(ctx); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
