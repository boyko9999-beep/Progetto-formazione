// Capitolo 7: modello dell'amplificatore operazionale (741 con guadagno finito e uscita limitata).
const test = require('node:test');
const assert = require('node:assert');
const { chapter } = require('./harness.js');

const m = chapter('operazionale').model;
const A = m.OPAMP.A;
const close = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, a + ' ≠ ' + b + ' (tolleranza ' + eps + ')');

test('operazionale: guadagni ideali −Rf/Rin, 1 + Rf/Rg e 1 dell\'inseguitore', () => {
  assert.strictEqual(m.ideal('inv', 10e3, 100e3), -10);
  assert.strictEqual(m.ideal('inv', 10e3, 47e3), -4.7);
  assert.strictEqual(m.ideal('non', 1e3, 10e3), 11);
  assert.strictEqual(m.ideal('seg', 1e3, 10e3), 1);
  assert.strictEqual(m.noiseGain('inv', 10e3, 100e3), 11);
  assert.strictEqual(m.noiseGain('non', 1e3, 10e3), 11);
  assert.ok(Number.isNaN(m.ideal('cmp', 1e3, 10e3)), 'il comparatore non ha un guadagno ad anello chiuso');
});

test('operazionale: con A = 200 000 l\'invertente da −10 dà −9,99945', () => {
  assert.strictEqual(A, 2e5);
  close(m.closedLoop('inv', 10e3, 100e3, A), -10 / (1 + 11 / 2e5), 1e-12);
  close(m.closedLoop('inv', 10e3, 100e3, A), -9.99945, 1e-5);
  // l'errore relativo è (1/β)/A: 55 parti per milione
  close(1 - m.closedLoop('non', 1e3, 10e3, A) / 11, 55e-6, 1e-7);
  // con A sempre più grande il guadagno tende a quello ideale
  close(m.closedLoop('inv', 10e3, 100e3, 1e12), -10, 1e-9);
});

test('operazionale: formula di Black, A/(1 + Aβ) quasi non dipende da A', () => {
  close(m.feedback(2e5, 0.1), 9.9995, 1e-4);
  close(m.feedback(1e5, 0.1), 9.9990, 1e-4);
  close(m.feedback(5e4, 0.1), 9.998, 1e-3);
  close(m.feedback(1e6, 0.1), 9.9999, 1e-4);
  // A si dimezza (−50%), G cambia di appena 5 parti su centomila
  const rel = (m.feedback(2e5, 0.1) - m.feedback(1e5, 0.1)) / m.feedback(2e5, 0.1);
  assert.ok(rel > 0 && rel < 6e-5, 'variazione relativa ' + rel);
  // senza retroazione (β = 0) resta tutto A
  assert.strictEqual(m.feedback(2e5, 0), 2e5);
  // la formula di Black e quella del non invertente coincidono (β = Rg/(Rg + Rf))
  close(m.feedback(A, 1e3 / 11e3), m.closedLoop('non', 1e3, 10e3, A), 1e-9);
});

test('operazionale: cortocircuito virtuale, V+ e V− distano pochi microvolt', () => {
  const r = m.solve({ mode: 'inv', r1: 10e3, rf: 100e3, vs: 15 }, 1);
  assert.strictEqual(r.sat, false);
  assert.strictEqual(r.vp, 0);
  close(r.vout, -9.99945, 1e-5);
  close(r.vd, -50e-6, 0.1e-6); // circa 50 µV per 10 V d'uscita: la massa virtuale
  close(A * r.vd, r.vout, 1e-9); // Vout = A · (V+ − V−)
  // nessuna corrente negli ingressi: quella di Rin passa tutta in Rf
  const iIn = (r.vin - r.vn) / 10e3;
  const iF = (r.vn - r.vout) / 100e3;
  close(iIn, iF, 1e-15);
  close(iIn, 100e-6, 1e-8); // Vin/Rin = 1 V / 10 kΩ
});

