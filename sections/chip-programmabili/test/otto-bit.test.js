// Test della logica pura del laboratorio "La corsa agli 8 bit": node --test test/otto-bit.test.js
const test = require('node:test');
const assert = require('node:assert');
const O = require('../js/otto-bit-core.js');

test('cinque chip, in ordine di uscita, con i dati principali verificati', () => {
  assert.deepStrictEqual(O.CHIPS.map((c) => c.id), ['8008', '8080', '6800', '6502', 'z80']);
  assert.strictEqual(O.CHIP['8008'].pins, 18);
  for (const id of ['8080', '6800', '6502', 'z80']) assert.strictEqual(O.CHIP[id].pins, 40, id);
  assert.deepStrictEqual(O.CHIP['8080'].supplies, ['+12', '+5', '-5']);
  for (const id of ['6800', '6502', 'z80']) assert.deepStrictEqual(O.CHIP[id].supplies, ['+5'], id);
  assert.strictEqual(O.CHIP['8008'].memKB, 16);
  assert.strictEqual(O.CHIP['8080'].price, 360);
  assert.strictEqual(O.CHIP['6502'].price, 25);
  assert.strictEqual(O.CHIP['8008'].price, 120);
  assert.strictEqual(O.CHIP['z80'].price, null, 'prezzo dello Z80 non verificato: niente cifra');
  assert.strictEqual(O.railsText(O.CHIP['8080']), '+12 V, +5 V e −5 V');
  assert.strictEqual(O.railsText(O.CHIP['6502']), 'solo +5 V');
  assert.strictEqual(O.CHIP['z80'].when, 'luglio 1976');
  assert.ok(O.CHIP['8080'].transistorsMin === 4500 && O.CHIP['8080'].transistors === 6000, '8080: le fonti danno 4.500 o 6.000');
  assert.strictEqual(O.CHIP['6800'].priceApprox, true);
  for (const c of O.CHIPS) {
    assert.ok(c.name && c.when && c.people && c.blurb && c.where, 'testi di ' + c.id);
    assert.ok(c.dip && c.dip.pins === c.pins, 'disegno DIP di ' + c.id);
  }
});

test('numeri all\'italiana', () => {
  assert.strictEqual(O.num(3510), '3.510');
  assert.strictEqual(O.num(65536), '65.536');
  assert.strictEqual(O.dec(20.5, 1), '20,5');
  assert.strictEqual(O.dec(17.2, 1), '17,2');
  assert.strictEqual(O.hex(0x7e), '7E');
});

test('registri: quelli giusti per ogni chip', () => {
  const names = (id) => O.regsOf(id).map((r) => r.label);
  assert.deepStrictEqual(names('8080'), ['A', 'F', 'B', 'C', 'D', 'E', 'H', 'L', 'SP', 'PC']);
  assert.deepStrictEqual(names('6502').filter((n) => n !== '01' && n !== 'pagina zero'), ['A', 'P', 'X', 'Y', 'S', 'PC']);
  assert.deepStrictEqual(names('6800'), ['A', 'CCR', 'B', 'X', 'SP', 'PC']);
  const z = names('z80');
  for (const r of ['A', 'F', 'B', 'C', 'D', 'E', 'H', 'L', 'A′', 'F′', 'B′', 'C′', 'D′', 'E′', 'H′', 'L′', 'IX', 'IY', 'SP', 'PC', 'I', 'R']) assert.ok(z.includes(r), 'Z80: ' + r);
  assert.strictEqual(z.length, 22);
  const reg = (id, k) => O.regsOf(id).find((r) => r.k === k);
  assert.strictEqual(reg('8008', 'PC').bits, 14);
  assert.strictEqual(reg('6502', 'SP').bits, 8);
  assert.strictEqual(reg('6800', 'X').bits, 16);
  assert.strictEqual(reg('6502', 'X').bits, 8);
  assert.strictEqual(reg('8008', 'stack').levels, 7);
  for (const c of O.CHIPS) for (const r of O.regsOf(c.id)) assert.ok(O.regText(c.id, r.k).length > 20, 'descrizione di ' + c.id + '/' + r.k);
});

test('disposizione dei registri: niente sovrapposizioni e tutto dentro il palco', () => {
  for (const mode of ['wide', 'narrow']) {
    for (const c of O.CHIPS) {
      const L = O.layoutRegs(c.id, mode);
      const items = Object.values(L.items);
      assert.strictEqual(items.length, O.regsOf(c.id).length, c.id + ' ' + mode);
      for (const it of items) {
        assert.ok(it.x >= 0 && it.y >= 0 && it.x + it.w <= L.width && it.y + it.h <= L.height, c.id + '/' + it.k + ' dentro (' + mode + ')');
      }
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i];
          const b = items[j];
          const overlap = a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
          assert.ok(!overlap, c.id + ': ' + a.k + ' e ' + b.k + ' si sovrappongono (' + mode + ')');
        }
      }
    }
  }
});

