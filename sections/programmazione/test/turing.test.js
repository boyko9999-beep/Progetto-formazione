// Test del laboratorio «La macchina di Turing» (capitolo 2):
// il motore (un passo, l'esecuzione limitata), i cinque programmi, il racconto dei passi e i controlli sul nastro.
// node --test sections/programmazione/test/turing.test.js
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/lab/turing.js');

const P = (id) => L.programma(id);
const nastro = (id, ingresso, limite) => {
  const prog = P(id);
  const m = L.esegui(prog, ingresso, limite);
  return { m, testo: L.contenuto(m, prog.vuoto) };
};

test('il file si carica in Node senza toccare il DOM e senza registrarsi', () => {
  assert.strictEqual(typeof L.passo, 'function');
  assert.strictEqual(globalThis.ProgStoria, undefined);
  assert.deepStrictEqual(L.PROGRAMMI.map((p) => p.id), ['somma', 'ciao', 'castoro', 'inverti', 'turing36']);
  assert.deepStrictEqual(L.PROGRAMMI.map((p) => p.nome), ['Somma 1', 'Scrivi CIAO', 'Castoro indaffarato', 'Inverti i bit', 'Turing 1936']);
});

test('Somma 1: 1011 → 1100 e 111 → 1000', () => {
  const a = nastro('somma', '1011');
  assert.strictEqual(a.testo, '1100');
  assert.ok(a.m.fermo);
  assert.strictEqual(a.m.motivo, 'alt');
  assert.strictEqual(a.m.stato, L.ALT);
  assert.strictEqual(a.m.passi, 8); // 4 a destra, 1 indietro, 2 riporti, l'ultimo 0 diventa 1
  const b = nastro('somma', '111');
  assert.strictEqual(b.testo, '1000');
  assert.ok(b.m.fermo);
});

test('Somma 1 aggiunge davvero 1 a ogni numero fino a 10 cifre', () => {
  for (const n of [0, 1, 2, 3, 7, 8, 11, 12, 19, 255, 511, 1022]) {
    const bin = n.toString(2);
    const r = nastro('somma', bin);
    assert.ok(r.m.fermo, bin);
    assert.strictEqual(L.decimale(r.testo), n + 1, bin + ' → ' + r.testo);
  }
  // con gli zeri davanti il numero resta della stessa lunghezza
  assert.strictEqual(nastro('somma', '0011').testo, '0100');
});

test('Castoro indaffarato: 4 uni in 6 passi, poi ALT', () => {
  const prog = P('castoro');
  const r = nastro('castoro', '');
  assert.ok(r.m.fermo);
  assert.strictEqual(r.m.motivo, 'alt');
  assert.strictEqual(r.m.passi, 6);
  assert.strictEqual(L.conta(r.m, '1'), 4);
  assert.strictEqual(r.testo, '1111');
  assert.deepStrictEqual(prog.record, { uni: 4, passi: 6 });
  // la tavola è quella classica: A0 1RB, A1 1LB, B0 1LA, B1 1RH
  assert.deepStrictEqual(prog.regole.map((x) => x.stato + x.legge + ' ' + x.scrive + x.muove + x.nuovo), ['q00 1Dq1', 'q01 1Sq1', 'q10 1Sq0', 'q11 1DALT']);
});

test('Scrivi CIAO: scrive C, I, A, O e si ferma', () => {
  const r = nastro('ciao', '');
  assert.strictEqual(r.testo, 'CIAO');
  assert.ok(r.m.fermo);
  assert.strictEqual(r.m.passi, 4);
});

test('Inverti i bit: 1011 → 0100, 0110 → 1001', () => {
  assert.strictEqual(nastro('inverti', '1011').testo, '0100');
  assert.strictEqual(nastro('inverti', '0110').testo, '1001');
  const r = nastro('inverti', '11111');
  assert.strictEqual(r.testo, '00000');
  assert.strictEqual(r.m.passi, 6);
});

test('Turing 1936: 0 e 1 su caselle alterne, senza fermarsi mai', () => {
  const otto = nastro('turing36', '', 8);
  assert.strictEqual(otto.testo, '0' + L.VUOTO + '1' + L.VUOTO + '0' + L.VUOTO + '1');
  assert.strictEqual(otto.m.testina, 8);
  assert.strictEqual(otto.m.stato, 'b');
  const lungo = nastro('turing36', '', 1000);
  assert.strictEqual(lungo.m.fermo, false);
  assert.strictEqual(lungo.m.passi, 1000);
  assert.strictEqual(P('turing36').limite, 40);
  assert.deepStrictEqual(P('turing36').stati.map((s) => s.id), ['b', 'c', 'e', 'f']);
});

