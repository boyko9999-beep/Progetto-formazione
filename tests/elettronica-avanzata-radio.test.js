// Modello del capitolo 4 (radiofrequenza e modulazione): node --test tests/elettronica-avanzata*.test.js
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./elettronica-avanzata.load.js');

const M = load().chapter('radio').model;
const TAU = Math.PI * 2;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ': ' + a + ' invece di ' + b);

test('c = 1/√(μ0·ε0) è la velocità della luce, e λ = c/f', () => {
  near(M.lightSpeed(), 299792458, 1, 'c dalle costanti del vuoto');
  near(M.wavelength(100e6), 2.998, 1e-3, 'λ a 100 MHz');
  near(M.dipoleLength(100e6), 1.499, 1e-3, 'dipolo a 100 MHz');
  near(M.wavelength(2.4e9) * 100, 12.49, 0.01, 'λ a 2,4 GHz in cm');
  near(M.wavelength(1e6), 299.8, 0.1, 'λ a 1 MHz');
  // la banda della radio: da circa 100 km a circa 1 mm
  near(M.wavelength(3e3) / 1000, 99.93, 0.01, 'λ a 3 kHz in km');
  near(M.wavelength(3e11) * 1000, 0.9993, 1e-4, 'λ a 300 GHz in mm');
});

test('bande ITU e servizi del selettore di portante', () => {
  assert.strictEqual(M.band(1e6).name, 'MF');
  assert.strictEqual(M.band(100e6).name, 'VHF');
  assert.strictEqual(M.band(2.4e9).name, 'UHF');
  assert.strictEqual(M.band(26e9).name, 'SHF');
  assert.strictEqual(M.band(3e11).name, 'EHF');
  assert.strictEqual(M.band(1e3), null);
  assert.strictEqual(M.service(100e6), 'radio FM');
  assert.strictEqual(M.service(1e6), 'radio AM in onde medie');
});

test('funzioni di Bessel: valori noti, zeri della portante e potenza conservata', () => {
  near(M.besselJ(0, 1), 0.7651976866, 1e-9, 'J0(1)');
  near(M.besselJ(1, 1), 0.4400505857, 1e-9, 'J1(1)');
  near(M.besselJ(2, 1), 0.1149034849, 1e-9, 'J2(1)');
  near(M.besselJ(0, 2.404825558), 0, 1e-9, 'primo zero di J0');
  near(M.besselJ(0, 5.520078110), 0, 1e-9, 'secondo zero di J0');
  // la ricorrenza di Miller coincide con l'integrale
  const s = Array.from(M.besselSeries(5, 12));
  s.forEach((v, n) => near(v, M.besselJ(n, 5), 1e-10, 'J' + n + '(5)'));
  // l'FM non cambia la potenza: J0² + 2·ΣJn² = 1
  for (const beta of [0.1, 1.2, 5, 20, 100]) {
    const J = Array.from(M.besselSeries(beta, Math.ceil(beta) + 40));
    const p = J.reduce((acc, v, n) => acc + (n ? 2 : 1) * v * v, 0);
    near(p, 1, 1e-9, 'potenza con β = ' + beta);
  }
});

test('lo spettro calcolato di un segnale FM ha le righe di Bessel', () => {
  const fc = 40;
  const fm = 2;
  const N = 8192;
  for (const beta of [1.2, 2.404825558]) {
    for (let n = -3; n <= 3; n++) {
      let re = 0;
      let im = 0;
      for (let k = 0; k < N; k++) {
        const t = k / N;
        const s = M.fmSignal(t, fc, fm, beta);
        re += s * Math.cos(TAU * (fc + n * fm) * t);
        im -= s * Math.sin(TAU * (fc + n * fm) * t);
      }
      const amp = (2 / N) * Math.hypot(re, im);
      near(amp, Math.abs(M.besselJ(n, beta)), 1e-6, 'riga ' + n + ' con β = ' + beta);
    }
  }
  // con β ≈ 2,405 la portante sparisce dallo spettro
  const lines = Array.from(M.fmSpectrum(2.404825558, 4));
  near(lines.find((l) => l.k === 0).a, 0, 1e-9, 'portante');
  near(lines.find((l) => l.k === -1).a, -lines.find((l) => l.k === 1).a, 1e-12, 'J−1 = −J1');
});

test('regola di Carson: 180 kHz per la radio FM e quasi tutta la potenza dentro la banda', () => {
  assert.strictEqual(M.carson(75e3, 15e3), 180e3);
  near(M.carsonPowerFraction(5), 0.994, 0.001, 'β = 5');
  for (let beta = 0.1; beta <= 50; beta += 0.1) {
    assert.ok(M.carsonPowerFraction(beta) > 0.95, 'β = ' + beta.toFixed(1));
  }
  // banda AM e banda dei segnali digitali sagomati
  assert.strictEqual(M.amBandwidth(4.5e3), 9e3);
  assert.strictEqual(M.digitalBandwidth(1e6, 0.25), 1.25e6);
  near(M.rcPsd(0.5e6, 1e6, 0.25), 0.5, 1e-12, 'metà potenza alla frequenza di Nyquist');
  assert.strictEqual(M.rcPsd(0.626e6, 1e6, 0.25), 0);
  near(M.rectPsd(1e6, 1e6), 0, 1e-12, 'primo nullo degli impulsi rettangolari a Rs');
});

