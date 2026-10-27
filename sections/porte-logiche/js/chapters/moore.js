/*
 * Capitolo 9 · La legge di Moore e il futuro (1965 – oggi).
 * La previsione di Gordon Moore e che cosa dice davvero, il potere dei raddoppi, mezzo secolo di transistor su un grafico,
 * che cosa misurano i «nanometri», lo scaling di Dennard e il muro del calore, chiplet e impilamento 3D,
 * il dibattito sulla fine della legge di Moore e il viaggio dell'intera sezione.
 * Laboratori: il grafico di Moore, il potere dei raddoppi, nodi tra nome e realtà, il muro del calore,
 * chiplet contro chip gigante.
 * Figure: il grafico del 1965 ridisegnato; il viaggio della sezione, capitolo per capitolo.
 */
(function () {
  'use strict';

  const { h, s, ui } = PL;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const f1 = (v) => Math.round(v * 10) / 10;

  /* Numeri pseudocasuali con seme: lo stesso disegno a ogni visita. */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Al massimo tre cifre significative, senza zeri inutili: 1.72 → "1,72", 208 → "208", 1.2 → "1,2". */
  function sig(v) {
    if (v >= 100) return PL.fmt(Math.round(v));
    const x = v >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100;
    return PL.fmt(x, 2).replace(/,?0+$/, '');
  }

  /* Numeri grandi a parole: 2300 → "2.300", 1,2e6 → "1,2 milioni", 2,08e11 → "208 miliardi". */
  function big(n) {
    if (n < 1e6) return PL.fmt(Math.round(n));
    if (n < 1e9) return sig(n / 1e6) + (Math.round(n / 1e5) === 10 ? ' milione' : ' milioni');
    if (n < 1e12) return sig(n / 1e9) + (Math.round(n / 1e8) === 10 ? ' miliardo' : ' miliardi');
    if (n < 1e15) return PL.fmt(Math.round(n / 1e9)) + ' miliardi';
    if (n < 1e18) return sig(n / 1e15) + ' milioni di miliardi';
    return sig(n / 1e18) + ' miliardi di miliardi';
  }

  /* Una lunghezza data in millimetri, con l'unità adatta: 0,1 → "0,1 mm", 838.861 → "839 m". */
  function mm(v) {
    if (v < 10) return sig(v) + ' mm';
    if (v < 1000) return sig(v / 10) + ' cm';
    if (v < 1e6) return sig(v / 1000) + ' m';
    return (v < 1e8 ? sig(v / 1e6) : PL.fmt(Math.round(v / 1e6))) + ' km';
  }

  /* Una lunghezza data in nanometri: 10000 → "10 µm", 0,235 → "0,235 nm". */
  function nm(v) {
    if (v >= 1000) return sig(v / 1000) + ' µm';
    if (v >= 1) return sig(v) + ' nm';
    return PL.fmt(v, 3).replace(/,?0+$/, '') + ' nm';
  }

  /* Indici e esponenti in Unicode, per scrivere 2²³ senza markup. */
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sup = (k) => String(k).split('').map((c) => SUP[+c]).join('');

  /* ---------- i dati: mezzo secolo di chip ---------- */
  // Transistor dichiarati dai costruttori. t: data di presentazione in anni (novembre 1971 → 1971,87).
  // multi: più die nello stesso contenitore. dx: piccolo spostamento solo grafico, per due chip quasi sovrapposti.

  const KIND = {
    cpu: { label: 'Processore (CPU)' },
    gpu: { label: 'Processore grafico (GPU)' },
    soc: { label: 'System on a chip' },
    wafer: { label: 'Chip grande come un wafer' },
  };

  const CHIPS = [
    { name: 'Intel 4004', t: 1971.87, when: 'novembre 1971', n: 2300, kind: 'cpu', lbl: 1, note: 'Il primo microprocessore in commercio, a 4 bit: il punto di partenza del grafico.' },
    { name: 'Intel 8008', t: 1972.29, when: 'aprile 1972', n: 3500, kind: 'cpu', note: 'Il primo microprocessore a 8 bit della Intel.' },
    { name: 'Intel 8080', t: 1974.29, when: 'aprile 1974', n: 6000, kind: 'cpu', note: 'Intel dichiara 6.000 transistor; altre fonti ne contano circa 4.500.' },
    { name: 'MOS 6502', t: 1975.71, when: 'settembre 1975', n: 3510, kind: 'cpu', note: 'Piccolo ed economico, finì nell\'Apple II e in molti computer di casa: meno transistor dei rivali, non di più.' },
    { name: 'Intel 8086', t: 1978.44, when: 'giugno 1978', n: 29000, kind: 'cpu', lbl: 2, note: 'Il capostipite dei processori x86 dei PC.' },
    { name: 'Motorola 68000', t: 1979.5, when: '1979', n: 68000, kind: 'cpu', note: 'Il processore dei primi Macintosh.' },
    { name: 'Intel 80286', t: 1982.09, when: 'febbraio 1982', n: 134000, kind: 'cpu' },
    { name: 'Intel 80386', t: 1985.8, when: 'ottobre 1985', n: 275000, kind: 'cpu', lbl: 1, note: 'Il primo processore x86 a 32 bit.' },
    { name: 'Intel 80486', t: 1989.27, when: 'aprile 1989', n: 1.2e6, kind: 'cpu', note: 'Il primo x86 oltre il milione di transistor.' },
    { name: 'Intel Pentium', t: 1993.22, when: 'marzo 1993', n: 3.1e6, kind: 'cpu', lbl: 2 },
    { name: 'Intel Pentium Pro', t: 1995.84, when: 'novembre 1995', n: 5.5e6, kind: 'cpu', note: 'Senza contare la cache di secondo livello, che stava su un chip a parte nello stesso contenitore.' },
    { name: 'Intel Pentium 4', t: 2000.89, when: 'novembre 2000', n: 42e6, kind: 'cpu', lbl: 1 },
    { name: 'Itanium 2 «Montecito»', t: 2006.54, when: 'luglio 2006', n: 1.72e9, kind: 'cpu', note: 'Il primo microprocessore oltre il miliardo di transistor: quasi tutti formano i 26,5 MB della sua memoria cache.' },
    { name: 'Intel Core 2 Duo', t: 2006.57, when: 'luglio 2006', n: 291e6, kind: 'cpu', lbl: 2, note: 'Due core e 4 MB di cache: il processore di molti PC di quegli anni.' },
    { name: 'NVIDIA GT200', t: 2008.46, when: 'giugno 2008', n: 1.4e9, kind: 'gpu', note: 'La GPU della scheda grafica GeForce GTX 280.' },
    { name: 'NVIDIA Fermi GF100', t: 2010.23, when: 'marzo 2010', n: 3e9, kind: 'gpu', note: 'La GPU della GeForce GTX 480.' },
    { name: 'Apple A7', t: 2013.69, when: 'settembre 2013', n: 1e9, kind: 'soc', plus: true, note: '«Oltre un miliardo» di transistor, dice Apple, in appena 102 mm²: il chip dell\'iPhone 5s.' },
    { name: 'Apple M1', t: 2020.86, when: 'novembre 2020', n: 16e9, kind: 'soc', lbl: 1, note: 'Il primo chip progettato da Apple per i Mac, a 5 nm.' },
    { name: 'Apple M1 Ultra', t: 2022.18, when: 'marzo 2022', n: 114e9, kind: 'soc', multi: true, dx: 0.4, note: 'Due chip M1 Max da 57 miliardi di transistor, uniti nello stesso contenitore.' },
    { name: 'NVIDIA H100', t: 2022.22, when: 'marzo 2022', n: 80e9, kind: 'gpu', dx: -0.4, note: 'Una GPU per l\'intelligenza artificiale, in un unico chip.' },
    { name: 'Apple A17 Pro', t: 2023.7, when: 'settembre 2023', n: 19e9, kind: 'soc', note: 'Il chip dell\'iPhone 15 Pro.' },
    { name: 'Apple M3 Max', t: 2023.83, when: 'ottobre 2023', n: 92e9, kind: 'soc', note: 'Tutti in un unico chip.' },
    { name: 'NVIDIA B200', t: 2024.21, when: 'marzo 2024', n: 208e9, kind: 'gpu', multi: true, lbl: 1, note: 'Due chip affiancati, collegati così strettamente da lavorare come una sola GPU.' },
    { name: 'Cerebras WSE-3', t: 2024.2, when: 'marzo 2024', n: 4e12, kind: 'wafer', lbl: 1, note: 'Un acceleratore per l\'intelligenza artificiale grande quasi quanto un intero wafer: 46.225 mm², circa 21,5 cm di lato. Un caso a parte.' },
    { name: 'NVIDIA GB202', t: 2025.08, when: 'gennaio 2025', n: 92.2e9, kind: 'gpu', note: 'La GPU della GeForce RTX 5090: tanti transistor quanti circa 317 Core 2 Duo.' },
    { name: 'Apple M3 Ultra', t: 2025.17, when: 'marzo 2025', n: 184e9, kind: 'soc', multi: true, note: 'Due chip M3 Max uniti nello stesso contenitore.' },
  ].sort((a, b) => a.t - b.t);

  /* Retta dei minimi quadrati sul logaritmo: ogni quanti anni raddoppiano i transistor (senza il chip a scala di wafer). */
  function doublingYears() {
    const pts = CHIPS.filter((c) => c.kind !== 'wafer').map((c) => [c.t, Math.log2(c.n)]);
    const n = pts.length;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
    return { years: (n * sxx - sx * sx) / (n * sxy - sx * sy), count: n };
  }

  /* Forme dei punti: il colore e la forma dicono il tipo di chip. */
  function marker(kind, r) {
    if (kind === 'gpu') return s('rect', { class: 'm1-shape', x: -r * 0.86, y: -r * 0.86, width: r * 1.72, height: r * 1.72, rx: 1 });
    if (kind === 'soc') return s('path', { class: 'm1-shape', d: `M0 ${-r * 1.2}L${r * 1.2} 0L0 ${r * 1.2}L${-r * 1.2} 0Z` });
    if (kind === 'wafer') {
      let d = '';
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 5;
        const rr = k % 2 ? r * 0.62 : r * 1.5;
        d += (k ? 'L' : 'M') + f1(Math.cos(a) * rr) + ' ' + f1(Math.sin(a) * rr);
      }
      return s('path', { class: 'm1-shape', d: d + 'Z' });
    }
    return s('circle', { class: 'm1-shape', r });
  }

  /* ---------- laboratorio: il grafico di Moore ---------- */

  function labChart() {
    const T0 = 1970;
    const T1 = 2026.5;
    const LOG0 = 3; // mille
    const LOG1 = 13; // diecimila miliardi
    const LINMAX = 3.2e11;
    const TICK_LOG = ['1.000', '10.000', '100.000', '1 mln', '10 mln', '100 mln', '1 mld', '10 mld', '100 mld', '1.000 mld', '10.000 mld'];
    const LAYOUT = {
      wide: { W: 760, H: 430, L: 72, R: 18, T: 26, B: 40, r: 5, lin: 50e9 },
      narrow: { W: 400, H: 470, L: 54, R: 10, T: 26, B: 40, r: 5.5, lin: 100e9 },
    };
    const reg = doublingYears();
    const N = CHIPS.length;
    const st = { m: new Array(N).fill(0), mg: 0, upto: T1, rate: 2, sel: CHIPS.findIndex((c) => c.name === 'NVIDIA B200'), hot: -1 };
    const mq = window.matchMedia('(max-width: 640px)');
    let G = mq.matches ? LAYOUT.narrow : LAYOUT.wide;
    let pos = [];
    let pts = [];
    let gLin;
    let gLog;
    let trendEl;
    let cross;
    let ring;

    const art = PL.svg('0 0 760 430', { class: 'pl-svg m1-art', tabindex: '0', role: 'group' });
    const clipId = PL.uid('m1c');

    const pw = () => G.W - G.L - G.R;
    const ph = () => G.H - G.T - G.B;
    const X = (t) => G.L + (t - T0) / (T1 - T0) * pw();
    const YLOG = (n) => G.T + ph() * (1 - (Math.log10(n) - LOG0) / (LOG1 - LOG0));
    const YLIN = (n) => Math.max(G.T - 14, G.T + ph() * (1 - n / LINMAX));
    const Y = (n, m) => lerp(YLIN(n), YLOG(n), m);

    function build() {
      art.setAttribute('viewBox', `0 0 ${G.W} ${G.H}`);
      art.replaceChildren();
      const defs = s('defs', null, s('clipPath', { id: clipId }, s('rect', { x: G.L, y: G.T, width: pw(), height: ph() })));
      // griglie: quella lineare e quella logaritmica si scambiano con una dissolvenza
      gLin = s('g', { class: 'm1-grid is-lin' });
      for (let v = 0; v <= LINMAX + 1; v += G.lin) {
        const y = f1(YLIN(v));
        gLin.append(s('line', { x1: G.L, y1: y, x2: G.L + pw(), y2: y }), s('text', { class: 'm1-tick', x: G.L - 8, y: y + 4, 'text-anchor': 'end' }, v ? PL.fmt(v / 1e9) + ' mld' : '0'));
      }
      gLog = s('g', { class: 'm1-grid is-log' });
      for (let k = LOG0; k <= LOG1; k++) {
        const y = f1(YLOG(Math.pow(10, k)));
        gLog.append(s('line', { x1: G.L, y1: y, x2: G.L + pw(), y2: y }), s('text', { class: 'm1-tick', x: G.L - 8, y: y + 4, 'text-anchor': 'end' }, TICK_LOG[k - LOG0]));
      }
      const gx = s('g', { class: 'm1-axis' });
      for (let yr = 1970; yr <= 2020; yr += 10) {
        const x = f1(X(yr));
        gx.append(s('line', { x1: x, y1: G.T + ph(), x2: x, y2: G.T + ph() + 5 }), s('text', { class: 'm1-tick', x, y: G.T + ph() + 19, 'text-anchor': 'middle' }, String(yr)));
      }
      gx.append(
        s('line', { class: 'm1-base', x1: G.L, y1: G.T + ph(), x2: G.L + pw(), y2: G.T + ph() }),
        s('text', { class: 'm1-title', x: G.L - 8, y: 13 }, 'Transistor per chip'),
        s('text', { class: 'm1-title', x: G.L + pw(), y: G.H - 4, 'text-anchor': 'end' }, 'anno di presentazione'));
      trendEl = s('path', { class: 'm1-trend', 'clip-path': `url(#${clipId})` });
      cross = s('g', { class: 'm1-cross' }, s('line', { class: 'is-v' }), s('line', { class: 'is-h' }));
      ring = s('circle', { class: 'm1-ring', r: G.r * 2.3 });
      const gp = s('g', { class: 'm1-pts' });
      pts = CHIPS.map((c, i) => {
        const mk = s('g', { class: 'm1-mk' }, c.multi ? s('g', { class: 'm1-multi' }, marker(c.kind, G.r * 1.65)) : null, marker(c.kind, G.r));
        if (c.kind === 'wafer') mk.append(s('path', { class: 'm1-up', d: `M0 ${-G.r * 2.6}l-4 6h8z` }));
        const g = s('g', { class: 'm1-pt is-' + c.kind }, mk);
        const show = c.lbl === 1 || (c.lbl === 2 && G === LAYOUT.wide);
        if (show) {
          // sopra a sinistra della retta lo spazio è libero; solo il primo chip, vicino al bordo, va sotto a destra
          const first = i === 0;
          g.append(s('text', { class: 'm1-lbl', x: first ? G.r + 5 : -G.r - 6, y: first ? 16 : c.kind === 'wafer' ? -9 : -7, 'text-anchor': first ? 'start' : 'end' }, c.name.replace(/ «.*»/, '')));
        }
        gp.append(g);
        return g;
      });
      art.append(defs, gLin, gLog, gx, trendEl, cross, gp, ring);
      place();
      reveal();
      pick(st.sel, true);
    }

    function place() {
      const lin = 1 - st.mg;
      gLin.style.opacity = clamp(lin * 1.6 - 0.3, 0, 1);
      gLog.style.opacity = clamp(st.mg * 1.6 - 0.3, 0, 1);
      pos = CHIPS.map((c, i) => ({ x: X(c.t + (c.dx || 0)), y: Y(c.n, st.m[i]) }));
      pts.forEach((g, i) => {
        g.setAttribute('transform', `translate(${f1(pos[i].x)} ${f1(pos[i].y)})`);
        const lb = g.querySelector('.m1-lbl');
        // in scala lineare le etichette dei chip piccoli finirebbero tutte sullo zero: restano solo le più alte
        if (lb) lb.style.opacity = CHIPS[i].n >= 1.5e11 ? 1 : clamp(st.m[i] * 2 - 1, 0, 1);
        const up = g.querySelector('.m1-up');
        if (up) up.style.opacity = clamp(1 - st.m[i] * 3, 0, 1);
      });
      let d = '';
      const c0 = CHIPS[0];
      const tEnd = Math.min(st.upto, T1);
      for (let t = c0.t; t <= tEnd + 0.01; t += 0.25) {
        const n = c0.n * Math.pow(2, (t - c0.t) / st.rate);
        d += (d ? 'L' : 'M') + f1(X(t)) + ' ' + f1(Math.max(G.T - 40, Y(n, st.mg)));
      }
      trendEl.setAttribute('d', d);
      mark();
    }

    function reveal() {
      pts.forEach((g, i) => g.classList.toggle('is-in', CHIPS[i].t <= st.upto));
      if (CHIPS[st.sel].t > st.upto) {
        let j = -1;
        CHIPS.forEach((c, i) => { if (c.t <= st.upto) j = i; });
        if (j >= 0) pick(j, true);
      }
    }

    function mark() {
      const i = st.hot >= 0 ? st.hot : st.sel;
      const p = pos[i];
      if (!p) return;
      const on = CHIPS[i].t <= st.upto;
      const y = clamp(p.y, G.T, G.T + ph());
      ring.setAttribute('cx', f1(p.x));
      ring.setAttribute('cy', f1(p.y));
      const [v, hz] = cross.children;
      v.setAttribute('x1', f1(p.x)); v.setAttribute('x2', f1(p.x)); v.setAttribute('y1', f1(y)); v.setAttribute('y2', G.T + ph());
      hz.setAttribute('x1', G.L); hz.setAttribute('x2', f1(p.x)); hz.setAttribute('y1', f1(y)); hz.setAttribute('y2', f1(y));
      ring.style.opacity = on ? 1 : 0;
      cross.style.opacity = on ? 1 : 0;
    }

    // pannello dei dettagli
    const nameEl = h('strong', { class: 'm1-name' });
    const whenEl = h('span', { class: 'm1-when' });
    const countEl = h('p', { class: 'm1-count' });
    const kindEl = h('p', { class: 'm1-kind' });
    const noteEl = h('p', { class: 'm1-note' });
    const predEl = h('p', { class: 'm1-pred' });
    const legend = h('ul', { class: 'm1-legend', 'aria-label': 'Legenda' },
      Object.keys(KIND).map((k) => h('li', { class: 'is-' + k },
        PL.svg('-8 -8 16 16', { class: 'm1-sw', 'aria-hidden': 'true' }, marker(k, 4.5)), KIND[k].label)),
      h('li', { class: 'is-multi' }, PL.svg('-8 -8 16 16', { class: 'm1-sw', 'aria-hidden': 'true' }, s('circle', { class: 'm1-ringsw', r: 6.5 }), s('circle', { r: 3.4 })), 'Più die insieme'));
    const panel = h('div', { class: 'pl-lab-panel m1-panel' },
      h('div', { class: 'm1-pa' }, h('h4', null, 'Il chip'), h('p', { class: 'm1-head' }, nameEl, whenEl), countEl, kindEl),
      h('div', { class: 'm1-pb' }, noteEl, predEl),
      legend);

    function details(i) {
      const c = CHIPS[i];
      nameEl.textContent = c.name;
      whenEl.textContent = c.when;
      countEl.replaceChildren(h('span', null, (c.plus ? 'oltre ' : '') + big(c.n)), ' transistor');
      kindEl.className = 'm1-kind is-' + c.kind;
      kindEl.replaceChildren(PL.svg('-8 -8 16 16', { class: 'm1-sw', 'aria-hidden': 'true' }, marker(c.kind, 4.5)), KIND[c.kind].label + (c.multi ? ', più die insieme' : ''));
      noteEl.textContent = c.note || '';
      const c0 = CHIPS[0];
      const pred = c0.n * Math.pow(2, (c.t - c0.t) / st.rate);
      predEl.textContent = i === 0 ? 'Le rette partono da qui.'
        : 'La retta del raddoppio ' + (st.rate === 2 ? 'ogni due anni' : 'ogni anno') + ' prevede per quella data circa ' + big(pred) + ' transistor.';
    }

    function pick(i, quiet) {
      if (i < 0) return;
      st.sel = i;
      pts.forEach((g, j) => g.classList.toggle('is-sel', j === i));
      details(i);
      mark();
      if (!quiet) art.setAttribute('aria-label', label());
    }

    function label() {
      const c = CHIPS[st.sel];
      return 'Grafico dei transistor per chip dal 1971 al 2025, scala ' + (st.mg > 0.5 ? 'logaritmica' : 'lineare') + '. Usa le frecce per scorrere i chip. Scelto: ' + c.name + ', ' + c.when + ', ' + big(c.n) + ' transistor.';
    }

    // puntatore: si sceglie il punto più vicino, così anche i punti piccoli si prendono facilmente col dito
    function nearest(e) {
      const ctm = art.getScreenCTM();
      if (!ctm) return -1;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      const k = art.getBoundingClientRect().width / G.W;
      let best = -1;
      let bd = Math.pow(28 / k, 2);
      pos.forEach((q, i) => {
        if (CHIPS[i].t > st.upto) return;
        const d = Math.pow(q.x - p.x, 2) + Math.pow(Math.max(G.T - 14, q.y) - p.y, 2);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    }
    art.addEventListener('pointermove', (e) => {
      const i = nearest(e);
      if (i === st.hot) return;
      st.hot = i;
      pts.forEach((g, j) => g.classList.toggle('is-hot', j === i));
      details(i >= 0 ? i : st.sel);
      mark();
    });
    art.addEventListener('pointerleave', () => {
      st.hot = -1;
      pts.forEach((g) => g.classList.remove('is-hot'));
      details(st.sel);
      mark();
    });
    art.addEventListener('pointerdown', (e) => { const i = nearest(e); if (i >= 0) pick(i); });
    art.addEventListener('keydown', (e) => {
      const vis = CHIPS.map((c, i) => i).filter((i) => CHIPS[i].t <= st.upto);
      const at = vis.indexOf(st.sel);
      let j = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') j = vis[Math.min(vis.length - 1, at + 1)];
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') j = vis[Math.max(0, at - 1)];
      if (e.key === 'Home') j = vis[0];
      if (e.key === 'End') j = vis[vis.length - 1];
      if (j == null) return;
      e.preventDefault();
      pick(j);
    });

    // scala lineare ↔ logaritmica: i punti scivolano al loro posto, i più vecchi per primi
    let tw = null;
    function morph(to) {
      if (tw) tw.cancel();
      const from = st.m.slice();
      const g0 = st.mg;
      tw = PL.tween({
        from: 0, to: 1, duration: 1500, ease: PL.motion.ease.linear,
        onUpdate: (p) => {
          const e = PL.motion.ease.inOut;
          st.mg = lerp(g0, to, e(clamp(p / 0.8, 0, 1)));
          for (let i = 0; i < N; i++) st.m[i] = lerp(from[i], to, e(clamp((p - 0.22 * i / (N - 1)) / 0.78, 0, 1)));
          place();
        },
        onDone: () => { explain(); art.setAttribute('aria-label', label()); },
      });
    }

    const readout = h('p');
    function explain() {
      let msg;
      if (st.mg < 0.5) {
        msg = 'In scala lineare ogni tacca vale ' + (G === LAYOUT.wide ? '50' : '100') + ' miliardi di transistor: tutti i chip fino al 2010 circa restano schiacciati sullo zero, e sembra che sia successo tutto negli ultimi anni. <strong>Passa alla scala logaritmica.</strong>';
      } else {
        msg = 'In scala logaritmica ogni riga vale dieci volte quella sotto, e i punti si allineano lungo una retta: è il segno di una crescita esponenziale. La retta che passa più vicino ai ' + reg.count + ' chip, senza il WSE-3, dà <strong>un raddoppio ogni ' + PL.fmt(reg.years, 1) + ' anni</strong>.';
      }
      if (st.rate === 1) msg += ' Con il raddoppio annuale previsto nel 1965, invece, la retta sarebbe arrivata a diecimila miliardi di transistor già nel 2004.';
      readout.replaceChildren(PL.rich(msg));
    }

    const scaleSeg = ui.segmented({
      label: 'Scala verticale', value: 'lin',
      options: [{ value: 'lin', label: 'Lineare' }, { value: 'log', label: 'Logaritmica' }],
      onChange: (v) => morph(v === 'log' ? 1 : 0),
    });
    const rateSeg = ui.segmented({
      label: 'Retta del raddoppio', value: 2,
      options: [{ value: 2, label: 'Ogni 2 anni' }, { value: 1, label: 'Ogni anno' }],
      onChange: (v) => { st.rate = +v; place(); details(st.hot >= 0 ? st.hot : st.sel); explain(); },
    });
    const yearSl = ui.slider({
      label: 'Fino al', min: 1971, max: 2025, step: 1, value: 2025, format: (v) => String(v),
      onInput: (v) => { stopPlay(); st.upto = v === 2025 ? T1 : v + 0.999; place(); reveal(); },
    });
    let play = null;
    function stopPlay() { if (play) { play.cancel(); play = null; } }
    function replay() {
      stopPlay();
      play = PL.tween({
        from: 1971.5, to: T1, duration: 5200, ease: PL.motion.ease.linear,
        onUpdate: (v) => {
          st.upto = v;
          yearSl.set(Math.min(2025, Math.floor(v)), true);
          place();
          reveal();
          // durante la riproduzione il pannello segue l'ultimo chip comparso
          let j = -1;
          CHIPS.forEach((c, i) => { if (c.t <= v) j = i; });
          if (j >= 0 && j !== st.sel) pick(j, true);
        },
        onDone: () => { play = null; },
      });
    }
    const playBtn = ui.btn({ label: 'Riproduci', icon: '▶', kind: 'lab', onClick: replay });

    PL.listen(mq, 'change', () => { G = mq.matches ? LAYOUT.narrow : LAYOUT.wide; build(); explain(); });
    build();
    explain();
    art.setAttribute('aria-label', label());
    if (!PL.reduced()) {
      st.upto = 1971.9;
      place();
      reveal();
      PL.onVisible(art, replay, { threshold: 0.35 });
    }

    return ui.lab({
      title: 'Il grafico di Moore',
      intro: 'I transistor dei chip più famosi, dal 1971 a oggi. Parti dalla scala lineare, poi passa a quella logaritmica e guarda dove finiscono i punti. Tocca un punto, o usa le frecce, per i dettagli.',
      controls: [scaleSeg.el, rateSeg.el, yearSl.el, playBtn],
      stage: h('div', { class: 'pl-lab-grid m1-layout' }, h('div', { class: 'm1-wrap' }, art), panel),
      readout,
      caption: 'Numeri di transistor dichiarati dai costruttori, per chip presentati tra il 1971 e il 2025; per alcuni le fonti non sono d\'accordo (l\'Intel 8080 ne ha 4.500 o 6.000, a seconda di chi li conta). Le rette partono dall\'Intel 4004. I chip con il contorno doppio sono fatti di due die nello stesso contenitore; il Cerebras WSE-3, grande quasi come un wafer, è un caso a parte e non entra nel calcolo del ritmo medio.',
      class: 'm1-lab',
      wide: true,
    });
  }

  /* ---------- figura: il grafico del 1965, ridisegnato ---------- */

  function fig1965() {
    const W = 560;
    const H = 320;
    const L = 70;
    const R = 26;
    const T = 22;
    const B = 46;
    const X = (yr) => L + (yr - 1959) / 16 * (W - L - R);
    const Y = (k) => T + (1 - k / 16) * (H - T - B);
    const clipId = PL.uid('m0c');
    const reveal = s('rect', { x: L - 8, y: 0, width: 0, height: H });
    const art = PL.svg(`0 0 ${W} ${H}`, { class: 'pl-svg m0-art', role: 'img', 'aria-label': 'Grafico ridisegnato dall\'articolo di Moore del 1965: in orizzontale gli anni dal 1959 al 1975, in verticale il numero di componenti per circuito integrato su scala logaritmica in base 2. Una retta sale da 1 componente nel 1959 a circa 64 nel 1965; tratteggiata, la previsione continua fino a 65.536 nel 1975.' },
      s('defs', null, s('clipPath', { id: clipId }, reveal)));
    const grid = s('g', { class: 'm0-grid' });
    for (let k = 0; k <= 16; k += 2) {
      const y = f1(Y(k));
      grid.append(s('line', { x1: L, y1: y, x2: W - R, y2: y }), s('text', { class: 'm0-tick', x: L - 8, y: y + 4, 'text-anchor': 'end' }, PL.fmt(Math.pow(2, k))));
    }
    for (let yr = 1959; yr <= 1975; yr += 2) {
      const x = f1(X(yr));
      grid.append(s('line', { class: 'is-x', x1: x, y1: Y(0), x2: x, y2: Y(0) + 5 }), s('text', { class: 'm0-tick', x, y: Y(0) + 19, 'text-anchor': 'middle' }, String(yr)));
    }
    grid.append(s('line', { class: 'm0-base', x1: L, y1: Y(0), x2: W - R, y2: Y(0) }),
      s('text', { class: 'm0-title', x: L - 8, y: 12 }, 'Componenti per circuito integrato'),
      s('text', { class: 'm0-title', x: W - R, y: H - 6, 'text-anchor': 'end' }, 'anno'));
    const lines = s('g', { 'clip-path': `url(#${clipId})` },
      s('line', { class: 'm0-data', x1: X(1959), y1: Y(0), x2: X(1965), y2: Y(6) }),
      s('line', { class: 'm0-pred', x1: X(1965), y1: Y(6), x2: X(1975), y2: Y(16) }),
      s('circle', { class: 'm0-dot', cx: X(1959), cy: Y(0), r: 4.5 }),
      s('circle', { class: 'm0-dot', cx: X(1965), cy: Y(6), r: 4.5 }),
      s('circle', { class: 'm0-end', cx: X(1975), cy: Y(16), r: 6 }));
    const notes = s('g', { class: 'm0-notes' },
      s('text', { class: 'm0-note', x: X(1965) + 10, y: Y(6) + 18 }, 'circa 64 componenti nel 1965'),
      s('text', { class: 'm0-note is-pred', x: X(1975) - 10, y: Y(16) + 4, 'text-anchor': 'end' }, '65.536 nel 1975'),
      s('text', { class: 'm0-note is-soft', x: f1(X(1970)), y: f1(Y(11) - 10), transform: `rotate(-28.5 ${f1(X(1970))} ${f1(Y(11) - 10)})`, 'text-anchor': 'middle' }, 'un raddoppio all\'anno'));
    art.append(grid, lines, notes);
    const end = W - R + 12 - (L - 8);
    const show = () => { reveal.setAttribute('width', end); art.classList.add('is-in'); };
    if (PL.reduced()) show();
    else {
      PL.onVisible(art, () => PL.tween({
        from: 0, to: end, duration: 1800, ease: PL.motion.ease.inOut,
        onUpdate: (v) => reveal.setAttribute('width', f1(v)),
        onDone: () => art.classList.add('is-in'),
      }), { threshold: 0.5 });
    }
    return ui.figure({
      art,
      class: 'm0-fig',
      caption: 'Il grafico dell\'articolo del 1965, ridisegnato in modo semplificato. In verticale c\'è il numero di componenti per circuito integrato su una scala in cui ogni riga vale quattro volte quella sotto. Moore aveva pochi punti, dal 1959 al 1965, e li prolungò con una retta per altri dieci anni: dieci raddoppi portano da 64 a 65.536 componenti.',
    });
  }

  /* ---------- laboratorio: il potere dei raddoppi ---------- */

  function labDoubling() {
    const MAX = 42;
    const BOX = 340;
    const C = 200;
    // il rettangolo di 2^k quadratini: larghezza e altezza raddoppiano a turno, come i fogli A4, A3, A2…
    const dims = (k) => [Math.pow(2, Math.ceil(k / 2)), Math.pow(2, Math.floor(k / 2))];
    const fit = (k) => { const [w, hh] = dims(k); return { cx: w / 2, cy: hh / 2, ls: Math.log2(BOX / w) }; };
    const PAPER = [
      [0, 'lo spessore di un foglio di carta'],
      [7, 'più di un centimetro'],
      [10, 'più o meno il palmo di una mano'],
      [14, 'alto come una persona'],
      [17, 'un palazzo di quattro piani'],
      [20, 'un campo da calcio messo in piedi'],
      [23, 'poco più del Burj Khalifa di Dubai, il grattacielo più alto del mondo (828 m)'],
      [24, 'più di un chilometro'],
      [27, 'più in alto dell\'Everest (8.849 m) e degli aerei di linea'],
      [30, 'oltre i 100 km dove, per convenzione, comincia lo spazio'],
      [33, 'più in alto della Stazione spaziale internazionale, che orbita a circa 400 km'],
      [36, 'più del raggio della Terra (6.371 km)'],
      [39, 'oltre i satelliti geostazionari, a circa 36.000 km'],
      [42, 'oltre la Luna, che dista in media 384.400 km'],
    ];
    const st = { n: 0, view: fit(0) };

    const art = PL.svg('0 0 400 400', { class: 'pl-svg m2-art', role: 'img' });
    const pid = PL.uid('m2p');
    const defs = s('defs', null, s('pattern', { id: pid, patternUnits: 'userSpaceOnUse', width: 1, height: 1 },
      s('rect', { class: 'm2-cellp', x: 0.09, y: 0.09, width: 0.82, height: 0.82, rx: 0.14 })));
    const world = s('g', { class: 'm2-world' });
    const baseFlat = s('rect', { class: 'm2-flat', x: 0, y: 0 });
    const baseCells = s('rect', { class: 'm2-cells', x: 0, y: 0, fill: `url(#${pid})` });
    const newFlat = s('rect', { class: 'm2-flat is-new' });
    const newCells = s('rect', { class: 'm2-cells is-new', fill: `url(#${pid})` });
    const outlines = [];
    const gOut = s('g', { class: 'm2-outs' });
    for (let k = 0; k <= MAX; k++) {
      const [w, hh] = dims(k);
      const r = s('rect', { x: 0, y: 0, width: w, height: hh, 'vector-effect': 'non-scaling-stroke' });
      outlines.push(r);
      gOut.append(r);
    }
    world.append(baseFlat, baseCells, newFlat, newCells, gOut);
    const origin = s('g', { class: 'm2-origin' }, s('line'), s('circle', { r: 3.5 }), s('text', { class: 'm2-t' }, 'il primo quadratino'));
    const addLbl = s('text', { class: 'm2-t is-add', 'text-anchor': 'middle' });
    art.append(defs, s('rect', { class: 'm2-frame', x: 6, y: 6, width: 388, height: 388, rx: 14 }), world, origin, addLbl);

    let slide = 1; // 0 → la metà nuova parte sopra la vecchia; 1 → è al suo posto
    function draw() {
      const n = st.n;
      const v = st.view;
      const sc = Math.pow(2, v.ls);
      world.setAttribute('transform', `translate(${f1(C - v.cx * sc)} ${f1(C - v.cy * sc)}) scale(${sc})`);
      // quadratini visibili finché sono larghi qualche pixel, poi un colore pieno
      const cellsOn = clamp((sc - 1.6) / 3, 0, 1);
      if (n === 0) {
        for (const r of [baseFlat, baseCells]) r.setAttribute('width', 0);
        for (const r of [newFlat, newCells]) { r.setAttribute('x', 0); r.setAttribute('y', 0); r.setAttribute('width', 1); r.setAttribute('height', 1); }
      } else {
        const [ow, oh] = dims(n - 1);
        const dx = n % 2 ? ow : 0;
        const dy = n % 2 ? 0 : oh;
        for (const r of [baseFlat, baseCells]) { r.setAttribute('width', ow); r.setAttribute('height', oh); }
        for (const r of [newFlat, newCells]) {
          r.setAttribute('x', dx * slide); r.setAttribute('y', dy * slide);
          r.setAttribute('width', ow); r.setAttribute('height', oh);
        }
      }
      baseCells.style.opacity = cellsOn;
      newCells.style.opacity = cellsOn;
      outlines.forEach((r, k) => {
        const px = dims(k)[0] * sc;
        r.style.opacity = k > n ? 0 : clamp((px - 4) / 14, 0, 1) * (k === n ? 0.9 : 0.55);
      });
      // dov'è finito il quadratino di partenza
      const ox = C + (0.5 - v.cx) * sc;
      const oy = C + (0.5 - v.cy) * sc;
      const [ln, dot, tx] = origin.children;
      origin.style.opacity = clamp((24 - sc) / 6, 0, 1);
      dot.setAttribute('cx', f1(ox)); dot.setAttribute('cy', f1(oy));
      ln.setAttribute('x1', f1(ox)); ln.setAttribute('y1', f1(oy)); ln.setAttribute('x2', f1(ox + 34)); ln.setAttribute('y2', f1(oy + 30));
      tx.setAttribute('x', f1(ox + 38)); tx.setAttribute('y', f1(oy + 40));
      // l'etichetta della metà nuova
      if (n === 0) {
        addLbl.setAttribute('x', C); addLbl.setAttribute('y', C + 6);
        addLbl.textContent = '1 quadratino';
      } else {
        const [ow, oh] = dims(n - 1);
        const nx = (n % 2 ? ow : 0) * slide + ow / 2;
        const ny = (n % 2 ? 0 : oh) * slide + oh / 2;
        addLbl.setAttribute('x', f1(C + (nx - v.cx) * sc));
        addLbl.setAttribute('y', f1(C + (ny - v.cy) * sc + 6));
        addLbl.textContent = '+ ' + big(Math.pow(2, n - 1));
      }
      addLbl.style.opacity = slide;
    }

    const nEl = h('span', { class: 'm2-n' });
    const cellsEl = h('dd');
    const paperEl = h('dd');
    const paperT = h('small');
    const trEl = h('dd');
    const trT = h('small');
    const panel = h('div', { class: 'pl-lab-panel m2-panel' },
      h('p', { class: 'm2-big' }, nEl, h('span', null, 'raddoppi')),
      h('dl', { class: 'm2-dl' },
        h('dt', null, 'Quadratini'), cellsEl,
        h('dt', null, 'Un foglio da 0,1 mm piegato a metà altrettante volte'), paperEl, h('dd', { class: 'is-wide' }, paperT),
        h('dt', null, 'Transistor, partendo dai 2.300 del 4004 e raddoppiando ogni due anni'), trEl, h('dd', { class: 'is-wide' }, trT)));
    const readout = h('p');

    function texts() {
      const n = st.n;
      const tot = Math.pow(2, n);
      nEl.textContent = String(n);
      cellsEl.textContent = '2' + sup(n) + ' = ' + PL.fmt(tot);
      paperEl.textContent = mm(0.1 * tot);
      let pt = PAPER[0][1];
      for (const [k, t] of PAPER) if (n >= k) pt = t;
      paperT.textContent = pt.charAt(0).toUpperCase() + pt.slice(1) + '.';
      const year = 1971 + 2 * n;
      const pred = 2300 * tot;
      trEl.textContent = big(pred);
      if (year <= 2025) {
        let real = null;
        for (const c of CHIPS) if (c.kind !== 'wafer' && Math.floor(c.t) <= year) real = c;
        trT.textContent = 'Nel ' + year + '. Il chip più recente del grafico a quella data: ' + real.name + ' (' + Math.floor(real.t) + '), ' + (real.plus ? 'oltre ' : '') + big(real.n) + ' transistor.';
      } else {
        trT.textContent = 'Nel ' + year + ', se il ritmo continuasse così: è solo un\'ipotesi.';
      }
      let msg = n === 0
        ? 'Si parte da un quadratino. Premi «Raddoppia»: a ogni passo il rettangolo si copia accanto a sé stesso.'
        : 'A ogni raddoppio la parte nuova, in azzurro, è grande quanto tutto quello che c\'era prima: <strong>' + big(Math.pow(2, n - 1)) + '</strong> quadratini in più, in un passo solo.';
      if (n >= 8) msg += ' Il quadratino di partenza ormai si vede appena.';
      if (n > 12) msg += ' Nella realtà nessuno è mai riuscito a piegare un foglio più di 12 volte: qui conta solo l\'aritmetica.';
      readout.replaceChildren(PL.rich(msg));
      art.setAttribute('aria-label', 'Un rettangolo fatto di ' + PL.fmt(tot) + ' quadratini, dopo ' + n + ' raddoppi. La metà aggiunta per ultima è evidenziata.');
    }

    let tw = null;
    function go(n, how) {
      n = clamp(Math.round(n), 0, MAX);
      if (tw) tw.cancel();
      const step = how === 'step' && n === st.n + 1;
      const from = Object.assign({}, st.view);
      const to = fit(n);
      st.n = n;
      slider.set(n, true);
      texts();
      slide = step ? 0 : 1;
      if (how === 'jump') { st.view = to; draw(); return; }
      tw = PL.tween({
        from: 0, to: 1, duration: step ? 900 : 420, ease: PL.motion.ease.linear,
        onUpdate: (p) => {
          const e = PL.motion.ease.inOut;
          if (step) slide = e(clamp(p / 0.55, 0, 1));
          const q = e(step ? clamp((p - 0.35) / 0.65, 0, 1) : p);
          st.view = { cx: lerp(from.cx, to.cx, q), cy: lerp(from.cy, to.cy, q), ls: lerp(from.ls, to.ls, q) };
          draw();
        },
        onDone: () => { slide = 1; st.view = to; draw(); },
      });
    }

    let auto = null;
    function stopAuto() {
      if (auto) { clearInterval(auto); auto = null; }
      autoBtn.textContent = '';
      autoBtn.append(h('span', { class: 'pl-btn-icon', 'aria-hidden': 'true' }, '▶'), 'Automatico');
    }
    const slider = ui.slider({ label: 'Raddoppi', min: 0, max: MAX, step: 1, value: 0, onInput: (v) => { stopAuto(); go(v, 'drag'); } });
    const stepBtn = ui.btn({ label: 'Raddoppia', icon: '×2', kind: 'lab', onClick: () => { stopAuto(); go(st.n + 1, 'step'); } });
    const resetBtn = ui.btn({ label: 'Da capo', icon: '↺', kind: 'lab', onClick: () => { stopAuto(); go(0, 'drag'); } });
    const autoBtn = ui.btn({
      label: 'Automatico', icon: '▶', kind: 'lab',
      onClick: () => {
        if (auto) { stopAuto(); return; }
        if (st.n >= MAX) go(0, 'jump');
        autoBtn.textContent = '';
        autoBtn.append(h('span', { class: 'pl-btn-icon', 'aria-hidden': 'true' }, '❚❚'), 'Pausa');
        auto = setInterval(() => { if (st.n >= MAX) stopAuto(); else go(st.n + 1, 'step'); }, PL.reduced() ? 700 : 1100);
      },
    });
    PL.onCleanup(() => { if (auto) clearInterval(auto); });
    texts();
    draw();

    return ui.lab({
      title: 'Il potere dei raddoppi',
      intro: 'Un quadratino, poi due, quattro, otto… Raddoppia un passo alla volta e guarda che fine fa il primo quadratino. Accanto, la stessa crescita misurata in fogli di carta piegati e in transistor.',
      controls: [stepBtn, autoBtn, resetBtn, slider.el],
      stage: h('div', { class: 'pl-lab-grid m2-layout' }, h('div', { class: 'm2-wrap' }, art), panel),
      readout,
      caption: 'Il rettangolo raddoppia allungandosi a turno in larghezza e in altezza, e lo zoom si allontana per farlo stare nel riquadro. Le altezze del foglio sono calcolate: 0,1 mm moltiplicato per 2 tante volte quanti sono i raddoppi. Ogni due anni di legge di Moore corrispondono a un raddoppio.',
      class: 'm2-lab',
    });
  }

  /* ---------- laboratorio: nodi, tra nome e realtà ---------- */
  // v: il nome del nodo in nanometri. gate: lunghezza fisica del gate; cpp: passo tra i gate con i contatti;
  // mmp: passo minimo delle piste di metallo. Processi Intel fino al 14 nm, TSMC per 7, 5 e 3 nm;
  // irds: lunghezza del gate secondo la roadmap internazionale IRDS.

  const NODES = [
    { name: '10 µm', v: 10000, year: 1971, gate: 10000, note: 'Il processo dell\'Intel 4004: il gate dei transistor era lungo davvero circa 10 µm, più di un globulo rosso.' },
    { name: '3 µm', v: 3000, year: 1978, about: true, gate: 3000, note: 'Fine anni Settanta, circa 1977 – 1978: è il processo dell\'Intel 8086. Il gate misurava ancora circa 3 µm, come diceva il nome.' },
    { name: '1 µm', v: 1000, year: 1985, about: true, gate: 1000, note: 'Metà anni Ottanta, circa 1984 – 1986. Il gate era lungo circa un micrometro, cioè un millesimo di millimetro.' },
    { name: '0,5 µm', v: 500, year: 1993, about: true, gate: 500, note: 'Primi anni Novanta. Il gate era lungo ancora circa mezzo micrometro, ma di lì a poco la misura reale cominciò a scendere sotto il nome.' },
    { name: '250 nm', v: 250, year: 1997, gate: 200, note: 'Il processo Intel del 1997: il gate misurava già circa 200 nm, un po\' meno di quanto dicesse il nome.' },
    { name: '180 nm', v: 180, year: 1999, gate: 140, note: 'Nel 1999 i transistor Intel di questo nodo avevano gate di circa 140 nm.' },
    { name: '130 nm', v: 130, year: 2001, gate: 70, note: 'I transistor avevano gate di circa 70 nm, quasi la metà del valore indicato dal nome.' },
    { name: '90 nm', v: 90, year: 2004, gate: 50, cpp: 315, note: 'Nel processo Intel, in produzione dal 2003, il gate era lungo circa 45 – 50 nm e due gate vicini distavano circa 310 – 320 nm.' },
    { name: '45 nm', v: 45, year: 2007, gate: 35, cpp: 160, note: 'Intel, 2007: passo tra i gate di 160 nm, gate lunghi circa 35 – 45 nm.' },
    { name: '22 nm', v: 22, year: 2012, gate: 25, cpp: 90, mmp: 80, note: 'Intel, 2012, i primi FinFET prodotti in grandi volumi: passo tra i gate di 90 nm, piste a passo di 80 nm, gate di circa 25 nm. Nome e gate quasi si toccano, ma solo perché si stanno incrociando.' },
    { name: '14 nm', v: 14, year: 2014, cpp: 70, mmp: 52, note: 'Intel, 2014: passo tra i gate di 70 nm, piste a passo di 52 nm. Nessuna misura del chip vale davvero 14 nm.' },
    { name: '7 nm', v: 7, year: 2018, cpp: 57, mmp: 40, note: 'TSMC, 2018: passo tra i gate di circa 57 nm, piste a passo di circa 40 nm.' },
    { name: '5 nm', v: 5, year: 2020, gate: 18, cpp: 51, mmp: 28, irds: true, note: 'TSMC, 2020: passo tra i gate di circa 51 nm, piste a passo di circa 28 – 30 nm. Il gate, secondo la roadmap IRDS, è lungo circa 18 nm.' },
    { name: '3 nm', v: 3, year: 2022, gate: 16, cpp: 48, mmp: 23, irds: true, note: 'In produzione dal 2022. Nel processo TSMC il passo tra i gate è di circa 45 – 48 nm e quello delle piste di circa 23 nm: misure da 8 a 16 volte più grandi del nome.' },
    { name: '2 nm', v: 2, year: 2025, gate: 14, cpp: 45, mmp: 20, irds: true, note: 'TSMC non ha pubblicato le misure del suo processo N2, e l\'Intel 18A ha un passo tra i gate di 50 nm. Qui i valori della roadmap IRDS: passi di circa 45 e 20 nm, gate di circa 14 nm.' },
  ];

  const SMALL = [
    { id: 'capello', name: 'Un capello', v: 70000, text: 'spesso 50.000 – 100.000 nm' },
    { id: 'globulo', name: 'Un globulo rosso', v: 7500, text: 'largo circa 7.500 nm' },
    { id: 'batterio', name: 'Un batterio', v: 2000, text: 'Escherichia coli è lungo circa 2.000 nm' },
    { id: 'virus', name: 'Un virus', v: 100, text: 'come quello dell\'influenza: circa 100 nm' },
    { id: 'dna', name: 'Il DNA', v: 2, text: 'la doppia elica è larga circa 2 nm' },
    { id: 'atomi', name: 'Due atomi di silicio', v: 0.235, text: 'distano 0,235 nm' },
  ];

  function labNodes() {
    const LAYOUT = {
      wide: { W: 560, H: 360, L: 58, R: 14, T: 24, B: 38 },
      narrow: { W: 400, H: 360, L: 50, R: 10, T: 24, B: 38 },
    };
    const SERIES = [
      { id: 'name', key: 'v', label: 'Il nome del nodo' },
      { id: 'gate', key: 'gate', label: 'Lunghezza del gate' },
      { id: 'cpp', key: 'cpp', label: 'Passo tra i gate' },
    ];
    const mq = window.matchMedia('(max-width: 640px)');
    let G = mq.matches ? LAYOUT.narrow : LAYOUT.wide;
    const st = { t1: 1994, sel: 2, era: 'old' };
    const art = PL.svg('0 0 560 360', { class: 'pl-svg m3-art', role: 'img' });
    let parts = null;

    const pw = () => G.W - G.L - G.R;
    const ph = () => G.H - G.T - G.B;
    const X = (yr) => G.L + (yr - 1969) / (st.t1 - 1969) * pw();
    const Y = (v) => G.T + ph() * (1 - (Math.log10(v) - 0) / 4.4);

    function build() {
      art.setAttribute('viewBox', `0 0 ${G.W} ${G.H}`);
      art.replaceChildren();
      const clipId = PL.uid('m3c');
      const grid = s('g', { class: 'm3-grid' });
      [[1, '1 nm'], [10, '10 nm'], [100, '100 nm'], [1000, '1 µm'], [10000, '10 µm']].forEach(([v, t]) => {
        const y = f1(Y(v));
        grid.append(s('line', { x1: G.L, y1: y, x2: G.L + pw(), y2: y }), s('text', { class: 'm3-tick', x: G.L - 8, y: y + 4, 'text-anchor': 'end' }, t));
      });
      const xt = s('g', { class: 'm3-xt' });
      const lines = {};
      const dots = {};
      for (const se of SERIES) {
        lines[se.id] = s('path', { class: 'm3-line is-' + se.id });
        dots[se.id] = NODES.map((nd) => (nd[se.key] ? s('circle', { class: 'm3-dot is-' + se.id + (se.id === 'gate' && nd.irds ? ' is-proj' : ''), r: se.id === 'name' ? 4.2 : 3.6 }) : null));
      }
      const proj = s('path', { class: 'm3-line is-gate is-gap' });
      const selLine = s('line', { class: 'm3-sel' });
      const hit = s('rect', { class: 'm3-hit', x: G.L, y: G.T, width: pw(), height: ph() });
      art.append(
        s('defs', null, s('clipPath', { id: clipId }, s('rect', { x: G.L - 6, y: G.T - 10, width: pw() + 12, height: ph() + 20 }))),
        grid, xt,
        s('line', { class: 'm3-base', x1: G.L, y1: G.T + ph(), x2: G.L + pw(), y2: G.T + ph() }),
        s('text', { class: 'm3-title', x: G.L - 8, y: 13 }, 'Misura (scala logaritmica)'),
        s('g', { 'clip-path': `url(#${clipId})` }, selLine, lines.name, proj, lines.cpp, lines.gate,
          ...SERIES.flatMap((se) => dots[se.id].filter(Boolean))),
        hit);
      parts = { xt, lines, dots, proj, selLine, hit };
      hit.addEventListener('pointerdown', (e) => {
        const ctm = art.getScreenCTM();
        if (!ctm) return;
        const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
        let best = 0;
        NODES.forEach((nd, i) => { if (Math.abs(X(nd.year) - p.x) < Math.abs(X(NODES[best].year) - p.x)) best = i; });
        if (NODES[best].year <= st.t1) select(best);
      });
      place();
    }

    function place() {
      const { xt, lines, dots, proj, selLine } = parts;
      xt.replaceChildren();
      const step = st.t1 > 2010 ? 10 : 5;
      for (let yr = 1970; yr <= st.t1; yr += step) {
        const x = f1(X(yr));
        xt.append(s('line', { x1: x, y1: G.T + ph(), x2: x, y2: G.T + ph() + 5 }), s('text', { class: 'm3-tick', x, y: G.T + ph() + 19, 'text-anchor': 'middle' }, String(yr)));
      }
      for (const se of SERIES) {
        let d = '';
        let prev = null;
        NODES.forEach((nd, i) => {
          const v = nd[se.key];
          const dot = dots[se.id][i];
          if (!v) return;
          const x = f1(X(nd.year));
          const y = f1(Y(v));
          const vis = nd.year <= st.t1 + 0.01;
          dot.setAttribute('cx', x);
          dot.setAttribute('cy', y);
          dot.style.opacity = vis ? 1 : 0;
          dot.classList.toggle('is-sel', i === st.sel);
          if (!vis) return;
          // il gate non ha dati per 14 e 7 nm: quel tratto è disegnato a parte, tratteggiato
          const jump = se.id === 'gate' && prev != null && NODES[prev].year === 2012 && nd.year === 2020;
          d += (d && !jump ? 'L' : 'M') + x + ' ' + y;
          prev = i;
        });
        lines[se.id].setAttribute('d', d);
      }
      const a = NODES.find((nd) => nd.year === 2012);
      const b = NODES.find((nd) => nd.year === 2020);
      proj.setAttribute('d', st.t1 >= 2020 ? `M${f1(X(a.year))} ${f1(Y(a.gate))}L${f1(X(b.year))} ${f1(Y(b.gate))}` : '');
      const nd = NODES[st.sel];
      selLine.setAttribute('x1', f1(X(nd.year)));
      selLine.setAttribute('x2', f1(X(nd.year)));
      selLine.setAttribute('y1', G.T);
      selLine.setAttribute('y2', G.T + ph());
    }

    // righello delle cose piccole, con i segni del nodo scelto
    const ruler = PL.svg('0 0 760 184', { class: 'pl-svg m3-ruler', role: 'img' });
    const glyph = {
      capello: () => s('path', { class: 'm3-g', d: 'M-9 8C-4 0 4 -2 9 -10' }),
      globulo: () => [s('ellipse', { class: 'm3-g is-fill', rx: 8, ry: 6 }), s('ellipse', { class: 'm3-g', rx: 3.5, ry: 2.4 })],
      batterio: () => s('rect', { class: 'm3-g is-fill', x: -9, y: -4.5, width: 18, height: 9, rx: 4.5 }),
      virus: () => [s('circle', { class: 'm3-g is-fill', r: 5.5 }), s('path', { class: 'm3-g', d: 'M0 -6v-3M0 6v3M-6 0h-3M6 0h3M4.2 -4.2l2.2 -2.2M-4.2 4.2l-2.2 2.2M4.2 4.2l2.2 2.2M-4.2 -4.2l-2.2 -2.2' })],
      dna: () => s('path', { class: 'm3-g', d: 'M-8 -6C-4 -6 -4 6 0 6S4 -6 8 -6M-8 6C-4 6 -4 -6 0 -6S4 6 8 6' }),
      atomi: () => [s('circle', { class: 'm3-g is-fill', cx: -4, r: 3.2 }), s('circle', { class: 'm3-g is-fill', cx: 4, r: 3.2 })],
    };
    const ry = 78;
    let RL = null;
    const RX = (v) => RL.L + (Math.log10(v) + 1) / 6 * (RL.W - RL.L - RL.R);
    const mGate = s('g', { class: 'm3-mark is-gate' }, s('path', { d: 'M0 0l-6 -10h12z' }), s('text', { y: -15, 'text-anchor': 'middle' }, 'gate'));
    const mName = s('g', { class: 'm3-mark is-name' }, s('line', { x1: 0, y1: 0, x2: 0, y2: 22 }), s('path', { d: 'M0 22l-6 10h12z' }), s('text', { y: 46, 'text-anchor': 'middle' }, 'nome'));
    function buildRuler() {
      RL = mq.matches ? { W: 400, L: 18, R: 18 } : { W: 760, L: 26, R: 26 };
      ruler.setAttribute('viewBox', `0 0 ${RL.W} 184`);
      ruler.replaceChildren(s('line', { class: 'm3-raxis', x1: RL.L, y1: ry, x2: RL.W - RL.R, y2: ry }));
      [0.1, 1, 10, 100, 1000, 10000, 100000].forEach((v, i) => {
        const x = f1(RX(v));
        ruler.append(s('line', { class: 'm3-rtick', x1: x, y1: ry - 5, x2: x, y2: ry + 5 }));
        if (!mq.matches || i % 2 === 0) ruler.append(s('text', { class: 'm3-rlab', x, y: ry + 17, 'text-anchor': 'middle' }, nm(v)));
      });
      SMALL.forEach((it, i) => {
        const x = f1(RX(it.v));
        const up = i % 2 === 0;
        const gy = up ? ry - 42 : ry + 72;
        // le etichette vicino ai bordi si allineano verso l'interno
        // sul telefono il batterio e il capello sono vicini: l'etichetta del batterio si sposta a sinistra
        const anchor = x < 70 ? 'start' : x > RL.W - 70 || (mq.matches && it.id === 'batterio') ? 'end' : 'middle';
        const tx = anchor === 'start' ? x - 10 : anchor === 'end' ? x + 10 : x;
        ruler.append(s('g', { class: 'm3-item' },
          s('line', { class: 'm3-rlead', x1: x, y1: up ? ry - 8 : ry + 22, x2: x, y2: up ? gy + 9 : gy - 9 }),
          s('g', { transform: `translate(${x} ${gy})` }, glyph[it.id]()),
          s('text', { class: 'm3-rname', x: tx, y: up ? gy - 14 : gy + 22, 'text-anchor': anchor }, it.name)));
      });
      ruler.append(mGate, mName);
    }
    buildRuler();
    ruler.setAttribute('aria-label', 'Righello su scala logaritmica da 0,1 nm a 100 µm: ' + SMALL.map((it) => it.name.toLowerCase() + ', ' + it.text).join('; ') + '.');

    // pannello: le misure del nodo scelto, in proporzione tra loro
    const nameEl = h('strong', { class: 'm3-name' });
    const yearEl = h('span', { class: 'm3-year' });
    const ROWS = [['v', 'Nome'], ['gate', 'Gate'], ['cpp', 'Passo tra i gate'], ['mmp', 'Passo delle piste']];
    const bars = {};
    const bl = h('div', { class: 'm3-bars' }, ROWS.map(([k, t]) => {
      const fill = h('span', { class: 'm3-fill is-' + k });
      const val = h('span', { class: 'm3-val' });
      bars[k] = { fill, val };
      return h('div', { class: 'm3-row' }, h('span', { class: 'm3-k' }, t), h('span', { class: 'm3-track' }, fill), val);
    }));
    const verdict = h('p', { class: 'm3-verdict' });
    const noteEl = h('p', { class: 'm3-note' });
    const legend = h('ul', { class: 'm3-legend', 'aria-label': 'Legenda' }, SERIES.map((se) => h('li', { class: 'is-' + se.id }, h('i', { 'aria-hidden': 'true' }), se.label)),
      h('li', { class: 'is-proj' }, h('i', { 'aria-hidden': 'true' }), 'Gate secondo la roadmap IRDS'));
    const panel = h('div', { class: 'pl-lab-panel m3-panel' }, h('h4', null, 'Il nodo'), h('p', { class: 'm3-head' }, nameEl, yearEl), bl, verdict, noteEl);
    const readout = h('p');

    function select(i, quiet) {
      st.sel = i;
      const nd = NODES[i];
      if (nd.year > st.t1) setEra('new', true);
      nameEl.textContent = '«' + nd.name + '»';
      yearEl.textContent = (nd.about ? 'circa ' : '') + nd.year;
      const max = Math.max(...ROWS.map(([k]) => nd[k] || 0));
      for (const [k] of ROWS) {
        const v = nd[k];
        bars[k].fill.style.width = v ? Math.max(1.5, v / max * 100) + '%' : '0';
        bars[k].val.textContent = v ? (k === 'gate' && nd.irds ? 'circa ' : '') + nm(v) : '—';
        bars[k].val.classList.toggle('is-na', !v);
      }
      const ref = nd.gate || nd.cpp;
      const r = ref / nd.v;
      verdict.textContent = r > 1.25 ? 'Il nome è più piccolo di tutte le misure reali: è diventato un\'etichetta commerciale.'
        : r < 0.85 ? 'Il gate è più corto di quanto dica il nome.'
          : 'Il nome coincide, più o meno, con la lunghezza del gate.';
      verdict.className = 'm3-verdict ' + (r > 1.25 ? 'is-label' : r < 0.85 ? 'is-short' : 'is-true');
      noteEl.textContent = nd.note;
      if (!quiet) slider.set(i, true);
      place();
      // segni sul righello
      const gx = f1(RX(nd.gate || nd.cpp));
      mGate.style.transform = `translate(${gx}px, ${ry - 6}px)`;
      mGate.querySelector('text').textContent = nd.gate ? 'gate' : 'passo tra i gate';
      mName.style.transform = `translate(${f1(RX(nd.v))}px, ${ry + 2}px)`;
      art.setAttribute('aria-label', 'Grafico dei nodi di processo dal 1971 al ' + Math.min(2025, Math.floor(st.t1)) + ': il nome del nodo, la lunghezza del gate e il passo tra i gate, in scala logaritmica. Scelto: ' + nd.name + ', ' + nd.year + '. ' + verdict.textContent);
    }

    let tw = null;
    function setEra(era, quiet) {
      if (era === st.era) return;
      st.era = era;
      if (quiet) eraSeg.set(era, true);
      if (tw) tw.cancel();
      const from = st.t1;
      const to = era === 'old' ? 1994 : 2027;
      tw = PL.tween({ from, to, duration: 1100, ease: PL.motion.ease.inOut, onUpdate: (v) => { st.t1 = v; place(); } });
      readout.replaceChildren(PL.rich(era === 'old'
        ? 'Fino alla metà degli anni Novanta il nome del nodo e la lunghezza del gate sono lo stesso numero: le due linee corrono insieme. <strong>Ora guarda che cosa succede dopo.</strong>'
        : 'Dalla fine degli anni Novanta il gate si accorcia più in fretta del nome; dal 2012 succede il contrario: il gate rallenta, intorno ai 15 – 25 nm, mentre il nome continua a scendere fino ai «2 nm». Oggi il nome è più piccolo di qualunque misura reale del chip.'));
      if (!quiet) {
        const want = era === 'old' ? 2 : 13;
        select(want);
      }
    }
    const eraSeg = ui.segmented({
      label: 'Periodo', value: 'old',
      options: [{ value: 'old', label: 'Fino al 1993' }, { value: 'new', label: 'Fino a oggi' }],
      onChange: (v) => setEra(v),
    });
    const slider = ui.slider({ label: 'Nodo', min: 0, max: NODES.length - 1, step: 1, value: 2, format: (i) => NODES[i].name, onInput: (i) => select(i, true) });

    PL.listen(mq, 'change', () => { G = mq.matches ? LAYOUT.narrow : LAYOUT.wide; build(); buildRuler(); select(st.sel, true); });
    build();
    st.era = 'new';
    setEra('old', true);
    select(2, true);
    st.t1 = 1994;
    place();

    return ui.lab({
      title: 'Nodi: il nome e la realtà',
      intro: 'Il nome di ogni generazione di chip, in giallo, contro due misure vere dei suoi transistor. Scegli un nodo con il cursore o toccando il grafico, poi allarga il periodo fino a oggi.',
      controls: [eraSeg.el, slider.el],
      stage: [
        h('div', { class: 'pl-lab-grid m3-layout' }, h('div', { class: 'm3-wrap' }, art, legend), panel),
        h('div', { class: 'm3-rwrap' }, h('p', { class: 'm3-rt' }, 'Il righello delle cose piccole'), ruler),
      ],
      readout,
      caption: 'Lunghezze del gate e passi tra i gate dei processi Intel fino al 14 nm e TSMC per 7, 5 e 3 nm; per il gate dei nodi da 5, 3 e 2 nm, i valori della roadmap internazionale IRDS (punti vuoti). Per i nodi più vecchi gli anni sono approssimati. Il righello è logaritmico: ogni tacca vale dieci volte la precedente.',
      class: 'm3-lab',
    });
  }

  /* ---------- laboratorio: il muro del calore ---------- */

  function labHeat() {
    const K = Math.SQRT2; // ogni generazione: dimensioni ÷ √2 (×0,7), area ÷ 2
    const RULES = [
      { id: 'dennard', label: 'Dennard', title: 'Le regole di Dennard', v: true, f: true },
      { id: 'v', label: 'Tensione ferma', title: 'Tensione ferma', v: false, f: true },
      { id: 'f', label: 'Anche il clock fermo', title: 'Tensione e clock fermi', v: false, f: false },
      { id: 'dark', label: 'Silicio spento', title: 'Silicio spento', v: false, f: false, dark: true },
    ];
    const st = { rule: 'dennard', g: 0, heat: 0.5, shown: 0.5 };
    const DIE = { x: 24, y: 34, s: 252 };
    const art = PL.svg('0 0 400 320', { class: 'pl-svg m4-art', role: 'img' });
    const fid = PL.uid('m4f');
    const glow = s('rect', { class: 'm4-glow', x: DIE.x - 6, y: DIE.y - 6, width: DIE.s + 12, height: DIE.s + 12, rx: 10, filter: `url(#${fid})` });
    const tiles = s('g', { class: 'm4-tiles' });
    const frame = s('rect', { class: 'm4-die', x: DIE.x, y: DIE.y, width: DIE.s, height: DIE.s, rx: 4 });
    const warn = s('g', { class: 'm4-warn' }, s('rect', { x: DIE.x + 36, y: DIE.y + DIE.s / 2 - 17, width: DIE.s - 72, height: 34, rx: 17 }), s('text', { x: DIE.x + DIE.s / 2, y: DIE.y + DIE.s / 2 + 5, 'text-anchor': 'middle' }, 'Troppo caldo!'));
    // il termometro: scala logaritmica, da metà del limite (la partenza) a 32 volte il limite
    const TH = { x: 330, top: 40, bot: 262 };
    const TY = (hh) => TH.bot - (Math.log2(hh) + 1.5) / 6.5 * (TH.bot - TH.top);
    const thFill = s('rect', { class: 'm4-thfill', x: TH.x - 6, width: 12, rx: 6 });
    const thermo = s('g', { class: 'm4-thermo' },
      s('rect', { class: 'm4-tube', x: TH.x - 9, y: TH.top - 8, width: 18, height: TH.bot - TH.top + 16, rx: 9 }),
      thFill,
      s('circle', { class: 'm4-bulb', cx: TH.x, cy: TH.bot + 18, r: 14 }),
      s('line', { class: 'm4-limit', x1: TH.x - 16, y1: TY(1), x2: TH.x + 16, y2: TY(1) }),
      [[0.5, '×1'], [1, '×2'], [4, '×8'], [16, '×32']].map(([hh, t]) => s('text', { class: 'm4-tt' + (hh === 1 ? ' is-limit' : ''), x: TH.x + 20, y: TY(hh) + 4 }, t)),
      s('text', { class: 'm4-tt is-limit', x: TH.x + 20, y: TY(1) + 17 }, 'limite'));
    art.append(
      s('defs', null, s('filter', { id: fid, x: '-30%', y: '-30%', width: '160%', height: '160%' }, s('feGaussianBlur', { stdDeviation: 9 }))),
      s('text', { class: 'm4-cap', x: DIE.x, y: 20 }, 'Il chip in termocamera'),
      glow, frame, tiles, warn, thermo,
      s('text', { class: 'm4-cap', x: TH.x, y: 20, 'text-anchor': 'middle' }, 'Calore per mm²'));

    // colore da termocamera: blu → verde → giallo → rosso → bianco, secondo il calore rispetto al limite
    const STOPS = [[0.25, [29, 78, 137]], [0.5, [42, 127, 176]], [0.75, [60, 198, 160]], [1, [232, 194, 58]], [1.6, [240, 138, 36]], [2.6, [226, 70, 58]], [6, [255, 217, 194]], [14, [255, 255, 255]]];
    function heatColor(hh) {
      const x = Math.log2(Math.max(0.25, hh));
      for (let i = 1; i < STOPS.length; i++) {
        const [h1, c1] = STOPS[i];
        const [h0, c0] = STOPS[i - 1];
        if (hh <= h1 || i === STOPS.length - 1) {
          const t = clamp((x - Math.log2(h0)) / (Math.log2(h1) - Math.log2(h0)), 0, 1);
          return 'rgb(' + c0.map((c, j) => Math.round(lerp(c, c1[j], t))).join(' ') + ')';
        }
      }
      return 'rgb(255 255 255)';
    }

    function model(rule, g) {
      const r = RULES.find((x) => x.id === rule);
      const V = r.v ? Math.pow(1 / K, g) : 1;
      const F = r.f ? Math.pow(K, g) : 1;
      const Cc = Math.pow(1 / K, g);
      const perTr = Cc * V * V * F;
      const dens = perTr * Math.pow(2, g);
      // con il silicio spento si accende solo la parte che resta sotto il limite (il doppio della partenza)
      const on = r.dark ? Math.min(1, 2 / dens) : 1;
      return { V, F, perTr, dens: dens * on, raw: dens, on, heat: 0.5 * dens * on };
    }

    let cells = [];
    let order = [];
    function layout() {
      const cols = Math.pow(2, 2 + Math.ceil(st.g / 2));
      const rows = Math.pow(2, 2 + Math.floor(st.g / 2));
      const gap = st.g >= 5 ? 1 : 2;
      const w = DIE.s / cols;
      const hh = DIE.s / rows;
      tiles.replaceChildren();
      cells = [];
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const r = s('rect', { x: f1(DIE.x + i * w + gap / 2), y: f1(DIE.y + j * hh + gap / 2), width: f1(w - gap), height: f1(hh - gap), rx: st.g >= 4 ? 0.6 : 2 });
          tiles.append(r);
          cells.push({ el: r, seed: (i * 73 + j * 151) % 97 / 97, fill: '', off: false });
        }
      }
      const rand = rng(11 + st.g);
      order = cells.map((c, i) => [rand(), i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    }

    let tick = 0;
    const bulb = thermo.querySelector('.m4-bulb');
    const still = PL.reduced();
    function paint() {
      const m = model(st.rule, st.g);
      const n = cells.length;
      const onCount = Math.round(n * m.on);
      const lit = new Set(order.slice(0, onCount).map((k) => (k + Math.floor(tick) * 7) % n));
      // otto sfumature per fotogramma bastano a far «respirare» la termocamera
      const pal = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => heatColor(st.shown * (still ? 1 : 0.86 + 0.04 * k)));
      cells.forEach((c, i) => {
        const on = m.on >= 1 || lit.has(i);
        const k = still ? 0 : Math.round(3.5 + 3.5 * Math.sin(tick * 2.1 + c.seed * 12));
        const fill = on ? pal[k] : '#0c1315';
        if (fill !== c.fill) { c.el.style.fill = fill; c.fill = fill; }
        if (on === c.off) { c.el.classList.toggle('is-off', !on); c.off = !on; }
      });
      const col = heatColor(st.shown);
      glow.style.fill = col;
      glow.style.opacity = clamp((Math.log2(st.shown) + 1.3) / 3.5, 0.12, 0.95);
      const y = TY(clamp(st.shown, 0.36, 32));
      thFill.setAttribute('y', f1(y));
      thFill.setAttribute('height', f1(TH.bot + 8 - y));
      thFill.style.fill = col;
      bulb.style.fill = col;
      warn.style.opacity = st.shown > 1.08 ? 1 : 0;
      art.classList.toggle('is-hot', st.shown > 1.08);
    }

    const rowsEl = {};
    const dl = h('dl', { class: 'm4-dl' }, [['tr', 'Transistor nello stesso spazio'], ['f', 'Frequenza del clock'], ['v', 'Tensione'], ['p', 'Potenza di un transistor'], ['d', 'Calore per mm²'], ['on', 'Parte del chip accesa']].map(([k, t]) => {
      rowsEl[k] = h('dd');
      return [h('dt', { 'data-k': k }, t), rowsEl[k]];
    }));
    const formula = h('p', { class: 'm4-formula' });
    const genEl = h('span', { class: 'm4-gen' });
    const panel = h('div', { class: 'pl-lab-panel m4-panel' }, h('h4', null, 'Generazione ', genEl), dl, h('p', { class: 'm4-kick' }, 'Per ogni generazione'), formula);
    const readout = h('p');
    const x = (v) => '×' + sig(v);

    function texts() {
      const r = RULES.find((q) => q.id === st.rule);
      const m = model(st.rule, st.g);
      genEl.textContent = st.g === 0 ? '0, la partenza' : String(st.g);
      rowsEl.tr.textContent = x(Math.pow(2, st.g));
      rowsEl.f.textContent = x(m.F);
      rowsEl.v.textContent = x(m.V);
      rowsEl.p.textContent = x(m.perTr);
      rowsEl.d.textContent = x(m.dens) + (m.heat > 1.08 ? ', oltre il limite' : '');
      rowsEl.on.textContent = PL.fmt(Math.round(m.on * 100)) + '%';
      dl.classList.toggle('is-dark', !!r.dark);
      rowsEl.d.classList.toggle('is-hot', m.heat > 1.08);
      const vF = r.v ? '0,5' : '1';
      const fF = r.f ? '1,4' : '1';
      const per = r.v ? '0,5' : r.f ? '1' : '0,7';
      const area = r.v ? '1' : r.f ? '2' : '1,4';
      formula.replaceChildren(PL.rich('P ≈ α · C · V² · f<br>C ×0,7 · V² ×' + vF + ' · f ×' + fF + '<br>= <strong>×' + per + '</strong> per transistor<br>× 2 transistor = <strong>×' + area + '</strong> per mm²'));
      let msg;
      if (r.id === 'dennard') msg = 'Ogni generazione rimpicciolisce i transistor di 0,7 volte e abbassa la tensione nella stessa misura: nello stesso spazio ce ne stanno il doppio, il clock sale del 40% e il calore per millimetro quadrato <strong>resta lo stesso</strong>. È andata così per circa trent\'anni.';
      else if (r.id === 'v') msg = 'Verso la metà degli anni Duemila la tensione si è fermata intorno a 1 volt. Se il clock avesse continuato a salire, il calore per millimetro quadrato sarebbe <strong>raddoppiato a ogni generazione</strong>' + (st.g >= 2 ? ': qui è già ' + x(m.dens) + ' rispetto alla partenza.' : '.');
      else if (r.id === 'f') msg = 'Così anche il clock si è fermato, intorno ai 3 – 4 GHz. Il calore cresce più piano, del 40% a ogni generazione, ma <strong>cresce lo stesso</strong>. I transistor in più sono diventati altri core.';
      else msg = 'Per restare sotto il limite, una parte del chip deve restare spenta, a turno: è il <strong>silicio spento</strong>. ' + (m.on < 1 ? 'Alla generazione ' + st.g + ' se ne può accendere solo il ' + PL.fmt(Math.round(m.on * 100)) + '% alla volta.' : 'Per ora c\'è margine: il chip può restare acceso tutto.');
      readout.replaceChildren(PL.rich(msg));
      art.setAttribute('aria-label', 'Un chip visto con una termocamera, alla generazione ' + st.g + ' con la regola «' + r.title + '»: calore per millimetro quadrato ' + x(m.dens) + ' rispetto alla partenza' + (m.heat > 1.08 ? ', oltre il limite del raffreddamento' : '') + '.');
    }

    let tw = null;
    function update(relayout) {
      if (relayout) layout();
      const target = model(st.rule, st.g).heat;
      texts();
      if (tw) tw.cancel();
      const from = st.shown;
      tw = PL.tween({ from: Math.log2(from), to: Math.log2(target), duration: 700, ease: PL.motion.ease.inOut, onUpdate: (v) => { st.shown = Math.pow(2, v); paint(); } });
    }
    const ruleSeg = ui.segmented({ label: 'Regola', value: 'dennard', options: RULES.map((r) => ({ value: r.id, label: r.label })), onChange: (v) => { st.rule = v; update(false); } });
    const genSl = ui.slider({ label: 'Generazione', min: 0, max: 6, step: 1, value: 0, onInput: (v) => { st.g = v; update(true); } });
    const shrinkBtn = ui.btn({ label: 'Rimpicciolisci', icon: '×0,7', kind: 'lab', onClick: () => { st.g = st.g >= 6 ? 0 : st.g + 1; genSl.set(st.g, true); update(true); } });

    layout();
    texts();
    paint();
    if (!PL.reduced()) {
      let acc = 0;
      const lp = PL.loop((dt) => { tick += dt; acc += dt; if (acc >= 0.05) { acc = 0; paint(); } }, { el: art });
      PL.onCleanup(() => lp.stop());
    }

    return ui.lab({
      title: 'Il muro del calore',
      intro: 'Rimpicciolisci i transistor una generazione alla volta e guarda quanto scalda il chip. Poi cambia regola: è la storia di quello che è successo dopo il 2005.',
      controls: [ruleSeg.el, genSl.el, shrinkBtn],
      stage: h('div', { class: 'pl-lab-grid m4-layout' }, h('div', { class: 'm4-wrap' }, art), panel),
      readout,
      caption: 'Modello semplificato ma coerente: a ogni generazione le dimensioni si riducono di 0,7 volte (l\'area si dimezza) e la capacità da caricare scende nella stessa misura; la potenza di commutazione segue P ≈ α · C · V² · f. Si parte a metà del calore che il raffreddamento riesce a smaltire. Le correnti di dispersione e le differenze tra un circuito e l\'altro sono trascurate.',
      class: 'm4-lab',
    });
  }

  /* ---------- laboratorio: chiplet contro chip gigante ---------- */

  function labChiplet() {
    const R = 150; // wafer da 300 mm
    const EDGE = 3; // millimetri di bordo che non si usano
    const LANE = 0.1; // corsia per il taglio, mm
    const OVER = 1.1; // area in più per i collegamenti tra un chiplet e l'altro
    const S = 144 / R; // unità del disegno per millimetro
    const st = { area: 600, split: 4, dens: 0.1, seed: 5, p: 1 };

    function layout(a) {
      const side = Math.sqrt(a);
      const pitch = side + LANE;
      const n = Math.ceil(R / pitch) + 1;
      let best = null;
      for (const [ox, oy] of [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]]) {
        const list = [];
        let full = 0;
        for (let i = -n; i <= n; i++) {
          for (let j = -n; j <= n; j++) {
            const cx = (i + ox) * pitch;
            const cy = (j + oy) * pitch;
            const fx = Math.abs(cx) + side / 2;
            const fy = Math.abs(cy) + side / 2;
            const nx = Math.max(0, Math.abs(cx) - side / 2);
            const ny = Math.max(0, Math.abs(cy) - side / 2);
            if (nx * nx + ny * ny >= R * R) continue;
            const inside = fx * fx + fy * fy <= (R - EDGE) * (R - EDGE);
            list.push({ cx, cy, full: inside });
            if (inside) full += 1;
          }
        }
        if (!best || full > best.full) best = { full, list, side };
      }
      return best;
    }
    function gauss(r) {
      let u = 0;
      let v = 0;
      while (u === 0) u = r();
      while (v === 0) v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    function scatter() {
      const r = rng(st.seed);
      const lam = st.dens * Math.PI * R * R / 100;
      const N = Math.max(0, Math.round(lam + Math.sqrt(lam) * gauss(r)));
      const out = [];
      for (let k = 0; k < N; k++) {
        const rr = R * Math.sqrt(r());
        const th = r() * Math.PI * 2;
        out.push({ x: rr * Math.cos(th), y: rr * Math.sin(th) });
      }
      return out;
    }
    // per ogni difetto, il die su cui cade (o -1)
    function hits(L, defects) {
      const half = L.side / 2;
      return defects.map((f) => L.list.findIndex((d) => d.full && Math.abs(f.x - d.cx) <= half && Math.abs(f.y - d.cy) <= half));
    }

    function wafer(cls) {
      const gid = PL.uid('m5g');
      const cid = PL.uid('m5c');
      const svgEl = PL.svg('0 0 300 300', { class: 'pl-svg m5-wafer ' + cls, role: 'img' },
        s('defs', null, s('radialGradient', { id: gid, cx: '38%', cy: '34%', r: '75%' },
          s('stop', { offset: '0%', 'stop-color': '#9fb0bd' }), s('stop', { offset: '55%', 'stop-color': '#5d6d7a' }), s('stop', { offset: '100%', 'stop-color': '#2d3740' })),
          s('clipPath', { id: cid }, s('circle', { cx: 150, cy: 150, r: 144 }))),
        s('circle', { class: 'm5-disc', cx: 150, cy: 150, r: 144, fill: `url(#${gid})` }));
      const dies = s('g', { class: 'm5-dies', 'clip-path': `url(#${cid})` });
      const dots = s('g', { class: 'm5-dots' });
      svgEl.append(dies, dots, s('circle', { class: 'm5-rim', cx: 150, cy: 150, r: 144 }), s('path', { class: 'm5-notch', d: 'M146 294a4 4 0 0 1 8 0' }));
      return { svg: svgEl, dies, dots, L: null, hit: [], rects: [] };
    }
    const W1 = wafer('is-big');
    const W2 = wafer('is-small');

    function drawWafer(W, a) {
      W.L = layout(a);
      W.dies.replaceChildren();
      const sd = W.L.side * S;
      const gap = sd > 12 ? 0.8 : 0.4;
      W.rects = W.L.list.map((d) => {
        const r = s('rect', { class: 'm5-die' + (d.full ? '' : ' is-edge'), x: f1(150 + d.cx * S - sd / 2 + gap), y: f1(150 + d.cy * S - sd / 2 + gap), width: f1(Math.max(0.5, sd - gap * 2)), height: f1(Math.max(0.5, sd - gap * 2)), rx: sd > 12 ? 1.2 : 0.5 });
        W.dies.append(r);
        return r;
      });
    }
    let defects = [];
    function drawDots() {
      for (const W of [W1, W2]) {
        W.dots.replaceChildren(...defects.map((f) => s('circle', { cx: f1(150 + f.x * S), cy: f1(150 + f.y * S), r: 1.9 })));
        W.hit = hits(W.L, defects);
      }
    }
    // mostra i primi p·N difetti e colora i die colpiti; restituisce i conti
    function show() {
      const shown = Math.floor(defects.length * st.p);
      const res = [];
      for (const W of [W1, W2]) {
        const bad = new Set();
        [...W.dots.children].forEach((c, k) => c.classList.toggle('is-on', k < shown));
        for (let k = 0; k < shown; k++) if (W.hit[k] >= 0) bad.add(W.hit[k]);
        W.rects.forEach((r, i) => r.classList.toggle('is-bad', bad.has(i)));
        res.push({ full: W.L.full, good: W.L.full - bad.size });
      }
      return res;
    }

    const big = { title: h('p', { class: 'm5-h' }), sub: h('p', { class: 'm5-sub' }) };
    const small = { title: h('p', { class: 'm5-h' }), sub: h('p', { class: 'm5-sub' }) };
    const barRow = (label) => {
      const fill = h('span', { class: 'm5-fill' });
      const num = h('strong', { class: 'm5-num' });
      return { el: h('div', { class: 'm5-row' }, h('span', { class: 'm5-k' }, label), h('span', { class: 'm5-track' }, fill), num), fill, num };
    };
    const b1 = barRow('Chip unico');
    const b2 = barRow('Chiplet');
    const gain = h('p', { class: 'm5-gain' });
    const readout = h('p');

    function counts(res) {
      const aS = st.area / st.split * OVER;
      const p1 = res[0].good;
      const p2 = Math.floor(res[1].good / st.split);
      big.title.textContent = 'Un chip unico da ' + PL.fmt(st.area) + ' mm²';
      small.title.textContent = st.split + ' chiplet da ' + PL.fmt(Math.round(aS)) + ' mm²';
      big.sub.textContent = PL.fmt(res[0].good) + ' buoni su ' + PL.fmt(res[0].full);
      small.sub.textContent = PL.fmt(res[1].good) + ' buoni su ' + PL.fmt(res[1].full);
      const max = Math.max(1, p1, p2);
      b1.fill.style.width = (p1 / max * 100) + '%';
      b2.fill.style.width = (p2 / max * 100) + '%';
      b1.num.textContent = PL.fmt(p1);
      b2.num.textContent = PL.fmt(p2);
      gain.textContent = p1 > 0 && p2 > p1 ? 'Con i chiplet, ' + PL.fmt(Math.round((p2 / p1 - 1) * 100)) + '% di processori in più dallo stesso wafer.' : p2 <= p1 ? 'Qui i chiplet non convengono.' : '';
      return { p1, p2, aS };
    }
    function explain(c) {
      const y1 = Math.exp(-st.area / 100 * st.dens);
      const y2 = Math.exp(-c.aS / 100 * st.dens);
      readout.replaceChildren(PL.rich('Con ' + PL.fmt(st.dens, 2) + ' difetti per cm² il modello prevede che funzioni il ' + PL.fmt(Math.round(y1 * 100)) + '% dei chip da ' + PL.fmt(st.area) + ' mm² e l\'' + PL.fmt(Math.round(y2 * 100)) + '% dei chiplet: un difetto butta via solo il pezzetto che colpisce. Da questo wafer escono <strong>' + PL.fmt(c.p1) + '</strong> processori interi con il chip unico e <strong>' + PL.fmt(c.p2) + '</strong> con i chiplet, ' + st.split + ' per processore. In cambio servono collegamenti tra i pezzi e un contenitore più complicato.'));
    }

    let tw = null;
    function update(animate) {
      drawWafer(W1, st.area);
      drawWafer(W2, st.area / st.split * OVER);
      defects = scatter();
      drawDots();
      W1.svg.setAttribute('aria-label', 'Wafer con chip unici da ' + PL.fmt(st.area) + ' mm²: i difetti, gialli, rendono rossi i chip che colpiscono.');
      W2.svg.setAttribute('aria-label', 'Lo stesso wafer, con gli stessi difetti, diviso in chiplet: un difetto rende rosso solo il chiplet su cui cade.');
      if (tw) tw.cancel();
      if (animate && !PL.reduced()) {
        tw = PL.tween({ from: 0, to: 1, duration: 1400, ease: PL.motion.ease.linear, onUpdate: (p) => { st.p = p; counts(show()); }, onDone: () => explain(counts(show())) });
      } else {
        st.p = 1;
        explain(counts(show()));
      }
    }

    const splitSeg = ui.segmented({ label: 'Chiplet per processore', value: 4, options: [2, 4, 8].map((n) => ({ value: n, label: n + ' chiplet' })), onChange: (v) => { st.split = +v; update(false); } });
    const areaSl = ui.slider({ label: 'Area del processore', min: 200, max: 800, step: 50, value: st.area, format: (v) => PL.fmt(v) + ' mm²', onInput: (v) => { st.area = v; update(false); } });
    const densSl = ui.slider({ label: 'Difetti', min: 0.02, max: 0.5, step: 0.02, value: st.dens, format: (v) => PL.fmt(v, 2) + ' per cm²', onInput: (v) => { st.dens = v; update(false); } });
    const rollBtn = ui.btn({ label: 'Un altro wafer', icon: '↻', kind: 'lab', onClick: () => { st.seed += 1; update(true); } });
    update(false);
    PL.onVisible(W1.svg, () => update(true), { threshold: 0.4 });

    return ui.lab({
      title: 'Chiplet contro chip gigante',
      intro: 'Lo stesso wafer, con gli stessi difetti, usato in due modi: a sinistra per un processore fatto di un unico grande chip, a destra per lo stesso processore diviso in chiplet. Quanti processori funzionanti si ottengono?',
      controls: [splitSeg.el, areaSl.el, densSl.el, rollBtn],
      stage: [
        h('div', { class: 'm5-pair' },
          h('div', { class: 'm5-col' }, big.title, W1.svg, big.sub),
          h('div', { class: 'm5-col' }, small.title, W2.svg, small.sub)),
        h('div', { class: 'm5-result' }, h('p', { class: 'm5-rt' }, 'Processori funzionanti per wafer'), b1.el, b2.el, gain),
      ],
      readout,
      caption: 'Modello semplificato, come quello del capitolo 7: i difetti cadono a caso e uno qualunque rende inutilizzabile il chip su cui cade; la resa prevista è e<sup>−A·D</sup>. Ogni chiplet ha il 10% di area in più per i collegamenti, e i chiplet si collaudano prima di montarli, così si scartano solo quelli difettosi. Un chip unico non può superare il limite di circa 858 mm² della litografia.',
      class: 'm5-lab',
    });
  }

  /* ---------- figura: il viaggio della sezione ---------- */

  function figJourney() {
    const stops = PL.chapters.map((c) => {
      const body = [h('span', { class: 'm6-num' }, String(c.num).padStart(2, '0')),
        h('span', { class: 'm6-body' }, h('strong', null, c.title), h('small', null, c.era))];
      return h('li', { class: 'm6-stop' + (c.id === 'moore' ? ' is-here' : '') },
        c.id === 'moore' ? h('span', { class: 'm6-link', 'aria-current': 'page' }, body) : h('a', { class: 'm6-link', href: '#' + c.id }, body));
    });
    stops.push(h('li', { class: 'm6-stop is-next' }, h('a', { class: 'm6-link', href: '../chip-programmabili/index.html#idea' },
      h('span', { class: 'm6-num', 'aria-hidden': 'true' }, '→'),
      h('span', { class: 'm6-body' }, h('strong', null, 'Sezione 5 · Primi chip programmabili'), h('small', null, 'il viaggio continua')))));
    const list = h('ol', { class: 'm6-list', 'aria-label': 'I capitoli della sezione' }, stops);
    if (PL.reduced()) list.classList.add('is-in');
    else PL.onVisible(list, () => list.classList.add('is-in'), { threshold: 0.2 });
    return ui.figure({
      art: list,
      class: 'm6-fig',
      caption: 'I nove capitoli di questa sezione, dall\'algebra di Boole alla legge di Moore: tocca una tappa per tornarci.',
    });
  }

  /* ---------- il capitolo ---------- */

  PL.chapter({
    id: 'moore',
    num: 9,
    title: 'La legge di Moore e il futuro',
    short: 'Moore',
    era: '1965 – oggi',
    minutes: 30,
    labs: 5,
    kicker: 'Nel 1965 Gordon Moore previde che i componenti di un chip sarebbero raddoppiati ogni anno. Sessant\'anni dopo i transistor sono centinaia di miliardi: come è stato possibile, che cosa vogliono dire davvero i «nanometri», perché i processori si sono fermati a pochi gigahertz e come si continua a crescere.',
    summary: 'La previsione del 1965 e la correzione del 1975, il potere dei raddoppi, mezzo secolo di transistor su un grafico, i nomi dei nodi e le misure reali, lo scaling di Dennard e il muro del calore, il multicore, chiplet e impilamento 3D, il dibattito sulla fine della legge di Moore.',
    timeline: [
      { year: 1965, title: 'La previsione di Moore', text: 'Il 19 aprile, sulla rivista Electronics, Gordon Moore prevede che i componenti di un chip raddoppieranno ogni anno, fino a 65.000 nel 1975.', key: true },
      { year: 1974, title: 'Le regole di Dennard', text: 'Robert Dennard e cinque colleghi dell\'IBM spiegano come rimpicciolire i transistor MOS senza aumentare il calore per millimetro quadrato.' },
      { year: 1975, title: 'Ogni due anni', text: 'Al convegno IEDM Moore corregge la previsione: verso il 1980 il raddoppio rallenterà a uno ogni due anni circa.' },
      { year: 2001, title: 'Due core in un chip', text: 'L\'IBM presenta il POWER4, il primo processore commerciale con due core sullo stesso chip, per i server.' },
      { year: 2004, title: 'Il muro dei gigahertz', text: 'A maggio Intel cancella Tejas, il successore del Pentium 4; a novembre il Pentium 4 570J tocca 3,8 GHz, la frequenza più alta mai raggiunta da un Pentium 4.', key: true },
      { year: 2005, title: 'Il multicore arriva sui PC', text: 'Intel e AMD mettono in vendita i primi processori a due core per i computer di casa e d\'ufficio.' },
      { year: 2006, title: 'Oltre il miliardo', text: 'L\'Itanium 2 «Montecito» è il primo microprocessore con più di un miliardo di transistor: 1,72 miliardi, quasi tutti di memoria cache.' },
      { year: 2019, title: 'I chiplet', text: 'Con i processori Zen 2 la AMD divide i core in piccoli chip a 7 nm, affiancati da un chip di ingressi e uscite fatto con un processo più vecchio.' },
      { year: 2022, title: 'Pezzi che si parlano', text: 'A marzo nasce UCIe, uno standard per collegare chiplet di aziende diverse; ad aprile arriva il Ryzen 7 5800X3D, con la cache incollata sopra i core.' },
      { year: 2023, title: 'Addio a Gordon Moore', text: 'Gordon Moore muore il 24 marzo, a 94 anni, nella sua casa alle Hawaii.' },
      { year: 2024, title: 'Due chip, una GPU', text: 'NVIDIA presenta la B200: 208 miliardi di transistor su due chip affiancati che lavorano come uno solo.' },
    ],
    glossary: [
      { term: 'Legge di Moore', def: 'L\'osservazione, fatta da Gordon Moore nel 1965 e corretta nel 1975, che il numero di componenti in un chip raddoppia a intervalli regolari: oggi si dice circa ogni due anni. Non è una legge della fisica, ma una tendenza economica e industriale.' },
      { term: 'Nodo di processo', def: 'Il nome di una generazione di tecnologia per fabbricare chip, come «7 nm» o «3 nm». Fino agli anni Novanta indicava più o meno la lunghezza del gate dei transistor; oggi è un\'etichetta commerciale che non corrisponde a nessuna misura reale.' },
      { term: 'Nanometro', def: 'Un miliardesimo di metro, cioè un milionesimo di millimetro (simbolo nm). Un capello è spesso 50.000 – 100.000 nm, un virus misura circa 100 nm, la doppia elica del DNA circa 2 nm.' },
      { term: 'Scaling di Dennard', def: 'La regola descritta nel 1974 da Robert Dennard e dai suoi colleghi dell\'IBM: riducendo dello stesso fattore le dimensioni dei transistor e la tensione, i circuiti diventano più veloci e la potenza per unità di superficie resta costante. Ha smesso di valere verso la metà degli anni Duemila.' },
      { term: 'Frequenza di clock', def: 'Quante volte al secondo batte il clock di un processore, in hertz: a 3 GHz sono tre miliardi di cicli al secondo. È salita da meno di un megahertz dei primi microprocessori a quasi 4 GHz nel 2004, poi è cresciuta pochissimo.' },
      { term: 'Multicore', def: 'Un processore con più core nello stesso chip, o nello stesso contenitore, che lavorano in parallelo. È diventato la regola dalla metà degli anni Duemila, quando alzare ancora la frequenza scaldava troppo.' },
      { term: 'Chiplet', def: 'Un chip piccolo progettato per lavorare insieme ad altri nello stesso contenitore, collegato a loro da migliaia di connessioni velocissime: invece di un unico grande die, il processore diventa un mosaico di pezzi, anche fabbricati con processi diversi.' },
      { term: 'Impilamento 3D', def: 'La tecnica che sovrappone più die e li collega con contatti verticali, come i TSV che attraversano il silicio o l\'unione diretta rame contro rame: accorcia i collegamenti e mette più circuiti nello stesso spazio. Ne sono esempi le memorie HBM e la cache 3D della AMD.' },
      { term: 'Numero di transistor', def: 'Quanti transistor contiene un chip: è la misura usata per seguire la legge di Moore. Si va dai 2.300 dell\'Intel 4004, del 1971, alle centinaia di miliardi dei chip più grandi di oggi; i numeri sono quelli dichiarati dai costruttori, e sono approssimati.' },
      { term: 'Corrente di dispersione', def: 'La piccola corrente che attraversa un transistor anche quando è spento. Cresce in modo esponenziale se si abbassa la tensione di soglia e, moltiplicata per miliardi di transistor, scalda il chip anche quando non lavora: è uno dei motivi della fine dello scaling di Dennard.' },
    ],
    render(root) {
      root.append(
        ui.section({ id: 'previsione', title: 'Una previsione lunga sessant\'anni', kicker: 'Electronics, 19 aprile 1965 · Gordon Moore', lead: 'Nel 1965 un chimico di trentasei anni scrisse un articolo di quattro pagine per una rivista di elettronica. Conteneva un grafico con pochi punti e una retta: è diventata la previsione più famosa della storia della tecnologia.' },
          ui.prose(
            'Nel 1965 i circuiti integrati avevano pochi anni di vita, e i più complessi contenevano qualche decina di componenti. La rivista americana Electronics chiese a Gordon Moore, che dirigeva i laboratori di ricerca e sviluppo della Fairchild Semiconductor, di immaginare che cosa sarebbe successo nei dieci anni seguenti. L\'articolo uscì il 19 aprile 1965 con un titolo che era già un programma: «Cramming more components onto integrated circuits», cioè «Stipare più componenti nei circuiti integrati».',
            'Moore aveva notato una regolarità. Per ogni generazione di chip c\'è un numero di componenti, cioè di transistor, resistori, diodi e condensatori, per cui il costo di ciascuno è il più basso: con troppo pochi il chip è sprecato, con troppi in fabbrica se ne rovinano troppi. Quel numero raddoppiava più o meno ogni anno. Moore prolungò la tendenza per altri dieci anni e arrivò a una cifra che allora sembrava fantascienza: 65.000 componenti in un solo chip nel 1975.'),
          ui.quote({
            text: 'La complessità che corrisponde al costo minimo per componente è cresciuta di circa un fattore due all\'anno. […] Questo significa che nel 1975 il numero di componenti per circuito integrato al costo minimo sarà di 65.000.',
            original: 'The complexity for minimum component costs has increased at a rate of roughly a factor of two per year. […] That means by 1975, the number of components per integrated circuit for minimum cost will be 65,000.',
            author: 'Gordon E. Moore', source: 'Cramming more components onto integrated circuits, Electronics', year: 1965,
          }),
          fig1965(),
          ui.prose(
            'Era prima di tutto una previsione economica: il sottotitolo dell\'articolo spiegava che, con il costo di ogni componente in calo man mano che i componenti aumentavano, nel 1975 la convenienza avrebbe spinto a stipare fino a 65.000 componenti in un solo chip. Dieci anni dopo, nel 1975, a un convegno dell\'IEEE, l\'IEDM, Moore tornò sulla previsione e la corresse: il raddoppio annuale sarebbe durato ancora qualche anno, poi verso il 1980 sarebbe rallentato a uno ogni due anni circa. La crescita, spiegò, veniva da tre ingredienti: chip più grandi, dettagli più piccoli e «ingegnosità» nel progettare circuiti e dispositivi; e quest\'ultima stava esaurendo i suoi margini.',
            'Il nome [[Legge di Moore|legge di Moore]] si diffuse negli anni Settanta soprattutto grazie a Carver Mead, professore al Caltech, che abbiamo incontrato nel <a href="#struttura/celle">capitolo 8</a>: lo stesso Moore gliene attribuiva l\'invenzione.'),
          ui.cols(
            ui.person({
              name: 'Gordon Moore', years: '1929 – 2023', role: 'chimico, cofondatore di Intel',
              body: [
                'Nato a San Francisco il 3 gennaio 1929 e cresciuto nel vicino paese di Pescadero, prese il dottorato in chimica al Caltech nel 1954. Nel 1957 fu tra gli otto fondatori della Fairchild Semiconductor e nel 1968 fondò la Intel con Robert Noyce.',
                'Nel 2000, con la moglie Betty, creò una fondazione per la ricerca scientifica e la tutela dell\'ambiente, che nel 2023 aveva donato oltre 5,1 miliardi di dollari. È morto il 24 marzo 2023, a 94 anni, nella sua casa alle Hawaii.',
              ],
            }),
            ui.callout({
              kind: 'fun',
              title: 'I 18 mesi che Moore non disse mai',
              body: 'Si legge spesso che la legge di Moore prevede un raddoppio «ogni 18 mesi». Moore non lo disse mai: parlò di un anno nel 1965 e di due anni nel 1975. I 18 mesi vengono da una stima di David House, dirigente della Intel, sul raddoppio delle prestazioni dei chip, che crescono sia perché i transistor aumentano sia perché diventano più veloci.',
            })),
          ui.keyIdea('La legge di Moore non è una legge della fisica, come la gravità: è l\'osservazione di una tendenza economica e industriale. Per decenni l\'industria l\'ha trattata come un obiettivo da rispettare, pianificando ricerche e fabbriche per stare al passo: una previsione che si è avverata anche perché tutti lavoravano per farla avverare.')),

        ui.section({ id: 'raddoppi', title: 'Il potere dei raddoppi', kicker: 'Crescita lineare e crescita esponenziale', lead: 'Raddoppiare sembra poca cosa: 1, 2, 4, 8, 16… Ma dopo pochi passi i numeri diventano enormi, e la nostra intuizione resta indietro.' },
          ui.prose(
            'Una vecchia leggenda racconta che l\'inventore degli scacchi chiese come ricompensa un chicco di riso sulla prima casella della scacchiera, due sulla seconda, quattro sulla terza e così via, raddoppiando fino alla sessantaquattresima. Il re accettò sorridendo, ma il conto era impossibile da pagare: in tutto fanno 2⁶⁴ − 1 = 18.446.744.073.709.551.615 chicchi, circa 18,4 miliardi di miliardi. L\'ultima casella da sola ne contiene uno in più di tutte le altre messe insieme.',
            'Se invece si aggiungesse un chicco a ogni casella, sulla sessantaquattresima ce ne sarebbero solo 64. È la differenza tra una crescita lineare, che aggiunge sempre la stessa quantità, e una crescita esponenziale, che moltiplica: la nostra intuizione è fatta per la prima e si lascia sorprendere dalla seconda. La legge di Moore è una crescita esponenziale: dal 1971 a oggi i transistor in un chip sono passati da 2.300 a centinaia di miliardi.'),
          labDoubling(),
          ui.cols(
            ui.callout({
              kind: 'key',
              title: 'Ogni raddoppio vale quanto tutto il passato',
              body: 'Nel laboratorio si vede bene: a ogni passo la metà nuova è grande quanto tutto quello che c\'era prima. Per la legge di Moore vuol dire che, ogni due anni, in un chip si aggiungono tanti transistor quanti ne avevano accumulati tutte le generazioni precedenti messe insieme.',
            }),
            ui.callout({
              kind: 'fun',
              title: 'Il record delle piegature',
              body: 'Nella realtà nessuno arriva alla Luna: il record è di 12 piegature, ottenuto nel gennaio 2002 dalla studentessa californiana Britney Gallivan con una striscia di carta igienica lunga circa 1,2 km. A ogni piegatura lo spessore raddoppia, ma la carta che serve per girare intorno alla piega cresce ancora più in fretta.',
            }))),

        ui.section({ id: 'grafico', title: 'Mezzo secolo in un grafico', kicker: 'Dal 4004 ai giganti di oggi · 1971 – 2025', lead: 'Per vedere se la previsione ha retto basta mettere su un grafico i transistor dei chip più famosi, anno per anno. Ma serve il grafico giusto.' },
          ui.prose('Il [[Numero di transistor|numero di transistor]] di un chip è la misura più usata per seguire la legge di Moore. Nel laboratorio ci sono ventisei chip famosi: si parte dall\'Intel 4004 del 1971, il primo microprocessore, e si arriva alle grandi GPU per l\'intelligenza artificiale e ai system on a chip dei computer e dei telefoni di oggi. Con una scala normale, lineare, quasi tutta la storia resta schiacciata sullo zero. Per vederla serve la scala logaritmica, in cui ogni riga vale dieci volte quella sotto.'),
          labChart(),
          ui.stats([
            { value: 2300, label: 'transistor nell\'Intel 4004', note: 'nel 1971' },
            { value: 208, unit: 'miliardi', label: 'transistor nella GPU NVIDIA B200', note: 'nel 2024, su due chip' },
            { value: 26, label: 'raddoppi in 53 anni', note: 'circa uno ogni due anni' },
          ]),
          ui.prose('Dal 4004 al B200 i transistor sono cresciuti di circa 90 milioni di volte: sono circa 26 raddoppi in 53 anni, cioè un raddoppio ogni due anni, proprio il ritmo indicato da Moore nel 1975. Non tutti i chip stanno sulla retta, perché non tutti cercano di avere più transistor possibile: il MOS 6502 del 1975 ne aveva meno dei suoi rivali, e proprio per questo costava poco e finì in milioni di computer di casa. Ma la regolarità della tendenza, per mezzo secolo, è impressionante.'),
          ui.cols(
            ui.callout({
              kind: 'fun',
              title: 'Contare i transistor non è banale',
              body: 'Secondo la Intel l\'8086 ha 29.000 transistor. Ken Shirriff, che studia i vecchi chip al microscopio, ne ha contati 19.618 sulle foto del die, più circa 9.659 posti predisposti ma lasciati vuoti: in tutto 29.277. Anche per questo i numeri del grafico sono approssimati.',
            }),
            ui.callout({
              kind: 'note',
              title: 'Un miliardo di memoria',
              body: 'Nell\'Itanium 2 «Montecito» del 2006, il primo microprocessore oltre il miliardo di transistor, solo circa 64 milioni servivano ai calcoli: tutti gli altri formavano la memoria [[Cache|cache]] da 26,5 MB. Anche oggi una buona parte dei transistor di un processore è memoria.',
            })),
          ui.callout({
            kind: 'link',
            body: 'Qui i processori sono solo punti su un grafico. La loro storia, a partire dal 4004, è raccontata nella <a href="../chip-programmabili/index.html#idea">sezione sui primi chip programmabili</a>.',
          })),

        ui.section({ id: 'nanometri', title: 'Quanto è piccolo un nanometro', kicker: 'Nodi di processo · nomi e misure reali', lead: '«7 nanometri», «3 nanometri», «2 nanometri»: ogni nuova generazione di chip viene presentata con un numero più piccolo. Ma che cosa misura davvero quel numero? Oggi, niente.' },
          ui.prose(
            'Un [[Nanometro|nanometro]] è un milionesimo di millimetro. Per farsene un\'idea: un capello è spesso 50.000 – 100.000 nanometri, un globulo rosso è largo circa 7.500 nanometri, un virus come quello dell\'influenza ne misura circa 100 e la doppia elica del DNA circa 2. Nel cristallo di silicio due atomi vicini distano 0,235 nanometri.',
            'Ogni generazione di tecnologia di fabbricazione, cioè ogni [[Nodo di processo|nodo di processo]], ha un nome: «10 µm» quello del 4004, poi «3 µm», «1 µm», «250 nm», fino ai «3 nm» e ai «2 nm» di oggi. Per decenni il nome indicava una misura vera: la lunghezza del [[Gate|gate]] dei transistor. Dalla metà degli anni Novanta il gate cominciò ad accorciarsi più in fretta del nome, e i due numeri si separarono: i transistor del nodo da 130 nm, nel 2001, avevano gate di circa 70 nm.',
            'Poi è successo il contrario. Dagli anni Dieci il gate si è accorciato molto più lentamente, perché un gate troppo corto controlla male il canale (lo abbiamo visto con i [[FinFET]] nel <a href="#struttura/pinne">capitolo 8</a>): in dieci anni è passato da circa 25 a circa 15 nanometri. I nomi, invece, hanno continuato a scendere al ritmo di sempre. Così oggi nessuna misura di un chip «da 3 nm» vale 3 nm: il gate è lungo circa 16 nm, due gate vicini distano circa 45 – 48 nm e le piste di metallo più fitte sono a circa 23 nm l\'una dall\'altra. Il nome è diventato un\'etichetta commerciale: dice solo che si tratta di una generazione più avanzata della precedente.'),
          labNodes(),
          ui.cols(
            ui.callout({
              kind: 'fun',
              title: 'Gate in un capello',
              body: 'Nello spessore di un capello stanno affiancati da circa 1.000 a 2.000 gate di un chip «da 3 nm», distanti circa 48 nm l\'uno dall\'altro. E un virus di 100 nm è largo appena due passi tra i gate.',
            }),
            ui.callout({
              kind: 'note',
              title: 'Poche decine di atomi',
              body: 'Un gate lungo 12 – 15 nm corrisponde a una fila di circa 50 – 65 atomi di silicio. Secondo la roadmap internazionale dei semiconduttori, intorno ai 12 nm si arriverà al limite pratico: sotto una certa misura un transistor non si può più accorciare.',
            })),
          ui.callout({
            kind: 'note',
            title: 'Nomi più onesti',
            body: 'Per mettere ordine, nel 2020 la roadmap internazionale dei semiconduttori, l\'IRDS, ha proposto etichette come «G48M24»: G è il passo tra i gate e M il passo minimo delle piste, in nanometri. Lo stesso anno H.-S. Philip Wong, dell\'Università di Stanford, e i suoi colleghi hanno proposto di contare la densità: quanti transistor logici, quante celle di memoria e quanti collegamenti tra le due stanno in un millimetro quadrato. Nel 2020 la tecnologia più avanzata metteva circa 38 milioni di transistor logici in un millimetro quadrato.',
          })),

        ui.section({ id: 'calore', title: 'Il muro del calore', kicker: 'Lo scaling di Dennard e la fine della corsa ai gigahertz', lead: 'Per trent\'anni rimpicciolire i transistor ha avuto un effetto quasi magico: i chip diventavano più veloci senza scaldare di più. Poi, verso la metà degli anni Duemila, la magia si è interrotta.' },
          ui.prose(
            'Nell\'ottobre 1974 Robert Dennard e cinque colleghi dell\'IBM pubblicarono un articolo su come progettare transistor MOS molto piccoli. Ne nasce la regola che oggi si chiama [[Scaling di Dennard|scaling di Dennard]]: se si riducono dello stesso fattore le dimensioni del transistor e la tensione di alimentazione, i circuiti diventano più veloci e ogni transistor consuma molto meno, tanto che la potenza per millimetro quadrato resta la stessa anche con il doppio dei transistor.',
            'Il segreto sta in una formula semplice. La potenza che un chip spende per far scattare i suoi transistor, il [[Consumo dinamico|consumo dinamico]] del <a href="#famiglie/cmos">capitolo 5</a>, vale circa P ≈ α · C · V² · f: dipende dalla capacità da caricare (C), dal quadrato della tensione (V) e dalla [[Frequenza di clock|frequenza del clock]] (f), oltre che dalla frazione di circuiti che lavora (α). Con transistor più piccoli C diminuisce, e abbassando anche V il consumo crolla: era proprio quel quadrato a fare il miracolo.'),
          ui.person({
            name: 'Robert H. Dennard', years: '1932 – 2024', role: 'ingegnere dei laboratori di ricerca IBM',
            body: [
              'Nato a Terrell, in Texas, il 5 settembre 1932, nel 1966 ebbe l\'idea della cella di memoria dinamica, la DRAM, fatta di un solo transistor e un condensatore: brevettata nel 1968, è ancora oggi la base della memoria principale dei computer.',
              'Nel 1974 descrisse con i colleghi le regole per rimpicciolire i transistor MOS. Tra i tanti premi ricevette la IEEE Medal of Honor nel 2009 e il Premio Kyoto nel 2013. È morto il 23 aprile 2024, a 91 anni.',
            ],
          }),
          ui.prose(
            'Verso la metà degli anni Duemila il meccanismo si è inceppato. Per abbassare la tensione bisogna abbassare anche la [[Tensione di soglia|tensione di soglia]] dei transistor, ma un transistor «spento» lascia sempre passare una piccola [[Corrente di dispersione|corrente di dispersione]], che cresce in modo esponenziale quando la soglia scende: a temperatura ambiente bastano 60 – 100 millivolt in meno per moltiplicarla per dieci. La tensione di alimentazione si è fermata intorno a 1 volt, e da allora ogni nuovo nodo ha messo più transistor nello stesso spazio senza ridurre abbastanza il loro consumo.',
            'Il primo a farne le spese fu il clock. Dagli anni Settanta la frequenza dei processori era salita da meno di un megahertz a qualche gigahertz. Nel maggio 2004 la Intel cancellò Tejas, il successore previsto del Pentium 4: secondo gli analisti dell\'epoca pesarono soprattutto consumi e calore. A novembre il Pentium 4 570J toccò 3,8 GHz, la frequenza più alta mai raggiunta da un Pentium 4, perché il modello da 4 GHz non uscì mai. Da allora la frequenza è cresciuta pochissimo: i processori di oggi lavorano a qualche gigahertz e arrivano intorno ai 6 GHz solo per brevi picchi.'),
          labHeat(),
          ui.prose('Se il clock non poteva più salire, che cosa fare con i transistor in più che ogni nodo continuava a regalare? La risposta fu metterne più copie: due, quattro, poi decine di [[Core|core]] nello stesso chip, ognuno capace di eseguire il suo programma. Il primo processore [[Multicore|multicore]] commerciale fu il POWER4 dell\'IBM, per i server, nel 2001. Sui PC i due core arrivarono nel 2005: la Intel fu la prima, il 18 aprile, con il Pentium Extreme Edition 840, seguita a fine maggio dai Pentium D e dall\'Athlon 64 X2 della AMD.'),
          ui.cols(
            ui.callout({
              kind: 'key',
              title: 'Un core veloce o due più lenti?',
              body: 'Abbassando la frequenza del 20% spesso si può abbassare anche la tensione, diciamo del 20%: un core consuma allora circa la metà (0,8 × 0,8² ≈ 0,51). Due core così consumano più o meno quanto uno veloce, ma insieme fanno il 60% di lavoro in più, a patto che il programma sappia dividersi in due. Per questo dal 2005 i processori hanno sempre più core, e chi scrive programmi ha dovuto imparare a sfruttarli.',
            }),
            ui.callout({
              kind: 'note',
              title: 'Silicio spento',
              body: 'Anche con tanti core non si possono accendere tutti i transistor insieme senza superare il calore che il raffreddamento riesce a smaltire. L\'espressione «dark silicon», silicio spento, fu usata nel 2009 da Mike Muller, direttore tecnico di ARM, e diventò celebre con uno studio del 2011, secondo cui nei nodi più avanzati più della metà di un chip avrebbe dovuto restare spenta in ogni istante. È uno dei motivi per cui i chip di oggi sono pieni di circuiti specializzati, che si accendono solo quando servono.',
            })),
          ui.crossLink({ href: '../storia-pc/index.html#prestazioni', kicker: 'Sezione 6 · Architettura e storia dei PC', title: 'La corsa alle prestazioni: MHz, transistor e core', text: 'Dal 286 ai processori con decine di core: pipeline e cache, il muro della potenza e la legge di Amdahl.' })),

        ui.section({ id: 'oltre', title: 'Oltre il singolo chip', kicker: 'Chiplet, impilamento 3D e circuiti specializzati', lead: 'Se rimpicciolire costa sempre di più, si può crescere in altri modi: dividendo il chip in pezzi, impilandoli uno sull\'altro, o costruendo circuiti fatti apposta per un solo compito.' },
          ui.prose(
            'Un chip grande è un bersaglio grande per i difetti: ne basta uno, in qualunque punto, per buttarlo via. Lo abbiamo visto con la [[Resa produttiva|resa]] nel <a href="#fabbrica/wafer">capitolo 7</a>. Da qui l\'idea dei [[Chiplet|chiplet]]: invece di un unico die gigantesco, tanti chip più piccoli, collaudati uno per uno e poi montati insieme nello stesso contenitore, collegati da migliaia di fili cortissimi.',
            'Nel 2017 la AMD lanciò i processori per server EPYC «Naples», con quattro chip da 8 core nello stesso contenitore, per un totale di 32 core. Con Zen 2, nel 2019, fece un passo in più: i core, prodotti a 7 nm, vennero separati dal chip che gestisce la memoria e i collegamenti, il die di ingressi e uscite, fabbricato con un processo più vecchio ed economico, a 12 – 14 nm. Un EPYC «Rome» arriva così a 64 core, con otto chiplet di calcolo e un die di ingressi e uscite: nove chip in un solo contenitore.'),
          labChiplet(),
          ui.prose(
            'Perché chiplet di aziende diverse possano parlarsi serve una lingua comune: nel marzo 2022 dieci grandi aziende, fra cui Intel, AMD, Arm, TSMC e Samsung, hanno lanciato UCIe, uno standard aperto per collegare chiplet nello stesso contenitore. E anche i chip più grandi di oggi sono spesso due die affiancati: la GPU B200 della NVIDIA e gli Apple M1 Ultra e M3 Ultra lavorano come un chip solo. Del resto un singolo die non può superare il limite di circa 858 mm² che uno scanner litografico stampa in un colpo solo (<a href="#struttura/zoom">capitolo 8</a>).',
            'Poi c\'è la terza dimensione. Con l\'[[Impilamento 3D|impilamento 3D]] i chip si sovrappongono e si collegano con contatti verticali. La memoria HBM, standardizzata nel 2013, è una pila di chip di DRAM attraversati da collegamenti che passano dentro il silicio, i TSV: ha debuttato nel 2015 sulla scheda grafica AMD Radeon R9 Fury X. Nel 2020 la Intel ha usato la sua tecnologia Foveros nei processori Lakefield, con un chip di calcolo appoggiato su un chip di base. E nell\'aprile 2022 la AMD ha messo in vendita il Ryzen 7 5800X3D, con un chip di cache da 64 MB incollato direttamente sopra quello dei core, rame contro rame: i contatti distano appena 9 micrometri.',
            'L\'ultima strada è la specializzazione. Invece di far fare tutto ai core, i chip di oggi dedicano molti dei loro transistor a circuiti costruiti per un solo tipo di lavoro: le GPU per la grafica e per i calcoli ripetuti su moltissimi dati, le NPU per le reti neurali, i motori video, come nella pianta del <a href="#struttura/floorplan">capitolo 8</a>. Fanno meno cose, ma le fanno con molta meno energia. Intanto il transistor continua a cambiare forma, dal FinFET ai nanosheet, e l\'alimentazione comincia a passare dal retro del chip: anche questo è nel capitolo 8.'),
          ui.cols(
            ui.callout({
              kind: 'link',
              title: 'Luce al posto dei fili',
              body: 'Per portare i dati tra un chip e l\'altro si studiano, e si cominciano a usare, collegamenti fatti di luce, con laser e guide costruiti nel silicio. Come la luce trasporta i dati lo racconta la <a href="../elettronica-avanzata/index.html#fotonica">sezione sull\'elettronica avanzata</a>.',
            }),
            ui.callout({
              kind: 'link',
              title: 'Un altro modo di calcolare',
              body: 'I computer quantistici non sono chip più piccoli: usano i qubit e le leggi della meccanica quantistica, e promettono di risolvere molto più in fretta solo certi problemi. Li trovi nella <a href="../elettronica-avanzata/index.html#quantistica">frontiera quantistica</a>.',
            }))),

        ui.section({ id: 'futuro', title: 'La legge di Moore è finita?', kicker: 'Il dibattito, i costi e il viaggio fin qui', lead: 'Da anni qualcuno annuncia la fine della legge di Moore, e da anni qualcun altro la smentisce. In un certo senso hanno ragione tutti e due: dipende da che cosa si misura.' },
          ui.prose(
            'Nel settembre 2022 Jensen Huang, cofondatore e capo della NVIDIA, rispondendo ai giornalisti sui prezzi delle nuove schede video, dichiarò che la legge di Moore era «morta»: secondo lui non si poteva più avere, ogni anno e mezzo circa, il doppio delle prestazioni allo stesso costo. Il 27 settembre l\'allora capo della Intel, Pat Gelsinger, replicò che era «viva e vegeta», e prevedeva mille miliardi di transistor in un solo contenitore entro la fine del decennio; alla fine del 2023, però, anche lui ammise che il raddoppio stava rallentando, verso uno ogni tre anni circa. La TSMC sostiene che la legge non è morta finché la densità continua ad aumentare, anche grazie a chiplet e impilamento: nel 2024 i suoi dirigenti Mark Liu e H.-S. Philip Wong hanno previsto una GPU da mille miliardi di transistor entro una decina d\'anni.',
            'Di sicuro è finita l\'epoca in cui ogni nuovo nodo rendeva i transistor più piccoli, più veloci, meno affamati di energia e più economici, tutto insieme. I transistor continuano ad aumentare, ma più lentamente e a caro prezzo. Secondo le stime della società di analisi IBS, una fabbrica a 2 nm da 50.000 wafer al mese costa circa 28 miliardi di dollari, e progettare un chip complesso a 2 nm può costare circa 725 milioni, anche se altri analisti ritengono queste cifre gonfiate. Per il suo polo in Arizona la TSMC ha annunciato nel marzo 2025 investimenti per 165 miliardi di dollari, saliti a circa 265 miliardi nel luglio 2026: impegni per molti anni, non somme già spese.'),
          ui.quote({
            text: 'Nessun esponenziale dura per sempre: ma il «per sempre» si può rimandare!',
            original: 'No exponential is forever: but "Forever" can be delayed!',
            author: 'Gordon E. Moore', source: 'titolo del suo intervento all\'International Solid-State Circuits Conference', year: 2003,
          }),
          ui.prose(
            'Moore lo sapeva bene: ogni crescita esponenziale prima o poi si scontra con dei limiti. La sua previsione, però, ha retto per sessant\'anni, molto più dei dieci che lui stesso si era dato nel 1965. Nello stesso articolo aveva immaginato le «meraviglie» che i circuiti integrati avrebbero portato: i computer di casa, o almeno terminali collegati a un computer centrale, i controlli automatici per le automobili e gli apparecchi personali portatili per comunicare. Oggi li chiamiamo PC, centraline e smartphone.',
            'È anche la fine del nostro viaggio. Siamo partiti da un\'algebra di 1 e 0, inventata da George Boole nel 1847 per descrivere il ragionamento, e siamo arrivati a chip con decine di miliardi di interruttori.'),
          figJourney(),
          ui.keyIdea('Dall\'algebra di Boole ai chip di oggi l\'idea è rimasta la stessa: tutto si costruisce con interruttori che valgono 1 o 0, combinati in porte logiche. Sono cambiati gli interruttori, dai relè alle valvole, dai transistor ai FinFET, e il loro numero, da qualche decina a centinaia di miliardi. Che cosa succede quando un chip diventa programmabile, capace di cambiare mestiere cambiando programma, lo racconta la sezione successiva.'),
          ui.crossLink({ href: '../chip-programmabili/index.html#idea', kicker: 'Sezione 5 →', title: 'Primi chip programmabili', text: 'Dalle memorie che si scrivono una volta sola al primo microprocessore: lo stesso chip che cambia mestiere cambiando programma.' })));
    },
  });
})();
