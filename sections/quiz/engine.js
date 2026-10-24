/*
 * Motore del quiz: le otto domande interattive, le animazioni, il tracciato
 * delle risposte (come un analizzatore logico), lo strumento del punteggio,
 * le scintille e i suoni. Usa QuizCore (logica) e QuizFigures (disegni).
 *   QuizEngine.mount(el, { questions, title, color, seconds, onAnswer, onFinish, onExit, onRetry, learn })
 *   QuizEngine.embed(el, { section, chapter, count })
 */
(function (root) {
  'use strict';

  const Core = root.QuizCore;
  const Fig = root.QuizFigures;

  /* ---------- movimento: gli stessi gettoni di quiz.css ---------- */

  const MOTION = {
    instant: 80, fast: 180, normal: 350, slow: 600, crawl: 1000,
    smooth: 'cubic-bezier(.22,1,.36,1)', sharp: 'cubic-bezier(.4,0,.2,1)', bounce: 'cubic-bezier(.34,1.56,.64,1)',
    stagger: 60,
  };

  function reduced() {
    return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // Anima solo transform e opacity; con il movimento ridotto resta una dissolvenza breve.
  function play(el, frames, opts) {
    if (!el || !el.animate) return Promise.resolve();
    const o = Object.assign({ duration: MOTION.normal, easing: MOTION.smooth }, opts);
    if (reduced()) {
      const fade = frames.filter((f) => 'opacity' in f).map((f) => ({ opacity: f.opacity }));
      if (fade.length < 2) return Promise.resolve();
      return el.animate(fade, { duration: Math.min(o.duration, 180), fill: o.fill, delay: 0 }).finished.catch(() => {});
    }
    return el.animate(frames, o).finished.catch(() => {});
  }

  function h(tag, attrs, ...children) {
    const n = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') for (const p in v) n.style.setProperty(p, v[p]);
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null && c !== false) n.append(c);
    return n;
  }

  const ICON = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="qz-icon-path" d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    cross: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="qz-icon-path" d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="qz-wave1" d="M16 9a4 4 0 010 6"/><path class="qz-wave2" d="M18.5 6.5a7.5 7.5 0 010 11"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    grip: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5c3-1.2 6-1.2 9 .6 3-1.8 6-1.8 9-.6v13c-3-1.2-6-1.2-9 .6-3-1.8-6-1.8-9-.6z"/><path d="M12 6.1v13"/></svg>',
  };

  function icon(name, cls) {
    return h('span', { class: 'qz-ic ' + (cls || ''), html: ICON[name] });
  }

  /* ---------- suoni (spenti per partire; WebAudio, nessun file) ---------- */

  const Sound = {
    on: false,
    ctx: null,
    notes(list) {
      if (!this.on) return;
      try {
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return;
        const ctx = this.ctx || (this.ctx = new AC());
        if (ctx.state === 'suspended') ctx.resume();
        const t0 = ctx.currentTime + 0.01;
        list.forEach(([freq, at, dur, type, vol]) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = type || 'sine';
          o.frequency.value = freq;
          g.gain.setValueAtTime(0.0001, t0 + at);
          g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + at + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
          o.connect(g).connect(ctx.destination);
          o.start(t0 + at);
          o.stop(t0 + at + dur + 0.05);
        });
      } catch (e) { /* audio non disponibile */ }
    },
    right() { this.notes([[660, 0, 0.12], [988, 0.09, 0.2]]); },
    wrong() { this.notes([[196, 0, 0.22, 'triangle', 0.1], [147, 0.1, 0.25, 'triangle', 0.08]]); },
    tick() { this.notes([[1200, 0, 0.03, 'square', 0.03]]); },
    finish(good) {
      const seq = good ? [523, 659, 784, 1047] : [440, 392, 349];
      this.notes(seq.map((f, i) => [f, i * 0.11, 0.24]));
    },
  };

  /* ---------- scintille ---------- */

  let sparkCanvas = null;
  let sparkList = [];
  let sparkRaf = 0;

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function sparks(x, y, count, spread) {
    if (reduced() || !document.body) return;
    if (!sparkCanvas) {
      sparkCanvas = h('canvas', { class: 'qz-sparks', 'aria-hidden': 'true' });
      document.body.append(sparkCanvas);
    }
    const dpr = Math.min(2, root.devicePixelRatio || 1);
    if (sparkCanvas.width !== Math.round(innerWidth * dpr) || sparkCanvas.height !== Math.round(innerHeight * dpr)) {
      sparkCanvas.width = Math.round(innerWidth * dpr);
      sparkCanvas.height = Math.round(innerHeight * dpr);
    }
    const colors = [cssVar('--trace-1', '#3ee08f'), cssVar('--trace-2', '#ffc04d'), cssVar('--trace-3', '#5cc8ff'), cssVar('--accent', '#0e7a5f')];
    const sp = spread || 1;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (2 + Math.random() * 5) * sp;
      sparkList.push({
        x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2.5 * sp,
        life: 0, max: 700 + Math.random() * 600, size: 1.5 + Math.random() * 2.5,
        color: colors[i % colors.length], streak: Math.random() < 0.5,
      });
    }
    if (!sparkRaf) {
      let last = performance.now();
      const step = (now) => {
        const dt = Math.min(40, now - last);
        last = now;
        const ctx = sparkCanvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        sparkList = sparkList.filter((p) => (p.life += dt) < p.max);
        sparkList.forEach((p) => {
          p.vy += 0.012 * dt;
          p.vx *= 0.985;
          p.x += p.vx * dt / 16;
          p.y += p.vy * dt / 16;
          const k = 1 - p.life / p.max;
          ctx.globalAlpha = k;
          ctx.strokeStyle = p.color;
          ctx.fillStyle = p.color;
          if (p.streak) {
            ctx.lineWidth = p.size * 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * k + 0.4, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.globalAlpha = 1;
        if (sparkList.length) sparkRaf = requestAnimationFrame(step);
        else { sparkRaf = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
      };
      sparkRaf = requestAnimationFrame(step);
    }
  }

  function sparksFrom(el, count, spread) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    sparks(r.left + r.width / 2, r.top + r.height / 2, count, spread);
  }

  /* ---------- strumento del punteggio (un tester analogico) ---------- */

  const SVGNS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs, parent) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.append(n);
    return n;
  }

  // Ago da -60° (0%) a +60° (100%) attorno al perno.
  const CX = 130;
  const CY = 136;
  const angleOf = (p) => -60 + 120 * Math.max(0, Math.min(1, p));
  function polar(r, deg) {
    const a = (deg - 90) * Math.PI / 180;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  }
  function arcPath(r, d0, d1) {
    const [x0, y0] = polar(r, d0);
    const [x1, y1] = polar(r, d1);
    return 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + r + ' ' + r + ' 0 0 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
  }

  function gauge(opts) {
    const o = Object.assign({ label: 'ESITO', unit: '%' }, opts);
    const svg = sv('svg', { viewBox: '0 0 260 176', class: 'qz-gauge', role: 'img', 'aria-label': o.label + ' 0%' });
    sv('rect', { x: 2, y: 2, width: 256, height: 172, rx: 18, class: 'qz-gauge-face' }, svg);
    sv('rect', { x: 14, y: 14, width: 232, height: 124, rx: 10, class: 'qz-gauge-window' }, svg);
    const zones = [[0, 0.5, 'z0'], [0.5, 0.75, 'z1'], [0.75, 0.9, 'z2'], [0.9, 1, 'z3']];
    zones.forEach(([a, b, c]) => sv('path', { d: arcPath(100, angleOf(a), angleOf(b)), class: 'qz-gauge-zone ' + c }, svg));
    for (let i = 0; i <= 20; i++) {
      const deg = angleOf(i / 20);
      const major = i % 5 === 0;
      const [x0, y0] = polar(major ? 84 : 89, deg);
      const [x1, y1] = polar(95, deg);
      sv('path', { d: 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' L' + x1.toFixed(1) + ' ' + y1.toFixed(1), class: 'qz-gauge-tick' + (major ? ' major' : '') }, svg);
      if (major) {
        const [tx, ty] = polar(72, deg);
        const t = sv('text', { x: tx.toFixed(1), y: (ty + 4).toFixed(1), 'text-anchor': 'middle', class: 'qz-gauge-num' }, svg);
        t.textContent = String(i * 5);
      }
    }
    const lbl = sv('text', { x: CX, y: 92, 'text-anchor': 'middle', class: 'qz-gauge-label' }, svg);
    lbl.textContent = o.label;
    const needle = sv('g', { class: 'qz-needle' }, svg);
    sv('path', { d: 'M' + CX + ' ' + (CY + 14) + ' L' + (CX - 2.2) + ' ' + CY + ' L' + CX + ' ' + (CY - 104) + ' L' + (CX + 2.2) + ' ' + CY + ' Z', class: 'qz-needle-body' }, needle);
    sv('circle', { cx: CX, cy: CY, r: 9, class: 'qz-needle-hub' }, svg);
    sv('circle', { cx: CX, cy: CY, r: 3, class: 'qz-needle-pin' }, svg);
    sv('rect', { x: 78, y: 146, width: 104, height: 22, rx: 5, class: 'qz-gauge-lcd' }, svg);
    const readout = sv('text', { x: CX, y: 162.5, 'text-anchor': 'middle', class: 'qz-gauge-digits' }, svg);
    readout.textContent = '--';
    needle.style.transformOrigin = CX + 'px ' + CY + 'px';
    needle.style.transform = 'rotate(' + angleOf(0) + 'deg)';
    let current = 0;

    function set(p, animate) {
      const target = angleOf(p);
      const from = angleOf(current);
      current = p;
      svg.setAttribute('aria-label', o.label + ' ' + Math.round(p * 100) + o.unit);
      if (!animate || reduced() || !needle.animate) {
        needle.style.transform = 'rotate(' + target + 'deg)';
        readout.textContent = Math.round(p * 100) + o.unit;
        return Promise.resolve();
      }
      const over = Math.min(64, target + 7);
      needle.style.transform = 'rotate(' + target + 'deg)';
      const anim = needle.animate([
        { transform: 'rotate(' + from + 'deg)' },
        { transform: 'rotate(' + over + 'deg)', offset: 0.55 },
        { transform: 'rotate(' + (target - 3) + 'deg)', offset: 0.75 },
        { transform: 'rotate(' + (target + 1.2) + 'deg)', offset: 0.9 },
        { transform: 'rotate(' + target + 'deg)' },
      ], { duration: 1700, easing: 'cubic-bezier(.3,.7,.2,1)' });
      const t0 = performance.now();
      const n0 = Math.round(from === angleOf(0) ? 0 : (from + 60) / 120 * 100);
      const n1 = Math.round(p * 100);
      const tickNum = (now) => {
        const k = Math.min(1, (now - t0) / 1300);
        const e = 1 - Math.pow(1 - k, 3);
        readout.textContent = Math.round(n0 + (n1 - n0) * e) + o.unit;
        if (k < 1) requestAnimationFrame(tickNum);
      };
      requestAnimationFrame(tickNum);
      return anim.finished.catch(() => {});
    }
    return { el: svg, set: set };
  }

  /* ---------- tracciato delle risposte ---------- */

  function trace(n, big) {
    const SLOT = 26;
    const W = n * SLOT + 16;
    const H = big ? 64 : 44;
    const HI = big ? 14 : 9;
    const LO = big ? 40 : 30;
    const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'qz-trace-svg' + (big ? ' big' : ''), role: 'img', 'aria-label': 'Tracciato delle risposte' }, null);
    sv('rect', { x: 0, y: 0, width: W, height: H, rx: 8, class: 'qz-trace-bg' }, svg);
    for (let i = 0; i <= n; i++) sv('path', { d: 'M' + (8 + i * SLOT) + ' 4 V' + (H - (big ? 18 : 4)), class: 'qz-trace-grid' }, svg);
    sv('path', { d: 'M8 ' + LO + ' H' + (W - 8), class: 'qz-trace-idle' }, svg);
    const segs = sv('g', null, svg);
    if (big) {
      for (let i = 0; i < n; i++) {
        const t = sv('text', { x: 8 + i * SLOT + SLOT / 2, y: H - 5, 'text-anchor': 'middle', class: 'qz-trace-n' }, svg);
        t.textContent = String(i + 1);
      }
    }
    const cursor = sv('rect', { x: 8, y: 3, width: 2, height: H - (big ? 20 : 6), class: 'qz-trace-cursor' }, svg);
    const results = [];
    function seg(i, ok, animate) {
      const x0 = 8 + i * SLOT;
      const x1 = x0 + SLOT;
      const d = ok
        ? 'M' + x0 + ' ' + LO + ' H' + (x0 + 4) + ' V' + HI + ' H' + (x1 - 4) + ' V' + LO + ' H' + x1
        : 'M' + x0 + ' ' + LO + ' H' + (x0 + 7) + ' L' + (x0 + 10) + ' ' + (LO + 6) + ' H' + (x1 - 10) + ' L' + (x1 - 7) + ' ' + LO + ' H' + x1;
      const p = sv('path', { d: d, class: 'qz-trace-seg ' + (ok ? 'ok' : 'ko'), pathLength: 1 }, segs);
      if (animate && !reduced()) p.classList.add('draw');
    }
    return {
      el: svg,
      mark(i, ok) {
        results[i] = ok;
        seg(i, ok, true);
        const right = results.filter(Boolean).length;
        svg.setAttribute('aria-label', 'Tracciato delle risposte: ' + right + ' giuste su ' + results.filter((r) => r != null).length);
      },
      at(i) { cursor.setAttribute('x', String(8 + Math.min(i, n - 1) * SLOT + SLOT / 2 - 1)); cursor.style.display = i >= n ? 'none' : ''; },
      fill(list) { list.forEach((ok, i) => seg(i, ok, false)); cursor.style.display = 'none'; svg.setAttribute('aria-label', 'Tracciato delle risposte: ' + list.filter(Boolean).length + ' giuste su ' + list.length); },
    };
  }

  /* ---------- medaglia ---------- */

  const MEDAL_NAME = { oro: 'Medaglia d\'oro', argento: 'Medaglia d\'argento', bronzo: 'Medaglia di bronzo' };

  function medalEl(kind) {
    const wrapEl = h('div', { class: 'qz-medal qz-medal-' + kind, role: 'img', 'aria-label': MEDAL_NAME[kind] });
    const svg = sv('svg', { viewBox: '0 0 120 140', 'aria-hidden': 'true' }, wrapEl);
    sv('path', { d: 'M36 6 L58 62 L44 70 L22 14 Z', class: 'qz-ribbon a' }, svg);
    sv('path', { d: 'M84 6 L62 62 L76 70 L98 14 Z', class: 'qz-ribbon b' }, svg);
    sv('circle', { cx: 60, cy: 88, r: 40, class: 'qz-medal-rim' }, svg);
    sv('circle', { cx: 60, cy: 88, r: 31, class: 'qz-medal-face' }, svg);
    sv('path', { d: 'M60 66 L66.5 80 L82 81.5 L70.5 92 L74 107 L60 99 L46 107 L49.5 92 L38 81.5 L53.5 80 Z', class: 'qz-medal-star' }, svg);
    const shine = sv('g', { class: 'qz-medal-shine' }, svg);
    sv('rect', { x: -40, y: 40, width: 18, height: 100, transform: 'rotate(25 60 88)' }, shine);
    wrapEl.append(h('span', { class: 'qz-medal-label' }, kind.toUpperCase()));
    return wrapEl;
  }

  /* ---------- le otto domande ---------- */

  const HINTS = {
    order: 'Trascina gli elementi, o usa le frecce, per metterli in ordine. Poi conferma.',
    match: 'Tocca un elemento a sinistra e poi quello che gli corrisponde a destra.',
    number: 'Scrivi il numero (va bene la virgola) e conferma.',
    bits: 'Tocca i bit per accenderli (1) o spegnerli (0), poi conferma.',
    truth: 'Scegli 0 o 1 per ogni riga della tabella, poi conferma.',
    logic: 'Imposta gli interruttori, poi prova il circuito.',
  };

  const RENDER = {};

  RENDER.choice = function (q, ctx) {
    const order = Core.shuffle(q.options.map((o, i) => i), ctx.rand);
    const short = q.options.length === 4 && q.options.every((o) => o.length <= 34);
    const list = h('div', { class: 'qz-options' + (short ? ' two' : ''), role: 'group', 'aria-label': 'Risposte' });
    const buttons = order.map((oi, i) => {
      const b = h('button', { type: 'button', class: 'qz-option', style: { '--i': i }, onclick: () => ctx.submit(oi) },
        h('span', { class: 'qz-key', 'aria-hidden': 'true' }, 'ABCDE'[i]),
        h('span', { class: 'qz-option-text' }, q.options[oi]),
        h('span', { class: 'qz-mark', 'aria-hidden': 'true' }));
      b.dataset.index = oi;
      return b;
    });
    list.append(...buttons);
    return {
      el: list,
      immediate: true,
      focusFirst: () => buttons[0].focus({ preventScroll: true }),
      key(e) {
        const k = e.key.toLowerCase();
        let i = '12345'.indexOf(k);
        if (i < 0) i = 'abcde'.indexOf(k);
        if (i >= 0 && i < buttons.length) { ctx.submit(order[i]); return true; }
        return false;
      },
      lock(ok, r) {
        buttons.forEach((b) => {
          b.disabled = true;
          const oi = Number(b.dataset.index);
          if (oi === q.answer) { b.classList.add('right'); b.querySelector('.qz-mark').innerHTML = ICON.check; }
          if (oi === r && !ok) { b.classList.add('wrong'); b.querySelector('.qz-mark').innerHTML = ICON.cross; }
          if (oi !== q.answer && oi !== r) b.classList.add('dim');
        });
        return buttons.find((b) => Number(b.dataset.index) === (ok ? q.answer : r));
      },
    };
  };

  RENDER.truefalse = function (q, ctx) {
    const mk = (val, label, key) => h('button', { type: 'button', class: 'qz-option qz-tf ' + (val ? 'is-true' : 'is-false'), onclick: () => ctx.submit(val) },
      h('span', { class: 'qz-key', 'aria-hidden': 'true' }, key),
      h('span', { class: 'qz-option-text' }, label),
      h('span', { class: 'qz-mark', 'aria-hidden': 'true' }));
    const bt = mk(true, 'Vero', 'V');
    const bf = mk(false, 'Falso', 'F');
    return {
      el: h('div', { class: 'qz-options two qz-tf-row', role: 'group', 'aria-label': 'Vero o falso' }, bt, bf),
      immediate: true,
      focusFirst: () => bt.focus({ preventScroll: true }),
      key(e) {
        const k = e.key.toLowerCase();
        if (k === 'v') { ctx.submit(true); return true; }
        if (k === 'f') { ctx.submit(false); return true; }
        return false;
      },
      lock(ok, r) {
        [[bt, true], [bf, false]].forEach(([b, val]) => {
          b.disabled = true;
          if (val === q.answer) { b.classList.add('right'); b.querySelector('.qz-mark').innerHTML = ICON.check; }
          else if (val === r) { b.classList.add('wrong'); b.querySelector('.qz-mark').innerHTML = ICON.cross; }
          else b.classList.add('dim');
        });
        return r === true ? bt : bf;
      },
    };
  };

  // FLIP: anima gli elementi dalla vecchia alla nuova posizione dopo un riordino.
  function flip(items, mutate) {
    const before = new Map(items.map((el) => [el, el.getBoundingClientRect().top]));
    mutate();
    if (reduced()) return;
    items.forEach((el) => {
      const dy = before.get(el) - el.getBoundingClientRect().top;
      if (dy) el.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: MOTION.normal, easing: MOTION.smooth });
    });
  }

  RENDER.order = function (q, ctx) {
    let current = Core.scramble(q.items, ctx.rand);
    const ends = q.ends || ['Primo', 'Ultimo'];
    const list = h('ol', { class: 'qz-order', 'aria-label': 'Elementi da ordinare, da ' + ends[0].toLowerCase() + ' a ' + ends[1].toLowerCase() });
    const rows = new Map();
    let locked = false;

    function makeRow(item) {
      const up = h('button', { type: 'button', class: 'qz-mini', 'aria-label': 'Sposta su: ' + item, onclick: () => move(item, -1), html: ICON.up });
      const down = h('button', { type: 'button', class: 'qz-mini', 'aria-label': 'Sposta giù: ' + item, onclick: () => move(item, 1), html: ICON.down });
      const grip = h('span', { class: 'qz-grip', 'aria-hidden': 'true', html: ICON.grip });
      const li = h('li', { class: 'qz-order-item' }, grip, h('span', { class: 'qz-order-pos', 'aria-hidden': 'true' }), h('span', { class: 'qz-order-text' }, item), h('span', { class: 'qz-order-btns' }, up, down));
      li.addEventListener('pointerdown', (e) => startDrag(e, item));
      return li;
    }
    q.items.forEach((item) => rows.set(item, makeRow(item)));

    function render() {
      current.forEach((item, i) => {
        const li = rows.get(item);
        li.querySelector('.qz-order-pos').textContent = String(i + 1);
        li.querySelectorAll('.qz-mini')[0].disabled = locked || i === 0;
        li.querySelectorAll('.qz-mini')[1].disabled = locked || i === current.length - 1;
        list.append(li);
      });
    }
    function move(item, dir) {
      const i = current.indexOf(item);
      const j = i + dir;
      if (j < 0 || j >= current.length) return;
      const els = [...rows.values()];
      flip(els, () => {
        current = current.slice();
        [current[i], current[j]] = [current[j], current[i]];
        render();
      });
      const btn = rows.get(item).querySelectorAll('.qz-mini')[dir < 0 ? 0 : 1];
      (btn.disabled ? rows.get(item).querySelectorAll('.qz-mini')[dir < 0 ? 1 : 0] : btn).focus({ preventScroll: true });
      ctx.live((current.indexOf(item) + 1) + '° posto: ' + item);
    }

    let drag = null;
    function startDrag(e, item) {
      if (locked || e.button > 0 || e.target.closest('button')) return;
      const li = rows.get(item);
      e.preventDefault();
      li.setPointerCapture(e.pointerId);
      drag = { item: item, li: li, y0: e.clientY, id: e.pointerId };
      li.classList.add('dragging');
      li.addEventListener('pointermove', onMove);
      li.addEventListener('pointerup', endDrag);
      li.addEventListener('pointercancel', endDrag);
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const li = drag.li;
      li.style.transform = 'translateY(' + (e.clientY - drag.y0) + 'px)';
      const i = current.indexOf(drag.item);
      const others = current.filter((x) => x !== drag.item);
      let target = 0;
      others.forEach((x) => {
        const r = rows.get(x).getBoundingClientRect();
        if (e.clientY > r.top + r.height / 2) target++;
      });
      if (target !== i) {
        const els = [...rows.values()].filter((el) => el !== li);
        const before = li.getBoundingClientRect().top;
        flip(els, () => {
          current = others.slice(0, target).concat(drag.item, others.slice(target));
          render();
        });
        const after = li.getBoundingClientRect().top;
        drag.y0 += after - before;
        li.style.transform = 'translateY(' + (e.clientY - drag.y0) + 'px)';
      }
    }
    function endDrag(e) {
      if (!drag) return;
      const li = drag.li;
      li.releasePointerCapture(drag.id);
      li.removeEventListener('pointermove', onMove);
      li.removeEventListener('pointerup', endDrag);
      li.removeEventListener('pointercancel', endDrag);
      li.classList.remove('dragging');
      const off = parseFloat((li.style.transform.match(/-?[\d.]+/) || ['0'])[0]);
      li.style.transform = '';
      if (off) play(li, [{ transform: 'translateY(' + off + 'px)' }, { transform: 'none' }], { duration: MOTION.fast });
      drag = null;
    }
    render();
    return {
      el: h('div', { class: 'qz-order-wrap' }, h('span', { class: 'qz-end top' }, ends[0]), list, h('span', { class: 'qz-end bottom' }, ends[1])),
      ready: () => true,
      value: () => current.slice(),
      focusFirst: () => rows.get(current[0]).querySelectorAll('.qz-mini')[1].focus({ preventScroll: true }),
      lock(ok) {
        locked = true;
        render();
        current.forEach((item, i) => {
          const li = rows.get(item);
          const good = q.items[i] === item;
          li.classList.add(good ? 'right' : 'wrong');
          if (!good) li.querySelector('.qz-order-pos').textContent = (q.items.indexOf(item) + 1) + '°';
        });
        return list;
      },
    };
  };

  const PAIR_COLORS = 5;

  RENDER.match = function (q, ctx) {
    const lefts = q.pairs.map((p) => p[0]);
    const rights = Core.scramble(q.pairs.map((p) => p[1]), ctx.rand);
    const links = {};
    let picked = null;
    let locked = false;
    const lines = sv('svg', { class: 'qz-match-lines', 'aria-hidden': 'true' }, null);
    const colL = h('div', { class: 'qz-match-col', role: 'group', 'aria-label': 'Colonna di sinistra' });
    const colR = h('div', { class: 'qz-match-col', role: 'group', 'aria-label': 'Colonna di destra' });
    const btnL = new Map();
    const btnR = new Map();
    const box = h('div', { class: 'qz-match' }, lines, colL, colR);

    lefts.forEach((t) => {
      const b = h('button', { type: 'button', class: 'qz-match-item left', onclick: () => pick('L', t) }, h('span', { class: 'qz-match-badge', 'aria-hidden': 'true' }), h('span', null, t));
      btnL.set(t, b);
      colL.append(b);
    });
    rights.forEach((t) => {
      const b = h('button', { type: 'button', class: 'qz-match-item right', onclick: () => pick('R', t) }, h('span', { class: 'qz-match-badge', 'aria-hidden': 'true' }), h('span', null, t));
      btnR.set(t, b);
      colR.append(b);
    });

    const leftOf = (r) => Object.keys(links).find((l) => links[l] === r);

    function pick(side, t) {
      if (locked) return;
      if (side === 'L' && links[t] != null && !picked) { delete links[t]; paint(); ctx.live('Collegamento tolto'); return; }
      if (side === 'R' && leftOf(t) != null && !picked) { delete links[leftOf(t)]; paint(); ctx.live('Collegamento tolto'); return; }
      if (!picked || picked.side === side) { picked = { side: side, t: t }; paint(); return; }
      const l = side === 'L' ? t : picked.t;
      const r = side === 'R' ? t : picked.t;
      if (links[l] != null) delete links[l];
      const old = leftOf(r);
      if (old != null) delete links[old];
      links[l] = r;
      picked = null;
      paint(true, l);
      ctx.live(l + ' collegato a ' + r);
      ctx.changed();
      const nextFree = lefts.find((x) => links[x] == null);
      if (nextFree) btnL.get(nextFree).focus({ preventScroll: true });
    }

    function paint(fresh, freshLeft) {
      const order = lefts.filter((l) => links[l] != null);
      btnL.forEach((b, t) => {
        const k = order.indexOf(t);
        b.classList.toggle('picked', !!picked && picked.side === 'L' && picked.t === t);
        b.classList.toggle('linked', k >= 0);
        b.style.setProperty('--pc', 'var(--qz-pair-' + (lefts.indexOf(t) % PAIR_COLORS) + ')');
        b.querySelector('.qz-match-badge').textContent = k >= 0 ? String(lefts.indexOf(t) + 1) : '';
        b.setAttribute('aria-pressed', picked && picked.side === 'L' && picked.t === t ? 'true' : 'false');
        b.setAttribute('aria-label', t + (links[t] != null ? ', collegato a ' + links[t] : ''));
      });
      btnR.forEach((b, t) => {
        const l = leftOf(t);
        b.classList.toggle('picked', !!picked && picked.side === 'R' && picked.t === t);
        b.classList.toggle('linked', l != null);
        if (l != null) b.style.setProperty('--pc', 'var(--qz-pair-' + (lefts.indexOf(l) % PAIR_COLORS) + ')');
        b.querySelector('.qz-match-badge').textContent = l != null ? String(lefts.indexOf(l) + 1) : '';
        b.setAttribute('aria-pressed', picked && picked.side === 'R' && picked.t === t ? 'true' : 'false');
        b.setAttribute('aria-label', t + (l != null ? ', collegato a ' + l : ''));
      });
      drawLines(fresh ? freshLeft : null);
    }

    function drawLines(freshLeft) {
      const br = box.getBoundingClientRect();
      if (!br.width) return;
      lines.setAttribute('viewBox', '0 0 ' + br.width + ' ' + br.height);
      lines.innerHTML = '';
      Object.keys(links).forEach((l) => {
        const a = btnL.get(l).getBoundingClientRect();
        const b = btnR.get(links[l]).getBoundingClientRect();
        const x1 = a.right - br.left;
        const y1 = a.top + a.height / 2 - br.top;
        const x2 = b.left - br.left;
        const y2 = b.top + b.height / 2 - br.top;
        const mx = (x1 + x2) / 2;
        const p = sv('path', { d: 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2, pathLength: 1, class: 'qz-match-line' }, lines);
        p.style.setProperty('--pc', 'var(--qz-pair-' + (lefts.indexOf(l) % PAIR_COLORS) + ')');
        if (locked) p.classList.add(links[l] === q.pairs[lefts.indexOf(l)][1] ? 'ok' : 'ko');
        if (l === freshLeft && !reduced()) p.classList.add('draw');
      });
    }

    const ro = root.ResizeObserver ? new ResizeObserver(() => drawLines()) : null;
    if (ro) ro.observe(box);
    ctx.onDestroy(() => ro && ro.disconnect());
    requestAnimationFrame(() => paint());

    return {
      el: box,
      ready: () => lefts.every((l) => links[l] != null),
      value: () => Object.assign({}, links),
      focusFirst: () => btnL.get(lefts[0]).focus({ preventScroll: true }),
      lock() {
        locked = true;
        picked = null;
        q.pairs.forEach(([l, r]) => {
          const ok = links[l] === r;
          btnL.get(l).classList.add(ok ? 'right' : 'wrong');
          if (links[l] != null) btnR.get(links[l]).classList.add(ok ? 'right' : 'wrong');
        });
        btnL.forEach((b) => { b.disabled = true; });
        btnR.forEach((b) => { b.disabled = true; });
        paint();
        return box;
      },
    };
  };

  RENDER.number = function (q, ctx) {
    const id = 'qz-num-' + ctx.uid;
    const input = h('input', {
      id: id, type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', class: 'qz-num-input',
      'aria-describedby': id + '-u', placeholder: '0',
      oninput: () => ctx.changed(),
      onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); ctx.confirm(); } },
    });
    // Il tastierino numerico dei telefoni spesso non ha il segno meno: lo dà questo pulsante.
    const sign = h('button', {
      type: 'button', class: 'qz-num-sign', 'aria-label': 'Cambia segno', title: 'Cambia segno',
      onclick: () => {
        const v = input.value.trim();
        input.value = /^[-−]/.test(v) ? v.replace(/^[-−]\s*/, '') : '−' + v;
        ctx.changed();
        input.focus({ preventScroll: true });
      },
    }, '±');
    const box = h('div', { class: 'qz-num' },
      h('label', { for: id, class: 'qz-num-label' }, 'La tua risposta'),
      h('div', { class: 'qz-num-field' }, sign, input, q.unit ? h('span', { class: 'qz-num-unit', id: id + '-u' }, q.unit) : null));
    return {
      el: box,
      ready: () => Number.isFinite(Core.parseNumber(input.value)),
      value: () => input.value,
      focusFirst: () => input.focus({ preventScroll: true }),
      typing: true,
      lock(ok) {
        input.readOnly = true;
        sign.disabled = true;
        box.classList.add(ok ? 'right' : 'wrong');
        return input;
      },
    };
  };

  RENDER.bits = function (q, ctx) {
    const n = q.width;
    const bits = new Array(n).fill(0);
    const row = h('div', { class: 'qz-bitrow', role: 'group', 'aria-label': n + ' bit, dal più pesante al più leggero' });
    const btns = bits.map((b, i) => {
      const weight = Math.pow(2, n - 1 - i);
      const btn = h('button', {
        type: 'button', class: 'qz-bit', 'aria-pressed': 'false', 'aria-label': 'Bit di peso ' + weight,
        onclick: () => {
          bits[i] = 1 - bits[i];
          btn.setAttribute('aria-pressed', bits[i] ? 'true' : 'false');
          btn.querySelector('.qz-bit-v').textContent = String(bits[i]);
          btn.classList.toggle('on', !!bits[i]);
          play(btn.querySelector('.qz-bit-v'), [{ transform: 'rotateX(90deg)', opacity: 0.3 }, { transform: 'none', opacity: 1 }], { duration: MOTION.fast });
          ctx.changed();
        },
      }, h('span', { class: 'qz-bit-w', 'aria-hidden': 'true' }, String(weight)), h('span', { class: 'qz-bit-v', 'aria-hidden': 'true' }, '0'));
      return btn;
    });
    btns.forEach((b, i) => {
      row.append(b);
      if ((i + 1) % 4 === 0 && i < n - 1) row.append(h('span', { class: 'qz-bit-gap', 'aria-hidden': 'true' }));
    });
    const val = () => bits.reduce((acc, b) => acc * 2 + b, 0);
    return {
      el: row,
      ready: () => true,
      value: val,
      focusFirst: () => btns[0].focus({ preventScroll: true }),
      lock() {
        const want = Core.toBinary(q.value, n);
        btns.forEach((b, i) => {
          b.disabled = true;
          b.classList.add(String(bits[i]) === want[i] ? 'right' : 'wrong');
        });
        return row;
      },
    };
  };

  RENDER.truth = function (q, ctx) {
    const t = Core.truthRows(q.expr);
    const diagram = Fig.logicDiagram(q.expr, { label: 'Circuito della domanda, con ingressi ' + t.names.join(', ') + ' e uscita Y' });
    const outs = new Array(t.rows.length).fill(null);
    const table = h('table', { class: 'qz-truth' });
    const head = h('tr', null, t.names.map((n) => h('th', { scope: 'col' }, n)), h('th', { scope: 'col', class: 'out' }, 'Y'));
    const body = h('tbody');
    const cells = t.rows.map((row, i) => {
      const label = t.names.map((n) => n + ' = ' + row.inputs[n]).join(', ');
      const seg = h('div', { class: 'qz-seg', role: 'group', 'aria-label': 'Uscita Y per ' + label });
      const b0 = h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => set(i, 0) }, '0');
      const b1 = h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => set(i, 1) }, '1');
      seg.append(b0, b1);
      const tr = h('tr', { onmouseenter: () => showRow(i), onfocusin: () => showRow(i) },
        t.names.map((n) => h('td', { class: 'in v' + row.inputs[n] }, String(row.inputs[n]))), h('td', { class: 'out' }, seg));
      body.append(tr);
      return { tr: tr, b0: b0, b1: b1 };
    });
    let locked = false;
    function set(i, v) {
      if (locked) return;
      outs[i] = v;
      cells[i].b0.setAttribute('aria-pressed', v === 0 ? 'true' : 'false');
      cells[i].b1.setAttribute('aria-pressed', v === 1 ? 'true' : 'false');
      ctx.changed();
      const next = outs.indexOf(null);
      if (next >= 0 && next > i) cells[next].b0.focus({ preventScroll: true });
    }
    // Dopo la risposta, passando sulle righe si vedono i segnali attraversare il circuito.
    function showRow(i) {
      if (!locked) return;
      diagram.update(t.rows[i].inputs);
      cells.forEach((c, j) => c.tr.classList.toggle('lit', i === j));
    }
    table.append(h('thead', null, head), body);
    return {
      el: h('div', { class: 'qz-truth-wrap' }, h('div', { class: 'qz-fig qz-fig-logic' }, diagram.el), table),
      ready: () => outs.every((v) => v != null),
      value: () => outs.slice(),
      focusFirst: () => cells[0].b0.focus({ preventScroll: true }),
      lock() {
        locked = true;
        t.rows.forEach((row, i) => {
          const c = cells[i];
          c.b0.disabled = true;
          c.b1.disabled = true;
          c.tr.classList.add(outs[i] === row.out ? 'right' : 'wrong');
          if (outs[i] !== row.out) c.tr.querySelector('.out').setAttribute('data-want', String(row.out));
        });
        showRow(t.rows.findIndex((row, i) => outs[i] !== row.out) >= 0 ? t.rows.findIndex((row, i) => outs[i] !== row.out) : t.rows.length - 1);
        return table;
      },
    };
  };

  RENDER.logic = function (q, ctx) {
    const diagram = Fig.logicDiagram(q.expr, { label: 'Circuito della domanda' });
    const env = {};
    diagram.names.forEach((n) => { env[n] = 0; });
    let locked = false;
    // Prima della prova si vedono solo gli interruttori: il resto del circuito resta spento.
    function showInputs() {
      diagram.terminals.forEach((t) => {
        const v = env[t.node.input];
        t.el.classList.toggle('on', v === 1);
        t.val.textContent = String(v);
      });
    }
    const switches = diagram.names.map((n) => {
      const b = h('button', {
        type: 'button', class: 'qz-switch', role: 'switch', 'aria-checked': 'false', 'aria-label': 'Ingresso ' + n,
        onclick: () => {
          if (locked) return;
          env[n] = 1 - env[n];
          b.setAttribute('aria-checked', env[n] ? 'true' : 'false');
          b.classList.toggle('on', !!env[n]);
          b.querySelector('.qz-switch-v').textContent = String(env[n]);
          showInputs();
          Sound.tick();
          ctx.changed();
        },
      }, h('span', { class: 'qz-switch-name', 'aria-hidden': 'true' }, n), h('span', { class: 'qz-switch-track', 'aria-hidden': 'true' }, h('i')), h('span', { class: 'qz-switch-v', 'aria-hidden': 'true' }, '0'));
      return b;
    });
    showInputs();
    return {
      el: h('div', { class: 'qz-logic-wrap' }, h('div', { class: 'qz-switches', role: 'group', 'aria-label': 'Interruttori degli ingressi' }, switches), h('div', { class: 'qz-fig qz-fig-logic' }, diagram.el)),
      ready: () => true,
      value: () => Object.assign({}, env),
      confirmLabel: 'Prova il circuito',
      settle: () => Math.round(diagram.steps * 230 + 380),
      focusFirst: () => switches[0].focus({ preventScroll: true }),
      lock() {
        locked = true;
        switches.forEach((b) => { b.disabled = true; });
        const svg = diagram.el;
        svg.classList.add('propagate');
        diagram.update(env);
        return svg;
      },
    };
  };

  /* ---------- una sessione di quiz ---------- */

  const RIGHT = ['Esatto!', 'Giusto!', 'Perfetto!', 'Ben fatto!'];
  const WRONG = ['Non è così.', 'Risposta sbagliata.', 'Non proprio.'];
  let uidSeq = 0;

  // Collegamento al capitolo da rileggere: si apre in un'altra scheda per non perdere il quiz.
  function learnLink(more) {
    return h('a', { class: 'qz-learn', href: more.href, target: '_blank', rel: 'noopener' },
      icon('book'), h('span', null, more.text), h('span', { class: 'qz-sr' }, ' (si apre in una nuova scheda)'));
  }

  function mount(container, options) {
    const o = Object.assign({ mode: 'ripasso', title: 'Quiz', color: 'var(--accent)', seconds: 0, compact: false }, options);
    const rand = o.rand || Math.random;
    const qs = o.questions;
    const n = qs.length;
    const state = { i: 0, results: [], responses: [], streak: 0, bestStreak: 0, points: 0, started: Date.now(), done: false };
    const cleanups = [];
    let current = null;
    let timer = null;

    const live = h('p', { class: 'qz-sr', 'aria-live': 'polite' });
    const tr = trace(n, false);
    const counter = h('span', { class: 'qz-count' });
    const streakEl = h('span', { class: 'qz-streak', hidden: true }, icon('bolt'), h('b'));
    const pointsEl = o.seconds ? h('span', { class: 'qz-points' }, h('b', null, '0'), ' punti') : null;
    const soundBtn = h('button', {
      type: 'button', class: 'qz-iconbtn qz-sound' + (Sound.on ? ' on' : ''), 'aria-pressed': Sound.on ? 'true' : 'false', 'aria-label': 'Suoni', title: 'Suoni',
      onclick: () => {
        Sound.on = !Sound.on;
        soundBtn.classList.toggle('on', Sound.on);
        soundBtn.setAttribute('aria-pressed', Sound.on ? 'true' : 'false');
        if (o.onSound) o.onSound(Sound.on);
        if (Sound.on) Sound.right();
      },
      html: ICON.sound,
    });
    const exitBtn = o.onExit ? h('button', { type: 'button', class: 'qz-iconbtn qz-exit', 'aria-label': 'Esci dal quiz', title: 'Esci', onclick: () => { destroy(); o.onExit(); }, html: ICON.close }) : null;
    const stage = h('div', { class: 'qz-stage' });
    const run = h('section', { class: 'qz-run' + (o.compact ? ' compact' : ''), style: { '--sec': o.color }, 'aria-label': 'Quiz: ' + o.title },
      h('header', { class: 'qz-run-head' },
        h('div', { class: 'qz-run-top' },
          h('div', { class: 'qz-run-title' }, h('span', { class: 'qz-dot', 'aria-hidden': 'true' }), h('strong', null, o.title), o.subtitle ? h('span', { class: 'qz-run-sub' }, o.subtitle) : null),
          h('div', { class: 'qz-run-meta' }, counter, streakEl, pointsEl, soundBtn, exitBtn)),
        h('div', { class: 'qz-tracebox' }, tr.el)),
      stage, live,
      o.compact ? null : h('p', { class: 'qz-keys' }, 'Da tastiera: 1-4 o V/F per rispondere, Invio per confermare e andare avanti.'));
    container.innerHTML = '';
    container.append(run);

    function say(msg) { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 30); }

    function onKey(e) {
      // Un tasto già gestito (l'Invio nel campo numerico) non deve anche far andare avanti.
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || !current || state.done) return;
      const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
      if (e.key === 'Enter') {
        if (current.locked && current.next) { e.preventDefault(); current.next.click(); return; }
        if (!typing && e.target && e.target.tagName === 'BUTTON') return;
        if (!current.locked && current.r.ready && current.r.ready()) { e.preventDefault(); confirm(); }
        return;
      }
      if (typing || current.locked || !current.r.key) return;
      if (current.r.key(e)) e.preventDefault();
    }
    document.addEventListener('keydown', onKey);
    cleanups.push(() => document.removeEventListener('keydown', onKey));

    function levelEl(lv) {
      const name = Core.LEVELS[lv] || '';
      return h('span', { class: 'qz-level', 'data-level': lv, title: 'Livello ' + name.toLowerCase() }, h('span', { class: 'qz-bars', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), name);
    }

    function timerEl(total) {
      const svg = sv('svg', { viewBox: '0 0 40 40', class: 'qz-timer', 'aria-hidden': 'true' }, null);
      sv('circle', { cx: 20, cy: 20, r: 16, class: 'qz-timer-bg' }, svg);
      const arc = sv('circle', { cx: 20, cy: 20, r: 16, class: 'qz-timer-arc', pathLength: 1 }, svg);
      const t = sv('text', { x: 20, y: 24.5, 'text-anchor': 'middle', class: 'qz-timer-t' }, svg);
      t.textContent = String(total);
      const wrapEl = h('span', { class: 'qz-timer-wrap', role: 'timer', 'aria-label': total + ' secondi' }, svg);
      return { el: wrapEl, arc: arc, t: t };
    }

    function show(index) {
      const q = qs[index];
      const uid = ++uidSeq;
      const destroyers = [];
      const ctx = {
        rand: rand,
        uid: uid,
        submit: (r) => { if (!current.locked) finishQuestion(r); },
        changed: () => { if (current && current.confirm) current.confirm.disabled = !current.r.ready(); },
        confirm: () => confirm(),
        live: say,
        onDestroy: (fn) => destroyers.push(fn),
      };
      const r = RENDER[q.type || 'choice'](q, ctx);
      const qid = 'qz-q-' + uid;
      const hint = HINTS[q.type || 'choice'];
      const t = o.seconds ? timerEl(o.seconds) : null;
      const confirmBtn = r.immediate ? null : h('button', { type: 'button', class: 'btn primary qz-confirm', disabled: !r.ready(), onclick: () => confirm() }, r.confirmLabel || 'Conferma');
      const fig = q.figure ? Fig.render(q.figure) : null;
      const card = h('article', { class: 'qz-card qz-type-' + (q.type || 'choice'), 'aria-labelledby': qid },
        h('div', { class: 'qz-card-head' },
          h('span', { class: 'qz-topic' }, q.topic || o.title),
          levelEl(q.level || 2),
          o.sectionOf ? h('span', { class: 'qz-from' }, o.sectionOf(q)) : null,
          t ? t.el : null),
        h('h2', { class: 'qz-q', id: qid, tabindex: '-1' }, h('span', { class: 'qz-qn', 'aria-hidden': 'true' }, String(index + 1)), h('span', null, q.q)),
        hint ? h('p', { class: 'qz-hint' }, hint) : null,
        fig,
        h('div', { class: 'qz-answer' }, r.el),
        confirmBtn ? h('div', { class: 'qz-actions' }, confirmBtn) : null);
      current = { q: q, r: r, card: card, confirm: confirmBtn, locked: false, destroyers: destroyers, t0: performance.now(), timer: t };
      counter.innerHTML = '';
      counter.append('Domanda ', h('b', null, String(index + 1)), ' di ' + n);
      tr.at(index);
      return card;
    }

    function startTimer() {
      if (!o.seconds || !current || !current.timer) return;
      const total = o.seconds * 1000;
      const t0 = performance.now();
      const tm = current.timer;
      const step = (now) => {
        if (!current || current.locked || current.timer !== tm) return;
        const left = Math.max(0, total - (now - t0));
        const k = left / total;
        tm.arc.style.strokeDashoffset = String(1 - k);
        const secs = Math.ceil(left / 1000);
        if (tm.t.textContent !== String(secs)) {
          tm.t.textContent = String(secs);
          tm.el.setAttribute('aria-label', secs + ' secondi');
          if (secs <= 5 && secs > 0) Sound.tick();
        }
        tm.el.classList.toggle('low', k < 0.34);
        tm.el.classList.toggle('crit', k < 0.15);
        if (left <= 0) { finishQuestion(undefined, true); return; }
        timer = requestAnimationFrame(step);
      };
      timer = requestAnimationFrame(step);
    }

    function enter(card, first) {
      stage.append(card);
      const parts = [...card.querySelectorAll('.qz-option, .qz-order-item, .qz-match-item, .qz-bit, .qz-truth tbody tr, .qz-switch')];
      play(card, [{ opacity: 0, transform: 'translateX(28px)' }, { opacity: 1, transform: 'none' }], { duration: first ? MOTION.slow : MOTION.normal });
      parts.slice(0, 8).forEach((el, i) => play(el, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: MOTION.normal, delay: 90 + i * MOTION.stagger, fill: 'backwards' }));
      const fig = card.querySelector('.qz-fig');
      if (fig) fig.classList.add('in');
      const head = card.querySelector('.qz-q');
      head.focus({ preventScroll: true });
      if (!first) {
        const top = run.getBoundingClientRect().top;
        if (top < 0) run.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      }
      startTimer();
    }

    function confirm() {
      if (!current || current.locked || !current.r.ready || !current.r.ready()) return;
      finishQuestion(current.r.value());
    }

    function finishQuestion(response, timeout) {
      const c = current;
      if (!c || c.locked) return;
      c.locked = true;
      if (timer) cancelAnimationFrame(timer);
      const q = c.q;
      const ok = !timeout && Core.check(q, response);
      state.results[state.i] = ok;
      state.responses[state.i] = timeout ? undefined : response;
      if (ok) {
        state.streak++;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        if (o.seconds) {
          const left = Math.max(0, o.seconds * 1000 - (performance.now() - c.t0)) / 1000;
          state.points += 100 + Math.round(50 * left / o.seconds) + (state.streak >= 3 ? 20 : 0);
        } else state.points += 100;
      } else state.streak = 0;
      if (c.confirm) c.confirm.remove();
      const focusEl = c.r.lock(ok, response);
      if (o.onAnswer) o.onAnswer(q, ok);
      const streak = state.streak;
      const index = state.i;
      // Il circuito logico prima fa arrivare il segnale al LED, poi arriva il verdetto.
      const wait = timeout || reduced() || !c.r.settle ? 0 : c.r.settle();
      if (wait) setTimeout(() => { if (current === c) reveal(c, ok, timeout, focusEl, streak, index); }, wait);
      else reveal(c, ok, timeout, focusEl, streak, index);
    }

    function reveal(c, ok, timeout, focusEl, streak, index) {
      const q = c.q;
      tr.mark(index, ok);
      updateStreak();
      if (pointsEl) pointsEl.querySelector('b').textContent = String(state.points);

      const verdictText = timeout ? 'Tempo scaduto.' : ok ? RIGHT[index % RIGHT.length] : WRONG[index % WRONG.length];
      const last = index === n - 1;
      const next = h('button', { type: 'button', class: 'btn primary qz-next', onclick: () => advance() }, last ? 'Vedi il risultato' : 'Avanti', h('span', { 'aria-hidden': 'true' }, ' →'));
      const showRight = !ok && ['number', 'order', 'match', 'bits', 'truth', 'logic'].includes(q.type);
      const more = !ok && o.learn ? o.learn(q) : null;
      const fb = h('div', { class: 'qz-feedback ' + (ok ? 'ok' : 'ko'), role: 'status' },
        h('div', { class: 'qz-verdict' }, icon(ok ? 'check' : 'cross', 'qz-verdict-ic'), h('strong', null, verdictText),
          ok && streak >= 3 ? h('span', { class: 'qz-verdict-streak' }, streak + ' di fila') : null),
        showRight ? h('p', { class: 'qz-right' }, h('span', null, q.type === 'logic' ? 'Una combinazione giusta: ' : 'Risposta giusta: '), h('strong', null, Core.answerText(q))) : null,
        h('p', { class: 'qz-why' }, q.why),
        more ? learnLink(more) : null,
        h('div', { class: 'qz-actions' }, next));
      c.card.append(fb);
      c.next = next;
      play(fb, [{ opacity: 0, transform: 'translateY(14px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: MOTION.normal, easing: MOTION.bounce });
      if (ok) {
        Sound.right();
        if (focusEl) {
          play(focusEl, [{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: MOTION.normal, easing: MOTION.bounce });
          sparksFrom(focusEl, streak >= 3 ? 34 : 20, streak >= 3 ? 1.3 : 1);
        }
      } else {
        Sound.wrong();
        if (focusEl) play(focusEl, [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(2px)' }, { transform: 'none' }], { duration: 420, easing: 'linear' });
      }
      say((timeout ? 'Tempo scaduto. ' : ok ? 'Risposta giusta. ' : 'Risposta sbagliata. ') + (showRight || (!ok && q.type !== 'logic') ? 'La risposta giusta è: ' + Core.answerText(q) + '. ' : '') + q.why);
      setTimeout(() => { if (current === c) next.focus({ preventScroll: true }); fb.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' }); }, reduced() ? 0 : 240);
    }

    function updateStreak() {
      if (state.streak >= 2) {
        streakEl.hidden = false;
        streakEl.querySelector('b').textContent = state.streak + ' di fila';
        play(streakEl, [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: MOTION.normal, easing: MOTION.bounce });
      } else streakEl.hidden = true;
    }

    function advance() {
      const c = current;
      if (!c) return;
      c.destroyers.forEach((fn) => fn());
      state.i++;
      const done = state.i >= n;
      play(c.card, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-28px)' }], { duration: MOTION.fast, easing: MOTION.sharp }).then(() => {
        c.card.remove();
        if (done) finish();
        else enter(show(state.i), false);
      });
    }

    function finish() {
      state.done = true;
      current = null;
      tr.at(n);
      const correct = state.results.filter(Boolean).length;
      const pct = n ? correct / n : 0;
      const result = {
        total: n, correct: correct, pct: pct, points: state.points, bestStreak: state.bestStreak,
        seconds: Math.round((Date.now() - state.started) / 1000), medal: Core.medal(pct * 100),
        wrongIds: qs.filter((q, i) => !state.results[i]).map((q) => q.id),
        rightIds: qs.filter((q, i) => state.results[i]).map((q) => q.id),
        questions: qs, results: state.results.slice(), responses: state.responses.slice(),
      };
      const extra = o.onFinish ? o.onFinish(result) || {} : {};
      renderResult(result, extra);
    }

    function renderResult(res, extra) {
      const g = gauge({ label: 'ESITO' });
      const mins = Math.floor(res.seconds / 60);
      const secs = String(res.seconds % 60).padStart(2, '0');
      const big = trace(n, true);
      big.fill(res.results);
      const title = res.pct === 1 ? 'Perfetto!' : res.pct >= 0.9 ? 'Eccellente!' : res.pct >= 0.75 ? 'Ottimo lavoro!' : res.pct >= 0.5 ? 'Bene, ci sei quasi.' : 'Da ripassare.';
      const review = h('ol', { class: 'qz-review', hidden: true });
      res.questions.forEach((q, i) => {
        const ok = res.results[i];
        const given = describeResponse(q, res.responses[i]);
        review.append(h('li', { class: ok ? 'ok' : 'ko' },
          h('div', { class: 'qz-review-head' }, icon(ok ? 'check' : 'cross'), h('span', { class: 'qz-review-n' }, String(i + 1)), h('strong', null, q.q)),
          h('p', null, h('span', { class: 'qz-review-k' }, 'La tua risposta: '), given == null ? h('em', null, 'nessuna (tempo scaduto)') : given),
          ok ? null : h('p', null, h('span', { class: 'qz-review-k' }, 'Giusta: '), Core.answerText(q)),
          h('p', { class: 'qz-review-why' }, q.why),
          !ok && o.learn && o.learn(q) ? learnLink(o.learn(q)) : null));
      });
      const reviewBtn = h('button', {
        type: 'button', class: 'btn', 'aria-expanded': 'false',
        onclick: () => {
          review.hidden = !review.hidden;
          reviewBtn.setAttribute('aria-expanded', review.hidden ? 'false' : 'true');
          reviewBtn.textContent = review.hidden ? 'Rivedi le risposte' : 'Nascondi le risposte';
          if (!review.hidden) play(review, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: MOTION.normal });
        },
      }, 'Rivedi le risposte');
      const actions = h('div', { class: 'qz-result-actions' },
        o.onRetry ? h('button', { type: 'button', class: 'btn primary', onclick: () => o.onRetry() }, 'Riprova con nuove domande') : null,
        reviewBtn,
        extra.actions || null,
        o.onExit ? h('button', { type: 'button', class: 'btn', onclick: () => { destroy(); o.onExit(); } }, o.exitLabel || 'Torna ai quiz') : null);
      const medal = res.medal ? medalEl(res.medal) : null;
      const box = h('section', { class: 'qz-result', 'aria-labelledby': 'qz-res-title' },
        h('div', { class: 'qz-result-meter' }, g.el, medal),
        h('div', { class: 'qz-result-text' },
          h('p', { class: 'eyebrow' }, 'Risultato · ' + o.title),
          h('h2', { id: 'qz-res-title', tabindex: '-1' }, title),
          h('p', { class: 'qz-result-line' }, h('b', null, res.correct + ' su ' + res.total), ' risposte giuste · serie migliore ' + res.bestStreak + ' · tempo ' + mins + ':' + secs + (o.seconds ? ' · ' + res.points + ' punti' : '')),
          extra.note ? h('p', { class: 'qz-result-note' }, extra.note) : null,
          actions),
        h('div', { class: 'qz-result-trace' }, h('p', { class: 'qz-result-k' }, 'Il tracciato delle tue risposte'), big.el),
        review);
      stage.innerHTML = '';
      stage.append(box);
      run.classList.add('finished');
      play(box, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: MOTION.slow });
      box.querySelector('h2').focus({ preventScroll: true });
      run.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      setTimeout(() => {
        g.set(res.pct, true).then(() => {
          if (medal) {
            medal.classList.add('in');
            if (res.pct >= 0.75) sparksFrom(medal, res.pct === 1 ? 90 : 60, 1.6);
          }
        });
        Sound.finish(res.pct >= 0.5);
      }, reduced() ? 0 : 450);
      say('Risultato: ' + res.correct + ' risposte giuste su ' + res.total + '.' + (res.medal ? ' ' + MEDAL_NAME[res.medal] + '.' : ''));
    }

    function destroy() {
      if (timer) cancelAnimationFrame(timer);
      if (current) current.destroyers.forEach((fn) => fn());
      cleanups.forEach((fn) => fn());
      cleanups.length = 0;
      current = null;
    }

    if (!n) {
      stage.append(h('div', { class: 'qz-empty' }, h('p', null, 'Non ci sono ancora domande per questa scelta.')));
      return { destroy: destroy };
    }
    enter(show(0), true);
    return { destroy: destroy, state: state };
  }

  // Descrive una risposta data, per il riepilogo, senza ricreare l'interfaccia della domanda.
  function describeResponse(q, r) {
    if (r === undefined) return null;
    switch (q.type || 'choice') {
      case 'choice': return q.options[r];
      case 'truefalse': return r ? 'Vero' : 'Falso';
      case 'order': return r.join(' → ');
      case 'match': return q.pairs.map((p) => p[0] + ' → ' + (r[p[0]] || '?')).join(' · ');
      case 'number': return String(r).trim() + (q.unit && !/[a-zµΩ%°]/i.test(String(r)) ? ' ' + q.unit : '');
      case 'bits': return Core.toBinary(r, q.width) + ' (' + r + ')';
      case 'truth': return r.map((v) => (v == null ? '?' : v)).join(' ');
      case 'logic': return Object.keys(r).sort().map((k) => k + ' = ' + r[k]).join(', ');
      default: return String(r);
    }
  }

  // Mini quiz da incorporare in una pagina di sezione (servono core, figure, banche e quiz.css).
  function embed(container, options) {
    const o = Object.assign({ count: 5 }, options);
    const bank = root.QuizBank && root.QuizBank.get(o.section);
    if (!bank) return null;
    let pool = bank.questions;
    if (o.chapter) {
      const only = pool.filter((q) => q.chapter === o.chapter);
      if (only.length) pool = only;
    }
    const start = () => mount(container, {
      questions: Core.pick(pool, o.count, Math.random),
      title: bank.title, color: bank.color || 'var(--accent)', compact: true,
      onRetry: () => start(),
    });
    return start();
  }

  root.QuizEngine = {
    mount: mount,
    embed: embed,
    gauge: gauge,
    trace: trace,
    medal: medalEl,
    sparks: sparks,
    Sound: Sound,
    MOTION: MOTION,
    describe: describeResponse,
  };
})(typeof window !== 'undefined' ? window : globalThis);
