// Strumenti condivisi: formattazione all'italiana e serie commerciali dei componenti.
const test = require('node:test');
const assert = require('node:assert');
const { EI } = require('./harness.js');

const NB = ' ';

test('core: EI.si usa il prefisso giusto e la virgola decimale', () => {
  assert.strictEqual(EI.si(0.0047, 'A'), '4,70' + NB + 'mA');
  assert.strictEqual(EI.si(4700, 'Ω', { trim: true }), '4,7' + NB + 'kΩ');
  assert.strictEqual(EI.si(220e-6, 'F', { trim: true }), '220' + NB + 'µF');
  assert.strictEqual(EI.si(1.034, 's'), '1,03' + NB + 's');
  assert.strictEqual(EI.si(-5, 'V'), '−5,00' + NB + 'V');
  assert.strictEqual(EI.si(0, 'V'), '0,00' + NB + 'V');
});

test('core: EI.si passa al prefisso successivo quando l\'arrotondamento arriva a 1000', () => {
  assert.strictEqual(EI.si(999.96, 'Hz'), '1,00' + NB + 'kHz');
});

test('core: le serie E12 ed E6 contengono i valori commerciali', () => {
  const e12 = EI.seriesValues('E12', 1000, 10000);
  assert.deepStrictEqual(e12.slice(0, 4), [1000, 1200, 1500, 1800]);
  assert.ok(e12.includes(4700) && e12.includes(8200) && e12.includes(10000));
  const e6 = EI.seriesValues('E6', 1e-6, 10e-6);
  assert.deepStrictEqual(e6.map((v) => Math.round(v * 1e7) / 10), [1, 1.5, 2.2, 3.3, 4.7, 6.8, 10]);
});

test('core: EI.rich trasforma i termini del glossario in collegamenti', () => {
  EI.glossary.prova = { term: 'Prova', def: 'definizione' };
  const out = EI.rich('una [[prova]] e [[prova|due prove]]');
  assert.match(out, /<a class="ei-term" href="#glossario\/prova" data-term="prova">prova<\/a>/);
  assert.match(out, />due prove<\/a>/);
  delete EI.glossary.prova;
});

test('core: EI.si mostra i femto e azzera i valori trascurabili', () => {
  assert.strictEqual(EI.si(3.2e-14, 'A'), '32,0\u202ffA');
  assert.strictEqual(EI.si(2.57e-17, 'A', { trim: true }), '0\u202fA');
});
