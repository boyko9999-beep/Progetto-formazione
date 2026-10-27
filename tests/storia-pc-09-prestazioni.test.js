// Sezione 6 (Storia del PC), capitolo 9: la corsa alle prestazioni.
// Verifica la logica del modello (Amdahl, scale logaritmiche, raddoppio) e l'integrità dei dati.
// node --test tests/storia-pc-09-prestazioni.test.js
const test = require('node:test');
const assert = require('node:assert');
const M = require('../sections/storia-pc/js/modelli/09-prestazioni.js');

const vicino = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ': ' + a + ' invece di ' + b);

test('il modello si registra anche in StoriaPCModelli', () => {
  assert.strictEqual(globalThis.StoriaPCModelli.prestazioni, M);
});

test('tabella dei processori: campi completi, id unici, ordine cronologico', () => {
  const ids = new Set();
  let prec = -Infinity;
  for (const c of M.PROCESSORI) {
    assert.ok(/^[a-z0-9]+$/.test(c.id), 'id non valido ' + c.id);
    assert.ok(!ids.has(c.id), 'id ripetuto ' + c.id);
    ids.add(c.id);
    assert.ok(typeof c.nome === 'string' && c.nome.trim(), c.id + ': nome');
    assert.ok(['Intel', 'AMD', 'Apple'].includes(c.marca), c.id + ': marca');
    assert.ok(Number.isInteger(c.anno) && c.anno >= 1971 && c.anno <= 2026, c.id + ': anno');
    assert.ok(Number.isInteger(c.mese) && c.mese >= 1 && c.mese <= 12, c.id + ': mese');
    assert.ok(typeof c.testo === 'string' && c.testo.length > 30, c.id + ': testo');
    const t = M.annoDecimale(c);
    assert.ok(t >= prec, c.id + ': fuori ordine cronologico');
    prec = t;
  }
  assert.ok(M.PROCESSORI.length >= 30);
});

test('valori plausibili: transistor, frequenze, core e thread', () => {
  for (const c of M.PROCESSORI) {
    if (c.transistor != null) {
      assert.ok(c.transistor >= 2000 && c.transistor <= 1e12, c.id + ': transistor');
      assert.ok(typeof c.fonte === 'string' && c.fonte, c.id + ': manca la fonte dei transistor');
    }
    if (c.mhz != null) assert.ok(c.mhz >= 0.1 && c.mhz <= 7000, c.id + ': frequenza');
    if (c.mhzBase != null) assert.ok(c.mhzBase < c.mhz, c.id + ': la frequenza base deve stare sotto il turbo');
    if (c.mhzMax != null) assert.ok(c.mhzMax > c.mhz, c.id + ': mhzMax');
    assert.ok(Number.isInteger(c.core) && c.core >= 1 && c.core <= 128, c.id + ': core');
    if (c.thread != null) assert.ok(c.thread >= c.core && c.thread <= 2 * c.core, c.id + ': thread');
    if (c.p != null || c.e != null) assert.strictEqual(c.p + c.e, c.core, c.id + ': P + E deve fare il totale dei core');
    if (c.marca === 'Apple') assert.strictEqual(c.mhz, null, c.id + ': Apple non dichiara le frequenze');
  }
  // fino al 2004 un solo core, dal 2005 in poi i multicore
  M.PROCESSORI.filter((c) => c.anno <= 2004).forEach((c) => assert.strictEqual(c.core, 1, c.id));
});

test('i valori chiave del capitolo corrispondono alle fonti', () => {
  const v = (id) => M.trova(id);
  assert.strictEqual(v('i4004').transistor, 2300);
  assert.strictEqual(v('i286').transistor, 134000);
  assert.strictEqual(v('i386').transistor, 275000);
  assert.strictEqual(v('i486').transistor, 1200000);
  assert.strictEqual(v('pentium').transistor, 3100000);
  assert.strictEqual(v('athlon1g').mhz, 1000);
  assert.strictEqual(v('athlon1g').anno, 2000);
  assert.strictEqual(v('prescott').mhz, 3800);
  assert.strictEqual(v('m3ultra').transistor, 184e9);
  assert.strictEqual(v('i914900ks').mhz, 6200);
  // l'Athlon 64 «liscio» esce a 2,0 GHz (i 2,2 GHz sono dell'Athlon 64 FX-51)
  assert.strictEqual(v('athlon64').mhz, 2000);
  // nella tabella il primo chip oltre il miliardo di transistor è il Core i7-980X (Gulftown, 2010)
  assert.strictEqual(v('i7980x').transistor, 1.17e9);
  assert.ok(M.datiTransistor().filter((c) => c.transistor >= 1e9)[0].id === 'i7980x');
  // «arriverà a» del Pentium 4 coincide con il massimo della serie, il Prescott a 3,8 GHz
  assert.strictEqual(v('pentium4').mhzMax, v('prescott').mhz);
  assert.strictEqual(M.trova('nessuno'), null);
});

