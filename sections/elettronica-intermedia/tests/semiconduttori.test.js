// Capitolo 1: modello del silicio puro e drogato (concentrazioni, mobilità, resistività).
const test = require('node:test');
const assert = require('node:assert');
const { chapter } = require('./harness.js');

const m = chapter('semiconduttori').model;
const rel = (a, b, tol) => assert.ok(Math.abs(a / b - 1) <= tol, a + ' non è entro il ' + tol * 100 + '% di ' + b);
const between = (x, lo, hi) => assert.ok(x >= lo && x <= hi, x + ' non è tra ' + lo + ' e ' + hi);

test('semiconduttori: nᵢ(300 K) vale 1,0·10¹⁰ cm⁻³ nel silicio e circa 2·10¹³ nel germanio', () => {
  rel(m.ni(300), 1.0e10, 1e-12);
  rel(m.ni(300, 'ge'), 2.0e13, 1e-12);
  // il germanio, con un salto più piccolo, ha circa duemila volte più coppie
  between(m.ni(300, 'ge') / m.ni(300), 1500, 2500);
  // a 25 °C il silicio ha un po' meno di 10¹⁰ coppie
  between(m.ni(m.kelvin(25)), 8.0e9, 9.5e9);
});

test('semiconduttori: nᵢ più che raddoppia ogni 10 °C e cresce di mille volte entro i 150 °C', () => {
  const r10 = m.ni(m.kelvin(35)) / m.ni(m.kelvin(25));
  between(r10, 2, 2.4);
  const r125 = m.ni(m.kelvin(150)) / m.ni(m.kelvin(25));
  assert.ok(r125 >= 1000, 'a 150 °C nᵢ è solo ' + r125 + ' volte quella a 25 °C');
  // la sfida "mille" si può vincere dentro la scala del cursore (fino a 250 °C), ma non sotto i 140 °C
  assert.ok(m.ni(m.kelvin(140)) / m.ni(m.kelvin(25)) < 1000);
  // valori di riferimento (Sproul e Green; Misiakos e Tsamakis): circa 10¹² a 100 °C, qualche 10⁶ a −50 °C
  between(m.ni(m.kelvin(100)), 5e11, 2e12);
  between(m.ni(m.kelvin(-50)), 1e6, 1e7);
});

test('semiconduttori: azione di massa n·p = nᵢ² e neutralità di carica, con qualsiasi drogaggio', () => {
  [250, 300, 450].forEach((T) => {
    [[0, 0], [1e15, 0], [0, 1e15], [1e17, 0], [0, 3e12], [2e16, 5e15]].forEach(([Nd, Na]) => {
      const c = m.carriers(T, Nd, Na);
      rel(c.n * c.p, c.ni * c.ni, 1e-9);
      // n + N_A = p + N_D
      const scale = Math.max(c.n, c.p, Nd, Na);
      assert.ok(Math.abs(c.n + Na - c.p - Nd) / scale < 1e-9, 'neutralità violata a ' + T + ' K con ' + Nd + ', ' + Na);
    });
  });
});

test('semiconduttori: nel drogato i maggioritari valgono N, i minoritari nᵢ²/N; scaldando torna intrinseco', () => {
  const n = m.carriers(300, 1e15, 0);
  rel(n.n, 1e15, 1e-6);
  rel(n.p, 1e5, 1e-5);
  const p = m.carriers(300, 0, 1e16);
  rel(p.p, 1e16, 1e-6);
  rel(p.n, 1e4, 1e-5);
  // molto caldo e poco drogato: le coppie del calore superano gli atomi droganti
  const hot = m.crystal(250, 'n', 1e12);
  assert.ok(hot.ni > 1e14);
  rel(hot.n, hot.ni, 0.01);
  rel(hot.p, hot.ni, 0.01);
  // freddo e drogato: meno di un minoritario per cm³ (sfida "rari")
  assert.ok(m.crystal(-50, 'n', 1e15).p < 1);
  assert.ok(m.crystal(25, 'n', 1e18).p > 1, 'a 25 °C i minoritari non scendono sotto 1 per cm³');
});

