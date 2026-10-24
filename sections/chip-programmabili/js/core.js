/*
 * Sezione 5 · Primi chip programmabili: motore comune della pagina.
 *
 * - costruttori DOM e SVG (CP.h, CP.s);
 * - laboratori (CP.lab): montati quando si avvicinano alla vista, in pausa quando escono;
 * - animazioni (CP.tween, ctx.tick) che rispettano prefers-reduced-motion;
 * - piccolo kit di controlli coerente per tutti i laboratori (CP.ui);
 * - disegno dei chip in package DIP (CP.art.dip) e dei "campioni" nelle testate dei capitoli;
 * - indice dei capitoli con evidenziazione, barra di lettura e progressi.
 *
 * Niente dipendenze e niente build: funziona anche aprendo il file con un doppio clic.
 */
(function (root) {
  'use strict';

  const doc = root.document;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const SLUG = 'chip-programmabili';
  const STORE = 'enciclopedia-' + SLUG + '-fatti';

  doc.documentElement.classList.add('cp-js');

  /* ---------- costruttori ---------- */

  function setAttrs(n, attrs) {
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.setAttribute('class', v);
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const p in v) n.style.setProperty(p.startsWith('--') ? p : p.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), v[p]);
      } else if (k === 'dataset') Object.assign(n.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
  }

  function append(n, children) {
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      n.append(c.nodeType ? c : String(c));
    }
  }

  /** Elemento HTML: h('button', { class: 'cp-btn', onclick: fn }, 'Testo'). */
  function h(tag, attrs, ...children) {
    const n = doc.createElement(tag);
    setAttrs(n, attrs);
    append(n, children);
    return n;
  }

  /** Elemento SVG: s('rect', { x: 0, y: 0, width: 10, height: 10 }). */
  function s(tag, attrs, ...children) {
    const n = doc.createElementNS(SVGNS, tag);
    setAttrs(n, attrs);
    append(n, children);
    return n;
  }

  /* ---------- movimento ---------- */

  const mq = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(mq && mq.matches); }

  // Curva di Bézier cubica come in CSS (risolta con Newton e bisezione).
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 6; i++) {
        const e = sx(t) - x;
        const d = dx(t);
        if (Math.abs(e) < 1e-5) return sy(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      let lo = 0, hi = 1;
      t = x;
      for (let i = 0; i < 24; i++) {
        const v = sx(t);
        if (Math.abs(v - x) < 1e-5) break;
        if (v < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return sy(t);
    };
  }

  // Stessi valori delle skill ECC motion-foundations, in millisecondi.
  const dur = { instant: 80, fast: 180, normal: 350, slow: 600, crawl: 1000 };
  const ease = {
    linear: (t) => t,
    smooth: bezier(0.22, 1, 0.36, 1),
    sharp: bezier(0.4, 0, 0.2, 1),
    bounce: bezier(0.34, 1.56, 0.64, 1),
    inOut: bezier(0.65, 0, 0.35, 1),
  };

  // Un solo requestAnimationFrame per tutta la pagina: gira solo se qualcuno lo usa.
  const frames = new Set();
  let rafId = 0;
  let lastT = 0;
  function loop(t) {
    const dt = Math.min(64, Math.max(0, t - lastT));
    lastT = t;
    for (const fn of Array.from(frames)) {
      try { fn(dt, t); } catch (e) { frames.delete(fn); console.error(e); }
    }
    rafId = frames.size ? root.requestAnimationFrame(loop) : 0;
  }
  function onFrame(fn) {
    frames.add(fn);
    if (!rafId) {
      lastT = root.performance.now();
      rafId = root.requestAnimationFrame(loop);
    }
    return () => frames.delete(fn);
  }

  function lerpValue(a, b, p) {
    if (Array.isArray(a)) return a.map((x, i) => x + (b[i] - x) * p);
    return a + (b - a) * p;
  }

  /**
   * Interpola un valore (numero o array di numeri) nel tempo.
   * opzioni: { from, to, duration, delay, ease, onUpdate(valore, progresso), onDone() }
   * Con movimento ridotto salta subito al valore finale.
   * Restituisce { cancel(), finished } dove finished è una Promise (true se completata).
   */
  function tween(o) {
    o = o || {};
    const from = o.from == null ? 0 : o.from;
    const to = o.to == null ? 1 : o.to;
    const D = o.duration == null ? dur.normal : o.duration;
    const E = typeof o.ease === 'function' ? o.ease : (ease[o.ease] || ease.smooth);
    let off = null;
    let settled = false;
    let resolve;
    const finished = new Promise((r) => { resolve = r; });
    function settle(ok) {
      if (settled) return;
      settled = true;
      if (off) off();
      if (ok) {
        if (o.onUpdate) o.onUpdate(lerpValue(from, to, 1), 1);
        if (o.onDone) o.onDone();
      }
      resolve(ok);
    }
    if (reduced() || D <= 0) {
      settle(true);
    } else {
      let el = -(o.delay || 0);
      off = onFrame((dt) => {
        el += dt;
        if (el < 0) return;
        const p = Math.min(1, el / D);
        if (p >= 1) { settle(true); return; }
        if (o.onUpdate) o.onUpdate(lerpValue(from, to, E(p)), p);
      });
    }
    return { cancel() { settle(false); }, finished: finished };
  }

  /** Attende ms millisecondi (subito con movimento ridotto se opts.motion è true). */
  function wait(ms, opts) {
    if (opts && opts.motion && reduced()) return Promise.resolve();
    return new Promise((r) => root.setTimeout(r, ms));
  }

  /* ---------- formati ---------- */

  const fmt = {
    /** 2300 → "2.300", 0.74 → "0,74", 0.5, 2 → "0,50". Raggruppa anche le migliaia a 4 cifre,
     *  come nei testi: Intl con 'it-IT' scriverebbe "2300" ma "10.000". */
    num(n, digits) {
      if (typeof n !== 'number' || !isFinite(n)) return String(n);
      const abs = Math.abs(n);
      const txt = digits == null ? String(Math.round(abs * 1000) / 1000) : abs.toFixed(digits);
      const [int, dec] = txt.split('.');
      return (n < 0 && Number(txt) !== 0 ? '-' : '') + int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + dec : '');
    },
    /** 10, 2 → "0A" */
    hex(n, digits) { return (n >>> 0).toString(16).toUpperCase().padStart(digits || 2, '0'); },
    /** 5, 4 → "0101" */
    bin(n, bits) { return (n >>> 0).toString(2).padStart(bits || 8, '0').slice(-(bits || 8)); },
  };

  /* ---------- piccola memoria locale (solo comodità) ---------- */

  const store = {
    get(key, fallback) {
      try {
        const v = root.localStorage.getItem('cp-' + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { root.localStorage.setItem('cp-' + key, JSON.stringify(value)); } catch (e) { /* non disponibile */ }
    },
  };

  /* ---------- kit di controlli per i laboratori ---------- */

  const ui = {
    /** Pulsante: { label, icon, title, primary, onClick, className } */
    button(o) {
      const b = h('button', {
        type: 'button',
        class: 'cp-btn' + (o.primary ? ' primary' : '') + (o.className ? ' ' + o.className : ''),
        title: o.title || null,
        'aria-label': (!o.label && o.title) ? o.title : (o.ariaLabel || null),
        onclick: o.onClick || null,
      }, o.icon ? h('span', { class: 'cp-ico', 'aria-hidden': 'true' }, o.icon) : null, o.label ? h('span', null, o.label) : null);
      return b;
    },

    /**
     * Gruppo di scelte esclusive: { label, options: [{ value, label, title }], value, onChange }.
     * L'elemento restituito ha .value e .set(valore).
     */
    seg(o) {
      const wrap = h('div', { class: 'cp-seg', role: 'group', 'aria-label': o.label || null });
      let value = o.value;
      const buttons = o.options.map((opt) => h('button', {
        type: 'button',
        title: opt.title || null,
        'aria-pressed': String(opt.value === value),
        onclick: () => {
          if (opt.value === value) return;
          set(opt.value);
          if (o.onChange) o.onChange(opt.value);
        },
      }, opt.label));
      function set(v) {
        value = v;
        o.options.forEach((opt, i) => buttons[i].setAttribute('aria-pressed', String(opt.value === v)));
      }
      append(wrap, buttons);
      wrap.set = set;
      Object.defineProperty(wrap, 'value', { get: () => value });
      return wrap;
    },

    /** Cursore: { label, min, max, step, value, format(v), onInput(v) }. L'elemento ha .input e .set(v). */
    range(o) {
      const out = h('output', null);
      const input = h('input', { type: 'range', min: o.min, max: o.max, step: o.step || 1, value: o.value, 'aria-label': o.label });
      const show = () => { out.textContent = o.format ? o.format(+input.value) : input.value; };
      input.addEventListener('input', () => { show(); if (o.onInput) o.onInput(+input.value); });
      show();
      const el = h('label', { class: 'cp-range' }, h('span', null, o.label), input, out);
      el.input = input;
      el.set = (v) => { input.value = v; show(); };
      return el;
    },

    /** Interruttore: { label, checked, onChange(bool) }. L'elemento ha .checked e .set(bool). */
    toggle(o) {
      let on = !!o.checked;
      const b = h('button', { type: 'button', class: 'cp-switch', role: 'switch', 'aria-checked': String(on) },
        h('span', { class: 'cp-switch-track', 'aria-hidden': 'true' }, h('span', { class: 'cp-switch-knob' })),
        h('span', null, o.label));
      b.addEventListener('click', () => { b.set(!on); if (o.onChange) o.onChange(on); });
      b.set = (v) => { on = !!v; b.setAttribute('aria-checked', String(on)); };
      Object.defineProperty(b, 'checked', { get: () => on });
      return b;
    },

    /** Indicatore numerico: ui.readout('PC', '000'). L'elemento ha .set(valore). */
    readout(label, value) {
      const v = h('span', { class: 'v' }, value == null ? '' : String(value));
      const el = h('div', { class: 'cp-readout' }, h('span', { class: 'k' }, label), v);
      el.set = (x) => {
        const t = String(x);
        if (v.textContent === t) return;
        v.textContent = t;
        // breve bagliore sul valore cambiato (Web Animations: nessun ricalcolo forzato del layout)
        if (!reduced() && el.animate) {
          el.animate([
            { boxShadow: 'inset 0 0 0 1px rgba(240,176,74,.9), 0 0 14px rgba(240,176,74,.35)' },
            { boxShadow: 'inset 0 0 0 1px rgba(240,176,74,0), 0 0 0 rgba(240,176,74,0)' },
          ], { duration: dur.slow, easing: 'ease-out' });
        }
      };
      return el;
    },

    /** Barra degli strumenti. */
    bar(...children) { return h('div', { class: 'cp-bar' }, ...children); },

    /** Legenda: ui.legend([['Indirizzi', 'var(--sig-addr)'], ['Dati', 'var(--sig-data)']]) */
    legend(items) {
      return h('div', { class: 'cp-legend' }, items.map(([label, color]) => h('span', null, h('i', { style: { '--c': color }, 'aria-hidden': 'true' }), label)));
    },
  };

  /* ---------- disegno dei chip (package DIP visto dall'alto) ---------- */

  let defsReady = false;
  function ensureDefs() {
    if (defsReady || !doc.body) return;
    defsReady = true;
    // Gradienti condivisi da tutte le illustrazioni (niente display:none, altrimenti alcuni browser non li disegnano).
    const svg = s('svg', { class: 'cp-defs', 'aria-hidden': 'true', focusable: 'false', width: 0, height: 0 },
      s('defs', null,
        s('linearGradient', { id: 'cp-g-tin', x1: 0, y1: 0, x2: 1, y2: 0 },
          s('stop', { offset: '0', 'stop-color': '#8d949b' }), s('stop', { offset: '.45', 'stop-color': '#e3e7ea' }), s('stop', { offset: '1', 'stop-color': '#7b8288' })),
        s('linearGradient', { id: 'cp-g-gold', x1: 0, y1: 0, x2: 1, y2: 0 },
          s('stop', { offset: '0', 'stop-color': '#9c7426' }), s('stop', { offset: '.45', 'stop-color': '#f3d68a' }), s('stop', { offset: '1', 'stop-color': '#94701f' })),
        s('linearGradient', { id: 'cp-g-plastic', x1: 0, y1: 0, x2: 0, y2: 1 },
          s('stop', { offset: '0', 'stop-color': '#34383d' }), s('stop', { offset: '1', 'stop-color': '#17191c' })),
        s('linearGradient', { id: 'cp-g-ceramic', x1: 0, y1: 0, x2: 0, y2: 1 },
          s('stop', { offset: '0', 'stop-color': '#f6f2e8' }), s('stop', { offset: '1', 'stop-color': '#d9d1bf' })),
        s('linearGradient', { id: 'cp-g-violet', x1: 0, y1: 0, x2: 0, y2: 1 },
          s('stop', { offset: '0', 'stop-color': '#5d566a' }), s('stop', { offset: '1', 'stop-color': '#35303f' })),
        s('linearGradient', { id: 'cp-g-lid', x1: 0, y1: 0, x2: 1, y2: 1 },
          s('stop', { offset: '0', 'stop-color': '#f1d483' }), s('stop', { offset: '.5', 'stop-color': '#c9a043' }), s('stop', { offset: '1', 'stop-color': '#a37b2c' })),
        s('radialGradient', { id: 'cp-g-glass', cx: '.35', cy: '.3', r: '.8' },
          s('stop', { offset: '0', 'stop-color': '#c9dcea', 'stop-opacity': '.95' }), s('stop', { offset: '.6', 'stop-color': '#5f7891', 'stop-opacity': '.9' }), s('stop', { offset: '1', 'stop-color': '#2c3a48' })),
        s('linearGradient', { id: 'cp-g-die', x1: 0, y1: 0, x2: 1, y2: 1 },
          s('stop', { offset: '0', 'stop-color': '#b9a35f' }), s('stop', { offset: '.5', 'stop-color': '#7d8a5a' }), s('stop', { offset: '1', 'stop-color': '#5b6f73' }))));
    doc.body.prepend(svg);
  }

  /**
   * Package DIP visto dall'alto, con la tacca a sinistra (piedino 1 in basso a sinistra).
   * opzioni:
   *   pins: numero di piedini (pari), label: sigla grande ("C4004"), top: riga sopra ("intel"),
   *   bottom: riga sotto ("© 1971"), body: 'plastic' | 'ceramic' | 'violet',
   *   lid: coperchio dorato (bool), window: finestra di quarzo delle EPROM (bool),
   *   wide: corpo largo 0,6" (di default dai 24 piedini in su), title: testo alternativo,
   *   pinNames: array opzionale di nomi (indice 0 = piedino 1) mostrati nel tooltip,
   *   legible: scritte più grandi sui chip lunghi (attivo di default per gli elementi data-dip).
   * Restituisce un <svg> già pronto; con opts.group: true restituisce un <g> da inserire in un altro svg
   * (dimensioni in g.size = { w, h }).
   */
  function dip(o) {
    ensureDefs();
    o = Object.assign({ pins: 16, label: '', top: '', bottom: '', body: 'plastic', lid: false, window: false, wide: null, title: '' }, o || {});
    const n = Math.max(2, Math.round(o.pins / 2));
    const wide = o.wide == null ? o.pins >= 24 : o.wide;
    const P = 10;
    const L = n * P + 6;
    const W = wide ? 54 : 28;
    const PL = 7;
    const gold = o.body !== 'plastic';
    const g = s('g', { class: 'cp-dip cp-dip-' + o.body });

    for (let i = 0; i < n; i++) {
      const x = 3 + i * P + P / 2 - 2.3;
      const pinBottom = i + 1;
      const pinTop = o.pins - i;
      const fill = gold ? 'url(#cp-g-gold)' : 'url(#cp-g-tin)';
      const pb = s('rect', { x: x, y: W - 1, width: 4.6, height: PL + 1, rx: 0.9, fill: fill, class: 'cp-dip-pin', 'data-pin': pinBottom });
      const pt = s('rect', { x: x, y: -PL, width: 4.6, height: PL + 1, rx: 0.9, fill: fill, class: 'cp-dip-pin', 'data-pin': pinTop });
      if (o.pinNames) {
        pb.append(s('title', null, pinBottom + ' · ' + (o.pinNames[pinBottom - 1] || '')));
        pt.append(s('title', null, pinTop + ' · ' + (o.pinNames[pinTop - 1] || '')));
      }
      g.append(pb, pt);
    }

    const bodyFill = { plastic: 'url(#cp-g-plastic)', ceramic: 'url(#cp-g-ceramic)', violet: 'url(#cp-g-violet)' }[o.body] || 'url(#cp-g-plastic)';
    g.append(s('rect', { x: 0, y: 0, width: L, height: W, rx: 2.2, fill: bodyFill, class: 'cp-dip-body' }));
    // riflesso superiore
    g.append(s('rect', { x: 1.2, y: 1, width: L - 2.4, height: W * 0.18, rx: 1.4, fill: '#ffffff', opacity: o.body === 'ceramic' ? 0.35 : 0.06 }));
    // tacca e pallino del piedino 1
    g.append(s('path', { d: 'M0 ' + (W / 2 - 4.2) + ' a4.2 4.2 0 0 1 0 8.4 Z', class: 'cp-dip-notch' }));
    g.append(s('circle', { cx: 6.2, cy: W - 6, r: 1.7, class: 'cp-dip-dot' }));

    const ink = o.body === 'ceramic' ? '#2b2925' : '#d8dde2';
    let textX = L / 2;
    let avail = L - 10; // spazio in lunghezza per le scritte
    if (o.lid) {
      const lw = Math.min(L * 0.42, W * 1.25);
      const lh = W * 0.62;
      g.append(s('rect', { x: L / 2 - lw / 2, y: W / 2 - lh / 2, width: lw, height: lh, rx: 1.6, fill: 'url(#cp-g-lid)', class: 'cp-dip-lid' }));
      g.append(s('rect', { x: L / 2 - lw / 2 + 1.4, y: W / 2 - lh / 2 + 1.4, width: lw - 2.8, height: lh - 2.8, rx: 1, fill: 'none', stroke: '#fff3c4', 'stroke-opacity': 0.5, 'stroke-width': 0.6 }));
      textX = L / 2 + lw / 2 + (L / 2 - lw / 2) / 2;
      avail = L / 2 - lw / 2 - 6;
    }
    if (o.window) {
      const r = W * 0.27;
      const cx = L / 2;
      const cy = W / 2;
      g.append(s('circle', { cx: cx, cy: cy, r: r + 1.6, fill: '#b9b2a3', opacity: 0.85 }));
      g.append(s('circle', { cx: cx, cy: cy, r: r, fill: 'url(#cp-g-glass)', class: 'cp-dip-window' }));
      const d = r * 0.95;
      g.append(s('rect', { x: cx - d / 2, y: cy - d / 2.6, width: d, height: d / 1.3, fill: 'url(#cp-g-die)', opacity: 0.95, class: 'cp-dip-die' }));
      for (let k = 1; k < 4; k++) {
        g.append(s('line', { x1: cx - d / 2 + (d * k) / 4, y1: cy - d / 2.6, x2: cx - d / 2 + (d * k) / 4, y2: cy + d / 2.6, stroke: '#2a3528', 'stroke-width': 0.35, opacity: 0.7 }));
      }
      g.append(s('ellipse', { cx: cx - r * 0.35, cy: cy - r * 0.4, rx: r * 0.32, ry: r * 0.16, fill: '#fff', opacity: 0.45, transform: 'rotate(-30 ' + (cx - r * 0.35) + ' ' + (cy - r * 0.4) + ')' }));
      textX = cx + r + (L - cx - r) / 2;
      avail = L - cx - r - 7;
    }

    // scritte centrate in verticale: produttore, sigla, riga piccola.
    // Con legible (campioni e cassetto, disegnati a larghezza fissa) crescono con la lunghezza del chip,
    // così la sigla resta leggibile anche su un 40 o un 64 piedini.
    const k = o.legible ? Math.min(Math.max(1, L / (o.window ? 140 : 100)), wide ? 2.4 : 1.3) : 1;
    const big = (wide ? 9.5 : 7.4) * k;
    const small = (wide ? 5.6 : 4.6) * k;
    // ogni riga si rimpicciolisce se non sta nello spazio libero (caratteri monospaziati, ~0,64 em)
    const fit = (size, t) => Math.min(size, avail / (String(t).length * 0.64));
    const lines = [];
    if (o.top) lines.push({ t: o.top, size: fit(small, o.top), cls: 'cp-dip-maker', op: 0.85 });
    if (o.label) lines.push({ t: o.label, size: fit(big, o.label), cls: 'cp-dip-label', op: 1 });
    if (o.bottom) lines.push({ t: o.bottom, size: fit(small * 0.9, o.bottom), cls: 'cp-dip-sub', op: 0.7 });
    const gap = wide ? 2.2 : 1.4;
    let y = W / 2 - (lines.reduce((a, l) => a + l.size, 0) + gap * (lines.length - 1)) / 2;
    lines.forEach((l) => {
      y += l.size;
      g.append(s('text', { x: textX, y: y - l.size * 0.14, 'text-anchor': 'middle', 'font-size': l.size, fill: ink, opacity: l.op, class: l.cls }, l.t));
      y += gap;
    });

    const size = { w: L, h: W + PL * 2 };
    if (o.group) {
      g.size = size;
      g.setAttribute('transform', 'translate(0 ' + PL + ')');
      const outer = s('g', null, g);
      outer.size = size;
      return outer;
    }
    const svg = s('svg', {
      viewBox: (-2) + ' ' + (-PL - 2) + ' ' + (L + 4) + ' ' + (W + PL * 2 + 4),
      class: 'cp-dip-svg',
      role: 'img',
      'aria-label': o.title || ('Chip ' + (o.label || '') + ' in package DIP a ' + o.pins + ' piedini'),
    }, g);
    return svg;
  }

  const art = { dip: dip };

  /* ---------- laboratori ---------- */

  const defs = Object.create(null);
  const labs = [];
  let booted = false;
  let nearObs = null;
  let visObs = null;

  /**
   * Registra un laboratorio.
   * CP.lab('cpu', function (mount, ctx) { ... });
   *   mount: elemento .cp-lab-mount in cui costruire il laboratorio (già svuotato);
   *   ctx: vedi makeCtx(). Il valore restituito non è usato.
   */
  function lab(name, mountFn) {
    defs[name] = mountFn;
    if (booted) labs.forEach((rec) => { if (rec.name === name && rec.near && !rec.mounted) mountLab(rec); });
  }

  function makeCtx(rec) {
    const ticks = new Set();
    const listeners = [];
    const live = h('p', { class: 'cp-sr', 'aria-live': 'polite' });
    rec.root.append(live);
    const ctx = {
      root: rec.root,
      name: rec.name,
      chapter: rec.chapter,
      get reduced() { return reduced(); },
      get visible() { return rec.visible; },
      /** fn(dt, t) a ogni fotogramma, solo mentre il laboratorio è visibile. Restituisce la funzione per fermarlo. */
      tick(fn) {
        const t = { fn: fn, off: null };
        ticks.add(t);
        if (rec.visible) t.off = onFrame(fn);
        return () => { if (t.off) t.off(); ticks.delete(t); };
      },
      /** fn() ogni ms millisecondi di tempo visibile (si ferma fuori vista). */
      every(ms, fn) {
        let acc = 0;
        return ctx.tick((dt) => {
          acc += dt;
          if (acc >= ms) { acc %= ms; fn(); }
        });
      },
      tween: tween,
      wait: wait,
      /** Annuncio per i lettori di schermo (regione aria-live del laboratorio). */
      say(text) {
        live.textContent = '';
        root.setTimeout(() => { live.textContent = text; }, 30);
      },
      /** Chiamala quando chi impara ha raggiunto l'obiettivo del laboratorio. */
      done() {
        if (rec.root.classList.contains('is-done')) return;
        rec.root.classList.add('is-done');
        progress.mark(rec.chapter);
      },
      /** fn(visibile) quando il laboratorio entra o esce dalla vista. */
      onVisible(fn) { listeners.push(fn); },
    };
    rec.setVisible = (v) => {
      if (rec.visible === v) return;
      rec.visible = v;
      ticks.forEach((t) => {
        if (v && !t.off) t.off = onFrame(t.fn);
        if (!v && t.off) { t.off(); t.off = null; }
      });
      listeners.forEach((fn) => { try { fn(v); } catch (e) { console.error(e); } });
    };
    return ctx;
  }

  function mountLab(rec) {
    const fn = defs[rec.name];
    if (!fn || rec.mounted) return;
    rec.mounted = true;
    const mount = rec.root.querySelector('.cp-lab-mount') || rec.root.appendChild(h('div', { class: 'cp-lab-mount' }));
    mount.innerHTML = '';
    const ctx = makeCtx(rec);
    try {
      fn(mount, ctx);
      rec.root.classList.add('is-ready');
    } catch (e) {
      console.error('Laboratorio "' + rec.name + '":', e);
      mount.innerHTML = '';
      mount.append(h('p', { class: 'cp-lab-fallback is-error' }, 'Questo laboratorio non è riuscito a partire. Ricarica la pagina; se il problema resta, prova con un altro browser.'));
    }
    if (rec.pendingVisible) rec.setVisible(true);
  }

  function bootLabs() {
    doc.querySelectorAll('.cp-lab[data-lab]').forEach((el) => {
      const chapterEl = el.closest('.cp-chapter');
      labs.push({ root: el, name: el.dataset.lab, chapter: chapterEl ? chapterEl.id : null, mounted: false, near: false, visible: false, pendingVisible: false });
    });
    if (!('IntersectionObserver' in root)) {
      labs.forEach((rec) => { rec.near = true; mountLab(rec); if (rec.setVisible) rec.setVisible(true); });
      return;
    }
    const byEl = new Map(labs.map((r) => [r.root, r]));
    nearObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const rec = byEl.get(e.target);
        rec.near = true;
        nearObs.unobserve(e.target);
        mountLab(rec);
      });
    }, { rootMargin: '600px 0px' });
    visObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const rec = byEl.get(e.target);
        if (rec.setVisible) rec.setVisible(e.isIntersecting);
        else rec.pendingVisible = e.isIntersecting;
      });
    }, { threshold: 0 });
    labs.forEach((rec) => { nearObs.observe(rec.root); visObs.observe(rec.root); });
  }

  /* ---------- progressi ---------- */

  const progress = {
    chapters() { return Array.from(doc.querySelectorAll('.cp-chapter[id]')).map((c) => c.id); },
    done() {
      try { return new Set(JSON.parse(root.localStorage.getItem(STORE) || '[]')); } catch (e) { return new Set(); }
    },
    mark(id) {
      if (!id) return;
      const d = progress.done();
      d.add(id);
      try { root.localStorage.setItem(STORE, JSON.stringify(Array.from(d))); } catch (e) { /* non disponibile */ }
      progress.render();
    },
    render() {
      const d = progress.done();
      const all = progress.chapters();
      const fatti = all.filter((id) => d.has(id)).length;
      doc.querySelectorAll('.cp-toc a[data-cap]').forEach((a) => {
        const ok = d.has(a.dataset.cap);
        a.classList.toggle('is-done', ok);
        const sr = a.querySelector('.cp-sr');
        if (sr) sr.textContent = ok ? ' (laboratorio completato)' : '';
      });
      doc.querySelectorAll('.cp-lab[data-lab]').forEach((el) => {
        const c = el.closest('.cp-chapter');
        if (c && d.has(c.id)) el.classList.add('is-done');
      });
      const counter = doc.getElementById('cp-fatti');
      if (counter) counter.textContent = fatti + '/' + all.length;
      if (root.Enciclopedia && typeof root.Enciclopedia.progresso === 'function') {
        try { root.Enciclopedia.progresso(SLUG, fatti, all.length); } catch (e) { /* hub non disponibile */ }
      }
    },
  };

  /* ---------- pagina: indice, barra di lettura, comparse, campioni ---------- */

  function bootToc() {
    const links = Array.from(doc.querySelectorAll('.cp-toc a[data-cap]'));
    if (!links.length) return;
    const byId = new Map(links.map((a) => [a.dataset.cap, a]));
    let current = null;
    function setCurrent(id) {
      if (id === current) return;
      current = id;
      links.forEach((a) => {
        if (a.dataset.cap === id) {
          a.setAttribute('aria-current', 'location');
          const list = a.closest('ol');
          if (list && list.scrollWidth > list.clientWidth) {
            const left = a.offsetLeft - list.clientWidth / 2 + a.offsetWidth / 2;
            list.scrollTo({ left: left, behavior: reduced() ? 'auto' : 'smooth' });
          }
        } else a.removeAttribute('aria-current');
      });
    }
    if ('IntersectionObserver' in root) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting && byId.has(e.target.id)) setCurrent(e.target.id); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      doc.querySelectorAll('.cp-chapter[id]').forEach((c) => io.observe(c));
    }
  }

  function bootReadingBar() {
    const bar = doc.getElementById('cp-read-bar');
    const topbar = doc.querySelector('.topbar');
    const page = doc.querySelector('.cp');
    let queued = false;
    function measure() {
      queued = false;
      if (topbar && page) page.style.setProperty('--stick', topbar.offsetHeight + 'px');
      if (bar) {
        const max = doc.documentElement.scrollHeight - root.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, root.scrollY / max)) : 0;
        bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      }
    }
    const queue = () => { if (!queued) { queued = true; root.requestAnimationFrame(measure); } };
    root.addEventListener('scroll', queue, { passive: true });
    root.addEventListener('resize', queue);
    measure();
  }

  function bootReveal() {
    const items = doc.querySelectorAll('.cp-reveal, .cp-specimen');
    if (!('IntersectionObserver' in root) || reduced()) {
      items.forEach((i) => i.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach((i) => io.observe(i));
  }

  function bootSpecimens() {
    doc.querySelectorAll('[data-dip]').forEach((el) => {
      let o;
      try { o = JSON.parse(el.dataset.dip); } catch (e) { console.error('data-dip non valido', el); return; }
      el.prepend(dip(Object.assign({ legible: true }, o)));
    });
  }

  function boot() {
    if (booted) return;
    booted = true;
    ensureDefs();
    bootSpecimens();
    bootReveal();
    bootToc();
    bootReadingBar();
    progress.render();
    bootLabs();
  }

  root.CP = {
    h: h,
    s: s,
    reduced: reduced,
    tween: tween,
    wait: wait,
    ease: ease,
    dur: dur,
    bezier: bezier,
    onFrame: onFrame,
    fmt: fmt,
    store: store,
    ui: ui,
    art: art,
    lab: lab,
    progress: progress,
    boot: boot,
  };

  // I laboratori si registrano con CP.lab() nei file caricati dopo questo:
  // la pagina parte quando il documento è pronto.
  // (window.CP_MANUAL_BOOT = true prima di questo file per avviarla a mano con CP.boot(), come fa l'anteprima)
  if (!root.CP_MANUAL_BOOT) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
    else root.setTimeout(boot, 0);
  }
})(window);
