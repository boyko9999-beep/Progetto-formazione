// Test del laboratorio «Classi e oggetti» e delle figure del capitolo 10 (Oggetti e finestre):
// ricerca dei metodi lungo la catena delle classi, stato degli oggetti, polimorfismo, incapsulamento.
// node --test sections/programmazione/test/oggetti.test.js
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const BASE = path.join(__dirname, '..');
const L = require('../js/lab/oggetti.js');

function conOggetti(...specifiche) {
  const stato = L.nuovoStato();
  for (const [classe, nome, colore] of specifiche) {
    const esito = L.crea(stato, classe, nome, colore);
    assert.ok(esito.ok, 'creazione di ' + nome + ': ' + esito.testo);
  }
  return stato;
}

test('la catena delle classi va dalla più specifica alla più generale', () => {
  assert.deepStrictEqual(L.catena('Robot'), ['Robot']);
  assert.deepStrictEqual(L.catena('RobotSaldatore'), ['RobotSaldatore', 'Robot']);
  assert.deepStrictEqual(L.catena('Nessuna'), []);
});

test('la ricerca dei metodi risale alla classe madre e rispetta le ridefinizioni', () => {
  assert.deepStrictEqual(L.cercaMetodo('RobotSaldatore', 'muovi'), { classe: 'Robot', percorso: ['RobotSaldatore', 'Robot'] });
  assert.deepStrictEqual(L.cercaMetodo('RobotSaldatore', 'saluta'), { classe: 'RobotSaldatore', percorso: ['RobotSaldatore'] });
  assert.deepStrictEqual(L.cercaMetodo('RobotSaldatore', 'salda'), { classe: 'RobotSaldatore', percorso: ['RobotSaldatore'] });
  assert.deepStrictEqual(L.cercaMetodo('Robot', 'saluta'), { classe: 'Robot', percorso: ['Robot'] });
  assert.strictEqual(L.cercaMetodo('Robot', 'salda'), null);
  assert.strictEqual(L.cercaMetodo('Robot', 'vola'), null);
  // Un saldatore capisce quattro messaggi, un robot semplice tre; saluta() compare una volta sola.
  assert.deepStrictEqual(L.metodiDi('Robot').map((m) => m.metodo), ['saluta', 'muovi', 'ricarica']);
  assert.deepStrictEqual(L.metodiDi('RobotSaldatore'), [
    { metodo: 'salda', classe: 'RobotSaldatore' },
    { metodo: 'saluta', classe: 'RobotSaldatore' },
    { metodo: 'muovi', classe: 'Robot' },
    { metodo: 'ricarica', classe: 'Robot' },
  ]);
});

test('i nomi degli oggetti: identificatori validi, non riservati, non ripetuti', () => {
  const stato = conOggetti(['Robot', 'R1', 'verde']);
  assert.strictEqual(L.validaNome(stato, 'Robby'), null);
  assert.strictEqual(L.validaNome(stato, '  R2 '), null);
  assert.strictEqual(L.validaNome(stato, 'Abcdefgh'), null, 'otto caratteri vanno bene');
  for (const sbagliato of ['', '   ', 'Abcdefghi', '3R', 'R 2', 'Però', 'r-2', 'new', 'Robot', 'this', 'r1', 'R1']) {
    assert.ok(typeof L.validaNome(stato, sbagliato) === 'string', 'dovrebbe essere rifiutato: «' + sbagliato + '»');
  }
  assert.match(L.validaNome(stato, 'r1'), /Esiste già/);
  assert.match(L.validaNome(stato, 'NEW'), /riservata/);
  assert.strictEqual(L.suggerisciNome(stato, 'Robot'), 'R2');
  assert.strictEqual(L.suggerisciNome(stato, 'RobotSaldatore'), 'S2');
  // Se il nome suggerito è già preso, si passa al numero seguente.
  L.crea(stato, 'Robot', 'R2', 'ambra');
  L.crea(stato, 'Robot', 'R4', 'ambra');
  assert.strictEqual(L.suggerisciNome(stato, 'Robot'), 'R5');
});

