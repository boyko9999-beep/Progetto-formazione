/*
 * Illustrazioni del capitolo 5 · I primi linguaggi ad alto livello.
 *   ibm-704   la sala del 704 in prospetto: lettore di schede, console con le file di luci,
 *             due unità a nastro con le colonne a vuoto, stampante; un operatore stilizzato
 * Colori dalla tavolozza --fig-* e --cap, così il disegno segue il tema chiaro o scuro.
 * Scala del disegno: 1 metro = 120 unità (le misure sono quelle, approssimate, delle macchine vere).
 */
(function (root) {
  'use strict';
  if (!root.ProgStoria) return;

  /* ===================== ibm-704 ===================== */

  const css704 = `
    .fig-ibm-704-sfondo { fill: var(--fig-paper); }
    .fig-ibm-704-fondo { fill: var(--fig-1); stroke: var(--fig-line); stroke-width: 1.5; }
    .fig-ibm-704-fondo-l { fill: none; stroke: var(--fig-line); stroke-width: 1.2; }
    .fig-ibm-704-telaio { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .fig-ibm-704-telaio-2 { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .fig-ibm-704-pannello { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-ibm-704-vetro { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-ibm-704-sottile { fill: none; stroke: var(--fig-ink); stroke-width: 1.5; stroke-linecap: round; }
    .fig-ibm-704-feritoie { fill: none; stroke: var(--fig-ink); stroke-width: 1.2; opacity: .55; }
    .fig-ibm-704-carta { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.5; stroke-linejoin: round; }
    .fig-ibm-704-schede { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-ibm-704-righe { fill: none; stroke: var(--fig-line); stroke-width: 2; stroke-linecap: round; }
    .fig-ibm-704-nastro { fill: none; stroke: var(--fig-4); stroke-width: 2.5; stroke-linecap: round; }
    .fig-ibm-704-flangia { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-ibm-704-avvolto { fill: var(--fig-4); }
    .fig-ibm-704-mozzo { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-ibm-704-tacca { stroke: var(--fig-ink); stroke-width: 2.5; stroke-linecap: round; }
    .fig-ibm-704-spenta { fill: var(--fig-metal-2); }
    .fig-ibm-704-accesa { fill: var(--fig-warm); }
    .fig-ibm-704-verde { fill: var(--fig-glow); stroke: var(--fig-ink); stroke-width: 1.2; }
    .fig-ibm-704-rosso { fill: var(--fig-red); stroke: var(--fig-ink); stroke-width: 1.2; }
    .fig-ibm-704-tasto { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1; }
    .fig-ibm-704-lampada { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-ibm-704-luce { fill: var(--fig-warm); opacity: .55; }
    .fig-ibm-704-pavimento { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-ibm-704-fughe { stroke: var(--fig-ink); stroke-width: 1; opacity: .4; }
    .fig-ibm-704-persona { fill: var(--fig-ink); opacity: .82; }
    .fig-ibm-704-braccio { fill: none; stroke: var(--fig-ink); stroke-width: 9; stroke-linecap: round; opacity: .82; }
    .fig-ibm-704-gamba { fill: none; stroke: var(--fig-ink); stroke-width: 12; stroke-linecap: round; opacity: .82; }
    .fig-ibm-704-scala { fill: none; stroke: var(--fig-ink); stroke-width: 2; }
    .fig-ibm-704-guida { fill: none; stroke: var(--cap); stroke-width: 1.5; }
    .fig-ibm-704-t { font: 700 19px var(--font, sans-serif); fill: var(--fig-ink); }
    .fig-ibm-704-tit { font: 800 16px var(--mono, monospace); fill: var(--fig-ink); letter-spacing: .08em; }
    .fig-ibm-704-piccolo { font: 700 15px var(--mono, monospace); fill: var(--fig-ink); }

    .fig-ibm-704-bobina, .fig-ibm-704-ansa { animation-duration: 6s; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
    .fig-ibm-704-bobina { transform-box: fill-box; transform-origin: 50% 50%; }
    .fig-ibm-704-ansa { transform-box: fill-box; transform-origin: 50% 0; }
    .fig-ibm-704-b1 { animation-name: fig-ibm-704-gira-a; }
    .fig-ibm-704-b2 { animation-name: fig-ibm-704-gira-b; }
    .fig-ibm-704-b3 { animation-name: fig-ibm-704-gira-b; animation-duration: 7.5s; animation-delay: -2s; }
    .fig-ibm-704-b4 { animation-name: fig-ibm-704-gira-a; animation-duration: 7.5s; animation-delay: -2s; }
    .fig-ibm-704-a1 { animation-name: fig-ibm-704-ansa-a; }
    .fig-ibm-704-a2 { animation-name: fig-ibm-704-ansa-b; }
    .fig-ibm-704-a3 { animation-name: fig-ibm-704-ansa-b; animation-duration: 7.5s; animation-delay: -2s; }
    .fig-ibm-704-a4 { animation-name: fig-ibm-704-ansa-a; animation-duration: 7.5s; animation-delay: -2s; }
    @keyframes fig-ibm-704-gira-a { 0%, 10% { transform: rotate(0deg); } 30%, 45% { transform: rotate(240deg); } 60%, 72% { transform: rotate(120deg); } 92%, 100% { transform: rotate(360deg); } }
    @keyframes fig-ibm-704-gira-b { 0%, 10% { transform: rotate(0deg); } 30%, 45% { transform: rotate(-240deg); } 60%, 72% { transform: rotate(-120deg); } 92%, 100% { transform: rotate(-360deg); } }
    @keyframes fig-ibm-704-ansa-a { 0%, 10% { transform: scaleY(.8); } 30%, 45% { transform: scaleY(.5); } 60%, 72% { transform: scaleY(1); } 92%, 100% { transform: scaleY(.8); } }
    @keyframes fig-ibm-704-ansa-b { 0%, 10% { transform: scaleY(.7); } 30%, 45% { transform: scaleY(1); } 60%, 72% { transform: scaleY(.55); } 92%, 100% { transform: scaleY(.7); } }

    .fig-ibm-704-s1, .fig-ibm-704-s2, .fig-ibm-704-s3, .fig-ibm-704-s4 { animation-name: fig-ibm-704-lampeggia; animation-iteration-count: infinite; animation-timing-function: step-end; }
    .fig-ibm-704-s1 { animation-duration: 1.7s; }
    .fig-ibm-704-s2 { animation-duration: 2.3s; animation-delay: -.6s; }
    .fig-ibm-704-s3 { animation-duration: 3.1s; animation-delay: -1.4s; }
    .fig-ibm-704-s4 { animation-duration: 1.3s; animation-delay: -.3s; }
    @keyframes fig-ibm-704-lampeggia { 0% { opacity: 1; } 45% { opacity: .08; } 70% { opacity: 1; } 85% { opacity: .08; } 100% { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      .fig-ibm-704-bobina, .fig-ibm-704-ansa, .fig-ibm-704-s1, .fig-ibm-704-s2, .fig-ibm-704-s3, .fig-ibm-704-s4 { animation: none; }
    }
  `;

  // Bobina di nastro: flangia, nastro avvolto, mozzo e tre tacche che rendono visibile la rotazione.
  function bobina(cx, cy, n) {
    const tacche = [0, 120, 240].map((a) => {
      const r = (a - 90) * Math.PI / 180;
      return 'M' + (cx + Math.cos(r) * 16.5).toFixed(1) + ' ' + (cy + Math.sin(r) * 16.5).toFixed(1) +
        'L' + (cx + Math.cos(r) * 20).toFixed(1) + ' ' + (cy + Math.sin(r) * 20).toFixed(1);
    }).join('');
    return '<g class="fig-ibm-704-bobina fig-ibm-704-b' + n + '">' +
      '<circle class="fig-ibm-704-flangia" cx="' + cx + '" cy="' + cy + '" r="22"/>' +
      '<circle class="fig-ibm-704-avvolto" cx="' + cx + '" cy="' + cy + '" r="14.5"/>' +
      '<circle class="fig-ibm-704-mozzo" cx="' + cx + '" cy="' + cy + '" r="6"/>' +
      '<path class="fig-ibm-704-tacca" d="' + tacche + 'M' + cx + ' ' + (cy - 6) + 'V' + (cy - 2) + '"/>' +
      '</g>';
  }

  // Unità a nastro: bobine in alto dietro il vetro, colonne a vuoto con le anse di nastro, pulsantiera in basso.
  function unitaNastro(x, n) {
    const y = 200;
    return '<rect class="fig-ibm-704-telaio" x="' + x + '" y="' + y + '" width="102" height="206" rx="3"/>' +
      '<rect class="fig-ibm-704-telaio-2" x="' + (x - 3) + '" y="' + (y - 4) + '" width="108" height="12" rx="2"/>' +
      '<rect class="fig-ibm-704-vetro" x="' + (x + 7) + '" y="' + (y + 14) + '" width="88" height="88" rx="3"/>' +
      '<path class="fig-ibm-704-nastro" d="M' + (x + 14) + ' ' + (y + 48) + 'C' + (x + 14) + ' ' + (y + 74) + ' ' + (x + 34) + ' ' + (y + 84) + ' ' + (x + 45) + ' ' + (y + 86) +
        'M' + (x + 88) + ' ' + (y + 48) + 'C' + (x + 88) + ' ' + (y + 74) + ' ' + (x + 68) + ' ' + (y + 84) + ' ' + (x + 57) + ' ' + (y + 86) + '"/>' +
      bobina(x + 29, y + 46, 2 * n - 1) + bobina(x + 73, y + 46, 2 * n) +
      '<rect class="fig-ibm-704-telaio-2" x="' + (x + 43) + '" y="' + (y + 80) + '" width="16" height="13" rx="2"/>' +
      '<rect class="fig-ibm-704-vetro" x="' + (x + 13) + '" y="' + (y + 110) + '" width="76" height="76" rx="3"/>' +
      '<rect class="fig-ibm-704-pannello" x="' + (x + 21) + '" y="' + (y + 114) + '" width="18" height="68" rx="2"/>' +
      '<rect class="fig-ibm-704-pannello" x="' + (x + 63) + '" y="' + (y + 114) + '" width="18" height="68" rx="2"/>' +
      '<path class="fig-ibm-704-nastro fig-ibm-704-ansa fig-ibm-704-a' + (2 * n - 1) + '" d="M' + (x + 24) + ' ' + (y + 114) + 'V' + (y + 168) + 'a6 6 0 0 0 12 0V' + (y + 114) + '"/>' +
      '<path class="fig-ibm-704-nastro fig-ibm-704-ansa fig-ibm-704-a' + (2 * n) + '" d="M' + (x + 66) + ' ' + (y + 114) + 'V' + (y + 168) + 'a6 6 0 0 0 12 0V' + (y + 114) + '"/>' +
      '<circle class="fig-ibm-704-verde" cx="' + (x + 30) + '" cy="' + (y + 196) + '" r="4"/>' +
      '<circle class="fig-ibm-704-tasto" cx="' + (x + 46) + '" cy="' + (y + 196) + '" r="4"/>' +
      '<circle class="fig-ibm-704-rosso" cx="' + (x + 62) + '" cy="' + (y + 196) + '" r="4"/>' +
      '<path class="fig-ibm-704-feritoie" d="M' + (x + 72) + ' ' + (y + 193) + 'h14M' + (x + 72) + ' ' + (y + 199) + 'h14"/>';
  }

  function svg704() {
    // console: cinque file di luci (a gruppi di tre, come le cifre ottali) e una fila di interruttori
    const luci = [];
    const interruttori = [];
    for (let g = 0; g < 8; g++) {
      for (let k = 0; k < 3; k++) {
        const x = 197 + g * 20 + k * 6;
        for (let r = 0; r < 5; r++) {
          const y = 216 + r * 14;
          luci.push('<circle class="fig-ibm-704-spenta" cx="' + x + '" cy="' + y + '" r="2.4"/>');
          const h = (g * 7 + k * 13 + r * 5) % 9;
          if (h < 5) luci.push('<circle class="fig-ibm-704-accesa' + (h < 4 ? ' fig-ibm-704-s' + (h + 1) : '') + '" cx="' + x + '" cy="' + y + '" r="2.4"/>');
        }
        const su = (g + k * 2) % 3 === 0;
        interruttori.push('<rect class="fig-ibm-704-tasto" x="' + (x - 2) + '" y="' + (su ? 284 : 288) + '" width="4" height="8" rx="1"/>');
      }
    }
    const fughe = [];
    for (let x = 40; x < 800; x += 48) fughe.push('M' + x + ' 410V426');
    const lampade = [130, 400, 670].map((x) =>
      '<path class="fig-ibm-704-sottile" d="M' + (x - 40) + ' 0V30M' + (x + 40) + ' 0V30"/>' +
      '<rect class="fig-ibm-704-lampada" x="' + (x - 62) + '" y="30" width="124" height="9" rx="2"/>' +
      '<rect class="fig-ibm-704-luce" x="' + (x - 56) + '" y="39" width="112" height="4" rx="2"/>').join('');

    return '<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="fig-ibm-704-sfondo" width="800" height="500"/>' +
      lampade +
      // in fondo, gli altri armadi del sistema (memoria a nuclei, alimentatori, controllo dei nastri)
      [8, 120, 232, 344, 456, 568, 680].map((x) =>
        '<rect class="fig-ibm-704-fondo" x="' + x + '" y="140" width="106" height="266"/>' +
        '<rect class="fig-ibm-704-fondo" x="' + (x - 2) + '" y="134" width="110" height="8"/>' +
        '<path class="fig-ibm-704-fondo-l" d="M' + (x + 53) + ' 150V400M' + (x + 8) + ' 154H' + (x + 45) + 'M' + (x + 8) + ' 162H' + (x + 45) + 'M' + (x + 8) + ' 170H' + (x + 45) +
          'M' + (x + 61) + ' 154H' + (x + 98) + 'M' + (x + 61) + ' 162H' + (x + 98) + 'M' + (x + 61) + ' 170H' + (x + 98) + '"/>' +
        '<rect class="fig-ibm-704-fondo-l" x="' + (x + 14) + '" y="190" width="25" height="34" rx="2"/>').join('') +
      '<text class="fig-ibm-704-tit" x="24" y="82">SALA DI CALCOLO · 1957</text>' +
      // scala grafica: 1 metro
      '<path class="fig-ibm-704-scala" d="M656 76H776M656 70V82M716 72V80M776 70V82"/>' +
      '<text class="fig-ibm-704-piccolo" x="716" y="62" text-anchor="middle">1 m</text>' +

      // ---- lettore di schede ----
      '<rect class="fig-ibm-704-telaio" x="24" y="284" width="136" height="122" rx="4"/>' +
      '<rect class="fig-ibm-704-telaio-2" x="110" y="250" width="42" height="36" rx="2"/>' +
      '<rect class="fig-ibm-704-schede" x="116" y="256" width="30" height="30"/>' +
      '<path class="fig-ibm-704-sottile" d="M118 262H144M118 268H144M118 274H144M118 280H144"/>' +
      '<rect class="fig-ibm-704-telaio-2" x="36" y="270" width="44" height="16" rx="2"/>' +
      '<rect class="fig-ibm-704-schede" x="42" y="274" width="32" height="12"/>' +
      '<path class="fig-ibm-704-sottile" d="M44 280H72"/>' +
      '<rect class="fig-ibm-704-pannello" x="32" y="294" width="120" height="16" rx="2"/>' +
      '<circle class="fig-ibm-704-verde" cx="44" cy="302" r="4"/><circle class="fig-ibm-704-rosso" cx="58" cy="302" r="4"/>' +
      '<path class="fig-ibm-704-sottile" d="M92 316V400M36 330H86M36 338H86M36 346H86M98 330H148M98 338H148M98 346H148"/>' +

      // ---- unità centrale con la console ----
      '<rect class="fig-ibm-704-telaio" x="176" y="190" width="192" height="216" rx="3"/>' +
      '<rect class="fig-ibm-704-telaio-2" x="172" y="184" width="200" height="12" rx="2"/>' +
      '<rect class="fig-ibm-704-pannello" x="188" y="204" width="168" height="96" rx="3"/>' +
      luci.join('') + interruttori.join('') +
      '<rect class="fig-ibm-704-telaio-2" x="180" y="300" width="184" height="9" rx="2"/>' +
      '<path class="fig-ibm-704-sottile" d="M272 316V400"/>' +
      '<path class="fig-ibm-704-feritoie" d="M188 330H262M188 338H262M188 346H262M188 354H262M282 330H356M282 338H356M282 346H356M282 354H356"/>' +
      '<circle class="fig-ibm-704-tasto" cx="262" cy="370" r="3"/><circle class="fig-ibm-704-tasto" cx="282" cy="370" r="3"/>' +

      // ---- due unità a nastro ----
      unitaNastro(386, 1) + unitaNastro(496, 2) +

      // ---- stampante, con il modulo continuo che esce dall'alto ----
      '<path class="fig-ibm-704-carta" d="M652 274V236q0-8 8-8H732q8 0 8 8V274"/>' +
      '<path class="fig-ibm-704-righe" d="M664 242H714M664 252H726M664 262H700"/>' +
      '<path class="fig-ibm-704-sottile" d="M657 236v4M657 248v4M657 260v4M735 236v4M735 248v4M735 260v4"/>' +
      '<rect class="fig-ibm-704-telaio" x="620" y="272" width="148" height="30" rx="6"/>' +
      '<rect class="fig-ibm-704-telaio-2" x="644" y="270" width="104" height="6" rx="2"/>' +
      '<rect class="fig-ibm-704-telaio" x="612" y="300" width="164" height="106" rx="4"/>' +
      '<rect class="fig-ibm-704-pannello" x="622" y="310" width="144" height="16" rx="2"/>' +
      '<circle class="fig-ibm-704-verde" cx="634" cy="318" r="4"/><circle class="fig-ibm-704-rosso" cx="648" cy="318" r="4"/><circle class="fig-ibm-704-tasto" cx="662" cy="318" r="4"/>' +
      '<path class="fig-ibm-704-sottile" d="M694 334V400"/>' +
      '<path class="fig-ibm-704-feritoie" d="M624 346H686M624 354H686M624 362H686M702 346H764M702 354H764M702 362H764"/>' +

      // ---- l'operatore, di profilo, allunga la mano verso la console ----
      '<path class="fig-ibm-704-braccio" d="M166 240Q184 252 198 258"/>' +
      '<path class="fig-ibm-704-gamba" d="M150 312L146 400M164 312L170 400"/>' +
      '<path class="fig-ibm-704-persona" d="M144 236Q156 228 170 236L176 318Q158 326 140 318Z"/>' +
      '<circle class="fig-ibm-704-persona" cx="158" cy="216" r="13"/>' +
      '<path class="fig-ibm-704-persona" d="M136 398h18v8h-22zM164 398h18l4 8h-22z"/>' +

      // ---- pavimento flottante (i cavi correvano sotto le piastrelle) ----
      '<rect class="fig-ibm-704-pavimento" x="0" y="406" width="800" height="20"/>' +
      '<path class="fig-ibm-704-fughe" d="' + fughe.join('') + '"/>' +

      // ---- didascalie sotto ciascuna macchina ----
      '<text class="fig-ibm-704-t" x="24" y="458">lettore di schede</text>' +
      '<text class="fig-ibm-704-t" x="272" y="458" text-anchor="middle">console</text>' +
      '<text class="fig-ibm-704-t" x="491" y="458" text-anchor="middle">unità a nastro</text>' +
      '<text class="fig-ibm-704-t" x="694" y="458" text-anchor="middle">stampante</text>' +
      '<path class="fig-ibm-704-guida" d="M92 434V442M272 434V442M441 434V442H547V434M491 442V446M694 434V442"/>' +
      '</svg>';
  }

  root.ProgStoria.figura('ibm-704', {
    alt: 'Disegno di ricostruzione di una sala di calcolo del 1957, in prospetto. Da sinistra: il lettore di schede, un mobile basso con il caricatore delle schede in alto; un operatore stilizzato, di profilo, che allunga la mano verso la console dell\'unità centrale, coperta da cinque file di piccole luci e da una fila di interruttori; due unità a nastro magnetico alte quanto una persona, con le bobine in alto dietro il vetro e sotto le colonne a vuoto dove pendono le anse di nastro; infine la stampante, da cui esce il modulo continuo. Le bobine girano a scatti e le luci della console lampeggiano. Una scala grafica indica un metro.',
    css: css704,
    disegna() { return svg704(); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
