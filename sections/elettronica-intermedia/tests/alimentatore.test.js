// Test del modello fisico del capitolo "L'alimentatore: dalla presa ai 5 volt" (valori da libro di testo).
const test = require('node:test');
const assert = require('node:assert');
const { EI, chapter } = require('./harness.js');

const m = chapter('alimentatore').model;
const close = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, (msg ? msg + ': ' : '') + a + ' invece di ' + b);
const sim = (p) => m.simulate(Object.assign({ vrms: 12, mode: 'ponte', C: 2200e-6, I: 0.5, reg: true, load: 'carico' }, p));

test('il picco è il valore efficace per radice di 2', () => {
  close(m.peak(230), 325.27, 0.01, 'rete');
  close(m.peak(12), 16.97, 0.01, 'secondario da 12 V');
  close(m.secondary(0.005, 12, 50), 16.97, 0.01, 'a 5 ms (un quarto di periodo) la sinusoide è al picco');
  close(m.secondary(0.015, 12, 50), -16.97, 0.01, 'a 15 ms è al picco negativo');
});

test('il ponte raddrizza anche la semionda negativa e perde due cadute di diodo', () => {
  close(m.rectified(10, 'ponte'), 8.6, 1e-9);
  close(m.rectified(-10, 'ponte'), 8.6, 1e-9, 'la semionda negativa viene ribaltata');
  assert.strictEqual(m.rectified(-10, 'semionda'), 0, 'il singolo diodo blocca la semionda negativa');
  close(m.rectified(10, 'semionda'), 9.3, 1e-9);
  assert.strictEqual(m.rectified(1, 'ponte'), 0, 'sotto 1,4 V il ponte non conduce');
  close(m.rectifiedPeak(12, 'ponte'), 15.57, 0.01);
  close(m.rectifiedPeak(12, 'semionda'), 16.27, 0.01);
  assert.strictEqual(m.diodes('ponte'), 2);
  assert.strictEqual(m.diodes('semionda'), 1);
});

test('stima del ripple: I/(2fC) con il ponte, I/(fC) a semionda', () => {
  close(m.rippleEstimate(1, 4700e-6, 'ponte'), 2.128, 0.001);
  close(m.rippleEstimate(1, 4700e-6, 'semionda'), 4.255, 0.001);
  close(m.rippleEstimate(0.5, 2200e-6, 'ponte'), 2.273, 0.001);
  close(m.rippleEstimate(1, 10000e-6, 'ponte'), 1, 1e-9, 'servono 10 000 µF per 1 V a 1 A');
  assert.strictEqual(m.rippleEstimate(1, 0, 'ponte'), Infinity);
});

test('la simulazione nel tempo conferma la stima (un po\' sotto, perché la ricarica ruba tempo alla scarica)', () => {
  for (const C of [1000e-6, 2200e-6, 4700e-6]) {
    for (const mode of ['ponte', 'semionda']) {
      const r = sim({ C: C, mode: mode });
      const k = r.ripple / r.estimate;
      assert.ok(k > 0.7 && k < 1, mode + ' ' + C * 1e6 + ' µF: rapporto ' + k);
      close(r.vmax, m.rectifiedPeak(12, mode), 0.01, 'il condensatore si carica fino al picco raddrizzato');
    }
  }
  const a = sim({ C: 2200e-6 });
  const b = sim({ C: 4700e-6 });
  close(b.ripple / a.ripple, 2200 / 4700, 0.05, 'ripple inversamente proporzionale a C');
  const h = sim({ C: 4700e-6, mode: 'semionda' });
  close(h.ripple / b.ripple, 2, 0.15, 'a semionda il ripple raddoppia');
});

test('in tre periodi di rete il ponte ricarica 6 volte, la semionda 3', () => {
  assert.strictEqual(sim({ mode: 'ponte' }).pulses, 6);
  assert.strictEqual(sim({ mode: 'semionda' }).pulses, 3);
  const r = sim({});
  assert.ok(r.conduction > 0.1 && r.conduction < 0.25, 'i diodi conducono solo vicino ai picchi: ' + r.conduction);
  assert.ok(r.iPeak > 5 * r.iAvg, 'impulsi di corrente molto più alti della media');
  close(r.iAvg, 0.5, 0.01, 'in media i diodi portano la corrente del carico');
});

test('senza condensatore la tensione torna a zero a ogni semionda', () => {
  const r = sim({ C: 0, reg: false });
  close(r.vmin, 0, 1e-9);
  close(r.vmax, 15.57, 0.01);
  assert.strictEqual(r.regulated, false);
});

test('7805: 5 V fissi finché l\'ingresso resta 2 V sopra, poi segue l\'ingresso', () => {
  assert.strictEqual(m.regulator(12), 5);
  assert.strictEqual(m.regulator(7), 5);
  close(m.regulator(6.5), 4.5, 1e-9);
  assert.strictEqual(m.regulator(1), 0);
  close(m.regPower(12, 5, 1), 7, 1e-9, '(12 − 5) V · 1 A');
  close(m.efficiency(5 * 1, 12 * 1), 0.4167, 0.0001, 'rendimento di un lineare 12 → 5 V');
  close(m.junctionTemp(5), 75, 1e-9, '25 °C + 5 W · 10 °C/W');
});

