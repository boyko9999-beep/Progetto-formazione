#!/usr/bin/env node
/*
 * Controllo in browser di più pagine della sezione, due alla volta, con riepilogo compatto.
 * Uso: node all.cjs --out <cartella> [--routes home,storia,fourier,...] [--viewports ...] [--jobs 2] [--interact] [--reduced]
 * La rotta "home" corrisponde all'indice (hash vuoto).
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes('--' + k);
const out = arg('out');
if (!out) { console.error('manca --out'); process.exit(2); }
const ALL = ['home', 'storia', 'fourier', 'linee', 'differenziale', 'radio', 'conversione', 'clock', 'potenza', 'mems', 'fotonica', 'quantistica'];
const routes = (arg('routes') || ALL.join(',')).split(',').filter(Boolean);
const viewports = arg('viewports', '1440x900,390x844');
const jobs = +arg('jobs', 2);
const shoot = path.join(__dirname, 'shoot.cjs');

function run(route) {
  return new Promise((resolve) => {
    const dir = path.join(out, route);
    const a = [shoot, '--route', route === 'home' ? '' : route, '--out', dir, '--viewports', viewports, '--themes', 'light,dark'];
    if (has('interact')) a.push('--interact');
    if (has('reduced')) a.push('--reduced');
    const p = spawn('node', a, { cwd: '/home/user/Progetto-formazione', stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    p.stdout.on('data', (d) => { log += d; });
    p.stderr.on('data', (d) => { log += d; });
    p.on('close', (code) => {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'log.txt'), log);
      resolve({ route, code, dir });
    });
  });
}

function summarize(r) {
  const file = path.join(r.dir, 'report.json');
  if (!fs.existsSync(file)) return [r.route + ': NESSUN REPORT (exit ' + r.code + ')'];
  const rep = JSON.parse(fs.readFileSync(file, 'utf8'));
  return rep.runs.map((x) => {
    const m = x.metrics || {};
    const bad = [];
    if ((x.errors || []).length) bad.push('errori ' + x.errors.length + ': ' + x.errors.slice(0, 2).join(' | ').slice(0, 160));
    if (m.scrollWidth > m.innerWidth) bad.push('overflow ' + m.scrollWidth + '>' + m.innerWidth);
    if ((m.clippedText || []).length) bad.push('tagliati ' + m.clippedText.length);
    if ((m.unnamed || []).length) bad.push('senza nome ' + m.unnamed.length);
    if ((m.unlabeledImg || []).length) bad.push('img senza etichetta ' + m.unlabeledImg.length);
    if (m.stub) bad.push('SEGNAPOSTO');
    if (m.errorBox) bad.push('ERRORE DI MONTAGGIO');
    const still = (x.motion || []).filter((c) => !c.changed).map((c) => c.canvas);
    if (still.length && !/reduced/.test(x.tag)) bad.push('fermi: ' + still.join(', '));
    const moving = (x.motion || []).filter((c) => c.changed).map((c) => c.canvas);
    if (moving.length && /reduced/.test(x.tag)) bad.push('si muovono con movimento ridotto: ' + moving.join(', '));
    if (x.interaction && (x.interaction.newErrors || []).length) bad.push('errori interazione ' + x.interaction.newErrors.length);
    const fps = m.fps != null ? ' fps ' + m.fps : '';
    return r.route.padEnd(14) + x.tag.padEnd(22) + (bad.length ? 'KO ' + bad.join('; ') : 'ok') + fps;
  });
}

(async () => {
  const queue = routes.slice();
  const results = [];
  await Promise.all(Array.from({ length: jobs }, async () => {
    while (queue.length) {
      const r = await run(queue.shift());
      results.push(r);
      console.log(summarize(r).join('\n'));
    }
  }));
})();
