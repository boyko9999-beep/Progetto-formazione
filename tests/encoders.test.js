// Test dei generatori di segnale: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const E = require('../js/encoders.js');

const bytes = [0x43, 0x69, 0x61, 0x6f]; // "Ciao"

test('CRC Modbus dell\'esempio classico 01 03 00 00 00 0A = 0xCDC5', () => {
  assert.strictEqual(E.crcModbus([0x01, 0x03, 0x00, 0x00, 0x00, 0x0a]), 0xcdc5);
});

test('CRC-32 Ethernet di "123456789" = 0xCBF43926', () => {
  assert.strictEqual(E.crc32([...Buffer.from('123456789')]), 0xcbf43926);
});

test('CRC-16 USB ha il residuo corretto', () => {
  const data = [0x00, 0x01, 0x02, 0x03];
  const crc = E.crcUsb16(data);
  // Rieseguendo il CRC (senza inversione finale) su dati + CRC si ottiene il residuo 0xB001.
  assert.strictEqual(E.crcModbus(data.concat([crc & 0xff, crc >> 8])), 0xb001);
});

test('CRC-15 CAN si annulla accodando il CRC stesso', () => {
  const bits = [0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0];
  const crc = E.crcCan15(bits);
  const crcBits = [];
  for (let i = 14; i >= 0; i--) crcBits.push((crc >> i) & 1);
  assert.strictEqual(E.crcCan15(bits.concat(crcBits)), 0);
});

test('8b/10b: D.0.0 e D.21.5 con disparità negativa', () => {
  assert.deepStrictEqual(E.enc8b10b(0x00, -1), { code: '1001110100', rd: -1 });
  assert.deepStrictEqual(E.enc8b10b(0xb5, -1), { code: '1010101010', rd: -1 });
  // D.3.3 a disparità positiva usa le varianti complementari bilanciate
  assert.strictEqual(E.enc8b10b(0x63, 1).code, '1100010011');
});

test('8b/10b: la disparità resta sempre entro ±1', () => {
  let rd = -1;
  for (let b = 0; b < 256; b++) {
    const e = E.enc8b10b(b, rd);
    const ones = e.code.split('').filter((c) => c === '1').length;
    assert.ok(ones >= 4 && ones <= 6, 'byte ' + b);
    assert.strictEqual(rd + (ones - 5) * 2, e.rd, 'disparità byte ' + b);
    assert.ok(!/0{6}|1{6}/.test(e.code), 'massimo 5 bit uguali di fila, byte ' + b);
    rd = e.rd;
  }
});

test('LIN: ID protetto e checksum', () => {
  assert.strictEqual(E.linProtectedId(0x3c), 0x3c); // diagnostica master request
  assert.strictEqual(E.linProtectedId(0x10), 0x50);
  assert.strictEqual(E.linChecksum([0x4a, 0x55, 0x93, 0xe5]), 0xe6);
});

test('UART: start, 8 bit LSB prima, stop', () => {
  const t = E.generate('uart', [0x43]);
  const lv = t.steps.map((s) => s.levels.TX);
  // 2 riposo, start, 11000010 (0x43 LSB prima), stop, riposo
  assert.deepStrictEqual(lv, [1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1]);
});

test('CAN: mai più di 5 bit uguali prima del delimitatore CRC', () => {
  const t = E.generate('can', [0x00, 0x00, 0xff, 0xff]);
  const end = t.segments.findIndex((s) => s.label === 'Delimitatore CRC');
  const bits = t.steps.filter((s) => s.seg > 0 && s.seg < end).map((s) => (s.levels.CANH === 1 ? 0 : 1));
  assert.ok(!/000000|111111/.test(bits.join('')));
  assert.ok(t.steps.some((s) => s.stuff));
});

test('USB: SYNC in NRZI è KJKJKJKK', () => {
  const t = E.generate('usb', [0x41]);
  const sync = t.steps.filter((s) => s.seg === 1).map((s) => (s.levels.DP ? 'J' : 'K')).join('');
  assert.strictEqual(sync, 'KJKJKJKK');
});

test('I2C: SDA cambia con SCL alto solo in START e STOP', () => {
  const t = E.generate('i2c', bytes);
  let changes = 0;
  for (let i = 1; i < t.steps.length; i++) {
    const a = t.steps[i - 1].levels;
    const b = t.steps[i].levels;
    if (a.SCL === 1 && b.SCL === 1 && a.SDA !== b.SDA) changes++;
  }
  assert.strictEqual(changes, 2);
});

test('Ogni generatore produce una traccia coerente', () => {
  for (const name of Object.keys(E.generators)) {
    const opts = name === 'parbus' ? { addr: 'A', data: 'D', wr: 'WR', base: 0, devices: ['a', 'b'] } : {};
    const t = E.generate(name, bytes, opts);
    assert.ok(t.steps.length > 4, name);
    for (const s of t.steps) {
      assert.ok(s.seg >= 0 && s.seg < t.segments.length, name);
      for (const l of t.lines) assert.ok(l.id in s.levels, name + ' linea ' + l.id);
    }
  }
});

test('Ogni bus ha contenuti completi e una simulazione valida', () => {
  const { BUSES, CATEGORIES } = require('../js/buses.js');
  const cats = new Set(CATEGORIES.map((c) => c.id));
  const ids = new Set();
  for (const b of BUSES) {
    assert.ok(!ids.has(b.id), 'id duplicato ' + b.id);
    ids.add(b.id);
    assert.ok(cats.has(b.category), b.id + ' categoria');
    for (const k of ['name', 'full', 'year', 'inventor', 'type', 'sync', 'wires', 'topology', 'speed', 'distance', 'uses', 'fun']) assert.ok(b[k], b.id + ' campo ' + k);
    assert.ok(b.story.length && b.how.length && b.quiz.length, b.id);
    for (const q of b.quiz) assert.ok(q.answer >= 0 && q.answer < q.options.length, b.id + ' risposta');
    const t = E.generate(b.sim.gen, bytes, b.sim.opts);
    assert.ok(t.steps.length > 4, b.id + ' simulazione');
  }
});