test('un passo non modifica la configurazione di partenza', () => {
  const prog = P('somma');
  const m = L.crea(prog, '1011');
  const copia = JSON.parse(JSON.stringify(m));
  const p = L.passo(prog, m);
  assert.deepStrictEqual(m, copia);
  assert.strictEqual(p.macchina.passi, 1);
  assert.strictEqual(p.da, 0);
  assert.strictEqual(p.a, 1);
  assert.strictEqual(p.indice, 1);
});

test('una macchina ferma non fa altri passi', () => {
  const prog = P('ciao');
  const m = L.esegui(prog, '');
  assert.strictEqual(L.passo(prog, m), null);
});

test('senza una regola adatta la macchina si blocca senza contare il passo', () => {
  const prog = P('ciao');
  const regole = L.copiaRegole(prog.regole);
  regole[0].muove = 'F'; // q0 scrive C e resta lì: poi q1 legge C, e per C non c'è regola
  let m = L.crea(prog, '');
  m = L.passo(prog, m, regole).macchina;
  const p = L.passo(prog, m, regole);
  assert.strictEqual(p.regola, null);
  assert.strictEqual(p.motivo, 'nessuna-regola');
  assert.strictEqual(p.macchina.passi, 1);
  assert.ok(p.macchina.fermo);
  assert.match(L.racconta(p, prog), /nessuna regola/);
  assert.strictEqual(L.esito(prog, '', p.macchina, regole).titolo, 'Bloccata');
});

test('ogni programma è deterministico e ha una regola per ogni caso che incontra', () => {
  for (const prog of L.PROGRAMMI) {
    const chiavi = prog.regole.map((r) => r.stato + '|' + r.legge);
    assert.strictEqual(new Set(chiavi).size, chiavi.length, prog.id + ': regole doppie');
    const stati = new Set(prog.stati.map((s) => s.id));
    for (const r of prog.regole) {
      assert.ok(stati.has(r.stato), prog.id + ': stato sconosciuto ' + r.stato);
      assert.ok(stati.has(r.nuovo) || r.nuovo === L.ALT, prog.id + ': nuovo stato sconosciuto ' + r.nuovo);
      assert.ok(prog.simboli.includes(r.legge), prog.id + ': simbolo ' + r.legge);
      assert.ok(r.scrive == null || prog.simboli.includes(r.scrive), prog.id + ': scrive ' + r.scrive);
      assert.ok('SDF'.includes(r.muove), prog.id + ': mossa ' + r.muove);
    }
    const ingresso = prog.ingresso ? prog.ingresso.predefinito : '';
    const m = L.esegui(prog, ingresso, 200);
    assert.notStrictEqual(m.motivo, 'nessuna-regola', prog.id);
    if (prog.id !== 'turing36') assert.ok(m.fermo, prog.id + ' deve fermarsi');
  }
});

test('il racconto di un passo, come nel testo: «Nello stato q1 leggo 1: scrivo 0, vado a sinistra, resto in q1.»', () => {
  const prog = P('somma');
  let m = L.crea(prog, '1011');
  const frasi = [];
  while (!m.fermo) {
    const p = L.passo(prog, m);
    frasi.push(L.racconta(p, prog));
    m = p.macchina;
  }
  assert.strictEqual(frasi[0], 'Nello stato q0 leggo 1: non scrivo niente, vado a destra, resto in q0.');
  assert.strictEqual(frasi[4], 'Nello stato q0 leggo una casella vuota: non scrivo niente, vado a sinistra, passo in q1.');
  assert.strictEqual(frasi[5], 'Nello stato q1 leggo 1: scrivo 0, vado a sinistra, resto in q1.');
  assert.strictEqual(frasi[7], 'Nello stato q1 leggo 0: scrivo 1, non mi sposto, passo in ALT: mi fermo.');
  // le parti colorate ricompongono la stessa frase
  const p = L.passo(prog, L.crea(prog, '1'));
  const parti = L.raccontoParti(p, prog);
  assert.strictEqual(parti.map((x) => x.t).join(''), L.racconta(p, prog));
  assert.deepStrictEqual(parti.filter((x) => x.k).map((x) => x.k), ['stato', 'legge', 'scrive', 'muove', 'stato']);
});

