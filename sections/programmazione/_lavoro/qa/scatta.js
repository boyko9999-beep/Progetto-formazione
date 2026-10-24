#!/usr/bin/env node
/*
 * QA visiva della sezione "programmazione" con Playwright (Chromium preinstallato).
 *
 * Uso:
 *   node scatta.js [opzioni]
 *     --hash telai              ancora da aprire (capitolo o altro id), default nessuna
 *     --sel '[data-lab="jacquard"]'   elemento da fotografare (default: viewport)
 *     --larg 1440 --alt 900     dimensioni della finestra (default 1440x900)
 *     --scuro                   tema scuro (prefers-color-scheme: dark)
 *     --ridotto                 prefers-reduced-motion: reduce
 *     --attesa 1500             millisecondi di attesa dopo lo scorrimento (default 1200)
 *     --clic 'selettore'        clic su un elemento prima della foto (ripetibile, eseguiti in ordine)
 *     --pausa 800               attesa dopo ogni clic (default 600)
 *     --eval 'codice JS'        valuta codice nella pagina e stampa il risultato (dopo i clic)
 *     --pagina                  foto dell'intera pagina
 *     --out /percorso/foto.png  file di uscita (default ./foto.png)
 * Stampa un JSON con errori di console, errori della pagina, risorse non caricate
 * e un controllo di overflow orizzontale. Il 404 di ../enciclopedia.js è atteso
 * finché l'hub non è unito: viene segnalato a parte come "atteso".
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const args = process.argv.slice(2);
const opz = { clic: [] };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  const v = () => args[++i];
  if (a === '--hash') opz.hash = v();
  else if (a === '--sel') opz.sel = v();
  else if (a === '--larg') opz.larg = Number(v());
  else if (a === '--alt') opz.alt = Number(v());
  else if (a === '--scuro') opz.scuro = true;
  else if (a === '--ridotto') opz.ridotto = true;
  else if (a === '--attesa') opz.attesa = Number(v());
  else if (a === '--clic') opz.clic.push(v());
  else if (a === '--pausa') opz.pausa = Number(v());
  else if (a === '--eval') opz.eval = v();
  else if (a === '--pagina') opz.pagina = true;
  else if (a === '--out') opz.out = v();
  else if (a === '--url') opz.url = v();
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: opz.larg || 1440, height: opz.alt || 900 },
    colorScheme: opz.scuro ? 'dark' : 'light',
    reducedMotion: opz.ridotto ? 'reduce' : 'no-preference',
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errori = [];
  const avvisi = [];
  const risorse = [];
  const attesi = [];
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error') {
      if (/Failed to load resource/.test(t)) return; // già contato in requestfailed
      errori.push(t);
    } else if (m.type() === 'warning') avvisi.push(t);
  });
  page.on('pageerror', (e) => errori.push('pageerror: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : String(e))));
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (/enciclopedia\.js$/.test(u)) attesi.push(u.split('/').slice(-2).join('/'));
    else risorse.push(u);
  });
  const base = opz.url || ('file://' + path.resolve('/home/user/Progetto-formazione/sections/programmazione/index.html'));
  await page.goto(base + (opz.hash ? '#' + opz.hash : ''), { waitUntil: 'load' });
  await page.waitForTimeout(400);
  if (opz.sel) {
    const el = await page.$(opz.sel);
    if (!el) { console.log(JSON.stringify({ errore: 'selettore non trovato: ' + opz.sel, errori }, null, 2)); await browser.close(); process.exit(2); }
    await el.scrollIntoViewIfNeeded();
  }
  await page.waitForTimeout(opz.attesa == null ? 1200 : opz.attesa);
  for (const c of opz.clic) {
    try { await page.click(c, { timeout: 4000 }); } catch (e) { errori.push('clic fallito: ' + c + ' (' + e.message.split('\n')[0] + ')'); }
    await page.waitForTimeout(opz.pausa == null ? 600 : opz.pausa);
  }
  let valutato;
  if (opz.eval) {
    try { valutato = await page.evaluate(opz.eval); } catch (e) { valutato = 'errore: ' + e.message; }
  }
  const overflow = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const larghi = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > w + 1 || r.left < -1)) {
        const st = getComputedStyle(el);
        if (st.position === 'fixed' || st.visibility === 'hidden') return;
        let p = el.parentElement, clipped = false;
        while (p && p !== document.body) {
          const ps = getComputedStyle(p);
          if (/(auto|scroll|hidden|clip)/.test(ps.overflowX)) { clipped = true; break; }
          p = p.parentElement;
        }
        if (!clipped) larghi.push((el.className && typeof el.className === 'string' ? el.tagName.toLowerCase() + '.' + el.className.split(' ')[0] : el.tagName.toLowerCase()) + ' ' + Math.round(r.left) + '→' + Math.round(r.right));
      }
    });
    return { scrollWidth: document.documentElement.scrollWidth, clientWidth: w, elementiFuori: larghi.slice(0, 12) };
  });
  const out = path.resolve(opz.out || 'foto.png');
  if (opz.sel && !opz.pagina) {
    const el = await page.$(opz.sel);
    await el.screenshot({ path: out });
  } else {
    await page.screenshot({ path: out, fullPage: !!opz.pagina });
  }
  console.log(JSON.stringify({ foto: out, errori, avvisi: avvisi.slice(0, 10), risorseMancanti: risorse, attesi, overflowOrizzontale: overflow.scrollWidth > overflow.clientWidth, overflow, valutato }, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
