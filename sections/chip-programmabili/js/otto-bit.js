/*
 * Capitolo 5 · Laboratorio "La corsa agli 8 bit".
 *
 * Quattro viste, scelte dalla barra:
 *  1. Galleria: i cinque chip disegnati in scala con CP.art.dip; la scheda tecnica e il cruscotto di confronto
 *     (transistor, clock, memoria, alimentazioni) si aggiornano con transizioni;
 *  2. Registri: lo stesso banco di registri che si trasforma da un chip all'altro (le caselle comuni scivolano,
 *     le altre compaiono o spariscono) con le differenze spiegate a parole;
 *  3. Prezzi: una linea del tempo 1974-1976 in cui i cartellini scendono quando arriva il 6502 (solo prezzi verificati);
 *  4. Sfida: lo stesso compito in assembly vero di 8080, 6502 e Z80, da rimettere in ordine ed eseguire;
 *     poi il confronto di byte, cicli e tempo, e la verifica della scommessa iniziale.
 * La logica (dati, disposizione, simulatore, diagnosi) è in js/otto-bit-core.js, provata dai test.
 * Obiettivo: esplorare tutti e cinque i chip e risolvere la sfida con i tre processori.
 */
(function (root) {
  'use strict';

  const CP = root.CP;
  const O = root.OttoBit;
  if (!CP || !O) return;

  const ART = {
    '8008': { il: 'l’8008', da: 'dall’8008', a: 'all’8008' },
    '8080': { il: 'l’8080', da: 'dall’8080', a: 'all’8080' },
    '6800': { il: 'il 6800', da: 'dal 6800', a: 'al 6800' },
    '6502': { il: 'il 6502', da: 'dal 6502', a: 'al 6502' },
    'z80': { il: 'lo Z80', da: 'dallo Z80', a: 'allo Z80' },
  };
  const EASE = 'cubic-bezier(.22, 1, .36, 1)';
  const SHARP = 'cubic-bezier(.4, 0, .2, 1)';

  CP.lab('otto-bit', function (mount, ctx) {
    const { h, s, ui } = CP;
    const reduced = () => ctx.reduced;

    /* ---------- piccoli aiuti ---------- */

    function setText(el, t) { if (el && el.textContent !== t) el.textContent = t; }
    function anim(el, frames, opts) {
      if (reduced() || !el || !el.animate) return null;
      return el.animate(frames, Object.assign({ duration: CP.dur.normal, easing: EASE }, opts || {}));
    }
    function rise(el, i) {
      return anim(el, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { delay: (i || 0) * 50, fill: 'backwards' });
    }
    function flash(el) {
      return anim(el, [{ opacity: 0.95 }, { opacity: 0 }], { duration: CP.dur.slow, easing: 'ease-out' });
    }
    function setAttrs(el, o) { for (const k in o) el.setAttribute(k, o[k]); }
    function clear(el) { while (el.firstChild) el.firstChild.remove(); }

    /* ---------- stato ---------- */

    const st = { view: 'galleria', chip: '8008', visited: new Set(['8008']), solved: new Set(), narrow: false, done: false };

    /* ---------- barra principale, palco, spiegazione, obiettivo ---------- */

    const VIEWS = [['galleria', 'Galleria'], ['registri', 'Registri'], ['prezzi', 'Prezzi'], ['sfida', 'Sfida']].map((v, i) => ({
      value: v[0],
      label: h('span', null, h('span', { class: 'otto-bit-vn', 'aria-hidden': 'true' }, (i + 1) + ' · '), v[1]),
    }));
    const viewSeg = ui.seg({ label: 'Parte del laboratorio', options: VIEWS, value: st.view, onChange: (v) => showView(v) });
    viewSeg.classList.add('otto-bit-views');
    const roChips = ui.readout('Chip esplorati', '1/5');
    const roProg = ui.readout('Sfida risolta', '0/3');
    roChips.classList.add('otto-bit-ro');
    roProg.classList.add('otto-bit-ro');
    const bar = ui.bar(viewSeg, h('span', { class: 'grow' }), roChips, roProg);

    const stage = h('div', { class: 'cp-stage otto-bit-stage' });
    const explain = h('div', { class: 'cp-explain otto-bit-explain' });
    const grid = h('div', { class: 'cp-lab-grid otto-bit-grid' }, stage, explain);
    const goal = h('p', { class: 'cp-goal otto-bit-goal' });
    mount.append(bar, grid, goal);

    /* ---------- selettore dei chip, comune a Galleria e Registri ---------- */

    const rail = h('div', { class: 'otto-bit-rail', role: 'group', 'aria-label': 'Scegli un chip' });
    const chipBtns = {};
    O.CHIPS.forEach((c) => {
      const pic = CP.art.dip(Object.assign({}, c.dip, { title: c.name }));
      pic.removeAttribute('role');
      pic.removeAttribute('aria-label');
      pic.setAttribute('aria-hidden', 'true');
      pic.setAttribute('focusable', 'false');
      const vb = (pic.getAttribute('viewBox') || '0 0 210 72').split(/\s+/).map(Number);
      pic.style.setProperty('--vbw', vb[2]);
      pic.style.setProperty('--vbh', vb[3]);
      const seen = h('span', { class: 'otto-bit-chip-seen', 'aria-hidden': 'true' }, '✓');
      const sr = h('span', { class: 'cp-sr' }, '');
      const b = h('button', {
        type: 'button', class: 'otto-bit-chip', 'aria-pressed': String(c.id === st.chip), dataset: { chip: c.id },
        onclick: () => selectChip(c.id),
      }, h('span', { class: 'otto-bit-chip-pic' }, pic),
        h('span', { class: 'otto-bit-chip-nm' }, h('span', { class: 'mk' }, c.name.slice(0, c.name.length - c.short.length)), c.short),
        h('span', { class: 'otto-bit-chip-yr' }, String(c.year)), seen, sr);
      b.seen = seen;
      b.sr = sr;
      chipBtns[c.id] = b;
      rail.append(b);
    });
    // frecce sinistra e destra tra i chip
    rail.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const ids = O.CHIPS.map((c) => c.id);
      const cur = ids.indexOf((document.activeElement && document.activeElement.dataset && document.activeElement.dataset.chip) || st.chip);
      const next = ids[(cur + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
      chipBtns[next].focus();
      e.preventDefault();
    });

    const host = h('div', { class: 'otto-bit-host' });
    stage.append(rail, host);

    function paintRail() {
      O.CHIPS.forEach((c) => {
        const b = chipBtns[c.id];
        b.setAttribute('aria-pressed', String(c.id === st.chip));
        const v = st.visited.has(c.id);
        b.classList.toggle('is-seen', v);
        setText(b.sr, v ? ' (già esplorato)' : '');
      });
    }

    function selectChip(id) {
      if (id === st.chip) return;
      const prev = st.chip;
      st.chip = id;
      const first = !st.visited.has(id);
      st.visited.add(id);
      paintRail();
      if (first && chipBtns[id].seen) anim(chipBtns[id].seen, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: CP.dur.normal, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
      if (st.view === 'galleria' || st.view === 'registri') view(st.view).select(prev, id);
      progress();
    }

    /* ---------- obiettivo e avanzamento ---------- */

    function progress() {
      roChips.set(st.visited.size + '/5');
      roProg.set(st.solved.size + '/3');
      const ok = st.visited.size >= 5 && st.solved.size >= 3;
      clear(goal);
      if (ok) {
        goal.append(h('span', null, h('b', null, 'Obiettivo raggiunto. '), 'Hai esplorato i cinque chip e risolto la sfida con 8080, 6502 e Z80.'));
      } else {
        goal.append(h('span', null, h('b', null, 'Obiettivo: '), 'esplora tutti e cinque i chip nella Galleria o nei Registri (' + st.visited.size + '/5) e risolvi la Sfida con 8080, 6502 e Z80 (' + st.solved.size + '/3).'));
      }
      if (ok && !st.done) {
        st.done = true;
        ctx.done();
        ctx.say('Laboratorio completato: hai esplorato i cinque chip e risolto la sfida.');
      }
    }

    /* =========================================================
       1 · GALLERIA
       ========================================================= */

    function makeGallery() {
      const el = h('div', { class: 'otto-bit-view otto-bit-v-gal' });
      const svg = s('svg', { class: 'otto-bit-svg otto-bit-gal', role: 'img' });
      el.append(svg);

      const ex = h('div', { class: 'otto-bit-ex' });
      const exStep = h('span', { class: 'step' });
      const exTitle = h('h4', { class: 'otto-bit-ex-title' });
      const sheet = h('dl', { class: 'otto-bit-sheet' });
      const exBlurb = h('p', { class: 'otto-bit-blurb' });
      const exWhere = h('p', { class: 'otto-bit-where' });
      ex.append(exStep, exTitle, sheet, exBlurb, exWhere);
      const ROWS = [
        ['Uscita', (c) => c.when],
        ['Progetto', (c) => c.people],
        ['Tecnologia', (c) => c.tech],
        ['Transistor', (c) => c.transistorsText],
        ['Clock', (c) => c.clockText],
        ['Piedini', (c) => String(c.pins)],
        ['Alimentazioni', (c) => O.railsText(c)],
        ['Memoria', (c) => c.memText],
        ['Indirizzamento', (c) => c.modes],
        ['Prezzo di lancio', (c) => c.priceText],
      ];
      const dds = ROWS.map((r) => {
        const dd = h('dd');
        sheet.append(h('div', null, h('dt', null, r[0]), dd));
        return dd;
      });

      // min: dove le fonti danno due cifre, la barra piena arriva alla più bassa e una parte tratteggiata alla più alta
      const PANELS = [
        { id: 'tr', title: 'Transistor', max: 9000, val: (c) => c.transistors, min: (c) => c.transistorsMin || null, fmt: (c) => (c.transistorsMin ? O.num(c.transistorsMin) + '–' + O.num(c.transistors) : (c.id === '6502' ? '' : '≈ ') + O.num(c.transistors)), cls: 'tr' },
        { id: 'ck', title: 'Clock al lancio', max: 2.5, val: (c) => c.clock, fmt: (c) => O.dec(c.clock, 1) + ' MHz', cls: 'ck' },
        { id: 'mem', title: 'Memoria indirizzabile', max: 64, val: (c) => c.memKB, fmt: (c) => c.memKB + ' KB', cls: 'mem' },
        { id: 'pw', title: 'Alimentazioni', matrix: true, cls: 'pw' },
        { id: 'pin', title: 'Piedini', max: 40, val: (c) => c.pins, fmt: (c) => String(c.pins), cls: 'pin' },
        { id: 'pr', title: 'Prezzo di lancio', max: 400, val: (c) => c.price, fmt: (c) => (c.price == null ? 'fonti discordi' : (c.priceApprox ? '≈ ' : '') + c.price + ' $'), cls: 'pr' },
      ];
      let mode = '';
      let parts = [];
      let entered = false;

      function geom(m) {
        const n = PANELS.length;
        if (m === 'narrow') return { W: 340, H: 8 + (n - 1) * 134 + 126, pw: 320, pos: (i) => [10, 10 + i * 134] };
        return { W: 640, H: 2 + Math.ceil(n / 2) * 138, pw: 300, pos: (i) => [12 + (i % 2) * 316, 10 + Math.floor(i / 2) * 138] };
      }

      function build(m) {
        mode = m;
        clear(svg);
        const G = geom(m);
        svg.setAttribute('viewBox', '0 0 ' + G.W + ' ' + G.H);
        parts = PANELS.map((P, pi) => {
          const [px, py] = G.pos(pi);
          const W = G.pw;
          const g = s('g', { class: 'otto-bit-panel p-' + P.cls, transform: 'translate(' + px + ' ' + py + ')' });
          g.append(s('rect', { class: 'otto-bit-panel-bg', x: -8, y: -6, width: W + 16, height: 128, rx: 10 }));
          g.append(s('text', { class: 'otto-bit-panel-title', x: 0, y: 12 }, P.title));
          const part = { P: P, g: g, W: W, rows: [] };
          if (!P.matrix) {
            const x0 = 48;
            const maxW = W - x0 - 66;
            const band = s('rect', { class: 'otto-bit-band', x: -4, y: 0, width: W + 8, height: 17, rx: 5 });
            g.append(band);
            part.band = band;
            O.CHIPS.forEach((c, i) => {
              const cy = 31 + i * 18;
              const v = P.val(c);
              const known = v != null;
              const w = known ? Math.max(2, (v / P.max) * maxW) : 0;
              const lo = P.min && P.min(c);
              const wMin = lo ? Math.max(2, (lo / P.max) * maxW) : w;
              const row = s('g', { class: 'otto-bit-row', 'data-chip': c.id });
              const lbl = s('text', { class: 'otto-bit-row-lbl', x: 0, y: cy + 4 }, c.short);
              const ext = lo ? s('rect', { class: 'otto-bit-bar-ext', x: x0, y: cy - 5, width: w, height: 10, rx: 2.5 }) : null;
              const bar = s('rect', { class: 'otto-bit-bar', x: x0, y: cy - 5, width: wMin, height: 10, rx: 2.5 });
              const val = s('text', { class: 'otto-bit-row-val' + (known ? '' : ' is-unknown'), x: x0 + w + 6, y: cy + 4 }, P.fmt(c));
              const glow = s('circle', { class: 'otto-bit-glow', cx: x0 + w, cy: cy, r: 7 });
              row.append(lbl, ext, bar, known ? glow : null, val);
              g.append(row);
              part.rows.push({ id: c.id, row: row, bar: bar, ext: ext, val: val, glow: known ? glow : null, w: w, k: w ? wMin / w : 1, x0: x0, cy: cy });
            });
          } else {
            const step = (W - 100) / 4;
            const cols = O.CHIPS.map((c, i) => 74 + i * step);
            const band = s('rect', { class: 'otto-bit-band', x: 0, y: 17, width: 46, height: 102, rx: 7 });
            g.append(band);
            part.band = band;
            part.cols = cols;
            O.RAILS.forEach((r, j) => {
              const y = 47 + j * 16;
              g.append(s('text', { class: 'otto-bit-row-lbl', x: 0, y: y + 4 }, r.label));
              g.append(s('line', { class: 'otto-bit-rail-line', x1: 44, x2: W, y1: y, y2: y }));
            });
            g.append(s('text', { class: 'otto-bit-row-lbl is-total', x: 0, y: 113 }, 'quante'));
            O.CHIPS.forEach((c, i) => {
              const col = s('g', { class: 'otto-bit-row', 'data-chip': c.id });
              col.append(s('text', { class: 'otto-bit-col-lbl', x: cols[i], y: 31, 'text-anchor': 'middle' }, c.short));
              O.RAILS.forEach((r, j) => {
                const y = 47 + j * 16;
                const on = c.supplies.indexOf(r.k) >= 0;
                col.append(s('circle', { class: 'otto-bit-dot' + (on ? ' on' : ''), cx: cols[i], cy: y, r: on ? 5.5 : 2 }));
              });
              const n = c.supplies.length;
              col.append(s('text', { class: 'otto-bit-col-n', x: cols[i], y: 113, 'text-anchor': 'middle' }, String(n)));
              g.append(col);
              part.rows.push({ id: c.id, row: col, cx: cols[i] });
            });
          }
          svg.append(g);
          return part;
        });
        paint(st.chip, null, false);
      }

      function bandPos(part, id) {
        const r = part.rows.find((x) => x.id === id);
        if (part.P.matrix) return r.cx - 23;
        return r.cy - 9;
      }

      function paint(id, prevId, animate) {
        parts.forEach((part, pi) => {
          part.rows.forEach((r) => {
            r.row.classList.toggle('is-sel', r.id === id);
            r.row.classList.toggle('is-dim', r.id !== id);
          });
          const to = bandPos(part, id);
          const attr = part.P.matrix ? 'x' : 'y';
          if (animate && prevId && !reduced()) {
            const from = bandPos(part, prevId);
            CP.tween({ from: from, to: to, duration: CP.dur.normal, delay: pi * 60, ease: 'smooth', onUpdate: (v) => part.band.setAttribute(attr, v.toFixed(2)) });
            const r = part.rows.find((x) => x.id === id);
            if (r.glow) setTimeout(() => anim(r.glow, [{ opacity: 0.9, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(1.7)' }], { duration: CP.dur.slow, easing: 'ease-out' }), pi * 60 + 200);
          } else {
            part.band.setAttribute(attr, to);
          }
        });
        const c = O.CHIP[id];
        svg.setAttribute('aria-label', 'Confronto tra i cinque chip, evidenziato ' + c.name + ': ' + c.transistorsText + ' transistor, clock ' + c.clockText + ', memoria ' + c.memKB + ' KB, alimentazione ' + O.railsText(c) + ', ' + c.pins + ' piedini, prezzo di lancio: ' + c.priceText + '.');
      }

      function sheetFor(id, animate) {
        const c = O.CHIP[id];
        setText(exStep, c.year + ' · ' + c.maker);
        setText(exTitle, c.name);
        ROWS.forEach((r, i) => {
          const t = r[1](c);
          if (dds[i].textContent === t) return;
          dds[i].textContent = t;
          if (animate) rise(dds[i], i);
        });
        setText(exBlurb, c.blurb);
        clear(exWhere);
        exWhere.append(h('b', null, 'Dove è finito: '), c.where);
        if (animate) { rise(exTitle, 0); rise(exBlurb, 3); rise(exWhere, 4); }
      }

      function entrance() {
        if (entered) return;
        entered = true;
        if (reduced()) return;
        parts.forEach((part, pi) => {
          if (part.P.matrix) {
            part.rows.forEach((r, i) => rise(r.row, pi + i));
            return;
          }
          part.rows.forEach((r, i) => {
            if (!r.w) return;
            CP.tween({
              from: 0, to: r.w, duration: CP.dur.slow, delay: pi * 80 + i * 50, ease: 'smooth',
              onUpdate: (v) => {
                r.bar.setAttribute('width', Math.max(0.1, v * r.k).toFixed(2));
                if (r.ext) r.ext.setAttribute('width', Math.max(0.1, v).toFixed(2));
                if (r.glow) r.glow.setAttribute('cx', (r.x0 + v).toFixed(2));
                r.val.setAttribute('x', (r.x0 + v + 6).toFixed(2));
              },
            });
          });
        });
      }

      return {
        el: el, ex: ex,
        enter() { if (!mode) build(st.narrow ? 'narrow' : 'wide'); else paint(st.chip, null, false); sheetFor(st.chip, false); if (ctx.visible) entrance(); },
        visible() { entrance(); },
        resize(m) { if (mode && mode !== m) build(m); },
        select(prev, id) {
          paint(id, prev, true);
          sheetFor(id, true);
          const c = O.CHIP[id];
          ctx.say(c.name + ', ' + c.when + ': ' + c.transistorsText + ' transistor, clock ' + c.clockText + ', ' + O.railsText(c) + '.');
        },
      };
    }

    /* =========================================================
       2 · REGISTRI
       ========================================================= */

    function makeRegs() {
      const el = h('div', { class: 'otto-bit-view otto-bit-v-reg' });
      const svg = s('svg', { class: 'otto-bit-svg otto-bit-regs', role: 'group' });
      const defs = s('defs');
      const patBits = s('pattern', { id: 'otto-bit-bits', patternUnits: 'userSpaceOnUse', width: 10, height: 100 }, s('line', { class: 'otto-bit-bitline', x1: 9.5, y1: 0, x2: 9.5, y2: 100 }));
      const patLev = s('pattern', { id: 'otto-bit-levels', patternUnits: 'userSpaceOnUse', width: 200, height: 12.57 }, s('line', { class: 'otto-bit-levline', x1: 0, y1: 12.07, x2: 200, y2: 12.07 }));
      const patZp = s('pattern', { id: 'otto-bit-zpgrid', patternUnits: 'userSpaceOnUse', width: 10, height: 5.5 }, s('path', { class: 'otto-bit-zpline', d: 'M10 0 V5.5 M0 5.5 H10' }));
      defs.append(patBits, patLev, patZp);
      const headLayer = s('g', { class: 'otto-bit-heads' });
      const regLayer = s('g', { class: 'otto-bit-reglayer' });
      svg.append(defs, headLayer, regLayer);
      const legend = ui.legend([['accumulatori', 'var(--sig-data)'], ['indirizzi e indici', 'var(--sig-addr)'], ['flag', 'var(--sig-ctrl)'], ['registri generali', '#8fa59c'], ['speciali', '#b9a6ff'], ['1 quadretto = 1 bit', 'transparent']]);
      legend.classList.add('otto-bit-legend');
      el.append(svg, legend);

      const ex = h('div', { class: 'otto-bit-ex' });
      const exStep = h('span', { class: 'step' });
      const exTitle = h('h4', { class: 'otto-bit-ex-title' });
      const exNote = h('p', { class: 'otto-bit-note' });
      const diffList = h('ul', { class: 'otto-bit-diff' });
      const card = h('div', { class: 'otto-bit-regcard' });
      ex.append(exStep, exTitle, exNote, diffList, card);

      let mode = '';
      let shown = '';
      let els = {};
      let heads = {};
      let selKey = 'A';
      let focusKey = 'A';

      function regAria(it) {
        const role = O.ROLE_NAMES[it.role];
        if (it.role === 'stack') return 'Pila interna: 7 livelli da 14 bit';
        if (it.role === 'zp') return 'Pagina zero: 256 byte di memoria';
        if (it.role === 'ghost') return 'Byte alto della pila, fisso a 01';
        return it.label + ': ' + role + ', ' + it.bits + ' bit';
      }

      function fillFor(role) {
        if (role === 'stack') return 'url(#otto-bit-levels)';
        if (role === 'zp') return 'url(#otto-bit-zpgrid)';
        return 'url(#otto-bit-bits)';
      }

      function makeReg(it) {
        const outer = s('g', { class: 'otto-bit-reg role-' + it.role, tabindex: '-1', role: 'button', 'aria-label': regAria(it), 'data-k': it.k, transform: 'translate(' + it.x + ' ' + it.y + ')' });
        const inner = s('g', { class: 'otto-bit-reg-in' });
        const ring = s('rect', { class: 'ring', x: 2.5, y: 2.5, width: it.w - 5, height: it.h - 5, rx: 3.5 });
        const box = s('rect', { class: 'box', width: it.w, height: it.h, rx: 5 });
        const pat = s('rect', { class: 'pat', width: it.w, height: it.h, rx: 5, fill: fillFor(it.role) });
        const big = it.role === 'stack' || it.role === 'zp';
        const nm = s('text', { class: 'nm' + (big ? ' long' : '') + (fits(it.label, it.w) ? '' : ' fit'), x: it.w / 2, y: big ? it.h / 2 - 2 : it.h / 2 + 5, 'text-anchor': 'middle' }, it.label);
        const bt = s('text', { class: 'bt', x: it.w - 5, y: 11, 'text-anchor': 'end' }, big ? '' : String(it.bits));
        const sub = s('text', { class: 'sub', x: it.w / 2, y: it.h / 2 + 14, 'text-anchor': 'middle' }, it.role === 'stack' ? '7 × 14 bit' : it.role === 'zp' ? '256 byte' : '');
        inner.append(box, pat, ring, nm, sub, bt);
        outer.append(inner);
        const e = { k: it.k, outer: outer, inner: inner, ring: ring, box: box, pat: pat, nm: nm, bt: bt, sub: sub, big: big, cur: { x: it.x, y: it.y, w: it.w, h: it.h }, label: it.label, role: it.role, tw: null };
        outer.addEventListener('click', () => pick(it.k, true));
        outer.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(e.k, true); }
        });
        outer.addEventListener('focus', () => { focusKey = e.k; });
        return e;
      }

      // una sigla di 3 o più lettere non entra in una casella da 4 bit: carattere più piccolo
      function fits(label, w) { return String(label).length <= 2 || w >= 60; }

      function place(e, g) {
        e.cur = g;
        if (!e.big) e.nm.classList.toggle('fit', !fits(e.label, g.w));
        e.outer.setAttribute('transform', 'translate(' + g.x.toFixed(2) + ' ' + g.y.toFixed(2) + ')');
        setAttrs(e.box, { width: g.w.toFixed(2), height: g.h.toFixed(2) });
        setAttrs(e.pat, { width: g.w.toFixed(2), height: g.h.toFixed(2) });
        setAttrs(e.ring, { width: Math.max(0, g.w - 5).toFixed(2), height: Math.max(0, g.h - 5).toFixed(2) });
        e.nm.setAttribute('x', (g.w / 2).toFixed(2));
        e.nm.setAttribute('y', (e.big ? g.h / 2 - 2 : g.h / 2 + 5).toFixed(2));
        e.sub.setAttribute('x', (g.w / 2).toFixed(2));
        e.bt.setAttribute('x', (g.w - 5).toFixed(2));
      }

      function setRole(e, it) {
        if (e.role !== it.role) {
          e.outer.classList.remove('role-' + e.role);
          e.outer.classList.add('role-' + it.role);
          e.role = it.role;
        }
        e.outer.setAttribute('aria-label', regAria(it));
        e.bt.textContent = e.big ? '' : String(it.bits);
      }

      function relabel(e, label) {
        if (e.label === label) return;
        e.label = label;
        if (!e.big) e.nm.classList.toggle('fit', !fits(label, e.cur.w));
        if (reduced() || !e.nm.animate) { e.nm.textContent = label; return; }
        const out = e.nm.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CP.dur.instant, easing: SHARP, fill: 'forwards' });
        out.finished.then(() => {
          e.nm.textContent = label;
          out.cancel();
          e.nm.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CP.dur.fast, easing: EASE });
        }).catch(() => { e.nm.textContent = label; });
      }

      function geomOf(id) { return O.layoutRegs(id, mode); }

      function buildFor(id) {
        clear(regLayer);
        clear(headLayer);
        els = {};
        heads = {};
        const L = geomOf(id);
        svg.setAttribute('viewBox', '0 0 ' + L.width + ' ' + L.height);
        patBits.setAttribute('width', L.unit);
        patBits.firstChild.setAttribute('x1', L.unit - 0.5);
        patBits.firstChild.setAttribute('x2', L.unit - 0.5);
        const lev = (mode === 'narrow' ? (2 * 32 + 14) : (2 * 36 + 16)) / 7;
        patLev.setAttribute('height', lev.toFixed(3));
        patLev.firstChild.setAttribute('y1', (lev - 0.5).toFixed(3));
        patLev.firstChild.setAttribute('y2', (lev - 0.5).toFixed(3));
        const zpw = (mode === 'narrow' ? 128 : 160) / 16;
        const zph = (mode === 'narrow' ? 78 : 88) / 16;
        patZp.setAttribute('width', zpw);
        patZp.setAttribute('height', zph);
        patZp.firstChild.setAttribute('d', 'M' + zpw + ' 0 V' + zph + ' M0 ' + zph + ' H' + zpw);
        Object.values(L.items).forEach((it) => {
          const e = makeReg(it);
          els[it.k] = e;
          regLayer.append(e.outer);
        });
        L.heads.forEach((hd) => {
          const t = s('text', { class: 'otto-bit-head', x: hd.x, y: hd.y }, hd.text);
          heads[hd.id] = { el: t, text: hd.text, x: hd.x, y: hd.y };
          headLayer.append(t);
        });
        shown = id;
        if (!els[selKey]) selKey = 'A';
        focusKey = els[focusKey] ? focusKey : selKey;
        roving();
        mark();
      }

      function orderKeys() {
        return Object.values(els).sort((a, b) => (a.cur.y - b.cur.y) || (a.cur.x - b.cur.x)).map((e) => e.k);
      }
      function roving() {
        Object.values(els).forEach((e) => e.outer.setAttribute('tabindex', e.k === focusKey ? '0' : '-1'));
      }
      function mark() {
        Object.values(els).forEach((e) => {
          e.outer.classList.toggle('is-sel', e.k === selKey);
          e.outer.setAttribute('aria-pressed', String(e.k === selKey));
        });
      }

      svg.addEventListener('keydown', (ev) => {
        const keys = orderKeys();
        let i = keys.indexOf(focusKey);
        if (i < 0) i = 0;
        let j = -1;
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') j = Math.min(keys.length - 1, i + 1);
        else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') j = Math.max(0, i - 1);
        else if (ev.key === 'Home') j = 0;
        else if (ev.key === 'End') j = keys.length - 1;
        if (j < 0) return;
        ev.preventDefault();
        focusKey = keys[j];
        roving();
        els[focusKey].outer.focus();
      });

      function pick(k, announce) {
        if (!els[k]) return;
        selKey = k;
        focusKey = k;
        roving();
        mark();
        renderCard(true);
        if (announce) {
          const it = geomOf(shown).items[k];
          ctx.say(regAria(it) + '. ' + O.regText(shown, k));
        }
      }

      function renderCard(animate) {
        clear(card);
        const it = geomOf(shown).items[selKey];
        if (!it) return;
        const label = it.role === 'stack' ? 'Pila interna' : it.role === 'zp' ? 'Pagina zero' : it.role === 'ghost' ? 'Byte alto della pila' : it.label;
        const meta = it.role === 'stack' ? '7 livelli da 14 bit' : it.role === 'zp' ? '256 byte di memoria' : O.ROLE_NAMES[it.role] + ' · ' + it.bits + ' bit';
        card.append(h('p', { class: 'otto-bit-regcard-h' }, h('b', null, label), ' ', h('small', null, meta)));
        if (it.flags) card.append(h('p', { class: 'otto-bit-flags' }, it.flags.split(' ').map((f) => h('span', null, f))));
        card.append(h('p', null, O.regText(shown, selKey)));
        if (animate) rise(card, 0);
      }

      function renderEx(prev, id, animate) {
        const c = O.CHIP[id];
        setText(exStep, 'Registri · ' + c.name);
        setText(exTitle, prev && prev !== id ? capital(ART[prev].da) + ' ' + ART[id].a : 'Il banco ' + (id === 'z80' ? 'dello Z80' : id === '6800' || id === '6502' ? 'del ' + c.short : 'dell’' + c.short));
        setText(exNote, O.CHIP_REG_NOTE[id]);
        clear(diffList);
        const d = prev && prev !== id ? O.describeDiff(prev, id) : [];
        if (!d.length) {
          diffList.append(h('li', { class: 'hint' }, 'Scegli un altro chip nella fila in alto: le caselle comuni restano al loro posto, le altre compaiono o spariscono.'));
        }
        const SYM = { add: '+', del: '−', mod: '↻' };
        const WORD = { add: 'Arriva', del: 'Sparisce', mod: 'Cambia' };
        d.forEach((x, i) => {
          const li = h('li', { class: x.kind }, h('span', { class: 'sym', 'aria-hidden': 'true' }, SYM[x.kind]), h('span', { class: 'cp-sr' }, WORD[x.kind] + ': '), x.text);
          diffList.append(li);
          if (animate) rise(li, i);
        });
        if (animate) rise(exTitle, 0);
        renderCard(animate);
      }

      function capital(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

      function morph(prev, id) {
        const L = geomOf(id);
        const next = L.items;
        const removed = Object.keys(els).filter((k) => !next[k]);
        const added = Object.keys(next).filter((k) => !els[k]);
        const kept = Object.keys(next).filter((k) => els[k]);
        const motion = !reduced();
        // 1. escono
        removed.forEach((k) => {
          const e = els[k];
          delete els[k];
          if (e.tw) e.tw.cancel();
          if (!motion || !e.inner.animate) { e.outer.remove(); return; }
          e.outer.setAttribute('tabindex', '-1');
          e.outer.style.pointerEvents = 'none';
          const a = e.inner.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.82)' }], { duration: CP.dur.fast, easing: SHARP, fill: 'forwards' });
          a.finished.then(() => e.outer.remove()).catch(() => e.outer.remove());
        });
        // 2. scivolano e cambiano larghezza
        kept.forEach((k) => {
          const e = els[k];
          const it = next[k];
          setRole(e, it);
          relabel(e, it.label);
          const a = e.cur;
          if (e.tw) e.tw.cancel();
          if (a.x === it.x && a.y === it.y && a.w === it.w && a.h === it.h) return;
          if (!motion) { place(e, { x: it.x, y: it.y, w: it.w, h: it.h }); return; }
          e.tw = CP.tween({
            from: [a.x, a.y, a.w, a.h], to: [it.x, it.y, it.w, it.h], duration: CP.dur.slow, delay: 80, ease: 'smooth',
            onUpdate: (v) => place(e, { x: v[0], y: v[1], w: v[2], h: v[3] }),
          });
          if (a.w !== it.w) {
            e.outer.classList.add('is-changed');
            setTimeout(() => e.outer.classList.remove('is-changed'), 1200);
          }
        });
        // 3. entrano, a righe
        added.sort((p, q) => (next[p].y - next[q].y) || (next[p].x - next[q].x)).forEach((k, i) => {
          const e = makeReg(next[k]);
          els[k] = e;
          regLayer.append(e.outer);
          if (motion && e.inner.animate) {
            e.inner.animate([{ opacity: 0, transform: 'translateY(-10px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: CP.dur.normal, delay: 300 + Math.min(i, 9) * 50, easing: EASE, fill: 'backwards' });
            e.outer.classList.add('is-new');
            setTimeout(() => e.outer.classList.remove('is-new'), 1500);
          }
        });
        // intestazioni delle colonne
        const nextHeads = {};
        L.heads.forEach((hd) => { nextHeads[hd.id] = hd; });
        Object.keys(heads).forEach((idh) => {
          const hd = heads[idh];
          if (!nextHeads[idh]) {
            delete heads[idh];
            if (!motion || !hd.el.animate) { hd.el.remove(); return; }
            hd.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CP.dur.fast, fill: 'forwards' }).finished.then(() => hd.el.remove()).catch(() => hd.el.remove());
          }
        });
        L.heads.forEach((nh) => {
          const hd = heads[nh.id];
          if (!hd) {
            const t = s('text', { class: 'otto-bit-head', x: nh.x, y: nh.y }, nh.text);
            headLayer.append(t);
            heads[nh.id] = { el: t, text: nh.text, x: nh.x, y: nh.y };
            anim(t, [{ opacity: 0 }, { opacity: 1 }], { duration: CP.dur.normal, delay: 300, fill: 'backwards' });
            return;
          }
          if (hd.text !== nh.text) {
            hd.text = nh.text;
            hd.el.textContent = nh.text;
            anim(hd.el, [{ opacity: 0 }, { opacity: 1 }], { duration: CP.dur.normal });
          }
          if (hd.x !== nh.x || hd.y !== nh.y) {
            const from = [hd.x, hd.y];
            hd.x = nh.x; hd.y = nh.y;
            CP.tween({ from: from, to: [nh.x, nh.y], duration: CP.dur.slow, delay: 80, ease: 'smooth', onUpdate: (v) => { hd.el.setAttribute('x', v[0].toFixed(2)); hd.el.setAttribute('y', v[1].toFixed(2)); } });
          }
        });
        shown = id;
        if (!els[selKey]) selKey = 'A';
        if (!els[focusKey]) focusKey = selKey;
        roving();
        mark();
        svg.setAttribute('aria-label', 'Banco dei registri del ' + O.CHIP[id].name + ': ' + Object.keys(els).length + ' caselle. Usa le frecce per spostarti tra i registri e Invio per sapere a che cosa servono.');
      }

      return {
        el: el, ex: ex,
        enter() {
          const m = st.narrow ? 'narrow' : 'wide';
          if (mode !== m || shown !== st.chip) { mode = m; buildFor(st.chip); }
          svg.setAttribute('aria-label', 'Banco dei registri del ' + O.CHIP[st.chip].name + '. Usa le frecce per spostarti tra i registri e Invio per sapere a che cosa servono.');
          renderEx(null, st.chip, false);
        },
        resize(m) { if (mode && mode !== m) { mode = m; buildFor(shown || st.chip); } },
        select(prev, id) {
          morph(prev, id);
          renderEx(prev, id, true);
          const d = O.describeDiff(prev, id);
          ctx.say(capital(ART[prev].da) + ' ' + ART[id].a + ': ' + d.map((x) => ({ add: 'arriva ', del: 'sparisce ', mod: '' })[x.kind] + x.text).join('; ') + '.');
        },
      };
    }

    /* =========================================================
       3 · PREZZI
       ========================================================= */

    function makePrices() {
      const el = h('div', { class: 'otto-bit-view otto-bit-v-price' });
      const playBtn = ui.button({ label: 'Riproduci', icon: '▶︎', primary: true, onClick: () => togglePlay() });
      const range = ui.range({ label: 'Data', min: 0, max: O.T_MAX, step: 1, value: 0, format: (v) => O.monthLabel(v), onInput: (v) => { stopPlay(); setT(v, true); } });
      range.classList.add('otto-bit-date');
      const pbar = h('div', { class: 'cp-bar otto-bit-subbar' }, playBtn, range);
      const svg = s('svg', { class: 'otto-bit-svg otto-bit-price', role: 'img' });
      el.append(pbar, svg);

      const ex = h('div', { class: 'otto-bit-ex' });
      const exStep = h('span', { class: 'step' });
      const exTitle = h('h4', { class: 'otto-bit-ex-title' });
      const exText = h('p', { class: 'otto-bit-ev-text' });
      const evList = h('ol', { class: 'otto-bit-events', 'aria-label': 'Momenti chiave' });
      const evBtns = O.PRICE_EVENTS.map((e) => {
        const b = h('button', { type: 'button', class: 'otto-bit-ev', onclick: () => { stopPlay(); setT(e.t, true); } }, h('span', { class: 'd' }, O.monthLabel(e.t)), h('span', { class: 't' }, e.title));
        evList.append(h('li', null, b));
        return b;
      });
      const exFoot = h('p', { class: 'otto-bit-ev-foot' }, 'Solo prezzi verificati, in dollari dell’epoca; «≈» vuol dire circa. Con processori così economici costruire un computer in casa diventa possibile: lo racconta la sezione ', h('a', { href: '../storia-pc/index.html#primi-pc' }, 'Architettura e storia del PC'), '.');
      ex.append(exStep, exTitle, exText, evList, exFoot);

      const TAGS = ['8080', '6800', '6502'];
      let mode = '';
      let G = null;
      let t = 0;
      let shownKey = '';
      let lastEv = -2;
      let tags = {};
      let cursor = null;
      let playing = false;
      let stopTick = null;
      let pauseLeft = 0;

      function geom(m) {
        if (m === 'narrow') return { W: 340, H: 318, x0: 40, x1: 326, top: 46, bot: 196, rail: 14, cols: [104, 192, 280], axisY: 252, ax0: 22, ax1: 322, tagW: 72 };
        return { W: 640, H: 300, x0: 54, x1: 610, top: 48, bot: 214, rail: 14, cols: [214, 344, 474], axisY: 254, ax0: 54, ax1: 610, tagW: 76 };
      }
      const yOf = (p) => G.top + (1 - p / 400) * (G.bot - G.top);
      const xOf = (m) => G.ax0 + (m / O.T_MAX) * (G.ax1 - G.ax0);

      function tagShape(w) {
        const hw = w / 2;
        return 'M0 -26 L' + hw + ' -12 V22 Q' + hw + ' 25 ' + (hw - 3) + ' 25 H' + (3 - hw) + ' Q' + (-hw) + ' 25 ' + (-hw) + ' 22 V-12 Z';
      }

      function build(m) {
        mode = m;
        G = geom(m);
        clear(svg);
        tags = {};
        shownKey = '';
        svg.setAttribute('viewBox', '0 0 ' + G.W + ' ' + G.H);
        svg.append(s('defs', null, s('marker', { id: 'otto-bit-drop-ar', viewBox: '0 0 8 8', refX: 6, refY: 4, markerWidth: 6, markerHeight: 6, orient: 'auto' }, s('path', { class: 'otto-bit-drop-head', d: 'M0 0 L8 4 L0 8 Z' }))));
        // griglia dei prezzi
        const grid = s('g', { class: 'otto-bit-pgrid' });
        [0, 100, 200, 300, 400].forEach((p) => {
          const y = yOf(p);
          grid.append(s('line', { x1: G.x0, x2: G.x1, y1: y, y2: y }));
          grid.append(s('text', { x: G.x0 - 6, y: y + 4, 'text-anchor': 'end' }, p + ' $'));
        });
        svg.append(grid);
        // riferimento: il listino dell'8008 nel 1972
        const ref = s('g', { class: 'otto-bit-ref' });
        ref.append(s('line', { x1: G.x0, x2: G.x1, y1: yOf(120), y2: yOf(120) }));
        ref.append(s('text', { x: G.x0 + 6, y: yOf(120) + 15 }, '8008 nel 1972: 120 $'));
        svg.append(ref);
        // binario a cui sono appesi i cartellini
        svg.append(s('line', { class: 'otto-bit-hanger', x1: G.cols[0] - 50, x2: G.cols[2] + 50, y1: G.rail, y2: G.rail }));
        // linea del tempo
        const axis = s('g', { class: 'otto-bit-axis' });
        axis.append(s('line', { class: 'base', x1: G.ax0, x2: G.ax1, y1: G.axisY, y2: G.axisY }));
        for (let mo = 0; mo <= O.T_MAX + 1; mo += 3) {
          const x = xOf(Math.min(mo, O.T_MAX + 1) * O.T_MAX / (O.T_MAX + 1));
          const big = mo % 12 === 0;
          axis.append(s('line', { class: big ? 'tick big' : 'tick', x1: x, x2: x, y1: G.axisY - (big ? 7 : 3), y2: G.axisY + (big ? 7 : 3) }));
        }
        [1974, 1975, 1976].forEach((yr, i) => axis.append(s('text', { class: 'yr', x: xOf(i * 12 + 5.5), y: G.axisY + 39, 'text-anchor': 'middle' }, String(yr))));
        const evDots = s('g', { class: 'otto-bit-evdots' });
        const evLabels = [['6800 · 8080', 2.5], ['6502', 20], ['Z80', 30]];
        evLabels.forEach(([txt, mo]) => evDots.append(s('text', { class: 'evl', x: xOf(mo), y: G.axisY + 20, 'text-anchor': 'middle' }, txt)));
        O.PRICE_EVENTS.forEach((e) => evDots.append(s('circle', { class: 'evd', cx: xOf(e.t), cy: G.axisY, r: 4 })));
        axis.append(evDots);
        // zona cliccabile della linea del tempo (con la tastiera si usa il cursore «Data»)
        const hit = s('rect', { class: 'otto-bit-axis-hit', x: G.ax0 - 6, y: G.axisY - 26, width: G.ax1 - G.ax0 + 12, height: 52 });
        hit.addEventListener('click', (ev) => {
          const r = svg.getBoundingClientRect();
          const vb = svg.viewBox.baseVal;
          const x = (ev.clientX - r.left) * (vb.width / r.width);
          const mo = Math.round(((x - G.ax0) / (G.ax1 - G.ax0)) * O.T_MAX);
          stopPlay();
          setT(Math.max(0, Math.min(O.T_MAX, mo)), true);
        });
        axis.append(hit);
        svg.append(axis);
        cursor = s('g', { class: 'otto-bit-cursor' }, s('line', { x1: 0, x2: 0, y1: G.axisY - 20, y2: G.axisY + 9 }), s('circle', { cx: 0, cy: G.axisY, r: 6.5 }));
        svg.append(cursor);
        // cartellini
        TAGS.forEach((id, i) => {
          const x = G.cols[i];
          const ghost = s('g', { class: 'otto-bit-ghost', opacity: 0 }, s('path', { d: tagShape(G.tagW) }), s('text', { class: 'gp', x: 0, y: 12, 'text-anchor': 'middle' }, ''));
          const arrow = s('line', { class: 'otto-bit-drop', x1: x, x2: x, y1: 0, y2: 0, opacity: 0, 'marker-end': 'url(#otto-bit-drop-ar)' });
          const string = s('line', { class: 'otto-bit-string', x1: x, x2: x, y1: G.rail, y2: G.rail });
          const g = s('g', { class: 'otto-bit-tag t-' + id, opacity: 0 });
          g.append(s('path', { class: 'shape', d: tagShape(G.tagW) }), s('circle', { class: 'hole', cx: 0, cy: -14, r: 3.2 }), s('text', { class: 'nm', x: 0, y: 2, 'text-anchor': 'middle' }, O.CHIP[id].short), s('text', { class: 'pr', x: 0, y: 18, 'text-anchor': 'middle' }, ''));
          // nota accanto al cartellino (sotto, sugli schermi stretti, dove a destra non c'è posto)
          const side = m !== 'narrow';
          const note = s('text', { class: 'otto-bit-tagnote', x: side ? x + G.tagW / 2 + 10 : x, y: 0, 'text-anchor': side ? 'start' : 'middle' }, '');
          svg.append(ghost, arrow, string, g, note);
          tags[id] = { x: x, g: g, ghost: ghost, arrow: arrow, string: string, note: note, side: side, pr: g.querySelector('.pr'), y: G.rail, on: false, p: null, tw: null };
        });
        paint(false);
      }

      function stateKey() {
        return TAGS.map((id) => { const p = O.priceAt(id, t); return id + ':' + (p ? p.p : '-'); }).join('|');
      }

      function placeTag(tg, y) {
        tg.y = y;
        tg.g.setAttribute('transform', 'translate(' + tg.x + ' ' + y.toFixed(2) + ')');
        tg.string.setAttribute('y2', (y - 14).toFixed(2));
        tg.note.setAttribute('y', (tg.side ? y + 6 : y + 42).toFixed(2));
      }

      function paint(animate) {
        cursor.setAttribute('transform', 'translate(' + xOf(t).toFixed(2) + ' 0)');
        const key = stateKey();
        if (key === shownKey) return;
        shownKey = key;
        const motion = animate && !reduced();
        TAGS.forEach((id, i) => {
          const tg = tags[id];
          const pr = O.priceAt(id, t);
          if (tg.tw) { tg.tw.cancel(); tg.tw = null; }
          if (!pr) {
            if (tg.on) {
              tg.on = false;
              tg.p = null;
              if (motion) {
                tg.tw = CP.tween({ from: tg.y, to: G.rail + 30, duration: CP.dur.normal, ease: 'sharp', onUpdate: (v) => placeTag(tg, v) });
                // senza fill: finita la dissolvenza vale l'attributo opacity="0" impostato qui sotto
                anim(tg.g, [{ opacity: 1 }, { opacity: 0 }], { duration: CP.dur.normal });
                anim(tg.string, [{ opacity: 1 }, { opacity: 0 }], { duration: CP.dur.normal });
              }
            }
            tg.g.setAttribute('opacity', 0);
            tg.string.setAttribute('opacity', 0);
            tg.ghost.setAttribute('opacity', 0);
            tg.arrow.setAttribute('opacity', 0);
            setText(tg.note, '');
            return;
          }
          const ty = yOf(pr.p);
          const label = (pr.approx ? '≈ ' : '') + pr.p + ' $';
          const first = !tg.on;
          const from = first ? G.rail + 20 : tg.y;
          tg.on = true;
          tg.g.setAttribute('opacity', 1);
          tg.string.setAttribute('opacity', 1);
          setText(tg.pr, label);
          // il prezzo di prima resta come sagoma tratteggiata, con una freccia verso quello nuovo
          const series = O.PRICE_SERIES[id];
          const prevPt = series.filter((x) => x.t < pr.since).pop();
          if (prevPt) {
            const gy = yOf(prevPt.p);
            tg.ghost.setAttribute('transform', 'translate(' + tg.x + ' ' + gy.toFixed(2) + ')');
            setText(tg.ghost.querySelector('.gp'), (prevPt.approx ? '≈ ' : '') + prevPt.p + ' $');
            tg.ghost.setAttribute('opacity', 1);
            setAttrs(tg.arrow, { y1: (gy + 27).toFixed(2), y2: (ty - 30).toFixed(2), opacity: 1 });
            if (motion) { anim(tg.ghost, [{ opacity: 0 }, { opacity: 1 }], { duration: CP.dur.slow, delay: 250, fill: 'backwards' }); anim(tg.arrow, [{ opacity: 0 }, { opacity: 1 }], { duration: CP.dur.slow, delay: 450, fill: 'backwards' }); }
          } else {
            tg.ghost.setAttribute('opacity', 0);
            tg.arrow.setAttribute('opacity', 0);
          }
          setText(tg.note, id === '6502' ? '6501: 20 $' : '');
          if (motion && (first || Math.abs(from - ty) > 0.5)) {
            if (first) anim(tg.g, [{ opacity: 0 }, { opacity: 1 }], { duration: CP.dur.fast });
            tg.tw = CP.tween({ from: from, to: ty, duration: first ? CP.dur.slow : CP.dur.slow + 150, delay: i * 70, ease: 'bounce', onUpdate: (v) => placeTag(tg, v) });
            if (!first) {
              const flashR = tg.g.querySelector('.shape');
              setTimeout(() => anim(flashR, [{ filter: 'brightness(1.6)' }, { filter: 'none' }], { duration: CP.dur.slow }), i * 70 + 300);
            }
          } else {
            placeTag(tg, ty);
          }
        });
        const visible = TAGS.filter((id) => O.priceAt(id, t)).map((id) => O.CHIP[id].short + ' ' + (O.priceAt(id, t).approx ? 'circa ' : '') + O.priceAt(id, t).p + ' dollari');
        svg.setAttribute('aria-label', 'Prezzi a ' + O.monthLabel(t) + ': ' + (visible.length ? visible.join(', ') : 'nessuno dei tre chip è ancora in vendita') + '.');
      }

      function paintEx(animate) {
        const at = O.eventAt(t);
        setText(exStep, O.monthLabel(t));
        if (at.index !== lastEv) {
          lastEv = at.index;
          if (at.event) {
            setText(exTitle, at.event.title);
            setText(exText, at.event.text);
          } else {
            setText(exTitle, 'Prima della corsa');
            setText(exText, 'All’inizio del 1974 l’unico 8 bit di Intel in catalogo è l’8008, a 120 dollari dal 1972. Premi ▶︎ Riproduci o sposta il cursore della data: i cartellini compaiono quando un chip arriva sul mercato e scendono quando il prezzo cala.');
          }
          evBtns.forEach((b, i) => { if (i === at.index) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
          if (animate) { rise(exTitle, 0); rise(exText, 1); }
          if (animate && at.event) ctx.say(at.event.say);
        }
      }

      function setT(v, user) {
        t = Math.max(0, Math.min(O.T_MAX, v));
        const r = Math.round(t);
        if (+range.input.value !== r) range.set(r);
        paint(true);
        paintEx(true);
        if (user) { /* niente altro: il cursore e i cartellini sono già aggiornati */ }
      }

      function setPlayLabel(on) {
        const ico = playBtn.querySelector('.cp-ico');
        const lab = playBtn.querySelector('span:not(.cp-ico)');
        setText(ico, on ? '❚❚' : '▶︎');
        setText(lab, on ? 'Pausa' : 'Riproduci');
      }

      function stopPlay() {
        if (stopTick) { stopTick(); stopTick = null; }
        if (playing) { playing = false; setPlayLabel(false); }
      }

      function togglePlay() {
        if (playing) { stopPlay(); return; }
        if (reduced()) {
          // movimento ridotto: niente scorrimento continuo, si salta al momento successivo
          const nx = O.eventAt(t).next;
          setT(nx ? nx.t : 0, true);
          return;
        }
        if (t >= O.T_MAX) setT(0, true);
        playing = true;
        pauseLeft = 250;
        setPlayLabel(true);
        stopTick = ctx.tick((dt) => {
          if (pauseLeft > 0) { pauseLeft -= dt; return; }
          let nt = t + dt * 0.0055;
          const ev = O.PRICE_EVENTS.find((e) => e.t > t && e.t <= nt);
          if (ev) { nt = ev.t; pauseLeft = 1100; }
          if (nt >= O.T_MAX) { nt = O.T_MAX; setT(nt, false); stopPlay(); return; }
          setT(nt, false);
        });
      }

      return {
        el: el, ex: ex,
        enter() { const m = st.narrow ? 'narrow' : 'wide'; if (mode !== m) build(m); paint(false); lastEv = -2; paintEx(false); },
        leave() { stopPlay(); },
        resize(m) { if (mode && mode !== m) build(m); },
      };
    }

    /* =========================================================
       4 · SFIDA
       ========================================================= */

    function makeChallenge() {
      const el = h('div', { class: 'otto-bit-view otto-bit-v-quest' });
      const IDS = ['8080', '6502', 'z80'];
      const SEEDS = { '8080': 11, '6502': 3, 'z80': 29 };
      // geometria della macchina: CPU a sinistra, memoria a destra, i due bus nel corridoio in mezzo
      const MX = { cpuR: 140, memL: 200, dataY: 66, addrY: 114 };
      const P = {};
      // solved: risolto almeno una volta (conta per l'obiettivo); ok: l'ordine attuale è stato eseguito ed è giusto
      IDS.forEach((id) => { P[id] = { order: [], pool: O.shuffled(id, SEEDS[id]), solved: false, ok: false, shown: new Set() }; });
      let cur = '8080';
      let variant = 'zp';
      let runTok = 0;
      let busy = false;
      let stepIdx = -1;
      let trace = null;
      let betsLocked = false;
      const bet = { bytes: null, cycles: null };

      // --- 1 · scommessa
      const optChips = IDS.map((id) => ({ value: id, label: O.CHIP[id].short }));
      const betBytes = ui.seg({ label: 'Scommessa: chi usa meno byte', options: optChips, value: null, onChange: (v) => { bet.bytes = v; betNote(); } });
      const betCycles = ui.seg({ label: 'Scommessa: chi usa meno cicli di clock', options: optChips, value: null, onChange: (v) => { bet.cycles = v; betNote(); } });
      const betMsg = h('p', { class: 'otto-bit-bet-msg' }, 'Scegli prima di eseguire: dopo la prima esecuzione la scommessa si chiude.');
      const betBox = h('div', { class: 'otto-bit-block otto-bit-bet' },
        h('p', { class: 'otto-bit-kicker' }, '1 · Scommetti'),
        h('p', { class: 'otto-bit-task' }, 'Stesso compito per tre chip: sommare i numeri nelle celle 0080h e 0081h e scrivere il risultato in 0082h. Chi ci riesce con meno byte di programma? E con meno cicli di clock?'),
        h('div', { class: 'otto-bit-bet-rows' },
          h('div', { class: 'otto-bit-bet-row' }, h('span', { class: 'k' }, 'Meno byte'), betBytes),
          h('div', { class: 'otto-bit-bet-row' }, h('span', { class: 'k' }, 'Meno cicli'), betCycles)),
        betMsg);

      function betNote() {
        if (betsLocked) return;
        const b = bet.bytes ? O.CHIP[bet.bytes].short : '…';
        const c = bet.cycles ? O.CHIP[bet.cycles].short : '…';
        setText(betMsg, 'La tua scommessa: meno byte ' + b + ', meno cicli ' + c + '. Si chiude alla prima esecuzione.');
      }
      function lockBets() {
        if (betsLocked) return;
        betsLocked = true;
        [betBytes, betCycles].forEach((sg) => sg.querySelectorAll('button').forEach((b) => { b.disabled = true; }));
        const b = bet.bytes ? O.CHIP[bet.bytes].short : 'nessuno';
        const c = bet.cycles ? O.CHIP[bet.cycles].short : 'nessuno';
        setText(betMsg, 'Scommessa chiusa: meno byte ' + b + ', meno cicli ' + c + '. Il verdetto arriva quando avrai risolto tutti e tre i programmi.');
      }

      // --- 2 · ordine ed esecuzione
      const tabs = ui.seg({ label: 'Chip della sfida', options: IDS.map((id) => ({ value: id, label: O.CHIP[id].name })), value: cur, onChange: (v) => switchChip(v) });
      tabs.classList.add('otto-bit-tabs');
      const prog = h('ol', { class: 'otto-bit-prog', 'aria-label': 'Il tuo programma' });
      const pool = h('div', { class: 'otto-bit-pool', role: 'group', 'aria-label': 'Istruzioni da sistemare' });
      const code = h('div', { class: 'otto-bit-code' },
        h('p', { class: 'otto-bit-code-h' }, 'Il tuo programma'),
        h('div', { class: 'otto-bit-prog-head', 'aria-hidden': 'true' }, h('span', null, '#'), h('span', null, 'istruzione'), h('span', null, 'codice'), h('span', null, 'cicli')),
        prog);
      const poolBox = h('div', { class: 'otto-bit-poolbox' },
        h('p', { class: 'otto-bit-code-h' }, 'Istruzioni da sistemare ', h('small', null, 'clicca nell’ordine giusto')), pool);
      const mach = buildMachine();
      const runBtn = ui.button({ label: 'Esegui', icon: '▶︎', primary: true, onClick: () => runAll() });
      const stepBtn = ui.button({ label: 'Un passo', icon: '⏭︎', onClick: () => runStep() });
      const clearBtn = ui.button({ label: 'Svuota', icon: '↺', onClick: () => emptyProgram() });
      const roBytes = ui.readout('Byte', '0');
      const roCycles = ui.readout('Cicli', '0');
      const runBar = h('div', { class: 'cp-bar otto-bit-runbar' }, runBtn, stepBtn, clearBtn, h('span', { class: 'grow' }), roBytes, roCycles);
      const puzBox = h('div', { class: 'otto-bit-block otto-bit-puz' },
        h('p', { class: 'otto-bit-kicker' }, '2 · Metti in ordine ed esegui'),
        tabs,
        h('div', { class: 'otto-bit-puz-grid' }, code, poolBox, mach.wrap),
        runBar);

      // --- 3 · confronto
      const cmp = buildCompare();
      const varSeg = ui.seg({ label: 'Dove stanno i numeri', options: [{ value: 'zp', label: 'Numeri in 0080h (pagina zero)' }, { value: 'abs', label: 'Numeri in 1200h' }], value: 'zp', onChange: (v) => { variant = v; cmp.paint(true); verdict(); } });
      const varRow = h('div', { class: 'otto-bit-var', hidden: true }, h('span', { class: 'k' }, 'E se i numeri stessero altrove?'), varSeg);
      const verdictP = h('p', { class: 'otto-bit-verdict' }, 'Risolvi un programma per vedere i suoi numeri.');
      const cmpBox = h('div', { class: 'otto-bit-block otto-bit-cmp' }, h('p', { class: 'otto-bit-kicker' }, '3 · Confronta'), cmp.svg, varRow, verdictP);

      el.append(betBox, puzBox, cmpBox);

      // --- spiegazione
      const ex = h('div', { class: 'otto-bit-ex' });
      const exStep = h('span', { class: 'step' });
      const exTitle = h('h4', { class: 'otto-bit-ex-title' });
      const exBody = h('div', { class: 'otto-bit-ex-body' });
      ex.append(exStep, exTitle, exBody);

      function say(step, title, paras, announce) {
        setText(exStep, step);
        setText(exTitle, title);
        // didascalia sotto la macchina: sugli schermi stretti la spiegazione è più in basso
        setText(mach.capStep, step);
        setText(mach.capTitle, title);
        setText(mach.capText, typeof paras[0] === 'string' ? paras[0] : '');
        clear(exBody);
        paras.forEach((p, i) => { const n = typeof p === 'string' ? h('p', null, p) : p; exBody.append(n); rise(n, i); });
        if (announce) ctx.say(announce);
      }

      function intro() {
        const c = O.CHIP[cur];
        const hexNote = cur === '6502'
          ? 'Nel linguaggio di MOS i numeri esadecimali iniziano con $: $80 è la cella 0080h, in pagina zero, quindi basta un byte per scriverla.'
          : 'I numeri che finiscono con h sono esadecimali: 0080h è la cella 128. HL è la coppia di registri H e L usata come puntatore alla memoria.';
        say('Sfida · ' + c.name, 'Come si gioca', [
          'Clicca le «Istruzioni da sistemare» nell’ordine in cui vuoi eseguirle; clicca una riga del programma per toglierla. Quando sono tutte al loro posto premi ▶︎ Esegui, oppure «Un passo» per andare piano.',
          hexNote,
          'Durante l’esecuzione vedi gli indirizzi (ambra) e i dati (azzurro) viaggiare sul bus, e i contatori di byte e cicli che salgono.',
        ]);
      }

      /* macchina: CPU, bus e tre celle di memoria */
      function buildMachine() {
        const wrap = h('div', { class: 'otto-bit-mach' });
        const svg = s('svg', { class: 'otto-bit-svg otto-bit-mach-svg', viewBox: '0 0 340 238', role: 'img', 'aria-label': 'La CPU e tre celle di memoria collegate dal bus' });
        const cpuTitle = s('text', { class: 'otto-bit-m-title', x: 10, y: 18 }, 'CPU');
        const memTitle = s('text', { class: 'otto-bit-m-title', x: MX.memL + 6, y: 18 }, 'Memoria');
        svg.append(cpuTitle, memTitle);
        svg.append(s('rect', { class: 'otto-bit-m-box', x: 4, y: 28, width: MX.cpuR - 4, height: 204, rx: 10 }));
        svg.append(s('rect', { class: 'otto-bit-m-box', x: MX.memL, y: 28, width: 336 - MX.memL, height: 204, rx: 10 }));
        // bus
        const dataBus = s('path', { class: 'cp-bus data otto-bit-m-bus', d: 'M' + MX.cpuR + ' ' + MX.dataY + ' H' + MX.memL });
        const addrBus = s('path', { class: 'cp-bus addr otto-bit-m-bus', d: 'M' + MX.cpuR + ' ' + MX.addrY + ' H' + MX.memL });
        svg.append(dataBus, addrBus);
        const mid = (MX.cpuR + MX.memL) / 2;
        svg.append(s('text', { class: 'otto-bit-m-bl', x: mid, y: MX.dataY - 11, 'text-anchor': 'middle' }, 'dati'));
        svg.append(s('text', { class: 'otto-bit-m-bl', x: mid, y: MX.addrY + 20, 'text-anchor': 'middle' }, 'indirizzi'));
        function regBox(y, name) {
          const g = s('g', { class: 'otto-bit-m-reg' });
          const lbl = s('text', { class: 'otto-bit-m-lbl', x: 14, y: y + 22 }, name);
          const box = s('rect', { class: 'otto-bit-m-val', x: 40, y: y, width: 90, height: 34, rx: 6 });
          const fl = s('rect', { class: 'otto-bit-m-flash', x: 40, y: y, width: 90, height: 34, rx: 6, opacity: 0 });
          const v = s('text', { class: 'otto-bit-m-num', x: 85, y: y + 23, 'text-anchor': 'middle' }, '0');
          g.append(lbl, box, fl, v);
          svg.append(g);
          return { lbl: lbl, v: v, fl: fl, cx: 85, cy: y + 17 };
        }
        const A = regBox(48, 'A');
        const R2 = regBox(96, 'HL');
        const aluD = 'M40 152 H130 L116 210 H54 Z';
        const alu = s('g', { class: 'otto-bit-m-alu' }, s('path', { d: aluD }), s('text', { x: 85, y: 186, 'text-anchor': 'middle' }, 'ALU'));
        const aluFl = s('path', { class: 'otto-bit-m-alufl', d: aluD, opacity: 0 });
        svg.append(alu, aluFl);
        const cells = [0, 1, 2].map((i) => {
          const y = 48 + i * 48;
          const lbl = s('text', { class: 'otto-bit-m-addr', x: MX.memL + 10, y: y + 22 }, '');
          const box = s('rect', { class: 'otto-bit-m-val cell', x: 262, y: y, width: 64, height: 34, rx: 6 });
          const fl = s('rect', { class: 'otto-bit-m-flash', x: 262, y: y, width: 64, height: 34, rx: 6, opacity: 0 });
          const v = s('text', { class: 'otto-bit-m-num', x: 294, y: y + 23, 'text-anchor': 'middle' }, '');
          const mk = s('text', { class: 'otto-bit-m-mark', x: 321, y: y + 13, 'text-anchor': 'end' }, '');
          svg.append(lbl, box, fl, v, mk);
          return { lbl: lbl, box: box, v: v, fl: fl, mk: mk, cx: 294, cy: y + 17, ax: 232 };
        });
        svg.append(s('text', { class: 'otto-bit-m-hint', x: 268, y: 214, 'text-anchor': 'middle' }, '0082h: risultato'));
        const hint = svg.lastChild;
        function token(cls) {
          const g = s('g', { class: 'otto-bit-token ' + cls, opacity: 0 }, s('rect', { x: -27, y: -11, width: 54, height: 22, rx: 7 }), s('text', { x: 0, y: 4.5, 'text-anchor': 'middle' }, ''));
          svg.append(g);
          return g;
        }
        const tA = token('addr');
        const tD = token('data');
        const capStep = h('span', { class: 'k' }, '');
        const capTitle = h('b', null, '');
        const capText = h('span', { class: 'long' }, '');
        const cap = h('p', { class: 'otto-bit-mach-cap', 'aria-hidden': 'true' }, capStep, capTitle, capText);
        wrap.append(svg, cap);
        return { wrap: wrap, svg: svg, cpuTitle: cpuTitle, A: A, R2: R2, aluFl: aluFl, cells: cells, tA: tA, tD: tD, dataBus: dataBus, addrBus: addrBus, hint: hint, capStep: capStep, capTitle: capTitle, capText: capText };
      }

      function addr(a) { return O.addrText(cur, a); }

      function machineReset() {
        const M = mach;
        const base = O.ADDR.zp;
        setText(M.cpuTitle, 'CPU · ' + O.CHIP[cur].name);
        setText(M.A.v, '0');
        if (cur === '6502') { setText(M.R2.lbl, 'C'); setText(M.R2.v, '1'); } else { setText(M.R2.lbl, 'HL'); setText(M.R2.v, '0000h'); }
        [O.START.a, O.START.b, 0].forEach((v, i) => {
          setText(M.cells[i].lbl, addr(base + i));
          setText(M.cells[i].v, String(v));
          setText(M.cells[i].mk, '');
          M.cells[i].mk.classList.remove('ok', 'bad');
          M.cells[i].box.classList.remove('is-ok', 'is-bad');
        });
        setText(M.hint, addr(base + 2) + ': risultato');
        [M.tA, M.tD].forEach((t) => t.setAttribute('opacity', 0));
        M.dataBus.classList.remove('is-active');
        M.addrBus.classList.remove('is-active');
        roBytes.set('0');
        roCycles.set('0');
      }

      function cellOf(a) {
        const i = a - O.ADDR.zp;
        return i >= 0 && i < 3 ? mach.cells[i] : null;
      }

      function travel(tok, pts, label, dur) {
        setText(tok.lastChild, label);
        tok.setAttribute('opacity', 1);
        const lens = [];
        let total = 0;
        for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); lens.push(d); total += d; }
        const at = (u) => {
          let d = u * total;
          for (let i = 0; i < lens.length; i++) {
            if (d <= lens[i] || i === lens.length - 1) {
              const f = lens[i] ? Math.min(1, d / lens[i]) : 1;
              const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f;
              const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
              tok.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')');
              return;
            }
            d -= lens[i];
          }
        };
        at(0);
        return CP.tween({ from: 0, to: 1, duration: dur, ease: 'inOut', onUpdate: (v) => at(v) }).finished.then(() => { tok.setAttribute('opacity', 0); });
      }

      function glowNum(r) { flash(r.fl); }

      async function animateStep(stp, tok) {
        const M = mach;
        const motion = !reduced();
        const alive = () => tok === runTok;
        const showHL = (s2) => setText(M.R2.v, O.hex((s2.H << 8) | s2.L, 4) + 'h');
        if (stp.op === 'lxi' || stp.op === 'inx') {
          showHL(stp.after);
          glowNum(M.R2);
          if (motion) await CP.wait(stp.op === 'lxi' ? 420 : 320);
          return alive();
        }
        if (stp.op === 'clc') {
          setText(M.R2.v, String(stp.after.C));
          glowNum(M.R2);
          if (motion) await CP.wait(320);
          return alive();
        }
        const io = stp.reads[0] || stp.writes[0];
        const cell = cellOf(io.addr);
        const target = cell ? [cell.ax, cell.cy] : [MX.memL + 32, 36];
        // 1. l'indirizzo esce sul bus degli indirizzi
        if (motion) {
          const src = cur === '6502' ? [MX.cpuR - 14, MX.addrY] : [M.R2.cx, M.R2.cy];
          M.addrBus.classList.add('is-active');
          await travel(M.tA, [src, [MX.cpuR, MX.addrY], [MX.memL, MX.addrY], target], addr(io.addr), 460);
          M.addrBus.classList.remove('is-active');
          if (!alive()) return false;
        }
        if (cell) flash(cell.fl);
        if (stp.reads.length) {
          const r = stp.reads[0];
          const toAlu = stp.op === 'add' || stp.op === 'adc';
          if (motion) {
            M.dataBus.classList.add('is-active');
            const from = cell ? [cell.cx, cell.cy] : [MX.memL + 32, 36];
            const path = toAlu ? [from, [MX.memL, MX.dataY], [MX.cpuR, MX.dataY], [MX.cpuR - 10, 181], [100, 181]] : [from, [MX.memL, MX.dataY], [MX.cpuR, MX.dataY], [M.A.cx, M.A.cy]];
            await travel(M.tD, path, String(r.val), 520);
            M.dataBus.classList.remove('is-active');
            if (!alive()) return false;
          }
          if (toAlu) {
            flash(M.aluFl);
            if (motion) await CP.wait(180);
          }
          setText(M.A.v, String(stp.after.A));
          glowNum(M.A);
          if (cur === '6502' && stp.op === 'adc') setText(M.R2.v, String(stp.after.C));
        } else {
          const w = stp.writes[0];
          if (motion) {
            M.dataBus.classList.add('is-active');
            await travel(M.tD, [[M.A.cx, M.A.cy], [MX.cpuR, MX.dataY], [MX.memL, MX.dataY], cell ? [cell.cx, cell.cy] : [MX.memL + 32, 36]], String(w.val), 520);
            M.dataBus.classList.remove('is-active');
            if (!alive()) return false;
          }
          if (cell) { setText(cell.v, String(w.val)); flash(cell.fl); }
        }
        if (motion) await CP.wait(160);
        return alive();
      }

      /* elenco del programma e istruzioni da sistemare */
      function render(flip) {
        const p = P[cur];
        const list = O.program(cur, 'zp');
        const before = flip ? measure() : null;
        clear(prog);
        clear(pool);
        for (let i = 0; i < list.length; i++) {
          const li = h('li', { class: 'otto-bit-line' });
          const idx = p.order[i];
          if (idx == null) {
            li.classList.add('is-empty');
            li.append(h('span', { class: 'n', 'aria-hidden': 'true' }, String(i + 1)), h('span', { class: 'ph' }, 'riga ' + (i + 1) + ' · vuota'));
          } else {
            const ins = list[idx];
            const known = p.shown.has(i);
            const b = h('button', { type: 'button', class: 'otto-bit-ins in-prog', dataset: { idx: String(idx) }, 'aria-label': 'Riga ' + (i + 1) + ': ' + ins.asm + ', ' + ins.note + '. Premi per toglierla dal programma.', onclick: () => takeOut(i) },
              h('span', { class: 'n', 'aria-hidden': 'true' }, String(i + 1)),
              h('span', { class: 'asm' }, ins.asm),
              h('span', { class: 'hex', title: 'codice macchina' }, known ? ins.bytes.map((x) => O.hex(x)).join(' ') : '· ·'),
              h('span', { class: 'cy', title: 'cicli di clock' }, known ? String(ins.cycles) : '·'),
              h('span', { class: 'note' }, ins.note));
            li.append(b);
          }
          prog.append(li);
        }
        p.pool.forEach((idx) => {
          const ins = list[idx];
          pool.append(h('button', { type: 'button', class: 'otto-bit-ins in-pool', dataset: { idx: String(idx) }, 'aria-label': ins.asm + ': ' + ins.note + '. Premi per aggiungerla in fondo al programma.', onclick: () => putIn(idx) },
            h('span', { class: 'asm' }, ins.asm), h('span', { class: 'note' }, ins.note)));
        });
        if (!p.pool.length) pool.append(h('p', { class: 'otto-bit-pool-empty' }, p.ok ? 'Programma risolto ✓' : 'Tutte le istruzioni sono nel programma: premi ▶︎ Esegui.'));
        const complete = p.order.length === list.length;
        runBtn.disabled = !complete || busy;
        stepBtn.disabled = !complete || (busy && stepIdx < 0);
        clearBtn.disabled = !p.order.length || busy;
        if (flip && before) play(before);
      }

      function measure() {
        const m = new Map();
        mount.querySelectorAll('.otto-bit-ins').forEach((b) => m.set(b.dataset.idx + (b.classList.contains('in-prog') ? 'p' : 'q'), b.getBoundingClientRect()));
        return m;
      }
      function play(before) {
        if (reduced()) return;
        // FLIP: l'istruzione scivola dalla vecchia alla nuova posizione (lette solo al clic)
        mount.querySelectorAll('.otto-bit-ins').forEach((b) => {
          const key = b.dataset.idx;
          const old = before.get(key + 'p') || before.get(key + 'q');
          if (!old) return;
          const now = b.getBoundingClientRect();
          const dx = old.left - now.left;
          const dy = old.top - now.top;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
          b.animate([{ transform: 'translate(' + dx + 'px, ' + dy + 'px)' }, { transform: 'none' }], { duration: CP.dur.normal, easing: EASE });
        });
      }

      function putIn(idx) {
        if (busy) return;
        const p = P[cur];
        p.ok = false;
        p.pool = p.pool.filter((x) => x !== idx);
        p.order.push(idx);
        p.shown.clear();
        stepIdx = -1;
        trace = null;
        render(true);
        const n = O.program(cur, 'zp').length;
        if (p.order.length === n) { ctx.say('Programma completo: premi Esegui.'); runBtn.focus(); }
        else {
          const nextBtn = pool.querySelector('button');
          if (nextBtn) nextBtn.focus();
        }
      }

      function takeOut(i) {
        if (busy) return;
        const p = P[cur];
        const idx = p.order[i];
        p.ok = false;
        p.order.splice(i, 1);
        p.pool.push(idx);
        p.shown.clear();
        stepIdx = -1;
        trace = null;
        render(true);
        machineReset();
        const again = prog.querySelectorAll('button')[i] || pool.querySelector('button');
        if (again) again.focus();
      }

      function emptyProgram() {
        if (busy) return;
        const p = P[cur];
        p.ok = false;
        p.order = [];
        p.pool = O.shuffled(cur, SEEDS[cur]);
        p.shown.clear();
        stepIdx = -1;
        trace = null;
        render(true);
        machineReset();
        intro();
        const first = pool.querySelector('button');
        if (first) first.focus();
      }

      function highlight(i) {
        prog.querySelectorAll('.otto-bit-line').forEach((li, j) => li.classList.toggle('is-current', j === i));
      }

      function reveal(i) {
        const p = P[cur];
        p.shown.add(i);
        const li = prog.querySelectorAll('.otto-bit-line')[i];
        if (!li) return;
        const ins = O.program(cur, 'zp')[p.order[i]];
        const hx = li.querySelector('.hex');
        const cy = li.querySelector('.cy');
        hx.textContent = ins.bytes.map((x) => O.hex(x)).join(' ');
        cy.textContent = String(ins.cycles);
        rise(hx, 0);
        rise(cy, 1);
      }

      function beginRun() {
        lockBets();
        machineReset();
        trace = O.run(cur, P[cur].order, 'zp');
        P[cur].shown.clear();
        render(false);
        stepIdx = 0;
      }

      async function doStep(tok, announce) {
        const stp = trace.steps[stepIdx];
        highlight(stepIdx);
        reveal(stepIdx);
        const told = O.narrate(cur, stp, 'zp');
        say('Passo ' + (stepIdx + 1) + ' di ' + trace.steps.length, stp.asm, [told], announce ? stp.asm + '. ' + told : null);
        const okAlive = await animateStep(stp, tok);
        if (!okAlive) return false;
        const sofar = trace.steps.slice(0, stepIdx + 1);
        roBytes.set(String(sofar.reduce((a, x) => a + x.bytes.length, 0)));
        roCycles.set(String(sofar.reduce((a, x) => a + x.cycles, 0)));
        stepIdx++;
        return true;
      }

      async function runAll() {
        const p = P[cur];
        if (p.order.length !== O.program(cur, 'zp').length) return;
        const tok = ++runTok;
        busy = true;
        beginRun();
        render(false);
        runBtn.disabled = true;
        stepBtn.disabled = true;
        clearBtn.disabled = true;
        while (stepIdx < trace.steps.length) {
          const ok = await doStep(tok);
          if (!ok || tok !== runTok) return;
          if (!reduced()) await CP.wait(200);
          if (tok !== runTok) return;
        }
        finish();
      }

      async function runStep() {
        const p = P[cur];
        if (p.order.length !== O.program(cur, 'zp').length) return;
        if (busy && stepIdx < 0) return;
        if (stepIdx < 0 || !trace || stepIdx >= trace.steps.length) {
          runTok++;
          beginRun();
        }
        const tok = runTok;
        busy = true;
        // il render conserva i codici già rivelati (p.shown) e aggiorna i pulsanti
        render(false);
        highlight(stepIdx);
        stepBtn.disabled = true;
        const ok = await doStep(tok, true);
        if (!ok || tok !== runTok) return;
        if (stepIdx >= trace.steps.length) { finish(); return; }
        // tra un passo e l'altro si può proseguire, ricominciare con Esegui o cambiare il programma
        busy = false;
        stepBtn.disabled = false;
        clearBtn.disabled = false;
        runBtn.disabled = false;
        stepBtn.focus();
      }

      function finish() {
        busy = false;
        highlight(-1);
        const p = P[cur];
        const res = trace;
        const dg = O.diagnose(cur, p.order, 'zp');
        const cellR = mach.cells[2];
        const tt = O.totals(cur, 'zp');
        stepIdx = -1;
        if (res.ok) {
          const first = !p.solved;
          p.solved = true;
          p.ok = true;
          cellR.box.classList.add('is-ok');
          cellR.mk.classList.add('ok');
          setText(cellR.mk, '✓');
          st.solved.add(cur);
          markTabs();
          cmp.paint(true);
          verdict();
          const rest = IDS.filter((id) => !P[id].solved).map((id) => O.CHIP[id].short);
          say('Risultato', 'Giusto: ' + addr(O.ADDR.zp + 2) + ' contiene ' + res.result, [
            O.CHIP[cur].name + ': ' + tt.bytes + ' byte e ' + tt.cycles + ' ' + O.CYCLE_WORD[cur] + ' di clock. A ' + O.dec(tt.mhz, 1) + ' MHz sono ' + O.dec(tt.us, 1) + ' microsecondi.',
            rest.length ? 'Ora prova con ' + rest.join(' e ') + ': scegli il suo nome sopra il programma.' : 'Hai risolto tutti e tre i programmi: guarda il riquadro «3 · Confronta».',
          ], first ? 'Programma corretto: ' + tt.bytes + ' byte e ' + tt.cycles + ' cicli di clock.' : null);
          progress();
        } else {
          cellR.box.classList.add('is-bad');
          cellR.mk.classList.add('bad');
          setText(cellR.mk, '✗');
          say('Risultato', 'Non torna: in ' + addr(O.ADDR.zp + 2) + ' c’è ' + res.result + ', non ' + res.expected, [
            dg.text,
            'Clicca la riga sbagliata per toglierla e rimettila al posto giusto, poi premi di nuovo ▶︎ Esegui.',
          ], 'Il risultato non torna. ' + dg.text);
        }
        for (let i = 0; i < trace.steps.length; i++) P[cur].shown.add(i);
        render(false);
      }

      function markTabs() {
        tabs.querySelectorAll('button').forEach((b, i) => {
          const id = IDS[i];
          b.textContent = O.CHIP[id].name + (P[id].solved ? ' ✓' : '');
          if (P[id].solved) b.setAttribute('aria-label', O.CHIP[id].name + ', risolto'); else b.removeAttribute('aria-label');
        });
      }

      function switchChip(id) {
        runTok++;
        busy = false;
        stepIdx = -1;
        trace = null;
        cur = id;
        machineReset();
        if (P[id].ok) for (let i = 0; i < P[id].order.length; i++) P[id].shown.add(i);
        render(false);
        if (P[id].ok) {
          const tt = O.totals(id, 'zp');
          say('Sfida · ' + O.CHIP[id].name, 'Già risolto', ['Questo programma funziona: ' + tt.bytes + ' byte, ' + tt.cycles + ' ' + O.CYCLE_WORD[id] + '. Premi ▶︎ Esegui per rivederlo, oppure togli una riga per sperimentare.']);
        } else {
          intro();
        }
      }

      /* confronto: byte, cicli e tempo */
      function buildCompare() {
        const svg = s('svg', { class: 'otto-bit-svg otto-bit-cmp-svg', role: 'img' });
        const MET = [
          { k: 'bytes', title: 'Byte di programma', max: 12, fmt: (v) => v + ' byte' },
          { k: 'cycles', title: 'Cicli di clock', max: 48, fmt: (v) => v + ' cicli' },
          { k: 'us', title: 'Tempo, al clock di lancio', max: 24, fmt: (v) => O.dec(v, 1) + ' µs' },
        ];
        let mode = '';
        let rows = [];
        function geom(m) {
          if (m === 'narrow') return { W: 340, H: 3 * 112 + 4, gw: 330, pos: (i) => [8, 6 + i * 112] };
          return { W: 640, H: 120, gw: 200, pos: (i) => [6 + i * 214, 6] };
        }
        function build(m) {
          mode = m;
          clear(svg);
          rows = [];
          const G = geom(m);
          svg.setAttribute('viewBox', '0 0 ' + G.W + ' ' + G.H);
          MET.forEach((me, mi) => {
            const [gx, gy] = G.pos(mi);
            const g = s('g', { transform: 'translate(' + gx + ' ' + gy + ')' });
            g.append(s('text', { class: 'otto-bit-cmp-title', x: 0, y: 12 }, me.title));
            IDS.forEach((id, i) => {
              const y = 32 + i * 26;
              const x0 = 40;
              const maxW = G.gw - x0 - 86;
              const lbl = s('text', { class: 'otto-bit-row-lbl', x: 0, y: y + 4 }, O.CHIP[id].short);
              const track = s('rect', { class: 'otto-bit-cmp-track', x: x0, y: y - 7, width: maxW, height: 14, rx: 3 });
              const bar = s('rect', { class: 'otto-bit-cmp-bar m-' + me.k, x: x0, y: y - 7, width: 0, height: 14, rx: 3 });
              // valori in colonna dopo la pista: si confrontano a colpo d'occhio
              const val = s('text', { class: 'otto-bit-cmp-val', x: x0 + maxW + 8, y: y + 4 }, '?');
              g.append(lbl, track, bar, val);
              rows.push({ id: id, k: me.k, me: me, bar: bar, val: val, x0: x0, maxW: maxW, w: 0 });
            });
            svg.append(g);
          });
        }
        function paint(animate) {
          if (!mode) build(st.narrow ? 'narrow' : 'wide');
          const all = IDS.every((id) => P[id].solved);
          const bests = { bytes: O.best('bytes', variant), cycles: O.best('cycles', variant), us: O.best('us', variant) };
          rows.forEach((r, i) => {
            const solved = P[r.id].solved;
            const tt = O.totals(r.id, variant);
            const v = tt[r.k];
            const w = solved ? Math.max(3, (v / r.me.max) * r.maxW) : 0;
            const from = r.w;
            r.w = w;
            if (animate && !reduced() && Math.abs(from - w) > 0.5) {
              CP.tween({ from: from, to: w, duration: CP.dur.slow, delay: (i % 3) * 60 + Math.floor(i / 3) * 80, ease: 'smooth', onUpdate: (x) => { r.bar.setAttribute('width', x.toFixed(2)); } });
            } else {
              r.bar.setAttribute('width', w.toFixed(2));
            }
            const best = all && bests[r.k].indexOf(r.id) >= 0;
            setText(r.val, solved ? r.me.fmt(v) + (best ? ' ★' : '') : '?');
            r.val.classList.toggle('is-unknown', !solved);
            r.val.classList.toggle('is-best', best);
            r.bar.classList.toggle('is-best', best);
          });
          const parts = IDS.filter((id) => P[id].solved).map((id) => { const tt = O.totals(id, variant); return O.CHIP[id].short + ': ' + tt.bytes + ' byte, ' + tt.cycles + ' cicli, ' + O.dec(tt.us, 1) + ' microsecondi'; });
          svg.setAttribute('aria-label', parts.length ? 'Confronto. ' + parts.join('; ') + '.' : 'Confronto: ancora nessun programma risolto.');
        }
        return { svg: svg, paint: paint, resize(m) { if (mode !== m) { build(m); paint(false); } } };
      }

      function verdict() {
        const all = IDS.every((id) => P[id].solved);
        varRow.hidden = !all;
        if (!all) {
          const n = IDS.filter((id) => P[id].solved).length;
          setText(verdictP, n ? 'Risolti ' + n + ' su 3: le barre compaiono man mano. Il verdetto quando li avrai risolti tutti.' : 'Risolvi un programma per vedere i suoi numeri.');
          return;
        }
        const bb = O.best('bytes', variant);
        const bc = O.best('cycles', variant);
        const names = (arr) => arr.map((id) => O.CHIP[id].short).join(' e ');
        const t6502 = O.totals('6502', variant);
        const lines = [];
        lines.push(h('b', null, 'Meno byte: ' + names(bb) + '. Meno cicli: ' + names(bc) + '. '));
        if (bet.bytes || bet.cycles) {
          const okB = bet.bytes && bb.indexOf(bet.bytes) >= 0;
          const okC = bet.cycles && bc.indexOf(bet.cycles) >= 0;
          if (variant === 'zp') lines.push('La tua scommessa: byte ' + (bet.bytes ? O.CHIP[bet.bytes].short + (okB ? ' ✓ giusta' : ' ✗ sbagliata') : 'nessuna') + ', cicli ' + (bet.cycles ? O.CHIP[bet.cycles].short + (okC ? ' ✓ giusta' : ' ✗ sbagliata') : 'nessuna') + '. ');
        }
        if (variant === 'zp') {
          lines.push('Il 6502 vince grazie alla pagina zero: ogni indirizzo occupa un byte solo e ogni ciclo fa un accesso alla memoria. Lo Z80 esegue gli stessi byte dell’8080, ma INC HL dura un T-state in più; con il clock più alto, però, finisce prima: 17,2 µs contro 20,5. Prova a spostare i numeri in 1200h.');
        } else {
          lines.push('Fuori dalla pagina zero il 6502 ha bisogno di indirizzi da due byte: ' + t6502.bytes + ' byte, più di 8080 e Z80, che puntano con HL. Però resta il più rapido: ' + t6502.cycles + ' cicli, ' + O.dec(t6502.us, 1) + ' µs.');
        }
        clear(verdictP);
        verdictP.append(...lines);
        rise(verdictP, 0);
      }

      return {
        el: el, ex: ex,
        enter() { markTabs(); cmp.paint(false); verdict(); switchChip(cur); },
        leave() { runTok++; busy = false; stepIdx = -1; trace = null; },
        resize(m) { cmp.resize(m); },
      };
    }

    /* ---------- viste: costruzione pigra, cambio con dissolvenza ---------- */

    const views = {};
    const makers = { galleria: makeGallery, registri: makeRegs, prezzi: makePrices, sfida: makeChallenge };
    function view(name) {
      if (!views[name]) views[name] = makers[name]();
      return views[name];
    }

    function showView(name, first) {
      const prev = st.view;
      if (!first && name === prev) return;
      if (!first && views[prev] && views[prev].leave) views[prev].leave();
      st.view = name;
      viewSeg.set(name);
      const v = view(name);
      rail.hidden = !(name === 'galleria' || name === 'registri');
      clear(host);
      host.append(v.el);
      clear(explain);
      explain.append(v.ex);
      v.enter();
      if (!first) {
        anim(v.el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: CP.dur.normal });
        anim(v.ex, [{ opacity: 0 }, { opacity: 1 }], { duration: CP.dur.normal, delay: 60, fill: 'backwards' });
      }
      mount.dataset.view = name;
    }

    /* ---------- larghezza: disposizione larga o stretta ---------- */

    function measureNarrow() {
      const w = stage.clientWidth || mount.clientWidth || 800;
      return w < 560;
    }
    function applyNarrow(n) {
      st.narrow = n;
      mount.classList.toggle('otto-bit-narrow', n);
      const m = n ? 'narrow' : 'wide';
      Object.keys(views).forEach((k) => { if (views[k].resize) views[k].resize(m); });
    }
    st.narrow = measureNarrow();
    mount.classList.toggle('otto-bit-narrow', st.narrow);
    if ('ResizeObserver' in root) {
      let queued = false;
      const ro = new ResizeObserver(() => {
        if (queued) return;
        queued = true;
        root.requestAnimationFrame(() => {
          queued = false;
          const n = measureNarrow();
          if (n !== st.narrow) applyNarrow(n);
        });
      });
      ro.observe(stage);
    }

    ctx.onVisible((v) => { if (v && st.view === 'galleria' && views.galleria) views.galleria.visible(); });

    paintRail();
    showView('galleria', true);
    progress();
  });
})(window);
