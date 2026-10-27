/*
 * Elettronica avanzata: motore comune ai capitoli.
 * Registro dei capitoli, costruttori DOM e SVG, canvas nitidi, animazioni che
 * si fermano fuori schermo o con la scheda nascosta, controlli da strumento.
 * Gira anche in Node (senza DOM) per i test dei modelli fisici.
 */
(function (root) {
  'use strict';

  const SVGNS = 'http://www.w3.org/2000/svg';
  const hasDOM = typeof document !== 'undefined';
  const TAU = Math.PI * 2;

  /* ---------- registro dei capitoli ---------- */

  const chapters = [];

  function register(ch) {
    if (!ch || !ch.id) throw new Error('Capitolo senza id');
    const i = chapters.findIndex((c) => c.id === ch.id);
    if (i >= 0) chapters[i] = ch;
    else chapters.push(ch);
    return ch;
  }

  function chapter(id) {
    return chapters.find((c) => c.id === id) || null;
  }

  /* ---------- matematica e formati ---------- */

  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const map = (x, a, b, c, d) => c + ((x - a) * (d - c)) / (b - a);
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const ease = {
    out: (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3),
    inOut: (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  };

  // Numero all'italiana: virgola decimale, segno meno tipografico.
  function fmt(x, digits) {
    if (typeof x !== 'number' || Number.isNaN(x)) return '—';
    if (!Number.isFinite(x)) return x > 0 ? '∞' : '−∞';
    const d = digits == null ? 2 : digits;
    const s = x.toLocaleString('it-IT', { maximumFractionDigits: d, minimumFractionDigits: 0 });
    return s.replace('-', '−');
  }

  const PREFIXES = [[1e15, 'P'], [1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'], [1e-15, 'f']];

  // Valore con prefisso SI e cifre significative: si(2.4e9, 'Hz') → "2,4 GHz".
  function si(x, unit, sig) {
    const u = unit || '';
    if (typeof x !== 'number' || Number.isNaN(x)) return '—';
    if (!Number.isFinite(x)) return (x > 0 ? '∞' : '−∞') + (u ? ' ' + u : '');
    if (x === 0) return '0' + (u ? ' ' + u : '');
    const a = Math.abs(x);
    let p = PREFIXES[PREFIXES.length - 1];
    for (const cand of PREFIXES) { if (a >= cand[0] * 0.9995) { p = cand; break; } }
    const v = x / p[0];
    const n = sig || 3;
    const digits = Math.max(0, n - 1 - Math.floor(Math.log10(Math.abs(v) || 1)));
    return fmt(Number(v.toFixed(digits)), digits) + ' ' + p[1] + u;
  }

  const db = (ratio) => 20 * Math.log10(ratio);

  /* ---------- DOM e SVG ---------- */

  function h(tag, attrs, ...children) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'style' && typeof v === 'object') { for (const p in v) n.style.setProperty(p, v[p]); }
        else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat(Infinity)) if (c != null && c !== false) n.append(c);
    return n;
  }

  function s(tag, attrs, parent) {
    const n = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  let uid = 0;
  const nextId = (p) => (p || 'ea') + '-' + (++uid);

  function reduced() {
    return hasDOM && typeof root.matchMedia === 'function' && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ---------- colori degli strumenti (sempre su fondo scuro) ---------- */

  const colors = {
    bg: '#0b1210', bg2: '#0f1916', grid: '#1d2b27', grid2: '#15211e',
    text: '#a9c3b9', dim: '#7f978e', ink: '#e8f2ee',
    green: '#3ee08f', amber: '#ffc04d', cyan: '#5cc8ff', pink: '#ff7aa8',
    orange: '#ff9f43', violet: '#b49cff', red: '#ff6b6b', lime: '#9be15d', blue: '#7aa2ff',
  };

  // '#rrggbb' + alfa → 'rgba(...)'
  function alpha(hex, a) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return hex;
    return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')';
  }

  /* ---------- canvas nitido ---------- */

  // Il canvas prende le dimensioni dal CSS (larghezza 100% e aspect-ratio o altezza)
  // e disegna in pixel CSS: cv.w e cv.h sono già divisi per il devicePixelRatio.
  function makeCanvas(parent, opts) {
    const o = opts || {};
    const el = h('canvas', { class: o.class || 'ea-canvas', role: 'img', 'aria-label': o.label || null });
    if (o.aspect) el.style.aspectRatio = String(o.aspect);
    if (o.height) el.style.height = typeof o.height === 'number' ? o.height + 'px' : o.height;
    parent.append(el);
    const ctx = el.getContext('2d');
    const cv = { el, ctx, w: 0, h: 0, dpr: 1, onresize: o.onresize || null, fit, destroy };
    function fit() {
      const w = el.clientWidth;
      const hh = el.clientHeight;
      if (!w || !hh) return false;
      const dpr = Math.min(2, root.devicePixelRatio || 1);
      if (w === cv.w && hh === cv.h && dpr === cv.dpr) return false;
      cv.w = w; cv.h = hh; cv.dpr = dpr;
      el.width = Math.round(w * dpr);
      el.height = Math.round(hh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }
    fit();
    let ro = null;
    if (typeof root.ResizeObserver === 'function') {
      ro = new root.ResizeObserver(() => { if (fit() && cv.onresize) cv.onresize(cv); });
      ro.observe(el);
    }
    function destroy() { if (ro) ro.disconnect(); ro = null; }
    return cv;
  }

  /* ---------- animazioni ---------- */

  // draw(t, dt): t = secondi di animazione (avanza solo mentre suona), dt = passo.
  // Il ciclo si ferma da solo fuori schermo o con la scheda del browser nascosta.
  function makeLoop(draw, opts) {
    const o = opts || {};
    let raf = 0;
    let playing = false;
    let visible = true;
    let last = 0;
    let t = o.t0 || 0;
    const listeners = new Set();

    function frame(now) {
      raf = 0;
      if (!playing) return;
      if (!visible || document.hidden) { last = 0; return; }
      const dt = last ? Math.min(0.064, (now - last) / 1000) : 0;
      last = now;
      t += dt * ctl.speed;
      draw(t, dt);
      raf = root.requestAnimationFrame(frame);
    }
    function kick() {
      if (!raf && playing && visible && !document.hidden) raf = root.requestAnimationFrame(frame);
    }
    let io = null;
    if (o.el && typeof root.IntersectionObserver === 'function') {
      io = new root.IntersectionObserver((entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible) kick();
        else if (!playing) return;
      }, { rootMargin: '120px 0px' });
      io.observe(o.el);
    }
    const onVis = () => { last = 0; kick(); };
    document.addEventListener('visibilitychange', onVis);

    const ctl = {
      speed: 1,
      autoplay: o.autoplay !== false,
      get playing() { return playing; },
      get time() { return t; },
      set time(v) { t = v; },
      play() { if (playing) return; playing = true; last = 0; kick(); emit(); },
      pause() {
        if (!playing) return;
        playing = false;
        if (raf) root.cancelAnimationFrame(raf);
        raf = 0;
        emit();
      },
      toggle() { if (playing) ctl.pause(); else ctl.play(); },
      render() { draw(t, 0); },
      onchange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      destroy() {
        ctl.pause();
        if (io) io.disconnect();
        io = null;
        document.removeEventListener('visibilitychange', onVis);
        listeners.clear();
      },
    };
    function emit() { listeners.forEach((f) => f(playing)); }
    return ctl;
  }

  /* ---------- annunci per i lettori di schermo ---------- */

  let liveTimer = 0;
  function announce(text) {
    if (!hasDOM) return;
    const live = document.getElementById('ea-live');
    if (!live) return;
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => { live.textContent = text; }, 450);
  }

  /* ---------- ambito: tutto ciò che una vista crea e poi distrugge ---------- */

  function createScope(el, extra) {
    const loops = new Set();
    const cleanups = [];
    const listeners = new Set();
    let pendingRender = 0;
    const emit = () => listeners.forEach((f) => f(scope.playing));

    const scope = {
      el,
      reduced: reduced(),
      loop(draw, opts) {
        const l = makeLoop(draw, Object.assign({ el }, opts));
        l.onchange(emit);
        loops.add(l);
        return l;
      },
      canvas(parent, opts) {
        const cv = makeCanvas(parent, opts);
        const user = cv.onresize;
        cv.onresize = (c) => { if (user) user(c); if (!scope.playing) scope.render(); };
        cleanups.push(() => cv.destroy());
        return cv;
      },
      on(target, type, fn, o) {
        target.addEventListener(type, fn, o);
        cleanups.push(() => target.removeEventListener(type, fn, o));
      },
      timeout(fn, ms) { const id = setTimeout(fn, ms); cleanups.push(() => clearTimeout(id)); return id; },
      interval(fn, ms) { const id = setInterval(fn, ms); cleanups.push(() => clearInterval(id)); return id; },
      cleanup(fn) { cleanups.push(fn); },
      announce,
      get playing() { for (const l of loops) if (l.playing) return true; return false; },
      get hasLoops() { return loops.size > 0; },
      play() { loops.forEach((l) => l.play()); },
      pause() { loops.forEach((l) => l.pause()); },
      toggle() { if (scope.playing) scope.pause(); else scope.play(); },
      render() { loops.forEach((l) => l.render()); },
      // Da chiamare dopo un cambio di parametri: ridisegna anche se in pausa.
      invalidate() {
        if (scope.playing || pendingRender || !hasDOM) return;
        pendingRender = root.requestAnimationFrame(() => { pendingRender = 0; scope.render(); });
      },
      // Avvio: le animazioni partono da sole, ma non con "riduci movimento".
      start() {
        if (!scope.reduced) loops.forEach((l) => { if (l.autoplay) l.play(); else l.render(); });
        else scope.render();
      },
      onchange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      destroy() {
        if (pendingRender) root.cancelAnimationFrame(pendingRender);
        loops.forEach((l) => l.destroy());
        loops.clear();
        listeners.clear();
        cleanups.splice(0).reverse().forEach((f) => { try { f(); } catch (e) { /* già rimosso */ } });
      },
    };
    return Object.assign(scope, extra || {});
  }

  /* ---------- disegno da strumento ---------- */

  const draw = {
    clear(cv, color) {
      cv.ctx.fillStyle = color || colors.bg;
      cv.ctx.fillRect(0, 0, cv.w, cv.h);
    },

    // Reticolo da oscilloscopio con tacche sugli assi centrali.
    grid(ctx, x, y, w, hh, o) {
      const opt = o || {};
      const cols = opt.cols || 10;
      const rows = opt.rows || 8;
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = opt.color || colors.grid2;
      ctx.beginPath();
      for (let i = 0; i <= cols; i++) { const xx = Math.round(x + (w * i) / cols) + 0.5; ctx.moveTo(xx, y); ctx.lineTo(xx, y + hh); }
      for (let j = 0; j <= rows; j++) { const yy = Math.round(y + (hh * j) / rows) + 0.5; ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); }
      ctx.stroke();
      if (opt.ticks !== false) {
        ctx.strokeStyle = opt.tickColor || colors.grid;
        ctx.beginPath();
        const cx = Math.round(x + w / 2) + 0.5;
        const cy = Math.round(y + hh / 2) + 0.5;
        const n = cols * 5;
        for (let i = 0; i <= n; i++) { const xx = Math.round(x + (w * i) / n) + 0.5; ctx.moveTo(xx, cy - 3); ctx.lineTo(xx, cy + 3); }
        const m = rows * 5;
        for (let j = 0; j <= m; j++) { const yy = Math.round(y + (hh * j) / m) + 0.5; ctx.moveTo(cx - 3, yy); ctx.lineTo(cx + 3, yy); }
        ctx.stroke();
      }
      ctx.restore();
    },

    // Traccia luminosa: un alone largo e trasparente sotto una linea nitida.
    line(ctx, pts, color, width, glow) {
      if (!pts.length) return;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      if (glow !== false) {
        ctx.strokeStyle = alpha(color, 0.22);
        ctx.lineWidth = (width || 2) * 3.2;
        ctx.stroke();
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = width || 2;
      ctx.stroke();
      ctx.restore();
    },

    // Traccia di una funzione y = f(x) campionata ogni `step` pixel.
    fn(ctx, x0, x1, f, color, width, step, glow) {
      const pts = [];
      const st = step || 2;
      for (let x = x0; x <= x1; x += st) pts.push([x, f(x)]);
      if (pts.length && pts[pts.length - 1][0] < x1) pts.push([x1, f(x1)]);
      draw.line(ctx, pts, color, width, glow);
    },

    dot(ctx, x, y, r, color, glow) {
      ctx.save();
      if (glow !== false) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
        g.addColorStop(0, alpha(color, 0.45));
        g.addColorStop(1, alpha(color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r * 4, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.restore();
    },

    arrow(ctx, x1, y1, x2, y2, color, width, head) {
      const a = Math.atan2(y2 - y1, x2 - x1);
      const hl = head || 8;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = width || 2;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hl * 0.6, y2 - Math.sin(a) * hl * 0.6); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - Math.cos(a - 0.45) * hl, y2 - Math.sin(a - 0.45) * hl);
      ctx.lineTo(x2 - Math.cos(a + 0.45) * hl, y2 - Math.sin(a + 0.45) * hl);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    },

    text(ctx, str, x, y, o) {
      const opt = o || {};
      ctx.save();
      ctx.fillStyle = opt.color || colors.text;
      const family = opt.mono === false
        ? 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
        : 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.font = (opt.weight || 600) + ' ' + (opt.size || 11) + 'px ' + family;
      ctx.textAlign = opt.align || 'left';
      ctx.textBaseline = opt.baseline || 'alphabetic';
      ctx.fillText(str, x, y);
      ctx.restore();
    },
  };

  /* ---------- controlli da strumento ---------- */

  // Cursore. Con log: true si muove su scala logaritmica (min deve essere > 0).
  function slider(o) {
    const id = nextId('sl');
    const out = h('output', { class: 'ea-sl-out', for: id });
    const lg = !!o.log;
    const toPos = (v) => (lg ? (Math.log(v / o.min) / Math.log(o.max / o.min)) * 1000 : v);
    const fromPos = (p) => (lg ? o.min * Math.pow(o.max / o.min, p / 1000) : p);
    const input = h('input', {
      id, type: 'range',
      min: lg ? 0 : o.min, max: lg ? 1000 : o.max,
      step: lg ? 1 : (o.step || 'any'),
    });
    input.value = String(toPos(o.value));
    let value = o.value;
    function show() {
      const txt = o.format ? o.format(value) : fmt(value, o.digits) + (o.unit ? ' ' + o.unit : '');
      out.textContent = txt;
      input.setAttribute('aria-valuetext', txt);
      const pct = ((+input.value - +input.min) / (+input.max - +input.min)) * 100;
      input.style.setProperty('--fill', pct.toFixed(1) + '%');
    }
    input.addEventListener('input', () => {
      value = fromPos(+input.value);
      if (!lg && o.step) value = Math.round(value / o.step) * o.step;
      value = +value.toPrecision(12);
      show();
      if (o.oninput) o.oninput(value);
    });
    show();
    const el = h('div', { class: 'ea-ctl ea-slider', style: o.color ? { '--ctl': o.color } : null },
      h('label', { for: id }, h('span', { class: 'ea-ctl-label' }, o.label), out),
      input,
      o.hint ? h('small', { class: 'ea-ctl-hint' }, o.hint) : null);
    return {
      el, input,
      get value() { return value; },
      set(v, silent) { value = v; input.value = String(toPos(v)); show(); if (!silent && o.oninput) o.oninput(value); },
    };
  }

  // Selettore a pulsanti (radio nativi, quindi accessibile da tastiera).
  function segmented(o) {
    const name = nextId('seg');
    let value = o.value;
    const wrap = h('div', { class: 'ea-seg-opts' });
    const inputs = o.options.map((op) => {
      const id = nextId('opt');
      const input = h('input', { type: 'radio', name, id, value: String(op.value) });
      input.checked = op.value === value;
      input.addEventListener('change', () => {
        if (!input.checked) return;
        value = op.value;
        if (o.onchange) o.onchange(value);
      });
      wrap.append(h('span', { class: 'ea-seg-opt' }, input, h('label', { for: id, title: op.title || null }, op.label)));
      return input;
    });
    const el = h('fieldset', { class: 'ea-ctl ea-seg', style: o.color ? { '--ctl': o.color } : null },
      h('legend', { class: 'ea-ctl-label' }, o.label), wrap);
    return {
      el,
      get value() { return value; },
      set(v, silent) {
        value = v;
        inputs.forEach((inp, k) => { inp.checked = o.options[k].value === v; });
        if (!silent && o.onchange) o.onchange(v);
      },
    };
  }

  function toggle(o) {
    const id = nextId('tg');
    const input = h('input', { type: 'checkbox', id, role: 'switch' });
    input.checked = !!o.checked;
    input.addEventListener('change', () => { if (o.onchange) o.onchange(input.checked); });
    const el = h('div', { class: 'ea-ctl ea-toggle', style: o.color ? { '--ctl': o.color } : null },
      input, h('label', { for: id }, o.label));
    return {
      el, input,
      get checked() { return input.checked; },
      set(v, silent) { input.checked = !!v; if (!silent && o.onchange) o.onchange(input.checked); },
    };
  }

  // Display numerico: aggiorna il testo solo quando cambia.
  function readout(o) {
    const val = h('span', { class: 'ea-ro-val' }, o.value || '—');
    const el = h('div', { class: 'ea-ro' + (o.tone ? ' tone-' + o.tone : '') },
      h('span', { class: 'ea-ro-label' }, o.label), val);
    let last = null;
    let tone = o.tone || null;
    return {
      el,
      set(text, newTone) {
        if (text !== last) { last = text; val.textContent = text; }
        if (newTone !== undefined && newTone !== tone) {
          if (tone) el.classList.remove('tone-' + tone);
          tone = newTone;
          if (tone) el.classList.add('tone-' + tone);
        }
      },
    };
  }

  function button(o) {
    return h('button', {
      type: 'button',
      class: 'ea-btn' + (o.primary ? ' primary' : '') + (o.class ? ' ' + o.class : ''),
      onclick: o.onclick,
      'aria-label': o.aria || null,
      title: o.title || null,
    }, o.icon ? h('span', { class: 'ea-btn-icon', 'aria-hidden': 'true' }, o.icon) : null, o.label ? h('span', null, o.label) : null);
  }

  const ICON_PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" fill="currentColor"/></svg>';

  // Pulsante avvia/pausa legato a un ambito (tutte le sue animazioni).
  function playButton(scope, what) {
    const b = h('button', { type: 'button', class: 'ea-play' });
    const label = what || 'l\'animazione';
    function sync() {
      const p = scope.playing;
      b.innerHTML = p ? ICON_PAUSE : ICON_PLAY;
      b.setAttribute('aria-label', (p ? 'Metti in pausa ' : 'Avvia ') + label);
      b.title = p ? 'Pausa' : 'Avvia';
      b.classList.toggle('is-playing', p);
    }
    b.addEventListener('click', () => { scope.toggle(); sync(); });
    scope.onchange(sync);
    sync();
    return b;
  }

  /* ---------- audio (facoltativo, sempre su gesto dell'utente) ---------- */

  let audioCtx = null;
  function audio() {
    if (!audioCtx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  const EA = {
    TAU, register, chapter, chapters,
    clamp, lerp, map, smooth, ease, fmt, si, db,
    h, s, reduced, colors, alpha,
    canvas: makeCanvas, loop: makeLoop, createScope, announce,
    draw, ui: { slider, segmented, toggle, readout, button, playButton },
    audio,
  };

  root.EA = EA;
  if (typeof module !== 'undefined' && module.exports) module.exports = EA;
})(typeof window !== 'undefined' ? window : globalThis);
