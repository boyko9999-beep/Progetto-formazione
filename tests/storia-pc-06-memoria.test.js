// Sezione 6 (Storia del PC), capitolo 6 «La gerarchia della memoria»: modello e contenuti.
// node --test tests/storia-pc-06-memoria.test.js
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const M = require('../sections/storia-pc/js/modelli/06-memoria.js');

const SEC = path.join(__dirname, '..', 'sections', 'storia-pc');
const testo = (html) => String(html).replace(/<[^>]+>/g, ' ');
const parole = (html) => testo(html).split(/\s+/).filter(Boolean).length;

function capitolo() {
  const P = require(path.join(SEC, 'js', 'core.js'));
  require(path.join(SEC, 'js', 'capitoli', '06-memoria.js'));
  return P.capitoli.find((c) => c.id === 'memoria');
}

/* ---------- tempo umano ---------- */

test('un ciclo di 0,3 ns diventa un secondo; 100 ns sono circa 5,6 minuti', () => {
  assert.ok(Math.abs(M.secondiUmani(M.CICLO_NS) - 1) < 1e-12);
  assert.strictEqual(M.tempoUmano(0.3).testo, '1 secondo');
  const ram = M.secondiUmani(100);
  assert.ok(Math.abs(ram - 333.333) < 0.01, 'RAM: ' + ram);
  assert.ok(Math.abs(ram / 60 - 5.556) < 0.01);
  assert.strictEqual(M.tempoUmano(100).testo, '5,6 minuti');
});

test('le unità di tempo umano scorrono da secondi ad anni', () => {
  assert.strictEqual(M.tempoUmano(1).testo, '3,3 secondi');
  assert.strictEqual(M.tempoUmano(15).testo, '50 secondi');
  assert.strictEqual(M.tempoUmano(50e3).testo, '1,9 giorni');
  assert.strictEqual(M.tempoUmano(8e6).testo, '10 mesi');
  assert.strictEqual(M.tempoUmano(150e6).testo, '16 anni');
  assert.strictEqual(M.formattaDurata(3600).testo, '1 ora');
  assert.strictEqual(M.formattaDurata(2 * 3600).testo, '2 ore');
  assert.strictEqual(M.formattaDurata(0).testo, '0 secondi');
  assert.strictEqual(M.formattaDurata(0.42).testo, '0,4 secondi');
});

test('i tempi reali si scrivono con l\'unità giusta e la virgola', () => {
  assert.strictEqual(M.formattaNs(0.3), '0,3 ns');
  assert.strictEqual(M.formattaNs(100), '100 ns');
  assert.strictEqual(M.formattaNs(832), '832 ns');
  assert.strictEqual(M.formattaNs(3200), '3,2 µs');
  assert.strictEqual(M.formattaNs(50e3), '50 µs');
  assert.strictEqual(M.formattaNs(8e6), '8 ms');
  assert.strictEqual(M.formattaNs(150e6), '150 ms');
  assert.strictEqual(M.numeroIt(17468), '17.468');
  assert.strictEqual(M.numeroIt(4.77, 2), '4,77');
});

