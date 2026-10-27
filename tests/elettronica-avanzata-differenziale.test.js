// Modello del capitolo 3 (segnali differenziali, CMRR, diagramma a occhio e BER): node --test tests/elettronica-avanzata*.test.js
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./elettronica-avanzata.load.js');

const M = load().chapter('differenziale').model;

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg ? msg + ': ' : '') + a + ' invece di ' + b);
const rel = (a, b, tol, msg) => near(a, b, Math.abs(b) * tol, msg);

// Collegamento ideale da 1 Gbit/s: banda larga, niente rumore, jitter o disturbi.
const LINK = { mode: 'diff', rate: 1e9, f3: 20e9, sigma: 0, rj: 0, cm: 0, imb: 0, eq: false };
const sim = (p, n, seed) => M.simulate(Object.assign({}, LINK, p), n || 1500, seed == null ? 3 : seed).stats;

test('PRBS7: periodo di 127 bit, 64 uni, al massimo 7 uni e 6 zeri di fila', () => {
  const b = Array.from(M.prbs7(127 * 3));
  const one = b.slice(0, 127).join('');
  assert.strictEqual(b.slice(127, 254).join(''), one, 'la sequenza si ripete dopo 127 bit');
  for (const p of [1, 7, 63, 126]) assert.notStrictEqual(b.slice(p, p + 127).join(''), one, 'periodo più corto: ' + p);
  assert.strictEqual(b.slice(0, 127).filter((x) => x).length, 64, 'uni in un periodo');
  // corse più lunghe, guardando due periodi per non spezzarle al bordo
  let run = 0;
  let last = -1;
  const longest = [0, 0];
  for (const x of b) { run = x === last ? run + 1 : 1; last = x; longest[x] = Math.max(longest[x], run); }
  assert.deepStrictEqual(longest, [6, 7]);
  // polinomio x⁷ + x⁶ + 1: ogni bit è lo XOR di quelli di 6 e 7 passi prima
  for (let n = 7; n < b.length; n++) assert.strictEqual(b[n], b[n - 6] ^ b[n - 7], 'bit ' + n);
});

test('differenza e modo comune: i livelli LVDS e un disturbo uguale sui due fili', () => {
  const lv = M.diffCm(1.375, 1.025);
  near(lv.vd, 0.35, 1e-12, 'Vd');
  near(lv.vcm, 1.2, 1e-12, 'Vcm');
  // lo stesso disturbo su entrambi i fili sposta solo il modo comune
  const dist = M.diffCm(1.375 + 0.8, 1.025 + 0.8);
  near(dist.vd, lv.vd, 1e-12, 'Vd con il disturbo');
  near(dist.vcm, 2.0, 1e-12, 'Vcm con il disturbo');
  // e i due fili si ricostruiscono come Vcm ± Vd/2
  near(lv.vcm + lv.vd / 2, 1.375, 1e-12);
  near(lv.vcm - lv.vd / 2, 1.025, 1e-12);
});

test('CMRR: 80 dB sono un rapporto di 10 000, e 1 V di modo comune pesa come 0,1 mV', () => {
  near(M.cmrrDb(10000, 1), 80, 1e-9);
  near(M.cmrrDb(1, 1), 0, 1e-12);
  near(M.cmToDiff(1, 80), 1e-4, 1e-12);
  near(M.cmToDiff(0.3, 40), 3e-3, 1e-12);
  // uno sbilanciamento dell'1% tra i fili equivale a un CMRR di 40 dB; nessuno sbilanciamento, CMRR infinito
  near(M.imbalanceCmrr(0.01), 40, 1e-9);
  near(M.imbalanceCmrr(0.1), 20, 1e-9);
  assert.strictEqual(M.imbalanceCmrr(0), Infinity);
});

test('BER = ½·erfc(Q/√2): i valori di riferimento del fattore Q', () => {
  near(M.erfc(0), 1, 1e-6);
  near(M.erfc(1), 0.157299, 1e-6);
  near(M.erfc(-1), 2 - 0.157299, 1e-6);
  rel(M.berFromQ(3), 1.35e-3, 0.01, 'Q = 3');
  rel(M.berFromQ(6), 9.87e-10, 0.01, 'Q = 6');
  rel(M.berFromQ(7), 1.28e-12, 0.01, 'Q = 7');
  near(M.berFromQ(0), 0.5, 1e-6, 'Q = 0: si tira a indovinare');
  near(M.qFromBer(1e-12), 7.03, 0.01, 'BER 10⁻¹²');
  near(M.qFromBer(1e-15), 7.94, 0.01, 'BER 10⁻¹⁵');
  for (const q of [1, 2.5, 4.75, 9]) near(M.qFromBer(M.berFromQ(q)), q, 1e-6, 'andata e ritorno a Q = ' + q);
  // Q da medie e deviazioni standard: ±350 mV con 50 mV di rumore per livello
  near(M.qFactor(0.35, -0.35, 0.05, 0.05), 7, 1e-12);
});