test('bilancio energetico: potenza dal secondario = carico + regolatore + diodi', () => {
  for (const vrms of [9, 12, 15]) {
    const r = sim({ vrms: vrms, C: 4700e-6, I: 0.5 });
    close(r.pIn, r.pOut + r.pReg + r.pDiodes, 0.02 * r.pIn, vrms + ' V');
    assert.ok(r.regulated, vrms + ' V in regolazione');
    close(r.pOut, 2.5, 1e-6, '5 V · 0,5 A');
    close(r.pReg, (r.vavg - 5) * 0.5, 0.01, 'P = (Vin − Vout) · I');
  }
  const r = sim({ vrms: 9, C: 4700e-6 });
  assert.ok(r.pReg < 3 && r.eff > 0.4, 'il secondario più basso scalda meno: ' + r.pReg + ' W, rendimento ' + r.eff);
  const r15 = sim({ vrms: 15, C: 4700e-6 });
  assert.ok(r15.pReg > 7 && r15.eff < 0.3, 'il secondario da 15 V spreca di più');
});

test('dropout: con le valli sotto 7 V l\'uscita scende sotto 5 V', () => {
  const r = sim({ vrms: 9, C: 470e-6, I: 1 });
  assert.strictEqual(r.regulated, false);
  assert.ok(r.vmin < 7 && r.voutMin < 5);
  close(r.voutMin, r.vmin - 2, 1e-9);
  const ok = sim({ vrms: 12, C: 4700e-6, I: 1 });
  assert.strictEqual(ok.regulated, true);
  close(ok.outRipple, 0, 1e-12, 'in regolazione l\'uscita è piatta');
});

test('il carico senza regolatore riceve tutta la tensione del condensatore', () => {
  const r = sim({ reg: false });
  close(r.voutMax, r.vmax, 1e-12);
  assert.ok(r.pReg === 0);
  close(m.loadCurrent(15, 0.5, false), 1.5, 1e-9, 'la resistenza da 10 Ω a 15 V prende 1,5 A');
  close(m.loadCurrent(15, 0.5, true), 0.5, 1e-9, 'dietro al 7805 prende 0,5 A');
});

test('le sfide del laboratorio hanno una soluzione con i valori dei comandi', () => {
  // la stessa simulazione del banco: 3 periodi registrati dopo 2 di assestamento
  const bench = (p) => m.simulate(Object.assign({ load: 'carico', reg: true, periods: 3, settle: 2, dt: 1e-5, every: 5 }, p));
  const caps = EI.seriesValues('E6', 100e-6, 10e-3);
  assert.strictEqual(caps.length, 13, 'da 100 µF a 10 000 µF');
  // 1. il condensatore più piccolo che regge 500 mA: 330 µF con il secondario da 15 V e il ponte
  let best = null;
  for (const C of caps) {
    for (const vrms of [9, 12, 15]) {
      for (const mode of ['ponte', 'semionda']) {
        if (!best && bench({ vrms: vrms, mode: mode, C: C, I: 0.5 }).regulated) best = { C: C, vrms: vrms, mode: mode };
      }
    }
  }
  close(best.C, 330e-6, 1e-9);
  assert.deepStrictEqual([best.vrms, best.mode], [15, 'ponte']);
  // 2. il dropout si raggiunge: 12 V e 330 µF a 500 mA
  const drop = bench({ vrms: 12, mode: 'ponte', C: 330e-6, I: 0.5 });
  assert.ok(drop.vmin < 7 && drop.vmax >= 7 && !drop.regulated);
  // 3. meno di 1 V di ripple a 1 A: serve il condensatore più grande, 10 000 µF
  assert.ok(bench({ vrms: 12, mode: 'ponte', C: 10e-3, I: 1 }).ripple < 1);
  assert.ok(bench({ vrms: 12, mode: 'ponte', C: 6.8e-3, I: 1 }).ripple > 1);
  // 4. a 500 mA in regolazione il 7805 scalda sempre più di 2 W, ma con 9 V si resta sotto 3 W
  let minP = Infinity;
  for (const C of caps) {
    for (const vrms of [9, 12, 15]) {
      for (const mode of ['ponte', 'semionda']) {
        const r = bench({ vrms: vrms, mode: mode, C: C, I: 0.5 });
        if (r.regulated) minP = Math.min(minP, r.pReg);
      }
    }
  }
  assert.ok(minP > 2 && minP < 3, 'potenza minima in regolazione: ' + minP + ' W');
  assert.ok(bench({ vrms: 9, mode: 'ponte', C: 2200e-6, I: 0.5 }).pReg < 3);
  assert.ok(bench({ vrms: 12, mode: 'ponte', C: 10e-3, I: 0.5 }).pReg > 3, 'con 12 V non basta nessun condensatore');
});
