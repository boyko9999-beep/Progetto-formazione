// Modello del capitolo 1 (serie di Fourier): node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./elettronica-avanzata.load.js');

const M = load().chapter('fourier').model;
const TAU = Math.PI * 2;

test('onda quadra: armoniche dispari con ampiezza 4/(πn)', () => {
  const t = M.terms('quadra', 3);
  assert.deepStrictEqual(Array.from(t, (x) => x.n), [1, 3, 5]);
  t.forEach((x) => assert.ok(Math.abs(x.a - 4 / (Math.PI * x.n)) < 1e-12));
});

test('la somma di molte armoniche tende alla forma ideale lontano dai salti', () => {
  for (const shape of ['quadra', 'triangolare', 'dente']) {
    const list = M.terms(shape, 400);
    for (const x of [0.7, 1.9, 4.1]) {
      assert.ok(Math.abs(M.synth(list, x) - M.ideal(shape, x)) < 0.02, shape + ' a x=' + x);
    }
  }
});

test('errore efficace: Parseval coincide con l\'integrazione numerica', () => {
  for (const shape of ['quadra', 'triangolare', 'dente']) {
    const list = M.terms(shape, 7);
    const N = 20000;
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const x = (TAU * (i + 0.5)) / N;
      const d = M.synth(list, x) - M.ideal(shape, x);
      sum += d * d;
    }
    const numeric = Math.sqrt(sum / N);
    assert.ok(Math.abs(numeric - M.rmsError(shape, 7)) < 2e-3, shape + ': ' + numeric + ' vs ' + M.rmsError(shape, 7));
  }
});

test('fenomeno di Gibbs: il picco dell\'onda quadra resta vicino a 1,179', () => {
  const p = M.peak('quadra', 200, 200000);
  assert.ok(Math.abs(p - 1.1789797) < 3e-3, 'picco ' + p);
  assert.ok(M.peak('quadra', 20) > 1.17, 'anche con poche armoniche');
});

test('l\'onda triangolare non ha salti e quindi niente Gibbs', () => {
  const p = M.peak('triangolare', 50);
  assert.ok(p <= 1.0001 && p > 0.99, 'picco ' + p);
});
