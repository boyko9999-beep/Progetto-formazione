// Test del laboratorio «Il compilatore al lavoro» (capitolo 5): lexer, parser con precedenza e
// associatività, generatore di codice per la CPU giocattolo (con e senza ottimizzazione),
// limiti della memoria, esecuzione e passi dell'animazione.
// node --test sections/programmazione/test/compilatore.test.js
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/lab/compilatore.js');
const Cpu = require('../js/lib/cpu-giocattolo.js');

const tipi = (s) => L.lessico(s).token.map((t) => t.tipo[0] + ':' + t.testo).join(' ');
const albero = (s) => L.analizza(L.lessico(s).token);
const codice = (s, valori, ott) => L.compila(s, valori || {}, { ottimizza: ott !== false }).codice.sorgente.split('\n').map((r) => r.trim().replace(/\s+/g, ' '));

test('analisi lessicale: caratteri → token con tipo e posizione', () => {
  assert.strictEqual(tipi('Y = A + B * C'), 'v:Y u:= v:A o:+ v:B o:* v:C');
  assert.strictEqual(tipi('Y=(A+12)*C'), 'v:Y u:= p:( v:A o:+ n:12 p:) o:* v:C');
  const lex = L.lessico('Y = 255 - B');
  assert.ok(lex.ok);
  assert.deepStrictEqual(lex.token[2], { tipo: 'numero', testo: '255', valore: 255, inizio: 4, fine: 7 });
  // le minuscole diventano maiuscole senza spostare le posizioni; × e − sono accettati
  assert.strictEqual(tipi('y = a × b − c'), 'v:Y u:= v:A o:* v:B o:- v:C');
  assert.strictEqual(L.lessico('y = a').testo, 'Y = A');
});

