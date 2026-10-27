// Test del laboratorio «L'assemblatore» (capitolo 4): il copione delle due passate, la mappa righe↔celle,
// i consigli sugli errori, l'esecuzione veloce e la sfida «Traduci a mano».
// node --test sections/programmazione/test/assemblatore.test.js
const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/lib/cpu-giocattolo.js');
const L = require('../js/lab/assemblatore.js');

const ESEMPI = C.ESEMPI;

test('il file si carica senza DOM ed esporta la logica', () => {
  for (const f of ['copione', 'piano', 'mappa', 'dividiRiga', 'consiglio', 'narra', 'esegui', 'sfide', 'controlla', 'leggiBits']) {
    assert.strictEqual(typeof L[f], 'function', f);
  }
});

test('gli esempi si assemblano senza errori e il copione li copre tutti', () => {
  for (const nome of Object.keys(ESEMPI)) {
    const cop = L.copione(ESEMPI[nome]);
    assert.strictEqual(cop.errore, null, nome);
    assert.ok(cop.ris.ok, nome);
    const righe = ESEMPI[nome].split('\n').length;
    const p1 = cop.passi.filter((p) => p.fase === 1);
    const p2 = cop.passi.filter((p) => p.fase === 2);
    assert.strictEqual(p1.length, righe, nome + ': la prima passata visita ogni riga');
    assert.strictEqual(p2.length, cop.ris.lunghezza, nome + ': la seconda codifica ogni cella');
    // le parole della seconda passata sono quelle dell'assemblatore, nelle celle giuste
    for (const p of p2) assert.strictEqual(p.parola, cop.ris.parole[p.indirizzo], nome + ' riga ' + p.riga);
  }
});

test('somma: tabella dei simboli e contatore di posizione', () => {
  const cop = L.copione(ESEMPI.somma);
  const simboli = {};
  for (const p of cop.passi) if (p.fase === 1 && p.valore != null) simboli[p.etichetta] = p.valore;
  assert.deepStrictEqual(simboli, { ciclo: 0, fine: 8, n: 11, uno: 12, somma: 13 });
  const p1 = cop.passi.filter((p) => p.fase === 1);
  assert.strictEqual(p1[0].tipo, 'commento');
  assert.strictEqual(p1[0].contatore, 0);
  assert.strictEqual(p1[1].tipo, 'etichetta-istruzione');
  assert.strictEqual(p1[1].contatore, 1);
  assert.strictEqual(p1[p1.length - 1].contatore, 14);
  assert.deepStrictEqual(cop.riassunto, { righe: 15, parole: 14, etichette: 5, dati: 3 });
});

test('somma: la seconda passata traduce mnemonici ed etichette', () => {
  const cop = L.copione(ESEMPI.somma);
  const p2 = cop.passi.filter((p) => p.fase === 2);
  const prima = p2[0]; // ciclo: LOAD somma
  assert.strictEqual(prima.istruzione, 'LOAD');
  assert.strictEqual(prima.codice, 1);
  assert.strictEqual(prima.simbolo, 'somma');
  assert.strictEqual(prima.valore, 13);
  assert.strictEqual(C.bin(prima.parola, 8), '00101101');
  const halt = p2.find((p) => p.istruzione === 'HALT');
  assert.strictEqual(halt.conOperando, false);
  assert.strictEqual(halt.parola, 0);
  const dato = p2.find((p) => p.dato && p.operando === '5');
  assert.strictEqual(dato.indirizzo, 11);
  assert.strictEqual(dato.parola, 5);
  assert.strictEqual(dato.simbolo, null);
});

test('mappa righe ↔ celle', () => {
  const ris = C.assembla(ESEMPI.somma);
  const m = L.mappa(ris);
  assert.strictEqual(m.cellaPerRiga[2], 0);
  assert.strictEqual(m.rigaPerCella[0], 2);
  assert.strictEqual(m.cellaPerRiga[15], 13);
  assert.strictEqual(m.cellaPerRiga[1], undefined, 'un commento non ha cella');
  for (const [riga, cella] of Object.entries(m.cellaPerRiga)) assert.strictEqual(m.rigaPerCella[cella], Number(riga));
  assert.deepStrictEqual(L.mappa(null), { cellaPerRiga: {}, rigaPerCella: {} });
});

