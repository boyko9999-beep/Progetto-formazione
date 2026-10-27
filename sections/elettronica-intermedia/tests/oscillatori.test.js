// Capitolo 8: modello del timer 555 in configurazione astabile (e monostabile).
const test = require('node:test');
const assert = require('node:assert');
const { chapter } = require('./harness.js');

const m = chapter('oscillatori').model;
const close = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, a + ' ≠ ' + b);
const rel = (a, b, r) => assert.ok(Math.abs(a - b) <= Math.abs(b) * r, a + ' ≠ ' + b + ' (±' + r * 100 + '%)');

// Fa correre la macchina a stati a passi di dt e raccoglie i fronti dell'uscita con il loro tempo assoluto.
function run(p, total, dt, start) {
  let s = start || { vc: 0, q: 1 };
  let t = 0;
  const edges = [];
  let vmin = Infinity;
  let vmax = -Infinity;
  while (t < total - 1e-15) {
    const h = Math.min(dt, total - t);
    const r = m.step(s, h, p);
    for (const e of r.events) edges.push({ t: t + e.t, q: e.q });
    s = { vc: r.vc, q: r.q };
    t += h;
    if (edges.length >= 2) { vmin = Math.min(vmin, s.vc); vmax = Math.max(vmax, s.vc); }
  }
  return { state: s, edges: edges, vmin: vmin, vmax: vmax };
}

test('oscillatori: le soglie sono 1/3 e 2/3 di Vcc (3 V e 6 V con 9 V)', () => {
  const s = m.thresholds(9);
  close(s.low, 3, 1e-12);
  close(s.high, 6, 1e-12);
});

test('oscillatori: tempo alto = ln2·(R1+R2)·C, tempo basso = ln2·R2·C', () => {
  // 10 kΩ, 47 kΩ, 10 µF
  close(m.tHigh(10e3, 47e3, 10e-6), 0.395094, 1e-6);
  close(m.tLow(47e3, 10e-6), 0.325779, 1e-6);
  close(m.tHigh(10e3, 47e3, 10e-6) + m.tLow(47e3, 10e-6), m.period(10e3, 47e3, 10e-6), 1e-15);
  // ln 2 è proprio il tempo per salire da 1/3 a 2/3 di Vcc puntando a Vcc
  close(m.timeTo(3, 6, 9, 1), Math.LN2, 1e-12);
  close(m.timeTo(6, 3, 0, 1), Math.LN2, 1e-12);
});

test('oscillatori: f = 1/(ln2·(R1+2R2)·C) ≈ 1,44/((R1+2R2)·C): 687 Hz con 1 kΩ, 10 kΩ, 100 nF', () => {
  const f = m.freq(1e3, 10e3, 100e-9);
  close(f, 686.99, 0.01);
  rel(f, 1.44 / ((1e3 + 2 * 10e3) * 100e-9), 0.002);
  close(f * m.period(1e3, 10e3, 100e-9), 1, 1e-12);
  // i valori di partenza del laboratorio: 22 kΩ, 47 kΩ, 22 µF → 0,565 Hz, un lampo ogni 1,77 s
  close(m.freq(22e3, 47e3, 22e-6), 0.5653, 1e-4);
  close(m.period(22e3, 47e3, 22e-6), 1.7689, 1e-4);
});

test('oscillatori: il duty cycle del circuito classico supera sempre il 50%', () => {
  close(m.duty(1e3, 10e3), 11 / 21, 1e-12);
  close(m.duty(10e3, 10e3), 2 / 3, 1e-12);
  for (const R1 of [1e3, 4.7e3, 22e3, 100e3]) {
    for (const R2 of [1e3, 10e3, 100e3]) {
      const d = m.duty(R1, R2);
      assert.ok(d > 0.5 && d < 1, 'duty ' + d);
      close(d, m.tHigh(R1, R2, 1e-6) / m.period(R1, R2, 1e-6), 1e-12);
    }
  }
  // con R1 piccola rispetto a R2 si arriva vicino al 50% senza mai raggiungerlo
  assert.ok(m.duty(1e3, 100e3) < 0.505);
});

