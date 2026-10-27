/*
 * Test della sezione «Porte logiche e chip» (sections/porte-logiche).
 * Motore logico, coerenza dei capitoli con index.html e section.js, riferimenti al glossario.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const DIR = path.join(__dirname, '..', 'sections', 'porte-logiche');
const Logic = require(path.join(DIR, 'js', 'logic.js'));

/* ---------- motore logico ---------- */

test('le porte hanno le tabelle di verità giuste', () => {
  const expect = {
    NOT: [1, 0], AND: [0, 0, 0, 1], OR: [0, 1, 1, 1], NAND: [1, 1, 1, 0],
    NOR: [1, 0, 0, 0], XOR: [0, 1, 1, 0], XNOR: [1, 0, 0, 1],
  };
  for (const [g, outs] of Object.entries(expect)) {
    assert.deepEqual(Logic.truthTable(g).map((r) => r.out), outs, g);
  }
  assert.equal(Logic.evalGate('XOR', [1, 1, 1]), 1, 'XOR a tre ingressi = parità');
  assert.equal(Logic.evalGate('AND', [1, 1, 0]), 0);
});

test('bit e numeri', () => {
  assert.deepEqual(Logic.toBits(5, 4), [0, 1, 0, 1]);
  assert.equal(Logic.fromBits([1, 0, 1, 1]), 11);
  assert.equal(Logic.combos(3).length, 8);
});

test('le reti di sole NAND realizzano le altre porte', () => {
  const sizes = { NOT: 1, AND: 2, OR: 3, NOR: 4, XOR: 4 };
  for (const [name, net] of Object.entries(Logic.NAND_ONLY)) {
    assert.equal(net.gates.length, sizes[name], name + ': numero di NAND');
    assert.ok(net.gates.every((g) => g.type === 'NAND'));
    for (const c of Logic.combos(net.inputs.length)) {
      const inputs = {};
      net.inputs.forEach((n, i) => { inputs[n] = c[i]; });
      assert.equal(Logic.netOutput(net, inputs), Logic.evalGate(name, c), name + ' ' + c.join(''));
    }
  }
});

test('il sommatore a propagazione del riporto somma tutte le coppie a 4 bit', () => {
  for (let a = 0; a < 16; a++) {
    for (let b = 0; b < 16; b++) {
      const r = Logic.rippleAdd(a, b, 4);
      assert.equal(r.total, a + b);
      assert.equal(r.overflow, a + b > 15);
    }
  }
});

test('la rete del sommatore simulata nel tempo dà lo stesso risultato', () => {
  const net = Logic.rippleNet(4);
  const zero = {};
  for (let i = 0; i < 4; i++) { zero['A' + i] = 0; zero['B' + i] = 0; }
  zero.C0 = 0;
  const base = Logic.settle(net, zero);
  for (const [a, b] of [[15, 1], [7, 9], [5, 10], [12, 12]]) {
    const changes = {};
    for (let i = 0; i < 4; i++) { changes['A' + i] = (a >> i) & 1; changes['B' + i] = (b >> i) & 1; }
    const r = Logic.simulate(net, base, changes);
    assert.ok(r.stable);
    const sum = [0, 1, 2, 3].reduce((acc, i) => acc + (r.state['S' + i] << i), 0) + (r.state.C4 << 4);
    assert.equal(sum, a + b, a + '+' + b);
  }
  // 15 + 1: il riporto attraversa tutti gli stadi, 2 ritardi di porta per stadio
  const changes = { A0: 1, A1: 1, A2: 1, A3: 1, B0: 1 };
  const r = Logic.simulate(net, base, changes);
  const c4 = r.events.find((e) => e.signal === 'C4');
  assert.equal(c4.t, 8);
});

test('latch SR con due NOR: set, reset, memoria e stato vietato', () => {
  const st0 = Logic.settle(Logic.SR_NOR, { S: 0, R: 0 }, { Q: 0, Qn: 1 });
  assert.equal(st0.Q, 0);
  const set = Logic.simulate(Logic.SR_NOR, st0, { S: 1 });
  assert.equal(set.state.Q, 1);
  assert.equal(set.state.Qn, 0);
  const hold = Logic.simulate(Logic.SR_NOR, set.state, { S: 0 });
  assert.equal(hold.state.Q, 1, 'ricorda il bit');
  const reset = Logic.simulate(Logic.SR_NOR, hold.state, { R: 1 });
  assert.equal(reset.state.Q, 0);
  const both = Logic.simulate(Logic.SR_NOR, reset.state, { S: 1, R: 1 });
  assert.equal(both.state.Q, 0);
  assert.equal(both.state.Qn, 0);
  const release = Logic.simulate(Logic.SR_NOR, both.state, { S: 0, R: 0 });
  assert.equal(release.stable, false, 'rilasciare S e R insieme fa oscillare il latch');
  assert.equal(Logic.srLatch(1, 0, 0).mode, 'memoria');
});

