/*
 * Porte logiche e chip · motore logico (puro, senza DOM, verificato dai test con Node).
 * Porte, tabelle di verità, simulazione a eventi di reti di porte con ritardo di propagazione,
 * sommatori, latch e flip-flop, reti di sole NAND e porte CMOS a livello di transistor.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const and = (v) => (v.every((x) => x === 1) ? 1 : 0);
  const or = (v) => (v.some((x) => x === 1) ? 1 : 0);
  const xor = (v) => v.reduce((a, b) => a ^ b, 0);

  /**
   * Le porte. expr è in HTML: <span class="ovl"> traccia la barra della negazione.
   * rule spiega a parole quando l'uscita vale 1.
   */
  const GATES = {
    BUF: { id: 'BUF', name: 'Buffer', arity: 1, fn: (v) => v[0], iec: '1', neg: false, expr: 'A', rule: 'L\'uscita copia l\'ingresso.' },
    NOT: { id: 'NOT', name: 'NOT', it: 'NON', arity: 1, fn: (v) => 1 - v[0], iec: '1', neg: true, expr: '<span class="ovl">A</span>', rule: 'L\'uscita è l\'opposto dell\'ingresso.' },
    AND: { id: 'AND', name: 'AND', it: 'E', arity: 2, fn: and, iec: '&amp;', neg: false, expr: 'A · B', rule: 'L\'uscita è 1 solo se tutti gli ingressi sono 1.' },
    OR: { id: 'OR', name: 'OR', it: 'O', arity: 2, fn: or, iec: '≥1', neg: false, expr: 'A + B', rule: 'L\'uscita è 1 se almeno un ingresso è 1.' },
    NAND: { id: 'NAND', name: 'NAND', it: 'NON-E', arity: 2, fn: (v) => 1 - and(v), iec: '&amp;', neg: true, expr: '<span class="ovl">A · B</span>', rule: 'L\'uscita è 0 solo se tutti gli ingressi sono 1.' },
    NOR: { id: 'NOR', name: 'NOR', it: 'NON-O', arity: 2, fn: (v) => 1 - or(v), iec: '≥1', neg: true, expr: '<span class="ovl">A + B</span>', rule: 'L\'uscita è 1 solo se tutti gli ingressi sono 0.' },
    XOR: { id: 'XOR', name: 'XOR', it: 'O esclusivo', arity: 2, fn: xor, iec: '=1', neg: false, expr: 'A ⊕ B', rule: 'L\'uscita è 1 se gli ingressi sono diversi (con più ingressi: se il numero di 1 è dispari).' },
    XNOR: { id: 'XNOR', name: 'XNOR', it: 'equivalenza', arity: 2, fn: (v) => 1 - xor(v), iec: '=1', neg: true, expr: '<span class="ovl">A ⊕ B</span>', rule: 'L\'uscita è 1 se gli ingressi sono uguali.' },
  };

  const GATE_ORDER = ['NOT', 'AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'];

  /** Valuta una porta su un elenco di ingressi 0/1. */
  function evalGate(type, inputs) {
    const g = GATES[type];
    if (!g) throw new Error('Porta sconosciuta: ' + type);
    return g.fn(inputs.map((x) => (x ? 1 : 0)));
  }

  /** Numero → bit, il più significativo per primo: toBits(5, 4) → [0,1,0,1]. */
  function toBits(n, width) {
    const out = [];
    for (let i = width - 1; i >= 0; i--) out.push((n >> i) & 1);
    return out;
  }

  /** Bit (il più significativo per primo) → numero. */
  function fromBits(bits) {
    return bits.reduce((acc, b) => acc * 2 + (b ? 1 : 0), 0);
  }

  /** Tutte le combinazioni di n ingressi in ordine di conteggio binario. */
  function combos(n) {
    const out = [];
    for (let i = 0; i < 1 << n; i++) out.push(toBits(i, n));
    return out;
  }

  /** Tabella di verità di una porta: [{ inputs: [a, b], out }]. */
  function truthTable(type, n) {
    const k = n || GATES[type].arity;
    return combos(k).map((inputs) => ({ inputs, out: evalGate(type, inputs) }));
  }

  /* ---------- simulazione a eventi ---------- */

  /**
   * Una rete è { gates: [{ id, type, in: ['A', 'B'], out: 'X', delay? }] }.
   * Ogni segnale è guidato da una sola porta (o è un ingresso esterno).
   */
  function fanout(net) {
    const map = {};
    for (const g of net.gates) for (const sig of g.in) (map[sig] = map[sig] || []).push(g);
    return map;
  }

  /**
   * Applica dei cambiamenti agli ingressi e propaga i segnali nel tempo.
   * Ogni porta impiega `delay` unità di tempo (ritardo inerziale: un impulso più breve viene assorbito).
   * Restituisce { events: [{ t, signal, value, gate }], state, stable, time }.
   * stable = false se la rete oscilla (per esempio un latch SR rilasciato da S = R = 1).
   */
  function simulate(net, state, changes, opts) {
    const o = Object.assign({ delay: 1, maxT: 64 }, opts || {});
    const cur = Object.assign({}, state);
    const fan = fanout(net);
    let queue = Object.keys(changes || {}).map((signal) => ({ t: 0, signal, value: changes[signal] ? 1 : 0, gate: null }));
    if (o.evaluateAll) {
      for (const g of net.gates) queue.push({ t: 0, signal: '__eval', value: 0, gate: g.id, force: g });
    }
    const events = [];
    let time = 0;
    while (queue.length) {
      queue.sort((a, b) => a.t - b.t);
      const t = queue[0].t;
      if (t > o.maxT) return { events, state: cur, stable: false, time: o.maxT };
      time = t;
      const batch = queue.filter((e) => e.t === t);
      queue = queue.filter((e) => e.t !== t);
      const touched = new Set();
      for (const e of batch) {
        if (e.force) { touched.add(e.force); continue; }
        if ((cur[e.signal] | 0) !== e.value || !(e.signal in cur)) {
          const changed = (cur[e.signal] | 0) !== e.value;
          cur[e.signal] = e.value;
          if (changed || e.gate == null) events.push({ t: e.t, signal: e.signal, value: e.value, gate: e.gate });
          for (const g of fan[e.signal] || []) touched.add(g);
        }
      }
      for (const g of touched) {
        const v = evalGate(g.type, g.in.map((sig) => cur[sig] | 0));
        const d = g.delay == null ? o.delay : g.delay;
        queue = queue.filter((q) => !(q.signal === g.out && q.t > t));
        if (v !== (cur[g.out] | 0) || !(g.out in cur)) queue.push({ t: t + d, signal: g.out, value: v, gate: g.id });
      }
    }
    return { events, state: cur, stable: true, time };
  }

  /** Porta la rete in uno stato stabile partendo dagli ingressi dati (e da uno stato iniziale facoltativo). */
  function settle(net, inputs, initial, opts) {
    const start = Object.assign({}, initial || {});
    for (const g of net.gates) if (!(g.out in start)) start[g.out] = 0;
    for (const k in inputs) start[k] = inputs[k] ? 1 : 0;
    const r = simulate(net, start, {}, Object.assign({ evaluateAll: true }, opts || {}));
    return r.state;
  }

  /* ---------- aritmetica ---------- */

  function halfAdder(a, b) {
    return { sum: a ^ b, carry: a & b };
  }

  function fullAdder(a, b, cin) {
    const s1 = a ^ b;
    return { sum: s1 ^ cin, cout: (a & b) | (s1 & cin) };
  }

  /**
   * Sommatore a propagazione del riporto. a e b sono numeri, width i bit.
   * stages[i] descrive il bit i (0 = meno significativo); ready è l'istante in cui il riporto è pronto
   * (2 ritardi di porta per stadio nel modello semplice).
   */
  function rippleAdd(a, b, width, cin) {
    let carry = cin ? 1 : 0;
    const stages = [];
    for (let i = 0; i < width; i++) {
      const ai = (a >> i) & 1;
      const bi = (b >> i) & 1;
      const r = fullAdder(ai, bi, carry);
      stages.push({ bit: i, a: ai, b: bi, cin: carry, sum: r.sum, cout: r.cout, ready: 2 * (i + 1) });
      carry = r.cout;
    }
    const sum = stages.reduce((acc, st) => acc | (st.sum << st.bit), 0);
    return { sum, cout: carry, overflow: carry === 1, stages, total: sum + carry * (1 << width) };
  }

  /** Rete di porte di un sommatore completo (XOR, AND, OR) con prefisso per i nomi dei segnali. */
  function fullAdderNet(p, a, b, cin, sum, cout) {
    return [
      { id: p + 'x1', type: 'XOR', in: [a, b], out: p + 's1' },
      { id: p + 'x2', type: 'XOR', in: [p + 's1', cin], out: sum },
      { id: p + 'a1', type: 'AND', in: [a, b], out: p + 'c1' },
      { id: p + 'a2', type: 'AND', in: [p + 's1', cin], out: p + 'c2' },
      { id: p + 'o1', type: 'OR', in: [p + 'c1', p + 'c2'], out: cout },
    ];
  }

  /** Sommatore a n bit come rete: ingressi A0..An-1, B0..Bn-1, C0; uscite S0..Sn-1 e Cn. */
  function rippleNet(width) {
    const gates = [];
    for (let i = 0; i < width; i++) gates.push(...fullAdderNet('fa' + i + '_', 'A' + i, 'B' + i, 'C' + i, 'S' + i, 'C' + (i + 1)));
    return { gates };
  }

  /* ---------- memoria ---------- */

  /** Latch SR con due NOR incrociate: Q = NOR(R, Q̄), Q̄ = NOR(S, Q). */
  const SR_NOR = {
    gates: [
      { id: 'n1', type: 'NOR', in: ['R', 'Qn'], out: 'Q' },
      { id: 'n2', type: 'NOR', in: ['S', 'Q'], out: 'Qn' },
    ],
  };

  /** Comportamento del latch SR: restituisce il nuovo stato e una parola che lo descrive. */
  function srLatch(q, sIn, rIn) {
    if (sIn && rIn) return { q: 0, nq: 0, mode: 'vietato' };
    if (sIn) return { q: 1, nq: 0, mode: 'set' };
    if (rIn) return { q: 0, nq: 1, mode: 'reset' };
    return { q, nq: 1 - q, mode: 'memoria' };
  }

  /** Latch D trasparente: quando enable = 1 l'uscita segue D, altrimenti ricorda. */
  function dLatch(q, d, enable) {
    return enable ? d : q;
  }

  /** Flip-flop D sul fronte di salita del clock. */
  function dFlipFlop(q, d, prevClk, clk) {
    return !prevClk && clk ? d : q;
  }

  /** Un passo di contatore binario a n bit (con ritorno a zero). */
  function countStep(n, width) {
    return (n + 1) % (1 << width);
  }

  /* ---------- porte di sole NAND ---------- */

  const NAND_ONLY = {
    NOT: { gates: [{ id: 'g1', type: 'NAND', in: ['A', 'A'], out: 'Q' }], inputs: ['A'] },
    AND: {
      gates: [
        { id: 'g1', type: 'NAND', in: ['A', 'B'], out: 'n1' },
        { id: 'g2', type: 'NAND', in: ['n1', 'n1'], out: 'Q' },
      ],
      inputs: ['A', 'B'],
    },
    OR: {
      gates: [
        { id: 'g1', type: 'NAND', in: ['A', 'A'], out: 'na' },
        { id: 'g2', type: 'NAND', in: ['B', 'B'], out: 'nb' },
        { id: 'g3', type: 'NAND', in: ['na', 'nb'], out: 'Q' },
      ],
      inputs: ['A', 'B'],
    },
    NOR: {
      gates: [
        { id: 'g1', type: 'NAND', in: ['A', 'A'], out: 'na' },
        { id: 'g2', type: 'NAND', in: ['B', 'B'], out: 'nb' },
        { id: 'g3', type: 'NAND', in: ['na', 'nb'], out: 'or' },
        { id: 'g4', type: 'NAND', in: ['or', 'or'], out: 'Q' },
      ],
      inputs: ['A', 'B'],
    },
    XOR: {
      gates: [
        { id: 'g1', type: 'NAND', in: ['A', 'B'], out: 'n1' },
        { id: 'g2', type: 'NAND', in: ['A', 'n1'], out: 'n2' },
        { id: 'g3', type: 'NAND', in: ['B', 'n1'], out: 'n3' },
        { id: 'g4', type: 'NAND', in: ['n2', 'n3'], out: 'Q' },
      ],
      inputs: ['A', 'B'],
    },
  };

  /** Valore stabile dell'uscita Q di una rete per una combinazione di ingressi. */
  function netOutput(net, inputs, outName) {
    const st = settle(net, inputs);
    return st[outName || 'Q'];
  }

  /* ---------- CMOS a livello di transistor ---------- */

  /**
   * Porta CMOS: un pMOS conduce quando il suo gate è 0, un nMOS quando è 1.
   * Restituisce i transistor, se conduce la rete di pull-up (verso VDD) o di pull-down (verso massa) e l'uscita.
   */
  function cmos(type, inputs) {
    const [a, b] = [inputs[0] ? 1 : 0, inputs[1] ? 1 : 0];
    const P = (id, gate, v) => ({ id, kind: 'p', gate, on: v === 0 });
    const N = (id, gate, v) => ({ id, kind: 'n', gate, on: v === 1 });
    let t;
    let up;
    let down;
    if (type === 'NOT') {
      t = [P('P1', 'A', a), N('N1', 'A', a)];
      up = t[0].on;
      down = t[1].on;
    } else if (type === 'NAND') {
      t = [P('P1', 'A', a), P('P2', 'B', b), N('N1', 'A', a), N('N2', 'B', b)];
      up = t[0].on || t[1].on; // pMOS in parallelo
      down = t[2].on && t[3].on; // nMOS in serie
    } else if (type === 'NOR') {
      t = [P('P1', 'A', a), P('P2', 'B', b), N('N1', 'A', a), N('N2', 'B', b)];
      up = t[0].on && t[1].on; // pMOS in serie
      down = t[2].on || t[3].on; // nMOS in parallelo
    } else throw new Error('CMOS non disponibile per ' + type);
    return { transistors: t, up, down, out: up ? 1 : 0, short: up && down, floating: !up && !down };
  }

  return {
    GATES, GATE_ORDER, evalGate, toBits, fromBits, combos, truthTable,
    simulate, settle, netOutput,
    halfAdder, fullAdder, rippleAdd, fullAdderNet, rippleNet,
    SR_NOR, srLatch, dLatch, dFlipFlop, countStep,
    NAND_ONLY, cmos,
  };
});
