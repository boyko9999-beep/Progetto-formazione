/*
 * Capitolo 2 · Quando un filo diventa un'onda (linee di trasmissione).
 * Animazione: un gradino di tensione corre lungo una pista interna di circuito
 * stampato e si riflette su carichi diversi: aperto, corto, adattato, disadattato.
 * Alla fine un riflettometro riconosce un carico nascosto dalla sua eco.
 * Laboratorio: riflettometro (TDR) con traccia all'ingresso e diagramma a rimbalzi.
 */
(function (root) {
  'use strict';

  const EA = root.EA;

  /* ---------- modello ---------- */

  const C_CM_NS = 29.9792458; // velocità della luce nel vuoto, in cm/ns
  // Il fronte è una rampa a coseno rialzato: la salita dal 10 al 90% ne occupa questa frazione.
  const RISE_FRAC = 1 - (2 * Math.acos(0.8)) / Math.PI;

  // Coefficiente di riflessione di un carico zl su una linea z0 (Infinity = circuito aperto).
  function gamma(zl, z0) {
    if (zl === Infinity) return 1;
    return (zl - z0) / (zl + z0);
  }

  // Lettura inversa del riflettometro: l'impedenza che produce un certo Γ.
  function impedanceFromGamma(g, z0) {
    if (g >= 1) return Infinity;
    return (z0 * (1 + g)) / (1 - g);
  }

  const velocity = (er) => C_CM_NS / Math.sqrt(er);                 // cm/ns
  const delay = (len, er) => len / velocity(er);                     // ns, sola andata
  const z0FromLC = (l, c) => Math.sqrt(l / c);                       // L e C per unità di lunghezza
  const speedFromLC = (l, c) => 1 / Math.sqrt(l * c);                // lunghezze al secondo
  const launch = (vs, rs, z0) => (vs * z0) / (rs + z0);              // all'inizio il generatore vede solo Z0
  const finalValue = (vs, rs, zl) => (zl === Infinity ? vs : (vs * zl) / (rs + zl)); // partitore in continua
  const tdrDistance = (t, v) => (v * t) / 2;                         // il tempo del TDR è di andata e ritorno
  const criticalLength = (er, tr, k) => (velocity(er) * tr) / (k || 6);
  const isLong = (len, er, tr, k) => delay(len, er) > tr / (k || 6);

  // Gradino unitario con tempo di salita tr (10–90%): 0 prima del fronte, 1 a rampa finita.
  function edge(tau, tr) {
    if (tau <= 0) return 0;
    const T = tr / RISE_FRAC;
    if (tau >= T) return 1;
    return 0.5 - 0.5 * Math.cos((Math.PI * tau) / T);
  }

  // Grandezze derivate di generatore, linea e carico. Tempi in ns, lunghezze in cm, tensioni in V.
  function line(p) {
    const v = velocity(p.er);
    return {
      vs: p.vs, rs: p.rs, z0: p.z0, zl: p.zl, len: p.len, er: p.er, tr: p.tr,
      v, td: p.len / v, ramp: p.tr / RISE_FRAC,
      gL: gamma(p.zl, p.z0), gS: gamma(p.rs, p.z0),
      vLaunch: launch(p.vs, p.rs, p.z0), vFinal: finalValue(p.vs, p.rs, p.zl),
    };
  }

  // Onde del diagramma a rimbalzi fino a tMax: k pari va verso il carico, k dispari torna.
  // Ogni arrivo a un estremo moltiplica l'ampiezza per il Γ di quell'estremo.
  function bounces(L, tMax, minAmp) {
    const floor = minAmp == null ? 1e-4 * Math.abs(L.vs) : minAmp;
    const out = [];
    let a = L.vLaunch;
    for (let k = 0; k * L.td <= tMax && out.length < 800; k++) {
      if (Math.abs(a) < floor) break;
      out.push({ k, a, t0: k * L.td, dir: k % 2 ? -1 : 1 });
      a *= k % 2 ? L.gS : L.gL;
    }
    return out;
  }

  // Tensione nel punto xi (0 = ingresso, 1 = carico) all'istante t, divisa in f (onde
  // verso il carico) e b (onde di ritorno). In ogni punto le onde arrivano in ordine di k.
  function voltage(L, list, xi, t) {
    let f = 0;
    let b = 0;
    for (let i = 0; i < list.length; i++) {
      const w = list[i];
      const arrive = w.t0 + (w.dir > 0 ? xi : 1 - xi) * L.td;
      if (arrive >= t) break;
      const s = w.a * edge(t - arrive, L.tr);
      if (w.dir > 0) f += s; else b += s;
    }
    return { f, b, v: f + b };
  }

  const inputVoltage = (L, list, t) => voltage(L, list, 0, t).v;
  const loadVoltage = (L, list, t) => voltage(L, list, 1, t).v;

  // Echi da mostrare all'ingresso: almeno quattro, e abbastanza perché la distanza dal valore
  // finale scenda sotto il 20% del primo gradino (ogni giro la moltiplica per ΓS·ΓL), ma non più di otto.
  function roundTrips(L) {
    const loop = Math.abs(L.gS * L.gL);
    if (loop >= 0.999) return 8;
    const need = loop > 1e-3 ? Math.ceil(Math.log(0.2) / Math.log(loop) - 1e-9) : 0;
    return EA.clamp(need, 4, 8);
  }

  // Finestra di osservazione: quegli echi più mezzo giro per vedere l'ultimo gradino,
  // oppure sei tempi di salita se il filo è corto.
  const timeSpan = (L) => Math.max((2 * roundTrips(L) + 1) * L.td, 6 * L.tr);

  // Estremi raggiunti da totale, andata e ritorno: sono somme parziali delle onde.
  function ranges(list) {
    let sv = 0;
    let sf = 0;
    let sb = 0;
    let lo = 0;
    let hi = 0;
    list.forEach((w) => {
      sv += w.a;
      if (w.dir > 0) sf += w.a; else sb += w.a;
      lo = Math.min(lo, sv, sf, sb);
      hi = Math.max(hi, sv, sf, sb);
    });
    return { lo, hi };
  }

  const model = {
    C_CM_NS, RISE_FRAC, gamma, impedanceFromGamma, velocity, delay, z0FromLC, speedFromLC,
    launch, finalValue, tdrDistance, criticalLength, isLong, edge, line, bounces,
    voltage, inputVoltage, loadVoltage, roundTrips, timeSpan, ranges,
  };

  /* ---------- disegno comune ---------- */

  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

  // Numero con il segno sempre scritto: +0,5, −1, 0.
  function signed(x, d) {
    if (Math.abs(x) < 0.5 * Math.pow(10, -d)) return '0';
    return (x > 0 ? '+' : '') + EA.fmt(x, d);
  }

  // Cifre decimali fisse, per orologi e righelli che non devono ballare.
  const fixed = (x, d) => (x < 0 ? '−' : '') + Math.abs(x).toFixed(d).replace('.', ',');

  const lengthText = (cm) => (cm < 100 ? EA.fmt(cm, cm < 10 ? 1 : 0) + ' cm' : EA.fmt(cm / 100, 2) + ' m');

  // Lunghezze piccole, come la soglia della regola pratica: da decimi di millimetro a decine di centimetri.
  const smallLength = (cm) => (cm < 1 ? EA.fmt(cm * 10, cm < 0.1 ? 2 : 1) + ' mm' : lengthText(cm));

  function textWidth(ctx, str, size, weight) {
    ctx.save();
    ctx.font = (weight || 600) + ' ' + size + 'px ' + MONO;
    const w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  }

  // Divide un testo in righe larghe al massimo maxW pixel.
  function wrap(ctx, str, maxW, size, weight) {
    const out = [];
    let cur = '';
    str.replace(/(\d) (?=(?:cm|ns|ps|V|Ω|m)(?:$|[\s,.;:)\/]))/g, '$1\u00a0').split(' ').forEach((word) => {
      const next = cur ? cur + ' ' + word : word;
      if (cur && textWidth(ctx, next, size, weight) > maxW) { out.push(cur); cur = word; } else cur = next;
    });
    if (cur) out.push(cur);
    return out;
  }

  // Passo "tondo" (1, 2 o 5 per una potenza di dieci) per circa n tacche.
  function niceStep(range, n) {
    const raw = range / Math.max(1, n);
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }

  // Tacche "tonde" tra lo e hi.
  function ticks(lo, hi, n) {
    const st = niceStep(hi - lo, n);
    const out = [];
    for (let v = Math.ceil(lo / st - 1e-9) * st; v <= hi + 1e-9; v += st) out.push(Math.abs(v) < st * 1e-6 ? 0 : v);
    return { step: st, list: out };
  }

  // Riquadro scuro con bordo sottile, come gli inserti degli strumenti.
  function panel(ctx, x, y, w, h, stroke) {
    ctx.save();
    ctx.fillStyle = EA.alpha('#060b0a', 0.88);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 10); else ctx.rect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Etichetta su fondo scuro, leggibile anche sopra tracce e griglie.
  function tag(ctx, str, x, y, o) {
    const size = o.size || 10.5;
    const weight = o.weight || 700;
    const w = textWidth(ctx, str, size, weight);
    const left = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    ctx.fillStyle = EA.alpha(EA.colors.bg, 0.88);
    ctx.fillRect(left - 4, y - size + 1, w + 8, size + 5);
    EA.draw.text(ctx, str, x, y, { color: o.color, size, weight, align: o.align || 'left' });
  }

  // Rettangolo occupato da un'etichetta disegnata con tag() (x, y = linea di base).
  function tagBox(ctx, it) {
    const w = textWidth(ctx, it.str, 10.5, 700);
    const left = it.align === 'right' ? it.x - w : it.x;
    return { x0: left - 4, x1: left + w + 4, y0: it.y - 9.5, y1: it.y + 6 };
  }

  const overlap = (a, b, m) => a.x0 - m < b.x1 && b.x0 - m < a.x1 && a.y0 - m < b.y1 && b.y0 - m < a.y1;

  // La spezzata pts, ordinata per x, entra nel rettangolo bx allargato di m pixel?
  function hitsLine(pts, bx, m) {
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i];
      const q = pts[i + 1];
      if (q[0] < bx.x0 - m) continue;
      if (p[0] > bx.x1 + m) break;
      if (Math.max(p[1], q[1]) >= bx.y0 - m && Math.min(p[1], q[1]) <= bx.y1 + m) return true;
    }
    return false;
  }

  // Tratteggio ancorato alle x assolute: due onde sovrapposte si alternano invece di coprirsi.
  function dashed(ctx, xs, ys, on, color, shift, width) {
    const D = 7;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    ctx.beginPath();
    for (let i = 0; i < xs.length - 1; i++) {
      if (!on[i] || !on[i + 1]) continue;
      const xa = xs[i];
      const xb = xs[i + 1];
      const ya = ys[i];
      const yb = ys[i + 1];
      const yAt = (x) => ya + ((yb - ya) * (x - xa)) / (xb - xa);
      let blk = Math.floor((xa + shift) / D);
      let x = xa;
      while (x < xb) {
        const xn = Math.min(xb, (blk + 1) * D - shift);
        if (blk % 2 === 0 && xn > x) { ctx.moveTo(x, yAt(x)); ctx.lineTo(xn, yAt(xn)); }
        x = xn;
        blk++;
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  // Profilo di tensione lungo la linea: totale chiaro e pieno, andata in ciano, ritorno in ambra.
  function drawProfile(ctx, xs, s, Y) {
    const C = EA.colors;
    const y0 = Y(0);
    const pts = xs.map((x, i) => [x, Y(s.v[i])]);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xs[0], y0);
    pts.forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.lineTo(xs[xs.length - 1], y0);
    ctx.closePath();
    ctx.fillStyle = EA.alpha(C.cyan, 0.07);
    ctx.fill();
    ctx.restore();
    EA.draw.line(ctx, pts, C.ink, 2.4);
    const nz = (arr) => arr.map((v) => Math.abs(v) > 0.004);
    dashed(ctx, xs, s.f.map(Y), nz(s.f), C.cyan, 0, 2.2);
    dashed(ctx, xs, s.b.map(Y), nz(s.b), C.amber, 7, 2.2);
  }

  // Legenda dei colori, scritta da destra verso sinistra; restituisce il bordo sinistro.
  function legend(ctx, xr, y, items) {
    const C = EA.colors;
    let x = xr;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      x -= textWidth(ctx, it.label, 10.5, 600);
      EA.draw.text(ctx, it.label, x, y, { color: C.text, size: 10.5 });
      x -= 26;
      if (it.dash) {
        ctx.save();
        ctx.strokeStyle = it.color;
        ctx.lineWidth = 2.2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 20, y - 4); ctx.stroke();
        ctx.restore();
      } else {
        EA.draw.line(ctx, [[x, y - 4], [x + 20, y - 4]], it.color, 2.2);
      }
      x -= 16;
    }
    return x + 16;
  }

  function fieldArrow(ctx, x, ya, yb) {
    const d = yb > ya ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x, ya);
    ctx.lineTo(x, yb);
    if (Math.abs(yb - ya) > 8) {
      ctx.moveTo(x - 2.4, yb - d * 3.4);
      ctx.lineTo(x, yb);
      ctx.lineTo(x + 2.4, yb - d * 3.4);
    }
    ctx.stroke();
  }

  // Linea vista di lato: pista centrale tra due piani di massa (una stripline, o un coassiale in sezione).
  // g: pista da x0 a xt, piani da x0 a xr, y quota della pista, gap metà spessore dell'isolante.
  // vAt(x) è la tensione totale all'ascissa x; vRef la tensione che accende del tutto campo e pista.
  function drawLine(ctx, g, vAt, vRef, diel) {
    const C = EA.colors;
    const top = g.y - g.gap;
    const bot = g.y + g.gap;
    ctx.save();
    ctx.fillStyle = diel;
    ctx.fillRect(g.x0, top, g.xr - g.x0, bot - top);
    ctx.fillStyle = EA.alpha(C.orange, 0.5);
    ctx.fillRect(g.x0, top - 4, g.xr - g.x0, 4);
    ctx.fillRect(g.x0, bot, g.xr - g.x0, 4);
    // campo elettrico tra pista e piani, proporzionale alla tensione locale
    const step = g.narrow ? 11 : 15;
    ctx.lineWidth = 1.2;
    for (let x = g.x0 + step * 0.6; x < g.xt - 3; x += step) {
      const v = vAt(x);
      const a = Math.min(1, Math.abs(v) / vRef);
      if (a < 0.05) continue;
      ctx.strokeStyle = EA.alpha(C.ink, 0.1 + 0.5 * a);
      const out = v > 0;
      fieldArrow(ctx, x, out ? g.y - 4 : top + 1, out ? top + 1 : g.y - 4);
      fieldArrow(ctx, x, out ? g.y + 4 : bot - 1, out ? bot - 1 : g.y + 4);
    }
    // pista: rame spento, poi la luce della tensione
    ctx.fillStyle = EA.alpha(C.orange, 0.7);
    ctx.fillRect(g.x0, g.y - 1.5, g.xt - g.x0, 3);
    const grad = ctx.createLinearGradient(g.x0, 0, g.xt, 0);
    const N = 40;
    for (let i = 0; i <= N; i++) {
      const a = Math.min(1, Math.abs(vAt(g.x0 + ((g.xt - g.x0) * i) / N)) / vRef);
      grad.addColorStop(i / N, EA.alpha(C.ink, a));
    }
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.24;
    ctx.fillRect(g.x0, g.y - 5, g.xt - g.x0, 10);
    ctx.globalAlpha = 1;
    ctx.fillRect(g.x0, g.y - 1.5, g.xt - g.x0, 3);
    ctx.restore();
  }

  function zigzag(ctx, xa, xb, y, n, amp) {
    const seg = (xb - xa) / (n * 2);
    ctx.lineTo(xa, y);
    for (let i = 0; i < n * 2; i++) ctx.lineTo(xa + seg * (i + 0.5), y + (i % 2 ? amp : -amp));
    ctx.lineTo(xb, y);
  }

  // Generatore a gradino tra pista e piano di massa, con la resistenza interna Rs in serie.
  function drawGenerator(ctx, g, on, labels) {
    const C = EA.colors;
    const n = g.narrow;
    const r = n ? 6 : 10;
    const cy = g.y + (n ? 7 : 10.5);
    const gx = g.gx;
    ctx.save();
    ctx.strokeStyle = EA.alpha(C.ink, 0.7);
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(gx, cy - r);
    ctx.lineTo(gx, g.y);
    zigzag(ctx, g.rsA, g.rsB, g.y, n ? 3 : 4, n ? 3.5 : 5);
    ctx.lineTo(g.x0, g.y);
    ctx.moveTo(gx, cy + r);
    ctx.lineTo(g.x0, cy + r);
    ctx.stroke();
    if (!n) {
      const yg = cy + r;
      ctx.beginPath();
      ctx.moveTo(gx - 7, yg + 3); ctx.lineTo(gx + 7, yg + 3);
      ctx.moveTo(gx - 4.5, yg + 6.5); ctx.lineTo(gx + 4.5, yg + 6.5);
      ctx.moveTo(gx - 2, yg + 10); ctx.lineTo(gx + 2, yg + 10);
      ctx.stroke();
    }
    ctx.fillStyle = C.bg;
    ctx.beginPath(); ctx.arc(gx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // simbolo del gradino: si accende quando il generatore è scattato
    ctx.strokeStyle = on ? C.cyan : EA.alpha(C.ink, 0.45);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx - r * 0.55, cy + r * 0.32);
    ctx.lineTo(gx - r * 0.05, cy + r * 0.32);
    ctx.lineTo(gx - r * 0.05, cy - r * 0.36);
    ctx.lineTo(gx + r * 0.55, cy - r * 0.36);
    ctx.stroke();
    ctx.restore();
    if (!n && labels) {
      EA.draw.text(ctx, labels.rs, (g.rsA + g.rsB) / 2, g.y - 11, { color: C.text, size: 10.5, align: 'center' });
      EA.draw.text(ctx, labels.vs, gx, cy + r + 26, { color: C.text, size: 10.5, align: 'center' });
    }
  }

  // Carico tra la fine della pista (x1) e la chiusura dei piani di massa (xe).
  // kind: 'open', 'short', 'res' o 'hidden'; heat 0–1 scalda il resistore; cover 0–1 copre il carico nascosto.
  function drawLoad(ctx, g, kind, o) {
    const C = EA.colors;
    const top = g.y - g.gap - 4;
    const bot = g.y + g.gap + 4;
    ctx.save();
    ctx.fillStyle = EA.alpha(C.orange, 0.5);
    ctx.fillRect(g.xe, top, 4, bot - top);
    const xa = g.x1;
    const xb = g.xe;
    const real = kind === 'hidden' ? o.real : kind;
    if (kind === 'hidden') ctx.globalAlpha = EA.clamp(1 - o.cover, 0, 1);
    if (real === 'short') {
      ctx.fillStyle = EA.alpha(C.orange, 0.85);
      ctx.fillRect(xa, g.y - 1.5, xb - xa, 3);
    } else if (real === 'res') {
      const pad = Math.min(8, (xb - xa) * 0.18);
      if (o.heat > 0.02) {
        const cx = (xa + xb) / 2;
        const rg = ctx.createRadialGradient(cx, g.y, 0, cx, g.y, (xb - xa) * 0.7);
        rg.addColorStop(0, EA.alpha(C.orange, 0.42 * o.heat));
        rg.addColorStop(1, EA.alpha(C.orange, 0));
        ctx.fillStyle = rg;
        ctx.fillRect(xa - 10, g.y - g.gap, xb - xa + 20, g.gap * 2);
      }
      ctx.strokeStyle = o.heat > 0.02 ? EA.alpha(C.orange, 0.6 + 0.4 * o.heat) : EA.alpha(C.ink, 0.8);
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(xa, g.y);
      zigzag(ctx, xa + pad, xb - pad, g.y, g.narrow ? 3 : 4, g.narrow ? 4 : 6);
      ctx.lineTo(xb, g.y);
      ctx.stroke();
    } else {
      // aperto: la pista finisce con un bordo arrotondato
      ctx.fillStyle = EA.alpha(C.orange, 0.7);
      ctx.beginPath(); ctx.arc(xa, g.y, 1.5, -Math.PI / 2, Math.PI / 2); ctx.fill();
    }
    if (kind === 'hidden' && o.cover > 0.01) {
      ctx.globalAlpha = EA.clamp(o.cover, 0, 1);
      const bx = xa - 3;
      const bw = xb - xa + 10;
      panel(ctx, bx, g.y - g.gap - 7, bw, g.gap * 2 + 14, EA.alpha(C.amber, 0.7));
      EA.draw.text(ctx, '?', bx + bw / 2, g.y + 6, { color: C.amber, size: g.narrow ? 15 : 18, weight: 800, align: 'center', mono: false });
    }
    ctx.restore();
    const sz = g.narrow ? 10.5 : 11;
    const label = (str, y, color) => {
      const w = textWidth(ctx, str, sz, 700);
      const cx = Math.min(Math.max((xa + xb) / 2 + 2, xa + (g.narrow ? 6 : 8) + w / 2), g.w - 3 - w / 2);
      EA.draw.text(ctx, str, cx, y, { color, size: sz, weight: 700, align: 'center' });
    };
    if (o.name) label(o.name, g.y - g.gap - 10, C.ink);
    if (o.gammaText) label(o.gammaText, g.y - g.gap - (g.narrow ? 24 : 27), C.amber);
  }

  /* ---------- animazione principale ---------- */

  // Pista interna (stripline) di 30 cm in FR-4; generatore da 1 V con Rs = Z0 = 50 Ω.
  const HERO = { vs: 1, rs: 50, z0: 50, len: 30, er: 4.3, tr: 0.2 };
  const SPEED = 0.85; // nanosecondi di tempo vero per ogni secondo di animazione
  const LEAD = 0.5;   // secondi di attesa prima che il generatore scatti
  const T_TDR = 6.5;  // nanosecondi mostrati dal riflettometro
  const VMAX = 1.15;

  function mountHero(view, api) {
    const C = EA.colors;
    const cv = api.canvas(view, { label: 'Una pista di circuito stampato vista di lato, tra due piani di massa. Un gradino di tensione parte dal generatore a sinistra, corre lungo la linea e si riflette sul carico a destra. Sopra la linea il profilo della tensione; in basso la tensione all\'ingresso nel tempo, come la registra un riflettometro.' });
    const PH = [
      { key: 'viaggio', zl: HERO.z0, load: 'none', dur: 4.2, t: 1.2, vmin: -0.16 },
      { key: 'aperto', zl: Infinity, load: 'open', dur: 8, t: 3, vmin: -0.16 },
      { key: 'corto', zl: 0, load: 'short', dur: 8, t: 3, vmin: -0.62 },
      { key: 'adattato', zl: HERO.z0, load: 'res', dur: 6, t: 3, vmin: -0.16 },
      { key: 'disadattato', zl: 150, load: 'res', dur: 8, t: 3, vmin: -0.16 },
      { key: 'tdr', zl: 25, load: 'hidden', dur: 10, t: 6, vmin: -0.3 },
    ].map((ph) => {
      const L = line(Object.assign({}, HERO, { zl: ph.zl }));
      return Object.assign(ph, { L, list: bounces(L, 30) });
    });
    let stage = 0;
    let stageT = 0;
    let live = false; // false: fotogramma statico e completo della fase (riduci movimento, scelta di un passo)
    let vmin = PH[0].vmin;

    // Testi delle fasi, con i numeri presi dal modello.
    const vel = velocity(HERO.er);
    const td = PH[0].L.td;
    const L5 = PH[4].L;
    const L6 = PH[5].L;
    const vTxt = EA.fmt(vel, 1) + ' cm/ns';
    const v5 = EA.fmt(L5.vFinal, 2) + ' V';
    const v6 = EA.fmt(L6.vFinal, 2) + ' V';
    const gRead = (L6.vFinal - L6.vLaunch) / L6.vLaunch;
    const zFound = EA.fmt(impedanceFromGamma(gRead, HERO.z0), 0) + ' Ω';
    const dist = EA.fmt(tdrDistance(2 * td, vel), 0) + ' cm';
    const zSaid = EA.fmt(impedanceFromGamma(gRead, HERO.z0), 0) + ' ohm';
    const TEXT = {
      viaggio: {
        title: 'IL FRONTE VIAGGIA',
        sub: 'v = c/√εr ≈ ' + vTxt + ' nella vetroresina FR-4: circa metà della velocità della luce',
        subN: 'circa ' + vTxt + ' nella vetroresina FR-4',
        card: ['Vlancio = Vs · Z0/(Rs + Z0) = 1 V · 50/100 = 0,5 V', 'all\'inizio il generatore non vede il carico: vede solo Z0, come un resistore da 50 Ω'],
        note: 'vede solo Z0 = 50 Ω',
        say: 'Il fronte viaggia a circa ' + EA.fmt(vel, 1) + ' centimetri ogni nanosecondo nella vetroresina FR-4, circa metà della velocità della luce. All\'inizio il generatore vede solo i 50 ohm della linea e lancia 0,5 volt.',
      },
      aperto: {
        title: 'FINE APERTA · Γ = +1',
        sub: 'l\'onda torna indietro con lo stesso segno: al carico 2 × 0,5 V = 1 V',
        subN: 'torna uguale: al carico 2 × 0,5 V = 1 V',
        card: ['Γ = (ZL − Z0)/(ZL + Z0) → +1 quando ZL → ∞', 'Vcarico = (1 + Γ) · Vinc = 2 × 0,5 V = 1 V: raddoppia l\'onda, non il generatore'],
        note: 'eco: 0,5 → 1 V',
        say: 'Fine aperta: l\'onda torna indietro con lo stesso segno e al carico la tensione arriva a 1 volt, il doppio dell\'onda incidente.',
      },
      corto: {
        title: 'CORTOCIRCUITO · Γ = −1',
        sub: 'l\'onda torna capovolta e cancella quella in arrivo: al carico resta 0 V',
        subN: 'torna capovolta: al carico 0 V',
        card: ['Γ = (0 − 50)/(0 + 50) = −1', 'Vcarico = (1 + Γ) · Vinc = 0 V, mentre la corrente raddoppia'],
        note: 'eco: 0,5 → 0 V',
        say: 'Cortocircuito: l\'onda torna capovolta e al carico la tensione resta a zero, mentre la corrente raddoppia.',
      },
      adattato: {
        title: 'CARICO ADATTATO · Γ = 0',
        sub: 'ZL = Z0 = 50 Ω: l\'onda viene assorbita e non torna niente',
        subN: 'ZL = Z0: assorbita, nessuna eco',
        card: ['Γ = (50 − 50)/(50 + 50) = 0', 'tutta l\'energia finisce nel resistore, come in una linea infinita'],
        note: 'nessuna eco',
        say: 'Carico adattato da 50 ohm: l\'onda viene assorbita e non torna niente.',
      },
      disadattato: {
        title: 'CARICO DISADATTATO · Γ = ' + signed(L5.gL, 2),
        sub: '150 Ω su una linea da 50 Ω: torna metà della tensione, un quarto della potenza',
        subN: 'torna metà: al carico ' + v5,
        card: ['Γ = (150 − 50)/(150 + 50) = ' + signed(L5.gL, 2), 'Vcarico = 1,5 × 0,5 V = ' + v5 + ', come il partitore Vs · ZL/(Rs + ZL)'],
        note: 'eco: 0,5 → ' + v5,
        say: 'Carico da 150 ohm: torna metà della tensione e il carico arriva a ' + EA.fmt(L5.vFinal, 2) + ' volt.',
      },
      tdr: {
        title: 'IL RIFLETTOMETRO (TDR)',
        sub: 'un carico nascosto: lo riconosciamo dall\'eco che torna all\'ingresso',
        subN: 'carico nascosto: lo svela l\'eco',
        cardWait: ['il riflettometro lancia un gradino e guarda solo l\'ingresso…', 'il tempo dell\'eco è di andata e ritorno'],
        card: [
          'eco 0,5 → ' + v6 + ' ⇒ Γ = ' + signed(gRead, 2) + ' ⇒ ZL = ' + zFound,
          'ZL = Z0 · (1 + Γ)/(1 − Γ) = 50 · ' + EA.fmt(1 + gRead, 2) + '/' + EA.fmt(1 - gRead, 2) + ' = ' + zFound,
          'ritardo ' + EA.fmt(2 * td, 2) + ' ns ⇒ d = v · t/2 = ' + EA.fmt(vel, 1) + ' × ' + EA.fmt(2 * td, 2) + '/2 ≈ ' + dist,
        ],
        noteWait: 'in attesa dell\'eco…',
        note: 'ZL = ' + zFound + ' a ' + dist,
        say: 'Il riflettometro guarda solo l\'ingresso: dopo ' + EA.fmt(2 * td, 2) + ' nanosecondi l\'eco abbassa la tensione da 0,5 a ' + EA.fmt(L6.vFinal, 2) + ' volt. Il carico nascosto vale ' + zSaid + ' e si trova a ' + EA.fmt(tdrDistance(2 * td, vel), 0) + ' centimetri.',
      },
    };
    const tReveal = 2 * L6.td + L6.ramp + 0.25;
    let noteW = 0; // larghezza della nota più lunga del riflettometro

    function geometry() {
      const w = cv.w;
      const hh = cv.h;
      const narrow = w < 560;
      const pad = narrow ? 12 : 22;
      const titleY = narrow ? 21 : 30;
      const gap = narrow ? 11 : 18;
      const x0 = pad + (narrow ? 42 : 112);
      const x1 = w - pad - (narrow ? 58 : 108);
      const xe = x1 + (narrow ? 30 : 56);
      const plotTop0 = titleY + (narrow ? 30 : 40);
      const tall = !narrow && hh > w * 0.6; // tablet in verticale: canvas quasi quadrato
      const maxPlot = narrow ? 160 : tall ? hh * 0.42 : 250;
      let boxH = narrow ? EA.clamp(hh * 0.3, 92, 124) : tall ? hh * 0.3 : EA.clamp(hh * 0.25, 112, 150);
      const below = () => {
        const boxY = hh - pad - boxH;
        const tickY = boxY - (narrow ? 12 : 16);
        const y = tickY - (narrow ? 14 : 17) - 4 - gap;
        return { boxY, tickY, y, plotBot: y - gap - 4 - (narrow ? 14 : 18) };
      };
      let v = below();
      if (v.plotBot - plotTop0 > maxPlot) {
        boxH = Math.min(boxH + (v.plotBot - plotTop0 - maxPlot) * 0.5, narrow ? 150 : tall ? hh * 0.36 : 210);
        v = below();
      }
      const gx = pad + (narrow ? 9 : 16);
      // riflettometro: largo come il canvas sui telefoni, altrimenti lascia posto ai conti
      const bw0 = narrow ? w - 2 * pad : EA.clamp(w * 0.37, 270, 420);
      const bw1 = narrow ? bw0 : Math.max(bw0, Math.min(660, w * 0.56, w - 2 * pad - 260));
      return {
        w, hh, narrow, pad, titleY, gap, x0, x1, xe, boxH, gx, bw0, bw1,
        rsA: gx + (narrow ? 8 : 18), rsB: x0 - (narrow ? 6 : 20),
        plotTop: Math.max(plotTop0, v.plotBot - maxPlot),
        boxY: v.boxY, tickY: v.tickY, y: v.y, plotBot: v.plotBot,
      };
    }

    function draw(t, dt) {
      if (!cv.w) return;
      const playing = loop.playing;
      if (playing) {
        live = true;
        stageT += dt;
        if (stageT > PH[stage].dur) {
          stageT = 0;
          stage = (stage + 1) % PH.length;
          api.setStep(stage);
        }
      }
      const ph = PH[stage];
      const L = ph.L;
      const tx = TEXT[ph.key];
      const anim = playing || live;
      const tn = anim ? (stageT - LEAD) * SPEED : ph.t;
      vmin = playing ? vmin + (ph.vmin - vmin) * (1 - Math.exp(-dt * 5)) : ph.vmin;
      const g = geometry();
      const ctx = cv.ctx;
      const infinite = ph.load === 'none';
      const X = (xi) => g.x0 + xi * (g.x1 - g.x0);
      const XI = (x) => (x - g.x0) / (g.x1 - g.x0);
      const Y = (v) => g.plotBot - ((v - vmin) / (VMAX - vmin)) * (g.plotBot - g.plotTop);
      const vAt = (x) => voltage(L, ph.list, XI(x), tn).v;
      const xEnd = infinite ? g.w : g.x1;

      EA.draw.clear(cv);

      // reticolo ogni 5 cm e livelli di tensione
      ctx.save();
      ctx.strokeStyle = C.grid2;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let cm = 0; X(cm / HERO.len) <= xEnd + 0.5; cm += 5) {
        const x = Math.round(X(cm / HERO.len)) + 0.5;
        ctx.moveTo(x, g.plotTop);
        ctx.lineTo(x, g.plotBot);
      }
      ctx.stroke();
      ctx.restore();
      const levels = [0, 0.5, 1];
      if (ph.key === 'corto') levels.push(-0.5);
      if (ph.key === 'disadattato' || ph.key === 'tdr') levels.push(L.vFinal);
      levels.forEach((v) => {
        const y = Math.round(Y(v)) + 0.5;
        ctx.save();
        ctx.strokeStyle = v === 0 ? C.grid : EA.alpha(C.text, 0.28);
        if (v !== 0) ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(g.x0, y); ctx.lineTo(xEnd, y); ctx.stroke();
        ctx.restore();
        const lab = v === 0 ? '0' : v === 1 ? '1 V' : EA.fmt(v, 2) + ' V';
        EA.draw.text(ctx, lab, g.x0 - (g.narrow ? 5 : 9), y + 4, { color: C.text, size: 10.5, align: 'right' });
      });

      // profilo della tensione lungo la linea
      const step = g.narrow ? 1.5 : 2;
      const xs = [];
      const s = { f: [], b: [], v: [] };
      for (let x = g.x0; x <= xEnd + 0.01; x += step) {
        const p = voltage(L, ph.list, XI(x), tn);
        xs.push(x); s.f.push(p.f); s.b.push(p.b); s.v.push(p.v);
      }
      drawProfile(ctx, xs, s, Y);

      // fronti in viaggio: freccia sopra il profilo e bagliore sulla pista
      const fronts = [];
      ph.list.forEach((w) => {
        const el = tn - w.t0 - L.ramp / 2;
        if (el <= 0 || Math.abs(w.a) < 0.02) return;
        const xi = w.dir > 0 ? el / L.td : 1 - el / L.td;
        if (xi < 0.015 || xi > (infinite ? (g.w - g.x0) / (g.x1 - g.x0) : 0.985)) return;
        fronts.push({ x: X(xi), xi, dir: w.dir, color: w.dir > 0 ? C.cyan : C.amber });
      });
      fronts.forEach((fr) => {
        const yTop = Math.min(Y(vAt(fr.x - 16)), Y(vAt(fr.x + 16)), Y(0)) - 13;
        EA.draw.arrow(ctx, fr.x - 13 * fr.dir, yTop, fr.x + 13 * fr.dir, yTop, fr.color, 2, 7);
      });

      // la linea
      const lg = { x0: g.x0, xt: infinite ? g.w : g.x1, xr: infinite ? g.w : g.xe, y: g.y, gap: g.gap, narrow: g.narrow };
      drawLine(ctx, lg, vAt, 1, EA.alpha(C.lime, 0.09));
      fronts.forEach((fr) => {
        const gr = ctx.createLinearGradient(fr.x - 18, 0, fr.x + 18, 0);
        gr.addColorStop(0, EA.alpha(fr.color, 0));
        gr.addColorStop(0.5, EA.alpha(fr.color, 0.4));
        gr.addColorStop(1, EA.alpha(fr.color, 0));
        ctx.fillStyle = gr;
        ctx.fillRect(fr.x - 18, g.y - g.gap - 4, 36, g.gap * 2 + 8);
      });
      drawGenerator(ctx, g, tn > 0, { rs: 'Rs = 50 Ω', vs: 'Vs = 1 V' });

      // il carico (nella prima fase la linea non finisce)
      if (!infinite) {
        let cover = 0;
        let name = '';
        let gammaText = 'Γ = ' + signed(L.gL, 2);
        if (ph.load === 'open') name = 'aperto';
        else if (ph.load === 'short') name = 'corto';
        else name = EA.fmt(ph.zl, 0) + ' Ω' + (ph.key === 'adattato' && !g.narrow ? ' = Z0' : '');
        if (ph.load === 'hidden') {
          cover = 1 - EA.smooth((tn - tReveal) / 0.6);
          if (cover > 0.5) { name = 'ZL = ?'; gammaText = 'Γ = ?'; }
        }
        const vl = loadVoltage(L, ph.list, tn);
        const heat = (1 - L.gL * L.gL) * EA.clamp(vl / Math.max(0.05, L.vFinal), 0, 1);
        drawLoad(ctx, g, ph.load, { real: 'res', heat, cover, name, gammaText });
      }

      // righello sotto la linea
      const tickTop = g.y + g.gap + 4;
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let cm = 0; X(cm / HERO.len) <= xEnd + 0.5; cm += 5) {
        const x = Math.round(X(cm / HERO.len)) + 0.5;
        ctx.moveTo(x, tickTop + 2);
        ctx.lineTo(x, tickTop + 6);
      }
      ctx.stroke();
      ctx.restore();
      const frontLabel = ph.key === 'viaggio' && fronts.length && fronts[0].xi <= 1 ? fronts[0] : null;
      (g.narrow ? [0, 15, 30] : [0, 10, 20, 30]).forEach((cm) => {
        const x = X(cm / HERO.len);
        if (frontLabel && Math.abs(frontLabel.x - x) < 36) return;
        EA.draw.text(ctx, cm === HERO.len ? cm + ' cm' : String(cm), x, g.tickY, { color: C.dim, size: 10.5, align: 'center' });
      });
      if (frontLabel) EA.draw.text(ctx, fixed(frontLabel.xi * HERO.len, 1) + ' cm', frontLabel.x, g.tickY, { color: C.cyan, size: 10.5, weight: 700, align: 'center' });

      // linea infinita: sfuma verso destra
      if (infinite) {
        const fx = g.x1 + 6;
        const gr = ctx.createLinearGradient(fx, 0, g.w - 4, 0);
        gr.addColorStop(0, EA.alpha(C.bg, 0));
        gr.addColorStop(1, C.bg);
        ctx.fillStyle = gr;
        ctx.fillRect(fx, g.plotTop - 6, g.w - fx, g.tickY + 6 - (g.plotTop - 6));
        EA.draw.text(ctx, g.narrow ? 'continua →' : 'la linea continua →', g.w - g.pad, g.y - g.gap - 12, { color: C.dim, size: 10.5, align: 'right' });
      }

      // sonda del riflettometro all'ingresso
      if (!g.narrow) {
        const px = g.x0 - 8;
        const yb = g.y + 21;
        ctx.save();
        ctx.strokeStyle = EA.alpha(C.cyan, 0.55);
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(px, g.y + 3); ctx.lineTo(px, yb - 4);
        ctx.moveTo(px, yb + 4); ctx.lineTo(px, g.boxY);
        ctx.stroke();
        ctx.restore();
        EA.draw.dot(ctx, px, g.y, 2.6, C.cyan);
      }

      // titolo, sottotitolo, orologio e legenda
      const tsz = g.narrow ? 11 : 12;
      EA.draw.text(ctx, (stage + 1) + ' · ' + tx.title, g.pad, g.titleY, { color: C.ink, size: tsz, weight: 700 });
      EA.draw.text(ctx, 't = ' + fixed(Math.max(0, tn), 2) + ' ns', g.w - g.pad, g.titleY, { color: C.ink, size: tsz, weight: 700, align: 'right' });
      const ssz = g.narrow ? 10.5 : 11.5;
      const subLines = wrap(ctx, g.narrow ? tx.subN : tx.sub, g.w - 2 * g.pad, ssz, 600);
      subLines.slice(0, 2).forEach((ln, i) => EA.draw.text(ctx, ln, g.pad, g.titleY + 17 + i * 14, { color: C.text, size: ssz }));
      if (!g.narrow && subLines.length === 1) {
        const items = [
          { label: 'totale', color: C.ink },
          { label: 'incidente →', color: C.cyan, dash: true },
          { label: '← riflessa', color: C.amber, dash: true },
        ];
        const need = textWidth(ctx, subLines[0], ssz, 600) + g.pad + 40;
        const legW = items.reduce((a, it) => a + textWidth(ctx, it.label, 10.5, 600) + 42, -16);
        if (g.w - g.pad - legW > need) legend(ctx, g.w - g.pad, g.titleY + 17, items);
      }

      // riflettometro e conti
      const big = ph.key === 'tdr' ? (anim ? EA.ease.out(stageT / 0.9) : 1) : 0;
      const box = drawScope(ctx, g, ph, tx, tn, anim, big);
      if (!g.narrow) drawCard(ctx, g, box, ph, tx, tn);
    }

    function drawScope(ctx, g, ph, tx, tn, playing, big) {
      const L = ph.L;
      const b = { x: g.pad, y: g.boxY, w: EA.lerp(g.bw0, g.bw1, big), h: g.boxH };
      panel(ctx, b.x, b.y, b.w, b.h, big > 0.5 ? EA.alpha(C.cyan, 0.85) : C.grid);
      // titolo lungo solo se ci sta accanto alla nota più larga, uguale in tutte le fasi
      const longHead = 'RIFLETTOMETRO · TENSIONE ALL\'INGRESSO';
      if (!noteW) Object.keys(TEXT).forEach((k) => { [TEXT[k].note, TEXT[k].noteWait || ''].forEach((n) => { noteW = Math.max(noteW, textWidth(ctx, n, 10.5, 700)); }); });
      const head = !g.narrow && textWidth(ctx, longHead, 10.5, 700) + noteW + 32 <= g.bw0 ? longHead : 'TDR · INGRESSO';
      EA.draw.text(ctx, head, b.x + 12, b.y + 18, { color: big > 0.5 ? C.cyan : C.dim, size: 10.5, weight: 700 });
      const recorded = !playing || tn >= 2 * L.td + L.ramp;
      let note = '';
      let noteColor = C.amber;
      if (ph.key === 'viaggio') { note = tn > 0 || !playing ? tx.note : ''; noteColor = C.cyan; }
      else if (ph.key === 'tdr') note = tn >= tReveal || !playing ? tx.note : tn > 0 ? tx.noteWait : '';
      else if (recorded) note = tx.note;
      if (note) EA.draw.text(ctx, note, b.x + b.w - 12, b.y + 18, { color: noteColor, size: 10.5, weight: 700, align: 'right' });

      const px0 = b.x + (g.narrow ? 36 : 44);
      const px1 = b.x + b.w - 14;
      const py0 = b.y + 30;
      const py1 = b.y + b.h - 22;
      const TX = (tt) => px0 + (tt / T_TDR) * (px1 - px0);
      const TY = (v) => py1 - ((v + 0.12) / 1.27) * (py1 - py0);
      [[0, '0'], [0.5, '0,5'], [1, '1 V']].forEach(([v, lab]) => {
        const y = Math.round(TY(v)) + 0.5;
        ctx.save();
        ctx.strokeStyle = v === 0 ? C.grid : C.grid2;
        ctx.beginPath(); ctx.moveTo(px0, y); ctx.lineTo(px1, y); ctx.stroke();
        ctx.restore();
        EA.draw.text(ctx, lab, px0 - 6, y + 4, { color: C.dim, size: 10.5, align: 'right' });
      });
      [0, 2, 4, 6].forEach((tt) => {
        const x = TX(tt);
        ctx.save();
        ctx.strokeStyle = C.grid2;
        ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, py0); ctx.lineTo(Math.round(x) + 0.5, py1); ctx.stroke();
        ctx.restore();
        EA.draw.text(ctx, tt === 6 ? '6 ns' : String(tt), x, py1 + 15, { color: C.dim, size: 10.5, align: 'center' });
      });
      // istante dell'eco: andata e ritorno
      const te = 2 * L.td;
      if (ph.key !== 'viaggio' && ph.key !== 'adattato' && recorded) {
        ctx.save();
        ctx.strokeStyle = EA.alpha(C.amber, 0.55);
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(Math.round(TX(te)) + 0.5, py0); ctx.lineTo(Math.round(TX(te)) + 0.5, py1); ctx.stroke();
        ctx.restore();
      }
      const tEnd = playing ? EA.clamp(tn, 0, T_TDR) : T_TDR;
      if (tEnd > 0) {
        const pts = [];
        const dtt = (T_TDR / (px1 - px0)) * 1.5;
        for (let tt = 0; tt < tEnd; tt += dtt) pts.push([TX(tt), TY(inputVoltage(L, ph.list, tt))]);
        pts.push([TX(tEnd), TY(inputVoltage(L, ph.list, tEnd))]);
        EA.draw.line(ctx, pts, C.ink, 2);
      }
      if (tn >= 0 && tn <= T_TDR) EA.draw.dot(ctx, TX(tn), TY(inputVoltage(L, ph.list, tn)), 3, C.cyan);
      return b;
    }

    function drawCard(ctx, g, b, ph, tx, tn) {
      const x = b.x + b.w + 30;
      const maxW = g.w - g.pad - x;
      if (maxW < 200) return;
      const lines = ph.key === 'tdr' && tn < tReveal ? tx.cardWait : tx.card;
      ctx.save();
      ctx.fillStyle = EA.alpha(C.cyan, 0.5);
      ctx.fillRect(x - 16, b.y + 6, 2, b.h - 12);
      ctx.restore();
      EA.draw.text(ctx, 'IN NUMERI', x, b.y + 18, { color: C.dim, size: 10.5, weight: 700 });
      // prima riga in evidenza, le altre come spiegazione
      let y = b.y + 42;
      lines.forEach((txt, i) => {
        const size = i ? 11.5 : 12.5;
        const weight = i ? 600 : 700;
        if (i) y += i === 1 ? 6 : 4;
        wrap(ctx, txt, maxW, size, weight).forEach((ln) => {
          if (y < b.y + b.h - 4) EA.draw.text(ctx, ln, x, y, { color: i ? C.text : C.ink, size, weight });
          y += i ? 16 : 17;
        });
      });
    }

    const loop = api.loop(draw);
    api.setStep(0);
    return {
      focus(key, i) {
        stage = EA.clamp(i, 0, PH.length - 1);
        stageT = 0;
        live = false;
        api.setStep(stage);
        api.invalidate();
        api.announce('Fase ' + (stage + 1) + '. ' + TEXT[PH[stage].key].say);
      },
    };
  }

  /* ---------- laboratorio: riflettometro e diagramma a rimbalzi ---------- */

  const MEDIA = {
    aria: { er: 1, name: 'aria' },
    ptfe: { er: 2.1, name: 'PTFE' },
    fr4: { er: 4.3, name: 'FR-4' },
  };
  const TRACE_N = 600; // campioni della traccia TDR
  const SWEEP = 7;     // secondi per percorrere quattro andate e ritorno (fino al doppio se ne servono di più)
  const HOLD = 1.5;    // pausa alla fine, prima di ripartire

  function mountLab(parts, api) {
    const C = EA.colors;
    const h = EA.h;
    const DIEL = { aria: EA.alpha(C.blue, 0.035), ptfe: EA.alpha(C.ink, 0.075), fr4: EA.alpha(C.lime, 0.09) };
    const st = { zl: 150, zMode: 'r', z0: 50, rs: 50, len: 30, med: 'fr4', tr: 0.2, phi: 0.2 };
    const trace = new Float64Array(TRACE_N + 1);
    let L = null;
    let list = [];
    let span = 1;
    let rng = { lo: 0, hi: 1 };
    let tLo = 0;
    let tHi = 1;
    let sweep = SWEEP;
    let clock = st.phi * sweep;
    let uiT = 0;
    let ver = 0;       // cresce a ogni ricalcolo
    let tdrKey = '';   // etichette del TDR già sistemate per questa versione e misura
    let tdrTags = [];

    parts.readouts.classList.add('linee-readouts');
    parts.controls.classList.add('linee-controls');
    const cv = api.canvas(parts.display, { class: 'ea-canvas linee-lab-canvas', label: 'In alto la linea con il profilo della tensione: in ciano le onde che vanno verso il carico, in ambra quelle che tornano, in chiaro la tensione totale. In basso la tensione all\'ingresso nel tempo, come la misura un riflettometro, e sugli schermi larghi il diagramma a rimbalzi, con lo spazio in orizzontale e il tempo che scorre verso il basso.' });

    const zlValue = () => (st.zMode === 'corto' ? 0 : st.zMode === 'aperto' ? Infinity : st.zl);
    const timeText = (ns) => fixed(ns, span < 10 ? 2 : 1) + ' ns';

    function recompute() {
      L = line({ vs: 1, rs: st.rs, z0: st.z0, zl: zlValue(), len: st.len, er: MEDIA[st.med].er, tr: st.tr });
      ver++;
      span = timeSpan(L);
      // più andate e ritorno da seguire, scansione un po' più lenta; con un fronte lento basta la durata base
      sweep = span > 6 * L.tr ? EA.clamp(1.75 * roundTrips(L), SWEEP, 2 * SWEEP) : SWEEP;
      clock = st.phi * sweep;
      list = bounces(L, span);
      rng = ranges(list);
      tLo = 0;
      tHi = 0;
      for (let i = 0; i <= TRACE_N; i++) {
        const v = voltage(L, list, 0, (span * i) / TRACE_N).v;
        trace[i] = v;
        if (v < tLo) tLo = v;
        if (v > tHi) tHi = v;
      }
    }
    recompute();

    // comandi
    const zl = EA.ui.slider({
      label: 'Carico ZL', min: 1, max: 1e4, log: true, value: st.zl, color: C.amber,
      format: (v) => (st.zMode === 'corto' ? '0 Ω · corto' : st.zMode === 'aperto' ? '∞ · aperto' : EA.si(v, 'Ω')),
      oninput: (v) => { st.zMode = 'r'; st.zl = v; zl.set(v, true); update(); },
    });
    const quick = h('div', { class: 'linee-quick', role: 'group', 'aria-label': 'Scelte rapide per il carico' });
    const quickBtns = [
      ['corto', 'Corto', 'Carico in cortocircuito, 0 Ω'],
      ['adattato', 'Adattato', 'Carico uguale all\'impedenza della linea'],
      ['aperto', 'Aperto', 'Linea aperta in fondo'],
    ].map(([key, label, title]) => {
      const b = EA.ui.button({ label, title, onclick: () => pick(key) });
      b.setAttribute('aria-pressed', 'false');
      quick.append(b);
      return { key, b };
    });
    function pick(key) {
      if (key === 'corto') { st.zMode = 'corto'; zl.set(1, true); } else if (key === 'aperto') { st.zMode = 'aperto'; zl.set(1e4, true); } else { st.zMode = 'r'; st.zl = st.z0; zl.set(st.z0, true); }
      update();
    }
    const z0 = EA.ui.segmented({
      label: 'Impedenza della linea Z0', color: C.cyan,
      options: [{ value: 50, label: '50 Ω' }, { value: 75, label: '75 Ω' }, { value: 100, label: '100 Ω' }],
      value: st.z0,
      onchange: (v) => { st.z0 = v; update(); },
    });
    const rs = EA.ui.slider({
      label: 'Resistenza del generatore Rs', min: 5, max: 500, log: true, value: st.rs, color: C.cyan,
      format: (v) => EA.si(v, 'Ω'),
      hint: 'Un riflettometro ha Rs = Z0 e assorbe l\'eco. Con 10 Ω l\'onda rimbalza più volte.',
      oninput: (v) => { st.rs = v; update(); },
    });
    const len = EA.ui.slider({
      label: 'Lunghezza della linea', min: 1, max: 300, log: true, value: st.len, color: C.cyan,
      format: lengthText,
      oninput: (v) => { st.len = v; update(); },
    });
    const med = EA.ui.segmented({
      label: 'Isolante', color: C.cyan,
      options: [{ value: 'aria', label: 'Aria', title: 'εr ≈ 1' }, { value: 'ptfe', label: 'PTFE', title: 'εr ≈ 2,1' }, { value: 'fr4', label: 'FR-4', title: 'εr ≈ 4,3' }],
      value: st.med,
      onchange: (v) => { st.med = v; update(); },
    });
    const tr = EA.ui.slider({
      label: 'Tempo di salita tr', min: 0.01, max: 5, log: true, value: st.tr, color: C.cyan,
      format: (v) => EA.si(v * 1e-9, 's'),
      hint: 'Dal 10 al 90%. Con fronti lenti su una linea corta i rimbalzi si confondono in un\'unica salita.',
      oninput: (v) => { st.tr = v; update(); },
    });
    const time = EA.ui.slider({
      label: 'Istante', min: 0, max: 1000, step: 1, value: Math.round(st.phi * 1000), color: C.ink,
      format: (v) => 't = ' + timeText((v / 1000) * span),
      hint: 'Muovilo per fermare il tempo e seguire i rimbalzi; il pulsante in alto fa ripartire l\'animazione.',
      oninput: (v) => { st.phi = v / 1000; clock = st.phi * sweep; api.pause(); api.invalidate(); },
    });
    parts.controls.append(
      h('div', { class: 'ea-ctl linee-zl' }, zl.el, quick),
      z0.el, rs.el, len.el,
      h('div', { class: 'ea-ctl' }, med.el, h('small', { class: 'ea-ctl-hint' }, 'Costante dielettrica relativa εr: aria ≈ 1; PTFE ≈ 2,1; FR\u20114 ≈ 4,3. La linea è immersa nell\'isolante (coassiale o pista interna); in una microstrip parte del campo è in aria e l\'onda va un po\' più veloce.')),
      tr.el, time.el);

    // display numerici
    const roG = EA.ui.readout({ label: 'Γ al carico' });
    const roR = EA.ui.readout({ label: 'Tensione riflessa' });
    const roV = EA.ui.readout({ label: 'Velocità' });
    const roT = EA.ui.readout({ label: 'Ritardo di andata' });
    const roF = EA.ui.readout({ label: 'Valore finale' });
    const roC = EA.ui.readout({ label: 'Lunghezza critica' });
    const roL = EA.ui.readout({ label: 'Verdetto' });
    roL.el.classList.add('linee-ro-wrap', 'linee-ro-verdict');
    parts.readouts.append(roG.el, roR.el, roV.el, roT.el, roF.el, roC.el, roL.el);

    function update() {
      recompute();
      const long = isLong(L.len, L.er, L.tr);
      const crit = criticalLength(L.er, L.tr);
      roG.set(signed(L.gL, 2), Math.abs(L.gL) < 0.05 ? 'good' : 'warn');
      roR.set(signed(L.gL * 100, 0) + ' %');
      roV.set(EA.fmt(L.v, 1) + ' cm/ns');
      roT.set(EA.si(L.td * 1e-9, 's'));
      roF.set(EA.fmt(L.vFinal, 2) + ' V');
      roC.set(smallLength(crit));
      roL.set(long ? 'linea lunga' : 'collegamento corto', long ? 'warn' : 'good');
      quickBtns.forEach(({ key, b }) => {
        const on = key === st.zMode || (key === 'adattato' && st.zMode === 'r' && Math.abs(st.zl - st.z0) < 0.5);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      time.set(Math.round(st.phi * 1000), true);
      api.invalidate();
      const zName = st.zMode === 'corto' ? 'un cortocircuito' : st.zMode === 'aperto' ? 'un circuito aperto' : 'un carico da ' + EA.fmt(st.zl, 0) + ' ohm';
      api.announce('Linea da ' + st.z0 + ' ohm chiusa su ' + zName + ': coefficiente di riflessione ' + signed(L.gL, 2) +
        (L.gL < -0.005 ? ', l\'eco torna capovolta' : '') + '. Ritardo di andata ' + EA.fmt(L.td, 2) + ' nanosecondi, valore finale ' +
        EA.fmt(L.vFinal, 2) + ' volt. ' + (long ? 'Linea lunga: supera' : 'Collegamento corto: resta sotto') +
        ' la soglia di ' + smallLength(crit).replace('mm', 'millimetri').replace('cm', 'centimetri') + ' della regola pratica.');
    }

    function geometry() {
      const w = cv.w;
      const hh = cv.h;
      const narrow = w < 560;
      const pad = narrow ? 10 : 16;
      const headY = narrow ? 17 : 20;
      const gap = narrow ? 10 : 15;
      const x0 = pad + (narrow ? 38 : 96);
      const x1 = w - pad - (narrow ? 56 : 96);
      const topH = Math.round(hh * (narrow ? 0.47 : 0.5));
      const tickY = topH - (narrow ? 8 : 10);
      const y = tickY - (narrow ? 14 : 17) - 4 - gap;
      const bTop = topH + (narrow ? 10 : 14);
      const split = Math.round(w * 0.58);
      const side = w >= 660; // il diagramma a rimbalzi accanto alla traccia
      const gx = pad + (narrow ? 8 : 16);
      return {
        w, hh, narrow, pad, headY, gap, x0, x1, xe: x1 + (narrow ? 30 : 50), y, tickY, gx,
        rsA: gx + (narrow ? 8 : 18), rsB: x0 - (narrow ? 5 : 16),
        plotTop: headY + (narrow ? 16 : 22), plotBot: y - gap - 4 - (narrow ? 12 : 16),
        tdr: side ? { x: pad, y: bTop, w: split - pad - 12, h: hh - pad - bTop } : { x: pad, y: bTop, w: w - 2 * pad, h: hh - pad - bTop },
        lat: side ? { x: split + 12, y: bTop, w: w - pad - split - 12, h: hh - pad - bTop } : null,
      };
    }

    function draw(t, dt) {
      if (!cv.w) return;
      if (dt > 0) {
        clock += dt;
        if (clock > sweep + HOLD) clock = 0;
        st.phi = Math.min(1, clock / sweep);
        uiT += dt;
        if (uiT > 0.15) { uiT = 0; time.set(Math.round(st.phi * 1000), true); }
      }
      const g = geometry();
      const ctx = cv.ctx;
      const tn = st.phi * span;
      EA.draw.clear(cv);
      drawTop(ctx, g, tn);
      drawTdr(ctx, g, tn);
      if (g.lat) drawLattice(ctx, g, tn);
    }

    // in alto: la linea con il profilo della tensione
    function drawTop(ctx, g, tn) {
      const X = (xi) => g.x0 + xi * (g.x1 - g.x0);
      const XI = (x) => (x - g.x0) / (g.x1 - g.x0);
      const lo = Math.min(0, rng.lo);
      const hi = Math.max(0.25, rng.hi);
      const m = (hi - lo) * 0.08;
      const vLo = lo - m;
      const vHi = hi + m;
      const Y = (v) => g.plotBot - ((v - vLo) / (vHi - vLo)) * (g.plotBot - g.plotTop);
      const vAt = (x) => voltage(L, list, XI(x), tn).v;

      // intestazione
      const head = g.narrow
        ? lengthText(st.len) + ' · ' + MEDIA[st.med].name + ' · ' + st.z0 + ' Ω'
        : 'linea di ' + lengthText(st.len) + ' in ' + MEDIA[st.med].name + ' · Z0 = ' + st.z0 + ' Ω';
      const hsz = g.narrow ? 10.5 : 11.5;
      EA.draw.text(ctx, head, g.pad, g.headY, { color: C.ink, size: hsz, weight: 700 });
      const clockTxt = 't = ' + timeText(tn);
      EA.draw.text(ctx, clockTxt, g.w - g.pad, g.headY, { color: C.ink, size: hsz, weight: 700, align: 'right' });
      if (!g.narrow) {
        const items = [
          { label: 'totale', color: C.ink },
          { label: 'incidente →', color: C.cyan, dash: true },
          { label: '← riflessa', color: C.amber, dash: true },
        ];
        const legW = items.reduce((a, it) => a + textWidth(ctx, it.label, 10.5, 600) + 42, -16);
        const left = g.pad + textWidth(ctx, head, hsz, 700) + 30;
        const right = g.w - g.pad - textWidth(ctx, clockTxt, hsz, 700) - 30;
        if (right - left > legW) legend(ctx, (left + right + legW) / 2, g.headY, items);
      }

      // reticolo e livelli
      const tk = ticks(vLo, vHi, g.narrow ? 3 : 4);
      const dec = Math.max(0, -Math.floor(Math.log10(tk.step) + 1e-9));
      ctx.save();
      ctx.strokeStyle = C.grid2;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const x = Math.round(X(i / 10)) + 0.5;
        ctx.moveTo(x, g.plotTop); ctx.lineTo(x, g.plotBot);
      }
      ctx.stroke();
      ctx.restore();
      tk.list.forEach((v) => {
        const y = Math.round(Y(v)) + 0.5;
        ctx.save();
        ctx.strokeStyle = v === 0 ? C.grid : EA.alpha(C.text, 0.22);
        if (v !== 0) ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(g.x0, y); ctx.lineTo(g.x1, y); ctx.stroke();
        ctx.restore();
        const lab = v === 0 ? '0' : EA.fmt(v, dec) + ' V';
        EA.draw.text(ctx, lab, g.x0 - (g.narrow ? 5 : 9), y + 4, { color: C.text, size: 10.5, align: 'right' });
      });

      // profilo
      const step = g.narrow ? 1.5 : 2;
      const xs = [];
      const s = { f: [], b: [], v: [] };
      for (let x = g.x0; x <= g.x1 + 0.01; x += step) {
        const p = voltage(L, list, XI(x), tn);
        xs.push(x); s.f.push(p.f); s.b.push(p.b); s.v.push(p.v);
      }
      drawProfile(ctx, xs, s, Y);

      // linea, generatore e carico
      const vRef = Math.max(0.3, hi);
      drawLine(ctx, { x0: g.x0, xt: g.x1, xr: g.xe, y: g.y, gap: g.gap, narrow: g.narrow }, vAt, vRef, DIEL[st.med]);
      drawGenerator(ctx, g, tn > 0, { rs: 'Rs = ' + EA.si(st.rs, 'Ω'), vs: 'Vs = 1 V' });
      const kind = st.zMode === 'corto' ? 'short' : st.zMode === 'aperto' ? 'open' : 'res';
      const vl = loadVoltage(L, list, tn);
      const heat = kind === 'res' ? (1 - L.gL * L.gL) * EA.clamp(Math.abs(vl) / Math.max(0.05, Math.abs(L.vFinal)), 0, 1) : 0;
      const name = kind === 'short' ? 'corto' : kind === 'open' ? 'aperto' : EA.si(st.zl, 'Ω');
      drawLoad(ctx, g, kind, { heat, name, gammaText: 'Γ = ' + signed(L.gL, 2) });

      // righello
      const tickTop = g.y + g.gap + 4;
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const x = Math.round(X(i / 10)) + 0.5;
        ctx.moveTo(x, tickTop + 2); ctx.lineTo(x, tickTop + (i % 5 ? 4 : 7));
      }
      ctx.stroke();
      ctx.restore();
      const marks = g.narrow ? [0, 1] : [0, 0.5, 1];
      marks.forEach((f) => EA.draw.text(ctx, f === 0 ? '0' : lengthText(st.len * f), X(f), g.tickY, { color: C.dim, size: 10.5, align: 'center' }));
    }

    // in basso a sinistra: la traccia del riflettometro
    function drawTdr(ctx, g, tn) {
      const b = g.tdr;
      const n = g.narrow;
      const te = 2 * L.td;
      const hasEcho = Math.abs(L.gL) > 0.003 && te <= span;
      const echo = (n ? 'eco a ' : 'eco dopo 2·TD = ') + EA.si(te * 1e-9, 's');
      let title = n ? 'TDR · TENSIONE ALL\'INGRESSO' : 'TRACCIA TDR · TENSIONE ALL\'INGRESSO';
      if (textWidth(ctx, title, 10.5, 700) + (hasEcho ? textWidth(ctx, echo, 10.5, 700) + 16 : 0) > b.w) title = 'TRACCIA TDR';
      EA.draw.text(ctx, title, b.x, b.y + 12, { color: C.ink, size: 10.5, weight: 700 });
      if (hasEcho) EA.draw.text(ctx, echo, b.x + b.w, b.y + 12, { color: C.amber, size: 10.5, weight: 700, align: 'right' });
      const px0 = b.x + 40;
      const px1 = b.x + b.w - 4;
      const py0 = b.y + 26;
      const py1 = b.y + b.h - 20;
      // la scala comprende sempre il valore finale, anche quando la traccia non ci arriva in tempo
      const lo = Math.min(0, tLo, L.vFinal);
      const hi = Math.max(0.25, tHi, L.vFinal);
      const m = (hi - lo) * 0.08;
      const vLo = lo - m;
      const vHi = hi + m;
      const TX = (tt) => px0 + (tt / span) * (px1 - px0);
      const TY = (v) => py1 - ((v - vLo) / (vHi - vLo)) * (py1 - py0);

      // reticolo con tacche tonde
      const tv = ticks(vLo, vHi, n ? 3 : 4);
      const decV = Math.max(0, -Math.floor(Math.log10(tv.step) + 1e-9));
      const tt = ticks(0, span, n ? 4 : 6);
      const decT = Math.max(0, -Math.floor(Math.log10(tt.step) + 1e-9));
      ctx.save();
      ctx.strokeStyle = C.grid2;
      ctx.beginPath();
      tv.list.forEach((v) => { const y = Math.round(TY(v)) + 0.5; ctx.moveTo(px0, y); ctx.lineTo(px1, y); });
      tt.list.forEach((x) => { const xx = Math.round(TX(x)) + 0.5; ctx.moveTo(xx, py0); ctx.lineTo(xx, py1); });
      ctx.stroke();
      ctx.strokeStyle = C.grid;
      ctx.strokeRect(px0 + 0.5, py0 + 0.5, px1 - px0 - 1, py1 - py0 - 1);
      ctx.restore();
      tv.list.forEach((v) => EA.draw.text(ctx, v === 0 ? '0' : EA.fmt(v, decV) + (Math.abs(v - tv.list[tv.list.length - 1]) < 1e-9 ? ' V' : ''), px0 - 6, TY(v) + 4, { color: C.dim, size: 10.5, align: 'right' }));
      tt.list.forEach((x, i) => {
        const last = i === tt.list.length - 1;
        const xx = TX(x);
        if (last && xx > px1 - 14) {
          EA.draw.text(ctx, EA.fmt(x, decT) + ' ns', px1, py1 + 15, { color: C.dim, size: 10.5, align: 'right' });
        } else {
          EA.draw.text(ctx, EA.fmt(x, decT) + (last ? ' ns' : ''), xx, py1 + 15, { color: C.dim, size: 10.5, align: 'center' });
        }
      });

      // echi: una tacca per ogni andata e ritorno
      ctx.save();
      ctx.strokeStyle = EA.alpha(C.amber, 0.8);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const echoGap = TX(2 * L.td) - TX(0);
      for (let k = 1; k <= 40 && 2 * k * L.td <= span; k++) {
        if (k > 1 && echoGap < 12) break;
        const x = Math.round(TX(2 * k * L.td)) + 0.5;
        ctx.moveTo(x, py0); ctx.lineTo(x, py0 + (k === 1 ? 8 : 5));
      }
      ctx.stroke();
      ctx.restore();

      // livelli di lancio e finale
      const yL = TY(L.vLaunch);
      const yF = TY(L.vFinal);
      const same = Math.abs(yL - yF) < 3;
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = EA.alpha(C.cyan, 0.6);
      ctx.beginPath(); ctx.moveTo(px0, Math.round(yL) + 0.5); ctx.lineTo(px1, Math.round(yL) + 0.5); ctx.stroke();
      if (!same) {
        ctx.strokeStyle = EA.alpha(C.ink, 0.5);
        ctx.beginPath(); ctx.moveTo(px0, Math.round(yF) + 0.5); ctx.lineTo(px1, Math.round(yF) + 0.5); ctx.stroke();
      }
      ctx.restore();

      // traccia: intera e tenue, luminosa fino all'istante corrente
      const pts = [];
      for (let i = 0; i <= TRACE_N; i++) pts.push([px0 + (i / TRACE_N) * (px1 - px0), TY(trace[i])]);
      ctx.save();
      ctx.globalAlpha = 0.28;
      EA.draw.line(ctx, pts, C.ink, 1.4, false);
      ctx.restore();
      const upto = Math.round((tn / span) * TRACE_N);
      if (upto > 0) EA.draw.line(ctx, pts.slice(0, upto + 1), C.ink, 2.2);
      const xc = TX(tn);
      ctx.save();
      ctx.strokeStyle = EA.alpha(C.ink, 0.3);
      ctx.beginPath(); ctx.moveTo(Math.round(xc) + 0.5, py0); ctx.lineTo(Math.round(xc) + 0.5, py1); ctx.stroke();
      ctx.restore();
      EA.draw.dot(ctx, xc, TY(trace[Math.min(TRACE_N, upto)]), 3.2, C.cyan);

      // etichette (sopra il cursore, così il testo resta sempre leggibile): si sistemano una volta per ogni misura e combinazione di parametri,
      // nel primo posto che non copre la traccia, le linee dei livelli o un'altra etichetta
      const key = b.w + 'x' + b.h + ':' + ver;
      if (key !== tdrKey) {
        tdrKey = key;
        const lines = same ? [yL] : [yL, yF];
        const placed = [];
        // costo di una posizione: fuori dal grafico, sopra un'altra etichetta, sulla traccia, su un livello
        const cost = (it, own) => {
          const bx = tagBox(ctx, it);
          let c = 0;
          if (bx.x0 < px0 + 2 || bx.x1 > px1 - 2 || bx.y0 < py0 + 2 || bx.y1 > py1 - 2) c += 100;
          if (placed.some((o) => overlap(o, bx, 4))) c += 50;
          if (hitsLine(pts, bx, 4)) c += 10;
          if (lines.some((ly) => ly !== own && ly >= bx.y0 - 1 && ly <= bx.y1 + 1)) c += 3;
          return c;
        };
        const pick = (cands, own) => {
          let best = cands[0];
          let bestC = Infinity;
          for (const items of cands) {
            const c = items.reduce((a, it) => a + cost(it, own), 0);
            if (c < bestC) { best = items; bestC = c; }
            if (c === 0) break;
          }
          best.forEach((it) => placed.push(tagBox(ctx, it)));
          return best;
        };
        // etichetta di un livello: sopra o sotto la sua linea, partendo da un lato
        const along = (str, yv, color, fromRight) => {
          const out = [];
          const room = px1 - px0 - textWidth(ctx, str, 10.5, 700) - 20;
          for (let d = 0; d <= Math.max(0, room); d += 24) {
            const x = fromRight ? px1 - 6 - d : px0 + 8 + d;
            const align = fromRight ? 'right' : 'left';
            out.push([{ str, x, y: yv - 6, color, align }], [{ str, x, y: yv + 15, color, align }]);
          }
          return out;
        };
        const tags = [];
        if (same) {
          tags.push(...pick(along('lancio = finale ' + EA.fmt(L.vLaunch, 2) + ' V', yL, C.cyan, true), yL));
        } else {
          tags.push(...pick(along('lancio ' + EA.fmt(L.vLaunch, 2) + ' V', yL, C.cyan, false), yL));
          tags.push(...pick(along('finale ' + EA.fmt(L.vFinal, 2) + ' V', yF, C.ink, true), yF));
        }
        // regola pratica: TD contro tr/6, in un angolo libero
        const long = isLong(L.len, L.er, L.tr);
        const rule = 'TD ' + EA.si(L.td * 1e-9, 's') + (long ? ' > ' : ' < ') + 'tr/6 = ' + EA.si((L.tr / 6) * 1e-9, 's');
        const verdict = long ? 'linea lunga: servono terminazioni' : 'collegamento corto: basta un filo';
        const col = long ? C.amber : C.green;
        const corner = (right, y) => {
          const x = right ? px1 - 6 : px0 + 8;
          const align = right ? 'right' : 'left';
          return [{ str: rule, x, y, color: col, align }, { str: verdict, x, y: y + 15, color: col, align }];
        };
        const ys = [py1 - 24, py0 + 20];
        for (let y = py1 - 36; y > py0 + 20; y -= 12) ys.push(y);
        const cands = [];
        [true, false].forEach((right) => ys.forEach((y) => cands.push(corner(right, y))));
        tags.push(...pick(cands, null));
        tdrTags = tags;
      }
      tdrTags.forEach((it) => tag(ctx, it.str, it.x, it.y, { color: it.color, align: it.align }));
    }

    // in basso a destra: diagramma a rimbalzi, spazio in orizzontale e tempo verso il basso
    function drawLattice(ctx, g, tn) {
      const b = g.lat;
      const gTxt = 'Γgen ' + signed(L.gS, 2) + ' · Γcar ' + signed(L.gL, 2);
      let title = 'DIAGRAMMA A RIMBALZI';
      if (textWidth(ctx, title, 10.5, 700) + textWidth(ctx, gTxt, 10.5, 600) + 16 > b.w) title = 'RIMBALZI';
      EA.draw.text(ctx, title, b.x, b.y + 12, { color: C.ink, size: 10.5, weight: 700 });
      EA.draw.text(ctx, gTxt, b.x + b.w, b.y + 12, { color: C.text, size: 10.5, align: 'right' });
      const lx0 = b.x + 44;
      const lx1 = b.x + b.w - 10;
      const ly0 = b.y + 40;
      const ly1 = b.y + b.h - 6;
      const T = (x) => ly0 + (x / span) * (ly1 - ly0);
      EA.draw.text(ctx, 'generatore', lx0, b.y + 30, { color: C.dim, size: 10.5 });
      EA.draw.text(ctx, 'carico', lx1, b.y + 30, { color: C.dim, size: 10.5, align: 'right' });
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx0, ly0); ctx.lineTo(lx0, ly1);
      ctx.moveTo(lx1, ly0); ctx.lineTo(lx1, ly1);
      ctx.stroke();
      ctx.restore();
      const tt = ticks(0, span, 5);
      const decT = Math.max(0, -Math.floor(Math.log10(tt.step) + 1e-9));
      ctx.save();
      ctx.strokeStyle = C.grid2;
      ctx.beginPath();
      tt.list.forEach((x) => { const y = Math.round(T(x)) + 0.5; ctx.moveTo(lx0, y); ctx.lineTo(lx1, y); });
      ctx.stroke();
      ctx.restore();
      tt.list.forEach((x, i) => {
        const y = T(x);
        if (y > ly1 - 2 && i > 0) return;
        EA.draw.text(ctx, EA.fmt(x, decT) + (i === 0 ? '' : ' ns'), lx0 - 7, y + 4, { color: C.dim, size: 10.5, align: 'right' });
      });

      // le onde: segmenti diagonali, più tenui man mano che si smorzano
      const a0 = Math.abs(list.length ? list[0].a : 1) || 1;
      const labels = [];
      list.forEach((w) => {
        if (w.t0 > span) return;
        const xa = w.dir > 0 ? lx0 : lx1;
        const xb = w.dir > 0 ? lx1 : lx0;
        const f = Math.min(1, (span - w.t0) / L.td);
        const xe = xa + (xb - xa) * f;
        const r = Math.abs(w.a) / a0;
        const col = w.dir > 0 ? C.cyan : C.amber;
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.7 * r;
        EA.draw.line(ctx, [[xa, T(w.t0)], [xe, T(w.t0 + L.td * f)]], col, 1.8, r > 0.3);
        ctx.restore();
        // ampiezza scritta sulle prime otto onde, solo sulle prime quattro se il diagramma è fitto
        const segH = T(w.t0 + L.td) - T(w.t0);
        if (w.k < (segH >= 18 ? 8 : 4) && segH >= 11 && f === 1 && Math.abs(w.a) >= 0.01) labels.push({ w, x: (xa + xb) / 2, y: T(w.t0 + L.td / 2), col });
      });
      labels.forEach((lb) => {
        const txt = signed(lb.w.a, 2) + ' V';
        if (lb.w.dir > 0) tag(ctx, txt, lb.x + 10, lb.y - 4, { color: lb.col });
        else tag(ctx, txt, lb.x - 10, lb.y - 4, { color: lb.col, align: 'right' });
      });

      // quando un estremo è adattato il diagramma resta quasi vuoto: lo diciamo
      const yEnd = T(Math.min(span, list.length * L.td));
      let note = '';
      if (6 * L.tr > 8 * L.td) note = 'i rimbalzi durano meno del fronte di salita e si fondono in un\'unica salita';
      else if (list.length <= 2) note = Math.abs(L.gL) < 0.003 ? 'ZL = Z0: il carico assorbe l\'onda, nessuna eco' : 'Rs = Z0: il generatore assorbe l\'eco, nessun altro rimbalzo';
      if (note && ly1 - yEnd > 46) {
        const rows = wrap(ctx, note, lx1 - lx0 - 24, 10.5, 600);
        const y0 = (yEnd + ly1) / 2 - ((rows.length - 1) * 15) / 2;
        rows.forEach((r, i) => tag(ctx, r, (lx0 + lx1) / 2, y0 + i * 15, { color: C.dim, align: 'center', weight: 600 }));
      }

      // l'istante corrente taglia le onde dove stanno i fronti
      const yc = Math.round(T(tn)) + 0.5;
      ctx.save();
      ctx.strokeStyle = EA.alpha(C.ink, 0.45);
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(lx0, yc); ctx.lineTo(lx1, yc); ctx.stroke();
      ctx.restore();
      list.forEach((w) => {
        if (tn < w.t0 || tn > w.t0 + L.td) return;
        const xi = (tn - w.t0) / L.td;
        const x = w.dir > 0 ? lx0 + xi * (lx1 - lx0) : lx1 - xi * (lx1 - lx0);
        EA.draw.dot(ctx, x, yc, 3.2, w.dir > 0 ? C.cyan : C.amber);
      });
    }

    api.loop(draw);
    update();
  }

  /* ---------- contenuti ---------- */

  // Spazio non separabile tra un numero e la sua unità, trattino non separabile in "FR-4":
  // il browser non va a capo tra "0,5" e "V" né dentro il nome del materiale.
  function nbsp(v) {
    if (typeof v === 'string') return v.replace(/(\d) (?=(?:cm|ns|ps|GT\/s|GHz|MHz|nH|pF|V|Ω|m)(?!\w))/g, '$1\u00a0').replace(/FR-4/g, 'FR\u20114');
    if (Array.isArray(v)) return v.map(nbsp);
    if (v && Object.getPrototypeOf(v) === Object.prototype) {
      const o = {};
      Object.keys(v).forEach((k) => { o[k] = nbsp(v[k]); });
      return o;
    }
    return v;
  }

  EA.register(nbsp({
    id: 'linee',
    intro: [
      'Finché i segnali sono lenti, un filo è solo un collegamento: la tensione che metti da una parte compare, praticamente nello stesso istante, dall\'altra. In realtà il segnale viaggia come un\'<strong>onda elettromagnetica</strong> guidata dai conduttori, dentro il materiale isolante che li circonda: in un circuito stampato va a circa metà della velocità della luce, una quindicina di centimetri ogni nanosecondo.',
      'Quando la durata del fronte di un segnale diventa paragonabile al tempo che l\'onda impiega a percorrere il collegamento, il filo diventa una <strong>linea di trasmissione</strong>. All\'inizio il generatore non sa che cosa c\'è in fondo: vede solo l\'<em>impedenza caratteristica</em> <var>Z</var><sub>0</sub> della linea, fissata da geometria e isolante. Se il carico non vale proprio <var>Z</var><sub>0</sub>, una parte dell\'onda rimbalza indietro, come un\'onda lungo una corda che arriva a un muro.',
      'Per questo le piste dei computer hanno larghezze calcolate al centesimo di millimetro, i cavi d\'antenna sono da 50 o 75 Ω e i bus veloci hanno resistenze di <em>terminazione</em>. È la stessa fisica dei cavi telegrafici posati sotto l\'Atlantico nell\'Ottocento, e oggi decide se un collegamento PCI Express da 128 GT/s (128 miliardi di trasferimenti al secondo per corsia) funziona oppure no.',
    ],
    steps: [
      { title: 'Il fronte viaggia', text: 'Quando il generatore scatta, la tensione non compare subito ovunque: un fronte percorre la linea alla velocità v = c/√εr (εr è la costante dielettrica relativa dell\'isolante), circa 14,5 cm/ns nella vetroresina FR-4. All\'inizio il generatore vede solo Z0, quindi con Rs = Z0 lancia metà della sua tensione.', focus: 'viaggio' },
      { title: 'Fine aperta: torna uguale', text: 'In fondo non c\'è niente che assorba l\'onda, che torna indietro con lo stesso segno (Γ = +1). Dove si somma a quella in arrivo la tensione raddoppia: al carico 2 × 0,5 V = 1 V, la tensione piena del generatore.', focus: 'aperto' },
      { title: 'Cortocircuito: torna capovolta', text: 'Un corto impone tensione zero: l\'onda riflessa è capovolta (Γ = −1) e cancella quella in arrivo. Al carico la tensione resta a zero, mentre la corrente raddoppia.', focus: 'corto' },
      { title: 'Carico adattato: nessuna eco', text: 'Se il carico vale proprio Z0, tensione e corrente dell\'onda sono già nel rapporto giusto: tutta l\'energia finisce nel resistore e non torna niente (Γ = 0). Per il generatore è come una linea infinita.', focus: 'adattato' },
      { title: 'Carico disadattato: torna una frazione', text: 'Torna la frazione Γ = (ZL − Z0)/(ZL + Z0). Con 150 Ω su una linea da 50 Ω torna metà della tensione, e al carico si arriva a 1,5 × 0,5 V = 0,75 V.', focus: 'disadattato' },
      { title: 'Il riflettometro legge l\'eco', text: 'Un riflettometro (TDR, dall\'inglese Time Domain Reflectometer) lancia un gradino e guarda solo l\'ingresso. Il ritardo dell\'eco dice dove sta la discontinuità (d = v·t/2, perché il tempo è di andata e ritorno), l\'altezza dice Γ e quindi l\'impedenza.', focus: 'tdr' },
    ],
    formulas: [
      { label: 'Impedenza caratteristica', eq: '<var>Z</var><sub>0</sub> = √(<var>L</var> ⁄ <var>C</var>)', text: 'Rapporto tra tensione e corrente di un\'onda che viaggia in un solo verso. <var>L</var> e <var>C</var> sono induttanza e capacità per unità di lunghezza, fissate da geometria e isolante: <var>Z</var><sub>0</sub> non dipende da quanto è lunga la linea. Una pista interna da 50 Ω in FR-4 ha circa 3,5 nH e 1,4 pF per centimetro. Non è una resistenza che scalda: una linea ideale non dissipa energia, la trasporta.' },
      { label: 'Velocità e ritardo', eq: '<var>v</var> = <var>c</var> ⁄ √<var>ε</var><sub>r</sub>', text: 'L\'onda viaggia nell\'isolante, più lenta quanto più è alta la sua costante dielettrica relativa <var>ε</var><sub>r</sub>: circa 30 cm/ns in aria, 20 nel PTFE, 14,5 nell\'FR-4 (<var>ε</var><sub>r</sub> ≈ 4,3). Una linea lunga ℓ ritarda di <var>T</var><sub>D</sub> = ℓ/<var>v</var>. In una microstrip parte del campo è in aria e si usa una <var>ε</var><sub>r</sub> efficace, circa 3–3,3.' },
      { label: 'Coefficiente di riflessione', eq: 'Γ = (<var>Z</var><sub>L</sub> − <var>Z</var><sub>0</sub>) ⁄ (<var>Z</var><sub>L</sub> + <var>Z</var><sub>0</sub>)', text: 'Va da −1 (corto) a +1 (aperto) e vale 0 se <var>Z</var><sub>L</sub> = <var>Z</var><sub>0</sub>. Torna una frazione Γ della tensione, ma solo Γ<sup>2</sup> della potenza. Il generatore lancia <var>V</var><sub>s</sub>·<var>Z</var><sub>0</sub>/(<var>R</var><sub>s</sub> + <var>Z</var><sub>0</sub>); dopo tutti i rimbalzi si arriva al partitore <var>V</var><sub>s</sub>·<var>Z</var><sub>L</sub>/(<var>R</var><sub>s</sub> + <var>Z</var><sub>L</sub>).' },
      { label: 'Riflettometro', eq: '<var>d</var> = <var>v</var> · <var>t</var> ⁄ 2', text: 'Il tempo dell\'eco comprende andata e ritorno, quindi la discontinuità si trova a metà della distanza percorsa dall\'onda. L\'altezza dell\'eco dà Γ e da Γ si risale al carico: <var>Z</var><sub>L</sub> = <var>Z</var><sub>0</sub>·(1 + Γ)/(1 − Γ). Se all\'ingresso la tensione scende da 0,5 a 0,33 V, Γ = −1/3 e su una linea da 50 Ω il carico vale 25 Ω.' },
      { label: 'Linea lunga o collegamento corto', eq: '<var>T</var><sub>D</sub> &gt; <var>t</var><sub>r</sub> ⁄ 6', text: 'Regola pratica: se il ritardo di sola andata supera circa un sesto del tempo di salita, le riflessioni deformano il fronte e servono terminazioni. Conta il fronte, non la frequenza del clock: in FR-4, con fronti da 1 ns, la soglia è circa 2,4 cm. Alcuni testi usano <var>t</var><sub>r</sub>/4 o <var>t</var><sub>r</sub>/2, e la regola vale se il generatore non ha una resistenza molto più bassa di <var>Z</var><sub>0</sub>.' },
    ],
    timeline: [
      { year: 1855, title: 'La legge dei quadrati', who: 'William Thomson, poi Lord Kelvin, Università di Glasgow', text: 'Nelle lettere a George Stokes della fine del 1854, pubblicate nel 1855, Thomson tratta il cavo sottomarino come una catena continua di resistenze e capacità. Ne ricava che il ritardo cresce con il quadrato della lunghezza: un cavo lungo il doppio è quattro volte più lento. È un modello di pura diffusione, ancora senza onde.' },
      { year: 1858, title: 'Il primo cavo transatlantico', who: 'Atlantic Telegraph Company, elettricista Wildman Whitehouse', text: 'Completato il 5 agosto tra l\'Irlanda e Terranova, il 16 agosto trasmette il saluto della regina Vittoria al presidente Buchanan: 98 parole in circa 16 ore. Già difettoso, si guasta dopo circa tre settimane, anche per le tensioni molto alte applicate da Whitehouse (secondo alcune stime fino a circa 2000 V). Un cavo davvero affidabile arriva solo nel 1866, posato dalla nave <em>Great Eastern</em>: circa 6–8 parole al minuto.' },
      { year: 1876, title: 'Heaviside: il filo diventa un\'onda', who: 'Oliver Heaviside, Londra', text: 'Nell\'articolo <em>On the Extra Current</em> aggiunge al modello di Thomson l\'autoinduttanza: le equazioni non descrivono più una diffusione lenta, ma onde che viaggiano lungo la linea. Negli anni Ottanta le completa nelle <em>equazioni dei telegrafisti</em>, da cui discendono <var>Z</var><sub>0</sub> = √(<var>L</var>/<var>C</var>) e <var>v</var> = 1/√(<var>LC</var>).' },
      { year: 1887, title: 'Linee senza distorsione', who: 'Oliver Heaviside; poi George A. Campbell e Michael Pupin', text: 'Heaviside dimostra che una linea con <var>R</var>/<var>L</var> = <var>G</var>/<var>C</var> non deforma i segnali e propone di aumentarne l\'induttanza con delle bobine. Non brevetta l\'idea: nel 1899–1900 la realizzano Campbell, alla AT&amp;T, e Pupin, alla Columbia University, che vince la disputa sul brevetto.' },
      { year: 1929, title: 'Il cavo coassiale a banda larga', who: 'Lloyd Espenschied e Herman A. Affel, AT&T', text: 'Depositano il brevetto, concesso nel 1931, di un sistema a conduttori concentrici capace di portare molti canali telefonici o un segnale televisivo. La struttura coassiale in sé l\'aveva già brevettata Heaviside nel 1880. Nel 1936 la prima linea sperimentale, tra New York e Filadelfia, porta 240 conversazioni oppure un canale TV.' },
      { year: 1939, title: 'La carta di Smith', who: 'Phillip H. Smith, Bell Telephone Laboratories', text: 'Sulla rivista <em>Electronics</em> pubblica un diagramma circolare che trasforma le impedenze in coefficienti di riflessione e permette di progettare gli adattamenti con riga e compasso. Un diagramma equivalente era uscito in Giappone nel 1937, opera di Tōsaku Mizuhashi.' },
      { year: 1952, title: 'Nasce la microstrip', who: 'D. D. Grieg e H. F. Engelmann, Federal Telecommunication Laboratories (ITT)', text: 'Propongono una striscia conduttrice su un isolante sopra un piano di massa, fabbricabile con le tecniche dei circuiti stampati. Negli stessi anni Robert M. Barrett introduce la <em>stripline</em>, una striscia racchiusa tra due piani di massa.' },
      { year: 1964, title: 'Il riflettometro da banco', who: 'Hewlett-Packard', text: 'Il cassetto HP 1415A per oscilloscopio, descritto sull\'<em>HP Journal</em> nel febbraio 1964 (alcune fonti ne datano la presentazione al 1963), è tra i primi riflettometri commerciali: un generatore di gradini veloci e un campionatore, con un tempo di salita di circa 150 ps e una risoluzione di circa 2,5 cm.' },
      { year: 2025, title: 'PCIe 7.0 su piste di rame', who: 'PCI-SIG', text: 'L\'11 giugno 2025 esce la specifica PCI Express 7.0: 128 GT/s per corsia, con una frequenza fondamentale del segnale di circa 32 GHz. A queste velocità ogni pista, ogni foro di collegamento tra gli strati e ogni connettore si progetta come una linea di trasmissione a impedenza controllata.' },
    ],
    fun: 'Il saluto di 98 parole della regina Vittoria, nell\'agosto 1858, richiese circa 16 ore di trasmissione: una decina di minuti a parola, perché il cavo si comportava come un enorme circuito RC e ogni impulso arrivava lento e sbavato. Il cavo avanzato lo comprò Tiffany &amp; Co., che lo rivendette a pezzetti come souvenir. E la parola <em>impedenza</em> l\'ha inventata Oliver Heaviside, nel 1886.',
    uses: [
      'Piste a impedenza controllata di PCIe e memorie',
      'Prove al TDR dei circuiti stampati in produzione',
      'Cavi coassiali: 75 Ω per la TV, 50 Ω per radio e strumenti',
      'Oscilloscopi con ingresso a 50 Ω',
      'Ricerca dei guasti nei cavi Ethernet e telefonici',
      'Sonde TDR per l\'umidità del terreno',
      'Resistenze in serie sulle uscite veloci dei microcontrollori',
    ],
    glossary: [
      { term: 'Impedenza caratteristica', def: 'Rapporto tra tensione e corrente di un\'onda che viaggia in un solo verso, <var>Z</var><sub>0</sub> = √(<var>L</var>/<var>C</var>). Valori tipici: 50 Ω per radio, strumenti e piste singole, 75 Ω per TV e video, 85–100 Ω per le coppie differenziali.' },
      { term: 'Coefficiente di riflessione', def: 'Frazione Γ della tensione incidente che torna indietro in una discontinuità: +1 per un circuito aperto, −1 per un corto, 0 per un carico adattato.' },
      { term: 'Terminazione', def: 'Resistenza che rende un estremo della linea uguale a <var>Z</var><sub>0</sub>, così l\'onda viene assorbita. In parallelo al carico (pari a <var>Z</var><sub>0</sub>) assorbe subito l\'onda ma consuma corrente; in serie al generatore (che, sommata alla sua resistenza interna, dà <var>Z</var><sub>0</sub>) assorbe l\'eco quando torna indietro.' },
      { term: 'Riflettometro (TDR)', def: 'Strumento che lancia nella linea un gradino molto ripido e registra gli echi all\'ingresso: il ritardo dà la posizione della discontinuità (<var>d</var> = <var>v</var>·<var>t</var>/2), l\'ampiezza dà Γ e quindi l\'impedenza. La sigla viene dall\'inglese <em>Time Domain Reflectometry</em>, riflettometria nel dominio del tempo.' },
      { term: 'Diagramma a rimbalzi', def: 'Grafico spazio-tempo a zig-zag che segue le onde avanti e indietro tra generatore e carico. A ogni estremo l\'onda viene moltiplicata per il Γ di quell\'estremo.' },
      { term: 'Tempo di salita', def: 'Tempo che il fronte impiega a passare dal 10 al 90% del valore finale. Confrontato con il ritardo della linea dice se un collegamento va trattato come linea di trasmissione.' },
      { term: 'Costante dielettrica relativa', def: 'Il numero <var>ε</var><sub>r</sub> che dice quanto un isolante, rispetto al vuoto, aumenta la capacità tra due conduttori e rallenta le onde: 1 per l\'aria, circa 2,1 per il PTFE (il teflon), circa 4,3 per l\'FR-4 dei circuiti stampati. L\'onda viaggia a <var>c</var>/√<var>ε</var><sub>r</sub>.' },
      { term: 'Microstrip e stripline', def: 'Linee dei circuiti stampati. La microstrip è una pista esterna sopra un piano di massa, con parte del campo in aria; la stripline è una pista interna tra due piani di massa, tutta nell\'isolante.' },
    ],
    sources: [
      { title: 'W. Thomson, On the Theory of the Electric Telegraph, 1855 (Atlantic-Cable.com)', url: 'https://atlantic-cable.com/Books/Thomson/index.htm' },
      { title: 'IEEE Spectrum: The First Transatlantic Telegraph Cable Was a Bold, Beautiful Failure', url: 'https://spectrum.ieee.org/tech-history/heroic-failures/the-first-transatlantic-telegraph-cable-was-a-bold-beautiful-failure' },
      { title: 'ETHW, Milestone: Landing of the Transatlantic Cable, 1866', url: 'https://ethw.org/Milestones:Landing_of_the_Transatlantic_Cable,_1866' },
      { title: 'Telegrapher\'s equations (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Telegrapher%27s_equations' },
      { title: 'P. H. Smith, Transmission Line Calculator, Electronics, 1939 (RF Cafe)', url: 'https://www.rfcafe.com/references/electronics-mag/transmission-line-calculator-phillip-h-smith-electronics-magazine-january-1939.htm' },
      { title: 'Howard Johnson: Short Transmission Line Model', url: 'https://www.sigcon.com/Pubs/news/3_18.htm' },
      { title: 'Analog Devices, MT-094: Microstrip and Stripline Design', url: 'https://www.analog.com/media/en/training-seminars/tutorials/MT-094.pdf' },
      { title: 'HPCwire: PCI-SIG pubblica la specifica PCIe 7.0 (2025)', url: 'https://www.hpcwire.com/aiwire/2025/06/11/pci-sig-releases-pcie-7-0-specification-to-support-bandwidth-demands-of-ai-at-128-0-gt-s/' },
    ],
    // Domande provvisorie: verranno spostate in quiz.js.
    quiz: [
      { id: 'ea-linee-01', chapter: 'linee', level: 1, topic: 'Coefficiente di riflessione', q: 'Una linea da 50 Ω è chiusa su un carico da 150 Ω. Quale parte della tensione dell\'onda incidente torna indietro?', options: ['La metà, con lo stesso segno (Γ = +0,5)', 'Un terzo, capovolta (Γ = −0,33)', 'Niente, perché il carico è una resistenza', 'Tutta, perché il carico supera Z0'], answer: 0, why: 'Γ = (150 − 50)/(150 + 50) = +0,5: torna metà della tensione con lo stesso segno, e al carico si misura 1,5 volte l\'onda incidente. In potenza torna solo Γ² = 25%.' },
      { id: 'ea-linee-02', chapter: 'linee', level: 2, topic: 'Traccia TDR', q: 'Un riflettometro con Rs = 50 Ω lancia un gradino in un cavo da 50 Ω: all\'ingresso si leggono 0,5 V, che dopo 10 ns salgono a 1 V. Nel cavo l\'onda viaggia a 20 cm/ns. Che cosa c\'è in fondo, e a che distanza?', options: ['Un circuito aperto, a circa 1 m', 'Un cortocircuito, a circa 1 m', 'Un carico adattato, a circa 2 m', 'Un circuito aperto, a circa 2 m'], answer: 0, why: 'La tensione raddoppia, quindi Γ = +1: il cavo è aperto. Il tempo misurato è di andata e ritorno, quindi d = v·t/2 = 20 cm/ns × 10 ns / 2 = 100 cm.' },
      { id: 'ea-linee-03', chapter: 'linee', level: 2, topic: 'Regola tr/6', q: 'Una pista su FR-4 ha un ritardo di sola andata di 1 ns. Il clock è di 10 MHz, ma i fronti salgono in 0,5 ns. Va trattata come linea di trasmissione?', options: ['Sì: il ritardo supera di molto tr/6 ≈ 0,08 ns', 'No: a 10 MHz il periodo è di 100 ns', 'No: conta la lunghezza, non i fronti', 'Sì, ma solo se il carico è un cortocircuito'], answer: 0, why: 'Conta il tempo di salita, non la frequenza del clock: 1 ns è più di dieci volte tr/6 ≈ 0,083 ns. Le riflessioni deformano i fronti e serve una terminazione.' },
      { id: 'ea-linee-04', chapter: 'linee', level: 3, topic: 'Terminazione serie', q: 'Un driver con resistenza d\'uscita di 10 Ω pilota una pista da 50 Ω aperta in fondo, e sui fronti compaiono oscillazioni (ringing). Quale resistenza in serie all\'uscita le elimina?', options: ['40 Ω, così la sorgente vale in tutto 50 Ω', '50 Ω, uguale all\'impedenza della linea', '10 Ω, uguale alla resistenza del driver', 'Nessuna: una resistenza in serie non cambia le riflessioni'], answer: 0, why: 'Con 10 + 40 = 50 Ω la sorgente è adattata: lancia metà della tensione, l\'onda raddoppia al carico aperto arrivando alla tensione piena e l\'eco viene assorbita quando torna al generatore.' },
    ],
    hero: {
      caption: 'In ciano l\'onda che va verso il carico, in ambra quella che torna, in chiaro la tensione totale. Il tempo è rallentato di oltre un miliardo di volte.',
      label: 'Animazione: un gradino di tensione che viaggia lungo una linea di trasmissione e si riflette sul carico',
      aspect: '16 / 7',
      aspectMobile: '1 / 1',
      mount: mountHero,
    },
    lab: {
      title: 'Riflettometro e diagramma a rimbalzi',
      intro: 'Cambia carico, linea e generatore e guarda l\'onda correre e rimbalzare. Sotto c\'è la traccia di un riflettometro collegato all\'ingresso e, sugli schermi larghi, il diagramma a rimbalzi. Prova un fronte lento su una linea corta: gli echi si fondono e il filo torna un semplice collegamento. La <em>lunghezza critica</em> è il tratto che l\'onda percorre in un sesto del tempo di salita: oltre quella, servono le terminazioni.',
      layout: 'stack',
      mount: mountLab,
    },
    model,
  }));
})(typeof window !== 'undefined' ? window : globalThis);
