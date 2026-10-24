// Modello del capitolo 5 (conversione analogico-digitale): node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./elettronica-avanzata.load.js');

const chapter = load().chapter('conversione');
const M = chapter.model;
const TAU = Math.PI * 2;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg ? msg + ': ' : '') + a + ' invece di ' + b);

test('alias: il ripiegamento attorno ai multipli di fs/2 dà i valori noti', () => {
  near(M.alias(7000, 10000), 3000, 1e-9, '7 kHz campionati a 10 kHz');
  // telefono senza filtro, fs = 8 kHz
  near(M.alias(5000, 8000), 3000, 1e-9, '5 kHz');
  near(M.alias(7000, 8000), 1000, 1e-9, '7 kHz');
  near(M.alias(9000, 8000), 1000, 1e-9, '9 kHz');
  near(M.alias(11000, 8000), 3000, 1e-9, '11 kHz');
  // sotto Nyquist la frequenza resta quella vera
  near(M.alias(3400, 8000), 3400, 1e-9, 'voce a 3,4 kHz');
  near(M.alias(20000, 44100), 20000, 1e-9, 'CD a 20 kHz');
  // un multiplo esatto di fs sembra fermo
  near(M.alias(16000, 8000), 0, 1e-9, '2·fs');
  // il risultato cade sempre tra 0 e fs/2
  for (let f = 0; f <= 100000; f += 137) {
    const a = M.alias(f, 8000);
    assert.ok(a >= 0 && a <= M.nyquist(8000) + 1e-9, 'f = ' + f + ' → ' + a);
  }
  // ruota a 12 raggi a 1,9 giri/s filmata a 24 fotogrammi/s: 22,8 Hz → −1,2 Hz, cioè −0,1 giri/s
  near(M.aliasSigned(12 * 1.9, 24), -1.2, 1e-9, 'diligenza');
  near(M.aliasSigned(12 * 1.9, 24) / 12, -0.1, 1e-9, 'giri al secondo apparenti');
});

test('i campioni di f e del suo alias sono identici', () => {
  const fs = 10000;
  for (const f of [7000, 13000, 26000, 9100]) {
    const d = M.aliasSigned(f, fs);
    for (let n = 0; n < 50; n++) {
      const t = n / fs;
      near(Math.sin(TAU * f * t + 0.3), Math.sin(TAU * d * t + 0.3), 1e-6, f + ' Hz, campione ' + n);
    }
  }
});

test('LSB, rumore efficace e SNR ideale: 6,02·N + 1,76 dB', () => {
  near(M.lsb(1, 3), 0.125, 1e-15, '3 bit su 1 V');
  near(M.lsb(3.3, 12) * 1000, 0.806, 1e-3, '12 bit su 3,3 V (mV)');
  near(M.lsb(2, 16) * 1e6, 30.5, 0.05, '16 bit su 2 V (µV)');
  near(M.noiseRms(1), 0.2887, 1e-4, 'LSB/√12');
  near(M.snrIdeal(1), 7.78, 0.01, '1 bit');
  near(M.snrIdeal(8), 49.92, 0.01, '8 bit');
  near(M.snrIdeal(12), 74.00, 0.01, '12 bit');
  near(M.snrIdeal(16), 98.09, 0.01, '16 bit');
  near(M.snrIdeal(24), 146.26, 0.01, '24 bit');
  near(M.snrIdeal(11) - M.snrIdeal(10), 6.0206, 1e-4, 'un bit in più');
  // la formula viene dal rapporto tra la potenza della sinusoide e LSB²/12
  for (const n of [4, 8, 12]) {
    const step = M.lsb(2, n);
    near(10 * Math.log10(0.5 / (M.noiseRms(step) ** 2)), M.snrIdeal(n), 1e-9, n + ' bit');
  }
});

test('quantizzazione uniforme: 2^N livelli e errore sempre entro ±½ LSB', () => {
  for (const bits of [1, 3, 8, 12]) {
    const half = M.lsb(2, bits) / 2;
    const seen = new Set();
    for (let i = 0; i <= 4000; i++) {
      const x = -1 + (2 * i) / 4000;
      const q = M.quantize(x, bits);
      assert.ok(Math.abs(q - x) <= half + 1e-12, bits + ' bit, x = ' + x);
      seen.add(M.code(x, bits));
    }
    if (bits <= 8) assert.strictEqual(seen.size, 2 ** bits, bits + ' bit: tutti i codici');
    assert.strictEqual(M.code(-1, bits), 0);
    assert.strictEqual(M.code(1, bits), 2 ** bits - 1);
  }
  assert.strictEqual(M.binary(5, 3), '101');
  assert.strictEqual(M.binary(1, 4), '0001');
  near(M.level(0, 3), -0.875, 1e-15, 'primo livello a 3 bit');
  near(M.level(7, 3), 0.875, 1e-15, 'ultimo livello a 3 bit');
});

