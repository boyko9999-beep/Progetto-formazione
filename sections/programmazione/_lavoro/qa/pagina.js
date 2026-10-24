#!/usr/bin/env node
/*
 * QA dell'intera pagina della sezione: scorre tutto (montaggio pigro), prova i laboratori
 * premendo il bottone principale, controlla errori, ancore, overflow orizzontale e stati d'errore.
 *   node pagina.js --larg=1440 [--scuro] [--ridotto] [--foto=dir] [--senza-clic]
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const a = process.argv.slice(2);
const opt = (k, d) => { const x = a.find((s) => s.startsWith('--' + k + '=')); return x ? x.split('=').slice(1).join('=') : d; };
const larg = Number(opt('larg', 1440));
const scuro = a.includes('--scuro');
const ridotto = a.includes('--ridotto');
const foto = opt('foto', '');
const url = opt('url', 'file:///home/user/Progetto-formazione/sections/programmazione/index.html');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: larg, height: 900 }, colorScheme: scuro ? 'dark' : 'light', reducedMotion: ridotto ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errori = [];
  const mancanti = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errori.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => errori.push('pageerror: ' + String(e.stack || e).split('\n').slice(0, 3).join(' | ')));
  page.on('requestfailed', (r) => { if (!/enciclopedia\.js$/.test(r.url())) mancanti.push(r.url()); });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H + 900; y += 650) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(140);
  }
  await page.waitForTimeout(800);
  if (!a.includes('--senza-clic')) {
    const labs = await page.$$eval('.pg-lab[data-lab]', (els) => els.map((e) => e.dataset.lab));
    for (const id of labs) {
      const sel = '.pg-lab[data-lab="' + id + '"]';
      await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
      await page.waitForTimeout(250);
      const b = await page.$(sel + ' .pg-btn--primario:not([disabled])');
      if (b) { try { await b.click({ timeout: 2000 }); } catch (e) { errori.push('clic ' + id + ': ' + e.message.split('\n')[0]); } }
      await page.waitForTimeout(1300);
      if (foto) { fs.mkdirSync(foto, { recursive: true }); await (await page.$(sel)).screenshot({ path: path.join(foto, 'lab-' + id + '-' + larg + (scuro ? '-scuro' : '') + '.png') }); }
    }
  }
  const esito = await page.evaluate(() => {
    const ids = new Set([...document.querySelectorAll('[id]')].map((e) => e.id));
    const ancoreRotte = [...document.querySelectorAll('a[href^="#"]')].map((x) => x.getAttribute('href')).filter((h) => h.length > 1 && !ids.has(decodeURIComponent(h.slice(1))));
    const w = document.documentElement.clientWidth;
    const fuori = [];
    document.querySelectorAll('.pg-main *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || (r.right <= w + 1 && r.left >= -1)) return;
      let p = el.parentElement, tagliato = false;
      while (p && p !== document.body) { if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) { tagliato = true; break; } p = p.parentElement; }
      if (!tagliato) fuori.push(el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + ' ' + Math.round(r.left) + '→' + Math.round(r.right));
    });
    const stub = [...document.querySelectorAll('.pg-lab, .pg-fig, .pg-ciao')].filter((e) => /in costruzione|in preparazione|non è ancora disponibile|non è riuscito|non disponibile/i.test(e.textContent)).map((e) => (e.dataset.lab || e.dataset.fig || e.dataset.schermo));
    const figVuote = [...document.querySelectorAll('.pg-fig')].filter((f) => !f.querySelector('svg, canvas, img')).map((f) => f.dataset.fig);
    const testoPiccolo = [];
    document.querySelectorAll('.pg-main p, .pg-main li, .pg-main button, .pg-main label, .pg-main span, .pg-main td').forEach((el) => {
      if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
      if (el.closest('[aria-hidden="true"], .pg-sr') || !el.getClientRects().length) return;
      const st = getComputedStyle(el);
      const fs = parseFloat(st.fontSize);
      if (fs < 11 || (fs < 12 && st.textTransform !== 'uppercase')) testoPiccolo.push((el.closest('[data-lab],[data-fig],[data-schermo]') || {}).dataset ? JSON.stringify((el.closest('[data-lab],[data-fig],[data-schermo]') || { dataset: {} }).dataset) + ' ' + fs + 'px "' + el.textContent.trim().slice(0, 30) + '"' : '');
    });
    return {
      altezza: document.documentElement.scrollHeight,
      capitoli: document.querySelectorAll('.pg-cap').length,
      labs: document.querySelectorAll('.pg-lab').length,
      figure: document.querySelectorAll('.pg-fig').length,
      schermi: document.querySelectorAll('.pg-ciao').length,
      termini: document.querySelectorAll('.pg-term').length,
      ancoreRotte: [...new Set(ancoreRotte)],
      overflow: document.documentElement.scrollWidth > w,
      fuori: fuori.slice(0, 15),
      stub,
      figVuote,
      testoPiccolo: [...new Set(testoPiccolo)].slice(0, 25),
      esterni: [...new Set([...document.querySelectorAll('a[href]')].map((x) => x.getAttribute('href')).filter((h) => /^\.\.\//.test(h)))],
    };
  });
  console.log(JSON.stringify({ larg, scuro, ridotto, secondi: Math.round((Date.now() - t0) / 1000), errori: [...new Set(errori)].slice(0, 30), mancanti, ...esito }, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
