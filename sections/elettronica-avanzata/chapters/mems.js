/*
 * Capitolo 8 · Macchine sul silicio (MEMS e sensori).
 * Animazione: uno smartphone si scuote e si inclina; dentro il chip una massa di prova
 * sospesa su molle resta indietro e i pettini di condensatori misurano lo spostamento.
 * Poi il giroscopio (forza di Coriolis), i micro-specchi DLP e il microfono.
 * Laboratorio: accelerometro capacitivo con molle, massa, gas, colpo e capacità differenziali.
 */
(function (root) {
  'use strict';

  const EA = root.EA;
  const TAU = Math.PI * 2;

  /* ---------- modello ---------- */

  const EPS0 = 8.854e-12; // permittività del vuoto, F/m
  const G = 9.80665;      // gravità standard, m/s²
  const RHO_SI = 2330;    // densità del silicio, kg/m³

  const omega0 = (k, m) => Math.sqrt(k / m);
  const resonance = (k, m) => omega0(k, m) / TAU;               // f0 in Hz
  const staticDisp = (a, k, m) => (m * a) / k;                  // m, per accelerazioni lente rispetto a f0
  const dispPerG = (f) => G / Math.pow(TAU * f, 2);             // m per 1 g, data f0
  const plateCap = (area, d) => (EPS0 * area) / d;              // condensatore a facce piane
  const combCap = (n, len, t, d) => n * plateCap(len * t, d);   // n coppie di dita in parallelo
  const quality = (k, m, b) => Math.sqrt(k * m) / b;
  const decayTime = (q, f) => q / (Math.PI * f);                // l'ampiezza scende al 37%
  const coriolis = (m, v, w) => 2 * m * v * w;                  // modulo, con v perpendicolare all'asse
  const driveSpeed = (f, amp) => TAU * f * amp;                 // velocità di picco di un moto sinusoidale
  // Giroscopio: la forza di Coriolis oscilla alla frequenza di pilotaggio fd e spinge il modo di
  // misura, che risuona a fs > fd. Senza smorzamento l'ampiezza è F/(m·(ωs² − ωd²)): circa F/k se fs ≫ fd.
  const senseDisp = (F, m, fd, fs) => F / (m * (Math.pow(TAU * fs, 2) - Math.pow(TAU * fd, 2)));
  const siliconMass = (lx, ly, t) => RHO_SI * lx * ly * t;
  const measured = (u, k, m) => (k / m) * u;                    // accelerazione letta dallo spostamento
  const dcLinear = (c0, d, u) => (2 * c0 * u) / d;              // ΔC per u molto minore di d

  // Pettine differenziale: u è lo spostamento della massa verso le dita dell'elettrodo 1.
  function differential(c0, d, u) {
    const c1 = (c0 * d) / (d - u);
    const c2 = (c0 * d) / (d + u);
    return { c1, c2, dc: c1 - c2, ratio: (c1 - c2) / (c1 + c2) };
  }

  // Moto libero esatto di y'' + 2ζω·y' + ω²·y = 0 dopo un tempo t, per qualunque ζ.
  function free(y0, v0, w, zeta, t) {
    const sg = zeta * w;
    const q = w * w * (zeta * zeta - 1);
    const b = Math.sqrt(Math.abs(q));
    let ec;
    let es;
    if (b * t < 1e-4) {
      const e = Math.exp(-sg * t);
      ec = e * (1 + (q * t * t) / 2);
      es = e * t * (1 + (q * t * t) / 6);
    } else if (q < 0) {
      const e = Math.exp(-sg * t);
      ec = e * Math.cos(b * t);
      es = (e * Math.sin(b * t)) / b;
    } else {
      const p = Math.exp((b - sg) * t);
      const n = Math.exp(-(b + sg) * t);
      ec = (p + n) / 2;
      es = (p - n) / (2 * b);
    }
    return { y: y0 * ec + (v0 + sg * y0) * es, v: v0 * ec - (sg * v0 + w * w * y0) * es };
  }

  // Un passo esatto di m·ü + b·u̇ + k·u = m·a con a costante nel passo dt.
  // p = { k, m, b }, s = { u, v }: con a > 0 la massa resta indietro verso l'elettrodo 1.
  function respond(s, p, a, dt) {
    const w = omega0(p.k, p.m);
    const ueq = a / (w * w);
    const r = free(s.u - ueq, s.v, w, p.b / (2 * Math.sqrt(p.k * p.m)), dt);
    return { u: r.y + ueq, v: r.v };
  }

  // Tempo di assestamento: costante di tempo del modo più lento (Q/(π·f0) se Q ≥ 0,5).
  function settle(k, m, b) {
    const w = omega0(k, m);
    const z = b / (2 * Math.sqrt(k * m));
    return z <= 1 ? 1 / (z * w) : 1 / (w * (z - Math.sqrt(z * z - 1)));
  }

  // Fermi meccanici a ±lim: la massa rimbalza perdendo energia (e = coefficiente di restituzione).
  function bounce(s, lim, e) {
    if (Math.abs(s.u) <= lim) return { u: s.u, v: s.v, hit: false };
    const sg = Math.sign(s.u);
    return { u: sg * lim, v: s.v * sg > 0 ? -e * s.v : s.v, hit: true };
  }

  // Colpo: impulso di accelerazione a mezza sinusoide, di picco peak e durata dur.
  const pulse = (t, peak, dur) => (t >= 0 && t < dur ? peak * Math.sin((Math.PI * t) / dur) : 0);

  const model = {
    EPS0, G, RHO_SI, omega0, resonance, staticDisp, dispPerG, plateCap, combCap, quality, decayTime,
    coriolis, driveSpeed, senseDisp, siliconMass, measured, dcLinear, differential, free, respond, settle, bounce, pulse,
  };

  /* ---------- disegno comune ---------- */

  const C = EA.colors;
  const TINT = C.lime;     // parti mobili, nella tinta del capitolo
  const FIX = '#61786f';   // ancoraggi e statori, fissi sul substrato
  const E1 = C.cyan;       // dita fisse dell'elettrodo 1
  const E2 = C.amber;      // dita fisse dell'elettrodo 2
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const DEG = Math.PI / 180;

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  // Rettangolo con riempimento trasparente e bordo nitido.
  function block(ctx, x, y, w, h, color, fill, lw) {
    ctx.fillStyle = EA.alpha(color, fill);
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 1;
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));
  }

  // Parte fissa sul substrato: blocco scuro tratteggiato.
  function anchor(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = '#18231f';
    ctx.fillRect(x, y, w, h);
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = EA.alpha(FIX, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = -h; k < w; k += 6) { ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h, y); }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = FIX;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function textWidth(ctx, str, size, weight) {
    ctx.save();
    ctx.font = (weight || 600) + ' ' + size + 'px ' + MONO;
    const w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  }

  // Testo su una pastiglia scura, leggibile sopra le strutture.
  function tag(ctx, str, x, y, o) {
    const opt = o || {};
    const size = opt.size || 11;
    const tw = textWidth(ctx, str, size, opt.weight);
    const x0 = opt.align === 'center' ? x - tw / 2 : opt.align === 'right' ? x - tw : x;
    ctx.save();
    ctx.fillStyle = EA.alpha('#060b0a', 0.85);
    rrect(ctx, x0 - 5, y - size, tw + 10, size + 6, 5);
    ctx.fill();
    ctx.restore();
    EA.draw.text(ctx, str, x0, y, { color: opt.color, size, weight: opt.weight });
  }

  // Divide un testo in righe larghe al massimo maxW pixel.
  function wrap(ctx, str, maxW, size) {
    const out = [];
    let cur = '';
    str.split(' ').forEach((word) => {
      const next = cur ? cur + ' ' + word : word;
      if (cur && textWidth(ctx, next, size) > maxW) { out.push(cur); cur = word; } else cur = next;
    });
    if (cur) out.push(cur);
    return out;
  }

  // Numero con il segno sempre scritto: +1,2, −0,5, 0.
  const signed = (x, d) => (Math.abs(x) < 0.5 * Math.pow(10, -d) ? '0' : (x > 0 ? '+' : '') + EA.fmt(x, d));

  // Valore con prefisso SI, ma zero sotto la soglia: quando la massa si ferma niente «0,000001 fm».
  const si0 = (x, unit, floor) => (Math.abs(x) < floor ? '0 n' + unit : EA.si(x, unit));

  // Capacità: sotto il femtofarad si passa agli attofarad (10⁻¹⁸ F), sotto 0,1 aF è zero.
  function farad(c) {
    const a = Math.abs(c);
    if (a < 1e-19) return '0 fF';
    if (a < 0.9995e-15) return EA.fmt(c * 1e18, a < 1e-17 ? 1 : 0) + ' aF';
    return EA.si(c, 'F');
  }

  // Valore tondo della serie 1-2-5, per eccesso (up) o per difetto.
  function nice(x, up) {
    const p = Math.pow(10, Math.floor(Math.log10(x)));
    for (const s of up ? [1, 2, 5, 10] : [10, 5, 2, 1]) if (up ? s * p >= x * 0.9999 : s * p <= x * 1.0001) return s * p;
    return p;
  }

  function dash(ctx, x0, y0, x1, y1, color) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.restore();
  }

  // Molla ripiegata da (x0, y0) a (x1, y1): onda quadra con n pieghe di semiampiezza amp.
  function meander(ctx, x0, y0, x1, y1, n, amp, color, width) {
    const L = Math.hypot(x1 - x0, y1 - y0) || 1;
    const ux = (x1 - x0) / L;
    const uy = (y1 - y0) / L;
    const at = (s, o) => [x0 + ux * s - uy * o, y0 + uy * s + ux * o];
    const lead = Math.min(L * 0.12, 8);
    const step = (L - 2 * lead) / n;
    const pts = [[x0, y0], at(lead, 0)];
    for (let i = 0; i < n; i++) {
      const o = (i % 2 ? -1 : 1) * amp;
      pts.push(at(lead + i * step, o), at(lead + (i + 1) * step, o));
    }
    pts.push(at(L - lead, 0), [x1, y1]);
    EA.draw.line(ctx, pts, color, width || 1.6, false);
  }

  // Luminosità del campo in un gap: cresce come 1/d, proprio come la capacità.
  const field = (g0, g) => EA.clamp(0.06 + (0.2 * g0) / Math.max(g, g0 * 0.15), 0, 0.9);

  // Accelerometro visto dall'alto nel riquadro b. frac: spostamento della massa verso
  // l'elettrodo 1 (a sinistra) in frazioni del gap, già ingrandito. o.hi evidenzia una parte
  // ('massa', 'molle', 'fissi', 'dita') che pulsa con o.pulse; restituisce la geometria.
  function drawAccel(ctx, b, frac, o) {
    const opt = o || {};
    const n = opt.cells || 5;
    const aw = EA.clamp(b.w * 0.055, 9, 22);
    const sl = b.w * 0.14;
    const mw = b.w - 2 * (aw + sl);
    const st = EA.clamp(b.h * 0.05, 5, 12);
    const fz = b.h * 0.25;
    const mh = b.h - 2 * (st + fz);
    const x0 = b.x + aw + sl;
    const my = b.y + st + fz;
    const cy = my + mh / 2;
    const cw = mw / n;
    const fw = cw * 0.15;
    const gap = cw * 0.16;
    const pad = (cw - 3 * fw - 2 * gap) / 2;
    const tip = fz * 0.16;
    const s = -EA.clamp(frac, -0.86, 0.86) * gap;
    const mx = x0 + s;
    const pu = opt.pulse || 0;
    const lit = (part) => (!opt.hi ? 0.92 : opt.hi === part ? 0.8 + 0.2 * pu : 0.42);
    ctx.save();
    ctx.globalAlpha = lit('fissi');
    anchor(ctx, b.x, cy - mh * 0.34, aw, mh * 0.68);
    anchor(ctx, b.x + b.w - aw, cy - mh * 0.34, aw, mh * 0.68);
    anchor(ctx, x0 - sl * 0.35, b.y, mw + sl * 0.7, st);
    anchor(ctx, x0 - sl * 0.35, b.y + b.h - st, mw + sl * 0.7, st);
    // dita fisse, con il campo nei gap che si accende dove le dita si avvicinano
    ctx.globalAlpha = lit('dita');
    const fa = opt.hi === 'dita' ? 0.35 + 0.25 * pu : 0.35;
    for (let i = 0; i < n; i++) {
      const e1 = x0 + i * cw + pad;
      const e2 = e1 + 2 * fw + 2 * gap;
      const mf = e1 + fw + gap + s;
      [[b.y + st, my - tip, b.y + st + tip], [my + mh + tip, b.y + b.h - st, my + mh + tip]].forEach(([y0, y1, gy]) => {
        ctx.fillStyle = EA.alpha(E1, field(gap, mf - e1 - fw));
        ctx.fillRect(e1 + fw, gy, Math.max(0, mf - e1 - fw), fz - 2 * tip);
        ctx.fillStyle = EA.alpha(E2, field(gap, e2 - mf - fw));
        ctx.fillRect(mf + fw, gy, Math.max(0, e2 - mf - fw), fz - 2 * tip);
        block(ctx, e1, y0, fw, y1 - y0, E1, fa);
        block(ctx, e2, y0, fw, y1 - y0, E2, fa);
      });
      block(ctx, mf, b.y + st + tip, fw, fz - tip, TINT, 0.5);
      block(ctx, mf, my + mh, fw, fz - tip, TINT, 0.5);
    }
    // molle ripiegate tra ancoraggi e massa
    ctx.globalAlpha = lit('molle');
    const lw = opt.hi === 'molle' ? 2 + pu : 1.7;
    meander(ctx, b.x + aw, cy, mx, cy, 5, mh * 0.3, TINT, lw);
    meander(ctx, mx + mw, cy, b.x + b.w - aw, cy, 5, mh * 0.3, TINT, lw);
    // massa di prova, con i fori che servono a liberarla dallo strato sacrificale
    ctx.globalAlpha = lit('massa');
    block(ctx, mx, my, mw, mh, TINT, opt.hi === 'massa' ? 0.16 + 0.16 * pu : 0.15, opt.hi === 'massa' ? 2 : 1.3);
    const hs = EA.clamp(mh / 4.2, 8, 15);
    const hz = Math.max(2, hs * 0.32);
    ctx.fillStyle = '#08110e';
    for (let yy = my + hs / 2; yy < my + mh - hz; yy += hs) {
      for (let xx = mx + hs / 2; xx < mx + mw - hz; xx += hs) ctx.fillRect(xx - hz / 2, yy - hz / 2, hz, hz);
    }
    ctx.restore();
    return { mx, my, mw, mh, cy };
  }

  // Barre di C1 e C2 intorno a C0 (scarto massimo ±fs): verticali, oppure orizzontali (flat).
  function capBars(ctx, b, c1, c2, c0, fs, flat) {
    const dv = (c) => EA.clamp((c - c0) / fs, -1, 1);
    const bw = b.w - 112;
    const mid = b.y + b.h / 2;
    const zero = 'C₀ ' + EA.si(c0, 'F');
    // colonne verticali: passo e larghezza si stringono quando a destra resta poco spazio
    const pitch = EA.clamp((b.w - textWidth(ctx, zero, 10.5) - 22) / 2, 56, 70);
    const cw = Math.round(pitch * 0.58);
    [[c1, E1, 'C₁'], [c2, E2, 'C₂']].forEach(([c, col, nm], i) => {
      ctx.fillStyle = EA.alpha(col, 0.12);
      if (flat) {
        const y = b.y + i * 22;
        const d = dv(c) * (bw / 2);
        EA.draw.text(ctx, nm, b.x, y + 4, { color: col, size: 11, weight: 700 });
        ctx.fillRect(b.x + 26, y - 7, bw, 13);
        block(ctx, b.x + 26 + bw / 2 + Math.min(0, d), y - 7, Math.max(2, Math.abs(d)), 13, col, 0.55);
        EA.draw.text(ctx, EA.si(c, 'F', 4), b.x + b.w, y + 4, { color: C.ink, size: 10.5, align: 'right' });
        return;
      }
      const x = b.x + 6 + i * pitch;
      const d = dv(c) * (b.h / 2);
      ctx.fillRect(x, b.y, cw, b.h);
      block(ctx, x, mid - Math.max(0, d), cw, Math.max(2, Math.abs(d)), col, 0.55);
      EA.draw.text(ctx, nm, x + cw / 2, b.y + b.h + 18, { color: col, size: 12, weight: 700, align: 'center' });
      EA.draw.text(ctx, EA.si(c, 'F', 4), x + cw / 2, b.y + b.h + 34, { color: C.ink, size: 10.5, align: 'center' });
    });
    ctx.fillStyle = EA.alpha(C.ink, 0.7);
    if (flat) { ctx.fillRect(b.x + 26 + bw / 2, b.y - 10, 1, 38); return; }
    const lx = b.x + 6 + pitch + cw + 12;
    ctx.fillRect(b.x, mid, lx - b.x - 6, 1);
    EA.draw.text(ctx, '+' + EA.si(fs, 'F'), lx, b.y + 9, { color: C.dim, size: 10.5 });
    EA.draw.text(ctx, zero, lx, mid + 4, { color: C.text, size: 10.5 });
    EA.draw.text(ctx, '−' + EA.si(fs, 'F'), lx, b.y + b.h, { color: C.dim, size: 10.5 });
  }

  // Smartphone stilizzato: centro (x, y), altezza ph, rotazione rot (oraria, in radianti).
  // Con down mostra sullo schermo una freccia che indica sempre il basso.
  // Restituisce centro e lato del chip MEMS in coordinate del canvas.
  function drawPhone(ctx, x, y, ph, rot, down) {
    const pw = ph * 0.5;
    const cyc = ph * 0.2;
    const cs = Math.max(8, ph * 0.1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    rrect(ctx, -pw / 2, -ph / 2, pw, ph, ph * 0.09);
    ctx.fillStyle = '#16211e';
    ctx.fill();
    ctx.strokeStyle = '#557067';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const sg = ctx.createLinearGradient(0, -ph / 2, 0, ph / 2);
    sg.addColorStop(0, '#13302a');
    sg.addColorStop(1, '#0a1613');
    ctx.fillStyle = sg;
    rrect(ctx, -pw / 2 + 4, -ph / 2 + 11, pw - 8, ph - 22, ph * 0.05);
    ctx.fill();
    ctx.fillStyle = '#557067';
    ctx.beginPath(); ctx.arc(0, -ph / 2 + 6, Math.max(1.5, ph * 0.012), 0, TAU); ctx.fill();
    if (down) {
      ctx.translate(0, -ph * 0.13);
      ctx.rotate(-rot);
      EA.draw.arrow(ctx, 0, -ph * 0.11, 0, ph * 0.11, C.ink, 2, 7);
      ctx.rotate(rot);
      ctx.translate(0, ph * 0.13);
    }
    ctx.fillStyle = '#0b1210';
    ctx.fillRect(-cs / 2, cyc - cs / 2, cs, cs);
    ctx.strokeStyle = TINT;
    ctx.lineWidth = 1.3;
    ctx.strokeRect(-cs / 2 + 0.5, cyc - cs / 2 + 0.5, cs - 1, cs - 1);
    ctx.restore();
    return { x: x - Math.sin(rot) * cyc, y: y + Math.cos(rot) * cyc, s: cs };
  }

  // Riquadro del chip ingrandito; sugli schermi larghi il cono dello zoom parte dal chip del telefono.
  function zoomFrame(ctx, chip, r, wide, a) {
    const cx = chip.x + chip.s / 2;
    const c = EA.alpha(TINT, 0.45);
    ctx.save();
    ctx.globalAlpha = a;
    if (wide) {
      ctx.fillStyle = EA.alpha(TINT, 0.045);
      ctx.beginPath();
      ctx.moveTo(cx, chip.y - chip.s / 2); ctx.lineTo(r.x, r.y); ctx.lineTo(r.x, r.y + r.h); ctx.lineTo(cx, chip.y + chip.s / 2);
      ctx.fill();
      dash(ctx, cx, chip.y - chip.s / 2, r.x, r.y, c);
      dash(ctx, cx, chip.y + chip.s / 2, r.x, r.y + r.h, c);
    } else dash(ctx, chip.x, chip.y + chip.s / 2, r.x + 14, r.y, c);
    ctx.fillStyle = '#0c1613';
    ctx.strokeStyle = EA.alpha(TINT, 0.3);
    ctx.lineWidth = 1;
    rrect(ctx, r.x, r.y, r.w, r.h, Math.min(10, r.w / 4));
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Quadratino di legenda, a due colori per le dita fisse.
  function swatch(ctx, x, y, c1, c2) {
    block(ctx, x, y, 10, 10, c1, 0.35);
    if (c2) block(ctx, x + 5, y, 5, 10, c2, 0.35);
  }

  // Sezione di un capello umano (circa 70 µm), come riferimento di scala.
  function hair(ctx, x, y, r) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, EA.alpha(C.orange, 0.5));
    g.addColorStop(1, EA.alpha(C.orange, 0.12));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = EA.alpha(C.orange, 0.8);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Giroscopio visto dall'alto. xd: pilotaggio lungo x (−1…1); ys: spinta di Coriolis lungo y
  // (−1…1); vx: velocità di pilotaggio (−1…1); trail: percorso recente del centro.
  function drawGyro(ctx, b, xd, ys, vx, trail, labels) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const mw = b.w * 0.36;
    const mh = b.h * 0.42;
    const ax = b.w * 0.075;
    const ay = b.h * 0.075;
    const mx = cx - mw / 2 + xd * ax;
    const my = cy - mh / 2 + ys * ay;
    // elettrodi di misura sopra e sotto: sentono lo spostamento lungo y
    const ew = mw * 0.84;
    const eh = Math.max(5, b.h * 0.035);
    const ey = cy - mh / 2 - b.h * 0.09 - eh;
    block(ctx, cx - ew / 2, ey, ew, eh, C.pink, 0.3);
    block(ctx, cx - ew / 2, 2 * cy - ey - eh, ew, eh, C.pink, 0.3);
    // pettini di pilotaggio: dita fisse e dita della massa, che vibra lungo x
    const fh = Math.max(3, mh * 0.06);
    [-1, 1].forEach((sd) => {
      const sx = cx + sd * b.w * 0.47 - (sd > 0 ? 8 : 0);
      anchor(ctx, sx, cy - mh * 0.45, 8, mh * 0.9);
      const inner = sd < 0 ? sx + 8 : sx;
      const len = Math.abs(cx + (sd * mw) / 2 - inner) * 0.68;
      const edge = sd < 0 ? mx : mx + mw;
      for (let j = 0; j < 4; j++) {
        const fy = cy - mh * 0.33 + j * mh * 0.22 - fh / 2;
        block(ctx, Math.min(inner, inner - sd * len), fy, len, fh, FIX, 0.4);
        if (j < 3) block(ctx, Math.min(edge, edge + sd * len), fy + mh * 0.11 + ys * ay, len, fh, TINT, 0.45);
      }
    });
    // ancoraggi agli angoli e molle che lasciano muovere la massa sia in x sia in y
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      const px = cx + sx * b.w * 0.3;
      const py = cy + sy * b.h * 0.34;
      anchor(ctx, px - 7, py - 7, 14, 14);
      meander(ctx, px - sx * 7, py - sy * 7, sx < 0 ? mx : mx + mw, sy < 0 ? my : my + mh, 4, 5, TINT, 1.5);
    });
    block(ctx, mx, my, mw, mh, TINT, 0.16, 1.4);
    // percorso del centro: una riga se il chip è fermo, un'ellisse se ruota
    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = EA.alpha(C.violet, 0.9);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    trail.forEach((p, i) => (i ? ctx.lineTo(cx + p[0] * ax, cy + p[1] * ay) : ctx.moveTo(cx + p[0] * ax, cy + p[1] * ay)));
    ctx.stroke();
    ctx.restore();
    const mcx = mx + mw / 2;
    const mcy = my + mh / 2;
    const vl = vx * b.w * 0.12;
    const fl = ys * b.h * 0.19;
    EA.draw.arrow(ctx, mcx, mcy, mcx + vl, mcy, TINT, 2.5, 9);
    if (Math.abs(ys) > 0.06) EA.draw.arrow(ctx, mcx, mcy, mcx, mcy + fl, C.pink, 2.5, 9);
    EA.draw.dot(ctx, mcx, mcy, 3, C.ink);
    if (!labels) return;
    tag(ctx, 'pilotaggio', b.x + b.w * 0.03, cy + mh * 0.45 + 20, { color: C.text, size: 10.5 });
    tag(ctx, 'elettrodi di misura', cx, ey - 8, { color: C.pink, size: 10.5, align: 'center' });
    tag(ctx, 'v', mcx + vl + (vx > 0 ? 8 : -16), mcy + 4, { color: TINT, size: 11, weight: 700 });
    if (Math.abs(ys) > 0.25) tag(ctx, 'F', mcx + 8, mcy + fl + 4, { color: C.pink, size: 11, weight: 700 });
  }

  // Micro-specchi DLP visti di lato: a +12° la luce va nella lente (pixel acceso),
  // a −12° viene deviata di lato (pixel spento).
  const PATTERNS = ['101101', '110011', '011110', '100110', '111001', '010111'];
  const SIN24 = Math.sin(24 * DEG);
  const COS24 = Math.cos(24 * DEG);

  function drawDLP(ctx, v, tt, narrow) {
    const n = narrow ? 5 : 6;
    const k0 = Math.floor(tt / 1.2);
    const cur = PATTERNS[k0 % 6];
    const prev = PATTERNS[(k0 + 5) % 6];
    const k = EA.smooth((tt - k0 * 1.2) / 0.16);
    const x0 = v.x + v.w * (narrow ? 0.14 : 0.22);
    const x1 = v.x + v.w - 10;
    const sp = (x1 - x0) / n;
    const my = v.y + v.h - 14;
    const topY = v.y + (narrow ? 14 : 22);
    const lensY = topY + (narrow ? 26 : v.h * 0.3);
    EA.draw.text(ctx, 'MICRO-SPECCHI DLP', v.x, v.y + 4, { color: C.ink, size: 10.5, weight: 700 });
    ctx.fillStyle = EA.alpha(C.ink, 0.08);
    ctx.strokeStyle = EA.alpha(C.ink, 0.5);
    ctx.beginPath();
    ctx.ellipse((x0 + x1) / 2, lensY, (x1 - x0) / 2 + 4, narrow ? 4 : 6, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const tilt = EA.lerp(prev[i] === '1' ? 12 : -12, cur[i] === '1' ? 12 : -12, k) * DEG;
      const on = EA.clamp((tilt / DEG + 4) / 16, 0, 1);
      const cx = x0 + sp * (i + 0.5);
      const R = (my - lensY - 12) / COS24;
      EA.draw.line(ctx, [[cx - SIN24 * R, my - COS24 * R], [cx, my]], EA.alpha(C.amber, 0.45), 1.2, false);
      // riflessione su uno specchio di normale (−sin τ, −cos τ)
      const nx = -Math.sin(tilt);
      const ny = -Math.cos(tilt);
      const d = SIN24 * nx + COS24 * ny;
      const ox = SIN24 - 2 * d * nx;
      const oy = COS24 - 2 * d * ny;
      const reach = Math.min((my - lensY) / -oy, ox > 0.05 ? (x1 + 6 - cx) / ox : Infinity);
      EA.draw.line(ctx, [[cx, my], [cx + ox * reach, my + oy * reach]], EA.alpha(C.amber, 0.2 + 0.65 * on), 1.2 + on, on > 0.5);
      if (on > 0.5) EA.draw.line(ctx, [[cx, lensY], [cx, topY + 8]], EA.alpha(C.amber, 0.85 * on), 2);
      block(ctx, cx - sp * 0.3, topY, sp * 0.6, narrow ? 8 : 12, on > 0.5 ? C.amber : C.grid, on > 0.5 ? 0.8 : 0.3);
      ctx.fillStyle = FIX;
      ctx.fillRect(cx - 1.5, my, 3, 8);
      const L = sp * 0.4;
      EA.draw.line(ctx, [[cx - Math.cos(tilt) * L, my + Math.sin(tilt) * L], [cx + Math.cos(tilt) * L, my - Math.sin(tilt) * L]], on > 0.5 ? TINT : C.dim, 3, on > 0.5);
    }
    ctx.fillStyle = '#1d2b27';
    ctx.fillRect(x0 - 6, my + 8, x1 - x0 + 12, 3);
    if (narrow) return;
    EA.draw.text(ctx, 'schermo', x0 - 12, topY + 10, { color: C.dim, size: 10.5, align: 'right' });
    EA.draw.text(ctx, 'lente', x0 - 12, lensY + 4, { color: C.dim, size: 10.5, align: 'right' });
    EA.draw.text(ctx, 'luce', x0 + sp / 2 - SIN24 * ((my - lensY - 12) / COS24) - 6, lensY + 16, { color: C.amber, size: 10.5, align: 'right' });
    EA.draw.text(ctx, 'specchi da 5 a 14 µm, inclinati di ±12°', x0 - 6, my + 26, { color: C.text, size: 10.5 });
  }

  // Microfono MEMS in sezione: la membrana vibra con il suono davanti a una piastra forata.
  function drawMic(ctx, v, tt, narrow) {
    const p = Math.sin(TAU * 0.9 * tt);
    const x0 = v.x + 4;
    const x1 = v.x + v.w * 0.62;
    const cw = (x1 - x0) * 0.46;
    const ca = (x0 + x1 - cw) / 2;
    const yd = v.y + v.h * 0.5;
    const dh = v.h * 0.3;
    const gm = Math.max(8, v.h * 0.07);
    EA.draw.text(ctx, 'MICROFONO MEMS', v.x, v.y + 4, { color: C.ink, size: 10.5, weight: 700 });
    // onde sonore che arrivano dal basso
    for (let j = 0; j < 3; j++) {
      const f = (tt * 0.9 + j / 3) % 1;
      ctx.strokeStyle = EA.alpha(C.cyan, 0.55 * (1 - f));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ca + cw / 2, yd + dh + 6, f * dh * 1.05 + 4, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    anchor(ctx, x0, yd, ca - x0, dh);
    anchor(ctx, ca + cw, yd, x1 - ca - cw, dh);
    // piastra forata (ferma) e membrana, che si piega con la pressione del suono
    ctx.fillStyle = EA.alpha(C.cyan, 0.45);
    for (let xx = ca - 6; xx < ca + cw + 6; xx += 10) ctx.fillRect(xx, yd - gm - 5, 7, 5);
    ctx.fillStyle = FIX;
    ctx.fillRect(ca - 8, yd - gm - 5, 3, gm + 5);
    ctx.fillRect(ca + cw + 5, yd - gm - 5, 3, gm + 5);
    const pts = [];
    for (let i = 0; i <= 24; i++) pts.push([ca + (i / 24) * cw, yd - p * gm * 0.55 * Math.sin((Math.PI * i) / 24)]);
    EA.draw.line(ctx, pts, TINT, 2.2);
    // segnale in uscita: la capacità segue la distanza tra membrana e piastra
    const sx0 = x1 + (narrow ? 12 : 20);
    const sx1 = v.x + v.w - 6;
    const sh = Math.min(v.h * 0.2, 34);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx0 + 0.5, yd - sh - 0.5, sx1 - sx0, sh * 2);
    EA.draw.fn(ctx, sx0 + 2, sx1 - 2, (xx) => yd - 0.8 * sh * Math.sin(TAU * 0.9 * tt - ((sx1 - 2 - xx) / (sx1 - sx0)) * TAU * 1.6), TINT, 1.6, 2);
    EA.draw.dot(ctx, sx1 - 2, yd - 0.8 * sh * p, 3, TINT);
    EA.draw.text(ctx, 'segnale', sx0, yd - sh - 8, { color: C.text, size: 10.5 });
    if (narrow) return;
    EA.draw.text(ctx, 'piastra forata', ca + cw / 2, yd - gm - 14, { color: C.cyan, size: 10.5, align: 'center' });
    tag(ctx, 'membrana ≈ 1 µm', ca + cw / 2, yd + 22, { color: TINT, size: 10.5, align: 'center' });
    EA.draw.text(ctx, 'suono', ca + cw / 2, yd + dh + 22, { color: C.cyan, size: 10.5, align: 'center' });
    EA.draw.text(ctx, 'la distanza cambia di poco: cambia C', v.x, v.y + v.h - 4, { color: C.text, size: 10.5 });
  }

  /* ---------- animazione principale ---------- */

  // Sensori dell'animazione: accelerometro da 5 kHz; giroscopio pilotato a 20 kHz,
  // con il modo di misura accordato poco sopra, a 22 kHz.
  const ACC = { k: 2, m: 2e-9, d: 2e-6, c0: combCap(50, 100e-6, 20e-6, 2e-6) };
  const GYRO = { m: 1e-9, f: 20e3, fs: 22e3, amp: 5e-6 };
  const MAG = 100; // ingrandimento degli spostamenti nel disegno
  const LEGEND = [
    { part: 'massa', c: TINT, t: 'massa di prova, circa 2 µg', s: 'massa' },
    { part: 'molle', c: TINT, t: 'molle ripiegate', s: 'molle' },
    { part: 'fissi', c: FIX, t: 'ancoraggi fissi al substrato', s: 'ancoraggi' },
    { part: 'dita', c: E1, c2: E2, t: 'dita fisse di C₁ e di C₂', s: 'dita C₁ C₂' },
  ];

  function mountHero(view, api) {
    const cv = api.canvas(view, { label: 'Uno smartphone si scuote e si inclina; dentro il suo chip una massa di silicio sospesa su molle resta indietro e i pettini di condensatori misurano di quanto si è spostata. Poi un giroscopio che sente la rotazione, i micro-specchi di un proiettore e la membrana di un microfono.' });
    const STAGES = [
      { key: 'massa', dur: 8, still: 6.2, title: 'UNA MASSA SU MOLLE', sub: 'struttura di silicio vista dall\'alto, larga circa mezzo millimetro e spessa 20 µm' },
      { key: 'accelera', dur: 9, still: 2.1, title: 'IL CHIP ACCELERA', sub: 'la massa resta indietro per inerzia: x = m·a/k, circa 10 nm per ogni g' },
      { key: 'pettini', dur: 9, still: 3.375, title: 'I PETTINI MISURANO', sub: 'da un lato le dita si avvicinano e C₁ sale, dall\'altro si allontanano e C₂ scende' },
      { key: 'giroscopio', dur: 10, still: 3.5, title: 'IL GIROSCOPIO', sub: 'la massa vibra lungo x; se il chip ruota, la forza di Coriolis la spinge lungo y' },
      { key: 'specchi', dur: 10, still: 1, title: 'SPECCHI E MICROFONI', sub: 'micro-specchi DLP che si inclinano di ±12° e una membrana che vibra con il suono' },
    ];
    const F0 = resonance(ACC.k, ACC.m);
    const VD = driveSpeed(GYRO.f, GYRO.amp);
    const CFS = nice(ACC.c0 / MAG, true);
    const PSI = 60 * DEG;
    let stage = 0;
    let stageT = api.reduced ? STAGES[0].still : 0;
    const wrapped = {};

    // Righe del sottotitolo della fase i (al massimo tre), calcolate una volta per larghezza.
    function subLines(i, w, size) {
      const key = i + '|' + w + '|' + size;
      return wrapped[key] || (wrapped[key] = wrap(cv.ctx, STAGES[i].sub, w - 32, size).slice(0, 3));
    }

    function geometry() {
      const w = cv.w;
      const hh = cv.h;
      if (w >= 560 && hh <= w * 0.9) {
        const bw = Math.min(w * 0.47, (hh - 124) * 1.5);
        const by = Math.max(84, (hh - bw / 1.5) / 2 + 14);
        return {
          w, hh, narrow: false, sc: bw / 520,
          box: { x: w * 0.265, y: by, w: bw, h: bw / 1.5 },
          phone: { x: w * 0.125, y: by + bw * 0.37, h: Math.min(hh * 0.46, w * 0.2) },
          info: { x: w * 0.775, y: by, w: w * 0.225 - 18, h: bw / 1.5 },
        };
      }
      // sugli schermi stretti tutto scende se un sottotitolo va su tre righe
      const top = 36 + 14 * Math.max(...STAGES.map((S, i) => subLines(i, w, 10.5).length));
      const k = EA.clamp(w / 358, 1, 1.6);
      const band = 112 * k;
      const by = top + band + 18;
      const bw = Math.min(w - 40, (hh - by - 34) * 1.6);
      const bh = Math.min(hh - by - 34, bw / 1.3);
      return {
        w, hh, narrow: true, sc: bw / 520,
        box: { x: (w - bw) / 2, y: by + (hh - by - 34 - bh) / 2, w: bw, h: bh },
        phone: { x: 56 * k, y: top + band / 2, h: 92 * k },
        info: { x: 116 * k, y: top + 4, w: w - 116 * k - 14, h: band - 8 },
      };
    }

    function header(ctx, g) {
      const S = STAGES[stage];
      const size = g.narrow ? 10.5 : 11;
      EA.draw.text(ctx, (stage + 1) + ' · ' + S.title, 16, g.narrow ? 20 : 26, { color: C.ink, size: g.narrow ? 11 : 12, weight: 700 });
      subLines(stage, g.w, size).forEach((ln, k) => EA.draw.text(ctx, ln, 16, (g.narrow ? 36 : 44) + k * 14, { color: C.dim, size }));
    }

    // Numeri a destra (in alto, accanto al telefono, sugli schermi stretti): { k, v, c, big },
    // con chiave e valore brevi (s, sv) per quando la riga non ci sta.
    function rows(ctx, g, list, y0) {
      const I = g.info;
      let y = y0 || I.y + 12;
      const fits = (k, v) => textWidth(ctx, k, 10.5) + textWidth(ctx, v, 11.5, 700) + 10 <= I.w;
      list.forEach((r) => {
        if (g.narrow) {
          const key = fits(r.k, r.v) || !r.s ? r.k : r.s;
          const val = fits(key, r.v) || !r.sv ? r.v : r.sv;
          EA.draw.text(ctx, key, I.x, y, { color: C.dim, size: 10.5 });
          EA.draw.text(ctx, val, I.x + I.w, y, { color: r.c || C.ink, size: 11.5, weight: 700, align: 'right' });
          y += 20;
          return;
        }
        EA.draw.text(ctx, r.k, I.x, y, { color: C.dim, size: 10.5, weight: 700 });
        EA.draw.text(ctx, r.v, I.x, y + (r.big ? 24 : 20), { color: r.c || C.ink, size: r.big ? 19 : 13, weight: 700 });
        y += r.big ? 58 : 46;
      });
    }

    function note(ctx, g, str, short) {
      const b = g.box;
      const s = short && textWidth(ctx, str, 10.5) > g.w - 16 ? short : str;
      EA.draw.text(ctx, s, b.x + b.w / 2, Math.min(g.hh - 8, b.y + b.h + 28), { color: C.dim, size: 10.5, align: 'center' });
    }

    function frameOf(b) {
      return { x: b.x - 10, y: b.y - 10, w: b.w + 20, h: b.h + 20 };
    }

    // Fasi 1-3: l'accelerometro dentro il telefono.
    function accelStage(ctx, g, key, tt) {
      const b = g.box;
      const I = g.info;
      const n = g.narrow;
      let ag = 0;
      let rot = 0;
      let dx = 0;
      if (key === 'accelera') {
        dx = g.phone.h * 0.12 * Math.sin((TAU * tt) / 2.8);
        ag = -1.2 * Math.sin((TAU * tt) / 2.8);
      } else if (key === 'pettini') {
        rot = 40 * DEG * Math.sin((TAU * tt) / 4.5);
        ag = -Math.sin(rot);
      }
      const u = staticDisp(ag * G, ACC.k, ACC.m);
      const chip = drawPhone(ctx, g.phone.x + dx, g.phone.y, g.phone.h, rot, key === 'pettini');
      // lo zoom: il riquadro cresce dal chip del telefono fino alla vista ingrandita
      const z = key === 'massa' ? EA.ease.inOut(tt / 1.3) : 1;
      const show = key === 'massa' ? EA.smooth((tt - 0.9) / 0.6) : 1;
      const F = frameOf(b);
      const s0 = { x: chip.x - chip.s / 2, y: chip.y - chip.s / 2, w: chip.s, h: chip.s };
      zoomFrame(ctx, chip, { x: EA.lerp(s0.x, F.x, z), y: EA.lerp(s0.y, F.y, z), w: EA.lerp(s0.w, F.w, z), h: EA.lerp(s0.h, F.h, z) }, !n, 0.3 + 0.7 * z);
      const hi = key === 'massa' && tt > 1.6 && tt < 6 ? LEGEND[Math.min(3, Math.floor((tt - 1.6) / 1.1))].part : null;
      ctx.save();
      ctx.globalAlpha = show;
      const geo = drawAccel(ctx, b, (u / ACC.d) * MAG, { cells: n ? 4 : 5, hi, pulse: 0.5 - 0.5 * Math.cos(TAU * 1.8 * tt) });
      ctx.restore();
      const mcx = geo.mx + geo.mw / 2;

      if (key === 'massa') {
        if (show > 0.5) tag(ctx, 'massa di prova', mcx, geo.cy + 4, { color: TINT, size: 11, align: 'center' });
        note(ctx, g, 'dita e spazi tra le dita ingranditi per chiarezza', 'dita e spazi ingranditi per chiarezza');
        EA.draw.text(ctx, 'f₀ = √(k/m)/2π ≈ ' + EA.si(F0, 'Hz', 2), I.x, I.y + (n ? 10 : 144), { color: TINT, size: n ? 11 : 12, weight: 700 });
        if (!n) {
          EA.draw.text(ctx, 'COM\'È FATTO', I.x, I.y + 8, { color: C.dim, size: 10.5, weight: 700 });
          EA.draw.text(ctx, 'con k = 2 N/m e m = 2 µg', I.x, I.y + 162, { color: C.dim, size: 10.5 });
        }
        LEGEND.forEach((it, i) => {
          const x = n ? I.x + (i % 2) * (I.w / 2) : I.x;
          const y = I.y + 32 + (n ? Math.floor(i / 2) * 18 : i * 22);
          swatch(ctx, x, y - 9, it.c, it.c2);
          EA.draw.text(ctx, n ? it.s : it.t, x + (n ? 15 : 18), y, { color: hi === it.part ? C.ink : C.text, size: n ? 10.5 : 11, weight: hi === it.part ? 700 : 600 });
        });
        // la scala: un capello e 100 µm, alla stessa scala della struttura
        const r = 35 * g.sc;
        const hy = (n ? I.y + 58 : I.y + 196) + r;
        const hx = I.x + 2 * r + (n ? 8 : 12);
        hair(ctx, I.x + r, hy, r);
        if (n) {
          // su una riga se ci sta, altrimenti su due
          if (hx + textWidth(ctx, 'un capello: circa 70 µm', 10.5) <= g.w - 8) EA.draw.text(ctx, 'un capello: circa 70 µm', hx, hy + 4, { color: C.orange, size: 10.5 });
          else {
            EA.draw.text(ctx, 'un capello:', hx, hy - 3, { color: C.orange, size: 10.5 });
            EA.draw.text(ctx, 'circa 70 µm', hx, hy + 11, { color: C.orange, size: 10.5 });
          }
          return;
        }
        EA.draw.text(ctx, 'un capello:', hx, hy - 3, { color: C.orange, size: 11 });
        EA.draw.text(ctx, 'circa 70 µm', hx, hy + 13, { color: C.orange, size: 11 });
        const sy = hy + r + 26;
        const bl = 100 * g.sc;
        ctx.strokeStyle = C.text;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(I.x, sy - 4); ctx.lineTo(I.x, sy + 4); ctx.moveTo(I.x, sy); ctx.lineTo(I.x + bl, sy); ctx.moveTo(I.x + bl, sy - 4); ctx.lineTo(I.x + bl, sy + 4);
        ctx.stroke();
        EA.draw.text(ctx, '100 µm', I.x + bl + 8, sy + 4, { color: C.text, size: 10.5 });
        return;
      }

      note(ctx, g, 'spostamenti ingranditi ' + MAG + ' volte');
      if (key === 'accelera') {
        // l'accelerazione del telefono e la massa che resta indietro
        const ay = g.phone.y - g.phone.h / 2 - (n ? 9 : 16);
        const px = g.phone.x + dx;
        if (Math.abs(ag) > 0.08) {
          EA.draw.arrow(ctx, px, ay, px + ag * 36, ay, TINT, 2.4, 8);
          EA.draw.arrow(ctx, mcx, geo.cy + 6, mcx - Math.sign(ag) * Math.min(70, Math.abs(ag) * 56), geo.cy + 6, C.ink, 2.4, 9);
        }
        if (n) EA.draw.text(ctx, 'a', px - Math.sign(ag || 1) * 10, ay + 4, { color: TINT, size: 11, weight: 700, align: 'center' });
        else EA.draw.text(ctx, 'a', px, ay - 8, { color: TINT, size: 11, weight: 700, align: 'center' });
        tag(ctx, 'la massa resta indietro', mcx, geo.my + 18, { color: C.ink, size: 10.5, align: 'center' });
        rows(ctx, g, [
          { k: 'ACCELERAZIONE DEL CHIP', s: 'ACCELERAZIONE', v: signed(ag, 2) + ' g', c: TINT, big: true },
          { k: 'SPOSTAMENTO x = m·a/k', s: 'SPOSTAMENTO', v: si0(u, 'm', 1e-12) },
          { k: 'FORZA DELLE MOLLE k·x', s: 'FORZA k·x', v: si0(ACC.k * u, 'N', 1e-12) },
        ]);
        return;
      }

      // i pettini: C1 e C2 cambiano in verso opposto intorno a C0
      const cc = differential(ACC.c0, ACC.d, u);
      if (n) {
        capBars(ctx, { x: I.x, y: I.y + 12, w: I.w }, cc.c1, cc.c2, ACC.c0, CFS, true);
        rows(ctx, g, [{ k: 'ΔC = C₁ − C₂', s: 'ΔC', v: signed(cc.dc * 1e15, 2) + ' fF', c: TINT }, { k: 'INCLINAZIONE', v: signed(-rot / DEG, 0) + '°' }], I.y + 64);
        return;
      }
      EA.draw.text(ctx, 'CAPACITÀ DEI PETTINI', I.x, I.y + 8, { color: C.dim, size: 10.5, weight: 700 });
      capBars(ctx, { x: I.x, y: I.y + 26, w: I.w, h: Math.min(120, b.h * 0.34) }, cc.c1, cc.c2, ACC.c0, CFS, false);
      rows(ctx, g, [
        { k: 'ΔC = C₁ − C₂', v: signed(cc.dc * 1e15, 2) + ' fF', c: TINT },
        { k: 'INCLINAZIONE', v: signed(-rot / DEG, 0) + '°  →  ' + signed(ag, 2) + ' g' },
      ], I.y + Math.min(120, b.h * 0.34) + 92);
    }

    // Fase 4: il giroscopio. ψ è la rotazione antioraria del telefono, Ω la sua velocità.
    function gyroStage(ctx, g, tt, fade) {
      const b = g.box;
      const bump = (x) => (x <= 0 || x >= 1 ? 0 : 6 * x * (1 - x));
      const omAt = (s) => (PSI * (bump((s - 2) / 3) - bump((s - 5.5) / 3))) / 3;
      const om = omAt(tt);
      const omPk = PSI * 0.5;
      const drive = (s) => [Math.sin(TAU * 1.1 * s), (omAt(s) / omPk) * Math.cos(TAU * 1.1 * s)];
      const chip = drawPhone(ctx, g.phone.x, g.phone.y, g.phone.h, -PSI * (EA.smooth((tt - 2) / 3) - EA.smooth((tt - 5.5) / 3)));
      if (Math.abs(om) > 0.02) {
        const r = g.phone.h * 0.62;
        const a = -Math.PI / 2 + (om > 0 ? -0.55 : 0.55);
        const sg = om > 0 ? 1 : -1;
        const ex = g.phone.x + r * Math.cos(a);
        const ey = g.phone.y + r * Math.sin(a);
        ctx.save();
        ctx.globalAlpha = EA.clamp((Math.abs(om) / omPk) * 1.5, 0, 1);
        ctx.strokeStyle = C.violet;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(g.phone.x, g.phone.y, r, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); ctx.stroke();
        EA.draw.arrow(ctx, ex - sg * Math.sin(a) * 8, ey + sg * Math.cos(a) * 8, ex, ey, C.violet, 2, 8);
        EA.draw.text(ctx, 'Ω', g.phone.x + r * 0.52 + 8, g.phone.y - r * 0.85 + 4, { color: C.violet, size: 12, weight: 700 });
        ctx.restore();
      }
      zoomFrame(ctx, chip, frameOf(b), !g.narrow, fade);
      const trail = [];
      for (let j = 40; j >= 0; j--) trail.push(drive(tt - j * 0.022));
      const d = drive(tt);
      ctx.save();
      ctx.globalAlpha = fade;
      drawGyro(ctx, b, d[0], d[1], Math.cos(TAU * 1.1 * tt), trail, !g.narrow);
      ctx.restore();
      note(ctx, g, g.narrow ? 'moto ingrandito e molto rallentato' : 'moto ingrandito e rallentato: in realtà 20 000 vibrazioni al secondo');
      const f = coriolis(GYRO.m, VD, Math.abs(om));
      rows(ctx, g, [
        { k: 'ROTAZIONE Ω', v: EA.fmt(Math.abs(om) / DEG, 0) + ' °/s', c: C.violet, big: true },
        { k: g.narrow ? 'CORIOLIS 2·m·v·Ω' : 'FORZA DI CORIOLIS 2·m·v·Ω', s: 'CORIOLIS', v: EA.fmt(f * 1e9, 2) + ' nN', c: C.pink },
        { k: g.narrow ? 'SPOSTAMENTO' : 'SPOSTAMENTO DI LATO', v: EA.fmt(senseDisp(f, GYRO.m, GYRO.f, GYRO.fs) * 1e9, 2) + ' nm' },
        { k: g.narrow ? 'PILOTAGGIO' : 'VIBRAZIONE DI PILOTAGGIO', v: '20 kHz, ' + EA.fmt(VD, 2) + ' m/s', sv: '20 kHz' },
      ]);
    }

    // Fase 5: micro-specchi e microfono, in due riquadri.
    function mirrorStage(ctx, g, tt, fade) {
      const P = g.phone;
      drawPhone(ctx, P.x, P.y, P.h, 0);
      for (let j = 0; j < 3; j++) {
        const f = (tt * 0.9 + j / 3) % 1;
        ctx.strokeStyle = EA.alpha(C.cyan, 0.6 * (1 - f));
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(P.x, P.y + P.h * 0.82, f * P.h * 0.3 + 3, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();
      }
      const b = g.box;
      ctx.save();
      ctx.globalAlpha = fade;
      if (g.narrow) {
        const h1 = (b.h - 20) * 0.56;
        drawDLP(ctx, { x: b.x, y: b.y + 4, w: b.w, h: h1 }, tt, true);
        drawMic(ctx, { x: b.x, y: b.y + h1 + 30, w: b.w, h: b.h - h1 - 30 }, tt, true);
        ctx.restore();
        rows(ctx, g, [
          { k: 'SPECCHI DLP', s: 'SPECCHI', v: '±12°', c: TINT },
          { k: 'LATO SPECCHIO', s: 'LATO', v: '5–14 µm' },
          { k: 'SPESSORE MEMBRANA', s: 'MEMBRANA', v: '≈ 1 µm', c: TINT },
          { k: 'BANDA AUDIO', s: 'AUDIO', v: '20 Hz – 20 kHz' },
        ]);
        return;
      }
      const vw = (g.w - 24 - b.x - 36) / 2;
      drawDLP(ctx, { x: b.x, y: b.y + 8, w: vw, h: b.h - 8 }, tt, false);
      ctx.fillStyle = C.grid;
      ctx.fillRect(b.x + vw + 18, b.y, 1, b.h);
      drawMic(ctx, { x: b.x + vw + 36, y: b.y + 8, w: vw, h: b.h - 8 }, tt, false);
      ctx.restore();
    }

    function draw(t, dt) {
      if (!cv.w) return;
      if (dt > 0) {
        stageT += dt;
        if (stageT > STAGES[stage].dur) {
          stageT = 0;
          stage = (stage + 1) % STAGES.length;
          api.setStep(stage);
        }
      }
      const g = geometry();
      const ctx = cv.ctx;
      const key = STAGES[stage].key;
      const fade = EA.smooth(stageT / 0.6);
      EA.draw.clear(cv);
      header(ctx, g);
      if (key === 'giroscopio') gyroStage(ctx, g, stageT, fade);
      else if (key === 'specchi') mirrorStage(ctx, g, stageT, fade);
      else accelStage(ctx, g, key, stageT);
    }

    api.loop(draw);
    api.setStep(0);
    return {
      focus(key, i) {
        stage = EA.clamp(i, 0, STAGES.length - 1);
        stageT = api.playing ? 0 : STAGES[stage].still;
        api.setStep(stage);
        api.invalidate();
      },
    };
  }

  /* ---------- laboratorio: accelerometro capacitivo ---------- */

  const GAP = 2e-6;                            // distanza tra le dita a riposo
  const C0 = combCap(50, 100e-6, 20e-6, GAP);  // 50 coppie di dita: circa 0,44 pF
  const STOP = 1e-6;                           // fermi meccanici a metà del gap
  const WINDOW = 2e-3;                         // il grafico mostra gli ultimi 2 ms
  const SLOW = 2000;                           // tempo rallentato 2000 volte
  const NS = 800;                              // campioni nel grafico
  const TS = WINDOW / NS;                      // un campione ogni 2,5 µs
  const KICK = { peak: 2 * G, dur: 1e-4 };     // il colpo: 2 g per un decimo di millisecondo
  const MEDIA = { aria: 9e-5, gas: 1.26e-5, vuoto: 3e-8 }; // smorzamento b in N·s/m

  // Cifre decimali fisse con il segno (niente «−0,00»): i display che cambiano a ogni fotogramma non ballano.
  function fixed(x, d) {
    const s = Math.abs(x).toFixed(d);
    return (+s === 0 ? '' : x < 0 ? '−' : '+') + s.replace('.', ',');
  }

  function mountLab(parts, api) {
    const h = EA.h;
    const st = { a: 1, k: 2, m: 2e-9, medium: 'aria' };
    const par = () => ({ k: st.k, m: st.m, b: MEDIA[st.medium] });
    let s = { u: 0, v: 0 };
    const hist = new Float64Array(NS);
    let head = 0;
    let acc = 0;
    let kick = -1;
    let simT = 0;
    let hitT = -1;

    const cv = api.canvas(parts.display, { class: 'ea-canvas mems-lab-canvas', label: 'Vista dall\'alto dell\'accelerometro con massa, molle e pettini; a destra le capacità C1 e C2; in basso lo spostamento della massa negli ultimi due millisecondi.' });

    const accel = EA.ui.slider({
      label: 'Accelerazione applicata', min: -4, max: 4, step: 0.1, value: st.a, color: TINT,
      format: (v) => signed(v, 1) + ' g',
      hint: 'Positiva verso destra. Fermo in verticale, un asse sente già 1 g: la gravità.',
      oninput: (v) => { st.a = v; update(true); },
    });
    const shakeBtn = EA.ui.button({ label: 'Scuoti', icon: '↯', aria: 'Scuoti: dai un colpo al chip', onclick: shake });
    const kSl = EA.ui.slider({
      label: 'Rigidezza delle molle k', min: 0.5, max: 20, log: true, value: st.k, color: C.amber,
      format: (v) => EA.fmt(v, v < 10 ? 1 : 0) + ' N/m',
      oninput: (v) => { st.k = v; update(); },
    });
    const mSl = EA.ui.slider({
      label: 'Massa di prova m', min: 0.5, max: 20, log: true, value: st.m * 1e9, color: C.cyan,
      format: (v) => EA.fmt(v, v < 10 ? 1 : 0) + ' µg',
      oninput: (v) => { st.m = v * 1e-9; update(); },
    });
    const med = EA.ui.segmented({
      label: 'Gas intorno alla massa',
      options: [{ value: 'aria', label: 'Aria' }, { value: 'gas', label: 'Gas rarefatto' }, { value: 'vuoto', label: 'Vuoto' }],
      value: st.medium,
      onchange: (v) => { st.medium = v; update(); },
    });
    med.el.append(h('small', { class: 'ea-ctl-hint' }, 'Il gas frena la massa come un ammortizzatore: Q = √(k·m)/b. Nel vuoto quasi niente la frena.'));
    parts.controls.append(accel.el,
      h('div', { class: 'ea-ctl' }, shakeBtn, h('small', { class: 'ea-ctl-hint' }, 'Un colpo secco di 2 g che dura un decimo di millisecondo: abbastanza breve da far vibrare la massa.')),
      kSl.el, mSl.el, med.el);

    const roX = EA.ui.readout({ label: 'Spostamento' });
    const roC = EA.ui.readout({ label: 'Variazione ΔC' });
    const roA = EA.ui.readout({ label: 'Accelerazione misurata' });
    const roF = EA.ui.readout({ label: 'Risonanza f₀' });
    const roQ = EA.ui.readout({ label: 'Fattore di qualità Q' });
    const roS = EA.ui.readout({ label: 'Spostamento per 1 g' });
    parts.readouts.classList.add('mems-readouts');
    parts.readouts.append(roX.el, roC.el, roA.el, roF.el, roQ.el, roS.el);

    // Avanza la simulazione esatta di dtSim secondi, un campione del grafico alla volta.
    function advance(dtSim) {
      const p = par();
      acc += dtSim;
      let n = 0;
      while (acc >= TS && n < NS) {
        acc -= TS;
        n++;
        let a = st.a * G;
        if (kick >= 0) {
          a += pulse(kick + TS / 2, KICK.peak, KICK.dur);
          kick += TS;
          if (kick >= KICK.dur) kick = -1;
        }
        const r = bounce(respond(s, p, a, TS), STOP, 0.3);
        if (r.hit) hitT = simT;
        s = { u: r.u, v: r.v };
        simT += TS;
        hist[head] = s.u;
        head = (head + 1) % NS;
      }
      if (n >= NS) acc = 0;
    }

    // Ad animazione ferma (o con "riduci movimento") la risposta compare subito per intero.
    function settleNow() {
      if (!api.playing) advance(WINDOW * 0.8);
    }

    function scales() {
      const xfs = Math.min(STOP, staticDisp(4 * G, st.k, st.m));
      return {
        mag: nice((0.8 * GAP) / xfs, false),
        yfs: nice(xfs * 1.2, true),
        cfs: nice(differential(C0, GAP, xfs).c1 - C0, true),
      };
    }

    // Display che dipendono solo da molle, massa e gas.
    function statics() {
      const f = resonance(st.k, st.m);
      const q = quality(st.k, st.m, MEDIA[st.medium]);
      roF.set(EA.si(f, 'Hz'));
      roQ.set(EA.fmt(q, q < 10 ? 2 : 0), q >= 0.5 && q <= 1.5 ? 'good' : q > 5 ? 'warn' : null);
      roS.set(EA.si(dispPerG(f), 'm') + '/g');
      return { f, q };
    }

    function update(fromAccel) {
      const { f, q } = statics();
      settleNow();
      api.invalidate();
      const x = Math.abs(staticDisp(st.a * G, st.k, st.m));
      if (fromAccel) {
        api.announce('Accelerazione ' + signed(st.a, 1) + ' g: ' + (x > STOP
          ? 'la massa arriva ai fermi meccanici, a ' + EA.si(STOP, 'm') + ' dal centro.'
          : 'la massa si sposta di ' + si0(x, 'm', 1e-12) + '.'));
      } else api.announce('Risonanza ' + EA.si(f, 'Hz') + ', fattore di qualità ' + EA.fmt(q, q < 10 ? 1 : 0) + ', ' + EA.si(dispPerG(f), 'm') + ' per g.');
    }

    function shake() {
      kick = 0;
      settleNow();
      api.invalidate();
      const q = quality(st.k, st.m, MEDIA[st.medium]);
      const tau = EA.si(settle(st.k, st.m, MEDIA[st.medium]), 's', 2);
      api.announce(q > 0.5
        ? 'Colpo: la massa vibra e l\'ampiezza cala al 37 per cento in circa ' + tau + '.'
        : 'Colpo: la massa torna a riposo senza oscillare, con una costante di tempo di circa ' + tau + '.');
    }

    function draw(t, dt) {
      if (dt > 0) advance(dt / SLOW);
      if (!cv.w) return;
      const ctx = cv.ctx;
      const w = cv.w;
      const hh = cv.h;
      const n = w < 560;
      const P = n ? 12 : 18;
      const sc = scales();
      const cc = differential(C0, GAP, s.u);
      const hitting = hitT >= 0 && simT - hitT < 3e-4;
      const nonlin = Math.abs(s.u) > 0.1 * GAP;
      const ueq = EA.clamp(staticDisp(st.a * G, st.k, st.m), -STOP, STOP);
      const sb = n ? { x: P + 4, y: 34, w: w - 2 * P - 8, h: hh * 0.38 - 30 } : { x: P + 6, y: 42, w: w * 0.6 - P - 12, h: hh * 0.52 - 46 };
      const cb = n ? { x: P, y: hh * 0.38 + 22, w: w - 2 * P } : { x: w * 0.64, y: 22, w: w * 0.36 - P, h: hh * 0.55 - 6 };
      const gb = n ? { x: P + 44, y: hh * 0.38 + 118 } : { x: P + 46, y: hh * 0.62 + 8 };
      gb.w = w - P - gb.x;
      gb.h = hh - gb.y - (n ? 28 : 30);
      EA.draw.clear(cv);

      // struttura vista dall'alto, con il colpo come freccia sul telaio
      EA.draw.text(ctx, 'VISTA DALL\'ALTO', P, n ? 18 : 22, { color: C.text, size: 10.5, weight: 700 });
      EA.draw.text(ctx, 'spostamento ingrandito ×' + EA.fmt(sc.mag, 0), sb.x + sb.w, n ? 18 : 22, { color: C.dim, size: 10.5, align: 'right' });
      drawAccel(ctx, sb, (s.u / GAP) * sc.mag, { cells: n ? 4 : 5 });
      if (kick >= 0) tag(ctx, 'colpo →', sb.x + sb.w / 2, sb.y + sb.h / 2 + 4, { color: C.ink, size: 11, weight: 700, align: 'center' });
      if (!n) {
        [[TINT, 'massa e molle'], [E1, 'dita fisse di C₁'], [E2, 'dita fisse di C₂']].forEach(([col, txt], i) => {
          swatch(ctx, sb.x + i * 150, sb.y + sb.h + 13, col);
          EA.draw.text(ctx, txt, sb.x + i * 150 + 16, sb.y + sb.h + 22, { color: C.text, size: 10.5 });
        });
      }

      // capacità: C1 e C2 rispetto a C0, la loro differenza e lo stato della risposta
      const status = hitting ? ['la massa batte sui fermi', C.red] : nonlin ? ['oltre il 10% del gap: non lineare', C.amber] : ['risposta lineare', TINT];
      if (n) {
        capBars(ctx, cb, cc.c1, cc.c2, C0, sc.cfs, true);
        EA.draw.text(ctx, 'ΔC = ' + farad(cc.dc), cb.x, cb.y + 52, { color: TINT, size: 11, weight: 700 });
        EA.draw.text(ctx, status[0], cb.x + cb.w, cb.y + 52, { color: status[1], size: 10.5, align: 'right' });
      } else {
        EA.draw.text(ctx, 'CAPACITÀ DEI PETTINI', cb.x, cb.y, { color: C.text, size: 10.5, weight: 700 });
        capBars(ctx, { x: cb.x, y: cb.y + 22, w: cb.w, h: Math.max(60, cb.h - 132) }, cc.c1, cc.c2, C0, sc.cfs, false);
        EA.draw.text(ctx, 'ΔC = C₁ − C₂ = ' + farad(cc.dc), cb.x, cb.y + cb.h - 30, { color: TINT, size: 12, weight: 700 });
        EA.draw.text(ctx, status[0], cb.x, cb.y + cb.h - 10, { color: status[1], size: 10.5, weight: 700 });
      }

      // spostamento nel tempo: un oscillatore smorzato del secondo ordine
      EA.draw.text(ctx, n ? 'SPOSTAMENTO' : 'SPOSTAMENTO DELLA MASSA', P, gb.y - 12, { color: C.text, size: 10.5, weight: 700 });
      EA.draw.text(ctx, 'tempo rallentato ' + SLOW + ' volte', gb.x + gb.w, gb.y - 12, { color: C.dim, size: 10.5, align: 'right' });
      EA.draw.grid(ctx, gb.x, gb.y, gb.w, gb.h, { cols: n ? 4 : 8, rows: 4 });
      const Y = (u) => gb.y + gb.h / 2 - (u / sc.yfs) * (gb.h / 2);
      ctx.save();
      ctx.beginPath();
      ctx.rect(gb.x, gb.y, gb.w, gb.h);
      ctx.clip();
      dash(ctx, gb.x, Y(ueq), gb.x + gb.w, Y(ueq), EA.alpha(C.ink, 0.5));
      if (STOP < sc.yfs) [STOP, -STOP].forEach((v) => dash(ctx, gb.x, Y(v), gb.x + gb.w, Y(v), EA.alpha(C.red, 0.75)));
      const pts = [];
      for (let i = 0; i < NS; i++) pts.push([gb.x + (i / (NS - 1)) * gb.w, Y(hist[(head + i) % NS])]);
      EA.draw.line(ctx, pts, TINT, 1.8);
      ctx.restore();
      EA.draw.dot(ctx, gb.x + gb.w, EA.clamp(Y(s.u), gb.y, gb.y + gb.h), 3.2, TINT);
      [[sc.yfs, gb.y + 9], [0, gb.y + gb.h / 2 + 4], [-sc.yfs, gb.y + gb.h]].forEach(([v, y]) => {
        EA.draw.text(ctx, v ? (v > 0 ? '+' : '−') + EA.si(Math.abs(v), 'm') : '0', gb.x - 6, y, { color: C.dim, size: 10.5, align: 'right' });
      });
      [['−2 ms', 'left', 0], ['−1 ms', 'center', 0.5], ['adesso', 'right', 1]].forEach(([txt, al, f]) => {
        EA.draw.text(ctx, txt, gb.x + f * gb.w, gb.y + gb.h + 15, { color: C.dim, size: 10.5, align: al });
      });
      tag(ctx, 'costante di tempo τ ≈ ' + EA.si(settle(st.k, st.m, MEDIA[st.medium]), 's', 2), gb.x + gb.w - 8, gb.y + 18, { color: C.text, size: 10.5, align: 'right' });
      if (!n) EA.draw.text(ctx, 'equilibrio m·a/k', gb.x + 8, EA.clamp(Y(ueq) + (ueq >= 0 ? -7 : 15), gb.y + 14, gb.y + gb.h - 6), { color: C.text, size: 10.5 });

      roX.set(si0(s.u, 'm', 1e-12));
      roC.set(farad(cc.dc), nonlin ? 'warn' : null);
      roA.set(fixed(measured(s.u, st.k, st.m) / G, 2) + ' g', hitting ? 'bad' : null);
    }

    api.loop(draw);
    statics();
    advance(WINDOW * 0.8);
    return {};
  }

  /* ---------- contenuti ---------- */

  EA.register({
    id: 'mems',
    intro: [
      'Dentro ogni smartphone ci sono delle <strong>macchine</strong>: masse che oscillano, molle che si piegano, membrane che vibrano con la voce. Sono i <abbr title="Micro-Electro-Mechanical Systems">MEMS</abbr>, sistemi micro-elettro-meccanici: strutture mobili più sottili di un capello, scolpite nel silicio con le stesse tecniche dei chip e unite all\'elettronica che le muove o le legge.',
      'Il più diffuso è l\'<em>accelerometro</em>. Una piastrina di silicio di pochi microgrammi, la <em>massa di prova</em>, è appesa a molle microscopiche: quando il telefono accelera o si inclina, resta indietro per inerzia di pochi <strong>nanometri</strong>. Dita sottili attaccate alla massa, affacciate a dita fisse, formano condensatori la cui capacità cambia di qualche <strong>femtofarad</strong>, cioè milionesimi di miliardesimo di farad: abbastanza per capire dov\'è il basso, contare i passi o far scattare un airbag.',
      'Con le stesse idee si costruiscono altri sensi. Il <em>giroscopio</em> tiene una massa in vibrazione e sente la rotazione dalla spinta laterale che riceve; il <em>microfono</em> è una membrana sottilissima davanti a una piastra forata; il <em>barometro</em> di solito è una membrana sopra una cavità sigillata, con resistori che cambiano valore quando si flette (è la <em>piezoresistività</em>). Sente differenze di pochi pascal: salire di un piano, circa 3 metri, abbassa la pressione di circa 36 Pa. Nei proiettori, invece, milioni di micro-specchi si inclinano per accendere e spegnere i pixel.',
      'Tutto questo funziona perché il silicio monocristallino è un ottimo materiale meccanico: rigido quasi come l\'acciaio, più leggero dell\'alluminio, senza isteresi (dopo ogni deformazione torna esattamente com\'era) e senza usura per miliardi di oscillazioni. Le parti mobili si liberano con attacchi chimici, sciogliendo uno <em>strato sacrificale</em> sotto la struttura (come si fabbricano i chip lo racconta la sezione 4). A queste dimensioni il peso conta poco: dominano le forze elettrostatiche, l\'adesione tra le superfici e la resistenza dell\'aria.',
    ],
    steps: [
      { title: 'Una massa appesa a molle', text: 'Nel chip c\'è una piastrina di silicio larga meno di mezzo millimetro, la massa di prova, sospesa su molle ripiegate: solo le estremità delle molle sono fissate al substrato, la base del chip. Può muoversi lungo un solo asse e oscilla volentieri a una frequenza, quella di risonanza f₀ = √(k/m)/2π: con molle da 2 N/m e 2 microgrammi di massa, circa 5 kHz.', focus: 'massa' },
      { title: 'Il chip accelera, la massa resta indietro', text: 'Quando il telefono accelera, il telaio del chip parte subito ma la massa, per inerzia, resta indietro: le molle si piegano finché la loro forza k·x eguaglia m·a. Lo spostamento x = m·a/k è di circa 10 nanometri per ogni g, una quarantina di distanze tra atomi di silicio.', focus: 'accelera' },
      { title: 'I pettini misurano lo spostamento', text: 'Alla massa sono attaccate file di dita intercalate a dita fisse: ogni coppia è un minuscolo condensatore. Se la massa si sposta, da un lato le distanze tra le dita (i gap) si stringono e C₁ sale, dall\'altro si allargano e C₂ scende. La differenza vale pochi femtofarad per g e, quando il telefono si inclina, rivela dov\'è il basso.', focus: 'pettini' },
      { title: 'Il giroscopio sente la rotazione', text: 'Nel giroscopio la massa è tenuta in vibrazione, decine di migliaia di volte al secondo. Se il telefono ruota, la forza di Coriolis F = 2·m·v·Ω la spinge di lato, perpendicolarmente al moto: il percorso si apre in un\'ellisse, e lo spostamento laterale, di frazioni di nanometro, misura la velocità di rotazione.', focus: 'giroscopio' },
      { title: 'Specchi e microfoni', text: 'Con le stesse tecniche si fanno micro-specchi che si inclinano di ±12° per accendere o spegnere un pixel di un proiettore, e membrane spesse circa un micrometro che vibrano con il suono davanti a una piastra forata: cambia la distanza, cambia la capacità. I microfoni MEMS entrano nei telefoni nei primi anni Duemila.', focus: 'specchi' },
    ],
    formulas: [
      { label: 'Frequenza di risonanza', eq: '<var>f</var><sub>0</sub> = <sup>1</sup>⁄<sub>2π</sub> √(<var>k</var> ⁄ <var>m</var>)', text: 'Una massa <var>m</var> appesa a molle di rigidezza <var>k</var> oscilla da sola a <var>f</var><sub>0</sub>. Con <var>m</var> = 2 µg e <var>k</var> = 2 N/m si ottengono circa 5 kHz: molle più rigide o massa più leggera alzano la frequenza.' },
      { label: 'Spostamento statico', eq: '<var>x</var> = <var>m</var>·<var>a</var> ⁄ <var>k</var> = <var>a</var> ⁄ (2π<var>f</var><sub>0</sub>)<sup>2</sup>', text: 'Vale per accelerazioni lente rispetto a <var>f</var><sub>0</sub>. È il compromesso del sensore: alzando <var>f</var><sub>0</sub> si guadagnano banda e robustezza, ma lo spostamento per g cala con il quadrato. A 5 kHz, 1 g sposta la massa di circa 10 nm.' },
      { label: 'Smorzamento e fattore di qualità', eq: '<var>Q</var> = √(<var>k</var>·<var>m</var>) ⁄ <var>b</var><br><var>τ</var> = <var>Q</var> ⁄ (π<var>f</var><sub>0</sub>)', text: 'Il gas intorno alla massa la frena con una forza <var>b</var>·<var>v</var>, come un ammortizzatore. Con <var>Q</var> vicino a 0,7, tipico degli accelerometri chiusi in un gas, la massa si assesta in fretta quasi senza oscillare. Nel vuoto <var>Q</var> arriva a migliaia e le vibrazioni durano a lungo: l\'ampiezza cala al 37% solo dopo il tempo <var>τ</var>.' },
      { label: 'Misura differenziale', eq: 'Δ<var>C</var> = <var>C</var><sub>1</sub> − <var>C</var><sub>2</sub> ≈ 2<var>C</var><sub>0</sub>·<var>x</var> ⁄ <var>d</var>', text: 'Ogni coppia di dita è un condensatore <var>C</var> = ε<sub>0</sub><var>A</var>/<var>d</var>. Se la massa si sposta di <var>x</var>, un gap diventa <var>d</var> − <var>x</var> e l\'altro <var>d</var> + <var>x</var>: la differenza raddoppia il segnale e cancella i disturbi comuni. Con <var>C</var><sub>0</sub> = 0,44 pF, <var>d</var> = 2 µm e <var>x</var> = 10 nm, Δ<var>C</var> ≈ 4,4 fF.' },
      { label: 'Forza di Coriolis', eq: '<var>F</var> = 2·<var>m</var>·<var>v</var>·Ω', text: 'Una massa che vibra con velocità <var>v</var>, in un chip che ruota con velocità angolare Ω (in rad/s), riceve una spinta perpendicolare al moto. Con <var>m</var> = 1 µg, <var>v</var> = 1 m/s e Ω = 1 rad/s la forza è di appena 2 nN.' },
    ],
    timeline: [
      { year: 1954, title: 'Il silicio sente lo sforzo', who: 'Charles S. Smith, Bell Telephone Laboratories (Murray Hill)', text: 'Che la resistenza di un filo metallico cambi quando lo si tende lo aveva già notato Lord Kelvin nel 1856. Smith misura che nel silicio e nel germanio l\'effetto, la <em>piezoresistività</em>, è decine di volte più forte, perché cambia la resistività stessa del cristallo. È il principio dei sensori di pressione e dei primi accelerometri in silicio.' },
      { year: 1959, title: '«C\'è tanto spazio là in fondo»', who: 'Richard P. Feynman, Caltech (Pasadena)', text: 'Il 29 dicembre, al congresso dell\'American Physical Society, Feynman immagina l\'Enciclopedia Britannica scritta sulla capocchia di uno spillo e macchine minuscole, e offre due premi da 1000 dollari. È il manifesto della miniaturizzazione più citato, anche se per vent\'anni fu poco ripreso.' },
      { year: 1967, title: 'Il transistor a gate risonante', who: 'Harvey C. Nathanson e colleghi, Westinghouse Research Laboratories (Pittsburgh)', text: 'Una trave di metallo sospesa sopra un transistor ne fa da gate: attratta elettrostaticamente, vibra forte solo alla sua frequenza di risonanza e diventa un filtro meccanico integrato. Annunciato nel 1965 e descritto per esteso nel 1967, è tra i primi dispositivi liberati con uno strato sacrificale.' },
      { year: 1979, title: 'Il primo accelerometro in silicio', who: 'Lynn M. Roylance e James B. Angell, Stanford University', text: 'Una massa di silicio appesa a una trave sottile, ricavate con un attacco chimico dalla fetta di silicio (il <em>wafer</em>): quando il chip accelera la trave si flette e un resistore piezoresistivo cambia valore. È considerato il primo accelerometro fabbricato in serie con le tecniche dei circuiti integrati.' },
      { year: 1982, title: 'Il silicio come materiale meccanico', who: 'Kurt E. Petersen, IBM Research Laboratory (San Jose)', text: 'Nell\'articolo <em>Silicon as a Mechanical Material</em> Petersen mostra che il silicio monocristallino è perfetto per travi, molle e membrane: quasi rigido come l\'acciaio, più leggero dell\'alluminio e praticamente privo di isteresi meccanica. Diventa il testo fondativo della disciplina.' },
      { year: 1987, title: 'Il chip degli specchi', who: 'Larry J. Hornbeck, Texas Instruments (Dallas)', text: 'Hornbeck inventa il Digital Micromirror Device: una matrice di micro-specchi di alluminio, uno per pixel, che si inclinano tra «acceso» e «spento». Diventa la tecnologia <abbr title="Digital Light Processing">DLP</abbr> dei proiettori (dal 1996) e del cinema digitale (dal 1999).' },
      { year: 1993, title: 'L\'accelerometro per l\'airbag', who: 'Analog Devices', text: 'L\'ADXL50, annunciato nel 1991 ed entrato in produzione di serie per gli airbag intorno al 1993, è il primo accelerometro MEMS commerciale con meccanica ed elettronica di lettura sullo stesso chip: una massa di polisilicio (silicio policristallino) con pettini differenziali e fondo scala di ±50 g.' },
      { year: 2003, title: 'Il microfono di silicio', who: 'Knowles (Itasca, Illinois)', text: 'Knowles porta in produzione di massa i microfoni MEMS SiSonic (le fonti indicano il 2002-2003): una membrana di silicio di meno di un millimetro, davanti a una piastra forata, forma un condensatore che cambia con la pressione del suono. Nei telefoni cominciano a sostituire i microfoni a elettrete, che usano una pellicola di plastica carica di elettricità.' },
      { year: 2007, title: 'I sensori di movimento in tasca', who: 'Nintendo Wii (2006), Apple iPhone (2007) e iPhone 4 (2010)', text: 'Dopo il telecomando della Wii, con l\'accelerometro a tre assi ADXL330, il primo iPhone ruota lo schermo grazie a un accelerometro MEMS; nel 2010 l\'iPhone 4 aggiunge un giroscopio MEMS. Non erano i primi, ma da allora questi sensori sono di serie in quasi ogni smartphone.' },
      { year: 2022, title: 'Il telefono riconosce l\'incidente', who: 'Apple, iPhone 14', text: 'Per riconoscere gli incidenti stradali l\'iPhone 14 adotta un accelerometro capace di misurare fino a 256 g, insieme a un giroscopio ad alta dinamica: se rileva un urto grave chiama i soccorsi. Lo stesso tipo di sensore che negli anni Novanta serviva all\'airbag ora sta in tasca.' },
    ],
    fun: 'Un accelerometro MEMS «sente» spostamenti più piccoli di un atomo. Con <var>f</var><sub>0</sub> = 5 kHz, un millesimo di g sposta la massa di circa 10 picometri, un ventesimo della distanza tra due atomi di silicio (0,235 nm). Eppure l\'elettronica di lettura se ne accorge: la capacità cambia di pochi attofarad, miliardesimi di miliardesimo di farad.',
    uses: [
      'Airbag e pretensionatori delle cinture', 'Controllo di stabilità (ESP) e navigazione in galleria', 'Rotazione dello schermo e contapassi',
      'Rilevamento di cadute e incidenti', 'Stabilizzazione di foto e video', 'Droni, robot e monopattini autobilanciati',
      'Controller delle console e visori per la realtà virtuale', 'Microfoni di telefoni, auricolari e computer',
      'Proiettori e cinema digitale DLP', 'Barometri e sensori di pressione degli pneumatici',
    ],
    glossary: [
      { term: 'MEMS', def: 'Micro-Electro-Mechanical Systems, sistemi micro-elettro-meccanici: dispositivi con parti mobili grandi da pochi a qualche centinaio di micrometri, scolpite nel silicio con le tecniche dei chip e unite all\'elettronica che le muove o le legge. In Europa si parla anche di microsistemi, in Giappone di micromacchine.' },
      { term: 'Massa di prova', def: 'La piastrina sospesa su molle che, per inerzia, resta indietro quando il chip accelera. Il suo spostamento rispetto al telaio, di pochi nanometri, è la misura.' },
      { term: 'Pettine (elettrodi interdigitati)', def: 'File di dita sottili attaccate alla massa e intercalate a dita fisse: formano tanti piccoli condensatori in parallelo. Alimentato con una tensione, lo stesso disegno diventa un attuatore: lo proposero a Berkeley nel 1989 Tang, Nguyen e Howe.' },
      { term: 'Misura differenziale', def: 'Lettura di due grandezze che cambiano in verso opposto, come <var>C</var><sub>1</sub> che sale e <var>C</var><sub>2</sub> che scende. Usarne la differenza raddoppia il segnale e cancella i disturbi comuni a entrambe, come temperatura e derive.' },
      { term: 'Forza di Coriolis', def: 'Forza apparente su un corpo in moto dentro un sistema che ruota, perpendicolare sia al moto sia all\'asse di rotazione: <var>F</var> = 2·<var>m</var>·<var>v</var>·Ω. I giroscopi MEMS la misurano su una massa tenuta in vibrazione.' },
      { term: 'Fattore di qualità Q', def: 'Dice quanto poco un oscillatore disperde energia. Con Q alto le oscillazioni durano a lungo: l\'ampiezza scende al 37% dopo circa Q/π cicli. Con Q = 0,5 lo smorzamento è critico e la massa torna a riposo senza oscillare.' },
      { term: 'Strato sacrificale', def: 'Strato depositato sotto la struttura e poi sciolto con un attacco chimico, passando dai fori della massa: così la parte mobile resta sospesa, attaccata solo agli ancoraggi.' },
      { term: 'Piezoresistività', def: 'Variazione della resistività elettrica di un materiale quando viene deformato. Nel silicio è decine di volte più forte che nei metalli ed è alla base dei sensori di pressione a membrana.' },
    ],
    sources: [
      { title: 'C. S. Smith, Piezoresistance Effect in Germanium and Silicon, Physical Review (1954)', url: 'https://doi.org/10.1103/PhysRev.94.42' },
      { title: 'R. P. Feynman, There\'s Plenty of Room at the Bottom, Engineering and Science (1960)', url: 'https://calteches.library.caltech.edu/1976/1/1960Bottom.pdf' },
      { title: 'H. C. Nathanson e altri, The Resonant Gate Transistor, IEEE Transactions on Electron Devices (1967)', url: 'https://doi.org/10.1109/T-ED.1967.15912' },
      { title: 'L. M. Roylance, J. B. Angell, A Batch-Fabricated Silicon Accelerometer (1979)', url: 'https://doi.org/10.1109/T-ED.1979.19795' },
      { title: 'K. E. Petersen, Silicon as a Mechanical Material, Proceedings of the IEEE (1982)', url: 'https://doi.org/10.1109/PROC.1982.12331' },
      { title: 'N. Yazdi, F. Ayazi, K. Najafi, Micromachined Inertial Sensors, Proceedings of the IEEE (1998)', url: 'https://doi.org/10.1109/5.704269' },
      { title: 'Analog Devices, scheda tecnica dell\'accelerometro ADXL335', url: 'https://www.analog.com/media/en/technical-documentation/data-sheets/ADXL335.pdf' },
      { title: 'Texas Instruments, la tecnologia dei chip DLP', url: 'https://www.ti.com/dlp-chip/overview.html' },
    ],
    quiz: [
      { id: 'ea-mems-01', chapter: 'mems', level: 1, topic: 'Accelerometro a riposo', q: 'Uno smartphone è appoggiato sul tavolo con lo schermo verso l\'alto. Che cosa legge l\'asse dell\'accelerometro perpendicolare allo schermo?', options: ['Circa 1 g: sente la spinta del tavolo che contrasta la gravità', 'Zero: il telefono è fermo, quindi non accelera', 'Circa 9,8 g: è il valore della gravità terrestre'], answer: 0, why: 'Fermo sul tavolo, la massa di prova si sposta come se il chip accelerasse verso l\'alto di 1 g: il tavolo lo spinge contro la gravità. In caduta libera, invece, l\'accelerometro segna zero. È così che il telefono capisce dov\'è il basso.' },
      { id: 'ea-mems-02', chapter: 'mems', level: 2, topic: 'Massa e frequenza', q: 'In un accelerometro MEMS si raddoppia la massa di prova lasciando uguali le molle. Che cosa succede?', options: ['f₀ si divide per √2 e lo spostamento per 1 g raddoppia', 'f₀ raddoppia e lo spostamento per 1 g si dimezza', 'f₀ resta uguale e lo spostamento per 1 g raddoppia', 'f₀ si dimezza e lo spostamento per 1 g resta uguale'], answer: 0, why: 'Con f₀ = √(k/m)/2π, raddoppiare m divide la frequenza per √2, circa 1,41. Lo spostamento statico x = m·a/k invece raddoppia: il sensore diventa più sensibile ma meno veloce. È il compromesso tra sensibilità e banda.' },
      { id: 'ea-mems-03', chapter: 'mems', level: 2, topic: 'Misura differenziale', q: 'Perché l\'accelerometro misura due capacità, C₁ e C₂, e ne usa la differenza invece di misurarne una sola?', options: ['Il segnale raddoppia e i disturbi comuni, come la temperatura, si cancellano', 'Così lo stesso pettine misura l\'accelerazione lungo due assi diversi', 'La differenza misura anche la velocità, oltre all\'accelerazione', 'Una sola capacità non cambierebbe quando la massa si sposta'], answer: 0, why: 'Quando la massa si sposta di x, un gap diventa d − x e l\'altro d + x: C₁ sale mentre C₂ scende. La differenza ΔC ≈ 2·C₀·x/d è doppia rispetto a una sola variazione e quasi lineare, e ciò che cambia allo stesso modo in entrambe, come le derive termiche, si annulla.' },
      { id: 'ea-mems-04', chapter: 'mems', level: 3, topic: 'Giroscopio e Coriolis', q: 'Nel giroscopio MEMS una massa viene tenuta in vibrazione continua, decine di migliaia di volte al secondo. Perché è indispensabile?', options: ['Senza velocità la forza di Coriolis è nulla e non c\'è niente da misurare', 'La vibrazione impedisce alla massa di incollarsi agli elettrodi', 'Vibrando la massa ruota davvero e indica l\'angolo come una trottola', 'Serve a scaldare il silicio e a renderlo più sensibile alla rotazione'], answer: 0, why: 'La forza di Coriolis vale F = 2·m·v·Ω: è proporzionale alla velocità v della massa. Se la massa fosse ferma, la rotazione non la spingerebbe di lato. Con m = 1 µg, v = 1 m/s e Ω = 1 rad/s la forza è di appena 2 nN e lo spostamento laterale è di frazioni di nanometro.' },
    ],
    hero: {
      caption: 'Dentro il chip, una massa di silicio sospesa su molle. Spostamenti ingranditi e tempo rallentato: nella realtà la massa si muove di pochi nanometri.',
      label: 'Animazione: dentro l\'accelerometro e il giroscopio di uno smartphone, poi micro-specchi e microfono',
      aspect: '16 / 7',
      aspectMobile: '4 / 5',
      mount: mountHero,
    },
    lab: {
      title: 'Accelerometro capacitivo',
      intro: 'Accelera il chip con il primo cursore, oppure premi <strong>Scuoti</strong> per dargli un colpo, e guarda la massa di prova spostarsi di pochi nanometri. Cambia molle, massa e gas: scoprirai il compromesso tra sensibilità e banda, e perché nel vuoto la massa continua a vibrare così a lungo.',
      mount: mountLab,
    },
    model,
  });
})(typeof window !== 'undefined' ? window : globalThis);
