#!/usr/bin/env node
/*
 * Controlli meccanici dei frammenti _parti/<id>.html contro il contratto della sezione 5
 * e dei collegamenti (ancore interne, altre sezioni, BusLab).
 * Uso: node check-parti.js [id ...]
 */
const fs = require('fs');
const path = require('path');
const DIR = '/home/user/Progetto-formazione/sections/chip-programmabili';
const ORDER = ['idea', 'memorie', 'intel-4004', 'ciclo', 'otto-bit', 'microcontrollori', 'logica-programmabile', 'sedici-bit'];
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ORDER;

// ancore note delle altre sezioni (dalla memoria del progetto) e bus di BusLab
const ALTRE = {
  'elettronica-base': 'carica corrente ohm potenza circuiti condensatore magnetismo rele alternata misure',
  'elettronica-intermedia': 'semiconduttori diodo led-zener bjt mosfet rc-filtri operazionale oscillatori alimentatore storia glossario',
  'elettronica-avanzata': 'fourier linee differenziale radio conversione clock potenza mems fotonica quantistica',
  'porte-logiche': 'boole porte calcolo interruttori famiglie integrato fabbrica struttura moore storia glossario',
  'storia-pc': 'giganti von-neumann primi-pc ibm-pc scheda-madre memoria avvio grafica prestazioni oggi linea-del-tempo',
  programmazione: 'telai logica cavi assembly fortran schede strutturata unix personal oggetti web ovunque ia atlante',
  quiz: 'chip-programmabili',
};
const buses = (() => {
  try {
    const src = fs.readFileSync(path.join(DIR, '..', '..', 'js', 'buses.js'), 'utf8');
    return new Set([...src.matchAll(/\bid:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]));
  } catch (e) { return null; }
})();

