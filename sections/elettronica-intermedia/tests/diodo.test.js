// Capitolo 2: modello della giunzione P-N e del diodo (Shockley, barriera, zona di svuotamento, circuito in serie).
const test = require('node:test');
const assert = require('node:assert');
const { EI, chapter } = require('./harness.js');

const m = chapter('diodo').model;
const SI = m.MATERIALS.si;
const GE = m.MATERIALS.ge;
const T25 = m.kelvin(25);
const close = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, a + ' ≠ ' + b);
const rel = (a, b, tol) => assert.ok(Math.abs(a / b - 1) <= tol, a + ' non è entro il ' + tol * 100 + '% di ' + b);
const between = (x, lo, hi) => assert.ok(x >= lo && x <= hi, x + ' non è tra ' + lo + ' e ' + hi);
const um = (cm) => cm * 1e4;

test('diodo: VT = kT/q vale 25,85 mV a 300 K e 25,69 mV a 25 °C', () => {
  close(m.vt(300), 0.0258520, 1e-6);
  close(m.vt(T25), 0.0256926, 1e-6);
  close(m.kelvin(0), 273.15, 1e-12);
});

test('diodo: barriera di potenziale con N_A = N_D = 10¹⁶ cm⁻³: circa 0,71 V nel silicio e 0,32 V nel germanio', () => {
  // a 300 K: VT · ln(10³² / nᵢ²)
  close(m.vbi(SI, 300), 0.025852 * Math.log(1e32 / 1e20), 1e-5);
  between(m.vbi(SI, 300), 0.70, 0.73);
  between(m.vbi(GE, 300), 0.30, 0.34);
  // più drogaggio, barriera più alta; più calore, barriera più bassa
  assert.ok(m.vbi(SI, 300, 1e18, 1e18) > m.vbi(SI, 300));
  assert.ok(m.vbi(SI, m.kelvin(100)) < m.vbi(SI, T25));
  // nᵢ a 300 K è il valore di riferimento del materiale
  rel(m.ni(SI, 300), 1e10, 1e-12);
  rel(m.ni(GE, 300), 2e13, 1e-12);
});

test('diodo: la zona di svuotamento è larga 0,43 µm a riposo e cresce con √(Vbi − V)', () => {
  const W0 = um(m.width(SI, 300, 0));
  close(W0, 0.430, 0.005);
  between(um(m.width(GE, 300, 0)), 0.32, 0.35);
  // per raddoppiarla serve una barriera quattro volte più alta: V = −3·Vbi
  const vbi = m.vbi(SI, T25);
  rel(m.width(SI, T25, -3 * vbi), 2 * m.width(SI, T25, 0), 1e-12);
  // a −5 V nel silicio a 25 °C: circa 1,2 µm
  close(um(m.width(SI, T25, -5)), 1.216, 0.005);
  // in diretta si stringe, ma la versione limitata non arriva mai a zero
  assert.ok(m.width(SI, T25, 0.5) < m.width(SI, T25, 0));
  rel(m.widthClamped(SI, T25, 2), Math.sqrt(0.05) * m.width(SI, T25, 0), 1e-9);
  assert.ok(m.widthClamped(SI, T25, 0.3) === m.width(SI, T25, 0.3));
});

test('diodo: equazione di Shockley e la sua inversa', () => {
  const Is = m.isat(SI, T25);
  rel(Is, SI.Is, 1e-12); // a 25 °C vale il parametro del diodo
  assert.strictEqual(m.shockley(0, Is, SI.n, T25), 0);
  // in inversa resta soltanto −Is
  rel(m.shockley(-5, Is, SI.n, T25), -Is, 1e-12);
  rel(m.shockley(-0.5, Is, SI.n, T25), -Is, 1e-4);
  // 1 mA a 0,60 V e 10 mA a 0,70 V: ogni n·VT·ln 10 ≈ 0,1 V la corrente ×10
  close(m.voltageAt(1e-3, Is, SI.n, T25), 0.6034, 5e-4);
  close(m.voltageAt(10e-3, Is, SI.n, T25), 0.7040, 5e-4);
  close(m.voltageAt(10e-3, Is, SI.n, T25) - m.voltageAt(1e-3, Is, SI.n, T25), SI.n * m.vt(T25) * Math.LN10, 1e-6);
  [1e-9, 1e-6, 1e-3, 0.1, -0.5e-9].forEach((I) => rel(m.shockley(m.voltageAt(I, Is, SI.n, T25), Is, SI.n, T25), I, 1e-9));
});

