// Test del laboratorio «Dal pannello di cavi al programma memorizzato» (capitolo 3):
// i cablaggi dell'ENIAC, la geometria dei cavi e del bus, il racconto delle fasi e gli aiuti per l'editor dei bit.
// La CPU giocattolo ha già i suoi test in librerie.test.js.
// node --test sections/programmazione/test/programma-memorizzato.test.js
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/lab/programma-memorizzato.js');
const C = require('../js/lib/cpu-giocattolo.js');

const vicino = (a, b, eps) => Math.abs(a - b) <= (eps || 1e-6);

// Esegue un programma e raccoglie, per ogni istruzione, l'evento della CPU e le sue tre fasi.
function traccia(sorgente, modifica) {
  const a = C.assembla(sorgente);
  assert.ok(a.ok, JSON.stringify(a.errori));
  const parole = a.parole.slice();
  if (modifica) modifica(parole, a);
  const st = C.crea(parole);
  const passi = [];
  while (!st.fermo && st.passi < 500) {
    const mem = st.mem.slice();
    const ev = C.passo(st);
    passi.push({ ev: ev, fasi: L.fasiIstruzione(ev, mem) });
  }
  return { st: st, passi: passi, assemblato: a };
}

/* ---------- A) ENIAC ---------- */

test('i cablaggi dei problemi usano unità e prese che esistono, e manopole valide', () => {
  const unita = Object.fromEntries(L.UNITA.map((u) => [u.id, u]));
  for (const pb of Object.values(L.PROBLEMI)) {
    for (const c of pb.cavi) {
      assert.ok(unita[c.da] && unita[c.a], pb.id + ': ' + L.chiaveCavo(c));
      assert.ok(unita[c.da].prese.includes(c.tipo), 'presa ' + c.tipo + ' su ' + c.da);
      assert.ok(unita[c.a].prese.includes(c.tipo), 'presa ' + c.tipo + ' su ' + c.a);
      assert.notStrictEqual(c.da, c.a);
    }
    const chiavi = pb.cavi.map(L.chiaveCavo);
    assert.strictEqual(new Set(chiavi).size, chiavi.length, 'cavi doppi in ' + pb.id);
    for (const u of L.UNITA) {
      const m = pb.manopole[u.id];
      assert.ok(Number.isInteger(m) && m >= 0 && m < u.posizioni.length, pb.id + ': manopola di ' + u.id);
    }
  }
});

test('la somma 2 + 3 perfora 5 e ogni impulso segue un cavo collegato', () => {
  const passi = L.passiEniac('somma');
  const cavi = new Set(L.PROBLEMI.somma.cavi.map(L.chiaveCavo));
  assert.ok(passi.length >= 3);
  for (const p of passi) {
    assert.ok(cavi.has(p.cavo), p.cavo);
    assert.ok(L.UNITA.some((u) => u.id === p.unita));
    assert.ok(p.testo && !/undefined|NaN/.test(p.testo));
  }
  assert.deepStrictEqual(passi.filter((p) => p.uscita != null).map((p) => p.uscita), [5]);
  assert.strictEqual(passi.find((p) => p.numero != null).numero, 2);
});

test('i quadrati da 1 a 5 perforano 1, 4, 9, 16, 25 con cinque giri del programmatore principale', () => {
  const passi = L.passiEniac('quadrati');
  const cavi = new Set(L.PROBLEMI.quadrati.cavi.map(L.chiaveCavo));
  for (const p of passi) assert.ok(cavi.has(p.cavo), p.cavo);
  assert.deepStrictEqual(passi.filter((p) => p.uscita != null).map((p) => p.uscita), [1, 4, 9, 16, 25]);
  assert.deepStrictEqual([...new Set(passi.map((p) => p.giro))], [1, 2, 3, 4, 5]);
  assert.strictEqual(passi[passi.length - 1].valori.pp, 5);
  assert.deepStrictEqual(L.passiEniac('boh'), []);
});

test('differenzaCavi divide i cavi in da staccare, da lasciare e da collegare', () => {
  const prima = L.PROBLEMI.somma.cavi;
  const dopo = L.PROBLEMI.quadrati.cavi;
  const d = L.differenzaCavi(prima, dopo);
  const k = (lista) => lista.map(L.chiaveCavo).sort();
  assert.deepStrictEqual(k(d.togli.concat(d.tieni)), k(prima));
  assert.deepStrictEqual(k(d.tieni.concat(d.metti)), k(dopo));
  assert.ok(d.togli.length > 0 && d.metti.length > 0);
  assert.deepStrictEqual(k(d.tieni), ['p:a2>pp']);
  const zero = L.differenzaCavi(prima, prima);
  assert.strictEqual(zero.togli.length + zero.metti.length, 0);
});

