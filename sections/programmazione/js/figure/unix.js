/*
 * Illustrazioni del capitolo 8 · Unix, C e i piccoli strumenti.
 *   pdp-11   la postazione dei primi Unix (Bell Labs, 1972 circa): telescrivente ASR-33, due persone
 *            stilizzate, gli armadi del PDP-11/20 con i DECtape e, in alto, il pannello frontale ingrandito
 * Colori dalla tavolozza --fig-* e --cap, così il disegno segue il tema chiaro o scuro.
 */
(function (root) {
  'use strict';
  if (!root.ProgStoria) return;

  const P = 'fig-pdp-11';
  const f = (n) => Math.round(n * 10) / 10;

  /* ===================== pdp-11 ===================== */

  const css = `
    .${P}-sfondo { fill: var(--fig-paper); }
    .${P}-griglia { stroke: var(--fig-line); stroke-width: 1; opacity: .16; }
    .${P}-pavimento { fill: var(--fig-1); }
    .${P}-tratto { fill: none; stroke: var(--fig-ink); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .${P}-sottile { fill: none; stroke: var(--fig-ink); stroke-width: 1.3; opacity: .55; }
    .${P}-pannello { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; }
    .${P}-armadio { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; }
    .${P}-cieco { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${P}-fascia { fill: var(--fig-2); stroke: var(--fig-ink); stroke-width: 2; }
    .${P}-zoccolo { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; }
    .${P}-feritoia { fill: none; stroke: var(--fig-ink); stroke-width: 1.5; stroke-linecap: round; opacity: .45; }
    .${P}-flangia { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${P}-bobina { fill: var(--fig-4); }
    .${P}-mozzo { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1; }
    .${P}-leva-a { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${P}-leva-b { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${P}-leva-c { fill: var(--fig-2); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${P}-leva-t { fill: var(--fig-ink); opacity: .7; }
    .${P}-lampada { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${P}-lampada-p { fill: var(--fig-paper); }
    .${P}-alone { fill: var(--fig-warm); opacity: .38; }
    .${P}-acceso { fill: var(--fig-warm); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${P}-acceso-p { fill: var(--fig-warm); }
    .${P}-luce { opacity: 0; animation-timing-function: step-end; animation-iteration-count: infinite; }
    .${P}-on { opacity: 1; }
    .${P}-k1 { animation-name: ${P}-k1; }
    .${P}-k2 { animation-name: ${P}-k2; }
    .${P}-k3 { animation-name: ${P}-k3; }
    .${P}-conta { animation-name: ${P}-conta; }
    @keyframes ${P}-k1 { 0% { opacity: 0; } 15% { opacity: 1; } 40% { opacity: 0; } 55% { opacity: 1; } 85% { opacity: 0; } 100% { opacity: 0; } }
    @keyframes ${P}-k2 { 0% { opacity: 1; } 30% { opacity: 0; } 50% { opacity: 1; } 65% { opacity: 0; } 90% { opacity: 1; } 100% { opacity: 1; } }
    @keyframes ${P}-k3 { 0% { opacity: 0; } 45% { opacity: 1; } 70% { opacity: 0; } 100% { opacity: 0; } }
    @keyframes ${P}-conta { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 1; } }
    .${P}-scocca { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .${P}-piede { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; }
    .${P}-tasto { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1; }
    .${P}-unita { fill: var(--fig-2); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${P}-vetro { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.3; }
    .${P}-carta-o { fill: none; stroke: var(--fig-ink); stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; }
    .${P}-carta { fill: none; stroke: var(--fig-paper); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
    .${P}-nastro-o { fill: none; stroke: var(--fig-ink); stroke-width: 11; stroke-linejoin: round; }
    .${P}-nastro { fill: none; stroke: var(--fig-2); stroke-width: 8; stroke-linejoin: round; }
    .${P}-fori { fill: none; stroke: var(--fig-ink); stroke-width: 2.2; stroke-linecap: round; stroke-dasharray: 0.1 5; }
    .${P}-sedia { fill: var(--fig-2); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .${P}-sagoma { fill: var(--fig-ink); opacity: .86; }
    .${P}-lente { fill: none; stroke: var(--cap); stroke-width: 2; stroke-dasharray: 6 4; }
    .${P}-lente-alone { fill: none; stroke: var(--fig-paper); stroke-width: 6; }
    .${P}-guida { fill: none; stroke: var(--cap); stroke-width: 1.5; }
    .${P}-punto { fill: var(--cap); }
    .${P}-freccia { fill: var(--cap); }
    .${P}-t { font: 700 18px var(--font, sans-serif); fill: var(--fig-ink); }
    .${P}-tit { font: 800 16px var(--mono, monospace); fill: var(--fig-ink); letter-spacing: .1em; }
    .${P}-serigrafia { font: 800 15px var(--mono, monospace); fill: var(--fig-ink); letter-spacing: .06em; }
    @media (prefers-reduced-motion: reduce) {
      .${P}-luce { animation: none !important; }
    }
  `;

  // colonne dei bit nel pannello ingrandito: 18 bit a gruppi di tre (la notazione ottale della DEC)
  const colonna = (i) => 191 + 22 * i + 8 * Math.floor(i / 3);
  // le stesse colonne nel pannellino dentro l'armadio
  const colonnaP = (i) => 611 + 3.3 * i + 1.6 * Math.floor(i / 3);

  // Come si accende ogni lucina: [classe dell'animazione, durata in s, ritardo in s, accesa da ferma]
  const fisso = (acceso) => ['', 0, 0, acceso];
  const LUCI_IND = [];
  for (let i = 0; i < 18; i++) {
    const k = 'k' + (((i * 7) + 3) % 3 + 1);
    LUCI_IND.push([k, 2.4 + ((i * 37) % 23) / 10, -(((i * 53) % 41) / 10), [1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0][i] === 1]);
  }
  // dati: i sei bit bassi contano in binario (un passo ogni 0,8 s), gli altri restano fermi
  const LUCI_DATI = [];
  for (let b = 15; b >= 0; b--) {
    if (b <= 5) LUCI_DATI.push(['conta', 1.6 * Math.pow(2, b), 0, [1, 0, 1, 1, 0, 1][b] === 1]);
    else LUCI_DATI.push(fisso([0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0][b] === 1));
  }
  const LUCI_STATO = [fisso(true), ['k2', 1.9, -0.4, true], ['k1', 2.7, -1.2, false], ['k3', 3.1, -0.7, true], ['k1', 2.2, -1.9, false], ['k3', 2.6, -0.3, false], fisso(false)];

  function luce(cx, cy, def, piccola) {
    const cls = P + '-luce' + (def[0] ? ' ' + P + '-' + def[0] : '') + (def[3] ? ' ' + P + '-on' : '');
    const st = def[0] ? ' style="animation-duration:' + f(def[1]) + 's;animation-delay:' + f(def[2]) + 's"' : '';
    if (piccola) {
      return '<circle class="' + P + '-lampada-p" cx="' + f(cx) + '" cy="' + cy + '" r="1.4"/>' +
        '<circle class="' + cls + ' ' + P + '-acceso-p" cx="' + f(cx) + '" cy="' + cy + '" r="1.4"' + st + '/>';
    }
    return '<circle class="' + P + '-lampada" cx="' + cx + '" cy="' + cy + '" r="6.5"/>' +
      '<g class="' + cls + '"' + st + '><circle class="' + P + '-alone" cx="' + cx + '" cy="' + cy + '" r="11.5"/>' +
      '<circle class="' + P + '-acceso" cx="' + cx + '" cy="' + cy + '" r="6.5"/></g>';
  }

  function leva(cx, y, w, hh, cls) {
    return '<rect class="' + cls + '" x="' + f(cx - w / 2) + '" y="' + y + '" width="' + w + '" height="' + hh + '" rx="3"/>' +
      '<rect class="' + P + '-leva-t" x="' + f(cx - w / 2 + 3) + '" y="' + (y + 5) + '" width="' + f(w - 6) + '" height="3" rx="1.5"/>';
  }

  // il pannello frontale ingrandito, a tutta larghezza
  function pannelloGrande() {
    const o = [];
    o.push('<rect class="' + P + '-pannello" x="24" y="42" width="752" height="128" rx="8"/>');
    o.push('<text class="' + P + '-serigrafia" x="40" y="75">INDIRIZZO</text>');
    o.push('<text class="' + P + '-serigrafia" x="40" y="103">DATI</text>');
    o.push('<text class="' + P + '-serigrafia" x="40" y="141">INTERRUTTORI</text>');
    o.push('<text class="' + P + '-serigrafia" x="630" y="103">COMANDI</text>');
    // filetti che separano i gruppi di tre bit
    for (let g = 1; g < 6; g++) {
      const x = f((colonna(g * 3 - 1) + colonna(g * 3)) / 2);
      o.push('<path class="' + P + '-sottile" d="M' + x + ' 58V160"/>');
    }
    for (let i = 0; i < 18; i++) o.push(luce(colonna(i), 70, LUCI_IND[i]));
    for (let i = 2; i < 18; i++) o.push(luce(colonna(i), 98, LUCI_DATI[i - 2]));
    for (let i = 0; i < 18; i++) o.push(leva(colonna(i), 112, 15, 46, Math.floor(i / 3) % 2 ? P + '-leva-b' : P + '-leva-a'));
    for (let j = 0; j < 7; j++) {
      o.push(luce(638 + 20 * j, 70, LUCI_STATO[j]));
      o.push(leva(638 + 20 * j, 112, 14, 46, P + '-leva-c'));
    }
    return o.join('');
  }

  // il pannellino vero, dentro l'armadio: le stesse lucine, in piccolo
  function pannelloPiccolo() {
    const o = [];
    o.push('<rect class="' + P + '-pannello" x="604" y="300" width="88" height="44" rx="2"/>');
    for (let i = 0; i < 18; i++) o.push(luce(colonnaP(i), 310, LUCI_IND[i], true));
    for (let i = 2; i < 18; i++) o.push(luce(colonnaP(i), 317, LUCI_DATI[i - 2], true));
    for (let j = 0; j < 4; j++) o.push(luce(680 + 3.4 * j, 310, LUCI_STATO[j], true));
    for (let i = 0; i < 18; i++) o.push('<rect class="' + (Math.floor(i / 3) % 2 ? P + '-leva-b' : P + '-leva-a') + '" x="' + f(colonnaP(i) - 1.2) + '" y="325" width="2.4" height="12" rx="1" style="stroke-width:.6"/>');
    for (let j = 0; j < 4; j++) o.push('<rect class="' + P + '-leva-c" x="' + f(679 + 3.4 * j - 1.2) + '" y="325" width="2.4" height="12" rx="1" style="stroke-width:.6"/>');
    return o.join('');
  }

  function bobina(cx, cy) {
    return '<circle class="' + P + '-flangia" cx="' + cx + '" cy="' + cy + '" r="9"/>' +
      '<circle class="' + P + '-bobina" cx="' + cx + '" cy="' + cy + '" r="6"/>' +
      '<circle class="' + P + '-mozzo" cx="' + cx + '" cy="' + cy + '" r="2.6"/>';
  }

  // un'unità DECtape TU56: due trasporti, ciascuno con due bobine
  function dectape(x, y) {
    return '<rect class="' + P + '-pannello" x="' + x + '" y="' + y + '" width="84" height="52" rx="2"/>' +
      bobina(x + 13, y + 22) + bobina(x + 33, y + 22) + bobina(x + 51, y + 22) + bobina(x + 71, y + 22) +
      '<path class="' + P + '-tratto" d="M' + (x + 13) + ' ' + (y + 40) + 'H' + (x + 33) + 'M' + (x + 51) + ' ' + (y + 40) + 'H' + (x + 71) + '" style="stroke-width:1.5"/>' +
      '<rect class="' + P + '-mozzo" x="' + (x + 19) + '" y="' + (y + 37) + '" width="8" height="6"/>' +
      '<rect class="' + P + '-mozzo" x="' + (x + 57) + '" y="' + (y + 37) + '" width="8" height="6"/>';
  }

  function cieco(x, y, w, hh) {
    const o = ['<rect class="' + P + '-cieco" x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '"/>'];
    const n = Math.floor((hh - 8) / 7);
    const v = [];
    for (let k = 0; k < n; k++) v.push('M' + (x + 14) + ' ' + (y + 8 + k * 7) + 'H' + (x + w - 14));
    if (v.length) o.push('<path class="' + P + '-feritoia" d="' + v.join('') + '"/>');
    return o.join('');
  }

  function armadi() {
    const o = [];
    // armadio A: DECtape, pannello cieco, PDP-11/20, pannelli ciechi
    o.push('<rect class="' + P + '-armadio" x="600" y="190" width="96" height="288"/>');
    o.push('<rect class="' + P + '-fascia" x="600" y="190" width="96" height="14"/>');
    o.push(dectape(606, 210));
    o.push(cieco(606, 266, 84, 30));
    o.push(pannelloPiccolo());
    o.push(cieco(606, 350, 84, 50));
    o.push(cieco(606, 404, 84, 52));
    o.push('<rect class="' + P + '-zoccolo" x="600" y="462" width="96" height="16"/>');
    // armadio B: un altro DECtape e la memoria a nuclei
    o.push('<rect class="' + P + '-armadio" x="696" y="190" width="96" height="288"/>');
    o.push('<rect class="' + P + '-fascia" x="696" y="190" width="96" height="14"/>');
    o.push(dectape(702, 210));
    o.push(cieco(702, 266, 84, 78));
    o.push(cieco(702, 350, 84, 106));
    o.push('<rect class="' + P + '-zoccolo" x="696" y="462" width="96" height="16"/>');
    return o.join('');
  }

  function telescrivente() {
    const o = [];
    // il nastro perforato che esce dal perforatore e si arriccia sul pavimento
    const nastro = 'M136 372C134 398 118 418 104 440C94 456 102 470 118 468C134 466 130 450 116 454C102 458 90 470 64 472';
    // piedistallo
    o.push('<rect class="' + P + '-zoccolo" x="118" y="468" width="86" height="10" rx="2"/>');
    o.push('<rect class="' + P + '-piede" x="124" y="378" width="72" height="90"/>');
    o.push('<rect class="' + P + '-sottile" x="131" y="386" width="58" height="74" rx="3"/>');
    // la macchina: base con la tastiera inclinata, cofano della stampante
    o.push('<path class="' + P + '-scocca" d="M118 380V352H172L206 363V375Q206 380 201 380Z"/>');
    o.push('<path class="' + P + '-scocca" d="M118 352V336Q118 326 128 326H158Q167 326 169 334L174 352Z"/>');
    o.push('<path class="' + P + '-vetro" d="M156 330H163L170 348H162Z"/>');
    for (let r = 0; r < 4; r++) {
      const x = 178 + 7 * r;
      const y = 352 + (x - 172) * 11 / 34;
      o.push('<rect class="' + P + '-tasto" x="' + f(x - 2.6) + '" y="' + f(y - 4.5) + '" width="5.2" height="4.5" rx="1"/>');
    }
    // lettore e perforatore di nastro, sul fianco
    o.push('<rect class="' + P + '-unita" x="124" y="342" width="44" height="30" rx="3"/>');
    o.push('<circle class="' + P + '-mozzo" cx="134" cy="352" r="3"/><circle class="' + P + '-mozzo" cx="144" cy="352" r="3"/>');
    o.push('<path class="' + P + '-tratto" d="M154 364H162" style="stroke-width:3"/>');
    // il foglio stampato esce dall'alto e ricade all'indietro
    const carta = 'M150 326C150 302 146 288 131 286C117 285 109 294 111 308';
    o.push('<path class="' + P + '-carta-o" d="' + carta + '"/><path class="' + P + '-carta" d="' + carta + '"/>');
    o.push('<path class="' + P + '-nastro-o" d="' + nastro + '"/><path class="' + P + '-nastro" d="' + nastro + '"/><path class="' + P + '-fori" d="' + nastro + '"/>');
    return o.join('');
  }

  function persone() {
    const o = [];
    // la sedia
    o.push('<path class="' + P + '-sedia" d="M304 398L312 338Q314 330 322 332L326 333Q332 336 330 344L320 400Z"/>');
    o.push('<rect class="' + P + '-sedia" x="252" y="402" width="64" height="11" rx="4"/>');
    o.push('<rect class="' + P + '-zoccolo" x="279" y="413" width="8" height="45"/>');
    o.push('<path class="' + P + '-tratto" d="M246 462H320" style="stroke-width:5"/>');
    o.push('<circle class="' + P + '-zoccolo" cx="250" cy="471" r="5"/><circle class="' + P + '-zoccolo" cx="283" cy="471" r="5"/><circle class="' + P + '-zoccolo" cx="316" cy="471" r="5"/>');
    // chi siede alla telescrivente (di profilo, rivolto a sinistra)
    o.push('<g class="' + P + '-sagoma">' +
      '<circle cx="268" cy="287" r="17"/>' +
      '<rect x="262" y="300" width="12" height="14" rx="4"/>' +
      '<path d="M254 312C244 318 242 340 246 362L252 400H300V372C298 342 292 320 282 312C274 306 262 306 254 312Z"/>' +
      '<path d="M256 384L208 388Q200 390 200 398L202 408H300V384Z"/>' +
      '<path d="M202 400L200 466H218L222 404Z"/>' +
      '<path d="M200 464L180 468Q174 472 178 478H220L218 464Z"/>' +
      '<path d="M262 312C254 326 248 342 246 356L258 360C260 344 266 330 274 318Z"/>' +
      '<path d="M246 352L206 356Q198 358 200 364L206 366L252 364Z"/>' +
      '<ellipse cx="201" cy="361" rx="7" ry="4.5"/>' +
      '</g>');
    // chi sta in piedi e guarda
    o.push('<g class="' + P + '-sagoma">' +
      '<circle cx="392" cy="211" r="17"/>' +
      '<rect x="386" y="224" width="12" height="16" rx="4"/>' +
      '<path d="M378 238C368 246 366 266 368 286L372 326L374 344H414V316C416 286 414 258 408 242C400 234 386 234 378 238Z"/>' +
      '<path d="M374 340L370 404L372 470H386L388 404L394 340Z"/>' +
      '<path d="M394 340L400 404L408 470H422L414 404L414 340Z"/>' +
      '<path d="M372 466L350 470Q345 474 349 478H388L386 466Z"/>' +
      '<path d="M410 466L396 470Q391 474 395 478H424L422 466Z"/>' +
      '<path d="M382 244C374 268 372 294 376 318L388 316C386 294 388 270 394 250Z"/>' +
      '<circle cx="382" cy="322" r="7"/>' +
      '</g>');
    return o.join('');
  }

  function etichetta(testo, x, y, guida, punto) {
    const righe = testo.split('\n');
    return '<path class="' + P + '-guida" d="' + guida + '"/><circle class="' + P + '-punto" cx="' + punto[0] + '" cy="' + punto[1] + '" r="3"/>' +
      righe.map((r, k) => '<text class="' + P + '-t" x="' + x + '" y="' + (y + k * 22) + '">' + r + '</text>').join('');
  }

  function svgPdp11() {
    const g = [];
    for (let x = 40; x < 800; x += 40) g.push('M' + x + ' 0V478');
    for (let y = 40; y < 478; y += 40) g.push('M0 ' + y + 'H800');
    return '<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="' + P + '-sfondo" width="800" height="500"/>' +
      '<path class="' + P + '-griglia" d="' + g.join('') + '"/>' +
      '<rect class="' + P + '-pavimento" x="0" y="478" width="800" height="22"/>' +
      '<path class="' + P + '-tratto" d="M0 478H800"/>' +

      '<text class="' + P + '-tit" x="24" y="31">IL PANNELLO FRONTALE, INGRANDITO</text>' +
      '<text class="' + P + '-tit" x="776" y="31" text-anchor="end">BELL LABS, 1972 CIRCA</text>' +
      pannelloGrande() +

      armadi() +
      telescrivente() +
      persone() +

      // la lente: il pannellino nell'armadio è quello ingrandito in alto
      '<path class="' + P + '-lente-alone" d="M648 296V180"/>' +
      '<path class="' + P + '-lente" d="M648 296V180"/>' +
      '<path class="' + P + '-freccia" d="M648 172L642 183H654Z"/>' +
      '<rect class="' + P + '-lente" x="600" y="296" width="96" height="52" rx="3"/>' +

      etichetta('nastri DECtape', 452, 240, 'M586 234H604', [609, 232]) +
      etichetta('PDP-11/20', 486, 330, 'M582 324H600', [600, 324]) +
      etichetta('telescrivente\nASR-33', 16, 236, 'M70 266L110 300L122 338', [122, 338]) +
      etichetta('nastro\nperforato', 16, 400, 'M70 426L102 444', [102, 444]) +
      '</svg>';
  }

  root.ProgStoria.figura('pdp-11', {
    alt: 'Ricostruzione della postazione dei primi Unix ai Bell Labs, intorno al 1972. A sinistra una telescrivente Teletype ASR-33 sul suo piedistallo: il foglio stampato esce dall\'alto e dal fianco pende un nastro di carta perforato. Davanti alla tastiera siede una persona stilizzata, accanto un\'altra la guarda in piedi. A destra due armadi con i nastri magnetici DECtape e il minicomputer PDP-11/20. In alto il suo pannello frontale ingrandito: una fila di lucine per l\'indirizzo e una per i dati, che lampeggiano in binario, diciotto interruttori raggruppati a tre a tre e, a destra, i comandi.',
    css: css,
    disegna() { return svgPdp11(); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