test('disposizione: le caselle comuni restano allo stesso posto', () => {
  for (const mode of ['wide', 'narrow']) {
    const a = O.layoutRegs('8080', mode).items;
    const z = O.layoutRegs('z80', mode).items;
    for (const k of ['A', 'F', 'B', 'C', 'D', 'E', 'H', 'L', 'SP', 'PC']) {
      assert.deepStrictEqual([z[k].x, z[k].y, z[k].w], [a[k].x, a[k].y, a[k].w], k + ' fermo da 8080 a Z80 (' + mode + ')');
    }
    // il 6502 dimezza X e lo stack pointer
    const m = O.layoutRegs('6800', mode).items;
    const s = O.layoutRegs('6502', mode).items;
    assert.strictEqual(s.X.x, m.X.x);
    assert.strictEqual(s.X.w * 2, m.X.w);
    assert.strictEqual(s.SP.w * 2, m.SP.w);
  }
});

test('differenze tra chip, in parole', () => {
  const d = O.diffRegs('8080', 'z80');
  assert.strictEqual(d.added.length, 12);
  assert.deepStrictEqual(d.removed, []);
  const z = O.describeDiff('8080', 'z80').map((x) => x.text).join(' | ');
  assert.match(z, /set alternativo di 8 registri/);
  assert.match(z, /IX e IY: registri indice da 16 bit/);
  assert.match(z, /I e R: registri speciali/);
  const s = O.describeDiff('6800', '6502');
  const txt = s.map((x) => x.text).join(' | ');
  assert.match(txt, /Y: registro indice da 8 bit/);
  assert.match(txt, /B \(accumulatore\)/);
  assert.match(txt, /X passa da 16 a 8 bit/);
  assert.match(txt, /S ha 8 bit/);
  assert.match(txt, /pagina zero/);
  assert.ok(s.every((x) => ['add', 'del', 'mod'].includes(x.kind)));
  const p = O.describeDiff('8008', '8080').map((x) => x.text).join(' | ');
  assert.match(p, /pila interna/);
  assert.match(p, /PC passa da 14 a 16 bit/);
  assert.match(p, /SP: puntatore della pila da 16 bit/);
  assert.match(O.describeDiff('6800', '8008').map((x) => x.text).join(' | '), /SP \(puntatore della pila\)/);
  assert.match(O.describeDiff('8080', '6800').map((x) => x.text).join(' | '), /B diventa un secondo accumulatore/);
  assert.deepStrictEqual(O.describeDiff('6502', '6502'), []);
});

test('prezzi: solo punti verificati, nell\'ordine giusto', () => {
  assert.strictEqual(O.priceAt('8080', 2), null, 'a marzo 1974 l\'8080 non c\'è ancora');
  assert.strictEqual(O.priceAt('8080', 3).p, 360);
  assert.strictEqual(O.priceAt('6800', 10).p, 360);
  assert.strictEqual(O.priceAt('6800', 10).approx, true);
  assert.strictEqual(O.priceAt('6502', 19), null);
  assert.strictEqual(O.priceAt('6502', 20).p, 25);
  assert.strictEqual(O.priceAt('8080', 20).p, 200);
  assert.strictEqual(O.priceAt('8080', 35).p, 200);
  assert.strictEqual(O.priceAt('z80', 35), null, 'nessun prezzo dello Z80');
  assert.strictEqual(O.eventAt(30).event.id, 'z80', 'lo Z80 arriva a luglio 1976');
  assert.strictEqual(O.eventAt(29).event.id, 'm6502');
  assert.strictEqual(O.monthLabel(0), 'gennaio 1974');
  assert.strictEqual(O.monthLabel(20), 'settembre 1975');
  assert.strictEqual(O.monthLabel(35), 'dicembre 1976');
  assert.strictEqual(O.eventAt(0).event, null);
  assert.strictEqual(O.eventAt(3).event.id, 'i8080');
  assert.strictEqual(O.eventAt(25).event.id, 'm6502');
  assert.strictEqual(O.eventAt(25).next.id, 'z80');
  const ts = O.PRICE_EVENTS.map((e) => e.t);
  assert.deepStrictEqual(ts, ts.slice().sort((a, b) => a - b));
});

test('la sfida: byte e cicli dai manuali', () => {
  const t8080 = O.totals('8080', 'zp');
  const t6502 = O.totals('6502', 'zp');
  const tz80 = O.totals('z80', 'zp');
  assert.deepStrictEqual([t8080.bytes, t8080.cycles], [8, 41]);
  assert.deepStrictEqual([t6502.bytes, t6502.cycles], [7, 11]);
  assert.deepStrictEqual([tz80.bytes, tz80.cycles], [8, 43]);
  assert.strictEqual(t8080.us, 20.5);
  assert.strictEqual(t6502.us, 11);
  assert.ok(Math.abs(tz80.us - 17.2) < 1e-9);
  const abs = O.totals('6502', 'abs');
  assert.deepStrictEqual([abs.bytes, abs.cycles], [10, 14]);
  // lo Z80 esegue gli stessi byte dell'8080
  const bytes = (id) => O.program(id, 'zp').flatMap((i) => i.bytes);
  assert.deepStrictEqual(bytes('z80'), bytes('8080'));
  assert.deepStrictEqual(bytes('8080'), [0x21, 0x80, 0x00, 0x7E, 0x23, 0x86, 0x23, 0x77]);
  assert.deepStrictEqual(bytes('6502'), [0x18, 0xA5, 0x80, 0x65, 0x81, 0x85, 0x82]);
  assert.deepStrictEqual(O.program('6502', 'abs').flatMap((i) => i.bytes), [0x18, 0xAD, 0x00, 0x12, 0x6D, 0x01, 0x12, 0x8D, 0x02, 0x12]);
  assert.deepStrictEqual(O.best('bytes', 'zp'), ['6502']);
  assert.deepStrictEqual(O.best('cycles', 'zp'), ['6502']);
  assert.deepStrictEqual(O.best('us', 'zp'), ['6502']);
  assert.deepStrictEqual(O.best('bytes', 'abs'), ['8080', 'z80']);
  assert.deepStrictEqual(O.best('cycles', 'abs'), ['6502']);
});

