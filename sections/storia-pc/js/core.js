/*
 * Storia del PC · nucleo comune.
 * Registro dei capitoli e piccoli strumenti (DOM, SVG, animazioni) usati da
 * tutti i laboratori. Non tocca il DOM al caricamento, così i test in Node
 * possono caricare core.js e i file dei capitoli per controllarne i contenuti.
 */
(function (root) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const capitoli = [];

  // Token di movimento (skill ECC motion-foundations, versione senza React).
  // Gli stessi valori sono in storia-pc.css come variabili --dur-* e --ease-*.
  const motion = {
    dur: { instant: 80, fast: 180, normal: 350, slow: 600, crawl: 1000 },
    ease: {
      smooth: 'cubic-bezier(.22, 1, .36, 1)',
      sharp: 'cubic-bezier(.4, 0, .2, 1)',
      bounce: 'cubic-bezier(.34, 1.56, .64, 1)',
      linear: 'linear',
    },
  };

  /* ---------- curve di accelerazione ---------- */

  // Curva di Bézier cubica come in CSS: restituisce una funzione t -> progresso.
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
      for (let i = 0; i < 8; i++) {
        const err = sx(t) - x;
        if (Math.abs(err) < 1e-5) break;
        const d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= err / d;
      }
      t = Math.min(1, Math.max(0, t));
      return sy(t);
    };
  }

  const curve = {
    linear: (t) => t,
    smooth: bezier(0.22, 1, 0.36, 1),
    sharp: bezier(0.4, 0, 0.2, 1),
    bounce: bezier(0.34, 1.56, 0.64, 1),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  };

  /* ---------- utilità ---------- */

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function ridotto() {
    return typeof window !== 'undefined' && !!window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  let contatore = 0;
  function uid(prefisso) { contatore += 1; return (prefisso || 'spc') + '-' + contatore; }

  const nf = {};
  function formato(n, decimali) {
    const d = decimali || 0;
    if (!nf[d]) nf[d] = new Intl.NumberFormat('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });
    return nf[d].format(n);
  }

  // Come formato(), ma con il punto delle migliaia anche a 4 cifre (1.024 e non 1024, che per Intl
  // in italiano è facoltativo): per le cifre dei blocchi «numeri», che non sono mai anni.
  const nfg = {};
  function cifra(n, decimali) {
    const d = decimali || 0;
    if (!nfg[d]) nfg[d] = new Intl.NumberFormat('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });
    return nfg[d].format(n);
  }

  function cssVar(nome, el) {
    return getComputedStyle(el || document.documentElement).getPropertyValue(nome).trim();
  }

  /* ---------- DOM e SVG ---------- */

  function imposta(n, attrs) {
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.setAttribute('class', v);
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
  }

  function aggiungi(n, children) {
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      n.append(c.nodeType ? c : String(c));
    }
  }

  // h('div', { class: 'x', onclick: fn }, figli...) crea un elemento HTML.
  function h(tag, attrs, ...children) {
    const n = document.createElement(tag);
    imposta(n, attrs);
    aggiungi(n, children);
    return n;
  }

  // s('rect', { x: 0, y: 0 }, figli...) crea un elemento SVG.
  function s(tag, attrs, ...children) {
    const n = document.createElementNS(SVG_NS, tag);
    imposta(n, attrs);
    aggiungi(n, children);
    return n;
  }

  // Trasforma una stringa SVG (o HTML) nel suo primo elemento.
  function svgDaTesto(markup) {
    const t = document.createElement('template');
    t.innerHTML = String(markup).trim();
    return t.content.firstElementChild;
  }

  // Scrive un testo in una regione aria-live (gli screen reader lo leggono).
  function annuncia(el, testo) {
    if (!el) return;
    if (el.textContent === testo) el.textContent = '';
    el.textContent = testo;
  }

  // Punto a una certa frazione (0-1) della lunghezza di un <path>.
  function puntoSu(path, frazione) {
    if (!path.__len) path.__len = path.getTotalLength();
    const p = path.getPointAtLength(path.__len * clamp(frazione, 0, 1));
    return { x: p.x, y: p.y };
  }

  /* ---------- animazioni ---------- */

  // Ciclo requestAnimationFrame con avvio e arresto.
  // passo(dt in secondi, t in ms) viene chiamato a ogni frame; se restituisce false si ferma.
  function loop(passo) {
    let id = 0;
    let ultimo = 0;
    let attivo = false;
    function frame(t) {
      if (!attivo) return;
      const dt = ultimo ? Math.min(0.1, (t - ultimo) / 1000) : 0;
      ultimo = t;
      if (passo(dt, t) === false) { attivo = false; return; }
      id = requestAnimationFrame(frame);
    }
    return {
      start() { if (!attivo) { attivo = true; ultimo = 0; id = requestAnimationFrame(frame); } },
      stop() { attivo = false; cancelAnimationFrame(id); },
      get attivo() { return attivo; },
    };
  }

  // Interpolazione numerica: tween({ from, to, dur, ease, update(v, k), done() }).
  // Con movimento ridotto salta subito al valore finale.
  function tween(opts) {
    const from = opts.from == null ? 0 : opts.from;
    const to = opts.to == null ? 1 : opts.to;
    const dur = ridotto() ? 0 : (opts.dur == null ? motion.dur.normal : opts.dur);
    const ease = typeof opts.ease === 'function' ? opts.ease : (curve[opts.ease] || curve.smooth);
    let id = 0;
    let annullato = false;
    let risolvi;
    const finito = new Promise((r) => { risolvi = r; });
    if (!dur) {
      if (opts.update) opts.update(to, 1);
      if (opts.done) opts.done();
      risolvi(true);
      return { cancel() {}, finito };
    }
    const t0 = performance.now();
    function frame(now) {
      if (annullato) return;
      const k = clamp((now - t0) / dur, 0, 1);
      if (opts.update) opts.update(from + (to - from) * ease(k), k);
      if (k < 1) id = requestAnimationFrame(frame);
      else { if (opts.done) opts.done(); risolvi(true); }
    }
    id = requestAnimationFrame(frame);
    return { cancel() { annullato = true; cancelAnimationFrame(id); risolvi(false); }, finito };
  }

  /* ---------- registro dei capitoli ---------- */

  const TIPI_BLOCCO = ['testo', 'figura', 'schede', 'citazione', 'numeri', 'nota', 'italia', 'confronto', 'lab'];

  function registra(cap) {
    if (!cap || typeof cap.id !== 'string' || !/^[a-z0-9-]+$/.test(cap.id)) {
      throw new Error('StoriaPC.registra: id del capitolo mancante o non valido');
    }
    const i = capitoli.findIndex((c) => c.id === cap.id);
    if (i >= 0) capitoli.splice(i, 1, cap);
    else capitoli.push(cap);
    return cap;
  }

  const api = {
    capitoli: capitoli,
    registra: registra,
    TIPI_BLOCCO: TIPI_BLOCCO,
    motion: motion,
    curve: curve,
    bezier: bezier,
    clamp: clamp,
    lerp: lerp,
    ridotto: ridotto,
    uid: uid,
    formato: formato,
    cifra: cifra,
    cssVar: cssVar,
    h: h,
    s: s,
    svgDaTesto: svgDaTesto,
    annuncia: annuncia,
    puntoSu: puntoSu,
    loop: loop,
    tween: tween,
  };

  root.StoriaPC = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
