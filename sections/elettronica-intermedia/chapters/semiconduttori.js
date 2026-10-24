/*
 * Capitolo 1: semiconduttori e drogaggio.
 * Laboratorio "Dentro il cristallo di silicio": un reticolo piatto di atomi di silicio con i loro legami,
 * coppie elettrone-lacuna create dal calore, droganti di tipo N (fosforo) e P (boro), deriva nel campo
 * elettrico e corrente misurata dall'amperometro su una barretta lunga 1 cm con 1 mm² di sezione.
 *
 * Modello: concentrazione intrinseca n_i(T) = √(Nc·Nv)·e^(−Eg/2kT) con Nc, Nv ∝ T^1,5, calibrata su
 * n_i(300 K) = 1,0·10¹⁰ cm⁻³ (Sproul e Green, J. Appl. Phys. 70, 846, 1991; banca dati Ioffe);
 * droganti tutti ionizzati, neutralità di carica e legge di azione di massa n·p = n_i²;
 * mobilità del silicio di Arora, Hauser e Roulston (IEEE Trans. Electron Devices 29, 292, 1982).
 */
(function () {
  'use strict';

  const { s, sym, wire, si, num, clamp } = EI;

  /* ---------- modello fisico (puro, testato in tests/semiconduttori.test.js) ---------- */

  const K_B = 8.617333262e-5; // costante di Boltzmann, eV/K
  const Q = 1.602176634e-19; // carica elementare, C
  const T0 = 300; // K
  // Banda proibita a 300 K e concentrazione intrinseca a 300 K (silicio: Sproul e Green 1991; germanio: Ioffe).
  const MAT = {
    si: { Eg: 1.12, ni300: 1.0e10, atoms: 5.0e22 },
    ge: { Eg: 0.66, ni300: 2.0e13, atoms: 4.42e22 },
  };
  // μ = μmin·t^−0,57 + μd·t^b / (1 + (N / (Nref·t^2,4))^(0,88·t^−0,146)), con t = T / 300 K.
  const ARORA = {
    n: { min: 88, d: 1252, nref: 1.26e17, b: -2.33 },
    p: { min: 54.3, d: 407, nref: 2.35e17, b: -2.23 },
  };
  // La barretta del laboratorio: lunga 1 cm, sezione 1 mm² (in cm e cm²), quindi R = 100·ρ.
  const BAR = { L: 1, A: 0.01 };

  const model = {
    Q: Q,
    K_B: K_B,
    MAT: MAT,
    BAR: BAR,
    kelvin: (c) => c + 273.15,
    // Concentrazione intrinseca (elettroni liberi = lacune nel cristallo puro), in cm⁻³.
    ni: (T, mat) => {
      const m = MAT[mat || 'si'];
      return m.ni300 * Math.pow(T / T0, 1.5) * Math.exp(-m.Eg / (2 * K_B) * (1 / T - 1 / T0));
    },
    // Neutralità (n + N_A = p + N_D) e azione di massa (n·p = n_i²), con i droganti tutti ionizzati.
    carriers: (T, Nd, Na, mat) => {
      const ni = model.ni(T, mat);
      const net = (Nd || 0) - (Na || 0);
      const h = Math.abs(net) / 2;
      const maj = h + Math.sqrt(h * h + ni * ni);
      const min = ni * ni / maj;
      return net >= 0 ? { ni: ni, n: maj, p: min } : { ni: ni, n: min, p: maj };
    },
    // Mobilità di elettroni e lacune nel silicio (cm²/(V·s)) con N atomi droganti per cm³.
    mobility: (T, N) => {
      const t = T / T0;
      const alpha = 0.88 * Math.pow(t, -0.146);
      const mu = (c) => c.min * Math.pow(t, -0.57) + c.d * Math.pow(t, c.b) / (1 + Math.pow((N || 0) / (c.nref * Math.pow(t, 2.4)), alpha));
      return { n: mu(ARORA.n), p: mu(ARORA.p) };
    },
    // Conducibilità σ = q·(n·μn + p·μp), in S/cm.
    conductivity: (n, p, mn, mp) => Q * (n * mn + p * mp),
    // Il cristallo di silicio a Tc gradi Celsius: type 'puro' | 'n' | 'p', N atomi droganti per cm³.
    crystal: (Tc, type, N) => {
      const T = model.kelvin(Tc);
      const Nd = type === 'n' ? N : 0;
      const Na = type === 'p' ? N : 0;
      const c = model.carriers(T, Nd, Na);
      const mu = model.mobility(T, Nd + Na);
      const sigma = model.conductivity(c.n, c.p, mu.n, mu.p);
      return { T: T, ni: c.ni, n: c.n, p: c.p, mn: mu.n, mp: mu.p, sigma: sigma, rho: 1 / sigma };
    },
    resistance: (rho) => rho * BAR.L / BAR.A,
    current: (V, rho) => V / model.resistance(rho),
    // Velocità di deriva v = μ·E con il campo E = V / L, in cm/s.
    drift: (mu, V) => mu * V / BAR.L,
    // Quanti atomi di silicio per ogni atomo drogante (o per ogni elettrone libero).
    atomsPer: (N) => MAT.si.atoms / N,
  };

  /* ---------- numeri scritti bene ---------- */

  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sup = (k) => (k < 0 ? '⁻' : '') + String(Math.abs(k)).split('').map((d) => SUP[+d]).join('');
  const pow10 = (v) => { const k = Math.round(v); return k === 0 ? '1' : '10' + sup(k); };

  // 8,7·10⁹ oppure 75 oppure 0,50: notazione scientifica solo quando serve.
  function sci(x, sig) {
    const d = sig || 2;
    if (!isFinite(x)) return '—';
    if (x === 0) return '0';
    const ax = Math.abs(x);
    if (ax >= 0.1 && ax < 1000) return (x < 0 ? '−' : '') + num(ax, Math.max(0, d - 1 - Math.floor(Math.log10(ax))));
    let e = Math.floor(Math.log10(ax));
    let m = ax / Math.pow(10, e);
    if (Number(m.toFixed(d - 1)) >= 10) { e += 1; m /= 10; }
    return (x < 0 ? '−' : '') + num(m, d - 1) + '·10' + sup(e);
  }
  const rhoText = (r) => (r >= 1000 ? sci(r) : num(r, Math.max(0, 2 - Math.floor(Math.log10(r))))) + ' Ω·cm';
  const round2 = (v) => Number(v.toPrecision(2));
  const decimal = (v) => num(v, Number.isInteger(v) ? 0 : 1);
  // "50 milioni di atomi", "5.800 miliardi di atomi", "50.000 atomi"
  function atomsText(x) {
    if (x >= 1e13) return sci(x) + ' atomi';
    if (x >= 1e9) { const v = round2(x / 1e9); return decimal(v) + (v === 1 ? ' miliardo' : ' miliardi') + ' di atomi'; }
    if (x >= 1e6) { const v = round2(x / 1e6); return decimal(v) + (v === 1 ? ' milione' : ' milioni') + ' di atomi'; }
    return num(round2(x), 0) + ' atomi';
  }
  function timesText(f) {
    if (f < 10) return num(f, 1) + ' volte';
    if (f < 1e6) return num(round2(f), 0) + ' volte';
    return 'circa ' + sci(f) + ' volte';
  }
  const voltText = (v) => (v > 0.04 ? '+' : v < -0.04 ? '−' : '') + num(Math.abs(v), 1) + ' V';

  /* ---------- il laboratorio ---------- */

  const T_MIN = -50;
  const T_MAX = 250;
  const V_MAX = 5;
  const N_MIN = 1e12;
  const N_MAX = 1e18;
  const ROOM = model.kelvin(25);
  const I_REF = 0.05; // A: corrente di riferimento per la velocità delle cariche nei fili
  const GE_COLOR = '#b497ea';
  const HOP_T = 0.3; // durata di un salto di lacuna, s
  const CAP = 22; // cariche disegnate al massimo per tipo

  // Quante coppie disegnare: scala logaritmica, perché i numeri veri vanno da 10⁶ a 10¹⁸ per cm³.
  const pairsFor = (x) => clamp(Math.round((Math.log10(Math.max(x, 1)) - 9.5) * 2.2), 0, 12);
  const dopantsFor = (N) => clamp(Math.round(1 + 1.5 * (Math.log10(N) - 12)), 1, 10);
  // Ritmo delle rotture spontanee dei legami (eventi al secondo nel disegno).
  const genRate = (ni) => { const v = (Math.log10(ni) - 9.5) * 2.2; return v <= 0 ? 0 : 0.08 + 0.08 * v; };

  function prng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

  // Geometria del reticolo: largo (computer) o alto e stretto (telefono).
  function geometry(tall) {
    const g = tall
      ? { tall: true, W: 360, H: 522, cols: 5, rows: 6, sx: 60, sy: 50, r: 14, cx0: 30, cy0: 60, wy: 398 }
      : { tall: false, W: 700, H: 446, cols: 9, rows: 5, sx: 66, sy: 56, r: 15, cx0: 53, cy0: 56, wy: 376 };
    g.cx1 = g.cx0 + g.sx * g.cols;
    g.cy1 = g.cy0 + g.sy * g.rows;
    g.ax0 = g.cx0 + g.sx / 2;
    g.ay0 = g.cy0 + g.sy / 2;
    const rng = prng(tall ? 77 : 41);
    g.atoms = [];
    for (let j = 0; j < g.rows; j++) {
      for (let i = 0; i < g.cols; i++) g.atoms.push({ i: i, j: j, k: g.atoms.length, x: g.ax0 + i * g.sx, y: g.ay0 + j * g.sy, bonds: [] });
    }
    const at = (i, j) => (i >= 0 && j >= 0 && i < g.cols && j < g.rows ? g.atoms[j * g.cols + i] : null);
    g.bonds = [];
    g.slots = [];
    const T1 = 0.36;
    // Un legame tra due atomi ha due elettroni; verso il bordo il cristallo continua e se ne vede uno.
    function bond(a, b, dir, edge) {
      const ex = dir === 'h' ? g.sx : 0;
      const ey = dir === 'v' ? g.sy : 0;
      const sign = edge === 'L' || edge === 'T' ? -1 : 1;
      const bd = { a: a, b: b, dir: dir, edge: edge || null, slots: [], x1: a.x, y1: a.y };
      bd.x2 = b ? b.x : a.x + sign * ex / 2;
      bd.y2 = b ? b.y : a.y + sign * ey / 2;
      (b ? [T1, 1 - T1] : [T1]).forEach((t) => {
        const sl = { k: g.slots.length, bond: bd, x: a.x + sign * ex * t, y: a.y + sign * ey * t, edge: edge || null, outer: !b, hole: null, busy: false, el: null };
        bd.slots.push(sl);
        g.slots.push(sl);
      });
      a.bonds.push(bd);
      if (b) b.bonds.push(bd);
      g.bonds.push(bd);
    }
    g.atoms.forEach((a) => {
      const right = at(a.i + 1, a.j);
      const down = at(a.i, a.j + 1);
      if (right) bond(a, right, 'h');
      if (down) bond(a, down, 'v');
      if (a.i === 0) bond(a, null, 'h', 'L');
      if (a.i === g.cols - 1) bond(a, null, 'h', 'R');
      if (a.j === 0) bond(a, null, 'v', 'T');
      if (a.j === g.rows - 1) bond(a, null, 'v', 'B');
    });
    // Una lacuna salta verso i posti dei legami che condividono un atomo con il suo.
    const reach = 0.78 * Math.max(g.sx, g.sy);
    g.slots.forEach((sl) => {
      const near = [];
      [sl.bond.a, sl.bond.b].filter(Boolean).forEach((a) => a.bonds.forEach((bd) => {
        if (bd === sl.bond) return;
        bd.slots.forEach((t) => { if (!near.includes(t) && Math.hypot(t.x - sl.x, t.y - sl.y) < reach) near.push(t); });
      }));
      sl.near = near;
    });
    // Ordine dei droganti: lontano dai contatti e mai due atomi vicini, finché si può.
    const cand = g.atoms.filter((a) => a.i >= 1 && a.i <= g.cols - 2);
    for (let k = cand.length - 1; k > 0; k--) { const r = Math.floor(rng() * (k + 1)); const t = cand[k]; cand[k] = cand[r]; cand[r] = t; }
    const order = [];
    cand.forEach((a) => { if (!order.some((b) => Math.abs(b.i - a.i) + Math.abs(b.j - a.j) <= 1)) order.push(a); });
    cand.forEach((a) => { if (!order.includes(a)) order.push(a); });
    g.rank = new Map(order.map((a, k) => [a.k, k]));
    // Posizioni fisse per il movimento ridotto: elettroni negli spazi tra gli atomi, lacune nei legami.
    const free = [];
    for (let j = 0; j < g.rows - 1; j++) for (let i = 0; i < g.cols - 1; i++) free.push([g.ax0 + (i + 0.5) * g.sx, g.ay0 + (j + 0.5) * g.sy]);
    for (let k = free.length - 1; k > 0; k--) { const r = Math.floor(rng() * (k + 1)); const t = free[k]; free[k] = free[r]; free[r] = t; }
    for (let i = 0; i < g.cols - 1; i++) { free.push([g.ax0 + (i + 0.5) * g.sx, g.cy0 + 9]); free.push([g.ax0 + (i + 0.5) * g.sx, g.cy1 - 9]); }
    g.free = free;
    const hs = g.slots.filter((sl) => !sl.outer);
    for (let k = hs.length - 1; k > 0; k--) { const r = Math.floor(rng() * (k + 1)); const t = hs[k]; hs[k] = hs[r]; hs[r] = t; }
    g.holeOrder = hs;
    return g;
  }

  function mount(lab) {
    const svg = lab.svg;
    svg.classList.add('semiconduttori-svg');
    const P = EI.palette();
    const reduced = lab.reduced;
    const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 600px)') : null;

    const st = { type: 'puro', N: 1e15, Tc: 25, V: 3, shownT: 25 };
    function compute() {
      Object.assign(st, model.crystal(st.Tc, st.type, st.N));
      st.I = model.current(st.V, st.rho);
      st.maj = st.type === 'p' ? st.p : st.n;
      st.min = st.type === 'p' ? st.n : st.p;
      st.D = st.type === 'puro' ? 0 : dopantsFor(st.N);
      if (st.type === 'puro') { st.tE = pairsFor(st.ni); st.tH = st.tE; }
      else if (st.type === 'n') { st.tH = pairsFor(st.p); st.tE = st.D + st.tH; }
      else { st.tE = pairsFor(st.n); st.tH = st.D + st.tE; }
      st.tE = Math.min(st.tE, CAP);
      st.tH = Math.min(st.tH, CAP);
      // movimento nel disegno: agitazione termica ∝ √T, deriva ∝ mobilità e tensione (molto esagerata)
      const mu0 = model.mobility(st.T, 0);
      st.vth = 46 * Math.sqrt(st.T / T0);
      st.vdE = clamp(-st.V * 10 * mu0.n / 1340, -75, 75);
      st.bias = clamp(st.V * 0.45 * mu0.p / 461, -3, 3);
      st.hopRate = 1.5 * Math.sqrt(st.T / T0);
      st.gen = genRate(st.ni);
    }
    compute();

    let G = null;
    const L = {};
    const sim = { e: [], h: [], fx: [], cool: 0, excess: 0, dopCool: 0, spont: 1.5, rng: prng(1833) };
    const R = () => sim.rng();
    const expRand = (mean) => -Math.log(1 - R() * 0.999) * mean;

    /* --- disegno --- */

    function build(tall) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      Object.values(L).forEach((x) => { if (x && x.g && x.g.remove) x.g.remove(); });
      sim.e = [];
      sim.h = [];
      sim.fx = [];
      G = geometry(tall);
      lab.view(G.W, G.H);
      svg.classList.toggle('tall', tall);
      const layer = () => s('g', null, svg);
      L.bg = layer();
      L.circuit = layer();
      L.bonds = layer();
      L.slots = layer();
      L.atoms = layer();
      L.holes = layer();
      L.hops = layer();
      L.elec = layer();
      L.drift = layer();
      L.fx = layer();
      L.text = layer();
      const cw = G.cx1 - G.cx0;
      const ch = G.cy1 - G.cy0;
      s('rect', { x: G.cx0, y: G.cy0, width: cw, height: ch, rx: 6, class: 'semiconduttori-crystal' }, L.bg);
      L.zone = s('rect', { x: G.cx0, y: G.cy0, width: cw, height: ch, rx: 6, class: 'ei-zone-n semiconduttori-zone', style: 'opacity:0' }, L.bg);
      L.heat = s('rect', { x: G.cx0, y: G.cy0, width: cw, height: ch, rx: 6, class: 'semiconduttori-heat', style: 'opacity:0' }, L.bg);

      G.bonds.forEach((bd) => s('line', { x1: bd.x1, y1: bd.y1, x2: bd.x2, y2: bd.y2, class: 'ei-bond' + (bd.b ? '' : ' semiconduttori-stub') }, L.bonds));
      G.slots.forEach((sl) => { sl.el = s('circle', { cx: sl.x, cy: sl.y, r: 2.6, class: 'semiconduttori-be' }, L.slots); });
      const rng = prng(7);
      G.atoms.forEach((a) => {
        a.g = s('g', { class: 'semiconduttori-atom', transform: 'translate(' + a.x + ' ' + a.y + ')' }, L.atoms);
        a.c = s('circle', { r: G.r, class: 'ei-atom' }, a.g);
        a.t = s('text', { y: 0.5, class: 'semiconduttori-atom-label', 'text-anchor': 'middle', 'dominant-baseline': 'central', text: 'Si' }, a.g);
        a.badge = s('g', { class: 'semiconduttori-badge plus', transform: 'translate(' + (G.r * 0.78).toFixed(1) + ' ' + (-G.r * 0.78).toFixed(1) + ')', style: 'opacity:0' }, a.g);
        s('circle', { r: 5.8 }, a.badge);
        a.sign = s('text', { y: 0.6, 'text-anchor': 'middle', 'dominant-baseline': 'central', text: '+' }, a.badge);
        a.role = 'si';
        a.pop = 0;
        a.badgeOn = false;
        a.badgeA = 0;
        a.badgeDelay = 0;
        a.ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28, rng() * 6.28];
        a.w = [2.6 + rng() * 1.6, 4.1 + rng() * 1.8, 2.8 + rng() * 1.6, 4.3 + rng() * 1.8];
      });

      // contatti metallici e circuito esterno: pila e amperometro
      const pw = 16;
      L.cL = s('rect', { x: G.cx0 - pw, y: G.cy0 - 4, width: pw, height: ch + 8, rx: 3, class: 'semiconduttori-contact' }, L.circuit);
      L.cR = s('rect', { x: G.cx1, y: G.cy0 - 4, width: pw, height: ch + 8, rx: 3, class: 'semiconduttori-contact' }, L.circuit);
      const xl = G.cx0 - pw / 2;
      const xr = G.cx1 + pw / 2;
      const yb = G.cy1 + 4;
      const bx = tall ? 70 : 196;
      const mx = tall ? 222 : 446;
      G.bx = bx;
      G.mx = mx;
      L.wL = wire(L.circuit, [[xl, yb], [xl, G.wy], [bx, G.wy]]);
      L.wM = wire(L.circuit, [[bx + 60, G.wy], [mx, G.wy]]);
      L.wR = wire(L.circuit, [[mx + 56, G.wy], [xr, G.wy], [xr, yb]]);
      L.batt = null;
      L.battSign = 0;
      sym.meter(L.circuit, { x: mx, y: G.wy, len: 56, kind: 'A' });
      L.flows = [new EI.Flow(L.circuit, L.wL), new EI.Flow(L.circuit, L.wM), new EI.Flow(L.circuit, L.wR)];
      L.vTxt = s('text', { x: bx + 30, y: G.wy + 27, class: 'semiconduttori-reading v', 'text-anchor': 'middle' }, L.text);
      L.iTxt = s('text', { x: mx + 28, y: G.wy + 27, class: 'semiconduttori-reading', 'text-anchor': 'middle' }, L.text);
      L.sL = s('text', { x: xl, y: G.cy0 - 10, class: 'semiconduttori-sign', 'text-anchor': 'middle' }, L.text);
      L.sR = s('text', { x: xr, y: G.cy0 - 10, class: 'semiconduttori-sign', 'text-anchor': 'middle' }, L.text);

      // campo elettrico: una riga sopra il cristallo, tra i due contatti
      L.field = s('g', { class: 'semiconduttori-fieldg', style: 'opacity:0' }, L.text);
      L.fieldLine = s('path', { class: 'semiconduttori-field' }, L.field);
      L.fieldHead = s('path', { class: 'semiconduttori-field-head' }, L.field);
      s('text', { class: 'semiconduttori-field-label', 'text-anchor': 'middle', x: (G.cx0 + G.cx1) / 2, y: G.cy0 - 21, text: 'campo elettrico E' }, L.field);
      L.fieldSign = null;

      // intestazione, legenda e nota sulla scala
      if (tall) {
        L.head = s('text', { x: 14, y: 20, class: 'semiconduttori-head' }, L.text);
        L.headA = L.head;
        L.headB = null;
        L.temp = s('text', { x: G.W - 14, y: 20, class: 'semiconduttori-head t', 'text-anchor': 'end' }, L.text);
      } else {
        L.head = s('text', { x: G.cx0 - 16, y: 18, class: 'semiconduttori-head' }, L.text);
        L.headA = s('tspan', null, L.head);
        L.headB = s('tspan', { class: 't' }, L.head);
        L.temp = null;
      }
      L.legend = s('g', null, L.text);
      L.legendType = null;
      L.note = s('text', { x: G.W / 2, y: tall ? G.H - 24 : G.H - 9, class: 'semiconduttori-note', 'text-anchor': 'middle' }, L.text);
      L.note1 = s('tspan', null, L.note);
      L.note2 = tall ? s('tspan', { x: G.W / 2, dy: 15 }, L.note) : null;
      staticKey = '';
    }

    function drawBattery() {
      const sign = st.V < -0.04 ? -1 : 1;
      if (L.batt && sign === L.battSign) return;
      if (L.batt) L.batt.g.remove();
      L.battSign = sign;
      // il polo + (tratto lungo) è sempre dalla parte del contatto positivo
      L.batt = sym.source(L.circuit, sign > 0 ? { x: G.bx, y: G.wy, len: 60, kind: 'dc' } : { x: G.bx + 60, y: G.wy, rot: 180, len: 60, kind: 'dc' });
    }

    function drawLegend() {
      if (L.legendType === st.type) return;
      L.legendType = st.type;
      L.legend.innerHTML = '';
      const items = [['e', 'elettrone libero'], ['h', 'lacuna']];
      if (st.type === 'n') items.push(['n', 'ione donatore (fisso)']);
      if (st.type === 'p') items.push(['p', 'ione accettore (fisso)']);
      const icon = (kind, x, y) => {
        if (kind === 'e') s('circle', { cx: x, cy: y, r: 3.6, class: 'ei-e' }, L.legend);
        else if (kind === 'h') s('circle', { cx: x, cy: y, r: 4.4, class: 'ei-h semiconduttori-h' }, L.legend);
        else {
          s('circle', { cx: x, cy: y, r: 6.5, class: kind === 'n' ? 'ei-ion-n' : 'ei-ion-p' }, L.legend);
          s('text', { x: x, y: y + 0.6, class: 'semiconduttori-legend-sign', 'text-anchor': 'middle', 'dominant-baseline': 'central', text: kind === 'n' ? '+' : '−' }, L.legend);
        }
      };
      const CW = 5.6; // larghezza media di un carattere della legenda
      if (G.tall) {
        const y1 = G.wy + 52;
        items.forEach((it, k) => {
          const x = k % 2 === 0 ? 22 : 200;
          const y = y1 + Math.floor(k / 2) * 21;
          icon(it[0], x, y);
          s('text', { x: x + 12, y: y + 4.2, class: 'semiconduttori-legend', text: it[1] }, L.legend);
        });
      } else {
        const widths = items.map((it) => 15 + it[1].length * CW);
        let x = G.W - 12 - widths.reduce((a, b) => a + b, 0) - (items.length - 1) * 16;
        items.forEach((it, k) => {
          icon(it[0], x + 5, 14);
          s('text', { x: x + 15, y: 17.6, class: 'semiconduttori-legend', text: it[1] }, L.legend);
          x += widths[k] + 16;
        });
      }
    }

    /* --- cariche --- */

    const slotFree = (sl) => !sl.hole && !sl.busy;
    function showSlot(sl, on) { sl.el.style.opacity = on ? '' : '0'; }

    function addFlash(x, y, kind, r1, dur) {
      if (reduced) return;
      const el = s('circle', { cx: x, cy: y, r: 1, class: 'semiconduttori-flash ' + kind }, L.fx);
      sim.fx.push({ el: el, t: 0, dur: dur || 0.45, r1: r1 || 14 });
    }

    function newElectron(x, y, vx, vy, born) {
      const el = s('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 4, class: 'ei-e' }, L.elec);
      const e = { el: el, x: x, y: y, vx: vx, vy: vy, scat: born ? 0.4 : 0.1 + R() * 0.3, mode: born ? 'born' : 'free', t: 0, a: 1, age: 0, target: null };
      sim.e.push(e);
      return e;
    }
    function killElectron(e) {
      e.dead = true;
      e.el.remove();
    }

    function newHole(sl, born, origin) {
      const el = s('circle', { cx: sl.x, cy: sl.y, r: 4.8, class: 'ei-h semiconduttori-h' }, L.holes);
      const hp = s('circle', { r: 2.6, class: 'semiconduttori-be hop', style: 'opacity:0' }, L.hops);
      const h = { el: el, hp: hp, slot: sl, to: null, k: 0, x: sl.x, y: sl.y, timer: expRand(1 / st.hopRate), mode: born ? 'born' : 'live', t: 0, a: 1, age: 0, claimed: false, origin: origin == null ? -1 : origin };
      sl.hole = h;
      showSlot(sl, false);
      sim.h.push(h);
      return h;
    }
    function killHole(h) {
      h.dead = true;
      h.el.remove();
      h.hp.remove();
      if (h.slot && h.slot.hole === h) { h.slot.hole = null; showSlot(h.slot, true); }
      if (h.to) { h.to.busy = false; showSlot(h.to, true); h.to = null; }
      if (h.origin >= 0 && G.atoms[h.origin]) G.atoms[h.origin].badgeOn = true;
    }

    // Posizione casuale libera, lontana dai nuclei degli atomi.
    function freeSpot() {
      for (let k = 0; k < 30; k++) {
        const x = G.cx0 + 8 + R() * (G.cx1 - G.cx0 - 16);
        const y = G.cy0 + 8 + R() * (G.cy1 - G.cy0 - 16);
        const a = nearestAtom(x, y);
        if (Math.hypot(x - a.x, y - a.y) > G.r + 6) return [x, y];
      }
      return [G.ax0 + G.sx / 2, G.ay0 + G.sy / 2];
    }
    function nearestAtom(x, y) {
      const i = clamp(Math.round((x - G.ax0) / G.sx), 0, G.cols - 1);
      const j = clamp(Math.round((y - G.ay0) / G.sy), 0, G.rows - 1);
      return G.atoms[j * G.cols + i];
    }

    // Il calore rompe un legame: un elettrone diventa libero e al suo posto resta una lacuna.
    function generate() {
      const pool = G.slots.filter((sl) => !sl.outer && slotFree(sl));
      if (!pool.length) return false;
      const sl = pool[Math.floor(R() * pool.length)];
      newHole(sl, true);
      const side = R() < 0.5 ? -1 : 1;
      const ang = (sl.bond.dir === 'h' ? side * Math.PI / 2 : (side < 0 ? Math.PI : 0)) + (R() - 0.5) * 0.9;
      const sp = st.vth * 2.2;
      newElectron(sl.x, sl.y, Math.cos(ang) * sp, Math.sin(ang) * sp, true);
      addFlash(sl.x, sl.y, 'gen', 16, 0.5);
      return true;
    }

    // Un elettrone libero cade nella lacuna più vecchia: la coppia sparisce e cede energia (calore).
    function recombine() {
      const hs = sim.h.filter((h) => h.mode === 'live' && !h.claimed && !h.to);
      if (!hs.length) return false;
      hs.sort((a, b) => b.age - a.age);
      const h = hs[0];
      let best = null;
      let bd = 1e9;
      sim.e.forEach((e) => {
        if (e.mode !== 'free') return;
        const d = Math.hypot(e.x - h.x, e.y - h.y);
        if (d < bd) { bd = d; best = e; }
      });
      if (!best) return false;
      h.claimed = true;
      best.mode = 'recomb';
      best.target = h;
      return true;
    }
    function finishRecomb(e, h) {
      const sl = h.slot;
      killElectron(e);
      killHole(h);
      addFlash(sl.x, sl.y, 'rec', 13, 0.55);
    }

    function emitFromDonor(a) {
      const ang = R() * Math.PI * 2;
      const x = a.x + Math.cos(ang) * (G.r + 4);
      const y = a.y + Math.sin(ang) * (G.r + 4);
      newElectron(x, y, Math.cos(ang) * st.vth * 2, Math.sin(ang) * st.vth * 2, true);
      addFlash(a.x, a.y, 'ion', G.r + 9, 0.5);
      a.badgeDelay = 0.25;
    }
    function holeFromAcceptor(a) {
      const pool = [];
      a.bonds.forEach((bd) => bd.slots.forEach((t) => { if (slotFree(t) && Math.hypot(t.x - a.x, t.y - a.y) < Math.max(G.sx, G.sy) * 0.5) pool.push(t); }));
      if (!pool.length) { a.badgeOn = true; return; }
      newHole(pool[Math.floor(R() * pool.length)], true, a.k);
      addFlash(a.x, a.y, 'ion-p', G.r + 9, 0.5);
      a.badgeDelay = 1.6;
    }

    function roleFor(a) {
      if (st.type === 'puro') return 'si';
      const r = G.rank.get(a.k);
      if (r == null || r >= st.D) return 'si';
      return st.type === 'n' ? 'donor' : 'acceptor';
    }
    function setRole(a, role, animate) {
      a.role = role;
      a.c.setAttribute('class', role === 'donor' ? 'ei-ion-n' : role === 'acceptor' ? 'ei-ion-p' : 'ei-atom');
      a.g.setAttribute('class', 'semiconduttori-atom' + (role === 'si' ? '' : ' ' + role));
      a.t.textContent = role === 'donor' ? 'P' : role === 'acceptor' ? 'B' : 'Si';
      a.sign.textContent = role === 'donor' ? '+' : '−';
      a.badge.setAttribute('class', 'semiconduttori-badge ' + (role === 'acceptor' ? 'minus' : 'plus'));
      a.badgeOn = !animate && role !== 'si';
      a.badgeDelay = 0;
      if (animate) a.pop = 1;
      if (!animate) { a.badgeA = a.badgeOn ? 1 : 0; a.badge.style.opacity = String(a.badgeA); }
    }

    function clearCarriers() {
      sim.e.forEach((e) => e.el.remove());
      sim.h.forEach((h) => { h.el.remove(); h.hp.remove(); });
      sim.fx.forEach((f) => f.el.remove());
      sim.e = [];
      sim.h = [];
      sim.fx = [];
      G.slots.forEach((sl) => { sl.hole = null; sl.busy = false; showSlot(sl, true); });
      L.drift.innerHTML = '';
    }

    // Stato iniziale senza animazione: droganti, elettroni e lacune già al loro posto.
    function settle() {
      clearCarriers();
      G.atoms.forEach((a) => setRole(a, roleFor(a), false));
      for (let k = 0; k < st.tE; k++) {
        const p = freeSpot();
        const ang = R() * Math.PI * 2;
        newElectron(p[0], p[1], Math.cos(ang) * st.vth, Math.sin(ang) * st.vth, false);
      }
      let placed = 0;
      for (let m = 0; m < G.holeOrder.length && placed < st.tH; m++) {
        const sl = G.holeOrder[m];
        if (!slotFree(sl)) continue;
        newHole(sl, false);
        placed += 1;
      }
      sim.h.forEach((h) => { h.age = R() * 3; });
      sim.cool = 0.3;
      sim.excess = 0;
      sim.spont = 1 + R() * 2;
    }

    // Movimento ridotto: disegno fermo, con frecce che indicano dove spinge la tensione.
    let staticKey = '';
    function staticSync() {
      const key = [G.tall, st.type, st.D, st.tE, st.tH, Math.abs(st.V) < 0.05 ? 0 : Math.sign(st.V)].join('|');
      if (key === staticKey) return;
      staticKey = key;
      clearCarriers();
      G.atoms.forEach((a) => setRole(a, roleFor(a), false));
      for (let k = 0; k < st.tE && k < G.free.length; k++) newElectron(G.free[k][0], G.free[k][1], 0, 0, false);
      let placed = 0;
      for (let m = 0; m < G.holeOrder.length && placed < st.tH; m++) {
        const sl = G.holeOrder[m];
        if (!slotFree(sl)) continue;
        newHole(sl, false);
        placed += 1;
      }
      if (Math.abs(st.V) >= 0.05) {
        const dirE = st.V > 0 ? -1 : 1; // gli elettroni vanno verso il polo +
        const arrow = (x, y, d, cls) => s('path', { d: 'M' + (x + d * 7) + ' ' + y + 'h' + (d * 9) + 'm0 0l' + (-d * 3.5) + ' -3.5m' + (d * 3.5) + ' 3.5l' + (-d * 3.5) + ' 3.5', class: 'semiconduttori-drift ' + cls }, L.drift);
        sim.e.forEach((e) => arrow(e.x, e.y, dirE, 'e'));
        sim.h.forEach((h) => arrow(h.x, h.y, -dirE, 'h'));
      }
    }

    function count() {
      let E = 0;
      let H = 0;
      sim.e.forEach((e) => { if (e.mode === 'free' || e.mode === 'born') E += 1; });
      sim.h.forEach((h) => { if (!h.claimed && h.mode !== 'fade') H += 1; });
      return [E, H];
    }

    function step(dt) {
      if (dt <= 0) return;
      // 1. droganti: un atomo alla volta cambia ruolo
      sim.dopCool -= dt;
      if (sim.dopCool <= 0) {
        let change = G.atoms.find((a) => a.role !== 'si' && roleFor(a) !== a.role);
        if (!change) change = G.atoms.slice().sort((a, b) => (G.rank.get(a.k) ?? 1e9) - (G.rank.get(b.k) ?? 1e9)).find((a) => roleFor(a) !== a.role);
        if (change) {
          const role = roleFor(change);
          setRole(change, role, true);
          if (role === 'donor') emitFromDonor(change);
          if (role === 'acceptor') holeFromAcceptor(change);
          sim.dopCool = 0.09;
        }
      }
      // 2. conteggi: generazione, ricombinazione, cariche in più o in meno
      const [E, H] = count();
      const dE = st.tE - E;
      const dH = st.tH - H;
      sim.cool -= dt;
      if (dE < 0 && dH < 0) sim.excess += dt; else sim.excess = 0;
      if (sim.cool <= 0) {
        if (dE > 0 && dH > 0) { generate(); sim.cool = 0.11; }
        else if (dE < 0 && dH < 0) { if (sim.excess > 0.6 && recombine()) sim.cool = 0.13; }
        else if (dE > 0) {
          const donors = G.atoms.filter((a) => a.role === 'donor');
          if (donors.length) emitFromDonor(donors[Math.floor(R() * donors.length)]);
          else { const p = freeSpot(); newElectron(p[0], p[1], 0, 0, true); }
          sim.cool = 0.12;
        } else if (dH > 0) {
          const acc = G.atoms.filter((a) => a.role === 'acceptor');
          if (acc.length) holeFromAcceptor(acc[Math.floor(R() * acc.length)]);
          else { const pool = G.slots.filter((sl) => !sl.outer && slotFree(sl)); if (pool.length) newHole(pool[Math.floor(R() * pool.length)], true); }
          sim.cool = 0.12;
        } else if (dE < 0) {
          const e = sim.e.find((x) => x.mode === 'free');
          if (e) { e.mode = 'fade'; e.t = 0; }
          sim.cool = 0.1;
        } else if (dH < 0) {
          const h = sim.h.find((x) => x.mode === 'live' && !x.claimed && !x.to);
          if (h) { h.mode = 'fade'; h.t = 0; }
          sim.cool = 0.1;
        }
      }
      // 3. equilibrio dinamico: ogni tanto un legame si rompe anche quando i conti tornano
      sim.spont -= dt;
      if (sim.spont <= 0) {
        if (st.gen > 0 && dE >= 0 && dH >= 0 && E < CAP && H < CAP) generate();
        sim.spont = st.gen > 0 ? expRand(1 / st.gen) : 1;
      }
      // 4. elettroni liberi: agitazione termica (urti casuali) + deriva verso il polo +
      const vth = st.vth;
      const vd = st.vdE;
      sim.e.forEach((e) => {
        e.age += dt;
        if (e.mode === 'recomb') {
          const h = e.target;
          if (!h || h.dead) { e.mode = 'free'; e.target = null; return; }
          const dx = h.x - e.x;
          const dy = h.y - e.y;
          const d = Math.hypot(dx, dy);
          const stp = 170 * dt;
          if (d <= stp + 1.5) finishRecomb(e, h);
          else { e.x += dx / d * stp; e.y += dy / d * stp; }
          return;
        }
        if (e.mode === 'fade') {
          e.t += dt;
          e.a = 1 - e.t / 0.4;
          if (e.a <= 0) { killElectron(e); return; }
        }
        if (e.mode === 'born') {
          e.t += dt;
          if (e.t > 0.35) { e.mode = 'free'; e.t = 0; }
        } else {
          e.scat -= dt;
          if (e.scat <= 0) {
            const ang = R() * Math.PI * 2;
            const sp = vth * (0.55 + 0.9 * R());
            e.vx = Math.cos(ang) * sp;
            e.vy = Math.sin(ang) * sp;
            e.scat = expRand(0.36);
          }
        }
        e.x += (e.vx + (e.mode === 'born' ? 0 : vd)) * dt;
        e.y += e.vy * dt;
        // gli elettroni girano attorno ai nuclei degli atomi
        const a = nearestAtom(e.x, e.y);
        const ax = e.x - a.x;
        const ay = e.y - a.y;
        const da = Math.hypot(ax, ay);
        const rr = G.r + 4.5;
        if (da < rr && da > 0.01) {
          const nx = ax / da;
          const ny = ay / da;
          e.x = a.x + nx * rr;
          e.y = a.y + ny * rr;
          const vn = e.vx * nx + e.vy * ny;
          if (vn < 0) { e.vx -= 2 * vn * nx; e.vy -= 2 * vn * ny; }
        }
        const top = G.cy0 + 5;
        const bot = G.cy1 - 5;
        if (e.y < top) { e.y = top; e.vy = Math.abs(e.vy); }
        if (e.y > bot) { e.y = bot; e.vy = -Math.abs(e.vy); }
        const left = G.cx0 + 3;
        const right = G.cx1 - 3;
        // al contatto positivo l'elettrone esce nel metallo; dall'altro contatto ne entra uno nuovo
        if (e.x < left) {
          if (vd < -0.5) { e.x = right - 1; e.vx = -Math.abs(e.vx); }
          else { e.x = left; e.vx = Math.abs(e.vx); }
        } else if (e.x > right) {
          if (vd > 0.5) { e.x = left + 1; e.vx = Math.abs(e.vx); }
          else { e.x = right; e.vx = -Math.abs(e.vx); }
        }
      });
      sim.e = sim.e.filter((e) => !e.dead);
      // 5. lacune: un elettrone del legame vicino salta nel posto vuoto, e il vuoto si sposta
      sim.h.forEach((h) => stepHole(h, dt));
      sim.h = sim.h.filter((h) => !h.dead);
      // 6. lampi
      sim.fx.forEach((f) => {
        f.t += dt;
        const k = f.t / f.dur;
        if (k >= 1) { f.el.remove(); f.dead = true; return; }
        f.el.setAttribute('r', (2 + (f.r1 - 2) * ease(Math.min(1, k * 1.4))).toFixed(1));
        f.el.style.opacity = ((1 - k) * 0.85).toFixed(2);
      });
      sim.fx = sim.fx.filter((f) => !f.dead);
    }

    function stepHole(h, dt) {
      h.age += dt;
      if (h.mode === 'born') { h.t += dt; if (h.t > 0.3) { h.mode = 'live'; h.t = 0; } }
      if (h.mode === 'fade') {
        h.t += dt;
        h.a = 1 - h.t / 0.4;
        if (h.a <= 0) killHole(h);
        return;
      }
      if (h.mode === 'exit') {
        h.t += dt;
        const k = clamp(h.t / 0.3, 0, 1);
        h.x = h.x0 + (h.ex - h.x0) * k;
        h.a = 1 - k;
        if (k >= 1) {
          // rientra dal contatto opposto: lì il metallo porta via un elettrone da un legame
          const side = h.ex > G.cx1 ? 'L' : 'R';
          const pool = G.slots.filter((t) => t.outer && t.edge === side && slotFree(t));
          if (!pool.length) { killHole(h); return; }
          const t = pool[Math.floor(R() * pool.length)];
          h.slot = t;
          t.hole = h;
          showSlot(t, false);
          h.mode = 'enter';
          h.t = 0;
          h.x0 = side === 'L' ? G.cx0 - 4 : G.cx1 + 4;
          h.y = t.y;
        }
        return;
      }
      if (h.mode === 'enter') {
        h.t += dt;
        const k = clamp(h.t / 0.3, 0, 1);
        h.x = h.x0 + (h.slot.x - h.x0) * k;
        h.y = h.slot.y;
        h.a = k;
        if (k >= 1) { h.mode = 'live'; h.a = 1; }
        return;
      }
      if (h.to) {
        h.k += dt / HOP_T;
        const k = ease(clamp(h.k, 0, 1));
        h.x = h.slot.x + (h.to.x - h.slot.x) * k;
        h.y = h.slot.y + (h.to.y - h.slot.y) * k;
        h.hp.setAttribute('cx', (h.to.x + (h.slot.x - h.to.x) * k).toFixed(1));
        h.hp.setAttribute('cy', (h.to.y + (h.slot.y - h.to.y) * k).toFixed(1));
        h.hp.style.opacity = '1';
        if (h.k >= 1) {
          const from = h.slot;
          from.hole = null;
          showSlot(from, true);
          h.to.busy = false;
          h.to.hole = h;
          h.slot = h.to;
          h.to = null;
          h.x = h.slot.x;
          h.y = h.slot.y;
          h.hp.style.opacity = '0';
          if (h.origin >= 0) { G.atoms[h.origin].badgeOn = true; h.origin = -1; }
        }
        return;
      }
      h.x = h.slot.x;
      h.y = h.slot.y;
      if (h.claimed) return;
      h.timer -= dt;
      if (h.timer > 0) return;
      h.timer = expRand(1 / st.hopRate);
      const sl = h.slot;
      const b = st.bias; // > 0: le lacune vanno verso destra, cioè verso il polo −
      const cands = [];
      let sum = 0;
      sl.near.forEach((t) => {
        if (!slotFree(t)) return;
        const w = Math.exp(b * (t.x - sl.x) / (G.sx / 2));
        cands.push([t, w]);
        sum += w;
      });
      if (Math.abs(b) > 0.02 && sl.edge === (b > 0 ? 'R' : 'L')) {
        const w = Math.exp(Math.abs(b)) * 0.8;
        cands.push(['exit', w]);
        sum += w;
      }
      if (!cands.length) return;
      let r = R() * sum;
      let pick = cands[cands.length - 1][0];
      for (const c of cands) { r -= c[1]; if (r <= 0) { pick = c[0]; break; } }
      if (pick === 'exit') {
        // al contatto negativo un elettrone del metallo riempie la lacuna
        sl.hole = null;
        showSlot(sl, true);
        h.mode = 'exit';
        h.t = 0;
        h.x0 = sl.x;
        h.ex = b > 0 ? G.cx1 + 4 : G.cx0 - 4;
        if (h.origin >= 0) { G.atoms[h.origin].badgeOn = true; h.origin = -1; }
        return;
      }
      h.to = pick;
      h.k = 0;
      pick.busy = true;
      showSlot(pick, false);
    }

    /* --- aggiornamento del disegno --- */

    function render(dt, t) {
      const amp = clamp(0.2 + 1.2 * (st.T - 223) / 300, 0.15, 1.45);
      G.atoms.forEach((a) => {
        if (a.badgeDelay > 0 && dt > 0) { a.badgeDelay -= dt; if (a.badgeDelay <= 0) a.badgeOn = true; }
        const want = a.role !== 'si' && a.badgeOn ? 1 : 0;
        a.badgeA = reduced ? want : EI.approach(a.badgeA, want, dt, 12);
        a.badge.style.opacity = a.badgeA.toFixed(2);
        if (dt > 0) a.pop = Math.max(0, a.pop - dt * 3.2);
        const sc = 1 + 0.32 * Math.sin(a.pop * Math.PI);
        let dx = 0;
        let dy = 0;
        if (!reduced) {
          dx = amp * (Math.sin(a.w[0] * t + a.ph[0]) * 0.7 + Math.sin(a.w[1] * t + a.ph[1]) * 0.45);
          dy = amp * (Math.sin(a.w[2] * t + a.ph[2]) * 0.7 + Math.sin(a.w[3] * t + a.ph[3]) * 0.45);
        }
        a.g.setAttribute('transform', 'translate(' + (a.x + dx).toFixed(2) + ' ' + (a.y + dy).toFixed(2) + ')' + (sc > 1.001 ? ' scale(' + sc.toFixed(3) + ')' : ''));
      });
      sim.e.forEach((e) => {
        e.el.setAttribute('cx', e.x.toFixed(1));
        e.el.setAttribute('cy', e.y.toFixed(1));
        const born = e.mode === 'born' ? 1 - e.t / 0.35 : 0;
        e.el.setAttribute('r', (4 * (1 + 0.7 * born)).toFixed(2));
        e.el.style.opacity = e.mode === 'fade' ? Math.max(0, e.a).toFixed(2) : '';
      });
      sim.h.forEach((h) => {
        h.el.setAttribute('cx', h.x.toFixed(1));
        h.el.setAttribute('cy', h.y.toFixed(1));
        const k = h.mode === 'born' ? clamp(h.t / 0.3, 0, 1) : 1;
        h.el.setAttribute('r', (4.8 * (0.3 + 0.7 * ease(k)) + (h.mode === 'born' ? 2.4 * (1 - k) : 0)).toFixed(2));
        h.el.style.opacity = h.mode === 'fade' || h.mode === 'exit' || h.mode === 'enter' ? Math.max(0, h.a).toFixed(2) : '';
      });

      // temperatura: il cristallo si tinge di freddo o di caldo
      const Tc = st.shownT;
      const heat = L.heat;
      if (Tc >= 25) { heat.style.fill = '#ff8a3d'; heat.style.opacity = (0.16 * (Tc - 25) / 225).toFixed(3); }
      else { heat.style.fill = '#5cc8ff'; heat.style.opacity = (0.12 * (25 - Tc) / 75).toFixed(3); }
      L.zone.setAttribute('class', (st.type === 'p' ? 'ei-zone-p' : 'ei-zone-n') + ' semiconduttori-zone');
      L.zone.style.opacity = st.type === 'puro' ? '0' : '1';
    }

    // Scrive nel DOM solo quando il valore cambia davvero (il ciclo gira a ogni fotogramma).
    function setText(el, str) { if (el.semiTxt !== str) { el.semiTxt = str; el.textContent = str; } }
    function setAttr(el, k, v) { const key = 'semi_' + k; if (el[key] !== v) { el[key] = v; el.setAttribute(k, v); } }
    function setStyle(el, k, v) { const key = 'semiS_' + k; if (el[key] !== v) { el[key] = v; el.style[k] = v; } }

    function updateCircuit(dt) {
      drawBattery();
      const vL = st.V > 0 ? st.V : 0;
      const vR = st.V < 0 ? -st.V : 0;
      const cl = EI.vcolor(vL, V_MAX);
      const cr = EI.vcolor(vR, V_MAX);
      setStyle(L.wL, 'stroke', cl);
      setStyle(L.wM, 'stroke', cr);
      setStyle(L.wR, 'stroke', cr);
      setStyle(L.cL, 'stroke', cl);
      setStyle(L.cR, 'stroke', cr);
      setText(L.sL, st.V > 0.04 ? '+' : st.V < -0.04 ? '−' : '');
      setText(L.sR, st.V < -0.04 ? '+' : st.V > 0.04 ? '−' : '');
      setStyle(L.sL, 'fill', st.V > 0.04 ? P.t1 : P.text);
      setStyle(L.sR, 'fill', st.V < -0.04 ? P.t1 : P.text);
      // corrente nei fili (verso convenzionale): esce dal polo + e rientra dal polo −
      const sp = EI.speedFor(st.I, I_REF);
      L.flows.forEach((f) => { f.set(-sp); f.step(dt); });
      setText(L.vTxt, 'V = ' + voltText(st.V));
      setText(L.iTxt, 'I = ' + si(Math.abs(st.I), 'A'));
      // campo elettrico: dal polo + al polo −
      const fs = Math.abs(st.V) < 0.05 ? 0 : Math.sign(st.V);
      setStyle(L.field, 'opacity', (clamp(Math.abs(st.V) / 2, 0, 1) * 0.95).toFixed(2));
      if (fs !== L.fieldSign && fs !== 0) {
        L.fieldSign = fs;
        const y = G.cy0 - 12;
        const x0 = G.cx0 + (G.tall ? 26 : 34);
        const x1 = G.cx1 - (G.tall ? 26 : 34);
        const xa = fs < 0 ? x1 : x0;
        const xb = fs < 0 ? x0 : x1;
        L.fieldLine.setAttribute('d', 'M' + xa + ' ' + y + 'H' + (xb - fs * 8));
        L.fieldHead.setAttribute('d', 'M' + xb + ' ' + y + 'l' + (-fs * 10) + ' -5v10z');
      }
      // intestazione
      const typeTxt = st.type === 'puro' ? 'SILICIO PURO' : st.type === 'n' ? 'TIPO N · FOSFORO' : 'TIPO P · BORO';
      const tTxt = num(st.Tc, 0) + ' °C';
      setText(L.headA, typeTxt);
      if (L.temp) setText(L.temp, tTxt);
      else setText(L.headB, '  ·  ' + tTxt);
      setAttr(L.head, 'class', 'semiconduttori-head ' + st.type);
      drawLegend();
      const exact = st.type === 'puro'
        ? '1 elettrone libero ogni ' + atomsText(model.atomsPer(st.ni))
        : '1 atomo di ' + (st.type === 'n' ? 'fosforo' : 'boro') + ' ogni ' + atomsText(model.atomsPer(st.N)) + ' di silicio';
      if (G.tall) {
        setText(L.note1, 'Disegno non in scala: nel cristallo vero c\'è');
        setText(L.note2, exact);
      } else setText(L.note1, 'Disegno non in scala · nel cristallo vero c\'è ' + exact);
    }

    /* --- strumenti, grafici, spiegazione --- */

    const txt = { n: '', p: '', rho: '', i: '' };
    const rN = lab.readout({ label: 'Elettroni liberi n', color: 'var(--trace-3)', max: 15, fmt: () => txt.n });
    const rP = lab.readout({ label: 'Lacune p', color: 'var(--trace-2)', max: 15, fmt: () => txt.p });
    const rR = lab.readout({ label: 'Resistività ρ', color: 'var(--trace-1)', fmt: () => txt.rho });
    const rI = lab.readout({ label: 'Corrente I', color: 'var(--flow)', fmt: () => txt.i });

    const xAxis = { min: T_MIN, max: T_MAX, fmt: (v) => num(v, 0) + ' °C', label: 'temperatura' };
    const plotC = lab.plot({
      title: 'Portatori liberi · per cm³', height: 220,
      x: Object.assign({}, xAxis),
      y: { min: 0, max: 20, count: 10, fmt: pow10 },
      legend: [{ label: 'n elettroni', color: 'var(--trace-3)' }, { label: 'p lacune', color: 'var(--trace-2)' }, { label: 'nᵢ silicio puro', color: '#8fa79f' }, { label: 'nᵢ germanio', color: GE_COLOR }],
      aria: 'Concentrazione di elettroni e lacune in funzione della temperatura, in scala logaritmica',
    });
    const plotR = lab.plot({
      title: 'Resistività · Ω·cm', height: 220,
      x: Object.assign({}, xAxis),
      y: { min: -3, max: 10, count: 7, fmt: pow10 },
      legend: [{ label: 'ρ del cristallo', color: 'var(--trace-1)' }, { label: 'ρ silicio puro', color: '#8fa79f' }],
      aria: 'Resistività del cristallo in funzione della temperatura, in scala logaritmica',
    });
    lab.plotsEl.classList.add('cols-2');

    let plotKey = '';
    function drawPlots() {
      const key = [st.type, st.N, st.shownT.toFixed(1), plotC.w, plotC.h, plotR.w, plotC.dpr].join('|');
      if (key === plotKey) return;
      plotKey = key;
      const type = st.type;
      const N = st.N;
      const lg = Math.log10;
      const at = (Tc) => model.crystal(Tc, type, N);
      const c = at(st.shownT);
      const grey = '#8fa79f';
      plotC.clear();
      plotC.vline(25, { color: grey, alpha: 0.35, dash: [2, 4] });
      if (type !== 'puro') plotC.hline(lg(N), { color: type === 'n' ? P.t3 : P.t4, alpha: 0.5, dash: [3, 5], label: (type === 'n' ? 'N_D' : 'N_A') + ' = ' + sci(N), at: 'left' });
      plotC.line((T) => lg(model.ni(model.kelvin(T), 'ge')), { color: GE_COLOR, width: 1.5, dash: [2, 4], glow: false, alpha: 0.85 });
      plotC.line((T) => lg(model.ni(model.kelvin(T))), { color: grey, width: 1.5, dash: [6, 5], glow: false, alpha: 0.85 });
      plotC.line((T) => lg(at(T).p), { color: P.t2, width: 2.3 });
      plotC.line((T) => lg(at(T).n), { color: P.t3, width: 2.4, dash: type === 'puro' ? [8, 8] : null });
      if (type === 'puro') plotC.point(st.shownT, lg(c.n), { color: P.t1, label: 'n = p = ' + sci(c.n), labelPos: 'up' });
      else {
        plotC.point(st.shownT, lg(c.n), { color: P.t3, label: 'n ' + sci(c.n), labelPos: c.n >= c.p ? 'up' : 'down' });
        plotC.point(st.shownT, lg(c.p), { color: P.t2, label: 'p ' + sci(c.p), labelPos: c.p > c.n ? 'up' : 'down' });
      }
      plotR.clear();
      plotR.vline(25, { color: grey, alpha: 0.35, dash: [2, 4] });
      plotR.hline(0, { color: P.t1, alpha: 0.45, label: '1 Ω·cm', at: 'left' });
      if (type !== 'puro') plotR.line((T) => lg(model.crystal(T, 'puro', 0).rho), { color: grey, width: 1.5, dash: [6, 5], glow: false, alpha: 0.85 });
      plotR.line((T) => lg(at(T).rho), { color: P.t1, width: 2.4, fill: P.t1, fillTo: -3, fillAlpha: 0.07 });
      plotR.point(st.shownT, lg(c.rho), { color: P.t1, label: rhoText(c.rho), labelPos: 'up' });
    }

    function explainText() {
      const T = num(st.Tc, 0) + ' °C';
      let a;
      if (st.type === 'puro') {
        if (st.ni < 1e8) {
          a = 'Silicio puro a ' + T + ': il calore è poco e quasi nessun elettrone riesce a lasciare il suo [[legame-covalente|legame]]. Gli elettroni liberi sono appena ' + sci(st.ni) + ' per cm³: il cristallo è quasi un isolante.';
        } else if (st.Tc < 80) {
          a = 'Silicio puro a ' + T + ': ogni tanto il calore dà a un elettrone l\'energia per superare la [[banda-proibita]] (1,12 eV). Nasce una coppia: un [[elettrone-libero]] e una [[lacuna]]. Sono ' + sci(st.ni) + ' coppie per cm³, un elettrone libero ogni ' + atomsText(model.atomsPer(st.ni)) + ': per questo il silicio puro conduce pochissimo.';
        } else {
          a = 'A ' + T + ' i legami si rompono molto più spesso: le coppie sono ' + sci(st.ni) + ' per cm³, ' + timesText(st.ni / model.ni(ROOM)) + ' quelle a 25 °C, e la resistività è scesa a ' + rhoText(st.rho) + '. Il contrario di un metallo, che scaldandosi conduce peggio. Intanto elettroni e lacune si [[ricombinazione|ricombinano]]: il numero di coppie resta in equilibrio.';
        }
      } else {
        const isN = st.type === 'n';
        const ratio = st.min / st.maj;
        if (ratio >= 0.01) {
          a = 'Troppo caldo per questo drogaggio: a ' + T + ' le coppie create dal calore (nᵢ = ' + sci(st.ni) + ' per cm³) competono con i ' + sci(st.N) + ' atomi di ' + (isN ? 'fosforo' : 'boro') + ' per cm³. I minoritari sono già il ' + num(ratio * 100, ratio < 0.1 ? 1 : 0) + '% dei maggioritari: scaldando ancora il drogaggio non comanda più e il cristallo torna a comportarsi come silicio puro.';
        } else if (isN) {
          a = 'Ogni atomo di fosforo ha 5 elettroni di valenza: 4 entrano nei legami, il quinto si libera con pochissima energia. Il fosforo resta uno ione positivo fisso, un [[donatore]]. Gli elettroni sono i [[portatori-maggioritari]] (n ≈ ' + sci(st.n) + ' per cm³), le lacune sono rarissime: p = nᵢ²/n = ' + sci(st.p) + ' per cm³.';
        } else {
          a = 'Il boro ha solo 3 elettroni di valenza: in un suo legame manca un elettrone. Un vicino lo riempie, il boro diventa uno ione negativo fisso (un [[accettore]]) e la [[lacuna]] se ne va. Le lacune sono i [[portatori-maggioritari]] (p ≈ ' + sci(st.p) + ' per cm³), gli elettroni sono rarissimi: n = nᵢ²/p = ' + sci(st.n) + ' per cm³.';
        }
        if (ratio < 0.01 && st.min < 1) a += ' Meno di un minoritario per cm³: freddo e drogaggio insieme li fanno quasi sparire.';
        else if (!isN && st.rho < 1 && ratio < 0.01) a += ' Sotto 1 Ω·cm: con il fosforo ne basterebbe circa un terzo, perché le lacune sono quasi tre volte meno mobili degli elettroni.';
      }
      let b;
      if (Math.abs(st.V) < 0.05) b = 'Senza tensione elettroni e lacune vagano a caso: in media non si spostano e la corrente è zero.';
      else {
        const vd = model.drift(st.mn, Math.abs(st.V)) / 100;
        b = 'La tensione spinge gli elettroni verso il polo + e le lacune verso il −: la corrente, ' + si(Math.abs(st.I), 'A') + ', scorre ' + (st.I > 0 ? 'verso destra' : 'verso sinistra') + '. Nel disegno la deriva è esagerata: davvero gli elettroni avanzano di circa ' + num(vd, vd < 10 ? 1 : 0) + ' m/s, mentre il calore li fa sfrecciare a oltre 100 km/s.';
      }
      return a + ' ' + b;
    }

    function updatePanels() {
      txt.n = sci(st.n) + ' cm⁻³';
      txt.p = sci(st.p) + ' cm⁻³';
      txt.rho = rhoText(st.rho);
      txt.i = (Math.abs(st.V) < 0.05 ? '' : st.I > 0 ? '→ ' : '← ') + si(Math.abs(st.I), 'A');
      rN.set(clamp(Math.log10(Math.max(st.n, 1)) - 4, 0, 15));
      rP.set(clamp(Math.log10(Math.max(st.p, 1)) - 4, 0, 15));
      rR.set(st.rho);
      rI.set(st.I);
      rR.state(st.rho < 1 ? 'ok' : '');
      rN.state(st.type === 'n' ? 'ok' : '');
      rP.state(st.type === 'p' ? 'ok' : '');
      drawPlots();
      lab.explain(explainText());
    }

    /* --- comandi --- */

    const gCry = lab.group('Il cristallo');
    lab.choice({
      into: gCry, label: 'Drogaggio', value: 'puro',
      options: [{ value: 'puro', label: 'Puro' }, { value: 'n', label: 'Tipo N (fosforo)' }, { value: 'p', label: 'Tipo P (boro)' }],
      onChange: (v) => { st.type = v; changed(); },
    });
    const conc = lab.slider({
      into: gCry, label: 'Atomi di drogante per cm³', min: N_MIN, max: N_MAX, log: true, value: 1e15,
      fmt: (v) => sci(v) + ' cm⁻³', help: ' ',
      onInput: (v) => { st.N = v; changed(); },
    });
    const gCond = lab.group('Le condizioni');
    lab.slider({
      into: gCond, label: 'Temperatura', min: T_MIN, max: T_MAX, step: 1, value: 25,
      fmt: (v) => num(v, 0) + ' °C · ' + num(model.kelvin(v), 0) + ' K',
      onInput: (v) => { st.Tc = v; changed(); },
    });
    lab.slider({
      into: gCond, label: 'Tensione applicata', min: -V_MAX, max: V_MAX, step: 0.1, value: 3,
      fmt: voltText, help: 'Positiva: polo + a sinistra.',
      onInput: (v) => { st.V = Math.round(v * 10) / 10; changed(); },
    });
    const concHelp = conc.el.querySelector('.ei-slider-help');
    function changed() {
      compute();
      conc.el.classList.toggle('semiconduttori-off', st.type === 'puro');
      concHelp.textContent = st.type === 'puro'
        ? 'Scegli il tipo N o il tipo P per aggiungere il drogante.'
        : '1 atomo di ' + (st.type === 'n' ? 'fosforo' : 'boro') + ' ogni ' + atomsText(model.atomsPer(st.N)) + ' di silicio.';
      if (reduced) st.shownT = st.Tc;
      lab.invalidate();
    }

    lab.challenges([
      { id: 'mille', text: 'Scalda il silicio puro finché i portatori liberi diventano 1000 volte quelli a 25 °C.', check: (q) => q.type === 'puro' && q.ni / model.ni(ROOM) >= 1000 },
      { id: 'verso', text: 'Rendi il cristallo di tipo N e fai correre gli elettroni verso destra. In che verso scorre la corrente?', check: (q) => q.type === 'n' && q.V <= -0.5 },
      { id: 'boro', text: 'Con il boro (tipo P) porta la resistività sotto 1 Ω·cm. Ne serve più o meno che di fosforo?', check: (q) => q.type === 'p' && q.rho < 1 },
      { id: 'rari', text: 'Fai scendere i portatori minoritari sotto 1 per cm³: ricorda che n·p = nᵢ².', check: (q) => q.type !== 'puro' && q.min < 1 },
      { id: 'caldo', text: 'Drogato ma troppo caldo: fai salire i minoritari fino a un decimo dei maggioritari.', check: (q) => q.type !== 'puro' && q.min / q.maj >= 0.1 },
    ]);

    lab.onReset(() => {
      st.shownT = st.Tc;
      if (reduced) { staticKey = ''; staticSync(); } else settle();
      plotKey = '';
    });

    function layout() {
      const tall = !!(mq && mq.matches);
      if (G && G.tall === tall) return;
      build(tall);
      if (reduced) staticSync(); else settle();
      plotKey = '';
      lab.invalidate();
    }
    const onMq = () => layout();
    if (mq) {
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
      lab.onDestroy(() => {
        if (mq.removeEventListener) mq.removeEventListener('change', onMq);
        else if (mq.removeListener) mq.removeListener(onMq);
      });
    }

    lab.loop((dt, t) => {
      st.shownT = reduced ? st.Tc : EI.approach(st.shownT, st.Tc, dt, 9);
      if (Math.abs(st.shownT - st.Tc) < 0.05) st.shownT = st.Tc;
      if (reduced) staticSync();
      else step(dt);
      render(dt, t);
      updateCircuit(dt);
      updatePanels();
      lab.check(st);
    });

    layout();
    changed();
  }

  /* ---------- illustrazioni ---------- */

  // Legami nel cristallo drogato: a sinistra il fosforo con il quinto elettrone libero, a destra il boro e la lacuna.
  function dopingFigure() {
    const W = 480;
    const H = 292;
    const sx = 56;
    const panel = (ox, n) => {
      const cx = ox + 120;
      const cy = 128;
      const P = (i, j) => [cx + i * sx, cy + j * sx];
      let lines = '';
      let dots = '';
      const dot = (x, y) => '<circle class="f-fill" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.6"/>';
      // posto vuoto (solo nel tipo P): legame verticale tra (1,−1) e (1,0), dalla parte di (1,0)
      const hole = [cx + sx, cy - sx * 0.36];
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const [x, y] = P(i, j);
          const segs = [];
          segs.push(i < 1 ? [x, y, x + sx, y, 2] : [x, y, x + 26, y, 1]);
          if (i === -1) segs.push([x, y, x - 26, y, 1]);
          segs.push(j < 1 ? [x, y, x, y + sx, 2] : [x, y, x, y + 26, 1]);
          if (j === -1) segs.push([x, y, x, y - 26, 1]);
          segs.forEach(([x1, y1, x2, y2, k]) => {
            lines += '<path class="f-thin" d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '"/>';
            const ux = (x2 - x1) / Math.hypot(x2 - x1, y2 - y1);
            const uy = (y2 - y1) / Math.hypot(x2 - x1, y2 - y1);
            const ts = k === 2 ? [0.36 * sx, 0.64 * sx] : [0.36 * sx];
            ts.forEach((d) => {
              const px = x1 + ux * d;
              const py = y1 + uy * d;
              if (!n && Math.abs(px - hole[0]) < 0.5 && Math.abs(py - hole[1]) < 0.5) return;
              dots += dot(px, py);
            });
          });
        }
      }
      let atoms = '';
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const [x, y] = P(i, j);
          if (i === 0 && j === 0) continue;
          atoms += '<circle class="f-soft" cx="' + x + '" cy="' + y + '" r="13"/><text class="f-small" x="' + x + '" y="' + (y + 4) + '" text-anchor="middle">Si</text>';
        }
      }
      const col = n ? 'var(--fig-n)' : 'var(--fig-p)';
      atoms += '<circle class="' + (n ? 'f-n' : 'f-p') + '" cx="' + cx + '" cy="' + cy + '" r="15.5" style="stroke-width:2"/>' +
        '<text class="' + (n ? 'f-n-text' : 'f-p-text') + '" x="' + cx + '" y="' + (cy + 4.5) + '" text-anchor="middle">' + (n ? 'P' : 'B') + '</text>' +
        '<circle cx="' + (cx + 12.5) + '" cy="' + (cy - 12.5) + '" r="6.5" style="fill:' + col + '"/>' +
        '<text x="' + (cx + 12.5) + '" y="' + (cy - 9) + '" text-anchor="middle" style="fill:var(--fig-paper);font:900 10.5px var(--mono)">' + (n ? '+' : '−') + '</text>';
      let extra = '';
      if (n) {
        // il quinto elettrone: libero di vagare nel cristallo
        const ex = cx + sx * 0.52;
        const ey = cy - sx * 0.5;
        extra += '<path class="f-dash" d="M' + (cx + 15) + ' ' + (cy - 4) + 'Q' + (cx + 30) + ' ' + (cy - 8) + ' ' + (ex - 5) + ' ' + (ey + 7) + '"/>' +
          '<g class="semiconduttori-fig-wander"><circle class="f-n" cx="' + ex + '" cy="' + ey + '" r="8" style="stroke:none;opacity:.7"/><circle class="f-n-dot" cx="' + ex + '" cy="' + ey + '" r="4.2"/></g>';
      } else {
        // un elettrone del legame vicino è saltato nel legame del boro: il posto vuoto è la lacuna
        const tx = cx + sx * 0.64;
        const ty = cy;
        extra += '<path class="f-dash" d="M' + (hole[0] - 6) + ' ' + (hole[1] + 3) + 'Q' + (cx + sx * 0.82) + ' ' + (cy - 4) + ' ' + (tx + 5) + ' ' + (ty - 5) + '"/>' +
          '<path class="f-line" d="M' + (tx + 5) + ' ' + (ty - 5) + 'l1 -6m-1 6l-6 -1" style="stroke-width:1.4"/>' +
          '<circle class="f-p-dot semiconduttori-fig-pulse" cx="' + hole[0] + '" cy="' + hole[1] + '" r="4.6"/>';
      }
      const title = n ? 'Tipo N · fosforo, 5 elettroni' : 'Tipo P · boro, 3 elettroni';
      const leg = n
        ? [['e', 'il quinto elettrone è libero'], ['ion', 'P⁺: ione positivo, fisso']]
        : [['h', 'lacuna: manca un elettrone'], ['ion', 'B⁻: ione negativo, fisso']];
      let legend = '';
      leg.forEach(([k, t], q) => {
        const y = 240 + q * 22;
        const x = ox + 30;
        if (k === 'e') legend += '<circle class="f-n-dot" cx="' + x + '" cy="' + (y - 4) + '" r="4.2"/>';
        else if (k === 'h') legend += '<circle class="f-p-dot" cx="' + x + '" cy="' + (y - 4) + '" r="4.6"/>';
        else legend += '<circle cx="' + x + '" cy="' + (y - 4) + '" r="6.5" style="fill:' + col + '"/><text x="' + x + '" y="' + (y - 0.5) + '" text-anchor="middle" style="fill:var(--fig-paper);font:900 10.5px var(--mono)">' + (n ? '+' : '−') + '</text>';
        legend += '<text class="f-text" x="' + (x + 14) + '" y="' + y + '">' + t + '</text>';
      });
      return '<rect class="' + (n ? 'f-n' : 'f-p') + '" x="' + (ox + 6) + '" y="34" width="228" height="190" rx="14" style="fill-opacity:.4;stroke-opacity:.45"/>' +
        '<text class="' + (n ? 'f-n-text' : 'f-p-text') + '" x="' + cx + '" y="22" text-anchor="middle">' + title + '</text>' +
        lines + dots + atoms + extra + legend;
    };
    return '<svg viewBox="0 0 ' + W + ' ' + H + '">' + panel(0, true) + panel(246, false) + '</svg>';
  }

  // Bande di energia: conduttore, semiconduttore e isolante a confronto (20 px per eV).
  function bandsFigure() {
    const W = 480;
    const H = 300;
    const yV = 228;
    const yB = 272;
    const eV = 20;
    const bw = 104;
    const fill = (cx, y0, y1, skip) => {
      let out = '';
      let row = 0;
      for (let y = y1 - 6; y >= y0 + 5; y -= 10.5, row++) {
        for (let k = 0; k < 11; k++) {
          const x = cx - 45 + k * 9;
          if (row === 3 && skip && skip.includes(k)) continue;
          out += '<circle class="f-n-dot" cx="' + x + '" cy="' + y.toFixed(1) + '" r="2.3"/>';
        }
      }
      return out;
    };
    const head = (cx, t, sub) => '<text class="f-title" x="' + cx + '" y="22" text-anchor="middle">' + t + '</text><text class="f-small" x="' + cx + '" y="39" text-anchor="middle">' + sub + '</text>';
    const box = (cx, y0, y1) => '<rect class="f-soft" x="' + (cx - bw / 2) + '" y="' + y0 + '" width="' + bw + '" height="' + (y1 - y0) + '" rx="5"/>';
    const gap = (cx, y0, y1, label) => {
      const mid = (y0 + y1) / 2;
      const big = y1 - y0 > 40;
      return '<path class="f-accent" d="M' + (cx + (big ? 0 : 60)) + ' ' + (y0 + 3) + 'V' + (y1 - 3) + 'M' + (cx + (big ? 0 : 60) - 4) + ' ' + (y0 + 8) + 'l4 -5l4 5M' + (cx + (big ? 0 : 60) - 4) + ' ' + (y1 - 8) + 'l4 5l4 -5" style="stroke-width:1.6"/>' +
        '<text class="f-accent-text" x="' + (cx + (big ? 8 : 0)) + '" y="' + (mid + 4.5) + '" text-anchor="' + (big ? 'start' : 'middle') + '">' + label + '</text>';
    };
    // conduttore: una banda piena a metà
    const c1 = 116;
    let out = head(c1, 'Conduttore', 'rame, alluminio') + box(c1, 120, yB) + fill(c1, 186, yB) +
      '<text class="f-small" x="' + c1 + '" y="156" text-anchor="middle">posti liberi</text>' +
      '<text class="f-small" x="' + c1 + '" y="170" text-anchor="middle">subito sopra</text>';
    // semiconduttore: salto piccolo, il calore porta qualche elettrone di sopra
    const c2 = 262;
    const yC2 = yV - 1.12 * eV;
    out += head(c2, 'Semiconduttore', 'silicio · germanio 0,66 eV') + box(c2, yC2 - 42, yC2) + box(c2, yV, yB) + fill(c2, yV, yB, [3, 7]) +
      gap(c2, yC2, yV, '1,12 eV') +
      '<circle class="f-n-dot" cx="' + (c2 - 45 + 27) + '" cy="' + (yC2 - 12) + '" r="3.2"/>' +
      '<circle class="f-p-dot" cx="' + (c2 - 45 + 27) + '" cy="' + (yV + 7.5) + '" r="3.4"/>' +
      '<circle class="f-n-dot semiconduttori-fig-jump" cx="' + (c2 - 45 + 63) + '" cy="' + (yC2 - 12) + '" r="3.2"/>' +
      '<circle class="f-p-dot semiconduttori-fig-hole" cx="' + (c2 - 45 + 63) + '" cy="' + (yV + 7.5) + '" r="3.4"/>' +
      '<text class="f-small" x="' + c2 + '" y="' + (yC2 - 48) + '" text-anchor="middle">banda di conduzione</text>';
    // isolante: salto enorme, nessun elettrone libero
    const c3 = 408;
    const yC3 = yV - 5.5 * eV;
    out += head(c3, 'Isolante', 'diamante · silice ≈ 9 eV') + box(c3, yC3 - 40, yC3) + box(c3, yV, yB) + fill(c3, yV, yB) + gap(c3, yC3, yV, '5,5 eV') +
      '<text class="f-small" x="' + c3 + '" y="' + (yC3 - 46) + '" text-anchor="middle">conduzione: vuota</text>';
    // asse dell'energia e banda di valenza
    out += '<path class="f-line" d="M24 ' + (yB + 2) + 'V64M19 72l5 -8l5 8"/>' +
      '<text class="f-small" transform="translate(16 170) rotate(-90)" text-anchor="middle">energia</text>' +
      '<text class="f-small" x="' + ((c2 + c3) / 2) + '" y="' + (yB + 20) + '" text-anchor="middle">banda di valenza: piena di elettroni legati</text>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '">' + out + '</svg>';
  }

  /* ---------- capitolo ---------- */

  EI.chapter({
    id: 'semiconduttori',
    icon: 'lattice',
    minutes: 12,
    summary: 'Il silicio puro conduce pochissimo: i suoi elettroni sono quasi tutti impegnati nei [[legame-covalente|legami]] del cristallo. Il calore ne libera qualcuno, lasciando al suo posto una [[lacuna]]. Ma basta un atomo di fosforo o di boro ogni pochi milioni per riempire il cristallo di cariche libere: è il [[drogaggio]], il trucco su cui si basano tutti i componenti elettronici.',
    keywords: ['semiconduttore', 'banda-proibita', 'legame-covalente', 'lacuna', 'drogaggio', 'donatore', 'accettore', 'portatori-maggioritari'],
    model: model,
    css: [
      '.semiconduttori-svg { user-select: none; -webkit-user-select: none; }',
      '@media (max-width: 640px) { .ei-stage-svg.semiconduttori-svg.tall { max-height: 640px; } }',
      '.semiconduttori-crystal { fill: #0c1714; stroke: #2a3e37; stroke-width: 1.5; }',
      '.semiconduttori-zone { transition: opacity .5s ease; }',
      '.semiconduttori-stub { opacity: .55; }',
      '.semiconduttori-be { fill: #4d7e94; transition: opacity .12s linear; }',
      '.semiconduttori-be.hop { fill: #93d8f7; transition: none; }',
      '.semiconduttori-atom-label { font: 800 10.5px var(--mono); fill: #9cbab0; pointer-events: none; }',
      '.semiconduttori-atom.donor .semiconduttori-atom-label { fill: #e3f6ff; font-size: 12px; }',
      '.semiconduttori-atom.acceptor .semiconduttori-atom-label { fill: #ffe6ef; font-size: 12px; }',
      '.semiconduttori-badge circle { stroke: var(--scope-bg); stroke-width: 1.4; }',
      '.semiconduttori-badge.plus circle { fill: var(--trace-3); }',
      '.semiconduttori-badge.minus circle { fill: var(--trace-4); }',
      '.semiconduttori-badge text { font: 900 10px var(--mono); fill: #05121a; }',
      '.ei-h.semiconduttori-h { fill: color-mix(in srgb, var(--trace-2) 16%, transparent); stroke-width: 2; }',
      '.semiconduttori-flash { pointer-events: none; }',
      '.semiconduttori-flash.gen { fill: #c9efff; filter: url(#ei-glow-strong); }',
      '.semiconduttori-flash.rec { fill: #ffad5c; filter: url(#ei-glow-strong); }',
      '.semiconduttori-flash.ion { fill: var(--trace-3); filter: url(#ei-glow); }',
      '.semiconduttori-flash.ion-p { fill: var(--trace-4); filter: url(#ei-glow); }',
      '.semiconduttori-contact { fill: #a9bab4; stroke: var(--wire); stroke-width: 2.5; transition: stroke var(--t-normal) ease; }',
      '.semiconduttori-sign { font: 900 19px var(--mono); }',
      '.semiconduttori-head { font: 800 12px var(--mono); letter-spacing: .12em; fill: var(--lab-ink); }',
      '.semiconduttori-head.n { fill: var(--trace-3); }',
      '.semiconduttori-head.p { fill: var(--trace-4); }',
      '.semiconduttori-head .t, .semiconduttori-head.t { fill: var(--trace-2); }',
      '.semiconduttori-legend { font: 600 10.5px var(--font); fill: var(--scope-text); }',
      '.semiconduttori-legend-sign { font: 900 9px var(--mono); fill: var(--lab-ink); }',
      '.semiconduttori-note { font: 600 10.5px var(--font); fill: var(--scope-text); opacity: .85; }',
      '.semiconduttori-reading { font: 700 12.5px var(--mono); fill: var(--flow); }',
      '.semiconduttori-reading.v { fill: var(--trace-1); }',
      '.semiconduttori-fieldg { transition: opacity var(--t-normal) ease; }',
      '.semiconduttori-field { fill: none; stroke: var(--trace-2); stroke-width: 1.8; stroke-dasharray: 2 6; stroke-linecap: round; animation: semiconduttori-march 1s linear infinite; }',
      '.semiconduttori-field-head { fill: var(--trace-2); }',
      '.semiconduttori-field-label { font: 700 10.5px var(--mono); fill: var(--trace-2); letter-spacing: .06em; }',
      '.semiconduttori-drift { fill: none; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }',
      '.semiconduttori-drift.e { stroke: var(--trace-3); }',
      '.semiconduttori-drift.h { stroke: var(--trace-2); }',
      '.ei-slider.semiconduttori-off input, .ei-slider.semiconduttori-off label { opacity: .45; }',
      '.semiconduttori-fig-wander { animation: semiconduttori-wander 6s ease-in-out infinite; }',
      '.semiconduttori-fig-pulse { transform-box: fill-box; transform-origin: center; animation: semiconduttori-pulse 2.4s ease-in-out infinite; }',
      '.semiconduttori-fig-jump { animation: semiconduttori-jump 4.8s cubic-bezier(.22, 1, .36, 1) infinite; }',
      '.semiconduttori-fig-hole { animation: semiconduttori-hole 4.8s ease infinite; }',
      '@keyframes semiconduttori-march { to { stroke-dashoffset: -16; } }',
      '@keyframes semiconduttori-wander { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(9px, -7px); } 50% { transform: translate(15px, 5px); } 75% { transform: translate(4px, 9px); } }',
      '@keyframes semiconduttori-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: .5; } }',
      '@keyframes semiconduttori-jump { 0%, 22% { transform: translateY(54px); } 46%, 84% { transform: translateY(0); } 100% { transform: translateY(54px); } }',
      '@keyframes semiconduttori-hole { 0%, 26% { opacity: 0; } 44%, 84% { opacity: 1; } 96%, 100% { opacity: 0; } }',
      '@media (prefers-reduced-motion: reduce) { .semiconduttori-fig-wander, .semiconduttori-fig-pulse, .semiconduttori-fig-jump, .semiconduttori-fig-hole, .semiconduttori-field { animation: none; } }',
    ].join('\n'),
    lab: {
      title: 'Dentro il cristallo di silicio',
      intro: 'Un pezzetto di cristallo visto da vicinissimo: i cerchi sono gli atomi di silicio, le linee i [[legame-covalente|legami]] con i loro due elettroni. Scalda il cristallo e guarda i legami che si rompono; poi scegli il drogaggio N o P e cambia la tensione. L\'amperometro misura la corrente in una barretta lunga 1 cm con 1 mm² di sezione.',
      svgLabel: 'Reticolo del cristallo di silicio con atomi, legami, elettroni liberi e lacune, collegato a una pila e a un amperometro',
      viewBox: [700, 420],
      mount: mount,
    },
    how: [
      'In un metallo moltissimi elettroni sono liberi di muoversi e la corrente passa facilmente; in un isolante, come il vetro, ogni elettrone resta legato al suo atomo. Un [[semiconduttore]] sta in mezzo: a temperatura ambiente ha poche cariche libere, ma il loro numero si può cambiare enormemente.',
      'Il silicio ha 4 elettroni esterni, detti di valenza. Nel cristallo ogni atomo li mette in comune con 4 vicini: ogni [[legame-covalente]] è una coppia di elettroni condivisa. Nel disegno il reticolo è piatto; in realtà i quattro legami puntano ai vertici di un tetraedro.',
      'Per strappare un elettrone da un legame serve un\'energia minima, la [[banda-proibita]]: 1,12 eV nel silicio, 0,66 eV nel germanio, più di 5 eV negli isolanti. Ogni tanto l\'agitazione termica la fornisce: l\'elettrone diventa un [[elettrone-libero]] e al suo posto resta una [[lacuna]].',
      'Anche la lacuna si muove. Un elettrone del legame vicino salta nel posto vuoto e lascia un vuoto dietro di sé: è come la sedia libera in una fila al cinema, che "viaggia" verso destra mentre le persone si spostano di un posto verso sinistra. Per questo la lacuna si comporta come una carica positiva.',
      'Più il cristallo è caldo, più coppie nascono: vicino ai 25 °C il loro numero più che raddoppia ogni 10 °C. Intanto elettroni e lacune si incontrano e si [[ricombinazione|ricombinano]], così il numero resta in equilibrio. Per questo la resistenza di un semiconduttore puro scende quando si scalda, al contrario di quella dei metalli.',
      'Il [[drogaggio]] cambia tutto. Un atomo di fosforo (5 elettroni di valenza) al posto di un silicio è un [[donatore]]: il quinto elettrone resta libero e il fosforo diventa uno ione positivo fisso. Un atomo di boro (3 elettroni) è un [[accettore]]: in un legame manca un elettrone, nasce una lacuna e il boro diventa uno ione negativo fisso.',
      'Nel tipo N gli elettroni sono i [[portatori-maggioritari]] e le lacune i minoritari; nel tipo P il contrario. Il prodotto n·p resta sempre uguale a nᵢ²: più elettroni ci sono, meno lacune sopravvivono. Basta un atomo di fosforo ogni 10 milioni per far scendere la resistività da circa 400 000 a circa 1 Ω·cm.',
    ],
    formulas: [
      {
        name: 'Portatori nel silicio puro',
        expr: '<var>n</var><sub>i</sub> = √(<var>N</var><sub>c</sub> · <var>N</var><sub>v</sub>) · <var>e</var><sup>−<var>E</var><sub>g</sub> / 2<var>kT</var></sup>',
        legend: [['n<sub>i</sub>', 'concentrazione intrinseca: elettroni liberi (e lacune) per cm³'], ['N<sub>c</sub>, N<sub>v</sub>', 'posti disponibili nelle bande, crescono come T<sup>1,5</sup>'], ['E<sub>g</sub>', 'banda proibita: 1,12 eV nel silicio'], ['k', 'costante di Boltzmann, 8,617·10⁻⁵ eV/K'], ['T', 'temperatura assoluta, in kelvin']],
        note: 'A 300 K (27 °C) nel silicio n<sub>i</sub> ≈ 1,0·10¹⁰ cm⁻³, nel germanio circa 2·10¹³ cm⁻³: duemila volte di più, perché il suo salto è più piccolo.',
      },
      {
        name: 'Legge di azione di massa',
        expr: '<var>n</var> · <var>p</var> = <var>n</var><sub>i</sub><sup>2</sup>',
        legend: [['n', 'elettroni liberi per cm³'], ['p', 'lacune per cm³'], ['N<sub>D</sub>, N<sub>A</sub>', 'atomi donatori o accettori per cm³: nel tipo N n ≈ N<sub>D</sub>, nel tipo P p ≈ N<sub>A</sub>']],
        note: 'Esempio a 300 K con N<sub>D</sub> = 10¹⁵ cm⁻³: n = 10¹⁵ e p = 10²⁰ / 10¹⁵ = 10⁵ lacune per cm³, dieci miliardi di volte meno degli elettroni.',
      },
      {
        name: 'Resistività',
        expr: '<var>ρ</var> = <span class="frac"><span>1</span><span><var>q</var> · (<var>n</var> · <var>μ</var><sub>n</sub> + <var>p</var> · <var>μ</var><sub>p</sub>)</span></span>',
        legend: [['q', 'carica dell\'elettrone, 1,602·10⁻¹⁹ C'], ['μ<sub>n</sub>, μ<sub>p</sub>', 'mobilità di elettroni e lacune: circa 1340 e 460 cm²/(V·s) nel silicio poco drogato a 300 K'], ['ρ', 'resistività in Ω·cm: un cubetto di 1 cm di lato ha resistenza ρ']],
        note: 'Silicio puro a 300 K: circa 3,5·10⁵ Ω·cm. Con 10¹⁶ atomi di fosforo per cm³: circa 0,5 Ω·cm. Il rame: 1,7·10⁻⁶ Ω·cm.',
      },
    ],
    figures: [
      { title: 'Drogaggio di tipo N e di tipo P', svg: dopingFigure(), caption: 'A sinistra il fosforo usa 4 dei suoi 5 elettroni per i legami: il quinto vaga libero e il fosforo resta uno ione positivo. A destra al boro manca un elettrone: un elettrone vicino riempie il suo legame e lascia una [[lacuna]] che può spostarsi. In entrambi i casi lo ione resta fermo nel reticolo.', alt: 'Due reticoli di silicio: al centro di uno un atomo di fosforo con un elettrone libero, al centro dell\'altro un atomo di boro con una lacuna in un legame vicino' },
      { title: 'Conduttore, semiconduttore, isolante', svg: bandsFigure(), caption: 'Gli elettroni possono avere solo le energie delle bande. Nel metallo ci sono posti liberi subito sopra quelli occupati; nell\'isolante il salto è enorme. Nel semiconduttore la [[banda-proibita]] è piccola: il calore porta qualche elettrone nella banda di conduzione e lascia una lacuna in quella di valenza. 1 eV è l\'energia che un elettrone guadagna attraversando una tensione di 1 volt.', alt: 'Schema delle bande di energia: nel conduttore una banda piena a metà, nel semiconduttore un salto di 1,12 eV, nell\'isolante un salto di 5,5 eV' },
    ],
    history: {
      text: [
        'La storia comincia con una stranezza. Nel 1833 Michael Faraday nota che il solfuro d\'argento conduce meglio quando lo scalda, il contrario di quello che fanno i metalli. Arrivano poi altre sorprese: nel 1873 Willoughby Smith scopre che il selenio conduce di più se è illuminato, e nel 1874 Ferdinand Braun vede che un cristallo di galena toccato da una punta metallica fa passare la corrente meglio in un verso che nell\'altro (la storia continua nel capitolo sul diodo). Sono materiali capricciosi: due campioni "uguali" si comportano in modo diverso, e nessuno sa perché.',
        'La spiegazione arriva con la meccanica quantistica. Felix Bloch e Rudolf Peierls studiano come si muovono gli elettroni in un cristallo; nel 1929 Peierls, analizzando l\'effetto Hall, mostra che una banda quasi piena si comporta come se portasse cariche positive: è l\'idea della lacuna, che Werner Heisenberg riprende nel 1931. Nello stesso anno Alan Wilson, un fisico di Cambridge che lavora a Lipsia, spiega con le bande di energia la differenza tra conduttori, isolanti e semiconduttori, e il ruolo delle impurezze.',
        'Restava un problema pratico: la purezza. Alla fine degli anni Trenta i Bell Labs cercano rivelatori a cristallo per le microonde, presto indispensabili nei radar. Nel 1940 Russell Ohl trova un campione di silicio diviso in due zone che si comportano in modo opposto; Jack Scaff e Henry Theuerer capiscono il perché: tracce di fosforo danno un eccesso di elettroni, tracce di boro un difetto. Le due varietà vengono chiamate "n" (negativo) e "p" (positivo), e il loro confine è la giunzione P-N del prossimo capitolo.',
        'Poi servivano cristalli perfetti. Il metodo per "tirarli" da un bagno fuso lo aveva trovato Jan Czochralski a Berlino nel 1916; alla fine degli anni Quaranta Gordon Teal e John Little, ai Bell Labs, lo usano per far crescere cristalli singoli di germanio. Intorno al 1951 William Pfann inventa la purificazione a zone. Il germanio, più facile da purificare, è il materiale dei primi transistor; dal 1954 arrivano quelli al silicio, che regge temperature più alte e ha un ossido, la silice, perfetto per isolare e proteggere i chip.',
      ],
      events: [
        { year: 1833, title: 'Un cristallo che conduce meglio se scaldato', who: 'Michael Faraday', text: 'Nel solfuro d\'argento la conduzione cresce con la temperatura: è il primo effetto da semiconduttore mai descritto.' },
        { year: 1916, title: 'Il cristallo tirato dal fuso', who: 'Jan Czochralski', text: 'Un pennino immerso per sbaglio nello stagno fuso suggerisce il metodo che oggi produce la maggior parte dei lingotti di silicio.' },
        { year: 1929, title: 'L\'idea della lacuna', who: 'Rudolf Peierls', text: 'Studiando l\'effetto Hall mostra che il posto vuoto in una banda quasi piena si comporta come una carica positiva.' },
        { year: 1931, title: 'La teoria dei semiconduttori', who: 'Alan H. Wilson', text: 'Conduttori, isolanti e semiconduttori spiegati con le bande di energia e la [[banda-proibita]]; le impurezze aggiungono o tolgono elettroni.' },
        { year: 1951, title: 'La purificazione a zone', who: 'William G. Pfann, Bell Labs', text: 'Una zona fusa che scorre lungo la barra si porta via le impurezze: germanio e silicio diventano purissimi.' },
      ],
    },
    fun: 'Per fare i chip il silicio viene purificato fino a "undici nove", il 99,999999999%: resta circa un atomo estraneo ogni 100 miliardi. Poi lo si sporca di nuovo, apposta e con precisione: un atomo di fosforo ogni 10 milioni di silicio è come una sola persona in tutta la Lombardia, eppure basta a far condurre il cristallo centinaia di migliaia di volte di più.',
    uses: 'Ogni diodo, transistor, LED, cella solare e circuito integrato nasce da silicio drogato: i wafer dei chip sono fette di un unico lingotto cresciuto con il metodo Czochralski. Il silicio è il secondo elemento più abbondante della crosta terrestre, dopo l\'ossigeno. La conduzione che cresce con il calore è sfruttata nei termistori NTC, piccoli sensori di temperatura fatti di ossidi semiconduttori.',
    links: [
      { href: '../elettronica-base/index.html#corrente', section: 'Elettronica base', title: 'La corrente: cariche che si muovono' },
      { href: '../elettronica-base/index.html#ohm', section: 'Elettronica base', title: 'Resistenza e legge di Ohm' },
      { href: '#diodo', section: 'Questa sezione', title: 'Un pezzo P e uno N a contatto: il diodo' },
      { href: '#led-zener', section: 'Questa sezione', title: 'Quando la ricombinazione fa luce: i LED' },
      { href: '../porte-logiche/index.html#fabbrica', section: 'Porte logiche e chip', title: 'Dal lingotto di silicio al chip' },
    ],
    glossary: {
      'semiconduttore': { term: 'Semiconduttore', def: 'Materiale che conduce molto meno di un metallo e molto più di un isolante, come il silicio e il germanio. Le sue cariche libere aumentano con la temperatura e si controllano con il drogaggio.' },
      'banda-proibita': { term: 'Banda proibita', def: 'L\'energia minima per liberare un elettrone da un legame del cristallo (in inglese band gap): 1,12 eV nel silicio, 0,66 eV nel germanio, più di 5 eV negli isolanti.' },
      'legame-covalente': { term: 'Legame covalente', def: 'Legame tra due atomi che mettono in comune una coppia di elettroni. Nel cristallo di silicio ogni atomo forma quattro legami covalenti con i suoi vicini.' },
      'elettrone-libero': { term: 'Elettrone libero', def: 'Elettrone che si è staccato dal suo legame e può muoversi in tutto il cristallo trasportando corrente. Nel silicio puro nasce sempre insieme a una lacuna.' },
      'lacuna': { term: 'Lacuna', def: 'Il posto vuoto lasciato da un elettrone in un legame. Gli elettroni vicini lo riempiono uno dopo l\'altro, così la lacuna si sposta e si comporta come una carica positiva.' },
      'ricombinazione': { term: 'Ricombinazione', def: 'L\'incontro tra un elettrone libero e una lacuna: l\'elettrone torna in un legame e la coppia sparisce cedendo energia, nel silicio come calore e nei LED come luce. Il contrario è la generazione di coppie.' },
      'drogaggio': { term: 'Drogaggio', def: 'Aggiunta controllata di pochissimi atomi estranei a un cristallo purissimo, per esempio uno ogni milione o meno, per decidere quante cariche libere avrà e di che tipo (N o P).' },
      'donatore': { term: 'Donatore', def: 'Atomo con 5 elettroni di valenza, come fosforo e arsenico, inserito nel silicio: cede l\'elettrone in più e resta uno ione positivo fisso. Rende il cristallo di tipo N.' },
      'accettore': { term: 'Accettore', def: 'Atomo con 3 elettroni di valenza, come boro e gallio, inserito nel silicio: prende un elettrone da un legame vicino, crea una lacuna e resta uno ione negativo fisso. Rende il cristallo di tipo P.' },
      'portatori-maggioritari': { term: 'Portatori maggioritari', def: 'Le cariche libere più numerose in un semiconduttore drogato: gli elettroni nel tipo N, le lacune nel tipo P. Le altre, rarissime, sono i portatori minoritari.' },
    },
  });
})();