// tutti gli id della pagina completa: index.html + tutti i frammenti
const page = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const allIds = new Set([...page.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
for (const id of ORDER) {
  const f = path.join(DIR, '_parti', id + '.html');
  if (fs.existsSync(f)) for (const m of fs.readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)) allIds.add(m[1]);
  allIds.add(id);
}

const words = (html) => html.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<details class="cp-fonti"[\s\S]*?<\/details>/g, ' ')
  .replace(/<section class="cp-lab"[\s\S]*?<\/section>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ')
  .split(/\s+/).filter((w) => /[a-zà-ù0-9]/i.test(w)).length;

let problemi = 0;
for (const id of ids) {
  const f = path.join(DIR, '_parti', id + '.html');
  const out = [];
  const bad = (msg) => { out.push('  ✗ ' + msg); problemi++; };
  if (!fs.existsSync(f)) { console.log(id + ': manca il frammento'); problemi++; continue; }
  const h = fs.readFileSync(f, 'utf8');
  if (!h.includes('id="' + id + '-titolo"')) bad('manca h2 id="' + id + '-titolo"');
  if (!/class="cp-ch-head"/.test(h)) bad('manca .cp-ch-head');
  if (!/data-dip='/.test(h)) bad('manca il campione data-dip');
  if (!h.includes('data-lab="' + id + '"')) bad('manca <section class="cp-lab" data-lab="' + id + '">');
  const figs = (h.match(/<figure class="cp-fig[^"]*"/g) || []).length;
  if (figs < 2) bad('figure .cp-fig: ' + figs + ' (servono almeno 2)');
  const svgs = [...h.matchAll(/<svg\b[^>]*>/g)].map((m) => m[0]).filter((t) => !/aria-hidden="true"/.test(t));
  for (const t of svgs) if (!/role="img"/.test(t) || !/aria-label(ledby)?="/.test(t)) bad('svg senza role="img"/aria-label: ' + t.slice(0, 90));
  if (!/<(aside|div|p)[^>]*class="cp-fact[^"]*"[^>]*>\s*(<p>)?\s*<strong>Lo sapevi\?<\/strong>/.test(h)) bad('manca .cp-fact che inizia con <strong>Lo sapevi?</strong>');
  const fonti = h.match(/<details class="cp-fonti"[\s\S]*?<\/details>/);
  if (!fonti) bad('mancano le fonti'); else {
    const n = (fonti[0].match(/<li\b/g) || []).length;
    if (n < 3 || n > 6) bad('fonti: ' + n + ' (da 3 a 6)');
  }
  if (!/<nav class="cp-next"/.test(h)) bad('manca nav.cp-next');
  if (/<script\b/i.test(h)) bad('contiene <script>');
  if (/\son[a-z]+="/i.test(h)) bad('gestori inline on...=');
  if (/<img\b/i.test(h)) bad('contiene <img>');
  if (/<section class="cp-chapter"/.test(h)) bad('contiene il <section> esterno');
  // id SVG col prefisso del capitolo
  for (const m of h.matchAll(/<(linearGradient|radialGradient|marker|clipPath|pattern|filter|mask|symbol)\b[^>]*\sid="([^"]+)"/g)) {
    if (!m[2].startsWith(id + '-')) bad('id SVG senza prefisso: ' + m[2]);
  }
  // lineette lunghe come inciso
  const testo = h.replace(/<[^>]+>/g, ' ');
  const em = (testo.match(/\s—\s/g) || []).length;
  if (em) bad('lineette lunghe come inciso: ' + em);
  // collegamenti
  for (const m of h.matchAll(/href="([^"]+)"/g)) {
    const href = m[1];
    if (href.startsWith('#')) { if (!allIds.has(href.slice(1))) bad('ancora inesistente: ' + href); continue; }
    if (/^https?:/.test(href)) continue;
    let mm;
    if ((mm = href.match(/^\.\.\/\.\.\/index\.html#\/bus\/([a-z0-9-]+)$/))) { if (buses && !buses.has(mm[1])) bad('bus inesistente in BusLab: ' + href); continue; }
    if (href === '../../index.html' || href === '../index.html') continue;
    if ((mm = href.match(/^\.\.\/([a-z0-9-]+)\/(index\.html)?(#([a-z0-9/-]+))?$/))) {
      if (!mm[2]) bad('link senza index.html esplicito (lo sistema assemble.js): ' + href);
      const known = ALTRE[mm[1]];
      if (!known) { bad('sezione sconosciuta: ' + href); continue; }
      if (mm[4] && !known.split(' ').includes(mm[4].split('/')[0])) bad('ancora non nota in ' + mm[1] + ': ' + href);
      continue;
    }
    bad('link da controllare: ' + href);
  }
  // quiz
  const qf = path.join(DIR, '_parti', id + '.quiz.json');
  if (!fs.existsSync(qf)) bad('manca il quiz'); else {
    try {
      const q = JSON.parse(fs.readFileSync(qf, 'utf8'));
      if (q.length !== 5) bad('quiz: ' + q.length + ' domande (ne servono 5)');
      q.forEach((d, i) => {
        if (d.answer !== 0) bad('quiz ' + (i + 1) + ': answer non è 0');
        if (!Array.isArray(d.options) || d.options.length < 3 || d.options.length > 4) bad('quiz ' + (i + 1) + ': opzioni ' + (d.options || []).length);
        if (new Set(d.options).size !== d.options.length) bad('quiz ' + (i + 1) + ': opzioni ripetute');
        if (![1, 2, 3].includes(d.level)) bad('quiz ' + (i + 1) + ': livello ' + d.level);
        if (!d.q || !d.why) bad('quiz ' + (i + 1) + ': manca q o why');
      });
    } catch (e) { bad('quiz non valido: ' + e.message); }
  }
  // file del capitolo
  for (const rel of ['js/' + id + '.js', 'css/' + id + '.css']) if (!fs.existsSync(path.join(DIR, rel))) bad('manca ' + rel);
  const js = fs.existsSync(path.join(DIR, 'js', id + '.js')) ? fs.readFileSync(path.join(DIR, 'js', id + '.js'), 'utf8') : '';
  if (js && !js.includes("CP.lab('" + id + "'")) bad("js/" + id + ".js non registra CP.lab('" + id + "')");
  if (js && !/ctx\.done\(/.test(js)) bad('il laboratorio non chiama ctx.done()');
  if (js && !/cp-goal/.test(js + h)) bad('manca p.cp-goal');
  const css = fs.existsSync(path.join(DIR, 'css', id + '.css')) ? fs.readFileSync(path.join(DIR, 'css', id + '.css'), 'utf8') : '';
  // selettori CSS fuori dal capitolo
  const sel = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@(media|supports)[^{]*\{/g, '').replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '')
    .split('}').map((b) => b.split('{')[0].trim()).filter(Boolean);
  const pref = id.split('-').map((p) => p[0]).join('');
  for (const s of sel) for (const one of s.split(',')) {
    const t = one.trim();
    if (!t || /^(from|to|\d+%)$/.test(t)) continue;
    if (!(t.startsWith('#' + id) || /^\.[a-z0-9]+-/.test(t) || t.startsWith(':root') || t.startsWith('@'))) bad('selettore CSS globale: ' + t.slice(0, 80));
  }
  console.log(id + ': ' + words(h) + ' parole di testo, ' + figs + ' figure' + (out.length ? '\n' + out.join('\n') : ' · ok'));
}
console.log(problemi ? '\n' + problemi + ' problemi' : '\nnessun problema');
process.exitCode = problemi ? 1 : 0;
