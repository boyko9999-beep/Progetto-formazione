// Capitolo 7 · test della logica programmabile (PAL, LUT, bitstream): node --test test/logica-programmabile.test.js
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/logica-programmabile-core.js');

const ALL3 = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => L.comboInputs(i, 3));

/* ---------- PAL ---------- */

test('una PAL vergine ha tutti i fusibili intatti e ogni riga vale 0 (contiene A e non A)', () => {
  const p = L.blankPal();
  assert.strictEqual(p.length, L.PAL_ROWS);
  assert.ok(p.every((row) => row.length === L.PAL_COLS && row.every(Boolean)));
  for (const ins of ALL3) {
    const r = L.palEval(p, ins);
    assert.deepStrictEqual(r.products, [0, 0, 0, 0]);
    assert.strictEqual(r.out, 0);
  }
  assert.strictEqual(L.termInfo(p[0]).kind, 'zero');
  assert.strictEqual(L.termInfo(p[0]).conflict, 'A');
  assert.strictEqual(L.palasm(p), 'USCITA = 0');
});

test('una riga con tutti i fusibili bruciati vale sempre 1 (prodotto vuoto)', () => {
  const p = L.blankPal();
  p[2] = p[2].map(() => false);
  assert.strictEqual(L.termInfo(p[2]).kind, 'one');
  assert.deepStrictEqual(L.palTable(p), [1, 1, 1, 1, 1, 1, 1, 1]);
  assert.strictEqual(L.palasm(p), 'USCITA = 1');
});

test('le colonne portano gli ingressi e le loro negazioni', () => {
  assert.deepStrictEqual(L.colInfo(3), { input: 1, neg: true, name: 'B' });
  const ins = [1, 0, 1];
  assert.deepStrictEqual([0, 1, 2, 3, 4, 5].map((c) => L.literal(c, ins)), [1, 0, 0, 1, 1, 0]);
});

test('comboInputs e comboIndex leggono la combinazione come numero binario (A più significativo)', () => {
  assert.deepStrictEqual(L.comboInputs(6, 3), [1, 1, 0]);
  assert.deepStrictEqual(L.comboInputs(1, 3), [0, 0, 1]);
  for (let i = 0; i < 8; i++) assert.strictEqual(L.comboIndex(L.comboInputs(i, 3)), i);
});

test('un termine prodotto fa l\'AND solo dei fusibili rimasti intatti', () => {
  const p = L.palFromTerms(['A * /B']);
  assert.deepStrictEqual(p[0], [true, false, false, true, false, false]);
  assert.strictEqual(L.productValue(p[0], [1, 0, 0]), 1);
  assert.strictEqual(L.productValue(p[0], [1, 0, 1]), 1, 'C non è collegato: non conta');
  assert.strictEqual(L.productValue(p[0], [1, 1, 0]), 0);
  assert.deepStrictEqual(L.termInfo(p[0]).literals, [{ name: 'A', neg: false }, { name: 'B', neg: true }]);
});

test('XOR come somma di prodotti risolve la sfida xor', () => {
  const p = L.palFromTerms(['A * /B', '/A * B']);
  const res = L.checkPal(p, 'xor');
  assert.ok(res.ok, JSON.stringify(res));
  assert.strictEqual(res.right, 8);
  assert.strictEqual(L.palasm(p), 'USCITA = A * /B + /A * B');
});

test('una soluzione sbagliata riporta le combinazioni da correggere', () => {
  const p = L.palFromTerms(['A * B']); // è l'allarme, non lo XOR
  const res = L.checkPal(p, 'xor');
  assert.strictEqual(res.ok, false);
  // XOR vale 1 per AB = 01 e 10, la PAL invece per AB = 11
  assert.deepStrictEqual(res.mismatches, [2, 3, 4, 5, 6, 7]);
  assert.ok(L.checkPal(p, 'allarme').ok);
});

test('maggioranza con tre prodotti di due ingressi', () => {
  const p = L.palFromTerms(['A * B', 'A * C', 'B * C']);
  assert.ok(L.checkPal(p, 'maggioranza').ok);
  assert.deepStrictEqual(L.palTable(p), [0, 0, 0, 1, 0, 1, 1, 1]);
});

test('la parità a tre ingressi usa tutte e quattro le righe', () => {
  const p = L.palFromTerms(['A * /B * /C', '/A * B * /C', '/A * /B * C', 'A * B * C']);
  assert.ok(L.checkPal(p, 'parita').ok);
  assert.throws(() => L.palFromTerms(['A', 'B', 'C', 'A * B', 'B * C']), /Troppi termini/);
});

