/*
 * Simulatore animato: disegna i dispositivi collegati dai fili (SVG) e
 * l'analizzatore logico (canvas) che si riempie mentre i bit viaggiano.
 */
(function (root) {
  'use strict';

  const SVG = 'http://www.w3.org/2000/svg';
  const CLOCK_RE = /CLK|SCL|SCK|TCK|Φ2/i;
  const MIN_STEP_W = 22;
  const ROW_H = 34;
  const BAND_H = 30;
  const MARK_H = 18;
  const LABEL_W = 116;

  function el(tag, attrs, parent) {
    const n = document.createElementNS(SVG, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function prefersReducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function textToBytes(text) {
    const t = text.trim();
    if (/^(0x[0-9a-f]{1,2}[\s,]*)+$/i.test(t)) {
      return t.split(/[\s,]+/).filter(Boolean).map((h) => parseInt(h, 16));
    }
    const out = [];
    for (const ch of t.slice(0, 8)) {
      const c = ch.charCodeAt(0);
      out.push(c < 256 ? c : 63);
    }
    return out.length ? out : [0x41];
  }

  function Simulator(container, sim, options) {
    this.container = container;
    this.sim = sim;
    this.options = options || {};
    this.reduced = prefersReducedMotion();
    this.playing = false;
    this.speed = 3;
    this.pos = 0;
    this.lastT = 0;
    this.tokens = [];
    this.lastStep = -1;
    this.build();
    this.load(this.options.message || 'Ciao');
  }

  Simulator.prototype.build = function () {
    const c = this.container;
    c.classList.add('sim');
    c.innerHTML =
      '<div class="sim-toolbar">' +
      '  <label class="sim-msg"><span>Messaggio</span><input type="text" maxlength="40" spellcheck="false" aria-label="Messaggio da trasmettere (testo o byte esadecimali)"></label>' +
      '  <div class="sim-buttons" role="group" aria-label="Controlli della simulazione">' +
      '    <button type="button" data-act="reset" title="Ricomincia" aria-label="Ricomincia">⏮</button>' +
      '    <button type="button" data-act="back" title="Passo indietro" aria-label="Passo indietro">◀︎</button>' +
      '    <button type="button" data-act="play" class="primary" title="Avvia / pausa" aria-label="Avvia">▶︎</button>' +
      '    <button type="button" data-act="fwd" title="Passo avanti" aria-label="Passo avanti">▶︎|</button>' +
      '  </div>' +
      '  <label class="sim-speed"><span>Velocità</span><input type="range" min="0" max="5" step="1" value="2" aria-label="Velocità"><output>3 passi/s</output></label>' +
      '</div>' +
      '<div class="sim-stage">' +
      '  <svg class="sim-topo" role="img" aria-label="Schema dei collegamenti"></svg>' +
      '  <div class="sim-now" aria-live="polite"><div class="sim-now-label"></div><p class="sim-now-desc"></p></div>' +
      '</div>' +
      '<div class="sim-scope-wrap"><canvas class="sim-scope" aria-label="Analizzatore logico: forme d\'onda dei segnali"></canvas></div>' +
      '<div class="sim-fields" aria-label="Campi del frame"></div>';
    this.input = c.querySelector('input[type=text]');
    this.svg = c.querySelector('.sim-topo');
    this.canvas = c.querySelector('canvas');
    this.nowLabel = c.querySelector('.sim-now-label');
    this.nowDesc = c.querySelector('.sim-now-desc');
    this.fieldsEl = c.querySelector('.sim-fields');
    this.playBtn = c.querySelector('[data-act=play]');
    const speedInput = c.querySelector('.sim-speed input');
    const speedOut = c.querySelector('.sim-speed output');
    const speeds = [0.75, 1.5, 3, 6, 12, 24];

    c.querySelector('.sim-buttons').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'play') this.toggle();
      if (act === 'reset') { this.pos = 0; this.pause(); this.tokens = []; this.render(); }
      if (act === 'back') { this.pause(); this.jump(Math.max(0, Math.floor(this.pos) - 1)); }
      if (act === 'fwd') { this.pause(); this.jump(Math.min(this.trace.steps.length - 1, Math.floor(this.pos) + 1)); }
    });
    speedInput.addEventListener('input', () => {
      this.speed = speeds[+speedInput.value];
      speedOut.textContent = String(this.speed).replace('.', ',') + ' passi/s';
    });
    this.input.addEventListener('change', () => this.load(this.input.value));
    this.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.load(this.input.value); });
    this.fieldsEl.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      this.pause();
      this.jump(+b.dataset.step);
    });
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.frame = this.frame.bind(this);
  };

  Simulator.prototype.load = function (text) {
    this.input.value = text;
    this.trace = Encoders.generate(this.sim.gen, textToBytes(text), this.sim.opts);
    this.pos = 0;
    this.tokens = [];
    this.lastStep = -1;
    this.buildTopo();
    this.buildFields();
    this.resize();
  };

  Simulator.prototype.buildTopo = function () {
    const t = this.trace;
    const svg = this.svg;
    svg.innerHTML = '';
    const n = t.lines.length;
    const gap = n > 6 ? 22 : 34;
    const h = Math.max(150, 50 + n * gap);
    const w = 640;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    const boxW = 136;
    const top = (h - (n - 1) * gap) / 2;
    const devs = t.devices;
    [[0, devs[0]], [w - boxW, devs[1]]].forEach(([x, name], i) => {
      const g = el('g', { class: 'dev dev-' + i }, svg);
      el('rect', { x: x, y: 12, width: boxW, height: h - 24, rx: 10 }, g);
      const label = el('text', { x: x + boxW / 2, y: h / 2, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, g);
      const words = name.split(' ');
      if (name.length > 15 && words.length > 1) {
        const mid = Math.ceil(words.length / 2);
        el('tspan', { x: x + boxW / 2, dy: '-0.6em' }, label).textContent = words.slice(0, mid).join(' ');
        el('tspan', { x: x + boxW / 2, dy: '1.2em' }, label).textContent = words.slice(mid).join(' ');
      } else {
        label.textContent = name;
      }
    });
    this.wires = t.lines.map((line, i) => {
      const y = top + i * gap;
      const g = el('g', { class: 'wire' }, svg);
      const path = el('line', { x1: boxW, x2: w - boxW, y1: y, y2: y }, g);
      const name = el('text', { x: boxW + 8, y: y - 9, class: 'wire-name' }, g);
      name.textContent = line.name;
      const val = el('text', { x: w - boxW - 8, y: y - 9, class: 'wire-val', 'text-anchor': 'end' }, g);
      return { line: line, g: g, path: path, val: val, y: y, x1: boxW, x2: w - boxW, clock: CLOCK_RE.test(line.name) };
    });
    this.tokenLayer = el('g', { class: 'tokens' }, svg);
  };

  Simulator.prototype.buildFields = function () {
    const t = this.trace;
    const first = {};
    t.steps.forEach((s, i) => { if (!(s.seg in first)) first[s.seg] = i; });
    this.segFirst = first;
    this.fieldsEl.innerHTML = '';
    t.segments.forEach((seg, i) => {
      if (!(i in first)) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.step = first[i];
      b.dataset.seg = i;
      b.className = 'field' + (seg.from ? ' from-right' : '');
      b.textContent = seg.label;
      this.fieldsEl.appendChild(b);
    });
  };

  Simulator.prototype.resize = function () {
    const wrap = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(280, wrap.clientWidth);
    const h = BAND_H + MARK_H + this.trace.lines.length * ROW_H + 8;
    this.cw = w;
    this.ch = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.height = h + 'px';
    this.ctx = this.canvas.getContext('2d');
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  };

  Simulator.prototype.toggle = function () {
    if (this.playing) this.pause();
    else this.play();
  };

  Simulator.prototype.play = function () {
    if (this.pos >= this.trace.steps.length - 1) { this.pos = 0; this.tokens = []; }
    this.playing = true;
    this.playBtn.textContent = '⏸';
    this.playBtn.setAttribute('aria-label', 'Pausa');
    this.lastT = performance.now();
    requestAnimationFrame(this.frame);
  };

  Simulator.prototype.pause = function () {
    this.playing = false;
    this.playBtn.textContent = '▶︎';
    this.playBtn.setAttribute('aria-label', 'Avvia');
  };

  Simulator.prototype.jump = function (step) {
    this.pos = step + 0.999;
    this.tokens = [];
    this.render();
  };

  Simulator.prototype.frame = function (now) {
    if (!this.playing || !this.container.isConnected) return;
    const dt = Math.min(0.1, (now - this.lastT) / 1000);
    this.lastT = now;
    this.pos += dt * this.speed;
    const end = this.trace.steps.length;
    if (this.pos >= end) {
      this.pos = end - 0.001;
      this.render();
      this.pause();
      return;
    }
    this.render(dt);
    requestAnimationFrame(this.frame);
  };

  Simulator.prototype.spawnTokens = function (stepIdx) {
    if (this.reduced) return;
    const t = this.trace;
    const step = t.steps[stepIdx];
    const prev = t.steps[stepIdx - 1];
    const from = t.segments[step.seg].from;
    this.wires.forEach((w) => {
      const id = w.line.id;
      const v = step.levels[id];
      if (prev && prev.levels[id] === v) return;
      if (w.line.kind === 'bus' && v === '') return;
      let label = '';
      if (w.line.kind === 'bus') label = '▪';
      else if (v === 1) label = '1';
      else if (v === 0) label = '0';
      else return;
      const dir = w.clock ? 0 : from;
      this.tokens.push({ wire: w, label: label, t: 0, dir: dir, stuff: !!step.stuff });
    });
  };

  Simulator.prototype.render = function (dt) {
    const t = this.trace;
    const idx = Math.min(t.steps.length - 1, Math.floor(this.pos));
    const step = t.steps[idx];
    if (idx !== this.lastStep) {
      if (this.playing && idx === this.lastStep + 1) this.spawnTokens(idx);
      this.updateTopo(step);
      this.updateNow(step);
      this.lastStep = idx;
    }
    this.drawTokens(dt || 0);
    this.drawScope();
  };

  Simulator.prototype.updateTopo = function (step) {
    this.wires.forEach((w) => {
      const v = step.levels[w.line.id];
      let cls = 'wire';
      if (w.line.kind === 'bus') {
        cls += v ? ' bus-on' : ' level-z';
        w.val.textContent = v || '';
      } else {
        cls += v === 1 ? ' level-1' : v === 0 ? ' level-0' : ' level-z';
        w.val.textContent = v === 1 ? '1' : v === 0 ? '0' : '–';
      }
      w.g.setAttribute('class', cls);
    });
  };

  Simulator.prototype.updateNow = function (step) {
    const seg = this.trace.segments[step.seg];
    const devs = this.trace.devices;
    const who = seg.from ? devs[1] + ' → ' + devs[0] : devs[0] + ' → ' + devs[1];
    if (this.nowLabel.dataset.seg !== String(step.seg)) {
      this.nowLabel.dataset.seg = step.seg;
      this.nowLabel.innerHTML = '';
      const strong = document.createElement('strong');
      strong.textContent = seg.label;
      const small = document.createElement('span');
      small.textContent = who;
      this.nowLabel.append(strong, small);
      this.nowDesc.textContent = seg.desc || '';
      if (!this.reduced) {
        this.nowLabel.parentElement.classList.remove('flash');
        void this.nowLabel.offsetWidth;
        this.nowLabel.parentElement.classList.add('flash');
      }
      this.fieldsEl.querySelectorAll('.field').forEach((b) => {
        const active = b.dataset.seg === String(step.seg);
        b.classList.toggle('active', active);
        if (active && this.playing && b.scrollIntoView && this.fieldsEl.scrollWidth > this.fieldsEl.clientWidth) {
          this.fieldsEl.scrollLeft = b.offsetLeft - this.fieldsEl.clientWidth / 3;
        }
      });
    }
  };

  Simulator.prototype.drawTokens = function (dt) {
    const layer = this.tokenLayer;
    layer.innerHTML = '';
    const travel = Math.max(0.35, Math.min(1.2, 2.5 / this.speed));
    this.tokens = this.tokens.filter((k) => {
      k.t += dt / travel;
      return k.t < 1;
    });
    for (const k of this.tokens) {
      const w = k.wire;
      const p = k.dir ? 1 - k.t : k.t;
      const x = w.x1 + 14 + (w.x2 - w.x1 - 28) * p;
      const g = el('g', { class: 'token' + (k.stuff ? ' stuff' : ''), transform: 'translate(' + x + ',' + w.y + ')' }, layer);
      el('circle', { r: 6.5 }, g);
      el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g).textContent = k.label;
    }
  };

  Simulator.prototype.drawScope = function () {
    const ctx = this.ctx;
    const t = this.trace;
    const W = this.cw;
    const H = this.ch;
    const colors = {
      bg: cssVar('--scope-bg') || '#0b1210',
      grid: cssVar('--scope-grid') || '#1b2a26',
      text: cssVar('--scope-text') || '#a8c1b8',
      traces: [cssVar('--trace-1') || '#3ee08f', cssVar('--trace-2') || '#ffc04d', cssVar('--trace-3') || '#5cc8ff', cssVar('--trace-4') || '#ff7aa8'],
      stuff: cssVar('--trace-stuff') || '#ff9f43',
      cursor: cssVar('--scope-cursor') || '#ffffff',
    };
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);

    const plotW = W - LABEL_W;
    const total = t.steps.length;
    const STEP_W = Math.max(MIN_STEP_W, Math.min(64, plotW / total));
    const cursorX = this.pos * STEP_W;
    let offset = 0;
    if (total * STEP_W > plotW) {
      offset = Math.min(Math.max(0, cursorX - plotW * 0.6), total * STEP_W - plotW);
    }
    const X = (s) => LABEL_W + s * STEP_W - offset;
    const firstStep = Math.max(0, Math.floor(offset / STEP_W) - 1);
    const lastStep = Math.min(total, Math.ceil((offset + plotW) / STEP_W) + 1);

    ctx.save();
    ctx.beginPath();
    ctx.rect(LABEL_W, 0, plotW, H);
    ctx.clip();

    // Griglia e bit di stuffing
    for (let s = firstStep; s < lastStep; s++) {
      const step = t.steps[s];
      if (step.stuff) {
        ctx.fillStyle = colors.stuff + '33';
        ctx.fillRect(X(s), BAND_H, STEP_W, H - BAND_H);
      }
      ctx.fillStyle = colors.grid;
      ctx.fillRect(X(s), BAND_H, 1, H - BAND_H);
    }

    // Bande dei campi del frame
    ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    let s0 = 0;
    for (let s = 1; s <= total; s++) {
      if (s === total || t.steps[s].seg !== t.steps[s0].seg) {
        const seg = t.segments[t.steps[s0].seg];
        const x0 = X(s0);
        const x1 = X(s);
        if (x1 > LABEL_W - 20 && x0 < W) {
          const col = seg.from ? colors.traces[1] : colors.traces[2];
          ctx.fillStyle = col + '26';
          ctx.fillRect(x0 + 1, 4, x1 - x0 - 2, BAND_H - 8);
          ctx.fillStyle = col;
          ctx.fillRect(x0 + 1, 4, 3, BAND_H - 8);
          ctx.save();
          ctx.beginPath();
          ctx.rect(x0 + 6, 0, Math.max(0, x1 - x0 - 10), BAND_H);
          ctx.clip();
          ctx.fillStyle = colors.text;
          ctx.fillText(seg.label, Math.max(x0 + 8, LABEL_W + 4), BAND_H / 2);
          ctx.restore();
        }
        s0 = s;
      }
    }

    // Valori dei bit
    ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    for (let s = firstStep; s < lastStep; s++) {
      const m = t.steps[s].mark;
      if (m === undefined) continue;
      ctx.fillStyle = t.steps[s].stuff ? colors.stuff : s <= this.pos ? colors.text : colors.grid;
      ctx.fillText(t.steps[s].stuff ? 'S' : m, X(s) + STEP_W / 2, BAND_H + MARK_H / 2);
    }
    ctx.textAlign = 'left';

    // Forme d'onda: parte già trasmessa luminosa, parte futura in trasparenza
    const reveal = Math.min(total, this.pos + 0.001);
    t.lines.forEach((line, i) => {
      const top = BAND_H + MARK_H + i * ROW_H;
      const col = colors.traces[i % colors.traces.length];
      for (const pass of [0, 1]) {
        ctx.save();
        ctx.beginPath();
        if (pass === 0) ctx.rect(X(reveal), top, W, ROW_H);
        else ctx.rect(LABEL_W, top, X(reveal) - LABEL_W, ROW_H);
        ctx.clip();
        ctx.globalAlpha = pass === 0 ? 0.18 : 1;
        if (pass === 1 && !this.reduced) {
          ctx.shadowColor = col;
          ctx.shadowBlur = 6;
        }
        if (line.kind === 'bus') this.drawBusRow(ctx, line, top, firstStep, lastStep, X, col);
        else this.drawDigitalRow(ctx, line, top, firstStep, lastStep, X, col);
        ctx.restore();
      }
    });

    // Cursore
    ctx.fillStyle = colors.cursor;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(X(reveal) - 1, BAND_H, 2, H - BAND_H);
    ctx.globalAlpha = 1;
    ctx.restore();

    // Nomi delle linee
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, LABEL_W, H);
    ctx.fillStyle = colors.grid;
    ctx.fillRect(LABEL_W - 1, 0, 1, H);
    ctx.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    t.lines.forEach((line, i) => {
      const top = BAND_H + MARK_H + i * ROW_H;
      ctx.fillStyle = colors.traces[i % colors.traces.length];
      let name = line.name;
      while (ctx.measureText(name).width > LABEL_W - 16 && name.length > 3) name = name.slice(0, -2) + '…';
      ctx.fillText(name, 8, top + ROW_H / 2);
    });
    ctx.fillStyle = colors.text;
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('passo ' + Math.min(total, Math.floor(this.pos) + 1) + '/' + total, 8, BAND_H / 2);
  };

  Simulator.prototype.drawDigitalRow = function (ctx, line, top, a, b, X, col) {
    const pad = 7;
    const Y = (v) => top + pad + (1 - v) * (ROW_H - 2 * pad);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let prev = null;
    for (let s = a; s < b; s++) {
      const v = this.trace.steps[s].levels[line.id];
      const y = Y(v);
      if (prev === null) ctx.moveTo(X(s), y);
      else if (prev !== v) ctx.lineTo(X(s), y);
      ctx.lineTo(X(s + 1), y);
      prev = v;
    }
    ctx.stroke();
  };

  Simulator.prototype.drawBusRow = function (ctx, line, top, a, b, X, col) {
    const steps = this.trace.steps;
    const yT = top + 7;
    const yB = top + ROW_H - 7;
    const yM = (yT + yB) / 2;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'middle';
    let s = a;
    while (s < b) {
      const v = steps[s].levels[line.id];
      let e = s + 1;
      while (e < b && steps[e].levels[line.id] === v) e++;
      const x0 = X(s);
      const x1 = X(e);
      ctx.beginPath();
      if (v) {
        const k = Math.min(5, (x1 - x0) / 2);
        ctx.moveTo(x0, yM);
        ctx.lineTo(x0 + k, yT);
        ctx.lineTo(x1 - k, yT);
        ctx.lineTo(x1, yM);
        ctx.lineTo(x1 - k, yB);
        ctx.lineTo(x0 + k, yB);
        ctx.closePath();
        ctx.stroke();
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0 + k, top, x1 - x0 - 2 * k, ROW_H);
        ctx.clip();
        ctx.fillStyle = col;
        ctx.fillText(v, x0 + k + 3, yM);
        ctx.restore();
      } else {
        ctx.setLineDash([3, 4]);
        ctx.moveTo(x0, yM);
        ctx.lineTo(x1, yM);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      s = e;
    }
  };

  Simulator.prototype.destroy = function () {
    this.playing = false;
    window.removeEventListener('resize', this.onResize);
  };

  root.Simulator = Simulator;
  root.textToBytes = textToBytes;
})(window);
