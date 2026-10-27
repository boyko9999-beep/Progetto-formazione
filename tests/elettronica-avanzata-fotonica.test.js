// Modello del capitolo 9 (fotonica e fibra ottica): node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./elettronica-avanzata.load.js');

const M = load().chapter('fotonica').model;
const DEG = Math.PI / 180;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ': ' + a + ' invece di ' + b);

test('angolo critico: valori noti e legge di Snell al limite', () => {
  near(M.criticalAngle(1.48, 1.46) / DEG, 80.57, 0.01, 'vetro step-index');
  near(M.criticalAngle(1.49, 1.40) / DEG, 70.0, 0.05, 'fibra plastica');
  near(M.criticalAngle(1.333, 1) / DEG, 48.6, 0.05, 'acqua e aria');
  near(M.criticalAngle(1.5, 1) / DEG, 41.8, 0.05, 'vetro e aria');
  assert.ok(Number.isNaN(M.criticalAngle(1.46, 1.48)), 'senza nucleo più denso non c\'è angolo critico');
  // all'angolo critico il raggio rifratto è radente (90°); oltre non esiste
  const tc = M.criticalAngle(1.48, 1.46);
  near(M.snell(1.48, tc - 1e-9, 1.46) / DEG, 90, 0.01, 'rifratto all\'angolo critico');
  assert.ok(Number.isNaN(M.snell(1.48, tc + 0.01, 1.46)), 'oltre θc nessun raggio rifratto');
  // dal mezzo meno denso a quello più denso il raggio si avvicina alla normale
  assert.ok(M.snell(1, 40 * DEG, 1.5) < 40 * DEG);
});

test('apertura numerica e cono di accettazione: NA = √(n1² − n2²) = sin θmax', () => {
  near(M.numericalAperture(1.48, 1.46), 0.2425, 1e-3, 'NA vetro');
  near(M.acceptanceAngle(1.48, 1.46) / DEG, 14.03, 0.02, 'θmax vetro');
  near(M.numericalAperture(1.49, 1.40), 0.510, 1e-3, 'NA plastica');
  near(M.acceptanceAngle(1.49, 1.40) / DEG, 30.7, 0.05, 'θmax plastica');
  assert.strictEqual(M.numericalAperture(1.46, 1.48), 0, 'nessuna guida se n2 ≥ n1');
  // con NA > 1 entra qualunque raggio che arriva dall'aria
  near(M.acceptanceAngle(1.7, 1.0) / DEG, 90, 1e-9, 'cono pieno');
});

test('il cono di accettazione coincide con il limite della riflessione totale', () => {
  // la legge di Snell sulla faccia e l'angolo critico sulla parete danno lo stesso confine
  for (const [n1, n2] of [[1.48, 1.46], [1.49, 1.40], [1.333, 1], [1.62, 1.52]]) {
    const tmax = M.acceptanceAngle(n1, n2);
    assert.ok(M.launch(n1, n2, tmax - 1e-4).guided, n1 + '/' + n2 + ': appena dentro il cono è guidato');
    assert.ok(!M.launch(n1, n2, tmax + 1e-4).guided, n1 + '/' + n2 + ': appena fuori si perde');
  }
  // l'esempio della domanda di verifica: 20° dall'asse con NA ≈ 0,24
  const L = M.launch(1.48, 1.46, 20 * DEG);
  assert.ok(!L.guided);
  near(L.inside / DEG, 13.36, 0.02, 'angolo nel vetro');
  near(L.incidence / DEG, 76.64, 0.02, 'incidenza sulla parete');
});

test('riflettanza di Fresnel: 4% tra vetro e aria, 100% oltre l\'angolo critico', () => {
  near(M.reflectance(1.5, 1, 0), 0.04, 1e-9, 'incidenza normale');
  near(M.reflectance(1, 1.5, 0), 0.04, 1e-9, 'stesso valore nel verso opposto');
  const tc = M.criticalAngle(1.48, 1.46);
  assert.strictEqual(M.reflectance(1.48, 1.46, tc + 0.01), 1);
  // cresce verso l'angolo critico e resta tra 0 e 1
  let prev = 0;
  for (let th = 60 * DEG; th < tc; th += 0.2 * DEG) {
    const R = M.reflectance(1.48, 1.46, th);
    assert.ok(R >= prev - 1e-12 && R >= 0 && R <= 1, 'R a ' + (th / DEG).toFixed(1) + '°');
    prev = R;
  }
  assert.ok(M.reflectance(1.48, 1.46, tc - 1e-6) > 0.95, 'quasi tutto riflesso appena sotto θc');
});

