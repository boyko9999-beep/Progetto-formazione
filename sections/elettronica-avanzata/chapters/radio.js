/*
 * Capitolo 4 · Onde nell'etere (radiofrequenza e modulazione).
 * Animazione: un dipolo a mezz'onda lancia anelli di campo elettrico che si staccano
 * e corrono verso un'antenna ricevente; poi portante, AM, FM e simboli 16-QAM.
 * Laboratorio: modulatore e analizzatore con forma d'onda, spettro, piano I/Q e rumore.
 */
(function (root) {
  'use strict';

  const EA = root.EA;
  const TAU = Math.PI * 2;

  /* ---------- modello ---------- */

  const C0 = 299792458;            // velocità della luce nel vuoto, m/s (esatta nel SI)
  const MU0 = 1.25663706127e-6;    // permeabilità magnetica del vuoto, N/A² (CODATA 2022)
  const EPS0 = 8.8541878188e-12;   // permittività elettrica del vuoto, F/m (CODATA 2022)

  // Maxwell: la velocità delle onde dipende solo da due costanti misurabili in laboratorio.
  const lightSpeed = (mu0, eps0) => 1 / Math.sqrt((mu0 || MU0) * (eps0 || EPS0));
  const wavelength = (f) => C0 / f;
  const dipoleLength = (f) => C0 / f / 2;

  // Bande del Regolamento delle radiocomunicazioni ITU, con il nome metrico italiano.
  const BANDS = [
    { min: 3e3, max: 3e4, name: 'VLF', it: 'onde miriametriche' },
    { min: 3e4, max: 3e5, name: 'LF', it: 'onde lunghe' },
    { min: 3e5, max: 3e6, name: 'MF', it: 'onde medie' },
    { min: 3e6, max: 3e7, name: 'HF', it: 'onde corte' },
    { min: 3e7, max: 3e8, name: 'VHF', it: 'onde metriche' },
    { min: 3e8, max: 3e9, name: 'UHF', it: 'onde decimetriche' },
    { min: 3e9, max: 3e10, name: 'SHF', it: 'onde centimetriche' },
    { min: 3e10, max: 3e11, name: 'EHF', it: 'onde millimetriche' },
  ];
  function band(f) {
    return BANDS.find((b, i) => f >= b.min && (f < b.max || (i === BANDS.length - 1 && f <= b.max))) || null;
  }

  // Alcuni servizi noti, per dare un volto alle frequenze del laboratorio.
  const SERVICES = [
    [148.5e3, 283.5e3, 'radio AM in onde lunghe'],
    [526.5e3, 1606.5e3, 'radio AM in onde medie'],
    [13.4e6, 13.7e6, 'NFC e RFID a 13,56 MHz'],
    [87.5e6, 108e6, 'radio FM'],
    [118e6, 137e6, 'radio aeronautica in AM'],
    [880e6, 960e6, 'telefonia GSM a 900 MHz'],
    [1.16e9, 1.61e9, 'navigazione satellitare'],
    [2.4e9, 2.5e9, 'Wi-Fi e Bluetooth a 2,4 GHz'],
    [3.4e9, 3.8e9, '5G a 3,5 GHz'],
    [5.15e9, 5.85e9, 'Wi-Fi a 5 GHz'],
    [5.925e9, 7.125e9, 'Wi-Fi a 6 GHz'],
    [10.7e9, 12.75e9, 'TV satellitare'],
    [24.25e9, 27.5e9, '5G a onde millimetriche'],
    [76e9, 81e9, 'radar per auto'],
  ];
  function service(f) {
    const s = SERVICES.find((x) => f >= x[0] && f <= x[1]);
    return s ? s[2] : null;
  }

  // Funzione di Bessel Jn(x) dalla rappresentazione integrale
  // Jn(x) = (1/π) ∫ cos(nτ − x sin τ) dτ su [0, π]; i trapezi convergono in fretta.
  function besselJ(n, x) {
    const N = 64 + 2 * Math.ceil(Math.abs(x) + Math.abs(n));
    let s = 0;
    for (let k = 0; k <= N; k++) {
      const tau = (Math.PI * k) / N;
      s += (k === 0 || k === N ? 0.5 : 1) * Math.cos(n * tau - x * Math.sin(tau));
    }
    return s / N;
  }

  // J0(x) … JnMax(x) in un colpo solo: ricorrenza all'indietro di Miller,
  // normalizzata con J0 + 2·(J2 + J4 + …) = 1.
  function besselSeries(x, nMax) {
    const out = new Array(nMax + 1).fill(0);
    const ax = Math.abs(x);
    if (ax < 1e-12) { out[0] = 1; return out; }
    const top = Math.max(nMax, Math.ceil(ax));
    let m = top + 20 + Math.ceil(Math.sqrt(40 * top));
    if (m % 2) m += 1;
    let next = 0;
    let cur = 1;
    let sum = 0;
    for (let k = m; k >= 1; k--) {
      const prev = ((2 * k) / ax) * cur - next;
      next = cur;
      cur = prev;
      const n = k - 1;
      if (n <= nMax) out[n] = cur;
      if (n === 0) sum += cur;
      else if (n % 2 === 0) sum += 2 * cur;
      if (Math.abs(cur) > 1e200) {
        cur *= 1e-200; next *= 1e-200; sum *= 1e-200;
        for (let i = n; i <= nMax; i++) out[i] *= 1e-200;
      }
    }
    for (let i = 0; i <= nMax; i++) out[i] /= sum;
    if (x < 0) for (let i = 1; i <= nMax; i += 2) out[i] = -out[i];
    return out;
  }

  // AM: s(t) = [1 + m·x(t)]·cos(2π fc t) con un tono x(t) = cos(2π fm t).
  const amSignal = (t, fc, fm, m) => (1 + m * Math.cos(TAU * fm * t)) * Math.cos(TAU * fc * t);
  // Righe dello spettro (ampiezze relative alla portante) a fc + k·fm.
  const amSpectrum = (m) => [{ k: -1, a: m / 2 }, { k: 0, a: 1 }, { k: 1, a: m / 2 }];
  const amBandwidth = (fm) => 2 * fm;
  // Frazione della potenza totale che sta nelle bande laterali: (m²/2) / (1 + m²/2).
  const sidebandFraction = (m) => (m * m) / 2 / (1 + (m * m) / 2);

  // FM: s(t) = cos(2π fc t + β sin(2π fm t)), con β = Δf / fm.
  const fmSignal = (t, fc, fm, beta) => Math.cos(TAU * fc * t + beta * Math.sin(TAU * fm * t));
  // Righe a fc + k·fm con ampiezza Jk(β) (J−k = (−1)^k Jk).
  function fmSpectrum(beta, nMax) {
    const J = besselSeries(beta, nMax);
    const out = [];
    for (let k = -nMax; k <= nMax; k++) out.push({ k, a: k < 0 && k % 2 ? -J[-k] : J[Math.abs(k)] });
    return out;
  }
  const carson = (df, fm) => 2 * (df + fm);
  // Potenza contenuta nelle righe che cadono dentro la banda di Carson (|k| ≤ β + 1).
  function carsonPowerFraction(beta) {
    const nC = Math.floor(beta + 1 + 1e-9);
    const J = besselSeries(beta, nC);
    let p = J[0] * J[0];
    for (let n = 1; n <= nC; n++) p += 2 * J[n] * J[n];
    return p;
  }

  // Rapporto segnale-rumore dopo la demodulazione (lineare), sopra soglia,
  // con l'SNR d'ingresso misurato nella banda occupata dal segnale.
  // AM con rivelatore d'inviluppo: m² / (1 + m²/2). FM: 3β²(β + 1).
  function demodSnr(mode, snrIn, p) {
    if (mode === 'am') return (snrIn * p.m * p.m) / (1 + (p.m * p.m) / 2);
    if (mode === 'fm') return snrIn * 3 * p.beta * p.beta * (p.beta + 1);
    return snrIn;
  }
  const FM_THRESHOLD_DB = 10;

  // Costellazioni con energia media per simbolo unitaria e codice di Gray.
  const GRAY2 = ['00', '01', '11', '10'];
  const CONST = {
    bpsk: [{ i: -1, q: 0, bits: '0' }, { i: 1, q: 0, bits: '1' }],
    qam16: (() => {
      const pts = [];
      const s = 1 / Math.sqrt(10);
      for (let aq = 0; aq < 4; aq++) {
        for (let ai = 0; ai < 4; ai++) pts.push({ i: (2 * ai - 3) * s, q: (3 - 2 * aq) * s, bits: GRAY2[ai] + GRAY2[3 - aq] });
      }
      return pts;
    })(),
  };
  const constellation = (name) => CONST[name].map((p) => ({ i: p.i, q: p.q, bits: p.bits }));
  const bitsPerSymbol = (M) => Math.log2(M);
  const digitalBandwidth = (rs, alpha) => rs * (1 + alpha);

  // Decisione: il punto ideale più vicino al punto ricevuto.
  function decide(name, i, q) {
    if (name === 'bpsk') return i < 0 ? 0 : 1;
    const s = Math.sqrt(10);
    const ai = Math.min(3, Math.max(0, Math.round((i * s + 3) / 2)));
    const aq = Math.min(3, Math.max(0, Math.round((3 - q * s) / 2)));
    return aq * 4 + ai;
  }

  // Spettro di potenza degli impulsi a coseno rialzato (picco 1): occupa Rs·(1 + α).
  function rcPsd(f, rs, alpha) {
    const a = Math.abs(f);
    const f1 = ((1 - alpha) * rs) / 2;
    const f2 = ((1 + alpha) * rs) / 2;
    if (a <= f1) return 1;
    if (a >= f2) return 0;
    return 0.5 * (1 + Math.cos((Math.PI / (alpha * rs)) * (a - f1)));
  }
  // Impulsi rettangolari: sinc², lobo principale largo 2·Rs da nullo a nullo.
  function rectPsd(f, rs) {
    const x = Math.PI * (f / rs);
    return Math.abs(x) < 1e-9 ? 1 : Math.pow(Math.sin(x) / x, 2);
  }

  // erfc con errore relativo < 1,2·10⁻⁷ (Chebyshev) e funzione Q della gaussiana.
  function erfc(x) {
    const z = Math.abs(x);
    const t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
      t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  const qfunc = (x) => 0.5 * erfc(x / Math.SQRT2);

  // Probabilità di sbagliare un simbolo in rumore gaussiano, con Es/N0 lineare.
  function serTheory(name, esn0) {
    if (name === 'bpsk') return qfunc(Math.sqrt(2 * esn0));
    const p = 1.5 * qfunc(Math.sqrt(esn0 / 5));
    return 1 - (1 - p) * (1 - p);
  }

  // Generatore pseudocasuale riproducibile (mulberry32) e coppie gaussiane (Box-Muller).
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gaussPair(rand) {
    const r = Math.sqrt(-2 * Math.log(1 - rand()));
    const a = TAU * rand();
    return [r * Math.cos(a), r * Math.sin(a)];
  }

  // Simboli casuali più rumore gaussiano con Es/N0 dato (dB): σ² = N0/2 per asse.
  // Con lo stesso seme il rumore è lo stesso: cambiando l'SNR la nuvola si stringe soltanto.
  function simulate(name, esn0dB, n, seed) {
    const pts = CONST[name];
    const rand = rng(seed == null ? 1 : seed);
    const sigma = Math.sqrt(1 / (2 * Math.pow(10, esn0dB / 10)));
    const sent = new Uint8Array(n);
    const ri = new Float64Array(n);
    const rq = new Float64Array(n);
    const ok = new Uint8Array(n);
    let errors = 0;
    for (let k = 0; k < n; k++) {
      const s = Math.floor(rand() * pts.length);
      const r = sigma * Math.sqrt(-2 * Math.log(1 - rand()));
      const a = TAU * rand();
      const i = pts[s].i + r * Math.cos(a);
      const q = pts[s].q + r * Math.sin(a);
      sent[k] = s;
      ri[k] = i;
      rq[k] = q;
      if (decide(name, i, q) === s) ok[k] = 1; else errors++;
    }
    return { sent, i: ri, q: rq, ok, errors, ser: errors / n, sigma };
  }

  // Limite di Shannon per hertz di banda: C/B = log2(1 + SNR).
  const shannon = (snr) => Math.log2(1 + snr);

  // Linee del campo elettrico di un dipolo a mezz'onda con corrente sinusoidale:
  // curve di livello di ψ = cos(k·R1 − ωt) + cos(k·R2 − ωt), con R1 e R2 distanze
  // dalle due estremità (campo vicino esatto di Schelkunoff). Distanze in lunghezze d'onda.
  function dipoleStream(rho, z, phase) {
    const r1 = Math.hypot(rho, z - 0.25);
    const r2 = Math.hypot(rho, z + 0.25);
    return Math.cos(TAU * r1 - phase) + Math.cos(TAU * r2 - phase);
  }
  // Diagramma di radiazione del dipolo a mezz'onda (campo lontano, 1 sul piano equatoriale).
  function dipolePattern(theta) {
    const s = Math.sin(theta);
    return Math.abs(s) < 1e-9 ? 0 : Math.cos((Math.PI / 2) * Math.cos(theta)) / s;
  }

  const model = {
    C0, MU0, EPS0, FM_THRESHOLD_DB,
    lightSpeed, wavelength, dipoleLength, band, service,
    besselJ, besselSeries,
    amSignal, amSpectrum, amBandwidth, sidebandFraction,
    fmSignal, fmSpectrum, carson, carsonPowerFraction, demodSnr,
    constellation, bitsPerSymbol, digitalBandwidth, decide, rcPsd, rectPsd,
    erfc, qfunc, serTheory, rng, gaussPair, simulate, shannon,
    dipoleStream, dipolePattern,
  };

  /* ---------- aiuti di disegno ---------- */

  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

  function rrect(ctx, x, y, w, hh, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, hh, r); else ctx.rect(x, y, w, hh);
  }

  // Riquadro da strumento sopra il disegno.
  function panel(ctx, x, y, w, hh, active) {
    ctx.save();
    ctx.fillStyle = EA.alpha('#060b0a', 0.9);
    ctx.strokeStyle = active ? EA.alpha(EA.colors.amber, 0.55) : EA.colors.grid;
    ctx.lineWidth = 1;
    rrect(ctx, x + 0.5, y + 0.5, w - 1, hh - 1, 10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function textWidth(ctx, str, size, weight) {
    ctx.save();
    ctx.font = (weight || 600) + ' ' + size + 'px ' + MONO;
    const w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  }

  // Etichetta con un fondo scuro, leggibile anche sopra le linee di campo.
  function tag(ctx, str, x, y, o) {
    const size = o.size || 11;
    const tw = textWidth(ctx, str, size, o.weight);
    const align = o.align || 'left';
    const x0 = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
    ctx.save();
    ctx.fillStyle = EA.alpha(EA.colors.bg, 0.86);
    rrect(ctx, x0 - 5, y - size + 1, tw + 10, size + 6, 4);
    ctx.fill();
    ctx.restore();
    EA.draw.text(ctx, str, x, y, o);
    return tw;
  }

  // Spezza un testo in righe che stanno nella larghezza data.
  function wrap(ctx, str, maxW, size) {
    const words = str.split(' ');
    const lines = [];
    let line = '';
    words.forEach((wd) => {
      const tryLine = line ? line + ' ' + wd : wd;
      if (line && textWidth(ctx, tryLine, size, 600) > maxW) { lines.push(line); line = wd; } else line = tryLine;
    });
    if (line) lines.push(line);
    return lines;
  }

  function dash(ctx, pts, color, width, pattern) {
    if (pts.length < 2) return;
    ctx.save();
    ctx.setLineDash(pattern || [5, 4]);
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1.3;
    ctx.beginPath();
    let pen = false;
    for (const p of pts) {
      if (!p) { pen = false; continue; }
      if (pen) ctx.lineTo(p[0], p[1]); else { ctx.moveTo(p[0], p[1]); pen = true; }
    }
    ctx.stroke();
    ctx.restore();
  }

  // Pallino con un alone stretto; `a` regola l'intensità (0…1) senza cambiare la forma.
  function glowDot(ctx, x, y, r, color, a) {
    ctx.save();
    ctx.globalAlpha = EA.clamp(a, 0, 1);
    const gr = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.3);
    gr.addColorStop(0, EA.alpha(color, 0.5));
    gr.addColorStop(1, EA.alpha(color, 0));
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(x, y, r * 2.3, 0, TAU); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Quota orizzontale con frecce alle due estremità.
  function span(ctx, x1, x2, y, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x1 + 4, y + 0.5); ctx.lineTo(x2 - 4, y + 0.5); ctx.stroke();
    [[x1, 1], [x2, -1]].forEach(([x, s]) => {
      ctx.beginPath(); ctx.moveTo(x, y + 0.5); ctx.lineTo(x + 6 * s, y - 3.5); ctx.lineTo(x + 6 * s, y + 4.5); ctx.closePath(); ctx.fill();
      ctx.fillRect(x - 0.5, y - 5, 1, 11);
    });
    ctx.restore();
  }

  /* ---------- animazione principale: il dipolo che irradia ---------- */

  // Livelli delle curve di ψ: anelli positivi e negativi (campo con verso opposto).
  const LEVELS = [-3.15, -2.45, -1.75, -1.05, -0.35, 0.35, 1.05, 1.75, 2.45, 3.15];
  // Ordine dei 16 simboli trasmessi: ogni simbolo nuovo accende un punto nuovo.
  const QAM_ORDER = [5, 10, 3, 12, 0, 15, 6, 9, 1, 14, 7, 8, 2, 13, 4, 11];

  function mountHero(view, api) {
    const C = EA.colors;
    const TINT = C.amber;
    const cv = api.canvas(view, { label: 'A sinistra un\'antenna a dipolo: le cariche alle estremità e le frecce di corrente oscillano, e dall\'antenna partono anelli di campo elettrico che si staccano e viaggiano verso un\'antenna ricevente a destra. In basso la striscia del segnale trasmesso: portante pura, poi AM, FM e simboli 16-QAM, con il loro spettro o la costellazione.' });
    const STAGES = [
      { key: 'cariche', dur: 5.5, mode: 'carrier' },
      { key: 'onda', dur: 7, mode: 'carrier' },
      { key: 'portante', dur: 6, mode: 'carrier' },
      { key: 'am', dur: 9, mode: 'am' },
      { key: 'fm', dur: 9, mode: 'fm' },
      { key: 'qam', dur: 12, mode: 'qam' },
    ];
    const TEXT = [
      ['1 · LE CARICHE OSCILLANO', '1 · LE CARICHE', 'il generatore spinge gli elettroni su e giù: a 100 MHz, cento milioni di volte al secondo', 'elettroni su e giù lungo l\'antenna'],
      ['2 · IL CAMPO SI STACCA E VIAGGIA', '2 · IL CAMPO VIAGGIA', 'gli anelli si staccano e corrono alla velocità della luce, anche quando l\'antenna si spegne', 'gli anelli si staccano e corrono a velocità c'],
      ['3 · LA PORTANTE', '3 · LA PORTANTE', 'ampiezza e frequenza sempre uguali: l\'onda arriva, ma non porta informazione', 'onda sempre uguale: nessuna informazione'],
      ['4 · AM: L\'AMPIEZZA SEGUE LA VOCE', '4 · AM', 'gli anelli si rafforzano e si indeboliscono seguendo il messaggio', 'l\'ampiezza segue il messaggio'],
      ['5 · FM: LA FREQUENZA SEGUE LA VOCE', '5 · FM', 'ampiezza costante: le onde si infittiscono e si diradano col messaggio', 'la frequenza segue il messaggio'],
      ['6 · 16-QAM: SIMBOLI DIGITALI', '6 · 16-QAM', 'ampiezza e fase saltano tra 16 combinazioni: ogni simbolo porta 4 bit', 'ogni simbolo è un punto e porta 4 bit'],
    ];
    const T_C = 1.25;   // periodo della portante nell'animazione (s): nella realtà, a 100 MHz, 10 ns
    const T_OFF = 0.9;  // pausa prima di riaccendere l'antenna
    const FADE = 0.5;   // dissolvenza tra due modulazioni (s)
    const T_S = T_C;    // durata di un simbolo 16-QAM
    const AM_M = 0.75;
    const BETA = 1.2;   // indice FM: Δf = 0,3·fc con fm = fc/4
    const WC = TAU / T_C;
    const WM = WC / 4;
    const PH0 = (9 * Math.PI) / 16; // fase del messaggio nei fotogrammi fermi (portante a 45°)
    const QAM = constellation('qam16');
    const FM_J = besselSeries(BETA, 4);
    const lambdaTxt = EA.si(wavelength(100e6), 'm');
    const dipoleTxt = EA.si(dipoleLength(100e6), 'm');
    const delayTxt = EA.si(1000 / C0, 's');

    let stage = 0;
    let stageT = 0;
    let events = [];
    let frontT = null;  // quando l'antenna si è accesa: da lì parte il fronte d'onda
    let off = 0;        // tempo della scena = tempo dell'animazione + off
    let G = null;
    const spec = new Float32Array(9);
    const A = [0, 0];

    /* sorgente: corrente d'antenna nel tempo, per ogni modulazione */

    const symAt = (k) => QAM_ORDER[((k % 16) + 16) % 16];

    function qamEnv(tp, t0, out) {
      const u = (tp - t0) / T_S;
      const k = Math.floor(u);
      const f = u - k;
      const p = QAM[symAt(k)];
      let I = p.i;
      let Q = p.q;
      const HW = 0.14; // transizioni morbide, come con impulsi sagomati
      if (f < HW) {
        const o = QAM[symAt(k - 1)];
        const w = EA.smooth(0.5 + f / (2 * HW));
        I = o.i + (I - o.i) * w; Q = o.q + (Q - o.q) * w;
      } else if (f > 1 - HW) {
        const o = QAM[symAt(k + 1)];
        const w = EA.smooth((f - (1 - HW)) / (2 * HW));
        I += (o.i - I) * w; Q += (o.q - Q) * w;
      }
      out[0] = I; out[1] = Q;
    }

    // Inviluppo complesso I + jQ della modulazione `ev.mode` all'istante tp.
    function modeEnv(ev, tp, out) {
      const mode = ev.mode;
      if (mode === 'off') { out[0] = 0; out[1] = 0; }
      else if (mode === 'am') { out[0] = 1 + AM_M * Math.sin(WM * tp); out[1] = 0; }
      else if (mode === 'fm') { const ph = -BETA * Math.cos(WM * tp); out[0] = Math.cos(ph); out[1] = Math.sin(ph); }
      else if (mode === 'qam') qamEnv(tp, ev.t0, out);
      else { out[0] = 1; out[1] = 0; }
      return out;
    }

    // Con la dissolvenza dal segnale precedente, a sua volta già sfumato: anche con
    // cambi più ravvicinati di FADE il segnale emesso resta continuo. Risultato in A.
    function envAt(e, tp) {
      modeEnv(events[e], tp, A);
      if (e === 0) return A;
      const k = (tp - events[e].t) / FADE;
      if (k >= 1) return A;
      const i1 = A[0];
      const q1 = A[1];
      envAt(e - 1, tp);
      const w = EA.smooth(k);
      A[0] += (i1 - A[0]) * w;
      A[1] += (q1 - A[1]) * w;
      return A;
    }
    function eventAt(tp) {
      let e = events.length - 1;
      while (e > 0 && events[e].t > tp) e--;
      return e;
    }
    // Corrente (in fase), carica alle estremità (in quadratura) e ampiezza all'istante tp.
    function feed(tp) {
      const e = eventAt(tp);
      const env = envAt(e, tp);
      const c = Math.cos(WC * tp);
      const s = Math.sin(WC * tp);
      return { i: env[0] * c - env[1] * s, q: env[0] * s + env[1] * c, amp: Math.hypot(env[0], env[1]), mode: events[e].mode };
    }

    /* programma della sorgente: animazione in corso o fotogramma statico */

    function cutFuture(t) {
      while (events.length > 1 && events[events.length - 1].t > t) events.pop();
    }
    // Nel passo 2 l'antenna si spegne per un istante: gli ultimi anelli continuano la corsa
    // da soli, poi parte un fronte nuovo e il ricevitore si riaccende solo quando lo raggiunge.
    function enterLive(i, t) {
      cutFuture(t);
      if (STAGES[i].key === 'onda') {
        events.push({ t, mode: 'off' }, { t: t + T_OFF, mode: 'carrier' });
        frontT = t + T_OFF;
        return;
      }
      const mode = STAGES[i].mode;
      if (events[events.length - 1].mode === 'off') frontT = t;
      const ev = { t, mode };
      if (mode === 'qam') ev.t0 = t;
      events.push(ev);
    }
    // Fotogramma fermo: il tempo della scena viene spostato (al massimo di un periodo
    // del messaggio) fino a una fase in cui cariche e correnti si vedono entrambe e
    // l'inviluppo AM è alto; premendo play si riparte da lì senza salti.
    function setStatic(i, now) {
      off = -((((WM * now - PH0) % TAU) + TAU) % TAU) / WM;
      const t = now + off;
      const mode = STAGES[i].mode;
      if (STAGES[i].key === 'onda') {
        // il fronte è a metà strada: il ricevitore non ha ancora sentito niente
        const age = (cv.w && cv.w < 560 ? 1.9 : 2.7) * T_C;
        events = [{ t: -1e9, mode: 'off' }, { t: t - age, mode: 'carrier' }];
        frontT = t - age;
        return;
      }
      const ev = { t: -1e9, mode };
      if (mode === 'qam') ev.t0 = t - 3.5 * T_S; // a metà del quarto simbolo
      events = [ev];
      frontT = null;
    }
    function prune(t, g) {
      const horizon = t - g.J / (g.lambda / T_C) - FADE - 1;
      while (events.length > 2 && events[1].t < horizon) events.shift();
    }

    /* geometria e griglia del campo (ricalcolate solo quando cambia la dimensione) */

    function layout() {
      if (G && G.w === cv.w && G.hh === cv.h) return G;
      const w = cv.w;
      const hh = cv.h;
      const narrow = w < 560;
      const fTop = narrow ? 64 : 58;
      const stripH = narrow ? 70 : 96;
      const stripY = hh - stripH - (narrow ? 10 : 14);
      const fBot = stripY - (narrow ? 8 : 10);
      const cy = Math.round((fTop + fBot) / 2);
      const xTx = narrow ? 44 : Math.max(96, Math.round(w * 0.095));
      const xRx = w - (narrow ? 42 : Math.max(100, Math.round(w * 0.1)));
      const lambda = (xRx - xTx) / (narrow ? 2.5 : 3.5);
      const arm = lambda / 4;
      const iw = narrow ? 132 : 236;
      const ih = narrow ? 78 : 112;
      const cs = narrow ? 5 : 6;
      const gy0 = fTop - 8;
      const nx = Math.ceil(w / cs) + 1;
      const ny = Math.ceil((fBot + 8 - gy0) / cs) + 1;
      const R1 = new Float32Array(nx * ny);
      const R2 = new Float32Array(nx * ny);
      let rmax = 0;
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const k = j * nx + i;
          const x = i * cs - xTx;
          const y = gy0 + j * cs - cy;
          R1[k] = Math.hypot(x, y + arm);
          R2[k] = Math.hypot(x, y - arm);
          rmax = Math.max(rmax, R1[k], R2[k]);
        }
      }
      const J = Math.ceil(rmax) + 3;
      const ne = 2 * nx * ny; // lati della griglia: 2k orizzontale, 2k + 1 verticale dal nodo k
      G = {
        w, hh, narrow, fTop, fBot, cy, xTx, xRx, lambda, arm, stripY, stripH,
        ix: w - iw - (narrow ? 8 : 16), iy: narrow ? 8 : 14, iw, ih,
        cs, gy0, nx, ny, R1, R2, psi: new Float32Array(nx * ny), J, S: new Float32Array(J + 2),
        linkA: new Int32Array(ne), linkB: new Int32Array(ne), mark: new Int32Array(ne),
        seen: new Int32Array(ne), touched: new Int32Array(ne),
      };
      return G;
    }

    // Segnale emesso, campionato per distanza: S[j] = corrente all'istante t − j/v.
    function fillS(g, t) {
      const S = g.S;
      const v = g.lambda / T_C;
      let e = events.length - 1;
      for (let j = 0; j < S.length; j++) {
        const tp = t - j / v;
        while (e > 0 && events[e].t > tp) e--;
        const env = envAt(e, tp);
        S[j] = env[0] * Math.cos(WC * tp) - env[1] * Math.sin(WC * tp);
      }
    }
    const sampleS = (S, r) => { const i = r | 0; return S[i] + (S[i + 1] - S[i]) * (r - i); };

    // ψ = s(t − R1/c) + s(t − R2/c): ogni punto vede il segnale partito R/c secondi fa.
    function computePsi(g) {
      const { S, R1, R2, psi } = g;
      for (let k = 0; k < psi.length; k++) {
        let r = R1[k];
        let i = r | 0;
        const a = S[i] + (S[i + 1] - S[i]) * (r - i);
        r = R2[k];
        i = r | 0;
        psi[k] = a + S[i] + (S[i + 1] - S[i]) * (r - i);
      }
    }

    // Quadrati che marciano, con i pezzi uniti in curve. Ogni lato della griglia che il
    // livello L attraversa diventa un vertice; ogni cella collega due lati (quattro nelle
    // selle). Seguendo i collegamenti si ottengono poche curve lunghe, e il canvas traccia
    // una curva continua molto più in fretta di migliaia di trattini separati.
    let stamp = 0;
    const PX = new Float64Array(32);
    const PY = new Float64Array(32);
    const TOL = 0.3; // px: scarto massimo quando si saltano i vertici quasi allineati

    function edgePoint(g, e, L) {
      const k = e >> 1;
      const i = k % g.nx;
      const j = (k - i) / g.nx;
      const a = g.psi[k];
      if (e & 1) { PX[31] = i * g.cs; PY[31] = g.gy0 + (j + (L - a) / (g.psi[k + g.nx] - a)) * g.cs; }
      else { PX[31] = (i + (L - a) / (g.psi[k + 1] - a)) * g.cs; PY[31] = g.gy0 + j * g.cs; }
    }

    function traceLevel(g, L, p) {
      const { nx, ny, psi, linkA, linkB, mark, seen, touched } = g;
      const cur = ++stamp;
      let nt = 0;
      const join = (e, f) => {
        if (mark[e] !== cur) { mark[e] = cur; linkA[e] = f; linkB[e] = -1; touched[nt++] = e; } else linkB[e] = f;
        if (mark[f] !== cur) { mark[f] = cur; linkA[f] = e; linkB[f] = -1; touched[nt++] = f; } else linkB[f] = e;
      };
      for (let j = 0; j < ny - 1; j++) {
        let k = j * nx;
        for (let i = 0; i < nx - 1; i++, k++) {
          const a = psi[k];
          const b = psi[k + 1];
          const c = psi[k + nx + 1];
          const d = psi[k + nx];
          const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          const top = 2 * k;
          const bottom = 2 * (k + nx);
          const left = top + 1;
          const right = top + 3;
          switch (idx) {
            case 1: case 14: join(left, bottom); break;
            case 2: case 13: join(bottom, right); break;
            case 3: case 12: join(left, right); break;
            case 4: case 11: join(top, right); break;
            case 6: case 9: join(top, bottom); break;
            case 7: case 8: join(top, left); break;
            default: // sella: decide il valore medio della cella
              if ((idx === 5) === ((a + b + c + d) / 4 > L)) { join(top, left); join(right, bottom); } else { join(top, right); join(left, bottom); }
          }
        }
      }
      // Percorre una curva; tiene un vertice solo se la corda dall'ultimo vertice tracciato
      // passerebbe a più di TOL pixel da uno dei punti saltati.
      function walk(e0, closed) {
        let prev = -1;
        let e = e0;
        seen[e] = cur;
        edgePoint(g, e, L);
        let x0 = PX[31];
        let y0 = PY[31];
        p.moveTo(x0, y0);
        let np = 0;
        for (;;) {
          const next = linkA[e] !== prev ? linkA[e] : linkB[e];
          if (next < 0 || seen[next] === cur) break;
          prev = e;
          e = next;
          seen[e] = cur;
          edgePoint(g, e, L);
          PX[np] = PX[31];
          PY[np] = PY[31];
          np++;
          if (np < 2) continue;
          const dx = PX[np - 1] - x0;
          const dy = PY[np - 1] - y0;
          const lim = TOL * Math.hypot(dx, dy);
          let ok = np < 24;
          for (let m = 0; ok && m < np - 1; m++) if (Math.abs((PX[m] - x0) * dy - (PY[m] - y0) * dx) > lim) ok = false;
          if (!ok) {
            x0 = PX[np - 2];
            y0 = PY[np - 2];
            p.lineTo(x0, y0);
            PX[0] = PX[np - 1];
            PY[0] = PY[np - 1];
            np = 1;
          }
        }
        if (np) p.lineTo(PX[np - 1], PY[np - 1]);
        if (closed) p.closePath();
      }
      // prima le curve aperte, che finiscono sul bordo, poi gli anelli chiusi
      for (let m = 0; m < nt; m++) { const e = touched[m]; if (seen[e] !== cur && linkB[e] < 0) walk(e, false); }
      for (let m = 0; m < nt; m++) { const e = touched[m]; if (seen[e] !== cur) walk(e, true); }
    }

    function traceField(g) {
      const pos = new Path2D();
      const neg = new Path2D();
      LEVELS.forEach((L) => traceLevel(g, L, L > 0 ? pos : neg));
      return { pos, neg };
    }

    /* disegno */

    function drawField(g) {
      const ctx = cv.ctx;
      const paths = traceField(g);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, g.fTop, g.w, g.fBot - g.fTop);
      ctx.clip();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = EA.alpha(TINT, 0.1);
      ctx.lineWidth = 4.5;
      ctx.stroke(paths.neg);
      ctx.strokeStyle = EA.alpha(TINT, 0.5);
      ctx.lineWidth = 1.25;
      ctx.stroke(paths.neg);
      ctx.strokeStyle = EA.alpha(TINT, 0.17);
      ctx.lineWidth = 4.5;
      ctx.stroke(paths.pos);
      ctx.strokeStyle = TINT;
      ctx.lineWidth = 1.4;
      ctx.stroke(paths.pos);
      ctx.restore();
      // sfumature ai bordi della zona del campo
      [[g.fTop, g.fTop + 18], [g.fBot, g.fBot - 18]].forEach(([y0, y1]) => {
        const gr = ctx.createLinearGradient(0, y0, 0, y1);
        gr.addColorStop(0, EA.alpha(C.bg, 1));
        gr.addColorStop(1, EA.alpha(C.bg, 0));
        ctx.fillStyle = gr;
        ctx.fillRect(0, Math.min(y0, y1), g.w, 18);
      });
    }

    // Un'antenna: due bracci λ/4, frecce di corrente (massime al centro) e cariche agli estremi.
    function drawAntenna(g, x, cur, q, gain) {
      const ctx = cv.ctx;
      const { cy, arm } = g;
      const gap = 4;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#cfdcd6';
      ctx.lineWidth = g.narrow ? 3 : 4;
      ctx.beginPath();
      ctx.moveTo(x, cy - arm); ctx.lineTo(x, cy - gap);
      ctx.moveTo(x, cy + gap); ctx.lineTo(x, cy + arm);
      ctx.stroke();
      ctx.restore();
      const maxLen = Math.min(18, arm * 0.36) * gain;
      [0.22, 0.55, 0.85].forEach((u) => {
        const amp = Math.cos((Math.PI / 2) * u) * cur;
        const len = amp * maxLen;
        if (Math.abs(len) < 2.5) return;
        [-1, 1].forEach((side) => {
          const yc = cy + side * (gap + u * (arm - gap));
          EA.draw.arrow(ctx, x - (g.narrow ? 8 : 11), yc + len / 2, x - (g.narrow ? 8 : 11), yc - len / 2, EA.alpha(C.ink, 0.85), 1.6, g.narrow ? 5 : 6);
        });
      });
      const qq = EA.clamp(q * gain, -1.4, 1.4);
      [[cy - arm, qq], [cy + arm, -qq]].forEach(([y, v]) => {
        const a = Math.min(1, Math.abs(v));
        if (a < 0.06) return;
        const col = v > 0 ? C.red : C.cyan;
        const r = (g.narrow ? 5.5 : 7) * (0.75 + 0.25 * a);
        glowDot(ctx, x, y, r, col, 0.3 + 0.7 * a);
        if (a > 0.3) EA.draw.text(ctx, v > 0 ? '+' : '−', x, y + 4, { color: EA.alpha(C.bg, Math.min(1, 0.4 + 0.6 * a)), size: g.narrow ? 11 : 12, weight: 800, align: 'center' });
      });
    }

    function drawStations(g, txF, rxF, glow) {
      const ctx = cv.ctx;
      const { cy, xTx, xRx, narrow } = g;
      // generatore del trasmettitore
      const gx = xTx - (narrow ? 22 : 30);
      ctx.save();
      ctx.strokeStyle = EA.alpha(C.ink, 0.7);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(gx + 6, cy - 5); ctx.lineTo(xTx, cy - 4);
      ctx.moveTo(gx + 6, cy + 5); ctx.lineTo(xTx, cy + 4);
      ctx.stroke();
      ctx.fillStyle = '#0d1714';
      ctx.beginPath(); ctx.arc(gx, cy, narrow ? 7 : 9, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = TINT;
      ctx.beginPath();
      const rr = narrow ? 4 : 5;
      for (let k = 0; k <= 12; k++) { const u = k / 12; const px = gx - rr + 2 * rr * u; const py = cy - Math.sin(u * TAU) * rr * 0.6; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.stroke();
      // rivelatore del ricevitore: una spia che si accende con il segnale
      const rx = xRx + (narrow ? 16 : 24);
      ctx.strokeStyle = EA.alpha(C.ink, 0.7);
      ctx.beginPath();
      ctx.moveTo(xRx, cy - 4); ctx.lineTo(rx - 6, cy - 5);
      ctx.moveTo(xRx, cy + 4); ctx.lineTo(rx - 6, cy + 5);
      ctx.stroke();
      ctx.fillStyle = '#0d1714';
      rrect(ctx, rx - (narrow ? 7 : 9), cy - (narrow ? 7 : 9), narrow ? 14 : 18, narrow ? 14 : 18, 4);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      if (glow > 0.03) glowDot(cv.ctx, rx, cy, narrow ? 3.5 : 4.5, TINT, glow);
      drawAntenna(g, xTx, txF.i, txF.q, 1);
      drawAntenna(g, xRx, rxF.i, rxF.q, 0.8);
      const ly = cy + g.arm + (narrow ? 22 : 28);
      tag(ctx, narrow ? 'TX' : 'TRASMETTITORE', xTx, ly, { color: C.text, size: 10.5, align: 'center' });
      tag(ctx, narrow ? 'RX' : 'RICEVITORE', xRx, ly, { color: C.text, size: 10.5, align: 'center' });
    }

    function drawFront(g, t, key) {
      if (frontT == null) return;
      const v = g.lambda / T_C;
      const R = v * (t - frontT);
      if (R <= g.arm || R > g.J) { if (R > g.J) frontT = null; return; }
      const ctx = cv.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, g.fTop, g.w, g.fBot - g.fTop);
      ctx.clip();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = EA.alpha(C.ink, 0.38);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(g.xTx, g.cy, R, 0, TAU); ctx.stroke();
      ctx.restore();
      if (!g.narrow && g.xTx + R < g.xRx - 40) {
        // sopra l'antenna, lontano dalle quote del passo 2 e dal riquadro dello spettro
        const y = Math.max(g.fTop + 22, g.cy - g.arm - 30);
        const dy = g.cy - y;
        const label = 'fronte d\'onda →';
        if (R > dy) {
          const x = g.xTx + Math.sqrt(R * R - dy * dy) + 8;
          const insetOn = key !== 'cariche' && key !== 'onda';
          const clear = !insetOn || y - 12 > g.iy + g.ih || x + textWidth(ctx, label, 10.5) + 8 < g.ix;
          if (clear) tag(ctx, label, x, y + 4, { color: C.ink, size: 10.5 });
        }
      }
    }

    // Le quote e le scritte che accompagnano i primi due passi.
    function drawNotes(g, key) {
      const ctx = cv.ctx;
      const { xTx, xRx, cy, arm, lambda, narrow } = g;
      if (key === 'cariche' && !narrow) {
        const xd = xTx - 52;
        ctx.save();
        ctx.strokeStyle = EA.alpha(C.text, 0.7);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xd + 0.5, cy - arm); ctx.lineTo(xd + 0.5, cy + arm);
        ctx.moveTo(xd - 4, cy - arm + 0.5); ctx.lineTo(xd + 5, cy - arm + 0.5);
        ctx.moveTo(xd - 4, cy + arm + 0.5); ctx.lineTo(xd + 5, cy + arm + 0.5);
        ctx.stroke();
        ctx.restore();
        tag(ctx, 'λ/2', xd - 6, cy - 3, { color: C.ink, size: 11, align: 'right', weight: 700 });
        tag(ctx, dipoleTxt, xd - 6, cy + 13, { color: C.text, size: 10.5, align: 'right' });
        tag(ctx, 'cariche alle estremità', xTx + 16, cy - arm + 4, { color: C.ink, size: 10.5 });
        tag(ctx, 'corrente: massima al centro', xTx + 16, cy + 4, { color: C.ink, size: 10.5 });
      }
      if (key === 'onda') {
        const x1 = xTx + (narrow ? 0.75 : 1.5) * lambda;
        const y = g.fTop + (narrow ? 14 : 16);
        span(ctx, x1, x1 + lambda, y, C.ink);
        tag(ctx, narrow ? 'λ = ' + lambdaTxt : 'λ = c/f = ' + lambdaTxt + ' a 100 MHz', x1 + lambda / 2, y + (narrow ? 16 : 17), { color: C.ink, size: 10.5, align: 'center' });
        if (!narrow) {
          tag(ctx, 'velocità della luce: c ≈ 300 000 km/s →', (xTx + xRx) / 2, g.fBot - 12, { color: C.ink, size: 10.5, align: 'center' });
          tag(ctx, '1 km in ' + delayTxt, xRx, cy + arm + 46, { color: C.text, size: 10.5, align: 'center' });
        }
      }
    }

    function drawStrip(g, t, key) {
      const ctx = cv.ctx;
      const { narrow, stripY, stripH, xTx, xRx, arm, S } = g;
      const x0 = narrow ? 8 : 12;
      const pw = g.w - 2 * x0;
      panel(ctx, x0, stripY, pw, stripH, false);
      EA.draw.text(ctx, 'SEGNALE TRASMESSO', x0 + 12, stripY + 16, { color: C.ink, size: 10.5, weight: 700 });
      const mid = stripY + stripH * 0.58;
      const unit = (stripH * 0.5 - 14) / 1.8;
      const v = g.lambda / T_C;
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.beginPath(); ctx.moveTo(xTx, mid + 0.5); ctx.lineTo(xRx, mid + 0.5); ctx.stroke();
      ctx.restore();
      const pts = [];
      const env = [];
      const neg = [];
      let e = events.length - 1;
      const showEnv = key === 'am' || key === 'fm' || key === 'qam';
      for (let x = xTx; x <= xRx; x += 1.5) {
        const r = Math.hypot(x - xTx, arm);
        pts.push([x, mid - unit * sampleS(S, r)]);
        if (showEnv) {
          const tp = t - r / v;
          while (e > 0 && events[e].t > tp) e--;
          if (events[e].mode !== key) { env.push(null); neg.push(null); continue; }
          if (key === 'fm') { env.push([x, mid - unit * 0.9 * Math.sin(WM * tp)]); continue; }
          // AM: l'inviluppo segue il messaggio; QAM: l'ampiezza resta fissa per tutto un simbolo
          const en = envAt(e, tp);
          const a = key === 'am' ? en[0] : Math.hypot(en[0], en[1]);
          env.push([x, mid - unit * a]);
          neg.push([x, mid + unit * a]);
        }
      }
      EA.draw.line(ctx, pts, TINT, narrow ? 1.6 : 1.9);
      if (env.length) {
        dash(ctx, env, C.cyan, 1.3);
        if (neg.length) dash(ctx, neg, C.cyan, 1.3);
        const word = key === 'am' ? 'inviluppo' : key === 'qam' ? 'ampiezza' : 'messaggio';
        if (narrow) EA.draw.text(ctx, word, x0 + pw - 10, stripY + 16, { color: C.cyan, size: 10.5, align: 'right' });
        else {
          const last = env[env.length - 1];
          if (last) EA.draw.text(ctx, word, xRx + 10, Math.max(stripY + 30, Math.min(stripY + stripH - 8, last[1] + 4)), { color: C.cyan, size: 10.5 });
        }
      }
      if (!narrow) EA.draw.text(ctx, 'adesso ← · → partito prima', x0 + pw - 12, stripY + 16, { color: C.dim, size: 10.5, align: 'right' });
      if (key === 'qam') {
        // confini dei simboli e i loro 4 bit, che viaggiano con l'onda
        const ev = events[events.length - 1];
        if (ev.mode !== 'qam') return;
        const kNow = Math.floor((t - ev.t0) / T_S);
        const tag0 = stripY + stripH - (narrow ? 5 : 6);
        for (let k = kNow; k > kNow - 12; k--) {
          const ta = ev.t0 + k * T_S;
          if (ta + T_S <= ev.t && ev.t > -1e8) break;
          const r0 = Math.max(0, v * (t - ta - T_S)); // simbolo in corso: la coda è ancora sull'antenna
          const r1 = v * (t - ta);
          const xa = xTx + Math.sqrt(Math.max(0, r0 * r0 - arm * arm));
          const xb = xTx + Math.sqrt(Math.max(0, r1 * r1 - arm * arm));
          if (xa > xRx) break;
          if (xb > xTx + 2 && xb < xRx) {
            ctx.save();
            ctx.setLineDash([2, 3]);
            ctx.strokeStyle = EA.alpha(C.text, 0.4);
            ctx.beginPath(); ctx.moveTo(xb + 0.5, stripY + 24); ctx.lineTo(xb + 0.5, stripY + stripH - 18); ctx.stroke();
            ctx.restore();
          }
          const xc = (Math.max(xa, xTx) + Math.min(xb, xRx)) / 2;
          if (xb - xa > 24 && xc > xTx + 12 && xc < xRx - 12) {
            EA.draw.text(ctx, QAM[symAt(k)].bits, xc, tag0, { color: k === kNow ? TINT : C.text, size: 10.5, weight: k === kNow ? 700 : 600, align: 'center' });
          }
        }
      }
    }

    function drawInset(g, t, key, live, dt) {
      if (key === 'cariche' || key === 'onda') return;
      const ctx = cv.ctx;
      const { ix, iy, iw, ih, narrow } = g;
      panel(ctx, ix, iy, iw, ih, true);
      if (key === 'qam') {
        const ev = events[events.length - 1];
        const kNow = ev.mode === 'qam' ? Math.floor((t - ev.t0) / T_S) : 0;
        // in diretta si accendono i punti già trasmessi; nel fotogramma statico tutti
        const lit = ev.t > -1e8 ? EA.clamp(kNow + 1, 0, 16) : 16;
        const on = new Set();
        for (let k = kNow - lit + 1; k <= kNow; k++) on.add(symAt(k));
        const side = narrow ? 54 : 76;
        const sx = ix + (narrow ? 8 : 12);
        const sy = iy + (narrow ? 19 : 28);
        EA.draw.text(ctx, narrow ? '16-QAM' : 'COSTELLAZIONE 16-QAM', ix + (narrow ? 8 : 12), iy + (narrow ? 14 : 18), { color: TINT, size: 10.5, weight: 700 });
        ctx.save();
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(sx, sy + side / 2 + 0.5); ctx.lineTo(sx + side, sy + side / 2 + 0.5);
        ctx.moveTo(sx + side / 2 + 0.5, sy); ctx.lineTo(sx + side / 2 + 0.5, sy + side);
        ctx.stroke();
        ctx.restore();
        const cur = symAt(kNow);
        const sc = (side / 2 - 7) / (3 / Math.sqrt(10));
        // il simbolo come vettore: la lunghezza è l'ampiezza, l'angolo è la fase;
        // la punta finisce sul punto, anche per i quattro simboli interni
        const ring = narrow ? 5.5 : 7;
        EA.draw.arrow(ctx, sx + side / 2, sy + side / 2, sx + side / 2 + QAM[cur].i * sc, sy + side / 2 - QAM[cur].q * sc, EA.alpha(C.ink, 0.85), 1.4, narrow ? 5 : 6);
        QAM.forEach((p, n) => {
          const px = sx + side / 2 + p.i * sc;
          const py = sy + side / 2 - p.q * sc;
          if (n === cur) {
            EA.draw.dot(ctx, px, py, narrow ? 3 : 3.6, TINT);
            ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(px, py, ring, 0, TAU); ctx.stroke(); ctx.restore();
          } else if (on.has(n)) {
            EA.draw.dot(ctx, px, py, narrow ? 2 : 2.6, EA.alpha(TINT, 0.7), false);
          } else {
            ctx.save(); ctx.strokeStyle = EA.alpha(C.dim, 0.7); ctx.beginPath(); ctx.arc(px, py, 2, 0, TAU); ctx.stroke(); ctx.restore();
          }
        });
        const tx = sx + side + (narrow ? 10 : 18);
        if (!narrow) EA.draw.text(ctx, 'bit del simbolo', tx, iy + 46, { color: C.text, size: 10.5 });
        EA.draw.text(ctx, QAM[cur].bits, tx, iy + (narrow ? 46 : 70), { color: TINT, size: narrow ? 13 : 17, weight: 700 });
        EA.draw.text(ctx, narrow ? '4 bit' : 'accesi: ' + on.size + ' di 16', tx, iy + (narrow ? 62 : 92), { color: C.text, size: 10.5 });
        return;
      }
      // spettro: righe a fc + k·fm (ampiezze lineari)
      const target = new Float32Array(9);
      if (key === 'portante') target[4] = 1;
      if (key === 'am') { target[4] = 1; target[3] = target[5] = AM_M / 2; }
      if (key === 'fm') for (let k = -4; k <= 4; k++) target[k + 4] = Math.abs(FM_J[Math.abs(k)]);
      const kk = live ? 1 - Math.exp(-dt * 5) : 1;
      for (let k = 0; k < 9; k++) spec[k] += (target[k] - spec[k]) * kk;
      EA.draw.text(ctx, 'SPETTRO', ix + (narrow ? 8 : 12), iy + (narrow ? 14 : 18), { color: TINT, size: 10.5, weight: 700 });
      const note = key === 'portante' ? 'una sola riga' : key === 'am' ? 'B = 2·fm' : 'B ≈ 2(Δf + fm)';
      if (!narrow) EA.draw.text(ctx, note, ix + iw - 12, iy + 18, { color: C.cyan, size: 10.5, align: 'right' });
      const base = iy + ih - (narrow ? 15 : 20);
      const top = iy + (narrow ? 30 : 40);
      const cx = ix + iw / 2;
      const sp = (iw - (narrow ? 20 : 28)) / 9;
      if (key !== 'portante') {
        const half = key === 'am' ? 1 : BETA + 1;
        span(ctx, cx - half * sp, cx + half * sp, iy + (narrow ? 22 : 29), C.cyan);
      }
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.beginPath(); ctx.moveTo(ix + 8, base + 0.5); ctx.lineTo(ix + iw - 8, base + 0.5); ctx.stroke();
      ctx.restore();
      for (let k = -4; k <= 4; k++) {
        const a = spec[k + 4];
        if (a < 0.004) continue;
        const x = cx + k * sp;
        const hgt = Math.max(1.5, a * (base - top));
        EA.draw.line(ctx, [[x, base], [x, base - hgt]], TINT, narrow ? 2 : 2.6, a > 0.1);
      }
      EA.draw.text(ctx, 'fc', cx, base + (narrow ? 12 : 14), { color: C.text, size: 10.5, align: 'center' });
      if (key === 'am' && !narrow) {
        EA.draw.text(ctx, '−fm', cx - sp - 2, base + 14, { color: C.text, size: 10.5, align: 'center' });
        EA.draw.text(ctx, '+fm', cx + sp + 2, base + 14, { color: C.text, size: 10.5, align: 'center' });
      }
    }

    function drawTitle(g, key) {
      const ctx = cv.ctx;
      const tx = TEXT[stage];
      const insetOn = key !== 'cariche' && key !== 'onda';
      if (!g.narrow) {
        // se il sottotitolo lungo non sta accanto al riquadro, si usa quello breve
        const room = (insetOn ? g.ix - 14 : g.w - 18) - 18;
        const sub = textWidth(ctx, tx[2], 11) <= room ? tx[2] : tx[3];
        EA.draw.text(ctx, tx[0], 18, 30, { color: C.ink, size: 12.5, weight: 700 });
        EA.draw.text(ctx, sub, 18, 47, { color: C.text, size: 11 });
        return;
      }
      EA.draw.text(ctx, tx[1], 12, 22, { color: C.ink, size: 11.5, weight: 700 });
      const maxW = (insetOn ? g.ix - 10 : g.w - 12) - 12;
      wrap(ctx, tx[3], maxW, 11).slice(0, 2).forEach((ln, n) => EA.draw.text(ctx, ln, 12, 38 + n * 14, { color: C.text, size: 11 }));
    }

    function draw(now, dt) {
      if (!cv.w) return;
      const live = dt > 0;
      const t = now + off;
      if (live) {
        stageT += dt;
        if (stageT > STAGES[stage].dur) {
          stageT = 0;
          stage = (stage + 1) % STAGES.length;
          api.setStep(stage);
          enterLive(stage, t);
        }
      }
      const g = layout();
      const key = STAGES[stage].key;
      prune(t, g);
      fillS(g, t);
      computePsi(g);
      EA.draw.clear(cv);
      drawField(g);
      drawFront(g, t, key);
      const v = g.lambda / T_C;
      const txF = feed(t);
      const rxF = feed(t - (g.xRx - g.xTx) / v);
      drawStations(g, txF, rxF, rxF.amp * 0.85);
      drawNotes(g, key);
      drawStrip(g, t, key);
      drawInset(g, t, key, live, dt);
      drawTitle(g, key);
    }

    setStatic(0, 0);
    const loop = api.loop(draw);
    api.setStep(0);
    return {
      focus(key, i) {
        stage = EA.clamp(i, 0, STAGES.length - 1);
        stageT = 0;
        if (api.playing) enterLive(stage, loop.time + off);
        else setStatic(stage, loop.time);
        api.setStep(stage);
        api.invalidate();
      },
    };
  }

  /* ---------- laboratorio: modulatore e analizzatore ---------- */

  const ALPHA = 0.25;    // roll-off degli impulsi a coseno rialzato
  const NSIM = 20000;    // simboli simulati per misurare il tasso di errore
  const NCLOUD = 1200;   // simboli mostrati nella costellazione
  const MODE_NAMES = { am: 'AM', fm: 'FM', bpsk: 'BPSK', qam16: '16-QAM' };

  // Il più piccolo tra 1, 2, 5 × 10ⁿ che non è minore di x.
  function niceUp(x) {
    const p = Math.pow(10, Math.floor(Math.log10(x)));
    const r = x / p;
    return (r <= 1.0001 ? 1 : r <= 2.0001 ? 2 : r <= 5.0001 ? 5 : 10) * p;
  }

  // Rumore deterministico: una gaussiana per ogni indice intero (il rumore scorre col segnale).
  function hashU(n) {
    let x = Math.imul(n | 0, 0x2c1b3c6d) ^ 0x297a2d39;
    x = Math.imul(x ^ (x >>> 15), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    x ^= x >>> 16;
    return ((x >>> 0) + 0.5) / 4294967296;
  }
  function hashGauss(n) {
    return Math.sqrt(-2 * Math.log(hashU(2 * n))) * Math.cos(TAU * hashU(2 * n + 1));
  }

  function pct(x) {
    const v = x * 100;
    const digits = v >= 10 ? 0 : v >= 1 ? 1 : v >= 0.1 ? 2 : 3;
    return EA.fmt(v, digits) + ' %';
  }

  function mountLab(parts, api) {
    const C = EA.colors;
    if (parts.root) parts.root.classList.add('radio-lab');
    const st = { mode: 'am', fm: 5000, m: 0.8, df: 25000, rs: 1e6, snr: 16, fc: 100e6 };
    let d = null;
    const rand = rng(11);
    const Z = Array.from({ length: 400 }, () => gaussPair(rand));

    const cv = api.canvas(parts.display, { class: 'ea-canvas radio-lab-canvas', label: 'In alto il segnale modulato nel tempo; in basso a sinistra lo spettro attorno alla portante, con la banda occupata e il fondo di rumore; a destra il piano I/Q, con la traiettoria del fasore per AM e FM o la costellazione con i punti ricevuti e i confini di decisione per BPSK e 16-QAM.' });

    const modeCtl = EA.ui.segmented({
      label: 'Modulazione',
      options: [
        { value: 'am', label: 'AM', title: 'Modulazione d\'ampiezza' },
        { value: 'fm', label: 'FM', title: 'Modulazione di frequenza' },
        { value: 'bpsk', label: 'BPSK', title: 'Due fasi: 1 bit per simbolo' },
        { value: 'qam16', label: '16-QAM', title: '16 combinazioni di ampiezza e fase: 4 bit per simbolo' },
      ],
      value: st.mode, color: C.amber,
      onchange: (v) => { st.mode = v; syncControls(); update('mode'); },
    });
    // Un solo cursore per il ritmo del messaggio: frequenza del tono (AM, FM) o velocità
    // di simbolo (BPSK, 16-QAM). Scala logaritmica, posizione da 0 a 1000.
    const isDigital = () => st.mode === 'bpsk' || st.mode === 'qam16';
    const RATE = {
      analog: { min: 200, max: 15000, unit: 'Hz', label: 'Frequenza del messaggio', hint: 'La voce al telefono arriva a circa 4 kHz, la musica in FM fino a 15 kHz.' },
      digital: { min: 1e4, max: 2e7, unit: 'Bd', label: 'Velocità di simbolo', hint: '1 baud = 1 simbolo al secondo. Impulsi a coseno rialzato (α = 0,25): la banda è 1,25 volte la velocità di simbolo.' },
    };
    const rateKind = () => (isDigital() ? RATE.digital : RATE.analog);
    const toPos = (v, r) => (Math.log(v / r.min) / Math.log(r.max / r.min)) * 1000;
    const fromPos = (p, r) => r.min * Math.pow(r.max / r.min, p / 1000);
    const rateS = EA.ui.slider({
      label: RATE.analog.label, min: 0, max: 1000, step: 1, value: toPos(st.fm, RATE.analog), color: C.amber,
      format: (p) => EA.si(fromPos(p, rateKind()), rateKind().unit), hint: RATE.analog.hint,
      oninput: (p) => {
        const v = fromPos(p, rateKind());
        if (isDigital()) st.rs = v; else st.fm = v;
        update(isDigital() ? 'rs' : 'fm');
      },
    });
    const mS = EA.ui.slider({
      label: 'Profondità di modulazione m', min: 0, max: 1.5, step: 0.05, value: st.m, color: C.amber,
      format: (v) => EA.fmt(v, 2), hint: 'Oltre 1 l\'inviluppo si ribalta: sovramodulazione.',
      oninput: (v) => { st.m = v; update('m'); },
    });
    const dfS = EA.ui.slider({
      label: 'Deviazione di frequenza Δf', min: 500, max: 75000, log: true, value: st.df, color: C.amber,
      format: (v) => '±' + EA.si(v, 'Hz'), hint: 'La radio FM arriva a ±75 kHz. β = Δf / fm.',
      oninput: (v) => { st.df = v; update('df'); },
    });
    const snrS = EA.ui.slider({
      label: 'Rapporto segnale-rumore', min: 0, max: 30, step: 0.5, value: st.snr, color: C.cyan,
      format: (v) => EA.fmt(v, 1) + ' dB', hint: ' ',
      oninput: (v) => { st.snr = v; update('snr'); },
    });
    const fcS = EA.ui.slider({
      label: 'Frequenza della portante', min: 3e3, max: 3e11, log: true, value: st.fc, color: C.violet,
      format: (v) => EA.si(v, 'Hz'), hint: ' ',
      oninput: (v) => { st.fc = v; update('fc'); },
    });
    parts.controls.append(modeCtl.el, rateS.el, mS.el, dfS.el, snrS.el, fcS.el);
    const rateLabel = rateS.el.querySelector('.ea-ctl-label');
    const rateHint = rateS.el.querySelector('.ea-ctl-hint');
    const snrHint = snrS.el.querySelector('.ea-ctl-hint');
    const fcHint = fcS.el.querySelector('.ea-ctl-hint');

    const roB = EA.ui.readout({ label: 'Banda occupata' });
    const ro2 = EA.ui.readout({ label: '' });
    const ro3 = EA.ui.readout({ label: '' });
    const ro4 = EA.ui.readout({ label: '' });
    const roL = EA.ui.readout({ label: 'Lunghezza d\'onda' });
    const roD = EA.ui.readout({ label: 'Dipolo a mezz\'onda' });
    parts.readouts.append(roB.el, ro2.el, ro3.el, ro4.el, roL.el, roD.el);
    const setLabel = (ro, text) => { const el = ro.el.querySelector('.ea-ro-label'); if (el.textContent !== text) el.textContent = text; };

    function syncControls() {
      const dig = isDigital();
      const r = rateKind();
      rateLabel.textContent = r.label;
      rateHint.textContent = r.hint;
      rateS.set(toPos(dig ? st.rs : st.fm, r), true);
      mS.el.hidden = st.mode !== 'am';
      dfS.el.hidden = st.mode !== 'fm';
      snrHint.textContent = dig
        ? 'Qui è Es/N0: energia di un simbolo divisa per la densità del rumore.'
        : 'Potenza del segnale divisa per quella del rumore, nella banda occupata.';
    }

    function update(what) {
      const snr = Math.pow(10, st.snr / 10);
      const dig = isDigital();
      d = { dig, snr };
      let say = '';
      if (st.mode === 'am') {
        d.B = amBandwidth(st.fm);
        d.H = niceUp(0.75 * d.B);
        d.lines = amSpectrum(st.m).map((l) => ({ f: l.k * st.fm, a: l.a }));
        d.pg = 1 + (st.m * st.m) / 2;
        const side = sidebandFraction(st.m);
        const out = demodSnr('am', snr, { m: st.m });
        setLabel(ro2, 'Potenza nelle bande laterali');
        ro2.set(pct(side), st.m > 1 ? 'warn' : null);
        setLabel(ro3, 'SNR in uscita (teorico)');
        if (st.m === 0) ro3.set('muto (m = 0)', 'warn');
        else if (st.m > 1) ro3.set('distorto', 'bad');
        else ro3.set(EA.fmt(10 * Math.log10(out), 1) + ' dB', out >= 1000 ? 'good' : out < 10 ? 'bad' : null);
        setLabel(ro4, 'Escursione dell\'inviluppo');
        if (st.m > 1) ro4.set('si ribalta', 'bad');
        else if (st.m === 0) ro4.set('costante', null);
        else ro4.set(EA.fmt(1 - st.m, 2) + ' – ' + EA.fmt(1 + st.m, 2), null);
        say = 'AM: banda occupata ' + EA.si(d.B, 'Hz') + ', bande laterali al ' + pct(side).replace(' %', ' per cento') + ' della potenza' + (st.m > 1 ? ', sovramodulazione.' : '.');
      } else if (st.mode === 'fm') {
        d.beta = st.df / st.fm;
        d.B = carson(st.df, st.fm);
        d.H = niceUp(0.75 * d.B);
        const nMax = Math.min(1500, Math.ceil(d.H / st.fm));
        const J = besselSeries(d.beta, nMax);
        d.lines = [];
        for (let n = -nMax; n <= nMax; n++) d.lines.push({ f: n * st.fm, a: J[Math.abs(n)] });
        d.pg = 1;
        const inside = carsonPowerFraction(d.beta);
        const out = demodSnr('fm', snr, { beta: d.beta });
        setLabel(ro2, 'Indice di modulazione');
        ro2.set('β = ' + EA.fmt(d.beta, d.beta < 10 ? 2 : 0), null);
        setLabel(ro3, 'SNR in uscita (teorico)');
        if (st.snr < FM_THRESHOLD_DB) ro3.set('sotto soglia', 'bad');
        else ro3.set(EA.fmt(10 * Math.log10(out), 1) + ' dB', 'good');
        setLabel(ro4, 'Potenza entro Carson');
        ro4.set(pct(inside), null);
        say = 'FM: indice ' + EA.fmt(d.beta, 1) + ', banda di Carson ' + EA.si(d.B, 'Hz') + '.';
      } else {
        d.M = st.mode === 'bpsk' ? 2 : 16;
        d.k = bitsPerSymbol(d.M);
        d.pts = constellation(st.mode);
        d.B = digitalBandwidth(st.rs, ALPHA);
        d.H = niceUp(1.6 * st.rs);
        d.sim = simulate(st.mode, st.snr, NSIM, 7);
        d.serTh = serTheory(st.mode, snr);
        d.pg = 1;
        d.cap = shannon(snr / (1 + ALPHA)); // SNR nella banda occupata: Es/N0 diviso (1 + α)
        d.eff = d.k / (1 + ALPHA);          // bit al secondo per hertz di banda
        setLabel(ro2, 'Bit per simbolo');
        ro2.set(d.k + ' (' + EA.si(st.rs * d.k, 'bit/s') + ')', null);
        setLabel(ro3, 'SNR per bit');
        const ebn0 = Math.round((st.snr - 10 * Math.log10(d.k)) * 10) / 10;
        ro3.set(EA.fmt(ebn0 || 0, 1) + ' dB', null);
        setLabel(ro4, 'Simboli sbagliati');
        const ser = d.sim.ser;
        ro4.set(d.sim.errors ? pct(ser) : '0 su ' + NSIM.toLocaleString('it-IT'), ser < 1e-3 ? 'good' : ser < 0.05 ? null : 'bad');
        say = MODE_NAMES[st.mode] + ': ' + d.k + ' bit per simbolo, banda ' + EA.si(d.B, 'Hz') + ', ' + d.sim.errors + ' simboli sbagliati su ' + NSIM.toLocaleString('it-IT') + '.';
      }
      d.sigma = Math.sqrt(d.pg / (2 * snr));
      // portante disegnata con pochi cicli per periodo del messaggio: con β grandi anche
      // l'indice mostrato si riduce, perché la frequenza istantanea resti positiva
      d.ncy = EA.clamp(10 * Math.sqrt(5000 / st.fm), 4, 26);
      d.bv = Math.min(d.beta || 0, 0.6 * d.ncy);
      // la banda deve stare tutta sopra 0 Hz: fc − B/2 > 0 (in pratica fc è molto più grande)
      const tooLow = d.B / 2 >= st.fc;
      roB.set(EA.si(d.B, 'Hz'), tooLow ? 'bad' : null);
      const lam = wavelength(st.fc);
      roL.set(EA.si(lam, 'm'));
      roD.set(EA.si(lam / 2, 'm'));
      const b = band(st.fc);
      const sv = service(st.fc);
      fcHint.textContent = tooLow
        ? 'Portante troppo bassa: metà della banda è più larga di fc, e lo spettro scenderebbe sotto 0 Hz.'
        : (b ? b.name + ' · ' + b.it : '') + (sv ? ' · ' + sv : '');
      if (what === 'fc') say = 'Portante ' + EA.si(st.fc, 'Hz') + ': lunghezza d\'onda ' + EA.si(lam, 'm') + ', dipolo a mezz\'onda ' + EA.si(lam / 2, 'm') + '.';
      if (tooLow) say += ' Attenzione: portante troppo bassa per questa banda.';
      api.invalidate();
      if (what) api.announce(say);
    }

    function geo() {
      const w = cv.w;
      const hh = cv.h;
      // impaginazione verticale sui telefoni, e comunque quando il CSS rende il canvas alto
      const narrow = w < 560 || hh > w;
      const px = narrow ? 12 : 18;
      if (!narrow) {
        const tTop = 30;
        const tH = Math.round(hh * 0.33);
        const sTop = tTop + tH + 44;
        const bottom = hh - 34;
        // sotto il piano I/Q restano quattro righe di commento
        const iqS = Math.max(60, Math.min(bottom - sTop - 48, Math.round(w * 0.34)));
        const qx = w - px - iqS;
        return { w, hh, narrow, px, tTop, tH, tW: w - 2 * px, sx: px, sTop, sW: qx - px - 36, sH: bottom - sTop, qx, qy: sTop, iqS, infoX: qx, infoY: sTop + iqS + 17 };
      }
      const tTop = 28;
      const tH = Math.round(hh * 0.22);
      const sTop = tTop + tH + 42;
      const sH = Math.round(hh * 0.25);
      const qy = sTop + sH + 46;
      const iqS = Math.max(60, Math.min(Math.round(w * 0.5), hh - qy - 10));
      return { w, hh, narrow, px, tTop, tH, tW: w - 2 * px, sx: px, sTop, sW: w - 2 * px, sH, qx: px, qy, iqS, infoX: px + iqS + 14, infoY: qy + 12 };
    }

    // Due simboli consecutivi si raccordano dolcemente, come con impulsi sagomati.
    function symIQ(k, f) {
      const P = d.pts;
      const at = (n) => P[d.sim.sent[((n % NCLOUD) + NCLOUD) % NCLOUD]];
      const p = at(k);
      const HW = 0.12;
      if (f < HW) { const o = at(k - 1); const w = EA.smooth(0.5 + f / (2 * HW)); return [o.i + (p.i - o.i) * w, o.q + (p.q - o.q) * w]; }
      if (f > 1 - HW) { const o = at(k + 1); const w = EA.smooth((f - 1 + HW) / (2 * HW)); return [p.i + (o.i - p.i) * w, p.q + (o.q - p.q) * w]; }
      return [p.i, p.q];
    }

    function drawTime(g, t) {
      const ctx = cv.ctx;
      const { px, tTop, tH, tW, narrow } = g;
      EA.draw.text(ctx, 'SEGNALE NEL TEMPO', px, tTop - 10, { color: C.ink, size: 10.5, weight: 700 });
      EA.draw.grid(ctx, px, tTop, tW, tH, { cols: narrow ? 6 : 10, rows: 4 });
      const mid = tTop + tH / 2;
      const ymax = st.mode === 'am' ? Math.max(1.3, (1 + st.m) * 1.08) : d.dig ? 1.55 : 1.3;
      const amp = (tH / 2 - 6) / ymax;
      const clampY = (y) => EA.clamp(y, tTop + 1, tTop + tH - 1);
      const pts = [];
      let base = '';
      // passo di campionamento: almeno 12 punti per ciclo della portante, al massimo 2 px
      const samples = (pxPerCycle) => Math.ceil(tW / EA.clamp(pxPerCycle / 12, 1, 2));
      if (!d.dig) {
        const P = 2;
        const spp = tW / P;
        const ncy = d.ncy;
        const bv = d.bv;
        const tauNow = t * 0.2;
        const env = [];
        const neg = [];
        const pxc = spp / (ncy + bv); // pixel per ciclo, alla frequenza istantanea più alta
        const n = samples(pxc);
        for (let j = 0; j <= n; j++) {
          const x = px + (tW * j) / n;
          const tau = tauNow - (px + tW - x) / spp;
          let s;
          if (st.mode === 'am') {
            const e = 1 + st.m * Math.sin(TAU * tau);
            s = e * Math.cos(TAU * ncy * tau);
            env.push([x, clampY(mid - amp * e)]);
            neg.push([x, clampY(mid + amp * e)]);
          } else {
            s = Math.cos(TAU * ncy * tau - bv * Math.cos(TAU * tau));
            env.push([x, mid - amp * 0.85 * Math.sin(TAU * tau)]);
          }
          s += d.sigma * hashGauss(Math.round(tau * spp));
          pts.push([x, clampY(mid - amp * s)]);
        }
        // alone solo se la traccia è pulita e rada: su una traccia fitta sarebbe solo una macchia
        EA.draw.line(ctx, pts, C.amber, 1.5, d.sigma < 0.2 && pxc >= 20);
        dash(ctx, env, C.cyan, 1.4);
        if (neg.length) dash(ctx, neg, C.cyan, 1.4);
        const word = st.mode === 'am' ? (st.m > 1 ? 'sovramodulazione: l\'inviluppo si ribalta' : 'inviluppo = messaggio') : 'messaggio (la frequenza lo segue)';
        const wcol = st.mode === 'am' && st.m > 1 ? C.red : C.cyan;
        const ww = textWidth(ctx, word, 10.5, 600);
        ctx.save();
        ctx.fillStyle = EA.alpha(C.bg, 0.85);
        ctx.fillRect(px + tW - ww - 12, tTop + 4, ww + 12, 16);
        ctx.restore();
        EA.draw.text(ctx, word, px + tW - 8, tTop + 16, { color: wcol, size: 10.5, align: 'right' });
        base = '2 periodi = ' + EA.si(2 / st.fm, 's');
      } else {
        const NS = narrow ? 5 : 8;
        const spp = tW / NS;
        const sNow = t * 0.8;
        const n = samples(spp / 2);
        for (let j = 0; j <= n; j++) {
          const x = px + (tW * j) / n;
          const u = sNow - (px + tW - x) / spp;
          const k = Math.floor(u);
          const iq = symIQ(k, u - k);
          let s = iq[0] * Math.cos(TAU * 2 * u) - iq[1] * Math.sin(TAU * 2 * u);
          s += d.sigma * hashGauss(Math.round(u * spp));
          pts.push([x, clampY(mid - amp * s)]);
        }
        const kNow = Math.floor(sNow);
        ctx.save();
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = EA.alpha(C.text, 0.35);
        ctx.beginPath();
        for (let k = kNow; k > kNow - NS - 1; k--) {
          const x = px + tW - (sNow - k) * spp;
          if (x > px + 1 && x < px + tW - 1) { ctx.moveTo(Math.round(x) + 0.5, tTop + 22); ctx.lineTo(Math.round(x) + 0.5, tTop + tH); }
        }
        ctx.stroke();
        ctx.restore();
        EA.draw.line(ctx, pts, C.amber, 1.5, d.sigma < 0.2);
        for (let k = kNow; k > kNow - NS - 1; k--) {
          const xc = px + tW - (sNow - k - 0.5) * spp;
          if (xc < px + 14 || xc > px + tW - 14) continue;
          const n = ((k % NCLOUD) + NCLOUD) % NCLOUD;
          const ok = d.sim.ok[n];
          const bits = d.pts[d.sim.sent[n]].bits;
          EA.draw.text(ctx, bits, xc, tTop + 15, { color: !ok ? C.red : k === kNow ? C.amber : C.text, size: 10.5, weight: k === kNow || !ok ? 700 : 600, align: 'center' });
        }
        base = NS + ' simboli = ' + EA.si(NS / st.rs, 's');
      }
      const label = base + (narrow ? '' : ' · portante non in scala');
      const lw = textWidth(ctx, label, 10.5, 600);
      ctx.save();
      ctx.fillStyle = EA.alpha(C.bg, 0.85);
      ctx.fillRect(px + tW - lw - 12, tTop + tH - 18, lw + 12, 15);
      ctx.restore();
      EA.draw.text(ctx, label, px + tW - 8, tTop + tH - 7, { color: C.dim, size: 10.5, align: 'right' });
    }

    function drawSpectrum(g, t) {
      const ctx = cv.ctx;
      const { sx, sTop, sW, sH, narrow } = g;
      EA.draw.text(ctx, 'SPETTRO', sx, sTop - 10, { color: C.ink, size: 10.5, weight: 700 });
      EA.draw.text(ctx, 'attorno a fc = ' + EA.si(st.fc, 'Hz'), sx + 62, sTop - 10, { color: C.text, size: 10.5 });
      const pT = sTop + 24;
      const pB = sTop + sH - 20;
      const DB0 = 3;
      const DB1 = -50;
      const yDb = (v) => pT + ((DB0 - EA.clamp(v, DB1, DB0)) / (DB0 - DB1)) * (pB - pT);
      const cx = sx + sW / 2;
      const xs = (f) => cx + (f / d.H) * (sW / 2);
      // reticolo in dB
      ctx.save();
      ctx.strokeStyle = C.grid2;
      ctx.beginPath();
      for (let v = 0; v >= -40; v -= 10) { const y = Math.round(yDb(v)) + 0.5; ctx.moveTo(sx, y); ctx.lineTo(sx + sW, y); }
      for (let q = -2; q <= 2; q++) { const x = Math.round(cx + (q * sW) / 4) + 0.5; ctx.moveTo(x, pT); ctx.lineTo(x, pB); }
      ctx.stroke();
      ctx.strokeStyle = C.grid;
      ctx.beginPath(); ctx.moveTo(sx, Math.round(pB) + 0.5); ctx.lineTo(sx + sW, Math.round(pB) + 0.5); ctx.stroke();
      ctx.restore();
      // fondo di rumore: lo stesso rumore, letto con una risoluzione pari a B/20 (analogiche)
      // o in rapporto al livello piatto del segnale (digitali: la distanza è proprio Es/N0)
      const floor = d.dig ? -st.snr : 10 * Math.log10(d.pg) - st.snr - 10 * Math.log10(20);
      const slot = Math.floor(t * 8);
      const bin = 3;
      const nb = Math.ceil(sW / bin);
      const noiseAt = (b) => {
        let sum = 0;
        for (let r = 0; r < 4; r++) sum -= Math.log(hashU(b * 4 + r + slot * 7919));
        return floor + 10 * Math.log10(sum / 4);
      };
      if (d.dig) {
        // impulsi rettangolari, per confronto
        const rect = [];
        for (let x = sx; x <= sx + sW; x += 1.5) {
          const v = 10 * Math.log10(Math.max(1e-9, rectPsd(((x - cx) / (sW / 2)) * d.H, st.rs)));
          rect.push(v > DB1 ? [x, yDb(v)] : null);
        }
        dash(ctx, rect, EA.alpha(C.text, 0.7), 1.1, [3, 3]);
        // la potenza del segnale, senza rumore: occupa Rs·(1 + α)
        const f2 = ((1 + ALPHA) * st.rs) / 2;
        const xa = Math.max(sx, xs(-f2));
        const xb = Math.min(sx + sW, xs(f2));
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(xa, pB);
        for (let x = xa; x <= xb; x += 1.5) {
          const v = 10 * Math.log10(Math.max(1e-9, rcPsd(((x - cx) / (sW / 2)) * d.H, st.rs, ALPHA)));
          ctx.lineTo(x, yDb(v));
        }
        ctx.lineTo(xb, pB);
        ctx.closePath();
        ctx.fillStyle = EA.alpha(C.amber, 0.13);
        ctx.fill();
        ctx.restore();
        // quello che misura l'analizzatore: segnale più rumore
        const pts = [];
        for (let b = 0; b <= nb; b++) {
          const x = sx + Math.min(sW, b * bin);
          const f = ((x - cx) / (sW / 2)) * d.H;
          const p = rcPsd(f, st.rs, ALPHA) + Math.pow(10, noiseAt(b) / 10);
          pts.push([x, yDb(10 * Math.log10(p))]);
        }
        EA.draw.line(ctx, pts, C.amber, 1.5, true);
        if (!narrow) {
          const lx = sx + sW - 4;
          tag(ctx, 'coseno rialzato α = 0,25', lx, pT + 12, { color: C.amber, size: 10.5, align: 'right' });
          tag(ctx, '- - impulsi rettangolari', lx, pT + 27, { color: C.text, size: 10.5, align: 'right' });
          const fy = yDb(floor) - 9;
          if (fy > pT + 44 && fy < pB - 6) tag(ctx, 'fondo di rumore', lx, fy, { color: C.text, size: 10.5, align: 'right' });
        }
      } else {
        // righe dello spettro; quando sono tante, un solo tracciato senza alone
        const many = d.lines.length > 40;
        const width = Math.max(1, Math.min(3, ((st.fm / d.H) * (sW / 2)) * 0.35));
        const bars = new Path2D();
        d.lines.forEach((l) => {
          if (Math.abs(l.f) > d.H) return;
          const v = 20 * Math.log10(Math.abs(l.a) + 1e-12);
          if (v < DB1) return;
          const x = xs(l.f);
          if (many) { bars.moveTo(x, pB); bars.lineTo(x, yDb(v)); } else EA.draw.line(ctx, [[x, pB], [x, yDb(v)]], C.amber, width, true);
        });
        if (many) {
          ctx.save();
          ctx.strokeStyle = C.amber;
          ctx.lineWidth = width;
          ctx.stroke(bars);
          ctx.restore();
        }
        // il rumore copre le righe più deboli
        const pts = [];
        for (let b = 0; b <= nb; b++) pts.push([sx + Math.min(sW, b * bin), yDb(noiseAt(b))]);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(sx, pB);
        pts.forEach((p) => ctx.lineTo(p[0], p[1]));
        ctx.lineTo(sx + sW, pB);
        ctx.closePath();
        ctx.fillStyle = EA.alpha('#0d1613', 0.9);
        ctx.fill();
        ctx.restore();
        EA.draw.line(ctx, pts, EA.alpha(C.text, 0.75), 1, false);
        if (!narrow) {
          const fy = Math.max(pT + 30, yDb(floor) - 8);
          if (fy < pB - 6) EA.draw.text(ctx, 'fondo di rumore', sx + sW - 4, fy, { color: C.text, size: 10.5, align: 'right' });
        }
      }
      // banda occupata
      const bx1 = Math.max(sx, xs(-d.B / 2));
      const bx2 = Math.min(sx + sW, xs(d.B / 2));
      span(ctx, bx1, bx2, pT - 9, C.cyan);
      const bl = (st.mode === 'fm' ? 'Carson: ' : 'B = ') + EA.si(d.B, 'Hz');
      const bw = textWidth(ctx, bl, 10.5, 600);
      const lx = bx2 - bx1 > bw + 16 ? (bx1 + bx2) / 2 : Math.min(sx + sW - bw / 2, bx2 + bw / 2 + 8);
      ctx.save();
      ctx.fillStyle = EA.alpha(C.bg, 0.92);
      ctx.fillRect(lx - bw / 2 - 4, pT - 22, bw + 8, 13);
      ctx.restore();
      EA.draw.text(ctx, bl, lx, pT - 12, { color: C.cyan, size: 10.5, align: 'center' });
      // assi
      [0, -20, -40].forEach((v) => tag(ctx, v === 0 ? '0 dB' : EA.fmt(v), sx + 6, yDb(v) - 3, { color: C.dim, size: 10.5 }));
      const ticks = narrow ? [-1, 0, 1] : [-1, -0.5, 0, 0.5, 1];
      ticks.forEach((q) => {
        const f = q * d.H;
        const lab = q === 0 ? 'fc' : (f > 0 ? '+' : '') + EA.si(f, 'Hz', 2);
        EA.draw.text(ctx, lab, cx + (q * sW) / 2, pB + 14, { color: q === 0 ? C.ink : C.dim, size: 10.5, align: q === -1 ? 'left' : q === 1 ? 'right' : 'center' });
      });
    }

    function drawIQ(g, t) {
      const ctx = cv.ctx;
      const { qx, qy, iqS, narrow } = g;
      const title = d.dig ? 'COSTELLAZIONE' : 'PIANO I/Q';
      EA.draw.text(ctx, title, qx, qy - 10, { color: C.ink, size: 10.5, weight: 700 });
      EA.draw.text(ctx, d.dig ? MODE_NAMES[st.mode] : 'fasore', qx + textWidth(ctx, title, 10.5, 700) + 8, qy - 10, { color: C.text, size: 10.5 });
      ctx.save();
      ctx.fillStyle = '#08100e';
      ctx.strokeStyle = C.grid;
      rrect(ctx, qx + 0.5, qy + 0.5, iqS - 1, iqS - 1, 8);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      const R = iqS / 2;
      const cx = qx + R;
      const cy = qy + R;
      const rmax = st.mode === 'am' ? Math.max(1.35, (1 + st.m) * 1.12) : d.dig ? 1.55 : 1.35;
      const sc = (R - 6) / rmax;
      const P = (i, q) => [cx + i * sc, cy - q * sc];
      ctx.save();
      rrect(ctx, qx + 1, qy + 1, iqS - 2, iqS - 2, 8);
      ctx.clip();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(qx, Math.round(cy) + 0.5); ctx.lineTo(qx + iqS, Math.round(cy) + 0.5);
      ctx.moveTo(Math.round(cx) + 0.5, qy); ctx.lineTo(Math.round(cx) + 0.5, qy + iqS);
      ctx.stroke();
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = EA.alpha(C.text, 0.3);
      ctx.beginPath(); ctx.arc(cx, cy, sc, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      const info = [];
      if (d.dig) {
        // confini di decisione
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = EA.alpha(C.violet, 0.55);
        ctx.beginPath();
        const cuts = st.mode === 'bpsk' ? [0] : [-2 / Math.sqrt(10), 0, 2 / Math.sqrt(10)];
        cuts.forEach((c) => {
          const x = Math.round(cx + c * sc) + 0.5;
          ctx.moveTo(x, qy); ctx.lineTo(x, qy + iqS);
          if (st.mode !== 'bpsk') { const y = Math.round(cy - c * sc) + 0.5; ctx.moveTo(qx, y); ctx.lineTo(qx + iqS, y); }
        });
        ctx.stroke();
        ctx.setLineDash([]);
        const sim = d.sim;
        const n = Math.min(NCLOUD, sim.sent.length);
        ctx.fillStyle = EA.alpha(C.amber, 0.5);
        for (let k = 0; k < n; k++) { if (!sim.ok[k]) continue; const p = P(sim.i[k], sim.q[k]); ctx.fillRect(p[0] - 1, p[1] - 1, 2, 2); }
        ctx.fillStyle = C.red;
        for (let k = 0; k < n; k++) { if (sim.ok[k]) continue; const p = P(sim.i[k], sim.q[k]); ctx.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3); }
        d.pts.forEach((pt) => {
          const p = P(pt.i, pt.q);
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(p[0], p[1], 3.2, 0, TAU); ctx.stroke();
          if (st.mode === 'bpsk') EA.draw.text(ctx, pt.bits, p[0], p[1] - 10, { color: C.ink, size: 11, weight: 700, align: 'center' });
        });
        // il simbolo più recente: il rumore lo sposta, il ricevitore sceglie il punto più vicino
        const kNow = Math.floor(t * 0.8);
        const idx = ((kNow % NCLOUD) + NCLOUD) % NCLOUD;
        const good = sim.ok[idx] === 1;
        const ideal = d.pts[sim.sent[idx]];
        const pr = P(sim.i[idx], sim.q[idx]);
        const pi = P(ideal.i, ideal.q);
        EA.draw.line(ctx, [pi, pr], good ? C.ink : C.red, 1.2, false);
        EA.draw.dot(ctx, pr[0], pr[1], 3.2, good ? C.amber : C.red);
        ctx.strokeStyle = good ? C.ink : C.red;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(pr[0], pr[1], 7, 0, TAU); ctx.stroke();
        info.push(['errori: ' + d.sim.errors.toLocaleString('it-IT') + ' su ' + NSIM.toLocaleString('it-IT'), d.sim.errors ? C.ink : C.green]);
        info.push(['teoria: ' + pct(d.serTh), C.text]);
        if (narrow) info.push([d.k + ' bit per simbolo', C.text]);
        // efficienza della modulazione e massimo teorico di Shannon con questo SNR
        info.push(['limite di Shannon: ' + EA.fmt(d.cap, 1) + ' bit/s/Hz', C.text]);
        info.push([MODE_NAMES[st.mode] + ' ne usa ' + EA.fmt(d.eff, 1), d.eff > d.cap ? C.red : C.text]);
      } else {
        // nuvola di campioni rumorosi lungo la traiettoria del fasore
        const env = (tau) => {
          if (st.mode === 'am') return [1 + st.m * Math.sin(TAU * tau), 0];
          const ph = -d.beta * Math.cos(TAU * tau);
          return [Math.cos(ph), Math.sin(ph)];
        };
        ctx.fillStyle = EA.alpha(C.amber, 0.4);
        Z.forEach((z, k) => {
          const e = env(k / Z.length);
          const p = P(e[0] + d.sigma * z[0], e[1] + d.sigma * z[1]);
          ctx.fillRect(p[0] - 1, p[1] - 1, 2, 2);
        });
        // traiettoria: un segmento per l'AM, un arco di ±β (o il cerchio intero) per l'FM
        const path = [];
        if (st.mode === 'am') for (let k = 0; k <= 160; k++) path.push(P(...env(k / 160)));
        else {
          const b = Math.min(d.beta, Math.PI);
          for (let k = 0; k <= 160; k++) { const ph = -b + (2 * b * k) / 160; path.push(P(Math.cos(ph), Math.sin(ph))); }
        }
        EA.draw.line(ctx, path, C.amber, 2, true);
        // la punta si muove al ritmo del grafico nel tempo (con β grandi, rallentata come lì)
        const tau = t * 0.2;
        const ph = -d.bv * Math.cos(TAU * tau);
        const e = st.mode === 'am' ? env(tau) : [Math.cos(ph), Math.sin(ph)];
        const tip = P(e[0], e[1]);
        EA.draw.arrow(ctx, cx, cy, tip[0], tip[1], C.ink, 1.8, 8);
        EA.draw.dot(ctx, tip[0], tip[1], 3, C.ink);
        if (st.mode === 'am') {
          info.push(['il fasore cambia solo lunghezza', C.ink]);
          info.push(st.m > 1 ? ['passa dallo zero: si ribalta', C.red] : ['da ' + EA.fmt(1 - st.m, 2) + ' a ' + EA.fmt(1 + st.m, 2), C.text]);
        } else {
          info.push(['lunghezza fissa, ruota di ±' + EA.fmt(d.beta, d.beta < 10 ? 2 : 0) + ' rad', C.ink]);
          info.push([d.beta > Math.PI ? 'oltre ±π: compie giri interi' : 'la fase segue il messaggio', C.text]);
        }
      }
      ctx.restore();
      // nomi degli assi su fondo scuro: restano leggibili anche sopra la nuvola di punti
      tag(ctx, 'I', qx + iqS - 10, cy - 7, { color: C.dim, size: 10.5, align: 'center' });
      tag(ctx, 'Q', cx + 10, qy + 15, { color: C.dim, size: 10.5, align: 'center' });
      const maxW = narrow ? g.w - g.infoX - 8 : iqS;
      let y = g.infoY;
      info.forEach(([txt, col]) => {
        wrap(ctx, txt, maxW, 10.5).forEach((ln) => { EA.draw.text(ctx, ln, g.infoX, y, { color: col, size: 10.5 }); y += 15; });
        if (narrow) y += 5;
      });
    }

    function draw(t) {
      if (!cv.w || !d) return;
      const g = geo();
      EA.draw.clear(cv);
      drawTime(g, t);
      drawSpectrum(g, t);
      drawIQ(g, t);
    }

    api.loop(draw);
    syncControls();
    update();
  }

  /* ---------- contenuti ---------- */

  EA.register({
    id: 'radio',
    intro: [
      'Nel 1865 James Clerk Maxwell ricavò dalle sue equazioni che un campo elettrico e un campo magnetico che variano nel tempo possono staccarsi dalle cariche e viaggiare da soli, alla velocità della luce: <strong>la luce stessa è un\'onda elettromagnetica</strong>. Poco più di vent\'anni dopo Heinrich Hertz generò e rivelò in laboratorio onde della stessa natura, invisibili e molto più lunghe, e nel 1895, vicino a Bologna, il ventunenne Guglielmo Marconi le usò per mandare segnali oltre una collina. Erano nate le <em>onde radio</em>.',
      'Per lanciare un\'onda radio basta far oscillare delle cariche in un conduttore, l\'<em>antenna</em>. A ogni mezza oscillazione le linee del campo elettrico si richiudono in un anello che si stacca e si allontana alla velocità <var>c</var>, circa 300 000 km al secondo. La distanza tra due anelli uguali è la <strong>lunghezza d\'onda</strong> λ = <var>c</var>/<var>f</var>: a 100 MHz è di 3 metri, e un\'antenna efficiente, il dipolo a mezz\'onda, è lunga circa la metà.',
      'Un\'onda sempre uguale, la <em>portante</em>, non dice niente. Per trasportare voce e musica bisogna <strong>modularla</strong>, cioè variarne l\'ampiezza (AM) o la frequenza (FM) seguendo il suono. Con i dati la modulazione procede a scatti: si cambia l\'ampiezza, fino ad accendere e spegnere la portante come nel Morse dei radiotelegrafisti (ASK), se ne inverte la fase (PSK), oppure si cambiano ampiezza e fase insieme, saltando tra i punti di una costellazione (QAM). Ogni scelta ha un prezzo in banda occupata e in resistenza al rumore: è lo stesso compromesso che si ritrova dalla radio in onde medie fino al Wi-Fi e al 5G.',
      'Come l\'onda arriva a destinazione dipende dalla frequenza. Le onde lunghe e medie seguono la curvatura della Terra; le onde corte rimbalzano sulla <em>ionosfera</em>, lo strato di gas ionizzato tra circa 60 e 1000 km di quota, e possono fare il giro del mondo; sopra qualche decina di MHz l\'onda la attraversa e a terra arriva solo in linea retta, come la luce, fino all\'orizzonte. Al ricevitore giunge una frazione minuscola della potenza, mescolata al rumore: per questo conta il <strong>rapporto segnale-rumore</strong>, e per questo il ricevitore <em>supereterodina</em>, inventato nel 1918 e usato ancora oggi, sposta la stazione scelta su una frequenza intermedia fissa, dove filtrarla e amplificarla è più facile.',
    ],
    steps: [
      { title: 'Le cariche oscillano', text: 'Un generatore spinge gli elettroni su e giù lungo i due bracci dell\'antenna. La corrente è massima al centro e nulla alle estremità, dove le cariche si accumulano: positive da una parte, negative dall\'altra, poi si scambiano. Nell\'animazione le frecce sono la corrente, i pallini rossi e azzurri le cariche.', focus: 'cariche' },
      { title: 'Il campo si stacca e viaggia', text: 'Le linee del campo elettrico partono dalle cariche. Quando le cariche si invertono, le linee si richiudono su se stesse, si staccano dall\'antenna e corrono via alla velocità della luce; tra due anelli uguali c\'è una lunghezza d\'onda, λ = c/f. Qui l\'antenna si spegne per un istante: gli anelli già partiti proseguono da soli, e il ricevitore si riaccende solo quando lo raggiunge il nuovo fronte d\'onda.', focus: 'onda' },
      { title: 'La portante', text: 'Un\'onda con ampiezza e frequenza sempre uguali è la portante. Arriva al ricevitore, ma non porta alcuna informazione: nello spettro è una sola riga, alla sua frequenza fc.', focus: 'portante' },
      { title: 'AM: l\'ampiezza segue la voce', text: 'Il microfono trasforma la voce in un segnale elettrico (qui, per chiarezza, un tono puro) che fa crescere e calare l\'ampiezza della portante. L\'inviluppo ricalca il messaggio e nello spettro compaiono due bande laterali.', focus: 'am' },
      { title: 'FM: la frequenza segue la voce', text: 'Ora l\'ampiezza resta costante e cambia la frequenza: le onde si infittiscono quando il messaggio sale e si diradano quando scende. Lo spettro si riempie di righe e la banda occupata cresce.', focus: 'fm' },
      { title: 'QAM: simboli digitali', text: 'Per i dati, ampiezza e fase saltano tra 16 combinazioni prefissate. Ogni simbolo è un punto della costellazione, cioè una freccia con la sua lunghezza (l\'ampiezza) e il suo angolo (la fase), e porta 4 bit: guarda la costellazione accendersi punto per punto.', focus: 'qam' },
    ],
    formulas: [
      { label: 'Lunghezza d\'onda', eq: 'λ = <var>c</var> ⁄ <var>f</var>', text: 'È la distanza che l\'onda percorre in un periodo. Con <var>c</var> = 1/√(<var>μ</var><sub>0</sub><var>ε</var><sub>0</sub>) ≈ 299 792 km/s, a 100 MHz λ ≈ 3 m: un dipolo a mezz\'onda misura circa 1,5 m, a 2,4 GHz appena 6 cm.' },
      { label: 'Modulazione d\'ampiezza', eq: '<var>s</var>(<var>t</var>) = <var>A</var><sub>c</sub>[1 + <var>m</var>·<var>x</var>(<var>t</var>)]<br>· cos(2π<var>f</var><sub>c</sub><var>t</var>)', text: 'Con |<var>x</var>| ≤ 1 e 0 ≤ <var>m</var> ≤ 1 l\'inviluppo ricalca il messaggio; oltre <var>m</var> = 1 si ribalta (sovramodulazione). Portante e due bande laterali occupano <var>B</var> = 2<var>f</var><sub>m</sub>.' },
      { label: 'FM e regola di Carson', eq: '<var>B</var> ≈ 2(Δ<var>f</var> + <var>f</var><sub>m</sub>)', text: 'Δ<var>f</var> è lo scostamento massimo di frequenza e <var>β</var> = Δ<var>f</var>/<var>f</var><sub>m</sub> l\'indice di modulazione. Le righe hanno ampiezze date dalle funzioni di Bessel <var>J<sub>n</sub></var>(<var>β</var>). Per la radio FM, con Δ<var>f</var> = 75 kHz e <var>f</var><sub>m</sub> = 15 kHz, <var>B</var> ≈ 180 kHz.' },
      { label: 'Bit per simbolo', eq: '<var>R</var><sub>b</sub> = <var>R</var><sub>s</sub> · log<sub>2</sub> <var>M</var>', text: 'Una costellazione di <var>M</var> punti porta log<sub>2</sub> <var>M</var> bit per simbolo: BPSK 1, 16-QAM 4, 4096-QAM 12. Più punti nella stessa banda danno più bit al secondo, ma i punti si avvicinano e serve più rapporto segnale-rumore.' },
      { label: 'Limite di Shannon', eq: '<var>C</var> = <var>B</var> · log<sub>2</sub>(1 + <var>S</var>/<var>N</var>)', text: 'È il massimo di bit al secondo che un canale largo <var>B</var> può trasportare senza errori, con il miglior codice correttore possibile; <var>S</var>/<var>N</var> è il rapporto segnale-rumore, non in decibel. Per ogni hertz di banda: 1 bit/s a 0 dB, circa 3,5 a 10 dB, 6,7 a 20 dB. La 16-QAM del laboratorio ne usa 3,2: sotto circa 10 dB chiede più di quanto il canale possa dare.' },
    ],
    timeline: [
      { year: 1865, title: 'La luce è un\'onda elettromagnetica', who: 'James Clerk Maxwell, Londra', text: 'Nella memoria «A Dynamical Theory of the Electromagnetic Field», letta alla Royal Society nel dicembre 1864 e pubblicata nel 1865, Maxwell ricava onde elettromagnetiche la cui velocità, calcolata da misure elettriche (circa 310 000 km/s con i dati di allora), coincide con quella della luce.' },
      { year: 1888, title: 'Hertz genera e rivela le onde', who: 'Heinrich Hertz, Politecnico di Karlsruhe', text: 'Tra il 1886 e il 1888 produce onde con un oscillatore a scintilla e le rivela a distanza con un risonatore, un anello di filo aperto in cui scocca una scintilla minuscola. Mostra che si riflettono, si rifrangono, sono polarizzate e viaggiano alla velocità della luce. Secondo l\'IEEE i suoi apparati lavoravano intorno a 450 MHz.' },
      { year: 1895, title: 'Il segnale scavalca la collina', who: 'Guglielmo Marconi, Villa Griffone, Pontecchio (Bologna)', text: 'Dopo le prove al chiuso del 1894, tra l\'estate e l\'autunno del 1895 Marconi collega un trasmettitore a scintilla, derivato dall\'oscillatore di Augusto Righi, a un\'antenna verticale e a una lastra interrata. Riceve i segnali oltre la collina dei Celestini, a circa 2 km, con un coherer: un tubetto di limatura metallica che diventa conduttore quando arriva l\'onda. Il brevetto britannico, chiesto nel 1896, gli viene concesso nel 1897.' },
      { year: 1901, title: 'Attraverso l\'Atlantico, forse', who: 'Guglielmo Marconi e George Kemp, da Poldhu (Cornovaglia) a Terranova', text: 'Il 12 dicembre 1901 Marconi annuncia di aver udito in cuffia la lettera S dell\'alfabeto Morse, trasmessa a circa 3500 km di distanza, con un\'antenna sollevata da un aquilone. La ricezione, debole e non registrata, è ancora discussa. Nel 1909 Marconi e Ferdinand Braun ricevono il Nobel per la fisica per la telegrafia senza fili.' },
      { year: 1906, title: 'La voce viaggia via radio', who: 'Reginald Fessenden, Brant Rock (Massachusetts)', text: 'Il 21 dicembre 1906 Fessenden dimostra in pubblico la radiotelefonia in modulazione d\'ampiezza, con un alternatore ad alta frequenza che genera una portante continua al posto delle scintille. La famosa trasmissione di musica della vigilia di Natale è raccontata solo da lui, in una lettera del 1932.' },
      { year: 1918, title: 'Nasce la supereterodina', who: 'Edwin H. Armstrong a Parigi; indipendentemente Lucien Lévy e Walter Schottky', text: 'Il segnale dell\'antenna viene mescolato con un oscillatore locale e portato a una frequenza intermedia fissa, dove amplificarlo e filtrarlo è molto più facile. Armstrong chiede il brevetto negli Stati Uniti nel 1919, ma Lévy ne aveva già depositato uno in Francia nel 1917, e un tribunale statunitense gli riconobbe la priorità.' },
      { year: 1933, title: 'La FM a larga banda', who: 'Edwin H. Armstrong, Columbia University, New York', text: 'Il 26 dicembre 1933 Armstrong ottiene quattro brevetti sulla modulazione di frequenza. La sua FM usa una deviazione molto più ampia della banda audio e così riduce drasticamente scariche e rumore. Presenta il sistema all\'Institute of Radio Engineers nel novembre 1935.' },
      { year: 1991, title: 'Il cellulare diventa digitale', who: 'Harri Holkeri e Kaarina Suonio, rete Radiolinja (Finlandia)', text: 'Il 1° luglio 1991 l\'ex primo ministro finlandese Harri Holkeri chiama la vicesindaca di Tampere: è la prima telefonata ufficiale su una rete GSM, a 900 MHz. La voce viaggia digitalizzata, con una modulazione digitale a inviluppo costante (GMSK) su canali larghi 200 kHz.' },
      { year: 2019, title: 'Le prime reti 5G per smartphone', who: 'Operatori della Corea del Sud e Verizon (Stati Uniti)', text: 'Il 3 aprile 2019 partono i primi servizi 5G commerciali per smartphone, basati su OFDM: migliaia di sottoportanti modulate in QAM, con una costellazione che si adatta alla qualità del canale. Il primato è conteso: AT&T aveva lanciato a fine 2018 un 5G per soli hotspot mobili.' },
      { year: 2024, title: 'Wi-Fi 7: 12 bit per simbolo', who: 'Wi-Fi Alliance e gruppo di lavoro IEEE 802.11 (standard 802.11be)', text: 'L\'8 gennaio 2024 parte la certificazione Wi-Fi 7: canali larghi fino a 320 MHz nella banda dei 6 GHz e una costellazione di 4096 punti, cioè 12 bit per simbolo, che si può usare solo con un segnale fortissimo e pulito. Lo standard IEEE 802.11be viene approvato il 26 settembre 2024; il primo 802.11, nel 1997, arrivava a 2 Mbit/s.' },
    ],
    fun: 'Nel 1894 Augusto Righi, a Bologna, generava onde lunghe pochi centimetri: microonde intorno ai 10 GHz, la stessa gamma della TV satellitare di oggi. Marconi, che voleva arrivare lontano, fece il contrario: aggiunse all\'oscillatore di Righi un\'antenna verticale e una lastra a terra, e le onde si allungarono. E, contrariamente a quanto si racconta spesso, Marconi non fu mai allievo di Righi: lo incontrò più volte, ma fu lo stesso Righi a precisarlo nel 1897.',
    uses: [
      'Radio AM, FM e DAB+',
      'Telefonia 4G e 5G (OFDM e QAM adattiva)',
      'Wi-Fi fino a 4096-QAM e Bluetooth',
      'TV digitale terrestre e satellitare',
      'Navigazione satellitare GPS e Galileo',
      'Radio aeronautica in AM (118–137 MHz)',
      'NFC, RFID e carte contactless (13,56 MHz)',
      'Radar meteo, aerei e per auto (77 GHz)',
      'Radioastronomia',
    ],
    glossary: [
      { term: 'Portante', def: 'Onda sinusoidale ad alta frequenza <var>f</var><sub>c</sub> che trasporta il messaggio. Da sola non porta informazione, ma fissa la lunghezza d\'onda e quindi la taglia dell\'antenna.' },
      { term: 'Bande laterali', def: 'Le righe che la modulazione crea ai lati della portante: in AM a <var>f</var><sub>c</sub> ± <var>f</var><sub>m</sub>, in FM a <var>f</var><sub>c</sub> ± <var>n f</var><sub>m</sub>. Contengono l\'informazione e decidono la banda occupata.' },
      { term: 'Indice di modulazione', def: 'Quanto il messaggio modifica la portante: in AM la profondità <var>m</var> (oltre 1 c\'è sovramodulazione), in FM <var>β</var> = Δ<var>f</var>/<var>f</var><sub>m</sub>.' },
      { term: 'Piano I/Q e fasore', def: 'Una sinusoide si può disegnare come una freccia che ruota, il <em>fasore</em>: la lunghezza è l\'ampiezza, l\'angolo è la fase. Nel piano I/Q la freccia si guarda rispetto alla portante: I è la parte in fase con la portante, Q quella sfasata di 90°, in quadratura.' },
      { term: 'Costellazione', def: 'I simboli di una modulazione digitale disegnati come punti nel piano I/Q. Con <var>M</var> punti ogni simbolo porta log<sub>2</sub> <var>M</var> bit; il ricevitore sceglie il punto ideale più vicino a quello ricevuto.' },
      { term: 'Baud', def: 'Unità della velocità di simbolo: 1 baud è un simbolo al secondo. Con 4 bit per simbolo, 1 megabaud trasporta 4 Mbit/s.' },
      { term: 'SNR', def: 'Rapporto segnale-rumore, di solito in decibel: +3 dB è circa il doppio della potenza, +10 dB dieci volte. Nei sistemi digitali si usano <var>E</var><sub>s</sub>/<var>N</var><sub>0</sub> (per simbolo) o <var>E</var><sub>b</sub>/<var>N</var><sub>0</sub> (per bit).' },
      { term: 'Ionosfera', def: 'Strato dell\'alta atmosfera, tra circa 60 e 1000 km di quota, ionizzato dalla radiazione del Sole. Riflette le onde corte, che così superano l\'orizzonte; le frequenze più alte la attraversano.' },
      { term: 'Supereterodina', def: 'Ricevitore che mescola il segnale d\'antenna con un oscillatore locale e lo trasla, modulazione compresa, a una frequenza intermedia fissa (455 kHz in AM, 10,7 MHz in FM), dove filtrarlo e amplificarlo.' },
      { term: 'OFDM', def: 'Divisione di frequenza ortogonale: i dati viaggiano su molte sottoportanti vicine, ciascuna modulata in QAM a bassa velocità e tutte generate insieme con una FFT. È alla base di Wi-Fi, 4G, 5G, DAB+ e TV digitale.' },
    ],
    sources: [
      { title: 'Maxwell, A Dynamical Theory of the Electromagnetic Field (Royal Society, Making Science)', url: 'https://makingscience.royalsociety.org/items/pt_72_7/paper-a-dynamical-theory-of-the-electromagnetic-field-by-j-james-clerk-maxwell' },
      { title: 'IEEE Milestone: First Generation and Experimental Proof of Electromagnetic Waves, 1886-1888 (ETHW)', url: 'https://ethw.org/Milestones:First_Generation_and_Experimental_Proof_of_Electromagnetic_Waves,_1886-1888' },
      { title: 'Museo Marconi: l\'antenna del 1895', url: 'https://www.museomarconi.it/apparati_museo/antenna-1895/' },
      { title: 'Museo Marconi: Augusto Righi', url: 'https://www.museomarconi.it/apparati_museo/righi/' },
      { title: 'The Nobel Prize in Physics 1909 (NobelPrize.org)', url: 'https://www.nobelprize.org/prizes/physics/1909/summary/' },
      { title: 'Armstrong Papers: The Superheterodyne (Columbia University Libraries)', url: 'https://blogs.library.columbia.edu/armstrongpapers/2010/05/17/the-superheterodyne/' },
      { title: 'ITU-R BS.450: standard per la radiodiffusione FM in VHF', url: 'https://www.itu.int/rec/R-REC-BS.450' },
      { title: 'Panoramica dell\'OFDM nel Wi-Fi 802.11 (Keysight)', url: 'https://helpfiles.keysight.com/csg/89600B/Webhelp/Subsystems/wlan-ofdm/content/ofdm_80211-overview.htm' },
    ],
    hero: {
      caption: 'Un dipolo a mezz\'onda lancia anelli di campo elettrico verso l\'antenna ricevente; in basso il segnale trasmesso. Tempi molto rallentati: a 100 MHz un\'oscillazione dura 10 ns.',
      label: 'Animazione: un dipolo irradia onde radio verso un\'antenna ricevente, con portante, AM, FM e 16-QAM',
      aspect: '16 / 7',
      aspectMobile: '1 / 1',
      mount: mountHero,
    },
    lab: {
      title: 'Modulatore e analizzatore',
      intro: 'Scegli una modulazione e guarda insieme forma d\'onda, spettro e piano I/Q. Cambia il messaggio, la profondità o la deviazione e osserva la banda occupata; abbassa il rapporto segnale-rumore e conta i simboli sbagliati. La frequenza della portante decide quanto è lunga l\'antenna.',
      mount: mountLab,
    },
    model,
  });
})(typeof window !== 'undefined' ? window : globalThis);
