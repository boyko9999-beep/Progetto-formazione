/*
 * Capitolo 5 · Dal continuo ai numeri (conversione analogico-digitale).
 * Animazione: un'onda continua attraversa il campionatore; i campioni scattano sui
 * livelli di quantizzazione, diventano bit (PCM, con un SAR al rallentatore), un DAC
 * e un filtro li riportano a una curva; infine un segnale troppo veloce genera un alias.
 * Laboratorio: campionamento con bit, ricostruzione, errore e ripiegamento dello spettro.
 */
(function (root) {
  'use strict';

  const EA = root.EA;
  const TAU = Math.PI * 2;
  const TINT = '#b49cff';

  /* ---------- modello ---------- */

  const sinc = (x) => (Math.abs(x) < 1e-12 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));

  // Frequenza di Nyquist: metà della frequenza di campionamento.
  const nyquist = (fs) => fs / 2;

  // Scarto con segno dal multiplo di fs più vicino: f − k·fs, con k = round(f/fs).
  // Se è negativo l'alias ha la fase invertita: la ruota "gira all'indietro".
  const aliasSigned = (f, fs) => f - Math.round(f / fs) * fs;

  // Frequenza apparente dopo il campionamento, ripiegata in 0…fs/2.
  const alias = (f, fs) => Math.abs(aliasSigned(f, fs));

  // Passo di quantizzazione (LSB) di un convertitore a N bit con fondo scala vfs.
  const lsb = (vfs, bits) => vfs / Math.pow(2, bits);

  // Valore efficace del rumore di quantizzazione: errore uniforme entro ±½ LSB.
  const noiseRms = (step) => step / Math.sqrt(12);

  // SNR ideale per una sinusoide a fondo scala, in dB: 6,02·N + 1,76.
  const snrIdeal = (bits) => 20 * Math.log10(2) * bits + 10 * Math.log10(1.5);

  // Bit da trasmettere ogni secondo: fs × N × canali.
  const bitRate = (fs, bits, channels) => fs * bits * (channels || 1);

  // Codice di un valore x nel campo −1…+1 (fondo scala 2): da 0 a 2^N − 1.
  function code(x, bits) {
    const n = Math.pow(2, bits);
    return Math.min(n - 1, Math.max(0, Math.floor(((x + 1) / 2) * n)));
  }

  // Livello di un codice: il centro del suo intervallo.
  const level = (c, bits) => -1 + ((c + 0.5) * 2) / Math.pow(2, bits);

  // Quantizzazione uniforme: ogni valore va al livello più vicino.
  const quantize = (x, bits) => level(code(x, bits), bits);

  // Codice scritto in binario con N cifre.
  const binary = (c, bits) => c.toString(2).padStart(bits, '0');

  // ADC ad approssimazioni successive: tensione v nel campo 0…vfs.
  // Prova un bit alla volta dal più significativo e lo tiene se v supera la soglia.
  function sar(v, bits, vfs) {
    const step = vfs / Math.pow(2, bits);
    const steps = [];
    let c = 0;
    for (let b = bits - 1; b >= 0; b--) {
      const trial = c | (1 << b);
      const threshold = trial * step;
      const keep = v >= threshold;
      if (keep) c = trial;
      steps.push({ bit: b, trial, threshold, keep });
    }
    return { code: c, steps };
  }

  // Ricostruzione all'istante u (misurato in periodi di campionamento) dai campioni sample(n):
  // 'gradini' tiene l'ultimo valore (DAC senza filtro), 'lineare' unisce i punti,
  // 'sinc' è il filtro passa-basso ideale, troncato a `span` campioni per lato.
  function reconstruct(sample, u, mode, span) {
    const n0 = Math.floor(u);
    if (mode === 'gradini') return sample(n0);
    if (mode === 'lineare') {
      const a = u - n0;
      return sample(n0) * (1 - a) + sample(n0 + 1) * a;
    }
    const r = Math.round(u);
    if (Math.abs(u - r) < 1e-9) return sample(r);
    const M = span || 32;
    const s = Math.sin(Math.PI * u) / Math.PI;
    let y = 0;
    // sin(π(u − n)) = (−1)^n · sin(πu): un solo seno per ogni istante
    for (let n = n0 - M + 1; n <= n0 + M; n++) y += (sample(n) * (n % 2 ? -s : s)) / (u - n);
    return y;
  }

  // SNR misurato: `count` campioni di una sinusoide di ampiezza amp quantizzati a N bit.
  function snrMeasured(f, fs, bits, amp, count, phase) {
    const a = amp == null ? 1 : amp;
    const n = count || 4096;
    const ph = phase == null ? 0.4 : phase;
    let ps = 0;
    let pe = 0;
    for (let i = 0; i < n; i++) {
      const x = a * Math.sin((TAU * f * i) / fs + ph);
      const e = quantize(x, bits) - x;
      ps += x * x;
      pe += e * e;
    }
    if (ps === 0) return -Infinity;
    return pe > 0 ? 10 * Math.log10(ps / pe) : Infinity;
  }

  // Filtro anti-aliasing di Butterworth: guadagno a frequenza f, taglio fc, ordine n.
  const butterworth = (f, fc, order) => 1 / Math.sqrt(1 + Math.pow(f / fc, 2 * order));

  // Guadagno del sovracampionamento semplice (senza noise shaping): 3 dB per raddoppio.
  const oversampling = (ratio) => 10 * Math.log10(ratio);

  // Comparatori di un ADC flash a N bit.
  const flashComparators = (bits) => Math.pow(2, bits) - 1;

  const model = {
    sinc, nyquist, aliasSigned, alias, lsb, noiseRms, snrIdeal, bitRate,
    code, level, quantize, binary, sar, reconstruct, snrMeasured,
    butterworth, oversampling, flashComparators,
  };

  /* ---------- animazione principale: dal continuo ai numeri e ritorno ---------- */

  const HERO_TS = 0.5;               // periodo di campionamento, in secondi di segnale
  const HERO_BITS = 3;               // 8 livelli: gradini abbastanza grandi da vedere l'errore
  const HERO_PH = 0.55;              // fase dell'onda all'istante zero
  const HERO_F = 1 / (8 * HERO_TS);  // 8 campioni per periodo
  const HERO_FA = 0.9 / HERO_TS;     // fase 5: 0,9·fs, oltre il limite di Nyquist

  function mountHero(view, api) {
    const C = EA.colors;
    const cv = api.canvas(view, { label: 'Un\'onda analogica viola scorre verso destra e attraversa il campionatore, che la misura a intervalli regolari. I campioni scattano sui livelli di quantizzazione, diventano codici binari, un DAC li trasforma in una scala e un filtro la leviga. Nell\'ultima fase un segnale troppo veloce produce un\'onda falsa più lenta.' });
    const STAGES = [
      { key: 'campiona', dur: 8, rate: 1, title: '1 · CAMPIONARE', sub: 'un campione ogni Ts = 1/fs · qui 8 campioni per periodo', subN: 'un campione ogni Ts = 1/fs, 8 per periodo' },
      { key: 'quantizza', dur: 9, rate: 1, title: '2 · QUANTIZZARE', sub: '3 bit = 8 livelli · ogni campione scatta sul livello più vicino', subN: '3 bit = 8 livelli: scatta sul più vicino' },
      { key: 'codifica', dur: 15, rate: 0.17, title: '3 · CODIFICARE IN BIT (PCM)', sub: 'il SAR trova il codice per dimezzamenti successivi · al rallentatore', subN: 'il SAR trova il codice · al rallentatore' },
      { key: 'ricostruisci', dur: 10, rate: 1, title: '4 · RICOSTRUIRE', sub: 'DAC: dai numeri a una scala · filtro passa-basso: dalla scala alla curva', subN: 'DAC: numeri → scala · filtro: → curva' },
      { key: 'alias', dur: 12, rate: 1, title: '5 · ALIASING', sub: 'f = 0,9 · fs supera fs/2: i campioni disegnano un\'onda falsa più lenta', subN: 'f = 0,9 · fs > fs/2: compare un\'onda falsa' },
    ];
    const NOTES = {
      campiona: ['Telefono: 8 kHz, cioè un campione ogni 125 µs.', 'CD: 44,1 kHz, un campione ogni 22,7 µs.'],
      quantizza: ['Con 3 bit i livelli sono 2³ = 8: l\'errore resta entro ±½ LSB.', 'Ogni bit in più dimezza il gradino: circa 6 dB di SNR in più.'],
      codifica: ['PCM: ogni campione viaggia come numero binario di N bit.', 'Telefono: 8000 campioni/s × 8 bit = 64 kbit/s.'],
      ricostruisci: ['Il DAC tiene ogni valore per un periodo Ts: nasce una scala.', 'Il filtro passa-basso toglie gli spigoli e restituisce la curva.'],
      alias: ['I campioni coincidono con quelli di un\'onda a |f − fs| = 0,1 · fs.', 'Rimedio: un filtro anti-aliasing prima del campionatore.'],
    };
    const ALIAS_D = aliasSigned(HERO_FA, 1 / HERO_TS);  // −0,1·fs: fase invertita
    let stage = 0;
    let stageT = 0;
    let tau = 9.1;   // tempo del segnale: nella fase 3 scorre al rallentatore
    let rate = 1;

    const freq = () => (STAGES[stage].key === 'alias' ? HERO_FA : HERO_F);
    const sig = (te) => Math.sin(TAU * freq() * te + HERO_PH);
    const qval = (n) => quantize(sig(n * HERO_TS), HERO_BITS);

    function geometry() {
      const w = cv.w;
      const hh = cv.h;
      const narrow = w < 560;
      const pad = narrow ? 12 : 18;
      const x0 = pad;
      const x1 = w - pad;
      const sTop = narrow ? 44 : 56;
      let boxW, boxH, boxX, boxY, laneTop, laneH, sBot;
      if (narrow) {
        boxH = EA.clamp(Math.round(hh * 0.25), 80, 108);
        boxW = x1 - x0;
        boxX = x0;
        boxY = hh - pad - boxH;
        laneH = 22;
        laneTop = boxY - 8 - laneH;
        sBot = laneTop - 6;
      } else {
        const bottom = Math.max(112, Math.round(hh * 0.24));
        sBot = hh - bottom - 10;
        laneH = 26;
        laneTop = sBot + 10;
        boxW = Math.min(360, Math.round((x1 - x0) * 0.32));
        boxX = x1 - boxW;
        boxY = laneTop;
        boxH = hh - pad - boxY;
      }
      const laneX1 = narrow ? x1 : boxX - 14;
      const waveTop = sTop + (narrow ? 24 : 30);
      const waveBot = sBot - (narrow ? 8 : 12);
      const xg = x0 + (x1 - x0) * (narrow ? 0.26 : 0.2);
      const spacing = EA.clamp((x1 - xg) / (narrow ? 10 : 22), 22, 44);
      return {
        w, hh, narrow, pad, x0, x1, sTop, sBot, waveTop, waveBot,
        cy: (waveTop + waveBot) / 2, A: (waveBot - waveTop) / 2,
        xg, spacing, v: spacing / HERO_TS,
        laneTop, laneH, laneX1, boxX, boxY, boxW, boxH,
        notes: !narrow && boxX - x0 > 360,
      };
    }

    const yOf = (g, val) => g.cy - g.A * val;
    const teOf = (g, x) => tau - (x - g.xg) / g.v;
    const xOfN = (g, n) => g.xg + (tau - n * HERO_TS) * g.v;

    function chip(ctx, str, x, y, color, align) {
      ctx.save();
      ctx.font = '600 10.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      const tw = ctx.measureText(str).width;
      const left = align === 'right' ? x - tw - 8 : align === 'center' ? x - tw / 2 - 4 : x;
      ctx.fillStyle = EA.alpha('#060b0a', 0.86);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(left, y - 11, tw + 8, 15, 4); else ctx.rect(left, y - 11, tw + 8, 15);
      ctx.fill();
      ctx.restore();
      EA.draw.text(ctx, str, left + 4, y, { color, size: 10.5 });
    }

    function panel(ctx, b, title, color, right) {
      ctx.save();
      ctx.fillStyle = EA.alpha('#060b0a', 0.88);
      ctx.strokeStyle = EA.alpha(color, 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(b.x, b.y, b.w, b.h, 10); else ctx.rect(b.x, b.y, b.w, b.h);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      EA.draw.text(ctx, title, b.x + 12, b.y + 18, { color, size: 10.5, weight: 700 });
      if (right) EA.draw.text(ctx, right, b.x + b.w - 12, b.y + 18, { color: C.dim, size: 10.5, align: 'right' });
    }

    function dashed(ctx, pts, color, width, dash) {
      ctx.save();
      ctx.setLineDash(dash || [5, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth = width || 1.4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
      ctx.restore();
    }

    function curve(g, xa, xb, fn, step) {
      const pts = [];
      const st = step || 2;
      for (let x = xa; x < xb; x += st) pts.push([x, fn(x)]);
      pts.push([xb, fn(xb)]);
      return pts;
    }

    // Scala del DAC tra xa e xb: il campione n resta fermo fino al campione n + 1,
    // che sullo schermo sta uno spazio più a sinistra (il tempo scorre verso destra).
    function staircase(g, xa, xb) {
      const pts = [];
      let n = Math.floor(teOf(g, xb) / HERO_TS);
      let x = xb;
      let guard = 0;
      while (x > xa && guard++ < 200) {
        const y = yOf(g, qval(n));
        const xl = Math.max(xa, xOfN(g, n + 1));
        pts.push([x, y], [xl, y]);
        x = xl;
        n++;
      }
      return pts;
    }

    // Parola PCM: tre bit come tessere (su mobile come testo).
    function word(ctx, g, c, x, yMid, alpha) {
      const bits = binary(c, HERO_BITS);
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      if (g.narrow) {
        EA.draw.text(ctx, bits, x, yMid + 4, { color: TINT, size: 10.5, weight: 700, align: 'center' });
      } else {
        const cw = 10;
        const chh = 15;
        let bx = x - (bits.length * (cw + 1) - 1) / 2;
        for (const ch of bits) {
          const on = ch === '1';
          ctx.fillStyle = on ? TINT : '#1a2722';
          ctx.fillRect(bx, yMid - chh / 2, cw, chh);
          EA.draw.text(ctx, ch, bx + cw / 2, yMid + 4, { color: on ? '#160c2c' : C.text, size: 10.5, weight: 700, align: 'center' });
          bx += cw + 1;
        }
      }
      ctx.restore();
    }

    // Corsia sotto lo strumento: impulsi del clock di campionamento oppure parole PCM.
    function lane(ctx, g, key, nNew, age, playing) {
      const top = g.laneTop;
      const bot = g.laneTop + g.laneH;
      const pcm = key === 'codifica' || key === 'ricostruisci';
      ctx.save();
      ctx.fillStyle = EA.alpha('#060b0a', 0.7);
      ctx.fillRect(g.x0, top, g.laneX1 - g.x0, g.laneH);
      ctx.strokeStyle = C.grid;
      ctx.strokeRect(g.x0 + 0.5, top + 0.5, g.laneX1 - g.x0 - 1, g.laneH - 1);
      ctx.beginPath();
      ctx.rect(g.x0, top, g.laneX1 - g.x0, g.laneH);
      ctx.clip();
      if (!pcm) {
        const base = bot - 5;
        const nFut = Math.floor((tau + (g.xg - g.x0) / g.v) / HERO_TS);
        const nOld = Math.ceil((tau - (g.laneX1 - g.xg) / g.v) / HERO_TS);
        for (let n = nFut; n >= nOld; n--) {
          const x = Math.round(xOfN(g, n)) + 0.5;
          const past = n <= nNew;
          const fl = playing && n === nNew ? Math.max(0, 1 - age / (0.3 * HERO_TS)) : 0;
          ctx.strokeStyle = fl > 0 ? C.ink : past ? EA.alpha(TINT, 0.85) : EA.alpha(C.dim, 0.55);
          ctx.lineWidth = past ? 2 + fl : 1.5;
          ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, top + 5); ctx.stroke();
        }
        ctx.strokeStyle = EA.alpha(C.dim, 0.6);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(g.x0, base + 0.5); ctx.lineTo(g.laneX1, base + 0.5); ctx.stroke();
        // quota Ts tra due impulsi già passati
        if (key === 'campiona') {
          const xa = xOfN(g, nNew - 1);
          const xb = xOfN(g, nNew - 2);
          if (xb < g.laneX1 - 4) {
            const ym = top + g.laneH / 2 - 1;
            const xm = (xa + xb) / 2;
            EA.draw.arrow(ctx, xm - 10, ym, xa + 3, ym, C.ink, 1.2, 5);
            EA.draw.arrow(ctx, xm + 10, ym, xb - 3, ym, C.ink, 1.2, 5);
            EA.draw.text(ctx, 'Ts', xm, ym + 4, { color: C.ink, size: 10.5, weight: 700, align: 'center' });
          }
        }
      } else {
        const ym = top + g.laneH / 2;
        const nOld = Math.ceil((tau - (g.laneX1 + 20 - g.xg) / g.v) / HERO_TS);
        for (let n = nNew; n >= nOld; n--) {
          const a = tau - n * HERO_TS;
          if (key === 'codifica' && n === nNew && playing) continue;  // è ancora nel SAR
          const alpha = key === 'ricostruisci' && playing ? EA.smooth(a / (0.15 * HERO_TS)) : 1;
          word(ctx, g, code(sig(n * HERO_TS), HERO_BITS), xOfN(g, n), ym, alpha);
        }
      }
      ctx.restore();
      chip(ctx, pcm ? 'PCM' : g.narrow ? 'clock' : 'impulsi di campionamento', g.x0 + 4, top + g.laneH / 2 + 4, pcm ? TINT : C.text);
    }

    // Fase 1: f sta ben dentro la zona sicura, sotto fs/2.
    function boxFreq(ctx, g, b) {
      panel(ctx, b, 'FREQUENZE', TINT, 'fs = 8 · f, ben oltre 2 · f');
      const ax0 = b.x + 16;
      const ax1 = b.x + b.w - 16;
      const ay = b.y + b.h - (g.narrow ? 22 : 26);
      const top = b.y + (g.narrow ? 30 : 34);
      const FMAX = 1.15;
      const X = (f) => ax0 + (f / FMAX) * (ax1 - ax0);
      ctx.fillStyle = EA.alpha(C.green, 0.13);
      ctx.fillRect(X(0), top, X(0.5) - X(0), ay - top);
      ctx.fillStyle = EA.alpha(C.red, 0.11);
      ctx.fillRect(X(0.5), top, X(FMAX) - X(0.5), ay - top);
      ctx.strokeStyle = EA.alpha(C.text, 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ax0, ay + 0.5); ctx.lineTo(ax1, ay + 0.5);
      [0, 0.5, 1].forEach((f) => { const x = Math.round(X(f)) + 0.5; ctx.moveTo(x, ay - 3); ctx.lineTo(x, ay + 4); });
      ctx.stroke();
      [[0, '0'], [0.5, 'fs/2'], [1, 'fs']].forEach(([f, s]) => EA.draw.text(ctx, s, X(f), ay + 15, { color: C.text, size: 10.5, align: 'center' }));
      EA.draw.text(ctx, 'ricostruibile', X(0.5) - 6, top + 13, { color: C.green, size: 10.5, align: 'right' });
      EA.draw.text(ctx, 'aliasing', X(0.83), top + 13, { color: C.red, size: 10.5, align: 'center' });
      const xf = X(1 / 8);
      EA.draw.line(ctx, [[xf, ay], [xf, top + 18]], TINT, 2.4);
      EA.draw.dot(ctx, xf, top + 18, 3, TINT);
      EA.draw.text(ctx, 'f', xf + 8, top + 21, { color: TINT, size: 11, weight: 700 });
    }

    // Fase 2: l'errore di ogni campione resta nella fascia di ±½ LSB.
    function boxError(ctx, g, b, nNew, age) {
      panel(ctx, b, g.narrow ? 'ERRORE' : 'ERRORE DI QUANTIZZAZIONE', C.pink, 'sempre entro ±½ LSB');
      const bx0 = b.x + (g.narrow ? 56 : 62);
      const bx1 = b.x + b.w - 14;
      const yc = b.y + 26 + (b.h - 34) / 2;
      const hb = (b.h - 44) / 2;
      ctx.fillStyle = EA.alpha(C.pink, 0.08);
      ctx.fillRect(bx0, yc - hb, bx1 - bx0, hb * 2);
      dashed(ctx, [[bx0, yc - hb], [bx1, yc - hb]], EA.alpha(C.pink, 0.55), 1, [3, 4]);
      dashed(ctx, [[bx0, yc + hb], [bx1, yc + hb]], EA.alpha(C.pink, 0.55), 1, [3, 4]);
      ctx.strokeStyle = C.grid;
      ctx.beginPath(); ctx.moveTo(bx0, Math.round(yc) + 0.5); ctx.lineTo(bx1, Math.round(yc) + 0.5); ctx.stroke();
      EA.draw.text(ctx, '+½ LSB', bx0 - 6, yc - hb + 4, { color: C.text, size: 10.5, align: 'right' });
      EA.draw.text(ctx, '0', bx0 - 6, yc + 4, { color: C.dim, size: 10.5, align: 'right' });
      EA.draw.text(ctx, '−½ LSB', bx0 - 6, yc + hb + 4, { color: C.text, size: 10.5, align: 'right' });
      const half = 1 / (1 << HERO_BITS);  // mezzo LSB nel campo −1…+1
      const dx = g.narrow ? 14 : 16;
      for (let k = 0; ; k++) {
        const x = bx0 + 8 + (k + age / HERO_TS) * dx;
        if (x > bx1 - 4) break;
        const n = nNew - k;
        const e = qval(n) - sig(n * HERO_TS);
        const y = yc - (e / half) * hb;
        EA.draw.line(ctx, [[x, yc], [x, y]], C.pink, 2, false);
        EA.draw.dot(ctx, x, y, 2.6, C.pink, false);
      }
    }

    // Fase 3: il SAR prova le soglie dal bit più significativo.
    function boxSar(ctx, g, b, nNew, age, playing) {
      const raw = sig(nNew * HERO_TS);
      const res = sar(raw + 1, HERO_BITS, 2);
      const stepDur = HERO_TS / (HERO_BITS + 1);
      const decided = playing ? Math.min(HERO_BITS, Math.floor(age / stepDur)) : HERO_BITS;
      panel(ctx, b, 'SAR · 3 BIT', C.amber, decided < HERO_BITS ? 'confronto ' + (decided + 1) + ' di ' + HERO_BITS : 'codice trovato');
      const n = 1 << HERO_BITS;
      const sx = b.x + 16;
      const sw = g.narrow ? 22 : 28;
      const sy0 = b.y + 28;
      const sy1 = b.y + b.h - 10;
      const ch = (sy1 - sy0) / n;
      let lo = 0;
      for (let k = 0; k < decided; k++) if (res.steps[k].keep) lo = res.steps[k].trial;
      const width = 1 << (HERO_BITS - decided);
      for (let c = 0; c < n; c++) {
        const y = sy1 - (c + 1) * ch;
        if (c >= lo && c < lo + width) {
          ctx.fillStyle = EA.alpha(C.amber, 0.2);
          ctx.fillRect(sx, y, sw, ch);
        }
        ctx.strokeStyle = C.grid;
        ctx.strokeRect(sx + 0.5, Math.round(y) + 0.5, sw - 1, Math.round(ch));
      }
      const yIn = sy1 - ((raw + 1) / 2) * (sy1 - sy0);
      EA.draw.line(ctx, [[sx - 3, yIn], [sx + sw + 3, yIn]], TINT, 2);
      if (decided < HERO_BITS) {
        const yt = sy1 - res.steps[decided].trial * ch;
        EA.draw.line(ctx, [[sx - 5, yt], [sx + sw + 5, yt]], C.amber, 2);
      }
      const tx = sx + sw + (g.narrow ? 12 : 16);
      const r0 = b.y + (g.narrow ? 34 : 38);
      const rh = g.narrow ? 15 : 18;
      res.steps.forEach((s, k) => {
        if (k > decided) return;
        const trial = 'prova ' + binary(s.trial, HERO_BITS);
        if (k === decided) EA.draw.text(ctx, trial + ' → confronto…', tx, r0 + k * rh, { color: C.amber, size: 10.5 });
        else EA.draw.text(ctx, trial + (s.keep ? ' → sopra: bit 1' : ' → sotto: bit 0'), tx, r0 + k * rh, { color: s.keep ? TINT : C.text, size: 10.5 });
      });
      if (decided >= HERO_BITS) EA.draw.text(ctx, 'codice ' + binary(res.code, HERO_BITS), tx, r0 + HERO_BITS * rh, { color: C.ink, size: 11, weight: 700 });
    }

    // Fase 4: legenda delle tre tracce.
    function boxLegend(ctx, g, b) {
      panel(ctx, b, 'RICOSTRUZIONE', TINT);
      const r0 = b.y + (g.narrow ? 37 : 43);
      const rh = g.narrow ? 17 : 20;
      const sx = b.x + 14;
      const tx = sx + 40;
      EA.draw.line(ctx, [[sx, r0 - 2], [sx + 9, r0 - 2], [sx + 9, r0 - 9], [sx + 19, r0 - 9], [sx + 19, r0 - 5], [sx + 28, r0 - 5]], C.cyan, 2, false);
      EA.draw.text(ctx, 'uscita del DAC: una scala', tx, r0, { color: C.text, size: 10.5 });
      EA.draw.fn(ctx, sx, sx + 28, (x) => r0 + rh - 5 - 4 * Math.sin(((x - sx) / 28) * TAU), TINT, 2, 1, false);
      EA.draw.text(ctx, 'dopo il filtro passa-basso', tx, r0 + rh, { color: C.text, size: 10.5 });
      dashed(ctx, [[sx, r0 + 2 * rh - 5], [sx + 28, r0 + 2 * rh - 5]], EA.alpha(C.text, 0.6), 1.3, [4, 4]);
      EA.draw.text(ctx, 'segnale originale', tx, r0 + 2 * rh, { color: C.text, size: 10.5 });
    }

    function wheel(ctx, cx, cy, r, ang, color, blur) {
      ctx.save();
      ctx.strokeStyle = EA.alpha(color, 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      const layers = blur ? 4 : 1;
      for (let l = 0; l < layers; l++) {
        const a0 = ang - (blur * l) / layers;
        ctx.strokeStyle = EA.alpha(color, blur ? 0.6 - l * 0.13 : 0.95);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let k = 0; k < 12; k++) {
          const a = a0 + (k * TAU) / 12;
          ctx.moveTo(cx + Math.cos(a) * r * 0.2, cy + Math.sin(a) * r * 0.2);
          ctx.lineTo(cx + Math.cos(a) * r * 0.94, cy + Math.sin(a) * r * 0.94);
        }
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.16, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // Freccia ad arco sopra la ruota: verso orario (cw) o antiorario.
    function turnArrow(ctx, cx, cy, r, cw, color) {
      const a0 = -Math.PI * 0.78;
      const a1 = -Math.PI * 0.22;
      const R = r + 7;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
      const ae = cw ? a1 : a0;
      const px = cx + Math.cos(ae) * R;
      const py = cy + Math.sin(ae) * R;
      const dx = cw ? -Math.sin(ae) : Math.sin(ae);
      const dy = cw ? Math.cos(ae) : -Math.cos(ae);
      ctx.beginPath();
      ctx.moveTo(px + dx * 6, py + dy * 6);
      ctx.lineTo(px - dy * 4, py + dx * 4);
      ctx.lineTo(px + dy * 4, py - dx * 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Fase 5: la ruota della diligenza, 12 raggi a 1,9 giri/s filmati a 24 fotogrammi/s.
    function boxWheels(ctx, g, b, t, playing) {
      panel(ctx, b, 'COME LA RUOTA NEI FILM', C.amber, '24 fotogrammi/s');
      const r = g.narrow ? 18 : 22;
      const cy = b.y + (g.narrow ? 50 : 58);
      const cxA = b.x + b.w * 0.27;
      const cxB = b.x + b.w * 0.73;
      const spin = 1.9 * TAU;
      const tt = playing ? t : 0;
      wheel(ctx, cxA, cy, r, spin * tt, C.ink, playing ? spin / 60 : 0);
      wheel(ctx, cxB, cy, r, (spin * Math.floor(tt * 24)) / 24, C.amber, 0);
      turnArrow(ctx, cxA, cy, r, true, EA.alpha(C.ink, 0.75));
      turnArrow(ctx, cxB, cy, r, false, C.amber);
      const ly = b.y + b.h - (g.narrow ? 7 : 8);
      EA.draw.text(ctx, 'vera: 1,9 giri/s', cxA, ly, { color: C.text, size: 10.5, align: 'center' });
      EA.draw.text(ctx, 'filmata: −0,1 giri/s', cxB, ly, { color: C.amber, size: 10.5, align: 'center' });
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
        rate += (STAGES[stage].rate - rate) * (1 - Math.exp(-dt * 4));
        tau += dt * rate;
      }
      const g = geometry();
      const ctx = cv.ctx;
      const S = STAGES[stage];
      const key = S.key;
      const enter = playing ? EA.ease.out(stageT / 0.8) : 1;
      const quant = key === 'quantizza' || key === 'codifica' || key === 'ricostruisci';
      const recon = key === 'ricostruisci';
      const nNew = Math.floor(tau / HERO_TS + 1e-9);
      const ageNew = tau - nNew * HERO_TS;
      const lsbPx = (2 * g.A) / (1 << HERO_BITS);
      const span = g.x1 - g.xg;
      const xa = g.xg + span * (g.narrow ? 0.28 : 0.3);
      const xb = g.xg + span * (g.narrow ? 0.6 : 0.62);
      const ref = (x) => yOf(g, sig(teOf(g, x)));

      EA.draw.clear(cv);
      EA.draw.text(ctx, S.title, g.x0, g.narrow ? 19 : 28, { color: C.ink, size: g.narrow ? 11 : 12, weight: 700 });
      EA.draw.text(ctx, g.narrow ? S.subN : S.sub, g.x0, g.narrow ? 34 : 44, { color: C.dim, size: g.narrow ? 10.5 : 11 });

      // a sinistra il mondo analogico, a destra quello dei campioni
      ctx.fillStyle = EA.alpha(TINT, 0.05);
      ctx.fillRect(g.x0, g.sTop, g.xg - g.x0, g.sBot - g.sTop);
      EA.draw.grid(ctx, g.x0, g.sTop, g.x1 - g.x0, g.sBot - g.sTop, { cols: g.narrow ? 6 : 12, rows: 4, ticks: false });

      // livelli di quantizzazione, solo dal lato digitale
      if (quant) {
        ctx.save();
        ctx.globalAlpha = enter;
        ctx.setLineDash([2, 5]);
        ctx.strokeStyle = EA.alpha(TINT, 0.45);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let c = 0; c < 1 << HERO_BITS; c++) {
          const y = Math.round(yOf(g, level(c, HERO_BITS))) + 0.5;
          ctx.moveTo(g.xg, y);
          ctx.lineTo(recon ? xb : g.x1, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // fascia dell'errore: ogni campione quantizzato resta entro ±½ LSB dal valore vero
      if (key === 'quantizza') {
        ctx.save();
        ctx.globalAlpha = enter;
        const up = curve(g, g.xg, g.x1, (x) => ref(x) - lsbPx / 2, 3);
        const dn = curve(g, g.xg, g.x1, (x) => ref(x) + lsbPx / 2, 3).reverse();
        ctx.fillStyle = EA.alpha(C.pink, 0.11);
        ctx.beginPath();
        up.concat(dn).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // il segnale analogico: pieno prima del campionatore, tenue dopo come riferimento
      const fine = key === 'alias' ? 1 : 2;
      EA.draw.fn(ctx, g.x0, g.xg, ref, TINT, 2.2, fine);
      if (recon) dashed(ctx, curve(g, g.xg, g.x1, ref, 3), EA.alpha(C.text, 0.5), 1.3, [4, 5]);
      else EA.draw.fn(ctx, g.xg, g.x1, ref, EA.alpha(TINT, key === 'alias' ? 0.55 : 0.38), 1.4, fine, false);

      // fase 4: scala del DAC, poi curva dopo il filtro passa-basso
      if (recon) {
        const enter2 = playing ? EA.ease.out((stageT - 1.2) / 0.8) : 1;
        [xa, xb].forEach((x) => dashed(ctx, [[x, g.sTop + 24], [x, g.sBot]], EA.alpha(C.text, 0.4), 1, [3, 4]));
        ctx.save();
        ctx.globalAlpha = enter;
        EA.draw.line(ctx, staircase(g, xa, xb), C.cyan, 2);
        ctx.restore();
        if (enter2 > 0) {
          ctx.save();
          ctx.globalAlpha = enter2;
          const smooth = (x) => yOf(g, reconstruct(qval, teOf(g, x) / HERO_TS, 'sinc', 12));
          EA.draw.line(ctx, curve(g, xb, g.x1, smooth, 2), TINT, 2.4);
          ctx.restore();
        }
      }

      // fase 5: l'onda falsa che passa per gli stessi campioni
      if (key === 'alias') {
        const k = playing ? EA.smooth((stageT - 1.6) / 1.4) : 1;
        if (k > 0) {
          ctx.save();
          ctx.globalAlpha = k;
          ctx.setLineDash([9, 6]);
          EA.draw.line(ctx, curve(g, g.xg, g.x1, (x) => yOf(g, Math.sin(TAU * ALIAS_D * teOf(g, x) + HERO_PH)), 2), C.amber, 2.4);
          ctx.restore();
        }
      }

      // campioni
      const nOld = Math.ceil((tau - span / g.v) / HERO_TS);
      for (let n = nNew; n >= nOld; n--) {
        const x = xOfN(g, n);
        if (x > g.x1 + 0.5 || (recon && x > xb)) continue;
        const age = tau - n * HERO_TS;
        const raw = sig(n * HERO_TS);
        const yRaw = yOf(g, raw);
        if (!quant) {
          EA.draw.line(ctx, [[x, g.cy], [x, yRaw]], EA.alpha(TINT, 0.6), 1.5, false);
          EA.draw.dot(ctx, x, yRaw, 3.4, C.ink);
          continue;
        }
        let s = 1;
        if (playing && key === 'quantizza') s = EA.smooth(age / (0.3 * HERO_TS));
        if (playing && key === 'codifica' && n === nNew) s = EA.smooth((age - 0.75 * HERO_TS) / (0.15 * HERO_TS));
        if (playing && recon) s = EA.smooth(age / (0.15 * HERO_TS));
        const y = EA.lerp(yRaw, yOf(g, qval(n)), s);
        if (!recon || x < xa) {
          EA.draw.line(ctx, [[x, g.cy], [x, y]], EA.alpha(TINT, 0.32), 1.4, false);
          if (Math.abs(y - yRaw) > 1.5) EA.draw.line(ctx, [[x, yRaw], [x, y]], C.pink, 2, false);
          ctx.strokeStyle = EA.alpha(C.ink, 0.6);
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(x, yRaw, 3.6, 0, TAU); ctx.stroke();
        }
        EA.draw.dot(ctx, x, y, recon && x >= xa ? 2.6 : 3.4, C.ink);
      }

      // fase 3: il campione in conversione e la soglia che il SAR sta provando
      if (key === 'codifica') {
        const x = xOfN(g, nNew);
        const raw = sig(nNew * HERO_TS);
        const res = sar(raw + 1, HERO_BITS, 2);
        const decided = playing ? Math.min(HERO_BITS, Math.floor(ageNew / (HERO_TS / (HERO_BITS + 1)))) : HERO_BITS;
        if (decided < HERO_BITS) {
          const yt = yOf(g, (res.steps[decided].trial * 2) / (1 << HERO_BITS) - 1);
          EA.draw.line(ctx, [[x - 30, yt], [x + 30, yt]], C.amber, 2);
          if (!g.narrow) EA.draw.text(ctx, 'soglia', x + 36, yt + 4, { color: C.amber, size: 10.5 });
        }
        ctx.strokeStyle = C.amber;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(x, decided < HERO_BITS ? yOf(g, raw) : yOf(g, qval(nNew)), 8, 0, TAU);
        ctx.stroke();
      }

      // campionatore: lampeggia a ogni impulso del clock
      const flash = playing ? Math.max(0, 1 - ageNew / (0.3 * HERO_TS)) : 0;
      if (flash > 0) {
        ctx.fillStyle = EA.alpha(C.ink, 0.07 * flash);
        ctx.fillRect(g.xg - 7, g.sTop + 1, 14, g.sBot - g.sTop - 2);
      }
      ctx.save();
      ctx.strokeStyle = EA.alpha(C.ink, 0.35 + 0.6 * flash);
      ctx.lineWidth = 1 + 1.5 * flash;
      ctx.beginPath();
      ctx.moveTo(Math.round(g.xg) + 0.5, g.sTop + (g.narrow ? 22 : 24));
      ctx.lineTo(Math.round(g.xg) + 0.5, g.sBot);
      ctx.stroke();
      ctx.restore();

      // codici dei livelli, accanto al campionatore
      if (quant) {
        ctx.save();
        ctx.globalAlpha = enter;
        for (let c = 0; c < 1 << HERO_BITS; c++) chip(ctx, binary(c, HERO_BITS), g.xg - 6, yOf(g, level(c, HERO_BITS)) + 4, TINT, 'right');
        ctx.restore();
      }

      // etichette in alto nello strumento
      const ly = g.sTop + 16;
      EA.draw.text(ctx, key === 'alias' ? 'f = 0,9 · fs' : g.narrow ? 'analogico' : 'segnale analogico', g.x0 + 8, ly, { color: TINT, size: 10.5, weight: 700 });
      if (!g.narrow) EA.draw.text(ctx, 'campionatore', g.xg, ly, { color: C.text, size: 10.5, align: 'center' });
      if (recon) {
        const labels = g.narrow ? ['campioni', 'DAC', 'filtro'] : ['campioni', 'uscita del DAC', 'dopo il filtro'];
        [[g.xg, xa, C.text], [xa, xb, C.cyan], [xb, g.x1, TINT]].forEach(([p, q, col], i) => EA.draw.text(ctx, labels[i], (p + q) / 2, ly, { color: col, size: 10.5, weight: 700, align: 'center' }));
      } else {
        const RIGHT = {
          campiona: g.narrow ? 'campioni' : 'campioni: un punto ogni Ts',
          quantizza: g.narrow ? 'quantizzati' : 'campioni quantizzati sui livelli',
          codifica: g.narrow ? 'codici' : 'ogni campione diventa un codice binario',
          alias: g.narrow ? 'alias: 0,1 · fs' : 'alias: un\'onda falsa a 0,1 · fs',
        };
        EA.draw.text(ctx, RIGHT[key], g.x1 - 8, ly, { color: key === 'alias' ? C.amber : C.text, size: 10.5, weight: 700, align: 'right' });
      }

      lane(ctx, g, key, nNew, ageNew, playing);

      // fase 3: il codice appena trovato vola nella corsia PCM
      if (key === 'codifica' && playing) {
        const k = (ageNew - 0.75 * HERO_TS) / (0.25 * HERO_TS);
        if (k > 0 && k < 1) {
          const e = EA.ease.inOut(k);
          const y0 = yOf(g, qval(nNew)) + 16;
          word(ctx, g, code(sig(nNew * HERO_TS), HERO_BITS), xOfN(g, nNew), EA.lerp(y0, g.laneTop + g.laneH / 2, e), 0.5 + 0.5 * e);
        }
      }

      const b = { x: g.boxX, y: g.boxY, w: g.boxW, h: g.boxH };
      if (key === 'campiona') boxFreq(ctx, g, b);
      else if (key === 'quantizza') boxError(ctx, g, b, nNew, ageNew);
      else if (key === 'codifica') boxSar(ctx, g, b, nNew, ageNew, playing);
      else if (recon) boxLegend(ctx, g, b);
      else boxWheels(ctx, g, b, t, playing);

      if (g.notes) {
        const ny = g.laneTop + g.laneH + Math.max(26, (g.hh - g.pad - g.laneTop - g.laneH) / 2 - 6);
        NOTES[key].forEach((s, i) => EA.draw.text(ctx, s, g.x0 + 2, ny + i * 20, { color: i ? C.dim : C.text, size: 12, weight: 500, mono: false }));
      }
    }

    api.loop(draw);
    api.setStep(0);
    return {
      focus(key, i) {
        stage = EA.clamp(i, 0, STAGES.length - 1);
        stageT = 0;
        rate = STAGES[stage].rate;
        api.setStep(stage);
        api.invalidate();
      },
    };
  }

  /* ---------- laboratorio: campionare, quantizzare, ricostruire ---------- */

  const MODE_NAMES = { gradini: 'a gradini', lineare: 'lineare', sinc: 'ideale con la sinc' };
  const AA_ORDER = 8;    // filtro anti-aliasing di Butterworth dell'8° ordine
  const AA_CUT = 0.45;   // taglio a 0,45·fs: resta un margine per la banda di transizione

  // Passo "tondo" (1, 2, 5 × 10^k) vicino a x, per le tacche degli assi.
  function niceStep(x) {
    const p = Math.pow(10, Math.floor(Math.log10(x)));
    const m = x / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }

  function mountLab(parts, api) {
    const C = EA.colors;
    const h = EA.h;
    const VFS = 2;   // fondo scala: da −1 V a +1 V
    const st = { f: 1000, fs: 8000, bits: 3, mode: 'sinc', alias: true, aa: false };
    let phase = 0.4;

    const cv = api.canvas(parts.display, { class: 'ea-canvas conversione-lab-canvas', label: 'In alto il segnale analogico con i campioni, i livelli di quantizzazione e il segnale ricostruito; al centro l\'errore di ricostruzione; in basso l\'asse delle frequenze con il limite di Nyquist e il ripiegamento che mostra dove cade l\'alias.' });

    const fSl = EA.ui.slider({
      label: 'Frequenza del segnale', min: 50, max: 20000, log: true, value: st.f, color: TINT,
      format: (v) => EA.si(v, 'Hz'),
      oninput: (v) => { st.f = v; update(); },
    });
    const fsSl = EA.ui.slider({
      label: 'Frequenza di campionamento', min: 1000, max: 48000, log: true, value: st.fs, color: C.cyan,
      format: (v) => EA.si(v, 'Hz'),
      oninput: (v) => { st.fs = v; update(); },
    });
    const bitsSl = EA.ui.slider({
      label: 'Numero di bit', min: 1, max: 12, step: 1, value: st.bits, color: C.amber,
      format: (v) => v + ' bit · ' + EA.fmt(Math.pow(2, v), 0) + ' livelli',
      oninput: (v) => { st.bits = v; update(); },
    });
    const modeSeg = EA.ui.segmented({
      label: 'Ricostruzione',
      options: [
        { value: 'gradini', label: 'Gradini', title: 'il DAC tiene ogni valore fino al campione seguente' },
        { value: 'lineare', label: 'Lineare', title: 'i campioni uniti da segmenti' },
        { value: 'sinc', label: 'Sinc ideale', title: 'filtro passa-basso ideale: somma di funzioni sinc' },
      ],
      value: st.mode,
      onchange: (v) => { st.mode = v; update(); },
    });
    const aliasT = EA.ui.toggle({ label: 'Mostra l\'alias', checked: st.alias, color: C.amber, onchange: (v) => { st.alias = v; update(); } });
    const aaT = EA.ui.toggle({ label: 'Filtro anti-aliasing', checked: st.aa, color: C.green, onchange: (v) => { st.aa = v; update(); } });
    function preset(o) {
      Object.assign(st, o);
      fSl.set(st.f, true);
      fsSl.set(st.fs, true);
      bitsSl.set(st.bits, true);
      aaT.set(st.aa, true);
      aliasT.set(st.alias, true);
      update();
    }
    const phone = EA.ui.button({ label: 'Telefono: 8 kHz, 8 bit', onclick: () => preset({ f: 1000, fs: 8000, bits: 8, aa: false }) });
    const demo = EA.ui.button({ label: 'Aliasing: 7 kHz a 10 kHz', onclick: () => preset({ f: 7000, fs: 10000, bits: 6, aa: false, alias: true }) });
    parts.controls.append(fSl.el, fsSl.el, bitsSl.el, modeSeg.el, aliasT.el, aaT.el,
      h('div', { class: 'ea-ctl' },
        h('span', { class: 'ea-ctl-label' }, 'Esempi pronti'),
        h('div', { class: 'conversione-presets' }, phone, demo),
        h('small', { class: 'ea-ctl-hint' }, 'La quantizzazione qui è uniforme: il telefono vero usa una scala logaritmica, con passi più fitti per i suoni deboli.')));

    const roNyq = EA.ui.readout({ label: 'Nyquist fs/2' });
    const roAli = EA.ui.readout({ label: 'Frequenza apparente' });
    const roLsb = EA.ui.readout({ label: 'Passo LSB su 2 V' });
    const roSnrT = EA.ui.readout({ label: 'SNR teorico' });
    const roSnrM = EA.ui.readout({ label: 'SNR misurato' });
    const roRate = EA.ui.readout({ label: 'Bit rate fs × N' });
    parts.readouts.append(roNyq.el, roAli.el, roLsb.el, roSnrT.el, roSnrM.el, roRate.el);

    function derived() {
      const over = st.f > st.fs / 2;
      return {
        over,
        fa: alias(st.f, st.fs),
        d: aliasSigned(st.f, st.fs),
        gain: st.aa ? butterworth(st.f, AA_CUT * st.fs, AA_ORDER) : 1,
      };
    }

    function update() {
      const d = derived();
      const snrT = snrIdeal(st.bits);
      const snrM = snrMeasured(st.f, st.fs, st.bits, d.gain, 4096, 0.4);
      roNyq.set(EA.si(st.fs / 2, 'Hz'));
      if (!d.over) roAli.set(EA.si(d.fa, 'Hz'), 'good');
      else if (st.aa) roAli.set(EA.si(d.fa, 'Hz') + ' · ' + EA.fmt(EA.db(d.gain), 0) + ' dB', d.gain < 0.01 ? 'good' : 'warn');
      else roAli.set(EA.si(d.fa, 'Hz') + ' · alias', 'warn');
      roLsb.set(EA.si(lsb(VFS, st.bits), 'V'));
      roSnrT.set(EA.fmt(snrT, 1) + ' dB');
      roSnrM.set(EA.fmt(snrM, 1) + ' dB', Math.abs(snrM - snrT) < 1.5 ? 'good' : null);
      roRate.set(EA.si(bitRate(st.fs, st.bits), 'bit/s'));
      api.invalidate();
      api.announce('Segnale a ' + EA.si(st.f, 'Hz') + ' campionato a ' + EA.si(st.fs, 'Hz')
        + (d.over ? (st.aa ? ': il filtro attenua l\'alias a ' : ': aliasing, il segnale appare a ') + EA.si(d.fa, 'Hz') : ': sotto la frequenza di Nyquist, nessun alias')
        + '. ' + st.bits + ' bit, ricostruzione ' + MODE_NAMES[st.mode] + ', rapporto segnale rumore teorico ' + EA.fmt(snrT, 1) + ' decibel, misurato ' + EA.fmt(snrM, 1) + '.');
    }

    function legend(ctx, items, xr, y) {
      ctx.save();
      ctx.font = '600 10.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      let x = xr;
      for (let i = items.length - 1; i >= 0; i--) {
        const [label, color, kind] = items[i];
        x -= ctx.measureText(label).width;
        EA.draw.text(ctx, label, x, y, { color: C.text, size: 10.5 });
        x -= 20;
        if (kind === 'dot') EA.draw.dot(ctx, x + 7, y - 4, 2.6, color, false);
        else if (kind === 'dash') { ctx.save(); ctx.setLineDash([4, 3]); EA.draw.line(ctx, [[x, y - 4], [x + 14, y - 4]], color, 2, false); ctx.restore(); }
        else EA.draw.line(ctx, [[x, y - 4], [x + 14, y - 4]], color, 2, false);
        x -= 14;
      }
      ctx.restore();
    }

    function label(ctx, str, x, y, color) {
      ctx.save();
      ctx.font = '600 10.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      const tw = ctx.measureText(str).width;
      ctx.fillStyle = EA.alpha(C.bg, 0.86);
      ctx.fillRect(x - 3, y - 11, tw + 6, 15);
      ctx.restore();
      EA.draw.text(ctx, str, x, y, { color, size: 10.5 });
    }

    function draw(t, dt) {
      if (!cv.w) return;
      if (dt > 0) phase += dt * 0.8;   // il segnale non è agganciato al clock: la sua fase scorre
      const ctx = cv.ctx;
      const w = cv.w;
      const hh = cv.h;
      const narrow = w < 520;
      const d = derived();
      const ts = 1 / st.fs;
      const win = EA.clamp(3 / Math.max(d.fa, 1e-9), 16 * ts, (narrow ? 64 : 128) * ts);
      const px = narrow ? 12 : 18;
      const pw = w - px * 2;
      const tTop = narrow ? 44 : 36;
      const tH = Math.round(hh * (narrow ? 0.4 : 0.45));
      const yMid = tTop + tH / 2;
      const amp = tH * 0.4;
      const eTop = tTop + tH + (narrow ? 26 : 30);
      const eH = Math.round(hh * 0.1);
      const fTop = eTop + eH + (narrow ? 32 : 38);
      const axisY = hh - (narrow ? 28 : 32);
      const X = (time) => px + (time / win) * pw;
      const T = (x) => ((x - px) / pw) * win;
      const gain = d.gain;
      const sigIn = (time) => Math.sin(TAU * st.f * time + phase);
      const sigS = (time) => gain * sigIn(time);   // ciò che arriva al campionatore
      const nMax = Math.floor(win / ts + 1e-9);
      const M = 32;
      const qs = new Float64Array(nMax + 2 * M + 2);
      for (let i = 0; i < qs.length; i++) qs[i] = quantize(sigS((i - M) * ts), st.bits);
      const qv = (n) => qs[EA.clamp(n + M, 0, qs.length - 1)];
      const showAlias = st.alias && d.over;

      EA.draw.clear(cv);

      // intestazione e legenda
      const per = st.fs / st.f;
      const perTxt = EA.fmt(per, per < 1 ? 2 : per < 10 ? 1 : 0) + (narrow ? ' per periodo' : ' campioni per periodo');
      const items = [['analogico', TINT, 'line']];
      if (!narrow) items.push(['campioni', C.ink, 'dot']);
      items.push(['ricostruito', C.cyan, 'line']);
      if (showAlias) items.push(['alias', C.amber, 'dash']);
      if (narrow) {
        legend(ctx, items, w - px, 16);
        EA.draw.text(ctx, 'SEGNALE · ' + EA.si(win, 's', 2) + ' · ' + perTxt, px, 32, { color: C.text, size: 10.5, weight: 700 });
      } else {
        EA.draw.text(ctx, 'SEGNALE · finestra ' + EA.si(win, 's', 2) + ' · ' + perTxt, px, 22, { color: C.text, size: 10.5, weight: 700 });
        legend(ctx, items, w - px, 22);
      }

      // tempo: griglia, fondo scala e livelli
      EA.draw.grid(ctx, px, tTop, pw, tH, { cols: narrow ? 6 : 10, rows: 4 });
      const levels = 1 << st.bits;
      if (st.bits <= 5) {
        ctx.save();
        ctx.strokeStyle = EA.alpha(TINT, st.bits <= 3 ? 0.3 : 0.17);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let c = 0; c < levels; c++) {
          const y = Math.round(yMid - amp * level(c, st.bits)) + 0.5;
          ctx.moveTo(px, y); ctx.lineTo(px + pw, y);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = EA.alpha(C.text, 0.35);
      ctx.beginPath();
      ctx.moveTo(px, yMid - amp); ctx.lineTo(px + pw, yMid - amp);
      ctx.moveTo(px, yMid + amp); ctx.lineTo(px + pw, yMid + amp);
      ctx.stroke();
      ctx.restore();

      // segnale analogico (se troppo fitto per lo schermo, la fascia tra i picchi)
      const periodPx = pw / (win * st.f);
      if (periodPx < 5) {
        ctx.fillStyle = EA.alpha(TINT, 0.16);
        ctx.fillRect(px, yMid - amp * gain, pw, 2 * amp * gain);
        EA.draw.line(ctx, [[px, yMid - amp * gain], [px + pw, yMid - amp * gain]], EA.alpha(TINT, 0.7), 1, false);
        EA.draw.line(ctx, [[px, yMid + amp * gain], [px + pw, yMid + amp * gain]], EA.alpha(TINT, 0.7), 1, false);
      } else {
        const step = periodPx < 24 ? 1 : 2;
        if (st.aa && gain < 0.98) {
          ctx.save();
          ctx.setLineDash([3, 4]);
          EA.draw.fn(ctx, px, px + pw, (x) => yMid - amp * sigIn(T(x)), EA.alpha(C.text, 0.5), 1.1, step, false);
          ctx.restore();
        }
        EA.draw.fn(ctx, px, px + pw, (x) => yMid - amp * sigS(T(x)), TINT, 1.8, step);
      }

      // scala quantizzata e segnale ricostruito
      const stair = [];
      for (let n = 0; n <= nMax; n++) {
        const y = yMid - amp * qv(n);
        stair.push([X(n * ts), y], [Math.min(px + pw, X((n + 1) * ts)), y]);
      }
      const rStep = 2;
      const rec = [];
      const err = [];
      let se = 0;
      for (let x = px; x <= px + pw + 0.01; x += rStep) {
        const time = T(x);
        const y = reconstruct(qv, time / ts, st.mode, M);
        const e = y - sigS(time);
        rec.push([x, yMid - amp * y]);
        err.push(e);
        se += e * e;
      }
      if (st.mode === 'gradini') EA.draw.line(ctx, stair, C.cyan, 2);
      else {
        EA.draw.line(ctx, stair, EA.alpha(C.ink, 0.3), 1.2, false);
        EA.draw.line(ctx, rec, C.cyan, 2);
      }
      if (showAlias) {
        ctx.save();
        ctx.setLineDash([8, 6]);
        EA.draw.fn(ctx, px, px + pw, (x) => yMid - amp * gain * Math.sin(TAU * d.d * T(x) + phase), C.amber, 2, 2);
        ctx.restore();
      }

      // campioni: anello sul valore vero, punto sul livello quantizzato, trattino rosa = errore
      const sp = pw / (win / ts);
      const r = EA.clamp(sp * 0.28, 1.6, 3.6);
      for (let n = 0; n <= nMax; n++) {
        const x = X(n * ts);
        const yv = yMid - amp * sigS(n * ts);
        const yq = yMid - amp * qv(n);
        if (sp >= 8 && Math.abs(yq - yv) > 2) {
          EA.draw.line(ctx, [[x, yv], [x, yq]], C.pink, 1.6, false);
          ctx.strokeStyle = EA.alpha(C.ink, 0.55);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, yv, r + 0.8, 0, TAU); ctx.stroke();
        }
        EA.draw.dot(ctx, x, yq, r, C.ink, sp >= 8);
      }

      // etichette del grafico nel tempo
      label(ctx, '+1 V', px + 5, yMid - amp + 4, C.text);
      label(ctx, '−1 V', px + 5, yMid + amp + 4, C.text);
      if (st.bits <= 3) {
        for (let c = 0; c < levels; c++) label(ctx, binary(c, st.bits), px + pw - 8 - 6.4 * st.bits, yMid - amp * level(c, st.bits) + 4, EA.alpha(TINT, 0.95));
      } else if (st.bits > 5 && !narrow) {
        EA.draw.text(ctx, EA.fmt(levels, 0) + ' livelli: troppo fitti per vederli', px + pw - 8, tTop + 16, { color: C.dim, size: 10.5, align: 'right' });
      }
      const tick = niceStep(win / (narrow ? 3 : 5));
      for (let k = 1; k * tick < win * 0.97; k++) EA.draw.text(ctx, EA.si(k * tick, 's', 2), X(k * tick), tTop + tH - 6, { color: C.dim, size: 10.5, align: 'center' });

      // errore di ricostruzione
      const eMid = eTop + eH / 2;
      const eScale = (eH / 2 - 3) / 0.5;   // ±0,5 V a tutta altezza
      const eRms = Math.sqrt(se / err.length);
      EA.draw.text(ctx, 'ERRORE · ricostruito − analogico · efficace ' + EA.si(eRms, 'V', 2), px, eTop - 9, { color: C.pink, size: 10.5, weight: 700 });
      if (!narrow) EA.draw.text(ctx, 'scala ±0,5 V · fascia: ±½ LSB', px + pw, eTop - 9, { color: C.dim, size: 10.5, align: 'right' });
      ctx.fillStyle = EA.alpha('#060b0a', 0.55);
      ctx.fillRect(px, eTop, pw, eH);
      EA.draw.grid(ctx, px, eTop, pw, eH, { cols: narrow ? 6 : 10, rows: 2, ticks: false });
      const hb = (lsb(VFS, st.bits) / 2) * eScale;
      if (hb >= 1) {
        ctx.fillStyle = EA.alpha(C.pink, 0.12);
        ctx.fillRect(px, eMid - hb, pw, 2 * hb);
      }
      EA.draw.line(ctx, err.map((e, i) => [px + i * rStep, eMid - EA.clamp(e, -0.5, 0.5) * eScale]), C.pink, 1.6);

      // spettro: zone di Nyquist, filtro, righe e ripiegamento
      const fsH = st.fs / 2;
      const fMax = Math.min(Math.max(1.25 * st.fs, 1.12 * st.f), 4.25 * st.fs);
      const FX = (f) => px + (f / fMax) * pw;
      const fH = axisY - fTop;
      EA.draw.text(ctx, d.over ? 'SPETTRO · f supera fs/2 e si ripiega' : 'SPETTRO · f sotto fs/2: nessun alias', px, fTop - 10, { color: d.over ? C.amber : C.green, size: 10.5, weight: 700 });
      if (st.aa && !narrow) EA.draw.text(ctx, 'filtro di Butterworth, 8° ordine, taglio a 0,45 · fs', px + pw, fTop - 10, { color: C.dim, size: 10.5, align: 'right' });
      for (let k = 0; k * fsH < fMax; k++) {
        const a = FX(k * fsH);
        const b = FX(Math.min(fMax, (k + 1) * fsH));
        ctx.fillStyle = k === 0 ? EA.alpha(C.green, 0.1) : EA.alpha(C.red, k % 2 ? 0.08 : 0.045);
        ctx.fillRect(a, fTop, b - a, fH);
      }
      const barH = fH * 0.5;
      if (st.aa) {
        const pts = [];
        for (let x = px; x <= px + pw; x += 2) pts.push([x, axisY - fH * 0.86 * butterworth(T2F(x), AA_CUT * st.fs, AA_ORDER)]);
        ctx.fillStyle = EA.alpha(C.green, 0.08);
        ctx.beginPath();
        ctx.moveTo(px, axisY);
        pts.forEach((p) => ctx.lineTo(p[0], p[1]));
        ctx.lineTo(px + pw, axisY);
        ctx.closePath();
        ctx.fill();
        EA.draw.line(ctx, pts, C.green, 1.6, false);
      }
      function T2F(x) { return ((x - px) / pw) * fMax; }

      // asse con le tacche a multipli di fs/2
      ctx.strokeStyle = EA.alpha(C.text, 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, axisY + 0.5); ctx.lineTo(px + pw, axisY + 0.5);
      const dz = FX(fsH) - FX(0);
      for (let k = 0; k * fsH <= fMax; k++) { const x = Math.round(FX(k * fsH)) + 0.5; ctx.moveTo(x, axisY - 4); ctx.lineTo(x, axisY + 5); }
      ctx.stroke();
      dashed(ctx, [[FX(fsH), fTop], [FX(fsH), axisY]], EA.alpha(C.ink, 0.6), 1.2, [4, 4]);
      for (let k = 0; k * fsH <= fMax * 1.001; k++) {
        let s = '';
        if (k === 0) s = '0';
        else if (k === 1) s = dz > 96 && !narrow ? 'fs/2 = ' + EA.si(fsH, 'Hz') : 'fs/2';
        else if (k === 2) s = dz > 96 && !narrow ? 'fs = ' + EA.si(st.fs, 'Hz') : 'fs';
        else if (dz > 44) s = k % 2 ? k + 'fs/2' : k / 2 + 'fs';
        if (s) EA.draw.text(ctx, s, FX(k * fsH), axisY + 17, { color: k === 1 ? C.ink : C.text, size: 10.5, weight: k === 1 ? 700 : 600, align: k === 0 ? 'left' : 'center' });
      }

      // righe: il segnale e, se c'è, il suo alias
      const hS = Math.max(3, barH * gain);
      const inside = st.f <= fMax;
      const xF = inside ? FX(st.f) : px + pw - 4;
      if (inside) {
        EA.draw.line(ctx, [[xF, axisY], [xF, axisY - hS]], TINT, 3);
        EA.draw.dot(ctx, xF, axisY - hS, 3, TINT);
        EA.draw.text(ctx, 'f', xF + 7, axisY - hS + 4, { color: TINT, size: 11, weight: 700 });
      } else {
        EA.draw.arrow(ctx, px + pw - 46, axisY - barH * 0.5, px + pw - 2, axisY - barH * 0.5, TINT, 2, 8);
        EA.draw.text(ctx, 'f = ' + EA.si(st.f, 'Hz'), px + pw - 4, axisY - barH * 0.5 - 9, { color: TINT, size: 10.5, weight: 700, align: 'right' });
      }
      if (d.over) {
        const xA = FX(d.fa);
        EA.draw.line(ctx, [[xA, axisY], [xA, axisY - hS]], C.amber, 3);
        EA.draw.dot(ctx, xA, axisY - hS, 3, C.amber);
        EA.draw.text(ctx, 'alias', xA + 7, axisY - hS + 4, { color: C.amber, size: 11, weight: 700 });
        // percorso del ripiegamento: specchio dopo specchio attorno ai multipli di fs/2
        const hops = [];
        if (inside && st.f / fsH <= 7) {
          let cur = st.f;
          let guard = 0;
          while (cur > fsH + 1e-9 && guard++ < 8) {
            const k = Math.ceil(cur / fsH) - 1;
            const next = 2 * k * fsH - cur;
            hops.push([FX(cur), FX(next)]);
            cur = next;
          }
        } else {
          hops.push([xF, xA]);
        }
        const yb = axisY - hS - 8;
        const room = Math.max(10, yb - fTop - 6);
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = C.amber;
        ctx.lineWidth = 1.6;
        hops.forEach(([a, b], i) => {
          const hArc = Math.min(room, 12 + Math.abs(a - b) * 0.22) * (1 - i * 0.08);
          ctx.beginPath();
          ctx.moveTo(a, yb);
          ctx.quadraticCurveTo((a + b) / 2, yb - hArc * 2, b, yb);
          ctx.stroke();
        });
        ctx.restore();
        const last = hops[hops.length - 1];
        const lastH = Math.min(room, 12 + Math.abs(last[0] - last[1]) * 0.22) * (1 - (hops.length - 1) * 0.08);
        EA.draw.arrow(ctx, (last[0] + last[1]) / 2 + (last[1] - last[0]) * 0.18, yb - lastH * 0.75, last[1], yb, C.amber, 1.6, 7);
        if (!narrow && hops.length && Math.abs(hops[0][0] - hops[0][1]) > 120) {
          const first = hops[0];
          const h0 = Math.min(room, 12 + Math.abs(first[0] - first[1]) * 0.22);
          EA.draw.text(ctx, hops.length > 1 ? 'ripiegamento: ' + hops.length + ' specchi' : 'ripiegamento', (first[0] + first[1]) / 2, yb - h0 - 6, { color: C.amber, size: 10.5, align: 'center' });
        }
      }
    }

    api.loop(draw);
    update();
  }

  /* ---------- contenuti ---------- */

  EA.register({
    id: 'conversione',
    intro: [
      'Il mondo reale è continuo: la pressione dell\'aria che porta una voce, la temperatura di una stanza, il campo di un\'onda radio cambiano senza salti, istante per istante. Un computer invece conosce solo numeri, e ne può conservare una quantità finita. Per far entrare un segnale in un circuito digitale servono due operazioni: <strong>campionare</strong>, cioè misurarlo a intervalli regolari, e <strong>quantizzare</strong>, cioè arrotondare ogni misura a uno dei livelli disponibili, che poi viene scritto come numero binario.',
      'La sorpresa è che campionare non significa per forza perdere qualcosa. Se il segnale non contiene frequenze sopra un certo limite e lo si misura <strong>più del doppio di volte al secondo</strong>, dai soli campioni si ricostruisce la curva originale, anche tra un punto e l\'altro. È il <em>teorema del campionamento</em>: Harry Nyquist ne pose le basi nel 1928, Vladimir Kotel\'nikov (1933) e Claude Shannon (1949) lo enunciarono. Se invece si campiona troppo lentamente, le frequenze alte si travestono da frequenze più basse: è l\'<em>aliasing</em>, e dopo non c\'è più modo di toglierlo.',
      'Ogni bit in più dimezza l\'errore di arrotondamento e regala circa 6 dB di rapporto segnale/rumore. Il telefono digitale usa 8000 campioni al secondo da 8 bit, il CD 44.100 da 16 bit, gli oscilloscopi e i ricevitori radio più moderni miliardi di campioni al secondo. Per farlo esistono convertitori diversi: gli <abbr title="Analog-to-Digital Converter, convertitore analogico-digitale">ADC</abbr> ad approssimazioni successive trovano il numero per dimezzamenti, i <em>flash</em> usano un comparatore per ogni livello e sono velocissimi, i <em>sigma-delta</em> campionano molto più in fretta del necessario con pochi bit e poi filtrano. Sulla via del ritorno un <abbr title="Digital-to-Analog Converter, convertitore digitale-analogico">DAC</abbr> e un filtro ridanno la curva. Lo spettro è quello del capitolo 1; il clock che dà il ritmo ai campioni è la storia del capitolo 6.',
    ],
    steps: [
      { title: 'Fotografare a intervalli regolari', text: 'Un interruttore velocissimo, il campionatore, misura la tensione una volta ogni Ts = 1/fs secondi e la tiene ferma il tempo necessario a convertirla. Tra un campione e l\'altro il convertitore non vede nulla: per questo deve essere abbastanza rapido.', focus: 'campiona' },
      { title: 'Arrotondare al gradino più vicino', text: 'Con N bit i livelli sono 2 elevato a N (con 3 bit, otto): ogni campione scatta su quello più vicino. L\'errore resta sempre entro mezzo gradino (±½ LSB) e si comporta come un piccolo rumore; ogni bit in più lo dimezza.', focus: 'quantizza' },
      { title: 'Ogni campione diventa un numero', text: 'Il livello viene scritto in binario: è la modulazione a impulsi codificati (PCM). Un convertitore ad approssimazioni successive (SAR) trova il codice per dimezzamenti: confronta l\'ingresso con metà scala, poi con un quarto, e decide un bit a ogni confronto, dal più significativo.', focus: 'codifica' },
      { title: 'Dalla scala alla curva', text: 'Il DAC trasforma i numeri in tensioni e tiene ciascuna per un periodo Ts: esce una scala. Un filtro passa-basso ne toglie gli spigoli, cioè le frequenze sopra fs/2, e restituisce la curva originale, a parte il rumore di quantizzazione.', focus: 'ricostruisci' },
      { title: 'Troppo lento: l\'onda falsa', text: 'Se il segnale supera fs/2, i campioni disegnano un\'onda più lenta che non esiste, l\'alias, come la ruota della diligenza che nei film sembra girare all\'indietro. Dopo il campionamento non si distingue da un segnale vero: va tolto prima, con un filtro anti-aliasing.', focus: 'alias' },
    ],
    formulas: [
      { label: 'Teorema del campionamento', eq: '<var>f</var><sub>s</sub> &gt; 2 · <var>f</var><sub>max</sub>', text: 'Per ricostruire un segnale che contiene frequenze fino a <var>f</var><sub>max</sub> bisogna campionarlo più del doppio di <var>f</var><sub>max</sub>. La metà della frequenza di campionamento, <var>f</var><sub>s</sub>/2, si chiama <em>frequenza di Nyquist</em>: è il confine oltre il quale nasce l\'aliasing. Il telefono campiona a 8 kHz una voce limitata a 3,4 kHz, il CD a 44,1 kHz una musica fino a 20 kHz: il margine serve al filtro.' },
      { label: 'Frequenza di alias', eq: '<var>f</var><sub>alias</sub> = |<var>f</var> − <var>k</var> · <var>f</var><sub>s</sub>|', text: '<var>k</var> è l\'intero più vicino a <var>f</var>/<var>f</var><sub>s</sub>, e il risultato cade sempre tra 0 e <var>f</var><sub>s</sub>/2: lo spettro si ripiega come una fisarmonica attorno ai multipli di <var>f</var><sub>s</sub>/2. Un tono da 7 kHz campionato a 10 kHz appare a 3 kHz.' },
      { label: 'Quantizzazione', eq: 'SNR ≈ 6,02 · <var>N</var> + 1,76 dB', text: 'Con <var>N</var> bit il fondo scala <var>V</var><sub>FS</sub> è diviso in 2<sup><var>N</var></sup> gradini larghi LSB = <var>V</var><sub>FS</sub>/2<sup><var>N</var></sup>. L\'errore resta entro ±½ LSB e vale in media LSB/√12; per una sinusoide a fondo scala il rapporto segnale/rumore cresce di circa 6 dB per bit: circa 50 dB con 8 bit, 98 dB con 16.' },
      { label: 'Bit rate', eq: '<var>R</var> = <var>f</var><sub>s</sub> · <var>N</var> · canali', text: 'I bit da trasmettere o da salvare ogni secondo. Telefono: 8000 × 8 = 64 kbit/s. CD: 44.100 × 16 × 2 = 1,41 Mbit/s. Un oscilloscopio da 256 miliardi di campioni al secondo con 10 bit produce 2,56 Tbit/s per canale.' },
    ],
    timeline: [
      { year: 1928, title: 'Nyquist e i 2<var>B</var> impulsi', who: 'Harry Nyquist, AT&T, New York', text: 'Nell\'articolo «Certain topics in telegraph transmission theory» Nyquist dimostra che un canale di banda <var>B</var> può trasmettere al massimo 2<var>B</var> impulsi indipendenti al secondo. Non enuncia ancora il teorema del campionamento, ma ne pone le basi: per questo <var>f</var><sub>s</sub>/2 porta il suo nome.' },
      { year: 1933, title: 'Kotel\'nikov enuncia il teorema', who: 'Vladimir A. Kotel\'nikov, Mosca', text: 'In un lavoro preparato per un congresso sovietico sulle comunicazioni formula il teorema del campionamento in modo esplicito, per i segnali passa-basso e anche per quelli passa-banda. In Occidente resterà quasi sconosciuto per decenni: l\'IEEE gli assegnerà la medaglia Alexander Graham Bell solo nel 2000.' },
      { year: 1938, title: 'Reeves brevetta la PCM', who: 'Alec H. Reeves, laboratori ITT, Parigi', text: 'Nel 1937 l\'ingegnere britannico concepisce la modulazione a impulsi codificati: campionare la voce, quantizzarla e trasmettere ogni valore come gruppo di impulsi binari, quasi immuni al rumore. Il brevetto francese viene depositato nel 1938, ma con le valvole dell\'epoca il sistema è troppo complesso. Una prima forma di PCM servirà in guerra al telefono cifrato SIGSALY (1943), che campionava 50 volte al secondo i canali di un vocoder.' },
      { year: 1949, title: 'Shannon dimostra il teorema', who: 'Claude E. Shannon, Bell Telephone Laboratories', text: 'In «Communication in the Presence of Noise» dimostra che un segnale senza frequenze sopra <var>W</var> è determinato dai valori presi ogni 1/(2<var>W</var>) secondi e si ricostruisce sommando funzioni sinc. Pochi mesi prima, con Oliver e Pierce, aveva illustrato i vantaggi della PCM.' },
      { year: 1954, title: 'DATRAC, uno dei primi ADC in vendita', who: 'Bernard M. Gordon, Epsco, Massachusetts', text: 'Un convertitore a valvole ad approssimazioni successive da 11 bit e 50.000 campioni al secondo, grande come un armadietto e da circa 8000 dollari. Viene di solito indicato come il primo ADC commerciale; il Computer History Museum, più prudente, lo definisce «uno dei primi».' },
      { year: 1962, title: 'T1: la telefonia diventa PCM', who: 'Bell System, Chicago', text: 'Entra in servizio il primo sistema commerciale a impulsi codificati: 24 telefonate campionate a 8 kHz viaggiano insieme su due doppini a 1,544 Mbit/s. I primi terminali codificavano la voce con 7 bit su scala logaritmica; grazie ai transistor l\'idea di Reeves diventa economica.' },
      { year: 1962, title: 'Nasce il sigma-delta', who: 'Hiroshi Inose, Yasuhiko Yasuda e Jun Murakami, Università di Tokyo', text: 'Descrivono il modulatore Δ-Σ: un quantizzatore da 1 bit velocissimo, chiuso in retroazione con un integratore, spinge il rumore di quantizzazione verso le alte frequenze, dove un filtro lo elimina. L\'idea di partenza, la retroazione con sovracampionamento, veniva da un brevetto di C. Chapin Cutler dei Bell Labs, depositato nel 1954.' },
      { year: 1982, title: 'Il Compact Disc: 44,1 kHz e 16 bit', who: 'Sony e Philips', text: 'Il 1° ottobre esce in Giappone il Sony CDP-101, il primo lettore CD; in Europa e negli Stati Uniti il CD arriva nel 1983. Il formato, fissato nel «Red Book» del 1980, usa PCM lineare a 16 bit e 44,1 kHz in stereo: 1,41 Mbit/s.' },
      { year: 2024, title: 'Decine di miliardi di campioni al secondo', who: 'AMD, serie Versal RF', text: 'Chip singoli con ADC a 14 bit fino a 32 miliardi di campioni al secondo digitalizzano direttamente segnali radio fino a 18 GHz, per radar, satelliti e strumenti di misura. Gli oscilloscopi di punta campionano già a 256 miliardi di campioni al secondo per canale (Keysight UXR, 2018).' },
    ],
    fun: 'I 44,1 kHz del CD vengono dai videoregistratori. I primi registratori audio digitali salvavano i campioni su videocassetta, tre per ogni riga dell\'immagine, e 44.100 era il numero che andava bene sia per il PAL europeo (3 × 294 righe × 50 semiquadri al secondo) sia per l\'NTSC americano (3 × 245 × 60).',
    uses: [
      'Telefonia e VoIP: voce in PCM a 64 kbit/s',
      'CD a 44,1 kHz e 16 bit, studi a 24 bit',
      'Schede audio e smartphone (sigma-delta)',
      'Oscilloscopi digitali fino a 256 GS/s',
      'Stazioni radio base 5G e radio software',
      'Radar e satelliti: ADC da 20–32 GS/s',
      'Microcontrollori: ADC SAR da 10–12 bit',
      'Sensori d\'immagine delle fotocamere',
      'Bilance, termocoppie, elettrocardiografi',
    ],
    glossary: [
      { term: 'Campionamento', def: 'Misura di un segnale continuo a istanti regolari, uno ogni <var>T</var><sub>s</sub> = 1/<var>f</var><sub>s</sub> secondi. <var>f</var><sub>s</sub> si misura in campioni al secondo (S/s).' },
      { term: 'Frequenza di Nyquist', def: 'Metà della frequenza di campionamento, <var>f</var><sub>s</sub>/2: la frequenza più alta che si può rappresentare senza ambiguità.' },
      { term: 'Aliasing', def: 'Una componente sopra <var>f</var><sub>s</sub>/2 che dopo il campionamento si traveste da frequenza più bassa. Si evita con un filtro passa-basso anti-aliasing prima del campionatore.' },
      { term: 'Quantizzazione e LSB', def: 'Arrotondamento di ogni campione al più vicino dei 2<sup><var>N</var></sup> livelli. L\'LSB è la distanza tra due livelli; l\'errore, entro ±½ LSB, è il rumore di quantizzazione.' },
      { term: 'PCM', def: 'Modulazione a impulsi codificati: il segnale viaggia come sequenza di campioni quantizzati, ciascuno scritto in binario. È il formato del telefono digitale e del CD.' },
      { term: 'ADC SAR', def: 'Convertitore ad approssimazioni successive: un DAC interno e un comparatore provano un bit alla volta, dal più significativo, dimezzando l\'intervallo. Servono <var>N</var> confronti per <var>N</var> bit.' },
      { term: 'ADC flash', def: 'Convertitore con 2<sup><var>N</var></sup> − 1 comparatori che lavorano tutti insieme: velocissimo, ma con 8 bit ne servono già 255.' },
      { term: 'Sigma-delta (ΣΔ)', def: 'Convertitore che campiona molto più in fretta del necessario con pochi bit, anche uno solo, chiusi in retroazione. Il rumore viene spinto fuori dalla banda utile e un filtro digitale lo elimina.' },
    ],
    sources: [
      { title: 'W. Kester, MT-001: la formula SNR = 6,02 N + 1,76 dB (Analog Devices)', url: 'https://www.analog.com/media/en/training-seminars/tutorials/MT-001.pdf' },
      { title: 'The Data Conversion Handbook: storia e architetture dei convertitori (Analog Devices)', url: 'https://www.analog.com/en/resources/technical-books/data-conversion-handbook.html' },
      { title: 'Sigma-delta ADC: un tutorial (Analog Devices)', url: 'https://www.analog.com/en/resources/technical-articles/sigmadelta-adcs-tutorial.html' },
      { title: 'C. E. Shannon, Communication in the Presence of Noise, 1949 (IEEE Xplore)', url: 'https://ieeexplore.ieee.org/document/1697831' },
      { title: 'Vladimir A. Kotelnikov (ETHW, IEEE History Center)', url: 'https://ethw.org/Vladimir_A._Kotelnikov' },
      { title: 'Bell Utilizes PCM Multiplexing: il sistema T1 del 1962 (ETHW)', url: 'https://ethw.org/Bell_Utilizes_PCM_Multiplexing' },
      { title: 'The SIGSALY Story (NSA, Center for Cryptologic History)', url: 'https://nsa.gov/about/cryptologic-heritage/historical-figures-publications/publications/wwii/sigsaly-story' },
      { title: 'AMD presenta i Versal RF, 10 dicembre 2024 (comunicato)', url: 'https://www.amd.com/en/newsroom/press-releases/2024-12-10-amd-introduces-versal-rf-series-adaptive-socs-offe.html' },
    ],
    // Domande temporanee: andranno spostate in quiz.js.
    quiz: [
      { id: 'ea-conversione-01', chapter: 'conversione', level: 1, topic: 'Teorema del campionamento', q: 'Un segnale audio contiene frequenze fino a 20 kHz. Quale frequenza di campionamento permette, in linea di principio, di ricostruirlo senza perdere nulla?', options: ['Più di 40 kHz', 'Almeno 20 kHz', 'Almeno 10 kHz', 'Qualsiasi, con 16 bit'], answer: 0, why: 'Il teorema del campionamento chiede fs > 2·fmax, quindi più di 40 kHz. Il CD usa 44,1 kHz per lasciare al filtro anti-aliasing lo spazio tra 20 e 22,05 kHz. Il numero di bit non c\'entra: fissa la precisione in ampiezza, non la banda.' },
      { id: 'ea-conversione-02', chapter: 'conversione', level: 2, topic: 'Aliasing', q: 'Un tono da 7 kHz viene campionato a 10 kHz senza filtro anti-aliasing. Che frequenza si sente dopo la ricostruzione?', options: ['3 kHz', '7 kHz', '17 kHz', '5 kHz'], answer: 0, why: '7 kHz supera la frequenza di Nyquist, che qui è 5 kHz. Il multiplo di fs più vicino è 10 kHz, quindi l\'alias è |7 − 10| = 3 kHz: i campioni sono identici a quelli di un tono da 3 kHz, e il DAC ricostruisce quello.' },
      { id: 'ea-conversione-03', chapter: 'conversione', level: 2, topic: 'Bit e rapporto S/R', q: 'Un convertitore ideale passa da 8 a 10 bit. Di quanto cresce, circa, il rapporto segnale/rumore di quantizzazione?', options: ['Di circa 12 dB', 'Di circa 2 dB', 'Di circa 25 dB', 'Di circa 6 dB'], answer: 0, why: 'Con SNR ≈ 6,02·N + 1,76 dB ogni bit vale circa 6 dB: due bit in più danno circa 12 dB, perché il gradino di quantizzazione diventa quattro volte più piccolo.' },
      { id: 'ea-conversione-04', chapter: 'conversione', level: 3, topic: 'Convertitore SAR', q: 'Un ADC SAR a 4 bit con fondo scala 1,6 V riceve 1,05 V e prova in ordine le soglie 0,8 V, 1,2 V, 1,0 V e 1,1 V. Quale codice trova?', options: ['1010', '1011', '0110', '1100'], answer: 0, why: 'Ogni confronto decide un bit, dal più significativo: 1,05 ≥ 0,8 dà 1; 1,05 < 1,2 dà 0; 1,05 ≥ 1,0 dà 1; 1,05 < 1,1 dà 0. Il codice 1010 vale 10 gradini da 0,1 V, cioè 1,0 V: l\'errore resta sotto un LSB.' },
    ],
    hero: {
      caption: 'Il campionatore misura l\'onda a intervalli regolari: ogni campione scatta sul livello più vicino, diventa un numero binario, e un DAC con un filtro ricostruisce la curva.',
      label: 'Animazione: campionamento, quantizzazione, codifica PCM, ricostruzione e aliasing',
      aspect: '16 / 7',
      aspectMobile: '1 / 1',
      mount: mountHero,
    },
    lab: {
      title: 'Campiona, quantizza, ricostruisci',
      intro: 'Scegli la frequenza del segnale e quella di campionamento, il numero di bit e il modo di ricostruire. Porta il segnale oltre <var>f</var><sub>s</sub>/2 e guarda l\'alias comparire, sia nel tempo sia sull\'asse delle frequenze dove lo spettro si ripiega; poi accendi il filtro anti-aliasing. Il fondo scala è di 2 V.',
      mount: mountLab,
    },
    model,
  });
})(typeof window !== 'undefined' ? window : globalThis);
