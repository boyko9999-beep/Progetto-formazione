/*
 * Capitolo 7: l'amplificatore operazionale.
 * Laboratorio: un 741 simulato (guadagno ad anello aperto finito, uscita che si ferma a circa
 * 1 V dalle alimentazioni) in quattro configurazioni: invertente, non invertente, inseguitore
 * e comparatore. Il generatore va al rallentatore (0,5 Hz) per seguire le cariche in Rin e Rf;
 * oscilloscopio con la traccia che si disegna e transcaratteristica con il punto di lavoro.
 */
(function () {
  'use strict';

  const { s, sym, wire, dot, si, num, clamp } = EI;

  /* ---------- modello fisico (puro, testato in tests/operazionale.test.js) ---------- */

  // Valori tipici del µA741 (datasheet TI e ST): A = 200 V/mV, prodotto guadagno-banda 1 MHz,
  // slew rate 0,5 V/µs, uscita fino a circa 1 V dalle alimentazioni con un carico di 10 kΩ.
  const OPAMP = { A: 2e5, GBW: 1e6, SR: 0.5e6, head: 1, RL: 10e3 };

  const model = {
    OPAMP: OPAMP,
    // Guadagno con A infinito. r1 è Rin (invertente) oppure Rg (non invertente, verso massa).
    ideal: (mode, r1, rf) => (mode === 'inv' ? -rf / r1 : mode === 'non' ? 1 + rf / r1 : mode === 'seg' ? 1 : NaN),
    // 1/β: quante volte l'operazionale "vede" amplificato il proprio errore (noise gain).
    noiseGain: (mode, r1, rf) => (mode === 'inv' || mode === 'non' ? 1 + rf / r1 : mode === 'seg' ? 1 : NaN),
    // Guadagno ad anello chiuso con A finito: G = Gideale / (1 + (1/β) / A).
    closedLoop: (mode, r1, rf, A) => model.ideal(mode, r1, rf) / (1 + model.noiseGain(mode, r1, rf) / A),
    // La formula di Black: G = A / (1 + A·β), che tende a 1/β quando A è enorme.
    feedback: (A, beta) => A / (1 + A * beta),
    // Tensione massima dell'uscita: le alimentazioni meno il margine del 741 (circa 1 V).
    vsat: (vs, head) => Math.max(0, vs - (head == null ? OPAMP.head : head)),
    // Banda a −3 dB ad anello chiuso: prodotto guadagno-banda diviso 1/β.
    bandwidth: (gbw, ng) => gbw / ng,
    // Frequenza massima di una sinusoide di ampiezza vpk prima che lo slew rate la deformi.
    fullPower: (sr, vpk) => sr / (2 * Math.PI * vpk),
    // Sommatore invertente (mixer): inputs = [[V1, R1], [V2, R2], ...].
    summing: (inputs, rf) => -rf * inputs.reduce((acc, x) => acc + x[0] / x[1], 0),
    // Frazione del periodo in cui una sinusoide di ampiezza amp supera la soglia vref.
    duty: (amp, vref) => {
      if (vref >= amp) return 0;
      if (vref <= -amp) return 1;
      return 0.5 - Math.asin(vref / amp) / Math.PI;
    },
    // Stato istantaneo del circuito per una tensione d'ingresso vin.
    // p = { mode: 'inv' | 'non' | 'seg' | 'cmp', r1, rf, vs, vref, A, head }
    solve: (p, vin) => {
      const A = p.A || OPAMP.A;
      const vsat = model.vsat(p.vs, p.head);
      let vp;
      let vn;
      let vlin;
      if (p.mode === 'cmp') {
        // anello aperto: tutto il guadagno A sulla differenza tra gli ingressi
        vp = vin;
        vn = p.vref || 0;
        vlin = A * (vp - vn);
      } else {
        vlin = model.closedLoop(p.mode, p.r1, p.rf, A) * vin;
      }
      const vout = clamp(vlin, -vsat, vsat);
      if (p.mode === 'inv') {
        vp = 0;
        vn = (vin * p.rf + vout * p.r1) / (p.r1 + p.rf); // partitore tra ingresso e uscita
      } else if (p.mode === 'non') {
        vp = vin;
        vn = vout * p.r1 / (p.r1 + p.rf); // partitore Rf–Rg
      } else if (p.mode === 'seg') {
        vp = vin;
        vn = vout;
      }
      return { vin: vin, vout: vout, vlin: vlin, vp: vp, vn: vn, vd: vp - vn, sat: Math.abs(vlin) > vsat + 1e-12, vsat: vsat };
    },
    // Riassunto di un periodo intero di una sinusoide di ampiezza amp.
    cycle: (p, amp, n) => {
      const N = n || 360;
      let vmax = -Infinity;
      let vmin = Infinity;
      let maxVd = 0;
      let sat = false;
      let high = 0;
      for (let k = 0; k < N; k++) {
        const r = model.solve(p, amp * Math.sin(2 * Math.PI * k / N));
        if (r.vout > vmax) vmax = r.vout;
        if (r.vout < vmin) vmin = r.vout;
        if (Math.abs(r.vd) > maxVd) maxVd = Math.abs(r.vd);
        if (r.sat) sat = true;
        if (r.vout > 0) high++;
      }
      const top = model.solve(p, amp);
      return { vmax: vmax, vmin: vmin, peak: Math.max(Math.abs(vmax), Math.abs(vmin)), maxVd: maxVd, sat: sat, gain: amp > 0 ? top.vout / amp : NaN, high: high / N };
    },
  };

  /* ---------- costanti del laboratorio ---------- */

  const F_SIG = 0.5; // Hz: il generatore va al rallentatore per seguire le cariche
  const T_SIG = 1 / F_SIG;
  const IMAX = 1e-3; // corrente di riferimento per la velocità delle cariche
  const AMPS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 4, 5]; // come un generatore da banco
  const MAG = [2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const NB = ' ';
  const TWO_PI = 2 * Math.PI;

  // Due composizioni dello schema: larga per lo schermo, stretta e più alta per il telefono.
  // In alto la formula del guadagno con i valori scelti (e, se c'è posto, la legenda dei colori);
  // right è il bordo destro del disegno, per centrare le configurazioni con meno componenti.
  const GEO = {
    wide: {
      W: 640, H: 350, OX: 300, OY: 190, Yfb: 96, Ygnd: 318, xN: 236, xs0: 132, xs1: 196,
      xGenInv: 62, genInvTop: 214, xGenNon: 214, genNonTop: 236, glen: 64, xPlusGnd: 256,
      xOut: 436, xRL: 532, rlTop: 222, rlen: 64, xTerm: 604, xGnd: 400, stub: 20, narrow: false,
      eqX: 18, eqY: 30, right: 634, legend: true,
    },
    narrow: {
      W: 420, H: 400, OX: 196, OY: 212, Yfb: 104, Ygnd: 370, xN: 148, xs0: 72, xs1: 128,
      xGenInv: 30, genInvTop: 244, xGenNon: 118, genNonTop: 260, glen: 60, xPlusGnd: 160,
      xOut: 314, xRL: 346, rlTop: 240, rlen: 56, xTerm: 0, xGnd: 250, stub: 18, narrow: true,
      eqX: 10, eqY: 26, right: 420, legend: false,
    },
  };

  // Numeri all'italiana con il segno meno tipografico: fmtNum(-4.7) → "−4,7".
  function fmtNum(x, sig) {
    if (!isFinite(x)) return '—';
    const v = Number(x.toPrecision(sig || 4));
    return v.toLocaleString('it-IT', { maximumFractionDigits: 8, useGrouping: false }).replace('-', '−');
  }
  // "+1,20 V", "−0,35 V", "0,00 V"
  function fmtSigned(v, d, unit) {
    const r = Math.abs(v) < Math.pow(10, -d) / 2 ? 0 : v;
    return (r > 0 ? '+' : r < 0 ? '−' : '') + num(Math.abs(r), d) + (unit ? NB + unit : '');
  }
  const ohm = (v) => si(v, 'Ω', { trim: true });
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

  // Etichette delle alimentazioni nel margine destro del grafico, fuori dalla traccia.
  function railLabels(pl, vs, label, cTop, cBot) {
    const c = pl.ctx;
    c.save();
    c.font = '700 10.5px ' + MONO;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillStyle = cTop;
    c.fillText('+' + label, pl.px1 + 6, pl.Y(vs));
    c.fillStyle = cBot;
    c.fillText('−' + label, pl.px1 + 6, pl.Y(-vs));
    c.restore();
  }

  /* ---------- laboratorio ---------- */

  function mount(lab) {
    const svg = lab.svg;
    const P = EI.palette();
    const mq = window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;

    const st = {
      mode: 'inv', r1: 10e3, rf: 47e3, amp: 1, vs: 12, vref: 0,
      t: 0, satMark: null, back: false,
      d: null, // valori mostrati: inseguono con dolcezza quelli scelti
      hitP: 0, hitN: 0,
    };
    function snap() {
      st.d = { l1: Math.log(st.r1), lf: Math.log(st.rf), la: Math.log(st.amp), vs: st.vs, vref: st.vref };
    }
    snap();

    lab.root.classList.add('operazionale-lab');

    /* --- grafici --- */
    // Margine destro largo: lì vanno le etichette delle alimentazioni, lontano dalle tracce.
    const scope = lab.plot({
      title: 'Oscilloscopio · Vin e Vout', height: 210, pad: { r: 46 },
      x: { min: 0, max: 2 * T_SIG, unit: 's', div: 8, label: 'tempo' },
      y: { min: -15.6, max: 15.6, unit: 'V', count: 6 },
      legend: [{ label: 'Vin', color: 'var(--trace-2)' }, { label: 'Vout', color: 'var(--trace-1)' }],
      aria: 'Oscilloscopio: due periodi della tensione d\'ingresso e di quella d\'uscita',
    });
    const trans = lab.plot({
      title: 'Transcaratteristica', height: 210, pad: { r: 46 },
      x: { min: -1.25, max: 1.25, unit: 'V', count: 4, label: 'Vin' },
      y: { min: -15.6, max: 15.6, unit: 'V', count: 6, label: 'Vout' },
      legend: [{ label: 'Vout(Vin)', color: 'var(--trace-1)' }, { label: 'punto di lavoro', color: 'var(--trace-2)' }],
      aria: 'Caratteristica di trasferimento: Vout in funzione di Vin, con il punto di lavoro',
    });
    lab.plotsEl.classList.add('operazionale-plots');

    /* --- strumenti --- */
    const rGi = lab.readout({ label: 'Guadagno ideale', color: 'var(--trace-2)' });
    const rGm = lab.readout({ label: 'Guadagno reale', color: 'var(--trace-1)' });
    const pkOpts = { label: 'Vout di picco', unit: 'V', color: 'var(--trace-1)', max: 11 };
    const rPk = lab.readout(pkOpts);
    const rVd = lab.readout({ label: 'V+ − V−', color: 'var(--trace-3)' });
    const rBw = lab.readout({ label: 'Banda a −3 dB', color: 'var(--trace-3)' });
    const rSt = lab.readout({ label: 'Stato', color: 'var(--trace-1)' });
    const relabel = (r, text) => { r.el.querySelector('.ei-readout-label').textContent = text; };

    /* --- comandi --- */
    const gTop = lab.group();
    lab.choice({
      into: gTop, label: 'Configurazione', value: 'inv',
      options: [
        { value: 'inv', label: 'Invertente' }, { value: 'non', label: 'Non invertente' },
        { value: 'seg', label: 'Inseguitore' }, { value: 'cmp', label: 'Comparatore' },
      ],
      onChange: (v) => setMode(v),
    });
    const gRes = lab.group('Resistenze · valori commerciali E12');
    const r1Ctl = lab.slider({ into: gRes, label: 'Rin, in ingresso', min: 1000, max: 100000, series: 'E12', value: 10000, unit: 'Ω', onInput: (v) => { st.r1 = v; values(); } });
    lab.slider({ into: gRes, label: 'Rf, di retroazione', min: 1000, max: 1e6, series: 'E12', value: 47000, unit: 'Ω', onInput: (v) => { st.rf = v; values(); } });
    const gSig = lab.group('Generatore e alimentazione');
    lab.slider({
      into: gSig, label: 'Ampiezza di Vin (picco)', min: 0, max: AMPS.length - 1, step: 1, value: AMPS.indexOf(1),
      fmt: (i) => si(AMPS[i], 'V', { trim: true }), onInput: (i) => { st.amp = AMPS[i]; },
    });
    lab.slider({ into: gSig, label: 'Alimentazione', min: 5, max: 15, step: 1, value: 12, fmt: (v) => '±' + v + NB + 'V', onInput: (v) => { st.vs = Number(v); values(); } });
    const gCmp = lab.group('Soglia del comparatore');
    lab.slider({ into: gCmp, label: 'Vref sul morsetto −', min: -5, max: 5, step: 0.1, value: 0, fmt: (v) => fmtSigned(Number(v), 1, 'V'), onInput: (v) => { st.vref = Math.round(Number(v) * 10) / 10; values(); } });

    lab.challenges([
      { id: 'meno-dieci', text: 'Costruisci un amplificatore invertente con guadagno −10.', check: (q) => q.mode === 'inv' && Math.abs(q.gid + 10) < 0.05 },
      { id: 'cinque-volt', text: 'Con il non invertente porta 0,5 V di picco ad almeno 5 V di picco, senza tagliare l\'onda.', check: (q) => q.mode === 'non' && Math.abs(q.amp - 0.5) < 1e-9 && q.peak >= 4.99 && !q.sat },
      { id: 'rientro', text: 'Manda l\'uscita in [[saturazione-uscita|saturazione]], poi riportala nella zona lineare cambiando solo il guadagno.', check: (q) => q.back },
      { id: 'microvolt', text: 'Porta l\'uscita ad almeno 10 V di picco senza saturare: V+ e V− restano a meno di 1 mV l\'uno dall\'altro?', check: (q) => (q.mode === 'inv' || q.mode === 'non') && q.peak >= 9.95 && !q.sat && q.maxVd < 1e-3 },
      { id: 'quarto', text: 'Con il [[comparatore]], fai restare l\'uscita alta per circa un quarto del tempo (tra il 20% e il 30%).', check: (q) => q.mode === 'cmp' && q.duty >= 0.2 && q.duty <= 0.3 },
    ]);

    /* --- lo schema --- */
    let S = null;

    // Sfumatura della legenda: gli stessi colori dei fili, da −Valim a +Valim.
    const defs = s('defs', null, svg);
    const grad = s('linearGradient', { id: 'operazionale-vgrad', x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
    [-1, -0.6, -0.3, -0.1, 0, 0.1, 0.3, 0.6, 1].forEach((t) => s('stop', { offset: ((t + 1) / 2).toFixed(3), 'stop-color': EI.vcolor(t, 1) }, grad));

    function build() {
      const G = GEO[mq && mq.matches ? 'narrow' : 'wide'];
      lab.view(G.W, G.H);
      if (S) S.root.remove();
      const mode = st.mode;
      const fb = mode !== 'cmp';
      const Yi = G.OY - 16;
      const Yn = G.OY + 16;
      const pinX = G.OX - 22;
      const outX = G.OX + 88;
      const vX = G.OX + 33;
      const vpY = G.OY - 36;
      const vnY = G.OY + 36;
      const top = vpY - G.stub;
      const bot = vnY + G.stub;
      const rlen = G.xs1 - G.xs0;
      const rfA = vX - rlen / 2;
      const rfB = vX + rlen / 2;
      const genX = mode === 'inv' ? G.xGenInv : G.xGenNon;
      const genTop = mode === 'inv' ? G.genInvTop : G.genNonTop;
      const genBot = genTop + G.glen;
      const big = G.narrow;

      const root = s('g', { class: 'operazionale-sch' }, svg);
      // con meno componenti a sinistra (inseguitore, comparatore) il disegno si sposta e resta centrato
      const left = mode === 'inv' ? G.xGenInv - 20 : mode === 'seg' ? G.xGenNon - 20 : G.xs0 - 4;
      const dx = Math.min(0, Math.round((G.W - left - G.right) / 2));
      const circ = s('g', dx ? { transform: 'translate(' + dx + ' 0)' } : null, root);
      const lGlow = s('g', null, circ);
      const lWire = s('g', null, circ);
      const lSym = s('g', null, circ);
      const lFlow = s('g', null, circ);
      const lTop = s('g', null, circ);
      const wires = [];
      const flows = [];
      const addWire = (pts, key) => { wires.push({ el: wire(lWire, pts), key: key }); };
      const addFlow = (d, key, opts) => {
        const path = s('path', { d: d, class: 'ei-wire', style: 'opacity:0' }, lFlow);
        flows.push({ f: new EI.Flow(lFlow, path, opts), key: key });
      };
      const name = (x, y, text, anchor) => EI.label(lTop, x, y, text, { anchor: anchor || 'start', cls: 'operazionale-name' });
      const tag = (x, y, anchor, cls) => s('text', { x: x, y: y, class: 'operazionale-tag' + (cls ? ' ' + cls : ''), 'text-anchor': anchor || 'start', 'dominant-baseline': 'middle' }, lTop);

      // bagliori: anello di retroazione e alimentazioni che "toccano" l'uscita
      const hitP = s('ellipse', { cx: vX, cy: top, rx: 18, ry: 10, class: 'operazionale-hit pos' }, lGlow);
      const hitN = s('ellipse', { cx: vX, cy: bot, rx: 18, ry: 10, class: 'operazionale-hit neg' }, lGlow);
      let band = null;
      if (fb) band = s('path', { d: 'M' + G.xOut + ' ' + G.OY + 'V' + G.Yfb + 'H' + G.xN + 'V' + Yi, class: 'operazionale-fb' }, lGlow);

      // generatore del segnale
      sym.source(lSym, { x: genX, y: genTop, rot: 90, len: G.glen, kind: 'ac' });
      addWire([[genX, genBot], [genX, G.Ygnd]], 'gnd');
      if (mode === 'inv') addWire([[genX, genTop], [genX, Yi], [G.xs0, Yi]], 'vin');
      else addWire([[genX, genTop], [genX, Yn], [pinX, Yn]], 'vin');
      const gx = genX + (big ? 22 : 26);
      const gy = genTop + G.glen / 2;
      name(gx, gy - (big ? 11 : 8), 'Vin');
      const vinTag = tag(gx, gy + (big ? 12 : 9));

      // la "casella" a sinistra del morsetto −: Rin, Rg o la pila della soglia
      let slot = null;
      let refTag = null;
      let refSign = 0;
      if (mode === 'inv' || mode === 'non') {
        slot = sym.resistor(lSym, { x: G.xs0, y: Yi, len: rlen, label: mode === 'inv' ? 'Rin' : 'Rg', value: ohm(st.r1) });
        if (mode === 'non') addWire([[G.xs0, Yi], [G.xs0, G.Ygnd]], 'gnd');
        addWire([[G.xs1, Yi], [pinX, Yi]], 'vn');
      } else if (mode === 'cmp') {
        // la pila della soglia ha il + verso il morsetto − se Vref è positiva, verso massa se è negativa
        refSign = st.vref < 0 ? -1 : 1;
        if (refSign > 0) sym.source(lSym, { x: G.xs1, y: Yi, rot: 180, len: rlen, kind: 'dc' });
        else sym.source(lSym, { x: G.xs0, y: Yi, len: rlen, kind: 'dc' });
        addWire([[G.xs0, Yi], [G.xs0, G.Ygnd]], 'gnd');
        addWire([[G.xs1, Yi], [pinX, Yi]], 'vref');
        const cx = (G.xs0 + G.xs1) / 2;
        name(cx, Yi - (big ? 48 : 42), 'Vref', 'middle');
        refTag = tag(cx, Yi - 28, 'middle', 'ref');
      }

      // anello di retroazione
      let rf = null;
      if (mode === 'inv' || mode === 'non') {
        addWire([[G.xN, Yi], [G.xN, G.Yfb], [rfA, G.Yfb]], 'vn');
        rf = sym.resistor(lSym, { x: rfA, y: G.Yfb, len: rlen, label: 'Rf', value: ohm(st.rf) });
        addWire([[rfB, G.Yfb], [G.xOut, G.Yfb], [G.xOut, G.OY]], 'vout');
      } else if (mode === 'seg') {
        addWire([[pinX, Yi], [G.xN, Yi], [G.xN, G.Yfb], [G.xOut, G.Yfb], [G.xOut, G.OY]], 'vout');
      }
      if (mode === 'inv') addWire([[pinX, Yn], [G.xPlusGnd, Yn], [G.xPlusGnd, G.Ygnd]], 'gnd');

      // l'operazionale con le sue alimentazioni
      sym.opamp(lSym, { x: G.OX, y: G.OY, supply: true });
      s('text', { x: G.OX + 31, y: G.OY + 1, class: 'operazionale-chip', 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: '741' }, lSym);
      addWire('M' + vX + ' ' + vpY + 'V' + top + 'M' + (vX - 10) + ' ' + top + 'H' + (vX + 10), 'vs+');
      addWire('M' + vX + ' ' + vnY + 'V' + bot + 'M' + (vX - 10) + ' ' + bot + 'H' + (vX + 10), 'vs-');
      const railP = tag(vX + 15, top, 'start', 'rail');
      const railN = tag(vX + 15, bot, 'start', 'rail');

      // uscita, carico e massa
      addWire([[outX, G.OY], [G.xOut, G.OY]], 'vout');
      if (big) addWire([[G.xOut, G.OY], [G.xRL, G.OY], [G.xRL, G.rlTop]], 'vout');
      else {
        addWire([[G.xOut, G.OY], [G.xTerm - 6, G.OY]], 'vout');
        addWire([[G.xRL, G.OY], [G.xRL, G.rlTop]], 'vout');
      }
      sym.resistor(lSym, { x: G.xRL, y: G.rlTop, rot: 90, len: G.rlen, label: big ? null : 'RL', value: big ? null : si(OPAMP.RL, 'Ω', { trim: true }), side: -1 });
      if (big) {
        name(G.xRL + 16, G.rlTop + G.rlen / 2 - 11, 'RL');
        EI.label(lTop, G.xRL + 16, G.rlTop + G.rlen / 2 + 11, si(OPAMP.RL, 'Ω', { trim: true }), { anchor: 'start', cls: 'operazionale-val' });
      }
      addWire([[G.xRL, G.rlTop + G.rlen], [G.xRL, G.Ygnd]], 'gnd');
      const busL = mode === 'inv' ? G.xGenInv : mode === 'seg' ? G.xGenNon : G.xs0;
      addWire([[busL, G.Ygnd], [big ? G.xRL : G.xTerm - 6, G.Ygnd]], 'gnd');
      sym.ground(lSym, { x: G.xGnd, y: G.Ygnd });
      let voutTag;
      if (big) {
        name(370, G.OY - 44, 'Vout', 'middle');
        voutTag = tag(370, G.OY - 22, 'middle');
      } else {
        s('circle', { cx: G.xTerm, cy: G.OY, r: 5, class: 'operazionale-term' }, lSym);
        s('circle', { cx: G.xTerm, cy: G.Ygnd, r: 5, class: 'operazionale-term' }, lSym);
        name(G.xTerm, G.OY - 22, 'Vout', 'middle');
        voutTag = tag(G.xTerm, G.OY + 24, 'middle');
      }

      // nodi
      const nodes = [[G.xGnd, G.Ygnd]];
      if (mode === 'inv' || mode === 'non') nodes.push([G.xN, Yi]);
      if (fb) nodes.push([G.xOut, G.OY]);
      if (!big) nodes.push([G.xRL, G.OY], [G.xRL, G.Ygnd]);
      if (mode === 'inv') nodes.push([G.xPlusGnd, G.Ygnd]);
      if (mode === 'non' || mode === 'cmp') nodes.push([G.xGenNon, G.Ygnd]);
      nodes.forEach((n) => dot(lSym, n[0], n[1]));

      // la retroazione disegnata: frecce lungo l'anello e cortocircuito virtuale tra gli ingressi
      let chev = null;
      let fbLabel = null;
      let bridge = null;
      if (fb) {
        chev = s('g', { class: 'operazionale-chevs' }, lTop);
        const ch = (x, y, ang) => s('path', { d: 'M-3.5 -5L2.5 0L-3.5 5', class: 'operazionale-chev', transform: 'translate(' + x + ',' + y + ') rotate(' + ang + ')' }, chev);
        ch(G.xOut - 11, (G.Yfb + G.OY) / 2, -90);
        ch(mode === 'seg' ? (G.xN + G.xOut) / 2 : (rfB + G.xOut) / 2, G.Yfb + 11, 180);
        ch(G.xN + 11, (G.Yfb + Yi) / 2 + (big ? 12 : 10), 90);
        fbLabel = s('text', { x: G.xN + (big ? 9 : 12), y: G.Yfb + (big ? 30 : 28), class: 'operazionale-fb-label', text: 'RETROAZIONE' }, lTop);
        const bx = pinX + 11;
        bridge = {
          line: s('path', { d: 'M' + bx + ' ' + (Yi + 4) + 'V' + (Yn - 4), class: 'operazionale-bridge' }, lTop),
          sym: s('text', { x: bx - 5, y: G.OY + 1, class: 'operazionale-bridge-sym', 'text-anchor': 'end', 'dominant-baseline': 'middle', text: '≈' }, lTop),
        };
      }

      // cariche che scorrono (verso convenzionale)
      if (mode === 'inv') {
        addFlow('M' + genX + ' ' + genTop + 'V' + Yi + 'H' + G.xN, 'iIn');
        addFlow('M' + G.xGnd + ' ' + G.Ygnd + 'H' + genX + 'V' + genBot, 'iIn');
      }
      if (mode === 'non') addFlow('M' + G.xN + ' ' + Yi + 'H' + G.xs0 + 'V' + G.Ygnd + 'H' + G.xGnd, 'iG');
      if (mode === 'inv' || mode === 'non') addFlow('M' + G.xN + ' ' + Yi + 'V' + G.Yfb + 'H' + G.xOut + 'V' + G.OY, 'iF');
      addFlow('M' + outX + ' ' + G.OY + 'H' + G.xOut, 'iO', { spacing: 14 });
      addFlow('M' + G.xOut + ' ' + G.OY + 'H' + G.xRL + 'V' + G.Ygnd + 'H' + G.xGnd, 'iL');
      addFlow('M' + vX + ' ' + top + 'V' + vpY, 'iP', { spacing: 10 });
      addFlow('M' + vX + ' ' + vnY + 'V' + bot, 'iN', { spacing: 10 });

      // in alto, fuori dal disegno spostato: la formula con i valori scelti e la legenda dei colori
      const hud = s('g', { class: 'operazionale-hud' }, root);
      const eq = s('text', { x: G.eqX, y: G.eqY, class: 'operazionale-eq' }, hud);
      let leg = null;
      if (G.legend) {
        const bx1 = G.W - 18;
        const bw = 128;
        s('text', { x: bx1, y: 19, class: 'operazionale-legend-title', 'text-anchor': 'end', text: 'TENSIONE DEI FILI' }, hud);
        s('rect', { x: bx1 - bw, y: 27, width: bw, height: 6, rx: 3, fill: 'url(#operazionale-vgrad)' }, hud);
        leg = ['start', 'middle', 'end'].map((a, i) => s('text', { x: bx1 - bw + i * bw / 2, y: 46, class: 'operazionale-legend-tick', 'text-anchor': a }, hud));
      }

      S = {
        root: root, wires: wires, flows: flows, slot: slot, rf: rf, refTag: refTag, vinTag: vinTag, voutTag: voutTag,
        railP: railP, railN: railN, hitP: hitP, hitN: hitN, band: band, chev: chev, fbLabel: fbLabel, bridge: bridge,
        eq: eq, leg: leg, refSign: refSign, broken: null, now: {},
      };
      values();
      // dissolvenza d'ingresso quando cambia la configurazione (niente con il movimento ridotto)
      if (!lab.reduced) {
        root.style.opacity = '0';
        void root.getBoundingClientRect();
        root.style.opacity = '';
      }
    }

    // La formula della configurazione, in pezzi [classe, testo]: simboli, numeri, note.
    function eqParts() {
      const m = st.mode;
      if (m === 'inv') return [['sym', 'G = −Rf/Rin'], ['num', ' = −' + ohm(st.rf) + '/' + ohm(st.r1) + ' = ' + fmtNum(model.ideal(m, st.r1, st.rf), 4)]];
      if (m === 'non') return [['sym', 'G = 1 + Rf/Rg'], ['num', ' = 1 + ' + ohm(st.rf) + '/' + ohm(st.r1) + ' = ' + fmtNum(model.ideal(m, st.r1, st.rf), 4)]];
      if (m === 'seg') return [['sym', 'G = 1'], ['note', ' · l\'uscita torna tutta sul −']];
      const v = num(model.vsat(st.vs), 0) + NB + 'V';
      return [['sym', 'Vin > Vref ⇒ '], ['num', '+' + v], ['note', ' · altrimenti '], ['num', '−' + v]];
    }

    // Scritte che dipendono dai valori scelti (non dal tempo).
    function values() {
      if (!S) return;
      // la pila della soglia cambia verso quando Vref cambia segno: si ridisegna lo schema
      if (S.refSign && (st.vref < 0 ? -1 : 1) !== S.refSign) { build(); return; }
      const setVal = (part, v) => {
        if (!part || !part.label) return;
        const t = part.label.querySelector('.value');
        if (t) t.textContent = ohm(v);
      };
      setVal(S.slot, st.r1);
      setVal(S.rf, st.rf);
      if (S.refTag) S.refTag.textContent = fmtSigned(st.vref, 1, 'V');
      S.railP.textContent = '+' + st.vs + NB + 'V';
      S.railN.textContent = '−' + st.vs + NB + 'V';
      S.eq.textContent = '';
      eqParts().forEach((p) => s('tspan', { class: p[0], text: p[1] }, S.eq));
      if (S.leg) ['−' + st.vs + NB + 'V', '0' + NB + 'V', '+' + st.vs + NB + 'V'].forEach((t, i) => { S.leg[i].textContent = t; });
    }

    function setMode(v) {
      st.mode = v;
      gRes.hidden = v === 'seg' || v === 'cmp';
      gCmp.hidden = v !== 'cmp';
      r1Ctl.el.querySelector('.ei-slider-label').textContent = v === 'non' ? 'Rg, verso massa' : 'Rin, in ingresso';
      const cmp = v === 'cmp';
      relabel(rGi, cmp ? 'Guadagno A' : 'Guadagno ideale');
      relabel(rGm, cmp ? 'Soglia Vref' : 'Guadagno reale');
      relabel(rPk, cmp ? 'Vout adesso' : 'Vout di picco');
      relabel(rBw, cmp ? 'Uscita alta per' : 'Banda a −3 dB');
      relabel(rSt, cmp ? 'Uscita' : 'Stato');
      build();
      lab.invalidate();
    }

    lab.onReset(() => {
      st.t = 0;
      st.satMark = null;
      st.back = false;
      snap();
    });

    if (mq) {
      const onMq = () => { build(); lab.invalidate(); };
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      lab.onDestroy(() => { if (mq.removeEventListener) mq.removeEventListener('change', onMq); });
    }

    /* --- spiegazione (dipende solo dai valori scelti, non dall'istante) --- */
    function explainFor(q, tc) {
      const vsat = model.vsat(q.vs);
      const fmtV = (v) => si(v, 'V', { sig: 3, trim: true });
      if (q.mode === 'cmp') {
        const rail = num(vsat, 0) + NB + 'V';
        const more = q.amp < AMPS[AMPS.length - 1] ? ', o alza l\'ampiezza,' : '';
        if (q.vref >= q.amp) {
          return 'La soglia Vref = <b>' + fmtSigned(q.vref, 1, 'V') + '</b> non viene mai superata: il segnale arriva al massimo a ' + fmtSigned(q.amp, 2, 'V') + '. Il confronto dà sempre lo stesso risultato e l\'uscita resta ferma <b>in basso</b>, a −' + rail + '. Abbassa Vref' + more + ' per vederla scattare.';
        }
        if (q.vref <= -q.amp) {
          return 'La soglia Vref = <b>' + fmtSigned(q.vref, 1, 'V') + '</b> è sempre superata: il segnale non scende mai sotto ' + fmtSigned(-q.amp, 2, 'V') + '. Il confronto dà sempre lo stesso risultato e l\'uscita resta ferma <b>in alto</b>, a +' + rail + '. Alza Vref' + more + ' per vederla scattare.';
        }
        const pct = Math.round(q.duty * 100);
        const art = pct === 1 || pct === 8 || pct === 11 || (pct >= 80 && pct <= 89) ? 'l\'' : 'il ';
        return '<b>Comparatore</b>: niente retroazione, quindi lavora tutto il [[guadagno-ad-anello-aperto]], A = 200' + NB + '000. Bastano <b>' + fmtV(vsat / OPAMP.A) + '</b> di differenza per mandare l\'uscita al massimo: è <b>alta</b> (+' + rail + ') quando Vin supera Vref = ' + fmtSigned(q.vref, 1, 'V') + ', <b>bassa</b> (−' + rail + ') quando è sotto. Così un segnale analogico diventa un sì o un no: ora l\'uscita è alta per ' + art + '<b>' + pct + '%</b> del tempo.';
      }
      const g = model.closedLoop(q.mode, q.r1, q.rf, OPAMP.A);
      const want = Math.abs(g) * q.amp;
      if (tc.sat) {
        const fix = q.mode === 'seg' ? 'Abbassa l\'ampiezza o alza l\'alimentazione.' : 'Abbassa il guadagno o l\'ampiezza, oppure alza l\'alimentazione.';
        return 'L\'uscita dovrebbe arrivare a <b>' + fmtV(want) + '</b>, ma il 741 si ferma circa 1 V prima delle alimentazioni: <b>±' + num(vsat, 0) + ' V</b>. I picchi vengono tagliati: è la [[saturazione-uscita|saturazione]]. Mentre l\'uscita è bloccata la retroazione non può più correggere e V+ − V− sale fino a <b>' + fmtV(tc.maxVd) + '</b>. ' + fix;
      }
      let msg;
      if (q.mode === 'inv') {
        msg = '<b>Invertente</b>: il + è a massa e la [[retroazione-negativa]] tiene anche il − a 0 V, la [[massa-virtuale]] (scarto massimo ' + fmtV(tc.maxVd) + '). In Rin scorrono Vin/Rin = ' + si(q.amp / q.r1, 'A', { trim: true }) + ' di picco che, non potendo entrare nell\'operazionale, attraversano Rf. Così Vout = −Rf/Rin · Vin = <b>' + fmtNum(q.gid, 4) + ' × Vin</b>, capovolta.';
      } else if (q.mode === 'non') {
        msg = '<b>Non invertente</b>: il segnale entra nel +. L\'operazionale sposta l\'uscita finché il partitore Rf–Rg riporta sul − la stessa tensione: è il [[cortocircuito-virtuale]] (scarto massimo ' + fmtV(tc.maxVd) + '). Serve Vout = (1 + Rf/Rg) · Vin = <b>' + fmtNum(q.gid, 4) + ' × Vin</b>, in fase. In più il generatore non fornisce corrente: il morsetto + non ne assorbe.';
      } else {
        msg = '<b>[[inseguitore|Inseguitore]]</b>: l\'uscita è collegata al −, quindi Vout = Vin (scarto massimo ' + fmtV(tc.maxVd) + '). Sembra inutile, ma guarda le cariche: il generatore non dà corrente, mentre RL riceve fino a ' + si(tc.peak / OPAMP.RL, 'A', { trim: true }) + ' dall\'operazionale, che la prende dalle alimentazioni. Così un sensore delicato non viene «caricato».';
      }
      // limiti di velocità: si cita il più stretto tra la banda e lo slew rate
      const ng = model.noiseGain(q.mode, q.r1, q.rf);
      const bw = model.bandwidth(OPAMP.GBW, ng);
      const fp = model.fullPower(OPAMP.SR, Math.max(tc.peak, 1e-6));
      if (ng >= 100 || tc.peak >= 5) {
        if (fp < bw) msg += ' Con ' + fmtV(tc.peak) + ' di picco il limite più stretto è lo [[slew-rate]]: oltre circa <b>' + si(fp, 'Hz', { trim: true, sig: 2 }) + '</b> l\'uscita non starebbe più al passo e la sinusoide diventerebbe un triangolo.';
        else msg += ' Il prezzo di tanto guadagno è la banda: con il [[prodotto-guadagno-banda]] di 1' + NB + 'MHz il 741 amplifica bene solo fino a circa <b>' + si(bw, 'Hz', { trim: true }) + '</b>.';
      }
      return msg;
    }

    /* --- aggiornamento --- */
    const series = (fn, t0, t1, n) => {
      const out = [];
      for (let i = 0; i <= n; i++) {
        const t = t0 + (t1 - t0) * i / n;
        out.push([t, fn(t)]);
      }
      return out;
    };
    let tgtKey = '';
    let tgt = null;
    let legendKey = '';

    function frame(dt) {
      const live = dt > 0 && !lab.reduced;
      const d = st.d;
      if (live) {
        const ease = (cur, target) => { const v = EI.approach(cur, target, dt, 9); return Math.abs(v - target) < 1e-4 ? target : v; };
        d.l1 = ease(d.l1, Math.log(st.r1));
        d.lf = ease(d.lf, Math.log(st.rf));
        d.la = ease(d.la, Math.log(st.amp));
        d.vs = ease(d.vs, st.vs);
        d.vref = ease(d.vref, st.vref);
        st.t = (st.t + dt) % (2 * T_SIG);
      } else snap();

      const mode = st.mode;
      const cmp = mode === 'cmp';
      const p = { mode: mode, r1: Math.exp(st.d.l1), rf: Math.exp(st.d.lf), vs: st.d.vs, vref: st.d.vref };
      const amp = Math.exp(st.d.la);
      const vsat = model.vsat(p.vs);
      const tNow = lab.reduced ? T_SIG / 4 : st.t;
      const vinAt = (t) => amp * Math.sin(TWO_PI * F_SIG * t);
      const r = model.solve(p, vinAt(tNow));
      const cyc = model.cycle(p, amp, 240);

      // valori scelti: riassunto stabile per spiegazione e sfide
      const key = [mode, st.r1, st.rf, st.amp, st.vs, st.vref].join('|');
      if (key !== tgtKey) {
        tgtKey = key;
        const tp = { mode: mode, r1: st.r1, rf: st.rf, vs: st.vs, vref: st.vref };
        const tc = model.cycle(tp, st.amp, 360);
        const q = { mode: mode, r1: st.r1, rf: st.rf, amp: st.amp, vs: st.vs, vref: st.vref, gid: model.ideal(mode, st.r1, st.rf), peak: tc.peak, sat: tc.sat, maxVd: tc.maxVd, duty: model.duty(st.amp, st.vref) };
        // sfida "rientro": prima in saturazione, poi lineare con la stessa ampiezza e alimentazione ma meno guadagno
        if (!cmp && q.sat) st.satMark = { mode: mode, amp: st.amp, vs: st.vs, g: Math.abs(q.gid) };
        else if (!cmp && st.satMark && mode === st.satMark.mode && st.amp === st.satMark.amp && st.vs === st.satMark.vs && Math.abs(q.gid) < st.satMark.g) st.back = true;
        q.back = st.back;
        tgt = { q: q, tc: tc, msg: explainFor(q, tc) };
      }
      tgt.q.back = st.back;

      /* correnti istantanee nei rami */
      const now = S.now;
      now.vin = r.vin;
      now.vout = r.vout;
      now.vn = cmp ? p.vref : r.vn;
      now.vref = p.vref;
      now.iIn = mode === 'inv' ? (r.vin - r.vn) / p.r1 : 0;
      now.iF = mode === 'inv' || mode === 'non' ? (r.vn - r.vout) / p.rf : 0;
      now.iG = mode === 'non' ? r.vn / p.r1 : 0;
      now.iL = r.vout / OPAMP.RL;
      now.iO = now.iL - now.iF;
      now.iP = Math.max(0, now.iO);
      now.iN = Math.max(0, -now.iO);

      /* schema: fili colorati dalla tensione, cariche, bagliori */
      for (const w of S.wires) {
        const v = w.key === 'vin' ? now.vin : w.key === 'vn' ? now.vn : w.key === 'vout' ? now.vout : w.key === 'vref' ? now.vref
          : w.key === 'vs+' ? p.vs : w.key === 'vs-' ? -p.vs : 0;
        w.el.style.stroke = EI.vcolor(v, p.vs);
      }
      for (const f of S.flows) {
        f.f.set(EI.speedFor(now[f.key], IMAX));
        f.f.step(live ? dt : 0);
      }
      const atTop = r.sat && r.vout > 0;
      const atBot = r.sat && r.vout < 0;
      st.hitP = live ? EI.approach(st.hitP, atTop ? 1 : 0, dt, 12) : (atTop ? 1 : 0);
      st.hitN = live ? EI.approach(st.hitN, atBot ? 1 : 0, dt, 12) : (atBot ? 1 : 0);
      S.hitP.style.opacity = (st.hitP * 0.75).toFixed(3);
      S.hitN.style.opacity = (st.hitN * 0.75).toFixed(3);
      S.railP.style.fill = EI.mix('#a9c3b9', P.t1, 0.55 + 0.45 * st.hitP);
      S.railN.style.fill = EI.mix('#a9c3b9', P.t4, 0.55 + 0.45 * st.hitN);
      if (S.band) {
        const broken = r.sat;
        if (broken !== S.broken) {
          S.broken = broken;
          S.band.classList.toggle('off', broken);
          S.chev.classList.toggle('off', broken);
          S.fbLabel.classList.toggle('off', broken);
          S.bridge.line.classList.toggle('off', broken);
          S.bridge.sym.classList.toggle('off', broken);
          S.bridge.sym.textContent = broken ? '≠' : '≈';
        }
      }
      const small = amp < 0.1;
      S.vinTag.textContent = small ? fmtSigned(r.vin * 1000, 1, 'mV') : fmtSigned(r.vin, 2, 'V');
      S.voutTag.textContent = fmtSigned(r.vout, 2, 'V');
      S.voutTag.style.fill = r.vout >= 0 ? P.t1 : P.t4;

      /* oscilloscopio */
      // 30% di margine oltre le alimentazioni: i titoli degli assi non toccano le linee tratteggiate
      const yMax = 1.3 * p.vs;
      const railTxt = num(st.vs, 0) + NB + 'V';
      let k = 1;
      if (amp < 0.05 * yMax) MAG.forEach((m) => { if (amp * m <= 0.55 * yMax) k = m; });
      const showIdeal = !cmp && cyc.sat;
      const lk = k + '|' + showIdeal;
      if (lk !== legendKey) {
        legendKey = lk;
        const items = [{ label: k > 1 ? 'Vin × ' + k : 'Vin', color: 'var(--trace-2)' }, { label: 'Vout', color: 'var(--trace-1)' }];
        if (showIdeal) items.push({ label: 'Vout senza limiti', color: '#7d918a' });
        scope.setLegend(items);
      }
      const vinK = (t) => k * vinAt(t);
      const voutF = (t) => model.solve(p, vinAt(t)).vout;
      // nell'inseguitore Vout copre Vin: Vin resta visibile come un alone attorno alla traccia
      const halo = mode === 'seg' && k === 1;
      const vinSt = halo ? { color: P.t2, width: 7, alpha: 0.45, glow: false } : { color: P.t2, width: 2 };
      scope.opts.x.div = scope.w < 520 ? 4 : 8; // sul telefono una tacca al secondo
      scope.setRange('y', -yMax, yMax);
      scope.clear();
      scope.band(vsat, p.vs, { color: P.t1, alpha: 0.07 });
      scope.band(-p.vs, -vsat, { color: P.t4, alpha: 0.07 });
      scope.hline(p.vs, { color: P.t1, alpha: 0.55 });
      scope.hline(-p.vs, { color: P.t4, alpha: 0.55 });
      railLabels(scope, p.vs, railTxt, P.t1, P.t4);
      if (showIdeal) scope.line((t) => model.solve(p, vinAt(t)).vlin, { color: '#7d918a', width: 1.4, dash: [5, 5], glow: false, alpha: 0.9 });
      if (lab.reduced) {
        scope.line(vinK, vinSt);
        scope.line(voutF, { color: P.t1, width: 2.4, samples: 480 });
      } else {
        // traccia "con persistenza": il fascio ridisegna l'onda, il resto sbiadisce
        scope.line(vinK, { color: P.t2, width: halo ? 7 : 1.5, alpha: halo ? 0.16 : 0.28, glow: false });
        scope.line(voutF, { color: P.t1, width: 1.7, alpha: 0.28, glow: false, samples: 480 });
        const n = Math.max(2, Math.ceil(tNow / (2 * T_SIG) * 320));
        scope.line(series(vinK, 0, tNow, n), vinSt);
        scope.line(series(voutF, 0, tNow, n), { color: P.t1, width: 2.4 });
        scope.vline(tNow, { color: P.ink, alpha: 0.2, dash: [3, 4] });
      }
      scope.point(tNow, vinK(tNow), { color: P.t2, r: 3.5, ring: false });
      scope.point(tNow, r.vout, { color: P.t1, r: 4.5 });

      /* transcaratteristica */
      const xr = cmp ? Math.max(amp * 1.25, Math.abs(p.vref) + amp * 0.35) : amp * 1.25;
      trans.setRange('x', -xr, xr);
      trans.setRange('y', -yMax, yMax);
      trans.clear();
      trans.band(vsat, p.vs, { color: P.t1, alpha: 0.07 });
      trans.band(-p.vs, -vsat, { color: P.t4, alpha: 0.07 });
      trans.hline(p.vs, { color: P.t1, alpha: 0.5 });
      trans.hline(-p.vs, { color: P.t4, alpha: 0.5 });
      railLabels(trans, p.vs, railTxt, P.t1, P.t4);
      if (cmp) trans.vline(p.vref, { color: P.t3, alpha: 0.85, label: 'Vref' });
      else {
        const g = model.closedLoop(mode, p.r1, p.rf, OPAMP.A);
        trans.line((x) => g * x, { color: '#7d918a', width: 1.2, dash: [5, 5], glow: false, alpha: 0.8 });
      }
      trans.line((x) => model.solve(p, x).vout, { color: P.t1, width: 1.6, alpha: 0.4, glow: false });
      trans.line(series((x) => model.solve(p, x).vout, -amp, amp, 240), { color: P.t1, width: 3 });
      trans.point(r.vin, r.vout, { color: P.t2, r: 5 });

      /* strumenti */
      const q = tgt.q;
      if (cmp) {
        rGi.text('200' + NB + '000');
        rGm.text(fmtSigned(st.vref, 1, 'V'));
        pkOpts.max = vsat || 1;
        rPk.set(Math.abs(r.vout));
        rPk.text(fmtSigned(r.vout, 2, 'V'));
        rBw.text(num(q.duty * 100, 0) + NB + '%');
        rSt.text(r.vout > 0 ? 'Alta' : 'Bassa');
        rSt.state(r.vout > 0 ? 'ok' : '');
        rSt.el.style.setProperty('--rc', r.vout > 0 ? 'var(--trace-1)' : 'var(--trace-4)');
        rVd.state('');
      } else {
        rGi.text(fmtNum(q.gid, 4));
        rGm.text(fmtNum(cyc.gain, 6));
        pkOpts.max = vsat || 1;
        rPk.set(cyc.peak);
        rBw.text(si(model.bandwidth(OPAMP.GBW, model.noiseGain(mode, st.r1, st.rf)), 'Hz'));
        rSt.text(cyc.sat ? 'Saturato' : 'Lineare');
        rSt.state(cyc.sat ? 'warn' : 'ok');
        rSt.el.style.setProperty('--rc', cyc.sat ? 'var(--trace-4)' : 'var(--trace-1)');
        rVd.state(Math.abs(r.vd) < 1e-3 ? 'ok' : 'warn');
      }
      rVd.text(si(r.vd, 'V', { sig: 3, signed: true }));
      rPk.el.dataset.state = cyc.sat && !cmp ? 'warn' : '';

      lab.explain(tgt.msg);
      return q;
    }

    lab.loop((dt) => {
      const q = frame(dt);
      lab.check(q);
    });
    setMode('inv');
  }

  /* ---------- illustrazioni ---------- */

  const L = (d, cls, style) => '<path class="' + (cls || 'f-line') + '" d="' + d + '"' + (style ? ' style="' + style + '"' : '') + '/>';
  const T = (x, y, txt, cls, anchor, style) => '<text class="' + (cls || 'f-text') + '" x="' + x + '" y="' + y + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + (style ? ' style="' + style + '"' : '') + '>' + txt + '</text>';
  const C = (x, y, r, cls) => '<circle class="' + (cls || 'f-paper') + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>';
  const R = (x, y, w, h, cls, rx) => '<rect class="' + (cls || 'f-paper') + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx || 0) + '"/>';
  const ARROW = (x, y, ang, cls) => '<path class="' + (cls || 'f-fill') + '" transform="translate(' + x + ' ' + y + ') rotate(' + ang + ')" d="M0 0L-7 -3.4L-7 3.4Z"/>';
  const NODE = (x, y) => C(x, y, 3.2, 'f-fill');

  // Transistor con la base a sinistra (k = 1) o a destra (k = -1). Con pnp la freccia entra.
  function bjtGlyph(x, y, k, pnp) {
    const ex = x + 14 * k;
    let out = L('M' + x + ' ' + (y - 12) + 'V' + (y + 12), 'f-line', 'stroke-width:3.4');
    out += L('M' + x + ' ' + (y - 6) + 'L' + ex + ' ' + (y - 16) + 'M' + x + ' ' + (y + 6) + 'L' + ex + ' ' + (y + 16));
    if (pnp) out += ARROW(x + 3 * k, y - 8.1, Math.atan2(10, -14 * k) * 180 / Math.PI);
    else out += ARROW(x + 12 * k, y + 14.6, Math.atan2(10, 14 * k) * 180 / Math.PI);
    return out;
  }

  function insideFigure() {
    const W = 520;
    const H = 438;
    let g = '';
    // tre zone, una per stadio
    g += R(20, 42, 194, 176, 'operazionale-zone', 10) + R(222, 42, 116, 176, 'operazionale-zone', 10) + R(346, 42, 160, 176, 'operazionale-zone', 10);
    // alimentazioni
    g += L('M30 34H506') + L('M30 226H506');
    g += T(24, 38, '+V', 'f-mono', 'end') + T(24, 230, '−V', 'f-mono', 'end');
    g += T(506, 24, '+V · piedino 7', 'f-small', 'end') + T(506, 244, '−V · piedino 4', 'f-small', 'end');

    // 1 · stadio differenziale: due transistor con gli emettitori uniti
    g += bjtGlyph(92, 128, 1) + bjtGlyph(156, 128, -1);
    g += L('M62 128H92M156 128H180');
    g += L('M106 112V72M142 112V72M106 144V160M142 144V160M106 160H142M124 160V174M124 198V226');
    g += C(124, 186, 12) + L('M124 179V188') + ARROW(124, 194, 90);
    g += R(88, 50, 72, 22, 'f-paper', 4) + T(124, 65, 'specchio', 'f-small', 'middle') + L('M124 50V34');
    g += C(62, 128, 3.5) + C(180, 128, 3.5);
    g += T(62, 152, 'IN+', 'f-mono', 'middle') + T(62, 167, 'piedino 3', 'f-small', 'middle');
    g += T(180, 152, 'IN−', 'f-mono', 'middle') + T(180, 167, 'piedino 2', 'f-small', 'middle');
    g += L('M142 86H232') + NODE(142, 86);

    // 2 · stadio di guadagno con il condensatore di compensazione (effetto Miller)
    g += L('M232 86V128H250');
    g += '<path class="f-paper" d="M250 104L250 152L298 128Z"/>';
    g += L('M298 128H346');
    g += L('M322 128V70H282M274 70H232V86', 'f-accent') + L('M282 58V82M274 58V82', 'f-accent', 'stroke-width:3.2');
    g += T(278, 52, 'Cc ≈ 30 pF', 'f-accent-text', 'middle');
    g += NODE(232, 86) + NODE(322, 128);

    // 3 · uscita push-pull: un NPN spinge, un PNP tira
    g += L('M346 128V160H372');
    g += L('M372 34V48') + C(372, 58, 10) + L('M372 52V60') + ARROW(372, 65, 90) + L('M372 68V102');
    g += '<path class="f-paper" d="M364 102H380L372 114Z"/>' + L('M364 114H380');
    g += '<path class="f-paper" d="M364 132H380L372 144Z"/>' + L('M364 144H380');
    g += L('M372 114V132M372 144V160');
    g += bjtGlyph(400, 96, 1) + bjtGlyph(400, 160, 1, true);
    g += L('M372 96H400M372 160H400M414 80V34M414 112V144M414 176V226M414 128H462');
    g += NODE(372, 96) + NODE(372, 160) + NODE(414, 128) + C(466, 128, 3.5);
    g += T(466, 114, 'OUT', 'f-mono', 'middle') + T(466, 150, 'piedino 6', 'f-small', 'middle');

    // il segnale attraversa i tre stadi
    g += '<path class="operazionale-flow" d="M142 86H232V128H250M298 128H346V160H372M414 128H462"/>';

    // didascalie degli stadi
    g += T(124, 262, '1 · Differenziale', 'f-text', 'middle') + T(124, 278, 'confronta V+ e V−', 'f-small', 'middle');
    g += T(280, 262, '2 · Guadagno', 'f-text', 'middle') + T(280, 278, 'amplifica molto', 'f-small', 'middle');
    g += T(426, 262, '3 · Uscita push-pull', 'f-text', 'middle') + T(426, 278, 'spinge e tira', 'f-small', 'middle');
    g += T(260, 302, 'In tutto una ventina di transistor e un solo condensatore.', 'f-small', 'middle');

    // il contenitore DIP-8 visto dall'alto
    g += L('M20 316H500', 'f-thin');
    g += T(260, 338, 'Il contenitore DIP-8, visto dall\'alto', 'f-small', 'middle');
    const pinsY = [356, 374, 392, 410];
    const left = ['azzeramento offset', 'IN− invertente', 'IN+ non invertente', '−V'];
    const right = ['non collegato', '+V', 'OUT uscita', 'azzeramento offset'];
    g += R(214, 346, 92, 80, 'f-paper', 6) + L('M252 346A8 8 0 0 0 268 346') + C(224, 355, 2.6, 'f-fill');
    pinsY.forEach((y, i) => {
      g += R(200, y - 4, 14, 8, 'f-soft', 1.5) + R(306, y - 4, 14, 8, 'f-soft', 1.5);
      g += '<text class="f-small" x="194" y="' + (y + 4) + '" text-anchor="end">' + left[i] + ' · <tspan class="f-mono">' + (i + 1) + '</tspan></text>';
      g += '<text class="f-small" x="326" y="' + (y + 4) + '"><tspan class="f-mono">' + (8 - i) + '</tspan> · ' + right[i] + '</text>';
    });
    g += '<path class="f-paper" d="M232 362L232 404L270 383Z"/>';
    g += L('M214 374H232M214 392H232M270 383H288V392H306');
    g += T(240, 378, '−', 'f-mono', 'middle') + T(240, 397, '+', 'f-mono', 'middle');
    return '<svg class="operazionale-fig" viewBox="0 0 ' + W + ' ' + H + '">' + g + '</svg>';
  }

  function feedbackFigure() {
    const W = 520;
    const H = 296;
    let g = '';
    // catena diretta: ingresso, nodo che sottrae, amplificatore A
    g += T(16, 85, 'Vin', 'f-text');
    g += L('M46 80H102') + ARROW(110, 80, 0);
    g += C(128, 80, 18) + T(128, 86, 'Σ', 'f-title', 'middle', 'font-size:17px');
    g += T(102, 64, '+', 'f-title', 'middle') + T(142, 116, '−', 'f-title', 'start', 'font-size:18px');
    g += L('M146 80H195') + ARROW(202, 80, 0) + T(174, 70, 'e', 'f-accent-text', 'middle');
    g += R(202, 52, 100, 56, 'f-accent-soft', 10) + T(252, 80, 'A', 'f-title', 'middle', 'font-size:22px') + T(252, 99, '≈ 200' + NB + '000', 'f-mono', 'middle');
    g += L('M302 80H409') + ARROW(416, 80, 0) + NODE(380, 80) + T(422, 85, 'Vout', 'f-text');
    g += T(357, 66, 'Vout = A · e', 'f-mono', 'middle');
    // anello di retroazione: una parte dell'uscita torna indietro e si sottrae
    g += L('M380 80V178H309') + ARROW(303, 178, 180);
    g += R(202, 152, 100, 52, 'f-paper', 10) + T(252, 177, 'β', 'f-title', 'middle', 'font-size:22px') + T(252, 196, '= 0,1', 'f-mono', 'middle');
    g += L('M202 178H128V105') + ARROW(128, 99, -90);
    g += T(166, 170, 'β · Vout', 'f-mono', 'middle');
    g += T(116, 146, 'retroazione', 'f-accent-text', 'end');
    g += T(390, 132, 'β = Rg/(Rg + Rf)', 'f-small');
    g += '<path class="operazionale-flow" d="M46 80H102M146 80H195M302 80H409"/>';
    g += '<path class="operazionale-flow" d="M380 80V178H309M202 178H128V105"/>';
    // A cambia molto, G quasi per niente
    g += T(260, 230, 'Con β = 0,1, G resta quasi 10 anche se A varia di 20 volte:', 'f-small', 'middle');
    [['50' + NB + '000', '9,998'], ['200' + NB + '000', '9,9995'], ['1' + NB + '000' + NB + '000', '9,9999']].forEach((c, i) => {
      const x = 22 + i * 164;
      g += R(x, 240, 148, 48, 'f-soft', 10);
      g += T(x + 74, 259, 'A = ' + c[0], 'f-mono', 'middle') + T(x + 74, 279, 'G = ' + c[1], 'f-accent-text', 'middle');
    });
    // il disegno comincia a y = 52: la cornice parte poco sopra, senza una fascia vuota
    return '<svg class="operazionale-fig" viewBox="0 40 ' + W + ' ' + (H - 40) + '">' + g + '</svg>';
  }

  /* ---------- capitolo ---------- */

  EI.chapter({
    id: 'operazionale',
    icon: 'opamp',
    minutes: 15,
    summary: 'Un [[amplificatore-operazionale]] moltiplica la differenza tra i suoi due ingressi per un numero enorme, circa 200' + NB + '000 nel classico 741: usato così, basta un soffio per mandare l\'uscita contro le alimentazioni. Con la [[retroazione-negativa]] una parte dell\'uscita torna all\'ingresso e il guadagno lo decidono due resistenze, preciso e stabile. Così lo stesso chip diventa amplificatore, separatore, mixer o [[comparatore]].',
    keywords: ['amplificatore-operazionale', 'retroazione-negativa', 'cortocircuito-virtuale', 'massa-virtuale', 'guadagno-ad-anello-aperto', 'saturazione-uscita', 'comparatore', 'prodotto-guadagno-banda'],
    model: model,
    css: [
      '.operazionale-sch { transition: opacity .4s var(--ease); }',
      '.operazionale-fb { fill: none; stroke: var(--trace-3); stroke-width: 14; stroke-linecap: round; stroke-linejoin: round; opacity: .17; transition: opacity .35s ease, stroke .35s ease; }',
      '.operazionale-fb.off { stroke: var(--trace-4); opacity: .08; }',
      '.operazionale-chev { fill: none; stroke: var(--trace-3); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; transition: stroke .35s ease, opacity .35s ease; }',
      '.operazionale-chevs.off .operazionale-chev { stroke: var(--trace-4); opacity: .45; }',
      '.operazionale-fb-label { fill: var(--trace-3); font: 800 10px var(--mono); letter-spacing: .16em; transition: fill .35s ease; }',
      '.operazionale-fb-label.off { fill: var(--trace-4); }',
      '.operazionale-bridge { fill: none; stroke: var(--trace-3); stroke-width: 1.8; stroke-dasharray: 3 3; transition: stroke .25s ease; }',
      '.operazionale-bridge.off { stroke: var(--trace-4); }',
      '.operazionale-bridge-sym { fill: var(--trace-3); font: 800 14px var(--mono); }',
      '.operazionale-bridge-sym.off { fill: var(--trace-4); }',
      '.operazionale-hit { opacity: 0; filter: blur(7px); }',
      '.operazionale-hit.pos { fill: var(--trace-1); }',
      '.operazionale-hit.neg { fill: var(--trace-4); }',
      '.operazionale-tag { fill: var(--trace-2); font: 700 11.5px var(--mono); font-variant-numeric: tabular-nums; }',
      '.operazionale-tag.rail { font-size: 11px; }',
      '.operazionale-tag.ref { fill: var(--trace-3); }',
      '.ei-sym-label.operazionale-name { fill: #fff; font-weight: 800; }',
      '.ei-sym-label.operazionale-val { fill: var(--trace-2); font: 700 11.5px var(--mono); }',
      '.operazionale-chip { fill: var(--scope-text); font: 700 9px var(--mono); opacity: .8; }',
      '.operazionale-term { fill: var(--scope-bg); stroke: var(--sym); stroke-width: 2.2; }',
      '.operazionale-eq { font: 700 14px var(--font); }',
      '.operazionale-eq .sym { fill: #fff; }',
      '.operazionale-eq .num { fill: var(--trace-2); font-family: var(--mono); font-size: 13px; }',
      '.operazionale-eq .note { fill: var(--scope-text); font-weight: 600; }',
      '.operazionale-legend-title { fill: var(--scope-text); font: 800 9px var(--mono); letter-spacing: .12em; }',
      '.operazionale-legend-tick { fill: var(--scope-text); font: 700 10px var(--mono); }',
      // core: style.css ridefinisce --fill sul cursore e la barra resta sempre a metà; qui la si fa ereditare
      '.operazionale-lab .ei-slider input[type="range"] { --fill: inherit; }',
      '.ei-plots.operazionale-plots { grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); }',
      '@media (max-width: 900px) { .ei-plots.operazionale-plots { grid-template-columns: 1fr; } }',
      '@media (max-width: 640px) {',
      '  .ei-stage .operazionale-eq { font-size: 16px; }',
      '  .ei-stage .operazionale-eq .num { font-size: 15px; }',
      '  .ei-stage .operazionale-tag { font-size: 16px; }',
      '  .ei-stage .operazionale-tag.rail { font-size: 15px; }',
      '  .ei-stage .operazionale-fb-label { font-size: 13px; }',
      '  .ei-stage .operazionale-bridge-sym { font-size: 18px; }',
      '  .ei-stage .operazionale-chip { font-size: 12px; }',
      '  .ei-stage .ei-sym-label.operazionale-val { font-size: 16px; }',
      '}',
      // telefoni stretti (320-359 px): le etichette degli strumenti stanno su una riga senza puntini
      '@media (max-width: 359px) {',
      '  .operazionale-lab .ei-readout { padding-inline: 9px; }',
      '  .operazionale-lab .ei-readout-label { letter-spacing: .02em; }',
      '}',
      '.operazionale-nobr { white-space: nowrap; }',
      '.ei-figure .operazionale-zone { fill: color-mix(in srgb, var(--ei-bright) 6%, transparent); stroke: var(--ei-line); stroke-width: 1; stroke-dasharray: 4 4; }',
      '.ei-figure .operazionale-flow { fill: none; stroke: var(--ei-bright); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 2 12; animation: operazionale-dash 1.2s linear infinite; }',
      '@keyframes operazionale-dash { to { stroke-dashoffset: -28; } }',
      // sul telefono le figure scendono a circa il 63%: scritte più grandi, dove il disegno ha spazio
      '@media (max-width: 640px) {',
      '  .ei-figure .operazionale-fig .f-small { font-size: 13.5px; }',
      '  .ei-figure .operazionale-fig .f-text { font-size: 15px; }',
      '  .ei-figure .operazionale-fig .f-mono { font-size: 13.5px; }',
      '  .ei-figure .operazionale-fig .f-accent-text { font-size: 14.5px; }',
      '}',
      '@media (prefers-reduced-motion: reduce) {',
      '  .operazionale-sch { transition: none; }',
      '  .ei-figure .operazionale-flow { animation: none; }',
      '}',
    ].join('\n'),
    lab: {
      title: 'Il guadagno si sceglie con due resistenze',
      intro: 'Scegli una configurazione e sposta i cursori: le cariche scorrono in Rin e Rf al ritmo del segnale, rallentato a mezzo ciclo al secondo. Nell\'<b>invertente</b> guarda il nodo tra Rin e Rf: resta grigio, a 0 V, mentre ingresso e uscita oscillano. Poi alza il guadagno finché l\'onda sbatte contro le alimentazioni: la fascia azzurra della retroazione diventa rosa, perché con l\'uscita bloccata l\'anello non corregge più.',
      svgLabel: 'Schema: amplificatore operazionale con generatore, resistenze, carico e alimentazioni',
      mount: mount,
    },
    how: [
      'Un [[amplificatore-operazionale|operazionale]] ha due ingressi, il non invertente (+) e l\'invertente (−), e un\'uscita. Amplifica solo la differenza: Vout = A · (V+ − V−), con un [[guadagno-ad-anello-aperto]] A enorme, circa 200' + NB + '000 nel 741. Gli ingressi assorbono pochissima corrente (nel 741 la resistenza d\'ingresso è di circa 2 MΩ) e l\'uscita, con una resistenza interna di circa 75 Ω, regge un carico senza cedere.',
      'Da solo è ingestibile: con A = 200' + NB + '000 bastano 0,1 mV di differenza per chiedere 20 V all\'uscita, che finisce contro le alimentazioni. E A cambia da un chip all\'altro e con la temperatura. Senza retroazione l\'operazionale è un [[comparatore]]: uscita al massimo o al minimo.',
      'Il trucco è la [[retroazione-negativa]]: una parte dell\'uscita torna sul morsetto −. Se l\'uscita sale troppo, sale anche V−: la differenza V+ − V− cala e l\'uscita viene riportata giù. Se scende troppo, succede il contrario. Il circuito si assesta da solo dove V+ e V− sono quasi uguali.',
      'Ne nascono due regole d\'oro, valide finché c\'è retroazione e l\'uscita non satura: V+ = V− (il [[cortocircuito-virtuale]]) e nessuna corrente entra negli ingressi. Con queste due frasi si calcola quasi ogni circuito.',
      'Amplificatore invertente: il + è a massa, quindi anche il − sta a 0 V, la [[massa-virtuale]]. La corrente Vin/Rin non può entrare nell\'operazionale e passa tutta in Rf: Vout = −Rf/Rin · Vin. Con più ingressi, ognuno con la sua resistenza, le correnti si sommano: è il cuore di un mixer audio.',
      'Amplificatore non invertente: il segnale entra nel + e il partitore Rf–Rg riporta sul − una frazione dell\'uscita. Perché V− sia uguale a Vin serve Vout = (1 + Rf/Rg) · Vin, in fase. Con Rf = 0 e senza Rg diventa l\'[[inseguitore]]: guadagno 1, ma il generatore non fornisce corrente.',
      'I limiti veri: l\'uscita non supera le alimentazioni (il 741 si ferma 1–2 V prima, gli operazionali rail-to-rail quasi a contatto: è la [[saturazione-uscita|saturazione]]); il [[prodotto-guadagno-banda]] è circa 1 MHz, quindi con guadagno 100 la banda scende a 10 kHz; lo [[slew-rate]] di 0,5 V/µs frena i segnali grandi e veloci.',
    ],
    formulas: [
      {
        name: 'Amplificatore invertente',
        expr: '<var>G</var> = <span class="frac"><span><var>V</var><sub>out</sub></span><span><var>V</var><sub>in</sub></span></span> = −<span class="frac"><span><var>R</var><sub>f</sub></span><span><var>R</var><sub>in</sub></span></span>',
        legend: [['R<sub>f</sub>', 'resistenza di retroazione, dall\'uscita al morsetto −'], ['R<sub>in</sub>', 'resistenza d\'ingresso, dal segnale al morsetto −'], ['−', 'il segno meno: l\'uscita è capovolta rispetto all\'ingresso']],
        note: 'Esempio: 100 kΩ e 10 kΩ danno G = −10. Con più ingressi ottieni il sommatore: V<sub>out</sub> = −R<sub>f</sub> · (V<sub>1</sub>/R<sub>1</sub> + V<sub>2</sub>/R<sub>2</sub> + …).',
      },
      {
        name: 'Amplificatore non invertente',
        expr: '<var>G</var> = 1 + <span class="frac"><span><var>R</var><sub>f</sub></span><span><var>R</var><sub>g</sub></span></span>',
        legend: [['R<sub>g</sub>', 'resistenza dal morsetto − verso massa'], ['1', 'anche con R<sub>f</sub> = 0 il guadagno resta 1: è l\'[[inseguitore]]']],
        note: 'Esempio: R<sub>f</sub> = 10 kΩ e R<sub>g</sub> = 1 kΩ danno G = 11, in fase con l\'ingresso.',
      },
      {
        name: 'Retroazione negativa',
        expr: '<var>G</var> = <span class="frac"><span><var>A</var></span><span>1 + <var>A</var> · <var>β</var></span></span> ≈ <span class="frac"><span>1</span><span><var>β</var></span></span>',
        legend: [['A', '[[guadagno-ad-anello-aperto]] dell\'operazionale (circa 200' + NB + '000 nel 741)'], ['β', 'frazione dell\'uscita riportata all\'ingresso, nel non invertente R<sub>g</sub>/(R<sub>g</sub> + R<sub>f</sub>)']],
        note: 'Con A = 200' + NB + '000 e β = 0,1: G = 9,9995. Se A si dimezza, G scende a 9,9990: cambia di 5 parti su centomila.',
      },
    ],
    figures: [
      {
        title: 'Dentro il µA741',
        svg: insideFigure(),
        caption: 'Tre stadi su un solo chip. La coppia differenziale confronta i due ingressi; lo stadio di guadagno amplifica, e il condensatore Cc da circa 30 pF lo rallenta quanto basta perché con la retroazione non oscilli; lo stadio push-pull spinge o assorbe la corrente del carico. Sotto, i piedini del contenitore <span class="operazionale-nobr">DIP-8</span>: l\'1 e il 5 servono ad azzerare l\'offset, il piccolo squilibrio dei transistor d\'ingresso che equivale a circa 1 mV tra V+ e V−.',
        alt: 'Schema semplificato del 741: stadio differenziale, stadio di guadagno con condensatore di compensazione, uscita push-pull; sotto, la piedinatura del contenitore a otto piedini',
      },
      {
        title: 'La retroazione in un disegno',
        svg: feedbackFigure(),
        caption: 'L\'amplificatore A vede solo l\'errore e = Vin − β · Vout. Con A enorme basta un errore minuscolo, così l\'uscita si sistema dove β · Vout ≈ Vin, cioè <span class="operazionale-nobr">G ≈ 1/β</span>: il guadagno lo decidono le resistenze, non i transistor.',
        alt: 'Schema a blocchi della retroazione negativa: nodo sommatore, amplificatore A, rete di retroazione beta e tre esempi numerici',
      },
    ],
    history: {
      text: [
        'Tutto comincia con un problema del telefono. Negli anni Venti le linee a lunga distanza usano molti amplificatori a valvole in fila, i ripetitori, e ognuno aggiunge un po\' di distorsione. Harold S. Black, giovane ingegnere dei Bell Labs, ci lavora da tempo quando, una mattina d\'agosto del 1927, attraversando l\'Hudson in traghetto per andare al lavoro, annota l\'idea su una pagina del New York Times: riportare all\'ingresso una parte dell\'uscita, capovolta. Si perde guadagno, ma la distorsione cala nella stessa proporzione.',
        'Il brevetto, depositato nel 1928, arriva solo nel 1937. Intanto la retroazione conquista i calcolatori analogici: nel 1941 Karl D. Swartzel Jr., anche lui ai Bell Labs, deposita il brevetto di un «amplificatore sommatore» a valvole, e durante la guerra circuiti di questo tipo calcolano il tiro della contraerea. Nel 1947 un articolo di John R. Ragazzini e due colleghi della Columbia University li chiama «amplificatori operazionali», perché nei calcolatori eseguono operazioni matematiche: somme, integrali, derivate.',
        'Nel 1952 la George A. Philbrick Researches mette in vendita il K2-W, considerato il primo operazionale commerciale: un modulo a innesto con due doppi triodi. Poi arriva il silicio. Alla Fairchild Bob Widlar progetta nel 1963 il µA702, il primo operazionale integrato su un solo chip, e poi il µA709 (1965), il primo a vendere in grandi quantità; nel 1967, passato alla National Semiconductor, crea l\'LM101, che per restare stabile chiede un solo condensatore esterno da 30 pF.',
        'Nel 1968 Dave Fullagar, alla Fairchild, porta quel condensatore dentro il chip: nasce il µA741, con la compensazione interna. Si collega e funziona, senza componenti in più per la stabilità. Diventa lo standard dell\'elettronica analogica, e dopo più di cinquant\'anni è ancora in produzione.',
      ],
      events: [
        { year: 1927, title: 'La retroazione negativa', who: 'Harold S. Black, Bell Labs', text: 'Su un traghetto diretto a Manhattan annota l\'idea su una pagina del New York Times: rinunciare a un po\' di guadagno per avere un amplificatore preciso e senza distorsione.' },
        { year: 1941, title: 'L\'amplificatore sommatore', who: 'Karl D. Swartzel Jr., Bell Labs', text: 'Deposita il brevetto di un amplificatore a valvole che somma più tensioni: l\'antenato diretto dell\'operazionale.' },
        { year: 1947, title: 'Il nome «operazionale»', who: 'John R. Ragazzini, Robert H. Randall, Frederick A. Russell', text: 'Nei calcolatori analogici questi amplificatori eseguono operazioni matematiche: somme, integrali, derivate.' },
        { year: 1952, title: 'Il primo operazionale in vendita', who: 'George A. Philbrick Researches', text: 'Il K2-W: due doppi triodi in un modulo a innesto, pensato per i calcolatori analogici.' },
        { year: 1963, title: 'L\'operazionale diventa un chip', who: 'Bob Widlar, Fairchild', text: 'Il µA702 mette l\'operazionale su un solo chip di silicio. Il suo successore, il µA709 del 1965, è il primo operazionale integrato di grande successo.' },
        { year: 1968, title: 'Il µA741', who: 'Dave Fullagar, Fairchild', text: 'Il condensatore di compensazione da 30 pF entra nel chip: basta collegarlo e funziona. Diventa lo standard dell\'analogico.' },
      ],
    },
    fun: 'Il brevetto di Black arrivò dopo più di nove anni: l\'idea di buttare via guadagno per migliorare un amplificatore sembrava così strana che, raccontò lui stesso, la sua domanda fu trattata come quella di una macchina a moto perpetuo.',
    uses: 'Preamplificatori per microfoni e chitarre, mixer e amplificatori per cuffie, filtri attivi, la lettura di sensori deboli come termocoppie, estensimetri e fotodiodi, gli elettrocardiografi, i comparatori di termostati e caricabatterie, l\'amplificatore d\'errore dentro ogni regolatore di tensione, i convertitori analogico-digitali.',
    links: [
      { href: '#bjt', section: 'Questa sezione', title: 'Il transistor bipolare: i mattoni dentro il 741' },
      { href: '#rc-filtri', section: 'Questa sezione', title: 'R e C attorno all\'operazionale: i filtri attivi' },
      { href: '#oscillatori', section: 'Questa sezione', title: 'Il timer 555 ha dentro due comparatori' },
      { href: '#alimentatore', section: 'Questa sezione', title: 'Il regolatore tiene fermi i 5 V con la retroazione' },
      { href: '../elettronica-base/index.html#misure', section: 'Elettronica base', title: 'Oscilloscopio e multimetro: come si misurano Vin e Vout' },
    ],
    glossary: {
      'amplificatore-operazionale': { term: 'Amplificatore operazionale', def: 'Amplificatore integrato con due ingressi (+ e −) e un\'uscita, che moltiplica la loro differenza per un guadagno enorme, da centomila a oltre un milione. Si usa quasi sempre con la retroazione negativa: il guadagno lo decidono le resistenze.' },
      'retroazione-negativa': { term: 'Retroazione negativa', def: 'Riportare all\'ingresso una parte dell\'uscita, sottraendola al segnale. Riduce il guadagno ma lo rende preciso e stabile, e abbassa la distorsione. L\'idea è di Harold Black, nel 1927.' },
      'guadagno-ad-anello-aperto': { term: 'Guadagno ad anello aperto', def: 'Il guadagno A dell\'operazionale senza retroazione: quante volte moltiplica la differenza V+ − V−. Nel 741 vale tipicamente 200' + NB + '000, ma cambia molto da un esemplare all\'altro e con la temperatura.' },
      'cortocircuito-virtuale': { term: 'Cortocircuito virtuale', def: 'Con la retroazione negativa l\'operazionale porta l\'uscita dove serve perché V+ e V− siano quasi uguali: nel 741 differiscono di poche decine di microvolt, anche se tra i due ingressi non c\'è nessun filo.' },
      'massa-virtuale': { term: 'Massa virtuale', def: 'Nell\'amplificatore invertente il morsetto − resta a 0 V senza essere collegato a massa: è il cortocircuito virtuale con il morsetto + a massa.' },
      'saturazione-uscita': { term: 'Saturazione dell\'uscita', def: 'Quando il segnale chiederebbe più tensione di quella che l\'operazionale può dare, l\'uscita si ferma e i picchi vengono tagliati (clipping). Il 741 si ferma 1–2 V prima delle alimentazioni; gli operazionali rail-to-rail arrivano a qualche decina di millivolt.' },
      'inseguitore': { term: 'Inseguitore di tensione', def: 'Operazionale con l\'uscita collegata direttamente al morsetto −: Vout = Vin, guadagno 1. Non amplifica la tensione ma separa: il segnale non fornisce corrente e il carico è alimentato dall\'operazionale. Si chiama anche buffer.' },
      'comparatore': { term: 'Comparatore', def: 'Circuito che confronta due tensioni e risponde con due soli livelli: alto se V+ supera V−, basso altrimenti. Un operazionale senza retroazione è il comparatore più semplice.' },
      'prodotto-guadagno-banda': { term: 'Prodotto guadagno-banda', def: 'In un operazionale compensato il guadagno moltiplicato per la banda resta costante: circa 1 MHz nel 741. Con guadagno 10 il segnale passa fino a circa 100 kHz, con guadagno 1000 solo fino a 1 kHz.' },
      'slew-rate': { term: 'Slew rate', def: 'La velocità massima con cui l\'uscita di un operazionale può cambiare, in volt al microsecondo. Nel 741 è circa 0,5 V/µs: una sinusoide di 10 V di picco si deforma già sopra 8 kHz.' },
    },
  });
})();
