/*
 * Capitolo 2 · Le porte logiche (1913 – oggi).
 * Dai circuiti a coincidenza di Bothe e Rossi alle sette porte di ogni chip: simboli, porte universali,
 * ritardi e parità. Laboratori: caccia ai raggi cosmici (coincidenza = AND), il banco delle porte,
 * tutto con le NAND, le porte non sono istantanee (ritardo e glitch), il controllo di parità (XOR).
 */
(function () {
  'use strict';

  const { h, s, ui, draw } = PL;

  const rand = (a, b) => a + Math.random() * (b - a);
  // Filo a gomito: orizzontale fino a vx, poi verticale, poi orizzontale fino al punto d'arrivo.
  const elbow = (x1, y1, x2, y2, vx) => (Math.abs(y1 - y2) < 0.5 ? [[x1, y1], [x2, y2]] : [[x1, y1], [vx, y1], [vx, y2], [x2, y2]]);
  const countOnes = (v) => v.reduce((a, b) => a + b, 0);

  /* ---------- figura: anatomia di una porta ---------- */

  function figAnatomy() {
    const art = PL.svg('0 0 620 236', { role: 'img', 'aria-label': 'Anatomia di una porta AND: due ingressi a sinistra, un\'uscita a destra, l\'alimentazione a 5 volt in alto e la massa in basso' });
    const gate = draw.gate('AND', { x: 240, y: 76, w: 120 });
    const top = 286;
    const wA = draw.wire([[92, gate.inputs[0].y], [gate.inputs[0].x, gate.inputs[0].y]], { level: 1 });
    const wB = draw.wire([[92, gate.inputs[1].y], [gate.inputs[1].x, gate.inputs[1].y]], { level: 1 });
    const wQ = draw.wire([[gate.output.x, gate.output.y], [500, gate.output.y]], { level: 1 });
    gate.set(1);
    art.append(
      s('line', { class: 'p0-rail', x1: top, y1: 44, x2: top, y2: 76 }),
      s('line', { class: 'p0-rail', x1: top, y1: 76 + gate.height, x2: top, y2: 194 }),
      draw.supply(top, 44, '+5 V'),
      draw.ground(top, 194),
      wA, wB, wQ, gate.g,
      s('text', { class: 'p0-in', x: 292, y: gate.output.y + 6, 'text-anchor': 'middle' }, 'AND'),
      draw.label(76, gate.inputs[0].y + 6, 'A', 'p0-pin', 'end'),
      draw.label(76, gate.inputs[1].y + 6, 'B', 'p0-pin', 'end'),
      draw.label(516, gate.output.y + 6, 'Q', 'p0-pin', 'start'),
      draw.label(150, gate.inputs[0].y - 16, 'ingressi', 'p0-note'),
      draw.label(440, gate.output.y - 16, 'uscita', 'p0-note'),
      draw.label(top + 14, 64, 'alimentazione', 'p0-note', 'start'),
      draw.label(top + 14, 186, 'massa (0 V)', 'p0-note', 'start'));
    const legend = h('div', { class: 'p0-legend' },
      h('span', { class: 'p0-chip is-1' }, h('b', null, '1'), ' tensione alta, vicina a 5 V'),
      h('span', { class: 'p0-chip is-0' }, h('b', null, '0'), ' tensione bassa, vicina a 0 V'),
      h('span', { class: 'p0-chip' }, 'dentro: relè, valvole o transistor'));
    return ui.figure({
      art: [art, legend],
      caption: 'Ogni porta ha i suoi ingressi, un\'uscita e due collegamenti all\'alimentazione, che negli schemi logici di solito non si disegnano. Che sia fatta di relè, di valvole o di transistor, conta solo la regola che lega l\'uscita agli ingressi: qui A = 1 e B = 1, quindi la AND dà 1.',
    });
  }

  /* ---------- laboratorio: caccia ai raggi cosmici ---------- */

  function labCoincidence() {
    const W = 600;
    const H = 270;
    const TX = 34;
    const TW = 254;
    const TH = 34;
    // finestra di coincidenza: due impulsi più vicini di così contano come simultanei
    const WINDOW = 0.04;
    const COSMIC_RATE = 0.5;
    const tubesY = [92, 184];
    const st = {
      t: 0, bg: 0.8, mode: 'and', hits: [0, 0], coinc: 0, cosmic: 0, accidental: 0,
      nextCosmic: 0.8, nextBg: [0.4, 1.1], sigUntil: [-9, -9], flashUntil: [-9, -9], last: ['', ''], outUntil: -9, out: 0,
    };
    const art = PL.svg('0 0 ' + W + ' ' + H, { class: 'pl-svg p1-art', role: 'img', 'aria-label': 'Due contatori Geiger uno sopra l\'altro collegati a una porta AND: i raggi cosmici li attraversano entrambi, i colpi della radioattività di fondo ne colpiscono uno solo' });
    const sky = s('rect', { class: 'p1-sky', x: 0, y: 0, width: TX + TW + 30, height: H, rx: 14 });
    const tubes = tubesY.map((y, k) => {
      const g = s('g', { class: 'p1-tube' },
        s('rect', { class: 'p1-glass', x: TX, y: y - TH / 2, width: TW, height: TH, rx: TH / 2 }),
        s('line', { class: 'p1-anode', x1: TX + 16, y1: y, x2: TX + TW - 8, y2: y }),
        s('rect', { class: 'p1-cap', x: TX + TW - 6, y: y - 9, width: 12, height: 18, rx: 3 }));
      g.append(draw.label(TX + 12, y - TH / 2 - 9, 'contatore ' + (k ? 'B' : 'A'), 'p1-name', 'start'));
      return g;
    });
    const tracks = s('g', { class: 'p1-tracks' });
    const gate = draw.gate('AND', { x: 440, y: 113, w: 72 });
    const wA = draw.wire(elbow(TX + TW + 6, tubesY[0], gate.inputs[0].x, gate.inputs[0].y, 376));
    const wB = draw.wire(elbow(TX + TW + 6, tubesY[1], gate.inputs[1].x, gate.inputs[1].y, 376));
    const wQ = draw.wire([[gate.output.x, gate.output.y], [550, gate.output.y]]);
    [wA, wB, wQ].forEach((p) => draw.setWire(p, 0, { animate: false }));
    const led = draw.led(568, gate.output.y, { r: 10 });
    const big = s('text', { class: 'p1-count', x: 510, y: gate.output.y + 78, 'text-anchor': 'middle' }, '0');
    const bigLabel = s('text', { class: 'p1-count-label', x: 510, y: gate.output.y + 98, 'text-anchor': 'middle' }, 'coincidenze');
    art.append(sky, ...tubes, tracks, wA, wB, wQ, gate.g, led.g, big, bigLabel,
      draw.label(gate.output.x - 36, gate.inputs[0].y - 30, 'circuito a coincidenza', 'p1-name'));

    const lv = { a: 0, b: 0, q: 0 };
    let live = [];
    let statics = [];
    const total = h('p', { class: 'p1-total pl-mono' });
    const explain = h('p', { class: 'p1-explain' });

    function updateText() {
      big.textContent = PL.fmt(st.mode === 'and' ? st.coinc : st.hits[0]);
      bigLabel.textContent = st.mode === 'and' ? 'coincidenze' : 'colpi su A';
      total.textContent = 'Raggi cosmici passati: ' + PL.fmt(st.cosmic) + ' · colpi su A: ' + PL.fmt(st.hits[0]) + ' · su B: ' + PL.fmt(st.hits[1]) + ' · coincidenze: ' + PL.fmt(st.coinc);
      let why;
      if (st.mode === 'a') {
        const extra = Math.max(0, st.hits[0] - st.cosmic);
        why = 'Il contatore A da solo conta tutto: ' + (st.hits[0] ? PL.fmt(extra) + ' dei suoi ' + PL.fmt(st.hits[0]) + ' colpi non sono raggi cosmici ma radioattività di fondo.' : 'aspetta qualche colpo.');
      } else if (!st.coinc) {
        why = 'Il circuito a coincidenza ignora i colpi isolati: dà un impulso solo quando A e B scattano insieme. È una porta AND.';
      } else if (st.accidental / st.coinc < 0.3) {
        why = 'Quasi ogni coincidenza è un raggio cosmico: il fondo colpisce un contatore alla volta, e la porta AND lo scarta.';
        if (st.accidental) why += ' ' + PL.fmt(st.accidental) + (st.accidental === 1 ? ' coincidenza è stata casuale' : ' coincidenze sono state casuali') + ': due colpi di fondo caduti per caso nello stesso istante. I fisici imparano a stimarle e a sottrarle.';
      } else {
        why = 'Con tanto fondo, anche due colpi indipendenti cadono spesso nello stesso istante: ' + PL.fmt(st.accidental) + ' coincidenze su ' + PL.fmt(st.coinc) + ' sono casuali. Per questo i fisici usano finestre di coincidenza brevissime e sottraggono le coincidenze casuali stimate.';
      }
      explain.textContent = why;
    }

    // colpi arrivati nello stesso istante (un raggio cosmico colpisce i due contatori insieme)
    function hits(ks, kind) {
      ks.forEach((k) => {
        st.hits[k] += 1;
        st.last[k] = kind;
        st.sigUntil[k] = st.t + WINDOW;
        st.flashUntil[k] = st.t + 0.18;
        draw.pulse(k ? wB : wA, { duration: 360 });
      });
      evaluate();
      updateText();
    }

    function evaluate() {
      const a = st.t < st.sigUntil[0] ? 1 : 0;
      const b = st.t < st.sigUntil[1] ? 1 : 0;
      if (a !== lv.a) { lv.a = a; draw.setWire(wA, a, { animate: false }); }
      if (b !== lv.b) { lv.b = b; draw.setWire(wB, b, { animate: false }); }
      const out = a & b;
      if (out && !st.out) {
        st.coinc += 1;
        if (st.last[0] !== 'ray' || st.last[1] !== 'ray') st.accidental += 1;
        st.outUntil = st.t + 0.32;
        draw.pulse(wQ, { duration: 300 });
        updateText();
      }
      st.out = out;
      gate.set(out);
      const q = st.t < st.outUntil ? 1 : 0;
      if (q !== lv.q) { lv.q = q; draw.setWire(wQ, q, { duration: 120 }); led.set(q); }
      tubes.forEach((g, k) => g.classList.toggle('is-hit', st.t < st.flashUntil[k]));
    }

    function addTrack(kind, x0, y0, x1, y1, hitList, dur) {
      const el = s('line', { class: 'p1-' + kind, x1: x0, y1: y0, x2: x1, y2: y1, pathLength: 1 });
      el.style.strokeDasharray = '1 1';
      tracks.append(el);
      if (!loopCtl.running) {
        // movimento ridotto o simulazione in pausa: il colpo si vede subito, fermo.
        el.style.strokeDashoffset = '0';
        statics.push(el);
        while (statics.length > 3) statics.shift().remove();
        hits(hitList.map((x) => x.k), kind);
        return;
      }
      el.style.strokeDashoffset = '1';
      live.push({ el, born: st.t, dur, kind, hits: hitList.map((x) => Object.assign({ done: false }, x)) });
    }

    function spawnCosmic() {
      st.cosmic += 1;
      const x0 = rand(TX + 34, TX + TW - 34);
      const x1 = Math.min(TX + TW - 14, Math.max(TX + 14, x0 + rand(-56, 56)));
      const y0 = -12;
      const y1 = H + 12;
      // la particella viaggia quasi alla velocità della luce: per i contatori i due colpi sono simultanei,
      // quindi li registriamo insieme quando la traccia disegnata raggiunge il contatore più basso
      const fB = (tubesY[1] - y0) / (y1 - y0);
      addTrack('ray', x0, y0, x1, y1, [{ k: 0, f: fB }, { k: 1, f: fB }], 0.36);
      updateText();
    }

    function spawnBg(k) {
      const qx = rand(TX + 24, TX + TW - 24);
      const qy = tubesY[k] + rand(-7, 7);
      const above = Math.random() < 0.5;
      const py = k === 0 ? (above ? rand(14, 52) : rand(120, 140)) : (above ? rand(146, 160) : rand(214, 258));
      const px = Math.min(TX + TW + 20, Math.max(6, qx + rand(-80, 80)));
      addTrack('bg', px, py, qx, qy, [{ k, f: 1 }], 0.28);
    }

    const expo = (rate) => (rate > 0 ? -Math.log(1 - Math.random()) / rate : Infinity);

    const loopCtl = PL.loop((dt) => {
      st.t += dt;
      const t = st.t;
      if (t >= st.nextCosmic) { spawnCosmic(); st.nextCosmic = t + expo(COSMIC_RATE); }
      for (let k = 0; k < 2; k++) {
        if (t >= st.nextBg[k]) { spawnBg(k); st.nextBg[k] = t + expo(st.bg); }
      }
      live = live.filter((tr) => {
        const p = (t - tr.born) / tr.dur;
        tr.el.style.strokeDashoffset = String(Math.max(0, 1 - p));
        const due = tr.hits.filter((x) => !x.done && p >= x.f);
        if (due.length) { due.forEach((x) => { x.done = true; }); hits(due.map((x) => x.k), tr.kind); }
        if (p > 1) tr.el.style.opacity = String(Math.max(0, 1 - ((p - 1) * tr.dur) / 0.7));
        if ((p - 1) * tr.dur > 0.7) { tr.el.remove(); return false; }
        return true;
      });
      evaluate();
    }, { el: art, autostart: !PL.reduced() });

    const playBtn = ui.btn({
      label: loopCtl.running ? '❚❚ Pausa' : '▶︎ Avvia', kind: 'lab',
      onClick: () => {
        loopCtl.toggle();
        playBtn.lastChild.textContent = loopCtl.running ? '❚❚ Pausa' : '▶︎ Avvia';
        if (loopCtl.running) { statics.forEach((el) => el.remove()); statics = []; }
      },
    });
    const mode = ui.segmented({
      label: 'Che cosa conta il contatore',
      options: [{ value: 'and', label: 'Solo coincidenze (A AND B)' }, { value: 'a', label: 'Tutti i colpi di A' }],
      value: 'and',
      onChange: (v) => { st.mode = v; updateText(); },
    });
    const bg = ui.slider({
      label: 'Radioattività di fondo', min: 0, max: 4, step: 0.2, value: st.bg,
      format: (v) => PL.fmt(v, 1) + ' colpi/s',
      onInput: (v) => { st.bg = v; st.nextBg = [st.t + expo(v), st.t + expo(v)]; },
    });
    const once = ui.btn({
      label: 'Fai passare un raggio cosmico', kind: 'lab',
      onClick: () => { if (!loopCtl.running) st.t += 1; spawnCosmic(); if (!loopCtl.running) evaluate(); },
    });
    const noiseOnce = ui.btn({
      label: 'Un colpo di fondo', kind: 'lab',
      onClick: () => { if (!loopCtl.running) st.t += 1; spawnBg(Math.random() < 0.5 ? 0 : 1); if (!loopCtl.running) evaluate(); },
    });
    const reset = ui.btn({
      label: 'Azzera', kind: 'lab',
      onClick: () => { st.hits = [0, 0]; st.coinc = 0; st.cosmic = 0; st.accidental = 0; updateText(); },
    });
    updateText();
    return ui.lab({
      title: 'Caccia ai raggi cosmici',
      intro: 'Due contatori Geiger, uno sopra l\'altro. Un raggio cosmico che piove dall\'alto li attraversa entrambi; la radioattività dei muri e delle rocce ne colpisce uno alla volta. Lascia correre la simulazione e confronta i due modi di contare.',
      controls: [playBtn, mode.el, bg.el, once, noiseOnce, reset],
      stage: art,
      readout: [total, explain],
      caption: 'Le tracce azzurre sono raggi cosmici, quelle gialle colpi di fondo. Ogni colpo produce un impulso brevissimo: se i due contatori scattano nello stesso istante, la porta AND dà un impulso in uscita. Alza il fondo e vedrai crescere anche le coincidenze casuali, che aumentano con il quadrato del fondo. Tempi e frequenze sono rallentati per renderli visibili.',
    });
  }

  /* ---------- laboratorio: il banco delle porte ---------- */

  const OPS = { AND: ' · ', NAND: ' · ', OR: ' + ', NOR: ' + ', XOR: ' ⊕ ', XNOR: ' ⊕ ' };
  function exprFor(type, n) {
    if (type === 'BUF') return 'Q = A';
    if (type === 'NOT') return 'Q = <span class="ovl">A</span>';
    const core = ['A', 'B', 'C'].slice(0, n).join(OPS[type]);
    return 'Q = ' + (Logic.GATES[type].neg ? '<span class="ovl">' + core + '</span>' : core);
  }

  function explainGate(type, v, out) {
    const n = v.length;
    const k = countOnes(v);
    switch (type) {
      case 'BUF': return 'Il buffer copia l\'ingresso: entra ' + v[0] + ', esce ' + out + '. Non cambia il valore ma rigenera il segnale.';
      case 'NOT': return 'L\'ingresso è ' + v[0] + ' e la NOT lo capovolge: esce ' + out + '.';
      case 'AND': return k === n ? 'Tutti gli ingressi sono 1: la AND dà 1.' : 'Basta un solo 0 per spegnere la AND: l\'uscita è 0.';
      case 'OR': return k ? 'Almeno un ingresso è 1, e alla OR tanto basta: l\'uscita è 1.' : 'Nessun ingresso è 1: la OR dà 0.';
      case 'NAND': return k === n ? 'Tutti gli ingressi sono 1: è l\'unico caso in cui la NAND dà 0.' : 'Non tutti gli ingressi sono 1, quindi la NAND dà 1.';
      case 'NOR': return k ? 'C\'è almeno un 1, quindi la NOR dà 0.' : 'Tutti gli ingressi sono 0: è l\'unico caso in cui la NOR dà 1.';
      case 'XOR': return n === 2 ? (out ? 'Gli ingressi sono diversi: la XOR dà 1.' : 'Gli ingressi sono uguali: la XOR dà 0.') : 'Gli 1 sono ' + k + ', un numero ' + (k % 2 ? 'dispari: la XOR dà 1.' : 'pari: la XOR dà 0.');
      case 'XNOR': return n === 2 ? (out ? 'Gli ingressi sono uguali: la XNOR dà 1. Per questo si usa per confrontare due bit.' : 'Gli ingressi sono diversi: la XNOR dà 0.') : 'Gli 1 sono ' + k + ', un numero ' + (k % 2 ? 'dispari: la XNOR dà 0.' : 'pari: la XNOR dà 1.');
      default: return '';
    }
  }

  function labBench() {
    const st = { type: 'AND', style: 'ansi', n: 2, v: [1, 0, 0] };
    const art = PL.svg('0 0 420 236', { role: 'img', 'aria-label': 'La porta scelta con i suoi ingressi a sinistra e l\'uscita a destra' });
    const layer = s('g');
    art.append(layer);
    let parts = null;

    const ROWS = { 1: [118], 2: [70, 166], 3: [56, 118, 180] };
    const single = () => st.type === 'NOT' || st.type === 'BUF';
    const nIn = () => (single() ? 1 : st.n);

    function build() {
      layer.replaceChildren();
      const n = nIn();
      const G = Logic.GATES[st.type];
      const gate = draw.gate(st.type, { x: 156, y: 79, w: 112, inputs: n, style: st.style, label: G.name + (G.it ? ' · ' + G.it : '') });
      const rows = ROWS[n];
      const ins = rows.map((y, i) => draw.wire(elbow(54, y, gate.inputs[i].x, gate.inputs[i].y, 116)));
      const wQ = draw.wire([[gate.output.x, gate.output.y], [356, gate.output.y]]);
      [...ins, wQ].forEach((p) => draw.setWire(p, 0, { animate: false }));
      const led = draw.led(382, gate.output.y, { r: 12 });
      const labels = rows.map((y, i) => draw.label(22, y + 6, ['A', 'B', 'C'][i], 'p2-pin', 'start'));
      const vals = rows.map((y) => s('text', { class: 'p2-val', x: 40, y: y + 6, 'text-anchor': 'start' }, '0'));
      const qLabel = s('text', { class: 'p2-pin', x: 382, y: gate.output.y + 44, 'text-anchor': 'middle' }, 'Q');
      layer.append(...ins, wQ, gate.g, led.g, ...labels, ...vals, qLabel);
      const flow = draw.flow(wQ);
      gate.g.classList.add('p2-enter');
      parts = { gate, ins, wQ, led, vals, flow, qLabel };
    }

    const rule = h('p', { class: 'p2-rule' });
    const expr = h('p', { class: 'p2-expr pl-mono' });
    const tableBox = h('div', { class: 'p2-table' });
    let tt = null;
    function buildTable() {
      const n = nIn();
      const names = ['A', 'B', 'C'].slice(0, n);
      tt = ui.truthTable({
        inputs: names,
        outputs: ['Q'],
        rows: Logic.combos(n).map((c) => c.concat(Logic.evalGate(st.type, c))),
        onPick: (i, r) => { r.slice(0, n).forEach((b, j) => { st.v[j] = b; toggles[j].set(b, true); }); update(); },
      });
      tableBox.replaceChildren(tt.el);
      rule.textContent = Logic.GATES[st.type].rule;
      expr.innerHTML = exprFor(st.type, n);
    }

    const readout = h('p');
    function update() {
      const n = nIn();
      const v = st.v.slice(0, n);
      const out = Logic.evalGate(st.type, v);
      parts.ins.forEach((p, i) => draw.setWire(p, v[i]));
      parts.vals.forEach((t, i) => { t.textContent = String(v[i]); t.classList.toggle('is-1', v[i] === 1); });
      draw.setWire(parts.wQ, out, { duration: 380 });
      parts.gate.set(out);
      parts.led.set(out);
      parts.flow.set(out === 1 && !PL.reduced());
      parts.qLabel.textContent = 'Q = ' + out;
      tt.highlight(Logic.fromBits(v));
      readout.replaceChildren(h('strong', null, v.map((b, i) => ['A', 'B', 'C'][i] + ' = ' + b).join(', ') + ' → Q = ' + out + '. '), explainGate(st.type, v, out));
    }

    const toggles = ['A', 'B', 'C'].map((name, i) => ui.toggle({ label: name, value: st.v[i], onChange: (b) => { st.v[i] = b; update(); } }));
    const gateSel = ui.segmented({
      label: 'Porta',
      options: ['BUF', 'NOT', 'AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'].map((t) => ({ value: t, label: t === 'BUF' ? 'Buffer' : t })),
      value: st.type,
      onChange: (t) => { st.type = t; sync(); },
    });
    const styleSel = ui.segmented({
      label: 'Stile del simbolo',
      options: [{ value: 'ansi', label: 'Simbolo ANSI' }, { value: 'iec', label: 'Simbolo IEC' }],
      value: st.style,
      onChange: (v) => { st.style = v; build(); update(); },
    });
    const nSel = ui.segmented({
      label: 'Numero di ingressi',
      options: [{ value: 2, label: '2 ingressi' }, { value: 3, label: '3 ingressi' }],
      value: st.n,
      onChange: (v) => { st.n = Number(v); sync(); },
    });
    let tour = 0;
    const tourBtn = ui.btn({
      label: 'Prova tutte le combinazioni', kind: 'lab',
      onClick: () => {
        clearTimeout(tour);
        const n = nIn();
        const all = Logic.combos(n);
        let i = 0;
        const step = () => {
          all[i].forEach((b, j) => { st.v[j] = b; toggles[j].set(b, true); });
          update();
          i += 1;
          if (i < all.length) tour = setTimeout(step, PL.reduced() ? 450 : 1000);
        };
        step();
      },
    });
    PL.onCleanup(() => clearTimeout(tour));

    function sync() {
      clearTimeout(tour);
      toggles[1].style.display = single() ? 'none' : '';
      toggles[2].style.display = !single() && st.n === 3 ? '' : 'none';
      nSel.el.style.display = single() ? 'none' : '';
      build();
      buildTable();
      update();
    }

    sync();
    return ui.lab({
      title: 'Il banco delle porte',
      intro: 'Scegli una porta, accendi e spegni gli ingressi e guarda l\'uscita. La riga corrispondente della tabella di verità si illumina; puoi anche cliccare direttamente una riga.',
      controls: [gateSel.el, ...toggles, nSel.el, styleSel.el, tourBtn],
      stage: h('div', { class: 'pl-lab-grid p2-grid' }, art,
        h('div', { class: 'pl-lab-panel p2-panel' }, h('h4', null, 'Regola'), rule, h('h4', null, 'Espressione'), expr, tableBox)),
      readout,
      caption: 'Il pallino sull\'uscita indica la negazione: AND e NAND hanno lo stesso corpo, cambia solo il pallino. Con tre ingressi la XOR dà 1 quando il numero di 1 è dispari: è il principio del controllo di parità che vedremo alla fine del capitolo.',
    });
  }

  /* ---------- laboratorio: tutto con le NAND ---------- */

  // Disegni a mano delle reti di Logic.NAND_ONLY (porte larghe 60: ingressi a +14 e +28, uscita a +21).
  const NAND_LAYOUT = {
    NOT: {
      gates: { g1: [230, 99] }, src: { A: 120 }, q: 496,
      wires: {
        A: [[[50, 120], [200, 120]], [[200, 120], [200, 113], [230, 113]], [[200, 120], [200, 127], [230, 127]]],
        Q: [[[290, 120], [496, 120]]],
      },
      dots: { A: [[200, 120]] },
    },
    AND: {
      gates: { g1: [190, 99], g2: [330, 99] }, src: { A: 80, B: 160 }, q: 496,
      wires: {
        A: [[[50, 80], [160, 80], [160, 113], [190, 113]]],
        B: [[[50, 160], [160, 160], [160, 127], [190, 127]]],
        n1: [[[250, 120], [300, 120]], [[300, 120], [300, 113], [330, 113]], [[300, 120], [300, 127], [330, 127]]],
        Q: [[[390, 120], [496, 120]]],
      },
      dots: { n1: [[300, 120]] },
    },
    OR: {
      gates: { g1: [170, 39], g2: [170, 159], g3: [340, 99] }, src: { A: 60, B: 180 }, q: 496,
      wires: {
        A: [[[50, 60], [140, 60]], [[140, 60], [140, 53], [170, 53]], [[140, 60], [140, 67], [170, 67]]],
        B: [[[50, 180], [140, 180]], [[140, 180], [140, 173], [170, 173]], [[140, 180], [140, 187], [170, 187]]],
        na: [[[230, 60], [300, 60], [300, 113], [340, 113]]],
        nb: [[[230, 180], [300, 180], [300, 127], [340, 127]]],
        Q: [[[400, 120], [496, 120]]],
      },
      dots: { A: [[140, 60]], B: [[140, 180]] },
    },
    NOR: {
      gates: { g1: [150, 39], g2: [150, 159], g3: [290, 99], g4: [410, 99] }, src: { A: 60, B: 180 }, q: 500,
      wires: {
        A: [[[50, 60], [120, 60]], [[120, 60], [120, 53], [150, 53]], [[120, 60], [120, 67], [150, 67]]],
        B: [[[50, 180], [120, 180]], [[120, 180], [120, 173], [150, 173]], [[120, 180], [120, 187], [150, 187]]],
        na: [[[210, 60], [255, 60], [255, 113], [290, 113]]],
        nb: [[[210, 180], [255, 180], [255, 127], [290, 127]]],
        or: [[[350, 120], [380, 120]], [[380, 120], [380, 113], [410, 113]], [[380, 120], [380, 127], [410, 127]]],
        Q: [[[470, 120], [500, 120]]],
      },
      dots: { A: [[120, 60]], B: [[120, 180]], or: [[380, 120]] },
    },
    XOR: {
      gates: { g1: [150, 99], g2: [290, 39], g3: [290, 159], g4: [410, 99] }, src: { A: 40, B: 200 }, q: 500,
      wires: {
        A: [[[50, 40], [250, 40], [250, 53], [290, 53]], [[110, 40], [110, 113], [150, 113]]],
        B: [[[50, 200], [250, 200], [250, 187], [290, 187]], [[110, 200], [110, 127], [150, 127]]],
        n1: [[[210, 120], [262, 120]], [[262, 120], [262, 67], [290, 67]], [[262, 120], [262, 173], [290, 173]]],
        n2: [[[350, 60], [380, 60], [380, 113], [410, 113]]],
        n3: [[[350, 180], [380, 180], [380, 127], [410, 127]]],
        Q: [[[470, 120], [500, 120]]],
      },
      dots: { A: [[110, 40]], B: [[110, 200]], n1: [[262, 120]] },
    },
  };

  function labNand() {
    const STEP = 480;
    const st = { target: 'OR', A: 0, B: 1 };
    const art = PL.svg('0 0 560 240', { role: 'img', 'aria-label': 'Rete di sole porte NAND che realizza la porta scelta' });
    const layer = s('g');
    art.append(layer);
    let net = null;
    let state = null;
    let parts = null;
    let pending = [];
    const cancelPending = () => { pending.forEach((id) => clearTimeout(id)); pending = []; };
    PL.onCleanup(cancelPending);

    function build() {
      layer.replaceChildren();
      net = Logic.NAND_ONLY[st.target];
      const L = NAND_LAYOUT[st.target];
      const wires = {};
      const dots = {};
      const gates = {};
      for (const sig in L.wires) {
        wires[sig] = L.wires[sig].map((pts) => draw.wire(pts));
        layer.append(...wires[sig]);
      }
      for (const sig in L.dots || {}) {
        dots[sig] = L.dots[sig].map(([x, y]) => draw.junction(x, y));
        layer.append(...dots[sig]);
      }
      Object.keys(L.gates).forEach((id, i) => {
        const [x, y] = L.gates[id];
        const g = draw.gate('NAND', { x, y, w: 60 });
        g.g.append(s('text', { class: 'p3-idx', x: x + 24, y: y + 26, 'text-anchor': 'middle' }, String(i + 1)));
        gates[id] = g;
        layer.append(g.g);
      });
      for (const name in L.src) {
        const y = L.src[name];
        layer.append(s('circle', { class: 'p3-src', cx: 50, cy: y, r: 4 }), draw.label(36, y + 6, name, 'p3-pin', 'end'));
      }
      const led = draw.led(L.q + 18, 120, { r: 9 });
      layer.append(led.g, draw.label(L.q + 18, 150, 'Q', 'p3-pin'));
      parts = { wires, dots, gates, led };
    }

    const driver = (sig) => net.gates.find((g) => g.out === sig);

    function applySignal(sig, v, animate) {
      (parts.wires[sig] || []).forEach((p) => draw.setWire(p, v, { animate, duration: 280 }));
      (parts.dots[sig] || []).forEach((d) => d.classList.toggle('is-1', !!v));
      const g = driver(sig);
      if (g) {
        const go = parts.gates[g.id];
        go.set(v);
        if (animate && !PL.reduced()) {
          go.g.classList.remove('p3-tick');
          void go.g.getBoundingClientRect();
          go.g.classList.add('p3-tick');
        }
      }
      if (sig === 'Q') parts.led.set(v);
    }

    function applyAll() {
      for (const sig in state) applySignal(sig, state[sig], false);
    }

    const tableBox = h('div', { class: 'p3-table' });
    const badge = h('p', { class: 'p3-badge' });
    let tt = null;
    function buildTable() {
      const n = net.inputs.length;
      tt = ui.truthTable({
        inputs: net.inputs,
        outputs: ['NAND', st.target],
        rows: Logic.combos(n).map((c) => {
          const ins = {};
          net.inputs.forEach((name, i) => { ins[name] = c[i]; });
          return c.concat(Logic.netOutput(net, ins), Logic.evalGate(st.target, c));
        }),
      });
      tableBox.replaceChildren(tt.el);
      badge.replaceChildren(h('strong', null, String(net.gates.length)), net.gates.length === 1 ? ' porta NAND' : ' porte NAND', h('span', null, 'si comporta come una ' + st.target + ' ✓'));
    }

    const readout = h('p');
    function highlightRow() {
      const bits = net.inputs.map((n) => st[n]);
      tt.highlight(Logic.fromBits(bits));
    }

    function change(changes) {
      cancelPending();
      const r = Logic.simulate(net, state, changes, { delay: 1 });
      state = r.state;
      highlightRow();
      const animate = !PL.reduced();
      const gatesHit = new Set(r.events.filter((e) => e.gate).map((e) => e.gate));
      r.events.forEach((e) => {
        if (!animate || e.t === 0) applySignal(e.signal, e.value, animate);
        else pending.push(PL.timeout(() => applySignal(e.signal, e.value, true), e.t * STEP));
      });
      const done = () => {
        readout.replaceChildren(h('strong', null, 'Q = ' + state.Q + '. '),
          gatesHit.size
            ? 'Il cambiamento ha attraversato ' + gatesHit.size + (gatesHit.size === 1 ? ' porta' : ' porte') + ' e l\'uscita si è assestata dopo ' + r.time + (r.time === 1 ? ' ritardo di porta.' : ' ritardi di porta.')
            : 'Questa volta nessuna porta ha dovuto cambiare la sua uscita.');
      };
      if (animate && r.time) {
        readout.replaceChildren(h('strong', null, 'Il segnale sta attraversando la rete…'));
        pending.push(PL.timeout(done, r.time * STEP + 120));
      } else done();
    }

    function reset() {
      cancelPending();
      build();
      const ins = {};
      net.inputs.forEach((n) => { ins[n] = st[n]; });
      state = Logic.settle(net, ins);
      applyAll();
      buildTable();
      highlightRow();
      tB.style.display = net.inputs.includes('B') ? '' : 'none';
      readout.replaceChildren(h('strong', null, 'Q = ' + state.Q + '. '), 'Cambia un ingresso: il segnale attraversa le porte una dopo l\'altra, ognuna con il suo piccolo ritardo.');
    }

    const tA = ui.toggle({ label: 'A', value: st.A, onChange: (v) => { st.A = v; change({ A: v }); } });
    const tB = ui.toggle({ label: 'B', value: st.B, onChange: (v) => { st.B = v; change({ B: v }); } });
    const target = ui.segmented({
      label: 'Porta da costruire',
      options: ['NOT', 'AND', 'OR', 'NOR', 'XOR'].map((t) => ({ value: t, label: t })),
      value: st.target,
      onChange: (v) => { st.target = v; reset(); },
    });
    reset();
    return ui.lab({
      title: 'Tutto con le NAND',
      intro: 'Scegli quale porta costruire usando soltanto porte NAND. Poi cambia gli ingressi e segui il segnale: ogni porta si accende o si spegne un istante dopo quella che la precede.',
      controls: [target.el, tA, tB],
      stage: h('div', { class: 'pl-lab-grid p3-grid' }, art, h('div', { class: 'pl-lab-panel' }, h('h4', null, 'Il conto'), badge, tableBox)),
      readout,
      caption: 'NOT: una NAND con gli ingressi uniti. AND: una NAND seguita da una NOT. OR: per De Morgan, una NAND degli ingressi negati. La tabella confronta la rete con la porta vera, riga per riga. Il ritardo è rallentato a circa mezzo secondo per porta.',
    });
  }

  /* ---------- laboratorio: le porte non sono istantanee ---------- */

  function labTiming() {
    const WIN = 400;
    const SPEED = 40;
    const HALF = 80;
    const D_AND = 6;
    const X0 = 74;
    const X1 = 548;
    const kx = (X1 - X0) / WIN;
    const AMP = 17;
    const ROWS = [{ key: 'a', label: 'A', y: 44 }, { key: 'n', label: 'NOT A', y: 112 }, { key: 'y', label: 'Y', y: 180 }];
    const st = { now: 260, dNot: 10, manual: false, edges: [{ t: -1e9, v: 0 }], next: 40 };

    const aAt = (t) => {
      for (let i = st.edges.length - 1; i >= 0; i--) if (st.edges[i].t <= t) return st.edges[i].v;
      return 0;
    };
    const nAt = (t) => 1 - aAt(t - st.dNot);
    const yAt = (t) => aAt(t - D_AND) & nAt(t - D_AND);
    const FN = { a: aAt, n: nAt, y: yAt };

    function generate() {
      if (st.manual) return;
      while (st.next <= st.now) {
        const last = st.edges[st.edges.length - 1].v;
        st.edges.push({ t: st.next, v: 1 - last });
        st.next += HALF;
      }
      // tiene solo i fronti ancora utili (più uno prima della finestra)
      const keepFrom = st.now - WIN - 60;
      while (st.edges.length > 2 && st.edges[1].t < keepFrom) st.edges.shift();
    }

    // schema del circuito
    const sch = PL.svg('0 0 560 92', { role: 'img', 'aria-label': 'Il segnale A entra direttamente in una porta AND e, attraverso una porta NOT, anche nel suo secondo ingresso: l\'uscita è Y' });
    const gNot = draw.gate('NOT', { x: 176, y: 40, w: 46 });
    const gAnd = draw.gate('AND', { x: 334, y: 10, w: 60 });
    const sw = {
      a: [draw.wire([[50, gAnd.inputs[0].y], [gAnd.inputs[0].x, gAnd.inputs[0].y]]), draw.wire([[112, gAnd.inputs[0].y], [112, gNot.inputs[0].y], [gNot.inputs[0].x, gNot.inputs[0].y]])],
      n: [draw.wire(elbow(gNot.output.x, gNot.output.y, gAnd.inputs[1].x, gAnd.inputs[1].y, 296))],
      y: [draw.wire([[gAnd.output.x, gAnd.output.y], [470, gAnd.output.y]])],
    };
    Object.values(sw).flat().forEach((p) => draw.setWire(p, 0, { animate: false }));
    const dotA = draw.junction(112, gAnd.inputs[0].y);
    sch.append(...Object.values(sw).flat(), dotA, gNot.g, gAnd.g,
      draw.label(36, gAnd.inputs[0].y + 5, 'A', 'p4-pin', 'end'),
      draw.label(246, gNot.output.y + 22, 'NOT A', 'p4-tag'),
      draw.label(486, gAnd.output.y + 5, 'Y', 'p4-pin', 'start'));

    // oscilloscopio
    const scope = PL.svg('0 0 560 214', { role: 'img', 'aria-label': 'Diagramma temporale dei segnali A, NOT A e Y che scorrono nel tempo da sinistra a destra' });
    const grid = s('g', { class: 'p4-grid' });
    const glitches = s('g');
    const traces = ROWS.map((r) => s('polyline', { class: 'p4-trace is-' + r.key }));
    const labels = ROWS.map((r) => draw.label(14, r.y + 5, r.label, 'p4-row', 'start'));
    const nowLine = s('line', { class: 'p4-now', x1: X1, y1: 14, x2: X1, y2: 206 });
    scope.append(grid, glitches, ...traces, ...labels, nowLine);
    const lvl = { a: -1, n: -1, y: -1 };

    function render() {
      const t0 = st.now - WIN;
      grid.replaceChildren();
      for (let g = Math.ceil(t0 / 50) * 50; g <= st.now; g += 50) {
        const x = X0 + (g - t0) * kx;
        grid.append(s('line', { x1: x, y1: 14, x2: x, y2: 206 }));
      }
      ROWS.forEach((r) => grid.append(s('line', { class: 'p4-base', x1: X0, y1: r.y + AMP, x2: X1, y2: r.y + AMP })));
      glitches.replaceChildren();
      ROWS.forEach((r, i) => {
        const f = FN[r.key];
        const pts = [];
        let runStart = null;
        for (let k = 0; k <= WIN; k++) {
          const t = t0 + k;
          const v = f(t);
          const x = X0 + k * kx;
          pts.push(x.toFixed(1) + ',' + (r.y + (v ? -AMP : AMP)));
          if (r.key === 'y') {
            if (v && runStart === null) runStart = x;
            if ((!v || k === WIN) && runStart !== null) {
              glitches.append(s('rect', { class: 'p4-glitch', x: runStart - 3, y: r.y - AMP - 8, width: Math.max(6, x - runStart + 6), height: AMP * 2 + 16, rx: 6 }));
              runStart = null;
            }
          }
        }
        traces[i].setAttribute('points', pts.join(' '));
      });
      // fili dello schema: il valore «adesso», al bordo destro
      ['a', 'n', 'y'].forEach((k) => {
        const v = FN[k](st.now);
        if (v !== lvl[k]) {
          lvl[k] = v;
          sw[k].forEach((p) => draw.setWire(p, v, { duration: 160 }));
          if (k === 'a') dotA.classList.toggle('is-1', !!v);
        }
      });
      gNot.set(lvl.n);
      gAnd.set(lvl.y);
    }

    const readout = h('p');
    function explain() {
      const d = st.dNot;
      readout.replaceChildren(PL.rich(d > 0
        ? '<strong>Ritardo della NOT: ' + d + ' ns.</strong> A ogni fronte di salita di A, per ' + d + ' ns la AND vede 1 su entrambi gli ingressi: in Y compare un impulso spurio largo ' + d + ' ns (il riquadro giallo), anche se A AND (NOT A) dovrebbe valere sempre 0. Sul fronte di discesa invece non succede nulla: A torna a 0 subito e la AND resta spenta.'
        : '<strong>Ritardo della NOT: 0 ns.</strong> Con una NOT istantanea il glitch sparisce. Ma nessuna porta reale è istantanea: per questo i circuiti leggono i risultati solo quando i segnali si sono assestati, al ritmo di un [[Clock|clock]].'));
    }

    const loopCtl = PL.loop((dt) => {
      st.now += dt * SPEED;
      generate();
      render();
    }, { el: scope, autostart: !PL.reduced() });

    const playBtn = ui.btn({
      label: loopCtl.running ? '❚❚ Pausa' : '▶︎ Scorri', kind: 'lab',
      onClick: () => { loopCtl.toggle(); playBtn.lastChild.textContent = loopCtl.running ? '❚❚ Pausa' : '▶︎ Scorri'; },
    });
    const stepBtn = ui.btn({ label: 'Avanza di 20 ns', kind: 'lab', onClick: () => { st.now += 20; generate(); render(); } });
    const delay = ui.slider({
      label: 'Ritardo della NOT', min: 0, max: 30, step: 1, value: st.dNot,
      format: (v) => v + ' ns',
      onInput: (v) => { st.dNot = v; explain(); render(); },
    });
    const manualA = ui.toggle({
      label: 'A', value: 0,
      onChange: (v) => { st.edges.push({ t: st.now, v }); render(); },
    });
    manualA.style.display = 'none';
    const modeSel = ui.segmented({
      label: 'Segnale A',
      options: [{ value: 'auto', label: 'Onda quadra' }, { value: 'manual', label: 'A mano' }],
      value: 'auto',
      onChange: (v) => {
        st.manual = v === 'manual';
        manualA.style.display = st.manual ? '' : 'none';
        if (st.manual) manualA.set(aAt(st.now), true);
        else { st.next = Math.ceil(st.now / HALF) * HALF; st.edges.push({ t: st.now, v: aAt(st.now) }); }
      },
    });
    generate();
    render();
    explain();
    return ui.lab({
      title: 'Le porte non sono istantanee',
      intro: 'Sulla carta A AND (NOT A) vale sempre 0: un segnale e il suo opposto non sono mai 1 insieme. Ma la NOT impiega qualche nanosecondo a rispondere. Guarda il diagramma temporale: il tempo scorre da sinistra a destra, il presente è sul bordo destro.',
      controls: [playBtn, stepBtn, delay.el, modeSel.el, manualA],
      stage: h('div', { class: 'p4-stage' }, sch, scope),
      readout,
      caption: 'Una tacca verticale ogni 50 ns. La AND ha un suo ritardo di 6 ns. Al rallentatore: un secondo della simulazione corrisponde a 40 miliardesimi di secondo reali.',
    });
  }

  /* ---------- laboratorio: il controllo di parità ---------- */

  function labParity() {
    const st = { bits: [1, 0, 1, 1, 0, 0, 1, 0], noise: 1, sending: false };
    const rowY = (i) => 22 + i * 29;
    const art = PL.svg('0 0 560 248', { class: 'pl-svg p5-tree', role: 'img', 'aria-label': 'Albero di sette porte XOR che calcola il bit di parità di otto bit di dati' });
    const inW = [];
    const vals = [];
    for (let i = 0; i < 8; i++) {
      const y = rowY(i);
      art.append(draw.label(14, y + 5, 'D' + (7 - i), 'p5-pin', 'start'));
      const v = s('text', { class: 'p5-val', x: 54, y: y + 5 }, '0');
      vals.push(v);
      art.append(v);
    }
    const L1 = [0, 1, 2, 3].map((j) => draw.gate('XOR', { x: 124, y: (rowY(2 * j) + rowY(2 * j + 1)) / 2 - 17.5, w: 50 }));
    const L2 = [0, 1].map((m) => draw.gate('XOR', { x: 254, y: (L1[2 * m].output.y + L1[2 * m + 1].output.y) / 2 - 17.5, w: 50 }));
    const L3 = draw.gate('XOR', { x: 384, y: (L2[0].output.y + L2[1].output.y) / 2 - 17.5, w: 50 });
    for (let i = 0; i < 8; i++) {
      const g = L1[Math.floor(i / 2)];
      const pin = g.inputs[i % 2];
      inW.push(draw.wire(elbow(72, rowY(i), pin.x, pin.y, 104)));
    }
    const w1 = L1.map((g, j) => { const pin = L2[Math.floor(j / 2)].inputs[j % 2]; return draw.wire(elbow(g.output.x, g.output.y, pin.x, pin.y, 222)); });
    const w2 = L2.map((g, m) => { const pin = L3.inputs[m]; return draw.wire(elbow(g.output.x, g.output.y, pin.x, pin.y, 350)); });
    const w3 = draw.wire([[L3.output.x, L3.output.y], [500, L3.output.y]]);
    [...inW, ...w1, ...w2, w3].forEach((p) => draw.setWire(p, 0, { animate: false }));
    const led = draw.led(520, L3.output.y, { r: 11 });
    const pTxt = s('text', { class: 'p5-pin', x: 520, y: L3.output.y + 40, 'text-anchor': 'middle' }, 'P = 0');
    art.append(...inW, ...w1, ...w2, w3, ...L1.map((g) => g.g), ...L2.map((g) => g.g), L3.g, led.g, pTxt,
      draw.label(520, L3.output.y - 26, 'parità', 'p5-tag'));

    let timers = [];
    const clearTimers = () => { timers.forEach((id) => clearTimeout(id)); timers = []; };
    PL.onCleanup(clearTimers);
    const later = (fn, ms) => { if (PL.reduced()) fn(); else timers.push(PL.timeout(fn, ms)); };

    const parity = () => st.bits.reduce((a, b) => a ^ b, 0);

    function updateTree() {
      clearTimers();
      const b = st.bits;
      const l1 = [0, 1, 2, 3].map((j) => b[2 * j] ^ b[2 * j + 1]);
      const l2 = [l1[0] ^ l1[1], l1[2] ^ l1[3]];
      const p = l2[0] ^ l2[1];
      b.forEach((v, i) => { draw.setWire(inW[i], v); vals[i].textContent = String(v); vals[i].classList.toggle('is-1', v === 1); });
      later(() => { L1.forEach((g, j) => { g.set(l1[j]); draw.setWire(w1[j], l1[j]); }); }, 240);
      later(() => { L2.forEach((g, m) => { g.set(l2[m]); draw.setWire(w2[m], l2[m]); }); }, 480);
      later(() => { L3.set(p); draw.setWire(w3, p); led.set(p); pTxt.textContent = 'P = ' + p; pBox.textContent = String(p); }, 720);
      const k = countOnes(b);
      info.replaceChildren(h('strong', null, 'Dati: ' + b.slice(0, 4).join('') + ' ' + b.slice(4).join('') + '. '),
        'Gli 1 sono ' + k + ', un numero ' + (k % 2 ? 'dispari' : 'pari') + ': il bit di parità vale ' + p + ', così il totale dei 1, compreso P, resta pari.');
    }

    // trasmissione su una linea con disturbi
    const line = PL.svg('0 0 560 124', { class: 'pl-svg p5-link', role: 'img', 'aria-label': 'I nove bit viaggiano uno dopo l\'altro dal trasmettitore al ricevitore lungo una linea con disturbi' });
    const bolt = s('path', { class: 'p5-bolt', d: 'M283 6l-12 22h9l-7 18 18-26h-10l8-14z' });
    line.append(
      s('rect', { class: 'p5-box', x: 6, y: 42, width: 92, height: 50, rx: 10 }),
      s('rect', { class: 'p5-box', x: 462, y: 42, width: 92, height: 50, rx: 10 }),
      s('line', { class: 'p5-line', x1: 98, y1: 67, x2: 462, y2: 67 }),
      draw.label(52, 72, 'TX', 'p5-boxt'),
      draw.label(508, 72, 'RX', 'p5-boxt'),
      draw.label(52, 112, 'trasmettitore', 'p5-tag'),
      draw.label(508, 112, 'ricevitore', 'p5-tag'),
      bolt);
    const cells = [];
    const cellLayer = s('g');
    line.append(cellLayer);
    const rxBox = h('div', { class: 'p5-rx', 'aria-live': 'polite' });
    const verdict = h('p', { class: 'p5-verdict' });

    function send() {
      if (st.sending) return;
      st.sending = true;
      sendBtn.disabled = true;
      cellLayer.replaceChildren();
      cells.length = 0;
      const word = st.bits.concat(parity());
      const flips = new Set();
      while (flips.size < st.noise) flips.add(Math.floor(Math.random() * 9));
      const got = [];
      rxBox.replaceChildren(h('span', { class: 'p5-rx-label' }, 'Ricevuti: '));
      verdict.textContent = '';
      verdict.className = 'p5-verdict';
      word.forEach((bit, i) => {
        const g = s('g', { class: 'p5-cell' + (i === 8 ? ' is-p' : ''), style: { opacity: '0' } });
        const r = s('rect', { x: -13, y: 54, width: 26, height: 26, rx: 6 });
        const t = s('text', { x: 0, y: 72, 'text-anchor': 'middle' }, String(bit));
        g.append(r, t);
        cellLayer.append(g);
        const cell = { g, t, bit, flipped: false };
        cells.push(cell);
        PL.tween({
          from: 110, to: 448, duration: 1500, delay: i * 260, ease: PL.motion.ease.inOut,
          onUpdate: (x, p) => {
            g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' 0)');
            g.style.opacity = p > 0 ? '1' : '0';
            if (!cell.flipped && flips.has(i) && x >= 280) {
              cell.flipped = true;
              cell.bit = 1 - cell.bit;
              t.textContent = String(cell.bit);
              g.classList.add('is-flip');
              bolt.classList.remove('is-on');
              void bolt.getBoundingClientRect();
              bolt.classList.add('is-on');
            }
          },
          onDone: () => {
            g.style.opacity = '0';
            got[i] = cell.bit;
            rxBox.append(h('span', { class: 'p5-rx-bit' + (cell.flipped ? ' is-flip' : '') + (i === 8 ? ' is-p' : '') }, String(cell.bit)));
            if (got.filter((x) => x != null).length === 9) finish(got, flips.size);
          },
        });
      });
    }

    function finish(got, nFlips) {
      st.sending = false;
      sendBtn.disabled = false;
      const x = got.reduce((a, b) => a ^ b, 0);
      if (x) {
        verdict.className = 'p5-verdict is-ko';
        verdict.textContent = '✗ Errore rilevato: il ricevitore conta un numero dispari di 1. Il dato va rispedito.';
      } else if (nFlips === 2) {
        verdict.className = 'p5-verdict is-warn';
        verdict.textContent = '⚠ La parità torna, ma due bit sono sbagliati: i due errori si annullano e il controllo non se ne accorge. È il limite del bit di parità.';
      } else {
        verdict.className = 'p5-verdict is-ok';
        verdict.textContent = '✓ Parità corretta: gli 1 ricevuti sono pari, i dati sono arrivati sani.';
      }
    }

    const pBox = h('span', { class: 'p5-pbox pl-mono', 'aria-label': 'Bit di parità calcolato' }, '0');
    const toggles = st.bits.map((b, i) => ui.toggle({ label: 'D' + (7 - i), value: b, onChange: (v) => { st.bits[i] = v; updateTree(); } }));
    const noise = ui.segmented({
      label: 'Disturbi sulla linea',
      options: [{ value: 0, label: 'Linea pulita' }, { value: 1, label: '1 bit sbagliato' }, { value: 2, label: '2 bit sbagliati' }],
      value: st.noise,
      onChange: (v) => { st.noise = Number(v); },
    });
    const sendBtn = ui.btn({ label: 'Trasmetti ▶︎', kind: 'lab is-primary', onClick: send });
    const info = h('p');
    updateTree();
    return ui.lab({
      title: 'Il controllo di parità',
      intro: 'Scegli otto bit di dati: l\'albero di porte XOR calcola il bit di parità P. Poi trasmetti i nove bit su una linea disturbata e guarda se il ricevitore si accorge degli errori.',
      controls: [noise.el, sendBtn],
      stage: h('div', { class: 'p5-stage' },
        h('div', { class: 'p5-bits', role: 'group', 'aria-label': 'Bit di dati' }, toggles, h('span', { class: 'p5-plus', 'aria-hidden': 'true' }, '+ P ='), pBox),
        art, line, rxBox, verdict),
      readout: info,
      caption: 'Parità pari: P vale 1 quando i dati contengono un numero dispari di 1, così il totale è sempre pari. Il ricevitore fa la XOR di tutti e nove i bit: se esce 1, qualcosa si è rovinato per strada.',
    });
  }

  /* ---------- figura: due alfabeti per le stesse porte ---------- */

  function figSymbols() {
    const order = ['BUF', 'NOT', 'AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'];
    const sym = (type, style) => {
      const el = PL.svg('0 0 120 60', { class: 'pl-svg p6-sym', 'aria-hidden': 'true' });
      const g = draw.gate(type, { x: 30, y: 9, w: 60, style });
      const stubs = g.inputs.map((p) => s('line', { class: 'p6-stub', x1: 8, y1: p.y, x2: p.x, y2: p.y }));
      stubs.push(s('line', { class: 'p6-stub', x1: g.output.x, y1: g.output.y, x2: 112, y2: g.output.y }));
      el.append(...stubs, g.g);
      return el;
    };
    const table = h('table', { class: 'p6-table' },
      h('caption', { class: 'p6-cap' }, 'Le otto porte nei due stili di disegno'),
      h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, 'Porta'), h('th', { scope: 'col' }, 'ANSI'), h('th', { scope: 'col' }, 'IEC'), h('th', { scope: 'col' }, 'Espressione'))),
      h('tbody', null, order.map((t) => {
        const G = Logic.GATES[t];
        return h('tr', null,
          h('th', { scope: 'row' }, h('span', { class: 'p6-name' }, G.name), G.it ? h('span', { class: 'p6-it' }, G.it) : null),
          h('td', { 'aria-label': 'Simbolo ANSI di ' + G.name }, sym(t, 'ansi')),
          h('td', { 'aria-label': 'Simbolo IEC di ' + G.name }, sym(t, 'iec')),
          h('td', { class: 'p6-expr pl-mono', html: exprFor(t, t === 'BUF' || t === 'NOT' ? 1 : 2) }));
      })));
    return ui.figure({
      art: h('div', { class: 'p6-wrap' }, table),
      caption: 'A sinistra le forme distintive della tradizione americana (MIL-STD-806B, poi IEEE Std 91), a destra i rettangoli della norma internazionale IEC 60617, con la funzione scritta dentro: & (tutti), ≥1 (almeno uno), =1 (esattamente uno), 1 (un solo ingresso). In entrambi gli stili il pallino sull\'uscita indica la negazione.',
    });
  }

  /* ---------- capitolo ---------- */

  PL.chapter({
    id: 'porte',
    num: 2,
    title: 'Le porte logiche',
    short: 'Porte',
    era: '1913 – oggi',
    minutes: 17,
    labs: 5,
    kicker: 'Le prime porte elettroniche servivano a contare raggi cosmici; oggi un chip ne contiene miliardi. Sono sette, e con una sola di loro si può costruire tutto il resto.',
    summary: 'NOT, AND, OR, NAND, NOR, XOR e XNOR: i sette mattoni di ogni circuito digitale, da accendere uno per uno.',
    timeline: [
      { year: 1924, title: 'Bothe e Geiger: il metodo delle coincidenze', text: 'Due contatori, e si registrano solo gli impulsi simultanei: è l\'idea della porta AND.', key: true },
      { year: 1929, title: 'Il primo circuito a coincidenza elettronico', text: 'Walther Bothe affida a una valvola il riconoscimento degli impulsi simultanei.' },
      { year: 1930, title: 'Il circuito di Rossi', text: 'Ad Arcetri, Bruno Rossi collega tre o più contatori a un circuito di triodi: una porta AND elettronica a più ingressi.', key: true },
      { year: 1954, title: 'Nobel per il metodo delle coincidenze', text: 'Walther Bothe riceve il Premio Nobel per la fisica, condiviso con Max Born.' },
      { year: 1962, title: 'I simboli della MIL-STD-806B', text: 'Le forme a D, a scudo e a triangolo diventano lo standard americano.' },
      { year: 1966, title: 'Un computer di porte NOR verso lo spazio', text: 'Il computer di guida Apollo, fatto di porte NOR integrate, vola per la prima volta.' },
      { year: 1984, title: 'Lo standard IEEE 91', text: 'Simboli distintivi e rettangolari vengono riuniti in un\'unica norma.' },
    ],
    glossary: [
      { term: 'Porta logica', def: 'Circuito che riceve uno o più segnali binari e produce un\'uscita secondo una regola fissa, come AND, OR o NOT.' },
      { term: 'NAND', def: 'AND con l\'uscita negata: dà 0 solo quando tutti gli ingressi sono 1. Da sola basta a costruire qualunque circuito digitale.' },
      { term: 'NOR', def: 'OR con l\'uscita negata: dà 1 solo quando tutti gli ingressi sono 0. Anche la NOR è una porta universale.' },
      { term: 'XOR', def: 'OR esclusivo: dà 1 quando gli ingressi sono diversi; con più ingressi, quando il numero di 1 è dispari.' },
      { term: 'XNOR', def: 'Equivalenza: dà 1 quando gli ingressi sono uguali. È la negazione della XOR e si usa per confrontare bit.' },
      { term: 'Porta universale', def: 'Porta con cui, da sola, si può costruire qualsiasi funzione logica: NAND e NOR lo sono.' },
      { term: 'Livello logico', def: 'Intervallo di tensione che un circuito interpreta come 0 (livello basso) o come 1 (livello alto).' },
      { term: 'Diagramma temporale', def: 'Grafico che mostra come cambiano nel tempo i segnali di un circuito, disegnati uno sotto l\'altro.' },
      { term: 'Simbolo ANSI', def: 'Forma distintiva delle porte (a D, a scudo, a triangolo) della tradizione americana: MIL-STD-806B e IEEE Std 91.' },
      { term: 'Simbolo IEC', def: 'Simbolo rettangolare delle porte con la funzione scritta dentro (&, ≥1, =1), definito dalla norma internazionale IEC 60617.' },
      { term: 'Bit di parità', def: 'Bit aggiunto a un gruppo di dati perché il numero totale di 1 sia sempre pari (o sempre dispari): se il conto non torna, c\'è stato un errore.' },
      { term: 'Buffer', def: 'Porta che copia l\'ingresso in uscita: non cambia il valore, ma rigenera il segnale e gli dà la forza di pilotare fili lunghi o molti ingressi.' },
      { term: 'Circuito a coincidenza', def: 'Circuito che dà un impulso solo quando due o più rivelatori scattano nello stesso istante: una porta AND elettronica nata per studiare i raggi cosmici.' },
      { term: 'Glitch', def: 'Impulso spurio e brevissimo all\'uscita di un circuito, causato dai ritardi diversi dei segnali che arrivano alle porte.' },
    ],
    render(root) {
      root.append(
        ui.section({ id: 'porta', title: 'Una scatola che decide', lead: 'Una porta logica riceve uno o più bit e ne restituisce uno, seguendo sempre la stessa regola.' },
          ui.prose(
            'Nel capitolo precedente le operazioni di Boole si facevano con interruttori e lampadine. Per costruire macchine vere serve un passo in più: trasformare ogni operazione in un componente con dei fili in entrata e uno in uscita, da collegare agli altri come i mattoncini di una costruzione. È la [[Porta logica|porta logica]].',
            'Dentro una porta 0 e 1 non sono numeri ma tensioni. In un circuito alimentato a 5 volt, una tensione vicina a 0 V vale 0 e una vicina a 5 V vale 1: sono i due [[Livello logico|livelli logici]]. La porta legge le tensioni dei suoi ingressi e produce in uscita quella giusta, in pochi miliardesimi di secondo.',
            'Che cosa ci sia dentro non cambia la regola: una porta AND si può fare con due [[Relè|relè]], con delle [[Valvola termoionica|valvole]] o con qualche [[Transistor|transistor]]. Chi progetta un circuito ragiona per porte e lascia ai capitoli successivi la questione di come costruirle.'),
          figAnatomy(),
          ui.callout({
            kind: 'note',
            title: 'La porta che non cambia niente',
            body: 'Il [[Buffer|buffer]] copia l\'ingresso in uscita: 1 resta 1, 0 resta 0. Sembra inutile, invece è preziosissimo: rigenera un segnale indebolito e gli dà la forza di arrivare in fondo a un filo lungo o di comandare molti ingressi insieme. Il suo simbolo è un triangolo; con un pallino in punta diventa una NOT.',
          })),

        ui.section({ id: 'coincidenze', title: 'Le prime porte contavano raggi cosmici', kicker: '1924 – 1930 · Berlino e Firenze' },
          ui.prose(
            'Le prime porte logiche elettroniche non nacquero per fare calcoli, ma per contare particelle. Negli anni Venti i fisici studiavano i raggi cosmici, particelle velocissime che piovono dallo spazio, con i contatori Geiger: tubi pieni di gas che danno un impulso elettrico ogni volta che una particella li attraversa.',
            'Il guaio era il rumore di fondo: rocce, muri e aria sono leggermente radioattivi e fanno scattare i contatori di continuo. Nel 1924 il fisico tedesco Walther Bothe, con Hans Geiger, ebbe l\'idea decisiva: usare due contatori e registrare soltanto gli impulsi simultanei, le [[Circuito a coincidenza|coincidenze]]. Una particella che arriva dall\'alto attraversa entrambi i tubi; un colpo di fondo, quasi sempre, ne colpisce uno solo.',
            'All\'inizio le coincidenze si cercavano a occhio, su strisce di pellicola. Nel 1929 Bothe costruì un circuito a valvole che faceva il lavoro da solo, e nel 1930 un giovane fisico dell\'osservatorio di Arcetri, a Firenze, Bruno Rossi, ne inventò una versione con i triodi più semplice e capace di collegare tre o più contatori. Il circuito di Rossi dà un impulso in uscita solo se tutti gli ingressi ricevono un impulso nello stesso istante: è una porta AND, e diventò uno strumento di tutti i laboratori di fisica.'),
          labCoincidence(),
          ui.cols(
            ui.person({
              name: 'Walther Bothe', years: '1891 – 1957', role: 'fisico',
              body: [
                'Allievo di Max Planck, passò cinque anni prigioniero in Siberia durante la Prima guerra mondiale. Tornato a Berlino, sviluppò con Hans Geiger il metodo delle coincidenze, che usò per studiare l\'effetto Compton e la natura dei raggi cosmici.',
                'Nel 1954 ricevette il Premio Nobel per la fisica, condiviso con Max Born.',
              ],
            }),
            ui.person({
              name: 'Bruno Rossi', years: '1905 – 1993', role: 'fisico',
              body: [
                'Veneziano, a venticinque anni costruisce ad Arcetri il circuito a coincidenza che porta il suo nome e diventa uno dei pionieri dello studio dei raggi cosmici.',
                'Nel 1938 le leggi razziali lo costringono a lasciare l\'Italia. Lavorerà a Manchester, Chicago, Cornell, Los Alamos e al MIT, dove sarà tra i padri dell\'astronomia a raggi X.',
              ],
            })),
          ui.quote({
            text: 'Per il metodo delle coincidenze e le scoperte fatte con esso.',
            original: 'For the coincidence method and his discoveries made therewith.',
            author: 'Accademia reale svedese delle scienze', source: 'motivazione del Premio Nobel per la fisica a Walther Bothe', year: 1954,
          })),

        ui.section({ id: 'sette-porte', title: 'Sette porte per tutti i circuiti', lead: 'AND, OR e NOT bastano in teoria; in pratica i progettisti ne usano sette, ognuna con un nome, un simbolo e una regola.' },
          ui.prose(
            'Alle tre operazioni di Boole, [[AND]], [[OR]] e [[NOT]], se ne aggiungono quattro, ottenute negandole o combinandole. La [[NAND]] è una AND con l\'uscita capovolta, la [[NOR]] una OR capovolta. La [[XOR]], «o esclusivo», dà 1 quando gli ingressi sono diversi: è il [[Deviatore|deviatore]] delle scale del capitolo 1. La [[XNOR]] dà 1 quando sono uguali, ed è perfetta per confrontare due numeri bit per bit.',
            'Ogni porta si descrive per intero con la sua [[Tabella di verità|tabella di verità]]: con due ingressi bastano quattro righe, con tre ne servono otto. Accendi gli ingressi del banco e guarda la riga che si illumina.'),
          labBench(),
          ui.callout({
            kind: 'fun',
            title: 'Il pallino che nega',
            body: 'Il pallino della negazione si può mettere anche sugli ingressi. Una AND con entrambi gli ingressi negati dà 1 solo quando A e B sono 0: è esattamente una NOR. Sono le <a href="#boole/de-morgan">leggi di De Morgan</a>, disegnate.',
          })),

        ui.section({ id: 'simboli', title: 'Due alfabeti per le stesse porte', kicker: '1962 – 1984' },
          ui.prose(
            'Per disegnare circuiti con migliaia di porte servono simboli che chiunque riconosca al primo sguardo. Negli Stati Uniti si affermarono le forme distintive (la D della AND, lo scudo della OR, il triangolo della NOT) fissate nel 1962 dalla norma militare MIL-STD-806B e poi dallo standard IEEE 91: sono i [[Simbolo ANSI|simboli ANSI]] che si trovano nella maggior parte dei libri.',
            'La Commissione elettrotecnica internazionale scelse invece un rettangolo uguale per tutte le porte, con la funzione scritta dentro: & per la AND, ≥1 per la OR («almeno un ingresso a 1»), =1 per la XOR («esattamente uno»). I [[Simbolo IEC|simboli IEC]] sono meno pittoreschi ma più regolari, e compaiono spesso negli schemi europei e nella documentazione industriale. Nel banco qui sopra puoi passare da uno stile all\'altro.'),
          figSymbols()),

        ui.section({ id: 'universale', title: 'Una porta per costruirle tutte', kicker: '1913 · 1966' },
          ui.prose(
            'Nel 1913 Henry Sheffer dimostrò che un solo operatore basta per tutta la logica (ne abbiamo parlato nel <a href="#boole/una-operazione">capitolo 1</a>). Oggi diciamo che NAND e NOR sono [[Porta universale|porte universali]]: con sole NAND si ottiene una NOT, collegando insieme i due ingressi; poi una AND, facendo seguire una NOT; poi una OR, grazie a De Morgan; e da lì qualunque altro circuito.',
            'Non è solo una curiosità da matematici. A chi fabbrica circuiti conviene produrre un solo tipo di porta in enormi quantità, e nella tecnologia [[CMOS]], quella di quasi tutti i chip di oggi, NAND e NOR sono proprio le porte più semplici: quattro transistor ciascuna.'),
          labNand(),
          ui.prose('L\'esempio più famoso arriva dallo spazio. Il computer di guida delle missioni Apollo, progettato al MIT, fu tra i primi a usare i circuiti integrati ed era fatto quasi interamente di un solo tipo di chip: due porte NOR a tre ingressi in un minuscolo contenitore piatto. Nella versione che portò gli astronauti sulla Luna ce n\'erano circa 2.800, tutti uguali.'),
          ui.stats([
            { value: 2800, label: 'chip nel computer di guida Apollo', note: 'versione Block II, tutti dello stesso tipo' },
            { value: 5600, label: 'porte NOR a tre ingressi', note: 'due per chip' },
            { value: 2.048, decimals: 3, unit: 'MHz', label: 'frequenza del clock', note: 'quella di un orologio al quarzo veloce' },
            { value: 32, unit: 'kg', label: 'peso del computer', note: 'grande come una valigetta' },
          ]),
          ui.callout({
            kind: 'link',
            title: 'Dentro una NAND',
            body: 'Come si costruisce davvero una NAND con quattro transistor lo vedremo nel capitolo sulle <a href="#famiglie">famiglie logiche</a>: è lì che le porte diventano circuiti elettronici veri.',
          })),

        ui.section({ id: 'tempo', title: 'Le porte non sono istantanee', lead: 'Tra il cambio di un ingresso e la risposta dell\'uscita passa sempre un po\' di tempo: pochissimo, ma abbastanza da creare sorprese.' },
          ui.prose(
            'Nessuna porta reagisce all\'istante: i suoi interruttori interni impiegano un tempo minuscolo a cambiare stato. È il [[Ritardo di propagazione|ritardo di propagazione]]. In una porta TTL degli anni Settanta era di circa 10 nanosecondi, cioè miliardesimi di secondo; nei processori di oggi è di pochi picosecondi, mille volte meno.',
            'Per vedere che cosa succede si usa un [[Diagramma temporale|diagramma temporale]]: i segnali sono disegnati uno sotto l\'altro e il tempo scorre da sinistra a destra, come sullo schermo di un oscilloscopio. Prendiamo un circuito che sulla carta dà sempre 0: A AND (NOT A).'),
          labTiming(),
          ui.prose('Quell\'impulso spurio si chiama [[Glitch|glitch]]. Di solito non fa danni, perché i circuiti leggono i risultati solo quando tutti i segnali si sono assestati, al ritmo regolare di un clock: lo vedremo nel prossimo capitolo. Ma un glitch che finisce sull\'ingresso sbagliato, per esempio quello che azzera un contatore, può combinare guai veri; per questo i progettisti li cacciano con cura.'),
          ui.callout({
            kind: 'warn',
            title: 'Più porte, più ritardo',
            body: 'I ritardi si sommano: un segnale che attraversa dieci porte in fila impiega dieci volte di più. Per questo chi progetta un chip cerca il «percorso critico», la catena di porte più lunga, che decide la velocità massima di tutto il circuito.',
          })),

        ui.section({ id: 'parita', title: 'Una XOR contro gli errori', kicker: 'Memorie e linee seriali' },
          ui.prose(
            'La XOR ha una proprietà preziosa: con molti ingressi dà 1 quando il numero di 1 è dispari. Basta una catena di XOR per sapere se in un gruppo di bit gli 1 sono pari o dispari.',
            'Su questo si basa il [[Bit di parità|bit di parità]]: prima di spedire o di memorizzare otto bit di dati, il circuito ne aggiunge un nono, scelto in modo che il numero totale di 1 sia pari. Chi riceve rifà il conto: se non torna, un bit si è rovinato per strada. È un controllo semplicissimo, usato ancora oggi nelle linee seriali.'),
          labParity(),
          ui.cols(
            ui.callout({
              kind: 'fun',
              title: 'Il nono chip',
              body: 'Molti PC degli anni Ottanta e Novanta avevano nove chip di memoria dove ne sarebbero bastati otto: il nono conservava i bit di parità. Se un bit si guastava, lo schermo mostrava «PARITY CHECK» e il computer si fermava: meglio fermarsi che continuare con dati sbagliati.',
            }),
            ui.callout({
              kind: 'link',
              title: 'Approfondisci in BusLab',
              body: 'Il bit di parità viaggia anche nei bus seriali: guarda come lo usa la <a href="../../index.html#/bus/uart">UART nel laboratorio dei bus</a>.',
            })),
          ui.keyIdea('Una porta logica è un\'operazione di Boole diventata componente: legge tensioni, applica una regola fissa e risponde in un tempo brevissimo ma mai nullo. Con sole NAND, o sole NOR, si costruisce tutto. Nel prossimo capitolo le useremo per fare due cose sorprendenti: sommare numeri e ricordarli.'),
          ui.crossLink({ href: '#calcolo', kicker: 'Capitolo 3', title: 'Porte che contano e ricordano', text: 'Con poche porte si somma in binario, con un anello di porte si ricorda un bit.' })));
    },
  });
})();