test('semiconduttori: mobilità di Arora a 300 K, che cala con il drogaggio e con il calore', () => {
  const mu = m.mobility(300, 0);
  between(mu.n, 1320, 1360);
  between(mu.p, 450, 480);
  const mu17 = m.mobility(300, 1e17);
  between(mu17.n, 700, 850);
  between(mu17.p, 290, 360);
  assert.ok(m.mobility(300, 1e18).n < mu17.n && mu17.n < mu.n);
  assert.ok(m.mobility(400, 0).n < mu.n && m.mobility(250, 0).n > mu.n);
});

test('semiconduttori: resistività vicina alle curve di Irvin e al silicio puro', () => {
  // silicio puro a 300 K: 2–4·10⁵ Ω·cm (3,2·10⁵ nella banca dati Ioffe)
  between(m.crystal(26.85, 'puro', 0).rho, 2e5, 4e5);
  // tipo N
  between(m.crystal(26.85, 'n', 1e15).rho, 4.2, 5.2);
  between(m.crystal(26.85, 'n', 1e16).rho, 0.45, 0.56);
  between(m.crystal(26.85, 'n', 1e17).rho, 0.07, 0.095);
  // tipo P: con lo stesso numero di atomi resiste circa tre volte di più
  between(m.crystal(26.85, 'p', 1e15).rho, 12, 15);
  between(m.crystal(26.85, 'p', 1e16).rho, 1.25, 1.6);
  between(m.crystal(26.85, 'p', 1e16).rho / m.crystal(26.85, 'n', 1e16).rho, 2.5, 3.2);
});

test('semiconduttori: un atomo di fosforo ogni 10 milioni abbassa la resistività di centinaia di migliaia di volte', () => {
  const N = m.MAT.si.atoms / 1e7;
  rel(m.atomsPer(N), 1e7, 1e-12);
  const pure = m.crystal(25, 'puro', 0).rho;
  const doped = m.crystal(25, 'n', N).rho;
  between(doped, 0.8, 1.2);
  between(pure / doped, 2e5, 9e5);
  // per scendere sotto 1 Ω·cm serve più boro che fosforo (sfida "boro")
  const below1 = (type) => { let lg = 12; while (m.crystal(25, type, Math.pow(10, lg)).rho >= 1) lg += 0.01; return Math.pow(10, lg); };
  between(below1('p') / below1('n'), 2.2, 3.5);
});

test('semiconduttori: scaldando, il puro conduce sempre meglio; il drogato prima un po\' peggio, poi meglio', () => {
  let prev = Infinity;
  for (let Tc = -50; Tc <= 250; Tc += 10) {
    const r = m.crystal(Tc, 'puro', 0).rho;
    assert.ok(r < prev, 'la resistività del puro non scende a ' + Tc + ' °C');
    prev = r;
  }
  // tipo N 10¹⁶: tra 25 e 150 °C comandano gli atomi droganti, e la mobilità che cala alza un po' ρ
  const r25 = m.crystal(25, 'n', 1e16).rho;
  const r150 = m.crystal(150, 'n', 1e16).rho;
  between(r150 / r25, 1.5, 3);
  // con poco drogante, a 250 °C il calore vince: ρ scende sotto quella a 25 °C
  assert.ok(m.crystal(250, 'n', 1e13).rho < m.crystal(25, 'n', 1e13).rho);
});

test('semiconduttori: la barretta di 1 cm × 1 mm²: R = 100·ρ, I = V/R, deriva v = μ·V/L', () => {
  rel(m.resistance(1), 100, 1e-12);
  const c = m.crystal(25, 'n', 1e15);
  rel(m.current(3, c.rho), 3 / (100 * c.rho), 1e-12);
  // circa 6 mA con 3 V e 10¹⁵ atomi di fosforo; meno di 0,1 µA nel silicio puro
  between(m.current(3, c.rho), 5e-3, 8e-3);
  assert.ok(m.current(3, m.crystal(25, 'puro', 0).rho) < 1e-7);
  // deriva: 1340 cm²/(V·s) con 3 V/cm → circa 40 m/s, molto meno dei 100 km/s dell'agitazione termica
  between(m.drift(1340, 3) / 100, 39, 41);
  // velocità termica media √(3kT/m*) con m* = 0,26 m₀: oltre 100 km/s a 300 K
  const vth = Math.sqrt(3 * 1.380649e-23 * 300 / (0.26 * 9.1093837e-31));
  assert.ok(vth > 1e5);
});

