// Test della sezione Elettronica base: fisica dei laboratori e coerenza dei contenuti.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const F = require('../sections/elettronica-base/physics.js');

const DIR = path.join(__dirname, '..', 'sections', 'elettronica-base');
const NBSP = ' ';

function vicino(a, b, tolleranza) {
  assert.ok(Math.abs(a - b) <= (tolleranza || 1e-9) * Math.max(1, Math.abs(b)), a + ' ≠ ' + b);
}

/* ---------- fisica ---------- */

test('formattazione all\'italiana con prefissi SI', () => {
  assert.strictEqual(F.formatta(0.12, 'A'), '120' + NBSP + 'mA');
  assert.strictEqual(F.formatta(4700, 'Ω'), '4,7' + NBSP + 'kΩ');
  assert.strictEqual(F.formatta(0.99996, 'A'), '1' + NBSP + 'A');
  assert.strictEqual(F.formatta(4.7e-5, 'F'), '47' + NBSP + 'µF');
  assert.strictEqual(F.formatta(-0.5, 'A'), '−500' + NBSP + 'mA');
  assert.strictEqual(F.formatta(0, 'V'), '0' + NBSP + 'V');
  assert.strictEqual(F.formatta(Infinity, 'Ω'), '∞' + NBSP + 'Ω');
  assert.strictEqual(F.numero(3.14159, 2), '3,14');
});

test('legge di Coulomb: due cariche da 1 µC a 1 m', () => {
  vicino(F.coulomb(1e-6, 1e-6, 1), 8.9875517923e-3, 1e-12);
  assert.ok(F.coulomb(1e-6, -1e-6, 1) < 0, 'cariche opposte si attraggono');
  vicino(F.coulomb(1e-6, 1e-6, 2), F.coulomb(1e-6, 1e-6, 1) / 4, 1e-12);
});

test('campo elettrico: simmetria di un dipolo', () => {
  const e = F.campo([{ x: -1, y: 0, q: 1 }, { x: 1, y: 0, q: -1 }], 0, 0);
  assert.ok(e.x > 0);
  vicino(e.y, 0);
});

test('legge di Ohm e potenza', () => {
  vicino(F.corrente(12, 100), 0.12);
  vicino(F.tensione(0.12, 100), 12);
  vicino(F.resistenza(12, 0.12), 100);
  vicino(F.potenza(230, 10), 2300);
  vicino(F.potenzaDaCorrente(2, 10), 40);
  vicino(F.potenzaDaTensione(12, 6), 24);
  vicino(F.energiaKWh(2000, 1.5), 3);
});

test('resistenza di un filo di rame da 1 m e 1 mm²', () => {
  vicino(F.resistenzaFilo(F.RESISTIVITA_RAME, 1, 1e-6), 0.0168, 1e-9);
});

test('serie, parallelo e partitore', () => {
  assert.strictEqual(F.serie([10, 20, 30]), 60);
  vicino(F.parallelo([100, 100]), 50);
  vicino(F.parallelo([10, Infinity]), 10);
  assert.strictEqual(F.parallelo([Infinity]), Infinity);
  vicino(F.partitore(12, 1000, 2000), 8);
});

test('lampadine in serie: si spengono tutte se ne sviti una', () => {
  const tutte = F.risolviLampade(12, [10, 10, 20], 'serie');
  vicino(tutte.corrente, 0.3);
  vicino(tutte.rami[2].tensione, 6);
  vicino(tutte.rami.reduce((s, r) => s + r.tensione, 0), 12); // seconda legge di Kirchhoff
  const svitata = F.risolviLampade(12, [10, 10, 20], 'serie', [true, false, true]);
  assert.strictEqual(svitata.corrente, 0);
  assert.ok(svitata.rami.every((r) => !r.accesa));
  vicino(svitata.rami[1].tensione, 12); // tutta la tensione sul contatto aperto
});

test('lampadine in parallelo: le altre restano accese', () => {
  const p = F.risolviLampade(12, [10, 10, 20], 'parallelo', [true, false, true]);
  vicino(p.corrente, 1.8); // prima legge di Kirchhoff: 1,2 + 0 + 0,6
  assert.deepStrictEqual(p.rami.map((r) => r.accesa), [true, false, true]);
  vicino(p.req, 20 / 3);
});

