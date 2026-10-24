/*
 * Illustrazioni del capitolo 4 · Dai numeri alle parole.
 *   nastro-edsac   il lettore fotoelettrico del nastro a 5 piste (vista dall'alto e sezione)
 *                  e l'armadietto d'acciaio con la biblioteca di subroutine
 * Colori dalla tavolozza --fig-* e --cap, così il disegno segue il tema chiaro o scuro.
 */
(function (root) {
  'use strict';
  if (!root.ProgStoria) return;

  /* ===================== nastro-edsac ===================== */

  const N = 12;              // caratteri in un giro dell'animazione (il disegno dei fori si ripete ogni N righe)
  const PASSO = 18;          // distanza tra due righe di fori: 0,1 pollici
  const CICLO = 12;          // secondi per N caratteri
  const SOSTA = 0.62;        // parte di ogni passo in cui il nastro resta fermo sotto la luce
  const CODICI = [0b10110, 0b01101, 0b11001, 0b00111, 0b10011, 0b01110, 0b11100, 0b00101, 0b10101, 0b01011, 0b11010, 0b00110];
  const PISTE_Y = [113, 131, 167, 185, 203];   // vista dall'alto: due piste, il foro di trascinamento, tre piste
  const TRASC_Y = 149;
  const LETTURA_X = 240;
  // sezione A–A (scala 2:1): posizione orizzontale di ogni pista e del foro di trascinamento
  const SEZ_X = [119.8, 155.8, 227.8, 263.8, 299.8];
  const SEZ_TRASC = 191.8;

  const bit = (v, i) => (v >> (4 - i)) & 1;
  const sottoLaLuce = (k) => CODICI[((-k % N) + N) % N];   // la riga che al passo k è sotto la luce
  const pc = (x) => +(x / N * 100).toFixed(3) + '%';

  function fotogrammi(nome, valore) {
    // valore(k) = opacità durante la sosta del passo k; durante lo spostamento tutto è al buio (0)
    let s = '@keyframes ' + nome + ' {';
    for (let k = 0; k < N; k++) s += ' ' + pc(k) + ' { opacity: ' + valore(k) + '; } ' + pc(k + SOSTA) + ' { opacity: 0; }';
    return s + ' 100% { opacity: ' + valore(0) + '; } }';
  }

  function cssNastro() {
    let avanza = '@keyframes fig-nastro-edsac-avanza {';
    for (let k = 0; k < N; k++) {
      avanza += ' ' + pc(k) + ', ' + pc(k + SOSTA) + ' { transform: translateX(' + (k * PASSO) + 'px); }';
    }
    avanza += ' 100% { transform: translateX(' + (N * PASSO) + 'px); } }';
    const anim = [];
    const base = [];
    const kf = [avanza, fotogrammi('fig-nastro-edsac-sosta', () => 1)];
    for (let i = 0; i < 5; i++) {
      kf.push(fotogrammi('fig-nastro-edsac-l' + i, (k) => bit(sottoLaLuce(k), i)));
      kf.push(fotogrammi('fig-nastro-edsac-z' + i, (k) => 1 - bit(sottoLaLuce(k), i)));
      anim.push('.fig-nastro-edsac-l' + i + ' { animation-name: fig-nastro-edsac-l' + i + '; }');
      anim.push('.fig-nastro-edsac-z' + i + ' { animation-name: fig-nastro-edsac-z' + i + '; }');
      base.push('.fig-nastro-edsac-l' + i + ' { opacity: ' + bit(CODICI[0], i) + '; }');
      base.push('.fig-nastro-edsac-z' + i + ' { opacity: ' + (1 - bit(CODICI[0], i)) + '; }');
    }
    const tutti = '.fig-nastro-edsac-fori, .fig-nastro-edsac-sosta, .fig-nastro-edsac-l0, .fig-nastro-edsac-l1, .fig-nastro-edsac-l2, .fig-nastro-edsac-l3, .fig-nastro-edsac-l4, .fig-nastro-edsac-z0, .fig-nastro-edsac-z1, .fig-nastro-edsac-z2, .fig-nastro-edsac-z3, .fig-nastro-edsac-z4';
    return `
    .fig-nastro-edsac-sfondo { fill: var(--fig-paper); }
    .fig-nastro-edsac-griglia { stroke: var(--fig-line); stroke-width: 1; opacity: .14; }
    .fig-nastro-edsac-carta { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .fig-nastro-edsac-carta-s { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-nastro-edsac-foro { fill: var(--fig-ink); }
    .fig-nastro-edsac-vuoto { fill: var(--fig-paper); }
    .fig-nastro-edsac-bordo-foro { fill: none; stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-nastro-edsac-metallo { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .fig-nastro-edsac-metallo-2 { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .fig-nastro-edsac-scuro { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-nastro-edsac-guida-n { fill: none; stroke: var(--fig-metal-2); stroke-width: 3; stroke-linecap: round; }
    .fig-nastro-edsac-luce { fill: var(--fig-warm); }
    .fig-nastro-edsac-alone { fill: var(--fig-warm); opacity: .3; }
    .fig-nastro-edsac-fascio { fill: var(--fig-warm); opacity: .85; }
    .fig-nastro-edsac-lampada { fill: var(--fig-warm); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-nastro-edsac-filo { fill: none; stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-nastro-edsac-taglio { fill: none; stroke: var(--fig-ink); stroke-width: 1.5; stroke-dasharray: 14 4 3 4; }
    .fig-nastro-edsac-taglio-f { fill: none; stroke: var(--fig-ink); stroke-width: 3.5; }
    .fig-nastro-edsac-freccia { fill: none; stroke: var(--fig-ink); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .fig-nastro-edsac-divisore { stroke: var(--fig-line); stroke-width: 1.5; stroke-dasharray: 2 7; stroke-linecap: round; }
    .fig-nastro-edsac-casella { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-nastro-edsac-cassetto { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-nastro-edsac-etichetta { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-nastro-edsac-maniglia { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-nastro-edsac-pavimento { stroke: var(--fig-ink); stroke-width: 2; }
    .fig-nastro-edsac-guida { fill: none; stroke: var(--cap); stroke-width: 1.5; }
    .fig-nastro-edsac-punto { fill: var(--cap); }
    .fig-nastro-edsac-t { font: 700 19px var(--font, sans-serif); fill: var(--fig-ink); }
    .fig-nastro-edsac-tit { font: 800 16px var(--mono, monospace); fill: var(--fig-ink); letter-spacing: .08em; }
    .fig-nastro-edsac-tit-2 { font: 800 15px var(--mono, monospace); fill: var(--cap); letter-spacing: .08em; }
    .fig-nastro-edsac-nome { font: 700 15px var(--font, sans-serif); fill: var(--fig-ink); }
    .fig-nastro-edsac-lettera { font: 800 17px var(--mono, monospace); fill: var(--fig-ink); }
    .fig-nastro-edsac-bit { font: 800 20px var(--mono, monospace); fill: var(--fig-ink); }
    .fig-nastro-edsac-bit-0 { fill: var(--fig-line); }

    .fig-nastro-edsac-fori { animation: fig-nastro-edsac-avanza ${CICLO}s ease-in-out infinite; }
    .fig-nastro-edsac-sosta { animation-name: fig-nastro-edsac-sosta; }
    .fig-nastro-edsac-sosta, .fig-nastro-edsac-l0, .fig-nastro-edsac-l1, .fig-nastro-edsac-l2, .fig-nastro-edsac-l3, .fig-nastro-edsac-l4,
    .fig-nastro-edsac-z0, .fig-nastro-edsac-z1, .fig-nastro-edsac-z2, .fig-nastro-edsac-z3, .fig-nastro-edsac-z4 {
      animation-duration: ${CICLO}s; animation-timing-function: step-end; animation-iteration-count: infinite;
    }
    ${base.join('\n    ')}
    ${anim.join('\n    ')}
    ${kf.join('\n    ')}
    @media (prefers-reduced-motion: reduce) {
      ${tutti} { animation: none; }
    }
  `;
  }

  function svgNastro(ctx) {
    const id = ctx && ctx.uid ? ctx.uid('fig-nastro') : 'fig-nastro-1';
    const ritaglio = id + '-c';
    const sagoma = 'M22 96H466l-8 20 10 21-10 21 10 21-10 21 8 20H22l8-20-10-21 10-21-10-21 10-21Z';

    const griglia = [];
    for (let x = 40; x < 800; x += 40) griglia.push('<path d="M' + x + ' 0V500"/>');
    for (let y = 40; y < 500; y += 40) griglia.push('<path d="M0 ' + y + 'H800"/>');

    // i fori: righe da 0,1 pollici; il gruppo intero scorre verso destra un carattere alla volta
    const fori = [];
    for (let j = -2 * N; j <= 13; j++) {
      const x = LETTURA_X + j * PASSO;
      const v = CODICI[((j % N) + N) % N];
      for (let i = 0; i < 5; i++) if (bit(v, i)) fori.push('<circle cx="' + x + '" cy="' + PISTE_Y[i] + '" r="6.5"/>');
      fori.push('<circle cx="' + x + '" cy="' + TRASC_Y + '" r="4.1"/>');
    }

    // sezione A–A: per ogni pista il foro nella carta, il fascio sotto il nastro, la fotocellula accesa, il bit 1; oppure il bit 0
    const piste = SEZ_X.map((x, i) =>
      '<g class="fig-nastro-edsac-l' + i + '">' +
        '<rect class="fig-nastro-edsac-vuoto" x="' + (x - 13) + '" y="345" width="26" height="12"/>' +
        '<path class="fig-nastro-edsac-bordo-foro" d="M' + (x - 13) + ' 346V356M' + (x + 13) + ' 346V356"/>' +
        '<rect class="fig-nastro-edsac-fascio" x="' + (x - 6) + '" y="345" width="12" height="49"/>' +
        '<circle class="fig-nastro-edsac-luce" cx="' + x + '" cy="403" r="7"/>' +
        '<text class="fig-nastro-edsac-bit" x="' + x + '" y="451" text-anchor="middle">1</text>' +
      '</g>' +
      '<g class="fig-nastro-edsac-z' + i + '"><text class="fig-nastro-edsac-bit fig-nastro-edsac-bit-0" x="' + x + '" y="451" text-anchor="middle">0</text></g>'
    ).join('');

    // fessure della mascherina sopra il nastro: solo davanti alle cinque piste
    const fessure = [];
    let da = 78;
    SEZ_X.forEach((x) => { fessure.push([da, x - 6]); da = x + 6; });
    fessure.push([da, 342]);

    const cassetti = [];
    const nomi = [['seno', 'coseno'], ['logaritmo', 'divisione'], [null, 'integrali'], ['stampa', 'lettura'], ['matrici', '…']];
    nomi.forEach((riga, r) => riga.forEach((nome, c) => {
      if (!nome) return;
      const x = 534 + c * 116;
      const y = 86 + r * 68;
      cassetti.push(
        '<rect class="fig-nastro-edsac-cassetto" x="' + x + '" y="' + y + '" width="106" height="58" rx="3"/>' +
        '<rect class="fig-nastro-edsac-etichetta" x="' + (x + 9) + '" y="' + (y + 8) + '" width="88" height="22" rx="2"/>' +
        '<text class="fig-nastro-edsac-nome" x="' + (x + 53) + '" y="' + (y + 24) + '" text-anchor="middle">' + nome + '</text>' +
        '<path class="fig-nastro-edsac-maniglia" d="M' + (x + 38) + ' ' + (y + 38) + 'h30v7q0 4-4 4h-22q-4 0-4-4Z"/>');
    }));

    return '<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><clipPath id="' + ritaglio + '"><path d="' + sagoma + '"/></clipPath></defs>' +
      '<rect class="fig-nastro-edsac-sfondo" width="800" height="500"/>' +
      '<g class="fig-nastro-edsac-griglia">' + griglia.join('') + '</g>' +

      '<text class="fig-nastro-edsac-tit" x="24" y="40">LETTORE FOTOELETTRICO</text>' +
      '<text class="fig-nastro-edsac-tit" x="500" y="40">BIBLIOTECA DI SUBROUTINE</text>' +
      '<path class="fig-nastro-edsac-divisore" d="M488 58V482"/>' +

      // ---- vista dall'alto: la piastra del lettore, il nastro che scorre, la riga sotto la luce ----
      '<rect class="fig-nastro-edsac-metallo" x="172" y="76" width="136" height="164" rx="10"/>' +
      '<circle class="fig-nastro-edsac-vite" cx="186" cy="87" r="4.5"/><circle class="fig-nastro-edsac-vite" cx="294" cy="87" r="4.5"/>' +
      '<circle class="fig-nastro-edsac-vite" cx="186" cy="229" r="4.5"/><circle class="fig-nastro-edsac-vite" cx="294" cy="229" r="4.5"/>' +
      '<path class="fig-nastro-edsac-carta" d="' + sagoma + '"/>' +
      '<g clip-path="url(#' + ritaglio + ')"><g class="fig-nastro-edsac-fori fig-nastro-edsac-foro">' + fori.join('') + '</g></g>' +
      '<path class="fig-nastro-edsac-guida-n" d="M176 93H304M176 223H304"/>' +
      '<rect class="fig-nastro-edsac-alone" x="' + (LETTURA_X - 10) + '" y="96" width="20" height="124"/>' +
      // linea di sezione A–A
      '<path class="fig-nastro-edsac-taglio" d="M240 60V256"/>' +
      '<path class="fig-nastro-edsac-taglio-f" d="M240 58V72M240 244V258"/>' +
      '<path class="fig-nastro-edsac-freccia" d="M240 64H262M255 58l7 6-7 6M240 252H262M255 246l7 6-7 6"/>' +
      '<text class="fig-nastro-edsac-lettera" x="268" y="70">A</text>' +
      '<text class="fig-nastro-edsac-lettera" x="268" y="258">A</text>' +
      // verso di scorrimento
      '<path class="fig-nastro-edsac-freccia" d="M370 80H444M436 74l8 6-8 6"/>' +
      '<path class="fig-nastro-edsac-guida" d="M96 78 116 106"/><circle class="fig-nastro-edsac-punto" cx="116" cy="106" r="3.5"/>' +
      '<text class="fig-nastro-edsac-t" x="24" y="72">nastro a 5 piste</text>' +

      // ---- sezione A–A, in scala 2:1 ----
      '<text class="fig-nastro-edsac-tit-2" x="356" y="276">SEZIONE A–A</text>' +
      '<path class="fig-nastro-edsac-metallo" d="M88 306V278q0-14 14-14H318q14 0 14 14V306"/>' +
      '<path class="fig-nastro-edsac-alone" d="M98 306H322L342 328H78Z"/>' +
      '<rect class="fig-nastro-edsac-scuro" x="96" y="281" width="12" height="18" rx="2"/>' +
      '<rect class="fig-nastro-edsac-scuro" x="312" y="281" width="12" height="18" rx="2"/>' +
      '<rect class="fig-nastro-edsac-lampada" x="106" y="282" width="208" height="16" rx="8"/>' +
      '<path class="fig-nastro-edsac-filo" d="M114 290h8l4-4 4 8 4-8 4 8 4-8 4 8 4-4H298"/>' +
      fessure.map((f) => '<rect class="fig-nastro-edsac-scuro" x="' + f[0].toFixed(1) + '" y="327" width="' + (f[1] - f[0]).toFixed(1) + '" height="8"/>').join('') +
      SEZ_X.map((x) => '<rect class="fig-nastro-edsac-fascio" x="' + (x - 6) + '" y="335" width="12" height="11"/>').join('') +
      '<rect class="fig-nastro-edsac-carta-s" x="86" y="346" width="248" height="10"/>' +
      '<g class="fig-nastro-edsac-sosta"><rect class="fig-nastro-edsac-vuoto" x="' + (SEZ_TRASC - 8.3) + '" y="345" width="16.6" height="12"/>' +
        '<path class="fig-nastro-edsac-bordo-foro" d="M' + (SEZ_TRASC - 8.3) + ' 346V356M' + (SEZ_TRASC + 8.3) + ' 346V356"/></g>' +
      SEZ_X.map((x) => '<rect class="fig-nastro-edsac-metallo-2" x="' + (x - 13) + '" y="392" width="26" height="24" rx="3"/>' +
        '<circle class="fig-nastro-edsac-casella" cx="' + x + '" cy="403" r="7"/>' +
        '<path class="fig-nastro-edsac-filo" d="M' + x + ' 416V430"/>' +
        '<rect class="fig-nastro-edsac-casella" x="' + (x - 13) + '" y="430" width="26" height="28" rx="2"/>').join('') +
      piste +
      '<path class="fig-nastro-edsac-freccia" d="M318 444H346M338 438l8 6-8 6"/>' +
      '<text class="fig-nastro-edsac-t" x="356" y="451">all\'EDSAC</text>' +
      '<path class="fig-nastro-edsac-guida" d="M352 296H340L326 290"/><circle class="fig-nastro-edsac-punto" cx="326" cy="290" r="3.5"/>' +
      '<text class="fig-nastro-edsac-t" x="356" y="303">lampada</text>' +
      '<path class="fig-nastro-edsac-guida" d="M352 352H336"/><circle class="fig-nastro-edsac-punto" cx="336" cy="352" r="3.5"/>' +
      '<text class="fig-nastro-edsac-t" x="356" y="359">nastro</text>' +
      '<path class="fig-nastro-edsac-guida" d="M352 406H340L314 404"/><circle class="fig-nastro-edsac-punto" cx="314" cy="404" r="3.5"/>' +
      '<text class="fig-nastro-edsac-t" x="356" y="413">fotocellule</text>' +

      // ---- l'armadietto d'acciaio con gli originali delle subroutine ----
      '<rect class="fig-nastro-edsac-metallo" x="514" y="62" width="262" height="14" rx="3"/>' +
      '<rect class="fig-nastro-edsac-metallo" x="520" y="74" width="250" height="356" rx="4"/>' +
      '<rect class="fig-nastro-edsac-metallo-2" x="528" y="430" width="234" height="16"/>' +
      '<path class="fig-nastro-edsac-pavimento" d="M496 446H792"/>' +
      cassetti.join('') +
      // il cassetto aperto, tirato verso chi guarda
      '<rect class="fig-nastro-edsac-metallo-2" x="534" y="222" width="106" height="58" rx="2"/>' +
      '<path class="fig-nastro-edsac-scuro" d="M504 243H610L640 222H534Z"/>' +
      '<ellipse class="fig-nastro-edsac-carta-s" cx="574" cy="233" rx="30" ry="8"/>' +
      '<ellipse class="fig-nastro-edsac-carta-s" cx="574" cy="233" rx="17" ry="4.5"/>' +
      '<ellipse class="fig-nastro-edsac-scuro" cx="574" cy="233" rx="7" ry="2"/>' +
      '<path class="fig-nastro-edsac-metallo-2" d="M610 243L640 222V280L610 301Z"/>' +
      '<rect class="fig-nastro-edsac-cassetto" x="504" y="243" width="106" height="58" rx="3"/>' +
      '<rect class="fig-nastro-edsac-etichetta" x="513" y="248" width="88" height="34" rx="2"/>' +
      '<text class="fig-nastro-edsac-nome" x="557" y="262" text-anchor="middle">radice</text>' +
      '<text class="fig-nastro-edsac-nome" x="557" y="278" text-anchor="middle">quadrata</text>' +
      '<path class="fig-nastro-edsac-maniglia" d="M542 286h30v6q0 4-4 4h-22q-4 0-4-4Z"/>' +
      // il capo del nastro che pende dal cassetto
      '<path class="fig-nastro-edsac-carta-s" d="M508 240h16v86l-4 6-4-5-4 6-4-6Z"/>' +
      '<g class="fig-nastro-edsac-foro">' +
        [[1, 0], [0, 1], [1, 1], [1, 0], [0, 0], [1, 1], [0, 1], [1, 0], [1, 1]].map((b, n) => {
          const y = 250 + n * 8;
          return '<circle cx="516" cy="' + y + '" r="1.1"/>' + (b[0] ? '<circle cx="511.5" cy="' + y + '" r="1.9"/>' : '') + (b[1] ? '<circle cx="520.5" cy="' + y + '" r="1.9"/>' : '');
        }).join('') +
      '</g>' +
      '</svg>';
  }

  root.ProgStoria.figura('nastro-edsac', {
    alt: 'Disegno tecnico in due parti. A sinistra un lettore fotoelettrico di nastro di carta: dall\'alto si vede il nastro a cinque piste, con i fori piccoli di trascinamento, che scorre sulla piastra del lettore un carattere alla volta. Nella sezione A–A, ingrandita, una lampada illumina il nastro attraverso cinque fessure: dove la riga ha un foro la luce passa e accende la fotocellula sotto, che dà un 1; dove la carta è piena resta buio, ed è uno 0. I cinque bit vanno all\'EDSAC. A destra l\'armadietto d\'acciaio della biblioteca di subroutine: cassetti con le etichette seno, coseno, logaritmo, divisione, integrali, stampa, lettura, matrici; il cassetto «radice quadrata» è aperto e mostra un rotolo di nastro con il capo che pende.',
    css: cssNastro(),
    disegna(ctx) { return svgNastro(ctx); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
