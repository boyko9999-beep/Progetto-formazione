/*
 * Capitolo 1 · Il linguaggio delle frequenze (serie di Fourier e spettro).
 * Animazione: una catena di vettori rotanti (epicicli) somma armoniche dispari
 * fino a disegnare un'onda quadra; poi il picco di Gibbs e lo spettro.
 * Laboratorio: sintetizzatore di Fourier con spettro, errore, picco e ascolto.
 */
(function (root) {
  'use strict';

  const EA = root.EA;
  const TAU = Math.PI * 2;

  /* ---------- modello ---------- */

  // Prime `count` armoniche non nulle di un'onda di ampiezza 1, come serie di seni:
  // x(t) = Σ a·sin(n·ωt).
  function terms(shape, count) {
    const out = [];
    for (let n = 1; out.length < count; n++) {
      if (shape === 'quadra') {
        if (n % 2) out.push({ n, a: 4 / (Math.PI * n) });
      } else if (shape === 'triangolare') {
        if (n % 2) out.push({ n, a: (8 / (Math.PI * Math.PI * n * n)) * (((n - 1) / 2) % 2 ? -1 : 1) });
      } else {
        out.push({ n, a: (2 / (Math.PI * n)) * (n % 2 ? 1 : -1) });
      }
    }
    return out;
  }

  // Forma ideale, x in radianti (periodo 2π).
  function ideal(shape, x) {
    const u = (((x / TAU) % 1) + 1) % 1;
    if (shape === 'quadra') return u < 0.5 ? 1 : -1;
    if (shape === 'triangolare') return u < 0.25 ? 4 * u : u < 0.75 ? 2 - 4 * u : 4 * u - 4;
    return u < 0.5 ? 2 * u : 2 * u - 2;
  }

  function synth(list, x) {
    let y = 0;
    for (let i = 0; i < list.length; i++) y += list[i].a * Math.sin(list[i].n * x);
    return y;
  }

  // Potenza media (valore quadratico medio al quadrato) della forma ideale.
  const power = (shape) => (shape === 'quadra' ? 1 : 1 / 3);

  // Errore efficace della somma troncata, per il teorema di Parseval:
  // la potenza mancante è quella delle armoniche escluse.
  function rmsError(shape, count) {
    const kept = terms(shape, count).reduce((s, t) => s + (t.a * t.a) / 2, 0);
    return Math.sqrt(Math.max(0, power(shape) - kept));
  }

  // Valore massimo della somma troncata su un periodo.
  function peak(shape, count, samples) {
    const list = terms(shape, count);
    const N = samples || 20000;
    let m = -Infinity;
    for (let i = 0; i < N; i++) m = Math.max(m, synth(list, (TAU * i) / N));
    return m;
  }

  const model = { terms, ideal, synth, power, rmsError, peak };

  /* ---------- animazione principale: epicicli ---------- */

  const RING = ['#3ee08f', '#47dca3', '#52d7b8', '#5bd0cc', '#5cc8ff', '#74b7ff', '#8aa8ff', '#9d9cff', '#ad97ff', '#b49cff'];

  function mountHero(view, api) {
    const C = EA.colors;
    const cv = api.canvas(view, { label: 'Una catena di vettori rotanti, uno per armonica, la cui punta disegna un\'onda quadra che scorre verso destra.' });
    const STAGES = [
      { key: 'uno', dur: 6 },
      { key: 'tre', dur: 6 },
      { key: 'molte', dur: 9 },
      { key: 'gibbs', dur: 7 },
      { key: 'spettro', dur: 7 },
    ];
    const FREQ = 0.25; // giri al secondo della fondamentale
    let stage = 0;
    let stageT = 0;
    let trail = [];
    let grow = [];
    let peakCache = {};

    const maxTerms = () => (cv.w < 560 ? 6 : 10);

    function targetCount(playing) {
      const max = maxTerms();
      const key = STAGES[stage].key;
      if (key === 'uno') return 1;
      if (key === 'tre') return 2;
      if (key === 'molte') return playing ? Math.min(max, 2 + Math.floor((stageT / (STAGES[stage].dur * 0.8)) * (max - 1))) : max;
      return max;
    }

    function geometry() {
      const w = cv.w;
      const hh = cv.h;
      const narrow = w < 560;
      const list = terms('quadra', maxTerms());
      const sumA = list.reduce((s, t) => s + t.a, 0);
      const cy = narrow ? hh * 0.4 : hh * 0.44;
      const cx = narrow ? w * 0.27 : w * 0.22;
      const R = Math.max(10, Math.min((cx - 12) / sumA, (narrow ? hh * 0.2 : hh * 0.34) / 1.27));
      const x0 = Math.min(w * 0.62, cx + sumA * R + (narrow ? 10 : 26));
      const x1 = w - (narrow ? 12 : 24);
      const v = narrow ? 40 : 80;
      return { w, hh, narrow, cx, cy, R, x0, x1, v };
    }

    function currentTerms(g) {
      const list = terms('quadra', maxTerms());
      return list.map((t, k) => ({ n: t.n, a: t.a * (grow[k] || 0) }));
    }

    function tipAt(list, g, t) {
      let x = g.cx;
      let y = g.cy;
      for (const term of list) {
        const ang = term.n * TAU * FREQ * t;
        x += g.R * term.a * Math.cos(ang);
        y -= g.R * term.a * Math.sin(ang);
      }
      return [x, y];
    }

    function prefill(list, g, t) {
      trail = [];
      const span = (g.x1 - g.x0) / g.v;
      for (let tau = span; tau >= 0; tau -= 1 / 90) trail.push({ t: t - tau, y: tipAt(list, g, t - tau)[1] });
    }

    function draw(t, dt) {
      if (!cv.w) return;
      const playing = dt > 0;
      if (playing) {
        stageT += dt;
        if (stageT > STAGES[stage].dur) {
          stageT = 0;
          stage = (stage + 1) % STAGES.length;
          api.setStep(stage);
        }
      }
      const g = geometry();
      const max = maxTerms();
      const target = targetCount(playing);
      for (let k = 0; k < max; k++) {
        const goal = k < target ? 1 : 0;
        if (grow[k] == null) grow[k] = goal;
        grow[k] = playing ? grow[k] + (goal - grow[k]) * (1 - Math.exp(-dt * 5)) : goal;
      }
      grow.length = max;
      const list = currentTerms(g);
      const ctx = cv.ctx;

      EA.draw.clear(cv);
      EA.draw.grid(ctx, g.x0, g.cy - g.R * 1.6, g.x1 - g.x0, g.R * 3.2, { cols: g.narrow ? 4 : 8, rows: 4 });

      // livelli ideali ±1
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = EA.alpha(C.text, 0.35);
      ctx.beginPath();
      ctx.moveTo(g.x0, g.cy - g.R); ctx.lineTo(g.x1, g.cy - g.R);
      ctx.moveTo(g.x0, g.cy + g.R); ctx.lineTo(g.x1, g.cy + g.R);
      ctx.stroke();
      ctx.restore();

      // catena di vettori
      let x = g.cx;
      let y = g.cy;
      list.forEach((term, k) => {
        const r = g.R * Math.abs(term.a);
        if (r < 0.4) return;
        const ang = term.n * TAU * FREQ * t;
        const nx = x + g.R * term.a * Math.cos(ang);
        const ny = y - g.R * term.a * Math.sin(ang);
        const col = RING[k % RING.length];
        ctx.strokeStyle = EA.alpha(col, k === 0 ? 0.32 : 0.24);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
        EA.draw.line(ctx, [[x, y], [nx, ny]], col, k === 0 ? 2.2 : 1.6, k < 2);
        ctx.fillStyle = EA.alpha(col, 0.9);
        ctx.beginPath(); ctx.arc(nx, ny, k === 0 ? 2.6 : 1.8, 0, TAU); ctx.fill();
        x = nx; y = ny;
      });
      EA.draw.dot(ctx, g.cx, g.cy, 3, C.dim, false);

      // scia del segnale
      if (!playing || !trail.length) prefill(list, g, t);
      else {
        trail.push({ t, y });
        const oldest = t - (g.x1 - g.x0) / g.v - 0.05;
        while (trail.length && trail[0].t < oldest) trail.shift();
      }
      const pts = trail.map((p) => [g.x0 + (t - p.t) * g.v, p.y]).filter((p) => p[0] <= g.x1 + 1);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = EA.alpha(C.ink, 0.45);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(g.x0, y); ctx.stroke();
      ctx.restore();
      EA.draw.line(ctx, pts, C.green, 2.2);
      EA.draw.dot(ctx, x, y, 3.5, C.ink);
      EA.draw.dot(ctx, g.x0, y, 3, C.green);

      // etichette
      const count = Math.max(1, Math.round(grow.reduce((s, v) => s + v, 0)));
      const top = g.narrow ? 22 : 30;
      EA.draw.text(ctx, 'ARMONICHE ' + count, 18, top, { color: C.ink, size: g.narrow ? 11 : 12, weight: 700 });
      const names = list.slice(0, count).map((tm) => (tm.n === 1 ? 'f' : tm.n + 'f')).join(' + ');
      EA.draw.text(ctx, names.length > 46 ? names.slice(0, 44) + '…' : names, 18, top + 16, { color: C.dim, size: 11 });
      if (!g.narrow) EA.draw.text(ctx, 'tempo →', g.x1, g.cy - g.R * 1.6 - 8, { color: C.dim, size: 11, align: 'right' });

      // picco di Gibbs
      const key = STAGES[stage].key;
      if (key === 'gibbs') {
        const k = playing ? EA.smooth(stageT / 0.8) : 1;
        if (!peakCache[max]) peakCache[max] = peak('quadra', max, 4000);
        const pv = peakCache[max];
        const py = g.cy - g.R * pv;
        ctx.save();
        ctx.globalAlpha = k;
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = C.amber;
        ctx.beginPath(); ctx.moveTo(g.x0, py); ctx.lineTo(g.x1, py); ctx.stroke();
        ctx.restore();
        const over = ((pv - 1) / 2) * 100;
        ctx.save();
        ctx.globalAlpha = k;
        EA.draw.text(ctx, 'picco: +' + EA.fmt(over, 1) + ' % del salto', g.x1, py - 8, { color: C.amber, size: g.narrow ? 11 : 12, weight: 700, align: 'right' });
        ctx.restore();
      }

      // spettro
      const big = key === 'spettro' ? (playing ? EA.ease.out(stageT / 0.9) : 1) : 0;
      const bw = g.narrow ? g.w - 24 : EA.lerp(Math.min(260, (g.x1 - g.x0) * 0.42), (g.x1 - g.x0) * 0.62, big);
      const bh = g.narrow ? g.hh * 0.26 : Math.min(g.hh - (g.cy + g.R * 1.6) - 22, EA.lerp(g.hh * 0.2, g.hh * 0.26, big));
      const bx = g.narrow ? 12 : g.x1 - bw;
      const by = g.hh - bh - (g.narrow ? 10 : 14);
      ctx.save();
      ctx.fillStyle = EA.alpha('#060b0a', 0.88);
      ctx.strokeStyle = EA.alpha(big > 0.5 ? C.green : C.grid, 1);
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 10); else ctx.rect(bx, by, bw, bh);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      EA.draw.text(ctx, 'SPETTRO', bx + 12, by + 18, { color: big > 0.5 ? C.green : C.dim, size: 10.5, weight: 700 });
      const slots = 2 * max;
      const slotW = (bw - 24) / slots;
      const base = by + bh - 18;
      const full = bh - 44;
      for (let i = 0; i < slots; i++) {
        const n = i + 1;
        const bxi = bx + 12 + i * slotW + slotW * 0.2;
        const k2 = (n - 1) / 2;
        if (n % 2 === 0) continue;
        const a = (4 / (Math.PI * n)) * (grow[k2] || 0);
        const hgt = Math.max(1, (a / (4 / Math.PI)) * full);
        ctx.fillStyle = EA.alpha(RING[k2 % RING.length], 0.95);
        ctx.fillRect(bxi, base - hgt, Math.max(2, slotW * 0.6), hgt);
        if (n <= 5 || (big > 0.5 && n <= 9)) EA.draw.text(ctx, n === 1 ? 'f' : n + 'f', bxi + slotW * 0.3, base + 13, { color: C.text, size: 10, align: 'center' });
      }
    }

    api.loop(draw);
    api.setStep(0);
    return {
      focus(key, i) {
        stage = EA.clamp(i, 0, STAGES.length - 1);
        stageT = 0;
        trail = [];
        api.setStep(stage);
        api.invalidate();
      },
    };
  }

  /* ---------- laboratorio: sintetizzatore di Fourier ---------- */

  const SHAPE_NAMES = { quadra: 'Onda quadra', triangolare: 'Onda triangolare', dente: 'Dente di sega' };

  function mountLab(parts, api) {
    const C = EA.colors;
    const h = EA.h;
    const st = { shape: 'quadra', count: 5, f0: 220, ideal: true };
    let list = terms(st.shape, st.count);
    let pk = 0;
    let osc = null;
    let gain = null;

    const cv = api.canvas(parts.display, { class: 'ea-canvas fourier-lab-canvas', label: 'In alto la forma d\'onda ottenuta sommando le armoniche, sovrapposta a quella ideale; in basso lo spettro con l\'ampiezza di ogni armonica.' });

    const shape = EA.ui.segmented({
      label: 'Forma d\'onda',
      options: [{ value: 'quadra', label: 'Quadra' }, { value: 'triangolare', label: 'Triangolare' }, { value: 'dente', label: 'Dente di sega' }],
      value: st.shape,
      onchange: (v) => { st.shape = v; update(); },
    });
    const count = EA.ui.slider({
      label: 'Armoniche sommate', min: 1, max: 40, step: 1, value: st.count,
      format: (v) => v + (v === 1 ? ' armonica' : ' armoniche'),
      oninput: (v) => { st.count = v; update(); },
    });
    const f0 = EA.ui.slider({
      label: 'Fondamentale', min: 55, max: 880, log: true, value: st.f0, color: C.amber,
      format: (v) => EA.si(v, 'Hz'),
      oninput: (v) => { st.f0 = v; update(); },
    });
    const idealT = EA.ui.toggle({ label: 'Mostra la forma ideale', checked: true, onchange: (v) => { st.ideal = v; api.invalidate(); } });
    const listen = EA.ui.button({ label: 'Ascolta', icon: '♪', onclick: () => (osc ? stopSound() : startSound()) });
    listen.setAttribute('aria-pressed', 'false');
    parts.controls.append(shape.el, count.el, f0.el, idealT.el,
      h('div', { class: 'ea-ctl' }, listen, h('small', { class: 'ea-ctl-hint' }, 'Volume basso. Il suono cambia mentre muovi i cursori e si ferma quando lasci la pagina.')));

    const roN = EA.ui.readout({ label: 'Armonica più alta' });
    const roB = EA.ui.readout({ label: 'Banda occupata' });
    const roE = EA.ui.readout({ label: 'Errore efficace' });
    const roP = EA.ui.readout({ label: 'Oltre il salto' });
    parts.readouts.append(roN.el, roB.el, roE.el, roP.el);

    function wave(ctx) {
      const top = list[list.length - 1].n + 1;
      const real = new Float32Array(top);
      const imag = new Float32Array(top);
      list.forEach((tm) => { imag[tm.n] = tm.a; });
      return ctx.createPeriodicWave(real, imag);
    }
    function startSound() {
      const ctx = EA.audio();
      if (!ctx) return;
      osc = ctx.createOscillator();
      gain = ctx.createGain();
      gain.gain.value = 0;
      osc.setPeriodicWave(wave(ctx));
      osc.frequency.value = st.f0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.setTargetAtTime(0.07, ctx.currentTime, 0.05);
      listen.setAttribute('aria-pressed', 'true');
      listen.lastChild.textContent = 'Ferma il suono';
    }
    function stopSound() {
      if (!osc) return;
      const ctx = EA.audio();
      const o = osc;
      const g = gain;
      osc = null;
      gain = null;
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      setTimeout(() => { try { o.stop(); o.disconnect(); g.disconnect(); } catch (e) { /* già fermo */ } }, 200);
      listen.setAttribute('aria-pressed', 'false');
      listen.lastChild.textContent = 'Ascolta';
    }

    function update() {
      list = terms(st.shape, st.count);
      pk = peak(st.shape, st.count, 6000);
      const top = list[list.length - 1].n;
      const err = rmsError(st.shape, st.count) / Math.sqrt(power(st.shape));
      roN.set(top + 'ª · ' + top + 'f');
      roB.set(EA.si(top * st.f0, 'Hz'));
      roE.set(EA.fmt(err * 100, err < 0.1 ? 1 : 0) + ' %', err < 0.05 ? 'good' : err < 0.15 ? null : 'warn');
      if (st.shape === 'triangolare') roP.set('nessun salto', null);
      else roP.set('+' + EA.fmt(((pk - 1) / 2) * 100, 1) + ' %', 'warn');
      if (osc) {
        const ctx = EA.audio();
        osc.setPeriodicWave(wave(ctx));
        osc.frequency.setTargetAtTime(st.f0, ctx.currentTime, 0.02);
      }
      api.invalidate();
      api.announce(SHAPE_NAMES[st.shape] + ' con ' + st.count + (st.count === 1 ? ' armonica' : ' armoniche') + ': errore ' + EA.fmt(err * 100, 0) + ' per cento.');
    }

    function draw(t) {
      if (!cv.w) return;
      const ctx = cv.ctx;
      const w = cv.w;
      const hh = cv.h;
      const narrow = w < 520;
      EA.draw.clear(cv);
      const px = narrow ? 12 : 18;
      const pw = w - px * 2;
      const tTop = 18;
      const tH = hh * 0.56;
      const mid = tTop + tH / 2;
      const amp = tH * 0.36;
      EA.draw.grid(ctx, px, tTop, pw, tH, { cols: narrow ? 6 : 10, rows: 6 });
      const drift = t * 0.35;
      const X = (xx) => ((xx - px) / pw) * 2 * TAU + drift;
      if (st.ideal) {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = EA.alpha(C.text, 0.55);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        let prev = null;
        for (let xx = px; xx <= px + pw; xx += 1) {
          const yy = mid - amp * ideal(st.shape, X(xx));
          if (prev == null || Math.abs(yy - prev) > amp) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
          prev = yy;
        }
        ctx.stroke();
        ctx.restore();
      }
      EA.draw.fn(ctx, px, px + pw, (xx) => mid - amp * synth(list, X(xx)), C.green, 2, 1);
      if (st.shape !== 'triangolare') {
        const py = mid - amp * pk;
        ctx.save();
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = EA.alpha(C.amber, 0.8);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + pw, py); ctx.stroke();
        ctx.restore();
        EA.draw.text(ctx, 'picco ' + EA.fmt(pk, 3), px + pw - 6, py - 6, { color: C.amber, size: 11, align: 'right' });
      }
      [['+1', mid - amp], ['−1', mid + amp]].forEach(([lab, yy]) => {
        ctx.fillStyle = EA.alpha(C.bg, 0.85);
        ctx.fillRect(px + 2, yy - 8, 22, 16);
        EA.draw.text(ctx, lab, px + 13, yy + 4, { color: C.text, size: 10, align: 'center' });
      });
      EA.draw.text(ctx, 'due periodi', px + pw - 6, tTop + tH - 8, { color: C.dim, size: 10, align: 'right' });

      // spettro
      const sTop = tTop + tH + 34;
      const sH = hh - sTop - 30;
      const nShow = Math.min(81, Math.max(16, list[list.length - 1].n + 6));
      const slot = pw / nShow;
      const amax = Math.abs(list[0].a);
      EA.draw.text(ctx, 'SPETTRO', px, sTop - 12, { color: C.text, size: 10.5, weight: 700 });
      ctx.strokeStyle = C.grid;
      ctx.beginPath(); ctx.moveTo(px, sTop + sH + 0.5); ctx.lineTo(px + pw, sTop + sH + 0.5); ctx.stroke();
      const all = terms(st.shape, Math.ceil(nShow));
      const kept = new Set(list.map((tm) => tm.n));
      all.forEach((tm) => {
        if (tm.n > nShow) return;
        const bx = px + (tm.n - 1) * slot + slot * 0.18;
        const bwid = Math.max(1.5, slot * 0.64);
        const hgt = Math.max(1.5, (Math.abs(tm.a) / amax) * sH);
        if (kept.has(tm.n)) {
          ctx.fillStyle = EA.alpha(C.green, 0.25);
          ctx.fillRect(bx - 2, sTop + sH - hgt - 2, bwid + 4, hgt + 2);
          ctx.fillStyle = C.green;
          ctx.fillRect(bx, sTop + sH - hgt, bwid, hgt);
        } else {
          ctx.strokeStyle = EA.alpha(C.text, 0.4);
          ctx.strokeRect(bx + 0.5, sTop + sH - hgt + 0.5, bwid - 1, hgt - 1);
        }
      });
      const step = nShow > 40 ? 10 : 5;
      for (let n = 1; n <= nShow; n += n === 1 ? step - 1 : step) {
        const xx = px + (n - 0.5) * slot;
        EA.draw.text(ctx, EA.si(n * st.f0, 'Hz', 2), xx, sTop + sH + 15, { color: C.dim, size: 10, align: 'center' });
      }
    }

    api.loop(draw);
    update();
    return { destroy: stopSound };
  }

  /* ---------- contenuti ---------- */

  EA.register({
    id: 'fourier',
    intro: [
      'Nel 1807 il matematico francese Joseph Fourier, che studiava come il calore si propaga in una sbarra di metallo, arrivò a un\'idea che allora sembrò quasi uno scandalo: <strong>quasi ogni segnale periodico si può scrivere come somma di sinusoidi</strong>, ciascuna con la sua frequenza, la sua ampiezza e la sua fase.',
      'Le sinusoidi sono i mattoni. C\'è quella alla frequenza di ripetizione del segnale, la <em>fondamentale</em>, e ci sono quelle a frequenze multiple, le <em>armoniche</em>. Un\'onda quadra, per esempio, è la fondamentale più la terza armonica con un terzo dell\'ampiezza, più la quinta con un quinto, e così via all\'infinito.',
      'Guardare un segnale come elenco di frequenze, cioè come <strong>spettro</strong>, è il gesto da cui parte tutta l\'elettronica avanzata. Dice quanta banda serve per trasmettere un segnale, quali disturbi si possono filtrare, e come la radio fa viaggiare migliaia di trasmissioni nello stesso spazio senza mescolarle.',
    ],
    steps: [
      { title: 'Una sinusoide è un punto che gira', text: 'Un vettore che ruota a velocità costante proietta un\'ombra che sale e scende: è una sinusoide. La velocità di rotazione è la frequenza, la lunghezza del vettore è l\'ampiezza.', focus: 'uno' },
      { title: 'Si sommano i giri', text: 'In punta al primo vettore se ne attacca un secondo che gira tre volte più veloce ed è lungo un terzo. La punta della catena comincia a disegnare degli spigoli.', focus: 'tre' },
      { title: 'Più armoniche, più spigoli', text: 'Aggiungendo la quinta, la settima, la nona armonica, ognuna più corta della precedente (ampiezza 1/n), la somma assomiglia sempre di più a un\'onda quadra.', focus: 'molte' },
      { title: 'Il picco che non se ne va', text: 'Vicino ai salti resta un picco: aggiungendo armoniche si stringe, ma la sua altezza si ferma a circa il 9% del salto e non sparisce mai. È il fenomeno di Gibbs.', focus: 'gibbs' },
      { title: 'Lo spettro', text: 'Mettendo in fila le armoniche con la loro ampiezza si ottiene lo spettro: righe a f, 3f, 5f… È così che analizzatori, equalizzatori e ricevitori radio vedono i segnali.', focus: 'spettro' },
    ],
    formulas: [
      { label: 'Serie di Fourier', eq: '<var>x</var>(<var>t</var>) = <var>A</var><sub>0</sub> + Σ <var>A<sub>n</sub></var> sin(2π<var>n f</var><sub>0</sub><var>t</var> + <var>φ<sub>n</sub></var>)', text: 'Un segnale periodico di frequenza <var>f</var><sub>0</sub> è un valore medio più sinusoidi a frequenze multiple intere della fondamentale.' },
      { label: 'Onda quadra', eq: '<var>x</var>(<var>t</var>) = <sup>4</sup>⁄<sub>π</sub> (sin ω<var>t</var> + ⅓ sin 3ω<var>t</var> + ⅕ sin 5ω<var>t</var> + …)', text: 'Solo armoniche dispari, con ampiezza che cala come 1/<var>n</var>: per questo gli spigoli richiedono tanta banda.' },
      { label: 'Fenomeno di Gibbs', eq: 'picco ≈ 1,179 · <var>A</var>', text: 'Troncando la serie, vicino a un salto la somma supera il livello ideale: di più con poche armoniche, di circa il 9% del salto con molte. Il valore 1,179 è il limite a cui tende il picco, che non sparisce mai.' },
      { label: 'Banda e fronti', eq: '<var>t</var><sub>r</sub> ≈ 0,35 ⁄ <var>B</var>', text: 'Regola pratica: un fronte di salita (dal 10 al 90%) che dura <var>t</var><sub>r</sub> richiede una banda <var>B</var> di circa 0,35/<var>t</var><sub>r</sub>. Fronti più ripidi vogliono armoniche più alte.' },
    ],
    timeline: [
      { year: 1807, title: 'La memoria sul calore', who: 'Joseph Fourier, Parigi', text: 'Fourier presenta all\'Institut de France una memoria sulla propagazione del calore in cui sviluppa le funzioni in serie di seni e coseni. Lagrange ne contesta il rigore e la pubblicazione tarda anni.' },
      { year: 1822, title: 'Théorie analytique de la chaleur', who: 'Joseph Fourier', text: 'Il trattato che rende la serie di Fourier uno strumento universale della fisica matematica.' },
      { year: 1843, title: 'La legge acustica di Ohm', who: 'Georg Simon Ohm', text: 'Lo stesso Ohm della legge sui circuiti sostiene che l\'orecchio scompone i suoni complessi nelle sinusoidi che li formano.' },
      { year: 1863, title: 'I risonatori di Helmholtz', who: 'Hermann von Helmholtz', text: 'Nel libro sulle sensazioni del suono usa sfere di ottone accordate, i risonatori, per isolare una a una le armoniche di un suono: un analizzatore di spettro meccanico.' },
      { year: 1872, title: 'La macchina che prevede le maree', who: 'William Thomson, poi Lord Kelvin', text: 'Una macchina a pulegge e funi somma dieci componenti sinusoidali delle maree e ne traccia la previsione: un sintetizzatore di Fourier fatto di ingranaggi.' },
      { year: 1898, title: 'Il picco misterioso', who: 'Albert Michelson, Samuel Stratton, Josiah Willard Gibbs', text: 'L\'analizzatore armonico a 80 termini di Michelson e Stratton mostra un picco ostinato vicino ai salti. Gibbs lo spiega su Nature tra il 1898 e il 1899; Henry Wilbraham lo aveva già descritto nel 1848.' },
      { year: 1965, title: 'La trasformata veloce', who: 'James Cooley e John Tukey', text: 'L\'algoritmo FFT calcola lo spettro di <var>N</var> campioni con circa <var>N</var> log <var>N</var> operazioni invece di <var>N</var><sup>2</sup>: l\'analisi in frequenza diventa possibile in tempo reale. Gauss aveva un metodo simile già nel 1805, rimasto inedito.' },
      { year: 1992, title: 'JPEG', who: 'Joint Photographic Experts Group', text: 'Lo standard per le fotografie usa la trasformata coseno discreta, parente stretta di quella di Fourier: ogni immagine viene salvata come somma di "onde" di luminosità.' },
    ],
    fun: 'L\'orecchio fa l\'analisi di Fourier gratis. Nella coclea la membrana basilare vibra in punti diversi a seconda della frequenza: gli acuti vicino all\'ingresso, i gravi in fondo alla spirale. È uno spettrometro biologico.',
    uses: ['Analizzatori di spettro e oscilloscopi con FFT', 'Equalizzatori e cancellazione del rumore', 'Compressione MP3, AAC e JPEG', 'Wi-Fi, 4G e 5G (OFDM)', 'Risonanza magnetica', 'Riconoscimento vocale'],
    glossary: [
      { term: 'Fondamentale', def: 'La sinusoide alla frequenza con cui il segnale si ripete.' },
      { term: 'Armonica', def: 'Sinusoide a frequenza multipla intera della fondamentale: 2<var>f</var>, 3<var>f</var>, 4<var>f</var>…' },
      { term: 'Spettro', def: 'Grafico delle frequenze presenti in un segnale, ciascuna con la sua ampiezza.' },
      { term: 'Banda', def: 'Intervallo di frequenze che un segnale occupa o che un sistema lascia passare.' },
      { term: 'FFT', def: 'Fast Fourier Transform: l\'algoritmo veloce che calcola lo spettro di un segnale campionato.' },
    ],
    sources: [
      { title: 'Serie di Fourier (Wikipedia)', url: 'https://it.wikipedia.org/wiki/Serie_di_Fourier' },
      { title: 'Joseph Fourier, biografia (MacTutor)', url: 'https://mathshistory.st-andrews.ac.uk/Biographies/Fourier/' },
      { title: 'Gibbs phenomenon (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Gibbs_phenomenon' },
      { title: 'Tide-predicting machine (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Tide-predicting_machine' },
      { title: 'Cooley e Tukey, 1965: An algorithm for the machine calculation of complex Fourier series', url: 'https://doi.org/10.1090/S0025-5718-1965-0178586-1' },
    ],
    hero: {
      caption: 'Ogni cerchio è un\'armonica dispari, lunga 1/n della prima. La punta della catena disegna il segnale che scorre a destra.',
      label: 'Animazione: epicicli di Fourier che costruiscono un\'onda quadra',
      aspect: '16 / 7',
      aspectMobile: '1 / 1',
      mount: mountHero,
    },
    lab: {
      title: 'Sintetizzatore di Fourier',
      intro: 'Scegli una forma d\'onda e somma le armoniche una alla volta. Guarda gli spigoli comparire, lo spettro riempirsi e il picco di Gibbs che, con molte armoniche, resta attorno al 9% del salto. Premi Ascolta per sentire il timbro cambiare.',
      mount: mountLab,
    },
    model,
  });
})(typeof window !== 'undefined' ? window : globalThis);