test('il racconto del castoro dice «scrivo 1» anche sopra un 1', () => {
  const prog = P('castoro');
  let m = L.crea(prog, '');
  const frasi = [];
  while (!m.fermo) { const p = L.passo(prog, m); frasi.push(L.racconta(p, prog)); m = p.macchina; }
  assert.strictEqual(frasi.length, 6);
  assert.strictEqual(frasi[0], 'Nello stato q0 leggo 0: scrivo 1, vado a destra, passo in q1.');
  assert.strictEqual(frasi[2], 'Nello stato q0 leggo 1: scrivo 1, vado a sinistra, passo in q1.');
  assert.strictEqual(frasi[5], 'Nello stato q1 leggo 1: scrivo 1, vado a destra, passo in ALT: mi fermo.');
});

test('controllo del numero sul nastro', () => {
  assert.deepStrictEqual(L.valida(' 10 11 '), { ok: true, valore: '1011' });
  assert.strictEqual(L.valida('0').ok, true);
  const vuoto = L.valida('');
  assert.strictEqual(vuoto.ok, false);
  assert.match(vuoto.errore, /vuoto/);
  const due = L.valida('1021');
  assert.strictEqual(due.ok, false);
  assert.match(due.errore, /«2»/);
  const lungo = L.valida('10110111011');
  assert.strictEqual(lungo.ok, false);
  assert.match(lungo.errore, /10 cifre/);
  assert.strictEqual(L.valida('1111111111').ok, true);
});

test('il risultato all\'arresto', () => {
  const somma = P('somma');
  const e = L.esito(somma, '1011', L.esegui(somma, '1011'));
  assert.strictEqual(e.titolo, 'ALT');
  assert.match(e.testo, /1011 \(11 in decimale\)/);
  assert.match(e.testo, /1100 \(12\)/);
  assert.match(e.testo, /8 passi/);

  const castoro = P('castoro');
  assert.match(L.esito(castoro, '', L.esegui(castoro, '')).testo, /^4 uni in 6 passi/);
  // una tavola modificata viene confrontata con il record
  const mia = L.copiaRegole(castoro.regole);
  mia[1].nuovo = L.ALT; // q0 con 1: si ferma subito
  const m = L.esegui(castoro, '', 100, mia);
  assert.ok(m.fermo);
  const em = L.esito(castoro, '', m, mia);
  assert.match(em.testo, /^La tua tavola: 2 uni in 3 passi\. Il record con 2 stati è 4 uni in 6 passi\.$/);
  // la tavola speculare pareggia il record
  const specchio = castoro.regole.map((r) => Object.assign({}, r, { muove: r.muove === 'D' ? 'S' : 'D' }));
  const ms = L.esegui(castoro, '', 100, specchio);
  assert.strictEqual(L.conta(ms, '1'), 4);
  assert.match(L.esito(castoro, '', ms, specchio).testo, /pareggiato il record/);

  const t = P('turing36');
  const mt = L.esegui(t, '', 40);
  assert.strictEqual(L.esito(t, '', mt).titolo, 'Pausa');
  assert.match(L.esito(t, '', mt).testo, /non lo farà mai/);
  const ciao = P('ciao');
  assert.match(L.esito(ciao, '', L.esegui(ciao, '')).testo, /CIAO/);
});

test('modificare una regola: le opzioni girano in tondo', () => {
  const prog = P('somma');
  assert.deepStrictEqual(L.opzioni(prog, 'muove'), ['S', 'D', 'F']);
  assert.deepStrictEqual(L.opzioni(prog, 'nuovo'), ['q0', 'q1', L.ALT]);
  assert.deepStrictEqual(L.opzioni(prog, 'scrive'), [null, '0', '1', L.VUOTO]);
  assert.strictEqual(L.prossimo(['S', 'D', 'F'], 'F'), 'S');
  assert.strictEqual(L.prossimo(['S', 'D', 'F'], 'S', -1), 'F');
  assert.strictEqual(L.prossimo([null, '0', '1'], null), '0');
  assert.ok(L.stesseRegole(L.copiaRegole(prog.regole), prog.regole));
  const altra = L.copiaRegole(prog.regole);
  altra[3].scrive = '1';
  assert.ok(!L.stesseRegole(altra, prog.regole));
  assert.strictEqual(prog.regole[3].scrive, '0', 'la copia non tocca il programma originale');
});
