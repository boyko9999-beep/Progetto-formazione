// Modello del capitolo 10 (superconduttori, spintronica e qubit): node --test tests/elettronica-avanzata*.test.js
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./elettronica-avanzata.load.js');

const M = load().chapter('quantistica').model;
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, (what || '') + ': ' + a + ' invece di ' + b);
const vec = (v) => Array.from(v, (x) => Math.round(x * 1e9) / 1e9 + 0);

test('quanto di flusso e costante di Josephson dai valori esatti del SI', () => {
  near(M.PHI0, 2.067833848e-15, 1e-23, 'Φ0 = h/2e');
  near(M.josephsonFreq(1e-3), 483.597848e9, 1e3, 'f = 2eV/h a 1 mV');
  // Una spira di 1 cm² nel campo terrestre (50 µT) è attraversata da circa 2,4 milioni di quanti.
  near(M.fluxQuanta(50e-6, 1e-4), 2.418e6, 1e3, 'quanti di flusso');
  // Lo SQUID si ripete con periodo Φ0: massimo ai multipli interi, zero a metà.
  near(M.squidIc(0), 1, 1e-12);
  near(M.squidIc(2), 1, 1e-12);
  near(M.squidIc(0.5), 0, 1e-12);
  near(M.squidIc(0.3), M.squidIc(1.3), 1e-12, 'periodicità');
});

test('mercurio: resistenza zero sotto Tc e transizione larga pochi centesimi di kelvin', () => {
  assert.strictEqual(M.resistance(3), 0);
  assert.strictEqual(M.resistance(4), 0);
  near(M.resistance(M.TC_HG), 0.5, 1e-12, 'a Tc metà della resistenza normale');
  assert.ok(M.resistance(M.TC_HG + 0.05) > 0.95, 'quasi normale 0,05 K sopra Tc');
  assert.ok(M.resistance(M.TC_HG - 0.05) < 0.02, 'quasi zero 0,05 K sotto Tc');
  assert.ok(M.resistance(5) > M.resistance(4.4), 'sopra Tc cresce con la temperatura');
});

test('teoria BCS: il gap dell\'alluminio è molto più grande del quanto di un qubit', () => {
  near(M.gap(1.2) / M.QE * 1e3, 0.18, 0.01, 'Δ in meV');
  const f = M.pairBreakFreq(1.2);
  assert.ok(f > 80e9 && f < 95e9, '2Δ/h ≈ 90 GHz: ' + f);
  assert.ok(f > 10 * 5e9, 'i fotoni a 5 GHz non spezzano le coppie');
});

test('energia di un quanto a 5 GHz e temperatura di lavoro', () => {
  near(M.quantumEnergy(5e9) / M.QE * 1e6, 20.68, 0.01, 'E in µeV');
  near(M.equivTemp(5e9), 0.24, 0.001, 'temperatura equivalente');
  near(M.thermalP1(5e9, M.equivTemp(5e9)), 1 / (1 + Math.E), 1e-9, 'a 0,24 K circa una volta su quattro');
  const p = M.thermalP1(5e9, 0.01);
  assert.ok(p > 3e-11 && p < 5e-11, 'a 10 mK ≈ 4·10⁻¹¹: ' + p);
});

test('valvola di spin: modello a due canali', () => {
  for (const a of [1.5, 2, 3, 5]) {
    assert.ok(M.valve(a, true) < M.valve(a, false), 'parallelo meno resistivo con α = ' + a);
    near(M.gmr(a), ((a - 1) * (a - 1)) / (4 * a), 1e-12, 'ΔR/R con α = ' + a);
  }
  near(M.gmr(1), 0, 1e-12, 'senza asimmetria di spin niente GMR');
  near(M.gmr(2), 0.125, 1e-12);
  near(M.valveR(0, 2), M.valve(2, true), 1e-12);
  near(M.valveR(Math.PI, 2), M.valve(2, false), 1e-12);
});

