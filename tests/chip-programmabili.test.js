// Sezione 5 · Primi chip programmabili: integrità della pagina e test dei laboratori.
// node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', 'sections', 'chip-programmabili');
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const sezione = require(path.join(DIR, 'section.js'));

test('section.js registra la sezione 5 con 8 capitoli', () => {
  assert.strictEqual(sezione.slug, 'chip-programmabili');
  assert.strictEqual(sezione.numero, 5);
  assert.strictEqual(sezione.capitoli.length, 8);
  for (const c of sezione.capitoli) {
    assert.match(c.id, /^[a-z0-9-]+$/);
    assert.ok(c.titolo && c.descrizione && c.periodo, 'campi del capitolo ' + c.id);
  }
});

test('ogni capitolo registrato esiste nella pagina, con titolo e indice', () => {
  for (const c of sezione.capitoli) {
    assert.ok(html.includes('<section class="cp-chapter" id="' + c.id + '"'), 'sezione ' + c.id);
    assert.ok(html.includes('id="' + c.id + '-titolo"'), 'titolo h2 di ' + c.id);
    assert.ok(html.includes('data-cap="' + c.id + '"'), 'voce di indice per ' + c.id);
  }
});

test('ogni laboratorio della pagina ha il suo script registrato', () => {
  const labs = [...html.matchAll(/data-lab="([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.ok(labs.length >= 8, 'almeno un laboratorio per capitolo');
  const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map((m) => fs.readFileSync(path.join(DIR, m[1]), 'utf8')).join('\n');
  for (const id of labs) assert.ok(scripts.includes("CP.lab('" + id + "'"), 'CP.lab per ' + id);
});

test('i file locali collegati dalla pagina esistono', () => {
  const refs = [...html.matchAll(/(?:href|src)="([^"#:]+)(?:#[^"]*)?"/g)].map((m) => m[1]).filter((r) => r && !r.startsWith('data:'));
  for (const r of refs) {
    // ../<sezione>/index.html e ../enciclopedia.js sono di altre sezioni o dell'hub: si controllano solo i file di questa sezione e di BusLab
    if (/^\.\.\/(?!\.\.\/)/.test(r)) continue;
    assert.ok(fs.existsSync(path.join(DIR, r)), 'manca ' + r);
  }
});

test('gli id della pagina sono unici', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepStrictEqual(dup, []);
});

test('quiz.js: domande nel formato del quiz dell\'enciclopedia', () => {
  const file = path.join(DIR, 'quiz.js');
  if (!fs.existsSync(file)) return;
  const domande = require(file);
  const capitoli = new Set(sezione.capitoli.map((c) => c.id));
  assert.ok(domande.length >= 8, 'almeno una domanda per capitolo');
  for (const d of domande) {
    assert.ok(capitoli.has(d.chapter), 'capitolo sconosciuto ' + d.chapter);
    assert.strictEqual(d.answer, 0, 'la risposta giusta va per prima in ' + d.id);
    assert.ok(d.options.length >= 3 && d.options.length <= 4, 'da 3 a 4 opzioni in ' + d.id);
    assert.strictEqual(new Set(d.options).size, d.options.length, 'opzioni ripetute in ' + d.id);
    assert.ok(d.q && d.why, 'domanda e spiegazione in ' + d.id);
    assert.ok([1, 2, 3].includes(d.level), 'livello di ' + d.id);
  }
});

// test della logica pura dei laboratori (sections/chip-programmabili/test/*.test.js)
const T = path.join(DIR, 'test');
if (fs.existsSync(T)) {
  for (const f of fs.readdirSync(T).filter((x) => x.endsWith('.test.js')).sort()) require(path.join(T, f));
}
