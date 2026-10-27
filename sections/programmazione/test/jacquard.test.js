// Test del laboratorio «Il telaio Jacquard» (capitolo 1): i disegni, la lettura delle schede
// e la tessitura riga per riga.
// node --test sections/programmazione/test/jacquard.test.js
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/lab/jacquard.js');

test('i disegni: righe di 16 colonne fatte solo di fori e pieni', () => {
  assert.strictEqual(L.COLONNE, 16);
  assert.deepStrictEqual(L.ORDINE, Object.keys(L.DISEGNI));
  for (const id of L.ORDINE) {
    const d = L.DISEGNI[id];
    assert.ok(d.nome, id);
    assert.ok(d.righe.length >= 8 && d.righe.length <= 12, id + ': ' + d.righe.length + ' righe');
    for (const r of d.righe) assert.match(r, /^[#.]{16}$/, id);
  }
});

test('dal testo alla scheda e ritorno', () => {
  const s = L.daTesto('#..#');
  assert.strictEqual(s.length, 16);
  assert.deepStrictEqual(L.colonneForate(s), [1, 4]);
  assert.strictEqual(L.inTesto(s), '#..#............');
  assert.strictEqual(L.inTesto(L.daTesto('')), '.'.repeat(16));
  assert.strictEqual(L.inTesto(L.daTesto('#'.repeat(20))), '#'.repeat(16), 'oltre la colonna 16 non si legge');
});

test('il mazzo si legge dal basso: la prima scheda è l\'ultima riga del disegno', () => {
  for (const id of L.ORDINE) {
    const m = L.mazzo(id);
    const righe = L.DISEGNI[id].righe;
    assert.strictEqual(m.length, righe.length);
    assert.strictEqual(L.inTesto(m[0]), righe[righe.length - 1], id);
    assert.strictEqual(L.inTesto(m[m.length - 1]), righe[0], id);
  }
  assert.strictEqual(L.mazzo('nessuno'), null);
});

test('foro: l\'ago passa, l\'uncino sale e si vede l\'ordito; pieno: il contrario', () => {
  const [foro, pieno] = L.leggi([true, false]);
  assert.deepStrictEqual(foro, { foro: true, ago: 'passa', uncino: 'alzato', cella: 'ordito' });
  assert.deepStrictEqual(pieno, { foro: false, ago: 'bloccato', uncino: 'fermo', cella: 'trama' });
  assert.deepStrictEqual(L.riga([true, false, true]), ['ordito', 'trama', 'ordito']);
});

test('tessere tutto il mazzo ridà il disegno, riga per riga', () => {
  for (const id of L.ORDINE) assert.deepStrictEqual(L.disegno(L.tessiTutto(L.mazzo(id))), L.DISEGNI[id].righe, id);
});

test('un colpo alla volta: una riga per scheda, poi il telaio si ferma', () => {
  const schede = L.mazzo('ciao');
  let st = L.nuovoTelaio(schede);
  assert.notStrictEqual(st.schede[0], schede[0], 'il telaio lavora su una copia delle schede');
  let colpi = 0;
  while (!L.finito(st)) {
    st = L.passo(st);
    colpi++;
    assert.strictEqual(st.tessuto.length, colpi);
    assert.deepStrictEqual(st.tessuto[colpi - 1], L.riga(schede[colpi - 1]));
  }
  assert.strictEqual(colpi, schede.length);
  assert.strictEqual(L.passo(st), st, 'a mazzo finito il colpo non fa nulla');
});

test('invertire i fori scambia ordito e trama in ogni cella', () => {
  const negativo = L.disegno(L.tessiTutto(L.mazzo('rombo').map(L.inverti)));
  L.DISEGNI.rombo.righe.forEach((r, i) => assert.strictEqual(negativo[i], r.replace(/[#.]/g, (c) => (c === '#' ? '.' : '#'))));
});

test('la frase sui fori: nessuno, uno, alcuni, tutti', () => {
  assert.strictEqual(L.descrivi(L.daTesto('')), 'Nessun foro: nessun filo d\'ordito si alzerà.');
  assert.strictEqual(L.descrivi(L.daTesto('.....#')), 'Un foro, nella colonna 6.');
  assert.strictEqual(L.descrivi(L.daTesto('#.#.#')), '3 fori, nelle colonne 1, 3 e 5.');
  assert.strictEqual(L.descrivi(L.daTesto('#'.repeat(16))), 'Tutti i 16 fori sono aperti: si alzeranno tutti i fili d\'ordito.');
  assert.strictEqual(L.conta(L.daTesto('##.##')), 4);
});
