// Sezione 6 (Storia del PC), capitolo 10 «Il PC di oggi»: modello del laboratorio.
// node --test tests/storia-pc-10-oggi.test.js
const test = require('node:test');
const assert = require('node:assert');
const M = require('../sections/storia-pc/js/modelli/10-oggi.js');

const ids = M.COMPONENTI.map((c) => c.id);

test('le tappe sono in ordine, dentro l\'intervallo e complete', () => {
  assert.strictEqual(M.TAPPE[0].anno, M.ANNO_MIN, 'la prima tappa è il punto di partenza');
  assert.strictEqual(M.TAPPE[M.TAPPE.length - 1].anno, M.ANNO_MAX);
  for (let i = 1; i < M.TAPPE.length; i++) {
    assert.ok(M.TAPPE[i].anno > M.TAPPE[i - 1].anno, 'tappe non in ordine: ' + M.TAPPE[i].id);
  }
  assert.strictEqual(new Set(M.TAPPE.map((t) => t.id)).size, M.TAPPE.length, 'id delle tappe ripetuti');
  for (const t of M.TAPPE) {
    assert.ok(t.titolo && t.esempio && t.testo.length > 60, 'tappa incompleta ' + t.id);
    for (const k of t.cambi) {
      assert.ok(ids.includes(k.id), t.id + ': componente sconosciuto ' + k.id);
      assert.ok(M.LUOGHI.includes(k.dove) && k.dove !== 'scheda', t.id + ': luogo non valido ' + k.dove);
    }
    for (const e of t.evidenzia) assert.ok(ids.includes(e), t.id + ': evidenzia un componente sconosciuto ' + e);
  }
});

test('le tappe storiche cadono negli anni verificati', () => {
  const quando = (id, dove) => M.TAPPE.find((t) => t.cambi.some((k) => k.id === id && k.dove === dove)).anno;
  assert.strictEqual(quando('fpu', 'die'), 1989);        // Intel 486DX
  assert.strictEqual(quando('cache', 'package'), 1995);  // Pentium Pro
  assert.strictEqual(quando('cache', 'die'), 1999);      // K6-III, Pentium III Coppermine
  assert.strictEqual(quando('nord', 'die'), 2003);       // Athlon 64 e Opteron
  assert.strictEqual(quando('video', 'package'), 2010);  // Clarkdale e Arrandale
  assert.strictEqual(quando('video', 'die'), 2011);      // Sandy Bridge e Llano
  assert.strictEqual(quando('sud', 'package'), 2013);    // Haswell per ultraportatili
  assert.strictEqual(quando('ram', 'package'), 2020);    // Apple M1
  assert.strictEqual(quando('npu', 'die'), 2020);
  assert.ok(M.tappa('mc-intel').esempio.includes('Nehalem'));
  assert.ok(M.tappa('x86-npu').esempio.includes('Lunar Lake'));
});

test('nel 1988 tutto è separato, dal 2020 resta un solo pezzo sulla scheda', () => {
  const inizio = M.statoAnno(1988);
  assert.strictEqual(inizio.pezziScheda, 10);
  assert.deepStrictEqual(inizio.integrati, []);
  assert.strictEqual(inizio.posizioni.npu, 'assente', 'l\'NPU nel 1988 non esiste');
  assert.deepStrictEqual(M.componentiSeparati(2020), ['cpu']);
  assert.deepStrictEqual(M.componentiSeparati(2013), ['cpu', 'ram']);
  assert.strictEqual(M.statoAnno(2000).pezziScheda, 5, 'audio, rete e modem diventano funzioni del ponte sud');
  assert.deepStrictEqual(M.statoAnno(2000).nelSud, ['audio', 'rete', 'modem']);
  assert.strictEqual(M.statoAnno(1997).posizioni.cache, 'package');
  assert.strictEqual(M.statoAnno(2010).posizioni.video, 'package');
  assert.strictEqual(M.statoAnno(2012).posizioni.video, 'die');
  // chi sta nel ponte sud segue il ponte sud
  assert.strictEqual(M.statoAnno(2013).effettive.audio, 'package');
  assert.strictEqual(M.statoAnno(2021).effettive.rete, 'die');
});

