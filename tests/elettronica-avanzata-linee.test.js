// Modello del capitolo 2 (linee di trasmissione): node --test tests/elettronica-avanzata*.test.js
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./elettronica-avanzata.load.js');

const sezione = load();
const chapter = sezione.chapter('linee');
const M = chapter.model;

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg ? msg + ': ' : '') + a + ' invece di ' + b);

// Linea con i parametri dell'animazione, cambiando solo quello che serve.
const mk = (p) => M.line(Object.assign({ vs: 1, rs: 50, z0: 50, zl: 50, len: 30, er: 4.3, tr: 0.2 }, p));

test('coefficiente di riflessione: aperto +1, corto −1, adattato 0', () => {
  near(M.gamma(Infinity, 50), 1, 0);
  near(M.gamma(0, 50), -1, 1e-15);
  near(M.gamma(50, 50), 0, 0);
  near(M.gamma(150, 50), 0.5, 1e-15);
  near(M.gamma(75, 50), 0.2, 1e-15);
  near(M.gamma(25, 50), -1 / 3, 1e-15);
  near(M.gamma(1e4, 50), 0.990, 1e-3);
  near(M.gamma(1, 50), -0.961, 1e-3);
  // la lettura inversa del riflettometro ritrova l'impedenza
  for (const z of [1, 10, 33, 50, 75, 150, 1000]) near(M.impedanceFromGamma(M.gamma(z, 50), 50), z, 1e-9 * z, 'Z = ' + z);
  assert.strictEqual(M.impedanceFromGamma(1, 50), Infinity);
});

test('velocità c/√εr e ritardo: circa 30, 20,7 e 14,5 cm/ns', () => {
  near(M.velocity(1), 29.98, 0.01, 'aria');
  near(M.velocity(2.1), 20.69, 0.01, 'PTFE');
  near(M.velocity(4.3), 14.46, 0.01, 'FR-4');
  near(M.delay(30, 4.3), 2.075, 0.001, '30 cm di FR-4');
  near(M.delay(100, 1), 3.336, 0.001, 'un metro in aria');
});

test('Z0 = √(L/C) e v = 1/√(LC) sono coerenti con la pista da 50 Ω in FR-4', () => {
  // valori per centimetro citati nel testo: circa 3,5 nH e 1,4 pF
  near(M.z0FromLC(3.5e-9, 1.4e-12), 50, 1e-9);
  const v = M.speedFromLC(3.5e-9, 1.4e-12) * 1e-9; // cm/ns
  near(v, M.velocity(4.3), 0.02 * M.velocity(4.3), 'velocità da L e C');
  // e viceversa: L = Z0/v e C = 1/(Z0·v) ridanno Z0 e v
  const vv = M.velocity(4.3) * 1e9;
  near(M.z0FromLC(50 / vv, 1 / (50 * vv)), 50, 1e-9);
  near(M.speedFromLC(50 / vv, 1 / (50 * vv)), vv, 1e-3 * vv);
});

test('gradino: la salita dal 10 al 90% dura proprio tr', () => {
  for (const tr of [0.01, 0.2, 1, 5]) {
    const cross = (lvl) => {
      let a = 0;
      let b = tr / M.RISE_FRAC;
      for (let i = 0; i < 80; i++) { const m = (a + b) / 2; if (M.edge(m, tr) < lvl) a = m; else b = m; }
      return (a + b) / 2;
    };
    near(cross(0.9) - cross(0.1), tr, 1e-9 * tr + 1e-12, 'tr = ' + tr);
    assert.strictEqual(M.edge(-1, tr), 0);
    assert.strictEqual(M.edge(10 * tr, tr), 1);
  }
});

test('fine aperta con Rs = Z0: metà tensione in partenza, raddoppio al carico, eco dopo 2·TD', () => {
  const L = mk({ zl: Infinity });
  const list = M.bounces(L, 30);
  near(L.vLaunch, 0.5, 1e-12);
  // la sorgente adattata assorbe l'eco: un'onda di andata e una di ritorno
  assert.deepStrictEqual(Array.from(list, (w) => w.dir), [1, -1]);
  assert.deepStrictEqual(Array.from(list, (w) => w.a), [0.5, 0.5]);
  const after = L.td + L.ramp + 0.01;
  near(M.loadVoltage(L, list, L.td * 0.9), 0, 0, 'il carico prima dell\'arrivo');
  near(M.loadVoltage(L, list, after), 1, 1e-12, 'il carico dopo l\'arrivo');
  near(M.inputVoltage(L, list, L.ramp + 0.01), 0.5, 1e-12, 'ingresso prima dell\'eco');
  near(M.inputVoltage(L, list, 2 * L.td - 0.01), 0.5, 1e-12, 'ingresso appena prima dell\'eco');
  near(M.inputVoltage(L, list, 2 * L.td + L.ramp + 0.01), 1, 1e-12, 'ingresso dopo l\'eco');
  // a metà linea, prima che il fronte arrivi, non c'è niente
  near(M.voltage(L, list, 0.5, 0.45 * L.td).v, 0, 0);
});

