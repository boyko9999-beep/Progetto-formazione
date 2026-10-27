// Test della logica del laboratorio «Scrivi e cancella la memoria» (capitolo 2): node --test test/memorie.test.js
const test = require('node:test');
const assert = require('node:assert');
const M = require('../js/memorie-core.js');

const FF = new Array(8).fill(0xff);
const ZERO = new Array(8).fill(0x00);

test('stato vergine coerente con i datasheet: PROM 00, EPROM/EEPROM/Flash FF', () => {
  assert.strictEqual(M.blankByte('prom'), 0x00);
  assert.strictEqual(M.blankByte('eprom'), 0xff);
  assert.strictEqual(M.blankByte('eeprom'), 0xff);
  assert.strictEqual(M.blankByte('flash'), 0xff);
  assert.deepStrictEqual(M.createChip('prom').mem, ZERO);
  assert.deepStrictEqual(M.createChip('eprom').mem, FF);
});

test('i motivi hanno 8 righe da un byte', () => {
  for (const k of Object.keys(M.MOTIFS)) {
    assert.strictEqual(M.MOTIFS[k].length, 8, k);
    M.MOTIFS[k].forEach((v) => assert.ok(v >= 0 && v <= 0xff));
  }
});

test('pixel e byte: le memorie a gate flottante invertono, PROM e ROM no', () => {
  assert.deepStrictEqual(M.toBytes('prom', [0x3c]), [0x3c]);
  assert.deepStrictEqual(M.toBytes('rom', [0x3c]), [0x3c]);
  assert.deepStrictEqual(M.toBytes('eprom', [0x3c]), [0xc3]);
  assert.deepStrictEqual(M.toPixels('flash', M.toBytes('flash', M.MOTIFS.cuore)), M.MOTIFS.cuore);
});

test('ROM a maschera: nessun bit si cambia, una maschera nuova cambia tutto il contenuto', () => {
  const rom = M.createChip('rom');
  assert.deepStrictEqual(rom.mem, M.MOTIFS.sorriso);
  const r = M.click(rom, 0, 2);
  assert.strictEqual(r.kind, 'locked');
  assert.deepStrictEqual(r.chip.mem, rom.mem);
  assert.strictEqual(r.changes.length, 0);
  const m = M.newMask(rom, M.MOTIFS.cuore);
  assert.strictEqual(m.kind, 'mask');
  assert.deepStrictEqual(m.chip.mem, M.MOTIFS.cuore);
  assert.strictEqual(m.chip.stats.masks, 1);
  assert.ok(m.changes.length > 0);
  assert.strictEqual(M.writeMotif(rom, M.MOTIFS.cuore).kind, 'locked');
});

test('PROM: bruciare un fusibile porta il bit da 0 a 1, una volta sola', () => {
  const p = M.createChip('prom');
  const r = M.click(p, 3, 7);
  assert.strictEqual(r.kind, 'burn');
  assert.strictEqual(r.chip.mem[3], 0x80);
  assert.deepStrictEqual(r.changes, [{ addr: 3, bit: 7, from: 0, to: 1, phase: 'program' }]);
  const again = M.click(r.chip, 3, 7);
  assert.strictEqual(again.kind, 'fuse-blown');
  assert.strictEqual(again.chip.mem[3], 0x80);
  assert.strictEqual(again.changes.length, 0);
  // il chip di partenza non è stato toccato
  assert.strictEqual(p.mem[3], 0x00);
});

test('PROM: un secondo motivo si somma al primo (si possono solo aggiungere 1)', () => {
  let p = M.writeMotif(M.createChip('prom'), M.MOTIFS.freccia);
  assert.deepStrictEqual(p.chip.mem, M.MOTIFS.freccia);
  assert.strictEqual(p.blocked.length, 0);
  const q = M.writeMotif(p.chip, M.MOTIFS.cuore);
  assert.deepStrictEqual(q.chip.mem, M.MOTIFS.freccia.map((v, i) => v | M.MOTIFS.cuore[i]));
  assert.ok(q.blocked.length > 0, 'i bit della freccia fuori dal cuore restano bruciati');
  q.blocked.forEach(({ addr, bit }) => assert.strictEqual(M.bit(q.chip.mem[addr], bit), 1));
});

