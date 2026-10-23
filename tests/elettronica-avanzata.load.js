// Carica la sezione Elettronica avanzata in un contesto isolato, senza DOM, per i test.
// Attenzione: oggetti e array arrivano da un altro "realm", quindi per confrontarli
// si usano valori semplici o JSON.parse(JSON.stringify(...)) invece di deepStrictEqual diretto.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const DIR = path.join(__dirname, '..', 'sections', 'elettronica-avanzata');

function load() {
  const sandbox = { console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const run = (rel) => vm.runInContext(fs.readFileSync(path.join(DIR, rel), 'utf8'), sandbox, { filename: rel });
  run('section.js');
  run('quiz.js');
  run('js/engine.js');
  const SEZIONE = sandbox.EA_SEZIONE;
  for (const c of SEZIONE.capitoli) run('chapters/' + c.id + '.js');
  return { EA: sandbox.EA, SEZIONE, QUIZ: sandbox.EA_QUIZ, chapter: (id) => sandbox.EA.chapter(id) };
}

module.exports = { load, DIR };
