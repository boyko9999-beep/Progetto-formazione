// Capitolo 8 · Verso i 16 bit e oltre: test della logica pura del laboratorio «Da 4 a 32 bit».
// node --test sections/chip-programmabili/test/sedici-bit.test.js
const test = require('node:test');
const assert = require('node:assert');
const K = require('../js/sedici-bit-core.js');

test('dati del grafico: chip completi, in ordine di tempo, produttori noti', () => {
  assert.ok(K.CHIPS.length >= 9);
  const ids = new Set();
  let last = 0;
  for (const c of K.CHIPS) {
    assert.ok(!ids.has(c.id), 'id ripetuto ' + c.id);
    ids.add(c.id);
    assert.ok(K.maker(c.maker), 'produttore sconosciuto per ' + c.id);
    assert.ok(c.year >= 1971 && c.year <= 1985, 'anno fuori dalla sezione: ' + c.id);
    assert.ok(c.year >= last, 'non in ordine di tempo: ' + c.id);
    last = c.year;
    assert.ok(K.WIDTHS.includes(c.bits), 'larghezza dei registri: ' + c.id);
    assert.ok(c.bus == null || K.WIDTHS.includes(c.bus), 'larghezza del bus: ' + c.id);
    assert.ok(c.transistors >= 1000 && c.transistors <= 100000, 'transistor fuori scala: ' + c.id);
    assert.ok(c.name && c.short && c.note && c.chapter, 'campi di ' + c.id);
  }
  // ogni produttore ha almeno un chip
  for (const m of K.MAKERS) assert.ok(K.chipsBy(m.id).length > 0, 'nessun chip per ' + m.id);
  assert.strictEqual(K.chipsBy('all').length, K.CHIPS.length);
});

test('dati verificati: i valori chiave del capitolo', () => {
  assert.strictEqual(K.chip('4004').transistors, 2300);
  assert.strictEqual(K.chip('8086').transistors, 29000);
  assert.strictEqual(K.chip('8086').year, 1978);
  assert.strictEqual(K.chip('68000').transistors, 68000);
  assert.strictEqual(K.chip('68000').bits, 32);
  assert.strictEqual(K.chip('68000').bus, 16);
  assert.strictEqual(K.chip('8088').bus, 8);
  assert.strictEqual(K.chip('arm1').year, 1985);
  // il punto del capitolo: l'ARM1 lavora a 32 bit con meno transistor dell'8086
  assert.ok(K.chip('arm1').transistors < K.chip('8086').transistors);
  assert.ok(K.ratio('8086', '68000') > 2, 'il 68000 ha più del doppio dei transistor dell\'8086');
  assert.strictEqual(K.ratio('4004', '8008'), 1.5);
  assert.strictEqual(K.ratio('x', '8008'), null);
});

test('scale: lineare e logaritmica', () => {
  const x = K.linear(1970, 1980, 0, 100);
  assert.strictEqual(x(1975), 50);
  const y = K.log10Scale(1000, 100000, 300, 0);
  assert.strictEqual(y(1000), 300);
  assert.strictEqual(y(100000), 0);
  assert.ok(Math.abs(y(10000) - 150) < 1e-9, 'una decade = metà altezza');
  const t = K.logTicks(1000, 100000);
  assert.deepStrictEqual(t.major, [1000, 10000, 100000]);
  assert.deepStrictEqual(t.minor, [2000, 3000, 5000, 20000, 30000, 50000]);
});

test('passaggi: 32 bit con bus da 4, 8, 16 e 32 bit', () => {
  assert.deepStrictEqual(K.WIDTHS.map((w) => K.passes(32, w)), [8, 4, 2, 1]);
  assert.strictEqual(K.passes(20, 8), 3);
  assert.throws(() => K.passes(32, 0), RangeError);
  assert.throws(() => K.split(1, 12), RangeError);
});

