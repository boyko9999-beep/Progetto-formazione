// Test del laboratorio «Le pipe di Unix» (capitolo 8): ogni strumento come funzione pura su
// array di righe, la classica catena delle parole più frequenti, i controlli e i consigli.
// node --test sections/programmazione/test/pipe.test.js
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/lab/pipe.js');

const S = (id, p) => L.stadio(id, p);
const parole = () => L.trMinuscole(L.trParole(L.cat()));

test('il file: tre terzine e due righe vuote, nessun a capo dentro le righe', () => {
  assert.strictEqual(L.FILE, 'inferno.txt');
  assert.strictEqual(L.TESTO.length, 11);
  assert.strictEqual(L.TESTO[0], 'Nel mezzo del cammin di nostra vita');
  assert.strictEqual(L.TESTO[3], '');
  assert.strictEqual(L.TESTO[7], '');
  assert.strictEqual(L.TESTO[10], 'dirò de l’altre cose ch’i’ v’ho scorte.');
  for (const r of L.TESTO) assert.ok(!r.includes('\n'));
  assert.notStrictEqual(L.cat(), L.TESTO, 'cat restituisce una copia');
  assert.deepStrictEqual(L.cat(['ignorata']), L.TESTO, 'con un nome di file, cat ignora l\'entrata');
});

test('flussi e righe: l\'ultimo a capo chiude l\'ultima riga', () => {
  assert.deepStrictEqual(L.inRighe(''), []);
  assert.deepStrictEqual(L.inRighe('a\nb\n'), ['a', 'b']);
  assert.deepStrictEqual(L.inRighe('a\n\nb\n'), ['a', '', 'b']);
  assert.strictEqual(L.inFlusso(['a', '', 'b']), 'a\n\nb\n');
  assert.deepStrictEqual(L.inRighe(L.inFlusso(L.TESTO)), L.TESTO);
});

test('tr -cs: una parola per riga, accenti interi, apostrofi come separatori', () => {
  const w = L.trParole(L.TESTO);
  assert.strictEqual(w.length, 68);
  assert.deepStrictEqual(w.slice(0, 7), ['Nel', 'mezzo', 'del', 'cammin', 'di', 'nostra', 'vita']);
  for (const x of ['ché', 'è', 'più', 'dirò']) assert.ok(w.includes(x), 'manca ' + x);
  assert.deepStrictEqual(w.slice(w.indexOf('dirò'), w.indexOf('dirò') + 10), ['dirò', 'de', 'l', 'altre', 'cose', 'ch', 'i', 'v', 'ho', 'scorte']);
  assert.ok(w.every((x) => /^\p{L}+$/u.test(x)), 'solo lettere, nessuna riga vuota');
  assert.deepStrictEqual(L.trParole(['  ciao, mondo!']), ['', 'ciao', 'mondo'], 'come il vero tr: un separatore iniziale lascia una riga vuota');
  assert.deepStrictEqual(L.trParole([]), []);
  assert.deepStrictEqual(L.trParole(['', '']), [''], 'due a capo si fondono in uno: resta una riga vuota');
});

test('tr A-Z a-z: solo le maiuscole inglesi', () => {
  assert.deepStrictEqual(L.trMinuscole(['Nel', 'AHI', 'mezzo', 'È']), ['nel', 'ahi', 'mezzo', 'È']);
  const w = parole();
  assert.ok(w.every((x) => x === x.toLowerCase()));
});

test('sort: ordine alfabetico italiano, uguali vicine', () => {
  assert.deepStrictEqual(L.ordina(['via', 'è', 'Ahi', 'che', 'ché', 'e', 'a']), ['a', 'Ahi', 'che', 'ché', 'e', 'è', 'via']);
  assert.deepStrictEqual(L.ordina(['dirò', 'diritta', 'dir']), ['dir', 'diritta', 'dirò']);
  assert.deepStrictEqual(L.ordina(['più', 'poco', 'per']), ['per', 'più', 'poco']);
  const input = ['b', 'a', 'b', 'a'];
  const out = L.ordina(input);
  assert.deepStrictEqual(out, ['a', 'a', 'b', 'b']);
  assert.deepStrictEqual(input, ['b', 'a', 'b', 'a'], 'non modifica l\'entrata');
  // le righe identiche sono sempre adiacenti, anche con maiuscole e accenti
  const misto = L.ordina(['E', 'e', 'E', 'è', 'e']);
  assert.deepStrictEqual(misto, ['E', 'E', 'e', 'e', 'è']);
});

