// Capitolo 4 · test della CPU didattica CPU-8 (logica pura): node --test test/ciclo.test.js
const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/ciclo-core.js');

function program(lines) {
  const asm = C.assemble(lines.join('\n'));
  assert.deepStrictEqual(asm.errors, [], 'il programma di prova deve assemblarsi senza errori');
  return C.create(asm.bytes);
}

function keys(events) { return events.map((e) => e.key); }

/* ---------- programmi d'esempio ---------- */

test('i quattro programmi d\'esempio si assemblano senza errori e stanno in 16 byte', () => {
  assert.strictEqual(C.EXAMPLES.length, 4);
  for (const ex of C.EXAMPLES) {
    const asm = C.assemble(ex.source);
    assert.deepStrictEqual(asm.errors, [], ex.id);
    assert.strictEqual(asm.bytes.length, 16, ex.id);
    asm.bytes.forEach((b) => assert.ok(b >= 0 && b <= 255));
  }
});

test('somma: 28 + 14 = 42 in 4 istruzioni e 19 cicli', () => {
  const ex = C.loadExample('somma');
  assert.deepStrictEqual(ex.bytes.slice(0, 4), [0x1e, 0x2f, 0xe0, 0xf0]);
  assert.strictEqual(ex.bytes[14], 28);
  assert.strictEqual(ex.bytes[15], 14);
  const s = C.create(ex.bytes);
  const r = C.run(s);
  assert.strictEqual(r.halted, true);
  assert.deepStrictEqual(r.outputs, [42]);
  assert.strictEqual(r.instructions, 4);
  assert.strictEqual(r.cycles, 5 + 6 + 4 + 4);
  assert.deepStrictEqual(ex.expected, [42]);
});

test('conto alla rovescia: 5, 4, 3, 2, 1, 0 grazie a JZ', () => {
  const r = C.run(C.create(C.loadExample('rovescia').bytes));
  assert.strictEqual(r.halted, true);
  assert.deepStrictEqual(r.outputs, [5, 4, 3, 2, 1, 0]);
});

test('moltiplicazione: 3 × 13 = 39 con somme ripetute e JC', () => {
  const ex = C.loadExample('moltiplica');
  const s = C.create(ex.bytes);
  const r = C.run(s);
  assert.strictEqual(r.halted, true);
  assert.deepStrictEqual(r.outputs, [39]);
  assert.strictEqual(s.ram[13], 39, 'il prodotto resta nella cella 13');
  assert.strictEqual(s.ram[14], 0, 'il contatore è arrivato a zero');
});

test('moltiplicazione con altri fattori: 7 × 9 = 63, e 0 × 13 = 0', () => {
  const ex = C.loadExample('moltiplica');
  const a = ex.bytes.slice(); a[14] = 7; a[15] = 9;
  assert.deepStrictEqual(C.run(C.create(a)).outputs, [63]);
  const b = ex.bytes.slice(); b[14] = 0;
  assert.deepStrictEqual(C.run(C.create(b)).outputs, [0]);
});

test('Fibonacci: si ferma quando la somma supera 8 bit (riporto)', () => {
  const s = C.create(C.loadExample('fibonacci').bytes);
  const r = C.run(s);
  assert.strictEqual(r.halted, true);
  assert.deepStrictEqual(r.outputs, [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233]);
  assert.strictEqual(s.c, true, '144 + 233 = 377 non sta in un byte');
  assert.strictEqual(s.a, 377 - 256);
});

test('modificare un byte cambia l\'uscita (l\'obiettivo del laboratorio)', () => {
  const ex = C.loadExample('somma');
  const bytes = ex.bytes.slice();
  bytes[15] = 20;
  const r = C.run(C.create(bytes));
  assert.deepStrictEqual(r.outputs, [48]);
  assert.strictEqual(C.sameOutputs(r.outputs, ex.expected), false);
  assert.strictEqual(C.sameOutputs([42], ex.expected), true);
  assert.strictEqual(C.sameOutputs([], ex.expected), false);
});

/* ---------- micro-passi ---------- */

