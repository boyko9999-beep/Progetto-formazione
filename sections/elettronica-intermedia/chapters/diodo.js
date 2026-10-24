/*
 * Capitolo 2: la giunzione P-N e il diodo.
 * Laboratorio "La giunzione sotto tensione": il cristallo visto al microscopio (lacune, elettroni,
 * ioni fissi, zona di svuotamento, campo elettrico e barriera di potenziale) è l'ingrandimento del
 * diodo di un circuito con generatore, resistenza e amperometro. Sotto, la caratteristica I–V con
 * la retta di carico e il punto di lavoro, in scala lineare o logaritmica.
 */
(function () {
  'use strict';

  const { s, sym, wire, si, num, clamp, lerp } = EI;

  /* ---------- modello fisico (puro, testato in tests/diodo.test.js) ---------- */

  const Q = 1.602176634e-19;     // carica elementare (C)
  const KB = 1.380649e-23;       // costante di Boltzmann (J/K)
  const EPS0 = 8.8541878128e-14; // costante dielettrica del vuoto (F/cm)
  const T0 = 298.15;             // 25 °C: temperatura a cui valgono i parametri dei diodi
  const DOPING = 1e16;           // atomi droganti per cm³, uguali nel lato P e nel lato N

  // Due diodi da laboratorio, valori tipici a 25 °C: Is e n dell'equazione di Shockley; per il
  // cristallo la banda proibita Eg (eV), le cariche libere del materiale puro ni a 300 K (cm⁻³)
  // e la costante dielettrica relativa.
  const MATERIALS = {
    si: { id: 'si', name: 'silicio', Is: 1e-9, n: 1.7, Eg: 1.12, ni300: 1.0e10, er: 11.7 },
    ge: { id: 'ge', name: 'germanio', Is: 1e-6, n: 1.3, Eg: 0.66, ni300: 2.0e13, er: 16.0 },
  };

  const model = {
    MATERIALS: MATERIALS,
    Q: Q, KB: KB, EPS0: EPS0, T0: T0, NA: DOPING, ND: DOPING,
    kelvin: (c) => c + 273.15,
    // Tensione termica VT = kT/q: 25,7 mV a 25 °C.
    vt: (T) => KB * T / Q,
    // Cariche libere del cristallo puro: ni ∝ T^1,5 · e^(−Eg/2kT), riferite al valore a 300 K.
    ni: (mat, T) => mat.ni300 * Math.pow(T / 300, 1.5) * Math.exp((mat.Eg * Q / (2 * KB)) * (1 / 300 - 1 / T)),
    // Barriera di potenziale della giunzione brusca: Vbi = VT · ln(NA·ND / ni²).
    vbi: (mat, T, na, nd) => {
      const ni = model.ni(mat, T);
      return model.vt(T) * Math.log((na || DOPING) * (nd || DOPING) / (ni * ni));
    },
    // Larghezza della zona di svuotamento in cm: W = √(2ε(Vbi − V)/q · (NA + ND)/(NA·ND)).
    width: (mat, T, V, na, nd) => {
      const a = na || DOPING;
      const d = nd || DOPING;
      return Math.sqrt(2 * mat.er * EPS0 * Math.max(0, model.vbi(mat, T, a, d) - V) / Q * (a + d) / (a * d));
    },
    // La formula vale finché V resta sotto Vbi: in diretta la barriera non scende sotto il 5%.
    widthClamped: (mat, T, V) => model.width(mat, T, Math.min(V, 0.95 * model.vbi(mat, T))),
    // Corrente di saturazione alla temperatura T (stessa legge dei simulatori SPICE, XTI = 3).
    isat: (mat, T) => mat.Is * Math.pow(T / T0, 3 / mat.n) * Math.exp((mat.Eg / (mat.n * model.vt(T))) * (T / T0 - 1)),
    // Equazione di Shockley: I = Is · (e^(V/nVT) − 1).
    shockley: (V, Is, n, T) => Is * Math.expm1(V / (n * model.vt(T))),
    // La tensione che serve per avere la corrente I (inversa dell'equazione di Shockley).
    voltageAt: (I, Is, n, T) => n * model.vt(T) * Math.log1p(I / Is),
    // Circuito in serie: Vs = V + I·R. La funzione I(V) + (V − Vs)/R cresce sempre, quindi la
    // bisezione tra 0 e Vs trova l'unica soluzione, in diretta come in inversa.
    solve: (Vs, R, Is, n, T) => {
      if (Vs === 0) return { V: 0, I: 0 };
      const nvt = n * model.vt(T);
      let lo = Math.min(0, Vs);
      let hi = Math.max(0, Vs);
      for (let k = 0; k < 200 && hi - lo > 1e-14; k++) {
        const mid = 0.5 * (lo + hi);
        if (Is * Math.expm1(mid / nvt) - (Vs - mid) / R > 0) hi = mid;
        else lo = mid;
      }
      const V = 0.5 * (lo + hi);
      // la corrente si calcola sul ramo meno sensibile al piccolo errore su V: sulla resistenza se
      // il diodo conduce bene (conduttanza g > 1/R), sull'equazione del diodo se è quasi spento
      const g = Is / nvt * Math.exp(V / nvt);
      return { V: V, I: g * R > 1 ? (Vs - V) / R : Is * Math.expm1(V / nvt) };
    },
    // Il punto di lavoro completo di un diodo nel circuito (Tc in °C, W in µm).
    state: (mat, Vs, R, Tc) => {
      const T = model.kelvin(Tc);
      const Is = model.isat(mat, T);
      const op = model.solve(Vs, R, Is, mat.n, T);
      const vbi = model.vbi(mat, T);
      return {
        T: T, Is: Is, n: mat.n, V: op.V, I: op.I, vbi: vbi,
        barrier: Math.max(vbi - op.V, 0.05 * vbi),
        W: model.widthClamped(mat, T, op.V) * 1e4,
        W0: model.width(mat, T, 0) * 1e4,
        soglia: model.voltageAt(1e-3, Is, mat.n, T), // la tensione a cui passa 1 mA
      };
    },
  };

  /* ---------- laboratorio ---------- */

  const CW = 400;           // larghezza del cristallo in unità del disegno: 2 µm
  const TOP = 20;           // fascia delle etichette sopra il cristallo
  const CH = 140;           // altezza della parte con le cariche
  const XJ = CW / 2;        // la giunzione
  const UM = CW / 2;        // unità del disegno per micrometro
  const COLS = 20;
  const ROWS = 6;
  const DENS = (COLS / 2) * ROWS / XJ; // una carica mobile per ogni ione delle zone neutre
  const SY = TOP + CH + 40; // la striscia della barriera
  const SB = SY + 54;       // livello del lato P nella striscia
  const HMAX = 44;          // altezza massima del gradino di potenziale
  const IREF = 0.02;        // 20 mA: corrente di riferimento per la velocità delle cariche
  const FORM_TIME = 3.6;    // secondi per formare la giunzione
  const VCOL = 5;           // tensione del colore pieno dei fili
  const GHOST = '#5f746d';
  const SYM = '#d3e5de';

  // Due composizioni: larga (computer e tablet) e alta (telefono).
  const GEOM = {
    wide: { W: 680, H: 360, xL: 34, xR: 646, yT: 26, yB: 334, dx: 308, lh: 32, cx: 140, cy: 52, cs: 1 },
    tall: { W: 360, H: 364, xL: 10, xR: 350, yT: 22, yB: 338, dx: 148, lh: 28, cx: 20, cy: 50, cs: 0.8 },
  };

  let uid = 0;

  // Numeri pseudo-casuali ripetibili, per la disposizione ferma del movimento ridotto.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const fmtVs = (v) => (Math.abs(v) < 0.005 ? '0,00 V' : (v > 0 ? '+' : '−') + num(Math.abs(v), 2) + ' V');
  const fmtV3 = (v) => (Math.abs(v) < 0.0005 ? '0,000 V' : (v < 0 ? '−' : '') + num(Math.abs(v), 3) + ' V');
  const fmtI = (v) => (Math.abs(v) < 5e-14 ? '0 A' : si(v, 'A'));
  const hillH = (b) => HMAX * Math.log1p(b / 0.25) / Math.log1p(5.8 / 0.25);
  // Spazio indivisibile tra un numero e la sua unità: «1000 V» o «25 °C» non vanno mai a capo a metà.
  const UNIT_GAP = /(\d) (?=(?:°C|mV|mA|µA|nA|pA|µm|kΩ|Ω|V|A)(?![\wµ]))/g;
  const nb = (str) => String(str).replace(UNIT_GAP, '$1\u00a0');

  // Il punto di lavoro durante il passaggio silicio ↔ germanio: i parametri sfumano (m da 0 a 1).
  function blendState(m, Vs, R, Tc) {
    if (m <= 0.001) return model.state(MATERIALS.si, Vs, R, Tc);
    if (m >= 0.999) return model.state(MATERIALS.ge, Vs, R, Tc);
    const T = model.kelvin(Tc);
    const A = MATERIALS.si;
    const B = MATERIALS.ge;
    const Is = Math.exp(lerp(Math.log(model.isat(A, T)), Math.log(model.isat(B, T)), m));
    const n = lerp(A.n, B.n, m);
    const op = model.solve(Vs, R, Is, n, T);
    const vbi = lerp(model.vbi(A, T), model.vbi(B, T), m);
    return {
      T: T, Is: Is, n: n, V: op.V, I: op.I, vbi: vbi,
      barrier: Math.max(vbi - op.V, 0.05 * vbi),
      W: lerp(model.widthClamped(A, T, op.V), model.widthClamped(B, T, op.V), m) * 1e4,
      W0: lerp(model.width(A, T, 0), model.width(B, T, 0), m) * 1e4,
      soglia: model.voltageAt(1e-3, Is, n, T),
    };
  }

  function mount(lab) {
    const svg = lab.svg;
    let P = EI.palette();
    const reduced = lab.reduced;
    const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;
    svg.classList.add('diodo-svg');

    const st = {
      mat: 'si', Vs: 0, R: 220, Tc: 25, scale: 'lin',
      // valori mostrati: inseguono quelli scelti, così curve e numeri scorrono senza scatti
      dVs: 0, dLnR: Math.log(220), dTc: 25, dm: 0, ymax: 2.3 / 220,
      form: reduced ? 1 : 0, Wd: 0, tokens: 0, cool: 0, flip: 0,
    };
    let G = null;
    let parts = null;
    let holes = [];
    let elecs = [];
    let flashes = [];
    let legendKey = '';

    /* --- disegno --- */

    function nameValue(parent, x, y, name, anchor, dy) {
      const t = s('text', { x: x, y: y, class: 'ei-sym-label', 'text-anchor': anchor }, parent);
      s('tspan', { class: 'name', text: name }, t);
      const v = s('text', { x: x, y: y + dy, class: 'ei-sym-label', 'text-anchor': anchor }, parent);
      return s('tspan', { class: 'value', text: '' }, v);
    }

    function icon(g, kind, x, y) {
      if (kind === 'h') s('circle', { cx: x, cy: y, r: 4.3, class: 'ei-h' }, g);
      else if (kind === 'e') s('circle', { cx: x, cy: y, r: 3.5, class: 'ei-e' }, g);
      else {
        const gi = s('g', { transform: 'translate(' + x + ' ' + y + ')' }, g);
        s('circle', { r: 6, class: kind === 'p' ? 'ei-ion-p' : 'ei-ion-n' }, gi);
        s('path', { d: kind === 'p' ? 'M-3 0H3' : 'M-3 0H3M0 -3V3', class: 'diodo-sign' }, gi);
      }
    }

    function draw() {
      const tall = !!(mq && mq.matches);
      G = tall ? GEOM.tall : GEOM.wide;
      svg.innerHTML = '';
      svg.classList.toggle('diodo-tall', tall);
      lab.view(G.W, G.H);
      const p = { tall: tall, flipDrawn: null, glowK: -1, tint: '', fieldOp: -1 };
      // dimensione dei testi del cristallo in pixel dello schermo (sul telefono un po' più grandi)
      const fs = (px, k) => 'font-size:' + ((tall ? px * (k || 1.12) : px) / G.cs).toFixed(2) + 'px';
      const xL = G.xL;
      const xR = G.xR;
      const yT = G.yT;
      const yB = G.yB;
      const dA = G.dx;
      const dK = G.dx + 64;

      // lente: il cristallo qui sotto è il diodo del circuito visto al microscopio
      const lens = s('g', { class: 'diodo-lens' }, svg);
      s('rect', { x: dA - 12, y: yT - G.lh / 2, width: 88, height: G.lh, rx: 9 }, lens);
      s('path', {
        class: 'diodo-zoom',
        d: 'M' + (dA - 12) + ' ' + (yT + G.lh / 2) + 'L' + (G.cx - 8 * G.cs) + ' ' + G.cy +
          'M' + (dK + 12) + ' ' + (yT + G.lh / 2) + 'L' + (G.cx + (CW + 8) * G.cs) + ' ' + G.cy,
      }, lens);

      /* circuito: generatore, diodo, resistenza, amperometro */
      const gc = s('g', { class: 'diodo-circuit' }, svg);
      if (!tall) {
        p.wA = wire(gc, [[xL, 214], [xL, yT], [dA, yT]]);
        p.wK = [wire(gc, [[dK, yT], [xR, yT], [xR, 78]])];
        p.w0 = [wire(gc, [[xR, 142], [xR, 190]]), wire(gc, [[xR, 246], [xR, yB], [xL, yB], [xL, 274]])];
        p.supWrap = s('g', {}, gc);
        sym.source(p.supWrap, { x: xL, y: 214, rot: 90, len: 60, kind: 'dc' });
        p.supC = [xL, 244];
        p.supVal = nameValue(gc, xL + 28, 240, 'Vs', 'start', 16);
        sym.resistor(gc, { x: xR, y: 78, rot: 90, len: 64 });
        p.resVal = nameValue(gc, xR - 20, 104, 'R', 'end', 16);
        sym.meter(gc, { x: xR, y: 190, rot: 90, len: 56, kind: 'A' });
        p.ammVal = nameValue(gc, xR - 22, 214, 'I', 'end', 16);
        sym.ground(gc, { x: 108, y: yB });
        p.flows = [p.wA, p.wK[0], p.w0[0], p.w0[1]].map((w) => new EI.Flow(gc, w));
      } else {
        p.wA = wire(gc, [[40, yB], [xL, yB], [xL, yT], [dA, yT]]);
        p.wK = [wire(gc, [[dK, yT], [xR, yT], [xR, yB], [306, yB]]), wire(gc, [[250, yB], [206, yB]])];
        p.w0 = [wire(gc, [[142, yB], [100, yB]])];
        p.supWrap = s('g', {}, gc);
        sym.source(p.supWrap, { x: 40, y: yB, len: 60, kind: 'dc' });
        p.supC = [70, yB];
        p.supVal = nameValue(gc, 70, yB - 24, 'Vs', 'middle', -15);
        sym.resistor(gc, { x: 142, y: yB, len: 64 });
        p.resVal = nameValue(gc, 174, yB - 24, 'R', 'middle', -15);
        sym.meter(gc, { x: 250, y: yB, len: 56, kind: 'A' });
        p.ammVal = nameValue(gc, 278, yB - 24, 'I', 'middle', -15);
        sym.ground(gc, { x: 121, y: yB });
        p.flows = [p.wA, p.wK[0], p.wK[1], p.w0[0]].map((w) => new EI.Flow(gc, w));
      }
      // spente finché il primo fotogramma non dice quanta corrente passa
      p.flows.forEach((f) => f.set(0));
      p.diode = sym.diode(gc, { x: dA, y: yT, len: 64 });

      /* legenda */
      const lg = s('g', { class: 'diodo-legend' }, svg);
      const items = tall
        ? [['h', 'lacuna'], ['e', 'elettrone'], ['p', 'ione −'], ['n', 'ione +']]
        : [['h', 'lacuna +', 'mobile'], ['e', 'elettrone −', 'mobile'], ['p', 'ione −', 'fisso'], ['n', 'ione +', 'fisso']];
      items.forEach((it, k) => {
        const x = tall ? [26, 104, 196, 274][k] : 50;
        const y = tall ? 280 : 76 + 30 * k;
        icon(lg, it[0], x, y - 4);
        s('text', { x: x + 11, y: y, class: 'diodo-leg', text: it[1] }, lg);
        if (it[2]) s('text', { x: x + 11, y: y + 12, class: 'diodo-leg-sub', text: it[2] }, lg);
      });

      /* il cristallo (coordinate locali: 400 × 160, poi spostato e scalato) */
      const gx = s('g', { class: 'diodo-xs', transform: 'translate(' + G.cx + ' ' + G.cy + ') scale(' + G.cs + ')' }, svg);
      const clip = 'diodo-clip-' + (++uid);
      s('rect', { x: 0, y: TOP, width: CW, height: CH }, s('clipPath', { id: clip }, gx));
      s('rect', { x: 0, y: 0, width: XJ, height: TOP + CH, class: 'ei-zone-p' }, gx);
      s('rect', { x: XJ, y: 0, width: XJ, height: TOP + CH, class: 'ei-zone-n' }, gx);
      s('rect', { x: 0, y: 0, width: CW, height: TOP, class: 'diodo-band' }, gx);
      p.zone = s('rect', { x: XJ, y: TOP, width: 0, height: CH, class: 'ei-zone-dep' }, gx);
      p.glow = s('ellipse', { cx: XJ, cy: TOP + CH / 2, rx: 24, ry: CH * 0.42, class: 'diodo-glow', opacity: 0 }, gx);
      const gi = s('g', { class: 'diodo-ions' }, gx);
      p.ions = [];
      for (let i = 0; i < COLS; i++) {
        for (let j = 0; j < ROWS; j++) {
          const x = 10 + 20 * i;
          const y = TOP + 15 + 22 * j;
          const left = x < XJ;
          const g = s('g', { class: 'diodo-ion', transform: 'translate(' + x + ' ' + y + ')' }, gi);
          s('circle', { r: 6.2, class: left ? 'ei-ion-p' : 'ei-ion-n' }, g);
          s('path', { d: left ? 'M-3 0H3' : 'M-3 0H3M0 -3V3', class: 'diodo-sign' }, g);
          p.ions.push({ x: x, g: g, on: false });
        }
      }
      // campo elettrico degli ioni scoperti: da N (ioni +) verso P (ioni −)
      p.field = s('g', { class: 'diodo-field', opacity: 0 }, gx);
      p.arrows = [26, 70, 114].map((y) => ({ y: TOP + y, el: s('path', { d: '', class: 'diodo-arrow' }, p.field) }));
      p.eTag = s('text', { x: XJ, y: TOP + 74, class: 'diodo-etag', style: fs(12.5), text: 'E' }, p.field);
      // cariche mobili e lampi
      p.gh = s('g', { class: 'diodo-holes', 'clip-path': 'url(#' + clip + ')' }, gx);
      p.ge = s('g', { class: 'diodo-elecs', 'clip-path': 'url(#' + clip + ')' }, gx);
      p.gf = s('g', { class: 'diodo-flashes' }, gx);
      p.fpool = [];
      for (let k = 0; k < 18; k++) {
        const g = s('g', { class: 'diodo-flash', style: 'display:none' }, p.gf);
        p.fpool.push({ g: g, core: s('circle', { r: 2, class: 'diodo-flash-core' }, g), ring: s('circle', { r: 3, class: 'diodo-flash-ring' }, g), busy: false });
      }
      p.drift = s('path', { d: '', class: 'diodo-drift' }, gx);
      // contatti metallici ed etichette
      s('rect', { x: -8, y: 0, width: 8, height: TOP + CH, rx: 2, class: 'diodo-metal' }, gx);
      s('rect', { x: CW, y: 0, width: 8, height: TOP + CH, rx: 2, class: 'diodo-metal' }, gx);
      s('text', { x: 6, y: 14.5, class: 'ei-zone-label p', style: fs(12), text: 'P · anodo' }, gx);
      s('text', { x: CW - 6, y: 14.5, class: 'ei-zone-label n', 'text-anchor': 'end', style: fs(12), text: 'N · catodo' }, gx);
      s('text', { x: XJ, y: 14, class: 'diodo-zt', 'text-anchor': 'middle', style: fs(10, 1), text: 'zona di svuotamento' }, gx);
      // misura della zona
      p.dim = s('path', { d: '', class: 'diodo-dim' }, gx);
      p.wTag = s('text', { x: XJ, y: TOP + CH + 28, class: 'diodo-wtag', 'text-anchor': 'middle', style: fs(11.5) }, gx);
      // barriera di potenziale, allineata al cristallo
      s('text', { x: 0, y: SY + 4, class: 'diodo-strip-t', style: fs(9.5), text: 'BARRIERA DI POTENZIALE' }, gx);
      p.guides = s('path', { d: '', class: 'diodo-guide' }, gx);
      p.hillFill = s('path', { d: '', class: 'diodo-hill-fill' }, gx);
      p.hill = s('path', { d: '', class: 'diodo-hill' }, gx);
      p.ref = s('path', { d: '', class: 'diodo-ref' }, gx);
      p.bar = s('path', { d: '', class: 'diodo-bar' }, gx);
      p.barTag = s('text', { x: 0, y: 0, class: 'diodo-btag', 'text-anchor': 'end', style: fs(11.5) }, gx);
      p.sideP = s('text', { x: 4, y: SB - 5, class: 'diodo-side', style: fs(9.5), text: 'lato P' }, gx);
      p.sideN = s('text', { x: CW - 4, y: SB - 5, class: 'diodo-side', 'text-anchor': 'end', style: fs(9.5), text: 'lato N' }, gx);
      return p;
    }

    /* --- cariche mobili --- */

    function makeEl(c) {
      c.el = s('circle', { r: c.h ? 4.3 : 3.5, class: c.h ? 'ei-h' : 'ei-e' }, c.h ? parts.gh : parts.ge);
      c.ra = -1;
    }
    function newC(h, x, y, state) {
      const c = { h: h, x: x, y: y, vx: 0, vy: 0, st: state || 'live', a: 1 };
      (h ? holes : elecs).push(c);
      if (parts) makeEl(c);
      return c;
    }
    function render(c) {
      if (!c.el) makeEl(c);
      c.el.setAttribute('cx', c.x.toFixed(1));
      c.el.setAttribute('cy', c.y.toFixed(1));
      const a = Math.round(clamp(c.a, 0, 1) * 50) / 50;
      if (a !== c.ra) {
        c.el.setAttribute('opacity', a.toFixed(2));
        c.ra = a;
      }
    }
    function sweep() {
      const keep = (c) => {
        if (!c.dead) return true;
        if (c.el) c.el.remove();
        return false;
      };
      holes = holes.filter(keep);
      elecs = elecs.filter(keep);
    }
    function clearCarriers() {
      holes.concat(elecs).forEach((c) => { c.dead = true; });
      sweep();
    }
    // Riempie le due zone neutre in modo uniforme (all'inizio: tutto il cristallo).
    function seedCarriers(edgeP, edgeN) {
      clearCarriers();
      const nH = Math.round(DENS * Math.max(0, edgeP - 2));
      const nE = Math.round(DENS * Math.max(0, CW - edgeN - 2));
      for (let k = 0; k < nH; k++) newC(true, rnd(4, edgeP - 3), rnd(TOP + 5, TOP + CH - 5));
      for (let k = 0; k < nE; k++) newC(false, rnd(edgeN + 3, CW - 4), rnd(TOP + 5, TOP + CH - 5));
    }
    const liveCount = (list) => list.reduce((n, c) => n + (!c.dead && (c.st === 'live' || c.st === 'in' || c.st === 'gen') ? 1 : 0), 0);
    // La carica pronta più vicina alla giunzione (inner) o al contatto (outer).
    function pick(list, h, inner) {
      let best = null;
      for (const c of list) {
        if (c.dead || c.st !== 'live') continue;
        const key = (h === inner) ? c.x : -c.x;
        if (!best || key > best.key) best = { c: c, key: key };
      }
      return best ? best.c : null;
    }
    // Una lacuna e un elettrone si vengono incontro e si annullano con un lampo.
    function makePair(hc, ec) {
      const tx = XJ + (Math.random() - 0.5) * Math.min(14, st.Wd * 0.4);
      const ty = clamp((hc.y + ec.y) / 2 + (Math.random() - 0.5) * 12, TOP + 8, TOP + CH - 8);
      const dur = clamp(Math.max(Math.hypot(tx - hc.x, ty - hc.y), Math.hypot(tx - ec.x, ty - ec.y)) / 120, 0.2, 0.9);
      [hc, ec].forEach((c) => {
        c.st = 'pair';
        c.t = 0;
        c.dur = dur;
        c.sx = c.x;
        c.sy = c.y;
        c.tx = tx;
        c.ty = ty;
        c.flash = false;
      });
      hc.flash = true;
    }

    // Movimento ridotto: ogni carica sta accanto a un ione delle zone neutre, senza animazione.
    const SEED = rng(4148);
    const JIT = Array.from({ length: COLS * ROWS * 2 }, () => [SEED() * 6 - 3, SEED() * 6 - 3]);
    function reducedLayout(edgeP, edgeN) {
      const ph = [];
      const pe = [];
      for (let i = 0; i < COLS; i++) {
        for (let j = 0; j < ROWS; j++) {
          const x = 10 + 20 * i;
          const y = TOP + 15 + 22 * j + 11;
          const jt = JIT[i * ROWS + j];
          if (x < XJ && x + 10 < edgeP - 4) ph.push([x + 10 + jt[0], y + jt[1]]);
          if (x > XJ && x - 10 > edgeN + 4) pe.push([x - 10 + jt[0], y + jt[1]]);
        }
      }
      const fit = (list, pts, h) => {
        while (list.length > pts.length) { const c = list.pop(); if (c.el) c.el.remove(); }
        while (list.length < pts.length) newC(h, 0, 0);
        list.forEach((c, k) => { c.x = pts[k][0]; c.y = Math.min(TOP + CH - 4, pts[k][1]); c.st = 'live'; c.a = 1; });
      };
      fit(holes, ph, true);
      fit(elecs, pe, false);
    }

    // In pausa (o al primo disegno) le cariche vanno subito nella disposizione giusta.
    function settle(ctx) {
      holes.concat(elecs).forEach((c) => {
        if (c.st === 'pair' || c.st === 'out') c.dead = true;
        else { c.st = 'live'; c.a = 1; }
      });
      sweep();
      holes.forEach((c) => { if (c.x > ctx.edgeP - 3) c.x = rnd(4, Math.max(5, ctx.edgeP - 3)); });
      elecs.forEach((c) => { if (c.x < ctx.edgeN + 3) c.x = rnd(Math.min(CW - 5, ctx.edgeN + 3), CW - 4); });
      const fix = (list, h, n) => {
        while (list.length > n) {
          const c = pick(list, h, true);
          if (!c) break;
          c.dead = true;
          sweep();
          list = h ? holes : elecs;
        }
        for (let k = list.length; k < n; k++) {
          if (h) newC(true, rnd(4, Math.max(5, ctx.edgeP - 3)), rnd(TOP + 5, TOP + CH - 5));
          else newC(false, rnd(Math.min(CW - 5, ctx.edgeN + 3), CW - 4), rnd(TOP + 5, TOP + CH - 5));
        }
      };
      fix(holes, true, ctx.nH);
      fix(elecs, false, ctx.nE);
    }

    // Le cariche dello stesso segno si respingono un poco: niente grumi, il "gas" resta uniforme.
    function spread(list, R, dt) {
      const act = list.filter((c) => !c.dead && (c.st === 'live' || c.st === 'in'));
      const k = 900 * dt;
      for (let i = 0; i < act.length; i++) {
        const a = act[i];
        for (let j = i + 1; j < act.length; j++) {
          const b = act[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          if (dx > R || dx < -R || dy > R || dy < -R) continue;
          const dd = Math.hypot(dx, dy);
          if (dd >= R || dd < 1e-3) continue;
          const f = k * (1 - dd / R) / dd;
          a.vx -= dx * f;
          a.vy -= dy * f;
          b.vx += dx * f;
          b.vy += dy * f;
        }
      }
    }

    function stepCarriers(dt, ctx) {
      const th = Math.sqrt(ctx.T / T0);
      const acc = 380 * th;
      const vmax = 32 * th;
      const damp = Math.exp(-2.2 * dt);
      const y0 = TOP + 5;
      const y1 = TOP + CH - 5;
      spread(holes, 13, dt);
      spread(elecs, 11, dt);
      for (const list of [holes, elecs]) {
        for (const c of list) {
          if (c.dead) continue;
          const h = c.h;
          const dir = h ? 1 : -1; // verso della corrente diretta: lacune → N, elettroni → P
          if (c.st === 'pair') {
            c.t += dt;
            const k = Math.min(1, c.t / c.dur);
            const e = k * k * (3 - 2 * k);
            c.x = c.sx + (c.tx - c.sx) * e;
            c.y = c.sy + (c.ty - c.sy) * e;
            if (k >= 1) {
              c.dead = true;
              if (c.flash) addFlash(c.tx, c.ty, 'rec');
            }
            continue;
          }
          if (c.st === 'gen') {
            // coppia creata dal calore: il campo spinge la lacuna verso P e l'elettrone verso N
            c.x -= dir * 150 * dt;
            c.y += c.vy * dt;
            c.a = Math.min(1, c.a + dt / 0.25);
            if ((h && c.x < ctx.edgeP - 4) || (!h && c.x > ctx.edgeN + 4)) c.st = 'live';
            continue;
          }
          // agitazione termica: più veloce quando il cristallo è caldo
          c.vx = (c.vx + (Math.random() * 2 - 1) * acc * dt) * damp;
          c.vy = (c.vy + (Math.random() * 2 - 1) * acc * dt) * damp;
          const sp = Math.hypot(c.vx, c.vy);
          if (sp > vmax) { c.vx *= vmax / sp; c.vy *= vmax / sp; }
          let vx = c.vx + dir * ctx.vd;
          if (c.st === 'in') {
            vx += dir * 26;
            c.a += dt / 0.35;
            if (c.a >= 1) { c.a = 1; c.st = 'live'; }
          } else if (c.st === 'out') {
            vx = -dir * 60;
            c.a -= dt / 0.45;
            if (c.a <= 0) c.dead = true;
          }
          c.x += vx * dt;
          c.y += c.vy * dt;
          if (c.y < y0) { c.y = y0; c.vy = Math.abs(c.vy); } else if (c.y > y1) { c.y = y1; c.vy = -Math.abs(c.vy); }
          if (c.st === 'out') {
            if ((h && c.x < -6) || (!h && c.x > CW + 6)) c.dead = true;
            continue;
          }
          if (h && c.x < 4) { c.x = 4; c.vx = Math.abs(c.vx); }
          if (!h && c.x > CW - 4) { c.x = CW - 4; c.vx = -Math.abs(c.vx); }
          // la zona di svuotamento respinge le cariche maggioritarie
          if (h && c.x > ctx.edgeP - 3) { c.x = EI.approach(c.x, ctx.edgeP - 3, dt, 16); c.vx = -Math.abs(c.vx) * 0.7; }
          if (!h && c.x < ctx.edgeN + 3) { c.x = EI.approach(c.x, ctx.edgeN + 3, dt, 16); c.vx = Math.abs(c.vx) * 0.7; }
        }
      }
    }

    function updateCarriers(dt, ctx) {
      if (reduced) {
        reducedLayout(ctx.edgeP, ctx.edgeN);
      } else if (dt <= 0) {
        settle(ctx);
      } else {
        stepCarriers(dt, ctx);
        st.cool -= dt;
        // formazione: le cariche vicine al confine passano dall'altra parte e si annullano a coppie
        if (st.form < 1 && st.cool <= 0 && liveCount(holes) > ctx.nH && liveCount(elecs) > ctx.nE) {
          const hc = pick(holes, true, true);
          const ec = pick(elecs, false, true);
          if (hc && ec) { makePair(hc, ec); st.cool = 0.06; }
        }
        // conduzione diretta: le cariche attraversano la barriera abbassata a un ritmo che segue la corrente
        if (ctx.rate > 0) {
          st.tokens = Math.min(3, st.tokens + ctx.rate * dt);
          while (st.tokens >= 1) {
            const hc = pick(holes, true, true);
            const ec = pick(elecs, false, true);
            if (!hc || !ec || hc.x < ctx.edgeP - 70 || ec.x > ctx.edgeN + 70) break;
            makePair(hc, ec);
            st.tokens -= 1;
          }
        } else st.tokens = 0;
        // inversa: il calore crea ogni tanto una coppia nella zona, e il campo la separa
        if (ctx.gen > 0 && st.Wd > 12 && Math.random() < ctx.gen * dt) {
          const x = XJ + (Math.random() - 0.5) * (st.Wd - 12);
          const y = rnd(TOP + 12, TOP + CH - 12);
          const vy = rnd(-14, 14);
          const hc = newC(true, x, y, 'gen');
          const ec = newC(false, x, y, 'gen');
          hc.a = 0.2;
          ec.a = 0.2;
          hc.vy = vy;
          ec.vy = -vy;
          addFlash(x, y, 'gen');
        }
        // il numero di cariche segue la larghezza delle zone neutre: entrano o escono dai contatti
        [[holes, true, ctx.nH], [elecs, false, ctx.nE]].forEach(([list, h, n]) => {
          const have = liveCount(list);
          if (have < n) {
            for (let k = 0; k < Math.min(3, n - have); k++) {
              const c = newC(h, h ? rnd(1, 6) : CW - rnd(1, 6), rnd(TOP + 6, TOP + CH - 6), 'in');
              c.a = 0;
            }
          } else if (have > n && st.form >= 1) {
            for (let k = 0; k < Math.min(3, have - n); k++) {
              const c = pick(list, h, false);
              if (c) c.st = 'out';
            }
          }
        });
        sweep();
      }
      holes.forEach(render);
      elecs.forEach(render);
    }

    /* --- lampi: ricombinazione (caldo) e generazione termica (freddo) --- */

    function addFlash(x, y, kind) {
      if (reduced || !parts) return;
      const slot = parts.fpool.find((f) => !f.busy);
      if (!slot) return;
      slot.busy = true;
      slot.g.style.display = '';
      slot.g.classList.toggle('gen', kind === 'gen');
      flashes.push({ x: x, y: y, t: 0, life: kind === 'gen' ? 0.7 : 0.55, kind: kind, slot: slot });
    }
    function stepFlashes(dt) {
      for (const f of flashes) {
        f.t += dt;
        const k = f.t / f.life;
        if (k >= 1) {
          f.done = true;
          f.slot.busy = false;
          f.slot.g.style.display = 'none';
          continue;
        }
        f.slot.g.setAttribute('transform', 'translate(' + f.x.toFixed(1) + ' ' + f.y.toFixed(1) + ')');
        f.slot.core.setAttribute('r', (2 + 12 * k).toFixed(2));
        f.slot.core.style.opacity = f.kind === 'gen' ? '0' : Math.pow(1 - k, 1.5).toFixed(3);
        f.slot.ring.setAttribute('r', (3 + (f.kind === 'gen' ? 11 : 15) * k).toFixed(2));
        f.slot.ring.style.opacity = (1 - k).toFixed(3);
      }
      flashes = flashes.filter((f) => !f.done);
    }
    function clearFlashes() {
      flashes.forEach((f) => { f.slot.busy = false; f.slot.g.style.display = 'none'; });
      flashes = [];
    }

    /* --- costruzione e ricostruzione (cambio di forma dello schermo) --- */

    function build() {
      flashes = [];
      parts = draw();
      holes.concat(elecs).forEach(makeEl);
    }
    build();
    if (reduced) reducedLayout(XJ - 43, XJ + 43);
    else seedCarriers(XJ, XJ);
    const onMq = () => { build(); fitLabels(); lab.invalidate(); };
    if (mq) {
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }
    lab.onDestroy(() => {
      if (!mq) return;
      if (mq.removeEventListener) mq.removeEventListener('change', onMq);
      else if (mq.removeListener) mq.removeListener(onMq);
    });

    /* --- strumenti, grafico e comandi --- */

    const rV = lab.readout({ label: 'Tensione sul diodo', fmt: fmtV3, color: 'var(--trace-1)' });
    const rI = lab.readout({ label: 'Corrente', fmt: fmtI, color: 'var(--trace-3)' });
    const rW = lab.readout({ label: 'Zona di svuotamento', fmt: (v) => num(v, 2) + ' µm', color: 'var(--trace-2)', max: 1.4 });
    // sul telefono le etichette lunghe verrebbero tagliate
    const rWLabel = rW.el.querySelector('.ei-readout-label');
    function fitLabels() { rWLabel.textContent = mq && mq.matches ? 'Larghezza zona' : 'Zona di svuotamento'; }
    fitLabels();
    const rS = lab.readout({ label: 'Stato del diodo', fmt: (x) => x });
    const rc = new Map();
    const setColor = (r, c) => { if (rc.get(r) !== c) { rc.set(r, c); r.el.style.setProperty('--rc', c); } };

    const plot = lab.plot({
      title: 'Caratteristica I–V', height: 236,
      x: { min: -5.2, max: 2.1, unit: 'V', label: 'tensione sul diodo' },
      y: { min: -0.001, max: 0.01, unit: 'A', label: 'corrente' },
      legend: [],
      aria: 'Curva corrente-tensione del diodo, con la retta di carico della resistenza e il punto di lavoro',
    });

    const gC = lab.group('Circuito');
    const sVs = lab.slider({ into: gC, label: 'Generatore Vs', min: -5, max: 2, step: 0.01, value: 0, fmt: fmtVs, onInput: (v) => { st.Vs = v; } });
    lab.slider({ into: gC, label: 'Resistenza R', min: 47, max: 10000, series: 'E12', value: 220, unit: 'Ω', onInput: (v) => { st.R = v; } });
    const gD = lab.group('Il diodo');
    lab.choice({
      into: gD, label: 'Cristallo', value: 'si',
      options: [{ value: 'si', label: 'Silicio' }, { value: 'ge', label: 'Germanio' }],
      onChange: (v) => { st.mat = v; },
    });
    lab.slider({ into: gD, label: 'Temperatura', min: 0, max: 100, step: 1, value: 25, fmt: (v) => num(v, 0) + ' °C', onInput: (v) => { st.Tc = v; } });
    const gV = lab.group('Grafico e giunzione');
    lab.choice({
      into: gV, label: 'Scala della corrente', value: 'lin',
      options: [{ value: 'lin', label: 'Lineare' }, { value: 'log', label: 'Logaritmica' }],
      onChange: (v) => { st.scale = v; },
    });
    const bForm = lab.button({ into: gV, label: '↻ Unisci di nuovo P e N', onClick: () => { sVs.set(0); startFormation(); } });
    if (reduced) bForm.hidden = true;

    lab.challenges([
      { id: 'dieci-ma', text: 'Fai passare <b>10 mA</b> (tra 9,5 e 10,5 mA) e leggi quanta tensione resta sul diodo.', check: (q) => q.I >= 9.5e-3 && q.I <= 10.5e-3 },
      { id: 'inversa', text: 'Polarizza il diodo al contrario con <b>−5 V</b>: quanta corrente passa davvero?', check: (q) => q.Vs <= -4.95 },
      { id: 'germanio', text: 'Con una R piccola, trova una tensione a cui il <b>germanio</b> conduce già più di 1 mA, mentre il silicio nello stesso circuito resterebbe sotto 0,1 mA.', check: (q) => q.mat === 'ge' && q.I >= 1e-3 && model.state(MATERIALS.si, q.Vs, q.R, q.Tc).I < 1e-4 },
      { id: 'larga', text: 'Allarga la [[zona-di-svuotamento]] a più del doppio di quella a riposo.', check: (q) => q.form >= 1 && q.W > 2 * q.W0 },
      { id: 'caldo', text: 'Fai passare almeno <b>1 mA</b> nel diodo al <b>silicio</b> con meno di <b>0,55 V</b> ai suoi capi. A 25 °C è impossibile: che cosa puoi cambiare?', check: (q) => q.mat === 'si' && q.I >= 1e-3 && q.V < 0.55 },
    ].map((c) => Object.assign(c, { text: nb(c.text) })));

    function startFormation() {
      st.dVs = st.Vs;
      st.dLnR = Math.log(st.R);
      st.dTc = st.Tc;
      st.dm = st.mat === 'ge' ? 1 : 0;
      if (reduced) { st.form = 1; return; }
      st.form = 0;
      st.Wd = 0;
      st.tokens = 0;
      st.cool = 0;
      clearFlashes();
      seedCarriers(XJ, XJ);
    }
    lab.onReset(startFormation);

    /* --- testi che cambiano con lo stato --- */

    function explainFor(tg) {
      const mat = MATERIALS[st.mat];
      if (st.form < 1) {
        return 'Hai appena unito un cristallo di ' + mat.name + ' <b>P</b>, pieno di lacune, a uno <b>N</b>, pieno di elettroni liberi. Al confine le cariche mobili passano dall\'altra parte e si annullano a coppie: ogni lampo è una [[ricombinazione]]. Restano scoperti gli ioni fissi e nasce la [[zona-di-svuotamento]].';
      }
      const W = '<b>' + num(tg.W, 2) + ' µm</b>';
      const B = '<b>' + num(tg.barrier, 2) + ' V</b>';
      const dT = st.Tc - 25;
      let msg;
      let extra = '';
      if (Math.abs(st.Vs) < 0.005) {
        msg = 'Giunzione a riposo: la [[zona-di-svuotamento]] è larga ' + W + ' e contiene solo ioni fissi, negativi dal lato P e positivi dal lato N. Il loro campo elettrico <b>E</b> crea una [[barriera-di-potenziale]] di ' + B + ' che respinge le cariche: nessuna corrente. Prova a spostare il generatore verso il positivo.';
        if (Math.abs(dT) >= 3) extra = ' A ' + num(st.Tc, 0) + ' °C la [[tensione-di-soglia]] è ' + num(tg.soglia, 2) + ' V.';
      } else if (st.Vs > 0 && tg.I < 1e-4) {
        msg = '[[polarizzazione-diretta|Polarizzazione diretta]]: il + del generatore sull\'[[anodo]] spinge le cariche verso la giunzione e la barriera scende a ' + B + ', ma è ancora alta: passano appena <b>' + fmtI(tg.I) + '</b>. Sotto la [[tensione-di-soglia]], qui ' + num(tg.soglia, 2) + ' V, il diodo è quasi spento e quasi tutta la tensione del generatore resta ai suoi capi.';
      } else if (st.Vs > 0) {
        const dec = tg.n * model.vt(tg.T) * Math.LN10;
        msg = 'La barriera è scesa a ' + B + ' e la zona si è stretta a ' + W + ': lacune ed elettroni la attraversano e si ricombinano' + (reduced ? ' al centro' : ' (i lampi)') + '. Passano <b>' + fmtI(tg.I) + '</b>. Al diodo bastano <b>' + num(tg.V, 2) + ' V</b>; il resto, ' + num(st.Vs - tg.V, 2) + ' V, cade sulla resistenza: I = (Vs − Vd)/R. Ogni ' + num(dec, 2) + ' V in più sul diodo la corrente si moltiplica per 10.';
        if (tg.I > 0.025) msg += ' Solo la resistenza tiene a bada la corrente.';
        if (Math.abs(dT) >= 3) {
          const v25 = model.voltageAt(tg.I, model.isat(mat, T0), mat.n, T0);
          const dv = (tg.V - v25) * 1000;
          extra = ' A ' + num(st.Tc, 0) + ' °C la stessa corrente richiede ' + num(Math.abs(dv), 0) + ' mV ' + (dv < 0 ? 'in meno' : 'in più') + ' che a 25 °C: circa ' + num(Math.abs(dv / dT), 1) + ' mV per grado.';
        }
      } else {
        msg = '[[polarizzazione-inversa|Polarizzazione inversa]]: il generatore tira le lacune verso l\'[[anodo]] e gli elettroni verso il [[catodo]], lontano dalla giunzione. La zona si allarga a ' + W + ' e la barriera sale a ' + B + '. Passa solo la [[corrente-di-saturazione]], <b>' + fmtI(Math.abs(tg.I)) + '</b>: ' + (reduced ? 'le rare coppie' : 'le rare coppie (i cerchi chiari)') + ' create dal calore nella zona e separate subito dal campo. Il diodo blocca: cederebbe solo a tensioni inverse molto più alte, con il breakdown che sfruttano i <a href="#led-zener">diodi Zener</a>.';
        if (Math.abs(dT) >= 3) {
          const k = model.isat(mat, tg.T) / model.isat(mat, T0);
          extra = k >= 1
            ? ' A ' + num(st.Tc, 0) + ' °C la corrente inversa è ' + num(k, k < 10 ? 1 : 0) + ' volte quella a 25 °C.'
            : ' A ' + num(st.Tc, 0) + ' °C la corrente inversa è ' + num(1 / k, 1 / k < 10 ? 1 : 0) + ' volte più piccola che a 25 °C.';
        }
      }
      return msg + extra;
    }

    function stateLabel(tg) {
      if (st.form < 1) return ['Si forma…', 'var(--trace-2)'];
      if (Math.abs(st.Vs) < 0.005) return ['A riposo', 'var(--scope-text)'];
      if (st.Vs < 0) return ['Blocca', 'var(--trace-4)'];
      if (tg.I < 1e-4) return ['Quasi spento', 'var(--trace-2)'];
      return ['Conduce', 'var(--trace-1)'];
    }

    /* --- grafico I–V --- */

    function legendFor() {
      const mat = MATERIALS[st.mat];
      const other = MATERIALS[st.mat === 'si' ? 'ge' : 'si'];
      const out = [
        { label: 'diodo al ' + mat.name + ', ' + num(st.Tc, 0) + ' °C', color: 'var(--trace-1)' },
        { label: 'retta di carico di R', color: 'var(--trace-2)' },
        { label: other.name + ', per confronto', color: GHOST },
      ];
      if (Math.abs(st.Tc - 25) >= 1) out.push({ label: mat.name + ' a 25 °C', color: 'color-mix(in srgb, var(--trace-1) 45%, transparent)' });
      return out;
    }

    // Scritta sul grafico con un alone del colore di fondo, leggibile anche sopra le curve.
    function plotText(c, x, y, text, color, align) {
      c.save();
      c.font = '700 10.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      c.textAlign = align;
      c.textBaseline = 'middle';
      c.lineJoin = 'round';
      c.lineWidth = 4;
      c.strokeStyle = P.bg;
      c.strokeText(text, x, y);
      c.fillStyle = color;
      c.globalAlpha = 0.9;
      c.fillText(text, x, y);
      c.restore();
    }

    function drawPlot(d, R, Tk, dt) {
      const log = st.scale === 'log';
      const yTarget = 2.3 / R;
      st.ymax = dt > 0 ? Math.exp(EI.approach(Math.log(st.ymax), Math.log(yTarget), dt, 7)) : yTarget;
      plot.opts.y = log
        ? { min: -12.4, max: -0.6, count: 11, label: 'corrente, scala logaritmica', fmt: (v) => si(Math.pow(10, v), 'A', { sig: 1, trim: true }) }
        : { min: -0.08 * st.ymax, max: st.ymax, unit: 'A', label: 'corrente' };
      const yv = (I) => (log ? (Math.abs(I) > 1e-14 ? Math.log10(Math.abs(I)) : NaN) : I);
      plot.clear();
      const c = plot.ctx;
      plot.vband(-5.2, 0, { color: P.t4, alpha: 0.05 });
      plot.vband(0, 2.1, { color: P.t1, alpha: 0.035 });
      plot.vline(0, { color: P.text, alpha: 0.35, dash: [] });
      const x0 = plot.X(0);
      plotText(c, x0 - 8, plot.py0 + 12, '← inversa', P.t4, 'right');
      plotText(c, x0 + 8, plot.py0 + 12, 'diretta →', P.t1, 'left');

      const other = MATERIALS[st.mat === 'si' ? 'ge' : 'si'];
      const Io = model.isat(other, Tk);
      plot.line((V) => yv(model.shockley(V, Io, other.n, Tk)), { color: GHOST, width: 1.6, glow: false, dash: [6, 5] });
      if (Math.abs(st.dTc - 25) >= 0.5) {
        const Is25 = Math.exp(lerp(Math.log(MATERIALS.si.Is), Math.log(MATERIALS.ge.Is), st.dm));
        plot.line((V) => yv(model.shockley(V, Is25, d.n, T0)), { color: P.t1, width: 1.4, glow: false, dash: [2, 4], alpha: 0.5 });
      }
      plot.line((V) => yv(model.shockley(V, d.Is, d.n, Tk)), { color: P.t1, width: 2.6 });
      // retta di carico: tutte le coppie (V, I) che il generatore e la resistenza permettono
      plot.line((V) => yv((st.dVs - V) / R), { color: P.t2, width: 1.8, dash: [7, 5], glow: false });
      // soglia (1 mA) e corrente di saturazione
      plot.vline(d.soglia, { color: P.t1, alpha: 0.4 });
      // in scala logaritmica in alto passa la retta di carico: l'etichetta va in basso, dove non c'è niente
      plot.tag(plot.X(d.soglia), log ? plot.py1 - 30 : plot.py0 + 34, 'soglia ' + num(d.soglia, 2) + ' V', P.t1, 'right');
      if (log) {
        // la corrente di saturazione: il tratto piatto della curva in inversa, con l'etichetta sopra e
        // lontana dal punto di lavoro
        const yIs = Math.log10(d.Is);
        plot.hline(yIs, { color: P.t3, alpha: 0.65 });
        plot.tag(plot.X(d.V < -2.6 ? -1.3 : -3.9), plot.Y(yIs), 'Is = ' + si(d.Is, 'A'), P.t3, 'up');
      }
      // etichette delle curve, fuori dallo spazio tra le due: Si a destra della sua, Ge a sinistra
      // in scala logaritmica le etichette stanno ben sopra i tratti piatti della corrente inversa
      let iTag = log ? clamp(300 * Math.max(d.Is, Io), 1e-5, 3e-3) : 0.62 * st.ymax;
      // se il punto di lavoro passa proprio di lì, le etichette scendono un po'
      if (log ? d.I > 0 && Math.abs(Math.log10(d.I / iTag)) < 0.9 : d.I > 0.45 * st.ymax) iTag = log ? iTag / 16 : 0.3 * st.ymax;
      const vMine = model.voltageAt(iTag, d.Is, d.n, Tk);
      const vOther = model.voltageAt(iTag, Io, other.n, Tk);
      const mineSi = st.dm < 0.5;
      const yTag = plot.Y(yv(iTag));
      plot.tag(plot.X(vMine) + (mineSi ? 2 : -2), yTag, mineSi ? 'Si' : 'Ge', P.t1, mineSi ? 'right' : 'left');
      plot.tag(plot.X(vOther) + (mineSi ? -2 : 2), yTag, mineSi ? 'Ge' : 'Si', GHOST, mineSi ? 'left' : 'right');
      // punto di lavoro
      const yq = yv(d.I);
      const lbl = 'Q ' + num(d.V, 2) + ' V · ' + fmtI(d.I);
      if (isFinite(yq)) plot.point(d.V, yq, { color: P.t2, r: 5, label: lbl, labelPos: d.V > 0.05 ? 'left' : 'right' });
      else plot.point(d.V, -12, { color: P.t2, r: 5, label: lbl, labelPos: 'up' });
    }

    /* --- aggiornamento --- */

    lab.loop((dt) => {
      P = EI.palette(); // segue il tema chiaro o scuro
      const moving = dt > 0 && !reduced;
      if (moving) {
        st.dVs = EI.approach(st.dVs, st.Vs, dt, 9);
        st.dLnR = EI.approach(st.dLnR, Math.log(st.R), dt, 9);
        st.dTc = EI.approach(st.dTc, st.Tc, dt, 6);
        st.dm = EI.approach(st.dm, st.mat === 'ge' ? 1 : 0, dt, 5);
        if (Math.abs(st.dVs - st.Vs) < 2e-4) st.dVs = st.Vs;
        if (Math.abs(st.dLnR - Math.log(st.R)) < 1e-4) st.dLnR = Math.log(st.R);
        if (Math.abs(st.dTc - st.Tc) < 0.01) st.dTc = st.Tc;
        if (Math.abs(st.dm - (st.mat === 'ge' ? 1 : 0)) < 1e-3) st.dm = st.mat === 'ge' ? 1 : 0;
        if (st.form < 1) st.form = Math.min(1, st.form + dt / FORM_TIME);
      } else {
        st.dVs = st.Vs;
        st.dLnR = Math.log(st.R);
        st.dTc = st.Tc;
        st.dm = st.mat === 'ge' ? 1 : 0;
        if (reduced) st.form = 1;
      }
      const R = Math.exp(st.dLnR);
      const d = blendState(st.dm, st.dVs, R, st.dTc);
      const tg = model.state(MATERIALS[st.mat], st.Vs, st.R, st.Tc);
      const Tk = d.T;

      // zona di svuotamento: larghezza (con la formazione all'inizio)
      const Wgoal = Math.min(d.W * UM, CW - 30) * easeOut(st.form);
      const halfOld = st.Wd / 2;
      st.Wd = moving ? EI.approach(st.Wd, Wgoal, dt, 7) : Wgoal;
      const half = st.Wd / 2;
      // velocità del bordo della zona: le cariche neutre lo seguono (si allarga: si ritirano verso i contatti)
      const vEdge = moving && st.form >= 1 ? (half - halfOld) / dt : 0;
      const edgeP = XJ - half;
      const edgeN = XJ + half;
      parts.zone.setAttribute('x', edgeP.toFixed(2));
      parts.zone.setAttribute('width', st.Wd.toFixed(2));
      for (const ion of parts.ions) {
        const on = Math.abs(ion.x - XJ) < half;
        if (on !== ion.on) { ion.on = on; ion.g.classList.toggle('on', on); }
      }

      // campo elettrico: frecce lunghe quanto la zona, più intense se la barriera è alta
      const L = clamp(st.Wd - 16, 0, 130);
      const vbmax = d.vbi + 5;
      const fieldOp = L < 8 ? 0 : (0.3 + 0.7 * Math.sqrt(clamp(d.barrier / vbmax, 0, 1))) * easeOut(st.form);
      if (Math.abs(fieldOp - parts.fieldOp) > 0.004) { parts.field.setAttribute('opacity', fieldOp.toFixed(3)); parts.fieldOp = fieldOp; }
      parts.arrows.forEach((a) => {
        const xa = XJ + L / 2;
        const xb = XJ - L / 2;
        a.el.setAttribute('d', L < 8 ? '' : 'M' + xa.toFixed(1) + ' ' + a.y + 'H' + xb.toFixed(1) + 'M' + (xb + 6).toFixed(1) + ' ' + (a.y - 4) + 'L' + xb.toFixed(1) + ' ' + a.y + 'L' + (xb + 6).toFixed(1) + ' ' + (a.y + 4));
      });
      parts.eTag.setAttribute('x', (XJ + L / 2 + 4).toFixed(1));

      // misura della zona
      const yd = TOP + CH + 12;
      let dd = 'M' + edgeP.toFixed(1) + ' ' + (yd - 5) + 'V' + (yd + 5) + 'M' + edgeN.toFixed(1) + ' ' + (yd - 5) + 'V' + (yd + 5) + 'M' + edgeP.toFixed(1) + ' ' + yd + 'H' + edgeN.toFixed(1);
      if (half > 9) dd += 'M' + (edgeP + 5).toFixed(1) + ' ' + (yd - 3) + 'L' + edgeP.toFixed(1) + ' ' + yd + 'L' + (edgeP + 5).toFixed(1) + ' ' + (yd + 3) + 'M' + (edgeN - 5).toFixed(1) + ' ' + (yd - 3) + 'L' + edgeN.toFixed(1) + ' ' + yd + 'L' + (edgeN - 5).toFixed(1) + ' ' + (yd + 3);
      parts.dim.setAttribute('d', st.Wd > 1 ? dd : '');
      parts.wTag.textContent = 'W = ' + num(st.Wd / UM, 2) + ' µm';

      // barriera: il gradino di potenziale tra P e N, alto quanto Vbi − V
      const barrier = st.form < 1 ? d.barrier * easeOut(st.form) : d.barrier;
      const hh = hillH(barrier);
      let hd = 'M0 ' + SB + 'H' + edgeP.toFixed(1);
      for (let k = 1; k <= 18; k++) {
        const u = k / 18;
        const phi = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
        hd += 'L' + (edgeP + st.Wd * u).toFixed(1) + ' ' + (SB - hh * phi).toFixed(1);
      }
      hd += 'H' + CW;
      parts.hill.setAttribute('d', hd);
      parts.hillFill.setAttribute('d', hd + 'V' + SB + 'Z');
      parts.guides.setAttribute('d', st.Wd > 1 ? 'M' + edgeP.toFixed(1) + ' ' + (TOP + CH + 34) + 'V' + SB + 'M' + edgeN.toFixed(1) + ' ' + (TOP + CH + 34) + 'V' + (SB - hh).toFixed(1) : '');
      const ax = Math.max(54, edgeP - 9);
      parts.ref.setAttribute('d', 'M' + (ax - 4).toFixed(1) + ' ' + (SB - hh).toFixed(1) + 'H' + edgeN.toFixed(1));
      let bd = 'M' + ax.toFixed(1) + ' ' + SB + 'V' + (SB - hh).toFixed(1);
      if (hh > 9) bd += 'M' + (ax - 3).toFixed(1) + ' ' + (SB - hh + 5).toFixed(1) + 'L' + ax.toFixed(1) + ' ' + (SB - hh).toFixed(1) + 'L' + (ax + 3).toFixed(1) + ' ' + (SB - hh + 5).toFixed(1) + 'M' + (ax - 3).toFixed(1) + ' ' + (SB - 5) + 'L' + ax.toFixed(1) + ' ' + SB + 'L' + (ax + 3).toFixed(1) + ' ' + (SB - 5);
      parts.bar.setAttribute('d', bd);
      parts.barTag.setAttribute('x', (ax - 6).toFixed(1));
      parts.barTag.setAttribute('y', Math.min(SB - hh / 2 + 4, SB - 7).toFixed(1));
      parts.barTag.textContent = num(barrier, 2) + ' V';

      // bagliore delle ricombinazioni al centro della giunzione
      const glowK = d.I > 1e-6 && st.form >= 1 ? clamp(0.12 + 0.55 * Math.sqrt(Math.min(1, d.I / IREF)), 0, 0.7) : 0;
      if (Math.abs(glowK - parts.glowK) > 0.005) { parts.glow.setAttribute('opacity', glowK.toFixed(3)); parts.glowK = glowK; }
      // movimento ridotto: frecce ferme che mostrano dove vanno le cariche in diretta
      if (reduced && d.I > 1e-5) {
        const ym = TOP + CH / 2;
        const a1 = Math.max(10, edgeP - 46);
        const b1 = edgeP - 8;
        const a2 = Math.min(CW - 10, edgeN + 46);
        const b2 = edgeN + 8;
        parts.drift.setAttribute('d', 'M' + a1 + ' ' + ym + 'H' + b1 + 'M' + (b1 - 6) + ' ' + (ym - 5) + 'L' + b1 + ' ' + ym + 'L' + (b1 - 6) + ' ' + (ym + 5) +
          'M' + a2 + ' ' + ym + 'H' + b2 + 'M' + (b2 + 6) + ' ' + (ym - 5) + 'L' + b2 + ' ' + ym + 'L' + (b2 + 6) + ' ' + (ym + 5));
      } else parts.drift.setAttribute('d', '');

      // cariche mobili
      // in diretta le coppie si annullano alla giunzione a un ritmo che segue la corrente; le cariche
      // delle zone neutre scorrono verso la giunzione alla velocità che serve a rimpiazzarle (flusso =
      // densità × velocità), così la loro densità resta uniforme come nel cristallo vero. In più
      // seguono il bordo della zona quando si sposta.
      const rate = d.I > 1e-6 && st.form >= 1 ? 22 * Math.sqrt(Math.min(d.I, 0.05) / IREF) : 0;
      updateCarriers(dt, {
        edgeP: edgeP, edgeN: edgeN, T: Tk,
        nH: Math.round(DENS * Math.max(0, edgeP - 2)),
        nE: Math.round(DENS * Math.max(0, CW - edgeN - 2)),
        vd: rate / DENS - vEdge,
        rate: rate,
        gen: d.V < -0.05 && st.form >= 1 ? clamp(1.4 * Math.pow(d.Is / 1e-6, 0.4), 0.05, 6) : 0,
      });
      if (moving) stepFlashes(dt);

      // circuito: colore dei fili = tensione del nodo, cariche che scorrono = corrente
      const vK = d.I * R;
      parts.wA.style.stroke = EI.vcolor(st.dVs, VCOL);
      parts.wK.forEach((w) => { w.style.stroke = EI.vcolor(vK, VCOL); });
      parts.w0.forEach((w) => { w.style.stroke = EI.vcolor(0, VCOL); });
      const sp = EI.speedFor(d.I, IREF);
      parts.flows.forEach((f) => { f.set(sp); f.step(dt); });
      const flipTarget = st.Vs < 0 ? 180 : 0;
      st.flip = moving ? EI.approach(st.flip, flipTarget, dt, 9) : flipTarget;
      if (parts.flipDrawn === null || Math.abs(st.flip - parts.flipDrawn) > 0.05) {
        parts.supWrap.setAttribute('transform', 'rotate(' + st.flip.toFixed(2) + ' ' + parts.supC[0] + ' ' + parts.supC[1] + ')');
        parts.flipDrawn = st.flip;
      }
      parts.supVal.textContent = fmtVs(st.Vs);
      parts.resVal.textContent = si(st.R, 'Ω', { trim: true });
      parts.ammVal.textContent = fmtI(d.I);
      const kOn = d.I > 1e-5 ? clamp(Math.log10(d.I / 1e-5) / 3.3, 0, 1) : 0;
      const tint = kOn > 0.02 ? EI.mix(SYM, P.t1, kOn) : '';
      if (tint !== parts.tint) {
        parts.tint = tint;
        parts.diode.g.style.color = tint;
        parts.diode.g.style.filter = tint ? 'drop-shadow(0 0 ' + (2 + 5 * kOn).toFixed(1) + 'px ' + P.t1 + ')' : '';
      }

      // strumenti
      rV.set(d.V);
      setColor(rV, d.V > 1e-3 ? 'var(--trace-1)' : d.V < -1e-3 ? 'var(--trace-4)' : 'var(--scope-text)');
      rI.set(d.I);
      rI.state(d.I > 0.03 ? 'warn' : '');
      rW.set(st.Wd / UM);
      const sl = stateLabel(tg);
      rS.set(sl[0]);
      setColor(rS, sl[1]);

      // grafico
      const lk = st.mat + '|' + st.Tc;
      if (lk !== legendKey) { legendKey = lk; plot.setLegend(legendFor()); }
      drawPlot(d, R, Tk, moving ? dt : 0);

      lab.explain(nb(explainFor(tg)));
      lab.check({ mat: st.mat, Vs: st.Vs, R: st.R, Tc: st.Tc, V: tg.V, I: tg.I, W: tg.W, W0: tg.W0, form: st.form });
    });
  }

  /* ---------- illustrazioni ---------- */

  // Il gradino di potenziale della giunzione: due archi di parabola tra x1 e x2.
  function stepPath(x0, x1, x2, x3, yLow, yHigh) {
    let d = 'M' + x0 + ' ' + yLow + 'H' + x1;
    for (let k = 1; k <= 20; k++) {
      const u = k / 20;
      const phi = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
      d += 'L' + (x1 + (x2 - x1) * u).toFixed(1) + ' ' + (yLow + (yHigh - yLow) * phi).toFixed(1);
    }
    return d + 'H' + x3;
  }

  function junctionFigure() {
    const r = rng(1940);
    let carriers = '';
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) {
        const xp = 44 + i * 23 + (r() * 8 - 4);
        const xn = 290 + i * 23 + (r() * 8 - 4);
        const y = 48 + j * 28 + (r() * 8 - 4);
        if (!(i === 5 && j === 1)) carriers += '<circle class="f-p-dot" cx="' + xp.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4.5"/>';
        if (!(i === 0 && j === 2)) carriers += '<circle class="f-n-dot" cx="' + xn.toFixed(1) + '" cy="' + (y + 6).toFixed(1) + '" r="3.8"/>';
      }
    }
    let ions = '';
    [198, 218].forEach((x) => [50, 78, 106, 134].forEach((y) => {
      ions += '<circle class="f-p" cx="' + x + '" cy="' + y + '" r="7.5"/><path class="f-p-dot" d="M' + (x - 3.5) + ' ' + y + 'H' + (x + 3.5) + '"/>';
    }));
    [242, 262].forEach((x) => [50, 78, 106, 134].forEach((y) => {
      ions += '<circle class="f-n" cx="' + x + '" cy="' + y + '" r="7.5"/><path class="f-n" d="M' + (x - 3.5) + ' ' + y + 'H' + (x + 3.5) + 'M' + x + ' ' + (y - 3.5) + 'V' + (y + 3.5) + '"/>';
    }));
    const hill = stepPath(30, 186, 274, 430, 290, 230);
    return '<svg viewBox="0 0 460 312">' +
      '<text class="f-p-text" x="30" y="22">Lato P · lacune</text>' +
      '<text class="f-small" x="230" y="22" text-anchor="middle">zona di svuotamento</text>' +
      '<text class="f-n-text" x="430" y="22" text-anchor="end">Lato N · elettroni</text>' +
      '<path class="f-p" d="M38 32H230V152H38A8 8 0 0 1 30 144V40A8 8 0 0 1 38 32Z"/>' +
      '<path class="f-n" d="M230 32H422A8 8 0 0 1 430 40V144A8 8 0 0 1 422 152H230Z"/>' +
      '<rect class="f-accent-soft" x="186" y="32" width="88" height="120" fill-opacity=".55" stroke-dasharray="5 4"/>' +
      carriers + ions +
      // la lacuna e l'elettrone che provano a passare e vengono respinti
      '<circle class="f-p-dot diodo-fig-try-h" cx="166" cy="70" r="4.5"/>' +
      '<circle class="f-n-dot diodo-fig-try-e" cx="294" cy="110" r="3.8"/>' +
      '<path class="f-accent" stroke-width="2.6" d="M268 92H192M199 87L192 92L199 97"/>' +
      '<text class="f-accent-text" x="276" y="97">E</text>' +
      '<path class="f-thin" d="M186 158V170M274 158V170M186 164H274"/>' +
      '<text class="f-mono" x="230" y="184" text-anchor="middle">W ≈ 0,4 µm</text>' +
      '<text class="f-small" x="30" y="210">potenziale elettrico</text>' +
      '<path class="f-dash" d="M186 192V290M274 192V230"/>' +
      '<path class="f-thin" d="M30 298H430"/>' +
      '<path class="f-dash" d="M274 290H318"/>' +
      '<path class="f-accent" stroke-width="3" d="' + hill + '"/>' +
      '<path class="f-line" stroke-width="1.4" d="M312 236V284M308 240L312 233L316 240M308 280L312 287L316 280"/>' +
      '<text class="f-accent-text" x="322" y="256">≈ 0,7 V nel silicio</text>' +
      '<text class="f-small" x="322" y="272">≈ 0,3 V nel germanio</text>' +
      '<text class="f-small" x="34" y="284">lato P</text>' +
      '<text class="f-small" x="430" y="222" text-anchor="end">lato N</text>' +
      '</svg>';
  }

  function partsFigure() {
    return '<svg viewBox="0 0 460 340">' +
      // 1N4007: corpo nero, fascia grigia dal lato del catodo
      '<path class="diodo-fig-lead" d="M24 56H112M270 56H340"/>' +
      '<rect class="diodo-fig-body" x="112" y="36" width="158" height="40" rx="9"/>' +
      '<rect class="diodo-fig-shine" x="120" y="40" width="142" height="7" rx="3.5"/>' +
      '<rect class="diodo-fig-band" x="238" y="36" width="18" height="40"/>' +
      '<text class="diodo-fig-print" x="174" y="61" text-anchor="middle">1N4007</text>' +
      '<text class="f-small" x="191" y="24" text-anchor="middle">1N4007: raddrizzatore, 1 A e 1000 V</text>' +
      // 1N4148: vetro arancio con la fascia nera
      '<path class="diodo-fig-lead thin" d="M354 56H384M424 56H450"/>' +
      '<rect class="diodo-fig-glass" x="384" y="47" width="40" height="18" rx="8"/>' +
      '<rect class="diodo-fig-die" x="399" y="53" width="6" height="6" rx="1"/>' +
      '<rect class="diodo-fig-blackband" x="412" y="47" width="6" height="18"/>' +
      '<text class="f-small" x="404" y="24" text-anchor="middle">1N4148: segnali</text>' +
      // il simbolo, allineato al componente
      '<path class="f-dash" d="M247 80V112"/>' +
      '<text class="f-text" x="24" y="128">anodo (A)</text>' +
      '<text class="f-text" x="340" y="128" text-anchor="end">catodo (K)</text>' +
      '<path class="f-line" d="M24 140H207M247 140H340"/>' +
      '<path class="f-fill" d="M207 120L247 140L207 160Z"/>' +
      '<path class="f-line" stroke-width="3.4" d="M247 118V162"/>' +
      '<path class="f-accent" d="M60 156H150M142 151L150 156L142 161"/>' +
      '<text class="f-accent-text" x="105" y="174" text-anchor="middle">verso della corrente</text>' +
      // la valvola di non ritorno: una sfera che una molla tiene premuta contro la sede
      '<text class="f-text" x="20" y="206">Diretta: la valvola si apre</text>' +
      '<rect class="diodo-fig-water" x="20" y="222" width="200" height="56"/>' +
      '<path class="diodo-fig-flow" d="M26 244H114C120 244 122 231 132 230H182C190 230 196 236 206 238"/>' +
      '<path class="diodo-fig-flow" d="M26 256H114C120 256 122 269 132 270H182C190 270 196 264 206 262"/>' +
      '<path class="f-line" d="M20 222H220M20 278H220"/>' +
      '<path class="f-fill" d="M104 222H112V238H104ZM104 262H112V278H104Z"/>' +
      '<circle class="f-paper" cx="142" cy="250" r="14"/>' +
      '<path class="f-line" stroke-width="1.6" d="M156 250l3.4 -7l6.6 14l6.6 -14l6.6 14l6.6 -14l6.6 14l3.6 -7"/>' +
      '<path class="f-thin" d="M198 222V241M198 259V278"/><rect class="f-fill" x="196" y="241" width="4" height="18"/>' +
      '<path class="f-n" d="M206 244L215 250L206 256Z"/>' +
      '<text class="f-text" x="240" y="206">Inversa: la valvola si chiude</text>' +
      '<rect class="diodo-fig-water" x="240" y="222" width="200" height="56"/>' +
      '<path class="f-line" d="M240 222H440M240 278H440"/>' +
      '<path class="f-fill" d="M324 222H332V238H324ZM324 262H332V278H324Z"/>' +
      '<circle class="f-paper" cx="340" cy="250" r="14"/>' +
      '<path class="f-line" stroke-width="1.6" d="M354 250l4.4 -7l8.8 14l8.8 -14l8.8 14l8.8 -14l8.8 14l4.6 -7"/>' +
      '<path class="f-thin" d="M418 222V241M418 259V278"/><rect class="f-fill" x="416" y="241" width="4" height="18"/>' +
      '<path class="f-n" stroke-dasharray="7 6" d="M434 232H372M434 268H372"/>' +
      '<path class="f-n" d="M372 227L363 232L372 237ZM372 263L363 268L372 273Z"/>' +
      '<text class="f-small" x="280" y="248" text-anchor="middle">niente</text>' +
      '<text class="f-small" x="280" y="261" text-anchor="middle">flusso</text>' +
      '<text class="f-small" x="230" y="304" text-anchor="middle">La molla tiene chiusa la valvola finché la spinta non supera una soglia:</text>' +
      '<text class="f-small" x="230" y="320" text-anchor="middle">per il diodo è la tensione di soglia, circa 0,6 V nel silicio.</text>' +
      '</svg>';
  }

  /* ---------- capitolo ---------- */

  // i testi passano da nb() per gli spazi indivisibili tra numeri e unità
  function withNbsp(c) {
    c.summary = nb(c.summary);
    c.lab.intro = nb(c.lab.intro);
    c.how = c.how.map(nb);
    c.formulas.forEach((f) => { f.note = nb(f.note); f.legend = f.legend.map((l) => [l[0], nb(l[1])]); });
    c.figures.forEach((f) => { f.caption = nb(f.caption); f.alt = nb(f.alt); });
    c.history.text = c.history.text.map(nb);
    c.history.events.forEach((e) => { e.text = nb(e.text); });
    c.fun = nb(c.fun);
    c.uses = nb(c.uses);
    Object.keys(c.glossary).forEach((k) => { c.glossary[k].def = nb(c.glossary[k].def); });
    return c;
  }

  EI.chapter(withNbsp({
    id: 'diodo',
    icon: 'diode',
    minutes: 13,
    summary: 'Quando una zona P e una zona N si toccano nello stesso cristallo, al confine nasce una sottile [[zona-di-svuotamento]] con una [[barriera-di-potenziale]]. Con la tensione nel verso giusto la barriera si abbassa e la corrente cresce in modo esponenziale; nel verso opposto la barriera si alza e non passa quasi niente. È il diodo: una valvola di non ritorno per la corrente.',
    keywords: ['giunzione-pn', 'zona-di-svuotamento', 'barriera-di-potenziale', 'polarizzazione-diretta', 'polarizzazione-inversa', 'tensione-di-soglia', 'corrente-di-saturazione', 'equazione-di-shockley'],
    model: model,
    css: [
      '.diodo-band { fill: rgba(0, 0, 0, .3); }',
      '.diodo-ion { opacity: .3; transition: opacity .4s ease; }',
      '.diodo-ion.on { opacity: 1; }',
      '.diodo-ion.on circle { stroke-width: 1.8; }',
      '.diodo-sign { fill: none; stroke: var(--lab-ink); stroke-width: 1.5; stroke-linecap: round; }',
      '.diodo-field { filter: url(#ei-glow); }',
      '.diodo-arrow { fill: none; stroke: #fff2d6; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }',
      '.diodo-etag { fill: #fff2d6; font: italic 800 12.5px var(--font); }',
      '.diodo-elecs { filter: url(#ei-glow); }',
      '.diodo-elecs .ei-e { filter: none; }',
      '.diodo-flashes { filter: url(#ei-glow); }',
      '.diodo-flash-core { fill: url(#ei-hot); }',
      '.diodo-flash-ring { fill: none; stroke: var(--flow); stroke-width: 1.8; }',
      '.diodo-flash.gen .diodo-flash-ring { stroke: #d6ecff; stroke-width: 1.4; stroke-dasharray: 2 2.5; }',
      '.diodo-glow { fill: url(#ei-hot); transition: opacity .3s ease; }',
      '.diodo-drift { fill: none; stroke: var(--lab-ink); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; opacity: .85; }',
      '.diodo-metal { fill: #4f5d62; stroke: #9db0b6; stroke-width: 1; }',
      '.diodo-zt { fill: var(--trace-2); font: 700 10px var(--mono); letter-spacing: .04em; }',
      '.diodo-dim { fill: none; stroke: var(--trace-2); stroke-width: 1.2; stroke-linecap: round; }',
      '.diodo-wtag { fill: var(--trace-2); font: 700 11.5px var(--mono); }',
      '.diodo-strip-t { fill: var(--scope-text); font: 800 9.5px var(--mono); letter-spacing: .12em; }',
      '.diodo-side { fill: var(--scope-text); font: 600 9.5px var(--font); opacity: .8; }',
      '.diodo-hill { fill: none; stroke: var(--trace-2); stroke-width: 2.4; stroke-linejoin: round; filter: url(#ei-glow); }',
      '.diodo-hill-fill { fill: color-mix(in srgb, var(--trace-2) 12%, transparent); }',
      '.diodo-guide { fill: none; stroke: var(--trace-2); stroke-width: 1; stroke-dasharray: 2 4; opacity: .5; }',
      '.diodo-ref { fill: none; stroke: var(--lab-ink); stroke-width: 1; stroke-dasharray: 3 3; opacity: .45; }',
      '.diodo-bar { fill: none; stroke: var(--lab-ink); stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }',
      '.diodo-btag { fill: var(--lab-ink); font: 700 11.5px var(--mono); }',
      '.diodo-lens rect { fill: color-mix(in srgb, var(--trace-2) 5%, transparent); stroke: var(--trace-2); stroke-width: 1.2; stroke-dasharray: 4 3; opacity: .75; }',
      '.diodo-zoom { fill: none; stroke: var(--trace-2); stroke-width: 1; stroke-dasharray: 3 5; opacity: .4; }',
      '.diodo-leg { fill: var(--lab-ink); font: 700 11px var(--font); }',
      '.diodo-leg-sub { fill: var(--scope-text); font: 600 9.5px var(--font); }',
      '.diodo-svg .ei-sym.diode { transition: color .3s ease; }',
      // la radice della terza formula: il segno ingrandito e la sua sbarra sopra il radicando
      '.diodo-rad { display: inline-block; font-size: 1.8em; line-height: 1; vertical-align: middle; margin-right: -.04em; }',
      '.diodo-root { display: inline-flex; align-items: center; vertical-align: middle; border-top: 1.5px solid currentColor; padding: 3px .12em 0 .08em; }',
      // sul telefono il disegno ha già la sua forma alta: niente ingrandimenti dei testi
      '.ei-stage .diodo-tall .ei-sym-label { font-size: 13px; }',
      '.ei-stage .diodo-tall .ei-sym-label .value { font-size: 12.5px; }',
      '.ei-stage .diodo-tall .ei-wire { stroke-width: 3; }',
      '.ei-stage .diodo-tall .ei-sym .lead { stroke-width: 2.4; }',
      '.diodo-tall .diodo-leg { font-size: 12px; }',
      // illustrazioni
      '.diodo-fig-lead { fill: none; stroke: #9aa3ab; stroke-width: 3; stroke-linecap: round; }',
      '.diodo-fig-lead.thin { stroke-width: 2.2; }',
      '.diodo-fig-body { fill: #24292e; stroke: var(--fig-ink); stroke-width: 1.2; }',
      '.diodo-fig-shine { fill: #fff; opacity: .16; }',
      '.diodo-fig-band { fill: #c9ced3; }',
      '.diodo-fig-print { fill: #c9ced3; font: 700 10px var(--mono); letter-spacing: .08em; }',
      '.diodo-fig-glass { fill: color-mix(in srgb, #ff9d2e 38%, transparent); stroke: #c46a12; stroke-width: 1.2; }',
      '.diodo-fig-die { fill: var(--fig-muted); opacity: .7; }',
      '.diodo-fig-blackband { fill: #1b1e21; }',
      '.diodo-fig-water { fill: color-mix(in srgb, var(--fig-n) 14%, var(--fig-paper)); }',
      '.diodo-fig-flow { fill: none; stroke: var(--fig-n); stroke-width: 2; stroke-dasharray: 7 6; animation: diodo-dash 1.1s linear infinite; }',
      '.diodo-fig-try-h { animation: diodo-try-r 3.4s ease-in-out infinite; }',
      '.diodo-fig-try-e { animation: diodo-try-l 3.4s ease-in-out 1.7s infinite; }',
      '@keyframes diodo-dash { to { stroke-dashoffset: -26; } }',
      '@keyframes diodo-try-r { 0%, 62%, 100% { transform: translateX(0); } 30% { transform: translateX(12px); } }',
      '@keyframes diodo-try-l { 0%, 62%, 100% { transform: translateX(0); } 30% { transform: translateX(-12px); } }',
      '@media (prefers-reduced-motion: reduce) { .diodo-fig-flow, .diodo-fig-try-h, .diodo-fig-try-e { animation: none; } }',
    ].join('\n'),
    lab: {
      title: 'La giunzione sotto tensione',
      svgLabel: 'Un circuito con generatore, diodo, resistenza e amperometro; sotto, il diodo ingrandito: la giunzione tra il cristallo P e il cristallo N con le cariche, gli ioni fissi e la barriera di potenziale',
      intro: 'Muovi il generatore: in positivo la [[zona-di-svuotamento]] si stringe e le cariche attraversano la giunzione, ricombinandosi; in negativo la zona si allarga e la corrente si ferma quasi del tutto. Nel grafico la curva del diodo incrocia la retta di carico della resistenza: l\'incrocio è il punto di lavoro. Poi prova il germanio e scalda il diodo.',
      mount: mount,
    },
    how: [
      'Immagina di prendere un cristallo di silicio drogato <b>P</b>, pieno di [[lacuna|lacune]], e uno drogato <b>N</b>, pieno di [[elettrone-libero|elettroni liberi]], e di unirli: ottieni una [[giunzione-pn|giunzione P-N]]. Nei componenti veri le due zone stanno in un unico cristallo, drogato in modo diverso nelle due parti. Al confine le cariche mobili si spargono dall\'altra parte, come un profumo in una stanza; quando un elettrone incontra una lacuna la riempie e la coppia sparisce: è la [[ricombinazione]].',
      'Vicino al confine restano scoperti gli ioni fissi del [[drogaggio]], che non possono muoversi: negativi dal lato P (gli atomi [[accettore|accettori]]), positivi dal lato N (i [[donatore|donatori]]). È la [[zona-di-svuotamento]]: nel laboratorio è larga circa 0,4 micrometri, meno di un centesimo dello spessore di un capello.',
      'Gli ioni scoperti creano un campo elettrico, diretto da N verso P, che respinge le cariche in arrivo: la diffusione si ferma quando il campo la bilancia. Tra i due lati resta una [[barriera-di-potenziale]], circa 0,7 V nel silicio e 0,3 V nel germanio. Un voltmetro non la vede: ai contatti metallici nascono altre piccole barriere che la compensano.',
      'In [[polarizzazione-diretta]], con il + sull\'[[anodo]] (il lato P), la barriera si abbassa e la zona si stringe: le cariche attraversano la giunzione e la corrente cresce in modo esponenziale, come dice l\'[[equazione-di-shockley|equazione di Shockley]]. Oltre la [[tensione-di-soglia]], circa 0,6–0,7 V nel silicio, bastano pochi centesimi di volt in più per raddoppiarla. Per questo un diodo non si collega mai direttamente a una pila: serve qualcosa in serie, per esempio una resistenza, che limiti la corrente con la legge di Ohm.',
      'In [[polarizzazione-inversa]], con il + sul [[catodo]], la barriera cresce e la zona si allarga: passa solo la [[corrente-di-saturazione]], pochi nanoampere in un piccolo diodo al silicio. Se però la tensione inversa supera un limite, la giunzione cede di colpo: è il breakdown, che i diodi Zener sfruttano apposta (lo trovi nel capitolo <a href="#led-zener">LED e Zener</a>).',
      'Il risultato è una valvola di non ritorno per la corrente. Sul componente una fascia indica il catodo: il piccolo 1N4148, in vetro, è veloce e lavora con i segnali; il robusto 1N4007, nero, porta 1 A e regge 1000 V in inversa. Quattro diodi come lui, messi a ponte, raddrizzano la tensione di rete negli <a href="#alimentatore">alimentatori</a>.',
      'Anche la temperatura conta: a parità di corrente, la tensione di un diodo al silicio scende di circa 2 mV per ogni grado in più, mentre la corrente inversa cresce in fretta.',
    ],
    formulas: [
      {
        name: 'Equazione di Shockley',
        expr: '<var>I</var> = <var>I</var><sub>S</sub> · (<var>e</var><sup><var>V</var> / (<var>n</var>·<var>V</var><sub>T</sub>)</sup> − 1)',
        legend: [
          ['I<sub>S</sub>', '[[corrente-di-saturazione]] a 25 °C: 1 nA nel diodo al silicio del laboratorio, 1 µA in quello al germanio'],
          ['V', 'tensione ai capi del diodo: positiva in diretta, negativa in inversa'],
          ['n', 'fattore di idealità, tra 1 e 2 (qui 1,7 per il silicio e 1,3 per il germanio)'],
          ['V<sub>T</sub>', 'tensione termica kT/q: circa 25,7 mV a 25 °C'],
        ],
        note: 'Con n = 1,7 ogni 0,1 V in più la corrente si moltiplica per 10: 1 mA a 0,60 V, 10 mA a 0,70 V. In inversa l\'esponenziale sparisce e resta I&nbsp;≈&nbsp;−I<sub>S</sub>.',
      },
      {
        name: 'Barriera di potenziale',
        expr: '<var>V</var><sub>bi</sub> = <var>V</var><sub>T</sub> · ln <span class="frac"><span><var>N</var><sub>A</sub> · <var>N</var><sub>D</sub></span><span><var>n</var><sub>i</sub><sup>2</sup></span></span>',
        legend: [
          ['N<sub>A</sub>, N<sub>D</sub>', 'atomi droganti per cm³ nel lato P (accettori) e nel lato N (donatori)'],
          ['n<sub>i</sub>', 'cariche libere del cristallo puro: circa 10<sup>10</sup> per cm³ nel silicio e 2·10<sup>13</sup> nel germanio, a 27 °C'],
        ],
        note: 'Con N<sub>A</sub> = N<sub>D</sub> = 10<sup>16</sup> cm<sup>−3</sup> a 27 °C: 0,71 V nel silicio e 0,32 V nel germanio.',
      },
      {
        name: 'Larghezza della zona di svuotamento',
        expr: '<var>W</var> = <span class="diodo-rad">√</span><span class="diodo-root"><span class="frac"><span>2<var>ε</var> (<var>V</var><sub>bi</sub> − <var>V</var>)</span><span><var>q</var></span></span> · (<span class="frac"><span>1</span><span><var>N</var><sub>A</sub></span></span> + <span class="frac"><span>1</span><span><var>N</var><sub>D</sub></span></span>)</span>',
        legend: [
          ['ε', 'costante dielettrica del cristallo: 11,7 volte quella del vuoto nel silicio'],
          ['q', 'carica dell\'elettrone, 1,6·10<sup>−19</sup> C'],
          ['V', 'tensione applicata: positiva in diretta, negativa in inversa'],
        ],
        note: 'Nel silicio dell\'esempio W vale 0,43 µm a riposo e 1,2 µm a −5 V. W cresce con la radice di (V<sub>bi</sub> − V): per raddoppiarla serve una barriera quattro volte più alta.',
      },
    ],
    figures: [
      {
        title: 'La giunzione all\'equilibrio',
        svg: junctionFigure(),
        caption: 'Le cariche mobili restano fuori dalla [[zona-di-svuotamento]], dove ci sono solo ioni fissi. Il campo E degli ioni respinge chi prova a passare: guarda la lacuna e l\'elettrone che rimbalzano. Sotto, il potenziale sale da P a N con un gradino alto circa 0,7 V nel silicio.',
        alt: 'Sezione di una giunzione P-N: lacune a sinistra, elettroni a destra, ioni negativi e positivi nella zona di svuotamento al centro con il campo elettrico; sotto, il grafico del potenziale che sale da P a N',
      },
      {
        title: 'Il componente, il simbolo e la valvola',
        svg: partsFigure(),
        caption: 'Il triangolo del simbolo punta nel verso in cui passa la corrente; la sbarretta è il [[catodo]] e corrisponde alla fascia stampata sul corpo. Come una valvola di non ritorno, il diodo si apre solo con la spinta nel verso giusto, e solo oltre la [[tensione-di-soglia]].',
        alt: 'Un diodo 1N4007 nero con la fascia grigia e un piccolo 1N4148 in vetro, il simbolo del diodo allineato con anodo e catodo, e una valvola di non ritorno aperta e chiusa',
      },
    ],
    history: {
      text: [
        'Che certi cristalli lascino passare la corrente meglio in un verso che nell\'altro lo scoprì nel 1874 il fisico tedesco Ferdinand Braun, appoggiando una punta di metallo su cristalli di solfuri metallici come la galena. Per quasi trent\'anni rimase una curiosità di laboratorio, senza una spiegazione.',
        'Con la radio quei cristalli trovarono un lavoro: rivelare i deboli segnali captati dall\'antenna. Jagadish Chandra Bose usò la galena, Greenleaf W. Pickard il silicio; nelle radio a galena un filo sottile, il «baffo di gatto», andava appoggiato a tentativi sul punto giusto del cristallo. Dal 1904 il cristallo ebbe un concorrente, la <a href="#storia">valvola di Fleming</a>: più stabile, ma ingombrante e calda.',
        'Negli anni Trenta, ai Bell Labs, Russell Ohl cercava rivelatori migliori per le onde radio cortissime: provò più di cento materiali e trovò che il silicio era il migliore, tanto più quanto era puro. Il 23 febbraio 1940 una barretta di silicio incrinata produsse corrente appena illuminata. Ohl e il metallurgista Jack Scaff capirono che la crepa separava due zone con impurità diverse, chiamate poi P (positiva) e N (negativa): al loro confine c\'era una barriera.',
        'Durante la seconda guerra mondiale milioni di diodi a cristallo, con un filo di metallo appoggiato su una scheggia di silicio o di germanio, finirono nei ricevitori radar degli Alleati. Nel 1949 William Shockley pubblicò la teoria della giunzione P-N con l\'equazione che porta il suo nome: la stessa che fa funzionare il laboratorio di questa pagina, e la base del transistor a giunzione.',
      ],
      events: [
        { year: 1874, title: 'La conduzione a senso unico', who: 'Ferdinand Braun', text: 'Una punta di metallo su un cristallo di galena lascia passare la corrente più facilmente in un verso che nell\'altro.' },
        { year: 1901, title: 'Il rivelatore a galena', who: 'Jagadish Chandra Bose', text: 'Chiede il brevetto di un rivelatore di onde radio a contatti di galena, concesso negli Stati Uniti nel 1904.' },
        { year: 1906, title: 'Il rivelatore al silicio', who: 'Greenleaf Whittier Pickard', text: 'Brevetta un rivelatore radio fatto da un cristallo di silicio toccato da una punta di metallo.' },
        { year: 1940, title: 'La giunzione P-N', who: 'Russell Ohl, Bell Labs', text: 'Una barretta di silicio incrinata produce corrente se illuminata: tra due zone con impurità diverse c\'è una barriera.' },
        { year: 1949, title: 'La teoria della giunzione', who: 'William Shockley', text: 'Sul Bell System Technical Journal spiega come funziona la giunzione P-N e scrive l\'equazione del diodo.' },
      ],
    },
    fun: 'La giunzione P-N è nata insieme alla cella solare. La barretta di silicio di Russell Ohl produceva corrente se la illuminavi: la stessa giunzione che fa da valvola trasforma la luce in elettricità. Il brevetto della sua cella solare, chiesto nel 1941, fu concesso nel 1946; ancora oggi ogni cella di un pannello fotovoltaico è, in fondo, un grande diodo.',
    uses: 'Negli alimentatori, dove quattro diodi messi <a href="#alimentatore">a ponte</a> raddrizzano la tensione di rete; contro la pila montata al contrario; accanto alle bobine di relè e motori, per assorbire il picco di tensione quando si spengono; nelle radio AM come rivelatore; sugli ingressi dei chip, per deviare le scariche elettrostatiche. E come termometro: molti sensori di temperatura sfruttano proprio la tensione di una giunzione, che cambia di circa 2 mV per grado.',
    links: [
      { href: '#semiconduttori', section: 'Questa sezione', title: 'Semiconduttori e drogaggio: da dove vengono lacune ed elettroni' },
      { href: '#led-zener', section: 'Questa sezione', title: 'LED e Zener: il diodo che fa luce e quello che lavora in inversa' },
      { href: '#alimentatore', section: 'Questa sezione', title: 'Il ponte di diodi che raddrizza la tensione di rete' },
      { href: '#bjt', section: 'Questa sezione', title: 'Due giunzioni vicine: il transistor bipolare' },
      { href: '../elettronica-base/index.html#ohm', section: 'Elettronica base', title: 'La legge di Ohm: la resistenza che limita la corrente' },
    ],
    glossary: {
      'giunzione-pn': { term: 'Giunzione P-N', def: 'Il confine tra una zona drogata P e una drogata N nello stesso cristallo semiconduttore. Lì nasce una barriera che lascia passare la corrente in un solo verso: è il cuore del diodo e del transistor.' },
      'zona-di-svuotamento': { term: 'Zona di svuotamento', def: 'La fascia attorno alla giunzione P-N rimasta senza cariche mobili: contiene solo ioni fissi, negativi dal lato P e positivi dal lato N. È larga meno di un micrometro, si stringe in diretta e si allarga in inversa.' },
      'barriera-di-potenziale': { term: 'Barriera di potenziale', def: 'La differenza di potenziale creata dagli ioni della zona di svuotamento, che si oppone al passaggio delle cariche. Con i drogaggi tipici vale circa 0,7 V nel silicio e 0,3 V nel germanio.' },
      'polarizzazione-diretta': { term: 'Polarizzazione diretta', def: 'Il diodo è collegato con il + sull\'anodo (lato P) e il − sul catodo (lato N): la barriera si abbassa e la corrente cresce in modo esponenziale con la tensione.' },
      'polarizzazione-inversa': { term: 'Polarizzazione inversa', def: 'Il diodo è collegato con il + sul catodo e il − sull\'anodo: la zona di svuotamento si allarga, la barriera cresce e passa solo una minuscola corrente di saturazione.' },
      'tensione-di-soglia': { term: 'Tensione di soglia', def: 'La tensione diretta oltre la quale un diodo conduce in modo apprezzabile: circa 0,6–0,7 V per il silicio e 0,2–0,3 V per il germanio. Oltre la soglia pochi centesimi di volt in più moltiplicano la corrente.' },
      'corrente-di-saturazione': { term: 'Corrente di saturazione', def: 'La piccolissima corrente, indicata con Is, che attraversa un diodo polarizzato in inversa: nanoampere nel silicio, microampere nel germanio. Cresce in fretta con la temperatura.' },
      'equazione-di-shockley': { term: 'Equazione di Shockley', def: 'La legge del diodo, I = Is·(e^(V/nVT) − 1): la corrente cresce in modo esponenziale con la tensione. VT = kT/q vale circa 25,7 mV a 25 °C; n, tra 1 e 2, dipende dal diodo.' },
      'anodo': { term: 'Anodo', def: 'Il terminale del diodo collegato al lato P, da cui entra la corrente quando il diodo conduce. Nel simbolo è il lato della base del triangolo.' },
      'catodo': { term: 'Catodo', def: 'Il terminale del diodo collegato al lato N, da cui esce la corrente quando il diodo conduce. Nel simbolo è la sbarretta; sul componente lo indica una fascia colorata.' },
    },
  }));
})();