test('i passi sono interi da 1 a 5', () => {
  assert.deepStrictEqual(L.validaPassi('3'), { ok: true, passi: 3 });
  assert.deepStrictEqual(L.validaPassi(5), { ok: true, passi: 5 });
  assert.deepStrictEqual(L.validaPassi(' 1 '), { ok: true, passi: 1 });
  for (const v of ['', '0', '6', '2.5', 'tre', '-1', null, undefined]) assert.strictEqual(L.validaPassi(v).ok, false, String(v));
});

test('la fabbrica crea oggetti con il loro stato e una riga di codice', () => {
  const stato = L.nuovoStato();
  const a = L.crea(stato, 'Robot', 'R1', 'ambra');
  assert.strictEqual(a.ok, true);
  assert.strictEqual(a.tipo, 'crea');
  assert.strictEqual(a.concetto, 'Oggetto');
  assert.deepStrictEqual(a.oggetto, { id: 1, var: 'r1', nome: 'R1', classe: 'Robot', colore: 'ambra', energia: 100, pos: 0, dir: 1 });
  assert.deepStrictEqual(a.righe, [{ codice: 'r1 = new Robot("R1", "ambra")', commento: '' }]);
  const b = L.crea(stato, 'Robot', 'Robby', 'colore-inventato');
  assert.strictEqual(b.concetto, 'Istanza');
  assert.strictEqual(b.oggetto.colore, 'verde', 'un colore sconosciuto diventa il primo della tavolozza');
  const c = L.crea(stato, 'RobotSaldatore', 'S3', 'rosa');
  assert.strictEqual(c.concetto, 'Ereditarietà', 'il primo saldatore spiega la sottoclasse');
  assert.strictEqual(c.righe[0].codice, 's3 = new RobotSaldatore("S3", "rosa")');
  const d = L.crea(stato, 'RobotSaldatore', 'S4', 'rosa');
  assert.strictEqual(d.concetto, 'Istanza');
  assert.deepStrictEqual(stato.oggetti.map((o) => o.id), [1, 2, 3, 4]);
  // L'esito porta una copia: modificarla non tocca lo stato.
  a.oggetto.energia = 0;
  assert.strictEqual(L.trova(stato, 1).energia, 100);
});

test('la fabbrica rifiuta nomi sbagliati, classi sconosciute e il palco pieno', () => {
  const stato = conOggetti(['Robot', 'R1', 'verde']);
  const doppio = L.crea(stato, 'Robot', 'r1', 'verde');
  assert.strictEqual(doppio.ok, false);
  assert.strictEqual(doppio.tipo, 'errore');
  assert.strictEqual(doppio.campo, 'nome');
  assert.deepStrictEqual(doppio.righe, []);
  assert.strictEqual(L.crea(stato, 'Aereo', 'A1', 'verde').ok, false);
  for (let i = 2; i <= L.MAX_OGGETTI; i++) assert.ok(L.crea(stato, 'Robot', 'R' + i, 'verde').ok);
  assert.strictEqual(stato.oggetti.length, L.MAX_OGGETTI);
  const pieno = L.crea(stato, 'Robot', 'Extra', 'verde');
  assert.strictEqual(pieno.ok, false);
  assert.match(pieno.titolo, /pieno/);
  assert.strictEqual(stato.oggetti.length, L.MAX_OGGETTI);
});

test('muovi() consuma energia, sposta solo il destinatario e gira in fondo alla pista', () => {
  const stato = conOggetti(['Robot', 'R1', 'verde'], ['Robot', 'R2', 'ambra']);
  const e = L.invia(stato, 1, 'muovi', '3');
  assert.strictEqual(e.ok, true);
  assert.strictEqual(e.tipo, 'metodo');
  assert.strictEqual(e.arg, 3);
  assert.strictEqual(e.definitoIn, 'Robot');
  assert.strictEqual(e.concetto, 'Stato');
  assert.deepStrictEqual(e.percorsoPassi.map((p) => p.pos), [1, 2, 3]);
  assert.deepStrictEqual(e.righe, [{ codice: 'r1.muovi(3)', commento: 'energia 100 → 70' }]);
  assert.strictEqual(e.prima.energia, 100);
  assert.strictEqual(e.dopo.energia, 70);
  const r1 = L.trova(stato, 1);
  assert.deepStrictEqual([r1.pos, r1.dir, r1.energia], [3, 1, 70]);
  assert.strictEqual(L.trova(stato, 2).pos, 0, 'r2 non si è mosso');
  assert.strictEqual(L.trova(stato, 2).energia, 100);
  // 3 + 5 = 8, l'ultima casella; altri due passi lo fanno girare.
  L.invia(stato, 1, 'muovi', 5);
  assert.strictEqual(L.trova(stato, 1).pos, L.PISTA);
  assert.strictEqual(L.invia(stato, 2, 'muovi', 1).dopo.pos, 1);
  L.invia(stato, 1, 'ricarica');
  const indietro = L.invia(stato, 1, 'muovi', 2);
  assert.deepStrictEqual(indietro.percorsoPassi, [{ pos: 7, dir: -1, girata: true }, { pos: 6, dir: -1, girata: false }]);
  assert.match(indietro.testo, /girato/);
});

