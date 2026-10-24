// Test del quiz dell'enciclopedia (sections/quiz): logica, banche di domande e registrazione nell'hub.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const QUIZ = path.join(__dirname, '..', 'sections', 'quiz');
const read = (f) => fs.readFileSync(f, 'utf8');
const html = read(path.join(QUIZ, 'index.html'));
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const C = require(path.join(QUIZ, 'core.js'));

const SECTIONS = ['elettronica-base', 'elettronica-intermedia', 'elettronica-avanzata', 'porte-logiche',
  'chip-programmabili', 'storia-pc', 'programmazione', 'bus'];

// Carica i file come la pagina, nell'ordine dei tag <script>, in un contesto separato
// (gli array creati lì dentro si confrontano dopo averli copiati con Array.from).
// Solo BusLab, la logica, section.js e le banche: le domande scritte dalle sezioni
// (sections/<slug>/quiz.js) crescono per conto loro e non entrano nei conteggi.
function loadPage() {
  const warnings = [];
  const ctx = vm.createContext({ console: { warn: (...a) => warnings.push(a.join(' ')), log() {}, error() {} } });
  const raw = [];
  scripts.forEach((src) => {
    if (!(src === '../../js/buses.js' || src === 'core.js' || src === 'section.js' || src.startsWith('banks/'))) return;
    vm.runInContext(read(path.join(QUIZ, src)), ctx, { filename: src });
    if (src === 'core.js') {
      const register = ctx.QuizBank.register.bind(ctx.QuizBank);
      ctx.QuizBank.register = (bank) => { raw.push(bank); return register(bank); };
    }
  });
  return { ctx: ctx, raw: raw, warnings: warnings, banks: ctx.QuizBank.list() };
}

const page = loadPage();

/* ---------- le banche ---------- */

test('index.html carica tutte le banche, con bus-extra prima di bus', () => {
  const files = fs.readdirSync(path.join(QUIZ, 'banks')).filter((f) => f.endsWith('.js'));
  files.forEach((f) => assert.ok(scripts.includes('banks/' + f), 'manca il tag <script> di banks/' + f));
  const at = (s) => scripts.indexOf(s);
  assert.ok(at('banks/bus-extra.js') < at('banks/bus.js'));
  assert.ok(at('core.js') < at('engine.js') && at('figures.js') < at('engine.js') && at('engine.js') < at('app.js'));
  assert.ok(scripts.filter((s) => s.startsWith('banks/')).every((s) => at(s) > at('core.js') && at(s) < at('app.js')));
});

test('ci sono le banche delle 7 sezioni e di BusLab', () => {
  assert.deepStrictEqual(Array.from(page.banks, (b) => b.slug).sort(), SECTIONS.slice().sort());
  page.banks.forEach((b) => assert.ok(b.questions.length >= 30, b.slug + ' ha solo ' + b.questions.length + ' domande'));
});

test('ogni banca supera il controllo severo e nessuna domanda viene scartata', () => {
  page.raw.forEach((bank) => assert.deepStrictEqual(C.validateBank(bank, true), [], bank.slug));
  assert.deepStrictEqual(page.warnings, []);
});

test('gli id delle domande sono unici in tutto il quiz', () => {
  const seen = new Map();
  page.banks.forEach((b) => b.questions.forEach((q) => {
    assert.ok(!seen.has(q.id), q.id + ' è sia in ' + seen.get(q.id) + ' sia in ' + b.slug);
    seen.set(q.id, b.slug);
  }));
});

test('ogni domanda sta in un capitolo della sua sezione e ogni capitolo ha almeno due domande', () => {
  page.banks.forEach((b) => {
    const ids = (b.chapters || []).map((c) => c.id);
    assert.ok(ids.length, b.slug + ' senza capitoli');
    b.questions.forEach((q) => assert.ok(ids.includes(q.chapter), b.slug + ': ' + q.id + ' ha il capitolo "' + q.chapter + '"'));
    ids.forEach((id) => {
      const n = b.questions.filter((q) => q.chapter === id).length;
      assert.ok(n >= 2, b.slug + '/' + id + ' ha ' + n + ' domande');
    });
  });
});

test('ogni banca mescola livelli e tipi di domanda', () => {
  page.banks.forEach((b) => {
    const levels = new Set(b.questions.map((q) => q.level));
    const types = new Set(b.questions.map((q) => q.type));
    assert.deepStrictEqual([...levels].sort(), [1, 2, 3], b.slug + ': livelli ' + [...levels]);
    assert.ok(types.size >= 3, b.slug + ': solo ' + [...types].join(', '));
  });
});

/* ---------- registrazione nell'hub ---------- */