test('condensatore a piatti: 1 m² a 1 mm nel vuoto ≈ 8,85 nF', () => {
  vicino(F.capacitaPiatti(1, 1e-3, 1), 8.8541878128e-9, 1e-9);
  vicino(F.energiaCondensatore(1e-6, 100), 0.005);
  vicino(F.caricaCondensatore(1e-6, 100), 1e-4);
  vicino(F.scaricaRC(10, 1000, 1e-3, 1), 10 * Math.exp(-1));
  vicino(F.caricaRC(10, 1000, 1e-3, 1), 10 * (1 - Math.exp(-1)));
});

test('induzione: flusso massimo al centro della spira e fem con il segno di Lenz', () => {
  assert.strictEqual(F.flussoRelativo(0, 1), 1);
  assert.ok(F.flussoRelativo(2, 1) < F.flussoRelativo(1, 1));
  assert.ok(F.femIndotta(100, 0.2, 0.6, 0.1) < 0, 'flusso che cresce: fem negativa');
  vicino(F.campoSolenoide(1000, 1, 0.5), 4e-7 * Math.PI * 2000);
});

test('corrente alternata: 230 V efficaci sono circa 325 V di picco', () => {
  vicino(F.piccoDaEfficace(230), 325.269, 1e-5);
  vicino(F.efficace(F.piccoDaEfficace(230)), 230);
  vicino(F.sinusoide(325, 50, 0.005), 325); // un quarto di periodo a 50 Hz
  vicino(F.trasformatore(230, 1000, 50), 11.5);
  vicino(F.correnteSecondario(0.1, 1000, 50), 2);
  // a parità di potenza, alzare la tensione di 10 volte riduce le perdite di 100 volte
  vicino(F.perditaLinea(1e6, 10e3, 1) / F.perditaLinea(1e6, 100e3, 1), 100);
});

test('velocità di deriva: 1 A in 1 mm² di rame è meno di un decimo di millimetro al secondo', () => {
  const v = F.velocitaDeriva(1, 1e-6);
  assert.ok(v > 5e-5 && v < 1e-4, String(v));
  vicino(F.elettroniPerSecondo(1), 6.241509074e18, 1e-9);
});

test('codice colori: andata e ritorno su tutta la serie E12', () => {
  assert.deepStrictEqual(F.coloriDaValore(4700), ['giallo', 'viola', 'rosso']);
  assert.deepStrictEqual(F.coloriDaValore(0.47), ['giallo', 'viola', 'argento']);
  assert.deepStrictEqual(F.coloriDaValore(10), ['marrone', 'nero', 'nero']);
  assert.strictEqual(F.valoreDaColori(['marrone', 'nero', 'arancione']), 10000);
  for (let dec = -2; dec <= 8; dec++) {
    for (const base of F.E12) {
      const v = Number((base * Math.pow(10, dec)).toPrecision(12));
      assert.strictEqual(F.valoreDaColori(F.coloriDaValore(v)), v, 'valore ' + v);
    }
  }
  assert.strictEqual(F.arrotondaE12(5000), 4700);
  assert.strictEqual(F.arrotondaE12(1e6), 1e6);
});

/* ---------- contenuti ---------- */

function caricaSezione() {
  const registrate = {};
  const sandbox = { window: { Enciclopedia: { register: (d) => { registrate[d.slug] = d; } } } };
  vm.runInNewContext(fs.readFileSync(path.join(DIR, 'section.js'), 'utf8'), sandbox);
  return registrate['elettronica-base'];
}

function caricaContenuti() {
  const capitoli = {};
  const laboratori = {};
  const EB = { capitolo: (d) => { capitoli[d.id] = d; }, laboratorio: (id, d) => { laboratori[id] = d; } };
  const sandbox = { EB: EB, EBFisica: F, window: { EB: EB, EBFisica: F }, console: console };
  for (const cartella of ['capitoli', 'laboratori']) {
    const dir = path.join(DIR, cartella);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js')).sort()) {
      vm.runInNewContext(fs.readFileSync(path.join(dir, f), 'utf8'), sandbox, { filename: f });
    }
  }
  return { capitoli: capitoli, laboratori: laboratori };
}