test('simulaPassi gira anche all\'inizio della pista', () => {
  assert.deepStrictEqual(L.simulaPassi(1, -1, 3), [
    { pos: 0, dir: -1, girata: false },
    { pos: 1, dir: 1, girata: true },
    { pos: 2, dir: 1, girata: false },
  ]);
  for (let pos = 0; pos <= L.PISTA; pos++) {
    for (const dir of [1, -1]) {
      for (const p of L.simulaPassi(pos, dir, 25)) assert.ok(p.pos >= 0 && p.pos <= L.PISTA, 'fuori pista da ' + pos + ' ' + dir);
    }
  }
});

test('senza energia muovi() e salda() vengono rifiutati e lo stato non cambia', () => {
  const stato = conOggetti(['RobotSaldatore', 'S1', 'rosa']);
  L.invia(stato, 1, 'muovi', 5);
  L.invia(stato, 1, 'muovi', 4); // energia 10
  const fotografia = JSON.stringify(stato);
  const no = L.invia(stato, 1, 'muovi', 2);
  assert.strictEqual(no.ok, false);
  assert.strictEqual(no.tipo, 'rifiutato');
  assert.strictEqual(no.definitoIn, 'Robot');
  assert.deepStrictEqual(no.righe, [{ codice: 's1.muovi(2)', commento: '✗ rifiutato: servono 20 di energia, s1 ne ha 10' }]);
  assert.strictEqual(L.invia(stato, 1, 'salda').tipo, 'rifiutato');
  assert.strictEqual(JSON.stringify(stato), fotografia);
  // Un passo solo costa proprio 10: si può ancora fare.
  assert.strictEqual(L.invia(stato, 1, 'muovi', 1).ok, true);
  assert.strictEqual(L.trova(stato, 1).energia, 0);
});

test('ricarica() riporta l\'energia al massimo, salda() costa 25', () => {
  const stato = conOggetti(['RobotSaldatore', 'S1', 'rosa']);
  const gia = L.invia(stato, 1, 'ricarica');
  assert.strictEqual(gia.ok, true);
  assert.strictEqual(gia.titolo, 'Già carico.');
  assert.strictEqual(gia.definitoIn, 'Robot', 'ricarica() è ereditato');
  const s = L.invia(stato, 1, 'salda');
  assert.strictEqual(s.ok, true);
  assert.strictEqual(s.definitoIn, 'RobotSaldatore');
  assert.strictEqual(s.risposta, 'Bzzz! Saldatura fatta.');
  assert.strictEqual(L.trova(stato, 1).energia, 100 - L.COSTO_SALDA);
  const r = L.invia(stato, 1, 'ricarica');
  assert.deepStrictEqual(r.righe, [{ codice: 's1.ricarica()', commento: 'energia 75 → 100' }]);
  assert.strictEqual(L.trova(stato, 1).energia, L.ENERGIA_MAX);
});

test('saluta(): il saldatore usa il suo metodo, il robot quello di Robot', () => {
  const stato = conOggetti(['Robot', 'R1', 'verde'], ['RobotSaldatore', 'S2', 'rosa']);
  const r = L.invia(stato, 1, 'saluta');
  assert.strictEqual(r.risposta, 'Ciao, sono R1!');
  assert.strictEqual(r.definitoIn, 'Robot');
  assert.deepStrictEqual(r.righe, [{ codice: 'r1.saluta()', commento: '«Ciao, sono R1!»' }]);
  const s = L.invia(stato, 2, 'saluta');
  assert.strictEqual(s.risposta, 'Ciao, sono S2! Saldo tutto io.');
  assert.strictEqual(s.definitoIn, 'RobotSaldatore');
  assert.strictEqual(s.concetto, 'Metodo ridefinito');
  assert.strictEqual(L.trova(stato, 2).energia, 100, 'salutare non costa nulla');
});

