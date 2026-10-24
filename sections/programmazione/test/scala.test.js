// Test del laboratorio «La scala dell'astrazione»: codifica x86-64, binario e sommatore.
// node --test sections/programmazione/test/scala.test.js
const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/lab/scala.js');

test('sette livelli, dalla frase in italiano alle porte logiche', () => {
  assert.strictEqual(S.LIVELLI.length, 7);
  assert.deepStrictEqual(S.LIVELLI.map((l) => l.nome),
    ['Linguaggio naturale', 'Python', 'C', 'Assembly x86-64', 'Codice macchina', 'Binario', 'Porte logiche']);
  assert.deepStrictEqual(S.LIVELLI.map((l) => l.anno), ['anni 2020', '1991', '1972', '1978', '1948', '1703', '1937']);
  assert.deepStrictEqual(S.LIVELLI.slice(0, 6).map((l) => l.verso.chi),
    ['persona o IA', 'interprete', 'compilatore', 'assemblatore', 'decodificatore', 'ALU']);
  assert.strictEqual(S.LIVELLI[6].verso, undefined, 'l\'ultimo gradino non ha un traduttore sotto');
  for (const l of S.LIVELLI) {
    for (const k of ['id', 'nome', 'anno', 'anteprima', 'epoca', 'spiega', 'tinta']) assert.ok(l[k], l.id + ': manca ' + k);
    assert.match(l.tinta, /^#[0-9a-f]{6}$/);
    assert.ok(!/<\/?[a-z][^>]*>/i.test(l.spiega + l.epoca), 'niente HTML nei testi');
    for (const m of (l.epoca + ' ' + l.spiega + ' ' + (l.fondo || '')).matchAll(/\]\(([^)]+)\)/g)) {
      assert.match(m[1], /^(#(ia|web|unix|assembly|cavi|logica)|\.\.\/(porte-logiche|elettronica-base)\/index\.html)$/, 'collegamento inatteso: ' + m[1]);
    }
  }
  assert.match(S.LIVELLI[6].fondo, /\.\.\/porte-logiche\/index\.html/);
  assert.match(S.LIVELLI[6].fondo, /\.\.\/elettronica-base\/index\.html/);
});

test('ModRM 05: mod 00, reg 000 (EAX), r/m 101 (RIP + spostamento)', () => {
  assert.deepStrictEqual(S.modrm(0x05), { mod: 0, reg: 0, rm: 5 });
  assert.strictEqual(S.MODRM_RIP, 0x05);
  assert.deepStrictEqual(S.modrm(0xC1), { mod: 3, reg: 0, rm: 1 });
});

test('little-endian a 32 bit, andata e ritorno', () => {
  assert.deepStrictEqual(S.le32(0x300E), [0x0E, 0x30, 0x00, 0x00]);
  assert.deepStrictEqual(S.le32(0x12345678), [0x78, 0x56, 0x34, 0x12]);
  assert.deepStrictEqual(S.le32(-4), [0xFC, 0xFF, 0xFF, 0xFF]);
  for (const n of [0, 1, 0x3004, 0x7fffffff, -1, -0x3004]) assert.strictEqual(S.daLe32(S.le32(n)), n);
});

test('il codice macchina corrisponde al layout di esempio (verificato con GNU as e objdump)', () => {
  const p = S.programma();
  assert.deepStrictEqual(p.map((r) => S.rigaHex(r.byte)), [
    '8B 05 0E 30 00 00',   // 1000: mov eax, [rip+0x300e]  -> 4014 (b)
    '03 05 04 30 00 00',   // 1006: add eax, [rip+0x3004]  -> 4010 (a)
    '89 05 06 30 00 00',   // 100C: mov [rip+0x3006], eax  -> 4018 (x)
  ]);
  assert.deepStrictEqual(p.map((r) => r.indirizzo), [0x1000, 0x1006, 0x100C]);
  for (const r of p) {
    assert.strictEqual(r.byte.length, S.LUNGHEZZA);
    assert.strictEqual(r.byte[1], 0x05);
    assert.strictEqual(r.prossima, r.indirizzo + 6);
    assert.strictEqual(r.bersaglio, S.LAYOUT[r.dato]);
    // spostamento = bersaglio - indirizzo dell'istruzione successiva
    assert.strictEqual(r.spostamento, r.bersaglio - r.prossima);
    assert.strictEqual(S.daLe32(r.byte.slice(2)), r.spostamento);
    assert.strictEqual(r.prossima + r.spostamento, r.bersaglio);
  }
  assert.deepStrictEqual(p.map((r) => r.codiceOp), [0x8B, 0x03, 0x89]);
  assert.deepStrictEqual(p.map((r) => r.dato), ['b', 'a', 'x']);
});

test('la stessa codifica con l\'ordine scritto a mano (prima a, poi b)', () => {
  const ind = S.LAYOUT.codice;
  assert.deepStrictEqual(S.codifica(0x8B, ind, S.LAYOUT.a).byte, [0x8B, 0x05, 0x0A, 0x30, 0x00, 0x00]);
  assert.deepStrictEqual(S.codifica(0x03, ind + 6, S.LAYOUT.b).byte, [0x03, 0x05, 0x08, 0x30, 0x00, 0x00]);
  assert.deepStrictEqual(S.codifica(0x89, ind + 12, S.LAYOUT.x).byte, [0x89, 0x05, 0x06, 0x30, 0x00, 0x00]);
});

test('la riga binaria è l\'istruzione add scritta in base 2', () => {
  const add = S.programma()[1];
  const riga = S.rigaBinaria(add.byte);
  assert.strictEqual(riga, '00000011 00000101 00000100 00110000 00000000 00000000');
  const gruppi = riga.split(' ');
  assert.strictEqual(gruppi.length * 8, 48);
  gruppi.forEach((g, i) => assert.strictEqual(parseInt(g, 2), add.byte[i]));
  assert.deepStrictEqual(S.campi(add.byte).map((c) => c.campo), ['op', 'modrm', 'spost', 'spost', 'spost', 'spost']);
  assert.deepStrictEqual(S.campi(add.byte).map((c) => c.hex), ['03', '05', '04', '30', '00', '00']);
  assert.strictEqual(add.spostamento, 0x3004);
  assert.strictEqual(S.migliaia(add.spostamento), '12.292');
  assert.strictEqual(S.migliaia(999), '999');
  assert.strictEqual(S.migliaia(1234567), '1.234.567');
});

test('il sommatore completo rispetta la tavola di verità e usa 2 XOR, 2 AND, 1 OR', () => {
  assert.deepStrictEqual(S.PORTE, { XOR: 2, AND: 2, OR: 1 });
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) {
    const r = S.sommatoreCompleto(a, b, c);
    assert.strictEqual(r.s + 2 * r.cout, a + b + c, a + '+' + b + '+' + c);
  }
});

