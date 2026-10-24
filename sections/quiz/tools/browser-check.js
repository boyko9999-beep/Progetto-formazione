#!/usr/bin/env node
/*
 * Prova del quiz in un browser vero (Playwright + Chromium), come farebbe una persona:
 * - la pagina iniziale a 375, 768 e 1440 px, in chiaro e in scuro: niente errori in
 *   console, niente scorrimento orizzontale, una scheda per banca;
 * - ogni domanda di ogni banca, capitolo per capitolo, risolta dall'interfaccia: la
 *   risposta giusta deve essere accettata (e una sbagliata respinta);
 * - medaglie, ripasso degli errori, esame finale, tastiera e link "rileggi il capitolo".
 * Non fa parte di `node --test` perché serve un browser:
 *   NODE_PATH=$(npm root -g) node sections/quiz/tools/browser-check.js [--root <cartella>] [--shots <cartella>] [--quick] [--bank <slug>]
 * --root è la cartella da servire (di solito la radice del repo), --shots salva le
 * schermate, --quick prova solo il primo giro di ogni capitolo, --bank prova solo
 * le domande di una banca.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('Serve Playwright: npm i -g playwright, poi NODE_PATH=$(npm root -g) node ' + path.relative(process.cwd(), __filename));
  process.exit(2);
}

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const ROOT = path.resolve(opt('--root', path.join(__dirname, '..', '..', '..')));
const SHOTS = opt('--shots', null);
const QUICK = argv.includes('--quick');
const ONLY = opt('--bank', null);
const PAGE = '/sections/quiz/index.html';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2',
};

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let file = path.join(ROOT, decodeURIComponent(req.url.split(/[?#]/)[0]));
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('non trovato'); return; }
        res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const report = { errors: [], missing: new Set(), failures: [], answered: 0, banks: {}, checks: [] };
const fail = (msg) => { report.failures.push(msg); console.log('  ✗ ' + msg); };
const pass = (msg) => { report.checks.push(msg); console.log('  ✓ ' + msg); };

function watch(page) {
  page.on('pageerror', (e) => report.errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) report.errors.push('console: ' + m.text());
    if (m.type() === 'warning' && /\[quiz\]/.test(m.text())) report.errors.push('console: ' + m.text());
  });
  page.on('response', (r) => { if (r.status() >= 400) report.missing.add(r.url().replace(/^https?:\/\/[^/]+/, '')); });
}

async function shot(page, name, full) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: !!full });
}

/* ---------- nel browser: trova la domanda mostrata e risponde ---------- */