test('flip-flop D sul fronte di salita e contatore', () => {
  assert.equal(Logic.dFlipFlop(0, 1, 0, 1), 1);
  assert.equal(Logic.dFlipFlop(0, 1, 1, 1), 0);
  assert.equal(Logic.dFlipFlop(1, 0, 1, 0), 1);
  assert.equal(Logic.dLatch(0, 1, 1), 1);
  assert.equal(Logic.dLatch(0, 1, 0), 0);
  assert.equal(Logic.countStep(15, 4), 0);
});

test('porte CMOS: uscita corretta, mai cortocircuiti né uscite flottanti', () => {
  for (const g of ['NOT', 'NAND', 'NOR']) {
    for (const c of Logic.combos(g === 'NOT' ? 1 : 2)) {
      const r = Logic.cmos(g, c);
      assert.equal(r.out, Logic.evalGate(g, c), g + ' ' + c.join(''));
      assert.equal(r.short, false);
      assert.equal(r.floating, false);
    }
  }
});

/* ---------- capitoli, indice e registrazione nell'enciclopedia ---------- */

const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
const styles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
const chapterFiles = scripts.filter((s) => s.startsWith('js/chapters/'));

function loadSection() {
  const sandbox = { console, setTimeout, clearTimeout };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  for (const src of scripts.filter((s) => s !== 'js/app.js')) {
    vm.runInContext(fs.readFileSync(path.join(DIR, src), 'utf8'), sandbox, { filename: src });
  }
  return sandbox;
}

test('index.html carica file che esistono', () => {
  for (const f of scripts.concat(styles)) {
    assert.ok(fs.existsSync(path.join(DIR, f)), 'manca ' + f);
  }
  assert.equal(chapterFiles.length, 9, 'nove capitoli');
});

test('i capitoli si registrano senza toccare il DOM e hanno tutti i campi', () => {
  const sb = loadSection();
  const chapters = sb.PL.chapters;
  assert.equal(chapters.length, chapterFiles.length);
  assert.deepEqual(chapters.map((c) => c.num), chapters.map((c, i) => i + 1));
  const ids = new Set();
  for (const c of chapters) {
    assert.ok(!ids.has(c.id), 'id ripetuto ' + c.id);
    ids.add(c.id);
    assert.ok(chapterFiles.includes('js/chapters/' + c.id + '.js'), 'file del capitolo ' + c.id);
    assert.ok(styles.includes('css/cap-' + c.id + '.css'), 'stile del capitolo ' + c.id);
    for (const k of ['title', 'short', 'era', 'kicker', 'summary']) assert.ok(typeof c[k] === 'string' && c[k].length > 2, c.id + ': ' + k);
    assert.ok(c.minutes > 0 && c.labs > 0, c.id + ': minuti e laboratori');
    assert.equal(typeof c.render, 'function');
    assert.ok(Array.isArray(c.timeline) && c.timeline.length >= 4, c.id + ': linea del tempo');
    for (const e of c.timeline) {
      assert.ok(Number.isInteger(e.year) && e.year > 1600 && e.year <= 2026, c.id + ': anno ' + e.year);
      assert.ok(e.title, c.id + ': titolo evento');
    }
    assert.ok(Array.isArray(c.glossary) && c.glossary.length >= 5, c.id + ': glossario');
  }
});

test('ogni termine del glossario è definito una sola volta e ogni [[rimando]] esiste', () => {
  const sb = loadSection();
  const seen = new Map();
  for (const c of sb.PL.chapters) {
    for (const g of c.glossary) {
      const k = g.term.toLowerCase();
      assert.ok(!seen.has(k), 'termine «' + g.term + '» definito in ' + seen.get(k) + ' e in ' + c.id);
      seen.set(k, c.id);
      assert.ok(g.def && g.def.length > 10, g.term + ': definizione');
    }
  }
  for (const f of chapterFiles) {
    const src = fs.readFileSync(path.join(DIR, f), 'utf8');
    for (const m of src.matchAll(/\[\[([A-Za-zÀ-ÿ][^\]|()]*)(?:\|[^\]]+)?\]\]/g)) {
      assert.ok(seen.has(m[1].trim().toLowerCase()), f + ': rimando al glossario senza definizione: ' + m[1]);
    }
  }
});

test('section.js registra la sezione con gli stessi capitoli', () => {
  const sb = loadSection();
  let reg = null;
  const ctx = { Enciclopedia: { register: (o) => { reg = o; } } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(DIR, 'section.js'), 'utf8'), ctx);
  assert.ok(reg, 'register chiamato');
  assert.equal(reg.slug, 'porte-logiche');
  assert.equal(reg.numero, 4);
  // gli array vengono da due contesti vm diversi: si confrontano come testo
  assert.equal(JSON.stringify(reg.capitoli.map((c) => c.id)), JSON.stringify(sb.PL.chapters.map((c) => c.id)));
  reg.capitoli.forEach((c, i) => {
    assert.equal(c.titolo, sb.PL.chapters[i].title, 'titolo del capitolo ' + c.id);
    assert.ok(c.descrizione && c.periodo);
  });
});