test('section.js si presenta all\'hub con i numeri giusti', () => {
  const def = page.ctx.QuizSection;
  assert.strictEqual(def.slug, 'quiz');
  assert.strictEqual(def.numero, 8);
  page.banks.forEach((b) => assert.strictEqual(def.domande[b.slug], b.questions.length, 'domande di ' + b.slug + ' in section.js'));
  assert.deepStrictEqual(Object.keys(def.domande).sort(), SECTIONS.slice().sort());
  def.capitoli.forEach((c) => assert.strictEqual(c.href, 'quiz/index.html#' + c.id));
  assert.deepStrictEqual(Array.from(def.capitoli, (c) => c.id), SECTIONS.concat(['esame', 'tempo']));
});

test('section.js chiama Enciclopedia.register quando il registro c\'è', () => {
  const got = [];
  const ctx = vm.createContext({ Enciclopedia: { register: (d) => got.push(d) } });
  vm.runInContext(read(path.join(QUIZ, 'section.js')), ctx);
  assert.strictEqual(got.length, 1);
  assert.strictEqual(got[0].slug, 'quiz');
});

/* ---------- la logica ---------- */

test('espressioni logiche e tabelle di verità', () => {
  const t = C.parseExpr('AND(A,OR(B,NOT(C)))');
  assert.strictEqual(C.evalExpr(t, { A: 1, B: 0, C: 0 }), 1);
  assert.strictEqual(C.evalExpr(t, { A: 1, B: 0, C: 1 }), 0);
  assert.deepStrictEqual(C.exprInputs(t), ['A', 'B', 'C']);
  const x = C.truthRows('XOR(A,B)');
  assert.deepStrictEqual(x.names, ['A', 'B']);
  assert.deepStrictEqual(x.rows.map((r) => r.out), [0, 1, 1, 0]);
  assert.deepStrictEqual(x.rows[1].inputs, { A: 0, B: 1 });
  assert.deepStrictEqual(C.truthRows('NAND(A,B)').rows.map((r) => r.out), [1, 1, 1, 0]);
  assert.throws(() => C.parseExpr('AND(A'));
  assert.throws(() => C.parseExpr('FOO(A,B)'));
});

test('codice dei colori delle resistenze', () => {
  assert.deepStrictEqual(C.resistorValue(['marrone', 'nero', 'rosso', 'oro']), { ohms: 1000, tolerance: 5 });
  assert.deepStrictEqual(C.resistorValue(['giallo', 'viola', 'rosso', 'oro']), { ohms: 4700, tolerance: 5 });
  assert.deepStrictEqual(C.resistorValue(['rosso', 'rosso', 'nero', 'nero', 'marrone']), { ohms: 220, tolerance: 1 });
  assert.strictEqual(C.resistorValue(['oro', 'nero', 'rosso', 'oro']), null);
  assert.strictEqual(C.formatOhms(4700), '4,7 kΩ');
  assert.strictEqual(C.formatOhms(220), '220 Ω');
  assert.strictEqual(C.formatOhms(1e6), '1 MΩ');
});

test('numeri scritti all\'italiana', () => {
  assert.strictEqual(C.parseNumber('1,5'), 1.5);
  assert.strictEqual(C.parseNumber('1.5'), 1.5);
  assert.strictEqual(C.parseNumber('1.000,5'), 1000.5);
  assert.strictEqual(C.parseNumber(' 20 mA'), 20);
  assert.strictEqual(C.parseNumber('−3'), -3);
  assert.ok(Number.isNaN(C.parseNumber('mille')));
  assert.strictEqual(C.formatNumber(0.1 + 0.2), '0,3');
});

test('verifica delle risposte, tipo per tipo', () => {
  const ok = (q, r) => assert.strictEqual(C.check(q, r), true, q.type + ' giusta');
  const ko = (q, r) => assert.strictEqual(C.check(q, r), false, q.type + ' sbagliata');
  const choice = { type: 'choice', options: ['a', 'b'], answer: 0 };
  ok(choice, 0); ko(choice, 1);
  const tf = { type: 'truefalse', answer: false };
  ok(tf, false); ko(tf, true);
  const order = { type: 'order', items: ['x', 'y', 'z'] };
  ok(order, ['x', 'y', 'z']); ko(order, ['y', 'x', 'z']); ko(order, ['x', 'y']);
  const match = { type: 'match', pairs: [['V', 'volt'], ['A', 'ampere'], ['Ω', 'ohm']] };
  ok(match, { V: 'volt', A: 'ampere', Ω: 'ohm' }); ko(match, { V: 'ampere', A: 'volt', Ω: 'ohm' });
  const num = { type: 'number', value: 2.5, unit: 'mA' };
  ok(num, '2,5'); ok(num, '2.52'); ok(num, '2,5 mA'); ko(num, '2,6'); ko(num, '');
  ok({ type: 'number', value: 100, tolerance: 5 }, '104'); ko({ type: 'number', value: 100, tolerance: 5 }, '106');
  const bits = { type: 'bits', value: 10, width: 4 };
  ok(bits, 10); ko(bits, 11);
  const truth = { type: 'truth', expr: 'OR(A,B)' };
  ok(truth, [0, 1, 1, 1]); ko(truth, [0, 1, 1, 0]); ko(truth, [0, 1, 1]);
  const logic = { type: 'logic', expr: 'AND(A,NOT(B))', target: 1 };
  ok(logic, { A: 1, B: 0 }); ko(logic, { A: 1, B: 1 });
  assert.strictEqual(C.answerText(logic), 'A = 1, B = 0');
  assert.strictEqual(C.answerText(bits), '1010 (10)');
});

