// Capitolo 6: modello del circuito RC e del filtro del primo ordine.
const test = require('node:test');
const assert = require('node:assert');
const { chapter } = require('./harness.js');

const m = chapter('rc-filtri').model;
const close = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, a + ' ≠ ' + b);

test('rc-filtri: τ = R·C (4,7 kΩ · 220 µF = 1,034 s)', () => {
  close(m.tau(4700, 220e-6), 1.034, 1e-9);
});

test('rc-filtri: dopo 1τ la carica è al 63,2%, dopo 5τ al 99,3%', () => {
  close(m.approach(0, 5, 1, 1) / 5, 1 - Math.exp(-1), 1e-12);
  close(m.approach(0, 5, 5, 1) / 5, 0.99326, 1e-5);
  close(m.approach(5, 0, 1, 1), 5 * Math.exp(-1), 1e-12);
});

test('rc-filtri: la corrente iniziale è V/R', () => {
  close(m.current(5, 0, 4700), 5 / 4700, 1e-15);
  close(m.current(0, 5, 4700), -5 / 4700, 1e-15);
});

test('rc-filtri: fc di 1 kΩ e 100 nF ≈ 1591,5 Hz', () => {
  close(m.fc(1000, 100e-9), 1591.549, 1e-3);
});

test('rc-filtri: a f = fc il guadagno è 1/√2 (−3 dB) e la fase ±45°', () => {
  const lp = m.response('lp', 1000, 1000);
  const hp = m.response('hp', 1000, 1000);
  close(lp.gain, Math.SQRT1_2, 1e-12);
  close(hp.gain, Math.SQRT1_2, 1e-12);
  close(m.db(lp.gain), -3.0103, 1e-4);
  close(lp.phase * 180 / Math.PI, -45, 1e-9);
  close(hp.phase * 180 / Math.PI, 45, 1e-9);
});

test('rc-filtri: il passa-basso perde 20 dB per decade', () => {
  const g10 = m.db(m.response('lp', 10e3, 100).gain);
  const g100 = m.db(m.response('lp', 100e3, 100).gain);
  close(g10 - g100, 20, 0.01);
});

test('rc-filtri: reattanza di 100 nF a 1 kHz ≈ 1,59 kΩ', () => {
  close(m.reactance(1000, 100e-9), 1591.549, 1e-3);
});
