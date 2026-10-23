/*
 * Elettronica intermedia: strumenti condivisi da tutti i capitoli.
 * DOM, numeri all'italiana, grafici da oscilloscopio, simboli dei circuiti (norma IEC),
 * correnti animate e il "banco" del laboratorio con cursori, strumenti e sfide.
 *
 * Nessuna dipendenza e nessun accesso al DOM a livello di modulo: il file si carica
 * anche in Node per i test dei modelli fisici dei capitoli.
 */
(function (root) {
  'use strict';

  const EI = root.EI || (root.EI = {});
  const SVGNS = 'http://www.w3.org/2000/svg';
  const hasDOM = typeof document !== 'undefined';

  /* ---------- registro dei capitoli ---------- */

  EI.chapters = EI.chapters || [];
  EI.chapter = function (def) {
    EI.chapters.push(def);
    return def;
  };

  /* ---------- matematica e numeri ---------- */

  EI.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  EI.lerp = (a, b, t) => a + (b - a) * t;
  // Avvicina dolcemente un valore al bersaglio (smorzamento esponenziale, indipendente dal frame rate).
  EI.approach = (cur, target, dt, rate) => target + (cur - target) * Math.exp(-(rate || 8) * dt);

  EI.num = function (x, digits) {
    if (!isFinite(x)) return '—';
    const d = digits == null ? 2 : digits;
    return x.toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });
  };

  const PREFIXES = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];

  // Valore con prefisso SI e cifre significative: EI.si(0.0047, 'A') → "4,70 mA".
  // opts: { sig: 3, trim: false (toglie gli zeri finali), prefix: true, signed: false }
  EI.si = function (x, unit, opts) {
    const o = opts || {};
    const u = unit || '';
    const sig = o.sig || 3;
    if (!isFinite(x)) return '—';
    const sign = x < 0 ? '−' : (o.signed && x > 0 ? '+' : '');
    let a = Math.abs(x);
    let p = '';
    if (o.prefix !== false && a !== 0) {
      let i = PREFIXES.findIndex(([f]) => a >= f);
      if (i < 0) i = PREFIXES.length - 1;
      let v = Number((a / PREFIXES[i][0]).toPrecision(sig));
      if (v >= 1000 && i > 0) { i -= 1; v = Number((a / PREFIXES[i][0]).toPrecision(sig)); }
      a = v;
      p = PREFIXES[i][1];
    } else if (a !== 0) a = Number(a.toPrecision(Math.max(sig, Math.floor(Math.log10(a)) + 1)));
    const dec = a === 0 ? sig - 1 : Math.max(0, sig - 1 - Math.floor(Math.log10(a)));
    let s = a.toLocaleString('it-IT', { minimumFractionDigits: o.trim ? 0 : dec, maximumFractionDigits: dec, useGrouping: false });
    return sign + s + (u || p ? ' ' + p + u : '');
  };

  // Serie commerciali dei componenti (resistenze, condensatori).
  EI.SERIES = {
    E6: [1.0, 1.5, 2.2, 3.3, 4.7, 6.8],
    E12: [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2],
  };
  EI.seriesValues = function (name, min, max) {
    const base = EI.SERIES[name] || EI.SERIES.E12;
    const out = [];
    for (let e = Math.floor(Math.log10(min)) - 1; e <= Math.ceil(Math.log10(max)); e++) {
      for (const b of base) {
        const v = Number((b * Math.pow(10, e)).toPrecision(3));
        if (v >= min * 0.999 && v <= max * 1.001) out.push(v);
      }
    }
    return out;
  };

  /* ---------- DOM e SVG ---------- */

  EI.h = function (tag, attrs) {
    const n = document.createElement(tag);
    const a = attrs || {};
    for (const k in a) {
      const v = a[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (let i = 2; i < arguments.length; i++) append(n, arguments[i]);
    return n;
  };
  function append(n, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach((x) => append(n, x));
    else n.append(c);
  }

  EI.s = function (tag, attrs, parent) {
    const n = document.createElementNS(SVGNS, tag);
    const a = attrs || {};
    for (const k in a) {
      const v = a[k];
      if (v == null || v === false) continue;
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.setAttribute('class', v);
      else n.setAttribute(k, v);
    }
    if (parent) parent.appendChild(n);
    return n;
  };

  // Crea un <svg> con viewBox; il disegno scala con il contenitore.
  EI.svg = function (w, h, attrs) {
    return EI.s('svg', Object.assign({ viewBox: '0 0 ' + w + ' ' + h, class: 'ei-svg' }, attrs || {}));
  };

  EI.reduced = function () {
    return hasDOM && !!root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  // Tempi e curve del movimento (gli stessi valori sono in style.css come --t-fast ecc.).
  EI.motion = { fast: 180, normal: 350, slow: 600, ease: 'cubic-bezier(.22, 1, .36, 1)' };

  // Testo dei capitoli: [[id-glossario|testo]] o [[id-glossario]] diventa un termine con definizione.
  EI.rich = function (str) {
    return String(str).replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (m, id, text) => {
      const g = EI.glossary && EI.glossary[id];
      const label = text || (g ? g.term.toLowerCase() : id);
      return '<a class="ei-term" href="#glossario/' + id + '" data-term="' + id + '">' + label + '</a>';
    });
  };
  EI.glossary = EI.glossary || {};

  /* ---------- colori ---------- */

  const FALLBACK = {
    bg: '#0b1210', grid: '#1d2b27', text: '#a9c3b9', ink: '#e8f2ee',
    t1: '#3ee08f', t2: '#ffc04d', t3: '#5cc8ff', t4: '#ff7aa8', wire: '#3a4d47',
  };
  let paletteCache = null;
  EI.palette = function () {
    if (paletteCache) return paletteCache;
    if (!hasDOM) return FALLBACK;
    const cs = getComputedStyle(document.documentElement);
    const v = (n, f) => cs.getPropertyValue(n).trim() || f;
    paletteCache = {
      bg: v('--scope-bg', FALLBACK.bg), grid: v('--scope-grid', FALLBACK.grid), text: v('--scope-text', FALLBACK.text),
      ink: v('--lab-ink', FALLBACK.ink), wire: v('--wire', FALLBACK.wire),
      t1: v('--trace-1', FALLBACK.t1), t2: v('--trace-2', FALLBACK.t2), t3: v('--trace-3', FALLBACK.t3), t4: v('--trace-4', FALLBACK.t4),
    };
    return paletteCache;
  };
  if (hasDOM && root.matchMedia) {
    root.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { paletteCache = null; });
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [128, 128, 128];
  }
  EI.mix = function (c1, c2, t) {
    const a = hexToRgb(c1);
    const b = hexToRgb(c2);
    const k = EI.clamp(t, 0, 1);
    return 'rgb(' + a.map((x, i) => Math.round(x + (b[i] - x) * k)).join(',') + ')';
  };

  // Colore di un filo in base alla sua tensione: grigio a 0 V, verde se positiva, rosa se negativa.
  EI.vcolor = function (v, vmax) {
    const p = EI.palette();
    const t = EI.clamp(Math.abs(v) / (vmax || 1), 0, 1);
    return EI.mix(p.wire, v >= 0 ? p.t1 : p.t4, Math.sqrt(t));
  };

  // Velocità delle cariche animate (px/s) in funzione della corrente: cresce con la radice per restare leggibile.
  EI.speedFor = function (i, imax) {
    const a = Math.abs(i) / (imax || 1);
    if (a < 1e-4) return 0;
    return Math.sign(i) * (18 + 190 * Math.sqrt(Math.min(1.5, a)));
  };

  /* ---------- grafico da oscilloscopio (canvas) ---------- */

  function niceStep(span, count) {
    const raw = span / Math.max(1, count);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    return (n < 1.5 ? 1 : n < 2.25 ? 2 : n < 3.5 ? 2.5 : n < 7.5 ? 5 : 10) * mag;
  }

  /*
   * new EI.Plot(canvas, {
   *   height: 220,
   *   x: { min, max, log, unit, label, div, fmt },
   *   y: { min, max, log, unit, label, div, fmt },
   *   y2: { ... } facoltativo, scala a destra
   * })
   * Disegno immediato a ogni frame: p.clear(); p.line(fn, { color }); p.point(x, y, {...}); ...
   */
  function Plot(canvas, opts) {
    this.canvas = canvas;
    this.opts = opts || {};
    this.opts.x = Object.assign({ min: 0, max: 1 }, this.opts.x);
    this.opts.y = Object.assign({ min: 0, max: 1 }, this.opts.y);
    if (this.opts.y2) this.opts.y2 = Object.assign({ min: 0, max: 1 }, this.opts.y2);
    this.ctx = canvas.getContext('2d');
    this.resize();
  }

  Plot.prototype.resize = function () {
    const dpr = root.devicePixelRatio || 1;
    const host = this.canvas.parentElement;
    const w = Math.max(220, Math.round((host && host.clientWidth) || this.canvas.clientWidth || 600));
    const h = this.opts.height || 200;
    if (w === this.w && h === this.h && dpr === this.dpr) return;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pad = Object.assign({ l: 52, r: this.opts.y2 ? 52 : 14, t: 12, b: 28 }, this.opts.pad);
    this.px0 = pad.l;
    this.px1 = w - pad.r;
    this.py0 = pad.t;
    this.py1 = h - pad.b;
  };

  Plot.prototype.axis = function (name) {
    return name === 'y2' ? this.opts.y2 : name === 'x' ? this.opts.x : this.opts.y;
  };
  Plot.prototype.setRange = function (name, min, max) {
    const a = this.axis(name);
    a.min = min;
    a.max = max;
  };

  function frac(a, v) {
    if (a.log) return (Math.log10(v) - Math.log10(a.min)) / (Math.log10(a.max) - Math.log10(a.min));
    return (v - a.min) / (a.max - a.min);
  }
  Plot.prototype.X = function (x) {
    return this.px0 + frac(this.opts.x, x) * (this.px1 - this.px0);
  };
  Plot.prototype.Y = function (y, ax) {
    const p = this.py1 - frac(ax || this.opts.y, y) * (this.py1 - this.py0);
    return EI.clamp(p, -1e4, 1e4);
  };
  Plot.prototype.invX = function (px) {
    const a = this.opts.x;
    const t = (px - this.px0) / (this.px1 - this.px0);
    if (a.log) return Math.pow(10, Math.log10(a.min) + t * (Math.log10(a.max) - Math.log10(a.min)));
    return a.min + t * (a.max - a.min);
  };

  function ticks(a) {
    if (a.log) {
      const out = [];
      for (let e = Math.floor(Math.log10(a.min)); e <= Math.ceil(Math.log10(a.max)); e++) {
        for (let m = 1; m < 10; m++) {
          const v = m * Math.pow(10, e);
          if (v >= a.min * 0.999 && v <= a.max * 1.001) out.push({ v: v, major: m === 1 });
        }
      }
      return out;
    }
    if (a.div) {
      const out = [];
      for (let k = 0; k <= a.div; k++) out.push({ v: a.min + (a.max - a.min) * k / a.div, major: true });
      return out;
    }
    const step = niceStep(a.max - a.min, a.count || 5);
    const out = [];
    for (let v = Math.ceil(a.min / step - 1e-9) * step; v <= a.max + step * 1e-6; v += step) out.push({ v: Math.abs(v) < step * 1e-9 ? 0 : v, major: true });
    return out;
  }

  function tickLabel(a, v) {
    if (a.fmt) return a.fmt(v);
    return EI.si(v, a.unit || '', { sig: 3, trim: true });
  }

  Plot.prototype.clear = function () {
    this.resize();
    const c = this.ctx;
    const p = EI.palette();
    const { px0, px1, py0, py1 } = this;
    c.save();
    c.fillStyle = p.bg;
    c.fillRect(0, 0, this.w, this.h);
    c.font = '600 10.5px ' + MONO;
    c.lineWidth = 1;

    const xs = ticks(this.opts.x);
    const ys = ticks(this.opts.y);
    // griglia
    for (const t of xs) {
      const x = Math.round(this.X(t.v)) + 0.5;
      c.strokeStyle = p.grid;
      c.globalAlpha = t.major ? 1 : 0.45;
      c.beginPath(); c.moveTo(x, py0); c.lineTo(x, py1); c.stroke();
    }
    for (const t of ys) {
      const y = Math.round(this.Y(t.v)) + 0.5;
      c.strokeStyle = p.grid;
      c.globalAlpha = t.major ? 1 : 0.45;
      c.beginPath(); c.moveTo(px0, y); c.lineTo(px1, y); c.stroke();
    }
    c.globalAlpha = 1;
    // asse dello zero più marcato
    if (!this.opts.y.log && this.opts.y.min < 0 && this.opts.y.max > 0) {
      c.strokeStyle = EI.mix(p.grid, p.text, 0.35);
      const y = Math.round(this.Y(0)) + 0.5;
      c.beginPath(); c.moveTo(px0, y); c.lineTo(px1, y); c.stroke();
    }
    c.strokeStyle = EI.mix(p.grid, p.text, 0.25);
    c.strokeRect(px0 + 0.5, py0 + 0.5, px1 - px0 - 1, py1 - py0 - 1);

    // etichette
    c.fillStyle = p.text;
    c.textAlign = 'center';
    c.textBaseline = 'top';
    let lastX = -1e9;
    for (const t of xs) {
      if (!t.major) continue;
      const x = this.X(t.v);
      const s = tickLabel(this.opts.x, t.v);
      const wTxt = c.measureText(s).width;
      if (x - wTxt / 2 < lastX + 6) continue;
      c.fillText(s, EI.clamp(x, px0 + wTxt / 2, px1 - wTxt / 2), py1 + 6);
      lastX = x + wTxt / 2;
    }
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    let lastY = 1e9;
    for (const t of ys) {
      if (!t.major) continue;
      const y = this.Y(t.v);
      if (Math.abs(y - lastY) < 13) continue;
      c.fillText(tickLabel(this.opts.y, t.v), px0 - 6, EI.clamp(y, py0 + 5, py1 - 5));
      lastY = y;
    }
    if (this.opts.y2) {
      c.textAlign = 'left';
      lastY = 1e9;
      for (const t of ticks(this.opts.y2)) {
        if (!t.major) continue;
        const y = this.Y(t.v, this.opts.y2);
        if (Math.abs(y - lastY) < 13) continue;
        c.fillStyle = this.opts.y2.color || p.text;
        c.fillText(tickLabel(this.opts.y2, t.v), px1 + 6, EI.clamp(y, py0 + 5, py1 - 5));
        lastY = y;
      }
    }
    // titoli degli assi
    c.font = '600 10.5px ' + SANS;
    c.fillStyle = p.text;
    if (this.opts.x.label) {
      c.textAlign = 'right';
      c.textBaseline = 'bottom';
      c.globalAlpha = 0.8;
      c.fillText(this.opts.x.label, px1 - 4, py1 - 4);
    }
    if (this.opts.y.label) {
      c.textAlign = 'left';
      c.textBaseline = 'top';
      c.globalAlpha = 0.8;
      c.fillText(this.opts.y.label, px0 + 6, py0 + 4);
    }
    c.restore();
  };

  Plot.prototype.clip = function () {
    const c = this.ctx;
    c.beginPath();
    c.rect(this.px0, this.py0, this.px1 - this.px0, this.py1 - this.py0);
    c.clip();
  };

  // src: funzione x → y (campionata a ogni 1,5 px) oppure array di [x, y].
  // st: { color, width, glow (true), dash, alpha, axis: 'y2', fill (colore dell'area sotto la curva), samples }
  Plot.prototype.line = function (src, st) {
    const s = st || {};
    const c = this.ctx;
    const ax = s.axis === 'y2' ? this.opts.y2 : this.opts.y;
    const pts = [];
    if (typeof src === 'function') {
      const n = s.samples || Math.ceil((this.px1 - this.px0) / 1.5);
      for (let i = 0; i <= n; i++) {
        const px = this.px0 + (this.px1 - this.px0) * i / n;
        const y = src(this.invX(px));
        pts.push(isFinite(y) ? [px, this.Y(y, ax)] : null);
      }
    } else {
      for (const q of src) pts.push(q && isFinite(q[1]) ? [this.X(q[0]), this.Y(q[1], ax)] : null);
    }
    c.save();
    this.clip();
    if (s.fill) {
      c.fillStyle = s.fill;
      c.globalAlpha = s.fillAlpha == null ? 0.14 : s.fillAlpha;
      const base = this.Y(s.fillTo == null ? Math.max(ax.min, Math.min(ax.max, 0)) : s.fillTo, ax);
      c.beginPath();
      let open = false;
      let firstX = 0;
      let lastX = 0;
      for (const q of pts) {
        if (!q) continue;
        if (!open) { c.moveTo(q[0], base); open = true; firstX = q[0]; }
        c.lineTo(q[0], q[1]);
        lastX = q[0];
      }
      if (open) { c.lineTo(lastX, base); c.lineTo(firstX, base); c.fill(); }
    }
    c.globalAlpha = s.alpha == null ? 1 : s.alpha;
    c.strokeStyle = s.color || EI.palette().t1;
    c.lineWidth = s.width || 2;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    if (s.dash) c.setLineDash(s.dash);
    if (s.glow !== false) { c.shadowColor = c.strokeStyle; c.shadowBlur = s.glowSize || 7; }
    c.beginPath();
    let pen = false;
    for (const q of pts) {
      if (!q) { pen = false; continue; }
      if (!pen) { c.moveTo(q[0], q[1]); pen = true; } else c.lineTo(q[0], q[1]);
    }
    c.stroke();
    c.restore();
  };

  Plot.prototype.point = function (x, y, st) {
    const s = st || {};
    const c = this.ctx;
    const px = this.X(x);
    const py = this.Y(y, s.axis === 'y2' ? this.opts.y2 : this.opts.y);
    const col = s.color || EI.palette().t2;
    c.save();
    this.clip();
    if (s.ring !== false) {
      c.globalAlpha = 0.25;
      c.fillStyle = col;
      c.beginPath(); c.arc(px, py, (s.r || 5) + 6, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 10;
    c.beginPath(); c.arc(px, py, s.r || 5, 0, Math.PI * 2); c.fill();
    c.restore();
    if (s.label) this.tag(px, py, s.label, col, s.labelPos);
  };

  // Linea orizzontale o verticale di riferimento, con etichetta facoltativa.
  Plot.prototype.hline = function (y, st) {
    const s = st || {};
    const ax = s.axis === 'y2' ? this.opts.y2 : this.opts.y;
    const py = Math.round(this.Y(y, ax)) + 0.5;
    const c = this.ctx;
    c.save();
    this.clip();
    c.strokeStyle = s.color || EI.palette().text;
    c.globalAlpha = s.alpha == null ? 0.8 : s.alpha;
    c.lineWidth = s.width || 1;
    c.setLineDash(s.dash || [5, 4]);
    c.beginPath(); c.moveTo(this.px0, py); c.lineTo(this.px1, py); c.stroke();
    c.restore();
    if (s.label) this.tag(s.at === 'left' ? this.px0 + 6 : this.px1 - 6, py, s.label, s.color, s.at === 'left' ? 'right-up' : 'left-up');
  };
  Plot.prototype.vline = function (x, st) {
    const s = st || {};
    const px = Math.round(this.X(x)) + 0.5;
    const c = this.ctx;
    c.save();
    this.clip();
    c.strokeStyle = s.color || EI.palette().text;
    c.globalAlpha = s.alpha == null ? 0.8 : s.alpha;
    c.lineWidth = s.width || 1;
    c.setLineDash(s.dash || [5, 4]);
    c.beginPath(); c.moveTo(px, this.py0); c.lineTo(px, this.py1); c.stroke();
    c.restore();
    if (s.label) this.tag(px, this.py0 + 10, s.label, s.color, 'right');
  };
  Plot.prototype.band = function (y0, y1, st) {
    const s = st || {};
    const ax = s.axis === 'y2' ? this.opts.y2 : this.opts.y;
    const c = this.ctx;
    c.save();
    this.clip();
    c.fillStyle = s.color || EI.palette().t3;
    c.globalAlpha = s.alpha == null ? 0.12 : s.alpha;
    const a = this.Y(y0, ax);
    const b = this.Y(y1, ax);
    c.fillRect(this.px0, Math.min(a, b), this.px1 - this.px0, Math.abs(b - a));
    c.restore();
  };
  Plot.prototype.vband = function (x0, x1, st) {
    const s = st || {};
    const c = this.ctx;
    c.save();
    this.clip();
    c.fillStyle = s.color || EI.palette().t3;
    c.globalAlpha = s.alpha == null ? 0.12 : s.alpha;
    const a = this.X(x0);
    const b = this.X(x1);
    c.fillRect(Math.min(a, b), this.py0, Math.abs(b - a), this.py1 - this.py0);
    c.restore();
  };

  // Etichetta con fondino, in coordinate pixel. pos: 'right' | 'left' | 'right-up' | 'left-up' | 'up' | 'down'
  Plot.prototype.tag = function (px, py, text, color, pos) {
    const c = this.ctx;
    const p = EI.palette();
    c.save();
    c.font = '700 11px ' + MONO;
    const w = c.measureText(text).width + 10;
    const hgt = 18;
    let x = px + 8;
    let y = py - hgt / 2;
    if (pos === 'left') x = px - 8 - w;
    if (pos === 'right-up') { x = px + 4; y = py - hgt - 4; }
    if (pos === 'left-up') { x = px - w - 4; y = py - hgt - 4; }
    if (pos === 'up') { x = px - w / 2; y = py - hgt - 10; }
    if (pos === 'down') { x = px - w / 2; y = py + 10; }
    x = EI.clamp(x, this.px0 + 2, this.px1 - w - 2);
    y = EI.clamp(y, this.py0 + 2, this.py1 - hgt - 2);
    c.fillStyle = p.bg;
    c.globalAlpha = 0.88;
    roundRect(c, x, y, w, hgt, 5);
    c.fill();
    c.globalAlpha = 1;
    c.strokeStyle = color || p.text;
    c.lineWidth = 1;
    roundRect(c, x + 0.5, y + 0.5, w - 1, hgt - 1, 5);
    c.stroke();
    c.fillStyle = color || p.ink;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.fillText(text, x + 5, y + hgt / 2 + 0.5);
    c.restore();
  };

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  EI.Plot = Plot;

  /* ---------- cariche che scorrono lungo un filo ---------- */

  /*
   * const f = new EI.Flow(gruppoSvg, pathSvg, { spacing: 18, r: 2.6, cls: 'hot' })
   * f.set(velocità in px/s, con segno: negativa = verso opposto), f.step(dt) a ogni frame.
   * Con il movimento ridotto le cariche restano ferme e diventano frecce che indicano il verso.
   */
  function Flow(parent, path, opts) {
    const o = opts || {};
    this.path = path;
    this.spacing = o.spacing || 18;
    this.r = o.r || 2.6;
    this.reduced = EI.reduced();
    this.g = EI.s('g', { class: 'ei-flow' + (o.cls ? ' ' + o.cls : ''), 'aria-hidden': 'true' }, parent);
    this.offset = o.phase || 0;
    this.speed = 0;
    this.dots = [];
    this.measure();
  }
  Flow.prototype.measure = function () {
    const L = this.path.getTotalLength();
    this.len = L;
    const n = Math.max(2, Math.round(L / 3));
    this.n = n;
    this.pts = new Float32Array((n + 1) * 2);
    for (let i = 0; i <= n; i++) {
      const q = this.path.getPointAtLength(L * i / n);
      this.pts[i * 2] = q.x;
      this.pts[i * 2 + 1] = q.y;
    }
    const count = Math.max(1, Math.floor(L / this.spacing));
    this.g.innerHTML = '';
    this.dots = [];
    for (let k = 0; k < count; k++) {
      const d = this.reduced
        ? EI.s('path', { d: 'M-3.5 -3.5 L2 0 L-3.5 3.5', class: 'ei-flow-arrow' }, this.g)
        : EI.s('circle', { r: this.r, class: 'ei-flow-dot' }, this.g);
      this.dots.push(d);
    }
    this.place();
  };
  Flow.prototype.at = function (d) {
    const t = EI.clamp(d / this.len, 0, 1) * this.n;
    const i = Math.min(this.n - 1, Math.floor(t));
    const f = t - i;
    const p = this.pts;
    return [p[i * 2] + (p[i * 2 + 2] - p[i * 2]) * f, p[i * 2 + 1] + (p[i * 2 + 3] - p[i * 2 + 1]) * f, Math.atan2(p[i * 2 + 3] - p[i * 2 + 1], p[i * 2 + 2] - p[i * 2])];
  };
  Flow.prototype.set = function (speed) {
    this.speed = speed || 0;
    const on = Math.abs(this.speed) > 0.5;
    this.g.classList.toggle('idle', !on);
    if (this.reduced) this.place();
  };
  Flow.prototype.step = function (dt) {
    if (!this.reduced && dt) {
      this.offset = (this.offset + this.speed * dt) % this.spacing;
      if (this.offset < 0) this.offset += this.spacing;
    }
    this.place();
  };
  Flow.prototype.place = function () {
    const sp = this.spacing;
    for (let k = 0; k < this.dots.length; k++) {
      const d = this.offset + k * sp + (this.reduced ? sp / 2 : 0);
      const q = this.at(d % this.len);
      if (this.reduced) {
        const ang = q[2] * 180 / Math.PI + (this.speed < 0 ? 180 : 0);
        this.dots[k].setAttribute('transform', 'translate(' + q[0].toFixed(1) + ',' + q[1].toFixed(1) + ') rotate(' + ang.toFixed(0) + ')');
      } else {
        this.dots[k].setAttribute('cx', q[0].toFixed(1));
        this.dots[k].setAttribute('cy', q[1].toFixed(1));
      }
    }
  };
  EI.Flow = Flow;

  /* ---------- simboli dei circuiti (IEC) ---------- */

  /*
   * Ogni simbolo a due terminali è disegnato in orizzontale da (0,0) a (len,0) e poi
   * spostato e ruotato: { x, y, rot: 0 | 90 | 180 | 270, len }. Restituisce
   * { g, a: [x,y], b: [x,y], ... } con le coordinate dei terminali nel disegno.
   * Le etichette restano sempre orizzontali: { label: 'R1', value: '1 kΩ', side: 1 | -1 }.
   */
  const sym = {};
  EI.sym = sym;

  function rotPt(o, px, py) {
    const a = (o.rot || 0) * Math.PI / 180;
    const c = Math.round(Math.cos(a) * 1e6) / 1e6;
    const s = Math.round(Math.sin(a) * 1e6) / 1e6;
    return [o.x + px * c - py * s, o.y + px * s + py * c];
  }
  sym.at = rotPt;

  function group(parent, o, cls) {
    return EI.s('g', { class: 'ei-sym ' + cls + (o.cls ? ' ' + o.cls : ''), transform: 'translate(' + o.x + ',' + o.y + ') rotate(' + (o.rot || 0) + ')' }, parent);
  }

  // Etichetta perpendicolare al simbolo, sempre leggibile.
  function labels(parent, o, len, off) {
    if (!o.label && !o.value) return null;
    const side = o.side || 1;
    const [lx, ly] = rotPt(o, len / 2, -side * (off || 18));
    const vertical = Math.abs(Math.sin((o.rot || 0) * Math.PI / 180)) > 0.5;
    const anchor = vertical ? ((side > 0) === ((o.rot || 0) === 90) ? 'start' : 'end') : 'middle';
    const t = EI.s('text', { x: lx, y: ly, class: 'ei-sym-label', 'text-anchor': anchor, 'dominant-baseline': vertical ? 'middle' : 'auto' }, parent);
    if (o.label) EI.s('tspan', { class: 'name', text: o.label }, t);
    if (o.value) {
      if (o.label) {
        if (vertical) EI.s('tspan', { dx: 6, class: 'value', text: o.value }, t);
        else EI.s('tspan', { x: lx, dy: side > 0 ? '-1.15em' : '1.15em', class: 'value', text: o.value }, t);
      } else EI.s('tspan', { class: 'value', text: o.value }, t);
    }
    if (!vertical && o.label && o.value && side > 0) {
      // valore sopra il nome: scambia per avere il nome più vicino al simbolo
      t.firstChild.setAttribute('dy', '0');
    }
    return t;
  }

  function twoPin(parent, o, cls, len, draw, labelOff) {
    const g = group(parent, o, cls);
    draw(g, len / 2);
    const out = { g: g, a: rotPt(o, 0, 0), b: rotPt(o, len, 0), mid: rotPt(o, len / 2, 0) };
    out.label = labels(parent, o, len, labelOff);
    return out;
  }

  sym.resistor = function (parent, o) {
    const len = o.len || 64;
    return twoPin(parent, o, 'resistor', len, (g, c) => {
      EI.s('path', { d: 'M0 0H' + (c - 17) + 'M' + (c + 17) + ' 0H' + len, class: 'lead' }, g);
      EI.s('rect', { x: c - 17, y: -6.5, width: 34, height: 13, rx: 1.5, class: 'body-open' }, g);
      if (o.variable) EI.s('path', { d: 'M' + (c - 16) + ' 12L' + (c + 14) + ' -12M' + (c + 14) + ' -12l-7 1.5M' + (c + 14) + ' -12l-1.5 7', class: 'lead' }, g);
    }, 17);
  };

  sym.capacitor = function (parent, o) {
    const len = o.len || 48;
    return twoPin(parent, o, 'capacitor' + (o.polar ? ' polar' : ''), len, (g, c) => {
      EI.s('path', { d: 'M0 0H' + (c - 4) + 'M' + (c + 4) + ' 0H' + len, class: 'lead' }, g);
      if (o.polar) {
        EI.s('rect', { x: c - 6, y: -14, width: 3.5, height: 28, class: 'plate-open' }, g);
        EI.s('rect', { x: c + 3, y: -14, width: 3.5, height: 28, class: 'plate' }, g);
        EI.s('path', { d: 'M' + (c - 15) + ' -14h6M' + (c - 12) + ' -17v6', class: 'lead thin' }, g);
      } else {
        EI.s('path', { d: 'M' + (c - 4) + ' -14V14M' + (c + 4) + ' -14V14', class: 'lead plate-line' }, g);
      }
    }, 22);
  };

  sym.inductor = function (parent, o) {
    const len = o.len || 72;
    return twoPin(parent, o, 'inductor', len, (g, c) => {
      EI.s('path', { d: 'M0 0H' + (c - 24) + 'a6 6 0 0 1 12 0a6 6 0 0 1 12 0a6 6 0 0 1 12 0a6 6 0 0 1 12 0H' + len, class: 'lead' }, g);
    }, 14);
  };

  // kind: 'diode' | 'led' | 'zener'. Anodo in a, catodo in b. Il LED restituisce setGlow(0..1, colore).
  sym.diode = function (parent, o) {
    const len = o.len || 56;
    const kind = o.kind || 'diode';
    let glow = null;
    let body = null;
    const out = twoPin(parent, o, 'diode ' + kind, len, (g, c) => {
      if (kind === 'led') glow = EI.s('circle', { cx: c, cy: 0, r: 22, class: 'led-glow' }, g);
      EI.s('path', { d: 'M0 0H' + (c - 10) + 'M' + (c + 10) + ' 0H' + len, class: 'lead' }, g);
      body = EI.s('path', { d: 'M' + (c - 10) + ' -10L' + (c + 10) + ' 0L' + (c - 10) + ' 10Z', class: 'body tri' }, g);
      if (kind === 'zener') EI.s('path', { d: 'M' + (c + 5) + ' -13L' + (c + 10) + ' -10V10L' + (c + 15) + ' 13', class: 'lead bar' }, g);
      else EI.s('path', { d: 'M' + (c + 10) + ' -11V11', class: 'lead bar' }, g);
      if (kind === 'led') {
        EI.s('path', { d: 'M' + (c - 1) + ' -14l7 -9m0 0l-5.5 1.5m5.5 -1.5l-1 5.5M' + (c + 6) + ' -11l7 -9m0 0l-5.5 1.5m5.5 -1.5l-1 5.5', class: 'lead thin rays' }, g);
      }
    }, 20);
    out.body = body;
    out.setGlow = function (k, color) {
      if (!glow) return;
      const a = EI.clamp(k, 0, 1);
      glow.style.fill = color || '#ff3b30';
      glow.style.opacity = (a * 0.85).toFixed(3);
      body.style.fill = a > 0.02 ? (color || '#ff3b30') : '';
      body.style.filter = a > 0.02 ? 'drop-shadow(0 0 ' + (2 + 8 * a).toFixed(1) + 'px ' + (color || '#ff3b30') + ')' : '';
    };
    return out;
  };

  // Transistor bipolare. Terminali: b (base, a sinistra), c (collettore, in alto), e (emettitore, in basso).
  sym.bjt = function (parent, o) {
    const pnp = o.type === 'pnp';
    const g = group(parent, o, 'bjt ' + (pnp ? 'pnp' : 'npn'));
    if (o.circle !== false) EI.s('circle', { cx: 6, cy: 0, r: 25, class: 'case' }, g);
    EI.s('path', { d: 'M-34 0H0M0 -15V15M0 -7L20 -21V-44M0 7L20 21V44', class: 'lead' }, g);
    EI.s('path', { d: 'M0 -15V15', class: 'lead base-bar' }, g);
    // freccia sull'emettitore: uscente per NPN, entrante per PNP
    const arrow = pnp ? 'M3.5 9.5L12 9L8.5 17Z' : 'M18.5 20L9.5 18.5L13.5 11Z';
    EI.s('path', { d: arrow, class: 'body arrow' }, g);
    const out = { g: g, b: rotPt(o, -34, 0), c: rotPt(o, 20, -44), e: rotPt(o, 20, 44) };
    if (o.label) {
      const [lx, ly] = rotPt(o, 38, 0);
      EI.s('text', { x: lx, y: ly, class: 'ei-sym-label', 'dominant-baseline': 'middle', text: o.label }, parent);
    }
    return out;
  };

  // MOSFET a canale N ad arricchimento. Terminali: g (gate), d (drain, in alto), s (source, in basso).
  // setChannel(0..1) mostra il canale che si forma.
  sym.nmos = function (parent, o) {
    const g = group(parent, o, 'mosfet');
    EI.s('path', { d: 'M-34 12H-8M-8 -16V16', class: 'lead' }, g);
    const channel = EI.s('rect', { x: -2.5, y: -17, width: 5, height: 34, rx: 2, class: 'channel' }, g);
    EI.s('path', { d: 'M0 -17V-8M0 -4.5V4.5M0 8V17', class: 'lead seg' }, g);
    EI.s('path', { d: 'M0 -12.5H18V-44M0 12.5H18V44M0 0H18V12.5', class: 'lead' }, g);
    EI.s('path', { d: 'M2 0L10 -4.5V4.5Z', class: 'body arrow' }, g);
    const out = { g: g, g_: rotPt(o, -34, 12), gate: rotPt(o, -34, 12), d: rotPt(o, 18, -44), s: rotPt(o, 18, 44) };
    out.setChannel = function (k) {
      channel.style.opacity = EI.clamp(k, 0, 1).toFixed(3);
    };
    out.setChannel(0);
    if (o.label) {
      const [lx, ly] = rotPt(o, 30, 0);
      EI.s('text', { x: lx, y: ly, class: 'ei-sym-label', 'dominant-baseline': 'middle', text: o.label }, parent);
    }
    return out;
  };

  // Amplificatore operazionale. Terminali: inv (−), non (+), out, vp, vn. Con swap il + va in alto.
  sym.opamp = function (parent, o) {
    const g = group(parent, o, 'opamp');
    EI.s('path', { d: 'M0 -36L66 0L0 36Z', class: 'body tri-open' }, g);
    const yi = o.swap ? 16 : -16;
    const yn = -yi;
    EI.s('path', { d: 'M-22 ' + yi + 'H0M-22 ' + yn + 'H0M66 0H88', class: 'lead' }, g);
    EI.s('path', { d: 'M7 ' + yi + 'h9', class: 'lead thin' }, g);
    EI.s('path', { d: 'M7 ' + yn + 'h9M11.5 ' + (yn - 4.5) + 'v9', class: 'lead thin' }, g);
    if (o.supply) EI.s('path', { d: 'M33 -18V-36M33 18V36', class: 'lead' }, g);
    const out = {
      g: g, inv: rotPt(o, -22, yi), non: rotPt(o, -22, yn), out: rotPt(o, 88, 0),
      vp: rotPt(o, 33, -36), vn: rotPt(o, 33, 36),
    };
    if (o.label) {
      const [lx, ly] = rotPt(o, 26, o.supply ? -44 : -42);
      EI.s('text', { x: lx, y: ly, class: 'ei-sym-label', 'text-anchor': 'middle', text: o.label }, parent);
    }
    return out;
  };

  // Generatori. kind: 'dc' (pila: tratto lungo = +), 'ac' (sinusoide), 'square' (onda quadra). Terminali p (+) in a, n in b.
  sym.source = function (parent, o) {
    const kind = o.kind || 'dc';
    const len = o.len || 60;
    return twoPin(parent, o, 'source ' + kind, len, (g, c) => {
      if (kind === 'dc') {
        EI.s('path', { d: 'M0 0H' + (c - 3) + 'M' + (c + 4) + ' 0H' + len, class: 'lead' }, g);
        EI.s('path', { d: 'M' + (c - 3) + ' -15V15', class: 'lead plate-line' }, g);
        EI.s('path', { d: 'M' + (c + 4) + ' -8V8', class: 'lead thick' }, g);
        EI.s('path', { d: 'M' + (c - 12) + ' -17h6M' + (c - 9) + ' -20v6', class: 'lead thin' }, g);
      } else {
        EI.s('path', { d: 'M0 0H' + (c - 17) + 'M' + (c + 17) + ' 0H' + len, class: 'lead' }, g);
        EI.s('circle', { cx: c, cy: 0, r: 17, class: 'body-open' }, g);
        const wave = kind === 'square' ? 'M' + (c - 9) + ' 5V-5H' + c + 'V5H' + (c + 9) + 'V-5' : 'M' + (c - 10) + ' 0q5 -12 10 0t10 0';
        EI.s('path', { d: wave, class: 'lead thin', transform: 'rotate(' + (-(o.rot || 0)) + ' ' + c + ' 0)' }, g);
      }
    }, 26);
  };

  // Massa: il terminale è nel punto (x, y), il simbolo si disegna sotto.
  sym.ground = function (parent, o) {
    const g = EI.s('g', { class: 'ei-sym ground', transform: 'translate(' + o.x + ',' + o.y + ')' }, parent);
    EI.s('path', { d: 'M0 0V9M-12 9H12M-7.5 14H7.5M-3 19H3', class: 'lead' }, g);
    return { g: g, a: [o.x, o.y] };
  };

  // Lampadina con alone luminoso: setGlow(0..1).
  sym.lamp = function (parent, o) {
    const len = o.len || 56;
    let glow = null;
    const out = twoPin(parent, o, 'lamp', len, (g, c) => {
      glow = EI.s('circle', { cx: c, cy: 0, r: 26, class: 'lamp-glow' }, g);
      EI.s('path', { d: 'M0 0H' + (c - 12) + 'M' + (c + 12) + ' 0H' + len, class: 'lead' }, g);
      EI.s('circle', { cx: c, cy: 0, r: 12, class: 'body-open' }, g);
      EI.s('path', { d: 'M' + (c - 8.5) + ' -8.5L' + (c + 8.5) + ' 8.5M' + (c - 8.5) + ' 8.5L' + (c + 8.5) + ' -8.5', class: 'lead thin' }, g);
    }, 22);
    out.setGlow = function (k) { glow.style.opacity = (EI.clamp(k, 0, 1) * 0.9).toFixed(3); };
    out.setGlow(0);
    return out;
  };

  // Interruttore semplice: set(true) chiuso.
  sym.switch = function (parent, o) {
    const len = o.len || 64;
    let lever = null;
    const out = twoPin(parent, o, 'switch', len, (g, c) => {
      EI.s('path', { d: 'M0 0H' + (c - 15) + 'M' + (c + 15) + ' 0H' + len, class: 'lead' }, g);
      EI.s('circle', { cx: c - 15, cy: 0, r: 2.8, class: 'body' }, g);
      EI.s('circle', { cx: c + 15, cy: 0, r: 2.8, class: 'body' }, g);
      lever = EI.s('path', { d: 'M' + (c - 15) + ' 0H' + (c + 16), class: 'lead lever', style: 'transform-origin:' + (c - 15) + 'px 0px' }, g);
    }, 20);
    out.set = function (closed) { lever.style.transform = closed ? 'rotate(0deg)' : 'rotate(-28deg)'; };
    out.set(!!o.closed);
    return out;
  };

  // Deviatore: comune in c, due contatti t1 (sopra) e t2 (sotto). set(1) o set(2).
  sym.spdt = function (parent, o) {
    const g = group(parent, o, 'switch spdt');
    EI.s('path', { d: 'M0 0H14M48 -16H64M48 16H64', class: 'lead' }, g);
    EI.s('circle', { cx: 14, cy: 0, r: 2.8, class: 'body' }, g);
    EI.s('circle', { cx: 48, cy: -16, r: 2.8, class: 'body' }, g);
    EI.s('circle', { cx: 48, cy: 16, r: 2.8, class: 'body' }, g);
    const lever = EI.s('path', { d: 'M14 0L49 -16', class: 'lead lever', style: 'transform-origin:14px 0px' }, g);
    const out = { g: g, c: rotPt(o, 0, 0), t1: rotPt(o, 64, -16), t2: rotPt(o, 64, 16) };
    out.set = function (which) { lever.style.transform = which === 2 ? 'rotate(' + (2 * Math.atan2(16, 35) * 180 / Math.PI).toFixed(2) + 'deg)' : 'rotate(0deg)'; };
    out.set(o.pos || 1);
    if (o.label) {
      const [lx, ly] = rotPt(o, 30, -26);
      EI.s('text', { x: lx, y: ly, class: 'ei-sym-label', 'text-anchor': 'middle', text: o.label }, parent);
    }
    return out;
  };

  // Trasformatore: primario a sinistra (p1 sopra, p2 sotto), secondario a destra (s1, s2).
  sym.transformer = function (parent, o) {
    const g = group(parent, o, 'transformer');
    const coil = (x, dir) => 'M' + x + ' -30' + 'a7.5 7.5 0 0 ' + (dir > 0 ? 1 : 0) + ' 0 15'.repeat(1) + ('a7.5 7.5 0 0 ' + (dir > 0 ? 1 : 0) + ' 0 15').repeat(3);
    EI.s('path', { d: 'M-24 -30H0M-24 30H0' + coil(0, 1), class: 'lead' }, g);
    EI.s('path', { d: 'M40 -30H64M40 30H64' + coil(40, -1), class: 'lead' }, g);
    EI.s('path', { d: 'M17 -32V32M23 -32V32', class: 'lead core' }, g);
    const out = { g: g, p1: rotPt(o, -24, -30), p2: rotPt(o, -24, 30), s1: rotPt(o, 64, -30), s2: rotPt(o, 64, 30) };
    if (o.label) {
      const [lx, ly] = rotPt(o, 20, -42);
      EI.s('text', { x: lx, y: ly, class: 'ei-sym-label', 'text-anchor': 'middle', text: o.label }, parent);
    }
    return out;
  };

  // Strumento di misura: kind 'V' o 'A'. Terminali a, b.
  sym.meter = function (parent, o) {
    const len = o.len || 56;
    return twoPin(parent, o, 'meter', len, (g, c) => {
      EI.s('path', { d: 'M0 0H' + (c - 13) + 'M' + (c + 13) + ' 0H' + len, class: 'lead' }, g);
      EI.s('circle', { cx: c, cy: 0, r: 13, class: 'body-open' }, g);
      EI.s('text', { x: c, y: 0.5, class: 'ei-sym-glyph', 'text-anchor': 'middle', 'dominant-baseline': 'middle', transform: 'rotate(' + (-(o.rot || 0)) + ' ' + c + ' 0)', text: o.kind || 'V' }, g);
    }, 22);
  };

  /*
   * Circuito integrato (per esempio il 555 o il 7805):
   * sym.ic(svg, { x, y, w, h, label, sub, pins: [{ id: 'vcc', name: '8', side: 'top'|'bottom'|'left'|'right', at: 0..1 }] })
   * Restituisce i terminali per id: out.vcc = [x, y] all'estremità del piedino.
   */
  sym.ic = function (parent, o) {
    const g = EI.s('g', { class: 'ei-sym ic' + (o.cls ? ' ' + o.cls : ''), transform: 'translate(' + o.x + ',' + o.y + ')' }, parent);
    const w = o.w || 120;
    const hgt = o.h || 120;
    EI.s('rect', { x: 0, y: 0, width: w, height: hgt, rx: 6, class: 'chip' }, g);
    EI.s('path', { d: 'M' + (w / 2 - 9) + ' 0a9 9 0 0 0 18 0', class: 'notch' }, g);
    if (o.label) EI.s('text', { x: w / 2, y: hgt / 2 - (o.sub ? 6 : 0), class: 'ei-ic-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: o.label }, g);
    if (o.sub) EI.s('text', { x: w / 2, y: hgt / 2 + 13, class: 'ei-ic-sub', 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: o.sub }, g);
    const out = { g: g };
    const L = 14;
    for (const p of o.pins || []) {
      let x1;
      let y1;
      let x2;
      let y2;
      let tx;
      let ty;
      let anchor = 'middle';
      if (p.side === 'left') { x1 = 0; y1 = hgt * p.at; x2 = -L; y2 = y1; tx = 6; ty = y1; anchor = 'start'; }
      else if (p.side === 'right') { x1 = w; y1 = hgt * p.at; x2 = w + L; y2 = y1; tx = w - 6; ty = y1; anchor = 'end'; }
      else if (p.side === 'top') { x1 = w * p.at; y1 = 0; x2 = x1; y2 = -L; tx = x1; ty = 12; }
      else { x1 = w * p.at; y1 = hgt; x2 = x1; y2 = hgt + L; tx = x1; ty = hgt - 11; }
      EI.s('path', { d: 'M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2, class: 'lead' }, g);
      if (p.name) EI.s('text', { x: tx, y: ty, class: 'ei-ic-pin', 'text-anchor': anchor, 'dominant-baseline': 'middle', text: p.name }, g);
      out[p.id] = [o.x + x2, o.y + y2];
    }
    return out;
  };

  // Punto di misura cliccabile (sonda dell'oscilloscopio). onClick riceve l'id.
  sym.probe = function (parent, o) {
    const g = EI.s('g', { class: 'ei-probe', transform: 'translate(' + o.x + ',' + o.y + ')', tabindex: 0, role: 'button', 'aria-label': o.aria || ('Misura in ' + (o.label || '')), 'aria-pressed': 'false' }, parent);
    g.style.setProperty('--pc', o.color || 'var(--trace-2)');
    EI.s('circle', { r: 11, class: 'halo' }, g);
    EI.s('circle', { r: 5, class: 'tip' }, g);
    if (o.label) EI.s('text', { x: 0, y: o.labelBelow ? 23 : -15, class: 'ei-probe-label', 'text-anchor': 'middle', text: o.label }, g);
    const fire = (e) => { if (o.onClick) { e.preventDefault(); o.onClick(o.id); } };
    g.addEventListener('click', fire);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fire(e); });
    return {
      g: g,
      set(active) { g.classList.toggle('active', !!active); g.setAttribute('aria-pressed', active ? 'true' : 'false'); },
    };
  };

  // Filo: points = [[x,y], ...] oppure una stringa d. Restituisce il <path>, utile anche per EI.Flow.
  EI.wire = function (parent, points, opts) {
    const o = opts || {};
    const d = typeof points === 'string' ? points : points.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join('');
    return EI.s('path', { d: d, class: 'ei-wire' + (o.cls ? ' ' + o.cls : '') }, parent);
  };
  EI.dot = function (parent, x, y) {
    return EI.s('circle', { cx: x, cy: y, r: 3.6, class: 'ei-node' }, parent);
  };
  EI.label = function (parent, x, y, text, opts) {
    const o = opts || {};
    return EI.s('text', { x: x, y: y, class: 'ei-sym-label' + (o.cls ? ' ' + o.cls : ''), 'text-anchor': o.anchor || 'middle', 'dominant-baseline': o.baseline || 'middle', text: text }, parent);
  };

  // Icone dei capitoli: un simbolo in un riquadro 64×64.
  EI.icon = function (name) {
    const svg = EI.svg(64, 64, { class: 'ei-icon', 'aria-hidden': 'true' });
    const map = {
      lattice: () => {
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) EI.s('circle', { cx: 16 + i * 16, cy: 16 + j * 16, r: i === 1 && j === 1 ? 5 : 4, class: i === 1 && j === 1 ? 'hot' : '' }, svg);
        EI.s('path', { d: 'M16 16H48M16 32H48M16 48H48M16 16V48M32 16V48M48 16V48', class: 'thin' }, svg);
      },
      diode: () => sym.diode(svg, { x: 4, y: 32, len: 56 }),
      led: () => sym.diode(svg, { x: 4, y: 36, len: 56, kind: 'led' }),
      bjt: () => sym.bjt(svg, { x: 26, y: 32, circle: true }),
      mosfet: () => sym.nmos(svg, { x: 28, y: 32 }),
      capacitor: () => sym.capacitor(svg, { x: 4, y: 32, len: 56 }),
      opamp: () => sym.opamp(svg, { x: 14, y: 32 }),
      wave: () => EI.s('path', { d: 'M6 40V20H18V40H30V20H42V40H54V20', class: 'thick' }, svg),
      supply: () => {
        EI.s('path', { d: 'M6 32q6 -18 12 0t12 0', class: 'thick' }, svg);
        EI.s('path', { d: 'M36 26h22M36 38h22', class: 'thick' }, svg);
      },
    };
    (map[name] || map.diode)();
    return svg;
  };

  // Filtri SVG condivisi (bagliore), inseriti una sola volta nel documento.
  EI.defs = function () {
    if (!hasDOM || document.getElementById('ei-defs')) return;
    const svg = EI.s('svg', { id: 'ei-defs', width: 0, height: 0, 'aria-hidden': 'true', style: 'position:absolute;width:0;height:0;overflow:hidden' });
    svg.innerHTML =
      '<defs>' +
      '<filter id="ei-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="ei-glow-strong" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<radialGradient id="ei-hot"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '</defs>';
    document.body.appendChild(svg);
  };

  /* ---------- il banco del laboratorio ---------- */

  const SFIDE = 'ei-sfide';
  EI.loadDone = function () {
    try { return new Set(JSON.parse(localStorage.getItem(SFIDE) || '[]')); } catch (e) { return new Set(); }
  };
  function saveDone(set) {
    try { localStorage.setItem(SFIDE, JSON.stringify([...set])); } catch (e) { /* archivio non disponibile */ }
  }

  /*
   * const lab = EI.lab(contenitore, { title, chapter, layout: 'side' | 'stack', viewBox: [w, h] })
   * lab.svg        il disegno del circuito (viewBox già impostato)
   * lab.readout()  strumenti digitali; lab.explain() spiegazione dal vivo
   * lab.plot()     grafici; lab.slider() / choice() / toggle() / button() comandi
   * lab.challenges() e lab.check(stato) per le sfide
   * lab.loop(fn)   animazione: fn(dt, t). Si ferma da sola fuori schermo o con la scheda nascosta.
   *                Con il movimento ridotto fn viene chiamata solo dopo lab.invalidate(), con dt = 0.
   */
  function Lab(container, opts) {
    const h = EI.h;
    EI.defs();
    this.opts = opts || {};
    this.reduced = EI.reduced();
    this.chapter = this.opts.chapter || 'lab';
    this.frames = [];
    this.cleanups = [];
    this.plots = [];
    this.items = [];
    this.paused = false;
    this.visible = true;
    this.t = 0;
    this.raf = 0;
    this.dirty = true;
    const layout = this.opts.layout || 'side';

    this.pauseBtn = h('button', { type: 'button', class: 'ei-lab-btn', 'aria-label': 'Metti in pausa l\'animazione', title: 'Pausa', onclick: () => this.setPaused(!this.paused) }, '⏸');
    this.resetBtn = h('button', { type: 'button', class: 'ei-lab-btn', 'aria-label': 'Riporta il laboratorio ai valori iniziali', title: 'Ricomincia', onclick: () => this.reset() }, '↺');
    this.svg = EI.svg(this.opts.viewBox ? this.opts.viewBox[0] : 640, this.opts.viewBox ? this.opts.viewBox[1] : 320, { class: 'ei-svg ei-stage-svg', role: 'img', 'aria-label': this.opts.svgLabel || ('Schema: ' + (this.opts.title || 'circuito')) });
    this.readouts = h('div', { class: 'ei-readouts' });
    this.explainEl = h('p', { class: 'ei-explain', 'aria-live': 'polite' });
    this.plotsEl = h('div', { class: 'ei-plots' });
    this.controls = h('div', { class: 'ei-controls' });
    this.challengesEl = h('div', { class: 'ei-challenges', hidden: true });
    this.root = h('section', { class: 'ei-lab layout-' + layout, 'aria-label': 'Laboratorio: ' + (this.opts.title || '') },
      h('header', { class: 'ei-lab-head' },
        h('span', { class: 'ei-lab-tag' }, 'Laboratorio'),
        h('h3', { class: 'ei-lab-title' }, this.opts.title || ''),
        h('div', { class: 'ei-lab-tools' }, this.pauseBtn, this.resetBtn)),
      h('div', { class: 'ei-lab-body' },
        h('div', { class: 'ei-stage' }, this.svg),
        h('div', { class: 'ei-side' }, this.readouts, h('div', { class: 'ei-explain-box' }, h('span', { class: 'ei-explain-tag' }, 'Cosa succede'), this.explainEl))),
      this.plotsEl,
      this.controls,
      this.challengesEl);
    if (this.reduced) this.pauseBtn.hidden = true;
    container.append(this.root);

    if ('IntersectionObserver' in root) {
      this.io = new IntersectionObserver((entries) => {
        this.visible = entries[entries.length - 1].isIntersecting;
        this.kick();
      }, { rootMargin: '120px 0px' });
      this.io.observe(this.root);
    }
    this.onVis = () => this.kick();
    document.addEventListener('visibilitychange', this.onVis);
    if ('ResizeObserver' in root) {
      this.ro = new ResizeObserver(() => { this.plots.forEach((p) => p.resize()); this.invalidate(); });
      this.ro.observe(this.root);
    }
    this.frame = this.frame.bind(this);
  }

  Lab.prototype.view = function (w, h) {
    this.svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  };

  // Strumento digitale: { label, unit, sig, color, max (barra), fmt(v) }
  Lab.prototype.readout = function (o) {
    const h = EI.h;
    const val = h('span', { class: 'ei-readout-val' }, '—');
    const bar = o.max ? h('span', { class: 'ei-readout-bar' }, h('i')) : null;
    const el = h('div', { class: 'ei-readout', style: o.color ? '--rc:' + o.color : null },
      h('span', { class: 'ei-readout-label' }, o.label), val, bar);
    if (o.wide) el.classList.add('wide');
    this.readouts.append(el);
    let last = '';
    return {
      el: el,
      set(v) {
        const s = o.fmt ? o.fmt(v) : EI.si(v, o.unit || '', { sig: o.sig || 3, prefix: o.prefix });
        if (s !== last) { val.textContent = s; last = s; }
        if (bar) bar.firstChild.style.transform = 'scaleX(' + EI.clamp(Math.abs(v) / o.max, 0, 1).toFixed(3) + ')';
      },
      text(s) { if (s !== last) { val.textContent = s; last = s; } },
      state(cls) { el.dataset.state = cls || ''; },
    };
  };

  Lab.prototype.explain = function (html) {
    if (html === this.lastExplain) return;
    this.lastExplain = html;
    this.explainEl.innerHTML = EI.rich(html);
    if (!this.reduced) {
      this.explainEl.classList.remove('flash');
      void this.explainEl.offsetWidth;
      this.explainEl.classList.add('flash');
    }
  };

  // Grafico: { title, height, x, y, y2, legend: [{ label, color }], aria }
  Lab.prototype.plot = function (o) {
    const h = EI.h;
    const canvas = h('canvas', { role: 'img', 'aria-label': o.aria || o.title || 'Grafico' });
    const legend = (o.legend || []).map((l) => h('span', { class: 'ei-legend-item', style: '--lc:' + l.color }, l.label));
    const fig = h('figure', { class: 'ei-plot' },
      (o.title || legend.length) ? h('figcaption', null, o.title ? h('span', { class: 'ei-plot-title' }, o.title) : null, h('span', { class: 'ei-legend' }, legend)) : null,
      h('div', { class: 'ei-canvas-wrap' }, canvas));
    (o.into || this.plotsEl).append(fig);
    const p = new Plot(canvas, o);
    p.figure = fig;
    p.setLegend = (items) => {
      const box = fig.querySelector('.ei-legend');
      if (!box) return;
      box.innerHTML = '';
      items.forEach((l) => box.append(h('span', { class: 'ei-legend-item', style: '--lc:' + l.color }, l.label)));
    };
    this.plots.push(p);
    return p;
  };

  function controlId(prefix) {
    controlId.n = (controlId.n || 0) + 1;
    return 'ei-' + prefix + '-' + controlId.n;
  }

  /*
   * Cursore: { label, min, max, step, value, unit, log, series: 'E12', sig, fmt(v), onInput(v), help }
   * Con log: true la scala è logaritmica; con series i valori sono quelli commerciali.
   */
  Lab.prototype.slider = function (o) {
    const h = EI.h;
    const id = controlId('s');
    const values = o.series ? EI.seriesValues(o.series, o.min, o.max) : null;
    const STEPS = 1000;
    const toPos = (v) => {
      if (values) {
        let best = 0;
        values.forEach((x, i) => { if (Math.abs(Math.log(x / v)) < Math.abs(Math.log(values[best] / v))) best = i; });
        return best;
      }
      if (o.log) return Math.round(STEPS * (Math.log(v / o.min) / Math.log(o.max / o.min)));
      return v;
    };
    const fromPos = (p) => {
      if (values) return values[EI.clamp(Math.round(p), 0, values.length - 1)];
      if (o.log) {
        const v = o.min * Math.pow(o.max / o.min, p / STEPS);
        return Number(v.toPrecision(3));
      }
      return Number(p);
    };
    const input = h('input', {
      id: id, type: 'range',
      min: values ? 0 : o.log ? 0 : o.min,
      max: values ? values.length - 1 : o.log ? STEPS : o.max,
      step: values ? 1 : o.log ? 1 : (o.step || 'any'),
    });
    const out = h('output', { for: id, class: 'ei-slider-out' });
    const fmt = (v) => (o.fmt ? o.fmt(v) : EI.si(v, o.unit || '', { sig: o.sig || 3, trim: o.trim !== false, prefix: o.prefix }));
    const el = h('div', { class: 'ei-slider' + (o.wide ? ' wide' : '') },
      h('label', { for: id }, h('span', { class: 'ei-slider-label' }, o.label), out),
      input,
      o.help ? h('span', { class: 'ei-slider-help' }, o.help) : null);
    (o.into || this.controls).append(el);
    const api = {
      el: el, input: input, value: o.value,
      set(v, silent) {
        api.value = values ? fromPos(toPos(v)) : v;
        input.value = toPos(api.value);
        out.textContent = fmt(api.value);
        input.setAttribute('aria-valuetext', out.textContent);
        el.style.setProperty('--fill', ((input.value - input.min) / (input.max - input.min) * 100).toFixed(1) + '%');
        if (!silent && o.onInput) o.onInput(api.value);
      },
    };
    input.addEventListener('input', () => {
      api.value = fromPos(input.value);
      out.textContent = fmt(api.value);
      input.setAttribute('aria-valuetext', out.textContent);
      el.style.setProperty('--fill', ((input.value - input.min) / (input.max - input.min) * 100).toFixed(1) + '%');
      if (o.onInput) o.onInput(api.value);
      this.invalidate();
    });
    api.set(o.value, true);
    this.items.push({ api: api, initial: o.value });
    return api;
  };

  // Scelta a pulsanti: { label, options: [{ value, label }], value, onChange(v) }
  Lab.prototype.choice = function (o) {
    const h = EI.h;
    const btns = o.options.map((opt) => h('button', { type: 'button', class: 'ei-seg-btn', 'aria-pressed': 'false', 'data-v': String(opt.value) }, opt.label));
    const el = h('div', { class: 'ei-choice' },
      o.label ? h('span', { class: 'ei-slider-label' }, o.label) : null,
      h('div', { class: 'ei-seg', role: 'group', 'aria-label': o.label || 'Scelta' }, btns));
    (o.into || this.controls).append(el);
    const api = {
      el: el, value: o.value,
      set(v, silent) {
        api.value = v;
        btns.forEach((b, i) => b.setAttribute('aria-pressed', String(o.options[i].value === v)));
        if (!silent && o.onChange) o.onChange(v);
      },
    };
    btns.forEach((b, i) => b.addEventListener('click', () => { api.set(o.options[i].value); this.invalidate(); }));
    api.set(o.value, true);
    this.items.push({ api: api, initial: o.value });
    return api;
  };

  // Interruttore a levetta: { label, on: 'Acceso', off: 'Spento', value, onChange(v) }
  Lab.prototype.toggle = function (o) {
    const h = EI.h;
    const state = h('span', { class: 'ei-toggle-state' });
    const btn = h('button', { type: 'button', class: 'ei-toggle', 'aria-pressed': 'false' }, h('span', { class: 'ei-toggle-track' }, h('i')), state);
    const el = h('div', { class: 'ei-choice' }, o.label ? h('span', { class: 'ei-slider-label' }, o.label) : null, btn);
    (o.into || this.controls).append(el);
    const api = {
      el: el, value: !!o.value,
      set(v, silent) {
        api.value = !!v;
        btn.setAttribute('aria-pressed', String(api.value));
        state.textContent = api.value ? (o.on || 'Sì') : (o.off || 'No');
        if (!silent && o.onChange) o.onChange(api.value);
      },
    };
    btn.addEventListener('click', () => { api.set(!api.value); this.invalidate(); });
    api.set(o.value, true);
    this.items.push({ api: api, initial: !!o.value });
    return api;
  };

  Lab.prototype.button = function (o) {
    const b = EI.h('button', { type: 'button', class: 'ei-btn' + (o.primary ? ' primary' : ''), onclick: () => { o.onClick(); this.invalidate(); } }, o.label);
    (o.into || this.controls).append(b);
    return b;
  };

  // Riga o gruppo di comandi con titolo facoltativo, per ordinare i cursori.
  Lab.prototype.group = function (title) {
    const g = EI.h('div', { class: 'ei-group' }, title ? EI.h('span', { class: 'ei-group-title' }, title) : null);
    this.controls.append(g);
    return g;
  };

  /*
   * Sfide: lab.challenges([{ id, text, check(stato) → bool }]); poi lab.check(stato) a ogni cambiamento.
   * Le sfide completate restano salvate nel browser.
   */
  Lab.prototype.challenges = function (list) {
    const h = EI.h;
    const done = EI.loadDone();
    this.challengeList = list.map((c) => {
      const key = this.chapter + ':' + c.id;
      const el = h('li', { class: 'ei-challenge' + (done.has(key) ? ' done' : '') },
        h('span', { class: 'ei-check', 'aria-hidden': 'true' }),
        h('span', { class: 'ei-challenge-text', html: EI.rich(c.text) }));
      return { def: c, key: key, el: el, done: done.has(key) };
    });
    this.announcer = h('p', { class: 'ei-sr', 'aria-live': 'polite' });
    this.challengesEl.innerHTML = '';
    this.challengesEl.append(
      h('div', { class: 'ei-challenges-head' }, h('span', { class: 'ei-lab-tag' }, 'Sfide'), this.counter = h('span', { class: 'ei-challenges-count' })),
      h('ul', null, this.challengeList.map((c) => c.el)),
      this.announcer);
    this.challengesEl.hidden = false;
    this.updateCounter();
  };
  Lab.prototype.updateCounter = function () {
    if (!this.challengeList) return;
    const n = this.challengeList.filter((c) => c.done).length;
    this.counter.textContent = n + ' su ' + this.challengeList.length;
  };
  Lab.prototype.check = function (state) {
    if (!this.challengeList) return;
    let changed = false;
    for (const c of this.challengeList) {
      if (c.done) continue;
      let ok = false;
      try { ok = !!c.def.check(state); } catch (e) { ok = false; }
      if (!ok) continue;
      c.done = true;
      changed = true;
      c.el.classList.add('done', 'just');
      setTimeout(() => c.el.classList.remove('just'), 1400);
      const set = EI.loadDone();
      set.add(c.key);
      saveDone(set);
      this.announcer.textContent = 'Sfida completata: ' + c.el.textContent;
    }
    if (changed) {
      this.updateCounter();
      if (hasDOM) root.dispatchEvent(new CustomEvent('ei:progress'));
    }
  };

  // Animazione
  Lab.prototype.loop = function (fn) {
    this.frames.push(fn);
    this.kick();
  };
  Lab.prototype.invalidate = function () {
    this.dirty = true;
    this.kick();
  };
  Lab.prototype.running = function () {
    return !this.reduced && !this.paused && this.visible && !document.hidden;
  };
  Lab.prototype.kick = function () {
    if (this.destroyed || this.raf) return;
    if (this.running() || this.dirty) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  };
  Lab.prototype.frame = function (now) {
    this.raf = 0;
    if (this.destroyed) return;
    if (!this.root.isConnected) { this.destroy(); return; }
    const live = this.running();
    const dt = live ? Math.min(0.05, Math.max(0, (now - this.last) / 1000)) : 0;
    this.last = now;
    this.t += dt;
    this.dirty = false;
    for (const fn of this.frames) {
      try { fn(dt, this.t); } catch (e) { if (root.console) console.error(e); }
    }
    if (live) this.raf = requestAnimationFrame(this.frame);
  };
  Lab.prototype.setPaused = function (p) {
    this.paused = p;
    this.pauseBtn.textContent = p ? '▶︎' : '⏸';
    this.pauseBtn.setAttribute('aria-label', p ? 'Riprendi l\'animazione' : 'Metti in pausa l\'animazione');
    this.pauseBtn.title = p ? 'Riprendi' : 'Pausa';
    this.root.classList.toggle('paused', p);
    this.invalidate();
  };
  Lab.prototype.onReset = function (fn) {
    this.resetFn = fn;
  };
  Lab.prototype.reset = function () {
    this.items.forEach((it) => it.api.set(it.initial));
    this.t = 0;
    if (this.resetFn) this.resetFn();
    this.invalidate();
  };
  Lab.prototype.onDestroy = function (fn) {
    this.cleanups.push(fn);
  };
  Lab.prototype.destroy = function () {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.io) this.io.disconnect();
    if (this.ro) this.ro.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
    this.cleanups.forEach((fn) => { try { fn(); } catch (e) { /* niente */ } });
  };

  EI.Lab = Lab;
  EI.lab = function (container, opts) {
    return new Lab(container, opts);
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = EI;
})(typeof window !== 'undefined' ? window : globalThis);
