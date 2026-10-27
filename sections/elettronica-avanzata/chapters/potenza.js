/*
 * Capitolo 7 · Energia che commuta (elettronica di potenza).
 * Animazione: un regolatore lineare che scalda, poi un convertitore buck da 12 a 5 V
 * con la corrente come particelle luminose, il campo della bobina e tre tracce
 * sincronizzate; infine il duty cycle e il prezzo di ogni commutazione (Si contro GaN).
 * Laboratorio: banco del buck con forme d'onda, bilancio di potenza e rendimento.
 */
(function (root) {
  'use strict';

  const EA = root.EA;
  const TINT = '#ff6b6b';

  /* ---------- modello ---------- */

  // Interruttori, valori indicativi per un buck da pochi ampere: tempo di commutazione
  // totale (tr + tf), resistenza in conduzione, carica e tensione di pilotaggio del gate.
  // Il SiC è un componente da 650 V e oltre: a bassa tensione è più resistivo
  // e più costoso da pilotare di un MOSFET al silicio da 30 V.
  const TECH = {
    si: { label: 'Si', name: 'MOSFET al silicio', ttr: 20e-9, rds: 0.010, qg: 10e-9, vg: 5 },
    sic: { label: 'SiC', name: 'MOSFET al carburo di silicio', ttr: 25e-9, rds: 0.025, qg: 40e-9, vg: 15 },
    gan: { label: 'GaN', name: 'transistor al nitruro di gallio', ttr: 3e-9, rds: 0.010, qg: 2.5e-9, vg: 5 },
  };
  const VF = 0.45;     // caduta del diodo Schottky di ricircolo (V)
  const C_OUT = 22e-6; // condensatore d'uscita ceramico (F)
  const IQ = 2e-3;     // corrente assorbita dal controllore (A)

  // Regolatore lineare: la corrente che entra è quella che esce, la differenza di tensione scalda.
  function linear(vin, vout, io) {
    return { eta: vout / vin, pin: vin * io, pout: vout * io, ploss: (vin - vout) * io };
  }

  // Buck ideale in conduzione continua: ripple picco-picco della corrente nella bobina.
  const rippleI = (vin, vout, l, fsw) => ((vin - vout) * (vout / vin)) / (l * fsw);
  // Ripple della tensione d'uscita dovuto al condensatore (ESR esclusa).
  const rippleV = (dil, fsw, c) => dil / (8 * fsw * c);
  // Induttanza che dà il ripple dil alla frequenza fsw.
  const inductanceFor = (vin, vout, dil, fsw) => ((vin - vout) * (vout / vin)) / (dil * fsw);
  // Potenza persa nelle commutazioni: ½·V·I·(tr + tf)·fsw.
  const switchingLoss = (vin, i, ttr, fsw) => 0.5 * vin * i * ttr * fsw;
  // Gli altri due convertitori di base, ideali.
  const boost = (vin, d) => vin / (1 - d);
  const buckBoost = (vin, d) => (-vin * d) / (1 - d);

  // Media di i² su una rampa lineare da a a b.
  const ms = (a, b) => (a * a + a * b + b * b) / 3;

  // Punto di lavoro del buck. p = { vin, d, fsw, l, io, c, tech, sync }.
  // Con il diodo la corrente nella bobina non può invertirsi: se il carico chiede meno di
  // metà del ripple, la corrente si annulla a ogni ciclo (DCM) e Vout sale sopra D·Vin.
  // Con il MOSFET sincrono a PWM forzato la corrente può diventare negativa: si resta in CCM.
  function buck(p) {
    const vin = p.vin;
    const d = EA.clamp(p.d, 0.001, 0.999);
    const fsw = p.fsw;
    const l = p.l;
    const io = Math.max(0, p.io);
    const c = p.c || C_OUT;
    const tech = TECH[p.tech] ? p.tech : 'si';
    const sw = TECH[tech];
    const sync = !!p.sync;
    let vout = d * vin;
    let dil = ((vin - vout) * d) / (l * fsw);
    let imin = io - dil / 2;
    let imax = io + dil / 2;
    let d2 = 1 - d;
    let mode = 'ccm';
    if (!sync && imin < 0) {
      mode = 'dcm';
      vout = vin / (1 + (2 * l * fsw * io) / (d * d * vin));
      dil = ((vin - vout) * d) / (l * fsw);
      d2 = vout > 0 ? Math.min(1 - d, (d * (vin - vout)) / vout) : 0;
      imin = 0;
      imax = dil;
    }
    // Perdite: conduzione dell'interruttore, ramo di ricircolo, sovrapposizione V·I nei fronti,
    // carica dei gate a ogni ciclo più il consumo del controllore.
    const pHigh = d * ms(imin, imax) * sw.rds;
    const pLow = sync ? d2 * ms(imax, imin) * sw.rds : (VF * d2 * (imin + imax)) / 2;
    const pSw = 0.5 * vin * (Math.max(0, imin) + Math.max(0, imax)) * (sw.ttr / 2) * fsw;
    const pDrv = sw.qg * sw.vg * fsw * (sync ? 2 : 1) + IQ * vin;
    const ploss = pHigh + pLow + pSw + pDrv;
    const pout = vout * io;
    const pin = pout + ploss;
    // Ondulazione d'uscita: carica che entra nel condensatore finché iL supera il carico.
    const q = mode === 'ccm' ? dil / (8 * fsw)
      : imax > 0 ? ((d + d2) * Math.pow(Math.max(0, imax - io), 2)) / (2 * imax * fsw) : 0;
    return {
      vin, d, fsw, l, c, io, tech, sync, mode, vout, dil, imin, imax, d2,
      dv: q / c, pHigh, pLow, pSw, pDrv, ploss, pout, pin,
      eta: pin > 0 ? pout / pin : 0,
      iin: pin / vin,
      lin: linear(vin, vout, io),
    };
  }

  // Corrente nella bobina all'istante u del periodo (u in periodi).
  function il(op, u) {
    const x = u - Math.floor(u);
    if (x < op.d) return op.imin + ((op.imax - op.imin) * x) / op.d;
    if (op.d2 > 0 && x < op.d + op.d2) return op.imax - ((op.imax - op.imin) * (x - op.d)) / op.d2;
    return op.mode === 'ccm' ? op.imin : 0;
  }

  // Tensione al nodo di commutazione: Vin, poi la caduta del ramo basso,
  // poi Vout quando in DCM la corrente si è annullata e sono aperti entrambi.
  function vsw(op, u) {
    const x = u - Math.floor(u);
    if (x < op.d) return op.vin;
    if (op.mode === 'ccm' || x < op.d + op.d2) return op.sync ? -il(op, x) * TECH[op.tech].rds : -VF;
    return op.vout;
  }

  // Ondulazione della tensione d'uscita su un periodo: n campioni a media nulla.
  function outputRipple(op, n) {
    const N = n || 200;
    const out = [];
    let v = 0;
    let mean = 0;
    for (let i = 0; i < N; i++) {
      out.push(v);
      mean += v / N;
      v += (il(op, (i + 0.5) / N) - op.io) / (op.fsw * N * op.c);
    }
    return out.map((x) => x - mean);
  }

  // Rendimento a un'altra frequenza, con la bobina scalata per avere lo stesso ripple (L·f costante).
  function efficiencyAt(p, f, tech) {
    return buck(Object.assign({}, p, { fsw: f, l: (p.l * p.fsw) / f, tech: tech || p.tech })).eta;
  }

  const model = { TECH, VF, C_OUT, IQ, linear, rippleI, rippleV, inductanceFor, switchingLoss, boost, buckBoost, buck, il, vsw, outputRipple, efficiencyAt };

  /* ---------- disegno comune ---------- */

  const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const TECH_COLOR = { si: '#7aa2ff', sic: '#b49cff', gan: '#9be15d' };

  // Numeri con cifre fisse all'italiana; correnti e potenze in unità leggibili.
  const fx = (x, n) => x.toFixed(n).replace('.', ',').replace('-', '−');
  const unit = (u) => (x) => (Math.abs(x) >= 0.1 ? fx(x, Math.abs(x) >= 10 ? 1 : 2) + ' ' + u : EA.si(x, u, 2));
  const amp = unit('A');
  const watt = unit('W');

  function niceUp(x) {
    const e = Math.pow(10, Math.floor(Math.log10(x)));
    const m = x / e;
    return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => m <= s * 1.0001) || 10) * e;
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  // Riquadro da strumento con titolo a sinistra e nota a destra.
  function panel(ctx, r, title, color, right) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 11, 10, 0.86)';
    ctx.strokeStyle = EA.colors.grid;
    ctx.lineWidth = 1;
    rr(ctx, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (title) EA.draw.text(ctx, title, r.x + 12, r.y + 19, { color: color || EA.colors.text, size: 10.5, weight: 700 });
    if (right) EA.draw.text(ctx, right, r.x + r.w - 12, r.y + 19, { color: EA.colors.dim, size: 10.5, align: 'right' });
  }

  // Barra orizzontale a segmenti [valore, colore] su una traccia lunga quanto `total`.
  function hbar(ctx, x, y, w, hgt, segs, total) {
    ctx.save();
    rr(ctx, x, y, w, hgt, 4);
    ctx.fillStyle = '#16211e';
    ctx.fill();
    ctx.clip();
    let xx = x;
    segs.forEach((sg) => {
      const sw = Math.max(0, (sg[0] / total) * w);
      ctx.fillStyle = sg[1];
      ctx.fillRect(xx, y, sw, hgt);
      xx += sw;
    });
    ctx.restore();
    return xx;
  }

  // Testo con un fondo scuro, per staccarlo da fili e tracce.
  function tag(ctx, str, x, y, o) {
    ctx.save();
    ctx.font = (o.weight || 600) + ' ' + o.size + 'px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    const tw = ctx.measureText(str).width;
    const x0 = o.align === 'right' ? x - tw : o.align === 'center' ? x - tw / 2 : x;
    ctx.fillStyle = 'rgba(11, 18, 16, 0.88)';
    ctx.fillRect(x0 - 3, y - o.size + 1, tw + 6, o.size + 3);
    ctx.restore();
    EA.draw.text(ctx, str, x, y, o);
  }

  // Divide un testo in righe che stanno in maxW.
  function wrap(ctx, str, maxW, size) {
    ctx.save();
    ctx.font = '500 ' + size + 'px ' + SANS;
    const lines = [];
    let line = '';
    str.split(' ').forEach((word) => {
      const next = line ? line + ' ' + word : word;
      if (line && ctx.measureText(next).width > maxW) { lines.push(line); line = word; } else line = next;
    });
    if (line) lines.push(line);
    ctx.restore();
    return lines;
  }

  // Particella luminosa disegnata una volta: copiarla cento volte per fotogramma costa poco.
  function sprite(color) {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, '#fff4f2');
    grad.addColorStop(0.22, color);
    grad.addColorStop(0.45, EA.alpha(color, 0.35));
    grad.addColorStop(1, EA.alpha(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    return c;
  }

  // Polilinea con le lunghezze dei tratti, per far scorrere le particelle.
  function path(pts) {
    const seg = [];
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      seg.push(l);
      len += l;
    }
    return { pts, seg, len };
  }

  // Chiama fn(x, y) ogni `gap` pixel lungo il percorso, partendo da `start`.
  function along(p, start, gap, fn) {
    let i = 0;
    let acc = 0;
    for (let s = start; s < p.len; s += gap) {
      while (i < p.seg.length - 1 && acc + p.seg[i] < s) { acc += p.seg[i]; i++; }
      const f = p.seg[i] ? (s - acc) / p.seg[i] : 0;
      const a = p.pts[i];
      const b = p.pts[i + 1];
      fn(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
    }
  }

  function stroke(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  /* ---------- schema del buck (animazione e laboratorio) ---------- */

  function circuitGeo(r, narrow) {
    const X = (f) => r.x + r.w * f;
    const yT = r.y + r.h * (narrow ? 0.3 : 0.32);
    const yB = r.y + r.h * 0.88;
    return {
      r, narrow, yT, yB, yM: (yT + yB) / 2,
      k: EA.clamp(Math.min(r.w / 520, r.h / 280), 0.62, 1.15),
      xBat: X(0.07), xS0: X(0.16), xS1: X(0.28), xN: X(0.37), xC: X(0.555), span: r.w * 0.18, xO: X(0.75), xLd: X(0.91),
    };
  }

  // s: mix (0 lineare, 1 buck), on, open (0..1), il, io, sync, energy (0..1), coil (scala),
  //    heat (0..1), t, vscale (px/s per ampere), labels.
  function drawCircuit(ctx, g, s, offs, dt, spr) {
    const C = EA.colors;
    const k = g.k;
    const { yT, yB, yM } = g;
    const mix = s.mix;
    const lin = 1 - mix;
    const lowOn = s.sync ? !s.on : !s.on && s.il > 1e-4;
    const batTop = yM - 15 * k;
    const batBot = yM + 15 * k;
    const loadH = 60 * k;
    // bobina: spire a semicerchio sopra il filo, scalate con l'induttanza
    const n = g.narrow ? 3 : 4;
    const span = g.span * s.coil;
    const c0 = g.xC - span / 2;
    const c1 = g.xC + span / 2;
    const rc = span / (2 * n);
    const coilPts = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= 12; j++) {
        const a = Math.PI - (Math.PI * j) / 12;
        coilPts.push([c0 + rc * (2 * i + 1) + rc * Math.cos(a), yT - rc * Math.sin(a) * 1.2]);
      }
    }
    const B = {
      hs: path([[g.xBat, batTop], [g.xBat, yT], [g.xN, yT]]),
      lo: path([[g.xN, yB], [g.xN, yT]]),
      ind: path([[g.xN, yT], [c0, yT]].concat(coilPts, [[c1, yT], [g.xO, yT]])),
      cap: path([[g.xO, yT], [g.xO, yB]]),
      load: path([[g.xO, yT], [g.xLd, yT], [g.xLd, yB]]),
      r3: path([[g.xLd, yB], [g.xO, yB]]),
      r2: path([[g.xO, yB], [g.xN, yB]]),
      r1: path([[g.xN, yB], [g.xBat, yB], [g.xBat, batBot]]),
    };
    // correnti nei rami: nel lineare passa ovunque la corrente del carico
    const L = EA.lerp;
    const iL = s.il;
    const ion = s.on ? iL : 0;
    const cur = {
      hs: L(s.io, ion, mix), lo: s.on ? 0 : iL, ind: L(s.io, iL, mix), cap: L(0, iL - s.io, mix),
      load: s.io, r3: s.io, r2: L(s.io, iL, mix), r1: L(s.io, ion, mix),
    };
    const reg = { x: g.xS0 - 6 * k, w: g.xC + g.span / 2 - g.xS0 + 12 * k, h: Math.max(36, 50 * k) };
    reg.y = yT - reg.h / 2;

    // calore del regolatore lineare
    if (lin > 0.01) {
      const cx = reg.x + reg.w / 2;
      const gr = ctx.createRadialGradient(cx, yT, 4, cx, yT, reg.w * 0.8);
      gr.addColorStop(0, EA.alpha(C.orange, 0.4 * lin * s.heat));
      gr.addColorStop(1, EA.alpha(C.orange, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(cx - reg.w, yT - reg.w, reg.w * 2, reg.w * 2);
    }
    // campo magnetico della bobina: cresce e cala con l'energia ½·L·I²
    if (mix > 0.01) {
      const e = EA.clamp(s.energy, 0, 1);
      const cy = yT - rc * 0.6;
      const gr = ctx.createRadialGradient(g.xC, cy, 2, g.xC, cy, span * 0.5 + 34 * k);
      gr.addColorStop(0, EA.alpha(C.violet, 0.28 * e * mix));
      gr.addColorStop(1, EA.alpha(C.violet, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(g.xC - span - 40 * k, cy - span - 40 * k, 2 * span + 80 * k, 2 * span + 80 * k);
      ctx.save();
      ctx.strokeStyle = C.violet;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 5]);
      for (let j = 0; j < 3; j++) {
        const grow = (0.55 + 0.6 * e) * k;
        ctx.globalAlpha = mix * (0.12 + 0.55 * e) * (1 - j * 0.28);
        ctx.beginPath();
        ctx.ellipse(g.xC, cy, span / 2 + (8 + 10 * j) * grow, rc * 1.2 + (7 + 8 * j) * grow, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // fili
    ctx.save();
    ctx.strokeStyle = 'rgba(169, 195, 185, 0.42)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    stroke(ctx, [[g.xBat, batTop], [g.xBat, yT], [g.xS0, yT]]);
    stroke(ctx, [[g.xS1, yT], [g.xN, yT], [c0, yT]]);
    stroke(ctx, [[c1, yT], [g.xLd, yT], [g.xLd, yM - loadH / 2]]);
    stroke(ctx, [[g.xLd, yM + loadH / 2], [g.xLd, yB], [g.xBat, yB], [g.xBat, batBot]]);
    stroke(ctx, [[g.xO, yT], [g.xO, yM - 4 * k]]);
    stroke(ctx, [[g.xO, yM + 4 * k], [g.xO, yB]]);
    ctx.globalAlpha = mix;
    stroke(ctx, [[g.xN, yT], [g.xN, yM - 12 * k]]);
    stroke(ctx, [[g.xN, yM + 12 * k], [g.xN, yB]]);
    ctx.restore();

    // particelle: ognuna avanza in proporzione alla corrente del suo ramo
    const gap = 15 * Math.max(0.85, k);
    Object.keys(B).forEach((name) => {
      const exist = name === 'lo' ? mix : 1;
      if (exist < 0.02) return;
      const I = cur[name];
      const v = EA.clamp(I * s.vscale, -190, 190);
      offs[name] = ((((offs[name] || 0) + v * dt) % gap) + gap) % gap;
      ctx.globalAlpha = exist * (0.22 + 0.78 * Math.min(1, Math.abs(I) / 2));
      along(B[name], offs[name], gap, (x, y) => {
        if (name === 'hs' && mix > 0.5 && s.open > 0.5 && x > g.xS0 + 2 && x < g.xS1 - 2) return;
        if (name === 'lo' && Math.abs(y - yM) < 12 * k && !lowOn) return;
        if (name === 'cap' && Math.abs(y - yM) < 4 * k) return;
        ctx.drawImage(spr, x - 8, y - 8, 16, 16);
      });
    });
    ctx.globalAlpha = 1;

    const T = (str, x, y, o) => EA.draw.text(ctx, str, x, y, o);
    const lb = s.labels;
    const sz = g.narrow ? 10.5 : 11;

    // batteria: il lato positivo è la piastra lunga in alto
    ctx.save();
    ctx.fillStyle = C.bg;
    ctx.fillRect(g.xBat - 16 * k, batTop, 32 * k, batBot - batTop);
    ctx.strokeStyle = C.ink;
    ctx.lineCap = 'butt';
    [[-10, 14, 2], [-4, 7, 4], [4, 14, 2], [10, 7, 4]].forEach(([dy, half, lw]) => {
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(g.xBat - half * k, yM + dy * k);
      ctx.lineTo(g.xBat + half * k, yM + dy * k);
      ctx.stroke();
    });
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(169, 195, 185, 0.42)';
    stroke(ctx, [[g.xBat, batTop], [g.xBat, yM - 10 * k]]);
    stroke(ctx, [[g.xBat, yM + 10 * k], [g.xBat, batBot]]);
    ctx.restore();
    T('+', g.xBat - 16 * k, yM - 7 * k, { color: C.text, size: 11, align: 'right' });
    T(lb.vin, g.xBat + 17 * k, yM + 4, { color: C.ink, size: sz, weight: 700 });
    if (lb.bat) T(lb.bat, g.xBat + 17 * k, yM + 18, { color: C.dim, size: 10.5 });

    if (mix > 0.01) {
      ctx.save();
      ctx.globalAlpha = mix;
      // interruttore principale (MOSFET) e il suo comando PWM
      const lb0 = g.xS1 - g.xS0;
      const ang = -0.42 * s.open;
      const xm = (g.xS0 + g.xS1) / 2;
      const tip = [g.xS0 + lb0 * Math.cos(ang), yT + lb0 * Math.sin(ang)];
      EA.draw.line(ctx, [[g.xS0, yT], tip], s.on ? TINT : C.ink, 2.6, s.on);
      ctx.fillStyle = C.ink;
      [[g.xS0, yT], [g.xS1, yT]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill(); });
      const bw = Math.max(38, 44 * k);
      const bh = Math.max(18, 20 * k);
      const by = yT + Math.max(12, 16 * k);
      ctx.save();
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = s.on ? TINT : C.dim;
      ctx.lineWidth = 1;
      stroke(ctx, [[xm, by], [xm, yT + 4]]);
      ctx.restore();
      rr(ctx, xm - bw / 2, by, bw, bh, 5);
      ctx.fillStyle = s.on ? EA.alpha(TINT, 0.18) : C.bg2;
      ctx.fill();
      ctx.strokeStyle = s.on ? TINT : C.grid;
      ctx.lineWidth = 1;
      ctx.stroke();
      T('PWM', xm, by + bh / 2 + 4, { color: s.on ? C.ink : C.text, size: 10.5, align: 'center', weight: 700 });
      if (lb.pwm) T(lb.pwm, xm, by + bh + 14, { color: C.dim, size: 10.5, align: 'center' });
      T(lb.sw, xm, yT - lb0 * 0.42 - 9, { color: s.on ? TINT : C.text, size: sz, align: 'center', weight: 700 });

      // ramo di ricircolo: diodo oppure secondo MOSFET
      if (s.sync) {
        const pv = [g.xN, yM + 12 * k];
        const a2 = lowOn ? 0 : 0.42;
        const tp = [g.xN + 24 * k * Math.sin(a2), yM + 12 * k - 24 * k * Math.cos(a2)];
        EA.draw.line(ctx, [pv, tp], lowOn ? TINT : C.ink, 2.4, lowOn);
        ctx.fillStyle = C.ink;
        [pv, [g.xN, yM - 12 * k]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill(); });
      } else {
        const hw = 9 * k;
        ctx.beginPath();
        ctx.moveTo(g.xN, yM - 8 * k);
        ctx.lineTo(g.xN - hw, yM + 8 * k);
        ctx.lineTo(g.xN + hw, yM + 8 * k);
        ctx.closePath();
        ctx.fillStyle = lowOn ? TINT : C.bg;
        ctx.fill();
        ctx.strokeStyle = lowOn ? TINT : C.ink;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.lineWidth = 2;
        stroke(ctx, [[g.xN - hw, yM - 8 * k], [g.xN + hw, yM - 8 * k]]);
        ctx.strokeStyle = 'rgba(169, 195, 185, 0.42)';
        ctx.lineWidth = 1.6;
        stroke(ctx, [[g.xN, yM - 12 * k], [g.xN, yM - 8 * k]]);
        stroke(ctx, [[g.xN, yM + 8 * k], [g.xN, yM + 12 * k]]);
        if (lowOn) EA.draw.dot(ctx, g.xN, yM, 2, TINT);
      }
      T(lb.low, g.xN + 13 * k, yM + 4, { color: lowOn ? TINT : C.text, size: sz, weight: lowOn ? 700 : 600 });

      // bobina
      ctx.lineJoin = 'round';
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.2;
      stroke(ctx, [[c0, yT]].concat(coilPts, [[c1, yT]]));
      T(lb.l, g.xC, yT + 22 * k + 4, { color: C.ink, size: sz, align: 'center', weight: 700 });
      if (lb.energy) T(lb.energy, g.xC, yT + 22 * k + 18, { color: C.violet, size: 10.5, align: 'center' });
      EA.draw.dot(ctx, g.xN, yT, 3.2, C.amber);
      if (lb.node) T(lb.node, g.xN, yT - 10, { color: C.amber, size: 10.5, align: 'center' });
      ctx.restore();
    }

    // condensatore d'uscita
    ctx.save();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    stroke(ctx, [[g.xO - 13 * k, yM - 4 * k], [g.xO + 13 * k, yM - 4 * k]]);
    stroke(ctx, [[g.xO - 13 * k, yM + 4 * k], [g.xO + 13 * k, yM + 4 * k]]);
    ctx.restore();
    if (g.narrow) T(lb.c, g.xO - 16 * k, yM + 4, { color: C.text, size: sz, align: 'right' });
    else T(lb.c, g.xO + 16 * k, yM + 4, { color: C.text, size: sz });
    EA.draw.dot(ctx, g.xO, yT, 3, C.cyan);
    if (lb.outNode) T(lb.outNode, g.xO, yT - 10, { color: C.cyan, size: 10.5, align: 'center' });

    // carico: una presa USB
    const lw = 44 * k;
    rr(ctx, g.xLd - lw / 2, yM - loadH / 2, lw, loadH, 6 * k);
    ctx.fillStyle = C.bg2;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeRect(g.xLd - 14 * k, yM - 16 * k, 28 * k, 12 * k);
    ctx.fillStyle = C.ink;
    ctx.fillRect(g.xLd - 10 * k, yM - 16 * k, 20 * k, 4 * k);
    T('USB', g.xLd, yM + 16 * k, { color: C.ink, size: 10.5, align: 'center', weight: 700 });
    tag(ctx, lb.out, g.xLd + lw / 2, yM + loadH / 2 + 15, { color: C.cyan, size: sz, align: 'right', weight: 700 });
    if (lb.io) tag(ctx, lb.io, g.xLd + lw / 2, yM + loadH / 2 + 29, { color: C.text, size: 10.5, align: 'right' });

    // regolatore lineare (fase 1): una resistenza variabile che scalda
    if (lin > 0.01) {
      ctx.save();
      ctx.globalAlpha = lin;
      const cx = reg.x + reg.w / 2;
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(169, 195, 185, 0.42)';
      ctx.lineWidth = 1.4;
      stroke(ctx, [[cx, reg.y + reg.h], [cx, yB]]);
      ctx.restore();
      rr(ctx, reg.x, reg.y, reg.w, reg.h, 8);
      ctx.fillStyle = C.bg2;
      ctx.fill();
      ctx.fillStyle = EA.alpha(C.red, 0.16 + 0.1 * s.heat);
      ctx.fill();
      ctx.strokeStyle = C.orange;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      T('REGOLATORE LINEARE', cx, reg.y + reg.h / 2 - 2, { color: C.ink, size: sz, align: 'center', weight: 700 });
      T(lb.drop, cx, reg.y + reg.h / 2 + 12, { color: C.orange, size: 10.5, align: 'center' });
      // onde di calore che salgono
      const wh = (g.narrow ? 20 : 34) * Math.max(0.8, k);
      const top = reg.y - 6 - wh;
      const gr = ctx.createLinearGradient(0, reg.y - 6, 0, top);
      gr.addColorStop(0, EA.alpha(C.orange, 0.9));
      gr.addColorStop(1, EA.alpha(C.orange, 0));
      ctx.strokeStyle = gr;
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 5; i++) {
        const x0 = reg.x + ((i + 0.5) * reg.w) / 5;
        ctx.beginPath();
        for (let y = reg.y - 6; y >= top; y -= 2) {
          const x = x0 + 3.2 * k * Math.sin((y + s.t * 26) / 6 + i * 1.7);
          if (y === reg.y - 6) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      if (lb.heat) T(lb.heat, cx, top - 8, { color: C.orange, size: sz + 1, align: 'center', weight: 700 });
      ctx.restore();
    }
  }

  /* ---------- oscilloscopio a tre canali ---------- */

  // Nodo di commutazione, corrente nella bobina e uscita ingrandita su due periodi.
  // o: live (scia luminosa), band ('on' | 'off'), avg (area degli impulsi), iMin, iMax, vScale.
  function drawScope(ctx, r, op, rip, cyc, o) {
    const C = EA.colors;
    const narrow = r.w < 420;
    const gapY = narrow ? 8 : 12;
    const foot = 14;
    const avail = r.h - foot - gapY * 2;
    const hs = [avail * 0.3, avail * 0.4, avail * 0.3];
    const X = (v) => r.x + (v / 2) * r.w;
    const N = Math.max(90, Math.round(r.w / 1.5));
    const vs = o.vScale || niceUp(Math.max(op.dv, 1e-7) * 0.62);
    const iHi = o.iMax != null ? o.iMax : niceUp(Math.max(op.imax, op.io, 0.02) * 1.15);
    const iLo = o.iMin != null ? o.iMin : Math.min(-0.06 * iHi, op.imin * 1.25);
    const ripAt = (v) => rip[Math.min(rip.length - 1, Math.floor((v - Math.floor(v)) * rip.length))];
    const chans = [
      { name: narrow ? 'NODO DI COMMUTAZIONE' : 'TENSIONE AL NODO DI COMMUTAZIONE', color: C.amber, lo: -0.12 * op.vin, hi: op.vin * 1.12, f: (v) => vsw(op, v),
        right: (narrow ? 'media ' : 'media = Vout = ') + fx(op.vout, 2) + ' V', ref: op.vout, refColor: C.cyan },
      { name: 'CORRENTE NELLA BOBINA', color: TINT, lo: iLo, hi: iHi, f: (v) => il(op, v),
        right: (narrow ? '' : 'carico ' + amp(op.io) + ' · ') + 'ΔI ' + amp(op.dil), ref: op.io, refColor: C.text },
      { name: narrow ? 'USCITA INGRANDITA' : 'TENSIONE D\'USCITA, INGRANDITA', color: C.cyan, lo: -vs, hi: vs, f: ripAt,
        right: fx(op.vout, 2) + ' V ± ' + EA.si(op.dv / 2, 'V', 2), ref: null },
    ];
    const bands = [];
    if (o.band) {
      for (let k = 0; k < 2; k++) {
        if (o.band === 'on') bands.push([k, k + op.d]);
        else bands.push([k + op.d, k + Math.min(1, op.d + op.d2)]);
      }
    }
    const tops = [];
    let top = r.y;
    chans.forEach((ch, i) => {
      const py = top + 16;
      const ph = hs[i] - 16;
      tops.push([py, ph]);
      const Y = (v) => py + ((ch.hi - v) / (ch.hi - ch.lo)) * ph;
      EA.draw.grid(ctx, r.x, py, r.w, ph, { cols: 8, rows: 2, ticks: false });
      bands.forEach(([a, b]) => {
        ctx.fillStyle = EA.alpha(o.band === 'on' ? TINT : C.violet, 0.11);
        ctx.fillRect(X(a), py, X(b) - X(a), ph);
      });
      // zero e valore medio
      ctx.save();
      ctx.lineWidth = 1;
      if (ch.lo < 0) {
        ctx.strokeStyle = EA.alpha(C.text, 0.32);
        stroke(ctx, [[r.x, Y(0)], [r.x + r.w, Y(0)]]);
      }
      if (ch.ref != null) {
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = EA.alpha(ch.refColor, 0.85);
        ctx.lineWidth = o.avg && i === 0 ? 1.8 : 1.2;
        stroke(ctx, [[r.x, Y(ch.ref)], [r.x + r.w, Y(ch.ref)]]);
      }
      ctx.restore();
      const pts = [];
      for (let j = 0; j <= N; j++) {
        const v = (2 * j) / N;
        pts.push([X(v), Y(ch.f(Math.min(v, 1.99999)))]);
      }
      if (o.avg && i === 0) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pts[0][0], Y(0));
        pts.forEach((p) => ctx.lineTo(p[0], p[1]));
        ctx.lineTo(pts[pts.length - 1][0], Y(0));
        ctx.closePath();
        ctx.fillStyle = EA.alpha(C.amber, 0.14);
        ctx.fill();
        ctx.restore();
      }
      if (o.live) {
        EA.draw.line(ctx, pts, EA.alpha(ch.color, 0.32), 1.4, false);
        EA.draw.line(ctx, pts.slice(0, Math.floor((cyc / 2) * N) + 2), ch.color, 1.9);
      } else {
        EA.draw.line(ctx, pts, ch.color, 1.9);
      }
      EA.draw.text(ctx, ch.name, r.x, top + 11, { color: ch.color, size: 10.5, weight: 700 });
      EA.draw.text(ctx, ch.right, r.x + r.w, top + 11, { color: C.text, size: 10.5, align: 'right' });
      ch.y = Y(ch.f(cyc));
      top += hs[i] + gapY;
    });
    // etichette degli intervalli evidenziati
    if (o.band && !narrow) {
      const [a] = bands[0];
      const [py, ph] = tops[0];
      EA.draw.text(ctx, o.band === 'on' ? 'ACCESO' : 'SPENTO', X(a) + 5, o.band === 'on' ? py + ph - 6 : py + 13, { color: o.band === 'on' ? TINT : C.violet, size: 10.5, weight: 700 });
    }
    // cursore del tempo, sincronizzato con lo schema
    const xc = X(cyc);
    ctx.save();
    ctx.strokeStyle = EA.alpha(C.ink, 0.35);
    ctx.lineWidth = 1;
    stroke(ctx, [[xc, tops[0][0]], [xc, tops[2][0] + tops[2][1]]]);
    ctx.restore();
    chans.forEach((ch) => EA.draw.dot(ctx, xc, ch.y, 3, ch.color));
    const yb = r.y + r.h - 1;
    EA.draw.text(ctx, '0', X(0), yb, { color: C.dim, size: 10.5 });
    EA.draw.text(ctx, 'T = ' + EA.si(1 / op.fsw, 's'), X(1), yb, { color: C.dim, size: 10.5, align: 'center' });
    EA.draw.text(ctx, '2T', X(2), yb, { color: C.dim, size: 10.5, align: 'right' });
  }

  /* ---------- animazione principale ---------- */

  const TC = 2.4; // secondi di animazione per un periodo di commutazione (2 µs)
  const REF = { vin: 12, d: 5 / 12, fsw: 5e5, l: 10e-6, io: 2, tech: 'si', sync: false };
  const REF_DIL = rippleI(12, 5, 10e-6, 5e5);
  const FREQS = [1e5, 5e5, 2e6, 5e6];
  // Fase 4: tensione chiesta nel tempo (s, V) e a cosa serve.
  const DUTY_KEYS = [[0, 5], [1.6, 5], [2.6, 3.3], [4.6, 3.3], [5.8, 9], [8.2, 9], [9.4, 5], [11, 5]];
  const PRESETS = [[3.3, 'logica e memorie'], [5, 'USB'], [9, 'USB Power Delivery']];

  function keyAt(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) return EA.lerp(keys[i - 1][1], keys[i][1], EA.smooth((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
    }
    return keys[keys.length - 1][1];
  }

  // Bilancio del regolatore lineare, con il convertitore a commutazione come anticipo.
  function drawLinearPanel(ctx, r, prog, narrow, lin, bk) {
    const C = EA.colors;
    panel(ctx, r, narrow ? 'BILANCIO · REGOLATORE LINEARE' : 'BILANCIO DI POTENZA · REGOLATORE LINEARE', C.orange);
    const x0 = r.x + 14;
    const w0 = r.w - 28;
    const Y = (f) => r.y + r.h * f;
    const bh = narrow ? 18 : 26;
    const ink = '#071210';
    EA.draw.text(ctx, 'η = 5 V ÷ 12 V = ' + fx(lin.eta * 100, 1) + ' %', x0, Y(narrow ? 0.22 : 0.2), { color: C.ink, size: narrow ? 16 : 22, weight: 700 });
    if (!narrow) EA.draw.text(ctx, 'La corrente è la stessa in ingresso e in uscita: 7 V di differenza per 2 A fanno 14 W di calore.', x0, Y(0.28), { color: C.text, size: 12, weight: 500, mono: false });
    EA.draw.text(ctx, 'ENTRANO DALLA BATTERIA: 12 V × 2 A = ' + fx(lin.pin, 0) + ' W', x0, Y(0.37), { color: C.text, size: 10.5 });
    hbar(ctx, x0, Y(0.37) + 7, w0, bh, [[lin.pin * prog, C.amber]], lin.pin);
    EA.draw.text(ctx, narrow ? 'ESCONO' : 'ESCONO: AL CARICO E IN CALORE', x0, Y(0.6), { color: C.text, size: 10.5 });
    const xs = hbar(ctx, x0, Y(0.6) + 7, w0, bh, [[lin.pout * prog, C.green], [lin.ploss * prog, C.red]], lin.pin);
    if (prog > 0.9) {
      const ty = Y(0.6) + 7 + bh / 2 + 4;
      EA.draw.text(ctx, 'al carico ' + fx(lin.pout, 0) + ' W', x0 + 8, ty, { color: ink, size: narrow ? 10.5 : 11.5, weight: 700 });
      EA.draw.text(ctx, 'calore ' + fx(lin.ploss, 0) + ' W', xs - 8, ty, { color: ink, size: narrow ? 10.5 : 11.5, weight: 700, align: 'right' });
    }
    EA.draw.text(ctx, narrow ? 'A COMMUTAZIONE (PASSI 2–5)' : 'GLI STESSI 10 W CON UN CONVERTITORE A COMMUTAZIONE (PASSI 2–5)', x0, Y(0.83), { color: C.text, size: 10.5 });
    const xe = hbar(ctx, x0, Y(0.83) + 7, w0, bh, [[bk.pout * prog, C.green], [bk.ploss * prog, C.red]], lin.pin);
    EA.draw.text(ctx, 'η ≈ ' + fx(bk.eta * 100, 0) + ' %', xe + 10, Y(0.83) + 7 + bh / 2 + 4, { color: C.green, size: narrow ? 11 : 12, weight: 700 });
  }

  // Un fronte di accensione al rallentatore: prima sale la corrente, poi scende la tensione.
  // L'area del prodotto V·I è l'energia persa a ogni commutazione.
  function edgeScope(ctx, x, y, w, hgt, te, name, color, sweep) {
    const C = EA.colors;
    const W = 16e-9;
    const T0 = 2e-9;
    const top = y + 16;
    const ph = hgt - 16 - 14;
    const X = (tt) => x + (tt / W) * w;
    const Yf = (f) => top + ph - f * ph * 0.88;
    EA.draw.grid(ctx, x, top, w, ph, { cols: 4, rows: 2, ticks: false });
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, top - 4, Math.max(0, X(W * sweep) - x), ph + 8);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(X(T0), Yf(0));
    ctx.lineTo(X(T0 + te / 2), Yf(1));
    ctx.lineTo(X(T0 + te), Yf(0));
    ctx.closePath();
    ctx.fillStyle = EA.alpha(C.orange, 0.55);
    ctx.fill();
    EA.draw.line(ctx, [[X(0), Yf(1)], [X(T0 + te / 2), Yf(1)], [X(T0 + te), Yf(0)], [X(W), Yf(0)]], C.amber, 1.8);
    EA.draw.line(ctx, [[X(0), Yf(0)], [X(T0), Yf(0)], [X(T0 + te / 2), Yf(1)], [X(W), Yf(1)]], TINT, 1.8);
    ctx.restore();
    EA.draw.text(ctx, name + ' · ' + EA.fmt(te * 1e9, 1) + ' ns', x, y + 10, { color, size: 10.5, weight: 700 });
    EA.draw.text(ctx, EA.si(0.5 * 12 * 2 * te, 'J', 2), x + w, y + 10, { color: C.orange, size: 10.5, weight: 700, align: 'right' });
    EA.draw.text(ctx, '0', x, top + ph + 12, { color: C.dim, size: 10.5 });
    EA.draw.text(ctx, '16 ns', x + w, top + ph + 12, { color: C.dim, size: 10.5, align: 'right' });
  }

  // Fase 5: il prezzo di ogni commutazione e le perdite al crescere della frequenza.
  function drawFreqPanel(ctx, r, fi, sweep, narrow) {
    const C = EA.colors;
    panel(ctx, r, 'UNA COMMUTAZIONE AL RALLENTATORE', C.orange, narrow ? null : 'area arancione = energia persa');
    const x0 = r.x + 12;
    const w0 = r.w - 24;
    const sTop = r.y + 30;
    const sH = r.h * (narrow ? 0.42 : 0.4);
    const sw = (w0 - 14) / 2;
    edgeScope(ctx, x0, sTop, sw, sH, TECH.si.ttr / 2, 'Si', TECH_COLOR.si, sweep);
    edgeScope(ctx, x0 + sw + 14, sTop, sw, sH, TECH.gan.ttr / 2, 'GaN', TECH_COLOR.gan, sweep);
    const max = switchingLoss(12, 2, TECH.si.ttr, FREQS[3]);
    let y = sTop + sH + 14;
    if (!narrow) {
      [['tensione', C.amber], ['corrente', TINT], ['potenza persa', C.orange]].reduce((xx, [txt, col]) => {
        ctx.fillStyle = col;
        ctx.fillRect(xx, y - 8, 9, 9);
        EA.draw.text(ctx, txt, xx + 14, y, { color: C.text, size: 10.5 });
        return xx + 30 + txt.length * 6.6;
      }, x0);
      y += 26;
    } else y += 8;
    EA.draw.text(ctx, narrow ? 'PERDITE DI COMMUTAZIONE · 12 V, 2 A' : 'PERDITE DI COMMUTAZIONE A 12 V E 2 A, CON LA BOBINA CHE DÀ LO STESSO RIPPLE', x0, y, { color: C.text, size: 10.5, weight: 700 });
    if (narrow) {
      // frequenze come etichette, poi le due barre della frequenza attuale
      const cw = w0 / 4;
      FREQS.forEach((f, i) => {
        const cx = x0 + cw * i;
        if (i === fi) { rr(ctx, cx + 1, y + 7, cw - 2, 18, 9); ctx.fillStyle = EA.alpha(TINT, 0.2); ctx.fill(); }
        EA.draw.text(ctx, EA.si(f, 'Hz'), cx + cw / 2, y + 20, { color: i === fi ? C.ink : C.dim, size: 10.5, align: 'center', weight: i === fi ? 700 : 600 });
      });
      const f = FREQS[fi];
      [['si', 'Si'], ['gan', 'GaN']].forEach(([kk, nm], j) => {
        const by = y + 38 + j * 19;
        const p = switchingLoss(12, 2, TECH[kk].ttr, f);
        EA.draw.text(ctx, nm, x0, by + 4, { color: TECH_COLOR[kk], size: 10.5, weight: 700 });
        hbar(ctx, x0 + 32, by - 5, w0 - 32 - 62, 9, [[p, TECH_COLOR[kk]]], max);
        EA.draw.text(ctx, watt(p), x0 + w0, by + 4, { color: TECH_COLOR[kk], size: 10.5, align: 'right', weight: 700 });
      });
      return;
    }
    const rowsTop = y + 10;
    const rowH = (r.y + r.h - 8 - rowsTop) / FREQS.length;
    const labW = 150;
    const valW = 64;
    FREQS.forEach((f, i) => {
      const ry = rowsTop + i * rowH;
      const cur = i === fi;
      if (cur) { rr(ctx, x0 - 6, ry + 1, w0 + 12, rowH - 2, 6); ctx.fillStyle = EA.alpha(TINT, 0.12); ctx.fill(); }
      const mid = ry + rowH / 2;
      EA.draw.text(ctx, EA.si(f, 'Hz'), x0, mid + 4, { color: cur ? C.ink : C.text, size: 11, weight: 700 });
      EA.draw.text(ctx, 'L ' + EA.si(inductanceFor(12, 5, REF_DIL, f), 'H', 2), x0 + 70, mid + 4, { color: C.violet, size: 10.5 });
      ['si', 'gan'].forEach((kk, j) => {
        const p = switchingLoss(12, 2, TECH[kk].ttr, f);
        const by = mid - 9 + j * 10;
        hbar(ctx, x0 + labW, by, w0 - labW - valW, 7, [[p, TECH_COLOR[kk]]], max);
        EA.draw.text(ctx, watt(p), x0 + w0, by + 7, { color: TECH_COLOR[kk], size: 10.5, align: 'right', weight: 700 });
      });
    });
  }

  function mountHero(view, api) {
    const C = EA.colors;
    const cv = api.canvas(view, { label: 'Schema animato di un convertitore buck che porta 12 volt a 5 volt per una presa USB. Le particelle luminose sono la corrente: passa dal MOSFET quando è chiuso e dal diodo quando è aperto, mentre il campo della bobina cresce e cala. Accanto, le forme d\'onda sincronizzate di tensione al nodo di commutazione, corrente nella bobina e tensione d\'uscita.' });
    const spr = sprite(TINT);
    const STAGES = [
      { key: 'lineare', dur: 8, title: 'IL REGOLATORE LINEARE SCALDA' },
      { key: 'acceso', dur: 8, title: 'INTERRUTTORE ACCESO: LA BOBINA SI CARICA' },
      { key: 'spento', dur: 8, title: 'INTERRUTTORE SPENTO: LA BOBINA SPINGE' },
      { key: 'duty', dur: 11, title: 'IL DUTY CYCLE DECIDE LA TENSIONE' },
      { key: 'frequenza', dur: 12, title: 'PIÙ VELOCE, PIÙ PICCOLO' },
    ];
    const linRef = linear(12, 5, 2);
    const bkRef = buck(REF);
    const offs = {};
    let stage = 0;
    let stageT = 0;
    let cyc = 0;
    let mix = 0;
    let coil = 1;
    let open = 0;

    function useOf(v) {
      const p = PRESETS.find((q) => Math.abs(q[0] - v) < 0.06);
      return p ? p[1] : '';
    }

    // Frase della fase; la seconda versione, più corta, serve quando la prima non sta in due righe.
    function subtitle(key, op, f, live) {
      if (key === 'lineare') return 'Da 12 V a 5 V con 2 A: entrano 24 W, al carico ne arrivano 10, gli altri 14 diventano calore.';
      if (key === 'acceso') return 'MOSFET chiuso: sulla bobina ci sono 12 − 5 = 7 V, la corrente sale in rampa e il campo si carica.';
      if (key === 'spento') return 'MOSFET aperto: la bobina spinge la corrente nel giro del diodo e cede al carico l\'energia accumulata.';
      if (key === 'duty') {
        if (!live) return 'L\'uscita è la media degli impulsi: D = 27,5 % dà 3,3 V, 41,7 % dà 5 V, 75 % dà 9 V.';
        const tag = useOf(op.vout);
        return ['Chiuso per il ' + fx(op.d * 100, 1) + ' % del periodo: l\'uscita è la media, ' + fx(op.d, 3) + ' × 12 V = ' + fx(op.vout, 1) + ' V' + (tag ? ' (' + tag + ').' : '.'),
          'Chiuso per il ' + fx(op.d * 100, 1) + ' % del periodo: Vout = ' + fx(op.d, 3) + ' × 12 V = ' + fx(op.vout, 1) + ' V.'];
      }
      const head = 'A ' + EA.si(f, 'Hz') + ' basta una bobina da ' + EA.si(op.l, 'H', 2);
      return [head + ', ma ogni commutazione costa energia: col GaN quasi 7 volte meno.', head + ', ma ogni commutazione spreca un po\' di energia.'];
    }

    function numbers(key, op) {
      if (key === 'lineare') return 'P = (Vin − Vout) · I = 7 V × 2 A = 14 W di calore';
      if (key === 'acceso') return 'di/dt = (Vin − Vout) / L = 7 V / 10 µH = ' + fx((12 - op.vout) / op.l / 1e6, 2) + ' A/µs';
      if (key === 'spento') return 'di/dt = (−' + fx(VF, 2) + ' − 5) V / 10 µH = ' + fx((-VF - op.vout) / op.l / 1e6, 2) + ' A/µs';
      if (key === 'duty') return 'Vout = D · Vin = ' + fx(op.d, 3) + ' × 12 V = ' + fx(op.vout, 2) + ' V';
      return 'L = (Vin − Vout) · D / (ΔI · f) = ' + EA.si(op.l, 'H', 2) + ' con ΔI = ' + amp(op.dil);
    }

    function staticCyc(key, op) {
      if (key === 'acceso') return 1 + op.d * 0.55;
      if (key === 'spento') return 1 + op.d + (1 - op.d) * 0.45;
      return 1 + op.d * 0.5;
    }

    function draw(t, dt) {
      if (!cv.w) return;
      const live = api.playing;
      if (live && dt > 0) {
        stageT += dt;
        if (stageT > STAGES[stage].dur) {
          stageT = 0;
          stage = (stage + 1) % STAGES.length;
          api.setStep(stage);
        }
      }
      const key = STAGES[stage].key;
      const vset = key === 'duty' && live ? keyAt(DUTY_KEYS, stageT) : 5;
      const fi = key === 'frequenza' ? (live ? Math.min(3, Math.floor(stageT / 3)) : 2) : 1;
      const f = FREQS[fi];
      const op = buck(Object.assign({}, REF, { d: vset / 12, fsw: f, l: inductanceFor(12, 5, REF_DIL, f) }));
      const coilGoal = Math.cbrt(op.l / 10e-6);
      if (live && dt > 0) {
        const onNow = cyc % 1 < op.d;
        const rate = key === 'acceso' ? (onNow ? 0.45 : 1.7) : key === 'spento' ? (onNow ? 1.7 : 0.45) : 1;
        cyc = (cyc + (dt / TC) * rate) % 2;
        mix += ((key === 'lineare' ? 0 : 1) - mix) * (1 - Math.exp(-dt * 7));
        coil += (coilGoal - coil) * (1 - Math.exp(-dt * 4));
      }
      const c = live ? cyc : staticCyc(key, op);
      const u = c % 1;
      const on = u < op.d;
      if (live) open += ((on ? 0 : 1) - open) * (1 - Math.exp(-Math.max(dt, 0.016) * 26));
      const iL = il(op, u);

      const ctx = cv.ctx;
      const w = cv.w;
      const hh = cv.h;
      const narrow = w < 560;
      const stacked = hh > w * 0.75;
      EA.draw.clear(cv);

      // intestazione: fase e frase che la spiega
      const pad = narrow ? 14 : 20;
      EA.draw.text(ctx, (stage + 1) + ' · ' + STAGES[stage].title, pad, narrow ? 22 : 28, { color: C.ink, size: narrow ? 11 : 12, weight: 700 });
      const fs = narrow ? 12 : 13;
      const subs = [].concat(subtitle(key, op, f, live));
      let lines = wrap(ctx, subs[0], w - pad * 2, fs);
      if (lines.length > 2 && subs[1]) lines = wrap(ctx, subs[1], w - pad * 2, fs);
      lines.slice(0, 2).forEach((ln, i) => {
        EA.draw.text(ctx, ln, pad, (narrow ? 41 : 49) + i * 16, { color: C.text, size: fs, weight: 500, mono: false });
      });
      const headH = narrow ? 70 : 62;

      let sch;
      let pan;
      if (stacked) {
        const sh = Math.round((hh - headH) * 0.47);
        sch = { x: 6, y: headH, w: w - 12, h: sh };
        pan = { x: 10, y: headH + sh + 6, w: w - 20, h: hh - headH - sh - 16 };
      } else {
        const half = Math.round(w * 0.5);
        sch = { x: 12, y: headH, w: half - 12, h: hh - headH - 8 };
        pan = { x: half + 16, y: headH + 6, w: w - half - 34, h: hh - headH - 24 };
      }
      const g = circuitGeo(sch, narrow);
      drawCircuit(ctx, g, {
        mix: live ? mix : key === 'lineare' ? 0 : 1,
        on, open: live ? open : on ? 0 : 1,
        il: iL, io: op.io, sync: false,
        energy: (iL * iL) / (op.imax * op.imax),
        coil: live ? coil : coilGoal,
        heat: 1, t, vscale: 30 * g.k,
        labels: {
          vin: '12 V', bat: narrow ? null : 'batteria', sw: 'MOSFET', low: 'diodo',
          l: (narrow ? '' : 'bobina ') + EA.si(op.l, 'H', 2),
          energy: narrow ? null : '½·L·I² = ' + EA.si(0.5 * op.l * iL * iL, 'J', 2),
          c: narrow ? 'C' : '22 µF', out: fx(op.vout, 1) + ' V', io: '2 A',
          pwm: narrow ? null : EA.si(f, 'Hz'), node: narrow ? null : 'nodo', outNode: narrow ? null : 'uscita',
          drop: narrow ? 'caduta 7 V · 14 W' : 'caduta di 7 V', heat: narrow ? null : '14 W di calore',
        },
      }, offs, live ? dt : 0, spr);
      if (!stacked) {
        const yb = sch.y + sch.h - 10;
        EA.draw.text(ctx, 'IN NUMERI', sch.x + 8, yb, { color: C.dim, size: 10.5, weight: 700 });
        EA.draw.text(ctx, numbers(key, op), sch.x + 84, yb, { color: C.ink, size: 11.5 });
      }

      if (key === 'lineare') drawLinearPanel(ctx, pan, live ? EA.ease.out(stageT / 1.4) : 1, stacked, linRef, bkRef);
      else if (key === 'frequenza') drawFreqPanel(ctx, pan, fi, live ? Math.min(1, (stageT % 3) / 1.6) : 1, pan.w < 420);
      else {
        drawScope(ctx, pan, op, outputRipple(op, 200), c, {
          live, band: key === 'acceso' ? 'on' : key === 'spento' ? 'off' : null,
          avg: key === 'duty', iMin: -0.15, iMax: 3, vScale: 0.005,
        });
      }
    }

    api.loop(draw);
    api.setStep(0);
    return {
      focus(key, i) {
        stage = EA.clamp(i, 0, STAGES.length - 1);
        stageT = 0;
        cyc = STAGES[stage].key === 'spento' ? REF.d : 0;
        api.setStep(stage);
        api.announce('Passo ' + (stage + 1) + ' di ' + STAGES.length + ', ' + STAGES[stage].title.toLowerCase() + '.');
        api.invalidate();
      },
    };
  }

  /* ---------- laboratorio: banco del convertitore buck ---------- */

  const TECH_HINT = {
    si: 'MOSFET da 30\u00a0V: commuta in circa 20\u00a0ns, 10\u00a0mΩ in conduzione.',
    sic: 'Pensato per 650\u00a0V e oltre: qui è più resistivo (25\u00a0mΩ) e più costoso da pilotare.',
    gan: 'Commuta in circa 3\u00a0ns: perdite di commutazione molto minori.',
  };

  function drawBalance(ctx, r, op, cmp, narrow) {
    const C = EA.colors;
    panel(ctx, r, 'BILANCIO DI POTENZA', C.text, narrow ? null : 'dove va l\'energia');
    const x0 = r.x + 12;
    const w0 = r.w - 24;
    const rows = [{ name: narrow ? 'A COMMUTAZIONE' : 'CONVERTITORE A COMMUTAZIONE', pin: op.pin, eta: op.eta, loss: op.ploss,
      segs: [[op.pout, C.green], [op.pHigh, C.amber], [op.pLow, C.orange], [op.pSw, C.pink], [op.pDrv, C.violet]] }];
    if (cmp) rows.push({ name: 'REGOLATORE LINEARE', pin: op.lin.pin, eta: op.lin.eta, loss: op.lin.ploss, segs: [[op.lin.pout, C.green], [op.lin.ploss, C.red]] });
    const pmax = Math.max(1e-9, ...rows.map((q) => q.pin));
    const rowH = EA.clamp((r.h - 150) / 2.2, 30, 46);
    let y = r.y + 42;
    rows.forEach((q, i) => {
      EA.draw.text(ctx, q.name, x0, y, { color: C.text, size: 10.5 });
      EA.draw.text(ctx, 'η ' + fx(q.eta * 100, 1) + ' % · ' + watt(q.loss) + ' in calore', x0 + w0, y, { color: i ? C.red : C.ink, size: 10.5, align: 'right', weight: 700 });
      hbar(ctx, x0, y + 5, w0, narrow ? 10 : 12, q.segs, pmax);
      y += rowH;
    });
    // di che cosa sono fatte le perdite del convertitore
    const parts = [[op.pHigh, C.amber, 'MOSFET'], [op.pLow, C.orange, op.sync ? 'sincrono' : 'diodo'], [op.pSw, C.pink, 'commutazione'], [op.pDrv, C.violet, 'pilotaggio']];
    EA.draw.text(ctx, 'LE PERDITE DEL CONVERTITORE: ' + watt(op.ploss), x0, y, { color: C.text, size: 10.5 });
    hbar(ctx, x0, y + 5, w0, 8, parts, Math.max(1e-12, op.ploss));
    // legenda: quattro colonne con il valore sotto; su schermi stretti due colonne, valore a destra
    const cols = narrow ? 2 : 4;
    const cw = w0 / cols;
    const rowL = narrow ? 16 : 30;
    parts.forEach(([p, col, nm], i) => {
      const xx = x0 + (i % cols) * cw;
      const yy = y + (narrow ? 25 : 29) + Math.floor(i / cols) * rowL;
      ctx.fillStyle = col;
      ctx.fillRect(xx, yy - 8, 8, 8);
      EA.draw.text(ctx, nm, xx + 13, yy, { color: C.text, size: 10.5 });
      if (narrow) EA.draw.text(ctx, watt(p), xx + cw - 10, yy, { color: C.ink, size: 10.5, weight: 700, align: 'right' });
      else EA.draw.text(ctx, watt(p), xx + 13, yy + 13, { color: C.ink, size: 10.5, weight: 700 });
    });
    y += (narrow ? 25 : 29) + Math.ceil(parts.length / cols) * rowL + 6;
    if (y < r.y + r.h - 4) {
      EA.draw.text(ctx, 'dalla batteria ' + amp(op.iin) + (cmp ? (narrow ? ' · lineare ' : ' · il lineare ne vuole ') + amp(op.io) : ''), x0, y, { color: C.amber, size: 10.5 });
    }
  }

  function drawEta(ctx, r, curves, op, st, narrow) {
    const C = EA.colors;
    panel(ctx, r, narrow ? 'RENDIMENTO E FREQUENZA' : 'RENDIMENTO AL VARIARE DELLA FREQUENZA', C.text, narrow ? null : 'bobina scelta per lo stesso ripple');
    const px = r.x + 44;
    const py = r.y + 32;
    const pw = r.w - 44 - 44;
    const ph = r.h - 32 - 24;
    // la scala segue silicio, GaN e la tecnologia scelta; il SiC, se non scelto, può uscire in basso
    let lo = 1;
    curves.forEach((cu) => { if (cu.k !== 'sic' || st.tech === 'sic') cu.pts.forEach((p) => { lo = Math.min(lo, p[1]); }); });
    lo = Math.max(0, Math.floor((lo - 0.015) * 20) / 20);
    if (lo > 0.9) lo = 0.9;
    const span = 1 - lo;
    const step = [0.02, 0.05, 0.1, 0.2, 0.25, 0.5].find((q) => (q / span) * ph >= 22) || 0.5;
    const X = (f) => px + (Math.log(f / 2e4) / Math.log(250)) * pw;
    const Y = (e) => py + ((1 - e) / span) * ph;
    ctx.save();
    ctx.strokeStyle = C.grid2;
    ctx.lineWidth = 1;
    for (let e = 1; e >= lo - 1e-9; e -= step) {
      stroke(ctx, [[px, Math.round(Y(e)) + 0.5], [px + pw, Math.round(Y(e)) + 0.5]]);
      EA.draw.text(ctx, fx(e * 100, 0) + ' %', px - 6, Y(e) + 4, { color: C.dim, size: 10.5, align: 'right' });
    }
    [[2e4, '20 kHz'], [1e5, '100 kHz'], [1e6, '1 MHz'], [5e6, '5 MHz']].forEach(([f, txt], i) => {
      stroke(ctx, [[Math.round(X(f)) + 0.5, py], [Math.round(X(f)) + 0.5, py + ph]]);
      EA.draw.text(ctx, txt, X(f), py + ph + 15, { color: C.dim, size: 10.5, align: i === 0 ? 'left' : i === 3 ? 'right' : 'center' });
    });
    ctx.restore();
    if (st.cmp) {
      if (op.lin.eta >= lo) {
        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = C.red;
        stroke(ctx, [[px, Y(op.lin.eta)], [px + pw, Y(op.lin.eta)]]);
        ctx.restore();
        EA.draw.text(ctx, 'lineare', px + 6, Y(op.lin.eta) - 5, { color: C.red, size: 10.5 });
      } else {
        EA.draw.text(ctx, 'lineare: ' + fx(op.lin.eta * 100, 1) + ' %, fuori scala ↓', px + 6, py + ph - 6, { color: C.red, size: 10.5 });
      }
    }
    // curve delle tre tecnologie, la scelta in primo piano
    const ends = [];
    ctx.save();
    ctx.beginPath();
    ctx.rect(px - 2, py - 6, pw + 4, ph + 8);
    ctx.clip();
    curves.slice().sort((a) => (a.k === st.tech ? 1 : -1)).forEach((cu) => {
      const cur = cu.k === st.tech;
      const pts = cu.pts.map(([f, e]) => [X(f), Y(e)]);
      EA.draw.line(ctx, pts, cur ? TECH_COLOR[cu.k] : EA.alpha(TECH_COLOR[cu.k], 0.5), cur ? 2.2 : 1.3, cur);
      const yEnd = pts[pts.length - 1][1];
      ends.push({ y: Math.min(py + ph, yEnd), k: cu.k, cur, out: yEnd > py + ph + 1 });
    });
    ctx.restore();
    ends.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 12);
    ends.forEach((e) => EA.draw.text(ctx, TECH[e.k].label + (e.out ? ' ↓' : ''), px + pw + 6, e.y + 4, { color: e.cur ? TECH_COLOR[e.k] : EA.alpha(TECH_COLOR[e.k], 0.75), size: 10.5, weight: 700 }));
    const mx = X(st.fsw);
    const my = Y(op.eta);
    EA.draw.dot(ctx, mx, my, 4, C.ink);
    EA.draw.text(ctx, fx(op.eta * 100, 1) + ' %', mx + (mx > px + pw * 0.75 ? -8 : 8), my - 8, { color: C.ink, size: 11, weight: 700, align: mx > px + pw * 0.75 ? 'right' : 'left' });
  }

  function mountLab(parts, api) {
    const C = EA.colors;
    const h = EA.h;
    if (parts.root) parts.root.classList.add('potenza-lab');
    const st = { vin: 12, d: 0.417, fsw: 5e5, l: 10e-6, io: 2, tech: 'si', sync: false, cmp: true };
    const offs = {};
    const spr = sprite(TINT);
    let op = buck(st);
    let rip = [];
    let curves = [];
    let cyc = 0;
    let open = 0;

    const cv = api.canvas(parts.display, { class: 'ea-canvas potenza-lab-canvas', label: 'Banco del convertitore buck. Lo schema mostra la corrente come particelle; le forme d\'onda mostrano la tensione al nodo di commutazione, la corrente nella bobina e l\'ondulazione d\'uscita; il bilancio dice quanta potenza arriva al carico e quanta diventa calore, anche a confronto con un regolatore lineare; il grafico finale mostra il rendimento in funzione della frequenza per silicio, carburo di silicio e nitruro di gallio.' });

    const set = (k) => (v) => { st[k] = v; update(); };
    const sVin = EA.ui.slider({ label: 'Tensione d\'ingresso', min: 5, max: 24, step: 0.5, value: st.vin, color: C.amber, format: (v) => fx(v, 1) + ' V', oninput: set('vin') });
    const sD = EA.ui.slider({ label: 'Duty cycle D', min: 0.05, max: 0.95, step: 0.001, value: st.d, color: TINT, format: (v) => fx(v * 100, 1) + ' %', hint: 'Frazione del periodo con il MOSFET chiuso: Vout\u00a0≈\u00a0D\u00a0·\u00a0Vin.', oninput: set('d') });
    const sF = EA.ui.slider({ label: 'Frequenza di commutazione', min: 2e4, max: 5e6, log: true, value: st.fsw, color: C.cyan, format: (v) => EA.si(v, 'Hz'), oninput: set('fsw') });
    const sL = EA.ui.slider({ label: 'Induttanza della bobina', min: 0.47e-6, max: 470e-6, log: true, value: st.l, color: C.violet, format: (v) => EA.si(v, 'H'), oninput: set('l') });
    const sI = EA.ui.slider({ label: 'Corrente di carico', min: 0.02, max: 5, log: true, value: st.io, color: C.green, format: (v) => amp(v), oninput: set('io') });
    const techHint = h('small', { class: 'ea-ctl-hint' });
    const tech = EA.ui.segmented({
      label: 'Interruttore', color: TINT, value: st.tech,
      options: [{ value: 'si', label: 'Si', title: TECH.si.name }, { value: 'sic', label: 'SiC', title: TECH.sic.name }, { value: 'gan', label: 'GaN', title: TECH.gan.name }],
      onchange: set('tech'),
    });
    const lowHint = h('small', { class: 'ea-ctl-hint' });
    const low = EA.ui.segmented({
      label: 'Ramo di ricircolo', color: TINT, value: 'diodo',
      options: [{ value: 'diodo', label: 'Diodo' }, { value: 'sync', label: 'MOSFET sincrono' }],
      onchange: (v) => { st.sync = v === 'sync'; update(); },
    });
    const cmp = EA.ui.toggle({ label: 'Confronta con un regolatore lineare', checked: st.cmp, color: C.red, onchange: set('cmp') });
    parts.controls.append(sVin.el, sD.el, sF.el, sL.el, sI.el,
      h('div', { class: 'ea-ctl' }, tech.el, techHint),
      h('div', { class: 'ea-ctl' }, low.el, lowHint),
      cmp.el);

    const roV = EA.ui.readout({ label: 'Tensione d\'uscita' });
    const roI = EA.ui.readout({ label: 'Ripple di corrente ΔI' });
    const roDV = EA.ui.readout({ label: 'Ripple di tensione ΔV' });
    const roE = EA.ui.readout({ label: 'Rendimento' });
    const roP = EA.ui.readout({ label: 'Potenza persa' });
    const roM = EA.ui.readout({ label: 'Modo di conduzione' });
    parts.readouts.append(roV.el, roI.el, roDV.el, roE.el, roP.el, roM.el);

    const FR = [];
    for (let i = 0; i <= 60; i++) FR.push(2e4 * Math.pow(250, i / 60));

    function update(silent) {
      op = buck(st);
      rip = outputRipple(op, 240);
      curves = ['si', 'sic', 'gan'].map((k) => ({ k, pts: FR.map((f) => [f, efficiencyAt(st, f, k)]) }));
      const ratio = op.io > 0 ? op.dil / op.io : Infinity;
      roV.set(fx(op.vout, 2) + ' V', op.mode === 'dcm' ? 'warn' : null);
      roI.set(amp(op.dil) + ' · ' + (ratio < 100 ? fx(ratio * 100, 0) : '>9999') + ' %', ratio <= 0.4 ? 'good' : ratio <= 1 ? null : 'warn');
      roDV.set(EA.si(op.dv, 'V'), op.dv < 0.01 * op.vout ? 'good' : op.dv < 0.05 * op.vout ? null : 'warn');
      roE.set(fx(op.eta * 100, 1) + ' %', op.eta >= 0.9 ? 'good' : op.eta >= 0.75 ? null : op.eta >= 0.5 ? 'warn' : 'bad');
      roP.set(watt(op.ploss), op.ploss > 0.15 * op.pout ? 'warn' : null);
      roM.set(op.mode === 'dcm' ? 'discontinuo' : op.imin < 0 ? 'continuo, iL<0' : 'continuo', op.mode === 'dcm' ? 'warn' : null);
      techHint.textContent = TECH_HINT[st.tech];
      lowHint.textContent = st.sync
        ? 'Un secondo MOSFET al posto del diodo: caduta minima, e la corrente può invertirsi.'
        : 'Diodo Schottky: circa 0,45\u00a0V di caduta mentre conduce.';
      api.invalidate();
      if (!silent) api.announce('Uscita ' + fx(op.vout, 2) + ' volt, rendimento ' + fx(op.eta * 100, 1) + ' per cento, conduzione ' + (op.mode === 'dcm' ? 'discontinua.' : 'continua.'));
    }

    function layout(w, hh) {
      if (hh <= w * 0.9) {
        const pad = 12;
        const gap = 14;
        const lw = Math.round((w - 2 * pad - gap) * 0.44);
        const rw = w - 2 * pad - gap - lw;
        const sh = Math.round((hh - 2 * pad - gap) * 0.52);
        const ch = Math.round((hh - 2 * pad - gap) * 0.6);
        return {
          sch: { x: pad, y: pad, w: lw, h: sh },
          bal: { x: pad, y: pad + sh + gap, w: lw, h: hh - 2 * pad - gap - sh },
          scope: { x: pad + lw + gap, y: pad, w: rw, h: ch },
          eta: { x: pad + lw + gap, y: pad + ch + gap, w: rw, h: hh - 2 * pad - gap - ch },
        };
      }
      const pad = 8;
      const gap = 10;
      const avail = hh - 2 * pad - 3 * gap;
      const fr = [0.25, 0.3, 0.24, 0.21];
      const out = {};
      let y = pad;
      ['sch', 'scope', 'bal', 'eta'].forEach((k, i) => {
        const hgt = Math.round(avail * fr[i]);
        out[k] = { x: pad, y, w: w - 2 * pad, h: hgt };
        y += hgt + gap;
      });
      return out;
    }

    function draw(t, dt) {
      if (!cv.w) return;
      const live = api.playing;
      if (live && dt > 0) cyc = (cyc + dt / TC) % 2;
      const c = live ? cyc : 1 + op.d * 0.5;
      const u = c % 1;
      const on = u < op.d;
      if (live) open += ((on ? 0 : 1) - open) * (1 - Math.exp(-Math.max(dt, 0.016) * 26));
      const ctx = cv.ctx;
      const w = cv.w;
      const hh = cv.h;
      const R = layout(w, hh);
      const narrow = R.sch.w < 420;
      EA.draw.clear(cv);

      panel(ctx, R.sch, 'SCHEMA', C.text, 'le particelle sono la corrente');
      const g = circuitGeo({ x: R.sch.x + 4, y: R.sch.y + 22, w: R.sch.w - 8, h: R.sch.h - 26 }, narrow);
      const iL = il(op, u);
      const m = Math.max(Math.abs(op.imax), Math.abs(op.imin), 1e-9);
      drawCircuit(ctx, g, {
        mix: 1, on, open: live ? open : on ? 0 : 1, il: iL, io: op.io, sync: op.sync,
        energy: (iL * iL) / (m * m), coil: 1, heat: 0, t, vscale: 26 * g.k,
        labels: {
          vin: fx(st.vin, 1) + ' V', sw: st.tech === 'gan' ? 'GaN' : 'MOSFET ' + TECH[st.tech].label,
          low: st.sync ? 'MOSFET' : 'diodo', l: EA.si(st.l, 'H'), c: narrow ? 'C' : '22 µF',
          out: fx(op.vout, 2) + ' V', io: narrow ? null : amp(op.io), node: narrow ? null : 'nodo',
          pwm: narrow ? null : EA.si(st.fsw, 'Hz'),
        },
      }, offs, live ? dt : 0, spr);

      panel(ctx, R.scope, 'FORME D\'ONDA', C.text, (narrow ? '' : 'rallentate: ') + 'periodo ' + EA.si(1 / op.fsw, 's'));
      drawScope(ctx, { x: R.scope.x + 12, y: R.scope.y + 30, w: R.scope.w - 24, h: R.scope.h - 36 }, op, rip, c, { live });
      drawBalance(ctx, R.bal, op, st.cmp, narrow);
      drawEta(ctx, R.eta, curves, op, st, narrow);
    }

    api.loop(draw);
    update(true);
    return {};
  }

  /* ---------- contenuti ---------- */

  EA.register({
    id: 'potenza',
    intro: [
      'Ogni apparecchio vuole la sua tensione: il processore di un computer lavora a circa 1 V, una presa USB dà 5 V, la batteria di un\'auto ne ha 12. Il modo più semplice per abbassarla è il <strong>regolatore lineare</strong> dell\'alimentatore visto nella sezione intermedia, come il classico 7805: un transistor che fa da resistenza variabile e brucia la differenza. Funziona, ma il suo rendimento non può superare <var>V</var><sub>out</sub>/<var>V</var><sub>in</sub>: da 12 a 5 V più di metà dell\'energia diventa calore.',
      'L\'elettronica di potenza ribalta l\'idea: invece di frenare la corrente, la fa passare a impulsi. Un <strong>interruttore</strong>, oggi un MOSFET, si apre e si chiude centinaia di migliaia di volte al secondo. Chiuso ha ai capi quasi zero volt, aperto non lascia passare corrente: in entrambi i casi non scalda quasi nulla. Una <strong>bobina</strong> e un <strong>condensatore</strong> fanno la media degli impulsi, e se l\'interruttore resta chiuso per una frazione <var>D</var> del tempo, il <em>duty cycle</em>, l\'uscita vale circa <var>D</var>·<var>V</var><sub>in</sub>. Così lavorano il <em>buck</em>, che abbassa la tensione, il <em>boost</em>, che la alza, e il <em>buck-boost</em>, che sa fare entrambe le cose.',
      'Questi convertitori stanno dentro ogni caricatore, ogni computer, ogni auto elettrica e ogni impianto fotovoltaico. La loro storia è una storia di interruttori sempre migliori: dalle valvole ad arco di mercurio ai tiristori, dai MOSFET di potenza agli IGBT, fino al <strong>carburo di silicio</strong> (SiC) e al <strong>nitruro di gallio</strong> (GaN), che commutano più in fretta e sprecano meno. E più alta è la frequenza, più piccole possono essere bobine e condensatori: per questo un caricatore di oggi sta nel palmo di una mano.',
    ],
    steps: [
      { title: 'Il regolatore lineare scalda', text: 'Il regolatore lineare abbassa la tensione facendo da resistenza variabile: la corrente che entra è la stessa che esce. Da 12 a 5 V con 2 A entrano 24 W, al carico ne arrivano 10 e 14 diventano calore. Il rendimento è appena il 41,7%.', focus: 'lineare' },
      { title: 'Interruttore acceso: la bobina si carica', text: 'Il MOSFET si chiude e la batteria spinge corrente attraverso la bobina verso il carico. Sulla bobina ci sono 12 − 5 = 7 V: la corrente non salta, cresce in rampa (di/dt = V/L) e il campo magnetico accumula energia.', focus: 'acceso' },
      { title: 'Interruttore spento: la bobina spinge', text: 'Il MOSFET si apre, ma la bobina non lascia fermare la corrente: con l\'energia accumulata la spinge nel giro del diodo di ricircolo. La corrente scende piano, senza mai annullarsi, e il condensatore livella le piccole oscillazioni.', focus: 'spento' },
      { title: 'Il duty cycle decide la tensione', text: 'Il nodo di commutazione salta tra 12 V e quasi 0: bobina e condensatore ne fanno la media. Se l\'interruttore resta chiuso per una frazione D del periodo, l\'uscita vale D·Vin: 27,5% per 3,3 V, 41,7% per 5 V, 75% per 9 V.', focus: 'duty' },
      { title: 'Più veloce, più piccolo (fino a un certo punto)', text: 'A frequenza doppia basta metà induttanza per lo stesso ripple. Ma ogni commutazione spreca un po\' di energia: i transistor al nitruro di gallio, che commutano in pochi nanosecondi, spostano il limite verso i MHz e permettono caricatori più piccoli.', focus: 'frequenza' },
    ],
    formulas: [
      { label: 'Rendimento del regolatore lineare', eq: '<var>η</var><sub>lin</sub> = <var>V</var><sub>out</sub> ⁄ <var>V</var><sub>in</sub>', text: 'La corrente d\'ingresso è quella d\'uscita, quindi la potenza persa è (<var>V</var><sub>in</sub> − <var>V</var><sub>out</sub>)·<var>I</var>. Da 12 a 5 V il rendimento resta 41,7% con qualunque corrente: dalla corrente dipendono solo i watt persi.' },
      { label: 'Rapporto di conversione del buck', eq: '<var>V</var><sub>out</sub> = <var>D</var> · <var>V</var><sub>in</sub>', text: '<var>D</var> = <var>t</var><sub>on</sub>/<var>T</var> è il duty cycle. Vale per il buck ideale in conduzione continua. Per confronto, il boost dà <var>V</var><sub>in</sub>/(1 − <var>D</var>) e il buck-boost invertente −<var>V</var><sub>in</sub>·<var>D</var>/(1 − <var>D</var>).' },
      { label: 'Ripple di corrente e di tensione', eq: 'Δ<var>I</var><sub>L</sub> = <var>V</var><sub>L</sub>·<var>D</var> ⁄ (<var>L</var>·<var>f</var><sub>sw</sub>)<br>Δ<var>V</var> ≈ Δ<var>I</var><sub>L</sub> ⁄ (8·<var>f</var><sub>sw</sub>·<var>C</var>)', text: '<var>V</var><sub>L</sub> = <var>V</var><sub>in</sub> − <var>V</var><sub>out</sub> è la tensione sulla bobina a interruttore chiuso. Il triangolo di corrente non dipende dal carico; raddoppiando la frequenza Δ<var>I</var><sub>L</sub> si dimezza e Δ<var>V</var> diventa un quarto.' },
      { label: 'Perdite di commutazione', eq: '<var>P</var><sub>sw</sub> ≈ ½·<var>V</var><sub>in</sub>·<var>I</var>·(<var>t</var><sub>r</sub> + <var>t</var><sub>f</sub>)·<var>f</var><sub>sw</sub>', text: 'A ogni fronte tensione e corrente convivono per qualche nanosecondo. A 12 V, 2 A e 2 MHz: 0,48 W con un MOSFET al silicio da 20 ns, 0,07 W con un GaN da 3 ns. Si somma la conduzione, circa <var>I</var><sup>2</sup>·<var>R</var><sub>DS(on)</sub>·<var>D</var>.' },
    ],
    timeline: [
      { year: 1902, title: 'Il raddrizzatore ad arco di mercurio', who: 'Peter Cooper Hewitt, New York', text: 'Partendo dalla sua lampada a vapori di mercurio del 1901, Hewitt scopre che un arco nel vapore di mercurio lascia passare la corrente in un solo verso e ne ricava un raddrizzatore. Grandi valvole dal bagliore blu-violetto convertiranno per decenni l\'alternata in continua per tram, ferrovie e industria e, dal 1954, per il primo collegamento HVDC commerciale, verso l\'isola svedese di Gotland.' },
      { year: 1928, title: 'Il thyratron, una porta comandata', who: 'Albert W. Hull, con Irving Langmuir, General Electric, Schenectady (New York)', text: 'È un tubo a gas con una griglia: un piccolo segnale sceglie l\'istante in cui la corrente comincia a passare, ma per spegnerlo bisogna farla scendere a zero, proprio come farà il tiristore. Fu sviluppato alla fine degli anni \'20 e Hull lo descrisse in articoli del 1929.' },
      { year: 1957, title: 'Il tiristore (SCR) al silicio', who: 'General Electric: gruppo di Gordon Hall, lancio curato da Frank W. “Bill” Gutzwiller', text: 'Partendo dalla struttura p-n-p-n proposta da William Shockley nel 1950 e dagli interruttori p-n-p-n studiati ai Bell Labs nel 1956, General Electric presenta il raddrizzatore controllato al silicio, un “thyratron allo stato solido”. Prenderà il posto di tubi e valvole a mercurio, dai regolatori di luce alle linee HVDC.' },
      { year: 1977, title: 'Lo switching entra nel personal computer', who: 'Rod Holt, Apple', text: 'L\'Apple II è uno dei primi personal computer di grande serie con un alimentatore a commutazione, progettato da Rod Holt: più piccolo e meno caldo di un lineare, tanto che il computer non aveva ventola. Non fu il primo switching, che si usava dagli anni \'60 nell\'aerospazio e poi negli oscilloscopi: la vera svolta furono i transistor veloci ad alta tensione, diventati economici negli anni \'70.' },
      { year: 1979, title: 'HEXFET, il MOSFET di potenza a celle esagonali', who: 'Alex Lidow e Tom Herman, International Rectifier, El Segundo (California)', text: 'Tante piccole celle MOSFET verticali, esagonali, collegate in parallelo sullo stesso chip formano un interruttore comandato in tensione, con bassa resistenza e commutazioni rapidissime: il MOSFET diventa l\'interruttore standard degli alimentatori. Il lancio è collocato tra il 1978 e il 1979 (presentazione all\'IEDM del 1979); MOSFET di potenza più semplici esistevano già dalla metà degli anni \'70.' },
      { year: 1982, title: 'Nasce l\'IGBT', who: 'B. Jayant Baliga, General Electric, Schenectady (New York)', text: 'Baliga unisce il gate isolato del MOSFET alla conduzione bipolare del transistor. Ideato intorno al 1979-80 e presentato all\'IEDM del 1982, arriva sul mercato a metà degli anni \'80 e, risolto il problema del <em>latch-up</em>, diventa il cuore degli inverter per motori, treni, auto elettriche e fotovoltaico. Una struttura equivalente fu brevettata in parallelo da Hans Becke e Carl Wheatley (RCA, domanda del 1980).' },
      { year: 2001, title: 'Il carburo di silicio arriva sul mercato', who: 'Infineon Technologies, Germania', text: 'Infineon mette in commercio i primi diodi Schottky in carburo di silicio: quasi privi della corrente di recupero inverso dei diodi al silicio, tagliano le perdite di commutazione. Nel 2011 Cree (oggi Wolfspeed) lancia il primo MOSFET SiC commerciale, che oggi lavora negli inverter delle auto elettriche.' },
      { year: 2009, title: 'Il GaN al posto del MOSFET', who: 'Efficient Power Conversion (EPC), El Segundo (California)', text: 'EPC, fondata nel 2007 da Alex Lidow, coinventore dell\'HEXFET, annuncia i primi transistor al nitruro di gallio su silicio ad arricchimento pensati per la conversione di potenza, a catalogo dal 2010. Commutano in pochi nanosecondi e aprono la strada ai convertitori da MHz. Transistor GaN per radiofrequenza esistevano già da metà anni 2000.' },
      { year: 2018, title: 'I caricatori al GaN', who: 'Anker e altri marchi di accessori', text: 'Arrivano i primi caricatori USB-C con transistor GaN, tra cui l\'Anker PowerPort Atom PD 1 annunciato al CES 2018: commutando più in fretta, a parità di potenza usano trasformatori e condensatori più piccoli. Tra il 2019 e il 2021 diventano comuni, e nel 2021 anche Apple adotta il GaN nell\'alimentatore da 140 W.' },
    ],
    fun: 'Già negli anni \'30 le autoradio a valvole avevano un convertitore a commutazione meccanico, il <em>vibratore</em>: una lamella apriva e chiudeva un contatto più di cento volte al secondo per ricavare dai 6 V della batteria le alte tensioni che servivano alle valvole. Si sentiva ronzare. I transistor di oggi fanno lo stesso lavoro migliaia di volte più in fretta, ben oltre la soglia dell\'udito.',
    uses: [
      'Caricatori USB-C, sempre più spesso al GaN',
      'Regolatori multifase di CPU e GPU, da 12 V a circa 1 V',
      'Decine di piccoli buck e boost dentro ogni telefono',
      'Inverter per motori: lavatrici, condizionatori, pompe di calore',
      'Auto elettriche: inverter di trazione in SiC e ricarica rapida',
      'Inverter fotovoltaici con inseguimento della massima potenza',
      'Collegamenti HVDC e driver delle lampade LED',
    ],
    glossary: [
      { term: 'PWM e duty cycle', def: 'Modulazione di larghezza d\'impulso: l\'interruttore commuta a frequenza fissa e si regola quanto dura la fase di accensione. Il duty cycle <var>D</var> = <var>t</var><sub>on</sub>/<var>T</var> è la frazione di periodo in cui l\'interruttore è chiuso.' },
      { term: 'Nodo di commutazione', def: 'Il punto in cui si incontrano interruttore, diodo e bobina. La sua tensione salta tra circa <var>V</var><sub>in</sub> e circa 0 V: un\'onda quadra che bobina e condensatore trasformano in una tensione quasi continua.' },
      { term: 'Ripple', def: 'L\'ondulazione che resta sopra i valori medi: il triangolo della corrente nella bobina (Δ<var>I</var><sub>L</sub>) e la piccola oscillazione della tensione d\'uscita (Δ<var>V</var>).' },
      { term: 'Diodo di ricircolo e raddrizzamento sincrono', def: 'Quando l\'interruttore si apre, il diodo offre alla bobina una strada per continuare a far scorrere la corrente. Nel raddrizzamento sincrono lo sostituisce un secondo MOSFET comandato, con una caduta molto minore; un brevissimo tempo morto evita che i due siano chiusi insieme.' },
      { term: 'Conduzione continua e discontinua', def: 'In CCM la corrente nella bobina non si annulla mai e <var>V</var><sub>out</sub> ≈ <var>D</var>·<var>V</var><sub>in</sub>. Con carichi leggeri (corrente media minore di Δ<var>I</var><sub>L</sub>/2) la corrente tocca zero a ogni ciclo (DCM) e l\'uscita dipende anche da carico, <var>L</var> e frequenza.' },
      { term: 'Inverter', def: 'Convertitore che ricava una tensione alternata da una continua: i transistor commutano da qualche kHz a una ventina di kHz, con un duty cycle che varia in modo sinusoidale. Muove i motori a velocità variabile e porta in rete l\'energia dei pannelli fotovoltaici.' },
      { term: 'SiC e GaN', def: 'Semiconduttori ad ampia banda proibita (circa 3,3 eV contro 1,12 del silicio): reggono campi elettrici circa dieci volte più intensi, quindi a parità di tensione hanno meno resistenza e capacità e commutano più in fretta. Il SiC serve alle alte tensioni, il GaN alle alte frequenze fino a circa 650 V.' },
    ],
    sources: [
      { title: 'Texas Instruments, Basic Calculation of a Buck Converter\'s Power Stage (SLVA477B)', url: 'https://www.ti.com/lit/an/slva477b/slva477b.pdf' },
      { title: 'Ken Shirriff, Apple didn\'t revolutionize power supplies; new transistors did (2012)', url: 'https://www.righto.com/2012/02/apple-didnt-revolutionize-power.html' },
      { title: 'Mercury-arc valve (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Mercury-arc_valve' },
      { title: 'Thyristor (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Thyristor' },
      { title: 'Power MOSFET (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Power_MOSFET' },
      { title: 'Insulated-gate bipolar transistor (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Insulated-gate_bipolar_transistor' },
      { title: 'Wide-bandgap semiconductor (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Wide-bandgap_semiconductor' },
      { title: 'USB Implementers Forum, USB Charger e USB Power Delivery', url: 'https://www.usb.org/usb-charger-pd' },
    ],
    hero: {
      caption: 'Le particelle luminose sono la corrente: corrono più veloci dove ne passa di più. Le tracce seguono l\'interruttore in sincronia, con il tempo rallentato circa un milione di volte.',
      label: 'Animazione: un convertitore buck che porta 12 V a 5 V per una presa USB',
      aspect: '16 / 7',
      aspectMobile: '2 / 3',
      mount: mountHero,
    },
    lab: {
      title: 'Banco di prova del convertitore buck',
      intro: 'Regola tensione d\'ingresso, duty cycle, frequenza, bobina e carico: guarda il triangolo della corrente, il ripple e dove finisce l\'energia. Poi cambia interruttore e ramo di ricircolo e confronta con un regolatore lineare. Il condensatore d\'uscita è fisso a 22 µF e i componenti hanno valori indicativi.',
      layout: 'stack',
      mount: mountLab,
    },
    quiz: [
      { id: 'ea-potenza-01', chapter: 'potenza', level: 1, topic: 'Regolatore lineare', q: 'Un regolatore lineare porta 12 V a 5 V con una corrente di 2 A. Quanta potenza diventa calore nel regolatore?', options: ['14 W', '10 W', '7 W', '24 W'], answer: 0, why: 'Nel lineare la corrente che entra è la stessa che esce, quindi il regolatore dissipa (12 − 5) V × 2 A = 14 W. Dei 24 W assorbiti dalla batteria solo 10 W arrivano al carico: il rendimento è 5/12, cioè il 41,7%.' },
      { id: 'ea-potenza-02', chapter: 'potenza', level: 2, topic: 'Duty cycle del buck', q: 'Un buck ideale in conduzione continua è alimentato a 12 V. Quale duty cycle serve per ottenere 3,3 V in uscita?', options: ['27,5%', '41,7%', '72,5%', '36,4%'], answer: 0, why: 'Nel buck ideale Vout = D·Vin, quindi D = 3,3/12 = 0,275. Con il 41,7% si ottengono 5 V; il 72,5% è la frazione di periodo in cui l\'interruttore resta aperto.' },
      { id: 'ea-potenza-03', chapter: 'potenza', level: 2, topic: 'Diodo di ricircolo', q: 'Perché in un convertitore buck serve il diodo di ricircolo, o un secondo MOSFET al suo posto?', options: ['Dà una strada alla corrente della bobina quando il MOSFET si apre', 'Impedisce al condensatore d\'uscita di scaricarsi verso la batteria', 'Fa cadere i volt in più, come il transistor di un regolatore lineare', 'Raddrizza la tensione alternata prima che arrivi al carico'], answer: 0, why: 'La corrente in una bobina non può interrompersi di colpo: v = L·di/dt. Senza un percorso, all\'apertura dell\'interruttore la bobina produrrebbe una sovratensione capace di distruggere il transistor. Il diodo non fa cadere tensione come un lineare e nel buck non c\'è un\'alternata da raddrizzare: serve a far ricircolare la corrente.' },
      { id: 'ea-potenza-04', chapter: 'potenza', level: 3, topic: 'GaN e frequenza', q: 'Perché con i transistor al nitruro di gallio (GaN) un convertitore può lavorare a frequenze più alte che con i MOSFET al silicio?', options: ['Commutano in pochi nanosecondi: ogni fronte spreca meno energia', 'La loro resistenza in conduzione è praticamente nulla a ogni frequenza', 'Non hanno bisogno né della bobina né del condensatore d\'uscita', 'Reggono tensioni molto più alte dei MOSFET al carburo di silicio'], answer: 0, why: 'Le perdite di commutazione valgono circa ½·Vin·I·(tr + tf)·fsw: crescono con la frequenza e con la durata dei fronti. A 12 V, 2 A e 2 MHz un MOSFET al silicio da 20 ns perde circa 0,48 W, un GaN da 3 ns circa 0,07 W. Così si può alzare la frequenza e usare bobine e condensatori più piccoli.' },
    ],
    model,
  });
})(typeof window !== 'undefined' ? window : globalThis);