test('dividiRiga non perde nemmeno uno spazio e riconosce i pezzi', () => {
  const casi = ESEMPI.somma.split('\n').concat(['', '   ', 'x: LAOD 3 4 ; ops', 'LOAD,5', 'fine:', '1abc: LOAD', '  ciclo : JZ fine;fine', 'DATA -3']);
  for (const r of casi) assert.strictEqual(L.dividiRiga(r).map((t) => t.testo).join(''), r, JSON.stringify(r));
  const tipi = (r) => L.dividiRiga(r).filter((t) => t.tipo !== 'spazio').map((t) => t.tipo);
  assert.deepStrictEqual(tipi('ciclo:  LOAD somma'), ['etichetta', 'istruzione', 'simbolo']);
  assert.deepStrictEqual(tipi('ADD 7 ; sette'), ['istruzione', 'operando', 'commento']);
  assert.deepStrictEqual(tipi('n: DATA 5'), ['etichetta', 'dati', 'numero']);
  assert.deepStrictEqual(tipi('LAOD 3 4'), ['ignoto', 'operando', 'extra']);
  assert.deepStrictEqual(tipi('store out'), ['istruzione', 'simbolo']);
});

test('errore della prima passata: istruzione sconosciuta, con suggerimento', () => {
  const src = 'LOAD a\nLAOD a\nHALT\na: DATA 2';
  const cop = L.copione(src);
  assert.deepStrictEqual(cop.errore, { passata: 1, riga: 2, messaggio: 'Istruzione sconosciuta: "LAOD".' });
  const ultimo = cop.passi[cop.passi.length - 1];
  assert.strictEqual(ultimo.fase, 1);
  assert.strictEqual(ultimo.riga, 2);
  assert.ok(cop.passi.every((p) => p.fase === 1), 'l\'animazione si ferma prima della seconda passata');
  const c = L.consiglio(cop.errore.messaggio, cop.ris, cop.ris.righe[1]);
  assert.match(c, /Forse intendevi LOAD\?/);
  assert.strictEqual(L.italiano(cop.errore.messaggio), 'Istruzione sconosciuta: «LAOD».');
});

test('errore della seconda passata: etichetta sconosciuta, scoperta solo dopo la tabella', () => {
  const src = 'LOAD n\nJZ fien\nHALT\nfine: HALT\nn: DATA 0';
  const cop = L.copione(src);
  assert.strictEqual(cop.errore.passata, 2);
  assert.strictEqual(cop.errore.riga, 2);
  assert.strictEqual(cop.passi.filter((p) => p.fase === 1).length, 5, 'la prima passata è completa');
  const c = L.consiglio(cop.errore.messaggio, cop.ris, cop.ris.righe[1]);
  assert.match(c, /Forse intendevi fine\?/);
});

test('altri errori e i loro consigli', () => {
  const caso = (src) => {
    const cop = L.copione(src);
    assert.ok(cop.errore, src);
    return { cop: cop, c: L.consiglio(cop.errore.messaggio, cop.ris, cop.ris.righe[cop.errore.riga - 1]) };
  };
  let x = caso('a: HALT\na: HALT');
  assert.strictEqual(x.cop.errore.passata, 1);
  assert.match(x.c, /nome diverso/);
  x = caso('HALT 3');
  assert.strictEqual(x.cop.errore.passata, 2);
  assert.match(x.c, /Cancella quello che segue HALT/);
  x = caso('JUMP');
  assert.match(x.c, /JUMP ciclo/);
  x = caso('LOAD 40');
  assert.match(x.c, /da 0 a 31/);
  x = caso('out: HALT');
  assert.match(x.c, /già presi/);
  x = caso('ciclo LOAD n\nn: DATA 1');
  assert.match(x.c, /ciclo: LOAD n/);
  x = caso('fine HALT');
  assert.match(x.c, /fine: HALT/);
  x = caso('SOMMA 3');
  assert.match(x.c, /Forse intendevi ADD\?/);
  x = caso('PRINT 3');
  assert.match(x.c, /STORE OUT/);
  x = caso('JNZ 0');
  assert.match(x.c, /solo JZ/);
  x = caso('DATA x');
  assert.strictEqual(x.cop.errore.passata, 2);
  const lungo = Array.from({ length: 32 }, () => 'HALT').join('\n');
  x = caso(lungo);
  assert.strictEqual(x.cop.errore.passata, 1);
  assert.strictEqual(x.cop.errore.riga, 32);
  assert.match(x.c, /da 0 a 30/);
});

