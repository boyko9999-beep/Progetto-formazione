/*
 * Capitolo 3: LED e diodo Zener.
 * Laboratorio "Luce e tensione stabile" in due modi:
 *   LED    pila, resistenza di limitazione e LED di cinque colori; curve corrente-tensione con la retta di
 *          carico e il punto di lavoro; i fotoni escono al ritmo della corrente e oltre 30 mA il LED brucia.
 *   Zener  regolatore con resistenza in serie, Zener e carico; transcaratteristica Vout(Vin) e corrente
 *          nello Zener, con il limite di potenza di 0,5 W.
 */
(function () {
  'use strict';

  const { s, sym, wire, dot, si, num, clamp } = EI;

  /* ---------- modello fisico (puro, testato in tests/led-zener.test.js) ---------- */

  const VT = 0.025852; // tensione termica kT/q a 300 K, in volt
  const HC = 1239.84; // h·c in eV·nm: λ(nm) = 1239,84 / E(eV)
  const I_NOM = 0.02; // corrente tipica di un LED da 5 mm
  const I_MAX = 0.03; // corrente massima continua di un LED da 5 mm
  const PZ_MAX = 0.5; // potenza massima dello Zener, in watt
  const IZT = 0.005; // corrente a cui si misura la tensione nominale dello Zener

  // LED da 5 mm: tensione diretta a 20 mA, idealità n, resistenza interna rs (Ω), lunghezza d'onda di picco.
  const LEDS = {
    rosso: { label: 'Rosso', nm: 625, mat: 'AlGaInP', vf: 2.0, n: 2, rs: 8, color: '#ff3b30', light: 'rossa' },
    giallo: { label: 'Giallo', nm: 590, mat: 'AlGaInP', vf: 2.05, n: 2, rs: 8, color: '#ffc21f', light: 'gialla' },
    verde: { label: 'Verde', nm: 525, mat: 'InGaN', vf: 3.0, n: 1.8, rs: 14, color: '#35f27a', light: 'verde' },
    blu: { label: 'Blu', nm: 470, mat: 'InGaN', vf: 3.1, n: 1.8, rs: 14, color: '#4f8cff', light: 'blu' },
    bianco: { label: 'Bianco', nm: 455, mat: 'InGaN + fosforo', vf: 3.2, n: 1.8, rs: 14, color: '#f2f0ff', light: 'blu', white: true },
  };
  const PHOSPHOR = { nm: 565, color: '#ffd84d' }; // la luce gialla riemessa dal fosforo dei LED bianchi

  // Zener da 0,5 W: tensione nominale a 5 mA, morbidezza del ginocchio b (V), resistenza interna rs (Ω).
  // mech: meccanismo del cedimento; dep: spessore della zona di svuotamento nel riquadro (frazione);
  // win: l'intervallo d'ingresso su cui si misura la stabilità dell'uscita.
  const ZENERS = {
    '3.3': { vz: 3.3, b: 0.2, rs: 10, mech: 'tunnel', dep: 0.1, label: '3,3 V', win: [6, 12] },
    '5.1': { vz: 5.1, b: 0.06, rs: 4, mech: 'misto', dep: 0.16, label: '5,1 V', win: [8, 15] },
    '9.1': { vz: 9.1, b: 0.025, rs: 5, mech: 'valanga', dep: 0.26, label: '9,1 V', win: [12, 20] },
    '12': { vz: 12, b: 0.03, rs: 8, mech: 'valanga', dep: 0.3, label: '12 V', win: [15, 20] },
  };

  // Una giunzione con la sua resistenza interna: V(I) = b·ln(1 + I/Is) + rs·I, con V(i0) = v0.
  // Per un LED b = n·VT; per uno Zener in inversa b è piccolo e la curva parte quasi a Vz.
  function junction(v0, i0, b, rs) {
    const y = (v0 - rs * i0) / b; // ln(1 + i0/Is) = y, quindi ln(i0/Is) = y + ln(1 − e^−y)
    return { b: b, rs: rs, lnIs: Math.log(i0) - (y + Math.log1p(-Math.exp(-y))) };
  }
  // ln(1 + e^x) senza traboccare
  function softplus(x) {
    return x > 30 ? x + Math.log1p(Math.exp(-x)) : Math.log1p(Math.exp(x));
  }
  function vAt(j, i) {
    if (!(i > 0)) return 0;
    return j.b * softplus(Math.log(i) - j.lnIs) + j.rs * i;
  }
  // Bisezione sul logaritmo della corrente: g(I) cresce con I, cerca g(I) = 0.
  function solveI(j, g, iTop) {
    let lo = j.lnIs - 60;
    let hi = Math.log(iTop) + 1e-9;
    for (let k = 0; k < 110; k++) {
      const mid = (lo + hi) / 2;
      if (g(Math.exp(mid)) > 0) hi = mid;
      else lo = mid;
    }
    return Math.exp((lo + hi) / 2);
  }
  // Corrente alla tensione v (l'inversa di vAt).
  function iAt(j, v) {
    if (!(v > 0)) return 0;
    return solveI(j, (i) => vAt(j, i) - v, v / j.rs);
  }
  // Pila + resistenza + giunzione in serie: Vs = R·I + V(I). Restituisce corrente e tensioni.
  function series(vs, r, j) {
    if (!(vs > 0)) return { i: 0, v: 0, vr: 0 };
    const i = solveI(j, (x) => r * x + vAt(j, x) - vs, vs / r);
    const v = vAt(j, i);
    return { i: i, v: v, vr: r * i };
  }

  const cache = {};
  const model = {
    VT: VT, HC: HC, I_NOM: I_NOM, I_MAX: I_MAX, PZ_MAX: PZ_MAX, LEDS: LEDS, ZENERS: ZENERS,
    junction: junction, vAt: vAt, iAt: iAt, series: series,
    // Energia del fotone (eV) dalla lunghezza d'onda (nm), e viceversa.
    photonEnergy: (nm) => HC / nm,
    wavelength: (ev) => HC / ev,
    led(color) {
      const k = 'led:' + color;
      if (!cache[k]) { const d = LEDS[color]; cache[k] = junction(d.vf, I_NOM, d.n * VT, d.rs); }
      return cache[k];
    },
    ledV: (color, i) => vAt(model.led(color), i),
    ledI: (color, v) => iAt(model.led(color), v),
    ledPoint: (color, vs, r) => series(vs, r, model.led(color)),
    // Resistenza di limitazione: R = (Vs − Vf) / I, e il primo valore E12 che non la supera in corrente.
    resistorFor: (vs, vf, i) => (vs - vf) / i,
    nextE12: (r) => EI.seriesValues('E12', r / 2, r * 20).find((x) => x >= r * 0.999),
    zener(key) {
      const k = 'z:' + key;
      if (!cache[k]) { const z = ZENERS[key]; cache[k] = junction(z.vz, IZT, z.b, z.rs); }
      return cache[k];
    },
    zenerV: (key, iz) => vAt(model.zener(key), iz),
    // Regolatore: Vin — Rs — uscita con lo Zener in inversa e il carico RL (Infinity = nessun carico).
    // Si cerca Iz tale che Vin = Vz(Iz) + Rs·(Iz + Vz(Iz)/RL).
    zenerPoint(key, vin, rs, rl) {
      if (!(vin > 0)) return { vout: 0, iz: 0, il: 0, iin: 0, pz: 0 };
      const j = model.zener(key);
      const iz = solveI(j, (x) => { const v = vAt(j, x); return v + rs * (x + v / rl) - vin; }, vin / rs);
      const vout = vAt(j, iz);
      const il = isFinite(rl) ? vout / rl : 0;
      return { vout: vout, iz: iz, il: il, iin: iz + il, pz: vout * iz };
    },
    zenerImax: (key) => PZ_MAX / ZENERS[key].vz,
  };

  /* ---------- formati ---------- */

  const fmtV = (v) => si(v, 'V');
  const fmtA = (i) => (i < 1e-7 ? '≈ 0 A' : si(i, 'A'));
  const fmtW = (p) => (p < 1e-7 ? '0 W' : si(p, 'W'));
  const fmtR = (r) => (isFinite(r) ? si(r, 'Ω', { trim: true }) : 'nessun carico');
  const ease = (cur, target, dt, rate) => (dt > 0 ? EI.approach(cur, target, dt, rate) : target);
  const brightness = (i) => (i < 5e-5 ? 0 : clamp(Math.sqrt(i / (1.5 * I_NOM)), 0, 1));
  // Velocità delle cariche nei fili: ferme quando la corrente è trascurabile (sotto 50 µA).
  const flowSpeed = (i) => (Math.abs(i) < 5e-5 ? 0 : EI.speedFor(i, I_NOM));

  /* ---------- piccoli strumenti per le animazioni ---------- */

  const rnd = (a, b) => a + Math.random() * (b - a);
  const BLUE_DIE = '#5b8cff'; // la luce blu del cristallo di un LED bianco
  let uid = 0;

  // Elementi SVG riciclati: take() ne accende uno libero, free() lo spegne.
  function pool(parent, n, make) {
    const items = [];
    for (let k = 0; k < n; k++) {
      const el = make(parent);
      el.style.display = 'none';
      items.push({ el: el, on: false });
    }
    return {
      items: items,
      take() {
        for (const it of items) if (!it.on) { it.on = true; it.el.style.display = ''; return it; }
        return null;
      },
      free(it) { it.on = false; it.el.style.display = 'none'; },
    };
  }

  // Un fotone: due periodi e mezzo d'onda lungo +x; il periodo è proporzionale alla lunghezza d'onda vera.
  function wavePath(nm) {
    const L = nm / 52;
    let d = 'M0 0';
    for (let k = 0; k < 5; k++) d += 'q' + (L / 4).toFixed(2) + ' ' + (k % 2 ? 2.6 : -2.6) + ' ' + (L / 2).toFixed(2) + ' 0';
    return d;
  }
  function place(el, x, y, ang) {
    el.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') rotate(' + (ang * 180 / Math.PI).toFixed(0) + ')');
  }
  function at(el, x, y) {
    el.setAttribute('cx', x.toFixed(1));
    el.setAttribute('cy', y.toFixed(1));
  }

  /* ---------- laboratorio ---------- */

  // Due composizioni per modo: larga (computer e tablet) e alta (telefono).
  const GEO = {
    led: {
      wide: { W: 640, H: 330, yT: 100, yB: 300, xL: 46, bY: 170, rX: 96, dX: 300, xR: 600, gX: 120, ledLab: [292, 78, 'end'], box: [150, 136, 410, 152] },
      tall: { W: 360, H: 470, yT: 104, yB: 444, xL: 26, bY: 378, rX: 64, dX: 196, xR: 336, gX: 200, ledLab: [188, 84, 'end'], box: [42, 134, 286, 250] },
    },
    zener: {
      wide: { W: 640, H: 330, yT: 76, yB: 296, xL: 46, bY: 156, rX: 96, zX: 236, zY: 214, lX: 330, lY: 154, oX: 404, zLab: [216, 178, 'end'], lLab: [313, 178, 'end'], oLab: [404, 178, 'middle'], box: [446, 20, 186, 294] },
      tall: { W: 360, H: 470, yT: 56, yB: 236, xL: 26, bY: 116, rX: 56, zX: 150, zY: 178, lX: 262, lY: 114, oX: 330, zLab: [170, 142, 'start'], lLab: [278, 142, 'start'], oLab: [346, 26, 'end'], box: [12, 258, 336, 202] },
    },
  };

  function mount(lab) {
    const svg = lab.svg;
    const P = EI.palette();
    const mq = window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;
    const RS_LIST = EI.seriesValues('E12', 100, 4700);
    const RL_LIST = EI.seriesValues('E12', 100, 47000).concat([Infinity]);
    const INK = '#e8f2ee';

    const st = {
      mode: 'led',
      color: 'rosso', vs: 5, r: 330,
      burnt: false, everBurnt: false, stress: 0, burnI: 0, burnT: -1,
      seenRed: false, seenBlue: false, ledI: 0,
      vz: '5.1', vin: 12, rz: 470, rl: 1000,
      d: { i: 0, iz: 0, ymax: 0.04, y2max: 0.125, ymaxZ: 8 },
    };

    /* --- grafici --- */
    const plotLed = lab.plot({
      title: 'Curve corrente-tensione · retta di carico', height: 230,
      x: { min: 0, max: 4, unit: 'V', count: 8, label: 'tensione sul LED', fmt: (v) => (Math.abs(v) < 1e-9 ? '0' : num(v, Math.abs(v - Math.round(v)) < 1e-9 ? 0 : 1)) + ' V' },
      y: { min: 0, max: 0.04, unit: 'A', count: 4, label: 'corrente' },
      legend: Object.keys(LEDS).map((k) => ({ label: LEDS[k].label.toLowerCase(), color: LEDS[k].color })).concat([{ label: 'retta di carico', color: INK }]),
      aria: 'Curve corrente-tensione dei cinque LED, con la retta di carico della pila e della resistenza e il punto di lavoro',
    });
    const plotZ = lab.plot({
      title: 'Transcaratteristica · Vout in funzione di Vin', height: 230,
      x: { min: 0, max: 20, unit: 'V', count: 10, label: 'Vin' },
      y: { min: 0, max: 8, unit: 'V', count: 4, label: 'Vout' },
      y2: { min: 0, max: 0.125, unit: 'A', color: P.t3 },
      legend: [{ label: 'Vout', color: 'var(--trace-1)' }, { label: 'Iz, corrente nello Zener', color: 'var(--trace-3)' }, { label: 'Iz massima (0,5 W)', color: 'var(--trace-4)' }],
      aria: 'Tensione d\'uscita e corrente nello Zener in funzione della tensione d\'ingresso, con il punto di lavoro',
    });

    /* --- strumenti --- */
    const rI = lab.readout({ label: 'Corrente I', fmt: fmtA, color: 'var(--trace-3)', max: I_MAX });
    const rV = lab.readout({ label: 'Tensione sul LED', unit: 'V', color: 'var(--trace-1)' });
    const rPl = lab.readout({ label: 'Potenza nel LED', fmt: fmtW, color: 'var(--trace-2)' });
    const rPr = lab.readout({ label: 'Potenza in R', fmt: fmtW, color: 'var(--trace-2)' });
    const rVo = lab.readout({ label: 'Uscita Vout', unit: 'V', color: 'var(--trace-1)' });
    const rIz = lab.readout({ label: 'Corrente Zener', fmt: fmtA, color: 'var(--trace-3)' });
    const rIl = lab.readout({ label: 'Corrente carico', fmt: fmtA, color: 'var(--trace-3)' });
    const rPz = lab.readout({ label: 'Potenza Zener', fmt: fmtW, color: 'var(--trace-2)', max: PZ_MAX });
    const ledReadouts = [rI, rV, rPl, rPr];
    const zReadouts = [rVo, rIz, rIl, rPz];

    /* --- comandi --- */
    const gTop = lab.group();
    lab.choice({
      into: gTop, label: 'Esperimento', value: 'led',
      options: [{ value: 'led', label: 'LED: luce colorata' }, { value: 'zener', label: 'Zener: tensione stabile' }],
      onChange: (v) => { st.mode = v; layout(); },
    });
    const gLed = lab.group('Pila, resistenza e LED');
    lab.choice({
      into: gLed, label: 'Colore del LED', value: 'rosso',
      options: Object.keys(LEDS).map((k) => ({ value: k, label: LEDS[k].label })),
      onChange: (v) => { st.color = v; if (S && S.kind === 'led') S.recolor(); },
    });
    lab.slider({ into: gLed, label: 'Tensione della pila Vs', min: 0, max: 12, step: 0.1, value: 5, fmt: (v) => num(v, 1) + ' V', onInput: (v) => { st.vs = Math.round(v * 10) / 10; } });
    lab.slider({ into: gLed, label: 'Resistenza R', min: 47, max: 4700, series: 'E12', value: 330, unit: 'Ω', onInput: (v) => { st.r = v; } });
    const btnNew = lab.button({ into: gLed, label: 'Sostituisci il LED', primary: true, onClick: () => replaceLed() });
    btnNew.hidden = true;

    const gZ = lab.group('Regolatore con lo Zener da 0,5 W');
    lab.choice({
      into: gZ, label: 'Tensione di Zener Vz', value: '5.1',
      options: Object.keys(ZENERS).map((k) => ({ value: k, label: ZENERS[k].label })),
      onChange: (v) => { st.vz = v; },
    });
    lab.slider({ into: gZ, label: 'Tensione d\'ingresso Vin', min: 0, max: 20, step: 0.1, value: 12, fmt: (v) => num(v, 1) + ' V', onInput: (v) => { st.vin = Math.round(v * 10) / 10; } });
    lab.slider({ into: gZ, label: 'Resistenza in serie Rs', min: 100, max: 4700, series: 'E12', value: 470, unit: 'Ω', onInput: (v) => { st.rz = v; } });
    lab.slider({
      into: gZ, label: 'Carico RL', min: 0, max: RL_LIST.length - 1, step: 1, value: RL_LIST.indexOf(1000),
      fmt: (k) => fmtR(RL_LIST[Math.round(k)]), onInput: (k) => { st.rl = RL_LIST[Math.round(k)]; },
    });

    lab.challenges([
      { id: 'quindici', text: 'Accendi il LED rosso a 15 mA con una pila da 5 V: calcola la [[resistenza-di-limitazione]] e scegli il valore E12 giusto.', check: (q) => q.mode === 'led' && q.color === 'rosso' && Math.abs(q.vs - 5) < 0.05 && !q.burnt && q.i >= 0.0135 && q.i <= 0.0165 },
      { id: 'soglia', text: 'Con 2,5 V il LED rosso si accende e quello blu no: provali tutti e due e scopri perché nella [[tensione-diretta]].', check: (q) => q.seenRed && q.seenBlue },
      { id: 'brucia', text: 'Brucia un LED (qui si può!), poi sostituiscilo e fallo lavorare tra 5 e 20 mA.', check: (q) => q.mode === 'led' && q.everBurnt && !q.burnt && q.i >= 0.005 && q.i <= 0.02 },
      { id: 'stabile', text: 'Con il [[diodo-zener|diodo Zener]] da 5,1 V, fai cambiare l\'uscita meno di 0,1 V mentre l\'ingresso va da 8 a 15 V.', check: (q) => q.mode === 'zener' && q.vz === '5.1' && q.dv <= 0.1 && q.v8 >= 4.85 && q.pz15 <= PZ_MAX },
      { id: 'potenza', text: 'Con 20 V in ingresso e senza carico, trova la Rs più piccola che tiene lo Zener da 5,1 V entro 0,5 W.', check: (q) => q.mode === 'zener' && q.vz === '5.1' && q.vin >= 19.95 && q.rl === Infinity && q.pz <= PZ_MAX && q.pzPrev > PZ_MAX },
    ]);

    /* --- lo schema --- */
    let S = null;

    function build() {
      const tall = !!(mq && mq.matches);
      const G = GEO[st.mode][tall ? 'tall' : 'wide'];
      lab.view(G.W, G.H);
      svg.classList.toggle('led-zener-tall', tall);
      svg.innerHTML = '';
      S = st.mode === 'led' ? buildLed(G) : buildZener(G);
      lab.invalidate();
    }

    // Etichetta su due righe (nome e valore) in un punto preciso dello schema.
    function tag(parent, at, name, value) {
      const t = s('text', { x: at[0], y: at[1], class: 'ei-sym-label', 'text-anchor': at[2] || 'start' }, parent);
      s('tspan', { class: 'name', text: name }, t);
      const v = s('tspan', { x: at[0], dy: '1.25em', class: 'value', text: value || '' }, t);
      return { el: t, set(text) { if (v.textContent !== text) v.textContent = text; } };
    }
    function setValue(label, text) {
      const v = label && label.querySelector('.value');
      if (v && v.textContent !== text) v.textContent = text;
    }

    function buildLed(G) {
      const g = s('g', { class: 'led-zener-led' }, svg);
      const gIn = s('g', { class: 'led-zener-inset-g' }, g);
      const gC = s('g', null, g);
      const { yT, yB, xL, xR } = G;
      const bat = sym.source(gC, { x: xL, y: G.bY, rot: 90, len: 60, kind: 'dc', label: 'Vs', value: '5,0 V', side: 1 });
      const res = sym.resistor(gC, { x: G.rX, y: yT, len: 64, label: 'R', value: '330 Ω' });
      const wA = wire(gC, [[xL, G.bY], [xL, yT], [G.rX, yT]]);
      const wB = wire(gC, [[G.rX + 64, yT], [G.dX, yT]]);
      const wC = wire(gC, [[G.dX + 56, yT], [xR, yT], [xR, yB], [xL, yB], [xL, G.bY + 60]]);
      sym.ground(gC, { x: G.gX, y: yB });
      const led = sym.diode(gC, { x: G.dX, y: yT, len: 56, kind: 'led' });
      const ledTag = tag(gC, G.ledLab, 'LED', '');
      const loop = s('path', { d: 'M' + xL + ' ' + G.bY + 'V' + yT + 'H' + xR + 'V' + yB + 'H' + xL + 'V' + (G.bY + 60), class: 'ei-wire', style: 'opacity:0' }, gC);
      const flow = new EI.Flow(gC, loop, { spacing: 20 });
      const gTop = s('g', { class: 'led-zener-fx' }, g);
      const out = {
        kind: 'led', G: G, g: g, bat: bat, res: res, led: led, ledTag: ledTag, wA: wA, wB: wB, wC: wC, flow: flow,
        fx: ledEffects(gIn, gTop, G),
        recolor() { ledTag.set(LEDS[st.color].label.toLowerCase()); },
      };
      out.recolor();
      return out;
    }

    // Riquadro "Dentro il LED" (cariche, ricombinazioni e fotoni), fotoni che escono dal simbolo,
    // surriscaldamento, lampo e fumo del LED che brucia.
    function ledEffects(gIn, gTop, G) {
      const [bx, by, bw, bh] = G.box;
      const cx = G.dX + 28;
      const cy = G.yT;
      const jx0 = bx + 12;
      const jx1 = bx + bw - 12;
      const py0 = by + 26; // striscia di fosforo (solo nel LED bianco)
      const jy0 = by + 44;
      const jy1 = by + bh - 28;
      const jc = (jx0 + jx1) / 2;
      const clipId = 'led-zener-clip-' + (++uid);
      const cp = s('clipPath', { id: clipId }, s('defs', null, gIn));
      s('rect', { x: bx, y: by, width: bw, height: bh, rx: 12 }, cp);
      s('path', { d: 'M' + (G.dX + 17) + ' ' + (cy + 11) + 'L' + (bx + 14) + ' ' + by + 'M' + (G.dX + 39) + ' ' + (cy + 11) + 'L' + (bx + bw - 14) + ' ' + by, class: 'led-zener-zoom' }, gIn);
      s('rect', { x: bx, y: by, width: bw, height: bh, rx: 12, class: 'led-zener-inset' }, gIn);
      s('text', { x: bx + 12, y: by + 17, class: 'led-zener-inset-title', text: 'DENTRO IL LED' }, gIn);
      legend(gIn, bx + bw - 12, by + 13, G.W < 500);
      const inner = s('g', { 'clip-path': 'url(#' + clipId + ')' }, gIn);
      const phos = s('g', null, inner);
      s('rect', { x: jx0, y: py0, width: jx1 - jx0, height: 12, rx: 3, class: 'led-zener-phosphor' }, phos);
      s('text', { x: jc, y: py0 + 9, class: 'led-zener-phos-text', 'text-anchor': 'middle', text: 'FOSFORO GIALLO' }, phos);
      s('rect', { x: jx0, y: jy0, width: jc - jx0, height: jy1 - jy0, rx: 4, class: 'ei-zone-p' }, inner);
      s('rect', { x: jc, y: jy0, width: jx1 - jc, height: jy1 - jy0, rx: 4, class: 'ei-zone-n' }, inner);
      const dep = s('rect', { x: jc - 12, y: jy0, width: 24, height: jy1 - jy0, class: 'ei-zone-dep' }, inner);
      s('text', { x: jx0 + 7, y: jy1 - 7, class: 'led-zener-zone p', text: 'P · anodo' }, inner);
      s('text', { x: jx1 - 7, y: jy1 - 7, class: 'led-zener-zone n', 'text-anchor': 'end', text: 'N · catodo' }, inner);
      const info = s('text', { x: bx + 12, y: by + bh - 10, class: 'led-zener-info' }, gIn);

      const NC = G.W < 500 ? 13 : 16;
      const ry = () => rnd(jy0 + 7, jy1 - 22); // la riga in basso resta libera per le scritte P e N
      const holes = [];
      const elec = [];
      for (let k = 0; k < NC; k++) {
        const hx = rnd(jx0 + 6, jc - 16);
        const ex = rnd(jc + 16, jx1 - 6);
        holes.push({ el: s('circle', { r: 4, class: 'ei-h' }, inner), x: hx, hx: hx, y: ry(), ph: rnd(0, 6.3), st: 0, a: 1 });
        elec.push({ el: s('circle', { r: 3.1, class: 'ei-e' }, inner), x: ex, hx: ex, y: ry(), ph: rnd(0, 6.3), st: 0, a: 1 });
      }
      const flashes = pool(inner, 8, (p) => s('circle', { r: 3, class: 'led-zener-flash' }, p));
      const inPh = pool(inner, 30, (p) => s('path', { class: 'ei-photon' }, p));
      const outPh = pool(gTop, 36, (p) => s('path', { class: 'ei-photon' }, p));
      const hot = s('circle', { cx: cx, cy: cy, r: 19, class: 'led-zener-hot' }, gTop);
      const scorch = s('ellipse', { cx: cx, cy: cy, rx: 17, ry: 11, class: 'led-zener-scorch' }, gTop);
      const burst = s('circle', { cx: cx, cy: cy, r: 10, class: 'led-zener-burst' }, gTop);
      const smoke = [];
      for (let k = 0; k < 8; k++) smoke.push({ el: s('circle', { r: 4, class: 'led-zener-smoke' }, gTop), t: 99 });
      const pairs = [];
      let wd = 26;
      let acc = 0;
      let accOut = 0;
      let tt = 0;
      let burstT = 99;
      let lastInfo = '';

      function drift(c, dir, vd, dt, edge) {
        if (c.st === 1) {
          c.t += dt / 0.22;
          const q = Math.min(1, c.t);
          c.x = c.x0 + (c.tx - c.x0) * q * q;
          c.y = c.y0 + (c.ty - c.y0) * q * q;
          if (c.t >= 1) c.st = 2;
          return;
        }
        if (c.st === 2) return;
        c.a = Math.min(1, c.a + dt * 2.5);
        // LED spento: le cariche tornano a sparpagliarsi nella loro zona
        if (!vd) { c.x += (c.hx - c.x) * Math.min(1, dt * 1.2); return; }
        c.x += dir * vd * dt;
        if ((edge - c.x) * dir < 0) c.x = edge - dir * Math.random() * 2;
      }
      // La lacuna più avanzata e l'elettrone più avanzato si incontrano nella giunzione.
      function pair(edgeP, edgeN) {
        let h = null;
        let e = null;
        for (const c of holes) if (c.st === 0 && (!h || c.x > h.x)) h = c;
        for (const c of elec) if (c.st === 0 && (!e || c.x < e.x)) e = c;
        if (!h || !e || edgeP - h.x > 26 || e.x - edgeN > 26) return false;
        const y = (h.y + e.y) / 2;
        h.st = 1; e.st = 1; h.t = 0; e.t = 0;
        h.x0 = h.x; h.y0 = h.y; h.tx = jc - 2; h.ty = y;
        e.x0 = e.x; e.y0 = e.y; e.tx = jc + 2; e.ty = y;
        pairs.push({ h: h, e: e, y: y });
        return true;
      }
      function respawn(c, x) { c.x = x; c.y = ry(); c.st = 0; c.a = 0; }
      function emitIn(y, c) {
        const it = inPh.take();
        if (!it) return;
        it.nm = c.nm; it.col = c.white ? BLUE_DIE : c.color; it.conv = !c.white;
        it.x = jc; it.y = y; it.ang = rnd(-150, -30) * Math.PI / 180; it.v = rnd(95, 135); it.life = 0;
        it.el.setAttribute('d', wavePath(it.nm));
        it.el.style.stroke = it.col;
      }
      function emitOut(c) {
        const it = outPh.take();
        if (!it) return;
        let nm = c.nm;
        let col = c.color;
        if (c.white) { if (Math.random() < 0.55) { nm = PHOSPHOR.nm; col = PHOSPHOR.color; } else col = BLUE_DIE; }
        it.x = cx + rnd(-5, 5); it.y = cy - 9; it.ang = rnd(-128, -52) * Math.PI / 180; it.v = rnd(80, 104); it.life = 0; it.max = rnd(0.62, 0.86);
        it.el.setAttribute('d', wavePath(nm));
        it.el.style.stroke = col;
      }

      function sim(dt, o) {
        tt += dt;
        const c = LEDS[o.color];
        const on = !o.burnt && o.i > 5e-5; // sotto i 50 µA il LED è spento: le cariche non si muovono
        const k = o.i / I_NOM;
        // zona di svuotamento: larga a LED spento, sottile quando la corrente passa (scala logaritmica)
        const u = o.burnt ? 0 : clamp((Math.log10(Math.max(o.i, 1e-9)) + 6.5) / 3.5, 0, 1);
        wd = EI.approach(wd, 6 + 20 * (1 - u), dt, 6);
        const edgeP = jc - wd / 2 - 4;
        const edgeN = jc + wd / 2 + 4;
        const vd = on ? 8 + 62 * Math.sqrt(Math.min(1.5, k)) : 0;
        for (const h of holes) drift(h, 1, vd, dt, edgeP);
        for (const e of elec) drift(e, -1, vd, dt, edgeN);
        if (on) {
          acc = Math.min(3, acc + dt * Math.min(14, 7 * k));
          while (acc >= 1 && pair(edgeP, edgeN)) acc -= 1;
        }
        for (let n = pairs.length - 1; n >= 0; n--) {
          const p = pairs[n];
          if (p.h.st !== 2 || p.e.st !== 2) continue;
          const f = flashes.take();
          if (f) { f.t = 0; at(f.el, jc, p.y); f.el.style.stroke = c.white ? BLUE_DIE : c.color; }
          emitIn(p.y, c);
          respawn(p.h, jx0 + 4 + Math.random() * 14);
          respawn(p.e, jx1 - 4 - Math.random() * 14);
          pairs.splice(n, 1);
        }
        for (const it of inPh.items) {
          if (!it.on) continue;
          it.life += dt;
          it.x += Math.cos(it.ang) * it.v * dt;
          it.y += Math.sin(it.ang) * it.v * dt;
          if (!it.conv && it.y < py0 + 12) {
            // il fosforo assorbe una parte della luce blu e la riemette gialla
            it.conv = true;
            if (Math.random() < 0.6) { it.nm = PHOSPHOR.nm; it.col = PHOSPHOR.color; it.el.setAttribute('d', wavePath(it.nm)); it.el.style.stroke = it.col; }
          }
          if (it.y < by + 2 || it.x < bx - 40 || it.x > bx + bw + 40) inPh.free(it);
        }
        if (on) {
          accOut = Math.min(4, accOut + dt * Math.min(40, 24 * k));
          while (accOut >= 1) { accOut -= 1; emitOut(c); }
        }
        for (const it of outPh.items) {
          if (!it.on) continue;
          it.life += dt;
          it.x += Math.cos(it.ang) * it.v * dt;
          it.y += Math.sin(it.ang) * it.v * dt;
          if (it.life > it.max) outPh.free(it);
        }
        for (const f of flashes.items) {
          if (!f.on) continue;
          f.t += dt / 0.4;
          if (f.t >= 1) flashes.free(f);
        }
        burstT += dt;
        for (const p of smoke) p.t += dt;
      }

      function render(o) {
        const c = LEDS[o.color];
        dep.setAttribute('x', (jc - wd / 2).toFixed(1));
        dep.setAttribute('width', wd.toFixed(1));
        for (const list of [holes, elec]) {
          for (const q of list) {
            const w = q.st === 0 ? 1.6 : 0;
            at(q.el, q.x + w * Math.sin(tt * 1.9 + q.ph), q.y + w * Math.cos(tt * 1.4 + q.ph * 1.3));
            q.el.style.opacity = q.a.toFixed(2);
          }
        }
        for (const f of flashes.items) {
          if (!f.on) continue;
          f.el.setAttribute('r', (3 + 11 * f.t).toFixed(1));
          f.el.style.opacity = (1 - f.t).toFixed(2);
        }
        for (const it of inPh.items) {
          if (!it.on) continue;
          place(it.el, it.x, it.y, it.ang);
          it.el.style.opacity = (Math.min(1, it.life * 8) * clamp((it.y - by - 4) / 22, 0, 1)).toFixed(2);
        }
        for (const it of outPh.items) {
          if (!it.on) continue;
          place(it.el, it.x, it.y, it.ang);
          it.el.style.opacity = (Math.min(1, it.life * 7) * (1 - Math.pow(it.life / it.max, 3))).toFixed(2);
        }
        phos.style.display = c.white ? '' : 'none';
        gIn.classList.toggle('led-zener-dim', o.burnt);
        const text = o.burnt ? 'LED interrotto: il circuito è aperto' : c.mat.replace(' + fosforo', '') + ' · ' + num(HC / c.nm, 2) + ' eV → ' + c.nm + ' nm' + (c.white ? ' + fosforo' : '');
        if (text !== lastInfo) { info.textContent = text; lastInfo = text; }
        // surriscaldamento, lampo e fumo
        hot.style.opacity = o.burnt ? '0' : (o.stress * (0.55 + 0.45 * Math.sin(tt * 16))).toFixed(2);
        scorch.style.opacity = o.burnt ? '1' : '0';
        const bt = burstT / 0.35;
        burst.style.opacity = !lab.reduced && o.burnt && bt < 1 ? (0.95 * (1 - bt)).toFixed(2) : '0';
        if (bt < 1) burst.setAttribute('r', (10 + 46 * bt).toFixed(1));
        smoke.forEach((p, k) => {
          let op = 0;
          if (lab.reduced) {
            if (o.burnt && k < 3) {
              at(p.el, cx + [-6, 5, -2][k], cy - [22, 36, 52][k]);
              p.el.setAttribute('r', [7, 9, 11][k]);
              op = [0.34, 0.26, 0.18][k];
            }
          } else if (o.burnt && p.t >= 0 && p.t < 2.4) {
            const life = p.t / 2.4;
            at(p.el, p.x + p.vx * p.t + 3 * Math.sin(p.t * 3 + p.ph), p.y + p.vy * p.t);
            p.el.setAttribute('r', (p.r0 + 13 * life).toFixed(1));
            op = 0.55 * Math.min(1, p.t / 0.2) * (1 - life);
          }
          p.el.style.opacity = op.toFixed(2);
        });
      }

      return {
        step(dt, o) {
          if (lab.reduced) for (let k = 0; k < 36; k++) sim(1 / 30, o); // istantanea: un attimo di simulazione
          else sim(dt, o);
          render(o);
        },
        burn() {
          burstT = 0;
          smoke.forEach((p, k) => {
            p.t = -k * 0.1; p.x = cx + rnd(-5, 5); p.y = cy - 6; p.vx = rnd(-12, 12); p.vy = -rnd(26, 40); p.r0 = rnd(3, 5); p.ph = rnd(0, 6);
          });
        },
        clearBurn() { burstT = 99; smoke.forEach((p) => { p.t = 99; }); },
      };
    }

    // Legenda dei riquadri: elettrone (pallino azzurro) e lacuna (cerchietto ambra).
    function legend(parent, x, y, big) {
      const k = big ? 1.12 : 1; // sul telefono le scritte sono più grandi
      const lg = s('g', { transform: 'translate(' + x + ',' + y + ')' }, parent);
      s('text', { x: 0, y: 3.5, class: 'led-zener-legend', 'text-anchor': 'end', text: 'lacuna' }, lg);
      s('circle', { cx: -42 * k, cy: 0, r: 3.6, class: 'ei-h' }, lg);
      s('text', { x: -53 * k, y: 3.5, class: 'led-zener-legend', 'text-anchor': 'end', text: 'elettrone' }, lg);
      s('circle', { cx: -107 * k, cy: 0, r: 3, class: 'ei-e' }, lg);
    }

    function buildZener(G) {
      const g = s('g', { class: 'led-zener-zener' }, svg);
      const gIn = s('g', { class: 'led-zener-inset-g' }, g);
      const gC = s('g', null, g);
      const { yT, yB, xL, zX, zY, lX, lY, oX } = G;
      const zTop = zY - 56;
      const bat = sym.source(gC, { x: xL, y: G.bY, rot: 90, len: 60, kind: 'dc', label: 'Vin', value: '12,0 V', side: 1 });
      const res = sym.resistor(gC, { x: G.rX, y: yT, len: 64, label: 'Rs', value: '470 Ω' });
      const wIn = wire(gC, [[xL, G.bY], [xL, yT], [G.rX, yT]]);
      const wOut = wire(gC, 'M' + (G.rX + 64) + ' ' + yT + 'H' + (oX - 5) + 'M' + zX + ' ' + yT + 'V' + zTop + 'M' + lX + ' ' + yT + 'V' + lY);
      const wGnd = wire(gC, 'M' + zX + ' ' + zY + 'V' + yB + 'M' + lX + ' ' + (lY + 64) + 'V' + yB + 'M' + xL + ' ' + (G.bY + 60) + 'V' + yB + 'H' + (oX - 5));
      dot(gC, zX, yT);
      dot(gC, lX, yT);
      dot(gC, zX, yB);
      dot(gC, lX, yB);
      const heat = s('circle', { cx: zX, cy: zY - 28, r: 24, class: 'led-zener-heat' }, gC);
      const zen = sym.diode(gC, { x: zX, y: zY, rot: 270, len: 56, kind: 'zener' });
      const loadG = s('g', { class: 'led-zener-load' }, gC);
      sym.resistor(loadG, { x: lX, y: lY, rot: 90, len: 64 });
      s('circle', { cx: oX, cy: yT, r: 5, class: 'led-zener-term' }, gC);
      s('circle', { cx: oX, cy: yB, r: 5, class: 'led-zener-term' }, gC);
      sym.ground(gC, { x: (xL + zX) / 2 + 10, y: yB });
      const zTag = tag(gC, G.zLab, 'DZ', '');
      const lTag = tag(gC, G.lLab, 'RL', '');
      const oTag = tag(gC, G.oLab, 'Vout', '');
      const path = (d) => s('path', { d: d, class: 'ei-wire', style: 'opacity:0' }, gC);
      const flows = {
        in: new EI.Flow(gC, path('M' + xL + ' ' + G.bY + 'V' + yT + 'H' + zX), { spacing: 20 }),
        z: new EI.Flow(gC, path('M' + zX + ' ' + yT + 'V' + yB), { spacing: 20 }),
        l: new EI.Flow(gC, path('M' + zX + ' ' + yT + 'H' + lX + 'V' + yB), { spacing: 20 }),
        r1: new EI.Flow(gC, path('M' + lX + ' ' + yB + 'H' + zX), { spacing: 20 }),
        r2: new EI.Flow(gC, path('M' + zX + ' ' + yB + 'H' + xL + 'V' + (G.bY + 60)), { spacing: 20 }),
      };
      return {
        kind: 'zener', G: G, g: g, bat: bat, res: res, zen: zen, heat: heat, loadG: loadG, zTag: zTag, lTag: lTag, oTag: oTag,
        wIn: wIn, wOut: wOut, wGnd: wGnd, flows: flows, fx: zenerEffects(gIn, G),
      };
    }

    // Riquadro "Dentro lo Zener": giunzione in inversa, con il campo nella zona di svuotamento e il cedimento
    // per effetto tunnel (elettroni che la attraversano) o per valanga (urti che liberano nuove cariche).
    function zenerEffects(gIn, G) {
      const tall = G.W < 500;
      const [bx, by, bw, bh] = G.box;
      const jx0 = bx + 12;
      const jx1 = bx + bw - 12;
      const jy0 = by + 28;
      const jy1 = by + bh - (tall ? 40 : 54);
      const jm = (jy0 + jy1) / 2;
      const jh = jy1 - jy0;
      const clipId = 'led-zener-clip-' + (++uid);
      const cp = s('clipPath', { id: clipId }, s('defs', null, gIn));
      s('rect', { x: bx, y: by, width: bw, height: bh, rx: 12 }, cp);
      const frame = s('rect', { x: bx, y: by, width: bw, height: bh, rx: 12, class: 'led-zener-inset' }, gIn);
      s('text', { x: bx + 12, y: by + 17, class: 'led-zener-inset-title', text: tall ? 'DENTRO LO ZENER' : 'DENTRO LO ZENER' }, gIn);
      if (tall) legend(gIn, bx + bw - 12, by + 13, true);
      const inner = s('g', { 'clip-path': 'url(#' + clipId + ')' }, gIn);
      const nZ = s('rect', { x: jx0, y: jy0, width: jx1 - jx0, height: jh / 2, rx: 4, class: 'ei-zone-n' }, inner);
      const pZ = s('rect', { x: jx0, y: jm, width: jx1 - jx0, height: jh / 2, rx: 4, class: 'ei-zone-p' }, inner);
      const dep = s('rect', { x: jx0, y: jm - 10, width: jx1 - jx0, height: 20, class: 'ei-zone-dep' }, inner);
      const NA = tall ? 7 : 4;
      const arrows = [];
      for (let k = 0; k < NA; k++) arrows.push(s('path', { class: 'led-zener-field' }, inner));
      s('text', { x: jx0 + 7, y: jy0 + 14, class: 'led-zener-zone n', text: 'N · catodo' }, inner);
      s('text', { x: jx0 + 7, y: jy1 - 6, class: 'led-zener-zone p', text: 'P · anodo' }, inner);
      const lines = [0, 1, 2].slice(0, tall ? 2 : 3).map((k) => s('text', { x: bx + 12, y: by + bh - (tall ? 24 : 38) + k * 14, class: k ? 'led-zener-note' : 'led-zener-info' }, gIn));
      const NB = tall ? 14 : 11;
      const maj = [];
      for (let k = 0; k < NB; k++) {
        maj.push({ el: s('circle', { r: 3.1, class: 'ei-e' }, inner), side: -1, x: rnd(jx0 + 8, jx1 - 8), f: Math.random(), ph: rnd(0, 6.3) });
        maj.push({ el: s('circle', { r: 3.8, class: 'ei-h' }, inner), side: 1, x: rnd(jx0 + 8, jx1 - 8), f: Math.random(), ph: rnd(0, 6.3) });
      }
      // elettroni con la scia: la scia si allunga mentre il campo li accelera
      const eP = pool(inner, 26, (p) => { const g = s('g', null, p); s('path', { class: 'led-zener-trail' }, g); s('circle', { r: 3.1, class: 'ei-e' }, g); return g; });
      eP.items.forEach((it) => { it.trail = it.el.firstChild; });
      const hP = pool(inner, 26, (p) => s('circle', { r: 3.8, class: 'ei-h' }, p));
      const trails = pool(inner, 8, (p) => s('path', { class: 'led-zener-tunnel' }, p));
      const rings = pool(inner, 10, (p) => s('circle', { r: 3, class: 'led-zener-ion' }, p));
      let wd = 12;
      let acc = 0;
      let tt = 0;
      let lastKey = '';

      function addE(x, y, vy, accel, gen) {
        const it = eP.take();
        if (!it) return;
        it.x = x; it.y = y; it.vy = vy; it.accel = accel; it.gen = gen; it.life = 0;
        it.hit = !accel || gen >= 2 || Math.random() > (gen === 0 ? 0.95 : 0.55);
        it.yHit = y - rnd(0.25, 0.6) * Math.max(0, y - (jm - wd / 2));
      }
      function addH(x, y, vy) {
        const it = hP.take();
        if (!it) return;
        it.x = x; it.y = y; it.vy = vy; it.life = 0;
      }
      function event(mech) {
        const m = mech === 'misto' ? (Math.random() < 0.5 ? 'tunnel' : 'valanga') : mech;
        const x = rnd(jx0 + 10, jx1 - 10);
        const top = jm - wd / 2;
        const bot = jm + wd / 2;
        if (m === 'tunnel') {
          // l'elettrone di valenza del lato P ricompare oltre la zona, sul lato N: effetto tunnel
          const t = trails.take();
          if (t) { t.t = 0; t.el.setAttribute('d', 'M' + x.toFixed(1) + ' ' + (bot + 2).toFixed(1) + 'V' + (top - 2).toFixed(1)); }
          addE(x, top - 2, -50, false, 0);
          addH(x, bot + 2, 42);
        } else {
          addE(x, bot - 1, -22, true, 0);
        }
      }

      function sim(dt, o) {
        tt += dt;
        const z = ZENERS[o.key];
        wd = EI.approach(wd, z.dep * jh * Math.sqrt(clamp(o.vout / z.vz, 0.04, 1)), dt, 5);
        if (o.iz > 2e-5) {
          acc = Math.min(3, acc + dt * Math.min(14, 8 * Math.sqrt(o.iz / 0.01)));
          while (acc >= 1) { acc -= 1; event(z.mech); }
        }
        const top = jm - wd / 2;
        for (const e of eP.items) {
          if (!e.on) continue;
          e.life += dt;
          if (e.accel) {
            e.vy -= 330 * dt; // il campo accelera l'elettrone verso il lato N
            e.y += e.vy * dt;
            if (!e.hit && e.y <= e.yHit) {
              // urto: l'elettrone strappa un altro elettrone a un legame e lascia una lacuna
              e.hit = true;
              const r = rings.take();
              if (r) { r.t = 0; at(r.el, e.x, e.y); }
              addE(e.x + rnd(-7, 7), e.y, -14, true, e.gen + 1);
              addH(e.x, e.y, 46);
              e.vy *= 0.3;
            }
            if (e.y < top) { e.accel = false; e.vy = -48; }
          } else e.y += e.vy * dt;
          if (e.y < top - 34) eP.free(e); // oltre la zona si confonde con gli altri elettroni del lato N
        }
        for (const h of hP.items) {
          if (!h.on) continue;
          h.life += dt;
          h.y += h.vy * dt;
          if (h.y > jm + wd / 2 + 34) hP.free(h);
        }
        for (const list of [trails, rings]) {
          for (const it of list.items) {
            if (!it.on) continue;
            it.t += dt / 0.6;
            if (it.t >= 1) list.free(it);
          }
        }
      }

      function render(o) {
        const z = ZENERS[o.key];
        const top = jm - wd / 2;
        const bot = jm + wd / 2;
        dep.setAttribute('y', top.toFixed(1));
        dep.setAttribute('height', wd.toFixed(1));
        nZ.setAttribute('height', Math.max(0, top - jy0).toFixed(1));
        pZ.setAttribute('y', bot.toFixed(1));
        pZ.setAttribute('height', Math.max(0, jy1 - bot).toFixed(1));
        const fieldOp = (0.2 + 0.65 * clamp(o.vout / z.vz, 0, 1)).toFixed(2);
        arrows.forEach((a, k) => {
          const x = jx0 + (k + 0.5) * (jx1 - jx0) / NA;
          a.setAttribute('d', wd > 12 ? 'M' + x.toFixed(1) + ' ' + (top + 3).toFixed(1) + 'V' + (bot - 4).toFixed(1) + 'M' + (x - 3).toFixed(1) + ' ' + (bot - 8).toFixed(1) + 'L' + x.toFixed(1) + ' ' + (bot - 4).toFixed(1) + 'L' + (x + 3).toFixed(1) + ' ' + (bot - 8).toFixed(1) : '');
          a.style.opacity = fieldOp;
        });
        for (const q of maj) {
          // le righe delle scritte N (in alto) e P (in basso) restano libere
          const y = q.side < 0 ? jy0 + 24 + q.f * Math.max(0, top - jy0 - 30) : bot + 6 + q.f * Math.max(0, jy1 - bot - 26);
          at(q.el, q.x + 1.6 * Math.sin(tt * 1.7 + q.ph), y + 1.4 * Math.cos(tt * 1.3 + q.ph));
        }
        for (const e of eP.items) {
          if (!e.on) continue;
          e.el.setAttribute('transform', 'translate(' + e.x.toFixed(1) + ',' + e.y.toFixed(1) + ')');
          const tl = e.accel ? Math.min(18, Math.abs(e.vy) * 0.07) : 0;
          e.trail.setAttribute('d', tl > 1.5 ? 'M0 3V' + (3 + tl).toFixed(1) : 'M0 0');
          e.el.style.opacity = (clamp(e.life * 10, 0, 1) * clamp(1 - (top - e.y) / 34, 0, 1)).toFixed(2);
        }
        for (const h of hP.items) if (h.on) { at(h.el, h.x, h.y); h.el.style.opacity = (clamp(h.life * 10, 0, 1) * clamp(1 - (h.y - bot) / 34, 0, 1)).toFixed(2); }
        for (const t of trails.items) if (t.on) t.el.style.opacity = (1 - t.t).toFixed(2);
        for (const r of rings.items) {
          if (!r.on) continue;
          r.el.setAttribute('r', (3 + 12 * r.t).toFixed(1));
          r.el.style.opacity = (1 - r.t).toFixed(2);
        }
        frame.classList.toggle('hot', o.hot);
        const mech = o.iz > 2e-5 ? z.mech : 'riposo';
        const key = mech + (tall ? 't' : 'w');
        if (key !== lastKey) {
          lastKey = key;
          const T = {
            tunnel: ['Effetto Zener', 'gli elettroni passano', 'la zona per effetto tunnel'],
            misto: ['Zener e valanga insieme', 'verso i 5 V i due', 'meccanismi si sommano'],
            valanga: ['Effetto valanga', 'ogni urto libera', 'nuove cariche'],
            riposo: ['Sotto Vz: niente cedimento', 'la zona si allarga, ma il', 'campo non basta ancora'],
          }[mech];
          if (tall) { lines[0].textContent = T[0]; lines[1].textContent = T[1] + ' ' + T[2]; }
          else T.forEach((x, k) => { lines[k].textContent = x; });
        }
      }

      return {
        step(dt, o) {
          if (lab.reduced) for (let k = 0; k < 30; k++) sim(1 / 30, o);
          else sim(dt, o);
          render(o);
        },
      };
    }

    /* --- il LED che brucia e quello nuovo --- */
    function burn(i) {
      st.burnt = true;
      st.everBurnt = true;
      st.burnI = i;
      st.burnT = 0;
      st.stress = 0;
      if (S && S.fx && S.fx.burn) S.fx.burn();
    }
    function replaceLed() {
      const op = model.ledPoint(st.color, st.vs, st.r);
      if (op.i > I_MAX) return;
      st.burnt = false;
      st.burnT = -1;
      st.stress = 0;
      if (S && S.fx && S.fx.clearBurn) S.fx.clearBurn();
    }

    function layout() {
      const isLed = st.mode === 'led';
      gLed.hidden = !isLed;
      gZ.hidden = isLed;
      ledReadouts.forEach((r) => { r.el.hidden = !isLed; });
      zReadouts.forEach((r) => { r.el.hidden = isLed; });
      plotLed.figure.hidden = !isLed;
      plotZ.figure.hidden = isLed;
      build();
      lab.plots.forEach((p) => p.resize());
      lab.invalidate();
    }

    /* --- modo LED --- */
    function stepLed(dt) {
      const c = LEDS[st.color];
      const j = model.led(st.color);
      const op = model.ledPoint(st.color, st.vs, st.r);
      if (!st.burnt) {
        if (op.i > I_MAX) st.stress = lab.reduced ? 1 : st.stress + dt * 1.6 * (Math.pow(op.i / I_MAX, 2) - 1);
        else st.stress = Math.max(0, st.stress - dt * 0.8);
        if (st.stress >= 1) burn(op.i);
      }
      if (st.burnt && st.burnT >= 0) st.burnT += dt;
      const i = st.burnt ? 0 : op.i;
      const vled = st.burnt ? st.vs : op.v;
      st.ledI = i;
      if (!st.burnt && Math.abs(st.vs - 2.5) < 0.051) {
        if (st.color === 'rosso' && i >= 0.0005) st.seenRed = true;
        if (st.color === 'blu' && i < 0.0001) st.seenBlue = true;
      }
      st.d.i = ease(st.d.i, i, dt, 9);
      btnNew.hidden = !st.burnt;
      btnNew.disabled = st.burnt && op.i > I_MAX;
      btnNew.title = btnNew.disabled ? 'Prima riporta la corrente sotto i 30 mA' : '';

      // schema
      S.wA.style.stroke = EI.vcolor(st.vs, 12);
      S.wB.style.stroke = EI.vcolor(vled, 12);
      S.wC.style.stroke = EI.vcolor(0, 12);
      S.flow.set(flowSpeed(st.d.i));
      S.flow.step(dt);
      // la luce cresce con la corrente; sotto sforzo il colore sbianca, poi un lampo bianco quando cede
      let glow = st.burnt ? 0 : brightness(st.d.i);
      let glowCol = c.color;
      if (!st.burnt && st.stress > 0) glowCol = EI.mix(c.color, '#ffffff', clamp(st.stress, 0, 1) * 0.7);
      if (st.burnt && !lab.reduced && st.burnT >= 0 && st.burnT < 0.12) { glow = 1; glowCol = '#ffffff'; }
      S.led.setGlow(glow, glowCol);
      S.led.g.classList.toggle('led-zener-burnt', st.burnt && glow === 0);
      S.fx.step(dt, { i: st.d.i, burnt: st.burnt, color: st.color, stress: clamp(st.stress, 0, 1) });
      setValue(S.bat.label, num(st.vs, 1) + ' V');
      setValue(S.res.label, si(st.r, 'Ω', { trim: true }));

      // strumenti
      rI.set(i);
      rI.state(st.burnt || op.i > I_MAX ? 'danger' : i > I_NOM + 1e-6 ? 'warn' : i >= 0.005 ? 'ok' : '');
      rV.set(vled);
      if (st.burnt) { rPl.text('bruciato'); rPl.state('danger'); } else { rPl.set(vled * i); rPl.state(''); }
      const pr = st.r * i * i;
      rPr.set(pr);
      rPr.state(pr > 0.25 ? 'warn' : '');

      // grafico
      const yt = st.d.i * 1.25 <= 0.04 ? 0.04 : Math.ceil(st.d.i * 1.25 / 0.05) * 0.05;
      st.d.ymax = ease(st.d.ymax, yt, dt, 5);
      plotLed.setRange('y', 0, st.d.ymax);
      plotLed.opts.x.count = plotLed.w && plotLed.w < 460 ? 4 : 8;
      plotLed.clear();
      plotLed.band(0.01, 0.02, { color: P.t1, alpha: 0.07 });
      plotLed.hline(I_MAX, { color: P.t4, alpha: 0.75, label: 'massimo 30 mA', at: 'left' });
      const keys = Object.keys(LEDS).filter((k) => k !== st.color).concat([st.color]);
      for (const k of keys) {
        const jk = model.led(k);
        const pts = [];
        for (let m = 0; m <= 70; m++) { const x = st.d.ymax * Math.pow(m / 70, 1.5); pts.push([vAt(jk, x), x]); }
        const sel = k === st.color;
        plotLed.line(pts, { color: LEDS[k].color, width: sel ? 2.8 : 1.3, alpha: sel ? 1 : 0.32, glow: sel });
      }
      if (st.vs > 0) plotLed.line([[0, st.vs / st.r], [st.vs, 0]], { color: INK, width: 1.6, dash: [7, 5], glow: false, alpha: 0.85 });
      if (st.burnt) plotLed.point(Math.min(st.vs, 3.95), 0, { color: P.t4, r: 4, label: 'LED interrotto', labelPos: 'up' });
      else if (i > 1e-6) plotLed.point(vAt(j, st.d.i), st.d.i, { color: c.color, r: 5, label: fmtA(i) + ' · ' + fmtV(vled), labelPos: 'left' });
      // etichetta della fascia consigliata, a destra, nella metà che la retta di carico lascia libera
      if (st.d.ymax < 0.08 && plotLed.w >= 560) {
        const xa = plotLed.invX(plotLed.px1 - 160);
        const mid = (st.vs - (xa + 4) / 2) / st.r;
        const yTag = st.vs > xa && mid > 0.0085 && mid < 0.0215 ? (mid > 0.015 ? 0.0122 : 0.0178) : 0.015;
        plotLed.tag(plotLed.px1 - 6, plotLed.Y(yTag), '10–20 mA consigliati', P.t1, 'left');
      }

      lab.explain(explainLed(op, i, vled));
    }

    function explainLed(op, i, vled) {
      const c = LEDS[st.color];
      const ev = model.photonEnergy(c.nm);
      const name = c.label.toLowerCase();
      if (st.burnt) {
        return 'Il LED si è <b>bruciato</b>: la corrente era salita a <b>' + fmtA(st.burnI) + '</b>, oltre il massimo di 30 mA, e la giunzione si è surriscaldata in un attimo. ' +
          'Ora il circuito è aperto: non passa corrente e tutta la tensione della pila, ' + fmtV(st.vs) + ', cade sul LED guasto. ' +
          'Per questo serve la [[resistenza-di-limitazione]]: R = (Vs − Vf) / I. ' +
          (op.i > I_MAX ? 'Con questi valori anche un LED nuovo brucerebbe (' + fmtA(op.i) + '): alza R o abbassa Vs, poi premi <b>Sostituisci il LED</b>.' : 'Adesso la corrente sarebbe ' + fmtA(op.i) + ': premi <b>Sostituisci il LED</b>.');
      }
      if (op.i > I_MAX) {
        return 'Attenzione: <b>' + fmtA(op.i) + '</b>, oltre il massimo di 30 mA. Il LED dissipa ' + fmtW(op.v * op.i) + ' e la giunzione si scalda più in fretta di quanto riesca a raffreddarsi: tra un attimo cede. Alza subito la resistenza!' +
          (op.i < 1.5 * I_MAX ? ' Qui il tempo è accelerato: nella realtà un piccolo eccesso lo rovinerebbe più lentamente.' : '');
      }
      if (st.vs < 0.05) return 'Pila a zero: nessuna corrente e nessuna luce. Alza la tensione e guarda a quale valore il LED ' + name + ' comincia ad accendersi.';
      if (i < 5e-5) {
        const v1 = model.ledV(st.color, 0.001);
        let msg = 'Il LED ' + name + ' resta spento. Ai suoi capi arrivano ' + fmtV(vled) + ', meno della sua [[tensione-diretta]]: per avere almeno 1 mA ne servono ' + fmtV(v1) + '. ' +
          'La barriera della [[giunzione-pn]] resta alta e passano appena ' + fmtA(i) + '.';
        if (ev > 2.3) msg += ' Ogni [[fotone]] ' + c.light + ' porta ' + num(ev, 2) + ' eV: un elettrone può crearlo solo se la pila gli ha dato almeno quell\'energia, cioè quasi ' + num(ev, 1) + ' volt. Un fotone rosso ne chiede meno di 2.';
        return msg;
      }
      if (i < 0.002) {
        return 'Il LED ' + name + ' si accende appena: <b>' + fmtA(i) + '</b>. Ai suoi capi ci sono ' + fmtV(vled) + ', vicino alla [[tensione-diretta]]: qui pochi centesimi di volt in più moltiplicano la corrente. La luce cresce con la corrente; per una spia bastano 2–5 mA.';
      }
      if (i <= I_NOM + 1e-6) {
        let msg = 'Punto di lavoro: <b>' + fmtA(i) + '</b> con <b>' + fmtV(vled) + '</b> sul LED. Il resto, ' + fmtV(st.vs - vled) + ', cade sulla resistenza: è lei a fissare la corrente, I = (Vs − Vf) / R. ' +
          'Ogni [[ricombinazione]] di un elettrone con una [[lacuna]] libera un [[fotone]] da ' + num(ev, 2) + ' eV: luce ' + c.light + ' a ' + c.nm + ' nm.';
        if (c.white) msg += ' Il LED bianco è un LED blu ricoperto di [[fosforo|fosforo]] giallo: una parte dei fotoni blu diventa gialla e insieme sembrano bianchi.';
        else if (ev > 2.3) msg += ' Fotoni più energetici chiedono più tensione: il LED ' + name + ' ha bisogno di circa 3 V, il rosso di 2.';
        return msg;
      }
      return 'Siamo a <b>' + fmtA(i) + '</b>: più dei 20 mA consigliati, ancora sotto il massimo di 30 mA. Il LED fa più luce ma scalda di più (' + fmtW(vled * i) + ') e invecchia prima: una resistenza un po\' più grande lo farebbe lavorare tranquillo.';
    }

    /* --- modo Zener --- */
    let zCurve = null;
    function zenerCurve() {
      const key = st.vz + '|' + st.rz + '|' + st.rl;
      if (zCurve && zCurve.key === key) return zCurve;
      const pts = [];
      for (let k = 0; k <= 200; k++) {
        const vin = 20 * k / 200;
        const p = model.zenerPoint(st.vz, vin, st.rz, st.rl);
        pts.push([vin, p.vout, p.iz]);
      }
      zCurve = { key: key, pts: pts, iz20: pts[pts.length - 1][2] };
      return zCurve;
    }
    function zenerWindow() {
      const z = ZENERS[st.vz];
      const a = model.zenerPoint(st.vz, z.win[0], st.rz, st.rl);
      const b = model.zenerPoint(st.vz, z.win[1], st.rz, st.rl);
      return { a: a, b: b, dv: Math.abs(b.vout - a.vout) };
    }

    function stepZener(dt) {
      const z = ZENERS[st.vz];
      const p = model.zenerPoint(st.vz, st.vin, st.rz, st.rl);
      const w = zenerWindow();
      st.zp = p;
      st.d.iz = ease(st.d.iz, p.iz, dt, 9);
      const imax = PZ_MAX / z.vz;

      // schema
      S.wIn.style.stroke = EI.vcolor(st.vin, 20);
      S.wOut.style.stroke = EI.vcolor(p.vout, 20);
      S.wGnd.style.stroke = EI.vcolor(0, 20);
      const sp = flowSpeed;
      S.flows.in.set(sp(p.iin));
      S.flows.z.set(sp(st.d.iz));
      S.flows.l.set(sp(p.il));
      S.flows.r1.set(sp(p.il));
      S.flows.r2.set(sp(p.iin));
      Object.values(S.flows).forEach((f) => f.step(dt));
      S.fx.step(dt, { iz: st.d.iz, vout: p.vout, key: st.vz, hot: p.pz > PZ_MAX });
      const hot = p.pz / PZ_MAX;
      S.heat.style.opacity = clamp(hot * 0.75, 0, 0.9).toFixed(3);
      S.heat.style.fill = hot > 1 ? P.t4 : EI.mix(P.t2, P.t4, clamp((hot - 0.5) * 2, 0, 1));
      S.loadG.classList.toggle('off', !isFinite(st.rl));
      setValue(S.bat.label, num(st.vin, 1) + ' V');
      setValue(S.res.label, si(st.rz, 'Ω', { trim: true }));
      S.zTag.set(z.label);
      S.lTag.set(isFinite(st.rl) ? fmtR(st.rl) : 'staccato');
      S.oTag.set(si(p.vout, 'V'));

      // strumenti
      rVo.set(p.vout);
      rVo.state(p.iz > 1e-3 && p.pz <= PZ_MAX ? 'ok' : '');
      rIz.set(p.iz);
      rIz.state(p.iz > imax ? 'danger' : '');
      if (isFinite(st.rl)) rIl.set(p.il); else rIl.text('0 A');
      rPz.set(p.pz);
      rPz.state(p.pz > PZ_MAX ? 'danger' : p.pz > 0.8 * PZ_MAX ? 'warn' : '');

      // grafico
      const zc = zenerCurve();
      st.d.y2max = ease(st.d.y2max, Math.ceil(Math.max(imax * 1.2, zc.iz20 * 1.05) / 0.025) * 0.025, dt, 5);
      st.d.ymaxZ = ease(st.d.ymaxZ, Math.ceil(z.vz * 1.3 / 2) * 2, dt, 5);
      plotZ.setRange('y', 0, st.d.ymaxZ);
      plotZ.setRange('y2', 0, st.d.y2max);
      plotZ.opts.x.count = plotZ.w && plotZ.w < 460 ? 5 : 10;
      plotZ.clear();
      plotZ.vband(z.win[0], z.win[1], { color: P.t2, alpha: 0.07 });
      plotZ.hline(z.vz, { color: P.t2, alpha: 0.55, label: 'Vz ' + z.label, at: 'left' });
      plotZ.hline(imax, { axis: 'y2', color: P.t4, alpha: 0.75, dash: [3, 4] });
      plotZ.line(zc.pts.map((q) => [q[0], q[2]]), { axis: 'y2', color: P.t3, width: 1.8, alpha: 0.9 });
      plotZ.line(zc.pts.map((q) => [q[0], q[1]]), { color: P.t1, width: 2.6, fill: P.t1, fillAlpha: 0.07 });
      plotZ.point(z.win[0], w.a.vout, { color: INK, r: 3, ring: false });
      plotZ.point(z.win[1], w.b.vout, { color: INK, r: 3, ring: false, label: 'Δ ' + num(w.dv, w.dv < 0.1 ? 3 : 2) + ' V', labelPos: 'down' });
      plotZ.point(st.vin, p.iz, { axis: 'y2', color: P.t3, r: 4 });
      plotZ.point(st.vin, p.vout, { color: P.t1, r: 5, label: fmtV(p.vout), labelPos: 'up' });

      lab.explain(explainZener(p, w));
    }

    function explainZener(p, w) {
      const z = ZENERS[st.vz];
      const imax = PZ_MAX / z.vz;
      const mech = z.mech === 'tunnel' ? 'per [[effetto-zener|effetto Zener]], cioè per effetto tunnel,' : z.mech === 'misto' ? 'per [[effetto-zener|effetto Zener]] ed [[effetto-valanga]] insieme' : 'per [[effetto-valanga]]';
      if (st.vin < 0.05) return 'Ingresso a zero: niente corrente. Alza Vin e guarda l\'uscita salire insieme all\'ingresso, fino alla tensione di Zener.';
      if (p.pz > PZ_MAX) {
        return 'Troppa potenza: lo Zener dissipa <b>' + fmtW(p.pz) + '</b>, oltre il suo limite di 0,5 W, che a ' + z.label + ' vuol dire al massimo ' + fmtA(imax) + '. In un circuito vero si surriscalderebbe fino a guastarsi. Aumenta Rs, oppure abbassa la tensione d\'ingresso.';
      }
      if (p.iz < 1e-4) {
        const div = isFinite(st.rl) ? 'Rs e RL fanno da partitore: Vout = Vin · RL / (Rs + RL) = ' + fmtV(p.vout) + '.' : 'Senza carico non passa corrente e l\'uscita segue l\'ingresso: Vout = ' + fmtV(p.vout) + '.';
        // ingresso che serve perché il partitore porti l'uscita a Vz
        const vNeed = isFinite(st.rl) ? z.vz * (st.rz + st.rl) / st.rl : z.vz;
        let next;
        if (vNeed > 20) next = 'Con questo carico lo Zener entrerebbe in conduzione solo con circa ' + num(vNeed, 0) + ' V d\'ingresso: diminuisci Rs o alleggerisci il carico, cioè una RL più grande.';
        else if (st.vin > z.vz) next = 'Vin supera già ' + z.label + ', ma il partitore ne lascia arrivare meno: servono circa ' + num(vNeed, 1) + ' V d\'ingresso, oppure una Rs più piccola.';
        else next = 'Alza Vin oltre ' + (vNeed > z.vz + 0.05 ? 'circa ' + num(vNeed, 1) + ' V' : z.label) + ' e guarda l\'uscita fermarsi.';
        return 'Lo Zener è in [[polarizzazione-inversa]] ma sotto la sua tensione di ' + z.label + ': ' + (p.iz < 1e-7 ? 'praticamente non conduce' : 'conduce pochissimo (' + fmtA(p.iz) + ')') + '. ' + div + ' ' + next;
      }
      if (p.vout < z.vz - 0.25) {
        if (p.il < p.iz) {
          return 'Da Rs arriva poca corrente, ' + fmtA(p.iin) + ': lo Zener lavora ancora sul ginocchio della curva e l\'uscita, ' + fmtV(p.vout) + ', resta sotto i ' + z.label + '. Alza Vin o diminuisci Rs.';
        }
        return 'Il carico chiede ' + fmtA(p.il) + ', ma attraverso Rs ne arrivano solo ' + fmtA(p.iin) + ': allo Zener resta pochissimo (' + fmtA(p.iz) + ') e lavora sul ginocchio della curva. L\'uscita scende a ' + fmtV(p.vout) + ', sotto i ' + z.label + '. Diminuisci Rs, alza Vin o alleggerisci il carico.';
      }
      let msg = 'Lo Zener conduce ' + mech + ' e tiene l\'uscita a <b>' + fmtV(p.vout) + '</b>. Da Rs arrivano ' + fmtA(p.iin) + ': ' +
        (isFinite(st.rl) ? 'il carico ne prende ' + fmtA(p.il) + ' e lo Zener assorbe il resto, ' : 'senza carico lo Zener li assorbe tutti, ') + fmtA(p.iz) + ', dissipando ' + fmtW(p.pz) + '. ' +
        (w.a.iz < 2e-4
          ? 'Con ' + z.win[0] + ' V d\'ingresso però lo Zener non conduce ancora: tra ' + z.win[0] + ' e ' + z.win[1] + ' V l\'uscita cambia di <b>' + num(w.dv, w.dv < 0.1 ? 3 : 2) + ' V</b>. Per regolare in tutta la fascia riduci Rs o alleggerisci il carico.'
          : 'Se Vin sale cresce solo Iz: tra ' + z.win[0] + ' e ' + z.win[1] + ' V d\'ingresso l\'uscita cambia di <b>' + num(w.dv, w.dv < 0.1 ? 3 : 2) + ' V</b>.');
      if (p.pz > 0.8 * PZ_MAX) msg += ' Attenzione: sei vicino al limite di 0,5 W.';
      else if (z.mech === 'tunnel') msg += ' Il 3,3 V ha un ginocchio morbido: regola peggio degli Zener a tensione più alta.';
      else if (w.dv > 0.1 && w.a.iz >= 2e-4) msg += ' Con una Rs più grande Iz cambia meno quando Vin sale, e l\'uscita sta più ferma: basta che resti abbastanza corrente per il carico.';
      return msg;
    }

    function qState() {
      const q = {
        mode: st.mode, color: st.color, vs: st.vs, r: st.r, i: st.ledI, burnt: st.burnt, everBurnt: st.everBurnt,
        seenRed: st.seenRed, seenBlue: st.seenBlue, vz: st.vz, vin: st.vin, rz: st.rz, rl: st.rl,
      };
      if (st.mode === 'zener' && st.zp) {
        const w = zenerWindow();
        q.dv = st.vz === '5.1' ? w.dv : Infinity;
        q.v8 = w.a.vout;
        q.pz15 = w.b.pz;
        q.pz = st.zp.pz;
        const k = RS_LIST.indexOf(st.rz);
        q.pzPrev = k > 0 ? model.zenerPoint(st.vz, st.vin, RS_LIST[k - 1], st.rl).pz : Infinity;
      }
      return q;
    }

    lab.onReset(() => {
      st.burnt = false; st.everBurnt = false; st.stress = 0; st.burnT = -1;
      st.seenRed = false; st.seenBlue = false;
      layout();
    });

    const onMq = () => build();
    if (mq) {
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }
    lab.onDestroy(() => {
      if (!mq) return;
      if (mq.removeEventListener) mq.removeEventListener('change', onMq);
      else if (mq.removeListener) mq.removeListener(onMq);
    });

    lab.loop((dt) => {
      if (!S) return;
      if (st.mode === 'led') stepLed(dt);
      else stepZener(dt);
      lab.check(qState());
    });
    layout();
  }

  /* ---------- illustrazioni ---------- */

  // Anatomia di un LED da 5 mm, in sezione.
  function anatomyFigure() {
    const lead = (x, y0, y1) => '<path class="led-zener-leg" d="M' + x + ' ' + y0 + 'V' + y1 + '"/>';
    const note = (x, y, text, x2, y2, anchor) => '<path class="f-thin" d="M' + (anchor === 'end' ? x + 4 : x - 4) + ' ' + (y - 4) + 'L' + x2 + ' ' + y2 + '"/>' +
      '<circle class="f-accent-fill" cx="' + x2 + '" cy="' + y2 + '" r="2.4"/>' +
      '<text class="f-small" x="' + x + '" y="' + y + '" text-anchor="' + (anchor || 'start') + '">' + text + '</text>';
    return '<svg viewBox="0 0 480 350">' +
      '<defs><radialGradient id="led-zener-die-glow"><stop offset="0" stop-color="#ff5a3c" stop-opacity=".85"/><stop offset=".45" stop-color="#ff3b30" stop-opacity=".35"/><stop offset="1" stop-color="#ff3b30" stop-opacity="0"/></radialGradient></defs>' +
      // gambe
      lead(186, 258, 342) + lead(221, 258, 312) +
      // corpo di resina e collarino con il lato piatto
      '<path class="led-zener-epoxy" d="M168 244V86A42 42 0 0 1 252 86V244Z"/>' +
      '<path class="led-zener-epoxy" d="M160 244H254V258H160Z"/>' +
      // luce che esce dal cristallo
      '<circle class="led-zener-fig-glow" cx="221" cy="130" r="34" fill="url(#led-zener-die-glow)"/>' +
      '<path class="led-zener-fig-ray" d="M221 118V58M210 120L188 70M232 120L254 70"/>' +
      // palo (anodo) e incudine con la coppa (catodo)
      '<path class="led-zener-metal" d="M184 258V146H178V128H192V146H188V258Z"/>' +
      '<path class="led-zener-metal" d="M218 258V156H196V124H204L210 136H232L238 124H246V156H224V258Z"/>' +
      '<path class="f-accent" d="M204 124L210 136M238 124L232 136" stroke-width="3"/>' +
      '<rect class="led-zener-die" x="214" y="129" width="14" height="7" rx="1"/>' +
      '<path class="led-zener-bond" d="M186 128C190 100 214 102 221 129"/>' +
      // didascalie a destra
      note(272, 50, 'lente di resina epossidica', 241, 60) +
      note(272, 100, 'cristallo semiconduttore (die):', 228, 131) +
      '<text class="f-small" x="272" y="114">qui nasce la luce</text>' +
      note(272, 150, 'coppa riflettente', 236, 129) +
      note(272, 186, 'incudine: catodo (−)', 244, 150) +
      note(272, 252, 'lato piatto = catodo', 255, 251) +
      note(272, 310, 'gamba corta: catodo (−)', 223, 304) +
      // didascalie a sinistra
      note(150, 94, 'filo d\'oro', 194, 111, 'end') +
      note(150, 150, 'palo: anodo (+)', 180, 140, 'end') +
      note(150, 334, 'gamba lunga: anodo (+)', 184, 330, 'end') +
      // il simbolo, con lo stesso verso
      '<text class="f-mono" x="64" y="208" text-anchor="middle">simbolo</text>' +
      '<path class="f-line" d="M50 236H80M110 236H138M110 222V250"/>' +
      '<path class="f-fill" d="M80 222L110 236L80 250Z"/>' +
      '<path class="f-line" d="M96 216l8 -10m0 0l-6 1.5m6 -1.5l-1.2 6M106 220l8 -10m0 0l-6 1.5m6 -1.5l-1.2 6" stroke-width="1.6"/>' +
      '<text class="f-small" x="50" y="268" text-anchor="middle">anodo +</text>' +
      '<text class="f-small" x="138" y="268" text-anchor="middle">catodo −</text>' +
      '</svg>';
  }

  // Colore, energia del fotone e tensione diretta: lo spettro con i materiali dei LED.
  function spectrumFigure() {
    const X = (nm) => 30 + (nm - 380) * 420 / 620;
    const stops = [[380, '#6a00b0'], [420, '#5a2cff'], [450, '#2f5bff'], [470, '#1e8cff'], [495, '#00d5ff'], [510, '#00ff92'], [530, '#45ff2e'], [560, '#b4ff00'], [580, '#ffee00'], [600, '#ffa500'], [625, '#ff4a00'], [660, '#e60000'], [700, '#b00000'], [780, '#4d0000']];
    const grad = stops.map((q) => '<stop offset="' + ((q[0] - 380) / 400).toFixed(3) + '" stop-color="' + q[1] + '"/>').join('');
    const items = [
      { nm: 470, mat: 'InGaN', name: 'blu', vf: '≈ 3,1 V', lx: 40 },
      { nm: 525, mat: 'InGaN', name: 'verde', vf: '≈ 3,0 V', lx: 114 },
      { nm: 565, mat: 'GaP', name: 'verde-giallo', vf: '≈ 2,1 V', lx: 188 },
      { nm: 590, mat: 'AlGaInP', name: 'giallo', vf: '≈ 2,05 V', lx: 262 },
      { nm: 625, mat: 'AlGaInP', name: 'rosso', vf: '≈ 2,0 V', lx: 336 },
      { nm: 940, mat: 'GaAs', name: 'infrarosso', vf: '≈ 1,2 V', lx: 420 },
    ];
    const marks = items.map((q) => {
      const x = X(q.nm);
      const ev = num(HC / q.nm, 2);
      return '<text class="f-text" x="' + q.lx + '" y="20" text-anchor="middle">' + q.mat + '</text>' +
        '<text class="f-small" x="' + q.lx + '" y="35" text-anchor="middle">' + q.name + '</text>' +
        '<text class="f-small" x="' + q.lx + '" y="49" text-anchor="middle">' + q.nm + ' nm</text>' +
        '<text class="f-mono" x="' + q.lx + '" y="65" text-anchor="middle">' + ev + ' eV</text>' +
        '<text class="f-accent-text" x="' + q.lx + '" y="82" text-anchor="middle">' + q.vf + '</text>' +
        '<path class="f-thin" d="M' + q.lx + ' 89L' + x.toFixed(1) + ' 120"/>' +
        '<path class="f-line" d="M' + x.toFixed(1) + ' 118V160" stroke-width="2.4"/>';
    }).join('');
    const nmTicks = [400, 500, 600, 700, 800, 900].map((nm) => '<path class="f-thin" d="M' + X(nm).toFixed(1) + ' 156V162"/><text class="f-small" x="' + X(nm).toFixed(1) + '" y="175" text-anchor="middle">' + nm + (nm === 900 ? ' nm' : '') + '</text>').join('');
    const evTicks = [3, 2.5, 2, 1.5].map((e) => { const x = X(HC / e).toFixed(1); return '<path class="f-thin" d="M' + x + ' 184V190"/><text class="f-mono" x="' + x + '" y="204" text-anchor="middle">' + num(e, 1) + ' eV</text>'; }).join('');
    const irX = ((X(780) + X(940)) / 2).toFixed(1);
    return '<svg viewBox="0 0 480 280">' +
      '<defs><linearGradient id="led-zener-spectrum" x1="0" x2="1" y1="0" y2="0">' + grad + '</linearGradient></defs>' +
      '<rect x="' + X(380) + '" y="124" width="' + (X(780) - X(380)).toFixed(1) + '" height="30" rx="3" fill="url(#led-zener-spectrum)"/>' +
      '<rect class="f-soft" x="' + X(780).toFixed(1) + '" y="124" width="' + (X(1000) - X(780)).toFixed(1) + '" height="30" rx="3"/>' +
      '<text class="f-small" x="' + irX + '" y="136" text-anchor="middle">infrarosso,</text>' +
      '<text class="f-small" x="' + irX + '" y="149" text-anchor="middle">invisibile</text>' +
      marks + nmTicks +
      '<path class="f-thin" d="M30 187H450"/>' + evTicks +
      '<text class="f-small" x="240" y="228" text-anchor="middle">← fotoni più energetici: serve più tensione · meno energia: rosso e infrarosso →</text>' +
      '<text class="f-small" x="240" y="252" text-anchor="middle">Silicio: banda proibita di 1,12 eV (circa 1100 nm), ma a gap indiretto:</text>' +
      '<text class="f-small" x="240" y="268" text-anchor="middle">la ricombinazione scalda il cristallo invece di fare luce.</text>' +
      '</svg>';
  }

  // La caratteristica dello Zener: diretta come un diodo, in inversa il ginocchio a −Vz.
  function zenerFigure() {
    const sharp = 'M340 120L150 123C136 124 130 128 127 142L119 286';
    const soft = 'M340 120L262 124C238 128 226 146 218 178L204 286';
    return '<svg viewBox="0 0 480 300">' +
      // assi
      '<path class="f-thin" d="M20 120H468M340 14V292"/>' +
      '<path class="f-thin" d="M468 120l-7 -4v8zM340 14l-4 7h8z"/>' +
      '<text class="f-small" x="462" y="138" text-anchor="end">V</text>' +
      '<text class="f-small" x="348" y="22">I</text>' +
      // zona di lavoro dello Zener
      '<rect class="f-accent-soft" x="112" y="158" width="26" height="112" rx="4" opacity=".75"/>' +
      '<path class="f-dash" d="M138 158H336M138 270H336"/>' +
      '<text class="f-small" x="348" y="156">Iz minima:</text>' +
      '<text class="f-small" x="348" y="170">lo Zener conduce</text>' +
      '<text class="f-small" x="348" y="268">Iz massima</text>' +
      '<text class="f-small" x="348" y="282">= Pz / Vz</text>' +
      '<text class="led-zener-fig-key" x="104" y="196" text-anchor="end">zona di lavoro:</text>' +
      '<text class="f-small" x="104" y="212" text-anchor="end">la corrente</text>' +
      '<text class="f-small" x="104" y="226" text-anchor="end">cambia molto,</text>' +
      '<text class="f-small" x="104" y="240" text-anchor="end">la tensione</text>' +
      '<text class="f-small" x="104" y="254" text-anchor="end">quasi niente</text>' +
      // curve
      '<path class="f-dash" d="' + soft + '"/>' +
      '<path class="f-accent" d="M340 120C372 120 380 118 386 104C392 88 396 50 399 18" stroke-width="3"/>' +
      '<path class="f-accent" d="' + sharp + '" stroke-width="3"/>' +
      '<circle class="led-zener-fig-move" r="6"><animateMotion dur="5s" repeatCount="indefinite" keyPoints="0;1;0" keyTimes="0;.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" path="M124 158L119 270"/></circle>' +
      '<circle class="led-zener-fig-static" cx="122" cy="214" r="6"/>' +
      // etichette
      '<text class="f-small" x="390" y="140">≈ 0,7 V</text>' +
      '<text class="f-text" x="404" y="64">diretta:</text>' +
      '<text class="f-small" x="404" y="80">come un</text>' +
      '<text class="f-small" x="404" y="94">diodo normale</text>' +
      '<path class="f-thin" d="M126 114V126"/>' +
      '<text class="f-mono" x="126" y="106" text-anchor="middle">−Vz</text>' +
      '<text class="f-small" x="242" y="106" text-anchor="middle">inversa: quasi nessuna corrente</text>' +
      '<text class="f-small" x="44" y="150" text-anchor="middle">ginocchio</text>' +
      '<path class="f-thin" d="M66 147L124 136"/>' +
      '<text class="f-small" x="230" y="196">tratteggio:</text>' +
      '<text class="f-small" x="230" y="210">Zener da 3,3 V,</text>' +
      '<text class="f-small" x="230" y="224">ginocchio morbido</text>' +
      '</svg>';
  }

  /* ---------- capitolo ---------- */

  EI.chapter({
    id: 'led-zener',
    icon: 'led',
    minutes: 13,
    summary: 'Un [[led|LED]] è un diodo che fa luce: quando un elettrone e una [[lacuna]] si ricombinano nella giunzione, l\'energia esce come un [[fotone]], e il colore dipende dal materiale. Il [[diodo-zener|diodo Zener]] invece lavora al contrario, in [[polarizzazione-inversa]]: a una tensione precisa comincia a condurre e la tiene ferma. Con una resistenza in serie il primo fa luce senza bruciarsi e il secondo diventa un piccolo regolatore di tensione.',
    keywords: ['led', 'elettroluminescenza', 'fotone', 'gap-diretto', 'tensione-diretta', 'resistenza-di-limitazione', 'fosforo', 'diodo-zener', 'effetto-zener', 'effetto-valanga'],
    model: model,
    css: [
      '.led-zener-term { fill: var(--scope-bg); stroke: var(--sym); stroke-width: 2.2; }',
      '.led-zener-heat { fill: var(--trace-2); opacity: 0; filter: blur(8px); transition: fill .3s ease; }',
      '.led-zener-load { transition: opacity .3s ease; }',
      '.led-zener-load.off { opacity: .22; }',
      // riquadri "dentro il LED" e "dentro lo Zener"
      '.led-zener-inset { fill: rgba(5, 10, 9, .78); stroke: color-mix(in srgb, var(--lab-ink) 24%, transparent); stroke-width: 1.2; transition: stroke .3s ease; }',
      '.led-zener-inset.hot { stroke: var(--trace-4); stroke-width: 2; }',
      '.led-zener-inset-g { transition: opacity .5s ease; }',
      '.led-zener-dim { opacity: .45; }',
      '.led-zener-zoom { fill: none; stroke: var(--scope-text); stroke-width: 1; stroke-dasharray: 3 4; opacity: .5; }',
      '.led-zener-inset-title { fill: var(--scope-text); font: 800 10.5px var(--mono); letter-spacing: .12em; }',
      '.led-zener-legend { fill: var(--scope-text); font: 600 10.5px var(--font); }',
      '.led-zener-zone { font: 800 10.5px var(--mono); }',
      '.led-zener-zone.p { fill: var(--trace-4); }',
      '.led-zener-zone.n { fill: var(--trace-3); }',
      '.led-zener-info { fill: var(--lab-ink); font: 700 11px var(--mono); }',
      '.led-zener-note { fill: var(--scope-text); font: 600 11px var(--font); }',
      '.led-zener-phosphor { fill: rgba(255, 216, 77, .2); stroke: #ffd84d; stroke-width: 1; }',
      '.led-zener-phos-text { fill: #ffe27a; font: 800 8.5px var(--mono); letter-spacing: .16em; }',
      '.led-zener-flash { fill: none; stroke-width: 2; filter: url(#ei-glow); }',
      '.led-zener-hot { fill: url(#ei-hot); opacity: 0; pointer-events: none; }',
      '.led-zener-scorch { fill: #120c0a; fill-opacity: .7; filter: blur(1.5px); opacity: 0; transition: opacity .4s ease; pointer-events: none; }',
      '.led-zener-burst { fill: url(#ei-hot); opacity: 0; pointer-events: none; }',
      '.led-zener-smoke { fill: #a9b4af; filter: blur(2.5px); opacity: 0; pointer-events: none; }',
      '.led-zener-field { fill: none; stroke: var(--trace-2); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }',
      '.led-zener-tunnel { fill: none; stroke: var(--trace-3); stroke-width: 1.6; stroke-dasharray: 2 4; }',
      '.led-zener-ion { fill: none; stroke: #fff; stroke-width: 2; filter: url(#ei-glow); }',
      '.led-zener-trail { fill: none; stroke: var(--trace-3); stroke-width: 2.2; stroke-linecap: round; opacity: .5; }',
      '.led-zener-tall .led-zener-inset-title { font-size: 11.5px; }',
      '.led-zener-tall .led-zener-legend, .led-zener-tall .led-zener-zone { font-size: 11.5px; }',
      '.led-zener-tall .led-zener-info { font-size: 12px; }',
      '.led-zener-tall .led-zener-note { font-size: 12px; }',
      '.ei-sym.diode.led.led-zener-burnt { color: #6d5d55; }',
      '.ei-sym.diode.led.led-zener-burnt .body { fill: #2a1f1a !important; filter: none !important; }',
      // sul telefono lo schema ha già la sua forma alta: niente ingrandimenti dei testi
      '.ei-stage .led-zener-tall .ei-sym-label { font-size: 13px; }',
      '.ei-stage .led-zener-tall .ei-sym-label .value { font-size: 12.5px; }',
      '.ei-stage .led-zener-tall .ei-wire { stroke-width: 3; }',
      '.ei-stage .led-zener-tall .ei-sym .lead { stroke-width: 2.4; }',
      // illustrazioni
      '.ei-figure .led-zener-epoxy { fill: color-mix(in srgb, #ff4a3d 13%, var(--fig-paper)); stroke: var(--fig-ink); stroke-width: 2; fill-opacity: .9; }',
      '.ei-figure .led-zener-metal { fill: color-mix(in srgb, var(--fig-muted) 38%, var(--fig-paper)); stroke: var(--fig-ink); stroke-width: 1.5; stroke-linejoin: round; }',
      '.ei-figure .led-zener-leg { fill: none; stroke: color-mix(in srgb, var(--fig-muted) 70%, var(--fig-paper)); stroke-width: 5; }',
      '.ei-figure .led-zener-die { fill: #ff5a3c; stroke: var(--fig-ink); stroke-width: 1.2; }',
      '.ei-figure .led-zener-bond { fill: none; stroke: var(--ei-hl); stroke-width: 1.6; }',
      '.ei-figure .led-zener-fig-ray { fill: none; stroke: #ff5a3c; stroke-width: 2; stroke-linecap: round; stroke-dasharray: 6 8; opacity: .8; animation: led-zener-rays 1.2s linear infinite; }',
      '.ei-figure .led-zener-fig-glow { animation: led-zener-pulse 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }',
      '.ei-figure .led-zener-fig-move, .ei-figure .led-zener-fig-static { fill: var(--ei-hl); stroke: var(--fig-paper); stroke-width: 2; }',
      '.ei-figure .led-zener-fig-static { display: none; }',
      '.ei-figure .led-zener-fig-key { fill: var(--ei-hl); font: 800 11.5px var(--font); }',
      '@keyframes led-zener-rays { to { stroke-dashoffset: -28; } }',
      '@keyframes led-zener-pulse { 0%, 100% { opacity: .65; transform: scale(.92); } 50% { opacity: 1; transform: scale(1.06); } }',
      '@media (prefers-reduced-motion: reduce) {',
      '  .ei-figure .led-zener-fig-ray, .ei-figure .led-zener-fig-glow { animation: none; }',
      '  .ei-figure .led-zener-fig-move { display: none; }',
      '  .ei-figure .led-zener-fig-static { display: inline; }',
      '}',
    ].join('\n'),
    lab: {
      title: 'Luce e tensione stabile',
      intro: 'Nel modo <b>LED</b> scegli il colore, la pila e la resistenza: guarda il punto di lavoro scorrere sulla curva e la luce crescere con la corrente. Se esageri, il LED si brucia. Nel modo <b>Zener</b> alza la tensione d\'ingresso e osserva l\'uscita fermarsi alla tensione di Zener, finché lo Zener regge la potenza.',
      layout: 'side',
      viewBox: [640, 330],
      svgLabel: 'Schema del circuito: pila, resistenza e LED, oppure regolatore con lo Zener',
      mount: mount,
    },
    how: [
      'Un [[led|LED]] è un diodo: una [[giunzione-pn]] in [[polarizzazione-diretta]]. La pila spinge gli elettroni del lato N e le lacune del lato P verso la giunzione, dove si incontrano e si annullano a coppie: è la [[ricombinazione]].',
      'Ogni ricombinazione libera l\'energia della [[banda-proibita]]. Nei semiconduttori a [[gap-diretto]], come l\'arseniuro di gallio (GaAs), il fosfuro di alluminio, gallio e indio (AlGaInP) o il nitruro di indio e gallio (InGaN), quell\'energia esce come un [[fotone]]: è l\'[[elettroluminescenza]]. Nel silicio, che ha il gap indiretto, diventa quasi tutta calore.',
      'Il colore lo decide il materiale: λ in nanometri ≈ 1240 diviso l\'energia in elettronvolt. L\'arseniuro di gallio, 1,4 eV, emette nell\'infrarosso dei telecomandi; un LED rosso ha fotoni da circa 2 eV, uno blu da 2,6–2,7 eV.',
      'Per accendersi il LED vuole la sua [[tensione-diretta]], vicina all\'energia dei fotoni: circa 1,8–2,0 V per il rosso, 2,0–2,2 V per giallo e verde-giallo, 2,9–3,4 V per blu, verde puro e bianco. Sotto quella soglia resta spento.',
      'Appena oltre, la corrente cresce in modo esponenziale: per questo un LED va sempre con una [[resistenza-di-limitazione]] in serie, R = (Vs − Vf) / I. Un LED da 5 mm lavora bene tra 10 e 20 mA e regge circa 30 mA al massimo; la luce cresce con la corrente. Il LED bianco è un LED blu ricoperto di [[fosforo|fosforo]] giallo.',
      'Il [[diodo-zener|diodo Zener]] è fatto per lavorare in [[polarizzazione-inversa]]: è molto drogato, ha una [[zona-di-svuotamento]] sottile e cede a una tensione precisa, Vz, senza rovinarsi se la corrente è limitata. Sotto i 5 V circa domina l\'[[effetto-zener|effetto Zener]], un passaggio per effetto tunnel; sopra, l\'[[effetto-valanga]]. Il nome Zener si usa per tutti.',
      'In conduzione la tensione dello Zener cambia pochissimo con la corrente: con una resistenza in serie diventa un regolatore, perché assorbe la corrente che il carico non prende. Non deve però superare la sua potenza, Pz = Vz · Iz, per esempio 0,5 W. Negli alimentatori veri uno Zener, o un riferimento simile, comanda un transistor che porta la corrente.',
    ],
    formulas: [
      {
        name: 'Resistenza di limitazione',
        expr: '<var>R</var> = <span class="frac"><span><var>V</var><sub>s</sub> − <var>V</var><sub>f</sub></span><span><var>I</var></span></span>',
        legend: [['R', 'resistenza in serie al LED, in ohm (Ω)'], ['V<sub>s</sub>', 'tensione della pila o dell\'alimentatore'], ['V<sub>f</sub>', '[[tensione-diretta]] del LED alla corrente scelta'], ['I', 'corrente voluta, in ampere: 15 mA = 0,015 A']],
        note: 'Esempio: 5 V e un LED rosso da 2,0 V a 15 mA danno R = 3 V / 0,015 A = 200 Ω. Nella serie E12 si sceglie 220 Ω, il valore subito sopra: la corrente scende a circa 14 mA.',
      },
      {
        name: 'Colore del fotone',
        expr: '<var>λ</var> ≈ <span class="frac"><span>1240</span><span><var>E</var></span></span>',
        legend: [['λ', 'lunghezza d\'onda della luce, in nanometri (nm)'], ['E', 'energia del fotone in elettronvolt (eV), quasi uguale alla [[banda-proibita]] del materiale'], ['1240', 'il prodotto della costante di Planck per la velocità della luce, in eV·nm']],
        note: 'Esempio: un fotone da 1,98 eV ha λ ≈ 626 nm, rosso. Il silicio, con 1,12 eV, darebbe 1107 nm, nell\'infrarosso: ma con il suo gap indiretto non emette quasi nulla.',
      },
      {
        name: 'Potenza dello Zener',
        expr: '<var>P</var><sub>Z</sub> = <var>V</var><sub>Z</sub> · <var>I</var><sub>Z</sub>, &nbsp; <var>I</var><sub>Z</sub> = <span class="frac"><span><var>V</var><sub>in</sub> − <var>V</var><sub>Z</sub></span><span><var>R</var><sub>s</sub></span></span> − <var>I</var><sub>L</sub>',
        legend: [['P<sub>Z</sub>', 'potenza che lo Zener trasforma in calore, in watt'], ['I<sub>Z</sub>', 'corrente nello Zener: quella che arriva da R<sub>s</sub> meno quella del carico'], ['I<sub>L</sub>', 'corrente presa dal carico'], ['V<sub>in</sub>', 'tensione d\'ingresso del regolatore']],
        note: 'Esempio: uno Zener da 5,1 V e 0,5 W regge al massimo 0,5 / 5,1 ≈ 98 mA. Il caso peggiore è con la tensione d\'ingresso più alta e il carico staccato.',
      },
    ],
    figures: [
      { title: 'Dentro un LED da 5 mm', svg: anatomyFigure(), caption: 'Il cristallo, grande meno di mezzo millimetro, sta nella coppa riflettente in cima all\'incudine, collegata al catodo; un filo d\'oro sottilissimo lo unisce al palo dell\'anodo. La resina fa da lente. Per riconoscere i piedini: la gamba lunga è l\'anodo (+), il lato piatto del collarino indica il catodo (−).', alt: 'Sezione di un LED da 5 mm con lente, cristallo, coppa riflettente, incudine del catodo, palo dell\'anodo, filo d\'oro, gamba lunga e lato piatto' },
      { title: 'Il colore viene dalla banda proibita', svg: spectrumFigure(), caption: 'Ogni materiale ha la sua banda proibita e quindi i suoi fotoni: dal nitruro di indio e gallio, blu e verde, all\'arseniuro di gallio, infrarosso. La tensione diretta segue l\'energia dei fotoni: circa 3 V per il blu, 2 V per il rosso.', alt: 'Spettro visibile e infrarosso con i materiali dei LED, la lunghezza d\'onda, l\'energia dei fotoni e la tensione diretta tipica' },
      { title: 'La curva dello Zener', svg: zenerFigure(), caption: 'In diretta lo Zener si comporta come un diodo qualsiasi. In inversa non conduce finché la tensione non arriva a Vz: lì la curva piega in un ginocchio e scende quasi verticale. In quel tratto la corrente può cambiare di decine di milliampere mentre la tensione resta quasi ferma.', alt: 'Caratteristica corrente-tensione di un diodo Zener con il ginocchio a meno Vz e la zona di lavoro tra corrente minima e massima' },
    ],
    history: {
      text: [
        'La prima luce da un semiconduttore la vide nel 1907 Henry Joseph Round, ingegnere della compagnia di Guglielmo Marconi. Studiava i cristalli di carborundo, il carburo di silicio, usati come rivelatori per la radio, e notò che con una decina di volt alcuni emettevano una debole luce giallastra. Lo raccontò in una breve nota sulla rivista Electrical World, e la cosa finì lì.',
        'Negli anni Venti il giovane radiotecnico russo Oleg Losev studiò lo stesso bagliore con cura: ne misurò la soglia e lo spettro e capì che era «luce fredda», non calore. Pubblicò i risultati nel 1927 e chiese un brevetto per un «relè luminoso», ma per decenni nessuno ne fece uso. Losev morì di fame nel 1942, durante l\'assedio di Leningrado.',
        'La svolta arrivò con i semiconduttori composti. Nel 1961, alla Texas Instruments, James Biard e Gary Pittman ottennero luce infrarossa da un diodo di arseniuro di gallio; il 9 ottobre 1962, in un laboratorio della General Electric a Syracuse, Nick Holonyak Jr. accese il primo LED visibile, rosso, di arseniuro-fosfuro di gallio. Il suo allievo George Craford, alla Monsanto, aggiunse il giallo nel 1972. Per il blu servirono altri vent\'anni: ci arrivarono Isamu Akasaki e Hiroshi Amano a Nagoya e Shuji Nakamura alla Nichia, che nel 1993 presentò un LED blu brillante al nitruro di indio e gallio. Nel 1996 la Nichia lo ricoprì di un fosforo giallo ed ebbe il primo LED bianco; nel 2014 i tre ricercatori ricevettero il premio Nobel per la fisica.',
        'Lo Zener nasce invece da una teoria. Nel 1934 il fisico americano Clarence Zener spiegò come un campo elettrico fortissimo possa strappare gli elettroni ai legami di un isolante per effetto tunnel. Più tardi, ai Bell Labs, il cedimento delle giunzioni in inversa fu ricondotto alla sua teoria, e i diodi costruiti per sfruttarlo presero il suo nome. Nel 1954 Kenneth McKay mostrò che nelle giunzioni di silicio che aveva studiato il cedimento era invece una valanga di urti: oggi si sa che i due meccanismi convivono, e il nome Zener è rimasto a tutti.',
      ],
      events: [
        { year: 1907, title: 'La luce del carborundo', who: 'Henry Joseph Round (compagnia Marconi)', text: 'Una breve nota su Electrical World descrive la luce giallastra di un cristallo di carburo di silicio sotto tensione: è considerata la prima descrizione dell\'[[elettroluminescenza]] in un semiconduttore.' },
        { year: 1927, title: 'La «luce fredda» dei cristalli', who: 'Oleg Losev', text: 'Misura soglia e spettro della luce dei rivelatori al carborundo e capisce che non viene dal calore.' },
        { year: 1934, title: 'La teoria del cedimento', who: 'Clarence Zener', text: 'Un campo elettrico intenso fa passare gli elettroni per effetto tunnel: il diodo Zener prenderà il suo nome.' },
        { year: 1962, title: 'Il primo LED visibile', who: 'Nick Holonyak Jr. (General Electric)', text: 'Un LED rosso di arseniuro-fosfuro di gallio: da qui nascono le spie e i display rossi degli anni Settanta.' },
        { year: 1972, title: 'Arriva il giallo', who: 'M. George Craford (Monsanto)', text: 'Drogando con l\'azoto l\'arseniuro-fosfuro di gallio ottiene il primo LED giallo e rossi molto più luminosi.' },
        { year: 1993, title: 'Il LED blu brillante', who: 'Shuji Nakamura (Nichia)', text: 'Un LED blu al nitruro di indio e gallio: con un [[fosforo|fosforo]] giallo darà il LED bianco. Nobel per la fisica 2014 con Isamu Akasaki e Hiroshi Amano.' },
      ],
    },
    fun: 'Il telecomando della televisione ha un LED infrarosso a base di arseniuro di gallio, che emette intorno ai 940 nm: i nostri occhi non lo vedono, ma il sensore di molte fotocamere sì. Inquadralo con il telefono e premi un tasto: vedrai il LED lampeggiare.',
    uses: 'LED: spie di ogni apparecchio, semafori, display e schermi giganti, fari delle auto, lampadine e torce, retroilluminazione di televisori e telefoni, telecomandi e fotocellule a infrarossi, optoisolatori. Zener: tensioni di riferimento, piccoli regolatori per circuiti che assorbono poco, protezioni contro le sovratensioni sugli ingressi. Dentro ogni regolatore integrato c\'è un riferimento di tensione che fa lo stesso mestiere.',
    links: [
      { href: '#diodo', section: 'Questa sezione', title: 'La giunzione P-N e la curva del diodo' },
      { href: '#semiconduttori', section: 'Questa sezione', title: 'Banda proibita e ricombinazione nel cristallo' },
      { href: '#alimentatore', section: 'Questa sezione', title: 'Il regolatore dell\'alimentatore: un riferimento e un transistor' },
      { href: '../elettronica-base/index.html#ohm', section: 'Elettronica base', title: 'La legge di Ohm, per calcolare la resistenza del LED' },
      { href: '../elettronica-base/index.html#potenza', section: 'Elettronica base', title: 'Potenza e calore: perché i componenti bruciano' },
    ],
    glossary: {
      'led': { term: 'LED', def: 'Diodo a emissione di luce (light-emitting diode): una giunzione P-N in un semiconduttore a gap diretto che, attraversata da corrente in polarizzazione diretta, emette luce di un colore preciso.' },
      'elettroluminescenza': { term: 'Elettroluminescenza', def: 'Emissione di luce da un materiale attraversato da corrente, senza che diventi incandescente: è la «luce fredda» dei LED.' },
      'fotone': { term: 'Fotone', def: 'Il «granello» di luce. La sua energia in elettronvolt fissa il colore: λ (nm) ≈ 1240 / E (eV). Un fotone rosso porta circa 2 eV, uno blu circa 2,6 eV.' },
      'gap-diretto': { term: 'Gap diretto', def: 'Proprietà di semiconduttori come GaAs, AlGaInP e InGaN: un elettrone che si ricombina con una lacuna emette direttamente un fotone. Nel silicio, a gap indiretto, l\'energia va al reticolo come calore.' },
      'tensione-diretta': { term: 'Tensione diretta', def: 'La tensione ai capi di un diodo che conduce, indicata con Vf (forward voltage). Nei LED cresce con l\'energia dei fotoni: circa 2 V per il rosso, circa 3 V per il blu e il bianco.' },
      'resistenza-di-limitazione': { term: 'Resistenza di limitazione', def: 'La resistenza messa in serie a un LED per fissarne la corrente: R = (Vs − Vf) / I. Senza, la corrente crescerebbe fino a distruggere il LED.' },
      'fosforo': { term: 'Fosforo (luminoforo)', def: 'Materiale che assorbe luce di un colore e la riemette di un altro. Nei LED bianchi uno strato di fosforo giallo, granato di ittrio e alluminio drogato con cerio, trasforma parte della luce blu: blu e giallo insieme appaiono bianchi.' },
      'diodo-zener': { term: 'Diodo Zener', def: 'Diodo costruito per lavorare in polarizzazione inversa: a una tensione precisa, Vz, conduce e la tensione ai suoi capi resta quasi costante. Si usa come riferimento di tensione e come regolatore semplice.' },
      'effetto-zener': { term: 'Effetto Zener', def: 'Passaggio di elettroni per effetto tunnel attraverso una zona di svuotamento molto sottile, quando il campo elettrico è fortissimo. Domina nei diodi Zener sotto i 5 V circa.' },
      'effetto-valanga': { term: 'Effetto valanga', def: 'Cedimento di una giunzione in inversa: gli elettroni accelerati dal campo urtano gli atomi e liberano altri elettroni, che ne liberano altri ancora. Domina nei diodi Zener sopra i 5 V circa.' },
    },
  });
})();