test('la scala dei livelli va dal più veloce al più lento, con dati completi', () => {
  const L = M.LIVELLI;
  assert.strictEqual(L.length, 8);
  assert.deepStrictEqual(L.map((l) => l.id), ['registro', 'l1', 'l2', 'l3', 'ram', 'ssd', 'disco', 'rete']);
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    assert.ok(l.nome && l.capacita && testo(l.spiega).length > 40, 'livello incompleto ' + l.id);
    assert.ok(l.ns > 0);
    if (i > 0) {
      assert.ok(l.ns > L[i - 1].ns, 'latenze non in ordine a ' + l.id);
      assert.ok(M.durataAttesa(l.ns) > M.durataAttesa(L[i - 1].ns), 'animazione non crescente a ' + l.id);
      assert.ok(M.posizioneLog(M.secondiUmani(l.ns)) > M.posizioneLog(M.secondiUmani(L[i - 1].ns)));
    }
    // Animazione compressa: mai sotto i 0,3 s né sopra i 4,5 s, anche per la rete.
    assert.ok(M.durataAttesa(l.ns) >= 300 && M.durataAttesa(l.ns) <= 4500, 'durata ' + l.id);
    assert.ok(M.posizioneLog(M.secondiUmani(l.ns)) > 0 && M.posizioneLog(M.secondiUmani(l.ns)) < 1);
  }
  // Ordini di grandezza dichiarati nel capitolo.
  assert.ok(M.perId('ram').ns >= 80 && M.perId('ram').ns <= 120);
  assert.ok(M.perId('disco').ns >= 5e6 && M.perId('disco').ns <= 10e6);
  assert.ok(M.perId('rete').ns >= 100e6 && M.perId('rete').ns <= 150e6);
  assert.strictEqual(M.perId('inesistente'), null);
});

test('l\'orologio cresce in modo esponenziale e la sua scala è logaritmica', () => {
  const T = M.secondiUmani(150e6);
  assert.strictEqual(M.orologio(T, 0), 0);
  assert.ok(Math.abs(M.orologio(T, 1) - T) / T < 1e-9);
  let prima = -1;
  for (let k = 0; k <= 1.0001; k += 0.05) {
    const v = M.orologio(T, k);
    assert.ok(v > prima);
    prima = v;
  }
  // A metà animazione la posizione sulla scala logaritmica è a metà strada.
  const meta = M.posizioneLog(M.orologio(T, 0.5));
  assert.ok(Math.abs(meta - M.posizioneLog(T) / 2) < 1e-9);
  for (let i = 1; i < M.TACCHE.length; i++) assert.ok(M.TACCHE[i].s > M.TACCHE[i - 1].s);
});

/* ---------- simulatore di cache ---------- */

test('un indirizzo si divide in etichetta, riga e posizione', () => {
  const d = M.creaCache({ righe: 8, blocco: 4, vie: 1, ram: 64 });
  assert.deepStrictEqual(d.bit, { posizione: 2, indice: 3, etichetta: 1 });
  const s = M.scomponi(d, 37);
  assert.deepStrictEqual([s.blocco, s.posizione, s.insieme, s.etichetta], [9, 1, 1, 1]);
  const campi = M.campiIndirizzo(d, 37);
  assert.deepStrictEqual([campi.etichetta, campi.indice, campi.posizione, campi.tutto], ['1', '001', '01', '100101']);

  const a = M.creaCache({ righe: 8, blocco: 4, vie: 2, ram: 64 });
  assert.strictEqual(a.insiemi, 4);
  assert.deepStrictEqual(a.bit, { posizione: 2, indice: 2, etichetta: 2 });
  const c2 = M.campiIndirizzo(a, 37);
  assert.deepStrictEqual([c2.etichetta, c2.indice, c2.posizione], ['10', '01', '01']);
  assert.deepStrictEqual(M.rivali(d, 1), [1, 9]);
  assert.deepStrictEqual(M.rivali(a, 1), [1, 5, 9, 13]);
  assert.throws(() => M.creaCache({ righe: 6 }), RangeError);
  assert.throws(() => M.accedi(d, 64), RangeError);
});

test('lettura in fila con blocchi da 4 byte: 75% di colpi (mancato, colpo, colpo, colpo)', () => {
  for (const vie of [1, 2]) {
    const r = M.simula({ vie: vie }, M.generaAccessi('sequenziale'));
    assert.strictEqual(r.esiti.length, 32);
    assert.strictEqual(r.colpi, 24);
    assert.strictEqual(r.mancati, 8);
    assert.strictEqual(r.percentuale, 75);
    r.esiti.forEach((e, i) => assert.strictEqual(e.colpo, i % 4 !== 0, 'accesso ' + i));
    assert.ok(r.esiti.filter((e) => e.colpo).every((e) => e.motivo === 'spaziale'));
    assert.ok(r.esiti.filter((e) => !e.colpo).every((e) => e.motivo === 'obbligatorio'));
  }
});