test('transistor: crescita di sette ordini di grandezza, e il record cresce di decennio in decennio', () => {
  const d = M.datiTransistor();
  assert.ok(d.every((c) => c.transistor != null));
  const record = {};
  d.forEach((c) => { const dec = Math.floor(c.anno / 10) * 10; record[dec] = Math.max(record[dec] || 0, c.transistor); });
  const decenni = Object.keys(record).map(Number).sort((a, b) => a - b);
  for (let i = 1; i < decenni.length; i++) assert.ok(record[decenni[i]] > 10 * record[decenni[i - 1]], 'decennio ' + decenni[i]);
  assert.ok(d[d.length - 1].transistor / d[0].transistor > 1e7);
});

test('frequenze: crescita fino al 2004, poi il piano del muro della potenza', () => {
  const f = M.datiFrequenza();
  const max = (a, b) => Math.max(...f.filter((c) => c.anno >= a && c.anno <= b).map((c) => c.mhz));
  assert.ok(max(2000, 2004) / max(1980, 1984) > 400, 'prima del 2004 la frequenza cresce di centinaia di volte');
  assert.ok(max(2005, 2025) / max(2000, 2004) < 2, 'dopo il 2004 meno del doppio in vent\'anni');
  const t = M.tendenzaFrequenza(2004);
  assert.ok(t.periodo > 1.5 && t.periodo < 3.5, 'raddoppio della frequenza prima del 2004: ' + t.periodo);
  assert.ok(t.valore(2025) > 50 * 6200, 'la vecchia tendenza porterebbe a centinaia di GHz');
});

test('legge di Amdahl', () => {
  vicino(M.amdahl(0.5, 1e12), 2, 1e-6, 'metà seriale: al massimo il doppio');
  vicino(M.amdahl(0.9, 10), 1 / 0.19, 1e-9, '90% su 10 core');
  assert.strictEqual(M.amdahl(0.9, 10).toFixed(2), '5.26');
  assert.strictEqual(M.amdahl(0.7, 1), 1);
  assert.strictEqual(M.amdahl(0, 64), 1);
  assert.strictEqual(M.amdahl(1, 64), 64);
  vicino(M.amdahl(0.95, 8), 5.926, 1e-3, '95% su 8 core');
  vicino(M.limiteAmdahl(0.95), 20, 1e-9, 'limite con il 95% parallelo');
  assert.strictEqual(M.limiteAmdahl(1), Infinity);
  const t = M.tempoAmdahl(0.9, 10);
  vicino(t.seriale, 0.1, 1e-12, 'parte seriale');
  vicino(t.parallelo, 0.09, 1e-12, 'parte parallela');
  vicino(1 / t.totale, M.amdahl(0.9, 10), 1e-12, 'tempo e accelerazione');
  vicino(M.efficienza(0.9, 10), 0.526, 1e-3, 'efficienza');
  assert.throws(() => M.amdahl(1.2, 4), RangeError);
  assert.throws(() => M.amdahl(0.5, 0), RangeError);
  // più core aiutano sempre, ma sempre meno: la curva cresce e si appiattisce verso il limite
  const curva = M.curvaAmdahl(0.9, 1, 1024, 8);
  assert.strictEqual(curva[0].n, 1);
  vicino(curva[curva.length - 1].n, 1024, 1e-9, 'ultimo punto');
  for (let i = 1; i < curva.length; i++) assert.ok(curva[i].s > curva[i - 1].s && curva[i].s < 10);
  vicino(M.coreVersoIlLimite(0.9, 0.9), 81, 1e-9, 'core per arrivare al 90% del limite');
  vicino(M.amdahl(0.9, M.coreVersoIlLimite(0.9, 0.9)), 9, 1e-9, 'il 90% di 10');
});

test('scale logaritmiche e tacche', () => {
  const y = M.scalaLog(1, 1000, 0, 300);
  vicino(y(10), 100, 1e-9, 'una decade = un terzo');
  vicino(y.inversa(y(42)), 42, 1e-9, 'andata e ritorno');
  const y2 = M.scalaLog(1, 64, 200, 0, 2);
  vicino(y2(8), 100, 1e-9, 'base 2, verso l\'alto');
  assert.throws(() => M.scalaLog(0, 10, 0, 1), RangeError);
  assert.deepStrictEqual(M.tacchetteLog(1, 1000), [1, 10, 100, 1000]);
  assert.deepStrictEqual(M.tacchetteLog(2300, 2e11), [1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11]);
  assert.deepStrictEqual(M.tacchetteLog(1, 64, 2), [1, 2, 4, 8, 16, 32, 64]);
  const x = M.scalaLineare(1970, 2030, 0, 600);
  assert.strictEqual(x(2000), 300);
  assert.strictEqual(x.inversa(300), 2000);
});

