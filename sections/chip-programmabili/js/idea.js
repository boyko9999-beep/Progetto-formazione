/*
 * Capitolo 1 · Un chip, mille programmi. Laboratorio «Stesso hardware, programmi diversi».
 *
 * Un piccolo sistema come l'MCS-4 (CPU 4004, ROM 4001, RAM 4002, I/O 4003) con un display a LED e un tasto.
 * - «Chip programmabile»: scegli una funzione e il suo programma si scrive nella ROM, riga per riga; lo stesso
 *   hardware cambia comportamento e i collegamenti restano identici.
 * - «Logica cablata»: ogni funzione è un circuito di porte diverso; cambiarla vuol dire riprogettare: i fili si
 *   staccano, le porte cambiano e compare l'avviso «nuovo progetto, nuove maschere, nuovi chip».
 * Istruzioni, programmi, display e circuiti sono in js/idea-core.js (logica pura, provata dai test).
 *
 * Movimento: transform, opacity, poche coordinate SVG e lo stroke-dashoffset dei fili; con movimento ridotto
 * gli stati cambiano subito e niente parte da solo.
 */
(function () {
  'use strict';
  if (!window.CP) return;

  CP.lab('idea', function (mount, ctx) {
    const { h, s, ui } = CP;
    const M = window.IdeaCore;
    if (!M) throw new Error('Manca js/idea-core.js');
    const hex1 = M.hex1, hex2 = M.hex2;

    const FAST = 55;       // ms per passo di macchina
    const SLOW = 780;      // ms per istruzione al rallentatore (le attese restano in tempo reale)
    const ROW_MS = 70;     // scrittura della ROM: una riga ogni 70 ms
    const RUN_TICKS = 16;  // passi dopo cui un programma conta come «fatto girare»
    const NAMES = {};
    M.ORDER.forEach((id) => { NAMES[id] = M.PROGRAMS[id].name; });

    /* ---------- due disposizioni del palco: larga e da telefono ---------- */

    const WIDE = {
      id: 'wide', W: 760, H: 560,
      rom: { x: 16, y: 12, w: 300, h: 340, titleY: 34, subY: 51, rowY0: 62, rowH: 18, addrX: 32, cellX: 48, cellStep: 18, cellW: 15, cellH: 12, hexX: 202, opX: 232 },
      cpu: { x: 340, y: 12, w: 404, h: 88, titleX: 356, titleY: 36, regX: [548, 612, 676], regY: 26, regW: 56, regH: 54, instr: [356, 86] },
      ram: { x: 340, y: 148, w: 176, h: 88, titleX: 356, titleY: 170, cellX: 356, cellY: 196, cellW: 32, cellH: 30, cellStep: 39 },
      io: { x: 532, y: 148, w: 212, h: 88, titleX: 548, titleY: 170, outX: 600, outY: 214, outStep: 16, keyX: 722, keyY: 214, ledR: 5, outLbl: [548, 218, 'start'], keyLbl: [712, 218, 'end'] },
      bus: ['M316 124 H744', 'M470 100 V124', 'M428 124 V148', 'M638 124 V148'],
      busLabel: [334, 116],
      links: ['M590 236 V368', 'M692 236 V422'],
      badge: { x: 352, y: 262, w: 214, h: 58 },
      disp: { x: 16, y: 368, w: 600, h: 160, lx: 36, ly: 388, p: 20, r: 7.2, capX: 16, capY: 549 },
      key: { cx: 692, cy: 452, r: 30, cap: [692, 504, 'middle'], mean: [692, 522, 'middle'] },
      wiredGeo: { orient: 'h', x: 16, y: 12, w: 728, h: 340 },
      wiredLink: (e) => 'M' + e[0] + ' ' + e[1] + ' V360 H600 V368',
      feedLabel: [22, 28, 'start', 'ingressi: tasto e clock'], outLabel: [740, 28, 'end', 'uscite verso il display'],
      paths: {
        romOut: (y) => [[214, y], [322, y], [322, 124], [470, 124], [470, 92]],
        cpuToRam: (i) => [[470, 92], [470, 124], [428, 124], [428, 156], [372 + i * 39, 204]],
        cpuToIo: [[470, 92], [470, 124], [638, 124], [638, 160]],
        ioToDisp: [[590, 228], [590, 380]],
        keyToIo: [[692, 424], [692, 228]],
        ioToCpu: [[638, 160], [638, 124], [470, 124], [470, 92]],
      },
    };
    const NARROW = {
      id: 'narrow', W: 400, H: 716,
      rom: { x: 10, y: 10, w: 380, h: 354, titleY: 32, subY: 49, rowY0: 58, rowH: 19, addrX: 26, cellX: 42, cellStep: 20, cellW: 17, cellH: 13, hexX: 214, opX: 246 },
      cpu: { x: 10, y: 400, w: 124, h: 84, titleX: 22, titleY: 420, regX: [20, 56, 92], regY: 428, regW: 32, regH: 48, instr: null },
      ram: { x: 140, y: 400, w: 120, h: 84, titleX: 152, titleY: 420, cellX: 150, cellY: 438, cellW: 23, cellH: 34, cellStep: 26 },
      io: { x: 266, y: 400, w: 124, h: 84, titleX: 278, titleY: 420, outX: 286, outY: 448, outStep: 14, keyX: 372, keyY: 448, ledR: 4.5, outLbl: [278, 472, 'start'], keyLbl: [384, 472, 'end'] },
      bus: ['M72 382 H328', 'M200 364 V400', 'M72 382 V400', 'M328 382 V400'],
      busLabel: null,
      links: ['M382 484 V576', 'M346 484 V500'],
      badge: { x: 10, y: 499, w: 200, h: 56 },
      disp: { x: 10, y: 576, w: 380, h: 104, lx: 20.8, ly: 589.6, p: 12.8, r: 5, capX: 12, capY: 704 },
      key: { cx: 346, cy: 528, r: 28, cap: [306, 522, 'end'], mean: [306, 541, 'end'] },
      wiredGeo: { orient: 'v', x: 10, y: 10, w: 380, h: 474, feed: 18, out: 18, padFlow: 46, padTop: 24, padBot: 24, bu: 34, bv: 52, gapMax: 18 },
      wiredLink: (e) => 'M' + e[0] + ' ' + e[1] + ' H382 V576',
      feedLabel: [14, 20, 'start', 'ingressi: tasto e clock'], outLabel: [14, 481, 'start', 'uscite verso il display'],
      paths: {
        romOut: (y) => [[222, y], [200, 356], [200, 382], [72, 382], [72, 410]],
        cpuToRam: (i) => [[72, 410], [72, 382], [200, 382], [200, 410], [161 + i * 26, 452]],
        cpuToIo: [[72, 410], [72, 382], [328, 382], [328, 410]],
        ioToDisp: [[382, 478], [382, 584]],
        keyToIo: [[346, 502], [346, 478]],
        ioToCpu: [[328, 410], [328, 382], [72, 382], [72, 410]],
      },
    };
    const mqNarrow = window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;
    let L = mqNarrow && mqNarrow.matches ? NARROW : WIDE;

    /* ---------- stato ---------- */

    let mode = 'prog';          // 'prog' (chip programmabile) | 'wired' (logica cablata)
    let fn = null;              // funzione scelta
    let rom = new Array(M.ROWS).fill(0);
    let romInfo = null;         // M.assemble() del programma che sta nella ROM
    let wiredLay = null;        // circuito cablato disegnato
    let m = M.createMachine();
    let mRom = rom;             // byte che la macchina esegue (in logica cablata: il comportamento da imitare)
    let running = false;
    let slow = false;
    let busy = false;           // scrittura della ROM o riprogettazione in corso
    let pending = null;         // operazione in corso: { kind: 'write' | 'design', id }
    let gen = 0;                // ogni nuova operazione annulla le animazioni delle precedenti
    let ticksSinceLoad = 0;
    let announceOut = false;    // dopo un tasto, annuncia la prossima uscita
    let lastFrame = null;
    let pulseCount = 0;
    let toastTimer = 0;
    let beat = 0;
    const tried = new Set((CP.store.get('idea-provati', []) || []).filter((id) => M.PROGRAMS[id]));
    const score = { loads: 0, bits: 0, designs: 0, chips: 0, gates: 0, wires: 0 };

    /* ---------- testi ---------- */

    const BEATS = [
      ['1969 · la richiesta', "Busicom, cioè la Nippon Calculating Machine Corporation, progetta la 141-PF, una calcolatrice da tavolo con stampante, e chiede a Intel di fabbricarne i chip: tutti su misura, ognuno con un compito fisso."],
      ["L'intuizione di Hoff", "Ted Hoff, l'ingegnere di Intel che segue il progetto, lo trova troppo complicato. Usa già un minicomputer, il PDP-8, e pensa: un processore semplice e generico potrebbe fare tutto, se le funzioni della calcolatrice diventassero un programma."],
      ['Il prezzo dei fili', "È quello che vedi qui: con il chip programmabile l'hardware resta fermo e cambia solo la ROM. Con la logica cablata ogni funzione nuova è un circuito nuovo, da disegnare, fabbricare e collaudare da capo."],
      ['Quattro chip', "Con Stan Mazor, Hoff riduce tutto a quattro chip: la CPU 4004 a 4 bit, la ROM 4001 per il programma, la RAM 4002 per i dati e il registro 4003 per le uscite. Nell'autunno del 1969 Busicom sceglie questa proposta."],
      ['Un chip, mille usi', "Il chip non sa di essere una calcolatrice: lo decide il programma. Per questo, nel maggio 1971, Intel restituisce a Busicom i 60.000 dollari investiti nello sviluppo e ottiene il diritto di venderlo a tutti, per ogni uso tranne le calcolatrici."],
    ];
    const WIRED_WHAT = {
      calcolatrice: 'sommare due numeri cifra per cifra',
      semaforo: 'accendere le luci del semaforo una dopo l\'altra',
      insegna: 'far scorrere una scritta',
      dado: 'tirare un dado elettronico',
    };

    /* ---------- controlli, palco, spiegazione, obiettivo ---------- */

    const segMode = ui.seg({
      label: 'Tipo di hardware', value: 'prog',
      options: [{ value: 'prog', label: 'Chip programmabile' }, { value: 'wired', label: 'Logica cablata' }],
      onChange: (v) => setMode(v),
    });
    const segFn = ui.seg({
      label: 'Funzione', value: null,
      options: M.ORDER.map((id) => ({ value: id, label: NAMES[id], title: M.PROGRAMS[id].what })),
      onChange: (v) => choose(v),
    });
    const btnRun = ui.button({ label: 'Esegui', icon: '▶︎', primary: true, onClick: () => toggleRun() });
    const btnStep = ui.button({ label: 'Passo', icon: '⏭︎', title: 'Esegui una sola istruzione', onClick: () => stepOnce() });
    const tgSlow = ui.toggle({ label: 'Rallentatore', checked: false, onChange: (v) => { slow = v; explainState(); } });
    const bar = ui.bar(
      h('div', { class: 'cp-bar-group' }, h('span', { class: 'idea-k', 'aria-hidden': 'true' }, 'Hardware'), segMode),
      h('div', { class: 'cp-bar-group' }, h('span', { class: 'idea-k', 'aria-hidden': 'true' }, 'Funzione'), segFn),
      h('div', { class: 'cp-bar-group idea-run' }, btnRun, btnStep, tgSlow));

    const toastT = h('b', { class: 'idea-toast-t' });
    const toastP = h('span', { class: 'idea-toast-p' });
    const toast = h('div', { class: 'idea-toast', 'aria-hidden': 'true' }, toastT, toastP);
    const stageBox = h('div', { class: 'cp-stage idea-stage' });

    const exStep = h('span', { class: 'step' });
    const exH = h('h4');
    const exNow = h('p', { class: 'idea-now' });
    const exDo = h('p', { class: 'idea-do' });
    const hoffK = h('span', { class: 'idea-hoff-k' });
    const hoffP = h('p');
    const hoffBox = h('div', { class: 'idea-hoff' }, hoffK, hoffP);
    const sc = {};
    const scoreRow = (key, label) => h('span', { class: 'idea-score-r' }, h('span', null, label), (sc[key] = h('b', null, '0')));
    const scoreBox = h('div', { class: 'idea-score' },
      h('div', { class: 'idea-score-col' },
        h('span', { class: 'idea-score-k' }, 'Chip programmabile'),
        scoreRow('loads', 'programmi scritti'), scoreRow('pchips', 'chip cambiati'), scoreRow('pwires', 'fili cambiati')),
      h('div', { class: 'idea-score-col is-wired' },
        h('span', { class: 'idea-score-k' }, 'Logica cablata'),
        scoreRow('designs', 'circuiti progettati'), scoreRow('chips', 'chip su misura'), scoreRow('wires', 'fili posati')));
    const explain = h('div', { class: 'cp-explain idea-explain' }, exStep, exH, exNow, exDo, hoffBox, scoreBox);

    const goalN = h('b', { class: 'idea-goal-n' });
    const goalItems = {};
    const goal = h('p', { class: 'cp-goal' },
      h('span', { class: 'idea-goal-t' }, 'Obiettivo: fai girare almeno 3 programmi diversi sullo stesso hardware, senza toccare un filo.'),
      h('span', { class: 'idea-goal-list' }, goalN, M.ORDER.map((id) => {
        goalItems[id] = h('span', { class: 'idea-goal-i' }, NAMES[id], h('span', { class: 'cp-sr' }, ''));
        return goalItems[id];
      })));

    mount.append(bar, h('div', { class: 'cp-lab-grid idea-grid' }, stageBox, explain), goal);

    /* ---------- costruzione del palco ---------- */

    let V = null; // riferimenti agli elementi del palco attuale

    function txt(x, y, cls, str, anchor) {
      return s('text', { x: x, y: y, class: cls, 'text-anchor': anchor || null }, str);
    }

    function build() {
      const R = L.rom, C = L.cpu, A = L.ram, IO = L.io, D = L.disp, K = L.key;
      const wide = L === WIDE;
      const v = { rows: [], regs: {}, ramCells: [], outLeds: [], leds: [], wiredEls: null };
      const svg = s('svg', {
        viewBox: '0 0 ' + L.W + ' ' + L.H, class: 'idea-svg idea-' + L.id, role: 'group',
        'aria-label': 'Banco del laboratorio: ROM, CPU, RAM e I/O collegati da un bus, un display a LED e un tasto.',
      });
      svg.append(s('defs', null,
        s('filter', { id: 'idea-glow', x: '-10%', y: '-30%', width: '120%', height: '160%' },
          s('feGaussianBlur', { stdDeviation: wide ? 2.6 : 1.8, result: 'b' }),
          s('feMerge', null, s('feMergeNode', { in: 'b' }), s('feMergeNode', { in: 'SourceGraphic' })))));

      // hardware programmabile: bus e collegamenti sotto, poi i quattro chip
      const gProg = s('g', { class: 'idea-prog' });
      v.bus = L.bus.map((d) => s('path', { d: d, class: 'cp-bus data idea-bus' }));
      v.links = L.links.map((d) => s('path', { d: d, class: 'cp-bus on idea-link' }));
      gProg.append(...v.bus, ...v.links);
      if (L.busLabel) gProg.append(txt(L.busLabel[0], L.busLabel[1], 'idea-s', 'bus dati · 4 fili'));

      // targhetta dei collegamenti: un lucchetto chiuso, perché tra un programma e l'altro i fili non cambiano
      const B = L.badge;
      const lx = B.x + 25, ly = B.y + B.h / 2 - 1;
      v.badgeT = txt(B.x + 48, B.y + 25, 'idea-badge-t', '');
      v.badgeS = txt(B.x + 48, B.y + 43, 'idea-s idea-badge-s', '');
      v.badge = s('g', { class: 'idea-badge' },
        s('rect', { x: B.x, y: B.y, width: B.w, height: B.h, rx: 10, class: 'idea-badge-box' }),
        s('path', { d: 'M' + (lx - 6.5) + ' ' + ly + ' v-6 a6.5 6.5 0 0 1 13 0 v6', class: 'idea-lock-arc' }),
        s('rect', { x: lx - 10, y: ly, width: 20, height: 15, rx: 3, class: 'idea-lock-body' }),
        s('circle', { cx: lx, cy: ly + 7, r: 2, class: 'idea-lock-hole' }),
        v.badgeT, v.badgeS);
      gProg.append(v.badge);

      const gRom = s('g', { class: 'idea-rom' });
      gRom.append(s('rect', { x: R.x, y: R.y, width: R.w, height: R.h, rx: 10, class: 'idea-box' }));
      v.romSub = txt(R.x + 14, R.subY, 'idea-s', '');
      gRom.append(txt(R.x + 14, R.titleY, 'idea-t', 'ROM · 4001'), v.romSub, txt(R.x + R.w - 12, R.titleY, 'idea-s', 'righe 0–F', 'end'));
      v.pc = s('rect', { x: R.x + 4, y: R.rowY0, width: R.w - 8, height: R.rowH, rx: 4, class: 'idea-pc' });
      v.head = s('rect', { x: R.x + 4, y: R.rowY0, width: R.w - 8, height: R.rowH, rx: 4, class: 'idea-head' });
      gRom.append(v.pc, v.head);
      for (let r = 0; r < M.ROWS; r++) {
        const y = R.rowY0 + r * R.rowH;
        const base = y + R.rowH * 0.72;
        const row = { y: y, cells: [] };
        row.g = s('g', { class: 'idea-row' });
        row.flash = s('rect', { x: R.x + 4, y: y, width: R.w - 8, height: R.rowH, rx: 4, class: 'idea-flash' });
        row.g.append(row.flash, txt(R.addrX, base, 'idea-addr mono', hex1(r)));
        for (let i = 0; i < 8; i++) {
          const c = s('rect', { x: R.cellX + i * R.cellStep, y: y + (R.rowH - R.cellH) / 2, width: R.cellW, height: R.cellH, rx: 2, class: 'idea-bit' });
          row.cells.push(c);
          row.g.append(c);
        }
        row.hex = txt(R.hexX, base, 'idea-hex mono', '00');
        row.op = txt(R.opX, base, 'idea-op mono', '—');
        row.title = s('title', null, 'riga vuota');
        row.g.append(row.hex, row.op, row.title);
        v.rows.push(row);
        gRom.append(row.g);
      }
      v.gRom = gRom;
      gProg.append(gRom);

      const gCpu = s('g', { class: 'idea-cpu' });
      gCpu.append(s('rect', { x: C.x, y: C.y, width: C.w, height: C.h, rx: 10, class: 'idea-box' }), txt(C.titleX, C.titleY, 'idea-t', 'CPU · 4004'));
      if (wide) gCpu.append(txt(C.titleX, C.titleY + 17, 'idea-s', 'legge ed esegue le istruzioni'));
      [['pc', 'PC'], ['a', 'A'], ['c', 'C']].forEach((pair, i) => {
        const x = C.regX[i];
        const box = s('rect', { x: x, y: C.regY, width: C.regW, height: C.regH, rx: 6, class: 'idea-reg' });
        const val = txt(x + C.regW / 2, C.regY + C.regH - (wide ? 14 : 11), 'idea-regv mono', '0', 'middle');
        gCpu.append(box, txt(x + C.regW / 2, C.regY + 14, 'idea-regk', pair[1], 'middle'), val);
        v.regs[pair[0]] = { box: box, val: val };
      });
      if (C.instr) { v.instr = txt(C.instr[0], C.instr[1], 'idea-instr mono', ''); gCpu.append(v.instr); }
      gProg.append(gCpu);

      const gRam = s('g', { class: 'idea-ram' });
      gRam.append(s('rect', { x: A.x, y: A.y, width: A.w, height: A.h, rx: 10, class: 'idea-box' }), txt(A.titleX, A.titleY, 'idea-t', 'RAM · 4002'));
      if (wide) gRam.append(txt(A.titleX, A.titleY + 17, 'idea-s', 'celle 0 · 1 · 2 · 3'));
      for (let i = 0; i < M.RAM_CELLS; i++) {
        const x = A.cellX + i * A.cellStep;
        const box = s('rect', { x: x, y: A.cellY, width: A.cellW, height: A.cellH, rx: 5, class: 'idea-cell' });
        const val = txt(x + A.cellW / 2, A.cellY + A.cellH * 0.7, 'idea-cellv mono', '0', 'middle');
        gRam.append(box, val);
        v.ramCells.push({ box: box, val: val });
      }
      gProg.append(gRam);

      const gIo = s('g', { class: 'idea-io' });
      gIo.append(s('rect', { x: IO.x, y: IO.y, width: IO.w, height: IO.h, rx: 10, class: 'idea-box' }), txt(IO.titleX, IO.titleY, 'idea-t', 'I/O · 4003'));
      if (wide) gIo.append(txt(IO.titleX, IO.titleY + 17, 'idea-s', 'uscite e ingresso'));
      for (let i = 0; i < 4; i++) {
        const c = s('circle', { cx: IO.outX + i * IO.outStep, cy: IO.outY, r: IO.ledR, class: 'idea-pled' });
        v.outLeds.push(c);
        gIo.append(c);
      }
      v.keyLed = s('circle', { cx: IO.keyX, cy: IO.keyY, r: IO.ledR, class: 'idea-pled is-key' });
      gIo.append(v.keyLed, txt(IO.outLbl[0], IO.outLbl[1], 'idea-s', 'uscita', IO.outLbl[2]), txt(IO.keyLbl[0], IO.keyLbl[1], 'idea-s', 'tasto', IO.keyLbl[2]));
      gProg.append(gIo);

      // logica cablata: riempita da drawWired()
      v.gWired = s('g', { class: 'idea-wired' });

      // display e tasto: uguali nelle due modalità
      const gDisp = s('g', { class: 'idea-disp' });
      gDisp.append(s('rect', { x: D.x, y: D.y, width: D.w, height: D.h, rx: 12, class: 'idea-bezel' }));
      v.ledG = s('g', { class: 'idea-leds', filter: 'url(#idea-glow)' });
      for (let i = 0; i < M.LINES; i++) {
        for (let j = 0; j < M.COLS; j++) {
          const c = s('circle', { cx: +(D.lx + j * D.p).toFixed(1), cy: +(D.ly + i * D.p).toFixed(1), r: D.r, class: 'idea-led' });
          v.leds.push(c);
          v.ledG.append(c);
        }
      }
      v.cap = txt(D.capX, D.capY, 'idea-cap', '');
      gDisp.append(v.ledG, v.cap);

      v.key = s('g', { class: 'idea-key', tabindex: '0', role: 'button' });
      v.keyCap = s('g', { class: 'idea-key-cap' },
        s('circle', { cx: K.cx, cy: K.cy, r: K.r, class: 'idea-key-base' }),
        s('circle', { cx: K.cx, cy: K.cy - 2, r: K.r - 6, class: 'idea-key-top' }),
        txt(K.cx, K.cy + 4, 'idea-key-t', 'TASTO', 'middle'));
      v.key.append(s('circle', { cx: K.cx, cy: K.cy, r: K.r + 6, class: 'idea-key-ring' }), v.keyCap);
      v.keyMean = txt(K.mean[0], K.mean[1], 'idea-mean', '', K.mean[2]);
      v.key.addEventListener('click', () => pressKey());
      v.key.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); pressKey(); }
      });
      v.key.addEventListener('pointerdown', () => v.key.classList.add('is-down'));
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => v.key.addEventListener(t, () => v.key.classList.remove('is-down')));

      v.tok = s('g', { class: 'idea-tokens', 'aria-hidden': 'true' });
      svg.append(gProg, v.gWired, gDisp, v.key, txt(K.cap[0], K.cap[1], 'idea-s', 'ora vuol dire:', K.cap[2]), v.keyMean, v.tok);
      v.svg = svg;
      v.gProg = gProg;

      stageBox.innerHTML = '';
      stageBox.append(h('div', { class: 'idea-stage-in' }, svg, toast));
      toast.style.left = (D.x / L.W) * 100 + '%';
      toast.style.top = (D.y / L.H) * 100 + '%';
      toast.style.width = (D.w / L.W) * 100 + '%';
      toast.style.height = (D.h / L.H) * 100 + '%';
      V = v;
      lastFrame = null;
    }

    /* ---------- logica cablata: disegno, montaggio e smontaggio ---------- */

    function anim(el, frames, opts) {
      if (ctx.reduced || !el.animate) return Promise.resolve(true);
      const a = el.animate(frames, Object.assign({ fill: 'backwards', easing: 'cubic-bezier(.22,1,.36,1)' }, opts));
      return a.finished.then(() => true, () => false);
    }

    function drawWired(lay, animate) {
      const g = V.gWired;
      g.innerHTML = '';
      const els = { chips: [], blocks: [], wires: [] };
      const vert = lay.orient === 'v';
      const gChips = s('g', { class: 'idea-chips' });
      lay.chips.forEach((c) => {
        const cg = s('g', { class: 'idea-chip' },
          s('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: 8, class: 'idea-chipbox' }),
          s('circle', { cx: c.x, cy: c.y, r: L === NARROW ? 10 : 9.5, class: 'idea-chipnum' }),
          txt(c.x, c.y + 4, 'idea-chipnum-t', String(c.n), 'middle'),
          s('title', null, 'chip su misura ' + c.n + ': ' + c.gates + ' porte'));
        els.chips.push(cg);
        gChips.append(cg);
      });
      const gW = s('g', { class: 'idea-ws' });
      gW.append(s('path', { d: lay.feed, class: 'idea-rail' }), s('path', { d: lay.collect, class: 'idea-rail' }), s('path', { d: L.wiredLink(lay.collectEnd), class: 'idea-rail is-out' }));
      const C = lay.chips.length;
      lay.wires.forEach((w) => {
        const p = s('path', { d: w.d, class: 'idea-w is-' + w.kind });
        p.len = w.len;
        // gruppo lungo il flusso del segnale: 0 ingressi, 1…C-1 tra una colonna e l'altra, C uscite
        p.grp = w.kind === 'in' ? 0 : w.kind === 'out' ? C : +String(w.to).split('-')[0].slice(1);
        els.wires.push(p);
        gW.append(p);
      });
      const gB = s('g', { class: 'idea-gates' });
      lay.blocks.forEach((b) => {
        const bg = s('g', { class: 'idea-gate' },
          s('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 5 }),
          txt(b.x + b.w / 2, b.y + b.h / 2 + 5, 'idea-gate-t mono', b.sym, 'middle'),
          s('title', null, b.name));
        if (b.type === 'not') bg.append(s('circle', { cx: vert ? b.x + b.w / 2 : b.x + b.w + 3, cy: vert ? b.y + b.h + 3 : b.y + b.h / 2, r: 3, class: 'idea-bubble' }));
        bg.col = b.col;
        bg.row = b.row;
        els.blocks.push(bg);
        gB.append(bg);
      });
      g.append(gChips, gW, gB,
        txt(L.feedLabel[0], L.feedLabel[1], 'idea-s', L.feedLabel[3], L.feedLabel[2]),
        txt(L.outLabel[0], L.outLabel[1], 'idea-s', L.outLabel[3], L.outLabel[2]));
      V.wiredEls = els;
      if (!animate || ctx.reduced) return Promise.resolve(true);
      // il montaggio segue il segnale da sinistra a destra: chip, poi porte colonna per colonna, poi i fili a gruppi
      const all = [];
      els.chips.forEach((el, i) => all.push(anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: CP.dur.normal, delay: i * 90 })));
      els.blocks.forEach((el) => all.push(anim(el, [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: CP.dur.normal, delay: 140 + el.col * 100 + el.row * 50, easing: 'cubic-bezier(.34,1.56,.64,1)' })));
      els.wires.forEach((el) => {
        const da = el.len + ' ' + el.len;
        all.push(anim(el, [{ strokeDasharray: da, strokeDashoffset: el.len }, { strokeDasharray: da, strokeDashoffset: 0 }], { duration: 420, delay: 420 + el.grp * 100 }));
      });
      return Promise.all(all);
    }

    function tearDown() {
      const els = V && V.wiredEls;
      if (!els || ctx.reduced) return Promise.resolve(true);
      // smontaggio: i fili tagliati diventano arancio e si ritirano a ondate, poi spariscono porte e chip
      const all = [];
      els.wires.forEach((el) => {
        el.classList.add('is-cut');
        const da = el.len + ' ' + el.len;
        all.push(anim(el, [{ strokeDasharray: da, strokeDashoffset: 0, opacity: 1 }, { strokeDasharray: da, strokeDashoffset: -el.len, opacity: 0.35 }], { duration: 340, delay: el.grp * 70, fill: 'forwards', easing: 'cubic-bezier(.4,0,.2,1)' }));
      });
      els.blocks.forEach((el) => all.push(anim(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.8)' }], { duration: 260, delay: 220 + el.col * 80 + el.row * 50, fill: 'forwards', easing: 'cubic-bezier(.4,0,.2,1)' })));
      els.chips.forEach((el, i) => all.push(anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 460 + i * 80, fill: 'forwards' })));
      return Promise.all(all);
    }

    /* ---------- gettoni che viaggiano sul bus (rallentatore e passo singolo) ---------- */

    function travel(pts, label, kind, duration, delay) {
      if (ctx.reduced || !V) return Promise.resolve();
      const t = s('g', { class: 'idea-token is-' + kind },
        s('rect', { x: -17, y: -10, width: 34, height: 20, rx: 6 }),
        txt(0, 4.2, 'idea-token-t mono', label, 'middle'));
      if (delay) t.style.opacity = '0';
      V.tok.append(t);
      const segs = [];
      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        segs.push(l);
        total += l;
      }
      const place = (d) => {
        let i = 0;
        while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
        const p = segs[i] ? Math.min(1, Math.max(0, d / segs[i])) : 1;
        const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * p;
        const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * p;
        t.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
      };
      place(0);
      const tw = CP.tween({
        from: 0, to: total, duration: duration, delay: delay || 0, ease: 'inOut',
        onUpdate: (d) => { if (t.style.opacity === '0') t.style.opacity = ''; place(d); },
      });
      return tw.finished.then(() => { t.remove(); });
    }

    /* ---------- disegno dello stato ---------- */

    const OF = { calcolatrice: 'della calcolatrice', semaforo: 'del semaforo', insegna: "dell'insegna", dado: 'del dado' };
    const TO = { calcolatrice: 'alla calcolatrice', semaforo: 'al semaforo', insegna: "all'insegna", dado: 'al dado' };
    const LED_CLASS = ['idea-led', 'idea-led c1', 'idea-led c2', 'idea-led c3'];
    const rowY = (r) => L.rom.rowY0 + r * L.rom.rowH;

    function hot(el, ms) {
      el.classList.add('is-hot');
      clearTimeout(el.ideaHot);
      el.ideaHot = setTimeout(() => el.classList.remove('is-hot'), ms || 360);
    }

    function paintRow(r, info, flash) {
      const row = V.rows[r];
      const byte = info ? info.bytes[r] : 0;
      const meta = info ? info.rows[r] : { kind: 'empty', label: '—', text: 'riga vuota' };
      let changed = false;
      row.cells.forEach((c, i) => {
        const on = !!((byte >> (7 - i)) & 1);
        if (c.classList.contains('is-1') !== on) { changed = true; c.classList.toggle('is-1', on); }
      });
      row.hex.textContent = hex2(byte);
      row.op.textContent = meta.label;
      row.title.textContent = 'Riga ' + hex1(r) + ': ' + meta.text;
      row.g.setAttribute('class', 'idea-row is-' + meta.kind);
      if (flash) {
        if (changed) anim(row.flash, [{ opacity: 0.6 }, { opacity: 0 }], { duration: 460, easing: 'ease-out' });
        anim(row.op, [{ opacity: 0 }, { opacity: 1 }], { duration: CP.dur.fast });
      }
    }

    function paintRom() {
      for (let r = 0; r < M.ROWS; r++) paintRow(r, romInfo, false);
      V.romSub.textContent = romInfo ? 'programma: ' + NAMES[romInfo.id] : 'vuota: scegli una funzione';
    }

    function paintPC() {
      const show = mode === 'prog' && !busy && (running || m.ticks > 0);
      V.pc.classList.toggle('is-on', show);
      V.pc.setAttribute('y', rowY(m.pc));
      V.rows.forEach((row, r) => row.g.classList.toggle('is-pc', show && r === m.pc));
    }

    function setReg(k, value, detailed) {
      const r = V.regs[k];
      const t = String(value);
      if (r.val.textContent === t) return;
      r.val.textContent = t;
      if (detailed) hot(r.box);
    }

    function paintMachine(ev, detailed) {
      setReg('pc', hex1(m.pc), detailed);
      setReg('a', m.a, detailed);
      setReg('c', m.c, detailed);
      if (V.instr) {
        V.instr.textContent = ev && ev.type === 'exec' ? 'istruzione: ' + ev.op + (M.OPS[ev.op].arg ? ' ' + hex1(ev.n) : '')
          : (m.wait > 0 ? 'istruzione: ASP · aspetta' : '');
      }
      m.ram.forEach((d, i) => {
        const c = V.ramCells[i];
        const t = String(d);
        if (c.val.textContent !== t) { c.val.textContent = t; hot(c.box, 600); }
      });
      V.keyLed.classList.toggle('is-on', !!m.key);
      if (ev && ev.out) {
        const nib = (ev.n || m.a) & 15;
        V.outLeds.forEach((c, i) => c.classList.toggle('is-on', !!((nib >> (3 - i)) & 1)));
      } else if (!ev) V.outLeds.forEach((c) => c.classList.remove('is-on'));
      paintPC();
    }

    function paintDisplay() {
      const px = M.frame(m.out, mRom);
      const flat = [];
      for (let i = 0; i < M.LINES; i++) for (let j = 0; j < M.COLS; j++) flat.push(px[i][j]);
      flat.forEach((c, k) => { if (!lastFrame || lastFrame[k] !== c) V.leds[k].setAttribute('class', LED_CLASS[c]); });
      lastFrame = flat;
      V.cap.textContent = 'Uscita: ' + M.describe(m.out, mRom);
    }

    function currentId() { return mode === 'prog' ? (romInfo && romInfo.id) : (wiredLay && wiredLay.id); }

    function paintKey() {
      const id = currentId();
      V.keyMean.textContent = id ? M.PROGRAMS[id].key : 'niente';
      V.key.setAttribute('aria-label', 'Tasto d\'ingresso. ' + (id ? 'Ora vuol dire: ' + M.PROGRAMS[id].keyLong : 'Nessun programma lo legge') + '.');
    }

    function paintScore() {
      sc.loads.textContent = score.loads;
      sc.pchips.textContent = '0';
      sc.pwires.textContent = '0';
      sc.designs.textContent = score.designs;
      sc.chips.textContent = score.chips;
      sc.wires.textContent = score.wires;
      if (V) paintBadge();
    }

    function paintBadge() {
      const locked = V.badge.classList.contains('is-locked');
      V.badgeT.textContent = (L.bus.length + L.links.length) + ' collegamenti fissi';
      V.badgeS.textContent = locked ? 'cambia solo la ROM' : 'rifatti finora: 0';
    }

    function paintGoal() {
      const n = M.ORDER.filter((id) => tried.has(id)).length;
      goalN.textContent = Math.min(n, M.GOAL) + '/' + M.GOAL;
      M.ORDER.forEach((id) => {
        const ok = tried.has(id);
        goalItems[id].classList.toggle('is-done', ok);
        goalItems[id].lastChild.textContent = ok ? ' (fatto girare)' : '';
      });
    }

    function paintBeat(animate) {
      hoffK.textContent = 'La storia · ' + (beat + 1) + '/' + BEATS.length + ' · ' + BEATS[beat][0];
      hoffP.textContent = BEATS[beat][1];
      if (animate) anim(hoffBox, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: CP.dur.slow });
    }

    function advanceBeat(final) {
      const nb = final ? BEATS.length - 1 : Math.min(BEATS.length - 2, beat + 1);
      if (nb <= beat) return;
      beat = nb;
      paintBeat(true);
    }

    function paintBus() {
      const on = mode === 'prog' && running && !busy;
      V.bus.concat(V.links).forEach((p) => p.classList.toggle('is-active', on));
    }

    function lock(on) {
      V.bus.concat(V.links).forEach((p) => p.classList.toggle('is-locked', on));
      V.badge.classList.toggle('is-locked', on);
      V.gRom.classList.toggle('is-writing', on);
      paintBadge();
    }

    function paintMode() {
      V.gProg.classList.toggle('is-hidden', mode !== 'prog');
      V.gWired.classList.toggle('is-hidden', mode !== 'wired');
      stageBox.classList.toggle('is-wired', mode === 'wired');
    }

    function paintButtons() {
      btnRun.querySelector('.cp-ico').textContent = running ? '❚❚' : '▶︎';
      btnRun.lastChild.textContent = running ? 'Pausa' : 'Esegui';
      btnRun.disabled = busy;
      btnStep.disabled = busy || mode !== 'prog';
    }

    function paintAll() {
      paintMode();
      paintRom();
      paintMachine(null, false);
      paintDisplay();
      paintKey();
      paintScore();
      paintGoal();
      paintBus();
      paintButtons();
    }

    /* ---------- spiegazione ---------- */

    function tell(step, title, now, todo) {
      exStep.textContent = step;
      exH.textContent = title;
      exNow.textContent = now;
      exDo.textContent = todo || '';
      exDo.hidden = !todo;
    }

    function explainState() {
      if (busy) return;
      if (mode === 'prog') {
        if (!romInfo) {
          if (running) {
            return tell('Chip programmabile · ROM vuota', 'La CPU gira a vuoto',
              'La ROM è vuota: la CPU legge righe tutte a zero, che non chiedono di fare niente, e passa alla successiva. Senza programma il processore non sa fare nulla.',
              'Scegli una funzione: il suo programma verrà scritto nella ROM.');
          }
          return tell('Chip programmabile', 'Una scheda senza programma',
            'CPU, ROM, RAM e I/O sono collegati dallo stesso bus, ma la ROM è vuota: il sistema non sa ancora fare niente.',
            'Scegli una funzione qui sopra: il suo programma verrà scritto nella ROM, riga per riga.');
        }
        const Q = M.PROGRAMS[romInfo.id];
        const step = 'Chip programmabile · ' + Q.name;
        if (!running) {
          return tell(step, m.ticks ? 'In pausa' : 'Programma pronto',
            m.ticks ? 'Il programma è fermo alla riga ' + hex1(m.pc) + '. Chip e fili sono quelli di prima: è cambiato solo il contenuto della ROM.'
              : 'Nella ROM c\'è il programma ' + OF[Q.id] + ': ' + Q.what + '.',
            'Premi ▶︎ Esegui, oppure Passo per eseguire una sola istruzione.');
        }
        if (slow) {
          return tell(step, 'Al rallentatore', 'Ogni istruzione parte dalla sua riga della ROM e viaggia sul bus fino alla CPU, che la esegue.',
            'Il tasto ora vuol dire ' + Q.keyLong + '.');
        }
        return tell(step, Q.name + ': il programma gira',
          'Il programma ' + Q.what + '. Il riquadro giallo nella ROM segue la riga che la CPU sta eseguendo.',
          'Premi il tasto: ora vuol dire ' + Q.keyLong + '. Poi scegli un\'altra funzione, o attiva il rallentatore.');
      }
      if (!wiredLay) {
        return tell('Logica cablata', 'Un circuito per ogni funzione',
          'Qui non ci sono né CPU né ROM: ogni funzione è fatta di porte e flip-flop collegati apposta per lei.',
          'Scegli una funzione e guarda di quanti chip su misura e collegamenti ha bisogno.');
      }
      const W = M.PROGRAMS[wiredLay.id];
      const c = wiredLay.counts;
      return tell('Logica cablata · ' + W.name, running ? 'Il circuito ' + OF[W.id] + ' in funzione' : 'Circuito pronto',
        'Per ' + WIRED_WHAT[W.id] + ' servono ' + c.chips + ' chip su misura, ' + c.gates + ' porte e flip-flop e ' + c.wires + ' collegamenti. Funziona, ma sa fare solo questo.',
        running ? 'Ora scegli un\'altra funzione e guarda che cosa succede ai fili.' : 'Premi ▶︎ Esegui.');
    }

    function showToast(kind, title, text, ms) {
      clearTimeout(toastTimer);
      toast.className = 'idea-toast is-' + kind + ' is-on';
      toastT.textContent = title;
      toastP.textContent = text;
      if (ms) toastTimer = setTimeout(hideToast, ms);
    }
    function hideToast() {
      clearTimeout(toastTimer);
      toast.classList.remove('is-on');
    }

    /* ---------- azioni ---------- */

    function resetMachine(bytes) {
      m = M.createMachine();
      mRom = bytes;
      ticksSinceLoad = 0;
      announceOut = false;
      if (V) { V.tok.innerHTML = ''; paintDisplay(); paintMachine(null, false); }
    }

    function abandon() {
      gen++;
      busy = false;
      pending = null;
      if (V) { V.head.classList.remove('is-on'); lock(false); V.tok.innerHTML = ''; paintRom(); }
    }

    async function writeProgram(id) {
      const g = ++gen;
      pending = { kind: 'write', id: id };
      running = false;
      busy = true;
      const info = M.assemble(id);
      const diff = M.bitDiff(rom, info.bytes);
      score.loads++;
      score.bits += diff;
      paintScore();
      resetMachine(info.bytes);
      V.romSub.textContent = 'scrittura: ' + NAMES[id] + '…';
      V.head.classList.add('is-on');
      lock(true);
      paintBus();
      paintButtons();
      paintKey();
      showToast('ok', 'Stesso hardware, programma nuovo', 'Cambia solo il contenuto della ROM: ' + diff + ' bit su 128. Chip e fili restano identici.');
      tell('Chip programmabile · ' + NAMES[id], 'Scrivo il programma nella ROM',
        'Riga dopo riga, ogni byte prende il valore del nuovo programma: i primi 4 bit dicono che cosa fare, gli altri 4 con quale dato. Cambiano ' + diff + ' bit su 128.',
        'Guarda il bus, in oro: i collegamenti restano quelli di prima.');
      ctx.say('Scrivo nella ROM il programma ' + OF[id] + ': cambiano ' + diff + ' bit su 128, chip e collegamenti restano identici.');
      if (ctx.reduced) {
        for (let r = 0; r < M.ROWS; r++) paintRow(r, info, false);
      } else {
        let last = -1;
        const tw = CP.tween({
          from: 0, to: M.ROWS, duration: M.ROWS * ROW_MS, ease: 'linear',
          onUpdate: (v) => {
            if (g !== gen) { tw.cancel(); return; }
            V.head.setAttribute('y', rowY(Math.min(v, M.ROWS - 1)).toFixed(1));
            const r = Math.min(M.ROWS - 1, Math.floor(v));
            while (last < r) { last++; paintRow(last, info, true); }
          },
        });
        await tw.finished;
        if (g !== gen) return;
        while (last < M.ROWS - 1) { last++; paintRow(last, info, true); }
        await CP.wait(280, { motion: true });
        if (g !== gen) return;
      }
      finishWrite(info);
    }

    function finishWrite(info) {
      rom = info.bytes;
      romInfo = info;
      busy = false;
      pending = null;
      V.head.classList.remove('is-on');
      lock(false);
      paintRom();
      paintKey();
      clearTimeout(toastTimer);
      toastTimer = setTimeout(hideToast, 1400);
      if (!ctx.reduced) startRun();
      else { paintButtons(); paintBus(); explainState(); }
    }

    async function redesign(id) {
      const wasDesigning = pending && pending.kind === 'design';
      const g = ++gen;
      pending = { kind: 'design', id: id };
      running = false;
      busy = true;
      const lay = M.wired(id, L.wiredGeo);
      const replacing = !!(V.wiredEls && V.wiredEls.blocks.length);
      score.designs++;
      score.chips += lay.counts.chips;
      score.gates += lay.counts.gates;
      score.wires += lay.counts.wires;
      paintScore();
      resetMachine(M.assemble(id).bytes);
      paintBus();
      paintButtons();
      const c = lay.counts;
      const what = c.chips + ' chip su misura, ' + c.gates + ' porte e flip-flop, ' + c.wires + ' collegamenti';
      if (replacing) {
        showToast('warn', 'Nuovo progetto · nuove maschere · nuovi chip', 'Da rifare per passare ' + TO[id] + ': ' + what + '.');
        tell('Logica cablata · ' + NAMES[id], 'Nuovo progetto',
          'Per passare ' + TO[id] + ' non basta cambiare dei numeri: i fili si staccano, le porte cambiano e servono nuove maschere e nuovi chip. Qui bastano due secondi; nella realtà voleva dire rifare progetto, fabbricazione e collaudo.', '');
        ctx.say('Logica cablata: nuovo progetto, nuove maschere, nuovi chip. Per passare ' + TO[id] + ' servono ' + what + '.');
      } else {
        showToast('info', 'Un circuito fatto apposta', NAMES[id] + ': ' + what + '.');
        tell('Logica cablata · ' + NAMES[id], 'Disegno il circuito', 'Ogni porta e ogni filo servono solo a questa funzione: per ' + WIRED_WHAT[id] + ' servono ' + what + '.', '');
        ctx.say('Logica cablata: per ' + WIRED_WHAT[id] + ' servono ' + what + '.');
      }
      if (replacing && !wasDesigning) {
        await tearDown();
        if (g !== gen) return;
      }
      wiredLay = lay;
      paintKey();
      await drawWired(lay, true);
      if (g !== gen) return;
      finishDesign();
    }

    function finishDesign() {
      busy = false;
      pending = null;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(hideToast, 2400);
      advanceBeat();
      if (!ctx.reduced) startRun();
      else { paintButtons(); explainState(); }
    }

    function choose(id) {
      fn = id;
      if (mode === 'prog') writeProgram(id);
      else redesign(id);
    }

    function setMode(v) {
      if (v === mode) return;
      abandon();
      mode = v;
      running = false;
      hideToast();
      paintMode();
      if (mode === 'wired') {
        if (fn && wiredLay && wiredLay.id === fn) {
          // il circuito di questa funzione è già montato: niente da riprogettare
          resetMachine(M.assemble(fn).bytes);
          if (!ctx.reduced) startRun(); else explainState();
        } else if (fn) redesign(fn);
        else { resetMachine(new Array(M.ROWS).fill(0)); explainState(); }
        advanceBeat();
      } else if (fn && (!romInfo || romInfo.id !== fn)) {
        writeProgram(fn);
      } else {
        resetMachine(rom);
        if (!ctx.reduced && romInfo) startRun(); else explainState();
      }
      paintButtons();
      paintBus();
      paintKey();
      paintPC();
      ctx.say(mode === 'wired' ? 'Logica cablata: ogni funzione è un circuito diverso.' : 'Chip programmabile: lo stesso hardware, con un programma nella ROM.');
    }

    function startRun() {
      if (busy || (mode === 'wired' && !wiredLay)) return;
      running = true;
      paintButtons();
      paintBus();
      paintPC();
      explainState();
    }

    function stopRun() {
      running = false;
      paintButtons();
      paintBus();
    }

    function toggleRun() {
      if (busy) return;
      if (running) { stopRun(); explainState(); ctx.say('In pausa.'); return; }
      if (mode === 'wired' && !wiredLay) { explainState(); ctx.say(exDo.textContent); return; }
      startRun();
      ctx.say(romInfo || mode === 'wired' ? 'Il sistema è in funzione.' : 'La CPU gira, ma la ROM è vuota.');
    }

    function stepOnce() {
      if (busy || mode !== 'prog') return;
      if (running) stopRun();
      if (m.wait > 1) m.wait = 1;
      tick(true);
      exStep.textContent = romInfo ? 'Chip programmabile · ' + NAMES[romInfo.id] : 'Chip programmabile · ROM vuota';
      exDo.hidden = false;
      exDo.textContent = 'Premi ancora Passo per la prossima istruzione, o ▶︎ Esegui per ripartire.';
      ctx.say(exNow.textContent);
    }

    function keyBounce() {
      V.key.classList.add('is-down');
      setTimeout(() => { if (V) V.key.classList.remove('is-down'); }, 150);
    }

    function pressKey() {
      keyBounce();
      const id = currentId();
      if (!id) {
        exDo.hidden = false;
        exDo.textContent = mode === 'prog' ? 'Il tasto c\'è, ma nessun programma lo legge: la ROM è vuota. Scegli una funzione.'
          : 'Il tasto c\'è, ma non c\'è ancora un circuito che lo usi. Scegli una funzione.';
        ctx.say(exDo.textContent);
        return;
      }
      if (busy) return;
      m.key = true;
      announceOut = true;
      V.keyLed.classList.add('is-on');
      if (mode === 'prog' && (slow || !running)) travel(L.paths.keyToIo, '1', 'key', 280, 0);
      if (!running) startRun();
      exDo.hidden = false;
      exDo.textContent = 'Hai premuto il tasto: ' + (mode === 'prog' ? 'per questo programma' : 'in questo circuito') + ' vuol dire ' + M.PROGRAMS[id].keyLong + '.';
    }

    function animateEvent(ev) {
      if (ctx.reduced) return;
      const P = L.paths;
      const half = L.rom.rowH / 2;
      const d = running ? 330 : 300;
      travel(P.romOut(rowY(ev.pc) + half), hex2(ev.byte), 'data', d, 0);
      const after = d + 40;
      if (ev.reads != null && (ev.op === 'LEG' || ev.op === 'SOM')) travel(P.romOut(rowY(ev.reads) + half), hex2(mRom[ev.reads]), 'data', d, after);
      if (ev.ram != null) travel(P.cpuToRam(ev.ram), String(m.ram[ev.ram]), 'data', d, after);
      if (ev.out) {
        travel(P.cpuToIo, hex1(ev.n), 'ctrl', d * 0.7, after);
        travel(P.ioToDisp, '', 'ctrl', d * 0.5, after + d * 0.7);
      }
      if (ev.key === 'used') travel(P.ioToCpu, '1', 'key', d * 0.7, 0);
    }

    function pulseWires() {
      const els = V.wiredEls;
      if (!els || !els.wires.length || ctx.reduced) return;
      els.wires.forEach((w) => w.classList.remove('is-hot'));
      for (let k = 0; k < 4; k++) els.wires[Math.floor(Math.random() * els.wires.length)].classList.add('is-hot');
    }

    function finishGoal() {
      advanceBeat(true);
      ctx.done();
      const n = M.ORDER.filter((id) => tried.has(id)).length;
      ctx.say('Obiettivo raggiunto: hai fatto girare ' + n + ' programmi diversi sullo stesso hardware.');
      showToast('ok', 'Obiettivo raggiunto', n + ' programmi diversi, nessun chip e nessun filo cambiato: è l\'idea di Hoff.', 3600);
      if (!ctx.reduced) {
        stageBox.classList.add('is-cheer');
        setTimeout(() => stageBox.classList.remove('is-cheer'), 1400);
      }
    }

    function checkRun() {
      if (!romInfo || ticksSinceLoad < RUN_TICKS || tried.has(romInfo.id)) return;
      tried.add(romInfo.id);
      CP.store.set('idea-provati', Array.from(tried));
      paintGoal();
      if (M.goalReached(tried)) finishGoal();
      else advanceBeat();
    }

    function tick(detailed) {
      stageBox.classList.toggle('is-glide', !!detailed); // al rallentatore il riquadro del PC scivola di riga in riga
      const ev = M.step(m, mRom);
      ticksSinceLoad++;
      paintMachine(ev, detailed);
      if (ev.out) {
        paintDisplay();
        if (announceOut) { announceOut = false; ctx.say('Uscita: ' + M.describe(m.out, mRom) + '.'); }
      }
      if (mode === 'prog') {
        if (detailed && ev.type === 'exec') {
          animateEvent(ev);
          exH.textContent = running ? 'Al rallentatore' : 'Passo dopo passo';
          exNow.textContent = M.explain(ev, m, mRom);
        } else if (detailed && ev.type === 'wait' && (ev.done || ev.left % 10 === 0)) {
          exNow.textContent = M.explain(ev, m, mRom);
        }
        checkRun();
      } else if (++pulseCount % 5 === 0) pulseWires();
    }

    /* ---------- tempo, disposizione, avvio ---------- */

    let acc = 0;
    ctx.tick((dt) => {
      if (!running || busy) { acc = 0; return; }
      acc += dt;
      const period = slow && m.wait === 0 ? SLOW : FAST;
      if (acc < period) return;
      acc = 0;
      tick(slow);
    });

    function relayout() {
      const nl = mqNarrow && mqNarrow.matches ? NARROW : WIDE;
      if (nl === L) return;
      const p = pending;
      gen++;
      L = nl;
      build();
      if (p && p.kind === 'write') {
        finishWrite(M.assemble(p.id));
      } else if (p && p.kind === 'design') {
        wiredLay = M.wired(p.id, L.wiredGeo);
        drawWired(wiredLay, false);
        finishDesign();
      } else if (wiredLay) {
        wiredLay = M.wired(wiredLay.id, L.wiredGeo);
        drawWired(wiredLay, false);
      }
      paintAll();
      explainState();
    }

    build();
    paintBeat(false);
    paintAll();
    explainState();
    if (M.goalReached(tried)) ctx.done();
    if (mqNarrow) {
      if (mqNarrow.addEventListener) mqNarrow.addEventListener('change', relayout);
      else if (mqNarrow.addListener) mqNarrow.addListener(relayout);
    }
  });
})();