test('operazionale: non invertente, 0,5 V × 11 ≈ 5,5 V in fase e V− segue V+', () => {
  const r = m.solve({ mode: 'non', r1: 1e3, rf: 10e3, vs: 12 }, 0.5);
  assert.strictEqual(r.sat, false);
  close(r.vout, 5.5, 1e-3);
  assert.ok(r.vout > 0, 'in fase con l\'ingresso');
  close(r.vn, 0.5, 1e-4);
  close(A * r.vd, r.vout, 1e-9);
  // la corrente che scende da Vout per Rf è la stessa che va a massa per Rg
  close((r.vout - r.vn) / 10e3, r.vn / 1e3, 1e-15);
});

test('operazionale: inseguitore, Vout = Vin con un errore di 5 parti per milione', () => {
  const r = m.solve({ mode: 'seg', vs: 12 }, 1);
  close(r.vout, 1 / (1 + 1 / A), 1e-12);
  close(r.vout, 0.999995, 1e-9);
  close(r.vd, r.vout / A, 1e-15);
});

test('operazionale: l\'uscita satura a circa 1 V dalle alimentazioni e la massa virtuale si perde', () => {
  assert.strictEqual(m.vsat(12), 11);
  assert.strictEqual(m.vsat(15), 14);
  assert.strictEqual(m.vsat(5, 1), 4);
  assert.strictEqual(m.vsat(0.5), 0);
  const p = { mode: 'inv', r1: 1e3, rf: 100e3, vs: 12 };
  const r = m.solve(p, 1);
  assert.strictEqual(r.sat, true);
  assert.strictEqual(r.vout, -11);
  close(r.vlin, -100 / (1 + 101 / A), 1e-9); // dove andrebbe senza limiti
  const c = m.cycle(p, 1, 360);
  assert.strictEqual(c.sat, true);
  close(c.peak, 11, 1e-12);
  close(c.vmax, 11, 1e-12);
  close(c.vmin, -11, 1e-12);
  assert.ok(c.maxVd > 0.5, 'in saturazione V+ − V− arriva a ' + c.maxVd + ' V');
  // con poco guadagno resta tutto lineare
  const ok = m.cycle({ mode: 'inv', r1: 10e3, rf: 47e3, vs: 12 }, 1, 360);
  assert.strictEqual(ok.sat, false);
  close(ok.gain, m.closedLoop('inv', 10e3, 47e3, A), 1e-12);
  assert.ok(ok.maxVd < 1e-4);
});

test('operazionale: il comparatore scatta tra ±Vsat e il tempo «alto» segue l\'arcoseno', () => {
  const p = { mode: 'cmp', vs: 12, vref: 0 };
  assert.strictEqual(m.solve(p, 0.001).vout, 11);
  assert.strictEqual(m.solve(p, -0.001).vout, -11);
  // bastano 11 V / 200 000 = 55 µV per arrivare al massimo
  close(m.solve(p, 20e-6).vout, 4, 1e-9);
  assert.strictEqual(m.solve({ mode: 'cmp', vs: 12, vref: 0.5 }, 0.4).vout, -11);
  assert.strictEqual(m.solve({ mode: 'cmp', vs: 12, vref: 0.5 }, 0.6).vout, 11);
  close(m.duty(1, 0), 0.5, 1e-15);
  close(m.duty(1, Math.SQRT1_2), 0.25, 1e-12);
  close(m.duty(1, -Math.SQRT1_2), 0.75, 1e-12);
  assert.strictEqual(m.duty(1, 2), 0);
  assert.strictEqual(m.duty(1, -2), 1);
  // la simulazione di un periodo dà lo stesso risultato
  close(m.cycle({ mode: 'cmp', vs: 12, vref: Math.SQRT1_2 }, 1, 3600).high, 0.25, 2e-3);
});

test('operazionale: banda e slew rate del 741', () => {
  close(m.bandwidth(m.OPAMP.GBW, 11), 90909.09, 0.01);
  close(m.bandwidth(m.OPAMP.GBW, 1001), 999.0, 0.01);
  close(m.bandwidth(m.OPAMP.GBW, 1), 1e6, 1e-6);
  // 0,5 V/µs: una sinusoide da 10 V di picco si deforma sopra circa 8 kHz
  close(m.fullPower(m.OPAMP.SR, 10), 7957.75, 0.01);
  close(m.fullPower(m.OPAMP.SR, 1), 79577.5, 0.1);
});