// mode: 'right' risponde giusto, 'wrong' sbaglia apposta. Restituisce cosa ha fatto.
function answerInPage(mode) {
  const card = document.querySelector('.qz-stage .qz-card');
  if (!card) return { error: 'nessuna domanda sullo schermo' };
  const text = card.querySelector('.qz-q span:last-child').textContent;
  const texts = (sel) => [...card.querySelectorAll(sel)].map((e) => e.textContent);
  const optTexts = texts('.qz-option-text');
  const orderTexts = texts('.qz-order-text');
  const leftTexts = texts('.qz-match-item.left > span:last-child');
  const same = (a, b) => a.length === b.length && a.slice().sort().join('|') === b.slice().sort().join('|');
  let cands = window.QuizBank.list().flatMap((b) => b.questions).filter((q) => q.q === text);
  if (cands.length > 1) {
    cands = cands.filter((q) => {
      const t = q.type || 'choice';
      if (t === 'choice') return same(q.options, optTexts);
      if (t === 'order') return same(q.items, orderTexts);
      if (t === 'match') return same(q.pairs.map((p) => p[0]), leftTexts);
      return card.classList.contains('qz-type-' + t);
    });
  }
  if (cands.length !== 1) return { error: 'domanda non riconosciuta (' + cands.length + ' candidate): ' + text };
  const q = cands[0];
  const C = window.QuizCore;
  const type = q.type || 'choice';
  const right = mode !== 'wrong';
  const click = (el) => { if (!el) throw new Error('elemento mancante in ' + q.id); el.click(); };
  const out = { id: q.id, type: type, confirm: false };
  if (!card.classList.contains('qz-type-' + type)) return { error: q.id + ': la scheda non è di tipo ' + type };
  // Ogni figura dichiarata deve essere disegnata.
  if (q.figure && !card.querySelector('.qz-fig')) return { error: q.id + ': figura ' + q.figure.kind + ' non disegnata' };

  switch (type) {
    case 'choice': {
      const want = q.options[right ? q.answer : (q.answer + 1) % q.options.length];
      out.index = optTexts.indexOf(want);
      out.key = String(out.index + 1);
      break;
    }
    case 'truefalse':
      out.selector = (right ? q.answer : !q.answer) ? '.qz-tf.is-true' : '.qz-tf.is-false';
      out.key = (right ? q.answer : !q.answer) ? 'v' : 'f';
      break;
    case 'order': {
      if (right) {
        q.items.forEach((item, i) => {
          for (let guard = 0; guard < 10; guard++) {
            const now = texts('.qz-order-text');
            if (now.indexOf(item) <= i) break;
            const li = [...card.querySelectorAll('.qz-order-item')].find((x) => x.querySelector('.qz-order-text').textContent === item);
            click(li.querySelectorAll('.qz-mini')[0]);
          }
        });
        const final = texts('.qz-order-text');
        if (final.join('|') !== q.items.join('|')) return { error: q.id + ': riordino non riuscito: ' + final.join(', ') };
      }
      out.confirm = true;
      break;
    }
    case 'match': {
      const rights = [...card.querySelectorAll('.qz-match-item.right')];
      const lefts = [...card.querySelectorAll('.qz-match-item.left')];
      q.pairs.forEach((p, i) => {
        const l = lefts.find((b) => b.querySelector('span:last-child').textContent === p[0]);
        const r = right
          ? rights.find((b) => b.querySelector('span:last-child').textContent === p[1])
          : rights.find((b) => b.querySelector('span:last-child').textContent === q.pairs[(i + 1) % q.pairs.length][1]);
        click(l);
        click(r);
      });
      out.confirm = true;
      break;
    }
    case 'number': {
      const input = card.querySelector('.qz-num-input');
      input.value = right ? C.formatNumber(q.value) : C.formatNumber(q.value * 3 + 7);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      out.confirm = true;
      break;
    }
    case 'bits': {
      const want = C.toBinary(right ? q.value : q.value ^ 1, q.width);
      const bits = [...card.querySelectorAll('.qz-bit')];
      if (bits.length !== q.width) return { error: q.id + ': ' + bits.length + ' bit invece di ' + q.width };
      want.split('').forEach((b, i) => { if (b === '1') click(bits[i]); });
      out.confirm = true;
      break;
    }
    case 'truth': {
      const rows = C.truthRows(q.expr).rows;
      const segs = [...card.querySelectorAll('.qz-seg')];
      if (segs.length !== rows.length) return { error: q.id + ': ' + segs.length + ' righe invece di ' + rows.length };
      rows.forEach((row, i) => click(segs[i].querySelectorAll('button')[right ? row.out : 1 - row.out]));
      out.confirm = true;
      break;
    }
    case 'logic': {
      const t = C.truthRows(q.expr);
      const row = t.rows.find((r) => (r.out === q.target) === right);
      t.names.forEach((n) => { if (row.inputs[n] === 1) click(card.querySelector('.qz-switch[aria-label="Ingresso ' + n + '"]')); });
      out.confirm = true;
      break;
    }
    default:
      return { error: q.id + ': tipo sconosciuto ' + type };
  }
  return out;
}

/* ---------- un giro di quiz ---------- */

async function cardNumber(page) {
  return page.evaluate(() => {
    const c = document.querySelectorAll('.qz-stage .qz-card');
    return c.length === 1 && !c[0].querySelector('.qz-feedback') ? c[0].querySelector('.qz-qn').textContent : null;
  });
}

