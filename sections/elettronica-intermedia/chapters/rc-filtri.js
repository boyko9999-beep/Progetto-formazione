/*
 * Capitolo 6: circuiti RC e filtri.
 * Laboratorio in due modi: "Nel tempo" (carica e scarica con un deviatore) e
 * "In frequenza" (passa-basso o passa-alto con generatore sinusoidale e diagramma di Bode).
 */
(function () {
  'use strict';

  const { s, sym, wire, dot, si, num, clamp } = EI;

  /* ---------- modello fisico (puro, testato in tests/rc-filtri.test.js) ---------- */

  const model = {
    tau: (R, C) => R * C,
    // Evoluzione esatta verso la tensione finale vf partendo da vi, dopo un tempo t.
    approach: (vi, vf, t, tau) => vf + (vi - vf) * Math.exp(-t / tau),
    current: (vs, vc, R) => (vs - vc) / R,
    fc: (R, C) => 1 / (2 * Math.PI * R * C),
    reactance: (f, C) => 1 / (2 * Math.PI * f * C),
    // Risposta del filtro del primo ordine: guadagno (rapporto Vout/Vin) e fase in radianti.
    response: (type, f, fc) => {
      const x = f / fc;
      const k = 1 / Math.sqrt(1 + x * x);
      return type === 'hp' ? { gain: x * k, phase: Math.atan(1 / x) } : { gain: k, phase: -Math.atan(x) };
    },
    db: (g) => 20 * Math.log10(g),
  };

  const V0 = 5;
  const T_WIN = 10; // secondi visibili nel grafico della carica
  const VIS_HZ = 0.5; // nel modo in frequenza lo schema fa un ciclo ogni 2 s, qualunque sia f

  const fmtR = (v) => si(v, 'Ω', { trim: true });
  const fmtC = (v) => si(v, 'F', { trim: true });
  const pctOf = (g) => num(g * 100, g < 0.1 ? 1 : 0) + '%';

  /*
   * Due composizioni dello schema: larga (computer, tablet) e stretta (telefono, con testi più grandi).
   * t: carica e scarica; f: il filtro. Tutte le coordinate sono nel viewBox W × H.
   */
  const GEO = {
    wide: {
      W: 540, H: 300, narrow: false,
      t: { yTop: 56, yGnd: 270, bat: [50, 128], sw: [214, 72], rX: 250, rLen: 80, cx: 410, plate: 88, cTop: 148, cLbl: [468, 'start'], vc: [422, 110, 'start'], gnd: 280, lblC: [150, 38], lblS: [140, 88] },
      f: { title: 20, note: 37, yTop: 96, yGnd: 272, src: [56, 144], ser: 150, node: 300, sh: 144, out: 420, vout: [444, 'start'], gnd: 180 },
    },
    narrow: {
      W: 380, H: 320, narrow: true,
      t: { yTop: 56, yGnd: 290, bat: [34, 150], sw: [182, 72], rX: 206, rLen: 64, cx: 316, plate: 70, cTop: 148, cLbl: [272, 'end'], vc: [304, 112, 'end'], gnd: 220, lblC: [118, 36], lblS: [106, 88] },
      f: { title: 20, note: 38, yTop: 96, yGnd: 296, src: [40, 150], ser: 118, node: 250, sh: 150, out: 330, vout: [336, 'middle'], gnd: 180 },
    },
  };

  /* ---------- laboratorio ---------- */

  function mount(lab) {
    const svg = lab.svg;
    svg.classList.add('rc-svg');
    const P = EI.palette();
    const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;
    let geo = GEO.wide;

    const st = {
      mode: 'tempo', R: 4700, C: 220e-6, pos: 'scarica', vc: 0, v0: 0, t: 0, sweep: [], ghost: null,
      fR: 1000, fC: 100e-9, f: 1000, type: 'lp', phase: 0, wasAbove90: false, discharged: false,
    };

    const gT = s('g', { class: 'rc-tempo' }, svg);
    const gF = s('g', { class: 'rc-freq', style: 'display:none' }, svg);
    let T = null; // pezzi dello schema nel tempo
    let F = null; // pezzi dello schema del filtro

    /* --- disegno: carica e scarica con il deviatore --- */
    function drawTime() {
      const g = geo.t;
      gT.innerHTML = '';
      const [bx, by] = g.bat;
      const yT = g.yTop;
      const yG = g.yGnd;
      const cx = g.cx;
      const half = g.plate / 2;
      const yP = g.cTop;
      sym.source(gT, { x: bx, y: by, rot: 90, len: 60, kind: 'dc', label: 'V₀', value: '5 V', side: 1 });
      const sw = sym.spdt(gT, { x: g.sw[0], y: g.sw[1], rot: 180 });
      const tC = sw.t2; // contatto in alto: CARICA
      const tS = sw.t1; // contatto in basso: SCARICA
      EI.label(gT, g.lblC[0], g.lblC[1], 'CARICA', { cls: 'mono' });
      EI.label(gT, g.lblS[0], g.lblS[1], 'SCARICA', { cls: 'mono', anchor: 'end' });
      const res = sym.resistor(gT, { x: g.rX, y: g.sw[1], len: g.rLen, label: 'R', value: fmtR(st.R), side: 1 });
      // condensatore grande, disegnato a mano per vedere le cariche sulle armature
      const capG = s('g', { class: 'ei-sym rc-cap' }, gT);
      const field = s('g', { class: 'rc-field' }, capG);
      for (let k = -3; k <= 3; k++) s('path', { d: 'M' + (cx + k * half / 4) + ' ' + (yP + 10) + 'V' + (yP + 32), class: 'rc-fieldline' }, field);
      s('rect', { x: cx - half, y: yP, width: 2 * half, height: 7, rx: 2, class: 'plate rc-plate' }, capG);
      s('rect', { x: cx - half, y: yP + 35, width: 2 * half, height: 7, rx: 2, class: 'plate rc-plate' }, capG);
      const plus = [];
      const minus = [];
      for (let k = 0; k < 9; k++) {
        const x = cx - half + 6 + k * (2 * half - 12) / 8;
        plus.push(s('text', { x: x, y: yP - 5, class: 'rc-q plus', 'text-anchor': 'middle', text: '+' }, capG));
        minus.push(s('text', { x: x, y: yP + 55, class: 'rc-q minus', 'text-anchor': 'middle', text: '−' }, capG));
      }
      EI.label(gT, g.cLbl[0], yP + 12, 'C', { cls: 'big', anchor: g.cLbl[1] });
      const capVal = EI.label(gT, g.cLbl[0], yP + 32, '', { cls: 'mono', anchor: g.cLbl[1] });
      capVal.classList.add('value');

      const w = {
        battTop: wire(gT, [[bx, by], [bx, yT], tC]),
        battBot: wire(gT, [[bx, by + 60], [bx, yG], [tS[0], yG]]),
        t1: wire(gT, [tS, [tS[0], yG]]),
        common: wire(gT, [sw.c, res.a]),
        out: wire(gT, [res.b, [cx, res.b[1]], [cx, yP]]),
        cBot: wire(gT, [[cx, yP + 42], [cx, yG]]),
        rail: wire(gT, [[cx, yG], [tS[0], yG]]),
      };
      dot(gT, tS[0], yG);
      sym.ground(gT, { x: g.gnd, y: yG });
      const vcTag = EI.label(gT, g.vc[0], g.vc[1], '', { cls: 'mono', anchor: g.vc[2] });
      const hidden = (d) => s('path', { d: d, class: 'rc-fpath' }, gT);
      const flows = {
        top: new EI.Flow(gT, w.battTop),
        bot: new EI.Flow(gT, hidden('M' + tS[0] + ' ' + yG + 'H' + bx + 'V' + (by + 60))),
        t1: new EI.Flow(gT, w.t1),
        r: new EI.Flow(gT, hidden('M' + sw.c[0] + ' ' + sw.c[1] + 'H' + cx + 'V' + (yP - 2))),
        cdown: new EI.Flow(gT, w.cBot),
        rail: new EI.Flow(gT, w.rail),
      };
      sw.set(st.pos === 'carica' ? 2 : 1);
      T = { sw: sw, res: res, field: field, plus: plus, minus: minus, capVal: capVal, vcTag: vcTag, w: w, flows: flows };
    }

    /* --- disegno: passa-basso o passa-alto con il generatore sinusoidale --- */
    function drawFilter() {
      const g = geo.f;
      gF.innerHTML = '';
      const lp = st.type === 'lp';
      const yT = g.yTop;
      const yG = g.yGnd;
      const [sx, sy] = g.src;
      EI.label(gF, geo.W / 2, g.title, lp ? 'Passa-basso: uscita sul condensatore' : 'Passa-alto: uscita sulla resistenza', { cls: 'mono' });
      EI.label(gF, geo.W / 2, g.note, 'schema rallentato: un ciclo ogni 2 s', { cls: 'rc-note' });
      sym.source(gF, { x: sx, y: sy, rot: 90, len: 64, kind: 'ac', label: 'Vin', value: '1 V', side: 1 });
      const series = lp
        ? sym.resistor(gF, { x: g.ser, y: yT, len: 64, label: 'R', value: fmtR(st.fR) })
        : sym.capacitor(gF, { x: g.ser + 8, y: yT, len: 48, label: 'C', value: fmtC(st.fC) });
      const shunt = lp
        ? sym.capacitor(gF, { x: g.node, y: g.sh + 8, rot: 90, len: 48, label: 'C', value: fmtC(st.fC), side: -1 })
        : sym.resistor(gF, { x: g.node, y: g.sh, rot: 90, len: 64, label: 'R', value: fmtR(st.fR), side: -1 });
      const w = {
        in: wire(gF, [[sx, sy], [sx, yT], series.a]),
        mid: wire(gF, [series.b, [g.node, yT], shunt.a]),
        outTop: wire(gF, [[g.node, yT], [g.out, yT]]),
        shuntBot: wire(gF, [shunt.b, [g.node, yG]]),
        gnd: wire(gF, [[sx, sy + 64], [sx, yG], [g.out, yG]]),
      };
      dot(gF, g.node, yT);
      dot(gF, g.node, yG);
      s('circle', { cx: g.out + 6, cy: yT, r: 5, class: 'rc-term' }, gF);
      s('circle', { cx: g.out + 6, cy: yG, r: 5, class: 'rc-term' }, gF);
      const vy = (yT + yG) / 2;
      EI.label(gF, g.vout[0], vy - 11, 'Vout', { cls: 'big', anchor: g.vout[1] });
      const outTag = EI.label(gF, g.vout[0], vy + 12, '', { cls: 'mono', anchor: g.vout[1] });
      sym.ground(gF, { x: g.gnd, y: yG });
      const hidden = (d) => s('path', { d: d, class: 'rc-fpath' }, gF);
      F = {
        w: w, outTag: outTag,
        fIn: new EI.Flow(gF, hidden('M' + sx + ' ' + sy + 'V' + yT + 'H' + series.a[0])),
        fMid: new EI.Flow(gF, hidden('M' + series.b[0] + ' ' + yT + 'H' + g.node + 'V' + shunt.a[1])),
        fDown: new EI.Flow(gF, hidden('M' + g.node + ' ' + shunt.b[1] + 'V' + yG + 'H' + sx + 'V' + (sy + 64))),
      };
    }

    function build() {
      geo = mq && mq.matches ? GEO.narrow : GEO.wide;
      svg.classList.toggle('rc-narrow', geo.narrow);
      lab.view(geo.W, geo.H);
      drawTime();
      drawFilter();
      lab.invalidate();
    }

    /* --- grafici --- */
    const scopeT = lab.plot({
      title: 'Oscilloscopio · carica e scarica', height: 210,
      x: { min: 0, max: T_WIN, unit: 's', div: 10, label: 'tempo dall\'ultimo scatto' },
      y: { min: 0, max: 6, unit: 'V', count: 6 },
      y2: { min: 0, max: 6 / 4700, unit: 'A', color: P.t3 },
      legend: [{ label: 'Vc (tensione sul condensatore)', color: 'var(--trace-2)' }, { label: 'I (corrente in R)', color: 'var(--trace-3)' }, { label: 'scatto precedente', color: '#5f746d' }],
      aria: 'Grafico della tensione sul condensatore e della corrente nel tempo',
    });
    const scopeF = lab.plot({
      title: 'Oscilloscopio · ingresso e uscita, tempi veri', height: 190,
      x: { min: 0, max: 2e-3, unit: 's', div: 10 },
      y: { min: -1.25, max: 1.25, unit: 'V', count: 5 },
      legend: [{ label: 'Vin', color: 'var(--trace-2)' }, { label: 'Vout', color: 'var(--trace-1)' }],
      aria: 'Forme d\'onda di ingresso e di uscita del filtro',
    });
    const bode = lab.plot({
      title: 'Diagramma di Bode · guadagno', height: 190,
      x: { min: 10, max: 1e5, log: true, unit: 'Hz' },
      y: { min: -40, max: 5, unit: 'dB', fmt: (v) => num(v, 0) + ' dB', count: 5 },
      legend: [{ label: 'guadagno |Vout/Vin|', color: 'var(--trace-1)' }],
      aria: 'Diagramma di Bode del filtro',
    });
    lab.plotsEl.classList.add('rc-plots');

    /* --- strumenti --- */
    const rTau = lab.readout({ label: 'τ = R·C', unit: 's', color: 'var(--trace-2)' });
    const rVc = lab.readout({ label: 'Tensione Vc', unit: 'V', color: 'var(--trace-2)', max: V0 });
    const rI = lab.readout({ label: 'Corrente I', unit: 'A', color: 'var(--trace-3)', max: V0 / 1000 });
    const rPct = lab.readout({ label: 'Carica', fmt: (v) => num(v * 100, 0) + ' %', color: 'var(--trace-1)', max: 1 });
    const rFc = lab.readout({ label: 'Taglio fc', unit: 'Hz', color: 'var(--trace-2)' });
    const rGain = lab.readout({ label: 'Vout / Vin', fmt: (v) => num(v * 100, v < 0.1 ? 1 : 0) + ' %', color: 'var(--trace-1)', max: 1 });
    const rDb = lab.readout({ label: 'Guadagno', fmt: (v) => num(v, 1) + ' dB', color: 'var(--trace-1)' });
    const rPh = lab.readout({ label: 'Sfasamento', fmt: (v) => (v > 0 ? '+' : '') + num(v, 0) + '°', color: 'var(--trace-3)' });
    const timeReadouts = [rTau, rVc, rI, rPct];
    const freqReadouts = [rFc, rGain, rDb, rPh];

    /* --- comandi --- */
    const top = lab.group();
    lab.choice({
      into: top, label: 'Esperimento', value: 'tempo',
      options: [{ value: 'tempo', label: 'Nel tempo: carica e scarica' }, { value: 'freq', label: 'In frequenza: il filtro' }],
      onChange: (v) => { st.mode = v; layout(); },
    });
    const gTime = lab.group('Carica e scarica');
    const swCtl = lab.choice({
      into: gTime, label: 'Deviatore', value: 'scarica',
      options: [{ value: 'carica', label: 'Carica ⚡' }, { value: 'scarica', label: 'Scarica' }],
      onChange: (v) => flip(v),
    });
    // con il movimento ridotto la curva dello scatto si ricalcola con i nuovi componenti
    const replay = () => { if (lab.reduced && st.sweep.length > 1) jumpToEnd(st.v0); };
    lab.slider({ into: gTime, label: 'Resistenza R', min: 1000, max: 22000, series: 'E12', value: 4700, unit: 'Ω', onInput: (v) => { st.R = v; replay(); } });
    lab.slider({ into: gTime, label: 'Capacità C', min: 47e-6, max: 470e-6, series: 'E6', value: 220e-6, unit: 'F', onInput: (v) => { st.C = v; replay(); } });
    const gFreq = lab.group('Filtro del primo ordine');
    lab.choice({
      into: gFreq, label: 'Tipo', value: 'lp',
      options: [{ value: 'lp', label: 'Passa-basso' }, { value: 'hp', label: 'Passa-alto' }],
      onChange: (v) => { st.type = v; drawFilter(); },
    });
    lab.slider({ into: gFreq, label: 'Frequenza f', min: 10, max: 100000, log: true, value: 1000, unit: 'Hz', onInput: (v) => { st.f = v; } });
    lab.slider({ into: gFreq, label: 'Resistenza R', min: 100, max: 100000, series: 'E12', value: 1000, unit: 'Ω', onInput: (v) => { st.fR = v; drawFilter(); } });
    lab.slider({ into: gFreq, label: 'Capacità C', min: 1e-9, max: 10e-6, series: 'E6', value: 100e-9, unit: 'F', onInput: (v) => { st.fC = v; drawFilter(); } });

    lab.challenges([
      { id: 'piena', text: 'Carica il condensatore oltre il 99%: quanti τ servono?', check: (q) => q.mode === 'tempo' && q.vc > 0.99 * V0 },
      { id: 'lenta', text: 'Scegli R e C in modo che τ duri almeno 5 secondi.', check: (q) => q.R * q.C >= 5 },
      { id: 'scarica', text: 'Carica oltre il 90% e poi scarica fin sotto il 10%.', check: (q) => q.discharged },
      { id: 'taglio', text: 'Costruisci un [[passa-basso]] con [[frequenza-di-taglio]] tra 900 Hz e 1,1 kHz.', check: (q) => q.mode === 'freq' && q.type === 'lp' && Math.abs(model.fc(q.fR, q.fC) - 1000) <= 100 },
      { id: 'meno3', text: 'Porta la frequenza f a meno del 5% da fc: quanto vale l\'uscita?', check: (q) => q.mode === 'freq' && Math.abs(q.f / model.fc(q.fR, q.fC) - 1) < 0.05 },
      { id: 'ronzio', text: 'Con un [[passa-alto]] riduci il ronzio di rete a 50 Hz sotto il 10% (−20 dB), ma lascia passare almeno il 90% di un fischio a 2 kHz.', check: (q) => q.mode === 'freq' && q.type === 'hp' && model.response('hp', 50, model.fc(q.fR, q.fC)).gain < 0.1 && model.response('hp', 2000, model.fc(q.fR, q.fC)).gain >= 0.9 },
    ]);

    function flip(v) {
      if (v === st.pos) return;
      if (v === 'scarica' && st.vc > 0.9 * V0) st.wasAbove90 = true;
      if (v === 'carica') st.wasAbove90 = false;
      st.ghost = st.sweep.length > 1 ? st.sweep : null;
      st.pos = v;
      st.t = 0;
      st.v0 = st.vc;
      st.sweep = [[0, st.vc, model.current(v === 'carica' ? V0 : 0, st.vc, st.R)]];
      if (T) T.sw.set(v === 'carica' ? 2 : 1);
      if (lab.reduced) jumpToEnd(st.vc);
    }
    // Movimento ridotto: niente animazione, si mostra subito la curva completa dello scatto.
    function jumpToEnd(v0) {
      const vs = st.pos === 'carica' ? V0 : 0;
      const tau = model.tau(st.R, st.C);
      st.sweep = [];
      for (let k = 0; k <= 200; k++) {
        const t = T_WIN * k / 200;
        const v = model.approach(v0, vs, t, tau);
        st.sweep.push([t, v, model.current(vs, v, st.R)]);
      }
      st.t = T_WIN;
      st.vc = st.sweep[st.sweep.length - 1][1];
      if (st.wasAbove90 && st.pos === 'scarica' && st.vc < 0.1 * V0) st.discharged = true;
    }

    function layout() {
      const t = st.mode === 'tempo';
      gT.style.display = t ? '' : 'none';
      gF.style.display = t ? 'none' : '';
      gTime.hidden = !t;
      gFreq.hidden = t;
      scopeT.figure.hidden = !t;
      scopeF.figure.hidden = t;
      bode.figure.hidden = t;
      timeReadouts.forEach((r) => { r.el.hidden = !t; });
      freqReadouts.forEach((r) => { r.el.hidden = t; });
      lab.plots.forEach((p) => p.resize());
      lab.invalidate();
    }

    lab.onReset(() => {
      st.vc = 0; st.v0 = 0; st.t = 0; st.sweep = []; st.ghost = null; st.pos = 'scarica'; st.wasAbove90 = false;
      if (T) T.sw.set(1);
      swCtl.set('scarica', true);
      st.phase = 0;
      layout();
    });

    /* --- aggiornamento --- */
    function stepTime(dt) {
      const tau = model.tau(st.R, st.C);
      const vs = st.pos === 'carica' ? V0 : 0;
      if (dt > 0) {
        st.vc = model.approach(st.vc, vs, dt, tau);
        st.t += dt;
        if (st.t <= T_WIN + 0.05) st.sweep.push([st.t, st.vc, model.current(vs, st.vc, st.R)]);
        if (st.sweep.length > 1600) st.sweep = st.sweep.filter((p, i) => i % 2 === 0);
      }
      if (st.wasAbove90 && st.pos === 'scarica' && st.vc < 0.1 * V0) st.discharged = true;
      const i = model.current(vs, st.vc, st.R);
      const sp = EI.speedFor(i, V0 / 1000);
      const charging = st.pos === 'carica';
      const q = st.vc / V0;

      // colori dei fili = tensione del nodo
      const w = T.w;
      w.battTop.style.stroke = EI.vcolor(V0, V0);
      w.common.style.stroke = EI.vcolor(charging ? V0 : 0, V0);
      w.out.style.stroke = EI.vcolor(st.vc, V0);
      [w.battBot, w.t1, w.cBot, w.rail].forEach((x) => { x.style.stroke = EI.vcolor(0, V0); });
      const f = T.flows;
      f.top.set(charging ? sp : 0);
      f.bot.set(charging ? sp : 0);
      f.t1.set(charging ? 0 : -sp);
      f.r.set(sp);
      f.cdown.set(sp);
      f.rail.set(sp);
      Object.values(f).forEach((x) => x.step(dt));

      // cariche sulle armature e campo elettrico
      T.plus.forEach((p, k) => { p.style.opacity = clamp(q * 9 - k, 0, 1).toFixed(2); });
      T.minus.forEach((p, k) => { p.style.opacity = clamp(q * 9 - k, 0, 1).toFixed(2); });
      T.field.style.opacity = (q * 0.9).toFixed(2);
      T.res.label.querySelector('.value').textContent = fmtR(st.R);
      T.capVal.textContent = fmtC(st.C);
      T.vcTag.textContent = 'Vc = ' + si(st.vc, 'V', { sig: 3 });
      T.vcTag.style.fill = P.t2;

      rTau.set(tau);
      rVc.set(st.vc);
      rI.set(Math.abs(i));
      rI.el.dataset.state = Math.abs(i) > 1e-6 ? '' : 'ok';
      rPct.set(q);

      // grafico: le tacche dei τ si scrivono solo se c'è posto
      scopeT.opts.y2 = { min: 0, max: 6 / st.R, unit: 'A', color: P.t3 };
      scopeT.clear();
      scopeT.hline(V0, { color: P.text, alpha: 0.45, label: '5 V', at: 'left' });
      const room = scopeT.X(tau) - scopeT.X(0) >= 26;
      [1, 2, 3, 4, 5].map((k) => k * tau).filter((x) => x <= T_WIN).forEach((x, k) => scopeT.vline(x, {
        color: k === 0 ? P.t2 : P.grid, alpha: k === 0 ? 0.8 : 1, label: k === 0 ? 'τ' : room ? (k + 1) + 'τ' : '',
      }));
      if (st.ghost) {
        scopeT.line(st.ghost.map((p) => [p[0], p[1]]), { color: '#5f746d', width: 1.6, glow: false, alpha: 0.8 });
      }
      if (st.sweep.length > 1) {
        scopeT.line(st.sweep.map((p) => [p[0], Math.abs(p[2])]), { color: P.t3, width: 1.8, axis: 'y2', alpha: 0.9 });
        scopeT.line(st.sweep.map((p) => [p[0], p[1]]), { color: P.t2, width: 2.4, fill: P.t2, fillAlpha: 0.08 });
        const last = st.sweep[st.sweep.length - 1];
        if (last[0] <= T_WIN) scopeT.point(last[0], last[1], { color: P.t2, r: 4 });
        if (tau <= T_WIN && charging && st.sweep[0][1] < 0.05 * V0 && room) {
          scopeT.point(tau, model.approach(st.sweep[0][1], V0, tau, tau), { color: P.t2, r: 3.5, ring: false, label: '63%', labelPos: 'left' });
        }
      }

      let msg;
      const pct = Math.round(q * 100);
      if (charging) {
        if (q < 0.15) msg = 'Deviatore su <b>CARICA</b>: la pila spinge cariche nel condensatore attraverso R. All\'inizio il condensatore è scarico e si comporta come un filo, quindi la corrente è massima: V₀/R = <b>' + si(V0 / st.R, 'A') + '</b>.';
        else if (q < 0.97) msg = 'Vc sale (ora <b>' + pct + '%</b>) e la tensione rimasta su R diminuisce: per questo la corrente cala. Dopo un [[costante-di-tempo|τ]] = <b>' + si(tau, 's') + '</b> il condensatore è al 63%, dopo 5τ è praticamente pieno.';
        else msg = 'Il condensatore è carico (Vc ≈ 5 V): le due tensioni si equivalgono e la corrente si è quasi fermata. Sposta il deviatore su <b>SCARICA</b> e guarda la corrente invertire il verso.';
      } else if (st.vc > 0.03) {
        msg = 'Il condensatore restituisce l\'energia (carica residua <b>' + pct + '%</b>): la corrente scorre <b>al contrario</b> dentro R e Vc scende con la stessa legge esponenziale, con lo stesso τ = <b>' + si(tau, 's') + '</b>.';
      } else {
        msg = 'Condensatore scarico, nessuna corrente. Sposta il deviatore su <b>CARICA</b> e osserva la curva: veloce all\'inizio, sempre più lenta.';
      }
      lab.explain(msg);
    }

    function stepFreq(dt) {
      const fc = model.fc(st.fR, st.fC);
      const r = model.response(st.type, st.f, fc);
      st.phase = (st.phase + dt * VIS_HZ * 2 * Math.PI) % (2 * Math.PI);
      const vin = Math.sin(st.phase);
      const vout = r.gain * Math.sin(st.phase + r.phase);
      // corrente nel ramo in serie: in fase con la tensione su R
      const lp = st.type === 'lp';
      const iser = lp ? (vin - vout) : vout;
      const w = F.w;
      w.in.style.stroke = EI.vcolor(vin, 1);
      w.mid.style.stroke = EI.vcolor(vout, 1);
      w.outTop.style.stroke = EI.vcolor(vout, 1);
      w.shuntBot.style.stroke = EI.vcolor(0, 1);
      w.gnd.style.stroke = EI.vcolor(0, 1);
      const sp = EI.speedFor(iser, 1) * 0.8;
      [F.fIn, F.fMid, F.fDown].forEach((x) => { x.set(sp); x.step(dt); });
      F.outTag.textContent = pctOf(r.gain) + ' di Vin';
      F.outTag.style.fill = P.t1;
      const deg = r.phase * 180 / Math.PI;
      rFc.set(fc);
      rGain.set(r.gain);
      const dB = model.db(r.gain);
      const dBr = Math.abs(dB) < 0.05 ? 0 : dB; // niente «-0,0 dB» quando il guadagno è 1
      rDb.set(dBr);
      rPh.set(deg);

      // oscilloscopio: due periodi dell'ingresso, scorrimento lento
      const Tp = 1 / st.f;
      scopeF.setRange('x', 0, 2 * Tp);
      scopeF.clear();
      const shift = st.phase / (2 * Math.PI) * Tp;
      scopeF.line((t) => Math.sin(2 * Math.PI * st.f * (t + shift)), { color: P.t2, width: 2 });
      scopeF.line((t) => r.gain * Math.sin(2 * Math.PI * st.f * (t + shift) + r.phase), { color: P.t1, width: 2.4 });

      bode.clear();
      bode.hline(-3, { color: P.t3, alpha: 0.7, label: '−3 dB' });
      if (fc >= 10 && fc <= 1e5) bode.vline(fc, { color: P.t2, label: 'fc' });
      bode.line((ff) => model.db(model.response(st.type, ff, fc).gain), { color: P.t1, width: 2.4, fill: P.t1, fillTo: -40, fillAlpha: 0.07 });
      bode.point(st.f, dB, { color: P.t2, label: num(dBr, 1) + ' dB', labelPos: 'up' });

      // spiegazione con i valori del momento
      const x = st.f / fc;
      // l'articolo segue la lettura del numero: «il 53%», «l'83%», «l'8,2%», «lo 0,5%»
      const p = pctOf(r.gain);
      const n = parseInt(p, 10);
      const art = n === 0 ? 'lo ' : (n === 1 || n === 8 || n === 11 || (n >= 80 && n <= 89)) ? 'l\'' : 'il ';
      const out = art + '<b>' + p + '</b> dell\'ingresso (' + num(dBr, 1).replace('-', '−') + ' dB)';
      const lag = num(Math.abs(deg), 0) + '° ' + (lp ? 'in ritardo' : 'in anticipo');
      const xc = si(model.reactance(st.f, st.fC), 'Ω');
      const fTxt = si(st.f, 'Hz', { trim: true });
      const fcTxt = si(fc, 'Hz');
      let msg;
      if (Math.abs(x - 1) < 0.05) {
        msg = 'Sei sulla [[frequenza-di-taglio]]: a ' + fTxt + ' la [[reattanza]] del condensatore (' + xc + ') è quasi uguale a R (' + fmtR(st.fR) + '). L\'uscita è ' + out + ', praticamente il 70,7% che definisce fc, ed è [[sfasamento|sfasata]] di ' + lag + '.';
      } else if (x < 0.3) {
        msg = lp
          ? 'f = ' + fTxt + ' è molto sotto la [[frequenza-di-taglio]] (fc = ' + fcTxt + '): la [[reattanza]] del condensatore (' + xc + ') è molto più grande di R e quasi tutto il segnale arriva in uscita: ' + out + ', con appena ' + lag + '. Il passa-basso lascia passare.'
          : 'f = ' + fTxt + ' è molto sotto fc (' + fcTxt + '): il condensatore in serie ha una [[reattanza]] grande (' + xc + ') rispetto a R e trattiene quasi tutto. In uscita resta ' + out + ', ' + lag + ': il passa-alto ferma le frequenze basse.';
      } else if (x < 3) {
        msg = 'f = ' + fTxt + ' è vicina alla frequenza di taglio fc = <b>' + fcTxt + '</b>: la reattanza del condensatore (' + xc + ') e R (' + fmtR(st.fR) + ') sono dello stesso ordine. L\'uscita è ' + out + ' ed è [[sfasamento|sfasata]] di ' + lag + '. Proprio a fc sarebbe il 70,7% (−3 dB), con 45°.';
      } else {
        msg = lp
          ? 'f = ' + fTxt + ' è molto sopra fc (' + fcTxt + '): il condensatore ha poca reattanza (' + xc + ') e manda a massa le alte frequenze. In uscita resta ' + out + ': ogni volta che f si moltiplica per 10 l\'uscita si divide per 10 (−20 dB per decade).'
          : 'f = ' + fTxt + ' è molto sopra fc (' + fcTxt + '): il condensatore in serie è quasi un filo (' + xc + ') e il segnale passa quasi intero: ' + out + '. Il passa-alto lascia passare gli acuti.';
      }
      lab.explain(msg);
    }

    lab.loop((dt) => {
      if (!T || !F) return;
      if (st.mode === 'tempo') stepTime(dt);
      else stepFreq(dt);
      lab.check(st);
    });

    const onMq = () => { if (geo.narrow !== !!(mq && mq.matches)) build(); };
    if (mq) {
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }
    lab.onDestroy(() => {
      if (!mq) return;
      if (mq.removeEventListener) mq.removeEventListener('change', onMq);
      else if (mq.removeListener) mq.removeListener(onMq);
    });

    build();
    layout();
  }

  /* ---------- illustrazioni ---------- */

  function curveFigure() {
    const W = 460;
    const H = 250;
    const x0 = 46;
    const x1 = 440;
    const y0 = 26;
    const y1 = 200;
    const X = (k) => x0 + (x1 - x0) * k / 5.5;
    const Y = (v) => y1 - (y1 - y0) * v;
    let d = '';
    for (let i = 0; i <= 110; i++) {
      const k = 5.5 * i / 110;
      d += (i ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(1 - Math.exp(-k)).toFixed(1);
    }
    const marks = [1, 2, 3, 4, 5].map((k) => {
      const v = 1 - Math.exp(-k);
      const pct = Math.round(v * 100);
      return '<path class="f-dash" d="M' + X(k) + ' ' + y1 + 'V' + Y(v) + 'H' + x0 + '"/>' +
        '<circle class="f-accent-fill" cx="' + X(k) + '" cy="' + Y(v) + '" r="4.5"/>' +
        '<text class="f-mono" x="' + X(k) + '" y="' + (y1 + 18) + '" text-anchor="middle">' + k + 'τ</text>' +
        // sotto e a destra del punto: lì non passano né la curva (che sta sopra) né i tratteggi (che vanno a sinistra)
        '<text class="f-accent-text" x="' + (X(k) + 8) + '" y="' + (Y(v) + 18) + '">' + pct + '%</text>';
    }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="rc-fig">' +
      '<path class="f-thin" d="M' + x0 + ' ' + y0 + 'V' + y1 + 'H' + x1 + '"/>' +
      '<text class="f-small" x="' + (x0 - 8) + '" y="' + (Y(1) + 4) + '" text-anchor="end">V₀</text>' +
      '<text class="f-small" x="' + (x0 - 8) + '" y="' + (y1 + 4) + '" text-anchor="end">0</text>' +
      '<path class="f-dash" d="M' + x0 + ' ' + Y(1) + 'H' + x1 + '"/>' +
      marks +
      '<path class="f-accent" d="' + d + '" stroke-width="3"/>' +
      '<text class="f-small" x="' + x1 + '" y="' + (y1 + 36) + '" text-anchor="end">tempo, in multipli di τ = R·C</text>' +
      '</svg>';
  }

  function bodeFigure() {
    const W = 460;
    const H = 230;
    const panel = (ox, hp, title) => {
      const x0 = ox + 14;
      const x1 = ox + 210;
      const yTop = 70;
      const yBot = 190;
      const X = (lx) => x0 + (x1 - x0) * (lx + 2) / 4; // da fc/100 a fc*100
      const Y = (db) => yTop + (yBot - yTop) * (-db / 40);
      let d = '';
      for (let i = 0; i <= 80; i++) {
        const lx = -2 + 4 * i / 80;
        const xr = Math.pow(10, lx);
        const g = hp ? xr / Math.sqrt(1 + xr * xr) : 1 / Math.sqrt(1 + xr * xr);
        d += (i ? 'L' : 'M') + X(lx).toFixed(1) + ' ' + Math.min(yBot, Y(20 * Math.log10(g))).toFixed(1);
      }
      const schem = hp
        ? '<path class="f-line" d="M' + (ox + 20) + ' 34H' + (ox + 70) + 'M' + (ox + 70) + ' 24V44M' + (ox + 78) + ' 24V44M' + (ox + 78) + ' 34H' + (ox + 196) + 'M' + (ox + 140) + ' 34V40"/><rect class="f-paper" x="' + (ox + 133) + '" y="40" width="14" height="22" rx="2"/>'
        : '<path class="f-line" d="M' + (ox + 20) + ' 34H' + (ox + 50) + 'M' + (ox + 84) + ' 34H' + (ox + 196) + 'M' + (ox + 140) + ' 34V44M' + (ox + 128) + ' 44H' + (ox + 152) + 'M' + (ox + 128) + ' 52H' + (ox + 152) + '"/><rect class="f-paper" x="' + (ox + 50) + '" y="27" width="34" height="14" rx="2"/>';
      return schem +
        '<text class="f-title" x="' + (ox + 112) + '" y="14" text-anchor="middle">' + title + '</text>' +
        '<path class="f-thin" d="M' + x0 + ' ' + yTop + 'V' + yBot + 'H' + x1 + '"/>' +
        '<path class="f-dash" d="M' + X(0) + ' ' + yTop + 'V' + yBot + '"/>' +
        '<text class="f-mono" x="' + X(0) + '" y="' + (yBot + 16) + '" text-anchor="middle">fc</text>' +
        '<text class="f-small" x="' + x0 + '" y="' + (yBot + 16) + '">basse</text>' +
        '<text class="f-small" x="' + x1 + '" y="' + (yBot + 16) + '" text-anchor="end">alte</text>' +
        '<path class="f-accent" d="' + d + '" stroke-width="3"/>';
    };
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="rc-fig">' + panel(0, false, 'Passa-basso') + panel(236, true, 'Passa-alto') +
      '<text class="f-small" x="230" y="226" text-anchor="middle">guadagno (dB) contro frequenza (scala logaritmica)</text></svg>';
  }

  /* ---------- capitolo ---------- */

  EI.chapter({
    id: 'rc-filtri',
    icon: 'capacitor',
    minutes: 14,
    summary: 'Un condensatore non si carica di colpo: attraverso una resistenza ci mette un tempo preciso, la [[costante-di-tempo]] τ = R·C. La stessa coppia R e C, alimentata da un segnale alternato, lascia passare le frequenze basse e frena quelle alte, o il contrario: è il filtro più semplice e più usato dell\'elettronica.',
    keywords: ['costante-di-tempo', 'carica-esponenziale', 'reattanza', 'frequenza-di-taglio', 'passa-basso', 'passa-alto', 'decibel', 'sfasamento'],
    model: model,
    css: [
      '.rc-q { font: 800 13px var(--mono); opacity: 0; transition: opacity .25s ease; }',
      '.rc-q.plus { fill: var(--trace-2); }',
      '.rc-q.minus { fill: var(--trace-3); }',
      '.rc-fieldline { stroke: var(--trace-2); stroke-width: 1.4; stroke-dasharray: 3 3; opacity: .7; }',
      '.rc-field { transition: opacity .25s ease; }',
      '.rc-cap .rc-plate { fill: var(--sym); }',
      '.rc-term { fill: var(--scope-bg); stroke: var(--sym); stroke-width: 2.2; }',
      '.rc-svg .ei-sym-label.value, .rc-svg text.value { fill: var(--trace-2); }',
      '.rc-fpath { fill: none; stroke: none; }',
      '.rc-svg .rc-note { fill: var(--scope-text); font: 600 11px var(--mono); }',
      // sul telefono lo schema ha un viewBox stretto: testi e tratti tornano a misure normali
      '.rc-svg.rc-narrow .ei-sym-label { font-size: 14px; }',
      '.rc-svg.rc-narrow .ei-sym-label .value, .rc-svg.rc-narrow .ei-sym-label.value { font-size: 13.5px; }',
      '.rc-svg.rc-narrow .ei-sym-label.big { font-size: 16px; }',
      '.rc-svg.rc-narrow .rc-note { font-size: 12px; }',
      '.rc-svg.rc-narrow .ei-wire { stroke-width: 3; }',
      '.rc-svg.rc-narrow .ei-sym .lead { stroke-width: 2.4; }',
      // le due figure sono larghe 460: sul telefono vengono rimpicciolite al 70%, quindi i testi partono più grandi
      '@media (max-width: 640px) {',
      '  .ei-figure svg.rc-fig .f-small { font-size: 14px; }',
      '  .ei-figure svg.rc-fig .f-mono { font-size: 15px; }',
      '  .ei-figure svg.rc-fig .f-title { font-size: 17px; }',
      '  .ei-figure svg.rc-fig .f-accent-text { font-size: 16px; }',
      '}',
    ].join('\n'),
    lab: {
      title: 'Carica, scarica e filtra',
      intro: 'Sposta il deviatore su <b>Carica</b> e guarda le cariche riempire le armature mentre la curva sale; poi cambia R e C e confronta con lo scatto precedente. Nel modo <b>In frequenza</b> scegli il filtro e fai scorrere la frequenza: l\'oscilloscopio mostra ingresso e uscita, il [[diagramma-di-bode|diagramma di Bode]] dove ti trovi.',
      mount: mount,
    },
    how: [
      'Colleghi un condensatore scarico a una pila attraverso una resistenza R. All\'inizio il condensatore si comporta come un filo: tutta la tensione è su R e la corrente parte dal valore massimo V₀/R.',
      'Man mano che le armature si caricano, la tensione del condensatore sale e quella rimasta su R diminuisce: la corrente cala. È una [[carica-esponenziale]]: veloce all\'inizio, sempre più lenta.',
      'Il ritmo lo decide la [[costante-di-tempo]] τ = R·C. Dopo 1τ il condensatore è al 63%, dopo 3τ al 95%, dopo 5τ al 99%: in pratica è carico. Con 10 kΩ e 100 µF, τ = 1 secondo.',
      'In corrente alternata il condensatore oppone una [[reattanza]] Xc = 1/(2πfC): enorme alle frequenze basse, piccola a quelle alte. R e C diventano un partitore di tensione che cambia con la frequenza.',
      'Se prendi l\'uscita sul condensatore ottieni un [[passa-basso]]; se la prendi sulla resistenza, un [[passa-alto]]. Alla [[frequenza-di-taglio]] fc = 1/(2πRC) l\'uscita vale il 70,7% dell\'ingresso, cioè −3 [[decibel]], ed è [[sfasamento|sfasata]] di 45°.',
      'Oltre la frequenza di taglio il passa-basso perde 20 dB per decade: a 10·fc l\'uscita è un decimo, a 100·fc un centesimo. Per tagliare più netto si mettono più filtri in cascata.',
    ],
    formulas: [
      {
        name: 'Costante di tempo',
        expr: '<var>τ</var> = <var>R</var> · <var>C</var>',
        legend: [['τ', 'costante di tempo, in secondi'], ['R', 'resistenza, in ohm (Ω)'], ['C', 'capacità, in farad (F)']],
        note: 'Esempio: 4,7 kΩ · 220 µF = 1,03 s.',
      },
      {
        name: 'Carica del condensatore',
        expr: '<var>V</var><sub>C</sub>(<var>t</var>) = <var>V</var><sub>0</sub> · (1 − <var>e</var><sup>−<var>t</var>/<var>τ</var></sup>)',
        legend: [['V<sub>0</sub>', 'tensione della pila'], ['t', 'tempo trascorso dalla chiusura'], ['e', 'numero di Nepero, circa 2,718']],
        note: 'La scarica segue la curva speculare: V<sub>C</sub>(t) = V<sub>0</sub> · e<sup>−t/τ</sup>.',
      },
      {
        name: 'Frequenza di taglio',
        expr: '<var>f</var><sub>c</sub> = <span class="frac"><span>1</span><span>2π · <var>R</var> · <var>C</var></span></span>',
        legend: [['f<sub>c</sub>', 'frequenza in cui l\'uscita scende al 70,7% (−3 dB)'], ['2π', 'circa 6,28: passa dai giri al secondo agli angoli']],
        note: 'Esempio: 1 kΩ e 100 nF danno f<sub>c</sub> ≈ 1,59 kHz.',
      },
    ],
    figures: [
      { title: 'La curva universale della carica', svg: curveFigure(), caption: 'Qualunque siano R e C, la carica segue sempre questa forma: cambia solo la scala dei tempi. Ogni τ il condensatore recupera il 63% di quello che gli manca.', alt: 'Curva di carica con i punti a 1, 2, 3, 4 e 5 tau: 63, 86, 95, 98 e 99 per cento' },
      { title: 'Passa-basso e passa-alto', svg: bodeFigure(), caption: 'Scambiando R e C cambia tutto: il passa-basso tiene le frequenze sotto fc, il passa-alto quelle sopra. Sulla frequenza di taglio i due filtri valgono entrambi −3 dB.', alt: 'Schemi e diagrammi di Bode di un filtro passa-basso e di un passa-alto' },
    ],
    history: {
      text: [
        'Che un condensatore si carichi seguendo una curva esponenziale lo si sapeva già nell\'Ottocento. Fu William Thomson, il futuro Lord Kelvin, a farne un problema pratico: i cavi telegrafici sottomarini si comportano come una lunga catena di resistenze e capacità, e un impulso spedito da un capo arriva all\'altro «impastato» e lento.',
        'Con il telefono e la radio i filtri diventano indispensabili: bisogna separare le stazioni, togliere i disturbi, mandare più conversazioni sullo stesso filo. Nel 1915 George Campbell, alla AT&T, e Karl Willy Wagner, in Germania, inventano indipendentemente i primi filtri elettrici.',
        'Negli anni seguenti i laboratori della Bell danno ai filtri il loro linguaggio: il decibel per misurare le attenuazioni e i diagrammi di Hendrik Bode, guadagno contro frequenza in scala logaritmica, che ancora oggi descrivono ogni filtro e ogni amplificatore.',
      ],
      events: [
        { year: 1855, title: 'La teoria del cavo telegrafico', who: 'William Thomson (Lord Kelvin)', text: 'Il cavo sottomarino è un circuito RC distribuito: il ritardo cresce con il quadrato della lunghezza.' },
        { year: 1915, title: 'I primi filtri elettrici', who: 'George A. Campbell e Karl Willy Wagner', text: 'Reti di condensatori e induttori che lasciano passare solo certe bande di frequenza, per la telefonia.' },
        { year: 1928, title: 'Nasce il decibel', who: 'Bell System', text: 'L\'unità di attenuazione della telefonia americana prende il nome di Alexander Graham Bell.' },
        { year: 1930, title: 'Il filtro «massimamente piatto»', who: 'Stephen Butterworth', text: 'Come ottenere una banda passante senza ondulazioni: il filtro di Butterworth è ancora uno dei più usati.' },
        { year: 1940, title: 'I diagrammi di Bode', who: 'Hendrik W. Bode', text: 'Il legame tra attenuazione e fase dei circuiti, disegnato su scala logaritmica.' },
      ],
    },
    fun: 'In una cassa acustica a due vie spesso basta un solo condensatore in serie al tweeter: insieme all\'altoparlante forma un passa-alto che gli manda solo gli acuti e tiene lontani i bassi, che lo danneggerebbero.',
    uses: 'Antirimbalzo dei pulsanti, reset all\'accensione dei microcontrollori, filtri antidisturbo sugli ingressi dei sensori, crossover delle casse, il condensatore di livellamento degli alimentatori, il timer 555, il filtro anti-aliasing prima di ogni convertitore analogico-digitale.',
    links: [
      { href: '../elettronica-base/index.html#condensatore', section: 'Elettronica base', title: 'Il condensatore: capacità, armature e dielettrico' },
      { href: '../elettronica-base/index.html#alternata', section: 'Elettronica base', title: 'La corrente alternata e i 50 Hz di rete' },
      { href: '#oscillatori', section: 'Questa sezione', title: 'Il 555 conta il tempo con una carica RC' },
      { href: '#alimentatore', section: 'Questa sezione', title: 'Il condensatore di livellamento e il ripple' },
    ],
    glossary: {
      'costante-di-tempo': { term: 'Costante di tempo', def: 'Il prodotto τ = R·C, in secondi: il tempo in cui un condensatore recupera il 63% della tensione che gli manca. Dopo 5τ è carico al 99%.' },
      'carica-esponenziale': { term: 'Carica esponenziale', def: 'Andamento della tensione di un condensatore che si carica attraverso una resistenza: rapido all\'inizio e sempre più lento, senza mai arrivare esattamente al valore finale.' },
      'reattanza': { term: 'Reattanza', def: 'L\'opposizione di un condensatore (o di un induttore) alla corrente alternata, in ohm. Per un condensatore vale 1/(2πfC): diminuisce quando la frequenza sale.' },
      'frequenza-di-taglio': { term: 'Frequenza di taglio', def: 'La frequenza in cui un filtro riduce il segnale al 70,7% (−3 dB). Per un filtro RC vale fc = 1/(2πRC).' },
      'passa-basso': { term: 'Passa-basso', def: 'Filtro che lascia passare le frequenze sotto la frequenza di taglio e attenua quelle sopra. Nel filtro RC l\'uscita è presa sul condensatore.' },
      'passa-alto': { term: 'Passa-alto', def: 'Filtro che lascia passare le frequenze sopra la frequenza di taglio e attenua quelle sotto. Nel filtro RC l\'uscita è presa sulla resistenza.' },
      'decibel': { term: 'Decibel', def: 'Unità logaritmica per i rapporti: per le tensioni vale 20·log₁₀(Vout/Vin). −3 dB è circa il 70,7%, −20 dB un decimo, −40 dB un centesimo.' },
      'sfasamento': { term: 'Sfasamento', def: 'Ritardo (o anticipo) di un\'onda rispetto a un\'altra della stessa frequenza, misurato in gradi: 360° è un periodo intero.' },
      'diagramma-di-bode': { term: 'Diagramma di Bode', def: 'Grafico del guadagno in decibel (e della fase) di un circuito in funzione della frequenza, su scala logaritmica. Prende il nome da Hendrik Bode.' },
    },
  });
})();
