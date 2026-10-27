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
  const LINK = { p0: 0, sens: -28, margin: 3, connector: 0.5, connectors: 2, span: 80, rate: 10e9, edfa: true };

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
    if (!WINDOWS[win].edfa || !k.edfa || L <= reachKm(win, k)) return [];
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

  // A 850 nm su fibra multimodale i tanti percorsi allargano gli impulsi: a 10 Gbit/s
  // oltre circa 300 m si confondono, anche se la potenza basterebbe (dispersione modale).
  const modalLimited = (win, L) => WINDOWS[win].modalKm != null && L > WINDOWS[win].modalKm;

  const dbmToMw = (p) => Math.pow(10, p / 10);

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

  // Materiale del fotodiodo: il silicio assorbe solo fotoni con almeno 1,12 eV (fino a circa
  // 1,1 µm); a 1310 e 1550 nm serve l'arseniuro di indio e gallio. eta: efficienza quantica tipica.
  const SI_GAP = 1.12;
  const detector = (nm) => (photonEnergy(nm) > SI_GAP ? { name: 'silicio', eta: 0.8 } : { name: 'InGaAs', eta: 0.75 });

  // Ritardo di propagazione nella fibra: L·ng/c, in secondi.
  const latency = (km, ng) => (km * 1000 * (ng || NG)) / C0;

  // Dal vetro da finestra alla fibra di oggi (dB/km; il primo valore è una stima).
  const GLASSES = [
    { key: 'finestra', name: 'Vetro da finestra', note: '≈ 20 000 dB/km (stima)', short: '≈ 20 000 dB/km', alpha: 20000 },
    { key: '1965', name: 'Vetro ottico del 1965', note: '≈ 1000 dB/km', short: '≈ 1000 dB/km', alpha: 1000 },
    { key: '1970', name: 'Corning, 1970', note: '≈ 17 dB/km a 633 nm', short: '≈ 17 dB/km', alpha: 17 },
    { key: 'oggi', name: 'Fibra di oggi', note: '≈ 0,2 dB/km a 1550 nm', short: '≈ 0,2 dB/km', alpha: 0.2 },
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
    reachKm, amplifiers, budget, budgetProfile, modalLimited,
    dbmToMw, fractionLeft, distanceForFraction,
    frequency, wavelength, photonEnergy, responsivity, photocurrent, SI_GAP, detector, latency,
    channelPlan, capacity,
  };

  /* ---------- aiuti di disegno e formati ---------- */

  const TINT = '#dfe7ff';   // luce guidata
  const PUMP = '#ff7aa8';   // luce di pompa (falso colore)
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const SPECTRUM = ['#ff6b6b', '#ff9f43', '#ffc04d', '#9be15d', '#3ee08f', '#5cc8ff', '#7aa2ff', '#b49cff'];

  // Numeri all'italiana con decimali fissi, angoli in gradi, percentuali con l'articolo giusto.
  const fixed = (v, d) => v.toFixed(d).replace('.', ',');
  const degs = (rad, d) => EA.fmt(rad / DEG, d == null ? 1 : d) + '°';
  const pct = (x) => EA.fmt(x * 100, x < 0.1 || x > 0.9 ? 1 : 0) + '%';
  const thePct = (x) => { const s = pct(x); return (/^(8|11|1(,|%))/.test(s) ? 'l\'' : 'il ') + s; };

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

  // Prima stringa della lista (dalla più lunga alla più corta) che sta nella larghezza data.
  function fit(ctx, list, maxW, size, weight) {
    for (const s of list) if (textWidth(ctx, s, size, weight) <= maxW) return s;
    return list[list.length - 1];
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

  // Spezzata sottile senza alone, continua o tratteggiata.
  function stroke(ctx, pts, color, width, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.stroke();
    ctx.restore();
  }

  // Disegno con un'opacità in più (impulsi che si spengono, scritte che compaiono).
  function faded(ctx, a, fn) {
    ctx.save();
    ctx.globalAlpha *= a;
    fn();
    ctx.restore();
  }

  // Anello che si allarga attorno a un atomo o a uno ione che emette.
  function ring(ctx, x, y, r, color, al) {
    if (al <= 0) return;
    faded(ctx, Math.min(1, al), () => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    });
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

  // Cono di accettazione in aria: vertice al centro della faccia, semiapertura hw a distanza len.
  function cone(ctx, x, cy, len, hw, fill, line) {
    ctx.beginPath();
    ctx.moveTo(x, cy); ctx.lineTo(x - len, cy - hw); ctx.lineTo(x - len, cy + hw); ctx.closePath();
    ctx.fillStyle = EA.alpha(TINT, fill);
    ctx.fill();
    stroke(ctx, [[x - len, cy - hw], [x, cy], [x - len, cy + hw]], EA.alpha(TINT, line), 1, [3, 4]);
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

  // La stessa lunghezza arrotondata come la mostra fmtLen: i calcoli usano il valore scritto.
  const snapLen = (km) => (km < 1 ? Math.round(km * 1000) / 1000 : km < 10 ? Math.round(km * 10) / 10 : Math.round(km));

  /* ---------- animazione principale: dal laser all'oceano ---------- */

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
      const cy = nar ? hh * 0.4 : hh * 0.45;
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
      // sul telefono la scritta sta in alto, lontano dalle frecce della pompa
      EA.draw.text(ctx, 'mezzo attivo', mx0 + 16, nar ? cy - ch * 0.36 + 14 : cy + ch * 0.36 - 8, { color: EA.alpha(C.amber, 0.85), size: 10.5 });
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
          faded(ctx, 1 - k, () => EA.draw.arrow(ctx, x, cy + r + 22 - k * 6, x, cy + r + 5, C.amber, 1.4, 6));
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
          faded(ctx, (i === count - 1 ? n - (count - 1) : 1) * fade, () => packet(ctx, xc, cy + (i - (n - 1) / 2) * spc, len, lam, amp, TINT));
        }
      }

      // didascalie e legenda
      const lx = nar ? w / 2 : (mx0 + mx1) / 2;
      const capS = nar ? 10.5 : 11.5;
      const cap = fit(ctx, ['un fotone stimola un atomo eccitato: ne nasce un secondo identico', 'un fotone ne stimola un altro, identico'], 2 * (lx - g.pad), capS);
      EA.draw.text(ctx, cap, lx, bot + 20, { color: C.ink, size: capS, align: 'center' });
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
      const bw = nar ? w - 24 : 340;
      const bh = nar ? 100 : 120;
      const bx = nar ? 12 : w - 24 - bw;
      const by = hh - bh - (nar ? 12 : 18);
      box(ctx, bx, by, bw, bh, 10, EA.alpha('#060b0a', 0.88), C.grid);
      const x0 = bx + 14;
      const x1 = bx + bw - 14;
      const r1 = by + (nar ? 18 : 20);
      EA.draw.text(ctx, fit(ctx, ['LED: riga larga 30-50 nm (12-20 THz)', 'LED: riga larga 30-50 nm'], x1 - x0, 10.5), x0, r1, { color: C.amber, size: 10.5 });
      EA.draw.text(ctx, fit(ctx, ['laser: ≈ 1 MHz, 10 milioni di volte più stretta', 'laser: ≈ 1 MHz, milioni di volte più stretta', 'laser: ≈ 1 MHz'], x1 - x0, 10.5), x0, r1 + 15, { color: TINT, size: 10.5 });
      const base = by + bh - 20;
      const peakY = r1 + 26;
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
      stroke(ctx, [[x0, base + 0.5], [x1, base + 0.5]], C.grid, 1.2);
      EA.draw.line(ctx, [[mid, base], [mid, peakY]], TINT, 1.6);
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

      cone(ctx, fx0, cy, air, air * Math.tan(tmax), 0.07, 0.45);

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
        stroke(ctx, [hit, pointAt(lPts, lL, dL)], ge, 2);
        // la piccola parte riflessa (Fresnel: circa il 2%)
        const r2 = lMap(lost.pts[2]);
        stroke(ctx, [hit, [EA.lerp(hit[0], r2[0], 0.3), EA.lerp(hit[1], r2[1], 0.3)]], EA.alpha(C.orange, 0.35), 1, [2, 4]);
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
        faded(ctx, d > dHit ? 1 - (d - dHit) / (lL[3] - dHit) : 1, () => EA.draw.dot(ctx, q[0], q[1], nar ? 2 : 2.4, C.orange));
      }

      // angoli: incidenza dalla normale e direzione critica (tratteggio ambra)
      const la = EA.smooth((p - 0.45) / 0.4);
      ctx.save();
      ctx.globalAlpha *= la;
      const H1 = gPts[2];
      const thI = good.launch.inside;
      const rA = nar ? 22 : 34;
      const nrm = EA.alpha(C.text, 0.6);
      stroke(ctx, [[H1[0], H1[1] - (nar ? 12 : 18)], [H1[0], H1[1] + rA + 10]], nrm, 1, [3, 3]);
      stroke(ctx, [[hit[0], hit[1] + (nar ? 10 : 14)], [hit[0], hit[1] - rA * 0.75 - 8]], nrm, 1, [3, 3]);
      const rC = nar ? rA + 12 : rA + 30;
      const cEnd = [H1[0] - Math.sin(tc) * rC, H1[1] + Math.cos(tc) * rC];
      stroke(ctx, [H1, cEnd], EA.alpha(C.amber, 0.85), 1, [3, 3]);
      if (!nar) EA.draw.text(ctx, 'θc', cEnd[0] + 2, cEnd[1] + 14, { color: C.amber, size: 11, align: 'right' });
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
        // a destra della scritta arancione, oppure una riga sotto se non c'è posto
        const note = 'angoli veri per una fibra plastica · nel vetro θc ≈ 80°';
        const room = fx1 - g.pad - textWidth(ctx, 'fuori dal cono: θ < θc, in parte esce nel mantello', 11) - 24;
        EA.draw.text(ctx, note, fx1, textWidth(ctx, note, 11) <= room ? yBot : yBot + 18, { color: C.dim, size: 11, align: 'right' });
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
      stroke(ctx, [[xk, rowY(0) - 22], [xk, axisY]], EA.alpha(C.amber, 0.55), 1, [4, 4]);
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
        if (k1 > 0) faded(ctx, k1, () => {
          stroke(ctx, [[xm, y - rh / 2 - 5], [xm, y + rh / 2 + 5]], C.amber, 1.5);
          if (nar) EA.draw.text(ctx, '1%: ' + fmtLen(d1), x1, y - rh / 2 - 6, { color: C.amber, size: 10.5, align: 'right' });
          else {
            // a destra del segno, o a sinistra se vicino al bordo
            const txt = '1% dopo ' + fmtLen(d1);
            const left = xm + 6 + textWidth(ctx, txt, 11) > x1;
            EA.draw.text(ctx, txt, left ? xm - 6 : xm + 6, y - rh / 2 - 6, { color: C.amber, size: 11, align: left ? 'right' : 'left' });
          }
        });
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
        stroke(ctx, [[g.pad, axisY + 37.5], [g.pad + 16, axisY + 37.5]], EA.alpha(C.amber, 0.7), 1, [4, 4]);
        EA.draw.text(ctx, 'soglia di Kao e Hockham: 20 dB/km', g.pad + 22, axisY + 41, { color: C.amber, size: 10.5 });
        EA.draw.text(ctx, '20 dB = un centesimo della potenza', g.pad, axisY + 59, { color: C.dim, size: 10.5 });
      } else {
        // il titolo dell'asse non deve toccare la prima tacca ("10 cm")
        EA.draw.text(ctx, fit(ctx, ['distanza (scala logaritmica) →', 'distanza →'], x0 - g.pad - 30, 10.5), g.pad, axisY + 18, { color: C.dim, size: 10.5 });
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
        if (!nar) EA.draw.text(ctx, fixed(plan[k].f / 1e12, 1) + ' THz', xl, y - 10, { color: C.dim, size: 10.5 });
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
        const grid = fit(ctx, ['canali ogni 100 GHz (circa 0,8 nm) attorno a 193,1 THz', 'canali ogni 100 GHz (circa 0,8 nm)'], fx1 - mx - 12, 11);
        EA.draw.text(ctx, grid, (mx + fx1) / 2, cy + a + cl + 22, { color: C.dim, size: 11, align: 'center' });
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
      const A = WINDOWS[1550].alpha;
      const G = A * LINK.span;   // dB persi in una campata, e restituiti dall'EDFA
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
          faded(ctx, al, () => EA.draw.line(ctx, [[x - Lb * 0.28, y], [x + Lb * 0.28, y]], falseColor(c / (NC - 1)), 2.4));
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
      // la perdita della campata, con quanta luce resta, e il guadagno che la compensa
      faded(ctx, EA.smooth((p - 0.5) / 0.4), () => {
        const dB = '−' + EA.fmt(G, 0) + ' dB';
        const loss = LINK.span + ' km × ' + EA.fmt(A, 1) + ' dB/km = ' + dB;
        const left = fit(ctx, [loss + ': resta il ' + pct(fractionLeft(A, LINK.span)), loss, dB + ' in ' + LINK.span + ' km'], ea - fx0 - 12, ls);
        EA.draw.text(ctx, left, fx0 + 6, Y(-17), { color: C.text, size: ls });
        EA.draw.text(ctx, '+' + EA.fmt(G, 0) + ' dB', eb + (nar ? 5 : 8), Y(-8), { color: C.green, size: ls, weight: 700 });
      });
      EA.draw.text(ctx, '0 km', fx0, gy1 + 20, { color: C.text, size: 10.5 });
      EA.draw.text(ctx, fmtLen(LINK.span), xe, gy1 + 20, { color: C.text, size: 10.5, align: 'center' });
      EA.draw.text(ctx, fmtLen(2 * LINK.span), fx1, gy1 + 20, { color: C.text, size: 10.5, align: 'right' });

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
        EA.draw.text(ctx, 'schema non in scala: la fibra all\'erbio è lunga alcuni metri, ogni campata 80 km', g.pad, hh - 14, { color: C.dim, size: 11 });
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

      // impulso: parte con la fase dall'America, attraversa in 6 s e poi resta all'arrivo
      const uu = live ? EA.clamp((tau - 0.6) / 6, 0, 1) : 0.55;
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
      if (!nar) {
        // accanto al sottotitolo della fase, o una riga sotto se si toccherebbero
        const info = '6000 km · luce nel vetro a circa 204 000 km/s';
        const busy = 2 * g.pad + textWidth(ctx, STAGES[5].sub[0], 11) + textWidth(ctx, info, 11) + 24 > w;
        EA.draw.text(ctx, info, w - g.pad, g.top + (busy ? 32 : 16), { color: C.dim, size: 11, align: 'right' });
      }

      // scritte
      const ls = nar ? 10.5 : 11;
      // sopra le stazioni di approdo, senza toccarle
      EA.draw.text(ctx, 'AMERICA', g.pad, ys - 24, { color: C.text, size: ls, weight: 700 });
      EA.draw.text(ctx, 'EUROPA', w - g.pad, ys - 24, { color: C.text, size: ls, weight: 700, align: 'right' });
      if (!nar) {
        EA.draw.text(ctx, '≈ 6000 km di Atlantico', w / 2, ys - 18, { color: C.dim, size: 11, align: 'center' });
        EA.draw.text(ctx, 'amplificatori EDFA ogni 50-100 km circa, alimentati dal rame del cavo', w / 2, deep - 34, { color: C.green, size: 11, align: 'center' });
        EA.draw.text(ctx, 'TAT-8 (1988): 280 Mbit/s per coppia di fibre, con ripetitori elettronici', g.pad, hh - 34, { color: C.text, size: 11 });
        EA.draw.text(ctx, 'oggi: circa 20-25 Tbit/s per coppia, con amplificatori EDFA e DWDM', g.pad, hh - 16, { color: C.ink, size: 11 });
      } else {
        EA.draw.text(ctx, 'TAT-8 (1988): 280 Mbit/s per coppia', g.pad, hh - 28, { color: C.text, size: 10.5 });
        EA.draw.text(ctx, 'oggi: circa 20-25 Tbit/s per coppia', g.pad, hh - 12, { color: C.ink, size: 10.5 });
      }
      // sezione del cavo: sul telefono più stretta, per non coprire il cavo sui pendii
      const bw = nar ? 204 : 360;
      const bh = nar ? 72 : 104;
      const bx = w / 2 - bw / 2;
      const by = ys + (nar ? 12 : 22);
      box(ctx, bx, by, bw, bh, 10, EA.alpha('#060b0a', 0.88), C.grid);
      const r = nar ? 22 : 34;
      const ccx = bx + (nar ? 12 : 16) + r;
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
      const tx = ccx + r + (nar ? 10 : 14);
      const lines = nar
        ? [['fibre al centro', TINT], ['rame: alimentazione', C.orange], ['isolante esterno', C.text]]
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

  // Fibre di partenza: indici del nucleo e del mantello (per il getto: acqua e aria).
  const PRESETS = {
    vetro: { n1: 1.48, n2: 1.46, name: 'vetro a indice a gradino', core: 'nucleo', clad: 'mantello' },
    plastica: { n1: 1.49, n2: 1.4, name: 'plastica (PMMA)', core: 'nucleo', clad: 'mantello' },
    acqua: { n1: 1.333, n2: 1, name: 'acqua e aria, come Colladon', core: 'acqua', clad: 'aria' },
  };

  // Che cosa cambia con la finestra: testi dei comandi e banda dei canali (nm).
  const WIN_INFO = {
    850: { hint: 'α ≈ 3 dB/km su fibra multimodale, con piccoli laser economici (VCSEL): tratte brevi, come nei data center.', ch: 'Fibra multimodale: un solo canale.', band: [830, 870], wdm: '' },
    1310: { hint: 'α ≈ 0,35 dB/km su fibra monomodale; qui la dispersione, che allarga gli impulsi, è quasi nulla.', ch: 'CWDM nella banda O: canali ogni 20 nm, al massimo 5.', band: [1260, 1360], wdm: 'CWDM' },
    1550: { hint: 'α ≈ 0,2 dB/km: la perdita più bassa, e qui funzionano gli amplificatori all\'erbio.', ch: 'DWDM nella banda C: canali ogni 100 GHz (circa 0,8 nm), fino a 40.', band: [1530, 1565], wdm: 'DWDM' },
  };

  // Potenza (dBm) a distanza km lungo il profilo del bilancio.
  function profileAt(prof, km) {
    for (let i = 1; i < prof.length; i++) {
      const [x0, p0] = prof[i - 1];
      const [x1, p1] = prof[i];
      if (km <= x1 && x1 > x0) return p0 + ((p1 - p0) * (km - x0)) / (x1 - x0);
    }
    return prof[prof.length - 1][1];
  }

  // Passo "tondo" per le tacche di un asse: 1, 2 o 5 per una potenza di 10.
  function niceStep(span, n) {
    const raw = span / n;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }

  // Primo x, da sinistra a passi di 12 px, in cui un'etichetta larga w tra le quote y0 e y1
  // non incontra nessuno dei segmenti dati; null se non c'è posto.
  function freeSpot(segs, w, y0, y1, xMin, xMax) {
    const blocked = (x) => segs.some(([p, q]) => {
      const lo = Math.max(y0, Math.min(p[1], q[1]));
      const hi = Math.min(y1, Math.max(p[1], q[1]));
      if (lo > hi) return false;
      const xAt = (y) => (q[1] === p[1] ? p[0] : p[0] + ((y - p[1]) * (q[0] - p[0])) / (q[1] - p[1]));
      const xa = q[1] === p[1] ? Math.min(p[0], q[0]) : Math.min(xAt(lo), xAt(hi));
      const xb = q[1] === p[1] ? Math.max(p[0], q[0]) : Math.max(xAt(lo), xAt(hi));
      return xb > x - 8 && xa < x + w + 8;
    });
    for (let x = xMin; x + w <= xMax; x += 12) if (!blocked(x)) return x;
    return null;
  }

  function mountLab(parts, api) {
    const C = EA.colors;
    const h = EA.h;
    const ESC = C.orange;
    const st = { preset: 'vetro', n1: 1.48, n2: 1.46, theta: 10, win: 1550, L: 300, n: 16, edfa: true };
    let S = null;   // grandezze calcolate dal modello
    let G = null;   // geometria e percorsi in pixel

    parts.root.classList.add('fotonica-lab');
    const cv = api.canvas(parts.display, { class: 'ea-canvas fotonica-lab-canvas', label: 'In alto la fibra vista di fianco: dall\'aria arriva un raggio, dentro o fuori dal cono di accettazione, che nel nucleo resta guidato per riflessione totale oppure esce nel mantello; accanto, l\'ingrandimento del punto in cui tocca la parete, con la legge di Snell. In basso la potenza di un canale in dBm lungo il collegamento, con la soglia del ricevitore e gli amplificatori all\'erbio.' });

    /* comandi: la fibra e il raggio */
    const preset = EA.ui.segmented({
      label: 'Fibra', color: TINT,
      options: [
        { value: 'vetro', label: 'Vetro', title: 'n₁ = 1,48 · n₂ = 1,46' },
        { value: 'plastica', label: 'Plastica', title: 'n₁ = 1,49 · n₂ = 1,40' },
        { value: 'acqua', label: 'Getto d\'acqua', title: 'acqua (1,333) nell\'aria (1), come nell\'esperimento di Colladon' },
      ],
      value: st.preset,
      onchange: (v) => { st.preset = v; st.n1 = PRESETS[v].n1; st.n2 = PRESETS[v].n2; n1s.set(st.n1, true); n2s.set(st.n2, true); update(); },
    });
    const n1s = EA.ui.slider({
      label: 'Indice del nucleo n₁', min: 1.3, max: 1.7, step: 0.005, value: st.n1, color: TINT,
      format: (v) => fixed(v, 3),
      oninput: (v) => { st.n1 = v; matchPreset(); update(); },
    });
    const n2s = EA.ui.slider({
      label: 'Indice del mantello n₂', min: 1, max: 1.7, step: 0.005, value: st.n2, color: C.blue,
      format: (v) => fixed(v, 3),
      oninput: (v) => { st.n2 = v; matchPreset(); update(); },
    });
    const ang = EA.ui.slider({
      label: 'Angolo di lancio θ', min: 0, max: 60, step: 0.5, value: st.theta, color: TINT,
      format: (v) => EA.fmt(v, 1) + '°',
      hint: ' ',
      oninput: (v) => { st.theta = v; update(); },
    });
    function matchPreset() {
      const k = Object.keys(PRESETS).find((p) => Math.abs(PRESETS[p].n1 - st.n1) < 1e-6 && Math.abs(PRESETS[p].n2 - st.n2) < 1e-6);
      st.preset = k || null;
      preset.set(k || '', true);
    }

    /* comandi: il collegamento */
    const winHint = h('small', { class: 'ea-ctl-hint' });
    const win = EA.ui.segmented({
      label: 'Finestra', color: TINT,
      options: [{ value: 850, label: '850 nm' }, { value: 1310, label: '1310 nm' }, { value: 1550, label: '1550 nm' }],
      value: st.win,
      onchange: (v) => { st.win = v; update(); },
    });
    const len = EA.ui.slider({
      label: 'Lunghezza del collegamento', min: 0.1, max: 10000, log: true, value: st.L, color: TINT,
      format: fmtLen,
      oninput: (v) => { st.L = snapLen(v); update(); },
    });
    const chs = EA.ui.slider({
      label: 'Canali WDM', min: 1, max: 40, step: 1, value: st.n, color: C.violet,
      format: (v) => v + (v === 1 ? ' canale' : ' canali'),
      hint: ' ',
      oninput: (v) => { st.n = v; update(); },
    });
    const ampHint = h('small', { class: 'ea-ctl-hint' });
    const amp = EA.ui.toggle({ label: 'Amplificatori all\'erbio (EDFA)', checked: st.edfa, color: C.green, onchange: (v) => { st.edfa = v; update(); } });

    parts.controls.append(
      h('h3', { class: 'fotonica-group' }, '1 · La fibra e il raggio'),
      preset.el, n1s.el, n2s.el, ang.el,
      h('h3', { class: 'fotonica-group' }, '2 · Il collegamento'),
      h('div', { class: 'ea-ctl' }, win.el, winHint), len.el, chs.el,
      h('div', { class: 'ea-ctl' }, amp.el, ampHint));

    const roC = EA.ui.readout({ label: 'Angolo critico' });
    const roNA = EA.ui.readout({ label: 'Apertura numerica' });
    const roA = EA.ui.readout({ label: 'Cono di accettazione' });
    const roF = EA.ui.readout({ label: 'Frequenza della luce' });
    const roP = EA.ui.readout({ label: 'Potenza ricevuta' });
    const roI = EA.ui.readout({ label: 'Corrente del fotodiodo' });
    const roB = EA.ui.readout({ label: 'Capacità totale' });
    const roT = EA.ui.readout({ label: 'Ritardo' });
    parts.readouts.append(roC.el, roNA.el, roA.el, roF.el, roP.el, roI.el, roB.el, roT.el);

    // Il numero di canali dipende dalla finestra: il cursore si adatta.
    function syncChannels() {
      const max = WINDOWS[st.win].maxCh;
      chs.input.max = String(Math.max(2, max));
      chs.input.disabled = max === 1;
      chs.set(Math.min(st.n, max), true);
      if (max === 1) chs.input.style.setProperty('--fill', '0%');
      chs.el.querySelector('.ea-ctl-hint').textContent = WIN_INFO[st.win].ch;
      amp.input.disabled = !WINDOWS[st.win].edfa;
      ampHint.textContent = WINDOWS[st.win].edfa
        ? 'Si accendono solo se servono, uno ogni 80 km: ognuno restituisce 16 dB.'
        : 'L\'erbio amplifica solo attorno a 1550 nm (banda C): qui non si possono usare.';
      // energia dei fotoni (E = h·f) e materiale del fotodiodo che li riceve
      const E = photonEnergy(st.win);
      winHint.textContent = WIN_INFO[st.win].hint + ' Fotoni da ' + EA.fmt(E, 2) + ' eV: ' + (detector(st.win).name === 'silicio'
        ? 'li riceve un fotodiodo al silicio.'
        : 'il silicio non li assorbe (servono ' + EA.fmt(SI_GAP, 2) + ' eV), quindi il fotodiodo è in InGaAs.');
    }

    function update() {
      syncChannels();
      const Lr = launch(st.n1, st.n2, st.theta * DEG);
      const opts = { edfa: st.edfa };
      const b = budget(st.win, st.L, opts);
      const plan = channelPlan(st.win, st.n);
      const det = detector(st.win);
      S = {
        Lr, b, plan,
        amp: photocurrent(b.rx, responsivity(st.win, det.eta)),
        na: numericalAperture(st.n1, st.n2),
        tmax: acceptanceAngle(st.n1, st.n2),
        tc: criticalAngle(st.n1, st.n2),
        prof: budgetProfile(st.win, st.L, opts),
        cap: capacity(plan.length),
        lat: latency(st.L),
        modal: modalLimited(st.win, st.L),
      };
      G = null;
      if (b.amps.length >= 10) ampHint.textContent = 'Ognuno aggiunge anche un po\' di rumore: sui collegamenti lunghissimi è il rumore accumulato, più della potenza, a decidere fin dove si arriva.';

      const guide = st.n1 > st.n2;
      roC.set(guide ? degs(S.tc) : 'non esiste', guide ? null : 'bad');
      roNA.set(guide ? fixed(S.na, 3) : '0', guide ? null : 'bad');
      roA.set(guide ? '±' + degs(S.tmax) : 'nessuno', guide ? null : 'bad');
      roF.set(EA.si(frequency(st.win), 'Hz'));
      roP.set(EA.fmt(b.rx, 1) + ' dBm', b.status === 'sotto' ? 'bad' : b.status === 'margine' || S.modal ? 'warn' : 'good');
      roI.set(EA.si(S.amp, 'A'), b.status === 'sotto' ? 'bad' : null);
      roB.set(EA.si(S.cap, 'bit/s'));
      roT.set(EA.si(S.lat, 's'));
      ang.el.querySelector('.ea-ctl-hint').textContent = guide
        ? 'Misurato dall\'asse, in aria. Entra guidato solo dentro il cono di ±' + degs(S.tmax) + '.'
        : 'Misurato dall\'asse, in aria. Con n₂ ≥ n₁ non c\'è riflessione totale: nessun raggio inclinato resta nel nucleo.';
      api.invalidate();

      const amps = b.amps.length;
      const verdict = b.status === 'sotto' ? 'sotto la soglia del ricevitore' : b.status === 'margine' ? 'sopra la soglia ma con meno di 3 dB di margine' : 'sopra la soglia del ricevitore';
      api.announce('Angolo critico ' + (guide ? EA.fmt(S.tc / DEG, 1) + ' gradi' : 'inesistente') + ', apertura numerica ' + fixed(S.na, 3) +
        ': il raggio lanciato a ' + EA.fmt(st.theta, 1) + ' gradi ' + (Lr.guided ? 'resta guidato' : 'esce nel mantello') + '. ' +
        'Collegamento di ' + fmtLen(st.L) + ' a ' + st.win + ' nanometri' + (amps ? ' con ' + amps + (amps === 1 ? ' amplificatore' : ' amplificatori') : '') +
        ': arrivano ' + EA.fmt(b.rx, 1) + ' dBm, ' + verdict + (S.modal ? ', ma oltre 300 metri gli impulsi si confondono' : '') +
        '. Capacità ' + EA.si(S.cap, 'bit/s') + '.');
    }

    /* geometria e percorsi in pixel, da rifare solo quando cambiano stato o dimensioni */
    function layout() {
      const w = cv.w;
      const hh = cv.h;
      // pannelli uno sotto l'altro se il disegno è stretto o molto più alto che largo
      const nar = w < 640 || hh > w * 1.5;
      const pad = nar ? 10 : 16;
      const g = { w, hh, nar, pad };
      if (nar) {
        g.a = 22;
        g.cl = 16;
        g.fx0 = pad + 62;
        g.fx1 = w - pad;
        g.cy = 68 + g.cl + g.a;
        g.vY = g.cy + g.a + g.cl + 22;
        g.inset = { x: pad, y: g.vY + 30, w: w - 2 * pad, h: 136 };
        g.split = g.inset.y + g.inset.h + 18;
      } else {
        const iw = Math.round(EA.clamp(w * 0.29, 210, 270));
        g.split = Math.round(EA.clamp(hh * 0.47, 280, 360));
        g.a = Math.round(EA.clamp((g.split - 130) * 0.2, 24, 44));
        g.cl = Math.round(g.a * 0.72);
        g.fx0 = pad + Math.round(EA.clamp(w * 0.15, 96, 150));
        g.fx1 = w - pad - iw - 22;
        const block = 22 + 2 * (g.a + g.cl) + 48;
        g.cy = Math.round(36 + Math.max(0, (g.split - 48 - block) / 2) + 22 + g.cl + g.a);
        g.vY = g.cy + g.a + g.cl + 24;
        g.inset = { x: w - pad - iw, y: 10, w: iw, h: g.split - 22 };
      }
      g.plot = { x0: pad + (nar ? 30 : 50), x1: w - pad - (nar ? 6 : 12), y0: g.split + (nar ? 66 : 64), y1: hh - (nar ? 48 : 52) };

      // raggio: dall'aria al centro della faccia, poi a zig-zag nel nucleo
      const th = st.theta * DEG;
      const tr = trace(st.n1, st.n2, th, (g.fx1 - g.fx0) / g.a, 0);
      const map = (q) => [g.fx0 + q[0] * g.a, g.cy - q[1] * g.a];
      const reach = g.a + g.cl - 12;
      const airLen = Math.min(g.fx0 - pad - 6, th > 0.01 ? reach / Math.sin(th) : Infinity);
      g.main = [[g.fx0 - airLen * Math.cos(th), g.cy + airLen * Math.sin(th)]].concat(Array.from(tr.pts, map));
      g.power = [1].concat(Array.from(tr.power));
      g.Lm = polyLengths(g.main);
      g.hit = tr.pts.length > 2 ? g.main[2] : null;
      // luce che esce nel mantello: rifratta con la legge di Snell, fino al bordo esterno
      g.esc = Array.from(tr.escapes, (e, j) => {
        const p0 = map([e.x, e.y]);
        const out = e.y > 0 ? -1 : 1;
        const an = Number.isNaN(e.angle) ? Math.PI / 2 : e.angle;
        const l = Math.min((g.cl + 8) / Math.max(1e-3, Math.cos(an)), (g.fx1 + 6 - p0[0]) / Math.max(1e-3, Math.sin(an)));
        const p1 = [p0[0] + Math.sin(an) * l, p0[1] + out * Math.cos(an) * l];
        return { p0, p1, len: Math.max(0, l), power: e.power, d0: g.Lm[j + 2] };
      });

      // nomi e indici dei materiali, in basso: nel primo posto che il raggio lascia libero
      const P0 = PRESETS[st.preset];
      const ls = nar ? 10.5 : 11;
      const segs = [];
      for (let i = 0; i < g.main.length - 1 && g.power[i] >= 1e-3; i++) segs.push([g.main[i], g.main[i + 1], g.power[i]]);
      g.esc.forEach((e) => { if (e.power >= 0.004 && e.len >= 2) segs.push([e.p0, e.p1, e.power]); });
      const bright = segs.filter((sg) => sg[2] >= 0.3);
      // prima il nome intero, poi solo l'indice; se non basta, si coprono solo i tratti più deboli
      const place = (txt, short, y, color) => {
        for (const [str, list] of [[txt, segs], [short, segs], [txt, bright], [short, bright]]) {
          const x = freeSpot(list, textWidth(cv.ctx, str, ls), y - ls, y + 5, g.fx0 + 8, g.fx1 - 8);
          if (x != null) return { txt: str, x, y, color };
        }
        return { txt: short, x: g.fx0 + 8, y, color };
      };
      g.labels = [
        place((P0 ? P0.core : 'nucleo') + ' · n₁ = ' + fixed(st.n1, 3), 'n₁ = ' + fixed(st.n1, 3), g.cy + g.a - 7, C.text),
        place((P0 ? P0.clad : 'mantello') + ' · n₂ = ' + fixed(st.n2, 3), 'n₂ = ' + fixed(st.n2, 3), g.cy + g.a + g.cl / 2 + 4, EA.alpha(C.blue, 0.95)),
      ];
      return g;
    }

    /* 1 · il raggio nella fibra */
    function drawFiber(ctx, g, t) {
      const nar = g.nar;
      const ls = nar ? 10.5 : 11;
      const P = PRESETS[st.preset];
      const Lr = S.Lr;
      const guide = st.n1 > st.n2;
      const col = Lr.guided ? TINT : ESC;

      EA.draw.text(ctx, '1 · IL RAGGIO NELLA FIBRA', g.pad, nar ? 18 : 24, { color: C.ink, size: nar ? 11 : 11.5, weight: 700 });
      const name = (P ? P.name : 'indici scelti da te') + ' · angoli veri';
      if (nar) EA.draw.text(ctx, name, g.pad, 34, { color: C.dim, size: 10.5 });
      else EA.draw.text(ctx, name, g.fx1, 24, { color: C.dim, size: 11, align: 'right' });

      // cono di accettazione e asse, in aria
      const top = g.cy - g.a - g.cl - 4;
      const bot = g.cy + g.a + g.cl + 4;
      ctx.save();
      ctx.beginPath(); ctx.rect(g.pad, top, g.fx0 - g.pad, bot - top); ctx.clip();
      if (guide) cone(ctx, g.fx0, g.cy, 2000, S.tmax > 1.56 ? 80000 : 2000 * Math.tan(S.tmax), 0.08, 0.5);
      stroke(ctx, [[g.pad, g.cy + 0.5], [g.fx0, g.cy + 0.5]], EA.alpha(C.text, 0.35), 1, [2, 5]);
      ctx.restore();
      EA.draw.text(ctx, guide ? (nar ? 'cono ±' : 'cono di accettazione ±') + degs(S.tmax) : 'nessun cono', g.pad, top - 8, { color: guide ? TINT : ESC, size: ls });

      fiberBand(ctx, g.fx0, g.fx1, g.cy, g.a, g.cl, { face: true });

      // raggio: la luce rimasta dopo ogni urto decide l'opacità del tratto
      for (let i = 0; i < g.main.length - 1; i++) {
        const p = g.power[i];
        if (p < 1e-3) break;
        faded(ctx, Math.max(0.16, Math.min(1, p)), () => EA.draw.line(ctx, [g.main[i], g.main[i + 1]], col, 2));
      }
      g.esc.forEach((e) => {
        if (e.power < 0.004 || e.len < 2) return;
        const gr = ctx.createLinearGradient(e.p0[0], e.p0[1], e.p1[0], e.p1[1]);
        gr.addColorStop(0, EA.alpha(ESC, Math.min(1, 0.3 + e.power)));
        gr.addColorStop(1, EA.alpha(ESC, 0));
        stroke(ctx, [e.p0, e.p1], gr, 2);
      });
      if (g.hit) ring(ctx, g.hit[0], g.hit[1], 7, C.amber, 0.9);

      // impulsi di luce lungo il raggio e, dopo ogni urto, nel mantello
      const sp = nar ? 56 : 74;
      const v = nar ? 46 : 62;
      const total = g.Lm[g.Lm.length - 1];
      const ph = (((v * t) % sp) + sp) % sp;
      let dMax = total;
      g.esc.forEach((e) => { dMax = Math.max(dMax, e.d0 + e.len); });
      for (let d = ph; d < dMax; d += sp) {
        if (d < total) {
          const q = pointAt(g.main, g.Lm, d);
          const p = g.power[q[2]];
          if (p > 0.01) faded(ctx, Math.max(0.25, Math.min(1, p)), () => EA.draw.dot(ctx, q[0], q[1], nar ? 2.2 : 2.6, col));
        }
        g.esc.forEach((e) => {
          const u = (d - e.d0) / (e.len || 1);
          if (u <= 0 || u >= 1 || e.power < 0.02) return;
          faded(ctx, e.power * (1 - u), () => EA.draw.dot(ctx, EA.lerp(e.p0[0], e.p1[0], u), EA.lerp(e.p0[1], e.p1[1], u), nar ? 2 : 2.4, ESC));
        });
      }

      // nomi e indici dei materiali, dove il raggio non passa
      g.labels.forEach((lb) => tag(ctx, lb.txt, lb.x, lb.y, { color: lb.color, size: ls }));

      // angolo di lancio, in aria: sotto l'inizio del raggio, che da lì sale verso la faccia
      const a0 = g.main[0];
      const thTxt = 'θ = ' + EA.fmt(st.theta, 1) + '°';
      const thX = Math.max(g.pad, Math.min(a0[0] + 2, g.fx0 - 6 - textWidth(ctx, thTxt, ls)));
      tag(ctx, thTxt, thX, a0[1] + 17, { color: col, size: ls });

      // esito
      const inc = degs(Lr.incidence);
      const maxW = (nar ? g.w - g.pad : g.fx1) - g.pad;
      let l1;
      let l2;
      if (!guide) {
        l1 = ['Nessuna guida: n₂ ≥ n₁, quindi non esiste un angolo critico', 'Nessuna guida: n₂ ≥ n₁'];
        l2 = Lr.inside < 1e-4
          ? ['lungo l\'asse non tocca la parete, ma ogni raggio inclinato esce', 'ogni raggio inclinato esce']
          : ['a ogni urto esce nel mantello ' + thePct(1 - Lr.R) + ' della luce rimasta', 'a ogni urto esce ' + thePct(1 - Lr.R)];
      } else if (Lr.inside < 1e-4) {
        l1 = ['Guidato: corre lungo l\'asse senza toccare la parete', 'Guidato: corre lungo l\'asse'];
        l2 = ['restano nel nucleo anche i raggi inclinati fino a ±' + degs(S.tmax), 'resta nel nucleo fino a ±' + degs(S.tmax)];
      } else if (Lr.guided) {
        l1 = ['Guidato: tocca la parete a ' + inc + ' dalla normale, più di θc = ' + degs(S.tc), 'Guidato: ' + inc + ' > θc = ' + degs(S.tc)];
        l2 = ['riflessione totale: a ogni rimbalzo torna nel nucleo il 100% della luce', 'riflessione totale: torna tutta la luce', 'riflessione totale'];
      } else {
        l1 = ['Perso: tocca la parete a ' + inc + ' dalla normale, meno di θc = ' + degs(S.tc), 'Perso: ' + inc + ' < θc = ' + degs(S.tc)];
        l2 = ['a ogni urto esce nel mantello ' + thePct(1 - Lr.R) + ' della luce rimasta', 'a ogni urto esce ' + thePct(1 - Lr.R) + ' della luce'];
      }
      EA.draw.text(ctx, fit(ctx, l1, maxW, ls, 700), g.pad, g.vY, { color: col, size: ls, weight: 700 });
      EA.draw.text(ctx, fit(ctx, l2, maxW, ls), g.pad, g.vY + 16, { color: C.text, size: ls });
    }

    /* ingrandimento della parete: la legge di Snell con i numeri */
    function drawSnell(ctx, g) {
      const R = g.inset;
      const nar = g.nar;
      const Lr = S.Lr;
      const ls = nar ? 10.5 : 11;
      box(ctx, R.x, R.y, R.w, R.h, 10, EA.alpha('#060b0a', 0.88), C.grid);
      EA.draw.text(ctx, 'ALLA PARETE · LEGGE DI SNELL', R.x + 12, R.y + 18, { color: C.dim, size: 10.5, weight: 700 });

      // disegno: parete orizzontale, mantello sopra, nucleo sotto
      const dw = nar ? 138 : R.w - 24;
      const dx = R.x + 12;
      const dy = R.y + (nar ? 28 : 30);
      const dh = nar ? R.h - 40 : Math.round((R.h - 30) * 0.58);
      const ox = dx + dw / 2;
      const oy = dy + dh / 2;
      const r = Math.min(dw * 0.44, dh * 0.46);
      ctx.fillStyle = EA.alpha(C.blue, 0.1);
      ctx.fillRect(dx, dy, dw, oy - dy);
      ctx.fillStyle = EA.alpha(TINT, 0.06);
      ctx.fillRect(dx, oy, dw, dy + dh - oy);
      ctx.strokeStyle = EA.alpha(TINT, 0.45);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(dx, oy + 0.5); ctx.lineTo(dx + dw, oy + 0.5); ctx.stroke();
      EA.draw.text(ctx, 'n₂', dx + 6, dy + 14, { color: EA.alpha(C.blue, 0.95), size: 10.5 });
      EA.draw.text(ctx, 'n₁', dx + 6, dy + dh - 6, { color: C.text, size: 10.5 });
      stroke(ctx, [[ox, dy + 4], [ox, dy + dh - 4]], EA.alpha(C.text, 0.5), 1, [3, 3]);

      const t1 = Lr.incidence;
      const dir = (an) => [Math.sin(an), Math.cos(an)];
      // direzione critica, dal lato del raggio che arriva
      if (st.n1 > st.n2) {
        const dc = dir(S.tc);
        stroke(ctx, [[ox, oy], [ox - dc[0] * r, oy + dc[1] * r]], EA.alpha(C.amber, 0.9), 1, [4, 3]);
        if (!nar) EA.draw.text(ctx, 'θc', ox - dc[0] * r - 2, oy + dc[1] * r + 14, { color: C.amber, size: 10.5, align: 'left' });
      }
      // raggio che arriva, riflesso (tenue se in gran parte esce) e rifratto
      const di = dir(t1);
      const col = Lr.guided ? TINT : ESC;
      faded(ctx, Math.max(0.18, Lr.guided ? 1 : Lr.R), () => EA.draw.line(ctx, [[ox, oy], [ox + di[0] * r, oy + di[1] * r]], col, 1.8));
      EA.draw.line(ctx, [[ox - di[0] * r, oy + di[1] * r], [ox, oy]], col, 2);
      EA.draw.arrow(ctx, ox - di[0] * r * 0.55, oy + di[1] * r * 0.55, ox - di[0] * r * 0.4, oy + di[1] * r * 0.4, col, 1.6, 7);
      const t2 = Lr.refracted;
      if (!Lr.guided && !Number.isNaN(t2)) {
        faded(ctx, Math.min(1, 0.3 + (1 - Lr.R)), () => EA.draw.line(ctx, [[ox, oy], [ox + Math.sin(t2) * r, oy - Math.cos(t2) * r]], ESC, 2));
      }
      // archi degli angoli, misurati dalla normale
      const r1 = r * 0.38;
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.arc(ox, oy, r1, Math.PI / 2, Math.PI / 2 + t1); ctx.stroke();
      const m1 = Math.PI / 2 + t1 / 2;
      tag(ctx, 'θ₁', ox + Math.cos(m1) * (r1 + 11), oy + Math.sin(m1) * (r1 + 11) + 4, { color: col, size: 10.5, align: 'center' });
      if (!Lr.guided && !Number.isNaN(t2)) {
        const r2 = r * 0.3;
        ctx.strokeStyle = ESC;
        ctx.beginPath(); ctx.arc(ox, oy, r2, -Math.PI / 2, t2 - Math.PI / 2); ctx.stroke();
        const m2 = t2 / 2 - Math.PI / 2;
        tag(ctx, 'θ₂', ox + Math.cos(m2) * (r2 + 11), oy + Math.sin(m2) * (r2 + 11) + 4, { color: ESC, size: 10.5, align: 'center' });
      }

      // la legge di Snell con i numeri: n₁·sin θ₁ deve valere n₂·sin θ₂, e un seno non supera 1;
      // righe lunghe se c'è posto nel riquadro, altrimenti quelle corte
      const lhs = st.n1 * Math.sin(t1);
      const n1s = fixed(st.n1, 3) + ' · sin ' + degs(t1);
      const wide = Lr.guided
        ? [[n1s + ' = ' + fixed(lhs, 3), C.text, 600], [fixed(lhs, 3) + ' > n₂ = ' + fixed(st.n2, 3) + ': per avere', C.text, 600],
          ['θ₂ servirebbe un seno oltre 1', C.text, 600], ['riflessione totale: torna il 100%', TINT, 700]]
        : [[n1s + ' = ' + fixed(lhs, 3), C.text, 600], ['θ₂ = arcsin(' + fixed(lhs, 3) + ' / ' + fixed(st.n2, 3) + ')', C.text, 600],
          ['θ₂ = ' + degs(t2) + ': il raggio esce', ESC, 700], ['riflesso ' + pct(Lr.R) + ', esce ' + pct(1 - Lr.R), C.dim, 600]];
      const short = Lr.guided
        ? [[n1s, C.text, 600], ['= ' + fixed(lhs, 3) + ' > n₂ = ' + fixed(st.n2, 3), C.text, 600], ['nessun θ₂ possibile:', C.text, 600], ['riflessione totale', TINT, 700]]
        : [[n1s, C.text, 600], ['= ' + fixed(lhs, 3) + ' = n₂ sin θ₂', C.text, 600], ['θ₂ = ' + degs(t2) + ': esce', ESC, 700], ['riflesso solo ' + pct(Lr.R), C.dim, 600]];
      const roomy = !nar && wide.every(([str, , wt]) => textWidth(ctx, str, ls, wt) <= R.w - 24);
      const tx = nar ? dx + dw + 12 : R.x + 12;
      const ty = nar ? R.y + 42 : dy + dh + 20;
      [['n₁ sin θ₁ = n₂ sin θ₂', C.dim, 600]].concat(roomy ? wide : short)
        .forEach(([str, c, wt], k) => EA.draw.text(ctx, str, tx, ty + k * 18, { color: c, size: ls, weight: wt }));
    }

    /* 2 · potenza lungo il collegamento */
    function drawBudget(ctx, g, t, live) {
      const nar = g.nar;
      const ls = nar ? 10.5 : 11;
      const P = g.plot;
      const b = S.b;
      const k = b.link;
      const TOP = 5;
      const BOT = -40;
      const X = (km) => P.x0 + (km / st.L) * (P.x1 - P.x0);
      const Y = (dbm) => P.y0 + ((TOP - dbm) / (TOP - BOT)) * (P.y1 - P.y0);

      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, g.split + 0.5); ctx.lineTo(g.w, g.split + 0.5); ctx.stroke();

      // intestazione: titolo, canali, ipotesi ed esito
      const y1 = g.split + (nar ? 20 : 24);
      const y2 = y1 + 16;
      const title = nar ? '2 · POTENZA PER CANALE' : '2 · POTENZA DI OGNI CANALE LUNGO IL COLLEGAMENTO';
      EA.draw.text(ctx, title, g.pad, y1, { color: C.ink, size: nar ? 11 : 11.5, weight: 700 });
      const info = WIN_INFO[st.win];
      const sw = nar ? 92 : Math.round(EA.clamp(g.w * 0.2, 120, 200));
      const sx = g.w - g.pad - sw;
      const sy = nar ? y2 + 6 : y1 - 10;
      const nc = S.plan.length;
      const cn = nc + (nc === 1 ? ' canale' : ' canali');
      const chRoom = nar ? sx - 8 - g.pad : sx - 8 - (g.pad + textWidth(ctx, title, 11.5, 700) + 18);
      const chLabel = fit(ctx, [cn + (info.wdm && nc > 1 ? ' ' + info.wdm : '') + ' × 10 Gbit/s', cn + ' × 10 Gbit/s', cn], chRoom, ls);
      EA.draw.text(ctx, chLabel, sx - 8, sy + 10, { color: C.text, size: ls, align: 'right' });
      box(ctx, sx, sy, sw, 12, 3, '#070d0c', EA.alpha(C.violet, 0.35));
      const [b0, b1] = info.band;
      S.plan.slice().sort((p, q) => p.nm - q.nm).forEach((c, i) => {
        const x = sx + 3 + ((c.nm - b0) / (b1 - b0)) * (sw - 6);
        const cc = nc === 1 ? TINT : falseColor(1 - i / (nc - 1));
        ctx.fillStyle = cc;
        ctx.fillRect(Math.round(x) - 0.75, sy + 2, 1.5, 8);
      });
      if (!nar) {
        EA.draw.text(ctx, b0 + '–' + b1 + ' nm', sx + sw, sy + 26, { color: C.dim, size: 10.5, align: 'right' });
      }
      const hyp = [
        'fibra ' + WINDOWS[st.win].fiber + ' a ' + st.win + ' nm · α = ' + EA.fmt(b.alpha, 2) + ' dB/km · lancio ' + EA.fmt(k.p0, 0) + ' dBm · ' + k.connectors + ' connettori da ' + EA.fmt(k.connector, 1) + ' dB',
        st.win + ' nm · α = ' + EA.fmt(b.alpha, 2) + ' dB/km · lancio ' + EA.fmt(k.p0, 0) + ' dBm',
        st.win + ' nm · ' + EA.fmt(b.alpha, 2) + ' dB/km',
      ];
      EA.draw.text(ctx, fit(ctx, hyp, g.w - 2 * g.pad - (nar ? 0 : 130), ls), g.pad, y2, { color: C.dim, size: ls });

      // reticolo e scala in dBm
      ctx.lineWidth = 1;
      for (let lv = 0; lv >= BOT; lv -= 10) {
        const y = Math.round(Y(lv)) + 0.5;
        ctx.strokeStyle = lv === 0 ? C.grid : C.grid2;
        ctx.beginPath(); ctx.moveTo(P.x0, y); ctx.lineTo(P.x1, y); ctx.stroke();
        EA.draw.text(ctx, EA.fmt(lv, 0) + (nar || lv !== 0 ? '' : ' dBm'), P.x0 - 6, y + 4, { color: C.dim, size: 10.5, align: 'right' });
      }
      const step = niceStep(st.L, nar ? 3 : 6);
      for (let x = 0; x <= st.L + 1e-9; x += step) {
        const xx = Math.round(X(x)) + 0.5;
        ctx.strokeStyle = C.grid2;
        ctx.beginPath(); ctx.moveTo(xx, P.y0); ctx.lineTo(xx, P.y1); ctx.stroke();
        const lastGap = X(st.L) - X(x);
        if (x > 0 && lastGap < (nar ? 46 : 60)) continue;
        EA.draw.text(ctx, x === 0 ? '0' : fmtLen(x), xx, P.y1 + 16, { color: C.text, size: 10.5, align: x === 0 ? 'left' : 'center' });
      }
      EA.draw.text(ctx, fmtLen(st.L), P.x1, P.y1 + 16, { color: C.ink, size: 10.5, weight: 700, align: 'right' });

      // soglia del ricevitore e margine
      ctx.fillStyle = EA.alpha(C.amber, 0.1);
      ctx.fillRect(P.x0, Y(k.sens + k.margin), P.x1 - P.x0, Y(k.sens) - Y(k.sens + k.margin));
      const ys = Math.round(Y(k.sens)) + 0.5;
      stroke(ctx, [[P.x0, ys], [P.x1, ys]], EA.alpha(C.red, 0.9), 1, [6, 4]);
      const sensTxt = fit(ctx, ['soglia del ricevitore ' + EA.fmt(k.sens, 0) + ' dBm (fotodiodo a valanga, 10 Gbit/s)', 'soglia del ricevitore ' + EA.fmt(k.sens, 0) + ' dBm', 'soglia ' + EA.fmt(k.sens, 0) + ' dBm'], (P.x1 - P.x0) * 0.62, 10.5);
      EA.draw.text(ctx, sensTxt, P.x0 + 6, Y(k.sens) + 14, { color: C.red, size: 10.5 });
      if (!nar) EA.draw.text(ctx, 'margine di ' + EA.fmt(k.margin, 0) + ' dB', P.x0 + 6, Y(k.sens + k.margin) - 4, { color: EA.alpha(C.amber, 0.9), size: 10.5 });

      // a 850 nm: oltre circa 300 m la dispersione modale confonde gli impulsi
      if (S.modal) {
        const xm = X(WINDOWS[st.win].modalKm);
        ctx.save();
        ctx.beginPath(); ctx.rect(xm, P.y0, P.x1 - xm, P.y1 - P.y0); ctx.clip();
        ctx.strokeStyle = EA.alpha(C.amber, 0.16);
        ctx.lineWidth = 6;
        ctx.beginPath();
        for (let x = xm - (P.y1 - P.y0); x < P.x1; x += 18) { ctx.moveTo(x, P.y1); ctx.lineTo(x + (P.y1 - P.y0), P.y0); }
        ctx.stroke();
        ctx.restore();
        stroke(ctx, [[Math.round(xm) + 0.5, P.y0], [Math.round(xm) + 0.5, P.y1]], EA.alpha(C.amber, 0.7));
        const mt = fit(ctx, ['oltre circa 300 m a 10 Gbit/s: dispersione modale', 'oltre 300 m: dispersione modale', 'dispersione modale', 'dispersione'], P.x1 - xm - 12, 10.5, 700);
        tag(ctx, mt, P.x1 - 6, Y(-20) + 4, { color: C.amber, size: 10.5, weight: 700, align: 'right' });
      }

      // profilo della potenza: chiaro sopra la soglia con margine, ambra nel margine, rosso sotto;
      // quello che scende sotto il grafico lo taglia il ritaglio, così la pendenza resta quella vera
      const pts = S.prof.map(([km, p]) => [X(km), Y(p)]);
      ctx.save();
      ctx.beginPath(); ctx.rect(P.x0 - 4, P.y0 - 6, P.x1 - P.x0 + 8, P.y1 - P.y0 + 6); ctx.clip();
      [[P.y0 - 6, Y(k.sens + k.margin), TINT], [Y(k.sens + k.margin), Y(k.sens), C.amber], [Y(k.sens), P.y1 + 20, C.red]].forEach(([ya, yb, c]) => {
        ctx.save();
        ctx.beginPath(); ctx.rect(P.x0 - 4, ya, P.x1 - P.x0 + 8, yb - ya); ctx.clip();
        EA.draw.line(ctx, pts, c, 2);
        ctx.restore();
      });
      // guadagno degli amplificatori: salti verdi
      b.amps.forEach((xa) => {
        const x = X(xa);
        EA.draw.line(ctx, [[x, Y(k.p0 - k.connector - b.gain)], [x, Y(k.p0 - k.connector)]], C.green, 2, b.amps.length < 30);
      });
      ctx.restore();
      // simbolo dell'amplificatore sopra ogni salto (solo il primo se sono fitti)
      const yAmp = Y(k.p0 - k.connector) - 8;
      const dense = (P.x1 - P.x0) / (b.amps.length + 1) < 34;
      if (b.amps.length && !dense) {
        b.amps.forEach((xa) => {
          const x = X(xa);
          ctx.beginPath();
          ctx.moveTo(x - 6, yAmp - 9); ctx.lineTo(x - 6, yAmp + 1); ctx.lineTo(x + 5, yAmp - 4); ctx.closePath();
          ctx.fillStyle = EA.alpha(C.green, 0.85);
          ctx.fill();
        });
      }

      // trasmettitore e ricevitore
      const txTxt = nar ? 'laser' : 'laser ' + EA.fmt(k.p0, 0) + ' dBm';
      EA.draw.text(ctx, txTxt, P.x0 + 4, Y(k.p0) - 7, { color: TINT, size: 10.5 });
      if (b.amps.length && !dense && X(b.amps[0]) - 14 > P.x0 + 12 + textWidth(ctx, txTxt, 10.5)) {
        EA.draw.text(ctx, 'EDFA', X(b.amps[0]), yAmp - 14, { color: C.green, size: 10.5, align: 'center' });
      }
      const rxY = Y(Math.max(BOT, b.rx));
      const rxCol = b.status === 'sotto' ? C.red : b.status === 'margine' || S.modal ? C.amber : TINT;
      EA.draw.dot(ctx, P.x1, rxY, 3.5, rxCol);
      const mw = dbmToMw(b.rx);
      const rxTxt = b.rx < BOT ? '↓ ' + EA.fmt(b.rx, 0) + ' dBm' : EA.fmt(b.rx, 1) + ' dBm' + (nar ? '' : ' = ' + EA.si(mw * 1e-3, 'W', 2));
      // il profilo arriva sempre scendendo: l'etichetta va sotto il punto, se c'è posto
      const below = rxY + 24 < P.y1;
      tag(ctx, rxTxt, P.x1 - 8, below ? rxY + 20 : rxY - 10, { color: rxCol, size: ls, weight: 700, align: 'right' });

      // impulso che percorre il collegamento: la luminosità segue la potenza in dB
      if (live) {
        const u = ((t * 0.22) % 1.25) / 1.1;
        if (u <= 1) {
          const km = u * st.L;
          const p = profileAt(S.prof, km);
          if (p > BOT) faded(ctx, 0.3 + 0.7 * EA.clamp((p + 30) / 30, 0, 1), () => EA.draw.dot(ctx, X(km), Y(p), 3.6, TINT));
        }
      }

      // esito, sotto il grafico
      let verdict;
      let vc;
      const over = b.rx - k.sens;
      const n = b.amps.length;
      const ampTxt = n ? ', con ' + n + ' EDFA da +' + EA.fmt(b.gain, 0) + ' dB' : '';
      const ampShort = n ? ' · ' + n + ' EDFA' : '';
      if (b.status === 'sotto') {
        const why = !WINDOWS[st.win].edfa ? ' (a ' + st.win + ' nm l\'erbio non amplifica)' : !st.edfa ? ' (prova ad accendere gli amplificatori)' : '';
        verdict = ['Non arriva: ' + EA.fmt(-over, 1) + ' dB sotto la soglia' + why, 'Non arriva: ' + EA.fmt(-over, 1) + ' dB sotto la soglia', 'Sotto soglia di ' + EA.fmt(-over, 1) + ' dB'];
        vc = C.red;
      } else if (S.modal) {
        verdict = ['La potenza basta, ma oltre circa 300 m a 10 Gbit/s gli impulsi si confondono: è la dispersione modale', 'Potenza sufficiente, ma impulsi confusi oltre 300 m', 'Impulsi confusi oltre 300 m'];
        vc = C.amber;
      } else if (b.status === 'margine') {
        verdict = ['Arriva, ma solo ' + EA.fmt(over, 1) + ' dB sopra la soglia: margine insufficiente' + ampTxt, 'Al limite: ' + EA.fmt(over, 1) + ' dB sopra la soglia' + ampShort];
        vc = C.amber;
      } else {
        verdict = ['Arriva ' + EA.fmt(over, 1) + ' dB sopra la soglia del ricevitore' + ampTxt, EA.fmt(over, 1) + ' dB sopra la soglia' + ampShort];
        vc = C.green;
      }
      EA.draw.text(ctx, fit(ctx, verdict, g.w - 2 * g.pad, ls, 700), g.pad, g.hh - (nar ? 10 : 14), { color: vc, size: ls, weight: 700 });
    }

    function draw(t) {
      if (!cv.w || !S) return;
      if (!G || G.w !== cv.w || G.hh !== cv.h) G = layout();
      const ctx = cv.ctx;
      EA.draw.clear(cv);
      drawFiber(ctx, G, t);
      drawSnell(ctx, G);
      drawBudget(ctx, G, t, loop.playing);
    }

    const loop = api.loop(draw);
    update();
  }

  /* ---------- contenuti ---------- */

  EA.register({
    id: 'fotonica',
    intro: [
      'Quando apri una pagina web, i dati fanno quasi sempre gran parte del viaggio dentro un filo di vetro spesso un ottavo di millimetro. Non sono elettroni in un cavo di rame ma <strong>impulsi di luce infrarossa</strong>, accesi e spenti miliardi di volte al secondo da un laser e guidati da una <em>fibra ottica</em> per decine, centinaia o migliaia di chilometri; all\'arrivo un fotodiodo li ritrasforma in corrente elettrica.',
      'Per tenere la luce dentro il vetro basta la <strong>riflessione totale interna</strong>, che Colladon mostrò già nel 1841 con un getto d\'acqua: il nucleo della fibra ha un indice di rifrazione appena più alto del mantello che lo avvolge, e la luce che arriva abbastanza di striscio sulla superficie di separazione viene riflessa tutta, senza perdite. Il resto lo fa la purezza del vetro: a 1550 nm una fibra di oggi perde circa 0,2 dB per chilometro, così dopo 100 km arriva ancora l\'1% della luce.',
      'Poi entrano in gioco due idee che hanno moltiplicato la capacità. Decine di laser con lunghezze d\'onda diverse, cioè di «colori» diversi, condividono la stessa fibra senza mescolarsi (<abbr title="Wavelength Division Multiplexing, multiplazione a divisione di lunghezza d\'onda">WDM</abbr>), e amplificatori fatti di fibra drogata con erbio ridanno forza a tutti i canali insieme, senza trasformare la luce in elettricità. È così che i cavi posati sul fondo degli oceani portano quasi tutto il traffico dati tra i continenti.',
    ],
    steps: [
      { title: 'Il laser: fotoni gemelli', text: 'La pompa porta molti atomi del mezzo attivo in uno stato eccitato. Un fotone che ne incontra uno gli fa emettere un fotone identico: stessa frequenza, stessa fase, stessa direzione. Tra due specchi la valanga cresce e dallo specchio semiriflettente esce un fascio coerente e quasi monocromatico.', focus: 'laser' },
      { title: 'Intrappolata nel nucleo', text: 'Il nucleo ha un indice di rifrazione n₁ un po\' più alto di quello del mantello, n₂. Se il raggio colpisce la parete con un angolo dalla normale maggiore dell\'angolo critico, viene riflesso tutto. Restano guidati solo i raggi che entrano nel cono di accettazione: gli altri a ogni rimbalzo escono in parte nel mantello e presto si perdono.', focus: 'tir' },
      { title: 'Vetro purissimo', text: 'In un vetro da finestra la luce scende all\'1% in circa un metro (è una stima), nei migliori vetri del 1965 in circa 20 m. Nel 1966 Kao e Hockham indicarono il traguardo: sotto 20 dB/km, cioè con l\'1% ancora presente dopo un chilometro. Nel 1970 Corning ci riuscì; oggi a 1550 nm si perdono circa 0,2 dB/km e l\'1% della luce resta ancora dopo 100 km.', focus: 'vetro' },
      { title: 'Tanti colori nella stessa fibra', text: 'Ogni canale ha il suo laser, con la sua lunghezza d\'onda. Un multiplatore li mette nella stessa fibra, dove non si mescolano; all\'arrivo un reticolo o un filtro li separa e li manda ai fotodiodi dei ricevitori. Nella DWDM i canali distano per esempio 100 GHz, circa 0,8 nm. I colori del disegno sono finti: è tutta luce infrarossa.', focus: 'wdm' },
      { title: 'L\'amplificatore all\'erbio', text: 'Dopo 80 km a 0,2 dB/km la potenza è scesa di 16 dB, a circa un quarantesimo. Un EDFA, alcuni metri di fibra con ioni di erbio eccitati da un laser di pompa, restituisce quei 16 dB per emissione stimolata: a tutti i canali insieme e senza trasformare la luce in elettricità.', focus: 'edfa' },
      { title: 'Attraverso gli oceani', text: 'Il cavo posato sul fondo porta più coppie di fibre e, ogni 50-100 km circa, un ripetitore con gli amplificatori, alimentato dal conduttore di rame del cavo. Nel vetro la luce corre a circa 204 000 km/s: per 6000 km di Atlantico servono circa 30 ms. TAT\u20118, nel 1988, portava 280 Mbit/s per coppia di fibre; oggi una coppia arriva a circa 20-25 Tbit/s.', focus: 'oceani' },
    ],
    formulas: [
      { label: 'Legge di Snell', eq: '<var>n</var><sub>1</sub> · sin <var>θ</var><sub>1</sub> = <var>n</var><sub>2</sub> · sin <var>θ</var><sub>2</sub>', text: 'Passando da un mezzo con indice <var>n</var><sub>1</sub> a uno con indice <var>n</var><sub>2</sub> la luce cambia direzione; gli angoli si misurano dalla normale alla superficie di separazione. Se <var>n</var><sub>2</sub> &lt; <var>n</var><sub>1</sub> il raggio rifratto si allontana dalla normale: da qui nasce la riflessione totale.' },
      { label: 'Angolo critico', eq: '<var>θ</var><sub>c</sub> = arcsin(<var>n</var><sub>2</sub> ⁄ <var>n</var><sub>1</sub>)', text: 'Esiste solo se il nucleo ha indice maggiore del mantello. Oltre questo angolo di incidenza, misurato dalla normale, la luce non può uscire e viene riflessa tutta. Con <var>n</var><sub>1</sub> = 1,48 e <var>n</var><sub>2</sub> = 1,46 vale circa 80,6°; tra acqua e aria circa 48,6°.' },
      { label: 'Apertura numerica', eq: 'NA = √(<var>n</var><sub>1</sub><sup>2</sup> − <var>n</var><sub>2</sub><sup>2</sup>)<br>= sin <var>θ</var><sub>max</sub>', text: 'Dice quanta luce la fibra raccoglie dall\'aria. Vengono guidati i raggi che entrano formando con l\'asse un angolo minore di <var>θ</var><sub>max</sub>, il semiangolo del cono di accettazione. Con 1,48 e 1,46 si ottiene NA ≈ 0,24 e <var>θ</var><sub>max</sub> ≈ 14°.' },
      { label: 'Bilancio di potenza', eq: '<var>P</var>(<var>L</var>) = <var>P</var><sub>0</sub> − <var>α</var> · <var>L</var><br>+ Σ<var>G</var> − Σ<var>A</var>', text: 'In decibel le perdite si sottraggono e i guadagni si sommano. <var>P</var><sub>0</sub> è la potenza lanciata in dBm (0 dBm = 1 mW), <var>α</var> l\'attenuazione in dB/km, <var>G</var> il guadagno degli amplificatori, <var>A</var> le perdite di connettori e giunzioni. Il collegamento funziona se <var>P</var>(<var>L</var>) resta sopra la soglia del ricevitore, con qualche dB di margine.' },
      { label: 'Frequenza e lunghezza d\'onda', eq: '<var>c</var> = <var>λ</var> · <var>f</var>', text: 'La velocità della luce nel vuoto lega lunghezza d\'onda e frequenza: a 1550 nm <var>f</var> ≈ 193,4 THz. Nella fibra la frequenza resta la stessa, mentre velocità e lunghezza d\'onda si riducono di circa un terzo. Per questo i canali WDM si indicano con la frequenza, su una griglia ITU ancorata a 193,1 THz; la capacità totale è il numero dei canali per la velocità di ciascuno.' },
    ],
    timeline: [
      { year: 1841, title: 'La luce in un getto d\'acqua', who: 'Jean-Daniel Colladon, Ginevra', text: 'Colladon illumina un recipiente d\'acqua e mostra che la luce resta intrappolata nel getto che esce da un foro e ne segue la curva, per riflessione totale interna. Pubblica l\'esperimento nel 1842 sui Comptes Rendus di Parigi, nello stesso fascicolo di una nota di Jacques Babinet su un effetto simile. John Tyndall lo ripeté alla Royal Institution di Londra nel 1854 (alcune fonti indicano il 1870) e per molto tempo è stato ricordato, a torto, come l\'inventore.' },
      { year: 1880, title: 'Il fotofono: la voce su un raggio di Sole', who: 'Alexander Graham Bell e Charles Sumner Tainter, Washington', text: 'Il 3 giugno 1880 Tainter trasmette a Bell un messaggio vocale su un fascio di luce solare, dal tetto della Franklin School al laboratorio di L Street, a circa 213 metri: la voce fa vibrare uno specchio sottile e una cella al selenio ritrasforma la luce in suono. Bell lo considerava la sua invenzione più importante, ma all\'aria aperta il collegamento dipendeva dal Sole e dal tempo atmosferico.' },
      { year: 1917, title: 'L\'emissione stimolata', who: 'Albert Einstein, Berlino', text: 'In lavori del 1916 e nell\'articolo «Zur Quantentheorie der Strahlung», pubblicato nel 1917, Einstein mostra che un fotone può indurre un atomo eccitato a emetterne un secondo con la stessa frequenza e la stessa direzione. Che abbia anche la stessa fase lo preciserà la teoria quantistica della fine degli anni \'20. È il principio di laser e amplificatori ottici.' },
      { year: 1960, title: 'Il primo laser', who: 'Theodore H. Maiman, Hughes Research Laboratories, Malibu (California)', text: 'Il 16 maggio 1960 una barretta di rubino, eccitata da una lampada flash a spirale, emette impulsi di luce rossa a 694,3 nm: è il primo laser, descritto su Nature nell\'agosto 1960. A dicembre Ali Javan, William Bennett e Donald Herriott, ai Bell Labs, accendono il primo laser continuo, a elio e neon. Nel 1962 arrivano i laser a semiconduttore, che però funzionano solo a impulsi e raffreddati in azoto liquido, a 77 K.' },
      { year: 1966, title: 'Comunicare con fibre di vetro', who: 'Charles K. Kao e George A. Hockham, Standard Telecommunication Laboratories, Harlow (Regno Unito)', text: 'Kao e Hockham mostrano che le perdite enormi dei vetri di allora, circa 1000 dB/km, dipendono soprattutto dalle impurità e non dal vetro in sé. Sotto i 20 dB/km, cioè con l\'1% della luce ancora presente dopo un chilometro, una fibra potrebbe portare le telefonate. Per questo lavoro Kao ha ricevuto metà del Premio Nobel per la Fisica 2009.' },
      { year: 1970, title: 'Vetro ultrapuro e laser a temperatura ambiente', who: 'Robert Maurer, Donald Keck e Peter Schultz, Corning Glass Works (Stati Uniti)', text: 'Con silice fusa purissima e un nucleo drogato al titanio, il gruppo Corning ottiene la prima fibra sotto la soglia di Kao: circa 17 dB/km, misurati alla luce rossa di un laser elio-neon (633 nm). Nello stesso anno il gruppo di Žores Alfërov all\'Istituto Ioffe di Leningrado e Izuo Hayashi e Morton Panish ai Bell Labs fanno funzionare i laser a semiconduttore in continua a temperatura ambiente: ora ci sono la sorgente e il mezzo.' },
      { year: 1977, title: 'Le prime telefonate in fibra', who: 'GTE a Long Beach (California); AT&T e Illinois Bell a Chicago', text: 'Nella primavera del 1977 GTE, a Long Beach, fa passare traffico telefonico reale su fibra ottica a 6 Mbit/s; poche settimane dopo AT&T fa lo stesso sotto il centro di Chicago, a circa 45 Mbit/s. Sono tra i primi collegamenti commerciali: sistemi di prima generazione a circa 850 nm su fibra multimodale, la finestra che oggi serve per le tratte brevi dei data center.' },
      { year: 1987, title: 'L\'amplificatore tutto ottico', who: 'David Payne e colleghi, Università di Southampton; Emmanuel Desurvire e colleghi, AT&T Bell Laboratories', text: 'Due gruppi dimostrano l\'amplificatore a fibra drogata con erbio: alcuni metri di fibra con ioni di erbio, eccitati da un laser di pompa, amplificano per emissione stimolata la luce attorno a 1550 nm senza convertirla in elettricità. Poiché amplifica tutti i canali insieme, l\'EDFA rende conveniente la WDM: i sistemi DWDM commerciali arrivano a metà degli anni \'90.' },
      { year: 1988, title: 'TAT\u20118: l\'Atlantico in fibra', who: 'Consorzio guidato da AT&T, British Telecom e France Télécom', text: 'Il 14 dicembre 1988 entra in servizio TAT\u20118, il primo cavo telefonico transatlantico in fibra ottica, tra Stati Uniti, Regno Unito e Francia. Lavora a 1310 nm con circa 280 Mbit/s per coppia di fibre e in tutto porta circa 40 000 telefonate contemporanee. I ripetitori sono ancora elettronici: la luce diventa elettricità e poi di nuovo luce. I transatlantici con EDFA arrivano a metà degli anni \'90, con TAT\u201112/13.' },
      { year: 2025, title: 'La luce arriva accanto al chip', who: 'NVIDIA, Broadcom e altri produttori di chip di rete', text: 'Nei data center per l\'intelligenza artificiale i motori ottici, realizzati con la fotonica integrata (l\'«ottica integrata» proposta da Stewart Miller ai Bell Labs nel 1969, oggi spesso su silicio), vengono montati nello stesso package del chip di commutazione invece che in moduli separati. Il segnale elettrico percorre pochi millimetri e il consumo per bit diminuisce. Nel marzo 2025 NVIDIA ha annunciato i suoi primi switch con ottica co-packaged.' },
    ],
    fun: 'In un comune vetro da finestra la luce perde metà della sua potenza in una quindicina di centimetri (è una stima). In una fibra di oggi, alla lunghezza d\'onda di 1550 nm, per lo stesso dimezzamento servono circa 15 km: una «finestra» fatta di quel vetro potrebbe essere spessa quanto una città e lasciar passare ancora metà della luce infrarossa.',
    uses: [
      'Dorsali di Internet: DWDM con canali da 100 a 800 Gbit/s',
      'Cavi sottomarini con EDFA ogni 50-100 km',
      'Fibra fino a casa (GPON a 1490 e 1310 nm)',
      'Data center: VCSEL a 850 nm e fotonica al silicio',
      'Antenne 4G e 5G collegate alla rete in fibra',
      'Endoscopi, laser chirurgici e OCT in oculistica',
      'Sensori: reticoli di Bragg e rilevamento acustico distribuito',
      'Fibre plastiche in auto e uscita audio ottica TOSLINK',
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
      caption: 'Dal laser al cavo oceanico: la riflessione totale tiene la luce nel nucleo, più canali condividono la fibra e l\'erbio li ricarica. Lo zig-zag vale per le fibre multimodali; i colori dei canali sono finti, la luce è infrarossa.',
      label: 'Animazione: il laser, la riflessione totale nella fibra, il vetro ultrapuro, i canali WDM, l\'amplificatore all\'erbio e i cavi sottomarini',
      aspect: '16 / 7',
      aspectMobile: '1 / 1',
      mount: mountHero,
    },
    lab: {
      title: 'Laboratorio della fibra',
      intro: 'Scegli la fibra o regola gli indici del nucleo e del mantello, poi cambia l\'angolo di lancio: guarda quando il raggio resta intrappolato e quando esce nel mantello. Sotto c\'è il bilancio di potenza: scegli finestra, lunghezza e numero di canali e controlla se la luce arriva sopra la soglia del ricevitore, con gli amplificatori all\'erbio quando servono. I display danno anche la frequenza della luce, la corrente del fotodiodo e il ritardo del viaggio.',
      mount: mountLab,
    },
    model,
  });
})(typeof window !== 'undefined' ? window : globalThis);
