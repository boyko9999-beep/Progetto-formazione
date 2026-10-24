/*
 * Capitolo 1 · La logica prima dei circuiti (1847 – 1938).
 * Boole, De Morgan, Peirce, Sheffer e Shannon. Laboratori: frasi vere e false,
 * leggi di De Morgan, il circuito di Shannon (serie, parallelo, misto, deviatore), rumore e soglia.
 */
(function () {
  'use strict';

  const { h, s, ui, draw } = PL;

  /* ---------- laboratorio: frasi vere e false ---------- */

  function labSentences() {
    const st = { A: 1, B: 0 };
    const rows = [
      { id: 'and', op: 'A AND B', boole: 'A · B', text: 'Piove e fa freddo', fn: () => st.A & st.B },
      { id: 'or', op: 'A OR B', boole: 'A + B', text: 'Piove oppure fa freddo', fn: () => st.A | st.B },
      { id: 'not', op: 'NOT A', boole: '<span class="ovl">A</span>', text: 'Non piove', fn: () => 1 - st.A },
    ];
    const cards = rows.map((r) => {
      const led = ui.led(0, r.text);
      const val = h('span', { class: 'b1-val' });
      const card = h('div', { class: 'b1-row' },
        h('span', { class: 'b1-op pl-mono' }, r.op),
        h('span', { class: 'b1-text' }, '«' + r.text + '»'),
        h('span', { class: 'b1-boole pl-mono', html: r.boole }),
        h('span', { class: 'b1-out' }, led, val));
      return { r, card, led, val };
    });
    const readout = h('p', { class: 'b1-explain' });
    const update = () => {
      cards.forEach((c) => {
        const v = c.r.fn();
        const was = c.card.dataset.v;
        c.led.set(v);
        c.val.replaceChildren(h('strong', null, v ? 'VERA' : 'FALSA'), ' = ' + v);
        c.card.classList.toggle('is-true', !!v);
        if (was != null && was !== String(v) && !PL.reduced()) {
          c.card.classList.remove('flash');
          void c.card.offsetWidth;
          c.card.classList.add('flash');
        }
        c.card.dataset.v = String(v);
      });
      const a = st.A ? 'piove' : 'non piove';
      const b = st.B ? 'fa freddo' : 'non fa freddo';
      let why;
      if (st.A && st.B) why = 'Tutte e due le frasi semplici sono vere: anche «e» e «oppure» danno vero.';
      else if (st.A || st.B) why = '«E» pretende che siano vere entrambe, quindi dà falso; a «oppure» ne basta una, quindi dà vero.';
      else why = 'Nessuna frase semplice è vera: «e» e «oppure» danno falso, ma «non piove» è vera.';
      readout.replaceChildren(h('strong', null, 'Oggi ' + a + ' e ' + b + '. '), why);
    };
    const tA = ui.toggle({ label: 'A · piove', value: st.A, ariaLabel: 'A: piove', onChange: (v) => { st.A = v; update(); } });
    const tB = ui.toggle({ label: 'B · fa freddo', value: st.B, ariaLabel: 'B: fa freddo', onChange: (v) => { st.B = v; update(); } });
    update();
    return ui.lab({
      title: 'Frasi vere e frasi false',
      intro: 'Cambia il tempo con i due interruttori e guarda come cambiano le tre frasi composte. 1 vuol dire vero, 0 falso.',
      controls: [tA, tB],
      stage: h('div', { class: 'b1-rows' }, cards.map((c) => c.card)),
      readout,
      caption: 'Boole scriveva «e» come una moltiplicazione e «oppure» come un\'addizione: 1 · 0 = 0 e 1 + 0 = 1. Per l\'OR vale una regola in più: 1 + 1 fa ancora 1.',
    });
  }

  /* ---------- laboratorio: leggi di De Morgan ---------- */

  function labDeMorgan() {
    const st = { A: 0, B: 1, law: 1 };
    const W = 600;
    const art = PL.svg('0 0 ' + W + ' 214', { role: 'img', 'aria-label': 'Due circuiti che calcolano i due lati della legge di De Morgan' });
    const layer = s('g');
    art.append(layer);
    let parts = null;

    function build() {
      layer.replaceChildren();
      const first = st.law === 1;
      // lato sinistro: A, B → AND (o OR) → NOT
      const g1 = draw.gate(first ? 'AND' : 'OR', { x: 92, y: 62, w: 64 });
      const n1 = draw.gate('NOT', { x: 192, y: g1.output.y - 18, w: 52 });
      // lato destro: NOT A, NOT B → OR (o AND)
      const na = draw.gate('NOT', { x: 400, y: 26, w: 44 });
      const nb = draw.gate('NOT', { x: 400, y: 122, w: 44 });
      const g2 = draw.gate(first ? 'OR' : 'AND', { x: 494, y: 62, w: 64 });
      const w = {
        a1: draw.wire([[42, 40], [70, 40], [70, g1.inputs[0].y], [g1.inputs[0].x, g1.inputs[0].y]]),
        b1: draw.wire([[42, 150], [70, 150], [70, g1.inputs[1].y], [g1.inputs[1].x, g1.inputs[1].y]]),
        m1: draw.wire([[g1.output.x, g1.output.y], [n1.inputs[0].x, n1.inputs[0].y]]),
        q1: draw.wire([[n1.output.x, n1.output.y], [272, n1.output.y]]),
        a2: draw.wire([[356, na.inputs[0].y], [na.inputs[0].x, na.inputs[0].y]]),
        b2: draw.wire([[356, nb.inputs[0].y], [nb.inputs[0].x, nb.inputs[0].y]]),
        ma: draw.wire([[na.output.x, na.output.y], [470, na.output.y], [470, g2.inputs[0].y], [g2.inputs[0].x, g2.inputs[0].y]]),
        mb: draw.wire([[nb.output.x, nb.output.y], [470, nb.output.y], [470, g2.inputs[1].y], [g2.inputs[1].x, g2.inputs[1].y]]),
        q2: draw.wire([[g2.output.x, g2.output.y], [W - 24, g2.output.y]]),
      };
      Object.values(w).forEach((p) => draw.setWire(p, 0, { animate: false }));
      layer.append(...Object.values(w), g1.g, n1.g, na.g, nb.g, g2.g);
      const lab = (x, y, t) => layer.append(draw.label(x, y, t, 'pl-t-mono b2-pin'));
      lab(28, 45, 'A');
      lab(28, 155, 'B');
      lab(342, na.inputs[0].y + 5, 'A');
      lab(342, nb.inputs[0].y + 5, 'B');
      const ledL = draw.led(288, n1.output.y, { r: 10 });
      const ledR = draw.led(W - 12, g2.output.y, { r: 10 });
      layer.append(ledL.g, ledR.g);
      layer.append(s('text', { class: 'b2-side', x: 160, y: 200, 'text-anchor': 'middle' }, first ? 'NOT (A AND B)' : 'NOT (A OR B)'));
      layer.append(s('text', { class: 'b2-side', x: 470, y: 200, 'text-anchor': 'middle' }, first ? '(NOT A) OR (NOT B)' : '(NOT A) AND (NOT B)'));
      const eq = s('text', { class: 'b2-eq', x: 318, y: g1.output.y + 14, 'text-anchor': 'middle' }, '=');
      layer.append(eq);
      parts = { g1, n1, na, nb, g2, w, ledL, ledR, eq };
    }

    const table = h('div', { class: 'b2-table' });
    let tt = null;
    const buildTable = () => {
      const first = st.law === 1;
      const rows = Logic.combos(2).map(([a, b]) => {
        const left = first ? 1 - (a & b) : 1 - (a | b);
        const right = first ? ((1 - a) | (1 - b)) : ((1 - a) & (1 - b));
        return [a, b, left, right];
      });
      tt = ui.truthTable({
        inputs: ['A', 'B'],
        outputs: [first ? 'NOT(A·B)' : 'NOT(A+B)', first ? '¬A + ¬B' : '¬A · ¬B'],
        rows,
        onPick: (i, r) => { tA.set(r[0], true); tB.set(r[1], true); st.A = r[0]; st.B = r[1]; update(); },
      });
      table.replaceChildren(tt.el);
    };

    const readout = h('p');
    function update() {
      const first = st.law === 1;
      const { A, B } = st;
      const p = parts;
      const inner = first ? A & B : A | B;
      const left = 1 - inner;
      const nA = 1 - A;
      const nB = 1 - B;
      const right = first ? nA | nB : nA & nB;
      draw.setWire(p.w.a1, A); draw.setWire(p.w.b1, B);
      draw.setWire(p.w.m1, inner); draw.setWire(p.w.q1, left);
      draw.setWire(p.w.a2, A); draw.setWire(p.w.b2, B);
      draw.setWire(p.w.ma, nA); draw.setWire(p.w.mb, nB); draw.setWire(p.w.q2, right);
      p.g1.set(inner); p.n1.set(left); p.na.set(nA); p.nb.set(nB); p.g2.set(right);
      p.ledL.set(left); p.ledR.set(right);
      p.eq.classList.toggle('is-ok', left === right);
      tt.highlight(A * 2 + B);
      readout.replaceChildren(
        h('strong', null, 'A = ' + A + ', B = ' + B + ': '),
        'a sinistra esce ' + left + ', a destra esce ' + right + '. ',
        left === right ? 'I due circuiti sono diversi ma danno sempre lo stesso risultato.' : '');
    }

    const tA = ui.toggle({ label: 'A', value: st.A, onChange: (v) => { st.A = v; update(); } });
    const tB = ui.toggle({ label: 'B', value: st.B, onChange: (v) => { st.B = v; update(); } });
    const law = ui.segmented({
      label: 'Legge di De Morgan',
      options: [{ value: 1, label: 'Prima legge' }, { value: 2, label: 'Seconda legge' }],
      value: 1,
      onChange: (v) => { st.law = v; build(); buildTable(); update(); },
    });
    let tour = 0;
    const tourBtn = ui.btn({
      label: 'Prova tutte le combinazioni', kind: 'lab',
      onClick: () => {
        clearTimeout(tour);
        let i = 0;
        const step = () => {
          const [a, b] = Logic.combos(2)[i];
          tA.set(a, true); tB.set(b, true); st.A = a; st.B = b; update();
          i += 1;
          if (i < 4) tour = setTimeout(step, PL.reduced() ? 400 : 1100);
        };
        step();
      },
    });
    PL.onCleanup(() => clearTimeout(tour));
    build();
    buildTable();
    update();
    return ui.lab({
      title: 'Due circuiti, un solo risultato',
      intro: 'A sinistra la negazione di un\'operazione, a destra le negazioni combinate con l\'operazione opposta. Prova ogni combinazione: le due spie si accendono sempre insieme.',
      controls: [tA, tB, law.el, tourBtn],
      stage: h('div', { class: 'pl-lab-grid b2-grid' }, art, table),
      readout,
      caption: 'Prima legge: NOT (A AND B) = (NOT A) OR (NOT B). Seconda legge: NOT (A OR B) = (NOT A) AND (NOT B). Clicca una riga della tabella per provarla.',
    });
  }

  /* ---------- laboratorio: il circuito di Shannon ---------- */

  // Nodi comuni: pila a sinistra, lampadina a destra, ritorno in basso.
  const BASE = {
    P: [70, 165], N: [70, 175], TL: [70, 70], TR: [560, 70], LT: [560, 152], LB: [560, 188],
  };

  const PRESETS = {
    serie: {
      label: 'In serie', gate: 'AND', expr: 'A · B', inputs: ['A', 'B'],
      text: 'Due interruttori uno dopo l\'altro: la corrente passa solo se sono chiusi <strong>entrambi</strong>. È l\'operazione AND.',
      nodes: { a1: [190, 70], a2: [234, 70], b1: [340, 70], b2: [384, 70] },
      wires: [['TL', 'a1'], ['a2', 'b1'], ['b2', 'TR', 'LT']],
      switches: [{ id: 'A', a: 'a1', b: 'a2' }, { id: 'B', a: 'b1', b: 'b2' }],
    },
    parallelo: {
      label: 'In parallelo', gate: 'OR', expr: 'A + B', inputs: ['A', 'B'],
      text: 'Due strade affiancate: alla corrente basta che sia chiuso <strong>almeno uno</strong> dei due interruttori. È l\'operazione OR.',
      nodes: { L: [200, 70], R: [440, 70], u0: [200, 40], u1: [296, 40], u2: [340, 40], u3: [440, 40], d0: [200, 110], d1: [296, 110], d2: [340, 110], d3: [440, 110] },
      wires: [['TL', 'L'], ['L', 'u0', 'u1'], ['u2', 'u3', 'R'], ['L', 'd0', 'd1'], ['d2', 'd3', 'R'], ['R', 'TR', 'LT']],
      switches: [{ id: 'A', a: 'u1', b: 'u2' }, { id: 'B', a: 'd1', b: 'd2' }],
    },
    misto: {
      label: 'Misto', gate: null, expr: 'A · (B + C)', inputs: ['A', 'B', 'C'],
      text: 'A in serie con il parallelo di B e C: si accende se A è chiuso <strong>e</strong> almeno uno tra B e C è chiuso. Ogni rete di interruttori ha la sua formula.',
      nodes: { a1: [140, 70], a2: [184, 70], L: [250, 70], R: [470, 70], u0: [250, 40], u1: [330, 40], u2: [374, 40], u3: [470, 40], d0: [250, 110], d1: [330, 110], d2: [374, 110], d3: [470, 110] },
      wires: [['TL', 'a1'], ['a2', 'L'], ['L', 'u0', 'u1'], ['u2', 'u3', 'R'], ['L', 'd0', 'd1'], ['d2', 'd3', 'R'], ['R', 'TR', 'LT']],
      switches: [{ id: 'A', a: 'a1', b: 'a2' }, { id: 'B', a: 'u1', b: 'u2' }, { id: 'C', a: 'd1', b: 'd2' }],
    },
    deviatore: {
      label: 'Deviatore', gate: 'XOR', expr: 'A ⊕ B', inputs: ['A', 'B'],
      text: 'L\'impianto delle scale: due deviatori collegati con due fili incrociati. Cambiare <strong>uno qualunque</strong> dei due interruttori cambia lo stato della luce. È l\'operazione XOR.',
      nodes: { c1: [200, 70], up1: [246, 48], dn1: [246, 92], up2: [384, 48], dn2: [384, 92], c2: [430, 70], t1: [276, 48], t2: [354, 92], t3: [276, 92], t4: [354, 48] },
      wires: [['TL', 'c1'], ['up1', 't1', 't2', 'dn2'], ['dn1', 't3', 't4', 'up2'], ['c2', 'TR', 'LT']],
      spdt: [{ id: 'A', common: 'c1', up: 'up1', down: 'dn1' }, { id: 'B', common: 'c2', up: 'up2', down: 'dn2' }],
    },
  };

  /** Grafo del circuito: lati che conducono e, per ognuno, se è percorso dalla corrente e in che verso. */
  function solveCircuit(edges, sw) {
    const conducts = (e) => (e.kind === 'switch' ? e.closed(sw) : true);
    const reach = (start, skip) => {
      const seen = new Set([start]);
      const stack = [start];
      while (stack.length) {
        const n = stack.pop();
        for (const e of edges) {
          if (e === skip || !conducts(e)) continue;
          const other = e.a === n ? e.b : e.b === n ? e.a : null;
          if (other && !seen.has(other)) { seen.add(other); stack.push(other); }
        }
      }
      return seen;
    };
    const out = new Map();
    for (const e of edges) {
      let dir = 0;
      if (conducts(e)) {
        const fromP = reach('P', e);
        const fromN = reach('N', e);
        if (fromP.has(e.a) && fromN.has(e.b)) dir = 1;
        else if (fromP.has(e.b) && fromN.has(e.a)) dir = -1;
      }
      out.set(e, dir);
    }
    return out;
  }

  function spdtDraw(p, contacts, label) {
    const g = s('g', { class: 'pl-switch b3-spdt' });
    const arm = s('line', { class: 'pl-switch-arm', x1: p[0], y1: p[1], x2: p[0], y2: p[1] });
    g.append(arm,
      s('circle', { class: 'pl-switch-pin', cx: p[0], cy: p[1], r: 3.6 }),
      s('circle', { class: 'pl-switch-pin', cx: contacts.up[0], cy: contacts.up[1], r: 3.6 }),
      s('circle', { class: 'pl-switch-pin', cx: contacts.down[0], cy: contacts.down[1], r: 3.6 }),
      draw.label(p[0], p[1] - 24, label, 'pl-t-switch'));
    let cur = null;
    let tw = null;
    const len = Math.hypot(contacts.up[0] - p[0], contacts.up[1] - p[1]) - 2;
    const angleTo = (c) => Math.atan2(c[1] - p[1], c[0] - p[0]);
    const apply = (a) => { arm.setAttribute('x2', p[0] + Math.cos(a) * len); arm.setAttribute('y2', p[1] + Math.sin(a) * len); };
    return {
      g,
      set(up) {
        const target = angleTo(up ? contacts.up : contacts.down);
        if (tw) tw.cancel();
        if (cur == null) { cur = target; apply(cur); g.classList.add('is-closed'); return; }
        const from = cur;
        tw = PL.tween({ from, to: target, duration: 180, ease: PL.motion.ease.out, onUpdate: (v) => { cur = v; apply(v); } });
      },
    };
  }

  function labShannon() {
    const st = { preset: 'serie', A: 0, B: 0, C: 0 };
    const art = PL.svg('28 14 590 278', { role: 'img', class: 'pl-svg b3-art' });
    const layer = s('g');
    art.append(layer);
    const toggles = {};
    const toggleBox = h('div', { class: 'b3-toggles' });
    const exprEl = h('p', { class: 'pl-expr' });
    const statusEl = h('p', { class: 'b3-status' });
    const tableBox = h('div');
    const desc = h('p', { class: 'b3-desc' });
    let built = null;

    function buildPreset() {
      const pr = PRESETS[st.preset];
      const nodes = Object.assign({}, BASE, pr.nodes);
      const pt = (n) => nodes[n];
      layer.replaceChildren();
      const edges = [];
      const wireEls = [];
      const addWire = (names) => {
        const p = draw.wire(names.map(pt));
        layer.append(p);
        const e = { kind: 'wire', a: names[0], b: names[names.length - 1], el: p };
        edges.push(e);
        wireEls.push(e);
        return e;
      };
      // ritorno e collegamenti fissi
      addWire(['P', 'TL']);
      pr.wires.forEach(addWire);
      const ret = draw.wire([BASE.LB, [560, 270], [70, 270], BASE.N]);
      layer.append(ret);
      const retEdge = { kind: 'wire', a: 'LB', b: 'N', el: ret };
      edges.push(retEdge);
      wireEls.push(retEdge);
      const lampEdge = { kind: 'lamp', a: 'LT', b: 'LB' };
      edges.push(lampEdge);
      // interruttori
      const swDraw = {};
      (pr.switches || []).forEach((sw) => {
        const a = pt(sw.a);
        const b = pt(sw.b);
        const d = draw.switch(a[0], a[1], { len: b[0] - a[0], label: sw.id });
        layer.append(d.g);
        swDraw[sw.id] = d;
        edges.push({ kind: 'switch', a: sw.a, b: sw.b, sw: sw.id, draw: d, closed: (v) => v[sw.id] === 1 });
      });
      (pr.spdt || []).forEach((sw) => {
        const d = spdtDraw(pt(sw.common), { up: pt(sw.up), down: pt(sw.down) }, sw.id);
        layer.append(d.g);
        swDraw[sw.id] = d;
        edges.push({ kind: 'switch', a: sw.common, b: sw.up, sw: sw.id, draw: d, closed: (v) => v[sw.id] === 1 });
        edges.push({ kind: 'switch', a: sw.common, b: sw.down, sw: sw.id, draw: d, closed: (v) => v[sw.id] === 0 });
      });
      // pila e lampadina
      const bat = draw.battery(70, 170, { label: 'pila' });
      const lamp = draw.lamp(560, 170, { r: 18 });
      layer.append(bat.g, lamp.g);
      // la corrente che scorre
      const flows = wireEls.map((e) => ({ e, f: draw.flow(e.el) }));
      // clic sugli interruttori del disegno
      Object.keys(swDraw).forEach((id) => {
        const g = swDraw[id].g;
        g.classList.add('b3-clickable');
        g.addEventListener('click', () => toggles[id].click());
      });
      built = { pr, edges, lampEdge, lamp, flows, swDraw };
      // interruttori di comando
      toggleBox.replaceChildren();
      pr.inputs.forEach((id) => {
        toggles[id] = ui.toggle({ label: id, value: st[id], ariaLabel: 'Interruttore ' + id + ' (1 = ' + (pr.spdt ? 'in alto' : 'chiuso') + ')', onChange: (v) => { st[id] = v; update(); } });
        toggleBox.append(toggles[id]);
      });
      // tabella di verità ricavata risolvendo il circuito per ogni combinazione
      const rows = Logic.combos(pr.inputs.length).map((c) => {
        const v = {};
        pr.inputs.forEach((id, i) => { v[id] = c[i]; });
        return c.concat([solveCircuit(edges, v).get(lampEdge) !== 0 ? 1 : 0]);
      });
      built.tt = ui.truthTable({
        inputs: pr.inputs, outputs: ['Luce'], rows,
        onPick: (i, r) => { pr.inputs.forEach((id, k) => { st[id] = r[k]; toggles[id].set(r[k], true); }); update(); },
      });
      tableBox.replaceChildren(built.tt.el);
      desc.replaceChildren(PL.rich(pr.text));
      art.setAttribute('aria-label', 'Circuito ' + pr.label.toLowerCase() + ': pila, interruttori ' + pr.inputs.join(', ') + ' e lampadina');
      // stato iniziale senza animazioni
      Object.keys(swDraw).forEach((id) => {
        if (pr.spdt) swDraw[id].set(st[id] === 1);
        else swDraw[id].set(st[id] === 1, false);
      });
      update(true);
    }

    function update(silent) {
      const { pr, edges, lampEdge, lamp, flows, swDraw, tt } = built;
      const v = { A: st.A, B: st.B, C: st.C };
      const res = solveCircuit(edges, v);
      const on = res.get(lampEdge) !== 0;
      lamp.set(on);
      flows.forEach(({ e, f }) => {
        const dir = res.get(e);
        f.set(dir !== 0).reverse(dir < 0);
        draw.setWire(e.el, dir !== 0 ? 1 : 0, { animate: !silent });
      });
      Object.keys(swDraw).forEach((id) => {
        if (!silent) {
          if (pr.spdt) swDraw[id].set(st[id] === 1);
          else swDraw[id].set(st[id] === 1);
        }
        const live = edges.some((e) => e.sw === id && res.get(e) !== 0);
        swDraw[id].g.classList.toggle('is-live', live);
      });
      const idx = pr.inputs.reduce((acc, id) => acc * 2 + st[id], 0);
      tt.highlight(idx);
      let expr = pr.expr;
      pr.inputs.forEach((id) => { expr = expr.replace(id, String(st[id])); });
      exprEl.replaceChildren(h('span', null, pr.expr + ' = '), h('span', { class: 'pl-hl-2' }, expr), ' = ', h('span', { class: on ? 'pl-hl-1' : '' }, on ? '1' : '0'));
      statusEl.replaceChildren(h('strong', null, on ? 'Lampada accesa.' : 'Lampada spenta.'), ' ', pr.gate ? 'Il circuito calcola ' + pr.gate + '.' : 'Il circuito calcola la formula qui sopra.');
    }

    const picker = ui.segmented({
      label: 'Tipo di circuito',
      options: Object.keys(PRESETS).map((k) => ({ value: k, label: PRESETS[k].label })),
      value: st.preset,
      onChange: (v) => { st.preset = v; st.A = 0; st.B = 0; st.C = 0; buildPreset(); },
    });
    buildPreset();
    return ui.lab({
      title: 'Il circuito di Shannon',
      intro: 'Scegli come sono collegati gli interruttori, poi aprili e chiudili (con i pulsanti o cliccando sul disegno). I puntini mostrano il percorso della corrente.',
      controls: [picker.el, toggleBox],
      stage: h('div', { class: 'pl-lab-grid b3-grid' }, art, h('div', { class: 'pl-lab-panel' }, h('h4', null, 'Formula'), exprEl, statusEl, tableBox)),
      readout: desc,
      caption: 'Shannon, 1937: interruttori in serie = AND (·), in parallelo = OR (+). Ogni rete di contatti si può scrivere come una formula di Boole, e ogni formula si può costruire con dei contatti.',
      wide: true,
    });
  }

  /* ---------- laboratorio: rumore e soglia ---------- */

  function labNoise() {
    const W = 640;
    const SYM = 40;
    const VISIBLE = Math.ceil(W / SYM) + 2;
    const st = { levels: 2, noise: 0.6, offset: 0, symbols: [], received: 0, errors: 0 };
    const art = PL.svg('0 0 ' + W + ' 250', { role: 'img', 'aria-label': 'Segnale disturbato e simboli ricostruiti dal ricevitore' });
    const yOf = (v) => 128 - (v / 5) * 100;
    const gridG = s('g', { class: 'b4-grid' });
    const trace = s('polyline', { class: 'b4-trace' });
    const marks = s('g');
    const decoded = s('g');
    art.append(
      draw.label(8, 18, 'segnale ricevuto (volt)', 'pl-t-small', 'start'),
      gridG, trace, marks,
      draw.label(8, 168, 'simboli ricostruiti', 'pl-t-small', 'start'),
      decoded);
    const counter = h('p', { class: 'b4-counter pl-mono' });
    const explain = h('p');

    const voltOf = (sym) => (st.levels === 2 ? sym * 5 : (sym * 5) / 9);
    const decode = (v) => {
      if (st.levels === 2) return v >= 2.5 ? 1 : 0;
      return Math.max(0, Math.min(9, Math.round((v * 9) / 5)));
    };
    const newSymbol = () => {
      const sym = Math.floor(Math.random() * st.levels);
      const samples = [];
      for (let i = 0; i <= 8; i++) samples.push(voltOf(sym) + (Math.random() * 2 - 1) * st.noise);
      const got = decode(samples[4]);
      st.received += 1;
      if (got !== sym) st.errors += 1;
      return { sym, samples, got };
    };
    const drawGrid = () => {
      gridG.replaceChildren(s('line', { class: 'b4-axis', x1: 0, y1: yOf(0), x2: W, y2: yOf(0) }));
      if (st.levels === 2) {
        gridG.append(s('line', { class: 'b4-thr', x1: 0, y1: yOf(2.5), x2: W, y2: yOf(2.5) }), draw.label(W - 6, yOf(2.5) - 6, 'soglia 2,5 V', 'pl-t-small', 'end'));
        gridG.append(draw.label(W - 6, yOf(5) + 12, '5 V = 1', 'pl-t-small', 'end'), draw.label(W - 6, yOf(0) - 6, '0 V = 0', 'pl-t-small', 'end'));
      } else {
        for (let k = 0; k < 9; k++) gridG.append(s('line', { class: 'b4-thr is-thin', x1: 0, y1: yOf(((k + 0.5) * 5) / 9), x2: W, y2: yOf(((k + 0.5) * 5) / 9) }));
        gridG.append(draw.label(W - 6, yOf(5) + 12, '10 livelli: 0,56 V l\'uno dall\'altro', 'pl-t-small', 'end'));
      }
    };
    const reset = () => {
      st.symbols = [];
      st.received = 0;
      st.errors = 0;
      for (let i = 0; i < VISIBLE; i++) st.symbols.push(newSymbol());
      st.received = 0;
      st.errors = 0;
      st.offset = 0;
      drawGrid();
      render();
    };
    const render = () => {
      const pts = [];
      marks.replaceChildren();
      decoded.replaceChildren();
      st.symbols.forEach((sy, i) => {
        const x0 = i * SYM - st.offset;
        sy.samples.forEach((v, k) => { if (k < 8 || i === st.symbols.length - 1) pts.push((x0 + (k * SYM) / 8).toFixed(1) + ',' + yOf(Math.max(-0.6, Math.min(5.6, v))).toFixed(1)); });
        const cx = x0 + SYM / 2;
        if (cx < -SYM || cx > W + SYM) return;
        marks.append(s('circle', { class: 'b4-sample', cx, cy: yOf(sy.samples[4]), r: 3 }));
        const ok = sy.got === sy.sym;
        decoded.append(
          s('rect', { class: 'b4-box' + (ok ? '' : ' is-err'), x: x0 + 3, y: 180, width: SYM - 6, height: 30, rx: 5 }),
          s('text', { class: 'b4-sym' + (ok ? '' : ' is-err'), x: cx, y: 200, 'text-anchor': 'middle' }, String(sy.got)));
        if (!ok) decoded.append(s('text', { class: 'b4-was', x: cx, y: 232, 'text-anchor': 'middle' }, 'era ' + sy.sym));
      });
      trace.setAttribute('points', pts.join(' '));
      const pct = st.received ? (100 * st.errors) / st.received : 0;
      counter.textContent = 'Simboli ricevuti: ' + PL.fmt(st.received) + ' · errori: ' + PL.fmt(st.errors) + ' (' + PL.fmt(pct, 1) + '%)';
      const half = st.levels === 2 ? 2.5 : 5 / 18;
      explain.replaceChildren(st.noise < half
        ? (st.levels === 2 ? 'Con due soli livelli il disturbo dovrebbe superare 2,5 V per scambiare un 1 con uno 0: il ricevitore legge tutto giusto.' : 'Disturbo sotto 0,28 V: anche dieci livelli si distinguono, ma il margine è sottilissimo.')
        : (st.levels === 2 ? 'Il disturbo ora supera metà della distanza tra 0 e 5 V: anche il binario comincia a sbagliare.' : 'Con dieci livelli vicini basta un disturbo di 0,28 V per confondere un valore con il vicino: gli errori fioccano.'));
    };
    const loop = PL.loop((dt) => {
      st.offset += dt * 46;
      while (st.offset >= SYM) {
        st.offset -= SYM;
        st.symbols.shift();
        st.symbols.push(newSymbol());
      }
      render();
    }, { el: art, autostart: !PL.reduced() });
    const levels = ui.segmented({
      label: 'Quanti livelli di tensione',
      options: [{ value: 2, label: '2 livelli (binario)' }, { value: 10, label: '10 livelli' }],
      value: 2,
      onChange: (v) => { st.levels = v; reset(); },
    });
    const noise = ui.slider({ label: 'Disturbo', min: 0, max: 3, step: 0.1, value: st.noise, format: (v) => '± ' + PL.fmt(v, 1) + ' V', onInput: (v) => { st.noise = v; reset(); } });
    const play = ui.btn({ label: PL.reduced() ? '▶︎ Scorri' : '❚❚ Pausa', kind: 'lab', onClick: () => { loop.toggle(); play.lastChild.textContent = loop.running ? '❚❚ Pausa' : '▶︎ Scorri'; } });
    reset();
    return ui.lab({
      title: 'Perché proprio due valori',
      intro: 'Un filo trasporta una tensione, e lungo la strada si sporca di disturbi. Il ricevitore misura la tensione al centro di ogni simbolo e decide quale valore era stato spedito.',
      controls: [levels.el, noise.el, play],
      stage: art,
      readout: [counter, explain],
      caption: 'Più livelli ci sono, più sono vicini tra loro e più è facile confonderli. Con due soli valori basta una soglia: è il motivo per cui i circuiti digitali sono così affidabili.',
    });
  }

  /* ---------- figure ---------- */

  function figBooleLaw() {
    const cases = [['x = 0', '0 · 0 = 0', true], ['x = 1', '1 · 1 = 1', true], ['x = 2', '2 · 2 = 4', false], ['x = 3', '3 · 3 = 9', false]];
    const art = h('div', { class: 'b0-law', role: 'img', 'aria-label': 'La legge x per x uguale x vale solo per 0 e per 1' },
      h('p', { class: 'b0-eq', 'aria-hidden': 'true' }, 'x · x = x'),
      h('p', { class: 'b0-note' }, '«dire due volte una cosa equivale a dirla una volta»'),
      h('div', { class: 'b0-cases' }, cases.map(([a, b, ok]) => h('div', { class: 'b0-case' + (ok ? ' is-ok' : ' is-ko') },
        h('span', { class: 'b0-case-a' }, a),
        h('span', { class: 'b0-case-b' }, b, h('b', { 'aria-hidden': 'true' }, ok ? ' ✓' : ' ✗'))))));
    return ui.figure({
      art,
      caption: 'Nel 1854 Boole osservò che nella sua algebra della logica vale sempre x · x = x. Tra tutti i numeri, solo 0 e 1 rispettano questa legge: per questo la logica di Boole lavora con due valori soli, falso (0) e vero (1).',
    });
  }

  /* ---------- capitolo ---------- */

  PL.chapter({
    id: 'boole',
    num: 1,
    title: 'La logica prima dei circuiti',
    short: 'Logica',
    era: '1847 – 1938',
    minutes: 14,
    labs: 4,
    kicker: 'Vero e falso diventano 1 e 0: un insegnante autodidatta trasforma il ragionamento in algebra, e novant\'anni dopo uno studente scopre che gli interruttori sanno fare quei calcoli.',
    summary: 'Boole trasforma il ragionamento in algebra e Shannon scopre che gli interruttori sanno fare quei calcoli.',
    timeline: [
      { year: 1847, title: 'Boole pubblica «The Mathematical Analysis of Logic»', text: 'Per la prima volta il ragionamento logico viene scritto come un\'algebra.', key: true },
      { year: 1847, title: 'De Morgan pubblica «Formal Logic»', text: 'Lo stesso anno Augustus De Morgan studia le regole per negare le frasi composte.' },
      { year: 1854, title: '«An Investigation of the Laws of Thought»', text: 'Il libro più famoso di Boole: la logica ridotta a due valori, 0 e 1.' },
      { year: 1880, title: 'Peirce: basta una sola operazione', text: 'Charles S. Peirce scopre che con la sola negazione di «oppure» (NOR) si può scrivere ogni formula. Non lo pubblica.' },
      { year: 1886, title: 'Peirce immagina la logica elettrica', text: 'In una lettera suggerisce di costruire le macchine logiche con circuiti elettrici.' },
      { year: 1913, title: 'Il tratto di Sheffer', text: 'Henry M. Sheffer dimostra che un solo operatore basta per tutta l\'algebra di Boole.' },
      { year: 1937, title: 'La tesi di Claude Shannon', text: 'Al MIT Shannon dimostra che i circuiti a relè e interruttori calcolano l\'algebra di Boole.', key: true },
      { year: 1938, title: 'La tesi diventa un articolo', text: '«A Symbolic Analysis of Relay and Switching Circuits» esce nelle Transactions dell\'AIEE.' },
    ],
    glossary: [
      { term: 'Algebra di Boole', def: 'Algebra con due soli valori, 0 (falso) e 1 (vero), e tre operazioni di base: AND, OR e NOT.' },
      { term: 'Valore di verità', def: 'Il valore di una frase o di un segnale logico: vero (1) oppure falso (0).' },
      { term: 'Tabella di verità', def: 'Elenco di tutte le combinazioni degli ingressi con il risultato corrispondente.' },
      { term: 'AND', def: 'Operazione «e»: il risultato è 1 solo se tutti gli ingressi sono 1. Boole la scriveva come una moltiplicazione (A · B).' },
      { term: 'OR', def: 'Operazione «oppure»: il risultato è 1 se almeno un ingresso è 1. Si scrive A + B.' },
      { term: 'NOT', def: 'Negazione: trasforma 1 in 0 e 0 in 1. Si scrive con una barra sopra la lettera.' },
      { term: 'Leggi di De Morgan', def: 'NOT (A AND B) = (NOT A) OR (NOT B) e NOT (A OR B) = (NOT A) AND (NOT B).' },
      { term: 'Circuito di commutazione', def: 'Rete di interruttori o relè; Shannon mostrò che si descrive con l\'algebra di Boole.' },
      { term: 'Deviatore', def: 'Interruttore a due vie usato per comandare una luce da due punti: due deviatori realizzano la funzione XOR.' },
      { term: 'Segnale digitale', def: 'Segnale che può assumere solo pochi valori distinti (di solito due); un piccolo disturbo non ne cambia il significato.' },
      { term: 'Soglia', def: 'Tensione di confine: sopra la soglia il ricevitore legge 1, sotto legge 0.' },
    ],
    render(root) {
      root.append(
        ui.section({ id: 'algebra', title: 'Un\'algebra per il pensiero', kicker: '1847 · Inghilterra' },
          ui.prose(
            'Nel 1847 un insegnante di provincia, figlio di un calzolaio di Lincoln, pubblica un libretto dal titolo ambizioso: <em>The Mathematical Analysis of Logic</em>. Si chiama George Boole, ha studiato quasi tutto da solo e propone un\'idea che sembra un gioco: scrivere i ragionamenti come si scrivono le equazioni.',
            'Per Boole ogni frase può essere solo vera o falsa. Le frasi si combinano con poche parole: «e», «oppure», «non». E queste parole si comportano come operazioni: «e» assomiglia alla moltiplicazione, «oppure» all\'addizione. Nel 1854, con <em>An Investigation of the Laws of Thought</em>, Boole arriva al punto: alla logica bastano due valori, che oggi scriviamo [[Valore di verità|1 e 0]].'),
          ui.quote({
            text: 'Lo scopo del trattato che segue è studiare le leggi fondamentali di quelle operazioni della mente con cui si compie il ragionamento.',
            original: 'The design of the following treatise is to investigate the fundamental laws of those operations of the mind by which reasoning is performed.',
            author: 'George Boole', source: 'An Investigation of the Laws of Thought', year: 1854,
          }),
          figBooleLaw(),
          ui.person({
            name: 'George Boole', years: '1815 – 1864', role: 'matematico e logico',
            body: [
              'Nato a Lincoln, in Inghilterra, impara da solo il latino, il greco e la matematica e a sedici anni insegna già per mantenere la famiglia. Senza una laurea diventa nel 1849 il primo professore di matematica del Queen\'s College di Cork, in Irlanda.',
              'Ai suoi tempi la sua algebra sembra una curiosità per filosofi. Ottant\'anni dopo diventerà la lingua di tutti i circuiti digitali.',
            ],
          })),

        ui.section({ id: 'operazioni', title: 'Vero, falso e tre operazioni', lead: 'Tutta la logica di un computer si costruisce con tre operazioni: AND, OR e NOT.' },
          ui.prose(
            'Prendiamo due frasi semplici: A = «piove» e B = «fa freddo». Ognuna è vera (1) o falsa (0). Con le tre operazioni di Boole se ne costruiscono di nuove: [[AND|«piove e fa freddo»]] è vera solo se lo sono entrambe; [[OR|«piove oppure fa freddo»]] è vera se ne basta una; [[NOT|«non piove»]] capovolge il valore.',
            'Tutte le combinazioni possibili si scrivono in una [[Tabella di verità|tabella di verità]]: con due frasi le combinazioni sono quattro, con tre sono otto, con dieci sono 1.024. Ogni ingresso in più raddoppia le righe.'),
          labSentences(),
          ui.callout({
            kind: 'fun',
            title: 'La logica in centrale termica',
            body: 'Anche gli impianti ragionano così. Una caldaia parte se il termostato chiede calore <strong>e</strong> il pressostato dà il consenso <strong>e non</strong> è scattato il blocco di sicurezza: tre condizioni, una formula di Boole.',
          })),

        ui.section({ id: 'de-morgan', title: 'Le leggi di De Morgan', kicker: '1847 · Londra' },
          ui.prose(
            'Lo stesso anno del libretto di Boole, il suo amico Augustus De Morgan, professore all\'University College di Londra, pubblica <em>Formal Logic</em>. Tra le sue regole ce n\'è una che usano ancora oggi tutti i progettisti di chip: come si nega una frase composta.',
            'Dire «non è vero che piove e fa freddo» equivale a dire «non piove oppure non fa freddo». Negare un AND dà un OR di negazioni, e negare un OR dà un AND di negazioni. Sono le [[Leggi di De Morgan|leggi di De Morgan]]: permettono di trasformare un circuito in un altro equivalente, magari più semplice o più economico da costruire.'),
          labDeMorgan(),
          ui.person({
            name: 'Augustus De Morgan', years: '1806 – 1871', role: 'matematico',
            body: 'Nato in India, a Madurai, a ventidue anni è il primo professore di matematica della neonata University College di Londra. Corrisponde a lungo con Boole e lo incoraggia a pubblicare.',
          })),

        ui.section({ id: 'una-operazione', title: 'Basta una sola operazione', kicker: '1880 – 1913' },
          ui.prose(
            'Negli Stati Uniti il filosofo Charles Sanders Peirce scopre intorno al 1880 un fatto sorprendente: tutte le operazioni di Boole si possono ottenere da <strong>una sola</strong>, la negazione di «oppure» (oggi la chiamiamo NOR). Peirce non pubblica la scoperta, che resterà nei suoi manoscritti fino al 1933.',
            'Nel 1913 il logico Henry M. Sheffer arriva alla stessa conclusione e la pubblica: un solo operatore basta per tutta l\'algebra di Boole. Il suo simbolo, il «tratto» verticale, oggi indica la negazione di «e»: la porta NAND. Lo ritroveremo nel prossimo capitolo, perché i chip di oggi sono fatti quasi solo di NAND e di NOR.'),
          ui.callout({
            kind: 'fun',
            body: 'In una lettera del 1886 al suo ex allievo Allan Marquand, che aveva costruito una macchina logica meccanica, Peirce suggerisce che lo stesso lavoro si potrebbe fare con circuiti elettrici. Mezzo secolo prima che qualcuno lo facesse davvero.',
          }),
          ui.timeline([
            { year: 1847, title: 'Boole e De Morgan', text: 'La logica diventa algebra.' },
            { year: 1854, title: 'Le leggi del pensiero', text: 'Due valori: 0 e 1.' },
            { year: 1880, title: 'Peirce', text: 'Una sola operazione basta (manoscritto inedito).' },
            { year: 1913, title: 'Sheffer', text: 'Il tratto di Sheffer, oggi porta NAND.' },
            { year: 1937, title: 'Shannon', text: 'L\'algebra di Boole entra nei circuiti.' },
          ], { title: 'Novant\'anni di idee' })),

        ui.section({ id: 'shannon', title: 'Il colpo di genio di Shannon', kicker: '1937 · MIT, Cambridge (Massachusetts)' },
          ui.prose(
            'Nel 1937 Claude Shannon ha ventun anni e lavora al MIT accanto all\'analizzatore differenziale di Vannevar Bush, un enorme calcolatore meccanico comandato da centinaia di relè. Progettare quelle reti di contatti è un lavoro fatto a intuito, per tentativi.',
            'Shannon aveva studiato Boole in un corso di filosofia, e si accorge che le due cose sono la stessa: due interruttori in serie fanno passare la corrente solo se sono chiusi entrambi, cioè fanno un AND; due interruttori in parallelo la fanno passare se ne è chiuso almeno uno, cioè fanno un OR. Ogni [[Circuito di commutazione|rete di interruttori]] è una formula, e ogni formula si può costruire con degli interruttori.'),
          labShannon(),
          ui.quote({
            text: 'Forse la più importante, e anche la più famosa, tesi di laurea del secolo.',
            original: 'Possibly the most important, and also the most famous, master\'s thesis of the century.',
            author: 'Howard Gardner', source: 'The Mind\'s New Science', year: 1985,
          }),
          ui.cols(
            ui.person({
              name: 'Claude Shannon', years: '1916 – 2001', role: 'ingegnere e matematico',
              body: [
                'La sua tesi di master, <em>A Symbolic Analysis of Relay and Switching Circuits</em>, esce come articolo nel 1938 e trasforma il progetto dei circuiti da arte a scienza.',
                'Nel 1948 fonderà anche la teoria dell\'informazione, quella che misura i dati in bit.',
              ],
            }),
            ui.callout({
              kind: 'note',
              title: 'Non era solo',
              body: 'Negli stessi anni l\'ingegnere giapponese Akira Nakashima, alla NEC, e il fisico russo Victor Šestakov arrivarono per conto loro a idee molto simili. Le grandi idee spesso maturano in più posti contemporaneamente.',
            })),
          ui.callout({
            kind: 'fun',
            title: 'Il deviatore di casa è una porta XOR',
            body: 'La luce delle scale che si accende e si spegne da due interruttori diversi è un circuito logico: prova il preset «Deviatore» nel laboratorio. Se i due deviatori sono in posizioni diverse la luce è accesa, se sono uguali è spenta. È l\'operazione XOR che incontreremo tra poco.',
          })),

        ui.section({ id: 'due-valori', title: 'Perché proprio 1 e 0', lead: 'Shannon usa interruttori aperti o chiusi, i computer di oggi tensioni alte o basse: sempre due stati soli. Non è un caso.' },
          ui.prose(
            'Un filo non trasporta numeri ma tensioni, e ogni tensione arriva un po\' sporca: disturbi elettrici, cavi lunghi, interferenze. Se un segnale potesse valere dieci livelli diversi, basterebbe un piccolo disturbo per confondere un 6 con un 7.',
            'Con due soli valori il ricevitore deve solo decidere se la tensione sta sopra o sotto una [[Soglia|soglia]]. Un [[Segnale digitale|segnale digitale]] così resiste a disturbi grandi quasi quanto metà della tensione di lavoro, e si può ripulire e ritrasmettere senza perdere nulla. È per questo che, da Shannon in poi, tutta l\'elettronica del calcolo parla in binario.'),
          labNoise(),
          ui.keyIdea('Boole ha dato alla logica due valori e tre operazioni; Shannon ha mostrato che gli interruttori sanno calcolarle; il binario rende il tutto robusto. Nel prossimo capitolo le tre operazioni diventano oggetti fisici: le porte logiche.'),
          ui.crossLink({ href: '#porte', kicker: 'Capitolo 2', title: 'Le porte logiche', text: 'NOT, AND, OR e le loro sorelle: i mattoni di ogni circuito digitale.' })));
    },
  });
})();
