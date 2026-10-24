// Capitolo 4: modello del transistor bipolare (giunzione base-emettitore, zona attiva, saturazione, guadagno).
const test = require('node:test');
const assert = require('node:assert');
const { EI, chapter } = require('./harness.js');

const m = chapter('bjt').model;
const close = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, a + ' ≠ ' + b);

// I due circuiti del laboratorio: lampada da 12 V e 1,2 W (120 Ω) e amplificatore con Rc = 2,2 kΩ.
const lampada = (rb, beta) => ({ rb: rb, beta: beta, vcc: 12, rc: 120 });
const amplif = (rb, beta) => ({ rb: rb, beta: beta || 150, vcc: 12, rc: 2200 });

test('bjt: Vbe ≈ 0,65 V a 1 mA e sale di circa 60 mV per decade di corrente', () => {
  close(m.vbe(1e-3), 0.6547, 1e-3);
  close(m.vbe(100e-3) - m.vbe(1e-3), 2 * m.VT * Math.log(10), 1e-9);
  close(m.VT * Math.log(10), 0.0595, 1e-3);
});

test('bjt: la corrente di base soddisfa Vin = Rb · Ib + Vbe (5 V, 4,7 kΩ, β = 150 → 0,90 mA)', () => {
  const ib = m.baseCurrent(5, 4700, 150);
  close(ib, 0.8976e-3, 2e-6);
  close(4700 * ib + m.vbe(150 * ib), 5, 1e-9);
  assert.strictEqual(m.baseCurrent(0, 4700, 150), 0);
  assert.strictEqual(m.baseCurrent(-1, 4700, 150), 0);
});

test('bjt: in zona attiva Ic = β · Ib, Ie = Ic + Ib e Vce = Vcc − Ic · Rc', () => {
  const c = lampada(2200, 150);
  const q = m.operating(1.2, c);
  assert.strictEqual(q.region, 'att');
  close(q.ic, 150 * q.ib, 1e-15);
  close(q.ie, q.ic + q.ib, 1e-15);
  close(q.vce, 12 - q.ic * 120, 1e-12);
  close(q.ic, 31.1e-3, 0.3e-3);
  close(q.vbe, 0.744, 0.003);
});

test('bjt: in saturazione Ic = (Vcc − 0,2 V) / Rc e il rapporto Ic / Ib scende sotto β', () => {
  const q = m.operating(5, lampada(1000, 150));
  assert.strictEqual(q.region, 'sat');
  close(q.ic, 11.8 / 120, 1e-12);
  close(q.ic, 0.09833, 1e-5);
  assert.strictEqual(q.vce, 0.2);
  assert.ok(q.ic / q.ib < 30, 'β forzato ' + q.ic / q.ib);
  close(m.icSat(12, 120), 0.098333, 1e-6);
});

test('bjt: con 0,3 V sulla base il transistor è in interdizione', () => {
  const q = m.operating(0.3, lampada(2200, 150));
  assert.strictEqual(q.region, 'off');
  assert.ok(q.ic < 1e-6, 'Ic = ' + q.ic);
  close(q.vce, 12, 1e-4);
  // la soglia di conduzione è intorno a 0,6–0,7 V
  const von = m.vinFor(0.01 * m.icSat(12, 120), 2200, 150);
  assert.ok(von > 0.6 && von < 0.75, 'soglia ' + von);
});

test('bjt: vinFor è l\'inverso del punto di lavoro in zona attiva', () => {
  const c = amplif(15000);
  for (const ic of [0.5e-3, 1e-3, 2.7e-3, 4e-3]) {
    close(m.operating(m.vinFor(ic, c.rb, c.beta), c).ic, ic, ic * 1e-9);
  }
});