test('la sezione si registra con dieci capitoli dagli id unici', () => {
  const s = caricaSezione();
  assert.strictEqual(s.numero, 1);
  assert.strictEqual(s.capitoli.length, 10);
  assert.strictEqual(new Set(s.capitoli.map((c) => c.id)).size, 10);
  s.capitoli.forEach((c) => assert.ok(c.titolo && c.descrizione && c.periodo, c.id));
});

test('ogni capitolo ha un file di contenuti completo', () => {
  const s = caricaSezione();
  const { capitoli } = caricaContenuti();
  for (const c of s.capitoli) {
    const d = capitoli[c.id];
    assert.ok(d, 'manca il capitolo ' + c.id);
    assert.ok(Array.isArray(d.intro) && d.intro.length >= 2, c.id + ': intro');
    assert.ok(Array.isArray(d.laboratori) && d.laboratori.length >= 1, c.id + ': laboratori');
    assert.ok(Array.isArray(d.storia) && d.storia.length >= 3, c.id + ': storia');
    assert.ok(Array.isArray(d.glossario) && d.glossario.length >= 3, c.id + ': glossario');
    assert.ok(Array.isArray(d.inBreve) && d.inBreve.length >= 3, c.id + ': in breve');
    assert.ok(d.sapevi, c.id + ': lo sapevi');
    assert.ok(d.figura && /^<svg[\s>]/.test(d.figura.svg.trim()) && /viewBox=/.test(d.figura.svg) && d.figura.alt, c.id + ': figura');
    d.storia.forEach((ev) => assert.ok(Number.isFinite(ev.anno) && ev.titolo && ev.testo, c.id + ': evento ' + ev.titolo));
    d.laboratori.forEach((l) => (l.sfide || []).forEach((sf) => assert.ok(sf.id && sf.testo, c.id + ': sfida')));
  }
});

test('ogni laboratorio citato nei capitoli esiste', () => {
  const { capitoli, laboratori } = caricaContenuti();
  for (const id in capitoli) {
    for (const l of capitoli[id].laboratori || []) {
      assert.ok(laboratori[l.id] && typeof laboratori[l.id].monta === 'function', 'manca il laboratorio ' + l.id + ' (capitolo ' + id + ')');
    }
  }
});

test('le voci del glossario citate nel testo esistono e non sono duplicate', () => {
  const { capitoli } = caricaContenuti();
  const voci = new Map();
  for (const id in capitoli) {
    for (const g of capitoli[id].glossario || []) {
      const k = g.termine.toLowerCase();
      assert.ok(!voci.has(k), 'voce duplicata: ' + g.termine + ' (' + voci.get(k) + ' e ' + id + ')');
      voci.set(k, id);
    }
  }
  const testi = JSON.stringify(capitoli);
  const citate = [...testi.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => {
    const [visibile, voce] = m[1].split('|');
    return (voce || visibile).trim().toLowerCase();
  });
  const mancanti = [...new Set(citate.filter((c) => !voci.has(c)))];
  assert.deepStrictEqual(mancanti, [], 'voci citate ma non definite');
});

test('la pagina carica tutti i file dei capitoli e dei laboratori', () => {
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  for (const cartella of ['capitoli', 'laboratori']) {
    for (const f of fs.readdirSync(path.join(DIR, cartella))) {
      if (f.endsWith('.js')) assert.ok(html.includes('src="' + cartella + '/' + f + '"'), cartella + '/' + f + ' non è caricato');
      if (f.endsWith('.css')) assert.ok(html.includes('href="' + cartella + '/' + f + '"'), cartella + '/' + f + ' non è caricato');
    }
  }
  for (const m of html.matchAll(/(?:src|href)="((?:capitoli|laboratori)\/[^"]+)"/g)) {
    assert.ok(fs.existsSync(path.join(DIR, m[1])), 'file mancante: ' + m[1]);
  }
});