test('uniq -c: fonde solo le righe uguali vicine, conteggio su 7 colonne', () => {
  assert.deepStrictEqual(L.uniqC(['a', 'a', 'b', 'a']), ['      2 a', '      1 b', '      1 a']);
  assert.deepStrictEqual(L.uniqC([]), []);
  assert.deepStrictEqual(L.uniqC(['', '']), ['      2 ']);
  const u = L.uniqC(L.ordina(parole()));
  assert.strictEqual(u.length, 56);
  assert.ok(u.includes('      3 è'));
  assert.ok(u.includes('      2 selva'));
  assert.strictEqual(u.reduce((t, r) => t + L.numeroIniziale(r), 0), 68, 'i conteggi sommano a tutte le parole');
});

test('sort -rn: numeri dal più grande; a parità, riga intera rovesciata come GNU sort', () => {
  assert.deepStrictEqual(L.ordinaNumeri(['      1 a', '     10 b', '      2 c']), ['     10 b', '      2 c', '      1 a']);
  assert.deepStrictEqual(L.ordinaNumeri(['      2 a', '      2 c', '      2 b']), ['      2 c', '      2 b', '      2 a']);
  assert.deepStrictEqual(L.ordinaNumeri(['x', '3', 'y']), ['3', 'y', 'x'], 'senza numero vale 0');
  assert.strictEqual(L.numeroIniziale('   -4 z'), -4);
  assert.strictEqual(L.numeroIniziale('selva'), 0);
});

test('head, grep e wc', () => {
  assert.deepStrictEqual(L.testa(['a', 'b', 'c'], 2), ['a', 'b']);
  assert.deepStrictEqual(L.testa(['a'], 5), ['a']);
  assert.deepStrictEqual(L.cerca(L.TESTO, 'selva'), ['mi ritrovai per una selva oscura,', 'esta selva selvaggia e aspra e forte']);
  assert.deepStrictEqual(L.cerca(L.TESTO, 'Selva'), [], 'grep distingue le maiuscole');
  assert.deepStrictEqual(L.cerca(parole(), 'selva'), ['selva', 'selva', 'selvaggia'], 'grep trova anche pezzi di parola');
  assert.deepStrictEqual(L.contaRighe(L.TESTO), ['11']);
  assert.deepStrictEqual(L.contaRighe([]), ['0']);
  assert.strictEqual(L.leggiNumero(' 5 '), 5);
  for (const x of ['', '0', '100', '2.5', '-1', 'cinque', null]) assert.strictEqual(L.leggiNumero(x), null, String(x));
});

test('la catena delle parole più frequenti', () => {
  const catena = L.preset('frequenti');
  assert.strictEqual(L.rigaComando(catena), "cat inferno.txt | tr -cs '[:alpha:]' '\\n' | tr A-Z a-z | sort | uniq -c | sort -rn | head -n 5");
  const r = L.esegui(catena);
  assert.ok(r.ok);
  assert.deepStrictEqual(r.stadi.map((s) => s.uscita.length), [11, 68, 68, 68, 56, 56, 5]);
  assert.deepStrictEqual(r.stadi.map((s) => s.entrata.length), [0, 11, 68, 68, 68, 56, 56]);
  assert.deepStrictEqual(r.uscita, ['      3 è', '      2 selva', '      2 per', '      2 nel', '      2 la']);
  assert.match(L.consiglio(r), /«è».*3 volte.*«selva»/);
  r.stadi.forEach((s) => assert.ok(L.descrivi(s).startsWith('`' + s.comando + '`')));
});

test('gli altri due esempi', () => {
  const righe = L.esegui(L.preset('righe'));
  assert.strictEqual(L.rigaComando(L.preset('righe')), 'cat inferno.txt | wc -l');
  assert.deepStrictEqual(righe.uscita, ['11']);
  assert.match(L.consiglio(righe), /9 versi.*2 righe vuote/);
  const selva = L.esegui(L.preset('selva'));
  assert.strictEqual(L.rigaComando(L.preset('selva')), 'cat inferno.txt | grep selva');
  assert.strictEqual(selva.uscita.length, 2);
  assert.strictEqual(L.esegui([S('cat'), S('parole'), S('wc')]).uscita[0], '68');
  assert.strictEqual(L.esegui([S('cat'), S('parole'), S('minuscole'), S('sort'), S('uniq'), S('wc')]).uscita[0], '56');
});

