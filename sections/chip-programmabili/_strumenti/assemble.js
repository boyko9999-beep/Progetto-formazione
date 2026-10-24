#!/usr/bin/env node
/*
 * Inserisce i capitoli di _parti/<id>.html dentro index.html e aggiorna i tag <link>/<script>.
 * Uso: node assemble.js [--finale] [--out NOME.html]
 *   --finale   toglie i segnaposto (poi si cancellano a mano _parti/ e _anteprima.html)
 *   --out      scrive la pagina in DIR/NOME.html invece di index.html e non tocca quiz.js (prove di integrazione)
 */
const fs = require('fs');
const path = require('path');
const DIR = '/home/user/Progetto-formazione/sections/chip-programmabili';
const ORDER = ['idea', 'memorie', 'intel-4004', 'ciclo', 'otto-bit', 'microcontrollori', 'logica-programmabile', 'sedici-bit'];
const finale = process.argv.includes('--finale');
const outArg = process.argv.indexOf('--out');
const OUT = outArg > 0 ? process.argv[outArg + 1] : 'index.html';
let html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const report = [];
for (const id of ORDER) {
  const file = path.join(DIR, '_parti', id + '.html');
  const re = new RegExp('(<!-- @parte ' + id + ' -->)[\\s\\S]*?(<!-- /parte ' + id + ' -->)');
  if (!re.test(html)) { report.push(id + ': segnaposto assente'); continue; }
  if (!fs.existsSync(file)) { report.push(id + ': manca la parte'); continue; }
  // collegamenti tra sezioni sempre con index.html esplicito: con file:// una cartella non apre il suo index
  const raw = fs.readFileSync(file, 'utf8').replace(/href="\.\.\/([a-z0-9-]+)\/(#[^"]*)?"/g, (m, dir, hash) => 'href="../' + dir + '/index.html' + (hash || '') + '"');
  const body = raw.trim().split('\n').map((l) => (l ? '        ' + l : l)).join('\n');
  html = html.replace(re, (m, a, b) => a + '\n' + body + '\n        ' + b);
  report.push(id + ': ok (' + body.length + ' caratteri)');
}
const css = ORDER.filter((id) => fs.existsSync(path.join(DIR, 'css', id + '.css'))).map((id) => '  <link rel="stylesheet" href="css/' + id + '.css">');
html = html.replace(/(<!-- @stili -->)[\s\S]*?(<!-- \/stili -->)/, (m, a, b) => a + '\n' + css.join('\n') + (css.length ? '\n' : '') + '  ' + b);
const js = [];
for (const id of ORDER) {
  if (fs.existsSync(path.join(DIR, 'js', id + '-core.js'))) js.push('  <script src="js/' + id + '-core.js"></script>');
  if (fs.existsSync(path.join(DIR, 'js', id + '.js'))) js.push('  <script src="js/' + id + '.js"></script>');
}
html = html.replace(/(<!-- @script -->)[\s\S]*?(<!-- \/script -->)/, (m, a, b) => a + '\n' + js.join('\n') + (js.length ? '\n' : '') + '  ' + b);
// quiz.js: le domande scritte dagli autori dei capitoli (_parti/<id>.quiz.json)
const lit = (v) => (typeof v === 'string' ? "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'" : Array.isArray(v) ? '[' + v.map(lit).join(', ') + ']' : String(v));
const quiz = [];
for (const id of ORDER) {
  const f = path.join(DIR, '_parti', id + '.quiz.json');
  if (!fs.existsSync(f)) continue;
  try {
    JSON.parse(fs.readFileSync(f, 'utf8')).forEach((q, i) => quiz.push(Object.assign({}, q, { chapter: id, answer: 0, id: id + '-' + (i + 1) })));
  } catch (e) { report.push(id + ': quiz non valido, ' + e.message); }
}
if (quiz.length && OUT === 'index.html') {
  const keys = ['id', 'chapter', 'level', 'topic', 'q', 'options', 'answer', 'why'];
  const rows = quiz.map((q) => '    { ' + keys.filter((k) => q[k] != null).map((k) => k + ': ' + lit(q[k])).join(', ') + ' },');
  const js = [
    '/*',
    ' * Domande della sezione 5 per il quiz dell\'enciclopedia (../quiz/index.html#chip-programmabili).',
    ' * La risposta giusta è sempre la prima (answer: 0): il motore del quiz mescola le opzioni.',
    ' */',
    '(function (root) {',
    "  'use strict';",
    '',
    '  const domande = [',
    ...rows,
    '  ];',
    '',
    "  if (root.QuizBank && typeof root.QuizBank.extend === 'function') root.QuizBank.extend('chip-programmabili', domande);",
    "  if (typeof module !== 'undefined' && module.exports) module.exports = domande;",
    "})(typeof window !== 'undefined' ? window : globalThis);",
    '',
  ].join('\n');
  fs.writeFileSync(path.join(DIR, 'quiz.js'), js);
  report.push('quiz.js: ' + quiz.length + ' domande');
}
if (finale) {
  html = html.replace(/[ \t]*<!-- @parte [a-z0-9-]+ -->\n/g, '').replace(/\n?[ \t]*<!-- \/parte [a-z0-9-]+ -->/g, '')
    .replace(/[ \t]*<!-- @stili -->\n/, '').replace(/[ \t]*<!-- \/stili -->\n/, '')
    .replace(/[ \t]*<!-- @script -->\n/, '').replace(/[ \t]*<!-- \/script -->\n/, '');
}
fs.writeFileSync(path.join(DIR, OUT), html);
console.log(report.join('\n'));
console.log('css:', css.length, 'script:', js.length, finale ? '(finale)' : '');
