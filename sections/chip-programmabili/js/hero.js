/*
 * Apertura della sezione: un Intel 4004 in prospettiva. Il coperchio si solleva, compaiono il die
 * e i fili d'oro, poi le parti del chip si accendono a turno come in un ciclo di istruzione
 * (prendi, decodifica, esegui). Si ferma fuori vista; con movimento ridotto resta aperto e fermo.
 */
(function (root) {
  'use strict';

  const CP = root.CP;
  const doc = root.document;
  if (!CP) return;
  const { h, s } = CP;

  const W = 460;
  const H = 250;
  const BODY = { x: 30, y: 55, w: 400, h: 140 };
  const CAV = { x: 132, y: 70, w: 196, h: 110 };
  const DIE = { x: 168, y: 88, w: 124, h: 74 };

  const PHASES = [
    { key: 'prendi', blocks: ['pc'], wires: 'addr', text: 'Prendi: il contatore di programma manda l\'indirizzo sul bus e l\'istruzione rientra dalla memoria.' },
    { key: 'decodifica', blocks: ['ctl'], wires: 'ctrl', text: 'Decodifica: l\'unità di controllo capisce che cosa chiede l\'istruzione.' },
    { key: 'esegui', blocks: ['alu', 'reg'], wires: 'data', text: 'Esegui: l\'ALU calcola e il risultato finisce in un registro.' },
  ];

  function pins(layer) {
    for (let i = 0; i < 8; i++) {
      const cx = BODY.x + 25 + i * 50;
      layer.append(
        s('rect', { x: cx - 9, y: BODY.y - 40, width: 18, height: 44, rx: 3, fill: 'url(#cp-g-gold)' }),
        s('rect', { x: cx - 9, y: BODY.y + BODY.h - 4, width: 18, height: 44, rx: 3, fill: 'url(#cp-g-gold)' }));
    }
  }

  function base() {
    const svg = s('svg', { class: 'cp-hero-layer cp-hero-base', viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true', focusable: 'false' });
    svg.append(s('defs', null,
      s('filter', { id: 'cp-hero-blur', x: '-20%', y: '-40%', width: '140%', height: '180%' }, s('feGaussianBlur', { stdDeviation: 9 })),
      s('radialGradient', { id: 'cp-hero-glow', cx: '.5', cy: '.5', r: '.5' },
        s('stop', { offset: '0', 'stop-color': '#f0b04a', 'stop-opacity': '.55' }),
        s('stop', { offset: '1', 'stop-color': '#f0b04a', 'stop-opacity': '0' }))));
    // ombra sul tavolo
    svg.append(s('rect', { x: BODY.x + 10, y: BODY.y + 18, width: BODY.w, height: BODY.h, rx: 14, fill: '#000', opacity: 0.55, filter: 'url(#cp-hero-blur)' }));
    pins(svg);
    svg.append(s('rect', { x: BODY.x, y: BODY.y, width: BODY.w, height: BODY.h, rx: 8, fill: 'url(#cp-g-ceramic)', stroke: '#bdb39c', 'stroke-width': 1.2 }));
    svg.append(s('path', { d: 'M' + BODY.x + ' ' + (BODY.y + BODY.h / 2 - 14) + ' a14 14 0 0 1 0 28 Z', fill: 'rgba(80,64,40,.3)' }));
    // cavità con l'anello di saldatura dorato
    svg.append(s('rect', { x: CAV.x - 6, y: CAV.y - 6, width: CAV.w + 12, height: CAV.h + 12, rx: 6, fill: 'none', stroke: '#c9a043', 'stroke-width': 4, opacity: 0.9 }));
    svg.append(s('rect', { x: CAV.x, y: CAV.y, width: CAV.w, height: CAV.h, rx: 3, fill: '#2b2721' }));
    svg.append(s('ellipse', { class: 'cp-hero-halo', cx: CAV.x + CAV.w / 2, cy: CAV.y + CAV.h / 2, rx: CAV.w * 0.62, ry: CAV.h * 0.7, fill: 'url(#cp-hero-glow)' }));
    // dita dorate sul bordo della cavità
    const finger = (i) => CAV.x + 14 + i * ((CAV.w - 28) / 7);
    for (let i = 0; i < 8; i++) {
      const fx = finger(i);
      svg.append(
        s('rect', { x: fx - 4, y: CAV.y + 2, width: 8, height: 7, rx: 1, fill: '#d9b257' }),
        s('rect', { x: fx - 4, y: CAV.y + CAV.h - 9, width: 8, height: 7, rx: 1, fill: '#d9b257' }));
    }
    // fili d'oro dal die alle dita
    const wires = s('g', { class: 'cp-hero-wires' });
    const pad = (i) => DIE.x + 9 + i * ((DIE.w - 18) / 7);
    for (let i = 0; i < 8; i++) {
      const fx = finger(i);
      const px = pad(i);
      const kind = i < 3 ? 'addr' : i < 5 ? 'ctrl' : 'data';
      const top = 'M' + px + ' ' + (DIE.y + 2) + ' Q ' + ((px + fx) / 2) + ' ' + (DIE.y - 14) + ' ' + fx + ' ' + (CAV.y + 6);
      const bot = 'M' + px + ' ' + (DIE.y + DIE.h - 2) + ' Q ' + ((px + fx) / 2) + ' ' + (DIE.y + DIE.h + 14) + ' ' + fx + ' ' + (CAV.y + CAV.h - 6);
      wires.append(
        s('path', { d: top, class: 'cp-hero-wire w-' + kind, style: { '--d': (i * 45) + 'ms' } }),
        s('path', { d: bot, class: 'cp-hero-wire w-' + (i < 4 ? 'data' : 'ctrl'), style: { '--d': (180 + i * 45) + 'ms' } }));
    }
    svg.append(wires);
    // il die: una pianta stilizzata, non una fotografia
    const die = s('g', { class: 'cp-hero-die' });
    die.append(s('rect', { x: DIE.x, y: DIE.y, width: DIE.w, height: DIE.h, rx: 1.5, fill: 'url(#cp-g-die)', stroke: '#e6d9a8', 'stroke-width': 0.6 }));
    for (let i = 0; i < 8; i++) {
      die.append(
        s('rect', { x: pad(i) - 2.5, y: DIE.y + 1, width: 5, height: 4, fill: '#e9dcae' }),
        s('rect', { x: pad(i) - 2.5, y: DIE.y + DIE.h - 5, width: 5, height: 4, fill: '#e9dcae' }));
    }
    const blocks = {
      reg: { x: DIE.x + 7, y: DIE.y + 9, w: 34, h: 56, label: 'REG' },
      pc: { x: DIE.x + 46, y: DIE.y + 9, w: 40, h: 25, label: 'PC' },
      alu: { x: DIE.x + 46, y: DIE.y + 40, w: 40, h: 25, label: 'ALU' },
      ctl: { x: DIE.x + 91, y: DIE.y + 9, w: 26, h: 56, label: 'CTRL' },
    };
    Object.keys(blocks).forEach((k) => {
      const b = blocks[k];
      const g = s('g', { class: 'cp-hero-blk', 'data-blk': k });
      g.append(s('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 1.2 }));
      if (k === 'reg') {
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 2; c++) g.append(s('rect', { class: 'cell', x: b.x + 4 + c * 14, y: b.y + 4 + r * 6.4, width: 12, height: 4.6 }));
        }
      }
      g.append(s('text', { x: b.x + b.w / 2, y: b.y + b.h / 2 + 3, 'text-anchor': 'middle', 'font-size': k === 'ctl' ? 6.4 : 8.5 }, b.label));
      die.append(g);
    });
    // iniziali del progettista incise sul die, come sul vero 4004
    die.append(s('text', { x: DIE.x + DIE.w - 4, y: DIE.y + DIE.h - 7, 'text-anchor': 'end', 'font-size': 3.6, class: 'cp-hero-ff' }, 'F.F.'));
    svg.append(die);
    return svg;
  }

  function lid() {
    const svg = s('svg', { class: 'cp-hero-layer cp-hero-lid', viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true', focusable: 'false' });
    svg.append(s('rect', { x: BODY.x, y: BODY.y, width: BODY.w, height: BODY.h, rx: 8, fill: 'url(#cp-g-ceramic)', stroke: '#bdb39c', 'stroke-width': 1.2 }));
    svg.append(s('rect', { x: BODY.x + 3, y: BODY.y + 3, width: BODY.w - 6, height: 26, rx: 6, fill: '#fff', opacity: 0.4 }));
    svg.append(s('path', { d: 'M' + BODY.x + ' ' + (BODY.y + BODY.h / 2 - 14) + ' a14 14 0 0 1 0 28 Z', fill: 'rgba(80,64,40,.3)' }));
    svg.append(s('circle', { cx: BODY.x + 26, cy: BODY.y + BODY.h - 24, r: 6, fill: 'rgba(80,64,40,.3)' }));
    svg.append(s('text', { x: W / 2, y: BODY.y + 62, 'text-anchor': 'middle', 'font-size': 22, class: 'cp-hero-mark' }, 'intel'));
    svg.append(s('text', { x: W / 2, y: BODY.y + 98, 'text-anchor': 'middle', 'font-size': 34, class: 'cp-hero-mark big' }, 'C4004'));
    return svg;
  }

  function mount(fig) {
    const scene = h('div', { class: 'cp-hero-scene' }, base(), lid());
    const stage = h('div', { class: 'cp-hero-stage', role: 'img', 'aria-label': 'Disegno di un Intel 4004 aperto: il coperchio sollevato lascia vedere il chip di silicio collegato ai piedini da fili d\'oro; le sue parti si accendono a turno.' }, scene);
    fig.insertBefore(stage, fig.firstChild);
    // la scena è disegnata per circa 560 px di larghezza: sotto, si rimpicciolisce
    const fit = () => fig.style.setProperty('--hero-scale', Math.min(1, Math.max(0.5, stage.clientWidth / 560)).toFixed(3));
    fit();
    if ('ResizeObserver' in root) new ResizeObserver(fit).observe(stage);
    else root.addEventListener('resize', fit);

    const phaseEl = doc.getElementById('cp-hero-phase');
    if (phaseEl) {
      phaseEl.textContent = '';
      PHASES.forEach((p, i) => {
        if (i) phaseEl.append(h('span', { class: 'sep' }, ' · '));
        phaseEl.append(h('span', { 'data-phase': p.key }, p.key));
      });
    }
    const toggle = h('button', { type: 'button', class: 'cp-hero-toggle', 'aria-pressed': 'true' }, 'Chiudi il chip');
    const cap = fig.querySelector('figcaption');
    if (cap) cap.append(toggle);

    const blocks = Array.from(scene.querySelectorAll('.cp-hero-blk'));
    let open = false;
    let phase = -1;
    let acc = 0;
    let visible = true;
    let off = null;

    function setPhase(i) {
      phase = i;
      const p = PHASES[i];
      blocks.forEach((b) => b.classList.toggle('is-on', !!p && p.blocks.indexOf(b.dataset.blk) >= 0));
      scene.dataset.flow = p ? p.wires : '';
      if (phaseEl) phaseEl.querySelectorAll('[data-phase]').forEach((x) => x.classList.toggle('on', !!p && x.dataset.phase === p.key));
    }

    function run() {
      if (off || CP.reduced() || !open || !visible) return;
      acc = 0;
      off = CP.onFrame((dt) => {
        acc += dt;
        if (acc >= 1150) {
          acc = 0;
          setPhase((phase + 1) % PHASES.length);
        }
      });
    }
    function stop() { if (off) { off(); off = null; } }

    function setOpen(v) {
      open = v;
      fig.classList.toggle('is-open', v);
      toggle.textContent = v ? 'Chiudi il chip' : 'Apri il chip';
      toggle.setAttribute('aria-pressed', String(v));
      if (!v) { stop(); setPhase(-1); return; }
      if (CP.reduced()) { setPhase(-1); return; }
      // il ciclo parte quando i fili d'oro sono disegnati
      root.setTimeout(() => { if (open) { setPhase(0); run(); } }, 1700);
    }
    toggle.addEventListener('click', () => setOpen(!open));

    if ('IntersectionObserver' in root) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (visible) run(); else stop();
      }).observe(fig);
    }

    if (CP.reduced()) setOpen(true);
    else root.setTimeout(() => setOpen(true), 500);
  }

  function boot() {
    const fig = doc.getElementById('cp-hero-art');
    if (fig) mount(fig);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