test('il sommatore a 4 bit somma correttamente tutte le 256 coppie', () => {
  for (let a = 0; a < 16; a++) {
    for (let b = 0; b < 16; b++) {
      const r = S.sommaRipple(a, b, 4);
      assert.strictEqual(r.somma + 16 * r.riporti[4], a + b, a + ' + ' + b);
      assert.strictEqual(r.overflow, a + b > 15);
      assert.strictEqual(r.passi.length, 4);
      assert.strictEqual(r.riporti.length, 5);
      assert.strictEqual(r.bitS, (a + b & 15).toString(2).padStart(4, '0'));
      r.passi.forEach((p, i) => {
        assert.strictEqual(p.cin, r.riporti[i]);
        assert.strictEqual(p.cout, r.riporti[i + 1]);
        assert.strictEqual(p.s + 2 * p.cout, p.a + p.b + p.cin);
      });
    }
  }
});

test('2 + 3: 0010 + 0011 = 0101, con un solo riporto dal bit 1 al bit 2', () => {
  const r = S.sommaRipple(2, 3, 4);
  assert.strictEqual(r.bitA, '0010');
  assert.strictEqual(r.bitB, '0011');
  assert.strictEqual(r.bitS, '0101');
  assert.strictEqual(r.somma, 5);
  assert.deepStrictEqual(r.riporti, [0, 0, 1, 0, 0]);
  assert.deepStrictEqual(r.passi.map((p) => S.descriviPasso(p, 4)), [
    'Bit 0: 0 + 1 = 1. Scrivo 1.',
    'Bit 1: 1 + 1 = 10 in binario. Scrivo 0 e porto 1 al bit 2.',
    'Bit 2: 0 + 0 + 1 di riporto = 1. Scrivo 1.',
    'Bit 3: 0 + 0 = 0. Scrivo 0.',
  ]);
  assert.strictEqual(S.riepilogo(r), '0010 + 0011 = 0101, cioè 2 + 3 = 5. Il riporto nasce al bit 1 e passa al bit 2.');
  assert.strictEqual(S.LIVELLI[6].anteprima, '0010 + 0011 = 0101');
});

test('riepiloghi e didascalie negli altri casi', () => {
  assert.match(S.riepilogo(S.sommaRipple(15, 1, 4)), /traboccamento \(overflow\)/);
  assert.match(S.riepilogo(S.sommaRipple(4, 2, 4)), /Nessun riporto\./);
  assert.match(S.riepilogo(S.sommaRipple(7, 7, 4)), /I riporti nascono ai bit 0, 1 e 2/);
  assert.strictEqual(S.descriviPasso({ bit: 3, a: 1, b: 1, cin: 1, s: 1, cout: 1, totale: 3 }, 4),
    'Bit 3: 1 + 1 + 1 di riporto = 11 in binario. Scrivo 1 e il riporto esce dal sommatore.');
});

test('valori fuori dai 4 bit vengono rifiutati con un messaggio chiaro', () => {
  assert.throws(() => S.sommaRipple(16, 0, 4), /da 0 a 15/);
  assert.throws(() => S.sommaRipple(-1, 0, 4), RangeError);
  assert.throws(() => S.sommaRipple(1.5, 2, 4), RangeError);
});

test('le anteprime dei gradini 5 e 6 nascono dagli stessi byte', () => {
  const p = S.programma();
  assert.ok(S.LIVELLI[4].anteprima.startsWith(S.rigaHex(p[0].byte)));
  assert.ok(S.LIVELLI[5].anteprima.startsWith(S.rigaBinaria(p[1].byte.slice(0, 3))));
  assert.ok(S.LIVELLI[3].anteprima.startsWith('add eax, DWORD PTR a[rip]'));
});