test('ogni istruzione comincia con PC → MAR, RAM → IR e decodifica', () => {
  const s = program(['0: ADD 15', '1: HLT', '15: 7']);
  const ev = C.instruction(s);
  assert.deepStrictEqual(keys(ev), ['pc>mar', 'ram>ir', 'decode', 'ir>mar', 'ram>b', 'add']);
  assert.deepStrictEqual(ev.map((e) => e.phase), ['prendi', 'prendi', 'decodifica', 'esegui', 'esegui', 'esegui']);
  assert.deepStrictEqual(ev[0].signals, ['CO', 'MI']);
  assert.deepStrictEqual(ev[1].signals, ['RO', 'II', 'CE']);
  assert.deepStrictEqual(ev[5].signals, ['EO', 'AI', 'FI']);
  assert.strictEqual(ev[5].end, true);
  assert.strictEqual(ev[0].instr.text, null, 'prima della decodifica l\'istruzione non è nota');
  assert.strictEqual(ev[2].instr.text, 'ADD 15');
  assert.strictEqual(s.a, 7);
  assert.strictEqual(s.b, 7);
});

test('il PC avanza durante la lettura, e il bus porta i valori giusti', () => {
  const s = program(['0: LDA 9', '9: 200']);
  const ev = C.instruction(s);
  assert.deepStrictEqual(ev[0].moves, [{ from: 'pc', to: 'mar', bus: 'addr', value: 0, bits: 4 }]);
  assert.strictEqual(ev[1].moves[0].value, 0x19);
  assert.strictEqual(ev[1].next.pc, 1);
  assert.strictEqual(ev[1].prev.pc, 0);
  assert.deepStrictEqual(ev[3].moves[0], { from: 'ir', to: 'mar', bus: 'addr', value: 9, bits: 4 });
  assert.strictEqual(ev[4].moves[0].value, 200);
  assert.strictEqual(s.a, 200);
});

test('cicli per istruzione: da 3 (NOP) a 6 (ADD e SUB)', () => {
  const expected = { NOP: 3, LDA: 5, ADD: 6, SUB: 6, STA: 5, LDI: 4, JMP: 4, JC: 4, JZ: 4, OUT: 4, HLT: 4 };
  for (const d of C.ISA) assert.strictEqual(C.cyclesOf(d.op << 4), expected[d.mn], d.mn);
  // e il simulatore li rispetta davvero
  for (const d of C.ISA) {
    const s = C.create([d.op << 4]);
    const ev = C.instruction(s);
    assert.strictEqual(ev.length, expected[d.mn], d.mn);
    assert.strictEqual(s.cycles, expected[d.mn], d.mn);
  }
});

test('i codici non usati (da 1001 a 1101) si comportano come NOP', () => {
  for (let op = 9; op <= 13; op++) {
    const s = C.create([op << 4 | 3, 0xf0]);
    const ev = C.instruction(s);
    assert.strictEqual(ev.length, 3);
    assert.strictEqual(s.a, 0);
    assert.strictEqual(s.pc, 1);
    assert.strictEqual(C.decode(op << 4).defined, false);
    assert.strictEqual(C.disassemble(op << 4), '—');
  }
});

/* ---------- ALU e flag ---------- */

test('ADD: il riporto si accende oltre 255 e il risultato ricomincia da zero', () => {
  const s = program(['0: LDA 14', '1: ADD 15', '2: HLT', '14: 200', '15: 100']);
  C.run(s);
  assert.strictEqual(s.a, 44);
  assert.strictEqual(s.c, true);
  assert.strictEqual(s.z, false);
  const t = program(['0: LDA 14', '1: ADD 15', '2: HLT', '14: 200', '15: 56']);
  C.run(t);
  assert.strictEqual(t.a, 0);
  assert.strictEqual(t.c, true);
  assert.strictEqual(t.z, true, '200 + 56 = 256: in 8 bit resta 0');
});

