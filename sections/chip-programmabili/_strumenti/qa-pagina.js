#!/usr/bin/env node
/*
 * Verifica della pagina completa della sezione 5: scorre tutta la pagina come un lettore,
 * fotografa testata e laboratorio di ogni capitolo, raccoglie errori, overflow e numeri utili.
 * Uso: node qa-pagina.js --out /percorso/prefisso [--width 1440] [--height 900] [--dark] [--reduced]
 *      [--cap idea,memorie] [--head] [--file]   (--file apre la pagina da file:// invece che dal server)
 */
const { chromium } = require('playwright');
const path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes('--' + k);
const W = +arg('width', 1440), H = +arg('height', 900);
const OUT = arg('out', '/tmp/qa');
const CAPS = (arg('cap', 'idea,memorie,intel-4004,ciclo,otto-bit,microcontrollori,logica-programmabile,sedici-bit')).split(',');
const URL = has('file') ? 'file:///home/user/Progetto-formazione/sections/chip-programmabili/index.html'
  : 'http://127.0.0.1:8765/sections/chip-programmabili/index.html';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: has('dark') ? 'dark' : 'light', reducedMotion: has('reduced') ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [], failed = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => failed.push('FAILED ' + r.url() + ' ' + (r.failure() || {}).errorText));
  page.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'load' });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(800);
  // scorre tutta la pagina a passi, come un lettore veloce
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += Math.round(H * 0.8)) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(60); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const shots = [];
  for (const id of CAPS) {
    if (has('head')) {
      await page.evaluate((i) => document.getElementById(i).scrollIntoView({ block: 'start' }), id);
      await page.waitForTimeout(900);
      const f = OUT + '-' + id + '-testata.png';
      await page.screenshot({ path: f });
      shots.push(f);
    }
    const lab = await page.$('#' + id + ' .cp-lab');
    if (!lab) { errors.push('manca il laboratorio di ' + id); continue; }
    await lab.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1600);
    const box = await lab.boundingBox();
    const f = OUT + '-' + id + '-lab.png';
    await page.screenshot({ path: f, fullPage: true, clip: { x: 0, y: box.y + (await page.evaluate(() => window.scrollY)), width: W, height: Math.min(box.height, 2200) } });
    shots.push(f);
  }
  const info = await page.evaluate(() => {
    const labs = [...document.querySelectorAll('.cp-lab')].map((l) => ({ lab: l.dataset.lab, montato: !!l.querySelector('.cp-lab-mount') && l.querySelector('.cp-lab-mount').childElementCount > 0, nodiSvg: l.querySelectorAll('svg *').length, alto: Math.round(l.getBoundingClientRect().height) }));
    const doc = document.documentElement;
    const over = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > doc.clientWidth + 1 && getComputedStyle(e).position !== 'fixed'; })
      .filter((e) => !e.closest('.cp-drawer ol, [data-scroll], .cp-scroll, pre, .table-wrap')).slice(0, 6).map((e) => e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + ' → ' + Math.round(e.getBoundingClientRect().right));
    return { overflowX: doc.scrollWidth - doc.clientWidth, altezza: doc.scrollHeight, nodi: document.getElementsByTagName('*').length, nodiSvg: document.querySelectorAll('svg *').length, labs, sporgenti: over,
      fatti: (document.getElementById('cp-fatti') || {}).textContent, titoli: [...document.querySelectorAll('.cp-ch-head h2')].map((h) => Math.round(h.getBoundingClientRect().height)) };
  });
  console.log(JSON.stringify({ url: URL, viewport: W + 'x' + H, dark: has('dark'), reduced: has('reduced'), loadMs, errors, failed: failed.filter((x) => !/enciclopedia\.js/.test(x)), info, shots }, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