test('ciclo su pochi dati: dopo il riscaldamento tutti colpi', () => {
  const r = M.simula({ vie: 1 }, M.generaAccessi('ciclo'));
  assert.strictEqual(r.mancati, 2);
  assert.ok(r.percentuale > 93);
  assert.ok(r.esiti.slice(8).every((e) => e.colpo), 'dopo il primo giro devono essere tutti colpi');
  assert.ok(r.esiti.slice(8).every((e) => e.motivo === 'temporale' || e.motivo === 'spaziale'));
});

test('LRU: in un insieme pieno esce il blocco usato meno di recente', () => {
  const c = M.creaCache({ righe: 8, blocco: 4, vie: 2, ram: 64 });
  // Blocchi 0, 4 e 8 (indirizzi 0, 16, 32) cadono tutti nell'insieme 0.
  assert.strictEqual(M.accedi(c, 0).colpo, false);
  assert.strictEqual(M.accedi(c, 16).colpo, false);
  assert.strictEqual(M.accedi(c, 1).colpo, true); // rilegge il blocco 0: ora è il più recente
  assert.strictEqual(M.prossimaVittima(c, 0), c.linee[0].findIndex((l) => l.blocco === 4));
  const e = M.accedi(c, 32);
  assert.strictEqual(e.colpo, false);
  assert.deepStrictEqual(e.scartato, { blocco: 4, etichetta: 1 }, 'con LRU esce il blocco 4, non il primo arrivato');
  assert.strictEqual(M.accedi(c, 2).colpo, true, 'il blocco 0 è rimasto');
  const di = M.accedi(c, 17);
  assert.strictEqual(di.colpo, false, 'il blocco 4 era uscito');
  // Una cache completamente associativa della stessa capienza lo avrebbe tenuto: è un conflitto.
  assert.strictEqual(di.motivo, 'conflitto');
  assert.strictEqual(M.prossimaVittima(c, 1), -1, 'l\'insieme 1 ha ancora vie libere');
});

test('due array a 32 byte di distanza: conflitto nella cache diretta, risolto con 2 vie', () => {
  const accessi = M.generaAccessi('conflitto');
  assert.deepStrictEqual(accessi.slice(0, 4), [0, 32, 1, 33]);
  const diretta = M.simula({ vie: 1 }, accessi);
  assert.strictEqual(diretta.colpi, 0);
  assert.ok(diretta.esiti.filter((e) => e.motivo === 'conflitto').length >= 20);
  const due = M.simula({ vie: 2 }, accessi);
  assert.strictEqual(due.percentuale, 75);
});

test('salti a caso: sequenza deterministica con il seme, dentro i 64 byte', () => {
  const a = M.generaAccessi('casuale');
  const b = M.generaAccessi('casuale', M.SEME);
  const c = M.generaAccessi('casuale', M.SEME + 1);
  assert.deepStrictEqual(a, b);
  assert.notDeepStrictEqual(a, c);
  assert.strictEqual(a.length, 32);
  assert.ok(a.every((x) => Number.isInteger(x) && x >= 0 && x < 64));
  const r1 = M.simula({ vie: 1 }, a);
  const r2 = M.simula({ vie: 2 }, a);
  // A caso la cache aiuta poco, e meno che con la lettura in fila.
  assert.ok(r1.percentuale < 60 && r2.percentuale < 60);
  assert.ok(r2.percentuale >= r1.percentuale);
  assert.throws(() => M.generaAccessi('boh'), RangeError);
});

test('tempo stimato: colpo 1 ns, mancato 1 + 100 ns', () => {
  assert.deepStrictEqual(M.stimaTempo(24, 8), { conCache: 832, senzaCache: 3200 });
  const r = M.simula({ vie: 1 }, M.generaAccessi('sequenziale'));
  assert.strictEqual(r.conCache, 832);
  assert.strictEqual(r.senzaCache, 3200);
});