test('differenzaManopole elenca solo le manopole da girare', () => {
  const d = L.differenzaManopole(L.PROBLEMI.somma.manopole, L.PROBLEMI.quadrati.manopole);
  assert.deepStrictEqual(d.map((m) => m.unita), ['pp', 'tf', 'a1', 'mol', 'a2']);
  assert.deepStrictEqual(d[0], { unita: 'pp', da: 0, a: 1 });
  assert.deepStrictEqual(L.differenzaManopole(L.PROBLEMI.somma.manopole, L.PROBLEMI.somma.manopole), []);
});

test('i cavi sono curve di Bézier che partono e arrivano alle prese', () => {
  const a = { x: 10, y: 20 };
  const b = { x: 310, y: 20 };
  const giu = L.controlliCavo(a, b, { verso: 'giu', max: 118 });
  assert.deepStrictEqual(giu[0], a);
  assert.deepStrictEqual(giu[3], b);
  assert.ok(giu[1].y > a.y && giu[2].y > b.y, 'il cavo pende verso il basso');
  assert.ok(giu[1].y - a.y <= 118);
  const destra = L.controlliCavo({ x: 0, y: 0 }, { x: 0, y: 200 }, { verso: 'destra', max: 72, scarto: 9 });
  assert.ok(destra[1].x > 0 && destra[1].x <= 81, 'ansa a destra, limitata');
  const p0 = L.puntoBezier(giu, 0);
  const p1 = L.puntoBezier(giu, 1);
  assert.ok(vicino(p0.x, a.x) && vicino(p0.y, a.y) && vicino(p1.x, b.x) && vicino(p1.y, b.y));
  const d = L.percorsoCavo(a, b, { verso: 'giu' });
  assert.match(d, /^M10 20 C[\d.\- ]+ 310 20$/);
  assert.strictEqual(d.split(/[MC ]+/).filter(Boolean).length, 8);
});

test('lunghezzaBezier: un cavo teso è lungo quanto la distanza, uno che pende è più lungo', () => {
  const dritto = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }, { x: 300, y: 0 }];
  assert.ok(vicino(L.lunghezzaBezier(dritto), 300, 1e-6));
  const pende = L.controlliCavo({ x: 0, y: 0 }, { x: 300, y: 0 }, { verso: 'giu' });
  assert.ok(L.lunghezzaBezier(pende) > 300);
});

/* ---------- B) bus e fasi ---------- */

test('percorsoBus raggiunge la corsia, la percorre ed esce verso la destinazione', () => {
  const a = { x: 10, y: 300 };
  const b = { x: 200, y: 40 };
  assert.deepStrictEqual(L.percorsoBus(a, b, 120, 'orizzontale'), [a, { x: 10, y: 120 }, { x: 200, y: 120 }, b]);
  assert.deepStrictEqual(L.percorsoBus(a, b, 150, 'verticale'), [a, { x: 150, y: 300 }, { x: 150, y: 40 }, b]);
  assert.strictEqual(L.lunghezzaPercorso([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 10 }]), 11);
});

test('puntoSuPercorso si muove a velocità costante e resta negli estremi', () => {
  const p = [{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 300, y: 100 }];
  assert.deepStrictEqual(L.puntoSuPercorso(p, 0), { x: 0, y: 0 });
  assert.deepStrictEqual(L.puntoSuPercorso(p, 1), { x: 300, y: 100 });
  assert.deepStrictEqual(L.puntoSuPercorso(p, -1), { x: 0, y: 0 });
  assert.deepStrictEqual(L.puntoSuPercorso(p, 2), { x: 300, y: 100 });
  assert.deepStrictEqual(L.puntoSuPercorso(p, 0.25), { x: 0, y: 100 });
  assert.deepStrictEqual(L.puntoSuPercorso(p, 0.5), { x: 100, y: 100 });
  assert.deepStrictEqual(L.puntoSuPercorso([], 0.5), { x: 0, y: 0 });
  assert.deepStrictEqual(L.puntoSuPercorso([{ x: 5, y: 5 }, { x: 5, y: 5 }], 0.5), { x: 5, y: 5 });
});

