/*
 * Porte logiche e chip · nucleo comune della sezione.
 * Aiutanti DOM e SVG, movimento, ciclo di vita delle viste, registro dei capitoli,
 * glossario e componenti dell'interfaccia (laboratori, figure, schede, linee del tempo).
 * Nessun accesso al DOM al caricamento: il file si può valutare anche nei test con Node.
 */
(function (root) {
  'use strict';

  const PL = root.PL = root.PL || {};
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* ---------- DOM ---------- */

  function applyAttrs(n, attrs, isSvg) {
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') {
        if (isSvg) n.setAttribute('class', v); else n.className = v;
      } else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const p in v) {
          if (p.startsWith('--')) n.style.setProperty(p, v[p]);
          else n.style[p] = v[p];
        }
      } else if (k === 'dataset') Object.assign(n.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
  }

  function append(n, children) {
    for (const c of children) {
      if (c == null || c === false) continue;
      if (Array.isArray(c)) append(n, c);
      else n.append(c.nodeType ? c : String(c));
    }
  }

  /** Crea un elemento HTML: h('p', { class: 'x' }, 'testo', altroNodo). */
  function h(tag, attrs, ...children) {
    const n = document.createElement(tag);
    applyAttrs(n, attrs, false);
    append(n, children);
    return n;
  }

  /** Crea un elemento SVG: s('circle', { cx: 4, cy: 4, r: 2 }). */
  function s(tag, attrs, ...children) {
    const n = document.createElementNS(SVG_NS, tag);
    applyAttrs(n, attrs, true);
    append(n, children);
    return n;
  }

  /** Trasforma una stringa HTML fidata (scritta da noi) in un frammento. */
  function frag(html) {
    const t = document.createElement('template');
    t.innerHTML = html;
    return t.content;
  }

  /** Crea un <svg> pronto per le illustrazioni: si adatta alla larghezza del contenitore. */
  function svg(viewBox, attrs, ...children) {
    return s('svg', Object.assign({ viewBox, class: 'pl-svg', xmlns: SVG_NS }, attrs || {}), ...children);
  }

  let uidCounter = 0;
  function uid(prefix) { uidCounter += 1; return (prefix || 'pl') + '-' + uidCounter; }

  const $ = (sel, rootEl) => (rootEl || document).querySelector(sel);
  const $$ = (sel, rootEl) => Array.from((rootEl || document).querySelectorAll(sel));

  /** Numeri all'italiana: 17468 → "17.468", 1414 → "1.414", 0.5 → "0,5". */
  function fmt(n, decimals) {
    const d = decimals == null ? (Number.isInteger(n) ? 0 : 1) : decimals;
    // 'always': il punto anche nei numeri di quattro cifre, come nei testi (senza, it-IT scrive 1414)
    return Number(n).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });
  }

  Object.assign(PL, { h, s, svg, frag, uid, $, $$, fmt, SVG_NS });

  /* ---------- ciclo di vita della vista ---------- */
  // Ogni timer, ciclo di animazione o ascoltatore globale creato con questi aiutanti
  // viene fermato quando si cambia pagina (PL.cleanup è chiamato dal router).

  let cleanups = [];

  function onCleanup(fn) { cleanups.push(fn); return fn; }

  function cleanup() {
    const list = cleanups;
    cleanups = [];
    for (const fn of list) {
      try { fn(); } catch (e) { console.error(e); }
    }
  }

  function listen(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    onCleanup(() => target.removeEventListener(type, fn, opts));
    return fn;
  }

  function timeout(fn, ms) {
    const id = setTimeout(fn, ms);
    onCleanup(() => clearTimeout(id));
    return id;
  }

  function interval(fn, ms) {
    const id = setInterval(fn, ms);
    onCleanup(() => clearInterval(id));
    return id;
  }

  /** Chiama cb la prima volta (o ogni volta) che l'elemento entra nello schermo. */
  function onVisible(el, cb, opts) {
    const o = Object.assign({ once: true, threshold: 0.15, rootMargin: '0px 0px -5% 0px' }, opts || {});
    if (typeof IntersectionObserver === 'undefined') { cb(true); return () => {}; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (o.once) {
          if (e.isIntersecting) { io.disconnect(); cb(true); }
        } else cb(e.isIntersecting);
      }
    }, { threshold: o.threshold, rootMargin: o.rootMargin });
    io.observe(el);
    const stop = () => io.disconnect();
    onCleanup(stop);
    return stop;
  }

  Object.assign(PL, { onCleanup, cleanup, listen, timeout, interval, onVisible });

  /* ---------- movimento ---------- */
  // Durate e curve uniche per tutta la sezione (ispirate ai token di motion-foundations).

  const ease = {
    linear: (t) => t,
    smooth: (t) => 1 - Math.pow(1 - t, 4),
    out: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: (t) => { const c1 = 1.4; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };

  const motion = { instant: 80, fast: 180, normal: 350, slow: 600, crawl: 1000, ease };

  function reduced() {
    return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Interpola un valore nel tempo. Con "riduci movimento" salta subito alla fine.
   * PL.tween({ from: 0, to: 1, duration: 600, ease: PL.motion.ease.smooth, onUpdate: (v) => {}, onDone })
   */
  function tween(o) {
    const from = o.from == null ? 0 : o.from;
    const to = o.to == null ? 1 : o.to;
    const duration = o.duration == null ? motion.normal : o.duration;
    const fn = o.ease || ease.smooth;
    let raf = 0;
    let cancelled = false;
    const finish = () => { if (o.onUpdate) o.onUpdate(to, 1); if (o.onDone) o.onDone(); };
    if (reduced() || duration <= 0) {
      finish();
      return { cancel() {} };
    }
    let start = 0;
    const step = (now) => {
      if (cancelled) return;
      if (!start) start = now + (o.delay || 0);
      const p = Math.min(1, Math.max(0, (now - start) / duration));
      if (o.onUpdate) o.onUpdate(from + (to - from) * fn(p), p);
      if (p < 1) raf = requestAnimationFrame(step);
      else if (o.onDone) o.onDone();
    };
    raf = requestAnimationFrame(step);
    const handle = { cancel() { cancelled = true; cancelAnimationFrame(raf); } };
    onCleanup(handle.cancel);
    return handle;
  }

  /**
   * Ciclo di animazione continuo: fn(dt, t) con dt in secondi.
   * Si mette in pausa da solo quando l'elemento esce dallo schermo o la scheda è nascosta.
   * Restituisce { start(), stop(), toggle(), running }.
   */
  function loop(fn, opts) {
    const o = Object.assign({ el: null, autostart: true }, opts || {});
    let wanted = !!o.autostart;
    let visible = !o.el;
    let raf = 0;
    let last = 0;
    let t = 0;
    const tick = (now) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      t += dt;
      fn(dt, t);
      raf = requestAnimationFrame(tick);
    };
    const sync = () => {
      const go = wanted && visible && !(typeof document !== 'undefined' && document.hidden);
      if (go && !raf) { last = 0; raf = requestAnimationFrame(tick); }
      if (!go && raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    if (o.el) onVisible(o.el, (v) => { visible = v; sync(); }, { once: false, threshold: 0 });
    const onVis = () => sync();
    if (typeof document !== 'undefined') listen(document, 'visibilitychange', onVis);
    onCleanup(() => { wanted = false; sync(); });
    const ctl = {
      start() { wanted = true; sync(); return ctl; },
      stop() { wanted = false; sync(); return ctl; },
      toggle(v) { wanted = v == null ? !wanted : !!v; sync(); return ctl; },
      get running() { return wanted; },
    };
    sync();
    return ctl;
  }

  /** Conta da 0 al valore quando l'elemento diventa visibile. */
  function countUp(el, value, opts) {
    const o = Object.assign({ duration: 1400, decimals: null, prefix: '', suffix: '' }, opts || {});
    const show = (v) => { el.textContent = o.prefix + fmt(v, o.decimals == null ? (Number.isInteger(value) ? 0 : 1) : o.decimals) + o.suffix; };
    show(reduced() ? value : 0);
    onVisible(el, () => tween({ from: 0, to: value, duration: o.duration, ease: ease.out, onUpdate: (v) => show(Number.isInteger(value) && o.decimals == null ? Math.round(v) : v) }));
  }

  Object.assign(PL, { motion, reduced, tween, loop, countUp });

  /* ---------- memoria locale (solo comodità: se manca, tutto funziona lo stesso) ---------- */

  PL.store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem('porte-logiche:' + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('porte-logiche:' + key, JSON.stringify(value)); } catch (e) { /* memoria non disponibile */ }
    },
  };

  /* ---------- registro dei capitoli ---------- */

  PL.chapters = [];
  PL.chapter = function (def) {
    PL.chapters.push(def);
    PL.chapters.sort((a, b) => a.num - b.num);
    return def;
  };
  PL.getChapter = (id) => PL.chapters.find((c) => c.id === id);

  /* ---------- glossario e testo ricco ---------- */

  function glossary() {
    const map = new Map();
    for (const ch of PL.chapters) {
      for (const g of ch.glossary || []) {
        const key = g.term.toLowerCase();
        if (!map.has(key)) map.set(key, Object.assign({ chapter: ch }, g));
      }
    }
    return map;
  }

  function escapeHtml(t) {
    return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  /**
   * Testo con markup fidato: accetta <em>, <strong>, <a>, <sub>, <sup>, <span class="ovl">.
   * [[termine]] o [[termine|etichetta]] diventa una parola del glossario con definizione al passaggio.
   */
  function rich(text) {
    if (text == null) return null;
    if (typeof text !== 'string') return text;
    let gl = null;
    const html = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, term, label) => {
      gl = gl || glossary();
      const entry = gl.get(term.trim().toLowerCase());
      const shown = label || term;
      if (!entry) return shown;
      return '<button type="button" class="pl-term" data-term="' + escapeHtml(entry.term) + '">' + shown + '</button>';
    });
    return frag(html);
  }

  // Un solo fumetto condiviso per le definizioni del glossario.
  let tipEl = null;
  let tipFor = null;
  function showTip(btn) {
    const entry = glossary().get((btn.dataset.term || '').toLowerCase());
    if (!entry) return;
    if (!tipEl) {
      tipEl = h('div', { class: 'pl-tip', id: 'pl-tip', role: 'tooltip' });
      document.body.append(tipEl);
    }
    tipEl.replaceChildren(h('strong', null, entry.term), ' ', h('span', null, entry.def));
    tipEl.classList.add('show');
    btn.setAttribute('aria-describedby', 'pl-tip');
    tipFor = btn;
    const r = btn.getBoundingClientRect();
    const w = Math.min(300, window.innerWidth - 24);
    tipEl.style.width = w + 'px';
    const left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2));
    const th = tipEl.offsetHeight;
    const above = r.top > th + 16;
    tipEl.style.left = left + 'px';
    tipEl.style.top = (above ? r.top - th - 10 : r.bottom + 10) + window.scrollY + 'px';
  }
  function hideTip() {
    if (tipEl) tipEl.classList.remove('show');
    if (tipFor) tipFor.removeAttribute('aria-describedby');
    tipFor = null;
  }
  function initTips() {
    document.addEventListener('mouseover', (e) => { const b = e.target.closest && e.target.closest('.pl-term'); if (b) showTip(b); });
    document.addEventListener('mouseout', (e) => { const b = e.target.closest && e.target.closest('.pl-term'); if (b && !b.contains(e.relatedTarget)) hideTip(); });
    document.addEventListener('focusin', (e) => { if (e.target.classList && e.target.classList.contains('pl-term')) showTip(e.target); });
    document.addEventListener('focusout', (e) => { if (e.target.classList && e.target.classList.contains('pl-term')) hideTip(); });
    document.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('.pl-term');
      if (b) { if (tipFor === b) hideTip(); else showTip(b); } else hideTip();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip(); });
    window.addEventListener('scroll', hideTip, { passive: true });
  }

  Object.assign(PL, { glossary, rich, escapeHtml, initTips, hideTip });

  /* ---------- componenti dell'interfaccia ---------- */

  const ui = PL.ui = {};
  const kids = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

  /** Sottosezione di un capitolo: compare nell'indice laterale. */
  ui.section = function (o, ...children) {
    const id = 'sez-' + o.id;
    return h('section', { class: 'pl-sec' + (o.class ? ' ' + o.class : ''), id, 'data-toc': o.toc || o.title, 'aria-labelledby': id + '-t' },
      h('header', { class: 'pl-sec-head' },
        o.kicker ? h('p', { class: 'pl-sec-kicker' }, o.kicker) : null,
        h('h2', { id: id + '-t' }, o.title),
        o.lead ? h('p', { class: 'pl-sec-lead' }, rich(o.lead)) : null),
      ...children);
  };

  /** Paragrafi di testo (stringhe con markup fidato o nodi). */
  ui.prose = function (...paras) {
    return h('div', { class: 'pl-prose' }, paras.flat().map((p) => (typeof p === 'string' ? h('p', null, rich(p)) : p)));
  };

  /** Citazione storica, con traduzione e originale facoltativo. */
  ui.quote = function (o) {
    return h('figure', { class: 'pl-quote' },
      h('blockquote', null, h('p', null, rich(o.text)), o.original ? h('p', { class: 'pl-quote-orig', lang: o.lang || 'en' }, o.original) : null),
      h('figcaption', null, '— ', h('strong', null, o.author), o.source ? ', ' : '', o.source ? h('cite', null, o.source) : null, o.year ? ' (' + o.year + ')' : ''));
  };

  /**
   * Banco di laboratorio (pannello scuro interattivo).
   * ui.lab({ title, intro, controls, stage, readout, caption, wide, badge })
   */
  ui.lab = function (o) {
    const titleId = uid('lab');
    return h('figure', { class: 'pl-lab' + (o.wide ? ' is-wide' : '') + (o.class ? ' ' + o.class : ''), 'aria-labelledby': titleId },
      h('header', { class: 'pl-lab-head' },
        h('span', { class: 'pl-lab-badge' }, o.badge || 'Laboratorio'),
        h('h3', { id: titleId }, o.title),
        o.intro ? h('p', { class: 'pl-lab-intro' }, rich(o.intro)) : null),
      o.controls ? h('div', { class: 'pl-lab-controls' }, kids(o.controls)) : null,
      h('div', { class: 'pl-lab-stage' }, kids(o.stage)),
      o.readout ? h('div', { class: 'pl-lab-readout', 'aria-live': 'polite' }, kids(o.readout)) : null,
      o.caption ? h('figcaption', { class: 'pl-lab-caption' }, rich(o.caption)) : null);
  };

  /** Illustrazione su carta (SVG che segue il tema chiaro/scuro). */
  ui.figure = function (o) {
    return h('figure', { class: 'pl-fig' + (o.wide ? ' is-wide' : '') + (o.dark ? ' is-dark' : '') + (o.class ? ' ' + o.class : '') },
      h('div', { class: 'pl-fig-art' }, kids(o.art)),
      o.caption ? h('figcaption', null, rich(o.caption), o.credit ? h('small', null, ' ' + o.credit) : null) : null);
  };

  const CALLOUT = {
    fun: { title: 'Lo sapevi?', icon: '<circle cx="12" cy="10" r="6"/><path d="M9.5 18h5M10 21h4"/>' },
    note: { title: 'In breve', icon: '<path d="M5 6h14M5 12h14M5 18h9"/>' },
    key: { title: 'Idea chiave', icon: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>' },
    link: { title: 'Approfondisci', icon: '<path d="M10 14l4-4M8 16l-2 2a3 3 0 01-4-4l3-3a3 3 0 014 0M16 8l2-2a3 3 0 014 4l-3 3a3 3 0 01-4 0"/>' },
    warn: { title: 'Attenzione', icon: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/>' },
  };

  /** Riquadro: kind = fun | note | key | link | warn. */
  ui.callout = function (o) {
    const k = CALLOUT[o.kind || 'fun'] || CALLOUT.fun;
    return h('aside', { class: 'pl-callout is-' + (o.kind || 'fun') },
      h('span', { class: 'pl-callout-icon', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24">' + k.icon + '</svg>' }),
      h('div', null,
        h('p', { class: 'pl-callout-title' }, o.title || k.title),
        kids(o.body).map((b) => (typeof b === 'string' ? h('p', null, rich(b)) : b))));
  };

  ui.keyIdea = (text) => ui.callout({ kind: 'key', body: text });

  function hashHue(str) {
    let x = 0;
    for (const c of str) x = (x * 31 + c.charCodeAt(0)) % 360;
    return x;
  }

  /** Scheda biografica con medaglione (iniziali incise). */
  ui.person = function (o) {
    const initials = o.initials || o.name.split(/\s+/).filter((w) => /^[A-ZÀ-Ý]/.test(w)).map((w) => w[0]).slice(0, 2).join('');
    const hue = o.hue == null ? hashHue(o.name) : o.hue;
    return h('article', { class: 'pl-person', style: { '--hue': hue } },
      h('div', { class: 'pl-person-medal', 'aria-hidden': 'true' }, h('span', null, initials)),
      h('div', { class: 'pl-person-body' },
        h('h4', null, o.name),
        h('p', { class: 'pl-person-meta' }, [o.years, o.role].filter(Boolean).join(' · ')),
        kids(o.body).map((b) => (typeof b === 'string' ? h('p', null, rich(b)) : b))));
  };

  /** Numeri chiave con conteggio animato: [{ value, label, prefix, suffix, decimals, note }]. */
  ui.stats = function (items) {
    return h('dl', { class: 'pl-stats' }, items.map((it) => {
      const num = h('span', { class: 'pl-stat-num' });
      if (typeof it.value === 'number') countUp(num, it.value, it);
      else num.textContent = it.value;
      return h('div', { class: 'pl-stat' },
        h('dt', null, it.label),
        h('dd', null, num, it.unit ? h('span', { class: 'pl-stat-unit' }, ' ' + it.unit) : null, it.note ? h('small', null, it.note) : null));
    }));
  };

  /** Piccola linea del tempo dentro un capitolo: [{ year, title, text }]. */
  ui.timeline = function (events, o) {
    const opts = o || {};
    return h('div', { class: 'pl-tl-wrap' },
      opts.title ? h('h3', { class: 'pl-tl-title' }, opts.title) : null,
      h('ol', { class: 'pl-tl' }, events.map((e) => h('li', { class: 'pl-tl-item' },
        h('span', { class: 'pl-tl-year' }, String(e.year)),
        h('div', { class: 'pl-tl-body' }, h('strong', null, e.title), e.text ? h('p', null, rich(e.text)) : null)))));
  };

  /** Pulsante. kind: primary | ghost | lab (stile da strumento) */
  ui.btn = function (o) {
    return h('button', { type: 'button', class: 'pl-btn' + (o.kind ? ' is-' + o.kind : ''), title: o.title, 'aria-label': o.ariaLabel, onclick: o.onClick, disabled: o.disabled },
      o.icon ? h('span', { class: 'pl-btn-icon', 'aria-hidden': 'true' }, o.icon) : null, o.label);
  };

  /**
   * Interruttore 0/1 con spia. ui.toggle({ label, value, onChange })
   * Restituisce il pulsante con .value e .set(v).
   */
  ui.toggle = function (o) {
    const val = h('span', { class: 'pl-bit-val' });
    const b = h('button', { type: 'button', class: 'pl-bit' + (o.class ? ' ' + o.class : ''), 'aria-label': o.ariaLabel || ('Ingresso ' + o.label) },
      h('span', { class: 'pl-bit-led', 'aria-hidden': 'true' }),
      o.label != null ? h('span', { class: 'pl-bit-label' }, o.label) : null,
      val);
    // .value restituisce 0 o 1 (numero): nasconde la proprietà value nativa del pulsante, che è una stringa.
    let bit = 0;
    Object.defineProperty(b, 'value', { get: () => bit, configurable: true });
    b.set = (v, silent) => {
      bit = v ? 1 : 0;
      b.classList.toggle('is-on', bit === 1);
      b.setAttribute('aria-pressed', bit ? 'true' : 'false');
      val.textContent = String(bit);
      if (!silent && o.onChange) o.onChange(bit);
    };
    b.addEventListener('click', () => b.set(bit ? 0 : 1));
    b.set(o.value ? 1 : 0, true);
    return b;
  };

  /** Spia luminosa: ui.led(on). Restituisce lo span con .set(v). */
  ui.led = function (on, label) {
    const l = h('span', { class: 'pl-led', role: 'img' });
    l.set = (v) => {
      l.classList.toggle('is-on', !!v);
      l.setAttribute('aria-label', (label ? label + ': ' : '') + (v ? 'acceso (1)' : 'spento (0)'));
    };
    l.set(on);
    return l;
  };

  /**
   * Gruppo di scelte (radio a pulsanti). ui.segmented({ label, options: [{ value, label }], value, onChange })
   * Frecce sinistra/destra per spostarsi. Restituisce { el, set(v), value }.
   */
  ui.segmented = function (o) {
    const el = h('div', { class: 'pl-seg', role: 'radiogroup', 'aria-label': o.label });
    const api = { el, value: o.value };
    const buttons = o.options.map((opt) => h('button', {
      type: 'button', role: 'radio', class: 'pl-seg-btn', 'data-value': String(opt.value), title: opt.title,
      onclick: () => api.set(opt.value),
    }, opt.label));
    el.append(...buttons);
    el.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const i = o.options.findIndex((x) => String(x.value) === String(api.value));
      let j = i;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + o.options.length) % o.options.length;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % o.options.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = o.options.length - 1;
      api.set(o.options[j].value);
      buttons[j].focus();
    });
    api.set = (v, silent) => {
      api.value = v;
      buttons.forEach((b) => {
        const on = b.dataset.value === String(v);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
      if (!silent && o.onChange) o.onChange(v);
    };
    api.set(o.value, true);
    return api;
  };

  /** Cursore con etichetta e valore. ui.slider({ label, min, max, step, value, format, onInput }) */
  ui.slider = function (o) {
    const out = h('output', { class: 'pl-slider-out' });
    const input = h('input', { type: 'range', min: o.min, max: o.max, step: o.step || 1, value: o.value, 'aria-label': o.label });
    const show = () => { out.textContent = o.format ? o.format(+input.value) : input.value; };
    input.addEventListener('input', () => { show(); if (o.onInput) o.onInput(+input.value); });
    show();
    const el = h('label', { class: 'pl-slider' }, h('span', { class: 'pl-slider-label' }, o.label), input, out);
    return { el, input, set(v, silent) { input.value = v; show(); if (!silent && o.onInput) o.onInput(+input.value); }, get value() { return +input.value; } };
  };

  /**
   * Tabella di verità. ui.truthTable({ inputs: ['A','B'], outputs: ['Q'], rows: [[0,0,1], ...], onPick })
   * Restituisce { el, highlight(i) }. Con onPick le righe diventano cliccabili.
   */
  ui.truthTable = function (o) {
    const tbody = h('tbody');
    const rows = o.rows.map((r, i) => {
      const tr = h('tr', { class: o.onPick ? 'is-pickable' : '' },
        r.map((v, j) => h(j < o.inputs.length ? 'td' : 'td', { class: j < o.inputs.length ? 'in' : 'out v' + v }, String(v))));
      if (o.onPick) {
        tr.tabIndex = 0;
        tr.addEventListener('click', () => o.onPick(i, r));
        tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.onPick(i, r); } });
      }
      tbody.append(tr);
      return tr;
    });
    const el = h('table', { class: 'pl-tt' + (o.class ? ' ' + o.class : '') },
      o.caption ? h('caption', null, o.caption) : null,
      h('thead', null, h('tr', null,
        o.inputs.map((n) => h('th', { scope: 'col', class: 'in' }, n)),
        o.outputs.map((n) => h('th', { scope: 'col', class: 'out' }, n)))),
      tbody);
    return {
      el,
      highlight(i) {
        rows.forEach((tr, j) => {
          tr.classList.toggle('is-current', j === i);
          if (j === i) tr.setAttribute('aria-current', 'true'); else tr.removeAttribute('aria-current');
        });
      },
    };
  };

  /**
   * Sequenza a passi con riproduzione automatica (per processi e storie).
   * ui.stepper({ label, steps: [{ title, text }], onStep(i, dir), interval, loop })
   * Restituisce { el, go(i), next(), prev(), play(), pause(), index }.
   */
  ui.stepper = function (o) {
    const steps = o.steps;
    const interval = o.interval || 3600;
    let index = -1;
    let timer = 0;
    let playing = false;
    const count = h('span', { class: 'pl-step-count' });
    const title = h('strong', { class: 'pl-step-title' });
    const text = h('p', { class: 'pl-step-text' });
    const dots = h('div', { class: 'pl-step-dots', role: 'group', 'aria-label': 'Vai alla fase' },
      steps.map((st, i) => h('button', { type: 'button', class: 'pl-step-dot', 'aria-label': 'Fase ' + (i + 1) + ': ' + st.title, onclick: () => { api.pause(); api.go(i); } })));
    const playBtn = h('button', { type: 'button', class: 'pl-btn is-lab is-primary', 'aria-label': 'Riproduci', onclick: () => (playing ? api.pause() : api.play()) }, '▶︎');
    const el = h('div', { class: 'pl-stepper', role: 'group', 'aria-label': o.label || 'Sequenza' },
      h('div', { class: 'pl-step-bar' },
        h('div', { class: 'pl-step-buttons' },
          h('button', { type: 'button', class: 'pl-btn is-lab', 'aria-label': 'Dall\'inizio', title: 'Dall\'inizio', onclick: () => { api.pause(); api.go(0); } }, '⏮'),
          h('button', { type: 'button', class: 'pl-btn is-lab', 'aria-label': 'Fase precedente', title: 'Fase precedente', onclick: () => { api.pause(); api.prev(); } }, '◀︎'),
          playBtn,
          h('button', { type: 'button', class: 'pl-btn is-lab', 'aria-label': 'Fase successiva', title: 'Fase successiva', onclick: () => { api.pause(); api.next(); } }, '▶︎|')),
        dots, count),
      h('div', { class: 'pl-step-caption', 'aria-live': 'polite' }, title, text));
    const schedule = () => {
      clearTimeout(timer);
      if (!playing) return;
      timer = setTimeout(() => {
        if (index >= steps.length - 1 && !o.loop) { api.pause(); return; }
        api.next(true);
        schedule();
      }, interval);
    };
    const api = {
      el,
      get index() { return index; },
      go(i, fromPlay) {
        const prev = index;
        index = Math.max(0, Math.min(steps.length - 1, i));
        count.textContent = 'Fase ' + (index + 1) + ' di ' + steps.length;
        title.textContent = steps[index].title;
        text.replaceChildren(rich(steps[index].text) || '');
        dots.querySelectorAll('button').forEach((d, j) => {
          d.classList.toggle('is-done', j < index);
          d.classList.toggle('is-current', j === index);
          if (j === index) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
        });
        if (o.onStep) o.onStep(index, index >= prev ? 1 : -1, !!fromPlay);
      },
      next(fromPlay) { api.go(index >= steps.length - 1 ? (o.loop ? 0 : index) : index + 1, fromPlay); },
      prev() { api.go(index - 1); },
      play() {
        if (index >= steps.length - 1) api.go(0, true);
        playing = true;
        playBtn.textContent = '❚❚';
        playBtn.setAttribute('aria-label', 'Pausa');
        schedule();
      },
      pause() {
        playing = false;
        clearTimeout(timer);
        playBtn.textContent = '▶︎';
        playBtn.setAttribute('aria-label', 'Riproduci');
      },
    };
    onCleanup(() => clearTimeout(timer));
    api.go(o.start || 0);
    return api;
  };

  /**
   * Schede (tablist accessibile). ui.tabs({ label, tabs: [{ id, label, render() }], value, onChange })
   */
  ui.tabs = function (o) {
    const list = h('div', { class: 'pl-tabs-list', role: 'tablist', 'aria-label': o.label });
    const panel = h('div', { class: 'pl-tabs-panel', role: 'tabpanel', tabindex: '0' });
    const ids = o.tabs.map(() => uid('tab'));
    panel.id = uid('tabpanel');
    const buttons = o.tabs.map((t, i) => h('button', {
      type: 'button', role: 'tab', id: ids[i], class: 'pl-tab', 'aria-controls': panel.id,
      onclick: () => api.set(t.id),
    }, t.label));
    list.append(...buttons);
    list.addEventListener('keydown', (e) => {
      const i = o.tabs.findIndex((t) => t.id === api.value);
      let j = -1;
      if (e.key === 'ArrowRight') j = (i + 1) % o.tabs.length;
      if (e.key === 'ArrowLeft') j = (i - 1 + o.tabs.length) % o.tabs.length;
      if (j >= 0) { e.preventDefault(); api.set(o.tabs[j].id); buttons[j].focus(); }
    });
    const el = h('div', { class: 'pl-tabs' }, list, panel);
    const api = {
      el, value: null,
      set(id) {
        api.value = id;
        o.tabs.forEach((t, i) => {
          const on = t.id === id;
          buttons[i].setAttribute('aria-selected', on ? 'true' : 'false');
          buttons[i].tabIndex = on ? 0 : -1;
          if (on) { panel.setAttribute('aria-labelledby', ids[i]); panel.replaceChildren(...kids(t.render())); }
        });
        if (o.onChange) o.onChange(id);
      },
    };
    api.set(o.value || o.tabs[0].id);
    return api;
  };

  /** Tabella di confronto: ui.table({ columns: ['A', 'B'], rows: [['x', 'y']], caption }) */
  ui.table = function (o) {
    return h('div', { class: 'pl-table-wrap' }, h('table', { class: 'pl-table' },
      o.caption ? h('caption', null, o.caption) : null,
      h('thead', null, h('tr', null, o.columns.map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', null, o.rows.map((r) => h('tr', null, r.map((c, i) => h(i === 0 ? 'th' : 'td', i === 0 ? { scope: 'row' } : null, rich(String(c)))))))));
  };

  /** Rimando a un altro capitolo o a un'altra sezione dell'enciclopedia. */
  ui.crossLink = function (o) {
    return h('a', { class: 'pl-xlink', href: o.href },
      h('span', { class: 'pl-xlink-kicker' }, o.kicker || 'Approfondisci'),
      h('strong', null, o.title),
      o.text ? h('span', { class: 'pl-xlink-text' }, rich(o.text)) : null,
      h('span', { class: 'pl-xlink-arrow', 'aria-hidden': 'true' }, '→'));
  };

  /** Griglia a due colonne che diventa una sola su schermi stretti. */
  ui.cols = function (...children) {
    return h('div', { class: 'pl-cols' }, ...children);
  };

  /** Elemento che entra con una dissolvenza quando arriva sullo schermo. */
  ui.reveal = function (node) {
    node.classList.add('pl-reveal');
    if (reduced()) node.classList.add('in');
    else onVisible(node, () => node.classList.add('in'));
    return node;
  };
})(typeof window !== 'undefined' ? window : globalThis);