test('bjt: guadagno a emettitore comune Av = −β · Rc / (Rb + rπ) ≈ −20 (β 150, Rc 2,2 kΩ, Rb 15 kΩ, Ic 2,7 mA)', () => {
  const c = amplif(15000);
  const vin = m.vinFor(2.7e-3, c.rb, c.beta);
  close(m.rpi(2.7e-3, 150), 1436, 1);
  const av = m.gain(vin, c);
  close(av, -150 * 2200 / (15000 + m.rpi(2.7e-3, 150)), 0.01);
  close(av, -20.08, 0.05);
  // coincide con la pendenza della curva Vce(Vin)
  const h = 1e-5;
  const slope = (m.operating(vin + h, c).vce - m.operating(vin - h, c).vce) / (2 * h);
  close(slope, av, Math.abs(av) * 2e-3);
  // fuori dalla zona attiva il piccolo segnale non passa
  assert.strictEqual(m.gain(0.3, c), 0);
  assert.strictEqual(m.gain(3, c), 0);
});

test('bjt: piccolo segnale amplificato senza tosatura, segnale grande tosato da entrambe le parti', () => {
  const c = amplif(15000);
  const vq = m.vinFor(VQ(c), c.rb, c.beta);
  const small = m.cycle(vq, 0.05, c, 96);
  assert.ok(!small.clipTop && !small.clipBottom);
  close(small.q.vce, 6, 0.01);
  close(small.gain, Math.abs(m.gain(vq, c)), 0.6);
  assert.ok(small.asym < 0.05, 'asimmetria ' + small.asym);
  const big = m.cycle(vq, 0.5, c, 96);
  assert.ok(big.clipTop && big.clipBottom);
  close(big.min, 0.2, 1e-12);
  assert.ok(big.max <= 12 && big.max > 11.8);
  close(big.gain, 11.8, 0.01); // l'uscita non può superare 12 − 0,2 V picco-picco
  assert.ok(big.gain < 0.7 * small.gain, 'la tosatura abbassa il guadagno misurato');
});
function VQ(c) { return (c.vcc / 2) / c.rc; } // Ic che mette Q a metà della retta di carico

test('bjt: da interruttore il transistor saturo scalda pochissimo, a metà retta di carico molto', () => {
  const sat = m.operating(5, lampada(1000, 150));
  close(m.lampPower(sat.ic, 120), 1.160, 0.001);
  close(sat.pd, 0.2 * 0.09833, 1e-5);
  const mid = m.operating(m.vinFor(0.05, 2200, 150), lampada(2200, 150));
  close(mid.vce, 6, 1e-6);
  close(mid.pd, 0.3, 1e-6);
  assert.ok(sat.pd < mid.pd / 10);
});

test('bjt: con il piedino a 5 V, meno di 1 mA di base saturano la lampada solo se β è abbastanza alto', () => {
  const rbs = EI.seriesValues('E12', 470, 100000);
  const ok = (beta) => rbs.filter((rb) => {
    const q = m.operating(5, lampada(rb, beta));
    return q.region === 'sat' && q.ib < 1e-3;
  });
  assert.deepStrictEqual(ok(150), [4700, 5600]);
  assert.deepStrictEqual(ok(100), []);
  assert.ok(ok(300).length >= 4);
});

test('bjt: con i valori di partenza (Rb 22 kΩ, β 150) Q è alto e il guadagno non arriva a 18; con Rb 15 kΩ a metà retta sì', () => {
  const c22 = amplif(22000);
  assert.ok(m.operating(0.8, c22).vce > 9, 'a Vpol = 0,8 V il punto di lavoro sta in alto sulla retta di carico');
  let best = 0;
  for (let vce = 0.5; vce <= 11.5; vce += 0.25) {
    const ic = (12 - vce) / 2200;
    best = Math.max(best, Math.abs(m.gain(m.vinFor(ic, c22.rb, c22.beta), c22)));
  }
  assert.ok(best < 15, 'guadagno massimo ' + best); // β · Rc / Rb = 15 è il limite
  const c15 = amplif(15000);
  const g = Math.abs(m.gain(m.vinFor(VQ(c15), c15.rb, c15.beta), c15));
  assert.ok(g >= 18 && g <= 22, 'guadagno ' + g);
});
