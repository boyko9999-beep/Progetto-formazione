/*
 * Illustrazioni del capitolo 9 · Il software per tutti.
 *   altair-8800    il pannello frontale dell'Altair 8800 (1975): levette, lucine rosse e un programma
 *                  caricato un byte alla volta con DEPOSIT e DEPOSIT NEXT
 *   home-computer  un home computer degli anni Ottanta senza marchi: la tastiera con il computer dentro,
 *                  il televisore di casa che scrive READY. e il registratore a cassette
 * Colori dalla tavolozza --fig-* e --cap, così il disegno segue il tema chiaro o scuro.
 * Nessun accesso al DOM al caricamento: qui si preparano solo stringhe.
 */
(function (root) {
  'use strict';
  if (!root.ProgStoria) return;

  const n = (v) => String(Math.round(v * 10) / 10);

  /* ===================== altair-8800 ===================== */

  const AL = 'fig-altair-8800';
  const colonna = (i) => 94 + 36 * i;        // 18 colonne: le lucine e, sotto, le levette
  const Y_DATI = 140;                        // fila alta: 10 lucine di stato + 8 dei dati (D7…D0)
  const Y_IND = 184;                         // fila bassa: WAIT, HLDA + 16 dell'indirizzo (A15…A0)
  const Y_NUM = 226;                         // numeri dei bit sopra le levette
  const Y_LEVE = 256;                        // 16 levette di indirizzo e dati
  const Y_COM = 332;                         // levette di comando
  const X_COM = (j) => 184 + 72 * j;         // 8 comandi, uno ogni due levette
  const X_ACC = 112;                         // interruttore di accensione

  // Quattro byte di un piccolo programma per l'8080, scritti in ottale come nei manuali dell'epoca:
  // 072 200 000 (LDA 200) e 107 (MOV B,A).
  const BYTE = [0o072, 0o200, 0o000, 0o107];
  const CICLO = 13;        // secondi di un giro completo
  const PASSO = 3;         // un byte ogni 3 secondi
  const SCATTO = 1.3;      // dopo le levette dei dati, scatta DEPOSIT
  const PREMUTO = 0.45;    // quanto resta abbassata la levetta di comando
  const bit = (v, b) => (v >> b) & 1;

  // Regole @keyframes di sola opacità, a scatti: una per ogni sequenza diversa.
  const fotogrammi = [];
  const nomi = new Map();
  function sequenza(punti) {
    const tenuti = [];
    punti.forEach((q) => { if (!tenuti.length || tenuti[tenuti.length - 1][1] !== q[1]) tenuti.push(q); });
    const firma = tenuti.map((q) => q[0] + ':' + q[1]).join(' ');
    if (!nomi.has(firma)) {
      const nome = AL + '-k' + nomi.size;
      nomi.set(firma, nome);
      const passi = tenuti.map((q) => (q[0] === 0 ? '0%' : (q[0] / CICLO * 100).toFixed(2) + '%') + ' { opacity: ' + q[1] + '; }');
      fotogrammi.push('@keyframes ' + nome + ' { ' + passi.join(' ') + ' 100% { opacity: ' + tenuti[tenuti.length - 1][1] + '; } }');
      fotogrammi.push('.' + nome + ' { animation-name: ' + nome + '; }');
    }
    return AL + '-anim ' + nomi.get(firma);
  }
  const quando = (k) => k * PASSO;               // le levette dei dati cambiano
  const scatta = (k) => k * PASSO + SCATTO;      // DEPOSIT (k = 0) o DEPOSIT NEXT (k > 0)
  const leva = (b, su) => sequenza(BYTE.map((v, k) => [quando(k), su ? bit(v, b) : 1 - bit(v, b)]));
  const datoAcceso = (b) => sequenza([[0, 0]].concat(BYTE.map((v, k) => [scatta(k) + 0.1, bit(v, b)])));
  const indirizzoAcceso = (b) => sequenza([[0, 0]].concat(BYTE.map((v, k) => [scatta(k) + 0.1, bit(k, b)])));
  function comando(stato) {             // 'su' (DEPOSIT), 'giu' (DEPOSIT NEXT) o 'riposo'
    const punti = [[0, stato === 'riposo' ? 1 : 0]];
    BYTE.forEach((v, k) => {
      const verso = k === 0 ? 'su' : 'giu';
      punti.push([scatta(k), stato === 'riposo' ? 0 : (stato === verso ? 1 : 0)]);
      punti.push([scatta(k) + PREMUTO, stato === 'riposo' ? 1 : 0]);
    });
    return sequenza(punti);
  }

  // --- pezzi del pannello ---
  function lucina(x, y, acceso, classi) {
    return '<circle class="' + AL + '-foro" cx="' + x + '" cy="' + y + '" r="8"/>' +
      '<circle class="' + AL + '-spenta" cx="' + x + '" cy="' + y + '" r="5.5"/>' +
      '<g class="' + AL + '-accesa' + (classi ? ' ' + classi : '') + '" opacity="' + acceso + '">' +
        '<circle class="' + AL + '-alone" cx="' + x + '" cy="' + y + '" r="11.5"/>' +
        '<circle class="' + AL + '-luce" cx="' + x + '" cy="' + y + '" r="5.5"/>' +
        '<circle class="' + AL + '-riflesso" cx="' + n(x - 1.8) + '" cy="' + n(y - 1.8) + '" r="1.8"/>' +
      '</g>';
  }
  function dado(x, y) {
    const v = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + i * Math.PI / 3;
      v.push(n(x + 10 * Math.cos(a)) + ' ' + n(y + 10 * Math.sin(a)));
    }
    return '<path class="' + AL + '-dado" d="M' + v.join('L') + 'Z"/>' +
      '<circle class="' + AL + '-boccola" cx="' + x + '" cy="' + y + '" r="5.5"/>';
  }
  // verso: -1 in su, +1 in giù, 0 a riposo (la levetta punta verso chi guarda)
  function levetta(x, y, verso, classi, opacita) {
    const apri = '<g class="' + AL + '-leva' + (classi ? ' ' + classi : '') + '"' + (opacita != null ? ' opacity="' + opacita + '"' : '') + '>';
    if (!verso) return apri + '<circle cx="' + x + '" cy="' + y + '" r="5.2"/></g>';
    const fine = y + verso * 15;
    return apri + '<path d="M' + n(x - 3) + ' ' + y + 'L' + n(x - 3.6) + ' ' + fine + 'H' + n(x + 3.6) + 'L' + n(x + 3) + ' ' + y + 'Z"/>' +
      '<circle cx="' + x + '" cy="' + (y + verso * 17) + '" r="4.6"/></g>';
  }
  const stampa = (x, y, t, cl) => '<text class="' + AL + '-' + (cl || 'stampa') + '" x="' + x + '" y="' + y + '" text-anchor="middle">' + t + '</text>';

  function svgAltair() {
    const p = [];
    p.push('<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">');
    p.push('<rect class="' + AL + '-sfondo" width="800" height="500"/>');
    const g = [];
    for (let x = 40; x < 800; x += 40) g.push('<path d="M' + x + ' 0V500"/>');
    for (let y = 40; y < 500; y += 40) g.push('<path d="M0 ' + y + 'H800"/>');
    p.push('<g class="' + AL + '-griglia">' + g.join('') + '</g>');

    // mobile: base con piedini, coperchio blu che avvolge sopra e ai lati, pannello frontale
    p.push('<rect class="' + AL + '-base" x="160" y="402" width="52" height="12" rx="2"/>');
    p.push('<rect class="' + AL + '-base" x="588" y="402" width="52" height="12" rx="2"/>');
    p.push('<rect class="' + AL + '-base" x="22" y="392" width="756" height="12" rx="3"/>');
    p.push('<rect class="' + AL + '-coperchio" x="26" y="96" width="748" height="302" rx="8"/>');
    p.push('<rect class="' + AL + '-pannello" x="36" y="106" width="728" height="284" rx="3"/>');
    [[50, 120], [750, 120], [50, 376], [750, 376]].forEach(([x, y]) => {
      p.push('<circle class="' + AL + '-vite" cx="' + x + '" cy="' + y + '" r="4.5"/><path class="' + AL + '-taglio" d="M' + (x - 3) + ' ' + (y + 1.5) + 'L' + (x + 3) + ' ' + (y - 1.5) + '"/>');
    });

    // separatori stampati: i bit si leggono a gruppi di tre, una cifra ottale per gruppo
    const sep = [];
    [436, 508, 616].forEach((x) => sep.push('M' + x + ' ' + (Y_DATI - 10) + 'V' + (Y_DATI + 10)));
    [148, 184, 292, 400, 508, 616].forEach((x) => sep.push('M' + x + ' ' + (Y_IND - 10) + 'V' + (Y_IND + 10)));
    [184, 292, 400, 508, 616].forEach((x) => sep.push('M' + x + ' ' + (Y_NUM - 14) + 'V' + (Y_NUM + 4)));
    p.push('<path class="' + AL + '-sep" d="' + sep.join('') + '"/>');

    // fila alta: lucine di stato (accese MEMR, M1 e WO, come a macchina ferma) e degli 8 bit dei dati
    const statoAcceso = [0, 0, 1, 0, 1, 0, 0, 0, 1, 0];
    for (let i = 0; i < 10; i++) p.push(lucina(colonna(i), Y_DATI, statoAcceso[i]));
    for (let b = 7; b >= 0; b--) p.push(lucina(colonna(17 - b), Y_DATI, bit(BYTE[0], b), datoAcceso(b)));

    // fila bassa: WAIT (accesa), HLDA, poi i 16 bit dell'indirizzo
    p.push(lucina(colonna(0), Y_IND, 1));
    p.push(lucina(colonna(1), Y_IND, 0));
    for (let b = 15; b >= 0; b--) {
      const x = colonna(17 - b);
      p.push(b <= 1 ? lucina(x, Y_IND, 0, indirizzoAcceso(b)) : lucina(x, Y_IND, 0));
    }

    // 16 levette: in su = 1, in giù = 0. Le 8 di destra servono anche per i dati.
    for (let b = 15; b >= 0; b--) {
      const x = colonna(17 - b);
      p.push(stampa(x, Y_NUM, String(b), 'num'));
      p.push(dado(x, Y_LEVE));
      if (b >= 8) p.push(levetta(x, Y_LEVE, 1));
      else {
        p.push(levetta(x, Y_LEVE, -1, leva(b, true), bit(BYTE[0], b)));
        p.push(levetta(x, Y_LEVE, 1, leva(b, false), 1 - bit(BYTE[0], b)));
      }
    }

    // levette di comando, a tre posizioni: a riposo stanno in mezzo; DEPOSIT è in su, DEPOSIT NEXT in giù.
    // L'interruttore di accensione resta senza scritte: il verso di ON e OFF sul pannello originale non è verificato.
    const sopra = ['STOP', 'SINGLE', 'EXAMINE', 'DEPOSIT', 'RESET', 'PROTECT', 'AUX', 'AUX'];
    const sotto = ['RUN', 'STEP', 'NEXT', 'NEXT', 'CLR', 'UNPROTECT', 'AUX', 'AUX'];
    p.push(dado(X_ACC, Y_COM));
    p.push(levetta(X_ACC, Y_COM, -1));
    for (let j = 0; j < 8; j++) {
      const x = X_COM(j);
      if (sopra[j]) p.push(stampa(x, Y_COM - 27, sopra[j]));
      if (sotto[j]) p.push(stampa(x, Y_COM + 38, sotto[j]));
      p.push(dado(x, Y_COM));
      if (j === 3) {
        p.push('<circle class="' + AL + '-anello" cx="' + x + '" cy="' + Y_COM + '" r="17"/>');
        p.push('<circle class="' + AL + '-lampo ' + sequenza([[0, 0]].concat(...BYTE.map((v, k) => [[scatta(k), 1], [scatta(k) + PREMUTO, 0]]))) + '" opacity="0" cx="' + x + '" cy="' + Y_COM + '" r="17"/>');
        p.push(levetta(x, Y_COM, 0, comando('riposo'), 1));
        p.push(levetta(x, Y_COM, -1, comando('su'), 0));
        p.push(levetta(x, Y_COM, 1, comando('giu'), 0));
      } else p.push(levetta(x, Y_COM, 0));
    }

    // didascalie con linee guida
    p.push('<text class="' + AL + '-nota" x="40" y="50">lucine dell\'indirizzo</text>');
    p.push('<path class="' + AL + '-guida" d="M220 60V164M152 170V164H724V170"/><circle class="' + AL + '-punto" cx="220" cy="164" r="3.5"/>');
    p.push('<text class="' + AL + '-nota" x="462" y="50">lucine dei dati: un byte</text>');
    p.push('<path class="' + AL + '-guida" d="M580 60V120M440 126V120H720V126"/><circle class="' + AL + '-punto" cx="580" cy="120" r="3.5"/>');

    p.push('<text class="' + AL + '-nota" x="34" y="458">accensione</text>');
    p.push('<path class="' + AL + '-guida" d="M80 438V354L101 341"/><circle class="' + AL + '-punto" cx="101" cy="341" r="3.5"/>');
    p.push('<text class="' + AL + '-nota" x="296" y="458">DEPOSIT scrive il byte</text>');
    p.push('<text class="' + AL + '-nota" x="296" y="484">nella memoria</text>');
    p.push('<path class="' + AL + '-guida" d="M438 438V362L412 344"/><circle class="' + AL + '-punto" cx="412" cy="344" r="3.5"/>');
    p.push('<text class="' + AL + '-nota" x="566" y="458">levette dei dati:</text>');
    p.push('<text class="' + AL + '-nota" x="566" y="484">su = 1, giù = 0</text>');
    p.push('<path class="' + AL + '-guida" d="M652 438V286M440 280V286H720V280"/><circle class="' + AL + '-punto" cx="652" cy="286" r="3.5"/>');

    p.push('</svg>');
    return p.join('');
  }

  const SVG_ALTAIR = svgAltair();   // disegno statico: lo si prepara una volta (e così anche le regole @keyframes)

  const cssAltair = `
    .${AL}-sfondo { fill: var(--fig-paper); }
    .${AL}-griglia { stroke: var(--fig-line); stroke-width: 1; opacity: .14; }
    .${AL}-coperchio { fill: var(--fig-cool); stroke: var(--fig-ink); stroke-width: 2; }
    .${AL}-pannello { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; }
    .${AL}-base { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; }
    .${AL}-vite { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${AL}-taglio { stroke: var(--fig-ink); stroke-width: 1.5; }
    .${AL}-sep { fill: none; stroke: var(--fig-ink); stroke-width: 1.5; opacity: .45; }
    .${AL}-foro { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${AL}-spenta { fill: var(--fig-red); opacity: .32; }
    .${AL}-alone { fill: var(--fig-red); opacity: .3; }
    .${AL}-luce { fill: var(--fig-red); }
    .${AL}-riflesso { fill: var(--fig-warm); }
    .${AL}-dado { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 1.5; stroke-linejoin: round; }
    .${AL}-boccola { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.2; }
    .${AL}-leva path, .${AL}-leva circle { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.6; stroke-linejoin: round; }
    .${AL}-anello { fill: none; stroke: var(--cap); stroke-width: 2; }
    .${AL}-lampo { fill: none; stroke: var(--cap); stroke-width: 5; }
    .${AL}-stampa { font: 700 14px var(--font, sans-serif); fill: var(--fig-ink); }
    .${AL}-num { font: 700 14px var(--mono, monospace); fill: var(--fig-ink); }
    .${AL}-guida { fill: none; stroke: var(--cap); stroke-width: 1.8; }
    .${AL}-punto { fill: var(--cap); }
    .${AL}-nota { font: 700 21px var(--font, sans-serif); fill: var(--cap); }
    .${AL}-anim { animation-duration: ${CICLO}s; animation-iteration-count: infinite; animation-timing-function: step-end; }
    ${fotogrammi.join('\n    ')}
    @media (prefers-reduced-motion: reduce) {
      .${AL}-anim { animation: none; }
    }
  `;

  root.ProgStoria.figura('altair-8800', {
    alt: 'Il pannello frontale di un Altair 8800 visto di fronte, in un mobile blu: in alto due file di lucine rosse (lo stato della macchina e gli otto bit dei dati, poi i sedici bit dell\'indirizzo), sotto sedici levette numerate da 15 a 0 e una fila di levette di comando (STOP e RUN, SINGLE STEP, EXAMINE, DEPOSIT, RESET, PROTECT e due AUX), a sinistra l\'interruttore di accensione. Le otto levette di destra si alzano (1) e si abbassano (0) per comporre un byte; quando scatta DEPOSIT le otto lucine dei dati copiano le levette, e a ogni DEPOSIT NEXT l\'indirizzo nelle lucine sale di uno: 0, 1, 2, 3.',
    css: cssAltair,
    disegna() { return SVG_ALTAIR; },
  });

  /* ===================== home-computer ===================== */

  const HC = 'fig-home-computer';
  // la tastiera vista dall'alto e di fronte: un trapezio (i quattro angoli del piano dei tasti)
  const TAST = { bl: [222, 356], br: [658, 356], fl: [200, 444], fr: [680, 444] };
  function punto(u, v) {
    const xa = TAST.bl[0] + (TAST.br[0] - TAST.bl[0]) * u;
    const xb = TAST.fl[0] + (TAST.fr[0] - TAST.fl[0]) * u;
    return [xa + (xb - xa) * v, TAST.bl[1] + (TAST.fl[1] - TAST.bl[1]) * v];
  }
  const poligono = (pts, dy) => 'M' + pts.map((q) => n(q[0]) + ' ' + n(q[1] + (dy || 0))).join('L') + 'Z';
  const riquadro = (u0, v0, u1, v1) => [punto(u0, v0), punto(u1, v0), punto(u1, v1), punto(u0, v1)];

  function tasti() {
    const righe = [
      Array(15).fill(1),
      [1.5].concat(Array(12).fill(1), [1.5]),
      [1.75].concat(Array(11).fill(1), [2.25]),
      [2.25].concat(Array(10).fill(1), [2.75]),
      [2.5, 1, 8, 1, 2.5],
    ];
    const U0 = 0.03, U1 = 0.8, V0 = 0.15, V1 = 0.92;
    const alt = (V1 - V0) / righe.length;
    const s = [];
    righe.forEach((riga, r) => {
      const v0 = V0 + r * alt + 0.018, v1 = V0 + (r + 1) * alt - 0.018;
      let u = U0;
      riga.forEach((w) => {
        const du = (U1 - U0) * w / 15;
        s.push('<path class="' + HC + '-tasto" d="' + poligono(riquadro(u + 0.004, v0, u + du - 0.004, v1)) + '"/>');
        u += du;
      });
    });
    // quattro tasti funzione, più larghi, a destra
    for (let r = 0; r < 4; r++) {
      const v0 = V0 + r * alt + 0.018, v1 = V0 + (r + 1) * alt - 0.018;
      s.push('<path class="' + HC + '-tasto-f" d="' + poligono(riquadro(0.84, v0, 0.965, v1)) + '"/>');
    }
    return s.join('');
  }

  // tangenti esterne tra il cerchio della lente e il cerchietto sulla tastiera
  function tangenti(c1, r1, c2, r2) {
    const dx = c2[0] - c1[0], dy = c2[1] - c1[1];
    const d = Math.hypot(dx, dy);
    const th = Math.atan2(dy, dx), al = Math.acos((r1 - r2) / d);
    return [th + al, th - al].map((a) => 'M' + n(c1[0] + r1 * Math.cos(a)) + ' ' + n(c1[1] + r1 * Math.sin(a)) +
      'L' + n(c2[0] + r2 * Math.cos(a)) + ' ' + n(c2[1] + r2 * Math.sin(a))).join('');
  }

  function chip(x, y, w, h, piedini, testo) {
    const s = ['<rect class="' + HC + '-chip" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="2"/>'];
    const passo = (w - 8) / (piedini - 1);
    const pin = [];
    for (let i = 0; i < piedini; i++) {
      const px = x + 4 + i * passo;
      pin.push('M' + n(px) + ' ' + (y - 4) + 'V' + y + 'M' + n(px) + ' ' + (y + h) + 'V' + (y + h + 4));
    }
    s.push('<path class="' + HC + '-piedino" d="' + pin.join('') + '"/>');
    s.push('<path class="' + HC + '-tacca" d="M' + x + ' ' + n(y + h / 2 - 3.5) + 'a3.5 3.5 0 0 1 0 7"/>');
    if (testo) s.push('<text class="' + HC + '-chip-t" x="' + n(x + w / 2) + '" y="' + n(y + h / 2 + 5) + '" text-anchor="middle">' + testo + '</text>');
    return s.join('');
  }

  function svgHome(ctx) {
    const id = (ctx && ctx.uid) ? ctx.uid(HC) : HC + '-' + Math.random().toString(36).slice(2, 8);
    const lente = { c: [112, 390], r: 70 };
    const mira = { c: punto(0.12, 0.36), r: 17 };
    const p = [];
    p.push('<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">');
    p.push('<defs><clipPath id="' + id + '-l"><circle cx="' + lente.c[0] + '" cy="' + lente.c[1] + '" r="' + (lente.r - 1) + '"/></clipPath></defs>');
    p.push('<rect class="' + HC + '-sfondo" width="800" height="500"/>');
    // il piano della scrivania
    p.push('<rect class="' + HC + '-piano" x="0" y="250" width="800" height="250"/>');
    p.push('<path class="' + HC + '-bordo" d="M0 250H800"/>');

    // --- televisore ---
    p.push('<ellipse class="' + HC + '-ombra" cx="226" cy="296" rx="196" ry="7"/>');
    p.push('<path class="' + HC + '-antenna" d="M214 40 158 8M234 40 296 6"/>');
    p.push('<circle class="' + HC + '-pomello" cx="158" cy="8" r="3.5"/><circle class="' + HC + '-pomello" cx="296" cy="6" r="3.5"/>');
    p.push('<path class="' + HC + '-metallo-2" d="M202 45A22 13 0 0 1 246 45Z"/>');
    p.push('<rect class="' + HC + '-piede" x="72" y="286" width="46" height="9" rx="2"/><rect class="' + HC + '-piede" x="334" y="286" width="46" height="9" rx="2"/>');
    p.push('<rect class="' + HC + '-legno" x="38" y="44" width="374" height="244" rx="18"/>');
    p.push('<rect class="' + HC + '-cornice" x="52" y="58" width="268" height="216" rx="16"/>');
    p.push('<rect class="' + HC + '-vetro" x="64" y="70" width="244" height="186" rx="24"/>');
    p.push('<rect class="' + HC + '-bordo-schermo" x="64" y="70" width="244" height="186" rx="24"/>');
    p.push('<rect class="' + HC + '-schermo" x="80" y="86" width="212" height="152" rx="4"/>');
    p.push('<text class="' + HC + '-video" x="91" y="112">** BASIC DIDATTICO **</text>');
    p.push('<text class="' + HC + '-video" x="91" y="162">READY.</text>');
    p.push('<rect class="' + HC + '-cursore" x="91" y="171" width="10" height="18"/>');
    // pannello dei comandi: manopola dei canali, volume, altoparlante, accensione
    p.push('<rect class="' + HC + '-comandi" x="330" y="58" width="70" height="216" rx="10"/>');
    const tacche = [];
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      tacche.push('M' + n(365 + 25 * Math.cos(a)) + ' ' + n(100 + 25 * Math.sin(a)) + 'L' + n(365 + 29 * Math.cos(a)) + ' ' + n(100 + 29 * Math.sin(a)));
    }
    p.push('<path class="' + HC + '-tacche" d="' + tacche.join('') + '"/>');
    p.push('<circle class="' + HC + '-manopola" cx="365" cy="100" r="20"/><rect class="' + HC + '-presa" x="361" y="80" width="8" height="40" rx="3"/>');
    p.push('<circle class="' + HC + '-manopola" cx="365" cy="156" r="12"/><path class="' + HC + '-tacche" d="M365 146V152"/>');
    for (let i = 0; i < 7; i++) p.push('<rect class="' + HC + '-fessura" x="342" y="' + (184 + i * 8.5) + '" width="46" height="4" rx="2"/>');
    p.push('<circle class="' + HC + '-spia" cx="346" cy="260" r="3.5"/><rect class="' + HC + '-tasto-tv" x="358" y="254" width="32" height="12" rx="3"/>');

    // --- cavi (sotto la tastiera e il registratore) ---
    p.push('<path class="' + HC + '-cavo" d="M424 270C470 300 556 326 598 360"/>');
    p.push('<rect class="' + HC + '-metallo-2" x="410" y="262" width="16" height="14" rx="3"/>');
    p.push('<path class="' + HC + '-cavo" d="M636 360C642 342 600 330 566 322"/>');

    // --- registratore a cassette ---
    p.push('<ellipse class="' + HC + '-ombra" cx="672" cy="338" rx="110" ry="5"/>');
    p.push('<rect class="' + HC + '-metallo-2" x="556" y="316" width="14" height="10" rx="2"/>');
    p.push('<path class="' + HC + '-metallo" d="M580 212H762L774 230H568Z"/>');
    p.push('<rect class="' + HC + '-registratore" x="568" y="230" width="206" height="106" rx="6"/>');
    const simboli = [
      '<circle cx="0" cy="0" r="3.6" class="' + HC + '-rec"/>',
      '<path d="M-3 -4.5 4.5 0-3 4.5Z"/>',
      '<path d="M0-4-6 0 0 4ZM6-4 0 0 6 4Z"/>',
      '<path d="M0-4 6 0 0 4ZM-6-4 0 0-6 4Z"/>',
      '<path d="M-4-4H4V4H-4Z"/>',
      '<path d="M-5 1.5 0-4.5 5 1.5ZM-5 3H5V5H-5Z"/>',
    ];
    for (let i = 0; i < 6; i++) {
      const x = 588 + i * 29;
      p.push('<path class="' + HC + '-tasto-reg" d="M' + (x + 2) + ' 214H' + (x + 25) + 'L' + (x + 27) + ' 220H' + x + 'Z"/>');
      p.push('<rect class="' + HC + '-tasto-reg" x="' + x + '" y="220" width="27" height="16" rx="2"/>');
      p.push('<g class="' + HC + '-simbolo" transform="translate(' + (x + 13.5) + ' 228)">' + simboli[i] + '</g>');
    }
    p.push('<rect class="' + HC + '-finestra" x="584" y="246" width="126" height="78" rx="6"/>');
    p.push('<rect class="' + HC + '-cassetta" x="594" y="253" width="106" height="64" rx="4"/>');
    p.push('<rect class="' + HC + '-etichetta" x="601" y="258" width="92" height="42" rx="3"/>');
    p.push('<rect class="' + HC + '-occhio" x="617" y="270" width="60" height="22" rx="10"/>');
    p.push('<circle class="' + HC + '-nastro" cx="632" cy="281" r="10.5"/>');
    [[632, 281], [662, 281]].forEach(([x, y]) => {
      p.push('<circle class="' + HC + '-mozzo" cx="' + x + '" cy="' + y + '" r="6"/>');
      const d = [];
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        d.push('M' + n(x + 2.2 * Math.cos(a)) + ' ' + n(y + 2.2 * Math.sin(a)) + 'L' + n(x + 5 * Math.cos(a)) + ' ' + n(y + 5 * Math.sin(a)));
      }
      p.push('<path class="' + HC + '-denti" d="' + d.join('') + '"/>');
    });
    p.push('<path class="' + HC + '-fondo-cassetta" d="M612 317 618 304H676L682 317"/>');
    p.push('<rect class="' + HC + '-contatore" x="722" y="250" width="42" height="22" rx="2"/>');
    p.push('<text class="' + HC + '-cifre" x="743" y="266" text-anchor="middle">000</text>');
    for (let i = 0; i < 5; i++) p.push('<rect class="' + HC + '-fessura" x="724" y="' + (284 + i * 8) + '" width="38" height="3.5" rx="1.75"/>');

    // --- tastiera: il computer è qui dentro ---
    p.push('<ellipse class="' + HC + '-ombra" cx="440" cy="462" rx="252" ry="7"/>');
    p.push('<path class="' + HC + '-fronte" d="M200 444H680L676 458H204Z"/>');
    p.push('<path class="' + HC + '-cassa" d="' + poligono([TAST.bl, TAST.br, TAST.fr, TAST.fl]) + '"/>');
    const a = punto(0.012, 0.07), b = punto(0.988, 0.07);
    p.push('<path class="' + HC + '-spigolo" d="M' + n(a[0]) + ' ' + n(a[1]) + 'L' + n(b[0]) + ' ' + n(b[1]) + '"/>');
    p.push(tasti());
    const led = riquadro(0.9, 0.045, 0.94, 0.085);
    p.push('<path class="' + HC + '-led" d="' + poligono(led) + '"/>');

    // --- lente: la scheda dentro la tastiera ---
    p.push('<path class="' + HC + '-raggio" d="' + tangenti(lente.c, lente.r, mira.c, mira.r) + '"/>');
    p.push('<circle class="' + HC + '-mira" cx="' + n(mira.c[0]) + '" cy="' + n(mira.c[1]) + '" r="' + mira.r + '"/>');
    p.push('<g clip-path="url(#' + id + '-l)">');
    p.push('<rect class="' + HC + '-scheda" x="30" y="310" width="170" height="160"/>');
    p.push('<rect class="' + HC + '-scheda-verde" x="30" y="310" width="170" height="160"/>');
    p.push('<path class="' + HC + '-pista" d="M40 356H70M154 356H186M112 340V322M58 398H78M146 398H184M98 372V384M126 372V384M81 420V412M112 420V412M143 420V412M52 446 66 432M172 446 158 432"/>');
    p.push(chip(70, 344, 84, 24, 12, 'CPU'));
    p.push(chip(78, 388, 68, 20, 9, 'BASIC'));
    p.push(chip(68, 424, 26, 14, 4) + chip(99, 424, 26, 14, 4) + chip(130, 424, 26, 14, 4));
    p.push('</g>');
    p.push('<circle class="' + HC + '-lente" cx="' + lente.c[0] + '" cy="' + lente.c[1] + '" r="' + lente.r + '"/>');

    // --- didascalie ---
    p.push('<text class="' + HC + '-nota" x="440" y="62">televisore di casa</text>');
    p.push('<path class="' + HC + '-guida" d="M434 56H424L400 76"/><circle class="' + HC + '-punto" cx="400" cy="76" r="3.5"/>');
    p.push('<text class="' + HC + '-nota" x="440" y="214">cavo</text>');
    p.push('<text class="' + HC + '-nota" x="440" y="239">d\'antenna</text>');
    p.push('<path class="' + HC + '-guida" d="M474 247V292"/><circle class="' + HC + '-punto" cx="474" cy="294" r="3.5"/>');
    p.push('<text class="' + HC + '-nota" x="544" y="144">registratore a cassette:</text>');
    p.push('<text class="' + HC + '-nota" x="544" y="169">i programmi come suoni</text>');
    p.push('<path class="' + HC + '-guida" d="M690 178V214"/><circle class="' + HC + '-punto" cx="690" cy="216" r="3.5"/>');
    p.push('<text class="' + HC + '-nota" x="20" y="492">nella tastiera: CPU, memoria e BASIC in ROM</text>');
    p.push('</svg>');
    return p.join('');
  }

  const cssHome = `
    .${HC}-sfondo { fill: var(--fig-paper); }
    .${HC}-piano { fill: var(--fig-1); }
    .${HC}-bordo { stroke: var(--fig-line); stroke-width: 1.5; }
    .${HC}-ombra { fill: var(--fig-2); opacity: .8; }
    .${HC}-antenna { fill: none; stroke: var(--fig-ink); stroke-width: 3; stroke-linecap: round; }
    .${HC}-pomello { fill: var(--fig-ink); }
    .${HC}-metallo { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .${HC}-metallo-2 { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; }
    .${HC}-piede { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${HC}-legno { fill: var(--fig-3); stroke: var(--fig-ink); stroke-width: 2; }
    .${HC}-cornice { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; }
    .${HC}-vetro { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; }
    .${HC}-bordo-schermo { fill: var(--fig-cool); opacity: .5; }
    .${HC}-schermo { fill: var(--fig-cool); }
    .${HC}-video { font: 700 15px var(--mono, monospace); fill: var(--fig-paper); letter-spacing: 0; }
    .${HC}-cursore { fill: var(--fig-paper); animation: ${HC}-lampeggia 1.1s step-end infinite; }
    .${HC}-comandi { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; }
    .${HC}-tacche { fill: none; stroke: var(--fig-ink); stroke-width: 2; stroke-linecap: round; }
    .${HC}-manopola { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; }
    .${HC}-presa { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${HC}-fessura { fill: var(--fig-ink); opacity: .7; }
    .${HC}-spia { fill: var(--fig-glow); stroke: var(--fig-ink); stroke-width: 1.2; }
    .${HC}-tasto-tv { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${HC}-cavo { fill: none; stroke: var(--fig-ink); stroke-width: 4; stroke-linecap: round; }
    .${HC}-registratore { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; }
    .${HC}-tasto-reg { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1.5; stroke-linejoin: round; }
    .${HC}-simbolo { fill: var(--fig-ink); }
    .${HC}-rec { fill: var(--fig-red); }
    .${HC}-finestra { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; }
    .${HC}-cassetta { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${HC}-etichetta { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1.2; }
    .${HC}-occhio { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.2; }
    .${HC}-nastro { fill: var(--fig-4); }
    .${HC}-mozzo { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${HC}-denti { stroke: var(--fig-ink); stroke-width: 1.5; }
    .${HC}-fondo-cassetta { fill: none; stroke: var(--fig-ink); stroke-width: 1.5; }
    .${HC}-contatore { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.5; }
    .${HC}-cifre { font: 700 14px var(--mono, monospace); fill: var(--fig-ink); }
    .${HC}-fronte { fill: var(--fig-3); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .${HC}-cassa { fill: var(--fig-2); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .${HC}-spigolo { fill: none; stroke: var(--fig-ink); stroke-width: 1.2; opacity: .5; }
    .${HC}-tasto { fill: var(--fig-4); stroke: var(--fig-ink); stroke-width: 1.2; stroke-linejoin: round; }
    .${HC}-tasto-f { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.2; stroke-linejoin: round; }
    .${HC}-led { fill: var(--fig-red); stroke: var(--fig-ink); stroke-width: 1; }
    .${HC}-raggio { fill: none; stroke: var(--cap); stroke-width: 1.6; stroke-dasharray: 5 4; }
    .${HC}-mira { fill: none; stroke: var(--cap); stroke-width: 2; stroke-dasharray: 5 4; }
    .${HC}-lente { fill: none; stroke: var(--fig-ink); stroke-width: 3; }
    .${HC}-scheda { fill: var(--fig-paper); }
    .${HC}-scheda-verde { fill: var(--fig-glow); opacity: .22; }
    .${HC}-pista { fill: none; stroke: var(--fig-glow); stroke-width: 2.5; stroke-linecap: round; }
    .${HC}-chip { fill: var(--fig-ink); }
    .${HC}-piedino { stroke: var(--fig-metal-2); stroke-width: 2.2; }
    .${HC}-tacca { fill: none; stroke: var(--fig-paper); stroke-width: 1.5; }
    .${HC}-chip-t { font: 700 14px var(--mono, monospace); fill: var(--fig-paper); }
    .${HC}-guida { fill: none; stroke: var(--cap); stroke-width: 1.8; }
    .${HC}-punto { fill: var(--cap); }
    .${HC}-nota { font: 700 21px var(--font, sans-serif); fill: var(--cap); }
    @keyframes ${HC}-lampeggia { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      .${HC}-cursore { animation: none; }
    }
  `;

  root.ProgStoria.figura('home-computer', {
    alt: 'Un home computer degli anni Ottanta su una scrivania, senza marchi. A sinistra un televisore con il mobile di legno e l\'antenna a V: lo schermo blu scrive «** BASIC DIDATTICO **», poi «READY.» e sotto un cursore quadrato che lampeggia. Davanti c\'è la tastiera a cuneo con i tasti marroni e quattro tasti funzione: un cerchio di ingrandimento mostra che dentro c\'è la scheda con il microprocessore (CPU), la ROM con il BASIC e i chip di memoria. Un cavo va dalla tastiera alla presa d\'antenna del televisore, un altro a un registratore a cassette con i tasti di registrazione, riproduzione, riavvolgimento, avanzamento, stop ed espulsione: i programmi si salvano sul nastro come suoni.',
    css: cssHome,
    disegna(ctx) { return svgHome(ctx); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