test('il simulatore esegue l\'ordine giusto e trova la somma', () => {
  for (const id of ['8080', '6502', 'z80']) {
    const n = O.program(id, 'zp').length;
    const r = O.run(id, Array.from({ length: n }, (_, i) => i));
    assert.ok(r.ok, id);
    assert.strictEqual(r.result, 42);
    assert.strictEqual(r.steps.length, n);
    assert.strictEqual(r.bytes, O.totals(id).bytes);
  }
  // sul 6502 CLC può stare anche dopo LDA, purché prima di ADC
  assert.ok(O.run('6502', [1, 0, 2, 3]).ok);
  // i due INX H sono intercambiabili
  assert.ok(O.run('8080', [0, 1, 4, 3, 2, 5]).ok);
  // un programma incompleto non vale
  assert.strictEqual(O.run('6502', [0, 1, 2]).ok, false);
});

test('diagnosi degli errori più comuni', () => {
  assert.strictEqual(O.diagnose('6502', [1, 2, 0, 3]).code, 'carry');
  assert.match(O.diagnose('6502', [1, 2, 0, 3]).text, /43 invece di 42/);
  assert.strictEqual(O.diagnose('6502', [0, 1, 3, 2]).code, 'store-early');
  assert.match(O.diagnose('8080', [0, 1, 2, 5, 3, 4]).text, /MOV M,A ha scritto 23 in 0081h prima della somma: ha cancellato il secondo numero/);
  assert.match(O.diagnose('z80', [0, 1, 5, 2, 3, 4]).text, /LD \(HL\),A ha scritto 23 in 0080h prima della somma: ha cancellato il primo numero/);
  assert.strictEqual(O.diagnose('6502', [0, 2, 1, 3]).code, 'load-late');
  assert.strictEqual(O.diagnose('8080', [1, 0, 2, 3, 4, 5]).code, 'no-pointer');
  assert.strictEqual(O.diagnose('8080', [0, 2, 1, 3, 4, 5]).code, 'bad-load');
  assert.strictEqual(O.diagnose('8080', [0, 1, 3, 2, 4, 5]).code, 'bad-add');
  assert.strictEqual(O.diagnose('z80', [0, 1, 2, 3, 5, 4]).code, 'bad-store');
  assert.match(O.diagnose('z80', [0, 1, 2, 3, 5, 4]).text, /0081h invece che in 0082h/);
  assert.strictEqual(O.diagnose('z80', [0, 1, 2, 5, 3, 4]).code, 'store-early');
  assert.strictEqual(O.diagnose('z80', [0, 1, 2, 4, 3, 5]).code, 'bad-add');
  assert.strictEqual(O.diagnose('8080', [0, 1, 2, 3, 4, 5]).ok, true);
  assert.match(O.diagnose('z80', [1, 0, 2, 3, 4, 5]).text, /LD HL,0080h/);
});

test('il mescolamento non dà mai già la soluzione ed è ripetibile', () => {
  for (const id of ['8080', '6502', 'z80']) {
    for (let seed = 1; seed < 40; seed++) {
      const o = O.shuffled(id, seed);
      assert.strictEqual(o.length, O.program(id).length);
      assert.strictEqual(new Set(o).size, o.length);
      assert.strictEqual(O.run(id, o).ok, false, id + ' seme ' + seed);
    }
    assert.deepStrictEqual(O.shuffled(id, 5), O.shuffled(id, 5));
  }
});

test('racconto dei passi con i valori veri', () => {
  const r = O.run('6502', [0, 1, 2, 3]);
  assert.match(O.narrate('6502', r.steps[0]), /CLC azzera il riporto C \(era 1\)/);
  assert.match(O.narrate('6502', r.steps[2]), /23 \+ 19 \+ 0 = 42/);
  assert.match(O.narrate('6502', r.steps[1]), /pagina zero/);
  const z = O.run('z80', [0, 1, 2, 3, 4, 5]);
  assert.match(O.narrate('z80', z.steps[2]), /T-state in più/);
  assert.match(O.narrate('z80', z.steps[3]), /23 \+ 19 = 42/);
  assert.match(O.narrate('8080', O.run('8080', [0, 1, 2, 3, 4, 5]).steps[5]), /scrive 42 nella cella 0082h/);
});
