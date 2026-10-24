/*
 * Capitolo 5 · Le famiglie logiche (1956 – oggi).
 * Come si costruisce davvero una porta con transistor, resistenze e diodi, e perché l'industria è passata
 * da RTL e DTL alla TTL, alla ECL e infine alla CMOS: un compromesso continuo tra velocità, consumo e disturbi.
 * Laboratori: una porta RTL e il fan-out, dentro il 7400, CMOS a due squadre, velocità contro consumo,
 * margine di rumore. Figure: le quattro misure di una famiglia, la corrente che cambia strada (ECL).
 */
(function () {
  'use strict';

  const { h, s, ui, draw } = PL;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const n1 = (v) => Math.round(v * 10) / 10;
  const volt = (v) => PL.fmt(v, 2) + ' V';
  const milliA = (i) => PL.fmt(i * 1000, 2) + ' mA';
  const milliW = (p) => PL.fmt(p * 1000, 0) + ' mW';

  /* Numeri pseudocasuali con seme: lo stesso disturbo a ogni visita, anche con il movimento ridotto. */
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

  /* Transistor bipolare NPN con il centro in (x, y); con mirror la base entra da destra. */
  function npn(x, y, mirror) {
    const d = mirror ? -1 : 1;
    const bx = x - 10 * d;
    const ang = (Math.atan2(12, 16 * d) * 180) / Math.PI;
    const g = s('g', { class: 'f-npn' },
      s('circle', { class: 'f-npn-env', cx: x - 2 * d, cy: y, r: 22 }),
      s('line', { class: 'f-npn-lead', x1: x - 28 * d, y1: y, x2: bx, y2: y }),
      s('line', { class: 'f-npn-bar', x1: bx, y1: y - 15, x2: bx, y2: y + 15 }),
      s('path', { class: 'f-npn-lead', d: `M${bx} ${y - 7}L${x + 6 * d} ${y - 19}V${y - 30}` }),
      s('path', { class: 'f-npn-lead', d: `M${bx} ${y + 7}L${x + 6 * d} ${y + 19}V${y + 30}` }),
      s('path', { class: 'f-npn-arrow', d: 'M-7 -4L0 0L-7 4Z', transform: `translate(${x + 3 * d} ${y + 16.75}) rotate(${n1(ang)})` }));
    return {
      g, b: { x: x - 28 * d, y }, c: { x: x + 6 * d, y: y - 30 }, e: { x: x + 6 * d, y: y + 30 },
      set(on) { g.classList.toggle('is-on', !!on); },
    };
  }

  /* Puntini di corrente lungo un elemento (o un percorso non disegnato), raccolti in un livello sopra lo schema. */
  function flowIn(layer) {
    return (el, opts) => {
      const f = draw.flow(el, opts);
      layer.append(f.el);
      return f;
    };
  }
  const route = (d) => s('path', { d });

  /* ---------- figura: le quattro misure di una famiglia ---------- */

  function figMeasures() {
    const ticks = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ticks.push(s('line', { class: 'f0-tick', x1: n1(32 + Math.sin(a) * 16), y1: n1(36 - Math.cos(a) * 16), x2: n1(32 + Math.sin(a) * 19), y2: n1(36 - Math.cos(a) * 19) }));
    }
    const ends = [12, 25, 39, 52];
    const icons = {
      speed: PL.svg('0 0 64 64', null,
        s('circle', { class: 'f0-ring', cx: 32, cy: 36, r: 22 }),
        s('rect', { class: 'f0-crown', x: 28, y: 5, width: 8, height: 7, rx: 2 }),
        ...ticks,
        s('line', { class: 'f0-hand', x1: 32, y1: 36, x2: 32, y2: 21 }),
        s('circle', { class: 'f0-pivot', cx: 32, cy: 36, r: 2.6 })),
      power: PL.svg('0 0 64 64', null,
        s('path', { class: 'f0-bolt', d: 'M37 5L15 36h14l-4 23 23-33H33z' })),
      fan: PL.svg('0 0 64 64', null,
        s('path', { class: 'f0-branch', d: 'M5 32H23' }),
        ...ends.map((y) => s('path', { class: 'f0-branch', d: `M23 32C36 32 34 ${y} 47 ${y}` })),
        ...ends.map((y) => s('path', { class: 'f0-pulse', d: `M5 32H23C36 32 34 ${y} 47 ${y}`, pathLength: 100 })),
        ...ends.map((y, i) => s('circle', { class: 'f0-end', cx: 52, cy: y, r: 4.5, style: { '--i': i } })),
        s('circle', { class: 'f0-src', cx: 23, cy: 32, r: 3.5 })),
      noise: PL.svg('0 0 64 64', null,
        s('rect', { class: 'f0-band', x: 4, y: 25, width: 56, height: 15 }),
        s('path', { class: 'f0-wave', d: 'M4 50L8 49 11 51 14 49 16 50 17 14 20 15 23 13 26 15 29 14 31 15 32 50 35 49 38 51 41 49 44 50 45 14 48 15 51 13 54 15 57 14 60 15' })),
    };
    const card = (key, title, text) => h('li', { class: 'f0-card is-' + key },
      h('span', { class: 'f0-icon', 'aria-hidden': 'true' }, icons[key]),
      h('h3', { class: 'f0-title' }, title),
      h('p', null, PL.rich(text)));
    const list = h('ul', { class: 'f0-grid' },
      card('speed', 'Velocità', 'Quanto tempo passa tra il cambio di un ingresso e la risposta dell\'uscita: il [[Ritardo di propagazione|ritardo di propagazione]]. Nelle famiglie di questo capitolo va da circa un nanosecondo a più di cento.'),
      card('power', 'Consumo', 'Quanta energia serve per far funzionare la porta. Alcune famiglie consumano anche quando sono ferme, altre solo quando cambiano.'),
      card('fan', 'Fan-out', 'Quanti ingressi può comandare una sola uscita senza che il segnale si indebolisca: è il [[Fan-out|fan-out]].'),
      card('noise', 'Margine di rumore', 'Quanto disturbo può raccogliere un filo prima che uno 0 venga letto come 1, o viceversa: è il [[Margine di rumore|margine di rumore]].'));
    if (PL.reduced()) list.classList.add('is-in');
    else PL.onVisible(list, () => list.classList.add('is-in'), { threshold: 0.3 });
    return list;
  }

  /* ---------- laboratorio: una porta RTL e il fan-out ---------- */

  function labRtl() {
    // modello semplificato di una NOR RTL dei primi anni Sessanta
    const VCC = 3.6;
    const RC = 640;
    const RB = 450;
    const VBE = 0.75;
    const VSAT = 0.2;
    const ICS = (VCC - VSAT) / RC; // corrente in un transistor acceso (circa 5,3 mA)
    const IMIN = ICS / 10; // corrente di base che serve a una porta collegata per accendersi del tutto
    const VMIN = VBE + IMIN * RB; // il livello alto più basso che si può ancora chiamare 1 (circa 0,99 V)
    const MAXN = 12;
    const solve = (a, b, n) => {
      if (a || b) return { high: false, v: VSAT, i: ICS, iin: 0 };
      const i = (VCC - VBE) / (RC + RB / n);
      return { high: true, v: VCC - i * RC, i, iin: i / n };
    };
    let fan = 1;
    while (fan < MAXN && solve(0, 0, fan + 1).iin >= IMIN) fan += 1;
    const st = { a: 0, b: 0, n: 3, shown: 3 };

    const art = PL.svg('0 0 540 320', { class: 'f1-art', role: 'img', 'aria-label': 'Schema di una porta NOR RTL: due transistor in parallelo con una resistenza comune verso l\'alimentazione da 3,6 V; ogni ingresso arriva alla base del suo transistor attraverso una resistenza. L\'uscita è collegata agli ingressi di altre porte, da 1 a 12.' });
    const flows = s('g', { class: 'f1-flows' });
    const fl = flowIn(flows);

    const rc = draw.resistor(200, 36, 200, 104);
    const wTop = draw.wire([[200, 104], [200, 118]], { level: 1 });
    const wBar = draw.wire([[136, 118], [264, 118]], { level: 1 });
    const wC1 = draw.wire([[136, 118], [136, 145]], { level: 1 });
    const wC2 = draw.wire([[264, 118], [264, 145]], { level: 1 });
    const wOut = draw.wire([[264, 118], [430, 118]], { level: 1 });
    const bus = s('path', { class: 'pl-wire is-1', d: 'M430 30V118' });
    const wE1 = draw.wire([[136, 205], [136, 250], [200, 250]]);
    const wE2 = draw.wire([[264, 205], [264, 250], [200, 250]]);
    const q1 = npn(130, 175);
    const q2 = npn(270, 175, true);
    const outWires = [wTop, wBar, wC1, wC2, wOut, bus];

    const term = (x, name) => {
      const dot = s('circle', { class: 'f1-term', cx: x, cy: 175, r: 6 });
      const val = s('text', { class: 'f1-bit', x, y: 206, 'text-anchor': 'middle' }, '0');
      const g = s('g', { class: 'f1-in' },
        s('rect', { class: 'f1-hit', x: x - 20, y: 142, width: 40, height: 72, rx: 8 }),
        s('text', { class: 'f1-name', x, y: 160, 'text-anchor': 'middle' }, name), dot, val);
      return { g, dot, val };
    };
    const inA = term(40, 'A');
    const inB = term(360, 'B');

    // gli ingressi delle porte collegate: piccole NOR in colonna, attaccate al filo d'uscita
    const loads = [];
    for (let k = 0; k < MAXN; k++) {
      const y = 30 + k * 23.5;
      const gate = draw.gate('NOR', { x: 452, y: y - (28 * 0.7) / 3, w: 28 });
      const stub = draw.wire([[430, y], [n1(gate.inputs[0].x), y]], { level: 1 });
      const g = s('g', { class: 'f1-load' },
        stub,
        s('line', { class: 'f1-stub', x1: n1(gate.inputs[1].x - 9), y1: n1(gate.inputs[1].y), x2: n1(gate.inputs[1].x), y2: n1(gate.inputs[1].y) }),
        s('line', { class: 'f1-stub', x1: gate.output.x, y1: gate.output.y, x2: gate.output.x + 9, y2: gate.output.y }),
        gate.g,
        k ? s('circle', { class: 'f1-dot', cx: 430, cy: y, r: 2.8 }) : null);
      loads.push({ g, gate, stub, y });
    }

    art.append(
      draw.supply(200, 36, 'VCC = 3,6 V'),
      rc, ...outWires, wE1, wE2, draw.ground(200, 250),
      draw.resistor(46, 175, 102, 175), draw.resistor(354, 175, 298, 175),
      q1.g, q2.g,
      ...loads.map((l) => l.g),
      draw.junction(200, 118), draw.junction(264, 118), draw.junction(430, 118),
      inA.g, inB.g,
      s('text', { class: 'f1-lbl', x: 212, y: 74 }, 'Rc 640 Ω'),
      s('text', { class: 'f1-lbl', x: 74, y: 198, 'text-anchor': 'middle' }, 'Rb 450 Ω'),
      s('text', { class: 'f1-lbl', x: 326, y: 198, 'text-anchor': 'middle' }, 'Rb 450 Ω'),
      s('text', { class: 'f1-cap', x: 350, y: 108, 'text-anchor': 'middle' }, 'uscita'),
      s('text', { class: 'f1-cap', x: 470, y: 13, 'text-anchor': 'middle' }, 'porte collegate'),
      flows);

    const fRc = fl(rc);
    const fTop = fl(wTop);
    const fHi = fl(route('M200 118H430'));
    const fUp = fl(route('M430 118V30'));
    const fDn = fl(route('M430 118V130'));
    const fStub = loads.map((l) => fl(route(`M430 ${l.y}H${n1(l.gate.inputs[0].x)}`)));
    const fT1 = fl(route('M200 118H136V205'));
    const fT2 = fl(route('M200 118H264V205'));
    const fE1 = fl(wE1);
    const fE2 = fl(wE2);
    const fB1 = fl(route('M40 175H120'));
    const fB2 = fl(route('M360 175H280'));

    // pannello: voltmetro con le zone e le correnti
    const pct = (v) => (clamp(v, 0, 2) / 2) * 100;
    const vEl = h('span', { class: 'f1-v pl-mono' });
    const stateEl = h('span', { class: 'f1-state' });
    const iEl = h('span', { class: 'pl-mono' });
    const pEl = h('span', { class: 'pl-mono' });
    const markerWrap = h('span', { class: 'f1-mwrap' }, h('span', { class: 'f1-marker' }));
    const panel = h('div', { class: 'pl-lab-panel f1-panel' },
      h('h4', null, 'Tensione d\'uscita'),
      h('p', { class: 'f1-big' }, vEl, stateEl),
      h('div', { class: 'f1-meter', 'aria-hidden': 'true' },
        h('div', { class: 'f1-track' },
          h('span', { class: 'f1-zone is-lo', style: { width: pct(VBE) + '%' } }, '0'),
          h('span', { class: 'f1-zone is-mid', style: { width: n1(pct(VMIN) - pct(VBE)) + '%' } }),
          h('span', { class: 'f1-zone is-hi' }, '1 valido'),
          markerWrap),
        h('div', { class: 'f1-ticks' }, ['0 V', '0,5', '1', '1,5', '2 V'].map((t) => h('span', null, t)))),
      h('dl', { class: 'f1-dl' },
        h('dt', null, 'corrente per ingresso'), h('dd', null, iEl),
        h('dt', null, 'consumo della porta'), h('dd', null, pEl)));
    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));

    function update(animate) {
      const r = solve(st.a, st.b, st.n);
      const weak = r.high && r.iin < IMIN;
      const lvl = r.high ? 1 : 0;
      outWires.forEach((w) => {
        draw.setWire(w, lvl, { animate: animate !== false && w !== bus });
        w.classList.toggle('f1-weak', weak);
      });
      q1.set(st.a);
      q2.set(st.b);
      [[inA, st.a], [inB, st.b]].forEach(([t, v]) => { t.dot.classList.toggle('is-1', !!v); t.val.textContent = String(v); });
      const bot = Math.max(118, loads[st.n - 1].y);
      bus.setAttribute('d', `M430 30V${bot}`);
      fDn.el.setAttribute('d', `M430 118V${bot}`);
      loads.forEach((l, k) => {
        const on = k < st.n;
        // le porte appena collegate si accendono una dopo l'altra
        l.g.style.transitionDelay = on && k >= st.shown ? (k - st.shown) * 45 + 'ms' : '0ms';
        l.g.classList.toggle('is-on', on);
        draw.setWire(l.stub, on ? lvl : 0, { animate: false });
        l.stub.classList.toggle('f1-weak', on && weak);
        fStub[k].set(on && r.high);
      });
      st.shown = st.n;
      fRc.set(true);
      fTop.set(true);
      fHi.set(r.high);
      fUp.set(r.high);
      fDn.set(r.high && bot > 118);
      fT1.set(!!st.a);
      fT2.set(!!st.b);
      fE1.set(!!st.a);
      fE2.set(!!st.b);
      fB1.set(!!st.a);
      fB2.set(!!st.b);

      vEl.textContent = volt(r.v);
      stateEl.textContent = !r.high ? '0' : weak ? '1 debole' : '1';
      stateEl.className = 'f1-state ' + (!r.high ? 'is-0' : weak ? 'is-weak' : 'is-1');
      markerWrap.style.transform = `translateX(${pct(r.v).toFixed(2)}%)`;
      markerWrap.className = 'f1-mwrap ' + (!r.high ? 'is-0' : weak ? 'is-weak' : 'is-1');
      iEl.textContent = r.high ? milliA(r.iin) + (weak ? ' (ne servono ' + milliA(IMIN) + ')' : '') : '—';
      pEl.textContent = milliW(r.i * VCC);

      if (!r.high) {
        const who = st.a && st.b ? 'Tutti e due gli ingressi sono a 1: i due transistor conducono' : st.a ? 'A = 1: il transistor di sinistra conduce' : 'B = 1: il transistor di destra conduce';
        say(who + ' e portano l\'uscita a circa 0,2 V, uno <strong>0</strong> netto, qualunque sia il numero di porte collegate. Intanto la corrente scende dalla resistenza da 640 Ω verso massa: la porta consuma circa ' + milliW(r.i * VCC) + '.');
      } else if (!weak) {
        const share = st.n === 1 ? 'La corrente va tutta all\'unica porta collegata: ' + milliA(r.iin) : 'La corrente si divide fra le ' + st.n + ' porte collegate: a ciascuna arrivano ' + milliA(r.iin);
        say('Nessun ingresso è a 1: i transistor sono spenti e la resistenza di [[Pull-up|pull-up]] alza l\'uscita. ' + share + ', abbastanza per accenderne il transistor. Uscita a ' + volt(r.v) + ': un <strong>1 valido</strong>.');
      } else {
        say('Con ' + st.n + ' porte collegate, a ciascuna arrivano solo ' + milliA(r.iin) + ', meno dei ' + milliA(IMIN) + ' che servono: il livello alto scende a ' + volt(r.v) + ' e diventa un <strong>1 debole</strong>, che le porte collegate potrebbero non riconoscere. Questa porta ne regge al massimo ' + fan + ': è il suo fan-out.');
      }
    }

    const tA = ui.toggle({ label: 'A', ariaLabel: 'Ingresso A', onChange: (v) => { st.a = v; update(); } });
    const tB = ui.toggle({ label: 'B', ariaLabel: 'Ingresso B', onChange: (v) => { st.b = v; update(); } });
    const sl = ui.slider({ label: 'Porte collegate all\'uscita', min: 1, max: MAXN, value: st.n, onInput: (v) => { st.n = v; update(); } });
    inA.g.addEventListener('click', () => tA.set(tA.value ? 0 : 1));
    inB.g.addEventListener('click', () => tB.set(tB.value ? 0 : 1));
    update(false);

    return ui.lab({
      title: 'Una porta RTL e il fan-out',
      intro: 'Una NOR come quelle dei primi chip: due transistor e tre resistenze. Accendi gli ingressi, poi collega all\'uscita sempre più porte e guarda che cosa succede al livello alto.',
      controls: [tA, tB, sl.el],
      stage: h('div', { class: 'pl-lab-grid f1-grid' }, art, panel),
      readout,
      caption: 'Modello semplificato, con valori ispirati alle porte RTL degli anni Sessanta: alimentazione 3,6 V, resistenza di pull-up da 640 Ω, resistenze di base da 450 Ω. Qui un ingresso riceve un 1 valido se gli arriva almeno un decimo della corrente che scorre in un transistor acceso.',
      class: 'f1-lab',
    });
  }

  /* ---------- laboratorio: dentro il 7400 ---------- */

  function lab7400() {
    const NAME = {
      1: '1A', 2: '1B', 3: '1Y', 4: '2A', 5: '2B', 6: '2Y', 7: 'GND',
      8: '3Y', 9: '3A', 10: '3B', 11: '4Y', 12: '4A', 13: '4B', 14: 'VCC',
    };
    const GATES = [
      { n: 1, a: 1, b: 2, y: 3, cx: 135, top: false },
      { n: 2, a: 4, b: 5, y: 6, cx: 237, top: false },
      { n: 3, a: 9, b: 10, y: 8, cx: 271, top: true },
      { n: 4, a: 12, b: 13, y: 11, cx: 169, top: true },
    ];
    const gateOf = (pin) => GATES.find((G) => G.a === pin || G.b === pin || G.y === pin);
    const st = { pins: {}, power: 1, open: false, hinted: false, tw: null };
    GATES.forEach((G) => { st.pins[G.a] = 0; st.pins[G.b] = 0; });
    const desc = (i) => {
      if (i === 14) return 'alimentazione, +5 V';
      if (i === 7) return 'massa, 0 V';
      const G = gateOf(i);
      return i === G.y ? 'uscita della porta ' + G.n : 'ingresso ' + (i === G.a ? 'A' : 'B') + ' della porta ' + G.n;
    };

    const art = PL.svg('0 0 440 372', { class: 'f2-art', role: 'img', 'aria-label': 'Il chip 7400 visto dall\'alto: un contenitore DIP con 14 piedini, numerati in senso antiorario a partire dalla tacca. Ai piedini d\'ingresso sono collegati degli interruttori, a quelli d\'uscita dei LED.' });
    const dip = draw.dip({ x: 91, y: 92, pins: 14, pitch: 34, h: 196 });
    const pinX = (i) => dip.pin(i).x;
    const numbers = Array.from(dip.g.querySelectorAll('.pl-t-pin'));
    const pinRects = Array.from(dip.g.querySelectorAll('.pl-dip-pin'));
    // i numeri si spostano di lato, così i fili interni non ci passano sopra
    numbers.forEach((t, i) => {
      t.setAttribute('x', pinX(i + 1) + 5);
      t.setAttribute('text-anchor', 'start');
      t.setAttribute('y', i < 7 ? 283 : 106);
    });
    pinRects.forEach((r, i) => {
      r.append(s('title', null, 'Piedino ' + (i + 1) + ': ' + desc(i + 1)));
      if (gateOf(i + 1) && gateOf(i + 1).y !== i + 1) r.classList.add('f2-pick');
    });

    // l'interno, in forma di schema: quattro NAND collegate ai piedini
    const inner = s('g', { class: 'f2-inside' });
    const parts = GATES.map((G, k) => {
      const cy = G.top ? 146 : 234;
      const gt = draw.gate('NAND', { x: G.cx - 24, y: cy - 16.8, w: 48 });
      gt.g.setAttribute('transform', `rotate(${G.top ? 90 : -90} ${G.cx} ${cy})`);
      const inA = G.top ? [G.cx + 5.6, 122] : [G.cx - 5.6, 258];
      const inB = G.top ? [G.cx - 5.6, 122] : [G.cx + 5.6, 258];
      const out = G.top ? [G.cx, 170] : [G.cx, 210];
      const edge = G.top ? 92 : 288;
      const jog = G.top ? 112 : 268;
      const via = G.top ? 182 : 198;
      const wA = draw.wire([[pinX(G.a), edge], [pinX(G.a), jog], [inA[0], jog], inA], { level: 0 });
      const wB = draw.wire([[pinX(G.b), edge], [pinX(G.b), jog], [inB[0], jog], inB], { level: 0 });
      const wY = draw.wire([out, [G.cx, via], [pinX(G.y), via], [pinX(G.y), edge]], { level: 0 });
      [wA, wB, wY].forEach((w) => w.setAttribute('pathLength', '1'));
      const g = s('g', { class: 'f2-gate', style: { '--k': k } }, wA, wB, wY, gt.g);
      inner.append(g);
      return { G, gt, wA, wB, wY, timers: [] };
    });

    const lid = s('g', { class: 'f2-lid' },
      s('rect', { class: 'f2-lid-body', x: 91, y: 92, width: 258, height: 196, rx: 6 }),
      s('path', { class: 'pl-dip-notch', d: 'M91 181A9 9 0 0 1 91 199' }),
      s('circle', { class: 'pl-dip-dot', cx: 105, cy: 274, r: 3 }),
      s('text', { class: 'pl-t-chip', x: 220, y: 188, 'text-anchor': 'middle' }, 'SN7400N'),
      s('text', { class: 'pl-t-chip-sub', x: 220, y: 207, 'text-anchor': 'middle' }, 'quattro porte NAND'));

    // fuori dal chip: interruttori sugli ingressi, LED sulle uscite, alimentazione e massa
    const outside = s('g', { class: 'f2-outside' });
    const knobs = {};
    const leds = {};
    let pwrWire = null;
    for (let i = 1; i <= 14; i++) {
      const p = dip.pin(i);
      const bottom = i <= 7;
      outside.append(s('text', { class: 'f2-name', x: p.x, y: bottom ? 354 : 30, 'text-anchor': 'middle' }, i === 14 ? '+5 V' : i === 7 ? 'massa' : NAME[i]));
      if (i === 7) { outside.append(draw.ground(p.x, p.y)); continue; }
      if (i === 14) {
        pwrWire = draw.wire([[p.x, p.y], [p.x, 60]], { level: 1 });
        outside.append(pwrWire, s('line', { class: 'f2-rail', x1: p.x - 12, y1: 60, x2: p.x + 12, y2: 60 }));
        continue;
      }
      const G = gateOf(i);
      if (G.y === i) {
        const ly = bottom ? 322 : 58;
        const lead = draw.wire([[p.x, p.y], [p.x, bottom ? ly - 8 : ly + 8]], { level: 0 });
        const led = draw.led(p.x, ly, { r: 8 });
        outside.append(lead, led.g);
        leds[i] = { lead, led };
      } else {
        const ky = bottom ? 310 : 48;
        const lead = draw.wire([[p.x, p.y], [p.x, bottom ? ky : ky + 22]], { level: 0 });
        const txt = s('text', { class: 'f2-knob-t', x: p.x, y: ky + 15.5, 'text-anchor': 'middle' }, '0');
        const g = s('g', { class: 'f2-knob' },
          lead, s('rect', { class: 'f2-knob-box', x: p.x - 11, y: ky, width: 22, height: 22, rx: 6 }), txt,
          s('title', null, 'Piedino ' + i + ': ' + desc(i)));
        outside.append(g);
        knobs[i] = { g, lead, txt };
      }
    }
    art.append(dip.g, inner, lid, ...numbers, outside);

    // banco di prova: gli stessi comandi come pulsanti veri, porta per porta
    const toggles = {};
    const outLeds = {};
    const rows = GATES.map((G) => {
      const mk = (pin) => {
        const t = ui.toggle({ label: NAME[pin], ariaLabel: 'Piedino ' + pin + ', ' + desc(pin), onChange: (v) => setPin(pin, v) });
        toggles[pin] = t;
        return t;
      };
      outLeds[G.n] = ui.led(true, 'Uscita ' + NAME[G.y] + ', piedino ' + G.y);
      return h('li', { class: 'f2-row' },
        h('span', { class: 'f2-row-t' }, 'Porta ' + G.n),
        mk(G.a), mk(G.b),
        h('span', { class: 'f2-arrow', 'aria-hidden': 'true' }, '→'),
        outLeds[G.n],
        h('span', { class: 'f2-row-y pl-mono' }, NAME[G.y]));
    });
    const panel = h('div', { class: 'pl-lab-panel f2-panel' },
      h('h4', null, 'Banco di prova'),
      h('ol', { class: 'f2-rows' }, rows),
      h('p', { class: 'f2-hint' }, 'Puoi anche toccare gli interruttori e i piedini del chip.'));
    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));

    function propagate(part, animate) {
      const G = part.G;
      const live = !!st.power;
      const a = live && st.pins[G.a] ? 1 : 0;
      const b = live && st.pins[G.b] ? 1 : 0;
      const y = live ? (a && b ? 0 : 1) : 0;
      part.timers.forEach((t) => clearTimeout(t));
      part.timers = [];
      const anim = animate && !PL.reduced();
      draw.setWire(knobs[G.a].lead, a, { animate: anim });
      draw.setWire(knobs[G.b].lead, b, { animate: anim });
      draw.setWire(part.wA, a, { animate: anim });
      draw.setWire(part.wB, b, { animate: anim });
      const lightOut = () => {
        part.gt.set(y);
        draw.setWire(part.wY, y, { animate: anim });
        draw.setWire(leds[G.y].lead, y, { animate: anim });
      };
      const lightLed = () => { leds[G.y].led.set(y); outLeds[G.n].set(y); };
      if (anim) {
        part.timers.push(PL.timeout(lightOut, 260));
        part.timers.push(PL.timeout(lightLed, 560));
      } else { lightOut(); lightLed(); }
      return { a: st.pins[G.a], b: st.pins[G.b], y };
    }

    function setPin(pin, v) {
      st.pins[pin] = v ? 1 : 0;
      knobs[pin].g.classList.toggle('is-1', !!v);
      knobs[pin].txt.textContent = String(st.pins[pin]);
      const part = parts.find((p) => p.G.a === pin || p.G.b === pin);
      const r = propagate(part, true);
      const G = part.G;
      if (!st.power) {
        say('Piedino ' + pin + ' a ' + st.pins[pin] + ', ma il chip non risponde: senza alimentazione nessuna porta può funzionare. Riaccendi i 5 V.');
        return;
      }
      let msg = 'Porta ' + G.n + ': ' + NAME[G.a] + ' = ' + r.a + ' e ' + NAME[G.b] + ' = ' + r.b + ', quindi ' + NAME[G.y] + ' (piedino ' + G.y + ') = <strong>' + r.y + '</strong>. ';
      msg += r.a && r.b ? 'Tutti e due gli ingressi sono a 1: la NAND dà 0 e il LED si spegne.' : 'Basta un ingresso a 0 perché la NAND dia 1: il LED resta acceso.';
      if (!st.open && !st.hinted) { msg += ' Apri il contenitore per vedere dove passa il segnale.'; st.hinted = true; }
      say(msg);
    }

    function refresh(animate) {
      parts.forEach((p) => propagate(p, animate));
      draw.setWire(pwrWire, st.power, { animate: false });
      art.classList.toggle('is-off', !st.power);
    }

    function setOpen(open) {
      st.open = open;
      openBtn.textContent = open ? 'Chiudi il contenitore' : 'Apri il contenitore';
      openBtn.setAttribute('aria-pressed', open ? 'true' : 'false');
      art.classList.toggle('is-open', open);
      if (st.tw) st.tw.cancel();
      const from = open ? 0 : 1;
      st.tw = PL.tween({
        from, to: open ? 1 : 0, duration: 650, ease: PL.motion.ease.inOut,
        onUpdate: (p) => {
          lid.setAttribute('transform', `translate(0 ${n1(-p * 28)})`);
          lid.style.opacity = String(1 - p);
        },
      });
      say(open
        ? 'Ecco l\'interno, in forma di schema: quattro porte NAND indipendenti, ognuna con due piedini d\'ingresso e uno d\'uscita, più i piedini 14 e 7 che portano l\'alimentazione a tutte. Nel chip vero c\'è una minuscola piastrina di silicio, collegata ai piedini da fili d\'oro più sottili di un capello.'
        : 'Contenitore chiuso: da fuori il 7400 è una scatola nera con 14 piedini. Per usarlo basta conoscere la piedinatura, cioè che cosa fa ogni piedino.');
    }

    const openBtn = ui.btn({ label: 'Apri il contenitore', kind: 'lab', onClick: () => setOpen(!st.open) });
    openBtn.classList.add('is-primary');
    openBtn.setAttribute('aria-pressed', 'false');
    const pw = ui.toggle({
      label: 'Alimentazione 5 V', value: 1, ariaLabel: 'Alimentazione a 5 volt, piedini 14 e 7',
      onChange: (v) => {
        st.power = v;
        refresh(true);
        say(v
          ? 'Alimentazione accesa: le quattro porte tornano a lavorare, e quelle con almeno un ingresso a 0 riaccendono il loro LED.'
          : 'Senza alimentazione il chip è spento. I piedini 14 (+5 V) e 7 (massa) portano l\'energia a tutte e quattro le porte: senza, le uscite restano a 0 qualunque cosa facciano gli ingressi.');
      },
    });
    Object.entries(knobs).forEach(([pin, k]) => k.g.addEventListener('click', () => toggles[pin].set(st.pins[pin] ? 0 : 1)));
    pinRects.forEach((r, i) => {
      if (r.classList.contains('f2-pick')) r.addEventListener('click', () => toggles[i + 1].set(st.pins[i + 1] ? 0 : 1));
    });
    refresh(false);
    say('Il 7400 contiene quattro porte NAND. Con gli ingressi a 0 tutte e quattro danno 1, e i LED sono accesi. Prova a mettere a 1 tutti e due gli ingressi di una porta.');

    return ui.lab({
      title: 'Dentro il 7400',
      intro: 'Il chip più famoso della serie 7400: quattro porte NAND in un contenitore con 14 piedini. Prova gli ingressi, poi apri il contenitore.',
      controls: [openBtn, pw],
      stage: h('div', { class: 'pl-lab-grid f2-grid' }, art, panel),
      readout,
      caption: 'Piedinatura reale del 7400, visto dall\'alto con la tacca a sinistra. L\'interno è disegnato come uno schema: nel chip vero ogni porta è fatta di quattro transistor, quattro resistenze e qualche diodo.',
      class: 'f2-lab',
    });
  }

  /* ---------- laboratorio: CMOS, due squadre di interruttori ---------- */

  function labCmos() {
    // per ogni porta: transistor (con i due nodi che collegano), fili con il loro nodo, squadra e transistor necessari
    const NETS = {
      NOT: {
        node: 180,
        tr: [
          { id: 'P1', kind: 'p', in: 'A', x: 190, y: 110, a: 'vdd', b: 'out', need: ['P1'] },
          { id: 'N1', kind: 'n', in: 'A', x: 190, y: 250, a: 'out', b: 'gnd', need: ['N1'] },
        ],
        wires: [
          { net: 'vdd', team: 'up', need: ['P1'], pts: [[190, 40], [190, 86]] },
          { net: 'out', team: 'up', need: ['P1'], pts: [[190, 134], [190, 180]] },
          { net: 'out', team: 'down', need: ['N1'], pts: [[190, 180], [190, 226]] },
          { net: 'gnd', team: 'down', need: ['N1'], pts: [[190, 274], [190, 320]] },
        ],
        dots: [[190, 180], [300, 180]],
      },
      NAND: {
        node: 160,
        tr: [
          { id: 'P1', kind: 'p', in: 'A', x: 130, y: 100, a: 'vdd', b: 'out', need: ['P1'] },
          { id: 'P2', kind: 'p', in: 'B', x: 250, y: 100, a: 'vdd', b: 'out', need: ['P2'] },
          { id: 'N1', kind: 'n', in: 'A', x: 190, y: 216, a: 'out', b: 'm', need: ['N1', 'N2'] },
          { id: 'N2', kind: 'n', in: 'B', x: 190, y: 276, a: 'm', b: 'gnd', need: ['N1', 'N2'] },
        ],
        wires: [
          { net: 'vdd', team: 'up', need: ['P1'], pts: [[130, 40], [130, 76]] },
          { net: 'vdd', team: 'up', need: ['P2'], pts: [[250, 40], [250, 76]] },
          { net: 'out', team: 'up', need: ['P1'], pts: [[130, 124], [130, 160], [190, 160]] },
          { net: 'out', team: 'up', need: ['P2'], pts: [[250, 124], [250, 160]] },
          { net: 'out', team: 'down', need: ['N1', 'N2'], pts: [[190, 160], [190, 192]] },
          { net: 'm', team: 'down', need: ['N1', 'N2'], pts: [[190, 240], [190, 252]] },
          { net: 'gnd', team: 'down', need: ['N1', 'N2'], pts: [[190, 300], [190, 320]] },
        ],
        dots: [[190, 160], [250, 160], [300, 160]],
      },
      NOR: {
        node: 190,
        tr: [
          { id: 'P1', kind: 'p', in: 'A', x: 190, y: 92, a: 'vdd', b: 'm', need: ['P1', 'P2'] },
          { id: 'P2', kind: 'p', in: 'B', x: 190, y: 140, a: 'm', b: 'out', need: ['P1', 'P2'] },
          { id: 'N1', kind: 'n', in: 'A', x: 130, y: 250, a: 'out', b: 'gnd', need: ['N1'] },
          { id: 'N2', kind: 'n', in: 'B', x: 250, y: 250, a: 'out', b: 'gnd', need: ['N2'] },
        ],
        wires: [
          { net: 'vdd', team: 'up', need: ['P1', 'P2'], pts: [[190, 40], [190, 68]] },
          { net: 'out', team: 'up', need: ['P1', 'P2'], pts: [[190, 164], [190, 190]] },
          { net: 'out', team: 'down', need: ['N1'], pts: [[190, 190], [130, 190], [130, 226]] },
          { net: 'out', team: 'down', need: ['N2'], pts: [[250, 190], [250, 226]] },
          { net: 'gnd', team: 'down', need: ['N1'], pts: [[130, 274], [130, 320]] },
          { net: 'gnd', team: 'down', need: ['N2'], pts: [[250, 274], [250, 320]] },
        ],
        dots: [[190, 190], [250, 190], [300, 190]],
      },
    };
    const st = { type: 'NAND', a: 0, b: 0, out: null, flowTimer: 0 };

    // a quale tensione è ogni nodo: si parte da VDD e da massa e si attraversano i transistor accesi
    function levels(N, on) {
      const lv = { vdd: 1, gnd: 0 };
      let changed = true;
      while (changed) {
        changed = false;
        N.tr.forEach((t) => {
          if (!on[t.id]) return;
          if (lv[t.a] != null && lv[t.b] == null) { lv[t.b] = lv[t.a]; changed = true; }
          else if (lv[t.b] != null && lv[t.a] == null) { lv[t.a] = lv[t.b]; changed = true; }
        });
      }
      return lv;
    }

    function build(type) {
      const N = NETS[type];
      const node = N.node;
      const art = PL.svg('0 0 360 360', { class: 'f3-art', role: 'img', 'aria-label': 'Schema a transistor di una porta ' + type + ' CMOS: in alto i pMOS collegati all\'alimentazione VDD, in basso gli nMOS collegati a massa, al centro l\'uscita Y che va al carico.' });
      const flows = s('g', { class: 'f3-flows' });
      const boxes = {};
      ['p', 'n'].forEach((kind) => {
        const ts = N.tr.filter((t) => t.kind === kind);
        const x0 = Math.min(...ts.map((t) => t.x)) - 52;
        const x1 = Math.max(...ts.map((t) => t.x)) + 16;
        const y0 = Math.min(...ts.map((t) => t.y)) - 34;
        const y1 = Math.max(...ts.map((t) => t.y)) + 34;
        const cy = (y0 + y1) / 2;
        const team = kind === 'p' ? 'up' : 'down';
        boxes[team] = s('g', { class: 'f3-team is-' + team },
          s('rect', { class: 'f3-box', x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: 12 }),
          s('text', { class: 'f3-team-t', x: x0 - 7, y: cy - 2, 'text-anchor': 'end' }, kind === 'p' ? 'pull-up' : 'pull-down'),
          s('text', { class: 'f3-team-s', x: x0 - 7, y: cy + 13, 'text-anchor': 'end' }, kind === 'p' ? 'pMOS' : 'nMOS'));
        art.append(boxes[team]);
      });
      art.append(
        draw.wire([[96, 40], [284, 40]], { level: 1 }),
        draw.wire([[96, 320], [312, 320]], { level: 0 }),
        s('text', { class: 'f3-rail-t', x: 90, y: 44, 'text-anchor': 'end' }, 'VDD'),
        s('text', { class: 'f3-rail-t', x: 90, y: 324, 'text-anchor': 'end' }, 'massa'));
      const wires = N.wires.map((wd) => {
        const el = draw.wire(wd.pts, { level: 0 });
        art.append(el);
        return { wd, el, flow: null };
      });
      const outLine = draw.wire([[190, node], [330, node]], { level: 0 });
      const capLead = draw.wire([[300, node], [300, node + 44]], { level: 0 });
      art.append(outLine, capLead, draw.wire([[300, node + 52], [300, 320]], { level: 0 }),
        s('line', { class: 'f3-plate', x1: 287, y1: node + 44, x2: 313, y2: node + 44 }),
        s('line', { class: 'f3-plate', x1: 287, y1: node + 52, x2: 313, y2: node + 52 }),
        s('text', { class: 'f3-small', x: 318, y: node + 74 }, 'carico'));
      const mos = {};
      const badges = N.tr.map((t) => {
        const m = draw.mosfet(t.x, t.y, { kind: t.kind, size: 24 });
        const bx = t.x - 39;
        const badge = s('g', { class: 'f3-badge' },
          s('circle', { cx: bx, cy: t.y, r: 9.5 }),
          s('text', { x: bx, y: t.y + 4.5, 'text-anchor': 'middle' }, t.in));
        art.append(m.g, badge);
        mos[t.id] = m;
        return { t, el: badge };
      });
      N.dots.forEach(([x, y]) => art.append(draw.junction(x, y)));
      const term = s('circle', { class: 'f3-term', cx: 330, cy: node, r: 6 });
      const yVal = s('text', { class: 'f3-yval', x: 330, y: node + 27, 'text-anchor': 'middle' }, '0');
      art.append(term, s('text', { class: 'f3-y', x: 330, y: node - 13, 'text-anchor': 'middle' }, 'Y'), yVal, flows);
      const fl = flowIn(flows);
      wires.forEach((w) => { w.flow = fl(w.el); });
      const through = N.tr.map((t) => ({ t, f: fl(route(`M${t.x} ${t.y - 24}V${t.y + 24}`)) }));
      const outFlow = fl(route(`M190 ${node}H300V${node + 44}`));
      return { art, N, mos, wires, badges, through, outFlow, outLine, capLead, term, yVal, boxes };
    }

    // oscilloscopio della corrente presa dall'alimentazione
    const SW = 280;
    const BASE = 84;
    const COUNT = 140;
    const vals = new Array(COUNT).fill(0);
    let queue = [];
    let acc = 0;
    const SPIKE_UP = [0.18, 0.9, 1, 0.78, 0.56, 0.4, 0.28, 0.2, 0.13, 0.08, 0.05, 0.03, 0.015];
    const SPIKE_DOWN = [0.06, 0.16, 0.12, 0.06, 0.03, 0.01];
    const trace = s('polyline', { class: 'f3-trace', points: '' });
    const scope = PL.svg(`0 0 ${SW} 100`, { class: 'f3-scope', role: 'img', 'aria-label': 'Grafico della corrente presa dall\'alimentazione nel tempo: zero a riposo, un picco a ogni cambio dell\'uscita' });
    for (let i = 1; i < 7; i++) scope.append(s('line', { class: 'f3-sgrid', x1: i * 40, y1: 6, x2: i * 40, y2: 94 }));
    scope.append(
      s('line', { class: 'f3-sgrid', x1: 0, y1: 50, x2: SW, y2: 50 }),
      s('line', { class: 'f3-sbase', x1: 0, y1: BASE, x2: SW, y2: BASE }),
      trace,
      s('text', { class: 'f3-stext', x: SW - 6, y: BASE - 6, 'text-anchor': 'end' }, 'a riposo: 0'));
    const paintTrace = () => {
      trace.setAttribute('points', vals.map((v, i) => n1((i / (COUNT - 1)) * SW) + ',' + n1(BASE - v * 70)).join(' '));
    };
    paintTrace();
    const spike = (up) => {
      const shape = up ? SPIKE_UP : SPIKE_DOWN;
      if (PL.reduced()) {
        vals.fill(0);
        shape.forEach((v, i) => { vals[Math.round(COUNT * 0.45) + i] = v; });
        paintTrace();
      } else queue = queue.concat(shape);
    };
    if (!PL.reduced()) {
      PL.loop((dt) => {
        if (!queue.length && vals.every((v) => v < 0.002)) return; // linea piatta: niente da ridisegnare
        acc += dt * 60;
        while (acc >= 1) {
          acc -= 1;
          vals.shift();
          vals.push(queue.length ? queue.shift() : 0);
        }
        paintTrace();
      }, { el: scope });
    }

    const holder = h('div', { class: 'f3-holder' });
    const ttBox = h('div', { class: 'f3-tt' });
    let B = null;
    let tt = null;
    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));

    function setLevel(el, v, animate) {
      el.classList.toggle('f3-float', v == null);
      draw.setWire(el, v ? 1 : 0, { animate });
    }

    function explain(r, a, b) {
      if (st.type === 'NOT') return a ? 'l\'nMOS conduce e collega l\'uscita a massa; il pMOS è aperto.' : 'il pMOS conduce e collega l\'uscita a VDD; l\'nMOS è aperto.';
      if (st.type === 'NAND') {
        if (!a && !b) return 'sopra conducono tutti e due i pMOS, in parallelo; sotto, i due nMOS in serie sono aperti.';
        if (a && b) return 'sotto conducono tutti e due gli nMOS in serie e collegano l\'uscita a massa; sopra, i due pMOS sono aperti.';
        return 'sopra conduce il pMOS di ' + (a ? 'B' : 'A') + ', e da solo basta a collegare l\'uscita a VDD; sotto, gli nMOS sono in serie e uno dei due è aperto: la strada verso massa è interrotta.';
      }
      if (!a && !b) return 'sopra conducono tutti e due i pMOS in serie e collegano l\'uscita a VDD; sotto, i due nMOS sono aperti.';
      if (a && b) return 'sotto conducono tutti e due gli nMOS, in parallelo; sopra, i due pMOS in serie sono aperti.';
      return 'sotto conduce l\'nMOS di ' + (a ? 'A' : 'B') + ', e da solo basta a collegare l\'uscita a massa; sopra, i pMOS sono in serie e uno dei due è aperto.';
    }

    function flowsOff() {
      if (!B) return;
      B.wires.forEach((w) => w.flow.set(false));
      B.through.forEach((x) => x.f.set(false));
      B.outFlow.set(false);
    }

    function paint(animate) {
      const a = st.a;
      const b = st.type === 'NOT' ? 0 : st.b;
      const r = Logic.cmos(st.type, st.type === 'NOT' ? [a] : [a, b]);
      const on = {};
      r.transistors.forEach((t) => { on[t.id] = t.on; B.mos[t.id].set(t.on); });
      const lv = levels(B.N, on);
      const anim = animate !== false;
      B.wires.forEach((w) => setLevel(w.el, lv[w.wd.net], anim));
      setLevel(B.outLine, r.out, anim);
      setLevel(B.capLead, r.out, anim);
      B.badges.forEach((bd) => bd.el.classList.toggle('is-1', (bd.t.in === 'A' ? a : b) === 1));
      B.term.classList.toggle('is-1', r.out === 1);
      B.yVal.textContent = String(r.out);
      B.yVal.classList.toggle('is-1', r.out === 1);
      B.boxes.up.classList.toggle('is-on', r.up);
      B.boxes.down.classList.toggle('is-on', r.down);
      tt.highlight(st.type === 'NOT' ? a : a * 2 + b);
      const changed = st.out != null && st.out !== r.out && anim;
      clearTimeout(st.flowTimer);
      flowsOff();
      if (changed) {
        // nel cambio la corrente corre: da VDD verso il carico, oppure dal carico verso massa
        const team = r.out ? 'up' : 'down';
        const live = (need) => need.every((id) => on[id]);
        B.wires.forEach((w) => w.flow.set(w.wd.team === team && live(w.wd.need)));
        B.through.forEach((x) => x.f.set((x.t.kind === 'p' ? 'up' : 'down') === team && live(x.t.need)));
        B.outFlow.reverse(!r.out).set(true);
        spike(r.out === 1);
        st.flowTimer = PL.timeout(flowsOff, PL.reduced() ? 1800 : 950);
      }
      st.out = r.out;
      const ins = st.type === 'NOT' ? 'A = ' + a : 'A = ' + a + ', B = ' + b;
      const tail = changed
        ? (r.out
          ? ' Nel cambio la corrente arriva da VDD e carica il carico: è il picco grande sullo schermo. Appena il carico è pieno, la corrente torna a zero.'
          : ' Nel cambio il carico si scarica verso massa: dall\'alimentazione passa solo un piccolo guizzo, nell\'istante in cui le due squadre si danno il cambio.')
        : ' Le due squadre non conducono mai insieme: a riposo dall\'alimentazione non passa corrente.';
      say(ins + ': ' + explain(r, a, b) + ' Uscita <strong>Y = ' + r.out + '</strong>.' + tail);
    }

    function setType(type) {
      st.type = type;
      B = build(type);
      holder.replaceChildren(B.art);
      if (!PL.reduced()) { B.art.classList.add('is-swap'); }
      tt = ui.truthTable({
        inputs: type === 'NOT' ? ['A'] : ['A', 'B'], outputs: ['Y'],
        rows: Logic.truthTable(type).map((r) => r.inputs.concat(r.out)),
        caption: 'Tabella della ' + type,
        onPick: (i, row) => {
          tA.set(row[0], true);
          st.a = row[0];
          if (type !== 'NOT') { tB.set(row[1], true); st.b = row[1]; }
          paint();
        },
      });
      ttBox.replaceChildren(tt.el);
      tB.disabled = type === 'NOT';
      tB.classList.toggle('is-disabled', type === 'NOT');
      st.out = null;
      paint(false);
    }

    const tA = ui.toggle({ label: 'A', ariaLabel: 'Ingresso A', onChange: (v) => { st.a = v; paint(); } });
    const tB = ui.toggle({ label: 'B', ariaLabel: 'Ingresso B', onChange: (v) => { st.b = v; paint(); } });
    const seg = ui.segmented({
      label: 'Porta',
      options: [{ value: 'NOT', label: 'NOT' }, { value: 'NAND', label: 'NAND' }, { value: 'NOR', label: 'NOR' }],
      value: st.type,
      onChange: (v) => setType(v),
    });
    const panel = h('div', { class: 'pl-lab-panel f3-panel' },
      ttBox,
      h('h4', { class: 'f3-scope-t' }, 'Corrente dall\'alimentazione'),
      scope,
      h('p', { class: 'f3-legend' }, 'Picco grande: l\'uscita sale e carica il carico. Picco piccolo: l\'uscita scende.'));
    setType(st.type);

    return ui.lab({
      title: 'CMOS: due squadre di interruttori',
      intro: 'Una porta CMOS vista transistor per transistor. Scegli la porta e cambia gli ingressi: guarda quale squadra conduce, e quando passa corrente.',
      controls: [seg.el, tA, tB],
      stage: h('div', { class: 'pl-lab-grid f3-grid' }, holder, panel),
      readout,
      caption: 'Alimentazione VDD, per esempio 5 V. Il condensatore a destra rappresenta il carico: i fili e gli ingressi delle porte collegate, che a ogni cambio dell\'uscita vanno caricati o scaricati. Tocca una riga della tabella per provarla.',
      class: 'f3-lab',
    });
  }

  /* ---------- figura: la corrente che cambia strada (ECL) ---------- */

  function figEcl() {
    const st = { a: 1, auto: !PL.reduced() };
    const art = PL.svg('0 0 600 300', { class: 'f6-art', role: 'img', 'aria-label': 'Porta ECL semplificata: due transistor con gli emettitori collegati a una sola sorgente di corrente verso −5,2 V. La corrente passa nel transistor di sinistra se l\'ingresso A è più alto del riferimento di −1,29 V, altrimenti in quello di destra.' });
    const flows = s('g', { class: 'f6-flows' });
    const fl = flowIn(flows);
    const rc1 = draw.resistor(220, 40, 220, 100);
    const rc2 = draw.resistor(380, 40, 380, 100);
    const c1 = draw.wire([[220, 100], [220, 130]]);
    const c2 = draw.wire([[380, 100], [380, 130]]);
    const em = draw.wire([[220, 190], [220, 214], [380, 214], [380, 190]]);
    const re = draw.resistor(300, 214, 300, 262);
    const inA = draw.wire([[140, 160], [186, 160]]);
    const oNor = draw.wire([[220, 115], [150, 115]]);
    const oOr = draw.wire([[380, 115], [450, 115]]);
    const q1 = npn(214, 160);
    const q2 = npn(386, 160, true);
    const aVal = s('text', { class: 'f6-v', x: 140, y: 188, 'text-anchor': 'middle' }, '');
    const norVal = s('tspan', { class: 'f6-val' }, '');
    const orVal = s('tspan', { class: 'f6-val' }, '');
    art.append(
      draw.wire([[150, 40], [450, 40]]),
      rc1, rc2, c1, c2, em, re, draw.wire([[300, 262], [300, 272]]),
      inA, draw.wire([[414, 160], [460, 160]]), oNor, oOr,
      q1.g, q2.g,
      draw.junction(220, 115), draw.junction(380, 115), draw.junction(300, 214),
      s('circle', { class: 'f6-term', cx: 140, cy: 160, r: 5 }),
      s('circle', { class: 'f6-term', cx: 460, cy: 160, r: 5 }),
      s('text', { class: 'f6-lbl', x: 458, y: 44 }, '0 V (massa)'),
      s('text', { class: 'f6-name', x: 140, y: 146, 'text-anchor': 'middle' }, 'A'),
      aVal,
      s('text', { class: 'f6-lbl', x: 460, y: 146, 'text-anchor': 'middle' }, 'riferimento'),
      s('text', { class: 'f6-v', x: 460, y: 188, 'text-anchor': 'middle' }, '−1,29 V'),
      s('text', { class: 'f6-out', x: 142, y: 120, 'text-anchor': 'end' }, 'NOR ', norVal),
      s('text', { class: 'f6-out', x: 458, y: 120 }, 'OR ', orVal),
      s('text', { class: 'f6-lbl', x: 312, y: 242 }, 'corrente costante'),
      s('text', { class: 'f6-v', x: 300, y: 292, 'text-anchor': 'middle' }, '−5,2 V'),
      flows);
    const left = [fl(rc1), fl(c1), fl(route('M220 130V190')), fl(route('M220 190V214H300'))];
    const right = [fl(rc2), fl(c2), fl(route('M380 130V190')), fl(route('M380 190V214H300'))];
    [fl(re), fl(route('M300 262V272'))].forEach((f) => f.set(true));
    const status = h('p', { class: 'f6-status', 'aria-live': 'polite' });
    function setA(a) {
      st.a = a;
      left.forEach((f) => f.set(a === 1));
      right.forEach((f) => f.set(a === 0));
      q1.set(a === 1);
      q2.set(a === 0);
      draw.setWire(inA, a);
      draw.setWire(oNor, 1 - a);
      draw.setWire(oOr, a);
      aVal.textContent = a ? '−0,90 V' : '−1,75 V';
      norVal.textContent = String(1 - a);
      orVal.textContent = String(a);
      status.textContent = a
        ? 'A = 1 (−0,90 V, sopra il riferimento): la corrente passa a sinistra, l\'uscita NOR scende a 0 e la OR sale a 1.'
        : 'A = 0 (−1,75 V, sotto il riferimento): la corrente passa a destra, l\'uscita OR scende a 0 e la NOR sale a 1.';
    }
    [inA, oNor, oOr].forEach((w) => draw.setWire(w, 0, { animate: false }));
    setA(1);
    const btn = ui.btn({ label: 'Cambia A', kind: 'lab', onClick: () => { st.auto = false; setA(1 - st.a); } });
    if (st.auto) PL.onVisible(art, () => PL.interval(() => { if (st.auto) setA(1 - st.a); }, 2400), { threshold: 0.3 });
    return ui.figure({
      art: [art, h('div', { class: 'f6-ctrl' }, btn, status)],
      dark: true,
      class: 'f6-fig',
      caption: 'Una porta ECL semplificata. La corrente che scende verso l\'alimentazione negativa resta sempre la stessa: l\'ingresso A decide soltanto se passa a sinistra o a destra. Se A è più alto del riferimento, la corrente passa nel transistor di A e l\'uscita NOR scende; altrimenti passa a destra e scende l\'uscita OR. Nei chip veri le due uscite passano da altri due transistor, che le portano ai livelli giusti.',
    });
  }

  /* ---------- laboratorio: velocità contro consumo ---------- */

  function labChart() {
    const X = (t) => n1(80 + (Math.log10(t) + 0.30103) * 160);
    const Y = (p) => n1(292 - (Math.log10(p) + 1) * 84);
    const FLOOR = 314;
    const FAM = { ttl: 'TTL', ecl: 'ECL', cmos: 'CMOS' };
    const DATA = [
      { id: '7400', name: '7400', fam: 'ttl', dec: 60, year: '1966', t: 10, p: 10, side: 'r', note: 'La TTL originale, con i suoi numeri tondi: 10 nanosecondi e 10 milliwatt per porta.' },
      { id: 'mecl3', name: 'MECL III', fam: 'ecl', dec: 60, year: '1968', t: 1, p: 60, side: 'r', note: 'La ECL della Motorola: circa un nanosecondo, al prezzo di 60 milliwatt per porta.' },
      { id: 'cd4000', name: 'CD4000', fam: 'cmos', dec: 60, year: '1968', t: 120, p: 1, side: 't', note: 'La prima famiglia CMOS, della RCA: lenta, ma quando è ferma non consuma quasi niente.' },
      { id: '74s', name: '74S', fam: 'ttl', dec: 70, year: '1971', t: 3, p: 19, side: 'r', note: 'La TTL Schottky: più di tre volte più veloce della 7400, consumando quasi il doppio.' },
      { id: 'ecl10k', name: 'MECL 10K', fam: 'ecl', dec: 70, year: '1971', t: 2, p: 25, side: 'l', note: 'La ECL di molti calcolatori veloci degli anni Settanta.' },
      { id: '74ls', name: '74LS', fam: 'ttl', dec: 70, year: 'metà degli anni Settanta', t: 9.5, p: 2, side: 'r', note: 'La TTL Schottky a bassa potenza: la velocità della 7400 con un quinto del consumo. Per molti anni fu la più usata.' },
      { id: '74hc', name: '74HC', fam: 'cmos', dec: 80, year: 'primi anni Ottanta', t: 7, p: 0.8, side: 'l', note: 'La CMOS veloce: la velocità della 74LS, i piedini della 7400 e un consumo a riposo quasi nullo.' },
    ];
    const st = { dec: PL.reduced() ? 80 : 60, idle: false, sel: null, timers: [] };

    const art = PL.svg('0 0 520 376', { class: 'f4-art', role: 'group', 'aria-label': 'Grafico in scala logaritmica: in orizzontale il ritardo di propagazione di una porta, in verticale la potenza che consuma. Ogni punto è una famiglia logica.' });
    const uid = PL.uid('f4-ideal');
    art.append(s('defs', null,
      s('radialGradient', { id: uid, cx: '0', cy: '1', r: '1' },
        s('stop', { offset: '0', 'stop-color': 'var(--trace-1)', 'stop-opacity': '0.22' }),
        s('stop', { offset: '1', 'stop-color': 'var(--trace-1)', 'stop-opacity': '0' }))));
    art.append(s('rect', { class: 'f4-frame', x: 80, y: 40, width: 416, height: 252 }));
    art.append(s('rect', { x: 80, y: 172, width: 170, height: 120, fill: `url(#${uid})` }));
    [0.5, 1, 2, 5, 10, 20, 50, 100, 200].forEach((t) => art.append(s('line', { class: 'f4-gl' + ([1, 10, 100].includes(t) ? ' is-major' : ''), x1: X(t), y1: 40, x2: X(t), y2: 292 })));
    [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100].forEach((p) => art.append(s('line', { class: 'f4-gl' + ([0.1, 1, 10, 100].includes(p) ? ' is-major' : ''), x1: 80, y1: Y(p), x2: 496, y2: Y(p) })));
    // linee di uguale energia per commutazione (ritardo × potenza)
    const ANG = n1((Math.atan(84 / 160) * 180) / Math.PI);
    [[100, 1, 200, 404], [10, 0.5, 100, 362]].forEach(([E, t0, t1, lx]) => {
      const t = Math.pow(10, (lx - 80) / 160 - 0.30103);
      const ly = Y(E / t) - 6;
      art.append(
        s('line', { class: 'f4-iso', x1: X(t0), y1: Y(E / t0), x2: X(t1), y2: Y(E / t1) }),
        s('text', { class: 'f4-iso-t', x: lx, y: n1(ly), 'text-anchor': 'middle', transform: `rotate(${ANG} ${lx} ${n1(ly)})` }, E + ' pJ'));
    });
    art.append(
      s('rect', { class: 'f4-floor', x: 80, y: 302, width: 416, height: 24, rx: 4 }),
      s('text', { class: 'f4-floor-t', x: 488, y: 318, 'text-anchor': 'end' }, 'porte CMOS ferme: consumo quasi zero'),
      s('text', { class: 'f4-ideal-t', x: 88, y: 284 }, 'veloce e parca'));
    [[100, '100 mW'], [10, '10 mW'], [1, '1 mW'], [0.1, '0,1 mW']].forEach(([p, t]) => art.append(s('text', { class: 'f4-tick', x: 74, y: Y(p) + 4, 'text-anchor': 'end' }, t)));
    art.append(s('text', { class: 'f4-tick', x: 74, y: FLOOR + 4, 'text-anchor': 'end' }, '≈ 0'));
    [[1, '1 ns'], [10, '10 ns'], [100, '100 ns']].forEach(([t, l]) => art.append(s('text', { class: 'f4-tick', x: X(t), y: 344, 'text-anchor': 'middle' }, l)));
    art.append(
      s('text', { class: 'f4-axis', x: 288, y: 368, 'text-anchor': 'middle' }, 'ritardo per porta  ·  più a sinistra = più veloce'),
      s('text', { class: 'f4-axis f4-ytitle', x: 16, y: 166, 'text-anchor': 'middle', transform: 'rotate(-90 16 166)' }, 'potenza per porta  ·  più in basso = più parca'));

    const pts = DATA.map((d) => {
      const shape = d.fam === 'ttl' ? s('circle', { class: 'f4-mark', r: 6.5 })
        : d.fam === 'ecl' ? s('rect', { class: 'f4-mark', x: -5.5, y: -5.5, width: 11, height: 11, transform: 'rotate(45)' })
          : s('path', { class: 'f4-mark', d: 'M0 -8L7.5 5H-7.5Z' });
      const lbl = d.side === 'r' ? { x: 12, y: 4.5, a: 'start' } : d.side === 'l' ? { x: -12, y: 4.5, a: 'end' } : { x: 0, y: -14, a: 'middle' };
      const g = s('g', { class: 'f4-pt is-' + d.fam, tabindex: '0', role: 'button', 'aria-label': d.name + ', famiglia ' + FAM[d.fam] + ': circa ' + PL.fmt(d.t) + ' nanosecondi e ' + PL.fmt(d.p) + ' milliwatt per porta' },
        s('circle', { class: 'f4-halo', r: 13 }),
        s('circle', { class: 'f4-hit', r: 17 }),
        shape,
        s('text', { class: 'f4-lbl', x: lbl.x, y: lbl.y, 'text-anchor': lbl.a }, d.name));
      g.addEventListener('click', () => select(d.id));
      g.addEventListener('focus', () => select(d.id));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(d.id); } });
      art.append(g);
      return { d, g };
    });

    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));
    const intro = 'Più a sinistra vuol dire più veloce, più in basso più parca: l\'angolo ideale è quello in basso a sinistra. Le linee tratteggiate uniscono le famiglie che spendono la stessa energia a ogni commutazione. Tocca un punto per i dettagli.';

    function place() {
      pts.forEach(({ d, g }) => {
        const vis = d.dec <= st.dec;
        const idle = st.idle && d.fam === 'cmos';
        g.style.transform = `translate(${X(d.t)}px, ${idle ? FLOOR : Y(d.p)}px) scale(${vis ? 1 : 0.3})`;
        g.style.opacity = vis ? '1' : '0';
        g.classList.toggle('is-idle', idle);
        g.classList.toggle('is-sel', vis && st.sel === d.id);
        g.setAttribute('tabindex', vis ? '0' : '-1');
        if (vis) g.removeAttribute('aria-hidden'); else g.setAttribute('aria-hidden', 'true');
      });
    }

    function select(id) {
      st.sel = id;
      place();
      const d = DATA.find((x) => x.id === id);
      const E = d.t * d.p;
      const power = d.fam === 'cmos'
        ? (st.idle ? 'ferma consuma quasi zero (al lavoro, a 1 MHz, circa ' + PL.fmt(d.p) + ' mW)' : 'circa ' + PL.fmt(d.p) + ' mW per porta a 1 MHz; ferma, quasi zero')
        : 'circa ' + PL.fmt(d.p) + ' mW per porta, sempre';
      say('<strong>' + d.name + '</strong> · ' + FAM[d.fam] + ' · ' + d.year + ': ritardo di circa ' + PL.fmt(d.t) + ' ns, ' + power + '. Ritardo per potenza: circa ' + PL.fmt(E, E < 10 ? 1 : 0) + ' pJ a commutazione. ' + d.note);
    }

    const decSeg = ui.segmented({
      label: 'Fino agli anni',
      options: [{ value: 60, label: 'anni ’60' }, { value: 70, label: 'anni ’70' }, { value: 80, label: 'anni ’80' }],
      value: st.dec,
      onChange: (v) => { stop(); st.dec = v; if (st.sel && DATA.find((x) => x.id === st.sel).dec > v) st.sel = null; place(); if (!st.sel) say(intro); },
    });
    const stop = () => { st.timers.forEach((t) => clearTimeout(t)); st.timers = []; };
    function play() {
      stop();
      st.sel = null;
      say(intro);
      [60, 70, 80].forEach((dec, i) => st.timers.push(PL.timeout(() => { st.dec = dec; decSeg.set(dec, true); place(); }, i * 1500)));
    }
    const playBtn = ui.btn({ label: 'Riproduci', icon: '▶︎', kind: 'lab', ariaLabel: 'Riproduci la storia decennio per decennio', onClick: play });
    const idleSeg = ui.segmented({
      label: 'Porte CMOS',
      options: [{ value: 'on', label: 'al lavoro (1 MHz)' }, { value: 'idle', label: 'ferme' }],
      value: 'on',
      onChange: (v) => { st.idle = v === 'idle'; place(); if (st.sel) select(st.sel); else say(st.idle ? 'Ferme, le porte CMOS non consumano quasi niente: scendono sul fondo del grafico. TTL ed ECL invece restano dove sono, perché consumano anche quando non cambiano.' : intro); },
    });
    place();
    say(intro);
    if (!PL.reduced()) PL.onVisible(art, () => play(), { threshold: 0.45 });
    const legend = h('ul', { class: 'f4-legend', 'aria-hidden': 'true' },
      h('li', { class: 'is-ttl' }, h('span', { class: 'f4-key' }), 'TTL'),
      h('li', { class: 'is-ecl' }, h('span', { class: 'f4-key' }), 'ECL'),
      h('li', { class: 'is-cmos' }, h('span', { class: 'f4-key' }), 'CMOS'));

    return ui.lab({
      title: 'Velocità contro consumo',
      intro: 'Sette famiglie storiche su un solo grafico: in orizzontale quanto è lenta una porta, in verticale quanto consuma. Guarda come si muovono decennio dopo decennio.',
      controls: [decSeg.el, playBtn, idleSeg.el],
      stage: [legend, art],
      readout,
      caption: 'Valori tipici delle schede tecniche, arrotondati, per una porta con un piccolo carico; scale logaritmiche, con un fattore dieci tra due righe principali. Le porte TTL ed ECL consumano sempre; per le CMOS il consumo dipende da quante volte cambiano, qui un milione di volte al secondo (1 MHz). Una porta di un processore di oggi commuta in pochi picosecondi e consuma milionesimi di watt: starebbe molto più in basso a sinistra, fuori dal grafico.',
      class: 'f4-lab',
    });
  }

  /* ---------- laboratorio: margine di rumore ---------- */

  function labNoise() {
    const FAMS = [
      { id: 'ttl', name: 'TTL · alimentata a 5 V', vol: 0.4, voh: 2.4, vil: 0.8, vih: 2.0 },
      { id: 'hc', name: 'CMOS 74HC · alimentata a 4,5 V', vol: 0.1, voh: 4.4, vil: 1.35, vih: 3.15 },
    ];
    const Yv = (v) => n1(220 - v * 38);
    const X0 = 72;
    const X1 = 300;
    const STEP = 9;
    const SPEED = 54;
    const POOL = Math.ceil((X1 - X0) / STEP) + 2;
    const HOLD = 4; // ogni bit dura quattro letture
    const st = { amp: 0.3, k: 0, bit: 0, frac: 0 };
    let rand = rng(1963);
    const lvl = (v) => PL.fmt(v, Math.round(v * 100) % 10 ? 2 : 1);
    const sub = (t) => s('tspan', { class: 'f5-sub', 'baseline-shift': 'sub' }, t);

    const panels = FAMS.map((F) => {
      const art = PL.svg('0 0 360 250', { class: 'f5-art', role: 'img', 'aria-label': F.name + ': l\'ingresso legge 0 sotto ' + lvl(F.vil) + ' V e 1 sopra ' + lvl(F.vih) + ' V; l\'uscita garantisce lo 0 sotto ' + lvl(F.vol) + ' V e l\'1 sopra ' + lvl(F.voh) + ' V.' });
      const uid = PL.uid('f5-hatch');
      art.append(s('defs', null,
        s('pattern', { id: uid, width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
          s('line', { class: 'f5-hatch', x1: 0, y1: 0, x2: 0, y2: 8 }))));
      const mid = (Yv(F.vih) + Yv(F.vil)) / 2;
      art.append(
        s('rect', { class: 'f5-zone is-1', x: X0, y: Yv(5), width: X1 - X0, height: Yv(F.vih) - Yv(5) }),
        s('rect', { class: 'f5-zone is-x', x: X0, y: Yv(F.vih), width: X1 - X0, height: Yv(F.vil) - Yv(F.vih) }),
        s('rect', { x: X0, y: Yv(F.vih), width: X1 - X0, height: Yv(F.vil) - Yv(F.vih), fill: `url(#${uid})` }),
        s('rect', { class: 'f5-zone is-0', x: X0, y: Yv(F.vil), width: X1 - X0, height: Yv(0) - Yv(F.vil) }),
        s('text', { class: 'f5-zt', x: X1 - 6, y: Yv(5) + 14, 'text-anchor': 'end' }, 'letto come 1'),
        s('text', { class: 'f5-zt is-x', x: X1 - 6, y: n1(mid + 4), 'text-anchor': 'end' }, 'zona proibita'),
        s('text', { class: 'f5-zt', x: X1 - 6, y: Yv(0) - 6, 'text-anchor': 'end' }, 'letto come 0'),
        s('line', { class: 'f5-out', x1: X0, y1: Yv(F.voh), x2: X1, y2: Yv(F.voh) }),
        s('line', { class: 'f5-out', x1: X0, y1: Yv(F.vol), x2: X1, y2: Yv(F.vol) }),
        s('text', { class: 'f5-lv is-out', x: X0 - 6, y: Yv(F.voh) + 4, 'text-anchor': 'end' }, 'V', sub('OH'), ' ' + lvl(F.voh)),
        s('text', { class: 'f5-lv', x: X0 - 6, y: Yv(F.vih) + 4, 'text-anchor': 'end' }, 'V', sub('IH'), ' ' + lvl(F.vih)),
        s('text', { class: 'f5-lv', x: X0 - 6, y: Yv(F.vil) + 4, 'text-anchor': 'end' }, 'V', sub('IL'), ' ' + lvl(F.vil)),
        s('text', { class: 'f5-lv is-out', x: X0 - 6, y: Yv(F.vol) + 4, 'text-anchor': 'end' }, 'V', sub('OL'), ' ' + lvl(F.vol)),
        s('text', { class: 'f5-mt', x: 330, y: 20, 'text-anchor': 'middle' }, 'margini'));
      [[F.voh, F.vih], [F.vil, F.vol]].forEach(([va, vb]) => {
        const ya = Yv(va);
        const yb = Yv(vb);
        art.append(
          s('path', { class: 'f5-br', d: `M306 ${ya}H312V${yb}H306` }),
          s('text', { class: 'f5-bt', x: 316, y: n1((ya + yb) / 2 + 4) }, lvl(Math.abs(va - vb)) + ' V'));
      });
      const line = s('polyline', { class: 'f5-line', points: '' });
      const dotsG = s('g');
      const dots = [];
      for (let i = 0; i < POOL; i++) {
        const c = s('circle', { class: 'f5-dot', r: 3.2, cx: -20, cy: -20 });
        dots.push(c);
        dotsG.append(c);
      }
      art.append(line, dotsG);
      const errEl = h('b', null, '0');
      const totEl = h('b', null, '0');
      const box = h('div', { class: 'f5-panel is-' + F.id },
        h('h4', null, F.name), art,
        h('p', { class: 'f5-count' }, 'letture sbagliate: ', errEl, ' su ', totEl));
      return { F, box, line, dots, errEl, totEl, samples: [], err: 0, tot: 0 };
    });

    // un nuovo campione: lo stesso bit e lo stesso disturbo arrivano a tutte e due le famiglie
    function emit() {
      if (st.k % HOLD === 0) st.bit = rand() < 0.5 ? 1 : 0;
      const noise = st.amp * (rand() + rand() - 1);
      panels.forEach((P) => {
        const F = P.F;
        const v = (st.bit ? F.voh : F.vol) + noise;
        const err = st.bit ? v < F.vih : v > F.vil;
        P.samples.push({ k: st.k, v, err });
        if (P.samples.length > POOL) P.samples.shift();
        P.tot += 1;
        if (err) P.err += 1;
        P.errEl.textContent = PL.fmt(P.err);
        P.totEl.textContent = PL.fmt(P.tot);
      });
      st.k += 1;
    }

    function render() {
      panels.forEach((P) => {
        const pts = [];
        P.dots.forEach((c, i) => {
          const smp = P.samples[i];
          if (!smp) { c.setAttribute('cx', -20); return; }
          const x = X1 - (st.k - 1 - smp.k + st.frac) * STEP;
          const y = clamp(220 - smp.v * 38, 24, 230);
          if (x < X0 - 1) { c.setAttribute('cx', -20); return; }
          c.setAttribute('cx', n1(x));
          c.setAttribute('cy', n1(y));
          c.setAttribute('class', smp.err ? 'f5-dot is-err' : 'f5-dot');
          c.setAttribute('r', smp.err ? 4.6 : 3.2);
          pts.push(n1(x) + ',' + n1(y));
        });
        P.line.setAttribute('points', pts.join(' '));
      });
    }

    function reset() {
      panels.forEach((P) => { P.samples = []; P.err = 0; P.tot = 0; });
      st.k = 0;
      st.frac = 0;
      rand = rng(1963 + Math.round(st.amp * 100));
      if (PL.reduced()) {
        for (let i = 0; i < POOL - 2; i++) emit();
        render();
      } else panels.forEach((P) => { P.errEl.textContent = '0'; P.totEl.textContent = '0'; });
    }

    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));
    function explain() {
      const a = '±' + PL.fmt(st.amp, 2) + ' V';
      if (st.amp <= 0.4) say('Con un rumore di ' + a + ' tutte e due le famiglie leggono ogni bit giusto: il disturbo è più piccolo di tutti e due i margini.');
      else if (st.amp <= 1.25) say('Con ' + a + ' la TTL comincia a sbagliare: il suo margine è di soli 0,4 V, e i punti rosa sono i bit letti male. La CMOS, con 1,25 V di margine, non sbaglia un bit.');
      else say('Con ' + a + ' sbaglia anche la CMOS: nessun margine resiste a un disturbo più grande di lui. Ma per arrivarci serve un rumore tre volte più forte di quello che manda in crisi la TTL.');
    }
    const sl = ui.slider({
      label: 'Rumore sul filo', min: 0, max: 1.5, step: 0.05, value: st.amp,
      format: (v) => '±' + PL.fmt(v, 2) + ' V',
      onInput: (v) => { st.amp = v; reset(); explain(); },
    });
    reset();
    explain();
    if (!PL.reduced()) {
      const grid = panels[0].box;
      PL.loop((dt) => {
        st.frac += (dt * SPEED) / STEP;
        while (st.frac >= 1) { st.frac -= 1; emit(); }
        render();
      }, { el: grid });
    }

    return ui.lab({
      title: 'Margine di rumore',
      intro: 'La stessa sequenza di bit, con lo stesso disturbo, viaggia su un filo TTL e su un filo CMOS. Alza il rumore e guarda quale famiglia comincia a sbagliare.',
      controls: [sl.el],
      stage: h('div', { class: 'f5-grid' }, panels.map((P) => P.box)),
      readout,
      caption: 'Livelli garantiti dalle schede tecniche: TTL alimentata a 5 V; 74HC alimentata a 4,5 V che comanda altri ingressi CMOS. Le uscite sono disegnate nel caso peggiore, proprio sui limiti garantiti (linee tratteggiate); il rumore è casuale e ogni punto è una lettura dell\'ingresso.',
      class: 'f5-lab',
    });
  }

  /* ---------- capitolo ---------- */

  PL.chapter({
    id: 'famiglie',
    num: 5,
    title: 'Le famiglie logiche',
    short: 'Famiglie',
    era: '1956 – oggi',
    minutes: 22,
    labs: 5,
    kicker: 'Una porta si può costruire in tanti modi. RTL, TTL, ECL, CMOS: le famiglie logiche, i loro compromessi tra velocità, consumo e disturbi, e la famiglia che alla fine ha conquistato tutti i chip.',
    summary: 'Come si costruisce davvero una porta con transistor e resistenze: le famiglie RTL, DTL, TTL, ECL e CMOS, e i loro compromessi tra velocità, consumo e disturbi.',
    timeline: [
      { year: 1956, title: 'Il commutatore di corrente', text: 'All\'IBM Hannon S. Yourke inventa il circuito che devia una corrente costante tra due transistor: è l\'idea della logica ECL.' },
      { year: 1961, title: 'Il brevetto della TTL', text: 'James L. Buie, della Pacific Semiconductors (gruppo TRW), deposita il brevetto della logica transistor-transistor.' },
      { year: 1962, title: 'I primi chip DTL', text: 'A marzo la Signetics presenta la prima famiglia di chip logici a diodi e transistor.' },
      { year: 1963, title: 'Nasce la CMOS', text: 'Frank Wanlass e Chih-Tang Sah presentano la logica CMOS alla conferenza ISSCC; il 18 giugno Wanlass deposita il brevetto.', key: true },
      { year: 1963, title: 'I primi chip TTL in vendita', text: 'La Sylvania mette in commercio la sua famiglia TTL, chiamata SUHL.' },
      { year: 1964, title: 'La serie 5400', text: 'In ottobre la Texas Instruments presenta il primo chip della serie 5400, per uso militare: quattro porte NAND.' },
      { year: 1966, title: 'Il 7400 in plastica', text: 'La versione economica, in contenitore di plastica, conquista il mercato: la serie 7400 diventa lo standard per decenni.', key: true },
      { year: 1968, title: 'La serie CD4000', text: 'La RCA presenta la prima famiglia di chip logici CMOS.' },
      { year: 1971, title: 'TTL Schottky ed ECL 10K', text: 'Escono la 74S, da 3 nanosecondi per porta, e la famiglia ECL MECL 10K della Motorola.' },
      { year: 1974, title: 'Un orologio in un chip', text: 'L\'orologio Microma ha tutta la sua elettronica in un solo chip CMOS.' },
      { year: 1976, title: 'Il Cray-1', text: 'A Los Alamos arriva il supercalcolatore di Seymour Cray, costruito con chip ECL e raffreddato a freon.' },
    ],
    glossary: [
      { term: 'Famiglia logica', def: 'Insieme di chip costruiti con lo stesso tipo di circuito, la stessa alimentazione e gli stessi livelli logici, che si possono collegare tra loro direttamente. Esempi: TTL, ECL, CMOS.' },
      { term: 'RTL', def: 'Resistor-transistor logic: famiglia logica in cui gli ingressi arrivano ai transistor attraverso resistenze e una resistenza di pull-up porta l\'uscita a 1. Fu tra le prime a essere integrate, all\'inizio degli anni Sessanta.' },
      { term: 'DTL', def: 'Diode-transistor logic: famiglia logica in cui i diodi sugli ingressi fanno la funzione logica e un transistor rigenera il segnale. La prima famiglia di chip DTL fu presentata dalla Signetics nel 1962.' },
      { term: 'TTL', def: 'Transistor-transistor logic: famiglia logica con un transistor a più emettitori sugli ingressi e due transistor che spingono l\'uscita in entrambe le direzioni. Alimentata a 5 V, dominò gli anni Settanta con la serie 7400.' },
      { term: 'ECL', def: 'Emitter-coupled logic: famiglia logica in cui una corrente costante viene deviata tra due transistor con gli emettitori in comune, che non vanno mai in saturazione. È la più veloce delle famiglie classiche, ma consuma molto.' },
      { term: 'CMOS', def: 'Complementary MOS: famiglia logica che usa coppie di transistor MOS complementari, pMOS verso l\'alimentazione e nMOS verso massa. A riposo non consuma quasi niente; oggi quasi tutti i chip digitali sono CMOS.' },
      { term: 'nMOS', def: 'Transistor MOS a canale n: conduce quando il suo gate è a tensione alta (1). Nelle porte CMOS forma la rete di pull-down, verso massa.' },
      { term: 'pMOS', def: 'Transistor MOS a canale p: conduce quando il suo gate è a tensione bassa (0). Nelle porte CMOS forma la rete di pull-up, verso l\'alimentazione.' },
      { term: 'Pull-up', def: 'Resistenza o rete di transistor che collega un\'uscita all\'alimentazione e la porta a 1 quando nient\'altro la tira verso 0.' },
      { term: 'Pull-down', def: 'Resistenza o rete di transistor che collega un\'uscita a massa e la porta a 0. Nelle porte CMOS è fatta di nMOS.' },
      { term: 'Fan-out', def: 'Il numero massimo di ingressi che un\'uscita può comandare mantenendo livelli logici validi. Una porta 7400 ne regge dieci della stessa famiglia.' },
      { term: 'Margine di rumore', def: 'Quanta tensione di disturbo può sommarsi a un segnale senza cambiarne il valore logico: la differenza tra il livello garantito dall\'uscita e la soglia richiesta dall\'ingresso.' },
      { term: 'Consumo statico', def: 'La potenza che una porta consuma quando non cambia stato. Nelle famiglie a transistor bipolari (RTL, TTL, ECL) è importante; nelle porte CMOS è quasi zero.' },
      { term: 'Consumo dinamico', def: 'La potenza spesa per far cambiare stato alle porte, caricando e scaricando i fili e gli ingressi collegati. Cresce con il numero di cambi al secondo e con il quadrato della tensione.' },
      { term: 'DIP', def: 'Dual in-line package: contenitore rettangolare con due file parallele di piedini distanti 2,54 mm, un decimo di pollice. Ideato alla Fairchild a metà degli anni Sessanta, fu il contenitore classico dei chip logici.' },
      { term: 'Serie 7400', def: 'La famiglia di chip logici TTL lanciata dalla Texas Instruments nel 1964 nella versione militare 5400 e nel 1966 in plastica. I suoi numeri, come 7400 per quattro porte NAND, si usano ancora oggi.' },
      { term: 'Saturazione', def: 'Lo stato di un transistor bipolare acceso al massimo: si comporta quasi come un interruttore chiuso, ma accumula cariche che ne rallentano lo spegnimento.' },
    ],
    render(root) {
      root.append(
        ui.section({ id: 'famiglia', title: 'Che cos\'è una famiglia logica', lead: 'Una porta si può costruire in molti modi. I chip costruiti allo stesso modo formano una famiglia, con i suoi pregi e i suoi difetti.' },
          ui.prose(
            'Fin qui le porte logiche sono state scatole con una regola: AND, OR, NOT. Dentro una porta vera, però, ci sono transistor, resistenze e a volte diodi, e c\'è più di un modo di collegarli. Ogni modo ha i suoi pregi e i suoi difetti, e i chip costruiti allo stesso modo formano una [[Famiglia logica|famiglia logica]].',
            'Dentro una famiglia tutti i chip usano la stessa alimentazione e gli stessi [[Livello logico|livelli logici]]: l\'uscita di uno si collega all\'ingresso di un altro senza pensarci, come i mattoncini di una stessa marca. Tra famiglie diverse, invece, a volte serve un circuito di adattamento. Come si è arrivati a mettere un\'intera porta in un pezzo di silicio, il circuito integrato, lo racconta il <a href="#integrato">capitolo 6</a>; qui guardiamo dentro le porte.',
            'Per confrontare due famiglie gli ingegneri guardano sempre gli stessi quattro numeri.'),
          figMeasures(),
          ui.prose('Nessuna famiglia vince su tutti e quattro: di solito una porta più veloce consuma di più, e una più parca è più lenta. La storia delle famiglie logiche, dagli anni Sessanta a oggi, è la storia di questi compromessi, fino alla famiglia che li ha messi d\'accordo quasi tutti: la CMOS.')),

        ui.section({ id: 'rtl-dtl', title: 'RTL e DTL, le prime porte integrate', kicker: '1961 – 1964' },
          ui.prose(
            'I primi chip logici usavano i componenti più facili da costruire sul silicio: transistor e resistenze. Nella logica [[RTL]] (resistor-transistor logic) ogni ingresso arriva alla base di un transistor attraverso una resistenza. I transistor sono collegati in parallelo e condividono una resistenza verso l\'alimentazione, la resistenza di [[Pull-up|pull-up]]: basta che un ingresso sia a 1 perché il suo transistor conduca e porti l\'uscita a 0. È una porta NOR.',
            'Le prime famiglie di chip logici, all\'inizio degli anni Sessanta, erano costruite così o in modi molto simili. Era RTL anche la porta del computer di guida delle missioni Apollo, progettata dalla Fairchild: due NOR a tre ingressi in un minuscolo contenitore piatto, ripetute in circa 2.800 chip tutti uguali (<a href="#porte/universale">capitolo 2</a>). Il suo punto debole si vede nel laboratorio: quando l\'uscita è a 1 è la resistenza di pull-up a dare corrente a tutti gli ingressi collegati, e più sono, più il livello alto si abbassa.'),
          labRtl(),
          ui.cols(
            ui.callout({
              kind: 'note',
              title: 'Come un impianto con troppi radiatori',
              body: 'Il fan-out funziona come un circolatore che deve servire troppi radiatori: oltre un certo numero, agli ultimi l\'acqua arriva tiepida. Allo stesso modo, oltre un certo numero di ingressi collegati, il livello alto diventa troppo debole per essere letto come 1. Le schede tecniche dicono quanti ingressi un\'uscita può comandare: per una porta 7400, dieci.',
            }),
            ui.callout({
              kind: 'link',
              title: 'Le resistenze di pull-up esistono ancora',
              body: 'Molti bus di comunicazione ne usano una. Nel bus I²C ogni dispositivo può soltanto tirare la linea verso 0, e quando nessuno la tira è la resistenza di pull-up a riportarla a 1. Lo mostra il laboratorio sull\'<a href="../../index.html#/bus/i2c">I²C di BusLab</a>.',
            })),
          ui.prose(
            'Poco dopo arrivò la logica [[DTL]] (diode-transistor logic): sugli ingressi ci sono dei diodi, che fanno il lavoro logico, e un solo transistor rigenera il segnale. Nel marzo 1962 la Signetics presentò la prima famiglia di chip DTL, e nel 1964 la serie 930 della Fairchild dominava il mercato.',
            'RTL e DTL avevano però due difetti. Erano lente soprattutto a portare l\'uscita a 1, perché quel lavoro lo faceva una resistenza; e con molti ingressi collegati il segnale si indeboliva. La famiglia successiva li corresse entrambi.')),

        ui.section({ id: 'ttl', title: 'La TTL e la serie 7400', kicker: '1961 – 1976 · TRW, Sylvania, Texas Instruments' },
          ui.prose(
            'Nel settembre 1961 James L. Buie, ingegnere della Pacific Semiconductors, una società del gruppo TRW, depositò il brevetto di una porta in cui gli ingressi entravano direttamente in un transistor speciale, con più emettitori. La chiamò transistor-coupled transistor logic. Pochi mesi prima, alla Fairchild, Robert Beeson aveva scritto sul suo quaderno di laboratorio il nome che sarebbe rimasto: transistor-transistor logic, [[TTL]].',
            'La TTL era più veloce: lo stadio d\'uscita aveva due transistor uno sopra l\'altro, che spingevano l\'uscita sia verso l\'1 sia verso lo 0 senza aspettare una resistenza. I primi chip TTL in commercio furono quelli della Sylvania, nel 1963. Nell\'ottobre 1964 la Texas Instruments presentò il primo chip della sua serie 5400, per uso militare: quattro porte NAND a due ingressi. Nel 1966 arrivò la versione in plastica, più economica: il 7400.',
            'La [[Serie 7400|serie 7400]] ebbe un successo enorme: conquistò in fretta più di metà del mercato dei chip logici, e altri produttori ne fabbricarono copie compatibili, con gli stessi numeri e gli stessi piedini. Un progettista poteva così scegliere i chip da un catalogo comune, come pezzi standard. Anche l\'alimentazione a 5 V della TTL diventò uno standard, e durò decenni.'),
          lab7400(),
          ui.prose('Il contenitore di questi chip era il [[DIP]] (dual in-line package): un corpo di plastica o di ceramica con due file di piedini distanti 2,54 mm, cioè un decimo di pollice. Lo idearono alla Fairchild, intorno al 1965, Don Forbes, Rex Rice e Bryant Rogers, e all\'inizio degli anni Settanta la versione in plastica era ovunque. Negli stessi anni la TTL si divise in sottofamiglie con gli stessi piedini e prestazioni diverse: la 74S (Schottky, del 1971) scendeva a 3 nanosecondi per porta consumando quasi il doppio; la 74LS (Schottky a bassa potenza) aveva la velocità della 7400 originale con un quinto del consumo, e diventò la più usata.'),
          ui.cols(
            ui.person({
              name: 'James L. Buie', years: '1920 – 1988', role: 'ingegnere',
              body: [
                'Lavorava alla Pacific Semiconductors, una società del gruppo TRW che produceva transistor. Nel 1961 depositò il brevetto della sua porta, che chiamò transistor-coupled transistor logic; gli fu concesso nel 1966.',
                'La TRW non la mise mai in produzione, ma l\'idea, ripresa e perfezionata da altri, diventò la famiglia logica più diffusa degli anni Settanta.',
              ],
            }),
            ui.callout({
              kind: 'fun',
              title: 'Un decimo di pollice',
              body: 'La distanza tra i piedini del DIP, 2,54 mm, è la stessa dei fori delle basette sperimentali, le breadboard, che si usano ancora oggi nelle scuole e nei laboratori. Per questo molti chip si vendono ancora anche in versione DIP: si infilano nella basetta senza saldare niente.',
            }))),

        ui.section({ id: 'ecl', title: 'ECL, la famiglia più veloce', kicker: '1956 – 1976 · IBM, Motorola, Cray' },
          ui.prose(
            'Le famiglie viste finora hanno un punto debole comune: quando un transistor conduce del tutto entra in [[Saturazione|saturazione]], e per spegnerlo bisogna aspettare che smaltisca le cariche accumulate. Nell\'agosto 1956, all\'IBM, Hannon S. Yourke trovò il modo di evitarlo: invece di accendere e spegnere la corrente, spostarla. Una corrente costante viene deviata verso uno di due transistor, a seconda che l\'ingresso sia più alto o più basso di una tensione di riferimento, e nessun transistor si satura mai.',
            'È la logica [[ECL]] (emitter-coupled logic), chiamata così perché i due transistor hanno gli emettitori collegati insieme. L\'IBM la usò nei suoi calcolatori più veloci della fine degli anni Cinquanta, come lo Stretch e i modelli 7090 e 7094. Poi la Motorola la portò nei chip: nel 1968 la sua famiglia MECL III commutava in circa un nanosecondo, e dal 1971 la MECL 10K, da circa 2 nanosecondi, fu usata in molti calcolatori veloci.'),
          figEcl(),
          ui.prose('Il prezzo da pagare era il consumo: la corrente scorre sempre, anche quando la porta non fa niente, e una porta ECL consuma molto più di una TTL. I calcolatori ECL erano velocissimi e caldissimi. Il più famoso fu il Cray-1 di Seymour Cray, installato nel 1976 al laboratorio nazionale di Los Alamos: lavorava a 80 MHz, assorbiva circa 115 kW, e quasi tutta la sua logica usava un solo tipo di porta ECL. Per non farlo cuocere lo raffreddava il freon, il gas refrigerante dei frigoriferi di allora: ogni scheda poggiava su una piastra di rame che portava il calore verso tubi percorsi dal freon.'),
          ui.stats([
            { value: 80, unit: 'MHz', label: 'la frequenza del Cray-1', note: 'un ciclo ogni 12,5 nanosecondi' },
            { value: 115, unit: 'kW', label: 'la potenza assorbita', note: 'circa, quasi tutta trasformata in calore' },
            { value: 5.5, unit: 't', label: 'il suo peso', note: 'circa 5,5 tonnellate' },
            { value: 8.8, unit: 'milioni di $', label: 'il prezzo del primo esemplare', note: 'quello installato a Los Alamos' },
          ]),
          ui.cols(
            ui.person({
              name: 'Seymour Cray', years: '1925 – 1996', role: 'progettista di supercalcolatori',
              body: [
                'Nato a Chippewa Falls, nel Wisconsin, nel 1957 fu tra i fondatori della Control Data Corporation, dove progettò il CDC 6600, dal 1964 il calcolatore più veloce del mondo, già raffreddato con il freon.',
                'Nel 1972 fondò la sua azienda, la Cray Research. Il Cray-1 fu il primo di una lunga serie di supercalcolatori che portarono il suo nome.',
              ],
            }),
            ui.callout({
              kind: 'fun',
              title: 'Il divano più caro del mondo',
              body: 'Il Cray-1 aveva la forma di una C, perché i fili all\'interno fossero più corti possibile: anche nei fili il segnale impiega un tempo, e a 80 MHz ogni centimetro conta. Intorno alla base, dove stavano gli alimentatori, correva un sedile imbottito: qualcuno lo chiamò il divano più caro del mondo.',
            }))),

        ui.section({ id: 'cmos', title: 'CMOS: due squadre di interruttori', kicker: '1963 – oggi · Fairchild e RCA' },
          ui.prose(
            'Intanto si stava facendo strada un altro tipo di transistor, il [[MOSFET]]: una tensione su un elettrodo isolato, il [[Gate|gate]], apre o chiude un canale tra due morsetti, quasi senza assorbire corrente. In questo capitolo basta pensarlo come un interruttore comandato da una tensione. Ne esistono due versioni complementari: il [[nMOS]] si chiude quando il gate è a 1, il [[pMOS]] quando il gate è a 0.',
            'Nel febbraio 1963 Frank Wanlass, un giovane fisico arrivato alla Fairchild pochi mesi prima, e Chih-Tang Sah, che guidava il suo gruppo, presentarono alla conferenza ISSCC di Filadelfia un articolo dal titolo modesto: <em>Nanowatt Logic Using Field-Effect Metal-Oxide Semiconductor Triodes</em>. Mettendo un pMOS e un nMOS uno sopra l\'altro, Wanlass aveva ottenuto un invertitore che a riposo consumava pochi nanowatt, milioni di volte meno delle porte di allora. Il 18 giugno 1963 depositò il brevetto, concesso nel dicembre 1967, che descriveva anche le porte NOR e NAND. Era nata la logica [[CMOS]] (complementary MOS).',
            'L\'idea è semplice. Ogni porta CMOS ha due squadre di interruttori. Quella di sopra, fatta di pMOS, collega l\'uscita all\'alimentazione: è la rete di pull-up. Quella di sotto, fatta di nMOS, collega l\'uscita a massa: è la rete di [[Pull-down|pull-down]]. Le due squadre ricevono gli stessi ingressi e sono costruite in modo che, quando una conduce, l\'altra sia aperta: la corrente non trova mai una strada diretta dall\'alimentazione a massa.'),
          labCmos(),
          ui.prose(
            'Il vantaggio è enorme: a riposo una porta CMOS non consuma quasi niente, il suo [[Consumo statico|consumo statico]] è quasi zero. L\'energia si spende solo quando l\'uscita cambia, per caricare e scaricare i fili e gli ingressi collegati: è il [[Consumo dinamico|consumo dinamico]], che cresce con il numero di cambi al secondo. Una porta ferma non consuma; una che cambia un miliardo di volte al secondo consuma eccome.',
            'All\'inizio la CMOS era lenta e delicata, e fu la RCA a crederci per prima: nel 1968 presentò la serie CD4000, la prima famiglia di chip logici CMOS, con ritardi di decine o centinaia di nanosecondi. Andava benissimo dove la pila contava più della velocità, come negli orologi digitali e negli strumenti portatili. Nel 1974 l\'orologio Microma aveva tutta la sua elettronica in un solo chip CMOS, prodotto dalla Intel.',
            'Nei primi anni Ottanta arrivò la serie 74HC (high-speed CMOS): la velocità della 74LS, gli stessi piedini della vecchia 7400 e un consumo a riposo quasi nullo. Da allora la CMOS ha conquistato tutto, e oggi quasi ogni chip digitale, dal processore del telefono alla memoria, è costruito con questa tecnologia. Il motivo lo racconta il <a href="#moore">capitolo 9</a>: per decenni i transistor MOS sono diventati più piccoli, più veloci e più parchi, e le porte CMOS con loro.'),
          ui.cols(
            ui.person({
              name: 'Frank Wanlass', years: '1933 – 2010', role: 'ingegnere e inventore',
              body: [
                'Nato a Thatcher, in Arizona, prese il dottorato in fisica all\'Università dello Utah nel 1962 ed entrò alla Fairchild in ottobre. Pochi mesi dopo aveva inventato la logica CMOS.',
                'Nel 1964 passò alla General Microelectronics, la prima azienda a produrre e vendere circuiti integrati MOS. Nel 2009 è entrato nella National Inventors Hall of Fame degli Stati Uniti.',
              ],
            }),
            ui.person({
              name: 'Chih-Tang Sah', years: '1932 – 2025', role: 'fisico',
              body: [
                'Nato a Pechino, studiò negli Stati Uniti. Alla Fairchild guidava il gruppo di cui faceva parte Wanlass, e con lui firmò l\'articolo del 1963 sulla logica CMOS.',
                'Insegnò poi all\'Università dell\'Illinois e all\'Università della Florida. Il modello di Pao e Sah, del 1966, che descrive la corrente nei transistor MOS, è un classico della microelettronica.',
              ],
            })),
          ui.cols(
            ui.callout({
              kind: 'link',
              title: 'Il transistor MOS da vicino',
              body: 'Come funziona un MOSFET, con il suo gate isolato e il canale che si apre e si chiude, lo spiega la sezione di <a href="../elettronica-intermedia/index.html#mosfet">elettronica intermedia</a>. Com\'è fatto dentro un chip, strato per strato, lo vedremo nel <a href="#struttura">capitolo 8</a>.',
            }),
            ui.callout({
              kind: 'warn',
              title: 'La «batteria del CMOS»',
              body: 'Nei computer si sente parlare di «memoria CMOS» o di «batteria del CMOS»: è una piccola memoria con l\'orologio e le impostazioni di avvio, alimentata da una pila a bottone. Si chiama così perché era fatta in tecnologia CMOS, che consumava così poco da far durare la pila per anni. Ma oggi è CMOS quasi tutto il computer, non solo quella memoria.',
            }))),

        ui.section({ id: 'confronto', title: 'Velocità contro consumo', lead: 'Velocità, consumo, resistenza ai disturbi: messe una accanto all\'altra, le famiglie mostrano i loro compromessi, e perché alla fine ha vinto la CMOS.' },
          ui.prose('Su un grafico il compromesso salta all\'occhio: le famiglie più veloci, come la ECL e la 74S, stanno in alto, perché consumano molto; le più parche stanno in basso, e le CMOS ferme quasi spariscono. Un buon modo per riassumere una famiglia è moltiplicare il ritardo per la potenza: si ottiene l\'energia spesa a ogni commutazione, e più è piccola, meglio è.'),
          labChart(),
          ui.prose('C\'è poi la resistenza ai disturbi. Un\'uscita non dà mai esattamente 0 V o 5 V: la scheda tecnica garantisce solo che lo 0 resti sotto un certo valore e l\'1 sopra un altro. L\'ingresso, dal canto suo, garantisce di leggere 0 sotto una certa [[Soglia|soglia]] e 1 sopra un\'altra. La distanza tra quello che l\'uscita garantisce e quello che l\'ingresso pretende è il margine di rumore: quanto disturbo può raccogliere il filo senza che un bit cambi.'),
          labNoise(),
          ui.prose('La CMOS ha vinto per tutte queste ragioni insieme: consumo a riposo quasi nullo, margini ampi e, soprattutto, transistor che si possono rimpicciolire senza perdere i vantaggi. La numerazione della vecchia serie 7400, invece, è sopravvissuta: un 74HC00 o un 74LVC00 di oggi contiene ancora quattro NAND a due ingressi, con gli stessi piedini del 7400 del 1966.'),
          ui.keyIdea('Una porta logica si può costruire in molti modi, e ogni modo è una famiglia: RTL, DTL, TTL, ECL, CMOS. Tra velocità, consumo e resistenza ai disturbi bisogna sempre scegliere. La CMOS, con le sue due squadre di interruttori che non conducono mai insieme, ha trovato il compromesso migliore ed è diventata la base di quasi tutti i chip di oggi.'),
          ui.crossLink({ href: '#integrato', kicker: 'Capitolo 6', title: 'Nasce il circuito integrato', text: 'Facciamo un passo indietro: come nacque l\'idea di mettere un intero circuito, transistor, resistenze e fili, in un solo pezzo di silicio.' })));
    },
  });
})();
