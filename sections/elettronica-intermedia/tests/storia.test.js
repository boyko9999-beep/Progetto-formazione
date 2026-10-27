// Pagina della storia: modello della valvola (js/storia.js) e coerenza della linea del tempo.
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { EI, allChapters, ROOT } = require('./harness.js');

require(path.join(ROOT, 'js', 'storia.js'));

const m = EI.storia.model;
const close = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, a + ' ≠ ' + b + ' (±' + eps + ')');
const rel = (a, b, r) => close(a, b, Math.abs(b) * r);

/* ---------- modello fisico ---------- */

test('storia: legge di Child-Langmuir, I = k·V^1,5 e zero con la placca non positiva', () => {
  close(m.childLangmuir(100, 1e-5), 0.01, 1e-15); // 1e-5 · 100^1,5 = 1e-5 · 1000
  assert.strictEqual(m.childLangmuir(0), 0);
  assert.strictEqual(m.childLangmuir(-50), 0);
  // doppia tensione → 2^1,5 = 2,83 volte la corrente
  close(m.childLangmuir(200) / m.childLangmuir(100), 2 * Math.SQRT2, 1e-12);
  // il diodo è lo stesso tubo con la griglia unita al catodo: k_diodo = K/μ^1,5
  rel(m.childLangmuir(150), m.cathode(0, 150), 1e-12);
});

test('storia: triodo tarato sul 6J5, 9 mA con 250 V di placca e −8 V di griglia', () => {
  assert.strictEqual(m.MU, 20);
  close(m.cathode(-8, 250), 9e-3, 1e-15); // K · (−8 + 250/20)^1,5 = K · 4,5^1,5
  close(m.K, 9e-3 / (4.5 * Math.sqrt(4.5)), 1e-15); // 0,943 mA/V^1,5
  // con il catodo caldo l'emissione (30 mA) quasi non conta: resta a meno dell'1% da 9 mA
  rel(m.triode(-8, 250, 1).ip, 9e-3, 0.01);
});

test('storia: interdizione quando Vg + Vp/μ scende a zero', () => {
  assert.strictEqual(m.cutoff(200), -10);
  assert.strictEqual(m.cathode(-12.5, 250), 0);
  assert.ok(m.cathode(-12.4, 250) > 0);
  assert.strictEqual(m.triode(-10, 200, 1).ip, 0);
  assert.ok(m.triode(-9.9, 200, 1).ip > 1e-5);
  // con il carico la placca resta a B+ e la soglia non cambia
  const op = m.triodeOP(200, -10, 1, 22000);
  assert.strictEqual(op.ip, 0);
  close(op.vp, 200, 1e-9);
});

test('storia: piccoli segnali nel punto 250 V / −8 V: gm = 3 mA/V, rp = 6,67 kΩ, Av = −15,3 con 22 kΩ', () => {
  close(m.gm(-8, 250), 3e-3, 1e-12); // 1,5 · I/(Vg + Vp/μ) = 1,5 · 9 mA / 4,5 V
  close(m.rp(-8, 250), 20 / 3e-3, 1e-6); // μ/gm
  close(m.gain(-8, 250, 22000), -20 * 22000 / (22000 + 20 / 3e-3), 1e-9); // −15,35
  assert.strictEqual(m.gm(-14, 250), 0);
  assert.strictEqual(m.gain(-14, 250, 22000), 0);
});

test('storia: punto di lavoro con il carico, risolto per bisezione', () => {
  // Vp + 1 kΩ · 1e-4 · Vp^1,5 = 200 V ha la soluzione esatta Vp = 100 V (100 + 0,1 · 1000)
  const a = m.operating(200, 1000, (v) => 1e-4 * Math.pow(v, 1.5));
  close(a.vp, 100, 1e-9);
  close(a.ip, 0.1, 1e-12);
  // il triodo del laboratorio: con 340 V e 10 kΩ ritrova 250 V e 9 mA
  const b = m.operating(340, 10000, (v) => m.cathode(-8, v));
  close(b.vp, 250, 1e-9);
  close(b.ip, 9e-3, 1e-12);
  // senza alimentazione positiva niente corrente
  assert.deepStrictEqual(m.operating(-20, 10000, (v) => m.cathode(0, v)), { vp: -20, ip: 0 });
  // la soluzione sta sulla retta di carico e sulla caratteristica della valvola
  const q = m.triodeOP(250, -4, 1, 22000);
  close(q.vp + 22000 * q.ip, 250, 1e-6);
  rel(q.ip, m.triode(-4, q.vp, 1).ip, 1e-9);
});

test('storia: il guadagno misurato con il segnale coincide con μ·RL/(RL + rp)', () => {
  const q = m.triodeOP(250, -4, 1, 22000);
  const small = Math.abs(m.gain(-4, q.vp, 22000));
  rel(m.swing(250, -4, 0, 1, 22000).gain, small, 0.005);
  rel(m.swing(250, -4, 1, 1, 22000).gain, small, 0.01);
  // più grande è RL, più il guadagno si avvicina a μ (senza mai superarlo)
  const g100 = m.swing(250, -2, 0, 1, 100000).gain;
  assert.ok(g100 > m.swing(250, -2, 0, 1, 22000).gain && g100 < 20);
});