test('cortocircuito: al carico la tensione resta zero, all\'ingresso torna a zero', () => {
  const L = mk({ zl: 0 });
  const list = M.bounces(L, 30);
  for (let t = 0; t < 4 * L.td; t += 0.05) near(M.loadVoltage(L, list, t), 0, 1e-12, 't = ' + t);
  near(M.inputVoltage(L, list, L.td), 0.5, 1e-12);
  near(M.inputVoltage(L, list, 2 * L.td + L.ramp + 0.01), 0, 1e-12);
});

test('carico adattato: nessuna onda di ritorno in nessun punto', () => {
  const L = mk({ zl: 50 });
  const list = M.bounces(L, 30);
  assert.strictEqual(list.length, 1);
  for (const xi of [0, 0.3, 0.7, 1]) {
    for (let t = 0; t < 5 * L.td; t += 0.1) assert.strictEqual(M.voltage(L, list, xi, t).b, 0);
  }
});

test('generatore da 10 Ω su linea aperta: i rimbalzi salgono a 1,67 V, scendono a 0,56 V e tendono a 1 V', () => {
  const L = mk({ rs: 10, zl: Infinity });
  near(L.gS, -2 / 3, 1e-12);
  const list = M.bounces(L, 200);
  near(list[0].a, 50 / 60, 1e-12);
  assert.deepStrictEqual(Array.from(list.slice(0, 6), (w) => w.k), [0, 1, 2, 3, 4, 5]);
  const level = (n) => M.loadVoltage(L, list, (2 * n + 1) * L.td + L.ramp + 0.01);
  near(level(0), 5 / 3, 1e-9);
  near(level(1), 5 / 9, 1e-9);
  near(level(2), 35 / 27, 1e-9);
  near(M.loadVoltage(L, list, 150 * L.td + L.ramp), 1, 1e-3, 'valore finale');
});

test('dopo tutti i rimbalzi si arriva al partitore Vs·ZL/(Rs + ZL)', () => {
  for (const rs of [5, 25, 50, 200, 500]) {
    for (const zl of [0, 1, 20, 50, 150, 1e4, Infinity]) {
      const L = mk({ rs, zl, z0: 75 });
      const tEnd = 400 * L.td;
      const list = M.bounces(L, tEnd);
      const fin = M.finalValue(1, rs, zl);
      near(M.inputVoltage(L, list, tEnd), fin, 2e-3, 'ingresso, Rs ' + rs + ', ZL ' + zl);
      near(M.loadVoltage(L, list, tEnd), fin, 2e-3, 'carico, Rs ' + rs + ', ZL ' + zl);
      near(L.vFinal, fin, 0);
    }
  }
});

test('gli estremi calcolati con le somme parziali contengono il profilo campionato', () => {
  for (const p of [{ rs: 10, zl: Infinity }, { rs: 300, zl: 0 }, { rs: 5, zl: 2 }, { rs: 50, zl: 150 }]) {
    const L = mk(p);
    const span = M.timeSpan(L);
    const list = M.bounces(L, span);
    const r = M.ranges(list);
    for (let i = 0; i <= 200; i++) {
      const t = (span * i) / 200;
      for (const xi of [0, 0.25, 0.5, 1]) {
        const s = M.voltage(L, list, xi, t);
        for (const v of [s.v, s.f, s.b]) assert.ok(v >= r.lo - 1e-9 && v <= r.hi + 1e-9, JSON.stringify(p) + ': ' + v);
      }
    }
  }
});

test('regola pratica e riflettometro: distanza, lunghezza critica, verdetto', () => {
  near(M.tdrDistance(10, 20), 100, 1e-12, 'eco dopo 10 ns a 20 cm/ns');
  near(M.criticalLength(4.3, 1), 2.41, 0.01, 'FR-4 con fronti da 1 ns');
  assert.strictEqual(M.isLong(30, 4.3, 0.2), true);
  assert.strictEqual(M.isLong(1, 4.3, 1), false);
  assert.strictEqual(M.isLong(3, 4.3, 1), true);
  // la fase 6 dell'animazione: eco da 0,5 a 0,33 V dopo 2·TD
  const L = mk({ zl: 25 });
  const g = (L.vFinal - L.vLaunch) / L.vLaunch;
  near(g, -1 / 3, 1e-12);
  near(M.impedanceFromGamma(g, 50), 25, 1e-9);
  near(M.tdrDistance(2 * L.td, L.v), 30, 1e-9);
});