test('l\'etichetta della domanda non deve svelare la risposta', () => {
  const q = (topic, extra) => Object.assign({ type: 'choice', topic: topic, q: 'Quale componente rappresenta questo simbolo?', options: ['Un induttore', 'Un resistore', 'Un condensatore'], answer: 0, why: 'Il simbolo dell\'induttore è una serie di spire.' }, extra);
  const giveaway = (w) => w.some((m) => /rivela la risposta/.test(m));
  assert.ok(giveaway(C.lintQuestion(q('Induttore'), 'x')));
  assert.ok(!giveaway(C.lintQuestion(q('Simboli'), 'x')));
  // Se la parola è già nella domanda o in un'altra opzione, l'etichetta non aggiunge niente.
  assert.ok(!giveaway(C.lintQuestion(q('Induttore', { q: 'Che cosa immagazzina un induttore?' }), 'x')));
  assert.ok(!giveaway(C.lintQuestion(q('Induttore', { options: ['Un induttore', 'Un induttore variabile', 'Un resistore'] }), 'x')));
});

test('un elenco da riordinare non parte mai già in ordine', () => {
  const list = ['a', 'b', 'c'];
  for (let seed = 1; seed < 300; seed++) {
    const r = C.scramble(list, C.rng(seed));
    assert.notDeepStrictEqual(r, list);
    assert.deepStrictEqual(r.slice().sort(), list);
  }
});

test('scelta delle domande: senza doppioni, dalle più facili, prima quelle mai viste', () => {
  const qs = [];
  for (let i = 0; i < 30; i++) qs.push({ id: 'q' + i, level: 1 + (i % 3), type: i % 2 ? 'choice' : 'truefalse' });
  const rand = C.rng(42);
  const got = C.pick(qs, 10, rand);
  assert.strictEqual(got.length, 10);
  assert.strictEqual(new Set(got).size, 10);
  got.slice(1).forEach((q, i) => assert.ok(q.level >= got[i].level));
  assert.deepStrictEqual(got.map((q) => q.level).filter((l) => l === 1).length, 4);
  const seen = new Set(qs.slice(0, 25).map((q) => q.id));
  const fresh = C.pick(qs, 5, C.rng(7), { seen: seen });
  assert.ok(fresh.every((q) => !seen.has(q.id)), 'le 5 domande mai viste vengono prima');
  assert.strictEqual(C.pick(qs.slice(0, 3), 10, rand).length, 3);
});

test('l\'esame misto prende domande da ogni banca', () => {
  const banks = page.banks;
  const exam = C.pickMixed(banks, 24, C.rng(3));
  assert.strictEqual(exam.length, 24);
  assert.strictEqual(new Set(exam.map((q) => q.id)).size, 24);
  banks.forEach((b) => assert.ok(exam.some((q) => q.section === b.slug), 'nessuna domanda da ' + b.slug));
});

test('medaglie', () => {
  assert.strictEqual(C.medal(100), 'oro');
  assert.strictEqual(C.medal(90), 'oro');
  assert.strictEqual(C.medal(80), 'argento');
  assert.strictEqual(C.medal(50), 'bronzo');
  assert.strictEqual(C.medal(49), null);
});

test('le domande di una sezione si aggiungono alla banca, e con lo stesso id la sostituiscono', () => {
  const ctx = vm.createContext({ console: { warn() {} } });
  vm.runInContext(read(path.join(QUIZ, 'core.js')), ctx);
  const B = ctx.QuizBank;
  const q = (id, text) => ({ id: id, q: text, options: ['sì', 'no'], answer: 0, why: 'Una spiegazione abbastanza lunga.', chapter: 'c' });
  B.extend('s', [q('s-1', 'Versione della sezione?')]);
  B.register({ slug: 's', number: 1, title: 'S', chapters: [{ id: 'c', title: 'C' }], questions: [q('s-1', 'Versione del quiz?'), q('s-2', 'Altra?')] });
  B.extend('s', [q('s-3', 'Nuova?'), { q: 'Rotta' }]);
  const list = B.get('s').questions;
  assert.deepStrictEqual(list.map((x) => x.id), ['s-1', 's-2', 's-3']);
  assert.strictEqual(list[0].q, 'Versione della sezione?');
  assert.ok(list.every((x) => x.section === 's' && x.level === 2 && x.type === 'choice'));
});
