/*
 * Illustrazioni del capitolo 2 · La logica diventa macchina.
 *   rele-shannon  due circuiti a relè come nella tesi di Shannon (1937): contatti in serie (A e B, AND)
 *                 e in parallelo (A o B, OR); le combinazioni scorrono come le righe di una tavola di verità
 * Colori dalla tavolozza --fig-* e --cap, così il disegno segue il tema chiaro o scuro.
 */
(function (root) {
  'use strict';
  if (!root.ProgStoria) return;

  const n2 = (v) => Math.round(v * 100) / 100;

  /* ===================== rele-shannon ===================== */

  const RS = 'fig-rele-shannon';
  const DURATA = 10;              // secondi per le quattro righe della tavola
  const D = 2;                    // durata di uno scatto, in percentuale del ciclo
  // le quattro righe: A e B (0 = aperto, 1 = chiuso)
  const RIGHE = [[0, 0], [0, 1], [1, 0], [1, 1]];
  const SERIE = RIGHE.map((r) => r[0] & r[1]);
  const PARALLELO = RIGHE.map((r) => r[0] | r[1]);
  const FERMO = 1;                // con il movimento ridotto si vede la riga A = 0, B = 1: la differenza fra i due circuiti

  // stato che resta per tutta la riga e scatta alla fine (l'ultima riga torna alla prima)
  function kfRighe(nome, valori, decl) {
    const p = [];
    valori.forEach((v, i) => { p.push(n2(25 * i) + '% { ' + decl(v) + ' }', n2(25 * (i + 1) - D) + '% { ' + decl(v) + ' }'); });
    p.push('100% { ' + decl(valori[0]) + ' }');
    return '@keyframes ' + nome + ' { ' + p.join(' ') + ' }';
  }

  const op = (v) => 'opacity: ' + v;
  const aperto = -17;             // gradi di apertura della lamina
  const lam = (v) => 'transform: rotate(' + (v ? 0 : aperto) + 'deg)';
  const riga = (v) => 'transform: translateY(' + (v * 28) + 'px)';
  const A = RIGHE.map((r) => r[0]), B = RIGHE.map((r) => r[1]);

  const cssRele = `
    .${RS}-sfondo { fill: var(--fig-paper); }
    .${RS}-griglia { fill: none; stroke: var(--fig-line); stroke-width: 1; opacity: .16; }
    .${RS}-filo { fill: none; stroke: var(--fig-ink); stroke-width: 2.6; stroke-linejoin: round; stroke-linecap: round; }
    .${RS}-corrente { fill: none; stroke: var(--fig-warm); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 2 12; opacity: 0; }
    .${RS}-lamina { fill: none; stroke: var(--fig-ink); stroke-width: 4; stroke-linecap: round; }
    .${RS}-ancora { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.4; }
    .${RS}-morsetto { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; }
    .${RS}-nodo { fill: var(--fig-ink); }
    .${RS}-bobina { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; }
    .${RS}-avvolgimento { fill: none; stroke: var(--fig-ink); stroke-width: 1.3; }
    .${RS}-polo { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${RS}-eccita { fill: var(--cap); opacity: 0; }
    .${RS}-ingresso { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; }
    .${RS}-anello { fill: none; stroke: var(--cap); stroke-width: 4.5; opacity: 0; }
    .${RS}-lettera { font: 800 18px var(--font, sans-serif); fill: var(--fig-ink); text-anchor: middle; }
    .${RS}-pila-l { fill: none; stroke: var(--fig-ink); stroke-width: 2.6; stroke-linecap: round; }
    .${RS}-pila-c { fill: none; stroke: var(--fig-ink); stroke-width: 5; }
    .${RS}-bulbo { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2.6; }
    .${RS}-luce { fill: var(--fig-warm); opacity: 0; }
    .${RS}-alone { fill: var(--fig-warm); opacity: 0; }
    .${RS}-croce { fill: none; stroke: var(--fig-ink); stroke-width: 2.4; stroke-linecap: round; }
    .${RS}-divisore { fill: none; stroke: var(--fig-line); stroke-width: 1.5; stroke-dasharray: 4 6; }
    .${RS}-tit { font: 800 15px var(--mono, monospace); fill: var(--fig-ink); letter-spacing: .1em; }
    .${RS}-t { font: 700 19px var(--font, sans-serif); fill: var(--fig-ink); }
    .${RS}-segno { font: 700 16px var(--mono, monospace); fill: var(--fig-ink); }
    .${RS}-tab { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.6; }
    .${RS}-tab-l { fill: none; stroke: var(--fig-line); stroke-width: 1.2; }
    .${RS}-tab-h { font: 700 16px var(--font, sans-serif); fill: var(--fig-ink); text-anchor: middle; }
    .${RS}-tab-v { font: 700 18px var(--mono, monospace); fill: var(--fig-ink); text-anchor: middle; }
    .${RS}-tab-on { fill: var(--fig-warm); }
    .${RS}-evidenza { fill: var(--cap); fill-opacity: .16; stroke: var(--cap); stroke-width: 2.5; }
    .${RS}-nota { font: 600 16px var(--font, sans-serif); fill: var(--fig-ink); }

    .${RS}-a { animation-duration: ${DURATA}s; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
    .${RS}-dopo { animation-delay: .15s; }
    .${RS}-lam-a, .${RS}-lam-b { transform-box: view-box; transform: rotate(${aperto}deg); }
    .${RS}-lam-a { animation-name: ${RS}-k-lam-a; }
    .${RS}-lam-b { animation-name: ${RS}-k-lam-b; }
    .${RS}-on-a { animation-name: ${RS}-k-on-a; }
    .${RS}-on-b { animation-name: ${RS}-k-on-b; }
    .${RS}-on-s { animation-name: ${RS}-k-on-s; }
    .${RS}-on-p { animation-name: ${RS}-k-on-p; }
    .${RS}-corrente.${RS}-on-a { animation-name: ${RS}-k-on-a, ${RS}-k-scorre; }
    .${RS}-corrente.${RS}-on-b { animation-name: ${RS}-k-on-b, ${RS}-k-scorre; }
    .${RS}-corrente.${RS}-on-s { animation-name: ${RS}-k-on-s, ${RS}-k-scorre; }
    .${RS}-corrente.${RS}-on-p { animation-name: ${RS}-k-on-p, ${RS}-k-scorre; }
    .${RS}-corrente.${RS}-a { animation-duration: ${DURATA}s, .9s; animation-timing-function: ease-in-out, linear; }
    .${RS}-riga { animation-name: ${RS}-k-riga; }
    ${kfRighe(RS + '-k-lam-a', A, lam)}
    ${kfRighe(RS + '-k-lam-b', B, lam)}
    ${kfRighe(RS + '-k-on-a', A, op)}
    ${kfRighe(RS + '-k-on-b', B, op)}
    ${kfRighe(RS + '-k-on-s', SERIE, op)}
    ${kfRighe(RS + '-k-on-p', PARALLELO, op)}
    ${kfRighe(RS + '-k-riga', [0, 1, 2, 3], riga)}
    @keyframes ${RS}-k-scorre { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -28; } }
    @media (prefers-reduced-motion: reduce) {
      .${RS}-a { animation: none; }
      .${RS}-lam-a { ${lam(A[FERMO])}; }
      .${RS}-lam-b { ${lam(B[FERMO])}; }
      .${RS}-on-a { ${op(A[FERMO])}; }
      .${RS}-on-b { ${op(B[FERMO])}; }
      .${RS}-on-s { ${op(SERIE[FERMO])}; }
      .${RS}-on-p { ${op(PARALLELO[FERMO])}; }
      .${RS}-riga { ${riga(FERMO)}; }
    }
  `;

  // un relè: lamina fra il perno (px, py) e il contatto fisso, bobina sotto, ingresso a sinistra della bobina
  function rele(px, py, nome) {
    const k = nome.toLowerCase();
    const c = (s) => RS + '-' + s;
    const av = [];
    for (let x = px + 18; x <= px + 42; x += 6) av.push('M' + x + ' ' + (py + 22) + 'v24');
    return '' +
      // bobina con il suo nucleo: quando l'ingresso vale 1 si colora e attira la lamina
      '<rect class="' + c('bobina') + '" x="' + (px + 14) + '" y="' + (py + 20) + '" width="32" height="28" rx="4"/>' +
      '<path class="' + c('avvolgimento') + '" d="' + av.join('') + '"/>' +
      '<rect class="' + c('a') + ' ' + c('eccita') + ' ' + c('on-' + k) + '" x="' + (px + 14) + '" y="' + (py + 20) + '" width="32" height="28" rx="4" style="fill-opacity:.55"/>' +
      '<rect class="' + c('polo') + '" x="' + (px + 22) + '" y="' + (py + 13) + '" width="16" height="7"/>' +
      '<path class="' + c('filo') + '" d="M' + (px + 8) + ' ' + (py + 34) + 'H' + (px + 14) + '" style="stroke-width:2"/>' +
      '<circle class="' + c('ingresso') + '" cx="' + (px - 4) + '" cy="' + (py + 34) + '" r="13"/>' +
      '<circle class="' + c('a') + ' ' + c('anello') + ' ' + c('on-' + k) + '" cx="' + (px - 4) + '" cy="' + (py + 34) + '" r="13"/>' +
      '<text class="' + c('lettera') + '" x="' + (px - 4) + '" y="' + (py + 40) + '">' + nome + '</text>' +
      // contatto fisso e lamina mobile (con la sua ancora di ferro)
      '<circle class="' + c('morsetto') + '" cx="' + (px + 54) + '" cy="' + py + '" r="4.5"/>' +
      '<g class="' + c('a') + ' ' + c('lam-' + k) + '" style="transform-origin:' + px + 'px ' + py + 'px">' +
        '<rect class="' + c('ancora') + '" x="' + (px + 20) + '" y="' + (py + 2) + '" width="20" height="5" rx="1"/>' +
        '<path class="' + c('lamina') + '" d="M' + px + ' ' + py + 'H' + (px + 51) + '"/>' +
      '</g>' +
      '<circle class="' + c('morsetto') + '" cx="' + px + '" cy="' + py + '" r="4.5"/>';
  }

  function pila(x, y) {
    const c = (s) => RS + '-' + s;
    return '<path class="' + c('pila-l') + '" d="M' + (x - 15) + ' ' + y + 'H' + (x + 15) + 'M' + (x - 15) + ' ' + (y + 20) + 'H' + (x + 15) + '"/>' +
      '<path class="' + c('pila-c') + '" d="M' + (x - 8) + ' ' + (y + 9) + 'H' + (x + 8) + 'M' + (x - 8) + ' ' + (y + 29) + 'H' + (x + 8) + '"/>' +
      '<text class="' + c('segno') + '" x="' + (x + 20) + '" y="' + (y + 5) + '">+</text>';
  }

  function lampada(x, y, k) {
    const c = (s) => RS + '-' + s;
    const r = 20, d = n2(r * 0.7);
    return '<circle class="' + c('a') + ' ' + c('dopo') + ' ' + c('alone') + ' ' + c('on-' + k) + '" cx="' + x + '" cy="' + y + '" r="36" style="fill-opacity:.3"/>' +
      '<circle class="' + c('bulbo') + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>' +
      '<circle class="' + c('a') + ' ' + c('dopo') + ' ' + c('luce') + ' ' + c('on-' + k) + '" cx="' + x + '" cy="' + y + '" r="' + (r - 1.3) + '"/>' +
      '<path class="' + c('croce') + '" d="M' + n2(x - d) + ' ' + n2(y - d) + 'L' + n2(x + d) + ' ' + n2(y + d) + 'M' + n2(x + d) + ' ' + n2(y - d) + 'L' + n2(x - d) + ' ' + n2(y + d) + '"/>';
  }

  function svgRele() {
    const c = (s) => RS + '-' + s;
    const out = [];
    const g = [];
    for (let x = 40; x < 800; x += 40) g.push('M' + x + ' 0V500');
    for (let y = 40; y < 500; y += 40) g.push('M0 ' + y + 'H800');
    out.push('<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">');
    out.push('<rect class="' + c('sfondo') + '" width="800" height="500"/><path class="' + c('griglia') + '" d="' + g.join('') + '"/>');
    out.push('<path class="' + c('divisore') + '" d="M400 24V312"/>');
    out.push('<text class="' + c('tit') + '" x="30" y="44">IN SERIE · A E B (AND)</text>');
    out.push('<text class="' + c('tit') + '" x="424" y="44">IN PARALLELO · A O B (OR)</text>');

    // ---- in serie: la corrente deve attraversare A e poi B ----
    const yS = 96, yG = 300;
    const anelloSerie = 'M60 186V' + yS + 'H340V170M340 210V' + yG + 'H60V216';
    out.push('<path class="' + c('filo') + '" d="M60 186V' + yS + 'H110M164 ' + yS + 'H214M268 ' + yS + 'H340V170M340 210V' + yG + 'H60V216"/>');
    out.push('<path class="' + c('a') + ' ' + c('dopo') + ' ' + c('corrente') + ' ' + c('on-s') + '" d="' + anelloSerie + '"/>');
    out.push(pila(60, 186));
    out.push(rele(110, yS, 'A'));
    out.push(rele(214, yS, 'B'));
    out.push(lampada(340, 190, 's'));
    out.push('<text class="' + c('t') + '" x="84" y="214">pila</text>');
    out.push('<path class="' + RS + '-tab-l" d="M166 166L154 148" style="stroke:var(--cap);stroke-width:1.5"/><circle cx="154" cy="148" r="3.5" fill="var(--cap)"/>');
    out.push('<text class="' + c('t') + '" x="150" y="186">relè</text>');
    out.push('<text class="' + c('t') + '" x="308" y="252" text-anchor="end">lampada</text>');
    out.push('<path class="' + RS + '-tab-l" d="M308 246L326 206" style="stroke:var(--cap);stroke-width:1.5"/><circle cx="326" cy="206" r="3.5" fill="var(--cap)"/>');

    // ---- in parallelo: due strade, ne basta una ----
    const yA = 96, yB = 206, j1 = 490, j2 = 640;
    out.push('<path class="' + c('filo') + '" d="M450 186V' + yA + 'H530M584 ' + yA + 'H720V170M720 210V' + yG + 'H450V216' +
      'M' + j1 + ' ' + yA + 'V' + yB + 'H530M584 ' + yB + 'H' + j2 + 'V' + yA + '"/>');
    out.push('<path class="' + c('a') + ' ' + c('dopo') + ' ' + c('corrente') + ' ' + c('on-p') + '" d="M450 186V' + yA + 'H' + j1 + 'M' + j2 + ' ' + yA + 'H720V170M720 210V' + yG + 'H450V216"/>');
    out.push('<path class="' + c('a') + ' ' + c('dopo') + ' ' + c('corrente') + ' ' + c('on-a') + '" d="M' + j1 + ' ' + yA + 'H' + j2 + '"/>');
    out.push('<path class="' + c('a') + ' ' + c('dopo') + ' ' + c('corrente') + ' ' + c('on-b') + '" d="M' + j1 + ' ' + yA + 'V' + yB + 'H' + j2 + 'V' + yA + '"/>');
    out.push(pila(450, 186));
    out.push(rele(530, yA, 'A'));
    out.push(rele(530, yB, 'B'));
    out.push(lampada(720, 190, 'p'));
    out.push('<circle class="' + c('nodo') + '" cx="' + j1 + '" cy="' + yA + '" r="4.5"/><circle class="' + c('nodo') + '" cx="' + j2 + '" cy="' + yA + '" r="4.5"/>');

    // ---- tavola di verità: la riga evidenziata è quella che i circuiti stanno mostrando ----
    const tx = 214, ty = 330, cols = [62, 62, 138, 138], h = 28;
    const xs = [tx];
    cols.forEach((w) => xs.push(xs[xs.length - 1] + w));
    out.push('<rect class="' + c('tab') + '" x="' + tx + '" y="' + ty + '" width="' + (xs[4] - tx) + '" height="' + (h * 5) + '"/>');
    out.push('<rect class="' + c('a') + ' ' + c('riga') + ' ' + c('evidenza') + '" x="' + tx + '" y="' + (ty + h) + '" width="' + (xs[4] - tx) + '" height="' + h + '"/>');
    const linee = ['M' + tx + ' ' + (ty + h) + 'H' + xs[4]];
    for (let i = 1; i < 4; i++) linee.push('M' + xs[i] + ' ' + ty + 'v' + (h * 5));
    out.push('<path class="' + c('tab-l') + '" d="' + linee.join('') + '"/>');
    ['A', 'B', 'in serie', 'in parallelo'].forEach((t, i) => {
      out.push('<text class="' + c('tab-h') + '" x="' + ((xs[i] + xs[i + 1]) / 2) + '" y="' + (ty + 20) + '">' + t + '</text>');
    });
    RIGHE.forEach((r, k) => {
      const y = ty + h * (k + 1) + 20;
      [r[0], r[1], SERIE[k], PARALLELO[k]].forEach((v, i) => {
        const x = (xs[i] + xs[i + 1]) / 2;
        if (i >= 2 && v) out.push('<circle class="' + c('tab-on') + '" cx="' + (x + 22) + '" cy="' + (y - 6) + '" r="6"/>');
        out.push('<text class="' + c('tab-v') + '" x="' + x + '" y="' + y + '">' + v + '</text>');
      });
    });
    out.push('<text class="' + c('nota') + '" x="30" y="390">1 = chiuso, acceso</text>');
    out.push('<text class="' + c('nota') + '" x="30" y="414">0 = aperto, spento</text>');
    out.push('</svg>');
    return out.join('');
  }

  root.ProgStoria.figura('rele-shannon', {
    alt: 'Due circuiti elettrici affiancati, ciascuno con una pila, una lampada e due relè chiamati A e B. Ogni relè ha una bobina che, quando il suo ingresso vale 1, attira una lamina e chiude il contatto. A sinistra i contatti A e B sono uno dopo l\'altro, in serie: la lampada si accende solo quando sono chiusi tutti e due. A destra sono su due strade affiancate, in parallelo: basta che se ne chiuda uno. Sotto, una tavola di verità con le quattro combinazioni di A e B; la riga evidenziata scorre mentre i contatti si aprono e si chiudono e le lampade si accendono di conseguenza.',
    css: cssRele,
    disegna() { return svgRele(); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