test('lunghezza critica v·tr/6: circa 4,8 mm in FR-4 con fronti da 200 ps, 5 cm in aria con fronti da 1 ns', () => {
  near(M.criticalLength(4.3, 0.2), 0.482, 0.001, 'FR-4, 200 ps');
  near(M.criticalLength(1, 1), 5.0, 0.01, 'aria, 1 ns');
  near(M.criticalLength(4.3, 1, 2), 3 * M.criticalLength(4.3, 1), 1e-12, 'con tr/2 la soglia triplica');
  // il verdetto coincide con il confronto tra la lunghezza e la soglia
  for (const len of [0.3, 0.47, 0.49, 2, 30]) {
    assert.strictEqual(M.isLong(len, 4.3, 0.2), len > M.criticalLength(4.3, 0.2), 'ℓ = ' + len + ' cm');
  }
});

test('finestra del laboratorio: abbastanza echi da arrivare vicino al valore finale', () => {
  // distanza dal valore finale alla fine della finestra, in frazione del primo gradino
  const residual = (p) => {
    const L = mk(p);
    const span = M.timeSpan(L);
    const vin = M.inputVoltage(L, M.bounces(L, span), span);
    return { L, span, r: Math.abs(vin - L.vFinal) / Math.abs(L.vFinal - L.vLaunch) };
  };
  // generatore adattato: quattro andate e ritorno e mezzo giro per vedere l'ultimo gradino
  const a = residual({ zl: 150 });
  assert.strictEqual(M.roundTrips(a.L), 4);
  near(a.span, 9 * a.L.td, 1e-12);
  near(a.r, 0, 1e-9, 'l\'eco è già tutta arrivata');
  // ΓS·ΓL = −2/3 · (+1): quattro giri bastano per scendere sotto il 20%
  const b = residual({ rs: 10, zl: Infinity });
  assert.strictEqual(M.roundTrips(b.L), 4);
  assert.ok(b.r < 0.2, 'Rs 10 Ω, aperto: ' + b.r);
  // ΓS·ΓL ≈ 0,79: ne servono sette
  const c = residual({ rs: 5, zl: 1 });
  assert.strictEqual(M.roundTrips(c.L), 7);
  assert.ok(c.r < 0.2, 'Rs 5 Ω, ZL 1 Ω: ' + c.r);
  // ΓS·ΓL ≈ 0,82: il limite di otto giri lascia circa il 20%
  const d = residual({ rs: 500, zl: Infinity });
  assert.strictEqual(M.roundTrips(d.L), 8);
  assert.ok(d.r < 0.21, 'Rs 500 Ω, aperto: ' + d.r);
  // filo corto con fronte lento: la finestra la decide il tempo di salita
  const e = mk({ len: 1, tr: 5 });
  near(M.timeSpan(e), 30, 1e-12);
});

test('domande del capitolo: formato e conti coerenti con il modello', () => {
  const quiz = Array.from(sezione.QUIZ).filter((q) => q.chapter === 'linee');
  assert.deepStrictEqual(quiz.map((q) => q.id), ['ea-linee-01', 'ea-linee-02', 'ea-linee-03', 'ea-linee-04']);
  quiz.forEach((q) => {
    assert.strictEqual(q.chapter, 'linee');
    assert.strictEqual(q.answer, 0);
    assert.ok([1, 2, 3].includes(q.level));
    assert.ok(q.topic.length <= 30 && q.q.length <= 320 && q.why.length <= 600, q.id);
    assert.strictEqual(q.options.length, 4);
    Array.from(q.options).forEach((o) => assert.ok(o.length <= 140, q.id + ': ' + o));
  });
  near(M.gamma(150, 50), 0.5, 0);                                        // domanda 1
  near(M.tdrDistance(10, 20), 100, 0);                                   // domanda 2: un metro
  assert.ok(1 > 10 * (0.5 / 6));                                         // domanda 3: 1 ns contro tr/6
  near(M.gamma(10 + 40, 50), 0, 0);                                      // domanda 4: sorgente adattata
  const L = mk({ rs: 50, zl: Infinity });
  near(M.loadVoltage(L, M.bounces(L, 30), 3 * L.td), 1, 1e-12);
});