test('semiconduttori: lo stato del laboratorio mette insieme cristallo, corrente, maggioritari e minoritari', () => {
  const n = m.state(25, 'n', 1e15, 3);
  rel(n.I, m.current(3, n.rho), 1e-12);
  assert.strictEqual(n.maj, n.n);
  assert.strictEqual(n.min, n.p);
  const p = m.state(25, 'p', 1e15, -2);
  assert.strictEqual(p.maj, p.p);
  assert.strictEqual(p.min, p.n);
  assert.ok(p.I < 0, 'con la tensione negativa la corrente va verso sinistra');
  // il silicio puro ignora la concentrazione del cursore del drogante
  rel(m.state(25, 'puro', 1e18, 3).rho, m.state(25, 'puro', 1e12, 3).rho, 1e-12);
  // nessun valore impossibile agli estremi dei cursori
  for (const type of ['puro', 'n', 'p']) {
    for (const Tc of [-50, 25, 250]) {
      for (const N of [1e12, 1e18]) {
        for (const V of [-5, 0, 5]) {
          const q = m.state(Tc, type, N, V);
          for (const k of ['ni', 'n', 'p', 'rho', 'I', 'maj', 'min', 'mn', 'mp']) assert.ok(Number.isFinite(q[k]), k + ' non è un numero a ' + [type, Tc, N, V].join(', '));
          assert.ok(q.n > 0 && q.p > 0 && q.rho > 0 && q.mn > 0 && q.mp > 0);
          assert.ok(q.maj >= q.min);
        }
      }
    }
  }
});

test('semiconduttori: ogni sfida si vince con i cursori, e nessuna è già vinta all\'inizio', () => {
  const ids = m.challenges.map((c) => c.id);
  assert.deepStrictEqual(ids, ['mille', 'verso', 'boro', 'rari', 'caldo']);
  // il laboratorio parte da silicio puro, 25 °C, 3 V
  const start = m.state(25, 'puro', 1e15, 3);
  m.challenges.forEach((c) => assert.ok(!c.check(start), 'la sfida ' + c.id + ' è già vinta all\'inizio'));
  // valori raggiungibili con i cursori: −50…250 °C a passi di 1, 10¹²…10¹⁸ cm⁻³ in scala logaritmica, ±5 V a passi di 0,1
  const Ts = [];
  for (let t = -50; t <= 250; t += 5) Ts.push(t);
  const Ns = [];
  for (let k = 0; k <= 1000; k += 25) Ns.push(Number((1e12 * Math.pow(1e6, k / 1000)).toPrecision(3)));
  const Vs = [-5, -0.5, 0, 3, 5];
  const win = (c) => {
    for (const type of ['puro', 'n', 'p']) for (const T of Ts) for (const N of Ns) for (const V of Vs) if (c.check(m.state(T, type, N, V))) return { type: type, T: T, N: N, V: V };
    return null;
  };
  m.challenges.forEach((c) => assert.ok(win(c), 'la sfida ' + c.id + ' non si può vincere'));
  // casi tipici: 150 °C per la sfida "mille"; il boro scende sotto 1 Ω·cm da circa 1,4·10¹⁶ cm⁻³; minoritari sotto 1 a −50 °C
  const by = (id) => m.challenges.find((c) => c.id === id);
  assert.ok(by('mille').check(m.state(150, 'puro', 1e15, 3)) && !by('mille').check(m.state(140, 'puro', 1e15, 3)));
  assert.ok(by('verso').check(m.state(25, 'n', 1e15, -1)) && !by('verso').check(m.state(25, 'p', 1e15, -1)));
  assert.ok(by('boro').check(m.state(25, 'p', 2e16, 3)) && !by('boro').check(m.state(25, 'p', 1e16, 3)));
  assert.ok(by('rari').check(m.state(-50, 'n', 1e15, 3)) && !by('rari').check(m.state(25, 'n', 1e18, 3)));
  assert.ok(by('caldo').check(m.state(250, 'p', 1e14, 3)) && !by('caldo').check(m.state(25, 'p', 1e14, 3)));
});
