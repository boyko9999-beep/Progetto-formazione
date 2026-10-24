#!/usr/bin/env node
/*
 * Verifica in browser della sezione Elettronica avanzata (Playwright + Chromium).
 * Uso:
 *   node shoot.cjs --route fourier --out /percorso/cartella [--viewports 1440x900,390x844]
 *                  [--themes light,dark] [--reduced] [--interact] [--full]
 * --route: hash dopo index.html# (vuoto = indice, "storia" = linea del tempo, "fourier" = capitolo).
 * Scrive screenshot PNG e report.json nella cartella --out e stampa un riepilogo.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def; };
const flag = (name) => args.includes('--' + name);

const REPO = opt('repo', '/home/user/Progetto-formazione');
const route = opt('route', '');
const out = path.resolve(opt('out', './shots'));
const viewports = opt('viewports', '1440x900,390x844').split(',').map((v) => v.split('x').map(Number));
const themes = opt('themes', 'light').split(',');
const passes = flag('reduced') ? ['no-preference', 'reduce'] : ['no-preference'];
const IGNORE = [/enciclopedia\.(js|css)/, /quiz\/index/, /favicon/, /willReadFrequently/];

fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const report = { route, runs: [] };
  for (const [vw, vh] of viewports) {
    for (const theme of themes) {
      for (const motion of passes) {
        const tag = vw + 'x' + vh + '-' + theme + (motion === 'reduce' ? '-reduced' : '');
        const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, colorScheme: theme, reducedMotion: motion, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        const errors = [];
        page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text(); if (!IGNORE.some((r) => r.test(t + ' ' + (m.location().url || '')))) errors.push(m.type() + ': ' + t); } });
        page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
        page.on('requestfailed', (r) => { const u = r.url(); if (!IGNORE.some((x) => x.test(u))) errors.push('requestfailed: ' + u); });
        const url = 'file://' + path.join(REPO, 'sections/elettronica-avanzata/index.html') + (route ? '#' + route : '');
        await page.goto(url);
        await page.waitForTimeout(1400);
        const run = { tag, shots: [], errors };

        run.metrics = await page.evaluate(async () => {
          const W = window.innerWidth;
          const offenders = [];
          document.querySelectorAll('body *').forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width && r.right > W + 1) {
              let p = el.parentElement; let clipped = false;
              while (p) { const cs = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) { const pr = p.getBoundingClientRect(); if (pr.right <= W + 1) { clipped = true; break; } } p = p.parentElement; }
              if (!clipped) offenders.push((el.className && typeof el.className === 'string' ? el.tagName.toLowerCase() + '.' + el.className.split(' ').join('.') : el.tagName.toLowerCase()) + ' right=' + Math.round(r.right));
            }
          });
          const clippedText = [];
          document.querySelectorAll('.ea-ro-val, .ea-step strong, .ea-card-title, .ea-slider output, .ea-seg-opt label, h1, h2, .ea-formula-eq').forEach((el) => {
            if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'auto') clippedText.push(el.className + ': "' + el.textContent.slice(0, 40) + '"');
          });
          const unnamed = [];
          document.querySelectorAll('button, a[href], input, select, [role="switch"]').forEach((el) => {
            const name = (el.getAttribute('aria-label') || el.textContent || el.title || '').trim() || (el.id && document.querySelector('label[for="' + el.id + '"]') ? 'label' : '') || (el.closest('label') ? 'label' : '');
            if (!name) unnamed.push(el.outerHTML.slice(0, 90));
          });
          const unlabeledImg = [];
          document.querySelectorAll('canvas, svg[role="img"]').forEach((el) => { if (!el.getAttribute('aria-label') && !el.getAttribute('aria-hidden')) unlabeledImg.push(el.outerHTML.slice(0, 90)); });
          const frames = await new Promise((res) => { let n = 0; const t0 = performance.now(); function f() { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); } requestAnimationFrame(f); });
          const canv = [...document.querySelectorAll('.ea-stage canvas, .ea-lab canvas, .ea-map canvas')].map((c) => ({ sel: (c.closest('.ea-stage') ? 'stage' : c.closest('.ea-lab') ? 'lab' : 'map') + ' ' + c.className, w: c.clientWidth, h: c.clientHeight }));
          return {
            scrollWidth: document.documentElement.scrollWidth, innerWidth: W, pageHeight: document.documentElement.scrollHeight,
            h1: document.querySelectorAll('h1').length, offenders: offenders.slice(0, 12), clippedText: clippedText.slice(0, 12),
            unnamed: unnamed.slice(0, 10), unlabeledImg, fps: frames, canvases: canv,
            stub: !!document.querySelector('.ea-stub'), errorBox: !!document.querySelector('.ea-error'),
          };
        });

        // Le animazioni si muovono? (con "riduci movimento" devono stare ferme finché non si preme play)
        run.motion = await page.evaluate(async () => {
          const sample = (c) => { try { const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 97) s = (s * 31 + d[i]) % 1000000007; return s; } catch (e) { return -1; } };
          const out = [];
          for (const c of document.querySelectorAll('.ea-stage canvas, .ea-lab canvas')) {
            c.scrollIntoView({ block: 'center' });
            await new Promise((r) => setTimeout(r, 350));
            const a = sample(c);
            await new Promise((r) => setTimeout(r, 700));
            const b = sample(c);
            out.push({ canvas: (c.closest('.ea-stage') ? 'stage' : 'lab') + ' ' + c.className, changed: a !== b });
          }
          window.scrollTo(0, 0);
          return out;
        });

        await page.screenshot({ path: path.join(out, tag + '-top.png') });
        run.shots.push(tag + '-top.png');
        for (const sel of ['.ea-map', '.ea-stage', '.ea-cols', '.ea-lab', '.ea-formulas', '.ea-history', '.ea-check', '.ea-grid', '.ea-timeline']) {
          const el = await page.$(sel);
          if (!el) continue;
          await el.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          const name = tag + '-' + sel.replace('.', '') + '.png';
          try { await el.screenshot({ path: path.join(out, name) }); run.shots.push(name); } catch (e) { run.errors.push('screenshot ' + sel + ': ' + e.message); }
        }
        if (flag('full')) { await page.screenshot({ path: path.join(out, tag + '-full.png'), fullPage: true }); run.shots.push(tag + '-full.png'); }

        if (flag('interact') && motion === 'no-preference' && theme === themes[0]) {
          const before = errors.length;
          const log = await page.evaluate(async () => {
            const wait = (ms) => new Promise((r) => setTimeout(r, ms));
            const lab = document.querySelector('.ea-lab');
            const res = [];
            if (!lab) return ['nessun laboratorio'];
            lab.scrollIntoView({ block: 'start' });
            for (const r of lab.querySelectorAll('input[type="range"]')) {
              for (const v of [r.min, r.max, String((+r.min + +r.max) / 2)]) {
                r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true }));
                await wait(120);
              }
              res.push('range ' + (r.id || '') + ' ok → ' + (r.getAttribute('aria-valuetext') || ''));
            }
            for (const l of lab.querySelectorAll('.ea-seg-opt label')) { l.click(); await wait(150); res.push('radio ' + l.textContent); }
            for (const c of lab.querySelectorAll('input[type="checkbox"]')) { c.click(); await wait(120); c.click(); await wait(120); res.push('toggle ok'); }
            for (const b of lab.querySelectorAll('.ea-lab-controls button, .ea-lab-display button')) { b.click(); await wait(200); b.click(); await wait(120); res.push('button ' + (b.textContent || b.getAttribute('aria-label')).trim()); }
            const steps = document.querySelectorAll('.ea-step');
            for (const s of steps) { s.click(); await wait(450); }
            res.push(steps.length + ' passi cliccati');
            return res;
          });
          run.interaction = { log, newErrors: errors.slice(before) };
          const lab = await page.$('.ea-lab');
          if (lab) { await lab.scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await lab.screenshot({ path: path.join(out, tag + '-lab-after.png') }); run.shots.push(tag + '-lab-after.png'); }
          const stage = await page.$('.ea-stage');
          if (stage) { await stage.scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await stage.screenshot({ path: path.join(out, tag + '-stage-laststep.png') }); run.shots.push(tag + '-stage-laststep.png'); }
          // tastiera: il primo cursore risponde alle frecce
          run.keyboard = await page.evaluate(() => { const r = document.querySelector('.ea-lab input[type="range"]'); if (!r) return 'nessun cursore'; r.focus(); return document.activeElement === r ? 'focus ok' : 'focus mancante'; });
          if (run.keyboard === 'focus ok') {
            const v0 = await page.evaluate(() => document.querySelector('.ea-lab input[type="range"]').value);
            await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
            const v1 = await page.evaluate(() => document.querySelector('.ea-lab input[type="range"]').value);
            run.keyboard += v0 !== v1 ? ', frecce ok' : ', frecce senza effetto (forse al massimo)';
          }
        }
        report.runs.push(run);
        await ctx.close();
      }
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  for (const r of report.runs) {
    const m = r.metrics;
    console.log('== ' + r.tag);
    console.log('  errori: ' + (r.errors.length ? '\n    ' + r.errors.join('\n    ') : 'nessuno'));
    console.log('  overflow orizzontale: ' + (m.scrollWidth > m.innerWidth ? 'SÌ (' + m.scrollWidth + ' > ' + m.innerWidth + ') ' + m.offenders.join(' | ') : 'no'));
    if (m.clippedText.length) console.log('  testo tagliato: ' + m.clippedText.join(' | '));
    if (m.unnamed.length) console.log('  controlli senza nome: ' + m.unnamed.join(' | '));
    if (m.unlabeledImg.length) console.log('  immagini senza etichetta: ' + m.unlabeledImg.join(' | '));
    console.log('  h1: ' + m.h1 + ' · fps: ' + m.fps + ' · altezza pagina: ' + m.pageHeight + (m.stub ? ' · CAPITOLO SEGNAPOSTO' : '') + (m.errorBox ? ' · BOX ERRORE MONTAGGIO' : ''));
    console.log('  canvas: ' + m.canvases.map((c) => c.sel + ' ' + c.w + 'x' + c.h).join(', '));
    console.log('  movimento: ' + r.motion.map((x) => x.canvas + (x.changed ? ' si muove' : ' fermo')).join(', '));
    if (r.interaction) console.log('  interazione: ' + r.interaction.log.join('; ') + (r.interaction.newErrors.length ? '\n  ERRORI DURANTE INTERAZIONE:\n    ' + r.interaction.newErrors.join('\n    ') : ''));
    if (r.keyboard) console.log('  tastiera: ' + r.keyboard);
    console.log('  screenshot: ' + r.shots.map((s) => path.join(out, s)).join('\n               '));
  }
})().catch((e) => { console.error(e); process.exit(1); });