test('ogni preset è una catena nuova e valida', () => {
  for (const p of L.PRESET) {
    const a = L.preset(p.id);
    const b = L.preset(p.id);
    assert.notStrictEqual(a, b);
    assert.ok(L.valida(a).ok, p.id);
    assert.strictEqual(a[0].id, 'cat');
  }
  assert.strictEqual(L.preset('nessuno'), null);
});

test('controlli: ogni errore spiega come rimediare', () => {
  const vuota = L.valida([]);
  assert.ok(!vuota.ok);
  assert.match(vuota.errori[0].testo, /aggiungi `cat inferno\.txt`/);
  const senzaCat = L.valida([S('sort'), S('wc')]);
  assert.ok(!senzaCat.ok);
  assert.strictEqual(senzaCat.errori[0].indice, 0);
  assert.match(senzaCat.errori[0].testo, /in cima alla catena/);
  const grepVuoto = L.valida([S('cat'), S('grep', '  ')]);
  assert.strictEqual(grepVuoto.errori[0].campo, 'parola');
  assert.strictEqual(grepVuoto.errori[0].indice, 1);
  assert.ok(!L.valida([S('cat'), S('grep', 'due parole')]).ok);
  assert.ok(!L.valida([S('cat'), S('grep', 'a.*b')]).ok);
  assert.ok(!L.valida([S('cat'), S('grep', 'x'.repeat(25))]).ok);
  assert.ok(L.valida([S('cat'), S('grep', 'perché')]).ok, 'le lettere accentate vanno bene');
  assert.ok(L.valida([S('cat'), S('grep', ' selva ')]).ok, 'gli spazi attorno si ignorano');
  const headZero = L.valida([S('cat'), S('head', '0')]);
  assert.strictEqual(headZero.errori[0].campo, 'n');
  assert.ok(!L.valida([S('cat'), S('head', 'tre')]).ok);
  const lunga = Array.from({ length: L.MAX_STADI + 1 }, (_, i) => S(i ? 'sort' : 'cat'));
  assert.ok(!L.valida(lunga).ok);
  assert.ok(!L.valida([S('cat'), { id: 'rm' }]).ok);
  assert.throws(() => S('rm'));
});

test('cat a metà catena: un avviso, non un errore, e ricomincia dal file', () => {
  const catena = [S('cat'), S('wc'), S('cat')];
  const v = L.valida(catena);
  assert.ok(v.ok);
  assert.strictEqual(v.avvisi.length, 1);
  assert.strictEqual(v.avvisi[0].indice, 2);
  const r = L.esegui(catena);
  assert.deepStrictEqual(r.uscita, L.TESTO);
  assert.match(L.descrivi(r.stadi[2]), /ignora/);
});

test('esegui non parte con errori e non modifica la catena', () => {
  const r = L.esegui([S('sort')]);
  assert.ok(!r.ok);
  assert.deepStrictEqual(r.stadi, []);
  const catena = L.preset('frequenti');
  const copia = JSON.stringify(catena);
  L.esegui(catena);
  assert.strictEqual(JSON.stringify(catena), copia);
});

test('la riga di comando segue i parametri, anche mentre li scrivi', () => {
  assert.strictEqual(L.comando(S('head', '3')), 'head -n 3');
  assert.strictEqual(L.comando(S('grep', 'via')), 'grep via');
  assert.strictEqual(L.comando(S('grep', '')), 'grep …');
  assert.strictEqual(L.comando({ id: 'boh' }), '?');
  assert.strictEqual(L.rigaComando([]), '');
  for (const id of L.ORDINE) {
    const def = L.STRUMENTI[id];
    assert.ok(def.descrizione && def.nome, id);
    assert.ok(L.comando(S(id)).startsWith(def.nome), id);
  }
});

