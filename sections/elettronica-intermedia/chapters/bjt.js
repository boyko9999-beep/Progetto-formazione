/*
 * Capitolo 4: il transistor bipolare (BJT).
 * Laboratorio in due modi: "Interruttore" (un piedino a 5 V accende una lampada da 12 V)
 * e "Amplificatore" (stadio a emettitore comune: polarizzazione più un piccolo segnale).
 * Accanto allo schema c'è il transistor visto dentro: gli elettroni partono dall'emettitore,
 * quasi tutti attraversano la base sottile e arrivano al collettore, pochi si ricombinano.
 */
(function () {
  'use strict';

  const { s, sym, wire, dot, si, num, clamp } = EI;

  /* ---------- modello fisico (puro, testato in tests/bjt.test.js) ---------- */

  const VT = 0.02585; // tensione termica kT/q a 27 °C
  const IS = 1e-14; // corrente di saturazione di un piccolo NPN al silicio
  const VCESAT = 0.2; // tensione collettore-emettitore del transistor saturo

  const model = {
    VT: VT,
    IS: IS,
    VCESAT: VCESAT,
    // Vbe che fa scorrere la corrente di collettore Ic: Ic = Is · (e^(Vbe/VT) − 1).
    vbe: (ic) => VT * Math.log1p(Math.max(0, ic) / IS),
    // Corrente di base con l'ingresso Vin attraverso Rb: Vin = Rb · Ib + VT · ln(1 + β · Ib / Is).
    baseCurrent: function (vin, rb, beta) {
      if (!(vin > 0)) return 0;
      let lo = 0;
      let hi = vin / rb;
      for (let k = 0; k < 64; k++) {
        const mid = (lo + hi) / 2;
        if (mid * rb + VT * Math.log1p(beta * mid / IS) > vin) hi = mid;
        else lo = mid;
      }
      return (lo + hi) / 2;
    },
    // Tensione d'ingresso che serve per avere la corrente di collettore Ic (zona attiva).
    vinFor: (ic, rb, beta) => rb * ic / beta + VT * Math.log1p(ic / IS),
    // Corrente massima che il carico lascia passare: transistor saturo.
    icSat: (vcc, rc) => Math.max(0, (vcc - VCESAT) / rc),
    /*
     * Punto di lavoro con ingresso vin e circuito c = { rb, beta, vcc, rc }.
     * Zona attiva: Ic = β · Ib. Saturazione: β · Ib supererebbe (Vcc − Vce,sat) / Rc, e Ic si ferma lì.
     * Interdizione: Ic sotto l'1% della corrente di saturazione (in pratica spento).
     */
    operating: function (vin, c) {
      const ib = model.baseCurrent(vin, c.rb, c.beta);
      const icsat = model.icSat(c.vcc, c.rc);
      let ic = c.beta * ib;
      let vce;
      let region;
      if (ic >= icsat) {
        ic = icsat;
        vce = VCESAT;
        region = 'sat';
      } else {
        vce = c.vcc - ic * c.rc;
        region = ic < 0.01 * icsat ? 'off' : 'att';
      }
      return { vin: vin, ib: ib, ic: ic, ie: ib + ic, vbe: vin - ib * c.rb, vce: vce, region: region, icsat: icsat, pd: vce * ic };
    },
    // Resistenza della giunzione base-emettitore per i piccoli segnali: rπ = β · VT / Ic.
    rpi: (ic, beta) => beta * VT / ic,
    // Guadagno per piccoli segnali (derivata di Vce rispetto a Vin): Av = −β · Rc / (Rb + rπ).
    gain: function (vin, c) {
      const q = model.operating(vin, c);
      if (q.region !== 'att') return 0;
      return -c.beta * c.rc / (c.rb + VT / (q.ib + IS / c.beta));
    },
    // Un periodo dell'uscita con ingresso Vpol + A · sin(ωt): campioni, escursione, guadagno misurato, tosature.
    cycle: function (vpol, amp, c, n) {
      const N = n || 96;
      const vce = new Array(N);
      let lo = Infinity;
      let hi = -Infinity;
      let ibLo = Infinity;
      let ibHi = -Infinity;
      let top = false;
      let bottom = false;
      for (let k = 0; k < N; k++) {
        const q = model.operating(vpol + amp * Math.sin(2 * Math.PI * k / N), c);
        vce[k] = q.vce;
        lo = Math.min(lo, q.vce);
        hi = Math.max(hi, q.vce);
        ibLo = Math.min(ibLo, q.ib);
        ibHi = Math.max(ibHi, q.ib);
        if (q.region === 'off') top = true;
        if (q.region === 'sat') bottom = true;
      }
      const q0 = model.operating(vpol, c);
      const span = hi - lo;
      return {
        vce: vce, min: lo, max: hi, q: q0, span: span,
        gain: amp > 0 ? span / (2 * amp) : 0,
        ibSwing: (ibHi - ibLo) / 2,
        clipTop: top, clipBottom: bottom,
        asym: span > 1e-9 ? Math.abs((hi - q0.vce) - (q0.vce - lo)) / span : 0,
      };
    },
    // Potenza nella lampada (resistenza a caldo r).
    lampPower: (ic, r) => ic * ic * r,
  };

  /* ---------- costanti del banco ---------- */

  const VCC = 12;
  const R_LAMP = 120; // lampada da 12 V e 1,2 W: 100 mA a piena luce
  const RC_AMP = 2200; // resistenza di collettore dell'amplificatore
  const F_SIG = 1000; // il segnale è da 1 kHz (scala dei tempi dell'oscilloscopio)
  const VIS_HZ = 0.5; // nell'animazione il segnale è rallentato a mezzo ciclo al secondo
  const NS = 96; // campioni per periodo
  const U_EB = 0.27; // nel riquadro: fine dell'emettitore (u va da E = 0 a C = 1)
  const U_BC = 0.37; // fine della base: base sottile, il 10% della lunghezza
  const RMAX = 30; // elettroni al secondo nel riquadro alla corrente massima
  let UID = 0;

  // Numeri pseudo-casuali ripetibili (disposizione delle cariche ferme).
  function rng(seed) {
    let x = seed >>> 0 || 1;
    return () => {
      x ^= x << 13; x >>>= 0;
      x ^= x >>> 17;
      x ^= x << 5; x >>>= 0;
      return (x % 100000) / 100000;
    };
  }
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2;

  // Geometria del banco: largo (computer) o alto e stretto (telefono).
  const GEO = {
    wide: {
      W: 720, H: 440, tall: false,
      yV: 40, yG: 384, xC: 250, xT: 230, yT: 256,
      bat: { x: 372, top: 162, len: 60 },
      load: { top: 70, bot: 140, r: 17 },
      rb: { x: 112, len: 64 },
      uc: { x: 14, y: 204, w: 80, h: 104 },
      gen: { x: 54, acTop: 270, acLen: 54, dcTop: 330, dcLen: 46 },
      lens: [204, 226, 66, 60],
      box: [404, 12, 306, 416],
      dev: { orient: 'v', x0: 468, x1: 608, yC: 80, yE: 318 },
      icTag: [240, 176, 'end'], ibTag: [144, 280], ibTagA: [168, 276], badge: [312, 316], probeOut: [292, 176],
    },
    tall: {
      W: 400, H: 466, tall: true,
      yV: 24, yG: 226, xC: 214, xT: 194, yT: 140,
      bat: null, term: [312, 24],
      load: { top: 36, bot: 86, r: 14 },
      rb: { x: 92, len: 60 },
      uc: { x: 6, y: 106, w: 66, h: 70 },
      gen: { x: 40, acTop: 152, acLen: 72, dcTop: 0, dcLen: 0 },
      lens: [176, 112, 56, 56],
      box: [4, 248, 392, 214],
      dev: { orient: 'h', xE: 44, xC: 318, y0: 300, y1: 362 },
      icTag: [238, 66, 'start'], ibTag: [122, 170], ibTagA: [124, 160], badge: [300, 176], probeOut: [252, 92],
    },
  };

  /* ---------- laboratorio ---------- */

  function mount(lab) {
    const svg = lab.svg;
    const P = EI.palette();
    const uid = ++UID;
    const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;
    svg.classList.add('bjt-svg');

    const st = { mode: 'sw', vin: 1.2, rbS: 2200, vpol: 0.8, amp: 0.05, rbA: 22000, beta: 150, phase: 0 };
    // Valori mostrati: inseguono quelli scelti, così punto di lavoro e lampada scorrono senza scatti.
    const sh = { vin: st.vin, lrS: Math.log(st.rbS), vpol: st.vpol, la: Math.log(st.amp), lrA: Math.log(st.rbA), beta: st.beta };
    let G = null;
    let C = null;
    let IN = null;

    const circuit = (shown) => (st.mode === 'sw'
      ? { rb: shown ? Math.exp(sh.lrS) : st.rbS, beta: shown ? sh.beta : st.beta, vcc: VCC, rc: R_LAMP }
      : { rb: shown ? Math.exp(sh.lrA) : st.rbA, beta: shown ? sh.beta : st.beta, vcc: VCC, rc: RC_AMP });

    /* --- disegno del circuito --- */

    function drawLamp(g, cx, top, bot, r) {
      const cy = (top + bot) / 2;
      const halo = s('circle', { cx: cx, cy: cy, r: r * 3.6, class: 'bjt-halo', fill: 'url(#bjt-lamp-' + uid + ')' }, g);
      let d = '';
      for (let k = 0; k < 8; k++) {
        const a = (k + 0.5) * Math.PI / 4;
        d += 'M' + (cx + Math.cos(a) * (r + 6)).toFixed(1) + ' ' + (cy + Math.sin(a) * (r + 6)).toFixed(1) +
          'L' + (cx + Math.cos(a) * (r + 13)).toFixed(1) + ' ' + (cy + Math.sin(a) * (r + 13)).toFixed(1);
      }
      const rays = s('path', { d: d, class: 'bjt-rays' }, g);
      const body = s('g', { class: 'ei-sym' }, g);
      s('path', { d: 'M' + cx + ' ' + top + 'V' + (cy - r) + 'M' + cx + ' ' + (cy + r) + 'V' + bot, class: 'lead' }, body);
      const bulb = s('circle', { cx: cx, cy: cy, r: r, class: 'bjt-bulb' }, body);
      const k = r * 0.7;
      const fil = s('path', { d: 'M' + (cx - k) + ' ' + (cy - k) + 'L' + (cx + k) + ' ' + (cy + k) + 'M' + (cx - k) + ' ' + (cy + k) + 'L' + (cx + k) + ' ' + (cy - k), class: 'bjt-fil' }, body);
      return { halo: halo, rays: rays, bulb: bulb, fil: fil, r: r };
    }

    function drawMcu(g, u, yPin) {
      const gg = s('g', { class: 'ei-sym ic bjt-mcu' }, g);
      s('rect', { x: u.x, y: u.y, width: u.w, height: u.h, rx: 6, class: 'chip' }, gg);
      s('path', { d: 'M' + (u.x + u.w / 2 - 8) + ' ' + u.y + 'a8 8 0 0 0 16 0', class: 'notch' }, gg);
      s('path', { d: 'M' + (u.x + u.w) + ' ' + yPin + 'h14M' + (u.x + u.w / 2) + ' ' + (u.y + u.h) + 'v14', class: 'lead' }, gg);
      s('text', { x: u.x + u.w / 2, y: u.y + u.h / 2 - 8, class: 'ei-ic-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: 'µC' }, gg);
      const sub = s('text', { x: u.x + u.w / 2, y: u.y + u.h / 2 + 14, class: 'ei-ic-sub bjt-uc-sub', 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: '' }, gg);
      return { sub: sub, out: [u.x + u.w + 14, yPin], gnd: [u.x + u.w / 2, u.y + u.h + 14] };
    }

    function probe(g, x, y, label, color, below) {
      const gg = s('g', { class: 'bjt-probe' }, g);
      gg.style.setProperty('--pc', color);
      s('circle', { cx: x, cy: y, r: 5 }, gg);
      s('text', { x: x, y: below ? y + 20 : y - 11, 'text-anchor': 'middle', text: label }, gg);
      return gg;
    }

    function drawCircuit() {
      const g = s('g', { class: 'bjt-circuit' }, svg);
      const xC = G.xC;
      const yT = G.yT;
      const yG = G.yG;
      const L = G.load;

      // lente: il transistor del circuito, visto dentro nel riquadro
      const [lx, ly, lw, lh] = G.lens;
      const B = G.box;
      const lens = s('g', { class: 'bjt-lens' }, g);
      if (G.tall) {
        s('path', { d: 'M' + lx + ' ' + (ly + lh) + 'L' + (B[0] + 14) + ' ' + B[1] + 'M' + (lx + lw) + ' ' + (ly + lh) + 'L' + (B[0] + B[2] - 14) + ' ' + B[1], class: 'bjt-zoom' }, lens);
      } else {
        s('path', { d: 'M' + (lx + lw) + ' ' + ly + 'L' + B[0] + ' ' + (B[1] + 14) + 'M' + (lx + lw) + ' ' + (ly + lh) + 'L' + B[0] + ' ' + (B[1] + B[3] - 14), class: 'bjt-zoom' }, lens);
      }
      s('rect', { x: lx, y: ly, width: lw, height: lh, rx: 9 }, lens);

      const T = sym.bjt(g, { x: G.xT, y: yT });
      if (!G.tall) {
        // legenda delle cariche (serve soprattutto per il riquadro)
        const lg = s('g', { class: 'bjt-legend' }, g);
        [['flow', 'corrente'], ['e', 'elettrone'], ['h', 'lacuna'], ['ion', 'ioni fissi']].forEach((it, i) => {
          const x = 22;
          const y = 58 + i * 19;
          if (it[0] === 'flow') s('circle', { cx: x, cy: y, r: 2.8, class: 'bjt-lg-flow' }, lg);
          else if (it[0] === 'e') s('circle', { cx: x, cy: y, r: 3.2, class: 'ei-e' }, lg);
          else if (it[0] === 'h') s('circle', { cx: x, cy: y, r: 3.6, class: 'ei-h' }, lg);
          else {
            s('circle', { cx: x - 4, cy: y, r: 4, class: 'ei-ion-p' }, lg);
            s('path', { d: 'M' + (x - 6) + ' ' + y + 'h4', class: 'bjt-sign' }, lg);
            s('circle', { cx: x + 6, cy: y, r: 4, class: 'ei-ion-n' }, lg);
            s('path', { d: 'M' + (x + 4) + ' ' + y + 'h4M' + (x + 6) + ' ' + (y - 2) + 'v4', class: 'bjt-sign' }, lg);
          }
          s('text', { x: x + 16, y: y + 4, class: 'bjt-lg', text: it[1] }, lg);
        });
      }
      const c = {};
      // alimentazione e massa
      if (G.bat) {
        c.wRail = wire(g, [[G.bat.x, G.bat.top], [G.bat.x, G.yV], [xC, G.yV], [xC, L.top]]);
        c.wGndC = wire(g, [[xC, yG], [G.bat.x, yG], [G.bat.x, G.bat.top + G.bat.len]]);
        sym.source(g, { x: G.bat.x, y: G.bat.top, rot: 90, len: G.bat.len, kind: 'dc', label: 'Vcc', value: '12 V', side: -1 });
        sym.ground(g, { x: (xC + G.bat.x) / 2, y: yG });
      } else {
        c.wRail = wire(g, [[G.term[0], G.yV], [xC, G.yV], [xC, L.top]]);
        s('circle', { cx: G.term[0] + 5, cy: G.yV, r: 5, class: 'bjt-term' }, g);
        EI.label(g, G.term[0] + 16, G.yV + 1, '+12 V', { cls: 'bjt-supply', anchor: 'start' });
        sym.ground(g, { x: xC + 40, y: yG });
        c.wGndC = wire(g, [[xC, yG], [xC + 40, yG]]);
      }
      c.wCol = wire(g, [[xC, L.bot], [xC, T.c[1]]]);
      c.wEm = wire(g, [[xC, T.e[1]], [xC, yG]]);
      c.wGndB = wire(g, [[xC, yG], [G.gen.x, yG]]);
      c.wBase = wire(g, [[G.rb.x + G.rb.len, yT], [T.b[0], yT]]);
      dot(g, xC, yG);

      // carico: lampada (interruttore) o resistenza Rc (amplificatore)
      c.gLamp = s('g', null, g);
      c.lamp = drawLamp(c.gLamp, xC, L.top, L.bot, L.r);
      EI.label(c.gLamp, xC - L.r - (G.tall ? 10 : 22), (L.top + L.bot) / 2 - 8, 'Lampada', { cls: 'bjt-load-name', anchor: 'end' });
      EI.label(c.gLamp, xC - L.r - (G.tall ? 10 : 22), (L.top + L.bot) / 2 + 10, '12 V · 1,2 W', { cls: 'bjt-load-val', anchor: 'end' });
      c.gRc = s('g', null, g);
      sym.resistor(c.gRc, { x: xC, y: L.top, rot: 90, len: L.bot - L.top, label: 'Rc', value: '2,2 kΩ', side: -1 });

      // resistenza di base
      c.rb = sym.resistor(g, { x: G.rb.x, y: yT, len: G.rb.len, label: 'Rb', value: '2,2 kΩ' });
      c.rbVal = c.rb.label.querySelector('.value');

      // ingresso: microcontrollore (interruttore) o generatore con polarizzazione (amplificatore)
      c.gUc = s('g', null, g);
      const uc = drawMcu(c.gUc, G.uc, yT);
      c.ucSub = uc.sub;
      c.wInS = wire(c.gUc, [uc.out, [G.rb.x, yT]]);
      c.wGndS = wire(c.gUc, [[G.gen.x, yG], uc.gnd]);
      c.gGen = s('g', null, g);
      const gx = G.gen.x;
      c.wInA = wire(c.gGen, [[gx, G.gen.acTop], [gx, yT], [G.rb.x, yT]]);
      if (G.gen.dcLen) {
        c.ac = sym.source(c.gGen, { x: gx, y: G.gen.acTop, rot: 90, len: G.gen.acLen, kind: 'ac', label: 'vs', value: '', side: 1 });
        c.wMid = wire(c.gGen, [[gx, G.gen.acTop + G.gen.acLen], [gx, G.gen.dcTop]]);
        c.dc = sym.source(c.gGen, { x: gx, y: G.gen.dcTop, rot: 90, len: G.gen.dcLen, kind: 'dc', label: 'Vpol', value: '', side: 1 });
        c.wGndA = wire(c.gGen, [[gx, G.gen.dcTop + G.gen.dcLen], [gx, yG]]);
      } else {
        c.ac = sym.source(c.gGen, { x: gx, y: G.gen.acTop, rot: 90, len: G.gen.acLen, kind: 'ac', label: 'Vpol + vs', value: '', side: 1 });
        c.wGndA = wire(c.gGen, [[gx, G.gen.acTop + G.gen.acLen], [gx, yG]]);
      }
      c.pIn = probe(c.gGen, (gx + G.rb.x) / 2 + 4, yT, 'vin', 'var(--trace-2)');
      c.pOutWire = wire(c.gGen, [[xC, G.probeOut[1]], [G.probeOut[0] - 5, G.probeOut[1]]], { cls: 'thin' });
      c.pOut = probe(c.gGen, G.probeOut[0], G.probeOut[1], 'vout', 'var(--trace-1)', G.tall);

      // etichette dal vivo
      c.ibTag = EI.label(g, G.ibTag[0], G.ibTag[1], '', { cls: 'bjt-tag ib' });
      c.icTag = EI.label(g, G.icTag[0], G.icTag[1], '', { cls: 'bjt-tag ic', anchor: G.icTag[2] });
      c.badge = s('g', { class: 'bjt-badge' }, g);
      c.badgeRect = s('rect', { x: G.badge[0] - 52, y: G.badge[1] - 11, width: 104, height: 22, rx: 11 }, c.badge);
      c.badgeText = s('text', { x: G.badge[0], y: G.badge[1] + 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: '' }, c.badge);

      // correnti (verso convenzionale): percorsi invisibili che attraversano i componenti
      const hid = (d) => s('path', { d: d, class: 'ei-wire', style: 'opacity:0' }, g);
      const topStart = G.bat ? 'M' + G.bat.x + ' ' + G.bat.top + 'V' + G.yV : 'M' + G.term[0] + ' ' + G.yV;
      c.fC = new EI.Flow(g, hid(topStart + 'H' + xC + 'V' + T.c[1]));
      c.fE = new EI.Flow(g, hid('M' + xC + ' ' + T.e[1] + 'V' + yG));
      c.fGC = new EI.Flow(g, hid(G.bat ? 'M' + xC + ' ' + yG + 'H' + G.bat.x + 'V' + (G.bat.top + G.bat.len) : 'M' + xC + ' ' + yG + 'H' + (xC + 40)));
      c.fGB = new EI.Flow(g, hid('M' + xC + ' ' + yG + 'H' + gx), { spacing: 30 });
      c.fBS = new EI.Flow(c.gUc, hid('M' + uc.out[0] + ' ' + yT + 'H' + T.b[0]), { spacing: 30 });
      c.fRS = new EI.Flow(c.gUc, hid('M' + gx + ' ' + yG + 'V' + uc.gnd[1]), { spacing: 30 });
      c.fBA = new EI.Flow(c.gGen, hid('M' + gx + ' ' + G.gen.acTop + 'V' + yT + 'H' + T.b[0]), { spacing: 30 });
      c.fRA = new EI.Flow(c.gGen, hid('M' + gx + ' ' + yG + 'V' + (G.gen.acTop + G.gen.acLen)), { spacing: 30 });
      c.T = T;
      return c;
    }

    /* --- il riquadro: il transistor visto dentro --- */

    function makeInset() {
      const D = G.dev;
      const vert = D.orient === 'v';
      const map = vert
        ? (u, w) => [D.x0 + w * (D.x1 - D.x0), D.yE - u * (D.yE - D.yC)]
        : (u, w) => [D.xE + u * (D.xC - D.xE), D.y0 + w * (D.y1 - D.y0)];
      const rectUW = (u0, u1, w0, w1) => {
        const a = map(u0, w0);
        const b = map(u1, w1);
        return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), width: Math.abs(b[0] - a[0]), height: Math.abs(b[1] - a[1]) };
      };
      const setR = (el, r) => { for (const k in r) el.setAttribute(k, r[k].toFixed(2)); };
      const B = G.box;
      const g = s('g', { class: 'bjt-inset' }, svg);
      s('rect', { x: B[0], y: B[1], width: B[2], height: B[3], rx: 12, class: 'bjt-panel' }, g);
      if (vert) s('text', { x: B[0] + 14, y: B[1] + 22, class: 'bjt-panel-title', text: 'DENTRO IL TRANSISTOR' }, g);
      else s('text', { x: B[0] + B[2] - 12, y: B[1] + 20, class: 'bjt-panel-title', 'text-anchor': 'end', text: 'DENTRO IL TRANSISTOR' }, g);

      // zone drogate
      s('rect', Object.assign(rectUW(0, U_EB, 0, 1), { class: 'ei-zone-n bjt-nplus' }), g);
      s('rect', Object.assign(rectUW(U_EB, U_BC, 0, 1), { class: 'ei-zone-p' }), g);
      s('rect', Object.assign(rectUW(U_BC, 1, 0, 1), { class: 'ei-zone-n' }), g);
      // contatti di metallo
      s('rect', Object.assign(rectUW(-0.035, 0, -0.03, 1.03), { class: 'bjt-metal', rx: 2 }), g);
      s('rect', Object.assign(rectUW(1, 1.035, -0.03, 1.03), { class: 'bjt-metal', rx: 2 }), g);
      s('rect', Object.assign(rectUW(U_EB + 0.012, U_BC - 0.012, -0.16, 0), { class: 'bjt-metal', rx: 2 }), g);
      const lab3 = (u, w, t) => {
        const p = map(u, w);
        s('text', { x: p[0], y: p[1], class: 'bjt-pin', 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: t }, g);
      };
      lab3(-0.08, 0.5, 'E');
      lab3(1.08, 0.5, 'C');
      lab3((U_EB + U_BC) / 2, vert ? -0.27 : -0.42, 'B');

      // zone di svuotamento, con gli ioni fissi della giunzione base-collettore
      const depEB = s('rect', { class: 'ei-zone-dep bjt-dep' }, g);
      const depBC = s('rect', { class: 'ei-zone-dep bjt-dep' }, g);
      const clipId = 'bjt-clip-' + uid;
      const defs = s('defs', null, g);
      const clipRect = s('rect', null, s('clipPath', { id: clipId }, defs));
      const ions = s('g', { 'clip-path': 'url(#' + clipId + ')', class: 'bjt-ions' }, g);
      const across = vert ? D.x1 - D.x0 : D.y1 - D.y0;
      const along = vert ? D.yE - D.yC : D.xC - D.xE;
      const nW = Math.max(4, Math.round(across / 15));
      const du = 9 / along;
      const ion = (u, w, plus) => {
        const p = map(u, w);
        const gi = s('g', { transform: 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')' }, ions);
        s('circle', { r: 3.9, class: plus ? 'ei-ion-n' : 'ei-ion-p' }, gi);
        s('path', { d: plus ? 'M-2 0H2M0 -2V2' : 'M-2 0H2', class: 'bjt-sign' }, gi);
      };
      for (let j = 0; j < nW; j++) {
        const w = (j + 0.5) / nW;
        ion(U_BC - 0.006, w, false);
        for (let r = 0; r < 3; r++) ion(U_BC + du * (0.6 + r), w + (r % 2 ? 0.5 / nW : 0) - (r % 2 && j === nW - 1 ? 1 / nW : 0), true);
      }

      // cariche ferme: il "mare" di elettroni dell'emettitore e del collettore, le lacune della base
      const rand = rng(97 + uid);
      const seaG = s('g', { class: 'bjt-sea' }, g);
      const sea = [];
      const addSea = (u0, u1, nu, nw) => {
        for (let i = 0; i < nu; i++) {
          for (let j = 0; j < nw; j++) {
            const u = u0 + (u1 - u0) * (i + 0.2 + 0.6 * rand()) / nu;
            const w = 0.06 + 0.88 * (j + 0.2 + 0.6 * rand()) / nw;
            sea.push({ u: u, w: w, f1: 1.2 + 2 * rand(), f2: 1.2 + 2 * rand(), p1: 6.28 * rand(), p2: 6.28 * rand(), el: s('circle', { r: vert ? 2.6 : 2.7, class: 'ei-e' }, seaG) });
          }
        }
      };
      addSea(0.015, U_EB - 0.02, vert ? 6 : 6, vert ? 6 : 4);
      addSea(U_BC + 0.1, 0.985, vert ? 5 : 7, vert ? 3 : 2);
      const holesG = s('g', { class: 'bjt-holes' }, g);
      const holes = [];
      const nH = vert ? 6 : 5;
      for (let j = 0; j < nH; j++) {
        holes.push({
          hu: U_EB + 0.03 + 0.04 * rand(), hw: (j + 0.25 + 0.5 * rand()) / nH, u: 0, w: 0, state: 'home', timer: 0,
          f1: 1 + 2 * rand(), f2: 1 + 2 * rand(), p1: 6.28 * rand(), p2: 6.28 * rand(),
          el: s('circle', { r: 3.6, class: 'ei-h' }, holesG),
        });
      }
      const elecG = s('g', { class: 'bjt-elecs' }, g);
      const flashG = s('g', { class: 'bjt-flashes' }, g);

      // contatori
      const cnt = {};
      const cl = vert
        ? { x: B[0] + 16, y1: B[1] + B[3] - 66, y2: B[1] + B[3] - 44, y3: B[1] + B[3] - 18, xr: B[0] + B[2] - 16 }
        : { x: B[0] + 14, y1: B[1] + B[3] - 40, y2: B[1] + B[3] - 40, y3: B[1] + B[3] - 14, xr: B[0] + B[2] - 14 };
      if (vert) {
        s('circle', { cx: cl.x + 4, cy: cl.y1 - 4, r: 3.4, class: 'ei-e' }, g);
        s('text', { x: cl.x + 14, y: cl.y1, class: 'bjt-cnt-l', text: 'arrivati al collettore' }, g);
        cnt.c = s('text', { x: cl.xr, y: cl.y1, class: 'bjt-cnt c', 'text-anchor': 'end', text: '0' }, g);
        s('circle', { cx: cl.x + 4, cy: cl.y2 - 4, r: 3.6, class: 'ei-h' }, g);
        s('text', { x: cl.x + 14, y: cl.y2, class: 'bjt-cnt-l', text: 'ricombinati nella base' }, g);
        cnt.b = s('text', { x: cl.xr, y: cl.y2, class: 'bjt-cnt b', 'text-anchor': 'end', text: '0' }, g);
        cnt.r = s('text', { x: cl.x, y: cl.y3, class: 'bjt-cnt-r', text: '' }, g);
      } else {
        // simbolo, nome e numero: «● al collettore 123» e «○ ricombinati 1»
        s('circle', { cx: cl.x + 4, cy: cl.y1 - 5, r: 3.6, class: 'ei-e' }, g);
        s('text', { x: cl.x + 14, y: cl.y1, class: 'bjt-cnt-l', text: 'al collettore' }, g);
        cnt.c = s('text', { x: cl.x + 108, y: cl.y1, class: 'bjt-cnt c', text: '0' }, g);
        const xb = B[0] + B[2] / 2 + 26;
        s('circle', { cx: xb + 4, cy: cl.y2 - 5, r: 3.8, class: 'ei-h' }, g);
        s('text', { x: xb + 14, y: cl.y2, class: 'bjt-cnt-l', text: 'ricombinati' }, g);
        cnt.b = s('text', { x: xb + 94, y: cl.y2, class: 'bjt-cnt b', text: '0' }, g);
        cnt.r = s('text', { x: cl.x, y: cl.y3, class: 'bjt-cnt-r', text: '' }, g);
      }

      // etichette delle zone
      const zone = (u, big, small, cls, uSub) => {
        const p = map(u, 1);
        if (vert) {
          s('text', { x: p[0] + 12, y: p[1] - 2, class: 'bjt-zone ' + cls, text: big }, g);
          s('text', { x: p[0] + 12, y: p[1] + 13, class: 'bjt-zone-sub', text: small }, g);
        } else {
          // in orizzontale la base è stretta: il nome dell'emettitore si allinea a destra, lontano da «base»
          const q = map(uSub === undefined ? u : uSub, 1);
          s('text', { x: p[0], y: p[1] + 17, class: 'bjt-zone ' + cls, 'text-anchor': 'middle', text: big }, g);
          s('text', { x: uSub === undefined ? q[0] : q[0] - 8, y: p[1] + 33, class: 'bjt-zone-sub', 'text-anchor': uSub === undefined ? 'middle' : 'end', text: small }, g);
        }
      };
      zone(U_EB / 2, 'N⁺', 'emettitore', 'n', U_EB);
      zone((U_EB + U_BC) / 2, 'P', 'base', 'p');
      zone((U_BC + 1) / 2, 'N', 'collettore', 'n');

      const self = {
        elec: [], pool: [], flashes: [], spawnAcc: 0, recAcc: 0.5, nC: 0, nB: 0, key: -1, t: 0, lastC: '', lastB: '', lastR: '',
      };

      function newElectron() {
        return { el: s('circle', { r: vert ? 3.2 : 3.3, class: 'ei-e' }, elecG) };
      }
      function spawn(pRec) {
        const e = self.pool.pop() || newElectron();
        e.u = U_EB - 0.04;
        e.w = 0.08 + 0.84 * Math.random();
        e.ph = 0;
        e.age = 0;
        e.rec = false;
        self.recAcc += pRec;
        if (self.recAcc >= 1) {
          self.recAcc -= 1;
          e.rec = true;
          e.ur = U_EB + 0.02 + Math.random() * (U_BC - U_EB - 0.04);
        }
        e.el.style.display = '';
        self.elec.push(e);
      }
      function retire(e) {
        e.el.style.display = 'none';
        self.pool.push(e);
      }
      function flash(u, w) {
        let f = self.flashes.find((x) => x.life <= 0);
        if (!f) {
          const fg = s('g', null, flashG);
          f = { g: fg, core: s('circle', { r: 7, class: 'bjt-flash-core' }, fg), ring: s('circle', { r: 4, class: 'bjt-flash-ring' }, fg) };
          self.flashes.push(f);
        }
        const p = map(u, w);
        f.g.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')');
        f.life = 0.7;
      }
      function recombine(e) {
        let best = null;
        let bd = Infinity;
        for (const h of holes) {
          if (h.state !== 'home') continue;
          const d = Math.abs(h.u - e.u) * 3 + Math.abs(h.w - e.w);
          if (d < bd) { bd = d; best = h; }
        }
        flash(best ? (best.u + e.u) / 2 : e.u, best ? (best.w + e.w) / 2 : e.w);
        if (best) {
          best.state = 'gone';
          best.timer = 0.35;
        }
        self.nB += 1;
        retire(e);
      }

      function placeHole(h) {
        const p = map(h.u, h.w);
        h.el.setAttribute('cx', p[0].toFixed(1));
        h.el.setAttribute('cy', p[1].toFixed(1));
      }

      // Aggiornamento: q = punto di lavoro mostrato, dt = passo (0 con il movimento ridotto o in pausa).
      self.update = function (dt, q, reduced) {
        self.t += dt;
        const t = self.t;
        const vcb = q.vce - q.vbe;
        const wBC = clamp(0.016 * Math.sqrt(Math.max(0.03, 0.75 + vcb) / 0.75), 0.006, 0.07);
        const wEB = clamp(0.02 * Math.sqrt(Math.max(0.03, 0.85 - Math.max(0, q.vbe)) / 0.85), 0.004, 0.02);
        setR(depEB, rectUW(U_EB - 0.25 * wEB, U_EB + 0.75 * wEB, 0, 1));
        const rBC = rectUW(U_BC - 0.12 * wBC, U_BC + 0.88 * wBC, 0, 1);
        setR(depBC, rBC);
        setR(clipRect, rBC);
        const sat = q.region === 'sat';

        // il conteggio riparte quando cambia il rapporto Ic / Ib
        const ratio = q.ib > 0 && q.ic > 0 ? q.ic / q.ib : 0;
        if (ratio > 0 && Math.abs(ratio - self.key) > 0.03 * self.key) {
          self.key = ratio;
          self.nC = 0;
          self.nB = 0;
          self.recAcc = 0.5;
        }

        // cariche ferme che vibrano per l'agitazione termica
        const amp = reduced ? 0 : 1.6;
        for (const e of sea) {
          const p = map(e.u, e.w);
          e.el.setAttribute('cx', (p[0] + amp * Math.sin(t * e.f1 + e.p1)).toFixed(1));
          e.el.setAttribute('cy', (p[1] + amp * Math.sin(t * e.f2 + e.p2)).toFixed(1));
        }
        for (const h of holes) {
          if (h.state === 'gone') {
            h.timer -= dt;
            h.el.style.opacity = '0';
            if (h.timer <= 0 && dt > 0) { h.state = 'enter'; h.u = h.hu; h.w = -0.12; h.el.style.opacity = '1'; }
            if (reduced) { h.state = 'home'; h.el.style.opacity = '1'; }
          } else if (h.state === 'enter') {
            h.w += 0.9 * dt;
            if (h.w >= h.hw) { h.w = h.hw; h.state = 'home'; }
          }
          if (h.state === 'home') {
            h.u = h.hu + (reduced ? 0 : 0.006 * Math.sin(t * h.f1 + h.p1));
            h.w = h.hw + (reduced ? 0 : 0.025 * Math.sin(t * h.f2 + h.p2));
          }
          if (h.state !== 'gone') placeHole(h);
        }

        if (reduced) {
          staticStream(q, sat);
        } else if (dt > 0) {
          // elettroni iniettati: il ritmo cresce con la radice di Ic, il rapporto collettore/base è quello vero
          const frac = q.icsat > 0 ? q.ic / q.icsat : 0;
          const rateC = frac > 2e-3 ? RMAX * Math.sqrt(Math.min(1, frac)) : 0;
          const rateB = q.ic > 0 ? rateC * q.ib / q.ic : 0;
          self.spawnAcc += (rateC + rateB) * dt;
          let guard = 0;
          while (self.spawnAcc >= 1 && guard++ < 6) {
            self.spawnAcc -= 1;
            if (self.elec.length < 110) spawn(q.ib / (q.ib + q.ic));
          }
          if (rateC === 0) self.spawnAcc = 0;
          const vBase = sat ? 0.05 : 0.16;
          const sq = Math.sqrt(dt);
          const live = [];
          for (const e of self.elec) {
            e.age += dt;
            if (e.ph === 0) {
              e.u += vBase * dt + 0.05 * gauss() * sq;
              e.w += 0.28 * gauss() * sq;
              if (e.u < U_EB - 0.04) e.u = U_EB - 0.04;
              if (e.w < 0.04) e.w = 0.08 - e.w;
              if (e.w > 0.96) e.w = 1.92 - e.w;
              if (e.rec) {
                if (e.u >= e.ur) { recombine(e); continue; }
              } else if (e.u >= U_BC) {
                e.ph = 1;
              }
            } else if (e.ph === 1) {
              e.u += 1.5 * dt;
              if (e.u >= U_BC + 0.88 * wBC) { e.ph = 2; self.nC += 1; }
            } else {
              e.u += 0.36 * dt;
              e.w += 0.06 * gauss() * sq;
              e.w = clamp(e.w, 0.04, 0.96);
              if (e.u >= 1) { retire(e); continue; }
            }
            const p = map(e.u, e.w);
            e.el.setAttribute('cx', p[0].toFixed(1));
            e.el.setAttribute('cy', p[1].toFixed(1));
            e.el.style.opacity = e.age < 0.15 ? (e.age / 0.15).toFixed(2) : '';
            live.push(e);
          }
          self.elec = live;
        }

        // lampi delle ricombinazioni
        for (const f of self.flashes) {
          if (f.life <= 0) { f.g.style.display = 'none'; continue; }
          f.life -= dt;
          const k = clamp(1 - f.life / 0.7, 0, 1);
          f.g.style.display = '';
          f.g.style.opacity = (1 - k).toFixed(2);
          f.ring.setAttribute('r', (4 + 12 * k).toFixed(1));
        }

        // contatori
        const tc = num(self.nC, 0);
        const tb = num(self.nB, 0);
        if (tc !== self.lastC) { cnt.c.textContent = tc; self.lastC = tc; }
        if (tb !== self.lastB) { cnt.b.textContent = tb; self.lastB = tb; }
        let tr;
        if (!(q.ic > 0) || q.region === 'off') tr = 'Transistor spento: nessun elettrone attraversa la base.';
        else if (sat) tr = 'Saturo: ' + num(ratio, 0) + ' per ogni ricombinazione, meno di β.';
        else tr = 'Per ogni ricombinazione, ' + num(ratio, 0) + ' al collettore: è β.';
        if (!vert) tr = tr.replace('Transistor spento: nessun elettrone attraversa la base.', 'Spento: nessun elettrone passa.');
        if (tr !== self.lastR) { cnt.r.textContent = tr; self.lastR = tr; }
      };

      // Movimento ridotto: una fotografia del flusso, senza animazione.
      function staticStream(q, sat) {
        const frac = q.icsat > 0 ? q.ic / q.icsat : 0;
        const n = q.region === 'off' ? 0 : Math.max(3, Math.round(14 * Math.sqrt(Math.min(1, frac))));
        while (self.elec.length < n) {
          const e = self.pool.pop() || newElectron();
          self.elec.push(e);
        }
        while (self.elec.length > n) retire(self.elec.pop());
        self.elec.forEach((e, k) => {
          const u = U_EB - 0.02 + (1 - U_EB) * (k + 0.5) / n;
          const w = 0.15 + 0.7 * ((k * 0.618) % 1);
          const p = map(u, w);
          e.u = u;
          e.w = w;
          e.ph = u < U_BC ? 0 : 2;
          e.rec = false;
          e.age = 1;
          e.el.style.display = '';
          e.el.style.opacity = '';
          e.el.setAttribute('cx', p[0].toFixed(1));
          e.el.setAttribute('cy', p[1].toFixed(1));
        });
        const f = self.flashes[0];
        if (n > 0) {
          if (!f) flash((U_EB + U_BC) / 2, 0.4);
          const ff = self.flashes[0];
          const p = map((U_EB + U_BC) / 2, 0.4);
          ff.g.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')');
          ff.life = 0.35;
          ff.ring.setAttribute('r', '9');
          ff.g.style.display = '';
          ff.g.style.opacity = '0.9';
        } else if (f) {
          f.life = 0;
        }
        if (q.ib > 0 && q.ic > 0) {
          self.nC = Math.round(q.ic / q.ib) * (sat ? 1 : 1);
          self.nB = 1;
        }
      }

      self.reset = function () {
        self.elec.forEach(retire);
        self.elec = [];
        self.spawnAcc = 0;
        self.recAcc = 0.5;
        self.nC = 0;
        self.nB = 0;
        self.key = -1;
        self.flashes.forEach((f) => { f.life = 0; f.g.style.display = 'none'; });
        holes.forEach((h) => { h.state = 'home'; h.el.style.opacity = '1'; });
      };
      return self;
    }

    /* --- disegno completo (si rifà quando cambia la larghezza dello schermo) --- */

    function draw() {
      const tall = !!(mq && mq.matches);
      G = tall ? GEO.tall : GEO.wide;
      svg.innerHTML = '';
      svg.classList.toggle('bjt-tall', tall);
      lab.view(G.W, G.H);
      const defs = s('defs', null, svg);
      const grad = s('radialGradient', { id: 'bjt-lamp-' + uid }, defs);
      s('stop', { offset: '0', 'stop-color': '#fff6d6', 'stop-opacity': '1' }, grad);
      s('stop', { offset: '.32', 'stop-color': '#ffc54d', 'stop-opacity': '.6' }, grad);
      s('stop', { offset: '1', 'stop-color': '#ff7a1a', 'stop-opacity': '0' }, grad);
      lastReg = '';
      IN = makeInset();
      C = drawCircuit();
      applyMode();
    }

    function applyMode() {
      const sw = st.mode === 'sw';
      if (C) {
        C.gLamp.style.display = sw ? '' : 'none';
        C.gRc.style.display = sw ? 'none' : '';
        C.gUc.style.display = sw ? '' : 'none';
        C.gGen.style.display = sw ? 'none' : '';
      }
      gSw.hidden = !sw;
      gAmp.hidden = sw;
      pTr.figure.hidden = !sw;
      pScope.figure.hidden = sw;
      rBeta.el.hidden = !sw;
      rPd.el.hidden = !sw;
      rQ.el.hidden = sw;
      rGain.el.hidden = sw;
      lab.plots.forEach((p) => p.resize());
      if (IN) IN.reset();
      lab.invalidate();
    }

    /* --- grafici --- */

    const pChar = lab.plot({
      title: 'Caratteristiche di uscita', height: 230,
      x: { min: 0, max: 13, unit: 'V', count: 6, label: 'Vce' },
      y: { min: 0, max: 0.12, unit: 'A', label: 'Ic' },
      legend: [{ label: 'Ic per varie Ib', color: '#6f8a82' }, { label: 'retta di carico', color: 'var(--trace-2)' }, { label: 'punto di lavoro Q', color: 'var(--trace-1)' }],
      aria: 'Caratteristiche di uscita del transistor: corrente di collettore in funzione di Vce per varie correnti di base, con la retta di carico e il punto di lavoro',
    });
    const pTr = lab.plot({
      title: 'Uscita contro ingresso', height: 230,
      x: { min: 0, max: 5, unit: 'V', label: 'Vin' },
      y: { min: 0, max: 13, unit: 'V', count: 6, label: 'Vce' },
      legend: [{ label: 'Vce in funzione di Vin', color: 'var(--trace-1)' }],
      aria: 'Tensione tra collettore ed emettitore in funzione della tensione d\'ingresso, con le tre regioni di funzionamento',
    });
    const pScope = lab.plot({
      title: 'Oscilloscopio', height: 230,
      x: { min: 0, max: 2 / F_SIG, unit: 's', div: 8 },
      y: { min: -0.65, max: 0.65, unit: 'V', count: 5 },
      y2: { min: 0, max: 13, unit: 'V', count: 6, color: P.t1 },
      legend: [{ label: 'vin, scala a sinistra (10 volte più fine)', color: 'var(--trace-2)' }, { label: 'vout = Vce, scala a destra', color: 'var(--trace-1)' }],
      aria: 'Segnale d\'ingresso e tensione d\'uscita nel tempo',
    });
    lab.plotsEl.classList.add('cols-2');

    /* --- strumenti --- */

    const rReg = lab.readout({ label: 'Regione', color: 'var(--trace-1)', fmt: () => '' });
    const rIb = lab.readout({ label: 'Base Ib', unit: 'A', color: 'var(--trace-2)' });
    const rIc = lab.readout({ label: 'Collettore Ic', unit: 'A', color: 'var(--trace-3)' });
    const rVce = lab.readout({ label: 'Tensione Vce', unit: 'V', color: 'var(--trace-1)', max: VCC });
    const rBeta = lab.readout({ label: 'Rapporto Ic / Ib', color: 'var(--trace-4)', fmt: (v) => (v > 0 ? num(v, 0) : '—') });
    const rQ = lab.readout({ label: 'Vce a riposo (Q)', unit: 'V', color: 'var(--trace-1)' });
    const rPd = lab.readout({ label: 'Calore Vce · Ic', unit: 'W', color: 'var(--trace-4)' });
    const rGain = lab.readout({ label: 'Guadagno Av', color: 'var(--trace-1)', fmt: (v) => (Math.abs(v) < 0.05 ? '0' : (v < 0 ? '−' : '') + num(Math.abs(v), 1)) });

    /* --- comandi --- */

    const top = lab.group();
    lab.choice({
      into: top, label: 'Il transistor fa da…', value: 'sw',
      options: [{ value: 'sw', label: 'Interruttore' }, { value: 'amp', label: 'Amplificatore' }],
      onChange: (v) => { st.mode = v; applyMode(); },
    });
    const gSw = lab.group('Interruttore · lampada da 12 V e 1,2 W');
    lab.slider({ into: gSw, label: 'Tensione del piedino Vin', min: 0, max: 5, step: 0.01, value: 1.2, fmt: (v) => num(v, 2) + ' V', help: 'Un piedino digitale dà 0 V (LOW) oppure 5 V (HIGH)', onInput: (v) => { st.vin = v; } });
    lab.slider({ into: gSw, label: 'Resistenza di base Rb', min: 470, max: 100000, series: 'E12', value: 2200, unit: 'Ω', help: 'Limita la corrente di base: Ib ≈ (Vin − 0,7 V) / Rb', onInput: (v) => { st.rbS = v; } });
    const gAmp = lab.group('Amplificatore a emettitore comune · Rc = 2,2 kΩ');
    lab.slider({ into: gAmp, label: 'Polarizzazione Vpol', min: 0, max: 3, step: 0.01, value: 0.8, fmt: (v) => num(v, 2) + ' V', help: 'Tensione continua che fissa il punto di lavoro', onInput: (v) => { st.vpol = v; } });
    lab.slider({ into: gAmp, label: 'Ampiezza del segnale vs', min: 0.005, max: 0.5, log: true, value: 0.05, unit: 'V', help: 'Sinusoide da 1 kHz, rallentata nell\'animazione', onInput: (v) => { st.amp = v; } });
    lab.slider({ into: gAmp, label: 'Resistenza di base Rb', min: 1000, max: 100000, series: 'E12', value: 22000, unit: 'Ω', help: 'Fissa Ib ≈ (Vpol − 0,7 V) / Rb e pesa sul guadagno', onInput: (v) => { st.rbA = v; } });
    const gBeta = lab.group('Il transistor');
    lab.slider({ into: gBeta, label: 'Guadagno di corrente β', min: 50, max: 400, step: 10, value: 150, fmt: (v) => num(v, 0), help: 'BC547: da 110 a 800 · 2N3904 e 2N2222: da 100 a 300', onInput: (v) => { st.beta = v; } });

    lab.challenges([
      { id: 'saturo', text: 'Porta il transistor in [[saturazione-bjt|saturazione]]: Vce sotto 0,3 V e lampada accesa in pieno. Quanto vale ora Ic / Ib?', check: (q) => q.mode === 'sw' && q.vce < 0.3 },
      { id: 'milliampere', text: 'Con il piedino a 5 V, accendi la lampada in pieno usando meno di <b>1 mA</b> di corrente di base. Scegli bene Rb (e, se serve, un transistor con β più alto).', check: (q) => q.mode === 'sw' && q.vin >= 4.95 && q.region === 'sat' && q.ib < 1e-3 },
      { id: 'centro', text: 'Nell\'amplificatore, metti il [[punto-di-lavoro]] Q a metà della [[retta-di-carico]]: Vce a riposo tra 5,5 e 6,5 V.', check: (q) => q.mode === 'amp' && Math.abs(q.vceQ - VCC / 2) <= 0.5 },
      { id: 'venti', text: 'Ottieni un\'uscita circa <b>20 volte</b> più grande dell\'ingresso (guadagno tra 18 e 22) senza tosare l\'onda, con un segnale di almeno 20 mV.', check: (q) => q.mode === 'amp' && q.amp >= 0.0195 && !q.clipTop && !q.clipBottom && q.asym < 0.1 && q.gainMeas >= 18 && q.gainMeas <= 22 },
      { id: 'tosata', text: 'Alza il segnale finché l\'uscita viene tosata da tutte e due le parti: in alto dall\'[[interdizione]], in basso dalla saturazione.', check: (q) => q.mode === 'amp' && q.clipTop && q.clipBottom },
    ]);

    lab.onReset(() => {
      st.phase = 0;
      snap();
      if (IN) IN.reset();
    });

    function snap() {
      sh.vin = st.vin;
      sh.lrS = Math.log(st.rbS);
      sh.vpol = st.vpol;
      sh.la = Math.log(st.amp);
      sh.lrA = Math.log(st.rbA);
      sh.beta = st.beta;
    }

    function ease(dt) {
      if (dt === 0) { snap(); return; }
      const a = EI.approach;
      sh.vin = a(sh.vin, st.vin, dt, 9);
      sh.lrS = a(sh.lrS, Math.log(st.rbS), dt, 9);
      sh.vpol = a(sh.vpol, st.vpol, dt, 9);
      sh.la = a(sh.la, Math.log(st.amp), dt, 9);
      sh.lrA = a(sh.lrA, Math.log(st.rbA), dt, 9);
      sh.beta = a(sh.beta, st.beta, dt, 9);
    }

    const onMq = () => { if (!G || G.tall !== !!(mq && mq.matches)) draw(); };
    if (mq) {
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }
    lab.onDestroy(() => {
      if (!mq) return;
      if (mq.removeEventListener) mq.removeEventListener('change', onMq);
      else if (mq.removeListener) mq.removeListener(onMq);
    });

    /* --- aggiornamento a ogni fotogramma --- */

    const REG = {
      off: { name: 'interdizione', label: 'INTERDIZIONE', color: 'var(--scope-text)' },
      att: { name: 'zona attiva', label: 'ZONA ATTIVA', color: 'var(--trace-1)' },
      sat: { name: 'saturazione', label: 'SATURAZIONE', color: 'var(--trace-2)' },
    };
    let lastReg = '';

    function niceStep(x) {
      const m = Math.pow(10, Math.floor(Math.log10(x)));
      const n = x / m;
      return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * m;
    }

    function renderCircuit(dt, q, sw, vinNow) {
      const c = C;
      const imax = q.icsat || 1e-3;
      // colori dei fili = tensione dei nodi
      c.wRail.style.stroke = EI.vcolor(VCC, VCC);
      c.wCol.style.stroke = EI.vcolor(q.vce, VCC);
      [c.wEm, c.wGndC, c.wGndB, c.wGndS, c.wGndA].forEach((w) => { if (w) w.style.stroke = EI.vcolor(0, VCC); });
      c.wBase.style.stroke = EI.vcolor(q.vbe, VCC);
      c.wInS.style.stroke = EI.vcolor(vinNow, VCC);
      c.wInA.style.stroke = EI.vcolor(vinNow, VCC);
      if (c.wMid) c.wMid.style.stroke = EI.vcolor(sh.vpol, VCC);
      c.pOutWire.style.stroke = EI.vcolor(q.vce, VCC);

      // correnti
      const spC = EI.speedFor(q.ic, imax);
      const spB = EI.speedFor(q.ib, imax);
      const spE = EI.speedFor(q.ie, imax);
      c.fC.set(spC); c.fGC.set(spC); c.fE.set(spE); c.fGB.set(spB);
      c.fBS.set(sw ? spB : 0); c.fRS.set(sw ? spB : 0);
      c.fBA.set(sw ? 0 : spB); c.fRA.set(sw ? 0 : spB);
      [c.fC, c.fGC, c.fE, c.fGB, c.fBS, c.fRS, c.fBA, c.fRA].forEach((f) => f.step(dt));

      // lampada: potenza, colore del filamento, alone
      if (sw) {
        const pf = clamp(model.lampPower(q.ic, R_LAMP) / 1.2, 0, 1);
        const glow = Math.pow(pf, 0.75);
        c.lamp.halo.style.opacity = (0.95 * glow).toFixed(3);
        c.lamp.halo.setAttribute('r', (c.lamp.r * (2.2 + 1.8 * glow)).toFixed(1));
        c.lamp.rays.style.opacity = clamp((pf - 0.35) / 0.65, 0, 1).toFixed(3);
        const tcol = pf < 0.004 ? '' : pf < 0.12 ? EI.mix('#5a1d0e', '#e2461c', pf / 0.12) : pf < 0.45 ? EI.mix('#e2461c', '#ffb340', (pf - 0.12) / 0.33) : EI.mix('#ffb340', '#fff6d6', (pf - 0.45) / 0.55);
        c.lamp.fil.style.stroke = tcol;
        c.lamp.fil.style.filter = pf > 0.05 ? 'drop-shadow(0 0 ' + (2 + 5 * glow).toFixed(1) + 'px ' + tcol + ')' : '';
        c.lamp.bulb.style.fill = pf > 0.01 ? EI.mix('#0b1210', '#ffcf66', 0.45 * glow) : '';
        c.ucSub.textContent = (G.tall ? '' : 'OUT ') + num(vinNow, 2) + ' V';
      } else {
        c.ac.label.querySelector('.name').textContent = G.gen.dcLen ? 'vs ' + si(Math.exp(sh.la), 'V', { sig: 2, trim: true }) : 'Vpol + vs';
        if (c.dc) c.dc.label.querySelector('.name').textContent = 'Vpol ' + num(sh.vpol, 2) + ' V';
      }
      c.rbVal.textContent = si(sw ? st.rbS : st.rbA, 'Ω', { trim: true });

      const it = sw ? G.ibTag : G.ibTagA;
      c.ibTag.setAttribute('x', it[0]);
      c.ibTag.setAttribute('y', it[1]);
      c.ibTag.textContent = 'Ib ' + si(q.ib, 'A', { sig: 2 });
      c.icTag.textContent = 'Ic ' + si(q.ic, 'A', { sig: 2 });
      c.ibTag.style.opacity = q.ib > 1e-7 ? '1' : '0.35';
      c.icTag.style.opacity = q.ic > 1e-6 ? '1' : '0.35';
      const R = REG[q.region];
      if (q.region !== lastReg) {
        lastReg = q.region;
        c.badge.setAttribute('class', 'bjt-badge ' + q.region);
        c.badgeText.textContent = R.label;
      }
    }

    function renderChar(q, sw, cyc, cS) {
      const icsat = q.icsat;
      const ymax = sw ? 0.12 : niceStep(icsat * 1.25 / 4) * Math.ceil(icsat * 1.25 / niceStep(icsat * 1.25 / 4));
      pChar.setRange('y', 0, ymax);
      pChar.clear();
      const c = pChar.ctx;
      pChar.vband(0, 0.3, { color: P.t2, alpha: 0.1 });
      // famiglia di curve, una per ogni corrente di base
      const beta = cS.beta;
      const dIb = niceStep(ymax / beta / 6);
      const knee = (v) => 1 - Math.exp(-v / 0.07);
      c.save();
      c.font = '600 10px ' + 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      c.textAlign = 'right';
      c.fillStyle = '#7d978f';
      for (let k = 1; k <= 8; k++) {
        const ib = k * dIb;
        const ic = beta * ib;
        if (ic > ymax * 0.97) break;
        pChar.line((v) => ic * knee(v), { color: '#55706a', width: 1.2, glow: false, alpha: 0.9 });
        c.fillText(si(ib, 'A', { sig: 2, trim: true }), pChar.px1 - 4, pChar.Y(ic) - 4);
      }
      c.restore();
      if (q.ib > 0 && beta * q.ib < ymax * 1.5) pChar.line((v) => beta * q.ib * knee(v), { color: P.t3, width: 1.8, alpha: 0.9 });
      // retta di carico
      const rc = sw ? R_LAMP : RC_AMP;
      pChar.line([[0, VCC / rc], [VCC, 0]], { color: P.t2, width: 2, dash: [7, 5], glow: false });
      if (cyc) {
        const icAt = (v) => (VCC - v) / rc;
        pChar.line([[cyc.min, icAt(cyc.min)], [cyc.max, icAt(cyc.max)]], { color: P.t1, width: 7, alpha: 0.28, glow: false });
        // Q è il punto a riposo; il pallino che corre è il punto di lavoro istante per istante
        pChar.point(cyc.q.vce, cyc.q.ic, { color: P.t1, r: 4, label: 'Q', labelPos: cyc.q.vce > 9 ? 'left-up' : 'right-up' });
        pChar.point(q.vce, q.ic, { color: P.t1, r: 4.5, ring: false });
      } else {
        pChar.point(q.vce, q.ic, { color: P.t1, label: 'Q', labelPos: q.vce > 9 ? 'left' : 'right' });
      }
      // nomi delle regioni
      c.save();
      c.font = '700 10px ' + 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      c.fillStyle = P.t2;
      c.textAlign = 'left';
      c.fillText('← saturazione', pChar.X(0.3) + 5, pChar.Y(0) - 22);
      c.fillStyle = P.text;
      c.fillText('interdizione: Ib = 0', pChar.X(0.6), pChar.Y(0) - 6);
      c.restore();
    }

    function renderTransfer(q, cS) {
      pTr.clear();
      const vOn = model.vinFor(0.01 * q.icsat, cS.rb, cS.beta);
      const vSat = model.vinFor(q.icsat, cS.rb, cS.beta);
      pTr.vband(0, Math.min(5, vOn), { color: '#8aa39b', alpha: 0.1 });
      if (vSat < 5) pTr.vband(vSat, 5, { color: P.t2, alpha: 0.1 });
      pTr.line((v) => model.operating(v, cS).vce, { color: P.t1, width: 2.4, samples: 220 });
      pTr.point(q.vin, q.vce, { color: P.t1, label: num(q.vce, 2) + ' V', labelPos: q.vin > 3.6 ? 'left' : 'right' });
      const c = pTr.ctx;
      c.save();
      c.font = '700 10px ' + 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      c.textAlign = 'left';
      c.fillStyle = '#9fb8b0';
      if (vOn > 0.45) c.fillText('spento', pTr.px0 + 6, pTr.py1 - 8);
      if (vSat < 4.4) {
        c.fillStyle = P.t2;
        c.textAlign = 'right';
        c.fillText('saturo', pTr.px1 - 6, pTr.py0 + 14);
      }
      c.restore();
    }

    function renderScope(cyc, ampS) {
      const T = 1 / F_SIG;
      pScope.clear();
      pScope.hline(VCC, { axis: 'y2', color: P.text, alpha: 0.45, label: '12 V' });
      pScope.hline(VCESAT, { axis: 'y2', color: P.t2, alpha: 0.45 });
      const shift = st.phase / (2 * Math.PI) * T;
      const ph = (t) => ((t + shift) / T) % 1;
      const vAt = (t) => {
        const x = ph(t) * NS;
        const i = Math.floor(x) % NS;
        const f = x - Math.floor(x);
        return cyc.vce[i] + (cyc.vce[(i + 1) % NS] - cyc.vce[i]) * f;
      };
      pScope.line((t) => ampS * Math.sin(2 * Math.PI * ph(t)), { color: P.t2, width: 2 });
      pScope.line(vAt, { color: P.t1, width: 2.4, axis: 'y2' });
    }

    function explainSw(q, c) {
      const ib = si(q.ib, 'A', { sig: 2, trim: true });
      const ic = si(q.ic, 'A', { sig: 2, trim: true });
      if (q.region === 'off') {
        if (q.ib >= 1e-8) {
          return 'Con Vin = <b>' + num(q.vin, 2) + ' V</b> la giunzione base-emettitore è appena socchiusa: per aprirla davvero servono circa 0,65–0,7 V. Nella base entra un filo di corrente, <b>' + ib + '</b>, e il collettore ne lascia passare β volte tanto: appena <b>' + ic + '</b>, troppo poco per la lampada. Il transistor è ancora in [[interdizione]], un interruttore aperto.';
        }
        return 'Con Vin = <b>' + num(q.vin, 2) + ' V</b> la giunzione base-emettitore resta chiusa: per aprirla servono circa 0,6–0,7 V. Senza corrente di base non passa nemmeno quella di collettore: il transistor è in [[interdizione]], un interruttore aperto. I 12 V stanno tutti su di lui e la lampada è spenta.';
      }
      if (q.region === 'att') {
        return '[[zona-attiva|Zona attiva]]: nella base entrano <b>' + ib + '</b> e il collettore ne fa passare β volte tanti, ' + num(c.beta, 0) + ' × ' + ib + ' = <b>' + ic + '</b>. Quasi tutti gli elettroni dell\'[[emettitore]] attraversano la base e arrivano al [[collettore]]. La lampada è a metà e il transistor scalda: Vce · Ic = <b>' + si(q.pd, 'W', { sig: 2, trim: true }) + '</b>.';
      }
      const need = q.icsat / c.beta;
      let msg = '[[saturazione-bjt|Saturazione]]: nella base entrano <b>' + ib + '</b>, più dei ' + si(need, 'A', { sig: 2, trim: true }) + ' che basterebbero. Ma la lampada lascia passare al massimo (12 − 0,2) V / 120 Ω ≈ <b>' + ic + '</b>: Vce scende a 0,2 V e il transistor è un interruttore chiuso, che scalda appena <b>' + si(q.pd, 'W', { sig: 2, trim: true }) + '</b>.';
      if (q.ib > 1e-3 && q.vin > 4.9) msg += ' Però stai sprecando corrente: prova una Rb più grande.';
      return msg;
    }

    function explainAmp(cyc, c, amp) {
      const q = cyc.q;
      const vs = si(amp, 'V', { sig: 2, trim: true });
      if (q.region === 'off') {
        return 'Polarizzazione troppo bassa: a riposo il transistor è in [[interdizione]] (Vce ≈ 12 V). Un segnale di ±' + vs + ' non basta ad aprire la giunzione, e in uscita passa poco o niente. Alza Vpol verso 0,9–1 V.';
      }
      if (q.region === 'sat') {
        return 'Polarizzazione troppo alta: il transistor è saturo anche a riposo (Vce ≈ 0,2 V). L\'uscita non può scendere di più e il segnale si perde. Abbassa Vpol.';
      }
      const g = num(cyc.gain, 1);
      const qs = 'Q è a Vce = <b>' + num(q.vce, 2) + ' V</b>';
      if (cyc.clipTop || cyc.clipBottom) {
        const where = cyc.clipTop && cyc.clipBottom ? 'da tutte e due le parti: in basso il transistor va in saturazione (Vce non scende sotto 0,2 V), in alto in interdizione (Vce non sale oltre 12 V)'
          : cyc.clipBottom ? 'in basso: nei picchi positivi dell\'ingresso il transistor va in saturazione e Vce non scende sotto 0,2 V'
            : 'in alto: nei picchi negativi dell\'ingresso il transistor si spegne e Vce non sale oltre 12 V';
        return 'L\'onda d\'uscita è tosata ' + where + '. ' + qs + '. Riduci l\'ampiezza, oppure sposta Q verso il centro della [[retta-di-carico]].';
      }
      const dIb = si(cyc.ibSwing, 'A', { sig: 2, trim: true });
      const dIc = si(cyc.ibSwing * c.beta, 'A', { sig: 2, trim: true });
      const dV = si(cyc.span / 2, 'V', { sig: 2, trim: true });
      let msg = qs + ', in [[zona-attiva]]. Il segnale di ±' + vs + ' fa oscillare la corrente di base di ±' + dIb + '; il collettore la moltiplica per β: ±' + dIc + ', che su Rc = 2,2 kΩ diventano ±' + dV + '. L\'uscita è <b>' + g + ' volte</b> più grande, ma capovolta: quando l\'ingresso sale, Ic cresce e Vce scende.';
      if (cyc.gain < 17) msg += ' Per avere più guadagno serve una Rb più piccola o un β più alto: Av ≈ −β · Rc / (Rb + rπ).';
      else if (cyc.gain > 23) msg += ' Tanto guadagno, ma tutto legato a β, che cambia da un esemplare all\'altro: con una Rb più grande scende.';
      return msg;
    }

    lab.loop((dt) => {
      ease(dt);
      const sw = st.mode === 'sw';
      const cT = circuit(false);
      const cS = circuit(true);
      let qS;
      let check;
      if (sw) {
        const qT = model.operating(st.vin, cT);
        qS = model.operating(sh.vin, cS);
        renderCircuit(dt, qS, true, sh.vin);
        IN.update(dt, qS, lab.reduced);
        renderChar(qS, true, null, cS);
        renderTransfer(qS, cS);
        rBeta.set(qS.ib >= 1e-8 ? qS.ic / qS.ib : 0);
        rPd.set(qS.pd);
        rPd.state(qS.pd > 0.25 ? 'warn' : '');
        lab.explain(explainSw(qT, cT));
        check = { mode: 'sw', vin: st.vin, ib: qT.ib, ic: qT.ic, vce: qT.vce, region: qT.region };
      } else {
        if (dt > 0) st.phase = (st.phase + dt * VIS_HZ * 2 * Math.PI) % (2 * Math.PI);
        const ampS = Math.exp(sh.la);
        const cycT = model.cycle(st.vpol, st.amp, cT, NS);
        const cycS = model.cycle(sh.vpol, ampS, cS, NS);
        const vinNow = sh.vpol + ampS * Math.sin(st.phase);
        qS = model.operating(vinNow, cS);
        renderCircuit(dt, qS, false, vinNow);
        IN.update(dt, qS, lab.reduced);
        renderChar(qS, false, cycS, cS);
        renderScope(cycS, ampS);
        rQ.set(cycS.q.vce);
        rGain.set(cycS.q.region === 'att' ? -cycS.gain : 0);
        lab.explain(explainAmp(cycT, cT, st.amp));
        check = { mode: 'amp', vceQ: cycT.q.vce, amp: st.amp, gainMeas: cycT.gain, clipTop: cycT.clipTop, clipBottom: cycT.clipBottom, asym: cycT.asym, vce: qS.vce };
      }
      const R = REG[qS.region];
      rReg.text(R.name);
      rReg.el.style.setProperty('--rc', R.color);
      rIb.set(qS.ib);
      rIc.set(qS.ic);
      rVce.set(qS.vce);
      lab.check(check);
    });

    draw();
  }

  /* ---------- illustrazioni ---------- */

  // Ogni figura ha due versioni: larga per gli schermi grandi, stretta e alta per il telefono,
  // dove le scritte restano leggibili (la versione larga, rimpicciolita, le renderebbe minuscole).
  const FIG1_ALT = 'Sezione di un transistor planare con emettitore N+, base P e collettore N; simboli NPN e PNP; contenitore TO-92 del BC547 con i piedini C, B, E';
  const FIG2_ALT = 'Disegno del transistor a punte di contatto del 1947: blocchetto di germanio su un supporto metallico, cuneo di plastica con lamina d\'oro, molla e un ingrandimento delle due punte';

  function figSvg(cls, w, h, alt, body) {
    return '<svg class="' + cls + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + alt.replace(/"/g, '&quot;') + '">' + body + '</svg>';
  }
  function figLines(x, y, cls, rows) {
    return rows.map((t, i) => '<text class="' + cls + '" x="' + x + '" y="' + (y + 14 * i) + '" text-anchor="middle">' + t + '</text>').join('');
  }

  function structureFigure() {
    // tre elettroni che scendono dall'emettitore al collettore; --y è la posizione ferma (movimento ridotto)
    const e = [[0, 8], [0.8, 38], [1.6, 68]].map((d) => '<circle class="bjt-fig-e" cx="166" cy="128" r="4" style="animation-delay:-' + d[0] + 's;--y:' + d[1] + 'px"/>').join('');
    // sezione: collettore, base, emettitore, ossido e contatti
    const section =
      '<rect class="f-n" x="16" y="94" width="318" height="134"/>' +
      '<path class="f-p" d="M54 94V150Q54 170 74 170H250Q270 170 270 150V94Z"/>' +
      '<path class="f-n bjt-fig-nplus" d="M112 94V114Q112 126 124 126H196Q208 126 208 114V94Z"/>' +
      '<path class="f-soft" d="M16 84H130V94H16ZM190 84H222V94H190ZM254 84H334V94H254Z"/>' +
      '<rect class="bjt-fig-metal" x="130" y="60" width="60" height="34" rx="3"/>' +
      '<rect class="bjt-fig-metal" x="222" y="60" width="32" height="34" rx="3"/>' +
      '<rect class="bjt-fig-metal" x="16" y="228" width="318" height="14" rx="3"/>' +
      '<text class="f-mono" x="160" y="54" text-anchor="middle">E</text>' +
      '<text class="f-mono" x="238" y="54" text-anchor="middle">B</text>' +
      '<text class="f-mono" x="175" y="259" text-anchor="middle">C</text>' +
      e +
      '<text class="f-n-text" x="176" y="206">elettroni</text>';
    // simboli NPN e PNP e contenitore TO-92, senza didascalie
    const npn =
      '<text class="f-title" x="88" y="306" text-anchor="middle">NPN</text>' +
      '<circle class="f-thin" cx="92" cy="372" r="34"/>' +
      '<path class="f-line" d="M40 372H80M80 352V392M80 364L106 346V318M80 380L106 398V426"/>' +
      '<path class="f-fill" d="M106 398L94 396.5L99 389Z"/>' +
      '<text class="f-mono" x="116" y="324">C</text><text class="f-mono" x="30" y="368" text-anchor="end">B</text><text class="f-mono" x="116" y="426">E</text>';
    const pnp =
      '<text class="f-title" x="258" y="306" text-anchor="middle">PNP</text>' +
      '<circle class="f-thin" cx="262" cy="372" r="34"/>' +
      '<path class="f-line" d="M210 372H250M250 352V392M250 364L276 346V318M250 380L276 398V426"/>' +
      '<path class="f-fill" d="M252 381.5L264 382L259.5 390Z"/>' +
      '<text class="f-mono" x="286" y="324">C</text><text class="f-mono" x="200" y="368" text-anchor="end">B</text><text class="f-mono" x="286" y="426">E</text>';
    const to92 =
      '<text class="f-title" x="430" y="306" text-anchor="middle">BC547</text>' +
      '<path class="f-dark bjt-fig-body" d="M398 384V334Q398 318 414 318H446Q462 318 462 334V384Z"/>' +
      '<text class="bjt-fig-print" x="430" y="348" text-anchor="middle">BC</text>' +
      '<text class="bjt-fig-print" x="430" y="362" text-anchor="middle">547</text>' +
      '<path class="bjt-fig-leg" d="M412 384V430M430 384V430M448 384V430"/>' +
      '<text class="f-mono" x="412" y="447" text-anchor="middle">C</text><text class="f-mono" x="430" y="447" text-anchor="middle">B</text><text class="f-mono" x="448" y="447" text-anchor="middle">E</text>';

    const wide =
      '<text class="f-title" x="16" y="22">Sezione di un transistor planare</text>' +
      '<text class="f-small" x="16" y="39">non in scala: sotto l\'emettitore la base è spessa meno di un micrometro</text>' +
      section +
      '<path class="f-thin" d="M206 108H356M262 148H356M330 200H356M300 89L356 74"/>' +
      '<text class="f-text" x="362" y="78">ossido di silicio</text>' +
      '<text class="f-n-text" x="362" y="112">emettitore N⁺</text>' +
      '<text class="f-small" x="362" y="127">molto drogato</text>' +
      '<text class="f-p-text" x="362" y="152">base P</text>' +
      '<text class="f-small" x="362" y="167">sottile, poco drogata</text>' +
      '<text class="f-n-text" x="362" y="204">collettore N</text>' +
      '<text class="f-small" x="362" y="219">il più grande</text>' +
      '<path class="f-dash" d="M16 280H504"/>' +
      npn + figLines(88, 452, 'f-small', ['la freccia esce', 'dall\'emettitore']) +
      pnp + figLines(258, 452, 'f-small', ['la freccia entra: correnti', 'e tensioni al contrario']) +
      to92 + figLines(430, 466, 'f-small', ['lato piatto verso di te']);

    // telefono: legenda a colori sotto la sezione, simboli e contenitore su una riga
    const key = (y, sw, name, nameCls, desc) =>
      '<rect class="' + sw + '" x="10" y="' + (y - 11) + '" width="20" height="13" rx="2"/>' +
      '<text x="38" y="' + y + '"><tspan class="' + nameCls + '">' + name + '</tspan><tspan class="f-small" dx="8">' + desc + '</tspan></text>';
    const tall =
      '<text class="f-title" x="10" y="20">Sezione di un transistor planare</text>' +
      '<text class="f-small" x="10" y="37">non in scala: sotto l\'emettitore la base</text>' +
      '<text class="f-small" x="10" y="51">è spessa meno di un micrometro</text>' +
      '<g transform="translate(-6 18)">' + section + '</g>' +
      key(300, 'f-n bjt-fig-nplus', 'emettitore N⁺', 'f-n-text', 'molto drogato') +
      key(322, 'f-p', 'base P', 'f-p-text', 'sottile, poco drogata') +
      key(344, 'f-n', 'collettore N', 'f-n-text', 'il più grande') +
      key(366, 'f-soft', 'ossido di silicio', 'f-text', 'isolante') +
      '<path class="f-dash" d="M10 382H330"/>' +
      '<g transform="translate(-18 100)">' + npn + '</g>' + figLines(70, 552, 'f-small', ['la freccia esce', 'dall\'emettitore']) +
      '<g transform="translate(-68 100)">' + pnp + '</g>' + figLines(190, 552, 'f-small', ['la freccia entra:', 'correnti e tensioni', 'al contrario']) +
      '<g transform="translate(-140 100)">' + to92 + '</g>' + figLines(290, 566, 'f-small', ['lato piatto', 'verso di te']);

    return figSvg('bjt-fig-wide', 520, 470, FIG1_ALT, wide) + figSvg('bjt-fig-tall', 340, 594, FIG1_ALT, tall);
  }

  function firstTransistorFigure() {
    // il dispositivo: molla fissata in alto, cuneo con la lamina d'oro, germanio sul supporto di metallo
    const device =
      '<path class="f-line" d="M226 44H278"/>' +
      '<path class="f-thin" d="M234 44l-6 -8M244 44l-6 -8M254 44l-6 -8M264 44l-6 -8M274 44l-6 -8"/>' +
      '<path class="f-line" d="M252 44V54L241 59L263 66L241 73L263 80L241 87L263 94L252 99V104"/>' +
      '<path class="f-paper" d="M196 104H308L255 224Z"/>' +
      '<path class="bjt-fig-gold" d="M198 106L251.5 222M306 106L258.5 222"/>' +
      '<rect class="bjt-fig-metal" x="118" y="290" width="250" height="16" rx="3"/>' +
      '<path class="f-soft" d="M150 236L176 224H356L330 236Z"/>' +
      '<path class="f-soft" d="M330 236L356 224V280L330 290Z"/>' +
      '<rect class="f-soft" x="150" y="236" width="180" height="54"/>' +
      '<text class="f-text" x="240" y="268" text-anchor="middle">germanio</text>';
    // ingrandimento delle due punte, centrato in (448, 282) con raggio 54
    const zoom =
      '<circle class="f-paper" cx="448" cy="282" r="54"/>' +
      '<path class="f-soft" d="M396 300H500V322Q470 338 448 336Q422 336 400 322Z"/>' +
      '<path class="bjt-fig-gold" d="M416.5 242L440 298M479.5 242L456 298"/>' +
      '<path class="f-accent" d="M440 312H456M440 308V316M456 308V316"/>';

    const wide =
      '<text class="f-title" x="16" y="22">Bell Labs, dicembre 1947</text>' +
      device +
      '<path class="f-line" d="M202 116H96M302 116H372"/>' +
      '<path class="f-line" d="M118 298H80V326"/>' +
      '<path class="bjt-fig-sig in" d="M40 100q5 -5 10 0t10 0t10 0t10 0"/>' +
      '<path class="bjt-fig-sig out" d="M392 98q8 -16 16 0t16 0t16 0t16 0"/>' +
      '<text class="f-text" x="16" y="122">emettitore</text>' +
      '<text class="f-text" x="380" y="122">collettore</text>' +
      '<text class="f-text" x="16" y="330">base</text>' +
      '<path class="f-thin" d="M248 72H286M228 150H128M284 168H306"/>' +
      '<text class="f-small" x="292" y="76">molla</text>' +
      '<text class="f-small" x="16" y="154">cuneo di plastica</text>' +
      '<text class="f-accent-text" x="312" y="172">lamina d\'oro</text>' +
      '<text class="f-small" x="312" y="187">tagliata in punta con un rasoio</text>' +
      '<text class="f-small" x="243" y="334" text-anchor="middle">supporto di metallo: il contatto di base</text>' +
      '<path class="f-dash" d="M255 226L404 268"/>' +
      zoom +
      '<text class="f-accent-text" x="448" y="350" text-anchor="middle">≈ 0,05 mm</text>';

    // telefono: il dispositivo spostato a sinistra, le etichette di lato e l'ingrandimento a destra
    const tall =
      '<text class="f-title" x="8" y="20">Bell Labs, dicembre 1947</text>' +
      '<g transform="translate(-90 18)">' + device + '</g>' +
      '<path class="f-line" d="M112 134H8M212 134H332"/>' +
      '<path class="f-line" d="M28 316H14V358"/>' +
      '<path class="bjt-fig-sig in" d="M8 106q5 -5 10 0t10 0t10 0t10 0"/>' +
      '<path class="bjt-fig-sig out" d="M268 100q8 -16 16 0t16 0t16 0t16 0"/>' +
      '<text class="f-text" x="8" y="126">emettitore</text>' +
      '<text class="f-text" x="332" y="126" text-anchor="end">collettore</text>' +
      '<text class="f-text" x="22" y="362">base</text>' +
      '<path class="f-thin" d="M175 90H198M100 170H140M100 210H146"/>' +
      '<text class="f-small" x="202" y="94">molla</text>' +
      '<text class="f-small" x="96" y="164" text-anchor="end">cuneo di</text>' +
      '<text class="f-small" x="96" y="178" text-anchor="end">plastica</text>' +
      '<text class="f-accent-text" x="96" y="206" text-anchor="end">lamina d\'oro</text>' +
      '<text class="f-small" x="96" y="221" text-anchor="end">tagliata in punta</text>' +
      '<text class="f-small" x="96" y="235" text-anchor="end">con un rasoio</text>' +
      '<text class="f-small" x="153" y="342" text-anchor="middle">supporto di metallo: il contatto di base</text>' +
      '<path class="f-dash" d="M168 243L261 217"/>' +
      '<g transform="translate(298 206) scale(0.7037) translate(-448 -282)">' + zoom + '</g>' +
      '<text class="f-accent-text" x="298" y="160" text-anchor="middle">≈ 0,05 mm</text>';

    return figSvg('bjt-fig-wide', 520, 360, FIG2_ALT, wide) + figSvg('bjt-fig-tall', 340, 372, FIG2_ALT, tall);
  }

  /* ---------- capitolo ---------- */

  EI.chapter({
    id: 'bjt',
    icon: 'bjt',
    minutes: 15,
    summary: 'Il transistor bipolare è un sandwich di tre strati di silicio, N-P-N: [[emettitore]], [[base-transistor|base]] e [[collettore]]. Una piccola corrente nella base, sottilissima, lascia passare tra collettore ed emettitore una corrente β volte più grande, di solito da 100 a 300 volte. Così il transistor fa due mestieri: l\'interruttore comandato e l\'amplificatore.',
    keywords: ['guadagno-di-corrente', 'emettitore', 'base-transistor', 'collettore', 'zona-attiva', 'saturazione-bjt', 'interdizione', 'retta-di-carico'],
    model: model,
    css: [
      '.bjt-panel { fill: #060b0a; stroke: var(--lab-line); stroke-width: 1.2; }',
      '.bjt-panel-title { fill: var(--scope-text); font: 800 10px var(--mono); letter-spacing: .16em; }',
      '.bjt-nplus { fill: color-mix(in srgb, var(--trace-3) 15%, transparent); }',
      '.bjt-metal { fill: #4f5d62; stroke: #9db0b6; stroke-width: 1; }',
      '.bjt-pin { fill: var(--lab-ink); font: 800 13px var(--mono); }',
      '.bjt-dep { transition: none; }',
      '.bjt-sign { fill: none; stroke: var(--lab-ink); stroke-width: 1.3; stroke-linecap: round; }',
      '.bjt-ions { opacity: .85; }',
      '.bjt-sea .ei-e { filter: none; opacity: .5; }',
      '.bjt-elecs { filter: url(#ei-glow); }',
      '.bjt-elecs .ei-e { filter: none; }',
      '.bjt-holes .ei-h { transition: opacity .25s ease; }',
      '.bjt-flashes { filter: url(#ei-glow); }',
      '.bjt-flash-core { fill: url(#ei-hot); }',
      '.bjt-flash-ring { fill: none; stroke: var(--flow); stroke-width: 1.8; }',
      '.bjt-zone { font: 800 15px var(--mono); }',
      '.bjt-zone.n { fill: var(--trace-3); }',
      '.bjt-zone.p { fill: var(--trace-4); }',
      '.bjt-zone-sub { fill: var(--scope-text); font: 600 10.5px var(--font); }',
      '.bjt-cnt-l { fill: var(--scope-text); font: 600 11px var(--font); }',
      '.bjt-cnt { font: 800 13px var(--mono); font-variant-numeric: tabular-nums; }',
      '.bjt-cnt.c { fill: var(--trace-3); }',
      '.bjt-cnt.b { fill: var(--trace-2); }',
      '.bjt-cnt-r { fill: var(--lab-ink); font: 600 11px var(--font); }',
      '.bjt-lens rect { fill: color-mix(in srgb, var(--trace-2) 5%, transparent); stroke: var(--trace-2); stroke-width: 1.2; stroke-dasharray: 4 3; opacity: .7; }',
      '.bjt-zoom { fill: none; stroke: var(--trace-2); stroke-width: 1; stroke-dasharray: 3 5; opacity: .35; }',
      '.bjt-badge rect { fill: #050a09; stroke: currentColor; stroke-width: 1.3; }',
      '.bjt-badge text { fill: currentColor; font: 800 10.5px var(--mono); letter-spacing: .12em; }',
      '.bjt-badge.off { color: var(--scope-text); }',
      '.bjt-badge.att { color: var(--trace-1); }',
      '.bjt-badge.sat { color: var(--trace-2); }',
      '.bjt-tag { font: 700 11.5px var(--mono); }',
      '.bjt-tag.ib { fill: var(--trace-2); }',
      '.bjt-tag.ic { fill: var(--trace-3); }',
      '.bjt-bulb { fill: var(--scope-bg); stroke: currentColor; stroke-width: 2.2; }',
      '.bjt-fil { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }',
      '.bjt-rays { fill: none; stroke: #ffd27a; stroke-width: 2; stroke-linecap: round; opacity: 0; filter: url(#ei-glow); }',
      '.bjt-halo { opacity: 0; }',
      '.bjt-load-name { fill: #fff; font: 800 12px var(--font); paint-order: stroke; stroke: #0b1210; stroke-width: 3px; stroke-linejoin: round; }',
      '.bjt-load-val { fill: var(--trace-2); font: 700 11.5px var(--mono); paint-order: stroke; stroke: #0b1210; stroke-width: 3px; stroke-linejoin: round; }',
      '.bjt-supply { fill: #fff; font: 800 12px var(--mono); }',
      '.bjt-term { fill: var(--scope-bg); stroke: var(--sym); stroke-width: 2.2; }',
      '.bjt-probe circle { fill: var(--scope-bg); stroke: var(--pc); stroke-width: 2.4; }',
      '.bjt-probe text { fill: var(--pc); font: 800 11px var(--mono); }',
      '.bjt-uc-sub { font-family: var(--mono); }',
      '.bjt-lg { fill: var(--scope-text); font: 600 11px var(--font); }',
      '.bjt-lg-flow { fill: var(--flow); filter: url(#ei-glow); }',
      '@media (max-width: 640px) {',
      '  .ei-stage .bjt-tag { font-size: 15px; }',
      '  .ei-stage .bjt-badge text { font-size: 13px; }',
      '  .ei-stage .bjt-zone { font-size: 17px; }',
      '  .ei-stage .bjt-zone-sub, .ei-stage .bjt-cnt-l, .ei-stage .bjt-cnt-r { font-size: 13px; }',
      '  .ei-stage .bjt-cnt { font-size: 15px; }',
      '  .ei-stage .bjt-pin { font-size: 15px; }',
      '  .ei-stage .bjt-panel-title { font-size: 11px; }',
      '  .ei-stage .bjt-load-name { font-size: 15px; }',
      '  .ei-stage .bjt-load-val { font-size: 14px; }',
      '  .ei-stage .bjt-supply { font-size: 16px; }',
      '  .ei-stage .bjt-probe text { font-size: 14px; }',
      '}',
      '.ei-figure .bjt-fig-nplus { fill: color-mix(in srgb, var(--fig-n) 34%, var(--fig-paper)); }',
      '.ei-figure .bjt-fig-metal { fill: color-mix(in srgb, var(--fig-muted) 45%, var(--fig-paper)); stroke: var(--fig-ink); stroke-width: 1.2; }',
      '.ei-figure .bjt-fig-e { fill: var(--fig-n); animation: bjt-fall 2.4s linear infinite; }',
      '.ei-figure .bjt-fig-body { stroke: var(--fig-ink); stroke-width: 1.4; }',
      '.ei-figure .bjt-fig-print { fill: #cfd8d4; font: 700 11px var(--mono); }',
      '.ei-figure .bjt-fig-leg { fill: none; stroke: color-mix(in srgb, var(--fig-muted) 70%, var(--fig-paper)); stroke-width: 3.4; stroke-linecap: round; }',
      '.ei-figure .bjt-fig-gold { fill: none; stroke: var(--ei-hl-bright); stroke-width: 4.5; stroke-linecap: round; }',
      '.ei-figure .bjt-fig-sig { fill: none; stroke: var(--ei-hl); stroke-width: 2; stroke-linecap: round; stroke-dasharray: 5 4; animation: bjt-dash 1.1s linear infinite; }',
      '.ei-figure .bjt-fig-sig.out { stroke-width: 2.6; }',
      // core: l'icona "bjt" ha i reofori più lunghi del riquadro 64 × 64 e uscirebbero dalla scheda del capitolo
      '.ei-card[href="#bjt"] .ei-icon { overflow: hidden; }',
      '.ei-figure svg.bjt-fig-tall { display: none; }',
      '@media (max-width: 520px) {',
      '  .ei-figure svg.bjt-fig-wide { display: none; }',
      '  .ei-figure svg.bjt-fig-tall { display: block; }',
      '}',
      '@keyframes bjt-fall { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: 1; } 85% { opacity: 1; } 100% { transform: translateY(92px); opacity: 0; } }',
      '@keyframes bjt-dash { to { stroke-dashoffset: -18; } }',
      '@media (prefers-reduced-motion: reduce) {',
      '  .ei-figure .bjt-fig-e, .ei-figure .bjt-fig-sig { animation: none; }',
      '  .ei-figure .bjt-fig-e { opacity: 1; transform: translateY(var(--y, 0px)); }',
      '}',
    ].join('\n'),
    lab: {
      title: 'Una piccola corrente ne comanda una grande',
      intro: 'Alza la tensione del piedino: sotto 0,6 V non succede niente, poi la lampada si accende sempre di più, finché il transistor non è saturo. Nel riquadro <b>Dentro il transistor</b> guarda gli elettroni: partono dall\'emettitore, quasi tutti attraversano la base e pochissimi si ricombinano. Quel piccolo flusso è la corrente di base. Poi passa ad <b>Amplificatore</b> e aggiungi un piccolo segnale: l\'oscilloscopio lo mostra ingrandito e capovolto.',
      svgLabel: 'Schema: un microcontrollore o un generatore comandano la base di un transistor NPN attraverso Rb; nel collettore c\'è una lampada da 12 V o una resistenza. Accanto, il transistor ingrandito: emettitore N, base P sottile, collettore N, con gli elettroni che lo attraversano',
      mount: mount,
    },
    how: [
      'Il transistor bipolare NPN è un sandwich di tre zone dello stesso cristallo: l\'[[emettitore]] di tipo N, molto drogato; la [[base-transistor|base]] di tipo P, sottilissima e poco drogata; il [[collettore]] di tipo N, il più grande. Ci sono quindi due [[giunzione-pn|giunzioni P-N]]: base-emettitore e base-collettore.',
      'Nel funzionamento normale la giunzione base-emettitore è in [[polarizzazione-diretta]], con circa 0,6–0,7 V, mentre quella base-collettore è in [[polarizzazione-inversa]]. L\'emettitore spinge nella base un fiume di [[elettrone-libero|elettroni]].',
      'Nella base gli elettroni potrebbero [[ricombinazione|ricombinarsi]] con le [[lacuna|lacune]], ma la base è così sottile che quasi tutti la attraversano prima di trovarne una. Arrivati alla giunzione base-collettore, il campo della [[zona-di-svuotamento]] li risucchia nel collettore.',
      'Le poche lacune perse nelle ricombinazioni vanno rimpiazzate dal contatto di base: è questa la corrente di base Ib. Per ogni elettrone che si ricombina, circa β elettroni arrivano al collettore, quindi Ic = β · Ib. Il [[guadagno-di-corrente]] β vale di solito tra 100 e 300 e cambia molto da un esemplare all\'altro.',
      'Il transistor ha tre modi di lavorare. In [[interdizione]] (Vbe sotto 0,5 V circa) è spento. In [[zona-attiva]] vale Ic = β · Ib: è l\'amplificatore. In [[saturazione-bjt|saturazione]] la base riceve più corrente di quanta ne serva e la corrente la decide il carico: tra collettore ed emettitore restano circa 0,2 V, come un interruttore chiuso.',
      'Come interruttore: il piedino di un microcontrollore dà 5 V e una ventina di milliampere, troppo poco per una lampada, un motorino o un relè. Attraverso una resistenza di base comanda un transistor che porta la corrente del carico; Rb si sceglie perché Ib sia 2–5 volte più di Ic / β, così il transistor resta saturo anche con un β basso. Sui relè si mette un diodo in parallelo alla bobina, che assorbe l\'impulso di tensione allo spegnimento.',
      'Come amplificatore, nello stadio a [[emettitore-comune]]: una tensione di polarizzazione mette il [[punto-di-lavoro]] a metà della [[retta-di-carico]]; un piccolo segnale sulla base fa oscillare Ib, il collettore lo moltiplica e la resistenza Rc lo trasforma in una tensione più grande e capovolta. Il PNP funziona allo stesso modo, con drogaggi, correnti e tensioni invertiti.',
    ],
    formulas: [
      {
        name: 'Il guadagno di corrente',
        expr: '<var>I</var><sub>C</sub> = <var>β</var> · <var>I</var><sub>B</sub>',
        legend: [['I<sub>C</sub>', 'corrente di collettore'], ['I<sub>B</sub>', 'corrente di base'], ['β', 'guadagno di corrente, h<sub>FE</sub> nei datasheet: di solito 100–300']],
        note: 'L\'emettitore porta la somma delle due: I<sub>E</sub> = I<sub>C</sub> + I<sub>B</sub>. Esempio: con β = 150, 0,2 mA di base comandano 30 mA di collettore.',
      },
      {
        name: 'Saturazione: la corrente la decide il carico',
        expr: '<var>I</var><sub>C,sat</sub> = <span class="frac"><span><var>V</var><sub>CC</sub> − <var>V</var><sub>CE,sat</sub></span><span><var>R</var><sub>C</sub></span></span>',
        legend: [['V<sub>CC</sub>', 'tensione di alimentazione'], ['V<sub>CE,sat</sub>', 'tensione rimasta sul transistor saturo, circa 0,2 V'], ['R<sub>C</sub>', 'resistenza del carico nel collettore']],
        note: 'Il transistor satura se β · I<sub>B</sub> supera I<sub>C,sat</sub>. Con la lampada da 120 Ω: (12 − 0,2) V / 120 Ω ≈ 98 mA, quindi con β = 150 bastano 0,66 mA di base.',
      },
      {
        name: 'Il guadagno dell\'amplificatore',
        expr: '<var>A</var><sub>v</sub> = −<span class="frac"><span><var>β</var> · <var>R</var><sub>C</sub></span><span><var>R</var><sub>B</sub> + <var>r</var><sub>π</sub></span></span>',
        legend: [['A<sub>v</sub>', 'guadagno di tensione: il segno meno vuol dire uscita capovolta'], ['r<sub>π</sub>', 'resistenza della giunzione base-emettitore per i piccoli segnali: β · V<sub>T</sub> / I<sub>C</sub>, con V<sub>T</sub> ≈ 26 mV']],
        note: 'Per esempio, con β = 150, R<sub>C</sub> = 2,2 kΩ, R<sub>B</sub> = 15 kΩ e I<sub>C</sub> = 2,7 mA: r<sub>π</sub> ≈ 1,4 kΩ e A<sub>v</sub> ≈ −20.',
      },
    ],
    figures: [
      {
        title: 'Com\'è fatto un transistor NPN',
        svg: structureFigure(),
        caption: 'In un transistor planare le zone sono diffuse una dentro l\'altra dalla superficie della fetta di silicio. Gli elettroni scendono dall\'emettitore, attraversano la base sottile e arrivano al collettore, che ha il contatto sul retro. Sotto: i simboli dell\'NPN e del PNP e il BC547 nel contenitore TO-92. L\'ordine dei piedini cambia da un modello all\'altro: nel 2N3904 è E-B-C, quindi si controlla sempre il datasheet.',
        alt: FIG1_ALT,
      },
      {
        title: 'Il primo transistor',
        svg: firstTransistorFigure(),
        caption: 'Ricostruzione del transistor a punte di contatto di John Bardeen e Walter Brattain. Una lamina d\'oro avvolta su un cuneo di plastica, tagliata in punta con un rasoio, tocca il germanio in due punti vicinissimi; una molla tiene il cuneo premuto. Il segnale sul primo contatto, l\'emettitore, usciva dal secondo, il collettore, fino a circa cento volte più grande.',
        alt: FIG2_ALT,
      },
    ],
    history: {
      text: [
        'Dopo la guerra i Bell Labs cercavano un amplificatore che sostituisse le valvole: calde, fragili, affamate di corrente. Nel gruppo di William Shockley, il teorico John Bardeen e lo sperimentatore Walter Brattain studiavano la superficie del germanio. Il 16 dicembre 1947 Brattain avvolse una lamina d\'oro su un cuneo di plastica, la tagliò in punta con un rasoio e premette le due punte sul cristallo con una molla: un segnale applicato a una punta usciva amplificato dall\'altra. Il 23 dicembre il dispositivo fu mostrato ai dirigenti del laboratorio.',
        'Shockley, rimasto fuori dalla scoperta, lavorò per conto suo. Il 23 gennaio 1948 annotò sul quaderno l\'idea del transistor a giunzione: un sandwich di tre strati, N-P-N, in cui la corrente attraversa il cristallo invece di correre in superficie. È il transistor bipolare di questo capitolo, più robusto e prevedibile di quello a punte. Intanto il dispositivo aveva bisogno di un nome: tra le proposte, i colleghi scelsero con un voto «transistor», suggerito dall\'ingegnere John R. Pierce. I Bell Labs lo presentarono al pubblico a New York il 30 giugno 1948.',
        'Costruire davvero il sandwich richiese qualche anno. Gordon Teal e Morgan Sparks fecero crescere un cristallo di germanio dal fuso aggiungendo le impurità durante la crescita: nel 1950 ottennero i primi strati N-P-N, e il 4 luglio 1951 i Bell Labs annunciarono i transistor a giunzione, già migliori di quelli a punte. Nel 1954 Teal, passato alla Texas Instruments, annunciò i primi transistor al silicio prodotti in serie, che reggono temperature molto più alte; lo stesso anno uscì la Regency TR-1, la prima radio a transistor in commercio, con quattro transistor al germanio.',
        'Nel 1956 Shockley, Bardeen e Brattain ricevettero il premio Nobel per la fisica. Il transistor bipolare dominò l\'elettronica per vent\'anni, poi nei chip digitali lasciò il posto al MOSFET; ma negli amplificatori, nei circuiti di potenza e in quelli a radiofrequenza lavora ancora oggi.',
      ],
      events: [
        { year: 1947, title: 'Il transistor a punte di contatto', who: 'John Bardeen e Walter Brattain (Bell Labs)', text: 'Il 16 dicembre due punte d\'oro premute su un blocchetto di germanio amplificano un segnale.' },
        { year: 1948, title: 'Il sandwich N-P-N', who: 'William Shockley (Bell Labs)', text: 'Il 23 gennaio annota l\'idea del transistor a giunzione: la corrente attraversa il cristallo, non la superficie.' },
        { year: 1948, title: 'Nasce la parola «transistor»', who: 'John R. Pierce e i Bell Labs', text: 'Il nome scelto con un voto interno viene annunciato al pubblico il 30 giugno, a New York.' },
        { year: 1951, title: 'I primi transistor a giunzione', who: 'Gordon Teal e Morgan Sparks (Bell Labs)', text: 'Le giunzioni nascono dentro il cristallo di germanio mentre cresce dal fuso; l\'annuncio arriva il 4 luglio.' },
        { year: 1954, title: 'Arriva il silicio', who: 'Gordon Teal (Texas Instruments)', text: 'Il 10 maggio presenta i transistor al silicio in produzione: funzionano anche nell\'olio caldo.' },
        { year: 1956, title: 'Il premio Nobel', who: 'William Shockley, John Bardeen e Walter Brattain', text: 'Per le ricerche sui semiconduttori e la scoperta dell\'effetto transistor.' },
      ],
    },
    fun: 'Nel maggio 1954, a un convegno a Dayton, Gordon Teal ascoltò i colleghi dire che il transistor al silicio era ancora lontano. Poi annunciò di averne alcuni in tasca: fece suonare un disco attraverso un amplificatore e immerse nell\'olio caldo un transistor al germanio, e la musica si spense. Con un transistor al silicio al suo posto, la musica continuò.',
    uses: 'Il BJT serve dove un circuito debole deve comandare un carico più grande: relè, motorini, cicalini e strisce di LED pilotati da un microcontrollore. Lavora nei preamplificatori audio, negli stadi di uscita degli amplificatori, nei circuiti a radiofrequenza e, a decine, dentro gli amplificatori operazionali, il timer 555 e i regolatori di tensione. La sua Vbe cala di circa 2 mV per grado: per questo un transistor fa anche da sensore di temperatura. I classici da laboratorio sono il BC547, il 2N3904 e il 2N2222.',
    links: [
      { href: '#diodo', section: 'Questa sezione', title: 'La giunzione P-N: le due giunzioni del transistor' },
      { href: '#mosfet', section: 'Questa sezione', title: 'Il MOSFET: il transistor comandato in tensione' },
      { href: '#operazionale', section: 'Questa sezione', title: 'L\'operazionale: una ventina di transistor in un chip' },
      { href: '../porte-logiche/index.html#interruttori', section: 'Porte logiche', title: 'I transistor come interruttori nelle porte logiche' },
      { href: '../porte-logiche/index.html#famiglie', section: 'Porte logiche', title: 'Le famiglie logiche, dalla TTL al CMOS' },
      { href: '../elettronica-base/index.html#rele', section: 'Elettronica base', title: 'Il relè: un interruttore mosso da una bobina' },
    ],
    glossary: {
      'emettitore': { term: 'Emettitore', def: 'Lo strato del transistor bipolare, molto drogato, che inietta i portatori nella base. Nel simbolo porta la freccia, che indica il verso della corrente.' },
      'base-transistor': { term: 'Base', def: 'Lo strato centrale del transistor bipolare, sottilissimo e poco drogato. Una piccola corrente nella base comanda la corrente, molto più grande, tra collettore ed emettitore.' },
      'collettore': { term: 'Collettore', def: 'Lo strato del transistor bipolare che raccoglie i portatori arrivati dall\'emettitore attraverso la base. È il più grande e di solito va verso il carico e l\'alimentazione.' },
      'guadagno-di-corrente': { term: 'Guadagno di corrente β', def: 'Il rapporto tra la corrente di collettore e quella di base in zona attiva: Ic = β · Ib. Nei datasheet si chiama hFE; nei piccoli transistor vale di solito tra 100 e 300.' },
      'interdizione': { term: 'Interdizione', def: 'Lo stato di un transistor spento: senza comando (nel bipolare, con Vbe sotto 0,5 V circa) non passa corrente nel carico. È l\'interruttore aperto.' },
      'zona-attiva': { term: 'Zona attiva', def: 'Il modo di lavorare del transistor bipolare in cui Ic = β · Ib: la corrente di collettore segue quella di base in proporzione. È la zona degli amplificatori.' },
      'saturazione-bjt': { term: 'Saturazione (BJT)', def: 'Il transistor bipolare acceso al massimo: la base riceve più corrente del necessario e la corrente la limita il carico. Tra collettore ed emettitore restano circa 0,2 V: è l\'interruttore chiuso.' },
      'retta-di-carico': { term: 'Retta di carico', def: 'La retta che unisce, nel grafico corrente-tensione, i punti possibili imposti dal resto del circuito (alimentazione e carico). Il punto di lavoro sta dove incrocia la caratteristica del componente.' },
      'punto-di-lavoro': { term: 'Punto di lavoro', def: 'Le tensioni e correnti di riposo di un transistor, senza segnale (si indica con Q). In un amplificatore si mette a metà della retta di carico, per lasciare spazio al segnale in su e in giù.' },
      'emettitore-comune': { term: 'Emettitore comune', def: 'Il montaggio più usato del transistor bipolare come amplificatore: segnale sulla base, uscita sul collettore, emettitore collegato alla massa. Amplifica la tensione e la capovolge.' },
    },
  });
})();
