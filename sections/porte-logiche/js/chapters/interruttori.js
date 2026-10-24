/*
 * Capitolo 4 · Relè, valvole, transistor (1835 – 1960).
 * Una porta logica è buona quanto l'interruttore con cui è fatta: la gara degli interruttori che hanno costruito
 * i primi calcolatori, con le sue conseguenze su velocità, dimensioni, consumo e affidabilità.
 * Laboratori: dentro un relè, la valvola come interruttore, caccia alla valvola bruciata, la gara degli interruttori,
 * tre interruttori a confronto. Figura: la pagina del registro del Mark II con la falena.
 */
(function () {
  'use strict';

  const { h, s, ui, draw } = PL;

  const restart = (el, cls) => { el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // tensione con il segno meno tipografico: −2,5 V
  const volt = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + PL.fmt(Math.abs(v), 1) + ' V';
  const msTxt = (v) => PL.fmt(v, 1) + ' ms';

  /* Pulsante da tenere premuto: puntatore, barra spaziatrice o Invio. */
  function holdButton(o) {
    const b = ui.btn({ label: o.label, kind: o.kind || 'lab', ariaLabel: o.ariaLabel });
    b.setAttribute('aria-pressed', 'false');
    let down = false;
    const press = () => { if (down) return; down = true; b.classList.add('is-down'); b.setAttribute('aria-pressed', 'true'); o.onPress(); };
    const release = () => { if (!down) return; down = false; b.classList.remove('is-down'); b.setAttribute('aria-pressed', 'false'); o.onRelease(); };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { b.setPointerCapture(e.pointerId); } catch (err) { /* puntatore già rilasciato: si continua senza cattura */ }
      press();
    });
    b.addEventListener('pointerup', release);
    b.addEventListener('pointercancel', release);
    b.addEventListener('lostpointercapture', release);
    b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); } });
    b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(); } });
    b.addEventListener('blur', release);
    b.addEventListener('contextmenu', (e) => e.preventDefault()); // la pressione lunga sul telefono non apre il menu
    return b;
  }

  /* ---------- laboratorio: dentro un relè ---------- */

  function labRelay() {
    const REST = -7; // inclinazione dell'ancora a riposo, in gradi
    const HX = 150;
    const HY = 100; // cerniera dell'ancora
    const PULL = 0.55; // corrente (in proporzione al massimo) che fa partire l'ancora
    const DROP = 0.35; // sotto questa corrente vince la molla
    const T_CLOSE = 3.2; // millisecondi di corsa dell'ancora
    const T_OPEN = 3;
    const BOUNCE = [[1.3, 0.55], [0.45, 0.32]]; // rimbalzi dei contatti: ampiezza in gradi, durata in ms
    const st = { pressed: false, slow: 150, I: 0, theta: REST, phase: 'rest', pt: 0, th0: REST, b: 0, t: 0, timing: false, mode: 'press', marks: {}, closed: null, short: false, tOpen: null };

    const art = PL.svg('0 0 620 300', { role: 'img', 'aria-label': 'Un relè visto di lato: la bobina avvolta sul nucleo di ferro, l\'ancora mobile tenuta su da una molla e i contatti. Sotto, il circuito di comando con la pila e il pulsante; a destra, il circuito della lampadina, che si chiude quando l\'ancora abbassa il contatto' });

    // ferro: telaio e nucleo; bobina con il suo bagliore quando passa corrente
    const yoke = s('path', { class: 'i1-yoke', d: 'M217 222V240H150V24H292' });
    const core = s('rect', { class: 'i1-core', x: 200, y: 107, width: 34, height: 115, rx: 3 });
    const coilRect = s('rect', { class: 'i1-coil', x: 188, y: 122, width: 58, height: 92, rx: 7 });
    const winds = [];
    for (let y = 128; y <= 208; y += 6) winds.push(s('line', { class: 'i1-wind', x1: 190, y1: y, x2: 244, y2: y }));
    const glow = s('rect', { class: 'i1-glow', x: 188, y: 122, width: 58, height: 92, rx: 7 });
    const field = [
      s('path', { class: 'i1-field', d: 'M217 214V100H150V240H217Z' }),
      s('ellipse', { class: 'i1-field is-outer', cx: 217, cy: 168, rx: 56, ry: 72 }),
    ];

    // ancora: ruota attorno alla cerniera; il contatto mobile è sotto la punta
    const armG = s('g', { class: 'i1-armg' },
      s('rect', { class: 'i1-arm', x: 146, y: 95, width: 182, height: 10, rx: 4 }),
      s('rect', { class: 'i1-mc', x: 316, y: 105, width: 12, height: 6, rx: 1.5 }));
    const hinge = s('circle', { class: 'i1-hinge', cx: HX, cy: HY, r: 6 });
    const fc = s('rect', { class: 'i1-fc', x: 314, y: 112, width: 16, height: 6, rx: 1.5 });
    const spring = s('path', { class: 'i1-spring' });

    // circuito di comando: pila, pulsante, bobina
    const wA = draw.wire([[246, 140], [266, 140], [266, 252], [300, 252]]);
    const sw = draw.switch(300, 252, { len: 44 });
    const wA2 = draw.wire([[344, 252], [390, 252], [390, 267]]);
    const b1 = draw.battery(390, 272);
    const wB = draw.wire([[390, 277], [390, 288], [256, 288], [256, 196], [246, 196]]);
    // circuito della lampadina: pila, contatti, lampadina e il filo flessibile che segue l'ancora
    const L1 = draw.wire([[322, 118], [322, 196], [500, 196], [500, 217]]);
    const b2 = draw.battery(500, 222);
    const L2 = draw.wire([[500, 227], [500, 262], [560, 262], [560, 171]]);
    const lamp = draw.lamp(560, 150, { r: 20 });
    const L3 = draw.wire([[560, 130], [560, 60], [382, 60]]);
    const pig = s('path', { class: 'pl-wire is-0' });
    [wA, wA2, wB, L1, L2, L3].forEach((p) => draw.setWire(p, 0, { animate: false }));

    // il campo passa sopra l'ancora: si vede che il flusso magnetico la attraversa
    art.append(yoke, core, coilRect, ...winds, glow, L1, L2, L3, pig, fc, armG, hinge, ...field, spring,
      wA, wA2, wB, sw.g, b1.g, b2.g, lamp.g, draw.junction(382, 60),
      draw.label(217, 262, 'bobina', 'i1-lbl'),
      draw.label(226, 78, 'ancora', 'i1-lbl'),
      draw.label(299, 56, 'molla', 'i1-lbl', 'start'),
      draw.label(334, 130, 'contatti', 'i1-lbl', 'start'),
      draw.label(322, 274, 'pulsante', 'i1-lbl'),
      draw.label(420, 287, 'pila', 'i1-lbl', 'start'),
      draw.label(512, 246, 'pila', 'i1-lbl', 'start'),
      draw.label(510, 154, 'lampadina', 'i1-lbl', 'end'),
      draw.label(470, 44, 'circuito della lampadina', 'i1-cap'),
      draw.label(112, 292, 'circuito di comando', 'i1-cap'));
    const ctrlFlows = [draw.flow(wA, { reverse: true }), draw.flow(wA2, { reverse: true }), draw.flow(wB, { reverse: true })];
    const loadFlows = [draw.flow(L1, { reverse: true }), draw.flow(L2, { reverse: true }), draw.flow(L3, { reverse: true })];

    // orologio dei millisecondi
    const tEl = h('span', { class: 'i1-t pl-mono' }, 't = 0,0 ms');
    const steps = { cur: h('li', null, 'corrente nella bobina'), move: h('li', null, 'l\'ancora si muove'), close: h('li', null, 'contatto chiuso'), rest: h('li', null, 'contatti fermi') };
    const clock = h('div', { class: 'i1-clock' }, tEl, h('ol', { class: 'i1-steps' }, steps.cur, steps.move, steps.close, steps.rest));
    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));

    const attach = (dx, dy) => {
      const a = (st.theta * Math.PI) / 180;
      return { x: HX + dx * Math.cos(a) - dy * Math.sin(a), y: HY + dx * Math.sin(a) + dy * Math.cos(a) };
    };
    function springPath(x0, y0, x1, y1) {
      const n = 10;
      const lead = 6;
      const amp = 6;
      const len = Math.hypot(x1 - x0, y1 - y0);
      const ux = (x1 - x0) / len;
      const uy = (y1 - y0) / len;
      const pt = (k, side) => (x0 + ux * k - uy * amp * side).toFixed(1) + ' ' + (y0 + uy * k + ux * amp * side).toFixed(1);
      let d = 'M' + pt(0, 0) + 'L' + pt(lead, 0);
      const seg = (len - 2 * lead) / n;
      for (let i = 1; i < n; i++) d += 'L' + pt(lead + seg * i, i % 2 ? 1 : -1);
      return d + 'L' + pt(len - lead, 0) + 'L' + pt(len, 0);
    }

    function mark(k) {
      st.marks[k] = st.t;
      steps[k].classList.add('is-done');
      steps[k].dataset.t = msTxt(st.t);
    }
    function clearMarks() {
      st.marks = {};
      Object.values(steps).forEach((li) => { li.classList.remove('is-done'); delete li.dataset.t; });
    }
    function setPhase(p) {
      st.phase = p;
      st.pt = 0;
      st.th0 = st.theta;
      if (p === 'closing' && st.mode === 'press' && st.marks.move == null) mark('move');
    }

    function closedMsg() {
      say('<strong>Contatto chiuso dopo ' + msTxt(st.marks.close) + '.</strong> La corrente nella bobina non sale di colpo: quando il campo magnetico è abbastanza forte, a ' + msTxt(st.marks.move) + ', l\'ancora parte e abbassa il contatto. Poi i contatti rimbalzano un paio di volte e restano fermi solo a ' + msTxt(st.marks.rest) + ': è il rimbalzo dei contatti, e la lampadina tremola.');
    }
    function openMsg() {
      say('<strong>Rilasciato: il contatto si è aperto dopo ' + msTxt(st.tOpen) + '.</strong> Senza corrente il campo magnetico sparisce e la molla riporta su l\'ancora. Pochi millisecondi per scatto bastano per un telefono, ma per un calcolatore che deve fare migliaia di operazioni sono tantissimi.');
    }

    function advance() {
      switch (st.phase) {
        case 'rest':
          st.theta = REST;
          if (st.pressed && st.I >= PULL) setPhase('closing');
          break;
        case 'closing': {
          if (!st.pressed && st.I < DROP) { setPhase('opening'); break; }
          const u = Math.min(1, st.pt / T_CLOSE);
          st.theta = st.th0 * (1 - u * u); // l'ancora accelera: più si avvicina, più è attratta
          if (u >= 1) { st.b = 0; setPhase('bounce'); }
          break;
        }
        case 'bounce': {
          const [amp, dur] = BOUNCE[st.b];
          const v = Math.min(1, st.pt / dur);
          st.theta = -amp * Math.sin(Math.PI * v);
          if (v >= 1) {
            st.b += 1;
            st.pt = 0;
            if (st.b >= BOUNCE.length) {
              st.theta = 0;
              // i contatti si sono fermati: l'orologio si ferma qui
              if (st.mode === 'press' && st.timing) { mark('rest'); st.timing = false; closedMsg(); }
              setPhase('closed');
            }
          }
          break;
        }
        case 'closed':
          st.theta = 0;
          if (!st.pressed && st.I < DROP) setPhase('opening');
          break;
        case 'opening': {
          if (st.pressed && st.I >= PULL) { setPhase('closing'); break; }
          const u = Math.min(1, st.pt / T_OPEN);
          st.theta = st.th0 + (REST - st.th0) * PL.motion.ease.back(u);
          if (u >= 1) {
            st.theta = REST;
            setPhase('rest');
            if (st.mode === 'release' && st.tOpen != null) { st.timing = false; openMsg(); }
          }
          break;
        }
        default:
          break;
      }
    }

    function paint() {
      armG.setAttribute('transform', 'rotate(' + st.theta.toFixed(2) + ' ' + HX + ' ' + HY + ')');
      const a = attach(137, -5);
      spring.setAttribute('d', springPath(287, 29, a.x, a.y));
      const tip = attach(172, -5);
      pig.setAttribute('d', 'M382 60C356 60 ' + (tip.x + 26).toFixed(1) + ' ' + (tip.y - 24).toFixed(1) + ' ' + tip.x.toFixed(1) + ' ' + tip.y.toFixed(1));
      const closed = st.theta > -0.35;
      if (closed !== st.closed) {
        st.closed = closed;
        lamp.set(closed);
        fc.classList.toggle('is-on', closed);
        [L1, L2, L3].forEach((p) => draw.setWire(p, closed ? 1 : 0, { animate: false }));
        pig.classList.toggle('is-1', closed);
        pig.classList.toggle('is-0', !closed);
        loadFlows.forEach((f) => f.set(closed && !PL.reduced()));
        if (closed && st.mode === 'press' && st.marks.close == null) mark('close');
        if (!closed && st.mode === 'release' && st.tOpen == null) st.tOpen = st.t;
      }
      const i2 = st.I * st.I;
      field.forEach((f) => { f.style.opacity = i2.toFixed(3); });
      glow.style.opacity = (st.I * 0.55).toFixed(3);
      ctrlFlows.forEach((f) => f.set(st.pressed && st.I > 0.05 && !PL.reduced()));
      tEl.textContent = 't = ' + msTxt(st.t) + (st.mode === 'release' ? ' dal rilascio' : ' dalla pressione');
    }

    function step(dt) {
      const d = (dt * 1000) / st.slow; // millisecondi veri
      if (st.timing) st.t += d;
      const tau = st.pressed ? 1.6 : 0.8;
      st.I += ((st.pressed ? 1 : 0) - st.I) * (1 - Math.exp(-d / tau));
      st.pt += d;
      advance();
      if (st.short && !st.pressed && st.I < 0.05 && st.phase === 'rest') {
        st.short = false;
        st.timing = false;
        say('<strong>Troppo breve!</strong> La corrente nella bobina non ha fatto in tempo a salire abbastanza e l\'ancora non si è mossa. Un impulso più corto di un paio di millisecondi non fa scattare un relè: tieni premuto un po\' di più.');
      }
      paint();
    }

    const loopCtl = PL.loop(step, { el: art, autostart: !PL.reduced() });

    function press() {
      st.pressed = true;
      sw.set(true);
      [wA, wA2, wB].forEach((p) => draw.setWire(p, 1, { animate: false }));
      st.mode = 'press';
      st.t = 0;
      st.timing = true;
      st.short = false;
      st.tOpen = null;
      clearMarks();
      mark('cur');
      if (PL.reduced() || !loopCtl.running) {
        // senza animazione: si salta allo stato finale con i tempi del modello
        st.I = 1;
        st.theta = 0;
        st.phase = 'closed';
        st.t = 1.3;
        mark('move');
        st.t = 4.5;
        paint();
        st.t = 5.4;
        mark('rest');
        paint();
        st.timing = false;
        closedMsg();
        return;
      }
      say('<strong>Pulsante premuto.</strong> La corrente comincia a scorrere nella bobina e il nucleo di ferro diventa una calamita…');
    }
    function release() {
      st.pressed = false;
      sw.set(false);
      [wA, wA2, wB].forEach((p) => draw.setWire(p, 0, { animate: false }));
      const moved = st.marks.move != null;
      st.mode = 'release';
      st.t = 0;
      st.timing = true;
      st.tOpen = null;
      if (PL.reduced() || !loopCtl.running) {
        st.I = 0;
        st.theta = REST;
        st.phase = 'rest';
        st.t = 0.9;
        paint();
        st.tOpen = 0.9;
        st.timing = false;
        openMsg();
        return;
      }
      if (!moved) { st.short = true; return; }
      say('<strong>Pulsante rilasciato.</strong> La corrente nella bobina cala e il campo magnetico si indebolisce…');
    }

    const holdBtn = holdButton({ label: 'Tieni premuto il pulsante', kind: 'lab is-primary i1-hold', ariaLabel: 'Pulsante del relè: tieni premuto', onPress: press, onRelease: release });
    const speed = ui.segmented({
      label: 'Rallentatore',
      options: [{ value: 150, label: '150 volte più lento' }, { value: 600, label: '600 volte più lento' }],
      value: 150,
      onChange: (v) => { st.slow = Number(v); },
    });
    paint();
    say('Tieni premuto il pulsante (anche con la barra spaziatrice) e guarda, al rallentatore, che cosa succede nei primi millesimi di secondo. Poi lascialo.');
    return ui.lab({
      title: 'Dentro un relè',
      intro: 'Un relè ha due circuiti separati: quello di comando, con la bobina, e quello comandato, qui una lampadina. La bobina diventa una calamita e attira l\'ancora di ferro, che chiude il contatto.',
      controls: [holdBtn, speed.el],
      stage: [art, clock],
      readout,
      caption: 'Tutto è rallentato di 150 o 600 volte. I tempi sono quelli tipici di un piccolo relè: qualche millisecondo per chiudere il contatto, che poi rimbalza per un istante. Le linee tratteggiate azzurre rappresentano il campo magnetico.',
    });
  }

  /* ---------- figura: la pagina del registro ---------- */

  function figBug() {
    const art = PL.svg('0 0 600 250', { class: 'pl-svg i6-art', role: 'img', 'aria-label': 'Ricostruzione della pagina del registro del Mark II del 9 settembre 1947: alle 15:45 una falena trovata nel relè 70 del pannello F, attaccata alla pagina con il nastro adesivo, e la scritta First actual case of bug being found' });
    const rules = [];
    for (let y = 54; y <= 230; y += 24) rules.push(s('line', { class: 'i6-rule', x1: 30, y1: y, x2: 570, y2: y }));
    const wing = (d) => s('path', { class: 'i6-wing', d });
    const moth = s('g', { class: 'i6-moth', transform: 'translate(352 146) rotate(-12)' },
      wing('M0 0C-14-30-50-36-58-14C-60 2-30 8 0 4Z'), wing('M0 0C14-30 50-36 58-14C60 2 30 8 0 4Z'),
      wing('M0 4C-12 14-36 30-42 18C-44 8-24 6 0 4Z'), wing('M0 4C12 14 36 30 42 18C44 8 24 6 0 4Z'),
      s('ellipse', { class: 'i6-body', cx: 0, cy: 6, rx: 4.5, ry: 18 }),
      s('path', { class: 'i6-feeler', d: 'M-2-11C-6-22-12-28-18-30M2-11C6-22 12-28 18-30' }));
    const tape = (x, y, r) => s('rect', { class: 'i6-tape', x: -48, y: -9, width: 96, height: 18, rx: 2, transform: 'translate(' + x + ' ' + y + ') rotate(' + r + ')' });
    art.append(
      s('rect', { class: 'i6-page', x: 14, y: 8, width: 572, height: 236, rx: 6 }),
      ...rules,
      s('line', { class: 'i6-margin', x1: 92, y1: 14, x2: 92, y2: 238 }),
      s('text', { class: 'i6-hand', x: 40, y: 44 }, '9/9'),
      s('text', { class: 'i6-hand', x: 36, y: 98 }, '1545'),
      s('text', { class: 'i6-hand', x: 104, y: 98 }, 'Relay #70 Panel F'),
      s('text', { class: 'i6-hand', x: 104, y: 122 }, '(moth) in relay.'),
      moth, tape(318, 120, -30), tape(392, 170, -26),
      s('text', { class: 'i6-hand', x: 104, y: 218 }, 'First actual case of bug being found.'));
    return ui.figure({
      class: 'i6-fig',
      art,
      caption: 'La pagina del registro del Mark II del 9 settembre 1947, ridisegnata. Alle 15:45 i tecnici trovarono una falena nel relè numero 70 del pannello F e la attaccarono alla pagina con il nastro adesivo; sotto si legge «First actual case of bug being found», cioè «primo caso reale di bug (insetto) trovato». L\'originale è conservato allo Smithsonian, a Washington.',
    });
  }

  /* ---------- laboratorio: la valvola come interruttore ---------- */

  function labTriode() {
    const VA = 150; // tensione dell'anodo, in volt
    const MU = 25; // fattore di amplificazione: l'interdizione arriva a −VA/MU = −6 V
    const VC = -VA / MU;
    const K = 10 / Math.pow(-VC, 1.5); // 10 mA con la griglia a 0 V
    const current = (vg) => (vg <= VC ? 0 : K * Math.pow(vg - VC, 1.5)); // legge della potenza 3/2, semplificata
    const IMAX = current(2);
    const CAT_Y = 224;
    const AN_Y = 62;
    const GRID_Y = 150;
    const XL = 244;
    const XR = 376;
    const st = { vg: -2, heater: false, warm: 0, hot: false, acc: 0, shown: '' };

    const art = PL.svg('0 0 620 300', { role: 'img', 'aria-label': 'Sezione di un triodo: in basso il catodo scaldato dal filamento, al centro la griglia di fili sottili, in alto l\'anodo. A destra lo strumento che misura la corrente dell\'anodo, la tensione della griglia e lo stato logico della valvola' });
    const gridWires = [];
    for (let x = 238; x <= 382; x += 12) gridWires.push(s('circle', { class: 'i3-gridw', cx: x, cy: GRID_Y, r: 2.6 }));
    const grid = s('g', { class: 'i3-grid' }, s('line', { class: 'i3-gridline', x1: 234, y1: GRID_Y, x2: 386, y2: GRID_Y }), ...gridWires);
    const glow = s('ellipse', { class: 'i3-glow', cx: 310, cy: 229, rx: 88, ry: 24 });
    const cathode = s('rect', { class: 'i3-cathode', x: 240, y: CAT_Y, width: 140, height: 10, rx: 2 });
    let hd = 'M246 246';
    for (let i = 1; i <= 16; i++) hd += 'L' + (246 + i * 8) + ' ' + (i % 2 ? 240 : 246);
    const heater = s('path', { class: 'i3-heater', d: hd });
    const needle = s('line', { class: 'i3-needle', x1: 500, y1: 64, x2: 500, y2: 50 });
    const vgTxt = s('text', { class: 'i3-vg', x: 450, y: 157 }, volt(st.vg));
    const box = s('rect', { class: 'i3-box', x: 452, y: 180, width: 118, height: 64, rx: 10 });
    const bitTxt = s('text', { class: 'i3-bit', x: 511, y: 216, 'text-anchor': 'middle' }, '0');
    const stateTxt = s('text', { class: 'i3-state', x: 511, y: 235, 'text-anchor': 'middle' }, 'filamento spento');
    const eLayer = s('g', { class: 'i3-electrons' });
    const P = [];
    for (let i = 0; i < 64; i++) {
      const c = s('circle', { class: 'i3-e', r: 2.3, cx: 310, cy: CAT_Y, visibility: 'hidden' });
      eLayer.append(c);
      P.push({ c, mode: 0, x: 0, y: 0, v: 0, ph: 0, w: 0, hh: 0, checked: false });
    }
    const lead = (d) => s('path', { class: 'i3-lead', d });
    art.append(
      lead('M388 55H482'), lead('M518 55H590V92'), lead('M590 102V266'), lead('M384 150H440'), lead('M380 229H430V262'),
      draw.ground(430, 262), draw.ground(590, 266), draw.battery(590, 97).g,
      s('circle', { class: 'i3-term', cx: 440, cy: GRID_Y, r: 4 }),
      s('rect', { class: 'i3-glass', x: 200, y: 16, width: 220, height: 256, rx: 46 }),
      s('rect', { class: 'i3-base', x: 216, y: 262, width: 188, height: 30, rx: 6 }),
      s('rect', { class: 'i3-anode', x: 232, y: 48, width: 156, height: 14, rx: 3 }),
      glow, heater, cathode, grid, eLayer,
      s('circle', { class: 'i3-meter', cx: 500, cy: 55, r: 18 }),
      s('path', { class: 'i3-scale', d: 'M488.5 56A14 14 0 0 1 511.5 56' }),
      needle, s('circle', { class: 'i3-pivot', cx: 500, cy: 64, r: 2 }),
      draw.label(500, 71, 'mA', 'i3-mA'),
      draw.label(190, 59, 'anodo', 'i3-lbl', 'end'),
      draw.label(190, 154, 'griglia', 'i3-lbl', 'end'),
      draw.label(190, 233, 'catodo', 'i3-lbl', 'end'),
      draw.label(190, 252, 'filamento', 'i3-lbl', 'end'),
      draw.label(568, 101, '150 V', 'i3-small', 'end'),
      draw.label(450, 136, 'tensione di griglia', 'i3-small', 'start'),
      vgTxt, box, bitTxt, stateTxt);

    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));
    const flowing = () => (st.hot ? current(st.vg) * clamp((st.warm - 0.6) / 0.4, 0, 1) : 0);

    function paintHeat() {
      const w = st.warm;
      cathode.style.setProperty('--w', w.toFixed(3));
      heater.style.setProperty('--w', w.toFixed(3));
      glow.style.opacity = (w * 0.9).toFixed(3);
    }
    function paintMeter(ia) {
      const a = ((-55 + 110 * clamp(ia / 16, 0, 1)) * Math.PI) / 180;
      needle.setAttribute('x2', (500 + 14 * Math.sin(a)).toFixed(1));
      needle.setAttribute('y2', (64 - 14 * Math.cos(a)).toFixed(1));
      const on = ia >= 2;
      const txt = !st.hot ? (st.heater ? 'si scalda…' : 'filamento spento') : ia === 0 ? 'interdetta' : on ? 'conduce · ' + PL.fmt(ia, 1) + ' mA' : 'quasi interdetta';
      if (txt !== st.shown) {
        st.shown = txt;
        stateTxt.textContent = txt;
        bitTxt.textContent = on ? '1' : st.hot && ia === 0 ? '0' : st.hot ? '?' : '0';
        box.classList.toggle('is-1', on);
      }
    }
    function hide(p) { p.mode = 0; p.c.setAttribute('visibility', 'hidden'); }
    function place(p, x, y) {
      p.c.setAttribute('cx', x.toFixed(1));
      p.c.setAttribute('cy', y.toFixed(1));
      p.c.removeAttribute('visibility');
    }
    function spawn(mode, cloudH) {
      const p = P.find((q) => q.mode === 0);
      if (!p) return;
      p.mode = mode;
      p.x = XL + Math.random() * (XR - XL);
      p.y = CAT_Y - 2;
      p.v = 30 + Math.random() * 40;
      p.checked = false;
      p.ph = Math.random() * Math.PI;
      p.w = 2 + Math.random() * 2;
      p.hh = cloudH * (0.4 + Math.random() * 0.6);
      place(p, p.x, p.y);
    }
    // senza animazione: elettroni fermi, distribuiti tra catodo e anodo oppure in una nuvola davanti al catodo
    function staticLayout() {
      P.forEach(hide);
      const ia = flowing();
      const n = Math.round((ia / IMAX) * 36);
      for (let i = 0; i < n; i++) {
        const p = P[i];
        p.mode = 1;
        place(p, XL + 6 + ((i * 37) % (XR - XL - 12)), AN_Y + 12 + ((i * 53) % (CAT_Y - AN_Y - 20)));
      }
      if (st.hot && ia < 0.4) {
        for (let i = 0; i < 16; i++) {
          const p = P[n + i];
          p.mode = 2;
          place(p, XL + 4 + i * 8, CAT_Y - 6 - ((i * 7) % 14));
        }
      }
      paintMeter(ia);
    }

    function tick(dt) {
      if (st.warm !== (st.heater ? 1 : 0)) {
        st.warm = clamp(st.warm + (st.heater ? dt / 3 : -dt / 1.5), 0, 1);
        paintHeat();
        if ((st.warm >= 0.6) !== st.hot) { st.hot = st.warm >= 0.6; explain(); }
      }
      const ia = flowing();
      if (ia > 0) {
        st.acc += dt * ia * 5; // elettroni disegnati al secondo, proporzionali alla corrente
        while (st.acc >= 1) { st.acc -= 1; spawn(1, 0); }
      }
      const capture = st.vg > 0 ? 0.12 * st.vg : 0;
      const cloudH = clamp(10 + 24 * (1 - (VC - st.vg) / 4), 6, 30);
      let cloud = 0;
      for (const p of P) {
        if (p.mode === 1) {
          p.v += dt * (220 + 40 * ia);
          p.y -= p.v * dt;
          if (p.y < GRID_Y + 40 && p.y > GRID_Y + 2) {
            // gli elettroni passano negli spazi tra i fili della griglia
            const gx = XL + Math.round((p.x - XL) / 12) * 12;
            p.x += (gx - p.x) * Math.min(1, dt * 8);
          }
          if (!p.checked && p.y <= GRID_Y) { p.checked = true; if (Math.random() < capture) { hide(p); continue; } }
          if (p.y <= AN_Y + 2) { hide(p); continue; }
        } else if (p.mode === 2) {
          if (!st.hot || ia > 0.4) { hide(p); continue; }
          cloud += 1;
          p.ph += dt * p.w;
          p.y = CAT_Y - 2 - p.hh * Math.abs(Math.sin(p.ph));
        } else continue;
        p.c.setAttribute('cx', p.x.toFixed(1));
        p.c.setAttribute('cy', p.y.toFixed(1));
      }
      if (st.hot && ia < 0.4) while (cloud < 18) { spawn(2, cloudH); cloud += 1; }
      paintMeter(ia);
    }
    const loopCtl = PL.loop(tick, { el: art, autostart: !PL.reduced() });

    function explain() {
      const ia = current(st.vg);
      if (!st.hot) {
        if (st.heater) say('<strong>Il catodo si sta scaldando.</strong> Finché non è caldo non emette elettroni. In una valvola vera ci volevano diversi secondi: per questo i calcolatori a valvole si accendevano con calma, e poi si cercava di non spegnerli più.');
        else say('<strong>Filamento spento.</strong> Il catodo è freddo e non emette elettroni: non passa corrente, qualunque tensione abbia la griglia. Premi «Accendi il filamento».');
        return;
      }
      if (ia === 0) say('<strong>Interdetta: 0.</strong> Con la griglia a ' + volt(st.vg) + ' gli elettroni vengono respinti: si affollano davanti al catodo e ricadono indietro, e all\'anodo non arriva niente. È l\'[[Interdizione|interdizione]]. Il filamento però resta acceso e consuma lo stesso.');
      else if (ia < 2) say('<strong>Quasi interdetta.</strong> Con la griglia a ' + volt(st.vg) + ' passano pochi elettroni: ' + PL.fmt(ia, 1) + ' mA. Un circuito digitale evita questa zona di mezzo: porta la griglia ben oltre l\'interdizione oppure vicino a 0 V.');
      else say('<strong>Conduce: 1.</strong> Con la griglia a ' + volt(st.vg) + ' gli elettroni passano tra i fili della griglia e arrivano all\'anodo: ' + PL.fmt(ia, 1) + ' mA.' + (st.vg > 0 ? ' Con la griglia positiva una parte degli elettroni finisce sulla griglia stessa.' : ''));
    }

    function setVg(v) {
      st.vg = v;
      vgTxt.textContent = volt(v);
      grid.classList.toggle('is-neg', v <= VC);
      grid.classList.toggle('is-pos', v > 0);
      if (PL.reduced() || !loopCtl.running) staticLayout();
      explain();
    }
    const heatBtn = ui.btn({ label: 'Accendi il filamento', kind: 'lab', onClick: () => setHeater(!st.heater) });
    function setHeater(on) {
      st.heater = on;
      heatBtn.lastChild.textContent = on ? 'Spegni il filamento' : 'Accendi il filamento';
      heatBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (PL.reduced() || !loopCtl.running) {
        st.warm = on ? 1 : 0;
        st.hot = on;
        paintHeat();
        staticLayout();
      }
      explain();
    }
    const slider = ui.slider({ label: 'Griglia', min: -10, max: 2, step: 0.5, value: st.vg, format: volt, onInput: setVg });
    const off = ui.btn({ label: '0 · griglia a −10 V', kind: 'lab', onClick: () => { slider.set(-10, true); setVg(-10); } });
    const on = ui.btn({ label: '1 · griglia a 0 V', kind: 'lab', onClick: () => { slider.set(0, true); setVg(0); } });
    heatBtn.setAttribute('aria-pressed', 'false');
    paintHeat();
    setVg(st.vg);
    PL.onVisible(art, () => { if (!st.heater) setHeater(true); }, { threshold: 0.4 });
    return ui.lab({
      title: 'La valvola come interruttore',
      intro: 'Un triodo visto in sezione. Il catodo caldo emette elettroni e l\'anodo, positivo, li attira; la griglia sta in mezzo. Accendi il filamento, poi sposta la tensione della griglia.',
      controls: [heatBtn, slider.el, off, on],
      stage: art,
      readout,
      caption: 'Modello semplificato: anodo a 150 V, interdizione a −6 V, 10 mA con la griglia a 0 V. I puntini sono gli elettroni, molto meno numerosi e molto più lenti di quelli veri. Il riscaldamento del catodo è accelerato.',
    });
  }

  /* ---------- laboratorio: caccia alla valvola bruciata ---------- */

  function labHunt() {
    const COLS = 22;
    const ROWS = 7;
    const N = COLS * ROWS;
    const X0 = 34;
    const DX = 25.5;
    const Y0 = 70;
    const DY = 34;
    const st = { dead: -1, failAt: 0, nextFail: 0, now: 0, prog: 0, ring: 0, ringAcc: 0, found: 0, best: 0, tables: 0, help: 0, cursor: 0, last: -1 };

    const art = PL.svg('0 0 620 312', { class: 'pl-svg i4-art', role: 'group', tabindex: '0', 'aria-label': 'Pannello con ' + N + ' valvole accese. Con le frecce scegli una valvola, con Invio la sostituisci' });
    const taskTxt = s('text', { class: 'i4-task', x: 20, y: 34 }, 'Tavola di tiro n. 1');
    const progFill = s('rect', { class: 'i4-prog', x: 236, y: 24, width: 204, height: 12, rx: 0 });
    progFill.style.transform = 'scaleX(0)';
    const neon = [];
    for (let k = 0; k < 10; k++) neon.push(s('circle', { class: 'i4-neon', cx: 462 + k * 14, cy: 30, r: 5 }));
    const rowHl = s('rect', { class: 'i4-rowhl', x: X0 - 6, y: 0, width: (COLS - 1) * DX + 28, height: 30, rx: 6 });
    const colHl = s('rect', { class: 'i4-colhl', x: 0, y: Y0 - 5, width: 26, height: (ROWS - 1) * DY + 36, rx: 6 });
    const cursorEl = s('rect', { class: 'i4-cursor', x: 0, y: 0, width: 24, height: 33, rx: 6 });
    const vals = [];
    const layer = s('g', { class: 'i4-valves' });
    for (let i = 0; i < N; i++) {
      const x = X0 + (i % COLS) * DX;
      const y = Y0 + Math.floor(i / COLS) * DY;
      const g = s('g', { class: 'i4-v', 'data-i': String(i) },
        s('rect', { class: 'i4-glass', x, y, width: 16, height: 22, rx: 7 }),
        s('circle', { class: 'i4-fil', cx: x + 8, cy: y + 9, r: 4.2 }),
        s('rect', { class: 'i4-sock', x: x + 1.5, y: y + 20, width: 13, height: 6, rx: 2 }));
      layer.append(g);
      vals.push({ g, x, y });
    }
    art.append(taskTxt, s('rect', { class: 'i4-prog-bg', x: 236, y: 24, width: 204, height: 12, rx: 3 }), progFill, ...neon,
      draw.label(525, 54, 'contatore ad anello', 'i4-ring-t'), rowHl, colHl, layer, cursorEl);
    const stats = h('p', { class: 'i4-stats pl-mono' });
    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));

    function paintRing() { neon.forEach((c, k) => c.classList.toggle('is-on', k === st.ring)); }
    function paintStats() {
      stats.textContent = 'valvole sostituite: ' + st.found + ' · tempo migliore: ' + (st.best ? PL.fmt(st.best, 1) + ' s' : '—') + ' · tavole completate: ' + st.tables;
    }
    function paintHelp() {
      const on = st.dead >= 0;
      const r = Math.floor(st.dead / COLS);
      const c = st.dead % COLS;
      rowHl.classList.toggle('is-on', on && st.help >= 1);
      colHl.classList.toggle('is-on', on && st.help >= 2);
      if (on) {
        rowHl.setAttribute('y', String(Y0 + r * DY - 4));
        colHl.setAttribute('x', String(X0 + c * DX - 5));
      }
    }
    function paintCursor() {
      const v = vals[st.cursor];
      cursorEl.setAttribute('x', String(v.x - 4));
      cursorEl.setAttribute('y', String(v.y - 3));
    }
    function schedule() { st.nextFail = PL.reduced() ? 0 : st.now + 3.5 + Math.random() * 4; }

    function fail() {
      if (st.dead >= 0) return;
      let i;
      do { i = Math.floor(Math.random() * N); } while (i === st.last);
      st.dead = i;
      st.failAt = performance.now();
      st.help = 0;
      st.nextFail = 0;
      vals[i].g.classList.add('is-dead');
      art.classList.add('is-halted');
      paintHelp();
      if (!PL.reduced()) {
        const puff = s('circle', { class: 'i4-puff', cx: vals[i].x + 8, cy: vals[i].y + 2, r: 7 });
        art.append(puff);
        PL.timeout(() => puff.remove(), 1500);
      }
      say('<strong>Guasto!</strong> Una valvola si è bruciata e il calcolo si è fermato: il risultato non arriverà finché non la sostituisci. Trovala e cliccala, oppure usa le frecce e Invio.');
    }
    function flash(i) { restart(vals[i].g, 'is-ok'); }
    function fix() {
      const secs = (performance.now() - st.failAt) / 1000;
      const v = vals[st.dead];
      v.g.classList.remove('is-dead');
      restart(v.g, 'is-new');
      art.classList.remove('is-halted');
      const r = Math.floor(st.dead / COLS) + 1;
      const c = (st.dead % COLS) + 1;
      st.found += 1;
      st.best = st.best ? Math.min(st.best, secs) : secs;
      st.last = st.dead;
      st.dead = -1;
      st.help = 0;
      paintHelp();
      paintStats();
      say('<strong>Trovata in ' + PL.fmt(secs, 1) + ' secondi</strong> (riga ' + r + ', colonna ' + c + ') tra ' + N + ' valvole, e il calcolo riparte. L\'ENIAC ne aveva 17.468, più di cento volte tante: per trovare quella guasta i tecnici facevano girare programmi di prova che restringevano la ricerca, e secondo Eckert ci mettevano circa un quarto d\'ora.');
      schedule();
    }
    function activate(i) {
      if (st.dead < 0) { flash(i); say('Tutte le valvole funzionano. Aspetta il prossimo guasto, oppure premi «Fai bruciare una valvola».'); return; }
      if (i !== st.dead) { flash(i); say('Questa valvola è accesa e funziona: cerca quella spenta.' + (st.help ? '' : ' Se ti serve, usa il programma di prova.')); return; }
      fix();
    }

    // sul telefono le valvole sono piccole: un tocco vicino a quella guasta basta a trovarla
    function nearDead(e) {
      const m = st.dead >= 0 && art.getScreenCTM && art.getScreenCTM();
      if (!m || !window.DOMPoint) return false;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      const scale = art.getBoundingClientRect().width / 620 || 1;
      const v = vals[st.dead];
      return Math.hypot(p.x - (v.x + 8), p.y - (v.y + 12)) <= Math.max(14, 22 / scale);
    }
    art.addEventListener('click', (e) => {
      if (nearDead(e)) { fix(); return; }
      const g = e.target.closest && e.target.closest('.i4-v');
      if (g) activate(Number(g.dataset.i));
    });
    art.addEventListener('keydown', (e) => {
      const c = st.cursor % COLS;
      const r = Math.floor(st.cursor / COLS);
      let n = st.cursor;
      if (e.key === 'ArrowRight') n = r * COLS + Math.min(COLS - 1, c + 1);
      else if (e.key === 'ArrowLeft') n = r * COLS + Math.max(0, c - 1);
      else if (e.key === 'ArrowDown') n = Math.min(ROWS - 1, r + 1) * COLS + c;
      else if (e.key === 'ArrowUp') n = Math.max(0, r - 1) * COLS + c;
      else if (e.key === 'Home') n = r * COLS;
      else if (e.key === 'End') n = r * COLS + COLS - 1;
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(st.cursor); return; }
      else return;
      e.preventDefault();
      st.cursor = n;
      paintCursor();
    });

    PL.loop((dt) => {
      st.now += dt;
      if (st.dead >= 0) return;
      st.prog += dt / 7;
      if (st.prog >= 1) {
        st.prog = 0;
        st.tables += 1;
        taskTxt.textContent = 'Tavola di tiro n. ' + (st.tables + 1);
        paintStats();
      }
      progFill.style.transform = 'scaleX(' + st.prog.toFixed(3) + ')';
      st.ringAcc += dt;
      if (st.ringAcc >= 0.12) { st.ringAcc = 0; st.ring = (st.ring + 1) % 10; paintRing(); }
      if (!st.nextFail) schedule();
      else if (st.now >= st.nextFail) fail();
    }, { el: art, autostart: !PL.reduced() });

    const burn = ui.btn({ label: 'Fai bruciare una valvola', kind: 'lab', onClick: () => { if (st.dead < 0) fail(); else say('C\'è già una valvola spenta da trovare.'); } });
    const help = ui.btn({
      label: 'Programma di prova', kind: 'lab',
      onClick: () => {
        if (st.dead < 0) { say('Nessun guasto da cercare: tutte le valvole sono accese.'); return; }
        st.help = Math.min(2, st.help + 1);
        paintHelp();
        say(st.help === 1 ? 'Il programma di prova ha trovato la riga: la valvola guasta è in quella evidenziata.' : 'Un secondo programma di prova ha trovato anche la colonna.');
      },
    });
    if (PL.reduced()) progFill.style.transform = 'scaleX(0.35)';
    paintRing();
    paintStats();
    paintCursor();
    say(PL.reduced() ? 'Il pannello calcola una tavola di tiro. Premi «Fai bruciare una valvola» e poi trova quella spenta.' : 'Il pannello sta calcolando una tavola di tiro. Prima o poi una valvola si brucerà: tieni gli occhi aperti.');
    return ui.lab({
      title: 'Caccia alla valvola bruciata',
      intro: 'Un pannello in stile ENIAC con ' + N + ' valvole sta facendo un calcolo. Quando una valvola si brucia il calcolo si ferma: trovala e sostituiscila.',
      controls: [burn, help],
      stage: [art, stats],
      readout,
      caption: 'In alto, la barra del calcolo e un contatore ad anello: l\'ENIAC contava in decimale con anelli di dieci circuiti, uno solo acceso alla volta. Un guasto qualunque bastava a fermare tutto.',
    });
  }

  /* ---------- laboratorio: la gara degli interruttori ---------- */

  function labRace() {
    const LANES = [
      { key: 'rele', name: 'Relè', era: 'anni Quaranta', t: 1e-2 },
      { key: 'valv', name: 'Valvola', era: 'anni Quaranta', t: 1e-6 },
      { key: 'tr50', name: 'Transistor', era: 'fine anni Cinquanta', t: 1e-7 },
      { key: 'cmos', name: 'Transistor CMOS', era: 'oggi', t: 1e-11 },
    ];
    const SCALES = [
      { v: 1, unit: 's', label: '1 secondo' },
      { v: 1e-3, unit: 'ms', label: '1 millisecondo' },
      { v: 1e-6, unit: 'µs', label: '1 microsecondo' },
      { v: 1e-9, unit: 'ns', label: '1 nanosecondo' },
    ];
    const MSG = [
      'In <strong>un secondo</strong> il relè scatta circa 100 volte, la valvola circa un milione, il transistor della fine degli anni Cinquanta circa dieci milioni e un transistor di oggi circa cento miliardi. Mentre il relè scatta una volta, la valvola commuta circa diecimila volte.',
      'In <strong>un millesimo di secondo</strong> il relè non fa in tempo a scattare nemmeno una volta: per uno scatto gliene servono una decina. Intanto la valvola commuta un migliaio di volte e un transistor di oggi cento milioni.',
      'In <strong>un milionesimo di secondo</strong> la valvola commuta una volta sola e il transistor degli anni Cinquanta una decina di volte: all\'inizio il transistor non era molto più veloce di una buona valvola. Un transistor di oggi, nello stesso tempo, commuta centomila volte.',
      'In <strong>un miliardesimo di secondo</strong> lavora soltanto il transistor di oggi: un centinaio di commutazioni. In questo tempo la luce percorre appena 30 centimetri.',
    ];
    const DUR = 3600;
    const X0 = 16;
    const BW = 588;
    const DEC = 12;
    const st = { scale: 0 };

    // ogni corsia ha due righe: sopra l'interruttore, il nome e il contatore; sotto la barra, larga quanto il riquadro
    const art = PL.svg('0 0 620 296', { role: 'img', 'aria-label': 'Quattro corsie: relè, valvola, transistor degli anni Cinquanta e transistor di oggi. Per ognuno, un interruttore che scatta, il numero di commutazioni fatte nel tempo scelto e una barra in scala logaritmica' });
    const timeTxt = s('text', { class: 'i2-time', x: X0, y: 22 }, 'tempo reale: 0 s');
    art.append(timeTxt, s('text', { class: 'i2-axis-t', x: X0 + BW, y: 22, 'text-anchor': 'end' }, 'scala logaritmica'));
    [[0, '1'], [3, '10³'], [6, '10⁶'], [9, '10⁹'], [12, '10¹²']].forEach(([d, t]) => {
      const x = X0 + (d / DEC) * BW;
      const anchor = d === 0 ? 'start' : d === DEC ? 'end' : 'middle';
      art.append(s('line', { class: 'i2-grid', x1: x, y1: 36, x2: x, y2: 264 }), s('text', { class: 'i2-tick', x, y: 286, 'text-anchor': anchor }, t));
    });
    const lanes = LANES.map((L, i) => {
      const top = 40 + i * 57;
      const yc = top + 12; // centro della riga di testo
      const bar = s('rect', { class: 'i2-bar is-' + L.key, x: X0, y: top + 26, width: BW, height: 18 });
      bar.style.transform = 'scaleX(0)';
      const sw = s('g', { class: 'i2-sw is-' + L.key },
        s('line', { class: 'i2-lead', x1: X0, y1: yc, x2: X0 + 7, y2: yc }),
        s('line', { class: 'i2-lead', x1: X0 + 35, y1: yc, x2: X0 + 42, y2: yc }),
        s('line', { class: 'i2-arm is-a', x1: X0 + 7, y1: yc, x2: X0 + 35, y2: yc }),
        s('line', { class: 'i2-arm is-b', x1: X0 + 7, y1: yc, x2: X0 + 31, y2: yc - 13 }),
        s('circle', { class: 'i2-pin', cx: X0 + 7, cy: yc, r: 2.6 }),
        s('circle', { class: 'i2-pin', cx: X0 + 35, cy: yc, r: 2.6 }));
      const count = s('text', { class: 'i2-count', x: X0 + BW, y: top + 18, 'text-anchor': 'end' }, '0');
      art.append(s('rect', { class: 'i2-track', x: X0, y: top + 26, width: BW, height: 18, rx: 4 }), bar, sw,
        s('text', { class: 'i2-label', x: X0 + 54, y: top + 18 },
          s('tspan', { class: 'i2-name' }, L.name), s('tspan', { class: 'i2-era', dx: 10 }, L.era)),
        count);
      return { L, bar, sw, count, n: -1 };
    });
    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));

    function paint(p) {
      const S = SCALES[st.scale];
      timeTxt.textContent = 'tempo reale: ' + PL.fmt(p, 2) + ' ' + S.unit + ' su 1 ' + S.unit;
      lanes.forEach((ln) => {
        const x = (p * S.v) / ln.L.t;
        const n = Math.floor(x * (1 + 1e-12) + 1e-9); // corregge gli arrotondamenti (1e-3 / 1e-6 = 999,99…)
        if (n === ln.n) return;
        ln.n = n;
        ln.count.textContent = PL.fmt(n);
        const k = n > 0 ? clamp(Math.log10(n) / DEC, 0.015, 1) : 0;
        ln.bar.style.transform = 'scaleX(' + k.toFixed(4) + ')';
        if (!ln.sw.classList.contains('is-blur')) ln.sw.classList.toggle('is-open', n % 2 === 1);
      });
    }
    let tw = null;
    function run() {
      if (tw) tw.cancel();
      const S = SCALES[st.scale];
      lanes.forEach((ln) => {
        ln.n = -1;
        ln.sw.classList.remove('is-open');
        ln.sw.classList.toggle('is-blur', S.v / ln.L.t > 24 && !PL.reduced());
      });
      say('Via! Quante volte scatta ogni interruttore in ' + S.label.replace(/^1 /, 'un ') + '?');
      tw = PL.tween({
        from: 0, to: 1, duration: DUR, ease: PL.motion.ease.linear,
        onUpdate: (p) => paint(p),
        onDone: () => {
          lanes.forEach((ln) => {
            ln.sw.classList.remove('is-blur');
            if (S.v / ln.L.t < 1) ln.count.textContent = 'meno di 1';
          });
          say(MSG[st.scale]);
        },
      });
    }
    const scale = ui.segmented({
      label: 'Tempo reale',
      options: SCALES.map((S, i) => ({ value: i, label: S.label })),
      value: 0,
      onChange: (v) => { st.scale = Number(v); run(); },
    });
    const go = ui.btn({ label: '▶︎ Via!', kind: 'lab is-primary', onClick: run });
    paint(0);
    say('Scegli quanto tempo vero far durare la gara e premi «Via!». La gara si vede sempre in qualche secondo: è il tempo reale che cambia.');
    PL.onVisible(art, run, { threshold: 0.4 });
    return ui.lab({
      title: 'La gara degli interruttori',
      intro: 'Quattro interruttori scattano più in fretta che possono. In ogni corsia il contatore dice quante commutazioni hanno fatto nel tempo scelto, e la barra le mostra in scala logaritmica: ogni tacca vale mille volte la precedente.',
      controls: [scale.el, go],
      stage: art,
      readout,
      caption: 'Tempi di commutazione tipici, arrotondati all\'ordine di grandezza: circa 10 ms per un relè, 1 µs per una valvola dei primi calcolatori, 0,1 µs per un transistor discreto del 1959 e 10 ps per un transistor di un chip di oggi. Quando un interruttore scatta troppo in fretta per vederlo, appare sfocato.',
    });
  }

  /* ---------- laboratorio: tre interruttori a confronto ---------- */

  function labCompare() {
    const ITEMS = [
      { key: 'rele', name: 'Relè', era: 'anni Quaranta' },
      { key: 'valv', name: 'Valvola', era: 'anni Quaranta' },
      { key: 'tr50', name: 'Transistor', era: '1959' },
      { key: 'cmos', name: 'Transistor', era: 'oggi' },
    ];
    const CRIT = {
      dim: {
        unit: 'lunghezza tipica', lo: -8, hi: -1, vals: [0.05, 0.08, 0.01, 5e-8],
        text: ['circa 5 cm', 'circa 8 cm', 'circa 1 cm', 'circa 50 nm'],
        axis: [[-8, '10 nm'], [-6, '1 µm'], [-4, '0,1 mm'], [-2, '1 cm']],
        say: '<strong>Dimensione.</strong> Un relè o una valvola stavano a fatica nel palmo di una mano; un transistor degli anni Cinquanta, con il suo contenitore, era grande come un\'unghia. Un transistor di oggi misura qualche decina di nanometri: per vederlo grande come un relè bisognerebbe ingrandirlo un milione di volte, e un relè ingrandito allo stesso modo sarebbe lungo 50 km. In un millimetro quadrato di chip moderno ce ne stanno oltre cento milioni.',
      },
      vel: {
        unit: 'commutazioni al secondo', lo: 0, hi: 12, vals: [100, 1e6, 1e7, 1e11],
        text: ['circa 100', 'circa 1 milione', 'circa 10 milioni', 'circa 100 miliardi'],
        axis: [[0, '1'], [3, '10³'], [6, '10⁶'], [9, '10⁹'], [12, '10¹²']],
        say: '<strong>Velocità.</strong> Il relè scatta in qualche millisecondo, la valvola in circa un microsecondo: migliaia di volte più in fretta. I primi transistor non erano molto più veloci delle valvole migliori: vinsero per le dimensioni, il consumo e l\'affidabilità. La velocità è esplosa dopo, rimpicciolendoli nei circuiti integrati.',
      },
      pow: {
        unit: 'potenza per interruttore', lo: -9, hi: 1, vals: [0.5, 3, 0.05, 1e-8],
        text: ['circa 0,5 W', 'circa 3 W', 'circa 50 mW', 'circa 10 nW'],
        axis: [[-9, '1 nW'], [-6, '1 µW'], [-3, '1 mW'], [0, '1 W']],
        say: '<strong>Consumo.</strong> Una valvola consuma qualche watt anche quando non fa niente, solo per tenere caldo il filamento: le valvole dell\'ENIAC, con il resto della macchina, assorbivano circa 150 kW. Un processore di oggi ha miliardi di transistor e consuma qualche decina di watt: in media, pochi nanowatt per transistor.',
      },
    };
    const X0 = 72;
    const BW = 532;
    const st = { crit: 'dim' };
    // a sinistra l'icona; a destra due righe: nome e valore, poi la barra
    const art = PL.svg('0 0 620 282', { role: 'img', 'aria-label': 'Confronto in scala logaritmica tra relè, valvola, transistor del 1959 e transistor di oggi, per il criterio scelto' });
    const axis = s('g', { class: 'i5-axis' });
    const unitTxt = s('text', { class: 'i5-unit', x: X0 + BW, y: 274, 'text-anchor': 'end' }, '');
    function icon(key, x, y) {
      if (key === 'rele') {
        return s('g', { class: 'i5-ic' },
          s('rect', { class: 'i5-ic-coil', x: x - 16, y: y - 4, width: 22, height: 14, rx: 3 }),
          s('line', { class: 'i5-ic-metal', x1: x - 18, y1: y - 9, x2: x + 14, y2: y - 14 }),
          s('rect', { class: 'i5-ic-metal', x: x + 8, y: y - 2, width: 8, height: 4 }));
      }
      if (key === 'valv') {
        return s('g', { class: 'i5-ic' },
          s('rect', { class: 'i5-ic-glass', x: x - 8, y: y - 16, width: 16, height: 26, rx: 7 }),
          s('circle', { class: 'i5-ic-glow', cx: x, cy: y - 6, r: 3.5 }),
          s('rect', { class: 'i5-ic-base', x: x - 9, y: y + 8, width: 18, height: 6, rx: 2 }));
      }
      if (key === 'tr50') {
        return s('g', { class: 'i5-ic' },
          s('rect', { class: 'i5-ic-can', x: x - 9, y: y - 13, width: 18, height: 14, rx: 4 }),
          ...[-5, 0, 5].map((dx) => s('line', { class: 'i5-ic-leg', x1: x + dx, y1: y + 1, x2: x + dx, y2: y + 14 })));
      }
      return s('g', { class: 'i5-ic' },
        s('rect', { class: 'i5-ic-chip', x: x - 12, y: y - 12, width: 24, height: 24, rx: 3 }),
        ...[-6, 0, 6].map((d) => s('line', { class: 'i5-ic-grid', x1: x - 9, y1: y + d, x2: x + 9, y2: y + d })),
        ...[-6, 0, 6].map((d) => s('line', { class: 'i5-ic-grid', x1: x + d, y1: y - 9, x2: x + d, y2: y + 9 })));
    }
    const rows = ITEMS.map((it, i) => {
      const top = 44 + i * 54;
      const bar = s('rect', { class: 'i5-bar is-' + it.key, x: X0, y: top + 25, width: BW, height: 18 });
      bar.style.transform = 'scaleX(0)';
      const val = s('text', { class: 'i5-val', x: X0 + BW, y: top + 17, 'text-anchor': 'end' }, '');
      art.append(s('rect', { class: 'i5-track', x: X0, y: top + 25, width: BW, height: 18, rx: 4 }), bar, icon(it.key, 36, top + 24),
        s('text', { class: 'i5-label', x: X0, y: top + 17 },
          s('tspan', { class: 'i5-name' }, it.name), s('tspan', { class: 'i5-era', dx: 8 }, it.era)),
        val);
      return { bar, val };
    });
    art.prepend(axis);
    art.append(unitTxt);
    const readout = h('p');
    const say = (html) => readout.replaceChildren(PL.rich(html));

    function show(animate) {
      const C = CRIT[st.crit];
      axis.replaceChildren(...C.axis.flatMap(([d, t]) => {
        const x = X0 + ((d - C.lo) / (C.hi - C.lo)) * BW;
        const anchor = d === C.lo ? 'start' : d === C.hi ? 'end' : 'middle';
        return [s('line', { class: 'i5-grid', x1: x, y1: 36, x2: x, y2: 254 }), s('text', { class: 'i5-tick', x, y: 26, 'text-anchor': anchor }, t)];
      }));
      unitTxt.textContent = C.unit + ', in scala logaritmica';
      rows.forEach((r, i) => {
        const k = clamp((Math.log10(C.vals[i]) - C.lo) / (C.hi - C.lo), 0.01, 1);
        r.bar.style.transform = animate === false ? 'scaleX(0)' : 'scaleX(' + k.toFixed(4) + ')';
        r.val.textContent = C.text[i];
      });
      say(C.say);
    }
    const crit = ui.segmented({
      label: 'Criterio',
      options: [{ value: 'dim', label: 'Dimensione' }, { value: 'vel', label: 'Velocità' }, { value: 'pow', label: 'Consumo' }],
      value: st.crit,
      onChange: (v) => { st.crit = v; show(); },
    });
    show(PL.reduced());
    if (!PL.reduced()) PL.onVisible(art, () => show(), { threshold: 0.35 });
    return ui.lab({
      title: 'Tre interruttori a confronto',
      intro: 'Relè, valvola e transistor (in due versioni, del 1959 e di oggi) fanno lo stesso lavoro: aprire e chiudere un circuito. Scegli il criterio e confrontali.',
      controls: [crit.el],
      stage: art,
      readout,
      caption: 'Valori tipici arrotondati, in scala logaritmica: tra due tacche vicine c\'è un fattore dieci o mille. Il consumo del transistor di oggi è una media: un processore da circa 100 W con una decina di miliardi di transistor.',
    });
  }

  /* ---------- capitolo ---------- */

  PL.chapter({
    id: 'interruttori',
    num: 4,
    title: 'Relè, valvole, transistor',
    short: 'Interruttori',
    era: '1835 – 1960',
    minutes: 20,
    labs: 5,
    kicker: 'Una porta logica è buona quanto l\'interruttore con cui è fatta. Dal clic dei relè al bagliore delle valvole fino al transistor: la gara che ha costruito i primi calcolatori.',
    summary: 'Gli interruttori dei primi calcolatori: relè, valvole e transistor, con la loro velocità, il loro consumo e i loro guasti.',
    timeline: [
      { year: 1835, title: 'Il relè di Joseph Henry', text: 'Un elettromagnete comandato da un debole segnale chiude un secondo circuito: è il relè, che rinnova i segnali del telegrafo.', key: true },
      { year: 1904, title: 'La valvola di Fleming', text: 'John Ambrose Fleming brevetta il diodo a vuoto, la prima valvola termoionica.' },
      { year: 1906, title: 'Il triodo di de Forest', text: 'Lee de Forest aggiunge una griglia tra catodo e anodo: nasce l\'Audion, il primo triodo.' },
      { year: 1941, title: 'Lo Z3 di Zuse', text: 'Il 12 maggio Konrad Zuse presenta a Berlino lo Z3, con circa 2.600 relè.', key: true },
      { year: 1944, title: 'Colossus', text: 'A Bletchley Park le valvole di Colossus aiutano a decifrare i messaggi dell\'alto comando tedesco.' },
      { year: 1944, title: 'L\'Harvard Mark I', text: 'Il 7 agosto l\'IBM consegna a Harvard un calcolatore elettromeccanico di 765.000 componenti.' },
      { year: 1946, title: 'L\'ENIAC', text: 'A febbraio viene presentato l\'ENIAC: 17.468 valvole, 5.000 addizioni al secondo.', key: true },
      { year: 1947, title: 'Il primo bug', text: 'Il 9 settembre una falena trovata in un relè del Mark II finisce nel registro di bordo.' },
      { year: 1947, title: 'Il transistor', text: 'A dicembre, ai Bell Labs, funziona il primo transistor, al germanio.' },
      { year: 1953, title: 'Il primo calcolatore a transistor', text: 'A Manchester funziona un prototipo con 92 transistor e 550 diodi.' },
      { year: 1954, title: 'Il transistor al silicio', text: 'Gordon Teal, alla Texas Instruments, presenta il primo transistor al silicio.' },
      { year: 1959, title: 'L\'IBM 7090', text: 'I transistor prendono il posto delle valvole dell\'IBM 709: la nuova macchina è sei volte più veloce.' },
    ],
    glossary: [
      { term: 'Relè', def: 'Interruttore comandato da una corrente: un elettromagnete attira un\'ancora di ferro che apre o chiude dei contatti. Con un segnale debole si comanda così un circuito separato.' },
      { term: 'Valvola termoionica', def: 'Tubo di vetro sotto vuoto in cui un catodo caldo emette elettroni verso un anodo; gli elettrodi intermedi ne regolano il flusso. Fu il primo interruttore elettronico, senza parti in movimento.' },
      { term: 'Triodo', def: 'Valvola con tre elettrodi: catodo, griglia e anodo. Una piccola tensione sulla griglia lascia passare o blocca gli elettroni. Lo inventò Lee de Forest nel 1906.' },
      { term: 'Transistor', def: 'Dispositivo a semiconduttore in cui un piccolo segnale di comando regola una corrente più grande: funziona da interruttore o da amplificatore. Il primo funzionò ai Bell Labs nel dicembre 1947.' },
      { term: 'Commutazione', def: 'Il passaggio di un interruttore da uno stato all\'altro, da aperto a chiuso o viceversa; in un circuito digitale, il cambio di un segnale da 0 a 1 o da 1 a 0.' },
      { term: 'Tempo di commutazione', def: 'Il tempo che un interruttore impiega a cambiare stato: qualche millisecondo per un relè, circa un microsecondo per le valvole dei primi calcolatori, pochi picosecondi per i transistor di oggi.' },
      { term: 'Stato solido', def: 'Si dice di un dispositivo elettronico che funziona dentro un pezzo di materiale solido, come un cristallo di semiconduttore, senza vuoto, senza gas e senza parti in movimento.' },
      { term: 'Bug', def: 'Difetto che fa funzionare male una macchina o un programma. La parola si usava già nell\'Ottocento tra telegrafisti e inventori; dal 1947 è legata alla falena trovata in un relè del Mark II.' },
      { term: 'Calcolatore elettromeccanico', def: 'Macchina da calcolo in cui i numeri sono rappresentati e trattati da parti mosse dall\'elettricità, come relè e contatori a ruote. Esempi: lo Z3 di Zuse e l\'Harvard Mark I.' },
      { term: 'Germanio', def: 'Elemento semiconduttore (simbolo Ge) dei primi transistor e diodi. Fu presto sostituito dal silicio, che sopporta meglio il calore ed è molto più abbondante.' },
      { term: 'Interdizione', def: 'Lo stato di una valvola o di un transistor in cui non passa corrente. In un triodo succede quando la griglia è abbastanza negativa da respingere tutti gli elettroni.' },
    ],
    render(root) {
      root.append(
        ui.section({ id: 'rele', title: 'Il relè, un interruttore a distanza', kicker: '1835 · Princeton' },
          ui.prose(
            'Ogni porta logica, per quanto astratta, alla fine è fatta di interruttori: qualcosa che lascia passare la corrente oppure la blocca. Per costruire un calcolatore ne servono migliaia, e ognuno deve poter essere comandato da un altro interruttore, senza una mano che lo azioni. Il primo interruttore di questo tipo è il [[Relè|relè]].',
            'Nel 1835 il fisico americano Joseph Henry, professore a Princeton, mostrò che un debole segnale arrivato da lontano poteva far scattare un elettromagnete, e che l\'elettromagnete poteva chiudere un secondo circuito alimentato da una pila locale. Il segnale veniva così «rinnovato»: è il principio del relè, che rese possibili le lunghe linee del telegrafo. In Inghilterra un\'idea simile la ebbe Edward Davy.',
            'Dentro un relè c\'è una bobina avvolta su un nucleo di ferro. Quando passa corrente, il nucleo diventa una calamita e attira un\'ancora di ferro mobile, che chiude (o apre) i contatti del circuito comandato. Tolta la corrente, una molla riporta l\'ancora a riposo. Ogni scatto è una [[Commutazione|commutazione]], e il tempo che serve per farla è il [[Tempo di commutazione|tempo di commutazione]].'),
          labRelay(),
          ui.prose('Nella prima metà del Novecento le centrali telefoniche si riempirono di relè: ogni chiamata veniva instradata da file di relè che scattavano uno dopo l\'altro. Due contatti in serie fanno una AND, due contatti in parallelo una OR: proprio le regole che Claude Shannon ritrovò nei circuiti di commutazione (<a href="#boole/shannon">capitolo 1</a>). Con abbastanza relè si poteva costruire qualunque porta, e quindi una macchina da calcolo.'),
          ui.cols(
            ui.person({
              name: 'Joseph Henry', years: '1797 – 1878', role: 'fisico',
              body: [
                'Cresciuto in una famiglia povera dello stato di New York, costruì elettromagneti potentissimi avvolgendo molte spire di filo isolato attorno a un ferro di cavallo: uno dei suoi, fatto per l\'università di Yale, sollevava quasi una tonnellata.',
                'Nel 1846 divenne il primo segretario della Smithsonian Institution, a Washington. In suo onore l\'unità di misura dell\'induttanza si chiama henry.',
              ],
            }),
            ui.callout({
              kind: 'link',
              title: 'Come funziona un elettromagnete',
              body: 'Perché una bobina percorsa da corrente diventa una calamita, e come è fatto un relè, lo spiega la sezione di <a href="../elettronica-base/index.html#rele">elettronica di base</a>.',
            }))),

        ui.section({ id: 'calcolatori-a-rele', title: 'Calcolatori che ticchettano', kicker: '1941 – 1947 · Berlino e Harvard' },
          ui.prose(
            'Negli anni Trenta qualcuno capì che con i relè si poteva costruire un\'intera macchina da calcolo. A Berlino il giovane ingegnere Konrad Zuse, stanco dei calcoli a mano richiesti dalla progettazione degli aerei, ci lavorò nel soggiorno dei genitori. Il 12 maggio 1941 presentò lo Z3: circa 2.600 relè telefonici, numeri binari in virgola mobile e un programma letto da una pellicola cinematografica perforata. Andava al ritmo di circa cinque passi al secondo, e una moltiplicazione richiedeva circa tre secondi.',
            'Negli Stati Uniti Howard Aiken, dell\'Università di Harvard, convinse l\'IBM a costruire una macchina ancora più grande: l\'Harvard Mark I, consegnato il 7 agosto 1944. Era un [[Calcolatore elettromeccanico|calcolatore elettromeccanico]] lungo 15 metri, con 765.000 componenti, 3.500 relè e circa 800 km di fili, mosso da un lungo albero motore. Faceva circa tre addizioni al secondo; per una moltiplicazione servivano sei secondi.',
            'I relè erano affidabili ma lenti: ogni scatto sposta un pezzo di metallo, e il metallo ha un peso. Con il tempo i contatti si consumavano e si sporcavano, e ogni tanto dentro ci finiva qualcosa.'),
          figBug(),
          ui.prose('Il 9 settembre 1947 i tecnici del Mark II, il successore del Mark I, trovarono una falena incastrata nel relè numero 70 del pannello F. La attaccarono al registro di bordo con il nastro adesivo e scrissero accanto: «First actual case of bug being found». La battuta funzionava perché bug, «insetto», si usava già da decenni per indicare un difetto: lo scriveva Thomas Edison nel 1878. Grace Hopper, che lavorava con quelle macchine, raccontò la storia per tutta la vita, e da allora un [[Bug|bug]] è anche un errore di un programma.'),
          ui.cols(
            ui.person({
              name: 'Konrad Zuse', years: '1910 – 1995', role: 'ingegnere',
              body: [
                'Costruì il suo primo calcolatore, lo Z1, tutto meccanico, nel salotto dei genitori a Berlino. Lo Z3 fu distrutto da un bombardamento nel 1943; una copia funzionante, ricostruita da lui stesso, è al Deutsches Museum di Monaco.',
                'Inventò anche uno dei primi linguaggi di programmazione, il Plankalkül.',
              ],
            }),
            ui.person({
              name: 'Grace Hopper', years: '1906 – 1992', role: 'matematica e ufficiale di marina',
              body: [
                'Nel 1944 entrò nella squadra del Mark I a Harvard, come ufficiale della riserva della Marina statunitense. Più tardi scrisse uno dei primi compilatori, i programmi che traducono istruzioni scritte quasi in inglese nel codice della macchina, e contribuì alla nascita del linguaggio COBOL.',
                'Andò in pensione nel 1986, a 79 anni, con il grado di contrammiraglio.',
              ],
            }))),

        ui.section({ id: 'valvole', title: 'La valvola, un interruttore senza ingranaggi', kicker: '1904 – 1906' },
          ui.prose(
            'Un interruttore senza parti in movimento può essere molto più veloce. La [[Valvola termoionica|valvola termoionica]] è un tubo di vetro in cui è stato fatto il vuoto: un filamento scalda un elettrodo, il catodo, che emette elettroni, e un secondo elettrodo positivo, l\'anodo, li raccoglie. Nel 1904 l\'inglese John Ambrose Fleming brevettò questa valvola a due elettrodi, il diodo, per rivelare le onde radio.',
            'Nel 1906 l\'americano Lee de Forest aggiunse tra catodo e anodo una griglia di filo sottile: era nato il [[Triodo|triodo]], che lui chiamò Audion. Bastano pochi volt sulla griglia per controllare la corrente che va all\'anodo. Le radio lo usavano per amplificare; a un calcolatore interessa un\'altra cosa: con la griglia abbastanza negativa la corrente si spegne del tutto, ed è l\'[[Interdizione|interdizione]]. Spento o acceso: 0 o 1.'),
          labTriode(),
          ui.prose('Gli elettroni non pesano quasi niente, così una valvola commuta in circa un milionesimo di secondo: migliaia di volte più in fretta di un relè. Ma ha tre difetti. Scalda, perché il filamento deve restare acceso anche quando la valvola non fa niente. Consuma: qualche watt per ogni valvola. E prima o poi si brucia, come una lampadina, perché il filamento a poco a poco si consuma.'),
          ui.callout({
            kind: 'note',
            title: 'Interruttore o amplificatore?',
            body: 'La stessa valvola può amplificare un segnale, se la griglia lavora nella zona di mezzo, oppure fare da interruttore, se la griglia salta tra l\'interdizione e la piena conduzione. Come si usa per amplificare lo racconta la sezione di <a href="../elettronica-intermedia/index.html#semiconduttori">elettronica intermedia</a>, insieme ai semiconduttori che la sostituiranno.',
          })),

        ui.section({ id: 'giganti-a-valvole', title: 'Migliaia di valvole accese', kicker: '1944 – 1946 · Bletchley Park e Filadelfia' },
          ui.prose(
            'Il primo grande calcolatore elettronico nacque in segreto, in Inghilterra, per decifrare i messaggi in codice dell\'alto comando tedesco. Tommy Flowers, ingegnere delle Poste britanniche, progettò Colossus: il primo esemplare, con circa 1.600 valvole, cominciò a lavorare a Bletchley Park all\'inizio del 1944, e il 1° giugno era pronto il Mark 2, con circa 2.400 valvole. Leggeva il nastro perforato a 5.000 caratteri al secondo. Alla fine della guerra ne funzionavano dieci, e la loro esistenza rimase segreta per decenni.',
            'Negli Stati Uniti, alla Moore School dell\'Università della Pennsylvania, John Mauchly e J. Presper Eckert costruirono per l\'esercito l\'ENIAC, che doveva calcolare le tavole di tiro dell\'artiglieria. Presentato nel febbraio 1946, aveva 17.468 valvole, pesava circa 27 tonnellate, assorbiva circa 150 kW e faceva 5.000 addizioni al secondo: più di mille volte il Mark I.',
            'Con tante valvole, la domanda era: quanto resiste una macchina prima che se ne bruci una? All\'inizio se ne guastavano diverse al giorno. Flowers sapeva, dall\'esperienza delle centrali telefoniche, che le valvole si rompono soprattutto quando si accendono e si spengono, per lo sbalzo di temperatura: così le macchine restavano sempre accese, e le valvole lavoravano ben al di sotto dei loro limiti. Eckert ricordava che alla fine all\'ENIAC si bruciava una valvola ogni due giorni circa, e che la trovavano in un quarto d\'ora.'),
          labHunt(),
          ui.stats([
            { value: 17468, label: 'valvole nell\'ENIAC' },
            { value: 27, unit: 't', label: 'il suo peso', note: 'circa 27 tonnellate' },
            { value: 150, unit: 'kW', label: 'la potenza assorbita', note: 'quanto una cinquantina di case di oggi' },
            { value: 5000, label: 'addizioni al secondo' },
          ]),
          ui.cols(
            ui.person({
              name: 'Tommy Flowers', years: '1905 – 1998', role: 'ingegnere',
              body: [
                'Figlio di un muratore dell\'East End di Londra, lavorava al centro di ricerca delle Poste a Dollis Hill, dove progettava centrali telefoniche. Quando propose una macchina con migliaia di valvole, molti erano convinti che non avrebbe mai funzionato.',
                'Dopo la guerra, per il segreto militare, non poté raccontare a nessuno che cosa aveva costruito: il suo ruolo fu reso pubblico solo a partire dagli anni Settanta.',
              ],
            }),
            ui.person({
              name: 'J. Presper Eckert e John Mauchly', initials: 'EM', years: 'Eckert 1919 – 1995 · Mauchly 1907 – 1980', role: 'ingegneri',
              body: [
                'Mauchly, fisico, ebbe l\'idea di una calcolatrice elettronica; Eckert, ingegnere di 24 anni, ne fece una macchina che funzionava davvero, scegliendo componenti robusti e facendoli lavorare con largo margine.',
                'Dopo l\'ENIAC fondarono la loro azienda e costruirono l\'UNIVAC, il primo calcolatore commerciale degli Stati Uniti, consegnato nel 1951.',
              ],
            })),
          ui.callout({
            kind: 'link',
            title: 'Le macchine giganti',
            body: 'Com\'erano fatti, come si programmavano e chi li usava, l\'ENIAC, Colossus e gli altri giganti: lo racconta la sezione sulla <a href="../storia-pc/index.html#giganti">storia dei PC</a>.',
          })),

        ui.section({ id: 'transistor', title: 'L\'interruttore allo stato solido', kicker: '1947 – 1959' },
          ui.prose(
            'Nel dicembre 1947, ai Bell Labs, John Bardeen e Walter Brattain fecero funzionare il primo [[Transistor|transistor]]: un cristallo di [[Germanio|germanio]] toccato da due sottili contatti d\'oro. Il loro capo, William Shockley, poco dopo inventò il transistor a giunzione. Come la valvola, il transistor usa un piccolo segnale per comandare una corrente più grande; ma lo fa dentro un pezzetto di cristallo, senza vuoto, senza filamento e senza parti in movimento: è un dispositivo a [[Stato solido|stato solido]].',
            'Il germanio però soffriva il caldo. Nel 1954 Gordon Teal, alla Texas Instruments, presentò il primo transistor al silicio, che resisteva a temperature molto più alte. Alla presentazione immerse nell\'olio caldo i transistor di un giradischi: con quelli al germanio la musica si fermava, con quelli al silicio continuava.',
            'I primi calcolatori a transistor arrivarono presto. A Manchester, nel novembre 1953, funzionò un prototipo con 92 transistor e 550 diodi, che per l\'orologio usava ancora qualche valvola. Ai Bell Labs il TRADIC, completato nel gennaio 1954 per l\'aviazione statunitense, aveva circa 700 transistor e oltre 10.000 diodi al germanio e consumava meno di 100 watt, un ventesimo di una macchina a valvole equivalente. Nel 1955, a Harwell, in Inghilterra, il CADET funzionava senza nemmeno una valvola. Nel 1959 l\'IBM 7090 sostituì con i transistor le valvole del suo predecessore, il 709: era sei volte più veloce.'),
          labRace(),
          ui.cols(
            ui.callout({
              kind: 'fun',
              title: 'Perché si chiama transistor',
              body: 'Il nome lo scelse nel 1948 l\'ingegnere John R. Pierce dei Bell Labs, unendo due parole inglesi: transfer, «trasferimento», e resistor, «resistenza». Il nuovo componente aveva bisogno di un nome che suonasse come quelli dei componenti che già si conoscevano.',
            }),
            ui.callout({
              kind: 'link',
              title: 'Come funziona un transistor',
              body: 'Che cosa succede dentro il cristallo, tra emettitore, base e collettore, lo spiega la sezione di <a href="../elettronica-intermedia/index.html#bjt">elettronica intermedia</a>.',
            }))),

        ui.section({ id: 'confronto', title: 'Tre interruttori a confronto', lead: 'Relè, valvola e transistor fanno lo stesso lavoro: aprono e chiudono un circuito. Ma in modi molto diversi.' },
          ui.prose('Una porta logica si comporta allo stesso modo qualunque sia l\'interruttore con cui è fatta: la tabella di verità di una AND non cambia. Cambiano invece le dimensioni, la velocità, il consumo e la durata, ed è questo a decidere quanto può diventare grande e veloce un calcolatore.'),
          labCompare(),
          ui.prose('Il transistor vinse su tutti i fronti, e alla fine degli anni Cinquanta le valvole uscirono dai calcolatori. Restava un problema: ogni transistor, resistenza e diodo andava ancora saldato a mano su una scheda, e le macchine più grandi ne avevano centinaia di migliaia. Più componenti volevano dire più saldature, più fili e più guasti: gli ingegneri la chiamarono la [[Tirannia dei numeri|tirannia dei numeri]], e la soluzione sarà il circuito integrato (<a href="#integrato">capitolo 6</a>).'),
          ui.keyIdea('Una porta logica è buona quanto l\'interruttore con cui è fatta. Dal relè alla valvola al transistor, ogni nuovo interruttore è stato più veloce, più piccolo, più parco e più affidabile del precedente, e ha reso possibili calcolatori che prima erano impensabili.'),
          ui.crossLink({ href: '#famiglie', kicker: 'Capitolo 5', title: 'Le famiglie logiche', text: 'Come si costruisce davvero una porta con transistor e resistenze: RTL, TTL, ECL e CMOS.' })));
    },
  });
})();