test('oscillatori: il primo ciclo dura ln3·(R1+R2)·C, poi il periodo è costante', () => {
  const p = { R1: 10e3, R2: 47e3, C: 10e-6, Vcc: 9 };
  const r = run(p, 6, 0.0137);
  // il primo fronte è la discesa: C parte da 0 V e deve arrivare a 2/3 di Vcc
  assert.strictEqual(r.edges[0].q, 0);
  close(r.edges[0].t, m.firstHigh(p.R1, p.R2, p.C), 1e-9);
  close(r.edges[0].t, Math.log(3) * 57e3 * 10e-6, 1e-9);
  // poi fronti alternati: tempo basso, tempo alto, tempo basso...
  for (let k = 1; k < r.edges.length; k++) {
    const dtk = r.edges[k].t - r.edges[k - 1].t;
    const want = r.edges[k].q ? m.tLow(p.R2, p.C) : m.tHigh(p.R1, p.R2, p.C);
    close(dtk, want, 1e-9);
  }
  const rises = r.edges.filter((e) => e.q === 1).map((e) => e.t);
  assert.ok(rises.length >= 5);
  for (let k = 1; k < rises.length; k++) close(rises[k] - rises[k - 1], m.period(p.R1, p.R2, p.C), 1e-9);
  // dopo il primo ciclo la tensione resta nella finestra tra le soglie
  assert.ok(r.vmin >= 3 - 1e-9 && r.vmax <= 6 + 1e-9, r.vmin + ' / ' + r.vmax);
});

test('oscillatori: la frequenza non dipende da Vcc (5 V e 15 V danno gli stessi fronti)', () => {
  const base = { R1: 4.7e3, R2: 22e3, C: 1e-6 };
  const a = run(Object.assign({ Vcc: 5 }, base), 0.5, 0.0011);
  const b = run(Object.assign({ Vcc: 15 }, base), 0.5, 0.0011);
  assert.strictEqual(a.edges.length, b.edges.length);
  for (let k = 0; k < a.edges.length; k++) {
    close(a.edges[k].t, b.edges[k].t, 1e-9);
    assert.strictEqual(a.edges[k].q, b.edges[k].q);
  }
  // le tensioni invece scalano con Vcc
  close(b.state.vc / a.state.vc, 3, 1e-9);
  close(m.vout(1, 15) - m.vout(1, 5), 10, 1e-12);
  assert.strictEqual(m.vout(0, 15), 0);
});

test('oscillatori: un passo lungo equivale a tanti passi corti (simulazione esatta)', () => {
  const p = { R1: 22e3, R2: 47e3, C: 22e-6, Vcc: 9 };
  const one = m.step({ vc: 0, q: 1 }, 7.3, p);
  const many = run(p, 7.3, 0.016);
  close(one.vc, many.state.vc, 1e-9);
  assert.strictEqual(one.q, many.state.q);
  assert.strictEqual(one.events.length, many.edges.length);
  for (let k = 0; k < one.events.length; k++) close(one.events[k].t, many.edges[k].t, 1e-9);
});

test('oscillatori: fuori dalla finestra delle soglie il flip-flop cambia subito', () => {
  const p = { R1: 1e3, R2: 10e3, C: 1e-6, Vcc: 12 };
  const a = m.step({ vc: 9, q: 1 }, 0, p);
  assert.strictEqual(a.q, 0);
  assert.deepStrictEqual(a.events, [{ t: 0, q: 0 }]);
  const b = m.step({ vc: 1, q: 0 }, 0, p);
  assert.strictEqual(b.q, 1);
  assert.deepStrictEqual(b.events, [{ t: 0, q: 1 }]);
});