test('storia: emissione del catodo con la legge di Richardson', () => {
  assert.strictEqual(m.emission(0), 0);
  close(m.emission(1), m.IS, 1e-15);
  // 1000 K contro 1100 K: (1000/1100)² · e^(−12000·(1/1000 − 1/1100)) = 0,2776
  rel(m.emission(0.875) / m.IS, 0.27761, 1e-4);
  // a 700 K (metà del riscaldamento) esce meno di un millesimo della corrente piena
  assert.ok(m.emission(0.5) < m.IS / 1000);
  let prev = -1;
  for (let w = 0; w <= 1.0001; w += 0.05) {
    const e = m.emission(w);
    assert.ok(e > prev, 'l\'emissione deve crescere con la temperatura');
    prev = e;
  }
  close(m.temperature(0), 300, 1e-12);
  close(m.temperature(1), 1100, 1e-12);
});

test('storia: con il filamento spento non passa niente (effetto Edison)', () => {
  assert.strictEqual(m.diode(100, 0), 0);
  assert.strictEqual(m.diodeOP(100, 0).ip, 0);
  assert.strictEqual(m.triode(-2, 250, 0).ip, 0);
  assert.strictEqual(m.triodeOP(250, 1, 0, 22000).ik, 0);
  // catodo tiepido: la corrente è limitata dall'emissione, non dalla tensione (saturazione)
  const em = m.emission(0.6);
  assert.ok(m.diode(150, 0.6) <= em && m.diode(150, 0.6) > 0.8 * em);
});

test('storia: il diodo raddrizza, la placca negativa non lascia passare corrente', () => {
  assert.deepStrictEqual(m.diodeOP(-50, 1), { vp: -50, ip: 0 });
  const on = m.diodeOP(100, 1);
  assert.ok(on.ip > 4e-3 && on.ip < 5e-3, 'con 100 V e 10 kΩ circa 4,4 mA');
  close(on.vp + m.RL_DIODE * on.ip, 100, 1e-6);
  // una sinusoide di ±100 V: corrente media positiva, nessuna corrente nella semionda negativa
  let sum = 0;
  for (let k = 0; k < 360; k++) {
    const i = m.diodeOP(100 * Math.sin(k * Math.PI / 180), 1).ip;
    if (k > 180) assert.strictEqual(i, 0);
    sum += i;
  }
  assert.ok(sum / 360 > 1e-3);
});

test('storia: il galvanometro segna la corrente media, che con la valvola non è zero', () => {
  assert.strictEqual(m.diodeAverage(100, 0), 0, 'filamento freddo: niente corrente');
  const avg = m.diodeAverage(100, 1);
  const pk = m.diodeOP(100, 1).ip;
  // semionda raddrizzata: la media resta poco sotto picco/π, perché la valvola conduce meglio con più tensione
  assert.ok(avg > 0.85 * pk / Math.PI && avg < pk / Math.PI, 'media ' + avg + ', picco ' + pk);
  // la stessa media calcolata con 3600 campioni
  let sum = 0;
  for (let k = 0; k < 3600; k++) sum += m.diodeOP(100 * Math.sin(2 * Math.PI * (k + 0.5) / 3600), 1).ip;
  close(avg, sum / 3600, avg * 0.002);
  assert.ok(m.diodeAverage(150, 1) > avg && avg > m.diodeAverage(50, 1));
});

test('storia: corrente di griglia solo con la griglia positiva', () => {
  assert.strictEqual(m.gridCurrent(-1), 0);
  assert.strictEqual(m.gridCurrent(0), 0);
  close(m.gridCurrent(1), 3e-4, 1e-15);
  close(m.gridCurrent(4), 3e-4 * 8, 1e-15); // 4^1,5 = 8
  const t = m.triode(1, 250, 1);
  assert.ok(t.ig > 0 && t.ip > 0);
  close(t.ik, t.ip + t.ig, 1e-15);
  assert.strictEqual(m.triode(-2, 250, 1).ig, 0);
  // senza tensione di placca solo la griglia positiva raccoglie elettroni
  const z = m.triode(1, 0, 1);
  assert.strictEqual(z.ip, 0);
  assert.ok(z.ig > 0);
});

test('storia: il filamento del 6J5 consuma 6,3 V × 0,3 A = 1,89 W', () => {
  close(m.heaterPower(m.HEATER.v, m.HEATER.i), 1.89, 1e-12);
});

/* ---------- contenuti ---------- */