test('un messaggio che la classe non capisce torna indietro senza effetti', () => {
  const stato = conOggetti(['Robot', 'R1', 'verde']);
  const fotografia = JSON.stringify(stato);
  const e = L.invia(stato, 1, 'salda');
  assert.strictEqual(e.ok, false);
  assert.strictEqual(e.tipo, 'sconosciuto');
  assert.deepStrictEqual(e.percorso, ['Robot']);
  assert.deepStrictEqual(e.righe, [{ codice: 'r1.salda()', commento: '✗ errore: Robot non ha il metodo salda()' }]);
  assert.match(e.testo, /doesNotUnderstand/);
  assert.strictEqual(JSON.stringify(stato), fotografia);
  assert.strictEqual(L.invia(stato, 99, 'saluta').tipo, 'errore', 'destinatario inesistente');
  const passi = L.invia(stato, 1, 'muovi', 9);
  assert.strictEqual(passi.tipo, 'errore');
  assert.strictEqual(passi.campo, 'passi');
});

test('«Tutti salutano»: il polimorfismo si vede solo con due classi', () => {
  const vuoto = L.nuovoStato();
  assert.strictEqual(L.tuttiSalutano(vuoto).tipo, 'errore');
  const stato = conOggetti(['Robot', 'R1', 'verde'], ['Robot', 'R2', 'ambra']);
  const uguali = L.tuttiSalutano(stato);
  assert.strictEqual(uguali.polimorfo, false);
  assert.strictEqual(L.completato(stato), false);
  L.crea(stato, 'RobotSaldatore', 'S3', 'rosa');
  const t = L.tuttiSalutano(stato);
  assert.strictEqual(t.ok, true);
  assert.strictEqual(t.polimorfo, true);
  assert.strictEqual(t.concetto, 'Polimorfismo');
  assert.deepStrictEqual(t.risposte.map((r) => [r.var, r.definitoIn, r.risposta]), [
    ['r1', 'Robot', 'Ciao, sono R1!'],
    ['r2', 'Robot', 'Ciao, sono R2!'],
    ['s3', 'RobotSaldatore', 'Ciao, sono S3! Saldo tutto io.'],
  ]);
  assert.strictEqual(t.righe[0].codice, 'per ogni r in [r1, r2, s3]: r.saluta()');
  assert.deepStrictEqual(t.righe.slice(1).map((r) => r.codice), ['', '', '']);
  assert.strictEqual(t.righe[3].commento, 's3 (RobotSaldatore): «Ciao, sono S3! Saldo tutto io.»');
  assert.strictEqual(L.completato(stato), true);
});

test('scrivere l\'energia dall\'esterno è vietato e non cambia nulla', () => {
  const stato = conOggetti(['Robot', 'R1', 'verde']);
  L.invia(stato, 1, 'muovi', 2);
  const fotografia = JSON.stringify(stato);
  const e = L.scriviDallEsterno(stato, 1);
  assert.strictEqual(e.ok, false);
  assert.strictEqual(e.tipo, 'privato');
  assert.strictEqual(e.concetto, 'Incapsulamento');
  assert.deepStrictEqual(e.righe, [{ codice: 'r1.energia = 1000', commento: '✗ errore: energia è privata' }]);
  assert.strictEqual(JSON.stringify(stato), fotografia);
  assert.strictEqual(L.trova(stato, 1).energia, 80);
  assert.strictEqual(L.scriviDallEsterno(stato, 42).tipo, 'errore');
});

test('i testi delle spiegazioni usano solo il mini-markup della sezione', () => {
  const stato = conOggetti(['Robot', 'R1', 'verde'], ['RobotSaldatore', 'S2', 'rosa']);
  const esiti = [
    L.invia(stato, 1, 'saluta'), L.invia(stato, 1, 'muovi', 2), L.invia(stato, 1, 'ricarica'), L.invia(stato, 1, 'salda'),
    L.invia(stato, 2, 'muovi', 1), L.invia(stato, 2, 'salda'), L.tuttiSalutano(stato), L.scriviDallEsterno(stato, 2),
    L.crea(stato, 'Robot', 'r1', 'verde'),
  ];
  for (const e of esiti) {
    assert.ok(e.titolo && e.testo && e.concetto, 'esito senza spiegazione: ' + e.tipo);
    assert.ok(!/<\/?[a-z][^>]*>/i.test(e.testo), 'niente HTML: ' + e.testo);
    assert.ok(!/undefined|NaN|null/.test(e.testo + e.titolo), 'valore mancante nel testo: ' + e.testo);
    assert.ok(!/\.\.|  /.test(e.testo), 'punteggiatura o spazi doppi: ' + e.testo);
  }
});