test('anno dopo anno i pezzi diminuiscono, la strada si accorcia e nulla torna indietro', () => {
  let prec = null;
  for (let a = M.ANNO_MIN; a <= M.ANNO_MAX; a++) {
    const s = M.statoAnno(a);
    const tot = s.separati.length + s.integrati.length + s.nelSud.filter((id) => s.effettive[id] === 'scheda').length;
    assert.strictEqual(tot + (s.posizioni.npu === 'assente' ? 1 : 0), ids.length, a + ': i componenti non tornano');
    assert.ok(s.separati.every((id) => !s.integrati.includes(id)), a + ': un componente è in due posti');
    if (prec) {
      assert.ok(s.pezziScheda <= prec.pezziScheda, a + ': i pezzi sulla scheda aumentano');
      assert.ok(s.stradaMedia <= prec.stradaMedia, a + ': la strada media si allunga');
      prec.integrati.forEach((id) => assert.ok(s.integrati.includes(id), a + ': ' + id + ' esce dal processore'));
    }
    prec = s;
  }
});

test('la strada dei dati segue i ponti rimasti sulla scheda', () => {
  const s88 = M.statoAnno(1988);
  assert.strictEqual(s88.strade.ram, 14, 'nel 1988 alla RAM si arriva passando dal ponte nord (8 + 6 cm)');
  assert.strictEqual(s88.strade.audio, 21, 'processore, ponte nord, ponte sud, scheda audio (8 + 7 + 6 cm)');
  assert.strictEqual(M.statoAnno(2003).strade.ram, 6.5, 'dal 2003 la RAM parla direttamente con il processore');
  assert.strictEqual(M.statoAnno(2020).strade.ram, M.STRADA_PACKAGE);
  assert.strictEqual(M.statoAnno(1989).strade.fpu, M.STRADA_DIE);
  assert.ok(Math.abs(s88.stradaMedia - 133 / 9) < 0.01);
  const fattore = s88.stradaMedia / M.statoAnno(2024).stradaMedia;
  assert.ok(fattore > 20 && fattore < 30, 'dal 1988 al 2024 la strada media si accorcia di circa 24 volte, non ' + fattore);
});

test('gli anni fuori intervallo e le tappe vicine', () => {
  assert.strictEqual(M.statoAnno(1950).anno, M.ANNO_MIN);
  assert.strictEqual(M.statoAnno(2100).anno, M.ANNO_MAX);
  assert.strictEqual(M.statoAnno('abc').anno, M.ANNO_MIN);
  assert.strictEqual(M.tappaDellAnno(1996).id, 'l2-package');
  assert.strictEqual(M.tappaDellAnno(2019).id, 'pch-package');
  assert.strictEqual(M.tappaSuccessiva(1990).anno, 1995);
  assert.strictEqual(M.tappaSuccessiva(2024), null);
  assert.strictEqual(M.tappaPrecedente(1988), null);
  assert.strictEqual(M.tappaPrecedente(2003).anno, 2000);
  assert.strictEqual(M.statoAnno(2008).nomeSud, 'Ponte sud');
  assert.strictEqual(M.statoAnno(2009).nomeSud, 'PCH');
});

test('ogni componente ha nome, sigla, descrizione e un percorso coerente', () => {
  for (const c of M.COMPONENTI) {
    assert.ok(c.nome && c.breve && c.sigla && c.descr.length > 30, 'componente incompleto ' + c.id);
    if (c.via) assert.ok(ids.includes(c.via) && c.tratto > 0, c.id + ': percorso non valido');
  }
  M.MISURATI.forEach((id) => assert.ok(ids.includes(id)));
  assert.ok(!M.MISURATI.includes('cpu') && !M.MISURATI.includes('npu'));
});