test('AM: bande laterali a m/2 e un terzo della potenza con m = 1', () => {
  const lines = Array.from(M.amSpectrum(0.8));
  assert.deepStrictEqual(lines.map((l) => l.k), [-1, 0, 1]);
  near(lines[0].a, 0.4, 1e-12, 'banda laterale');
  near(M.sidebandFraction(1), 1 / 3, 1e-12, 'm = 1');
  near(M.sidebandFraction(0.5), 0.1111, 1e-4, 'm = 0,5');
  // potenza media del segnale campionato = (1 + m²/2)/2, come dice la formula
  const N = 20000;
  let p = 0;
  for (let k = 0; k < N; k++) p += M.amSignal(k / N, 50, 5, 0.6) ** 2;
  near(p / N, (1 + 0.18) / 2, 1e-9, 'potenza media');
});

test('costellazioni: log2 M bit per simbolo, energia unitaria e codice di Gray', () => {
  assert.strictEqual(M.bitsPerSymbol(2), 1);
  assert.strictEqual(M.bitsPerSymbol(16), 4);
  assert.strictEqual(M.bitsPerSymbol(4096), 12);
  const pts = Array.from(M.constellation('qam16'));
  assert.strictEqual(pts.length, 16);
  assert.strictEqual(new Set(pts.map((p) => p.bits)).size, 16);
  near(pts.reduce((s, p) => s + p.i * p.i + p.q * p.q, 0) / 16, 1, 1e-12, 'energia media');
  // due punti vicini differiscono di un solo bit
  const step = 2 / Math.sqrt(10);
  pts.forEach((a) => pts.forEach((b) => {
    if (Math.abs(Math.hypot(a.i - b.i, a.q - b.q) - step) > 1e-9) return;
    const diff = [...a.bits].filter((c, n) => c !== b.bits[n]).length;
    assert.strictEqual(diff, 1, a.bits + ' e ' + b.bits);
  }));
  // la decisione sceglie il punto ideale più vicino
  pts.forEach((p, n) => assert.strictEqual(M.decide('qam16', p.i * 1.1 + 0.05, p.q * 0.9 - 0.04), n));
});

test('simboli sbagliati: la simulazione rispetta la teoria in rumore gaussiano', () => {
  const db = (x) => Math.pow(10, x / 10);
  near(M.serTheory('bpsk', db(6.8)), 1e-3, 5e-5, 'BPSK a 6,8 dB');
  near(M.serTheory('qam16', db(17.6)), 1e-3, 1e-4, '16-QAM a 17,6 dB');
  near(M.serTheory('qam16', db(10)), 0.222, 0.001, '16-QAM a 10 dB');
  const q = M.simulate('qam16', 10, 20000, 7);
  near(q.ser, M.serTheory('qam16', db(10)), 0.015, '16-QAM simulata a 10 dB');
  const b = M.simulate('bpsk', 4, 20000, 3);
  near(b.ser, M.serTheory('bpsk', db(4)), 0.004, 'BPSK simulata a 4 dB');
  // stesso seme, stesso rumore: con più SNR la nuvola si stringe e gli errori calano
  const hi = M.simulate('qam16', 16, 20000, 7);
  assert.ok(hi.errors < q.errors / 10, hi.errors + ' contro ' + q.errors);
  near(hi.i[5] - Array.from(M.constellation('qam16'))[hi.sent[5]].i,
    (q.i[5] - Array.from(M.constellation('qam16'))[q.sent[5]].i) * Math.pow(10, -6 / 20), 1e-12, 'rumore riscalato');
});

test('SNR dopo la demodulazione: l\'FM a larga banda guadagna, l\'AM perde', () => {
  const gainDb = (mode, p) => 10 * Math.log10(M.demodSnr(mode, 1, p));
  near(gainDb('fm', { beta: 5 }), 26.53, 0.01, 'FM con β = 5');
  near(gainDb('am', { m: 1 }), -1.76, 0.01, 'AM con m = 1');
  assert.ok(gainDb('fm', { beta: 0.2 }) < 0, 'la FM a banda stretta non conviene');
  near(M.shannon(100), Math.log2(101), 1e-12, 'Shannon');
});

test('campo del dipolo a mezz\'onda: nullo lungo l\'asse, diagramma a ciambella', () => {
  // oltre le estremità, sull'asse, ψ è sempre zero: nessuna radiazione lungo il filo
  for (let ph = 0; ph < TAU; ph += 0.4) {
    near(M.dipoleStream(0, 0.6, ph), 0, 1e-12, 'asse, fase ' + ph.toFixed(1));
    near(M.dipoleStream(0, -2.3, ph), 0, 1e-12, 'asse opposto');
  }
  // lontano dall'antenna l'ampiezza di ψ segue cos(π/2·cos θ)
  const amp = (theta) => {
    let m = 0;
    for (let ph = 0; ph < TAU; ph += TAU / 400) m = Math.max(m, Math.abs(M.dipoleStream(60 * Math.sin(theta), 60 * Math.cos(theta), ph)));
    return m;
  };
  const eq = amp(Math.PI / 2);
  near(eq, 2, 1e-3, 'piano equatoriale');
  for (const th of [0.4, 0.8, 1.2]) near(amp(th) / eq, M.dipolePattern(th) * Math.sin(th), 2e-3, 'θ = ' + th);
  near(M.dipolePattern(Math.PI / 2), 1, 1e-12, 'massimo');
  near(M.dipolePattern(0), 0, 1e-12, 'zero lungo l\'asse');
});
