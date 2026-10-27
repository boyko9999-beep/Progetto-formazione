// Sezione 6 (Storia del PC): integrità dei capitoli, dei collegamenti e della registrazione nell'hub.
// Carica i file dei capitoli in Node, senza browser: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SEC = path.join(__dirname, '..', 'sections', 'storia-pc');
const P = require(path.join(SEC, 'js', 'core.js'));
const HTML = fs.readFileSync(path.join(SEC, 'index.html'), 'utf8');

// Stesso ordine dei <script> di index.html: prima i modelli, poi i capitoli.
const script = [...HTML.matchAll(/<script src="(js\/(?:modelli|capitoli)\/[^"]+)"><\/script>/g)].map((m) => m[1]);
script.forEach((s) => require(path.join(SEC, s)));
const capitoli = P.capitoli.slice().sort((a, b) => a.numero - b.numero);

const ID = ['giganti', 'von-neumann', 'primi-pc', 'ibm-pc', 'scheda-madre', 'memoria', 'avvio', 'grafica', 'prestazioni', 'oggi'];
const BUS = new Set(require('../js/buses.js').BUSES.map((b) => b.id));
const SEZIONI = ['elettronica-base', 'elettronica-intermedia', 'elettronica-avanzata', 'porte-logiche', 'chip-programmabili', 'programmazione', 'quiz'];
const testo = (html) => String(html).replace(/<[^>]+>/g, '');