// Gioca un giro intero all'indirizzo #hash. mode: right | wrong | keys (giusto, da tastiera dove si può).
async function playRun(page, hash, mode, onType) {
  // Con lo stesso indirizzo non scatta hashchange: prima si torna alla pagina iniziale.
  if (await page.evaluate((h) => location.hash === '#' + h, hash)) {
    await page.evaluate(() => { location.hash = ''; });
    await page.waitForSelector('.qz-hero');
  }
  await page.evaluate((h) => { location.hash = h; }, hash);
  const results = [];
  let prev = null;
  for (let step = 0; step < 40; step++) {
    try {
      await page.waitForFunction((p) => {
        if (document.querySelector('.qz-result')) return true;
        const c = document.querySelectorAll('.qz-stage .qz-card');
        return c.length === 1 && !c[0].querySelector('.qz-feedback') && c[0].querySelector('.qz-qn').textContent !== p;
      }, prev, { timeout: 15000 });
    } catch (e) {
      const seen = await page.evaluate(() => ({
        hash: location.hash,
        cards: document.querySelectorAll('.qz-stage .qz-card').length,
        text: (document.querySelector('main') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 300),
      }));
      fail(hash + ': dopo la domanda ' + prev + ' non arriva la successiva (' + JSON.stringify(seen) + ')');
      await shot(page, 'bloccato-' + hash.replace(/\W+/g, '-'), true);
      return results;
    }
    if (await page.$('.qz-result')) break;
    prev = await cardNumber(page);
    const plan = await page.evaluate(answerInPage, mode === 'wrong' ? 'wrong' : 'right');
    if (plan.error) { fail(hash + ': ' + plan.error); return results; }
    if (onType) await onType(plan);
    if (plan.type === 'choice' || plan.type === 'truefalse') {
      if (mode === 'keys') await page.keyboard.press(plan.key);
      else if (plan.type === 'choice') await page.locator('.qz-stage .qz-card .qz-option').nth(plan.index).click();
      else await page.locator('.qz-stage .qz-card ' + plan.selector).click();
    }
    if (plan.confirm) {
      const btn = page.locator('.qz-stage .qz-card .qz-confirm');
      if (await btn.isDisabled()) { fail(hash + ': ' + plan.id + ' il pulsante di conferma resta disattivato'); return results; }
      if (mode === 'keys' && plan.type === 'number') await page.keyboard.press('Enter');
      else await btn.click();
    }
    await page.waitForSelector('.qz-stage .qz-card .qz-feedback', { timeout: 8000 });
    const ok = await page.$eval('.qz-stage .qz-card .qz-feedback', (el) => el.classList.contains('ok'));
    report.answered++;
    results.push({ id: plan.id, type: plan.type, ok: ok });
    if (ok !== (mode !== 'wrong')) fail(hash + ': ' + plan.id + ' (' + plan.type + ') ' + (ok ? 'una risposta sbagliata è stata accettata' : 'la risposta giusta è stata respinta'));
    if (onType) await onType(plan, true);
    if (mode === 'keys') await page.keyboard.press('Enter');
    else await page.locator('.qz-stage .qz-card .qz-next').click();
  }
  return results;
}

/* ---------- le prove ---------- */

async function landing(browser, base) {
  console.log('\nPagina iniziale');
  for (const scheme of ['light', 'dark']) {
    for (const [w, hgt] of [[375, 812], [768, 1024], [1440, 900]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, colorScheme: scheme });
      const page = await ctx.newPage();
      watch(page);
      await page.goto(base);
      await page.waitForSelector('.qz-sections .qz-sec');
      await page.waitForTimeout(1200);
      const info = await page.evaluate(() => ({
        cards: document.querySelectorAll('.qz-sec').length,
        banks: window.QuizBank.list().filter((b) => b.questions.length).length,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        title: document.title,
      }));
      if (info.cards !== info.banks) fail(scheme + ' ' + w + 'px: ' + info.cards + ' schede per ' + info.banks + ' banche');
      if (info.overflow > 0) fail(scheme + ' ' + w + 'px: scorrimento orizzontale di ' + info.overflow + 'px');
      else pass(scheme + ' ' + w + 'px: ' + info.cards + ' schede, nessuno scorrimento orizzontale');
      await shot(page, 'home-' + scheme + '-' + w, true);
      await ctx.close();
    }
  }
}

