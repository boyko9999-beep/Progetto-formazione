// Trova gli elementi che escono a destra della finestra (overflow orizzontale della pagina).
//   node sbordi.js [larghezza]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const larg = Number(process.argv[2] || 390);
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: larg, height: 844 } })).newPage();
  await page.goto('file:///home/user/Progetto-formazione/sections/programmazione/index.html', { waitUntil: 'load' });
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H + 900; y += 700) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(90); }
  await page.waitForTimeout(600);
  const r = await page.evaluate((W) => {
    const out = [];
    const clipped = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return p !== document.documentElement && p !== document.body; } return false; };
    for (const el of document.querySelectorAll('body *')) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.right <= W + 1) continue;
      if (clipped(el)) continue;
      const cap = el.closest('.pg-cap');
      out.push({ el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''), destra: Math.round(b.right), cap: cap ? cap.id : null, testo: (el.textContent || '').trim().slice(0, 50) });
    }
    return { scrollWidth: document.documentElement.scrollWidth, out: out.slice(0, 40) };
  }, larg);
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})();