const chapters = allChapters();
const glossary = {};
chapters.forEach((c) => Object.assign(glossary, c.glossary || {}));
const chapterEvents = chapters.flatMap((c) => ((c.history && c.history.events) || []).map((e) => Object.assign({ chapter: c.id }, e)));
const SLUGS = ['elettronica-base', 'elettronica-intermedia', 'elettronica-avanzata', 'porte-logiche', 'chip-programmabili', 'storia-pc', 'programmazione', 'quiz'];

function storiaTexts() {
  const out = [EI.historyLead];
  EI.eras.forEach((e) => out.push(e.text));
  EI.timeline.forEach((e) => out.push(e.text));
  EI.storia.challenges.forEach((c) => out.push(c.text));
  EI.storia.figures.forEach((f) => out.push(f.caption));
  return out;
}

test('storia: introduzione ed epoche ben formate', () => {
  assert.ok(typeof EI.historyLead === 'string' && EI.historyLead.length > 60);
  assert.ok(EI.historyLead.split(/[.!?](?:\s|$)/).filter((x) => x.trim()).length <= 2, 'l\'introduzione deve avere una o due frasi');
  assert.strictEqual(EI.eras.length, 4);
  EI.eras.forEach((e, i) => {
    assert.ok(Number.isInteger(e.from) && Number.isInteger(e.to) && e.from < e.to, 'epoca ' + i);
    assert.ok(e.title && e.text && e.text.length > 80, 'epoca ' + i + ' senza titolo o testo');
    if (i) assert.strictEqual(e.from, EI.eras[i - 1].to + 1, 'le epoche devono essere contigue');
  });
});

test('storia: tappe di contesto valide e in ordine', () => {
  assert.ok(EI.timeline.length >= 6);
  let last = 0;
  for (const e of EI.timeline) {
    assert.ok(Number.isInteger(e.year) && e.year >= 1700 && e.year <= 2026, 'anno non valido: ' + JSON.stringify(e));
    assert.ok(e.title && e.who && e.text, 'tappa incompleta: ' + e.year);
    assert.ok(e.year >= last, 'tappe non in ordine: ' + e.year);
    last = e.year;
  }
  for (const e of chapterEvents) assert.ok(Number.isInteger(e.year) && e.year >= 1700 && e.year <= 2026, 'anno non valido nel capitolo ' + e.chapter);
});

test('storia: nessuna tappa di contesto ripete una tappa di un capitolo', () => {
  const norm = (s) => String(s).toLowerCase().replace(/[^a-zà-ù0-9]+/g, ' ').trim();
  for (const e of EI.timeline) {
    for (const c of chapterEvents) {
      assert.ok(!(e.year === c.year && norm(e.title) === norm(c.title)), 'tappa doppia: ' + e.year + ' ' + e.title + ' (capitolo ' + c.chapter + ')');
      assert.ok(norm(e.title) !== norm(c.title), 'stesso titolo di una tappa del capitolo ' + c.chapter + ': ' + e.title);
    }
  }
});

test('storia: le epoche coprono tutti gli anni delle tappe', () => {
  for (const e of EI.timeline.concat(chapterEvents)) {
    const n = EI.eras.filter((r) => e.year >= r.from && e.year <= r.to).length;
    assert.strictEqual(n, 1, 'l\'anno ' + e.year + ' (' + e.title + ') deve stare in una sola epoca');
  }
});

test('storia: termini del glossario e collegamenti validi', () => {
  for (const txt of storiaTexts()) {
    for (const g of String(txt).matchAll(/\[\[([a-z0-9-]+)(?:\|[^\]]+)?\]\]/g)) {
      assert.ok(glossary[g[1]], 'termine [[' + g[1] + ']] senza definizione nel glossario dei capitoli');
    }
    for (const a of String(txt).matchAll(/href="([^"]+)"/g)) {
      const ext = /^\.\.\/([a-z-]+)\/index\.html(#[a-z0-9-]+)?$/.exec(a[1]);
      const int = /^#([a-z0-9-]+)$/.exec(a[1]);
      assert.ok(ext || int, 'collegamento non valido: ' + a[1]);
      if (ext) assert.ok(SLUGS.includes(ext[1]), 'sezione sconosciuta: ' + ext[1]);
    }
  }
});

test('storia: sfide e figure del banco storico', () => {
  assert.strictEqual(typeof EI.historyDemo, 'function');
  const ch = EI.storia.challenges;
  assert.ok(ch.length >= 4 && ch.length <= 5);
  assert.strictEqual(new Set(ch.map((c) => c.id)).size, ch.length);
  ch.forEach((c) => assert.ok(/^[a-z0-9-]+$/.test(c.id) && c.text.length > 30));
  const figs = EI.storia.figures;
  assert.ok(figs.length >= 1 && figs.length <= 2);
  figs.forEach((f) => {
    assert.ok(f.title && f.caption && f.alt, 'figura incompleta');
    assert.match(f.svg.trim(), /^<svg viewBox="0 0 \d+ \d+"[ >]/);
    assert.ok(f.svg.trim().endsWith('</svg>'));
  });
});
