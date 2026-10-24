/*
 * Illustrazioni del capitolo 6 · Schede, lotti e terminali.
 *   sala-macchine  il viaggio di un mazzo nell'elaborazione a lotti: programmatore, sportello, operatore,
 *                  coda, lettore di schede, calcolatore, stampante e infine il tabulato nella casella
 *   time-sharing   un calcolatore centrale e sei terminali: la fetta di tempo passa da un utente all'altro
 * Colori dalla tavolozza --fig-* e --cap, così il disegno segue il tema chiaro o scuro.
 * Lo stesso colore (--cap) indica sempre il lavoro dell'utente: il mazzo, il tabulato, il turno.
 */
(function (root) {
  'use strict';
  if (!root.ProgStoria) return;

  /* ===================== sala-macchine ===================== */

  // tappe del mazzo (in alto) e del tabulato (in basso), in unità del disegno
  const P1 = [124, 156];   // nelle mani del programmatore
  const P2 = [230, 156];   // sul davanzale dello sportello
  const P3 = [380, 156];   // nelle mani dell'operatore
  const P4 = [502, 168];   // in coda
  const P5 = [626, 140];   // nel caricatore del lettore
  const P6 = [515, 318];   // il tabulato appena stampato
  const P7 = [322, 366];   // nella casella del programmatore
  const tr = (p, dy) => 'transform: translate(' + p[0] + 'px, ' + (p[1] + (dy || 0)) + 'px);';

  const cssSala = `
    .fig-sala-macchine-sfondo { fill: var(--fig-paper); }
    .fig-sala-macchine-pavimento { stroke: var(--fig-ink); stroke-width: 2; stroke-linecap: round; }
    .fig-sala-macchine-parete { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .fig-sala-macchine-vetro { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-sala-macchine-metallo { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .fig-sala-macchine-metallo-2 { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .fig-sala-macchine-pannello { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-sala-macchine-sottile { fill: none; stroke: var(--fig-ink); stroke-width: 1.5; stroke-linecap: round; }
    .fig-sala-macchine-feritoie { fill: none; stroke: var(--fig-ink); stroke-width: 1.2; opacity: .5; }
    .fig-sala-macchine-schede { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-sala-macchine-carta { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.5; stroke-linejoin: round; }
    .fig-sala-macchine-righe { fill: none; stroke: var(--fig-line); stroke-width: 2; stroke-linecap: round; }
    .fig-sala-macchine-nastro { fill: var(--fig-4); }
    .fig-sala-macchine-spenta { fill: var(--fig-metal-2); }
    .fig-sala-macchine-accesa { fill: var(--fig-warm); }
    .fig-sala-macchine-persona { fill: var(--fig-ink); opacity: .82; }
    .fig-sala-macchine-arto { fill: none; stroke: var(--fig-ink); stroke-linecap: round; opacity: .82; }
    .fig-sala-macchine-percorso { fill: none; stroke: var(--cap); stroke-width: 2; stroke-dasharray: 5 6; stroke-linecap: round; opacity: .75; }
    .fig-sala-macchine-punta { fill: none; stroke: var(--cap); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .fig-sala-macchine-cavo { fill: none; stroke: var(--fig-ink); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .fig-sala-macchine-lavoro { fill: var(--cap); stroke: var(--fig-ink); stroke-width: 1.5; stroke-linejoin: round; }
    .fig-sala-macchine-lavoro-l { fill: none; stroke: var(--fig-paper); stroke-width: 1.5; stroke-linecap: round; }
    .fig-sala-macchine-orologio { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-sala-macchine-lancetta { fill: none; stroke: var(--cap); stroke-width: 3; stroke-linecap: round; }
    .fig-sala-macchine-t { font: 700 19px var(--font, sans-serif); fill: var(--fig-ink); }
    .fig-sala-macchine-nota { font: 700 19px var(--font, sans-serif); fill: var(--cap); }
    .fig-sala-macchine-tit { font: 800 16px var(--mono, monospace); fill: var(--fig-ink); letter-spacing: .08em; }
    .fig-sala-macchine-leg { font: 700 17px var(--font, sans-serif); fill: var(--fig-ink); }

    .fig-sala-macchine-mazzo { ${tr(P1)} }
    .fig-sala-macchine-tabulato { ${tr(P7)} }
    .fig-sala-macchine-mazzo, .fig-sala-macchine-tabulato, .fig-sala-macchine-lancetta, .fig-sala-macchine-calcola {
      animation-duration: 14s; animation-iteration-count: infinite;
    }
    .fig-sala-macchine-mazzo { animation-name: fig-sala-macchine-mazzo; animation-timing-function: ease-in-out; }
    .fig-sala-macchine-tabulato { animation-name: fig-sala-macchine-tabulato; animation-timing-function: ease-in-out; }
    .fig-sala-macchine-lancetta { transform-box: view-box; transform-origin: 132px 362px; animation-name: fig-sala-macchine-ore; animation-timing-function: ease-in-out; }
    .fig-sala-macchine-calcola { animation-name: fig-sala-macchine-calcola; animation-timing-function: step-end; opacity: .25; }
    .fig-sala-macchine-c2 { animation-delay: -.25s; }
    @keyframes fig-sala-macchine-mazzo {
      0%, 6% { ${tr(P1)} opacity: 1; }
      16%, 22% { ${tr(P2)} opacity: 1; }
      30%, 34% { ${tr(P3)} opacity: 1; }
      41%, 48% { ${tr(P4)} opacity: 1; }
      55% { ${tr(P5)} opacity: 1; }
      58% { ${tr(P5, 8)} opacity: 0; }
      97% { ${tr(P5, 8)} opacity: 0; }
      97.5% { ${tr(P1)} opacity: 0; }
      100% { ${tr(P1)} opacity: 1; }
    }
    @keyframes fig-sala-macchine-tabulato {
      0%, 64% { ${tr(P6, 6)} opacity: 0; }
      67%, 70% { ${tr(P6)} opacity: 1; }
      82%, 96% { ${tr(P7)} opacity: 1; }
      99% { ${tr(P7)} opacity: 0; }
      100% { ${tr(P6, 6)} opacity: 0; }
    }
    @keyframes fig-sala-macchine-ore { 0%, 82% { transform: rotate(0deg); } 96%, 100% { transform: rotate(720deg); } }
    @keyframes fig-sala-macchine-calcola {
      0% { opacity: .25; } 58% { opacity: 1; } 60% { opacity: .25; } 61.5% { opacity: 1; } 63% { opacity: .25; }
      64.5% { opacity: 1; } 66% { opacity: .25; } 67.5% { opacity: 1; } 69% { opacity: .25; } 100% { opacity: .25; }
    }
    @media (prefers-reduced-motion: reduce) {
      .fig-sala-macchine-mazzo, .fig-sala-macchine-tabulato, .fig-sala-macchine-lancetta, .fig-sala-macchine-calcola { animation: none; }
    }
  `;

  // Persona stilizzata in piedi, di profilo verso destra, con le mani avanti (piedi in x, y).
  function persona(x, y) {
    return '<path class="fig-sala-macchine-arto" stroke-width="11" d="M' + (x - 5) + ' ' + (y - 42) + 'L' + (x - 7) + ' ' + (y - 3) + 'M' + (x + 6) + ' ' + (y - 42) + 'L' + (x + 10) + ' ' + (y - 3) + '"/>' +
      '<path class="fig-sala-macchine-persona" d="M' + (x - 13) + ' ' + (y - 110) + 'Q' + x + ' ' + (y - 118) + ' ' + (x + 13) + ' ' + (y - 110) + 'L' + (x + 16) + ' ' + (y - 38) + 'Q' + x + ' ' + (y - 32) + ' ' + (x - 15) + ' ' + (y - 38) + 'Z"/>' +
      '<path class="fig-sala-macchine-arto" stroke-width="8" d="M' + (x + 8) + ' ' + (y - 104) + 'Q' + (x + 14) + ' ' + (y - 86) + ' ' + (x + 24) + ' ' + (y - 78) + '"/>' +
      '<circle class="fig-sala-macchine-persona" cx="' + x + '" cy="' + (y - 128) + '" r="14"/>' +
      '<path class="fig-sala-macchine-persona" d="M' + (x - 16) + ' ' + (y - 6) + 'h16v6h-19zM' + (x + 3) + ' ' + (y - 6) + 'h16l3 6h-19z"/>';
  }

  function freccia(x, y, dir) {
    // piccola punta di freccia nel colore del percorso; dir: 'd' destra, 's' sinistra, 'g' giù, 'u' su
    const p = { d: 'l-8-6M' + x + ' ' + y + 'l-8 6', s: 'l8-6M' + x + ' ' + y + 'l8 6', g: 'l-6-8M' + x + ' ' + y + 'l6-8', u: 'l-6 8M' + x + ' ' + y + 'l6 8' }[dir];
    return '<path class="fig-sala-macchine-punta" d="M' + x + ' ' + y + p + '"/>';
  }

  function svgSala() {
    const caselle = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const x = 206 + c * 47;
        const y = 306 + r * 41;
        caselle.push('<rect class="fig-sala-macchine-vetro" x="' + x + '" y="' + y + '" width="44" height="38" rx="2"/>');
        const piena = (r * 3 + c) % 4 !== 1 && !(r === 1 && c === 2);
        if (piena) caselle.push('<path class="fig-sala-macchine-carta" d="M' + (x + 7) + ' ' + (y + 38) + 'V' + (y + 22 - (c % 2) * 4) + 'H' + (x + 37) + 'V' + (y + 38) + '"/>' +
          '<path class="fig-sala-macchine-righe" d="M' + (x + 12) + ' ' + (y + 30 - (c % 2) * 4) + 'H' + (x + 30) + '"/>');
      }
    }
    const luci = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) {
        const x = 731 + c * 8;
        const y = 302 + r * 11;
        luci.push('<circle class="fig-sala-macchine-spenta" cx="' + x + '" cy="' + y + '" r="2.6"/>' +
          '<circle class="fig-sala-macchine-accesa fig-sala-macchine-calcola' + ((r + c) % 2 ? ' fig-sala-macchine-c2' : '') + '" cx="' + x + '" cy="' + y + '" r="2.6"/>');
      }
    }
    const tacche = [];
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6;
      tacche.push('M' + (132 + Math.cos(a) * 17).toFixed(1) + ' ' + (362 + Math.sin(a) * 17).toFixed(1) + 'L' + (132 + Math.cos(a) * 21).toFixed(1) + ' ' + (362 + Math.sin(a) * 21).toFixed(1));
    }

    return '<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="fig-sala-macchine-sfondo" width="800" height="500"/>' +
      '<text class="fig-sala-macchine-tit" x="24" y="44">ELABORAZIONE A LOTTI</text>' +
      // legenda: lo stesso colore segue il lavoro dell'utente, dal mazzo al tabulato
      '<rect class="fig-sala-macchine-lavoro" x="456" y="30" width="28" height="18" rx="2"/>' +
      '<path class="fig-sala-macchine-lavoro-l" d="M460 35H480M460 39H480M460 43H480"/>' +
      '<text class="fig-sala-macchine-leg" x="492" y="45">un mazzo, un job</text>' +
      '<path class="fig-sala-macchine-lavoro" d="M654 28H688V50H654Z"/>' +
      '<path class="fig-sala-macchine-lavoro-l" d="M660 35H681M660 41H677M654 36l-3 3 3 3"/>' +
      '<text class="fig-sala-macchine-leg" x="696" y="45">tabulato</text>' +
      '<path class="fig-sala-macchine-pavimento" d="M20 232H660M180 440H790"/>' +

      // percorso del mazzo, del tabulato e il ritorno del programmatore
      '<path class="fig-sala-macchine-percorso" d="M' + P1.join(' ') + 'L' + P2.join(' ') + 'L' + P3.join(' ') + 'L' + P4.join(' ') + 'L' + P5.join(' ') + '"/>' +
      freccia(170, 156, 'd') + freccia(318, 156, 'd') + freccia(448, 163, 'd') +
      '<path class="fig-sala-macchine-percorso" d="M' + P6.join(' ') + 'L' + P7.join(' ') + '"/>' +
      freccia(420, 342, 's') +
      '<path class="fig-sala-macchine-percorso" d="M196 428H70V274"/>' + freccia(70, 272, 'u') +

      // 1 · il programmatore con il suo mazzo
      persona(96, 232) +

      // 2 · lo sportello
      '<path class="fig-sala-macchine-parete" d="M160 232V84H300V232Z"/>' +
      '<rect class="fig-sala-macchine-vetro" x="182" y="104" width="96" height="60" rx="2"/>' +
      '<rect class="fig-sala-macchine-metallo" x="172" y="164" width="116" height="9" rx="2"/>' +
      '<path class="fig-sala-macchine-sottile" d="M176 192H284M176 212H284"/>' +

      // 3 · l'operatore e la coda dei lavori
      persona(352, 232) +
      '<rect class="fig-sala-macchine-metallo" x="400" y="176" width="122" height="10" rx="2"/>' +
      '<path class="fig-sala-macchine-sottile" d="M410 186V230M512 186V230M410 214H512"/>' +
      [406, 434, 462].map((x) => '<rect class="fig-sala-macchine-schede" x="' + x + '" y="160" width="24" height="16" rx="2"/>' +
        '<path class="fig-sala-macchine-sottile" d="M' + (x + 3) + ' 165H' + (x + 21) + 'M' + (x + 3) + ' 170H' + (x + 21) + '"/>').join('') +

      // 4 · il lettore di schede
      '<rect class="fig-sala-macchine-metallo" x="540" y="160" width="110" height="72" rx="4"/>' +
      '<rect class="fig-sala-macchine-metallo-2" x="608" y="128" width="36" height="34" rx="2"/>' +
      '<rect class="fig-sala-macchine-schede" x="613" y="140" width="26" height="22"/>' +
      '<rect class="fig-sala-macchine-metallo-2" x="552" y="148" width="40" height="14" rx="2"/>' +
      '<rect class="fig-sala-macchine-schede" x="557" y="152" width="30" height="10"/>' +
      '<rect class="fig-sala-macchine-pannello" x="548" y="170" width="94" height="12" rx="2"/>' +
      '<path class="fig-sala-macchine-feritoie" d="M552 196H590M552 204H590M552 212H590M600 196H638M600 204H638M600 212H638"/>' +
      // il cavo porta le schede lette al calcolatore
      '<path class="fig-sala-macchine-cavo" d="M650 196H702Q716 196 716 210V272M709 264l7 8 7-8"/>' +

      // 5 · il calcolatore
      '<rect class="fig-sala-macchine-metallo" x="650" y="280" width="62" height="160" rx="3"/>' +
      '<rect class="fig-sala-macchine-vetro" x="656" y="290" width="50" height="48" rx="2"/>' +
      '<circle class="fig-sala-macchine-metallo" cx="669" cy="306" r="11"/><circle class="fig-sala-macchine-nastro" cx="669" cy="306" r="6"/>' +
      '<circle class="fig-sala-macchine-metallo" cx="693" cy="306" r="11"/><circle class="fig-sala-macchine-nastro" cx="693" cy="306" r="6"/>' +
      '<path class="fig-sala-macchine-feritoie" d="M658 360H704M658 368H704M658 376H704M658 400H704M658 408H704"/>' +
      '<rect class="fig-sala-macchine-metallo" x="716" y="280" width="66" height="160" rx="3"/>' +
      '<rect class="fig-sala-macchine-pannello" x="723" y="292" width="52" height="44" rx="2"/>' +
      luci.join('') +
      '<path class="fig-sala-macchine-sottile" d="M749 350V430"/>' +
      '<path class="fig-sala-macchine-feritoie" d="M724 362H744M724 370H744M754 362H774M754 370H774"/>' +
      '<path class="fig-sala-macchine-cavo" d="M650 410H596M604 403l-8 7 8 7"/>' +

      // 6 · la stampante a righe con il modulo continuo
      '<path class="fig-sala-macchine-carta" d="M486 346V316q0-6 6-6H538q6 0 6 6V346"/>' +
      '<path class="fig-sala-macchine-righe" d="M496 322H530M496 332H522"/>' +
      '<rect class="fig-sala-macchine-metallo" x="462" y="344" width="106" height="20" rx="5"/>' +
      '<rect class="fig-sala-macchine-metallo" x="456" y="362" width="118" height="78" rx="4"/>' +
      '<rect class="fig-sala-macchine-pannello" x="464" y="370" width="102" height="12" rx="2"/>' +
      '<path class="fig-sala-macchine-feritoie" d="M466 396H560M466 404H560M466 412H560"/>' +

      // 7 · le caselle dei tabulati
      '<rect class="fig-sala-macchine-metallo" x="200" y="300" width="150" height="136" rx="3"/>' +
      caselle.join('') +
      '<rect class="fig-sala-macchine-metallo-2" x="196" y="434" width="158" height="6"/>' +

      // l'attesa: le lancette fanno due giri
      '<circle class="fig-sala-macchine-orologio" cx="132" cy="362" r="25"/>' +
      '<path class="fig-sala-macchine-sottile" d="' + tacche.join('') + '"/>' +
      '<path class="fig-sala-macchine-sottile" stroke-width="2.5" d="M132 362l-8-6"/>' +
      '<path class="fig-sala-macchine-lancetta" d="M132 362V344"/>' +
      '<circle cx="132" cy="362" r="3" fill="var(--fig-ink)"/>' +
      '<text class="fig-sala-macchine-nota" x="132" y="412" text-anchor="middle">ore dopo</text>' +

      // il mazzo e il tabulato che viaggiano
      '<g class="fig-sala-macchine-tabulato">' +
        '<path class="fig-sala-macchine-lavoro" d="M-17 -11H17V11H-17Z"/>' +
        '<path class="fig-sala-macchine-lavoro-l" d="M-11 -4H10M-11 2H6M-17 -3l-3 3 3 3"/>' +
      '</g>' +
      '<g class="fig-sala-macchine-mazzo">' +
        '<rect class="fig-sala-macchine-lavoro" x="-14" y="-9" width="28" height="18" rx="2"/>' +
        '<path class="fig-sala-macchine-lavoro-l" d="M-10 -4H10M-10 0H10M-10 4H10"/>' +
      '</g>' +

      // didascalie
      '<text class="fig-sala-macchine-t" x="96" y="258" text-anchor="middle">programmatore</text>' +
      '<text class="fig-sala-macchine-t" x="230" y="258" text-anchor="middle">sportello</text>' +
      '<text class="fig-sala-macchine-t" x="352" y="258" text-anchor="middle">operatore</text>' +
      '<text class="fig-sala-macchine-t" x="461" y="258" text-anchor="middle">coda</text>' +
      '<text class="fig-sala-macchine-t" x="595" y="258" text-anchor="middle">lettore di schede</text>' +
      '<text class="fig-sala-macchine-t" x="275" y="466" text-anchor="middle">caselle</text>' +
      '<text class="fig-sala-macchine-t" x="515" y="466" text-anchor="middle">stampante</text>' +
      '<text class="fig-sala-macchine-t" x="716" y="466" text-anchor="middle">calcolatore</text>' +
      '</svg>';
  }

  root.ProgStoria.figura('sala-macchine', {
    alt: 'Schema illustrato dell\'elaborazione a lotti, su due file. In alto, da sinistra: il programmatore tiene in mano il suo mazzo di schede, lo consegna allo sportello, l\'operatore lo prende e lo mette in coda con gli altri mazzi, poi lo carica nel lettore di schede. Un cavo porta i dati al calcolatore, in basso a destra, le cui luci lampeggiano mentre lavora; la stampante produce il tabulato, che finisce in una delle caselle. Un orologio, con la scritta «ore dopo», ricorda l\'attesa prima che il programmatore torni a ritirarlo. Il mazzo e il tabulato, nello stesso colore, percorrono il cammino uno dopo l\'altro.',
    css: cssSala,
    disegna() { return svgSala(); },
  });

  /* ===================== time-sharing ===================== */

  const CX = 400;
  const CY = 255;
  const TURNO = 1.2;   // secondi per ogni fetta di tempo
  // centri dei sei gruppi utente+terminale, in senso orario a partire da quello in alto a destra;
  // a destra il disegno è specchiato, così la telescrivente sta sempre dalla parte del calcolatore
  const TERMINALI = [
    { x: 548, y: 100, sp: true }, { x: 692, y: 255, sp: true }, { x: 548, y: 410, sp: true },
    { x: 252, y: 410, sp: false }, { x: 108, y: 255, sp: false }, { x: 252, y: 100, sp: false },
  ];
  const G = TERMINALI.length;

  function cssTime() {
    const ritardi = TERMINALI.map((t, i) => '.fig-time-sharing-t' + i + ' { animation-delay: ' + (i === 0 ? 0 : +(i * TURNO - G * TURNO).toFixed(2)) + 's; opacity: ' + (i === 0 ? 1 : 0) + '; }').join('\n    ');
    const fine = +(100 / G).toFixed(3);
    return `
    .fig-time-sharing-sfondo { fill: var(--fig-paper); }
    .fig-time-sharing-metallo { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .fig-time-sharing-metallo-2 { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .fig-time-sharing-pannello { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-time-sharing-vetro { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-time-sharing-nastro { fill: var(--fig-4); }
    .fig-time-sharing-carta { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.5; stroke-linejoin: round; }
    .fig-time-sharing-righe { fill: none; stroke: var(--fig-line); stroke-width: 1.8; stroke-linecap: round; }
    .fig-time-sharing-sottile { fill: none; stroke: var(--fig-ink); stroke-width: 1.5; stroke-linecap: round; }
    .fig-time-sharing-tasti { fill: none; stroke: var(--fig-ink); stroke-width: 2.5; stroke-dasharray: 3 3; }
    .fig-time-sharing-spenta { fill: var(--fig-metal-2); }
    .fig-time-sharing-accesa { fill: var(--fig-warm); }
    .fig-time-sharing-persona { fill: var(--fig-ink); opacity: .82; }
    .fig-time-sharing-arto { fill: none; stroke: var(--fig-ink); stroke-linecap: round; stroke-linejoin: round; opacity: .82; }
    .fig-time-sharing-sgabello { fill: none; stroke: var(--fig-metal-2); stroke-width: 4; stroke-linecap: round; }
    .fig-time-sharing-cavo { fill: none; stroke: var(--fig-line); stroke-width: 2.5; stroke-linecap: round; }
    .fig-time-sharing-cavo-on { fill: none; stroke: var(--cap); stroke-width: 5; stroke-linecap: round; }
    .fig-time-sharing-fetta { fill: none; stroke: var(--fig-metal); stroke-width: 16; }
    .fig-time-sharing-fetta-on { fill: none; stroke: var(--cap); stroke-width: 16; }
    .fig-time-sharing-bordo { fill: none; stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-time-sharing-spia { fill: var(--cap); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-time-sharing-riga-on { fill: none; stroke: var(--cap); stroke-width: 2.5; stroke-linecap: round; }
    .fig-time-sharing-guida { fill: none; stroke: var(--cap); stroke-width: 1.5; }
    .fig-time-sharing-punto { fill: var(--cap); }
    .fig-time-sharing-t { font: 700 19px var(--font, sans-serif); fill: var(--fig-ink); }
    .fig-time-sharing-nota { font: 700 19px var(--font, sans-serif); fill: var(--cap); }
    .fig-time-sharing-giro { fill: none; stroke: var(--cap); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }

    .fig-time-sharing-turno { animation: fig-time-sharing-turno ${G * TURNO}s linear infinite; }
    ${ritardi}
    @keyframes fig-time-sharing-turno { 0% { opacity: 1; } ${(fine - 1.2).toFixed(3)}% { opacity: 1; } ${fine}% { opacity: 0; } 98.8% { opacity: 0; } 100% { opacity: 1; } }
    .fig-time-sharing-luci { animation: fig-time-sharing-luci .9s step-end infinite; }
    .fig-time-sharing-luci-2 { animation-delay: -.45s; }
    @keyframes fig-time-sharing-luci { 0% { opacity: 1; } 50% { opacity: .2; } 100% { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      .fig-time-sharing-turno, .fig-time-sharing-luci { animation: none; }
    }
  `;
  }

  // Un utente seduto alla sua telescrivente, di profilo. Disegno di base: utente a sinistra, macchina a destra.
  function postazione(t, i) {
    const on = ' fig-time-sharing-turno fig-time-sharing-t' + i;
    const corpo =
      // sgabello e utente
      '<path class="fig-time-sharing-sgabello" d="M-46 16H-14M-30 16V46M-42 47H-18"/>' +
      '<path class="fig-time-sharing-arto" stroke-width="10" d="M-30 12L-6 14V44"/>' +
      '<path class="fig-time-sharing-persona" d="M-41 -22Q-30 -28 -19 -22L-16 14Q-30 18 -42 14Z"/>' +
      '<path class="fig-time-sharing-arto" stroke-width="7" d="M-22 -16Q-12 -6 0 -6"/>' +
      '<circle class="fig-time-sharing-persona" cx="-29" cy="-36" r="11"/>' +
      // telescrivente su supporto: tastiera verso l'utente, rotolo di carta in alto
      '<path class="fig-time-sharing-sottile" stroke-width="3" d="M10 18V46M52 18V46M10 38H52"/>' +
      '<path class="fig-time-sharing-carta" d="M28 -22C28 -34 30 -44 38 -48H48C42 -44 40 -34 40 -22Z"/>' +
      '<path class="fig-time-sharing-righe" d="M33 -36H39M32 -30H39"/>' +
      '<path class="fig-time-sharing-riga-on' + on + '" d="M33 -42H41"/>' +
      '<path class="fig-time-sharing-metallo" d="M2 0L14 -8V-24H50Q58 -24 58 -16V18H2Z"/>' +
      '<path class="fig-time-sharing-tasti" d="M5 -3L13 -9"/>' +
      '<path class="fig-time-sharing-sottile" d="M14 -8H58"/>' +
      '<circle class="fig-time-sharing-vetro" cx="44" cy="6" r="5"/>' +
      '<circle class="fig-time-sharing-spia' + on + '" cx="44" cy="6" r="5"/>';
    const tr = t.sp ? 'translate(' + t.x + ' ' + t.y + ') scale(-1 1)' : 'translate(' + t.x + ' ' + t.y + ')';
    return '<g transform="' + tr + '">' + corpo + '</g>';
  }

  function arco(r, a1, a2) {
    const p = (a) => [(CX + r * Math.cos(a * Math.PI / 180)).toFixed(1), (CY + r * Math.sin(a * Math.PI / 180)).toFixed(1)];
    const s = p(a1);
    const e = p(a2);
    return 'M' + s[0] + ' ' + s[1] + 'A' + r + ' ' + r + ' 0 ' + (a2 - a1 > 180 ? 1 : 0) + ' 1 ' + e[0] + ' ' + e[1];
  }

  function svgTime() {
    // il punto da cui esce il cavo, sul retro di ogni telescrivente, e la sua direzione vista dal centro
    const retro = TERMINALI.map((t) => [t.x + (t.sp ? -58 : 58), t.y + 4]);
    const ang = retro.map((p) => Math.atan2(p[1] - CY, p[0] - CX) * 180 / Math.PI);
    const R1 = 106;
    const fette = [];
    const cavi = [];
    TERMINALI.forEach((t, i) => {
      let a = ang[i];
      let prima = ang[(i + G - 1) % G];
      let dopo = ang[(i + 1) % G];
      while (prima > a) prima -= 360;
      while (dopo < a) dopo += 360;
      const a1 = (a + prima) / 2 + 3;
      const a2 = (a + dopo) / 2 - 3;
      fette.push('<path class="fig-time-sharing-fetta" d="' + arco(98, a1, a2) + '"/>' +
        '<path class="fig-time-sharing-fetta-on fig-time-sharing-turno fig-time-sharing-t' + i + '" d="' + arco(98, a1, a2) + '"/>');
      const r = a * Math.PI / 180;
      const da = [(CX + R1 * Math.cos(r)).toFixed(1), (CY + R1 * Math.sin(r)).toFixed(1)];
      cavi.push('<path class="fig-time-sharing-cavo" d="M' + da.join(' ') + 'L' + retro[i].join(' ') + '"/>' +
        '<path class="fig-time-sharing-cavo-on fig-time-sharing-turno fig-time-sharing-t' + i + '" d="M' + da.join(' ') + 'L' + retro[i].join(' ') + '"/>');
    });
    const luci = [];
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 7; c++) {
        const x = 370 + c * 10;
        const y = 268 + r * 11;
        luci.push('<circle class="fig-time-sharing-spenta" cx="' + x + '" cy="' + y + '" r="2.8"/>' +
          '<circle class="fig-time-sharing-accesa fig-time-sharing-luci' + ((r + c) % 2 ? ' fig-time-sharing-luci-2' : '') + '" cx="' + x + '" cy="' + y + '" r="2.8"/>');
      }
    }

    return '<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="fig-time-sharing-sfondo" width="800" height="500"/>' +
      cavi.join('') +
      '<circle class="fig-time-sharing-bordo" cx="' + CX + '" cy="' + CY + '" r="89"/>' +
      '<circle class="fig-time-sharing-bordo" cx="' + CX + '" cy="' + CY + '" r="107"/>' +
      fette.join('') +
      // il calcolatore centrale: due bobine, il pannello delle luci, gli sportelli
      '<rect class="fig-time-sharing-metallo" x="352" y="203" width="96" height="104" rx="4"/>' +
      '<rect class="fig-time-sharing-metallo-2" x="348" y="198" width="104" height="9" rx="2"/>' +
      '<rect class="fig-time-sharing-vetro" x="360" y="212" width="80" height="44" rx="2"/>' +
      '<circle class="fig-time-sharing-metallo" cx="381" cy="234" r="15"/><circle class="fig-time-sharing-nastro" cx="381" cy="234" r="8"/>' +
      '<circle class="fig-time-sharing-metallo" cx="419" cy="234" r="15"/><circle class="fig-time-sharing-nastro" cx="419" cy="234" r="8"/>' +
      '<rect class="fig-time-sharing-pannello" x="362" y="261" width="76" height="26" rx="2"/>' +
      luci.join('') +
      '<path class="fig-time-sharing-sottile" d="M400 292V304"/>' +
      TERMINALI.map(postazione).join('') +
      // didascalie
      '<text class="fig-time-sharing-t" x="' + CX + '" y="36" text-anchor="middle">calcolatore centrale</text>' +
      '<path class="fig-time-sharing-guida" d="M400 44V192"/><circle class="fig-time-sharing-punto" cx="400" cy="194" r="3.5"/>' +
      '<text class="fig-time-sharing-t" x="' + CX + '" y="488" text-anchor="middle">fetta di tempo</text>' +
      '<path class="fig-time-sharing-guida" d="M392 470L376 356"/><circle class="fig-time-sharing-punto" cx="376" cy="354" r="3.5"/>' +
      '<text class="fig-time-sharing-t" x="692" y="330" text-anchor="middle">terminale</text>' +
      // il turno passa in senso orario
      '<path class="fig-time-sharing-giro" d="' + arco(121, -52, -9) + '"/>' +
      (function () {
        const a = -9 * Math.PI / 180;
        const x = CX + 121 * Math.cos(a);
        const y = CY + 121 * Math.sin(a);
        return '<path class="fig-time-sharing-giro" d="M' + (x - 9).toFixed(1) + ' ' + (y - 6).toFixed(1) + 'L' + x.toFixed(1) + ' ' + y.toFixed(1) + 'L' + (x - 1).toFixed(1) + ' ' + (y - 11).toFixed(1) + '"/>';
      })() +
      '<text class="fig-time-sharing-nota" x="530" y="186">a turno</text>' +
      '</svg>';
  }

  root.ProgStoria.figura('time-sharing', {
    alt: 'Schema del time-sharing. Al centro un calcolatore, con due bobine e un pannello di luci, circondato da un anello diviso in sei archi: sono le fette di tempo. Tutto intorno sei utenti stilizzati, seduti ciascuno alla propria telescrivente, collegata al centro da un cavo. A turno, in senso orario, un arco dell\'anello si accende insieme al cavo e alla spia della telescrivente corrispondente: il calcolatore dedica una piccola fetta di tempo a un utente e poi passa al successivo, così in fretta che ognuno sembra averlo tutto per sé.',
    css: cssTime(),
    disegna() { return svgTime(); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
