// Modello del capitolo 7 (elettronica di potenza, convertitore buck): node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./elettronica-avanzata.load.js');

const M = load().chapter('potenza').model;
const REF = { vin: 12, d: 5 / 12, fsw: 5e5, l: 10e-6, io: 2, tech: 'si', sync: false };
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, (what || '') + ': ' + a + ' invece di ' + b);
const buck = (p) => M.buck(Object.assign({}, REF, p));

test('regolatore lineare da 12 a 5 V: rendimento 41,7% con qualunque corrente', () => {
  const a = M.linear(12, 5, 2);
  near(a.eta, 5 / 12, 1e-12, 'rendimento');
  near(a.ploss, 14, 1e-12, 'calore a 2 A');
  near(a.pin, 24, 1e-12, 'potenza in ingresso');
  const b = M.linear(12, 5, 1);
  near(b.eta, a.eta, 1e-12, 'il rendimento non dipende dalla corrente');
  near(b.ploss, 7, 1e-12, 'calore a 1 A');
});

test('buck di riferimento 12 → 5 V, 2 A, 500 kHz, 10 µH, 22 µF: valori della nota TI', () => {
  const op = buck({});
  assert.strictEqual(op.mode, 'ccm');
  near(op.vout, 5, 1e-9, 'Vout = D·Vin');
  near(op.dil, 0.5833, 1e-3, 'ripple di corrente');
  near(op.imax, 2.2917, 1e-3, 'corrente di picco');
  near(op.dv, 6.63e-3, 0.05e-3, 'ripple di tensione');
  near(M.rippleV(op.dil, op.fsw, op.c), op.dv, 1e-12, 'ΔV = ΔI/(8·f·C)');
  // perdite: diodo 0,45 V per il 58% del tempo, commutazione 0,12 W, conduzione trascurabile
  near(op.pLow, 0.525, 1e-6, 'perdita nel diodo');
  near(op.pSw, 0.12, 1e-9, 'perdita di commutazione');
  assert.ok(op.eta > 0.93 && op.eta < 0.945, 'rendimento ' + op.eta);
  // conserva (quasi) la potenza: dalla batteria arriva meno corrente di quella d'uscita
  assert.ok(op.iin > 0.83 && op.iin < 0.9, 'corrente in ingresso ' + op.iin);
});

test('il ripple di corrente non dipende dal carico e scala come 1/(L·f); ΔV come 1/f²', () => {
  const a = buck({ io: 1 });
  const b = buck({ io: 3 });
  near(a.dil, b.dil, 1e-12, 'stesso triangolo con carichi diversi');
  const f2 = buck({ fsw: 1e6 });
  near(f2.dil, a.dil / 2, 1e-12, 'frequenza doppia, ripple metà');
  near(f2.dv, a.dv / 4, 1e-12, 'frequenza doppia, ΔV un quarto');
  near(buck({ l: 20e-6 }).dil, a.dil / 2, 1e-12, 'induttanza doppia, ripple metà');
  // induttanza che serve per lo stesso ripple: 100 volte la frequenza, 100 volte meno induttanza
  near(M.inductanceFor(12, 5, 0.6, 2e4), 243e-6, 1e-6, 'a 20 kHz');
  near(M.inductanceFor(12, 5, 0.6, 2e4) / M.inductanceFor(12, 5, 0.6, 2e6), 100, 1e-9, 'rapporto');
});

