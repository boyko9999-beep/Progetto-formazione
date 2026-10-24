// Modello del capitolo 6 (quarzo, oscillatori e PLL): node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./elettronica-avanzata.load.js');

const M = load().chapter('clock').model;
const TAU = Math.PI * 2;

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ' atteso ' + b + ', ottenuto ' + a);
const rel = (a, b, r, msg) => near(a, b, Math.abs(b) * r, msg);

// Risposta lineare dell'anello: errore di fase dopo un salto di fase e0 e uno scarto di pulsazione x0.
const linErr = (z, wn, t, e0, x0) => M.phaseStep(z, wn, t) * e0 + M.freqStep(z, wn, t) * x0;

test('catena di divisori: 32 768 Hz diventano 1 Hz dopo 15 stadi', () => {
  const c = Array.from(M.chain(32768, 15));
  assert.strictEqual(c.length, 16);
  assert.strictEqual(c[0], 32768);
  assert.strictEqual(c[15], 1);
  for (let k = 1; k <= 15; k++) assert.strictEqual(c[k] * 2, c[k - 1], 'stadio ' + k);
  assert.strictEqual(M.stagesToOneHz(M.WATCH_HZ), 15);
  assert.strictEqual(M.stagesToOneHz(8192), 13, 'il Seiko Astron del 1969 divideva 13 volte');
  assert.strictEqual(M.divide(8192, 13), 1);
});

test('quarzo da orologio: risonanza a 32 768 Hz, Q di decine di migliaia, banda sotto 1 Hz', () => {
  const x = M.crystal(M.WATCH_XTAL);
  rel(x.fs, 32768, 1e-9, 'risonanza serie');
  near(x.Q, 46257, 50, 'fattore di qualità');
  // la risonanza parallela sta poco sopra: fs·C1/(2·C0) ≈ 41 Hz
  near(x.fp - x.fs, (x.fs * M.WATCH_XTAL.C1) / (2 * M.WATCH_XTAL.C0), 0.05, 'fp − fs');
  assert.ok(x.fs < x.fL && x.fL < x.fp, 'con il carico la frequenza cade tra fs e fp');
  near(x.bw, 0.708, 0.002, 'larghezza della risonanza fs/Q');
  // lasciato a se stesso, si spegne in un tempo dell'ordine di Q periodi
  near(x.tau, x.Q / (Math.PI * x.fs), 1e-12);
  near(x.tau, 0.449, 0.002, 'costante di tempo');
});

test('campana di risonanza: larga fs/Q, stretta per il quarzo e quasi piatta per un circuito LC', () => {
  const x = M.crystal(M.WATCH_XTAL);
  near(M.resonance(x.fs, x.fs, x.Q), 1, 1e-15, 'al centro');
  // i due punti a metà potenza risolvono Q·(f/f0 − f0/f) = ±1
  const half = (sg) => { const a = sg / (2 * x.Q); return x.fs * (a + Math.sqrt(a * a + 1)); };
  near(M.resonance(half(1), x.fs, x.Q), Math.SQRT1_2, 1e-12, 'sopra');
  near(M.resonance(half(-1), x.fs, x.Q), Math.SQRT1_2, 1e-12, 'sotto');
  near(half(1) - half(-1), x.bw, 1e-9, 'larghezza = fs/Q');
  assert.ok(M.resonance(x.fs + 2, x.fs, x.Q) < 0.2, 'a 2 Hz dal centro il quarzo risponde meno del 20 %');
  assert.ok(M.resonance(x.fs + 2, x.fs, 100) > 0.999, 'un LC con Q = 100 resta quasi piatto');
  near(x.fs / 100, 327.68, 1e-9, 'la banda dell\'LC è di circa 330 Hz');
});

test('capacità di carico: due condensatori in serie più le parassite, e lo spostamento in ppm', () => {
  near(M.loadCap(18e-12, 18e-12, 3.5e-12), 12.5e-12, 1e-18, 'CL di un quarzo da 12,5 pF');
  near(M.loadCap(10e-12, 40e-12), 8e-12, 1e-18);
  const a = M.crystal(Object.assign({}, M.WATCH_XTAL, { CL: 6e-12 }));
  const b = M.crystal(Object.assign({}, M.WATCH_XTAL, { CL: 12.5e-12 }));
  const ppm = ((a.fL - b.fL) / a.fs) * 1e6;
  assert.ok(ppm > 90 && ppm < 110, 'passare da 12,5 a 6 pF sposta di circa 100 ppm: ' + ppm);
  near(M.ppmToSecondsPerDay(100), 8.64, 1e-12, '100 ppm');
  near(M.ppmToSecondsPerDay(20), 1.728, 1e-12, '20 ppm: circa 52 s al mese');
});