test('ogni sfida ha una soluzione con i mintermini che sta nelle quattro righe', () => {
  for (const ch of L.challenges) {
    const p = L.mintermSolution(ch.fn);
    assert.ok(L.checkPal(p, ch).ok, ch.id);
    assert.ok(ch.rows <= L.PAL_ROWS, ch.id);
  }
});

test('le soluzioni equivalenti passano la verifica (si confrontano le tabelle di verità)', () => {
  // A·B scritto con due righe ridondanti: A·B·C + A·B·/C
  const p = L.palFromTerms(['A * B * C', 'A * B * /C']);
  assert.ok(L.checkPal(p, 'allarme').ok);
  assert.strictEqual(L.burntCount(p), 3 + 3, 'due righe usate con 3 fusibili bruciati ciascuna, due righe vergini');
});

test('clonePal copia davvero', () => {
  const a = L.blankPal();
  const b = L.clonePal(a);
  b[0][0] = false;
  assert.strictEqual(a[0][0], true);
});

/* ---------- LUT ---------- */

test('l\'indirizzo della LUT è D C B A in binario', () => {
  assert.strictEqual(L.lutIndex([1, 0, 1, 0]), 5);
  assert.strictEqual(L.lutIndex([1, 1, 1, 1]), 15);
  for (let i = 0; i < 16; i++) assert.strictEqual(L.lutIndex(L.lutInputs(i)), i);
});

test('la LUT legge il bit dell\'indirizzo formato dagli ingressi', () => {
  const bits = new Array(16).fill(0);
  bits[9] = 1; // D=1 C=0 B=0 A=1
  assert.strictEqual(L.lutRead(bits, [1, 0, 0, 1]), 1);
  assert.strictEqual(L.lutRead(bits, [1, 0, 0, 0]), 0);
});

test('i preset: AND solo il bit 15, OR tutti tranne lo 0, XOR la parità, maggioranza almeno 3 su 4', () => {
  const P = L.lutPresets;
  assert.deepStrictEqual(P.and.map((b, i) => (b ? i : -1)).filter((i) => i >= 0), [15]);
  assert.strictEqual(P.or[0], 0);
  assert.strictEqual(P.or.reduce((a, b) => a + b, 0), 15);
  assert.strictEqual(P.xor.reduce((a, b) => a + b, 0), 8);
  assert.strictEqual(P.xor[7], 1);
  assert.strictEqual(P.xor[3], 0);
  assert.deepStrictEqual(P.maggioranza.map((b, i) => (b ? i : -1)).filter((i) => i >= 0), [7, 11, 13, 14, 15]);
  assert.strictEqual(L.lutPresetName(P.xor.slice()), 'xor');
  assert.strictEqual(L.lutPresetName(new Array(16).fill(0)), null);
});

test('il percorso nell\'albero di multiplexer segue i bit dell\'indirizzo', () => {
  const path = L.lutPath(5); // 0101
  assert.deepStrictEqual(path.map((p) => p.side), [1, 0, 1, 0]);
  assert.deepStrictEqual(path.map((p) => p.mux), [2, 1, 0, 0]);
  assert.deepStrictEqual(path.map((p) => p.level), [1, 2, 3, 4]);
});

test('l\'albero di multiplexer dà lo stesso risultato della lettura diretta', () => {
  const bits = L.lutFromFn((a, b, c, d) => (a & !b) | (c & d));
  for (let i = 0; i < 16; i++) {
    const ins = L.lutInputs(i);
    const lv = L.muxLevels(bits, ins);
    assert.deepStrictEqual(lv.map((x) => x.length), [16, 8, 4, 2, 1]);
    assert.strictEqual(lv[4][0], L.lutRead(bits, ins), 'indirizzo ' + i);
  }
});

test('le sfide della LUT si verificano bit per bit', () => {
  const chiavi = new Array(16).fill(0);
  [3, 7, 11, 15].forEach((i) => { chiavi[i] = 1; });
  assert.ok(L.checkLut(chiavi, 'chiavi').ok);
  const r = L.checkLut(L.lutPresets.and, 'chiavi');
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(r.mismatches, [3, 7, 11]);
  assert.ok(L.checkLut(L.lutPresets.xor, 'parita4').ok, 'la parità di 4 è il preset XOR');
  assert.strictEqual(L.checkLut(L.lutPresets.maggioranza, 'maggioranza3').ok, false, 'maggioranza di 4 non è maggioranza di 3');
});