test('fasiIstruzione: tre fasi per ogni istruzione, con i movimenti giusti sul bus', () => {
  for (const nome of ['somma', 'conto', 'formula']) {
    const { passi } = traccia(C.ESEMPI[nome]);
    for (const { ev, fasi } of passi) {
      assert.deepStrictEqual(fasi.map((f) => f.fase), ['prelievo', 'decodifica', 'esecuzione']);
      for (const f of fasi) {
        assert.ok(f.testo.length > 20, nome + ': testo vuoto');
        assert.ok(!/undefined|NaN|null/.test(f.testo), nome + ': ' + f.testo);
      }
      assert.deepStrictEqual(fasi[0].movimenti, [
        { tipo: 'indirizzo', da: 'pc', a: 'cella', cella: ev.indirizzo, valore: ev.indirizzo },
        { tipo: 'istruzione', da: 'cella', a: 'ir', cella: ev.indirizzo, valore: ev.parola },
      ]);
      assert.deepStrictEqual(fasi[1].movimenti, []);
      const m = fasi[2].movimenti;
      if (ev.op >= 1 && ev.op <= 5) {
        assert.deepStrictEqual(m[0], { tipo: 'indirizzo', da: 'ir', a: 'cella', cella: ev.arg, valore: ev.arg });
        assert.strictEqual(m[1].tipo, 'dato');
      }
      if (ev.op === 1 || ev.op === 3 || ev.op === 4 || ev.op === 5) assert.deepStrictEqual([m[1].da, m[1].a], ['cella', 'acc']);
      if (ev.op === 1) assert.strictEqual(m[1].valore, ev.accDopo);
      if (ev.op === 2) assert.deepStrictEqual([m[1].da, m[1].a, m[1].valore], ['acc', 'cella', ev.accDopo]);
      if (ev.op === 6 || (ev.op === 7 && ev.saltato)) assert.deepStrictEqual(m, [{ tipo: 'indirizzo', da: 'ir', a: 'pc', valore: ev.arg }]);
      if (ev.op === 0 || (ev.op === 7 && !ev.saltato)) assert.deepStrictEqual(m, []);
    }
  }
});

test('il dato letto da ADD, SUB e MUL è quello della memoria prima dell\'istruzione', () => {
  const { passi } = traccia(C.ESEMPI.formula);
  const mul = passi.find((p) => p.ev.op === 5);
  assert.strictEqual(mul.fasi[2].movimenti[1].valore, 4);
  assert.match(mul.fasi[2].testo, /3 × 4 = 12/);
  const add = passi.find((p) => p.ev.op === 3);
  assert.match(add.fasi[2].testo, /12 \+ 2 = 14/);
});

test('il racconto spiega uscita, salti e numeri che non stanno in 8 bit', () => {
  const { passi } = traccia(C.ESEMPI.somma);
  const out = passi.find((p) => p.ev.op === 2 && p.ev.arg === 31);
  assert.match(out.fasi[1].testo, /`11111`.*uscita/);
  assert.match(out.fasi[2].testo, /stampato/);
  const jzNo = passi.find((p) => p.ev.op === 7 && !p.ev.saltato);
  const jzSi = passi.find((p) => p.ev.op === 7 && p.ev.saltato);
  assert.match(jzNo.fasi[2].testo, /niente salto/);
  assert.match(jzSi.fasi[2].testo, /si salta/);
  assert.match(passi[0].fasi[1].testo, /`001`.*\*\*LOAD\*\*/);
  const halt = passi[passi.length - 1];
  assert.strictEqual(halt.ev.op, 0);
  assert.match(halt.fasi[1].testo, /HALT/);
  // 200 × 2 = 400 non sta in 8 bit; 0 − 1 riparte da 255
  const big = { indirizzo: 0, parola: C.codifica(5, 9), op: 5, arg: 9, nome: 'MUL', accPrima: 200, accDopo: 144, saltato: false, pcDopo: 1 };
  const mem = new Array(32).fill(0);
  mem[9] = 2;
  assert.match(L.racconta(big, 'esecuzione', mem), /400.*non sta in 8 bit/);
  const sotto = { indirizzo: 0, parola: C.codifica(4, 9), op: 4, arg: 9, nome: 'SUB', accPrima: 0, accDopo: 255, saltato: false, pcDopo: 1 };
  mem[9] = 1;
  assert.match(L.racconta(sotto, 'esecuzione', mem), /0 − 1 = 255.*255/);
});