test('sorgente vuoto o di soli commenti', () => {
  assert.strictEqual(L.copione('').vuoto, true);
  assert.strictEqual(L.copione('; solo un commento\n\n').vuoto, true);
  assert.strictEqual(L.copione('HALT').vuoto, false);
  assert.strictEqual(L.copione('LAOD').vuoto, false, 'un errore non è un sorgente vuoto');
});

test('suggerisci: solo parole abbastanza lunghe e abbastanza vicine', () => {
  assert.strictEqual(L.suggerisci('fien', ['fine', 'n']), 'fine');
  assert.strictEqual(L.suggerisci('sooma', ['somma', 'uno']), 'somma');
  assert.strictEqual(L.suggerisci('d', ['a', 'b', 'c']), null);
  assert.strictEqual(L.suggerisci('zzzz', ['fine']), null);
  assert.strictEqual(L.distanza('LAOD', 'LOAD'), 1);
  assert.strictEqual(L.sinonimo('carica'), 'LOAD');
});

test('narra: testi con i colori giusti per ogni tipo di passo', () => {
  const cop = L.copione(ESEMPI.somma);
  const testi = cop.passi.map(L.narra);
  assert.match(testi[0], /^Riga 1: solo un commento/);
  assert.match(testi[1], /\[e:ciclo\] indica la cella \[a:0\]/);
  const p2 = testi.slice(15);
  assert.match(p2[0], /\[o:LOAD\] diventa \[o:001\]; la tabella dei simboli dice che \[e:somma\] è la cella \[a:13\], cioè \[a:01101\]\. La parola \[w:00101101\] va nella cella \[a:0\]/);
  assert.ok(p2.some((t) => /DATA non è un'istruzione, quindi niente codice operativo: il numero \[d:5\] va nella cella \[a:11\] così com'è, in binario \[d:00000101\]\.$/.test(t)));
  const neg = L.copione('x: DATA -3').passi.find((p) => p.fase === 2);
  assert.match(L.narra(neg), /in binario \[d:11111101\] \(i numeri negativi si scrivono in complemento a due\)\.$/);
  assert.ok(p2.some((t) => /\[o:HALT\] diventa \[o:000\] e non ha indirizzo|\[o:HALT\] diventa \[o:000\]; non ha indirizzo/.test(t)));
  assert.strictEqual(L.semplice('la [o:LOAD] e la [w:00101101]'), 'la LOAD e la 00101101');
  for (const t of testi) assert.ok(!/undefined|null|NaN/.test(t), t);
});

test('esecuzione: i tre esempi stampano quello che promettono', () => {
  const esito = (nome) => L.esegui(C.assembla(ESEMPI[nome]));
  const s = esito('somma');
  assert.deepStrictEqual(s.uscita, [15]);
  assert.ok(s.fermo && !s.limite);
  assert.strictEqual(s.passi, s.eventi.length);
  assert.deepStrictEqual(esito('conto').uscita, [3, 2, 1]);
  assert.deepStrictEqual(esito('formula').uscita, [14]);
  assert.match(L.bilancio(s), /^La macchina si è fermata dopo \d+ istruzioni: l'uscita è 15\.$/);
  assert.match(L.bilancio(L.esegui(C.assembla('HALT'))), /^La macchina si è fermata dopo 1 istruzione: non ha stampato niente/);
});

test('esecuzione: ciclo infinito, dati eseguiti, cella vuota', () => {
  const inf = L.esegui(C.assembla('ciclo: JUMP ciclo'));
  assert.ok(inf.limite);
  assert.strictEqual(inf.passi, L.LIMITE_PASSI);
  assert.match(L.bilancio(inf), /non si è ancora fermata/);
  const dati = L.esegui(C.assembla('LOAD n\nSTORE OUT\nn: DATA 7'));
  assert.deepStrictEqual(dati.uscita, [7]);
  assert.deepStrictEqual(dati.datiEseguiti, [2]);
  assert.match(L.bilancio(dati), /contiene un dato/);
  const vuota = L.esegui(C.assembla('LOAD 31\nSTORE OUT'));
  assert.deepStrictEqual(vuota.vuoteEseguite, [2]);
  assert.match(L.bilancio(vuota), /cella vuota/);
});

test('sfida: le tre istruzioni di partenza', () => {
  const s = L.sfide();
  assert.deepStrictEqual(s.map((x) => x.testo), ['LOAD 9', 'ADD 10', 'STORE OUT']);
  assert.deepStrictEqual(s.map((x) => x.bits), ['00101001', '01101010', '01011111']);
  for (const x of s) assert.strictEqual(C.disassembla(x.parola), x.istruzione + ' ' + x.indirizzo);
});

test('sfida: istruzioni a caso, ripetibili e tutte diverse', () => {
  const a = L.sfide(42);
  const b = L.sfide(42);
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a.length, 3);
  assert.strictEqual(new Set(a.map((x) => x.istruzione)).size, 3);
  for (let seme = 1; seme < 60; seme++) {
    for (const x of L.sfide(seme)) {
      assert.ok(x.indirizzo >= 1 && x.indirizzo <= 31);
      assert.strictEqual(x.bits.length, 8);
      assert.notStrictEqual(x.istruzione, 'HALT');
    }
  }
  assert.throws(() => L.sfida('HALT', 0));
  assert.throws(() => L.sfida('LOAD', 32));
});

