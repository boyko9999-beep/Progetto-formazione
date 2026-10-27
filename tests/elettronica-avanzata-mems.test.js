// Modello del capitolo 8 (MEMS e sensori): node --test tests/elettronica-avanzata*.test.js
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./elettronica-avanzata.load.js');

const M = load().chapter('mems').model;
const TAU = Math.PI * 2;

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg ? msg + ': ' : '') + a + ' invece di ' + b);
const rel = (a, b, r, msg) => near(a, b, Math.abs(b) * r, msg);

// Accelerometro del laboratorio: molle da 2 N/m e massa di 2 µg.
const K = 2;
const MASS = 2e-9;

test('risonanza f0 = √(k/m)/2π: circa 5 kHz, e raddoppiando la massa cala di √2', () => {
  rel(M.resonance(K, MASS), 5032.9, 1e-4, 'f0');
  rel(M.resonance(K, 2 * MASS), M.resonance(K, MASS) / Math.SQRT2, 1e-12, 'massa doppia');
  rel(M.resonance(4 * K, MASS), 2 * M.resonance(K, MASS), 1e-12, 'molle quattro volte più rigide');
  // la massa di prova: 400 × 400 × 2 µm di silicio pesano circa 0,75 µg
  rel(M.siliconMass(400e-6, 400e-6, 2e-6), 0.7456e-9, 1e-3, 'massa di silicio');
});

test('spostamento statico x = m·a/k: circa 10 nm per g a 5 kHz, e il sensore lo rilegge', () => {
  const x = M.staticDisp(M.G, K, MASS);
  rel(x, 9.807e-9, 1e-3, 'x per 1 g');
  rel(M.dispPerG(M.resonance(K, MASS)), x, 1e-12, 'x = g/(2πf0)²');
  rel(M.dispPerG(1000), 248.4e-9, 1e-3, 'a 1 kHz');
  rel(M.dispPerG(10000), 2.484e-9, 1e-3, 'a 10 kHz');
  // un millesimo di g sposta la massa di circa 10 pm, un ventesimo della distanza tra atomi
  rel(M.dispPerG(5000) * 1e-3, 9.94e-12, 1e-3, 'un millesimo di g');
  // l'accelerazione letta dallo spostamento è quella applicata
  rel(M.measured(M.staticDisp(3.7, K, MASS), K, MASS), 3.7, 1e-12, 'lettura');
});

test('pettine differenziale: C0 ≈ 0,44 pF, ΔC ≈ 2·C0·x/d e (C1 − C2)/(C1 + C2) = x/d esatto', () => {
  const d = 2e-6;
  const c0 = M.combCap(50, 100e-6, 20e-6, d);
  rel(c0, 0.4427e-12, 1e-3, 'C0');
  rel(M.plateCap(1e-6, 1e-6), M.EPS0, 1e-12, 'ε0·A/d');
  const c = M.differential(c0, d, 10e-9);
  assert.ok(c.c1 > c0 && c.c2 < c0, 'C1 sale e C2 scende');
  rel(c.dc, 4.427e-15, 1e-3, 'ΔC per 10 nm');
  rel(c.dc, M.dcLinear(c0, d, 10e-9), 1e-4, 'approssimazione lineare per x ≪ d');
  for (const u of [1e-9, 0.2e-6, 0.5e-6, 1.5e-6]) rel(M.differential(c0, d, u).ratio, u / d, 1e-12, 'rapporto a ' + u);
  // a metà gap la formula lineare sbaglia di un terzo: la risposta non è più lineare
  rel(M.differential(c0, d, 1e-6).dc / M.dcLinear(c0, d, 1e-6), 4 / 3, 1e-12, 'a metà gap');
});

test('oscillatore smorzato: la soluzione esatta non dipende dal passo e va verso m·a/k', () => {
  const p = { k: K, m: MASS, b: Math.sqrt(K * MASS) / 0.7 };
  const a = 2 * M.G;
  const T = 1e-3;
  let s = { u: 0, v: 0 };
  for (let i = 0; i < 400; i++) s = M.respond(s, p, a, T / 400);
  const one = M.respond({ u: 0, v: 0 }, p, a, T);
  rel(s.u, one.u, 1e-9, 'passi piccoli e un passo solo');
  rel(s.u, M.staticDisp(a, K, MASS), 1e-6, 'equilibrio');
  // con Q = 0,7 il gradino supera l'equilibrio solo del 4,6% circa
  const z = 1 / 1.4;
  const tp = Math.PI / (M.omega0(K, MASS) * Math.sqrt(1 - z * z));
  const peak = M.respond({ u: 0, v: 0 }, p, a, tp).u / M.staticDisp(a, K, MASS) - 1;
  rel(peak, Math.exp((-Math.PI * z) / Math.sqrt(1 - z * z)), 1e-9, 'sovraelongazione');
  near(M.respond({ u: 0, v: 0 }, p, a, tp).v, 0, 1e-12, 'velocità nulla al picco');
});

