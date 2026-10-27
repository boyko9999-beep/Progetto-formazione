/*
 * Capitolo 8: oscillatori e timer 555.
 * Laboratorio "Il ritmo del 555": il 555 in modo astabile con R1, R2, C e un LED sull'uscita.
 * Il condensatore oscilla tra 1/3 e 2/3 di Vcc; "Dentro il 555" mostra partitore, comparatori,
 * flip-flop e transistor di scarica con il loro stato. L'oscilloscopio usa la scala dei tempi vera;
 * lo schema è in tempo reale fino a 2 Hz e rallentato (con l'indicazione sul disegno) oltre.
 * Il LED segue sempre il tempo reale. "Ascolta" suona l'uscita con la Web Audio API, solo dopo un clic.
 */
(function () {
  'use strict';

  const { s, sym, wire, dot, si, num, clamp } = EI;

  /* ---------- modello fisico (puro, testato in tests/oscillatori.test.js) ---------- */

  const LN2 = Math.LN2;
  const LN3 = Math.log(3);
  const OUT_DROP = 1.5; // l'uscita alta del 555 bipolare resta circa 1,5 V sotto Vcc
  const LED_V = 1.9;    // tensione di un LED rosso acceso
  const LED_R = 560;    // resistenza in serie al LED, in ohm

  const model = {
    LN2: LN2,
    LN3: LN3,
    // soglie fissate dal partitore di tre resistenze uguali
    thresholds: (vcc) => ({ low: vcc / 3, high: 2 * vcc / 3 }),
    // tempo per andare da v0 a v1 avvicinandosi esponenzialmente a vf, con costante di tempo tau
    timeTo: (v0, v1, vf, tau) => tau * Math.log((vf - v0) / (vf - v1)),
    tHigh: (R1, R2, C) => LN2 * (R1 + R2) * C,
    tLow: (R2, C) => LN2 * R2 * C,
    period: (R1, R2, C) => LN2 * (R1 + 2 * R2) * C,
    freq: (R1, R2, C) => 1 / (LN2 * (R1 + 2 * R2) * C),
    duty: (R1, R2) => (R1 + R2) / (R1 + 2 * R2),
    // primo tempo alto dopo l'accensione: C parte da 0 V invece che da 1/3 di Vcc
    firstHigh: (R1, R2, C) => LN3 * (R1 + R2) * C,
    // monostabile: da 0 V a 2/3 di Vcc attraverso R, cioè ln 3 · R · C ≈ 1,1 · R · C
    monostable: (R, C) => LN3 * R * C,
    vout: (q, vcc) => (q ? Math.max(0, vcc - OUT_DROP) : 0),
    ledCurrent: (q, vcc) => (q ? Math.max(0, (vcc - OUT_DROP - LED_V) / LED_R) : 0),
    // tensione del piedino 7, il nodo tra R1 e R2 (il transistor acceso lo porta a massa)
    vDis: (q, vc, p) => (q ? vc + (p.Vcc - vc) * p.R2 / (p.R1 + p.R2) : 0),
    // correnti: in R1 (verso il basso), in R2 (positiva verso il condensatore), nel piedino 7
    currents: (q, vc, p) => {
      if (q) {
        const i = (p.Vcc - vc) / (p.R1 + p.R2);
        return { r1: i, r2: i, dis: 0 };
      }
      const r1 = p.Vcc / p.R1;
      const r2 = -vc / p.R2;
      return { r1: r1, r2: r2, dis: r1 - r2 };
    },
    // forma d'onda a regime; t = 0 sul fronte di salita dell'uscita, con Vc = 1/3 di Vcc
    waveform: (t, p) => {
      const th = LN2 * (p.R1 + p.R2) * p.C;
      const T = th + LN2 * p.R2 * p.C;
      const x = ((t % T) + T) % T;
      if (x < th) return { vc: p.Vcc - (2 * p.Vcc / 3) * Math.exp(-x / ((p.R1 + p.R2) * p.C)), q: 1 };
      return { vc: (2 * p.Vcc / 3) * Math.exp(-(x - th) / (p.R2 * p.C)), q: 0 };
    },
    /*
     * Macchina a stati del 555 astabile: avanza in modo esatto di dt secondi.
     * state = { vc, q }: q è l'uscita del flip-flop (1 carica e uscita alta, 0 scarica e uscita bassa).
     * Restituisce il nuovo stato e i fronti dell'uscita: events = [{ t, q }], con t dall'inizio del passo.
     */
    step: (state, dt, p) => {
      const lo = p.Vcc / 3;
      const hi = 2 * p.Vcc / 3;
      let vc = state.vc;
      let q = state.q ? 1 : 0;
      let t = 0;
      const events = [];
      // fuori dalla finestra tra le soglie un comparatore comanda subito il flip-flop
      if (q && vc >= hi) { q = 0; events.push({ t: 0, q: 0 }); }
      else if (!q && vc <= lo) { q = 1; events.push({ t: 0, q: 1 }); }
      for (let guard = 0; guard < 200000; guard++) {
        const vf = q ? p.Vcc : 0;
        const tau = q ? (p.R1 + p.R2) * p.C : p.R2 * p.C;
        const edge = q ? hi : lo;
        const te = model.timeTo(vc, edge, vf, tau);
        if (t + te > dt) {
          vc = vf + (vc - vf) * Math.exp(-(dt - t) / tau);
          break;
        }
        t += te;
        vc = edge;
        q = q ? 0 : 1;
        events.push({ t: t, q: q });
      }
      return { vc: vc, q: q, events: events };
    },
  };

  /* ---------- costanti del laboratorio ---------- */

  const DEF = { R1: 22000, R2: 47000, C: 22e-6, Vcc: 9 };
  const VMAX = 15;              // scala dei colori dei fili
  const IMAX = 0.02;            // corrente di riferimento per la velocità delle cariche
  const LED_COLOR = '#ff3b30';
  const GHOST = '#5f746d';
  const AUDIO = { min: 30, max: 4000, vol: 0.05 };
  const NARROW_ON = 640;        // px dello schema sotto cui si passa alla composizione stretta
  const NARROW_OFF = 670;       // e sopra cui si torna a quella larga
  const ICW = 250;
  const ICH = 290;
  // posizione dei piedini sul disegno del chip (coordinate interne al rettangolo)
  const PIN = { dis: 40, thr: 149, trig: 213, rst: 150, vcc: 206, ctrl: 62, out: 246, outX: 222, gnd: 24 };
  const PIN_NUM = { gnd: 1, trig: 2, out: 3, rst: 4, ctrl: 5, thr: 6, dis: 7, vcc: 8 };

  const WIDE = {
    W: 700, H: 432, narrow: false,
    ic: [250, 92], yV: 56, yG: 408, col: 150,
    r1: 66, r2: 148, cTop: 322, sideR: -1, sideC: 1,
    batt: [50, 190, 60], gndSym: 96,
    gauge: [104, 292, 12, 98],
    led: { x: 612, rx: 522, rlen: 54 },
    ctrlCap: 538,
    card: [542, 10, 148, 140],
  };
  const NARROW = {
    W: 412, H: 612, narrow: true,
    ic: [140, 120], yV: 58, yG: 584, col: 100,
    r1: 78, r2: 172, cTop: 352, sideR: -1, sideC: -1,
    term: 18, gndSym: 18,
    gauge: [40, 432, 14, 124],
    led: { x: 362, ry: 432, rlen: 50, ly: 494 },
    status: 26,
  };

  // Valori "tondi" della serie 1-2-5 (o 1-2-2,5-5) non più piccoli di x.
  function niceUp(x, steps) {
    const st = steps || [1, 2, 5];
    const e = Math.floor(Math.log10(x));
    for (let k = e; k <= e + 1; k++) {
      for (const m of st) {
        const v = m * Math.pow(10, k);
        if (v >= x * (1 - 1e-9)) return v;
      }
    }
    return Math.pow(10, e + 2);
  }
  // Rallentamento dell'animazione: tempo reale fino a 2 Hz, poi un ciclo visibile ogni 0,8-2 s circa.
  const slowFactor = (f) => (f <= 2 ? 1 : niceUp(f / 1.25));
  // Finestra dell'oscilloscopio: 10 divisioni "tonde" che contengono almeno 3 periodi.
  const windowFor = (T) => 10 * niceUp(3 * T / 10, [1, 2, 2.5, 5]);
  model.slowFactor = slowFactor;
  model.windowFor = windowFor;

  const fmtR = (v) => si(v, 'Ω', { trim: true });
  const fmtC = (v) => si(v, 'F', { trim: true });
  const fmtV = (v) => num(v, Math.abs(v - Math.round(v)) > 0.005 ? 1 : 0) + ' V';
  const fmtT = (t) => si(t, 's');
  const fmtF = (f) => (f < 1 ? num(f, 3) + ' Hz' : si(f, 'Hz'));
  const fmtPct = (x) => num(x * 100, 1) + ' %';
  const fmtN = (n) => n.toLocaleString('it-IT');

  /* ---------- il disegno interno del 555 ---------- */

  function arrowHead(a, b, frac, size) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    const ux = dx / L;
    const uy = dy / L;
    const tip = [a[0] + dx * frac, a[1] + dy * frac];
    const base = [tip[0] - ux * size, tip[1] - uy * size];
    const nx = -uy * size * 0.5;
    const ny = ux * size * 0.5;
    return 'M' + tip[0].toFixed(1) + ' ' + tip[1].toFixed(1) + 'L' + (base[0] + nx).toFixed(1) + ' ' + (base[1] + ny).toFixed(1) + 'L' + (base[0] - nx).toFixed(1) + ' ' + (base[1] - ny).toFixed(1) + 'Z';
  }

  // Blocchi interni nel rettangolo del chip (origine x0, y0). Restituisce gli elementi da aggiornare.
  function drawInside(g, x0, y0, narrow) {
    const X = (ix) => x0 + ix;
    const Y = (iy) => y0 + iy;
    const w = (pts) => wire(g, pts.map((q) => [X(q[0]), Y(q[1])]), { cls: 'thin oscillatori-iw' });
    const T = (ix, iy, txt, cls, anchor) => s('text', { x: X(ix), y: Y(iy), class: cls || 'oscillatori-it', 'text-anchor': anchor || 'start', 'dominant-baseline': 'middle', text: txt }, g);
    const r = {};

    // partitore di tre resistenze da 5 kΩ tra Vcc e massa
    r.vcc = w([[206, 0], [206, 21]]);
    r.rst = w([[150, 0], [150, 118]]);
    r.d2 = w([[206, 47], [206, 77]]);
    r.ctrl = w([[198, 62], [250, 62]]);
    r.d1 = w([[206, 103], [206, 133]]);
    r.d1s = w([[198, 118], [206, 118]]);
    r.d0 = w([[206, 159], [206, 172]]);
    [21, 77, 133].forEach((iy) => s('rect', { x: X(201), y: Y(iy), width: 10, height: 26, rx: 1.5, class: 'oscillatori-res' }, g));
    [34, 90, 146].forEach((iy) => T(216, iy, '5 kΩ'));
    dot(g, X(206), Y(62));
    dot(g, X(206), Y(118));
    sym.ground(g, { x: X(206), y: Y(172) });
    r.tap2 = T(195, 62, '⅔', 'oscillatori-frac', 'end');
    r.tap1 = T(195, 118, '⅓', 'oscillatori-frac', 'end');
    T(206, 205, '3 × 5 kΩ', 'oscillatori-it', 'middle');
    T(213, 11, '+Vcc');
    T(156, 30, 'RESET');

    // comparatori: soglia (− = 2/3 Vcc, + = piedino 6) e trigger (+ = 1/3 Vcc, − = piedino 2)
    const comp = (cy, top, bot) => {
      const tri = s('path', { d: 'M' + X(24) + ' ' + Y(cy - 20) + 'L' + X(64) + ' ' + Y(cy) + 'L' + X(24) + ' ' + Y(cy + 20) + 'Z', class: 'oscillatori-block' }, g);
      T(29, cy - 11, top, 'oscillatori-sign');
      T(29, cy + 11, bot, 'oscillatori-sign');
      return tri;
    };
    r.cmpT = comp(138, '−', '+');
    r.cmpG = comp(202, '+', '−');
    r.thr = w([[0, 149], [24, 149]]);
    r.trig = w([[0, 213], [24, 213]]);
    r.ref2 = w([[15, 127], [24, 127]]);
    r.ref1 = w([[15, 191], [24, 191]]);
    r.ref2t = T(9, 127, '⅔', 'oscillatori-frac', 'middle');
    r.ref1t = T(9, 191, '⅓', 'oscillatori-frac', 'middle');
    T(40, 108, 'SOGLIA', 'oscillatori-it', 'middle');
    T(44, 234, 'TRIGGER', 'oscillatori-it', 'middle');
    r.c1 = w([[64, 138], [96, 138]]);
    r.c2 = w([[64, 202], [96, 202]]);
    r.b1 = T(80, 130, '0', 'oscillatori-bit', 'middle');
    r.b2 = T(80, 194, '0', 'oscillatori-bit', 'middle');

    // flip-flop
    r.ff = s('rect', { x: X(96), y: Y(118), width: 64, height: 108, rx: 5, class: 'oscillatori-block' }, g);
    T(101, 138, 'R', 'oscillatori-sign');
    T(101, 202, 'S', 'oscillatori-sign');
    T(155, 202, 'Q', 'oscillatori-sign', 'end');
    T(112, 133, 'Q', 'oscillatori-sign', 'middle');
    s('path', { d: 'M' + X(108.5) + ' ' + Y(126) + 'H' + X(115.5), class: 'oscillatori-bar' }, g);
    T(128, 160, 'FF', 'oscillatori-ff', 'middle');
    r.qText = T(128, 179, 'Q = 1', 'oscillatori-bit', 'middle');

    // uscita: lo stadio finale copia Q sul piedino 3
    r.q = w([[160, 202], [168, 202], [168, 246], [178, 246]]);
    r.buf = s('path', { d: 'M' + X(178) + ' ' + Y(234) + 'L' + X(202) + ' ' + Y(246) + 'L' + X(178) + ' ' + Y(258) + 'Z', class: 'oscillatori-block' }, g);
    r.out = narrow ? w([[202, 246], [222, 246], [222, 290]]) : w([[202, 246], [250, 246]]);
    T(194, 226, 'USCITA', 'oscillatori-it', 'middle');

    // transistor di scarica (NPN, base a destra): Q negato lo accende quando l'uscita è bassa
    r.qb = w([[112, 118], [112, 59], [100, 59]]);
    r.dis = w([[0, 40], [68, 40]]);
    const tg = s('g', { class: 'ei-sym oscillatori-tr' }, g);
    s('circle', { cx: X(80), cy: Y(59), r: 20, class: 'case' }, tg);
    s('path', { d: 'M' + X(100) + ' ' + Y(59) + 'H' + X(84), class: 'lead' }, tg);
    s('path', { d: 'M' + X(84) + ' ' + Y(46) + 'V' + Y(72), class: 'lead oscillatori-basebar' }, tg);
    s('path', { d: 'M' + X(84) + ' ' + Y(53) + 'L' + X(68) + ' ' + Y(40) + 'M' + X(84) + ' ' + Y(65) + 'L' + X(68) + ' ' + Y(78) + 'V' + Y(84), class: 'lead' }, tg);
    s('path', { d: arrowHead([X(84), Y(65)], [X(68), Y(78)], 0.9, 7), class: 'body' }, tg);
    sym.ground(g, { x: X(68), y: Y(84) });
    r.tr = tg;
    T(6, 62, 'SCARICA');
    r.trText = T(6, 77, 'spento', 'oscillatori-bit');

    // cariche: la corrente costante del partitore e quella di scarica nel transistor
    r.fDiv = new EI.Flow(g, s('path', { d: 'M' + X(206) + ' ' + Y(0) + 'V' + Y(172), class: 'oscillatori-fpath' }, g), { spacing: 15, r: 2.2 });
    r.fTr = new EI.Flow(g, s('path', { d: 'M' + X(0) + ' ' + Y(40) + 'H' + X(68) + 'L' + X(84) + ' ' + Y(53) + 'V' + Y(65) + 'L' + X(68) + ' ' + Y(78) + 'V' + Y(86), class: 'oscillatori-fpath' }, g), { spacing: 14, r: 2.4 });
    return r;
  }

  /* ---------- laboratorio ---------- */

  function mount(lab) {
    const svg = lab.svg;
    const P = EI.palette();
    const reduced = lab.reduced;
    const stageEl = svg.parentNode;
    lab.root.classList.add('oscillatori-lab');

    let narrow = false;
    const wantNarrow = () => {
      let w = stageEl && stageEl.clientWidth;
      if (!w) w = (window.innerWidth || 1200) - 40;
      return narrow ? w < NARROW_OFF : w < NARROW_ON;
    };
    narrow = wantNarrow();

    const st = {
      R1: DEF.R1, R2: DEF.R2, C: DEF.C, Vcc: DEF.Vcc,
      inside: false, audio: false, view: 'carica',
      vc: 0, q: 1, first: true, simT: 0, realT: 0,
      f: 1, T: 1, tH: 0, tL: 0, duty: 0.5, N: 1, W: 0,
      sweep: null, prev: null, armed: false,
      ghost: null, lastTouch: -1e9, lastCtl: null,
      vccMin: DEF.Vcc, vccMax: DEF.Vcc,
      led: 0, pulseR: 0, pulseS: 0, flash: 0,
    };
    const params = () => ({ R1: st.R1, R2: st.R2, C: st.C, Vcc: st.Vcc });
    const same = (a, b) => a && b && a.R1 === b.R1 && a.R2 === b.R2 && a.C === b.C && a.Vcc === b.Vcc;

    /* --- oscilloscopio --- */
    const scope = lab.plot({
      title: 'Oscilloscopio · Vc e uscita', height: 210,
      // su uno schermo stretto si scrive una divisione sì e una no
      x: { min: 0, max: 10, div: 10, fmt: (v) => (v === 0 ? '0' : (scope.w < 520 && Math.round(v / (st.W / 10)) % 2 ? '' : si(v, 's', { sig: 2, trim: true }))) },
      // 0-15 V in cinque divisioni: con 9 V le soglie (3 V e 6 V) cadono proprio sulla griglia
      y: { min: 0, max: 15, div: 5, fmt: (v) => num(v, 0) + ' V' },
      legend: [
        { label: 'Vc, il condensatore', color: 'var(--trace-2)' },
        { label: 'Vout, il piedino 3', color: 'var(--trace-1)' },
        { label: '⅓ e ⅔ di Vcc', color: 'var(--trace-3)' },
        { label: 'prima della modifica', color: GHOST },
      ],
      aria: 'Oscilloscopio con la tensione del condensatore, l\'uscita del 555 e le due soglie',
    });
    const scopeTitle = scope.figure.querySelector('.ei-plot-title');

    /* --- strumenti --- */
    const rF = lab.readout({ label: 'Frequenza f', color: 'var(--trace-1)', fmt: fmtF });
    const rT = lab.readout({ label: 'Periodo T', color: 'var(--trace-1)', fmt: fmtT });
    const rH = lab.readout({ label: 'Tempo alto', color: 'var(--trace-2)', fmt: fmtT });
    const rL = lab.readout({ label: 'Tempo basso', color: 'var(--trace-3)', fmt: fmtT });
    const rD = lab.readout({ label: 'Duty cycle', color: 'var(--trace-1)', fmt: fmtPct, max: 1 });
    const rV = lab.readout({ label: 'Tensione Vc', color: 'var(--trace-2)', fmt: (v) => num(v, 2) + ' V', max: VMAX });

    /* --- comandi --- */
    const g1 = lab.group('Componenti del timer');
    lab.slider({ into: g1, label: 'Resistenza R1', min: 1000, max: 100000, series: 'E12', value: DEF.R1, fmt: fmtR, help: 'da Vcc al piedino 7: conta solo nella carica', onInput: (v) => touch('r1', () => { st.R1 = v; }) });
    lab.slider({ into: g1, label: 'Resistenza R2', min: 1000, max: 100000, series: 'E12', value: DEF.R2, fmt: fmtR, help: 'tra i piedini 7 e 6: conta nella carica e nella scarica', onInput: (v) => touch('r2', () => { st.R2 = v; }) });
    lab.slider({ into: g1, label: 'Condensatore C', min: 10e-9, max: 100e-6, series: 'E6', value: DEF.C, fmt: fmtC, help: 'da 10 nF (suoni) a 100 µF (lampi lenti)', onInput: (v) => touch('c', () => { st.C = v; }) });
    const g2 = lab.group('Alimentazione e strumenti');
    lab.slider({ into: g2, label: 'Alimentazione Vcc', min: 5, max: 15, step: 0.5, value: DEF.Vcc, fmt: fmtV, help: 'il 555 bipolare lavora tra 5 e 15 V', onInput: (v) => touch('vcc', () => { st.Vcc = v; }) });
    const insideCtl = lab.toggle({
      into: g2, label: 'Dentro il 555', on: 'blocchi visibili', off: 'chip chiuso', value: false,
      onChange: (v) => { st.inside = v; st.lastCtl = 'inside'; lab.root.classList.toggle('oscillatori-xray', v); if (S) S.chip.setAttribute('aria-pressed', String(v)); },
    });
    const audioCtl = lab.toggle({
      into: g2, label: 'Ascolta', on: 'altoparlante acceso', off: 'altoparlante spento', value: false,
      onChange: (v) => {
        st.lastCtl = 'audio';
        if (v && !audioStart()) { audioCtl.set(false, true); v = false; }
        if (!v) audioStop(false);
        st.audio = v;
      },
    });
    audioCtl.el.querySelector('.ei-toggle').setAttribute('aria-label', 'Ascolta l\'uscita del 555 con l\'altoparlante');
    if (reduced) {
      lab.choice({
        into: g2, label: 'Fase da guardare', value: 'carica',
        options: [{ value: 'carica', label: 'Carica' }, { value: 'scarica', label: 'Scarica' }],
        onChange: (v) => { st.view = v; },
      });
    }

    lab.challenges([
      { id: 'secondo', text: 'Fai lampeggiare il LED <b>una volta al secondo</b>: frequenza tra 0,9 e 1,1 Hz.', check: (q) => q.f >= 0.9 && q.f <= 1.1 },
      { id: 'duty', text: 'Porta il [[duty-cycle]] tra il 50 e il 55%. Quale delle due resistenze deve diventare piccola, e perché non si arriva mai al 50%?', check: (q) => q.duty > 0.5 && q.duty <= 0.55 },
      { id: 'suono', text: 'Supera i <b>200 Hz</b> e accendi <b>Ascolta</b>: il lampeggio è diventato una nota.', check: (q) => q.f > 200 && q.audio },
      { id: 'vcc', text: 'Cambia Vcc di almeno 4 V senza toccare R1, R2 e C. Che cosa succede alla frequenza?', check: (q) => q.vccMax - q.vccMin >= 4 - 1e-9 },
    ]);

    // Ogni comando: fotografa i valori di prima (traccia grigia) e ricalcola i tempi.
    function touch(kind, apply) {
      const now = performance.now();
      const before = params();
      if (now - st.lastTouch > 700) st.ghost = before;
      st.lastTouch = now;
      apply();
      st.lastCtl = kind;
      if (kind === 'vcc') {
        st.vccMin = Math.min(st.vccMin, st.Vcc);
        st.vccMax = Math.max(st.vccMax, st.Vcc);
      } else {
        st.vccMin = st.Vcc;
        st.vccMax = st.Vcc;
      }
      retime();
    }

    function retime() {
      st.f = model.freq(st.R1, st.R2, st.C);
      st.T = 1 / st.f;
      st.tH = model.tHigh(st.R1, st.R2, st.C);
      st.tL = model.tLow(st.R2, st.C);
      st.duty = model.duty(st.R1, st.R2);
      st.N = slowFactor(st.f);
      const W = windowFor(st.T);
      if (W !== st.W) {
        st.W = W;
        st.prev = null;
        st.sweep = null;
        st.armed = true;
        scope.setRange('x', 0, W);
      }
      scopeTitle.textContent = st.N > 1
        ? 'Oscilloscopio · tempi veri, disegno rallentato ' + fmtN(st.N) + ' volte'
        : 'Oscilloscopio · tempo reale';
      audioUpdate(false);
    }

    function powerOn() {
      st.vc = 0;
      st.q = 1;
      st.first = !reduced;
      st.simT = 0;
      st.prev = null;
      st.pulseR = 0;
      st.pulseS = 1;
      st.sweep = { t0: 0, pts: [] };
      st.armed = false;
      record(0, 0, 1);
    }

    /* --- simulazione e oscilloscopio --- */
    function record(t, vc, q) {
      const sw = st.sweep;
      if (!sw) return;
      const x = t - sw.t0;
      sw.pts.push([Math.min(x, st.W), vc, model.vout(q, st.Vcc)]);
      if (sw.pts.length > 5000) sw.pts = sw.pts.filter((p, i) => i % 2 === 0 || i === sw.pts.length - 1);
      if (x >= st.W) {
        st.prev = sw.pts;
        st.sweep = null;
        st.armed = true;
      }
    }

    function advance(dtReal) {
      const dtSim = dtReal / st.N;
      const p = params();
      const t0 = st.simT;
      const r = model.step({ vc: st.vc, q: st.q }, dtSim, p);
      let q = st.q;
      for (const e of r.events) {
        const te = t0 + e.t;
        const ve = e.t === 0 ? st.vc : (e.q ? p.Vcc / 3 : 2 * p.Vcc / 3);
        record(te, ve, q);
        if (e.q === 1 && st.armed) {
          st.sweep = { t0: te, pts: [] };
          st.armed = false;
        }
        record(te, ve, e.q);
        q = e.q;
        if (e.q === 0) { st.pulseR = 1; st.first = false; } else st.pulseS = 1;
        st.flash = 1;
      }
      st.vc = r.vc;
      st.q = r.q;
      st.simT = t0 + dtSim;
      record(st.simT, st.vc, st.q);
    }

    function drawScope(disp) {
      const p = params();
      const lo = p.Vcc / 3;
      const hi = 2 * p.Vcc / 3;
      scope.clear();
      // fasi con l'uscita alta della traccia in corso: bande leggere
      const pts = reduced ? null : st.sweep && st.sweep.pts;
      if (reduced) {
        const th = st.tH;
        for (let a = 0; a < st.W; a += st.T) scope.vband(a, Math.min(st.W, a + th), { color: P.t1, alpha: 0.06 });
      } else if (pts && pts.length > 1) {
        let start = null;
        for (const q of pts) {
          if (q[2] > 0 && start === null) start = q[0];
          if (q[2] <= 0 && start !== null) { scope.vband(start, q[0], { color: P.t1, alpha: 0.06 }); start = null; }
        }
        if (start !== null) scope.vband(start, pts[pts.length - 1][0], { color: P.t1, alpha: 0.06 });
      }
      scope.hline(hi, { color: P.t3, alpha: 0.6, label: '⅔ Vcc = ' + fmtV(hi) });
      scope.hline(lo, { color: P.t3, alpha: 0.6, label: '⅓ Vcc = ' + fmtV(lo) });
      const g = st.ghost;
      if (g && !same(g, p)) {
        scope.line((t) => model.vout(model.waveform(t, g).q, g.Vcc), { color: GHOST, width: 1.4, glow: false, alpha: 0.75 });
        scope.line((t) => model.waveform(t, g).vc, { color: GHOST, width: 1.4, glow: false, alpha: 0.75, dash: [5, 4] });
      }
      if (reduced) {
        scope.line((t) => model.vout(model.waveform(t, p).q, p.Vcc), { color: P.t1, width: 2 });
        scope.line((t) => model.waveform(t, p).vc, { color: P.t2, width: 2.4, fill: P.t2, fillAlpha: 0.07 });
        scope.point(disp.t, disp.vc, { color: P.t2, r: 4 });
        return;
      }
      if (st.prev && st.prev.length > 1) {
        scope.line(st.prev.map((q) => [q[0], q[2]]), { color: P.t1, width: 1.6, glow: false, alpha: 0.28 });
        scope.line(st.prev.map((q) => [q[0], q[1]]), { color: P.t2, width: 1.8, glow: false, alpha: 0.28 });
      }
      if (pts && pts.length > 1) {
        scope.line(pts.map((q) => [q[0], q[2]]), { color: P.t1, width: 2 });
        scope.line(pts.map((q) => [q[0], q[1]]), { color: P.t2, width: 2.4, fill: P.t2, fillAlpha: 0.07 });
        const last = pts[pts.length - 1];
        scope.point(last[0], last[1], { color: P.t2, r: 3.6 });
      }
    }

    /* --- altoparlante (Web Audio): parte solo con un clic, si ferma uscendo dal capitolo --- */
    let audio = null;
    function audioStart() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        const ctx = new AC();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(ctx.destination);
        audio = { ctx: ctx, osc: osc, gain: gain, duty: -1, muted: null };
        audioUpdate(true);
        osc.start();
        if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
        return true;
      } catch (e) {
        audio = null;
        return false;
      }
    }
    const audioFreq = () => clamp(st.f, AUDIO.min, AUDIO.max);
    function audioUpdate(now) {
      if (!audio) return;
      const a = audio;
      const t = a.ctx.currentTime;
      if (Math.abs(a.duty - st.duty) > 1e-4) {
        // onda rettangolare con il duty cycle vero del 555 (serie di Fourier di un impulso)
        try {
          const n = 48;
          const re = new Float32Array(n + 1);
          const im = new Float32Array(n + 1);
          for (let k = 1; k <= n; k++) {
            re[k] = Math.sin(2 * Math.PI * k * st.duty) / (Math.PI * k);
            im[k] = (1 - Math.cos(2 * Math.PI * k * st.duty)) / (Math.PI * k);
          }
          a.osc.setPeriodicWave(a.ctx.createPeriodicWave(re, im));
        } catch (e) { a.osc.type = 'square'; }
        a.duty = st.duty;
      }
      if (now) a.osc.frequency.setValueAtTime(audioFreq(), t);
      else a.osc.frequency.setTargetAtTime(audioFreq(), t, 0.02);
      audioMute(now);
    }
    function audioMute(now) {
      if (!audio) return;
      const muted = lab.paused || document.hidden || st.f > 20000;
      if (muted === audio.muted && !now) return;
      audio.muted = muted;
      audio.gain.gain.setTargetAtTime(muted ? 0 : AUDIO.vol, audio.ctx.currentTime, 0.03);
    }
    function audioStop(immediate) {
      if (!audio) return;
      const a = audio;
      audio = null;
      const end = () => {
        try { a.osc.stop(); } catch (e) { /* già fermo */ }
        try { a.ctx.close(); } catch (e) { /* già chiuso */ }
      };
      try { a.gain.gain.setTargetAtTime(0, a.ctx.currentTime, 0.015); } catch (e) { /* niente */ }
      if (immediate) end();
      else setTimeout(end, 150);
    }
    const onVis = () => audioMute(false);
    document.addEventListener('visibilitychange', onVis);

    /* --- lo schema --- */
    let S = null;
    function build() {
      const G = narrow ? NARROW : WIDE;
      lab.root.classList.toggle('oscillatori-narrow', G.narrow);
      lab.view(G.W, G.H);
      svg.innerHTML = '';
      const L = {};
      ['back', 'wire', 'sym', 'flow', 'top'].forEach((k) => { L[k] = s('g', { class: 'oscillatori-' + k }, svg); });
      const sc = { G: G, w: {}, f: {}, t: {} };
      const x0 = G.ic[0];
      const y0 = G.ic[1];
      const col = G.col;
      const yA = y0 + PIN.dis;
      const yB = y0 + PIN.thr;
      const y2 = y0 + PIN.trig;
      const pinL = x0 - 14;
      const W = (pts) => wire(L.wire, pts);

      // il 555
      const pins = [
        { id: 'dis', name: 'DIS', side: 'left', at: PIN.dis / ICH },
        { id: 'thr', name: 'THR', side: 'left', at: PIN.thr / ICH },
        { id: 'trig', name: 'TRIG', side: 'left', at: PIN.trig / ICH },
        { id: 'rst', name: 'RESET', side: 'top', at: PIN.rst / ICW },
        { id: 'vcc', name: 'VCC', side: 'top', at: PIN.vcc / ICW },
        { id: 'ctrl', name: 'CTRL', side: 'right', at: PIN.ctrl / ICH },
        G.narrow ? { id: 'out', name: 'OUT', side: 'bottom', at: PIN.outX / ICW } : { id: 'out', name: 'OUT', side: 'right', at: PIN.out / ICH },
        { id: 'gnd', name: 'GND', side: 'bottom', at: PIN.gnd / ICW },
      ];
      const ic = sym.ic(L.sym, { x: x0, y: y0, w: ICW, h: ICH, pins: pins, cls: 'oscillatori-chip' });
      for (const p of pins) {
        const e = ic[p.id];
        let tx = e[0];
        let ty = e[1];
        let anchor = 'middle';
        if (p.side === 'left') { tx += 7; ty -= 6; }
        else if (p.side === 'right') { tx -= 7; ty -= 6; }
        else if (p.side === 'top') { tx += 5; ty += 8; anchor = 'start'; }
        else { tx += 5; ty -= 3; anchor = 'start'; }
        s('text', { x: tx, y: ty, class: 'oscillatori-pin', 'text-anchor': anchor, text: String(PIN_NUM[p.id]) }, L.top);
      }
      const chip = ic.g;
      chip.setAttribute('tabindex', '0');
      chip.setAttribute('role', 'button');
      chip.setAttribute('aria-pressed', String(st.inside));
      chip.setAttribute('aria-label', 'Mostra o nascondi i blocchi dentro il 555');
      const flip = (e) => { e.preventDefault(); insideCtl.set(!st.inside); lab.invalidate(); };
      chip.addEventListener('click', flip);
      chip.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') flip(e); });
      sc.chip = chip;
      const outside = s('g', { class: 'oscillatori-outside', 'aria-hidden': 'true' }, chip);
      s('text', { x: ICW / 2, y: ICH / 2 - 16, class: 'ei-ic-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: 'NE555' }, outside);
      s('text', { x: ICW / 2, y: ICH / 2 + 6, class: 'ei-ic-sub', 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: 'timer' }, outside);
      s('text', { x: ICW / 2, y: ICH / 2 + 34, class: 'oscillatori-hint', 'text-anchor': 'middle', text: G.narrow ? 'tocca il chip' : 'fai clic sul chip' }, outside);
      s('text', { x: ICW / 2, y: ICH / 2 + 50, class: 'oscillatori-hint', 'text-anchor': 'middle', text: 'per guardarci dentro' }, outside);
      const inside = s('g', { class: 'oscillatori-inside' }, L.sym);
      sc.in = drawInside(inside, x0, y0, G.narrow);

      // alimentazione e rotaie
      const pin8 = ic.vcc;
      const pin4 = ic.rst;
      const xL = G.batt ? G.batt[0] : G.term;
      if (G.batt) {
        const b = sym.source(L.sym, { x: G.batt[0], y: G.batt[1], rot: 90, len: G.batt[2], kind: 'dc', label: 'Vcc', value: fmtV(st.Vcc), side: 1 });
        sc.t.vcc = b.label.querySelector('.value');
        sc.w.rail = W([[xL, G.batt[1]], [xL, G.yV], [pin8[0], G.yV], pin8]);
        sc.w.battN = W([[xL, G.batt[1] + G.batt[2]], [xL, G.yG]]);
      } else {
        sc.w.rail = W([[xL, G.yV], [pin8[0], G.yV], pin8]);
        s('circle', { cx: xL, cy: G.yV, r: 4.5, class: 'oscillatori-term' }, L.sym);
        const t = EI.label(L.top, xL + 10, G.yV - 14, '', { anchor: 'start', baseline: 'middle' });
        EI.s('tspan', { class: 'name', text: 'Vcc' }, t);
        sc.t.vcc = EI.s('tspan', { class: 'value', dx: 6, text: fmtV(st.Vcc) }, t);
      }
      sc.w.rst = W([[pin4[0], G.yV], pin4]);
      dot(L.wire, pin4[0], G.yV);
      sc.w.r1top = W([[col, G.yV], [col, G.r1]]);
      dot(L.wire, col, G.yV);
      const xR = G.narrow ? G.led.x : G.led.x;
      sc.w.gnd = W([[xL, G.yG], [xR, G.yG]]);
      sym.ground(L.sym, { x: G.gndSym, y: G.yG });

      // R1, R2, C e i loro nodi
      sc.r1 = sym.resistor(L.sym, { x: col, y: G.r1, rot: 90, len: 50, label: 'R1', value: fmtR(st.R1), side: G.sideR });
      sc.w.a = W([[col, G.r1 + 50], [col, G.r2]]);
      sc.w.dis = W([[col, yA], [pinL, yA]]);
      dot(L.wire, col, yA);
      sc.r2 = sym.resistor(L.sym, { x: col, y: G.r2, rot: 90, len: 50, label: 'R2', value: fmtR(st.R2), side: G.sideR });
      sc.w.b = W([[col, G.r2 + 50], [col, G.cTop]]);
      sc.w.thr = W([[col, yB], [pinL, yB]]);
      sc.w.trig = W([[col, y2], [pinL, y2]]);
      dot(L.wire, col, yB);
      dot(L.wire, col, y2);
      sc.cap = sym.capacitor(L.sym, { x: col, y: G.cTop, rot: 90, len: 44, label: 'C', value: fmtC(st.C), side: G.sideC });
      sc.w.cb = W([[col, G.cTop + 44], [col, G.yG]]);
      dot(L.wire, col, G.yG);
      // cariche sulle armature
      sc.plus = [];
      sc.minus = [];
      [-12, -6, 6, 12].forEach((dx) => {
        sc.plus.push(s('text', { x: col + dx, y: G.cTop + 14, class: 'oscillatori-q plus', 'text-anchor': 'middle', text: '+' }, L.top));
        sc.minus.push(s('text', { x: col + dx, y: G.cTop + 37, class: 'oscillatori-q minus', 'text-anchor': 'middle', text: '−' }, L.top));
      });

      // massa del 555
      const pin1 = ic.gnd;
      sc.w.pin1 = W([pin1, [pin1[0], G.yG]]);
      dot(L.wire, pin1[0], G.yG);

      // uscita: resistenza e LED verso massa
      const pin3 = ic.out;
      let ledC;
      if (G.narrow) {
        sc.w.out = W([pin3, [pin3[0], G.led.ry]]);
        sc.rl = sym.resistor(L.sym, { x: pin3[0], y: G.led.ry, rot: 90, len: G.led.rlen, label: 'R', value: '560 Ω', side: -1 });
        sc.w.ledA = W([[pin3[0], G.led.ry + G.led.rlen], [pin3[0], G.led.ly]]);
        sc.led = sym.diode(L.sym, { x: pin3[0], y: G.led.ly, rot: 90, len: 56, kind: 'led', label: 'LED', side: -1 });
        sc.w.ledK = W([[pin3[0], G.led.ly + 56], [pin3[0], G.yG]]);
        ledC = [pin3[0], G.led.ly + 28];
        sc.f.led = flowPath(L.flow, 'M' + pin3[0] + ' ' + pin3[1] + 'V' + G.yG);
        sc.t.real = s('text', { x: pin3[0] - 22, y: G.led.ly + 46, class: 'oscillatori-real', 'text-anchor': 'end', text: '' }, L.top);
      } else {
        sc.w.out = W([pin3, [G.led.rx, pin3[1]]]);
        sc.rl = sym.resistor(L.sym, { x: G.led.rx, y: pin3[1], len: G.led.rlen, label: 'R', value: '560 Ω', side: 1 });
        sc.w.ledA = W([[G.led.rx + G.led.rlen, pin3[1]], [G.led.x, pin3[1]]]);
        sc.led = sym.diode(L.sym, { x: G.led.x, y: pin3[1], rot: 90, len: 56, kind: 'led', label: 'LED', side: 1 });
        sc.w.ledK = W([[G.led.x, pin3[1] + 56], [G.led.x, G.yG]]);
        ledC = [G.led.x, pin3[1] + 28];
        sc.f.led = flowPath(L.flow, 'M' + pin3[0] + ' ' + pin3[1] + 'H' + G.led.x + 'V' + G.yG);
        sc.t.real = s('text', { x: G.led.x + 22, y: pin3[1] + 46, class: 'oscillatori-real', text: '' }, L.top);
      }
      sc.bloom = s('circle', { cx: ledC[0], cy: ledC[1], r: 34, class: 'oscillatori-bloom' }, L.back);

      // piedino 5: condensatore da 10 nF verso massa (nella composizione stretta resta libero)
      const pin5 = ic.ctrl;
      if (G.ctrlCap) {
        sc.w.ctrl = W([pin5, [G.ctrlCap, pin5[1]], [G.ctrlCap, pin5[1] + 10]]);
        sym.capacitor(L.sym, { x: G.ctrlCap, y: pin5[1] + 10, rot: 90, len: 40, value: '10 nF', side: 1 });
        sym.ground(L.sym, { x: G.ctrlCap, y: pin5[1] + 50 });
      } else {
        s('circle', { cx: pin5[0] + 3.5, cy: pin5[1], r: 3.2, class: 'oscillatori-term' }, L.sym);
      }

      // cariche che scorrono
      sc.f.r1 = flowPath(L.flow, 'M' + col + ' ' + G.yV + 'V' + yA);
      sc.f.r2 = flowPath(L.flow, 'M' + col + ' ' + yA + 'V' + yB);
      sc.f.c = flowPath(L.flow, 'M' + col + ' ' + yB + 'V' + (G.cTop + 17));
      sc.f.cb = flowPath(L.flow, 'M' + col + ' ' + (G.cTop + 27) + 'V' + G.yG);
      sc.f.dis = flowPath(L.flow, 'M' + col + ' ' + yA + 'H' + pinL);

      // indicatore di Vc tra le due soglie
      const [gx, gy, gw, gh] = G.gauge;
      s('rect', { x: gx, y: gy, width: gw, height: gh, rx: 4, class: 'oscillatori-gauge' }, L.back);
      s('rect', { x: gx, y: gy + gh / 3, width: gw, height: gh / 3, class: 'oscillatori-gauge-band' }, L.back);
      sc.gFill = s('rect', { x: gx + 2, y: gy + gh, width: gw - 4, height: 0, rx: 2, class: 'oscillatori-gauge-fill' }, L.back);
      sc.gTicks = [];
      [[2 / 3, '⅔'], [1 / 3, '⅓']].forEach(([k, t]) => {
        const y = gy + gh * (1 - k);
        sc.gTicks.push(s('path', { d: 'M' + (gx - 4) + ' ' + y + 'H' + (gx + gw + 4), class: 'oscillatori-gauge-tick' }, L.back));
        const lx = G.narrow ? gx + gw + 8 : gx - 7;
        s('text', { x: lx, y: y, class: 'oscillatori-frac', 'text-anchor': G.narrow ? 'start' : 'end', 'dominant-baseline': 'middle', text: t }, L.top);
      });
      sc.t.gauge = s('text', { x: gx + gw / 2, y: gy - 9, class: 'oscillatori-gauge-val', 'text-anchor': 'middle', text: '' }, L.top);

      // stato: fase e scala dei tempi
      if (G.card) {
        const [cx, cy, cw, ch] = G.card;
        s('rect', { x: cx, y: cy, width: cw, height: ch, rx: 12, class: 'oscillatori-card' }, L.back);
        s('text', { x: cx + 12, y: cy + 20, class: 'oscillatori-tag', text: 'FASE' }, L.top);
        sc.t.phase = s('text', { x: cx + 12, y: cy + 43, class: 'oscillatori-phase' }, L.top);
        sc.t.sub1 = s('text', { x: cx + 12, y: cy + 61, class: 'oscillatori-sub' }, L.top);
        sc.t.sub2 = s('text', { x: cx + 12, y: cy + 76, class: 'oscillatori-sub' }, L.top);
        s('path', { d: 'M' + (cx + 12) + ' ' + (cy + 88) + 'H' + (cx + cw - 12), class: 'oscillatori-sep' }, L.back);
        s('text', { x: cx + 12, y: cy + 104, class: 'oscillatori-tag', text: 'TEMPO' }, L.top);
        sc.t.time1 = s('text', { x: cx + 12, y: cy + 121, class: 'oscillatori-time' }, L.top);
        sc.t.time2 = s('text', { x: cx + 12, y: cy + 134, class: 'oscillatori-sub' }, L.top);
      } else {
        sc.t.phase = s('text', { x: 12, y: G.status, class: 'oscillatori-phase', 'dominant-baseline': 'middle' }, L.top);
        sc.t.time1 = s('text', { x: G.W - 12, y: G.status, class: 'oscillatori-time', 'text-anchor': 'end', 'dominant-baseline': 'middle' }, L.top);
      }
      sc.last = {};
      S = sc;
    }

    function flowPath(parent, d) {
      return new EI.Flow(parent, s('path', { d: d, class: 'oscillatori-fpath' }, parent), { spacing: 16 });
    }

    // Aggiorna un testo solo se cambia (meno lavoro per il browser a ogni fotogramma).
    function setText(el, key, txt) {
      if (!el || S.last[key] === txt) return;
      S.last[key] = txt;
      el.textContent = txt;
    }

    /* --- un fotogramma --- */
    function paint(dt, disp) {
      const sc = S;
      const p = params();
      const lo = p.Vcc / 3;
      const hi = 2 * p.Vcc / 3;
      const vc = disp.vc;
      const q = disp.q;
      const vA = model.vDis(q, vc, p);
      const vo = model.vout(q, p.Vcc);
      const iLed = model.ledCurrent(q, p.Vcc);
      const cur = model.currents(q, vc, p);
      const vcol = (v) => EI.vcolor(v, VMAX);

      // fili colorati con la tensione del nodo
      const set = (w, v) => { if (w) w.style.stroke = vcol(v); };
      set(sc.w.rail, p.Vcc);
      set(sc.w.rst, p.Vcc);
      set(sc.w.r1top, p.Vcc);
      set(sc.w.a, vA);
      set(sc.w.dis, vA);
      set(sc.w.b, vc);
      set(sc.w.thr, vc);
      set(sc.w.trig, vc);
      set(sc.w.out, vo);
      set(sc.w.ledA, q ? LED_V : 0);
      set(sc.w.ctrl, hi);
      [sc.w.cb, sc.w.gnd, sc.w.pin1, sc.w.ledK, sc.w.battN].forEach((w) => set(w, 0));

      // cariche in movimento (verso convenzionale)
      sc.f.r1.set(EI.speedFor(cur.r1, IMAX));
      sc.f.r2.set(EI.speedFor(cur.r2, IMAX));
      sc.f.c.set(EI.speedFor(cur.r2, IMAX));
      sc.f.cb.set(EI.speedFor(cur.r2, IMAX));
      sc.f.dis.set(EI.speedFor(cur.dis, IMAX));
      sc.f.led.set(EI.speedFor(iLed, IMAX));
      Object.keys(sc.f).forEach((k) => sc.f[k].step(dt));

      // cariche sulle armature: più tensione, più cariche
      const qk = clamp(vc / VMAX, 0, 1) * 4;
      sc.plus.forEach((el, k) => { el.style.opacity = clamp(qk - k + 0.35, 0, 1).toFixed(2); });
      sc.minus.forEach((el, k) => { el.style.opacity = clamp(qk - k + 0.35, 0, 1).toFixed(2); });

      // valori sui simboli
      setText(sc.t.vcc, 'vcc', fmtV(p.Vcc));
      setText(sc.r1.label.querySelector('.value'), 'r1', fmtR(p.R1));
      setText(sc.r2.label.querySelector('.value'), 'r2', fmtR(p.R2));
      setText(sc.cap.label.querySelector('.value'), 'c', fmtC(p.C));

      // indicatore di Vc: scala da 0 a Vcc, le soglie restano ferme a 1/3 e 2/3
      const [, gy, , gh] = sc.G.gauge;
      const hFill = clamp(vc / p.Vcc, 0, 1) * (gh - 4);
      sc.gFill.setAttribute('y', (gy + gh - 2 - hFill).toFixed(1));
      sc.gFill.setAttribute('height', hFill.toFixed(1));
      setText(sc.t.gauge, 'gauge', 'Vc ' + num(vc, 2) + ' V');

      // il LED: sempre in tempo reale
      const kOn = clamp(Math.sqrt(model.ledCurrent(1, p.Vcc) / 0.02), 0, 1);
      let k;
      if (reduced) k = st.f < 20 ? (q ? kOn : 0) : kOn * st.duty;
      else if (st.N === 1) k = EI.approach(st.led, q ? kOn : 0, dt, 45);
      else if (st.f < 20) k = ((st.realT * st.f) % 1) < st.duty ? kOn : 0;
      else if (st.f < 90) k = kOn * st.duty * (1 + 0.5 * ((90 - st.f) / 70) * (Math.random() - 0.5));
      else k = kOn * st.duty;
      st.led = k;
      sc.led.setGlow(k, LED_COLOR);
      sc.bloom.style.opacity = (k * 0.55).toFixed(3);
      setText(sc.t.real, 'real', st.N > 1 && !reduced ? (st.f >= 90 ? 'tempo reale: luce fissa' : 'tempo reale') : '');

      // dentro il 555
      const I = sc.in;
      const c1 = vc >= hi * (1 - 1e-9) || st.pulseR > 0.3;
      const c2 = vc <= lo * (1 + 1e-9) || st.pulseS > 0.3;
      set(I.vcc, p.Vcc);
      set(I.rst, p.Vcc);
      set(I.d2, hi);
      set(I.ctrl, hi);
      set(I.d1, lo);
      set(I.d1s, lo);
      set(I.d0, 0);
      set(I.ref2, hi);
      set(I.ref1, lo);
      set(I.thr, vc);
      set(I.trig, vc);
      set(I.c1, c1 ? p.Vcc : 0);
      set(I.c2, c2 ? p.Vcc : 0);
      set(I.q, q ? p.Vcc : 0);
      set(I.qb, q ? 0 : p.Vcc);
      set(I.out, vo);
      set(I.dis, vA);
      [I.tap2, I.ref2t].forEach((el) => { el.style.fill = vcol(hi); });
      [I.tap1, I.ref1t].forEach((el) => { el.style.fill = vcol(lo); });
      I.cmpT.classList.toggle('on', c1);
      I.cmpG.classList.toggle('on', c2);
      I.ff.classList.toggle('on', st.flash > 0.25);
      I.buf.classList.toggle('on', !!q);
      I.tr.classList.toggle('hot', !q);
      setText(I.b1, 'b1', c1 ? '1' : '0');
      setText(I.b2, 'b2', c2 ? '1' : '0');
      I.b1.classList.toggle('on', c1);
      I.b2.classList.toggle('on', c2);
      setText(I.qText, 'q', 'Q = ' + (q ? '1' : '0'));
      setText(I.trText, 'tr', q ? 'spento' : 'acceso');
      I.trText.classList.toggle('on', !q);
      I.fDiv.set(EI.speedFor(p.Vcc / 15000, IMAX));
      I.fTr.set(EI.speedFor(cur.dis, IMAX));
      I.fDiv.step(dt);
      I.fTr.step(dt);

      // fase e scala dei tempi
      const first = st.first && !reduced;
      const ph = first ? '▲ PRIMA CARICA' : q ? '▲ CARICA' : '▼ SCARICA';
      if (sc.G.card) {
        setText(sc.t.phase, 'ph', ph);
        setText(sc.t.sub1, 's1', first ? 'C parte da 0 V:' : q ? 'C si carica' : 'C si scarica');
        setText(sc.t.sub2, 's2', first ? 'ci mette di più' : q ? 'attraverso R1 + R2' : 'in R2 e nel piedino 7');
        setText(sc.t.time1, 't1', reduced ? 'immagine ferma' : st.N > 1 ? 'rallentato' : 'tempo reale');
        setText(sc.t.time2, 't2', reduced ? 'movimento ridotto' : st.N > 1 ? fmtN(st.N) + ' volte · LED reale' : 'schema e LED insieme');
      } else {
        setText(sc.t.phase, 'ph', ph + (first ? ' · da 0 V' : q ? ' · da R1 + R2' : ' · in R2, piedino 7'));
        setText(sc.t.time1, 't1', reduced ? 'immagine ferma' : st.N > 1 ? 'rallentato ×' + fmtN(st.N) : 'tempo reale');
      }
      sc.t.phase.style.fill = q ? P.t2 : P.t3;
      sc.t.time1.style.fill = st.N > 1 && !reduced ? P.t2 : P.t1;
    }

    /* --- spiegazione: cambia con i comandi e con il regime, non a ogni fase --- */
    function explainText() {
      const f = st.f;
      const p = params();
      const lo = p.Vcc / 3;
      const hi = 2 * p.Vcc / 3;
      const N = st.N;
      const slow = N > 1 ? ' Schema e oscilloscopio sono rallentati <b>' + fmtN(N) + ' volte</b>, il LED no.' : '';
      let regime = null;
      if (f > 90) regime = 'A ' + fmtF(f) + ' il LED si accende e si spegne ' + fmtN(Math.round(f)) + ' volte al secondo: l\'occhio non separa più i lampi e vede una luce fissa, meno intensa, al ' + fmtPct(st.duty) + ' della luminosità piena. È la [[persistenza-della-visione]].' + slow;
      else if (f > 20) regime = 'A ' + fmtF(f) + ' il LED tremola: siamo vicini al limite dell\'occhio, che di solito smette di vedere lo sfarfallio tra i 50 e i 90 lampi al secondo.' + slow;
      else if (N > 1) regime = 'Il LED lampeggia davvero ' + fmtF(f) + ', troppo in fretta per seguire il ciclo. Nello schema rallentato vedi Vc salire fino a ⅔ di Vcc in ' + fmtT(st.tH) + ' e scendere fino a ⅓ in ' + fmtT(st.tL) + '.' + slow;
      const insideMsg = 'Dentro il 555 il partitore di tre resistenze da 5 kΩ fissa ' + num(lo, 2) + ' V e ' + num(hi, 2) + ' V. Quando Vc tocca ⅔ di Vcc il [[comparatore]] di soglia azzera il [[flip-flop]]: l\'uscita va bassa e il transistor di scarica si accende. Quando Vc scende a ⅓ il comparatore di trigger rimette Q a 1. In mezzo il flip-flop ricorda lo stato: è questa memoria a creare l\'[[isteresi]].';
      const baseMsg = 'Uscita alta: C si carica attraverso R1 e R2 da ⅓ a ⅔ di Vcc in <b>' + fmtT(st.tH) + '</b>. Uscita bassa: il piedino 7 lo scarica attraverso la sola R2 in <b>' + fmtT(st.tL) + '</b>. Un ciclo dura ' + fmtT(st.T) + ', cioè ' + fmtF(f) + '.' + (reduced ? ' Con il movimento ridotto lo schema resta fermo: scegli la fase da guardare.' : ' Fai clic sul chip per vedere chi decide quando cambiare.');
      if (st.first && !reduced) return 'Appena acceso il condensatore è scarico: per salire da 0 V a ⅔ di Vcc impiega ln 3 · (R1 + R2) · C = <b>' + fmtT(model.firstHigh(p.R1, p.R2, p.C)) + '</b>, più di un tempo alto normale (' + fmtT(st.tH) + '). Dal ciclo successivo oscillerà soltanto tra ⅓ e ⅔ di Vcc.';
      switch (st.lastCtl) {
        case 'vcc':
          return 'Con Vcc = <b>' + fmtV(p.Vcc) + '</b> le soglie diventano ' + num(lo, 2) + ' V e ' + num(hi, 2) + ' V. Il condensatore si carica più o meno in fretta, in volt al secondo, ma la strada da fare è sempre la stessa frazione: metà della distanza da Vcc. Per questo il periodo resta <b>' + fmtT(st.T) + '</b>: i fronti coincidono con quelli della traccia grigia.';
        case 'audio':
          if (st.audio) {
            if (f > 20000) return 'A ' + fmtF(f) + ' il 555 produce ultrasuoni: nessuno li sentirebbe, per questo l\'altoparlante tace. Scegli un condensatore più grande.';
            if (f < AUDIO.min) return 'Il 555 batte a ' + fmtF(f) + ': è un ritmo, non ancora una nota, perché l\'orecchio sente un tono solo oltre i 20 Hz circa. Qui l\'altoparlante suona a ' + AUDIO.min + ' Hz, il minimo: rimpicciolisci C per salire.';
            if (f > AUDIO.max) return 'L\'altoparlante riceve un\'onda rettangolare a ' + fmtF(f) + '; per non ferire le orecchie qui suona al massimo a 4 kHz. Più breve è il periodo, più acuta è la nota.';
            return 'L\'altoparlante riceve l\'uscita del 555: un\'onda rettangolare a <b>' + fmtF(f) + '</b>, alta per il ' + fmtPct(st.duty) + ' del periodo. Più breve è il periodo, più acuta è la nota: prova a spostare C di un gradino.';
          }
          return regime || (st.inside ? insideMsg : baseMsg);
        case 'inside':
          if (st.inside) return insideMsg;
          return regime || baseMsg;
        case 'r1':
          if (regime && f > 20) return regime;
          return 'R1 entra solo nella carica: t<sub>alto</sub> = 0,693 · (R1 + R2) · C = <b>' + fmtT(st.tH) + '</b>, mentre t<sub>basso</sub> = 0,693 · R2 · C = ' + fmtT(st.tL) + ' non cambia. Più R1 è piccola rispetto a R2, più i due tempi si somigliano e il [[duty-cycle]] scende verso il 50% (ora ' + fmtPct(st.duty) + ')' + (p.R1 <= 1500 ? '. Non si scende sotto 1 kΩ: senza R1, il transistor acceso metterebbe Vcc in corto attraverso il piedino 7.' : '.');
        case 'r2':
          if (regime && f > 20) return regime;
          return 'R2 lavora in tutte e due le fasi: il condensatore si carica attraverso R1 + R2 e si scarica attraverso la sola R2. Ora il tempo alto è ' + fmtT(st.tH) + ' e quello basso ' + fmtT(st.tL) + ', con un [[duty-cycle]] del ' + fmtPct(st.duty) + '.' + (N > 1 ? slow : '');
        case 'c':
          return regime || 'C moltiplica tutti i tempi: con ' + fmtC(p.C) + ' il periodo è ' + fmtT(st.T) + ' e il duty cycle non cambia (' + fmtPct(st.duty) + '). Ogni gradino della serie E6 vale circa ×1,5; scendendo dai µF ai nF i lampi diventano un suono.';
        default:
          return regime || (st.inside ? insideMsg : baseMsg);
      }
    }

    /* --- ciclo di animazione --- */
    lab.loop((dt) => {
      if (!S) return;
      let disp;
      if (reduced) {
        const tp = st.view === 'carica' ? st.tH / 2 : st.tH + st.tL / 2;
        const w = model.waveform(tp, params());
        disp = { vc: w.vc, q: w.q, t: tp };
      } else {
        if (dt > 0) {
          st.realT += dt;
          advance(dt);
        }
        st.pulseR = EI.approach(st.pulseR, 0, dt, 3.2);
        st.pulseS = EI.approach(st.pulseS, 0, dt, 3.2);
        st.flash = EI.approach(st.flash, 0, dt, 3.2);
        disp = { vc: st.vc, q: st.q };
      }
      paint(dt, disp);
      drawScope(disp);
      rF.set(st.f);
      rT.set(st.T);
      rH.set(st.tH);
      rL.set(st.tL);
      rD.set(st.duty);
      rV.set(disp.vc);
      audioMute(false);
      lab.explain(explainText());
      lab.check(st);
    });

    lab.onReset(() => {
      st.ghost = null;
      st.lastCtl = null;
      st.lastTouch = -1e9;
      st.vccMin = st.Vcc;
      st.vccMax = st.Vcc;
      st.realT = 0;
      retime();
      powerOn();
    });

    // cambio di composizione quando cambia la larghezza (telefono ruotato, finestra ridimensionata)
    let raf = 0;
    let dead = false;
    const onResize = () => {
      if (wantNarrow() === narrow || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (dead) return;
        narrow = wantNarrow();
        build();
        lab.invalidate();
      });
    };
    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && stageEl) {
      ro = new ResizeObserver(onResize);
      ro.observe(stageEl);
    } else window.addEventListener('resize', onResize);

    lab.onDestroy(() => {
      dead = true;
      audioStop(true);
      document.removeEventListener('visibilitychange', onVis);
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', onResize);
    });

    retime();
    powerOn();
    build();
  }

  /* ---------- illustrazioni ---------- */

  // Figura 1: schema a blocchi del 555 e piedinatura del contenitore DIP-8.
  function insideFigure() {
    const o = [];
    const T = (x, y, cls, txt, anchor) => o.push('<text class="' + cls + '" x="' + x + '" y="' + y + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + txt + '</text>');
    const Pa = (d, cls) => o.push('<path class="' + (cls || 'f-line') + '" d="' + d + '"/>');
    const pinMark = (x, y, n) => {
      o.push('<circle class="f-paper" cx="' + x + '" cy="' + y + '" r="9"/>');
      T(x, y + 4, 'f-mono', String(n), 'middle');
    };
    // contenitore e piedini
    o.push('<rect class="f-soft" x="46" y="30" width="308" height="262" rx="12"/>');
    Pa('M200 19V30M300 19V30M28 44H46M28 182H46M28 242H46M354 90H372M354 262H372M80 292V303');
    pinMark(200, 10, 4);
    pinMark(300, 10, 8);
    pinMark(19, 44, 7);
    pinMark(19, 182, 6);
    pinMark(19, 242, 2);
    pinMark(381, 90, 5);
    pinMark(381, 262, 3);
    pinMark(80, 312, 1);
    // partitore
    Pa('M300 30V40M300 66V100M300 126V150M300 176V188M300 90H354M200 30V150');
    [40, 100, 150].forEach((y) => o.push('<rect class="f-paper" x="294" y="' + y + '" width="12" height="26" rx="2"/>'));
    [53, 113, 163].forEach((y) => T(312, y + 4, 'f-small', '5 kΩ'));
    Pa('M288 188H312M293 194H307M298 200H302');
    o.push('<circle class="f-fill" cx="300" cy="90" r="3.2"/><circle class="f-fill" cx="300" cy="140" r="3.2"/>');
    Pa('M300 140H292');
    T(288, 94, 'f-accent-text', '⅔ Vcc', 'end');
    T(288, 144, 'f-accent-text', '⅓ Vcc', 'end');
    T(300, 220, 'f-small', 'partitore', 'middle');
    T(206, 46, 'f-small', 'reset');
    // comparatori
    o.push('<path class="f-paper" d="M70 148L116 170L70 192Z"/><path class="f-paper" d="M70 208L116 230L70 252Z"/>');
    T(76, 162, 'f-mono', '−');
    T(76, 186, 'f-mono', '+');
    T(76, 222, 'f-mono', '+');
    T(76, 246, 'f-mono', '−');
    Pa('M46 182H70M46 242H70M60 158H70M60 218H70M116 170H150M116 230H150');
    T(57, 162, 'f-accent-text', '⅔', 'end');
    T(57, 222, 'f-accent-text', '⅓', 'end');
    T(92, 140, 'f-small', 'soglia', 'middle');
    T(92, 270, 'f-small', 'trigger', 'middle');
    // flip-flop
    o.push('<rect class="f-accent-soft" x="150" y="150" width="64" height="112" rx="6"/>');
    T(156, 174, 'f-mono', 'R');
    T(156, 234, 'f-mono', 'S');
    T(208, 234, 'f-mono', 'Q', 'end');
    T(180, 168, 'f-mono', 'Q', 'middle');
    Pa('M175.5 157H184.5', 'f-thin');
    T(182, 205, 'f-small', 'flip-flop', 'middle');
    // uscita
    Pa('M214 230H224V262H234M258 262H354');
    o.push('<path class="f-paper" d="M234 250L258 262L234 274Z"/>');
    T(246, 244, 'f-small', 'uscita', 'middle');
    // transistor di scarica
    Pa('M180 150V62H110M110 48V76M110 55L94 44H46M110 69L94 80V88');
    o.push('<path class="f-fill" d="' + arrowHead([110, 69], [94, 80], 0.9, 7) + '"/>');
    Pa('M82 88H106M87 94H101M92 100H96');
    T(58, 120, 'f-small', 'scarica', 'middle');

    // piedinatura DIP-8 vista dall'alto
    T(200, 344, 'f-title', 'Piedinatura DIP-8, vista dall\'alto', 'middle');
    o.push('<rect class="oscillatori-fig-chip" x="148" y="356" width="104" height="136" rx="6"/>');
    o.push('<path class="f-paper" d="M191 356A9 9 0 0 0 209 356Z"/>');
    o.push('<circle class="oscillatori-fig-dot" cx="161" cy="369" r="3.5"/>');
    const left = [['GND', 'massa'], ['TRIG', 'trigger'], ['OUT', 'uscita'], ['RESET', 'azzera']];
    const right = [['VCC', 'alimentazione'], ['DIS', 'scarica'], ['THR', 'soglia'], ['CTRL', 'controllo']];
    for (let k = 0; k < 4; k++) {
      const y = 380 + k * 32;
      o.push('<rect class="f-paper" x="134" y="' + (y - 5) + '" width="14" height="10" rx="1.5"/>');
      o.push('<rect class="f-paper" x="252" y="' + (y - 5) + '" width="14" height="10" rx="1.5"/>');
      T(158, y + 4, 'oscillatori-fig-chip-text', String(k + 1));
      T(242, y + 4, 'oscillatori-fig-chip-text', String(8 - k), 'end');
      o.push('<text class="f-small" x="128" y="' + (y + 4) + '" text-anchor="end"><tspan class="f-mono">' + left[k][0] + '</tspan> ' + left[k][1] + '</text>');
      o.push('<text class="f-small" x="272" y="' + (y + 4) + '"><tspan class="f-mono">' + right[k][0] + '</tspan> ' + right[k][1] + '</text>');
    }
    T(200, 432, 'oscillatori-fig-chip-text', 'NE555', 'middle');
    return '<svg viewBox="0 0 400 500">' + o.join('') + '</svg>';
  }

  // Figura 2: tensione del condensatore e uscita, allineate nel tempo, con il primo ciclo dall'accensione.
  function waveFigure() {
    const x0 = 58;
    const x1 = 390;
    const tau1 = 1;
    const tau2 = 0.75;
    const th = LN2 * tau1;
    const tl = LN2 * tau2;
    const t1 = LN3 * tau1;
    const phases = [[0, t1, 'first']];
    let t = t1;
    for (let k = 0; k < 5; k++) {
      const len = k % 2 === 0 ? tl : th;
      phases.push([t, t + len, k % 2 === 0 ? 'low' : 'high']);
      t += len;
    }
    const tEnd = t + 0.25;
    const X = (tt) => x0 + (x1 - x0) * tt / tEnd;
    const yTop = 24;
    const yBot = 150;
    const Yv = (v) => yBot - (yBot - yTop) * v;
    const yHi = 192;
    const yLo = 240;
    const vcAt = (tt) => {
      for (const [a, b, kind] of phases) {
        if (tt <= b + 1e-9) {
          if (kind === 'first') return 1 - Math.exp(-tt / tau1);
          if (kind === 'high') return 1 - (2 / 3) * Math.exp(-(tt - a) / tau1);
          return (2 / 3) * Math.exp(-(tt - a) / tau2);
        }
      }
      return 1 - (2 / 3) * Math.exp(-(tt - t) / tau1);
    };
    let d = '';
    for (let i = 0; i <= 260; i++) {
      const tt = tEnd * i / 260;
      d += (i ? 'L' : 'M') + X(tt).toFixed(1) + ' ' + Yv(vcAt(tt)).toFixed(1);
    }
    // uscita: alta durante le cariche
    let dq = 'M' + X(0) + ' ' + yHi;
    const highs = [];
    for (const [a, b, kind] of phases) {
      const y = kind === 'low' ? yLo : yHi;
      dq += 'L' + X(a).toFixed(1) + ' ' + y + 'L' + X(b).toFixed(1) + ' ' + y;
      if (kind !== 'low') highs.push([a, b]);
    }
    dq += 'L' + X(t).toFixed(1) + ' ' + yHi + 'L' + X(tEnd).toFixed(1) + ' ' + yHi;
    highs.push([t, tEnd]);
    const o = [];
    highs.forEach(([a, b]) => o.push('<rect class="oscillatori-fig-band" x="' + X(a).toFixed(1) + '" y="' + (yTop - 6) + '" width="' + (X(b) - X(a)).toFixed(1) + '" height="' + (yLo + 8 - yTop + 6) + '"/>'));
    o.push('<path class="f-thin" d="M' + x0 + ' ' + (yTop - 8) + 'V' + yBot + 'H' + x1 + 'M' + x0 + ' ' + (yHi - 12) + 'V' + (yLo + 6) + 'H' + x1 + '"/>');
    [[1, 'Vcc'], [2 / 3, '⅔ Vcc'], [1 / 3, '⅓ Vcc']].forEach(([v, lab]) => {
      o.push('<path class="f-dash" d="M' + x0 + ' ' + Yv(v) + 'H' + x1 + '"/>');
      o.push('<text class="' + (v === 1 ? 'f-small' : 'f-accent-text') + '" x="' + (x0 - 6) + '" y="' + (Yv(v) + 4) + '" text-anchor="end">' + lab + '</text>');
    });
    o.push('<text class="f-small" x="' + (x0 - 6) + '" y="' + (yBot + 4) + '" text-anchor="end">0</text>');
    o.push('<text class="f-small" x="' + (x0 - 6) + '" y="' + (yHi + 4) + '" text-anchor="end">alta</text>');
    o.push('<text class="f-small" x="' + (x0 - 6) + '" y="' + (yLo + 4) + '" text-anchor="end">bassa</text>');
    o.push('<text class="f-text" x="' + (x0 + 6) + '" y="' + (yTop - 10) + '">Vc</text>');
    o.push('<text class="f-text" x="' + (x0 + 6) + '" y="' + (yHi - 16) + '">Vout</text>');
    o.push('<path class="f-accent" stroke-width="3" d="' + d + '"/>');
    o.push('<path class="f-line" stroke-width="2.4" d="' + dq + '"/>');
    // quote dei tempi sul secondo ciclo completo
    const [ha, hb] = [phases[2][0], phases[2][1]];
    const [la, lb] = [phases[3][0], phases[3][1]];
    const quote = (a, b, y, txt) => {
      o.push('<path class="f-line" stroke-width="1.4" d="M' + X(a).toFixed(1) + ' ' + y + 'H' + X(b).toFixed(1) + 'M' + (X(a) + 5).toFixed(1) + ' ' + (y - 4) + 'L' + X(a).toFixed(1) + ' ' + y + 'L' + (X(a) + 5).toFixed(1) + ' ' + (y + 4) + 'M' + (X(b) - 5).toFixed(1) + ' ' + (y - 4) + 'L' + X(b).toFixed(1) + ' ' + y + 'L' + (X(b) - 5).toFixed(1) + ' ' + (y + 4) + '"/>');
      o.push('<text class="f-small" x="' + ((X(a) + X(b)) / 2).toFixed(1) + '" y="' + (y + 16) + '" text-anchor="middle">' + txt + '</text>');
    };
    quote(ha, hb, yLo + 22, 't alto');
    quote(la, lb, yLo + 22, 't basso');
    // sotto la soglia bassa, a destra della prima salita, la curva non passa più: lì va la nota
    o.push('<text class="f-small" x="' + (X(0.6) + 4).toFixed(1) + '" y="' + (Yv(0.15) + 2).toFixed(1) + '">← all\'accensione C parte da 0 V</text>');
    o.push('<text class="f-small" x="' + ((x0 + x1) / 2) + '" y="294" text-anchor="middle">t alto = 0,693·(R1 + R2)·C · t basso = 0,693·R2·C</text>');
    o.push('<path class="oscillatori-fig-cursor" d="M' + x0 + ' ' + (yTop - 8) + 'V' + (yLo + 8) + '"/>');
    return '<svg viewBox="0 0 400 300">' + o.join('') + '</svg>';
  }

  /* ---------- capitolo ---------- */

  EI.chapter({
    id: 'oscillatori',
    icon: 'wave',
    minutes: 15,
    summary: 'Un [[oscillatore]] è un circuito che crea da solo un segnale che si ripete: gli bastano una sorgente di energia, qualcosa che misuri il tempo e un meccanismo che, raggiunta una soglia, fa ricominciare il ciclo. Il [[timer-555]] lo fa con un condensatore che si carica e si scarica tra un terzo e due terzi della tensione di alimentazione: due resistenze e un condensatore decidono il ritmo, da un lampo al secondo fino a una nota musicale.',
    keywords: ['oscillatore', 'oscillatore-a-rilassamento', 'timer-555', 'astabile', 'duty-cycle', 'isteresi', 'flip-flop', 'monostabile'],
    model: model,
    css: [
      '.oscillatori-lab .ei-stage-svg { max-height: 470px; }',
      '.oscillatori-lab.oscillatori-narrow .ei-stage-svg { max-height: 760px; }',
      '.oscillatori-fpath { fill: none; stroke: none; }',
      '.oscillatori-pin { fill: var(--scope-text); font: 700 10px var(--mono); }',
      '.oscillatori-chip { cursor: pointer; outline: none; }',
      '.oscillatori-chip .chip { transition: fill var(--t-slow) var(--ease), stroke var(--t-fast) ease; }',
      '.oscillatori-chip:hover .chip, .oscillatori-chip:focus-visible .chip { stroke: var(--trace-3); }',
      '.oscillatori-chip .ei-ic-pin { transition: opacity var(--t-normal) ease; }',
      '.oscillatori-xray .oscillatori-chip .chip { fill: #09120f; }',
      '.oscillatori-xray .oscillatori-chip .ei-ic-pin { opacity: 0; }',
      '.oscillatori-outside, .oscillatori-inside { transition: opacity var(--t-slow) var(--ease); }',
      '.oscillatori-inside { opacity: 0; pointer-events: none; }',
      '.oscillatori-xray .oscillatori-inside { opacity: 1; }',
      '.oscillatori-xray .oscillatori-outside { opacity: 0; }',
      '.oscillatori-hint { fill: var(--trace-3); font: 700 10.5px var(--font); }',
      '.oscillatori-it { fill: var(--scope-text); font: 700 9.5px var(--mono); letter-spacing: .03em; }',
      '.oscillatori-sign { fill: var(--lab-ink); font: 800 10px var(--mono); }',
      '.oscillatori-frac { fill: var(--lab-ink); font: 800 12px var(--font); }',
      '.oscillatori-ff { fill: #fff; font: 800 13px var(--mono); }',
      '.oscillatori-bit { fill: var(--scope-text); font: 800 10.5px var(--mono); transition: fill var(--t-fast) ease; }',
      '.oscillatori-bit.on { fill: var(--trace-1); }',
      '.oscillatori-bar { fill: none; stroke: var(--lab-ink); stroke-width: 1.3; }',
      '.oscillatori-block { fill: #0b1512; stroke: var(--sym); stroke-width: 1.6; stroke-linejoin: round; transition: stroke var(--t-fast) ease, filter var(--t-fast) ease; }',
      '.oscillatori-block.on { stroke: var(--trace-1); filter: drop-shadow(0 0 5px var(--trace-1)); }',
      '.oscillatori-res { fill: var(--scope-bg); stroke: var(--sym); stroke-width: 1.6; }',
      '.oscillatori-basebar { stroke-width: 3.4; }',
      '.ei-sym.oscillatori-tr { transition: color var(--t-fast) ease; }',
      '.ei-sym.oscillatori-tr.hot { color: var(--trace-3); filter: drop-shadow(0 0 4px var(--trace-3)); }',
      '.oscillatori-term { fill: var(--scope-bg); stroke: var(--sym); stroke-width: 2; }',
      '.oscillatori-q { font: 800 11px var(--mono); opacity: 0; }',
      '.oscillatori-q.plus { fill: var(--trace-2); }',
      '.oscillatori-q.minus { fill: var(--trace-3); }',
      '.oscillatori-bloom { fill: #ff3b30; opacity: 0; filter: blur(12px); pointer-events: none; }',
      '.oscillatori-real { fill: #ff8a80; font: 700 9.5px var(--mono); }',
      '.oscillatori-gauge { fill: #050a09; stroke: var(--lab-line); stroke-width: 1.2; }',
      '.oscillatori-gauge-band { fill: color-mix(in srgb, var(--trace-3) 16%, transparent); }',
      '.oscillatori-gauge-fill { fill: var(--trace-2); filter: drop-shadow(0 0 4px var(--trace-2)); }',
      '.oscillatori-gauge-tick { stroke: var(--trace-3); stroke-width: 1.6; }',
      '.oscillatori-gauge-val { fill: var(--trace-2); font: 700 10.5px var(--mono); }',
      '.oscillatori-card { fill: #050a09; stroke: var(--lab-line); stroke-width: 1.2; }',
      '.oscillatori-sep { stroke: var(--lab-line); stroke-width: 1; }',
      '.oscillatori-tag { fill: var(--scope-text); font: 800 9px var(--mono); letter-spacing: .16em; }',
      '.oscillatori-phase { font: 800 14px var(--font); fill: var(--trace-2); }',
      '.oscillatori-sub { fill: var(--lab-ink); font: 600 11px var(--font); }',
      '.oscillatori-time { font: 800 12.5px var(--mono); fill: var(--trace-1); }',
      '.oscillatori-narrow .ei-stage .ei-sym-label { font-size: 15px; }',
      '.oscillatori-narrow .ei-stage .ei-sym-label .value { font-size: 14px; }',
      '.oscillatori-narrow .ei-stage .ei-ic-pin { font-size: 12px; }',
      '.oscillatori-narrow .oscillatori-pin { font-size: 12.5px; }',
      '.oscillatori-narrow .oscillatori-it { font-size: 11.5px; }',
      '.oscillatori-narrow .oscillatori-sign { font-size: 12px; }',
      '.oscillatori-narrow .oscillatori-bit { font-size: 12.5px; }',
      '.oscillatori-narrow .oscillatori-frac { font-size: 14px; }',
      '.oscillatori-narrow .oscillatori-hint { font-size: 13px; }',
      '.oscillatori-narrow .oscillatori-real { font-size: 12px; }',
      '.oscillatori-narrow .oscillatori-gauge-val { font-size: 13px; }',
      '.oscillatori-narrow .oscillatori-phase { font-size: 15px; }',
      '.oscillatori-narrow .oscillatori-time { font-size: 13.5px; }',
      '.ei-figure .oscillatori-fig-chip { fill: #1b2420; stroke: var(--fig-ink); stroke-width: 1.6; }',
      '.ei-figure .oscillatori-fig-chip-text { fill: #e8f2ee; font: 700 12px var(--mono); }',
      '.ei-figure .oscillatori-fig-dot { fill: #e8f2ee; }',
      '.ei-figure .oscillatori-fig-band { fill: color-mix(in srgb, var(--ei-hl-bright) 14%, transparent); }',
      '.ei-figure .oscillatori-fig-cursor { fill: none; stroke: var(--ei); stroke-width: 2; opacity: .7; animation: oscillatori-sweep 8s linear infinite; }',
      '@keyframes oscillatori-sweep { from { transform: translateX(0); } to { transform: translateX(332px); } }',
      '@media (prefers-reduced-motion: reduce) {',
      '  .oscillatori-outside, .oscillatori-inside, .oscillatori-chip .chip, .oscillatori-block, .oscillatori-bit { transition: none; }',
      '  .ei-figure .oscillatori-fig-cursor { animation: none; display: none; }',
      '}',
    ].join('\n'),
    lab: {
      title: 'Il ritmo del 555',
      intro: 'Scegli R1, R2 e C e guarda il condensatore salire e scendere tra ⅓ e ⅔ di Vcc: il LED lampeggia al ritmo vero e l\'oscilloscopio misura i tempi sulla scala reale. Fai clic sul chip, o accendi <b>Dentro il 555</b>, per vedere comparatori, flip-flop e transistor di scarica al lavoro; quando la frequenza sale fino ai suoni, prova <b>Ascolta</b>.',
      svgLabel: 'Schema del timer 555 in modo astabile: pila, resistenze R1 e R2, condensatore C e LED sull\'uscita',
      layout: 'side',
      mount: mount,
    },
    how: [
      'Un [[oscillatore]] trasforma una tensione continua in un segnale che si ripete da solo. Gli servono tre cose: una sorgente di energia (la pila), un elemento che misura il tempo (qui una resistenza e un condensatore, con la loro [[costante-di-tempo]]) e un meccanismo che, arrivato in fondo, fa ripartire il ciclo: una [[retroazione-positiva]] o un interruttore comandato.',
      'La versione più semplice è l\'[[oscillatore-a-rilassamento]]: il condensatore si carica piano piano; quando la sua tensione tocca una soglia alta, un interruttore lo scarica fino a una soglia più bassa, e tutto ricomincia. Le due soglie diverse sono un\'[[isteresi]]: con una soglia sola il circuito resterebbe incerto proprio sul confine.',
      'Il [[timer-555]] contiene tutti i pezzi. Tre resistenze uguali in serie dividono Vcc in tre parti e fissano le soglie a ⅓ e ⅔ di Vcc. Due [[comparatore|comparatori]] confrontano con quelle soglie la tensione del condensatore, un [[flip-flop]] ricorda se si sta caricando o scaricando, un transistor sul piedino 7 fa da interruttore di scarica e lo stadio di uscita sul piedino 3 fornisce fino a 200 mA, abbastanza per un LED o un piccolo altoparlante.',
      'Nel modo [[astabile]], finché il flip-flop vale 1 l\'uscita è alta e C si carica attraverso R1 e R2, da ⅓ a ⅔ di Vcc. Deve coprire metà della distanza che lo separa da Vcc, e per dimezzare quella distanza una [[carica-esponenziale]] impiega ln 2 ≈ 0,693 costanti di tempo: t<sub>alto</sub> = 0,693 · (R1 + R2) · C.',
      'A ⅔ di Vcc il comparatore di soglia azzera il flip-flop: l\'uscita va bassa e il transistor collega il piedino 7 a massa. Ora C si scarica attraverso la sola R2 fino a ⅓ di Vcc, in t<sub>basso</sub> = 0,693 · R2 · C. Lì il comparatore di trigger rimette a 1 il flip-flop e il ciclo riparte.',
      'Il periodo vale T = 0,693 · (R1 + 2·R2) · C, cioè f ≈ 1,44 / ((R1 + 2·R2) · C). Il [[duty-cycle]] (R1 + R2)/(R1 + 2·R2) resta sempre sopra il 50%, perché la carica passa anche da R1 e la scarica no. Vcc invece non compare: se la pila cala, soglie e corrente di carica calano nella stessa proporzione e il ritmo non cambia.',
      'Se il piedino 2 non è collegato al condensatore ma a un pulsante, si ottiene il modo [[monostabile]]: ogni volta che il pulsante porta il piedino 2 sotto ⅓ di Vcc, l\'uscita resta alta per t = 1,1 · R · C, il tempo che serve a C per caricarsi da 0 V a ⅔ di Vcc; poi il transistor lo scarica e il circuito torna a riposo. Quel 1,1 è ln 3.',
    ],
    formulas: [
      {
        name: 'Tempo alto e tempo basso',
        expr: '<var>t</var><sub>alto</sub> = ln 2 · (<var>R</var><sub>1</sub> + <var>R</var><sub>2</sub>) · <var>C</var><br><var>t</var><sub>basso</sub> = ln 2 · <var>R</var><sub>2</sub> · <var>C</var>',
        legend: [['ln 2', 'circa 0,693: quante costanti di tempo servono per dimezzare la distanza dalla tensione finale'], ['R<sub>1</sub>, R<sub>2</sub>', 'le due resistenze esterne, in ohm'], ['C', 'il condensatore di temporizzazione, in farad']],
        note: 'Con i valori di partenza del laboratorio (22 kΩ, 47 kΩ e 22 µF): t<sub>alto</sub> ≈ 1,05 s e t<sub>basso</sub> ≈ 0,72 s.',
      },
      {
        name: 'Frequenza dell\'astabile',
        expr: '<var>f</var> = <span class="frac"><span>1</span><span>ln 2 · (<var>R</var><sub>1</sub> + 2<var>R</var><sub>2</sub>) · <var>C</var></span></span> ≈ <span class="frac"><span>1,44</span><span>(<var>R</var><sub>1</sub> + 2<var>R</var><sub>2</sub>) · <var>C</var></span></span>',
        legend: [['f', 'frequenza, in hertz: cicli al secondo'], ['1,44', 'vale 1/ln 2: è il numero che compare nei fogli tecnici del 555']],
        note: 'Vcc non compare: il 555 batte lo stesso ritmo a 5 V e a 15 V. Esempio: 1 kΩ, 10 kΩ e 100 nF danno circa 687 Hz.',
      },
      {
        name: 'Duty cycle',
        expr: '<var>D</var> = <span class="frac"><span><var>t</var><sub>alto</sub></span><span><var>T</var></span></span> = <span class="frac"><span><var>R</var><sub>1</sub> + <var>R</var><sub>2</sub></span><span><var>R</var><sub>1</sub> + 2<var>R</var><sub>2</sub></span></span>',
        legend: [['D', 'la frazione del periodo con l\'uscita alta'], ['T', 'il periodo, t<sub>alto</sub> + t<sub>basso</sub>']],
        note: 'È sempre più del 50%: con R1 = 1 kΩ e R2 = 10 kΩ si arriva al 52%. Per scendere sotto il 50% si mette un diodo in parallelo a R2, così la carica la scavalca.',
      },
    ],
    figures: [
      {
        title: 'Dentro il 555 e i suoi otto piedini',
        svg: insideFigure(),
        caption: 'Il partitore di tre resistenze da 5 kΩ fissa le soglie; i comparatori di soglia e di trigger comandano il [[flip-flop]], che accende l\'uscita oppure il transistor di scarica. Sotto, il contenitore DIP-8 visto dall\'alto: i piedini si contano da 1, vicino alla tacca, in senso antiorario. Che il nome «555» venga dalle tre resistenze da 5 kΩ è una spiegazione diffusa ma contestata.',
        alt: 'Schema a blocchi del 555 con partitore, due comparatori, flip-flop, transistor di scarica e stadio di uscita; sotto, la piedinatura DIP-8 con i nomi degli otto piedini',
      },
      {
        title: 'Le forme d\'onda dell\'astabile',
        svg: waveFigure(),
        caption: 'In alto la tensione del condensatore: all\'accensione parte da 0 V, per questo il primo tempo alto è più lungo, poi oscilla tra ⅓ e ⅔ di Vcc con tratti di curva esponenziale. In basso l\'uscita, alta mentre C si carica e bassa mentre si scarica; le bande evidenziano i tempi alti.',
        alt: 'Grafico della tensione sul condensatore che oscilla tra un terzo e due terzi di Vcc e onda rettangolare dell\'uscita allineata nel tempo',
      },
    ],
    history: {
      text: [
        'Per far oscillare un circuito servono qualcosa che amplifichi e una strada che riporti l\'uscita all\'ingresso. Nel 1912 Edwin H. Armstrong, studente alla Columbia University di New York, scopre che rimandando alla griglia di un triodo una parte del segnale della placca l\'amplificazione cresce moltissimo: è la rigenerazione, una [[retroazione-positiva]]. Spinta oltre un certo punto, la valvola comincia a oscillare da sola e diventa un generatore di onde radio. Nel 1913 ci arriva in modo indipendente anche Alexander Meissner, alla Telefunken di Berlino, con l\'oscillatore che porta ancora il suo nome.',
        'Sulla paternità dell\'idea si apre una lunghissima battaglia di brevetti, soprattutto tra Armstrong e Lee De Forest, l\'inventore del triodo. Nel 1934 la Corte Suprema degli Stati Uniti dà ragione a De Forest, ma buona parte degli ingegneri continua a considerare Armstrong il vero scopritore.',
        'Gli oscillatori a rilassamento nascono a Parigi durante la Prima guerra mondiale. All\'École normale supérieure, per la radiotelegrafia militare, Henri Abraham ed Eugène Bloch collegano due valvole in modo che ciascuna, accendendosi, spenga l\'altra: il circuito salta tra due stati e produce un\'onda quasi quadrata, ricca di armoniche, utile per misurare con precisione le frequenze radio. Lo chiamano multivibratore. Nel 1926 l\'olandese Balthasar van der Pol descrive con un\'equazione queste oscillazioni, lente a caricarsi e rapide a scaricarsi, e diffonde il nome di oscillazioni di rilassamento.',
        'Il timer 555 arriva mezzo secolo dopo. Nel 1971 Hans Camenzind, un ingegnere nato a Zurigo che lavorava a contratto per la Signetics, in California, ha l\'idea mentre lavora a un anello ad aggancio di fase (PLL). Il reparto tecnico la boccia; il responsabile marketing, Art Fury, ci crede. Camenzind passa quasi un anno tra prototipi su basetta e disegni a mano; sostituendo un generatore di corrente con una semplice resistenza scende da nove a otto piedini, e il chip entra in un contenitore DIP-8. Il NE555 esce nel 1972 e diventa uno dei circuiti integrati più venduti di sempre: all\'inizio degli anni 2000 si stimava un miliardo di pezzi l\'anno.',
      ],
      events: [
        { year: 1912, title: 'La rigenerazione', who: 'Edwin H. Armstrong', text: 'Rimandando alla griglia di un triodo parte del segnale, l\'amplificazione cresce; con più retroazione la valvola oscilla da sola.' },
        { year: 1913, title: 'L\'oscillatore di Meissner', who: 'Alexander Meissner, Telefunken', text: 'Un oscillatore a valvola con retroazione induttiva, scoperto indipendentemente da Armstrong.' },
        { year: 1917, title: 'Il multivibratore', who: 'Henri Abraham ed Eugène Bloch', text: 'Due valvole che si spengono a vicenda: uno dei primi oscillatori a rilassamento, reso pubblico nel 1919.' },
        { year: 1926, title: 'Le oscillazioni di rilassamento', who: 'Balthasar van der Pol', text: 'Un\'equazione per gli oscillatori che si caricano lentamente e si scaricano di colpo, come il multivibratore.' },
        { year: 1971, title: 'Il progetto del 555', who: 'Hans Camenzind, per la Signetics', text: 'Dopo quasi un anno di prove, il primo prototipo del chip è pronto nell\'ottobre del 1971.' },
        { year: 1972, title: 'Il NE555 in commercio', who: 'Signetics', text: 'Un timer completo in otto piedini. Secondo la rivista Elektor, nei primi tre mesi se ne vendettero più di mezzo milione.' },
      ],
    },
    fun: 'Perché proprio «555»? Molti libri lo spiegano con le tre resistenze da 5 kΩ del partitore interno. In un\'intervista registrata, però, Hans Camenzind raccontò che il numero fu scelto quasi a caso: lo decise Art Fury, il responsabile marketing della Signetics, convinto che il chip avrebbe venduto moltissimo. Le tre resistenze da 5 kΩ nel 555 bipolare ci sono davvero: forse è soltanto una felice coincidenza.',
    uses: 'Luci lampeggianti, cicalini, sirene e campanelli; generatori di toni e piccoli sintetizzatori; il PWM, la modulazione di larghezza d\'impulso, che regola la velocità di un motorino o la luminosità di un LED cambiando il [[duty-cycle]]; l\'antirimbalzo dei pulsanti e i ritardi all\'accensione in modo [[monostabile]]; il segnale di clock per provare i circuiti digitali. Esistono la versione doppia 556 e versioni CMOS a basso consumo, come il 7555. Quando serve un ritmo molto preciso, negli orologi e nei computer, si usano invece gli oscillatori al quarzo.',
    links: [
      { href: '#rc-filtri', section: 'Questa sezione', title: 'La carica RC e la costante di tempo τ = R·C' },
      { href: '#operazionale', section: 'Questa sezione', title: 'Il comparatore: due tensioni a confronto' },
      { href: '../porte-logiche/index.html#calcolo', section: 'Porte logiche', title: 'Il flip-flop e la memoria dei circuiti logici' },
      { href: '../elettronica-avanzata/index.html', section: 'Elettronica avanzata', title: 'Oscillatori al quarzo e PLL' },
      { href: '../elettronica-base/index.html#misure', section: 'Elettronica base', title: 'L\'oscilloscopio per vedere le forme d\'onda' },
    ],
    glossary: {
      'oscillatore': { term: 'Oscillatore', def: 'Circuito che produce da solo un segnale periodico partendo da una tensione continua. Servono una sorgente di energia, un elemento che fissa il tempo e una retroazione o un interruttore che rinnova il ciclo.' },
      'oscillatore-a-rilassamento': { term: 'Oscillatore a rilassamento', def: 'Oscillatore in cui un condensatore si carica lentamente fino a una soglia e poi si scarica in fretta fino a un\'altra soglia. Il ritmo dipende da resistenze e condensatori, non da una risonanza.' },
      'isteresi': { term: 'Isteresi', def: 'Comportamento con due soglie diverse: il circuito cambia stato quando la tensione supera la soglia alta e torna indietro solo quando scende sotto quella bassa. Nel 555 le soglie sono ⅓ e ⅔ di Vcc.' },
      'retroazione-positiva': { term: 'Retroazione positiva', def: 'Riportare all\'ingresso una parte dell\'uscita in modo che rinforzi il segnale invece di correggerlo. Rende instabile un amplificatore e, se è abbastanza forte, lo fa oscillare.' },
      'timer-555': { term: 'Timer 555', def: 'Circuito integrato a 8 piedini progettato da Hans Camenzind per la Signetics nel 1971. Con un partitore, due comparatori, un flip-flop e un transistor di scarica genera ritardi e onde rettangolari.' },
      'astabile': { term: 'Astabile', def: 'Modo di funzionamento senza stati stabili: il circuito passa da solo, senza fermarsi, da un livello all\'altro e produce un\'onda rettangolare. È il 555 usato come oscillatore.' },
      'monostabile': { term: 'Monostabile', def: 'Modo con un solo stato stabile: un impulso di comando porta l\'uscita nell\'altro stato per un tempo fissato (nel 555, 1,1 · R · C), poi il circuito torna a riposo da solo.' },
      'duty-cycle': { term: 'Duty cycle', def: 'Frazione del periodo in cui un\'onda rettangolare resta alta, di solito in percentuale. Nel 555 astabile vale (R1 + R2)/(R1 + 2·R2), sempre più del 50%.' },
      'flip-flop': { term: 'Flip-flop', def: 'Circuito logico con due stati stabili che ricorda l\'ultimo comando: un impulso sull\'ingresso S (set) lo porta a 1, uno sull\'ingresso R (reset) lo riporta a 0. È la memoria più piccola dell\'elettronica digitale.' },
      'persistenza-della-visione': { term: 'Persistenza della visione', def: 'L\'occhio non riesce a seguire una luce che si accende e si spegne troppo in fretta: oltre qualche decina di lampi al secondo, di solito tra 50 e 90, vede una luce fissa con la luminosità media.' },
    },
  });
})();
