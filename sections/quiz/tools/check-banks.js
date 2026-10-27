#!/usr/bin/env node
/*
 * Controlla le banche di domande del quiz.
 *   node sections/quiz/tools/check-banks.js                 tutte le banche
 *   node sections/quiz/tools/check-banks.js porte-logiche   solo una banca
 *   aggiungi --hints per vedere i valori calcolati (resistori, tabelle di verità, soluzioni)
 * Esce con codice 1 se trova errori.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const QUIZ = path.join(__dirname, '..');
const args = process.argv.slice(2);
const hints = args.includes('--hints');
const only = args.filter((a) => !a.startsWith('--'));

const C = require(path.join(QUIZ, 'core.js'));
require(path.join(QUIZ, '..', '..', 'js', 'buses.js'));

// Intercetta register/extend per validare le banche così come sono scritte, prima della normalizzazione.
const raw = [];
const extensions = [];
const register = C.QuizBank.register.bind(C.QuizBank);
const extend = C.QuizBank.extend.bind(C.QuizBank);
C.QuizBank.register = (bank) => { raw.push(bank); return register(bank); };
C.QuizBank.extend = (slug, list) => { extensions.push({ slug: slug, questions: list }); return extend(slug, list); };

const files = fs.readdirSync(path.join(QUIZ, 'banks')).filter((f) => f.endsWith('.js')).sort();
for (const f of files) {
  const slug = f.replace(/\.js$/, '');
  if (only.length && !only.some((o) => slug === o || slug.startsWith(o + '-'))) continue;
  try {
    require(path.join(QUIZ, 'banks', f));
  } catch (e) {
    console.error('✗ ' + f + ': il file non si carica: ' + e.message);
    process.exitCode = 1;
  }
}

function tally(list, key) {
  const t = {};
  list.forEach((q) => { const k = key(q); t[k] = (t[k] || 0) + 1; });
  return Object.entries(t).map(([k, v]) => k + ' ' + v).join(', ');
}

function hint(q) {
  const type = q.type || 'choice';
  const bits = [];
  if (q.figure && q.figure.kind === 'resistor') {
    const v = C.resistorValue(q.figure.bands);
    if (v) bits.push('resistore = ' + C.formatOhms(v.ohms) + ' ±' + v.tolerance + '%');
  }
  if (type === 'choice') bits.push('giusta: ' + q.options[q.answer]);
  if (type === 'truefalse') bits.push('giusta: ' + (q.answer ? 'Vero' : 'Falso'));
  if (type === 'number') bits.push('valore ' + q.value + ' ' + (q.unit || '') + ' (tolleranza ±' + C.toleranceOf(q) + ')');
  if (type === 'bits') bits.push(q.value + ' = ' + C.toBinary(q.value, q.width) + ' = 0x' + q.value.toString(16).toUpperCase());
  if (type === 'truth' || type === 'logic') {
    const t = C.truthRows(q.expr);
    bits.push(t.names.join('') + ' → ' + t.rows.map((r) => t.names.map((n) => r.inputs[n]).join('') + ':' + r.out).join(' '));
    if (type === 'logic') bits.push(t.rows.filter((r) => r.out === q.target).length + ' combinazioni danno ' + q.target);
  }
  if (q.figure && q.figure.kind === 'bits') bits.push('figura ' + q.figure.value + ' = ' + C.toBinary(q.figure.value, q.figure.width));
  return bits.join(' | ');
}

const banks = only.length ? raw.filter((b) => only.includes(b.slug)) : raw;
let errors = 0;
let warnings = 0;
const allIds = new Map();

for (const bank of banks) {
  const more = extensions.filter((x) => x.slug === bank.slug).flatMap((x) => x.questions);
  const questions = (bank.questions || []).concat(more);
  const errs = C.validateBank(Object.assign({}, bank, { questions: questions }), true);
  const warns = [];
  questions.forEach((q, i) => {
    if (!q) return;
    warns.push(...C.lintQuestion(q, bank.slug + ' #' + (i + 1) + (q.id ? ' (' + q.id + ')' : '')));
    if (q.id) {
      if (allIds.has(q.id) && allIds.get(q.id) !== bank.slug) errs.push(bank.slug + ': id ' + q.id + ' già usato in ' + allIds.get(q.id));
      allIds.set(q.id, bank.slug);
    }
  });
  if (Array.isArray(bank.chapters)) {
    const ids = bank.chapters.map((c) => c.id);
    questions.forEach((q, i) => {
      if (q && q.chapter && !ids.includes(q.chapter)) errs.push(bank.slug + ' #' + (i + 1) + ': chapter "' + q.chapter + '" non è tra i capitoli della banca');
    });
    bank.chapters.forEach((c) => {
      const n = questions.filter((q) => q && q.chapter === c.id).length;
      if (n < 2) warns.push(bank.slug + ': il capitolo "' + c.id + '" ha solo ' + n + ' domande (servono almeno 2)');
    });
  }

  console.log('\n■ ' + bank.slug + ' — ' + bank.title + ': ' + questions.length + ' domande');
  console.log('  livelli: ' + tally(questions, (q) => 'L' + (q.level || '?')));
  console.log('  tipi:    ' + tally(questions, (q) => q.type || 'choice'));
  console.log('  figure:  ' + tally(questions.filter((q) => q.figure), (q) => q.figure.kind));
  if (questions.some((q) => q.chapter)) console.log('  capitoli: ' + tally(questions, (q) => q.chapter || '(nessuno)'));
  errs.forEach((e) => console.log('  ✗ ' + e));
  warns.forEach((w) => console.log('  ! ' + w));
  if (hints) {
    questions.forEach((q) => {
      if (!q) return;
      console.log('  · ' + (q.id || '?') + ' [' + (q.type || 'choice') + ' L' + q.level + (q.chapter ? ' ' + q.chapter : '') + '] ' + q.q);
      const h = hint(q);
      if (h) console.log('      ' + h);
    });
  }
  errors += errs.length;
  warnings += warns.length;
}

console.log('\n' + (errors ? '✗ ' : '✓ ') + errors + ' errori, ' + warnings + ' avvisi in ' + banks.length + ' banche.');
if (errors) process.exitCode = 1;