test('diodo: il germanio conduce prima del silicio', () => {
  const vSi = m.voltageAt(1e-3, m.isat(SI, T25), SI.n, T25);
  const vGe = m.voltageAt(1e-3, m.isat(GE, T25), GE.n, T25);
  close(vGe, 0.231, 0.002);
  assert.ok(vSi - vGe > 0.3, 'tra silicio e germanio ci sono solo ' + (vSi - vGe) + ' V');
  rel(m.isat(GE, T25) / m.isat(SI, T25), 1000, 1e-12);
  // a 0,3 V il germanio porta milliampere, il silicio meno di un microampere
  assert.ok(m.shockley(0.3, m.isat(GE, T25), GE.n, T25) > 1e-3);
  assert.ok(m.shockley(0.3, m.isat(SI, T25), SI.n, T25) < 1e-6);
});

test('diodo: circuito in serie in diretta (5 V, 1 kΩ): 0,667 V sul diodo e 4,33 mA', () => {
  const Is = m.isat(SI, T25);
  const op = m.solve(5, 1000, Is, SI.n, T25);
  close(op.V, 0.6675, 1e-3);
  close(op.I, 4.33e-3, 2e-5);
  // la legge delle maglie e l'equazione del diodo valgono insieme
  close(5 - op.V - op.I * 1000, 0, 1e-9);
  rel(op.I, m.shockley(op.V, Is, SI.n, T25), 1e-9);
  // senza generatore niente corrente
  assert.deepStrictEqual(m.solve(0, 1000, Is, SI.n, T25), { V: 0, I: 0 });
});

test('diodo: circuito in serie in inversa (−5 V): passa solo −Is e tutta la tensione resta sul diodo', () => {
  const Is = m.isat(SI, T25);
  const op = m.solve(-5, 220, Is, SI.n, T25);
  rel(op.I, -Is, 1e-9);
  close(op.V, -5, 1e-6);
  close(-5 - op.V - op.I * 220, 0, 1e-12);
  // nel germanio la corrente inversa è mille volte più grande, ma resta di microampere
  const ge = m.solve(-5, 220, m.isat(GE, T25), GE.n, T25);
  rel(ge.I, -GE.Is, 1e-6);
});

test('diodo: il punto di lavoro è sempre esatto e cresce con la tensione del generatore', () => {
  [SI, GE].forEach((mat) => {
    [0, 25, 100].forEach((Tc) => {
      const T = m.kelvin(Tc);
      const Is = m.isat(mat, T);
      [47, 220, 1000, 10000].forEach((R) => {
        let prev = null;
        for (let k = -500; k <= 200; k++) {
          const Vs = k / 100;
          const op = m.solve(Vs, R, Is, mat.n, T);
          const I = m.shockley(op.V, Is, mat.n, T);
          // la stessa corrente sulla resistenza e nel diodo
          assert.ok(Math.abs(op.I - I) <= 1e-9 * Math.abs(I) + 1e-18, mat.id + ' ' + Tc + ' °C, ' + R + ' Ω, ' + Vs + ' V: ' + op.I + ' ≠ ' + I);
          assert.ok(Math.abs(Vs - op.V - op.I * R) <= 1e-9, 'maglia non chiusa a ' + Vs + ' V');
          // il diodo prende al massimo la tensione del generatore, e mai di segno opposto
          assert.ok(Vs >= 0 ? op.V >= 0 && op.V <= Vs : op.V <= 0 && op.V >= Vs);
          if (prev) {
            assert.ok(op.I >= prev.I - 1e-15, 'la corrente cala tra ' + (Vs - 0.01) + ' e ' + Vs + ' V');
            assert.ok(op.V >= prev.V - 1e-12, 'la tensione sul diodo cala a ' + Vs + ' V');
          }
          prev = op;
        }
      });
    });
  });
});