test('nel vuoto la massa vibra a lungo: l\'ampiezza cala come e^(−π·n/Q), e serve τ = Q/(π·f0)', () => {
  const f0 = M.resonance(K, MASS);
  const w = M.omega0(K, MASS);
  for (const q of [5, 2000]) {
    const zeta = 1 / (2 * q);
    const n = 10;
    const td = n / (f0 * Math.sqrt(1 - zeta * zeta)); // dieci periodi smorzati
    const r = M.free(1, -zeta * w, w, zeta, td);      // partenza con velocità che annulla il seno
    rel(r.y, Math.exp((-Math.PI * n) / (q * Math.sqrt(1 - zeta * zeta))), 1e-9, 'Q = ' + q);
  }
  rel(M.decayTime(2000, 5000), 0.1273, 1e-3, 'τ nel vuoto');
  rel(M.settle(K, MASS, Math.sqrt(K * MASS) / 2000), M.decayTime(2000, f0), 1e-12, 'settle con Q alto');
  rel(M.settle(K, MASS, Math.sqrt(K * MASS) / 0.7), M.decayTime(0.7, f0), 1e-12, 'settle in aria');
  // Q = 0,5 è lo smorzamento critico: nessuna oscillazione, e niente NaN per tempi lunghi
  const pc = { k: K, m: MASS, b: 2 * Math.sqrt(K * MASS) };
  let last = 0;
  for (let i = 1; i <= 50; i++) {
    const u = M.respond({ u: 0, v: 0 }, pc, M.G, i * 2e-5).u;
    assert.ok(u >= last - 1e-18 && u <= M.staticDisp(M.G, K, MASS) * (1 + 1e-12), 'critico, monotono');
    last = u;
  }
  const over = M.respond({ u: 1e-6, v: 0 }, { k: K, m: MASS, b: 20 * Math.sqrt(K * MASS) }, 0, 10);
  assert.ok(Number.isFinite(over.u) && Math.abs(over.u) < 1e-9, 'sovrasmorzato: ' + over.u);
});

test('giroscopio: F = 2·m·v·Ω vale 2 nN per 1 µg, 1 m/s e 1 rad/s, e sposta la massa di pochi picometri', () => {
  rel(M.coriolis(1e-9, 1, 1), 2e-9, 1e-12, 'forza');
  const v = M.driveSpeed(20e3, 5e-6);
  rel(v, 0.6283, 1e-4, 'velocità di pilotaggio: 5 µm a 20 kHz');
  // modo di misura a 22 kHz, poco sopra il pilotaggio: circa 7 pm per ogni grado al secondo
  rel(M.senseDisp(M.coriolis(1e-9, v, Math.PI / 180), 1e-9, 20e3, 22e3), 6.614e-12, 1e-3, 'un grado al secondo');
  // con il modo di misura molto più in alto si torna a F/k, amplificato di 1/(1 − (fd/fs)²)
  const ks = 1e-9 * Math.pow(TAU * 200e3, 2);
  rel(M.senseDisp(1e-9, 1e-9, 20e3, 200e3), 1e-9 / ks / (1 - 0.01), 1e-9, 'fs = 10·fd');
  // la risposta cresce avvicinando le due frequenze: per questo i giroscopi le accordano vicine
  assert.ok(M.senseDisp(1e-9, 1e-9, 20e3, 20.5e3) > 4 * M.senseDisp(1e-9, 1e-9, 20e3, 22e3), 'modi vicini');
});

test('colpo e fermi meccanici: impulso a mezza sinusoide e rimbalzo sui fermi', () => {
  // l'area della mezza sinusoide è 2·picco·durata/π
  const N = 20000;
  const dur = 1e-4;
  let area = 0;
  for (let i = 0; i < N; i++) area += M.pulse(((i + 0.5) * dur) / N, 3 * M.G, dur) * (dur / N);
  rel(area, (2 * 3 * M.G * dur) / Math.PI, 1e-6, 'variazione di velocità');
  assert.strictEqual(M.pulse(-1e-6, 1, dur), 0);
  assert.strictEqual(M.pulse(dur, 1, dur), 0);
  const hit = M.bounce({ u: 1.2e-6, v: 0.01 }, 1e-6, 0.3);
  assert.ok(hit.hit && hit.u === 1e-6, 'fermo');
  near(hit.v, -0.003, 1e-15, 'rimbalzo');
  const away = M.bounce({ u: -1.1e-6, v: 0.02 }, 1e-6, 0.3);
  assert.ok(away.u === -1e-6 && away.v === 0.02, 'si sta già allontanando');
  assert.strictEqual(M.bounce({ u: 0.5e-6, v: 1 }, 1e-6, 0.3).hit, false);
});