test('PLL: uscita N·fref, rumore +20·log10 N e jitter da una fase rms', () => {
  assert.strictEqual(M.pllOut(100e6, 62), 6.2e9);
  near(M.noisePenalty(2), 6.0206, 1e-4, 'raddoppio');
  near(M.noisePenalty(62), 35.848, 1e-3);
  near(M.noisePenalty(64), 36.124, 1e-3);
  assert.strictEqual(M.noisePenalty(1), 0);
  near(M.jitter(0.01, 6e9), 0.2653e-12, 1e-16, '0,01 rad a 6 GHz');
  // la stessa fase vale il doppio del tempo a frequenza dimezzata
  near(M.jitter(0.01, 3e9) / M.jitter(0.01, 6e9), 2, 1e-12);
});

test('sovraelongazione dell\'anello di tipo 2: formula classica e continuità attorno a ζ = 1', () => {
  near(M.overshoot(0.3), 0.451, 0.001);
  near(M.overshoot(0.5), 0.2984, 0.001);
  near(M.overshoot(0.707), 0.2079, 0.001);
  near(M.overshoot(1), Math.exp(-2), 1e-12);
  near(M.overshoot(1.2), 0.1052, 0.001);
  near(M.overshoot(0.999), M.overshoot(1), 1e-3, 'continua da sotto');
  near(M.overshoot(1.001), M.overshoot(1), 1e-3, 'continua da sopra');
  for (let z = 0.2; z < 1.5; z += 0.05) assert.ok(M.overshoot(z + 0.05) < M.overshoot(z), 'più smorzamento, meno sovraelongazione');
});

test('propagatore esatto: forme chiuse e proprietà di gruppo in tutti i regimi', () => {
  const wn = TAU * 1e6;
  const t = 0.3e-6;
  const z = 0.5;
  const wd = wn * Math.sqrt(1 - z * z);
  const ex = Math.exp(-z * wn * t);
  near(M.phaseStep(z, wn, t), ex * (Math.cos(wd * t) - ((z * wn) / wd) * Math.sin(wd * t)), 1e-12, 'salto di fase');
  near(M.freqStep(z, wn, t), (ex * Math.sin(wd * t)) / wd, 1e-18, 'salto di frequenza');
  near(M.vcoStep(z, wn, 50 / wn), 1, 1e-9, 'a regime il VCO ha recuperato tutto il salto');
  for (const zz of [0.3, 0.999999, 1, 1.000001, 1.2, 2]) {
    const A = Array.from(M.propagator(zz, wn, 0.2e-6));
    const B = Array.from(M.propagator(zz, wn, 0.5e-6));
    const AB = Array.from(M.propagator(zz, wn, 0.7e-6));
    const prod = [A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3], A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3]];
    near(prod[0], AB[0], 1e-9, 'ζ=' + zz + ' [0]');
    near(prod[1] * wn, AB[1] * wn, 1e-9, 'ζ=' + zz + ' [1]');
    near(prod[2] / wn, AB[2] / wn, 1e-9, 'ζ=' + zz + ' [2]');
    near(prod[3], AB[3], 1e-9, 'ζ=' + zz + ' [3]');
  }
});

test('simulazione e teoria lineare coincidono per un piccolo colpo al VCO', () => {
  for (const u of [0, 0.5, 1]) {
    const lp = M.loopParams(100e6, u);
    const fref = 100e6;
    const N = 32;
    const x0 = 0.01 * TAU * fref; // il VCO diviso va l'1 % più piano
    const sim = M.simulate({ fref, N, wn: lp.wn, zeta: lp.zeta, x: x0 });
    assert.ok(Array.from(sim.slip).every((s) => s === 0), 'nessun giro perso, u=' + u);
    assert.ok(sim.locked, 'agganciato, u=' + u);
    near(sim.f[sim.n], N * fref, (0.01 * N * x0) / TAU, 'alla fine resta meno dell\'1 % del salto, u=' + u);
    rel(M.measuredOvershoot(sim).value, M.overshoot(lp.zeta), 0.03, 'sovraelongazione, u=' + u);
    // f(t) = N·fref − N·x0·(1 − vcoStep)/2π: la frazione mancante del salto si chiude come in teoria
    for (const i of [10, 60, 180, 360]) {
      const t = (i / sim.n) * sim.T;
      const theory = N * fref - (N * x0 * M.phaseStep(lp.zeta, lp.wn, t)) / TAU;
      near(sim.f[i], theory, N * x0 * 1e-6, 'campione ' + i + ', u=' + u);
      near(sim.e[i], linErr(lp.zeta, lp.wn, t, 0, x0), 1e-6, 'errore, campione ' + i);
    }
  }
});