test('porte come rotazioni della sfera di Bloch', () => {
  const z = [0, 0, 1];
  assert.deepStrictEqual(vec(M.applyGate(z, 'X')), [0, 0, -1], 'X|0⟩ = |1⟩');
  assert.deepStrictEqual(vec(M.applyGate(z, 'H')), [1, 0, 0], 'H|0⟩ = |+⟩');
  assert.deepStrictEqual(vec(M.applyGate(M.applyGate(z, 'H'), 'H')), [0, 0, 1], 'H·H = identità');
  assert.deepStrictEqual(vec(M.applyGate(z, 'Z')), [0, 0, 1], 'Z non cambia |0⟩');
  const plus = [1, 0, 0];
  assert.deepStrictEqual(vec(M.applyGate(plus, 'S')), [0, 1, 0], 'S: un quarto di giro');
  assert.deepStrictEqual(vec(M.applyGate(M.applyGate(plus, 'S'), 'S')), vec(M.applyGate(plus, 'Z')), 'S·S = Z');
  assert.deepStrictEqual(vec(M.applyGate(M.applyGate(plus, 'T'), 'T')), vec(M.applyGate(plus, 'S')), 'T·T = S');
  // Convenzione Rx(θ) = exp(−iθX/2): Rx(90°)|0⟩ = (|0⟩ − i|1⟩)/√2, cioè φ = 270°.
  assert.deepStrictEqual(vec(M.applyGate(z, 'Rx', Math.PI / 2)), [0, -1, 0]);
  for (const th of [0.3, 1, 2, 3]) {
    const v = M.applyGate(z, 'Ry', th);
    near(M.prob0(v), Math.cos(th / 2) ** 2, 1e-12, 'P(0) = cos²(θ/2)');
    near(M.len(v), 1, 1e-12, 'le rotazioni non accorciano il vettore');
  }
});

test('ampiezze, angoli e purezza', () => {
  const v = M.bloch(Math.PI / 3, Math.PI / 2);
  const a = M.amplitudes(v);
  near(a.alpha, Math.sqrt(3) / 2, 1e-12, 'α = cos 30°');
  near(a.betaAbs, 0.5, 1e-12, '|β| = sin 30°');
  near(a.betaPhase, Math.PI / 2, 1e-12, 'fase di β = φ');
  near(a.alpha ** 2 + a.betaAbs ** 2, 1, 1e-12, '|α|² + |β|² = 1');
  near(M.prob0(v), 0.75, 1e-12);
  assert.ok(Number.isNaN(M.angles([0, 0, 1]).phi), 'ai poli φ non è definita');
  near(M.purity(v), 1, 1e-12, 'stato puro');
  near(M.purity([0, 0, 0]), 0.5, 1e-12, 'centro della sfera');
});

test('decoerenza: T2 accorcia solo la parte orizzontale', () => {
  const T2 = 100e-6;
  const v = M.dephase(M.bloch(Math.PI / 3, 0), T2, T2);
  near(v[2], 0.5, 1e-12, 'z resta uguale, e con lei P(0)');
  near(Math.hypot(v[0], v[1]), Math.sin(Math.PI / 3) / Math.E, 1e-12, 'parte orizzontale × e^(−1)');
  assert.strictEqual(M.amplitudes(v), null, 'stato misto: α e β non sono definite');
  // Esperimento di Ramsey: H, attesa t, H. P(0) = (1 + e^(−t/T2))/2.
  for (const t of [0, 50e-6, 200e-6]) {
    const s = M.run([{ g: 'H' }, { wait: t }, { g: 'H' }], T2, 0);
    near(M.prob0(s), (1 + Math.exp(-t / T2)) / 2, 1e-12, 'Ramsey a ' + t * 1e6 + ' µs');
  }
  near(M.purity(M.run([{ g: 'H' }, { wait: 1 }], T2, 0)), 0.5, 1e-9, 'fase persa del tutto: stato completamente misto');
});

test('misure con generatore pseudocasuale con seme', () => {
  const a = M.rng(42);
  const b = M.rng(42);
  for (let i = 0; i < 20; i++) assert.strictEqual(a(), b(), 'stesso seme, stessa sequenza');
  const r = M.rng(7);
  for (let i = 0; i < 1000; i++) { const x = r(); assert.ok(x >= 0 && x < 1); }
  // θ = 60°: P(0) = 0,75; su 10 000 copie σ = √(N·p·(1−p)) ≈ 43.
  const c = M.measureMany(M.bloch(Math.PI / 3, 0), 10000, M.rng(2025));
  assert.strictEqual(c[0] + c[1], 10000);
  assert.ok(Math.abs(c[0] - 7500) < 4 * 43.3, 'conteggi di 0: ' + c[0]);
  // Gli stati |0⟩ e |1⟩ danno sempre lo stesso risultato.
  assert.deepStrictEqual(Array.from(M.measureMany([0, 0, 1], 100, M.rng(3))), [100, 0]);
  assert.deepStrictEqual(Array.from(M.measureMany([0, 0, -1], 100, M.rng(3))), [0, 100]);
  // Dopo la decoerenza P(0) resta 1/2 per uno stato sull'equatore.
  const mixed = M.measureMany(M.dephase([1, 0, 0], 1, 1e-4), 10000, M.rng(9));
  assert.ok(Math.abs(mixed[0] - 5000) < 4 * 50, 'stato misto: ' + mixed[0]);
});