test('analisi lessicale: errori spiegati in italiano, con la posizione', () => {
  const casi = [
    ['', /Scrivi un'assegnazione/],
    ['   ', /Scrivi un'assegnazione/],
    ['Y = A / B', /divisione non c'è/],
    ['Y = A ** 2', /elevamento a potenza/],
    ['Y = AB', /una sola lettera.*A \* B/],
    ['Y = A1', /una sola lettera/],
    ['Y = 300', /da 0 a 255/],
    ['Y = 2.5', /interi/],
    ['Y = A % B', /«%» non fa parte/],
  ];
  for (const [s, re] of casi) {
    const r = L.lessico(s);
    assert.strictEqual(r.ok, false, s);
    assert.strictEqual(r.errore.fase, 1, s);
    assert.match(r.errore.messaggio, re, s);
  }
  assert.deepStrictEqual([L.lessico('Y = A / B').errore.inizio, L.lessico('Y = A / B').errore.fine], [6, 7]);
  assert.deepStrictEqual([L.lessico('Y = 300').errore.inizio, L.lessico('Y = 300').errore.fine], [4, 7]);
  assert.strictEqual(L.lessico('Y = ' + 'A + '.repeat(15) + 'B').ok, false); // oltre 60 caratteri
});

test('precedenza: la moltiplicazione sta più in basso dell\'addizione', () => {
  const a = albero('Y = A + B * C').albero;
  assert.strictEqual(a.tipo, 'assegna');
  assert.strictEqual(a.sx.testo, 'Y');
  assert.strictEqual(a.dx.op, '+');
  assert.strictEqual(a.dx.sx.testo, 'A');
  assert.strictEqual(a.dx.dx.op, '*');
  const b = albero('Y = A * B + C').albero;
  assert.strictEqual(b.dx.op, '+');
  assert.strictEqual(b.dx.sx.op, '*');
  assert.strictEqual(b.dx.dx.testo, 'C');
});

test('associatività: A − B − C si legge da sinistra, (A − B) − C', () => {
  const r = albero('Y = A - B - C');
  const e = r.albero.dx;
  assert.strictEqual(e.op, '-');
  assert.strictEqual(e.sx.op, '-');
  assert.strictEqual(e.sx.sx.testo, 'A');
  assert.strictEqual(e.sx.dx.testo, 'B');
  assert.strictEqual(e.dx.testo, 'C');
  assert.strictEqual(L.testoDi(r.albero), 'Y = A - B - C');
  assert.strictEqual(L.testoDi(albero('Y = A - (B - C)').albero), 'Y = A - (B - C)');
});

test('le parentesi cambiano l\'albero e poi spariscono', () => {
  const r = albero('Y = (A + B) * C');
  const e = r.albero.dx;
  assert.strictEqual(e.op, '*');
  assert.strictEqual(e.sx.op, '+');
  assert.deepStrictEqual(e.sx.parentesi, [2, 6]);
  assert.strictEqual(r.profondita, 3);
  // parentesi superflue: stesso albero
  assert.strictEqual(L.testoDi(albero('Y = ((A)) + (B * C)').albero), 'Y = A + B * C');
});

test('analisi sintattica: errori spiegati, con il punto da correggere', () => {
  const casi = [
    ['Y = (A + B', /parentesi chiusa/, [4, 5]],
    ['Y = A + B)', /chiusa di troppo/, [9, 10]],
    ['Y = 2A', /Manca un operatore fra «2» e «A».*2 \* A/, [4, 6]],
    ['Y = A B', /Manca un operatore/, null],
    ['Y = A +', /finisce con «\+»/, null],
    ['Y = ()', /parentesi sono vuote/, null],
    ['Y = -A', /0 - A/, null],
    ['A + B', /Manca il segno =/, null],
    ['Y + A = B', /soltanto la variabile/, null],
    ['3 = A', /non un numero/, null],
    ['= A', /Prima del segno =/, null],
    ['Y = A = B', /secondo segno =/, null],
    ['Y =', /manca la formula/, null],
    ['Y = A + * B', /Dopo «\+»/, null],
    ['Y = (A + )', /manca un valore/, null],
  ];
  for (const [s, re, pos] of casi) {
    const r = L.compila(s, {});
    assert.ok(r.errore, s);
    assert.strictEqual(r.errore.fase, 2, s);
    assert.match(r.errore.messaggio, re, s);
    if (pos) assert.deepStrictEqual([r.errore.inizio, r.errore.fine], pos, s);
    assert.ok(r.token.length > 0, 'i token restano disponibili: ' + s);
  }
});

test('generazione del codice: i tre esempi del laboratorio', () => {
  assert.deepStrictEqual(codice('Y = A + B * C').slice(0, 6), ['LOAD B', 'MUL C', 'ADD A', 'STORE Y', 'STORE OUT', 'HALT']);
  assert.deepStrictEqual(codice('Y = (A + B) * C').slice(0, 6), ['LOAD A', 'ADD B', 'MUL C', 'STORE Y', 'STORE OUT', 'HALT']);
  assert.deepStrictEqual(codice('Y = A * A - B').slice(0, 6), ['LOAD A', 'MUL A', 'SUB B', 'STORE Y', 'STORE OUT', 'HALT']);
  assert.deepStrictEqual(codice('Y = A + B * C').slice(6), ['Y: DATA 0', 'A: DATA 2', 'B: DATA 3', 'C: DATA 4']);
  // ogni cella una volta sola, anche se la variabile o la costante compare due volte
  const d = L.compila('Y = 2 * A + 2 * A', {}).codice.dati.map((x) => x.etichetta);
  assert.deepStrictEqual(d, ['Y', 'K2', 'A', 'T1']);
});

test('temporanee: servono quando l\'accumulatore è occupato o la sottrazione non si può scambiare', () => {
  assert.deepStrictEqual(codice('Y = A - (B - C)').slice(0, 5), ['LOAD B', 'SUB C', 'STORE T1', 'LOAD A', 'SUB T1']);
  assert.deepStrictEqual(codice('Y = (A + B) * (C + D)').slice(0, 6), ['LOAD A', 'ADD B', 'STORE T1', 'LOAD C', 'ADD D', 'MUL T1']);
  // con l'ottimizzazione le temporanee libere si riusano
  const r = L.compila('Y = (A + B) * (C + D) + (E + F) * (G + H)', {});
  const temp = r.codice.dati.filter((x) => x.tipo === 'temporanea').map((x) => x.etichetta);
  assert.deepStrictEqual(temp, ['T1', 'T2']);
  assert.strictEqual(r.alternativa.dati.filter((x) => x.tipo === 'temporanea').length, 7);
});

test('senza ottimizzazione ogni risultato passa dalla memoria', () => {
  assert.deepStrictEqual(codice('Y = A + B * C', {}, false).slice(0, 10), ['LOAD B', 'MUL C', 'STORE T1', 'LOAD A', 'ADD T1', 'STORE T2', 'LOAD T2', 'STORE Y', 'STORE OUT', 'HALT']);
  const r = L.compila('Y = A + B * C', {});
  assert.strictEqual(r.codice.istruzioni, 6);
  assert.strictEqual(r.codice.celle, 10);
  assert.strictEqual(r.alternativa.istruzioni, 10);
  assert.strictEqual(r.alternativa.celle, 16);
  assert.strictEqual(r.alternativa.ottimizza, false);
});

test('memoria: 31 celle per programma e dati, con un errore chiaro', () => {
  const lunga = L.compila('Y = A+B+C+D+E+F+G+H+I+J+K+L+M+N+O', {});
  assert.strictEqual(lunga.errore.fase, 3);
  assert.strictEqual(lunga.errore.tipo, 'memoria');
  assert.match(lunga.errore.messaggio, /34 celle.*31/);
  // entra solo con l'ottimizzazione
  const s = 'Y = A+B+C+D+E+F+G+H';
  assert.strictEqual(L.compila(s, {}).errore, null);
  assert.strictEqual(L.compila(s, {}).codice.celle, 20);
  const ing = L.compila(s, {}, { ottimizza: false });
  assert.strictEqual(ing.errore.tipo, 'memoria');
  assert.match(ing.errore.messaggio, /Riattiva l'ottimizzazione/);
});

test('esecuzione: il programma stampa il valore giusto e lo scrive in Y', () => {
  const r = L.compila('Y = A + B * C', { A: 2, B: 3, C: 4 });
  assert.deepStrictEqual(r.esecuzione.uscita, [14]);
  assert.strictEqual(r.esecuzione.valore, 14);
  assert.strictEqual(r.atteso, 14n);
  assert.strictEqual(r.esecuzione.eventi.length, 6);
  assert.deepStrictEqual(r.esecuzione.eventi.map((e) => e.nome), ['LOAD', 'MUL', 'ADD', 'STORE', 'STORE', 'HALT']);
  assert.strictEqual(r.esecuzione.eventi[1].operando, 4);
  // le celle dei dati seguono le istruzioni, nell'ordine del listato
  r.codice.dati.forEach((d, j) => assert.strictEqual(r.esecuzione.asm.simboli[d.etichetta.toLowerCase()], r.codice.istruzioni + j));
  assert.deepStrictEqual(L.compila('Y = (A + B) * C', {}).esecuzione.uscita, [20]);
  assert.deepStrictEqual(L.compila('Y = A * A - B', {}).esecuzione.uscita, [1]);
  assert.deepStrictEqual(L.compila('Y = Y + 1', { Y: 41 }).esecuzione.uscita, [42]);
});

test('celle da 8 bit: i risultati ripartono da 0 dopo 255', () => {
  const r = L.compila('Y = A - B - C', { A: 2, B: 3, C: 4 });
  assert.strictEqual(r.atteso, -5n);
  assert.strictEqual(r.attesoMacchina, 251);
  assert.deepStrictEqual(r.esecuzione.uscita, [251]);
  assert.match(L.spiegaFinale(r), /256/);
  const m = L.compila('Y = A * B', { A: 20, B: 15 });
  assert.deepStrictEqual(m.esecuzione.uscita, [44]);
  const ev = m.esecuzione.eventi.find((e) => e.nome === 'MUL');
  assert.match(L.spiegaEvento(ev, m.codice, m.esecuzione), /300.*255/);
  assert.match(L.spiegaFinale(L.compila('Y = A + B * C', {})), /Y = 14/);
});

test('prova a caso: con e senza ottimizzazione la macchina dà il conto giusto (modulo 256)', () => {
  let seme = 12345;
  const caso = (n) => { seme = (seme * 1103515245 + 12345) % 2147483648; return seme % n; };
  function espr(prof) {
    if (prof <= 0 || caso(3) === 0) return caso(4) === 0 ? String(caso(30)) : 'ABCDEF'[caso(6)];
    const op = '+-*'[caso(3)];
    const s = espr(prof - 1) + ' ' + op + ' ' + espr(prof - 1);
    return caso(3) === 0 ? '(' + s + ')' : s;
  }
  let provati = 0;
  for (let k = 0; k < 400; k++) {
    const s = 'Y = ' + espr(4);
    if (s.length > L.MAX_CARATTERI) continue;
    const valori = { A: caso(256), B: caso(256), C: caso(20), D: caso(20), E: caso(10), F: caso(10) };
    for (const ott of [true, false]) {
      const r = L.compila(s, valori, { ottimizza: ott });
      if (r.errore) { assert.strictEqual(r.errore.tipo, 'memoria', s); continue; }
      provati += 1;
      assert.ok(r.codice.celle <= 31, s);
      assert.deepStrictEqual(r.esecuzione.uscita, [r.attesoMacchina], s + (ott ? '' : ' (senza ottimizzazione)'));
      assert.strictEqual(r.esecuzione.valore, r.attesoMacchina, s);
      if (ott && !r.alternativa.errore) assert.ok(r.codice.istruzioni <= r.alternativa.istruzioni, s);
      // l'albero riscritto in testo si ricompila nello stesso albero
      assert.strictEqual(L.testoDi(L.compila(L.testoDi(r.albero), valori).albero), L.testoDi(r.albero), s);
    }
  }
  assert.ok(provati > 300, 'casi provati: ' + provati);
});

test('passi dell\'animazione: quattro fasi in ordine, raggruppati per nodo', () => {
  const r = L.compila('Y = A + B * C', {});
  assert.strictEqual(r.passi.length, 7 + 3 + 7 + 1 + 6);
  assert.deepStrictEqual(r.inizioFase.slice(1), [0, 7, 10, 17]);
  for (let i = 1; i < r.passi.length; i++) assert.ok(r.passi[i].fase >= r.passi[i - 1].fase);
  const nome = (id) => r.nodi[Number(id.slice(1))].testo;
  const gruppi = r.passi.filter((p) => p.fase === 2).map((p) => p.nuovi.map(nome).join(' '));
  assert.deepStrictEqual(gruppi, ['B C *', 'A +', 'Y =']);
  // visita in ordine posticipato: prima i figli, poi il padre
  assert.deepStrictEqual(r.codice.visite.map((v) => nome(v.nodo)), ['Y', 'A', 'B', 'C', '*', '+', '=']);
  assert.deepStrictEqual(r.codice.visite[4].righe, [0, 1]);
  assert.strictEqual(r.codice.visite[4].posizioni[r.codice.visite[4].nodo], 'ACC');
  // le parentesi spariscono nel passo che costruisce il loro gruppo
  const p = L.compila('Y = (A + B) * C', {});
  assert.deepStrictEqual(p.passi.find((x) => x.fase === 2).parentesi, [2, 6]);
  // la spiegazione dei passi
  assert.match(L.spiegaToken(r.token[6], 6, r), /7 token/);
  assert.match(L.spiegaNodo(r.albero.dx.dx, r.albero.dx), /precedenza/);
  const sub = albero('Y = A - B - C').albero;
  assert.match(L.spiegaNodo(sub.dx.sx, sub.dx), /sinistra a destra/);
});

test('valori delle variabili: interi da 0 a 255', () => {
  assert.deepStrictEqual(L.valida(' 7 ', 'A'), { ok: true, valore: 7 });
  assert.deepStrictEqual(L.valida('255', 'A'), { ok: true, valore: 255 });
  for (const t of ['', 'x', '-3', '2.5', '256']) assert.strictEqual(L.valida(t, 'B').ok, false, t);
  assert.match(L.valida('256', 'B').errore, /8 bit/);
  assert.strictEqual(L.valorePredefinito('A'), 2);
  assert.strictEqual(L.valorePredefinito('C'), 4);
  assert.deepStrictEqual(L.compila('Y = B + Z', {}).variabili, ['B', 'Z']);
  assert.deepStrictEqual(L.compila('Y = Y + A', {}).variabili, ['Y', 'A']);
});

test('il programma generato è accettato dall\'assemblatore della CPU giocattolo', () => {
  for (const s of L.PRESET) {
    const r = L.compila(s, {});
    const asm = Cpu.assembla(r.codice.sorgente);
    assert.ok(asm.ok, s);
    assert.strictEqual(asm.lunghezza, r.codice.celle);
  }
});
