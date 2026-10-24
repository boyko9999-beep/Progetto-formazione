// Test della logica pura del laboratorio "Il 4004 al microscopio": node --test test/intel-4004.test.js
const test = require('node:test');
const assert = require('node:assert');
const I = require('../js/intel-4004-core.js');

test('il 4004 ha 46 istruzioni, 5 delle quali lunghe due byte', () => {
  const set = I.instructionSet();
  assert.strictEqual(set.length, 46);
  assert.deepStrictEqual(set.filter((x) => x.words === 2).map((x) => x.mn).sort(), ['FIM', 'ISZ', 'JCN', 'JMS', 'JUN']);
});

test('decodifica dei codici operativi del manuale MCS-4', () => {
  assert.strictEqual(I.decode(0xd9).text, 'LDM 9');
  assert.strictEqual(I.decode(0xb0).text, 'XCH R0');
  assert.strictEqual(I.decode(0x80).text, 'ADD R0');
  assert.strictEqual(I.decode(0x61).text, 'INC R1');
  assert.strictEqual(I.decode(0xf7).text, 'TCC');
  assert.strictEqual(I.decode(0xf2).text, 'IAC');
  assert.strictEqual(I.decode(0x00).text, 'NOP');
  assert.strictEqual(I.decode(0x22).text, 'FIM P1');
  assert.strictEqual(I.decode(0x23).text, 'SRC P1');
  assert.strictEqual(I.decode(0xe0).mn, 'WRM');
  assert.strictEqual(I.decode(0xfd).mn, 'DCL');
  assert.strictEqual(I.decode(0xfe).valid, false);
  assert.strictEqual(I.format(0x40, 0x07), 'JUN 007');
  assert.strictEqual(I.format(0x53, 0x21), 'JMS 321');
});

test('il programma del laboratorio occupa 9 byte e finisce con JUN 007', () => {
  const p = I.program(9, 8);
  assert.deepStrictEqual(p.rom, [0xd9, 0xb0, 0xd8, 0x80, 0xb1, 0xf7, 0xb2, 0x40, 0x07]);
  assert.strictEqual(p.lines.length, 8);
  assert.strictEqual(p.lines[7].addr, 7);
  assert.strictEqual(p.lines[7].text, 'JUN 007');
});

test('9 + 8 = 17: in 4 bit resta 1 con riporto, il risultato finisce nella coppia R2 R1', () => {
  const t = I.trace(I.program(9, 8).rom);
  assert.strictEqual(t.halted, true);
  assert.strictEqual(t.cycles.length, 9); // 7 istruzioni da un byte + JUN da due byte
  const add = t.cycles[3];
  assert.strictEqual(add.instr.text, 'ADD R0');
  assert.strictEqual(add.after.acc, 1);
  assert.strictEqual(add.after.cy, 1);
  assert.deepStrictEqual(add.exec.alu, { op: '+', x: 8, y: 9, c: 0, result: 17 });
  const f = t.final;
  assert.strictEqual(f.r[0], 9);
  assert.strictEqual(f.r[1], 1);
  assert.strictEqual(f.r[2], 1);
  assert.strictEqual((f.r[2] << 4) | f.r[1], 17);
  assert.strictEqual(f.cy, 0);
  assert.strictEqual(f.pc, 7);
});

test('senza riporto: 3 + 4 = 7 e R2 resta 0', () => {
  const f = I.trace(I.program(3, 4).rom).final;
  assert.strictEqual(f.r[1], 7);
  assert.strictEqual(f.r[2], 0);
});

test('ogni somma da 0 + 0 a 15 + 15 è corretta', () => {
  for (let a = 0; a < 16; a++) {
    for (let b = 0; b < 16; b++) {
      const f = I.trace(I.program(a, b).rom).final;
      assert.strictEqual((f.r[2] << 4) | f.r[1], a + b, a + ' + ' + b);
    }
  }
});

test('fasi A1-A3: l\'indirizzo a 12 bit esce in tre nibble, dal basso verso l\'alto', () => {
  const rom = new Array(0x300).fill(0);
  rom[0] = 0x42; rom[1] = 0x35; // JUN 235
  rom[0x235] = 0x40; rom[0x236] = 0x00; // JUN 000 (non è un salto su se stesso)
  const t = I.trace(rom, { maxCycles: 3 });
  const c = t.cycles[2]; // primo byte prelevato all'indirizzo 235
  assert.strictEqual(c.addr, 0x235);
  assert.deepStrictEqual(c.phases.slice(0, 3).map((p) => p.bus), [0x5, 0x3, 0x2]);
  assert.ok(c.phases.slice(0, 3).every((p) => p.dir === 'out' && p.kind === 'addr'));
});

