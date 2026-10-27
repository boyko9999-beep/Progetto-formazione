/*
 * Test del capitolo 1 · Un chip, mille programmi (logica pura di js/idea-core.js).
 * node --test sections/chip-programmabili/test/idea.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/idea-core.js');

function load(id) {
  return { rom: M.assemble(id).bytes, m: M.createMachine() };
}
function run(m, rom, ticks) {
  const evs = [];
  for (let i = 0; i < ticks; i++) evs.push(M.step(m, rom));
  return evs;
}
function countColor(px, color) {
  return px.reduce((a, row) => a + row.filter((c) => c === color).length, 0);
}

test('ogni programma diventa 16 byte e ogni istruzione si rilegge uguale', () => {
  for (const id of M.ORDER) {
    const a = M.assemble(id);
    assert.equal(a.bytes.length, M.ROWS, id);
    assert.equal(a.rows.length, M.ROWS, id);
    a.rows.forEach((r, i) => {
      assert.ok(a.bytes[i] >= 0 && a.bytes[i] <= 255);
      assert.equal(r.byte, a.bytes[i]);
      if (r.kind === 'code') {
        assert.equal(a.bytes[i] >> 4, M.OPS[r.op].code, id + ' riga ' + i);
        assert.ok(r.label.startsWith(r.op));
        assert.ok(!/\bn\b/.test(r.text), 'testo senza segnaposto: ' + r.text);
      }
      if (r.kind === 'empty') assert.equal(a.bytes[i], 0);
    });
  }
  assert.throws(() => M.assemble('tostapane'));
});

test('i quattro programmi sono davvero diversi, sullo stesso insieme di istruzioni', () => {
  const roms = M.ORDER.map((id) => M.assemble(id).bytes);
  for (let i = 0; i < roms.length; i++) {
    assert.equal(M.bitDiff(roms[i], roms[i]), 0);
    for (let j = i + 1; j < roms.length; j++) {
      const d = M.bitDiff(roms[i], roms[j]);
      assert.ok(d > 10, M.ORDER[i] + ' e ' + M.ORDER[j] + ' differiscono di ' + d + ' bit');
      assert.equal(d, M.bitDiff(roms[j], roms[i]));
    }
  }
  assert.equal(M.bitDiff(new Array(16).fill(0), new Array(16).fill(255)), 128);
});

test('calcolatrice: mostra 27+15, aspetta «=» e somma in decimale con il riporto', () => {
  const { rom, m } = load('calcolatrice');
  const e0 = M.step(m, rom);
  assert.equal(e0.op, 'TXT');
  assert.equal(M.describe(m.out, rom), '«27+15»');
  // senza tasto resta ferma sulla riga 1
  run(m, rom, 10);
  assert.equal(m.pc, 1);
  m.key = true;
  const evs = run(m, rom, 8);
  const som = evs.filter((e) => e.op === 'SOM');
  assert.equal(som.length, 2);
  assert.equal(som[0].sum, 12);                 // 7 + 5
  assert.equal(som[1].sum, 4);                  // 2 + 1 + riporto
  assert.equal(som[1].c0, 1);
  assert.deepEqual(m.ram, [0, 0, 4, 2]);
  assert.equal(m.out.mode, 'num');
  assert.equal(M.describe(m.out, rom), '«42»');
  assert.equal(m.key, false);
  assert.match(M.explain(som[0], m, rom), /7 \+ 5 = 12/);
});

test('semaforo: rosso, verde, giallo; il tasto accorcia il verde', () => {
  const { rom, m } = load('semaforo');
  M.step(m, rom);
  assert.equal(M.describe(m.out, rom), 'luce rossa');
  run(m, rom, 1 + 9 * M.WAIT_UNIT);                // ASP 9
  M.step(m, rom);
  assert.equal(M.describe(m.out, rom), 'luce verde');
  const greenLong = (() => {
    const t = load('semaforo');
    let n = 0;
    while (M.describe(t.m.out, t.rom) !== 'luce gialla' && n < 500) { M.step(t.m, t.rom); n++; }
    return n;
  })();
  const greenShort = (() => {
    const t = load('semaforo');
    let n = 0;
    while (M.describe(t.m.out, t.rom) !== 'luce gialla' && n < 500) {
      if (M.describe(t.m.out, t.rom) === 'luce verde') t.m.key = true;
      M.step(t.m, t.rom); n++;
    }
    return n;
  })();
  assert.ok(greenShort < greenLong, 'con la chiamata il giallo arriva prima: ' + greenShort + ' < ' + greenLong);
  const px = M.frame({ mode: 'lamp', lit: 1 }, rom);
  assert.ok(countColor(px, M.RED) > countColor(px, M.GREEN), 'la luce accesa è piena, le altre sono anelli');
});

test('insegna: il testo viene dalla ROM e scorre; il tasto la mette in pausa', () => {
  const { rom, m } = load('insegna');
  assert.equal(M.readText(rom, 6), 'BUSICOM ');
  M.step(m, rom);
  const f0 = JSON.stringify(M.frame(m.out, rom));
  run(m, rom, 3);
  assert.equal(m.out.offset, 1);
  assert.notEqual(JSON.stringify(M.frame(m.out, rom)), f0);
  assert.match(M.describe(m.out, rom), /BUSICOM.*scorre/);
  m.key = true;
  run(m, rom, 6);
  const off = m.out.offset;
  run(m, rom, 20);
  assert.equal(m.out.offset, off, 'in pausa non scorre');
  m.key = true;
  run(m, rom, 6);
  assert.ok(m.out.offset > off, 'al secondo tasto riparte');
  // dopo un giro completo torna uguale
  const cycle = M.textColumns('BUSICOM ').length;
  const a = M.frame({ mode: 'text', start: 6, offset: 3 }, rom);
  const b = M.frame({ mode: 'text', start: 6, offset: 3 + cycle }, rom);
  assert.deepEqual(a, b);
});

test('dado: conta da 1 a 6 e mostra il numero quando premi il tasto', () => {
  const { rom, m } = load('dado');
  const seen = new Set();
  for (let i = 0; i < 60; i++) { M.step(m, rom); seen.add(m.a); }
  assert.deepEqual([...seen].sort(), [1, 2, 3, 4, 5, 6]);
  assert.equal(m.out.mode, 'off', 'senza tasto il display resta spento');
  for (let k = 0; k < 12; k++) {
    m.key = true;
    let guard = 0;
    while (m.key && guard++ < 10) M.step(m, rom);
    M.step(m, rom);                                  // DAD
    assert.equal(m.out.mode, 'dice');
    const f = m.out.face;
    assert.ok(f >= 1 && f <= 6);
    assert.equal(countColor(M.frame(m.out, rom), M.RED), f, 'tanti punti quanti il numero');
    for (let i = 0; i < 1 + (k % 5); i++) M.step(m, rom);
  }
});

test('frame: sempre 7 × 29 punti, con colori validi', () => {
  const rom = M.assemble('calcolatrice').bytes;
  const outs = [{ mode: 'off' }, { mode: 'text', start: 11, offset: 0 }, { mode: 'num', digits: [0, 1, 0, 7] }, { mode: 'lamp', lit: 3 }, { mode: 'dice', face: 5 }, { mode: 'dice', face: 9 }];
  outs.forEach((o) => {
    const px = M.frame(o, rom);
    assert.equal(px.length, M.LINES);
    px.forEach((row) => { assert.equal(row.length, M.COLS); row.forEach((c) => assert.ok([0, 1, 2, 3].includes(c))); });
  });
  assert.equal(M.numText([0, 1, 0, 7]), '  107');
  assert.equal(M.numText([0, 0, 0, 0]), '    0');
  assert.equal(countColor(M.frame({ mode: 'off' }, rom), M.AMBER), 0);
});

test('logica cablata: un circuito diverso per ogni funzione, con chip e fili contati', () => {
  const geos = [
    { orient: 'h', x: 16, y: 12, w: 728, h: 340 },
    { orient: 'v', x: 10, y: 10, w: 380, h: 472, feed: 18, out: 18, padFlow: 46, padTop: 26, padBot: 26, bu: 34, bv: 52, gapMax: 18 },
  ];
  const sigs = new Set();
  for (const geo of geos) {
    for (const id of M.ORDER) {
      const w = M.wired(id, geo);
      const again = M.wired(id, geo);
      assert.deepEqual(w, again, 'deterministico');
      const recipe = M.RECIPES[id];
      assert.equal(w.counts.chips, recipe.length);
      assert.equal(w.counts.gates, recipe.flat().length);
      const inputs = recipe.flat().reduce((a, t) => a + M.INPUTS[t], 0);
      assert.equal(w.counts.wires, inputs + recipe[recipe.length - 1].length);
      w.blocks.forEach((b) => {
        assert.ok(b.x >= geo.x && b.x + b.w <= geo.x + geo.w, id + ' blocco dentro in x');
        assert.ok(b.y >= geo.y && b.y + b.h <= geo.y + geo.h, id + ' blocco dentro in y');
      });
      w.wires.forEach((x) => { assert.ok(x.len > 0); assert.match(x.d, /^M[\d. ]+( L[\d. ]+)+$/); });
      // i blocchi non si sovrappongono
      for (let i = 0; i < w.blocks.length; i++) for (let j = i + 1; j < w.blocks.length; j++) {
        const a = w.blocks[i], b = w.blocks[j];
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        assert.ok(!overlap, id + ': ' + a.id + ' e ' + b.id + ' si sovrappongono');
      }
      sigs.add(w.signature + '#' + geo.orient);
    }
  }
  assert.equal(sigs.size, M.ORDER.length * geos.length);
});

test('obiettivo: almeno 3 programmi diversi', () => {
  assert.equal(M.goalReached([]), false);
  assert.equal(M.goalReached(['dado', 'dado', 'semaforo']), false);
  assert.equal(M.goalReached(new Set(['dado', 'semaforo', 'insegna'])), true);
  assert.equal(M.goalReached(['dado', 'semaforo', 'tostapane']), false);
});
