// Test del laboratorio «La perforatrice IBM 029» (capitolo 6): la scheda e i suoi campi, i fori
// di ogni carattere, il mazzo FORTRAN, la selezionatrice e il piccolo compilatore simulato.
// node --test sections/programmazione/test/scheda-perforata.test.js
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/lab/scheda-perforata.js');

const mazzo = (ordine) => ordine.map((i) => L.immagine(L.MAZZO[i]));

test('la scheda: 80 colonne, 12 righe, i quattro campi FORTRAN senza buchi', () => {
  assert.strictEqual(L.COLONNE, 80);
  assert.deepStrictEqual(L.RIGHE, [12, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (let c = 1; c <= 80; c++) assert.ok(L.campo(c), 'colonna ' + c);
  assert.strictEqual(L.campo(0), null);
  assert.strictEqual(L.campo(81), null);
  assert.deepStrictEqual([1, 5, 6, 7, 72, 73, 80].map((c) => L.campo(c).id),
    ['numero', 'numero', 'continuazione', 'istruzione', 'istruzione', 'identificazione', 'identificazione']);
});

test('le misure: 7 3/8 × 3 1/4 pollici, e tutti i fori stanno dentro la carta', () => {
  const C = L.CARTA;
  assert.strictEqual(C.larghezza, 737.5);
  assert.strictEqual(C.altezza, 325);
  assert.ok(L.xColonna(1) > 0 && L.xColonna(80) + C.foroL < C.larghezza);
  assert.ok(L.yRiga(12) > 0 && L.yRiga(9) + C.foroA < C.altezza);
  assert.strictEqual(L.yRiga(9) - L.yRiga(12), 11 * C.passoY);
});

test('la tastiera: maiuscole, accenti tolti, segni tipografici semplificati', () => {
  assert.deepStrictEqual(L.tasto('A'), { ok: true, originale: 'A', carattere: 'A', conversione: null });
  assert.strictEqual(L.tasto('a').conversione, 'maiuscola');
  assert.deepStrictEqual([L.tasto('è').carattere, L.tasto('è').conversione], ['E', 'accento']);
  assert.deepStrictEqual([L.tasto('’').carattere, L.tasto('’').conversione], ['\'', 'tipografico']);
  assert.deepStrictEqual([L.tasto('×').carattere, L.tasto('«').carattere], ['*', '"']);
  assert.deepStrictEqual(L.tasto('€'), { ok: false, originale: '€', motivo: 'sconosciuto' });
  assert.strictEqual(L.tasto('').motivo, 'vuoto');
  const f = L.filtra('Perché 3×4 è 12 €');
  assert.strictEqual(f.testo, 'PERCHE 3*4 E 12 ');
  assert.deepStrictEqual(f.rifiutati, ['€']);
  assert.strictEqual(L.filtra('X'.repeat(100)).testo.length, 80, 'una scheda, non di più');
});

test('i fori di ogni carattere: zona, cifra e foro 8 dei simboli', () => {
  const a = L.anatomia('A');
  assert.deepStrictEqual([a.fori, a.zona, a.cifra, a.otto], [[12, 1], 12, 1, false]);
  assert.deepStrictEqual(L.anatomia('5').fori, [5]);
  assert.strictEqual(L.anatomia('-').zona, 11);
  assert.deepStrictEqual([L.anatomia('/').zona, L.anatomia('/').cifra], [0, 1]);
  const p = L.anatomia('.');
  assert.deepStrictEqual([p.fori, p.zona, p.cifra, p.otto], [[12, 3, 8], 12, 3, true]);
  assert.strictEqual(L.anatomia('€'), null);
  assert.strictEqual(L.frase('A'), 'A = fori 12 e 1 (zona 12 + cifra 1)');
  assert.strictEqual(L.frase('5'), '5 = foro 5 (una cifra, un solo foro)');
  assert.strictEqual(L.frase('&'), '& = foro 12 (solo la zona 12)');
  assert.strictEqual(L.frase('.'), '. = fori 12, 3 e 8 (zona 12 + cifra 3 + foro 8 dei simboli)');
  assert.strictEqual(L.frase('='), '= = fori 6 e 8 (cifra 6 + foro 8 dei simboli)');
  assert.strictEqual(L.frase(' '), 'spazio = nessun foro (la colonna resta intatta)');
});

test('il mazzo: sei schede da 80 colonne con la sequenza nelle colonne 73–80', () => {
  assert.strictEqual(L.MAZZO.length, 6);
  for (const s of L.MAZZO) {
    const img = L.immagine(s);
    assert.strictEqual(img.length, 80);
    assert.strictEqual(img.slice(72), s.seq);
    assert.strictEqual(img.slice(0, 72).trimEnd(), s.testo);
  }
  assert.ok(L.inOrdine([0, 1, 2, 3, 4, 5]));
  assert.ok(!L.inOrdine([1, 0, 2, 3, 4, 5]));
});

test('in ordine, il programma stampa i quadrati da 1 a 5', () => {
  assert.deepStrictEqual(L.righeAttese(), [
    ' 1 AL QUADRATO =  1', ' 2 AL QUADRATO =  4', ' 3 AL QUADRATO =  9', ' 4 AL QUADRATO = 16', ' 5 AL QUADRATO = 25',
  ]);
  const r = L.leggiMazzo(mazzo([0, 1, 2, 3, 4, 5]));
  assert.strictEqual(r.esito, 'ok');
  assert.deepStrictEqual(r.errori, []);
  assert.strictEqual(r.esecuzione.fine, 'stop');
  assert.ok(r.listato.includes(' COMPILAZIONE SENZA ERRORI'));
  assert.strictEqual(r.schede.length, 6);
});

test('mescolato: la selezionatrice lo rimette in ordine, una passata per colonna che cambia', () => {
  for (let seme = 1; seme <= 30; seme++) {
    let x = seme;
    const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    const ordine = L.mescola(6, rnd);
    assert.deepStrictEqual(ordine.slice().sort(), [0, 1, 2, 3, 4, 5]);
    assert.ok(ordine.some((v, i) => v !== i), 'mai l\'ordine di partenza');
    const p = L.passate(ordine);
    assert.deepStrictEqual(p.map((x) => x.colonna), [79], 'nella sequenza cambia solo la colonna 79');
    assert.deepStrictEqual(p[p.length - 1].ordine, [0, 1, 2, 3, 4, 5]);
    assert.deepStrictEqual(L.ordina(ordine), [0, 1, 2, 3, 4, 5]);
  }
  assert.deepStrictEqual(L.mescola(2, () => 0.99), [1, 0], 'anche con un caso sfortunato, mai l\'ordine di partenza');
});

test('le schede in disordine: gli errori del compilatore', () => {
  const fine = L.leggiMazzo(mazzo([5, 0, 1, 2, 3, 4]));
  assert.strictEqual(fine.esito, 'errore');
  assert.deepStrictEqual(fine.errori.map((e) => [e.codice, e.seq]), [['end', 'QUAD0060']]);
  assert.ok(fine.listato.includes(' *** COMPILAZIONE FALLITA: PROGRAMMA NON ESEGUITO'));
  const prima = L.leggiMazzo(mazzo([2, 0, 1, 3, 4, 5]));
  assert.deepStrictEqual(prima.errori.map((e) => e.messaggio), ['DO 10: L\'ISTRUZIONE 10 VIENE PRIMA']);
  const senzaEnd = L.compila(mazzo([0, 1, 2, 3, 4]));
  assert.deepStrictEqual(senzaEnd.errori.map((e) => e.codice), ['senza-end']);
});

test('una scheda fuori posto che compila lo stesso: variabili senza valore', () => {
  const r = L.leggiMazzo(mazzo([1, 0, 2, 3, 4, 5]));
  assert.strictEqual(r.esito, 'diverso');
  assert.deepStrictEqual(r.esecuzione.indefinite, ['I', 'J']);
  assert.strictEqual(r.esecuzione.righe[0], ' 1 AL QUADRATO =???');
  assert.ok(r.listato.includes(' *** ATTENZIONE: I, J USATE SENZA UN VALORE'));
});

test('espressioni intere: precedenze, parentesi, divisione troncata', () => {
  const v = (s, vars) => L.valuta(L.espressione(s), vars || {});
  assert.strictEqual(v('2 + 3 * 4'), 14);
  assert.strictEqual(v('(2 + 3) * 4'), 20);
  assert.strictEqual(v('-7 / 2'), -3);
  assert.strictEqual(v('I * I', { I: 5 }), 25);
  const mancanti = [];
  assert.strictEqual(L.valuta(L.espressione('K + 1'), {}, (n) => mancanti.push(n)), null);
  assert.deepStrictEqual(mancanti, ['K']);
  assert.throws(() => L.espressione('A ** 2'), /POTENZA NON PREVISTA/);
  assert.throws(() => L.espressione('(1 + 2'), /PARENTESI CHIUSA/);
  assert.throws(() => v('7 / 0'), /DIVISIONE PER ZERO/);
});

test('FORMAT e stampa: nX, nH, Iw e il carattere di controllo della stampante', () => {
  const voci = L.formato('FORMAT (1X, I2, 14H AL QUADRATO =, I3)');
  assert.deepStrictEqual(voci, [{ tipo: 'X', n: 1 }, { tipo: 'I', w: 2 }, { tipo: 'H', testo: ' AL QUADRATO =' }, { tipo: 'I', w: 3 }]);
  assert.deepStrictEqual(L.formato('(3I2)'), [{ tipo: 'I', w: 2 }, { tipo: 'I', w: 2 }, { tipo: 'I', w: 2 }]);
  assert.throws(() => L.formato('(5H AB)'), /TROPPO CORTO/);
  assert.throws(() => L.formato('(F5.2)'), /NON PREVISTO/);
  assert.strictEqual(L.stampa(voci, [3, 9]), ' 3 AL QUADRATO =  9');
  assert.strictEqual(L.stampa(voci, [123, 9]), '** AL QUADRATO =  9', 'un numero troppo largo diventa asterischi');
});

test('la lettura di una scheda: commenti, etichette, continuazione', () => {
  assert.strictEqual(L.leggiScheda('C     UN COMMENTO').tipo, 'commento');
  assert.strictEqual(L.leggiScheda('   10 WRITE (6,20) I, J').etichetta, 10);
  assert.strictEqual(L.leggiScheda('AB    STOP').errore, 'ETICHETTA NON NUMERICA');
  assert.strictEqual(L.leggiScheda('     1STOP').errore, 'CONTINUAZIONE NON PREVISTA');
  assert.strictEqual(L.leggiScheda('').tipo, 'vuota');
  assert.strictEqual(L.leggiScheda('      PRINT 1').errore, 'ISTRUZIONE SCONOSCIUTA');
  const s = L.leggiScheda(L.immagine(L.MAZZO[0]));
  assert.deepStrictEqual([s.tipo, s.fine, s.variabile, s.seq], ['do', 10, 'I', 'QUAD0010']);
});