test('operazionale: sommatore invertente (mixer)', () => {
  close(m.summing([[1, 10e3], [0.5, 10e3]], 10e3), -1.5, 1e-12);
  close(m.summing([[1, 10e3], [1, 20e3]], 20e3), -3, 1e-12);
  close(m.summing([[0.2, 1e3]], 4.7e3), m.ideal('inv', 1e3, 4.7e3) * 0.2, 1e-12);
});

test('operazionale: le sfide del laboratorio si possono vincere con i valori E12', () => {
  // −10: Rin = 10 kΩ, Rf = 100 kΩ
  assert.ok(Math.abs(m.ideal('inv', 10e3, 100e3) + 10) < 0.05);
  // 0,5 V → almeno 5 V senza tagliare: Rg = 1 kΩ, Rf = 10 kΩ, alimentazione ±12 V
  const five = m.cycle({ mode: 'non', r1: 1e3, rf: 10e3, vs: 12 }, 0.5, 360);
  assert.ok(five.peak >= 4.99 && !five.sat, 'picco ' + five.peak);
  // almeno 10 V senza saturare e con V+ − V− sotto 1 mV: −10 con 1 V a ±12 V
  const ten = m.cycle({ mode: 'inv', r1: 10e3, rf: 100e3, vs: 12 }, 1, 360);
  assert.ok(ten.peak >= 9.95 && !ten.sat && ten.maxVd < 1e-3, JSON.stringify(ten));
  // un quarto del tempo: Vref = +0,7 V con 1 V di picco
  const d = m.duty(1, 0.7);
  assert.ok(d >= 0.2 && d <= 0.3, 'duty ' + d);
});

test('operazionale: inseguitore e comparatore agli estremi dei cursori', () => {
  // ±5 V di alimentazione e 5 V di picco: anche l'inseguitore satura, a 4 V, e la differenza tra gli ingressi arriva a 1 V
  const seg = m.cycle({ mode: 'seg', vs: 5 }, 5, 360);
  assert.strictEqual(seg.sat, true);
  close(seg.peak, 4, 1e-12);
  close(seg.maxVd, 1, 1e-9);
  // nel comparatore V+ − V− è semplicemente Vin − Vref
  const c = m.solve({ mode: 'cmp', vs: 15, vref: -3.5 }, -1);
  close(c.vd, 2.5, 1e-12);
  assert.strictEqual(c.vout, 14);
  // soglia fuori dal segnale (4 V di picco, Vref = ±5 V): l'uscita non scatta mai
  assert.strictEqual(m.cycle({ mode: 'cmp', vs: 12, vref: 5 }, 4, 360).high, 0);
  assert.strictEqual(m.cycle({ mode: 'cmp', vs: 12, vref: -5 }, 4, 360).high, 1);
  assert.strictEqual(m.duty(4, 5), 0);
  assert.strictEqual(m.duty(4, -5), 1);
  // con il guadagno più alto (−1000) e il segnale più piccolo (10 mV) resta tutto lineare
  const big = m.cycle({ mode: 'inv', r1: 1e3, rf: 1e6, vs: 12 }, 0.01, 360);
  assert.strictEqual(big.sat, false);
  close(big.gain, -1000 / (1 + 1001 / A), 1e-9); // −995: con tanto guadagno A non è più «infinito»
});

test('operazionale: i valori delle sfide sono sui cursori (serie E12)', () => {
  const { EI } = require('./harness.js');
  const rin = EI.seriesValues('E12', 1000, 100000);
  const rf = EI.seriesValues('E12', 1000, 1e6);
  [1e3, 10e3, 100e3].forEach((v) => assert.ok(rin.includes(v), 'Rin ' + v));
  [10e3, 100e3, 1e6].forEach((v) => assert.ok(rf.includes(v), 'Rf ' + v));
});