test('sfida: controllo, lettura dal vivo e spiegazioni', () => {
  const [load, , store] = L.sfide();
  assert.deepStrictEqual(L.controlla(load, '00101001'), { ok: true, codiceOk: true, indirizzoOk: true, atteso: '00101001', dato: '00101001' });
  const e = L.controlla(load, [0, 1, 1, 0, 1, 0, 0, 1]);
  assert.strictEqual(e.ok, false);
  assert.strictEqual(e.codiceOk, false);
  assert.strictEqual(e.indirizzoOk, true);
  assert.match(L.spiegaSfida(load, e), /il codice operativo di LOAD è 001/);
  const f = L.controlla(store, '010 11110');
  assert.strictEqual(f.codiceOk, true);
  assert.match(L.spiegaSfida(store, f), /OUT, la cella 31, in binario a 5 bit si scrive 11111 \(31 = 16 \+ 8 \+ 4 \+ 2 \+ 1\)\.$/);
  assert.strictEqual(L.spiegaSfida(load, L.controlla(load, '00100000')), 'Non ancora: la cella 9 in binario a 5 bit si scrive 01001 (9 = 8 + 1).');
  assert.doesNotMatch(L.spiegaSfida(load, e), /prontuario/, 'il prontuario nella pagina si chiama «elenco dei codici»');
  assert.strictEqual(L.scomponi(10), '8 + 2');
  assert.strictEqual(L.scomponi(16), null, 'un bit solo non ha bisogno di somma');
  assert.strictEqual(L.scomponi(0), null);
  assert.strictEqual(L.controlla(load, '0010').ok, false, 'servono 8 bit');
  assert.match(L.spiegaSfida(store, L.controlla(store, '01011111')), /^Giusto/);
  assert.deepStrictEqual(L.leggiBits('00101001'), { codice: 1, nome: 'LOAD', indirizzo: 9, operando: true, testo: 'LOAD 9' });
  assert.strictEqual(L.leggiBits([0, 0, 0, 0, 0, 0, 0, 0]).testo, 'HALT');
  assert.strictEqual(L.leggiBits('111').testo, 'JZ 0');
});

test('prontuario e durate in italiano', () => {
  const pr = L.prontuario();
  assert.strictEqual(pr.length, 8);
  assert.deepStrictEqual(pr.map((x) => x.bits), ['000', '001', '010', '011', '100', '101', '110', '111']);
  for (const x of pr) assert.ok(x.breve && x.breve.length < 60, x.nome);
  for (const x of pr) assert.doesNotMatch(x.breve, /\blì\b/, x.nome + ': ogni riga del prontuario si legge da sola');
  assert.strictEqual(L.durataItaliana(48000), '48 secondi');
  assert.strictEqual(L.durataItaliana(65000), '1 minuto e 5 secondi');
  assert.strictEqual(L.durataItaliana(120000), '2 minuti');
  assert.strictEqual(L.durataItaliana(200), '1 secondo');
});