test('oscillatori: la forma d\'onda a regime è continua sulle soglie', () => {
  const p = { R1: 10e3, R2: 47e3, C: 10e-6, Vcc: 9 };
  const th = m.tHigh(p.R1, p.R2, p.C);
  const T = m.period(p.R1, p.R2, p.C);
  close(m.waveform(0, p).vc, 3, 1e-12);
  assert.strictEqual(m.waveform(0, p).q, 1);
  close(m.waveform(th - 1e-12, p).vc, 6, 1e-6);
  close(m.waveform(th + 1e-12, p).vc, 6, 1e-6);
  assert.strictEqual(m.waveform(th + 1e-9, p).q, 0);
  close(m.waveform(T - 1e-12, p).vc, 3, 1e-6);
  // periodica, anche per tempi negativi
  close(m.waveform(0.1 + 3 * T, p).vc, m.waveform(0.1, p).vc, 1e-9);
  close(m.waveform(0.1 - T, p).vc, m.waveform(0.1, p).vc, 1e-9);
  // la macchina a stati, partita dalla soglia bassa, coincide con la formula
  const s = m.step({ vc: 3, q: 1 }, 0.5, p);
  close(s.vc, m.waveform(0.5, p).vc, 1e-9);
  assert.strictEqual(s.q, m.waveform(0.5, p).q);
});

test('oscillatori: monostabile ≈ 1,1·R·C (100 kΩ e 10 µF → 1,10 s)', () => {
  close(m.monostable(100e3, 10e-6), 1.098612, 1e-6);
  rel(m.monostable(100e3, 10e-6), 1.1 * 100e3 * 10e-6, 0.002);
});

test('oscillatori: correnti di carica e di scarica, piedino 7 e LED', () => {
  const p = { R1: 1e3, R2: 10e3, C: 1e-6, Vcc: 9 };
  // in carica la stessa corrente attraversa R1 e R2 e il piedino 7 non assorbe nulla
  const c = m.currents(1, 3, p);
  close(c.r1, 6 / 11e3, 1e-15);
  close(c.r2, c.r1, 1e-15);
  assert.strictEqual(c.dis, 0);
  // in scarica il piedino 7 porta a massa sia la corrente di R1 sia quella che esce da C
  const d = m.currents(0, 6, p);
  close(d.r1, 9e-3, 1e-15);
  close(d.r2, -6 / 10e3, 1e-15);
  close(d.dis, 9e-3 + 0.6e-3, 1e-15);
  assert.strictEqual(m.vDis(0, 6, p), 0);
  close(m.vDis(1, 3, p), 3 + 6 * 10 / 11, 1e-12);
  // LED con 560 Ω: circa 10 mA a 9 V, spento quando l'uscita è bassa
  close(m.ledCurrent(1, 9), 0.01, 1e-3);
  assert.strictEqual(m.ledCurrent(0, 9), 0);
});

test('oscillatori: rallentatore e finestra dell\'oscilloscopio', () => {
  // fino a 2 Hz l'animazione è in tempo reale
  assert.strictEqual(m.slowFactor(0.6), 1);
  assert.strictEqual(m.slowFactor(2), 1);
  // oltre, un fattore "tondo" che porta i lampeggi visibili tra 0,5 e 1,25 al secondo
  for (const f of [2.1, 3, 10, 48, 687, 1500, 9999, 120e3]) {
    const n = m.slowFactor(f);
    const shown = f / n;
    assert.ok(shown > 0.5 - 1e-9 && shown <= 1.25 + 1e-9, f + ' Hz / ' + n + ' = ' + shown);
    const mant = n / Math.pow(10, Math.floor(Math.log10(n) + 1e-9));
    assert.ok([1, 2, 5].some((x) => Math.abs(mant - x) < 1e-9), 'fattore ' + n);
  }
  // la finestra contiene almeno 3 periodi e non più di 8
  for (const T of [1.6667, 0.5, 1.4556e-3, 2.2e-5, 0.0123]) {
    const W = m.windowFor(T);
    assert.ok(W >= 3 * T * (1 - 1e-9) && W <= 8 * T, T + ' s → ' + W + ' s');
  }
});
