// Contratto dei capitoli: campi obbligatori, glossario coerente, collegamenti validi.
const test = require('node:test');
const assert = require('node:assert');
const { allChapters, sectionManifest } = require('./harness.js');

const SLUGS = ['elettronica-base', 'elettronica-intermedia', 'elettronica-avanzata', 'porte-logiche', 'chip-programmabili', 'storia-pc', 'programmazione', 'quiz'];
const chapters = allChapters();
const manifest = sectionManifest();
const ids = manifest.capitoli.map((c) => c.id);

// Glossario unito di tutti i capitoli presenti.
const glossary = {};
chapters.forEach((c) => Object.assign(glossary, c.glossary || {}));

function richFields(c) {
  const out = [c.summary, c.fun, c.uses, c.lab && c.lab.intro];
  (c.how || []).forEach((x) => out.push(x));
  ((c.history && c.history.text) || []).forEach((x) => out.push(x));
  ((c.history && c.history.events) || []).forEach((e) => out.push(e.text));
  (c.figures || []).forEach((f) => out.push(f.caption));
  (c.formulas || []).forEach((f) => { out.push(f.note); (f.legend || []).forEach((l) => out.push(l[1])); });
  return out.filter(Boolean);
}

test('contratto: section.js elenca 9 capitoli con id unici', () => {
  assert.strictEqual(manifest.slug, 'elettronica-intermedia');
  assert.strictEqual(ids.length, 9);
  assert.strictEqual(new Set(ids).size, 9);
  manifest.capitoli.forEach((c) => assert.ok(c.titolo && c.descrizione, c.id + ' senza titolo o descrizione'));
});

for (const c of chapters) {
  test('contratto: ' + c.id + ' ha i campi richiesti', () => {
    assert.ok(ids.includes(c.id), 'id non presente in section.js');
    assert.ok(typeof c.summary === 'string' && c.summary.length > 80, 'summary troppo corto');
    assert.ok(c.lab && typeof c.lab.mount === 'function' && c.lab.title, 'lab.mount o lab.title mancanti');
    assert.ok(Array.isArray(c.how) && c.how.length >= 4, 'servono almeno 4 passi in how');
    assert.ok(Array.isArray(c.figures) && c.figures.length >= 1, 'serve almeno una figura');
    c.figures.forEach((f) => assert.ok((f.svg && /^<svg[\s>]/.test(f.svg.trim())) || typeof f.draw === 'function', 'figura senza svg'));
    assert.ok(c.history && Array.isArray(c.history.text) && c.history.text.length >= 2, 'storia: servono almeno 2 paragrafi');
    assert.ok(Array.isArray(c.history.events) && c.history.events.length >= 3, 'storia: servono almeno 3 tappe');
    c.history.events.forEach((e) => assert.ok(Number.isInteger(e.year) && e.year > 1700 && e.year <= 2026 && e.title, 'tappa non valida: ' + JSON.stringify(e)));
    assert.ok(c.fun && c.uses, 'mancano fun o uses');
    assert.ok(c.model && typeof c.model === 'object', 'manca il modello fisico');
    assert.ok(Array.isArray(c.keywords) && c.keywords.length >= 3, 'servono almeno 3 parole chiave');
  });

  test('contratto: ' + c.id + ' usa solo termini del glossario esistenti', () => {
    for (const k of c.keywords) assert.ok(glossary[k], 'parola chiave senza definizione: ' + k);
    for (const k in c.glossary || {}) {
      const g = c.glossary[k];
      assert.ok(/^[a-z0-9-]+$/.test(k), 'id di glossario non valido: ' + k);
      assert.ok(g.term && g.def && g.def.length > 30, 'definizione troppo corta: ' + k);
    }
    for (const txt of richFields(c)) {
      for (const m of String(txt).matchAll(/\[\[([a-z0-9-]+)(?:\|[^\]]+)?\]\]/g)) {
        assert.ok(glossary[m[1]], 'termine [[' + m[1] + ']] senza definizione nel glossario');
      }
    }
  });

  test('contratto: ' + c.id + ' ha collegamenti validi', () => {
    for (const l of c.links || []) {
      assert.ok(l.title && l.href, 'collegamento senza titolo');
      const ext = /^\.\.\/([a-z-]+)\/index\.html(#[a-z0-9-]+)?$/.exec(l.href);
      const int = /^#([a-z0-9-]+)$/.exec(l.href);
      assert.ok(ext || int, 'formato non valido (usa ../<sezione>/index.html#id o #capitolo): ' + l.href);
      if (ext) assert.ok(SLUGS.includes(ext[1]), 'sezione sconosciuta: ' + ext[1]);
      if (int) assert.ok(ids.includes(int[1]) || int[1] === 'storia' || int[1] === 'glossario', 'capitolo sconosciuto: ' + int[1]);
    }
  });
}
