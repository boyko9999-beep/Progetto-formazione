// Carica core.js e i capitoli in Node, senza browser, per provare i modelli fisici.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'js', 'core.js'));
const EI = globalThis.EI;

function chapter(id) {
  let def = EI.chapters.find((c) => c.id === id);
  if (!def) {
    require(path.join(ROOT, 'chapters', id + '.js'));
    def = EI.chapters.find((c) => c.id === id);
  }
  if (!def) throw new Error('Il file chapters/' + id + '.js non registra il capitolo "' + id + '"');
  return def;
}

// Tutti i capitoli che esistono già su disco, nell'ordine di section.js.
function allChapters() {
  const order = sectionManifest().capitoli.map((c) => c.id);
  return order.filter((id) => fs.existsSync(path.join(ROOT, 'chapters', id + '.js'))).map(chapter);
}

function sectionManifest() {
  const saved = globalThis.window;
  const fake = {};
  globalThis.window = fake;
  try {
    delete require.cache[require.resolve(path.join(ROOT, 'section.js'))];
    require(path.join(ROOT, 'section.js'));
  } finally {
    globalThis.window = saved;
  }
  return fake.EI_SEZIONE;
}

module.exports = { EI, chapter, allChapters, sectionManifest, ROOT };
