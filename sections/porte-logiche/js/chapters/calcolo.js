/*
 * Capitolo 3 · Porte che contano e ricordano (1703 – 1970).
 * Il sistema binario, i sommatori e il riporto, la retroazione che ricorda, il clock, registri e contatori.
 * Laboratori: contare in binario, il sommatore, il riporto che corre, un bit di memoria, il battito del clock,
 * il contatore. Figura: il Model K di Stibitz, con i tasti da premere.
 */
(function () {
  'use strict';

  const { h, s, ui, draw } = PL;

  const elbow = (x1, y1, x2, y2, vx) => (Math.abs(y1 - y2) < 0.5 ? [[x1, y1], [x2, y2]] : [[x1, y1], [vx, y1], [vx, y2], [x2, y2]]);
  const bin = (n, w) => n.toString(2).padStart(w, '0');
  // riavvia un'animazione CSS togliendo e rimettendo la classe
  const restart = (el, cls) => { el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls); };

  /* ---------- aiutanti: rete di porte animata, segnali nel tempo ---------- */

  /*
   * Applica ai disegni gli eventi di Logic.simulate, un ritardo di porta alla volta.
   * o = { net, wires: { segnale: [path] }, dots: { segnale: [cerchi] }, gates: { id: porta }, leds: { segnale: led }, step: () => ms, onSignal }
   */
  function netPlayer(o) {
    let pending = [];
    let state = {};
    const cancel = () => { pending.forEach((id) => clearTimeout(id)); pending = []; };
    PL.onCleanup(cancel);
    const driver = {};
    o.net.gates.forEach((g) => { driver[g.out] = g; });
    function apply(sig, v, animate) {
      (o.wires[sig] || []).forEach((p) => draw.setWire(p, v, { animate, duration: 260 }));
      ((o.dots || {})[sig] || []).forEach((d) => d.classList.toggle('is-1', !!v));
      const g = driver[sig];
      const go = g && o.gates && o.gates[g.id];
      if (go) {
        go.set(v);
        if (animate && !PL.reduced()) restart(go.g, 'cx-tick');
      }
      if (o.leds && o.leds[sig]) o.leds[sig].set(v);
      if (o.onSignal) o.onSignal(sig, v, animate);
    }
    return {
      get state() { return state; },
      reset(inputs, initial) {
        cancel();
        state = Logic.settle(o.net, inputs, initial);
        Object.keys(state).forEach((k) => apply(k, state[k], false));
      },
      run(changes, opts) {
        const op = opts || {};
        cancel();
        const r = Logic.simulate(o.net, state, changes, { delay: 1, maxT: op.maxT || 64 });
        state = r.state;
        const animate = !PL.reduced();
        const step = o.step();
        r.events.forEach((e) => {
          if (!animate || e.t === 0) apply(e.signal, e.value, animate);
          else pending.push(PL.timeout(() => apply(e.signal, e.value, true), e.t * step));
        });
        r.duration = animate ? r.time * step : 0;
        if (op.done) {
          if (r.duration) pending.push(PL.timeout(() => op.done(r), r.duration + 120));
          else op.done(r);
        }
        return r;
      },
      cancel,
    };
  }

  // Segnale digitale nel tempo, come elenco di fronti { t, v } in ordine di tempo.
  function track(v0) {
    const edges = [{ t: -Infinity, v: v0 }];
    return {
      edges,
      get last() { return edges[edges.length - 1].v; },
      get lastT() { return edges[edges.length - 1].t; },
      at(t) {
        for (let i = edges.length - 1; i >= 0; i--) if (edges[i].t <= t) return edges[i].v;
        return edges[0].v;
      },
      push(t, v) { if (edges[edges.length - 1].v !== v) edges.push({ t, v }); },
      prune(t) {
        while (edges.length > 1 && edges[1].t < t) edges.shift();
        edges[0].t = -Infinity;
      },
      reset(v) { edges.length = 0; edges.push({ t: -Infinity, v }); },
    };
  }

  // Punti di una traccia a gradini tra t0 e t1 (per una polyline).
  function stepPoints(tr, t0, t1, X, Y) {
    let v = tr.at(t0);
    const pts = [[X(t0), Y(v)]];
    for (const e of tr.edges) {
      if (e.t <= t0 || e.t > t1) continue;
      pts.push([X(e.t), Y(v)], [X(e.t), Y(e.v)]);
      v = e.v;
    }
    pts.push([X(t1), Y(v)]);
    return pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  }

  /* ---------- laboratorio: contare in binario ---------- */

  function labBinary() {
    const N = 8;
    const st = { val: 45, speed: 2 };
    let timers = [];
    const clearTimers = () => { timers.forEach((id) => clearTimeout(id)); timers = []; };
    PL.onCleanup(clearTimers);
    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));

    const cells = [];
    for (let i = 0; i < N; i++) {
      const w = 1 << i;
      const digit = h('span', { class: 'c1-digit' }, '0');
      const plus = h('span', { class: 'c1-plus', 'aria-hidden': 'true' }, '+1');
      const btn = h('button', { type: 'button', class: 'c1-bit', 'aria-label': 'Bit da ' + w }, plus, digit, h('span', { class: 'c1-weight' }, PL.fmt(w)));
      btn.addEventListener('click', () => flipBit(i));
      cells.push({ btn, digit, plus });
    }
    const ghost = h('span', { class: 'c1-ghost', 'aria-hidden': 'true' }, '1');
    const row = h('div', { class: 'c1-row', role: 'group', 'aria-label': 'Otto bit, dal più significativo al meno significativo' }, ghost, cells.slice().reverse().map((c) => c.btn));
    const dec = h('strong', { class: 'c1-dec' });
    const parts = h('span', { class: 'c1-parts' });
    const total = h('p', { class: 'c1-total' }, h('span', { class: 'c1-eq', 'aria-hidden': 'true' }, '='), dec, parts);

    function paintBit(i, v, pop) {
      const c = cells[i];
      c.digit.textContent = String(v);
      c.btn.classList.toggle('is-1', v === 1);
      c.btn.setAttribute('aria-pressed', v ? 'true' : 'false');
      if (pop && !PL.reduced()) restart(c.digit, 'is-pop');
    }
    function paintValue(v) {
      dec.textContent = String(v);
      const list = [];
      for (let i = N - 1; i >= 0; i--) if ((v >> i) & 1) list.push(PL.fmt(1 << i));
      parts.textContent = list.length > 1 ? list.join(' + ') : list.length ? 'un solo bit acceso' : 'nessun bit acceso';
    }
    function paintAll(v) {
      for (let i = 0; i < N; i++) paintBit(i, (v >> i) & 1, false);
      paintValue(v);
    }
    function finish() {
      if (!timers.length) return;
      clearTimers();
      paintAll(st.val);
    }

    function flipBit(i) {
      finish();
      st.val ^= 1 << i;
      paintAll(st.val);
      paintBit(i, (st.val >> i) & 1, true);
      say('Hai ' + ((st.val >> i) & 1 ? 'acceso' : 'spento') + ' il bit da ' + PL.fmt(1 << i) + ': ora il numero vale <strong>' + st.val + '</strong>, in binario ' + bin(st.val, N) + '.');
    }

    function explainPlus(old, k) {
      const next = st.val;
      let msg;
      if (k === 0) msg = '<strong>' + old + ' + 1 = ' + next + '.</strong> Il bit da 1 era 0 e diventa 1: nessun riporto.';
      else if (k < N) msg = '<strong>' + old + ' + 1 = ' + next + '.</strong> ' + (k === 1 ? 'Il bit da 1 era 1: torna a 0' : 'I primi ' + k + ' bit erano 1: tornano a 0') + ' e il riporto avanza fino al bit da ' + PL.fmt(1 << k) + ', che diventa 1. È il contachilometri: 0999 + 1 = 1000.';
      else msg = '<strong>255 + 1 = 0?</strong> Tutti gli 8 bit tornano a 0 e il riporto esce dal bordo sinistro: non c\'è un nono bit dove metterlo. Con 8 bit si contano 256 valori, da 0 a 255; oltre si ricomincia da capo. È l\'[[Overflow|overflow]].';
      say(msg);
    }

    function plusOne(auto) {
      finish();
      const old = st.val;
      st.val = (old + 1) % (1 << N);
      let k = 0;
      while (k < N && (old >> k) & 1) k += 1; // k = primo bit a 0, che diventa 1 (k = N: overflow)
      const last = Math.min(k, N - 1);
      const stepMs = auto ? Math.min(150, 800 / st.speed / (last + 2)) : 170;
      if (PL.reduced() || stepMs < 24) {
        paintAll(st.val);
      } else {
        for (let j = 0; j <= last; j++) {
          timers.push(PL.timeout(() => {
            restart(cells[j].plus, 'is-on');
            paintBit(j, j < k ? 0 : 1, true);
            if (j === last) {
              paintValue(st.val);
              if (k === N) restart(ghost, 'is-on');
              timers = [];
            }
          }, j * stepMs));
        }
      }
      if (!auto) explainPlus(old, k);
    }

    let acc = 0;
    const loopCtl = PL.loop((dt) => {
      acc += dt * st.speed;
      if (acc >= 1) { acc = Math.min(acc - 1, 1); plusOne(true); }
    }, { el: row, autostart: !PL.reduced() });
    const autoText = () => say('Conta da solo, un passo alla volta. Il bit da 1 cambia a ogni passo, quello da 2 ogni due passi, quello da 4 ogni quattro: ogni bit cambia alla metà della velocità di quello alla sua destra.');
    const playBtn = ui.btn({ label: loopCtl.running ? '❚❚ Pausa' : '▶︎ Conta da solo', kind: 'lab', onClick: () => setAuto(!loopCtl.running) });
    function setAuto(on) {
      loopCtl.toggle(on);
      playBtn.lastChild.textContent = on ? '❚❚ Pausa' : '▶︎ Conta da solo';
      if (on) autoText();
    }
    const plusBtn = ui.btn({ label: '+1', kind: 'lab is-primary', ariaLabel: 'Aggiungi uno', onClick: () => { if (loopCtl.running) setAuto(false); plusOne(false); } });
    const speed = ui.slider({ label: 'Velocità', min: 1, max: 20, step: 1, value: st.speed, format: (v) => v + (v === 1 ? ' passo/s' : ' passi/s'), onInput: (v) => { st.speed = v; } });
    const to250 = ui.btn({
      label: 'Vai a 250', kind: 'lab',
      onClick: () => { if (loopCtl.running) setAuto(false); finish(); st.val = 250; paintAll(250); say('Ora il numero vale <strong>250</strong>, in binario 11111010. Premi +1 più volte e guarda che cosa succede dopo 255.'); },
    });
    const zero = ui.btn({ label: 'Azzera', kind: 'lab', onClick: () => { finish(); st.val = 0; paintAll(0); say('Tutti i bit a 0: il numero vale 0.'); } });
    paintAll(st.val);
    if (loopCtl.running) autoText();
    else say('Il numero 45 in binario è 00101101: 32 + 8 + 4 + 1. Premi +1 e guarda il riporto correre da destra verso sinistra.');

    return ui.lab({
      title: 'Contare in binario',
      intro: 'Otto bit, come in un byte. Ogni casella vale il doppio di quella alla sua destra e il numero è la somma delle caselle accese. Premi +1 per contare, oppure accendi e spegni i bit uno per uno.',
      controls: [plusBtn, playBtn, speed.el, to250, zero],
      stage: h('div', { class: 'c1-stage' }, row, total),
      readout,
      caption: 'Sotto ogni bit c\'è quanto vale quando è acceso. Il segno +1 mostra il riporto che passa da una casella alla successiva. Con 8 bit si va da 0 a 255.',
    });
  }

  /* ---------- figura: il Model K, da premere ---------- */

  function figModelK() {
    const st = { A: 0, B: 0 };
    const art = PL.svg('0 0 620 300', { class: 'pl-svg c7-art', role: 'img', 'aria-label': 'Ricostruzione stilizzata del Model K: su una tavoletta di legno una pila, due tasti di lamierino, due relè e due lampadine che mostrano la somma in binario' });
    const board = s('rect', { class: 'c7-board', x: 24, y: 24, width: 572, height: 252, rx: 18 });
    const grain = ['M44 58c140-10 300 10 532-2', 'M40 150c160 8 320-12 540 4', 'M48 236c150-10 330 8 528-4'].map((d) => s('path', { class: 'c7-grain', d }));
    const copper = (d) => s('path', { class: 'c7-copper', d });
    const node = (cx, cy) => s('circle', { class: 'c7-node', cx, cy, r: 4 });
    // pila: il polo + è il cappuccio in alto, il polo − il fondo
    const cell = s('g', null,
      s('rect', { class: 'c7-cell', x: 50, y: 96, width: 50, height: 104, rx: 9 }),
      s('rect', { class: 'c7-cap', x: 67, y: 86, width: 16, height: 12, rx: 3 }),
      s('text', { class: 'c7-cell-n', x: 75, y: 136, 'text-anchor': 'middle' }, 'pila'),
      s('text', { class: 'c7-cell-t', x: 75, y: 160, 'text-anchor': 'middle' }, '1,5 V'));

    // tasto di lamierino: blocchetto con la vite, striscia che si piega, contatto
    function key(name, x0, y) {
      const strip = s('path', { class: 'c7-strip', d: 'M' + (x0 + 18) + ' ' + (y - 2) + 'L' + (x0 + 92) + ' ' + (y - 13), style: { transformOrigin: (x0 + 18) + 'px ' + (y - 2) + 'px' } });
      const g = s('g', { class: 'c7-key' },
        s('rect', { class: 'c7-stud', x: x0 + 82, y: y + 4, width: 14, height: 8, rx: 2 }),
        s('rect', { class: 'c7-block', x: x0, y: y - 12, width: 24, height: 24, rx: 4 }),
        s('circle', { class: 'c7-screw', cx: x0 + 12, cy: y, r: 3.5 }),
        strip,
        s('text', { class: 'c7-label', x: x0 + 56, y: y + 34, 'text-anchor': 'middle' }, 'tasto ' + name));
      g.addEventListener('click', () => set(name, st[name] ? 0 : 1));
      return { g, set(v) { g.classList.toggle('is-down', !!v); } };
    }
    // relè: bobina, nucleo, ancora che viene attratta verso il contatto
    function relay(name, x0, y) {
      const wind = [];
      for (let x = x0 + 7; x < x0 + 58; x += 6) wind.push(s('line', { class: 'c7-wind', x1: x, y1: y - 13, x2: x, y2: y + 13 }));
      const arm = s('line', { class: 'c7-arm', x1: x0 + 84, y1: y + 24, x2: x0 + 84, y2: y - 22, style: { transformOrigin: (x0 + 84) + 'px ' + (y + 24) + 'px' } });
      const g = s('g', { class: 'c7-relay' },
        s('rect', { class: 'c7-coil', x: x0, y: y - 15, width: 64, height: 30, rx: 7 }), ...wind,
        s('rect', { class: 'c7-core', x: x0 + 64, y: y - 6, width: 10, height: 12, rx: 2 }),
        s('rect', { class: 'c7-contact', x: x0 + 70, y: y - 30, width: 10, height: 8, rx: 2 }),
        arm,
        s('text', { class: 'c7-label', x: x0 + 34, y: y + 40, 'text-anchor': 'middle' }, 'relè ' + name));
      return { g, set(v) { g.classList.toggle('is-on', !!v); } };
    }
    const kA = key('A', 128, 112);
    const kB = key('B', 128, 206);
    const rA = relay('A', 300, 104);
    const rB = relay('B', 300, 190);
    const bulb2 = draw.lamp(468, 150, { r: 19 });
    const bulb1 = draw.lamp(540, 150, { r: 19 });
    // fili: dal polo + ai tasti, dai tasti alle bobine; dai contatti dei relè alle lampadine; il ritorno al polo −.
    // Il filo che scavalca l'altro fa un piccolo ponte.
    const wPlus = copper('M75 86V60H112V112');
    const wToA = copper('M112 112H128');
    const wToB = copper('M112 112V206H128');
    const wCoilA = copper('M224 120H262V104H300');
    const wCoilB = copper('M224 214H262V190H300');
    art.append(board, ...grain,
      wPlus, wToA, wToB, wCoilA, wCoilB,
      copper('M375 74V64H527V137'), copper('M455 64V137'),
      copper('M375 160V146H404V196H498a6 6 0 0 1 12 0H527V163'), copper('M455 196V163'),
      copper('M487 150H504V262'), copper('M559 150H576V262H75V200'),
      node(112, 112), node(455, 64), node(455, 196), node(504, 262),
      cell, kA.g, kB.g, rA.g, rB.g, bulb2.g, bulb1.g,
      s('text', { class: 'c7-digit', x: 468, y: 226, 'text-anchor': 'middle' }, '2'),
      s('text', { class: 'c7-digit', x: 540, y: 226, 'text-anchor': 'middle' }, '1'),
      s('text', { class: 'c7-label', x: 468, y: 246, 'text-anchor': 'middle' }, 'riporto'),
      s('text', { class: 'c7-label', x: 540, y: 246, 'text-anchor': 'middle' }, 'unità'));

    const status = h('p', { class: 'c7-status', 'aria-live': 'polite' });
    const btnA = ui.btn({ label: 'Premi il tasto A', onClick: () => set('A', st.A ? 0 : 1) });
    const btnB = ui.btn({ label: 'Premi il tasto B', onClick: () => set('B', st.B ? 0 : 1) });
    function set(name, v) {
      st[name] = v;
      const r = Logic.halfAdder(st.A, st.B);
      kA.set(st.A); kB.set(st.B); rA.set(st.A); rB.set(st.B);
      bulb1.set(r.sum); bulb2.set(r.carry);
      // la corrente che scorre verso le bobine
      wPlus.classList.toggle('is-live', !!(st.A || st.B));
      wToA.classList.toggle('is-live', !!st.A);
      wCoilA.classList.toggle('is-live', !!st.A);
      wToB.classList.toggle('is-live', !!st.B);
      wCoilB.classList.toggle('is-live', !!st.B);
      btnA.setAttribute('aria-pressed', st.A ? 'true' : 'false');
      btnB.setAttribute('aria-pressed', st.B ? 'true' : 'false');
      btnA.lastChild.textContent = st.A ? 'Lascia il tasto A' : 'Premi il tasto A';
      btnB.lastChild.textContent = st.B ? 'Lascia il tasto B' : 'Premi il tasto B';
      const n = st.A + st.B;
      status.textContent = n === 0 ? '0 + 0 = 0: le lampadine restano spente.'
        : n === 1 ? st.A + ' + ' + st.B + ' = 1: si accende la lampadina delle unità.'
          : '1 + 1 = 2, che in binario si scrive 10: la lampadina delle unità resta spenta e si accende quella del riporto.';
    }
    set('A', 0);
    return ui.figure({
      class: 'c7-fig',
      art: [art, h('div', { class: 'c7-controls' }, btnA, btnB), status],
      caption: 'Il Model K ricostruito in modo stilizzato: premi i tasti (anche sul disegno). Ogni tasto chiude il circuito di un relè; i contatti dei relè accendono la lampadina delle unità quando è premuto un solo tasto, quella del riporto quando sono premuti tutti e due. L\'originale, rifatto da Stibitz, è esposto alla Denison University, in Ohio.',
    });
  }

  /* ---------- laboratorio: il sommatore ---------- */

  function labAdder() {
    const STEP = 360;
    const HALF = { gates: [{ id: 'x1', type: 'XOR', in: ['A', 'B'], out: 'S' }, { id: 'a1', type: 'AND', in: ['A', 'B'], out: 'C' }] };
    const FULL = { gates: Logic.fullAdderNet('', 'A', 'B', 'Cin', 'S', 'Cout') };
    const st = { mode: 'half', A: 1, B: 1, Cin: 0 };
    const art = PL.svg('0 0 600 250', { role: 'img', 'aria-label': 'Schema del sommatore scelto, con le porte XOR, AND e OR, gli ingressi a sinistra e le spie della somma e del riporto a destra' });
    const layer = s('g');
    art.append(layer);
    const tableBox = h('div', { class: 'c2-table' });
    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));
    let player = null;
    let tt = null;
    let vals = {};
    const full = () => st.mode === 'full';
    const names = () => (full() ? ['A', 'B', 'Cin'] : ['A', 'B']);

    function layoutHalf() {
      const X = draw.gate('XOR', { x: 250, y: 40, w: 70 });
      const A1 = draw.gate('AND', { x: 250, y: 150, w: 70 });
      const yA = X.inputs[0].y;
      const yB = A1.inputs[1].y;
      return {
        net: HALF,
        gates: { x1: X, a1: A1 },
        wires: {
          A: [draw.wire([[76, yA], [X.inputs[0].x, yA]]), draw.wire([[170, yA], [170, A1.inputs[0].y], [A1.inputs[0].x, A1.inputs[0].y]])],
          B: [draw.wire([[76, yB], [A1.inputs[1].x, yB]]), draw.wire([[140, yB], [140, X.inputs[1].y], [X.inputs[1].x, X.inputs[1].y]])],
          S: [draw.wire([[X.output.x, X.output.y], [500, X.output.y]])],
          C: [draw.wire([[A1.output.x, A1.output.y], [500, A1.output.y]])],
        },
        dots: { A: [draw.junction(170, yA)], B: [draw.junction(140, yB)] },
        leds: { S: draw.led(520, X.output.y, { r: 11 }), C: draw.led(520, A1.output.y, { r: 11 }) },
        ins: [['A', yA], ['B', yB]],
        outs: [['S', X.output.y, 'somma'], ['C', A1.output.y, 'riporto']],
      };
    }

    function layoutFull() {
      const X1 = draw.gate('XOR', { x: 170, y: 30, w: 64 });
      const X2 = draw.gate('XOR', { x: 330, y: 50, w: 64 });
      const A1 = draw.gate('AND', { x: 170, y: 160, w: 64 });
      const A2 = draw.gate('AND', { x: 330, y: 110, w: 64 });
      const O1 = draw.gate('OR', { x: 430, y: 140, w: 64 });
      const yA = X1.inputs[0].y;
      const yB = 100;
      const yC = 226;
      return {
        net: FULL,
        gates: { x1: X1, x2: X2, a1: A1, a2: A2, o1: O1 },
        wires: {
          A: [draw.wire([[76, yA], [X1.inputs[0].x, yA]]), draw.wire([[110, yA], [110, A1.inputs[0].y], [A1.inputs[0].x, A1.inputs[0].y]])],
          B: [draw.wire(elbow(76, yB, X1.inputs[1].x, X1.inputs[1].y, 140)), draw.wire([[126, yB], [126, A1.inputs[1].y], [A1.inputs[1].x, A1.inputs[1].y]])],
          Cin: [draw.wire([[76, yC], [300, yC], [300, X2.inputs[1].y], [X2.inputs[1].x, X2.inputs[1].y]]), draw.wire([[300, A2.inputs[1].y], [A2.inputs[1].x, A2.inputs[1].y]])],
          s1: [draw.wire([[X1.output.x, X1.output.y], [270, X1.output.y], [270, A2.inputs[0].y], [A2.inputs[0].x, A2.inputs[0].y]]), draw.wire([[270, X2.inputs[0].y], [X2.inputs[0].x, X2.inputs[0].y]])],
          c1: [draw.wire(elbow(A1.output.x, A1.output.y, O1.inputs[1].x, O1.inputs[1].y, 410))],
          c2: [draw.wire(elbow(A2.output.x, A2.output.y, O1.inputs[0].x, O1.inputs[0].y, 416))],
          S: [draw.wire([[X2.output.x, X2.output.y], [500, X2.output.y]])],
          Cout: [draw.wire([[O1.output.x, O1.output.y], [500, O1.output.y]])],
        },
        dots: { A: [draw.junction(110, yA)], B: [draw.junction(126, yB)], Cin: [draw.junction(300, A2.inputs[1].y)], s1: [draw.junction(270, X2.inputs[0].y)] },
        leds: { S: draw.led(520, X2.output.y, { r: 11 }), Cout: draw.led(520, O1.output.y, { r: 11 }) },
        ins: [['A', yA], ['B', yB], ['Cin', yC]],
        outs: [['S', X2.output.y, 'somma'], ['Cout', O1.output.y, 'riporto']],
      };
    }

    function inputs() {
      const o = {};
      names().forEach((n) => { o[n] = st[n]; });
      return o;
    }
    function paintVals() {
      Object.keys(vals).forEach((n) => { vals[n].textContent = String(st[n]); vals[n].classList.toggle('is-1', st[n] === 1); });
    }

    function build() {
      layer.replaceChildren();
      const L = full() ? layoutFull() : layoutHalf();
      const allWires = Object.values(L.wires).flat();
      allWires.forEach((p) => draw.setWire(p, 0, { animate: false }));
      layer.append(...allWires, ...Object.values(L.dots).flat(), ...Object.values(L.gates).map((g) => g.g), ...Object.values(L.leds).map((l) => l.g));
      vals = {};
      L.ins.forEach(([name, y]) => {
        const v = s('text', { class: 'c2-val', x: 92, y: y - 9, 'text-anchor': 'middle' }, '0');
        vals[name] = v;
        layer.append(draw.label(64, y + 5, name, 'c2-pin', 'end'), v);
      });
      L.outs.forEach(([name, y, sub]) => layer.append(draw.label(542, y + 3, name, 'c2-pin', 'start'), draw.label(542, y + 20, sub, 'c2-sub', 'start')));
      player = netPlayer({ net: L.net, wires: L.wires, dots: L.dots, gates: L.gates, leds: L.leds, step: () => STEP });
      player.reset(inputs());
      paintVals();
    }

    function buildTable() {
      const ns = names();
      tt = ui.truthTable({
        inputs: ns,
        outputs: full() ? ['S', 'Cout'] : ['S', 'C'],
        rows: Logic.combos(ns.length).map((c) => {
          const r = full() ? Logic.fullAdder(c[0], c[1], c[2]) : Logic.halfAdder(c[0], c[1]);
          return c.concat(r.sum, full() ? r.cout : r.carry);
        }),
        onPick: (i, r) => {
          const ch = {};
          ns.forEach((n, j) => { st[n] = r[j]; toggles[n].set(r[j], true); ch[n] = r[j]; });
          run(ch);
        },
      });
      tableBox.replaceChildren(tt.el);
    }

    function highlight() { tt.highlight(Logic.fromBits(names().map((n) => st[n]))); }

    function explain() {
      const v = names().map((n) => st[n]);
      const n = v.reduce((a, b) => a + b, 0);
      const c = full() ? 'Cout' : 'C';
      let msg = '<strong>' + v.join(' + ') + ' = ' + n + (n >= 2 ? ', che in binario si scrive ' + bin(n, 2) : '') + '.</strong> ';
      if (n === 0) msg += 'Nessun 1 da sommare: la somma S vale 0 e non c\'è riporto.';
      else if (n === 1) msg += 'Un solo 1: la somma S vale 1 e il riporto ' + c + ' resta a 0.';
      else if (n === 2) msg += 'Due 1: «scrivo 0 e riporto 1». S = 0 e ' + c + ' = 1.';
      else msg += 'Tre 1: 1 + 1 + 1 = 11. Sia la somma S sia il riporto Cout valgono 1.';
      say(msg);
    }

    function run(changes) {
      paintVals();
      highlight();
      player.run(changes, { done: explain });
    }

    const toggles = {};
    ['A', 'B', 'Cin'].forEach((n) => {
      toggles[n] = ui.toggle({ label: n, value: st[n], onChange: (v) => { st[n] = v; run({ [n]: v }); } });
    });
    const modeSel = ui.segmented({
      label: 'Circuito',
      options: [{ value: 'half', label: 'Semisommatore' }, { value: 'full', label: 'Sommatore completo' }],
      value: st.mode,
      onChange: (v) => { st.mode = v; sync(); },
    });
    function sync() {
      toggles.Cin.style.display = full() ? '' : 'none';
      build();
      buildTable();
      highlight();
      explain();
    }
    sync();
    return ui.lab({
      title: 'Il sommatore',
      intro: 'Il semisommatore somma due bit con una XOR e una AND. Il sommatore completo aggiunge il riporto in arrivo, Cin. Cambia gli ingressi e segui il segnale attraverso le porte.',
      controls: [modeSel.el, toggles.A, toggles.B, toggles.Cin],
      stage: h('div', { class: 'pl-lab-grid c2-grid' }, art, h('div', { class: 'pl-lab-panel' }, h('h4', null, 'Tabella della somma'), tableBox)),
      readout,
      caption: 'S è la cifra della somma, C (o Cout) il riporto che passa alla colonna successiva. Puoi anche cliccare una riga della tabella. Il ritardo di ogni porta è rallentato per seguirlo a occhio.',
    });
  }

  /* ---------- laboratorio: il riporto che corre ---------- */

  function labRipple() {
    const W = 4;
    const st = { a: 15, b: 1, step: 650 };
    const BX = (i) => 500 - i * 136;
    const BW = 92;
    const BY = 118;
    const BH = 64;
    const CY = BY + 34;
    const T0X = 92;
    const T1X = 592;
    const AXY = 278; // asse del tempo
    const art = PL.svg('0 0 620 300', { role: 'img', 'aria-label': 'Quattro sommatori completi in fila, dal bit 3 a sinistra al bit 0 a destra: il riporto passa da un sommatore al successivo verso sinistra' });

    function cell(x, y, out) {
      const t = s('text', { class: 'c3-cell-t', x, y: y + 5, 'text-anchor': 'middle' }, '0');
      const g = s('g', { class: 'c3-cell' + (out ? ' is-out' : '') }, s('rect', { x: x - 14, y: y - 14, width: 28, height: 28, rx: 7 }), t);
      return { g, set(v) { t.textContent = String(v); g.classList.toggle('is-1', !!v); } };
    }

    const wires = {};
    const blocks = [];
    const aCells = [];
    const bCells = [];
    const sCells = [];
    for (let i = 0; i < W; i++) {
      const x = BX(i);
      const cx = x + BW / 2;
      wires['A' + i] = [draw.wire([[cx - 18, 54], [cx - 18, BY]])];
      wires['B' + i] = [draw.wire([[cx + 18, 90], [cx + 18, BY]])];
      wires['S' + i] = [draw.wire([[cx, BY + BH], [cx, 218]])];
      wires['C' + (i + 1)] = [draw.wire([[x, CY], [i < W - 1 ? BX(i + 1) + BW : 58, CY]])];
      blocks.push(s('g', { class: 'c3-fa' },
        s('rect', { class: 'c3-block', x, y: BY, width: BW, height: BH, rx: 10 }),
        s('text', { class: 'c3-fa-name', x: cx, y: BY + 31, 'text-anchor': 'middle' }, 'FA'),
        s('text', { class: 'c3-fa-bit', x: cx, y: BY + 50, 'text-anchor': 'middle' }, 'bit ' + i)));
      aCells.push(cell(cx - 18, 40));
      bCells.push(cell(cx + 18, 76));
      sCells.push(cell(cx, 232, true));
    }
    wires.C0 = [draw.wire([[612, CY], [BX(0) + BW, CY]])];
    const allWires = Object.values(wires).flat();
    allWires.forEach((p) => draw.setWire(p, 0, { animate: false }));
    const ledOv = draw.led(40, CY, { r: 10, color: 'red' });
    const ticks = s('g', { class: 'c3-ticks' });
    const marker = s('circle', { class: 'c3-marker', cx: T0X, cy: AXY, r: 6 });
    const timeTxt = s('text', { class: 'c3-time-t', x: T1X, y: 262, 'text-anchor': 'end' }, '');
    art.append(...allWires, ...blocks, ...aCells.map((c) => c.g), ...bCells.map((c) => c.g), ...sCells.map((c) => c.g), ledOv.g,
      draw.label(20, 45, 'A', 'c3-row', 'start'), draw.label(20, 81, 'B', 'c3-row', 'start'), draw.label(20, 237, 'S', 'c3-row', 'start'),
      draw.label(40, CY - 20, 'C4', 'c3-tag'), draw.label(40, CY + 32, 'overflow', 'c3-tag'), draw.label(604, CY - 12, 'C0', 'c3-tag'),
      draw.label(20, AXY + 4, 'tempo', 'c3-tag', 'start'), ticks, marker, timeTxt);

    const eq = h('p', { class: 'c3-eq pl-mono' });
    // la somma in binario e, accanto (sotto, sui telefoni), la stessa somma in decimale
    const setEq = (b, d) => eq.replaceChildren(h('span', null, b), d ? h('span', { class: 'c3-eq-sep', 'aria-hidden': 'true' }, ' · ') : null, d ? h('span', null, d) : null);
    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));

    let scaleT = 8;
    function drawTicks(T) {
      scaleT = T;
      ticks.replaceChildren(s('line', { class: 'c3-axis', x1: T0X, y1: AXY, x2: T1X, y2: AXY }));
      for (let t = 0; t <= T; t++) {
        const x = T0X + (t * (T1X - T0X)) / T;
        ticks.append(s('line', { class: 'c3-tick', x1: x, y1: AXY - 5, x2: x, y2: AXY + 5 }), s('text', { class: 'c3-tick-t', x, y: AXY + 18, 'text-anchor': 'middle' }, String(t)));
      }
    }
    const tx = (t) => T0X + (t * (T1X - T0X)) / scaleT;

    const player = netPlayer({
      net: Logic.rippleNet(W),
      wires,
      leds: { C4: ledOv },
      step: () => st.step,
      onSignal: (sig, v, animate) => {
        let m = /^([ABS])(\d)$/.exec(sig);
        if (m) {
          const c = (m[1] === 'A' ? aCells : m[1] === 'B' ? bCells : sCells)[+m[2]];
          c.set(v);
          if (m[1] === 'S' && animate && !PL.reduced()) restart(c.g, 'is-flash');
        }
        if (!animate || PL.reduced()) return;
        let stage = -1;
        if ((m = /^fa(\d)_/.exec(sig))) stage = +m[1];
        else if ((m = /^S(\d)$/.exec(sig))) stage = +m[1];
        else if ((m = /^C(\d)$/.exec(sig))) stage = +m[1] - 1;
        if (stage >= 0 && stage < W) restart(blocks[stage], 'is-work');
      },
    });

    function finish(r) {
      const a = st.a;
      const b = st.b;
      const tot = a + b;
      const sum = tot & 15;
      const c4 = tot > 15;
      setEq(bin(a, 4) + ' + ' + bin(b, 4) + ' = ' + (c4 ? '1 ' : '') + bin(sum, 4), a + ' + ' + b + ' = ' + tot);
      marker.setAttribute('cx', tx(r.time).toFixed(1));
      timeTxt.textContent = 'pronto dopo ' + r.time + ' ritardi di porta';
      let chain = 0;
      let best = 0;
      Logic.rippleAdd(a, b, W).stages.forEach((sg) => { chain = sg.cout ? chain + 1 : 0; best = Math.max(best, chain); });
      const sEv = {};
      r.events.forEach((e) => { if (/^S\d$/.test(e.signal) && e.t > 0) sEv[e.signal] = (sEv[e.signal] || 0) + 1; });
      const flicker = Object.values(sEv).some((n) => n > 1);
      let msg = '<strong>La somma si è assestata dopo ' + r.time + ' ritardi di porta.</strong> ';
      if (!best) msg += 'Nessuna colonna ha prodotto un riporto: ogni bit si calcola per conto suo, ed è il caso più veloce.';
      else if (best === 1) msg += 'C\'è stato un solo riporto, assorbito subito dal sommatore vicino.';
      else if (best === W) msg += 'Il riporto è nato nel bit 0 e ha attraversato tutti e quattro i sommatori: è il caso più lento.';
      else msg += 'Il riporto ha attraversato ' + best + ' sommatori di fila: più è lunga la sua corsa, più bisogna aspettare.';
      if (flicker) msg += ' Alcune cifre della somma sono cambiate più di una volta: finché il riporto non arriva, il risultato provvisorio è sbagliato.';
      if (c4) msg += ' Il riporto finale C4 vale 1: ' + tot + ' non sta in 4 bit, dove il massimo è 15. È l\'[[Overflow|overflow]]: senza quel riporto leggeremmo ' + sum + '.';
      say(msg);
    }

    let tw = null;
    function run() {
      if (tw) tw.cancel();
      const zero = { C0: 0 };
      const ch = {};
      for (let i = 0; i < W; i++) {
        zero['A' + i] = 0;
        zero['B' + i] = 0;
        ch['A' + i] = (st.a >> i) & 1;
        ch['B' + i] = (st.b >> i) & 1;
      }
      player.reset(zero);
      setEq(bin(st.a, 4) + ' + ' + bin(st.b, 4) + ' = …');
      say('<strong>' + st.a + ' + ' + st.b + '</strong>: i bit entrano in tutti i sommatori nello stesso istante. Guarda il riporto.');
      const r = player.run(ch, { done: finish });
      drawTicks(Math.max(8, r.time));
      if (r.duration) {
        tw = PL.tween({
          from: 0, to: r.time, duration: r.duration, ease: PL.motion.ease.linear,
          onUpdate: (t) => { marker.setAttribute('cx', tx(t).toFixed(1)); timeTxt.textContent = 'tempo trascorso: ' + Math.floor(t) + ' ritardi di porta'; },
        });
      }
    }

    let deb = 0;
    const schedule = () => { clearTimeout(deb); deb = PL.timeout(run, 260); };
    const fmt4 = (v) => v + ' = ' + bin(v, 4);
    const presets = [[15, 1], [7, 9], [5, 10], [12, 12], [6, 3]];
    const preset = ui.segmented({
      label: 'Somme pronte',
      options: presets.map(([a, b]) => ({ value: a + '+' + b, label: a + ' + ' + b })),
      value: '15+1',
      onChange: (v) => {
        const [a, b] = String(v).split('+').map(Number);
        st.a = a; st.b = b;
        sa.set(a, true); sb.set(b, true);
        run();
      },
    });
    const sa = ui.slider({ label: 'A', min: 0, max: 15, step: 1, value: st.a, format: fmt4, onInput: (v) => { st.a = v; preset.set(null, true); schedule(); } });
    const sb = ui.slider({ label: 'B', min: 0, max: 15, step: 1, value: st.b, format: fmt4, onInput: (v) => { st.b = v; preset.set(null, true); schedule(); } });
    const speed = ui.segmented({
      label: 'Velocità',
      options: [{ value: 650, label: 'Al rallentatore' }, { value: 260, label: 'Più veloce' }],
      value: st.step,
      onChange: (v) => { st.step = Number(v); },
    });
    const again = ui.btn({ label: '↻ Rifai la somma', kind: 'lab', onClick: run });

    drawTicks(8);
    const zero = { C0: 0 };
    for (let i = 0; i < W; i++) { zero['A' + i] = 0; zero['B' + i] = 0; }
    player.reset(zero);
    setEq(bin(st.a, 4) + ' + ' + bin(st.b, 4) + ' = ?');
    say('Scegli una somma: il sommatore parte appena il laboratorio è sullo schermo.');
    PL.onVisible(art, () => run(), { threshold: 0.4 });

    return ui.lab({
      title: 'Il riporto che corre',
      intro: 'Quattro sommatori completi in fila sommano due numeri di 4 bit. Il bit meno significativo è a destra, come nelle somme in colonna. Scegli una somma e segui il riporto: la barra in basso conta i ritardi di porta.',
      controls: [preset.el, sa.el, sb.el, speed.el, again],
      stage: [art, eq],
      readout,
      caption: 'Ogni blocco FA è un sommatore completo, cioè le cinque porte del laboratorio precedente: per passare il riporto al vicino impiega due ritardi di porta. La spia rossa a sinistra è il riporto finale, C4.',
    });
  }

  /* ---------- laboratorio: un bit di memoria ---------- */

  function labLatch() {
    const STEP = 380;
    const st = { S: 0, R: 0, demo: false };
    const art = PL.svg('0 0 600 250', { role: 'img', 'aria-label': 'Latch SR: due porte NOR, l\'uscita di ciascuna collegata all\'ingresso dell\'altra. S entra nella porta in basso, R in quella in alto; a destra le spie Q e Q negato' });
    const N1 = draw.gate('NOR', { x: 250, y: 46, w: 76 });
    const N2 = draw.gate('NOR', { x: 250, y: 150, w: 76 });
    const yR = N1.inputs[0].y;
    const yS = N2.inputs[1].y;
    const wires = {
      R: [draw.wire([[76, yR], [N1.inputs[0].x, yR]])],
      S: [draw.wire([[76, yS], [N2.inputs[1].x, yS]])],
      Q: [draw.wire([[N1.output.x, N1.output.y], [500, N1.output.y]]),
        draw.wire([[420, N1.output.y], [420, 100], [214, 148], [214, N2.inputs[0].y], [N2.inputs[0].x, N2.inputs[0].y]])],
      Qn: [draw.wire([[N2.output.x, N2.output.y], [500, N2.output.y]]),
        draw.wire([[440, N2.output.y], [440, 150], [226, 104], [226, N1.inputs[1].y], [N1.inputs[1].x, N1.inputs[1].y]])],
    };
    Object.values(wires).flat().forEach((p) => draw.setWire(p, 0, { animate: false }));
    const dots = { Q: [draw.junction(420, N1.output.y)], Qn: [draw.junction(440, N2.output.y)] };
    const leds = { Q: draw.led(522, N1.output.y, { r: 12 }), Qn: draw.led(522, N2.output.y, { r: 12, color: 'amber' }) };
    art.append(...Object.values(wires).flat());
    const flowQ = draw.flow(wires.Q[1]);
    const flowN = draw.flow(wires.Qn[1], { cls: 'is-amber' });
    art.append(...Object.values(dots).flat(), N1.g, N2.g, leds.Q.g, leds.Qn.g,
      draw.label(62, yR + 5, 'R', 'c4-pin', 'end'), draw.label(62, yR + 22, 'azzera', 'c4-sub', 'end'),
      draw.label(62, yS + 5, 'S', 'c4-pin', 'end'), draw.label(62, yS + 22, 'imposta', 'c4-sub', 'end'),
      draw.label(546, N1.output.y + 6, 'Q', 'c4-pin', 'start'),
      draw.label(546, N2.output.y + 6, 'Q̄', 'c4-pin', 'start'), draw.label(546, N2.output.y + 23, 'non Q', 'c4-sub', 'start'));

    const rows = [
      { s: 0, r: 0, q: 'resta com\'era', name: 'memoria' },
      { s: 1, r: 0, q: '1', name: 'imposta' },
      { s: 0, r: 1, q: '0', name: 'azzera' },
      { s: 1, r: 1, q: 'vietato', name: 'vietato' },
    ];
    const trs = rows.map((r) => h('tr', { class: r.name === 'vietato' ? 'is-ban' : '' }, h('td', null, String(r.s)), h('td', null, String(r.r)), h('td', { class: 'out' }, r.q)));
    const table = h('table', { class: 'pl-tt c4-tt' }, h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'S'), h('th', { scope: 'col' }, 'R'), h('th', { scope: 'col', class: 'out' }, 'Q'))), h('tbody', null, trs));
    const paintTable = () => rows.forEach((r, i) => {
      const on = r.s === st.S && r.r === st.R;
      trs[i].classList.toggle('is-current', on);
      if (on) trs[i].setAttribute('aria-current', 'true'); else trs[i].removeAttribute('aria-current');
    });

    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));
    const player = netPlayer({
      net: Logic.SR_NOR, wires, dots, gates: { n1: N1, n2: N2 }, leds, step: () => STEP,
      onSignal: (sig) => {
        if (sig === 'Q' || sig === 'Qn') {
          const stt = player.state;
          flowQ.set(stt.Q === 1 && !PL.reduced());
          flowN.set(stt.Qn === 1 && !PL.reduced());
        }
      },
    });
    player.reset({ S: 0, R: 0 }, { Q: 0, Qn: 1 });
    flowN.set(!PL.reduced());

    let settleAt = 0;
    let holdTimer = 0;
    function explainAfter(sig, v, before) {
      const q = player.state.Q;
      if (st.S && st.R) { say('<strong>S = R = 1.</strong> Tutte e due le porte danno 0: Q e Q̄ valgono 0 insieme, e non sono più un bit e il suo opposto.'); return; }
      if (sig === 'S' && v) say(before === 1 ? '<strong>Q era già 1:</strong> premere S non cambia niente.' : '<strong>S = 1.</strong> La porta in basso riceve un 1 e Q̄ scende a 0; la porta in alto vede due 0 e alza Q a 1.');
      else if (sig === 'S') say(q ? '<strong>Hai lasciato S, ma Q resta 1.</strong> Q tiene a 0 la porta in basso, e quello 0 tiene a 1 la porta in alto: il bit si regge da solo. È la memoria.' : 'S torna a 0 e Q resta 0.');
      else if (sig === 'R' && v) say(before === 0 ? '<strong>Q era già 0:</strong> premere R non cambia niente.' : '<strong>R = 1.</strong> La porta in alto riceve un 1 e Q scende a 0; la porta in basso vede due 0 e alza Q̄ a 1.');
      else say(q ? 'R torna a 0 e Q resta 1.' : '<strong>Hai lasciato R e Q resta 0.</strong> Ora il latch ricorda uno 0, finché qualcuno non preme S.');
    }
    function input(sig, v) {
      if (st.demo) return;
      clearTimeout(holdTimer);
      const go = () => {
        const before = player.state.Q;
        st[sig] = v;
        paintTable();
        const r = player.run({ [sig]: v }, { done: () => explainAfter(sig, v, before) });
        settleAt = performance.now() + r.duration;
      };
      // un impulso più breve di due ritardi di porta non farebbe scattare il latch: si lascia andare il tasto solo a latch assestato
      const wait = v === 0 ? settleAt - performance.now() : 0;
      if (wait > 0) holdTimer = PL.timeout(go, wait + 40);
      else go();
    }
    function momentary(sig, label, aria) {
      const b = ui.btn({ label, kind: 'lab c4-hold', ariaLabel: aria });
      b.setAttribute('aria-pressed', 'false');
      let down = false;
      const press = () => { if (down) return; down = true; b.classList.add('is-down'); b.setAttribute('aria-pressed', 'true'); input(sig, 1); };
      const release = () => { if (!down) return; down = false; b.classList.remove('is-down'); b.setAttribute('aria-pressed', 'false'); input(sig, 0); };
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* puntatore già rilasciato: si continua senza cattura */ }
        press();
      });
      b.addEventListener('pointerup', release);
      b.addEventListener('pointercancel', release);
      b.addEventListener('lostpointercapture', release);
      b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); } });
      b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(); } });
      b.addEventListener('blur', release);
      return b;
    }
    const sBtn = momentary('S', 'S · tieni premuto per imposta', 'S, imposta: tieni premuto');
    const rBtn = momentary('R', 'R · tieni premuto per azzera', 'R, azzera: tieni premuto');

    let demoTimers = [];
    PL.onCleanup(() => demoTimers.forEach((id) => clearTimeout(id)));
    const demoBtn = ui.btn({
      label: 'S e R insieme, poi lascia', kind: 'lab',
      onClick: () => {
        if (st.demo) return;
        clearTimeout(holdTimer);
        st.demo = true;
        demoBtn.disabled = true;
        st.S = 1; st.R = 1;
        paintTable();
        player.run({ S: 1, R: 1 }, { done: () => say('<strong>S = R = 1.</strong> Tutte e due le porte danno 0: Q e Q̄ valgono 0 insieme. Tra un attimo lasciamo i due tasti nello stesso istante…') });
        demoTimers.push(PL.timeout(() => {
          st.S = 0; st.R = 0;
          paintTable();
          const r = player.run({ S: 0, R: 0 }, { maxT: 9 });
          say('<strong>S e R tornano a 0 insieme.</strong> Le due porte vedono due 0 e passano a 1 nello stesso momento; allora vedono un 1 e tornano a 0, poi di nuovo a 1: si rincorrono.');
          demoTimers.push(PL.timeout(() => {
            const v = Math.random() < 0.5 ? 1 : 0;
            player.reset({ S: 0, R: 0 }, { Q: v, Qn: 1 - v });
            st.demo = false;
            demoBtn.disabled = false;
            say('<strong>Questa volta Q = ' + v + ', ma poteva andare al contrario.</strong> In un circuito vero le due porte non sono mai identiche: dopo qualche oscillazione una vince per caso. Questa incertezza si chiama [[Metastabilità|metastabilità]], ed è per questo che S = R = 1 è lo [[Stato vietato|stato vietato]].');
          }, r.duration + (PL.reduced() ? 0 : 300)));
        }, PL.reduced() ? 600 : 1800));
      },
    });

    paintTable();
    say('<strong>Q = 0.</strong> Tieni premuto S per scrivere 1 nel latch, R per riportarlo a 0. Quando lasci il tasto, il valore resta: è la memoria.');
    return ui.lab({
      title: 'Un bit di memoria',
      intro: 'Due porte NOR, ognuna con l\'uscita collegata all\'ingresso dell\'altra. I tasti S e R funzionano solo finché li tieni premuti (anche con la barra spaziatrice): guarda che cosa resta quando li lasci.',
      controls: [sBtn, rBtn, demoBtn],
      stage: h('div', { class: 'pl-lab-grid c4-grid' }, art, h('div', { class: 'pl-lab-panel' }, h('h4', null, 'Che cosa fa il latch'), table)),
      readout,
      caption: 'I puntini che scorrono sui fili incrociati mostrano la retroazione: l\'uscita a 1 di una porta tiene ferma l\'altra. Q̄ (si legge «non Q») è sempre l\'opposto di Q, tranne nello stato vietato.',
    });
  }

  /* ---------- laboratorio: il battito del clock ---------- */

  function labClock() {
    const WIN = 6;
    const X0 = 70;
    const X1 = 560;
    const kx = (X1 - X0) / WIN;
    const AMP = 15;
    const QD = 0.08;
    const ROWS = [{ key: 'clk', label: 'CLK', y: 36 }, { key: 'd', label: 'D', y: 100 }, { key: 'q', label: 'Q', y: 164 }];
    const st = { now: 0, freq: 0.8, auto: true, nextEdge: 0.3, nextD: 0.9 };
    const T = { clk: track(0), d: track(0), q: track(0) };
    let samples = [];
    const status = h('p', { class: 'c5-status pl-mono' }, 'In attesa del primo fronte di salita…');

    const sch = PL.svg('0 0 600 112', { class: 'pl-svg c5-sch', role: 'img', 'aria-label': 'Un flip-flop D: l\'ingresso D e il clock entrano a sinistra, l\'uscita Q esce a destra' });
    const box = s('rect', { class: 'c5-ff', x: 250, y: 12, width: 120, height: 80, rx: 10 });
    const wD = draw.wire([[90, 34], [250, 34]]);
    const wC = draw.wire([[90, 72], [250, 72]]);
    const wQ = draw.wire([[370, 34], [500, 34]]);
    [wD, wC, wQ].forEach((p) => draw.setWire(p, 0, { animate: false }));
    const ledQ = draw.led(520, 34, { r: 10 });
    sch.append(wD, wC, wQ, box,
      s('path', { class: 'c5-tri', d: 'M250 63l13 9-13 9' }),
      draw.label(263, 39, 'D', 'c5-in', 'start'),
      draw.label(357, 39, 'Q', 'c5-in', 'end'),
      draw.label(310, 108, 'flip-flop D', 'c5-name'),
      draw.label(76, 39, 'D', 'c5-pin', 'end'),
      draw.label(76, 77, 'CLK', 'c5-pin', 'end'),
      draw.label(540, 39, 'Q', 'c5-pin', 'start'),
      ledQ.g);

    const scope = PL.svg('0 0 600 200', { class: 'pl-svg c5-scope', role: 'img', 'aria-label': 'Diagramma temporale del clock, dell\'ingresso D e dell\'uscita Q: il tempo scorre da sinistra a destra e il presente è sul bordo destro' });
    const guides = s('g');
    const polys = ROWS.map((r) => s('polyline', { class: 'c5-trace is-' + r.key }));
    scope.append(
      ...ROWS.map((r) => s('line', { class: 'c5-base', x1: X0, y1: r.y + AMP, x2: X1, y2: r.y + AMP })),
      guides, ...polys,
      ...ROWS.map((r) => draw.label(18, r.y + 5, r.label, 'c5-row', 'start')),
      s('line', { class: 'c5-now', x1: X1, y1: 12, x2: X1, y2: 190 }));

    const half = () => 0.5 / st.freq;
    function sample(t) {
      const v = T.d.at(t);
      T.q.push(t + QD, v);
      samples.push({ t, v });
      status.textContent = 'Ultimo fronte di salita: D = ' + v + ', quindi Q = ' + v + '.';
    }
    function advance(to) {
      for (;;) {
        const tc = st.nextEdge;
        const td = st.auto ? st.nextD : Infinity;
        if (Math.min(tc, td) > to) break;
        if (td <= tc) {
          T.d.push(td, 1 - T.d.last);
          st.nextD = td + 0.4 + Math.random() * 1.5;
        } else {
          const v = 1 - T.clk.last;
          T.clk.push(tc, v);
          if (v) sample(tc);
          st.nextEdge = tc + half();
        }
      }
      st.now = to;
      const keep = to - WIN - 1;
      Object.values(T).forEach((tr) => tr.prune(keep));
      samples = samples.filter((x) => x.t >= keep);
    }

    const lv = { clk: -1, d: -1, q: -1 };
    function render() {
      const t1 = st.now;
      const t0 = t1 - WIN;
      const X = (t) => X0 + (t - t0) * kx;
      ROWS.forEach((r, i) => polys[i].setAttribute('points', stepPoints(T[r.key], t0, t1, X, (v) => r.y + (v ? -AMP : AMP))));
      guides.replaceChildren(...samples.filter((x) => x.t > t0 && x.t <= t1).flatMap((x) => {
        const gx = X(x.t);
        return [
          s('line', { class: 'c5-guide', x1: gx, y1: 16, x2: gx, y2: 188 }),
          s('path', { class: 'c5-arrow', d: 'M' + gx.toFixed(1) + ' 30l-5 8h10z' }),
          s('circle', { class: 'c5-dot' + (x.v ? ' is-1' : ''), cx: gx, cy: 100 + (x.v ? -AMP : AMP), r: 4.5 }),
        ];
      }));
      const now = { clk: T.clk.at(t1), d: T.d.at(t1), q: T.q.at(t1) };
      if (now.clk !== lv.clk) { lv.clk = now.clk; draw.setWire(wC, now.clk, { animate: false }); }
      if (now.d !== lv.d) { lv.d = now.d; draw.setWire(wD, now.d, { duration: 160 }); }
      if (now.q !== lv.q) { lv.q = now.q; draw.setWire(wQ, now.q, { duration: 160 }); ledQ.set(now.q); }
      const lastS = samples.length ? samples[samples.length - 1].t : -9;
      box.classList.toggle('is-edge', t1 - lastS < 0.18);
    }

    const loopCtl = PL.loop((dt) => { advance(st.now + dt); render(); }, { el: scope, autostart: !PL.reduced() });
    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));
    const playBtn = ui.btn({
      label: loopCtl.running ? '❚❚ Pausa' : '▶︎ Avvia', kind: 'lab',
      onClick: () => { loopCtl.toggle(); playBtn.lastChild.textContent = loopCtl.running ? '❚❚ Pausa' : '▶︎ Avvia'; },
    });
    const stepBtn = ui.btn({
      label: 'Un colpo di clock', kind: 'lab',
      onClick: () => {
        const nextRise = T.clk.last === 0 ? st.nextEdge : st.nextEdge + half();
        advance(nextRise + 0.3);
        render();
      },
    });
    const freq = ui.slider({
      label: 'Clock', min: 0.3, max: 2, step: 0.1, value: st.freq,
      format: (v) => PL.fmt(v, 1) + ' battiti/s',
      onInput: (v) => {
        st.freq = v;
        const lastT = T.clk.lastT;
        st.nextEdge = Math.max(st.now, (Number.isFinite(lastT) ? lastT : st.now) + half());
      },
    });
    const manualD = ui.toggle({ label: 'D', value: 0, onChange: (v) => { T.d.push(st.now, v); render(); } });
    manualD.style.display = 'none';
    const modeSel = ui.segmented({
      label: 'Ingresso D',
      options: [{ value: 'auto', label: 'D cambia a caso' }, { value: 'manual', label: 'D a mano' }],
      value: 'auto',
      onChange: (v) => {
        st.auto = v === 'auto';
        manualD.style.display = st.auto ? 'none' : '';
        if (st.auto) st.nextD = st.now + 0.5;
        else manualD.set(T.d.at(st.now), true);
        say(st.auto
          ? 'D cambia quando vuole, anche più volte tra due battiti: Q ne prende solo il valore che trova sul fronte di salita.'
          : 'Ora D lo comandi tu. Cambialo subito dopo un fronte di salita: Q non si muove fino al battito successivo.');
      },
    });

    advance(WIN);
    render();
    say('Il flip-flop guarda D solo quando il clock sale da 0 a 1 (le linee tratteggiate) e copia quel valore in Q, dove resta fino al battito successivo. Quello che fa D tra un battito e l\'altro non conta.');
    return ui.lab({
      title: 'Il battito del clock',
      intro: 'Un flip-flop D collegato a un clock. Guarda il diagramma temporale: il tempo scorre da sinistra a destra, il presente è sul bordo destro, e ogni freccia segna un fronte di salita del clock.',
      controls: [playBtn, stepBtn, freq.el, modeSel.el, manualD],
      stage: h('div', { class: 'c5-stage' }, sch, scope, status),
      readout,
      caption: 'I pallini sulla traccia di D sono i valori letti a ogni fronte di salita. Il clock è rallentato enormemente: quello di un processore batte miliardi di volte al secondo.',
    });
  }

  /* ---------- laboratorio: il contatore ---------- */

  function labCounter() {
    const WIN = 8;
    const X0 = 64;
    const X1 = 560;
    const kx = (X1 - X0) / WIN;
    const AMP = 11;
    const RIPPLE = 0.04;
    const ROWS = [{ key: 'clk', label: 'CLK', y: 26 }, { key: 'q0', label: 'Q0', y: 68 }, { key: 'q1', label: 'Q1', y: 110 }, { key: 'q2', label: 'Q2', y: 152 }, { key: 'q3', label: 'Q3', y: 194 }];
    const st = { now: 0, freq: 2, n: 0, nextEdge: 0.25 };
    const T = { clk: track(0), q0: track(0), q1: track(0), q2: track(0), q3: track(0) };

    const sch = PL.svg('0 0 620 160', { class: 'pl-svg c6-sch', role: 'img', 'aria-label': 'Quattro flip-flop in catena: il clock entra nel primo, l\'uscita di ciascuno fa da clock al successivo; sotto, le spie Q0, Q1, Q2 e Q3' });
    const FX = (i) => 90 + i * 130;
    const wClk = draw.wire([[30, 72], [FX(0), 72]]);
    const outW = [];
    const taps = [];
    const leds = [];
    const boxes = [];
    const dots = [];
    const parts = [];
    for (let i = 0; i < 4; i++) {
      const x = FX(i);
      outW.push(draw.wire(i < 3 ? [[x + 80, 44], [x + 102, 44], [x + 102, 72], [FX(i + 1), 72]] : [[x + 80, 44], [x + 114, 44]]));
      taps.push(draw.wire([[x + 92, 44], [x + 92, 112]]));
      dots.push(draw.junction(x + 92, 44));
      leds.push(draw.led(x + 92, 124, { r: 10 }));
      const box = s('rect', { class: 'c6-ff', x, y: 28, width: 80, height: 58, rx: 9 });
      boxes.push(box);
      parts.push(box,
        s('path', { class: 'c6-tri', d: 'M' + x + ' 64l11 8-11 8' }),
        i ? s('circle', { class: 'c6-bub', cx: x - 4, cy: 72, r: 4 }) : null,
        draw.label(x + 40, 52, 'FF' + i, 'c6-name'),
        draw.label(x + 72, 49, 'Q', 'c6-in', 'end'),
        draw.label(x + 92, 154, 'Q' + i, 'c6-q'));
    }
    [wClk, ...outW, ...taps].forEach((p) => draw.setWire(p, 0, { animate: false }));
    sch.append(wClk, ...outW, ...taps, ...dots, ...parts.filter(Boolean), ...leds.map((l) => l.g), draw.label(30, 62, 'CLK', 'c6-pin', 'start'));

    const bitEls = [3, 2, 1, 0].map((i) => h('span', { class: 'c6-b', 'data-bit': String(i) }, '0'));
    const numEl = h('strong', { class: 'c6-n' }, '0');
    const sumEl = h('span', { class: 'c6-sum' });
    const num = h('p', { class: 'c6-num', 'aria-live': 'off' }, h('span', { class: 'c6-lbl pl-mono' }, 'Q3 Q2 Q1 Q0 ='), h('span', { class: 'c6-bits pl-mono' }, bitEls), h('span', { class: 'c6-eq', 'aria-hidden': 'true' }, '='), numEl, sumEl);

    const scope = PL.svg('0 0 600 214', { class: 'pl-svg c6-scope', role: 'img', 'aria-label': 'Diagramma temporale del clock e delle uscite Q0, Q1, Q2 e Q3: ogni uscita ha la metà della frequenza della precedente' });
    const guides = s('g');
    const polys = ROWS.map((r) => s('polyline', { class: 'c6-trace is-' + r.key }));
    scope.append(...ROWS.map((r) => s('line', { class: 'c6-base', x1: X0, y1: r.y + AMP, x2: X1, y2: r.y + AMP })), guides, ...polys,
      ...ROWS.map((r) => draw.label(16, r.y + 5, r.label, 'c6-row', 'start')), s('line', { class: 'c6-now', x1: X1, y1: 8, x2: X1, y2: 208 }));

    function count(t) {
      const prev = st.n;
      st.n = (prev + 1) % 16;
      for (let i = 0; i < 4; i++) {
        const b = (st.n >> i) & 1;
        if (b !== ((prev >> i) & 1)) T['q' + i].push(t + (i + 1) * RIPPLE, b);
      }
    }
    function advance(to) {
      while (st.nextEdge <= to) {
        const t = st.nextEdge;
        const v = 1 - T.clk.last;
        T.clk.push(t, v);
        if (v) count(t);
        st.nextEdge = t + 0.5 / st.freq;
      }
      st.now = to;
      Object.values(T).forEach((tr) => tr.prune(to - WIN - 1));
    }

    const lv = { clk: -1, q: [-1, -1, -1, -1], shown: -1 };
    function render() {
      const t1 = st.now;
      const t0 = t1 - WIN;
      const X = (t) => X0 + (t - t0) * kx;
      ROWS.forEach((r, i) => polys[i].setAttribute('points', stepPoints(T[r.key], t0, t1, X, (v) => r.y + (v ? -AMP : AMP))));
      guides.replaceChildren(...T.clk.edges.filter((e) => e.v === 1 && e.t > t0 && e.t <= t1).map((e) => s('line', { class: 'c6-guide', x1: X(e.t), y1: 10, x2: X(e.t), y2: 206 })));
      const c = T.clk.at(t1);
      if (c !== lv.clk) { lv.clk = c; draw.setWire(wClk, c, { animate: false }); }
      let shown = 0;
      for (let i = 0; i < 4; i++) {
        const v = T['q' + i].at(t1);
        shown |= v << i;
        if (v !== lv.q[i]) {
          lv.q[i] = v;
          draw.setWire(outW[i], v, { animate: false });
          draw.setWire(taps[i], v, { animate: false });
          dots[i].classList.toggle('is-1', !!v);
          leds[i].set(v);
          if (!PL.reduced()) restart(boxes[i], 'is-tick');
        }
      }
      if (shown !== lv.shown) {
        lv.shown = shown;
        bitEls.forEach((el) => { const b = (shown >> Number(el.dataset.bit)) & 1; el.textContent = String(b); el.classList.toggle('is-1', b === 1); });
        numEl.textContent = String(shown);
        const list = [8, 4, 2, 1].filter((w) => shown & w);
        sumEl.textContent = list.length > 1 ? '(' + list.join(' + ') + ')' : '';
      }
    }

    const loopCtl = PL.loop((dt) => { advance(st.now + dt); render(); }, { el: scope, autostart: !PL.reduced() });
    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));
    const playBtn = ui.btn({
      label: loopCtl.running ? '❚❚ Pausa' : '▶︎ Avvia', kind: 'lab',
      onClick: () => { loopCtl.toggle(); playBtn.lastChild.textContent = loopCtl.running ? '❚❚ Pausa' : '▶︎ Avvia'; },
    });
    const stepBtn = ui.btn({
      label: 'Un impulso di clock', kind: 'lab',
      onClick: () => {
        const nextRise = T.clk.last === 0 ? st.nextEdge : st.nextEdge + 0.5 / st.freq;
        advance(nextRise + 0.3);
        render();
        say('Un impulso: il contatore vale ora <strong>' + st.n + '</strong>' + (st.n === 0 ? '. Dopo 15 si ricomincia da 0, come per un byte dopo 255.' : '.'));
      },
    });
    const freq = ui.slider({
      label: 'Clock', min: 0.5, max: 4, step: 0.5, value: st.freq,
      format: (v) => PL.fmt(v, 1) + ' battiti/s',
      onInput: (v) => {
        st.freq = v;
        const lastT = T.clk.lastT;
        st.nextEdge = Math.max(st.now, (Number.isFinite(lastT) ? lastT : st.now) + 0.5 / v);
      },
    });
    const resetBtn = ui.btn({
      label: 'Azzera', kind: 'lab',
      onClick: () => {
        st.n = 0;
        for (let i = 0; i < 4; i++) T['q' + i].push(st.now, 0);
        render();
        say('Contatore azzerato: tutte le uscite a 0.');
      },
    });

    advance(WIN - 0.2);
    render();
    say('Q0 cambia a ogni battito del clock, Q1 ogni due, Q2 ogni quattro, Q3 ogni otto: ogni flip-flop dimezza la frequenza del precedente. Lette insieme, le quattro uscite contano in binario da 0 a 15, poi ricominciano.');
    return ui.lab({
      title: 'Il contatore',
      intro: 'Quattro flip-flop in catena. Il primo cambia stato a ogni battito del clock; ognuno degli altri cambia quando quello precedente torna da 1 a 0 (lo indica il pallino sul suo ingresso di clock).',
      controls: [playBtn, stepBtn, freq.el, resetBtn],
      stage: h('div', { class: 'c6-stage' }, sch, num, scope),
      readout,
      caption: 'Ogni stadio aspetta il precedente, così i flip-flop scattano uno dopo l\'altro, come un\'onda: per questo si chiama contatore asincrono, o a propagazione. Le linee verticali segnano i fronti di salita del clock.',
    });
  }

  /* ---------- capitolo ---------- */

  PL.chapter({
    id: 'calcolo',
    num: 3,
    title: 'Porte che contano e ricordano',
    short: 'Calcolo',
    era: '1703 – 1970',
    minutes: 19,
    labs: 6,
    kicker: 'Con poche porte si somma; con due porte richiuse ad anello si ricorda un bit. Aritmetica e memoria, i due pilastri di ogni computer, nascono da qui.',
    summary: 'Bit, sommatori, riporti, latch, flip-flop e contatori: come poche porte imparano a fare i conti e a ricordare.',
    timeline: [
      { year: 1703, title: 'L\'aritmetica binaria di Leibniz', text: 'Leibniz presenta all\'Accademia delle scienze di Parigi la sua «Spiegazione dell\'aritmetica binaria».', key: true },
      { year: 1918, title: 'Il relè a scatto di Eccles e Jordan', text: 'Due triodi collegati a croce ricordano uno stato: è il primo flip-flop.', key: true },
      { year: 1932, title: 'Il contatore a scala di due', text: 'Wynn-Williams conta le particelle con una catena di thyratron, ognuno dei quali dimezza gli impulsi.' },
      { year: 1937, title: 'Il Model K di Stibitz', text: 'Due relè e due lampadine sul tavolo di cucina: un sommatore binario.', key: true },
      { year: 1940, title: 'Il primo calcolo a distanza', text: 'Da Dartmouth, una telescrivente comanda il Complex Number Calculator di Stibitz, a New York.' },
      { year: 1948, title: 'La parola bit, stampata', text: 'Shannon la usa nella sua teoria dell\'informazione e la attribuisce a John Tukey.' },
      { year: 1956, title: 'Nasce la parola byte', text: 'Werner Buchholz la conia all\'IBM, con la y per non confonderla con bit.' },
      { year: 1970, title: 'Un\'ALU in un solo chip', text: 'Il 74181 della Texas Instruments esegue 32 operazioni su numeri di 4 bit.' },
    ],
    glossary: [
      { term: 'Bit', def: 'La più piccola unità di informazione: una cifra binaria, che vale 0 oppure 1. Il nome, contrazione di binary digit, fu proposto da John Tukey.' },
      { term: 'Byte', def: 'Gruppo di bit trattato come un\'unità; oggi quasi sempre 8 bit, che bastano per 256 valori diversi.' },
      { term: 'Sistema binario', def: 'Sistema di numerazione in base 2, con le sole cifre 0 e 1: ogni posizione vale il doppio di quella alla sua destra (1, 2, 4, 8, 16…).' },
      { term: 'Semisommatore', def: 'Circuito che somma due bit: una XOR dà la cifra della somma, una AND il riporto.' },
      { term: 'Sommatore completo', def: 'Circuito che somma tre bit, i due addendi e il riporto in arrivo, e produce una cifra della somma e un nuovo riporto. Messi in fila, formano sommatori di quanti bit si vuole.' },
      { term: 'Riporto', def: 'La cifra che passa alla colonna successiva quando una somma non sta in una sola cifra: in binario succede già con 1 + 1 = 10.' },
      { term: 'Overflow', def: 'Traboccamento: il risultato è troppo grande per i bit disponibili e il riporto finale va perso, come un contachilometri che torna a zero.' },
      { term: 'Ritardo di propagazione', def: 'Il tempo che passa tra il cambio di un ingresso e la risposta dell\'uscita di una porta o di un circuito. Lungo una catena di porte i ritardi si sommano.' },
      { term: 'Latch', def: 'Circuito di memoria fatto di porte retroazionate che conserva un bit. Nella versione SR si imposta a 1 con l\'ingresso S e si azzera con R.' },
      { term: 'Flip-flop', def: 'Circuito di memoria a due stati. Nella versione D cambia solo sul fronte del clock, copiando in quell\'istante l\'ingresso D sull\'uscita Q.' },
      { term: 'Clock', def: 'Segnale a onda quadra che scandisce il tempo di un circuito digitale: a ogni battito i flip-flop registrano i nuovi valori.' },
      { term: 'Registro', def: 'Gruppo di flip-flop comandati dallo stesso clock che memorizzano insieme una parola di più bit, per esempio un byte.' },
      { term: 'Contatore', def: 'Catena di flip-flop che avanza di uno a ogni impulso di clock; ogni stadio cambia a metà della frequenza del precedente.' },
      { term: 'Retroazione', def: 'Collegamento che riporta l\'uscita di un circuito verso il suo ingresso. Nelle porte logiche è il trucco che permette di ricordare.' },
      { term: 'ALU', def: 'Unità aritmetica e logica: il circuito che esegue somme, sottrazioni e operazioni logiche sui dati, scegliendo l\'operazione in base ad alcuni bit di comando.' },
      { term: 'Fronte di salita', def: 'L\'istante in cui un segnale digitale passa da 0 a 1. Molti flip-flop reagiscono soltanto a questo istante.' },
      { term: 'Stato vietato', def: 'Nel latch SR, la combinazione S = R = 1: le due uscite valgono 0 insieme e, al rilascio, il valore memorizzato diventa imprevedibile.' },
      { term: 'Metastabilità', def: 'Stato incerto in cui un circuito di memoria resta per un attimo né a 0 né a 1, prima di cadere a caso su uno dei due.' },
    ],
    render(root) {
      root.append(
        ui.section({ id: 'binario', title: 'Contare con due cifre', kicker: '1679 – 1703 · Leibniz' },
          ui.prose(
            'Noi contiamo con dieci cifre, forse perché abbiamo dieci dita. Ma per contare ne bastano due. Nel [[Sistema binario|sistema binario]] esistono soltanto 0 e 1, e ogni posizione vale il doppio di quella alla sua destra: 1, 2, 4, 8, 16 e così via. Il numero 13 si scrive 1101, cioè 8 + 4 + 0 + 1.',
            'Il primo a studiarlo a fondo fu il filosofo e matematico tedesco Gottfried Wilhelm Leibniz. In un manoscritto del 1679 ne descrisse le regole e immaginò perfino una macchina che calcolasse in binario con delle palline, lasciate cadere o trattenute da fori che si aprono e si chiudono. Nel 1703 presentò all\'Accademia delle scienze di Parigi la sua «Spiegazione dell\'aritmetica binaria», dove mostrava che in base 2 i calcoli diventano semplicissimi: per sommare basta sapere che 1 + 1 fa 10, cioè «scrivo 0 e riporto 1».',
            'Contare in binario funziona come il contachilometri di una vecchia automobile, con rotelle di due sole cifre invece che di dieci: quando una rotella passa da 1 a 0, fa scattare di uno quella alla sua sinistra.'),
          labBinary(),
          ui.prose(
            'Ogni cifra binaria si chiama [[Bit|bit]], da binary digit, «cifra binaria». La parola la propose lo statistico John Tukey nel 1947 e la rese famosa Claude Shannon nel 1948, nell\'articolo con cui fondò la teoria dell\'informazione. Otto bit formano un [[Byte|byte]]: con otto interruttori si ottengono 256 combinazioni, abbastanza per tutte le lettere, le cifre e i segni di una tastiera.',
            'Anche byte ha una storia: la parola la coniò Werner Buchholz all\'IBM nel 1956, scrivendola con la y perché non si confondesse con bit. All\'inizio un byte poteva avere un numero variabile di bit; gli 8 bit diventarono lo standard nel 1964, con i calcolatori IBM System/360.'),
          ui.quote({
            text: 'Se si usa la base 2, le unità che ne risultano si possono chiamare cifre binarie o, più brevemente, bit, una parola suggerita da J. W. Tukey.',
            original: 'If the base 2 is used the resulting units may be called binary digits, or more briefly bits, a word suggested by J. W. Tukey.',
            author: 'Claude Shannon', source: 'A Mathematical Theory of Communication', year: 1948,
          }),
          ui.cols(
            ui.person({
              name: 'Gottfried Wilhelm Leibniz', years: '1646 – 1716', role: 'filosofo e matematico',
              body: [
                'Giurista, diplomatico e bibliotecario alla corte di Hannover, fu uno degli ultimi geni universali: inventò il calcolo infinitesimale, indipendentemente da Newton, e costruì una delle prime calcolatrici meccaniche capaci di moltiplicare.',
                'Sognava una lingua con cui risolvere ogni disputa facendo un calcolo. Nel sistema binario vedeva anche un simbolo religioso: ogni numero nasce dall\'uno e dal nulla, come il mondo nella Creazione.',
              ],
            }),
            ui.callout({
              kind: 'fun',
              title: 'Un antico libro cinese',
              body: 'Nell\'aprile 1703, pochi giorni prima di spedire il suo articolo a Parigi, Leibniz ricevette dal gesuita Joachim Bouvet, missionario a Pechino, un disegno dei 64 esagrammi dell\'I Ching, l\'antico libro cinese dei mutamenti: figure di sei linee, intere o spezzate. Leibniz vi riconobbe con entusiasmo i numeri da 0 a 63 scritti in binario, con la linea spezzata al posto dello 0 e quella intera al posto dell\'1.',
            })),
          ui.callout({
            kind: 'warn',
            title: 'Bit o byte?',
            body: 'Le velocità di Internet si misurano in bit al secondo, le memorie e i file in byte, e un byte vale 8 bit. Una connessione da 100 Mb/s (megabit al secondo) scarica al massimo 12,5 MB (megabyte) al secondo. La b minuscola indica il bit, la B maiuscola il byte.',
          })),

        ui.section({ id: 'sommare', title: 'Una somma fatta di porte', kicker: '1937 · Bell Labs' },
          ui.prose(
            'Nel 1937 George Stibitz, matematico dei Bell Telephone Laboratories, doveva studiare i [[Relè|relè]] delle centrali telefoniche, e si accorse che un relè, attratto o a riposo, è già una cifra binaria. In novembre prese in prestito due relè di scarto, ritagliò delle strisce di metallo da una scatola di tabacco per farne dei tasti, comprò una pila e qualche lampadina da torcia e montò tutto su una tavoletta, sul tavolo della cucina. Premendo i tasti, le lampadine mostravano la somma di due cifre binarie. Lo battezzarono Model K, con la K di kitchen, cucina.'),
          figModelK(),
          ui.prose(
            'Guardiamo da vicino la somma di due bit: 0 + 0 = 0, 0 + 1 = 1, 1 + 0 = 1 e 1 + 1 = 10. La cifra delle unità vale 1 quando i due bit sono diversi: è una [[XOR]]. Il [[Riporto|riporto]] vale 1 solo quando sono 1 entrambi: è una [[AND]]. Due porte, ed ecco un [[Semisommatore|semisommatore]].',
            'Per sommare numeri di più cifre, però, ogni colonna deve tenere conto anche del riporto che arriva dalla colonna alla sua destra: servono tre ingressi. Il [[Sommatore completo|sommatore completo]] è fatto di due semisommatori e di una OR che raccoglie i due riporti possibili.'),
          labAdder(),
          ui.person({
            name: 'George Stibitz', years: '1904 – 1995', role: 'matematico, Bell Labs',
            body: [
              'Dopo il Model K i Bell Labs gli affidarono una macchina vera: il Complex Number Calculator, circa 450 relè telefonici, entrato in funzione nel 1940, che faceva le quattro operazioni sui numeri complessi.',
              'Nel settembre 1940, a un congresso di matematici al Dartmouth College, nel New Hampshire, lo fece usare da una telescrivente collegata per telefono alla macchina di New York: probabilmente il primo calcolo a distanza della storia. Tra il pubblico c\'erano Norbert Wiener e John Mauchly.',
            ],
          })),

        ui.section({ id: 'riporto', title: 'Il riporto che corre', lead: 'In un sommatore a più bit il riporto passa da una colonna all\'altra, e ogni passaggio costa tempo.' },
          ui.prose('Mettendo in fila quattro sommatori completi si ottiene un sommatore a 4 bit: il riporto di ogni stadio entra nello stadio successivo, proprio come nelle somme in colonna. È semplice, ma ha un difetto: ogni stadio deve aspettare il riporto di quello precedente. Il risultato è pronto solo quando il riporto ha finito la sua corsa, e ogni porta attraversata aggiunge il suo [[Ritardo di propagazione|ritardo di propagazione]].'),
          labRipple(),
          ui.prose(
            'Il riporto che esce dall\'ultimo stadio segnala l\'[[Overflow|overflow]], il traboccamento: il risultato non sta nei bit disponibili. Con 4 bit si arriva al massimo a 15, e 12 + 12 dà 8 più un riporto che non ha dove andare. Quasi ogni processore ha un indicatore apposta per segnalarlo, e i programmi devono controllarlo.',
            'Per andare più veloci, i progettisti inventarono circuiti che calcolano in anticipo se un gruppo di colonne produrrà un riporto, senza aspettarlo colonna per colonna. E accanto al sommatore misero le operazioni logiche bit per bit (AND, OR, XOR) con un selettore per scegliere quale eseguire: è l\'[[ALU]], l\'unità aritmetica e logica, il cuore di calcolo di ogni processore. Nel 1970 la Texas Instruments mise un\'intera ALU a 4 bit in un solo chip, il 74181: l\'equivalente di 75 porte, capace di 16 operazioni aritmetiche e 16 operazioni logiche.'),
          ui.cols(
            ui.callout({
              kind: 'fun',
              title: 'Il video che riempì un contatore',
              body: 'Nel dicembre 2014 il video musicale «Gangnam Style» superò 2.147.483.647 visualizzazioni: il numero più grande che sta in un contatore a 32 bit con segno. YouTube, che aveva già aggiornato i suoi contatori a 64 bit, ci scherzò su: nessuno aveva immaginato che un video potesse essere visto così tante volte.',
            }),
            ui.callout({
              kind: 'link',
              title: 'Dentro il processore',
              body: 'Come un\'ALU, dei registri e un clock diventano un processore lo racconta la sezione sui <a href="../chip-programmabili/index.html#idea">primi chip programmabili</a>.',
            }))),

        ui.section({ id: 'ricordare', title: 'Un anello che ricorda', kicker: '1918 · Il relè a scatto' },
          ui.prose(
            'Le porte viste finora non hanno memoria: la loro uscita dipende solo dagli ingressi di quell\'istante, e tolto l\'ingresso il risultato sparisce. Per ricordare serve un trucco: riportare l\'uscita indietro, verso l\'ingresso, in modo che il circuito si tenga da solo. È la [[Retroazione|retroazione]].',
            'Nel 1918 due fisici inglesi, William Eccles e Frank Wilfred Jordan, depositarono il brevetto di un circuito con due [[Triodo|triodi]] collegati a croce: quando uno conduceva, teneva spento l\'altro. Un impulso lo faceva scattare in uno dei due stati, e lì restava finché un altro impulso non lo riportava indietro. Lo chiamarono «relè a scatto» (trigger relay) e lo descrissero nel 1919 sulla rivista The Electrician. Oggi lo chiamiamo [[Flip-flop|flip-flop]], ed è l\'antenato di ogni memoria elettronica veloce.',
            'Con le porte logiche lo stesso anello si costruisce con due NOR: l\'uscita di ciascuna entra nell\'altra. È il [[Latch|latch]] SR. Un impulso su S (set, imposta) scrive 1, un impulso su R (reset, azzera) scrive 0; quando entrambi tornano a 0, il circuito ricorda l\'ultimo valore.'),
          labLatch(),
          ui.cols(
            ui.person({
              name: 'William Eccles', years: '1875 – 1966', role: 'fisico',
              body: [
                'Fisico e ingegnere, fu uno dei pionieri della radiotelegrafia in Gran Bretagna e studiò a lungo le valvole termoioniche, che in quegli anni stavano trasformando la radio.',
                'Con Frank Wilfred Jordan (1881 – 1941), di cui si sa pochissimo, inventò il circuito a due stati che oggi chiamiamo flip-flop.',
              ],
            }),
            ui.callout({
              kind: 'link',
              title: 'La memoria più veloce',
              body: 'La memoria più veloce di un computer, la cache dentro il processore, è fatta di celle costruite con lo stesso principio: due invertitori collegati ad anello per ogni bit. Della gerarchia delle memorie parla la sezione sulla <a href="../storia-pc/index.html#memoria">storia dei PC</a>.',
            }))),

        ui.section({ id: 'clock', title: 'Il battito del clock', lead: 'Per far lavorare insieme migliaia di memorie serve un direttore d\'orchestra: un segnale che batte il tempo.' },
          ui.prose(
            'Un latch obbedisce ai suoi ingressi in ogni istante, e in un circuito grande è un problema: i segnali arrivano con ritardi diversi e per un attimo possono essere sbagliati, come i [[Glitch|glitch]] del capitolo precedente. La soluzione è il [[Clock|clock]], un\'onda quadra che batte un ritmo regolare e dice a tutti quando guardare.',
            'Il flip-flop D legge il suo ingresso D solo nell\'istante in cui il clock passa da 0 a 1, il [[Fronte di salita|fronte di salita]], e copia quel valore sull\'uscita Q, dove resta fino al battito successivo. Tra un battito e l\'altro i segnali hanno tutto il tempo di assestarsi. Funziona come il registratore di temperatura di una cella frigorifera: annota il valore allo scoccare di ogni minuto, qualunque cosa succeda nel frattempo.'),
          labClock(),
          ui.prose('Il battito non può essere più veloce del percorso più lungo tra due flip-flop: il riporto che corre, per esempio, deve arrivare in fondo prima del colpo successivo. Per questo sommatori più veloci permettono clock più veloci. Il clock di un processore di oggi batte oltre quattro miliardi di volte al secondo, e il suo ritmo nasce da un oscillatore al quarzo.'),
          ui.callout({
            kind: 'link',
            title: 'Da dove viene il battito',
            body: 'Come un cristallo di quarzo vibra milioni di volte al secondo, e come quel ritmo viene moltiplicato fino ai gigahertz, lo spiega la sezione di <a href="../elettronica-avanzata/index.html#clock">elettronica avanzata</a>.',
          })),

        ui.section({ id: 'contatori', title: 'Registri e contatori', kicker: '1932 · Cambridge' },
          ui.prose(
            'Otto flip-flop affiancati, comandati dallo stesso clock, formano un [[Registro|registro]]: a ogni battito memorizzano un byte intero. I registri sono la memoria di lavoro di un processore, i foglietti su cui appoggia i numeri mentre fa i conti.',
            'Collegando invece i flip-flop in catena, in modo che ciascuno cambi stato quando il precedente torna a 0, si ottiene un [[Contatore|contatore]]. Il primo stadio cambia a ogni impulso, il secondo ogni due, il terzo ogni quattro: ogni stadio dimezza la frequenza, e le uscite lette insieme contano in binario.',
            'L\'idea nacque per contare particelle. Nel 1932, al Cavendish Laboratory di Cambridge, il fisico gallese Charles Eryl Wynn-Williams costruì con delle valvole a gas, i thyratron, un contatore a «scala di due»: ogni stadio passava un impulso al successivo ogni due ricevuti. Così poteva contare le particelle emesse dalle sostanze radioattive molto più in fretta di qualunque contatore meccanico.'),
          labCounter(),
          ui.cols(
            ui.person({
              name: 'Charles Eryl Wynn-Williams', years: '1903 – 1979', role: 'fisico',
              body: [
                'Nato a Swansea, in Galles, lavorò al Cavendish Laboratory con Ernest Rutherford, inventando gli strumenti elettronici per contare le particelle della fisica nucleare.',
                'Durante la Seconda guerra mondiale progettò i contatori elettronici delle macchine Heath Robinson, usate a Bletchley Park contro i messaggi cifrati dell\'alto comando tedesco: un passo verso Colossus.',
              ],
            }),
            ui.callout({
              kind: 'note',
              title: 'Quanto tiene un contatore',
              body: 'Ogni bit in più raddoppia il conteggio. Un contatore a 8 bit torna a zero dopo 255, uno a 32 bit dopo più di quattro miliardi. Uno a 64 bit, che avanzasse di uno a ogni nanosecondo, impiegherebbe circa 584 anni a riempirsi.',
            })),
          ui.stats([
            { value: 255, label: 'il numero più grande con 8 bit', note: 'un byte: 256 valori, da 0 a 255' },
            { value: 65535, label: 'il più grande con 16 bit' },
            { value: 4294967295, label: 'il più grande con 32 bit', note: 'oltre quattro miliardi' },
            { value: 584, unit: 'anni', label: 'per riempire 64 bit', note: 'contando un miliardo di volte al secondo' },
          ]),
          ui.keyIdea('Con poche porte si somma: è l\'aritmetica. Con due porte richiuse ad anello si ricorda un bit: è la memoria. Il clock mette tutto al passo, e da qui nascono ALU, registri e contatori. Per costruirne milioni mancava solo un interruttore abbastanza veloce, piccolo e affidabile.'),
          ui.crossLink({ href: '#interruttori', kicker: 'Capitolo 4', title: 'Relè, valvole, transistor', text: 'Gli interruttori con cui le porte sono state costruite davvero, dai relè dei primi calcolatori al transistor.' })));
    },
  });
})();
