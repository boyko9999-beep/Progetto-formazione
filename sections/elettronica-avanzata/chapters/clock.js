/*
 * Capitolo 6 · Il battito del tempo (quarzo, oscillatori e PLL).
 * Animazione in due atti. Atto 1: un diapason di quarzo vibra e si carica (effetto piezoelettrico),
 * l'oscillatore di Pierce lo tiene in vibrazione e 15 divisori per 2 portano 32 768 Hz a 1 Hz.
 * Atto 2: un anello ad aggancio di fase (PLL) allinea due fasori e moltiplica la frequenza per N.
 * Laboratorio: PLL con fasori, transitorio di aggancio del VCO e fronti delle onde.
 */
(function (root) {
  'use strict';

  const EA = root.EA;
  const TAU = Math.PI * 2;

  /* ---------- modello ---------- */

  const WATCH_HZ = 32768;

  // Frequenza dopo k divisori per 2 e lungo una catena di n divisori: [f0, f0/2, …, f0/2^n].
  const divide = (f0, k) => f0 / Math.pow(2, k);
  const chain = (f0, n) => Array.from({ length: n + 1 }, (_, k) => divide(f0, k));
  // Divisori per 2 che servono per arrivare a 1 Hz (un intero se f0 è una potenza di 2).
  const stagesToOneHz = (f0) => Math.log2(f0);

  // Circuito equivalente del quarzo (Butterworth-Van Dyke): ramo L1-C1-R1 in parallelo a C0.
  // CL è la capacità di carico che l'oscillatore presenta al quarzo; tau è la costante di tempo
  // con cui si spegne una vibrazione lasciata a se stessa (ampiezza ridotta a 1/e).
  function crystal(p) {
    const fs = 1 / (TAU * Math.sqrt(p.L1 * p.C1));
    const Q = (TAU * fs * p.L1) / p.R1;
    return {
      fs, Q,
      fp: fs * Math.sqrt(1 + p.C1 / p.C0),
      fL: fs * (1 + p.C1 / (2 * (p.C0 + (p.CL || 0)))),
      bw: fs / Q,
      tau: Q / (Math.PI * fs),
    };
  }

  // Diapason da orologio con valori tipici: C1 = 3 fF, R1 = 35 kΩ, C0 = 1,2 pF;
  // L1 (circa 7,86 kH) è scelta perché la risonanza serie cada a 32 768 Hz.
  const WATCH_XTAL = { C1: 3e-15, R1: 35e3, C0: 1.2e-12, CL: 12.5e-12, L1: 1 / (Math.pow(TAU * WATCH_HZ, 2) * 3e-15) };

  // Risposta di un risonatore (corrente di un RLC serie, normalizzata a 1): vale 1/√2
  // a metà potenza, e i due punti a metà potenza distano esattamente f0/Q.
  const resonance = (f, f0, Q) => 1 / Math.sqrt(1 + Math.pow(Q * (f / f0 - f0 / f), 2));

  // Capacità di carico nel circuito di Pierce: i due condensatori in serie più le parassite.
  const loadCap = (CA, CB, Cpar) => (CA * CB) / (CA + CB) + (Cpar || 0);

  // Errore di un orologio: 1 ppm = 86 400 s × 10⁻⁶ = 0,0864 s al giorno.
  const ppmToSecondsPerDay = (ppm) => ppm * 0.0864;

  // PLL: uscita, aumento del rumore di fase (dB) e jitter corrispondente a una fase rms.
  const pllOut = (fref, N) => N * fref;
  const noisePenalty = (N) => 20 * Math.log10(N);
  const jitter = (sigmaPhi, f0) => sigmaPhi / (TAU * f0);

  // Banda dell'anello dal cursore u (0 = lento e stabile, 1 = veloce e nervoso):
  // fn da fref/1000 a fref/20 su scala logaritmica, smorzamento ζ da 1,2 a 0,3.
  function loopParams(fref, u) {
    const k = EA.clamp(u, 0, 1);
    const fn = fref * Math.pow(10, -3 + k * Math.log10(50));
    return { fn, wn: TAU * fn, zeta: 1.2 - 0.9 * k };
  }

  // Velocità (1/s) con cui si spegne il modo più lento, e stima classica del tempo di aggancio.
  const decayRate = (zeta, wn) => (zeta < 1 ? zeta * wn : (zeta - Math.sqrt(zeta * zeta - 1)) * wn);
  const lockEstimate = (zeta, wn) => 4 / (zeta * wn);

  // Sovraelongazione della frequenza del VCO dopo un salto di frequenza (anello di tipo 2,
  // filtro PI): M = exp(−2ζ·arccos ζ / √(1 − ζ²)), prolungata con continuità per ζ ≥ 1.
  function overshoot(zeta) {
    if (Math.abs(zeta - 1) < 1e-6) return Math.exp(-2);
    if (zeta < 1) return Math.exp((-2 * zeta * Math.acos(zeta)) / Math.sqrt(1 - zeta * zeta));
    return Math.exp((-2 * zeta * Math.acosh(zeta)) / Math.sqrt(zeta * zeta - 1));
  }

  // Evoluzione esatta, su un intervallo dt, dello stato lineare dell'anello (e, x):
  // e' = x − 2ζωn·e (errore di fase), x' = −ωn²·e (scarto di pulsazione del ramo integrale).
  // e^{A·dt} = c·I + s·(A + ζωn·I), con c = e^{−ζωn·dt}·cosh r, s = e^{−ζωn·dt}·dt·sinh r / r e
  // r² = (ζ² − 1)(ωn·dt)²: coseno e seno se r² < 0, serie di Taylor attorno allo smorzamento critico.
  function propagator(zeta, wn, dt) {
    const ex = Math.exp(-zeta * wn * dt);
    const y = (zeta * zeta - 1) * wn * wn * dt * dt;
    const r = Math.sqrt(Math.abs(y));
    let c = ex * (1 + y / 2);
    let s = ex * dt * (1 + y / 6);
    if (y > 1e-6) { c = ex * Math.cosh(r); s = (ex * dt * Math.sinh(r)) / r; }
    else if (y < -1e-6) { c = ex * Math.cos(r); s = (ex * dt * Math.sin(r)) / r; }
    return [c - zeta * wn * s, s, -wn * wn * s, c + zeta * wn * s];
  }

  // Risposte in forma chiusa: errore di fase dopo un salto di fase (per radiante di salto),
  // errore dopo un salto di frequenza (per rad/s di salto) e frazione del salto già percorsa dal VCO.
  const phaseStep = (zeta, wn, t) => propagator(zeta, wn, t)[0];
  const freqStep = (zeta, wn, t) => propagator(zeta, wn, t)[1];
  const vcoStep = (zeta, wn, t) => 1 - propagator(zeta, wn, t)[0];

  const LOCK_RAD = (5 * Math.PI) / 180; // agganciato: errore sotto 5° da lì in poi
  const SLEW = 40; // oltre 40·ωn di scarto i giri persi si trattano in media

  // Frequenza istantanea del VCO (Hz): ramo integrale più ramo proporzionale del filtro.
  const vcoFreq = (s, p) => (p.N * (TAU * p.fref - s.x + 2 * p.zeta * p.wn * s.e)) / TAU;

  // Avanza di T secondi lo stato s = { e, x, u, t } con i parametri p = { fref, N, wn, zeta }.
  // e: errore letto dal rivelatore di fase e frequenza (PFD), lineare entro ±2π; oltre, il PFD
  //    perde un giro (cycle slip) e riparte da capo;
  // x: scarto di pulsazione tra riferimento e VCO diviso, ramo integrale (rad/s);
  // u: errore di fase vero, giri persi compresi (rad). each(s, slip) dopo ogni passo.
  function advance(s, p, T, each) {
    const kp = 2 * p.zeta * p.wn;
    const ki = p.wn * p.wn;
    const dt0 = TAU / p.wn / 64;
    const cache = p.cache || (p.cache = []);
    let left = T;
    for (let guard = 0; left > T * 1e-9 && guard < 1e6; guard++) {
      const x = s.x;
      if (Math.abs(x) > SLEW * p.wn) {
        // Frequenze lontane: il PFD dà in media ±π e il VCO scorre a velocità costante.
        const sg = Math.sign(x);
        const reach = (Math.abs(x) - SLEW * p.wn) / (Math.PI * ki);
        const dt = Math.min(left, Math.max(reach, dt0 / 64));
        s.u += x * dt - sg * Math.PI * (ki * dt * dt / 2 + kp * dt);
        s.x = x - sg * Math.PI * ki * dt;
        s.e = sg * ((((sg * s.u) % TAU) + TAU) % TAU);
        s.t += dt;
        left -= dt;
        each(s, true);
      } else if (Math.abs(s.e) + Math.abs(x) / p.wn < LOCK_RAD / 2) {
        // Quasi agganciato: con ζ tra 0,3 e 1,2 vale |e(t)| ≤ |e| + |x|/ωn, quindi l'errore non può
        // più arrivare a 5° né perdere giri e basta un solo passo esatto.
        const m = propagator(p.zeta, p.wn, left);
        const e1 = m[0] * s.e + m[1] * x;
        s.x = m[2] * s.e + m[3] * x;
        s.u += e1 - s.e;
        s.e = e1;
        s.t += left;
        left = 0;
        each(s, false);
      } else {
        // Passo esatto, abbastanza corto da non scavalcare un giro del rivelatore.
        const rate = Math.abs(x) + kp * Math.abs(s.e) + p.wn;
        let lvl = -4;
        while (lvl < 30 && dt0 * Math.pow(2, -lvl) * rate > Math.PI / 8) lvl++;
        let dt = dt0 * Math.pow(2, -lvl);
        let m = cache[lvl + 4];
        if (dt >= left) { dt = left; m = propagator(p.zeta, p.wn, dt); }
        else if (!m) m = cache[lvl + 4] = propagator(p.zeta, p.wn, dt);
        const e1 = m[0] * s.e + m[1] * x;
        s.x = m[2] * s.e + m[3] * x;
        s.u += e1 - s.e;
        const slip = Math.abs(e1) > TAU;
        s.e = slip ? e1 - Math.sign(e1) * TAU : e1;
        s.t += dt;
        left -= dt;
        each(s, slip);
      }
    }
    return s;
  }

  // Arrotonda per eccesso alla scala 1-2-5 (finestre di tempo leggibili).
  function niceCeil(v) {
    const e = Math.pow(10, Math.floor(Math.log10(v)));
    const m = v / e;
    return (m <= 1.0001 ? 1 : m <= 2.0001 ? 2 : m <= 5.0001 ? 5 : 10) * e;
  }

  // Transitorio dell'anello dallo stato iniziale { e, x, u } con i parametri { fref, N, wn, zeta }.
  // Restituisce la traccia campionata su una finestra che contiene l'aggancio e il tempo di
  // aggancio: l'ultimo istante con |errore| ≥ 5° o con un giro perso (0 se non si sgancia mai).
  // Durante i giri persi la frequenza registrata è quella media. Tutto deterministico.
  function simulate(o) {
    const p = { fref: o.fref, N: o.N, wn: o.wn, zeta: o.zeta };
    const init = { e: o.e || 0, x: o.x || 0, u: o.u || 0, t: 0 };
    const slow = decayRate(o.zeta, o.wn);
    const hold = (2 * TAU) / o.wn + 1 / slow;
    // limite di sicurezza: la rincorsa a velocità limitata (|x|/(π·ωn²)) con ampio margine
    const maxT = o.maxT || (2 * Math.abs(o.x || 0)) / (Math.PI * o.wn * o.wn) + 100 / slow + 4 * hold;
    const a = Object.assign({}, init);
    let bad = Math.abs(a.e) >= LOCK_RAD ? 0 : -1;
    let pe = Math.abs(a.e);
    let pt = 0;
    // l'istante in cui l'errore rientra sotto 5° si interpola dentro il passo
    const watch = (s, slip) => {
      const ae = Math.abs(s.e);
      if (slip || ae >= LOCK_RAD) bad = s.t;
      else if (pe >= LOCK_RAD) bad = pt + ((s.t - pt) * (pe - LOCK_RAD)) / (pe - ae);
      pe = slip ? TAU : ae;
      pt = s.t;
    };
    for (let guard = 0; a.t - Math.max(bad, 0) < hold && a.t < maxT && guard < 400; guard++) {
      advance(a, p, Math.max(hold / 4, a.t / 8), watch);
    }
    const tLock = Math.max(bad, 0);
    const T = o.T || niceCeil(1.25 * Math.max(tLock, 3 / slow));
    const n = o.samples || 360;
    const kp = 2 * o.zeta * o.wn;
    const out = {
      fref: o.fref, N: o.N, wn: o.wn, zeta: o.zeta,
      T, n, tLock, locked: a.t - tLock >= hold, target: o.N * o.fref,
      f: new Float64Array(n + 1), e: new Float64Array(n + 1), u: new Float64Array(n + 1),
      x: new Float64Array(n + 1), slip: new Uint8Array(n + 1),
    };
    const b = Object.assign({}, init);
    const put = (i, slip) => {
      out.f[i] = slip ? (o.N * (TAU * o.fref - b.x + kp * Math.sign(b.x) * Math.PI)) / TAU : vcoFreq(b, p);
      out.e[i] = b.e;
      out.u[i] = b.u;
      out.x[i] = b.x;
      out.slip[i] = slip ? 1 : 0;
    };
    put(0, false);
    for (let i = 1; i <= n; i++) {
      let slip = false;
      advance(b, p, T / n, (s, sl) => { if (sl) slip = true; });
      put(i, slip);
    }
    return out;
  }

  // Sovraelongazione misurata su una traccia: escursione oltre l'obiettivo, dopo l'ultimo giro
  // perso, divisa per lo scarto iniziale; index = campione del picco (−1 se non c'è).
  function measuredOvershoot(sim) {
    let start = 0;
    for (let i = 0; i <= sim.n; i++) if (sim.slip[i]) start = i + 1;
    const d0 = sim.f[0] - sim.target;
    let best = 0;
    let index = -1;
    if (!d0 || start > sim.n) return { value: 0, index };
    for (let i = start; i <= sim.n; i++) {
      const d = (sim.f[i] - sim.target) * -Math.sign(d0);
      if (d > best) { best = d; index = i; }
    }
    return { value: best / Math.abs(d0), index };
  }

  // Cambio di fref o di N con l'anello in moto: la frequenza del VCO (ramo integrale) non salta,
  // quindi cambia lo scarto visto dal rivelatore.
  function retune(s, from, to) {
    const fc = (from.N * (TAU * from.fref - s.x)) / TAU;
    return { e: s.e, x: TAU * to.fref - (TAU * fc) / to.N, u: s.u, t: 0 };
  }

  // Disturbi del laboratorio: il riferimento salta avanti di 90°, oppure un colpo abbassa
  // di colpo dell'1 % la frequenza del VCO.
  function disturb(s, p, kind) {
    if (kind === 'fase') return { e: s.e + Math.PI / 2, x: s.x, u: s.u + Math.PI / 2, t: 0 };
    return { e: s.e, x: s.x + 0.01 * (TAU * p.fref - s.x), u: s.u, t: 0 };
  }

  const model = {
    WATCH_HZ, WATCH_XTAL, LOCK_RAD,
    divide, chain, stagesToOneHz, crystal, resonance, loadCap, ppmToSecondsPerDay,
    pllOut, noisePenalty, jitter, loopParams, decayRate, lockEstimate, overshoot,
    propagator, phaseStep, freqStep, vcoStep, vcoFreq, advance, niceCeil, simulate,
    measuredOvershoot, retune, disturb,
  };

  /* ---------- aiuti di disegno ---------- */

  const C = EA.colors;
  const TINT = C.orange; // il clock principale
  const QUARTZ = '#d6e6f0';
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const NB = ' ';
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const txt = (ctx, s, x, y, o) => EA.draw.text(ctx, s, x, y, o);
  const sup = (n) => String(n).split('').map((d) => SUP[+d]).join('');
  const wrapAngle = (a) => a - TAU * Math.round(a / TAU);
  // Angolo in gradi con segno e un decimale; lo zero arrotondato resta senza segno.
  function deg(a) {
    const v = Math.round((a * 1800) / Math.PI) / 10;
    return (v > 0 ? '+' : '') + EA.fmt(v || 0, 1) + '°';
  }

  // Interi con lo spazio delle migliaia (32 768); fino a quattro cifre senza.
  function grp(n) {
    const s = String(Math.round(n));
    return s.length > 4 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, NB) : s;
  }

  function textW(ctx, s, size, weight) {
    ctx.save();
    ctx.font = (weight || 600) + ' ' + (size || 11) + 'px ' + MONO;
    const w = ctx.measureText(s).width;
    ctx.restore();
    return w;
  }

  // Spezza un testo in righe larghe al massimo maxW pixel.
  function wrapText(ctx, s, maxW, size) {
    const lines = [];
    let cur = '';
    for (const word of s.split(' ')) {
      const test = cur ? cur + ' ' + word : word;
      if (cur && textW(ctx, test, size) > maxW) { lines.push(cur); cur = word; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // «÷ n» centrato in x con il segno disegnato a mano: a 10-11 px il carattere ÷ sembra un +.
  function divLabel(ctx, x, y, n, color, size) {
    const sz = size || 10.5;
    const s = sz * 0.36;
    const x0 = x - (2 * s + 3 + textW(ctx, String(n), sz, 700)) / 2;
    const yc = y - sz * 0.36;
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(x0, yc - 0.7, 2 * s, 1.4);
    [-1, 1].forEach((k) => { ctx.beginPath(); ctx.arc(x0 + s, yc + k * s * 0.85, 1.25, 0, TAU); ctx.fill(); });
    ctx.restore();
    txt(ctx, String(n), x0 + 2 * s + 3, y, { color, size: sz, weight: 700 });
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  // Riquadro scuro con bordo, come gli inserti degli strumenti.
  function panel(ctx, r, stroke) {
    ctx.save();
    rr(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = EA.alpha('#060b0a', 0.88);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = stroke || C.grid;
    ctx.stroke();
    ctx.restore();
  }

  function poly(ctx, pts, color, width, dash) {
    ctx.save();
    if (dash) ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    ctx.restore();
  }

  // Etichetta a pillola (stato dell'anello).
  function chip(ctx, x, y, label, color, align) {
    const w = textW(ctx, label, 10.5, 700) + 18;
    const x0 = align === 'right' ? x - w : x;
    ctx.save();
    rr(ctx, x0, y - 13, w, 20, 10);
    ctx.fillStyle = EA.alpha(color, 0.14);
    ctx.fill();
    ctx.strokeStyle = EA.alpha(color, 0.75);
    ctx.stroke();
    ctx.restore();
    txt(ctx, label, x0 + 9, y + 1, { color, size: 10.5, weight: 700 });
    return w;
  }

  // Punti di un'onda quadra tra x0 e x1: P pixel per ciclo, fase c0 (in cicli) in x0;
  // livello alto nella prima metà di ogni ciclo.
  function squarePts(x0, x1, P, c0, yHi, yLo) {
    const pts = [];
    let hi = ((c0 % 1) + 1) % 1 < 0.5;
    pts.push([x0, hi ? yHi : yLo]);
    let next = Math.floor(c0 * 2 + 1e-9) / 2 + 0.5;
    for (let guard = 0; guard < 4000; guard++) {
      const xe = x0 + (next - c0) * P;
      if (xe >= x1) break;
      pts.push([xe, hi ? yHi : yLo]);
      hi = !hi;
      pts.push([xe, hi ? yHi : yLo]);
      next += 0.5;
    }
    pts.push([x1, hi ? yHi : yLo]);
    return pts;
  }

  // Simboli circuitali, disegnati su un filo orizzontale (o verticale per i condensatori a massa).
  function coil(ctx, x0, x1, y, color) {
    const n = 4;
    const r = (x1 - x0) / (2 * n);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    for (let i = 0; i < n; i++) ctx.arc(x0 + r * (2 * i + 1), y, r, Math.PI, 0);
    ctx.stroke();
    ctx.restore();
  }

  function resistor(ctx, x0, x1, y, color) {
    const pts = [[x0, y]];
    for (let i = 1; i < 8; i++) pts.push([x0 + ((x1 - x0) * i) / 8, y + (i % 2 ? -4.5 : 4.5)]);
    pts.push([x1, y]);
    poly(ctx, pts, color, 1.6);
  }

  function capacitor(ctx, x, y, color, vertical) {
    const a = 3.5;
    const b = 9;
    if (vertical) {
      poly(ctx, [[x - b, y - a], [x + b, y - a]], color, 2);
      poly(ctx, [[x - b, y + a], [x + b, y + a]], color, 2);
    } else {
      poly(ctx, [[x - a, y - b], [x - a, y + b]], color, 2);
      poly(ctx, [[x + a, y - b], [x + a, y + b]], color, 2);
    }
  }

  function crystalSym(ctx, x, y, color, fill) {
    ctx.save();
    ctx.fillStyle = fill || EA.alpha(QUARTZ, 0.14);
    ctx.fillRect(x - 5, y - 10, 10, 20);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(x - 5, y - 10, 10, 20);
    ctx.restore();
    poly(ctx, [[x - 9, y - 9], [x - 9, y + 9]], color, 2);
    poly(ctx, [[x + 9, y - 9], [x + 9, y + 9]], color, 2);
  }

  function ground(ctx, x, y, color) {
    [9, 6, 3].forEach((hw, i) => poly(ctx, [[x - hw, y + i * 4], [x + hw, y + i * 4]], color, 1.6));
  }

  // Invertitore CMOS con il pallino in uscita; restituisce le x di ingresso e uscita.
  function inverter(ctx, x, y, s, color, fill) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * 0.85);
    ctx.lineTo(x + s * 0.8, y);
    ctx.lineTo(x - s, y + s * 0.85);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + s * 0.8 + 4, y, 4, 0, TAU);
    ctx.stroke();
    ctx.restore();
    return [x - s, x + s * 0.8 + 8];
  }

  // Punto alla frazione q (0..1) di una spezzata.
  function along(pts, q) {
    const seg = [];
    let tot = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
    let d = (((q % 1) + 1) % 1) * tot;
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i] || i === seg.length - 1) {
        const k = seg[i] ? d / seg[i] : 0;
        return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
      }
      d -= seg[i];
    }
    return pts[0];
  }

  // Quadrante d'orologio, ore 10:10, con la lancetta dei secondi su sec (0 = ore 12).
  function watch(ctx, cx, cy, r, sec, lit) {
    ctx.save();
    ctx.fillStyle = '#0d1513';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = EA.alpha(TINT, lit ? 0.8 : 0.4);
    ctx.stroke();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU;
      const big = i % 5 === 0;
      const r0 = r * (big ? 0.8 : 0.88);
      ctx.strokeStyle = big ? C.text : EA.alpha(C.dim, 0.7);
      ctx.lineWidth = big ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0);
      ctx.lineTo(cx + Math.sin(a) * r * 0.94, cy - Math.cos(a) * r * 0.94);
      ctx.stroke();
    }
    const hand = (a, len, w, col) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - Math.sin(a) * len * 0.14, cy + Math.cos(a) * len * 0.14);
      ctx.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len);
      ctx.stroke();
    };
    hand(((10 + 10 / 60) / 12) * TAU, r * 0.5, 3.4, C.text);
    hand((10 / 60) * TAU, r * 0.72, 2.4, C.text);
    ctx.shadowColor = EA.alpha(TINT, 0.8);
    ctx.shadowBlur = lit ? 10 : 0;
    hand((sec / 60) * TAU, r * 0.86, 1.8, TINT);
    ctx.shadowBlur = 0;
    ctx.fillStyle = TINT;
    ctx.beginPath(); ctx.arc(cx, cy, 3.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Quadrante dei fasori: riferimento (ciano) all'angolo ang e VCO diviso N (tinta) in ritardo
  // di err; lo spicchio ambra è l'errore di fase. ghost: angolo di un fasore tratteggiato.
  function phasorDial(ctx, cx, cy, r, ang, err, ghost) {
    ctx.save();
    ctx.fillStyle = '#09110f';
    ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const r0 = r * (i % 6 ? 0.94 : 0.86);
      ctx.moveTo(cx + Math.cos(a) * r0, cy - Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r, cy - Math.sin(a) * r);
    }
    ctx.stroke();
    ctx.restore();
    const tip = (a, len) => [cx + Math.cos(a) * len, cy - Math.sin(a) * len];
    if (ghost != null) {
      const [gx, gy] = tip(ghost, r * 0.8);
      poly(ctx, [[cx, cy], [gx, gy]], EA.alpha(TINT, 0.5), 1.6, [4, 4]);
    }
    const a2 = ang - err;
    if (Math.abs(err) > 0.03) {
      ctx.save();
      ctx.fillStyle = EA.alpha(C.amber, 0.16);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r * 0.6, -a2, -ang, err > 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = C.amber;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.6, -a2, -ang, err > 0);
      ctx.stroke();
      ctx.restore();
    }
    const [xr, yr] = tip(ang, r * 0.94);
    EA.draw.arrow(ctx, cx, cy, xr, yr, C.cyan, 2.6, 10);
    const [xv, yv] = tip(a2, r * 0.78);
    EA.draw.arrow(ctx, cx, cy, xv, yv, TINT, 2.6, 10);
    EA.draw.dot(ctx, cx, cy, 3, C.ink, false);
  }

  // Schema a blocchi del PLL nel riquadro D: quarzo → rivelatore di fase → filtro → VCO,
  // con il divisore per N in retroazione. o: { compact, hot ('pll' | 'mult'), err, tt, N, fref, fout }.
  function loopDiagram(ctx, D, o) {
    const compact = o.compact;
    const yM = D.y + D.h * (compact ? 0.3 : 0.32);
    const yF = D.y + D.h * (compact ? 0.8 : 0.76);
    const bw = compact ? Math.min(62, D.w * 0.19) : Math.min(98, D.w * 0.145);
    const bh = compact ? 30 : 46;
    const xS = D.x + (compact ? 9 : 16);
    const xP = D.x + D.w * 0.27;
    const xL = D.x + D.w * 0.52;
    const xV = D.x + D.w * 0.77;
    const xO = D.x + D.w - 2;
    const xT = xV + bw / 2 + (xO - xV - bw / 2) * 0.42;
    const errK = EA.clamp(Math.abs(o.err || 0) / 0.8, 0, 1);
    const hotPll = o.hot === 'pll';
    const hotMult = o.hot === 'mult';
    const cErr = EA.alpha(C.amber, hotPll ? 0.35 + 0.65 * errK : 0.45);
    const cClk = hotMult ? TINT : EA.alpha(TINT, 0.75);
    // fili e frecce
    const ref = [[xS + 10, yM], [xP - bw / 2, yM]];
    const e1 = [[xP + bw / 2, yM], [xL - bw / 2, yM]];
    const e2 = [[xL + bw / 2, yM], [xV - bw / 2, yM]];
    const out = [[xV + bw / 2, yM], [xO, yM]];
    const fb1 = [[xT, yM], [xT, yF], [xL + bw / 2, yF]];
    const fb2 = [[xL - bw / 2, yF], [xP, yF], [xP, yM + bh / 2]];
    poly(ctx, ref, C.cyan, 1.8);
    poly(ctx, e1, cErr, 1.8);
    poly(ctx, e2, cErr, 1.8);
    poly(ctx, out, cClk, 2);
    poly(ctx, fb1, cClk, 1.8);
    poly(ctx, fb2, cClk, 1.8);
    // solo la punta: il filo è già disegnato e non deve raddoppiare la trasparenza
    const head = (pts, col) => {
      const a = pts[pts.length - 2];
      const b = pts[pts.length - 1];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      EA.draw.arrow(ctx, b[0] - ((b[0] - a[0]) / l) * 2, b[1] - ((b[1] - a[1]) / l) * 2, b[0], b[1], col, 1.8, 8);
    };
    head(ref, C.cyan);
    head(e1, cErr);
    head(e2, cErr);
    head(out, cClk);
    head(fb1, cClk);
    head(fb2, cClk);
    EA.draw.dot(ctx, xT, yM, 3, cClk, false);
    // segnali che scorrono lungo l'anello
    if (o.tt != null) {
      const q = (o.tt * 0.5) % 1;
      [[ref, C.cyan], [e1, C.amber], [e2, C.amber], [out, TINT], [fb1, TINT], [fb2, TINT]].forEach(([pts, col]) => {
        const p = along(pts, q);
        EA.draw.dot(ctx, p[0], p[1], 2.4, col);
      });
    }
    // blocchi
    const block = (x, y, lines, col, glow) => {
      ctx.save();
      if (glow) { ctx.shadowColor = col; ctx.shadowBlur = 14; }
      rr(ctx, x - bw / 2, y - bh / 2, bw, bh, 8);
      ctx.fillStyle = '#0d1714';
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
      lines.forEach((l, i) => txt(ctx, l, x, y + 4 + (i - (lines.length - 1) / 2) * 13, { color: C.ink, size: compact ? 10.5 : 11, weight: 700, align: 'center' }));
    };
    block(xP, yM, compact ? ['PFD'] : ['rivelatore', 'di fase'], hotPll ? EA.alpha(C.amber, 0.45 + 0.55 * errK) : C.grid, hotPll && errK > 0.2);
    block(xL, yM, compact ? ['filtro'] : ['filtro', 'd\'anello'], hotPll ? EA.alpha(C.amber, 0.6) : C.grid, false);
    block(xV, yM, ['VCO'], hotMult ? TINT : EA.alpha(TINT, 0.6), hotMult);
    block(xL, yF, [], hotMult ? TINT : EA.alpha(TINT, 0.6), hotMult);
    divLabel(ctx, xL, yF + 4, o.N, C.ink, compact ? 10.5 : 11);
    // sorgente: il quarzo di riferimento
    crystalSym(ctx, xS, yM, C.cyan);
    const lab = { size: 10.5, align: 'center' };
    const sx = compact ? D.x : xS + 4; // nello schema compatto le etichette partono dal bordo
    const sl = { size: 10.5, align: compact ? 'left' : 'center' };
    txt(ctx, compact ? 'fref' : 'quarzo', sx, yM + (compact ? 25 : 27), Object.assign({ color: C.cyan }, sl));
    if (o.fref) txt(ctx, EA.si(o.fref, 'Hz'), sx, yM + (compact ? 38 : 40), Object.assign({ color: C.dim }, sl));
    if (o.fout) txt(ctx, EA.si(o.fout, 'Hz', 4), xV, yM + bh / 2 + 15, Object.assign({ color: TINT, weight: 700 }, lab));
    if (!compact) {
      // etichette dei fili, solo se stanno tra i due blocchi
      const wire = (s, xa, xb, y, color) => { if (textW(ctx, s, 10.5) + 4 <= xb - xa) txt(ctx, s, (xa + xb) / 2, y, Object.assign({ color }, lab)); };
      wire('errore', xP + bw / 2, xL - bw / 2, yM - 9, C.amber);
      wire('tensione', xL + bw / 2, xV - bw / 2, yM - 9, C.amber);
      wire('fref', xS + 12, xP - bw / 2, yM - 9, C.cyan);
      wire('fout', xT + 4, xO, yM - 9, TINT);
      wire('fout' + NB + '/' + NB + 'N', xP, xL - bw / 2, yF - 9, TINT);
    }
    return { yM, yF, bh };
  }

  /* ---------- animazione principale ---------- */

  const STAGES = [
    { key: 'quarzo', dur: 9, act: 0, title: 'Il quarzo vibra', sub: 'piegato, il cristallo si carica sulle facce: è l\'effetto piezoelettrico (qui rallentato 32' + NB + '768 volte)' },
    { key: 'pierce', dur: 10, act: 0, title: 'L\'oscillatore lo tiene in vibrazione', sub: 'a ogni ciclo l\'invertitore restituisce al quarzo l\'energia persa e squadra la sinusoide' },
    { key: 'divisori', dur: 11, act: 0, title: 'Quindici volte diviso due', sub: '32' + NB + '768 = 2¹⁵: ogni flip-flop dimezza la frequenza, l\'ultimo dà un impulso al secondo' },
    { key: 'pll', dur: 9, act: 1, title: 'Il PLL insegue la fase', sub: 'il rivelatore confronta i fronti e il filtro corregge il VCO finché l\'errore di fase si annulla' },
    { key: 'moltiplica', dur: 9, act: 1, title: 'Moltiplica per N', sub: 'agganciato, il VCO diviso per N va al passo del riferimento: quindi il VCO è N volte più veloce' },
  ];
  const ACTS = ['ATTO 1 · DAL QUARZO AL SECONDO', 'ATTO 2 · DAL QUARZO AI GIGAHERTZ'];

  // Anello «visivo» dell'atto 2: stesse equazioni del laboratorio, in secondi di animazione.
  const VIS = { zeta: 0.45, wn: TAU * 0.25, e0: (35 * Math.PI) / 180, x0: 4.4, start: 0.5, span: 6.5, rev: 0.2 };
  const visErr = (tau) => { const m = propagator(VIS.zeta, VIS.wn, Math.max(0, tau)); return m[0] * VIS.e0 + m[1] * VIS.x0; };

  // Oscillatore di Pierce nell'atto 1: acceso, spento per un po' (la vibrazione si spegne), riacceso.
  const OFF = 0.8;
  const ON = 4.4;
  const DECAY = 1.1;
  const pierceOn = (t) => t < OFF || t >= ON;
  function pierceAmp(t) {
    if (t < OFF) return 1;
    if (t < ON) return Math.exp(-(t - OFF) / DECAY);
    return 1 - (1 - Math.exp(-(ON - OFF) / DECAY)) * Math.exp(-(t - ON) / 0.45);
  }

  // Divisori: il fronte attiva uno stadio ogni SWD secondi a partire da SW0.
  const SW0 = 0.6;
  const SWD = 0.28;
  const SWEND = SW0 + 15 * SWD;

  function mountHero(view, api) {
    view.classList.add('clock-stage');
    const cv = api.canvas(view, { label: 'Animazione in due atti. Un diapason di quarzo vibra e si carica sulle facce; un invertitore lo tiene in vibrazione; quindici divisori per due portano 32 768 hertz a un impulso al secondo che muove la lancetta. Poi i fasori del riferimento e del VCO diviso per N si allineano mentre un anello ad aggancio di fase si aggancia e moltiplica la frequenza.' });
    const XT = crystal(WATCH_XTAL);
    const FREQ = chain(WATCH_HZ, 15);
    const CL = loadCap(18e-12, 18e-12, 3.5e-12);
    // istante dell'aggancio e escursione dell'errore nell'anello visivo, calcolati una volta
    let tLockVis = 0;
    let E_LO = -LOCK_RAD;
    let E_HI = LOCK_RAD;
    for (let tau = 0; tau <= VIS.span; tau += 0.01) {
      const e = visErr(tau);
      if (Math.abs(e) >= LOCK_RAD) tLockVis = tau;
      E_LO = Math.min(E_LO, e);
      E_HI = Math.max(E_HI, e);
    }
    E_LO -= 0.08;
    E_HI += 0.05;
    let stage = 0;
    let sT = 0;
    const subCache = {};

    function frame() {
      const w = cv.w;
      const hh = cv.h;
      const small = w < 560;
      return { w, hh, small, wide: w / hh > 1.4, pad: small ? 12 : 18 };
    }

    // Titolo della fase, sottotitolo a capo se serve e atto; restituisce dove inizia il disegno.
    function header(ctx, g, i) {
      const S = STAGES[i];
      const ty = g.small ? 21 : 28;
      txt(ctx, (i + 1) + ' · ' + S.title.toUpperCase(), g.pad, ty, { color: C.ink, size: g.small ? 11.5 : 12.5, weight: 700 });
      if (g.w >= 760) txt(ctx, ACTS[S.act], g.w - g.pad, ty, { color: EA.alpha(TINT, 0.9), size: 10.5, weight: 700, align: 'right' });
      const maxW = Math.min(900, g.w - g.pad * 2);
      const key = i + '|' + Math.round(maxW);
      const lines = subCache[key] || (subCache[key] = wrapText(ctx, S.sub, maxW, 11));
      lines.forEach((l, k) => txt(ctx, l, g.pad, ty + 17 + k * 14, { color: C.dim, size: 11 }));
      return ty + 17 + (lines.length - 1) * 14 + (g.small ? 12 : 18);
    }

    /* fase 1: il diapason di quarzo */

    function drawFork(ctx, r, s, g) {
      const cx = r.x + r.w / 2;
      const L = r.h * 0.55;
      const tw = Math.max(12, Math.min(r.w * 0.16, L * 0.17));
      const gap = tw * 1.25;
      const yTip = r.y + r.h * 0.06;
      const yTop = yTip + L;
      const yBase = yTop + r.h * 0.12;
      const d = tw * 0.55 * s;
      const N = 10;
      const P = [[cx - gap / 2 - tw, yBase]];
      for (let k = 0; k <= N; k++) { const q = k / N; P.push([cx - gap / 2 - tw - d * q * q, yTop - q * L]); }
      for (let k = N; k >= 0; k--) { const q = k / N; P.push([cx - gap / 2 - d * q * q, yTop - q * L]); }
      for (let k = 0; k <= N; k++) { const q = k / N; P.push([cx + gap / 2 + d * q * q, yTop - q * L]); }
      for (let k = N; k >= 0; k--) { const q = k / N; P.push([cx + gap / 2 + tw + d * q * q, yTop - q * L]); }
      P.push([cx + gap / 2 + tw, yBase]);
      // supporto e piedini
      const hw = gap / 2 + tw + 8;
      const yH = yBase + r.h * 0.07;
      ctx.save();
      ctx.fillStyle = '#16211e';
      rr(ctx, cx - hw, yBase - 2, hw * 2, yH - yBase + 2, 4);
      ctx.fill();
      ctx.strokeStyle = C.grid;
      ctx.stroke();
      // quarzo
      const grad = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
      grad.addColorStop(0, EA.alpha(QUARTZ, 0.08));
      grad.addColorStop(0.5, EA.alpha(QUARTZ, 0.2));
      grad.addColorStop(1, EA.alpha(QUARTZ, 0.08));
      ctx.beginPath();
      P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = EA.alpha(QUARTZ, 0.6);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
      // elettrodi (pellicole metalliche) e cariche: + sulle facce compresse, − su quelle tese
      const face = (x0, sign, q) => x0 + sign * d * q * q;
      const faces = [[cx - gap / 2 - tw, -1, 1], [cx - gap / 2, -1, -1], [cx + gap / 2, 1, -1], [cx + gap / 2 + tw, 1, 1]];
      faces.forEach(([x0, side, outer]) => {
        const pts = [];
        for (let k = 1; k <= 9; k++) { const q = k / 10; pts.push([face(x0, side, q) - outer * side * 2.5, yTop - q * L]); }
        poly(ctx, pts, EA.alpha(C.amber, 0.7), 2);
      });
      const a = Math.min(1, Math.abs(s) * 1.4);
      if (a > 0.04) {
        const plus = s > 0;
        const glyph = (str, x, y) => txt(ctx, str, x, y + 4, { color: EA.alpha(str === '+' ? C.red : C.blue, a), size: 13, weight: 800, align: 'center' });
        [0.32, 0.52, 0.72, 0.9].forEach((q) => {
          const y = yTop - q * L;
          glyph(plus ? '+' : '−', face(cx - gap / 2 - tw, -1, q) - 9, y);
          glyph(plus ? '+' : '−', face(cx + gap / 2 + tw, 1, q) + 9, y);
          glyph(plus ? '−' : '+', cx, y);
        });
      }
      if (g.wide) {
        txt(ctx, '+ − cariche sulle facce', cx, yH + 22, { color: C.text, size: 10.5, align: 'center' });
        txt(ctx, 'si scambiano a ogni mezza vibrazione', cx, yH + 36, { color: C.dim, size: 10.5, align: 'center' });
      }
      return { cx, yH, pin: tw * 0.5 };
    }

    // Circuito equivalente (Butterworth-Van Dyke) tra i morsetti sx0 e sx1, con i valori del modello.
    function drawBVD(ctx, sx0, sx1, yc, dy) {
      const col = EA.alpha(C.ink, 0.8);
      const xa = sx0 + 10;
      const xb = sx1 - 10;
      const at = (q) => xa + (xb - xa) * q;
      const yT = yc - dy;
      const yB = yc + dy;
      const cC = at(0.5);
      [sx0, sx1].forEach((x) => EA.draw.dot(ctx, x, yc, 3, col, false));
      poly(ctx, [[sx0, yc], [xa, yc]], col);
      poly(ctx, [[xb, yc], [sx1, yc]], col);
      poly(ctx, [[at(0.08), yT], [xa, yT], [xa, yB], [cC - 3.5, yB]], col);
      poly(ctx, [[at(0.9), yT], [xb, yT], [xb, yB], [cC + 3.5, yB]], col);
      poly(ctx, [[at(0.34), yT], [cC - 3.5, yT]], col);
      poly(ctx, [[cC + 3.5, yT], [at(0.64), yT]], col);
      coil(ctx, at(0.08), at(0.34), yT, TINT);
      capacitor(ctx, cC, yT, TINT);
      resistor(ctx, at(0.64), at(0.9), yT, TINT);
      capacitor(ctx, cC, yB, C.text);
      const lab = { size: 10.5, align: 'center' };
      [['L1', EA.si(WATCH_XTAL.L1, 'H', 2), at(0.21)], ['C1', EA.si(WATCH_XTAL.C1, 'F', 2), cC], ['R1', EA.si(WATCH_XTAL.R1, 'Ω', 2), at(0.77)]].forEach(([n, v, x]) => {
        txt(ctx, n, x, yT - 12, Object.assign({ color: C.ink, weight: 700 }, lab));
        txt(ctx, v, x, yT + 20, Object.assign({ color: C.text }, lab));
      });
      txt(ctx, 'C0 = ' + EA.si(WATCH_XTAL.C0, 'F', 2), cC, yB + 20, Object.assign({ color: C.text }, lab));
    }

    // Campana di risonanza del quarzo accanto a quella di un circuito LC alla stessa frequenza.
    function drawBell(ctx, r) {
      panel(ctx, r);
      txt(ctx, 'QUANTO È STRETTA LA RISONANZA', r.x + 12, r.y + 18, { color: C.text, size: 10.5, weight: 700 });
      const x0 = r.x + 14;
      const x1 = r.x + r.w - 14;
      const yA = r.y + 46;
      const yB = r.y + r.h - 28;
      const span = 2; // hertz per lato
      const X = (df) => x0 + ((df + span) / (2 * span)) * (x1 - x0);
      const Y = (a) => yB - a * (yB - yA);
      poly(ctx, [[x0, yB], [x1, yB]], C.grid, 1);
      poly(ctx, [[X(0), yA - 4], [X(0), yB]], EA.alpha(C.text, 0.3), 1, [3, 4]);
      poly(ctx, [[x0, Y(resonance(XT.fs - span, XT.fs, 100))], [x1, Y(resonance(XT.fs + span, XT.fs, 100))]], EA.alpha(C.text, 0.7), 1.4, [5, 4]);
      EA.draw.fn(ctx, x0, x1, (x) => Y(resonance(XT.fs + (((x - x0) / (x1 - x0)) * 2 - 1) * span, XT.fs, XT.Q)), TINT, 2, 1);
      const yh = Y(Math.SQRT1_2);
      const xr = X(XT.bw / 2);
      EA.draw.arrow(ctx, X(0), yh, X(-XT.bw / 2), yh, C.amber, 1.4, 6);
      EA.draw.arrow(ctx, X(0), yh, xr, yh, C.amber, 1.4, 6);
      txt(ctx, EA.fmt(XT.bw, 1) + ' Hz', xr + 6, yh - 5, { color: C.amber, size: 10.5, weight: 700 });
      txt(ctx, 'circuito LC, Q ≈ 100: piatto', x1, yA - 8, { color: C.dim, size: 10.5, align: 'right' });
      txt(ctx, 'quarzo', x0, Y(0.62), { color: TINT, size: 10.5, weight: 700 });
      txt(ctx, 'Q ≈ ' + grp(Math.round(XT.Q / 1000) * 1000), x0, Y(0.62) + 14, { color: TINT, size: 10.5 });
      txt(ctx, '−2 Hz', x0, yB + 15, { color: C.dim, size: 10.5 });
      txt(ctx, 'fs', X(0), yB + 15, { color: C.text, size: 10.5, align: 'center' });
      txt(ctx, '+2 Hz', x1, yB + 15, { color: C.dim, size: 10.5, align: 'right' });
    }

    function sceneQuarzo(ctx, g, R, tt, sT, playing) {
      const s = Math.sin(TAU * tt);
      const show = (a) => (playing ? EA.smooth((sT - a) / 0.7) : 1);
      let fork;
      let scope;
      let big;
      let inset;
      if (g.wide) {
        fork = { x: R.x, y: R.y, w: R.w * 0.24, h: R.h };
        inset = { x: R.x + R.w * 0.7, y: R.y + 2, w: R.w * 0.3, h: R.h - 4 };
        scope = { x: fork.x + fork.w + 40, y: R.y + 2, w: inset.x - fork.x - fork.w - 70, h: R.h * 0.58 };
        big = { x: scope.x, y: scope.y + scope.h + 18, w: scope.w };
      } else {
        fork = { x: R.x, y: R.y, w: R.w * 0.4, h: R.h * 0.62 };
        scope = { x: R.x + R.w * 0.43, y: R.y + 2, w: R.w * 0.57, h: R.h * 0.33 };
        big = { x: scope.x, y: scope.y + scope.h + 10, w: scope.w };
        inset = { x: R.x, y: R.y + R.h * 0.65, w: R.w, h: R.h * 0.35 };
      }
      const F = drawFork(ctx, fork, s, g);
      // fili dal supporto all'ingresso dell'oscilloscopio
      const ym = scope.y + scope.h * 0.58;
      const xw = scope.x - 14;
      [-1, 1].forEach((k) => {
        const x = F.cx + k * F.pin;
        const yb = F.yH + (k < 0 ? 12 : 6);
        poly(ctx, [[x, F.yH], [x, yb], [xw + k * 4, yb], [xw + k * 4, ym + k * 4], [scope.x, ym + k * 4]], EA.alpha(C.text, 0.55), 1.4);
      });
      // oscilloscopio: la tensione segue la flessione; il tempo scorre verso destra, l'ultimo punto è a destra
      panel(ctx, scope);
      txt(ctx, 'TENSIONE SUGLI ELETTRODI', scope.x + 12, scope.y + 18, { color: C.text, size: 10.5, weight: 700 });
      const x0 = scope.x + 16;
      const x1 = scope.x + scope.w - 16;
      const amp = scope.h * 0.27;
      const v = (x1 - x0) / 3;
      if (!g.small) txt(ctx, 'tempo →', x1, scope.y + 18, { color: C.dim, size: 10.5, align: 'right' });
      EA.draw.grid(ctx, x0, ym - amp * 1.3, x1 - x0, amp * 2.6, { cols: g.small ? 4 : 6, rows: 4, ticks: false });
      EA.draw.fn(ctx, x0, x1, (x) => ym - amp * Math.sin(TAU * (tt - (x1 - x) / v)), TINT, 2.2, 2);
      EA.draw.dot(ctx, x1, ym - amp * s, 3.5, C.ink);
      if (!g.small) txt(ctx, 'una vibrazione = ' + EA.si(1 / WATCH_HZ, 's'), x1, scope.y + scope.h - 9, { color: C.dim, size: 10.5, align: 'right' });
      // il numero del capitolo
      ctx.save();
      ctx.globalAlpha *= show(2.2);
      const Q = grp(Math.round(XT.Q / 1000) * 1000);
      if (g.wide) {
        txt(ctx, '32' + NB + '768', big.x, big.y + 28, { color: TINT, size: 30, weight: 800 });
        txt(ctx, 'vibrazioni al secondo', big.x + textW(ctx, '32' + NB + '768', 30, 800) + 12, big.y + 27, { color: C.ink, size: 13, weight: 700 });
        txt(ctx, '= 2¹⁵ · fattore di qualità Q ≈ ' + Q, big.x, big.y + 52, { color: C.text, size: 11 });
        txt(ctx, 'la risonanza è larga solo ' + EA.fmt(XT.bw, 1) + ' Hz', big.x, big.y + 68, { color: C.text, size: 11 });
      } else {
        txt(ctx, '32' + NB + '768', big.x, big.y + 21, { color: TINT, size: 22, weight: 800 });
        txt(ctx, 'vibrazioni al secondo', big.x, big.y + 38, { color: C.ink, size: 10.5, weight: 700 });
        txt(ctx, '= 2¹⁵ · Q ≈ ' + Q, big.x, big.y + 53, { color: C.text, size: 10.5 });
      }
      ctx.restore();
      // il gemello elettrico: circuito equivalente e, se c'è posto, la campana di risonanza
      ctx.save();
      ctx.globalAlpha *= show(4.2);
      panel(ctx, inset);
      txt(ctx, 'IL GEMELLO ELETTRICO', inset.x + 12, inset.y + 19, { color: TINT, size: 10.5, weight: 700 });
      if (g.wide) {
        const yc = inset.y + 84;
        drawBVD(ctx, inset.x + 16, inset.x + inset.w - 16, yc, 28);
        const yl = yc + 74;
        txt(ctx, 'fs = 1/(2π√(L1·C1)) ≈ ' + grp(XT.fs) + ' Hz', inset.x + 14, yl, { color: C.ink, size: 10.5, weight: 700 });
        txt(ctx, 'massa → L1 · elasticità → C1', inset.x + 14, yl + 18, { color: C.dim, size: 10.5 });
        txt(ctx, 'attriti → R1 · elettrodi → C0', inset.x + 14, yl + 33, { color: C.dim, size: 10.5 });
        const bell = { x: inset.x + 10, y: yl + 50, w: inset.w - 20, h: inset.y + inset.h - 10 - (yl + 50) };
        if (bell.h >= 120) drawBell(ctx, bell);
      } else {
        drawBVD(ctx, inset.x + 16, inset.x + inset.w * 0.6, inset.y + inset.h * 0.55, 24);
        const xr = inset.x + inset.w * 0.64;
        ['massa → L1', 'elasticità → C1', 'attriti → R1', 'elettrodi → C0'].forEach((l, i) => txt(ctx, l, xr, inset.y + 40 + i * 15, { color: C.dim, size: 10.5 }));
        txt(ctx, 'fs ≈ ' + grp(XT.fs) + ' Hz', xr, inset.y + 40 + 4 * 15 + 6, { color: C.ink, size: 10.5, weight: 700 });
      }
      ctx.restore();
    }

    /* fase 2: l'oscillatore di Pierce */

    function scenePierce(ctx, g, R, tt, sT, playing) {
      const t = playing ? sT : 9;
      const on = pierceOn(t);
      const roomy = !g.small; // schermo largo o tablet: etichette complete
      const sch = g.wide ? { x: R.x, y: R.y, w: R.w * 0.5, h: R.h } : { x: R.x, y: R.y, w: R.w, h: R.h * 0.5 };
      const sc = g.wide ? { x: R.x + R.w * 0.54, y: R.y + 2, w: R.w * 0.46, h: R.h - 4 } : { x: R.x, y: R.y + R.h * 0.53, w: R.w, h: R.h * 0.47 };
      const xA = sch.x + sch.w * 0.17;
      const xB = sch.x + sch.w * 0.83;
      const xm = (xA + xB) / 2;
      const yI = sch.y + sch.h * (g.wide ? 0.34 : 0.3);
      const yR = sch.y + sch.h * (g.wide ? 0.12 : 0.08);
      const yX = sch.y + sch.h * 0.6;
      const yC = yX + sch.h * (g.wide ? 0.15 : 0.17);
      const ts = g.wide ? 30 : 22;
      const col = EA.alpha(C.ink, 0.8);
      const ampCol = on ? TINT : C.dim;
      // retroazione: Rf sopra, quarzo sotto, condensatori a massa
      poly(ctx, [[xA, yI], [xA, yR], [xm - 24, yR]], col);
      resistor(ctx, xm - 24, xm + 24, yR, col);
      poly(ctx, [[xm + 24, yR], [xB, yR], [xB, yI]], col);
      poly(ctx, [[xA, yI], [xA, yX], [xm - 9, yX]], col);
      poly(ctx, [[xm + 9, yX], [xB, yX], [xB, yI]], col);
      const shake = on || t < ON ? pierceAmp(t) * Math.sin(TAU * tt) * 1.5 : 0;
      crystalSym(ctx, xm + shake, yX, QUARTZ, EA.alpha(TINT, 0.12 + 0.2 * pierceAmp(t)));
      [xA, xB].forEach((x) => {
        poly(ctx, [[x, yX], [x, yC - 3.5]], col);
        capacitor(ctx, x, yC, col, true);
        poly(ctx, [[x, yC + 3.5], [x, yC + 14]], col);
        ground(ctx, x, yC + 14, col);
      });
      const [xi, xo] = inverter(ctx, xm, yI, ts, ampCol, on ? EA.alpha(TINT, 0.12) : '#0d1714');
      poly(ctx, [[xA, yI], [xi, yI]], col);
      poly(ctx, [[xo, yI], [xB, yI]], col);
      const xOut = sch.x + sch.w;
      poly(ctx, [[xB, yI], [xOut - 8, yI]], on ? TINT : col, 1.8);
      EA.draw.arrow(ctx, xOut - 18, yI, xOut, yI, on ? TINT : col, 1.8, 8);
      ctx.save();
      ctx.fillStyle = col;
      [xA, xB].forEach((x) => { ctx.beginPath(); ctx.arc(x, yI, 3.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(x, yX, 3.2, 0, TAU); ctx.fill(); });
      ctx.restore();
      // etichette dello schema
      const lab = { size: 10.5, align: 'center' };
      txt(ctx, 'Rf', xm, yR - 9, Object.assign({ color: C.text }, lab));
      txt(ctx, on ? 'invertitore CMOS' : 'invertitore spento', xm, yI + ts + 12, Object.assign({ color: on ? TINT : C.dim, weight: 700 }, lab));
      txt(ctx, 'quarzo', xm, yX + 24, Object.assign({ color: C.text }, lab));
      txt(ctx, 'CA', xA - 18, yC + 4, Object.assign({ color: C.text }, lab));
      txt(ctx, 'CB', xB + 18, yC + 4, Object.assign({ color: C.text }, lab));
      txt(ctx, 'A', xA - 9, yI - 7, Object.assign({ color: C.dim }, lab));
      txt(ctx, 'B', xB + 9, yI - 7, Object.assign({ color: C.dim }, lab));
      if (roomy) {
        txt(ctx, '180°', xo + 18, yI - 12, Object.assign({ color: C.amber }, lab));
        txt(ctx, '180°', xm + 30, yX - 12, Object.assign({ color: C.amber }, lab));
        txt(ctx, 'invertitore 180° + quarzo e condensatori 180° = un giro in fase', sch.x + sch.w / 2, sch.y + sch.h - 22, Object.assign({ color: C.dim }, lab));
        txt(ctx, 'CL = CA·CB/(CA+CB) + parassite ≈ ' + EA.si(CL, 'F', 3), sch.x + sch.w / 2, sch.y + sch.h - 6, Object.assign({ color: C.dim }, lab));
      }
      // il segnale che percorre l'anello: un giro per ogni oscillazione
      if (on) {
        const loopPts = [[xA, yI], [xB, yI], [xB, yX], [xA, yX], [xA, yI]];
        const p = along(loopPts, tt % 1);
        EA.draw.dot(ctx, p[0], p[1], 3.2, TINT);
      }
      // oscilloscopio: ingresso sinusoidale, uscita squadrata e invertita
      panel(ctx, sc);
      const x0 = sc.x + 14;
      const x1 = sc.x + sc.w - 16;
      const v = (x1 - x0) / 4;
      // due righe uguali tra le etichette, con il messaggio in fondo
      const top = sc.y + 26;
      const avail = sc.y + sc.h - (roomy ? 46 : 30) - top - 20;
      const a1 = avail * 0.17;
      const m1 = top + avail / 4;
      const m2 = top + avail * 0.75 + 20;
      txt(ctx, 'A · INGRESSO: SINUSOIDE', x0, sc.y + 18, { color: C.text, size: 10.5, weight: 700 });
      txt(ctx, 'tempo →', x1, sc.y + 18, { color: C.dim, size: 10.5, align: 'right' });
      txt(ctx, 'B · USCITA: ONDA QUADRA', x0, top + avail / 2 + 14, { color: C.text, size: 10.5, weight: 700 });
      // il presente è a destra: leggendo da sinistra si vede la vibrazione spegnersi e ripartire
      const ago = (x) => t - (x1 - x) / v;
      const ampAt = (x) => (playing ? pierceAmp(ago(x)) : 1);
      const onAt = (x) => (playing ? pierceOn(ago(x)) : true);
      EA.draw.fn(ctx, x0, x1, (x) => m1 - a1 * ampAt(x) * Math.sin(TAU * (tt - (x1 - x) / v)), EA.alpha(TINT, 0.85), 1.8, 2);
      EA.draw.fn(ctx, x0, x1, (x) => m2 + (onAt(x) ? a1 * Math.sign(Math.sin(TAU * (tt - (x1 - x) / v))) : 0), TINT, 2.2, 1);
      EA.draw.dot(ctx, x1, m1 - a1 * ampAt(x1) * Math.sin(TAU * tt), 3.2, C.ink);
      const msg = on ? ['a ogni ciclo l\'invertitore restituisce', 'l\'energia che il quarzo perde in R1'] : ['spento: la vibrazione si spegne da sola', '(dal vero cala a un terzo in circa ' + grp(Math.round(XT.Q / Math.PI / 1000) * 1000) + ' oscillazioni, ' + EA.fmt(XT.tau, 2) + ' s)'];
      const yMsg = sc.y + sc.h - (roomy ? 26 : 22);
      if (roomy) msg.forEach((l, i) => txt(ctx, l, x0, yMsg + i * 15, { color: i ? C.dim : (on ? C.text : C.amber), size: 10.5 }));
      else txt(ctx, on ? 'l\'invertitore reintegra l\'energia persa' : 'spento: la vibrazione si spegne', x0, yMsg + 12, { color: on ? C.text : C.amber, size: 10.5 });
    }

    /* fase 3: la catena di divisori */

    function sceneDivisori(ctx, g, R, sT, playing) {
      const t = playing ? sT : 7.4;
      const active = EA.clamp(Math.floor((t - SW0) / SWD) + 1, 0, 15);
      const kShow = Math.max(1, active);
      // in verticale l'orologio cresce con il riquadro (44 px sul telefono, di più sul tablet)
      const wrTall = Math.max(44, Math.min(R.h * 0.15 - 6, R.w * 0.13));
      const watchW = g.wide ? 230 : 2 * wrTall + 16;
      const strip = g.wide ? { x: R.x, y: R.y + 2, w: R.w - watchW - 24, h: R.h * 0.44 } : { x: R.x, y: R.y, w: R.w - watchW - 8, h: R.h * 0.3 };
      const wr = g.wide ? Math.min(watchW / 2 - 18, R.h * 0.3) : wrTall;
      const wcx = R.x + R.w - watchW / 2 + (g.wide ? 0 : 4);
      const wcy = g.wide ? R.y + R.h * 0.4 : strip.y + strip.h / 2 + 2;
      // contatore in tempo reale: lo stadio k vale il bit k−1 dei cicli del quarzo
      const n = Math.floor(WATCH_HZ * t);
      const bit = (k) => (n >> (k - 1)) & 1;
      // forme d'onda dello stadio attivo: l'uscita cambia a ogni fronte di discesa dell'ingresso
      panel(ctx, strip);
      const sx0 = strip.x + (g.wide ? 150 : 12);
      const sx1 = strip.x + strip.w - 12;
      const P = (sx1 - sx0) / 8;
      const rowH = (strip.h - 30) / 2;
      const yIn = strip.y + 22 + rowH * 0.5;
      const yOut = yIn + rowH + 6;
      const hh = rowH * 0.3;
      const cNow = 2 * t;
      const inPts = squarePts(sx0, sx1, P, cNow - (sx1 - sx0) / P + 0.5, yIn - hh, yIn + hh);
      const outPts = squarePts(sx0, sx1, 2 * P, cNow / 2 - (sx1 - sx0) / (2 * P) + 0.5, yOut - hh, yOut + hh);
      EA.draw.line(ctx, inPts, EA.alpha(TINT, 0.7), 1.6);
      EA.draw.line(ctx, outPts, TINT, 2.2);
      // tacche sui fronti di discesa dell'ingresso
      for (let i = 1; i < inPts.length - 1; i += 2) {
        if (inPts[i][1] < inPts[i + 1][1]) {
          const x = inPts[i][0];
          poly(ctx, [[x, yIn + hh + 3], [x, yOut - hh - 3]], EA.alpha(C.text, 0.3), 1, [2, 3]);
        }
      }
      const fin = grp(FREQ[kShow - 1]) + ' Hz';
      const fout = grp(FREQ[kShow]) + ' Hz';
      if (g.wide) {
        txt(ctx, 'STADIO ' + kShow + ' DI 15', strip.x + 12, strip.y + 18, { color: C.ink, size: 10.5, weight: 700 });
        txt(ctx, 'ingresso', strip.x + 12, yIn - 2, { color: C.dim, size: 10.5 });
        txt(ctx, fin, strip.x + 12, yIn + 12, { color: C.text, size: 11, weight: 700 });
        txt(ctx, 'uscita', strip.x + 12, yOut - 2, { color: C.dim, size: 10.5 });
        txt(ctx, fout, strip.x + 12, yOut + 12, { color: TINT, size: 11, weight: 700 });
        txt(ctx, active >= 15 ? 'tempo reale →' : 'rallentato →', sx1, strip.y + 18, { color: C.dim, size: 10.5, align: 'right' });
      } else {
        txt(ctx, 'STADIO ' + kShow + ': ' + fin.replace(' Hz', '') + ' → ' + fout, strip.x + 10, strip.y + 16, { color: C.ink, size: 10.5, weight: 700 });
      }
      // la catena dei 15 flip-flop
      const rows = g.wide ? 1 : 3;
      const per = 15 / rows;
      const bh = g.wide ? 38 : 30;
      // su schermo largo catena e formula stanno al centro dello spazio sotto le onde
      const chainY = g.wide ? strip.y + strip.h + Math.max(34, (R.y + R.h - strip.y - strip.h - bh - 42) / 2) : strip.y + strip.h + 30;
      const left = g.wide ? R.x + 64 : R.x;
      const cw = ((g.wide ? strip.x + strip.w : R.x + R.w) - left) / per;
      const bwid = Math.min(cw - 12, 52);
      const rowGap = g.wide ? 0 : (R.y + R.h - 26 - chainY) / 3;
      txt(ctx, g.wide ? '32' + NB + '768 Hz' : 'dal quarzo: 32' + NB + '768 Hz', R.x, chainY - (g.wide ? 6 : 12), { color: C.text, size: 10.5, weight: 700 });
      if (g.wide) EA.draw.arrow(ctx, R.x, chainY + bh / 2, left + (cw - bwid) / 2, chainY + bh / 2, TINT, 1.6, 7);
      for (let k = 1; k <= 15; k++) {
        const row = Math.floor((k - 1) / per);
        const colI = (k - 1) % per;
        const bx = left + colI * cw + (cw - bwid) / 2;
        const by = chainY + row * rowGap;
        const on = k <= active;
        const cur = k === active && active < 15 && playing;
        if (colI < per - 1) poly(ctx, [[bx + bwid, by + bh / 2], [bx + cw, by + bh / 2]], on ? EA.alpha(TINT, 0.7) : C.grid, 1.4);
        else if (k < 15) {
          const yy = by + bh + (rowGap - bh) * 0.62;
          poly(ctx, [[bx + bwid / 2, by + bh], [bx + bwid / 2, yy], [left + (cw - bwid) / 2 - 6, yy], [left + (cw - bwid) / 2 - 6, by + rowGap + bh / 2], [left + (cw - bwid) / 2, by + rowGap + bh / 2]], on ? EA.alpha(TINT, 0.6) : C.grid, 1.2);
        }
        ctx.save();
        if (cur) { ctx.shadowColor = TINT; ctx.shadowBlur = 16; }
        rr(ctx, bx, by, bwid, bh, 6);
        ctx.fillStyle = '#0d1714';
        ctx.fill();
        ctx.strokeStyle = on ? TINT : C.grid;
        ctx.lineWidth = cur ? 2 : 1.3;
        ctx.stroke();
        ctx.restore();
        // nei blocchi stretti la spia sale nell'angolo, per non coprire la scritta
        const tight = bwid < 38;
        divLabel(ctx, bx + bwid / 2 - (tight ? 0 : 4), by + bh / 2 + 4, 2, on ? C.ink : C.dim);
        const lx = bx + bwid - (tight ? 5 : 8);
        const ly = tight ? by + 6 : by + bh / 2;
        const lr = tight ? 2.4 : 3.2;
        // spia: sopra i 10 Hz lampeggia troppo in fretta e sembra accesa a metà
        const f = FREQ[k];
        const lvl = !on ? 0 : f > 10 ? 0.5 : bit(k);
        if (lvl > 0.9) EA.draw.dot(ctx, lx, ly, lr * 1.9, EA.alpha(TINT, 0.25), false);
        EA.draw.dot(ctx, lx, ly, lr, lvl ? EA.alpha(TINT, 0.35 + 0.65 * lvl) : '#2a3833', false);
        const label = k === 15 ? '1 Hz' : grp(f);
        txt(ctx, on ? label : '…', bx + bwid / 2, by + bh + 14, { color: k === 15 && on ? TINT : on ? C.text : C.dim, size: 10.5, weight: k === 15 ? 700 : 600, align: 'center' });
      }
      // la lancetta scatta sui fronti di salita dell'uscita da 1 Hz
      const t15 = SW0 + 14 * SWD;
      let ticks = 0;
      let last = -1;
      for (let e = 0.5; e <= t; e += 1) if (e >= t15) { ticks++; last = e; }
      const snap = last >= 0 ? EA.ease.out((t - last) / 0.12) : 1;
      const lit = last >= 0 && t - last < 0.25;
      watch(ctx, wcx, wcy, wr, 12 + ticks - 1 + snap, lit);
      if (g.wide) {
        txt(ctx, '1 Hz: un passo al secondo', wcx, wcy + wr + 22, { color: C.text, size: 10.5, align: 'center' });
        txt(ctx, '±20 ppm ≈ ±' + EA.fmt(ppmToSecondsPerDay(20), 1) + ' s al giorno', wcx, wcy + wr + 38, { color: C.dim, size: 10.5, align: 'center' });
      }
      // la formula, stadio per stadio
      const k = Math.max(1, active);
      const yF = g.wide ? chainY + bh + 56 : R.y + R.h - 2;
      txt(ctx, '32' + NB + '768 Hz / 2' + sup(k) + ' = ' + (k === 15 ? '1' : grp(FREQ[k])) + ' Hz', R.x, yF, { color: k === 15 ? TINT : C.ink, size: g.small ? 12 : 14, weight: 700 });
    }

    /* fasi 4 e 5: il PLL */

    function splitAct2(g, R) {
      if (g.wide) return { D: { x: R.x, y: R.y + R.h * 0.1, w: R.w * 0.55, h: R.h * 0.8 }, P: { x: R.x + R.w * 0.6, y: R.y, w: R.w * 0.4, h: R.h } };
      return { D: { x: R.x, y: R.y, w: R.w, h: R.h * 0.4 }, P: { x: R.x, y: R.y + R.h * 0.43, w: R.w, h: R.h * 0.57 } };
    }

    function scenePll(ctx, g, R, tt, sT, playing) {
      const tau = playing ? sT - VIS.start : VIS.span;
      const e = visErr(tau);
      const { D, P } = splitAct2(g, R);
      loopDiagram(ctx, D, { compact: g.small, hot: 'pll', err: e, tt: playing ? tt : null, N: 8 });
      if (g.small) txt(ctx, 'PFD: rivelatore di fase e frequenza', D.x, D.y + D.h + 4, { color: C.dim, size: 10.5 });
      // fasori e legenda
      const r = g.wide ? Math.min(P.h * 0.27, P.w * 0.24) : Math.min(g.small ? 50 : 90, P.h * 0.24);
      const cx = P.x + r + 8;
      const cy = P.y + r + (g.wide ? 14 : 8);
      const ang = TAU * VIS.rev * tt + 0.9;
      phasorDial(ctx, cx, cy, r, ang, e, playing ? null : ang - visErr(0));
      const locked = tau >= tLockVis && Math.abs(e) < LOCK_RAD;
      const lx = cx + r + (g.wide ? 24 : 16);
      const dl = g.wide ? 17 : 16;
      const ly = g.small ? P.y + 16 : cy - r * 0.5;
      const leg = [[C.cyan, 'riferimento'], [TINT, 'VCO / N'], [C.amber, 'errore ' + deg(e)]];
      if (!playing) leg.push([null, 'VCO all\'inizio']);
      leg.forEach(([col, l], i) => {
        const y = ly + i * dl;
        if (col) EA.draw.dot(ctx, lx + 4, y - 4, 3.2, col, false);
        else poly(ctx, [[lx - 2, y - 4], [lx + 10, y - 4]], EA.alpha(TINT, 0.7), 1.6, [3, 3]);
        txt(ctx, l, lx + 14, y, { color: i === 2 ? C.amber : col ? C.text : C.dim, size: 10.5, weight: i === 2 ? 700 : 600 });
      });
      chip(ctx, lx, ly + leg.length * dl + 8, locked ? 'AGGANCIATO' : 'IN AGGANCIO', locked ? C.green : C.amber);
      // l'errore di fase nel tempo, con la fascia di ±5° dell'aggancio
      const sy = cy + r + (g.wide ? 20 : 12);
      const S = { x: P.x, y: sy, w: P.w, h: P.y + P.h - sy };
      if (S.h < 60) return;
      panel(ctx, S);
      txt(ctx, 'ERRORE DI FASE NEL TEMPO', S.x + 10, S.y + 16, { color: C.text, size: 10.5, weight: 700 });
      const x0 = S.x + 10;
      const x1 = S.x + S.w - 10;
      const yA = S.y + 28;
      const yB = S.y + S.h - 20;
      const Y = (v) => yB - ((v - E_LO) / (E_HI - E_LO)) * (yB - yA);
      ctx.fillStyle = EA.alpha(C.green, 0.12);
      ctx.fillRect(x0, Y(LOCK_RAD), x1 - x0, Y(-LOCK_RAD) - Y(LOCK_RAD));
      poly(ctx, [[x0, Y(0)], [x1, Y(0)]], EA.alpha(C.text, 0.35), 1, [3, 4]);
      txt(ctx, 'fascia ±5°', x1, Y(LOCK_RAD) - 5, { color: EA.alpha(C.green, 0.9), size: 10.5, align: 'right' });
      const pts = [];
      const now = [];
      for (let i = 0; i <= 160; i++) {
        const q = (i / 160) * VIS.span;
        const p = [x0 + (i / 160) * (x1 - x0), Y(visErr(q))];
        pts.push(p);
        if (q <= tau) now.push(p);
      }
      EA.draw.line(ctx, pts, EA.alpha(C.amber, 0.25), 1.2, false);
      if (now.length > 1) EA.draw.line(ctx, now, C.amber, 2);
      if (tau >= tLockVis) {
        const xl = x0 + (tLockVis / VIS.span) * (x1 - x0);
        poly(ctx, [[xl, yA - 4], [xl, yB + 4]], EA.alpha(C.green, 0.8), 1.2, [3, 3]);
        txt(ctx, 'agganciato', xl + 6, S.y + S.h - 6, { color: C.green, size: 10.5 });
      }
    }

    function sceneMoltiplica(ctx, g, R, tt, sT, playing) {
      const N = 8;
      const roomy = !g.small; // schermo largo o tablet: etichette lunghe
      const { D, P } = splitAct2(g, R);
      loopDiagram(ctx, D, { compact: g.small, hot: 'mult', err: 0, tt: playing ? tt : null, N, fref: 100e6, fout: N * 100e6 });
      // onde allineate: il divisore restituisce un fronte ogni N fronti del VCO
      panel(ctx, P);
      const labW = roomy ? 112 : 70;
      const x0 = P.x + labW;
      const x1 = P.x + P.w - 12;
      const Pr = (x1 - x0) / 2;
      const rowH = (P.h - (roomy ? 88 : 80)) / 3;
      const ys = [0, 1, 2].map((i) => P.y + 30 + rowH * (i + 0.5) + i * 4);
      const hh = rowH * 0.28;
      const cur = playing ? ((sT * 0.22) % 1) * 2 : 1.02;
      for (let m = 0; m <= 2; m++) poly(ctx, [[x0 + m * Pr, P.y + 18], [x0 + m * Pr, ys[2] + hh + 6]], EA.alpha(C.cyan, 0.35), 1, [3, 4]);
      EA.draw.line(ctx, squarePts(x0, x1, Pr, 0, ys[0] - hh, ys[0] + hh), C.cyan, 2);
      EA.draw.line(ctx, squarePts(x0, x1, Pr / N, 0, ys[1] - hh, ys[1] + hh), TINT, 1.8);
      EA.draw.line(ctx, squarePts(x0, x1, Pr, 0, ys[2] - hh, ys[2] + hh), EA.alpha(TINT, 0.75), 2);
      const lab = roomy ? [['riferimento', '100 MHz'], ['VCO = N · fref', '800 MHz'], ['VCO / N', '100 MHz']] : [['rif.', '100 MHz'], ['VCO', '800 MHz'], ['VCO / 8', '100 MHz']];
      lab.forEach(([a, b], i) => {
        txt(ctx, a, P.x + 10, ys[i] - 2, { color: i === 0 ? C.cyan : TINT, size: 10.5, weight: 700 });
        txt(ctx, b, P.x + 10, ys[i] + 12, { color: C.dim, size: 10.5 });
      });
      // il conteggio dei fronti del VCO
      const xc = x0 + cur * Pr;
      for (let j = 0; j < 2 * N; j++) {
        const x = x0 + (j + 0.25) * (Pr / N);
        const passed = x0 + j * (Pr / N) <= xc;
        txt(ctx, String((j % N) + 1), x, ys[1] - hh - 6, { color: passed ? C.ink : EA.alpha(C.dim, 0.6), size: 10.5, weight: passed ? 700 : 600, align: 'center' });
      }
      poly(ctx, [[xc, P.y + 22], [xc, ys[2] + hh + 4]], EA.alpha(C.ink, 0.55), 1.2);
      // jitter: l'istante del fronte non è mai esattamente quello ideale
      if (roomy) {
        const xe = x0 + Pr + 5 * (Pr / N);
        for (let i = -2; i <= 2; i++) poly(ctx, [[xe + i * 1.6, ys[1] - hh], [xe + i * 1.6, ys[1] + hh]], EA.alpha(TINT, i ? 0.25 : 0.9), 1);
        txt(ctx, 'jitter', xe, ys[1] + hh + 14, { color: TINT, size: 10.5, align: 'center' });
      }
      const yT = P.y + P.h - (roomy ? 30 : 24);
      txt(ctx, 'fout = N · fref = 8 × 100 MHz = 800 MHz', P.x + 10, yT, { color: TINT, size: roomy ? 12 : 10.5, weight: 700 });
      txt(ctx, roomy ? 'in una CPU: 100 MHz × 62 = 6,2 GHz, un ciclo ogni ' + EA.si(1 / pllOut(100e6, 62), 's') : 'CPU: 100 MHz × 62 = 6,2 GHz', P.x + 10, yT + 16, { color: C.dim, size: 10.5 });
    }

    function draw(t, dt) {
      if (!cv.w) return;
      const playing = dt > 0;
      if (playing) {
        sT += dt;
        if (sT > STAGES[stage].dur) {
          sT = 0;
          stage = (stage + 1) % STAGES.length;
          api.setStep(stage);
        }
      }
      const g = frame();
      const ctx = cv.ctx;
      EA.draw.clear(cv);
      const top = header(ctx, g, stage);
      const R = { x: g.pad, y: top, w: g.w - g.pad * 2, h: g.hh - top - (g.small ? 10 : 14) };
      const key = STAGES[stage].key;
      const tt = playing ? t : 0.25;
      ctx.save();
      ctx.globalAlpha = playing ? EA.smooth(sT / 0.45) : 1;
      if (key === 'quarzo') sceneQuarzo(ctx, g, R, tt, sT, playing);
      else if (key === 'pierce') scenePierce(ctx, g, R, tt, sT, playing);
      else if (key === 'divisori') sceneDivisori(ctx, g, R, sT, playing);
      else if (key === 'pll') scenePll(ctx, g, R, playing ? t : 1.1, sT, playing);
      else sceneMoltiplica(ctx, g, R, tt, sT, playing);
      ctx.restore();
    }

    api.loop(draw);
    api.setStep(0);
    return {
      focus(key, i) {
        stage = EA.clamp(i, 0, STAGES.length - 1);
        sT = 0;
        api.setStep(stage);
        api.invalidate();
        api.announce('Fase ' + (stage + 1) + ': ' + STAGES[stage].title + '. ' + STAGES[stage].sub);
      },
    };
  }

  /* ---------- laboratorio: anello ad aggancio di fase ---------- */

  const BANDS = ['lento e stabile', 'calmo', 'equilibrato', 'svelto', 'veloce e nervoso'];
  const bandName = (u) => BANDS[Math.min(4, Math.floor(u * 5))];
  const PLAY = 6; // secondi di riproduzione al rallentatore di ogni transitorio

  function mountLab(parts, api) {
    const h = EA.h;
    if (parts.root) parts.root.classList.add('clock-lab');
    const st = { fref: 100e6, N: 32, u: 0.5, kind: 'fase' };
    let sim = null;
    let start = null; // stato iniziale e descrizione del transitorio in corso
    let play = 0;
    let vis = 0;
    let lastU = 0;
    let pending = 0;
    let announced = true;
    api.cleanup(() => clearTimeout(pending));

    const cv = api.canvas(parts.display, { class: 'ea-canvas clock-lab-canvas', label: 'In alto i fasori del riferimento e del VCO diviso per N con l\'arco dell\'errore di fase; al centro la frequenza del VCO nel tempo durante l\'aggancio; in basso le onde del riferimento e del VCO diviso per N, con il ritardo tra i loro fronti.' });

    const fref = EA.ui.slider({
      label: 'Riferimento fref', min: 10, max: 100, step: 1, value: 100, color: C.cyan,
      format: (v) => v + ' MHz', hint: 'L\'oscillatore al quarzo della scheda: 19,2-38,4 MHz nei telefoni, 100 MHz nei PC.',
      oninput: (v) => { st.fref = v * 1e6; changed(); },
    });
    const nS = EA.ui.slider({
      label: 'Fattore di moltiplicazione N', min: 1, max: 64, step: 1, value: 32, color: TINT,
      format: (v) => '× ' + v, hint: 'Il divisore restituisce un fronte ogni N fronti del VCO.',
      oninput: (v) => { st.N = v; changed(); },
    });
    const band = EA.ui.slider({
      label: 'Banda dell\'anello', min: 0, max: 100, step: 1, value: 50, color: C.violet,
      format: (v) => bandName(v / 100), hint: ' ',
      oninput: (v) => { st.u = v / 100; changed(); },
    });
    const bandHint = band.el.querySelector('.ea-ctl-hint');
    const kind = EA.ui.segmented({
      label: 'Disturbo', color: C.amber,
      options: [{ value: 'fase', label: 'Salto di fase', title: 'Il riferimento arriva un quarto di periodo prima: +90°' }, { value: 'freq', label: 'Colpo al VCO', title: 'La frequenza del VCO cala di colpo dell\'1 %' }],
      value: st.kind, onchange: (v) => { st.kind = v; },
    });
    const kick = EA.ui.button({ label: 'Disturba l\'anello', icon: '↯', primary: true, onclick: () => perturb() });
    parts.controls.append(fref.el, nS.el, band.el, kind.el,
      h('div', { class: 'ea-ctl' }, kick, h('small', { class: 'ea-ctl-hint' }, 'Salto di fase: il riferimento arriva un quarto di periodo prima. Colpo al VCO: la sua frequenza cala di colpo dell\'1 %.')));

    const roF = EA.ui.readout({ label: 'Uscita N · fref' });
    const roE = EA.ui.readout({ label: 'Errore di fase' });
    const roS = EA.ui.readout({ label: 'Stato' });
    const roT = EA.ui.readout({ label: 'Tempo di aggancio' });
    const roM = EA.ui.readout({ label: 'Sovraelongazione (colpo al VCO)' });
    const roN = EA.ui.readout({ label: 'Rumore di fase in più' });
    parts.readouts.append(roF.el, roE.el, roS.el, roT.el, roM.el, roN.el);

    const params = () => { const lp = loopParams(st.fref, st.u); return { fref: st.fref, N: st.N, wn: lp.wn, zeta: lp.zeta, fn: lp.fn }; };

    // Stato dell'anello all'istante mostrato dal transitorio in corso.
    function current() {
      if (!sim) return { e: 0, x: 0, u: 0 };
      const i = Math.round((play / PLAY) * sim.n);
      return { e: sim.e[i], x: sim.x[i], u: wrapAngle(sim.u[i]) };
    }

    function run(s0, desc) {
      const p = params();
      start = { s: { e: s0.e, x: s0.x, u: s0.u }, desc };
      sim = simulate({ fref: p.fref, N: p.N, wn: p.wn, zeta: p.zeta, e: s0.e, x: s0.x, u: s0.u });
      sim.desc = desc;
      sim.kind = s0.x && !s0.e ? 'freq' : 'fase';
      sim.os = measuredOvershoot(sim);
      play = api.reduced ? PLAY : 0;
      lastU = s0.u;
      vis = wrapAngle(s0.u);
      announced = false;
      statics();
      api.invalidate();
    }

    function statics() {
      const p = params();
      roF.set(EA.si(pllOut(p.fref, p.N), 'Hz'));
      roM.set(EA.fmt(overshoot(p.zeta) * 100, 0) + ' %', p.zeta < 0.6 ? 'warn' : null);
      roN.set(p.N === 1 ? '0 dB' : '+' + EA.fmt(noisePenalty(p.N), 1) + ' dB');
      bandHint.textContent = 'fn = ' + EA.si(p.fn, 'Hz') + ' · ζ = ' + EA.fmt(p.zeta, 2) + ' · aggancio ≈ 4/(ζωn) = ' + EA.si(lockEstimate(p.zeta, p.wn), 's');
    }

    // Un cursore si è mosso: i display cambiano subito, il transitorio quando la mano si ferma.
    function changed() {
      statics();
      clearTimeout(pending);
      pending = setTimeout(() => {
        const p = params();
        if (!sim) return;
        if (sim.fref !== p.fref || sim.N !== p.N) {
          const desc = sim.N !== p.N ? 'N da ' + sim.N + ' a ' + p.N : 'fref da ' + EA.si(sim.fref, 'Hz') + ' a ' + EA.si(p.fref, 'Hz');
          run(retune(current(), { fref: sim.fref, N: sim.N }, p), desc);
        } else run(start.s, start.desc + ' · nuova banda');
      }, 160);
    }

    function perturb() {
      const p = params();
      const s = disturb(current(), p, st.kind);
      run(s, st.kind === 'fase' ? 'salto di fase di 90°' : 'colpo al VCO: −1 %');
    }

    function draw(t, dt) {
      if (!cv.w || !sim) return;
      if (dt > 0 && play < PLAY) play = Math.min(PLAY, play + dt);
      const k = play / PLAY;
      const fi = k * sim.n;
      const i0 = Math.min(sim.n, Math.floor(fi));
      const i1 = Math.min(sim.n, i0 + 1);
      const fr = fi - i0;
      const at = (arr) => arr[i0] + (arr[i1] - arr[i0]) * fr;
      const uNow = at(sim.u);
      const xNow = at(sim.x);
      const fNow = at(sim.f);
      const tNow = k * sim.T;
      const slipNow = play < PLAY && (sim.slip[i0] === 1 || sim.slip[i1] === 1);
      // i fasori inseguono l'errore vero con velocità limitata: niente salti stroboscopici
      if (dt > 0) {
        const du = uNow - lastU;
        vis += Math.abs(du) > 0.3 ? Math.sign(du) * 0.3 : du;
        if (Math.abs(du) < 0.15) vis += wrapAngle(uNow - vis) * Math.min(1, dt * 12);
      } else vis = wrapAngle(uNow);
      lastU = uNow;
      const err = wrapAngle(vis);
      const locked = sim.locked && tNow >= sim.tLock && !slipNow;
      // i numeri: ad anello agganciato l'errore vero, sempre sotto 5°; prima quello dei fasori
      const shown = locked ? wrapAngle(uNow) : err;

      const ctx = cv.ctx;
      const w = cv.w;
      const hh = cv.h;
      const narrow = w < 520;
      const px = narrow ? 12 : 18;
      EA.draw.clear(cv);
      const topH = Math.round(hh * (narrow ? 0.3 : 0.31));
      const botH = Math.round(hh * (narrow ? 0.23 : 0.22));

      // in alto: fasori, legenda e schema dell'anello
      const r = Math.min(topH * 0.37, narrow ? w * 0.15 : 74);
      const dcx = px + r + 4;
      const dcy = topH * 0.5 + 6;
      phasorDial(ctx, dcx, dcy, r, TAU * 0.2 * t + 0.6, err);
      const lx = dcx + r + (narrow ? 16 : 26);
      const vx = lx + (narrow ? 108 : 118);
      const ly = dcy - (narrow ? 26 : 30);
      const rows = [[C.cyan, 'riferimento', EA.si(sim.fref, 'Hz', 3)], [TINT, 'VCO / N', EA.si(fNow / sim.N, 'Hz', 4)], [C.amber, 'errore di fase', deg(shown)]];
      rows.forEach(([col, name, val], i) => {
        const y = ly + i * (narrow ? 16 : 18);
        EA.draw.dot(ctx, lx + 4, y - 4, 3.2, col, false);
        txt(ctx, name, lx + 14, y, { color: C.text, size: 10.5 });
        txt(ctx, val, vx, y, { color: i === 2 ? C.amber : C.ink, size: 10.5, weight: 700 });
      });
      const status = slipNow ? ['GIRI PERSI', C.red] : locked ? ['AGGANCIATO', C.green] : ['IN AGGANCIO', C.amber];
      chip(ctx, lx, ly + (narrow ? 3 * 16 + 8 : 3 * 18 + 10), status[0], status[1]);
      const D = { x: vx + 90, y: 8, w: w - px - (vx + 90), h: topH - 10 };
      if (D.w >= 280) loopDiagram(ctx, D, { compact: D.w < 460, hot: slipNow || !locked ? 'pll' : 'mult', err, tt: dt > 0 ? t : null, N: sim.N, fref: sim.fref, fout: fNow });

      // al centro: la frequenza del VCO durante il transitorio
      const pt = topH + 22;
      const pl = { x: px, y: pt + 12, w: w - px * 2, h: hh - botH - pt - 34 };
      let lo = sim.target;
      let hi = sim.target;
      for (let i = 0; i <= sim.n; i++) { lo = Math.min(lo, sim.f[i]); hi = Math.max(hi, sim.f[i]); }
      const span = Math.max(hi - lo, sim.target * 0.004);
      const mid = (hi + lo) / 2;
      lo = Math.max(0, mid - span * 0.62);
      hi = lo + span * 1.24;
      const X = (i) => pl.x + (i / sim.n) * pl.w;
      const Y = (f) => pl.y + pl.h - ((f - lo) / (hi - lo)) * pl.h;
      txt(ctx, 'FREQUENZA DEL VCO', px, pt, { color: C.text, size: 10.5, weight: 700 });
      const descX = px + textW(ctx, 'FREQUENZA DEL VCO', 10.5, 700) + 10;
      if (!narrow) txt(ctx, '· ' + sim.desc, descX, pt, { color: C.dim, size: 10.5 });
      EA.draw.grid(ctx, pl.x, pl.y, pl.w, pl.h, { cols: narrow ? 4 : 10, rows: 4, ticks: false });
      const yT = Y(sim.target);
      poly(ctx, [[pl.x, yT], [pl.x + pl.w, yT]], EA.alpha(C.ink, 0.4), 1, [4, 4]);
      const all = [];
      for (let i = 0; i <= sim.n; i++) all.push([X(i), Y(sim.f[i])]);
      EA.draw.line(ctx, all, EA.alpha(TINT, 0.22), 1.2, false);
      const past = all.slice(0, i0 + 1);
      past.push([pl.x + k * pl.w, Y(fNow)]);
      if (past.length > 1) EA.draw.line(ctx, past, TINT, 2);
      const xc = pl.x + k * pl.w;
      poly(ctx, [[xc, pl.y], [xc, pl.y + pl.h]], EA.alpha(C.ink, 0.3), 1);
      EA.draw.dot(ctx, xc, Y(fNow), 3.5, C.ink);
      const lab = (s, x, y, col, align) => {
        const tw = textW(ctx, s, 10.5);
        const x0 = align === 'right' ? x - tw : x;
        ctx.fillStyle = EA.alpha(C.bg, 0.85);
        ctx.fillRect(x0 - 3, y - 11, tw + 6, 15);
        txt(ctx, s, x0, y, { color: col, size: 10.5 });
      };
      lab('N · fref = ' + EA.si(sim.target, 'Hz', 4), pl.x + pl.w - 6, yT - 6, C.ink, 'right');
      lab(EA.si(hi, 'Hz', 4), pl.x + 6, pl.y + 14, C.dim);
      lab(EA.si(lo, 'Hz', 4), pl.x + 6, pl.y + pl.h - 6, C.dim);
      if (sim.tLock > 0 && tNow >= sim.tLock) {
        const xl = pl.x + (sim.tLock / sim.T) * pl.w;
        poly(ctx, [[xl, pl.y], [xl, pl.y + pl.h]], EA.alpha(C.green, 0.85), 1.2, [4, 3]);
        const s = 'agganciato dopo ' + EA.si(sim.tLock, 's');
        const right = xl + textW(ctx, s, 10.5) + 12 > pl.x + pl.w;
        lab(s, right ? xl - 6 : xl + 6, pl.y + pl.h - 22, C.green, right ? 'right' : 'left');
      }
      if (sim.kind === 'freq' && sim.os.index >= 0 && sim.os.value > 0.01 && i0 >= sim.os.index) {
        const xo = X(sim.os.index);
        const yo = Y(sim.f[sim.os.index]);
        EA.draw.dot(ctx, xo, yo, 3, C.amber, false);
        lab('+' + EA.fmt(sim.os.value * 100, 0) + ' %', xo + 6, yo + (yo < yT ? -6 : 16), C.amber);
      }
      txt(ctx, '0', pl.x, pl.y + pl.h + 14, { color: C.dim, size: 10.5 });
      txt(ctx, EA.si(sim.T, 's'), pl.x + pl.w, pl.y + pl.h + 14, { color: C.dim, size: 10.5, align: 'right' });
      const slowMo = sim.T < PLAY;
      txt(ctx, narrow ? (slowMo ? 'tempo, rallentato' : 'tempo') : 'tempo reale, mostrato ' + (slowMo ? 'al rallentatore ' : '') + 'in ' + PLAY + ' s', pl.x + pl.w / 2, pl.y + pl.h + 14, { color: C.dim, size: 10.5, align: 'center' });

      // in basso: i fronti, con l'oscilloscopio sincronizzato sul riferimento
      const by = hh - botH + 6;
      const labW = narrow ? 58 : 96;
      const wx0 = px + labW;
      const wx1 = w - px;
      const P = (wx1 - wx0) / 3;
      const rowH = (botH - 36) / 2;
      const y1 = by + 22 + rowH * 0.5;
      const y2 = y1 + rowH + 4;
      const a = rowH * 0.32;
      const rho = EA.clamp((TAU * sim.fref - xNow) / (TAU * sim.fref), 0.35, 2.5);
      const trig = wx0 + P;
      const xd = trig + ((err / TAU) * P) / rho;
      txt(ctx, 'FRONTI', px, by + 8, { color: C.text, size: 10.5, weight: 700 });
      if (Math.abs(xd - trig) > 2.5 && !slipNow) {
        ctx.fillStyle = EA.alpha(C.amber, 0.2);
        ctx.fillRect(Math.min(trig, xd), y1 - a - 4, Math.abs(xd - trig), y2 + a + 4 - (y1 - a - 4));
      }
      for (let m = 0; m <= 2; m++) poly(ctx, [[wx0 + m * P, y1 - a - 6], [wx0 + m * P, y2 + a + 6]], EA.alpha(C.cyan, 0.3), 1, [3, 4]);
      EA.draw.line(ctx, squarePts(wx0, wx1, P, 0, y1 - a, y1 + a), C.cyan, 1.8);
      EA.draw.line(ctx, squarePts(wx0, wx1, P / rho, ((wx0 - trig) * rho) / P - err / TAU, y2 - a, y2 + a), TINT, 1.8);
      txt(ctx, narrow ? 'rif.' : 'riferimento', px, y1 + 4, { color: C.cyan, size: 10.5, weight: 700 });
      txt(ctx, narrow ? 'VCO/N' : 'VCO / N', px, y2 + 4, { color: TINT, size: 10.5, weight: 700 });
      const dtEdge = shown / (TAU * sim.fref);
      const edgeMsg = slipNow ? 'il VCO perde giri: frequenze diverse' : Math.abs(xd - trig) <= 2.5 ? 'fronti allineati' : 'VCO / N in ' + (dtEdge > 0 ? 'ritardo' : 'anticipo') + ' di ' + EA.si(Math.abs(dtEdge), 's');
      txt(ctx, edgeMsg, w - px, by + 8, { color: slipNow ? C.red : Math.abs(xd - trig) <= 2.5 ? C.green : C.amber, size: 10.5, align: 'right' });

      // display numerici
      roE.set(deg(shown), Math.abs(shown) < LOCK_RAD ? 'good' : 'warn');
      roS.set(slipNow ? 'giri persi' : locked ? 'agganciato' : 'in aggancio', slipNow ? 'bad' : locked ? 'good' : 'warn');
      roT.set(sim.tLock === 0 ? 'mai sganciato' : tNow >= sim.tLock || play >= PLAY ? EA.si(sim.tLock, 's') : 'in corso…', sim.tLock && tNow < sim.tLock ? null : 'good');
      if (!announced && (play >= PLAY || tNow >= sim.tLock)) {
        announced = true;
        api.announce(sim.desc + ': ' + (sim.tLock === 0 ? 'l\'errore resta sotto 5 gradi, l\'anello non si sgancia.' : 'l\'anello torna agganciato dopo ' + EA.si(sim.tLock, 's') + '.'));
      }
    }

    api.loop(draw);
    statics();
    run({ e: 0, x: 0.04 * TAU * st.fref, u: 0 }, 'accensione: il VCO parte 4 % sotto');
    return {};
  }

  /* ---------- contenuti ---------- */

  EA.register({
    id: 'clock',
    intro: [
      'Ogni circuito digitale, dall\'orologio da polso al processore, ha bisogno di un <strong>battito regolare</strong> che gli dica quando agire. Quasi sempre quel battito nasce da un minuscolo pezzo di cristallo di <strong>quarzo</strong>. Nel 1880 i fratelli Pierre e Jacques Curie scoprirono che il quarzo, se compresso, si carica elettricamente sulle facce (<em>effetto piezoelettrico</em>); l\'anno dopo confermarono anche l\'effetto inverso: sotto tensione il cristallo si deforma. È il ponte tra una vibrazione meccanica e un circuito.',
      'Un pezzetto di quarzo tagliato a forma di diapason vibra a una frequenza fissata dalla sua forma e perde pochissima energia a ogni oscillazione: il suo <em>fattore di qualità</em> Q arriva a decine di migliaia, contro il centinaio di un circuito LC. Negli orologi vibra <strong>32&nbsp;768 volte al secondo</strong>, cioè 2<sup>15</sup>. Un piccolo amplificatore lo tiene in movimento, con la stessa retroazione positiva degli oscillatori RC della sezione intermedia, e quindici divisori per 2 riducono quel ritmo a un impulso al secondo: quello che muove la lancetta.',
      'I processori però lavorano a miliardi di cicli al secondo, e nessun quarzo vibra così in fretta. Il trucco è l\'<strong>anello ad aggancio di fase</strong> (<abbr title="Phase-Locked Loop">PLL</abbr>): un oscillatore regolabile insegue la fase di un quarzo di riferimento e ne moltiplica la frequenza per <var>N</var>, da 100&nbsp;MHz fino a oltre 6&nbsp;GHz. E quando serve ancora più precisione si chiede aiuto agli atomi: dal 1967 il secondo è la durata di 9&nbsp;192&nbsp;631&nbsp;770 oscillazioni della radiazione che corrisponde a una precisa transizione dell\'atomo di cesio-133.',
    ],
    steps: [
      { title: 'Il quarzo vibra', text: 'Un diapason di quarzo lungo pochi millimetri vibra 32 768 volte al secondo. Quando i rebbi si piegano, sulle facce compaiono cariche di segno opposto che si scambiano a ogni mezza vibrazione: è l\'effetto piezoelettrico, che trasforma la vibrazione in una tensione.', focus: 'quarzo' },
      { title: 'L\'oscillatore lo tiene in vibrazione', text: 'Da solo il quarzo si fermerebbe, perché a ogni ciclo perde un po\' di energia. Nel circuito di Pierce un invertitore CMOS gliela restituisce a ogni oscillazione, mentre due piccoli condensatori sistemano la fase del segnale riportato indietro. All\'uscita la sinusoide del quarzo diventa un\'onda quadra.', focus: 'pierce' },
      { title: 'Quindici volte diviso due', text: 'Ogni flip-flop cambia stato a un fronte su due, quindi dimezza la frequenza: 32 768, 16 384, 8192 Hz… Dopo 15 stadi resta 1 Hz, un impulso al secondo che fa scattare la lancetta.', focus: 'divisori' },
      { title: 'Il PLL insegue la fase', text: 'Per arrivare ai GHz serve un anello ad aggancio di fase. Il rivelatore confronta i fronti del riferimento con quelli del VCO diviso per N; il filtro trasforma l\'errore in una tensione che accelera o rallenta il VCO, finché le fasi coincidono.', focus: 'pll' },
      { title: 'Moltiplica per N', text: 'Ad anello agganciato il VCO diviso per N va al passo del riferimento, quindi il VCO è esattamente N volte più veloce: 100 MHz × 62 = 6,2 GHz. Il quarzo resta il metronomo: senza di lui il PLL perderebbe il passo.', focus: 'moltiplica' },
    ],
    formulas: [
      { label: 'Risonanza del quarzo', eq: '<var>f</var><sub>s</sub> = 1 ⁄ (2π√(<var>L</var><sub>1</sub>·<var>C</var><sub>1</sub>))', text: 'Nel circuito equivalente <var>L</var><sub>1</sub> è la massa che vibra, <var>C</var><sub>1</sub> l\'elasticità, <var>R</var><sub>1</sub> gli attriti. Con <var>L</var><sub>1</sub> ≈ 7,9&nbsp;kH, <var>C</var><sub>1</sub> = 3&nbsp;fF e <var>R</var><sub>1</sub> = 35&nbsp;kΩ si ottengono 32&nbsp;768&nbsp;Hz e <var>Q</var> = 2π<var>f</var><sub>s</sub><var>L</var><sub>1</sub>/<var>R</var><sub>1</sub> ≈ 46&nbsp;000: la risonanza è larga appena <var>f</var><sub>s</sub>/<var>Q</var> ≈ 0,7&nbsp;Hz.' },
      { label: 'Catena di divisori', eq: '<var>f</var><sub><var>k</var></sub> = <var>f</var><sub>0</sub> ⁄ 2<sup><var>k</var></sup>', text: 'Ogni flip-flop dimezza la frequenza: raddoppia il periodo, mentre i livelli logici restano gli stessi. Con <var>f</var><sub>0</sub> = 32&nbsp;768&nbsp;Hz = 2<sup>15</sup>&nbsp;Hz, dopo <var>k</var> = 15 stadi resta esattamente 1&nbsp;Hz; con gli 8192&nbsp;Hz del primo orologio da polso al quarzo bastavano 13 stadi.' },
      { label: 'Moltiplicazione con il PLL', eq: '<var>f</var><sub>out</sub> = <var>N</var> · <var>f</var><sub>ref</sub>', text: 'Ad anello agganciato <var>f</var><sub>out</sub>/<var>N</var> = <var>f</var><sub>ref</sub>, quindi 100&nbsp;MHz × 62 = 6,2&nbsp;GHz. Nei sintetizzatori frazionari-N il divisore alterna <var>N</var> e <var>N</var>&nbsp;+&nbsp;1 e il rapporto medio diventa non intero: 38,4&nbsp;MHz × 62,5 = 2,4&nbsp;GHz. L\'errore relativo del quarzo, in ppm, resta lo stesso.' },
      { label: 'Jitter e rumore di fase', eq: 'σ<sub><var>t</var></sub> = σ<sub>φ</sub> ⁄ (2π<var>f</var><sub>0</sub>)', text: 'Il jitter σ<sub><var>t</var></sub> è l\'incertezza sull\'istante dei fronti; σ<sub>φ</sub> è la stessa incertezza espressa come fase, in radianti: a 6&nbsp;GHz, 0,01&nbsp;rad valgono circa 0,27&nbsp;ps. Moltiplicando per <var>N</var> le fluttuazioni di fase crescono di <var>N</var> volte e il rumore di fase sale di 20&nbsp;log<sub>10</sub>&nbsp;<var>N</var>&nbsp;dB: 36&nbsp;dB per <var>N</var> = 64. Il jitter dei convertitori è nel capitolo 5.' },
    ],
    timeline: [
      { year: 1880, title: 'La scoperta della piezoelettricità', who: 'Pierre e Jacques Curie · Parigi', text: 'Comprimendo cristalli di quarzo, tormalina e altre sostanze, i fratelli Curie misurano cariche elettriche di segno opposto sulle facce: è l\'effetto piezoelettrico diretto. L\'effetto inverso, previsto da Gabriel Lippmann nel 1881, viene confermato dai Curie lo stesso anno. Dal 1917 Paul Langevin, allievo di Pierre Curie, usa lamine di quarzo per emettere e ricevere ultrasuoni sott\'acqua: è l\'antenato del sonar.' },
      { year: 1921, title: 'Il primo oscillatore a quarzo', who: 'Walter Guyton Cady · Wesleyan University, Middletown (Connecticut, USA)', text: 'Cady inserisce una barretta di quarzo lunga circa 39&nbsp;mm in un oscillatore a valvole: per la prima volta è un risonatore piezoelettrico a fissare la frequenza, circa 70&nbsp;kHz. Lo presenta all\'American Physical Society il 28 dicembre 1921 e lo pubblica nel 1922.' },
      { year: 1923, title: 'Il circuito di Pierce', who: 'George Washington Pierce · Harvard University', text: 'Pierce semplifica l\'oscillatore a quarzo: gli basta una sola valvola, con il cristallo nell\'anello di retroazione. Lo stesso schema, con un invertitore CMOS e due piccoli condensatori al posto della valvola, fa oscillare oggi il quarzo di quasi ogni orologio e microcontrollore.' },
      { year: 1927, title: 'Il primo orologio al quarzo', who: 'Warren A. Marrison e J. W. Horton · Bell Telephone Laboratories, New York', text: 'Per misurare con precisione le frequenze della telefonia, dividono per via elettronica l\'oscillazione di un quarzo a 50&nbsp;kHz fino a pilotare un motore sincrono collegato a un quadrante. Lo mostrano nel 1927 e lo descrivono in un articolo del 1928. Negli anni \'30 orologi di questo tipo cominciano a sostituire i pendoli di precisione negli osservatori.' },
      { year: 1932, title: 'L\'idea dell\'aggancio di fase', who: 'Henri de Bellescize · Francia', text: 'Nell\'articolo «La réception synchrone», sulla rivista L\'Onde Électrique, de Bellescize descrive un ricevitore radio che confronta di continuo la fase di un oscillatore locale con quella del segnale e la corregge. È considerata la prima descrizione di un PLL, anche se la sincronizzazione tra oscillatori era già nota.' },
      { year: 1967, title: 'Il secondo diventa atomico', who: '13ª Conferenza generale dei pesi e delle misure · Parigi', text: 'Il secondo diventa la durata di 9&nbsp;192&nbsp;631&nbsp;770 periodi della radiazione che corrisponde a una transizione dell\'atomo di cesio-133. Il valore viene dal confronto con il tempo astronomico del primo orologio al cesio accurato, costruito nel 1955 da Louis Essen e Jack Parry al National Physical Laboratory, in Inghilterra. Nello stesso anno, al concorso cronometrico dell\'Osservatorio di Neuchâtel, i prototipi da polso al quarzo Beta 1 e Beta 2 del Centre Électronique Horloger conquistano i primi posti.' },
      { year: 1969, title: 'Il quarzo arriva al polso', who: 'Seiko · Tokyo, 25 dicembre 1969', text: 'Esce il Seiko Quartz Astron, primo orologio da polso al quarzo in commercio: un diapason a 8192&nbsp;Hz (2<sup>13</sup>, quindi 13 divisioni per 2), circa ±5 secondi al mese, 450&nbsp;000 yen, all\'incirca il prezzo di un\'automobile. I 32&nbsp;768&nbsp;Hz (2<sup>15</sup>) diventano lo standard nel corso degli anni \'70.' },
      { year: 1970, title: 'Il PLL diventa un circuito integrato', who: 'Signetics (Alan Grebene, Hans Camenzind) e RCA · Stati Uniti', text: 'Tra il 1969 e i primi anni \'70 l\'anello ad aggancio di fase entra in un solo chip. La Signetics propone la serie NE560, da cui derivano il PLL NE565 e il decodificatore di toni NE567; la RCA propone il CD4046 in tecnologia CMOS. Il PLL passa da sistema costoso a componente da pochi dollari, usato in radio FM, modem e decodificatori di toni.' },
      { year: 1992, title: 'Il clock raddoppiato nella CPU', who: 'Intel · Santa Clara (California, USA)', text: 'Nell\'i486DX2 il nucleo lavora al doppio della frequenza del bus della scheda madre (25 → 50&nbsp;MHz, 33 → 66&nbsp;MHz) grazie a un PLL integrato sul chip. È tra i primi microprocessori diffusi con la frequenza interna moltiplicata da un PLL: da allora la CPU va a un multiplo dell\'oscillatore della scheda.' },
      { year: 2024, title: 'Sei gigahertz di serie', who: 'Intel Core i9-14900KS · smartphone in tutto il mondo', text: 'Un processore desktop raggiunge di serie 6,2&nbsp;GHz: un riferimento di 100&nbsp;MHz moltiplicato per 62 dai PLL integrati (la soglia dei 6&nbsp;GHz era stata toccata nel 2023). Negli smartphone sintetizzatori frazionari-N ricavano da un quarzo di 19,2-38,4&nbsp;MHz tutte le portanti radio, fino a oltre 6&nbsp;GHz.' },
    ],
    fun: 'Gli orologi atomici dei satelliti GPS vengono regolati a terra a 10,229&nbsp;999&nbsp;995&nbsp;43&nbsp;MHz invece di 10,23&nbsp;MHz. In orbita, per effetto della relatività (gravità più debole e grande velocità), guadagnano circa 38 microsecondi al giorno: senza quella correzione la posizione calcolata sbaglierebbe di circa 10&nbsp;km in più ogni giorno. E da quei 10,23&nbsp;MHz, moltiplicati per 154, nasce la portante L1 a 1575,42&nbsp;MHz.',
    uses: [
      'Orologi da polso e orologi in tempo reale (RTC) di PC e telefoni',
      'Microcontrollori: quarzo da 8 MHz × 9 = 72 MHz',
      'CPU dei PC: 100 MHz moltiplicati fino a 5-6 GHz',
      'Telefoni, Wi-Fi e Bluetooth: sintetizzatori frazionari-N',
      'Audio digitale: 12,288 MHz = 256 × 48 kHz',
      'Reti 5G, reti elettriche e borse sincronizzate col GPS',
      'Recupero del clock nei collegamenti seriali veloci',
      'Microbilance al quarzo che pesano nanogrammi',
    ],
    glossary: [
      { term: 'Effetto piezoelettrico', def: 'Alcuni cristalli, come il quarzo, si caricano sulle facce quando vengono compressi o piegati, e si deformano quando ricevono una tensione. È il ponte tra la vibrazione del quarzo e il circuito.' },
      { term: 'Fattore di qualità (Q)', def: 'Dice quanta poca energia perde un risonatore a ogni ciclo; vale anche <var>f</var>/Δ<var>f</var>, la frequenza divisa per la larghezza della risonanza. Un circuito LC arriva a circa 100, un quarzo a 10<sup>4</sup>-10<sup>6</sup>.' },
      { term: 'Circuito equivalente del quarzo', def: 'Un ramo serie <var>L</var><sub>1</sub>-<var>C</var><sub>1</sub>-<var>R</var><sub>1</sub> (massa, elasticità e attriti della vibrazione) in parallelo alla capacità <var>C</var><sub>0</sub> degli elettrodi. Ha una risonanza serie e una parallela vicinissime.' },
      { term: 'Oscillatore di Pierce', def: 'Un invertitore CMOS con il quarzo nella retroazione e due condensatori verso massa. L\'invertitore sfasa di 180°, quarzo e condensatori di altri 180°, e a ogni ciclo l\'energia persa viene reintegrata.' },
      { term: 'Flip-flop divisore', def: 'Un flip-flop che cambia stato a ogni fronte attivo del suo ingresso: la sua uscita ha frequenza dimezzata. In catena, <var>n</var> flip-flop dividono per 2<sup><var>n</var></sup>.' },
      { term: 'PLL (anello ad aggancio di fase)', def: 'Rivelatore di fase, filtro d\'anello, VCO e divisore per <var>N</var> chiusi in anello. Quando le fasi coincidono l\'anello è agganciato e <var>f</var><sub>out</sub> = <var>N</var>·<var>f</var><sub>ref</sub>.' },
      { term: 'VCO', def: 'Oscillatore controllato in tensione: la sua frequenza cresce o cala con la tensione che riceve dal filtro d\'anello.' },
      { term: 'Jitter e rumore di fase', def: 'Il jitter è l\'incertezza sull\'istante di ogni fronte del clock, in picosecondi; il rumore di fase è la stessa imperfezione vista in frequenza, in dBc/Hz.' },
    ],
    sources: [
      { title: 'I fratelli Curie e la scoperta della piezoelettricità (APS News, This Month in Physics History)', url: 'https://www.aps.org/apsnews/2014/03/this-month-in-physics-history' },
      { title: 'Walter Guyton Cady e il primo oscillatore a quarzo (IEEE Milestones)', url: 'https://ieeemilestones.ethw.org/Milestones:Walter_Guyton_Cady' },
      { title: 'Warren Marrison, il primo orologio al quarzo (National Inventors Hall of Fame)', url: 'https://www.invent.org/inductees/warren-marrison' },
      { title: 'Electronic Quartz Wristwatch, 1969 (IEEE Milestones)', url: 'https://ethw.org/Milestones:Electronic_Quartz_Wristwatch,_1969' },
      { title: 'La definizione del secondo (BIPM)', url: 'https://www.bipm.org/en/si-base-units/second' },
      { title: 'Pierce oscillator (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Pierce_oscillator' },
      { title: 'Phase-locked loop (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Phase-locked_loop' },
      { title: 'N. Ashby, Relativity in the Global Positioning System (Living Reviews in Relativity, 2003)', url: 'https://link.springer.com/article/10.12942/lrr-2003-1' },
    ],
    quiz: [
      { id: 'ea-clock-01', chapter: 'clock', level: 1, topic: 'Divisori per 2', q: 'Il quarzo di un orologio vibra a 32 768 Hz. Quanti divisori per 2 in catena servono per ottenere l\'impulso da 1 Hz che muove la lancetta dei secondi?', options: ['15 divisori', '16 divisori', '32 divisori', '12 divisori'], answer: 0, why: '32 768 = 2¹⁵ e ogni flip-flop dimezza la frequenza: 16 384, 8192, 4096 Hz… dopo 15 stadi resta 1 Hz. Con gli 8192 Hz (2¹³) del Seiko Astron del 1969 bastavano 13 stadi.' },
      { id: 'ea-clock-02', chapter: 'clock', level: 1, topic: 'Moltiplicazione con il PLL', q: 'Un PLL agganciato ha un riferimento di 100 MHz e divide per N = 62 l\'uscita del VCO prima di confrontarla. A che frequenza oscilla il VCO?', options: ['6,2 GHz', '1,6 MHz', '162 MHz', '620 MHz'], answer: 0, why: 'Ad anello agganciato fout/N = fref, quindi fout = 62 × 100 MHz = 6,2 GHz, con un periodo di circa 161 ps. È così che una CPU ricava i suoi GHz da un riferimento di 100 MHz.' },
      { id: 'ea-clock-03', chapter: 'clock', level: 2, topic: 'Energia dell\'oscillatore', q: 'Perché il quarzo di un orologio ha bisogno dell\'invertitore del circuito di Pierce per continuare a vibrare?', options: ['Perde un po\' di energia a ogni ciclo e va reintegrata', 'Vibra solo se riceve un\'onda quadra dall\'esterno', 'È l\'invertitore a decidere la frequenza di vibrazione', 'Senza invertitore vibrerebbe in modo troppo ampio'], answer: 0, why: 'Il quarzo è un risonatore passivo: nel suo circuito equivalente la resistenza R1 dissipa un po\' di energia a ogni oscillazione e, lasciato a se stesso, in circa mezzo secondo la sua vibrazione scenderebbe a un terzo. L\'invertitore, alimentato dalla pila, gliela restituisce a ogni ciclo; la frequenza invece la decide il quarzo.' },
      { id: 'ea-clock-04', chapter: 'clock', level: 3, topic: 'Precisione dopo il PLL', q: 'Un quarzo di riferimento a 100 MHz ha un errore di +10 ppm. Un PLL con N = 50 ne ricava 5 GHz. Quanto vale l\'errore dell\'uscita?', options: ['10 ppm, cioè 50 kHz', '0,2 ppm, cioè 1 kHz', '500 ppm, cioè 2,5 MHz', '10 ppm, cioè 1 kHz'], answer: 0, why: 'L\'errore relativo si conserva: il riferimento sbaglia di 1 kHz (10 ppm di 100 MHz) e l\'uscita di 50 volte tanto, 50 kHz, che sono ancora 10 ppm di 5 GHz. Il PLL moltiplica la frequenza, non la precisione: non può essere migliore del suo riferimento.' },
    ],
    hero: {
      caption: 'Atto 1: il quarzo vibra, l\'oscillatore lo tiene in moto e 15 divisori per 2 portano 32 768 Hz a 1 Hz. Atto 2: un PLL aggancia la fase e moltiplica la frequenza per N. Tempi molto rallentati.',
      label: 'Animazione: dal quarzo che vibra alla lancetta dei secondi, poi il PLL che moltiplica la frequenza',
      aspect: '16 / 7',
      aspectMobile: '4 / 5',
      mount: mountHero,
    },
    lab: {
      title: 'Anello ad aggancio di fase',
      intro: 'Scegli il riferimento e il fattore <var>N</var>, poi regola la banda dell\'anello. Ogni cambio, o un colpo con <strong>Disturba</strong>, fa ripartire l\'aggancio al rallentatore: in alto i fasori del riferimento e del VCO diviso per <var>N</var>, al centro la frequenza del VCO nel tempo, in basso i fronti delle due onde. Prova lo stesso disturbo con un anello lento e con uno nervoso.',
      mount: mountLab,
    },
    model,
  });
})(typeof window !== 'undefined' ? window : globalThis);