test('SNR misurato su una sinusoide a fondo scala: vicino alla formula da 6 a 12 bit', () => {
  for (const bits of [6, 8, 10, 12]) {
    const snr = M.snrMeasured(1000 * Math.SQRT2, 48000, bits, 1, 8192, 0.4);
    near(snr, M.snrIdeal(bits), 1, bits + ' bit');
  }
  // a metà ampiezza si perdono circa 6 dB: la formula vale solo a fondo scala
  near(M.snrMeasured(1000 * Math.SQRT2, 48000, 10, 0.5, 8192, 0.4), M.snrIdeal(10) - 6.02, 1, 'metà fondo scala');
  assert.strictEqual(M.snrMeasured(1000, 8000, 8, 0, 64), -Infinity);
});

test('SNR misurato con f/fs semplice: serve la media sulla fase', () => {
  // con 8 campioni per periodo l'errore si ripete identico e il risultato dipende dalla fase
  const one = M.snrMeasured(1000, 8000, 3, 1, 4096, 0.4);
  const avg = M.snrMeasured(1000, 8000, 3, 1, 512, 0.4, 32);
  const busy = M.snrMeasured(1000 * Math.SQRT2, 48000, 3, 1, 8192, 0.4);
  assert.ok(one > 25, 'una sola fase: ' + one);
  near(avg, busy, 0.3, 'media sulla fase contro rapporto irrazionale');
  near(avg, M.snrIdeal(3), 1, '3 bit: vicino alla formula');
});

test('ricostruzione ideale in forma chiusa: coincide con la somma di sinc, anche per l\'alias', () => {
  for (const r of [0.15, 0.37, 0.7, 1.3, 2.9]) {
    const sample = (n) => Math.sin(TAU * r * n + 0.4);
    for (const u of [100.3, 100.5, 101.77]) {
      near(M.idealTone(r, 0.4, 1, u), M.reconstruct(sample, u, 'sinc', 3000), 2e-3, 'r = ' + r + ', u = ' + u);
    }
  }
  // sotto Nyquist ritrova la sinusoide vera; sopra, quella a frequenza apparente
  near(M.idealTone(0.2, 0.4, 1, 3.3), Math.sin(TAU * 0.2 * 3.3 + 0.4), 1e-12, 'sotto Nyquist');
  near(M.idealTone(0.9, 0.4, 1, 3.3), Math.sin(-TAU * 0.1 * 3.3 + 0.4), 1e-12, '0,9·fs diventa −0,1·fs');
  // esattamente a fs/2 i campioni valgono sin(ph)·(−1)^n: resta solo la parte in coseno
  const half = (n) => Math.sin(Math.PI * n + 0.4);
  near(M.idealTone(0.5, 0.4, 1, 10.25), M.reconstruct(half, 10.25, 'sinc', 4000), 2e-3, 'fs/2');
  near(M.idealTone(0.5, 0.4, 1, 10.25), Math.sin(0.4) * Math.cos(Math.PI * 10.25), 1e-12, 'fs/2 in forma chiusa');
});

test('immagini dello spettro e risposta della ricostruzione', () => {
  assert.deepStrictEqual(Array.from(M.images(1000, 8000, 20000)), [1000, 7000, 9000, 15000, 17000]);
  assert.deepStrictEqual(Array.from(M.images(7000, 10000, 12500)), [3000, 7000]);
  assert.deepStrictEqual(Array.from(M.images(20000, 1000, 4250)), [0, 1000, 2000, 3000, 4000]);
  // la riga più bassa è sempre la frequenza apparente
  for (const f of [700, 4100, 9900, 23456]) near(M.images(f, 8000, 40000)[0], M.alias(f, 8000), 1e-6, 'f = ' + f);
  // gradini: |sinc| vale 2/π a fs/2 (−3,9 dB) e si annulla a fs; lineare: sinc², 4/π² a fs/2
  near(M.reconResponse(4000, 8000, 'gradini'), 2 / Math.PI, 1e-12, 'gradini a fs/2');
  near(20 * Math.log10(M.reconResponse(4000, 8000, 'gradini')), -3.92, 0.01, 'gradini in dB');
  near(M.reconResponse(8000, 8000, 'gradini'), 0, 1e-12, 'gradini a fs');
  near(M.reconResponse(7000, 8000, 'gradini'), 0.139, 1e-3, 'immagine a 7 kHz con i gradini');
  near(M.reconResponse(4000, 8000, 'lineare'), 4 / (Math.PI * Math.PI), 1e-12, 'lineare a fs/2');
  near(M.reconResponse(3999, 8000, 'sinc'), 1, 0, 'ideale sotto fs/2');
  near(M.reconResponse(4001, 8000, 'sinc'), 0, 0, 'ideale sopra fs/2');
});

