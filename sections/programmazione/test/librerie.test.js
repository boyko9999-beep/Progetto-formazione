// Test della CPU giocattolo e del codice Hollerith.
const test = require('node:test');
const assert = require('node:assert');
const CPU = require('../js/lib/cpu-giocattolo.js');
const H = require('../js/lib/hollerith.js');

function esegui(sorgente) {
  const a = CPU.assembla(sorgente);
  assert.deepStrictEqual(a.errori, []);
  return CPU.esegui(CPU.crea(a.parole));
}

test('le parole uniscono 3 bit di codice operativo e 5 di indirizzo', () => {
  assert.strictEqual(CPU.codifica(3, 13), 0b01101101);
  assert.deepStrictEqual(CPU.decodifica(0b01101101), { op: 3, arg: 13, istruzione: CPU.ISA[3] });
  assert.strictEqual(CPU.disassembla(0b01101101), 'ADD 13');
  assert.strictEqual(CPU.disassembla(0), 'HALT');
  assert.strictEqual(CPU.bin(5, 3), '101');
});

test('gli esempi stampano i risultati attesi', () => {
  assert.deepStrictEqual(esegui(CPU.ESEMPI.somma).uscita, [15]);
  assert.deepStrictEqual(esegui(CPU.ESEMPI.conto).uscita, [3, 2, 1]);
  assert.deepStrictEqual(esegui(CPU.ESEMPI.formula).uscita, [14]);
});

test('l\'assemblatore risolve le etichette in avanti e accetta OUT', () => {
  const a = CPU.assembla('  JUMP fine\n  HALT\nfine: LOAD x\n STORE OUT\n HALT\nx: DATA 42');
  assert.ok(a.ok);
  assert.strictEqual(a.simboli.fine, 2);
  assert.strictEqual(a.parole[0], CPU.codifica(6, 2));
  assert.strictEqual(a.parole[3], CPU.codifica(2, 31));
  assert.deepStrictEqual(CPU.esegui(CPU.crea(a.parole)).uscita, [42]);
});

test('l\'assemblatore spiega gli errori riga per riga', () => {
  const a = CPU.assembla('LOAD\nPIPPO 3\nADD nessuno\nHALT 4\nDATA 300\nx: DATA 1\nx: DATA 2');
  assert.strictEqual(a.ok, false);
  assert.deepStrictEqual(a.errori.map((e) => e.riga), [1, 2, 3, 4, 5, 7]);
});

test('un programma troppo lungo non invade la cella di uscita', () => {
  const a = CPU.assembla(new Array(32).fill('DATA 1').join('\n'));
  assert.strictEqual(a.ok, false);
  assert.ok(a.errori.some((e) => /troppo lungo/.test(e.messaggio)));
});

test('aritmetica a 8 bit: si gira intorno a 256', () => {
  const st = esegui('LOAD a\nSUB b\nSTORE OUT\nHALT\na: DATA 1\nb: DATA 2');
  assert.deepStrictEqual(st.uscita, [255]);
});

test('passo() racconta il ciclo prelievo, decodifica, esecuzione', () => {
  const st = CPU.crea(CPU.assembla(CPU.ESEMPI.formula).parole);
  const ev = CPU.passo(st);
  assert.strictEqual(ev.nome, 'LOAD');
  assert.strictEqual(ev.indirizzo, 0);
  assert.strictEqual(st.pc, 1);
  assert.deepStrictEqual(CPU.fasi(ev).map((f) => f.fase), ['prelievo', 'decodifica', 'esecuzione']);
});

test('Hollerith: cifre, lettere e simboli della IBM 029', () => {
  assert.deepStrictEqual(H.fori('7'), [7]);
  assert.deepStrictEqual(H.fori('A'), [12, 1]);
  assert.deepStrictEqual(H.fori('J'), [11, 1]);
  assert.deepStrictEqual(H.fori('S'), [0, 2]);
  assert.deepStrictEqual(H.fori('Z'), [0, 9]);
  assert.deepStrictEqual(H.fori('='), [6, 8]);
  assert.deepStrictEqual(H.fori('('), [12, 5, 8]);
  assert.deepStrictEqual(H.fori(' '), []);
  assert.strictEqual(H.fori('~'), null);
});

test('Hollerith: dai fori al carattere e ritorno', () => {
  for (const c of 'CIAO, MONDO = (A+B)*2.') assert.strictEqual(H.carattere(H.fori(c)), c);
  assert.strictEqual(H.carattere([1, 12]), 'A');
  assert.strictEqual(H.carattere([1, 2, 3]), null);
});

test('Hollerith: una scheda ha 80 colonne, in maiuscolo e senza accenti', () => {
  const s = H.scheda('perché è così');
  assert.strictEqual(s.length, 80);
  assert.strictEqual(s.slice(0, 13).map((c) => c.carattere).join(''), 'PERCHE E COSI');
});
