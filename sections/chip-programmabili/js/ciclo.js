/*
 * Capitolo 4 · Laboratorio «Programma una CPU».
 *
 * La CPU-8 (logica pura in js/ciclo-core.js, window.CicloCore) lavora un micro-passo per ciclo di clock:
 * i blocchi e i bus coinvolti si accendono con i colori comuni (indirizzi ambra, dati azzurro,
 * controllo rosa, esecuzione verde), un gettone porta il valore sul bus e il pannello spiega
 * che cosa succede e perché. La RAM si modifica in binario, in esadecimale o in assembly.
 *
 * Due disposizioni del palco: "wide" (viewBox 760 × 556) e "narrow" per i telefoni (380 × 560),
 * così a 390 px nessun testo scende sotto i 10 px effettivi.
 */
(function () {
  'use strict';

  CP.lab('ciclo', function (mount, ctx) {
    const { h, s, ui } = CP;
    const K = window.CicloCore;
    if (!K) throw new Error('CicloCore non disponibile (js/ciclo-core.js)');

    /* ---------- dati fissi ---------- */

    const SPEEDS = [1, 2, 4, 8, 16, 32, 64]; // hertz del clock didattico
    const FAST_HZ = 16;                      // da qui in su niente gettoni: solo stati e bagliori
    const MAX_RUN = 5000;                    // cicli senza HLT prima di fermarsi da soli
    const MANUAL_MS = 560;                   // durata del viaggio del gettone con «Micro-passo»
    const INSTR_MS = 340;                    // ritmo dei micro-passi con «Istruzione»
    const PHASES = [['prendi', 'Prendi'], ['decodifica', 'Decodifica'], ['esegui', 'Esegui']];

    const SIG_BY_BLOCK = {};
    const SIG_DESC = {};
    K.SIGNALS.forEach((x) => {
      (SIG_BY_BLOCK[x.block] = SIG_BY_BLOCK[x.block] || []).push(x.id);
      SIG_DESC[x.id] = x.desc;
    });

    const SHORT = {
      'pc>mar': 'PC→MAR', 'ram>ir': 'RAM→IR', decode: 'decod.', 'ir>mar': 'IR→MAR', 'ram>a': 'RAM→A',
      'ram>b': 'RAM→B', add: 'A+B→A', sub: 'A−B→A', 'a>ram': 'A→RAM', 'ir>a': 'IR→A', jmp: 'IR→PC',
      jc: 'se C', jz: 'se Z', 'a>out': 'A→OUT', hlt: 'stop',
    };

    const BLOCKS = {
      pc: { t: 'PC', sub: 'contatore di programma', name: 'Contatore di programma (PC)', info: 'Contiene l\'indirizzo della prossima istruzione. Dopo ogni lettura avanza di uno; un salto ci scrive un indirizzo nuovo.' },
      mar: { t: 'MAR', sub: 'registro indirizzi', name: 'Registro indirizzi (MAR)', info: 'Dice alla memoria quale cella leggere o scrivere. Nel disegno la cella scelta ha il contorno ambra.' },
      ram: { t: 'RAM', sub: '16 celle da un byte', name: 'Memoria (RAM)', info: 'Sedici celle da 8 bit con il programma e i dati: per la CPU sono soltanto numeri. Clicca una cella per aprirla nell\'editor qui sotto.' },
      ir: { t: 'IR', sub: 'registro d\'istruzione', name: 'Registro d\'istruzione (IR)', info: 'Conserva l\'istruzione appena letta. I 4 bit alti, il codice operativo, vanno al decodificatore; i 4 bassi sono l\'operando.' },
      out: { t: 'OUT', sub: 'registro d\'uscita', name: 'Registro d\'uscita (OUT)', info: 'Tiene il numero da mostrare sul display. Lo scrive soltanto l\'istruzione OUT.' },
      disp: { t: 'Display', sub: '', name: 'Display', info: 'Mostra in decimale il contenuto del registro d\'uscita.' },
      a: { t: 'A', sub: 'accumulatore', name: 'Accumulatore (A)', info: 'Il registro principale: riceve i dati dalla memoria e i risultati della ALU, ed è il primo numero di ogni calcolo.' },
      alu: { t: 'ALU', sub: 'somma e sottrae', name: 'ALU, unità aritmetico-logica', info: 'Somma o sottrae A e B. Per sottrarre somma il complemento a due di B. I sommatori di cui è fatta sono nella sezione sulle porte logiche.' },
      b: { t: 'B', sub: 'secondo operando', name: 'Registro B', info: 'Tiene il secondo numero dei calcoli, preso dalla memoria da ADD e SUB.' },
      flags: { t: 'Flag', sub: 'zero e riporto', name: 'Registro dei flag', info: 'Z vale 1 se l\'ultimo risultato è zero. C vale 1 se la somma non stava in 8 bit o, in una sottrazione, se non è servito un prestito. JZ e JC li guardano per decidere se saltare.' },
      clk: { t: 'Clock', sub: '', name: 'Clock', info: 'Il metronomo della CPU: a ogni impulso avviene un micro-passo. Puoi cambiarne la frequenza con il cursore «Clock».' },
      ctl: { t: 'Unità di controllo', sub: 'decodificatore', name: 'Unità di controllo e decodificatore', info: 'Unisce il codice operativo e il numero del micro-passo (da T1 a T6) e ne ricava la parola di controllo: 16 segnali che dicono a ogni blocco se scrivere sul bus, leggere o restare fermo.' },
    };
    const REG8 = { ir: 1, a: 1, b: 1, out: 1 };

    const LAYOUTS = {
      wide: {
        name: 'wide', narrow: false, w: 760, h: 556,
        blocks: {
          pc: [36, 20, 200, 64], mar: [36, 104, 200, 64], ram: [36, 188, 200, 150], ir: [36, 358, 200, 64],
          out: [400, 20, 160, 64], disp: [584, 20, 160, 64], a: [400, 104, 160, 64], alu: [400, 188, 160, 80],
          flags: [584, 196, 160, 64], b: [400, 288, 160, 64], clk: [36, 446, 120, 96], ctl: [176, 446, 568, 96],
        },
        dataX: 318, addrX: 18,
        dataY: { out: 52, a: 136, alu: 228, ram: 263, b: 320, ir: 390 },
        addrY: { pc: 52, mar: 136, ir: 390 },
        links: {
          'mar-ram': ['addr', [[136, 168], [136, 188]]],
          'out-disp': ['data', [[560, 52], [584, 52]]],
          'a-alu': ['on', [[480, 168], [480, 188]]],
          'b-alu': ['on', [[480, 288], [480, 268]]],
          'alu-flags': ['on', [[560, 228], [584, 228]]],
          'flags-ctl': ['op', [[664, 260], [664, 446]]],
          'ir-ctl': ['op', [[67, 422], [67, 434], [382, 434], [382, 446]]],
          'clk-ctl': ['op', [[156, 494], [176, 494]]],
        },
        labels: [[312, 182, 'dati · 8 bit'], [12, 263, 'indirizzi · 4 bit']],
        opRoute: [[67, 414], [67, 434], [382, 434], [382, 474]],
        reg: { tx: 12, ty: 20, sy: 34, vy: 56, pill: 26, pillH: 17, py: 7 },
      },
      narrow: {
        name: 'narrow', narrow: true, w: 380, h: 560,
        blocks: {
          clk: [22, 8, 140, 44], disp: [220, 8, 140, 44],
          pc: [22, 64, 140, 60], out: [220, 64, 140, 60],
          mar: [22, 136, 140, 60], a: [220, 136, 140, 60],
          ram: [22, 208, 140, 132], alu: [220, 208, 140, 64],
          b: [220, 284, 140, 60],
          ir: [22, 352, 140, 60], flags: [220, 352, 140, 60],
          ctl: [10, 428, 360, 124],
        },
        dataX: 190, addrX: 10,
        dataY: { out: 94, a: 166, alu: 240, ram: 274, b: 314, ir: 382 },
        addrY: { pc: 94, mar: 166, ir: 382 },
        links: {
          'mar-ram': ['addr', [[92, 196], [92, 208]]],
          'out-disp': ['data', [[290, 64], [290, 52]]],
          'a-alu': ['on', [[290, 196], [290, 208]]],
          'b-alu': ['on', [[290, 284], [290, 272]]],
          'alu-flags': ['on', [[360, 240], [370, 240], [370, 382], [360, 382]]],
          'flags-ctl': ['op', [[290, 412], [290, 428]]],
          'ir-ctl': ['op', [[49, 412], [49, 420], [250, 420], [250, 428]]],
        },
        labels: [[184, 203, 'dati · 8 bit']],
        opRoute: [[49, 405], [49, 420], [250, 420], [250, 445], [262, 445]],
        reg: { tx: 10, ty: 18, sy: 31, vy: 51, pill: 24, pillH: 16, py: 5 },
      },
    };

    /* ---------- piccoli aiuti ---------- */

    const bin = (n, b) => K.bin(n, b || 8);
    const bin8s = (n) => bin(n >> 4, 4) + ' ' + bin(n & 15, 4);
    const hex2 = (n) => (n & 255).toString(16).toUpperCase().padStart(2, '0');
    const B = (v) => h('b', null, String(v));
    const C = (t) => h('code', null, String(t));
    const kindOfT = (t) => (t === 1 ? 'addr' : t === 2 ? 'data' : t === 3 ? 'op' : 'on');
    const clampIdx = (v) => Math.max(0, Math.min(SPEEDS.length - 1, Number.isFinite(+v) ? Math.round(+v) : 1));
    const reduced = () => ctx.reduced;

    function poly(points) {
      const pts = [];
      points.forEach((p) => { const q = pts[pts.length - 1]; if (!q || q[0] !== p[0] || q[1] !== p[1]) pts.push(p); });
      const seg = [];
      let len = 0;
      for (let i = 1; i < pts.length; i++) {
        const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        seg.push(l);
        len += l;
      }
      return {
        pts: pts, L: len,
        d: 'M' + pts.map((p) => p[0] + ' ' + p[1]).join(' L'),
        at(dist) {
          let d = Math.max(0, Math.min(len, dist));
          for (let i = 0; i < seg.length; i++) {
            if (d <= seg[i] || i === seg.length - 1) {
              const f = seg[i] ? Math.min(1, d / seg[i]) : 1;
              return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
            }
            d -= seg[i];
          }
          return pts[pts.length - 1];
        },
      };
    }

    function setBtn(btn, icon, label) {
      const spans = btn.querySelectorAll('span');
      if (spans[0]) spans[0].textContent = icon;
      if (spans[1]) spans[1].textContent = label;
    }

    function glowEl(el, peak) {
      if (!el || reduced() || !el.animate) return;
      el.animate([{ opacity: peak == null ? 0.95 : peak }, { opacity: 0 }], { duration: CP.dur.slow + 50, easing: 'ease-out' });
    }

    /* ---------- stato ---------- */

    let progId = CP.store.get('ciclo-prog', 'somma');
    if (!K.EXAMPLES.some((e) => e.id === progId)) progId = 'somma';
    let ex = K.loadExample(progId);
    let image = ex.bytes.slice();   // il programma composto da chi impara (esempio + modifiche)
    let kinds = (ex.kinds || []).slice(); // 'data' per le celle scritte come numeri: nell'elenco si leggono come numeri
    let cpu = K.create(image);      // la CPU, con la sua RAM "viva" (STA la cambia)
    let lastEv = null;
    let lastAlu = null;
    let selected = 0;
    let running = false;
    let runMode = 'run';
    let runStart = 0;
    let speedIdx = clampIdx(CP.store.get('ciclo-speed', 1));
    let acc = 0;
    let anim = null;
    let timers = [];
    let ringAt = -1;
    let ringTw = null;
    let infoId = null;
    const goal = { halted: false, changed: false };
    let L = null;
    let st = null;

    /* ---------- controlli ---------- */

    const progSeg = ui.seg({
      label: 'Programma d\'esempio',
      value: progId,
      options: K.EXAMPLES.map((e) => ({ value: e.id, label: e.title, title: e.name })),
      onChange: (id) => loadProgram(id),
    });
    const runBtn = ui.button({ label: 'Esegui', icon: '▶︎', primary: true, title: 'Esegui il programma al ritmo del clock', onClick: toggleRun });
    const microBtn = ui.button({ label: 'Micro-passo', icon: '›', title: 'Avanza di un ciclo di clock', onClick: () => manual('micro') });
    const instrBtn = ui.button({ label: 'Istruzione', icon: '»', title: 'Completa l\'istruzione in corso', onClick: () => manual('instr') });
    const resetBtn = ui.button({ label: 'Reset', icon: '↺', title: 'Registri a zero e programma ricaricato in RAM', onClick: () => reset(true) });
    const speed = ui.range({
      label: 'Clock', min: 0, max: SPEEDS.length - 1, step: 1, value: speedIdx,
      format: (v) => SPEEDS[v] + ' Hz',
      onInput: (v) => { speedIdx = clampIdx(v); CP.store.set('ciclo-speed', speedIdx); renderClock(); },
    });

    const bar = h('div', { class: 'ciclo-bars' },
      ui.bar(h('div', { class: 'cp-bar-group ciclo-progs' }, h('span', { class: 'ciclo-bar-k', 'aria-hidden': 'true' }, 'Programma'), progSeg)),
      ui.bar(h('div', { class: 'cp-bar-group ciclo-run' }, runBtn, microBtn, instrBtn, resetBtn), h('span', { class: 'grow' }), speed));

    /* ---------- pannello di spiegazione ---------- */

    const phaseLis = PHASES.map(([k, label]) => h('li', { 'data-ph': k }, label));
    const exStep = h('span', { class: 'step' });
    const exTitle = h('h4', null);
    const exBody = h('p', { class: 'ciclo-why' });
    const exSig = h('p', { class: 'ciclo-sig' });
    const exNote = h('p', { class: 'ciclo-tip', hidden: true });
    const exRecipeHead = h('p', { class: 'ciclo-recipe-h' });
    const exRecipe = h('ol', { class: 'ciclo-recipe' });
    const stCycles = h('dd', null, '0');
    const stInstr = h('dd', null, '0');
    const stCpi = h('dd', null, '—');
    const exOuts = h('p', { class: 'ciclo-outs' });
    const explain = h('div', { class: 'cp-explain ciclo-explain' },
      h('div', { class: 'ciclo-ex-main' },
        h('ol', { class: 'ciclo-phases', 'aria-label': 'Fase del ciclo di istruzione' }, phaseLis),
        exStep, exTitle, exBody, exSig, exNote),
      h('div', { class: 'ciclo-ex-side' },
        exRecipeHead, exRecipe,
        h('dl', { class: 'ciclo-stats' },
          h('div', null, h('dt', null, 'Cicli di clock'), stCycles),
          h('div', null, h('dt', null, 'Istruzioni'), stInstr),
          h('div', null, h('dt', null, 'Cicli per istruzione'), stCpi)),
        exOuts));

    /* ---------- palco ---------- */

    const stageBox = h('div', { class: 'cp-stage ciclo-stage' });

    function buildStage(layout) {
      L = layout;
      ringAt = -1;
      if (ringTw) { ringTw.cancel(); ringTw = null; }
      const svg = s('svg', {
        class: 'ciclo-svg' + (L.narrow ? ' is-narrow' : ''),
        viewBox: '0 0 ' + L.w + ' ' + L.h,
        role: 'group',
        'aria-label': 'Schema della CPU-8: registri, ALU, memoria, unità di controllo e bus. Ogni blocco è un pulsante: premilo per sapere che cosa fa.',
      });
      const gBus = s('g', { class: 'ciclo-wires', 'aria-hidden': 'true' });
      const gRoutes = s('g', { class: 'ciclo-routes', 'aria-hidden': 'true' });
      const gBlocks = s('g', { class: 'ciclo-blocks' });
      const gFx = s('g', { class: 'ciclo-fx', 'aria-hidden': 'true' });
      svg.append(gBus, gRoutes, gBlocks, gFx);
      st = { svg: svg, routes: gRoutes, fx: gFx, blk: {}, links: {}, cells: [], tags: {}, cw: {}, tbox: [], seg: [] };

      // bus dati e bus indirizzi: dorsale + derivazioni verso i blocchi
      const dys = Object.values(L.dataY);
      const ays = Object.values(L.addrY);
      let d = 'M' + L.dataX + ' ' + Math.min.apply(null, dys) + ' V' + Math.max.apply(null, dys);
      Object.keys(L.dataY).forEach((id) => { const p = dport(id); d += ' M' + p[0] + ' ' + p[1] + ' H' + L.dataX; });
      gBus.append(s('path', { class: 'cp-bus ciclo-bus', d: d }));
      let a = 'M' + L.addrX + ' ' + Math.min.apply(null, ays) + ' V' + Math.max.apply(null, ays);
      Object.keys(L.addrY).forEach((id) => { const p = aport(id); a += ' M' + p[0] + ' ' + p[1] + ' H' + L.addrX; });
      gBus.append(s('path', { class: 'cp-bus ciclo-bus', d: a }));
      Object.keys(L.links).forEach((id) => {
        const [kind, pts] = L.links[id];
        const p = s('path', { class: 'ciclo-link k-' + kind, d: poly(pts).d });
        gBus.append(p);
        st.links[id] = { el: p, kind: kind, pts: pts };
      });
      L.labels.forEach(([x, y, t]) => {
        gBus.append(s('text', { class: 'ciclo-buslabel', x: x, y: y, 'text-anchor': 'middle', transform: 'rotate(-90 ' + x + ' ' + y + ')' }, t));
      });

      Object.keys(L.blocks).forEach((id) => gBlocks.append(drawBlock(id)));
      stageBox.innerHTML = '';
      stageBox.append(svg);
    }

    function dport(id) {
      const [x, , w] = L.blocks[id];
      return [x + w / 2 < L.dataX ? x + w : x, L.dataY[id]];
    }
    function aport(id) { return [L.blocks[id][0], L.addrY[id]]; }

    function drawBlock(id) {
      const [x, y, w, hh] = L.blocks[id];
      const meta = BLOCKS[id];
      const R = L.reg;
      const g = s('g', { class: 'ciclo-blk', 'data-blk': id, tabindex: '0', role: 'button', 'aria-label': meta.name + ': che cosa fa?' });
      g.append(
        s('rect', { class: 'ring', x: x - 4, y: y - 4, width: w + 8, height: hh + 8, rx: 13 }),
        s('rect', { class: 'box', x: x, y: y, width: w, height: hh, rx: 10 }));
      const ref = { g: g, x: x, y: y, w: w, h: hh };
      st.blk[id] = ref;

      const title = (tx, ty) => g.append(s('text', { class: 't', x: x + tx, y: y + ty }, meta.t));
      const sub = (tx, ty) => { if (meta.sub) g.append(s('text', { class: 'sub', x: x + tx, y: y + ty }, meta.sub)); };

      if (id === 'pc' || id === 'mar' || REG8[id]) {
        title(R.tx, R.ty);
        sub(R.tx, R.sy);
        ref.val = s('text', { class: 'val mono', x: x + R.tx, y: y + R.vy });
        ref.dec = s('text', { class: 'dec mono', x: x + w - R.tx, y: y + R.vy, 'text-anchor': 'end' });
        if (id === 'ir') {
          ref.op = s('tspan', { class: 'nib-op' });
          ref.arg = s('tspan', { class: 'nib-arg' });
          ref.val.append(ref.op, ' ', ref.arg);
        }
        g.append(ref.val, ref.dec);
        if (id === 'pc') {
          ref.plus = s('text', { class: 'plus mono', x: x + w - R.tx - (L.narrow ? 34 : 42), y: y + R.vy - 2, 'text-anchor': 'end', opacity: 0 }, '+1');
          g.append(ref.plus);
        }
      } else if (id === 'ram') {
        title(R.tx, R.ty);
        sub(R.tx, R.sy);
        drawRam(g, ref);
      } else if (id === 'alu') {
        title(R.tx, R.ty);
        sub(R.tx, R.sy);
        const cx = x + w - (L.narrow ? 20 : 28);
        const cy = y + (L.narrow ? 45 : 52);
        g.append(s('circle', { class: 'opc', cx: cx, cy: cy, r: L.narrow ? 11 : 14 }));
        ref.glyph = s('text', { class: 'glyph', x: cx, y: cy, dy: '.36em', 'text-anchor': 'middle' }, '+');
        ref.calc = s('text', { class: 'calc mono', x: x + R.tx, y: y + (L.narrow ? 53 : 64) }, '—');
        g.append(ref.glyph, ref.calc);
      } else if (id === 'flags') {
        title(R.tx, R.ty);
        sub(R.tx, R.sy);
        const ly = y + (L.narrow ? 46 : 50);
        const r = L.narrow ? 5 : 6;
        const zx = x + (L.narrow ? 18 : 22);
        const cx2 = x + (L.narrow ? 78 : 96);
        ref.zLed = s('circle', { class: 'led', cx: zx, cy: ly, r: r });
        ref.cLed = s('circle', { class: 'led', cx: cx2, cy: ly, r: r });
        ref.zTxt = s('text', { class: 'flag mono', x: zx + r + 6, y: ly, dy: '.36em' });
        ref.cTxt = s('text', { class: 'flag mono', x: cx2 + r + 6, y: ly, dy: '.36em' });
        g.append(ref.zLed, ref.cLed, ref.zTxt, ref.cTxt);
      } else if (id === 'disp') {
        drawDisplay(g, ref);
      } else if (id === 'clk') {
        drawClock(g, ref);
      } else if (id === 'ctl') {
        drawCtl(g, ref);
      }

      // segnali di controllo del blocco: piccole etichette rosa in alto a destra
      const sigs = SIG_BY_BLOCK[id] || [];
      if (sigs.length) {
        const pw = R.pill;
        const x0 = x + w - 8 - sigs.length * pw - (sigs.length - 1) * 3;
        sigs.forEach((sid, k) => {
          const px = x0 + k * (pw + 3);
          const tag = s('g', { class: 'ciclo-tag' },
            s('rect', { x: px, y: y + R.py, width: pw, height: R.pillH, rx: 4 }),
            s('text', { x: px + pw / 2, y: y + R.py + R.pillH / 2, dy: '.36em', 'text-anchor': 'middle' }, sid));
          g.append(tag);
          st.tags[sid] = tag;
        });
      }

      g.append(s('rect', { class: 'halo', x: x - 1, y: y - 1, width: w + 2, height: hh + 2, rx: 11, opacity: 0 }));
      ref.halo = g.lastChild;

      const act = (e) => {
        const cell = e && e.target && e.target.closest ? e.target.closest('[data-cell]') : null;
        if (cell) { select(+cell.getAttribute('data-cell')); return; }
        showInfo(id);
      };
      g.addEventListener('click', act);
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); showInfo(id); }
      });
      return g;
    }

    function drawRam(g, ref) {
      const { x, y } = ref;
      const n = L.narrow;
      const cx0 = x + (n ? 32 : 42);
      const cw = n ? 25 : 34;
      const gap = n ? 2 : 4;
      const ch = n ? 17 : 20;
      const pitch = n ? 19 : 22;
      const ry0 = y + (n ? 51 : 58);
      const hy = y + (n ? 46 : 52);
      const lx = x + (n ? 27 : 34);
      ref.cell = { w: cw, h: ch };
      for (let c = 0; c < 4; c++) {
        g.append(s('text', { class: 'hdr mono', x: cx0 + c * (cw + gap) + cw / 2, y: hy, 'text-anchor': 'middle' }, '+' + c));
      }
      for (let r = 0; r < 4; r++) {
        g.append(s('text', { class: 'hdr mono', x: lx, y: ry0 + r * pitch + ch / 2, dy: '.36em', 'text-anchor': 'end' }, String(r * 4)));
        for (let c = 0; c < 4; c++) {
          const i = r * 4 + c;
          const px = cx0 + c * (cw + gap);
          const py = ry0 + r * pitch;
          const cg = s('g', { class: 'cell', 'data-cell': i });
          const rect = s('rect', { x: px, y: py, width: cw, height: ch, rx: 4 });
          const flash = s('rect', { class: 'flash', x: px, y: py, width: cw, height: ch, rx: 4, opacity: 0 });
          const txt = s('text', { class: 'mono', x: px + cw / 2, y: py + ch / 2, dy: '.36em', 'text-anchor': 'middle' });
          const dot = s('circle', { class: 'edit', cx: px + cw - 3.5, cy: py + 3.5, r: n ? 1.8 : 2.2 });
          cg.append(rect, flash, txt, dot);
          g.append(cg);
          st.cells.push({ g: cg, rect: rect, flash: flash, txt: txt, cx: px + cw / 2, cy: py + ch / 2, x: px, y: py });
        }
      }
      st.ring = s('rect', { class: 'marring', x: 0, y: 0, width: cw + 4, height: ch + 4, rx: 5 });
      g.append(st.ring);
    }

    const SEGS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };

    function drawDisplay(g, ref) {
      const { x, y, w, h: hh } = ref;
      const n = L.narrow;
      const pad = n ? [6, 5] : [10, 9];
      g.append(s('rect', { class: 'panel', x: x + pad[0], y: y + pad[1], width: w - 2 * pad[0], height: hh - 2 * pad[1], rx: 6 }));
      const dw = n ? 15 : 20;
      const dh = n ? 26 : 34;
      const gap = n ? 7 : 9;
      const t = n ? 2.6 : 3.4;
      const total = 3 * dw + 2 * gap;
      const x0 = x + (w - total) / 2 + 2;
      const y0 = y + (hh - dh) / 2;
      for (let k = 0; k < 3; k++) {
        const dg = s('g', { class: 'digit', transform: 'translate(' + (x0 + k * (dw + gap)) + ' ' + y0 + ') skewX(-7)' });
        const v = (dh - 3 * t) / 2;
        const geo = {
          a: [t, 0, dw - 2 * t, t], b: [dw - t, t, t, v], c: [dw - t, 2 * t + v, t, v], d: [t, dh - t, dw - 2 * t, t],
          e: [0, 2 * t + v, t, v], f: [0, t, t, v], g: [t, t + v, dw - 2 * t, t],
        };
        const segs = {};
        'abcdefg'.split('').forEach((sg) => {
          const [sx, sy, sw, sh] = geo[sg];
          const r = s('rect', { class: 'seg', x: sx, y: sy, width: sw, height: sh, rx: t / 2 });
          dg.append(r);
          segs[sg] = r;
        });
        g.append(dg);
        st.seg.push(segs);
      }
    }

    function drawClock(g, ref) {
      const { x, y, w } = ref;
      const n = L.narrow;
      g.append(s('text', { class: 't', x: x + (n ? 10 : 12), y: y + (n ? 17 : 20) }, 'Clock'));
      let d;
      if (n) {
        d = 'M' + (x + 66) + ' ' + (y + 30);
        for (let k = 0; k < 2; k++) { const x1 = x + 66 + k * 18; d += ' V' + (y + 14) + ' H' + (x1 + 9) + ' V' + (y + 30) + ' H' + (x1 + 18); }
        ref.led = s('circle', { class: 'led clk', cx: x + 56, cy: y + 22, r: 3.5 });
        ref.freq = s('text', { class: 'mono freq', x: x + 10, y: y + 36 });
        ref.state = s('text', { class: 'mono state', x: x + w - 8, y: y + 37, 'text-anchor': 'end' });
      } else {
        d = 'M' + (x + 12) + ' ' + (y + 54);
        for (let k = 0; k < 3; k++) { const x1 = x + 12 + k * 24; d += ' V' + (y + 36) + ' H' + (x1 + 12) + ' V' + (y + 54) + ' H' + (x1 + 24); }
        ref.led = s('circle', { class: 'led clk', cx: x + w - 20, cy: y + 45, r: 5 });
        ref.freq = s('text', { class: 'mono freq', x: x + 12, y: y + 73 });
        ref.state = s('text', { class: 'mono state', x: x + 12, y: y + 88 });
      }
      ref.wave = s('path', { class: 'wave', d: d });
      g.append(ref.wave, ref.led, ref.freq, ref.state);
    }

    function drawCtl(g, ref) {
      const { x, y, w } = ref;
      const n = L.narrow;
      g.append(s('text', { class: 't', x: x + 12, y: y + (n ? 19 : 20) }, BLOCKS.ctl.t));
      let mbx, mby, mbw, mbh;
      if (n) {
        [mbx, mby, mbw, mbh] = [x + w - 110, y + 5, 100, 24];
      } else {
        g.append(s('text', { class: 'sub', x: x + 12, y: y + 35 }, BLOCKS.ctl.sub));
        [mbx, mby, mbw, mbh] = [x + 156, y + 8, 100, 40];
      }
      g.append(s('rect', { class: 'mnem-box', x: mbx, y: mby, width: mbw, height: mbh, rx: 7 }));
      ref.mnem = s('text', { class: 'mnem mono', x: mbx + mbw / 2, y: mby + mbh / 2, dy: '.36em', 'text-anchor': 'middle' }, '—');
      g.append(ref.mnem);
      // le caselle dei micro-passi T1…T6
      for (let k = 0; k < 6; k++) {
        const bx = n ? x + 8 + k * 58 : x + 266 + k * 50;
        const by = n ? y + 36 : y + 8;
        const bw = n ? 54 : 46;
        const bh = n ? 34 : 38;
        const tg = s('g', { class: 'tbox' });
        tg.append(
          s('rect', { x: bx, y: by, width: bw, height: bh, rx: 6 }),
          s('text', { class: 'tn', x: bx + bw / 2, y: by + (n ? 14 : 15), 'text-anchor': 'middle' }, 'T' + (k + 1)),
          s('text', { class: 'tl mono', x: bx + bw / 2, y: by + (n ? 28 : 31), 'text-anchor': 'middle' }, ''));
        g.append(tg);
        st.tbox.push({ g: tg, label: tg.lastChild });
      }
      // la parola di controllo: 16 segnali
      if (!n) g.append(s('text', { class: 'sub', x: x + 12, y: y + 77 }, 'parola di controllo'));
      K.SIGNALS.forEach((sg, k) => {
        let px, py, pw, ph;
        if (n) { px = x + 6 + (k % 8) * 44; py = y + 78 + Math.floor(k / 8) * 22; pw = 41; ph = 18; }
        else { px = x + 130 + k * 27; py = y + 63; pw = 25; ph = 20; }
        const pg = s('g', { class: 'cw' },
          s('rect', { x: px, y: py, width: pw, height: ph, rx: 5 }),
          s('text', { class: 'mono', x: px + pw / 2, y: py + ph / 2, dy: '.36em', 'text-anchor': 'middle' }, sg.id));
        g.append(pg);
        st.cw[sg.id] = pg;
      });
    }

    /* ---------- disegno dello stato ---------- */

    function renderRegs() {
      const b = st.blk;
      b.pc.val.textContent = bin(cpu.pc, 4);
      b.pc.dec.textContent = '= ' + cpu.pc;
      b.mar.val.textContent = bin(cpu.mar, 4);
      b.mar.dec.textContent = '= ' + cpu.mar;
      b.ir.op.textContent = bin(cpu.ir >> 4, 4);
      b.ir.arg.textContent = bin(cpu.ir & 15, 4);
      b.ir.dec.textContent = hex2(cpu.ir);
      b.a.val.textContent = bin(cpu.a);
      b.a.dec.textContent = '= ' + cpu.a;
      b.b.val.textContent = bin(cpu.b);
      b.b.dec.textContent = '= ' + cpu.b;
      b.out.val.textContent = cpu.outSet ? bin(cpu.out) : '········';
      b.out.dec.textContent = cpu.outSet ? '= ' + cpu.out : 'vuoto';
      b.flags.zLed.classList.toggle('is-on', cpu.z);
      b.flags.cLed.classList.toggle('is-on', cpu.c);
      b.flags.zTxt.textContent = 'Z = ' + (cpu.z ? 1 : 0);
      b.flags.cTxt.textContent = 'C = ' + (cpu.c ? 1 : 0);
      if (lastAlu) {
        const sym = lastAlu.op === '-' ? '−' : '+';
        const txt = lastAlu.a + sym + lastAlu.b + '=' + lastAlu.result;
        b.alu.calc.textContent = txt.length > 11 || L.narrow ? txt : lastAlu.a + ' ' + sym + ' ' + lastAlu.b + ' = ' + lastAlu.result;
        b.alu.glyph.textContent = sym;
      } else {
        b.alu.calc.textContent = '—';
        b.alu.glyph.textContent = '+';
      }
      renderDisplay();
      renderClock();
    }

    function renderDisplay() {
      const digits = cpu.outSet ? String(cpu.out).padStart(3, ' ').split('') : [' ', ' ', ' '];
      digits.forEach((ch, k) => {
        const on = ch === ' ' ? '' : SEGS[ch];
        Object.keys(st.seg[k]).forEach((sg) => st.seg[k][sg].classList.toggle('is-on', on.indexOf(sg) >= 0));
      });
    }

    function renderClock() {
      if (!st) return;
      const c = st.blk.clk;
      c.freq.textContent = SPEEDS[speedIdx] + ' Hz';
      c.state.textContent = cpu.halted ? 'STOP' : (L.narrow ? '' : 'ciclo ') + cpu.cycles;
      c.g.classList.toggle('is-stop', cpu.halted);
      c.led.classList.toggle('is-on', running);
    }

    function renderRam(animate) {
      for (let i = 0; i < 16; i++) {
        const c = st.cells[i];
        c.txt.textContent = hex2(cpu.ram[i]);
        c.g.classList.toggle('is-edited', image[i] !== ex.bytes[i]);
        c.g.classList.toggle('is-sel', i === selected);
      }
      moveRing(cpu.mar, animate);
    }

    function moveRing(i, animate) {
      const c = st.cells[i];
      const to = [c.x - 2, c.y - 2];
      if (ringAt === i && !ringTw) return;
      if (ringTw) { ringTw.cancel(); ringTw = null; }
      const from = ringAt >= 0 ? [st.cells[ringAt].x - 2, st.cells[ringAt].y - 2] : to;
      ringAt = i;
      const put = (p) => { st.ring.setAttribute('x', p[0]); st.ring.setAttribute('y', p[1]); };
      if (!animate || reduced() || from[0] === to[0] && from[1] === to[1]) { put(to); return; }
      ringTw = CP.tween({ from: from, to: to, duration: 260, ease: 'smooth', onUpdate: put, onDone: () => { ringTw = null; } });
    }

    function recipeOf(ev) {
      if (!ev) return { keys: K.FETCH.slice(), known: false };
      if (ev.instr.text) return { keys: K.FETCH.concat(K.decode(ev.instr.byte).exec), known: true };
      return { keys: K.FETCH.slice(), known: false };
    }

    function renderCtl() {
      const c = st.blk.ctl;
      const ev = lastEv;
      c.mnem.textContent = ev ? (ev.instr.text || '?') : '—';
      c.g.classList.toggle('is-unknown', !!ev && !ev.instr.text);
      const r = recipeOf(ev);
      st.tbox.forEach((tb, k) => {
        const key = r.keys[k];
        tb.label.textContent = key ? SHORT[key] : (r.known ? '—' : (k < 3 ? '' : '?'));
        tb.g.setAttribute('class', 'tbox' + (key ? '' : ' is-empty') + (ev && ev.t === k + 1 ? ' is-now k-' + kindOfT(k + 1) : ''));
      });
      const on = ev ? ev.signals : [];
      K.SIGNALS.forEach((sg) => {
        st.cw[sg.id].classList.toggle('is-on', on.indexOf(sg.id) >= 0);
        if (st.tags[sg.id]) st.tags[sg.id].classList.toggle('is-on', on.indexOf(sg.id) >= 0);
      });
    }

    function renderAll(animate) {
      renderRegs();
      renderRam(animate);
      renderCtl();
      renderListing();
      renderEditor();
      renderStats();
      renderIsa();
      renderButtons();
    }

    /* ---------- un micro-passo, con il suo movimento ---------- */

    function clearFx() {
      timers.forEach((t) => clearTimeout(t));
      timers = [];
      st.routes.innerHTML = '';
      st.fx.innerHTML = '';
      Object.keys(st.blk).forEach((id) => st.blk[id].g.classList.remove('is-addr', 'is-data', 'is-op', 'is-on', 'is-info'));
      Object.keys(st.links).forEach((id) => st.links[id].el.classList.remove('is-lit'));
      st.cells.forEach((c) => c.g.classList.remove('is-read'));
      infoId = null;
    }

    function finishAnim() {
      if (!anim) return;
      const a = anim;
      anim = null;
      a.tw.cancel();
      if (a.tok) a.tok.remove();
      arrive(a.ev, false);
    }

    function routeFor(mv) {
      if (mv.bus === 'op') return poly(L.opRoute);
      const pts = [];
      if (mv.bus === 'addr') {
        pts.push(aport(mv.from), [L.addrX, L.addrY[mv.from]], [L.addrX, L.addrY[mv.to]], aport(mv.to));
      } else {
        if (mv.from === 'ram') pts.push([st.cells[mv.cell].cx, st.cells[mv.cell].cy]);
        pts.push(dport(mv.from), [L.dataX, L.dataY[mv.from]], [L.dataX, L.dataY[mv.to]], dport(mv.to));
        if (mv.to === 'ram') pts.push([st.cells[mv.cell].cx, st.cells[mv.cell].cy]);
      }
      return poly(pts);
    }

    function lightSignals(ev, animate) {
      // i segnali si accendono uno dopo l'altro, a 60 ms di distanza
      const list = ev.signals;
      K.SIGNALS.forEach((sg) => {
        st.cw[sg.id].classList.remove('is-on');
        if (st.tags[sg.id]) st.tags[sg.id].classList.remove('is-on');
      });
      list.forEach((id, k) => {
        const on = () => { st.cw[id].classList.add('is-on'); if (st.tags[id]) st.tags[id].classList.add('is-on'); };
        if (animate && k) timers.push(setTimeout(on, k * 60)); else on();
      });
    }

    function lightLink(id) { if (st.links[id]) st.links[id].el.classList.add('is-lit'); }

    function play(ev, period) {
      clearFx();
      const hz = period ? 1000 / period : 0;
      const animate = !reduced() && hz < FAST_HZ;
      const D = period ? Math.min(760, Math.max(90, period * 0.7)) : MANUAL_MS;

      // il clock batte: il pannello del controllo mostra subito il micro-passo
      renderCtl();
      lightSignals(ev, animate);
      if (animate) glowEl(st.blk.clk.led, 1);
      lightLink('clk-ctl');
      if (ev.alu) { lightLink('a-alu'); lightLink('b-alu'); lightLink('alu-flags'); st.blk.alu.g.classList.add('is-on'); }
      if (ev.key === 'jc' || ev.key === 'jz') { lightLink('flags-ctl'); st.blk.flags.g.classList.add('is-op'); st.blk.ctl.g.classList.add('is-op'); }
      if (ev.key === 'hlt') st.blk.clk.g.classList.add('is-op');
      if (ev.key === 'decode') { lightLink('ir-ctl'); st.blk.ctl.g.classList.add('is-op'); }
      if (ev.key === 'ram>ir' && animate) floatPlus();

      const mv = ev.moves[0];
      if (!mv) { arrive(ev, animate); return; }
      const kind = mv.bus === 'op' ? 'op' : mv.bus;
      st.blk[mv.from].g.classList.add('is-' + kind);
      st.blk[mv.to].g.classList.add('is-' + kind);
      if (mv.cell != null) st.cells[mv.cell].g.classList.add('is-read');
      if (mv.from === 'ram' || mv.to === 'ram') lightLink('mar-ram');
      if (mv.to === 'out') lightLink('out-disp');
      const route = routeFor(mv);
      const path = s('path', { class: 'ciclo-route k-' + kind + (mv.bus === 'op' ? ' thin' : ''), d: route.d });
      st.routes.append(path);
      if (!animate) { arrive(ev, false); return; }

      const text = mv.bits === 4 ? bin(mv.value, 4) : bin(mv.value, 8);
      const cw = L.narrow ? 6.7 : 7.4;
      const tw = text.length * cw + 12;
      const th = L.narrow ? 18 : 20;
      const tok = s('g', { class: 'ciclo-token k-' + kind },
        s('rect', { x: -tw / 2, y: -th / 2, width: tw, height: th, rx: th / 2 }),
        s('text', { x: 0, y: 0, dy: '.36em', 'text-anchor': 'middle' }, text));
      const p0 = route.at(0);
      tok.setAttribute('transform', 'translate(' + p0[0] + ' ' + p0[1] + ')');
      st.fx.append(tok);
      path.style.strokeDasharray = route.L + ' ' + route.L;
      path.style.strokeDashoffset = String(route.L);
      const tween = CP.tween({
        from: 0, to: 1, duration: D, ease: 'inOut',
        onUpdate: (p) => {
          const q = route.at(p * route.L);
          tok.setAttribute('transform', 'translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')');
          path.style.strokeDashoffset = (route.L * (1 - p)).toFixed(1);
        },
        onDone: () => {
          if (!anim || anim.tw !== tween) return;
          anim = null;
          tok.remove();
          arrive(ev, true);
        },
      });
      anim = { tw: tween, tok: tok, ev: ev };
    }

    function floatPlus() {
      const p = st.blk.pc.plus;
      if (!p) return;
      CP.tween({
        from: 0, to: 1, duration: CP.dur.slow + 150, ease: 'smooth',
        onUpdate: (v) => { p.setAttribute('opacity', (v < 0.15 ? v / 0.15 : 1 - (v - 0.15) / 0.85).toFixed(2)); p.setAttribute('transform', 'translate(0 ' + (-12 * v).toFixed(1) + ')'); },
        onDone: () => { p.setAttribute('opacity', 0); p.removeAttribute('transform'); },
      });
    }

    function arrive(ev, glow) {
      st.routes.querySelectorAll('path').forEach((p) => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; });
      renderAll(glow);
      // il gettone arriva: il blocco di destinazione si illumina un attimo
      if (!glow) return;
      const mv = ev.moves[0];
      if (mv) glowEl(st.blk[mv.to].halo);
      if (mv && mv.to === 'ram') glowEl(st.cells[mv.cell].flash, 0.85);
      if (ev.key === 'a>out') glowEl(st.blk.disp.halo);
      if (ev.alu) glowEl(st.blk.flags.halo, 0.7);
    }

    function stepOnce(period) {
      if (cpu.halted) return null;
      finishAnim();
      const ev = K.step(cpu);
      if (!ev) return null;
      lastEv = ev;
      if (ev.alu) lastAlu = ev.alu;
      play(ev, period);
      renderExplain(ev);
      if (ev.halted) onHalt();
      return ev;
    }

    /* ---------- esecuzione ---------- */

    function manual(what) {
      if (cpu.halted) return;
      if (running) stopRun();
      if (what === 'micro') {
        const ev = stepOnce(null);
        if (ev) ctx.say('T' + ev.t + ', ' + ev.phase + ': ' + ev.label + '. ' + describe(ev).title);
        return;
      }
      if (reduced()) {
        finishAnim();
        const evs = K.instruction(cpu);
        if (!evs.length) return;
        evs.forEach((e) => { if (e.alu) lastAlu = e.alu; });
        lastEv = evs[evs.length - 1];
        clearFx();
        renderAll(false);
        renderExplain(lastEv);
        ctx.say('Istruzione ' + (lastEv.instr.text || '') + ' completata in ' + evs.length + ' cicli.');
        if (lastEv.halted) onHalt();
        return;
      }
      startRun('instr');
    }

    function startRun(mode) {
      runMode = mode;
      running = true;
      runStart = cpu.cycles;
      acc = 1e9; // il primo micro-passo parte subito
      renderButtons();
      renderClock();
    }

    function stopRun() {
      running = false;
      renderButtons();
      renderClock();
    }

    function toggleRun() {
      if (running) { stopRun(); ctx.say('In pausa.'); return; }
      if (cpu.halted) reset(false);
      startRun('run');
      ctx.say('Esecuzione a ' + SPEEDS[speedIdx] + ' hertz.');
    }

    ctx.tick((dt) => {
      if (!running) return;
      const period = runMode === 'instr' ? Math.min(INSTR_MS, 1000 / SPEEDS[speedIdx]) : 1000 / SPEEDS[speedIdx];
      acc = Math.min(acc + dt, Math.max(acc, period));
      let n = 0;
      while (running && acc >= period && n < 3) {
        acc -= period;
        n++;
        const ev = stepOnce(period);
        if (!ev || ev.halted) break;
        if (runMode === 'instr' && ev.end) { stopRun(); break; }
        if (cpu.cycles - runStart >= MAX_RUN) { stopRun(); runaway(); break; }
      }
      if (acc > period) acc = period;
    });

    function reset(announce) {
      if (running) stopRun();
      finishAnim();
      if (ringTw) { ringTw.cancel(); ringTw = null; }
      cpu = K.create(image);
      lastEv = null;
      lastAlu = null;
      clearFx();
      renderAll(false);
      renderIntro();
      if (announce) ctx.say('Reset: registri a zero, programma ricaricato in RAM.');
    }

    function loadProgram(id) {
      ex = K.loadExample(id);
      progId = ex.id;
      CP.store.set('ciclo-prog', progId);
      image = ex.bytes.slice();
      kinds = (ex.kinds || []).slice();
      selected = 0;
      editMsg('', '');
      reset(false);
      ctx.say('Caricato il programma: ' + ex.name + '.');
    }

    function onHalt() {
      running = false;
      goal.halted = true;
      const outs = cpu.outputs;
      const modified = image.some((v, i) => v !== ex.bytes[i]);
      let tip;
      if (modified && outs.length && !K.sameOutputs(outs, ex.expected)) {
        goal.changed = true;
        tip = 'Obiettivo raggiunto: hai cambiato il programma e l\'uscita è cambiata. Adesso la CPU fa una cosa nuova, e non hai toccato un solo filo.';
        ctx.done();
      } else if (modified && outs.length) {
        tip = 'Il programma è cambiato, ma l\'uscita è la stessa di prima. Cambia un numero che finisce sul display.';
      } else if (modified) {
        tip = 'Il programma è arrivato a HLT senza mostrare nulla: forse manca un OUT.';
      } else {
        tip = 'Ora tocca a te. ' + ex.tryThis + ' Poi premi Esegui.';
      }
      exNote.hidden = false;
      exNote.textContent = tip;
      renderGoal();
      renderButtons();
      renderClock();
      ctx.say('Programma terminato dopo ' + cpu.cycles + ' cicli. ' + (outs.length ? 'Uscita: ' + outs.join(', ') + '. ' : '') + tip);
    }

    function runaway() {
      exNote.hidden = false;
      exNote.textContent = 'Più di ' + CP.fmt.num(MAX_RUN) + ' cicli senza arrivare a HLT: forse un salto fa girare il programma in tondo. Premi Reset, oppure controlla i salti.';
      ctx.say(exNote.textContent);
    }

    /* ---------- spiegazioni ---------- */

    /** Che cosa fa l'istruzione, con l'operando vero al posto di «ind» e «val». */
    function descOf(d) {
      if (!d.defined) return 'codice non usato: come NOP';
      if (d.argKind === 'ind') return d.desc.replace(/\bind\b/, String(d.arg));
      if (d.argKind === 'val') return d.desc.replace(/val \(da 0 a 15\)/, String(d.arg));
      return d.desc;
    }

    function argText(d) {
      if (d.argKind === 'ind') return ['I 4 bit bassi, ', C(bin(d.arg, 4)), ', sono l\'operando: l\'indirizzo ', B(d.arg), '.'];
      if (d.argKind === 'val') return ['I 4 bit bassi, ', C(bin(d.arg, 4)), ', sono l\'operando: il numero ', B(d.arg), '.'];
      return 'I 4 bit bassi qui non servono.';
    }

    function describe(ev) {
      const p = ev.prev;
      const n = ev.next;
      const mv = ev.moves[0];
      const cell = mv && mv.cell;
      switch (ev.key) {
        case 'pc>mar':
          return { title: 'Dove sta la prossima istruzione?', body: ['Il contatore di programma mette sul bus indirizzi il suo valore, ', B(p.pc), ' (', C(bin(p.pc, 4)), '). Il registro indirizzi lo copia: ora la memoria guarda la cella ', B(p.pc), '.'] };
        case 'ram>ir':
          return { title: 'Arriva l\'istruzione', body: ['La cella ', B(cell), ' mette sul bus dati il suo byte, ', C(bin8s(n.ir)), ', e il registro d\'istruzione lo copia. Nello stesso ciclo il PC avanza da ', B(p.pc), ' a ', B(n.pc), ': è già pronto per la prossima.'] };
        case 'decode': {
          const d = K.decode(n.ir);
          if (!d.defined) return { title: 'Codice sconosciuto', body: ['I 4 bit alti, ', C(bin(d.op, 4)), ', non corrispondono a nessuna istruzione. La nostra CPU non fa nulla, come con NOP, e passa alla cella successiva.'] };
          const steps = d.exec.length ? d.exec.map((k) => K.MICRO[k].label).join(' · ') : '';
          return {
            title: 'È ' + d.text,
            body: ['I 4 bit alti, ', C(bin(d.op, 4)), ', arrivano al decodificatore: vogliono dire ', C(d.mn), '. ', argText(d), ' ',
              d.exec.length ? ['L\'unità di controllo prepara ', d.exec.length === 1 ? 'il micro-passo' : 'i ' + d.exec.length + ' micro-passi', ' dell\'istruzione: ', steps, '.'] : 'Non c\'è nulla da eseguire: si passa subito alla prossima istruzione.'],
          };
        }
        case 'ir>mar':
          return { title: 'L\'operando è un indirizzo', body: ['I 4 bit bassi dell\'istruzione, ', C(bin(n.mar, 4)), ', escono sul bus indirizzi e finiscono nel MAR: la memoria ora guarda la cella ', B(n.mar), '.'] };
        case 'ram>a':
          return { title: 'Il dato entra in A', body: ['La cella ', B(cell), ' contiene ', B(n.a), ' (', C(bin(n.a)), '). Il numero viaggia sul bus dati fino all\'accumulatore.'] };
        case 'ram>b':
          return { title: 'Il secondo numero', body: ['Dalla cella ', B(cell), ' arriva ', B(n.b), ' e va nel registro B, il secondo ingresso della ALU.'] };
        case 'add': {
          const a = ev.alu;
          return {
            title: 'La somma',
            body: ['La ALU calcola ', B(a.a), ' + ', B(a.b), ' = ', B(a.raw), '. ',
              a.carry ? ['Non sta in 8 bit: in A resta ', B(a.result), ' e si accende il riporto, C = 1. '] : 'Sta negli 8 bit, quindi C = 0. ',
              'Z = ', B(a.zero ? 1 : 0), a.zero ? ': il risultato è zero.' : ': il risultato non è zero.'],
          };
        }
        case 'sub': {
          const a = ev.alu;
          return {
            title: 'La sottrazione',
            body: ['La ALU calcola ', B(a.a), ' − ', B(a.b), '. ',
              a.carry ? ['A era grande almeno quanto B: il risultato è ', B(a.result), ', senza prestito, quindi C = 1. '] : ['A era più piccolo di B: il risultato «gira» oltre lo zero e diventa ', B(a.result), '. Serve un prestito, quindi C = 0. '],
              'Z = ', B(a.zero ? 1 : 0), '. Per sottrarre, la ALU somma il complemento a due di B.'],
          };
        }
        case 'a>ram':
          return { title: 'Si scrive in memoria', body: ['L\'accumulatore mette ', B(n.a), ' sul bus dati e la memoria lo scrive nella cella ', B(cell), ', al posto di ', B(p.ram[cell]), '.'] };
        case 'ir>a':
          return { title: 'Un numero già pronto', body: ['Con LDI l\'operando non è un indirizzo ma un valore: ', B(n.a), ' esce dall\'IR sul bus dati e va dritto in A, senza passare dalla memoria.'] };
        case 'jmp':
          return { title: 'Salto', body: ['L\'operando ', B(n.pc), ' viene scritto nel contatore di programma. La prossima istruzione arriverà dalla cella ', B(n.pc), ' invece che dalla ', B(p.pc), '.'] };
        case 'jc':
        case 'jz': {
          const f = ev.key === 'jc' ? 'C' : 'Z';
          const nm = ev.key === 'jc' ? 'riporto' : 'zero';
          return ev.taken
            ? { title: f + ' = 1: il salto avviene', body: ['Il flag ', f, ' (' + nm + ') è acceso, quindi l\'unità di controllo attiva IO e J: il PC riceve ', B(n.pc), ' e il programma riprende da lì.'] }
            : { title: f + ' = 0: niente salto', body: ['Il flag ', f, ' (' + nm + ') è spento: nessun segnale. Il PC resta ', B(n.pc), ' e il programma prosegue con la cella successiva.'] };
        }
        case 'a>out':
          return { title: 'Il risultato si vede', body: ['Il valore di A, ', B(n.a), ', viene copiato nel registro d\'uscita e compare sul display.'] };
        case 'hlt':
          return { title: 'Il clock si ferma', body: ['Il segnale HLT blocca il clock: la CPU smette di prendere istruzioni. Fine del programma, dopo ', B(cpu.cycles), ' cicli e ', B(cpu.instructions), ' istruzioni.'] };
        default:
          return { title: ev.label, body: '' };
      }
    }

    function setPhase(ph) {
      phaseLis.forEach((li) => {
        const on = li.getAttribute('data-ph') === ph;
        li.classList.toggle('is-on', on);
        if (on) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
    }

    function renderRecipe(ev) {
      const r = recipeOf(ev);
      exRecipeHead.textContent = r.known ? 'Micro-passi di ' + ev.instr.text : 'Micro-passi: dopo T3 si saprà il resto';
      exRecipe.innerHTML = '';
      const keys = r.known ? r.keys : r.keys.concat(['?']);
      keys.forEach((k, i) => {
        const t = i + 1;
        const li = h('li', { class: 'k-' + kindOfT(t) + (ev && ev.t === t ? ' is-now' : '') + (ev && ev.t > t ? ' is-done' : '') },
          h('b', null, 'T' + t), ' ', k === '?' ? 'esecuzione: dipende dall\'istruzione' : K.MICRO[k].label);
        if (ev && ev.t === t) li.setAttribute('aria-current', 'step');
        exRecipe.append(li);
      });
    }

    function renderExplain(ev) {
      const d = describe(ev);
      setPhase(ev.phase);
      exStep.textContent = 'T' + ev.t + ' · ' + ev.phase + ' · ' + ev.label;
      exTitle.textContent = d.title;
      exBody.innerHTML = '';
      exBody.append(h('span', null, d.body));
      exSig.innerHTML = '';
      if (ev.signals.length) {
        exSig.append(h('span', { class: 'k' }, 'Segnali di controllo: '),
          h('span', null, ev.signals.map((id, i) => [i ? ' · ' : '', C(id), ' ', SIG_DESC[id]])));
      } else {
        exSig.append(h('span', { class: 'k' }, 'Segnali di controllo: '), ev.key === 'decode' ? 'nessuno, lavora il decodificatore.' : 'nessuno.');
      }
      if (!ev.halted) exNote.hidden = true;
      renderRecipe(ev);
    }

    function renderIntro() {
      setPhase(null);
      exStep.textContent = 'Pronto · PC = 0';
      exTitle.textContent = ex.name;
      exBody.innerHTML = '';
      exBody.append(h('span', null, ex.about, ' Premi ', h('b', null, 'Micro-passo'), ' per vedere il primo gesto del ciclo, oppure ', h('b', null, 'Esegui'), '.'));
      exSig.innerHTML = '';
      exSig.append(h('span', { class: 'k' }, 'Segnali di controllo: '), 'li vedrai accendersi in rosa, sui blocchi e nella parola di controllo.');
      exNote.hidden = true;
      renderRecipe(null);
    }

    function showInfo(id) {
      if (anim) finishAnim();
      const meta = BLOCKS[id];
      Object.keys(st.blk).forEach((k) => st.blk[k].g.classList.remove('is-info'));
      st.blk[id].g.classList.add('is-info');
      infoId = id;
      exStep.textContent = 'Blocco';
      exTitle.textContent = meta.name;
      exBody.innerHTML = '';
      const val = blockValue(id);
      exBody.append(h('span', null, meta.info, val ? [' ', h('span', { class: 'ciclo-val' }, 'Adesso: ', val, '.')] : null));
      ctx.say(meta.name + '. ' + meta.info + (val ? ' Adesso: ' + val + '.' : ''));
    }

    function blockValue(id) {
      switch (id) {
        case 'pc': return bin(cpu.pc, 4) + ', cioè ' + cpu.pc;
        case 'mar': return bin(cpu.mar, 4) + ', cioè la cella ' + cpu.mar;
        case 'ir': return bin8s(cpu.ir) + ' (' + K.disassemble(cpu.ir) + ')';
        case 'a': return bin(cpu.a) + ', cioè ' + cpu.a;
        case 'b': return bin(cpu.b) + ', cioè ' + cpu.b;
        case 'out': case 'disp': return cpu.outSet ? String(cpu.out) : 'nessun valore';
        case 'flags': return 'Z = ' + (cpu.z ? 1 : 0) + ', C = ' + (cpu.c ? 1 : 0);
        case 'clk': return cpu.halted ? 'fermo dopo ' + cpu.cycles + ' cicli' : SPEEDS[speedIdx] + ' Hz, ' + cpu.cycles + ' cicli finora';
        case 'ram': return 'la cella ' + cpu.mar + ' contiene ' + bin8s(cpu.ram[cpu.mar]);
        case 'ctl': return lastEv ? 'T' + lastEv.t + (lastEv.instr.text ? ' di ' + lastEv.instr.text : '') : 'in attesa del primo ciclo';
        default: return '';
      }
    }

    function renderStats() {
      stCycles.textContent = CP.fmt.num(cpu.cycles);
      stInstr.textContent = CP.fmt.num(cpu.instructions);
      stCpi.textContent = cpu.instructions ? CP.fmt.num(cpu.cycles / cpu.instructions, 1) : '—';
      exOuts.innerHTML = '';
      const outs = cpu.outputs;
      exOuts.append(h('span', { class: 'k' }, 'Uscite: '),
        outs.length ? h('span', { class: 'mono' }, (outs.length > 16 ? '… ' : '') + outs.slice(-16).join(' · ')) : h('span', { class: 'dim' }, 'nessuna, per ora'));
    }

    function renderButtons() {
      microBtn.disabled = cpu.halted;
      instrBtn.disabled = cpu.halted;
      if (running) setBtn(runBtn, '❚❚', 'Pausa');
      else setBtn(runBtn, cpu.halted ? '↻' : '▶︎', cpu.halted ? 'Esegui di nuovo' : 'Esegui');
    }

    /* ---------- elenco della RAM, editor e tabella dei codici ---------- */

    const progTitle = h('h4', { class: 'ciclo-prog-t' });
    const progAbout = h('p', { class: 'ciclo-prog-about' });
    const rows = [];
    const ramList = h('ol', { class: 'ciclo-ram', 'aria-label': 'Le 16 celle della RAM: premi una cella per modificarla' });
    for (let i = 0; i < 16; i++) {
      const btn = h('button', { type: 'button', class: 'ciclo-row', 'aria-pressed': 'false', 'data-i': i, onclick: () => select(i) },
        h('span', { class: 'r-pc', 'aria-hidden': 'true' }),
        h('span', { class: 'r-addr mono' }, String(i)),
        h('span', { class: 'r-bits mono' }, h('i', { class: 'op' }), h('i', { class: 'arg' })),
        h('span', { class: 'r-hex mono' }),
        h('span', { class: 'r-asm mono' }),
        h('span', { class: 'r-dec mono' }),
        h('span', { class: 'r-note' }));
      ramList.append(h('li', null, btn));
      rows.push(btn);
    }
    ramList.addEventListener('keydown', (e) => {
      const i = rows.indexOf(document.activeElement);
      if (i < 0) return;
      let j = -1;
      if (e.key === 'ArrowDown') j = Math.min(15, i + 1);
      else if (e.key === 'ArrowUp') j = Math.max(0, i - 1);
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = 15;
      if (j < 0) return;
      e.preventDefault();
      rows[j].focus();
      select(j);
    });
    const ramHead = h('div', { class: 'ciclo-ram-head', 'aria-hidden': 'true' },
      h('span', null), h('span', null, 'cella'), h('span', null, 'binario'), h('span', null, 'hex'), h('span', null, 'assembly'), h('span', null, 'num.'), h('span', null, 'nota'));

    function renderListing() {
      progTitle.textContent = 'In memoria: ' + ex.name.toLowerCase();
      progAbout.textContent = ex.tryThis;
      for (let i = 0; i < 16; i++) {
        const v = cpu.ram[i];
        const r = rows[i];
        const sp = r.children;
        sp[2].firstChild.textContent = bin(v >> 4, 4);
        sp[2].lastChild.textContent = bin(v & 15, 4);
        const isData = kinds[i] === 'data';
        sp[3].textContent = hex2(v);
        sp[4].textContent = isData ? String(v) : K.disassemble(v);
        sp[5].textContent = String(v);
        r.classList.toggle('is-data', isData);
        const edited = image[i] !== ex.bytes[i];
        sp[6].textContent = edited ? 'modificata' : (ex.notes[i] || '');
        const isPc = cpu.pc === i && !cpu.halted;
        sp[0].textContent = isPc ? '▶' : '';
        r.classList.toggle('is-pc', isPc);
        r.classList.toggle('is-mar', cpu.mar === i);
        r.classList.toggle('is-edited', edited);
        r.classList.toggle('is-cur', !!lastEv && !lastEv.end && lastEv.instr.addr === i);
        r.setAttribute('aria-pressed', String(i === selected));
        r.setAttribute('aria-label', 'Cella ' + i + ': ' + bin8s(v) + ', ' + (isData ? 'dato ' + v + ' (come istruzione: ' + K.disassemble(v) + ')' : K.disassemble(v) + ', numero ' + v) + '.' +
          (edited ? ' Modificata.' : (ex.notes[i] ? ' ' + ex.notes[i] + '.' : '')) + (isPc ? ' Qui punta il PC.' : ''));
      }
    }

    // editor della cella scelta
    const edTitle = h('h4', { class: 'ciclo-ed-t', id: 'ciclo-ed-t' });
    const bitBtns = [];
    for (let k = 7; k >= 0; k--) {
      const b = h('button', { type: 'button', class: 'ciclo-bit mono', 'aria-pressed': 'false', onclick: () => toggleBit(k) }, '0');
      b.dataset.bit = k;
      bitBtns.push(b);
    }
    const nib = (btns, cls, label) => h('div', { class: 'ciclo-nib ' + cls }, h('span', { class: 'ciclo-nib-l' }, label), h('div', { class: 'ciclo-nib-b' }, btns));
    const hexIn = h('input', { type: 'text', id: 'ciclo-hex', class: 'ciclo-in mono', maxlength: '2', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'characters', 'aria-describedby': 'ciclo-ed-dis' });
    const asmIn = h('input', { type: 'text', id: 'ciclo-asm', class: 'ciclo-in mono', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'characters', placeholder: 'es. ADD 15', 'aria-describedby': 'ciclo-ed-msg' });
    const asmBtn = ui.button({ label: 'Scrivi', icon: '↵', title: 'Scrivi l\'istruzione nella cella e passa alla successiva', onClick: applyAsm });
    const edDis = h('p', { class: 'ciclo-ed-dis', id: 'ciclo-ed-dis' });
    const edMsg = h('p', { class: 'ciclo-ed-msg', id: 'ciclo-ed-msg', 'aria-live': 'polite' });
    const prevBtn = ui.button({ label: 'Cella prima', icon: '‹', onClick: () => select((selected + 15) % 16) });
    const nextBtn = ui.button({ label: 'Cella dopo', icon: '›', onClick: () => select((selected + 1) % 16) });
    const restoreBtn = ui.button({ label: 'Ripristina il programma', icon: '↺', title: 'Rimette il programma d\'esempio com\'era', onClick: restore });
    const clearBtn = ui.button({ label: 'Svuota la RAM', icon: '∅', className: 'danger', title: 'Tutte le celle a zero: scrivi il tuo programma', onClick: clearRam });

    const editor = h('section', { class: 'ciclo-ed', 'aria-labelledby': 'ciclo-ed-t' },
      edTitle,
      h('div', { class: 'ciclo-bits', role: 'group', 'aria-label': 'Gli 8 bit della cella: premi un bit per cambiarlo' },
        nib(bitBtns.slice(0, 4), 'op', 'codice operativo'), nib(bitBtns.slice(4), 'arg', 'operando')),
      h('div', { class: 'ciclo-fields' },
        h('label', { class: 'ciclo-field', for: 'ciclo-hex' }, h('span', null, 'Esadecimale'), hexIn),
        h('div', { class: 'ciclo-field grow' }, h('label', { for: 'ciclo-asm' }, 'Assembly (Invio scrive)'), h('div', { class: 'ciclo-asm-row' }, asmIn, asmBtn))),
      edDis, edMsg,
      h('div', { class: 'ciclo-ed-actions' }, prevBtn, nextBtn, restoreBtn, clearBtn));

    hexIn.addEventListener('input', () => {
      const t = hexIn.value.trim();
      if (!t) return;
      if (/^[0-9a-f]{1,2}$/i.test(t)) { writeCell(selected, parseInt(t, 16), true); editMsg('', ''); }
      else editMsg('Usa le cifre da 0 a 9 e da A a F, al massimo due.', 'err');
    });
    hexIn.addEventListener('blur', () => renderEditor());
    hexIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); renderEditor(); hexIn.select(); } });
    asmIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyAsm(); } });

    function select(i) {
      selected = ((i % 16) + 16) % 16;
      editMsg('', '');
      renderListing();
      renderRam(false);
      renderEditor();
    }

    function editMsg(text, kind) {
      edMsg.textContent = text;
      edMsg.className = 'ciclo-ed-msg' + (kind ? ' is-' + kind : '');
    }

    function renderEditor() {
      const v = cpu.ram[selected];
      const d = K.decode(v);
      const edited = image[selected] !== ex.bytes[selected];
      edTitle.innerHTML = '';
      edTitle.append('Cella ', h('b', { class: 'mono' }, String(selected)));
      if (edited) edTitle.append(h('span', { class: 'ciclo-badge' }, 'modificata'));
      bitBtns.forEach((b) => {
        const k = +b.dataset.bit;
        const on = (v >> k) & 1;
        b.textContent = String(on);
        b.setAttribute('aria-pressed', String(!!on));
        b.setAttribute('aria-label', 'Bit ' + k + ' (vale ' + (1 << k) + '): ' + on);
      });
      if (document.activeElement !== hexIn) hexIn.value = hex2(v);
      edDis.innerHTML = '';
      edDis.append('Come istruzione: ', C(d.text), ', ' + descOf(d) + '. Come numero: ', B(v), '.');
      const pv = (selected + 15) % 16;
      const nx = (selected + 1) % 16;
      prevBtn.querySelector('span:last-child').textContent = 'Cella ' + pv;
      nextBtn.querySelector('span:last-child').textContent = 'Cella ' + nx;
      prevBtn.setAttribute('aria-label', 'Cella precedente, la ' + pv);
      nextBtn.setAttribute('aria-label', 'Cella successiva, la ' + nx);
      restoreBtn.disabled = !image.some((x, i) => x !== ex.bytes[i]);
    }

    function writeCell(i, v, fromHex) {
      v &= 255;
      const changed = cpu.ram[i] !== v || image[i] !== v;
      image[i] = v;
      cpu.ram[i] = v;
      renderRam(false);
      renderListing();
      if (!fromHex) renderEditor();
      else {
        // l'utente sta scrivendo nel campo esadecimale: aggiorna tutto tranne il campo
        const keep = hexIn.value;
        renderEditor();
        hexIn.value = keep;
      }
      if (changed) glowEl(st.cells[i].flash, 0.8);
      if (goal.halted && !goal.changed) { exNote.hidden = false; exNote.textContent = 'Cella ' + i + ' cambiata. Premi ' + (cpu.halted ? '«Esegui di nuovo»' : '«Reset» e poi «Esegui»') + ' per vedere che cosa succede.'; }
    }

    function toggleBit(k) {
      writeCell(selected, cpu.ram[selected] ^ (1 << k), false);
      ctx.say('Bit ' + k + ' della cella ' + selected + ': ora vale ' + ((cpu.ram[selected] >> k) & 1) + '. ' + K.disassemble(cpu.ram[selected]) + '.');
    }

    function applyAsm() {
      const r = K.assembleLine(asmIn.value);
      if (!r.ok) { editMsg(r.error, 'err'); ctx.say(r.error); return; }
      const at = selected;
      kinds[at] = r.kind;
      writeCell(at, r.byte, false);
      const msg = 'Cella ' + at + ': ' + (r.kind === 'data' ? 'il numero ' + r.byte : K.disassemble(r.byte)) + ' = ' + hex2(r.byte) + ' = ' + bin8s(r.byte) + '.';
      asmIn.value = '';
      select(at + 1);
      editMsg(msg, 'ok');
      ctx.say(msg + ' Ora sei sulla cella ' + selected + '.');
    }

    function restore() {
      image = ex.bytes.slice();
      kinds = (ex.kinds || []).slice();
      reset(false);
      editMsg('Programma d\'esempio ripristinato.', 'ok');
      ctx.say('Programma d\'esempio ripristinato.');
    }

    function clearRam() {
      image = new Array(16).fill(0);
      kinds = new Array(16).fill(null);
      reset(false);
      select(0);
      editMsg('RAM svuotata: tutte le celle valgono 0, cioè NOP. Scrivi il tuo programma, per esempio LDI 7, OUT, HLT.', 'ok');
      ctx.say('RAM svuotata.');
      asmIn.focus();
    }

    // tabella dei codici
    const isaRows = {};
    const isaBody = h('tbody', null);
    K.ISA.forEach((d) => {
      const tr = h('tr', null,
        h('td', { class: 'mono' }, bin(d.op, 4)),
        h('td', { class: 'mono' }, d.op.toString(16).toUpperCase()),
        h('td', { class: 'mono b' }, d.mn + (d.arg ? ' ' + d.arg : '')),
        h('td', null, d.desc),
        h('td', { class: 'mono num' }, String(K.cyclesOf(d.op << 4))));
      isaRows[d.op] = tr;
      isaBody.append(tr);
    });
    const unusedRow = h('tr', { class: 'dim' }, h('td', { class: 'mono' }, '1001–1101'), h('td', { class: 'mono' }, '9–D'), h('td', { class: 'mono b' }, '—'), h('td', null, 'non usati: la CPU non fa nulla, come con NOP'), h('td', { class: 'mono num' }, '3'));
    isaBody.append(unusedRow);
    const isa = h('div', { class: 'ciclo-isa-wrap' },
      h('table', { class: 'ciclo-isa' },
        h('caption', null, 'Tabella dei codici. ', h('span', null, 'ind = indirizzo di una cella, val = numero da 0 a 15.')),
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Codice'), h('th', { scope: 'col' }, 'Hex'), h('th', { scope: 'col' }, 'Assembly'), h('th', { scope: 'col' }, 'Che cosa fa'), h('th', { scope: 'col' }, 'Cicli'))),
        isaBody));

    function renderIsa() {
      Object.keys(isaRows).forEach((k) => isaRows[k].classList.remove('is-now'));
      unusedRow.classList.remove('is-now');
      if (!lastEv || !lastEv.instr.text) return;
      const op = lastEv.instr.byte >> 4;
      (isaRows[op] || unusedRow).classList.add('is-now');
    }

    /* ---------- obiettivo ---------- */

    const goal1 = h('span', { class: 'ciclo-g' }, '① fino a HLT');
    const goal2 = h('span', { class: 'ciclo-g' }, '② modifica e uscita diversa');
    const goalEl = h('p', { class: 'cp-goal ciclo-goal' },
      h('span', null, h('b', null, 'Obiettivo: '), 'esegui un programma fino a HLT; poi cambia una cella della RAM e fallo arrivare di nuovo a HLT con un\'uscita diversa.'),
      h('span', { class: 'ciclo-gs' }, goal1, goal2));

    function renderGoal() {
      goal1.classList.toggle('is-ok', goal.halted);
      goal2.classList.toggle('is-ok', goal.changed);
      goal1.setAttribute('aria-label', 'Primo passo, fino a HLT: ' + (goal.halted ? 'fatto' : 'da fare'));
      goal2.setAttribute('aria-label', 'Secondo passo, modifica e uscita diversa: ' + (goal.changed ? 'fatto' : 'da fare'));
    }

    /* ---------- montaggio ---------- */

    mount.append(
      bar,
      h('div', { class: 'cp-lab-grid ciclo-grid' }, stageBox, explain),
      h('div', { class: 'ciclo-work' },
        h('section', { class: 'ciclo-prog', 'aria-label': 'Il programma in memoria' }, progTitle, progAbout, ramHead, ramList),
        h('div', { class: 'ciclo-side' }, editor, isa)),
      ui.legend([['Bus indirizzi', 'var(--sig-addr)'], ['Bus dati', 'var(--sig-data)'], ['Controllo e decodifica', 'var(--sig-ctrl)'], ['Esecuzione, ALU e flag', 'var(--sig-on)']]),
      h('p', { class: 'cp-hint' }, 'Suggerimento: clicca un blocco del disegno per sapere che cosa fa. «Reset» rimette i registri a zero e ricarica in RAM il programma, comprese le tue modifiche.'),
      goalEl);

    const mq = window.matchMedia ? window.matchMedia('(max-width: 720px)') : null;
    function pickLayout() { return mq && mq.matches ? LAYOUTS.narrow : LAYOUTS.wide; }
    buildStage(pickLayout());
    if (mq) {
      const onChange = () => {
        const next = pickLayout();
        if (next === L) return;
        finishAnim();
        const keepInfo = infoId;
        buildStage(next);
        renderAll(false);
        if (keepInfo) showInfo(keepInfo);
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
    }

    renderAll(false);
    renderIntro();
    renderGoal();
  });
})();