async function everyQuestion(browser, base) {
  console.log('\nOgni domanda, capitolo per capitolo' + (QUICK ? ' (giro rapido)' : ''));
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(base);
  await page.waitForSelector('.qz-sec');
  const banks = await page.evaluate(() => window.QuizBank.list().map((b) => ({
    slug: b.slug,
    chapters: (b.chapters || []).map((c) => ({ id: c.id, ids: b.questions.filter((q) => q.chapter === c.id).map((q) => q.id) })).filter((c) => c.ids.length),
    total: b.questions.length,
  })));
  const typesShot = new Set();
  for (const b of banks) {
    if (ONLY && b.slug !== ONLY) continue;
    const done = new Set();
    for (const ch of b.chapters) {
      for (let round = 0; round < (QUICK ? 1 : 6); round++) {
        const left = ch.ids.filter((id) => !done.has(id));
        if (!left.length) break;
        const res = await playRun(page, b.slug + '/' + ch.id, 'right', async (plan, after) => {
          if (!SHOTS || typesShot.has(plan.type + (after ? '+' : ''))) return;
          typesShot.add(plan.type + (after ? '+' : ''));
          await shot(page, 'type-' + plan.type + (after ? '-feedback' : ''), false);
        });
        res.forEach((r) => { if (r.ok) done.add(r.id); });
        if (!res.length) break;
      }
    }
    report.banks[b.slug] = done.size + '/' + b.total;
    const all = b.chapters.reduce((t, c) => t + c.ids.length, 0);
    if (!QUICK && done.size < all) fail(b.slug + ': risolte ' + done.size + ' domande su ' + all);
    else pass(b.slug + ': ' + done.size + ' domande risolte dall\'interfaccia');
  }
  await ctx.close();
}

