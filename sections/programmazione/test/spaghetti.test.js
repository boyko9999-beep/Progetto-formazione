// Test del laboratorio «GOTO contro programmazione strutturata» (capitolo 7):
// i due piccoli interpreti, il conteggio dei salti, i controlli sui dati e la geometria delle frecce.
// node --test sections/programmazione/test/spaghetti.test.js
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/lab/spaghetti.js');

const righeEseguite = (t) => t.passi.map((p) => p.numero);

test('MCD(48, 18) = 6 in entrambe le versioni', () => {
  const b = L.tracciaBasic(48, 18);
  const p = L.tracciaPascal(48, 18);
  assert.deepStrictEqual(b.uscita, ['6']);
  assert.deepStrictEqual(p.uscita, ['6']);
  assert.ok(b.finito && p.finito);
  assert.deepStrictEqual(b.valori, { A: 6, B: 6 });
});

test('MCD(7, 7) = 7: un solo confronto e un solo salto', () => {
  const b = L.tracciaBasic(7, 7);
  assert.deepStrictEqual(b.uscita, ['7']);
  assert.deepStrictEqual(righeEseguite(b), [10, 70]);
  assert.strictEqual(b.salti, 1);
  assert.strictEqual(b.passi[0].esito, true);
  assert.strictEqual(b.passi[0].prossimo, 70);
  const p = L.tracciaPascal(7, 7);
  assert.deepStrictEqual(p.uscita, ['7']);
  assert.deepStrictEqual(p.passi.map((x) => x.nodo), ['mentre', 'scrivi']);
  assert.strictEqual(p.passi[0].esito, false);
});

test('le tracce finiscono sulla stampa', () => {
  for (const [a, b] of [[48, 18], [7, 7], [21, 34], [1, 99], [99, 1], [64, 24]]) {
    const tb = L.tracciaBasic(a, b);
    const ultima = tb.passi[tb.passi.length - 1];
    assert.strictEqual(ultima.tipo, 'stampa');
    assert.strictEqual(ultima.numero, 70);
    assert.strictEqual(ultima.prossimo, null);
    assert.strictEqual(tb.passi.filter((x) => x.tipo === 'stampa').length, 1);
    const tp = L.tracciaPascal(a, b);
    const fine = tp.passi[tp.passi.length - 1];
    assert.strictEqual(fine.tipo, 'scrivi');
    assert.strictEqual(fine.prossimo, 'fine');
  }
});

test('48 e 18: 18 istruzioni e 8 salti con i GOTO, 14 istruzioni e nessun salto a blocchi', () => {
  const b = L.tracciaBasic(48, 18);
  assert.deepStrictEqual(righeEseguite(b), [10, 20, 50, 60, 10, 20, 50, 60, 10, 20, 30, 40, 10, 20, 50, 60, 10, 70]);
  assert.strictEqual(b.istruzioni, 18);
  assert.strictEqual(b.salti, 8);
  assert.strictEqual(b.passi.filter((x) => x.salto).length, 8);
  const p = L.tracciaPascal(48, 18);
  assert.strictEqual(p.istruzioni, 14);
  assert.strictEqual(p.salti, 0);
  assert.strictEqual(p.giri, 4);
  assert.deepStrictEqual(p.passi.map((x) => x.nodo), [
    'mentre', 'se', 'allora', 'mentre', 'se', 'allora', 'mentre', 'se', 'altrimenti', 'mentre', 'se', 'allora', 'mentre', 'scrivi',
  ]);
});

test('un salto è ogni passaggio a una riga che non è la successiva', () => {
  const b = L.tracciaBasic(21, 34);
  const ordine = [10, 20, 30, 40, 50, 60, 70];
  for (const ev of b.passi) {
    const seguente = ordine[ordine.indexOf(ev.numero) + 1];
    if (ev.prossimo === null) assert.strictEqual(ev.salto, false);
    else assert.strictEqual(ev.salto, ev.prossimo !== seguente, 'riga ' + ev.numero + ' -> ' + ev.prossimo);
  }
  // I GOTO incondizionati saltano sempre, gli IF solo quando la condizione è vera.
  for (const ev of b.passi.filter((x) => x.tipo === 'vai')) assert.ok(ev.salto);
  for (const ev of b.passi.filter((x) => x.tipo === 'se')) assert.strictEqual(ev.salto, ev.esito);
});

test('i conti tornano per tutte le coppie da 1 a 40', () => {
  for (let a = 1; a <= 40; a++) {
    for (let b = 1; b <= 40; b++) {
      const tb = L.tracciaBasic(a, b);
      const tp = L.tracciaPascal(a, b);
      const m = String(L.mcd(a, b));
      assert.deepStrictEqual(tb.uscita, [m], 'BASIC ' + a + ',' + b);
      assert.deepStrictEqual(tp.uscita, [m], 'Pascal ' + a + ',' + b);
      // Ogni giro: 4 righe BASIC e 3 istruzioni Pascal; poi il test finale e la stampa.
      assert.strictEqual(tb.istruzioni, 4 * tp.giri + 2);
      assert.strictEqual(tp.istruzioni, 3 * tp.giri + 2);
      // Due salti quando A > B (IF e GOTO), uno quando A < B (solo GOTO), più il salto finale alla stampa.
      const sopra = tp.passi.filter((x) => x.nodo === 'allora').length;
      const sotto = tp.passi.filter((x) => x.nodo === 'altrimenti').length;
      assert.strictEqual(tb.salti, 2 * sopra + sotto + 1);
    }
  }
});

