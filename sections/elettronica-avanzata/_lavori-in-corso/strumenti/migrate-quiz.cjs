#!/usr/bin/env node
/*
 * Sposta le domande temporanee (proprietà "quiz" dei capitoli) in quiz.js.
 * Uso: node migrate-quiz.cjs <repo> [--dry]
 * - legge i capitoli con il caricatore dei test (vm) per avere gli oggetti veri;
 * - rigenera quiz.js con tutte le domande, nell'ordine dei capitoli di section.js;
 * - toglie la proprietà quiz dal sorgente di ogni capitolo (scansione con parentesi bilanciate).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const repo = process.argv[2] || '/home/user/Progetto-formazione';
const dry = process.argv.includes('--dry');
const sec = path.join(repo, 'sections/elettronica-avanzata');
const { load } = require(path.join(repo, 'tests/elettronica-avanzata.load.js'));

const ctx = load();
const order = Array.from(ctx.SEZIONE.capitoli, (c) => c.id);
const existing = Array.from(ctx.QUIZ || []);

// Trova la fine di un letterale che inizia in src[i] ('[' o '{'), saltando stringhe e commenti.
function matchBracket(src, i) {
  const open = src[i];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  for (let k = i; k < src.length; k++) {
    const c = src[k];
    if (c === '\'' || c === '"' || c === '`') {
      const q = c;
      k++;
      while (k < src.length && src[k] !== q) {
        if (src[k] === '\\') k++;
        else if (q === '`' && src[k] === '$' && src[k + 1] === '{') {
          const end = matchBracket(src, k + 1);
          k = end;
        }
        k++;
      }
      continue;
    }
    if (c === '/' && src[k + 1] === '/') { k = src.indexOf('\n', k); if (k < 0) return -1; continue; }
    if (c === '/' && src[k + 1] === '*') { k = src.indexOf('*/', k + 2) + 1; continue; }
    if (c === '[' || c === '{' || c === '(') depth++;
    if (c === ']' || c === '}' || c === ')') {
      depth--;
      if (depth === 0) {
        if (c !== close) throw new Error('parentesi non corrispondenti a ' + k);
        return k;
      }
    }
  }
  return -1;
}

function stripQuiz(src, id) {
  const re = /^([ \t]*)quiz\s*:\s*\[/gm;
  const hits = [];
  let m;
  while ((m = re.exec(src))) hits.push(m);
  if (!hits.length) return { src, removed: false };
  if (hits.length > 1) throw new Error(id + ': più di una proprietà quiz');
  const start = hits[0].index;
  const bracket = src.indexOf('[', start);
  const end = matchBracket(src, bracket);
  if (end < 0) throw new Error(id + ': fine della lista quiz non trovata');
  let stop = end + 1;
  if (src[stop] === ',') stop++;
  // Commento sulla stessa riga dopo la virgola: lo togliamo insieme.
  const nl = src.indexOf('\n', stop);
  const rest = src.slice(stop, nl < 0 ? src.length : nl);
  if (/^\s*(\/\/.*)?$/.test(rest)) stop = nl < 0 ? src.length : nl + 1;
  // Eventuale commento dedicato sulla riga precedente ("// domande temporanee ...").
  let from = start;
  const prevEnd = src.lastIndexOf('\n', start - 1);
  const prevStart = src.lastIndexOf('\n', prevEnd - 1) + 1;
  const prevLine = src.slice(prevStart, prevEnd);
  if (/^\s*\/\/.*(domand|quiz|verifica)/i.test(prevLine)) from = prevStart;
  return { src: src.slice(0, from) + src.slice(stop), removed: true };
}

function q(s) {
  return '\'' + String(s).replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\n/g, '\\n') + '\'';
}

function line(d) {
  const parts = [
    'id: ' + q(d.id),
    'chapter: ' + q(d.chapter),
    d.level != null ? 'level: ' + d.level : null,
    d.topic ? 'topic: ' + q(d.topic) : null,
    'q: ' + q(d.q),
    'options: [' + Array.from(d.options).map(q).join(', ') + ']',
    'answer: 0',
    'why: ' + q(d.why),
  ].filter(Boolean);
  return '    { ' + parts.join(', ') + ' },';
}