test('SAR: un bit per confronto, dal più significativo, come la quantizzazione', () => {
  // la domanda 4: 4 bit, fondo scala 1,6 V, ingresso 1,05 V
  const r = M.sar(1.05, 4, 1.6);
  assert.deepStrictEqual(Array.from(r.steps, (s) => Math.round(s.threshold * 100) / 100), [0.8, 1.2, 1, 1.1]);
  assert.deepStrictEqual(Array.from(r.steps, (s) => s.keep), [true, false, true, false]);
  assert.strictEqual(r.code, 10);
  assert.strictEqual(M.binary(r.code, 4), '1010');
  // per ogni ingresso il SAR trova lo stesso codice del quantizzatore, in N passi
  for (const bits of [3, 8, 12]) {
    for (let i = 0; i < 500; i++) {
      const x = -1 + 2 * ((i * 0.6180339887) % 1);
      const s = M.sar(x + 1, bits, 2);
      assert.strictEqual(s.steps.length, bits);
      assert.strictEqual(s.code, M.code(x, bits), bits + ' bit, x = ' + x);
    }
  }
});

test('ricostruzione: la somma di sinc ritrova la curva tra i campioni, i gradini no', () => {
  const f = 0.2;   // in unità di fs: ben sotto Nyquist
  const sample = (n) => Math.sin(TAU * f * n + 0.7);
  let worstSinc = 0;
  let worstStep = 0;
  let worstLin = 0;
  for (let u = 40; u < 60; u += 0.13) {
    const truth = Math.sin(TAU * f * u + 0.7);
    worstSinc = Math.max(worstSinc, Math.abs(M.reconstruct(sample, u, 'sinc', 400) - truth));
    worstStep = Math.max(worstStep, Math.abs(M.reconstruct(sample, u, 'gradini') - truth));
    worstLin = Math.max(worstLin, Math.abs(M.reconstruct(sample, u, 'lineare') - truth));
  }
  assert.ok(worstSinc < 0.01, 'sinc: ' + worstSinc);
  assert.ok(worstLin > 0.05 && worstLin < worstStep, 'lineare: ' + worstLin + ', gradini: ' + worstStep);
  // sui campioni ogni metodo restituisce il campione stesso
  for (const mode of ['gradini', 'lineare', 'sinc']) near(M.reconstruct(sample, 47, mode, 32), sample(47), 1e-12, mode);
  // i gradini tengono il valore fino al campione seguente
  near(M.reconstruct(sample, 47.9, 'gradini'), sample(47), 0, 'tenuta');
  near(M.sinc(0), 1, 0);
  near(M.sinc(1), 0, 1e-15);
  near(M.sinc(0.5), 2 / Math.PI, 1e-12);
});

test('bit rate, filtro, sovracampionamento e ADC flash', () => {
  near(M.bitRate(8000, 8), 64000, 0, 'telefono');
  near(M.bitRate(44100, 16, 2), 1411200, 0, 'CD stereo');
  near(M.bitRate(256e9, 10), 2.56e12, 1, 'oscilloscopio da 256 GS/s');
  near(M.bitRate(32e9, 14), 448e9, 1, 'ADC da 32 GS/s a 14 bit');
  near(20 * Math.log10(M.butterworth(1000, 1000, 8)), -3.01, 0.01, 'taglio a −3 dB');
  near(20 * Math.log10(M.butterworth(2000, 1000, 8)), -48.16, 0.05, '8° ordine a un\'ottava');
  near(M.oversampling(4), 6.02, 0.01, 'sovracampionamento ×4');
  near(M.oversampling(2), 3.01, 0.01, 'sovracampionamento ×2');
  assert.strictEqual(M.flashComparators(6), 63);
  assert.strictEqual(M.flashComparators(8), 255);
  assert.strictEqual(M.flashComparators(12), 4095);
});

test('domande del capitolo: formato e conti coerenti con il modello', () => {
  const quiz = Array.from(chapter.quiz || []);
  assert.ok(quiz.length >= 4, 'almeno 4 domande');
  quiz.forEach((q) => {
    assert.strictEqual(q.chapter, 'conversione');
    assert.strictEqual(q.answer, 0);
    assert.ok([1, 2, 3].includes(q.level), q.id + ': livello');
    assert.ok(q.topic.length <= 30 && q.q.length <= 320 && q.why.length <= 600, q.id + ': lunghezze');
    Array.from(q.options).forEach((o) => assert.ok(o.length <= 140, q.id + ': ' + o));
  });
  near(M.nyquist(44100), 22050, 0, 'domanda 1: il CD lascia 2,05 kHz al filtro');
  near(M.alias(7000, 10000), 3000, 1e-9, 'domanda 2');
  near(M.snrIdeal(10) - M.snrIdeal(8), 12.04, 0.01, 'domanda 3');
  assert.strictEqual(M.binary(M.sar(1.05, 4, 1.6).code, 4), '1010', 'domanda 4');
  assert.strictEqual(M.flashComparators(8), 255, 'domanda 5');
  near(M.bitRate(44100, 16, 2) / 1e6, 1.41, 0.005, 'domanda 6');
});