test('SUB: C = 1 vuol dire nessun prestito (A ≥ B), Z = 1 se il risultato è zero', () => {
  const eq = program(['0: LDI 7', '1: SUB 15', '2: HLT', '15: 7']);
  C.run(eq);
  assert.deepStrictEqual([eq.a, eq.z, eq.c], [0, true, true]);
  const less = program(['0: LDI 3', '1: SUB 15', '2: HLT', '15: 5']);
  C.run(less);
  assert.deepStrictEqual([less.a, less.z, less.c], [254, false, false]);
  const more = program(['0: LDI 9', '1: SUB 15', '2: HLT', '15: 5']);
  C.run(more);
  assert.deepStrictEqual([more.a, more.z, more.c], [4, false, true]);
});

test('i flag cambiano solo con ADD e SUB', () => {
  const s = program(['0: LDI 0', '1: SUB 15', '2: LDI 5', '3: OUT', '4: HLT', '15: 1']);
  C.run(s);
  // 0 - 1 = 255 con prestito: C = 0, Z = 0; LDI e OUT non li toccano
  assert.deepStrictEqual([s.a, s.z, s.c], [5, false, false]);
});

/* ---------- salti ---------- */

test('JMP scrive l\'operando nel PC', () => {
  const s = program(['0: JMP 5', '5: LDI 9', '6: OUT', '7: HLT']);
  const ev = C.instruction(s);
  assert.strictEqual(ev[3].key, 'jmp');
  assert.strictEqual(ev[3].taken, true);
  assert.strictEqual(s.pc, 5);
  assert.deepStrictEqual(C.run(s).outputs, [9]);
});

test('JZ e JC saltano solo se il flag è acceso', () => {
  const zTaken = program(['0: LDI 4', '1: SUB 15', '2: JZ 6', '3: LDI 1', '4: OUT', '5: HLT', '6: LDI 2', '7: OUT', '8: HLT', '15: 4']);
  assert.deepStrictEqual(C.run(zTaken).outputs, [2]);
  const zNot = program(['0: LDI 5', '1: SUB 15', '2: JZ 6', '3: LDI 1', '4: OUT', '5: HLT', '6: LDI 2', '7: OUT', '8: HLT', '15: 4']);
  assert.deepStrictEqual(C.run(zNot).outputs, [1]);

  const cNot = program(['0: LDI 3', '1: SUB 15', '2: JC 6', '3: LDI 1', '4: OUT', '5: HLT', '6: LDI 2', '7: OUT', '8: HLT', '15: 4']);
  const ev = [];
  while (!cNot.halted) ev.push(C.step(cNot));
  const jc = ev.find((e) => e.key === 'jc');
  assert.strictEqual(jc.taken, false);
  assert.deepStrictEqual(jc.signals, [], 'salto non preso: nessun segnale');
  assert.deepStrictEqual(jc.moves, []);
  assert.deepStrictEqual(cNot.outputs, [1]);
});

test('HLT ferma il clock: dopo, step non fa più nulla', () => {
  const s = program(['0: HLT', '1: LDI 7', '2: OUT']);
  const ev = C.instruction(s);
  assert.strictEqual(ev[3].key, 'hlt');
  assert.strictEqual(ev[3].halted, true);
  assert.strictEqual(s.halted, true);
  const cycles = s.cycles;
  assert.strictEqual(C.step(s), null);
  assert.strictEqual(s.cycles, cycles);
  assert.deepStrictEqual(s.outputs, []);
});

test('un programma senza HLT si ferma al limite di cicli', () => {
  const s = C.create([0x60]); // JMP 0
  const r = C.run(s, 500);
  assert.strictEqual(r.halted, false);
  assert.strictEqual(r.cycles, 500);
});

test('STA scrive in memoria e il PC riparte da 0 dopo la cella 15', () => {
  const s = program(['0: LDI 9', '1: STA 13', '2: JMP 15', '15: NOP']);
  C.instruction(s); C.instruction(s);
  assert.strictEqual(s.ram[13], 9);
  C.instruction(s); C.instruction(s);
  assert.strictEqual(s.pc, 0, 'dopo la cella 15 il contatore a 4 bit torna a 0');
});

/* ---------- assemblatore e disassemblatore ---------- */

