#!/usr/bin/env node
/*
 * Screenshot e controllo errori con Playwright (Chromium preinstallato).
 * Uso:
 *   node shot.js --url URL --out /percorso/prefisso [opzioni]
 * Opzioni:
 *   --width 1440 --height 900   finestra (default 1440x900; per il telefono usa --width 390 --height 844)
 *   --dark                      tema scuro (prefers-color-scheme: dark)
 *   --reduced                   prefers-reduced-motion: reduce
 *   --full                      pagina intera
 *   --el SELETTORE              fotografa solo questo elemento
 *   --scroll SELETTORE          porta in vista l'elemento prima di tutto (serve a montare i laboratori)
 *   --wait MS                   attesa dopo il caricamento (default 1200)
 *   --click SELETTORE           clicca (ripetibile, in ordine); --click-wait MS tra un clic e l'altro (default 600)
 *   --press TASTO               preme un tasto sull'elemento attivo dopo i clic (ripetibile), es. Tab, Enter
 *   --eval "JS"                 valuta un'espressione nella pagina e stampa il risultato
 *   --frames N --interval MS    N screenshot a distanza di MS (prefisso-1.png, prefisso-2.png, ...)
 * Stampa JSON con: screenshot, errori della console, richieste fallite, overflow orizzontale.
 */
const { chromium } = require('playwright');

function parse(argv) {
  const o = { width: 1440, height: 900, wait: 1200, clickWait: 600, clicks: [], presses: [], frames: 1, interval: 500 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--url') o.url = next();
    else if (a === '--out') o.out = next();
    else if (a === '--width') o.width = +next();
    else if (a === '--height') o.height = +next();
    else if (a === '--dark') o.dark = true;
    else if (a === '--reduced') o.reduced = true;
    else if (a === '--full') o.full = true;
    else if (a === '--el') o.el = next();
    else if (a === '--scroll') o.scroll = next();
    else if (a === '--wait') o.wait = +next();
    else if (a === '--click') o.clicks.push(next());
    else if (a === '--click-wait') o.clickWait = +next();
    else if (a === '--press') o.presses.push(next());
    else if (a === '--eval') o.evalJs = next();
    else if (a === '--frames') o.frames = +next();
    else if (a === '--interval') o.interval = +next();
  }
  if (!o.url || !o.out) { console.error('Servono --url e --out'); process.exit(2); }
  return o;
}

(async () => {
  const o = parse(process.argv.slice(2));
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: o.width, height: o.height },
    deviceScaleFactor: 1,
    colorScheme: o.dark ? 'dark' : 'light',
    reducedMotion: o.reduced ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  const errors = [];
  const failed = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
  page.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', (r) => failed.push('FAILED ' + r.url() + ' ' + ((r.failure() && r.failure().errorText) || '')));
  await page.goto(o.url, { waitUntil: 'load' });
  if (o.url.includes('_anteprima.html')) {
    await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 15000 }).catch(() => errors.push('anteprima non pronta entro 15 s'));
  }
  if (o.scroll) {
    try { await page.locator(o.scroll).first().scrollIntoViewIfNeeded({ timeout: 5000 }); } catch (e) { errors.push('scroll: ' + e.message.split('\n')[0]); }
  }
  await page.waitForTimeout(o.wait);
  for (const sel of o.clicks) {
    try { await page.locator(sel).first().click({ timeout: 5000 }); } catch (e) { errors.push('click ' + sel + ': ' + e.message.split('\n')[0]); }
    await page.waitForTimeout(o.clickWait);
  }
  for (const key of o.presses) { await page.keyboard.press(key); await page.waitForTimeout(150); }
  let evalResult;
  if (o.evalJs) {
    try { evalResult = await page.evaluate(o.evalJs); } catch (e) { evalResult = 'ERRORE: ' + e.message.split('\n')[0]; }
  }
  const shots = [];
  for (let f = 1; f <= o.frames; f++) {
    const path = o.frames > 1 ? `${o.out}-${f}.png` : `${o.out}.png`;
    if (o.el) {
      try { await page.locator(o.el).first().screenshot({ path }); } catch (e) { errors.push('el ' + o.el + ': ' + e.message.split('\n')[0]); }
    } else await page.screenshot({ path, fullPage: !!o.full });
    shots.push(path);
    if (f < o.frames) await page.waitForTimeout(o.interval);
  }
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(JSON.stringify({ screenshots: shots, errors, failed, overflowX, eval: evalResult }, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