test('fasi M1-M2: l\'istruzione rientra in due metà, prima OPR poi OPA', () => {
  const t = I.trace(I.program(9, 8).rom);
  const c = t.cycles[0];
  assert.deepStrictEqual(I.PHASES, ['A1', 'A2', 'A3', 'M1', 'M2', 'X1', 'X2', 'X3']);
  assert.strictEqual(c.phases[3].bus, 0xd);
  assert.strictEqual(c.phases[4].bus, 0x9);
  assert.ok(c.phases.slice(3, 5).every((p) => p.dir === 'in' && p.kind === 'data'));
  assert.ok(c.phases.slice(5).every((p) => p.bus === null));
});

test('SYNC solo in X3, CM-ROM in A3 (e anche in M2 per le istruzioni di ingresso/uscita)', () => {
  const t = I.trace(I.program(1, 2).rom);
  t.cycles.forEach((c) => {
    assert.deepStrictEqual(c.phases.map((p) => p.sync), [false, false, false, false, false, false, false, true]);
    assert.deepStrictEqual(c.phases.map((p) => p.cmRom), [false, false, true, false, false, false, false, false]);
  });
  const io = I.trace([0xe0, 0x40, 0x01], { maxCycles: 3 }).cycles[0];
  assert.strictEqual(io.phases[4].cmRom, true);
});

test('stato visibile per fase: il PC avanza dopo il prelievo, il risultato compare in X3', () => {
  const t = I.trace(I.program(9, 8).rom);
  const add = t.cycles[3];
  assert.strictEqual(add.phases[0].state.pc, 3);
  assert.strictEqual(add.phases[4].state.pc, 4);
  assert.strictEqual(add.phases[6].state.acc, 8); // X2: il risultato non è ancora scritto
  assert.strictEqual(add.phases[7].state.acc, 1);
  assert.strictEqual(add.phases[7].state.cy, 1);
  assert.deepStrictEqual(add.phases[3].state.ir, { hi: 0x8, lo: null, second: null });
  assert.deepStrictEqual(add.phases[4].state.ir, { hi: 0x8, lo: 0x0, second: null });
});

test('JUN: il secondo byte non è un\'istruzione ma la parte bassa dell\'indirizzo', () => {
  const t = I.trace(I.program(9, 8).rom);
  const w1 = t.cycles[7];
  const w2 = t.cycles[8];
  assert.strictEqual(w1.word, 1);
  assert.strictEqual(w2.word, 2);
  assert.strictEqual(w2.instr.mn, 'JUN');
  assert.strictEqual(w2.addr, 8);
  assert.deepStrictEqual(w2.phases[4].state.ir.second, [0x0, 0x7]);
  assert.strictEqual(w2.after.pc, 7);
  assert.strictEqual(w2.halt, true);
});

test('la pila ha tre livelli: il quarto JMS fa perdere il ritorno più vecchio', () => {
  let st = I.initialState();
  const jms = I.decode(0x50);
  for (let k = 0; k < 4; k++) {
    st.pc = 0x10 * (k + 1);
    st = I.execute(st, jms, 0x80).st;
  }
  assert.deepStrictEqual(st.stack, [0x40, 0x30, 0x20]);
  st = I.execute(st, I.decode(0xc5), 0).st; // BBL 5
  assert.strictEqual(st.pc, 0x40);
  assert.strictEqual(st.acc, 5);
});

test('JCN e ISZ saltano dentro la stessa pagina da 256 byte', () => {
  let st = I.initialState();
  st.pc = 0x1f0; st.cy = 1;
  assert.strictEqual(I.execute(st, I.decode(0x12), 0x34).st.pc, 0x134); // JCN 2: salta se CY = 1
  st.cy = 0;
  assert.strictEqual(I.execute(st, I.decode(0x12), 0x34).st.pc, 0x1f0);
  st.r[3] = 15;
  assert.strictEqual(I.execute(st, I.decode(0x73), 0x00).st.pc, 0x1f0); // ISZ R3: 15 + 1 = 0, niente salto
});