test('le spiegazioni raccontano colpi, mancati e sostituzioni', () => {
  const c = M.creaCache({ vie: 1 });
  const m = M.spiegaAccesso(c, M.accedi(c, 4));
  assert.match(m, /Mancato/);
  assert.match(m, /4–7/);
  const h = M.spiegaAccesso(c, M.accedi(c, 5));
  assert.match(h, /colpo/);
  assert.match(h, /spaziale/);
  M.accedi(c, 36);
  const conf = M.spiegaAccesso(c, M.accedi(c, 6));
  assert.match(conf, /conflitto/);
  assert.match(conf, /esce il blocco 36–39/);
  const c2 = M.creaCache({ vie: 2 });
  [0, 16, 32].forEach((x) => M.accedi(c2, x));
  const lru = M.spiegaAccesso(c2, M.accedi(c2, 48));
  assert.match(lru, /LRU/);
});

test('generazioni della RAM: anni in ordine, tensioni in calo, banda in crescita', () => {
  const G = M.GENERAZIONI_RAM;
  for (let i = 1; i < G.length; i++) {
    assert.ok(G[i].anno > G[i - 1].anno);
    assert.ok(G[i].volt < G[i - 1].volt);
    assert.ok(G[i].gbs > G[i - 1].gbs);
  }
  G.forEach((g) => assert.ok(Math.abs(M.bandaModulo(g.mts) - g.gbs) < 1e-9, g.nome));
});

/* ---------- contenuti del capitolo ---------- */

test('il capitolo rispetta la struttura: testi, schede, figure, numeri, punti', () => {
  const cap = capitolo();
  assert.ok(cap, 'capitolo memoria non registrato');
  assert.strictEqual(cap.numero, 6);
  assert.strictEqual(cap.periodo, '1947–oggi');
  const testi = cap.blocchi.filter((b) => b.tipo === 'testo');
  assert.ok(testi.length >= 4 && testi.length <= 6, 'blocchi di testo: ' + testi.length);
  const n = testi.reduce((t, b) => t + b.paragrafi.reduce((s, p) => s + parole(p), 0) + parole(b.titolo || ''), 0);
  assert.ok(n >= 1400 && n <= 2200, 'parole di testo: ' + n);
  testi.forEach((b) => assert.ok(b.titolo, 'testo senza titoletto'));

  const schede = cap.blocchi.find((b) => b.tipo === 'schede').items;
  assert.ok(schede.length >= 7 && schede.length <= 12);
  for (let i = 1; i < schede.length; i++) assert.ok(schede[i].anno >= schede[i - 1].anno, 'schede fuori ordine a ' + schede[i].nome);
  assert.ok(schede.some((s) => s.italia), 'manca una scheda italiana');
  schede.forEach((s) => assert.ok(Number.isInteger(s.anno) && s.luogo && testo(s.testo).length > 30));

  const figure = cap.blocchi.filter((b) => b.tipo === 'figura');
  assert.ok(figure.length >= 1 && figure.length <= 2);
  figure.forEach((f) => assert.ok(typeof f.svg === 'function' && f.alt.length > 40 && f.didascalia));

  const numeri = cap.blocchi.find((b) => b.tipo === 'numeri').items;
  assert.ok(numeri.length >= 3 && numeri.length <= 4);
  numeri.forEach((x) => assert.ok(typeof x.valore === 'number' && x.unita && x.etichetta));

  assert.ok(cap.blocchi.some((b) => b.tipo === 'nota'));
  assert.ok(cap.blocchi.some((b) => b.tipo === 'italia'));
  assert.ok(cap.punti.length >= 4 && cap.punti.length <= 6);
  assert.ok(cap.lab && typeof cap.lab.crea === 'function');
  // Le sezioni si collegano sempre con index.html esplicito.
  cap.collegamenti.forEach((l) => assert.ok(!/\/#/.test(l.href) && !/\/$/.test(l.href), l.href));
});