test('diodo: scaldando, la tensione diretta scende di circa 2 mV per grado e la corrente inversa esplode', () => {
  const v = (Tc) => { const T = m.kelvin(Tc); return m.voltageAt(1e-3, m.isat(SI, T), SI.n, T); };
  const tc = (v(35) - v(15)) / 20;
  between(tc * 1000, -2.3, -1.6);
  // teoria: dV/dT = (V − Eg − 3kT/q) / T
  close(tc, (v(25) - SI.Eg - 3 * m.vt(T25)) / T25, 5e-5);
  // tra 25 e 100 °C la corrente di saturazione cresce più di cento volte
  assert.ok(m.isat(SI, m.kelvin(100)) / m.isat(SI, T25) > 100);
  assert.ok(m.isat(SI, m.kelvin(0)) < m.isat(SI, T25));
});

test('diodo: lo stato riassume il punto di lavoro (barriera, larghezza, soglia)', () => {
  const rest = m.state(SI, 0, 220, 25);
  assert.strictEqual(rest.I, 0);
  rel(rest.barrier, rest.vbi, 1e-12);
  rel(rest.W, rest.W0, 1e-12);
  close(rest.soglia, 0.6034, 5e-4);
  const fwd = m.state(SI, 2, 47, 25);
  assert.ok(fwd.V > 0.7 && fwd.I > 0.02);
  // la barriera disegnata non scende sotto il 5% e la zona non sparisce
  rel(fwd.barrier, 0.05 * fwd.vbi, 1e-12);
  assert.ok(fwd.W > 0 && fwd.W < rest.W);
  const rev = m.state(SI, -5, 220, 25);
  close(rev.W, 1.216, 0.005);
  close(rev.barrier, rev.vbi + 5, 1e-6);
});

test('diodo: ogni sfida si può vincere con i valori dei cursori', () => {
  const Rs = EI.seriesValues('E12', 47, 10000);
  const Vs = [];
  for (let k = -500; k <= 200; k++) Vs.push(k / 100);
  const find = (mat, Tc, ok) => {
    for (const R of Rs) for (const v of Vs) { const q = m.state(mat, v, R, Tc); if (ok(q, v, R)) return { R: R, Vs: v, q: q }; }
    return null;
  };
  // 10 mA (±0,5 mA): per esempio 1,70 V su 100 Ω
  const ten = find(SI, 25, (q) => q.I >= 9.5e-3 && q.I <= 10.5e-3);
  assert.ok(ten);
  const q100 = m.state(SI, 1.7, 100, 25);
  between(q100.I, 9.5e-3, 10.5e-3);
  close(q100.V, 0.70, 0.01);
  // germanio oltre 1 mA mentre il silicio, nello stesso circuito, resta sotto 0,1 mA
  const ge = find(GE, 25, (q, v, R) => q.I >= 1e-3 && m.state(SI, v, R, 25).I < 1e-4);
  assert.ok(ge, 'nessuna combinazione per la sfida del germanio');
  assert.ok(m.state(GE, 0.4, 47, 25).I >= 1e-3 && m.state(SI, 0.4, 47, 25).I < 1e-4);
  // zona più che doppia: serve V sotto −3·Vbi ≈ −2,15 V
  assert.ok(m.state(SI, -2.2, 220, 25).W > 2 * m.state(SI, -2.2, 220, 25).W0);
  assert.ok(!(m.state(SI, -2.1, 220, 25).W > 2 * m.state(SI, -2.1, 220, 25).W0));
  // 1 mA con meno di 0,55 V nel silicio: impossibile a 25 °C, possibile scaldando
  assert.strictEqual(find(SI, 25, (q) => q.I >= 1e-3 && q.V < 0.55), null);
  assert.ok(find(SI, 100, (q) => q.I >= 1e-3 && q.V < 0.55));
});