test('consigli: uniq senza sort, grep senza risultati, wc dopo uniq', () => {
  assert.match(L.consiglio(L.esegui([S('cat'), S('parole'), S('minuscole'), S('uniq')])), /Metti `sort` subito prima/);
  assert.match(L.consiglio(L.esegui([S('cat'), S('grep', 'Selva')])), /Nessuna riga/);
  assert.match(L.consiglio(L.esegui([S('cat'), S('parole'), S('grep', 'selva')])), /«selvaggia»/);
  assert.match(L.consiglio(L.esegui([S('cat'), S('parole'), S('minuscole'), S('sort'), S('uniq'), S('wc')])), /56/);
  assert.strictEqual(L.consiglio({ ok: false }), '');
});

// Riferimento registrato con i veri strumenti (GNU coreutils 9.4, LC_ALL=C) sulle stesse 68 parole:
//   sort parole.txt | uniq -c | sort -rn | head -12
// (il vero tr lavora a byte e spezzerebbe le lettere accentate: per questo si confronta da uniq in poi)
test('uniq -c e sort -rn danno le stesse righe dei veri strumenti GNU', () => {
  const gnu = ['      3 è', '      2 selva', '      2 per', '      2 nel', '      2 la', '      2 i',
    '      2 era', '      2 e', '      2 del', '      2 che', '      2 ch', '      1 vita'];
  assert.deepStrictEqual(L.ordinaNumeri(L.uniqC(L.ordina(parole()))).slice(0, 12), gnu);
});

test('le frasi si accordano con i numeri e guardano i dati che passano davvero', () => {
  const E = (...c) => L.esegui(c.map((x) => (Array.isArray(x) ? S(...x) : S(x))));
  // singolare e plurale
  assert.match(L.consiglio(E('cat', ['grep', 'via'])), /^\*\*1 riga\*\* contiene «via»/);
  assert.match(L.descrivi(E('cat', ['grep', 'via']).stadi[1]), /la sola che contiene «via»/);
  assert.match(L.descrivi(E('cat', ['head', '10']).stadi[1]), /scarta l'ultima/);
  assert.match(L.descrivi(E('cat', ['head', '1']).stadi[1]), /la \*\*prima riga\*\*/);
  assert.match(L.descrivi(E('cat', 'wc', 'cat').stadi[2]), /ignora la riga che gli arriva/);
  // grep con le maiuscole sbagliate: il consiglio indica la forma del testo, non un tr inutile
  assert.match(L.consiglio(E('cat', ['grep', 'Selva'])), /nel testo c'è «selva»/);
  assert.match(L.consiglio(E('cat', ['grep', 'AHI'])), /nel testo c'è «Ahi»/);
  assert.doesNotMatch(L.consiglio(E('cat', 'parole', 'minuscole', ['grep', 'Nel'])), /tr A-Z a-z/);
  assert.match(L.consiglio(E('cat', ['grep', 'zebra'])), /nel testo non c'è/);
  // uniq su righe intere: in cima c'è la riga vuota (contata 2 volte, come fanno i veri strumenti)
  const righeIntere = L.consiglio(E('cat', 'sort', 'uniq', 'sortrn'));
  assert.match(righeIntere, /\*\*la riga vuota\*\*, 2 volte/);
  assert.match(righeIntere, /righe intere, non parole/);
  // «parole diverse» solo quando uniq ha contato parole e nessun filtro ha tolto righe
  assert.doesNotMatch(L.consiglio(E('cat', 'sort', 'uniq', 'wc')), /parole diverse/);
  assert.match(L.consiglio(E('cat', 'parole', 'sort', 'uniq', 'wc')), /\*\*57\*\*.*«Nel» e «nel»/);
  assert.doesNotMatch(L.consiglio(E('cat', 'parole', 'minuscole', 'sort', 'uniq', 'head', 'wc')), /parole diverse/);
  assert.doesNotMatch(L.consiglio(E('cat', 'sort', 'parole', 'wc')), /parole\*\*/, 'con la riga vuota in cima non sono tutte parole');
  // sort -rn senza numeri, comandi che non ricevono niente, tr dopo sort
  assert.match(L.descrivi(E('cat', 'sortrn').stadi[1]), /valgono tutte 0/);
  assert.match(L.descrivi(E('cat', ['grep', 'zebra'], 'sort').stadi[2]), /non riceve nessuna riga/);
  assert.match(L.descrivi(E('cat', 'sort', 'parole').stadi[2]), /\*\*68 parole\*\*.*prima riga resta vuota/);
});