test('index.html carica tutti i file della sezione e i file esistono', () => {
  const risorse = [...HTML.matchAll(/(?:src|href)="((?:js|css)\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(risorse.length >= 24);
  risorse.forEach((r) => assert.ok(fs.existsSync(path.join(SEC, r)), 'manca ' + r));
  ID.forEach((id, i) => {
    const nn = String(i + 1).padStart(2, '0') + '-' + id;
    ['js/capitoli/', 'js/modelli/'].forEach((d) => assert.ok(script.includes(d + nn + '.js'), 'index.html non carica ' + d + nn + '.js'));
    assert.ok(risorse.includes('css/capitoli/' + nn + '.css'), 'index.html non carica css/capitoli/' + nn + '.css');
  });
});

test('dieci capitoli, in ordine, con gli id concordati con le altre sezioni', () => {
  assert.deepStrictEqual(capitoli.map((c) => c.id), ID);
  assert.deepStrictEqual(capitoli.map((c) => c.numero), ID.map((_, i) => i + 1));
});

// Un sottotest per capitolo: un capitolo incompleto non nasconde gli esiti degli altri.
test('ogni capitolo ha intestazione, testi, schede, punti chiave e laboratorio', async (t) => {
  for (const c of capitoli) await t.test(c.id, () => {
    const dove = 'capitolo ' + c.id;
    ['titolo', 'breve', 'periodo', 'colore', 'sommario', 'intro'].forEach((k) => assert.ok(typeof c[k] === 'string' && c[k].trim(), dove + ': manca ' + k));
    assert.ok(Array.isArray(c.blocchi) && c.blocchi.length >= 6, dove + ': troppo pochi blocchi');
    c.blocchi.forEach((b) => assert.ok(P.TIPI_BLOCCO.includes(b.tipo), dove + ': blocco sconosciuto ' + b.tipo));
    assert.ok(c.blocchi.filter((b) => b.tipo === 'testo').length >= 3, dove + ': servono almeno 3 blocchi di testo');
    assert.ok(c.blocchi.some((b) => b.tipo === 'figura'), dove + ': manca un\'illustrazione');
    assert.ok(c.blocchi.some((b) => b.tipo === 'schede'), dove + ': mancano le schede');
    assert.ok(c.lab && typeof c.lab.crea === 'function' && c.lab.titolo, dove + ': manca il laboratorio');
    assert.ok(Array.isArray(c.punti) && c.punti.length >= 3 && c.punti.length <= 8, dove + ': punti chiave');
    c.blocchi.filter((b) => b.tipo === 'figura').forEach((b) => {
      assert.ok(typeof b.svg === 'function' || typeof b.svg === 'string', dove + ': figura senza svg');
      assert.ok(b.alt && b.alt.length > 10, dove + ': figura senza testo alternativo');
    });
  });
});

test('le schede hanno anni plausibili e testi: alimentano la linea del tempo', async (t) => {
  let n = 0;
  for (const c of capitoli) await t.test(c.id, () => {
    c.blocchi.filter((b) => b.tipo === 'schede').forEach((b) => b.items.forEach((it) => {
      n++;
      assert.ok(Number.isInteger(it.anno) && it.anno >= 1800 && it.anno <= 2026, c.id + ': anno non valido in ' + testo(it.nome));
      assert.ok(testo(it.nome).trim() && testo(it.testo).trim().length > 20, c.id + ': scheda incompleta ' + testo(it.nome));
    }));
  });
  assert.ok(n >= 60, 'la linea del tempo ha solo ' + n + ' eventi');
});

test('i collegamenti puntano a lezioni, sezioni e capitoli che esistono', async (t) => {
  const ancore = new Set(ID.concat('linea-del-tempo'));
  for (const c of capitoli) await t.test(c.id, () => {
    const hrefs = (c.collegamenti || []).map((l) => l.href);
    c.blocchi.forEach((b) => {
      const html = JSON.stringify(b);
      for (const m of html.matchAll(/href=\\"([^"\\]+)\\"/g)) hrefs.push(m[1]);
    });
    for (const href of hrefs) {
      let m;
      if ((m = /^\.\.\/\.\.\/index\.html#\/bus\/([a-z0-9]+)$/.exec(href))) assert.ok(BUS.has(m[1]), c.id + ': lezione BusLab inesistente ' + href);
      else if ((m = /^#([a-z0-9-]+)$/.exec(href))) assert.ok(ancore.has(m[1]), c.id + ': ancora inesistente ' + href);
      else if ((m = /^\.\.\/([a-z-]+)\/index\.html(#[a-z0-9/-]+)?$/.exec(href))) assert.ok(SEZIONI.includes(m[1]), c.id + ': sezione sconosciuta ' + href);
      else if (/^\.\.\/\.\.\/index\.html(#\/[a-z]*)?$/.test(href) || /^\.\.\/index\.html$/.test(href)) continue;
      else assert.fail(c.id + ': collegamento in formato non previsto ' + href + ' (usa ../<sezione>/index.html#<capitolo>)');
    }
  });
});

test('section.js registra nell\'hub gli stessi capitoli della pagina', () => {
  let registrata = null;
  global.window = { Enciclopedia: { register: (s) => { registrata = s; } } };
  global.Enciclopedia = global.window.Enciclopedia;
  try {
    delete require.cache[require.resolve(path.join(SEC, 'section.js'))];
    require(path.join(SEC, 'section.js'));
  } finally {
    delete global.window;
    delete global.Enciclopedia;
  }
  assert.ok(registrata, 'section.js non chiama Enciclopedia.register');
  assert.strictEqual(registrata.slug, 'storia-pc');
  assert.strictEqual(registrata.numero, 6);
  assert.deepStrictEqual(registrata.capitoli.map((c) => c.id), ID.concat('linea-del-tempo'));
  registrata.capitoli.slice(0, ID.length).forEach((c, i) => {
    assert.strictEqual(c.titolo, testo(capitoli[i].titolo), 'titolo diverso per ' + c.id);
    assert.strictEqual(c.periodo, capitoli[i].periodo, 'periodo diverso per ' + c.id);
    assert.strictEqual(c.href, 'storia-pc/index.html#' + c.id);
  });
});

test('le curve di accelerazione partono da 0 e arrivano a 1', () => {
  for (const k of Object.keys(P.curve)) {
    assert.ok(Math.abs(P.curve[k](0)) < 1e-6, k + '(0)');
    assert.ok(Math.abs(P.curve[k](1) - 1) < 1e-6, k + '(1)');
  }
  assert.ok(P.curve.smooth(0.5) > 0.7, 'smooth deve rallentare alla fine');
  assert.strictEqual(P.formato(17468), '17.468');
  assert.strictEqual(P.formato(4.77, 2), '4,77');
  assert.strictEqual(P.cifra(1024), '1.024');
  assert.strictEqual(P.cifra(666.66, 2), '666,66');
});
