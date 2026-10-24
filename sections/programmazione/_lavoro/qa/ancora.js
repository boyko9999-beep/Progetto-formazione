// Apre index.html#<id> e misura dove finisce l'ancora nel tempo.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const id = process.argv[2] || 'schede';
  const larg = Number(process.argv[3] || 390);
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: larg, height: 844 } })).newPage();
  await page.goto('file:///home/user/Progetto-formazione/sections/programmazione/index.html#' + id, { waitUntil: 'load' });
  for (const t of [100, 400, 1000, 2000, 3500]) {
    await page.waitForTimeout(t === 100 ? 100 : t - [100, 400, 1000, 2000, 3500][[100, 400, 1000, 2000, 3500].indexOf(t) - 1]);
    const r = await page.evaluate((i) => { const el = document.getElementById(i); return { top: el ? Math.round(el.getBoundingClientRect().top) : null, y: Math.round(scrollY), h: document.documentElement.scrollHeight }; }, id);
    console.log(t + 'ms', JSON.stringify(r));
  }
  await browser.close();
})();