test('i portatili: dalla valigia alla tasca, con valori sensati', () => {
  const P = M.PORTATILI;
  assert.deepStrictEqual(P.map((p) => p.anno), [1981, 2008, 2023]);
  for (let i = 1; i < P.length; i++) {
    assert.ok(P[i].massaKg < P[i - 1].massaKg, 'la massa deve scendere');
    assert.ok(P[i].spessoreCm < P[i - 1].spessoreCm, 'lo spessore deve scendere');
    assert.ok(P[i].transistor > P[i - 1].transistor, 'i transistor devono crescere');
    assert.ok(P[i].autonomiaOre > P[i - 1].autonomiaOre, 'l\'autonomia deve crescere');
  }
  assert.strictEqual(P[0].massaKg, 11.1);
  assert.strictEqual(P[0].autonomiaOre, 0, 'l\'Osborne 1 non aveva batteria interna');
  for (const p of P) for (const m of M.METRICHE) assert.ok(p.dettagli[m.id], p.id + ': manca il dettaglio ' + m.id);
  const massa = M.rapporto('osborne', 'telefono', 'massa');
  assert.ok(massa > 55 && massa < 65, 'l\'Osborne pesa circa 60 telefoni, non ' + massa);
  assert.ok(M.rapporto('telefono', 'osborne', 'transistor') > 1e6);
  assert.strictEqual(M.rapporto('air', 'osborne', 'autonomia'), null, 'niente divisione per zero');
});

test('le barre del confronto stanno fra 0 e 1', () => {
  for (const m of M.METRICHE) {
    const righe = M.confronto(m.id);
    assert.strictEqual(righe.length, 3);
    righe.forEach((r) => assert.ok(r.frazione >= 0 && r.frazione <= 1, m.id + ' ' + r.id));
    if (m.scala === 'lineare' && !m.max) assert.strictEqual(Math.max(...righe.map((r) => r.frazione)), 1);
    if (m.max) assert.ok(righe.every((r) => r.valore <= m.max), m.id + ': un valore supera il fondo scala');
  }
  const t = M.confronto('transistor').map((r) => r.frazione);
  assert.ok(t[0] < t[1] && t[1] < t[2]);
  assert.ok(Math.abs(M.frazione('transistor', 1e7) - 0.5) < 1e-9, 'su scala logaritmica 10 milioni sta a metà fra mille e cento miliardi');
  assert.strictEqual(M.frazione('massa', 0), 0);
  assert.ok(Math.abs(M.frazione('autonomia', 12) - 0.5) < 1e-9, 'la barra dell\'autonomia è un giorno di 24 ore');
  assert.deepStrictEqual(M.confronto('nessuna'), []);
});

test('il laboratorio può contare su percorsi senza giri e su un package ordinato', () => {
  // ogni pista, seguendo i ponti («via»), arriva al processore in pochi passi
  for (const c of M.COMPONENTI) {
    let x = c.id, passi = 0;
    while (x && x !== 'cpu' && passi < 5) { x = M.componente(x).via; passi++; }
    assert.ok(c.via === null || x === 'cpu', c.id + ': il percorso non arriva al processore');
  }
  for (let a = M.ANNO_MIN; a <= M.ANNO_MAX; a++) {
    const pos = M.statoAnno(a).posizioni;
    assert.strictEqual(pos.cpu, 'scheda', a + ': il processore resta sulla scheda (è il package)');
    const separati = Object.keys(pos).filter((id) => pos[id] === 'package' && id !== 'ram');
    assert.ok(separati.length <= 1, a + ': accanto al die al più un pezzo di silicio separato, non ' + separati);
    ['audio', 'rete', 'modem'].forEach((id) => assert.ok(pos[id] !== 'sud' || pos.sud !== 'assente', a + ': ' + id + ' dentro un ponte sud che non c\'è'));
  }
});
