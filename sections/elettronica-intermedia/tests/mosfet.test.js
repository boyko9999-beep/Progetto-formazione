// Capitolo 5: modello del MOSFET a canale N (legge quadratica + interruttore low-side).
const test = require('node:test');
const assert = require('node:assert');
const { chapter } = require('./harness.js');

const m = chapter('mosfet').model;
const L = m.DEVICES.logic;
const S = m.DEVICES.std;
const LAMP = m.LOADS.lamp.r;
const MOTOR = m.LOADS.motor.r;
const close = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, a + ' ≠ ' + b);

test('mosfet: sotto la soglia il canale non c\'è e Id = 0', () => {
  assert.strictEqual(m.channel(1.4, 5, L), 0);
  assert.strictEqual(m.channel(L.vth, 5, L), 0);
  assert.strictEqual(m.region(1.4, 5, L), 'off');
  const r = m.solve(3.3, 12, LAMP, S);
  assert.strictEqual(r.region, 'off');
  assert.strictEqual(r.id, 0);
  assert.strictEqual(r.vds, 12);
  assert.strictEqual(r.pd, 0);
});

test('mosfet: in saturazione Id = k/2 · (Vgs − Vth)² e non dipende da Vds', () => {
  close(m.channel(1.7, 5, L), 0.5, 1e-12);
  close(m.saturation(1.9, L), 2, 1e-12);
  close(m.channel(1.9, 3, L), m.channel(1.9, 8, L), 1e-12);
  assert.strictEqual(m.region(1.9, 3, L), 'sat');
});

test('mosfet: zona ohmica e continuità al confine Vds = Vgs − Vth', () => {
  // k · (Vov · Vds − Vds²/2) = 25 · (3,5 · 0,1 − 0,005) = 8,625 A
  close(m.channel(5, 0.1, L), 8.625, 1e-12);
  assert.strictEqual(m.region(5, 0.1, L), 'ohm');
  close(m.channel(3, 1.5, L), m.saturation(3, L), 1e-12);
  close(m.channel(3, 1.5 - 1e-9, L), m.saturation(3, L), 1e-6);
});

test('mosfet: Rds(on) = rd + 1/(k · Vov), coerente con la pendenza a Vds piccola', () => {
  close(m.rdsOn(5, L), 0.023429, 1e-6);
  close(m.rdsOn(10, S), 0.045641, 1e-6);
  assert.strictEqual(m.rdsOn(1, L), Infinity);
  const dv = 1e-5;
  close(dv / m.channel(5, dv, L), m.rdsOn(5, L) - L.rd, 1e-6);
});

test('mosfet: logico a 5 V con la lampada da 24 W: acceso del tutto, meno di 0,1 W', () => {
  const r = m.solve(5, 12, LAMP, L);
  assert.strictEqual(r.region, 'ohm');
  close(r.id, 1.99221, 1e-5);
  close(r.id * LAMP + r.vds, 12, 1e-9);
  close(r.vds, 0.046749, 1e-6);
  close(r.pd, r.id * r.vds, 1e-12);
  close(r.pd, 0.093134, 1e-6);
  assert.ok(r.pd < 0.1);
  close(r.vload, r.id * LAMP, 1e-12);
});

test('mosfet: standard a 4 V resta in saturazione: 0,75 A e 5,6 W di calore', () => {
  const r = m.solve(4, 12, LAMP, S);
  assert.strictEqual(r.region, 'sat');
  close(r.id, 0.75, 1e-12);
  close(r.vds, 7.5, 1e-12);
  close(r.pd, 5.625, 1e-12);
  close(m.junction(r.pd), 25 + 62 * 5.625, 1e-9);
});

test('mosfet: standard a 10 V va bene, a 5 V scalda quasi sei volte più del logico', () => {
  const s10 = m.solve(10, 12, LAMP, S);
  const s5 = m.solve(5, 12, LAMP, S);
  const l5 = m.solve(5, 12, LAMP, L);
  close(s10.id, 1.98487, 1e-5);
  close(s10.pd, 0.18021, 1e-5);
  close(s5.pd, 0.53688, 1e-5);
  assert.ok(s5.pd / l5.pd > 5.5);
  // la soglia del 0,1 W per il logico cade fra 4,5 e 4,55 V
  assert.ok(m.solve(4.5, 12, LAMP, L).pd > 0.1);
  assert.ok(m.solve(4.55, 12, LAMP, L).pd < 0.1);
});

test('mosfet: a 3,3 V il logico comanda il motore, lo standard resta spento', () => {
  const r = m.solve(3.3, 12, MOTOR, L);
  assert.strictEqual(r.region, 'ohm');
  close(r.id, 1.493572, 1e-6);
  assert.ok(r.vload > 11.9);
  close(r.id * MOTOR + r.vds, 12, 1e-9);
  assert.strictEqual(m.solve(3.3, 12, MOTOR, S).region, 'off');
});