test('il laboratorio si registra con titolo, CSS con prefisso e funzione monta', () => {
  const registrati = {};
  const prima = globalThis.ProgStoria;
  globalThis.ProgStoria = { lab: (id, def) => { registrati[id] = def; } };
  const f = path.join(BASE, 'js', 'lab', 'oggetti.js');
  delete require.cache[require.resolve(f)];
  try {
    require(f);
  } finally {
    if (prima) globalThis.ProgStoria = prima; else delete globalThis.ProgStoria;
  }
  const def = registrati.oggetti;
  assert.ok(def, 'ProgStoria.lab(\'oggetti\', …) non chiamato');
  assert.strictEqual(def.titolo, 'Classi e oggetti');
  assert.strictEqual(typeof def.monta, 'function');
  assert.strictEqual(typeof def.css, 'string');
  const classi = [...def.css.matchAll(/\.([a-z][\w-]*)/g)].map((m) => m[1]).filter((c) => !/^\d/.test(c));
  for (const c of classi) assert.ok(/^(lab-oggetti|pg-)/.test(c), 'classe CSS senza prefisso: .' + c);
  assert.match(def.css, /prefers-reduced-motion/);
  for (const m of def.css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) assert.ok(Number(m[1]) >= 13, 'testo sotto i 13px: ' + m[0]);
});

test('le figure primo-mouse e desktop-anni-80 disegnano un SVG 800 × 500', () => {
  delete globalThis.ProgStoria;
  for (const rel of ['js/core.js', 'js/figure/oggetti.js']) {
    const f = path.join(BASE, rel);
    delete require.cache[require.resolve(f)];
    require(f);
  }
  const { figure } = globalThis.ProgStoria.dati();
  for (const id of ['primo-mouse', 'desktop-anni-80']) {
    const def = figure[id];
    assert.ok(def, 'figura non registrata: ' + id);
    assert.ok(def.alt && def.alt.length > 80, 'testo alternativo mancante o troppo breve: ' + id);
    const svg = def.disegna({ uid: globalThis.ProgStoria.util.uid, riduci: false });
    assert.strictEqual(typeof svg, 'string');
    assert.match(svg, /^<svg viewBox="0 0 800 500" /);
    assert.ok(svg.endsWith('</svg>'));
    assert.ok(!/<script|<image|href="http|font-family/i.test(svg), 'niente script, immagini esterne o font: ' + id);
    // Le classi usate nel disegno hanno il prefisso della figura e sono definite nel CSS.
    for (const m of svg.matchAll(/class="([^"]+)"/g)) {
      for (const c of m[1].split(/\s+/)) {
        assert.ok(c.startsWith('fig-' + id + '-'), 'classe senza prefisso in ' + id + ': ' + c);
        assert.ok(def.css.includes('.' + c), 'classe senza regola CSS in ' + id + ': ' + c);
      }
    }
    for (const m of def.css.matchAll(/\.([a-z][\w-]*)/g)) assert.ok(m[1].startsWith('fig-' + id + '-'), 'regola CSS senza prefisso: ' + m[1]);
    for (const m of def.css.matchAll(/font:\s*\d+\s+(\d+)px/g)) assert.ok(Number(m[1]) >= 13, 'testo sotto i 13px in ' + id);
    assert.match(def.css, /prefers-reduced-motion: reduce/);
    // Gli id interni (retini, ritagli) non si ripetono fra due disegni della stessa figura.
    const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    const altri = [...def.disegna({ uid: globalThis.ProgStoria.util.uid, riduci: false }).matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    for (const x of ids) assert.ok(!altri.includes(x), 'id ripetuto fra due disegni: ' + x);
  }
  delete globalThis.ProgStoria;
});