test('copiare la PAL nella LUT ripete la tabella per D = 0 e D = 1', () => {
  const p = L.palFromTerms(['A * B', 'A * C', 'B * C']);
  const bits = L.palToLut(p);
  assert.deepStrictEqual(bits.slice(0, 8), bits.slice(8));
  assert.ok(L.checkLut(bits, 'maggioranza3').ok);
  assert.ok(L.checkLut(L.palToLut(L.palFromTerms(['A * B'])), 'chiavi').ok);
});

/* ---------- bitstream ---------- */

test('il bitstream ha 64 bit: 8 per ogni blocco e 16 per i collegamenti', () => {
  assert.strictEqual(L.BITSTREAM_LENGTH, 64);
  for (const name of Object.keys(L.designs)) {
    const bits = L.buildBitstream(name);
    assert.strictEqual(bits.length, 64, name);
    assert.ok(bits.every((b) => b === 0 || b === 1), name);
  }
  assert.deepStrictEqual(L.bitTarget(0), { kind: 'lut', clb: 0, bit: 0 });
  assert.deepStrictEqual(L.bitTarget(47), { kind: 'lut', clb: 5, bit: 7 });
  assert.deepStrictEqual(L.bitTarget(48), { kind: 'link', link: 0 });
  assert.deepStrictEqual(L.bitTarget(63), { kind: 'link', link: 15 });
});

test('due progetti, due bitstream diversi per lo stesso chip', () => {
  const a = L.buildBitstream('sommatore');
  const b = L.buildBitstream('allarme');
  assert.notDeepStrictEqual(a, b);
  assert.strictEqual(L.identifyDesign(L.parseBitstream(a)), 'sommatore');
  assert.strictEqual(L.identifyDesign(L.parseBitstream(b)), 'allarme');
  assert.strictEqual(L.identifyDesign(L.parseBitstream(new Array(64).fill(0))), null);
  assert.throws(() => L.buildBitstream('nessuno'), /sconosciuto/);
});

test('ogni uscita e ogni ingresso di blocco ha al più un collegamento attivo per progetto', () => {
  for (const name of Object.keys(L.designs)) {
    const sinks = L.designs[name].links.map((i) => L.FABRIC.links[i].to);
    assert.strictEqual(new Set(sinks).size, sinks.length, name);
  }
});

test('configurata col primo bitstream la FPGA è un sommatore completo', () => {
  const cfg = L.parseBitstream(L.buildBitstream('sommatore'));
  for (const [A, B, C] of ALL3) {
    const r = L.simulate(cfg, { A: A, B: B, C: C });
    const sum = A + B + C;
    assert.strictEqual(r.outputs.O1, sum & 1, 'somma ' + A + B + C);
    assert.strictEqual(r.outputs.O2, sum >> 1, 'riporto ' + A + B + C);
  }
  assert.deepStrictEqual(L.simulate(cfg, {}).used, [true, false, false, true, false, false]);
});

test('col secondo bitstream gli stessi blocchi diventano un allarme', () => {
  const cfg = L.parseBitstream(L.buildBitstream('allarme'));
  for (const [A, B, C] of ALL3) {
    const r = L.simulate(cfg, { A: A, B: B, C: C });
    assert.strictEqual(r.outputs.O1, (A & B) | C, 'sirena ' + A + B + C);
    assert.strictEqual(r.outputs.O2, 1 - B, 'spia ' + A + B + C);
  }
});

test('senza configurazione le uscite non sono pilotate', () => {
  const r = L.simulate(L.parseBitstream(null), { A: 1, B: 1, C: 1 });
  assert.deepStrictEqual(r.outputs, { O1: null, O2: null });
  assert.ok(r.used.every((u) => !u));
});

test('un bitstream caricato a metà non basta: le uscite restano scollegate', () => {
  const bits = L.buildBitstream('sommatore');
  const half = bits.map((b, i) => (i < 48 ? b : null));
  const r = L.simulate(L.parseBitstream(half), { A: 1, B: 0, C: 0 });
  assert.deepStrictEqual(r.outputs, { O1: null, O2: null });
});

test('le LUT a 3 ingressi dei blocchi hanno il nome giusto', () => {
  assert.deepStrictEqual(L.LUT3.xor3, [0, 1, 1, 0, 1, 0, 0, 1]);
  assert.deepStrictEqual(L.LUT3.maj3, [0, 0, 0, 1, 0, 1, 1, 1]);
  assert.strictEqual(L.lut3Name([0, 0, 0, 1, 0, 0, 0, 1]), 'and2');
  assert.strictEqual(L.lut3Name([0, 0, 0, 0, 0, 0, 0, 0]), null);
  assert.strictEqual(L.lut3Name([1, 1, 0, 0, 0, 0, 0, 0]), 'custom');
});
