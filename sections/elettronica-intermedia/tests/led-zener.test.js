// Capitolo 3: modelli del LED e del diodo Zener, punto di lavoro del circuito in serie e del regolatore.
const test = require('node:test');
const assert = require('node:assert');
const { chapter } = require('./harness.js');

const m = chapter('led-zener').model;
const close = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, a + ' ≠ ' + b);

test('led-zener: energia del fotone e lunghezza d\'onda, λ ≈ 1240 / E', () => {
  close(m.photonEnergy(620), 2.0, 0.001); // rosso: 2,0 eV
  close(m.wavelength(1.42), 873, 1); // arseniuro di gallio: infrarosso
  close(m.wavelength(1.12), 1107, 1); // silicio: infrarosso, oltre i 1100 nm
  close(m.wavelength(m.photonEnergy(470)), 470, 1e-9);
});

test('led-zener: la tensione diretta a 20 mA è quella del catalogo e cresce con l\'energia del fotone', () => {
  for (const k of Object.keys(m.LEDS)) close(m.ledV(k, 0.02), m.LEDS[k].vf, 1e-9);
  close(m.ledV('rosso', 0.02), 2.0, 1e-9);
  const order = ['rosso', 'giallo', 'verde', 'blu'];
  for (let k = 1; k < order.length; k++) {
    assert.ok(m.photonEnergy(m.LEDS[order[k]].nm) > m.photonEnergy(m.LEDS[order[k - 1]].nm));
    assert.ok(m.ledV(order[k], 0.02) > m.ledV(order[k - 1], 0.02), order[k] + ' deve chiedere più tensione');
  }
  // Vf vicina all'energia del fotone in volt: rosso entro 0,1 V, blu entro qualche decimo
  assert.ok(Math.abs(m.ledV('rosso', 0.02) - m.photonEnergy(625)) < 0.1);
  assert.ok(m.ledV('blu', 0.02) - m.photonEnergy(470) < 0.6);
});

test('led-zener: curva I-V esponenziale, iAt è l\'inversa di vAt', () => {
  const j = m.led('rosso');
  for (const i of [1e-9, 1e-6, 1e-3, 0.02, 0.05]) close(m.iAt(j, m.vAt(j, i)) / i, 1, 1e-6);
  // sotto soglia ogni 60 mV circa in più (n = 2) la corrente cresce di 10 volte
  const v1 = m.ledV('rosso', 1e-5);
  const v2 = m.ledV('rosso', 1e-4);
  close(v2 - v1, 2 * m.VT * Math.LN10, 0.002);
  assert.strictEqual(m.ledI('rosso', 0), 0);
});

test('led-zener: R = (Vs − Vf)/I e il valore E12 per 15 mA da 5 V', () => {
  close(m.resistorFor(5, 2, 0.015), 200, 1e-9);
  assert.strictEqual(m.nextE12(200), 220);
  assert.strictEqual(m.nextE12(220), 220);
  assert.strictEqual(m.nextE12(1000), 1000);
  const p220 = m.ledPoint('rosso', 5, 220);
  const p180 = m.ledPoint('rosso', 5, 180);
  assert.ok(p220.i > 0.0135 && p220.i < 0.015, 'con 220 Ω circa 14 mA: ' + p220.i);
  assert.ok(p180.i > 0.0165, 'con 180 Ω si superano i 16,5 mA: ' + p180.i);
});

test('led-zener: il punto di lavoro rispetta la legge di Kirchhoff, Vs = R·I + Vf', () => {
  for (const [k, vs, r] of [['rosso', 5, 330], ['blu', 9, 470], ['bianco', 12, 47], ['giallo', 2.2, 1000]]) {
    const p = m.ledPoint(k, vs, r);
    close(r * p.i + p.v, vs, 1e-9);
    close(m.ledV(k, p.i), p.v, 1e-12);
  }
  assert.deepStrictEqual(m.ledPoint('rosso', 0, 220), { i: 0, v: 0, vr: 0 });
});

test('led-zener: con 2,5 V il rosso si accende, il blu resta spento', () => {
  assert.ok(m.ledPoint('rosso', 2.5, 220).i > 0.001);
  assert.ok(m.ledPoint('blu', 2.5, 220).i < 1e-4);
  assert.ok(m.ledPoint('blu', 2.5, 47).i < 1e-4);
  // e con 12 V senza abbastanza resistenza si supera il massimo di 30 mA
  assert.ok(m.ledPoint('rosso', 12, 220).i > m.I_MAX);
});

test('led-zener: lo Zener vale Vz a 5 mA e sopra il ginocchio la tensione cambia poco', () => {
  for (const k of Object.keys(m.ZENERS)) close(m.zenerV(k, 0.005), m.ZENERS[k].vz, 1e-9);
  // resistenza dinamica a 5 mA: il 3,3 V (effetto Zener) è molto più morbido del 9,1 V (valanga)
  const rz = (k) => (m.zenerV(k, 0.0055) - m.zenerV(k, 0.0045)) / 0.001;
  assert.ok(rz('3.3') > 3 * rz('9.1'));
  assert.ok(rz('9.1') > 5 && rz('9.1') < 20);
  close(m.zenerImax('5.1'), 0.098, 0.001);
});

test('led-zener: regolatore sotto e sopra la tensione di Zener', () => {
  // sotto il ginocchio Rs e RL fanno da partitore
  const low = m.zenerPoint('5.1', 3, 470, 1000);
  close(low.vout, 3 * 1000 / 1470, 0.002);
  assert.ok(low.iz < 1e-6);
  // sopra, l'uscita resta vicina a 5,1 V e la corrente si divide tra Zener e carico
  const p = m.zenerPoint('5.1', 12, 470, 1000);
  assert.ok(p.vout > 5 && p.vout < 5.25, 'Vout = ' + p.vout);
  close(p.iin, (12 - p.vout) / 470, 1e-9);
  close(p.iin, p.iz + p.il, 1e-12);
  close(p.pz, p.vout * p.iz, 1e-12);
  // senza carico tutta la corrente va nello Zener
  const nl = m.zenerPoint('5.1', 12, 470, Infinity);
  assert.strictEqual(nl.il, 0);
  close(nl.iz, (12 - nl.vout) / 470, 1e-9);
});

test('led-zener: le sfide dello Zener da 5,1 V hanno soluzione', () => {
  const dv = (rs, rl) => Math.abs(m.zenerPoint('5.1', 15, rs, rl).vout - m.zenerPoint('5.1', 8, rs, rl).vout);
  assert.ok(dv(470, 1000) > 0.1, 'con i valori iniziali la variazione è grande');
  assert.ok(dv(2200, Infinity) <= 0.1, 'con Rs grande e senza carico resta sotto 0,1 V');
  // potenza a 20 V senza carico: 150 Ω è troppo poco, 180 Ω basta
  assert.ok(m.zenerPoint('5.1', 20, 150, Infinity).pz > m.PZ_MAX);
  assert.ok(m.zenerPoint('5.1', 20, 180, Infinity).pz <= m.PZ_MAX);
});
