// Test del laboratorio «Il prossimo token»: tokenizzatore BPE, modello a n-grammi e campionatore.
// node --test sections/programmazione/test/prossimo-token.test.js
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/lab/prossimo-token.js');

const M = L.modello();
const T = M.tok;
const testi = (tokens) => tokens.map((t) => t.testo);
const somma = (xs) => xs.reduce((a, b) => a + b, 0);
const QUASI = 1e-9;

test('il corpus è un piccolo file di Python che saluta, conta e stampa, in italiano', () => {
  assert.strictEqual(L.CORPUS.length, 1);
  const righe = L.CORPUS[0].split('\n').slice(0, -1);
  assert.ok(righe.length >= 30 && righe.length <= 60, righe.length + ' righe');
  assert.strictEqual(M.nRighe, righe.length);
  assert.ok(L.CORPUS[0].endsWith('\n'));
  assert.match(L.CORPUS[0], /^print\("Ciao, mondo!"\)\n/);
  assert.match(L.CORPUS[0], /def saluta\(nome\):/);
  assert.match(L.CORPUS[0], /for i in range\(/);
  assert.match(L.CORPUS[0], /# conta da 1 a 5/);
  assert.ok(!/\t/.test(L.CORPUS[0]), 'rientri di 4 spazi, niente tabulazioni');
  for (const r of righe) assert.ok(!/ $/.test(r), 'niente spazi in fondo alla riga: ' + JSON.stringify(r));
});

test('dividere e riunire restituisce esattamente lo stesso testo', () => {
  const prove = [
    ...L.CORPUS,
    'def saluta(nome):', 'for i in range(', 'print(', '#', '',
    '  x  =  1\n\n\tfine  ', '    ', ' ', '\n\n', 'print("Ciao, Martina! 👋 €")',
    'àèéìòù ÀÈÉ ß', 'for i in ', 'a\r\nb', 'if x >= 10 and y != 3: z += 1', '((((()))))',
  ];
  for (const testo of prove) {
    const tokens = T.dividi(testo);
    assert.strictEqual(T.unisci(tokens), testo, JSON.stringify(testo));
    assert.ok(tokens.every((t) => t.testo.length > 0), 'nessun token vuoto');
  }
  for (const testo of L.CORPUS.concat(['def saluta(nome):', 'print("Ciao, Martina!")'])) {
    const ids = T.codifica(testo);
    assert.ok(ids.every((id) => id >= 0), 'testo scritto solo con token noti');
    assert.strictEqual(T.decodifica(ids), testo);
  }
});

test('ogni parola del corpus è un solo token; le parole nuove si spezzano in pezzi noti', () => {
  assert.deepStrictEqual(testi(T.dividi('def saluta(nome):')), ['def', ' saluta', '(', 'nome', ')', ':']);
  assert.deepStrictEqual(testi(T.dividi('for i in range(')), ['for', ' i', ' in', ' range', '(']);
  assert.deepStrictEqual(testi(T.dividi('\n    print(i)')), ['\n', '    ', 'print', '(', 'i', ')']);
  // lo spazio prima di una parola resta attaccato alla parola
  assert.notStrictEqual(T.vocab.get(' nome'), T.vocab.get('nome'));
  // una parola mai vista diventa più pezzi, tutti nel vocabolario
  const martina = T.dividi('Martina');
  assert.ok(martina.length > 1);
  assert.ok(martina.every((t) => t.id >= 0));
  assert.strictEqual(martina[0].parte, 'inizio');
  assert.ok(martina.slice(1).every((t) => t.parte === 'seguito'));
  // un carattere fuori dal vocabolario resta intero e ha id -1
  const emoji = T.dividi('👋');
  assert.strictEqual(emoji.length, 1);
  assert.strictEqual(emoji[0].id, -1);
  assert.strictEqual(emoji[0].tipo, 'sconosciuto');
  // gli id sono unici e coerenti con la lista
  assert.strictEqual(T.vocab.size, T.lista.length);
  T.lista.forEach((testo, id) => assert.strictEqual(T.vocab.get(testo), id));
  assert.strictEqual(T.lista[L.ID_INIZIO], L.INIZIO);
  assert.strictEqual(T.lista[L.ID_FINE], L.FINE);
});

test('il BPE unisce prima le coppie più frequenti ed è deterministico', () => {
  const a = L.addestraBPE(L.CORPUS);
  const b = L.addestraBPE(L.CORPUS);
  assert.deepStrictEqual(a, b);
  // «ab» compare 3 volte, « ab» (con lo spazio) 2: prima nasce «ab», poi « ab»
  assert.deepStrictEqual(L.addestraBPE(['ab ab ab cd']).slice(0, 2), [['a', 'b'], [' ', 'ab']]);
  // a parità di frequenza vince la coppia che viene prima in ordine alfabetico
  assert.deepStrictEqual(L.addestraBPE(['ba ab'])[0], [' ', 'a']);
});

test('le probabilità vengono dai conteggi del corpus e sommano a 1', () => {
  const d = L.prossimo(M, T.codifica('for i in range('), 3);
  assert.strictEqual(d.k, 3);
  assert.strictEqual(d.totale, 6);
  assert.deepStrictEqual(d.candidati.map((c) => [c.testo, c.conteggio]), [['1', 2], ['3', 2], ['fino', 1], ['volte', 1]]);
  assert.deepStrictEqual(d.candidati.map((c) => c.p), [2 / 6, 2 / 6, 1 / 6, 1 / 6]);
  const inizi = ['', '#', 'print(', 'print("', 'def saluta(nome):\n    ', 'for i in ', 'ciao ciao', 'x = 👋'];
  for (const inizio of inizi) {
    for (const memoria of [1, 2, 3]) {
      const dd = L.prossimo(M, T.codifica(inizio), memoria);
      assert.ok(dd.candidati.length > 0, 'c\'è sempre almeno un candidato');
      assert.ok(Math.abs(somma(dd.candidati.map((c) => c.p)) - 1) < QUASI, inizio + ' memoria ' + memoria);
      assert.strictEqual(somma(dd.candidati.map((c) => c.conteggio)), dd.totale);
      for (const t of [0, 0.1, 0.5, 1, 1.5, 2]) {
        const q = L.conTemperatura(dd.candidati, t).map((c) => c.q);
        assert.ok(Math.abs(somma(q) - 1) < QUASI, 'temperatura ' + t);
        assert.ok(q.every((x) => x >= 0 && x <= 1));
      }
    }
  }
});

test('la temperatura: 1 lascia i conteggi, sotto 1 premia i più probabili, sopra 1 appiattisce', () => {
  const d = L.prossimo(M, T.codifica('def saluta(nome):\n    '), 3);
  const q = (t) => L.conTemperatura(d.candidati, t).map((c) => c.q);
  q(1).forEach((x, i) => assert.ok(Math.abs(x - d.candidati[i].p) < QUASI));
  assert.ok(q(0.5)[0] > q(1)[0]);
  assert.ok(q(2)[0] < q(1)[0]);
  assert.deepStrictEqual(q(0), d.candidati.map((_, i) => (i === 0 ? 1 : 0)));
});

test('temperatura 0: sceglie sempre il più probabile, senza sorteggio', () => {
  const d = L.prossimo(M, T.codifica('def saluta(nome):\n    '), 3);
  const massimo = Math.max(...d.candidati.map((c) => c.conteggio));
  for (let seme = 1; seme <= 25; seme++) {
    const s = L.scegli(d.candidati, 0, L.generatore(seme));
    assert.strictEqual(s.indice, 0);
    assert.strictEqual(s.u, null);
    assert.strictEqual(d.candidati[s.indice].conteggio, massimo);
  }
  // a parità di conteggi vince quello visto per primo nel corpus («1» viene prima di «3»)
  const pari = L.prossimo(M, T.codifica('for i in range('), 3);
  assert.strictEqual(pari.candidati[L.scegli(pari.candidati, 0, Math.random).indice].testo, '1');
  // e la generazione non dipende dal seme
  const a = L.genera(M, 'for i in range(', { temperatura: 0, seme: 1 });
  const b = L.genera(M, 'for i in range(', { temperatura: 0, seme: 9999 });
  assert.strictEqual(a.testo, b.testo);
  assert.ok(a.testo.startsWith('1, 6):\n'));
});

test('il sorteggio cade nella fascia giusta', () => {
  const d = L.prossimo(M, T.codifica('for i in range('), 3);
  const fisso = (u) => () => u;
  assert.strictEqual(L.scegli(d.candidati, 1, fisso(0)).indice, 0);
  assert.strictEqual(L.scegli(d.candidati, 1, fisso(0.32)).indice, 0);
  assert.strictEqual(L.scegli(d.candidati, 1, fisso(0.34)).indice, 1);
  assert.strictEqual(L.scegli(d.candidati, 1, fisso(0.7)).indice, 2);
  assert.strictEqual(L.scegli(d.candidati, 1, fisso(0.9999)).indice, 3);
  // sul lungo periodo le frequenze somigliano alle probabilità
  const rng = L.generatore(7);
  const n = [0, 0, 0, 0];
  for (let i = 0; i < 6000; i++) n[L.scegli(d.candidati, 1, rng).indice]++;
  assert.ok(Math.abs(n[0] / 6000 - 1 / 3) < 0.03 && Math.abs(n[3] / 6000 - 1 / 6) < 0.03, n.join(' '));
});

test('lo stesso seme dà lo stesso testo; semi diversi possono cambiarlo', () => {
  for (const inizio of ['for i in range(', 'def saluta(nome):', 'print(', '#']) {
    const a = L.genera(M, inizio, { seme: 1948, temperatura: 1 });
    const b = L.genera(M, inizio, { seme: 1948, temperatura: 1 });
    assert.strictEqual(a.testo, b.testo);
    assert.deepStrictEqual(a.tokens.map((t) => t.id), b.tokens.map((t) => t.id));
  }
  const varianti = new Set();
  for (let seme = 1; seme <= 12; seme++) varianti.add(L.genera(M, 'for i in range(', { seme: seme, temperatura: 1 }).testo);
  assert.ok(varianti.size > 3, varianti.size + ' testi diversi');
  // due generatori con lo stesso seme producono la stessa sequenza
  const g1 = L.generatore(42);
  const g2 = L.generatore(42);
  for (let i = 0; i < 50; i++) { const x = g1(); assert.strictEqual(x, g2()); assert.ok(x >= 0 && x < 1); }
});

test('backoff: un contesto mai visto si accorcia fino a uno già visto', () => {
  // «Mario» non c'è nel corpus: «Mario ) :» non è mai stato visto, «) :» sì
  const d = L.prossimo(M, T.codifica('def saluta(Mario):'), 3);
  assert.strictEqual(d.tentativi[0].k, 3);
  assert.strictEqual(d.tentativi[0].visto, false);
  assert.strictEqual(d.k, 2);
  assert.deepStrictEqual(d.contesto, T.codifica('):'));
  const diretto = L.prossimo(M, T.codifica('x):'), 2);
  assert.deepStrictEqual(d.candidati.map((c) => [c.id, c.conteggio]), diretto.candidati.map((c) => [c.id, c.conteggio]));
  // un token fuori dal vocabolario non è mai stato visto: si torna alle frequenze generali
  const ignoto = L.prossimo(M, T.codifica('x = 👋'), 3);
  assert.strictEqual(ignoto.k, 0);
  assert.deepStrictEqual(ignoto.tentativi.map((t) => t.visto), [false, false, false, true]);
  assert.strictEqual(ignoto.totale, M.sequenze[0].length - 1);
  // uno spazio finale da solo non compare mai nel corpus (è sempre attaccato alla parola)
  assert.strictEqual(L.prossimo(M, T.codifica('for i in '), 3).k, 0);
  // l'inizio vuoto parte da ⟨inizio⟩
  const vuoto = L.prossimo(M, [], 3);
  assert.deepStrictEqual(vuoto.contesto, [L.ID_INIZIO]);
  assert.strictEqual(vuoto.candidati[0].testo, 'print');
});

test('la memoria limita il contesto a 1, 2 o 3 token', () => {
  const ids = T.codifica('for i in range(');
  for (const m of [1, 2, 3]) {
    const d = L.prossimo(M, ids, m);
    assert.strictEqual(d.k, m);
    assert.deepStrictEqual(d.contesto, ids.slice(-m));
  }
  assert.ok(L.prossimo(M, ids, 1).candidati.length > L.prossimo(M, ids, 3).candidati.length);
});

test('passo e genera: un token alla volta, con i limiti di righe, di token e la fine del file', () => {
  const st = L.nuovoStato(M, 'for i in range(', { seme: 3, temperatura: 1, memoria: 3 });
  const ev = L.passo(st);
  assert.strictEqual(st.generati.length, 1);
  assert.strictEqual(ev.token.id, ev.dist.candidati[ev.indice].id);
  assert.ok(ev.token.generato);
  // scelta manuale: niente sorteggio
  const ev2 = L.passo(st, 0);
  assert.strictEqual(ev2.u, null);
  assert.strictEqual(ev2.token.id, ev2.dist.candidati[0].id);
  const due = L.genera(M, 'def saluta(nome):', { seme: 5, maxRighe: 2 });
  assert.ok(due.testo.split('\n').length - 1 <= 2);
  assert.strictEqual(L.genera(M, 'print(', { seme: 5, maxToken: 5 }).tokens.length, 5);
  // l'ultima riga del corpus è seguita da ⟨fine⟩: con temperatura 0 il modello chiude il file
  const fine = L.genera(M, 'while conta < 3:\n    print("Ciao!")\n    conta = conta + 1\n', { temperatura: 0, maxRighe: 9 });
  assert.strictEqual(fine.motivo, 'fine');
  assert.strictEqual(fine.tokens[fine.tokens.length - 1].id, L.ID_FINE);
});

test('il numero di «parametri» del giocattolo è piccolo e coerente con le tabelle', () => {
  let n = 0;
  for (const tab of M.tabelle) for (const voce of tab.values()) n += voce.prossimi.size;
  assert.strictEqual(M.numeri, n);
  assert.ok(M.numeri > 300 && M.numeri < 3000);
  assert.ok(175e9 / M.numeri > 1e7, 'GPT-3 ha decine di milioni di volte più numeri');
  assert.strictEqual(L.migliaia(50257), '50.257');
  assert.strictEqual(L.migliaia(175000000000), '175.000.000.000');
});
