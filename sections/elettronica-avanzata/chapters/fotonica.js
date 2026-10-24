/*
 * Capitolo 9 · Luce che trasporta dati (fotonica e fibra ottica).
 * Animazione: il laser e l'emissione stimolata, la riflessione totale nella fibra,
 * il vetro ultrapuro, tanti canali WDM nella stessa fibra, l'amplificatore all'erbio
 * e la traversata dell'Atlantico in un cavo sottomarino.
 * Laboratorio: raggio nella fibra con la legge di Snell e il cono di accettazione,
 * spettro dei canali e bilancio di potenza in dBm lungo il collegamento.
 */
(function (root) {
  'use strict';

  const EA = root.EA;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  /* ---------- modello ---------- */

  const C0 = 299792458;   // velocità della luce nel vuoto, m/s (esatta)
  const HC = 1239.84198;  // h·c in eV·nm
  const NG = 1.468;       // indice di gruppo di una fibra monomodale a 1550 nm

  // Legge di Snell: angolo rifratto (dalla normale) o NaN se c'è riflessione totale.
  function snell(n1, theta1, n2) {
    const s = (n1 * Math.sin(theta1)) / n2;
    return Math.abs(s) > 1 ? NaN : Math.asin(s);
  }

  // Angolo critico, dalla normale: esiste solo se il nucleo ha indice maggiore del mantello.
  function criticalAngle(n1, n2) {
    return n1 > n2 ? Math.asin(n2 / n1) : NaN;
  }

  function numericalAperture(n1, n2) {
    return n1 > n2 ? Math.sqrt(n1 * n1 - n2 * n2) : 0;
  }

  // Semiangolo del cono di accettazione, dall'asse, per luce che arriva da un mezzo
  // di indice n0 (aria: 1). Con NA ≥ n0 entra qualunque raggio.
  function acceptanceAngle(n1, n2, n0) {
    return Math.asin(Math.min(1, numericalAperture(n1, n2) / (n0 || 1)));
  }

  // Frazione di potenza riflessa (Fresnel, luce non polarizzata); 1 oltre l'angolo critico.
  function reflectance(n1, n2, theta) {
    const s = (n1 * Math.sin(theta)) / n2;
    if (s >= 1) return 1;
    const ci = Math.cos(theta);
    const ct = Math.sqrt(1 - s * s);
    const rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct);
    const rp = (n1 * ct - n2 * ci) / (n1 * ct + n2 * ci);
    return (rs * rs + rp * rp) / 2;
  }

  // Raggio lanciato dall'aria con angolo theta dall'asse: angolo nel nucleo (dall'asse),
  // incidenza sul mantello (dalla normale), se resta guidato, angolo rifratto e riflettanza.
  function launch(n1, n2, theta) {
    const inside = Math.asin(Math.min(1, Math.sin(theta) / n1));
    const incidence = Math.PI / 2 - inside;
    const critical = criticalAngle(n1, n2);
    const guided = n1 > n2 && incidence > critical;
    return { inside, incidence, critical, guided, refracted: snell(n1, incidence, n2), R: reflectance(n1, n2, incidence) };
  }

  // Percorso del raggio in un nucleo di semilarghezza 1 e lunghezza len, partendo
  // all'altezza y0 e salendo. power[i] è la potenza del tratto tra pts[i] e pts[i + 1];
  // escapes sono i punti in cui una parte della luce esce nel mantello.
  function trace(n1, n2, theta, len, y0) {
    const L = launch(n1, n2, theta);
    const start = y0 || 0;
    const pts = [[0, start]];
    const power = [];
    const escapes = [];
    if (L.inside < 1e-9) {
      pts.push([len, start]);
      power.push(1);
      return { pts, power, escapes, launch: L };
    }
    const slope = Math.tan(L.inside);
    let x = 0;
    let y = start;
    let dir = 1;
    let p = 1;
    while (power.length < 400) {
      const xn = x + (dir > 0 ? 1 - y : y + 1) / slope;
      if (xn >= len) {
        pts.push([len, y + dir * (len - x) * slope]);
        power.push(p);
        break;
      }
      pts.push([xn, dir]);
      power.push(p);
      if (!L.guided) {
        escapes.push({ x: xn, y: dir, power: p * (1 - L.R), angle: L.refracted });
        p *= L.R;
      }
      x = xn;
      y = dir;
      dir = -dir;
    }
    return { pts, power, escapes, launch: L };
  }

  // Finestre di trasmissione della fibra di vetro: attenuazione tipica in dB/km.
  const WINDOWS = {
    850: { nm: 850, alpha: 3, fiber: 'multimodale', edfa: false, maxCh: 1, modalKm: 0.3 },
    1310: { nm: 1310, alpha: 0.35, fiber: 'monomodale', edfa: false, maxCh: 5 },
    1550: { nm: 1550, alpha: 0.2, fiber: 'monomodale', edfa: true, maxCh: 40 },
  };

  // Collegamento di riferimento: 0 dBm per canale, fotodiodo a valanga a 10 Gbit/s
  // (soglia −28 dBm), due connettori da 0,5 dB, 3 dB di margine, EDFA ogni 80 km.
  const LINK = { p0: 0, sens: -28, margin: 3, connector: 0.5, connectors: 2, span: 80, rate: 10e9 };

  const linkOf = (o) => Object.assign({}, LINK, o || {});

  // Distanza massima senza amplificatori, in km.
  function reachKm(win, o) {
    const k = linkOf(o);
    return (k.p0 - k.connector * k.connectors - (k.sens + k.margin)) / WINDOWS[win].alpha;
  }

  // Posizioni degli EDFA (km): solo a 1550 nm, la banda dell'erbio, e solo se senza
  // amplificatori la luce non arriva sopra soglia con il margine.
  function amplifiers(win, L, o) {
    const k = linkOf(o);
    if (!WINDOWS[win].edfa || L <= reachKm(win, k)) return [];
    const out = [];
    for (let x = k.span; x < L - 1e-9; x += k.span) out.push(x);
    return out;
  }

  // Bilancio: P = P0 − connettori − α·L + guadagni. Ogni EDFA recupera una campata.
  function budget(win, L, o) {
    const k = linkOf(o);
    const a = WINDOWS[win].alpha;
    const amps = amplifiers(win, L, k);
    const gain = a * k.span;
    const rx = k.p0 - k.connector * k.connectors - a * L + amps.length * gain;
    const status = rx >= k.sens + k.margin ? 'ok' : rx >= k.sens ? 'margine' : 'sotto';
    return { rx, amps, gain, alpha: a, status, link: k };
  }

  // Potenza lungo il collegamento: punti [km, dBm] con i salti di connettori ed EDFA.
  function budgetProfile(win, L, o) {
    const b = budget(win, L, o);
    const k = b.link;
    let p = k.p0 - (k.connectors > 0 ? k.connector : 0);
    const pts = [[0, k.p0], [0, p]];
    let x = 0;
    b.amps.forEach((xa) => {
      p -= b.alpha * (xa - x);
      pts.push([xa, p]);
      p += b.gain;
      pts.push([xa, p]);
      x = xa;
    });
    p -= b.alpha * (L - x);
    pts.push([L, p]);
    pts.push([L, p - k.connector * Math.max(0, k.connectors - 1)]);
    return pts;
  }

  const dbmToMw = (p) => Math.pow(10, p / 10);
  const mwToDbm = (mw) => 10 * Math.log10(mw);

  // Frazione di potenza rimasta dopo km chilometri e, al contrario, distanza per una frazione.
  const fractionLeft = (alpha, km) => Math.pow(10, (-alpha * km) / 10);
  const distanceForFraction = (alpha, frac) => (-10 * Math.log10(frac)) / alpha;

  // c = λ·f ed E = h·c/λ (λ in nm, f in Hz, E in eV).
  const frequency = (nm) => C0 / (nm * 1e-9);
  const wavelength = (hz) => (C0 / hz) * 1e9;
  const photonEnergy = (nm) => HC / nm;

  // Fotodiodo: responsività R = η·λ/1,24 (A/W, λ in µm) e corrente I = R·P.
  const responsivity = (nm, eta) => ((eta == null ? 1 : eta) * nm) / HC;
  const photocurrent = (dbm, R) => R * dbmToMw(dbm) * 1e-3;

  // Ritardo di propagazione nella fibra: L·ng/c, in secondi.
  const latency = (km, ng) => (km * 1000 * (ng || NG)) / C0;

  // Dal vetro da finestra alla fibra di oggi (dB/km; il primo valore è una stima).
  const GLASSES = [
    { key: 'finestra', name: 'Vetro da finestra', note: '≈ 20 000 dB/km (stima)', alpha: 20000 },
    { key: '1965', name: 'Vetro ottico del 1965', note: '≈ 1000 dB/km', alpha: 1000 },
    { key: '1970', name: 'Corning, 1970', note: '≈ 17 dB/km a 633 nm', alpha: 17 },
    { key: 'oggi', name: 'Fibra di oggi', note: '≈ 0,2 dB/km a 1550 nm', alpha: 0.2 },
  ];

  // Piano dei canali. A 1550 nm: DWDM a 100 GHz sulla griglia ITU ancorata a 193,1 THz,
  // dentro la banda C (40 posti), scegliendo i più vicini all'ancora. A 1310 nm: CWDM
  // ogni 20 nm nella banda O (5 posti). A 850 nm: un solo canale.
  function channelPlan(win, n) {
    const out = [];
    if (+win === 1550) {
      const slots = [];
      for (let m = -15; m <= 24; m++) slots.push(m);
      slots.sort((a, b) => Math.abs(a) - Math.abs(b) || b - a);
      slots.slice(0, EA.clamp(Math.round(n), 1, 40)).sort((a, b) => a - b).forEach((m) => {
        const f = 193.1e12 + m * 100e9;
        out.push({ f, nm: wavelength(f) });
      });
    } else if (+win === 1310) {
      [1311, 1291, 1331, 1271, 1351].slice(0, EA.clamp(Math.round(n), 1, 5)).sort((a, b) => a - b)
        .forEach((nm) => out.push({ nm, f: frequency(nm) }));
    } else {
      out.push({ nm: 850, f: frequency(850) });
    }
    return out;
  }

  // Capacità totale: numero di canali per velocità di ciascuno.
  const capacity = (n, rate) => n * (rate || LINK.rate);

  const model = {
    C0, NG, WINDOWS, LINK, GLASSES,
    snell, criticalAngle, numericalAperture, acceptanceAngle, reflectance, launch, trace,
    reachKm, amplifiers, budget, budgetProfile,
    dbmToMw, mwToDbm, fractionLeft, distanceForFraction,
    frequency, wavelength, photonEnergy, responsivity, photocurrent, latency,
    channelPlan, capacity,
  };

  /* ---------- aiuti di disegno ---------- */

  const TINT = '#dfe7ff';   // luce guidata
  const PUMP = '#ff7aa8';   // luce di pompa (falso colore)
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const SPECTRUM = ['#ff6b6b', '#ff9f43', '#ffc04d', '#9be15d', '#3ee08f', '#5cc8ff', '#7aa2ff', '#b49cff'];

  function mixHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ch = (s) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * t);
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }

  // Falsi colori dei canali: dal rosso (frequenza più bassa) al viola (più alta).
  function falseColor(u) {
    const x = EA.clamp(u, 0, 1) * (SPECTRUM.length - 1);
    const i = Math.min(SPECTRUM.length - 2, Math.floor(x));
    return mixHex(SPECTRUM[i], SPECTRUM[i + 1], x - i);
  }

  // Numero pseudocasuale ripetibile in [0, 1) da due interi (bit dei canali, posizioni).
  function hash01(a, b) {
    let x = Math.imul(a + 0x9e37, 0x85ebca6b) ^ Math.imul(b + 0x632b, 0xc2b2ae35);
    x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d);
    x ^= x >>> 12; x = Math.imul(x, 0x297a2d39);
    x ^= x >>> 15;
    return (x >>> 0) / 4294967296;
  }

  function box(ctx, x, y, w, hh, r, fill, stroke) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, hh, r); else ctx.rect(x, y, w, hh);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }

  function textWidth(ctx, str, size, weight) {
    ctx.save();
    ctx.font = (weight || 600) + ' ' + (size || 11) + 'px ' + MONO;
    const w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  }

  // Etichetta con un fondo scuro: resta leggibile anche sopra le tracce.
  function tag(ctx, str, x, y, o) {
    const opt = Object.assign({ size: 11 }, o);
    const w = textWidth(ctx, str, opt.size, opt.weight);
    const x0 = opt.align === 'right' ? x - w : opt.align === 'center' ? x - w / 2 : x;
    ctx.save();
    ctx.fillStyle = EA.alpha('#060b0a', 0.8);
    ctx.fillRect(x0 - 4, y - opt.size, w + 8, opt.size + 5);
    ctx.restore();
    EA.draw.text(ctx, str, x, y, opt);
  }

  // Fibra vista in sezione longitudinale: mantello sopra e sotto, nucleo al centro.
  function fiberBand(ctx, x0, x1, cy, a, cl, o) {
    const opt = o || {};
    const C = EA.colors;
    ctx.save();
    ctx.fillStyle = EA.alpha(C.blue, 0.1);
    ctx.fillRect(x0, cy - a - cl, x1 - x0, cl);
    ctx.fillRect(x0, cy + a, x1 - x0, cl);
    ctx.fillStyle = EA.alpha(TINT, 0.07);
    ctx.fillRect(x0, cy - a, x1 - x0, 2 * a);
    ctx.lineWidth = 1;
    ctx.strokeStyle = EA.alpha(TINT, 0.34);
    ctx.beginPath();
    ctx.moveTo(x0, cy - a + 0.5); ctx.lineTo(x1, cy - a + 0.5);
    ctx.moveTo(x0, cy + a - 0.5); ctx.lineTo(x1, cy + a - 0.5);
    ctx.stroke();
    ctx.strokeStyle = EA.alpha(C.blue, 0.4);
    ctx.beginPath();
    ctx.moveTo(x0, cy - a - cl + 0.5); ctx.lineTo(x1, cy - a - cl + 0.5);
    ctx.moveTo(x0, cy + a + cl - 0.5); ctx.lineTo(x1, cy + a + cl - 0.5);
    if (opt.face) { ctx.moveTo(x0 + 0.5, cy - a - cl); ctx.lineTo(x0 + 0.5, cy + a + cl); }
    ctx.stroke();
    ctx.restore();
  }

  // Lunghezze cumulate di una spezzata e punto a distanza d lungo di essa.
  function polyLengths(pts) {
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return L;
  }

  function pointAt(pts, L, d) {
    if (d <= 0) return [pts[0][0], pts[0][1], 0];
    for (let i = 1; i < pts.length; i++) {
      if (d <= L[i]) {
        const u = (d - L[i - 1]) / (L[i] - L[i - 1] || 1);
        return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u, i - 1];
      }
    }
    const n = pts.length - 1;
    return [pts[n][0], pts[n][1], n - 1];
  }

  // Tratto di spezzata tra le distanze d0 e d1.
  function subPath(pts, L, d0, d1) {
    const out = [pointAt(pts, L, d0)];
    for (let i = 1; i < pts.length - 1; i++) if (L[i] > d0 && L[i] < d1) out.push(pts[i]);
    out.push(pointAt(pts, L, d1));
    return out;
  }

  // Lunghezza in m o km, all'italiana.
  function fmtLen(km) {
    if (km < 1) return EA.fmt(km * 1000, 0) + ' m';
    return EA.fmt(km, km < 10 ? 1 : 0) + ' km';
  }

  /* ---------- animazione principale: dal laser all'oceano ---------- */

  function ring(ctx, x, y, r, color, al) {
    if (al <= 0) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, al);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // Pacchetto d'onda: sinusoide con inviluppo gaussiano. Pacchetti impilati con lo
  // stesso xc hanno le creste allineate, cioè la stessa fase.
  function packet(ctx, xc, y, len, lam, amp, color) {
    const pts = [];
    for (let x = xc - len / 2; x <= xc + len / 2; x += 1.5) {
      const u = (x - xc) / (len / 2);
      pts.push([x, y - amp * Math.exp(-u * u * 2.2) * Math.sin((TAU * (x - xc)) / lam)]);
    }
    EA.draw.line(ctx, pts, color, 1.5);
  }

  function mountHero(view, api) {
    const C = EA.colors;
    const cv = api.canvas(view, { label: 'Animazione in sei fasi. Nel laser un fotone ne genera altri identici; nella fibra la luce resta nel nucleo per riflessione totale; quattro vetri mostrano fin dove arriva la luce; otto canali di colori diversi viaggiano nella stessa fibra e un prisma li separa; un amplificatore all\'erbio ricarica la luce; un impulso attraversa l\'Atlantico in un cavo sottomarino.' });
    const STAGES = [
      { key: 'laser', dur: 9, title: 'IL LASER', sub: ['emissione stimolata: un fotone ne genera un altro identico'], subM: ['emissione stimolata: un fotone', 'ne genera un altro identico'], say: 'il laser, dove un fotone ne genera altri identici' },
      { key: 'tir', dur: 9, title: 'RIFLESSIONE TOTALE INTERNA', sub: ['fibra plastica: nucleo n₁ = 1,49, mantello n₂ = 1,40, angolo critico θc = 70°'], subM: ['nucleo n₁ = 1,49 · mantello n₂ = 1,40', 'angolo critico θc = 70°'], say: 'la riflessione totale tiene la luce nel nucleo' },
      { key: 'vetro', dur: 9, title: 'VETRO ULTRAPURO', sub: ['quanta strada fa la luce prima di ridursi all\'1%'], subM: ['quanta strada fa la luce', 'prima di ridursi all\'1%'], say: 'vetro ultrapuro: fin dove arriva la luce in quattro vetri diversi' },
      { key: 'wdm', dur: 9, title: 'WDM: TANTI COLORI IN UNA FIBRA', sub: ['colori finti: i canali veri sono tutti infrarossi, tra 1530 e 1565 nm'], subM: ['colori finti: i canali sono infrarossi,', 'tra 1530 e 1565 nm, ogni 100 GHz'], say: 'otto canali di colori diversi viaggiano nella stessa fibra' },
      { key: 'edfa', dur: 9, title: 'EDFA: L\'AMPLIFICATORE ALL\'ERBIO', sub: ['ricarica la luce senza trasformarla in elettricità'], subM: ['ricarica la luce senza', 'trasformarla in elettricità'], say: 'l\'amplificatore all\'erbio restituisce 16 decibel a tutti i canali' },
      { key: 'oceani', dur: 10, title: 'ATTRAVERSO GLI OCEANI', sub: ['un cavo sottomarino: circa 6000 km di Atlantico in circa 30 ms'], subM: ['circa 6000 km di Atlantico', 'in circa 30 millesimi di secondo'], say: 'un impulso attraversa l\'Atlantico in circa 30 millisecondi' },
    ];
    const FADE = 0.7;
    let stage = 0;
    let stageT = 0;
    let prev = -1;
    let fadeT = 1;
    let loop = null;

    function geometry() {
      const narrow = cv.w < 560;
      return { w: cv.w, hh: cv.h, narrow, top: narrow ? 22 : 30, pad: narrow ? 12 : 18 };
    }

    function heading(ctx, g) {
      const st = STAGES[stage];
      EA.draw.text(ctx, (stage + 1) + ' · ' + st.title, g.pad, g.top, { color: C.ink, size: g.narrow ? 11.5 : 12, weight: 700 });
      (g.narrow ? st.subM : st.sub).forEach((line, i) => EA.draw.text(ctx, line, g.pad, g.top + 16 + i * 14, { color: C.dim, size: 11 }));
    }

    /* 1 · Laser: la pompa eccita gli atomi, un fotone ne stimola altri identici,
       il fascio esce dallo specchio semiriflettente ed entra nella fibra. */
    function sceneLaser(ctx, g, tau, t, live) {
      const { w, hh } = g;
      const nar = g.narrow;
      const cy = nar ? hh * 0.42 : hh * 0.45;
      const mx0 = nar ? 22 : w * 0.06;
      const mx1 = nar ? w * 0.64 : w * 0.47;
      const ch = nar ? hh * 0.26 : hh * 0.34;
      const fx0 = mx1 + (nar ? 18 : 64);
      const fx1 = w - (nar ? 12 : 24);
      const a = nar ? 9 : 11;
      const cl = nar ? 7 : 9;
      const N = nar ? 5 : 7;
      const Tc = 4.6;
      const TP = 0.45 * Tc;          // dopo quanto la pompa riporta su un atomo
      const xs = mx0 + 14;
      const v = (mx1 - xs) / (0.78 * Tc);
      const tt = live ? t : 2.6;     // fermo: la valanga è a metà cavità
      const p = live ? EA.smooth(tau / 0.8) : 1;
      const top = cy - ch / 2;
      const bot = cy + ch / 2;
      const atomX = (j) => mx0 + 40 + (j * (mx1 - mx0 - 80)) / (N - 1);

      box(ctx, mx0 + 8, cy - ch * 0.36, mx1 - mx0 - 16, ch * 0.72, 12, EA.alpha(C.amber, 0.045), EA.alpha(C.amber, 0.22));
      ctx.fillStyle = EA.alpha('#c9d6e8', 0.85);
      ctx.fillRect(mx0 - 6, top, 6, ch);
      ctx.fillStyle = EA.alpha('#c9d6e8', 0.3);
      ctx.fillRect(mx1, top, 5, ch);
      ctx.strokeStyle = EA.alpha('#c9d6e8', 0.75);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = top + 3; y < bot - 4; y += 7) { ctx.moveTo(mx1, y); ctx.lineTo(mx1 + 5, y + 4); }
      ctx.stroke();
      const ls = nar ? 10.5 : 11;
      EA.draw.text(ctx, 'specchio', mx0 - 6, top - 9, { color: C.text, size: ls });
      EA.draw.text(ctx, nar ? 'semiriflettente' : 'specchio semiriflettente', mx1 + 2, top - 9, { color: C.text, size: ls, align: 'center' });
      EA.draw.text(ctx, 'mezzo attivo', mx0 + 16, cy + ch * 0.36 - 8, { color: EA.alpha(C.amber, 0.85), size: 10.5 });
      fiberBand(ctx, fx0, fx1, cy, a, cl, { face: true });
      EA.draw.text(ctx, nar ? 'verso la fibra' : 'fascio coerente verso la fibra', (fx0 + fx1) / 2, cy - a - cl - 12, { color: TINT, size: ls, align: 'center' });

      // atomi: eccitati (ambra) o a riposo dopo aver emesso
      for (let j = 0; j < N; j++) {
        const x = atomX(j);
        const s = (((tt - (x - xs) / v) % Tc) + Tc) % Tc;   // tempo dall'ultimo passaggio
        const r = nar ? 4.5 : 5.5;
        if (s >= TP) EA.draw.dot(ctx, x, cy, r, C.amber);
        else {
          ctx.fillStyle = C.bg;
          ctx.strokeStyle = EA.alpha(C.text, 0.6);
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(x, cy, r, 0, TAU); ctx.fill(); ctx.stroke();
        }
        if (s < 0.5) ring(ctx, x, cy, r + 2 + s * 26, TINT, (1 - s / 0.5) * 0.8 * p);
        if (s >= TP && s < TP + 0.6) {
          const k = (s - TP) / 0.6;
          ctx.save();
          ctx.globalAlpha *= 1 - k;
          EA.draw.arrow(ctx, x, cy + r + 22 - k * 6, x, cy + r + 5, C.amber, 1.4, 6);
          ctx.restore();
        }
      }

      // pacchetti di fotoni: uno in più a ogni atomo eccitato incontrato
      const len = nar ? 50 : 76;
      const lam = nar ? 10 : 13;
      const amp = nar ? 2.2 : 3;
      const sp = nar ? 6 : 8;
      const mNow = Math.floor(tt / Tc);
      for (let m = mNow; m >= mNow - 2; m--) {
        const tm = tt - m * Tc;
        const xc = xs + v * tm;
        if (tm < 0 || xc - len / 2 > fx1) continue;
        let n = 1;
        for (let j = 0; j < N; j++) n += EA.smooth((tm - (atomX(j) - xs) / v) / 0.3);
        const squeeze = EA.smooth((xc - mx1) / (fx0 - mx1));
        const spc = EA.lerp(sp, Math.min(sp, (2 * a - 6) / Math.max(1, n - 1)), squeeze);
        const fade = (1 - EA.smooth((xc - (fx1 - len)) / len)) * p;
        const count = Math.ceil(n - 1e-6);
        for (let i = 0; i < count; i++) {
          ctx.save();
          ctx.globalAlpha *= (i === count - 1 ? n - (count - 1) : 1) * fade;
          packet(ctx, xc, cy + (i - (n - 1) / 2) * spc, len, lam, amp, TINT);
          ctx.restore();
        }
      }

      // didascalie e legenda
      const lx = nar ? w / 2 : (mx0 + mx1) / 2;
      EA.draw.text(ctx, nar ? 'un fotone ne stimola un altro, identico' : 'un fotone stimola un atomo eccitato: ne nasce un secondo identico', lx, bot + 20, { color: C.ink, size: nar ? 10.5 : 11.5, align: 'center' });
      const items = [['dot', nar ? 'eccitato' : 'atomo eccitato'], ['ring', 'a riposo'], ['arrow', 'pompa']];
      const gap = nar ? 12 : 18;
      const widths = items.map((it) => 14 + textWidth(ctx, it[1], ls));
      let x = lx - (widths.reduce((s, q) => s + q, 0) + gap * (items.length - 1)) / 2;
      const ly = bot + (nar ? 36 : 40);
      items.forEach((it, i) => {
        if (it[0] === 'dot') EA.draw.dot(ctx, x + 4, ly - 4, 3.5, C.amber);
        else if (it[0] === 'ring') {
          ctx.strokeStyle = EA.alpha(C.text, 0.6);
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(x + 4, ly - 4, 3.5, 0, TAU); ctx.stroke();
        } else EA.draw.arrow(ctx, x + 4, ly + 1, x + 4, ly - 10, C.amber, 1.3, 5);
        EA.draw.text(ctx, it[1], x + 14, ly, { color: C.text, size: ls });
        x += widths[i] + gap;
      });

      // riga di emissione: il LED è largo decine di nm, il laser è una riga sottilissima
      const bw = nar ? w - 24 : 300;
      const bh = nar ? 92 : 116;
      const bx = nar ? 12 : w - 24 - bw;
      const by = hh - bh - (nar ? 12 : 18);
      box(ctx, bx, by, bw, bh, 10, EA.alpha('#060b0a', 0.88), C.grid);
      EA.draw.text(ctx, 'RIGA DI EMISSIONE', bx + 12, by + 18, { color: C.dim, size: 10.5, weight: 700 });
      const x0 = bx + 14;
      const x1 = bx + bw - 14;
      const base = by + bh - 20;
      const peakY = by + 30;
      const mid = (x0 + x1) / 2;
      const sig = (x1 - x0) * 0.13;
      ctx.beginPath();
      ctx.moveTo(x0, base);
      for (let xx = x0; xx <= x1; xx += 2) {
        const u = (xx - mid) / sig;
        ctx.lineTo(xx, base - (base - peakY) * 0.5 * Math.exp((-u * u) / 2));
      }
      ctx.lineTo(x1, base);
      ctx.closePath();
      ctx.fillStyle = EA.alpha(C.amber, 0.16);
      ctx.fill();
      ctx.strokeStyle = EA.alpha(C.amber, 0.7);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = C.grid;
      ctx.beginPath(); ctx.moveTo(x0, base + 0.5); ctx.lineTo(x1, base + 0.5); ctx.stroke();
      EA.draw.line(ctx, [[mid, base], [mid, peakY]], TINT, 1.6);
      EA.draw.text(ctx, 'LED: 30-50 nm', x0, peakY + 10, { color: C.amber, size: 10.5 });
      EA.draw.text(ctx, 'laser: ~1 MHz', mid + 8, peakY + 10, { color: TINT, size: 10.5 });
      if (!nar) EA.draw.text(ctx, '(in scala, invisibile)', mid + 8, peakY + 24, { color: C.dim, size: 10.5 });
      EA.draw.text(ctx, 'lunghezza d\'onda →', x1, base + 14, { color: C.dim, size: 10.5, align: 'right' });
    }

    /* 2 · Riflessione totale: angoli veri con gli indici di una fibra plastica. Un raggio
       dentro il cono resta nel nucleo, uno fuori dal cono esce nel mantello. */
    function sceneTir(ctx, g, tau, t, live) {
      const { w, hh } = g;
      const nar = g.narrow;
      const n1 = 1.49;
      const n2 = 1.4;
      const cy = hh * 0.5;
      const a = nar ? hh * 0.085 : hh * 0.1;
      const cl = nar ? hh * 0.09 : hh * 0.11;
      const fx0 = nar ? 48 : w * 0.1;
      const fx1 = w - (nar ? 12 : 18);
      const tc = criticalAngle(n1, n2);
      const tmax = acceptanceAngle(n1, n2);
      const p = live ? EA.smooth(tau / 2.2) : 1;
      const lenN = (fx1 - fx0) / a;
      const air = fx0 - (nar ? 8 : 16);
      fiberBand(ctx, fx0, fx1, cy, a, cl, { face: true });

      // cono di accettazione, in aria
      const hw = air * Math.tan(tmax);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(fx0, cy); ctx.lineTo(fx0 - air, cy - hw); ctx.lineTo(fx0 - air, cy + hw); ctx.closePath();
      ctx.fillStyle = EA.alpha(TINT, 0.07);
      ctx.fill();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = EA.alpha(TINT, 0.45);
      ctx.beginPath();
      ctx.moveTo(fx0 - air, cy - hw); ctx.lineTo(fx0, cy); ctx.lineTo(fx0 - air, cy + hw);
      ctx.stroke();
      ctx.restore();

      // raggio guidato: 24° dall'asse, dentro il cono di ±30,7°
      const thG = 24 * DEG;
      const good = trace(n1, n2, thG, lenN, 0);
      const gPts = [[fx0 - air, cy + air * Math.tan(thG)]].concat(good.pts.map(([x, y]) => [fx0 + x * a, cy - y * a]));
      const gL = polyLengths(gPts);
      // raggio perso: 48° dall'asse, entra sotto l'asse e scende
      const thL = 48 * DEG;
      const lost = trace(n1, n2, thL, lenN, 0.4);
      const lMap = ([x, y]) => [fx0 + x * a, cy + y * a];
      const hit = lMap(lost.pts[1]);
      const th2 = lost.escapes[0].angle;
      const escEnd = [hit[0] + Math.tan(th2) * cl, hit[1] + cl];
      const lPts = [[fx0 - air, cy + 0.4 * a - air * Math.tan(thL)], lMap(lost.pts[0]), hit, escEnd];
      const lL = polyLengths(lPts);
      const dHit = lL[2];

      // tracce, disegnate man mano che la luce avanza
      const dG = p * gL[gL.length - 1];
      const dL = p * lL[lL.length - 1];
      EA.draw.line(ctx, subPath(lPts, lL, 0, Math.min(dL, dHit)), C.orange, 1.8);
      if (dL > dHit) {
        const ge = ctx.createLinearGradient(hit[0], hit[1], escEnd[0], escEnd[1]);
        ge.addColorStop(0, EA.alpha(C.orange, 0.95));
        ge.addColorStop(1, EA.alpha(C.orange, 0));
        const e = pointAt(lPts, lL, dL);
        ctx.save();
        ctx.strokeStyle = ge;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(hit[0], hit[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
        // la piccola parte riflessa (Fresnel: circa il 2%)
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = EA.alpha(C.orange, 0.35);
        ctx.lineWidth = 1;
        const r2 = lMap(lost.pts[2]);
        ctx.beginPath(); ctx.moveTo(hit[0], hit[1]); ctx.lineTo(EA.lerp(hit[0], r2[0], 0.7), EA.lerp(hit[1], r2[1], 0.7)); ctx.stroke();
        ctx.restore();
      }
      EA.draw.line(ctx, subPath(gPts, gL, 0, dG), TINT, 2);

      // impulsi di luce lungo i due raggi
      const vp = nar ? 120 : 200;
      const spP = nar ? 80 : 120;
      const ph = (vp * t) % spP;
      for (let d = ph; d < gL[gL.length - 1]; d += spP) {
        if (d > dG) break;
        const q = pointAt(gPts, gL, d);
        EA.draw.dot(ctx, q[0], q[1], nar ? 2.2 : 2.6, TINT);
      }
      for (let d = ph; d < lL[lL.length - 1]; d += spP) {
        if (d > dL) break;
        const q = pointAt(lPts, lL, d);
        ctx.save();
        ctx.globalAlpha *= d > dHit ? 1 - (d - dHit) / (lL[3] - dHit) : 1;
        EA.draw.dot(ctx, q[0], q[1], nar ? 2 : 2.4, C.orange);
        ctx.restore();
      }

      // angoli: incidenza dalla normale e direzione critica (tratteggio ambra)
      const la = EA.smooth((p - 0.45) / 0.4);
      ctx.save();
      ctx.globalAlpha *= la;
      const H1 = gPts[2];
      const thI = good.launch.inside;
      const rA = nar ? 22 : 34;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = EA.alpha(C.text, 0.6);
      ctx.beginPath();
      ctx.moveTo(H1[0], H1[1] - (nar ? 12 : 18)); ctx.lineTo(H1[0], H1[1] + rA + 10);
      ctx.moveTo(hit[0], hit[1] + (nar ? 10 : 14)); ctx.lineTo(hit[0], hit[1] - rA * 0.75 - 8);
      ctx.stroke();
      ctx.strokeStyle = EA.alpha(C.amber, 0.85);
      ctx.beginPath();
      ctx.moveTo(H1[0], H1[1]);
      ctx.lineTo(H1[0] + Math.cos(Math.PI / 2 + tc) * (rA + 12), H1[1] + Math.sin(Math.PI / 2 + tc) * (rA + 12));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = TINT;
      ctx.beginPath(); ctx.arc(H1[0], H1[1], rA, Math.PI / 2, Math.PI - thI); ctx.stroke();
      ctx.strokeStyle = C.orange;
      ctx.beginPath(); ctx.arc(hit[0], hit[1], rA * 0.75, Math.PI + lost.launch.inside, 1.5 * Math.PI); ctx.stroke();
      const mA = (Math.PI / 2 + Math.PI - thI) / 2;
      tag(ctx, EA.fmt(good.launch.incidence / DEG, 0) + '°', H1[0] + Math.cos(mA) * (rA + 14), H1[1] + Math.sin(mA) * (rA + 14) + 4, { color: TINT, size: nar ? 10.5 : 11, align: 'center' });
      if (!nar) {
        const mL = (Math.PI + lost.launch.inside + 1.5 * Math.PI) / 2;
        tag(ctx, EA.fmt(lost.launch.incidence / DEG, 0) + '°', hit[0] + Math.cos(mL) * (rA * 0.75 + 13), hit[1] + Math.sin(mL) * (rA * 0.75 + 13) + 4, { color: C.orange, size: 11, align: 'center' });
      }

      // scritte
      const yTop = cy - a - cl - 10;
      const yBot = cy + a + cl + 22;
      EA.draw.text(ctx, (nar ? 'cono ±' : 'cono di accettazione: ±') + EA.fmt(tmax / DEG, 1) + '°', g.pad, yTop, { color: TINT, size: 11 });
      if (nar) EA.draw.text(ctx, 'riflessione totale', fx1, yTop, { color: TINT, size: 11, align: 'right' });
      else EA.draw.text(ctx, 'dentro il cono: θ = ' + EA.fmt(good.launch.incidence / DEG, 0) + '° > θc, riflessione totale', H1[0] - 20, yTop, { color: TINT, size: 11 });
      EA.draw.text(ctx, nar ? 'fuori dal cono: θ < θc, esce' : 'fuori dal cono: θ < θc, in parte esce nel mantello', g.pad, yBot, { color: C.orange, size: 11 });
      if (nar) {
        EA.draw.text(ctx, 'angoli veri, fibra plastica', g.pad, yBot + 18, { color: C.dim, size: 10.5 });
        EA.draw.text(ctx, 'nel vetro θc ≈ 80°: rimbalzi radenti', g.pad, yBot + 34, { color: C.dim, size: 10.5 });
        EA.draw.text(ctx, 'mantello', fx1 - 6, cy - a - cl / 2 + 4, { color: C.dim, size: 10.5, align: 'right' });
        EA.draw.text(ctx, 'nucleo', fx1 - 6, cy - a + 14, { color: C.dim, size: 10.5, align: 'right' });
      } else {
        EA.draw.text(ctx, 'angoli veri per una fibra plastica · nel vetro θc ≈ 80°', fx1, yBot, { color: C.dim, size: 11, align: 'right' });
        EA.draw.text(ctx, 'nucleo', fx1 - 8, cy + a - 9, { color: C.dim, size: 11, align: 'right' });
        EA.draw.text(ctx, 'mantello', fx1 - 8, cy + a + cl / 2 + 4, { color: C.dim, size: 11, align: 'right' });
      }
      ctx.restore();
    }

    /* 3 · Vetro ultrapuro: quattro bacchette di vetro, scala logaritmica delle distanze.
       La luce si spegne dove la perdita supera 30 dB; il segno ambra è l'1%. */
    function sceneVetro(ctx, g, tau, t, live) {
      const { w, hh } = g;
      const nar = g.narrow;
      const x0 = nar ? 12 : Math.round(Math.min(300, w * 0.27));
      const x1 = w - (nar ? 12 : 24);
      const l0 = -4;    // log10 dei km: da 10 cm
      const l1 = 3;     // a 1000 km
      const X = (km) => x0 + ((Math.log10(km) - l0) / (l1 - l0)) * (x1 - x0);
      const D = (x) => Math.pow(10, l0 + ((x - x0) / (x1 - x0)) * (l1 - l0));
      const p = live ? EA.ease.inOut(EA.clamp((tau - 0.3) / 5.2, 0, 1)) : 1;
      const front = x0 + p * (x1 - x0);
      const rowY = (i) => (nar ? 92 + i * 52 : hh * 0.24 + i * hh * 0.14);
      const axisY = nar ? rowY(3) + 32 : hh * 0.8;
      const rh = nar ? 10 : 14;

      ctx.lineWidth = 1;
      ctx.strokeStyle = C.grid2;
      ctx.beginPath();
      for (let d = l0; d <= l1; d++) {
        const x = Math.round(X(Math.pow(10, d))) + 0.5;
        ctx.moveTo(x, rowY(0) - 22); ctx.lineTo(x, axisY);
      }
      ctx.stroke();
      // soglia di Kao e Hockham: 20 dB/km, cioè l'1% dopo 1 km
      const xk = Math.round(X(1)) + 0.5;
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = EA.alpha(C.amber, 0.55);
      ctx.beginPath(); ctx.moveTo(xk, rowY(0) - 22); ctx.lineTo(xk, axisY); ctx.stroke();
      ctx.restore();
      if (!nar) EA.draw.text(ctx, 'soglia di Kao e Hockham (1966): 20 dB/km', xk, rowY(0) - 28, { color: C.amber, size: 11, align: 'center' });

      GLASSES.forEach((gl, i) => {
        const y = rowY(i);
        const d1 = distanceForFraction(gl.alpha, 0.01);
        const xm = X(d1);
        if (nar) EA.draw.text(ctx, gl.name + ' · ' + gl.short, x0, y - rh / 2 - 6, { color: C.ink, size: 10.5, weight: 700 });
        else {
          EA.draw.text(ctx, gl.name, g.pad, y - 1, { color: C.ink, size: 11.5, weight: 700 });
          EA.draw.text(ctx, gl.note, g.pad, y + 14, { color: C.dim, size: 11 });
        }
        box(ctx, x0, y - rh / 2, x1 - x0, rh, rh / 2, '#070d0c', EA.alpha(C.blue, 0.32));
        const gr = ctx.createLinearGradient(x0, 0, x1, 0);
        for (let k = 0; k <= 56; k++) {
          const u = k / 56;
          gr.addColorStop(u, EA.alpha(TINT, 0.95 * EA.clamp(1 - (gl.alpha * D(x0 + u * (x1 - x0))) / 30, 0, 1)));
        }
        ctx.save();
        ctx.beginPath(); ctx.rect(x0, y - rh, Math.max(0, front - x0), rh * 2); ctx.clip();
        box(ctx, x0 + 1, y - rh / 2 + 2, x1 - x0 - 2, rh - 4, (rh - 4) / 2, gr, null);
        ctx.restore();
        const k1 = EA.clamp((front - xm) / 40, 0, 1);
        if (k1 > 0) {
          ctx.save();
          ctx.globalAlpha *= k1;
          ctx.strokeStyle = C.amber;
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(xm, y - rh / 2 - 5); ctx.lineTo(xm, y + rh / 2 + 5); ctx.stroke();
          if (nar) EA.draw.text(ctx, '1%: ' + fmtLen(d1), x1, y - rh / 2 - 6, { color: C.amber, size: 10.5, align: 'right' });
          else EA.draw.text(ctx, '1% dopo ' + fmtLen(d1), xm + 6, y - rh / 2 - 6, { color: C.amber, size: 11 });
          ctx.restore();
        }
      });

      ctx.strokeStyle = C.grid;
      ctx.beginPath(); ctx.moveTo(x0, axisY + 0.5); ctx.lineTo(x1, axisY + 0.5); ctx.stroke();
      const names = ['10 cm', '1 m', '10 m', '100 m', '1 km', '10 km', '100 km', '1000 km'];
      names.forEach((nm, k) => {
        const x = X(Math.pow(10, l0 + k));
        ctx.strokeStyle = C.grid;
        ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, axisY); ctx.lineTo(Math.round(x) + 0.5, axisY + 5); ctx.stroke();
        if (nar && k % 2 === 0) return;
        EA.draw.text(ctx, nm, x, axisY + 18, { color: C.text, size: 10.5, align: k === names.length - 1 ? 'right' : 'center' });
      });
      if (nar) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = EA.alpha(C.amber, 0.7);
        ctx.beginPath(); ctx.moveTo(g.pad, axisY + 37.5); ctx.lineTo(g.pad + 16, axisY + 37.5); ctx.stroke();
        ctx.restore();
        EA.draw.text(ctx, 'soglia di Kao e Hockham: 20 dB/km', g.pad + 22, axisY + 41, { color: C.amber, size: 10.5 });
        EA.draw.text(ctx, '20 dB = un centesimo della potenza', g.pad, axisY + 59, { color: C.dim, size: 10.5 });
      } else {
        EA.draw.text(ctx, 'distanza →', x0 - 12, axisY + 18, { color: C.dim, size: 10.5, align: 'right' });
        EA.draw.text(ctx, 'in decibel: 10 dB = un decimo della potenza, 20 dB = un centesimo, 30 dB = un millesimo', g.pad, hh - 18, { color: C.dim, size: 11 });
      }
    }

    /* 4 · WDM: ogni laser ha il suo colore (finto), il multiplatore li mette nella stessa
       fibra, il prisma all'arrivo li separa verso i ricevitori. Ogni canale ha i suoi bit. */
    function sceneWdm(ctx, g, tau, t, live) {
      const { w, hh } = g;
      const nar = g.narrow;
      const n = nar ? 6 : 8;
      const plan = channelPlan(1550, n);
      const cy = nar ? hh * 0.56 : hh * 0.53;
      const xl = g.pad;
      const ly0 = nar ? 86 : hh * 0.24;
      const ly1 = nar ? hh - 56 : hh * 0.84;
      const mx = w * 0.3;
      const fw = nar ? 34 : 56;
      const fx1 = nar ? w * 0.67 : w * 0.74;
      const px = nar ? w * 0.78 : w * 0.8;
      const pw = nar ? 22 : 30;
      const ph = nar ? 40 : 56;
      const dx = w - (nar ? 20 : 30);
      const a = nar ? 9 : 12;
      const cl = nar ? 7 : 9;
      const v = nar ? 80 : 130;
      const Lb = nar ? 17 : 24;
      const p = live ? EA.smooth(tau / 1.2) : 1;
      const yk = (k) => ly0 + (k * (ly1 - ly0)) / (n - 1);
      const off = (k) => (k - (n - 1) / 2) * ((2 * a - 7) / (n - 1));
      const paths = [];
      for (let k = 0; k < n; k++) {
        const pts = [[xl + 26, yk(k)], [mx - fw, yk(k)], [mx, cy + off(k)], [fx1, cy + off(k)], [px - pw * 0.6, cy + off(k) * 0.3], [px + pw * 0.6, cy + (k - (n - 1) / 2) * 3], [dx - 6, yk(k)]];
        paths.push({ pts, L: polyLengths(pts), col: falseColor(k / (n - 1)) });
      }
      // percorsi tenui
      paths.forEach((P) => {
        ctx.strokeStyle = EA.alpha(P.col, 0.2);
        ctx.lineWidth = 1;
        ctx.beginPath();
        P.pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        ctx.stroke();
      });
      // multiplatore a imbuto, fibra, prisma
      ctx.beginPath();
      ctx.moveTo(mx - fw, ly0 - 12); ctx.lineTo(mx, cy - a); ctx.lineTo(mx, cy + a); ctx.lineTo(mx - fw, ly1 + 12); ctx.closePath();
      ctx.fillStyle = EA.alpha(C.blue, 0.07);
      ctx.fill();
      ctx.strokeStyle = EA.alpha(C.blue, 0.42);
      ctx.lineWidth = 1;
      ctx.stroke();
      fiberBand(ctx, mx, fx1, cy, a, cl);
      ctx.beginPath();
      ctx.moveTo(px, cy - ph * 0.6); ctx.lineTo(px - pw, cy + ph * 0.4); ctx.lineTo(px + pw, cy + ph * 0.4); ctx.closePath();
      ctx.fillStyle = EA.alpha(TINT, 0.08);
      ctx.fill();
      ctx.strokeStyle = EA.alpha(TINT, 0.55);
      ctx.stroke();
      // laser e ricevitori
      const run = v * t;
      paths.forEach((P, k) => {
        const y = yk(k);
        EA.draw.dot(ctx, xl + 12, y, 3, P.col);
        box(ctx, xl, y - 6, 24, 12, 3, EA.alpha(P.col, 0.85), null);
        if (!nar) EA.draw.text(ctx, EA.si(plan[k].f, 'Hz', 4), xl, y - 10, { color: C.dim, size: 10.5 });
        const Lt = P.L[P.L.length - 1];
        const i = Math.round((run - Lt) / Lb);
        const dd = Math.abs(run - i * Lb - Lt);
        const lit = p >= 1 && hash01(k + 11, i) <= 0.62 && dd < Lb * 0.3 ? 1 - dd / (Lb * 0.3) : 0;
        if (lit > 0) EA.draw.dot(ctx, dx, y, 3 + lit * 2, P.col);
        box(ctx, dx - 6, y - 6, 12, 12, 2, EA.alpha(P.col, 0.15 + 0.6 * lit), EA.alpha(P.col, 0.85));
      });
      // impulsi: ogni canale porta i suoi bit; i colori si sommano dove si sovrappongono
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      paths.forEach((P, k) => {
        const Lt = P.L[P.L.length - 1];
        for (let i = Math.ceil((run - Lt) / Lb); i <= Math.floor(run / Lb); i++) {
          if (hash01(k + 11, i) > 0.62) continue;
          const d = run - i * Lb;
          if (d > p * Lt) continue;
          const q0 = pointAt(P.pts, P.L, d - Lb * 0.3);
          const q1 = pointAt(P.pts, P.L, d + Lb * 0.3);
          EA.draw.line(ctx, [[q0[0], q0[1]], [q1[0], q1[1]]], P.col, nar ? 2.2 : 2.6);
        }
      });
      ctx.restore();

      // scritte
      const ls = nar ? 10.5 : 11;
      const yl = ly0 - (nar ? 16 : 26);
      if (!nar) EA.draw.text(ctx, n + ' laser', xl, yl, { color: C.text, size: ls });
      EA.draw.text(ctx, 'multiplatore', mx - fw / 2, yl, { color: C.text, size: ls, align: 'center' });
      EA.draw.text(ctx, 'ricevitori', w - g.pad, yl, { color: C.text, size: ls, align: 'right' });
      EA.draw.text(ctx, nar ? 'una fibra, ' + n + ' canali' : 'una sola fibra, ' + n + ' canali insieme', (mx + fx1) / 2, cy - a - cl - (nar ? 10 : 12), { color: TINT, size: ls, align: 'center' });
      EA.draw.text(ctx, nar ? 'prisma' : 'reticolo o prisma', px, cy - ph * 0.6 - 10, { color: C.text, size: ls, align: 'center' });
      if (nar) EA.draw.text(ctx, n + ' × 10 Gbit/s = ' + EA.si(capacity(n), 'bit/s'), g.pad, hh - 14, { color: C.ink, size: 10.5 });
      else {
        EA.draw.text(ctx, 'canali ogni 100 GHz (circa 0,8 nm) attorno a 193,1 THz', (mx + fx1) / 2, cy + a + cl + 22, { color: C.dim, size: 11, align: 'center' });
        EA.draw.text(ctx, n + ' canali × 10 Gbit/s = ' + EA.si(capacity(n), 'bit/s') + ' · nella banda C ne entrano circa 40 a 100 GHz', g.pad, hh - 18, { color: C.ink, size: 11 });
      }
    }

    /* 5 · EDFA: gli impulsi si indeboliscono lungo 80 km, la fibra all'erbio eccitata dalla
       pompa li riporta su per emissione stimolata; sotto, la potenza in dBm. */
    function sceneEdfa(ctx, g, tau, t, live) {
      const { w, hh } = g;
      const nar = g.narrow;
      const fx0 = nar ? 46 : 70;
      const fx1 = w - (nar ? 12 : 24);
      const cy = nar ? hh * 0.4 : hh * 0.36;
      const a = nar ? 9 : 11;
      const cl = nar ? 7 : 9;
      const half = nar ? 30 : 64;
      const xe = (fx0 + fx1) / 2;
      const ea = xe - half;
      const eb = xe + half;
      const G = 16;   // dB: 80 km × 0,2 dB/km
      const P = (x) => (x <= ea ? (-G * (x - fx0)) / (ea - fx0) : x <= eb ? -G + (G * (x - ea)) / (eb - ea) : (-G * (x - eb)) / (fx1 - eb));
      const p = live ? EA.smooth(tau / 1.4) : 1;
      const v = nar ? 70 : 110;
      const Lb = nar ? 22 : 30;
      const NC = nar ? 3 : 4;
      const run = v * t;
      const bitOn = (c, i) => hash01(c + 21, i) <= 0.62;
      const ls = nar ? 10.5 : 11;

      fiberBand(ctx, fx0, fx1, cy, a, cl);
      ctx.fillStyle = EA.alpha(C.amber, 0.08);
      ctx.fillRect(ea, cy - a, eb - ea, 2 * a);
      const gp = ctx.createLinearGradient(ea, 0, eb, 0);
      gp.addColorStop(0, EA.alpha(PUMP, 0.34));
      gp.addColorStop(1, EA.alpha(PUMP, 0.04));
      ctx.fillStyle = gp;
      ctx.fillRect(ea, cy - a + 1, eb - ea, 2 * a - 2);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = EA.alpha(C.amber, 0.55);
      ctx.lineWidth = 1;
      ctx.strokeRect(ea - 6.5, cy - a - cl - 6.5, eb - ea + 13, 2 * (a + cl) + 13);
      ctx.restore();
      // laser di pompa e luce di pompa che scorre verso la fibra
      const pbw = nar ? 86 : 112;
      const pbh = nar ? 20 : 24;
      const pby = cy - a - cl - 6.5 - (nar ? 12 : 16) - pbh;
      box(ctx, xe - pbw / 2, pby, pbw, pbh, 6, EA.alpha(PUMP, 0.14), EA.alpha(PUMP, 0.7));
      EA.draw.text(ctx, 'pompa 980 nm', xe, pby + pbh / 2 + 4, { color: PUMP, size: ls, align: 'center' });
      ctx.save();
      ctx.strokeStyle = PUMP;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.moveTo(ea + 10, pby + pbh); ctx.lineTo(ea + 10, cy - a); ctx.stroke();
      ctx.restore();

      // ioni di erbio: eccitati dalla pompa, emettono quando passa un impulso
      const K = nar ? 7 : 12;
      for (let i = 0; i < K; i++) {
        const x = ea + ((i + 0.5) * (eb - ea)) / K;
        const y = cy + (hash01(i, 3) - 0.5) * (2 * a - 6);
        const u = (run - (x - fx0)) / Lb;
        const ib = Math.floor(u);
        const f = u - ib;
        let any = false;
        for (let c = 0; c < NC; c++) if (bitOn(c, ib)) any = true;
        if (any && f < 0.55) {
          ctx.strokeStyle = EA.alpha(C.text, 0.6);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.stroke();
          ring(ctx, x, y, 3 + f * 12, TINT, (1 - f / 0.55) * 0.7);
        } else EA.draw.dot(ctx, x, y, 2.2, C.amber);
      }

      // impulsi: la luminosità segue la potenza in dB
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = Math.ceil((run - (fx1 - fx0)) / Lb); i <= Math.floor(run / Lb); i++) {
        const x = fx0 + run - i * Lb;
        if (x > fx0 + p * (fx1 - fx0)) continue;
        const al = 0.2 + 0.8 * EA.clamp(1 + P(x) / G, 0, 1);
        for (let c = 0; c < NC; c++) {
          if (!bitOn(c, i)) continue;
          const y = cy + (c - (NC - 1) / 2) * ((2 * a - 8) / (NC - 1));
          ctx.save();
          ctx.globalAlpha *= al;
          EA.draw.line(ctx, [[x - Lb * 0.28, y], [x + Lb * 0.28, y]], falseColor(c / (NC - 1)), 2.4);
          ctx.restore();
        }
      }
      ctx.restore();

      // grafico della potenza di un canale lungo il percorso
      const gy0 = nar ? hh * 0.6 : hh * 0.58;
      const gy1 = hh * 0.86;
      const Y = (dbm) => gy0 + ((2 - dbm) / 22) * (gy1 - gy0);
      ctx.lineWidth = 1;
      [0, -10, -20].forEach((lv) => {
        ctx.strokeStyle = lv === 0 ? C.grid : C.grid2;
        ctx.beginPath(); ctx.moveTo(fx0, Math.round(Y(lv)) + 0.5); ctx.lineTo(fx1, Math.round(Y(lv)) + 0.5); ctx.stroke();
        EA.draw.text(ctx, EA.fmt(lv, 0) + (nar ? '' : ' dBm'), fx0 - 6, Y(lv) + 4, { color: C.dim, size: 10.5, align: 'right' });
      });
      EA.draw.text(ctx, nar ? 'POTENZA (dBm)' : 'POTENZA DI OGNI CANALE', fx0, gy0 - 12, { color: C.dim, size: 10.5, weight: 700 });
      const xEnd = fx0 + p * (fx1 - fx0);
      const prof = [[fx0, Y(0)]];
      [[ea, -G], [eb, 0], [fx1, -G]].forEach(([x, lv], i, arr) => {
        const xPrev = i ? arr[i - 1][0] : fx0;
        if (xEnd >= x) prof.push([x, Y(lv)]);
        else if (xEnd > xPrev) prof.push([xEnd, Y(P(xEnd))]);
      });
      EA.draw.line(ctx, prof, TINT, 1.8);
      if (xEnd > ea) EA.draw.line(ctx, [[ea, Y(-G)], [Math.min(eb, xEnd), Y(P(Math.min(eb, xEnd)))]], C.green, 2);
      const lb = EA.smooth((p - 0.5) / 0.4);
      ctx.save();
      ctx.globalAlpha *= lb;
      EA.draw.text(ctx, nar ? '−16 dB in 80 km' : '80 km × 0,2 dB/km = −16 dB', fx0 + 6, Y(-17), { color: C.text, size: ls });
      EA.draw.text(ctx, '+16 dB', eb + (nar ? 5 : 8), Y(-8), { color: C.green, size: ls, weight: 700 });
      ctx.restore();
      EA.draw.text(ctx, '0 km', fx0, gy1 + 16, { color: C.text, size: 10.5 });
      EA.draw.text(ctx, '80 km', xe, gy1 + 16, { color: C.text, size: 10.5, align: 'center' });
      EA.draw.text(ctx, '160 km', fx1, gy1 + 16, { color: C.text, size: 10.5, align: 'right' });

      // scritte sul disegno
      const yUp = cy - a - cl - (nar ? 12 : 14);
      EA.draw.text(ctx, nar ? 'più debole' : 'si indebolisce', (fx0 + ea) / 2, yUp, { color: C.text, size: ls, align: 'center' });
      EA.draw.text(ctx, nar ? 'di nuovo forte' : 'esce rinforzata, sempre come luce', (eb + fx1) / 2, yUp, { color: C.text, size: ls, align: 'center' });
      if (nar) {
        EA.draw.text(ctx, 'fibra all\'erbio', xe, cy + a + cl + 20, { color: C.amber, size: 10.5, align: 'center' });
        EA.draw.text(ctx, 'un EDFA per tutti i canali · non in scala', g.pad, hh - 12, { color: C.dim, size: 10.5 });
      } else {
        EA.draw.text(ctx, 'fibra drogata con erbio: alcuni metri', xe, cy + a + cl + 24, { color: C.amber, size: 11, align: 'center' });
        EA.draw.text(ctx, 'per emissione stimolata amplifica tutti i canali insieme', xe, cy + a + cl + 40, { color: C.text, size: 11, align: 'center' });
        EA.draw.text(ctx, 'schema non in scala: la fibra all\'erbio è lunga pochi metri, ogni campata 80 km', g.pad, hh - 14, { color: C.dim, size: 11 });
      }
    }

    /* 6 · Oceani: un impulso attraversa l'Atlantico lungo il cavo posato sul fondo,
       passando per decine di amplificatori; il cronometro segna il tempo vero. */
    function sceneOceani(ctx, g, tau, t, live) {
      const { w, hh } = g;
      const nar = g.narrow;
      const ys = nar ? hh * 0.31 : hh * 0.28;
      const xa = nar ? w * 0.1 : w * 0.09;
      const xb = w - xa;
      const deep = nar ? hh * 0.72 : hh * 0.76;
      const span = xb - xa;
      const floorY = (x) => {
        const s = EA.smooth((Math.min(x - xa, xb - x) - span * 0.05) / (span * 0.12));
        const und = Math.sin(x * 0.019) * 3 + Math.sin(x * 0.0071 + 1.3) * 5;
        return EA.lerp(ys + (nar ? 12 : 18), deep, s) + und * s;
      };
      // mare, fondale, terre
      const sea = ctx.createLinearGradient(0, ys, 0, deep);
      sea.addColorStop(0, EA.alpha(C.blue, 0.14));
      sea.addColorStop(1, EA.alpha(C.blue, 0.03));
      ctx.fillStyle = sea;
      ctx.fillRect(0, ys, w, hh - ys);
      ctx.beginPath();
      ctx.moveTo(xa, hh);
      for (let x = xa; x <= xb; x += 4) ctx.lineTo(x, floorY(x));
      ctx.lineTo(xb, hh);
      ctx.closePath();
      ctx.fillStyle = '#111a16';
      ctx.fill();
      ctx.strokeStyle = EA.alpha(C.dim, 0.45);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = xa; x <= xb; x += 4) (x === xa ? ctx.moveTo(x, floorY(x)) : ctx.lineTo(x, floorY(x)));
      ctx.stroke();
      [[0, xa - 6, xa + 10], [w, xb + 6, xb - 10]].forEach(([edge, c0, c1]) => {
        ctx.beginPath();
        ctx.moveTo(edge, ys - 8); ctx.lineTo(c0, ys - 8); ctx.lineTo(c1, ys + (nar ? 12 : 18)); ctx.lineTo(c1, hh); ctx.lineTo(edge, hh);
        ctx.closePath();
        ctx.fillStyle = '#16231d';
        ctx.fill();
        ctx.strokeStyle = EA.alpha(C.text, 0.4);
        ctx.beginPath(); ctx.moveTo(edge, ys - 8); ctx.lineTo(c0, ys - 8); ctx.lineTo(c1, ys + (nar ? 12 : 18)); ctx.stroke();
      });
      ctx.strokeStyle = EA.alpha(C.cyan, 0.5);
      ctx.beginPath();
      for (let x = xa - 6; x <= xb + 6; x += 3) {
        const y = ys + Math.sin(x * 0.09) * 1.2;
        if (x === xa - 6) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // il cavo, dalle stazioni di approdo lungo il fondale
      const cable = [[xa - (nar ? 18 : 30), ys - 8], [xa + 4, ys + (nar ? 8 : 12)]];
      for (let x = xa + 12; x <= xb - 12; x += 6) cable.push([x, floorY(x) - 3]);
      cable.push([xb - 4, ys + (nar ? 8 : 12)], [xb + (nar ? 18 : 30), ys - 8]);
      const cL = polyLengths(cable);
      const Lc = cL[cL.length - 1];
      EA.draw.line(ctx, cable, EA.alpha(C.text, 0.7), 1.6, false);
      [cable[0], cable[cable.length - 1]].forEach((q) => box(ctx, q[0] - 6, q[1] - 10, 12, 10, 2, '#22332e', EA.alpha(C.text, 0.5)));

      // impulso: attraversa in 6 s, poi resta un attimo all'arrivo
      const tt = live ? t : 3.3;
      const uu = EA.clamp((tt % 7.5) / 6, 0, 1);
      const d = uu * Lc;
      const rs = nar ? 10 : 14;
      for (let dr = cL[2] + rs / 2; dr < cL[cL.length - 3]; dr += rs) {
        const q = pointAt(cable, cL, dr);
        const near = Math.abs(dr - d) < rs * 0.6 && uu < 1;
        if (near) EA.draw.dot(ctx, q[0], q[1], 2.6, C.green);
        else {
          ctx.fillStyle = EA.alpha(C.green, 0.6);
          ctx.beginPath(); ctx.arc(q[0], q[1], 1.6, 0, TAU); ctx.fill();
        }
      }
      if (uu < 1) {
        EA.draw.line(ctx, subPath(cable, cL, Math.max(0, d - (nar ? 40 : 80)), d), EA.alpha(TINT, 0.45), 2, false);
        const q = pointAt(cable, cL, d);
        EA.draw.dot(ctx, q[0], q[1], 3.4, TINT);
      } else {
        const q = cable[cable.length - 1];
        EA.draw.dot(ctx, q[0], q[1] - 5, 3.4, C.green);
      }
      const tms = latency(6000 * uu) * 1000;
      EA.draw.text(ctx, (uu >= 1 ? 'arrivo: ' : 'tempo: ') + EA.fmt(tms, 1) + ' ms', w - g.pad, g.top, { color: uu >= 1 ? C.green : TINT, size: nar ? 11 : 12, weight: 700, align: 'right' });
      if (!nar) EA.draw.text(ctx, '6000 km · luce nel vetro a circa 204 000 km/s', w - g.pad, g.top + 16, { color: C.dim, size: 11, align: 'right' });

      // scritte
      const ls = nar ? 10.5 : 11;
      EA.draw.text(ctx, 'AMERICA', g.pad, ys - (nar ? 14 : 18), { color: C.text, size: ls, weight: 700 });
      EA.draw.text(ctx, 'EUROPA', w - g.pad, ys - (nar ? 14 : 18), { color: C.text, size: ls, weight: 700, align: 'right' });
      if (!nar) {
        EA.draw.text(ctx, '≈ 6000 km di Atlantico', w / 2, ys - 18, { color: C.dim, size: 11, align: 'center' });
        EA.draw.text(ctx, 'amplificatori EDFA ogni 50-100 km circa, alimentati dal rame del cavo', w / 2, deep - 34, { color: C.green, size: 11, align: 'center' });
        EA.draw.text(ctx, 'TAT-8 (1988): 280 Mbit/s per coppia di fibre, con ripetitori elettronici', g.pad, hh - 34, { color: C.text, size: 11 });
        EA.draw.text(ctx, 'oggi: circa 20-25 Tbit/s per coppia, con amplificatori EDFA e DWDM', g.pad, hh - 16, { color: C.ink, size: 11 });
      } else {
        EA.draw.text(ctx, 'TAT-8 (1988): 280 Mbit/s per coppia', g.pad, hh - 28, { color: C.text, size: 10.5 });
        EA.draw.text(ctx, 'oggi: circa 20-25 Tbit/s per coppia', g.pad, hh - 12, { color: C.ink, size: 10.5 });
      }
      // sezione del cavo
      const bw = nar ? 260 : 360;
      const bh = nar ? 72 : 104;
      const bx = w / 2 - bw / 2;
      const by = ys + (nar ? 12 : 22);
      box(ctx, bx, by, bw, bh, 10, EA.alpha('#060b0a', 0.88), C.grid);
      const r = nar ? 26 : 34;
      const ccx = bx + (nar ? 14 : 16) + r;
      const ccy = by + bh / 2 + (nar ? 0 : 6);
      if (!nar) EA.draw.text(ctx, 'SEZIONE DEL CAVO', bx + 12, by + 17, { color: C.dim, size: 10.5, weight: 700 });
      ctx.lineWidth = 1;
      [[r, EA.alpha(C.text, 0.12), EA.alpha(C.text, 0.45)], [r * 0.62, EA.alpha(C.orange, 0.32), EA.alpha(C.orange, 0.75)], [r * 0.36, '#0b1412', EA.alpha(TINT, 0.4)]].forEach(([rr, f, s]) => {
        ctx.beginPath(); ctx.arc(ccx, ccy, rr, 0, TAU);
        ctx.fillStyle = f; ctx.fill();
        ctx.strokeStyle = s; ctx.stroke();
      });
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = TINT;
        ctx.beginPath(); ctx.arc(ccx + Math.cos((k * TAU) / 6) * r * 0.18, ccy + Math.sin((k * TAU) / 6) * r * 0.18, 1.6, 0, TAU); ctx.fill();
      }
      const tx = ccx + r + 14;
      const lines = nar
        ? [['fibre al centro', TINT], ['rame per gli amplificatori', C.orange], ['isolante esterno', C.text]]
        : [['fibre ottiche al centro', TINT], ['rame: alimenta gli amplificatori', C.orange], ['isolante esterno', C.text], ['grosso come un tubo da giardino', C.dim]];
      lines.forEach(([txt, col], k) => EA.draw.text(ctx, txt, tx, by + (nar ? 24 : 38) + k * (nar ? 16 : 18), { color: col, size: ls }));
    }

    const SCENES = { laser: sceneLaser, tir: sceneTir, vetro: sceneVetro, wdm: sceneWdm, edfa: sceneEdfa, oceani: sceneOceani };

    function draw(t, dt) {
      if (!cv.w) return;
      const live = loop.playing;
      if (live) {
        stageT += dt;
        fadeT = Math.min(1, fadeT + dt / FADE);
        if (stageT > STAGES[stage].dur) {
          prev = stage;
          fadeT = 0;
          stageT = 0;
          stage = (stage + 1) % STAGES.length;
          api.setStep(stage);
        }
      }
      const g = geometry();
      const ctx = cv.ctx;
      EA.draw.clear(cv);
      const k = live ? EA.smooth(fadeT) : 1;
      if (prev >= 0 && k < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - k;
        SCENES[STAGES[prev].key](ctx, g, STAGES[prev].dur, t, true);
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = k;
      SCENES[STAGES[stage].key](ctx, g, stageT, t, live);
      heading(ctx, g);
      ctx.restore();
    }

    loop = api.loop(draw);
    api.setStep(0);
    return {
      focus(key, i) {
        const j = STAGES.findIndex((s) => s.key === key);
        stage = j >= 0 ? j : EA.clamp(i, 0, STAGES.length - 1);
        stageT = 0;
        prev = -1;
        fadeT = 1;
        api.setStep(stage);
        api.invalidate();
        api.announce('Fase ' + (stage + 1) + ': ' + STAGES[stage].say + '.');
      },
    };
  }

  /* ---------- laboratorio della fibra ---------- */

  function mountLab(parts, api) {
    /* LAB */
  }

  /* ---------- contenuti ---------- */

  EA.register({
    id: 'fotonica',
    intro: [
      'Quando apri una pagina web, i dati fanno quasi sempre gran parte del viaggio dentro un filo di vetro spesso un ottavo di millimetro. Non sono elettroni in un cavo di rame ma <strong>impulsi di luce infrarossa</strong>, accesi e spenti miliardi di volte al secondo da un laser e guidati da una <em>fibra ottica</em> per decine, centinaia o migliaia di chilometri.',
      'Per tenere la luce dentro il vetro basta un\'idea dell\'Ottocento, la <strong>riflessione totale interna</strong>: il nucleo della fibra ha un indice di rifrazione appena più alto del mantello che lo avvolge, e la luce che arriva abbastanza di striscio sulla superficie di separazione viene riflessa tutta, senza perdite. Il resto lo fa la purezza del vetro: a 1550 nm una fibra di oggi perde circa 0,2 dB per chilometro, così dopo 100 km arriva ancora l\'1% della luce.',
      'Poi entrano in gioco i moltiplicatori di capacità. Decine di laser con lunghezze d\'onda diverse, cioè di «colori» diversi, condividono la stessa fibra senza mescolarsi (<abbr title="Wavelength Division Multiplexing, multiplazione a divisione di lunghezza d\'onda">WDM</abbr>), e amplificatori fatti di fibra drogata con erbio ridanno forza a tutti i canali insieme, senza trasformare la luce in elettricità. È così che i cavi posati sul fondo degli oceani portano quasi tutto il traffico dati tra i continenti.',
    ],
    steps: [
      { title: 'Il laser: fotoni gemelli', text: 'Nel mezzo attivo una sorgente di energia, la pompa, porta molti atomi in uno stato eccitato. Un fotone che passa accanto a uno di loro lo fa scendere e gli fa emettere un fotone identico: stessa frequenza, stessa fase, stessa direzione. Due specchi rimandano la luce avanti e indietro e la valanga diventa un fascio coerente e quasi monocromatico.', focus: 'laser' },
      { title: 'Intrappolata nel nucleo', text: 'Il nucleo ha un indice di rifrazione n₁ un po\' più alto di quello del mantello, n₂. Se il raggio colpisce la superficie di separazione con un angolo, misurato dalla normale, più grande dell\'angolo critico, torna indietro tutto. Per questo vengono guidati solo i raggi che entrano dentro il cono di accettazione: gli altri escono nel mantello e si perdono.', focus: 'tir' },
      { title: 'Vetro purissimo', text: 'In un vetro da finestra la luce si riduce all\'1% in circa un metro (è una stima). Nel 1966 Kao e Hockham calcolarono che, togliendo le impurità, si poteva scendere sotto 20 dB/km, cioè l\'1% dopo un chilometro, e nel 1970 Corning ci riuscì. Oggi a 1550 nm si perdono circa 0,2 dB/km: l\'1% arriva dopo 100 km.', focus: 'vetro' },
      { title: 'Tanti colori nella stessa fibra', text: 'Ogni canale viaggia sulla sua lunghezza d\'onda e i canali non si mescolano: all\'arrivo un reticolo o un filtro li separa, come un prisma separa i colori. Nella versione densa, la DWDM, i canali distano 100 GHz, circa 0,8 nm, attorno a 193,1 THz. I colori del disegno sono finti: in realtà è tutta luce infrarossa.', focus: 'wdm' },
      { title: 'L\'amplificatore all\'erbio', text: 'Dopo 80 km a 0,2 dB/km la potenza è scesa di 16 dB, a circa un quarantesimo. Un EDFA, pochi metri di fibra con ioni di erbio eccitati da un laser di pompa, restituisce quei 16 dB per emissione stimolata: a tutti i canali insieme e senza trasformare la luce in elettricità.', focus: 'edfa' },
      { title: 'Attraverso gli oceani', text: 'Un cavo sottomarino posato sul fondo porta coppie di fibre e, ogni 50-100 km circa, un amplificatore alimentato dal conduttore di rame del cavo. Nel vetro la luce corre a circa 204 000 km/s: per 6000 km di Atlantico servono circa 30 ms. TAT-8, nel 1988, portava 280 Mbit/s per coppia di fibre; oggi una coppia arriva a circa 20-25 Tbit/s.', focus: 'oceani' },
    ],
    formulas: [
      { label: 'Legge di Snell', eq: '<var>n</var><sub>1</sub> · sin <var>θ</var><sub>1</sub> = <var>n</var><sub>2</sub> · sin <var>θ</var><sub>2</sub>', text: 'Passando da un mezzo con indice <var>n</var><sub>1</sub> a uno con indice <var>n</var><sub>2</sub> la luce cambia direzione; gli angoli si misurano dalla normale alla superficie di separazione. Se <var>n</var><sub>2</sub> &lt; <var>n</var><sub>1</sub> il raggio rifratto si allontana dalla normale: da qui nasce la riflessione totale.' },
      { label: 'Angolo critico', eq: '<var>θ</var><sub>c</sub> = arcsin(<var>n</var><sub>2</sub> ⁄ <var>n</var><sub>1</sub>)', text: 'Esiste solo se il nucleo ha indice maggiore del mantello. Oltre questo angolo di incidenza, misurato dalla normale, la luce non può uscire e viene riflessa tutta. Con <var>n</var><sub>1</sub> = 1,48 e <var>n</var><sub>2</sub> = 1,46 vale circa 80,6°; tra acqua e aria circa 48,6°.' },
      { label: 'Apertura numerica', eq: 'NA = √(<var>n</var><sub>1</sub><sup>2</sup> − <var>n</var><sub>2</sub><sup>2</sup>) = sin <var>θ</var><sub>max</sub>', text: 'Dice quanta luce la fibra raccoglie dall\'aria. Vengono guidati i raggi che entrano formando con l\'asse un angolo minore di <var>θ</var><sub>max</sub>, il semiangolo del cono di accettazione. Con 1,48 e 1,46 si ottiene NA ≈ 0,24 e <var>θ</var><sub>max</sub> ≈ 14°.' },
      { label: 'Bilancio di potenza', eq: '<var>P</var>(<var>L</var>) = <var>P</var><sub>0</sub> − <var>α</var> · <var>L</var> + Σ<var>G</var> − Σ<var>A</var>', text: 'In decibel le perdite si sottraggono e i guadagni si sommano. <var>P</var><sub>0</sub> è la potenza lanciata in dBm (0 dBm = 1 mW), <var>α</var> l\'attenuazione in dB/km, <var>G</var> il guadagno degli amplificatori, <var>A</var> le perdite di connettori e giunzioni. Il collegamento funziona se <var>P</var>(<var>L</var>) resta sopra la soglia del ricevitore, con qualche dB di margine.' },
    ],
    timeline: [
      { year: 1841, title: 'La luce in un getto d\'acqua', who: 'Jean-Daniel Colladon, Ginevra', text: 'Colladon illumina un recipiente d\'acqua e mostra che la luce resta intrappolata nel getto che esce da un foro e ne segue la curva, per riflessione totale interna. Pubblica l\'esperimento nel 1842 sui Comptes Rendus di Parigi, nello stesso fascicolo di una nota di Jacques Babinet su un effetto simile. John Tyndall lo ripeté a Londra nel 1854 e per molto tempo è stato ricordato, a torto, come l\'inventore.' },
      { year: 1880, title: 'Il fotofono: la voce su un raggio di Sole', who: 'Alexander Graham Bell e Charles Sumner Tainter, Washington', text: 'Il 3 giugno 1880 Tainter trasmette a Bell un messaggio vocale su un fascio di luce solare, dal tetto della Franklin School al laboratorio di L Street, a circa 213 metri: la voce fa vibrare uno specchio sottile e una cella al selenio ritrasforma la luce in suono. Bell lo considerava la sua invenzione più importante, ma all\'aria aperta il collegamento dipendeva dal Sole e dal tempo.' },
      { year: 1917, title: 'L\'emissione stimolata', who: 'Albert Einstein, Berlino', text: 'In lavori del 1916 e nell\'articolo «Zur Quantentheorie der Strahlung», pubblicato nel 1917, Einstein mostra che un fotone può indurre un atomo eccitato a emetterne un secondo con la stessa frequenza e la stessa direzione. Che abbia anche la stessa fase lo preciserà la teoria quantistica della fine degli anni \'20. È il principio di laser e amplificatori ottici.' },
      { year: 1960, title: 'Il primo laser', who: 'Theodore H. Maiman, Hughes Research Laboratories, Malibu (California)', text: 'Il 16 maggio 1960 una barretta di rubino, eccitata da una lampada flash a spirale, emette impulsi di luce rossa a 694,3 nm: è il primo laser, descritto su Nature nell\'agosto 1960. A dicembre Ali Javan, William Bennett e Donald Herriott, ai Bell Labs, accendono il primo laser continuo, a elio e neon. Nel 1962 arrivano i laser a semiconduttore, che però funzionano solo a impulsi e raffreddati a 77 K.' },
      { year: 1966, title: 'Comunicare con fibre di vetro', who: 'Charles K. Kao e George A. Hockham, Standard Telecommunication Laboratories, Harlow (Regno Unito)', text: 'Kao e Hockham mostrano che le perdite enormi dei vetri di allora, circa 1000 dB/km, dipendono soprattutto dalle impurità e non dal vetro in sé. Sotto i 20 dB/km, cioè con l\'1% della luce ancora presente dopo un chilometro, una fibra potrebbe portare le telefonate. Per questo lavoro Kao ha ricevuto metà del Premio Nobel per la Fisica 2009.' },
      { year: 1970, title: 'Vetro ultrapuro e laser a temperatura ambiente', who: 'Robert Maurer, Donald Keck e Peter Schultz, Corning Glass Works (Stati Uniti)', text: 'Con silice fusa purissima e un nucleo drogato al titanio, il gruppo Corning ottiene la prima fibra sotto la soglia di Kao: circa 17 dB/km, misurati alla luce rossa di un laser elio-neon (633 nm). Nello stesso anno il gruppo di Žores Alfërov all\'Istituto Ioffe di Leningrado e Izuo Hayashi e Morton Panish ai Bell Labs fanno funzionare i laser a semiconduttore in continua a temperatura ambiente: ora ci sono la sorgente e il mezzo.' },
      { year: 1987, title: 'L\'amplificatore tutto ottico', who: 'David Payne e colleghi, Università di Southampton; Emmanuel Desurvire e colleghi, AT&T Bell Laboratories', text: 'Due gruppi dimostrano l\'amplificatore a fibra drogata con erbio: alcuni metri di fibra con ioni di erbio, eccitati da un laser di pompa, amplificano per emissione stimolata la luce attorno a 1550 nm senza convertirla in elettricità. Poiché amplifica tutti i canali insieme, l\'EDFA rende conveniente la WDM: i sistemi DWDM commerciali arrivano a metà degli anni \'90.' },
      { year: 1988, title: 'TAT-8: l\'Atlantico in fibra', who: 'Consorzio guidato da AT&T, British Telecom e France Télécom', text: 'Il 14 dicembre 1988 entra in servizio TAT-8, il primo cavo telefonico transatlantico in fibra ottica, tra Stati Uniti, Regno Unito e Francia. Lavora a 1310 nm con circa 280 Mbit/s per coppia di fibre, l\'equivalente di circa 40 000 telefonate contemporanee. I ripetitori sono ancora elettronici: la luce diventa elettricità e poi di nuovo luce. I transatlantici con EDFA arrivano a metà degli anni \'90, con TAT-12/13.' },
      { year: 2025, title: 'La luce arriva accanto al chip', who: 'NVIDIA, Broadcom e altri produttori di chip di rete', text: 'Nei data center per l\'intelligenza artificiale i motori ottici, realizzati con la fotonica integrata (l\'«ottica integrata» proposta da Stewart Miller ai Bell Labs nel 1969, oggi spesso su silicio), vengono montati nello stesso package del chip di commutazione invece che in moduli separati. Il segnale elettrico percorre pochi millimetri e il consumo per bit diminuisce. Nel marzo 2025 NVIDIA ha annunciato i suoi primi switch con ottica co-packaged.' },
    ],
    fun: 'In un comune vetro da finestra la luce perde metà della sua potenza in una decina di centimetri (è una stima). In una fibra di oggi, alla lunghezza d\'onda di 1550 nm, per lo stesso dimezzamento servono circa 15 km: una «finestra» fatta di quel vetro potrebbe essere spessa quanto una città e lasciar passare ancora metà della luce infrarossa.',
    uses: [
      'Dorsali di Internet e reti metropolitane: sistemi DWDM con decine di canali sulla stessa fibra, ciascuno da 100 a 800 Gbit/s.',
      'Cavi sottomarini intercontinentali, con amplificatori EDFA ogni 50-100 km circa: portano quasi tutto il traffico dati tra i continenti.',
      'Fibra fino a casa (FTTH): nelle reti GPON una fibra viene divisa tra decine di utenti con splitter passivi; il segnale verso casa usa 1490 nm, quello di ritorno 1310 nm.',
      'Data center e cluster per l\'intelligenza artificiale: transceiver da 400-800 Gbit/s, laser VCSEL a 850 nm su fibra multimodale per tratte fino a qualche centinaio di metri, fotonica al silicio e ottica co-packaged.',
      'Reti mobili 4G e 5G: le antenne sono collegate alla rete con la fibra, mentre la radio copre solo l\'ultimo tratto fino al telefono.',
      'Medicina: endoscopi con fasci ordinati di fibre per vedere dentro il corpo, laser chirurgici guidati in fibra e tomografia a coerenza ottica (OCT) in oculistica.',
      'Sensori in fibra: con i reticoli di Bragg e il rilevamento acustico distribuito, chilometri di fibra misurano vibrazioni, temperatura e deformazioni di ponti, pozzi e binari.',
      'Auto, aerei e audio di casa: fibre plastiche a luce rossa per collegamenti brevi immuni ai disturbi elettromagnetici, come l\'uscita audio ottica TOSLINK.',
    ],
    glossary: [
      { term: 'Emissione stimolata', def: 'Un fotone di energia adatta incontra un atomo o uno ione eccitato e gli fa emettere un secondo fotone identico: stessa frequenza, fase, direzione e polarizzazione. Se gli atomi eccitati sono più di quelli a riposo (<em>inversione di popolazione</em>) la luce viene amplificata. È il cuore di laser ed EDFA.' },
      { term: 'Riflessione totale interna', def: 'La luce che passa da un mezzo con indice di rifrazione maggiore a uno con indice minore viene riflessa tutta se l\'angolo di incidenza supera l\'angolo critico <var>θ</var><sub>c</sub> = arcsin(<var>n</var><sub>2</sub>/<var>n</var><sub>1</sub>). Nella fibra tiene la luce nel nucleo senza specchi metallici.' },
      { term: 'Apertura numerica (NA)', def: 'Il numero NA = √(<var>n</var><sub>1</sub><sup>2</sup> − <var>n</var><sub>2</sub><sup>2</sup>) dice quanta luce la fibra sa raccogliere: il seno del semiangolo del cono di accettazione. Valori tipici: da 0,20 a 0,275 per la multimodale, circa 0,5 per la fibra plastica; per la monomodale i cataloghi indicano 0,14, definito però in modo diverso.' },
      { term: 'Attenuazione, dB e dBm', def: 'L\'attenuazione <var>α</var>, in dB/km, dice quanta potenza si perde per chilometro: 3 dB sono metà potenza, 10 dB un decimo, 20 dB un centesimo. Il dBm è una potenza assoluta riferita a 1 mW (0 dBm = 1 mW, −30 dBm = 1 µW): per questo <var>P</var><sub>0</sub> − <var>α</var>·<var>L</var> dà subito la potenza in arrivo.' },
      { term: 'WDM e DWDM', def: 'Multiplazione a divisione di lunghezza d\'onda: più canali, ciascuno su una lunghezza d\'onda diversa, viaggiano nella stessa fibra e all\'arrivo vengono separati con filtri o reticoli. Nella versione densa (DWDM) distano 50-100 GHz, cioè 0,4-0,8 nm, su una griglia ITU ancorata a 193,1 THz; nel CWDM distano 20 nm.' },
      { term: 'EDFA', def: 'Amplificatore a fibra drogata con erbio: alcuni metri di fibra con ioni Er<sup>3+</sup> eccitati da un laser di pompa a 980 o 1480 nm. Per emissione stimolata amplifica insieme tutti i canali tra circa 1530 e 1565 nm (la banda C), con guadagni di 20-30 dB, aggiungendo un po\' di rumore.' },
      { term: 'Fotodiodo (PIN e APD)', def: 'In ricezione trasforma la luce in corrente: <var>I</var> = <var>R</var> · <var>P</var>, con una responsività <var>R</var> di circa 0,9-1 A/W per l\'arseniuro di indio e gallio (InGaAs) a 1550 nm. Il fotodiodo a valanga (APD) moltiplica la corrente al suo interno e riceve segnali più deboli di un PIN.' },
      { term: 'Fibra monomodale e multimodale', def: 'Nella monomodale il nucleo misura circa 8 µm e la luce viaggia come un\'unica onda guidata: serve per le lunghe distanze a 1310 e 1550 nm. Nella multimodale il nucleo è di 50 o 62,5 µm e la luce segue molti percorsi di lunghezza diversa, che allargano gli impulsi: va bene per qualche centinaio di metri, come nei data center.' },
    ],
    sources: [
      { title: 'Colladon\'s "light jet" predates Tyndall\'s "light pipe" (Jeff Hecht, Laser Focus World)', url: 'https://www.laserfocusworld.com/home/article/16546267/colladons-light-jet-predates-tyndalls-light-pipe' },
      { title: 'Liquid Vein Demonstration (Kenyon College, strumenti storici di fisica)', url: 'https://physics.kenyon.edu/EarlyApparatus/Optics/Liquid_Vein/Liquid_Vein.html' },
      { title: 'Photophone (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Photophone' },
      { title: 'Targa della Franklin School sul fotofono, 1880 (The Historical Marker Database)', url: 'https://www.hmdb.org/m.asp?m=17569' },
      { title: 'T. H. Maiman, Stimulated Optical Radiation in Ruby, Nature 187, 493-494 (1960)', url: 'https://www.nature.com/articles/187493a0' },
      { title: 'The Nobel Prize in Physics 2009 (NobelPrize.org)', url: 'https://www.nobelprize.org/prizes/physics/2009/summary/' },
    ],
    hero: {
      caption: 'La luce resta nel nucleo per riflessione totale, più canali viaggiano insieme e un amplificatore all\'erbio la ricarica. Lo zig-zag descrive le fibre multimodali; i colori dei canali sono finti, perché nelle telecomunicazioni la luce è infrarossa.',
      label: 'Animazione: il laser, la riflessione totale nella fibra, il vetro ultrapuro, i canali WDM, l\'amplificatore all\'erbio e i cavi sottomarini',
      aspect: '16 / 7',
      aspectMobile: '1 / 1',
      mount: mountHero,
    },
    lab: {
      title: 'Laboratorio della fibra',
      intro: 'Scegli la fibra o regola gli indici del nucleo e del mantello, poi cambia l\'angolo di lancio: guarda quando il raggio resta intrappolato e quando esce nel mantello. Sotto c\'è il bilancio di potenza: scegli finestra, lunghezza e numero di canali e controlla se la luce arriva sopra la soglia del ricevitore, con gli amplificatori all\'erbio quando servono.',
      mount: mountLab,
    },
    quiz: [
      {
        id: 'ea-fotonica-01', chapter: 'fotonica', level: 1, topic: 'Riflessione totale',
        q: 'Che cosa tiene la luce dentro il nucleo di una fibra ottica, anche quando la fibra fa una curva?',
        options: [
          'La riflessione totale: il nucleo ha indice più alto del mantello e la luce lo colpisce oltre l\'angolo critico',
          'Un velo di metallo sottilissimo, depositato tra nucleo e mantello, che riflette la luce come uno specchio',
          'Il mantello assorbe tutta la luce che lo raggiunge, quindi resta soltanto quella che viaggia lungo l\'asse',
          'La coerenza del laser: un fascio coerente non si allarga mai e così non tocca le pareti del nucleo',
        ],
        answer: 0,
        why: 'Il mantello è anch\'esso di vetro, con un indice di rifrazione leggermente minore del nucleo. Un raggio che colpisce la superficie di separazione con un angolo dalla normale maggiore dell\'angolo critico, arcsin(n₂/n₁), viene riflesso al 100%. Non serve alcun metallo, e la coerenza del laser da sola non basterebbe: senza riflessione totale la luce uscirebbe a ogni curva.',
      },
      {
        id: 'ea-fotonica-02', chapter: 'fotonica', level: 2, topic: 'Cono di accettazione',
        q: 'Una fibra ha nucleo con n₁ = 1,48 e mantello con n₂ = 1,46, quindi NA ≈ 0,24. Un raggio arriva dall\'aria formando 20° con l\'asse della fibra. Che cosa gli succede?',
        options: [
          'Esce nel mantello: il cono di accettazione ha un semiangolo di circa 14°',
          'Resta guidato: 20° è molto meno dell\'angolo critico, che vale circa 80,6°',
          'Resta guidato: il cono di accettazione ha un semiangolo di circa 76°',
          'Esce nel mantello: si perde ogni raggio che non viaggia lungo l\'asse',
        ],
        answer: 0,
        why: 'θmax = arcsin(NA) = arcsin(0,243) ≈ 14°: è il semiangolo del cono, misurato dall\'asse e in aria. A 20° il raggio è fuori dal cono: nel vetro forma circa 13,4° con l\'asse e incontra il mantello a circa 76,6° dalla normale, meno dell\'angolo critico di 80,6°, quindi in gran parte esce. L\'errore tipico è confrontare 20°, misurato dall\'asse, con θc, misurato dalla normale.',
      },
      {
        id: 'ea-fotonica-03', chapter: 'fotonica', level: 2, topic: 'Bilancio di potenza',
        q: 'Un trasmettitore lancia 0 dBm a 1550 nm in una fibra da 0,2 dB/km e il ricevitore funziona fino a −28 dBm. Trascurando connettori e margine, qual è la distanza massima senza amplificatori?',
        options: ['140 km', '28 km', '56 km', '1400 km'],
        answer: 0,
        why: 'Il ricevitore tollera una perdita di 0 − (−28) = 28 dB. A 0,2 dB/km si arriva a 28 / 0,2 = 140 km. A 1310 nm, con circa 0,35 dB/km, ci si fermerebbe a 80 km: anche per questo le lunghe distanze usano 1550 nm, dove funzionano gli amplificatori all\'erbio. Nei progetti veri si tolgono anche circa 0,5 dB per connettore e un margine di qualche dB.',
      },
      {
        id: 'ea-fotonica-04', chapter: 'fotonica', level: 3, topic: 'EDFA e WDM',
        q: 'Perché l\'amplificatore a fibra drogata con erbio (EDFA) ha reso conveniente la multiplazione a divisione di lunghezza d\'onda (WDM)?',
        options: [
          'Amplifica insieme tutti i canali della banda C, senza trasformare la luce in elettricità',
          'Trasforma ogni canale in un segnale elettrico e lo rigenera con impulsi di nuovo perfetti',
          'Porta tutti i canali sulla stessa lunghezza d\'onda, così il ricevitore ne deve leggere uno',
          'Elimina l\'attenuazione della fibra, così la potenza resta costante per tutto il percorso',
        ],
        answer: 0,
        why: 'Un ripetitore elettronico, come quelli di TAT-8, deve rivelare, rigenerare e ritrasmettere ogni canale con la sua elettronica: con 40 canali servirebbero 40 ripetitori in ogni punto. L\'EDFA amplifica per emissione stimolata tutta la banda attorno a 1550 nm in un colpo solo, rumore compreso, quindi un solo apparato basta per tutti i canali. Non elimina l\'attenuazione: la compensa a tratti.',
      },
    ],
    model,
  });
})(typeof window !== 'undefined' ? window : globalThis);
