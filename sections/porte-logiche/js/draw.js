/*
 * Porte logiche e chip · disegni SVG condivisi.
 * Simboli delle porte (ANSI e IEC), fili con livelli logici e segnali che scorrono,
 * spie, lampadine, interruttori, batterie, transistor MOS e contenitori DIP.
 * Tutti i colori arrivano dal CSS (classi pl-*), così seguono il tema e i pannelli scuri.
 */
(function (root) {
  'use strict';

  const PL = root.PL;
  const { s } = PL;
  const draw = PL.draw = {};

  const n2 = (v) => Math.round(v * 100) / 100;

  /* ---------- porte logiche ---------- */

  /**
   * Disegna una porta. type: NOT, BUF, AND, OR, NAND, NOR, XOR, XNOR.
   * opts: { x, y, w = 60, inputs (numero, di base 2 o 1), style: 'ansi' | 'iec', label }
   * Restituisce { g, inputs: [{x, y}], output: {x, y}, set(out) } dove set accende la porta quando l'uscita è 1.
   */
  draw.gate = function (type, opts) {
    const o = Object.assign({ x: 0, y: 0, w: 60, style: 'ansi' }, opts || {});
    const L = root.Logic && root.Logic.GATES[type];
    const single = type === 'NOT' || type === 'BUF';
    const n = single ? 1 : (o.inputs || 2);
    const neg = /^(NOT|NAND|NOR|XNOR)$/.test(type);
    const w = o.w;
    const hh = w * 0.7;
    const b = w * 0.075;
    const { x, y } = o;
    const bodyEnd = neg ? w - 2 * b : w;
    const g = s('g', { class: 'pl-gate pl-gate-' + type.toLowerCase(), 'data-gate': type });
    const pins = [];
    for (let i = 0; i < n; i++) pins.push({ x, y: y + (hh * (i + 1)) / (n + 1) });
    let body;

    if (o.style === 'iec') {
      body = s('path', { class: 'pl-gate-body', d: `M${x} ${y}H${n2(x + bodyEnd)}V${n2(y + hh)}H${x}Z` });
      g.append(body, s('text', { class: 'pl-gate-label', x: n2(x + bodyEnd / 2), y: n2(y + hh * 0.36), 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, L ? L.iec.replace('&amp;', '&') : '?'));
    } else if (single) {
      const top = y + hh * 0.12;
      const bot = y + hh * 0.88;
      body = s('path', { class: 'pl-gate-body', d: `M${x} ${n2(top)}L${n2(x + bodyEnd)} ${n2(y + hh / 2)}L${x} ${n2(bot)}Z` });
      g.append(body);
    } else if (type === 'AND' || type === 'NAND') {
      const r = hh / 2;
      body = s('path', { class: 'pl-gate-body', d: `M${x} ${y}H${n2(x + bodyEnd - r)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(x + bodyEnd - r)} ${n2(y + hh)}H${x}Z` });
      g.append(body);
    } else {
      // OR, NOR, XOR, XNOR: dorso concavo; la XOR ha una seconda curva davanti agli ingressi.
      const gap = /XOR|XNOR/.test(type) ? w * 0.1 : 0;
      const x0 = x + gap;
      const span = bodyEnd - gap;
      const k = hh * 0.25;
      body = s('path', {
        class: 'pl-gate-body',
        d: `M${n2(x0)} ${y}C${n2(x0 + span * 0.55)} ${y} ${n2(x0 + span * 0.86)} ${n2(y + hh * 0.12)} ${n2(x0 + span)} ${n2(y + hh / 2)}` +
          `C${n2(x0 + span * 0.86)} ${n2(y + hh * 0.88)} ${n2(x0 + span * 0.55)} ${n2(y + hh)} ${n2(x0)} ${n2(y + hh)}` +
          `Q${n2(x0 + k)} ${n2(y + hh / 2)} ${n2(x0)} ${y}Z`,
      });
      g.append(body);
      if (gap) g.append(s('path', { class: 'pl-gate-extra', d: `M${n2(x)} ${y}Q${n2(x + k)} ${n2(y + hh / 2)} ${n2(x)} ${n2(y + hh)}` }));
      for (const p of pins) {
        const t = (p.y - y) / hh;
        p.x = n2(x0 + 2 * t * (1 - t) * k);
      }
    }
    if (neg) g.append(s('circle', { class: 'pl-gate-bubble', cx: n2(x + bodyEnd + b), cy: n2(y + hh / 2), r: n2(b) }));
    if (o.label) g.append(s('text', { class: 'pl-gate-name', x: n2(x + w / 2 - (neg ? b : 0)), y: n2(y + hh + 14), 'text-anchor': 'middle' }, o.label));
    const api = {
      g, type, inputs: pins, output: { x: n2(x + w), y: n2(y + hh / 2) }, height: hh, width: w,
      set(out) { g.classList.toggle('is-on', !!out); },
    };
    return api;
  };

  /* ---------- fili ---------- */

  /** Percorso con angoli arrotondati attraverso i punti [[x, y], ...]. */
  draw.path = function (points, radius) {
    const r = radius == null ? 6 : radius;
    if (points.length < 3 || r <= 0) return 'M' + points.map((p) => n2(p[0]) + ' ' + n2(p[1])).join('L');
    let d = 'M' + n2(points[0][0]) + ' ' + n2(points[0][1]);
    for (let i = 1; i < points.length - 1; i++) {
      const [px, py] = points[i - 1];
      const [cx, cy] = points[i];
      const [nx, ny] = points[i + 1];
      const d1 = Math.hypot(cx - px, cy - py);
      const d2 = Math.hypot(nx - cx, ny - cy);
      const rr = Math.min(r, d1 / 2, d2 / 2);
      const ax = cx - ((cx - px) / d1) * rr;
      const ay = cy - ((cy - py) / d1) * rr;
      const bx = cx + ((nx - cx) / d2) * rr;
      const by = cy + ((ny - cy) / d2) * rr;
      d += 'L' + n2(ax) + ' ' + n2(ay) + 'Q' + n2(cx) + ' ' + n2(cy) + ' ' + n2(bx) + ' ' + n2(by);
    }
    const last = points[points.length - 1];
    return d + 'L' + n2(last[0]) + ' ' + n2(last[1]);
  };

  /**
   * Filo: draw.wire([[x, y], ...] oppure 'M..', { level: 0 | 1 | null, cls }).
   * level null = filo neutro (non logico). Usa draw.setWire per cambiare livello con animazione.
   */
  draw.wire = function (points, opts) {
    const o = opts || {};
    const d = typeof points === 'string' ? points : draw.path(points, o.radius);
    const p = s('path', { class: 'pl-wire' + (o.cls ? ' ' + o.cls : ''), d });
    if (o.level != null) draw.setWire(p, o.level, { animate: false });
    return p;
  };

  /**
   * Cambia il livello di un filo. Con animate (di base) il nuovo colore scorre lungo il filo
   * dall'inizio alla fine, come il segnale che si propaga.
   */
  draw.setWire = function (p, level, opts) {
    const o = Object.assign({ animate: true, duration: 320 }, opts || {});
    const v = level ? 1 : 0;
    const was = p.classList.contains('is-1') ? 1 : p.classList.contains('is-0') ? 0 : null;
    if (p._sweep) { p._sweep.cancel(); p._sweep.el.remove(); p._sweep = null; }
    if (!o.animate || was === v || was === null || PL.reduced() || !p.isConnected) {
      p.classList.toggle('is-1', v === 1);
      p.classList.toggle('is-0', v === 0);
      return;
    }
    const over = p.cloneNode(false);
    over.setAttribute('class', 'pl-wire pl-sweep is-' + v);
    over.setAttribute('pathLength', '1');
    over.style.strokeDasharray = '1 1';
    over.style.strokeDashoffset = '1';
    p.after(over);
    const tw = PL.tween({
      from: 1, to: 0, duration: o.duration, ease: PL.motion.ease.out,
      onUpdate: (val) => { over.style.strokeDashoffset = String(val); },
      onDone: () => {
        p.classList.toggle('is-1', v === 1);
        p.classList.toggle('is-0', v === 0);
        over.remove();
        p._sweep = null;
      },
    });
    p._sweep = { el: over, cancel: tw.cancel };
  };

  /** Un impulso luminoso che percorre il filo una volta. */
  draw.pulse = function (p, opts) {
    const o = Object.assign({ duration: 700, cls: '' }, opts || {});
    if (PL.reduced() || !p.isConnected) return;
    const over = p.cloneNode(false);
    over.setAttribute('class', 'pl-pulse' + (o.cls ? ' ' + o.cls : ''));
    over.setAttribute('pathLength', '1');
    const seg = 0.12;
    over.style.strokeDasharray = seg + ' 2';
    over.style.strokeDashoffset = String(seg);
    p.after(over);
    PL.tween({
      from: seg, to: -1, duration: o.duration, ease: PL.motion.ease.linear,
      onUpdate: (val) => { over.style.strokeDashoffset = String(val); },
      onDone: () => over.remove(),
    });
  };

  /**
   * Corrente che scorre: puntini in movimento lungo il percorso (animazione CSS).
   * Restituisce { el, set(on), reverse(bool) }.
   */
  draw.flow = function (p, opts) {
    const o = opts || {};
    const over = p.cloneNode(false);
    over.setAttribute('class', 'pl-flow' + (o.cls ? ' ' + o.cls : ''));
    over.removeAttribute('pathLength');
    const api = {
      el: over,
      set(on) { over.classList.toggle('is-on', !!on); return api; },
      reverse(r) { over.classList.toggle('is-rev', !!r); return api; },
    };
    if (p.parentNode) p.after(over);
    api.set(!!o.on);
    if (o.reverse) api.reverse(true);
    return api;
  };

  /** Punto di giunzione tra fili. */
  draw.junction = (x, y, level) => s('circle', { class: 'pl-junction' + (level ? ' is-1' : ''), cx: x, cy: y, r: 3.2 });

  /** Etichetta di testo. cls facoltativa (pl-t-small, pl-t-mono, pl-t-muted...). */
  draw.label = (x, y, text, cls, anchor) => s('text', { class: 'pl-t ' + (cls || ''), x, y, 'text-anchor': anchor || 'middle' }, text);

  /** Punta di freccia in (x, y) orientata di angle gradi (0 = verso destra). */
  draw.arrowHead = (x, y, angle, size) => {
    const k = size || 7;
    return s('path', { class: 'pl-arrow', d: `M${-k} ${-k * 0.6}L0 0L${-k} ${k * 0.6}Z`, transform: `translate(${x} ${y}) rotate(${angle || 0})` });
  };

  /** Freccia rettilinea da (x1, y1) a (x2, y2). */
  draw.arrow = function (x1, y1, x2, y2, cls) {
    const g = s('g', { class: 'pl-arrow-g' + (cls ? ' ' + cls : '') });
    const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    g.append(s('line', { class: 'pl-arrow-line', x1, y1, x2, y2 }), draw.arrowHead(x2, y2, ang));
    return g;
  };

  /* ---------- componenti ---------- */

  /** Spia LED. Restituisce { g, set(v) }. */
  draw.led = function (x, y, opts) {
    const o = Object.assign({ r: 9, color: '' }, opts || {});
    const g = s('g', { class: 'pl-sled' + (o.color ? ' is-' + o.color : '') });
    g.append(
      s('circle', { class: 'pl-sled-halo', cx: x, cy: y, r: o.r * 2.1 }),
      s('circle', { class: 'pl-sled-body', cx: x, cy: y, r: o.r }),
      s('circle', { class: 'pl-sled-shine', cx: x - o.r * 0.35, cy: y - o.r * 0.35, r: o.r * 0.28 }));
    if (o.label) g.append(draw.label(x, y + o.r + 16, o.label, 'pl-t-small'));
    return { g, set(v) { g.classList.toggle('is-on', !!v); } };
  };

  /** Lampadina con filamento e raggi. Restituisce { g, set(v), a: {x, y}, b: {x, y} } (morsetti sinistro e destro). */
  draw.lamp = function (x, y, opts) {
    const r = (opts && opts.r) || 18;
    const g = s('g', { class: 'pl-lamp' });
    const rays = s('g', { class: 'pl-lamp-rays' });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      rays.append(s('line', { x1: n2(x + Math.cos(a) * r * 1.35), y1: n2(y + Math.sin(a) * r * 1.35), x2: n2(x + Math.cos(a) * r * 1.85), y2: n2(y + Math.sin(a) * r * 1.85) }));
    }
    g.append(
      s('circle', { class: 'pl-lamp-halo', cx: x, cy: y, r: r * 2.2 }),
      rays,
      s('circle', { class: 'pl-lamp-glass', cx: x, cy: y, r }),
      s('path', { class: 'pl-lamp-fil', d: `M${n2(x - r * 0.7)} ${y}L${n2(x - r * 0.35)} ${n2(y - r * 0.45)}L${n2(x)} ${n2(y + r * 0.35)}L${n2(x + r * 0.35)} ${n2(y - r * 0.45)}L${n2(x + r * 0.7)} ${y}` }));
    return { g, a: { x: x - r, y }, b: { x: x + r, y }, set(v) { g.classList.toggle('is-on', !!v); } };
  };

  /**
   * Interruttore a coltello: perno in (x, y), contatto in (x + len, y).
   * Restituisce { g, a, b, set(closed) }. Il braccio ruota con una breve animazione.
   */
  draw.switch = function (x, y, opts) {
    const o = Object.assign({ len: 44, closed: false, label: '' }, opts || {});
    const g = s('g', { class: 'pl-switch' });
    const arm = s('line', { class: 'pl-switch-arm', x1: x, y1: y, x2: x + o.len, y2: y });
    g.append(arm, s('circle', { class: 'pl-switch-pin', cx: x, cy: y, r: 3.6 }), s('circle', { class: 'pl-switch-pin', cx: x + o.len, cy: y, r: 3.6 }));
    if (o.label) g.append(draw.label(x + o.len / 2, y - 18, o.label, 'pl-t-switch'));
    let angle = o.closed ? 0 : -32;
    let tw = null;
    const apply = (a) => {
      const rad = (a * Math.PI) / 180;
      arm.setAttribute('x2', n2(x + Math.cos(rad) * o.len));
      arm.setAttribute('y2', n2(y + Math.sin(rad) * o.len));
    };
    apply(angle);
    const api = {
      g, a: { x, y }, b: { x: x + o.len, y }, closed: !!o.closed,
      set(closed, animate) {
        api.closed = !!closed;
        g.classList.toggle('is-closed', api.closed);
        const target = api.closed ? 0 : -32;
        if (tw) tw.cancel();
        if (animate === false) { angle = target; apply(angle); return; }
        const from = angle;
        tw = PL.tween({ from, to: target, duration: 160, ease: PL.motion.ease.out, onUpdate: (v) => { angle = v; apply(v); } });
      },
    };
    g.classList.toggle('is-closed', api.closed);
    return api;
  };

  /** Batteria (pila): piastra lunga = polo positivo. Verticale con il + in alto. */
  draw.battery = function (x, y, opts) {
    const o = Object.assign({ label: '' }, opts || {});
    const g = s('g', { class: 'pl-battery' });
    g.append(
      s('line', { class: 'pl-battery-plate', x1: x - 16, y1: y - 5, x2: x + 16, y2: y - 5 }),
      s('line', { class: 'pl-battery-plate is-short', x1: x - 9, y1: y + 5, x2: x + 9, y2: y + 5 }),
      draw.label(x + 24, y - 1, '+', 'pl-t-small'),
      o.label ? draw.label(x - 26, y + 4, o.label, 'pl-t-small', 'end') : null);
    return { g, top: { x, y: y - 5 }, bottom: { x, y: y + 5 } };
  };

  /** Simbolo di massa (0 V) con il punto di collegamento in (x, y). */
  draw.ground = function (x, y) {
    return s('g', { class: 'pl-ground' },
      s('line', { x1: x, y1: y, x2: x, y2: y + 8 }),
      s('line', { x1: x - 12, y1: y + 8, x2: x + 12, y2: y + 8 }),
      s('line', { x1: x - 7, y1: y + 13, x2: x + 7, y2: y + 13 }),
      s('line', { x1: x - 2.5, y1: y + 18, x2: x + 2.5, y2: y + 18 }));
  };

  /** Alimentazione (VDD / VCC) con il punto di collegamento in (x, y). */
  draw.supply = function (x, y, label) {
    return s('g', { class: 'pl-supply' },
      s('line', { x1: x, y1: y, x2: x, y2: y - 10 }),
      s('line', { x1: x - 12, y1: y - 10, x2: x + 12, y2: y - 10 }),
      draw.label(x, y - 16, label || 'VDD', 'pl-t-small'));
  };

  /** Resistenza a zig-zag da (x1, y) a (x2, y). */
  draw.resistor = function (x1, y1, x2, y2) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    const z = [];
    const lead = len * 0.22;
    const seg = (len - 2 * lead) / 6;
    z.push([0, 0], [lead, 0]);
    for (let i = 0; i < 6; i++) z.push([lead + seg * (i + 0.5), i % 2 ? 6 : -6]);
    z.push([len - lead, 0], [len, 0]);
    return s('path', { class: 'pl-resistor', d: 'M' + z.map((p) => n2(p[0]) + ' ' + n2(p[1])).join('L'), transform: `translate(${x1} ${y1}) rotate(${n2(ang)})` });
  };

  /**
   * Transistor MOS (simbolo semplificato). kind 'n' o 'p' (il p ha il pallino sul gate).
   * Il canale è verticale: top e bottom sono i morsetti, gate entra da sinistra.
   * Restituisce { g, gate, top, bottom, set(on) }.
   */
  draw.mosfet = function (x, y, opts) {
    const o = Object.assign({ kind: 'n', size: 26, label: '' }, opts || {});
    const k = o.size;
    const g = s('g', { class: 'pl-mos is-' + o.kind });
    const gx = x - k * 0.55;
    const bubble = o.kind === 'p';
    g.append(
      s('line', { class: 'pl-mos-lead', x1: x - k * 1.25, y1: y, x2: bubble ? gx - 9 : gx, y2: y }),
      bubble ? s('circle', { class: 'pl-mos-bubble', cx: gx - 4.5, cy: y, r: 4.5 }) : null,
      s('line', { class: 'pl-mos-gate', x1: gx, y1: y - k * 0.6, x2: gx, y2: y + k * 0.6 }),
      s('line', { class: 'pl-mos-channel', x1: x - k * 0.3, y1: y - k * 0.7, x2: x - k * 0.3, y2: y + k * 0.7 }),
      s('path', { class: 'pl-mos-lead', d: `M${n2(x - k * 0.3)} ${n2(y - k * 0.55)}H${x}V${n2(y - k)}` }),
      s('path', { class: 'pl-mos-lead', d: `M${n2(x - k * 0.3)} ${n2(y + k * 0.55)}H${x}V${n2(y + k)}` }));
    if (o.label) g.append(draw.label(x + 10, y + 4, o.label, 'pl-t-small pl-t-mono', 'start'));
    return {
      g, gate: { x: x - k * 1.25, y }, top: { x, y: y - k }, bottom: { x, y: y + k },
      set(on) { g.classList.toggle('is-on', !!on); },
    };
  };

  /**
   * Contenitore DIP visto dall'alto, tacca a sinistra: piedini 1..n/2 in basso da sinistra a destra,
   * gli altri in alto da destra a sinistra (numerazione standard in senso antiorario).
   * Restituisce { g, pin(i) → {x, y} estremità esterna, body: {x, y, w, h} }.
   */
  draw.dip = function (opts) {
    const o = Object.assign({ x: 0, y: 0, pins: 14, pitch: 34, label: '', sub: '' }, opts || {});
    const per = o.pins / 2;
    const w = o.pitch * per + 20;
    const hgt = o.h || 74;
    const g = s('g', { class: 'pl-dip' });
    const pos = [];
    for (let i = 1; i <= o.pins; i++) {
      const bottom = i <= per;
      const k = bottom ? i - 1 : o.pins - i;
      const px = o.x + 10 + o.pitch * (k + 0.5);
      const py = bottom ? o.y + hgt : o.y;
      g.append(s('rect', { class: 'pl-dip-pin', x: px - 6, y: bottom ? py : py - 14, width: 12, height: 14, rx: 2 }));
      g.append(draw.label(px, bottom ? py - 8 : py + 15, String(i), 'pl-t-pin'));
      pos[i] = { x: px, y: bottom ? py + 14 : py - 14 };
    }
    g.append(
      s('rect', { class: 'pl-dip-body', x: o.x, y: o.y, width: w, height: hgt, rx: 6 }),
      s('path', { class: 'pl-dip-notch', d: `M${o.x} ${o.y + hgt / 2 - 9}A9 9 0 0 1 ${o.x} ${o.y + hgt / 2 + 9}` }),
      s('circle', { class: 'pl-dip-dot', cx: o.x + 14, cy: o.y + hgt - 14, r: 3 }));
    // le etichette dei piedini vanno sopra il corpo
    g.append(...Array.from(g.querySelectorAll('.pl-t-pin')));
    if (o.label) g.append(draw.label(o.x + w / 2, o.y + hgt / 2 + 2, o.label, 'pl-t-chip'));
    if (o.sub) g.append(draw.label(o.x + w / 2, o.y + hgt / 2 + 18, o.sub, 'pl-t-chip-sub'));
    return { g, pin: (i) => pos[i], body: { x: o.x, y: o.y, w, h: hgt } };
  };
})(typeof window !== 'undefined' ? window : globalThis);
