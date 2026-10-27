/*
 * Capitolo 5: il MOSFET.
 * Laboratorio «Il canale che si apre»: un MOSFET a canale N fa da interruttore lato basso per un carico
 * da 12 V (lampada, oppure motore con diodo di ricircolo). Il gate si comanda con un generatore
 * regolabile o con il piedino di un microcontrollore a 3,3 o 5 V. Accanto allo schema c'è la sezione
 * del transistor: il gate respinge le lacune, attira gli elettroni e apre il canale tra source e drain.
 * La carica del gate (un circuito RC con Rg e la capacità d'ingresso, τ di circa 0,4 µs) è mostrata
 * rallentata un milione di volte.
 */
(function () {
  'use strict';

  const { s, sym, wire, dot, si, num, clamp } = EI;

  /* ---------- modello fisico (puro, testato in tests/mosfet.test.js) ---------- */

  const VDD = 12; // alimentazione del carico, in volt
  const RG = 220; // resistenza in serie al gate, in ohm
  const RTH = 62; // °C/W: contenitore TO-220 senza dissipatore (valore tipico dei datasheet)
  const T_AMB = 25; // °C

  // Due MOSFET di potenza a canale N in TO-220, con valori tipici arrotondati.
  // k: parametro del canale (A/V²); rd: resistenza fissa del silicio di drift, dei contatti e dei piedini;
  // ciss: capacità d'ingresso del gate. Il "logico" ha la soglia di un IRLZ44N (1–2 V), lo "standard"
  // quella di un IRF540N (2–4 V) e quasi la sua Rds(on) garantita a 10 V (44 mΩ).
  const DEVICES = {
    logic: { id: 'logic', name: 'MOSFET logico', vth: 1.5, k: 25, rd: 0.012, ciss: 1.7e-9 },
    std: { id: 'std', name: 'MOSFET standard', vth: 3.5, k: 6, rd: 0.02, ciss: 1.9e-9 },
  };
  // Carichi da 12 V, come resistenze equivalenti a regime: lampada da 24 W (2 A) e motorino da 1,5 A.
  const LOADS = {
    lamp: { id: 'lamp', name: 'Lampada 12 V · 24 W', r: 6 },
    motor: { id: 'motor', name: 'Motore 12 V · 1,5 A', r: 8 },
  };

  const model = {
    VDD: VDD, RG: RG, RTH: RTH, DEVICES: DEVICES, LOADS: LOADS,

    // Corrente nel canale con la legge quadratica (modello di Shichman e Hodges), per vds ≥ 0.
    // Zona ohmica (o di triodo): Id = k·[(Vgs − Vth)·Vds − Vds²/2]; saturazione: Id = k/2·(Vgs − Vth)².
    channel(vgs, vds, p) {
      const vov = vgs - p.vth;
      if (vov <= 0 || vds <= 0) return 0;
      if (vds < vov) return p.k * (vov * vds - vds * vds / 2);
      return p.k / 2 * vov * vov;
    },
    saturation(vgs, p) {
      const vov = vgs - p.vth;
      return vov > 0 ? p.k / 2 * vov * vov : 0;
    },
    region(vgs, vds, p) {
      const vov = vgs - p.vth;
      if (vov <= 0) return 'off';
      return vds >= vov ? 'sat' : 'ohm';
    },
    // Resistenza da acceso: canale (1 / (k·(Vgs − Vth)) per Vds piccola) più la parte fissa.
    rdsOn(vgs, p) {
      const vov = vgs - p.vth;
      return vov > 0 ? p.rd + 1 / (p.k * vov) : Infinity;
    },

    /*
     * Interruttore lato basso: Vdd → carico rl → drain; source a massa.
     * La resistenza fissa rd sta in serie al canale, dal lato del drain, quindi il canale vede
     * Vdd = Id·(rl + rd) + Vch. Si prova la saturazione; se non è coerente (Vch < Vgs − Vth)
     * si risolve l'equazione di secondo grado della zona ohmica.
     */
    solve(vgs, vdd, rl, p) {
      const vov = vgs - p.vth;
      const R = rl + p.rd;
      let id;
      let vch;
      let region;
      if (vov <= 0) {
        id = 0;
        vch = vdd;
        region = 'off';
      } else {
        const isat = p.k / 2 * vov * vov;
        const vs = vdd - isat * R;
        if (vs >= vov) {
          id = isat;
          vch = vs;
          region = 'sat';
        } else {
          // (k/2)·Vch² − (k·Vov + 1/R)·Vch + Vdd/R = 0, radice minore (forma stabile)
          const B = p.k * vov + 1 / R;
          const disc = Math.max(0, B * B - 2 * p.k * vdd / R);
          vch = (2 * vdd / R) / (B + Math.sqrt(disc));
          id = (vdd - vch) / R;
          region = 'ohm';
        }
      }
      const vds = vch + id * p.rd;
      return { id: id, vds: vds, vch: vch, vov: Math.max(0, vov), region: region, pd: id * vds, pl: id * id * rl, vload: id * rl };
    },
    // Vgs a cui, nel circuito, il MOSFET passa dalla saturazione alla zona ohmica (Vch = Vgs − Vth).
    vOn(vdd, rl, p) {
      const kR = p.k * (rl + p.rd);
      return p.vth + (Math.sqrt(1 + 2 * kR * vdd) - 1) / kR;
    },

    power: (i, r) => i * i * r,
    junction: (pd, rth, ta) => (ta == null ? T_AMB : ta) + pd * (rth == null ? RTH : rth),

    // Il gate è un condensatore (Ciss) caricato attraverso Rg: τ = Rg·C.
    tau: (r, c) => r * c,
    gateVoltage: (v0, vdrive, t, tau) => vdrive + (v0 - vdrive) * Math.exp(-t / tau),
    gateCurrent: (vdrive, vg, rg) => (vdrive - vg) / rg,
    displacement: (c, dv, dt) => c * dv / dt, // Ig = C·ΔV/Δt
    gateCharge: (c, v) => c * v,

    // Spessore relativo del canale lungo il percorso (f = 0 al source, 1 al drain), approssimazione del
    // canale graduale: la carica nel canale è proporzionale a Vgs − Vth − V(x). In saturazione si annulla
    // al drain: il canale è «strozzato».
    channelProfile(f, vch, vov) {
      if (vov <= 0) return 0;
      const m = clamp(vch / vov, 0, 1);
      return Math.sqrt(Math.max(0, 1 - (1 - (1 - m) * (1 - m)) * clamp(f, 0, 1)));
    },
  };

  /* ---------- costanti del laboratorio ---------- */

  const SLOW = 1e6; // il gate si carica in mezzo microsecondo: nell'animazione i tempi sono rallentati un milione di volte
  const WIN = 5e-6; // finestra dell'oscilloscopio sul gate, in secondi reali
  const IMAX = 2; // corrente di riferimento per la velocità delle cariche
  const volt = (v) => num(v, v % 1 ? 1 : 0) + ' V'; // «5 V», «3,3 V»
  let UID = 0;

  const rnd = (i) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const smooth = (x) => {
    const t = clamp(x, 0, 1);
    return t * t * (3 - 2 * t);
  };
  // Successione di van der Corput: qualunque gruppo dei primi n valori è ben distribuito tra 0 e 1.
  const vdc = (i) => {
    let r = 0;
    let f = 0.5;
    let n = i + 1;
    while (n) { r += f * (n & 1); n >>= 1; f /= 2; }
    return r;
  };

  /*
   * Geometrie del banco: largo (schema a sinistra, sezione a destra) e alto (telefono: schema sopra,
   * sezione sotto). La sezione è disegnata in coordinate proprie 400 × xh e poi spostata in xs.
   */
  const GEO = {
    wide: {
      W: 720, H: 480, tall: false, xs: [318, 10], xh: 460,
      bat: { x: 30, y: 110 },
      railY: 40, gndY: 450, gndX: 140,
      load: { x: 250, top: 64, cy: 100, bot: 136, node: 152, r: 17, lblX: 214, motLblX: 196, dX: 212, fanX: 286 },
      mos: { x: 232, y: 214 },
      uc: { x: 46, y: 188, w: 72, h: 76 },
      gen: { x: 82, y: 244 },
      rg: { x: 132, len: 52 },
      lens: [186, 162, 104, 106],
      igTag: [158, 252, 'middle'],
      gLbl: [-30, -7], // lettera G accanto al gate del simbolo
      zoom: [[290, 162, 318, 14], [290, 268, 318, 466]],
      card: [90, 318, 152, 104],
    },
    tall: {
      W: 400, H: 656, tall: true, xs: [0, 274], xh: 380,
      bat: { x: 26, y: 74 },
      railY: 26, gndY: 252, gndX: 172,
      load: { x: 318, top: 44, cy: 76, bot: 108, node: 118, r: 15, lblX: 284, motLblX: 264, dX: 282, fanX: 356 },
      mos: { x: 300, y: 172 },
      uc: { x: 44, y: 146, w: 80, h: 76 },
      gen: { x: 86, y: 190 },
      rg: { x: 138, len: 58 },
      lens: [254, 120, 98, 104],
      igTag: [198, 176, 'start'],
      gLbl: [-30, 19],
      zoom: [[254, 224, 18, 276], [352, 224, 382, 276]],
      card: null,
    },
  };

  // Sezione del MOSFET, coordinate locali (larghezza 400).
  const XS = {
    W: 400,
    ys: 142, // superficie del silicio, sotto l'ossido
    gate: [122, 98, 156, 30],
    ox: [112, 128, 176, 14],
    src: [18, 134],
    drn: [266, 382],
    wellBot: 204,
    wellR: 14,
    ch: [134, 266],
    term: { s: 70, g: 200, d: 330, y: 62 },
    wdMax: 54,
    thMax: 11,
    pillY: 236, // riga dei richiami «canale N» e «zona svuotata», nel substrato
  };

  /* ---------- laboratorio ---------- */

  function mount(lab) {
    const svg = lab.svg;
    const P = EI.palette();
    const uid = ++UID;
    const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;
    svg.classList.add('mosfet-svg');

    const st = {
      mode: 'reg', vset: 0, vlogic: 5, pin: false, dev: 'logic', load: 'lamp',
      vg: 0, ig: 0, maxIg: 0, lastDrive: 0, tR: 0, hist: [],
      iLoad: 0, iDiode: 0, spin: 0, angle: 0, glow: 0, heat: 0, found: {},
    };
    let G = null;
    let C = null;
    let X = null;
    let curves = null;

    const drive = () => (st.mode === 'uc' ? (st.pin ? st.vlogic : 0) : st.vset);

    /* --- pezzi di disegno --- */

    function defs(root) {
      const d = s('defs', null, root);
      const lamp = s('radialGradient', { id: 'mosfet-lamp-' + uid }, d);
      s('stop', { offset: '0', 'stop-color': '#fff6d6', 'stop-opacity': '1' }, lamp);
      s('stop', { offset: '.35', 'stop-color': '#ffc54d', 'stop-opacity': '.6' }, lamp);
      s('stop', { offset: '1', 'stop-color': '#ff7a1a', 'stop-opacity': '0' }, lamp);
      const heat = s('radialGradient', { id: 'mosfet-heat-' + uid }, d);
      s('stop', { offset: '0', 'stop-color': '#ff7a3d', 'stop-opacity': '.8' }, heat);
      s('stop', { offset: '.55', 'stop-color': '#ff3d2e', 'stop-opacity': '.3' }, heat);
      s('stop', { offset: '1', 'stop-color': '#ff3d2e', 'stop-opacity': '0' }, heat);
      const ch = s('linearGradient', { id: 'mosfet-ch-' + uid, x1: 0, y1: 0, x2: 0, y2: 1 }, d);
      s('stop', { offset: '0', 'stop-color': '#d9f5ff', 'stop-opacity': '1' }, ch);
      s('stop', { offset: '.5', 'stop-color': '#5cc8ff', 'stop-opacity': '.85' }, ch);
      s('stop', { offset: '1', 'stop-color': '#5cc8ff', 'stop-opacity': '.25' }, ch);
      const metal = s('linearGradient', { id: 'mosfet-metal-' + uid, x1: 0, y1: 0, x2: 0, y2: 1 }, d);
      s('stop', { offset: '0', 'stop-color': '#c3d2cc' }, metal);
      s('stop', { offset: '1', 'stop-color': '#5f706a' }, metal);
    }

    function drawLamp(g, cx, top, bot, cy, r) {
      const halo = s('circle', { cx: cx, cy: cy, r: r * 3.4, fill: 'url(#mosfet-lamp-' + uid + ')', class: 'mosfet-halo', opacity: 0 }, g);
      let d = '';
      for (let k = 0; k < 8; k++) {
        const a = (k + 0.5) * Math.PI / 4;
        d += 'M' + (cx + Math.cos(a) * (r + 6)).toFixed(1) + ' ' + (cy + Math.sin(a) * (r + 6)).toFixed(1) +
          'L' + (cx + Math.cos(a) * (r + 13)).toFixed(1) + ' ' + (cy + Math.sin(a) * (r + 13)).toFixed(1);
      }
      const rays = s('path', { d: d, class: 'mosfet-rays', opacity: 0 }, g);
      const body = s('g', { class: 'ei-sym' }, g);
      s('path', { d: 'M' + cx + ' ' + top + 'V' + (cy - r) + 'M' + cx + ' ' + (cy + r) + 'V' + bot, class: 'lead' }, body);
      const bulb = s('circle', { cx: cx, cy: cy, r: r, class: 'mosfet-bulb' }, body);
      const k = r * 0.68;
      const fil = s('path', { d: 'M' + (cx - k) + ' ' + (cy - k) + 'L' + (cx + k) + ' ' + (cy + k) + 'M' + (cx - k) + ' ' + (cy + k) + 'L' + (cx + k) + ' ' + (cy - k), class: 'mosfet-fil' }, body);
      return { halo: halo, rays: rays, bulb: bulb, fil: fil };
    }

    function drawCircuit(root) {
      const g = s('g', { class: 'mosfet-circuit' }, root);
      const L = G.load;
      const M = G.mos;
      const B = G.bat;
      const yG = M.y + 12;
      const xD = M.x + 18;
      const yD = M.y - 44;
      const yS = M.y + 44;
      const o = {};

      o.heat = s('circle', { cx: M.x + 8, cy: M.y, r: 50, fill: 'url(#mosfet-heat-' + uid + ')', opacity: 0 }, g);

      // lente sul transistor: dentro c'è la sezione a fianco
      const [lx, ly, lw, lh] = G.lens;
      const lens = s('g', { class: 'mosfet-lens' }, g);
      G.zoom.forEach((z) => s('path', { d: 'M' + z[0] + ' ' + z[1] + 'L' + z[2] + ' ' + z[3], class: 'mosfet-zoom' }, lens));
      s('rect', { x: lx, y: ly, width: lw, height: lh, rx: 10 }, lens);

      // fili principali
      o.wRail = wire(g, [[B.x, B.y], [B.x, G.railY], [L.x, G.railY], [L.x, L.top]]);
      o.wLoadBot = wire(g, [[L.x, L.bot], [L.x, yD]]);
      o.wSrc = wire(g, [[xD, yS], [xD, G.gndY], [B.x, G.gndY], [B.x, B.y + 60]]);
      sym.source(g, { x: B.x, y: B.y, rot: 90, len: 60, kind: 'dc', label: '12 V', side: 1 });
      sym.ground(g, { x: G.gndX, y: G.gndY });

      // carico: lampada
      o.gLamp = s('g', null, g);
      o.lamp = drawLamp(o.gLamp, L.x, L.top, L.bot, L.cy, L.r);
      EI.label(o.gLamp, L.lblX, L.cy - 9, 'Lampada', { anchor: 'end', cls: 'mosfet-ll' });
      EI.label(o.gLamp, L.lblX, L.cy + 10, '12 V · 24 W', { anchor: 'end', cls: 'mono mosfet-val mosfet-ll' });

      // carico: motore con ventola e diodo di ricircolo
      o.gMotor = s('g', null, g);
      const mr = L.r + 1;
      const mb = s('g', { class: 'ei-sym' }, o.gMotor);
      s('path', { d: 'M' + L.x + ' ' + L.top + 'V' + (L.cy - mr) + 'M' + L.x + ' ' + (L.cy + mr) + 'V' + L.bot, class: 'lead' }, mb);
      s('path', { d: 'M' + (L.x + mr) + ' ' + L.cy + 'H' + (L.fanX - 4), class: 'lead thin' }, mb);
      s('circle', { cx: L.x, cy: L.cy, r: mr, class: 'mosfet-motor' }, mb);
      s('text', { x: L.x, y: L.cy + 1, class: 'mosfet-motor-m', 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: 'M' }, mb);
      o.fan = s('g', { class: 'mosfet-fan' }, o.gMotor);
      for (let k = 0; k < 3; k++) {
        const a = k * 120;
        s('path', { d: 'M0 0C3 -4 4 -11 0 -14C-4 -11 -3 -4 0 0Z', transform: 'rotate(' + a + ')' }, o.fan);
      }
      s('circle', { cx: 0, cy: 0, r: 2.6, class: 'hub' }, o.fan);
      o.diode = sym.diode(o.gMotor, { x: L.dX, y: L.bot, rot: 270, len: L.bot - L.top });
      o.wDtop = wire(o.gMotor, [[L.dX, L.top], [L.dX, G.railY]]);
      o.wDbot = wire(o.gMotor, [[L.dX, L.bot], [L.dX, L.node], [L.x, L.node]]);
      dot(o.gMotor, L.dX, G.railY);
      dot(o.gMotor, L.x, L.node);
      EI.label(o.gMotor, L.motLblX, L.cy - 9, 'Motore', { anchor: 'end', cls: 'mosfet-ll' });
      EI.label(o.gMotor, L.motLblX, L.cy + 10, '12 V · 1,5 A', { anchor: 'end', cls: 'mono mosfet-val mosfet-ll' });

      // comando del gate: microcontrollore
      const U = G.uc;
      o.gUc = s('g', null, g);
      const ucg = s('g', { class: 'ei-sym ic' }, o.gUc);
      s('rect', { x: U.x, y: U.y, width: U.w, height: U.h, rx: 6, class: 'chip' }, ucg);
      s('path', { d: 'M' + (U.x + U.w / 2 - 8) + ' ' + U.y + 'a8 8 0 0 0 16 0', class: 'notch' }, ucg);
      s('text', { x: U.x + U.w / 2, y: U.y + 22, class: 'ei-ic-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: 'µC' }, ucg);
      o.ucV = s('text', { x: U.x + U.w / 2, y: U.y + 44, class: 'ei-ic-sub', 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: '5 V' }, ucg);
      o.ucPin = s('text', { x: U.x + U.w / 2, y: U.y + 61, class: 'mosfet-pin-state', 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: 'BASSO' }, ucg);
      o.wUcOut = wire(o.gUc, [[U.x + U.w, yG], [G.rg.x, yG]]);
      o.wUcGnd = wire(o.gUc, [[U.x + U.w / 2, U.y + U.h], [U.x + U.w / 2, G.gndY]]);
      dot(o.gUc, U.x + U.w / 2, G.gndY);

      // comando del gate: generatore regolabile
      const gx = G.gen.x;
      const gy = G.gen.y;
      o.gGen = s('g', null, g);
      sym.source(o.gGen, { x: gx, y: gy, rot: 90, len: 60, kind: 'dc', label: 'Vg', value: '0–10 V', side: 1 });
      const arrow = s('g', { class: 'ei-sym' }, o.gGen);
      s('path', { d: 'M' + (gx - 15) + ' ' + (gy + 47) + 'L' + (gx + 15) + ' ' + (gy + 13) + 'l-7.5 2M' + (gx + 15) + ' ' + (gy + 13) + 'l-1.5 7.5', class: 'lead thin' }, arrow);
      o.wGenTop = wire(o.gGen, [[gx, gy], [gx, yG], [G.rg.x, yG]]);
      o.wGenBot = wire(o.gGen, [[gx, gy + 60], [gx, G.gndY]]);
      dot(o.gGen, gx, G.gndY);

      // resistenza di gate, filo del gate e transistor
      o.rg = sym.resistor(g, { x: G.rg.x, y: yG, len: G.rg.len, label: 'Rg', value: '220 Ω' });
      o.wGate = wire(g, [[G.rg.x + G.rg.len, yG], [M.x - 34, yG]]);
      o.T = sym.nmos(g, { x: M.x, y: M.y });
      s('text', { x: xD + 8, y: yD + 14, class: 'mosfet-pinl', text: 'D' }, g);
      s('text', { x: xD + 8, y: yS - 8, class: 'mosfet-pinl', text: 'S' }, g);
      s('text', { x: M.x + G.gLbl[0], y: yG + G.gLbl[1], class: 'mosfet-pinl', text: 'G' }, g);
      o.igTag = s('text', { x: G.igTag[0], y: G.igTag[1], class: 'mosfet-tag', 'text-anchor': G.igTag[2], text: '' }, g);

      // scheda del transistor (solo nel disegno largo)
      if (G.card) {
        const [cx, cy, cw, chh] = G.card;
        const card = s('g', { class: 'mosfet-card' }, g);
        s('rect', { x: cx, y: cy, width: cw, height: chh, rx: 8 }, card);
        s('text', { x: cx + 10, y: cy + 17, class: 'mosfet-card-title', text: 'SCHEDA TECNICA' }, card);
        o.card = [0, 1, 2, 3].map((k) => {
          const y = cy + 38 + k * 17;
          if (k === 0) return { v: s('text', { x: cx + 10, y: y, class: 'mosfet-card-row name', text: '' }, card) };
          s('text', { x: cx + 10, y: y, class: 'mosfet-card-row', text: ['', 'Vth', 'Rds(on) 4,5 V', 'Rds(on) 10 V'][k] }, card);
          return { v: s('text', { x: cx + cw - 10, y: y, class: 'mosfet-card-row val', 'text-anchor': 'end', text: '' }, card) };
        });
      }

      // cariche che scorrono (verso convenzionale), sopra a tutto
      const pth = (parent, d) => s('path', { d: d, class: 'ei-wire', style: 'opacity:0' }, parent);
      o.fSup = new EI.Flow(g, pth(g, 'M' + B.x + ' ' + (B.y + 60) + 'V' + G.railY + 'H' + L.x));
      // nel carico le cariche spariscono dentro la lampada o il motore e riappaiono dall'altra parte
      o.fLoad = new EI.Flow(g, pth(g, 'M' + L.x + ' ' + G.railY + 'V' + (L.cy - L.r - 1) + 'M' + L.x + ' ' + (L.cy + L.r + 1) + 'V' + L.node), { phase: 6 });
      o.fMos = new EI.Flow(g, pth(g, 'M' + L.x + ' ' + L.node + 'V' + (M.y - 12.5) + 'H' + M.x + 'V' + (M.y + 12.5) + 'H' + xD + 'V' + G.gndY + 'H' + B.x + 'V' + (B.y + 60)), { phase: 11 });
      o.fDiode = new EI.Flow(o.gMotor, pth(o.gMotor, 'M' + L.x + ' ' + L.node + 'H' + L.dX + 'V' + G.railY + 'H' + L.x));
      o.fGate = new EI.Flow(g, pth(g, 'M' + G.rg.x + ' ' + yG + 'H' + (M.x - 8)), { spacing: 15, cls: 'cool' });
      return o;
    }

    // Bordo arrotondato di un pozzetto N+ (fondo con gli angoli arrotondati), allargato di off.
    function wellPath(x0, x1, ys, yb, r, off) {
      const R = r + off;
      return 'M' + (x0 - off) + ' ' + ys + 'V' + (yb - r) + 'A' + R + ' ' + R + ' 0 0 0 ' + (x0 + r) + ' ' + (yb + off) +
        'H' + (x1 - r) + 'A' + R + ' ' + R + ' 0 0 0 ' + (x1 + off) + ' ' + (yb - r) + 'V' + ys + 'Z';
    }

    function drawSection(root) {
      const xh = G.xh;
      const g = s('g', { class: 'mosfet-xs', transform: 'translate(' + G.xs[0] + ',' + G.xs[1] + ')' }, root);
      const o = { holes: [], ions: [], wellE: [], chE: [], plus: [], field: [] };
      const ys = XS.ys;
      const subBot = xh - 44;
      const [ch0, ch1] = XS.ch;
      const T = XS.term;

      s('rect', { x: 0, y: 0, width: XS.W, height: xh, rx: 14, class: 'mosfet-frame' }, g);
      s('text', { x: 16, y: 23, class: 'mosfet-xtitle', text: 'DENTRO IL MOSFET' }, g);

      // substrato P, zone svuotate attorno ai pozzetti, pozzetti N+
      s('rect', { x: 10, y: ys, width: 380, height: subBot - ys, rx: 4, class: 'ei-zone-p' }, g);
      o.heat = s('ellipse', { cx: 200, cy: ys + 14, rx: 160, ry: 74, fill: 'url(#mosfet-heat-' + uid + ')', opacity: 0 }, g);
      o.depS = s('path', { d: wellPath(XS.src[0], XS.src[1], ys, XS.wellBot, XS.wellR, 3), class: 'ei-zone-dep' }, g);
      o.depD = s('path', { d: wellPath(XS.drn[0], XS.drn[1], ys, XS.wellBot, XS.wellR, 3), class: 'ei-zone-dep' }, g);
      o.dep = s('rect', { x: ch0, y: ys, width: ch1 - ch0, height: 0, class: 'ei-zone-dep mosfet-dep' }, g);
      s('path', { d: wellPath(XS.src[0], XS.src[1], ys, XS.wellBot, XS.wellR, 0), class: 'ei-zone-n mosfet-well' }, g);
      s('path', { d: wellPath(XS.drn[0], XS.drn[1], ys, XS.wellBot, XS.wellR, 0), class: 'ei-zone-n mosfet-well' }, g);

      // ioni accettori (fissi) e lacune (mobili) nel substrato
      const inWell = (x, y, m) => y < XS.wellBot + m && ((x > XS.src[0] - m && x < XS.src[1] + m) || (x > XS.drn[0] - m && x < XS.drn[1] + m));
      let n = 0;
      for (let j = 0; ; j++) {
        const y0 = 157 + j * 25.5;
        if (y0 > subBot - 12) break;
        for (let i = 0; i < 14; i++) {
          const x0 = 25 + i * 28.5 + (j % 2) * 13;
          if (x0 > 384) continue;
          const x = x0 + (rnd(++n) - 0.5) * 9;
          const y = y0 + (rnd(++n) - 0.5) * 8;
          if (inWell(x, y, 9) || y > subBot - 9) continue;
          if ((i + j) % 2 === 0) {
            const el = s('circle', { cx: x, cy: y, r: 4.6, class: 'ei-h' }, g);
            o.holes.push({ hx: x, hy: y, x: x, y: y, op: 1, ph: rnd(++n) * 6.28, el: el });
          } else {
            const el = s('g', { class: 'mosfet-ion', transform: 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')' }, g);
            s('circle', { r: 5.4, class: 'ei-ion-p' }, el);
            s('path', { d: 'M-2.6 0H2.6', class: 'mosfet-ion-sign' }, el);
            o.ions.push({ x: x, y: y, el: el, on: false });
          }
        }
      }

      // elettroni liberi nei pozzetti N+
      [XS.src, XS.drn].forEach((w, wi) => {
        for (let j = 0; j < 3; j++) {
          for (let i = 0; i < 5; i++) {
            const x = w[0] + 14 + i * 22 + (j % 2) * 9 + (rnd(++n) - 0.5) * 5;
            const y = ys + 10 + j * 14 + (rnd(++n) - 0.5) * 4;
            if (x > w[1] - 8) continue;
            const el = s('circle', { cx: x, cy: y, r: 3, class: 'ei-e' }, g);
            o.wellE.push({ x: x, y: y, ph: rnd(++n) * 6.28 + wi, el: el });
          }
        }
      });

      // canale: lo strato di inversione sotto l'ossido, e i suoi elettroni
      o.chPath = s('path', { d: '', class: 'mosfet-channel', fill: 'url(#mosfet-ch-' + uid + ')', opacity: 0 }, g);
      for (let i = 0; i < 18; i++) {
        const el = s('circle', { r: 2.7, class: 'ei-e', opacity: 0 }, g);
        o.chE.push({ i: i, u: vdc(i), r: rnd(++n), el: el });
      }

      // linee del campo elettrico, dal gate verso il silicio
      for (let i = 0; i < 6; i++) {
        const x = 147 + i * 21.2;
        const gl = s('g', { class: 'mosfet-field', opacity: 0 }, g);
        o.field.push({ x: x, line: s('path', { d: '' }, gl), head: s('path', { d: '', class: 'mosfet-field-head' }, gl), g: gl });
      }

      // ossido, gate, contatti, terminali
      const [ox, oy, ow, oh] = XS.ox;
      s('rect', { x: ox, y: oy, width: ow, height: oh, rx: 1.5, class: 'mosfet-oxide' }, g);
      const [gx, gy, gw, gh] = XS.gate;
      s('rect', { x: gx, y: gy, width: gw, height: gh, rx: 3, fill: 'url(#mosfet-metal-' + uid + ')', class: 'mosfet-gate' }, g);
      o.gateTint = s('rect', { x: gx, y: gy, width: gw, height: gh, rx: 3, class: 'mosfet-gate-tint', opacity: 0 }, g);
      for (let i = 0; i < 10; i++) {
        o.plus.push({ x: gx + gw / 2, el: s('text', { x: gx + gw / 2, y: gy + gh - 6, class: 'mosfet-plus', 'text-anchor': 'middle', opacity: 0, text: '+' }, g) });
      }
      s('rect', { x: 40, y: oy, width: 60, height: oh, rx: 1.5, fill: 'url(#mosfet-metal-' + uid + ')', class: 'mosfet-metal' }, g);
      s('rect', { x: 300, y: oy, width: 60, height: oh, rx: 1.5, fill: 'url(#mosfet-metal-' + uid + ')', class: 'mosfet-metal' }, g);
      s('rect', { x: 10, y: subBot, width: 380, height: 8, rx: 2, fill: 'url(#mosfet-metal-' + uid + ')', class: 'mosfet-metal' }, g);

      o.wS = wire(g, [[T.s, T.y], [T.s, oy]]);
      o.wG = wire(g, [[T.g, T.y], [T.g, gy]]);
      o.wD = wire(g, [[T.d, T.y], [T.d, oy]]);
      o.wB = wire(g, [[372, subBot + 8], [372, subBot + 16]]);
      sym.ground(g, { x: 372, y: subBot + 16 });
      [[T.s, 'S', 'source'], [T.g, 'G', 'gate'], [T.d, 'D', 'drain']].forEach(([x, k, word]) => {
        s('circle', { cx: x, cy: T.y, r: 5, class: 'mosfet-term' }, g);
        const t = s('text', { x: x, y: T.y - 17, class: 'mosfet-tname', 'text-anchor': 'middle' }, g);
        s('tspan', { text: k }, t);
        s('tspan', { class: 'mosfet-tword', dx: 5, text: word }, t);
      });
      o.tvS = s('text', { x: T.s + 9, y: T.y + 18, class: 'mosfet-tval', text: '0 V' }, g);
      o.tvG = s('text', { x: T.g + 9, y: T.y + 18, class: 'mosfet-tval', text: '' }, g);
      o.tvD = s('text', { x: T.d + 9, y: T.y + 18, class: 'mosfet-tval', text: '' }, g);

      // etichette
      const lbl = (x, y, text, cls, anchor) => s('text', { x: x, y: y, class: 'mosfet-xlabel' + (cls ? ' ' + cls : ''), 'text-anchor': anchor || 'middle', text: text }, g);
      lbl(96, 100, 'ossido', 'dim');
      lbl(96, 113, 'SiO₂', 'dim');
      s('path', { d: 'M104 117L114 131', class: 'mosfet-leader' }, g);
      lbl((XS.src[0] + XS.src[1]) / 2, XS.wellBot - 9, 'N+', 'n big');
      lbl((XS.drn[0] + XS.drn[1]) / 2, XS.wellBot - 9, 'N+', 'n big');
      lbl(22, subBot - 10, 'substrato P', 'p big', 'start');
      lbl(380, subBot - 10, 'corpo (B), a 0 V', 'dim', 'end');
      // richiami che compaiono con i fenomeni: una pastiglia nel substrato e una linea fino al punto giusto
      const pill = (text, cls, side) => {
        const pg = s('g', { class: 'mosfet-pill ' + cls, opacity: 0 }, g);
        const p = {
          g: pg, side: side, w: 0, cx: 200, est: text.length,
          lead: s('path', { d: '', class: 'mosfet-pill-lead' }, pg),
          dot: s('circle', { r: 2.4, class: 'mosfet-pill-dot' }, pg),
          box: s('rect', { x: 0, y: XS.pillY - 10.5, width: 10, height: 21, rx: 10.5 }, pg),
        };
        p.tx = s('text', { x: 200, y: XS.pillY + 4, 'text-anchor': 'middle', text: text }, pg);
        return p;
      };
      o.pCh = pill('canale N', 'n', -1);
      o.pDep = pill('zona svuotata', 'amber', 1);
      o.lFlow = lbl(200, XS.pillY + 38, 'elettroni: dal source al drain →', 'n');
      o.lFlow.setAttribute('opacity', 0);

      // legenda
      const lg = s('g', { class: 'mosfet-legend', transform: 'translate(0,' + (xh - 16) + ')' }, g);
      const tall = G.tall;
      const pos = tall ? [16, 108, 186, 276] : [22, 108, 180, 268];
      s('circle', { cx: pos[0], cy: -4, r: 3, class: 'ei-e' }, lg);
      s('text', { x: pos[0] + 9, y: 0, text: 'elettrone' }, lg);
      s('circle', { cx: pos[1], cy: -4, r: 4, class: 'ei-h' }, lg);
      s('text', { x: pos[1] + 9, y: 0, text: 'lacuna' }, lg);
      const ion = s('g', { transform: 'translate(' + pos[2] + ',-4)' }, lg);
      s('circle', { r: 4.6, class: 'ei-ion-p' }, ion);
      s('path', { d: 'M-2.2 0H2.2', class: 'mosfet-ion-sign' }, ion);
      s('text', { x: pos[2] + 9, y: 0, text: 'ione fisso' }, lg);
      s('circle', { cx: pos[3], cy: -4, r: 2.8, class: 'ei-flow-dot mosfet-legend-flow' }, lg);
      s('text', { x: pos[3] + 9, y: 0, text: 'corrente' }, lg);
      return o;
    }

    function draw() {
      const tall = !!(mq && mq.matches);
      G = tall ? GEO.tall : GEO.wide;
      svg.innerHTML = '';
      svg.classList.toggle('tall', tall);
      lab.view(G.W, G.H);
      defs(svg);
      C = drawCircuit(svg);
      X = drawSection(svg);
      applyMode();
      applyLoad();
      lab.invalidate();
    }

    function applyMode() {
      const uc = st.mode === 'uc';
      if (C) {
        C.gUc.style.display = uc ? '' : 'none';
        C.gGen.style.display = uc ? 'none' : '';
      }
      if (ctl.set) {
        ctl.set.el.hidden = uc;
        ctl.logic.el.hidden = !uc;
        ctl.pin.el.hidden = !uc;
      }
    }
    function applyLoad() {
      const lamp = st.load === 'lamp';
      if (C) {
        C.gLamp.style.display = lamp ? '' : 'none';
        C.gMotor.style.display = lamp ? 'none' : '';
      }
      curves = null;
    }

    /* --- strumenti --- */

    const rVg = lab.readout({ label: 'Tensione Vgs', unit: 'V', color: 'var(--trace-2)', max: 10 });
    const rVds = lab.readout({ label: 'Tensione Vds', unit: 'V', color: 'var(--trace-2)', max: VDD });
    const rId = lab.readout({ label: 'Corrente Id', unit: 'A', color: 'var(--trace-3)', max: 2 });
    const rRds = lab.readout({ label: 'Resistenza Rds', fmt: (v) => (isFinite(v) ? si(v, 'Ω') : '∞ · aperto'), color: 'var(--trace-1)' });
    const rP = lab.readout({ label: 'Calore nel MOSFET', unit: 'W', color: 'var(--trace-4)', max: 6 });
    const rIg = lab.readout({ label: 'Corrente di gate Ig', fmt: (v) => (v === 0 ? '0 A' : si(v, 'A', { signed: true })), color: 'var(--trace-3)' });
    const rState = lab.readout({ label: 'Stato del MOSFET', fmt: (v) => v, wide: true });

    /* --- grafici --- */

    const pT = lab.plot({
      title: 'Trasferimento · Id contro Vgs, con il carico', height: 200,
      x: { min: 0, max: 10, unit: 'V', count: 5 },
      y: { min: 0, max: 2.5, unit: 'A', count: 5 },
      legend: [{ label: 'Id nel circuito', color: 'var(--trace-1)' }, { label: 'k/2·(Vgs − Vth)²', color: 'var(--trace-3)' }, { label: 'l\'altro MOSFET', color: '#5f746d' }],
      aria: 'Corrente di drain in funzione della tensione del gate, con la soglia e il punto di lavoro',
    });
    const pG = lab.plot({
      title: 'Oscilloscopio sul gate · rallentato un milione di volte', height: 200,
      x: { min: -WIN, max: 0, unit: 's', count: 5 },
      y: { min: 0, max: 12, unit: 'V', count: 6 },
      y2: { min: -0.05, max: 0.05, unit: 'A', color: P.t3 },
      legend: [{ label: 'Vgs', color: 'var(--trace-2)' }, { label: 'Ig (scala a destra)', color: 'var(--trace-3)' }],
      aria: 'Tensione e corrente del gate negli ultimi microsecondi',
    });
    lab.plotsEl.classList.add('cols-2');

    /* --- comandi --- */

    const ctl = {};
    const gDrive = lab.group('Comando del gate');
    ctl.mode = lab.choice({
      into: gDrive, label: 'Chi comanda il gate', value: 'reg',
      options: [{ value: 'reg', label: 'Generatore 0–10 V' }, { value: 'uc', label: 'Microcontrollore' }],
      onChange: (v) => { st.mode = v; applyMode(); },
    });
    ctl.set = lab.slider({
      into: gDrive, label: 'Tensione del generatore', min: 0, max: 10, step: 0.05, value: 0,
      fmt: (v) => num(v, 2) + ' V', help: 'Il gate si carica attraverso Rg = 220 Ω',
      onInput: (v) => { st.vset = v; },
    });
    ctl.logic = lab.choice({
      into: gDrive, label: 'Alimentazione del µC', value: 5,
      options: [{ value: 3.3, label: '3,3 V (ESP32, Pico)' }, { value: 5, label: '5 V (Arduino Uno)' }],
      onChange: (v) => { st.vlogic = v; },
    });
    ctl.pin = lab.toggle({
      into: gDrive, label: 'Piedino di uscita', on: 'ALTO · 1 logico', off: 'BASSO · 0 logico', value: false,
      onChange: (v) => { st.pin = v; },
    });
    const gParts = lab.group('Componenti');
    lab.choice({
      into: gParts, label: 'Transistor', value: 'logic',
      options: [{ value: 'logic', label: 'Logico · Vth 1,5 V' }, { value: 'std', label: 'Standard · Vth 3,5 V' }],
      onChange: (v) => { st.dev = v; curves = null; },
    });
    lab.choice({
      into: gParts, label: 'Carico da 12 V', value: 'lamp',
      options: [{ value: 'lamp', label: 'Lampada 24 W' }, { value: 'motor', label: 'Motore con diodo' }],
      onChange: (v) => { st.load = v; applyLoad(); },
    });

    lab.challenges([
      { id: 'soglia', text: 'Trova la [[soglia-mosfet|soglia]] di tutti e due i MOSFET: con il generatore alza Vgs a piccoli passi e fermati appena nel drain passano almeno 10 mA, con la lampada ancora debole.', check: (q) => q.found.logic && q.found.std },
      { id: 'tre-volt', text: 'Il tuo microcontrollore lavora a 3,3 V: scegli il transistor giusto e fai girare il motore a piena velocità.', check: (q) => q.mode === 'uc' && q.vlogic === 3.3 && q.pin && q.load === 'motor' && q.settled && q.region === 'ohm' && q.vload > 11.5 },
      { id: 'fresco', text: 'Accendi del tutto la lampada da 2 A facendo scaldare il MOSFET meno di 0,1 W: quale transistor e quale tensione di gate servono?', check: (q) => q.load === 'lamp' && q.settled && q.id >= 1.9 && q.pd < 0.1 },
      { id: 'gate-zero', text: 'Accendi un carico e guarda la corrente di gate: una punta di decine di milliampere mentre il gate si carica, poi aspetta che torni a zero.', check: (q) => q.id > 1 && q.maxIg > 0.005 && q.ig === 0 && q.settled },
      { id: 'caldo', text: 'Lascia il MOSFET a metà strada, in [[saturazione-mosfet|saturazione]], con la lampada: fai salire il calore oltre 5 W. Perché un interruttore non deve mai restare così?', check: (q) => q.load === 'lamp' && q.settled && q.region === 'sat' && q.pd > 5 },
    ]);

    lab.onReset(() => {
      st.vg = 0;
      st.ig = 0;
      st.maxIg = 0;
      st.lastDrive = 0;
      st.hist = [];
      st.iLoad = 0;
      st.iDiode = 0;
      st.spin = 0;
      st.glow = 0;
      st.heat = 0;
      applyMode();
      applyLoad();
    });

    const onMq = () => { if (!G || G.tall !== !!(mq && mq.matches)) draw(); };
    // quando il font vero è pronto le pastiglie dei richiami vanno rimisurate
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!X) return;
        X.pCh.w = 0;
        X.pDep.w = 0;
        lab.invalidate();
      });
    }
    if (mq) {
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }
    lab.onDestroy(() => {
      if (!mq) return;
      if (mq.removeEventListener) mq.removeEventListener('change', onMq);
      else if (mq.removeListener) mq.removeListener(onMq);
    });

    /* --- gate: carica RC del condensatore d'ingresso --- */

    // Con il movimento ridotto (o in pausa) il gate arriva subito alla tensione finale: l'oscilloscopio
    // mostra comunque la curva completa della carica.
    function synthStep(v0, v1, tau) {
      const out = [];
      const ts = st.tR - WIN * 0.8;
      for (let k = 0; k <= 200; k++) {
        const t = st.tR - WIN + WIN * k / 200;
        if (t < ts) out.push([t, v0, 0]);
        else {
          if (!out.length || out[out.length - 1][0] < ts) {
            out.push([ts, v0, 0]);
            out.push([ts, v0, model.gateCurrent(v1, v0, RG)]);
          }
          const v = model.gateVoltage(v0, v1, t - ts, tau);
          out.push([t, v, model.gateCurrent(v1, v, RG)]);
        }
      }
      st.hist = out;
    }

    function stepGate(dt, frozen, tau) {
      const vd = drive();
      if (vd !== st.lastDrive) {
        // nuovo comando: se il gate era fermo comincia una nuova commutazione
        if (st.ig === 0) st.maxIg = 0;
        st.maxIg = Math.max(st.maxIg, Math.abs(model.gateCurrent(vd, st.vg, RG)));
        if (frozen) synthStep(st.vg, vd, tau);
        st.lastDrive = vd;
      }
      if (frozen) {
        st.vg = vd;
        st.ig = 0;
        return vd;
      }
      if (dt > 0) {
        const dtR = dt / SLOW;
        st.vg = model.gateVoltage(st.vg, vd, dtR, tau);
        if (Math.abs(vd - st.vg) < 2.2e-4) st.vg = vd; // sotto 1 µA il gate è carico
        st.ig = st.vg === vd ? 0 : model.gateCurrent(vd, st.vg, RG);
        st.maxIg = Math.max(st.maxIg, Math.abs(st.ig));
        st.tR += dtR;
        st.hist.push([st.tR, st.vg, st.ig]);
        while (st.hist.length > 2 && st.hist[1][0] < st.tR - WIN) st.hist.shift();
      }
      return vd;
    }

    /* --- aggiornamento della sezione --- */

    function updateSection(sol, dev, dt, t, frozen) {
      const ys = XS.ys;
      const [ch0, ch1] = XS.ch;
      const Lc = ch1 - ch0;
      const vg = st.vg;
      const vov = Math.max(0, vg - dev.vth);
      const wd = XS.wdMax * Math.sqrt(clamp(vg / dev.vth, 0, 1));
      const thMax = 4 + XS.thMax * Math.sqrt(clamp(vov / 3, 0, 1));
      const chA = smooth(vov / 0.2);
      const prof = (f) => model.channelProfile(f, sol.vch, vov);
      const jig = frozen ? 0 : 1.1;

      // zona svuotata e lacune spinte in profondità
      X.dep.setAttribute('height', wd.toFixed(1));
      X.dep.style.opacity = clamp(wd / 10, 0, 1).toFixed(2);
      // le lacune nella zona svuotata scivolano verso il basso e si allontanano (escono dal contatto del corpo)
      const edge = ys + wd;
      for (const h of X.holes) {
        const under = h.hx > ch0 - 10 && h.hx < ch1 + 10;
        const push = under && wd > 0.5 ? smooth((edge + 4 - h.hy) / 7) : 0;
        const ty = h.hy + push * (Math.max(0, edge - h.hy) + 12);
        const to = 1 - push;
        h.y = frozen ? ty : EI.approach(h.y, ty, dt, 5);
        h.op = frozen ? to : EI.approach(h.op, to, dt, 5);
        const x = h.hx + jig * Math.sin(t * 2.1 + h.ph);
        const y = h.y + jig * Math.cos(t * 1.7 + h.ph * 1.3);
        h.el.setAttribute('cx', x.toFixed(1));
        h.el.setAttribute('cy', y.toFixed(1));
        h.el.setAttribute('opacity', h.op.toFixed(2));
      }
      for (const ion of X.ions) {
        const on = ion.x > ch0 && ion.x < ch1 && ion.y < ys + wd;
        if (on !== ion.on) { ion.on = on; ion.el.classList.toggle('exposed', on); }
      }
      // allargamento della zona svuotata attorno al drain, polarizzato in inversa
      const offD = 3 + 9 * Math.sqrt(clamp(sol.vds / VDD, 0, 1));
      X.depD.setAttribute('d', wellPath(XS.drn[0], XS.drn[1], ys, XS.wellBot, XS.wellR, offD));
      for (const e of X.wellE) {
        e.el.setAttribute('cx', (e.x + jig * Math.sin(t * 2.4 + e.ph)).toFixed(1));
        e.el.setAttribute('cy', (e.y + jig * Math.cos(t * 1.9 + e.ph * 1.3)).toFixed(1));
      }

      // canale con lo spessore che si stringe verso il drain
      if (chA > 0.001) {
        let top = 'M' + ch0 + ' ' + ys;
        let bot = '';
        const N = 24;
        for (let k = N; k >= 0; k--) {
          const f = k / N;
          const th = Math.max(0.6, thMax * prof(f));
          bot += 'L' + (ch0 + Lc * f).toFixed(1) + ' ' + (ys + th).toFixed(1);
        }
        top += 'H' + ch1;
        X.chPath.setAttribute('d', top + bot + 'Z');
      }
      X.chPath.setAttribute('opacity', chA.toFixed(3));

      // elettroni del canale: la densità segue lo spessore, la velocità ne è l'inversa (corrente costante)
      const nVis = X.chE.length * clamp(0.3 + 0.7 * vov / 2.5, 0, 1);
      const v0 = EI.speedFor(sol.id, IMAX) * 0.5;
      if (frozen) placeStatic(prof);
      for (const e of X.chE) {
        if (!frozen && v0 > 0) {
          const q = Math.max(0.2, prof(e.u));
          e.u += v0 / q / Lc * dt;
          if (e.u >= 1) e.u -= 1;
        }
        const x = ch0 + e.u * Lc;
        const th = thMax * prof(e.u);
        const y = ys + 1.6 + Math.max(0.4, th - 2.4) * (0.15 + 0.7 * e.r);
        const ends = v0 > 0 && !frozen ? smooth(e.u / 0.06) * smooth((1 - e.u) / 0.06) : 1;
        const op = chA * clamp(nVis - e.i, 0, 1) * ends;
        e.el.setAttribute('cx', x.toFixed(1));
        e.el.setAttribute('cy', y.toFixed(1));
        e.el.setAttribute('opacity', op.toFixed(2));
      }

      // campo elettrico e cariche positive sul gate
      const fa = clamp(vg / 5, 0, 1) * 0.85;
      const yEnd = ys + Math.max(7, wd) - 3;
      for (const f of X.field) {
        f.line.setAttribute('d', 'M' + f.x + ' 129V' + yEnd.toFixed(1));
        f.head.setAttribute('d', 'M' + (f.x - 3.2) + ' ' + (yEnd - 5).toFixed(1) + 'L' + f.x + ' ' + yEnd.toFixed(1) + 'L' + (f.x + 3.2) + ' ' + (yEnd - 5).toFixed(1) + 'Z');
        f.g.setAttribute('opacity', fa.toFixed(2));
      }
      // cariche + sul gate: una ogni volt, distribuite in modo uniforme sull'armatura (scivolano quando ne arriva una nuova)
      const nPlus = Math.min(X.plus.length, Math.ceil(vg - 0.02));
      const [gx, , gw] = XS.gate;
      X.plus.forEach((p, i) => {
        const tx = gx + 10 + (gw - 20) * (Math.min(i, Math.max(0, nPlus - 1)) + 0.5) / Math.max(1, nPlus);
        p.x = frozen ? tx : EI.approach(p.x, tx, dt, 7);
        p.el.setAttribute('x', p.x.toFixed(1));
        p.el.setAttribute('opacity', clamp(vg - i, 0, 1).toFixed(2));
      });
      X.gateTint.style.fill = EI.vcolor(vg, VDD);
      X.gateTint.setAttribute('opacity', (0.15 + 0.35 * clamp(vg / 10, 0, 1)).toFixed(2));

      // terminali
      X.wG.style.stroke = EI.vcolor(vg, VDD);
      X.wD.style.stroke = EI.vcolor(sol.vds, VDD);
      X.wS.style.stroke = EI.vcolor(0, VDD);
      X.wB.style.stroke = EI.vcolor(0, VDD);
      X.tvG.textContent = si(vg, 'V');
      X.tvD.textContent = si(sol.vds, 'V');

      // etichette che compaiono con i fenomeni
      fitPills();
      const fCh = 0.28;
      pointPill(X.pCh, ch0 + Lc * fCh, ys + Math.max(1.5, thMax * prof(fCh)) / 2, chA);
      pointPill(X.pDep, ch0 + Lc * 0.78, ys + Math.max(6, wd) - 3, clamp(wd / 24, 0, 1));
      X.lFlow.setAttribute('opacity', (sol.id > 0.005 ? 0.9 : 0).toFixed(2));
      X.heat.setAttribute('opacity', st.heat.toFixed(3));
    }

    // Movimento ridotto: elettroni del canale fermi, distribuiti come la carica (più fitti verso il source).
    function placeStatic(prof) {
      const N = 40;
      const cdf = [0];
      for (let k = 1; k <= N; k++) cdf.push(cdf[k - 1] + prof((k - 0.5) / N) + 1e-6);
      const tot = cdf[N];
      const count = X.chE.length;
      X.chE.forEach((e, idx) => {
        const target = (vdc(idx) * count + 0.5) / (count + 1) * tot;
        let k = 1;
        while (k < N && cdf[k] < target) k++;
        const f0 = (k - 1) / N;
        const span = cdf[k] - cdf[k - 1];
        e.u = clamp(f0 + (span > 0 ? (target - cdf[k - 1]) / span : 0) / N, 0, 0.999);
      });
    }

    // Pastiglie dei richiami: larghezza misurata sul testo (stima finché il font non è pronto), poi
    // affiancate ai due lati del centro così da non toccarsi anche con i caratteri grandi del telefono.
    function fitPills() {
      [X.pCh, X.pDep].forEach((p) => {
        if (p.w) return;
        let w = 0;
        try { w = p.tx.getComputedTextLength(); } catch { w = 0; }
        const fs = G.tall ? 13.5 : 12;
        p.w = (w > 0 ? w : p.est * fs * 0.56) + 20;
        if (!(w > 0)) p.w = -p.w; // provvisoria: riprova al prossimo fotogramma
        const ww = Math.abs(p.w);
        p.cx = p.side < 0 ? 196 - ww / 2 : 204 + ww / 2;
        p.box.setAttribute('x', (p.cx - ww / 2).toFixed(1));
        p.box.setAttribute('width', ww.toFixed(1));
        p.tx.setAttribute('x', p.cx.toFixed(1));
        if (p.w < 0) p.w = 0;
      });
    }
    function pointPill(p, x, y, a) {
      const y0 = XS.pillY - 10.5;
      p.lead.setAttribute('d', 'M' + p.cx.toFixed(1) + ' ' + y0 + 'L' + x.toFixed(1) + ' ' + (y + 3).toFixed(1));
      p.dot.setAttribute('cx', x.toFixed(1));
      p.dot.setAttribute('cy', y.toFixed(1));
      p.g.setAttribute('opacity', a.toFixed(2));
    }

    /* --- grafici --- */

    function buildCurves() {
      const dev = DEVICES[st.dev];
      const other = DEVICES[st.dev === 'logic' ? 'std' : 'logic'];
      const rl = LOADS[st.load].r;
      const sample = (f) => {
        const a = [];
        for (let i = 0; i <= 400; i++) {
          const v = 10 * i / 400;
          a.push([v, f(v)]);
        }
        return a;
      };
      curves = {
        main: sample((v) => model.solve(v, VDD, rl, dev).id),
        other: sample((v) => model.solve(v, VDD, rl, other).id),
        law: sample((v) => {
          const i = model.saturation(v, dev);
          return i > 3.2 ? NaN : i;
        }),
        vOn: model.vOn(VDD, rl, dev),
      };
    }

    function drawPlots(sol, dev, load) {
      if (!curves) buildCurves();
      pT.clear();
      pT.vband(dev.vth, curves.vOn, { color: P.t2, alpha: 0.08 });
      pT.hline(VDD / load.r, { color: P.text, alpha: 0.45, label: 'limite del carico ' + si(VDD / load.r, 'A', { trim: true }) });
      pT.line(curves.other, { color: '#5f746d', width: 1.6, glow: false });
      pT.line(curves.law, { color: P.t3, width: 1.4, glow: false, dash: [5, 4], alpha: 0.85 });
      pT.line(curves.main, { color: P.t1, width: 2.4, fill: P.t1, fillAlpha: 0.07 });
      pT.vline(dev.vth, { color: P.t2, alpha: 0.8, label: 'Vth ' + num(dev.vth, 1) + ' V' });
      if (st.mode === 'uc') {
        pT.vline(st.vlogic, { color: P.t3, alpha: 0.7, dash: [2, 3] });
        pT.tag(pT.X(st.vlogic), pT.py1 - 36, 'µC ' + volt(st.vlogic), P.t3, 'right');
      }
      // vicino al limite del carico l'etichetta del punto scende sotto la curva, lontano da quella del limite
      const nearTop = sol.id > 0.75 * VDD / load.r;
      const side = st.vg > 6.5 ? 'left' : 'right';
      pT.point(st.vg, sol.id, { color: P.t2, label: nearTop ? '' : si(sol.id, 'A'), labelPos: side });
      if (nearTop) pT.tag(pT.X(st.vg), pT.Y(sol.id, pT.opts.y) + 22, si(sol.id, 'A'), P.t2, side);

      pG.clear();
      pG.hline(0, { axis: 'y2', color: P.t3, alpha: 0.35, dash: [2, 4] });
      const h = st.hist.length > 1 ? st.hist : [[st.tR - WIN, st.vg, 0], [st.tR, st.vg, 0]];
      const t0 = st.tR;
      const last = h[h.length - 1];
      const ext = last[0] < t0 ? h.concat([[t0, st.vg, st.ig]]) : h;
      const first = ext[0][0] > t0 - WIN ? [[t0 - WIN, ext[0][1], 0]].concat(ext) : ext;
      pG.line(first.map((p) => [p[0] - t0, p[2]]), { color: P.t3, width: 1.8, axis: 'y2' });
      pG.line(first.map((p) => [p[0] - t0, p[1]]), { color: P.t2, width: 2.4 });
      pG.point(0, st.vg, { color: P.t2, r: 3.5, ring: false });
    }

    /* --- spiegazione dal vivo --- */

    function message(q, dev, target) {
      const vth = num(dev.vth, 1) + ' V';
      if (q.charging) {
        let m = 'Il gate ' + (q.ig > 0 ? 'sale' : 'scende') + ': è l\'armatura di un condensatore, la [[capacita-di-gate|capacità di gate]] (circa ' + si(dev.ciss, 'F', { trim: true }) + '), che attraverso Rg ' + (q.ig > 0 ? 'si carica' : 'si scarica') + ' con una punta di corrente fino a <b>' + si(q.maxIg, 'A') + '</b>. Nella realtà tutto si svolge in un paio di microsecondi: qui è rallentato un milione di volte.';
        if (st.load === 'motor' && st.iDiode > 0.05) m += ' La bobina del motore non vuole fermare la sua corrente: per un attimo la fa girare nel diodo di ricircolo.';
        else if (target.region !== 'off' && q.ig > 0) m += ' Nel passaggio il MOSFET attraversa per un istante la saturazione: lì si perde energia a ogni commutazione.';
        return m;
      }
      const vgT = drive();
      let m;
      if (target.region === 'off') {
        if (vgT < 0.05) {
          m = 'Gate a 0 V: tra source e drain ci sono due giunzioni P‑N una contro l\'altra (N+, P, N+) e quella del drain è in [[polarizzazione-inversa|polarizzazione inversa]]. Il MOSFET è un interruttore aperto: sul drain ci sono tutti i 12 V e nel carico non passa corrente.' +
            (st.mode === 'reg' ? ' Alza piano la tensione del gate.' : ' Porta il piedino del microcontrollore su ALTO.');
        } else {
          m = 'Vgs = <b>' + si(vgT, 'V') + '</b>: il gate positivo crea un campo elettrico che attraversa l\'ossido e spinge in profondità le [[lacuna|lacune]]. Sotto il gate resta una [[zona-di-svuotamento|zona svuotata]], con gli ioni negativi fissi, ma non c\'è ancora un canale: sei sotto la [[soglia-mosfet|soglia]] di ' + vth + ' e la corrente è zero.';
          if (st.mode === 'uc') m += ' Con un piedino a ' + volt(st.vlogic) + ' questo MOSFET standard non si accende nemmeno: serve un [[mosfet-logico|MOSFET logico]].';
        }
      } else if (target.region === 'sat') {
        const T = model.junction(target.pd);
        m = 'Oltre la soglia di ' + vth + ', sotto l\'ossido si forma un sottile [[canale-di-inversione|canale N]], ma vicino al drain si strozza: il MOSFET è in [[saturazione-mosfet|saturazione]] e passa solo Id = k/2·(Vgs − Vth)² = <b>' + si(target.id, 'A') + '</b>. Su di lui restano <b>' + si(target.vds, 'V') + '</b>';
        if (target.pd > 1) {
          m += ' e dissipa <b>' + si(target.pd, 'W') + '</b>: senza dissipatore arriverebbe a circa ' + num(Math.round(T / 5) * 5, 0) + ' °C' +
            (T > 175 ? ', oltre il massimo del chip (150–175 °C). Un interruttore non deve mai restare a metà strada.' : '.');
        } else m += ' e dissipa ' + si(target.pd, 'W') + '.';
      } else if (target.pd > 0.25) {
        // zona ohmica, ma con il gate ancora troppo basso: la Rds è alta e il MOSFET scalda
        const T = num(Math.round(model.junction(target.pd)), 0);
        m = 'Il canale collega source e drain e il MOSFET è nella zona ohmica, ma non è acceso del tutto: la Rds vale <b>' + si(target.vds / target.id, 'Ω') + '</b>, su di lui restano <b>' + si(target.vds, 'V') + '</b> e scalda P = I²·R = <b>' + si(target.pd, 'W') + '</b>. Senza dissipatore il chip arriverebbe a circa ' + T + ' °C.';
        if (st.mode === 'uc' && st.dev === 'std') {
          const alt = model.solve(vgT, VDD, LOADS[st.load].r, DEVICES.logic);
          m += ' Un MOSFET standard è garantito acceso solo con 10 V sul gate: con lo stesso piedino un [[mosfet-logico|MOSFET logico]] scalderebbe appena ' + si(alt.pd, 'W') + '.';
        } else m += ' Con più tensione sul gate la [[rds-on|Rds(on)]] scende e il calore cala.';
      } else {
        m = 'Canale largo e pieno di elettroni: il MOSFET è acceso del tutto e fa da piccola resistenza, la [[rds-on|Rds(on)]] = <b>' + si(target.vds / target.id, 'Ω') + '</b>. Sul carico arrivano quasi tutti i 12 V (Vds = <b>' + si(target.vds, 'V') + '</b>) e il MOSFET scalda solo P = I²·R = <b>' + si(target.pd, 'W') + '</b>.';
        if (st.mode === 'uc') m += ' Il microcontrollore ha speso solo la carica del gate: a regime non gli serve corrente.';
      }
      if (target.region === 'ohm' && st.load === 'motor') m += ' Il diodo accanto al motore serve allo spegnimento: protegge il MOSFET dalla sovratensione della bobina.';
      if (lab.reduced && st.maxIg > 1e-3) m += ' Per cambiare la tensione del gate è servita una punta di corrente di ' + si(st.maxIg, 'A') + ': la vedi sull\'oscilloscopio.';
      return m;
    }

    const STATES = {
      off: { text: 'SPENTO · interdizione', color: 'var(--scope-text)' },
      sat: { text: 'A METÀ · saturazione', color: 'var(--trace-2)' },
      ohm: { text: 'ACCESO · zona ohmica', color: 'var(--trace-1)' },
    };

    /* --- ciclo di aggiornamento --- */

    lab.loop((dt, t) => {
      if (!C) return;
      const dev = DEVICES[st.dev];
      const load = LOADS[st.load];
      const frozen = lab.reduced || lab.paused;
      const tau = model.tau(RG, dev.ciss);
      const vd = stepGate(dt, frozen, tau);
      const sol = model.solve(st.vg, VDD, load.r, dev);
      const target = model.solve(vd, VDD, load.r, dev);
      const lamp = st.load === 'lamp';

      // carico: il motore è una bobina e tiene la corrente per un attimo (diodo di ricircolo)
      if (frozen || lamp || sol.id >= st.iLoad) st.iLoad = sol.id;
      else st.iLoad = EI.approach(st.iLoad, sol.id, dt, 3.5);
      st.iDiode = lamp ? 0 : Math.max(0, st.iLoad - sol.id);
      const glowT = Math.pow(clamp(sol.pl / 24, 0, 1), 0.6);
      const heatT = Math.pow(clamp(sol.pd / 6, 0, 1), 0.6);
      const spinT = lamp ? 0 : clamp(st.iLoad * load.r / VDD, 0, 1);
      if (frozen) {
        st.glow = glowT;
        st.heat = heatT;
        st.spin = spinT;
      } else {
        st.glow = EI.approach(st.glow, glowT, dt, 14);
        st.heat = EI.approach(st.heat, heatT, dt, 1.4);
        st.spin = EI.approach(st.spin, spinT, dt, 1.6);
        st.angle = (st.angle + st.spin * 900 * dt) % 360;
      }

      // fili colorati con la tensione
      const vc = (v) => EI.vcolor(v, VDD);
      C.wRail.style.stroke = vc(VDD);
      C.wLoadBot.style.stroke = vc(sol.vds);
      C.wSrc.style.stroke = vc(0);
      C.wGate.style.stroke = vc(st.vg);
      C.wGenTop.style.stroke = vc(vd);
      C.wUcOut.style.stroke = vc(vd);
      C.wGenBot.style.stroke = vc(0);
      C.wUcGnd.style.stroke = vc(0);
      C.wDtop.style.stroke = vc(VDD);
      C.wDbot.style.stroke = vc(sol.vds);

      // cariche che scorrono
      C.fSup.set(EI.speedFor(sol.id, IMAX));
      C.fMos.set(EI.speedFor(sol.id, IMAX));
      C.fLoad.set(EI.speedFor(st.iLoad, IMAX));
      C.fDiode.set(EI.speedFor(st.iDiode, IMAX));
      C.fGate.set(EI.speedFor(st.ig, IMAX));
      [C.fSup, C.fMos, C.fLoad, C.fDiode, C.fGate].forEach((f) => f.step(dt));

      // lampada, motore, calore, canale nel simbolo
      C.lamp.halo.setAttribute('opacity', (st.glow * 0.95).toFixed(3));
      C.lamp.rays.setAttribute('opacity', clamp(st.glow * 1.3 - 0.3, 0, 1).toFixed(3));
      C.lamp.fil.style.stroke = st.glow > 0.03 ? EI.mix('#d3e5de', '#fff4c2', st.glow) : '';
      C.lamp.bulb.style.fill = 'rgba(255, 214, 120, ' + (st.glow * 0.35).toFixed(3) + ')';
      C.fan.setAttribute('transform', 'translate(' + G.load.fanX + ',' + G.load.cy + ') rotate(' + st.angle.toFixed(1) + ')');
      C.fan.style.opacity = (0.45 + 0.55 * st.spin).toFixed(2);
      C.heat.setAttribute('opacity', st.heat.toFixed(3));
      C.T.setChannel(smooth(sol.vov / 0.6));
      C.ucV.textContent = volt(st.vlogic);
      C.ucPin.textContent = st.pin ? 'ALTO' : 'BASSO';
      C.ucPin.classList.toggle('on', st.pin);
      C.igTag.textContent = 'Ig ' + (st.ig === 0 ? '0 A' : si(st.ig, 'A', { signed: true }));
      if (C.card) {
        C.card[0].v.textContent = dev.name;
        C.card[1].v.textContent = num(dev.vth, 1) + ' V';
        C.card[2].v.textContent = si(model.rdsOn(4.5, dev), 'Ω');
        C.card[3].v.textContent = si(model.rdsOn(10, dev), 'Ω');
      }

      updateSection(sol, dev, dt, t, frozen);

      // strumenti
      rVg.set(st.vg);
      rVds.set(sol.vds);
      rId.set(sol.id);
      rRds.set(sol.id > 1e-6 ? sol.vds / sol.id : Infinity);
      rP.set(sol.pd);
      rP.state(sol.pd > 1 ? 'danger' : sol.pd > 0.25 ? 'warn' : sol.region === 'ohm' ? 'ok' : '');
      rIg.set(st.ig);
      rIg.state(st.ig !== 0 ? 'warn' : '');
      const S = STATES[sol.region];
      rState.text(S.text);
      rState.el.style.setProperty('--rc', S.color);

      drawPlots(sol, dev, load);

      const settled = st.ig === 0;
      if (st.mode === 'reg' && settled && sol.id >= 0.01 && st.vg <= dev.vth + 0.25) st.found[st.dev] = true;
      const q = {
        mode: st.mode, vlogic: st.vlogic, pin: st.pin, dev: st.dev, load: st.load,
        vg: st.vg, ig: st.ig, maxIg: st.maxIg, settled: settled,
        charging: !settled && Math.abs(st.ig) > 2e-4 && st.maxIg > 2e-3,
        id: sol.id, vds: sol.vds, region: sol.region, pd: sol.pd, vload: sol.vload, found: st.found,
      };
      lab.explain(message(q, dev, target));
      lab.check(q);
    });

    draw();
  }

  /* ---------- illustrazioni ---------- */

  // Figura 1: la sezione di un MOSFET a canale N con il canale formato.
  function sectionFigure() {
    let dots = '';
    [56, 310].forEach((x0) => {
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 2; j++) dots += '<circle class="f-n-dot" cx="' + (x0 + 18 + i * 24 + j * 10) + '" cy="' + (129 + j * 11) + '" r="3"/>';
      }
    });
    [[64, 194], [100, 212], [138, 192], [172, 218], [206, 196], [240, 222], [274, 196], [308, 218], [342, 194], [378, 212], [414, 196], [150, 236], [330, 236], [420, 230]].forEach(([x, y]) => {
      dots += '<circle class="f-p-dot" cx="' + x + '" cy="' + y + '" r="4"/>';
    });
    let ch = '';
    for (let i = -1; i < 8; i++) ch += '<circle class="f-n-dot" cx="' + (172 + i * 20) + '" cy="123.5" r="2.4"/>';
    const well = (x0, x1) => 'M' + x0 + ' 120V156A14 14 0 0 0 ' + (x0 + 14) + ' 170H' + (x1 - 14) + 'A14 14 0 0 0 ' + x1 + ' 156V120Z';
    return '<svg viewBox="34 0 412 300" class="mosfet-fig1">' +
      '<defs><clipPath id="mosfet-fig-ch"><rect x="170" y="119" width="140" height="9"/></clipPath></defs>' +
      '<path class="f-line" d="M113 108V44M240 78V44M367 108V44M240 258V272"/>' +
      '<circle class="f-paper" cx="113" cy="38" r="6"/><circle class="f-paper" cx="240" cy="38" r="6"/><circle class="f-paper" cx="367" cy="38" r="6"/><circle class="f-paper" cx="240" cy="278" r="6"/>' +
      '<text class="f-title" x="113" y="22" text-anchor="middle">S · source</text>' +
      '<text class="f-title" x="240" y="22" text-anchor="middle">G · gate</text>' +
      '<text class="f-title" x="367" y="22" text-anchor="middle">D · drain</text>' +
      '<text class="f-text" x="252" y="283">B · corpo</text>' +
      '<rect class="f-p" x="40" y="120" width="400" height="130" rx="4"/>' +
      '<rect class="f-soft" x="40" y="250" width="400" height="8" rx="2"/>' +
      '<path class="f-n" d="' + well(56, 170) + '"/><path class="f-n" d="' + well(310, 424) + '"/>' +
      '<rect class="f-n" x="168" y="120" width="144" height="8"/>' +
      '<g clip-path="url(#mosfet-fig-ch)"><g class="mosfet-fig-e">' + ch + '</g></g>' +
      dots +
      '<text class="f-n-text" x="113" y="156" text-anchor="middle">N+</text>' +
      '<text class="f-n-text" x="367" y="156" text-anchor="middle">N+</text>' +
      '<rect class="f-accent-soft" x="152" y="108" width="176" height="12" rx="1.5"/>' +
      '<rect class="f-soft" x="164" y="78" width="152" height="30" rx="3"/>' +
      '<rect class="f-soft" x="80" y="108" width="66" height="12" rx="1.5"/><rect class="f-soft" x="334" y="108" width="66" height="12" rx="1.5"/>' +
      '<text class="f-text" x="156" y="97" text-anchor="end">gate</text>' +
      '<text class="f-accent-text" x="302" y="58" text-anchor="middle">ossido SiO₂</text>' +
      '<text class="f-small" x="302" y="72" text-anchor="middle">pochi nanometri</text>' +
      '<path class="f-thin" d="M322 77L324 110"/>' +
      '<text class="f-n-text" x="240" y="150" text-anchor="middle">canale N</text>' +
      '<text class="f-small" x="240" y="165" text-anchor="middle">strato di inversione</text>' +
      '<path class="f-thin" d="M240 138V129"/>' +
      '<text class="f-p-text" x="52" y="243">substrato P</text>' +
      '</svg>';
  }

  // Figura 2: dal contenitore TO-220 alle celle di un MOSFET di potenza. Due versioni: in riga e,
  // sul telefono, in colonna (contenitore e chip sopra, la cella sotto), per tenere il testo leggibile.
  function scaleFigure() {
    const hexes = (hr0, hc0) => {
      let hex = '';
      const hr = 6.3;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 8; c++) {
          const cx = 186 + c * 13 + (r % 2) * 6.5;
          const cy = 53 + r * 11.4;
          if (cx > 281) continue;
          let d = '';
          for (let k = 0; k < 6; k++) {
            const a = Math.PI / 6 + k * Math.PI / 3;
            d += (k ? 'L' : 'M') + (cx + hr * Math.cos(a)).toFixed(1) + ' ' + (cy + hr * Math.sin(a)).toFixed(1);
          }
          hex += '<path class="' + (r === hr0 && c === hc0 ? 'f-accent-soft' : 'f-thin') + '" d="' + d + 'Z"/>';
        }
      }
      return hex;
    };
    const to220 =
      '<text class="f-text" x="78" y="20" text-anchor="middle">contenitore TO-220</text>' +
      '<rect class="f-soft" x="40" y="32" width="76" height="52" rx="3"/>' +
      '<circle class="f-paper" cx="78" cy="55" r="9"/>' +
      '<rect class="f-paper" x="36" y="80" width="84" height="82" rx="5"/>' +
      '<rect class="f-accent-soft" x="60" y="100" width="36" height="36" rx="2"/>' +
      '<rect class="f-soft" x="47.5" y="162" width="8" height="58"/><rect class="f-soft" x="74" y="162" width="8" height="58"/><rect class="f-soft" x="100.5" y="162" width="8" height="58"/>' +
      '<text class="f-mono" x="51.5" y="237" text-anchor="middle">G</text><text class="f-mono" x="78" y="237" text-anchor="middle">D</text><text class="f-mono" x="104.5" y="237" text-anchor="middle">S</text>' +
      '<path class="f-thin" d="M36 252H120M36 247V257M120 247V257"/>' +
      '<text class="f-small" x="78" y="272" text-anchor="middle">circa 1 cm</text>';
    const chip = (hr0, hc0) =>
      '<text class="f-text" x="232" y="20" text-anchor="middle">il chip di silicio</text>' +
      '<rect class="f-soft" x="176" y="44" width="112" height="112" rx="3"/>' + hexes(hr0, hc0);
    const cell =
      '<text class="f-text" x="392" y="20" text-anchor="middle">una cella, in sezione</text>' +
      '<rect class="f-n" x="320" y="74" width="144" height="118"/>' +
      '<rect class="f-n" x="320" y="192" width="144" height="22"/>' +
      '<rect class="f-soft" x="320" y="214" width="144" height="8" rx="1.5"/>' +
      '<path class="f-p" d="M320 74H372V96A12 12 0 0 1 360 108H320Z"/>' +
      '<path class="f-p" d="M464 74H412V96A12 12 0 0 0 424 108H464Z"/>' +
      '<rect class="f-n" x="342" y="74" width="22" height="10"/><rect class="f-n" x="420" y="74" width="22" height="10"/>' +
      '<rect class="f-accent-soft" x="356" y="55" width="72" height="19" rx="2"/>' +
      '<rect class="f-paper" x="362" y="58" width="60" height="12" rx="1.5"/>' +
      '<path class="f-soft" d="M320 44H464V54H446V74H428V55H356V74H338V54H320Z"/>' +
      '<text class="f-mono" x="392" y="68" text-anchor="middle">G</text>' +
      '<text class="f-mono" x="470" y="53">S</text>' +
      '<text class="f-p-text" x="330" y="102">P</text><text class="f-p-text" x="446" y="102">P</text>' +
      '<text class="f-small" x="330" y="160">N− (drift)</text>' +
      '<text class="f-small" x="330" y="207">N+</text>' +
      '<path class="f-accent mosfet-fig-flow" d="M352 80H368Q386 80 389 100V184M432 80H416Q398 80 395 100V184"/>' +
      '<path class="f-accent-fill" d="M385 182L392 194L399 182Z"/>' +
      '<text class="f-mono" x="392" y="240" text-anchor="middle">D · drain sul retro</text>' +
      '<text class="f-small" x="392" y="256" text-anchor="middle">collegato alla linguetta</text>';
    const wide = '<svg viewBox="0 0 480 290" class="mosfet-fig-wide">' +
      to220 +
      '<path class="f-dash" d="M96 100L176 44M96 136L176 156"/>' +
      chip(4, 5) +
      '<text class="f-small" x="232" y="176" text-anchor="middle">migliaia di celle</text>' +
      '<text class="f-small" x="232" y="190" text-anchor="middle">uguali, in parallelo</text>' +
      '<path class="f-dash" d="M257 94L320 44M257 105L320 222"/>' +
      cell +
      '</svg>';
    const narrow = '<svg viewBox="0 0 320 552" class="mosfet-fig-narrow" role="img" aria-label="Un MOSFET in contenitore TO-220, il chip con le celle esagonali e la sezione di una cella verticale">' +
      '<g transform="translate(-12,0)">' + to220 + '</g>' +
      '<path class="f-dash" d="M84 100L198 44M84 136L198 156"/>' +
      '<g transform="translate(22,0)">' + chip(8, 5) + '<text class="f-small" x="232" y="37" text-anchor="middle">migliaia di celle</text></g>' +
      '<path class="f-dash" d="M273 144L84 292M273 144L236 292"/>' +
      '<g transform="translate(-232,286)">' + cell + '</g>' +
      '</svg>';
    return wide + narrow;
  }

  /* ---------- capitolo ---------- */

  EI.chapter({
    id: 'mosfet',
    icon: 'mosfet',
    minutes: 14,
    summary: 'Il MOSFET è un transistor che si comanda con una tensione, non con una corrente: il [[gate]], isolato dal silicio da un velo di ossido, attira gli elettroni e apre un canale tra source e drain. In continua il gate non assorbe corrente: per questo il piedino di un microcontrollore può accendere motori e lampade da molti ampere. Ed è l\'oggetto più fabbricato della storia: un solo processore moderno ne contiene miliardi.',
    keywords: ['mosfet', 'effetto-di-campo', 'gate', 'ossido-di-gate', 'canale-di-inversione', 'soglia-mosfet', 'rds-on', 'mosfet-logico'],
    model: model,
    css: [
      '.ei-stage-svg.mosfet-svg { max-height: 480px; }',
      '.mosfet-svg .mosfet-frame { fill: #0d1714; stroke: var(--lab-line); stroke-width: 1.2; }',
      '.mosfet-svg .mosfet-xtitle { fill: var(--scope-text); font: 800 10.5px var(--mono); letter-spacing: .16em; }',
      '.mosfet-svg .mosfet-term { fill: var(--scope-bg); stroke: var(--sym); stroke-width: 2; }',
      '.mosfet-svg .mosfet-tname { fill: #fff; font: 800 14px var(--mono); }',
      '.mosfet-svg .mosfet-tword { fill: var(--scope-text); font: 600 12px var(--font); }',
      '.mosfet-svg .mosfet-tval { fill: var(--trace-2); font: 700 12px var(--mono); }',
      '.mosfet-svg .mosfet-gate { stroke: #d3e5de; stroke-width: 1.2; }',
      '.mosfet-svg .mosfet-gate-tint { mix-blend-mode: screen; }',
      '.mosfet-svg .mosfet-oxide { fill: rgba(186, 226, 255, .18); stroke: rgba(186, 226, 255, .6); stroke-width: 1; }',
      '.mosfet-svg .mosfet-metal { stroke: #d3e5de; stroke-width: .8; }',
      '.mosfet-svg .mosfet-well { stroke-width: 1.2; }',
      '.mosfet-svg .mosfet-dep { stroke-dasharray: 3 3; }',
      '.mosfet-svg .mosfet-channel { filter: url(#ei-glow); }',
      '.mosfet-svg .mosfet-plus { fill: var(--trace-2); font: 800 13px var(--mono); }',
      '.mosfet-svg .mosfet-field path { fill: none; stroke: var(--trace-2); stroke-width: 1.3; stroke-dasharray: 3 3; }',
      '.mosfet-svg .mosfet-field path.mosfet-field-head { fill: var(--trace-2); stroke: none; }',
      '.mosfet-svg .mosfet-ion-sign { stroke: var(--lab-ink); stroke-width: 1.4; stroke-linecap: round; }',
      '.mosfet-svg .mosfet-ion.exposed circle { stroke-width: 2; filter: drop-shadow(0 0 3px var(--trace-4)); }',
      '.mosfet-svg .mosfet-xlabel { fill: var(--lab-ink); font: 700 12px var(--font); paint-order: stroke; stroke: #0d1714; stroke-width: 3px; stroke-linejoin: round; transition: opacity var(--t-normal) ease; }',
      '.mosfet-svg .mosfet-xlabel.dim { fill: var(--scope-text); font-weight: 600; }',
      '.mosfet-svg .mosfet-xlabel.n { fill: var(--trace-3); }',
      '.mosfet-svg .mosfet-xlabel.p { fill: var(--trace-4); }',
      '.mosfet-svg .mosfet-xlabel.amber { fill: var(--trace-2); }',
      '.mosfet-svg .mosfet-xlabel.big { font: 800 13px var(--mono); }',
      '.mosfet-svg .mosfet-leader { stroke: var(--scope-text); stroke-width: 1; fill: none; opacity: .7; }',
      '.mosfet-svg .mosfet-pill rect { fill: #0d1714; fill-opacity: .9; stroke-width: 1.2; }',
      '.mosfet-svg .mosfet-pill text { font: 700 12px var(--font); }',
      '.mosfet-svg .mosfet-pill-lead { fill: none; stroke-width: 1.1; stroke-dasharray: 2 2.5; }',
      '.mosfet-svg .mosfet-pill.n rect, .mosfet-svg .mosfet-pill.n .mosfet-pill-lead { stroke: var(--trace-3); }',
      '.mosfet-svg .mosfet-pill.n text, .mosfet-svg .mosfet-pill.n .mosfet-pill-dot { fill: var(--trace-3); }',
      '.mosfet-svg .mosfet-pill.amber rect, .mosfet-svg .mosfet-pill.amber .mosfet-pill-lead { stroke: var(--trace-2); }',
      '.mosfet-svg .mosfet-pill.amber text, .mosfet-svg .mosfet-pill.amber .mosfet-pill-dot { fill: var(--trace-2); }',
      '.mosfet-svg .mosfet-legend text { fill: var(--scope-text); font: 600 11.5px var(--font); }',
      '.mosfet-svg .mosfet-lens rect { fill: none; stroke: var(--trace-3); stroke-width: 1.4; stroke-dasharray: 5 4; opacity: .65; }',
      '.mosfet-svg .mosfet-zoom { fill: none; stroke: var(--trace-3); stroke-width: 1; stroke-dasharray: 3 5; opacity: .4; }',
      '.mosfet-svg .mosfet-tag { fill: var(--trace-3); font: 700 12px var(--mono); }',
      '.mosfet-svg .mosfet-pinl { fill: var(--scope-text); font: 700 11px var(--mono); }',
      '.mosfet-svg .mosfet-val { fill: var(--trace-2); }',
      '.mosfet-svg .mosfet-ll { paint-order: stroke; stroke: var(--scope-bg); stroke-width: 4px; stroke-linejoin: round; }',
      '.mosfet-svg .mosfet-bulb { fill: rgba(255, 214, 120, 0); stroke: currentColor; stroke-width: 2.2; }',
      '.mosfet-svg .mosfet-fil { fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; }',
      '.mosfet-svg .mosfet-rays { fill: none; stroke: #ffd27a; stroke-width: 2; stroke-linecap: round; }',
      '.mosfet-svg .mosfet-motor { fill: var(--scope-bg); stroke: currentColor; stroke-width: 2.2; }',
      '.mosfet-svg .mosfet-motor-m { fill: currentColor; font: 800 15px var(--mono); }',
      '.mosfet-svg .mosfet-fan path { fill: color-mix(in srgb, var(--trace-1) 35%, transparent); stroke: var(--trace-1); stroke-width: 1.2; }',
      '.mosfet-svg .mosfet-fan .hub { fill: var(--trace-1); }',
      '.mosfet-svg .mosfet-pin-state { fill: var(--scope-text); font: 800 9.5px var(--mono); letter-spacing: .08em; }',
      '.mosfet-svg .mosfet-pin-state.on { fill: var(--trace-1); }',
      '.mosfet-svg .mosfet-card rect { fill: #08100e; stroke: var(--lab-line); stroke-width: 1.2; }',
      '.mosfet-svg .mosfet-card-title { fill: var(--trace-2); font: 800 9.5px var(--mono); letter-spacing: .14em; }',
      '.mosfet-svg .mosfet-card-row { fill: var(--scope-text); font: 600 10px var(--mono); }',
      '.mosfet-svg .mosfet-card-row.name { fill: var(--lab-ink); font-weight: 800; }',
      '.mosfet-svg .mosfet-card-row.val { fill: var(--trace-2); font-weight: 700; }',
      '@media (max-width: 640px) {',
      '  .ei-stage-svg.mosfet-svg.tall { max-height: none; }',
      '  .mosfet-svg.tall .mosfet-xlabel { font-size: 13.5px; }',
      '  .mosfet-svg.tall .mosfet-xlabel.big { font-size: 15px; }',
      '  .mosfet-svg.tall .mosfet-pill text { font-size: 13.5px; }',
      '  .mosfet-svg.tall .mosfet-tname { font-size: 16px; }',
      '  .mosfet-svg.tall .mosfet-tword { font-size: 13px; }',
      '  .mosfet-svg.tall .mosfet-tval { font-size: 14px; }',
      '  .mosfet-svg.tall .mosfet-tag { font-size: 13.5px; }',
      '  .mosfet-svg.tall .mosfet-pinl { font-size: 14px; }',
      '  .mosfet-svg.tall .mosfet-legend text { font-size: 13px; }',
      '  .mosfet-svg.tall .mosfet-xtitle { font-size: 12.5px; }',
      '  .mosfet-svg.tall .mosfet-pin-state { font-size: 12px; }',
      '}',
      '.ei-figure svg.mosfet-fig-narrow { display: none; }',
      '@media (max-width: 640px) {',
      '  .ei-figure svg.mosfet-fig-wide { display: none; }',
      '  .ei-figure svg.mosfet-fig-narrow { display: block; }',
      '  .ei-figure .mosfet-fig1 .f-title { font-size: 16px; }',
      '  .ei-figure .mosfet-fig1 .f-text, .ei-figure .mosfet-fig1 .f-n-text, .ei-figure .mosfet-fig1 .f-p-text, .ei-figure .mosfet-fig1 .f-accent-text { font-size: 15px; }',
      '  .ei-figure .mosfet-fig1 .f-small { font-size: 13px; }',
      '}',
      '.mosfet-fig-e { animation: mosfet-drift 1.6s linear infinite; }',
      '@keyframes mosfet-drift { from { transform: translateX(0); } to { transform: translateX(20px); } }',
      '.mosfet-fig-flow { stroke-dasharray: 6 6; animation: mosfet-dash 1s linear infinite; }',
      '@keyframes mosfet-dash { to { stroke-dashoffset: -24; } }',
      '@media (prefers-reduced-motion: reduce) { .mosfet-fig-e, .mosfet-fig-flow { animation: none; } }',
    ].join('\n'),
    lab: {
      title: 'Il canale che si apre',
      intro: 'Alza la tensione del gate e guarda dentro il transistor: prima le lacune vengono respinte, poi, oltre la soglia, gli elettroni formano il canale e la lampada si accende. Prova a comandarlo da un microcontrollore a 3,3 o 5 V e a scambiare il MOSFET logico con quello standard: il grafico mostra dove si trova il punto di lavoro, l\'oscilloscopio la breve corrente che serve per caricare il gate.',
      mount: mount,
    },
    how: [
      'Un MOSFET a canale N è un blocchetto di silicio di tipo P, il substrato, con due isole N+ molto drogate: il source e il drain. Tra le due, sulla superficie, c\'è uno strato sottilissimo di biossido di silicio, l\'[[ossido-di-gate]], e sopra un elettrodo conduttore, il [[gate]]. Metallo, ossido e semiconduttore danno il nome: Metal-Oxide-Semiconductor Field-Effect Transistor.',
      'Con il gate a 0 V, tra source e drain ci sono due giunzioni P‑N una contro l\'altra: in qualunque verso provi a far passare corrente, una delle due è in [[polarizzazione-inversa|inversa]]. Il MOSFET è un interruttore aperto.',
      'Se il gate diventa positivo rispetto al source, il campo elettrico attraversa l\'ossido e spinge in profondità le [[lacuna|lacune]]: sotto il gate si forma una [[zona-di-svuotamento|zona svuotata]] con gli ioni negativi fissi. È l\'[[effetto-di-campo]]: si comanda il silicio senza toccarlo.',
      'Oltre la [[soglia-mosfet|tensione di soglia]] Vth il campo attira sotto l\'ossido così tanti elettroni che lì il silicio P si comporta come un N: è il [[canale-di-inversione|canale]], uno strato di inversione che collega source e drain. Più Vgs supera Vth, più il canale è spesso e conduce.',
      'Con Vgs poco sopra la soglia e molta tensione sul drain, il canale si strozza vicino al drain: la corrente non cresce più con Vds e vale Id = k/2·(Vgs − Vth)². È la [[saturazione-mosfet|saturazione]], che nel MOSFET vuol dire «a metà strada», non «tutto acceso» come nel BJT. Con Vgs alta e poca tensione sul drain il MOSFET lavora invece nella zona ohmica (detta anche di triodo) e diventa una piccola resistenza, la [[rds-on|Rds(on)]]: il calore vale P = I²·Rds(on).',
      'Il gate è isolato: in continua non assorbe corrente, perché è l\'armatura di un condensatore, la [[capacita-di-gate|capacità di gate]], che in un MOSFET di potenza vale qualche nanofarad. Serve solo una breve punta di corrente quando la tensione cambia, come in un [[costante-di-tempo|circuito RC]]. Durante la commutazione la capacità tra gate e drain la fa sembrare ancora più grande (effetto Miller).',
      'Come interruttore il MOSFET va tenuto tutto acceso o tutto spento, perché a metà strada dissipa moltissimo. Un MOSFET standard è garantito acceso solo con 10 V sul gate; un [[mosfet-logico]] già con 4,5 V, e si comanda direttamente da un piedino a 5 V; per un piedino a 3,3 V conviene un modello con la Rds(on) garantita anche a 2,5 V. Esiste anche il MOSFET a canale P, con le zone scambiate: si accende con il gate più basso del source e fa da interruttore verso il positivo.',
    ],
    formulas: [
      {
        name: 'Saturazione',
        expr: '<var>I</var><sub>D</sub> = <span class="frac"><span><var>k</var></span><span>2</span></span> · (<var>V</var><sub>GS</sub> − <var>V</var><sub>th</sub>)<sup>2</sup>',
        legend: [['I<sub>D</sub>', 'corrente di drain, in ampere'], ['k', 'parametro del canale, in A/V²: cresce se il canale è più largo e più corto e se l\'ossido è più sottile'], ['V<sub>th</sub>', 'tensione di soglia']],
        note: 'Vale quando V<sub>DS</sub> ≥ V<sub>GS</sub> − V<sub>th</sub>. Esempio: k = 25 A/V², V<sub>th</sub> = 1,5 V e V<sub>GS</sub> = 1,7 V danno I<sub>D</sub> = 12,5 · 0,04 = 0,5 A.',
      },
      {
        name: 'Acceso: resistenza e calore',
        expr: '<var>P</var> = <var>I</var><sub>D</sub><sup>2</sup> · <var>R</var><sub>DS(on)</sub>',
        legend: [['R<sub>DS(on)</sub>', 'resistenza tra drain e source con il MOSFET acceso del tutto'], ['P', 'potenza che scalda il MOSFET, in watt']],
        note: 'Esempio: 2 A in 25 mΩ fanno 4 · 0,025 = 0,1 W. Nella zona ohmica il canale vale circa 1 / (k · (V<sub>GS</sub> − V<sub>th</sub>)), a cui si somma la resistenza fissa del silicio e dei piedini.',
      },
      {
        name: 'La corrente del gate',
        expr: '<var>I</var><sub>G</sub> = <var>C</var> · <span class="frac"><span>Δ<var>V</var><sub>GS</sub></span><span>Δ<var>t</var></span></span>',
        legend: [['C', 'capacità del gate, qualche nanofarad'], ['ΔV/Δt', 'quanto in fretta cambia la tensione del gate']],
        note: 'Se la tensione è ferma, I<sub>G</sub> = 0. Con R<sub>g</sub> = 220 Ω e C = 1,7 nF il gate si carica con τ = R·C ≈ 0,37 µs, come un condensatore in un <a href="#rc-filtri">circuito RC</a>; la punta iniziale vale 5 V / 220 Ω ≈ 23 mA.',
      },
    ],
    figures: [
      {
        title: 'Com\'è fatto un MOSFET a canale N',
        svg: sectionFigure(),
        caption: 'Gate, ossido e substrato formano un condensatore. Quando la tensione del gate supera la soglia, sotto l\'ossido si forma il canale N che unisce le due isole N+ di source e drain. Nei transistor dei chip l\'ossido è spesso pochi nanometri, in quelli di potenza qualche decina; il corpo di solito è collegato al source.',
        alt: 'Sezione di un MOSFET: substrato P, isole N+ di source e drain, ossido sottile, gate e canale di elettroni sotto l\'ossido',
      },
      {
        title: 'Dal contenitore alla cella',
        svg: scaleFigure(),
        caption: 'Un MOSFET di potenza come quelli del laboratorio sta in un contenitore TO-220 largo circa un centimetro. Il chip dentro è fatto di migliaia di celle uguali in parallelo, ognuna un piccolo MOSFET; la corrente scende in verticale e il drain è il retro del chip, saldato alla linguetta. Nei processori succede il contrario: miliardi di MOSFET minuscoli, con il gate lungo poche decine di nanometri, come racconta <a href="../porte-logiche/index.html#struttura">Porte logiche · la struttura del chip</a>.',
        alt: 'Un MOSFET in contenitore TO-220, il chip con le celle esagonali e la sezione di una cella verticale',
      },
    ],
    history: {
      text: [
        'L\'idea del transistor a effetto di campo è più vecchia del transistor stesso. Nel 1925 Julius Edgar Lilienfeld, un fisico nato a Leopoli e professore all\'Università di Lipsia, depositò in Canada, e l\'anno dopo negli Stati Uniti, il brevetto di un dispositivo in cui la tensione di un elettrodo comandava la corrente in uno strato di semiconduttore. Nel 1934 il tedesco Oskar Heil propose un elettrodo isolato che agisce sul semiconduttore come l\'armatura di un condensatore. Erano idee giuste, ma non risulta che nessuno dei due abbia costruito un dispositivo funzionante.',
        'Il problema era la superficie del cristallo. Nel 1945, ai Bell Labs, William Shockley provò a comandare un sottile strato di semiconduttore con un campo elettrico, ma l\'effetto era molto più debole del previsto. John Bardeen capì perché: gli elettroni attirati restavano intrappolati negli «stati di superficie» e schermavano il campo. Da quegli studi nacque, nel 1947, il transistor a punte di contatto, l\'antenato del transistor <a href="#bjt">bipolare</a>.',
        'La soluzione arrivò dal silicio stesso. Nel 1955 Carl Frosch e Lincoln Derick scoprirono per caso che il silicio, in un forno con un po\' di vapore acqueo, si ricopre di uno strato di biossido che lo protegge; Mohamed Atalla mostrò poi che un ossido cresciuto con cura toglie alla superficie gran parte delle sue trappole. Nel 1959 Atalla e Dawon Kahng costruirono così il primo MOSFET funzionante, presentato nel 1960. Era lento e non serviva alla rete telefonica, così i Bell Labs non lo svilupparono oltre; ma era semplice da fabbricare e si poteva fare minuscolo: tra gli anni Sessanta e Settanta diventò il mattone dei circuiti integrati e, in coppia N e P, delle porte <a href="../porte-logiche/index.html#famiglie">CMOS</a>, nate nel 1963.',
        'Negli anni Settanta il MOSFET diventò anche di potenza: dopo i VMOS della Siliconix, alla fine del 1978 l\'International Rectifier presentò l\'HEXFET, con migliaia di celle esagonali in parallelo sullo stesso chip. Da allora i MOSFET comandano motori, lampade e alimentatori; e intanto, rimpiccioliti fino a poche decine di nanometri, riempiono i chip. Secondo una stima riportata nel 2018 dal Computer History Museum, fino ad allora erano stati fabbricati circa 13 triliardi di transistor, quasi tutti MOS: più esemplari di qualunque altro oggetto costruito dall\'uomo.',
      ],
      events: [
        { year: 1925, title: 'Il primo brevetto a effetto di campo', who: 'Julius Edgar Lilienfeld', text: 'Deposita in Canada, e nel 1926 negli Stati Uniti, il brevetto di un dispositivo in cui la tensione di un elettrodo regola la corrente in uno strato di semiconduttore. Il brevetto americano è concesso nel 1930.' },
        { year: 1934, title: 'Un elettrodo che agisce come un condensatore', who: 'Oskar Heil', text: 'Il fisico tedesco brevetta il controllo della corrente in un semiconduttore attraverso un elettrodo accoppiato in modo capacitivo: è l\'idea del gate isolato.' },
        { year: 1955, title: 'L\'ossido nato da un incidente', who: 'Carl Frosch e Lincoln Derick (Bell Labs)', text: 'L\'idrogeno nel forno di diffusione prende fuoco per un attimo: il vapore acqueo che si forma ricopre il silicio di uno strato di biossido, che protegge la superficie e fa da maschera. Il lavoro è pubblicato nel 1957.' },
        { year: 1959, title: 'Il MOSFET funziona', who: 'Mohamed M. Atalla e Dawon Kahng (Bell Labs)', text: 'Gate di metallo, ossido cresciuto sul silicio, silicio: il primo transistor a effetto di campo con il gate isolato che funziona davvero. Lo presentano nel 1960.' },
        { year: 1978, title: 'L\'HEXFET', who: 'International Rectifier (Alex Lidow e Tom Herman)', text: 'Un MOSFET di potenza fatto di migliaia di celle esagonali in parallelo, annunciato a fine anno e in vendita dal 1979: comincia a sostituire i transistor bipolari negli alimentatori e nei comandi dei motori.' },
        { year: 2018, title: 'Circa 13 triliardi di transistor', who: 'Computer History Museum, stima dell\'analista Jim Handy', text: 'Il transistor MOS risulta l\'oggetto costruito in più esemplari nella storia dell\'umanità: circa 1,3 · 10²² transistor tra il 1947 e il 2018, quasi tutti MOS e quasi tutti dentro i chip.' },
      ],
    },
    fun: 'L\'ossido del gate è così sottile da temere anche l\'elettricità statica: una scarica che non senti nemmeno può forarlo e rovinare il transistor per sempre. Una scintilla si avverte solo sopra qualche migliaio di volt, mentre per danneggiare un componente delicato possono bastarne poche centinaia. Per questo i MOSFET viaggiano in buste antistatiche e si maneggiano con un braccialetto collegato a terra. Per lo stesso motivo i chip hanno protezioni sui piedini e alcuni MOSFET di potenza un piccolo diodo Zener sul gate.',
    uses: 'Interruttori per motori, strisce LED, resistenze riscaldanti ed elettrovalvole comandati da Arduino, ESP32 o Raspberry Pi; gli alimentatori switching e i caricabatterie, che accendono e spengono un MOSFET centinaia di migliaia di volte al secondo; gli inverter delle auto elettriche e dei pannelli solari; la protezione contro la batteria montata al contrario. E, a miliardi, i chip digitali: processori, memorie, telecamere dei telefoni.',
    links: [
      { href: '#bjt', section: 'Questa sezione', title: 'Il transistor bipolare: comandato in corrente' },
      { href: '#rc-filtri', section: 'Questa sezione', title: 'Circuiti RC: la carica del gate è una curva esponenziale' },
      { href: '../porte-logiche/index.html#famiglie', section: 'Porte logiche', title: 'Le famiglie logiche: MOSFET N e P in coppia nel CMOS' },
      { href: '../porte-logiche/index.html#struttura', section: 'Porte logiche', title: 'Dentro il chip: miliardi di MOSFET di pochi nanometri' },
      { href: '../elettronica-base/index.html#potenza', section: 'Elettronica base', title: 'La potenza elettrica: P = V · I e il calore' },
      { href: '../elettronica-avanzata/index.html', section: 'Elettronica avanzata', title: 'Elettronica di potenza: MOSFET che commutano centinaia di migliaia di volte al secondo' },
    ],
    glossary: {
      'mosfet': { term: 'MOSFET', def: 'Metal-Oxide-Semiconductor Field-Effect Transistor: transistor a effetto di campo con il gate isolato da uno strato di ossido. Si comanda con la tensione tra gate e source, quasi senza corrente.' },
      'effetto-di-campo': { term: 'Effetto di campo', def: 'Il controllo della conduzione di un semiconduttore con un campo elettrico prodotto da un elettrodo vicino, senza contatto diretto. È il principio di tutti i transistor FET.' },
      'gate': { term: 'Gate', def: 'L\'elettrodo di comando di un MOSFET, separato dal silicio da un sottile strato isolante. La tensione tra gate e source decide se tra source e drain si apre il canale.' },
      'ossido-di-gate': { term: 'Ossido di gate', def: 'Lo strato isolante di biossido di silicio (SiO₂) sotto il gate: pochi nanometri nei chip, qualche decina nei MOSFET di potenza. Non lascia passare la corrente, ma lascia passare il campo elettrico.' },
      'canale-di-inversione': { term: 'Canale di inversione', def: 'Lo strato sottile di elettroni che si forma sotto l\'ossido quando Vgs supera la soglia: lì il silicio P si comporta come un N e collega source e drain.' },
      'soglia-mosfet': { term: 'Tensione di soglia (Vth)', def: 'La tensione tra gate e source oltre la quale nel MOSFET si forma il canale e comincia a passare corrente. Nei MOSFET di potenza va più o meno da 1 a 4 volt.' },
      'rds-on': { term: 'Rds(on)', def: 'La resistenza tra drain e source di un MOSFET acceso del tutto: nei MOSFET di potenza va da meno di un milliohm a qualche ohm, secondo la taglia e la tensione massima. Il calore prodotto vale P = I²·Rds(on).' },
      'saturazione-mosfet': { term: 'Saturazione (MOSFET)', def: 'La zona in cui il canale è strozzato vicino al drain e la corrente non cresce più con Vds: Id = k/2·(Vgs − Vth)². Attenzione: è il contrario della saturazione del BJT, dove il transistor è tutto acceso.' },
      'capacita-di-gate': { term: 'Capacità di gate', def: 'La capacità che il gate forma con il canale e con gli altri terminali: qualche nanofarad nei MOSFET di potenza. Va caricata e scaricata a ogni commutazione, con brevi punte di corrente.' },
      'mosfet-logico': { term: 'MOSFET logico', def: 'MOSFET a livello logico: ha la soglia bassa ed è garantito acceso del tutto già con 4,5 V sul gate (alcuni anche con 2,5 V), quindi si comanda direttamente dai piedini di un microcontrollore.' },
    },
  });
})();