test('intervallo unitario e frequenza di Nyquist', () => {
  near(M.unitInterval(1e10), 100e-12, 1e-24, '10 Gbit/s');
  near(M.unitInterval(2.5e9), 400e-12, 1e-24, '2,5 Gbit/s');
  near(M.nyquist(1e10), 5e9, 1e-3, 'Nyquist a 10 Gbit/s');
});

test('canale a due poli: −3 dB alla banda, gradino che arriva a 1, area del bit conservata', () => {
  near(M.lossDb(1e9, 1e9), 3.0103, 1e-4, 'perdita alla frequenza di taglio');
  assert.ok(M.lossDb(5e9, 2.5e9) > M.lossDb(2.5e9, 2.5e9), 'la perdita cresce con la frequenza');
  near(M.lossDb(0, 1e9), 0, 1e-12, 'in continua nessuna perdita');
  const tau = M.tauFor(0.5);
  near(M.stepResponse(0, tau), 0, 1e-12);
  near(M.stepResponse(40 * tau, tau), 1, 1e-12);
  // l'area di un bit isolato è la stessa prima e dopo il canale (il canale non perde la continua)
  const area = (c1) => { let s = 0; for (let t = -1; t < 30; t += 1e-3) s += M.pulse(t, 1, tau, c1) * 1e-3; return s; };
  near(area(0), 1, 1e-3, 'senza equalizzazione');
  near(area(-0.2), 0.6, 1e-3, 'con c₁ = −0,2: c₀ + c₁ = 0,8 − 0,2');
  // de-enfasi: i bit ripetuti rispetto alle transizioni, 20·log10(1 − 2|c₁|)
  near(M.deemphasisDb(-0.166), -3.5, 0.01, 'la de-enfasi di PCI Express 1.0');
  near(M.deemphasisDb(-0.25), -6.02, 0.01);
});

test('interferenza intersimbolica: nasce con un canale stretto e la FFE la riduce', () => {
  const wide = M.cursors(1, M.tauFor(20), 0);
  near(wide.main, 1, 1e-3, 'bit pieno con un canale largo');
  near(wide.isi, 0, 1e-3, 'niente ISI con un canale largo');
  assert.strictEqual(M.bestTap(1, M.tauFor(20)), 0, 'con un canale largo la presa resta a zero');
  const tau = M.tauFor(0.2); // banda pari a un quinto del bit rate
  const raw = M.cursors(1, tau, 0);
  assert.ok(raw.main < 0.7 && raw.isi > 0.3, 'canale stretto: main ' + raw.main + ', ISI ' + raw.isi);
  const c1 = M.bestTap(1, tau);
  assert.ok(c1 < 0 && c1 >= -0.4, 'presa negativa (de-enfasi): ' + c1);
  const eq = M.cursors(1, tau, c1);
  assert.ok(eq.isi < raw.isi, 'la FFE riduce l\'ISI');
  assert.ok(eq.open > 2 * raw.open, 'e apre l\'occhio nel caso peggiore: ' + raw.open + ' → ' + eq.open);
});

test('intreccio: gli anelli alterni annullano la tensione indotta', () => {
  const uniform = () => 1;
  near(M.pairPickup(8, false, uniform), 1, 1e-12, 'coppia parallela: tutto il flusso');
  near(M.pairPickup(8, true, uniform), 0, 1e-12, 'coppia intrecciata, numero pari di anelli');
  near(M.pairPickup(7, true, uniform), 1 / 7, 1e-12, 'resta solo l\'anello spaiato');
  // campo che cresce lungo il cavo: resta un residuo, metà di un anello, che cala con l'intreccio più fitto
  const ramp = (x) => 1 + x;
  near(M.pairPickup(8, false, ramp), 1.5, 1e-9);
  near(Math.abs(M.pairPickup(8, true, ramp)), 1 / 16, 1e-9);
  near(Math.abs(M.pairPickup(32, true, ramp)), 1 / 64, 1e-9);
  // campo concentrato vicino a un motore
  const spot = (x) => Math.exp(-((x - 0.3) ** 2) / 0.02);
  const par = M.pairPickup(32, false, spot);
  assert.ok(Math.abs(M.pairPickup(32, true, spot)) < par / 100, 'intrecciata almeno 100 volte meglio');
});

