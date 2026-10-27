/*
 * Capitolo 6 · Nasce il circuito integrato (1952 – 1971).
 * Perché bisognava mettere un intero circuito in un solo pezzo di semiconduttore (la tirannia dei numeri),
 * chi ci riuscì (l'idea di Dummer, il germanio di Kilby, il silicio planare di Hoerni e Noyce) e come diventò
 * un'industria (la Fairchild, le aziende nate da lei, la Silicon Valley), fino ai chip con migliaia di porte del 1971.
 * Laboratori: la tirannia dei numeri, il chip di Kilby, mesa contro planare, l'albero della Fairchild, da SSI a VLSI.
 * Figura: l'idea di Noyce, componenti affiancati nello stesso silicio e collegati da piste stese sopra l'ossido.
 */
(function () {
  'use strict';

  const { h, s, ui, draw } = PL;

  const n1 = (v) => Math.round(v * 10) / 10;

  /* Numeri pseudocasuali con seme: la stessa scheda a ogni visita, anche con il movimento ridotto. */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* 17000 → «17.000», 5000000 → «5 milioni» */
  function many(n) {
    if (n >= 1e6) {
      const m = Math.round(n / 1e5) / 10;
      return PL.fmt(m, Number.isInteger(m) ? 0 : 1) + (m === 1 ? ' milione' : ' milioni');
    }
    return PL.fmt(Math.round(n), 0);
  }

  /* due cifre significative: 16.982 → 17.000 */
  function nice(x) {
    if (x < 100) return Math.round(x);
    const m = Math.pow(10, Math.floor(Math.log10(x)) - 1);
    return Math.round(x / m) * m;
  }

  function pct(p) {
    const v = p * 100;
    if (v >= 99.995) return 'più del 99,99%';
    if (v >= 99) return PL.fmt(v, 2) + '%';
    if (v >= 1) return PL.fmt(v, 1) + '%';
    if (v >= 0.01) return PL.fmt(v, 2) + '%';
    return 'meno dello 0,01%';
  }

  /* ---------- laboratorio: la tirannia dei numeri ---------- */

  function labTyranny() {
    const COLS = 28;
    const ROWS = 14;
    const G = COLS * ROWS;
    const X0 = 40;
    const Y0 = 42;
    const DX = 16.2;
    const DY = 16.6;
    const XEND = X0 + (COLS - 1) * DX;
    const PERIOD = 2.6; // secondi tra una prova e l'altra
    const SPEED = 560; // velocità del fascio di controllo, in unità del disegno al secondo
    const PRESETS = [
      { id: 'radio', label: 'Una radio a transistor', n: 100 },
      { id: 'calc', label: 'Un calcolatore del 1961', n: 17000 },
      { id: 'eniac', label: 'L\'ENIAC', n: 5000000 },
    ];
    const RATES = [1e3, 2e3, 5e3, 1e4, 2e4, 5e4, 1e5, 2e5, 5e5, 1e6, 2e6, 5e6, 1e7];
    const st = { n: 17000, rate: 1e4, preset: 'calc', tested: 0, good: 0 };
    const rand = rng(1958);
    const bad = new Array(G).fill(false);

    const art = PL.svg('0 0 520 300', { class: 'pl-svg i1-art', role: 'img', 'aria-label': 'Una scheda elettronica vista dall\'alto, con centinaia di saldature in file ordinate. A ogni prova un fascio di controllo la scorre da sinistra a destra e le saldature difettose si accendono di rosso.' });
    const lay = rng(7);
    const traces = s('g', { class: 'i1-traces' });
    const parts = s('g', { class: 'i1-parts' });
    const jg = s('g', { class: 'i1-joints' });
    const joints = [];
    for (let r = 0; r < ROWS; r++) {
      const y = Y0 + r * DY;
      traces.append(s('path', { d: `M${X0} ${n1(y)}H${n1(XEND)}` }));
      for (let c = 0; c < COLS; c++) {
        const x = X0 + c * DX;
        if (c % 2 === 0) {
          const k = lay();
          parts.append(s('rect', { class: 'i1-part ' + (k < 0.55 ? 'is-r' : k < 0.85 ? 'is-c' : 'is-d'), x: n1(x + 3.2), y: n1(y - 3.4), width: n1(DX - 6.4), height: 6.8, rx: 2.2 }));
        }
        const el = s('circle', { class: 'i1-j', cx: n1(x), cy: n1(y), r: 3.2 });
        jg.append(el);
        joints.push(el);
      }
    }
    const fingers = s('g', { class: 'i1-fingers' });
    for (let x = 70; x <= 446; x += 16) fingers.append(s('rect', { x, y: 278, width: 10, height: 16, rx: 1.5 }));
    const scan = s('g', { class: 'i1-scan' },
      s('rect', { class: 'i1-scan-band', x: -16, y: 20, width: 32, height: 252, rx: 8 }),
      s('line', { class: 'i1-scan-line', x1: 0, y1: 20, x2: 0, y2: 272 }));
    art.append(s('rect', { class: 'i1-board', x: 6, y: 6, width: 508, height: 288, rx: 14 }), fingers, traces, parts, jg, scan);
    const legend = h('p', { class: 'i1-legend' });

    // quadrante: probabilità che tutte le saldature siano buone
    const ARC = 'M22 112A88 88 0 0 1 198 112';
    const gVal = s('path', { class: 'i1-gval', d: ARC, pathLength: 100 });
    const needle = s('g', { class: 'i1-needle' }, s('line', { x1: 110, y1: 112, x2: 110, y2: 44 }), s('circle', { cx: 110, cy: 112, r: 6 }));
    const ticks = [0, 25, 50, 75, 100].map((t) => {
      const a = Math.PI * (1 - t / 100);
      return s('line', { class: 'i1-gtick', x1: n1(110 + Math.cos(a) * 98), y1: n1(112 - Math.sin(a) * 98), x2: n1(110 + Math.cos(a) * 106), y2: n1(112 - Math.sin(a) * 106) });
    });
    const gauge = PL.svg('0 0 220 132', { class: 'pl-svg i1-gauge', 'aria-hidden': 'true' },
      s('path', { class: 'i1-gbg', d: ARC }), gVal, ...ticks,
      s('text', { class: 'i1-gt', x: 22, y: 130, 'text-anchor': 'middle' }, '0%'),
      s('text', { class: 'i1-gt', x: 198, y: 130, 'text-anchor': 'middle' }, '100%'),
      needle);
    const bigEl = h('span', { class: 'i1-big pl-mono' });
    const lamEl = h('span', { class: 'pl-mono' });
    const testEl = h('span', { class: 'pl-mono' });
    const verdict = h('p', { class: 'i1-verdict' });
    const panel = h('div', { class: 'pl-lab-panel i1-panel' },
      h('h4', null, 'Probabilità che tutto funzioni'),
      gauge,
      h('p', { class: 'i1-bigrow' }, bigEl),
      h('dl', { class: 'i1-dl' },
        h('dt', null, 'difetti attesi per scheda'), h('dd', null, lamEl),
        h('dt', null, 'schede funzionanti'), h('dd', null, testEl)),
      verdict);
    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));

    const probAll = () => Math.exp(st.n * Math.log1p(-1 / st.rate));
    const activeDots = () => Math.min(G, st.n);

    let shownP = 0;
    let gTw = null;
    function showGauge(P) {
      if (gTw) gTw.cancel();
      gTw = PL.tween({
        from: shownP, to: P, duration: 900, ease: PL.motion.ease.smooth,
        onUpdate: (v) => {
          shownP = v;
          gVal.style.strokeDasharray = (v * 100).toFixed(2) + ' 100';
          needle.setAttribute('transform', `rotate(${n1(-90 + 180 * v)} 110 112)`);
        },
      });
      panel.dataset.zone = P >= 0.9 ? 'ok' : P >= 0.5 ? 'mid' : 'bad';
      bigEl.textContent = pct(P);
    }

    // una prova: ogni punto della scheda è una saldatura o un gruppo di saldature
    function sample() {
      const A = activeDots();
      const q = 1 - Math.exp((st.n / A) * Math.log1p(-1 / st.rate));
      let count = 0;
      for (let i = 0; i < G; i++) {
        bad[i] = i < A && rand() < q;
        if (bad[i]) count += 1;
      }
      return count;
    }
    function paintCol(c) {
      for (let r = 0; r < ROWS; r++) joints[r * COLS + c].classList.toggle('is-bad', bad[r * COLS + c]);
    }

    let clock = 0;
    let scanX = -1;
    let col = 0;
    let pending = 0;
    function startTest() {
      pending = sample();
      joints.forEach((el) => el.classList.remove('is-bad'));
      col = 0;
      scanX = X0 - 18;
      scan.setAttribute('transform', `translate(${scanX} 0)`);
      scan.classList.add('is-on');
    }
    function finishTest() {
      scan.classList.remove('is-on');
      scanX = -1;
      st.tested += 1;
      if (!pending) st.good += 1;
      testEl.textContent = st.good + ' su ' + st.tested;
      const A = activeDots();
      const unit = A === st.n ? (pending === 1 ? 'saldatura difettosa' : 'saldature difettose') : (pending === 1 ? 'zona con difetti' : 'zone con difetti');
      verdict.textContent = pending ? 'Ultima scheda: guasta, ' + pending + ' ' + unit + ' da cercare.' : 'Ultima scheda: funziona al primo colpo.';
      verdict.className = 'i1-verdict ' + (pending ? 'is-bad' : 'is-ok');
    }
    function testNow() {
      if (PL.reduced()) {
        pending = sample();
        for (let c = 0; c < COLS; c++) paintCol(c);
        finishTest();
        return;
      }
      clock = 0;
      startTest();
    }
    if (!PL.reduced()) {
      PL.loop((dt) => {
        if (scanX < 0) {
          clock += dt;
          if (clock >= PERIOD) { clock = 0; startTest(); }
          return;
        }
        scanX += dt * SPEED;
        scan.setAttribute('transform', `translate(${n1(scanX)} 0)`);
        while (col < COLS && X0 + col * DX <= scanX) { paintCol(col); col += 1; }
        if (scanX >= XEND + 18) finishTest();
      }, { el: art });
    }

    function explain() {
      const P = probAll();
      const lam = st.n / st.rate;
      let msg = 'Con <strong>' + many(st.n) + ' saldature</strong>, ognuna con una probabilità su ' + many(st.rate) + ' di essere difettosa, la probabilità che siano tutte buone è pari a <strong>' + pct(P) + '</strong>. ';
      if (P >= 0.9) msg += 'Quasi tutte le schede funzionano al primo colpo.';
      else if (P >= 0.5) msg += 'Circa ' + Math.round(P * 10) + ' schede su 10 funzionano subito; le altre hanno almeno un difetto da trovare.';
      else if (P >= 0.01) msg += 'Solo ' + Math.round(P * 100) + ' schede su 100 funzionano al primo colpo: tutte le altre vanno controllate e riparate.';
      else msg += 'Praticamente nessuna scheda funziona al primo colpo: tra tante saldature ce n\'è sempre almeno una difettosa, in media ' + many(Math.round(lam)) + '. È la tirannia dei numeri.';
      if (P < 0.9) msg += ' Per farne funzionare 9 su 10 servirebbe un difetto ogni ' + many(nice(st.n / 0.10536)) + ' saldature, oppure molte meno saldature.';
      say(msg);
    }

    function changed() {
      st.tested = 0;
      st.good = 0;
      presetBtns.forEach((b) => b.setAttribute('aria-pressed', b.dataset.preset === st.preset ? 'true' : 'false'));
      const A = activeDots();
      joints.forEach((el, i) => {
        el.classList.remove('is-bad');
        el.classList.toggle('is-off', i >= A);
      });
      const per = st.n / A;
      legend.textContent = A === st.n
        ? 'Ogni punto è una saldatura: ' + many(st.n) + ' in tutto.'
        : 'Ogni punto rappresenta ' + (per < 1.5 ? 'circa una saldatura' : 'circa ' + many(nice(per)) + ' saldature') + '.';
      showGauge(probAll());
      const lam = st.n / st.rate;
      lamEl.textContent = lam < 0.01 ? 'meno di 0,01' : lam < 1 ? PL.fmt(lam, 2) : lam < 10 ? PL.fmt(lam, 1) : many(Math.round(lam));
      testEl.textContent = '—';
      verdict.textContent = PL.reduced() ? 'Premi «Prova un\'altra scheda» per costruirne una e controllarla.' : 'Arriva una nuova scheda da controllare…';
      verdict.className = 'i1-verdict';
      if (scanX >= 0) { scanX = -1; scan.classList.remove('is-on'); }
      clock = PERIOD - 0.5;
      explain();
    }

    const presetBtns = PRESETS.map((p) => {
      const b = ui.btn({ label: p.label, kind: 'lab', onClick: () => { st.n = p.n; st.preset = p.id; nSl.set(Math.log10(p.n), true); changed(); } });
      b.dataset.preset = p.id;
      return b;
    });
    const nSl = ui.slider({
      label: 'Saldature', min: 1, max: 7, step: 0.01, value: Math.log10(st.n),
      format: (v) => many(nice(Math.pow(10, v))),
      onInput: (v) => { st.n = nice(Math.pow(10, v)); st.preset = null; changed(); },
    });
    const rSl = ui.slider({
      label: 'Un difetto ogni', min: 0, max: RATES.length - 1, step: 1, value: RATES.indexOf(st.rate),
      format: (i) => many(RATES[i]),
      onInput: (i) => { st.rate = RATES[i]; changed(); },
    });
    const testBtn = ui.btn({ label: 'Prova un\'altra scheda', kind: 'lab', onClick: testNow });
    changed();

    return ui.lab({
      title: 'La tirannia dei numeri',
      intro: 'Ogni saldatura fatta a mano ha una piccola probabilità di essere difettosa. Scegli quante saldature ha la macchina e quanto sono affidabili, e guarda quante schede funzionano al primo colpo.',
      controls: [h('div', { class: 'i1-presets', role: 'group', 'aria-label': 'Esempi' }, presetBtns), nSl.el, rSl.el, testBtn],
      stage: h('div', { class: 'pl-lab-grid i1-grid' }, h('div', { class: 'i1-wrap' }, art, legend), panel),
      readout,
      caption: 'Modello semplificato: ogni saldatura ha la stessa probabilità di essere difettosa, indipendentemente dalle altre, e la probabilità che siano tutte buone è il prodotto delle probabilità di ognuna. Gli esempi: una radio a transistor ha circa un centinaio di saldature; il calcolatore costruito nel 1961 dalla Texas Instruments per l\'aeronautica americana, fatto con componenti separati, ne avrebbe richiesti 8.500, cioè almeno 17.000 saldature; l\'ENIAC ne aveva circa 5 milioni.',
      class: 'i1-lab',
    });
  }

  /* ---------- laboratorio: il chip di Kilby ---------- */

  function labKilby() {
    const PARTS = [
      { value: 'transistor', label: 'Transistor' },
      { value: 'condensatore', label: 'Condensatore' },
      { value: 'resistenze', label: 'Resistenze' },
      { value: 'fili', label: 'Collegamenti' },
    ];
    const TEXT = {
      chip: {
        transistor: 'Il <strong>transistor</strong>, il componente attivo che amplifica il segnale. Kilby lo ricavò nello stesso pezzo di germanio di tutte le altre parti.',
        condensatore: 'Il <strong>condensatore</strong>: una giunzione tra germanio di tipo p e di tipo n. Si comporta come due piastre separate da un sottilissimo strato isolante.',
        resistenze: 'Le <strong>resistenze</strong> sono tratti della barretta stessa: il germanio conduce, ma non benissimo, e un tratto di cristallo frena la corrente come una resistenza. Nel chip ce n\'è l\'equivalente di tre.',
        fili: 'I <strong>fili d\'oro</strong>, sottilissimi e saldati a mano, collegano le parti tra loro e con l\'esterno. Erano il punto debole dell\'idea: per produrre chip a migliaia servivano collegamenti fatti tutti insieme.',
      },
      board: {
        transistor: 'Un <strong>transistor</strong> nel suo contenitore di metallo, con tre piedini da saldare alla scheda.',
        condensatore: 'Un <strong>condensatore</strong> ceramico, con i suoi due fili da saldare.',
        resistenze: 'Tre <strong>resistenze</strong>, ognuna con due fili e le strisce colorate che ne indicano il valore.',
        fili: 'Fili e <strong>saldature</strong>: in questo piccolo circuito ce ne sono 14. Ogni saldatura è un possibile guasto, e un calcolatore ne aveva decine di migliaia.',
      },
    };
    const st = { view: 'chip', part: 'transistor', on: false };
    const gid = PL.uid('i2');
    const tag = (el, part) => { el.dataset.part = part; return el; };

    const art = PL.svg('0 0 480 250', { class: 'pl-svg i2-art', role: 'img', 'aria-label': 'Il chip di Kilby: una barretta di germanio lunga 11,1 millimetri incollata su un vetrino, con un transistor, un condensatore e tre resistenze collegati da fili d\'oro. In alternativa, lo stesso oscillatore montato con componenti separati su una scheda.' });
    art.append(s('defs', null,
      s('linearGradient', { id: gid + '-ge', x1: 0, y1: 0, x2: 0, y2: 1 },
        s('stop', { offset: '0', 'stop-color': '#a3acb1' }),
        s('stop', { offset: '.4', 'stop-color': '#737c82' }),
        s('stop', { offset: '1', 'stop-color': '#3e4448' })),
      s('linearGradient', { id: gid + '-glass', x1: 0, y1: 0, x2: 1, y2: 1 },
        s('stop', { offset: '0', 'stop-color': '#bfe6ef', 'stop-opacity': '.2' }),
        s('stop', { offset: '.55', 'stop-color': '#bfe6ef', 'stop-opacity': '.07' }),
        s('stop', { offset: '1', 'stop-color': '#bfe6ef', 'stop-opacity': '.16' })),
      s('pattern', { id: gid + '-holes', width: 12, height: 12, patternUnits: 'userSpaceOnUse' },
        s('circle', { class: 'i2-hole', cx: 6, cy: 6, r: 1.5 }))));

    // la barretta di germanio sul vetrino (proporzioni 11,1 × 1,6 mm)
    const chip = s('g', { class: 'i2-chip' });
    chip.append(
      s('rect', { class: 'i2-glass', x: 16, y: 20, width: 448, height: 214, rx: 10, fill: `url(#${gid}-glass)` }),
      s('path', { class: 'i2-shine', d: 'M60 26H96L48 228H22V200Z' }),
      s('rect', { class: 'i2-pad', x: 20, y: 60, width: 18, height: 13, rx: 2 }),
      s('rect', { class: 'i2-pad', x: 442, y: 60, width: 18, height: 13, rx: 2 }),
      s('text', { class: 'i2-lbl', x: 26, y: 50 }, 'alimentazione'),
      s('text', { class: 'i2-lbl', x: 454, y: 50, 'text-anchor': 'end' }, 'uscita'),
      s('rect', { class: 'i2-ge', x: 64, y: 128, width: 352, height: 50, rx: 3, fill: `url(#${gid}-ge)` }),
      s('rect', { class: 'i2-ge-top', x: 66, y: 130, width: 348, height: 5, rx: 2 }));
    const zones = [[86, 150], [206, 268], [352, 408]].map(([a, b], i) => tag(s('g', { class: 'i2-part i2-zone' },
      s('rect', { class: 'i2-zone-bg', x: a, y: 131, width: b - a, height: 44, rx: 2 }),
      s('text', { class: 'i2-tag', x: (a + b) / 2, y: 166, 'text-anchor': 'middle' }, 'R' + (i + 1))), 'resistenze'));
    const tr = tag(s('g', { class: 'i2-part i2-tr' },
      s('ellipse', { class: 'i2-halo', cx: 178, cy: 152, rx: 26, ry: 21 }),
      s('ellipse', { class: 'i2-mesa', cx: 178, cy: 150, rx: 16, ry: 11 }),
      s('circle', { class: 'i2-metal', cx: 172, cy: 147, r: 3 }),
      s('circle', { class: 'i2-metal', cx: 185, cy: 151, r: 3 }),
      s('text', { class: 'i2-tag', x: 178, y: 173, 'text-anchor': 'middle' }, 'T')), 'transistor');
    const cap = tag(s('g', { class: 'i2-part i2-cap' },
      s('rect', { class: 'i2-halo', x: 274, y: 132, width: 76, height: 44, rx: 6 }),
      s('rect', { class: 'i2-junction', x: 282, y: 136, width: 60, height: 36, rx: 3 }),
      s('rect', { class: 'i2-metal', x: 298, y: 142, width: 28, height: 16, rx: 2 }),
      s('text', { class: 'i2-tag', x: 312, y: 170, 'text-anchor': 'middle' }, 'C')), 'condensatore');
    const dots = [84, 152, 204, 270, 350, 404].map((x) => s('circle', { class: 'i2-dot', cx: x, cy: 140, r: 3.4 }));
    const wires = tag(s('g', { class: 'i2-part i2-wires' },
      ...['M29 73C36 104 70 92 84 138', 'M185 148C196 92 198 98 204 138', 'M270 138C278 104 302 104 312 142',
        'M172 144C204 58 330 62 350 138', 'M404 138C414 86 440 96 451 73'].map((d) => s('path', { class: 'i2-wire', d }))), 'fili');
    chip.append(...zones, tr, cap, ...dots, wires,
      s('text', { class: 'i2-lbl', x: 64, y: 200 }, 'germanio · 11,1 × 1,6 mm'),
      s('text', { class: 'i2-lbl', x: 416, y: 200, 'text-anchor': 'end' }, 'vetrino'));

    // lo stesso oscillatore con componenti separati, su una basetta millefori
    const board = s('g', { class: 'i2-board' });
    const solder = (x, y) => s('circle', { class: 'i2-solder', cx: x, cy: y, r: 4.6 });
    const resistor = (y, bands) => s('g', null,
      s('line', { class: 'i2-lead', x1: 196, y1: y, x2: 276, y2: y }),
      s('rect', { class: 'i2-res-body', x: 212, y: y - 7, width: 48, height: 14, rx: 6 }),
      ...bands.map((c, i) => s('rect', { class: 'i2-band ' + c, x: 220 + i * 9, y: y - 7, width: 4, height: 14 })),
      solder(196, y), solder(276, y));
    board.append(
      s('rect', { class: 'i2-pcb', x: 16, y: 20, width: 448, height: 214, rx: 10 }),
      s('rect', { class: 'i2-holes', x: 16, y: 20, width: 448, height: 214, rx: 10, fill: `url(#${gid}-holes)` }),
      tag(s('g', { class: 'i2-part i2-hookups' },
        ...['M38 66H150V70H196', 'M136 160V178H172V116H196', 'M120 160V200H184V162H196', 'M276 70H322V150H362',
          'M276 116H300V196H378V150', 'M276 162H290V214H420V66H442', 'M104 160V214H38'].map((d, i) => s('path', { class: 'i2-hook is-' + (i % 3), d }))), 'fili'),
      tag(s('g', { class: 'i2-part' },
        s('rect', { class: 'i2-halo', x: 88, y: 72, width: 64, height: 98, rx: 10 }),
        ...[[112, 104], [120, 120], [128, 136]].map(([a, b]) => s('line', { class: 'i2-lead', x1: a, y1: 120, x2: b, y2: 160 })),
        s('circle', { class: 'i2-can', cx: 120, cy: 104, r: 22 }),
        s('circle', { class: 'i2-can-top', cx: 120, cy: 104, r: 16 }),
        s('rect', { class: 'i2-can-tab', x: 95, y: 119, width: 8, height: 6, rx: 1, transform: 'rotate(45 99 122)' }),
        solder(104, 160), solder(120, 160), solder(136, 160),
        s('text', { class: 'i2-tag', x: 120, y: 109, 'text-anchor': 'middle' }, 'T')), 'transistor'),
      tag(s('g', { class: 'i2-part' },
        s('rect', { class: 'i2-halo', x: 186, y: 54, width: 100, height: 124, rx: 10 }),
        resistor(70, ['b-brown', 'b-black', 'b-red']), resistor(116, ['b-yellow', 'b-violet', 'b-red']), resistor(162, ['b-brown', 'b-black', 'b-orange']),
        ...['R1', 'R2', 'R3'].map((t, i) => s('text', { class: 'i2-tag is-small', x: 236, y: 60 + i * 46, 'text-anchor': 'middle' }, t))), 'resistenze'),
      tag(s('g', { class: 'i2-part' },
        s('rect', { class: 'i2-halo', x: 342, y: 78, width: 56, height: 86, rx: 10 }),
        s('line', { class: 'i2-lead', x1: 362, y1: 112, x2: 362, y2: 150 }),
        s('line', { class: 'i2-lead', x1: 378, y1: 112, x2: 378, y2: 150 }),
        s('circle', { class: 'i2-disc', cx: 370, cy: 102, r: 18 }),
        solder(362, 150), solder(378, 150),
        s('text', { class: 'i2-tag', x: 370, y: 107, 'text-anchor': 'middle' }, 'C')), 'condensatore'),
      solder(38, 66), solder(442, 66), solder(38, 214),
      s('text', { class: 'i2-lbl', x: 28, y: 54 }, 'alimentazione'),
      s('text', { class: 'i2-lbl', x: 452, y: 54, 'text-anchor': 'end' }, 'uscita'),
      s('text', { class: 'i2-lbl', x: 50, y: 228 }, 'massa'));
    art.append(board, chip);

    // oscilloscopio
    const SX = 12;
    const SY = 12;
    const SW = 276;
    const SH = 186;
    const CY = SY + SH / 2;
    const AMAX = 62;
    const CYCLES = 4;
    const SWEEP = 1.15;
    const grid = s('g', { class: 'i2-sgrid' });
    for (let i = 1; i < 10; i++) grid.append(s('line', { class: i === 5 ? 'is-axis' : '', x1: SX + (SW * i) / 10, y1: SY, x2: SX + (SW * i) / 10, y2: SY + SH }));
    for (let j = 1; j < 8; j++) grid.append(s('line', { class: j === 4 ? 'is-axis' : '', x1: SX, y1: n1(SY + (SH * j) / 8), x2: SX + SW, y2: n1(SY + (SH * j) / 8) }));
    const flat = `M${SX} ${CY}H${SX + SW}`;
    const ghost = s('path', { class: 'i2-ghost', d: '' });
    const trace = s('path', { class: 'i2-trace', d: flat });
    const head = s('circle', { class: 'i2-head', cx: SX, cy: CY, r: 3.6 });
    const scope = PL.svg('0 0 300 210', { class: 'pl-svg i2-scope', 'aria-hidden': 'true' },
      s('rect', { class: 'i2-screen', x: SX, y: SY, width: SW, height: SH, rx: 8 }), grid, ghost, trace, head);
    const yAt = (x, a) => CY - a * Math.sin((2 * Math.PI * CYCLES * x) / SW);
    const amp = (t) => AMAX / (1 + (AMAX / 0.5 - 1) * Math.exp(-t / 0.16));
    const steady = () => 'M' + Array.from({ length: SW + 1 }, (_, x) => n1(SX + x) + ' ' + n1(yAt(x, AMAX))).join('L');
    let tOn = 0;
    let bx = 0;
    let pts = [];
    const sweep = PL.loop((dt) => {
      tOn += dt;
      const a = amp(tOn);
      const nx = bx + (dt / SWEEP) * SW;
      for (let x = Math.floor(bx) + 1; x <= Math.min(SW, nx); x++) pts.push(n1(SX + x) + ' ' + n1(yAt(x, a)));
      bx = nx;
      if (bx >= SW) {
        ghost.setAttribute('d', 'M' + pts.join('L'));
        bx = 0;
        pts = [SX + ' ' + n1(yAt(0, a))];
      }
      trace.setAttribute('d', pts.length > 1 ? 'M' + pts.join('L') : flat);
      head.setAttribute('cx', n1(SX + bx));
      head.setAttribute('cy', n1(yAt(bx, a)));
    }, { el: scope, autostart: false });

    const readout = h('p');
    function explain() {
      const power = !st.on
        ? 'Il circuito è spento: sullo schermo dell\'oscilloscopio c\'è solo una riga piatta. '
        : st.view === 'chip'
          ? 'Il circuito oscilla: il transistor amplifica, e la rete di resistenze e condensatore riporta all\'ingresso una parte dell\'uscita sfasata di mezzo giro. Il segnale si rinforza da solo, e sullo schermo compare un\'onda che si ripete senza fermarsi, come quella che vide Kilby il 12 settembre 1958. '
          : 'Lo stesso oscillatore fatto con componenti separati funziona allo stesso modo: la differenza non è in quello che fa, ma in come è costruito. ';
      readout.replaceChildren(PL.rich(power + TEXT[st.view][st.part]));
    }
    function paint() {
      art.classList.toggle('is-board', st.view === 'board');
      art.querySelectorAll('.i2-part').forEach((el) => el.classList.toggle('is-hl', el.dataset.part === st.part));
      powerBtn.classList.toggle('is-on', st.on);
      powerBtn.setAttribute('aria-pressed', st.on ? 'true' : 'false');
      powerBtn.lastChild.textContent = st.on ? 'Spegni' : 'Accendi';
      scope.classList.toggle('is-on', st.on);
      explain();
    }
    function power(on) {
      st.on = on;
      if (!on) {
        sweep.stop();
        trace.setAttribute('d', flat);
        ghost.setAttribute('d', '');
      } else if (PL.reduced()) {
        trace.setAttribute('d', steady());
      } else {
        tOn = 0;
        bx = 0;
        pts = [SX + ' ' + CY];
        ghost.setAttribute('d', '');
        sweep.start();
      }
      paint();
    }

    const viewSeg = ui.segmented({ label: 'Vista', value: st.view, options: [{ value: 'chip', label: 'Il chip di Kilby' }, { value: 'board', label: 'Prima: componenti separati' }], onChange: (v) => { st.view = v; paint(); } });
    const partSeg = ui.segmented({ label: 'Parte da esaminare', value: st.part, options: PARTS, onChange: (v) => { st.part = v; paint(); } });
    const powerBtn = ui.btn({ label: 'Accendi', kind: 'lab', icon: '⏻', onClick: () => power(!st.on) });
    powerBtn.classList.add('i2-power');
    art.addEventListener('click', (e) => {
      const p = e.target.closest && e.target.closest('.i2-part');
      if (p) partSeg.set(p.dataset.part);
    });
    paint();
    // come Kilby, accendiamo il circuito appena il banco è sotto gli occhi
    PL.onVisible(art, () => PL.timeout(() => { if (!st.on) power(true); }, 700), { threshold: 0.5 });

    return ui.lab({
      title: 'Il chip di Kilby',
      intro: 'Una ricostruzione del primo circuito integrato, un oscillatore. Tocca le parti del chip, o scegline una qui sotto, per scoprire che cosa sono; accendi il circuito e guarda l\'oscilloscopio.',
      controls: [viewSeg.el, partSeg.el, powerBtn],
      stage: h('div', { class: 'pl-lab-grid i2-grid' }, art, h('div', { class: 'pl-lab-panel i2-panel' }, h('h4', null, 'Oscilloscopio'), scope, h('p', { class: 'i2-note' }, 'tensione d\'uscita nel tempo'))),
      readout,
      caption: 'Ricostruzione schematica, non in scala, del chip mostrato da Kilby il 12 settembre 1958: una barretta di germanio di 11,1 × 1,6 mm con un transistor, un condensatore e l\'equivalente di tre resistenze. La disposizione delle parti e dei fili è semplificata.',
      class: 'i2-lab',
    });
  }

  /* ---------- laboratorio: mesa contro planare ---------- */

  function labPlanar() {
    const SI = 148; // superficie del silicio
    const OXT = 18; // spessore dell'ossido nel disegno
    const XL = 30;
    const XR = 610;
    const WINS = {
      b: [{ cx: 180, w: 120 }],
      e: [{ cx: 173, w: 34 }, { cx: 280, w: 20 }],
      c: [{ cx: 131, w: 18 }, { cx: 173, w: 22 }, { cx: 280, w: 20 }],
      c2: [{ cx: 411, w: 18 }, { cx: 453, w: 22 }, { cx: 560, w: 20 }],
    };
    const open = { b: 0, e: 0, c: 0, c2: 0 };
    const STEPS = [
      { title: 'Il transistor mesa', text: 'Alla fine degli anni Cinquanta molti dei transistor migliori erano «a mesa», come gli altopiani del deserto americano: il cristallo veniva scavato tutto intorno alla zona attiva, che restava in rilievo.' },
      { title: 'Il punto debole: i fianchi', text: 'Sui fianchi dell\'altopiano le giunzioni tra le zone n e p restavano scoperte. Un granello di polvere o un velo di umidità bastavano a far passare corrente dove non doveva, e molti transistor si guastavano.' },
      { title: 'Un velo di ossido', text: 'Il [[Processo planare|processo planare]] di Jean Hoerni parte da una fetta di silicio piatta. In un forno intorno ai mille gradi la superficie si copre di un sottile strato di [[Ossido di silicio|ossido di silicio]]: in pratica, vetro.' },
      { title: 'Si apre una finestra', text: 'Con la [[Fotolitografia|fotolitografia]] si incide una finestra nell\'ossido, proprio dove servirà la base del transistor. Il resto della superficie resta coperto.' },
      { title: 'La base', text: 'Attraverso la finestra entrano nel silicio atomi di boro, che creano una zona di tipo p. Diffondendosi, la zona si allarga anche sotto i bordi dell\'ossido: la giunzione arriva in superficie già coperta e protetta.' },
      { title: 'L\'ossido si richiude', text: 'Un nuovo passaggio nel forno fa ricrescere l\'ossido, che richiude la finestra. Il silicio è di nuovo tutto coperto: niente bordi scoperti, niente polvere sulle giunzioni.' },
      { title: 'Emettitore e collettore', text: 'Due finestre più piccole lasciano entrare atomi di fosforo: nascono l\'emettitore di tipo n, dentro la base, e una zona per il contatto del collettore. Poi l\'ossido si richiude ancora.' },
      { title: 'I contatti di alluminio', text: 'Si aprono piccoli fori sopra base, emettitore e collettore e si stende un velo di alluminio, poi inciso a forma di piste. Il transistor è finito: piatto, protetto, collegato dall\'alto.' },
      { title: 'Due transistor, un solo pezzo di silicio', text: 'È l\'idea di Noyce: più componenti nella stessa fetta, ognuno nella sua isola di silicio n circondata, sotto e ai lati, da silicio di tipo p. Le giunzioni tra le due zone non lasciano passare corrente e separano i componenti (l\'[[Isolamento a giunzione|isolamento a giunzione]] di Lehovec), mentre piste di alluminio stese sopra l\'ossido li collegano. È un [[Circuito integrato|circuito integrato]] planare.' },
    ];

    const art = PL.svg('0 0 640 300', { class: 'pl-svg i3-art', role: 'img', 'aria-label': 'Sezione di un transistor: prima il vecchio transistor mesa con le giunzioni scoperte sui fianchi, poi le fasi del processo planare, fino a due transistor costruiti nello stesso pezzo di silicio e collegati da una pista di alluminio.' });
    const items = [];
    const at = (el, steps) => { el.classList.add('i3-x'); items.push([el, steps]); return el; };
    const lbl = (x, y, t, cls, anchor) => s('text', { class: 'i3-lbl' + (cls ? ' ' + cls : ''), x, y, 'text-anchor': anchor || 'middle' }, t);

    // il transistor mesa
    const mesa = at(s('g', { class: 'i3-mesa' }), [0, 1]);
    const dust = at(s('g', { class: 'i3-dust' }), [1]);
    [[228, 196, 0], [234, 205, 0.12], [243, 184, 0.3], [406, 199, 0.08], [412, 207, 0.22], [397, 184, 0.4], [237, 189, 0.5], [403, 191, 0.6]]
      .forEach(([x, y, d]) => dust.append(s('circle', { cx: x, cy: y, r: 2.7, style: { '--d': d + 's' } })));
    const leaks = at(s('g', { class: 'i3-leaks' }), [1]);
    leaks.append(s('path', { d: 'M232 179l7 5-6 4 7 5-5 5' }), s('path', { d: 'M408 179l-7 5 6 4-7 5 5 5' }));
    mesa.append(
      s('path', { class: 'i3-n', d: 'M20 340V210H230L250 160H390L410 210H620V340Z' }),
      s('path', { class: 'i3-p', d: 'M250 160H390L402 190H238Z' }),
      s('rect', { class: 'i3-nplus', x: 300, y: 160, width: 40, height: 10, rx: 2 }),
      s('rect', { class: 'i3-al', x: 306, y: 152, width: 28, height: 8, rx: 2 }),
      s('rect', { class: 'i3-al', x: 262, y: 152, width: 24, height: 8, rx: 2 }),
      lbl(320, 144, 'E', 'i3-pin'), lbl(274, 144, 'B', 'i3-pin'),
      lbl(362, 183, 'base p', 'is-dark'), lbl(320, 268, 'collettore n'),
      s('circle', { class: 'i3-edge', cx: 238, cy: 190, r: 5 }), s('circle', { class: 'i3-edge', cx: 402, cy: 190, r: 5 }),
      at(lbl(320, 236, 'giunzioni scoperte', 'is-warn'), [1]),
      dust, leaks);

    // il processo planare (il gruppo si allontana nell'ultima fase per mostrare due transistor)
    const plan = at(s('g', { class: 'i3-plan' }), [2, 3, 4, 5, 6, 7, 8]);
    const cupD = (x0, x1, y1) => `M${x0} ${SI}H${x1}V${y1 - 12}Q${x1} ${y1} ${x1 - 12} ${y1}H${x0 + 12}Q${x0} ${y1} ${x0} ${y1 - 12}Z`;
    const pad = (cx, w) => s('path', { class: 'i3-al', d: `M${cx - w / 2 - 5} 122H${cx + w / 2 + 5}V130H${cx + w / 2}V${SI}H${cx - w / 2}V130H${cx - w / 2 - 5}Z` });
    const oxPath = s('path', { class: 'i3-oxpath' });
    const rainB = s('g', { class: 'i3-rain is-b' });
    const rainP = s('g', { class: 'i3-rain is-ph' });
    const rr = rng(5);
    for (let i = 0; i < 16; i++) rainB.append(s('circle', { cx: n1(128 + rr() * 104), cy: n1(56 + rr() * 50), r: 2.6, style: { '--d': n1(rr() * 0.8) + 's' } }));
    for (let i = 0; i < 12; i++) {
      const x = i % 3 === 2 ? 273 + rr() * 14 : 159 + rr() * 28;
      rainP.append(s('circle', { cx: n1(x), cy: n1(56 + rr() * 50), r: 2.4, style: { '--d': n1(rr() * 0.8) + 's' } }));
    }
    const metal1 = at(s('g', { class: 'i3-metal' }), [7, 8]);
    WINS.c.forEach((wd) => metal1.append(pad(wd.cx, wd.w)));
    metal1.append(lbl(131, 114, 'B', 'i3-pin'), lbl(173, 114, 'E', 'i3-pin'), lbl(280, 114, 'C', 'i3-pin'));
    const t2 = at(s('g', { class: 'i3-t2' }), [8]);
    t2.append(
      s('path', { class: 'i3-p', d: cupD(390, 530, 196) }),
      s('path', { class: 'i3-nplus', d: cupD(430, 476, 170) }),
      s('rect', { class: 'i3-nplus', x: 548, y: SI, width: 24, height: 12, rx: 2 }),
      ...WINS.c2.map((wd) => pad(wd.cx, wd.w)),
      lbl(411, 114, 'B', 'i3-pin'), lbl(453, 114, 'E', 'i3-pin'), lbl(560, 114, 'C', 'i3-pin'));
    const litho = at(s('g', { class: 'i3-litho' }), [3]);
    litho.append(
      s('rect', { class: 'i3-mask', x: XL, y: 50, width: 90, height: 12 }),
      s('rect', { class: 'i3-mask', x: 240, y: 50, width: XR - 240, height: 12 }),
      ...[132, 151, 170, 189, 208, 227].map((x) => s('line', { class: 'i3-ray', x1: x, y1: 36, x2: x, y2: 112 })),
      lbl(250, 82, 'maschera', '', 'start'));
    plan.append(
      s('rect', { class: 'i3-n', x: XL, y: SI, width: XR - XL, height: 142 }),
      at(s('rect', { class: 'i3-p i3-grow-up', x: XL, y: 262, width: XR - XL, height: 28 }), [8]),
      ...[XL, 312, 592].map((x) => at(s('rect', { class: 'i3-p i3-grow-down', x, y: SI, width: 18, height: 114 }), [8])),
      at(s('path', { class: 'i3-p i3-grow-down', d: cupD(110, 250, 196) }), [4, 5, 6, 7, 8]),
      at(s('path', { class: 'i3-nplus i3-grow-down', d: cupD(150, 196, 170) }), [6, 7, 8]),
      at(s('rect', { class: 'i3-nplus i3-grow-down', x: 268, y: SI, width: 24, height: 12, rx: 2 }), [6, 7, 8]),
      t2,
      at(s('g', { class: 'i3-ox' }, oxPath), [2, 3, 4, 5, 6, 7, 8]),
      metal1,
      at(s('path', { class: 'i3-wire', d: 'M280 126H411', pathLength: 1 }), [8]),
      rainB, rainP, litho,
      at(lbl(360, 143, 'ossido', 'is-ox'), [2, 3, 4, 5, 6, 7, 8]),
      at(lbl(380, 226, 'silicio n'), [2, 3, 4, 5, 6, 7]),
      at(lbl(180, 126, 'finestra', 'is-hint'), [3]),
      at(lbl(225, 187, 'base p', 'is-dark'), [4, 5, 6, 7, 8]),
      at(lbl(200, 84, 'transistor 1'), [8]),
      at(lbl(460, 84, 'transistor 2'), [8]),
      at(lbl(345, 112, 'pista', 'is-al'), [8]),
      at(lbl(470, 282, 'substrato p', 'is-dark'), [8]),
      at(lbl(180, 236, 'isola n'), [8]),
      at(lbl(460, 236, 'isola n'), [8]));
    art.append(mesa, plan);

    function drawOx() {
      const gaps = [];
      for (const k in WINS) {
        if (open[k] <= 0.01) continue;
        for (const wd of WINS[k]) gaps.push([wd.cx - (wd.w / 2) * open[k], wd.cx + (wd.w / 2) * open[k]]);
      }
      gaps.sort((a, b) => a[0] - b[0]);
      let d = '';
      let x = XL;
      for (const [a, b] of gaps) {
        if (a > x) d += `M${n1(x)} ${SI - OXT}H${n1(a)}V${SI}H${n1(x)}Z`;
        x = Math.max(x, b);
      }
      if (x < XR) d += `M${n1(x)} ${SI - OXT}H${XR}V${SI}H${n1(x)}Z`;
      oxPath.setAttribute('d', d);
    }
    const tws = {};
    function setWin(k, v, delay) {
      if (tws[k]) tws[k].cancel();
      if (open[k] === v) return;
      tws[k] = PL.tween({ from: open[k], to: v, duration: 650, delay: delay || 0, ease: PL.motion.ease.inOut, onUpdate: (x) => { open[k] = x; drawOx(); } });
    }
    let timers = [];
    const later = (fn, ms) => timers.push(PL.timeout(fn, ms));
    function rain(el, ms, delay) {
      if (PL.reduced()) return;
      later(() => el.classList.add('is-on'), delay || 0);
      later(() => el.classList.remove('is-on'), (delay || 0) + ms);
    }
    function apply(i) {
      timers.forEach((t) => clearTimeout(t));
      timers = [];
      rainB.classList.remove('is-on');
      rainP.classList.remove('is-on');
      items.forEach(([el, steps]) => el.classList.toggle('is-on', steps.includes(i)));
      art.classList.toggle('is-wide', i === 8);
      setWin('b', i === 3 || i === 4 ? 1 : 0, i === 3 ? 550 : 0);
      setWin('c', i >= 7 ? 1 : 0, i === 7 ? 200 : 0);
      if (i === 6) {
        setWin('e', 1);
        rain(rainP, 1500, 300);
        later(() => setWin('e', 0), 2400);
      } else setWin('e', 0);
      if (i === 4) rain(rainB, 1700, 150);
      if (tws.c2) tws.c2.cancel();
      open.c2 = i === 8 ? 1 : 0;
      drawOx();
    }
    drawOx();
    const stepper = ui.stepper({ label: 'Fasi del processo', steps: STEPS, interval: 4800, onStep: (i) => apply(i) });

    return ui.lab({
      title: 'Mesa contro planare',
      intro: 'Due modi di costruire un transistor, visti in sezione. Segui le fasi una alla volta, o premi ▶ per vederle in sequenza.',
      stage: [art, stepper.el],
      caption: 'Sezioni schematiche, non in scala: in un transistor vero l\'ossido è spesso meno di un millesimo di millimetro. Colori: blu per il silicio di tipo n, rosa per il tipo p, azzurro chiaro per l\'ossido, grigio per l\'alluminio. Le fasi della fotolitografia sono raccontate nel capitolo 7.',
      class: 'i3-lab',
    });
  }

  /* ---------- figura: l'idea di Noyce ---------- */

  function figNoyce() {
    // il piano superiore è disegnato in coordinate (u, v) e proiettato in obliquo: v va verso il fondo
    const top = s('g', { transform: 'matrix(1 0 0.5 -0.6 60 250)' });
    const lines = [
      'M80 100V164H166V52H186',
      'M288 148H308V100H344',
      'M46 100V9H30',
      'M142 100V9H234',
      'M414 163V9H404',
    ];
    top.append(
      s('rect', { class: 'i0-p', x: 0, y: 0, width: 440, height: 200 }),
      s('rect', { class: 'i0-n', x: 16, y: 0, width: 140, height: 178 }),
      s('rect', { class: 'i0-n', x: 172, y: 0, width: 128, height: 178 }),
      s('rect', { class: 'i0-n', x: 316, y: 0, width: 108, height: 178 }),
      s('rect', { class: 'i0-p2', x: 36, y: 52, width: 92, height: 96, rx: 6 }),
      s('rect', { class: 'i0-n2', x: 60, y: 76, width: 40, height: 48, rx: 4 }),
      s('rect', { class: 'i0-n2', x: 136, y: 70, width: 12, height: 60, rx: 2 }),
      s('path', { class: 'i0-res', d: 'M186 52H288V76H186V100H288V124H186V148H288' }),
      s('rect', { class: 'i0-p2', x: 332, y: 48, width: 76, height: 104, rx: 6 }),
      s('rect', { class: 'i0-n2', x: 408, y: 156, width: 12, height: 14, rx: 2 }),
      s('rect', { class: 'i0-ox', x: 0, y: 0, width: 440, height: 200 }),
      s('rect', { class: 'i0-plate', x: 344, y: 62, width: 52, height: 76, rx: 3 }),
      ...[[22, 4], [226, 4], [396, 4]].map(([x, y]) => s('rect', { class: 'i0-pad', x, y, width: 16, height: 10, rx: 1.5 })),
      ...lines.map((d, k) => s('path', { class: 'i0-al', d, pathLength: 1, style: { '--k': k } })),
      ...[[80, 100], [186, 52], [288, 148], [46, 100], [142, 100], [414, 163]].map(([x, y]) => s('rect', { class: 'i0-ct', x: x - 4, y: y - 4, width: 8, height: 8 })));
    // sezione sul lato anteriore: isole n separate da pareti p, sopra il substrato p
    const front = s('g', null,
      s('rect', { class: 'i0-p is-side', x: 60, y: 250, width: 440, height: 56 }),
      ...[[76, 140], [232, 128], [376, 108]].map(([x, w]) => s('rect', { class: 'i0-n is-side', x, y: 250, width: w, height: 24 })),
      s('rect', { class: 'i0-oxedge', x: 60, y: 247, width: 440, height: 3 }),
      s('path', { class: 'i0-p is-dark', d: 'M500 250L600 130V186L500 306Z' }),
      ...[[146, 'n'], [296, 'n'], [430, 'n']].map(([x, t]) => s('text', { class: 'i0-in', x, y: 267, 'text-anchor': 'middle' }, t)),
      ...[[68, 'p'], [224, 'p'], [368, 'p'], [492, 'p']].map(([x, t]) => s('text', { class: 'i0-in is-p', x, y: 267, 'text-anchor': 'middle' }, t)),
      s('text', { class: 'i0-in is-p', x: 280, y: 296, 'text-anchor': 'middle' }, 'substrato p'));
    const leader = (x1, y1, x2, y2) => s('g', { class: 'i0-lead' }, s('line', { x1, y1, x2, y2 }), s('circle', { cx: x2, cy: y2, r: 2.6 }));
    const labels = s('g', { class: 'i0-labels' },
      // etichette su due file e su due righe: restano separate anche quando sul telefono il testo si ingrandisce
      s('text', { class: 'i0-t', x: 196, y: 18, 'text-anchor': 'middle' }, 'transistor'), leader(196, 26, 196, 180),
      s('text', { class: 'i0-t', x: 346, y: 42, 'text-anchor': 'middle' }, 'resistenza'), leader(346, 50, 346, 182),
      s('text', { class: 'i0-t', x: 480, y: 18, 'text-anchor': 'middle' }, 'condensatore'), leader(480, 26, 480, 186),
      s('text', { class: 'i0-t is-al', x: 8, y: 126 }, s('tspan', { x: 8 }, 'piste di'), s('tspan', { x: 8, dy: '1.2em' }, 'alluminio')), leader(40, 158, 136, 212),
      s('text', { class: 'i0-t', x: 634, y: 58, 'text-anchor': 'end' }, s('tspan', { x: 634 }, 'ossido'), s('tspan', { x: 634, dy: '1.2em' }, 'trasparente')), leader(604, 94, 590, 140),
      s('text', { class: 'i0-t is-small', x: 280, y: 326, 'text-anchor': 'middle' }, 'in sezione: isole di silicio n separate da pareti p'));
    const art = PL.svg('0 0 640 332', { class: 'pl-svg i0-art', role: 'img', 'aria-label': 'Disegno in prospettiva di un pezzo di silicio con un transistor, una resistenza a serpentina e un condensatore affiancati, ognuno nella sua isola. Sopra, sotto uno strato trasparente di ossido, piste di alluminio collegano i componenti tra loro e con le piazzole sul bordo. Sul lato anteriore, in sezione, le isole di tipo n separate da pareti di tipo p.' },
      front, top, labels);
    const fig = ui.figure({ art, class: 'i0-fig', caption: 'L\'idea di Noyce in un disegno (schematico, non in scala). Transistor, resistenza e condensatore sono costruiti fianco a fianco nello stesso pezzo di silicio, ognuno nella sua isola di tipo n separata dalle altre da pareti di tipo p. I collegamenti non sono più fili saldati a mano ma piste di alluminio stese sopra l\'ossido, tutte insieme.' });
    if (PL.reduced()) fig.classList.add('is-in');
    else PL.onVisible(fig, () => fig.classList.add('is-in'), { threshold: 0.35 });
    return fig;
  }

  /* ---------- laboratorio: l'albero della Fairchild ---------- */

  function labFamily() {
    const ROW = 54;
    const GW = 88; // larghezza del grafo a sinistra delle righe
    const LANES = [14, 34, 54, 74];
    const NODES = [
      { id: 'shockley', name: 'Shockley Semiconductor', year: 1956, lane: 0, who: 'William Shockley', n: 0,
        text: 'Fondata nel 1956 a Mountain View da William Shockley, uno degli inventori del transistor, come parte della Beckman Instruments. Shockley assunse alcuni dei giovani scienziati più brillanti del Paese, ma il suo modo di dirigerli li allontanò presto.' },
      { id: 'fairchild', name: 'Fairchild Semiconductor', year: 1957, lane: 1, from: 'shockley', who: 'gli «otto traditori»', n: 8,
        text: 'Julius Blank, Victor Grinich, Jean Hoerni, Eugene Kleiner, Jay Last, Gordon Moore, Robert Noyce e Sheldon Roberts si dimisero il 18 settembre 1957 e trovarono i soldi presso la Fairchild Camera and Instrument. Qui nacquero il processo planare e i primi circuiti integrati in silicio.' },
      { id: 'rheem', name: 'Rheem Semiconductor', year: 1959, lane: 2, from: 'fairchild', who: 'Ed Baldwin', n: 1,
        text: 'La prima azienda nata da un uomo della Fairchild: Ed Baldwin se ne andò nel marzo 1959 con una decina di colleghi, con i soldi della Rheem Manufacturing. La Fairchild lo accusò di essersi portato via i suoi segreti di fabbricazione.' },
      { id: 'amelco', name: 'Amelco', year: 1961, lane: 2, from: 'fairchild', who: 'Hoerni, Last, Roberts', n: 3,
        text: 'Nel 1961 Jean Hoerni, Jay Last e Sheldon Roberts, tre degli otto fondatori della Fairchild, crearono questa azienda per costruire circuiti integrati per la Teledyne, che lavorava per l\'industria militare e aerospaziale.' },
      { id: 'signetics', name: 'Signetics', year: 1961, lane: 2, from: 'fairchild', who: 'Allison, James, Kattner, Weissenstern', n: 4,
        text: 'Fondata nel 1961 da quattro ingegneri della Fairchild, David Allison, David James, Lionel Kattner e Mark Weissenstern, per fare soltanto circuiti integrati, mentre la Fairchild puntava ancora soprattutto sui transistor. Nel 1962 presentò la prima famiglia di chip logici DTL.' },
      { id: 'gme', name: 'General Microelectronics', year: 1963, lane: 2, from: 'fairchild', who: 'Bobb, Ferguson, Norman', n: 3,
        text: 'Fondata nell\'estate del 1963 da Howard Bobb, James Ferguson e Robert Norman, venuti dalla Fairchild. Fu la prima azienda a progettare e vendere circuiti integrati MOS: il primo, nel 1964, era un registro con 120 transistor.' },
      { id: 'intersil', name: 'Intersil', year: 1967, lane: 3, from: 'amelco', who: 'Jean Hoerni', n: 1,
        text: 'Nel 1967 Jean Hoerni, dopo Amelco e un periodo alla Union Carbide, fondò un\'altra azienda con soci soprattutto europei. Intersil costruì chip a bassissimo consumo per orologi e calcolatrici.' },
      { id: 'intel', name: 'Intel', year: 1968, lane: 2, from: 'fairchild', who: 'Robert Noyce e Gordon Moore', n: 2,
        text: 'Il 18 luglio 1968 Noyce e Moore fondarono la NM Electronics, presto ribattezzata Intel, da «integrated electronics». Nel 1970 mise in vendita la prima memoria DRAM, nel 1971 il primo microprocessore.' },
      { id: 'amd', name: 'AMD', year: 1969, lane: 2, from: 'fairchild', who: 'Jerry Sanders e sette colleghi', n: 8,
        text: 'Il 1° maggio 1969 Jerry Sanders, dirigente commerciale della Fairchild, e sette colleghi fondarono la Advanced Micro Devices, destinata a diventare la grande rivale di Intel nei microprocessori.' },
    ];
    const NOTES = {
      1956: 'William Shockley apre il suo laboratorio a Mountain View, in California. Lo stesso anno riceve il premio Nobel per il transistor.',
      1957: 'In settembre otto giovani ricercatori lasciano Shockley e fondano la Fairchild Semiconductor.',
      1958: 'A Dallas, alla Texas Instruments, Jack Kilby fa funzionare il primo circuito integrato.',
      1959: 'Alla Fairchild Hoerni inventa il processo planare e Noyce il chip monolitico. Nasce la prima azienda figlia, la Rheem.',
      1960: 'Il gruppo di Jay Last fa funzionare il primo circuito integrato planare.',
      1961: 'Arrivano in vendita i primi circuiti integrati. Nascono Amelco e Signetics.',
      1962: 'La Texas Instruments ottiene il contratto per i circuiti integrati del missile Minuteman II.',
      1963: 'Il programma Apollo compra circa il 60% dei circuiti integrati prodotti negli Stati Uniti. Nasce la General Microelectronics.',
      1964: 'La General Microelectronics mette in vendita il primo circuito integrato MOS.',
      1965: 'Gordon Moore, direttore della ricerca alla Fairchild, prevede che i componenti di un chip raddoppieranno ogni anno.',
      1966: 'Texas Instruments e Fairchild si accordano: ognuna potrà usare i brevetti dell\'altra sul circuito integrato.',
      1967: 'Jean Hoerni fonda Intersil.',
      1968: 'Robert Noyce e Gordon Moore lasciano la Fairchild e fondano Intel.',
      1969: 'Jerry Sanders e sette colleghi della Fairchild fondano AMD.',
      1970: 'Intel mette in vendita la 1103, la prima memoria DRAM in commercio.',
      1971: 'Il settimanale Electronic News chiama la zona «Silicon Valley». Intel presenta il primo microprocessore.',
    };
    const byId = {};
    NODES.forEach((nd, i) => { nd.i = i; byId[nd.id] = nd; });
    const yOf = (i) => i * ROW + ROW / 2;
    const H = NODES.length * ROW;
    const st = { year: 1971, sel: 'fairchild' };

    const graph = s('svg', { class: 'i4-graph', viewBox: `0 0 ${GW} ${H}`, width: GW, height: H, 'aria-hidden': 'true' });
    const lastKid = NODES.filter((nd) => nd.from === 'fairchild').pop();
    const trunkEnd = yOf(lastKid.i) - ROW * 0.8;
    const trunk = s('path', { class: 'i4-trunk', d: `M${LANES[1]} ${yOf(1)}V${trunkEnd}`, pathLength: 1 });
    graph.append(trunk);
    const walkers = s('g', { class: 'i4-walkers' });
    NODES.forEach((nd) => {
      const x = LANES[nd.lane];
      const y = yOf(nd.i);
      if (nd.from) {
        const p = byId[nd.from];
        const px = LANES[p.lane];
        const py = yOf(p.i);
        let d;
        if (nd.from === 'shockley') d = `M${px} ${py}C${px} ${py + ROW * 0.55} ${x} ${y - ROW * 0.55} ${x} ${y}`;
        else if (nd.from === 'fairchild') d = `M${px} ${y - ROW * 0.8}C${px} ${y - ROW * 0.3} ${x} ${y - ROW * 0.5} ${x} ${y}`;
        else d = `M${px} ${py}C${px} ${py + ROW * 0.5} ${x} ${py + ROW * 0.45} ${x} ${py + ROW}V${y}`;
        nd.edge = s('path', { class: 'i4-edge', d, pathLength: 1 });
        graph.append(nd.edge);
      }
      nd.dot = s('circle', { class: 'i4-dot' + (nd.id === 'fairchild' ? ' is-big' : ''), cx: x, cy: y, r: nd.id === 'fairchild' ? 8.5 : 6.5 });
    });
    graph.append(...NODES.map((nd) => nd.dot), walkers);

    const list = h('ol', { class: 'i4-list' }, NODES.map((nd) => {
      nd.btn = h('button', { type: 'button', class: 'i4-row', onclick: () => select(nd.id) },
        h('span', { class: 'i4-year pl-mono' }, String(nd.year)),
        h('span', { class: 'i4-name' }, nd.name),
        h('span', { class: 'i4-who' }, nd.who));
      nd.li = h('li', { class: 'i4-li' }, nd.btn);
      return nd.li;
    }));
    const tree = h('div', { class: 'i4-tree' }, graph, list);

    const yearEl = h('span', { class: 'i4-bigyear pl-mono' });
    const dName = h('h4', { class: 'i4-dname' });
    const dMeta = h('p', { class: 'i4-dmeta' });
    const dText = h('p', { class: 'i4-dtext' });
    const side = h('div', { class: 'i4-side' },
      h('div', { class: 'i4-yearbox' }, h('span', { class: 'i4-kick' }, 'anno'), yearEl),
      h('div', { class: 'pl-lab-panel i4-details' }, dName, dMeta, dText));
    const readout = h('p');

    function walk(nd) {
      if (!nd.edge || !nd.n || PL.reduced()) return;
      let len = 0;
      try { len = nd.edge.getTotalLength(); } catch (e) { len = 0; }
      if (!len) return;
      for (let k = 0; k < nd.n; k++) {
        const c = s('circle', { class: 'i4-walker', r: 2.6, cx: -20, cy: -20 });
        walkers.append(c);
        PL.tween({
          from: 0, to: 1, duration: 900, delay: k * 110, ease: PL.motion.ease.inOut,
          onUpdate: (v) => {
            const pt = nd.edge.getPointAtLength(len * v);
            c.setAttribute('cx', n1(pt.x));
            c.setAttribute('cy', n1(pt.y));
          },
          onDone: () => c.remove(),
        });
      }
    }
    function select(id) {
      st.sel = id;
      const nd = byId[id];
      NODES.forEach((x) => {
        const on = x.id === id;
        x.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        x.dot.classList.toggle('is-sel', on);
      });
      dName.textContent = nd.name;
      dMeta.textContent = nd.year + ' · ' + nd.who;
      dText.textContent = nd.text;
    }
    function setYear(y, animate) {
      const prev = st.year;
      st.year = y;
      let latest = null;
      NODES.forEach((nd) => {
        const vis = nd.year <= y;
        nd.li.classList.toggle('is-in', vis);
        nd.btn.disabled = !vis;
        nd.dot.classList.toggle('is-in', vis);
        if (nd.edge) nd.edge.classList.toggle('is-in', vis);
        if (vis) latest = nd;
        if (vis && nd.year > prev && animate !== false) walk(nd);
      });
      const kids = NODES.filter((nd) => nd.from === 'fairchild' && nd.year <= y);
      const reach = kids.length ? (yOf(kids[kids.length - 1].i) - ROW * 0.8 - yOf(1)) / (trunkEnd - yOf(1)) : 0;
      trunk.style.strokeDashoffset = String(1 - (y >= 1957 ? reach : 0));
      trunk.classList.toggle('is-in', y >= 1957);
      yearEl.textContent = String(y);
      readout.textContent = y + ': ' + NOTES[y];
      if (byId[st.sel].year > y || (animate !== false && latest && latest.year === y && latest.year > prev)) select(latest.id);
    }

    let playing = false;
    let timer = 0;
    const playBtn = ui.btn({ label: 'Fai crescere l\'albero', icon: '▶', kind: 'lab', onClick: () => (playing ? pause() : play()) });
    const sl = ui.slider({ label: 'Anno', min: 1956, max: 1971, step: 1, value: st.year, format: (v) => String(v), onInput: (v) => { pause(); setYear(v); } });
    function pause() {
      playing = false;
      clearTimeout(timer);
      playBtn.firstChild.textContent = '▶';
      playBtn.lastChild.textContent = 'Fai crescere l\'albero';
      playBtn.setAttribute('aria-pressed', 'false');
    }
    function tick() {
      if (st.year >= 1971) { pause(); return; }
      sl.set(st.year + 1, true);
      setYear(st.year + 1);
      timer = PL.timeout(tick, 1100);
    }
    function play() {
      playing = true;
      playBtn.firstChild.textContent = '❚❚';
      playBtn.lastChild.textContent = 'Pausa';
      playBtn.setAttribute('aria-pressed', 'true');
      if (st.year >= 1971) { sl.set(1956, true); setYear(1956, false); }
      timer = PL.timeout(tick, 900);
    }
    select(st.sel);
    setYear(st.year, false);
    // la prima volta che il banco è sullo schermo, l'albero cresce da solo dal 1956
    if (!PL.reduced()) {
      PL.onVisible(tree, () => { if (!playing && st.year === 1971) { sl.set(1956, true); setYear(1956, false); play(); } }, { threshold: 0.35 });
    }

    return ui.lab({
      title: 'L\'albero della Fairchild',
      intro: 'Dalla Fairchild uscirono gli ingegneri che fondarono molte delle aziende di chip più importanti. Sposta l\'anno o premi ▶ per veder crescere l\'albero; tocca un\'azienda per leggerne la storia.',
      controls: [playBtn, sl.el],
      stage: h('div', { class: 'i4-grid' }, tree, side),
      readout,
      caption: 'Sono indicate solo alcune delle aziende nate dalla Fairchild, con l\'anno di fondazione. I puntini che scorrono lungo i rami sono le persone che se ne andarono per fondarle.',
      class: 'i4-lab',
    });
  }

  /* ---------- laboratorio: da SSI a VLSI ---------- */

  function labScale() {
    const LEVELS = [
      { id: 'ssi', name: 'SSI', full: 'small-scale integration', range: 'fino a circa 10 porte', from: 0, to: 1, era: 'dai primi anni Sessanta', chip: '7400 · Texas Instruments · 1966', fact: 'quattro porte NAND in un contenitore da 14 piedini', pads: 14,
        say: '<strong>SSI</strong>: fino a una decina di porte per chip. Ogni chip è una piccola scatola di mattoncini, come le quattro NAND del 7400, e per costruire un calcolatore ne servono migliaia, collegati sulle schede.' },
      { id: 'msi', name: 'MSI', full: 'medium-scale integration', range: 'da 10 a circa 100 porte', from: 1, to: 2, era: 'dalla seconda metà degli anni Sessanta', chip: '74181 · Texas Instruments · 1970', fact: 'un\'intera ALU a 4 bit, l\'equivalente di circa 75 porte', pads: 24,
        say: '<strong>MSI</strong>: da 10 a circa 100 porte. Un chip non contiene più porte sciolte ma una funzione intera: un contatore, un decodificatore, o l\'intera [[ALU]] a 4 bit del 74181.' },
      { id: 'lsi', name: 'LSI', full: 'large-scale integration', range: 'da 100 a circa 10.000 porte', from: 2, to: 4, era: 'dal 1970', chip: '1103 · Intel · 1970', fact: 'una memoria da 1.024 bit, in file e colonne ordinate', pads: 18,
        say: '<strong>LSI</strong>: centinaia e migliaia di porte. Nel 1970 la memoria Intel 1103 conteneva 1.024 bit; nel 1971 il microprocessore Intel 4004 metteva in un solo chip, con 2.300 transistor, il cuore di un calcolatore.' },
      { id: 'vlsi', name: 'VLSI', full: 'very-large-scale integration', range: 'oltre 10.000 porte', from: 4, to: 10, era: 'dalla fine degli anni Settanta', chip: 'Un processore di oggi', fact: 'decine di miliardi di transistor in pochi centimetri quadrati', pads: 56,
        say: '<strong>VLSI</strong>: oltre 10.000 porte, poi milioni e miliardi. Su un solo chip ci sono più processori, la memoria cache, la grafica: un intero sistema. La crescita la racconta il capitolo 9.' },
    ];
    const st = { level: 0 };
    const pid = PL.uid('i5');
    const art = PL.svg('0 0 320 320', { class: 'pl-svg i5-art', role: 'img', 'aria-label': 'Un chip visto dall\'alto, sempre della stessa grandezza: a ogni livello di integrazione si riempie di porte sempre più piccole e più numerose.' });
    art.append(s('defs', null,
      s('pattern', { id: pid + '-cell', width: 5, height: 5, patternUnits: 'userSpaceOnUse' }, s('rect', { class: 'i5-pc', x: 0.9, y: 0.9, width: 3.2, height: 3.2, rx: 0.6 })),
      s('pattern', { id: pid + '-fine', width: 2.4, height: 2.4, patternUnits: 'userSpaceOnUse' }, s('rect', { class: 'i5-pf', x: 0.35, y: 0.35, width: 1.6, height: 1.6 })),
      s('pattern', { id: pid + '-dots', width: 3, height: 3, patternUnits: 'userSpaceOnUse' }, s('circle', { class: 'i5-pd', cx: 1.5, cy: 1.5, r: 0.8 })),
      s('pattern', { id: pid + '-lines', width: 4, height: 2.2, patternUnits: 'userSpaceOnUse' }, s('rect', { class: 'i5-pl', x: 0, y: 0, width: 4, height: 1 })),
      s('pattern', { id: pid + '-logic', width: 6, height: 5, patternUnits: 'userSpaceOnUse' }, s('path', { class: 'i5-pg', d: 'M.8 .8H2.6A1.7 1.7 0 0 1 2.6 4.2H.8Z' }))));
    const D0 = 52;
    const D1 = 268;
    function pads(n) {
      const g = s('g', { class: 'i5-pads' });
      const sz = n > 30 ? 5 : 9;
      // le piazzole divise il più possibile alla pari sui quattro lati (14 → 3, 4, 3, 4)
      for (let side = 0; side < 4; side++) {
        const cnt = Math.floor(((side + 1) * n) / 4) - Math.floor((side * n) / 4);
        for (let j = 0; j < cnt; j++) {
          const a = D0 + 14 + ((j + 0.5) / cnt) * (D1 - D0 - 28);
          const pos = [[a, D0 + 3], [D1 - 3, a], [D1 + D0 - a, D1 - 3], [D0 + 3, D1 + D0 - a]][side];
          const out = [[pos[0], 14], [306, pos[1]], [pos[0], 306], [14, pos[1]]][side];
          g.append(s('line', { class: 'i5-bond', x1: n1(pos[0]), y1: n1(pos[1]), x2: n1(out[0]), y2: n1(out[1]) }),
            s('rect', { class: 'i5-padsq', x: n1(pos[0] - sz / 2), y: n1(pos[1] - sz / 2), width: sz, height: sz, rx: 1 }));
        }
      }
      return g;
    }
    // SSI: quattro porte NAND, come nel 7400
    const l0 = s('g', { class: 'i5-layer' }, pads(14),
      s('line', { class: 'i5-rail', x1: 70, y1: 78, x2: 250, y2: 78 }), s('line', { class: 'i5-rail', x1: 70, y1: 242, x2: 250, y2: 242 }));
    [[82, 104], [174, 104], [82, 182], [174, 182]].forEach(([x, y]) => {
      const gt = draw.gate('NAND', { x, y, w: 50 });
      l0.append(
        s('path', { class: 'i5-wire', d: `M${x - 12} ${n1(gt.inputs[0].y)}H${x}M${x - 12} ${n1(gt.inputs[1].y)}H${x}M${gt.output.x} ${n1(gt.output.y)}H${gt.output.x + 12}` }),
        gt.g);
    });
    // MSI: decine di piccole porte in file, con i canali per i fili
    const l1 = s('g', { class: 'i5-layer' }, pads(24));
    const glyph = (x, y, k) => (k === 0
      ? `M${x} ${y}h6a5 5 0 0 1 0 10h-6z`
      : k === 1 ? `M${x} ${y}c5 0 9 2 11 5c-2 3-6 5-11 5c2-3 2-7 0-10z` : `M${x} ${y}l9 5l-9 5z`);
    const mr = rng(11);
    for (let r = 0; r < 9; r++) {
      l1.append(s('line', { class: 'i5-chan', x1: 68, y1: 82 + r * 21, x2: 252, y2: 82 + r * 21 }));
      for (let c = 0; c < 9; c++) l1.append(s('path', { class: 'i5-glyph', d: glyph(70 + c * 20.5, 66 + r * 21, Math.floor(mr() * 3)) }));
    }
    // LSI: la matrice di memoria della 1103, 32 × 32 celle
    const l2 = s('g', { class: 'i5-layer' }, pads(18),
      s('rect', { class: 'i5-blk', x: 96, y: 70, width: 160, height: 160, fill: `url(#${pid}-cell)` }),
      s('rect', { class: 'i5-blk', x: 66, y: 70, width: 24, height: 160, fill: `url(#${pid}-logic)` }),
      s('rect', { class: 'i5-blk', x: 96, y: 236, width: 160, height: 18, fill: `url(#${pid}-lines)` }),
      s('rect', { class: 'i5-blk', x: 66, y: 236, width: 24, height: 18, fill: `url(#${pid}-fine)` }));
    // VLSI: blocchi interi (processori, cache, grafica, ingressi e uscite)
    const l3 = s('g', { class: 'i5-layer' }, pads(56),
      ...[66, 128, 190].map((x) => s('rect', { class: 'i5-blk is-core', x, y: 66, width: 58, height: 60, fill: `url(#${pid}-dots)` })),
      s('rect', { class: 'i5-blk is-cache', x: 66, y: 130, width: 182, height: 56, fill: `url(#${pid}-fine)` }),
      s('rect', { class: 'i5-blk is-gpu', x: 66, y: 190, width: 118, height: 60, fill: `url(#${pid}-logic)` }),
      s('rect', { class: 'i5-blk is-io', x: 188, y: 190, width: 60, height: 60, fill: `url(#${pid}-lines)` }));
    const layers = [l0, l1, l2, l3];
    art.append(
      s('rect', { class: 'i5-cavity', x: 8, y: 8, width: 304, height: 304, rx: 14 }),
      s('rect', { class: 'i5-die', x: D0, y: D0, width: D1 - D0, height: D1 - D0, rx: 4 }),
      ...layers);

    // pannello: livello, esempio e scala logaritmica delle porte per chip
    const nameEl = h('span', { class: 'i5-name pl-mono' });
    const fullEl = h('span', { class: 'i5-full' });
    const rangeEl = h('p', { class: 'i5-range' });
    const eraEl = h('p', { class: 'i5-era' });
    const chipEl = h('p', { class: 'i5-chip' });
    const factEl = h('p', { class: 'i5-fact' });
    const mark = h('span', { class: 'i5-mark' });
    const TICKS = [[0, '1'], [1, '10'], [2, '100'], [3, '1.000'], [4, '10.000'], [6, '1 milione'], [9, '1 miliardo']];
    const bar = h('div', { class: 'i5-bar', 'aria-hidden': 'true' },
      h('div', { class: 'i5-track' }, LEVELS.map((L) => h('span', { class: 'i5-seg is-' + L.id, style: { left: L.from * 10 + '%', width: (L.to - L.from) * 10 + '%' } }, L.name)), mark),
      h('div', { class: 'i5-ticks' }, TICKS.map(([e, t]) => h('span', { class: e === 6 || e === 3 ? 'is-minor' : '', style: { left: e * 10 + '%' } }, t))));
    const panel = h('div', { class: 'pl-lab-panel i5-panel' },
      h('p', { class: 'i5-head' }, nameEl, fullEl), rangeEl, eraEl,
      h('div', { class: 'i5-example' }, h('span', { class: 'i5-kick' }, 'esempio'), chipEl, factEl),
      h('h4', null, 'porte per chip, scala logaritmica'), bar);
    const readout = h('p');

    function show(i) {
      st.level = i;
      const L = LEVELS[i];
      layers.forEach((g, k) => {
        g.classList.toggle('is-past', k < i);
        g.classList.toggle('is-current', k === i);
        g.classList.toggle('is-future', k > i);
      });
      nameEl.textContent = L.name;
      fullEl.textContent = L.full;
      rangeEl.textContent = L.range;
      eraEl.textContent = L.era;
      chipEl.textContent = L.chip;
      factEl.textContent = L.fact;
      mark.style.left = L.from * 10 + '%';
      mark.style.width = (L.to - L.from) * 10 + '%';
      panel.dataset.level = L.id;
      readout.replaceChildren(PL.rich(L.say));
    }
    const seg = ui.segmented({ label: 'Livello di integrazione', value: 0, options: LEVELS.map((L, i) => ({ value: i, label: L.name, title: L.full })), onChange: (v) => { pause(); show(+v); } });
    let playing = false;
    let timer = 0;
    const playBtn = ui.btn({ label: 'Guarda la crescita', icon: '▶', kind: 'lab', onClick: () => (playing ? pause() : play()) });
    function pause() {
      playing = false;
      clearTimeout(timer);
      playBtn.firstChild.textContent = '▶';
      playBtn.setAttribute('aria-pressed', 'false');
    }
    function play() {
      playing = true;
      playBtn.firstChild.textContent = '❚❚';
      playBtn.setAttribute('aria-pressed', 'true');
      let i = st.level >= LEVELS.length - 1 ? -1 : st.level;
      const next = () => {
        i += 1;
        seg.set(i, true);
        show(i);
        if (i < LEVELS.length - 1) timer = PL.timeout(next, 2600);
        else pause();
      };
      if (i < 0) next();
      else timer = PL.timeout(next, 600);
    }
    show(0);

    return ui.lab({
      title: 'Da SSI a VLSI',
      intro: 'Lo stesso pezzo di silicio, con sempre più porte dentro. Scegli un livello di integrazione, o guarda la crescita dall\'inizio: il disegno si allontana a ogni salto, perché quello che prima era un chip intero diventa un dettaglio.',
      controls: [seg.el, playBtn],
      stage: h('div', { class: 'pl-lab-grid i5-grid' }, art, panel),
      readout,
      caption: 'Disegni stilizzati, non in scala: un chip VLSI vero ha porte milioni di volte più piccole di quelle disegnate qui. Le soglie tra i livelli cambiano da un testo all\'altro; qui si usano le più comuni.',
      class: 'i5-lab',
    });
  }

  /* ---------- capitolo ---------- */

  PL.chapter({
    id: 'integrato',
    num: 6,
    title: 'Nasce il circuito integrato',
    short: 'Integrato',
    era: '1952 – 1971',
    minutes: 22,
    labs: 5,
    kicker: 'Migliaia di componenti saldati a mano voleva dire migliaia di occasioni di guasto. La soluzione fu costruire tutto il circuito, transistor, resistenze e collegamenti, in un solo pezzo di semiconduttore.',
    summary: 'La tirannia dei numeri, il chip di germanio di Kilby, il silicio planare di Hoerni e Noyce, la Fairchild e la nascita della Silicon Valley, da poche porte per chip a migliaia.',
    timeline: [
      { year: 1949, title: 'Cinque transistor su un supporto', text: 'Werner Jacobi, della Siemens, brevetta un amplificatore con cinque transistor su un unico supporto comune. Non verrà mai prodotto.' },
      { year: 1952, title: 'Il «blocco solido» di Dummer', text: 'A un convegno a Washington l\'inglese Geoffrey Dummer immagina apparecchi elettronici fatti come un blocco solido, senza fili di collegamento.' },
      { year: 1957, title: 'Nasce la Fairchild Semiconductor', text: 'Otto giovani ricercatori lasciano il laboratorio di William Shockley e fondano la propria azienda in California.' },
      { year: 1958, title: 'Il primo circuito integrato', text: 'Il 12 settembre, alla Texas Instruments, Jack Kilby fa funzionare un oscillatore costruito in una sola barretta di germanio.', key: true },
      { year: 1959, title: 'Il processo planare e il chip monolitico', text: 'Alla Fairchild Jean Hoerni brevetta il processo planare e Robert Noyce l\'idea di collegare i componenti con piste di metallo stese sull\'ossido.', key: true },
      { year: 1960, title: 'Il primo circuito integrato planare', text: 'Il 26 maggio il gruppo di Jay Last, alla Fairchild, fa funzionare un flip-flop costruito in un solo pezzo di silicio.' },
      { year: 1961, title: 'I primi chip in vendita', text: 'La Fairchild mette in vendita la famiglia Micrologic; la Texas Instruments la sua serie 51.' },
      { year: 1968, title: 'Nasce Intel', text: 'Robert Noyce e Gordon Moore lasciano la Fairchild e fondano una nuova azienda: Intel.' },
      { year: 1971, title: 'La «Silicon Valley»', text: 'Il giornalista Don Hoefler fa conoscere il nome della valle dei semiconduttori con una serie di articoli sul settimanale Electronic News.' },
      { year: 2000, title: 'Il Nobel a Kilby', text: 'Jack Kilby riceve metà del premio Nobel per la fisica per il suo contributo all\'invenzione del circuito integrato.' },
    ],
    glossary: [
      { term: 'Circuito integrato', def: 'Circuito elettronico completo, con transistor, resistenze, condensatori e collegamenti, costruito in un solo pezzo di semiconduttore. Il primo funzionò nel 1958; quello planare in silicio, antenato di tutti i chip di oggi, nel 1960.' },
      { term: 'Tirannia dei numeri', def: 'Il problema dei circuiti a componenti separati degli anni Cinquanta: più componenti volevano dire più saldature e più fili, quindi più guasti, più peso e più costi. Il nome lo usò Jack Morton, dei Bell Labs.' },
      { term: 'Monolitico', def: 'Fatto di un solo blocco. Un circuito integrato monolitico ha tutti i componenti nello stesso pezzo di silicio, invece che su pezzi separati collegati tra loro.' },
      { term: 'Processo planare', def: 'Metodo di fabbricazione inventato da Jean Hoerni alla Fairchild tra il 1957 e il 1959: i componenti si costruiscono dentro una fetta di silicio piatta, aprendo finestre in uno strato di ossido che poi resta a proteggerli.' },
      { term: 'Isolamento a giunzione', def: 'Tecnica ideata da Kurt Lehovec nel 1959 per separare i componenti costruiti nello stesso cristallo: ognuno sta in un\'isola circondata da giunzioni p-n tenute in modo da non condurre corrente.' },
      { term: 'Interconnessione', def: 'Collegamento elettrico tra i componenti di un chip. Nei circuiti integrati planari sono piste di metallo stese sopra l\'ossido, fatte tutte insieme invece che saldate a mano.' },
      { term: 'Die', def: 'Il piccolo rettangolo di silicio che contiene un circuito integrato, ritagliato da una fetta su cui ne vengono costruiti molti insieme. È il chip vero e proprio, prima di essere chiuso nel suo contenitore.' },
      { term: 'SSI', def: 'Small-scale integration, integrazione su piccola scala: chip con al massimo una decina di porte logiche, come il 7400 con le sue quattro NAND. È il livello dei primi anni Sessanta.' },
      { term: 'MSI', def: 'Medium-scale integration, integrazione su media scala: chip con decine di porte, fino a circa cento, capaci di svolgere una funzione intera come un contatore o un\'unità aritmetica a 4 bit.' },
      { term: 'LSI', def: 'Large-scale integration, integrazione su larga scala: chip con centinaia o migliaia di porte, come le prime memorie e i primi microprocessori dei primi anni Settanta.' },
      { term: 'VLSI', def: 'Very-large-scale integration, integrazione su larghissima scala: chip con decine di migliaia di porte o più. Dalla fine degli anni Settanta è la norma; oggi un chip può contenere decine di miliardi di transistor.' },
      { term: 'Silicon Valley', def: 'La zona a sud della baia di San Francisco, in California, dove nacquero la Fairchild e molte aziende di semiconduttori. Il nome si diffuse dal 1971, grazie agli articoli del giornalista Don Hoefler.' },
      { term: 'Ossido di silicio', def: 'Il biossido di silicio (SiO<sub>2</sub>), lo stesso materiale del quarzo e del vetro. Cresciuto sulla superficie di una fetta di silicio, la protegge, la isola e fa da mascherina per costruire i componenti.' },
      { term: 'Transistor mesa', def: 'Tipo di transistor degli anni Cinquanta a forma di altopiano, ottenuto scavando il cristallo intorno alla zona attiva. Le giunzioni restavano scoperte sui fianchi, esposte a sporco e umidità.' },
    ],
    render(root) {
      root.append(
        ui.section({ id: 'tirannia', title: 'La tirannia dei numeri', kicker: '1946 – 1958', lead: 'Alla fine degli anni Cinquanta il transistor aveva vinto. Ma ogni transistor andava ancora collegato a mano agli altri componenti, e più il circuito era grande, più il problema cresceva.' },
          ui.prose(
            'Il transistor era piccolo, parco e affidabile (lo racconta il <a href="#interruttori">capitolo 4</a>), ma da solo non basta: ogni porta logica ha bisogno anche di resistenze, diodi, condensatori e fili. Negli anni Cinquanta tutti questi pezzi si montavano uno per uno su schede, e ogni piedino andava saldato a mano.',
            'Più le macchine diventavano ambiziose, più pezzi servivano. L\'ENIAC, il grande calcolatore a valvole del 1946, aveva 17.468 valvole, circa 70.000 resistenze, 10.000 condensatori e circa 5 milioni di saldature fatte a mano. I calcolatori a transistor, i missili e gli aerei militari ne chiedevano sempre di più, e ogni collegamento era un punto in cui il circuito poteva guastarsi.',
            'Alla fine degli anni Cinquanta Jack Morton, uno dei dirigenti dei Bell Labs, diede al problema un nome rimasto famoso: la [[Tirannia dei numeri|tirannia dei numeri]]. Non bastava fare componenti migliori: bisognava trovare il modo di non doverli più collegare uno per uno.'),
          labTyranny(),
          ui.cols(
            ui.callout({
              kind: 'note',
              title: 'Le probabilità si moltiplicano',
              body: 'Se una saldatura su 10.000 è difettosa, una scheda con 100 saldature funziona quasi sempre. Con 10.000 saldature funziona poco più di una volta su tre, e con 100.000 quasi mai. La probabilità che tutto vada bene è il prodotto delle probabilità di ogni pezzo, e un prodotto di tanti numeri appena più piccoli di 1 crolla in fretta.',
            }),
            ui.callout({
              kind: 'fun',
              title: 'Come un impianto frigorifero',
              body: 'Chi monta impianti lo sa bene: un circuito frigorifero con cento raccordi ha cento occasioni di perdere gas, e basta una sola perdita per fermare tutto. Per questo si cerca di fare meno raccordi possibile. Gli ingegneri elettronici degli anni Cinquanta avevano lo stesso problema, moltiplicato per migliaia.',
            }))),

        ui.section({ id: 'idea', title: 'Un\'idea nell\'aria', kicker: '1949 – 1958 · Germania, Inghilterra, Stati Uniti', lead: 'Mettere più componenti in un solo pezzo di semiconduttore: l\'idea venne a più persone, in Paesi diversi, prima che qualcuno riuscisse a realizzarla.' },
          ui.prose(
            'Il 15 aprile 1949 Werner Jacobi, ingegnere della Siemens, depositò in Germania un brevetto per un amplificatore a semiconduttore con cinque transistor su un unico supporto comune; tra gli usi possibili indicava apparecchi acustici più piccoli. L\'idea però rimase sulla carta: nessuno la mise in produzione.',
            'Nel maggio 1952, a un convegno sui componenti elettronici a Washington, l\'ingegnere inglese Geoffrey Dummer andò più in là. Disse che, con il transistor e gli studi sui semiconduttori, si poteva immaginare un\'apparecchiatura elettronica fatta come un blocco solido, senza fili di collegamento: strati di materiali isolanti, conduttori, raddrizzatori e amplificatori, con i collegamenti ricavati direttamente negli strati. Era la descrizione di un circuito integrato, sei anni prima del primo esemplare.',
            'Negli Stati Uniti, intanto, le forze armate finanziavano altre strade verso circuiti più piccoli. L\'esercito puntava sui micromoduli, minuscole piastrine di ceramica con un componente ciascuna, impilate e collegate da fili verticali; l\'aeronautica sognava una «elettronica molecolare» che facesse a meno dei componenti tradizionali. Tutte queste idee avevano lo stesso obiettivo: battere la tirannia dei numeri.'),
          ui.cols(
            ui.person({
              name: 'Geoffrey Dummer', years: '1909 – 2002', role: 'ingegnere radar',
              body: [
                'Nato a Hull, durante la seconda guerra mondiale lavorò al centro di ricerca britannico sul radar, poi trasferito a Malvern, e contribuì a sviluppare lo schermo circolare che mostra la mappa intorno all\'antenna.',
                'Nel 1952 fu tra i primi a parlare in pubblico di circuiti integrati, e per questo è ricordato come il «profeta del circuito integrato». In Gran Bretagna, però, le sue idee non trovarono i fondi per essere sviluppate.',
              ],
            }),
            ui.callout({
              kind: 'warn',
              title: 'Avere un\'idea non basta',
              body: 'Si legge spesso che qualcuno «inventò» il circuito integrato nel 1949 o nel 1952. Jacobi e Dummer avevano visto giusto, ma un\'invenzione diventa reale quando qualcuno trova il modo di costruirla e di produrla. Nel 1958 ci riuscì Jack Kilby; un anno dopo, in un modo diverso e più adatto alla produzione, Robert Noyce.',
            }))),

        ui.section({ id: 'kilby', title: 'L\'estate di Jack Kilby', kicker: 'Dallas, 1958 · Texas Instruments', lead: 'Un ingegnere appena assunto, senza diritto alle ferie, passò l\'estate quasi da solo in laboratorio. Ne uscì il primo circuito integrato.' },
          ui.prose(
            'Nel maggio 1958 Jack Kilby, un ingegnere di 34 anni alto quasi due metri, entrò alla Texas Instruments di Dallas. Veniva dalla Centralab di Milwaukee, dove per più di dieci anni aveva lavorato a circuiti miniaturizzati. A luglio quasi tutta l\'azienda andò in ferie per la pausa estiva; lui, appena arrivato, non ne aveva diritto, e restò quasi da solo in laboratorio a pensare.',
            'L\'idea che gli venne era semplice e un po\' folle: costruire tutti i componenti con lo stesso materiale, il semiconduttore. Un tratto di cristallo può fare da resistenza, perché conduce, ma non benissimo; una giunzione tra due zone diverse può fare da condensatore; e i transistor si fanno già nel semiconduttore. Presi uno per uno, componenti fatti così sono peggiori di quelli tradizionali, ma possono nascere tutti insieme nello stesso pezzo. Il 24 luglio 1958 Kilby annotò l\'idea nel suo quaderno di laboratorio.',
            'Il 12 settembre 1958 mostrò ad alcuni dirigenti il risultato: una barretta di [[Germanio|germanio]] lunga 11,1 mm e larga 1,6, incollata su un vetrino, con un transistor, un condensatore e l\'equivalente di tre resistenze, collegati da sottilissimi fili d\'oro. Era un oscillatore: quando Kilby diede corrente, sullo schermo dell\'oscilloscopio comparve un\'onda che si ripeteva senza fermarsi. Il primo [[Circuito integrato|circuito integrato]] funzionava.'),
          labKilby(),
          ui.quote({
            text: 'La TI fu l\'unica azienda disposta a lasciarmi lavorare alla miniaturizzazione dei componenti elettronici più o meno a tempo pieno.',
            original: 'TI was the only company that agreed to let me work on electronic component miniaturization more or less full time.',
            author: 'Jack Kilby', source: 'autobiografia per il premio Nobel', year: 2000,
          }),
          ui.prose('Kilby depositò il brevetto il 6 febbraio 1959, e a marzo la Texas Instruments presentò i suoi «circuiti solidi» alla fiera degli ingegneri radio di New York. Fu un inizio importante, ma il chip di germanio con i fili d\'oro era difficile da produrre in serie. La strada per farlo la stavano trovando, proprio in quei mesi, in California.'),
          ui.cols(
            ui.person({
              name: 'Jack Kilby', years: '1923 – 2005', role: 'ingegnere',
              body: [
                'Nato a Jefferson City, nel Missouri, crebbe nel Kansas e studiò ingegneria elettrica all\'Università dell\'Illinois. Alla Texas Instruments restò fino al 1983: oltre al circuito integrato, contribuì a inventare la calcolatrice tascabile e la stampante termica.',
                'Nel 2000 ricevette metà del premio Nobel per la fisica per il suo contributo all\'invenzione del circuito integrato.',
              ],
            }),
            ui.callout({
              kind: 'fun',
              title: 'I fili d\'oro',
              body: 'Il chip di Kilby aveva un punto debole: i collegamenti erano fili d\'oro saldati a mano, sospesi sopra il germanio. Per produrre circuiti integrati a migliaia serviva un modo di fare tutti i collegamenti insieme, senza mani. Quel modo lo trovarono, pochi mesi dopo, alla Fairchild.',
            }))),

        ui.section({ id: 'planare', title: 'Il chip piatto di Hoerni e Noyce', kicker: '1957 – 1961 · Fairchild Semiconductor', lead: 'In California due idee trasformarono il circuito integrato da esperimento a prodotto: costruire tutto in una superficie piatta e protetta, e stendere i collegamenti sopra.' },
          ui.prose(
            'Alla fine degli anni Cinquanta molti dei transistor migliori erano a [[Transistor mesa|mesa]]: il cristallo veniva scavato intorno alla zona attiva, che restava in rilievo come un altopiano. Era fatto così anche il primo prodotto della Fairchild, il transistor al silicio 2N697 del 1958. Il difetto stava nei fianchi dell\'altopiano, dove le giunzioni restavano scoperte: polvere e umidità le rovinavano.',
            'Il 1° dicembre 1957 Jean Hoerni, un fisico svizzero della Fairchild, scrisse nel suo quaderno un\'idea diversa. Durante la fabbricazione il silicio si ricopre di uno strato di [[Ossido di silicio|ossido]]: invece di toglierlo, perché non lasciarlo lì a proteggere le giunzioni? L\'idea si legava agli studi di Mohamed Atalla, ai Bell Labs, che aveva mostrato come l\'ossido protegga e stabilizzi la superficie del silicio (lo ritroveremo nel <a href="#struttura">capitolo 8</a>). Nel marzo 1959 il primo transistor costruito così funzionò, e il 1° maggio Hoerni depositò il brevetto del [[Processo planare|processo planare]].'),
          labPlanar(),
          ui.prose(
            'Il 23 gennaio 1959 Robert Noyce, che guidava la Fairchild, fece il passo successivo. Se il silicio è piatto e coperto di ossido, si può stendere sopra uno strato di metallo e inciderlo a forma di piste, come i fili di un circuito stampato: le piste scendono attraverso piccoli fori fino ai componenti e li collegano tutti insieme, senza saldature. Il circuito diventa [[Monolitico|monolitico]], un solo blocco di silicio con le sue [[Interconnessione|interconnessioni]] stese sopra. Noyce depositò il brevetto il 30 luglio 1959.',
            'Restava da separare i componenti, che nello stesso cristallo si sarebbero disturbati a vicenda attraverso il silicio. La soluzione l\'aveva trovata Kurt Lehovec, alla Sprague Electric: circondare ogni componente con giunzioni p-n tenute in modo da non condurre, come un fossato intorno a un castello. È l\'[[Isolamento a giunzione|isolamento a giunzione]], per cui Lehovec chiese il brevetto nel 1959.',
            'Alla Fairchild il compito di mettere tutto insieme toccò al gruppo di Jay Last. Il 26 maggio 1960 funzionò il primo circuito integrato planare, un [[Flip-flop|flip-flop]] con quattro transistor; all\'inizio i componenti erano separati da solchi riempiti di resina, poi, dall\'autunno, dalle giunzioni di Lehovec. Nel marzo 1961 la Fairchild mise in vendita i primi chip della famiglia Micrologic. Su una sola fetta di silicio, il [[Wafer|wafer]], se ne costruivano molti insieme; poi la fetta veniva tagliata, e ogni rettangolino, il [[Die|die]], diventava un chip.'),
          figNoyce(),
          ui.cols(
            ui.person({
              name: 'Jean Hoerni', years: '1924 – 1997', role: 'fisico',
              body: [
                'Nato a Ginevra, prese due dottorati in fisica, a Ginevra e a Cambridge, e lavorò al California Institute of Technology prima di entrare nel 1956 nel laboratorio di Shockley. Fu uno degli otto fondatori della Fairchild.',
                'Dopo il processo planare fondò altre aziende di semiconduttori, tra cui Amelco nel 1961 e Intersil nel 1967.',
              ],
            }),
            ui.person({
              name: 'Robert Noyce', years: '1927 – 1990', role: 'fisico e imprenditore',
              body: [
                'Nato a Burlington, nell\'Iowa, e cresciuto a Grinnell, prese il dottorato in fisica al MIT nel 1953. Nel 1957 fu tra gli otto fondatori della Fairchild Semiconductor, che poi guidò per più di dieci anni.',
                'Nel 1968 fondò Intel con Gordon Moore. Per il suo carisma lo chiamavano «il sindaco della Silicon Valley». Morì nel 1990, dieci anni prima del Nobel assegnato a Kilby: il premio non si dà alla memoria.',
              ],
            })),
          ui.cols(
            ui.callout({
              kind: 'note',
              title: 'Chi ha inventato il circuito integrato?',
              body: 'Texas Instruments e Fairchild si contesero il brevetto per anni. Dal 1962 l\'ufficio brevetti americano mise a confronto le due domande; nel 1966 le aziende si accordarono per usare ognuna i brevetti dell\'altra, e nel 1969 una corte d\'appello diede ragione a Noyce sui collegamenti stesi sull\'ossido. Oggi Kilby e Noyce sono ricordati insieme: Kilby costruì per primo un circuito in un solo pezzo di semiconduttore, Noyce trovò come fabbricarlo in serie.',
            }),
            ui.callout({
              kind: 'fun',
              title: 'Un dollaro per un\'invenzione',
              body: 'Kurt Lehovec era un dipendente della Sprague Electric, e il brevetto dell\'isolamento a giunzione andò all\'azienda. Per un\'idea usata in quasi tutti i circuiti integrati degli anni Sessanta ricevette, come compenso, un dollaro.',
            }))),

        ui.section({ id: 'valle', title: 'La Fairchild e la Silicon Valley', kicker: '1956 – 1971 · California', lead: 'Da un laboratorio litigioso nacque un\'azienda, e da quell\'azienda decine di altre: la valle a sud di San Francisco diventò la capitale mondiale dei chip.' },
          ui.prose(
            'Nel 1956 William Shockley, uno dei tre inventori del transistor, aprì a Mountain View, in California, un laboratorio tutto suo, finanziato dalla Beckman Instruments. Assunse alcuni dei giovani scienziati più brillanti del Paese, ma il suo modo di dirigerli, sospettoso e autoritario, li allontanò presto. Il 18 settembre 1957 otto di loro si dimisero insieme: Julius Blank, Victor Grinich, Jean Hoerni, Eugene Kleiner, Jay Last, Gordon Moore, Robert Noyce e Sheldon Roberts, passati alla storia come gli «otto traditori».',
            'Con l\'aiuto di un giovane banchiere, Arthur Rock, trovarono i soldi presso la Fairchild Camera and Instrument dell\'industriale Sherman Fairchild e fondarono la Fairchild Semiconductor. In pochi anni l\'azienda inventò il processo planare e il circuito integrato in silicio, e diventò una scuola: molti dei suoi ingegneri se ne andarono per fondare aziende proprie, che in America chiamano «Fairchildren», i figli della Fairchild.'),
          labFamily(),
          ui.prose(
            'All\'inizio i circuiti integrati costavano troppo per gli apparecchi di tutti i giorni, e i primi clienti furono militari e spaziali, disposti a pagare per avere elettronica piccola e leggera. Nel 1962 la Texas Instruments ottenne il contratto per i circuiti del missile Minuteman II; nel 1963 il programma Apollo comprava circa il 60% dei circuiti integrati prodotti negli Stati Uniti, per il computer di guida che avrebbe portato gli astronauti sulla Luna (<a href="#porte">capitolo 2</a>). Grazie a quegli ordini la produzione crebbe e i prezzi crollarono: un circuito integrato costava in media circa 50 dollari nel 1962 e circa 2 nel 1968.',
            'Per mostrare che cosa si poteva fare, nel 1961 la Texas Instruments presentò un piccolo calcolatore costruito con circuiti integrati per l\'aeronautica americana. I numeri parlavano da soli.'),
          ui.stats([
            { value: 587, label: 'circuiti integrati', note: 'nel calcolatore della Texas Instruments del 1961' },
            { value: 8500, label: 'componenti separati', note: 'quelli che sarebbero serviti per costruirlo nel modo tradizionale' },
            { value: 150, unit: 'volte', label: 'più piccolo', note: 'circa 100 centimetri cubi in tutto' },
            { value: 48, unit: 'volte', label: 'più leggero', note: 'pesava circa 280 grammi' },
          ]),
          ui.prose('Nel gennaio 1971 il giornalista Don Hoefler intitolò «Silicon Valley U.S.A.» una serie di articoli sul settimanale Electronic News, dedicata alle aziende di semiconduttori nate intorno alla Fairchild. Il nome di [[Silicon Valley]], la valle del silicio, circolava già, ma da allora si diffuse in tutto il mondo.'),
          ui.callout({
            kind: 'link',
            title: 'Da Intel al microprocessore',
            body: 'Nel 1971 Intel mise in un solo chip il cuore di un calcolatore: il microprocessore 4004, con 2.300 transistor. La sua storia apre la <a href="../chip-programmabili/index.html#intel-4004">sezione sui chip programmabili</a>.',
          })),

        ui.section({ id: 'scala', title: 'Da poche porte a migliaia', kicker: '1961 – 1971 · SSI, MSI, LSI', lead: 'In dieci anni un chip passò da qualche transistor a migliaia. Per orientarsi, gli ingegneri cominciarono a contare le porte.' },
          ui.prose(
            'I primi circuiti integrati contenevano una manciata di componenti: un flip-flop, o un paio di porte logiche. Ma ogni anno se ne riuscivano a mettere di più nello stesso spazio, e gli ingegneri presero l\'abitudine di classificare i chip in base a quante porte logiche contenevano.',
            'Con l\'[[SSI]] (small-scale integration, integrazione su piccola scala) un chip contiene fino a una decina di porte: il 7400 della Texas Instruments, con le sue quattro NAND (<a href="#famiglie">capitolo 5</a>), è l\'esempio classico. Con l\'[[MSI]] si arriva a qualche decina, fino a circa cento: abbastanza per una funzione intera, come un contatore o il 74181 del 1970, un\'intera [[ALU]] a 4 bit in un solo chip. Con l\'[[LSI]] si sale a centinaia e migliaia di porte: le prime memorie e, nel 1971, il primo microprocessore. Oltre, dalla fine degli anni Settanta, viene la [[VLSI]].'),
          labScale(),
          ui.callout({
            kind: 'note',
            title: 'Confini che cambiano',
            body: 'Le soglie tra SSI, MSI, LSI e VLSI non sono fissate da nessuna norma e cambiano da un libro all\'altro: c\'è chi conta le porte e chi i transistor. Contano gli ordini di grandezza: decine, centinaia, migliaia, milioni.',
          }),
          ui.prose('Nel 1965 Gordon Moore, allora direttore della ricerca alla Fairchild, guardò questi numeri e fece una previsione destinata a diventare famosa: i componenti in un chip sarebbero raddoppiati ogni anno. È la [[Legge di Moore|legge di Moore]], che racconteremo nel <a href="#moore">capitolo 9</a>. Prima, però, conviene entrare in fabbrica: come si costruisce, strato dopo strato, un chip con miliardi di transistor?'),
          ui.keyIdea('Il circuito integrato ha sconfitto la tirannia dei numeri: invece di saldare a mano migliaia di pezzi, si costruiscono transistor, resistenze e collegamenti tutti insieme, nello stesso pezzo di silicio. Kilby dimostrò che si poteva fare; Hoerni e Noyce, con il processo planare, trovarono come farlo in serie. Da allora il numero di componenti in un chip non ha mai smesso di crescere.'),
          ui.crossLink({ href: '#fabbrica', kicker: 'Capitolo 7', title: 'Come si fabbrica un chip', text: 'Dalla sabbia al silicio purissimo, dalla fetta al chip finito: centinaia di passaggi di luce, chimica e ioni in una camera bianca.' })));
    },
  });
})();