async function journeys(browser, base) {
  console.log('\nPercorsi completi');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(base);
  await page.waitForSelector('.qz-sec');

  // Tutto giusto in una sezione: medaglia d'oro e contatore in alto.
  const slug = await page.evaluate(() => window.QuizBank.list()[0].slug);
  await playRun(page, slug, 'right');
  await page.waitForSelector('.qz-result .qz-medal-oro.in', { timeout: 8000 }).then(() => pass(slug + ': medaglia d\'oro con il 100%'), () => fail(slug + ': nessuna medaglia d\'oro col 100%'));
  await shot(page, 'result-gold-mobile-dark', false);
  const prog = await page.textContent('#qz-prog');
  if (/^1\//.test(prog)) pass('barra in alto: ' + prog); else fail('barra in alto dopo una medaglia: ' + prog);

  // Tutto sbagliato su BusLab: niente medaglia, link per ripassare, riepilogo.
  const wrong = await playRun(page, 'bus', 'wrong', async (plan, after) => {
    if (!after) return;
    const link = await page.$('.qz-stage .qz-feedback .qz-learn');
    if (link && !report.learn) {
      report.learn = await link.getAttribute('href');
      await shot(page, 'feedback-wrong-mobile-dark', false);
    }
  });
  if (report.learn) pass('link per ripassare dopo un errore: ' + report.learn); else fail('nessun link "rileggi" dopo gli errori su BusLab');
  if (await page.$('.qz-result .qz-medal')) fail('medaglia con 0 risposte giuste'); else pass('niente medaglia con 0 su ' + wrong.length);
  await page.click('.qz-result button[aria-expanded]');
  const reviewItems = await page.$$eval('.qz-review li.ko', (l) => l.length);
  if (reviewItems === wrong.length) pass('riepilogo: ' + reviewItems + ' risposte da rivedere'); else fail('riepilogo con ' + reviewItems + ' voci invece di ' + wrong.length);
  await shot(page, 'result-review-mobile-dark', true);

  // Il ripasso degli errori ripropone proprio quelle domande.
  const review = await playRun(page, 'errori', 'right');
  const wrongIds = new Set(wrong.map((r) => r.id));
  if (review.length && review.every((r) => wrongIds.has(r.id))) pass('ripasso degli errori: ' + review.length + ' domande, tutte tra quelle sbagliate');
  else fail('il ripasso propone domande non sbagliate');
  await ctx.close();

  // Esame finale da tastiera, in chiaro su desktop.
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await ctx2.newPage();
  watch(p2);
  await p2.goto(base);
  await p2.waitForSelector('.qz-sec');
  const exam = await playRun(p2, 'esame', 'keys', async (plan, after) => {
    if (after || report.examShot) return;
    report.examShot = true;
    await shot(p2, 'exam-desktop-light', false);
  });
  const sections = new Set(exam.map((r) => r.id.split('-')[0]));
  if (exam.length === 24) pass('esame finale: 24 domande da ' + sections.size + ' banche, risposte da tastiera'); else fail('esame finale con ' + exam.length + ' domande');
  await p2.waitForSelector('.qz-result .qz-medal.in', { timeout: 8000 }).catch(() => fail('esame: nessuna medaglia col 100%'));
  await shot(p2, 'exam-result-desktop-light', false);
  await p2.evaluate(() => { location.hash = ''; });
  await p2.waitForSelector('.qz-hero');
  await p2.waitForTimeout(2200);
  await shot(p2, 'home-after-desktop-light', true);

  // Indirizzi sbagliati: si torna alla pagina iniziale, o al quiz della sezione, con un avviso.
  await p2.evaluate(() => { location.hash = 'inesistente'; });
  await p2.waitForSelector('.qz-notice').then(() => pass('indirizzo sconosciuto: pagina iniziale con avviso'), () => fail('indirizzo sconosciuto senza avviso'));
  const first = await p2.evaluate(() => window.QuizBank.list()[0].slug);
  await p2.evaluate((s) => { location.hash = s + '/capitolo-che-non-c-e'; }, first);
  await p2.waitForSelector('.qz-notice + div .qz-card').then(() => pass('capitolo sconosciuto: quiz di tutta la sezione con avviso'), () => fail('capitolo sconosciuto non gestito'));

  // Il link "Vai al contenuto" non ricarica il quiz in corso.
  const before = await p2.textContent('.qz-stage .qz-q');
  await p2.evaluate(() => { location.hash = 'main'; });
  await p2.waitForTimeout(300);
  if ((await p2.textContent('.qz-stage .qz-q')) === before) pass('il link "Vai al contenuto" lascia la domanda dov\'è'); else fail('il link "Vai al contenuto" ha cambiato domanda');

  // Sfida a tempo: allo scadere arriva il verdetto da solo.
  if (!QUICK) {
    await p2.evaluate(() => { location.hash = 'tempo'; });
    await p2.waitForSelector('.qz-stage .qz-timer-wrap');
    await shot(p2, 'time-desktop-light', false);
    await p2.waitForSelector('.qz-stage .qz-feedback.ko', { timeout: 32000 })
      .then(async () => pass('sfida a tempo: "' + (await p2.textContent('.qz-verdict strong')) + '" allo scadere'), () => fail('sfida a tempo: il tempo non scade'));
  }
  await ctx2.close();
}

// L'hub dell'enciclopedia (se c'è) mostra la sezione Quiz e i pulsanti "Quiz · N domande".
async function hub(browser, origin) {
  if (!fs.existsSync(path.join(ROOT, 'sections', 'index.html'))) return;
  console.log('\nHub dell\'enciclopedia');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(origin + '/sections/index.html');
  await page.waitForSelector('#sezioni:not([aria-busy])', { timeout: 10000 }).catch(() => {});
  const info = await page.evaluate(() => ({
    quiz: !!document.querySelector('#sez-quiz .enc-card:not(.attesa)'),
    buttons: [...document.querySelectorAll('a[href^="quiz/index.html#"]')].map((a) => a.textContent),
  }));
  if (info.quiz) pass('la scheda della sezione 8 è pronta'); else fail('l\'hub non vede la sezione 8');
  if (!info.buttons.length) console.log('  · nessun\'altra sezione registrata: pulsanti "Quiz · N domande" non verificabili');
  else if (info.buttons.every((t) => /^Quiz · \d+ domande$/.test(t))) pass('pulsanti nell\'hub: ' + info.buttons.join(', '));
  else fail('pulsanti del quiz nell\'hub: ' + JSON.stringify(info.buttons));
  await shot(page, 'hub', true);
  await ctx.close();
}

(async () => {
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port + PAGE;
  const browser = await chromium.launch();
  try {
    if (!ONLY) await landing(browser, base);
    await everyQuestion(browser, base);
    if (!ONLY) {
      await journeys(browser, base);
      await hub(browser, base.replace(PAGE, ''));
    }
  } catch (e) {
    fail('interrotto: ' + (e && e.stack || e));
  } finally {
    await browser.close();
    server.close();
  }
  console.log('\nDomande risolte: ' + report.answered + ' · banche: ' + JSON.stringify(report.banks));
  if (report.missing.size) console.log('File non trovati (normali se le altre sezioni non sono ancora unite): ' + [...report.missing].join(', '));
  const errors = [...new Set(report.errors)];
  if (errors.length) console.log('Errori nel browser:\n  ' + errors.join('\n  '));
  const bad = report.failures.length + errors.length;
  console.log(bad ? '\n✗ ' + report.failures.length + ' prove fallite, ' + errors.length + ' errori' : '\n✓ tutto a posto (' + report.checks.length + ' prove)');
  process.exit(bad ? 1 : 0);
})();