test('tempo di aggancio dopo un salto di fase: coincide con la soluzione in forma chiusa', () => {
  const fref = 50e6;
  for (const u of [0.1, 0.5, 0.9]) {
    const lp = M.loopParams(fref, u);
    const sim = M.simulate({ fref, N: 16, wn: lp.wn, zeta: lp.zeta, e: Math.PI / 2, u: Math.PI / 2 });
    // ultimo istante in cui |errore| ≥ 5°, cercato a passi fini sulla soluzione esatta
    let last = 0;
    const dt = 1 / lp.fn / 4000;
    for (let t = 0; t < 30 / lp.fn; t += dt) if (Math.abs(linErr(lp.zeta, lp.wn, t, Math.PI / 2, 0)) >= M.LOCK_RAD) last = t;
    rel(sim.tLock, last, 0.01, 'u=' + u);
    assert.ok(sim.T >= sim.tLock, 'la finestra contiene l\'aggancio');
    near(sim.e[sim.n], 0, M.LOCK_RAD, 'alla fine l\'errore è sotto 5°');
  }
  const lp = M.loopParams(fref, 0.5);
  near(M.lockEstimate(lp.zeta, lp.wn), 4 / (lp.zeta * lp.wn), 1e-18);
});

test('grande salto di N: giri persi, poi aggancio sulla nuova frequenza', () => {
  const fref = 100e6;
  const lp = M.loopParams(fref, 0);
  const from = { fref, N: 32 };
  const to = { fref, N: 64 };
  const s = M.retune({ e: 0, x: 0, u: 0 }, from, to);
  near(s.x, TAU * fref * 0.5, 1e-3, 'il VCO diviso per 64 va a metà velocità');
  const sim = M.simulate({ fref, N: 64, wn: lp.wn, zeta: lp.zeta, e: s.e, x: s.x, u: s.u });
  assert.ok(Array.from(sim.slip).some((v) => v === 1), 'il rivelatore perde dei giri');
  assert.ok(sim.locked && sim.tLock > 0 && sim.tLock < sim.T, 'aggancia dentro la finestra');
  rel(sim.f[0], 32 * fref, 1e-3, 'la frequenza del VCO non salta');
  rel(sim.f[sim.n], 64 * fref, 1e-6, 'arriva a N · fref');
  // a regime l'errore vero è un numero intero di giri: il PFD ha contato i fronti persi
  const turns = sim.u[sim.n] / TAU;
  near(turns, Math.round(turns), 0.02, 'giri persi interi');
  assert.ok(Math.round(turns) > 0);
});

test('banda dell\'anello: dagli estremi lento e stabile a veloce e nervoso', () => {
  const lo = M.loopParams(100e6, 0);
  const hi = M.loopParams(100e6, 1);
  rel(lo.fn, 100e3, 1e-9, 'fref/1000');
  near(lo.zeta, 1.2, 1e-12);
  rel(hi.fn, 5e6, 1e-9, 'fref/20');
  near(hi.zeta, 0.3, 1e-12);
  for (let u = 0; u <= 1; u += 0.1) {
    const p = M.loopParams(30e6, u);
    assert.ok(p.fn <= 30e6 / 10, 'la banda resta ben sotto fref');
    rel(p.wn, TAU * p.fn, 1e-12);
  }
  assert.ok(M.decayRate(1.2, 1) < M.decayRate(0.9, 1), 'sovrasmorzato: il modo lento si spegne piano');
});

test('cambio di N con l\'anello agganciato: la frequenza del VCO è continua', () => {
  const fref = 80e6;
  const lp = M.loopParams(fref, 0.4);
  const p = { fref, N: 32, wn: lp.wn, zeta: lp.zeta };
  const s = M.retune({ e: 0, x: 0, u: 0 }, { fref, N: 32 }, { fref, N: 33 });
  near(s.x, TAU * fref * (1 - 32 / 33), 1e-6);
  rel(M.vcoFreq({ e: 0, x: s.x }, Object.assign({}, p, { N: 33 })), 32 * fref, 1e-12, 'stessa frequenza prima e dopo');
  const d = M.disturb({ e: 0, x: 0, u: 0 }, p, 'freq');
  rel(M.vcoFreq(d, p), 0.99 * 32 * fref, 1e-12, 'il colpo abbassa il VCO dell\'1 %');
  const f = M.disturb({ e: 0, x: 0, u: 0 }, p, 'fase');
  near(f.e, Math.PI / 2, 1e-15, 'il salto di fase vale 90°');
});

test('la simulazione è deterministica', () => {
  const lp = M.loopParams(100e6, 0.7);
  const o = { fref: 100e6, N: 48, wn: lp.wn, zeta: lp.zeta, x: 0.04 * TAU * 100e6 };
  const a = M.simulate(o);
  const b = M.simulate(o);
  assert.strictEqual(a.tLock, b.tLock);
  assert.strictEqual(a.T, b.T);
  assert.deepStrictEqual(Array.from(a.f), Array.from(b.f));
});