test('percorso del raggio: zig-zag guidato senza perdite, energia conservata quando esce', () => {
  const g = M.trace(1.48, 1.46, 10 * DEG, 60, 0);
  assert.strictEqual(g.escapes.length, 0);
  assert.ok(Array.from(g.power).every((p) => p === 1), 'guidato: nessuna perdita');
  // distanza tra due urti sulla stessa parete: 2·(2a)/tan θ, con semilarghezza a = 1
  const pts = Array.from(g.pts, (p) => Array.from(p));
  const inside = M.launch(1.48, 1.46, 10 * DEG).inside;
  near(pts[3][0] - pts[1][0], 4 / Math.tan(inside), 1e-9, 'periodo dello zig-zag');
  assert.ok(pts.slice(1, -1).every((p) => Math.abs(Math.abs(p[1]) - 1) < 1e-12), 'urti sulle pareti');

  const lost = M.trace(1.49, 1.40, 45 * DEG, 40, 0);
  const esc = Array.from(lost.escapes);
  const power = Array.from(lost.power);
  assert.ok(esc.length > 0);
  const out = esc.reduce((s, e) => s + e.power, 0);
  near(out + power[power.length - 1], 1, 1e-12, 'luce uscita + luce rimasta');
  // il raggio rifratto obbedisce alla legge di Snell
  near(1.49 * Math.sin(lost.launch.incidence), 1.40 * Math.sin(esc[0].angle), 1e-12, 'Snell all\'uscita');
});

test('decibel e attenuazione: l\'1% dopo 100 km a 0,2 dB/km', () => {
  near(M.fractionLeft(0.2, 100), 0.01, 1e-12, '20 dB');
  near(M.distanceForFraction(0.2, 0.5), 15.05, 0.01, 'dimezzamento in circa 15 km');
  near(M.distanceForFraction(20, 0.01), 1, 1e-12, 'soglia di Kao: 1% dopo 1 km');
  near(M.distanceForFraction(1000, 0.01), 0.02, 1e-12, 'vetro del 1965: 20 m');
  near(M.dbmToMw(0), 1, 1e-12, '0 dBm');
  near(M.dbmToMw(-30), 1e-3, 1e-15, '−30 dBm = 1 µW');
  near(M.dbmToMw(20), 100, 1e-9, '+20 dBm = 100 mW');
  const GL = Array.from(M.GLASSES);
  assert.deepStrictEqual(GL.map((g) => g.key), ['finestra', '1965', '1970', 'oggi']);
  GL.forEach((g, i) => { if (i) assert.ok(g.alpha < GL[i - 1].alpha, 'vetri in ordine di purezza'); });
});

test('bilancio di potenza: portata, amplificatori e profilo', () => {
  // la domanda di verifica: 0 dBm, −28 dBm, 0,2 dB/km, senza connettori né margine
  near(M.reachKm(1550, { connectors: 0, margin: 0 }), 140, 1e-9, '28 dB / 0,2 dB/km');
  near(M.reachKm(1310, { connectors: 0, margin: 0 }), 80, 1e-9, 'a 1310 nm');
  // collegamento del laboratorio: 2 connettori da 0,5 dB e 3 dB di margine
  near(M.reachKm(1550), 120, 1e-9, 'portata a 1550 nm');
  const short = M.budget(1550, 100);
  assert.strictEqual(short.amps.length, 0);
  near(short.rx, -21, 1e-9, '100 km');
  assert.strictEqual(short.status, 'ok');
  const long = M.budget(1550, 300);
  assert.deepStrictEqual(Array.from(long.amps), [80, 160, 240]);
  near(long.gain, 16, 1e-12, 'ogni EDFA recupera una campata di 80 km');
  near(long.rx, -13, 1e-9, '300 km con tre EDFA');
  // senza amplificatori, o dove l'erbio non amplifica, la luce non arriva
  assert.strictEqual(M.budget(1550, 300, { edfa: false }).status, 'sotto');
  assert.strictEqual(M.budget(1310, 300).amps.length, 0);
  assert.strictEqual(M.budget(1310, 300).status, 'sotto');
  // il profilo parte dalla potenza lanciata, salta di +16 dB a ogni EDFA e finisce in rx
  const prof = Array.from(M.budgetProfile(1550, 300), (p) => Array.from(p));
  assert.deepStrictEqual(prof[0], [0, 0]);
  near(prof[prof.length - 1][1], long.rx, 1e-9, 'fine del profilo');
  const jumps = prof.filter((p, i) => i > 1 && p[0] === prof[i - 1][0] && p[1] > prof[i - 1][1]);
  assert.strictEqual(jumps.length, 3);
  // a 850 nm su multimodale il limite a 10 Gbit/s è la dispersione modale, non la potenza
  assert.strictEqual(M.budget(850, 0.5).status, 'ok');
  assert.ok(M.modalLimited(850, 0.5) && !M.modalLimited(850, 0.2) && !M.modalLimited(1550, 1000));
});