test('disassemblatore', () => {
  assert.strictEqual(C.disassemble(0x2f), 'ADD 15');
  assert.strictEqual(C.disassemble(0x1e), 'LDA 14');
  assert.strictEqual(C.disassemble(0x55), 'LDI 5');
  assert.strictEqual(C.disassemble(0xe0), 'OUT');
  assert.strictEqual(C.disassemble(0xf0), 'HLT');
  assert.strictEqual(C.disassemble(0x00), 'NOP');
  assert.strictEqual(C.decode(0x2f).op, 2);
  assert.strictEqual(C.decode(0x2f).arg, 15);
});

test('assemblatore di una riga: numeri, maiuscole, esadecimale e binario', () => {
  assert.deepStrictEqual(C.assembleLine('ADD 15'), { ok: true, byte: 0x2f, kind: 'instr' });
  assert.deepStrictEqual(C.assembleLine('  add 0xF ; commento'), { ok: true, byte: 0x2f, kind: 'instr' });
  assert.deepStrictEqual(C.assembleLine('jz 0b0101'), { ok: true, byte: 0x85, kind: 'instr' });
  assert.deepStrictEqual(C.assembleLine('out'), { ok: true, byte: 0xe0, kind: 'instr' });
  assert.deepStrictEqual(C.assembleLine('28'), { ok: true, byte: 28, kind: 'data' });
  assert.deepStrictEqual(C.assembleLine('0x1C'), { ok: true, byte: 28, kind: 'data' });
  assert.deepStrictEqual(C.assembleLine('0b00011100'), { ok: true, byte: 28, kind: 'data' });
});

test('assemblatore: errori chiari', () => {
  for (const bad of ['', 'LDA', 'LDA 16', 'OUT 3', 'FOO 1', '256', 'ADD x', 'ADD 1 2']) {
    const r = C.assembleLine(bad);
    assert.strictEqual(r.ok, false, bad);
    assert.ok(r.error.length > 10, bad);
  }
  const dup = C.assemble('0: NOP\n0: HLT');
  assert.strictEqual(dup.errors.length, 1);
  const long = C.assemble(Array.from({ length: 17 }, () => 'NOP').join('\n'));
  assert.strictEqual(long.errors.length, 1);
  const badAddr = C.assemble('16: NOP');
  assert.strictEqual(badAddr.errors.length, 1);
});

test('assemblatore e disassemblatore sono uno l\'inverso dell\'altro', () => {
  for (const d of C.ISA) {
    const args = d.arg ? [0, 7, 15] : [0];
    for (const a of args) {
      const byte = (d.op << 4) | a;
      const back = C.assembleLine(C.disassemble(byte));
      assert.strictEqual(back.ok, true, d.mn);
      assert.strictEqual(back.byte, byte, d.mn + ' ' + a);
    }
  }
});

test('assemble conserva i commenti come note delle celle', () => {
  const asm = C.assemble('0: LDA 14 ; A = primo numero\nOUT\n14: 3 ; dato');
  assert.deepStrictEqual(asm.errors, []);
  assert.strictEqual(asm.notes[0], 'A = primo numero');
  assert.strictEqual(asm.bytes[1], 0xe0, 'senza indirizzo si prosegue dalla cella successiva');
  assert.strictEqual(asm.notes[14], 'dato');
  assert.strictEqual(asm.used[2], false);
  assert.deepStrictEqual([asm.kinds[0], asm.kinds[1], asm.kinds[2], asm.kinds[14]], ['instr', 'instr', null, 'data']);
  // gli esempi distinguono istruzioni e dati (il laboratorio mostra i dati come numeri)
  const ex = C.loadExample('somma');
  assert.deepStrictEqual(ex.kinds.slice(0, 4), ['instr', 'instr', 'instr', 'instr']);
  assert.deepStrictEqual([ex.kinds[14], ex.kinds[15]], ['data', 'data']);
});

test('parola di controllo: 16 segnali con sigle uniche, tutti usati dai micro-passi', () => {
  const ids = C.SIGNALS.map((s) => s.id);
  assert.strictEqual(new Set(ids).size, 16);
  const used = new Set(Object.values(C.MICRO).flatMap((m) => m.signals));
  for (const id of ids) assert.ok(used.has(id), id);
  for (const id of used) assert.ok(ids.includes(id), id);
});