test('split e copia: i pezzi ricompongono il numero', () => {
  const v = 0x1234ABCD;
  const p8 = K.split(v, 8);
  assert.deepStrictEqual(p8.map((c) => c.value), [0xCD, 0xAB, 0x34, 0x12]);
  assert.deepStrictEqual(p8.map((c) => c.shift), [0, 8, 16, 24]);
  const p4 = K.split(v, 4);
  assert.deepStrictEqual(p4.map((c) => c.value), [0xD, 0xC, 0xB, 0xA, 0x4, 0x3, 0x2, 0x1]);
  assert.deepStrictEqual(K.split(v, 32).map((c) => c.value), [v]);
  for (const w of K.WIDTHS) {
    const c = K.copySteps(v, w);
    assert.strictEqual(c.result, v, 'copia a ' + w + ' bit');
    assert.strictEqual(c.passes, 32 / w);
    assert.strictEqual(c.steps[c.steps.length - 1].register, v);
  }
  // valori negativi o troppo grandi vengono ridotti a 32 bit
  assert.strictEqual(K.copySteps(-1, 16).result, 0xFFFFFFFF);
  assert.strictEqual(K.copySteps(0x100000001, 8).result, 1);
});

test('somma a pezzi con riporto: stesso risultato a ogni larghezza', () => {
  const a = 0x1234ABCD;
  const b = 0x0FEDCBA9;
  for (const w of K.WIDTHS) {
    const r = K.addSteps(a, b, w);
    assert.strictEqual(r.result, 0x22227776, 'somma a ' + w + ' bit');
    assert.strictEqual(r.carry, 0);
    assert.strictEqual(r.passes, 32 / w);
  }
  const s8 = K.addSteps(a, b, 8).steps;
  assert.deepStrictEqual(s8.map((s) => s.sum), [0x76, 0x77, 0x22, 0x22]);
  assert.deepStrictEqual(s8.map((s) => s.carryIn), [0, 1, 1, 1]);
  assert.deepStrictEqual(s8.map((s) => s.carryOut), [1, 1, 1, 0]);
  // riporto oltre i 32 bit
  const over = K.addSteps(0xFFFFFFFF, 1, 16);
  assert.strictEqual(over.result, 0);
  assert.strictEqual(over.carry, 1);
  assert.deepStrictEqual(over.steps.map((s) => s.carryOut), [1, 1]);
});

test('parseHex e hex', () => {
  assert.strictEqual(K.parseHex('1234', 4), 0x1234);
  assert.strictEqual(K.parseHex(' 0x00ff ', 4), 0xFF);
  assert.strictEqual(K.parseHex('b800h', 4), 0xB800);
  assert.strictEqual(K.parseHex('0000012350', 5), 0x12350, 'gli zeri iniziali non contano');
  assert.strictEqual(K.parseHex('12345', 4), null, 'troppe cifre');
  assert.strictEqual(K.parseHex('12G4', 4), null);
  assert.strictEqual(K.parseHex('', 4), null);
  assert.strictEqual(K.parseHex(null, 4), null);
  assert.strictEqual(K.hex(0x12350, 5), '12350');
  assert.strictEqual(K.hex(0xA, 4), '000A');
  assert.strictEqual(K.formatSegOff(0x1234, 0x10), '1234:0010');
});

test('indirizzo fisico dell\'8086: segmento × 16 + offset', () => {
  assert.strictEqual(K.physical(0x1234, 0x0010).address, 0x12350);
  assert.strictEqual(K.physical(0x1235, 0x0000).address, 0x12350, 'un altro nome per lo stesso byte');
  const reset = K.physical(0xFFFF, 0x0000);
  assert.strictEqual(reset.address, 0xFFFF0, 'dopo il reset l\'8086 parte da FFFF0');
  assert.strictEqual(reset.wrapped, false);
  const giro = K.physical(0xFFFF, 0x0010);
  assert.strictEqual(giro.sum, 0x100000);
  assert.strictEqual(giro.address, 0, 'oltre FFFFF si riparte da 00000');
  assert.strictEqual(giro.wrapped, true);
  assert.strictEqual(K.physical(0xFFFF, 0xFFFF).address, 0x0FFEF);
  assert.throws(() => K.physical(0x10000, 0), RangeError);
  assert.throws(() => K.physical(0, -1), RangeError);
  assert.strictEqual(K.ADDR_MAX, 0xFFFFF);
  const w = K.segmentWindow(0x1234);
  assert.deepStrictEqual([w.start, w.end, w.wraps], [0x12340, 0x2233F, false]);
  assert.strictEqual(K.segmentWindow(0xF800).wraps, true);
});