test('legge di Moore: raddoppio ogni due anni dal 4004, e il tempo di raddoppio misurato è vicino a 2 anni', () => {
  assert.strictEqual(M.moore(1971), 2300);
  assert.strictEqual(M.moore(1973), 4600);
  vicino(M.moore(1991) / M.moore(1971), 1024, 1e-6, 'dieci raddoppi in vent\'anni');
  vicino(M.tempoRaddoppio({ anno: 1970, n: 1 }, { anno: 1972, n: 2 }), 2, 1e-12, 'caso semplice');
  assert.ok(Number.isNaN(M.tempoRaddoppio({ anno: 1970, n: 1 }, { anno: 1970, n: 2 })));
  // dal 4004 ai chip più recenti
  for (const id of ['m1ultra', 'm2ultra', 'm3ultra']) {
    const t = M.raddoppioDal4004(id);
    assert.ok(t > 1.85 && t < 2.2, id + ': raddoppio ogni ' + t + ' anni');
  }
  assert.ok(Number.isNaN(M.raddoppioDal4004('i912900k')), 'senza transistor dichiarati non si calcola');
  // la retta che passa meglio per tutti i punti
  const r = M.tendenzaTransistor();
  assert.ok(r.periodo > 1.8 && r.periodo < 2.4, 'regressione: ' + r.periodo);
  // su dati esatti la regressione ritrova il periodo
  const finti = [0, 4, 8, 12].map((k) => ({ anno: 2000 + k, n: 100 * Math.pow(2, k / 3) }));
  vicino(M.regressioneRaddoppio(finti).periodo, 3, 1e-9, 'regressione esatta');
  vicino(M.regressioneRaddoppio(finti).valore(2006), 400, 1e-6, 'valore della retta');
});

test('core per anno: serie ordinate e crescenti, e i multicore arrivano nel 2005', () => {
  for (const nome of ['pubblico', 'hedt']) {
    const s = M.CORE_DESKTOP[nome];
    for (let i = 1; i < s.length; i++) {
      assert.ok(s[i].anno > s[i - 1].anno, nome + ': anni in ordine');
      assert.ok(s[i].core > s[i - 1].core, nome + ': il record cresce');
    }
    s.forEach((c) => assert.ok(c.chip && c.testo && Number.isInteger(c.core), nome + ': voce incompleta'));
  }
  const serie = M.serieAnnuale(M.CORE_DESKTOP.pubblico, M.CORE_DESKTOP.da, M.CORE_DESKTOP.a);
  assert.strictEqual(serie.length, M.CORE_DESKTOP.a - M.CORE_DESKTOP.da + 1);
  const anno = (a) => serie.find((s) => s.anno === a);
  assert.strictEqual(anno(2004).core, 1);
  assert.strictEqual(anno(2005).core, 2);
  assert.strictEqual(anno(2005).nuovo, true);
  assert.strictEqual(anno(2007).core, 4);
  assert.strictEqual(anno(2007).nuovo, false);
  const hedt = M.serieAnnuale(M.CORE_DESKTOP.hedt, M.CORE_DESKTOP.da, M.CORE_DESKTOP.a);
  assert.strictEqual(hedt[0].anno, 2008, 'la fascia alta separata nasce nel 2008');
  assert.strictEqual(hedt[hedt.length - 1].core, 64);
});

test('formule del capitolo: tempo di esecuzione e lavanderia', () => {
  vicino(M.tempoEsecuzione(3e9, 1, 3), 1, 1e-12, '3 miliardi di istruzioni a 3 GHz con IPC 1');
  vicino(M.tempoEsecuzione(3e9, 2, 3), 0.5, 1e-12, 'IPC doppio, tempo dimezzato');
  assert.strictEqual(M.turniSequenziali(4, 3), 12);
  assert.strictEqual(M.turniPipeline(4, 3), 6);
  assert.strictEqual(M.turniPipeline(0, 3), 0);
  assert.strictEqual(M.turniPipeline(1, 3), 3);
});

test('formati all\'italiana', () => {
  assert.strictEqual(M.numeroIt(17468), '17.468');
  assert.strictEqual(M.numeroIt(4.77, 2), '4,77');
  assert.strictEqual(M.numeroIt(-2.5, 1), '−2,5');
  assert.strictEqual(M.formatoTransistor(2300), '2.300');
  assert.strictEqual(M.formatoTransistor(134000), '134.000');
  assert.strictEqual(M.formatoTransistor(1.2e6), '1,2 milioni');
  assert.strictEqual(M.formatoTransistor(105.9e6), '105,9 milioni');
  assert.strictEqual(M.formatoTransistor(1.16e9), '1,16 miliardi');
  assert.strictEqual(M.formatoTransistor(184e9), '184 miliardi');
  assert.strictEqual(M.formatoTransistor(null), '—');
  assert.strictEqual(M.formatoFrequenza(0.74), '740 kHz');
  assert.strictEqual(M.formatoFrequenza(4.77), '4,77 MHz');
  assert.strictEqual(M.formatoFrequenza(1000), '1 GHz');
  assert.strictEqual(M.formatoFrequenza(3060), '3,06 GHz');
  assert.strictEqual(M.etichettaPotenza(1000), '1.000');
  assert.strictEqual(M.etichettaPotenza(1e7), '10 mln');
  assert.strictEqual(M.etichettaPotenza(1e12), '1.000 mld');
  assert.strictEqual(M.etichettaFrequenza(0.1), '100 kHz');
  assert.strictEqual(M.etichettaFrequenza(10000), '10 GHz');
});