test('EPROM: si programma bit per bit (1 → 0), si torna a 1 solo con la luce UV su tutto il chip', () => {
  const e = M.createChip('eprom');
  const r = M.click(e, 0, 0);
  assert.strictEqual(r.kind, 'program');
  assert.strictEqual(r.chip.mem[0], 0xfe);
  assert.strictEqual(M.click(r.chip, 0, 0).kind, 'needs-uv');
  const w = M.writeMotif(r.chip, M.MOTIFS.cuore);
  const uv = M.eraseAll(w.chip);
  assert.strictEqual(uv.kind, 'uv');
  assert.deepStrictEqual(uv.chip.mem, FF);
  assert.strictEqual(uv.changes.length, M.countProgrammed(w.chip));
  assert.ok(uv.changes.every((c) => c.from === 0 && c.to === 1 && c.phase === 'erase'));
  assert.strictEqual(uv.chip.stats.uv, 1);
  assert.throws(() => M.eraseAll(M.createChip('prom')));
});

test('EPROM: senza cancellare, il nuovo motivo si mescola al vecchio', () => {
  const a = M.writeMotif(M.createChip('eprom'), M.MOTIFS.cuore);
  const b = M.writeMotif(a.chip, M.MOTIFS.freccia);
  const atteso = M.toBytes('eprom', M.MOTIFS.cuore.map((v, i) => v | M.MOTIFS.freccia[i]));
  assert.deepStrictEqual(b.chip.mem, atteso);
  assert.ok(b.blocked.length > 0);
});

test('EEPROM: un clic su un bit a 0 cancella e riscrive solo quel byte', () => {
  const e = M.createChip('eeprom');
  const prima = e.mem.slice();
  const { addr, bit } = M.ERRORE;
  assert.strictEqual(M.bit(e.mem[addr], bit), 0, 'il bit di troppo parte a 0');
  const r = M.click(e, addr, bit);
  assert.strictEqual(r.kind, 'byte-rewrite');
  assert.deepStrictEqual(r.rewritten, [addr]);
  assert.strictEqual(M.bit(r.chip.mem[addr], bit), 1);
  for (let a = 0; a < 8; a++) if (a !== addr) assert.strictEqual(r.chip.mem[a], prima[a]);
  // prima la cancellazione del byte, poi la riscrittura degli altri bit a 0
  const fasi = r.changes.map((c) => c.phase);
  assert.ok(fasi.indexOf('program') > fasi.lastIndexOf('erase'));
  assert.ok(r.changes.every((c) => c.addr === addr));
  assert.deepStrictEqual(r.chip.mem, M.targetMemory('eeprom'));
  assert.strictEqual(r.chip.stats.bytes, 1);
});

test('EEPROM: cancellare un byte lo porta a FF e lascia gli altri', () => {
  const e = M.createChip('eeprom');
  const r = M.eraseByte(e, 2);
  assert.strictEqual(r.chip.mem[2], 0xff);
  [0, 1, 3, 4, 5, 6, 7].forEach((a) => assert.strictEqual(r.chip.mem[a], e.mem[a]));
});

test('EEPROM: scrivere un motivo riscrive solo i byte diversi', () => {
  const e = M.createChip('eeprom');
  const r = M.writeMotif(e, M.MOTIFS.sorriso);
  assert.deepStrictEqual(r.rewritten, [M.ERRORE.addr]);
  assert.deepStrictEqual(r.chip.mem, M.targetMemory('eeprom'));
  assert.strictEqual(M.writeMotif(r.chip, M.MOTIFS.sorriso).same, true);
});

test('Flash: un bit a 0 torna a 1 solo cancellando tutto il suo blocco', () => {
  const f = M.createChip('flash');
  const { addr, bit } = M.ERRORE;
  const r = M.click(f, addr, bit);
  assert.strictEqual(r.kind, 'needs-block-erase');
  assert.strictEqual(r.block, 1);
  assert.deepStrictEqual(r.chip.mem, f.mem);
  const er = M.eraseBlock(f, 1);
  for (let a = 4; a < 8; a++) assert.strictEqual(er.chip.mem[a], 0xff);
  for (let a = 0; a < 4; a++) assert.strictEqual(er.chip.mem[a], f.mem[a]);
  assert.deepStrictEqual(M.blockRange(1), [4, 7]);
  assert.strictEqual(M.blockOf(3), 0);
  assert.strictEqual(M.blockOf(4), 1);
  // riscritto il motivo, il sorriso è perfetto
  const w = M.writeMotif(er.chip, M.MOTIFS.sorriso);
  assert.deepStrictEqual(w.chip.mem, M.targetMemory('flash'));
  assert.throws(() => M.eraseBlock(f, 2));
});