test('aiuti per l\'interfaccia: errori brevi, riga del cursore, etichette per cella', () => {
  const casi = [
    ['LAOD 3', 'istruzione sconosciuta'], ['JZ fien', 'etichetta sconosciuta'], ['JUMP', 'manca l\'indirizzo'],
    ['HALT 3', 'qui niente operando'], ['LOAD 40', 'indirizzo oltre 31'], ['LOAD 1 2', 'troppi operandi'],
    ['a: HALT\na: HALT', 'etichetta già usata'], ['out: HALT', 'nome riservato'], ['DATA x', 'serve un numero'], ['DATA 300', 'numero troppo grande'],
    [Array.from({ length: 32 }, () => 'HALT').join('\n'), 'memoria finita'],
  ];
  for (const [src, atteso] of casi) {
    const ris = C.assembla(src);
    assert.ok(ris.errori.length, src);
    assert.strictEqual(L.breve(ris.errori[0].messaggio), atteso, src);
  }
  assert.strictEqual(L.breve('boh'), 'errore');
  assert.strictEqual(L.rigaDi('a\nb\nc', 0), 1);
  assert.strictEqual(L.rigaDi('a\nb\nc', 2), 2);
  assert.strictEqual(L.rigaDi('a\nb\nc', 99), 3);
  assert.strictEqual(L.rigaDi('', 5), 1);
  const ris = C.assembla(ESEMPI.somma);
  assert.deepStrictEqual(L.etichettePerCella(ris), { 0: ['ciclo'], 8: ['fine'], 11: ['n'], 12: ['uno'], 13: ['somma'], 31: ['OUT'] });
  const doppia = C.assembla('Fine: HALT\nfine: HALT');
  assert.deepStrictEqual(L.etichettePerCella(doppia), { 0: ['Fine'], 31: ['OUT'] });
  assert.deepStrictEqual(L.etichettePerCella(null), {});
});

test('descriviCella: istruzioni, dati, celle vuote e uscita', () => {
  const ris = C.assembla(ESEMPI.somma);
  assert.strictEqual(L.descriviCella(ris, 0), 'Cella 0: 00101101, cioè LOAD 13, dalla riga 2 («ciclo: LOAD somma»).');
  assert.strictEqual(L.descriviCella(ris, 11), 'Cella 11: il dato 5, in binario 00000101, dalla riga 13 («n: DATA 5»).');
  assert.match(L.descriviCella(ris, 20), /^Cella 20: vuota/);
  assert.match(L.descriviCella(ris, 31), /^Cella 31: l'uscita, OUT/);
  const neg = C.assembla('x: DATA -3');
  assert.strictEqual(L.descriviCella(neg, 0), 'Cella 0: il dato -3, in binario 11111101, dalla riga 1 («x: DATA -3»).');
});

test('tempi: le tre velocità vengono dalle durate del motore', () => {
  const D = { istante: 80, veloce: 180, normale: 350, lenta: 600, narrativa: 1000 };
  const m = L.tempi('media', D);
  const l = L.tempi('lenta', D);
  const v = L.tempi('veloce', D);
  assert.strictEqual(m.riga, 350);
  assert.strictEqual(m.esegui, 180);
  for (const k of Object.keys(m)) {
    if (k === 'fattore') continue;
    assert.ok(l[k] > m[k] && m[k] > v[k] && v[k] > 0, k);
  }
  assert.deepStrictEqual(L.tempi('boh', D), m);
});

test('minuscola: dopo i due punti, ma non per sigle e mnemonici', () => {
  assert.strictEqual(L.minuscola('Etichetta sconosciuta: «fien».'), 'etichetta sconosciuta: «fien».');
  assert.strictEqual(L.minuscola('L\'etichetta «a» è già usata.'), 'l\'etichetta «a» è già usata.');
  assert.strictEqual(L.minuscola('DATA vuole un numero, per esempio DATA 7.'), 'DATA vuole un numero, per esempio DATA 7.');
  assert.strictEqual(L.minuscola('HALT non vuole operandi.'), 'HALT non vuole operandi.');
  assert.strictEqual(L.minuscola('«out» è una parola riservata'), '«out» è una parola riservata');
  const cop = L.copione('LOAD a\nLAOD a\nHALT\na: DATA 2');
  assert.strictEqual(L.narra(cop.passi[cop.passi.length - 1]), 'Riga 2: istruzione sconosciuta: «LAOD».');
});
