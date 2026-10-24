/*
 * Capitolo 8 · Verso i 16 bit e oltre. Laboratorio «Da 4 a 32 bit».
 *
 * Tre strumenti sullo stesso banco:
 *  1. grafico dei transistor (anni × scala logaritmica) dei chip della sezione: i punti compaiono in ordine
 *     di tempo, si filtrano per produttore e si esplorano con mouse, tocco e tastiera;
 *  2. «quanto è largo il bus»: lo stesso numero a 32 bit copiato o sommato da CPU a 4, 8, 16 e 32 bit,
 *     con le corsie del bus che si allargano e i bit che viaggiano sui fili;
 *  3. «segmento:offset»: il calcolatore dell'indirizzo fisico dell'8086 (scorrimento di 4 bit, somma in
 *     colonna, mappa di 1 MB) e una sfida da risolvere.
 * Logica pura in js/sedici-bit-core.js (window.SediciBitCore), provata da test/sedici-bit.test.js.
 *
 * Movimento: transform, opacity e poche coordinate SVG; con movimento ridotto niente spostamenti né partenze
 * automatiche: gli stati cambiano subito e il laboratorio resta completo.
 */
(function () {
  'use strict';
  if (!window.CP) return;

  CP.lab('sedici-bit', function (mount, ctx) {
    const { h, s, ui } = CP;
    const K = window.SediciBitCore;
    if (!K) throw new Error('Manca js/sedici-bit-core.js');

    const hex = K.hex;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const mq = window.matchMedia ? window.matchMedia('(max-width: 719px)') : null;
    let narrow = !!(mq && mq.matches);
    const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
    /** append che salta null e false, come CP.h (il metodo nativo li scriverebbe come testo). */
    const put = (el, ...kids) => el.append(...kids.filter((k) => k != null && k !== false));

    /* ---------- effetti annullabili ---------- */

    function fxSet() {
      const set = new Set();
      return {
        add(t) { set.add(t); t.finished.then(() => set.delete(t)); return t; },
        stop() { Array.from(set).forEach((t) => t.cancel()); set.clear(); },
      };
    }
    /** Tween registrato in un insieme annullabile: restituisce la Promise (true se completato). */
    function tw(set, o) { return set.add(CP.tween(o)).finished; }
    /** Pausa annullabile (subito con movimento ridotto). */
    function pause(set, ms) { return tw(set, { from: 0, to: 1, duration: Math.max(1, ms) }); }

    /** Bagliore breve su un elemento SVG (cerchio che si allarga e svanisce). */
    function ripple(layer, x, y, r0, cls) {
      if (ctx.reduced) return;
      const c = s('circle', { cx: x, cy: y, r: r0, class: 'sb-ripple ' + (cls || '') });
      layer.append(c);
      CP.tween({
        from: 0, to: 1, duration: CP.dur.slow, ease: 'smooth',
        onUpdate: (p) => { c.setAttribute('r', r0 + p * r0 * 1.6); c.style.opacity = String(0.85 * (1 - p)); },
        onDone: () => c.remove(),
      }).finished.then((ok) => { if (!ok) c.remove(); });
    }

    /** Comparsa a molla di un gruppo (scala) con un leggero ritardo. */
    function popIn(set, el, delay) {
      if (ctx.reduced) { el.removeAttribute('transform'); el.style.opacity = '1'; return Promise.resolve(true); }
      const cx = +el.dataset.cx || 0;
      const cy = +el.dataset.cy || 0;
      el.style.opacity = '0';
      return tw(set, {
        from: 0, to: 1, duration: 420, delay: delay || 0, ease: 'bounce',
        onUpdate: (k) => {
          el.style.opacity = String(Math.min(1, k * 1.6));
          el.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') scale(' + Math.max(0.01, k) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
        },
        onDone: () => { el.removeAttribute('transform'); el.style.opacity = '1'; },
      });
    }

    /* ---------- obiettivo ---------- */

    const GOAL_CHIPS = 4;
    const seen = new Set();
    let solved = false;
    let completed = false;
    const goalChips = h('span', { class: 'sb-goal-k' });
    const goalChal = h('span', { class: 'sb-goal-k' });
    const goal = h('p', { class: 'cp-goal sb-goal' },
      h('span', { class: 'sb-goal-t' }, h('b', null, 'Obiettivo: '), 'apri la scheda di almeno ' + GOAL_CHIPS + ' chip nel grafico e risolvi una sfida sull\'indirizzo fisico dell\'8086.'),
      h('span', { class: 'sb-goal-state' }, goalChips, goalChal));

    /** Aggiorna lo stato dell'obiettivo; restituisce la frase da annunciare se è appena stato raggiunto. */
    function updateGoal() {
      const ok1 = seen.size >= GOAL_CHIPS;
      goalChips.textContent = (ok1 ? '✓ ' : '') + 'Chip esplorati ' + Math.min(seen.size, GOAL_CHIPS) + '/' + GOAL_CHIPS;
      goalChips.classList.toggle('is-ok', ok1);
      goalChal.textContent = solved ? '✓ Sfida risolta' : 'Sfida da risolvere';
      goalChal.classList.toggle('is-ok', solved);
      if (!completed && ok1 && solved) {
        completed = true;
        ctx.done();
        return ' Obiettivo raggiunto: laboratorio completato.';
      }
      return '';
    }

    /* =====================================================================
     * 1 · Grafico dei transistor
     * ===================================================================== */

    function buildChart() {
      const LAYOUT = {
        w: { W: 720, H: 410, l: 64, r: 700, t: 44, b: 360, yearEvery: 1 },
        n: { W: 360, H: 440, l: 62, r: 346, t: 44, b: 380, yearEvery: 2 },
      };
      const Y0 = 1970.4;
      const Y1 = 1985.7;
      // posizione delle etichette dirette: [ancora, dx, dy] sul palco largo (w) e su quello stretto (n)
      const LBL = {
        '4004': { w: ['start', 11, 4], n: ['start', 10, 4] },
        '8008': { w: ['start', 11, 4], n: ['end', -10, 4] },
        '8080': { w: ['end', -11, 4], n: ['middle', 0, -13] },
        '6800': { w: ['middle', 0, 21], n: ['end', -10, -1] },
        '6502': { w: ['start', 11, 4], n: ['start', 10, 4] },
        'z80': { w: ['start', 11, 4], n: ['start', 10, 4] },
        '8086': { w: ['end', -11, 4], n: ['end', -10, 4] },
        '8088': { w: ['start', 11, 4], n: ['start', 10, 4] },
        'z8000': { w: ['start', 11, 4], n: ['start', 10, 4] },
        '68000': { w: ['start', 11, 4], n: ['start', 10, 4] },
        'risc1': { w: ['start', 11, 4], n: ['start', 10, 4] },
        'mips': { w: ['start', 11, 4], n: ['middle', 0, 21] },
        'arm1': { w: ['middle', 0, -13], n: ['middle', 0, -13] },
      };
      const fxC = fxSet();
      const pts = new Map();
      const shown = new Map(K.CHIPS.map((c) => [c.id, ctx.reduced ? 1 : 0]));
      const yearText = new Map();
      let L = null;
      let X = null;
      let Yv = null;
      let selected = null;
      let hovered = null;
      let makerSel = 'all';
      let introDone = false;
      let introRunning = false;

      const svg = s('svg', { class: 'sb-chart', role: 'group', 'aria-label': 'Grafico: transistor dei chip della sezione dal 1971 al 1985, su scala logaritmica. Ogni punto è un pulsante.' });
      const gGrid = s('g', { class: 'sb-gridl', 'aria-hidden': 'true' });
      const gAxes = s('g', { class: 'sb-axes', 'aria-hidden': 'true' });
      const gGuide = s('g', { class: 'sb-guide', 'aria-hidden': 'true' });
      const guideV = s('line', { class: 'sb-guide-l' });
      const guideH = s('line', { class: 'sb-guide-l' });
      gGuide.append(guideV, guideH);
      const gCursor = s('g', { class: 'sb-cursor', 'aria-hidden': 'true' });
      const cursorLine = s('line', { class: 'sb-cursor-l' });
      const yearBig = s('text', { class: 'sb-yearbig', 'text-anchor': 'end' });
      gCursor.append(cursorLine, yearBig);
      const gPts = s('g', { class: 'sb-pts' });
      const gFx = s('g', { class: 'sb-fx', 'aria-hidden': 'true' });
      const tip = s('g', { class: 'sb-tip', 'aria-hidden': 'true' });
      const tipBg = s('rect', { rx: 7, class: 'sb-tip-bg' });
      const tipV = s('text', { x: 11, y: 20, class: 'sb-tip-v' });
      const tipK = s('text', { x: 11, y: 37, class: 'sb-tip-k' });
      tip.append(tipBg, tipV, tipK);
      svg.append(gGrid, gAxes, gCursor, gGuide, gPts, gFx, tip);

      const filter = ui.seg({
        label: 'Filtra per produttore',
        options: [{ value: 'all', label: 'Tutti' }].concat(K.MAKERS.map((m) => ({ value: m.id, label: m.name, title: m.full || m.name }))),
        value: 'all',
        onChange: setFilter,
      });
      const replay = ui.button({ label: 'Riproduci', icon: '↺', title: 'Fai comparire di nuovo i chip in ordine di tempo', onClick: () => intro(true) });
      const bar = ui.bar(h('span', { class: 'sb-lbl', 'aria-hidden': 'true' }, 'Produttore'), filter, h('span', { class: 'grow' }), replay);

      const legend = h('div', { class: 'sb-legend' },
        h('span', { class: 'sb-legend-t' }, 'Registri'),
        K.WIDTHS.map((b) => h('span', { class: 'sb-legend-i' }, h('i', { class: 'sb-sw b' + b, 'aria-hidden': 'true' }), b + ' bit')),
        h('span', { class: 'sb-legend-n' }, 'più chiaro, più bit'));

      const explain = h('div', { class: 'cp-explain sb-explain' });

      const table = h('table', { class: 'sb-table' },
        h('caption', { class: 'cp-sr' }, 'Transistor dei chip della sezione, in ordine di tempo'),
        h('thead', null, h('tr', null,
          h('th', { scope: 'col' }, 'Chip'),
          h('th', { scope: 'col', class: 'sb-col-maker' }, 'Produttore'),
          h('th', { scope: 'col', class: 'num' }, 'Anno'),
          h('th', { scope: 'col', class: 'num' }, 'Registri'),
          h('th', { scope: 'col', class: 'num' }, 'Transistor, circa'))),
        h('tbody', null, K.CHIPS.map((c) => {
          const m = K.maker(c.maker);
          return h('tr', null,
            h('th', { scope: 'row' }, c.name),
            h('td', { class: 'sb-col-maker' }, m.full || m.name),
            h('td', { class: 'num' }, String(c.year)),
            h('td', { class: 'num' }, c.bits + ' bit'),
            h('td', { class: 'num' }, K.num(c.transistors)));
        })));
      const data = h('details', { class: 'sb-data' },
        h('summary', null, 'I dati in tabella'),
        h('div', { class: 'sb-table-wrap' }, table),
        h('p', { class: 'sb-data-note' }, 'Numeri come li riportano produttori, musei e analisi del silicio. Spesso contano anche le posizioni vuote delle memorie interne: dove le fonti divergono lo dice la scheda del chip. Perché crescano così in fretta lo spiega la ', h('a', { href: '../porte-logiche/index.html#moore' }, 'legge di Moore'), ', nella sezione 4.'));

      const el = h('div', { class: 'sb-view sb-view-chart' },
        bar,
        h('div', { class: 'cp-lab-grid sb-grid' },
          h('div', { class: 'cp-stage sb-stage' }, svg, legend),
          explain),
        data);

      function aria(c) {
        return c.name + ', ' + c.year + ', registri a ' + c.bits + ' bit, circa ' + K.num(c.transistors) + ' transistor';
      }

      function render() {
        L = narrow ? LAYOUT.n : LAYOUT.w;
        fxC.stop();
        introRunning = false;
        svg.setAttribute('viewBox', '0 0 ' + L.W + ' ' + L.H);
        svg.classList.toggle('is-narrow', narrow);
        X = K.linear(Y0, Y1, L.l, L.r);
        Yv = K.log10Scale(1000, 100000, L.b, L.t);
        [gGrid, gAxes, gPts, gFx].forEach((g) => { g.textContent = ''; });
        yearText.clear();

        const ticks = K.logTicks(1000, 100000);
        ticks.minor.forEach((v) => gGrid.append(s('line', { x1: L.l, x2: L.r, y1: Yv(v), y2: Yv(v), class: 'sb-gl-minor' })));
        ticks.major.forEach((v) => {
          gGrid.append(s('line', { x1: L.l, x2: L.r, y1: Yv(v), y2: Yv(v), class: 'sb-gl-major' }));
          gAxes.append(s('text', { x: L.l - 8, y: Yv(v) + 4, 'text-anchor': 'end', class: 'sb-tick' }, K.num(v)));
        });
        for (let yr = 1971; yr <= 1985; yr++) {
          const x = X(yr);
          gAxes.append(s('line', { x1: x, x2: x, y1: L.b, y2: L.b + 5, class: 'sb-tick-m' }));
          if ((yr - 1971) % L.yearEvery === 0) {
            const t = s('text', { x: x, y: L.b + 20, 'text-anchor': 'middle', class: 'sb-tick' }, String(yr));
            yearText.set(yr, t);
            gAxes.append(t);
          }
        }
        gAxes.append(s('line', { x1: L.l, x2: L.r, y1: L.b, y2: L.b, class: 'sb-axis' }));
        gAxes.append(s('text', { x: L.l - 8, y: L.t - 20, class: 'sb-axis-t' }, 'transistor, su scala logaritmica'));
        gAxes.append(s('text', { x: L.r, y: L.b + 40, 'text-anchor': 'end', class: 'sb-axis-t' }, 'anno di uscita'));

        cursorLine.setAttribute('y1', L.t - 6);
        cursorLine.setAttribute('y2', L.b);
        // l'anno grande sta in basso a destra, dove dopo il 1979 non ci sono chip
        yearBig.setAttribute('x', L.r - 6);
        yearBig.setAttribute('y', L.b - 14);
        gCursor.style.opacity = '0';
        guideV.setAttribute('y2', L.b);
        guideH.setAttribute('x1', L.l);
        gGuide.style.opacity = '0';

        pts.clear();
        K.CHIPS.forEach((c) => {
          const x = X(c.year);
          const y = Yv(c.transistors);
          const pl = LBL[c.id][narrow ? 'n' : 'w'];
          const dot = s('circle', { r: 6.5, class: 'sb-pt-dot b' + c.bits });
          const dotG = s('g', { class: 'sb-pt-dotg' }, dot);
          const lbl = s('text', { x: pl[1], y: pl[2], 'text-anchor': pl[0], class: 'sb-pt-lbl' }, c.short);
          const g = s('g', {
            class: 'sb-pt', transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')',
            tabindex: '0', role: 'button', 'aria-pressed': 'false', 'aria-label': aria(c), 'data-id': c.id,
          }, s('circle', { r: 17, class: 'sb-pt-hit' }), s('circle', { r: 11.5, class: 'sb-pt-ring' }), dotG, lbl);
          g.addEventListener('pointerenter', () => hover(c.id));
          g.addEventListener('pointerleave', () => unhover(c.id));
          g.addEventListener('focus', () => hover(c.id));
          g.addEventListener('blur', () => unhover(c.id));
          g.addEventListener('click', () => select(c.id));
          g.addEventListener('keydown', (e) => onKey(e, c.id));
          gPts.append(g);
          const p = { c: c, g: g, dotG: dotG, lbl: lbl, x: x, y: y };
          pts.set(c.id, p);
          setShown(p, shown.get(c.id));
        });
        applyFilter();
        applySelection();
        hideTip();
      }

      function setShown(p, k) {
        shown.set(p.c.id, k);
        p.dotG.setAttribute('transform', 'scale(' + Math.max(0.001, k).toFixed(3) + ')');
        p.dotG.style.opacity = String(Math.min(1, k * 1.5));
        p.lbl.style.opacity = String(clamp((k - 0.35) / 0.65, 0, 1));
      }

      function setCursor(yr) {
        const x = X(clamp(yr, Y0, Y1));
        cursorLine.setAttribute('x1', x);
        cursorLine.setAttribute('x2', x);
        yearBig.textContent = String(clamp(Math.round(yr), 1971, 1985));
      }

      /** I chip compaiono in ordine di tempo, mentre un cursore scorre gli anni. */
      function intro(force) {
        if (!force && introDone) return;
        introDone = true;
        fxC.stop();
        if (ctx.reduced) {
          pts.forEach((p) => setShown(p, 1));
          gCursor.style.opacity = '0';
          return;
        }
        introRunning = true;
        pts.forEach((p) => setShown(p, 0));
        gCursor.style.opacity = '1';
        setCursor(Y0);
        const popped = new Set();
        const perYear = {};
        tw(fxC, {
          from: Y0, to: Y1, duration: 2600, ease: 'linear',
          onUpdate: (yr) => {
            setCursor(yr);
            K.CHIPS.forEach((c) => {
              if (c.year > yr + 0.15 || popped.has(c.id)) return;
              popped.add(c.id);
              const k = (perYear[c.year] = (perYear[c.year] || 0) + 1) - 1;
              const p = pts.get(c.id);
              tw(fxC, { from: 0, to: 1, duration: 460, delay: k * 80, ease: 'bounce', onUpdate: (v) => setShown(p, v) });
            });
          },
        }).then((ok) => {
          introRunning = false;
          if (!ok) return;
          tw(fxC, { from: 1, to: 0, duration: CP.dur.normal, delay: 300, onUpdate: (v) => { gCursor.style.opacity = String(v); } });
        });
      }

      function maybeIntro() {
        if (introDone || el.hidden || !ctx.visible) return;
        intro(false);
      }

      function showTip(id) {
        const p = pts.get(id);
        if (!p) return;
        const c = p.c;
        tipV.textContent = 'circa ' + K.num(c.transistors) + ' transistor';
        tipK.textContent = c.name + ' · ' + c.year + ' · ' + c.bits + ' bit';
        const w = Math.round(Math.max(tipV.textContent.length * 7.3, tipK.textContent.length * 6.8) + 22);
        const ht = 48;
        let tx = p.x + 16;
        let ty = p.y - ht - 12;
        if (tx + w > L.W - 4) tx = p.x - 16 - w;
        if (tx < 4) tx = 4;
        if (ty < 4) ty = p.y + 16;
        tipBg.setAttribute('width', w);
        tipBg.setAttribute('height', ht);
        tip.setAttribute('transform', 'translate(' + tx.toFixed(1) + ' ' + ty.toFixed(1) + ')');
        tip.classList.add('is-on');
        guideV.setAttribute('x1', p.x);
        guideV.setAttribute('x2', p.x);
        guideV.setAttribute('y1', p.y + 9);
        guideH.setAttribute('y1', p.y);
        guideH.setAttribute('y2', p.y);
        guideH.setAttribute('x2', p.x - 9);
        gGuide.style.opacity = '1';
        yearText.forEach((t, yr) => t.classList.toggle('is-hot', yr === c.year));
      }

      function hideTip() {
        tip.classList.remove('is-on');
        gGuide.style.opacity = '0';
        yearText.forEach((t) => t.classList.remove('is-hot'));
      }

      function hover(id) {
        hovered = id;
        pts.forEach((p, k) => p.g.classList.toggle('is-hover', k === id));
        showTip(id);
      }

      function unhover(id) {
        if (hovered !== id) return;
        hovered = null;
        const p = pts.get(id);
        if (p) p.g.classList.remove('is-hover');
        if (selected) showTip(selected); else hideTip();
      }

      function onKey(e, id) {
        const order = K.CHIPS.map((c) => c.id);
        const i = order.indexOf(id);
        let j = null;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); select(id); return; }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = Math.min(order.length - 1, i + 1);
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = Math.max(0, i - 1);
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = order.length - 1;
        else if (e.key === 'Escape') { hideTip(); return; }
        if (j == null) return;
        e.preventDefault();
        const p = pts.get(order[j]);
        if (p) p.g.focus();
      }

      function applySelection() {
        pts.forEach((p, k) => {
          p.g.classList.toggle('is-sel', k === selected);
          p.g.setAttribute('aria-pressed', String(k === selected));
        });
      }

      function select(id) {
        const p = pts.get(id);
        if (!p) return;
        if (introRunning) { fxC.stop(); introRunning = false; pts.forEach((q) => setShown(q, 1)); gCursor.style.opacity = '0'; }
        selected = id;
        applySelection();
        showTip(id);
        ripple(gFx, p.x, p.y, 8, 'b' + p.c.bits);
        const isNew = !seen.has(id);
        seen.add(id);
        card(p.c, isNew);
        const fin = updateGoal();
        ctx.say(p.c.name + ', ' + p.c.year + ': circa ' + K.num(p.c.transistors) + ' transistor, registri a ' + p.c.bits + ' bit.' +
          (isNew && seen.size <= GOAL_CHIPS ? ' Chip esplorati: ' + seen.size + ' di ' + GOAL_CHIPS + '.' : '') + fin);
      }

      function setFilter(m) {
        makerSel = m;
        applyFilter();
        const list = K.chipsBy(m);
        if (m !== 'all' && !ctx.reduced) {
          list.forEach((c, i) => {
            const p = pts.get(c.id);
            if (!p || shown.get(c.id) < 1) return;
            tw(fxC, { from: 0, to: 1, duration: CP.dur.normal, delay: i * 70, ease: 'smooth', onUpdate: (v) => {
              const k = 1 + 0.35 * Math.sin(v * Math.PI);
              p.dotG.setAttribute('transform', 'scale(' + k.toFixed(3) + ')');
            } });
          });
        }
        const name = m === 'all' ? 'Tutti i produttori' : (K.maker(m).full || K.maker(m).name);
        ctx.say(name + ': ' + plural(list.length, 'chip', 'chip') + ', ' + list.map((c) => c.short).join(', ') + '.');
        if (!selected) intro0();
      }

      function applyFilter() {
        pts.forEach((p) => {
          const dim = makerSel !== 'all' && p.c.maker !== makerSel;
          p.g.classList.toggle('is-dim', dim);
        });
      }

      function intro0() {
        explain.textContent = '';
        const m = makerSel === 'all' ? null : K.maker(makerSel);
        put(explain,
          h('span', { class: 'step' }, m ? (m.full || m.name) + ' · ' + plural(K.chipsBy(makerSel).length, 'chip', 'chip') : K.CHIPS.length + ' chip · 1971–1985'),
          h('h4', null, 'Quanti transistor?'),
          h('p', null, 'Ogni punto è un chip: in orizzontale l\'anno, in verticale i transistor. La scala è logaritmica: tra 1.000 e 10.000 c\'è lo stesso spazio che tra 10.000 e 100.000, perché ogni gradino vale dieci volte il precedente.'),
          h('p', null, 'Il colore dice quanti bit tengono i registri: più chiaro, più bit. Clicca o tocca un punto per aprirne la scheda; con la tastiera usa Tab o le frecce e poi Invio.'),
          h('p', { class: 'sb-muted' }, 'La crescita regolare ha un nome, legge di Moore: la racconta la ', h('a', { href: '../porte-logiche/index.html#moore' }, 'sezione 4'), '.'),
          progressLine());
      }

      function progressLine() {
        const n = Math.min(seen.size, GOAL_CHIPS);
        return h('p', { class: 'sb-prog' + (seen.size >= GOAL_CHIPS ? ' is-ok' : '') },
          seen.size >= GOAL_CHIPS ? '✓ Hai esplorato ' + seen.size + ' chip: parte del grafico completata.' : 'Chip esplorati: ' + n + ' di ' + GOAL_CHIPS + '.');
      }

      function card(c, isNew) {
        const m = K.maker(c.maker);
        const r = K.ratio('4004', c.id);
        explain.textContent = '';
        const rows = [
          ['Transistor', 'circa ' + K.num(c.transistors)],
          ['Registri', c.bits + ' bit'],
        ];
        if (c.bus) rows.push(['Bus dati', c.bus + ' bit']);
        rows.push(['Anno', String(c.year)]);
        put(explain,
          h('span', { class: 'step' }, (m.full || m.name) + ' · ' + c.year),
          h('h4', null, c.name),
          h('dl', { class: 'sb-card' }, rows.map(([k, v]) => h('div', null, h('dt', null, k), h('dd', null, v)))),
          h('p', null, c.note),
          c.id !== '4004' ? h('p', { class: 'sb-muted' }, 'Rispetto al 4004: ' + K.num(r, r >= 10 ? 0 : 1) + ' volte i transistor.') : null,
          c.chapter !== 'sedici-bit' ? h('p', null, h('a', { href: '#' + c.chapter }, 'Torna al suo capitolo')) : null,
          progressLine());
        if (isNew && !ctx.reduced && explain.animate) {
          explain.animate([{ opacity: 0.35, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: CP.dur.normal, easing: 'cubic-bezier(.22,1,.36,1)' });
        }
      }

      render();
      intro0();

      return {
        el: el,
        relayout() { const wasRunning = introRunning; render(); if (wasRunning) pts.forEach((p) => setShown(p, 1)); },
        onShow() { maybeIntro(); },
        maybeIntro: maybeIntro,
      };
    }

    /* =====================================================================
     * 2 · Quanto è largo il bus
     * ===================================================================== */

    function buildBus() {
      const GEO = {
        w: {
          W: 720, H: 330, dir: 'h',
          mem: [12, 24, 276, 290], cpu: [432, 24, 276, 290],
          tile: [26, 36, 2], rows: { a: [50, 82], b: [50, 156], r: [470, 236] },
          bus: { from: 288, to: 432, c: 140, sp: 3.1, len: 26 },
          alu: [492, 84, 162, 112], carry: [682, 140], memT: [28, 50], cpuT: [448, 50],
          memNote: [150, 296], regNote: [581, 296], busLbl: [360, 222],
        },
        n: {
          W: 360, H: 640, dir: 'v',
          mem: [8, 20, 344, 194], cpu: [8, 344, 344, 284],
          tile: [34, 36, 3], rows: { a: [50, 68], b: [50, 136], r: [50, 552] },
          bus: { from: 214, to: 344, c: 180, sp: 3.3, len: 26 },
          alu: [70, 420, 190, 106], carry: [300, 474], memT: [22, 44], cpuT: [22, 368],
          memNote: [180, 202], regNote: [180, 610], busLbl: [14, 274],
        },
      };
      const EX = { 4: 'come il 4004', 8: 'come l\'8080 e lo Z80', 16: 'come l\'8086', 32: 'come l\'ARM1' };
      const st = { width: 16, op: 'copy', a: 0x1234ABCD, b: 0x0FEDCBA9, done: 0, running: false, run: 0, steps: [] };
      const tried = { copy: new Set(), sum: new Set() };
      const fxB = fxSet();
      const fxL = fxSet();
      // corsie in unità di passo (offset) e opacità: la geometria vera dipende dal palco
      const lanes = Array.from({ length: 32 }, (_, j) => ({ off: j < 16 ? j - 7.5 : 0, op: j < 16 ? 1 : 0, el: null }));

      const svg = s('svg', { class: 'sb-bus', role: 'img', 'aria-label': 'Memoria e CPU collegate dal bus dati: il numero a 32 bit viaggia sui fili a pezzi, tanti quanti sono i fili.' });
      let G = null;
      let rowEls = {};
      let gB = null;
      let brackets = null;
      let pulses = null;
      let fxLayer = null;
      let alu = {};
      let carry = {};
      let cpuSub = null;
      let busLbl = null;
      let busLbl2 = null;

      const widthSeg = ui.seg({
        label: 'Larghezza del bus dati',
        options: K.WIDTHS.map((w) => ({ value: w, label: w + ' bit', title: 'CPU a ' + w + ' bit, ' + EX[w] })),
        value: st.width,
        onChange: setWidth,
      });
      const opSeg = ui.seg({
        label: 'Operazione',
        options: [{ value: 'copy', label: 'Copia', title: 'Porta il numero A dalla memoria al registro' }, { value: 'sum', label: 'Somma', title: 'Calcola A + B a pezzi, con il riporto' }],
        value: st.op,
        onChange: setOp,
      });
      const runBtn = ui.button({ label: 'Esegui', icon: '▶︎', primary: true, onClick: () => run(true) });
      const stepBtn = ui.button({ label: 'Un passaggio', icon: '⏭', onClick: () => run(false) });
      const resetBtn = ui.button({ label: 'Da capo', icon: '↺', onClick: () => { stop(); reset(); paint(); explainBus(); } });
      const newBtn = ui.button({ label: 'Altri numeri', icon: '⟳', onClick: newNumbers });
      const counter = ui.readout('Passaggi', '0 / 2');
      const bar = ui.bar(
        h('div', { class: 'cp-bar-group' }, h('span', { class: 'sb-lbl', 'aria-hidden': 'true' }, 'Bus'), widthSeg),
        h('div', { class: 'cp-bar-group' }, opSeg),
        h('div', { class: 'cp-bar-group' }, runBtn, stepBtn, resetBtn, newBtn),
        h('span', { class: 'grow' }), counter);

      const explain = h('div', { class: 'cp-explain sb-explain' });
      const el = h('div', { class: 'sb-view sb-view-bus' }, bar,
        h('div', { class: 'cp-lab-grid sb-grid' }, h('div', { class: 'cp-stage sb-stage' }, svg), explain));

      const total = () => K.passes(32, st.width);
      const digitsPer = () => st.width / 4;

      function calc() {
        return st.op === 'copy' ? K.copySteps(st.a, st.width) : K.addSteps(st.a, st.b, st.width);
      }

      /* ----- disegno ----- */

      function tileRow(key, label) {
        const [x0, y] = G.rows[key];
        const [tw0, th, gap] = G.tile;
        const g = s('g', { class: 'sb-row sb-row-' + key });
        g.append(s('text', { x: x0 - 18, y: y + th / 2 + 5, 'text-anchor': 'middle', class: 'sb-row-l' }, label));
        const tiles = [];
        for (let k = 0; k < 8; k++) {
          const x = x0 + k * (tw0 + gap);
          const r = s('rect', { x: x, y: y, width: tw0, height: th, rx: 5 });
          const t = s('text', { x: x + tw0 / 2, y: y + th / 2 + 5.5, 'text-anchor': 'middle' });
          const tg = s('g', { class: 'sb-tile', 'data-cx': x + tw0 / 2, 'data-cy': y + th / 2 }, r, t);
          g.append(tg);
          tiles.push({ g: tg, r: r, t: t, x: x, y: y });
        }
        return { g: g, tiles: tiles };
      }

      function laneXY(off) { return G.bus.c + off * G.bus.sp; }

      function applyLane(j) {
        const ln = lanes[j];
        if (!ln.el) return;
        const p = laneXY(ln.off).toFixed(2);
        ln.el.setAttribute('transform', G.dir === 'h' ? 'translate(0 ' + p + ')' : 'translate(' + p + ' 0)');
        ln.el.style.opacity = String(ln.op);
      }

      function render() {
        G = narrow ? GEO.n : GEO.w;
        fxB.stop();
        fxL.stop();
        st.running = false;
        svg.setAttribute('viewBox', '0 0 ' + G.W + ' ' + G.H);
        svg.classList.toggle('is-narrow', narrow);
        svg.textContent = '';
        const [mx, my, mw, mh] = G.mem;
        const [cx, cy, cw, ch] = G.cpu;
        svg.append(s('rect', { x: mx, y: my, width: mw, height: mh, rx: 12, class: 'sb-box' }));
        svg.append(s('rect', { x: cx, y: cy, width: cw, height: ch, rx: 12, class: 'sb-box sb-box-cpu' }));
        svg.append(s('text', { x: G.memT[0], y: G.memT[1], class: 'sb-box-t' }, 'MEMORIA'));
        svg.append(s('text', { x: G.cpuT[0], y: G.cpuT[1], class: 'sb-box-t' }, 'CPU'));
        cpuSub = s('text', { x: G.cpuT[0] + 40, y: G.cpuT[1], class: 'sb-box-s' });
        svg.append(cpuSub);
        svg.append(s('text', { x: G.memNote[0], y: G.memNote[1], 'text-anchor': 'middle', class: 'sb-note-t' }, '32 bit = 8 cifre esadecimali da 4 bit'));
        svg.append(s('text', { x: G.regNote[0], y: G.regNote[1], 'text-anchor': 'middle', class: 'sb-note-t' }, 'registro R'));

        // bus: connettori e corsie
        const busG = s('g', { class: 'sb-lanes' });
        const half = 16 * G.bus.sp + 4;
        if (G.dir === 'h') {
          busG.append(s('rect', { x: G.bus.from - 3, y: G.bus.c - half, width: 6, height: half * 2, rx: 2, class: 'sb-port' }));
          busG.append(s('rect', { x: G.bus.to - 3, y: G.bus.c - half, width: 6, height: half * 2, rx: 2, class: 'sb-port' }));
        } else {
          busG.append(s('rect', { x: G.bus.c - half, y: G.bus.from - 3, width: half * 2, height: 6, rx: 2, class: 'sb-port' }));
          busG.append(s('rect', { x: G.bus.c - half, y: G.bus.to - 3, width: half * 2, height: 6, rx: 2, class: 'sb-port' }));
        }
        lanes.forEach((ln, j) => {
          ln.el = G.dir === 'h'
            ? s('line', { x1: G.bus.from + 3, x2: G.bus.to - 3, y1: 0, y2: 0, class: 'sb-lane' })
            : s('line', { y1: G.bus.from + 3, y2: G.bus.to - 3, x1: 0, x2: 0, class: 'sb-lane' });
          busG.append(ln.el);
          applyLane(j);
        });
        svg.append(busG);
        busLbl = s('text', { x: G.busLbl[0], y: G.busLbl[1], 'text-anchor': G.dir === 'h' ? 'middle' : 'start', class: 'sb-bus-l' });
        busLbl2 = s('text', { x: G.busLbl[0], y: G.busLbl[1] + 17, class: 'sb-bus-l' });
        svg.append(busLbl, busLbl2);

        rowEls = { a: tileRow('a', 'A'), b: tileRow('b', 'B'), r: tileRow('r', 'R') };
        gB = rowEls.b.g;
        brackets = s('g', { class: 'sb-brs', 'aria-hidden': 'true' });
        svg.append(rowEls.a.g, gB, rowEls.r.g, brackets);

        // ALU e riporto
        const [ax, ay, aw, ah] = G.alu;
        const aluG = s('g', { class: 'sb-alu' });
        aluG.append(s('rect', { x: ax, y: ay, width: aw, height: ah, rx: 10, class: 'sb-alu-box' }));
        alu.title = s('text', { x: ax + 12, y: ay + 20, class: 'sb-alu-t' }, 'ALU');
        alu.la = s('text', { x: ax + 12, y: ay + 46, class: 'sb-alu-k' }, 'A');
        alu.lb = s('text', { x: ax + 12, y: ay + 68, class: 'sb-alu-k' }, '+ B');
        alu.va = s('text', { x: ax + aw - 12, y: ay + 46, 'text-anchor': 'end', class: 'sb-alu-v' });
        alu.vb = s('text', { x: ax + aw - 12, y: ay + 68, 'text-anchor': 'end', class: 'sb-alu-v' });
        alu.line = s('line', { x1: ax + 10, x2: ax + aw - 10, y1: ay + 77, y2: ay + 77, class: 'sb-alu-line' });
        alu.lr = s('text', { x: ax + 12, y: ay + 97, class: 'sb-alu-k' }, '=');
        alu.vr = s('text', { x: ax + aw - 12, y: ay + 97, 'text-anchor': 'end', class: 'sb-alu-v sb-alu-res' });
        alu.g = aluG;
        aluG.append(alu.title, alu.la, alu.lb, alu.va, alu.vb, alu.line, alu.lr, alu.vr);
        svg.append(aluG);
        const [kx, ky] = G.carry;
        carry.g = s('g', { class: 'sb-carry' });
        carry.c = s('circle', { cx: kx, cy: ky, r: 15 });
        carry.t = s('text', { x: kx, y: ky + 5.5, 'text-anchor': 'middle' }, '0');
        carry.l = s('text', { x: kx, y: ky + 33, 'text-anchor': 'middle', class: 'sb-carry-l' }, 'riporto');
        carry.g.append(carry.c, carry.t, carry.l);
        svg.append(carry.g);

        pulses = s('g', { class: 'sb-pulses', 'aria-hidden': 'true' });
        fxLayer = s('g', { class: 'sb-fx', 'aria-hidden': 'true' });
        svg.append(pulses, fxLayer);
        paint();
      }

      /** Indici (da sinistra, 0 = cifra più significativa) delle tessere del pezzo i. */
      function tilesOf(i) {
        const d = digitsPer();
        const out = [];
        for (let pos = i * d; pos < (i + 1) * d; pos++) out.push(7 - pos);
        return out;
      }

      function paint() {
        const n = total();
        const d = digitsPer();
        const res = calc();
        const ha = hex(st.a, 8);
        const hb = hex(st.b, 8);
        rowEls.a.tiles.forEach((t, k) => { t.t.textContent = ha[k]; });
        rowEls.b.tiles.forEach((t, k) => { t.t.textContent = hb[k]; });
        gB.style.display = st.op === 'sum' ? '' : 'none';
        // registro: le cifre già arrivate
        const reg = st.done > 0 ? res.steps[st.done - 1].register : 0;
        const hr = hex(reg, 8);
        const filled = st.done * d;
        rowEls.r.tiles.forEach((t, k) => {
          const pos = 7 - k;
          const on = pos < filled;
          t.t.textContent = on ? hr[k] : '·';
          t.g.classList.toggle('is-empty', !on);
          t.g.classList.toggle('is-res', on);
        });
        [rowEls.a, rowEls.b].forEach((row) => row.tiles.forEach((t) => t.g.classList.remove('is-hot')));
        // parentesi dei pezzi sotto A e B
        brackets.textContent = '';
        const rows = st.op === 'sum' ? ['a', 'b'] : ['a'];
        rows.forEach((key) => {
          const [, y] = G.rows[key];
          const [tw0, th] = G.tile;
          for (let i = 0; i < n; i++) {
            const ks = tilesOf(i);
            const x1 = rowEls[key].tiles[Math.min.apply(null, ks)].x + 1;
            const x2 = rowEls[key].tiles[Math.max.apply(null, ks)].x + tw0 - 1;
            const yy = y + th + 5;
            brackets.append(s('path', { d: 'M' + x1 + ' ' + (yy - 3) + ' V' + yy + ' H' + x2 + ' V' + (yy - 3), class: 'sb-br' + (i < st.done ? ' is-done' : '') }));
          }
        });
        // ALU e riporto
        const last = st.done > 0 ? res.steps[st.done - 1] : null;
        const isSum = st.op === 'sum';
        alu.g.classList.toggle('is-off', !isSum);
        alu.title.textContent = isSum ? 'ALU · ' + st.width + ' bit' : 'ALU · non serve';
        alu.va.textContent = isSum && last ? hex(last.a, d) : '';
        alu.vb.textContent = isSum && last ? hex(last.b, d) : '';
        alu.vr.textContent = isSum && last ? hex(last.raw, d) : '';
        alu.lb.textContent = isSum && last && last.carryIn ? '+ B + 1' : '+ B';
        const cv = isSum && last ? last.carryOut : 0;
        carry.t.textContent = String(cv);
        carry.g.classList.toggle('is-1', cv === 1);
        carry.g.classList.toggle('is-off', !isSum);
        cpuSub.textContent = 'a ' + st.width + ' bit, ' + EX[st.width];
        busLbl.textContent = G.dir === 'h' ? 'bus dati · ' + st.width + ' fili' : 'bus dati';
        busLbl2.textContent = G.dir === 'h' ? '' : st.width + ' fili';
        counter.set(st.done + ' / ' + n);
        runBtn.disabled = st.running;
        stepBtn.disabled = st.running;
      }

      /* ----- movimento ----- */

      function setWidth(w) {
        stop();
        st.width = w;
        reset();
        lanes.forEach((ln, j) => {
          const off = j < w ? j - (w - 1) / 2 : 0;
          const op = j < w ? 1 : 0;
          if (ctx.reduced) { ln.off = off; ln.op = op; applyLane(j); return; }
          const f = [ln.off, ln.op];
          tw(fxL, {
            from: f, to: [off, op], duration: CP.dur.normal, delay: Math.floor(j / 4) * 60, ease: 'smooth',
            onUpdate: (v) => { ln.off = v[0]; ln.op = clamp(v[1], 0, 1); applyLane(j); },
          });
        });
        paint();
        explainBus();
        ctx.say('Bus dati a ' + w + ' fili: per 32 bit servono ' + plural(total(), 'passaggio', 'passaggi') + '.');
      }

      function setOp(op) {
        stop();
        st.op = op;
        reset();
        paint();
        explainBus();
        ctx.say(op === 'sum' ? 'Somma: A più B, a pezzi, con il riporto.' : 'Copia: il numero A va dalla memoria al registro.');
      }

      function newNumbers() {
        stop();
        st.a = Math.floor(Math.random() * 4294967296);
        st.b = Math.floor(Math.random() * 4294967296);
        reset();
        paint();
        explainBus();
        ctx.say('Nuovi numeri: A ' + hex(st.a, 8) + (st.op === 'sum' ? ', B ' + hex(st.b, 8) : '') + '.');
      }

      function reset() {
        st.done = 0;
        st.steps = [];
        if (pulses) pulses.textContent = '';
      }

      function stop() {
        st.run++;
        fxB.stop();
        st.running = false;
        if (pulses) pulses.textContent = '';
      }

      /** Un impulso di bit che viaggia sulle corsie del bus dalla memoria alla CPU. */
      function pulse(value) {
        const N = st.width;
        const len = G.bus.len;
        const g = s('g', { class: 'sb-pulse' });
        for (let j = 0; j < N; j++) {
          const bit = Math.floor(value / Math.pow(2, j)) % 2;
          const q = laneXY(j - (N - 1) / 2);
          g.append(G.dir === 'h'
            ? s('rect', { x: 0, y: q - 1.25, width: len, height: 2.5, rx: 1.2, class: 'sb-dash b' + bit })
            : s('rect', { x: q - 1.25, y: 0, width: 2.5, height: len, rx: 1.2, class: 'sb-dash b' + bit }));
        }
        const txt = hex(value, N / 4);
        const pw = txt.length * 8.6 + 14;
        const half = (N / 2) * G.bus.sp;
        const pill = G.dir === 'h'
          ? s('g', { class: 'sb-pill', transform: 'translate(' + (len / 2 - pw / 2) + ' ' + (G.bus.c - half - 26) + ')' })
          : s('g', { class: 'sb-pill', transform: 'translate(' + (G.bus.c + half + 8) + ' ' + (len / 2 - 11) + ')' });
        pill.append(s('rect', { width: pw, height: 22, rx: 6 }), s('text', { x: pw / 2, y: 15.5, 'text-anchor': 'middle' }, txt));
        g.append(pill);
        pulses.append(g);
        const from = G.bus.from + 2;
        const to = G.bus.to - len - 2;
        const place = (p) => g.setAttribute('transform', G.dir === 'h' ? 'translate(' + p.toFixed(1) + ' 0)' : 'translate(0 ' + p.toFixed(1) + ')');
        place(from);
        const speed = st.width === 4 ? 0.7 : 1;
        return tw(fxB, { from: from, to: to, duration: 560 * speed, ease: 'inOut', onUpdate: place }).then((ok) => { g.remove(); return ok; });
      }

      function hot(row, i, on) {
        tilesOf(i).forEach((k) => rowEls[row].tiles[k].g.classList.toggle('is-hot', on));
      }

      async function onePass(my) {
        const i = st.done;
        const res = calc();
        const step = res.steps[i];
        const d = digitsPer();
        const speed = st.width === 4 ? 0.7 : 1;
        hot('a', i, true);
        if (st.op === 'copy') {
          if (!(await pulse(step.value)) || my !== st.run) return false;
        } else {
          // l'ALU si svuota: i nuovi pezzi arrivano dal bus (il riporto del passaggio prima resta acceso)
          alu.va.textContent = '';
          alu.vb.textContent = '';
          alu.vr.textContent = '';
          alu.lb.textContent = step.carryIn ? '+ B + 1' : '+ B';
          const pa = pulse(step.a);
          await pause(fxB, 200 * speed);
          if (my !== st.run) return false;
          hot('b', i, true);
          const pb = pulse(step.b);
          if (!(await pa) || my !== st.run) return false;
          alu.va.textContent = hex(step.a, d);
          alu.g.classList.add('is-busy');
          if (!(await pb) || my !== st.run) return false;
          alu.vb.textContent = hex(step.b, d);
          await pause(fxB, 160 * speed);
          if (my !== st.run) return false;
          alu.vr.textContent = hex(step.raw, d);
          carry.t.textContent = String(step.carryOut);
          carry.g.classList.toggle('is-1', step.carryOut === 1);
          if (step.carryOut) ripple(fxLayer, G.carry[0], G.carry[1], 15, 'is-carry');
          await pause(fxB, 260 * speed);
          if (my !== st.run) return false;
        }
        st.done = i + 1;
        st.steps.push(step);
        paint();
        alu.g.classList.remove('is-busy');
        hot('a', i, false);
        hot('b', i, false);
        // le cifre arrivate nel registro si accendono una dopo l'altra
        tilesOf(i).reverse().forEach((k, n) => {
          const t = rowEls.r.tiles[k];
          popIn(fxB, t.g, n * 60);
        });
        explainBus();
        await pause(fxB, 220 * speed);
        return my === st.run;
      }

      async function run(all) {
        if (st.running) return;
        if (st.done >= total()) { reset(); paint(); }
        const my = ++st.run;
        st.running = true;
        paint();
        let ok = true;
        do {
          ok = await onePass(my);
        } while (ok && all && st.done < total());
        if (my !== st.run) return;
        st.running = false;
        paint();
        if (st.done >= total()) finish();
        else ctx.say('Passaggio ' + st.done + ' di ' + total() + '.');
      }

      function finish() {
        const n = total();
        tried[st.op].add(st.width);
        explainBus();
        const res = calc();
        ctx.say('Fatto in ' + plural(n, 'passaggio', 'passaggi') + '. ' + (st.op === 'sum' ? 'A più B fa ' : 'Il registro contiene ') + hex(res.result, 8) + '.');
        if (!ctx.reduced) {
          rowEls.r.tiles.forEach((t, k) => {
            CP.tween({ from: 0, to: 1, duration: CP.dur.slow, delay: k * 50, onUpdate: (p) => { t.r.style.strokeOpacity = String(1 - 0.6 * Math.sin(p * Math.PI)); } });
          });
        }
      }

      /* ----- spiegazione ----- */

      function explainBus() {
        const N = st.width;
        const n = total();
        const d = digitsPer();
        explain.textContent = '';
        const status = st.running
          ? 'Passaggio ' + Math.min(st.done + 1, n) + ' di ' + n + ' in corso…'
          : st.done === 0
            ? 'Premi ▶︎ Esegui, oppure ⏭ per un passaggio alla volta.'
            : st.done < n ? 'Fatti ' + st.done + ' di ' + n + ': continua con ⏭ o ▶︎.' : '✓ Fatto in ' + plural(n, 'passaggio', 'passaggi') + '.';
        const intro = st.op === 'copy'
          ? 'Un numero a 32 bit sono 8 cifre esadecimali da 4 bit, e ogni filo del bus porta un bit. Con ' + N + ' fili ogni passaggio porta ' + plural(d, 'cifra', 'cifre') + ': per tutto il numero ' + (n === 1 ? 'basta 1 passaggio.' : 'servono ' + n + ' passaggi.')
          : 'Per sommare A e B la CPU prende ' + plural(d, 'cifra', 'cifre') + ' di ciascun numero alla volta, partendo da destra. Il riporto passa da un pezzo al successivo, come nelle somme in colonna: ' + (n === 1 ? 'qui basta 1 passaggio.' : 'servono ' + n + ' passaggi.');
        const list = st.op === 'sum' && st.steps.length
          ? h('ol', { class: 'sb-steps sb-steps-sum' }, st.steps.map((sp) => h('li', null,
            h('code', null, hex(sp.a, d)), ' + ', h('code', null, hex(sp.b, d)), sp.carryIn ? ' + 1' : '', ' = ', h('code', null, hex(sp.raw, d)),
            sp.carryOut ? ': scrivo ' + hex(sp.sum, d) + ', riporto 1' : '')))
          : null;
        const done = st.done >= n;
        const res = calc();
        put(explain,
          h('span', { class: 'step' }, 'Bus dati · ' + N + ' fili'),
          h('h4', null, 'CPU a ' + N + ' bit, ' + EX[N]),
          h('p', null, intro),
          h('p', { class: 'sb-status' + (done ? ' is-ok' : '') }, status),
          list,
          done ? h('p', null, (st.op === 'sum' ? 'Risultato: ' : 'Nel registro: '), h('code', null, hex(res.result, 8)), st.op === 'sum' && res.carry ? ' (con un riporto oltre i 32 bit, che si perde)' : '', '.') : null,
          compare(),
          h('p', { class: 'sb-muted' }, 'Larghezza interna e bus non sempre coincidono: il 68000 ha registri a 32 bit ma un bus dati a 16, quindi per leggere 32 bit gli servono 2 passaggi; l\'8088, cioè un 8086 con 8 fili, ne fa il doppio dell\'8086.'));
      }

      function compare() {
        const list = h('ul', { class: 'sb-cmp', 'aria-label': 'Passaggi per un numero a 32 bit' });
        K.WIDTHS.forEach((w) => {
          const n = K.passes(32, w);
          const ok = tried[st.op].has(w);
          list.append(h('li', { class: (w === st.width ? 'is-cur' : '') + (ok ? ' is-ok' : '') },
            h('span', { class: 'sb-cmp-k' }, w + ' bit'),
            h('span', { class: 'sb-cmp-bar', 'aria-hidden': 'true' }, h('i', { style: { width: (n / 8 * 100) + '%' } })),
            h('span', { class: 'sb-cmp-v' }, plural(n, 'passaggio', 'passaggi')),
            h('span', { class: 'sb-cmp-ok' }, ok ? '✓' : '')));
        });
        return list;
      }

      // stato iniziale delle corsie: 16 fili
      lanes.forEach((ln, j) => { ln.off = j < st.width ? j - (st.width - 1) / 2 : 0; ln.op = j < st.width ? 1 : 0; });
      render();
      explainBus();

      return {
        el: el,
        relayout() { stop(); render(); explainBus(); },
        onShow() {},
      };
    }

    /* =====================================================================
     * 3 · Segmento:offset
     * ===================================================================== */

    function buildSeg() {
      const GEO = {
        w: {
          W: 720, H: 330, col0: 196, colW: 58, tile: [50, 50], rows: { s: 50, o: 124, r: 214 }, line: 200,
          lblX: 24, bitsY: 290, ann: [196, 30],
          map: { dir: 'v', x: 584, y: 30, w: 58, h: 280 },
        },
        n: {
          W: 360, H: 410, col0: 104, colW: 50, tile: [44, 46], rows: { s: 26, o: 92, r: 172 }, line: 158,
          lblX: 12, bitsY: 240, ann: [104, 14],
          map: { dir: 'h', x: 20, y: 318, w: 320, h: 40 },
        },
      };
      const fxS = fxSet();
      const st = { seg: 0x1234, off: 0x0010, run: 0, chal: 0, tries: 0, addr: null, win: null };
      let G = null;
      let E = {};

      const svg = s('svg', { class: 'sb-seg', role: 'img', 'aria-label': 'Calcolo dell\'indirizzo fisico dell\'8086: il segmento scorre di una cifra a sinistra, si somma l\'offset e il risultato si accende sulla mappa di 1 MB.' });

      const inSeg = h('input', { type: 'text', id: 'sedici-bit-seg', class: 'sb-input', value: '1234', maxlength: '4', size: '4', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'characters' });
      const inOff = h('input', { type: 'text', id: 'sedici-bit-off', class: 'sb-input', value: '0010', maxlength: '4', size: '4', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'characters' });
      [inSeg, inOff].forEach((inp) => inp.addEventListener('input', () => {
        const v = inp.value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 4);
        if (v !== inp.value) inp.value = v;
        inp.removeAttribute('aria-invalid');
      }));
      const calcBtn = ui.button({ label: 'Calcola', icon: '▶︎', primary: true });
      calcBtn.type = 'submit';
      const form = h('form', { class: 'sb-calc', onsubmit: (e) => { e.preventDefault(); fromInputs(); } },
        h('label', { class: 'sb-field', for: 'sedici-bit-seg' }, h('span', null, 'Segmento'), inSeg),
        h('span', { class: 'sb-colon', 'aria-hidden': 'true' }, ':'),
        h('label', { class: 'sb-field', for: 'sedici-bit-off' }, h('span', null, 'Offset'), inOff),
        calcBtn);
      const presets = h('div', { class: 'cp-bar-group sb-presets', role: 'group', 'aria-label': 'Esempi pronti' },
        h('span', { class: 'sb-lbl', 'aria-hidden': 'true' }, 'Esempi'),
        K.PRESETS.map((p) => ui.button({
          label: p.label, title: p.title, className: 'sb-preset', ariaLabel: p.label + ', ' + p.title.charAt(0).toLowerCase() + p.title.slice(1),
          onClick: () => { inSeg.value = hex(p.seg, 4); inOff.value = hex(p.off, 4); calculate(p.seg, p.off, p.id); },
        })));
      const bar = ui.bar(form, presets);

      const exDyn = h('div', { class: 'sb-exdyn' });
      // sfida
      const chalQ = h('p', { class: 'sb-chal-q', id: 'sedici-bit-sfida' });
      const ans = h('input', { type: 'text', id: 'sedici-bit-risposta', class: 'sb-input sb-input-ans', maxlength: '8', size: '7', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'characters', placeholder: '5 cifre', 'aria-describedby': 'sedici-bit-sfida sedici-bit-esito' });
      const verify = ui.button({ label: 'Verifica', icon: '✓', className: 'gold' });
      verify.type = 'submit';
      const msg = h('p', { class: 'sb-chal-msg', id: 'sedici-bit-esito', role: 'status' });
      const showBtn = ui.button({ label: 'Mostrami il calcolo', icon: '?', onClick: showMe });
      const nextBtn = ui.button({ label: 'Nuova sfida', icon: '⟳', onClick: () => nextChallenge(true) });
      showBtn.hidden = true;
      nextBtn.hidden = true;
      const chal = h('form', { class: 'sb-chal', onsubmit: (e) => { e.preventDefault(); check(); } },
        h('p', { class: 'step' }, 'Sfida'),
        chalQ,
        h('div', { class: 'sb-chal-row' },
          h('label', { class: 'sb-field', for: 'sedici-bit-risposta' }, h('span', null, 'Indirizzo fisico'), ans),
          verify),
        msg,
        h('div', { class: 'sb-chal-row' }, showBtn, nextBtn));
      const explain = h('div', { class: 'cp-explain sb-explain' }, exDyn, chal);
      const el = h('div', { class: 'sb-view sb-view-seg' }, bar,
        h('div', { class: 'cp-lab-grid sb-grid' }, h('div', { class: 'cp-stage sb-stage' }, svg), explain));

      /* ----- disegno ----- */

      function colX(k) { return G.col0 + k * G.colW; }

      function digit(x, y, cls) {
        const [tw0, th] = G.tile;
        const r = s('rect', { x: x, y: y, width: tw0, height: th, rx: 7 });
        const t = s('text', { x: x + tw0 / 2, y: y + th / 2 + 7.5, 'text-anchor': 'middle' });
        const g = s('g', { class: 'sb-dig ' + (cls || ''), 'data-cx': x + tw0 / 2, 'data-cy': y + th / 2 }, r, t);
        g.r = r;
        g.t = t;
        return g;
      }

      function mapPos(addr) {
        const m = G.map;
        const f = clamp(addr / 0x100000, 0, 1);
        return m.dir === 'v' ? m.y + m.h - f * m.h : m.x + f * m.w;
      }

      function render() {
        G = narrow ? GEO.n : GEO.w;
        st.run++; // un calcolo in corso si ferma: il nuovo disegno parte dallo stato finale
        fxS.stop();
        svg.setAttribute('viewBox', '0 0 ' + G.W + ' ' + G.H);
        svg.classList.toggle('is-narrow', narrow);
        svg.textContent = '';
        E = {};
        const [tw0, th] = G.tile;
        const rowMid = (y) => y + th / 2 + 5;

        // etichette delle righe
        E.lblS = s('text', { x: G.lblX, y: rowMid(G.rows.s), class: 'sb-seg-l' }, 'segmento');
        E.lblS2 = s('text', { x: G.lblX, y: rowMid(G.rows.s) + 17, class: 'sb-seg-l2' }, '');
        E.lblO = s('text', { x: G.lblX, y: rowMid(G.rows.o), class: 'sb-seg-l' }, '+ offset');
        E.lblR = s('text', { x: G.lblX, y: rowMid(G.rows.r), class: 'sb-seg-l' }, '= indirizzo');
        E.lblR2 = s('text', { x: G.lblX, y: rowMid(G.rows.r) + 17, class: 'sb-seg-l2' }, 'fisico');
        svg.append(E.lblS, E.lblS2, E.lblO, E.lblR, E.lblR2);

        // colonne guida (5 cifre = 20 bit)
        const guides = s('g', { class: 'sb-colg', 'aria-hidden': 'true' });
        for (let k = 0; k < 5; k++) guides.append(s('rect', { x: colX(k) - 3, y: G.rows.s - 6, width: tw0 + 6, height: G.rows.r + th - G.rows.s + 12, rx: 9, class: 'sb-col', 'data-k': k }));
        svg.append(guides);
        E.cols = Array.from(guides.children);

        // segmento (4 cifre che scorreranno a sinistra) e lo zero che entra da destra
        E.segG = s('g', { class: 'sb-segrow' });
        E.segD = [1, 2, 3, 4].map((k) => { const d = digit(colX(k), G.rows.s, 'is-seg'); E.segG.append(d); return d; });
        E.zero = digit(colX(4), G.rows.s, 'is-zero');
        E.zero.t.textContent = '0';
        svg.append(E.segG, E.zero);
        // offset
        E.offD = [1, 2, 3, 4].map((k) => { const d = digit(colX(k), G.rows.o, 'is-off'); svg.append(d); return d; });
        // riga della somma e riporti
        svg.append(s('line', { x1: colX(0) - 8, x2: colX(4) + tw0 + 8, y1: G.line, y2: G.line, class: 'sb-sumline' }));
        E.carry = [0, 1, 2, 3, 4].map((k) => { const t = s('text', { x: colX(k) + tw0 / 2, y: G.line - 6, 'text-anchor': 'middle', class: 'sb-cmark' }, '+1'); svg.append(t); return t; });
        const lx = colX(0) - G.colW / 2 + 2;
        E.lost = s('g', { class: 'sb-lost' },
          s('text', { x: lx, y: G.line - 6, 'text-anchor': 'middle', class: 'sb-lost-t' }, '1'),
          s('line', { x1: lx - 8, x2: lx + 8, y1: G.line - 19, y2: G.line - 5, class: 'sb-lost-x' }),
          s('text', { x: lx, y: G.line + 15, 'text-anchor': 'middle', class: 'sb-lost-l' }, 'perso'));
        svg.append(E.lost);
        // risultato
        E.resD = [0, 1, 2, 3, 4].map((k) => { const d = digit(colX(k), G.rows.r, 'is-res'); svg.append(d); return d; });
        // i 20 fili di indirizzo
        E.bits = [0, 1, 2, 3, 4].map((k) => { const t = s('text', { x: colX(k) + tw0 / 2, y: G.bitsY, 'text-anchor': 'middle', class: 'sb-bits' }); svg.append(t); return t; });
        E.bitsL = s('text', { x: G.lblX, y: G.bitsY, class: 'sb-seg-l2' }, narrow ? 'A19…A0' : '20 fili A19…A0');
        svg.append(E.bitsL);
        // annotazione dello scorrimento
        E.ann = s('text', { x: G.ann[0], y: G.ann[1], class: 'sb-ann' }, narrow ? '← × 16: ogni cifra scorre di 4 bit' : '← × 16: ogni cifra scorre di un posto, cioè di 4 bit');
        svg.append(E.ann);

        // mappa di 1 MB
        const m = G.map;
        const mapG = s('g', { class: 'sb-map' });
        E.blocks = [];
        for (let b = 0; b < 16; b++) {
          let r;
          let t;
          if (m.dir === 'v') {
            const bh = m.h / 16;
            const y = m.y + m.h - (b + 1) * bh;
            r = s('rect', { x: m.x, y: y + 0.5, width: m.w, height: bh - 1, rx: 2 });
            t = s('text', { x: m.x + m.w / 2, y: y + bh / 2 + 4, 'text-anchor': 'middle' }, hex(b, 1));
          } else {
            const bw = m.w / 16;
            const x = m.x + b * bw;
            r = s('rect', { x: x + 0.5, y: m.y, width: bw - 1, height: m.h, rx: 2 });
            t = s('text', { x: x + bw / 2, y: m.y + m.h / 2 + 4, 'text-anchor': 'middle' }, hex(b, 1));
          }
          const g = s('g', { class: 'sb-blk' }, r, t);
          mapG.append(g);
          E.blocks.push(g);
        }
        E.win = s('rect', { class: 'sb-win', rx: 3 });
        E.win2 = s('rect', { class: 'sb-win', rx: 3 });
        E.mark = s('line', { class: 'sb-mark' });
        E.pill = s('g', { class: 'sb-mpill' });
        E.pillR = s('rect', { width: 62, height: 22, rx: 6 });
        E.pillT = s('text', { x: 31, y: 15.5, 'text-anchor': 'middle' });
        E.pill.append(E.pillR, E.pillT);
        mapG.append(E.win, E.win2, E.mark, E.pill);
        if (m.dir === 'v') {
          mapG.append(s('text', { x: m.x - 8, y: m.y + 10, 'text-anchor': 'end', class: 'sb-map-l' }, 'FFFFF'));
          mapG.append(s('text', { x: m.x - 8, y: m.y + m.h, 'text-anchor': 'end', class: 'sb-map-l' }, '00000'));
          mapG.append(s('text', { x: m.x - 8, y: m.y + m.h / 2 + 4, 'text-anchor': 'end', class: 'sb-map-t' }, '1 MB'));
        } else {
          mapG.append(s('text', { x: m.x, y: m.y + m.h + 18, class: 'sb-map-l' }, '00000'));
          mapG.append(s('text', { x: m.x + m.w, y: m.y + m.h + 18, 'text-anchor': 'end', class: 'sb-map-l' }, 'FFFFF'));
          mapG.append(s('text', { x: m.x + m.w / 2, y: m.y + m.h + 40, 'text-anchor': 'middle', class: 'sb-map-t' }, 'memoria da 1 MB · 16 blocchi da 64 KB'));
        }
        svg.append(mapG);
        showStatic();
      }

      /** Stato finale del calcolo corrente, senza animazioni. */
      function showStatic() {
        const p = K.physical(st.seg, st.off);
        const cols = K.addColumns(p.shifted, st.off, 5);
        const hs = hex(st.seg, 4);
        const ho = hex(st.off, 4);
        E.segD.forEach((d, i) => { d.t.textContent = hs[i]; });
        E.offD.forEach((d, i) => { d.t.textContent = ho[i]; });
        E.segG.setAttribute('transform', 'translate(' + (-G.colW) + ' 0)');
        E.zero.style.opacity = '1';
        E.zero.removeAttribute('transform');
        E.lblS.textContent = 'segmento';
        E.lblS2.textContent = '× 16';
        const ha = hex(p.address, 5);
        E.resD.forEach((d, k) => { d.t.textContent = ha[k]; d.style.opacity = '1'; d.removeAttribute('transform'); });
        E.carry.forEach((t, k) => { t.style.opacity = carryInto(cols, k) ? '1' : '0'; });
        E.lost.style.opacity = cols.carry ? '1' : '0';
        bitsShow(p.address, true);
        st.addr = p.address;
        st.win = K.segmentWindow(st.seg).start;
        placeMap(st.addr, st.win);
        highlightBlock(p.address, false);
        E.cols.forEach((c) => c.classList.remove('is-on'));
        E.ann.style.opacity = '0';
      }

      /** La colonna k (da sinistra) riceve un riporto dalla colonna alla sua destra? */
      function carryInto(cols, k) {
        const pos = 4 - k;
        return pos < 5 && cols.cols[pos] && cols.cols[pos].carryIn === 1;
      }

      function bitsShow(addr, on) {
        const b = K.bitsOf(addr, 20).join('');
        E.bits.forEach((t, k) => { t.textContent = b.slice(k * 4, k * 4 + 4); t.style.opacity = on ? '1' : '0'; });
      }

      /** Rettangolo della finestra di 64 KB tra due indirizzi (in verticale o in orizzontale). */
      function winRect(r, from, to) {
        const m = G.map;
        const p0 = mapPos(from);
        const p1 = mapPos(to);
        const lo = Math.min(p0, p1);
        const len = Math.abs(p1 - p0);
        r.style.display = len > 0.5 ? '' : 'none';
        if (m.dir === 'v') {
          r.setAttribute('x', m.x - 4);
          r.setAttribute('width', m.w + 8);
          r.setAttribute('y', lo);
          r.setAttribute('height', Math.max(2, len));
        } else {
          r.setAttribute('y', m.y - 4);
          r.setAttribute('height', m.h + 8);
          r.setAttribute('x', lo);
          r.setAttribute('width', Math.max(2, len));
        }
      }

      function placeMap(addr, winStart) {
        const m = G.map;
        const a = mapPos(addr);
        // la finestra del segmento: 64 KB da segmento × 16; oltre FFFFF riprende da 00000
        const end = winStart + 0x10000;
        winRect(E.win, winStart, Math.min(end, 0x100000));
        winRect(E.win2, 0, Math.max(0, end - 0x100000));
        if (m.dir === 'v') {
          E.mark.setAttribute('x1', m.x - 8);
          E.mark.setAttribute('x2', m.x + m.w + 8);
          E.mark.setAttribute('y1', a);
          E.mark.setAttribute('y2', a);
          E.pill.setAttribute('transform', 'translate(' + (m.x + m.w + 12) + ' ' + (clamp(a, m.y + 11, m.y + m.h - 11) - 11).toFixed(1) + ')');
        } else {
          E.mark.setAttribute('y1', m.y - 10);
          E.mark.setAttribute('y2', m.y + m.h + 6);
          E.mark.setAttribute('x1', a);
          E.mark.setAttribute('x2', a);
          E.pill.setAttribute('transform', 'translate(' + clamp(a - 31, m.x - 4, m.x + m.w - 58).toFixed(1) + ' ' + (m.y - 36) + ')');
        }
        E.pillT.textContent = hex(addr, 5);
      }

      function highlightBlock(addr, glow) {
        const b = Math.floor(addr / 0x10000);
        E.blocks.forEach((g, i) => g.classList.toggle('is-hit', i === b));
        if (glow && !ctx.reduced) {
          const r = E.blocks[b].firstChild;
          const x = +r.getAttribute('x') + +r.getAttribute('width') / 2;
          const y = +r.getAttribute('y') + +r.getAttribute('height') / 2;
          ripple(svg, x, y, 10, 'is-addr');
        }
      }

      /* ----- calcolo animato ----- */

      async function calculate(seg, off, presetId, quiet) {
        const my = ++st.run;
        fxS.stop();
        st.seg = seg;
        st.off = off;
        st.preset = presetId || null;
        const p = K.physical(seg, off);
        const cols = K.addColumns(p.shifted, off, 5);
        explainSeg(p, cols);
        if (!quiet) ctx.say(K.formatSegOff(seg, off) + ' corrisponde all\'indirizzo fisico ' + hex(p.address, 5) + '.');
        if (ctx.reduced) { showStatic(); highlightBlock(p.address, false); return; }

        // 1 · si riparte: segmento al suo posto, risultato vuoto
        const hs = hex(seg, 4);
        const ho = hex(off, 4);
        E.segD.forEach((d, i) => { d.t.textContent = hs[i]; });
        E.offD.forEach((d, i) => { d.t.textContent = ho[i]; });
        E.segG.setAttribute('transform', 'translate(0 0)');
        E.zero.style.opacity = '0';
        E.lblS.textContent = 'segmento';
        E.lblS2.textContent = '';
        E.resD.forEach((d) => { d.style.opacity = '0'; });
        E.carry.forEach((t) => { t.style.opacity = '0'; });
        E.lost.style.opacity = '0';
        bitsShow(p.address, false);
        E.cols.forEach((c) => c.classList.remove('is-on'));
        E.ann.style.opacity = '0';
        if (!(await pause(fxS, 280)) || my !== st.run) return;

        // 2 · × 16: le cifre scorrono di una posizione (4 bit) e da destra entra uno 0
        tw(fxS, { from: 0, to: 1, duration: CP.dur.fast, onUpdate: (v) => { E.ann.style.opacity = String(v); } });
        const okShift = await tw(fxS, {
          from: 0, to: 1, duration: CP.dur.slow, ease: 'inOut',
          onUpdate: (v) => E.segG.setAttribute('transform', 'translate(' + (-v * G.colW).toFixed(2) + ' 0)'),
        });
        if (!okShift || my !== st.run) return;
        E.lblS2.textContent = '× 16';
        await popIn(fxS, E.zero, 0);
        if (my !== st.run) return;
        if (!(await pause(fxS, 320)) || my !== st.run) return;

        // 3 · somma in colonna, da destra a sinistra, con i riporti
        const ha = hex(p.address, 5);
        for (let pos = 0; pos < 5; pos++) {
          const k = 4 - pos;
          E.cols.forEach((c, i) => c.classList.toggle('is-on', i === k));
          E.resD[k].t.textContent = ha[k];
          popIn(fxS, E.resD[k], 0);
          if (cols.cols[pos].carryOut) {
            if (k > 0) {
              const t = E.carry[k - 1];
              tw(fxS, { from: 0, to: 1, duration: CP.dur.fast, delay: 120, onUpdate: (v) => { t.style.opacity = String(v); } });
            } else {
              tw(fxS, { from: 0, to: 1, duration: CP.dur.fast, delay: 120, onUpdate: (v) => { E.lost.style.opacity = String(v); } });
            }
          }
          if (!(await pause(fxS, 300)) || my !== st.run) return;
        }
        E.cols.forEach((c) => c.classList.remove('is-on'));
        tw(fxS, { from: 1, to: 0, duration: CP.dur.normal, onUpdate: (v) => { E.ann.style.opacity = String(v); } });

        // 4 · i 20 bit escono sui fili e l'indirizzo si accende sulla mappa
        E.bits.forEach((t, k) => tw(fxS, { from: 0, to: 1, duration: CP.dur.normal, delay: k * 70, onUpdate: (v) => { t.style.opacity = String(v); } }));
        const fromA = st.addr == null ? p.address : st.addr;
        const fromW = st.win == null ? K.segmentWindow(seg).start : st.win;
        const toW = K.segmentWindow(seg).start;
        st.addr = p.address;
        st.win = toW;
        const okMap = await tw(fxS, {
          from: [fromA, fromW], to: [p.address, toW], duration: CP.dur.slow, ease: 'smooth',
          onUpdate: (v) => { placeMap(v[0], v[1]); E.pillT.textContent = hex(p.address, 5); },
        });
        if (!okMap || my !== st.run) return;
        placeMap(p.address, toW);
        highlightBlock(p.address, true);
      }

      function fromInputs() {
        const seg = K.parseHex(inSeg.value, 4);
        const off = K.parseHex(inOff.value, 4);
        inSeg.toggleAttribute('aria-invalid', seg == null);
        inOff.toggleAttribute('aria-invalid', off == null);
        if (seg == null || off == null) {
          exDyn.textContent = '';
          exDyn.append(h('span', { class: 'step' }, 'Controlla i numeri'), h('p', { class: 'sb-warn' }, 'Segmento e offset sono numeri esadecimali da 1 a 4 cifre: da 0 a 9 e da A a F.'));
          ctx.say('Segmento e offset vanno scritti in esadecimale, da 1 a 4 cifre.');
          (seg == null ? inSeg : inOff).focus();
          return;
        }
        inSeg.value = hex(seg, 4);
        inOff.value = hex(off, 4);
        calculate(seg, off);
      }

      /* ----- spiegazione ----- */

      function aliasExample(seg, off) {
        if (off >= 16 && seg < 0xFFFF) return K.formatSegOff(seg + 1, off - 16);
        if (seg >= 1 && off + 16 <= 0xFFFF) return K.formatSegOff(seg - 1, off + 16);
        return null;
      }

      function explainSeg(p, cols) {
        const carries = cols.cols.filter((c) => c.carryOut).length;
        const code = (t) => h('code', null, t);
        exDyn.textContent = '';
        const items = [
          h('li', null, 'Segmento × 16: ', code(hex(p.seg, 4)), ' diventa ', code(hex(p.shifted, 5)), '. In esadecimale basta uno 0 a destra: tutte le cifre scorrono di 4 bit.'),
          h('li', null, 'Più l\'offset: ', code(hex(p.shifted, 5)), ' + ', code(hex(p.off, 4)), ' = ', code(hex(p.sum, p.wrapped ? 6 : 5)),
            carries ? ' (' + plural(carries, 'riporto', 'riporti') + ')' : '', '.'),
          p.wrapped
            ? h('li', null, 'Il totale ha 6 cifre, ma l\'8086 ha solo 20 fili di indirizzo: la cifra in più si perde e si riparte da ', code('00000'), '.')
            : h('li', null, 'Il risultato ha 5 cifre, cioè 20 bit: è l\'indirizzo che esce sui fili A19…A0.'),
        ];
        const alias = aliasExample(p.seg, p.off);
        let extra = null;
        if (st.preset === 'avvio') extra = 'Dopo il reset l\'8086 comincia da qui: FFFF0, 16 byte prima della fine del megabyte.';
        else if (p.wrapped) extra = 'Senza il giro oltre 1 MB, 00000 si scrive in un modo solo: 0000:0000.';
        else if (alias) extra = 'Questo byte ha ' + K.num(K.aliases(p.address)) + ' nomi diversi: per esempio anche ' + alias + '.';
        put(exDyn,
          h('span', { class: 'step' }, 'Indirizzo fisico'),
          h('h4', { class: 'sb-h-mono' }, K.formatSegOff(p.seg, p.off) + ' → ' + hex(p.address, 5)),
          h('ol', { class: 'sb-steps' }, items),
          extra ? h('p', { class: 'sb-muted' }, extra) : null);
      }

      /* ----- sfida ----- */

      const MSG = {
        ok: (c) => 'Esatto! ' + hex(c.seg, 4) + ' × 16 = ' + hex(c.seg * 16, 5) + ', più ' + hex(c.off, 4) + ' fa ' + hex(c.answer, 5) + '.',
        empty: () => 'Scrivi l\'indirizzo in esadecimale, con 5 cifre: per esempio 1A2B3.',
        invalid: () => 'Usa solo le cifre da 0 a 9 e le lettere da A a F, al massimo 5.',
        'no-shift': () => 'Hai sommato segmento e offset così come sono. Prima moltiplica il segmento per 16: in esadecimale aggiungi uno 0 a destra.',
        'shift-offset': () => 'Hai moltiplicato l\'offset: è il segmento che va moltiplicato per 16.',
        carry: () => 'Ci sei quasi: controlla i riporti. In esadecimale F + 1 fa 10, cioè scrivi 0 e porti 1.',
        wrap: () => 'L\'8086 ha solo 20 fili di indirizzo: il risultato ha al massimo 5 cifre.',
        wrong: () => 'Non ancora. Moltiplica il segmento per 16 (uno 0 a destra), poi somma l\'offset allineato a destra.',
      };

      function renderChallenge() {
        const c = K.challenge(st.chal);
        chalQ.textContent = '';
        chalQ.append('Qual è l\'indirizzo fisico di ', h('b', { class: 'sb-mono' }, c.text), '?');
      }

      function check() {
        const c = K.challenge(st.chal);
        const r = K.checkAnswer(ans.value, c.seg, c.off);
        msg.textContent = MSG[r.reason](c, r);
        msg.className = 'sb-chal-msg ' + (r.ok ? 'is-ok' : 'is-ko');
        ans.setAttribute('aria-invalid', String(!r.ok));
        if (r.ok) {
          ans.value = hex(r.value, 5);
          st.tries = 0;
          showBtn.hidden = true;
          nextBtn.hidden = false;
          const first = !solved;
          solved = true;
          const fin = updateGoal();
          inSeg.value = hex(c.seg, 4);
          inOff.value = hex(c.off, 4);
          calculate(c.seg, c.off, null, true);
          ctx.say(msg.textContent + (first ? ' Sfida risolta.' : '') + fin);
          if (!ctx.reduced && chal.animate) chal.animate([{ boxShadow: '0 0 0 2px rgba(62,224,143,.7)' }, { boxShadow: '0 0 0 2px rgba(62,224,143,0)' }], { duration: CP.dur.crawl, easing: 'ease-out' });
        } else {
          st.tries++;
          if (st.tries >= 2) showBtn.hidden = false;
          ctx.say(msg.textContent);
          if (!ctx.reduced && ans.animate) ans.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: CP.dur.normal, easing: 'ease-out' });
        }
      }

      function showMe() {
        const c = K.challenge(st.chal);
        inSeg.value = hex(c.seg, 4);
        inOff.value = hex(c.off, 4);
        calculate(c.seg, c.off, null, true);
        nextChallenge(false);
        msg.textContent = 'Il calcolo per ' + c.text + ' è qui accanto: fa ' + hex(c.answer, 5) + '. Ora prova da solo con questa nuova sfida.';
        msg.className = 'sb-chal-msg';
        ctx.say(msg.textContent);
      }

      function nextChallenge(focus) {
        st.chal++;
        st.tries = 0;
        ans.value = '';
        ans.removeAttribute('aria-invalid');
        msg.textContent = '';
        msg.className = 'sb-chal-msg';
        showBtn.hidden = true;
        nextBtn.hidden = true;
        renderChallenge();
        if (focus) { ans.focus(); ctx.say('Nuova sfida: ' + K.challenge(st.chal).text + '.'); }
      }

      render();
      explainSeg(K.physical(st.seg, st.off), K.addColumns(st.seg * 16, st.off, 5));
      renderChallenge();

      return {
        el: el,
        relayout() { render(); },
        onShow() {},
      };
    }

    /* =====================================================================
     * banco: scelta dello strumento
     * ===================================================================== */

    const chart = buildChart();
    const bus = buildBus();
    const segv = buildSeg();
    const VIEWS = [
      { id: 'chart', label: '1 · Transistor nel tempo', name: 'grafico dei transistor', view: chart },
      { id: 'bus', label: '2 · Quanto è largo il bus', name: 'larghezza del bus', view: bus },
      { id: 'seg', label: '3 · Segmento:offset', name: 'calcolatore segmento:offset', view: segv },
    ];
    let current = 'chart';
    const pick = ui.seg({ label: 'Scegli lo strumento', options: VIEWS.map((v) => ({ value: v.id, label: v.label })), value: current, onChange: (id) => show(id, true) });
    const top = h('div', { class: 'cp-bar sb-top' }, h('span', { class: 'sb-lbl', 'aria-hidden': 'true' }, 'Strumento'), pick);

    function show(id, announce) {
      current = id;
      VIEWS.forEach((v) => { v.view.el.hidden = v.id !== id; });
      const v = VIEWS.find((x) => x.id === id);
      v.view.onShow();
      if (announce) ctx.say('Strumento: ' + v.name + '.');
    }

    mount.append(top, chart.el, bus.el, segv.el, goal);
    show('chart', false);
    updateGoal();

    if (mq) {
      const onMq = () => {
        if (narrow === mq.matches) return;
        narrow = mq.matches;
        VIEWS.forEach((v) => v.view.relayout());
      };
      if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
    }
    ctx.onVisible((v) => { if (v && current === 'chart') chart.maybeIntro(); });
    if (ctx.visible) chart.maybeIntro();
  });
})();