test('mosfet: vOn separa la saturazione dalla zona ohmica', () => {
  for (const p of [L, S]) {
    const v = m.vOn(12, LAMP, p);
    assert.strictEqual(m.solve(v - 0.01, 12, LAMP, p).region, 'sat');
    assert.strictEqual(m.solve(v + 0.01, 12, LAMP, p).region, 'ohm');
    close(m.solve(v, 12, LAMP, p).vch, v - p.vth, 1e-6);
  }
  close(m.vOn(12, LAMP, L), 1.8930, 1e-4);
  close(m.vOn(12, LAMP, S), 4.2879, 1e-4);
});

test('mosfet: la soluzione rispetta sempre Kirchhoff e cresce con Vgs', () => {
  for (const p of [L, S]) {
    for (const rl of [LAMP, MOTOR]) {
      let prev = 0;
      for (let v = 0; v <= 10.0001; v += 0.01) {
        const r = m.solve(v, 12, rl, p);
        close(r.id * (rl + p.rd) + r.vch, 12, 1e-9);
        close(r.vds, r.vch + r.id * p.rd, 1e-12);
        assert.ok(r.id >= prev - 1e-12, 'Id cala a Vgs = ' + v);
        assert.ok(r.vch >= -1e-12 && r.id <= 12 / rl + 1e-12);
        prev = r.id;
      }
    }
  }
});

test('mosfet: il gate è un condensatore: τ = Rg · Ciss e la corrente si spegne', () => {
  const tau = m.tau(m.RG, L.ciss);
  close(tau, 374e-9, 1e-15);
  close(m.gateVoltage(0, 5, tau, tau) / 5, 1 - Math.exp(-1), 1e-12);
  close(m.gateVoltage(0, 5, 5 * tau, tau) / 5, 0.99326, 1e-5);
  close(m.gateVoltage(5, 0, tau, tau), 5 * Math.exp(-1), 1e-12);
  close(m.gateCurrent(5, 0, m.RG), 0.0227273, 1e-7);
  close(m.gateCurrent(5, m.gateVoltage(0, 5, 30 * tau, tau), m.RG), 0, 1e-12);
  // I = C · dV/dt: la pendenza iniziale 5 V/τ dà la stessa corrente V/R
  close(m.displacement(L.ciss, 5, tau), m.gateCurrent(5, 0, m.RG), 1e-12);
  close(m.gateCharge(L.ciss, 5), 8.5e-9, 1e-18);
});

test('mosfet: profilo del canale: pieno al source, strozzato al drain in saturazione', () => {
  close(m.channelProfile(0, 0.02, 3.5), 1, 1e-12);
  assert.ok(m.channelProfile(1, 0.02, 3.5) > 0.99);
  close(m.channelProfile(1, 5, 0.25), 0, 1e-12);
  close(m.channelProfile(0.5, 5, 0.25), Math.SQRT1_2, 1e-12);
  assert.strictEqual(m.channelProfile(0.5, 1, 0), 0);
});

test('mosfet: P = I² · R e temperatura di giunzione senza dissipatore', () => {
  close(m.power(2, 0.025), 0.1, 1e-12);
  close(m.junction(1), 87, 1e-12);
  close(m.junction(0.1), 31.2, 1e-12);
  close(m.junction(2, 40, 30), 110, 1e-12);
});

test('mosfet: le sfide si possono completare con i passi del cursore (0,05 V)', () => {
  const grid = [];
  for (let k = 0; k <= 200; k++) grid.push(Math.round(k * 5) / 100);
  for (const p of [L, S]) {
    // soglia: almeno 10 mA entro 0,25 V sopra Vth
    assert.ok(grid.some((v) => v <= p.vth + 0.25 && m.solve(v, 12, LAMP, p).id >= 0.01), 'soglia irraggiungibile');
    // a metà strada, in saturazione, con la lampada si superano i 5 W
    assert.ok(grid.some((v) => { const r = m.solve(v, 12, LAMP, p); return r.region === 'sat' && r.pd > 5; }), 'calore oltre 5 W irraggiungibile');
  }
  // meno di 0,1 W con 2 A: solo il MOSFET logico ci riesce, anche a 10 V lo standard scalda di più
  assert.ok(grid.some((v) => { const r = m.solve(v, 12, LAMP, L); return r.id >= 1.9 && r.pd < 0.1; }));
  assert.ok(!grid.some((v) => { const r = m.solve(v, 12, LAMP, S); return r.id >= 1.9 && r.pd < 0.1; }));
});