test('collegamento pulito: il differenziale vede il doppio del filo singolo', () => {
  const d = sim({});
  const s = sim({ mode: 'se' });
  near(d.height, 0.7, 1e-3, 'occhio differenziale: da −350 a +350 mV');
  near(s.height, 0.35, 1e-3, 'occhio a filo singolo: ±175 mV');
  near(d.width, 1, 1e-3, 'larghezza piena');
  assert.strictEqual(d.errors, 0);
  assert.strictEqual(d.ber, 0);
});

test('modo comune: chiude l\'occhio del filo singolo, il differenziale lo cancella', () => {
  const se = sim({ mode: 'se', cm: 0.3 });
  assert.ok(se.height < 0, 'filo singolo con 300 mV di disturbo: occhio chiuso');
  assert.ok(se.errors > 100, 'e molti bit sbagliati: ' + se.errors);
  const d = sim({ cm: 0.3 });
  near(d.height, 0.7, 1e-3, 'differenziale perfettamente bilanciato');
  assert.strictEqual(d.errors, 0);
  // sbilanciamento del 10% (CMRR 20 dB): passano 30 mV di picco, l'occhio perde 60 mV
  const imb = sim({ cm: 0.3, imb: 0.1 }, 3000);
  near(imb.height, 0.7 - 2 * 0.1 * 0.3, 2e-3, 'differenziale sbilanciato');
});

test('rumore indipendente sui due fili: nel differenziale il fattore Q migliora di √2', () => {
  const d = sim({ sigma: 0.05 }, 4000);
  const s = sim({ mode: 'se', sigma: 0.05 }, 4000);
  near(d.q, 0.35 / (0.05 * Math.SQRT2), 0.02, 'Q differenziale');
  near(s.q, 0.175 / 0.05, 0.02, 'Q a filo singolo');
  near(d.q / s.q, Math.SQRT2, 0.01);
});

test('il BER stimato dal fattore Q coincide con gli errori contati', () => {
  const n = 12000;
  const s = sim({ mode: 'se', sigma: 0.1 }, n, 11);
  const expected = M.berFromQ(0.175 / 0.1); // circa 4·10⁻²
  rel(s.ber, expected, 0.01, 'BER stimato');
  assert.strictEqual(s.n, n);
  rel(s.errors / s.n, expected, 0.15, 'errori contati su ' + n + ' bit');
});

test('jitter casuale: l\'occhio si stringe di circa 6,2 deviazioni standard', () => {
  const s = sim({ rj: 0.04 }, 4000);
  near(s.width, 1 - 6.18 * 0.04, 0.04, 'larghezza con 4% UI di jitter');
  near(s.height, 0.7, 1e-3, 'con un canale largo l\'altezza non cambia');
});

test('la simulazione è riproducibile e il rumore è gaussiano', () => {
  const a = sim({ sigma: 0.02, rj: 0.02, cm: 0.1, imb: 0.05, f3: 1e9 }, 800, 42);
  const b = sim({ sigma: 0.02, rj: 0.02, cm: 0.1, imb: 0.05, f3: 1e9 }, 800, 42);
  assert.strictEqual(a.height, b.height);
  assert.strictEqual(a.ber, b.ber);
  const r = M.rng(9);
  let s1 = 0;
  let s2 = 0;
  const N = 40000;
  for (let i = 0; i < N; i++) { const g = r.gauss(); s1 += g; s2 += g * g; }
  near(s1 / N, 0, 0.02, 'media');
  near(Math.sqrt(s2 / N), 1, 0.02, 'deviazione standard');
});

test('passi, didascalia e domande sono testo semplice: la pagina non li legge come HTML', () => {
  const sezione = load();
  const ch = sezione.chapter('differenziale');
  const plain = [ch.hero.caption, ch.hero.label, ch.lab.title, ...ch.uses];
  ch.steps.forEach((s) => plain.push(s.title, s.text));
  ch.timeline.forEach((e) => plain.push(e.title, e.who));
  const quiz = Array.from(sezione.QUIZ).filter((q) => q.chapter === 'differenziale');
  assert.ok(quiz.length >= 4, 'domande del capitolo in quiz.js');
  quiz.forEach((q) => plain.push(q.q, q.why, ...q.options));
  plain.forEach((t) => assert.ok(!/<[a-z/]|&[a-z]+;/i.test(t), 'HTML in un testo semplice: ' + t.slice(0, 60)));
});