const problems = [];
const byChapter = {};
order.forEach((id) => { byChapter[id] = []; });
existing.forEach((d) => { (byChapter[d.chapter] = byChapter[d.chapter] || []).push(d); });

const edits = [];
order.forEach((id) => {
  const ch = ctx.chapter(id);
  if (!ch || ch.stub) { problems.push(id + ': segnaposto'); return; }
  const extra = Array.from(ch.quiz || []);
  extra.forEach((d) => {
    const copy = Object.assign({}, d, { options: Array.from(d.options), chapter: d.chapter || id });
    if (copy.chapter !== id) problems.push(d.id + ': chapter ' + copy.chapter + ' nel file ' + id);
    if (byChapter[id].some((x) => x.id === copy.id)) problems.push(copy.id + ': già presente in quiz.js, salto');
    else byChapter[id].push(copy);
  });
  const file = path.join(sec, 'chapters', id + '.js');
  const src = fs.readFileSync(file, 'utf8');
  const res = stripQuiz(src, id);
  if (extra.length && !res.removed) problems.push(id + ': ' + extra.length + ' domande ma nessuna proprietà quiz letterale da togliere');
  if (res.removed) edits.push({ file, src: res.src });
});

// Controlli del formato richiesto dal quiz dell'enciclopedia.
const ids = new Set();
order.forEach((id) => byChapter[id].forEach((d) => {
  if (ids.has(d.id)) problems.push(d.id + ': id duplicato');
  ids.add(d.id);
  if (d.answer !== 0) problems.push(d.id + ': answer diverso da 0');
  const n = d.options.length;
  if (n < 3 || n > 4) problems.push(d.id + ': ' + n + ' opzioni');
  if (new Set(d.options).size !== n) problems.push(d.id + ': opzioni ripetute');
  if (d.topic && d.topic.length > 30) problems.push(d.id + ': topic di ' + d.topic.length + ' caratteri');
  if (d.options.some((o) => /tutte le precedenti|nessuna delle precedenti/i.test(o))) problems.push(d.id + ': opzione vietata');
  // Limiti del motore del quiz (README di sections/quiz): oltre, la domanda viene scartata.
  if (String(d.q).length > 320) problems.push(d.id + ': q di ' + String(d.q).length + ' caratteri (max 320)');
  if (String(d.why).length > 600) problems.push(d.id + ': why di ' + String(d.why).length + ' caratteri (max 600)');
  d.options.forEach((o, i) => { if (String(o).length > 140) problems.push(d.id + ': opzione ' + i + ' di ' + String(o).length + ' caratteri (max 140)'); });
}));

const head = fs.readFileSync(path.join(sec, 'quiz.js'), 'utf8').split('  const domande = [')[0];
const body = order.map((id) => {
  const list = byChapter[id];
  if (!list.length) return null;
  return '    // ' + '-'.repeat(60) + ' ' + id + '\n' + list.map(line).join('\n');
}).filter(Boolean).join('\n');
const tail = '\n  ];\n\n  root.EA_QUIZ = domande;\n  if (root.QuizBank && typeof root.QuizBank.extend === \'function\') root.QuizBank.extend(\'elettronica-avanzata\', domande);\n})(typeof window !== \'undefined\' ? window : globalThis);\n';
const quizSrc = head + '  const domande = [\n' + body + tail;

console.log('domande per capitolo:', order.map((id) => id + ' ' + byChapter[id].length).join(', '));
console.log('capitoli ripuliti:', edits.map((e) => path.basename(e.file)).join(', ') || 'nessuno');
if (problems.length) console.log('PROBLEMI:\n- ' + problems.join('\n- '));
if (dry) { console.log('(prova: nessun file scritto)'); process.exit(0); }
fs.writeFileSync(path.join(sec, 'quiz.js'), quizSrc);
edits.forEach((e) => fs.writeFileSync(e.file, e.src));

// Verifica: ricarico tutto da zero.
delete require.cache[require.resolve(path.join(repo, 'tests/elettronica-avanzata.load.js'))];
const again = require(path.join(repo, 'tests/elettronica-avanzata.load.js')).load();
const left = order.filter((id) => { const c = again.chapter(id); return c && c.quiz && c.quiz.length; });
console.log('dopo: ' + Array.from(again.QUIZ).length + ' domande in quiz.js; capitoli con quiz residuo: ' + (left.join(', ') || 'nessuno'));