test('luce e canali: 193 THz a 1550 nm, griglia DWDM a 100 GHz, CWDM a 20 nm', () => {
  near(M.frequency(1550) / 1e12, 193.41, 0.01, 'f a 1550 nm');
  near(M.wavelength(193.1e12), 1552.52, 0.01, 'ancora della griglia ITU');
  near(M.photonEnergy(1550), 0.80, 0.005, 'energia del fotone in eV');
  near(M.responsivity(1550, 1), 1.25, 0.005, 'limite teorico della responsività');
  near(M.latency(6000) * 1000, 29.4, 0.1, 'Atlantico in circa 30 ms');
  const dw = Array.from(M.channelPlan(1550, 99), (c) => ({ f: c.f, nm: c.nm }));
  assert.strictEqual(dw.length, 40, 'banda C: 40 canali a 100 GHz');
  dw.forEach((c, i) => {
    assert.ok(c.nm > 1530 && c.nm < 1565, 'dentro la banda C: ' + c.nm);
    if (i) near(c.f - dw[i - 1].f, 100e9, 1, 'passo di 100 GHz');
  });
  assert.ok(Array.from(M.channelPlan(1550, 1))[0].f === 193.1e12, 'il primo canale è sull\'ancora');
  const cw = Array.from(M.channelPlan(1310, 9), (c) => c.nm);
  assert.deepStrictEqual(cw, [1271, 1291, 1311, 1331, 1351]);
  assert.strictEqual(Array.from(M.channelPlan(850, 8)).length, 1);
  assert.strictEqual(M.capacity(40), 400e9);
  assert.strictEqual(M.capacity(80, 100e9), 8e12);
});

test('fotodiodo in ricezione: responsività, corrente alla soglia e gap del silicio', () => {
  // R = η·λ/1,24 (λ in µm): InGaAs con η ≈ 0,75 a 1550 nm, silicio con η ≈ 0,8 a 850 nm
  near(M.responsivity(1550, 0.75), 0.9376, 1e-3, 'InGaAs a 1550 nm');
  near(M.responsivity(850, 0.8), 0.548, 1e-3, 'silicio a 850 nm');
  // alla soglia di −28 dBm (circa 1,6 µW) con 1 A/W scorre circa 1,6 µA
  near(M.photocurrent(-28, 1) * 1e6, 1.585, 1e-3, 'corrente alla soglia');
  near(M.photocurrent(0, 0.9) * 1e3, 0.9, 1e-9, '1 mW su 0,9 A/W');
  // i fotoni a 1550 nm hanno meno energia del gap del silicio (1,12 eV): il silicio non li vede
  assert.ok(M.photonEnergy(1550) < M.SI_GAP && M.photonEnergy(850) > M.SI_GAP);
  near(M.photonEnergy(1310), 0.946, 2e-3, 'energia a 1310 nm');
  // quindi il laboratorio sceglie il silicio a 850 nm e l'InGaAs nelle finestre infrarosse lunghe
  assert.deepStrictEqual([850, 1310, 1550].map((nm) => M.detector(nm).name), ['silicio', 'InGaAs', 'InGaAs']);
  // con il collegamento di base a 1550 nm (300 km, −13 dBm) il fotodiodo dà circa 47 µA
  const rx = M.budget(1550, 300).rx;
  near(M.photocurrent(rx, M.responsivity(1550, M.detector(1550).eta)) * 1e6, 47.0, 0.1, 'corrente del laboratorio');
  // e nella fibra la luce impiega circa 4,9 µs per ogni chilometro
  near(M.latency(1) * 1e6, 4.9, 0.01, 'ritardo per km');
});