test('le forme d\'onda sono coerenti: media di iL = carico, media del nodo ≈ Vout, ondulazione = ΔV', () => {
  for (const p of [{}, { io: 0.1 }, { io: 0.1, sync: true }, { d: 0.75, fsw: 2e6, l: 2.2e-6 }]) {
    const op = buck(p);
    const N = 20000;
    let si = 0;
    let sv = 0;
    for (let i = 0; i < N; i++) { si += M.il(op, (i + 0.5) / N); sv += M.vsw(op, (i + 0.5) / N); }
    near(si / N, op.io, 1e-3, 'media della corrente nella bobina ' + JSON.stringify(p));
    // nel buck reale la media del nodo è Vout più le cadute; nel modello conta la caduta del ricircolo
    assert.ok(Math.abs(sv / N - op.vout) < 0.3, 'media del nodo ' + sv / N + ' contro ' + op.vout);
    const r = Array.from(M.outputRipple(op, 4000));
    near(Math.max(...r) - Math.min(...r), op.dv, op.dv * 0.01 + 1e-9, 'ondulazione picco-picco ' + JSON.stringify(p));
  }
});

test('carico leggero: con il diodo si entra in DCM e Vout sale; con il MOSFET sincrono no', () => {
  const edge = buck({}).dil / 2;
  assert.strictEqual(buck({ io: edge * 1.01 }).mode, 'ccm');
  const d = buck({ io: 0.1 });
  assert.strictEqual(d.mode, 'dcm');
  // DCM con carico a corrente costante: Vout = Vin / (1 + 2·L·f·Io / (D²·Vin))
  near(d.vout, 12 / (1 + (2 * 10e-6 * 5e5 * 0.1) / ((25 / 144) * 12)), 1e-9, 'Vout in DCM');
  assert.ok(d.vout > 5, 'in DCM Vout supera D·Vin');
  assert.ok(d.d + d.d2 < 1, 'resta un intervallo con corrente nulla');
  // al confine tra i due modi le due formule danno la stessa tensione
  near(buck({ io: edge * 0.999 }).vout, 5, 0.01, 'continuità al confine');
  const s = buck({ io: 0.1, sync: true });
  assert.strictEqual(s.mode, 'ccm');
  near(s.vout, 5, 1e-9, 'con il sincrono Vout resta D·Vin');
  assert.ok(s.imin < 0, 'la corrente nella bobina si inverte');
});

test('perdite di commutazione: Si contro GaN, e il rendimento che cala con la frequenza', () => {
  near(M.switchingLoss(12, 2, 20e-9, 2e6), 0.48, 1e-9, 'silicio a 2 MHz');
  near(M.switchingLoss(12, 2, 3e-9, 2e6), 0.072, 1e-9, 'GaN a 2 MHz');
  near(M.switchingLoss(12, 2, 20e-9, 5e6), 1.2, 1e-9, 'silicio a 5 MHz');
  const si = [2e4, 5e5, 2e6, 5e6].map((f) => M.efficiencyAt(REF, f, 'si'));
  const gan = [2e4, 5e5, 2e6, 5e6].map((f) => M.efficiencyAt(REF, f, 'gan'));
  for (let i = 1; i < si.length; i++) assert.ok(si[i] < si[i - 1], 'il rendimento del silicio cala con la frequenza');
  assert.ok(gan[3] - si[3] > 0.07, 'a 5 MHz il GaN vince di oltre 7 punti');
  near(M.efficiencyAt(REF, REF.fsw, 'si'), buck({}).eta, 1e-12, 'alla frequenza del banco coincide con il punto di lavoro');
  // il raddrizzamento sincrono taglia la perdita del diodo: da circa 0,52 W a circa 0,02 W
  const sy = buck({ sync: true });
  assert.ok(sy.pLow < 0.03 && sy.eta > 0.97, 'sincrono: ' + sy.pLow + ' W, η ' + sy.eta);
  assert.ok(sy.eta - buck({}).eta > 0.03, 'il sincrono guadagna oltre 3 punti');
});

test('boost e buck-boost ideali', () => {
  near(M.boost(5, 0.5), 10, 1e-12, 'boost con D = 0,5');
  near(M.buckBoost(5, 0.5), -5, 1e-12, 'buck-boost invertente con D = 0,5');
  near(M.boost(3.7, 0.26), 5, 0.01, 'dalla batteria al litio a 5 V');
});