/* ---------- B) memoria ed editor dei bit ---------- */

test('ruoliCelle ed etichetteCelle: istruzioni, dati, uscita e nomi del programma', () => {
  const a = C.assembla(C.ESEMPI.somma);
  const ruoli = L.ruoliCelle(a);
  assert.strictEqual(ruoli.length, 32);
  for (let i = 0; i <= 10; i++) assert.strictEqual(ruoli[i], 'codice');
  assert.deepStrictEqual(ruoli.slice(11, 14), ['dato', 'dato', 'dato']);
  assert.strictEqual(ruoli[20], 'vuota');
  assert.strictEqual(ruoli[31], 'uscita');
  const nomi = L.etichetteCelle(a);
  assert.strictEqual(nomi[0], 'ciclo');
  assert.strictEqual(nomi[8], 'fine');
  assert.deepStrictEqual(nomi.slice(11, 14), ['n', 'uno', 'somma']);
  assert.strictEqual(nomi[1], '');
  assert.strictEqual(L.ruoliCelle(null).filter((r) => r === 'vuota').length, 31);
});

test('disassembla e testoCella leggono la stessa parola come istruzione o come numero', () => {
  for (let w = 0; w < 256; w++) assert.strictEqual(L.disassembla(w), C.disassembla(w));
  assert.strictEqual(L.testoCella(C.codifica(3, 11), 'codice'), 'ADD 11');
  assert.strictEqual(L.testoCella(5, 'dato'), '5');
  assert.strictEqual(L.testoCella(0, 'vuota'), '0');
  assert.strictEqual(L.testoCella(15, 'uscita'), '15');
});

test('descriviCella prepara un\'etichetta chiara per i lettori di schermo', () => {
  assert.strictEqual(L.descriviCella(11, 5, 'dato', 'n'), 'Cella 11, n: numero 5 (00000101)');
  assert.strictEqual(L.descriviCella(1, C.codifica(3, 11), 'codice', ''), 'Cella 1: istruzione ADD 11 (01101011)');
  assert.strictEqual(L.descriviCella(20, 0, 'vuota', ''), 'Cella 20: vuota (00000000)');
  assert.strictEqual(L.descriviCella(31, 15, 'uscita', ''), 'Cella 31, uscita: numero 15 (00001111)');
});

test('gruppiBit e pesoBit: i pesi dei bit ricostruiscono codice operativo, indirizzo e numero', () => {
  const istr = L.gruppiBit('codice');
  assert.deepStrictEqual(istr.map((g) => g.tipo), ['op', 'ind']);
  const pesi = (g) => Array.from({ length: g.a - g.da }, (_, k) => L.pesoBit(g.da + k, g));
  assert.deepStrictEqual(pesi(istr[0]), [4, 2, 1]);
  assert.deepStrictEqual(pesi(istr[1]), [16, 8, 4, 2, 1]);
  const dato = L.gruppiBit('dato');
  assert.strictEqual(dato.length, 1);
  assert.deepStrictEqual(pesi(dato[0]), [128, 64, 32, 16, 8, 4, 2, 1]);
  assert.strictEqual(L.gruppiBit('uscita')[0].tipo, 'out');
  const somma = (w, g) => { let s = 0; for (let i = g.da; i < g.a; i++) if ((w >> (7 - i)) & 1) s += L.pesoBit(i, g); return s; };
  for (let w = 0; w < 256; w++) {
    const d = C.decodifica(w);
    assert.strictEqual(somma(w, istr[0]), d.op);
    assert.strictEqual(somma(w, istr[1]), d.arg);
    assert.strictEqual(somma(w, dato[0]), w);
  }
});

test('attivaBit accende e spegne un bit (0 è il più pesante)', () => {
  assert.strictEqual(L.attivaBit(5, 6), 7);
  assert.strictEqual(L.attivaBit(7, 6), 5);
  assert.strictEqual(L.attivaBit(0, 0), 128);
  assert.strictEqual(L.attivaBit(255, 7), 254);
  for (let w = 0; w < 256; w += 17) for (let i = 0; i < 8; i++) assert.strictEqual(L.attivaBit(L.attivaBit(w, i), i), w);
});

