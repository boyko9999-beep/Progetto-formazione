/*
 * Capitolo 9: l'alimentatore, dalla presa ai 5 volt.
 * Laboratorio "Dalla presa ai 5 volt": rete a 230 V, trasformatore (9, 12 o 15 V), raddrizzatore a semionda
 * o a ponte di Graetz, condensatore di livellamento, regolatore 7805 e carico. Lo schema scorre al rallentatore,
 * sincronizzato con il cursore dell'oscilloscopio; i punti di misura TP1–TP4 scelgono le tracce.
 */
(function () {
  'use strict';

  const { s, sym, wire, dot, si, num, clamp } = EI;
  const NB = ' ';

  /* ---------- modello fisico (puro, testato in tests/alimentatore.test.js) ---------- */

  const F = 50;          // Hz, frequenza della rete
  const VD = 0.7;        // V, caduta di un diodo al silicio che conduce
  const VREG = 5;        // V, uscita del 7805
  const DROPOUT = 2;     // V, margine minimo tra ingresso e uscita del 7805
  const TA = 25;         // °C, aria intorno al dissipatore
  const RTH = 10;        // °C/W, dalla giunzione all'aria: 5 del contenitore TO-220 più 5 di un dissipatore medio
  const TJ_MAX = 125;    // °C, temperatura massima di lavoro della giunzione

  /*
   * Simulazione nel tempo, a passo fisso, del raddrizzatore con il condensatore e il carico, fino al regime.
   * p: { vrms, mode: 'ponte' | 'semionda', C (F, 0 = senza), I (A), reg (true = con il 7805),
   *      load: 'costante' (corrente fissa I) | 'carico' (resistenza da I a 5 V, dietro al regolatore),
   *      f, vd, dt, periods (registrati), settle (periodi di assestamento), every (un campione ogni n passi) }
   * Diodi ideali con caduta fissa: se la tensione raddrizzata supera quella del condensatore, il condensatore
   * la segue (i diodi conducono); altrimenti si scarica con la corrente del carico.
   */
  function simulate(p) {
    const f = p.f || F;
    const vd = p.vd == null ? VD : p.vd;
    const mode = p.mode || 'ponte';
    const C = p.C > 0 ? p.C : 0;
    const reg = p.reg !== false;
    const I = p.I || 0;
    const dt = p.dt || 1e-5;
    const T = 1 / f;
    const every = Math.max(1, Math.round(p.every || 1));
    const nRec = Math.round((p.periods || 3) * T / dt);
    const nSet = Math.round((p.settle == null ? 2 : p.settle) * T / dt);
    const draw = p.load === 'carico' ? (v) => model.loadCurrent(v, I, reg) : (v) => (v > 0 ? I : 0);
    const nd = model.diodes(mode);
    const size = Math.floor(nRec / every) + 1;
    const out = {
      t: new Float64Array(size), vs: new Float64Array(size), vr: new Float64Array(size), vc: new Float64Array(size),
      vout: new Float64Array(size), iD: new Float64Array(size), iL: new Float64Array(size),
    };
    let vc = model.rectifiedPeak(p.vrms, mode, vd);
    let vmax = -Infinity;
    let vmin = Infinity;
    let omax = -Infinity;
    let omin = Infinity;
    let sv = 0;
    let so = 0;
    let sReg = 0;
    let sOut = 0;
    let sD = 0;
    let sIn = 0;
    let sI = 0;
    let iPeak = 0;
    let on = 0;
    let pulses = 0;
    let was = false;
    let cnt = 0;
    let j = 0;
    for (let k = -nSet; k <= nRec; k++) {
      const t = k * dt;
      const vs = model.secondary(t, p.vrms, f);
      const vr = model.rectified(vs, mode, vd);
      let v;
      let iD;
      let iL;
      if (C > 0) {
        iL = draw(vc);
        const free = vc - iL * dt / C;
        if (vr > 0 && vr >= free) { v = vr; iD = C * (vr - vc) / dt + iL; } else { v = Math.max(0, free); iD = 0; }
      } else {
        v = vr;
        iL = vr > 0 ? draw(vr) : 0;
        iD = iL;
      }
      vc = v;
      const conducting = iD > 1e-9;
      if (k < 0) { was = conducting; continue; }
      const vo = reg ? model.regulator(v) : v;
      cnt++;
      if (v > vmax) vmax = v;
      if (v < vmin) vmin = v;
      if (vo > omax) omax = vo;
      if (vo < omin) omin = vo;
      sv += v;
      so += vo;
      if (reg) sReg += (v - vo) * iL;
      sOut += vo * iL;
      sD += nd * vd * iD;
      sIn += Math.abs(vs) * iD;
      sI += iD;
      if (iD > iPeak) iPeak = iD;
      if (conducting) { on++; if (!was) pulses++; }
      was = conducting;
      if (k % every === 0 && j < size) {
        out.t[j] = t; out.vs[j] = vs; out.vr[j] = vr; out.vc[j] = v; out.vout[j] = vo; out.iD[j] = iD; out.iL[j] = iL;
        j++;
      }
    }
    const pIn = sIn / cnt;
    const pOut = sOut / cnt;
    return Object.assign(out, {
      n: j, dt: dt * every, T: T, mode: mode, C: C, I: I, reg: reg,
      vmax: vmax, vmin: vmin, ripple: vmax - vmin, vavg: sv / cnt,
      voutAvg: so / cnt, voutMin: omin, voutMax: omax, outRipple: omax - omin,
      iPeak: iPeak, iAvg: sI / cnt, conduction: on / cnt, pulses: pulses,
      pIn: pIn, pOut: pOut, pReg: sReg / cnt, pDiodes: sD / cnt, eff: model.efficiency(pOut, pIn),
      estimate: model.rippleEstimate(I, C, mode, f),
      regulated: reg && vmin >= VREG + DROPOUT - 1e-9,
    });
  }

  const model = {
    F: F, VD: VD, VREG: VREG, DROPOUT: DROPOUT, TA: TA, RTH: RTH, TJ_MAX: TJ_MAX,
    // Picco di una sinusoide a partire dal valore efficace.
    peak: (vrms) => vrms * Math.SQRT2,
    // Tensione del secondario all'istante t (parte da zero e sale).
    secondary: (t, vrms, f) => vrms * Math.SQRT2 * Math.sin(2 * Math.PI * (f || F) * t),
    // Diodi attraversati dalla corrente: uno a semionda, due nel ponte.
    diodes: (mode) => (mode === 'semionda' ? 1 : 2),
    // Ricariche del condensatore in un periodo di rete.
    pulses: (mode) => (mode === 'semionda' ? 1 : 2),
    // Uscita del raddrizzatore senza condensatore (diodi ideali più la caduta fissa).
    rectified: (vs, mode, vd) => {
      const d = vd == null ? VD : vd;
      return mode === 'semionda' ? Math.max(0, vs - d) : Math.max(0, Math.abs(vs) - 2 * d);
    },
    rectifiedPeak: (vrms, mode, vd) => Math.max(0, model.peak(vrms) - model.diodes(mode) * (vd == null ? VD : vd)),
    // Stima classica del ripple picco-picco: il condensatore alimenta da solo il carico fino alla ricarica successiva.
    rippleEstimate: (I, C, mode, f) => (C > 0 ? I / (model.pulses(mode) * (f || F) * C) : Infinity),
    // Regolatore 7805: 5 V se l'ingresso supera 5 + 2 V, altrimenti l'ingresso meno i 2 V di dropout.
    regulator: (vin, vout, drop) => {
      const vo = vout == null ? VREG : vout;
      const d = drop == null ? DROPOUT : drop;
      return vin >= vo + d ? vo : Math.max(0, vin - d);
    },
    // Corrente presa dal condensatore da un carico dimensionato per I a 5 V (una resistenza R = 5 V / I),
    // dietro al regolatore (reg) oppure collegato direttamente (reg = false).
    loadCurrent: (v, I, reg) => I * (reg === false ? Math.max(0, v) : model.regulator(v)) / VREG,
    regPower: (vin, vout, I) => Math.max(0, vin - vout) * I,
    efficiency: (pout, pin) => (pin > 0 ? pout / pin : 0),
    junctionTemp: (p, rth, ta) => (ta == null ? TA : ta) + p * (rth == null ? RTH : rth),
    simulate: simulate,
  };

  /* ---------- laboratorio ---------- */

  const SLOW = 100;                 // rallentatore: un periodo di rete (20 ms) dura 2 s sullo schermo
  const PERIODS = 3;                // periodi mostrati dall'oscilloscopio
  const WIN = PERIODS / F;          // 60 ms
  const C_LIST = EI.seriesValues('E6', 100e-6, 10e-3);
  const SECONDARI = [9, 12, 15];
  const YMAX = { 9: 15, 12: 20, 15: 25 };   // fondo scala dell'oscilloscopio per ogni secondario
  const GHOST = '#5f746d';

  const fmtC = (c) => Math.round(c * 1e6).toLocaleString('it-IT') + NB + 'µF';
  const fmtI = (i) => (i < 0.9995 ? Math.round(i * 1000) + NB + 'mA' : num(i, 2) + NB + 'A');
  const fmtV = (v, d) => num(v, d == null ? 2 : d) + NB + 'V';
  const fmtW = (p) => num(p, p < 10 ? 2 : 1) + NB + 'W';
  const fmtRip = (v) => (v < 0.995 ? Math.round(v * 1000) + NB + 'mV' : fmtV(v));

  // La stessa simulazione per il banco e per la ricerca del condensatore più piccolo.
  function labSim(q) {
    return simulate({ vrms: q.vrms, mode: q.mode, C: q.cOn ? q.C : 0, I: q.I, reg: q.reg, load: 'carico', periods: PERIODS, settle: 2, dt: 1e-5, every: 5 });
  }

  function niceCeil(x) {
    if (!(x > 0)) return 1;
    const e = Math.pow(10, Math.floor(Math.log10(x)));
    const m = x / e;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e;
  }

  function mixHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const k = clamp(t, 0, 1);
    return '#' + [16, 8, 0].map((sh) => {
      const x = (pa >> sh) & 255;
      const y = (pb >> sh) & 255;
      return Math.round(x + (y - x) * k).toString(16).padStart(2, '0');
    }).join('');
  }

  /*
   * Due composizioni dello schema. Larga: tutta la catena su una riga. Stretta (telefono): rete, trasformatore
   * e ponte in alto; condensatore, regolatore e carico in basso, collegati da un filo che torna a sinistra.
   */
  const NARROW_ON = 850;    // px di larghezza dello schema sotto cui si passa alla composizione stretta
  const NARROW_OFF = 870;   // e sopra cui si torna a quella larga (un po' di isteresi)
  const WIDE = {
    W: 960, H: 392, narrow: false,
    src: 62, tr: [170, 190], sx: 252, lead: 30, br: [356, 190, 62],
    zone: [12, 70, 170, 240],
    yP: 190, yG: 330, node: 490, capY: 236, gauge: [440, 210, 82],
    ic: [570, 162, 96, 56], jumpY: 132, lamp: [790, 232], term: 902, gnd: 846,
    tp: { tp1: [252, 98], tp2: [526, 190], tp3: [732, 190], tp4: [456, 190] },
    caption: [356, 374],
    titles: [['rete', 66, 'RETE'], ['tr', 184, 'TRASFORMATORE'], ['br', 356, ''], ['c', 490, 'FILTRO'], ['reg', 618, 'REGOLATORE'], ['load', 790, 'CARICO'], ['out', 902, 'USCITA']],
    titleY: 28,
  };
  const NARROW = {
    W: 400, H: 586, narrow: true,
    src: 34, tr: [98, 170], sx: 180, lead: 28, br: [286, 170, 54],
    zone: [6, 64, 104, 186],
    ret: 286, retX: 374, railX: 14,
    yP: 354, yG: 506, node: 64, capY: 406, gauge: [34, 382, 86],
    ic: [148, 326, 92, 56], jumpY: 312, lamp: [318, 404], term: 382, gnd: 40,
    tp: { tp1: [180, 86], tp2: [106, 354], tp3: [278, 354], tp4: [358, 170] },
    caption: [200, 273],
    titles: [['rete', 40, 'RETE'], ['tr', 142, 'TRASFORMATORE'], ['br', 290, '']],
    titleY: 22,
    titles2: [['c', 64, 'FILTRO'], ['reg', 194, 'REGOLATORE'], ['load', 318, 'CARICO']],
    title2Y: 544,
  };

  function mount(lab) {
    const svg = lab.svg;
    const P = EI.palette();
    // composizione stretta quando lo schema largo diventerebbe troppo piccolo per leggerlo (telefoni e tablet)
    const stageEl = svg.parentNode;
    let narrow = false;
    const wantNarrow = () => {
      let w = stageEl && stageEl.clientWidth;
      if (!w) w = (window.innerWidth || 1200) - 40;
      return narrow ? w < NARROW_OFF : w < NARROW_ON;
    };
    narrow = wantNarrow();
    const cs = getComputedStyle(document.documentElement);
    const SYM = (cs.getPropertyValue('--sym').trim() || '#d3e5de');
    const FLOW = (cs.getPropertyValue('--flow').trim() || '#ffe1a1');
    lab.root.classList.add('alimentatore-lab');

    const DEF_PROBES = { tp1: true, tp2: true, tp3: true, tp4: false };
    const st = {
      vrms: 12, mode: 'ponte', C: 2200e-6, cOn: true, reg: true, I: 0.5,
      probes: Object.assign({}, DEF_PROBES),
      tc: 0, sim: null, dirty: true, disp: null, lens: null, heatT: TA,
    };
    let S = null;           // la scena disegnata
    let cBest = null;       // il condensatore più piccolo che regge 500 mA (calcolato una volta)

    /* --- grafici --- */
    const scope = lab.plot({
      title: 'Oscilloscopio · 3 periodi di rete (60 ms), 100 volte più lento', height: 230, pad: { r: 50 },
      x: { min: 0, max: WIN, div: 6, fmt: (v) => num(v * 1000, 0) + ' ms' },
      y: { min: -20, max: 20, unit: 'V', count: 4, fmt: (v) => (v < 0 ? '−' : '') + num(Math.abs(v), 0) + ' V' },
      legend: [],
      aria: 'Oscilloscopio con le tensioni nei punti di misura scelti',
    });
    const lens = lab.plot({
      title: 'Lente sul condensatore · TP2', height: 230,
      x: { min: 0, max: WIN, div: 6, fmt: (v) => num(v * 1000, 0) + ' ms' },
      y: { min: 0, max: 20, unit: 'V', count: 4 },
      legend: [],
      aria: 'Ingrandimento della tensione sul condensatore, con la stima del ripple e il minimo per il 7805',
    });

    /* --- strumenti --- */
    const rOut = lab.readout({ label: 'Uscita Vout', color: 'var(--trace-1)', fmt: (v) => fmtV(v) });
    const rRip = lab.readout({ label: 'Ripple su C', color: 'var(--trace-2)', fmt: fmtRip });
    const rMin = lab.readout({ label: 'Minimo su C', color: 'var(--trace-2)', fmt: (v) => fmtV(v) });
    const rPow = lab.readout({ label: 'Calore nel 7805', color: 'var(--trace-4)', fmt: fmtW });
    const rEff = lab.readout({ label: 'Rendimento', color: 'var(--trace-3)', fmt: (v) => num(v * 100, 0) + NB + '%', max: 1 });
    const rSt = lab.readout({ label: 'Stato', color: 'var(--trace-1)' });

    /* --- comandi --- */
    const g1 = lab.group('Dalla presa al raddrizzatore');
    lab.choice({
      into: g1, label: 'Secondario del trasformatore (efficace)', value: 12,
      options: SECONDARI.map((v) => ({ value: v, label: v + ' V' })),
      onChange: (v) => { st.vrms = v; st.dirty = true; },
    });
    lab.choice({
      into: g1, label: 'Raddrizzatore', value: 'ponte',
      options: [{ value: 'semionda', label: 'Semionda · 1 diodo' }, { value: 'ponte', label: 'Ponte · 4 diodi' }],
      onChange: (v) => { st.mode = v; st.dirty = true; build(); },
    });
    const g2 = lab.group('Condensatore, regolatore e carico');
    lab.slider({
      into: g2, label: 'Condensatore C', min: 100e-6, max: 10e-3, series: 'E6', value: 2200e-6, fmt: fmtC,
      help: 'Elettrolitico: da 100 µF a 10.000 µF', onInput: (v) => { st.C = v; st.dirty = true; },
    });
    lab.slider({
      into: g2, label: 'Corrente del carico', min: 0.01, max: 1, step: 0.01, value: 0.5, fmt: fmtI,
      help: 'Il carico è una resistenza scelta per questa corrente a 5 V', onInput: (v) => { st.I = v; st.dirty = true; },
    });
    lab.toggle({ into: g2, label: 'Condensatore', on: 'collegato', off: 'tolto', value: true, onChange: (v) => { st.cOn = v; st.dirty = true; build(); } });
    lab.toggle({ into: g2, label: 'Regolatore 7805', on: 'inserito', off: 'scavalcato', value: true, onChange: (v) => { st.reg = v; st.dirty = true; build(); } });

    lab.challenges([
      { id: 'minimo-c', text: 'Ottieni 5 V stabili con <b>500 mA</b> di carico usando il condensatore più piccolo possibile. Quale trasformatore ti aiuta?', check: (q) => q.regulated && q.cOn && q.I >= 0.5 - 1e-9 && cBest != null && q.C <= cBest * 1.001 },
      { id: 'dropout', text: 'Porta il 7805 fuori regolazione: fai scendere le valli del [[ripple]] sotto 7 V e guarda le valli arrivare all\'uscita.', check: (q) => q.reg && q.cOn && q.vmin < 7 && q.vmax >= 7 },
      { id: 'ripple-1a', text: 'Con <b>1 A</b> di carico, tieni il [[ripple]] sul condensatore sotto <b>1 V</b>. Fai prima il conto con I/(2·f·C).', check: (q) => q.cOn && q.I >= 0.999 && q.ripple < 1 },
      { id: 'fresco', text: 'Con <b>500 mA</b>, tieni il 7805 in regolazione facendogli scaldare meno di <b>3 W</b>. Che secondario serve?', check: (q) => q.reg && q.regulated && Math.abs(q.I - 0.5) < 0.005 && q.pReg < 3 },
    ]);

    /* --- lo schema --- */
    function build() {
      const G = narrow ? NARROW : WIDE;
      lab.root.classList.toggle('alimentatore-narrow', G.narrow);
      lab.view(G.W, G.H);
      svg.innerHTML = '';
      const lay = {};
      ['zone', 'glow', 'wire', 'sym', 'flow', 'top'].forEach((k) => { lay[k] = s('g', { class: 'alimentatore-' + k }, svg); });
      const sc = { G: G, w: {}, f: {}, diodes: [], probes: {}, t: {}, txt: {} };
      const ponte = st.mode === 'ponte';
      const mkFlow = (pts) => {
        const d = typeof pts === 'string' ? pts : pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join('');
        return new EI.Flow(lay.flow, s('path', { d: d, class: 'alimentatore-fpath' }, lay.flow), { spacing: 17 });
      };
      const gray = EI.vcolor(0, 1);
      const ground = (pts) => { const w = wire(lay.wire, pts); w.style.stroke = gray; return w; };

      /* rete e trasformatore */
      const [tx, ty] = G.tr;
      const yA = ty - 30;
      const yB = ty + 30;
      const z = G.zone;
      s('rect', { x: z[0], y: z[1], width: z[2], height: z[3], rx: 12, class: 'alimentatore-mains' }, lay.zone);
      EI.s('text', { x: z[0] + z[2] / 2, y: z[1] + z[3] - 12, class: 'alimentatore-warn', 'text-anchor': 'middle', text: G.narrow ? '⚠ PERICOLO' : '⚠ 230 V · PERICOLO' }, lay.zone);
      sym.source(lay.sym, { x: G.src, y: yA, rot: 90, len: 60, kind: 'ac' });
      sc.w.mainsP = wire(lay.wire, [[G.src, yA], [tx - 24, yA]]);
      sc.w.mainsN = ground([[G.src, yB], [tx - 24, yB]]);
      sym.transformer(lay.sym, { x: tx, y: ty });
      const s1 = [tx + 64, yA];
      const s2 = [tx + 64, yB];
      sc.t.pol1 = EI.s('text', { x: tx + 54, y: yA - 9, class: 'alimentatore-pol', 'text-anchor': 'middle', text: '+' }, lay.top);
      sc.t.pol2 = EI.s('text', { x: tx + 54, y: yB + 19, class: 'alimentatore-pol', 'text-anchor': 'middle', text: '−' }, lay.top);

      /* raddrizzatore */
      const [bx, by, d] = G.br;
      const T = [bx, by - d];
      const R = [bx + d, by];
      const B = [bx, by + d];
      const Lv = [bx - d, by];
      const sx = G.sx;
      const s1Pts = [s1, [sx, s1[1]], [sx, T[1] - G.lead], [T[0], T[1] - G.lead], T];
      sc.w.s1 = wire(lay.wire, s1Pts);
      sc.f.s1 = mkFlow(s1Pts);
      let s2Pts;
      if (ponte) s2Pts = [s2, [sx, s2[1]], [sx, B[1] + G.lead], [B[0], B[1] + G.lead], B];
      else s2Pts = G.narrow ? [s2, [sx, s2[1]], [sx, s2[1] + 26]] : [s2, [sx, s2[1]], [sx, G.yG]];
      sc.w.s2 = wire(lay.wire, s2Pts);
      sc.f.s2 = mkFlow(s2Pts);
      if (!ponte && G.narrow) sym.ground(lay.sym, { x: sx, y: s2[1] + 26 });

      const defs = ponte
        ? [{ a: T, b: R, name: 'D1', pair: 1 }, { a: B, b: R, name: 'D2', pair: -1 }, { a: Lv, b: T, name: 'D3', pair: -1 }, { a: Lv, b: B, name: 'D4', pair: 1 }]
        : [{ a: T, b: R, name: 'D1', pair: 1 }];
      defs.forEach((dd) => {
        const dx = dd.b[0] - dd.a[0];
        const dy = dd.b[1] - dd.a[1];
        const len = Math.hypot(dx, dy);
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        const mx = (dd.a[0] + dd.b[0]) / 2;
        const my = (dd.a[1] + dd.b[1]) / 2;
        const glow = s('rect', { x: -len * 0.36, y: -10, width: len * 0.72, height: 20, rx: 10, class: 'alimentatore-dglow', transform: 'translate(' + mx + ' ' + my + ') rotate(' + ang + ')' }, lay.glow);
        const ds = sym.diode(lay.sym, { x: dd.a[0], y: dd.a[1], rot: ang, len: len });
        const ox = mx - bx;
        const oy = my - by;
        const on = Math.hypot(ox, oy) || 1;
        const lbl = EI.s('text', { x: mx + ox / on * 19, y: my + oy / on * 19 + 4, class: 'alimentatore-dname', 'text-anchor': 'middle', text: dd.name }, lay.top);
        sc.diodes.push({ pair: dd.pair, glow: glow, sym: ds, label: lbl, flow: mkFlow([dd.a, dd.b]), k: 0 });
      });
      dot(lay.sym, T[0], T[1]);
      dot(lay.sym, R[0], R[1]);
      if (ponte) {
        dot(lay.sym, B[0], B[1]);
        dot(lay.sym, Lv[0], Lv[1]);
        if (G.narrow) {
          const gp = [[Lv[0], Lv[1]], [Lv[0] - 24, Lv[1]], [Lv[0] - 24, Lv[1] + 22]];
          ground(gp);
          sym.ground(lay.sym, { x: Lv[0] - 24, y: Lv[1] + 22 });
          sc.f.ret = mkFlow(gp.slice().reverse());
        } else {
          const hy = B[1] + G.lead;
          ground('M' + Lv[0] + ' ' + Lv[1] + 'V' + (hy - 7) + 'A7 7 0 0 1 ' + Lv[0] + ' ' + (hy + 7) + 'V' + G.yG);
          sc.f.ret = mkFlow('M' + Lv[0] + ' ' + G.yG + 'V' + (hy + 7) + 'A7 7 0 0 0 ' + Lv[0] + ' ' + (hy - 7) + 'V' + Lv[1]);
        }
      }

      /* uscita del raddrizzatore fino al nodo del condensatore */
      const yP = G.yP;
      const yG = G.yG;
      const cx = G.node;
      const plusPts = G.narrow
        ? [R, [G.retX, R[1]], [G.retX, G.ret], [G.railX, G.ret], [G.railX, yP], [cx, yP]]
        : [R, [cx, yP]];
      sc.w.plus = [wire(lay.wire, plusPts)];
      sc.f.plus = mkFlow(plusPts);

      /* condensatore e indicatore di livello */
      const capSym = sym.capacitor(lay.sym, { x: cx, y: G.capY, rot: 90, len: 48, polar: true });
      const wCapTop = wire(lay.wire, [[cx, yP], [cx, G.capY]]);
      const wCapBot = ground([[cx, G.capY + 48], [cx, yG]]);
      if (st.cOn) {
        sc.w.plus.push(wCapTop);
        sc.f.capTop = mkFlow([[cx, yP], [cx, G.capY]]);
        sc.f.capBot = mkFlow([[cx, G.capY + 48], [cx, yG]]);
        dot(lay.sym, cx, yP);
        dot(lay.sym, cx, yG);
      } else {
        capSym.g.classList.add('alimentatore-off');
        wCapTop.classList.add('dashed', 'alimentatore-off');
        wCapBot.classList.add('dashed', 'alimentatore-off');
        wCapTop.style.stroke = gray;
      }
      EI.label(lay.top, cx + 22, G.capY + 18, 'C', { cls: 'big', anchor: 'start' });
      sc.txt.cval = EI.s('text', { x: cx + 22, y: G.capY + 36, class: 'alimentatore-val', 'text-anchor': 'start' }, lay.top);
      const [gx, gy, gh] = G.gauge;
      const gauge = s('g', { class: 'alimentatore-gauge' }, lay.top);
      s('rect', { x: gx - 5, y: gy, width: 10, height: gh, rx: 3, class: 'alimentatore-gauge-bg' }, gauge);
      sc.gaugeFill = s('rect', { x: gx - 3, y: gy + gh, width: 6, height: 0, rx: 2, class: 'alimentatore-gauge-fill' }, gauge);
      sc.gaugeMark = s('path', { d: '', class: 'alimentatore-gauge-mark' }, gauge);
      sc.gaugeText = EI.s('text', { x: gx - 9, y: 0, class: 'alimentatore-gauge-text', 'text-anchor': 'end', text: '7 V' }, gauge);
      sc.gaugeVal = EI.s('text', { x: G.narrow ? gx - 30 : gx, y: gy + gh + 16, class: 'alimentatore-gauge-val', 'text-anchor': G.narrow ? 'start' : 'middle' }, gauge);
      sc.gauge = { x: gx, y: gy, h: gh };

      /* regolatore 7805 */
      const [ix, iy, iw, ih] = G.ic;
      sc.heat = s('rect', { x: ix - 12, y: iy - 12, width: iw + 24, height: ih + 24, rx: 18, class: 'alimentatore-heat' }, lay.glow);
      const ic = sym.ic(lay.sym, {
        x: ix, y: iy, w: iw, h: ih, label: '7805',
        pins: [{ id: 'in', name: 'IN', side: 'left', at: 0.5 }, { id: 'out', name: 'OUT', side: 'right', at: 0.5 }, { id: 'gnd', name: 'GND', side: 'bottom', at: 0.5 }],
      });
      sc.chip = ic.g.querySelector('.chip');
      const wIn = wire(lay.wire, [[cx, yP], ic.in]);
      sc.w.plus.push(wIn);
      ground([ic.gnd, [ic.gnd[0], yG]]);
      dot(lay.sym, ic.gnd[0], yG);
      const xOut = st.reg ? ic.out[0] : ic.out[0] + (G.narrow ? 4 : 12);
      if (st.reg) {
        sc.f.feed = mkFlow([[cx, yP], ic.in]);
        sc.waves = [0, 1, 2].map((i) => s('path', {
          d: 'M' + (ix + iw * (0.3 + 0.2 * i)) + ' ' + (iy - 6) + 'q5 -5 0 -10t0 -10',
          class: 'alimentatore-wave',
        }, lay.glow));
        if (G.narrow) sc.waves.forEach((w) => { w.style.display = 'none'; });
      } else {
        ic.g.classList.add('alimentatore-off');
        const jx0 = ic.in[0] - 10;
        const jPts = [[jx0, yP], [jx0, G.jumpY], [xOut, G.jumpY], [xOut, yP]];
        sc.w.plus.push(wire(lay.wire, jPts));
        dot(lay.sym, jx0, yP);
        dot(lay.sym, xOut, yP);
        sc.f.feed = mkFlow([[cx, yP]].concat(jPts));
        EI.s('text', { x: (jx0 + xOut) / 2, y: G.jumpY - 8, class: 'alimentatore-dname', 'text-anchor': 'middle', text: 'scavalcato' }, lay.top);
        sc.waves = [];
      }
      sc.txt.diss = EI.s('text', { x: ic.gnd[0] + 10, y: iy + ih + 32, class: 'alimentatore-diss', 'text-anchor': 'start' }, lay.top);
      sc.txt.temp = EI.s('text', { x: ic.gnd[0] + 10, y: iy + ih + 48, class: 'alimentatore-diss temp', 'text-anchor': 'start' }, lay.top);

      /* uscita e carico */
      const [lx, ly] = G.lamp;
      sc.w.out = [wire(lay.wire, [ic.out, [G.term, yP]])];
      sc.w.out.push(wire(lay.wire, [[lx, yP], [lx, ly]]));
      ground([[lx, ly + 56], [lx, yG]]);
      sc.lamp = sym.lamp(lay.sym, { x: lx, y: ly, rot: 90, len: 56 });
      sc.lampGlow = sc.lamp.g.querySelector('.lamp-glow');
      dot(lay.sym, lx, yP);
      dot(lay.sym, lx, yG);
      sc.f.load = mkFlow([[xOut, yP], [lx, yP], [lx, yG]]);
      EI.label(lay.top, lx + 24, ly + 22, 'Carico', { anchor: 'start' });

      /* massa */
      const railX = G.narrow ? G.gnd : (ponte ? Lv[0] : sx);
      ground([[railX, yG], [G.term, yG]]);
      sym.ground(lay.sym, { x: G.gnd, y: yG });
      sc.f.railLoad = mkFlow([[lx, yG], [cx, yG]]);
      sc.f.railBridge = mkFlow([[cx, yG], [railX, yG]]);
      if (!ponte && !G.narrow) dot(lay.sym, sx, yG);

      /* morsetti d'uscita */
      s('circle', { cx: G.term, cy: yP, r: 5, class: 'alimentatore-term' }, lay.top);
      s('circle', { cx: G.term, cy: yG, r: 5, class: 'alimentatore-term' }, lay.top);
      if (G.narrow) {
        EI.s('text', { x: G.term + 2, y: yP - 14, class: 'alimentatore-dname', 'text-anchor': 'end', text: 'Vout' }, lay.top);
        sc.txt.vout = EI.s('text', { x: G.term + 6, y: yP + 34, class: 'alimentatore-vout', 'text-anchor': 'end' }, lay.top);
      } else {
        EI.label(lay.top, G.term + 14, yP + 1, '+', { cls: 'big', anchor: 'start' });
        EI.label(lay.top, G.term + 14, yG + 1, '0 V', { anchor: 'start' });
        EI.label(lay.top, G.term, (yP + yG) / 2 - 12, 'Vout', { cls: 'big' });
        sc.txt.vout = EI.s('text', { x: G.term, y: (yP + yG) / 2 + 10, class: 'alimentatore-vout', 'text-anchor': 'middle' }, lay.top);
      }

      /* titoli delle tappe */
      const addTitles = (list, y) => list.forEach(([key, x, label]) => {
        const t = EI.s('text', { x: x, y: y, class: 'alimentatore-title', 'text-anchor': 'middle', text: label || (ponte ? 'PONTE DI GRAETZ' : 'SEMIONDA') }, lay.top);
        sc.t['title-' + key] = t;
        sc.txt[key] = EI.s('text', { x: x, y: y + 16, class: 'alimentatore-val', 'text-anchor': 'middle' }, lay.top);
      });
      addTitles(G.titles, G.titleY);
      if (G.titles2) addTitles(G.titles2, G.title2Y);

      /* didascalia dell'istante */
      sc.caption = EI.s('text', { x: G.caption[0], y: G.caption[1], class: 'alimentatore-caption', 'text-anchor': 'middle' }, lay.top);

      /* punti di misura */
      const tps = {
        tp1: { color: 'var(--trace-3)', aria: 'TP1: tensione del secondario del trasformatore' },
        tp2: { color: 'var(--trace-2)', aria: 'TP2: tensione sul condensatore, ingresso del 7805' },
        tp3: { color: 'var(--trace-1)', aria: 'TP3: tensione d\'uscita del 7805' },
        tp4: { color: 'var(--trace-4)', aria: 'TP4: pinza amperometrica, corrente nei diodi' },
      };
      const [cx4, cy4] = G.tp.tp4;
      s('ellipse', { cx: cx4, cy: cy4, rx: 6, ry: 13, class: 'alimentatore-clamp' }, lay.top);
      Object.keys(tps).forEach((id) => {
        const [px, py] = G.tp[id];
        sc.probes[id] = sym.probe(lay.top, {
          x: px, y: py, id: id, label: id.toUpperCase(), color: tps[id].color, aria: tps[id].aria,
          onClick: toggleProbe,
        });
        sc.probes[id].set(st.probes[id]);
      });

      S = sc;
      if (st.dirty) resim(); else updateStatic();
      lab.invalidate();
    }

    function toggleProbe(id) {
      st.probes[id] = !st.probes[id];
      if (S) S.probes[id].set(st.probes[id]);
      scopeLegend();
      lab.invalidate();
    }

    function scopeLegend() {
      const items = [];
      if (st.probes.tp1) items.push({ label: 'TP1 · secondario', color: 'var(--trace-3)' });
      if (st.probes.tp2) {
        items.push({ label: 'TP2 · condensatore', color: 'var(--trace-2)' });
        if (st.cOn) items.push({ label: 'senza C', color: GHOST });
      }
      if (st.probes.tp3) items.push({ label: 'TP3 · uscita del 7805', color: 'var(--trace-1)' });
      if (st.probes.tp4) items.push({ label: 'TP4 · corrente nei diodi (scala a destra)', color: 'var(--trace-4)' });
      if (!items.length) items.push({ label: 'tocca TP1, TP2, TP3 o TP4 nello schema', color: GHOST });
      scope.setLegend(items);
    }

    /* --- simulazione e parti che cambiano solo con i comandi --- */
    function resim() {
      st.dirty = false;
      const R = labSim(st);
      // i comandi con cui è stata fatta questa simulazione: le sfide li leggono da qui, sempre coerenti con i risultati
      R.q = { vrms: st.vrms, mode: st.mode, C: st.C, cOn: st.cOn, reg: st.reg, I: st.I };
      R.pts = {};
      ['vs', 'vr', 'vc', 'vout', 'iD'].forEach((key) => {
        const a = new Array(R.n);
        for (let i = 0; i < R.n; i++) a[i] = [R.t[i], R[key][i]];
        R.pts[key] = a;
      });
      // istante mostrato con il movimento ridotto: la ricarica nella semionda positiva (o il suo picco)
      const per = Math.round(R.T / R.dt);
      let bi = Math.round(R.T / 4 / R.dt);
      let best = 0;
      for (let i = 0; i < per; i++) if (R.vs[i] > 0 && R.iD[i] > best) { best = R.iD[i]; bi = i; }
      if (st.cOn) bi = Math.min(per - 1, bi + 2);
      R.tStatic = bi * R.dt;
      st.sim = R;
      if (cBest == null) {
        cBest = C_LIST[C_LIST.length - 1];
        search: for (const C of C_LIST) {
          for (const vrms of SECONDARI) {
            for (const mode of ['ponte', 'semionda']) {
              if (labSim({ vrms: vrms, mode: mode, C: C, cOn: true, I: 0.5, reg: true }).regulated) { cBest = C; break search; }
            }
          }
        }
      }
      updateStatic();
    }

    function stateLabel() {
      const R = st.sim;
      if (!st.reg) return { text: 'senza regolatore', color: 'var(--trace-2)', state: 'warn' };
      if (!R.regulated) return { text: 'fuori regolazione', color: 'var(--trace-4)', state: 'danger' };
      if (model.junctionTemp(R.pReg) > TJ_MAX) return { text: 'troppo caldo', color: 'var(--trace-4)', state: 'danger' };
      return { text: 'regolato', color: 'var(--trace-1)', state: 'ok' };
    }

    function updateStatic() {
      const R = st.sim;
      if (!R || !S) return;
      const ponte = st.mode === 'ponte';
      const t = S.txt;
      const set = (el, txt) => { if (el && el.textContent !== txt) el.textContent = txt; };
      set(t.rete, S.G.narrow ? '230 V ~' : '230 V · 50 Hz');
      set(t.tr, '230 → ' + st.vrms + NB + 'V');
      set(t.br, ponte ? '4 diodi · −1,4 V' : '1 diodo · −0,7 V');
      set(t.c, st.cOn ? fmtC(st.C) : 'tolto');
      set(t.cval, st.cOn ? fmtC(st.C) : 'tolto');
      set(t.reg, st.reg ? '7805' : 'scavalcato');
      set(t.load, fmtI(st.I) + ' · ' + si(VREG / st.I, 'Ω', { trim: true }));
      const tj = model.junctionTemp(R.pReg);
      set(t.diss, st.reg ? fmtW(R.pReg) : '');
      set(t.temp, st.reg ? '≈' + NB + Math.round(tj) + NB + '°C' : '');
      if (t.temp) t.temp.classList.toggle('hot', st.reg && tj > TJ_MAX);
      const stt = stateLabel();
      rSt.text(stt.text);
      rSt.el.style.setProperty('--rc', stt.color);
      rSt.state(stt.state);
      rOut.state(!st.reg && R.voutAvg > VREG * 1.1 ? 'danger' : R.regulated ? 'ok' : st.reg ? 'warn' : '');
      rMin.state(st.reg ? (R.vmin < VREG + DROPOUT ? 'danger' : R.vmin < VREG + DROPOUT + 0.5 ? 'warn' : 'ok') : '');
      rPow.state(st.reg ? (tj > TJ_MAX ? 'danger' : R.pReg > 4 ? 'warn' : '') : '');
      scopeLegend();
      lensLegend();
      lab.explain(explainText());
      lab.check(Object.assign({}, R.q, {
        regulated: R.regulated, vmin: R.vmin, vmax: R.vmax, ripple: R.ripple, pReg: R.pReg,
      }));
    }

    function lensLegend() {
      const items = [
        { label: 'TP2 · condensatore', color: 'var(--trace-2)' },
        st.cOn ? { label: 'stima ' + (st.mode === 'ponte' ? 'I/(2·f·C)' : 'I/(f·C)'), color: '#9fb6ad' } : { label: 'senza condensatore', color: GHOST },
      ];
      if (st.lensShow7) items.push({ label: '7 V: minimo per il 7805', color: 'var(--trace-4)' });
      lens.setLegend(items);
    }

    function explainText() {
      const R = st.sim;
      const ponte = st.mode === 'ponte';
      const hz = ponte ? 100 : 50;
      const pk = model.rectifiedPeak(st.vrms, st.mode);
      if (!st.cOn) {
        if (!st.reg) return 'Senza condensatore e senza regolatore il carico riceve le «gobbe» del raddrizzatore: da 0 a <b>' + fmtV(pk, 1) + '</b>, ' + hz + ' volte al secondo. Una lampadina tremolerebbe, un circuito digitale si spegnerebbe e riaccenderebbe di continuo.';
        return 'Senza [[condensatore-di-livellamento]] all\'ingresso del 7805 arriva la tensione pulsante del raddrizzatore: sale fino a <b>' + fmtV(pk, 1) + '</b> e torna a zero ' + hz + ' volte al secondo. Il regolatore tiene i 5 V solo quando l\'ingresso supera 7 V: nelle valli l\'uscita crolla e il carico resta a secco. Rimetti il condensatore.';
      }
      const est = model.rippleEstimate(st.I, st.C, st.mode);
      if (!st.reg) {
        return 'Regolatore scavalcato: il carico pensato per 5 V riceve direttamente la tensione del condensatore, in media <b>' + fmtV(R.vavg, 1) + '</b> con <b>' + fmtRip(R.ripple) + '</b> di [[ripple]]. Assorbe <b>' + fmtI(R.iAvg) + '</b> invece di ' + fmtI(st.I) + ' e scalda circa <b>' + num(R.pOut / (VREG * st.I), 0) + ' volte</b> di più: un circuito vero si brucerebbe.';
      }
      if (!R.regulated) {
        return 'Nelle valli del [[ripple]] l\'ingresso scende a <b>' + fmtV(R.vmin) + '</b>, sotto i <b>7 V</b> che servono al 7805: 5 V più 2 V di [[tensione-di-dropout|dropout]]. Il regolatore esce di regolazione e le valli arrivano all\'uscita, che scende fino a <b>' + fmtV(R.voutMin) + '</b>. Rimedi: più capacità, meno corrente o un secondario con più volt.';
      }
      const tj = model.junctionTemp(R.pReg);
      if (tj > TJ_MAX) {
        return 'L\'uscita è ferma a 5 V, ma il 7805 deve trasformare in calore <b>' + fmtW(R.pReg) + '</b>: anche sul [[dissipatore]] la giunzione arriverebbe a circa <b>' + Math.round(tj) + NB + '°C</b>, oltre i 125 °C ammessi, e la protezione termica lo spegnerebbe. Troppa tensione in ingresso: prova un secondario con meno volt.';
      }
      const base = (ponte ? 'Il ponte' : 'Il diodo') + ' ricarica C vicino ai picchi (<b>' + fmtV(R.vmax, 1) + '</b>); tra un picco e l\'altro è C da solo ad alimentare il carico e scende di <b>' + fmtRip(R.ripple) + '</b>: è il [[ripple]], a ' + hz + NB + 'Hz (la stima I/(' + (ponte ? '2·' : '') + 'f·C), che fa scaricare C per tutto il tempo tra due picchi, dà ' + fmtRip(est) + '). L\'ingresso non va mai sotto <b>' + fmtV(R.vmin) + '</b>, sopra i 7 V che servono: il [[regolatore-lineare]] tiene l\'uscita a <b>5,00 V</b>';
      if (R.pReg > 4) return base + ', ma spreca <b>' + fmtW(R.pReg) + '</b> in calore (circa ' + Math.round(tj) + NB + '°C sul [[dissipatore]]): il [[rendimento]] è solo del <b>' + num(R.eff * 100, 0) + '%</b>.';
      return base + ' e scalda <b>' + fmtW(R.pReg) + '</b>; il [[rendimento]] è del ' + num(R.eff * 100, 0) + '%.';
    }

    /* --- oscilloscopio e lente --- */
    function drawScope(k, R) {
      const ymax = YMAX[st.vrms];
      const bip = st.probes.tp1;
      scope.setRange('y', bip ? -ymax : 0, ymax);
      if (st.probes.tp4) {
        const im = niceCeil(R.iPeak * 1.1);
        scope.opts.y2 = { min: bip ? -im : 0, max: im, unit: 'A', color: P.t4, count: 4 };
      } else scope.opts.y2 = null;
      scope.clear();
      if (st.probes.tp2 || st.probes.tp3) scope.hline(VREG + DROPOUT, { color: P.t4, alpha: 0.45, label: '7 V' });
      const live = !lab.reduced;
      const tr = [];
      if (st.probes.tp1) tr.push({ pts: R.pts.vs, color: P.t3 });
      if (st.probes.tp2) {
        if (st.cOn) scope.line(R.pts.vr, { color: GHOST, width: 1.4, dash: [4, 4], glow: false, alpha: 0.9 });
        tr.push({ pts: R.pts.vc, color: P.t2 });
      }
      if (st.probes.tp3) tr.push({ pts: R.pts.vout, color: P.t1 });
      if (st.probes.tp4) tr.push({ pts: R.pts.iD, color: P.t4, axis: 'y2' });
      tr.forEach((q) => {
        if (live) {
          scope.line(q.pts, { color: q.color, width: 1.5, alpha: 0.3, glow: false, axis: q.axis });
          scope.line(q.pts.slice(0, k + 1), { color: q.color, width: 2.2, axis: q.axis });
        } else scope.line(q.pts, { color: q.color, width: 2.2, axis: q.axis });
      });
      scope.vline(st.tc, { color: P.ink, alpha: 0.55, dash: [3, 4] });
      tr.forEach((q) => scope.point(st.tc, q.pts[k][1], { color: q.color, r: 3.6, ring: false, axis: q.axis }));
    }

    function drawLens(k, R, dt) {
      const thr = VREG + DROPOUT;
      let lo = st.cOn ? Math.min(R.vmin, R.vmax - R.estimate) : 0;
      let hi = R.vmax;
      if (st.cOn && thr < lo && thr > lo - Math.max(1.5, (hi - lo) * 0.8)) lo = thr;
      const span = Math.max(hi - lo, 0.04);
      lo = Math.max(0, lo - span * 0.18);
      hi += span * 0.14;
      if (!st.lens || lab.reduced || !dt) st.lens = { lo: lo, hi: hi };
      else st.lens = { lo: EI.approach(st.lens.lo, lo, dt, 5), hi: EI.approach(st.lens.hi, hi, dt, 5) };
      const L = st.lens;
      const sp = L.hi - L.lo;
      const dec = sp < 0.3 ? 2 : sp < 3 ? 1 : 0;
      lens.opts.y.fmt = (v) => num(v, dec) + ' V';
      lens.setRange('y', L.lo, L.hi);
      lens.clear();
      const show7 = thr > L.lo && thr < L.hi;
      if (show7 !== st.lensShow7) { st.lensShow7 = show7; lensLegend(); }
      if (show7) {
        lens.band(L.lo, thr, { color: P.t4, alpha: 0.08 });
        lens.hline(thr, { color: P.t4, alpha: 0.75, label: '7 V' });
      }
      if (st.cOn) {
        // stima da manuale: il condensatore si scarica con I costante per tutto il tempo tra due picchi
        const Tr = R.T / model.pulses(st.mode);
        const tp = R.T / 4;
        const slope = st.I / st.C;
        lens.line((t) => {
          const x = ((t - tp) % Tr + Tr) % Tr;
          return R.vmax - slope * x;
        }, { color: '#9fb6ad', width: 1.4, dash: [6, 5], glow: false, alpha: 0.9, samples: 600 });
      }
      const live = !lab.reduced;
      if (live) {
        lens.line(R.pts.vc, { color: P.t2, width: 1.5, alpha: 0.3, glow: false });
        lens.line(R.pts.vc.slice(0, k + 1), { color: P.t2, width: 2.4, fill: P.t2, fillAlpha: 0.06, fillTo: L.lo });
      } else lens.line(R.pts.vc, { color: P.t2, width: 2.4, fill: P.t2, fillAlpha: 0.06, fillTo: L.lo });
      // minimo della tensione: il punto critico per il regolatore
      let im = 0;
      for (let i = 1; i < R.n; i++) if (R.vc[i] < R.vc[im]) im = i;
      if (st.cOn) lens.point(R.t[im], R.vc[im], { color: R.vmin < thr ? P.t4 : P.t2, r: 3.4, label: 'min ' + num(R.vmin, 2) + ' V', labelPos: 'down' });
      lens.vline(st.tc, { color: P.ink, alpha: 0.55, dash: [3, 4] });
      lens.point(st.tc, R.vc[k], { color: P.t2, r: 3.6, ring: false });
    }

    /* --- un fotogramma --- */
    function frame(dt, time) {
      if (st.dirty) resim();
      const R = st.sim;
      const sc = S;
      if (!R || !sc) return;
      const snap = lab.reduced || !dt;
      if (lab.reduced) st.tc = R.tStatic;
      else if (dt) st.tc = (st.tc + dt / SLOW) % WIN;
      const k = clamp(Math.round(st.tc / R.dt), 0, R.n - 1);
      const vs = R.vs[k];
      const vc = R.vc[k];
      const vo = R.vout[k];
      const iD = R.iD[k];
      const iL = R.iL[k];
      const ponte = st.mode === 'ponte';
      const pos = vs >= 0;
      const isec = ponte ? (pos ? iD : -iD) : iD;
      const iC = st.cOn ? iD - iL : 0;
      const imax = Math.max(R.iPeak, 1e-3);
      const sp = (i) => EI.speedFor(i, imax);
      const vpk = model.peak(st.vrms);
      const col = (v) => EI.vcolor(v, vpk);

      // tensioni dei due fili del secondario, misurate rispetto alla massa del circuito
      let v1;
      let v2;
      if (!ponte) { v1 = vs; v2 = 0; } else if (iD > 1e-9 && pos) { v1 = vs - VD; v2 = -VD; } else if (iD > 1e-9) { v1 = -VD; v2 = -vs - VD; } else { v1 = (vc + vs) / 2; v2 = (vc - vs) / 2; }
      sc.w.mainsP.style.stroke = EI.vcolor(325 * Math.sin(2 * Math.PI * F * st.tc), 325);
      sc.w.s1.style.stroke = col(v1);
      sc.w.s2.style.stroke = col(v2);
      sc.w.plus.forEach((w) => { w.style.stroke = col(vc); });
      sc.w.out.forEach((w) => { w.style.stroke = col(vo); });
      const a = clamp(Math.abs(vs) / vpk, 0, 1);
      sc.t.pol1.textContent = pos ? '+' : '−';
      sc.t.pol2.textContent = pos ? '−' : '+';
      sc.t.pol1.style.opacity = sc.t.pol2.style.opacity = (0.15 + 0.85 * a).toFixed(2);

      // cariche che scorrono (verso convenzionale)
      const f = sc.f;
      f.s1.set(sp(isec));
      f.s2.set(sp(ponte ? -isec : -iD));
      sc.diodes.forEach((dd) => {
        const i = ponte ? ((dd.pair > 0) === pos ? iD : 0) : iD;
        dd.flow.set(sp(i));
        const target = i > 1e-9 ? 0.4 + 0.6 * Math.sqrt(i / imax) : 0;
        dd.k = snap ? target : EI.approach(dd.k, target, dt, 24);
        dd.glow.style.opacity = dd.k.toFixed(3);
        dd.sym.g.style.color = dd.k > 0.02 ? mixHex(SYM, FLOW, dd.k) : '';
        dd.sym.g.style.opacity = (0.5 + 0.5 * Math.min(1, dd.k * 2.5)).toFixed(2);
        dd.label.classList.toggle('on', dd.k > 0.2);
      });
      if (f.ret) f.ret.set(sp(iD));
      f.plus.set(sp(iD));
      if (f.capTop) { f.capTop.set(sp(iC)); f.capBot.set(sp(iC)); }
      f.feed.set(sp(iL));
      f.load.set(sp(iL));
      f.railLoad.set(sp(iL));
      f.railBridge.set(sp(iD));
      Object.keys(f).forEach((key) => f[key].step(dt));
      sc.diodes.forEach((dd) => dd.flow.step(dt));

      // didascalia: che cosa succede in questo istante
      let cap;
      if (iD > 1e-9) cap = (ponte ? (pos ? 'D1 e D4 conducono' : 'D2 e D3 conducono') : 'D1 conduce') + (st.cOn ? (ponte ? ': ricaricano C' : ': ricarica C') : ': corrente al carico');
      else if (st.cOn && iL > 1e-9) cap = 'Diodi spenti: C alimenta da solo il carico';
      else if (!ponte && !pos) cap = 'Semionda negativa: D1 blocca';
      else cap = 'Tensione troppo bassa: nessun diodo conduce';
      if (cap !== sc.capText) { sc.caption.textContent = cap; sc.capText = cap; }

      // livello del condensatore
      const ymax = YMAX[st.vrms];
      const g = sc.gauge;
      const hFill = clamp(vc / ymax, 0, 1) * g.h;
      sc.gaugeFill.setAttribute('y', (g.y + g.h - hFill).toFixed(1));
      sc.gaugeFill.setAttribute('height', hFill.toFixed(1));
      sc.gaugeFill.style.fill = col(vc);
      const ym = g.y + g.h - (VREG + DROPOUT) / ymax * g.h;
      if (sc.gaugeY !== ym) {
        sc.gaugeY = ym;
        sc.gaugeMark.setAttribute('d', 'M' + (g.x - 8) + ' ' + ym.toFixed(1) + 'H' + (g.x + 8));
        sc.gaugeText.setAttribute('y', (ym + 4).toFixed(1));
      }
      const gv = st.cOn ? fmtV(vc, 1) : '';
      if (sc.gaugeVal.textContent !== gv) sc.gaugeVal.textContent = gv;

      // il regolatore si scalda
      const tj = st.reg ? model.junctionTemp(R.pReg) : TA;
      st.heatT = snap ? tj : EI.approach(st.heatT, tj, dt, 3);
      const kh = clamp((st.heatT - 35) / 100, 0, 1);
      const hot = mixHex('#ffc04d', '#ff3b30', clamp((st.heatT - 70) / 70, 0, 1));
      sc.heat.style.fill = hot;
      sc.heat.style.opacity = (kh * 0.85).toFixed(3);
      if (sc.chip) sc.chip.style.stroke = kh > 0.04 ? mixHex(SYM, hot, Math.min(1, kh * 1.4)) : '';
      const kw = st.reg ? clamp(R.pReg / 8, 0, 1) : 0;
      sc.waves.forEach((w, i) => {
        const ph = lab.reduced ? 0.5 : ((time || 0) * 0.55 + i / 3) % 1;
        w.style.transform = 'translateY(' + (-12 * ph).toFixed(1) + 'px)';
        w.style.opacity = (kw * Math.sin(Math.PI * ph)).toFixed(3);
      });

      // il carico
      const over = vo > VREG * 1.2;
      sc.lamp.setGlow(clamp(0.8 * Math.pow(vo / VREG, 2), 0, 1));
      if (sc.lampGlow) sc.lampGlow.style.fill = over ? '#ff6b4a' : '';
      sc.lamp.g.style.color = over ? '#ff8a6a' : '';
      const vt = fmtV(vo);
      if (sc.txt.vout.textContent !== vt) sc.txt.vout.textContent = vt;
      sc.txt.vout.classList.toggle('bad', over || (st.reg && vo < VREG - 0.01));
      if (sc.txt.out) {
        // uscita ferma oppure l'intervallo in cui oscilla
        const ot = R.outRipple < 0.01 ? fmtV(R.voutAvg) + ' stabili' : num(R.voutMin, 1) + '–' + num(R.voutMax, 1) + NB + 'V';
        if (sc.txt.out.textContent !== ot) sc.txt.out.textContent = ot;
      }

      // strumenti (con un inseguimento morbido dei valori)
      const tgt = { out: R.voutAvg, rip: R.ripple, min: R.vmin, pow: st.reg ? R.pReg : 0, eff: R.eff };
      if (!st.disp || snap) st.disp = Object.assign({}, tgt);
      else Object.keys(tgt).forEach((key) => { st.disp[key] = EI.approach(st.disp[key], tgt[key], dt, 7); });
      rOut.set(st.disp.out);
      rRip.set(st.disp.rip);
      rMin.set(st.disp.min);
      if (st.reg) rPow.set(st.disp.pow); else rPow.text('—');
      rEff.set(st.disp.eff);

      drawScope(k, R);
      drawLens(k, R, dt);
    }

    lab.loop(frame);

    // cambio di composizione quando cambia la larghezza (rotazione del telefono, finestra ridimensionata)
    let raf = 0;
    let dead = false;
    const onResize = () => {
      const n = wantNarrow();
      if (n === narrow || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (dead) return;
        narrow = wantNarrow();
        build();
      });
    };
    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && stageEl) {
      ro = new ResizeObserver(onResize);
      ro.observe(stageEl);
    } else window.addEventListener('resize', onResize);
    lab.onDestroy(() => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', onResize);
    });

    lab.onReset(() => {
      st.probes = Object.assign({}, DEF_PROBES);
      st.tc = 0;
      st.disp = null;
      st.lens = null;
      st.dirty = true;
      if (S) Object.keys(S.probes).forEach((id) => S.probes[id].set(st.probes[id]));
      scopeLegend();
    });

    resim();
    build();
  }

  /* ---------- illustrazioni ---------- */

  const f1 = (x) => (Math.round(x * 10) / 10).toString();
  const P2 = (p) => f1(p[0]) + ' ' + f1(p[1]);

  // Scheda di un alimentatore lineare vista di fronte, con i componenti numerati lungo il percorso della corrente.
  // narrow = versione per il telefono: niente scritte minute sul disegno, numeri grandi e legenda sotto.
  function boardArt(narrow) {
    // scheda in prospettiva
    let o = '<path class="f-soft" d="M98 262L612 262L634 238L120 238Z"/>' +
      '<path class="f-paper" d="M98 262H612V271H98Z"/><path class="f-paper" d="M612 262L634 238V247L612 271Z"/>' +
      '<rect class="f-line" x="128" y="271" width="10" height="9"/><rect class="f-line" x="574" y="271" width="10" height="9"/>';
    // spina, cavo e avviso
    o += '<path class="f-line" d="M38 214C70 214 84 246 132 248" stroke-width="7"/>' +
      '<rect class="f-paper" x="10" y="200" width="30" height="28" rx="6"/>' +
      '<rect class="f-fill" x="2" y="206" width="9" height="4" rx="1"/><rect class="f-fill" x="2" y="218" width="9" height="4" rx="1"/>' +
      '<path class="f-p" d="M42 150L62 184H22Z"/><text class="f-p-text" x="42" y="180" text-anchor="middle">!</text>';
    if (!narrow) o += '<text class="f-p-text" x="70" y="166">Rete 230 V</text><text class="f-small" x="70" y="182">pericolosa: solo</text><text class="f-small" x="70" y="196">nel laboratorio virtuale</text>';
    // fusibile
    o += '<rect class="f-line" x="140" y="236" width="6" height="12"/><rect class="f-line" x="176" y="236" width="6" height="12"/>' +
      '<rect class="f-paper" x="138" y="232" width="46" height="12" rx="6"/><rect class="f-soft" x="138" y="232" width="9" height="12" rx="3"/><rect class="f-soft" x="175" y="232" width="9" height="12" rx="3"/>' +
      '<path class="f-line" d="M147 238H175" stroke-width="1.2"/>';
    if (!narrow) o += '<text class="f-small" x="161" y="224" text-anchor="middle">fusibile</text>';
    // 1 · trasformatore: nucleo a lamierini con l'avvolgimento nelle finestre
    o += '<rect class="f-paper" x="196" y="132" width="112" height="112" rx="3"/>';
    for (let y = 138; y < 244; y += 6) o += '<path class="f-thin" d="M196 ' + y + 'H308"/>';
    o += '<rect class="f-accent-soft" x="212" y="150" width="26" height="76" rx="4"/><rect class="f-accent-soft" x="266" y="150" width="26" height="76" rx="4"/>' +
      '<rect class="f-paper" x="238" y="150" width="28" height="76"/>';
    for (let y = 156; y < 226; y += 7) o += '<path class="f-thin" d="M214 ' + y + 'H236M268 ' + y + 'H290"/>';
    o += '<path class="f-line" d="M190 132H314M190 244H314" stroke-width="3"/>';
    // 2 · ponte: quattro diodi in piedi
    for (let i = 0; i < 4; i++) {
      const x = 330 + i * 18;
      o += '<path class="f-line" d="M' + (x + 5) + ' 212V200H' + (x + 12) + 'V252M' + (x + 5) + ' 238V252" stroke-width="1.6"/>' +
        '<rect class="f-fill" x="' + x + '" y="212" width="10" height="26" rx="4"/><rect class="f-paper" x="' + x + '" y="214" width="10" height="4"/>';
    }
    // 3 · condensatore elettrolitico
    o += '<path class="f-line" d="M418 250V262M446 250V262" stroke-width="2"/>' +
      '<path class="f-soft" d="M402 134Q402 126 410 126H454Q462 126 462 134V250H402Z"/>' +
      '<rect class="f-paper" x="446" y="128" width="12" height="122"/>' +
      '<text class="f-mono" x="452" y="160" text-anchor="middle">−</text><text class="f-mono" x="452" y="196" text-anchor="middle">−</text><text class="f-mono" x="452" y="232" text-anchor="middle">−</text>' +
      '<ellipse class="f-paper" cx="432" cy="128" rx="28" ry="6"/><path class="f-thin" d="M422 128H442M432 124V132"/>' +
      '<text class="f-mono" x="424" y="190" text-anchor="middle" transform="rotate(-90 424 190)"' + (narrow ? ' style="font-size:15px"' : '') + '>2200 µF 35 V</text>';
    // 4 · regolatore 7805 avvitato al dissipatore
    o += '<rect class="f-paper" x="482" y="120" width="70" height="124" rx="3"/>';
    for (let x = 490; x < 552; x += 9) o += '<path class="f-thin" d="M' + x + ' 120V244"/>';
    o += '<rect class="f-soft" x="496" y="140" width="42" height="34" rx="2"/><circle class="f-paper" cx="517" cy="155" r="6.5"/><circle class="f-line" cx="517" cy="155" r="2.5"/>' +
      '<rect class="f-fill" x="496" y="172" width="42" height="40" rx="2"/>' +
      '<text class="alimentatore-fig-inv" x="517" y="' + (narrow ? 198 : 196) + '" text-anchor="middle"' + (narrow ? ' style="font-size:15px"' : '') + '>7805</text>' +
      '<path class="f-line" d="M505 212V262M517 212V262M529 212V262" stroke-width="2"/>';
    for (let i = 0; i < 3; i++) {
      const x = 498 + i * 18;
      o += '<path class="f-accent alimentatore-fig-heat" style="animation-delay:' + (i * 0.8) + 's" d="M' + x + ' 112q5 -6 0 -12t0 -12"/>';
    }
    // 5 · morsetti d'uscita
    o += '<rect class="f-n" x="574" y="214" width="44" height="36" rx="4"/><rect class="f-fill" x="580" y="230" width="12" height="12" rx="2"/><rect class="f-fill" x="600" y="230" width="12" height="12" rx="2"/>' +
      '<circle class="f-paper" cx="586" cy="220" r="5"/><circle class="f-paper" cx="606" cy="220" r="5"/><path class="f-line" d="M583 220H589M603 220H609" stroke-width="1.4"/>';
    if (!narrow) {
      o += '<text class="f-small" x="586" y="292" text-anchor="middle">+5 V</text><text class="f-small" x="606" y="304" text-anchor="middle">0 V</text>' +
        '<path class="f-thin" d="M586 250V282M606 250V294"/>';
    }
    return o;
  }

  function boardFigure() {
    // etichette numerate accanto ai pezzi (schermi larghi)
    const tag = (n, x, y, lines, lx, ly) => {
      let t = '<path class="f-thin" d="M' + x + ' ' + (y + 10) + 'L' + lx + ' ' + ly + '"/>' +
        '<circle class="f-accent-soft" cx="' + x + '" cy="' + (y - 4) + '" r="10"/><text class="f-accent-text" x="' + x + '" y="' + y + '" text-anchor="middle">' + n + '</text>';
      lines.forEach((l, i) => { t += '<text class="' + (i ? 'f-small' : 'f-text') + '" x="' + (x + 16) + '" y="' + (y + i * 15) + '">' + l + '</text>'; });
      return t;
    };
    let wide = '<svg viewBox="0 0 640 312" class="alimentatore-fig-wide">' + boardArt(false);
    wide += tag(1, 200, 30, ['Trasformatore', '230 V → 12 V, isola dalla rete'], 230, 132);
    wide += tag(2, 318, 92, ['Ponte di diodi', '4 × 1N4007'], 340, 200);
    wide += tag(3, 404, 30, ['Condensatore', 'serbatoio contro il ripple'], 420, 120);
    wide += tag(4, 560, 92, ['7805 sul', 'dissipatore'], 546, 128);
    wide += tag(5, 560, 168, ['Uscita', '5 V'], 584, 210);
    wide += '</svg>';
    // telefono: numeri grandi sul disegno e legenda leggibile sotto
    const mark = (n, x, y) => '<circle class="f-accent-soft" cx="' + x + '" cy="' + y + '" r="17"/><text class="f-accent-text" x="' + x + '" y="' + (y + 8) + '" text-anchor="middle" style="font-size:22px">' + n + '</text>';
    let small = '<svg viewBox="0 76 640 448" class="alimentatore-fig-narrow" role="img" aria-label="Scheda di un alimentatore lineare con i pezzi numerati: trasformatore, ponte di diodi, condensatore, 7805 sul dissipatore, morsetti d\'uscita">' + boardArt(true);
    small += mark(1, 252, 106) + mark(2, 357, 176) + mark(3, 432, 96) + mark(4, 578, 124) + mark(5, 596, 188);
    const rows = [
      ['1', 'Trasformatore: 230 V → 12 V, isola dalla rete'],
      ['2', 'Ponte di quattro diodi 1N4007'],
      ['3', 'Condensatore: serbatoio contro il ripple'],
      ['4', 'Regolatore 7805 sul dissipatore'],
      ['5', 'Morsetti d\'uscita: 5 V'],
      ['!', 'Rete 230 V: pericolosa, solo nel laboratorio virtuale'],
    ];
    rows.forEach(([n, t], i) => {
      const y = 330 + i * 36;
      small += n === '!'
        ? '<path class="f-p" d="M24 ' + (y - 16) + 'L40 ' + (y + 12) + 'H8Z"/><text class="f-p-text" x="24" y="' + (y + 8) + '" text-anchor="middle" style="font-size:17px">!</text>'
        : '<circle class="f-accent-soft" cx="24" cy="' + y + '" r="14"/><text class="f-accent-text" x="24" y="' + (y + 7) + '" text-anchor="middle" style="font-size:19px">' + n + '</text>';
      small += '<text class="' + (n === '!' ? 'f-p-text' : 'f-text') + '" x="52" y="' + (y + 7) + '" style="font-size:21px">' + t + '</text>';
    });
    small += '</svg>';
    return wide + small;
  }

  // Simbolo di un diodo da a (anodo) a b (catodo), acceso o spento, per le figure.
  function fdiode(a, b, on) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    const ux = dx / L;
    const uy = dy / L;
    const nx = -uy;
    const ny = ux;
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const h = 9;
    const b0 = [mx - ux * h, my - uy * h];
    const ap = [mx + ux * h, my + uy * h];
    const p1 = [b0[0] + nx * h, b0[1] + ny * h];
    const p2 = [b0[0] - nx * h, b0[1] - ny * h];
    const bar = 'M' + P2([ap[0] + nx * 10, ap[1] + ny * 10]) + 'L' + P2([ap[0] - nx * 10, ap[1] - ny * 10]);
    return '<g class="' + (on ? '' : 'alimentatore-fig-dim') + '">' +
      '<path class="' + (on ? 'f-accent' : 'f-line') + '" d="M' + P2(a) + 'L' + P2(b0) + 'M' + P2(ap) + 'L' + P2(b) + bar + '"/>' +
      '<path class="' + (on ? 'f-accent-fill' : 'f-paper') + '" d="M' + P2(p1) + 'L' + P2(ap) + 'L' + P2(p2) + 'Z"/></g>';
  }

  // Freccia piena nel punto (x, y) orientata con l'angolo in gradi.
  function farrow(x, y, deg) {
    return '<path class="f-accent-fill" transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + deg + ')" d="M6 0L-5 -5.5L-2 0L-5 5.5Z"/>';
  }

  // Il ponte di Graetz nelle due semionde: quali diodi conducono e da dove passa la corrente.
  function bridgeFigure() {
    const panel = (ox, positive) => {
      const cx = ox + 150;
      const cy = 128;
      const d = 46;
      const T = [cx, cy - d];
      const R = [cx + d, cy];
      const B = [cx, cy + d];
      const L = [cx - d, cy];
      const xs = ox + 34;          // secondario
      const xl = ox + 266;         // carico
      const yTop = 56;
      const yBot = 200;
      const yRail = 226;
      let o = '<text class="f-title" x="' + cx + '" y="18" text-anchor="middle">' + (positive ? 'Semionda positiva' : 'Semionda negativa') + '</text>' +
        '<text class="f-small" x="' + cx + '" y="36" text-anchor="middle">' + (positive ? 'conducono D1 e D4' : 'conducono D2 e D3') + '</text>';
      // fili
      o += '<path class="f-line" d="M' + xs + ' 96V' + yTop + 'H' + cx + 'V' + T[1] + 'M' + xs + ' 160V' + yBot + 'H' + cx + 'V' + B[1] +
        'M' + R[0] + ' ' + cy + 'H' + xl + 'V112M' + xl + ' 158V' + yRail + 'H' + L[0] + 'V' + (yBot + 7) + 'A7 7 0 0 1 ' + L[0] + ' ' + (yBot - 7) + 'V' + cy + '"/>';
      // secondario del trasformatore
      o += '<path class="f-line" d="M' + xs + ' 96a8 8 0 0 0 0 16a8 8 0 0 0 0 16a8 8 0 0 0 0 16a8 8 0 0 0 0 16"/>' +
        '<path class="f-thin" d="M' + (xs - 16) + ' 96V160M' + (xs - 20) + ' 96V160"/>' +
        '<text class="f-accent-text" x="' + (xs + 14) + '" y="92">' + (positive ? '+' : '−') + '</text>' +
        '<text class="f-accent-text" x="' + (xs + 14) + '" y="174">' + (positive ? '−' : '+') + '</text>';
      // carico
      o += '<rect class="f-paper" x="' + (xl - 9) + '" y="112" width="18" height="46" rx="2"/>' +
        '<text class="f-small" x="' + (xl - 14) + '" y="152" text-anchor="end">carico</text>';
      // percorso della corrente (con il ponticello dove il ritorno scavalca il filo del secondario)
      const hop = 'V' + (yBot + 7) + 'A7 7 0 0 1 ' + L[0] + ' ' + (yBot - 7);
      const path = positive
        ? 'M' + xs + ' 96V' + yTop + 'H' + cx + 'V' + T[1] + 'L' + P2(R) + 'H' + xl + 'V' + yRail + 'H' + L[0] + hop + 'V' + cy + 'L' + P2(B) + 'V' + yBot + 'H' + xs + 'V160'
        : 'M' + xs + ' 160V' + yBot + 'H' + cx + 'V' + B[1] + 'L' + P2(R) + 'H' + xl + 'V' + yRail + 'H' + L[0] + hop + 'V' + cy + 'L' + P2(T) + 'V' + yTop + 'H' + xs + 'V96';
      o += '<path class="f-accent" d="' + path + '" stroke-width="7" opacity=".18"/>' +
        '<path class="f-accent alimentatore-fig-flow" d="' + path + '" stroke-width="2.6"/>';
      // diodi
      o += fdiode(T, R, positive) + fdiode(B, R, !positive) + fdiode(L, T, !positive) + fdiode(L, B, positive);
      const lab = (p, t) => '<text class="f-mono" x="' + f1(p[0]) + '" y="' + f1(p[1]) + '" text-anchor="middle">' + t + '</text>';
      o += lab([cx + 34, cy - 30], 'D1') + lab([cx + 34, cy + 42], 'D2') + lab([cx - 34, cy - 30], 'D3') + lab([cx - 34, cy + 42], 'D4');
      o += '<circle class="f-fill" cx="' + T[0] + '" cy="' + T[1] + '" r="3"/><circle class="f-fill" cx="' + B[0] + '" cy="' + B[1] + '" r="3"/>' +
        '<circle class="f-fill" cx="' + R[0] + '" cy="' + R[1] + '" r="3"/><circle class="f-fill" cx="' + L[0] + '" cy="' + L[1] + '" r="3"/>';
      // frecce nel verso della corrente
      o += farrow(xl, 186, 90) + farrow((xl + R[0]) / 2, cy, 0) + farrow((L[0] + xl) / 2, yRail, 180);
      o += positive ? farrow(xs + 50, yTop, 0) + farrow(xs + 50, yBot, 180) : farrow(xs + 50, yBot, 0) + farrow(xs + 50, yTop, 180);
      // la polarità sul carico è la stessa nelle due semionde
      o += '<text class="f-accent-text" x="' + (xl + 13) + '" y="124">+</text><text class="f-accent-text" x="' + (xl + 13) + '" y="158">−</text>';
      // forma d'onda in uscita: le due gobbe, quella di questa semionda evidenziata
      const wx = ox + 70;
      const ww = 170;
      let wa = '';
      let wb = '';
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const y = 286 - 26 * Math.sin(Math.PI * t);
        wa += (i ? 'L' : 'M') + f1(wx + ww / 2 * t) + ' ' + f1(y);
        wb += (i ? 'L' : 'M') + f1(wx + ww / 2 + ww / 2 * t) + ' ' + f1(y);
      }
      o += '<path class="f-thin" d="M' + (wx - 6) + ' 286H' + (wx + ww + 6) + '"/>' +
        '<path class="' + (positive ? 'f-accent' : 'f-line alimentatore-fig-dim') + '" d="' + wa + '" stroke-width="' + (positive ? 3 : 2) + '"/>' +
        '<path class="' + (positive ? 'f-line alimentatore-fig-dim' : 'f-accent') + '" d="' + wb + '" stroke-width="' + (positive ? 2 : 3) + '"/>' +
        '<text class="f-small" x="' + (wx - 10) + '" y="282" text-anchor="end">uscita</text>';
      return o;
    };
    // schermi larghi: le due semionde affiancate; telefono: una sopra l'altra, più grandi
    return '<svg viewBox="0 0 640 300" class="alimentatore-fig-wide">' + panel(0, true) + panel(330, false) + '<path class="f-dash" d="M320 10V290"/></svg>' +
      '<svg viewBox="0 0 300 606" class="alimentatore-fig-narrow" role="img" aria-label="Il ponte di Graetz: nella semionda positiva conducono D1 e D4, nella negativa D2 e D3">' +
      panel(0, true) + '<path class="f-dash" d="M12 302H288"/><g transform="translate(0 310)">' + panel(0, false) + '</g></svg>';
  }

  /* ---------- capitolo ---------- */

  EI.chapter({
    id: 'alimentatore',
    icon: 'supply',
    minutes: 16,
    summary: 'La presa di casa dà 230 volt alternati, ma un circuito digitale vuole 5 volt continui e fermi. L\'alimentatore lineare ci arriva in quattro passi: il trasformatore abbassa la tensione, il [[ponte-di-graetz]] la raddrizza, il [[condensatore-di-livellamento]] la spiana e il [[regolatore-lineare]] 7805 toglie l\'ultima ondulazione, trasformando in calore la tensione in più.',
    keywords: ['ponte-di-graetz', 'condensatore-di-livellamento', 'ripple', 'regolatore-lineare', 'tensione-di-dropout', 'dissipatore', 'rendimento', 'valore-efficace'],
    model: model,
    css: [
      '.alimentatore-lab .ei-stage-svg { max-height: none; }',
      '.alimentatore-lab .ei-plots { grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); }',
      '@media (max-width: 900px) { .alimentatore-lab .ei-plots { grid-template-columns: 1fr; } }',
      '.alimentatore-fpath { fill: none; stroke: none; }',
      '.alimentatore-mains { fill: color-mix(in srgb, var(--trace-4) 7%, transparent); stroke: color-mix(in srgb, var(--trace-4) 45%, transparent); stroke-width: 1.2; stroke-dasharray: 5 5; }',
      '.alimentatore-warn { font: 800 10.5px var(--mono); fill: var(--trace-4); letter-spacing: .06em; }',
      '.alimentatore-title { font: 800 10.5px var(--mono); fill: var(--scope-text); letter-spacing: .12em; }',
      '.alimentatore-val { font: 700 12px var(--mono); fill: var(--trace-2); }',
      '.alimentatore-dname { font: 700 11px var(--mono); fill: var(--scope-text); transition: fill .2s ease; }',
      '.alimentatore-dname.on { fill: var(--flow); }',
      '.alimentatore-pol { font: 800 15px var(--mono); fill: var(--trace-2); }',
      '.alimentatore-caption { font: 700 11.5px var(--mono); fill: var(--lab-ink); }',
      '.alimentatore-diss { font: 700 11.5px var(--mono); fill: var(--trace-4); }',
      '.alimentatore-diss.temp { fill: var(--scope-text); }',
      '.alimentatore-diss.temp.hot { fill: var(--trace-4); }',
      '.alimentatore-vout { font: 800 15px var(--mono); fill: var(--trace-1); }',
      '.alimentatore-vout.bad { fill: var(--trace-4); }',
      '.alimentatore-dglow { fill: var(--flow); opacity: 0; filter: blur(6px); }',
      '.alimentatore-heat { opacity: 0; filter: blur(9px); }',
      '.alimentatore-wave { fill: none; stroke: #ff9a5c; stroke-width: 1.8; stroke-linecap: round; opacity: 0; }',
      '.alimentatore-gauge-bg { fill: #050a09; stroke: #2a3b36; stroke-width: 1.2; }',
      '.alimentatore-gauge-mark { stroke: var(--trace-4); stroke-width: 2; }',
      '.alimentatore-gauge-text { font: 700 10px var(--mono); fill: var(--trace-4); }',
      '.alimentatore-gauge-val { font: 700 11px var(--mono); fill: var(--trace-2); }',
      '.alimentatore-term { fill: var(--scope-bg); stroke: var(--sym); stroke-width: 2.2; }',
      '.alimentatore-clamp { fill: none; stroke: var(--trace-4); stroke-width: 2; opacity: .75; }',
      '.alimentatore-off { opacity: .25; }',
      /* composizione stretta: il disegno è largo 400 unità, i testi crescono in unità del disegno */
      '.alimentatore-lab.alimentatore-narrow .ei-stage-svg { max-height: 700px; }',
      '.alimentatore-narrow .ei-stage .ei-sym-label { font-size: 12.5px; }',
      '.alimentatore-narrow .ei-stage .ei-sym-label .value { font-size: 12px; }',
      '.alimentatore-narrow .ei-stage .ei-ic-label { font-size: 16px; }',
      '.alimentatore-narrow .ei-stage .ei-ic-pin { font-size: 10px; }',
      '.alimentatore-narrow .ei-stage .ei-probe-label { font-size: 12.5px; }',
      '.alimentatore-narrow .ei-stage .ei-wire { stroke-width: 3; }',
      '.alimentatore-narrow .ei-stage .ei-sym .lead { stroke-width: 2.4; }',
      '.alimentatore-narrow .alimentatore-title { font-size: 12px; }',
      '.alimentatore-narrow .alimentatore-val, .alimentatore-narrow .alimentatore-dname { font-size: 13px; }',
      '.alimentatore-narrow .alimentatore-caption, .alimentatore-narrow .alimentatore-diss { font-size: 12.5px; }',
      '.alimentatore-narrow .alimentatore-warn, .alimentatore-narrow .alimentatore-gauge-text, .alimentatore-narrow .alimentatore-gauge-val { font-size: 11.5px; }',
      '.alimentatore-narrow .alimentatore-vout { font-size: 15px; }',
      '.ei-figure .alimentatore-fig-inv { fill: var(--fig-paper); font: 800 11px var(--mono); }',
      '.ei-figure svg.alimentatore-fig-narrow { display: none; }',
      '@media (max-width: 640px) { .ei-figure svg.alimentatore-fig-wide { display: none; } .ei-figure svg.alimentatore-fig-narrow { display: block; } }',
      '.ei-figure .alimentatore-fig-dim { opacity: .35; }',
      '.alimentatore-fig-flow { stroke-dasharray: 7 9; animation: alimentatore-dash 1.2s linear infinite; }',
      '.alimentatore-fig-heat { opacity: 0; animation: alimentatore-rise 2.4s ease-in-out infinite; }',
      '@keyframes alimentatore-dash { to { stroke-dashoffset: -32; } }',
      '@keyframes alimentatore-rise { 0% { transform: translateY(6px); opacity: 0; } 45% { opacity: .9; } 100% { transform: translateY(-10px); opacity: 0; } }',
      '@media (prefers-reduced-motion: reduce) { .alimentatore-fig-flow { animation: none; } .alimentatore-fig-heat { animation: none; opacity: .6; } }',
    ].join('\n'),
    lab: {
      title: 'Dalla presa ai 5 volt',
      layout: 'stack',
      viewBox: [960, 392],
      svgLabel: 'Schema dell\'alimentatore: rete, trasformatore, raddrizzatore, condensatore, regolatore 7805 e carico',
      intro: 'Segui l\'energia dalla presa al carico. Tocca i punti di misura <b>TP1–TP4</b> per scegliere le tracce dell\'oscilloscopio: lo schema scorre 100 volte più lento, al passo del cursore. Cambia trasformatore, raddrizzatore, condensatore e corrente, togli il condensatore o scavalca il 7805. <b>La rete a 230 V è pericolosa: si prova solo qui, sul banco virtuale.</b>',
      mount: mount,
    },
    how: [
      'La presa dà 230 V [[valore-efficace|efficaci]] a 50 Hz: la sinusoide arriva a ±325 V ed è pericolosa, per questo non si fanno mai esperimenti sulla rete. Il trasformatore, con due avvolgimenti isolati tra loro, la riduce a 9, 12 o 15 V efficaci. Il picco è √2 volte più alto: 12 V efficaci arrivano a quasi 17 V.',
      'Il raddrizzatore lascia passare la corrente in un solo verso. A [[raddrizzatore-a-semionda|semionda]] basta un diodo, ma metà dell\'onda va persa. Il [[ponte-di-graetz]] usa quattro diodi: in ogni semionda ne conducono due e la parte negativa viene ribaltata. Il prezzo è la [[tensione-di-soglia]] di due diodi, circa 1,4 V.',
      'Il [[condensatore-di-livellamento]] si carica vicino ai picchi e, tra un picco e l\'altro, alimenta da solo il circuito: la tensione scende un po\' e risale. Quell\'ondulazione è il [[ripple]]: con il ponte vale circa I/(2·f·C) e si ripete 100 volte al secondo. Con 0,5 A e 2200 µF fa circa 2 V.',
      'I diodi conducono solo per brevi istanti, quando la tensione del trasformatore supera quella del condensatore: in quei momenti devono rifornire il condensatore di tutta la carica che il carico ha consumato, e la corrente è molte volte quella del carico.',
      'Il [[regolatore-lineare]] 7805 confronta l\'uscita con un riferimento interno e, con la [[retroazione-negativa]], comanda un transistor in serie al carico: la tensione in più resta su di lui. Vuole almeno 2 V di margine, la [[tensione-di-dropout]]: con 5 V d\'uscita l\'ingresso non deve mai scendere sotto 7 V, nemmeno nelle valli del ripple.',
      'Il margine si paga in calore: P = (Vin − 5 V) · I. Con 15 V in ingresso e 0,5 A il 7805 scalda 5 W e ha bisogno di un [[dissipatore]]; se si scalda troppo, la protezione interna lo spegne. Per questo i caricabatterie di oggi sono [[alimentatore-switching|switching]]: sprecano molto meno.',
    ],
    formulas: [
      {
        name: 'Picco dopo il ponte',
        expr: '<var>V</var><sub>max</sub> = <var>V</var><sub>eff</sub> · √2 − 2 · <var>V</var><sub>D</sub>',
        legend: [['V<sub>eff</sub>', 'tensione efficace del secondario'], ['√2', 'circa 1,414: dal valore efficace al picco'], ['V<sub>D</sub>', 'caduta di un diodo che conduce, circa 0,7 V']],
        note: 'Esempio: 12 V efficaci hanno un picco di 16,97 V, che dopo il ponte diventa 15,57 V. A semionda si toglie un solo V<sub>D</sub>.',
      },
      {
        name: 'Ripple',
        expr: 'Δ<var>V</var> ≈ <span class="frac"><span><var>I</var></span><span>2 · <var>f</var> · <var>C</var></span></span>',
        legend: [['ΔV', 'ondulazione picco-picco sul condensatore'], ['I', 'corrente del carico, in ampere'], ['f', 'frequenza di rete, 50 Hz'], ['C', 'capacità, in farad']],
        note: 'Con il ponte il condensatore si ricarica 100 volte al secondo; a semionda solo 50 e il ripple raddoppia: ΔV ≈ I/(f·C). Esempio: 0,5 A e 2200 µF danno 2,27 V.',
      },
      {
        name: 'Calore nel regolatore',
        expr: '<var>P</var> = (<var>V</var><sub>in</sub> − <var>V</var><sub>out</sub>) · <var>I</var>',
        legend: [['P', 'potenza trasformata in calore, in watt'], ['V<sub>in</sub> − V<sub>out</sub>', 'tensione che resta sul regolatore'], ['I', 'corrente del carico']],
        note: 'Il 7805 funziona se in ogni istante V<sub>in</sub> ≥ V<sub>out</sub> + 2 V. Il suo [[rendimento]] è V<sub>out</sub>/V<sub>in</sub>: con 15 V in ingresso arriva al carico solo un terzo dell\'energia.',
      },
    ],
    figures: [
      {
        title: 'Dentro un alimentatore lineare',
        svg: boardFigure(),
        caption: 'Un alimentatore lineare da 5 V: il trasformatore pesante, quattro diodi a ponte, il grosso condensatore elettrolitico e il 7805 avvitato al dissipatore. I numeri seguono il percorso della corrente, dalla spina ai morsetti d\'uscita.',
        alt: 'Scheda di un alimentatore vista di fronte: spina e fusibile, trasformatore, quattro diodi, condensatore elettrolitico da 2200 µF, regolatore 7805 su un dissipatore alettato e morsetti d\'uscita',
      },
      {
        title: 'Il ponte di Graetz nelle due semionde',
        svg: bridgeFigure(),
        caption: 'Nella semionda positiva conducono D1 e D4, in quella negativa D2 e D3. Le coppie si danno il cambio, ma nel carico la corrente scorre sempre nello stesso verso: le due metà dell\'onda escono entrambe positive.',
        alt: 'Due schemi del ponte di Graetz: nella semionda positiva la corrente passa per D1 e D4, nella negativa per D2 e D3, e nel carico ha sempre lo stesso verso',
      },
    ],
    history: {
      text: [
        'A fine Ottocento le reti elettriche passano alla corrente alternata, ma per caricare gli accumulatori e per l\'elettrochimica serve corrente continua. Nel dicembre del 1895 l\'ingegnere polacco Karol Pollak brevetta in Gran Bretagna un circuito a ponte che raddrizza tutte e due le semionde, e nel gennaio del 1896 anche in Germania. Nel 1897 il fisico tedesco Leo Graetz pubblica, per conto suo, lo stesso schema, costruito con celle elettrolitiche ad alluminio: il nome rimasto è il suo, ponte di Graetz.',
        'Con la radio il problema entra nelle case. Nel 1927 la RCA presenta la valvola raddrizzatrice UX-280, pensata per le nuove radio alimentate dalla presa invece che dalle batterie. Arrivano poi i raddrizzatori «a secco», senza vuoto e senza filamento: quello all\'ossido di rame, messo a punto negli Stati Uniti da Grondahl e Geiger e presentato nel 1927, e quello al selenio, che resta in radio e televisori fino alla fine degli anni Sessanta. Li sostituiscono i diodi al silicio, nati negli anni Cinquanta: fanno cadere meno tensione e portano molta più corrente.',
        'Resta da tenere ferma la tensione. Per decenni gli stabilizzatori si costruiscono con componenti separati; poi il circuito integrato mette tutto su un chip. Nel 1967 la Fairchild presenta il µA723, progettato da Bob Widlar; intorno al 1969 Widlar, passato alla National Semiconductor, firma l\'LM109 e l\'LM309, regolatori da 5 V con tre soli piedini: ingresso, massa e uscita. Sulla stessa idea si basa la famiglia 78xx, nata alla Fairchild come serie µA7800 e prodotta anche da altre aziende già a metà degli anni Settanta: il 7805 è il più famoso.',
        'Oggi i caricabatterie dei telefoni non hanno più il pesante trasformatore a 50 Hz: sono [[alimentatore-switching|alimentatori switching]], che lavorano a frequenze molto più alte e sprecano molto meno energia. Il regolatore lineare però non è scomparso: è semplice e non produce disturbi, e si trova ancora su moltissime schede, spesso in versioni a basso dropout.',
      ],
      events: [
        { year: 1895, title: 'Il circuito a ponte', who: 'Karol Pollak', text: 'Brevetta in Gran Bretagna, e poi in Germania, il raddrizzatore a ponte che usa tutte e due le semionde.' },
        { year: 1897, title: 'Il ponte di Graetz', who: 'Leo Graetz', text: 'Il fisico tedesco pubblica lo stesso schema, con celle elettrolitiche ad alluminio: il circuito prende il suo nome.' },
        { year: 1927, title: 'La valvola raddrizzatrice', who: 'RCA', text: 'La UX-280 raddrizza la tensione di rete nelle nuove radio che non hanno più bisogno delle batterie.' },
        { year: 1967, title: 'Il regolatore in un chip', who: 'Bob Widlar (Fairchild)', text: 'Il µA723 riunisce riferimento di tensione, amplificatore e transistor in serie su un solo pezzo di silicio.' },
        { year: 1969, title: 'Tre piedini e 5 volt', who: 'Bob Widlar (National Semiconductor)', text: 'Con l\'LM109 e l\'LM309 basta collegare ingresso, massa e uscita: lo stesso schema del 7805.' },
      ],
    },
    fun: 'Il ronzio di un vecchio alimentatore non è a 50 Hz ma a 100 Hz. Le lamierine del nucleo del trasformatore si allungano e si accorciano a ogni picco del campo magnetico, positivo o negativo che sia: due volte per ogni periodo della rete. Il fenomeno si chiama magnetostrizione.',
    uses: 'Alimentatori da laboratorio e vecchi alimentatori «a mattone» con il trasformatore, amplificatori audio e strumenti di misura che vogliono poco disturbo, schede di controllo di elettrodomestici e impianti. Sulla scheda Arduino Uno un regolatore lineare ricava i 5 V dall\'alimentatore esterno: per questo si consigliano da 7 a 12 V in ingresso. Sotto i 7 V i 5 V possono calare, sopra i 12 V il regolatore scalda troppo.',
    links: [
      { href: '../elettronica-base/index.html#alternata', section: 'Elettronica base', title: 'La corrente alternata, i 50 Hz e il trasformatore' },
      { href: '#diodo', section: 'Questa sezione', title: 'Il diodo: la corrente passa in un solo verso' },
      { href: '#rc-filtri', section: 'Questa sezione', title: 'Il condensatore che si carica e si scarica' },
      { href: '#led-zener', section: 'Questa sezione', title: 'Lo Zener, il riferimento di tensione più semplice' },
      { href: '../elettronica-avanzata/index.html', section: 'Elettronica avanzata', title: 'Gli alimentatori switching dei caricabatterie' },
    ],
    glossary: {
      'valore-efficace': { term: 'Valore efficace', def: 'Il valore di una tensione alternata che scalda una resistenza quanto una tensione continua uguale (in inglese RMS). Per una sinusoide è il picco diviso √2: 230 V efficaci hanno un picco di circa 325 V.' },
      'ponte-di-graetz': { term: 'Ponte di Graetz', def: 'Quattro diodi collegati a rombo che raddrizzano tutte e due le semionde: in ogni semionda ne conducono due e l\'uscita ha sempre lo stesso verso. Fa cadere circa 1,4 V, due diodi.' },
      'raddrizzatore-a-semionda': { term: 'Raddrizzatore a semionda', def: 'Il raddrizzatore più semplice: un solo diodo lascia passare le semionde positive e blocca quelle negative. Il condensatore si ricarica solo 50 volte al secondo.' },
      'condensatore-di-livellamento': { term: 'Condensatore di livellamento', def: 'Il grande condensatore elettrolitico dopo il raddrizzatore, detto anche serbatoio: si carica vicino ai picchi e tra un picco e l\'altro alimenta da solo il circuito, riempiendo le valli della tensione pulsante.' },
      'ripple': { term: 'Ripple', def: 'L\'ondulazione che resta sulla tensione dopo il condensatore di livellamento, misurata da picco a picco. Con il ponte vale circa I/(2·f·C) e si ripete 100 volte al secondo.' },
      'regolatore-lineare': { term: 'Regolatore lineare', def: 'Circuito che tiene ferma la tensione d\'uscita con un transistor in serie al carico, usato come una resistenza variabile: la tensione in più diventa calore. Il 7805, da 5 V, è il più famoso.' },
      'tensione-di-dropout': { term: 'Tensione di dropout', def: 'La differenza minima tra ingresso e uscita perché un regolatore funzioni. Per il 7805 è di circa 2 V: servono almeno 7 V in ingresso per avere 5 V stabili.' },
      'dissipatore': { term: 'Dissipatore', def: 'Pezzo di metallo con alette su cui si avvita un componente di potenza: allarga la superficie che cede calore all\'aria e tiene il chip più fresco.' },
      'rendimento': { term: 'Rendimento', def: 'Il rapporto tra la potenza che arriva al carico e quella presa dalla sorgente, di solito in percentuale. Quello che manca diventa calore.' },
      'alimentatore-switching': { term: 'Alimentatore switching', def: 'Alimentatore che accende e spegne la corrente decine o centinaia di migliaia di volte al secondo e la trasforma con un piccolo trasformatore ad alta frequenza: spreca molto meno di uno lineare ed è più leggero.' },
    },
  });
})();