test('Flash: senza cancellare il blocco il motivo non corregge il bit di troppo', () => {
  const w = M.writeMotif(M.createChip('flash'), M.MOTIFS.sorriso);
  assert.deepStrictEqual(w.blocked, [{ addr: M.ERRORE.addr, bit: M.ERRORE.bit }]);
  assert.ok(!M.equals(w.chip.mem, M.targetMemory('flash')));
});

test('le celle fuori dalla memoria sono rifiutate', () => {
  assert.throws(() => M.click(M.createChip('prom'), 8, 0));
  assert.throws(() => M.click(M.createChip('prom'), 0, -1));
  assert.throws(() => M.createChip('ram'));
});

test('prova ROM: tentativo e maschera nuova', () => {
  let p = M.newProgress();
  const rom = M.createChip('rom');
  let t = M.track(p, M.click(rom, 1, 1));
  assert.deepStrictEqual(t.progress.rom.steps, [true, false]);
  t = M.track(t.progress, M.newMask(rom, M.MOTIFS.cuore));
  assert.strictEqual(t.completed, 'rom');
  assert.strictEqual(t.progress.rom.done, true);
  assert.strictEqual(t.all, false);
});

test('prova PROM: quattro fusibili e un tentativo di tornare indietro', () => {
  let p = M.newProgress();
  let chip = M.createChip('prom');
  for (let b = 0; b < 4; b++) {
    const r = M.click(chip, 0, b);
    chip = r.chip;
    p = M.track(p, r).progress;
  }
  assert.deepStrictEqual(p.prom.steps, [true, false]);
  const t = M.track(p, M.click(chip, 0, 0));
  assert.strictEqual(t.completed, 'prom');
});

test('prova EPROM: scrivi, cancella con la luce UV, riscrivi', () => {
  let p = M.newProgress();
  let r = M.writeMotif(M.createChip('eprom'), M.MOTIFS.cuore);
  p = M.track(p, r).progress;
  assert.deepStrictEqual(p.eprom.steps, [true, false, false]);
  r = M.eraseAll(r.chip);
  p = M.track(p, r).progress;
  assert.deepStrictEqual(p.eprom.steps, [true, true, false]);
  r = M.writeMotif(r.chip, M.MOTIFS.freccia);
  const t = M.track(p, r);
  assert.strictEqual(t.completed, 'eprom');
});

test('prova EPROM: la luce UV prima di scrivere non conta', () => {
  let p = M.newProgress();
  p = M.track(p, M.eraseAll(M.createChip('eprom'))).progress;
  assert.deepStrictEqual(p.eprom.steps, [false, false, false]);
});

test('prove EEPROM e Flash: si completano solo con il sorriso perfetto', () => {
  let p = M.newProgress();
  const e = M.createChip('eeprom');
  const r = M.click(e, M.ERRORE.addr, M.ERRORE.bit);
  let t = M.track(p, r);
  assert.strictEqual(t.completed, 'eeprom');
  p = t.progress;

  const f = M.createChip('flash');
  t = M.track(p, M.writeMotif(f, M.MOTIFS.sorriso));
  assert.strictEqual(t.completed, null);
  const er = M.eraseBlock(f, 0); // il blocco sbagliato
  t = M.track(t.progress, er);
  assert.deepStrictEqual(t.progress.flash.steps, [false, false]);
  const er1 = M.eraseBlock(er.chip, 1);
  t = M.track(t.progress, er1);
  assert.deepStrictEqual(t.progress.flash.steps, [true, false]);
  t = M.track(t.progress, M.writeMotif(er1.chip, M.MOTIFS.sorriso));
  assert.strictEqual(t.completed, 'flash');
  assert.strictEqual(M.doneCount(t.progress), 2);
});

test('avanzamento salvato: si ricostruisce e scarta i dati non validi', () => {
  const p = M.newProgress();
  p.rom.steps = [true, true];
  const q = M.normalizeProgress(JSON.parse(JSON.stringify(p)));
  assert.strictEqual(q.rom.done, true);
  assert.strictEqual(q.prom.done, false);
  const bad = M.normalizeProgress({ rom: { steps: [true] }, eprom: 'x' });
  assert.deepStrictEqual(bad, M.newProgress());
  assert.deepStrictEqual(M.normalizeProgress(null), M.newProgress());
});