test('suggerisci accende il bit spento più leggero', () => {
  assert.deepStrictEqual(L.suggerisci(5), { bit: 6, peso: 2, nuovo: 7 });
  assert.deepStrictEqual(L.suggerisci(3), { bit: 5, peso: 4, nuovo: 7 });
  assert.deepStrictEqual(L.suggerisci(0), { bit: 7, peso: 1, nuovo: 1 });
  assert.strictEqual(L.suggerisci(255), null);
});

test('elencoCelle e celleDiverse', () => {
  assert.strictEqual(L.elencoCelle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 'da 0 a 10');
  assert.strictEqual(L.elencoCelle([13, 11, 12]), '11, 12 e 13');
  assert.strictEqual(L.elencoCelle([7, 8]), '7 e 8');
  assert.strictEqual(L.elencoCelle([4]), '4');
  assert.strictEqual(L.elencoCelle([]), '');
  const a = C.assembla(C.ESEMPI.somma).parole;
  const b = a.slice();
  b[11] = 7;
  b[1] = C.codifica(4, 11);
  assert.deepStrictEqual(L.celleDiverse(a, b), [1, 11]);
  assert.deepStrictEqual(L.celleDiverse(a, a.slice()), []);
});

test('formattaSecondi usa la virgola decimale', () => {
  assert.strictEqual(L.formattaSecondi(0), '0,0 s');
  assert.strictEqual(L.formattaSecondi(1234), '1,2 s');
  assert.strictEqual(L.formattaSecondi(-50), '0,0 s');
  assert.strictEqual(L.formattaSecondi(60000), '60,0 s');
});

test('velocità: livelli da 1 a 5, voli più brevi quando si accelera, «turbo» senza voli', () => {
  assert.strictEqual(L.livello(0), 1);
  assert.strictEqual(L.livello(9), 5);
  assert.strictEqual(L.livello('x'), 3);
  assert.strictEqual(L.livello('2.6'), 3);
  assert.strictEqual(L.nomeVelocita(5), 'turbo');
  assert.strictEqual(L.nomeVelocita(1), 'molto lenta');
  for (let v = 1; v < 5; v++) {
    assert.ok(L.durataVolo(v) > L.durataVolo(v + 1));
    assert.ok(L.pausaFasi(v) >= L.pausaFasi(v + 1));
    assert.ok(L.pausaIstruzione(v) > 0);
  }
  assert.strictEqual(L.durataVolo(5), 0);
  assert.strictEqual(L.pausaFasi(5), 0);
  // le durate sono quelle dei token --pg-dur-* (ctx.DURATA): se cambiano i token, cambiano anche qui
  const D = { istante: 1, veloce: 2, normale: 3, lenta: 4, narrativa: 5 };
  assert.deepStrictEqual([1, 2, 3, 4, 5].map((v) => L.durataVolo(v, D)), [5, 4, 3, 2, 0]);
  assert.deepStrictEqual([1, 2, 3, 4, 5].map((v) => L.pausaIstruzione(v, D)), [4, 3, 2, 1, 1]);
  assert.strictEqual(L.durataVolo(3), 350);
  // in turbo la somma (42 istruzioni) finisce in pochi secondi
  const { passi } = traccia(C.ESEMPI.somma);
  assert.strictEqual(passi.length, 42);
  assert.ok(passi.length * L.pausaIstruzione(5) < 4000);
});

test('cambiare un dato cambia il risultato: è il programma memorizzato', () => {
  const somma = traccia(C.ESEMPI.somma, (p, a) => { p[a.simboli.n] = L.suggerisci(p[a.simboli.n]).nuovo; });
  assert.deepStrictEqual(somma.st.uscita, [28]);
  const conto = traccia(C.ESEMPI.conto, (p, a) => { p[a.simboli.n] = L.suggerisci(p[a.simboli.n]).nuovo; });
  assert.deepStrictEqual(conto.st.uscita, [7, 6, 5, 4, 3, 2, 1]);
});

test('un\'istruzione cambiata può far girare il programma in tondo: serve il limite di ▶ Esegui', () => {
  const a = C.assembla(C.ESEMPI.somma);
  const p = a.parole.slice();
  p[4] = C.codifica(3, a.simboli.uno); // SUB uno diventa ADD uno: n cresce e torna a zero solo dopo 251 giri
  const st = C.esegui(C.crea(p), L.LIMITE_ISTRUZIONI);
  assert.strictEqual(st.fermo, false);
  assert.strictEqual(st.passi, L.LIMITE_ISTRUZIONI);
});
