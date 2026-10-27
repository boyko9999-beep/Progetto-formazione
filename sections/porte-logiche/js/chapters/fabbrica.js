/*
 * Capitolo 7 · Come si fabbrica un chip (1916 – oggi).
 * Dal quarzo al silicio purissimo, dal cristallo perfetto alle fette, la fotolitografia che stampa il disegno con la luce,
 * la corsa verso una luce sempre più corta fino all'ultravioletto estremo, la camera bianca, e infine collaudo, taglio,
 * contenitore e fonderie.
 * Laboratori: il crescitore Czochralski, quanti chip in un wafer, fotolitografia passo per passo,
 * più corta la luce più fine il disegno, aria pulita.
 * Figure: la sorgente di luce EUV; dal wafer al chip.
 */
(function () {
  'use strict';

  const { h, s, ui } = PL;

  const n1 = (v) => Math.round(v * 10) / 10;

  /* Numeri pseudocasuali con seme: lo stesso disegno a ogni visita, anche con il movimento ridotto. */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Tela nitida anche sugli schermi ad alta densità: si disegna in pixel CSS, dpr serve a chi scrive i pixel a mano. */
  function canvas(w, hgt, attrs) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = h('canvas', Object.assign({ width: Math.round(w * dpr), height: Math.round(hgt * dpr) }, attrs));
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, ctx, w, h: hgt, dpr };
  }

  /* ---------- laboratorio: il crescitore Czochralski ---------- */

  function labPuller() {
    const S = 7; // millimetri per unità del disegno
    const CX = 200;
    const MELT_TOP = 324; // livello del fuso a carica completa
    const MELT_END = 414; // il fondo che resta nel crogiolo
    const C_BOT = 432; // fondo interno del crogiolo
    const RHO = 2.33e-6; // densità del silicio, kg/mm³
    const CHARGE = 290; // kg di polisilicio nel crogiolo
    const NECK = { d: 4, len: 100, v: 3 }; // diametro e lunghezza in mm, velocità in mm/min
    const SHOULDER = { len: 130, v: 0.5 };
    const BODY = 1450;
    const TAIL = { len: 220, v: 0.7 };
    const V_NOM = 0.8;
    const D_NOM = 300;
    const MELT_H = 12;
    const SEED_H = 2;
    const COOL_H = 10;
    const LIFT = 34; // di quanto si alza il cristallo a fine crescita, in unità del disegno
    const SEED_Y = 150; // dove aspetta il seme prima di scendere
    const PH = [
      { id: 'fusione', name: 'Fusione', say: 'Il crogiolo di quarzo è pieno di pezzi di polisilicio. Le resistenze di grafite lo scaldano finché tutto si scioglie, poco sopra i 1.414 °C, in un\'atmosfera di argon che impedisce al silicio di reagire con l\'aria.' },
      { id: 'seme', name: 'Il seme', say: 'Un piccolo cristallo perfetto, il seme, scende appeso a un cavo e tocca la superficie del silicio fuso. Il cristallo che crescerà copierà esattamente l\'ordine dei suoi atomi.' },
      { id: 'collo', name: 'Il collo', say: 'Il seme viene tirato su in fretta e il cristallo cresce sottilissimo, pochi millimetri: in questo collo i difetti nati dallo shock del contatto escono dai lati e spariscono.' },
      { id: 'spalla', name: 'La spalla', say: 'Rallentando il tiraggio e abbassando appena la temperatura, il cristallo si allarga a cono fino al diametro voluto. Cristallo e crogiolo girano in versi opposti, per mescolare il fuso e crescere in modo uniforme.' },
      { id: 'corpo', name: 'Il corpo', say: 'Ora il cristallo sale piano, poco meno di un millimetro al minuto, con un diametro costante. È la parte che diventerà wafer: un macchinario misura di continuo il diametro e regola velocità e temperatura. Prova a cambiare la velocità di tiraggio.' },
      { id: 'coda', name: 'La coda', say: 'Quando nel crogiolo resta poco silicio, il diametro viene ridotto piano piano fino a staccare il cristallo dal fuso con una punta a cono, senza creare difetti nel corpo.' },
      { id: 'fine', name: 'Raffreddamento', say: 'Il lingotto viene alzato e lasciato raffreddare per ore. Poi si apre la camera: il cristallo è un unico blocco di silicio, con gli atomi in fila dal primo all\'ultimo.' },
    ];
    const RATE = { fusione: 5, seme: 2.5, collo: 1.5, spalla: 2.2, corpo: 3, coda: 2.2, fine: 5 }; // ore di processo per secondo
    const st = { ph: 0, tp: 0, t: 0, len: 0, mass: 0, prof: [], v: V_NOM, playing: false, done: false, bodyStart: 0, tailStart: 0, tailD: 0 };
    const dOf = (v) => Math.max(270, Math.min(330, D_NOM * Math.sqrt(V_NOM / v)));
    const gid = PL.uid('k1');

    const art = PL.svg('0 0 400 480', { class: 'pl-svg k1-art', role: 'img', 'aria-label': 'Sezione di un forno Czochralski: in basso il crogiolo con il silicio fuso, scaldato da resistenze di grafite; dall\'alto un cavo tira lentamente il cristallo, che cresce dal fuso girando su sé stesso.' });
    art.append(s('defs', null,
      s('linearGradient', { id: gid + '-melt', x1: 0, y1: 0, x2: 0, y2: 1 },
        s('stop', { offset: '0', 'stop-color': '#fff1c9' }),
        s('stop', { offset: '.18', 'stop-color': '#ffb347' }),
        s('stop', { offset: '1', 'stop-color': '#c4410f' })),
      s('linearGradient', { id: gid + '-xtal', x1: 0, y1: 0, x2: 1, y2: 0 },
        s('stop', { offset: '0', 'stop-color': '#4a555d' }),
        s('stop', { offset: '.35', 'stop-color': '#aab5bd' }),
        s('stop', { offset: '.55', 'stop-color': '#dfe6ea' }),
        s('stop', { offset: '1', 'stop-color': '#3b454c' })),
      s('linearGradient', { id: gid + '-sheen', x1: 0, y1: 0, x2: 1, y2: 0 },
        s('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '0' }),
        s('stop', { offset: '.5', 'stop-color': '#fff', 'stop-opacity': '.55' }),
        s('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0' })),
      s('clipPath', { id: gid + '-clip' }, s('path', { class: 'k1-clip' }))));
    const clipPath = art.querySelector('.k1-clip');
    const cup = (x0, x1, top, bot, r) => `M${x0} ${top}V${bot - r}Q${x0} ${bot} ${x0 + r} ${bot}H${x1 - r}Q${x1} ${bot} ${x1} ${bot - r}V${top}`;
    const meltPath = s('path', { class: 'k1-melt', fill: `url(#${gid}-melt)` });
    const meltLine = s('line', { class: 'k1-surface', x1: 108, x2: 292 });
    const chunks = s('g', { class: 'k1-chunks' });
    const cr = rng(1916);
    for (let i = 0; i < 34; i++) {
      const x = 116 + cr() * 168;
      const y = 300 + cr() * 124 - (Math.abs(x - CX) < 60 ? 22 : 0);
      const r = 9 + cr() * 9;
      const pts = Array.from({ length: 5 }, (_, k) => {
        const a = (k / 5) * Math.PI * 2 + cr() * 0.8;
        const rr = r * (0.65 + cr() * 0.45);
        return n1(x + Math.cos(a) * rr) + ' ' + n1(y + Math.sin(a) * rr);
      });
      chunks.append(s('path', { d: 'M' + pts.join('L') + 'Z' }));
    }
    const crystal = s('path', { class: 'k1-crystal', fill: `url(#${gid}-xtal)` });
    const sheen = s('g', { 'clip-path': `url(#${gid}-clip)` }, s('rect', { class: 'k1-sheen', x: -40, y: 0, width: 40, height: 480, fill: `url(#${gid}-sheen)` }));
    const cable = s('line', { class: 'k1-cable', x1: CX, x2: CX, y1: 8 });
    const chuck = s('rect', { class: 'k1-chuck', x: CX - 7, width: 14, height: 9, rx: 2 });
    const seed = s('rect', { class: 'k1-seed', x: CX - 1.5, width: 3, height: 15 });
    const spinX = s('g', { class: 'k1-spin' },
      s('path', { class: 'k1-arrow', d: 'M-34 0A34 8 0 0 0 34 0' }), s('path', { class: 'k1-arrowhead', d: 'M30 -4L37 1L29 5Z' }));
    const xLabel = s('g', { class: 'k1-xlbl' }, s('line', { x1: 0, y1: 0, x2: 16, y2: -10 }), s('text', { x: 20, y: -12 }, 'cristallo'));
    const meltLabel = s('text', { class: 'k1-lbl is-melt', x: CX, 'text-anchor': 'middle' }, 'silicio fuso · 1.414 °C');
    art.append(
      s('path', { class: 'k1-chamber', d: 'M150 6H250V250H366Q378 250 378 262V454Q378 466 366 466H34Q22 466 22 454V262Q22 250 34 250H150Z' }),
      s('path', { class: 'k1-inner', d: 'M157 12H243V257H364Q371 257 371 264V452Q371 459 364 459H36Q29 459 29 452V264Q29 257 36 257H157Z' }),
      s('rect', { class: 'k1-felt', x: 40, y: 282, width: 20, height: 166, rx: 3 }),
      s('rect', { class: 'k1-felt', x: 340, y: 282, width: 20, height: 166, rx: 3 }),
      s('rect', { class: 'k1-heater', x: 74, y: 300, width: 14, height: 140, rx: 3 }),
      s('rect', { class: 'k1-heater', x: 312, y: 300, width: 14, height: 140, rx: 3 }),
      s('rect', { class: 'k1-shaft', x: 189, y: 444, width: 22, height: 16 }),
      s('path', { class: 'k1-susceptor', d: cup(96, 304, 294, 444, 38) }),
      chunks, meltPath, meltLine,
      s('path', { class: 'k1-quartz', d: cup(104, 296, 298, 436, 32) }),
      s('g', { class: 'k1-spin is-crucible', transform: 'translate(200 456) scale(-1 1)' },
        s('path', { class: 'k1-arrow', d: 'M-40 0A40 7 0 0 0 40 0' }), s('path', { class: 'k1-arrowhead', d: 'M36 -4L43 1L35 5Z' })),
      crystal, sheen, cable, chuck, seed, spinX, xLabel, meltLabel,
      s('text', { class: 'k1-lbl', x: 258, y: 40 }, 'camera di tiraggio'),
      s('text', { class: 'k1-lbl is-small', x: 258, y: 56 }, 'argon'),
      s('text', { class: 'k1-lbl is-small', x: 36, y: 276 }, 'resistenze di grafite'),
      s('text', { class: 'k1-lbl is-small', x: 364, y: 276, 'text-anchor': 'end' }, 'crogiolo di quarzo'));

    // pannello con le misure
    const phaseList = h('ol', { class: 'k1-phases' }, PH.map((p) => h('li', null, p.name)));
    const tEl = h('dd', { class: 'pl-mono' });
    const lEl = h('dd', { class: 'pl-mono' });
    const dEl = h('dd', { class: 'pl-mono' });
    const mEl = h('dd', { class: 'pl-mono' });
    const panel = h('div', { class: 'pl-lab-panel k1-panel' },
      h('h4', null, 'Le fasi'), phaseList,
      h('dl', { class: 'k1-dl' },
        h('dt', null, 'tempo trascorso'), tEl,
        h('dt', null, 'lunghezza'), lEl,
        h('dt', null, 'diametro'), dEl,
        h('dt', null, 'peso'), mEl));
    const readout = h('p');

    function grow(dl, d) {
      if (dl <= 0) return;
      st.len += dl;
      st.mass += Math.PI * (d / 2) * (d / 2) * dl * RHO;
      const last = st.prof[st.prof.length - 1];
      if (!last || st.len - last[0] >= 4 || Math.abs(d - last[1]) > 6) st.prof.push([st.len, d]);
      else { last[0] = st.len; last[1] = d; }
    }
    function next() {
      st.ph += 1;
      st.tp = 0;
      phaseChanged();
    }
    function advance(dt) {
      if (st.done) return;
      const id = PH[st.ph].id;
      st.t += dt;
      st.tp += dt;
      if (id === 'fusione') { if (st.tp >= MELT_H) next(); return; }
      if (id === 'seme') {
        if (st.tp >= SEED_H) { st.prof = [[0, NECK.d]]; next(); }
        return;
      }
      if (id === 'collo') {
        grow(Math.min(NECK.v * 60 * dt, NECK.len - st.len), NECK.d);
        if (st.len >= NECK.len - 0.01) next();
        return;
      }
      if (id === 'spalla') {
        const dl = Math.min(SHOULDER.v * 60 * dt, NECK.len + SHOULDER.len - st.len);
        const k = (st.len + dl - NECK.len) / SHOULDER.len;
        grow(dl, NECK.d + (dOf(st.v) - NECK.d) * Math.sin(Math.min(1, k) * Math.PI / 2));
        if (k >= 0.999) { st.bodyStart = st.len; next(); }
        return;
      }
      if (id === 'corpo') {
        grow(Math.min(st.v * 60 * dt, st.bodyStart + BODY - st.len), dOf(st.v));
        if (st.len >= st.bodyStart + BODY - 0.01) { st.tailStart = st.len; st.tailD = dOf(st.v); next(); }
        return;
      }
      if (id === 'coda') {
        const dl = Math.min(TAIL.v * 60 * dt, st.tailStart + TAIL.len - st.len);
        const k = (st.len + dl - st.tailStart) / TAIL.len;
        grow(dl, Math.max(5, st.tailD * Math.cos(Math.min(1, k) * Math.PI / 2)));
        if (k >= 0.999) next();
        return;
      }
      if (st.tp >= COOL_H) { st.done = true; stop(); phaseChanged(); }
    }

    const fmtLen = (mm) => (mm < 1000 ? PL.fmt(mm / 10, 0) + ' cm' : PL.fmt(mm / 1000, 2) + ' m');
    function render() {
      const id = PH[st.ph].id;
      const mk = id === 'fusione' ? Math.min(1, st.tp / MELT_H) : 1;
      const remaining = Math.max(0, 1 - st.mass / CHARGE);
      const meltY = mk < 1 ? C_BOT - (C_BOT - MELT_TOP) * PL.motion.ease.inOut(mk) : MELT_END + (MELT_TOP - MELT_END) * remaining;
      const heat = id === 'fusione' ? Math.min(1, st.tp / (MELT_H * 0.4)) : id === 'fine' ? Math.max(0, 1 - st.tp / COOL_H) : 1;
      art.style.setProperty('--heat', heat.toFixed(3));
      meltPath.setAttribute('d', cup(107, 293, meltY, C_BOT - 1, 28) + 'Z');
      meltLine.setAttribute('y1', n1(meltY));
      meltLine.setAttribute('y2', n1(meltY));
      chunks.style.opacity = String(1 - PL.motion.ease.out(mk));
      chunks.setAttribute('transform', `translate(0 ${n1(mk * 30)})`);
      meltLabel.setAttribute('y', n1(Math.min(C_BOT - 8, meltY + 34)));
      meltLabel.classList.toggle('is-on', mk >= 1 && remaining > 0.08);
      const lift = id === 'fine' ? LIFT * PL.motion.ease.inOut(Math.min(1, st.tp / 2)) : 0;
      const base = meltY - lift;
      let top;
      if (st.prof.length > 1) {
        const L = st.len;
        const right = [];
        const left = [];
        for (const [l, d] of st.prof) {
          const y = n1(base - (L - l) / S);
          const r = Math.max(0.3, d / 2 / S);
          right.push(n1(CX + r) + ' ' + y);
          left.push(n1(CX - r) + ' ' + y);
        }
        const d = 'M' + right.join('L') + 'L' + left.reverse().join('L') + 'Z';
        crystal.setAttribute('d', d);
        clipPath.setAttribute('d', d);
        top = base - L / S;
      } else {
        crystal.setAttribute('d', '');
        clipPath.setAttribute('d', '');
        top = id === 'seme' ? SEED_Y + (meltY - SEED_Y) * PL.motion.ease.inOut(Math.min(1, st.tp / SEED_H)) : id === 'fusione' ? SEED_Y : base;
      }
      seed.setAttribute('y', n1(top - 15));
      chuck.setAttribute('y', n1(top - 24));
      cable.setAttribute('y2', n1(top - 24));
      const growing = st.prof.length > 1;
      const dNow = growing ? st.prof[st.prof.length - 1][1] : 0;
      spinX.setAttribute('transform', `translate(${CX} ${n1(base - 10)})`);
      spinX.classList.toggle('is-on', growing && id !== 'fine');
      xLabel.setAttribute('transform', `translate(${n1(CX + Math.max(8, dNow / 2 / S) + 6)} ${n1(base - 26)})`);
      xLabel.classList.toggle('is-on', growing && st.len > 400);
      art.classList.toggle('is-grow', growing && id !== 'fine');
      tEl.textContent = PL.fmt(st.t, 1) + ' ore';
      lEl.textContent = growing ? fmtLen(st.len) : '—';
      dEl.textContent = growing && id !== 'fine' ? Math.round(dNow) + ' mm' : '—';
      mEl.textContent = growing ? PL.fmt(st.mass, st.mass < 10 ? 1 : 0) + ' kg' : '—';
    }
    function phaseChanged() {
      phaseList.querySelectorAll('li').forEach((li, i) => {
        li.classList.toggle('is-done', i < st.ph || st.done);
        li.classList.toggle('is-current', i === st.ph && !st.done);
      });
      explain();
    }
    function explain() {
      const p = PH[st.ph];
      let msg = '<strong>' + p.name + '.</strong> ' + p.say;
      if (p.id === 'corpo' && Math.abs(st.v - V_NOM) > 0.01) {
        msg += st.v > V_NOM
          ? ' Tirando più in fretta il cristallo non fa in tempo ad allargarsi e si assottiglia: ora cresce con ' + Math.round(dOf(st.v)) + ' mm di diametro, troppo pochi per ricavarne wafer da 300 mm.'
          : ' Tirando più piano il cristallo si allarga: ora cresce con ' + Math.round(dOf(st.v)) + ' mm di diametro, e il silicio in più andrà perso quando il lingotto sarà rettificato a 300 mm.';
      }
      if (st.done) msg = '<strong>Fatto.</strong> Dopo ' + PL.fmt(st.t, 0) + ' ore di lavoro il lingotto è lungo ' + fmtLen(st.len) + ' e pesa circa ' + PL.fmt(st.mass, 0) + ' kg. Ora va rettificato, tagliato a fette e lucidato.';
      readout.replaceChildren(PL.rich(msg));
    }

    const sim = PL.reduced() ? null : PL.loop((dt) => {
      advance(dt * RATE[PH[st.ph].id]);
      render();
    }, { el: art, autostart: false });
    function stop() {
      st.playing = false;
      if (sim) sim.stop();
      syncBtn();
    }
    function play() {
      if (st.done) reset();
      if (!sim) {
        // movimento ridotto: si salta direttamente alla fine della fase
        const from = st.ph;
        let guard = 0;
        while (!st.done && st.ph === from && guard < 20000) { advance(0.05); guard += 1; }
        render();
        phaseChanged();
        syncBtn();
        return;
      }
      st.playing = true;
      sim.start();
      syncBtn();
    }
    function reset() {
      Object.assign(st, { ph: 0, tp: 0, t: 0, len: 0, mass: 0, prof: [], done: false, bodyStart: 0, tailStart: 0, tailD: 0 });
      phaseChanged();
      render();
    }
    const playBtn = ui.btn({ label: 'Avvia la crescita', icon: '▶', kind: 'lab', onClick: () => (st.playing ? stop() : play()) });
    function syncBtn() {
      playBtn.firstChild.textContent = st.playing ? '❚❚' : st.done ? '↺' : '▶';
      playBtn.lastChild.textContent = st.playing ? 'Pausa' : st.done ? 'Ricomincia' : !sim ? 'Fase successiva' : st.t > 0 ? 'Continua' : 'Avvia la crescita';
      playBtn.setAttribute('aria-pressed', st.playing ? 'true' : 'false');
    }
    const resetBtn = ui.btn({ label: 'Da capo', icon: '⏮', kind: 'lab', onClick: () => { stop(); reset(); syncBtn(); } });
    const vSl = ui.slider({
      label: 'Velocità di tiraggio', min: 0.6, max: 1, step: 0.05, value: V_NOM,
      format: (v) => PL.fmt(v, 2) + ' mm/min',
      onInput: (v) => { st.v = v; if (PH[st.ph].id === 'corpo') explain(); },
    });
    reset();
    syncBtn();
    if (sim) PL.onVisible(art, () => { if (!st.playing && st.t === 0) play(); }, { threshold: 0.4 });

    return ui.lab({
      title: 'Il crescitore Czochralski',
      intro: 'Un forno che «tira» dal silicio fuso un unico cristallo perfetto, lungo come una persona. Guarda le fasi in un filmato accelerato e prova a cambiare la velocità di tiraggio mentre cresce il corpo.',
      controls: [playBtn, resetBtn, vSl.el],
      stage: h('div', { class: 'pl-lab-grid k1-grid' }, h('div', { class: 'k1-wrap' }, art), panel),
      readout,
      caption: 'Disegno schematico, con le proporzioni di un forno per wafer da 300 mm. Il filmato è accelerato più di diecimila volte; durate, velocità e carica sono valori tipici, che cambiano da una fabbrica all\'altra, e in fabbrica, contando anche la preparazione del forno, un ciclo completo dura alcuni giorni. Il legame tra velocità e diametro è semplificato: nelle macchine vere il diametro si tiene costante regolando insieme la velocità di tiraggio e la potenza dei riscaldatori.',
      class: 'k1-lab',
    });
  }

  /* ---------- laboratorio: quanti chip in un wafer ---------- */

  function labWafer() {
    const SIZES = [50, 100, 150, 200, 300];
    const EDGE = 3; // millimetri di bordo che non si usano
    const LANE = 0.1; // corsia per il taglio, mm
    const SIDE = 400; // lato della tela, px
    const PX = 380 / 300; // pixel per millimetro: il wafer da 300 mm riempie la tela
    const st = { d: 300, area: 100, dens: 0.2, seed: 7, p: 1 };
    const cv = canvas(SIDE, SIDE, { class: 'k2-canvas', role: 'img', 'aria-label': 'Un wafer visto dall\'alto, diviso nella griglia dei chip. I chip che non stanno interi sul bordo sono grigi; i puntini sono i difetti e i chip colpiti diventano rossi.' });
    const ctx = cv.ctx;
    let dies = [];
    let defects = [];
    let gross = 0;

    function layout() {
      const R = st.d / 2;
      const a = Math.sqrt(st.area);
      const pitch = a + LANE;
      const n = Math.ceil(R / pitch) + 1;
      let best = null;
      for (const [ox, oy] of [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]]) {
        const list = [];
        let full = 0;
        for (let i = -n; i <= n; i++) {
          for (let j = -n; j <= n; j++) {
            const cx = (i + ox) * pitch;
            const cy = (j + oy) * pitch;
            const fx = Math.abs(cx) + a / 2;
            const fy = Math.abs(cy) + a / 2;
            const inside = fx * fx + fy * fy <= (R - EDGE) * (R - EDGE);
            const nx = Math.max(0, Math.abs(cx) - a / 2);
            const ny = Math.max(0, Math.abs(cy) - a / 2);
            if (nx * nx + ny * ny >= R * R) continue;
            list.push({ cx, cy, full: inside, bad: false });
            if (inside) full += 1;
          }
        }
        if (!best || full > best.full) best = { full, list, pitch, ox, oy };
      }
      dies = best.list;
      gross = best.full;
      st.pitch = best.pitch;
      st.ox = best.ox;
      st.oy = best.oy;
    }
    function gauss(r) {
      let u = 0;
      let v = 0;
      while (u === 0) u = r();
      while (v === 0) v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    function scatter() {
      const r = rng(st.seed);
      const R = st.d / 2;
      const lam = st.dens * Math.PI * R * R / 100;
      const N = Math.max(0, Math.round(lam + Math.sqrt(lam) * gauss(r)));
      defects = [];
      for (let k = 0; k < N; k++) {
        const rr = R * Math.sqrt(r());
        const th = r() * Math.PI * 2;
        defects.push({ x: rr * Math.cos(th), y: rr * Math.sin(th), die: -1 });
      }
      const a = Math.sqrt(st.area);
      const index = new Map();
      dies.forEach((dd, i) => index.set(Math.round(dd.cx / st.pitch - st.ox) + ',' + Math.round(dd.cy / st.pitch - st.oy), i));
      for (const f of defects) {
        const i = Math.round(f.x / st.pitch - st.ox);
        const j = Math.round(f.y / st.pitch - st.oy);
        const k = index.get(i + ',' + j);
        if (k == null) continue;
        const dd = dies[k];
        if (Math.abs(f.x - dd.cx) <= a / 2 && Math.abs(f.y - dd.cy) <= a / 2 && dd.full) f.die = k;
      }
    }
    function waferPath(R) {
      const c = SIDE / 2;
      const Rp = R * PX;
      ctx.beginPath();
      if (st.d >= 200) {
        const dl = 6 / Rp;
        ctx.arc(c, c, Rp, Math.PI / 2 + dl, Math.PI / 2 - dl + Math.PI * 2);
        ctx.lineTo(c, c + Rp - 5);
      } else {
        const flat = { 50: 15.9, 100: 32.5, 150: 57.5 }[st.d] / 2;
        const ph = Math.asin(flat / R);
        ctx.arc(c, c, Rp, Math.PI / 2 + ph, Math.PI / 2 - ph + Math.PI * 2);
      }
      ctx.closePath();
    }
    function draw() {
      const c = SIDE / 2;
      ctx.clearRect(0, 0, SIDE, SIDE);
      if (st.d < 300) {
        ctx.save();
        ctx.setLineDash([5, 6]);
        ctx.strokeStyle = 'rgba(169, 195, 185, .35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(c, c, 150 * PX, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      const R = st.d / 2;
      ctx.save();
      waferPath(R);
      const g = ctx.createRadialGradient(c - R * PX * 0.35, c - R * PX * 0.4, R * PX * 0.1, c, c, R * PX);
      g.addColorStop(0, '#9fb0bd');
      g.addColorStop(0.5, '#5d6d7a');
      g.addColorStop(1, '#2d3740');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.clip();
      const shown = Math.floor(defects.length * st.p);
      const hit = new Set();
      for (let k = 0; k < shown; k++) if (defects[k].die >= 0) hit.add(defects[k].die);
      const a = Math.sqrt(st.area) * PX;
      const gap = a > 5 ? 0.6 : 0.25;
      dies.forEach((dd, i) => {
        const x = c + dd.cx * PX - a / 2 + gap;
        const y = c + dd.cy * PX - a / 2 + gap;
        const w = Math.max(0.4, a - gap * 2);
        if (!dd.full) ctx.fillStyle = 'rgba(20, 28, 33, .55)';
        else if (hit.has(i)) ctx.fillStyle = 'rgba(255, 107, 94, .85)';
        else ctx.fillStyle = 'rgba(60, 198, 217, .5)';
        ctx.fillRect(x, y, w, w);
      });
      ctx.restore();
      ctx.save();
      waferPath(R);
      ctx.strokeStyle = 'rgba(232, 242, 238, .55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#ffe39a';
      ctx.shadowColor = 'rgba(255, 227, 154, .9)';
      ctx.shadowBlur = 6;
      const dr = st.d <= 100 ? 2.2 : 1.6;
      for (let k = 0; k < shown; k++) {
        ctx.beginPath();
        ctx.arc(c + defects[k].x * PX, c + defects[k].y * PX, dr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      return hit.size;
    }

    const goodEl = h('span', { class: 'k2-big pl-mono' });
    const grossEl = h('dd', { class: 'pl-mono' });
    const badEl = h('dd', { class: 'pl-mono' });
    const edgeEl = h('dd', { class: 'pl-mono' });
    const yEl = h('dd', { class: 'pl-mono' });
    const yModel = h('dd', { class: 'pl-mono' });
    const panel = h('div', { class: 'pl-lab-panel k2-panel' },
      h('h4', null, 'Il conto del wafer'),
      h('p', { class: 'k2-bigrow' }, goodEl, h('span', { class: 'k2-unit' }, 'chip buoni')),
      h('dl', { class: 'k2-dl' },
        h('dt', null, 'chip interi'), grossEl,
        h('dt', null, 'colpiti da un difetto'), badEl,
        h('dt', null, 'incompleti sul bordo'), edgeEl,
        h('dt', null, 'resa di questo wafer'), yEl,
        h('dt', null, 'resa prevista, e', h('sup', null, '−A·D')), yModel));
    const readout = h('p');

    function counts(hitN) {
      const good = gross - hitN;
      const Y = Math.exp(-(st.area / 100) * st.dens);
      goodEl.textContent = PL.fmt(good, 0);
      grossEl.textContent = PL.fmt(gross, 0);
      badEl.textContent = PL.fmt(hitN, 0);
      edgeEl.textContent = PL.fmt(dies.length - gross, 0);
      yEl.textContent = gross ? PL.fmt((good / gross) * 100, 0) + '%' : '—';
      yModel.textContent = PL.fmt(Y * 100, 0) + '%';
      return { good, Y };
    }
    function explain(good, Y) {
      const big = st.area >= 400;
      let msg = 'Su un wafer da ' + st.d + ' mm stanno ' + PL.fmt(gross, 0) + ' chip interi da ' + PL.fmt(st.area, 0) + ' mm². ';
      msg += 'Con ' + PL.fmt(st.dens, 2) + ' difetti per centimetro quadrato il modello prevede che ne funzioni il ' + PL.fmt(Y * 100, 0) + '%: in questo wafer i chip buoni sono <strong>' + PL.fmt(good, 0) + '</strong>. ';
      msg += big
        ? 'Un chip grande è un bersaglio grande: basta un difetto in qualunque punto per buttarlo, ed è per questo che i chip giganti costano così tanto.'
        : 'Più il chip è piccolo, più è difficile che un difetto lo colpisca, e più chip si ricavano dallo stesso wafer.';
      readout.replaceChildren(PL.rich(msg));
    }
    let tw = null;
    function update(animate) {
      layout();
      scatter();
      if (tw) tw.cancel();
      if (animate && !PL.reduced()) {
        tw = PL.tween({ from: 0, to: 1, duration: 1100, ease: PL.motion.ease.linear, onUpdate: (p) => { st.p = p; counts(draw()); }, onDone: () => { const r = counts(draw()); explain(r.good, r.Y); } });
      } else {
        st.p = 1;
        const r = counts(draw());
        explain(r.good, r.Y);
      }
    }
    const sizeSeg = ui.segmented({ label: 'Diametro del wafer', value: st.d, options: SIZES.map((d) => ({ value: d, label: d + (d === 300 ? ' mm' : ''), title: d + ' mm' })), onChange: (v) => { st.d = +v; update(false); } });
    const areaSl = ui.slider({
      label: 'Area del chip', min: 1, max: 2.9, step: 0.01, value: 2,
      format: (v) => PL.fmt(Math.round(Math.pow(10, v)), 0) + ' mm²',
      onInput: (v) => { st.area = Math.round(Math.pow(10, v)); update(false); },
    });
    const densSl = ui.slider({
      label: 'Difetti', min: -1.3, max: 0.3, step: 0.01, value: Math.log10(st.dens),
      format: (v) => PL.fmt(Math.pow(10, v), 2) + ' per cm²',
      onInput: (v) => { st.dens = Math.round(Math.pow(10, v) * 100) / 100; update(false); },
    });
    const rollBtn = ui.btn({ label: 'Un altro wafer', icon: '↻', kind: 'lab', onClick: () => { st.seed += 1; update(true); } });
    update(false);
    PL.onVisible(cv.c, () => update(true), { threshold: 0.4 });

    return ui.lab({
      title: 'Quanti chip in un wafer',
      intro: 'Da ogni wafer si ricavano centinaia di chip, ma non tutti funzionano: qualche granello o imperfezione cade sempre da qualche parte. Scegli il wafer, la grandezza del chip e quanti difetti ci sono.',
      controls: [sizeSeg.el, areaSl.el, densSl.el, rollBtn],
      stage: h('div', { class: 'pl-lab-grid k2-grid' }, h('div', { class: 'k2-wrap' }, cv.c), panel),
      readout,
      caption: 'Modello semplificato: i difetti cadono a caso, uno qualunque rende inutilizzabile il chip su cui cade, e la resa prevista è e<sup>−A·D</sup> (A area del chip in cm², D difetti per cm²). Si lasciano 3 mm di bordo e una corsia di 0,1 mm tra i chip per il taglio. Il cerchio tratteggiato è il wafer da 300 mm, per confronto.',
      class: 'k2-lab',
    });
  }

  /* ---------- laboratorio: fotolitografia passo per passo ---------- */

  function labLitho() {
    const SI = 196; // superficie del silicio
    const OX = 20; // spessore dell'ossido nel disegno
    const RS = 24; // spessore del fotoresist
    const XL = 20;
    const XR = 620;
    const OPEN = [{ cx: 150, w: 72 }, { cx: 318, w: 40 }, { cx: 478, w: 104 }];
    const open = { resist: 0, ox: 0 };
    const STEPS = [
      { title: 'Il wafer', text: 'Si parte da un [[Wafer|wafer]] di silicio lucidato a specchio. Qui ne vediamo una piccolissima sezione, ingrandita decine di migliaia di volte.' },
      { title: 'Ossidazione', text: 'In un forno a circa 1.000 °C, con ossigeno o vapore acqueo, la superficie si copre di un sottile strato di ossido di silicio, che isola e protegge.' },
      { title: 'Il fotoresist', text: 'Si versa al centro una goccia di [[Fotoresist|fotoresist]], una resina sensibile alla luce, e si fa girare il wafer a qualche migliaio di giri al minuto: resta un velo uniforme, spesso al massimo un millesimo di millimetro, e nei processi più avanzati molto meno.' },
      { title: 'La maschera', text: 'Sopra il wafer si allinea la [[Maschera|maschera]], una lastra di quarzo con il disegno dello strato tracciato in cromo: dove c\'è il cromo la luce non passa.' },
      { title: 'Esposizione', text: 'Un lampo di luce ultravioletta attraversa le parti trasparenti della maschera e colpisce il fotoresist, cambiandone la chimica proprio dove servirà una finestra.' },
      { title: 'Sviluppo', text: 'Un liquido di sviluppo scioglie il fotoresist colpito dalla luce (è il resist «positivo»): sul wafer resta il disegno della maschera, in rilievo.' },
      { title: 'Incisione', text: 'Dove il fotoresist non protegge più, un plasma di gas reattivi scava l\'ossido fino al silicio: è l\'[[Incisione|incisione]]. Il resto della superficie resta intatto.' },
      { title: 'Via il fotoresist', text: 'Il fotoresist ha finito il suo lavoro: lo si scioglie con solventi o lo si brucia in un plasma di ossigeno. Nell\'ossido restano finestre precise, proprio dove le voleva il progettista.' },
      { title: 'Drogaggio', text: 'Ioni di fosforo o di boro, accelerati a grande velocità, si piantano nel silicio attraverso le finestre: è l\'[[Impiantazione ionica|impiantazione ionica]], il modo moderno di fare il [[Drogaggio|drogaggio]]. Dove arrivano, il silicio cambia comportamento elettrico.' },
      { title: 'E si ricomincia', text: 'Il primo strato è pronto. Per un processore moderno il ciclo si ripete decine di volte, alternato a depositi di nuovi materiali e lucidature: più di mille passaggi e mesi di lavoro.' },
    ];

    const art = PL.svg('0 0 640 300', { class: 'pl-svg k3-art', role: 'img', 'aria-label': 'Sezione di un wafer durante la fotolitografia: ossido, fotoresist, maschera, luce ultravioletta, sviluppo, incisione, rimozione del fotoresist e impiantazione di ioni.' });
    const items = [];
    const at = (el, steps) => { el.classList.add('k3-x'); items.push([el, steps]); return el; };
    const lbl = (x, y, t, cls, anchor) => s('text', { class: 'k3-lbl' + (cls ? ' ' + cls : ''), x, y, 'text-anchor': anchor || 'start' }, t);
    const cupD = (x0, x1, y1) => `M${x0} ${SI}H${x1}V${y1 - 10}Q${x1} ${y1} ${x1 - 10} ${y1}H${x0 + 10}Q${x0} ${y1} ${x0} ${y1 - 10}Z`;
    // strato con finestre che si aprono: k va da 0 (chiuso) a 1 (aperto)
    function layer(y0, thick, k) {
      let d = '';
      let x = XL;
      for (const o of OPEN) {
        const a = o.cx - (o.w / 2) * k;
        const b = o.cx + (o.w / 2) * k;
        if (k > 0.01) {
          if (a > x) d += `M${n1(x)} ${y0}H${n1(a)}V${y0 + thick}H${n1(x)}Z`;
          x = b;
        }
      }
      d += `M${n1(x)} ${y0}H${XR}V${y0 + thick}H${n1(x)}Z`;
      return d;
    }
    const oxPath = s('path', { class: 'k3-ox' });
    const resPath = s('path', { class: 'k3-resist' });
    const exposed = at(s('g', { class: 'k3-exposed' }), [4]);
    const rays = at(s('g', { class: 'k3-rays' }), [4]);
    const ions = at(s('g', { class: 'k3-ions' }), [8]);
    const ir = rng(8);
    OPEN.forEach((o) => {
      exposed.append(s('rect', { x: o.cx - o.w / 2, y: SI - OX - RS, width: o.w, height: RS }));
      for (let x = o.cx - o.w / 2 + 6; x <= o.cx + o.w / 2 - 5; x += 11) rays.append(s('line', { x1: x, y1: 70, x2: x, y2: SI - OX - RS }));
      const n = Math.max(3, Math.round(o.w / 9));
      for (let k = 0; k < n; k++) ions.append(s('circle', { cx: n1(o.cx - o.w / 2 + 5 + ir() * (o.w - 10)), cy: n1(60 + ir() * 60), r: 2.6, style: { '--d': n1(ir() * 0.9) + 's' } }));
    });
    const mask = at(s('g', { class: 'k3-mask' }), [3, 4]);
    mask.append(s('rect', { class: 'k3-glass', x: XL, y: 50, width: XR - XL, height: 16, rx: 2 }));
    let mx = XL;
    OPEN.forEach((o) => {
      mask.append(s('rect', { class: 'k3-chrome', x: mx, y: 62, width: o.cx - o.w / 2 - mx, height: 4 }));
      mx = o.cx + o.w / 2;
    });
    mask.append(s('rect', { class: 'k3-chrome', x: mx, y: 62, width: XR - mx, height: 4 }));
    const plasma = at(s('g', { class: 'k3-plasma' }), [6]);
    plasma.append(s('rect', { class: 'k3-glow', x: XL, y: 96, width: XR - XL, height: 54, rx: 10 }));
    const pr = rng(6);
    for (let k = 0; k < 22; k++) plasma.append(s('line', { class: 'k3-streak', x1: n1(XL + 20 + pr() * (XR - XL - 40)), y1: 104, x2: 0, y2: 0, style: { '--d': n1(pr() * 1.2) + 's' } }));
    plasma.querySelectorAll('.k3-streak').forEach((l) => { l.setAttribute('x2', l.getAttribute('x1')); l.setAttribute('y2', 118); });
    const wells = OPEN.map((o) => at(s('path', { class: 'k3-well k3-grow', d: cupD(o.cx - o.w / 2 - 4, o.cx + o.w / 2 + 4, SI + 30 + o.w * 0.12) }), [8, 9]));
    // il wafer visto dall'alto mentre gira (fase del fotoresist)
    const spin = at(s('g', { class: 'k3-top' }), [2]);
    spin.append(
      s('circle', { class: 'k3-top-wafer', cx: 572, cy: 64, r: 38 }),
      s('g', { class: 'k3-top-rot' },
        s('circle', { class: 'k3-top-resist', cx: 572, cy: 64, r: 36 }),
        s('path', { class: 'k3-top-swirl', d: 'M572 64c8-2 12 6 6 12-8 8-22 0-20-12 2-16 24-22 36-10 14 14 4 38-16 40' })),
      lbl(572, 118, 'visto dall\'alto', 'is-small', 'middle'));
    // la pila di strati che verranno
    const stack = at(s('g', { class: 'k3-stack' }), [9]);
    ['#5cc8ff', '#ffc04d', '#3ee08f', '#ff7aa8', '#cbd4db', '#b48cff'].forEach((c, i) => stack.append(s('rect', { x: 470, y: 112 - i * 13, width: 128, height: 9, rx: 2, fill: c, style: { '--i': i } })));
    stack.append(lbl(534, 36, 'decine di strati', 'is-hint', 'middle'));

    art.append(
      s('rect', { class: 'k3-si', x: XL, y: SI, width: XR - XL, height: 104 }),
      ...wells,
      at(s('g', { class: 'k3-oxg k3-grow-up' }, oxPath), [1, 2, 3, 4, 5, 6, 7, 8, 9]),
      at(s('g', { class: 'k3-resg k3-grow-up' }, resPath), [2, 3, 4, 5, 6]),
      exposed, plasma, rays, mask, ions, spin, stack,
      lbl(30, 286, 'silicio'),
      at(lbl(30, SI - 6, 'ossido', 'is-ox'), [1, 2, 3, 4, 5, 6, 7, 8, 9]),
      at(lbl(30, SI - OX - 7, 'fotoresist', 'is-res'), [2, 3, 4, 5, 6]),
      at(lbl(30, 44, 'maschera', 'is-mask'), [3, 4]),
      at(lbl(30, 90, 'luce UV', 'is-uv'), [4]),
      at(lbl(30, 90, 'plasma', 'is-plasma'), [6]),
      at(lbl(30, 90, 'ioni', 'is-ion'), [8]),
      at(lbl(30, 258, 'zone drogate', 'is-well'), [8, 9]));

    function setOpen(key, v, delay) {
      if (open[key] === v) return;
      const from = open[key];
      PL.tween({ from, to: v, duration: 700, delay: delay || 0, ease: PL.motion.ease.inOut, onUpdate: (x) => { open[key] = x; paint(); } });
    }
    function paint() {
      oxPath.setAttribute('d', layer(SI - OX, OX, open.ox));
      resPath.setAttribute('d', layer(SI - OX - RS, RS, open.resist));
    }
    function apply(i) {
      items.forEach(([el, steps]) => el.classList.toggle('is-on', steps.includes(i)));
      setOpen('resist', i >= 5 ? 1 : 0, i === 5 ? 350 : 0);
      setOpen('ox', i >= 6 ? 1 : 0, i === 6 ? 500 : 0);
      paint();
    }
    paint();
    const stepper = ui.stepper({ label: 'Fasi della fotolitografia', steps: STEPS, interval: 4600, onStep: (i) => apply(i) });

    return ui.lab({
      title: 'Fotolitografia passo per passo',
      intro: 'Il cuore della fabbrica: stampare con la luce il disegno di uno strato del chip. Segui le fasi una per una, o premi ▶ per vederle in sequenza.',
      stage: [art, stepper.el],
      caption: 'Sezione schematica, non in scala: l\'ossido e il fotoresist sono spessi meno di un millesimo di millimetro e le finestre dei chip moderni sono larghe poche decine di nanometri. Nelle macchine di oggi la luce passa da una maschera grande quattro volte il disegno e un sistema ottico la rimpicciolisce sul wafer.',
      class: 'k3-lab',
      wide: true,
    });
  }

  /* ---------- laboratorio: più corta la luce, più fine il disegno ---------- */

  function labLight() {
    const K1 = 0.3; // fattore di processo usato nel calcolo della riga più fine
    const SRC = [
      { id: 'g', name: 'Lampada al mercurio, riga g', short: 'g · 436', nm: 436, na: 0.45, year: 'anni Ottanta' },
      { id: 'i', name: 'Lampada al mercurio, riga i', short: 'i · 365', nm: 365, na: 0.6, year: 'dal 1990 circa' },
      { id: 'krf', name: 'Laser a fluoruro di kripton (KrF)', short: 'KrF · 248', nm: 248, na: 0.8, year: 'dalla metà degli anni Novanta' },
      { id: 'arf', name: 'Laser a fluoruro di argon (ArF)', short: 'ArF · 193', nm: 193, na: 0.93, year: 'dai primi anni Duemila' },
      { id: 'arfi', name: 'ArF a immersione, con acqua tra lente e wafer', short: 'ArF imm.', nm: 193, na: 1.35, year: 'dal 2007 circa' },
      { id: 'euv', name: 'Ultravioletto estremo (EUV)', short: 'EUV · 13,5', nm: 13.5, na: 0.33, year: 'dal 2019' },
      { id: 'hna', name: 'EUV ad alta apertura (High-NA)', short: 'High-NA', nm: 13.5, na: 0.55, year: 'prime macchine dal 2023' },
    ];
    const HP = [400, 200, 100, 50, 25, 13, 8]; // mezzo passo delle righe di prova, nm
    const COLW = 100;
    const W = COLW * HP.length;
    const RH = 64;
    const st = { src: 'arfi' };
    const aerial = canvas(W, RH, { class: 'k4-canvas', 'aria-hidden': 'true' });
    const print = canvas(W, RH, { class: 'k4-canvas', 'aria-hidden': 'true' });
    const noise = (() => { const r = rng(248); return Float32Array.from({ length: W * RH }, () => r() - 0.5); })();
    const mtf = (x) => (x >= 1 ? 0 : (2 / Math.PI) * (Math.acos(x) - x * Math.sqrt(1 - x * x)));
    const MMIN = mtf(0.25 / K1);
    const labels = HP.map((hp) => h('span', { class: 'k4-col' }, h('b', null, hp + ' nm'), h('small', null, '')));

    function render() {
      const s0 = SRC.find((x) => x.id === st.src);
      const R0 = (0.25 * s0.nm) / s0.na;
      const ar = aerial.ctx;
      const pc = print.ctx;
      const dpr = aerial.dpr;
      const imgA = ar.createImageData(Math.round(W * dpr), Math.round(RH * dpr));
      const imgP = pc.createImageData(Math.round(W * dpr), Math.round(RH * dpr));
      const PW = imgA.width;
      const PH = imgA.height;
      const mods = HP.map((hp) => mtf(R0 / hp));
      for (let px = 0; px < PW; px++) {
        const x = px / dpr;
        const col = Math.min(HP.length - 1, Math.floor(x / COLW));
        const xin = x - col * COLW;
        const M = mods[col];
        const edge = xin < 8 || xin > COLW - 8;
        const I = edge ? 0 : 0.5 - 0.5 * M * Math.cos((2 * Math.PI * (xin - 8)) / ((COLW - 16) / 5));
        for (let py = 0; py < PH; py++) {
          const o = (py * PW + px) * 4;
          // luce: dal buio al viola chiaro
          imgA.data[o] = 12 + I * 200;
          imgA.data[o + 1] = 18 + I * 160;
          imgA.data[o + 2] = 22 + I * 233;
          imgA.data[o + 3] = 255;
          let dissolved = false;
          if (!edge && M >= MMIN) {
            const nz = noise[(Math.floor(py / dpr) * W + Math.floor(x)) % noise.length] * 0.16;
            dissolved = I + nz * (1 - Math.min(1, M * 1.6)) > 0.5;
          }
          const c = edge ? [11, 18, 16] : dissolved ? [38, 52, 62] : [217, 164, 65];
          imgP.data[o] = c[0];
          imgP.data[o + 1] = c[1];
          imgP.data[o + 2] = c[2];
          imgP.data[o + 3] = 255;
        }
      }
      ar.putImageData(imgA, 0, 0);
      pc.putImageData(imgP, 0, 0);
      labels.forEach((el, i) => {
        const ok = mods[i] >= MMIN;
        el.classList.toggle('is-bad', !ok);
        el.lastChild.textContent = ok ? (mods[i] > 0.35 ? 'nitida' : 'al limite') : 'sparisce';
      });
      const cd = (K1 * s0.nm) / s0.na;
      nameEl.textContent = s0.name;
      metaEl.textContent = 'λ = ' + PL.fmt(s0.nm, s0.nm < 100 ? 1 : 0) + ' nm · NA = ' + PL.fmt(s0.na, 2) + ' · ' + s0.year;
      cdEl.textContent = PL.fmt(cd, cd < 20 ? 1 : 0) + ' nm';
      const atoms = Math.round(cd / 0.235);
      readout.replaceChildren(PL.rich('Con una lunghezza d\'onda di ' + PL.fmt(s0.nm, s0.nm < 100 ? 1 : 0) + ' nm e un\'apertura numerica di ' + PL.fmt(s0.na, 2) + ', la riga più fine che si stampa in un solo passaggio è di circa <strong>' + PL.fmt(cd, cd < 20 ? 1 : 0) + ' nm</strong>: ' + (cd > 100 ? 'più grande di un virus dell\'influenza, che misura circa 100 nm.' : cd > 30 ? 'più piccola di un virus dell\'influenza (circa 100 nm), ma ancora larga circa ' + atoms + ' atomi di silicio messi in fila.' : 'larga appena ' + atoms + ' atomi di silicio messi in fila.')));
    }
    const nameEl = h('p', { class: 'k4-name' });
    const metaEl = h('p', { class: 'k4-meta pl-mono' });
    const cdEl = h('span', { class: 'k4-big pl-mono' });
    const panel = h('div', { class: 'pl-lab-panel k4-panel' },
      h('h4', null, 'La sorgente di luce'), nameEl, metaEl,
      h('p', { class: 'k4-cdrow' }, h('span', { class: 'k4-kick' }, 'riga più fine in un passaggio'), cdEl),
      h('p', { class: 'k4-formula pl-mono' }, 'riga ≈ k₁ · λ / NA, con k₁ = 0,3'));
    const readout = h('p');
    const seg = ui.segmented({ label: 'Sorgente di luce', value: st.src, options: SRC.map((x) => ({ value: x.id, label: x.short, title: x.name })), onChange: (v) => { st.src = v; render(); } });
    const chart = h('div', { class: 'k4-chart' },
      h('p', { class: 'k4-row-t' }, 'La luce che arriva sul fotoresist'), aerial.c,
      h('p', { class: 'k4-row-t' }, 'Il disegno dopo lo sviluppo'), print.c,
      h('div', { class: 'k4-cols' }, labels));
    render();

    return ui.lab({
      title: 'Più corta la luce, più fine il disegno',
      intro: 'Una maschera di prova con righe sempre più sottili, come la tabella dell\'oculista: scegli la luce e guarda quali righe arrivano nitide sul wafer e quali diventano una macchia uniforme.',
      controls: [seg.el],
      stage: h('div', { class: 'k4-grid' }, chart, panel),
      readout,
      caption: 'Ogni colonna è ingrandita in modo diverso, per mostrare cinque righe della larghezza indicata. Modello semplificato: il contrasto delle righe segue la risposta di un sistema ottico ideale e la riga più fine stampabile in un solo passaggio è k₁·λ/NA, con k₁ = 0,3 (il limite teorico è 0,25). Con trucchi come le esposizioni multiple si scende ancora.',
      class: 'k4-lab',
    });
  }

  /* ---------- laboratorio: aria pulita ---------- */

  function labAir() {
    const BOX = 168;
    const ROOMS = [
      { id: 'citta', name: 'Aria di città', per: 35200000, flow: 0, note: 'nebbia di polveri, pollini, fumi' },
      { id: 'sala', name: 'Sala operatoria', per: 352000, flow: 0, note: 'ISO 7' },
      { id: 'iso5', name: 'Camera bianca ISO 5', per: 3520, flow: 1, note: 'flusso d\'aria dall\'alto' },
      { id: 'iso3', name: 'Camera bianca ISO 3', per: 35, flow: 1, note: 'come nelle sale di litografia' },
    ];
    const r = rng(14644);
    const boxes = ROOMS.map((room) => {
      const cv = canvas(BOX, BOX, { class: 'k5-canvas', 'aria-hidden': 'true' });
      const perL = room.per / 1000;
      const n = Math.floor(perL) + (r() < perL - Math.floor(perL) ? 1 : 0);
      const pts = room.id === 'citta' ? [] : Array.from({ length: n }, () => ({ x: r() * BOX, y: r() * BOX, vx: 0, vy: 0, life: Infinity }));
      let fog = null;
      if (room.id === 'citta') {
        fog = canvas(BOX, BOX * 2, {});
        const fctx = fog.ctx;
        fctx.fillStyle = 'rgba(214, 196, 160, .55)';
        // ogni puntino è disegnato due volte, a un riquadro di distanza: la nebbia si ripete e scorre senza salti
        for (let k = 0; k < n; k++) {
          const x = r() * BOX;
          const y = r() * BOX;
          fctx.fillRect(x, y, 0.9, 0.9);
          fctx.fillRect(x, y + BOX, 0.9, 0.9);
        }
      }
      const count = h('b', { class: 'pl-mono' }, perL >= 1 ? PL.fmt(Math.round(perL), 0) : 'meno di 1');
      const el = h('figure', { class: 'k5-box is-' + room.id },
        h('div', { class: 'k5-frame' }, cv.c, room.flow ? h('span', { class: 'k5-flow', 'aria-hidden': 'true' }) : null),
        h('figcaption', null,
          h('strong', null, room.name),
          h('span', null, count, ' in un litro'),
          h('small', null, PL.fmt(room.per, 0) + ' per m³ · ' + room.note)));
      return { room, cv, pts, fog, el, off: 0 };
    });

    function step(dt) {
      boxes.forEach((b) => {
        const ctx = b.cv.ctx;
        ctx.clearRect(0, 0, BOX, BOX);
        if (b.fog) {
          b.off = (b.off + dt * 6) % BOX;
          ctx.drawImage(b.fog.c, 0, b.off - BOX, BOX, BOX * 2);
          return;
        }
        for (let k = b.pts.length - 1; k >= 0; k--) {
          const p = b.pts[k];
          if (dt) {
            p.vx += (r() - 0.5) * 40 * dt;
            p.vy += (r() - 0.5) * 40 * dt;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.x += p.vx * dt;
            p.y += (p.vy + (b.room.flow ? 26 : 0)) * dt;
            if (p.x < 0) p.x += BOX;
            if (p.x > BOX) p.x -= BOX;
            if (p.y > BOX) {
              // le particelle portate da una persona escono dalle griglie del pavimento, le altre rientrano dall'alto
              if (p.life !== Infinity) { b.pts.splice(k, 1); continue; }
              p.y -= BOX;
            }
            if (p.y < 0) p.y += BOX;
          }
          ctx.fillStyle = p.life !== Infinity ? 'rgba(255, 138, 128, .95)' : 'rgba(255, 227, 154, .95)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.life !== Infinity ? 1.6 : 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    let suit = true;
    function person() {
      boxes.forEach((b) => {
        if (!b.room.flow) return;
        const n = suit ? 6 : 160;
        for (let k = 0; k < n; k++) b.pts.push({ x: 10 + r() * 40, y: BOX * 0.55 + r() * BOX * 0.4, vx: 10 + r() * 30, vy: -10 - r() * 30, life: 1 });
      });
      readout.replaceChildren(PL.rich(suit
        ? 'Una persona con la tuta, i guanti e la maschera libera solo poche particelle, e il flusso d\'aria che scende dal soffitto le spinge subito verso le griglie del pavimento.'
        : 'Senza tuta una persona libera di continuo frammenti di pelle, capelli e fibre dei vestiti: è la prima fonte di sporco in una camera bianca. Il flusso d\'aria li porta via in pochi secondi, ma intanto possono cadere su un wafer.'));
      if (PL.reduced()) { step(0); PL.timeout(() => { boxes.forEach((b) => { b.pts = b.pts.filter((p) => p.life === Infinity); }); step(0); }, 2500); }
    }
    const suitSeg = ui.segmented({ label: 'Tuta', value: 'si', options: [{ value: 'si', label: 'Con la tuta' }, { value: 'no', label: 'Senza tuta' }], onChange: (v) => { suit = v === 'si'; } });
    const personBtn = ui.btn({ label: 'Fai entrare una persona', icon: '🚶', kind: 'lab', onClick: person });
    const readout = h('p', null, 'Ogni riquadro è un litro d\'aria, e ogni puntino una particella più grande di mezzo micrometro, molto ingrandita. In città un litro ne contiene decine di migliaia; nelle camere bianche dove si stampano i chip, quasi nessuna.');
    const grid = h('div', { class: 'k5-grid' }, boxes.map((b) => b.el));
    if (PL.reduced()) step(0);
    else PL.loop((dt) => step(dt), { el: grid });

    return ui.lab({
      title: 'Aria pulita',
      intro: 'Una sola particella di polvere su un wafer può rovinare un chip. Confronta l\'aria che respiri con quella di una camera bianca, e guarda che cosa succede quando entra una persona.',
      controls: [suitSeg.el, personBtn],
      stage: grid,
      readout,
      caption: 'Particelle di almeno 0,5 micrometri. I valori delle camere bianche sono i limiti massimi delle classi della norma ISO 14644-1; quello dell\'aria di città è un ordine di grandezza tipico e cambia molto da un giorno all\'altro. I puntini sono ingranditi: una particella di mezzo micrometro è invisibile a occhio nudo.',
      class: 'k5-lab',
    });
  }

  /* ---------- figura: la sorgente di luce EUV ---------- */

  function figEuv() {
    // lo specchio collettore è un pezzo di ellisse: il plasma sta in un fuoco, la luce converge nell'altro
    const P = [330, 150];
    const F = [600, 150];
    const ell = (deg) => {
      const t = (deg * Math.PI) / 180;
      return [n1(465 + 255 * Math.cos(t)), n1(150 + 216 * Math.sin(t))];
    };
    const arc = (a0, a1) => 'M' + Array.from({ length: 17 }, (_, k) => ell(a0 + ((a1 - a0) * k) / 16).join(' ')).join('L');
    const rays = [150, 163, 197, 210].map((deg) => {
      const m = ell(deg);
      return s('path', { d: `M${P[0]} ${P[1]}L${m[0]} ${m[1]}L${F[0]} ${F[1]}` });
    });
    const drops = s('g', { class: 'k0-drops' });
    for (let k = 0; k < 6; k++) drops.append(s('circle', { class: 'k0-drop', cx: P[0], cy: 34, r: 3.4, style: { '--k': k } }));
    const art = PL.svg('0 0 640 300', { class: 'pl-svg k0-art', role: 'img', 'aria-label': 'Schema della sorgente di luce EUV: dall\'alto cadono goccioline di stagno; un laser, entrando da un foro nello specchio, colpisce ogni goccia due volte e la trasforma in un plasma che emette luce a 13,5 nanometri; lo specchio curvo la raccoglie e la concentra in un punto, da cui entra nel resto della macchina.' });
    art.append(
      s('g', { class: 'k0-rays' }, rays),
      s('path', { class: 'k0-mirror', d: arc(149, 176.5) }),
      s('path', { class: 'k0-mirror', d: arc(183.5, 211) }),
      s('path', { class: 'k0-beam', d: `M18 ${P[1]}H${P[0]}` }),
      s('path', { class: 'k0-laser is-pre', d: `M18 ${P[1]}H${P[0]}` }),
      s('path', { class: 'k0-laser is-main', d: `M18 ${P[1]}H${P[0]}` }),
      s('rect', { class: 'k0-nozzle', x: P[0] - 12, y: 6, width: 24, height: 22, rx: 3 }),
      drops,
      s('rect', { class: 'k0-catcher', x: P[0] - 14, y: 268, width: 28, height: 20, rx: 3 }),
      s('ellipse', { class: 'k0-pancake', cx: P[0], cy: P[1], rx: 2.6, ry: 9 }),
      s('circle', { class: 'k0-plasma', cx: P[0], cy: P[1], r: 16 }),
      s('circle', { class: 'k0-if', cx: F[0], cy: F[1], r: 5 }),
      s('text', { class: 'k0-t', x: 352, y: 20 }, 'gocce di stagno'),
      s('text', { class: 'k0-t is-small', x: 352, y: 37 }, '50.000 al secondo'),
      s('text', { class: 'k0-t', x: 22, y: 136 }, 'laser a CO₂'),
      s('text', { class: 'k0-t is-small', x: 22, y: 172 }, 'due impulsi per goccia'),
      s('text', { class: 'k0-t is-hot', x: 352, y: 144 }, 'plasma'),
      s('text', { class: 'k0-t is-small', x: 352, y: 161 }, 'circa 220.000 °C'),
      s('text', { class: 'k0-t', x: 296, y: 26, 'text-anchor': 'end' }, 'specchio collettore'),
      s('text', { class: 'k0-t is-euv', x: 630, y: 190, 'text-anchor': 'end' }, 'luce a 13,5 nm'),
      s('text', { class: 'k0-t is-small', x: 630, y: 207, 'text-anchor': 'end' }, 'verso la macchina'),
      s('text', { class: 'k0-t is-small', x: 22, y: 288 }, 'tutto sotto vuoto'));
    const fig = ui.figure({
      art, dark: true, class: 'k0-fig',
      caption: 'La sorgente di luce di una macchina EUV, molto semplificata e al rallentatore: in realtà cadono circa 50.000 goccioline di stagno al secondo, ognuna più sottile di un capello. Ogni goccia viene colpita due volte da un laser: il primo impulso la schiaccia come una frittella, il secondo la trasforma in un plasma a circa 220.000 °C, che emette luce ultravioletta estrema. Lo specchio curvo la raccoglie e la concentra in un punto, da cui entra nel resto della macchina. Tutto avviene sotto vuoto.',
    });
    if (PL.reduced()) fig.classList.add('is-still');
    else PL.onVisible(fig, () => fig.classList.add('is-in'), { threshold: 0.3 });
    return fig;
  }

  /* ---------- figura: dal wafer al chip ---------- */

  function figBack() {
    const gid = PL.uid('k6');
    const grid = (cx, cy, r, step) => {
      const g = s('g', { class: 'k6-dies', 'clip-path': `url(#${gid}-${cx})` });
      for (let x = cx - r; x < cx + r; x += step) for (let y = cy - r; y < cy + r; y += step) g.append(s('rect', { x: x + 0.6, y: y + 0.6, width: step - 1.2, height: step - 1.2 }));
      return [s('clipPath', { id: `${gid}-${cx}` }, s('circle', { cx, cy, r: r - 3 })), g];
    };
    const view = (label, ...kids) => PL.svg('0 0 116 150', { class: 'pl-svg k6-art', role: 'img', 'aria-label': label }, ...kids);

    // 1 · collaudo: gli aghi provano ogni chip, quelli guasti ricevono una goccia d'inchiostro
    const ink = [[44, 74], [74, 84], [54, 114], [84, 104], [34, 94]].map(([x, y], k) => s('circle', { class: 'k6-ink', cx: x, cy: y, r: 3.2, style: { '--k': k } }));
    const test = view('Collaudo: una scheda ad aghi tocca i contatti dei chip ancora sul wafer; quelli guasti vengono segnati.',
      s('circle', { class: 'k6-wafer', cx: 58, cy: 96, r: 46 }), ...grid(59, 96, 46, 10), ...ink,
      s('g', { class: 'k6-probe' },
        s('rect', { class: 'k6-card', x: 30, y: 16, width: 56, height: 14, rx: 3 }),
        s('path', { class: 'k6-needle', d: 'M48 30L56 52M68 30L60 52' })));
    // 2 · taglio: il wafer sul film adesivo, la lama segue le corsie
    const cuts = s('g', { class: 'k6-cuts' });
    [76, 96, 116].forEach((y, k) => cuts.append(s('path', { d: `M18 ${y}H98`, style: { '--k': k } })));
    [38, 58, 78].forEach((x, k) => cuts.append(s('path', { d: `M${x} 56V136`, style: { '--k': k + 3 } })));
    const saw = view('Taglio: il wafer, incollato su un film dentro un anello, viene separato in chip da una lama diamantata.',
      s('circle', { class: 'k6-ring', cx: 58, cy: 96, r: 52 }),
      s('circle', { class: 'k6-tape', cx: 58, cy: 96, r: 47 }),
      s('circle', { class: 'k6-wafer', cx: 58, cy: 96, r: 40 }), ...grid(58, 96, 40, 10), cuts,
      s('g', { transform: 'translate(98 30)' }, s('g', { class: 'k6-blade' },
        s('circle', { r: 13 }), s('path', { d: 'M0 -13V13M-13 0H13M-9 -9L9 9M9 -9L-9 9' }))));
    // 3 · montaggio: il chip buono viene preso e incollato sul supporto
    const mount = view('Montaggio: una pinzetta a vuoto prende il chip buono e lo incolla sul supporto del contenitore.',
      s('rect', { class: 'k6-sub', x: 16, y: 118, width: 84, height: 16, rx: 2 }),
      s('rect', { class: 'k6-pad', x: 34, y: 114, width: 48, height: 4 }),
      s('g', { class: 'k6-pick' },
        s('rect', { class: 'k6-die', x: 38, y: 98, width: 40, height: 16, rx: 1.5 }),
        s('g', { class: 'k6-tool' }, s('rect', { x: 52, y: 40, width: 12, height: 58, rx: 2 }), s('rect', { x: 48, y: 30, width: 20, height: 12, rx: 3 }))));
    // 4 · collegamenti: fili sottilissimi dai contatti del chip ai piedini
    const wires = s('g', { class: 'k6-wires' });
    const pads = s('g', { class: 'k6-pads' });
    const leads = s('g', { class: 'k6-leads' });
    for (let k = 0; k < 4; k++) {
      const y = 70 + k * 16;
      pads.append(s('rect', { x: 41, y: y - 2, width: 4, height: 4 }), s('rect', { x: 71, y: y - 2, width: 4, height: 4 }));
      leads.append(s('rect', { x: 4, y: y - 3, width: 16, height: 6, rx: 1 }), s('rect', { x: 96, y: y - 3, width: 16, height: 6, rx: 1 }));
      wires.append(
        s('path', { d: `M43 ${y}Q30 ${y - 14} 17 ${y}`, style: { '--k': k } }),
        s('path', { d: `M73 ${y}Q86 ${y - 14} 99 ${y}`, style: { '--k': k + 4 } }));
    }
    const bond = view('Collegamenti: fili più sottili di un capello uniscono i contatti del chip ai piedini del contenitore.',
      leads, s('rect', { class: 'k6-die', x: 36, y: 58, width: 44, height: 72, rx: 2 }), pads, wires);
    // 5 · contenitore: chiuso, marcato e provato di nuovo
    const pins = s('g', { class: 'k6-pins' });
    for (let k = 0; k < 6; k++) {
      const p = 52 + k * 9;
      pins.append(s('rect', { x: p - 1.6, y: 48, width: 3.2, height: 10 }), s('rect', { x: p - 1.6, y: 128, width: 3.2, height: 10 }),
        s('rect', { x: 22, y: p + 18.4, width: 10, height: 3.2 }), s('rect', { x: 84, y: p + 18.4, width: 10, height: 3.2 }));
    }
    const pack = view('Contenitore: il chip chiuso nel suo involucro con i piedini, provato di nuovo prima di essere spedito.',
      pins,
      s('rect', { class: 'k6-body', x: 32, y: 58, width: 52, height: 70, rx: 3 }),
      s('circle', { class: 'k6-dot', cx: 40, cy: 66, r: 2.2 }),
      s('text', { class: 'k6-mark', x: 58, y: 98, 'text-anchor': 'middle' }, 'CHIP'),
      s('rect', { class: 'k6-glint', x: 32, y: 58, width: 14, height: 70 }),
      s('g', { transform: 'translate(92 30)' }, s('g', { class: 'k6-ok' }, s('circle', { r: 11 }), s('path', { d: 'M-5 0L-1 4L5 -4' }))));

    const steps = [
      [test, 'Collaudo', 'aghi sottilissimi provano ogni chip, ancora sul wafer'],
      [saw, 'Taglio', 'una lama diamantata separa i chip lungo le corsie'],
      [mount, 'Montaggio', 'ogni chip buono viene incollato sul supporto'],
      [bond, 'Collegamenti', 'fili più sottili di un capello lo uniscono ai piedini'],
      [pack, 'Contenitore', 'chiuso e provato di nuovo, il chip è pronto'],
    ];
    const strip = h('ol', { class: 'k6-strip' }, steps.map(([art, title, text], i) => h('li', { class: 'k6-step', style: { '--i': i } },
      art, h('p', null, h('b', null, (i + 1) + ' · ' + title), h('span', null, text)))));
    const fig = ui.figure({
      art: strip, dark: true, wide: true, class: 'k6-fig',
      caption: 'Le ultime tappe, molto semplificate. Nei chip più complessi i fili sono sostituiti da migliaia di sferette di saldatura (il flip-chip), e spesso più chip vengono montati insieme nello stesso contenitore.',
    });
    if (PL.reduced()) fig.classList.add('is-still');
    else PL.onVisible(fig, () => fig.classList.add('is-in'), { threshold: 0.3 });
    return fig;
  }

  /* ---------- capitolo ---------- */

  PL.chapter({
    id: 'fabbrica',
    num: 7,
    title: 'Come si fabbrica un chip',
    short: 'Fabbrica',
    era: '1916 – oggi',
    minutes: 25,
    labs: 5,
    kicker: 'Il processo di fabbricazione più complesso mai inventato: quarzo purificato fino all\'ultimo atomo, un cristallo perfetto tagliato a fette, e centinaia di passaggi di luce, chimica e ioni in stanze più pulite di una sala operatoria.',
    summary: 'Dal quarzo al polisilicio, il cristallo di Czochralski, i wafer e la resa, la fotolitografia passo per passo, la luce sempre più corta fino all\'EUV, la camera bianca, il collaudo, il contenitore e le fonderie.',
    timeline: [
      { year: 1916, title: 'Il pennino nello stagno', text: 'A Berlino Jan Czochralski scopre come tirare un unico cristallo da un metallo fuso. Pubblicherà il metodo nel 1918.', key: true },
      { year: 1950, title: 'Cristalli per i transistor', text: 'Gordon Teal e John Little, dei Bell Labs, pubblicano come tirano dal fuso grandi cristalli di germanio con il metodo di Czochralski.' },
      { year: 1957, title: 'Nasce la fotolitografia', text: 'Jay Lathrop e James Nall usano la luce e un fotoresist per fabbricare transistor, e chiedono il brevetto.' },
      { year: 1984, title: 'Nasce ASML', text: 'Philips e ASM International fondano nei Paesi Bassi l\'azienda che diventerà l\'unica a costruire macchine per la litografia EUV.' },
      { year: 1987, title: 'La prima fonderia', text: 'Morris Chang fonda a Taiwan la TSMC, che fabbricherà soltanto chip progettati da altri.', key: true },
      { year: 2001, title: 'Wafer da 300 mm', text: 'In Giappone e in Germania comincia la produzione in volume su wafer da 300 mm di diametro.' },
      { year: 2019, title: 'L\'EUV in produzione', text: 'La luce a 13,5 nanometri entra nella produzione di massa dei chip più avanzati.', key: true },
      { year: 2023, title: 'La prima High-NA', text: 'ASML consegna a Intel la prima macchina EUV ad alta apertura numerica.' },
    ],
    glossary: [
      { term: 'Silicio', def: 'Elemento chimico (simbolo Si), il secondo più abbondante nella crosta terrestre dopo l\'ossigeno. È un semiconduttore: purificato e cristallizzato, è il materiale di quasi tutti i chip.' },
      { term: 'Polisilicio', def: 'Silicio purissimo formato da tanti piccoli cristalli orientati a caso. Si ottiene con il processo Siemens, con una purezza fino a undici nove (99,999999999%), ed è la materia prima dei lingotti.' },
      { term: 'Lingotto', def: 'Il grande cilindro di silicio fatto di un unico cristallo, ottenuto con il metodo Czochralski. Per i wafer da 300 mm può essere lungo fino a circa due metri e pesare qualche centinaio di chili.' },
      { term: 'Metodo Czochralski', def: 'Tecnica per far crescere un unico cristallo da un materiale fuso: un seme cristallino tocca la superficie del fuso e viene tirato su lentamente, girando. Scoperta da Jan Czochralski nel 1916, dà quasi tutto il silicio dei chip.' },
      { term: 'Wafer', def: 'Fetta sottile di silicio monocristallino lucidata a specchio, oggi di solito da 300 mm di diametro e spessa 775 micrometri, su cui si costruiscono insieme centinaia di chip.' },
      { term: 'Fotolitografia', def: 'Tecnica che stampa con la luce il disegno di uno strato del chip: si illumina un fotoresist attraverso una maschera, lo si sviluppa e si usa ciò che resta come stencil per incidere, depositare o drogare.' },
      { term: 'Fotoresist', def: 'Resina sensibile alla luce stesa in un velo sottilissimo sul wafer. Nel tipo positivo le parti illuminate si sciolgono nello sviluppo; nel tipo negativo restano.' },
      { term: 'Maschera', def: 'Lastra di quarzo con il disegno di uno strato del chip tracciato in cromo; per la luce EUV è invece uno specchio. Nelle macchine moderne il disegno è quattro volte più grande di quello stampato sul wafer.' },
      { term: 'Incisione', def: 'Rimozione del materiale nelle zone non protette dal fotoresist. Si fa con bagni chimici o, per i dettagli più fini, con plasmi di gas reattivi.' },
      { term: 'Drogaggio', def: 'Aggiunta controllata di pochissimi atomi di altri elementi, come boro o fosforo, che cambiano il modo in cui il silicio conduce la corrente. Crea le zone n e p dei transistor.' },
      { term: 'Impiantazione ionica', def: 'Tecnica di drogaggio che accelera atomi elettricamente carichi (ioni) e li conficca nel silicio: permette di scegliere con precisione quanti atomi mettere e a che profondità.' },
      { term: 'Camera bianca', def: 'Ambiente di produzione in cui l\'aria è filtrata di continuo per tenere bassissimo il numero di particelle di polvere. La pulizia si misura con le classi della norma ISO 14644-1.' },
      { term: 'EUV', def: 'Extreme ultraviolet, ultravioletto estremo: luce con lunghezza d\'onda di 13,5 nanometri, usata dal 2019 nella produzione dei chip più avanzati. Nasce da un plasma di stagno e si guida solo con specchi, sotto vuoto.' },
      { term: 'Resa produttiva', def: 'La percentuale di chip funzionanti tra quelli costruiti su un wafer. Dipende soprattutto dall\'area del chip e dal numero di difetti per centimetro quadrato.' },
      { term: 'Package', def: 'Il contenitore del chip: lo protegge, ne disperde il calore e collega i suoi contatti microscopici ai piedini o alle sferette di saldatura che vanno sul circuito stampato.' },
      { term: 'Fonderia', def: 'Azienda che fabbrica chip progettati da altri. La prima fonderia «pura», che non progetta chip propri, fu la TSMC, fondata a Taiwan nel 1987 da Morris Chang.' },
    ],
    render(root) {
      root.append(
        ui.section({ id: 'sabbia', title: 'Dalla sabbia al silicio purissimo', kicker: 'Quarzo, carbone, cloro e idrogeno', lead: 'Il silicio è uno degli elementi più comuni della Terra, ma in natura non si trova mai da solo. Per farne chip bisogna strapparlo all\'ossigeno e poi purificarlo come nessun altro materiale prodotto in grandi quantità.' },
          ui.prose(
            'Il [[Silicio|silicio]] è il secondo elemento più abbondante della crosta terrestre, dopo l\'ossigeno: ne forma circa il 28% in massa. Però non lo si trova mai puro: è sempre legato all\'ossigeno, nel quarzo e nei silicati di cui sono fatte sabbie, rocce e argille. Si dice spesso che i chip nascono dalla sabbia, ed è un\'immagine efficace ma imprecisa: non si usa la sabbia delle spiagge, troppo impura e così fine che intaserebbe i forni, ma quarzo o quarzite quasi puri, in pezzi di qualche centimetro. Chimicamente, però, è la stessa sostanza di cui è fatta molta sabbia: il biossido di silicio.',
            'Il primo passo avviene in grandi forni elettrici ad arco. Il quarzo viene scaldato a circa 2.000 °C insieme a carbone, coke e trucioli di legno: il carbonio si porta via l\'ossigeno sotto forma di gas e resta il silicio metallurgico, puro al 98–99% circa. Gran parte finisce nelle leghe di alluminio e nei siliconi; una quota crescente, circa un quarto, diventa polisilicio, soprattutto per i pannelli solari. Ai chip arriva solo una piccola frazione, pochi punti percentuali.',
            'Per i chip, però, il 99% non basta neanche lontanamente. Il silicio metallurgico viene macinato e fatto reagire con cloruro di idrogeno: si ottiene il triclorosilano, un liquido che si purifica distillandolo più volte, come si fa con l\'alcol. Poi, nel processo Siemens, il triclorosilano entra insieme all\'idrogeno in un reattore a campana, dove sottili bacchette di silicio sono scaldate dalla corrente elettrica a circa 1.100 °C: il silicio si deposita sulle bacchette, che crescono fino a diventare grosse barre. È il [[Polisilicio|polisilicio]], puro fino a undici nove: 99,999999999%.',
            'Undici nove vogliono dire un solo atomo estraneo ogni cento miliardi di atomi di silicio, più di dieci volte il numero di persone che vivono sulla Terra. Ma il polisilicio è fatto di tanti piccoli cristalli orientati a caso, e per un chip serve un cristallo solo.'),
          ui.stats([
            { value: 28, unit: '%', label: 'della crosta terrestre', note: 'è silicio, in massa: più di lui c\'è solo l\'ossigeno' },
            { value: 2000, unit: '°C', label: 'nel forno ad arco', note: 'circa, per strappare l\'ossigeno al quarzo' },
            { value: 11, unit: 'nove', label: 'la purezza del polisilicio', note: '99,999999999%: un atomo estraneo ogni 100 miliardi' },
            { value: 1414, unit: '°C', label: 'la temperatura di fusione', note: 'del silicio, da superare per farne un cristallo' },
          ]),
          ui.callout({
            kind: 'fun',
            title: 'Silicio o silicone?',
            body: 'In inglese il silicio si chiama silicon, mentre il silicone, la gomma che si usa per sigillare, è silicone. La Silicon Valley, quindi, è la valle del silicio. I siliconi però sono parenti stretti dei chip: si fabbricano proprio a partire dal silicio metallurgico.',
          })),

        ui.section({ id: 'cristallo', title: 'Il cristallo perfetto', kicker: 'Berlino, 1916 · il metodo Czochralski', lead: 'Il polisilicio è purissimo ma disordinato. Per i chip serve un unico cristallo, con tutti gli atomi in fila dal primo all\'ultimo: il modo per farlo nacque da una distrazione.' },
          ui.prose(
            'Nel 1916 Jan Czochralski, un giovane chimico polacco, lavorava a Berlino nei laboratori della AEG, la grande azienda elettrica tedesca, e studiava come cristallizzano i metalli. Secondo un aneddoto molto diffuso, che però non compare in nessun documento dell\'epoca, un giorno, assorto negli appunti, intinse il pennino nel crogiolo di stagno fuso che aveva sul tavolo invece che nel calamaio. Tirandolo fuori, vide pendere dal pennino un filo sottile di metallo solidificato: era un unico cristallo. Il suo principale biografo, Paweł Tomaszewski, ha poi proposto anche un\'origine meno romanzesca della scoperta.',
            'In ogni caso Czochralski trasformò quel gesto in un metodo: toccare il metallo fuso con un pezzetto di cristallo e tirarlo su piano, così che il materiale solidifichi copiando l\'ordine dei suoi atomi. I suoi primi cristalli erano fili di stagno, piombo e zinco spessi circa un millimetro e lunghi fino a un metro e mezzo, e gli servivano per misurare quanto in fretta cristallizza un metallo. Descrisse il metodo in un articolo di tre pagine, arrivato alla rivista nell\'agosto 1916 e pubblicato nel 1918; per trent\'anni restò una tecnica da laboratorio.',
            'Tra il 1948 e il 1950, ai Bell Labs, Gordon Teal e John Little lo adattarono per tirare dal fuso grandi cristalli di germanio per i transistor. All\'inizio molti colleghi, compreso William Shockley, pensavano che non servissero cristalli perfetti; Teal insistette, e i transistor fatti con i suoi cristalli funzionavano molto meglio. Poco dopo, con Ernest Buehler, fece crescere anche cristalli di silicio. Oggi il [[Metodo Czochralski|metodo Czochralski]] dà quasi tutto il silicio dei chip.'),
          labPuller(),
          ui.prose('Un [[Lingotto|lingotto]] per wafer da 300 mm può essere lungo fino a circa due metri e pesare qualche centinaio di chili: uno lungo due metri arriva a circa 265 kg, appeso a un collo di pochi millimetri. È un unico cristallo, senza un solo errore nella disposizione degli atomi. Prima di tagliarlo lo si rettifica fino al diametro esatto e si incide lungo il fianco una piccola tacca, che servirà a orientare ogni fetta nelle macchine.'),
          ui.cols(
            ui.person({
              name: 'Jan Czochralski', years: '1885 – 1953', role: 'chimico',
              body: [
                'Nato a Kcynia, allora in territorio tedesco, studiò chimica a Berlino e lavorò per l\'industria tedesca, prima alla AEG e poi a Francoforte, dove inventò una lega per i cuscinetti dei treni. Nel 1928 tornò in Polonia, al Politecnico di Varsavia.',
                'Dopo la seconda guerra mondiale fu accusato di aver collaborato con gli occupanti tedeschi: un tribunale lo assolse nel 1945, ma il Politecnico lo allontanò comunque. Morì a Poznań nel 1953, quasi dimenticato. Documenti emersi più tardi mostrarono che aveva aiutato la resistenza polacca, e nel 2011 il Senato del Politecnico lo ha riabilitato.',
              ],
            }),
            ui.person({
              name: 'Gordon Teal', years: '1907 – 2003', role: 'chimico',
              body: [
                'Nato a Dallas, ai Bell Labs si convinse che i transistor avevano bisogno di cristalli perfetti e, con John Little, li fece crescere quando quasi nessuno ci credeva.',
                'Nel 1953 tornò a Dallas, alla Texas Instruments, dove nel 1954 il suo gruppo mise in vendita il primo transistor al silicio commerciale. Lo annunciò il 10 maggio a un convegno a Dayton, in Ohio: si racconta che, dopo relatori convinti che ci sarebbero voluti anni, ne tirò fuori qualcuno dalla tasca.',
              ],
            })),
          ui.callout({
            kind: 'fun',
            title: 'Il collo che cura i difetti',
            body: 'Ogni lingotto comincia con un collo sottilissimo, di pochi millimetri, tirato in fretta. Lo introdusse alla fine degli anni Cinquanta W. C. Dash, alla General Electric: crescendo così sottile, il cristallo fa uscire dai lati i difetti nati dallo shock del primo contatto con il fuso, e da lì in poi cresce perfetto.',
          })),

        ui.section({ id: 'wafer', title: 'Fette lucidate a specchio', kicker: 'Dal lingotto al wafer · la resa', lead: 'Il lingotto viene tagliato in centinaia di fette sottili, i wafer: su ognuna si costruiscono centinaia di chip alla volta. Ma non tutti riusciranno bene.' },
          ui.prose(
            'Il lingotto viene affettato da una sega a fili: un unico filo d\'acciaio, avvolto centinaia di volte su dei rulli, taglia centinaia di fette alla volta, aiutato da una poltiglia abrasiva o da granelli di diamante fissati sul filo. Un [[Wafer|wafer]] da 300 mm è spesso 775 micrometri, circa tre quarti di millimetro. Poi le fette vengono smerigliate, trattate con bagni chimici che asportano lo strato rovinato dal taglio e lucidate con una pasta che agisce insieme chimicamente e meccanicamente, fino ad avere una superficie a specchio, liscia fino a frazioni di nanometro.',
            'Il diametro dei wafer è cresciuto con gli anni: circa 25 mm all\'inizio degli anni Sessanta, 100 mm negli anni Settanta, 150 mm negli anni Ottanta, 200 mm nei primi anni Novanta e 300 mm, lo standard dei chip più avanzati, dal 2001. Un wafer più grande costa di più, ma in fabbrica quasi ogni passaggio tratta il wafer intero: più chip per wafer vuol dire chip più economici. Il salto successivo, a 450 mm, fu studiato per anni da un consorzio con Intel, TSMC, Samsung e altre aziende, e poi accantonato alla fine del 2016, soprattutto per il costo enorme delle nuove macchine.',
            'Su ogni wafer si costruiscono tanti chip identici, disposti a griglia. Quelli sul bordo restano incompleti, e qualche granello di polvere o imperfezione cade sempre da qualche parte: un chip colpito da un difetto di solito non funziona. La percentuale di chip buoni si chiama [[Resa produttiva|resa]] ed è il numero più sorvegliato di ogni fabbrica.'),
          labWafer(),
          ui.cols(
            ui.callout({
              kind: 'note',
              title: 'Perché i wafer sono rotondi?',
              body: 'Perché lo sono i lingotti: il cristallo cresce girando su sé stesso e viene fuori cilindrico. I chip invece sono rettangoli, e lungo il bordo del cerchio un po\' di silicio va sempre sprecato. Più il wafer è grande, più la parte sprecata conta poco.',
            }),
            ui.callout({
              kind: 'link',
              title: 'Chip grandi, chip piccoli',
              body: 'Un chip grande è un bersaglio grande per i difetti: per questo i chip più grandi costano così tanto, e molti progetti oggi vengono divisi in più pezzi piccoli, i [[Chiplet|chiplet]], montati poi nello stesso contenitore. Lo racconta il <a href="#moore">capitolo 9</a>.',
            }))),

        ui.section({ id: 'fotolitografia', title: 'Stampare con la luce', kicker: '1955 – oggi · dai Bell Labs alla Fairchild', lead: 'Come si disegnano miliardi di transistor su un pezzetto di silicio grande come un\'unghia? Con una tecnica nata dalla fotografia e dalla stampa: la fotolitografia.' },
          ui.prose(
            'La [[Fotolitografia|fotolitografia]] funziona un po\' come lo sviluppo delle fotografie di una volta. Sul wafer si stende una vernice sensibile alla luce, il [[Fotoresist|fotoresist]]; la si illumina attraverso una [[Maschera|maschera]] che porta il disegno da riprodurre; poi un bagno di sviluppo porta via la vernice dove la luce l\'ha colpita. Quello che resta protegge il wafer come uno stencil: dove il silicio è scoperto si può scavare, aggiungere materiale o cambiarne le proprietà.',
            'L\'idea arrivò dall\'industria dei circuiti stampati. Nel 1955, ai Bell Labs, Jules Andrus e Walter Bond provarono a usare i fotoresist per fabbricare i transistor. Negli stessi anni, ai Diamond Ordnance Fuze Laboratories dell\'esercito americano, Jay Lathrop e James Nall cercavano di rimpicciolire l\'elettronica delle spolette, e nel 1957 misero a punto un metodo fotografico per fabbricare transistor minuscoli. Lo chiamarono photolithography, fotolitografia, una parola presa in prestito dalle arti grafiche, dove indicava un procedimento di stampa già dall\'Ottocento. Poco dopo Lathrop passò alla Texas Instruments, portando con sé la nuova tecnica; alla Fairchild, intanto, la fotolitografia diventò il cuore del processo planare (<a href="#integrato">capitolo 6</a>).'),
          labLitho(),
          ui.prose(
            'Ogni ciclo di fotolitografia disegna uno strato. Tra un ciclo e l\'altro si depositano nuovi materiali, isolanti e metalli, a volte uno strato di atomi alla volta, e si lucida la superficie per renderla di nuovo piatta. L\'[[Incisione|incisione]] scava; il [[Drogaggio|drogaggio]] cambia il comportamento elettrico del silicio aggiungendo pochissimi atomi di altri elementi, oggi quasi sempre con l\'[[Impiantazione ionica|impiantazione ionica]].',
            'Un processore moderno si costruisce con molte decine di maschere, all\'incirca da 60 a 100 secondo le stime, e con più di mille passaggi di lavorazione: un wafer resta in fabbrica in genere circa tre mesi, e anche quattro o cinque per i processi più avanzati. Basta un errore in uno solo di quei passaggi per rovinare tutti i chip di un wafer.'),
          ui.cols(
            ui.callout({
              kind: 'link',
              title: 'Che cosa fa il drogaggio',
              body: 'Perché qualche atomo di fosforo o di boro cambia così tanto il silicio? Lo spiega la <a href="../elettronica-intermedia/index.html#semiconduttori">sezione sull\'elettronica intermedia</a>, nel capitolo sui semiconduttori.',
            }),
            ui.callout({
              kind: 'fun',
              title: 'Obiettivi da negozio',
              body: 'Per stampare tanti chip uguali su un wafer serve una maschera con lo stesso disegno ripetuto molte volte. Alla Fairchild, intorno al 1958, Robert Noyce e Jay Last costruirono una delle prime fotocamere «a ripetizione»: rimpiccioliva il disegno di un transistor e lo fotografava più volte, spostando la lastra di un passo preciso. Secondo i racconti dei protagonisti, per l\'ottica usarono obiettivi da cinepresa comprati in un negozio di fotografia.',
            }))),

        ui.section({ id: 'luce', title: 'Una luce sempre più corta', kicker: 'Da 436 a 13,5 nanometri', lead: 'Più i dettagli diventano piccoli, più la luce fa fatica a disegnarli. Per andare avanti l\'industria ha dovuto cambiare luce più volte, fino a una sorgente che sembra fantascienza.' },
          ui.prose(
            'La luce è un\'onda, e un\'onda non riesce a disegnare in modo nitido dettagli molto più piccoli della sua lunghezza: oltre un certo limite le righe si confondono in una macchia uniforme. È lo stesso motivo per cui un microscopio ottico non riesce a vedere un virus. La riga più fine che si può stampare dipende dalla lunghezza d\'onda della luce, dall\'apertura dell\'ottica, cioè da quanto è ampio il cono di luce che arriva sul wafer, e dai trucchi del processo.',
            'Fino agli anni Ottanta si usavano lampade a vapori di mercurio, filtrate per tenerne un solo colore: la riga g, a 436 nanometri, una luce blu-violetta, poi la riga i, a 365 nanometri, già nell\'ultravioletto. Dagli anni Novanta arrivarono i laser a eccimeri: a fluoruro di kripton, a 248 nanometri, e poi a fluoruro di argon, a 193. Per scendere ancora, negli anni Duemila si mise un velo d\'acqua tra l\'ultima lente e il wafer: l\'acqua piega la luce più dell\'aria, e con questa litografia a immersione si stampano righe di circa 40 nanometri.'),
          labLight(),
          ui.prose(
            'Il passo successivo richiese decenni. L\'ultravioletto estremo, o [[EUV]], ha una lunghezza d\'onda di 13,5 nanometri, circa quattordici volte più corta di quella a 193. Ma viene assorbito da tutto, perfino dall\'aria e dal vetro: la macchina deve lavorare sotto vuoto e al posto delle lenti usa specchi, fatti di decine di strati alternati di molibdeno e silicio e levigati con una precisione quasi incredibile. Dopo più di vent\'anni di ricerche, nel 2019 l\'EUV è entrato nella produzione di massa.'),
          figEuv(),
          ui.prose('Le macchine EUV le costruisce un\'unica azienda al mondo, l\'olandese ASML, nata nel 1984 da Philips e ASM International. Una di queste macchine pesa circa 150 tonnellate, viaggia smontata in decine di container e costa intorno ai 200 milioni di euro; la versione ad alta apertura, la High-NA, supera i 350 milioni. La prima è stata consegnata a Intel alla fine del 2023.'),
          ui.callout({
            kind: 'note',
            title: 'La luce che si consuma per strada',
            body: 'Nemmeno lo specchio migliore riflette tutta la luce EUV: ognuno ne perde circa un terzo. Dopo una decina di specchi, tra la sorgente e il wafer, arriva a destinazione solo una piccolissima parte della luce prodotta. Per questo la sorgente deve essere così potente.',
          })),

        ui.section({ id: 'camera-bianca', title: 'La stanza più pulita del mondo', kicker: 'Aria filtrata, tute e luce gialla', lead: 'Un granello di polvere invisibile è un macigno per un chip con righe di pochi nanometri. Per questo i chip si fabbricano in stanze migliaia di volte più pulite di una sala operatoria.' },
          ui.prose(
            'Una particella di polvere di mezzo micrometro, invisibile a occhio nudo, è larga come decine di righe di un chip moderno: se cade sul wafer nel momento sbagliato può interrompere un collegamento o crearne uno di troppo. Per questo i chip si costruiscono in [[Camera bianca|camere bianche]], dove l\'aria viene filtrata in continuazione.',
            'L\'aria entra dal soffitto attraverso filtri che trattengono quasi tutte le particelle, scende verso il pavimento forato in un flusso uniforme, viene aspirata e torna ai filtri, centinaia di volte in un\'ora. La pulizia si misura con le classi della norma ISO 14644-1: in una camera bianca di classe ISO 5 un metro cubo d\'aria può contenere al massimo 3.520 particelle di almeno mezzo micrometro, mentre nell\'aria di una città se ne contano decine di milioni.',
            'La prima fonte di sporco sono le persone, che perdono di continuo frammenti di pelle, capelli e fibre dei vestiti. Chi entra indossa una tuta che lascia scoperti solo gli occhi, guanti, sovrascarpe e mascherina. Nelle fabbriche più moderne, poi, i wafer viaggiano chiusi in contenitori sigillati, portati da robot su rotaie appese al soffitto, e si aprono solo dentro le macchine: l\'aria più pulita di tutte è lì dentro.'),
          labAir(),
          ui.callout({
            kind: 'fun',
            title: 'Perché la luce è gialla',
            body: 'Nelle zone dove si fa la fotolitografia la luce è gialla. Il fotoresist è sensibile all\'ultravioletto e alla luce blu: lampade filtrate, che non emettono sotto i 500 nanometri circa, permettono di lavorare senza rovinare i wafer.',
          })),

        ui.section({ id: 'dal-wafer-al-chip', title: 'Dal wafer al chip finito', kicker: 'Collaudo, taglio, contenitore · le fonderie', lead: 'Dopo mesi in camera bianca il wafer è pieno di chip. Prima di finire in un telefono, ognuno viene provato, ritagliato, chiuso in un contenitore e provato di nuovo.' },
          ui.prose(
            'Ancora sul wafer, ogni chip viene collaudato: una scheda con centinaia o migliaia di aghi sottilissimi tocca i suoi contatti, e un computer ne prova il funzionamento. Un tempo i chip difettosi venivano segnati con una goccia d\'inchiostro; oggi basta una mappa digitale. Poi il wafer viene incollato su un film adesivo e tagliato da una lama diamantata, o da un laser, lungo le corsie lasciate tra un chip e l\'altro.',
            'Ogni chip buono viene chiuso nel suo [[Package|contenitore]], che lo protegge e lo collega al mondo esterno. Per decenni i contatti del chip sono stati uniti ai piedini con fili d\'oro, oggi spesso di rame, più sottili di un capello, saldati da macchine velocissime. Nei chip più complessi il chip si capovolge e si salda direttamente sul supporto con migliaia di sferette di saldatura: è il flip-chip, che l\'IBM usava già negli anni Sessanta. Alla fine ogni chip viene provato di nuovo.'),
          figBack(),
          ui.prose(
            'Negli anni Settanta e Ottanta ogni grande azienda di chip aveva le sue fabbriche. Nel 1987, a Taiwan, Morris Chang fondò la TSMC con un\'idea nuova: una [[Fonderia|fonderia]] che non progetta chip propri, ma fabbrica quelli progettati dai clienti. Grazie alle fonderie sono nate le aziende «fabless», cioè senza fabbrica, che si occupano solo del progetto: oggi molti dei chip più famosi, da quelli dei telefoni a quelli per l\'intelligenza artificiale, sono progettati da un\'azienda e fabbricati da un\'altra.',
            'Una fabbrica all\'avanguardia costa oggi più di 20 miliardi di dollari, e i chip più avanzati li producono soltanto tre aziende: TSMC, Samsung e Intel. Tutte dipendono dalle macchine EUV di un unico fornitore. È una delle catene di produzione più concentrate e delicate dell\'economia mondiale.'),
          ui.cols(
            ui.person({
              name: 'Morris Chang', years: 'nato nel 1931', role: 'ingegnere e imprenditore',
              body: [
                'Nato a Ningbo, in Cina, si trasferì negli Stati Uniti nel 1949 e studiò al MIT e a Stanford. Lavorò per venticinque anni alla Texas Instruments, fino a dirigerne l\'intera attività nei semiconduttori.',
                'Nel 1985 si trasferì a Taiwan per guidare l\'istituto di ricerca industriale del governo, e nel 1987 fondò la TSMC, che ha guidato fino al 2018. Oggi la TSMC fabbrica la maggior parte dei chip più avanzati del mondo.',
              ],
            }),
            ui.callout({
              kind: 'link',
              title: 'Non solo chip',
              body: 'Con le stesse tecniche si costruiscono nel silicio anche minuscole strutture meccaniche, come gli accelerometri che nei telefoni capiscono se lo stai girando: sono i MEMS, raccontati nella <a href="../elettronica-avanzata/index.html#mems">sezione sull\'elettronica avanzata</a>.',
            })),
          ui.keyIdea('Un chip nasce da quarzo purificato fino a lasciare un solo atomo estraneo ogni cento miliardi, fatto crescere in un unico cristallo e tagliato a fette. Su ogni fetta la fotolitografia stampa con la luce, strato dopo strato, il disegno di miliardi di transistor, con centinaia di passaggi in stanze più pulite di una sala operatoria. È il processo di fabbricazione più complesso mai inventato, e oggi lo padroneggiano pochissime aziende al mondo.'),
          ui.crossLink({ href: '#struttura', kicker: 'Capitolo 8', title: 'Dentro il chip', text: 'Ora che sappiamo come si costruisce, entriamo dentro: dal contenitore che tieni in mano fino agli atomi, passando per i core, le celle e i transistor.' })));
    },
  });
})();