test('colonne della somma esadecimale con riporti', () => {
  const r = K.addColumns(0x12340, 0x0010, 5);
  assert.deepStrictEqual(r.cols.map((c) => c.digit), [0x0, 0x5, 0x3, 0x2, 0x1]);
  assert.strictEqual(r.carry, 0);
  const c = K.addColumns(0x0FF00, 0x0100, 5);
  assert.deepStrictEqual(c.cols.map((x) => x.digit), [0, 0, 0, 0, 1]);
  assert.deepStrictEqual(c.cols.map((x) => x.carryIn), [0, 0, 0, 1, 1]);
  const g = K.addColumns(0xFFFF0, 0x0010, 5);
  assert.strictEqual(g.carry, 1, 'il riporto oltre la quinta cifra è quello che l\'8086 perde');
});

test('alias: lo stesso byte ha fino a 4.096 nomi', () => {
  assert.strictEqual(K.aliases(0x12350), 4096);
  assert.strictEqual(K.aliases(0x00000), 1);
  assert.strictEqual(K.aliases(0x00010), 2);
  assert.strictEqual(K.aliases(0xFFFFF), 4096, 'da F000:FFFF a FFFF:000F');
  assert.strictEqual(K.aliases(0x0FFEF), 4095);
});

test('controllo delle risposte con diagnosi degli errori tipici', () => {
  assert.strictEqual(K.checkAnswer('20345', 0x2000, 0x0345).ok, true);
  assert.strictEqual(K.checkAnswer('0x20345', 0x2000, 0x0345).ok, true);
  assert.strictEqual(K.checkAnswer(' 20345h ', 0x2000, 0x0345).ok, true);
  assert.strictEqual(K.checkAnswer('', 0x2000, 0x0345).reason, 'empty');
  assert.strictEqual(K.checkAnswer('2034Z', 0x2000, 0x0345).reason, 'invalid');
  assert.strictEqual(K.checkAnswer('2345', 0x2000, 0x0345).reason, 'no-shift');
  assert.strictEqual(K.checkAnswer('05450', 0x2000, 0x0345).reason, 'shift-offset');
  assert.strictEqual(K.checkAnswer('0F000', 0x0FF0, 0x0100).reason, 'carry');
  assert.strictEqual(K.checkAnswer('100000', 0xFFFF, 0x0010).reason, 'wrap');
  assert.strictEqual(K.checkAnswer('12345', 0x2000, 0x0345).reason, 'wrong');
});

test('sfide: risposte giuste e ciclo', () => {
  const answers = K.CHALLENGES.map((_, i) => K.challenge(i).answer);
  assert.deepStrictEqual(answers, [0x20345, 0x3ABCD, 0x10000, 0x1DEFD, 0xBABD1]);
  assert.strictEqual(K.challenge(0).text, '2000:0345');
  assert.strictEqual(K.challenge(K.CHALLENGES.length).index, 0);
  assert.strictEqual(K.challenge(-1).index, K.CHALLENGES.length - 1);
  for (const p of K.PRESETS) assert.ok(K.physical(p.seg, p.off).address >= 0);
});

test('bitsOf: 20 fili di indirizzo', () => {
  assert.deepStrictEqual(K.bitsOf(0x12350, 20).join(''), '00010010001101010000');
  assert.strictEqual(K.bitsOf(5, 4).join(''), '0101');
});

test('num: punto delle migliaia anche a 4 cifre, virgola per i decimali', () => {
  assert.strictEqual(K.num(2300), '2.300');
  assert.strictEqual(K.num(29000), '29.000');
  assert.strictEqual(K.num(100000), '100.000');
  assert.strictEqual(K.num(999), '999');
  assert.strictEqual(K.num(1.52, 1), '1,5');
  assert.strictEqual(K.num(12.6, 0), '13');
  assert.strictEqual(K.num(4096), '4.096');
});