test('con uno zero le sottrazioni non finiscono: il limite ferma l\'esecuzione', () => {
  const b = L.tracciaBasic(0, 5, 200);
  assert.strictEqual(b.finito, false);
  assert.strictEqual(b.passi.length, 200);
  const p = L.tracciaPascal(5, 0, 150);
  assert.strictEqual(p.finito, false);
  assert.strictEqual(p.passi.length, 150);
  assert.strictEqual(p.passi[p.passi.length - 1].prossimo, null);
});

test('il ciclo torna al suo test dopo ogni assegnamento', () => {
  const p = L.tracciaPascal(21, 34);
  for (const ev of p.passi.filter((x) => x.tipo === 'assegna')) {
    assert.strictEqual(ev.prossimo, 'mentre');
    assert.strictEqual(ev.ritorno, true);
  }
  assert.strictEqual(p.passi.filter((x) => x.ritorno).length, p.giri);
});

test('le strutture attive si annidano: sequenza, iterazione, selezione', () => {
  const m = L.mappaStrutture(L.PROGRAMMA);
  assert.deepStrictEqual(m.mentre, ['sequenza', 'iterazione']);
  assert.deepStrictEqual(m.se, ['sequenza', 'iterazione', 'selezione']);
  assert.deepStrictEqual(m.allora, ['sequenza', 'iterazione', 'selezione']);
  assert.deepStrictEqual(m.altrimenti, ['sequenza', 'iterazione', 'selezione']);
  assert.deepStrictEqual(m.scrivi, ['sequenza']);
  assert.deepStrictEqual(m.fine, []);
  const p = L.tracciaPascal(48, 18);
  assert.deepStrictEqual(p.passi[1].strutture, ['sequenza', 'iterazione', 'selezione']);
});

test('l\'interprete BASIC legge il listato del laboratorio e segnala gli errori', () => {
  const a = L.analizzaBasic(L.BASIC);
  assert.ok(a.ok);
  assert.deepStrictEqual(a.righe.map((r) => r.numero), [10, 20, 30, 40, 50, 60, 70]);
  assert.deepStrictEqual(a.righe.map((r) => r.istr.tipo), ['se', 'se', 'assegna', 'vai', 'assegna', 'vai', 'stampa']);
  const e = L.analizzaBasic('10 PIPPO\n20 GOTO 99\nPRINT A\n30 LET X = 1\n30 END');
  assert.strictEqual(e.ok, false);
  assert.deepStrictEqual(e.errori.map((x) => x.riga), [1, 2, 3, 5]);
  assert.ok(/sconosciuta/.test(e.errori[0].messaggio));
  assert.ok(/99 non esiste/.test(e.errori[1].messaggio));
});

test('l\'interprete BASIC conosce anche LET, END, somme e confronti', () => {
  const prog = L.analizzaBasic('10 LET S = 0\n20 LET I = 1\n30 IF I > 4 THEN 70\n40 S = S + I\n50 I = I + 1\n60 GOTO 30\n70 PRINT S\n80 END\n90 PRINT 99');
  assert.ok(prog.ok, JSON.stringify(prog.errori));
  const r = L.eseguiBasic(prog, {});
  assert.deepStrictEqual(r.uscita, ['10']);
  assert.ok(r.finito);
});

test('i campi accettano solo interi da 1 a 99 e spiegano come correggere', () => {
  assert.deepStrictEqual(L.valida('48', 'A'), { ok: true, valore: 48 });
  assert.deepStrictEqual(L.valida(' 7 ', 'B'), { ok: true, valore: 7 });
  assert.strictEqual(L.valida('99', 'A').ok, true);
  assert.match(L.valida('', 'A').errore, /Scrivi un valore per A/);
  assert.match(L.valida('0', 'B').errore, /non finirebbero mai/);
  assert.match(L.valida('100', 'A').errore, /al massimo a 99/);
  assert.match(L.valida('-4', 'A').errore, /positivo/);
  assert.match(L.valida('3,5', 'B').errore, /intero/);
  assert.match(L.valida('dodici', 'B').errore, /intero/);
});

test('geometria delle frecce: lunghezza, punto lungo il percorso, angoli arrotondati', () => {
  const spezzata = [[0, 0], [30, 0], [30, 40]];
  assert.strictEqual(L.lunghezza(spezzata), 70);
  assert.deepStrictEqual(L.puntoA(spezzata, 0), [0, 0]);
  assert.deepStrictEqual(L.puntoA(spezzata, 1), [30, 40]);
  assert.deepStrictEqual(L.puntoA(spezzata, 0.5), [30, 5]);
  const d = L.percorso(spezzata, 10);
  assert.match(d, /^M0 0 L20 0 Q30 0 30 10 L30 40$/);
  assert.match(L.percorso(spezzata, 10, 6), / L30 34$/);
  // Ogni freccia di salto parte e arriva dove la traccia dice.
  for (const k of ['10>70', '20>50', '40>10', '60>10']) assert.ok(L.ARCHI[k].length >= 4, k);
});
