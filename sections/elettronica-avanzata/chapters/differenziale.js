/*
 * Capitolo 3 · Due fili contro il rumore (segnali differenziali ed EMC).
 * Animazione: un filo singolo con la massa e una coppia D+/D− portano gli stessi bit;
 * un motore emette impulsi di disturbo; il ricevitore differenziale sottrae e il
 * disturbo sparisce; l'intreccio annulla l'accoppiamento magnetico; infine l'occhio.
 * Laboratorio: diagramma a occhio con PRBS7, canale passa-basso, rumore, jitter,
 * disturbo di modo comune, filo singolo o coppia differenziale ed equalizzazione FFE.
 */
(function (root) {
  'use strict';

  const EA = root.EA;
  const TAU = Math.PI * 2;

  /* ---------- modello ---------- */

  const A_WIRE = 0.175;      // V: escursione di ciascun filo attorno al modo comune (LVDS: Vd = ±350 mV)
  const SPU = 32;            // campioni per intervallo unitario (UI)
  const NOISE_CORR = 0.2;    // UI: tempo di correlazione del rumore (banda finita del ricevitore)
  const CM_PERIOD = 53.7;    // UI: periodo del disturbo di modo comune, lento e non sincrono coi bit
  const RC2 = Math.sqrt(Math.SQRT2 - 1); // banda a −3 dB di due poli uguali, in unità della frequenza dei poli

  // Sequenza PRBS7 (ITU-T O.150): x⁷ + x⁶ + 1, cioè y[n] = y[n−6] ⊕ y[n−7]. Periodo 127 bit.
  function prbs7(count, seed) {
    let s = (seed == null ? 0x7f : seed) & 0x7f;
    if (!s) s = 0x7f;
    const out = [];
    for (let i = 0; i < count; i++) {
      const b = ((s >> 5) ^ (s >> 6)) & 1;
      s = ((s << 1) | b) & 0x7f;
      out.push(b);
    }
    return out;
  }

  // Coppia di tensioni → modo differenziale e modo comune.
  function diffCm(vp, vm) {
    return { vd: vp - vm, vcm: (vp + vm) / 2 };
  }

  // CMRR in decibel: 20·log10(Ad/Acm).
  const cmrrDb = (ad, acm) => 20 * Math.log10(ad / acm);

  // Tensione differenziale equivalente a un disturbo comune vcm con un certo CMRR (dB).
  const cmToDiff = (vcm, cmrr) => vcm / Math.pow(10, cmrr / 20);

  // Sbilanciamento ε tra i due fili: una frazione ε del modo comune diventa differenziale.
  // CMRR equivalente = 20·log10(1/ε).
  const imbalanceCmrr = (eps) => (eps > 0 ? -20 * Math.log10(eps) : Infinity);

  // Funzione d'errore complementare (Numerical Recipes, errore relativo < 1,2·10⁻⁷).
  function erfc(x) {
    const z = Math.abs(x);
    const t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }

  // Tasso di errore con rumore gaussiano e soglia ottima: BER = ½·erfc(Q/√2).
  const berFromQ = (q) => 0.5 * erfc(q / Math.SQRT2);

  // Inverso: il fattore Q che dà un certo BER (bisezione, BER tra 0 e 0,5).
  function qFromBer(ber) {
    if (!(ber > 0)) return Infinity;
    if (ber >= 0.5) return 0;
    let lo = 0;
    let hi = 40;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (berFromQ(mid) > ber) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // Fattore Q da medie e deviazioni standard dei livelli 1 e 0.
  const qFactor = (mu1, mu0, s1, s0) => (mu1 - mu0) / (s1 + s0);

  const unitInterval = (rate) => 1 / rate;   // NRZ: un simbolo = un bit
  const nyquist = (rate) => rate / 2;        // la sequenza 1010… ha questa fondamentale

  // Canale passa-basso con due poli uguali (RC²): costante di tempo per una banda f3 a −3 dB.
  const tauFor = (f3) => RC2 / (TAU * f3);

  // Perdita del canale (dB, positiva) alla frequenza f.
  function lossDb(f, f3) {
    const r = (f * RC2) / f3;
    return 20 * Math.log10(1 + r * r);
  }

  // Risposta al gradino unitario del canale RC².
  function stepResponse(t, tau) {
    if (t <= 0) return 0;
    const s = t / tau;
    return 1 - (1 + s) * Math.exp(-s);
  }

  // Risposta a un singolo bit (impulso rettangolare largo T), con equalizzatore FFE a 2 prese:
  // il trasmettitore invia c0·bit[n] + c1·bit[n−1], con |c0| + |c1| = 1 (escursione limitata).
  function pulse(t, T, tau, c1) {
    const c0 = 1 - Math.abs(c1 || 0);
    const p = (u) => stepResponse(u, tau) - stepResponse(u - T, tau);
    return c0 * p(t) + (c1 || 0) * p(t - T);
  }

  // Istante in cui una transizione isolata (da tanti 0 a tanti 1) attraversa la soglia.
  function crossTime(T, tau, c1) {
    const v = (t) => {
      let s = 0;
      for (let n = -24; n <= 24; n++) s += (n < 0 ? -1 : 1) * pulse(t - n * T, T, tau, c1);
      return s;
    };
    let lo = -T;
    let hi = 6 * T;
    for (let i = 0; i < 36; i++) {
      const mid = (lo + hi) / 2;
      if (v(mid) < 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // Il recupero del clock campiona a metà tra due fronti: mezzo UI dopo l'attraversamento.
  // In quell'istante si leggono i campioni della risposta a un bit ogni T (i "cursori"):
  // h0 è il bit stesso, gli altri sono l'interferenza sui vicini. Apertura nel caso peggiore: h0 − Σ|hk|.
  function cursors(T, tau, c1) {
    const dts = T / SPU;
    const tx = crossTime(T, tau, c1);
    const so = Math.max(1, Math.round((tx + T / 2) / dts));
    const t0 = so * dts;
    const main = pulse(t0, T, tau, c1);
    let isi = 0;
    for (let k = -3; k <= 14; k++) if (k) isi += Math.abs(pulse(t0 + k * T, T, tau, c1));
    const h = [];
    for (let k = -1; k <= 8; k++) h.push(pulse(t0 + k * T, T, tau, c1));
    return { so, tx, h, main, isi, open: main - isi };
  }

  // Equalizzazione in trasmissione: la presa c1 (≤ 0) che apre di più l'occhio nel caso peggiore.
  const tapCache = new Map();
  function bestTap(T, tau) {
    const key = T + '|' + tau;
    if (tapCache.has(key)) return tapCache.get(key);
    let bestC = 0;
    let bestOpen = -Infinity;
    for (let i = 0; i <= 40; i++) {
      const c1 = i ? -i / 100 : 0;
      const o = cursors(T, tau, c1).open;
      if (o > bestOpen + 1e-9) { bestOpen = o; bestC = c1; }
    }
    if (tapCache.size > 64) tapCache.clear();
    tapCache.set(key, bestC);
    return bestC;
  }

  // De-enfasi in dB: livello dei bit ripetuti rispetto alle transizioni, 20·log10(1 − 2|c1|).
  const deemphasisDb = (c1) => 20 * Math.log10(1 - 2 * Math.abs(c1));

  // F.e.m. raccolta da una coppia lunga 1 divisa in n anelli, in un campo che varia lungo il cavo:
  // field(x) è la variazione del flusso per unità di lunghezza nel punto x (0…1).
  // Coppia parallela: tutti gli anelli concordi; intrecciata: orientamento alterno.
  function pairPickup(n, twisted, field) {
    let sum = 0;
    const sub = 16;
    for (let i = 0; i < n; i++) {
      let flux = 0;
      for (let j = 0; j < sub; j++) flux += field((i + (j + 0.5) / sub) / n) / (n * sub);
      sum += twisted && i % 2 ? -flux : flux;
    }
    return sum;
  }

  // Generatore pseudo-casuale riproducibile (mulberry32) con gaussiane di Box–Muller.
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    let spare = null;
    const uniform = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const gauss = () => {
      if (spare != null) { const s = spare; spare = null; return s; }
      let u = 0;
      while (u < 1e-12) u = uniform();
      const v = uniform();
      const r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(TAU * v);
      return r * Math.cos(TAU * v);
    };
    return { uniform, gauss };
  }

  // Parametri derivati di un collegamento.
  // p = { mode: 'se'|'diff', rate (bit/s), f3 (Hz), sigma (V per filo), rj (UI rms), cm (V di picco), imb (0…1), eq }
  function linkSetup(p) {
    const T = 1 / p.rate;
    const tau = tauFor(p.f3);
    const c1 = p.eq ? bestTap(T, tau) : 0;
    const cur = cursors(T, tau, c1);
    const diff = p.mode === 'diff';
    return {
      T, tau, c1, c0: 1 - Math.abs(c1), so: cur.so, cursors: cur,
      amp: A_WIRE * (diff ? 2 : 1),                  // il differenziale vede il doppio del segnale…
      sigma: (p.sigma || 0) * (diff ? Math.SQRT2 : 1), // …e il rumore indipendente dei due fili, in potenza
      kcm: diff ? (p.imb || 0) : 1,                  // filo singolo: il disturbo comune passa tutto
      cm: p.cm || 0, rj: p.rj || 0,
    };
  }

  // Flusso di campioni all'ingresso del decisore (SPU per UI), con ISI, jitter, rumore e modo comune.
  // Il canale RC² si integra esattamente tra un fronte e l'altro: ingresso costante a tratti.
  function createStream(p, seed) {
    const L = linkSetup(p);
    const r = rng(seed == null ? 7 : seed);
    const T = L.T;
    const dts = T / SPU;
    const alpha = Math.exp(-1 / (SPU * NOISE_CORR));
    const beta = Math.sqrt(1 - alpha * alpha);
    const RING = 2048;
    const bits = new Int8Array(RING);
    let lfsr = 0x7f;
    const genBit = () => {
      const b = ((lfsr >> 5) ^ (lfsr >> 6)) & 1;
      lfsr = ((lfsr << 1) | b) & 0x7f;
      return b ? 1 : -1;
    };
    let bPrev = genBit();
    let x = L.amp * (L.c0 + L.c1) * bPrev; // si parte a regime
    let y1 = x;
    let y2 = x;
    let tNow = 0;
    let k = 0;
    let tB = 0;
    let aB = 0;
    let m = 0;
    let nz = 0;
    function prep() {
      const b = genBit();
      bits[k % RING] = b;
      const j = Math.max(-0.45, Math.min(0.45, r.gauss() * L.rj));
      tB = (k + j) * T;
      aB = L.amp * (L.c0 * b + L.c1 * bPrev);
      bPrev = b;
      k++;
    }
    function advance(dt) {
      if (dt <= 0) return;
      const s = dt / L.tau;
      const e = Math.exp(-s);
      const u1 = y1 - x;
      const u2 = y2 - x;
      y1 = x + u1 * e;
      y2 = x + (u2 + u1 * s) * e;
    }
    prep();
    return {
      link: L,
      get produced() { return m; },
      bit: (i) => bits[((i % RING) + RING) % RING],
      // Prossimi `count` campioni: v con il rumore casuale, c senza (serve alla stima statistica).
      next(count, v, c) {
        const out = v || new Float32Array(count);
        const clean = c || new Float32Array(count);
        for (let i = 0; i < count; i++, m++) {
          const ts = m * dts;
          while (tB <= ts) { advance(tB - tNow); tNow = tB; x = aB; prep(); }
          advance(ts - tNow);
          tNow = ts;
          const cmv = L.cm * L.kcm * Math.sin((TAU * m) / (SPU * CM_PERIOD) + 0.7);
          nz = alpha * nz + beta * r.gauss();
          clean[i] = y2 + cmv;
          out[i] = clean[i] + L.sigma * nz;
        }
        return { v: out, c: clean };
      },
    };
  }

  // Percentile di un array già ordinato.
  function pct(sorted, q) {
    if (!sorted.length) return NaN;
    const i = EA.clamp(q * (sorted.length - 1), 0, sorted.length - 1);
    const lo = Math.floor(i);
    const hi = Math.min(sorted.length - 1, lo + 1);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
  }

  const newAcc = () => ({ val: [], dist: [], bit: [], cross: [], errors: 0, n: 0 });

  // Misure di un simbolo con bit b (seguito da nb), campionato all'indice i:
  // valore con e senza rumore, errore, e istante in cui la transizione attraversa la soglia.
  function measure(v, c, i, b, nb, a) {
    a.val.push(v[i]);
    a.dist.push(b * c[i]);
    a.bit.push(b);
    a.n++;
    if (v[i] * b <= 0) a.errors++;
    if (nb !== b && v[i] * b > 0) {
      for (let j = i + 1; j <= i + SPU && j < v.length; j++) {
        if (v[j] * nb > 0) {
          const f = v[j - 1] / (v[j - 1] - v[j]);
          a.cross.push((j - 1 + f - i) / SPU);
          break;
        }
      }
    }
  }

  function collect(v, c, bitOf, so, k0, k1, acc) {
    const a = acc || newAcc();
    for (let k = k0; k < k1; k++) {
      const mk = k * SPU + so;
      if (mk < SPU || mk + SPU >= v.length) continue;
      measure(v, c, mk, bitOf(k), bitOf(k + 1), a);
    }
    return a;
  }

  // Taglia un flusso in finestre di 2 UI centrate sull'istante di campionamento di ogni simbolo:
  // fn(v, c, i, k) riceve i campioni e l'indice i del campionamento del simbolo k.
  function feeder(st) {
    const L = st.link;
    let v = new Float32Array(0);
    let c = new Float32Array(0);
    let base = 0;
    let k = 4;
    function ensure(upto) {
      const have = base + v.length;
      if (upto <= have) return;
      const n = Math.max(upto - have, 16 * SPU);
      const out = st.next(n);
      const keep = EA.clamp(k * SPU + L.so - 2 * SPU - base, 0, v.length);
      const nv = new Float32Array(v.length - keep + n);
      nv.set(v.subarray(keep));
      nv.set(out.v, v.length - keep);
      const nc = new Float32Array(c.length - keep + n);
      nc.set(c.subarray(keep));
      nc.set(out.c, c.length - keep);
      v = nv;
      c = nc;
      base += keep;
    }
    return {
      link: L,
      bit: st.bit,
      pull(count, fn) {
        for (let i = 0; i < count; i++, k++) {
          const mk = k * SPU + L.so;
          ensure(mk + SPU + 2);
          fn(v, c, mk - base, k);
        }
      },
    };
  }

  // Misure dell'occhio da campioni raccolti con collect().
  // Altezza: dal percentile 0,1% degli 1 al 99,9% degli 0. Larghezza: 1 UI meno la dispersione
  // degli attraversamenti. BER: media delle code gaussiane del rumore casuale su ogni campione
  // senza rumore (così i disturbi limitati, come una sinusoide, non vengono trattati da gaussiani);
  // Q è il fattore equivalente, BER = ½·erfc(Q/√2).
  function eyeStats(acc, sigma) {
    const ones = [];
    const zeros = [];
    acc.val.forEach((x, i) => (acc.bit[i] > 0 ? ones : zeros).push(x));
    ones.sort((p, q) => p - q);
    zeros.sort((p, q) => p - q);
    const height = ones.length && zeros.length ? pct(ones, 0.001) - pct(zeros, 0.999) : NaN;
    const cr = acc.cross.slice().sort((p, q) => p - q);
    const spread = cr.length > 4 ? pct(cr, 0.999) - pct(cr, 0.001) : 1;
    let ber = 0;
    const s = Math.max(sigma, 1e-9);
    for (const d of acc.dist) ber += berFromQ(d / s);
    ber /= Math.max(1, acc.dist.length);
    const open = height > 0;
    const mean = (arr) => arr.reduce((t, x) => t + x, 0) / Math.max(1, arr.length);
    return {
      height,
      width: open ? Math.max(0, 1 - spread) : 0,
      cross: cr.length ? pct(cr, 0.5) : 0.5,
      crossLo: cr.length > 4 ? pct(cr, 0.001) : 0.5,
      crossHi: cr.length > 4 ? pct(cr, 0.999) : 0.5,
      top: ones.length ? pct(ones, 0.001) : NaN,
      bottom: zeros.length ? pct(zeros, 0.999) : NaN,
      mu1: mean(ones), mu0: mean(zeros),
      ber, q: qFromBer(ber),
      errors: acc.errors, n: acc.n,
    };
  }

  // Simulazione completa e riproducibile di nBits bit (dopo 16 bit di assestamento).
  function simulate(p, nBits, seed) {
    const st = createStream(p, seed);
    const L = st.link;
    const total = (nBits + 16) * SPU + L.so + 2 * SPU;
    const { v, c } = st.next(total);
    const acc = collect(v, c, st.bit, L.so, 16, 16 + nBits);
    return { link: L, v, c, acc, stats: eyeStats(acc, L.sigma) };
  }

  const model = {
    A_WIRE, SPU, prbs7, diffCm, cmrrDb, cmToDiff, imbalanceCmrr, erfc, berFromQ, qFromBer, qFactor,
    unitInterval, nyquist, tauFor, lossDb, stepResponse, pulse, cursors, bestTap, deemphasisDb,
    pairPickup, rng, linkSetup, createStream, measure, collect, feeder, eyeStats, simulate,
  };

  /* ---------- persistenza da oscilloscopio (istogramma 2D con dissolvenza) ---------- */

  // Tabella colori: dal rosa tenue della tinta al bianco rosato dove le tracce si accumulano.
  function makeLut(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    const c = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    const hot = [255, 238, 246];
    const lut = new Uint8ClampedArray(256 * 4);
    for (let i = 1; i < 256; i++) {
      const f = i / 255;
      const k = EA.smooth((f - 0.55) / 0.45);
      lut[i * 4] = EA.lerp(c[0], hot[0], k);
      lut[i * 4 + 1] = EA.lerp(c[1], hot[1], k);
      lut[i * 4 + 2] = EA.lerp(c[2], hot[2], k);
      lut[i * 4 + 3] = 255 * Math.min(1, 0.2 + 1.3 * f);
    }
    return lut;
  }

  function persist(nx, ny, hex) {
    const P = { nx, ny, d: new Float32Array(nx * ny), max: 1, lut: makeLut(hex), cv: null, img: null };
    if (typeof document !== 'undefined') {
      P.cv = document.createElement('canvas');
      P.cv.width = nx;
      P.cv.height = ny;
      P.img = P.cv.getContext('2d').createImageData(nx, ny);
    }
    return P;
  }

  function persistDecay(P, k) {
    const d = P.d;
    for (let i = 0; i < d.length; i++) d[i] *= k;
  }

  // Aggiunge una traccia: ys[i] è la tensione al campione i, su n campioni equispaziati
  // da sinistra a destra; yOf converte la tensione in riga (anche frazionaria).
  function persistTrace(P, ys, i0, n, yOf) {
    const { nx, ny, d } = P;
    let prevRow = null;
    const sx = (nx - 1) / (n - 1);
    for (let i = 0; i < n - 1; i++) {
      const ya = yOf(ys[i0 + i]);
      const yb = yOf(ys[i0 + i + 1]);
      const xa = i * sx;
      const xb = (i + 1) * sx;
      for (let xi = Math.ceil(xa); xi <= xb && xi < nx; xi++) {
        if (i > 0 && xi === Math.ceil(xa) && xi === xa) continue;
        const row = ya + ((yb - ya) * (xi - xa)) / (xb - xa);
        let r0 = Math.round(row);
        let r1 = r0;
        if (prevRow != null) {
          const pr = Math.round(prevRow);
          if (pr < r0) r0 = pr + 1; else if (pr > r0) r1 = pr - 1;
        }
        prevRow = row;
        const lo = Math.max(0, Math.min(r0, r1));
        const hi = Math.min(ny - 1, Math.max(r0, r1));
        for (let yy = lo; yy <= hi; yy++) d[yy * nx + xi] += 1;
      }
    }
  }

  // Disegna l'istogramma nel rettangolo dato, normalizzato sul massimo (smorzato) e con gamma.
  function persistDraw(P, ctx, x, y, w, hh, smoothMax) {
    if (!P.cv) return;
    const { d, lut } = P;
    let mx = 0;
    for (let i = 0; i < d.length; i++) if (d[i] > mx) mx = d[i];
    P.max = smoothMax ? Math.max(mx * 0.5, P.max * 0.92 + mx * 0.08) : mx;
    const norm = 1 / Math.max(1e-6, P.max * 0.7);
    const px = P.img.data;
    for (let i = 0; i < d.length; i++) {
      const v = d[i] * norm;
      const li = v <= 0.002 ? 0 : Math.min(255, 1 + Math.floor(254 * Math.sqrt(Math.min(1, v))));
      const o = i * 4;
      const l = li * 4;
      px[o] = lut[l]; px[o + 1] = lut[l + 1]; px[o + 2] = lut[l + 2]; px[o + 3] = lut[l + 3];
    }
    P.cv.getContext('2d').putImageData(P.img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(P.cv, x, y, w, hh);
    ctx.restore();
  }

  /* ---------- animazione principale: filo singolo contro coppia differenziale ---------- */

  const HERO_TB = 0.5; // secondi per bit sullo schermo
  const BUMP = 1.6;    // altezza dell'impulso di disturbo, in unità dell'escursione di un filo
  const PRBS = prbs7(127);
  const bitAt = (n) => PRBS[((n % 127) + 127) % 127];

  const STAGES = [
    { key: 'se', dur: 8, title: '1 · FILO SINGOLO', sub: 'il ricevitore confronta il filo con la massa', say: 'Filo singolo: un impulso di disturbo porta uno 0 sopra la soglia e il ricevitore sbaglia.' },
    { key: 'diff', dur: 7, title: '2 · COPPIA DIFFERENZIALE', sub: 'due fili, due copie opposte dello stesso segnale', say: 'Coppia differenziale: D+ è alto quando D− è basso.' },
    { key: 'cm', dur: 8, title: '3 · MODO COMUNE', sub: 'il disturbo sposta i due fili della stessa quantità', say: 'Il disturbo sposta insieme D+ e D−: cambia il modo comune, non la differenza.' },
    { key: 'sub', dur: 8, title: '4 · SOTTRAZIONE', sub: 'D+ − D−: il disturbo sparisce, il segnale raddoppia', say: 'Il ricevitore sottrae: la differenza è pulita e doppia, mentre il filo singolo sbaglia.' },
    { key: 'twist', dur: 9, title: '5 · INTRECCIO', sub: 'anelli alterni: le tensioni indotte si annullano', say: 'La coppia parallela raccoglie il campo magnetico e sbaglia, quella intrecciata no.' },
    { key: 'eye', dur: 9, title: '6 · DIAGRAMMA A OCCHIO', sub: 'migliaia di bit sovrapposti, due UI alla volta', say: 'Diagramma a occhio: i bit ricevuti si sovrappongono e mostrano i margini.' },
  ];

  // Visibilità per fase: filo singolo, coppia con le tracce, coppia parallela, intreccio,
  // risultato della sottrazione, modo comune, occhio. burst: il motore emette impulsi.
  const LOOKS = {
    se: { se: 1, pair: 0.2, par: 0, twist: 0, sub: 0, cm: 0, eye: 0, burst: 1 },
    diff: { se: 0.45, pair: 1, par: 0, twist: 0, sub: 0, cm: 0, eye: 0, burst: 0 },
    cm: { se: 1, pair: 1, par: 0, twist: 0, sub: 0, cm: 1, eye: 0, burst: 1 },
    sub: { se: 1, pair: 1, par: 0, twist: 0, sub: 1, cm: 0, eye: 0, burst: 1 },
    twist: { se: 0, pair: 0, par: 1, twist: 1, sub: 0, cm: 0, eye: 0, burst: 1 },
    eye: { se: 0, pair: 0, par: 0, twist: 1, sub: 0, cm: 0, eye: 1, burst: 0 },
  };
  const LOOK_KEYS = ['se', 'pair', 'par', 'twist', 'sub', 'cm', 'eye'];

  // Livello logico (0…1) nella posizione u (in bit), con fronti di salita morbidi.
  function levelAt(u) {
    const n = Math.floor(u);
    const f = u - n;
    const e = 0.16;
    const b = bitAt(n);
    if (f < e / 2) return EA.lerp(bitAt(n - 1), b, EA.smooth(0.5 + f / e));
    if (f > 1 - e / 2) return EA.lerp(b, bitAt(n + 1), EA.smooth((f - 1 + e / 2) / e));
    return b;
  }

  function mountHero(view, api) {
    const C = EA.colors;
    const SE_COL = C.amber;
    const NOISE = C.orange;
    const cv = api.canvas(view, { label: 'Un filo singolo con la massa e una coppia differenziale D+ e D− portano gli stessi bit dal trasmettitore al ricevitore. Un motore emette impulsi di disturbo che colpiscono tutti i fili allo stesso modo: il filo singolo sbaglia, la differenza tra D+ e D− resta pulita. Poi la coppia si intreccia e i bit ricevuti formano un diagramma a occhio.' });
    const ctx = cv.ctx;
    let stage = 0;
    let stageT = 0;
    const look = Object.assign({}, LOOKS.se);
    let bumps = new Set();
    let nextTarget = null;
    let loopCtl = null;
    // occhio della fase 6: coppia differenziale con banda finita, rumore e jitter
    const EYE_P = { mode: 'diff', rate: 1, f3: 0.42, sigma: 0.011, rj: 0.03, cm: 0, imb: 0, eq: false };
    const eyeRef = simulate(EYE_P, 900, 5).stats;
    let eyeP = null;
    let eyeFeed = null;
    let eyeStatic = false;

    function geometry() {
      const w = cv.w;
      const hh = cv.h;
      const narrow = w < 560;
      const g = { w, hh, narrow, pad: narrow ? 12 : 22 };
      g.U = narrow ? 10 : Math.round(EA.clamp(hh * 0.04, 13, 20));
      g.tx0 = g.pad;
      g.tx1 = g.pad + (narrow ? 28 : 46);
      if (narrow) {
        g.rx1 = w - g.pad;
        g.rx0 = g.rx1 - 28;
        g.out0 = g.pad;
        g.out1 = w - g.pad;
        g.yTop = Math.round(hh * 0.29);
        g.yBot0 = Math.round(hh * 0.51);
        g.panelY0 = Math.round(EA.lerp(hh * 0.64, g.yTop + g.U * 2.4, look.eye));
        g.panelY1 = hh - 10;
        g.nBits = 7;
      } else {
        g.rx0 = Math.round(w * 0.585);
        g.rx1 = g.rx0 + 50;
        g.out0 = g.rx1 + 18;
        g.out1 = w - g.pad;
        g.yTop = Math.round(Math.max(120, hh * 0.3));
        g.yBot0 = Math.round(hh * 0.7);
        g.panelY0 = 62;
        g.panelY1 = hh - 20;
        g.nBits = 12;
      }
      g.yBot = narrow ? Math.round(EA.lerp(g.yBot0, g.yTop, look.eye)) : g.yBot0;
      g.Lb = (g.rx0 - g.tx1) / g.nBits;
      g.xiF = g.nBits * 0.34;
      g.xF = g.tx1 + g.xiF * g.Lb;
      g.yM = Math.round((g.yTop + g.yBot0) / 2);
      g.a = g.U * 1.2;
      g.p = g.Lb * 0.75;
      g.lens0 = Math.round((g.xF - g.tx1) / g.p) - 1;
      g.zone0 = g.tx1 + (g.lens0 - 0.5) * g.p;
      g.zone1 = g.zone0 + 4 * g.p;
      g.panelBits = (g.out1 - g.out0) / g.Lb;
      g.lane1 = narrow ? g.panelY0 + 40 : g.yTop;
      g.lane2 = narrow ? g.panelY0 + 94 : g.yBot0;
      return g;
    }

    /* impulsi di disturbo: ognuno viaggia insieme al bit 0 su cui è nato */

    const birth = (n, g) => (n + 0.5 + g.xiF) * HERO_TB;
    const firstZero = (n) => { while (bitAt(n)) n++; return n; };

    // Fotogramma fermo: un bit disturbato appena uscito dal ricevitore e uno in viaggio sul filo.
    function canonical(g) {
      const n0 = firstZero(100);
      const u = n0 + 0.5 + g.nBits + 2.5;
      bumps = new Set();
      nextTarget = null;
      if (LOOKS[STAGES[stage].key].burst) {
        bumps.add(n0);
        const hi = Math.floor(u - 0.5 - g.xiF - 0.7);
        for (let n = n0 + (g.narrow ? 4 : 6); n <= hi; n++) if (!bitAt(n)) { bumps.add(n); break; }
      }
      return u * HERO_TB;
    }

    function updateBursts(t, g) {
      if (LOOKS[STAGES[stage].key].burst) {
        if (nextTarget == null) nextTarget = firstZero(Math.ceil(t / HERO_TB - 0.5 - g.xiF + 0.5));
        while (t >= birth(nextTarget, g)) {
          bumps.add(nextTarget);
          nextTarget = firstZero(nextTarget + (g.narrow ? 5 : 6));
        }
      }
      const u = t / HERO_TB;
      for (const n of bumps) if (u - n - 0.5 > g.nBits + g.panelBits + 1.5) bumps.delete(n);
    }

    // Ampiezza (0…1) dei disturbi nella posizione ξ (in bit dal trasmettitore).
    function bumpAt(xi, u0, g) {
      let s = 0;
      for (const n of bumps) {
        const xc = u0 - n - 0.5;
        const born = EA.smooth((xc - g.xiF) / 0.35 + 0.5);
        const d = xi - xc;
        if (born <= 0 || Math.abs(d) > 1.4) continue;
        s += born * Math.exp(-(d * d) / 0.18);
      }
      return s;
    }

    function lastFlash(t, g) {
      let tb = -Infinity;
      for (const n of bumps) { const b = birth(n, g); if (b <= t && b > tb) tb = b; }
      return Number.isFinite(tb) ? { age: t - tb, k: Math.exp(-(t - tb) / 0.3) } : { age: Infinity, k: 0 };
    }

    /* disegno */

    function box(x, y, w, hh, stroke, r) {
      ctx.save();
      ctx.fillStyle = EA.alpha('#060b0a', 0.88);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, hh, r == null ? 10 : r); else ctx.rect(x, y, w, hh);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    function dashed(x0, y0, x1, y1, color, dash) {
      ctx.save();
      ctx.setLineDash(dash || [4, 5]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.restore();
    }

    function header(g) {
      const st = STAGES[stage];
      const top = g.narrow ? 20 : 28;
      EA.draw.text(ctx, st.title, g.pad, top, { color: C.ink, size: g.narrow ? 11 : 12, weight: 700 });
      EA.draw.text(ctx, st.sub, g.pad, top + (g.narrow ? 15 : 17), { color: C.dim, size: g.narrow ? 10.5 : 11 });
    }

    function transmitter(g) {
      const y0 = g.yTop - g.U * 2.4;
      const y1 = Math.max(g.yBot, g.yTop) + g.U * 2.4;
      box(g.tx0, y0, g.tx1 - g.tx0, y1 - y0, C.grid, 8);
      EA.draw.text(ctx, 'TX', (g.tx0 + g.tx1) / 2, (y0 + y1) / 2 + 4, { color: C.text, size: 11, weight: 700, align: 'center' });
    }

    function motor(g, t, playing) {
      const r = g.narrow ? 9 : 14;
      const fl = lastFlash(t, g);
      const on = LOOKS[STAGES[stage].key].burst;
      // fronti d'onda che partono dal motore e investono tutti i fili
      ctx.save();
      ctx.beginPath();
      ctx.rect(g.tx1, 0, g.rx0 - g.tx1, g.narrow ? g.panelY0 - 4 : g.hh);
      ctx.clip();
      ctx.lineWidth = 1.5;
      if (playing) {
        for (const n of bumps) {
          const a = t - birth(n, g);
          if (a < 0 || a > 1.6) continue;
          for (let j = 0; j < 3; j++) {
            const aa = a - j * 0.12;
            if (aa < 0) continue;
            ctx.strokeStyle = EA.alpha(NOISE, 0.55 * (1 - a / 1.6) * (1 - j * 0.25));
            ctx.beginPath();
            ctx.arc(g.xF, g.yM, r + aa * (g.narrow ? 80 : 160), 0, TAU);
            ctx.stroke();
          }
        }
      } else if (on) {
        [1.4, 2.6, 3.8].forEach((m, j) => {
          ctx.strokeStyle = EA.alpha(NOISE, 0.32 - j * 0.08);
          ctx.beginPath();
          ctx.arc(g.xF, g.yM, r * m + 4, 0, TAU);
          ctx.stroke();
        });
      }
      ctx.restore();
      const k = on ? Math.max(playing ? fl.k : 0.6, 0.25) : 0.12;
      ctx.save();
      ctx.fillStyle = C.bg;
      ctx.strokeStyle = EA.alpha(NOISE, 0.45 + 0.55 * k);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(g.xF, g.yM, r, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      if (playing && fl.k > 0.05) EA.draw.dot(ctx, g.xF, g.yM, r * 0.5, NOISE);
      EA.draw.text(ctx, 'M', g.xF, g.yM + (g.narrow ? 4 : 4.5), { color: on ? C.ink : C.dim, size: g.narrow ? 10.5 : 12, weight: 800, align: 'center' });
      if (!g.narrow) EA.draw.text(ctx, 'motore', g.xF + r + 8, g.yM + 4, { color: on ? NOISE : C.dim, size: 10.5 });
    }

    // Traccia della tensione lungo un filo: off(ξ) è lo spostamento verticale in pixel.
    function wireTrace(g, f) {
      const pts = [];
      for (let x = g.tx1; x <= g.rx0 + 0.5; x += 2) pts.push([x, f((x - g.tx1) / g.Lb)]);
      return pts;
    }

    function singleEnded(g, u0) {
      const U = g.U;
      const yLow = g.yTop + U;
      const yG = yLow + (g.narrow ? 7 : 10);
      ctx.save();
      ctx.globalAlpha = look.se;
      dashed(g.tx1, yG, g.rx0, yG, EA.alpha(C.dim, 0.8), [2, 4]);
      dashed(g.rx0 - 1.6 * g.Lb, g.yTop, g.rx0 + 4, g.yTop, EA.alpha(C.text, 0.5));
      const hot = [];
      let run = null;
      const pts = wireTrace(g, (xi) => {
        const bp = bumpAt(xi, u0, g);
        const y = yLow - 2 * U * levelAt(u0 - xi) - BUMP * U * bp;
        if (bp > 0.06) { if (!run) { run = []; hot.push(run); } run.push([g.tx1 + xi * g.Lb, y]); } else run = null;
        return y;
      });
      EA.draw.line(ctx, pts, SE_COL, 2);
      hot.forEach((r) => EA.draw.line(ctx, r, NOISE, 2.4));
      EA.draw.text(ctx, 'filo singolo', g.tx1 + 8, g.yTop - U - (g.narrow ? 8 : 12), { color: SE_COL, size: g.narrow ? 10.5 : 11 });
      if (!g.narrow) {
        EA.draw.text(ctx, 'massa', g.tx1 + 8, yG + 15, { color: C.dim, size: 10.5 });
        EA.draw.text(ctx, 'soglia', g.rx0 - 1.6 * g.Lb - 6, g.yTop + 4, { color: C.dim, size: 10.5, align: 'right' });
      }
      ctx.restore();
    }

    function pair(g, u0) {
      const U = g.U;
      const yc = g.yBot;
      ctx.save();
      ctx.globalAlpha = look.pair;
      dashed(g.tx1, yc, g.rx0, yc, EA.alpha(C.text, 0.28));
      const P = [];
      const M = [];
      const B = [];
      for (let x = g.tx1; x <= g.rx0 + 0.5; x += 2) {
        const xi = (x - g.tx1) / g.Lb;
        const s = 2 * levelAt(u0 - xi) - 1;
        const off = BUMP * U * bumpAt(xi, u0, g);
        P.push([x, yc - U * s - off]);
        M.push([x, yc + U * s - off]);
        B.push(bitAt(Math.floor(u0 - xi)));
      }
      // nastro della differenza: rosa quando D+ sta sopra (bit 1), viola quando sta sotto
      let i0 = 0;
      for (let i = 1; i <= P.length; i++) {
        if (i < P.length && B[i] === B[i0]) continue;
        const end = Math.min(i, P.length - 1);
        ctx.fillStyle = EA.alpha(B[i0] ? C.pink : C.violet, 0.13);
        ctx.beginPath();
        for (let j = i0; j <= end; j++) (j === i0 ? ctx.moveTo : ctx.lineTo).call(ctx, P[j][0], P[j][1]);
        for (let j = end; j >= i0; j--) ctx.lineTo(M[j][0], M[j][1]);
        ctx.fill();
        i0 = i;
      }
      EA.draw.line(ctx, M, C.violet, 2);
      EA.draw.line(ctx, P, C.pink, 2);
      const ly = yc - U - (g.narrow ? 12 : 18);
      EA.draw.text(ctx, 'D+', g.tx1 + 8, ly, { color: C.pink, size: 11, weight: 700 });
      EA.draw.text(ctx, 'D−', g.tx1 + 34, ly, { color: C.violet, size: 11, weight: 700 });
      if (look.cm > 0.01) commonMode(g, u0);
      ctx.restore();
    }

    // Fase 3: la media dei due fili (modo comune) segue il disturbo, la loro distanza no.
    function commonMode(g, u0) {
      const U = g.U;
      const yc = g.yBot;
      ctx.save();
      ctx.globalAlpha *= look.cm;
      const mid = wireTrace(g, (xi) => yc - BUMP * U * bumpAt(xi, u0, g));
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = EA.alpha(C.ink, 0.85);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      mid.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
      ctx.setLineDash([]);
      let best = null;
      for (const n of bumps) {
        const xc = u0 - n - 0.5;
        if (xc > g.xiF + 0.8 && xc < g.nBits - 0.6 && (!best || xc > best)) best = xc;
      }
      const ty = yc + U + (g.narrow ? 16 : 24);
      if (best != null) {
        const x = g.tx1 + best * g.Lb;
        EA.draw.arrow(ctx, x, yc, x, yc - BUMP * U + 2, C.ink, 1.6, 7);
        const txt = g.narrow ? 'modo comune' : 'modo comune: D+ e D− salgono insieme';
        ctx.save();
        ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        const tw = ctx.measureText(txt).width;
        ctx.restore();
        const tx = EA.clamp(x - tw / 2, g.tx1 + 4, g.rx0 - tw - 6);
        EA.draw.text(ctx, txt, tx, ty, { color: C.ink, size: g.narrow ? 10.5 : 11 });
      } else {
        EA.draw.text(ctx, 'modo comune', g.tx1 + 8, ty, { color: C.ink, size: 10.5 });
      }
      ctx.restore();
    }

    // Fase 5: il campo magnetico del motore attraversa una zona di entrambe le coppie.
    function field(g, t, playing) {
      const fl = playing ? lastFlash(t, g).k : 0.5;
      const y0 = g.yTop - g.a - 16;
      const y1 = g.yBot + g.a + 16;
      ctx.save();
      ctx.globalAlpha = look.par;
      const grd = ctx.createLinearGradient(g.zone0, 0, g.zone1, 0);
      grd.addColorStop(0, EA.alpha(NOISE, 0));
      grd.addColorStop(0.5, EA.alpha(NOISE, 0.08 + 0.1 * fl));
      grd.addColorStop(1, EA.alpha(NOISE, 0));
      ctx.fillStyle = grd;
      ctx.fillRect(g.zone0, y0, g.zone1 - g.zone0, y1 - y0);
      if (!g.narrow) EA.draw.text(ctx, 'campo magnetico del motore', (g.zone0 + g.zone1) / 2, y0 - 8, { color: NOISE, size: 10.5, align: 'center' });
      ctx.restore();
    }

    // Freccia circolare: il verso della f.e.m. indotta in un anello (dir 1 orario, −1 antiorario).
    function loopArrow(cx, cy, r, dir, rot, col, alpha) {
      const span = 1.6 * Math.PI;
      const a1 = rot + dir * span;
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy, r, rot, a1, dir < 0);
      ctx.stroke();
      const ex = cx + r * Math.cos(a1);
      const ey = cy + r * Math.sin(a1);
      const th = a1 + (dir * Math.PI) / 2;
      const hl = Math.max(4, r * 0.55);
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(th) * hl * 0.7, ey + Math.sin(th) * hl * 0.7);
      ctx.lineTo(ex + Math.cos(th + 2.3) * hl * 0.6, ey + Math.sin(th + 2.3) * hl * 0.6);
      ctx.lineTo(ex + Math.cos(th - 2.3) * hl * 0.6, ey + Math.sin(th - 2.3) * hl * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Due fili di una coppia: pieni quando portano il livello alto, tenui quando è basso.
    function strands(g, yc, offTop, offBot, u0) {
      const runs = [];
      let cur = null;
      for (let x = g.tx1; x <= g.rx0 + 0.5; x += 2) {
        const b = bitAt(Math.floor(u0 - (x - g.tx1) / g.Lb));
        const p = [x, yc + offTop(x)];
        const m = [x, yc + offBot(x)];
        if (!cur || cur.b !== b) {
          if (cur) { cur.P.push(p); cur.M.push(m); }
          cur = { b, P: [], M: [] };
          runs.push(cur);
        }
        cur.P.push(p);
        cur.M.push(m);
      }
      runs.forEach((r) => {
        EA.draw.line(ctx, r.M, r.b ? EA.alpha(C.violet, 0.35) : C.violet, r.b ? 1.5 : 2.2, !r.b);
        EA.draw.line(ctx, r.P, r.b ? C.pink : EA.alpha(C.pink, 0.35), r.b ? 2.2 : 1.5, !!r.b);
      });
    }

    function parallel(g, u0, t, playing) {
      const yc = g.yTop;
      const a = g.a;
      const fl = playing ? lastFlash(t, g).k : 0.6;
      ctx.save();
      ctx.globalAlpha = look.par;
      ctx.fillStyle = EA.alpha(NOISE, 0.08 + 0.14 * fl);
      ctx.fillRect(g.zone0, yc - a, g.zone1 - g.zone0, 2 * a);
      strands(g, yc, () => -a, () => a, u0);
      loopArrow((g.zone0 + g.zone1) / 2, yc, a * 0.68, 1, playing ? t * 2.4 : 0.6, NOISE, 0.55 + 0.45 * fl);
      // la tensione indotta nell'unico anello è differenziale e viaggia fino al ricevitore
      for (const n of bumps) {
        const xc = u0 - n - 0.5;
        const born = EA.smooth((xc - g.xiF) / 0.35 + 0.5);
        if (born <= 0 || xc > g.nBits + 0.2) continue;
        const x = g.tx1 + xc * g.Lb;
        const grd = ctx.createRadialGradient(x, yc, 0, x, yc, a * 1.5);
        grd.addColorStop(0, EA.alpha(NOISE, 0.75 * born));
        grd.addColorStop(1, EA.alpha(NOISE, 0));
        ctx.fillStyle = grd;
        ctx.fillRect(x - a * 1.5, yc - a * 1.5, a * 3, a * 3);
      }
      EA.draw.text(ctx, g.narrow ? 'un solo anello' : 'coppia parallela: un solo anello, le tensioni si sommano', g.narrow ? g.zone0 : g.tx1 + 8, yc + a + (g.narrow ? 13 : 20), { color: C.text, size: 10.5 });
      ctx.restore();
    }

    function twisted(g, u0, t, playing) {
      const yc = g.yBot;
      const a = g.a;
      const k = EA.smooth(look.twist);
      const off = (x) => a * EA.lerp(1, Math.cos((Math.PI * (x - g.tx1)) / g.p), k);
      ctx.save();
      ctx.globalAlpha = Math.min(1, look.twist * 1.6);
      const show = look.par * EA.smooth((k - 0.6) / 0.4);
      if (show > 0.01) {
        const fl = playing ? lastFlash(t, g).k : 0.6;
        for (let i = 0; i < 4; i++) {
          const li = g.lens0 + i;
          const cx = g.tx1 + li * g.p;
          const dir = li % 2 ? -1 : 1;
          const col = dir > 0 ? NOISE : C.blue;
          ctx.save();
          ctx.globalAlpha *= show;
          ctx.fillStyle = EA.alpha(col, 0.1 + 0.14 * fl);
          ctx.beginPath();
          for (let x = cx - g.p / 2; x <= cx + g.p / 2 + 0.1; x += 2) ctx.lineTo(x, yc - Math.abs(off(x)));
          for (let x = cx + g.p / 2; x >= cx - g.p / 2 - 0.1; x -= 2) ctx.lineTo(x, yc + Math.abs(off(x)));
          ctx.fill();
          loopArrow(cx, yc, Math.min(a * 0.62, g.p * 0.3), dir, playing ? dir * t * 2.4 : 0.6, col, 0.55 + 0.45 * fl);
          ctx.restore();
        }
      }
      strands(g, yc, (x) => -off(x), (x) => off(x), u0);
      if (show > 0.01) {
        ctx.save();
        ctx.globalAlpha *= show;
        EA.draw.text(ctx, g.narrow ? '+ − + − = 0' : 'coppia intrecciata: anelli alterni, + − + − = 0', g.narrow ? g.zone0 : g.tx1 + 8, yc + a + (g.narrow ? 14 : 22), { color: C.text, size: 10.5 });
        ctx.restore();
      }
      ctx.restore();
    }

    function receivers(g) {
      const tw = g.narrow ? 18 : 28;
      const th = g.narrow ? 22 : 34;
      [[g.yTop, Math.max(look.se, look.par)], [g.yBot, Math.max(look.pair, Math.min(1, look.twist * 1.6))]].forEach(([y, a]) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0.3, a);
        if (!g.narrow) {
          ctx.strokeStyle = EA.alpha(C.text, 0.6);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(g.rx0 + tw, y);
          ctx.lineTo(g.out0, y);
          ctx.stroke();
        }
        ctx.fillStyle = C.bg;
        ctx.strokeStyle = EA.alpha(C.ink, 0.8);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(g.rx0, y - th / 2);
        ctx.lineTo(g.rx0, y + th / 2);
        ctx.lineTo(g.rx0 + tw, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (!g.narrow) {
          EA.draw.text(ctx, '+', g.rx0 + 4, y - 3, { color: C.text, size: 10.5, weight: 700 });
          EA.draw.text(ctx, '−', g.rx0 + 4, y + 11, { color: C.text, size: 10.5, weight: 700 });
        }
        ctx.restore();
      });
      if (!g.narrow) EA.draw.text(ctx, 'RX', g.rx0 + tw / 2, g.yTop - th / 2 - 8, { color: C.text, size: 11, weight: 700, align: 'center' });
    }

    // Una corsia del pannello: i bit decisi dal ricevitore, i più recenti a sinistra.
    function lane(g, u0, ly, A, color, errors, names, analog) {
      if (A < 0.02) return;
      const U = g.U;
      const x0 = g.out0 + 10;
      const x1 = g.out1 - 10;
      const amp = g.narrow ? 6 : U * 0.8;
      const ampA = g.narrow ? 10 : U * 2;
      ctx.save();
      ctx.globalAlpha *= A;
      const ty = ly - (g.narrow ? 16 : U * 2.6);
      names.forEach(([txt, a]) => {
        if (a < 0.02) return;
        ctx.save();
        ctx.globalAlpha *= Math.min(1, a);
        EA.draw.text(ctx, txt, g.out0 + 14, ty, { color: C.text, size: 10.5 });
        ctx.restore();
      });
      ctx.beginPath();
      ctx.rect(x0, ly - ampA - 30, x1 - x0, 2 * ampA + 60);
      ctx.clip();
      const base = u0 - g.nBits;
      const xOf = (u) => g.out0 + (base - u) * g.Lb;
      const pts = [];
      const bitsIn = [];
      for (let n = Math.floor(base); n >= Math.floor(base - g.panelBits) - 1; n--) {
        const b = bitAt(n);
        const d = errors && !b && bumps.has(n) ? 1 : b;
        const xl = xOf(n + 1);
        const xr = xOf(n);
        const y = ly - (d ? amp : -amp);
        pts.push([xl, y], [xr, y]);
        bitsIn.push({ xl, xr, d, err: d !== b });
      }
      bitsIn.forEach((q) => {
        if (!q.err) return;
        ctx.fillStyle = EA.alpha(C.red, 0.18);
        ctx.fillRect(q.xl + 2, ly - ampA - 4, q.xr - q.xl - 4, 2 * ampA + (g.narrow ? 22 : 28));
      });
      if (analog < 0.99) {
        ctx.save();
        ctx.globalAlpha *= 1 - analog;
        EA.draw.line(ctx, pts, color, 2);
        bitsIn.forEach((q) => { if (q.err) EA.draw.line(ctx, [[q.xl, ly - amp], [q.xr, ly - amp]], C.red, 2.6); });
        ctx.restore();
      }
      if (analog > 0.01) {
        const ap = [];
        for (let x = x0; x <= x1; x += 2) ap.push([x, ly - ampA * (2 * levelAt(base - (x - g.out0) / g.Lb) - 1)]);
        ctx.save();
        ctx.globalAlpha *= analog;
        EA.draw.line(ctx, ap, C.pink, 2.2);
        ctx.restore();
      }
      const dy = EA.lerp(amp, ampA, analog) + (g.narrow ? 11 : 16);
      bitsIn.forEach((q) => {
        const xc = (q.xl + q.xr) / 2;
        if (xc < x0 + 5 || xc > x1 - 5) return;
        EA.draw.text(ctx, String(q.d), xc, ly + dy, { color: q.err ? C.red : C.text, size: 11, weight: q.err ? 800 : 600, align: 'center' });
        if (q.err && !g.narrow) EA.draw.text(ctx, 'errore', xc, ly - ampA - 10, { color: C.red, size: 10.5, weight: 700, align: 'center' });
      });
      ctx.restore();
    }

    function lanes(g, u0) {
      ctx.save();
      ctx.globalAlpha = 1 - look.eye;
      if (!g.narrow) EA.draw.text(ctx, 'BIT RICEVUTI  ·  i più recenti a sinistra', g.out0 + 14, g.panelY0 + 22, { color: C.dim, size: 10.5 });
      const tw = Math.min(1, look.twist * 1.6);
      lane(g, u0, g.lane1, Math.max(look.se, look.par), look.par > look.se ? C.pink : SE_COL, true,
        [['filo singolo', look.se], ['coppia parallela', look.par]], 0);
      lane(g, u0, g.lane2, Math.max(look.pair, tw), C.pink, false,
        [['coppia differenziale', look.pair * (1 - look.sub)], [g.narrow ? 'D+ − D−' : 'D+ − D−: doppio e pulito', look.sub], ['coppia intrecciata', tw * (1 - look.eye)]], look.sub);
      ctx.restore();
    }

    // Fase 6: le finestre di 2 UI del segnale ricevuto si accumulano con persistenza.
    function eye(g, playing, dt) {
      const x0 = g.out0 + 14;
      const x1 = g.out1 - 14;
      const top = g.panelY0 + (g.narrow ? 28 : 40);
      const bot = g.panelY1 - (g.narrow ? 24 : 32);
      const ew = x1 - x0;
      const eh = bot - top;
      const nx = Math.max(40, Math.round(ew / 3));
      const ny = Math.max(30, Math.round(eh / 3));
      if (!eyeP || eyeP.nx !== nx || eyeP.ny !== ny) { eyeP = persist(nx, ny, C.pink); eyeStatic = false; }
      const VR = 0.5;
      const yOf = (v) => (0.5 - v / (2 * VR)) * (ny - 1);
      const add = (v, c, i) => persistTrace(eyeP, v, i - SPU, 2 * SPU + 1, yOf);
      if (!playing) {
        if (!eyeStatic) { eyeP.d.fill(0); feeder(createStream(EYE_P, 31)).pull(320, add); eyeStatic = true; }
      } else {
        eyeStatic = false;
        if (!eyeFeed) eyeFeed = feeder(createStream(EYE_P, 31));
        persistDecay(eyeP, Math.exp(-dt / 1.6));
        eyeFeed.pull(1, add);
      }
      const X = (u) => x0 + ((u + 1) / 2) * ew;
      const Y = (v) => top + (0.5 - v / (2 * VR)) * eh;
      ctx.save();
      ctx.globalAlpha = look.eye;
      EA.draw.text(ctx, 'DIAGRAMMA A OCCHIO', x0, g.panelY0 + (g.narrow ? 18 : 24), { color: C.pink, size: 10.5, weight: 700 });
      EA.draw.grid(ctx, x0, top, ew, eh, { cols: 8, rows: 6 });
      persistDraw(eyeP, ctx, x0, top, ew, eh, playing);
      dashed(x0, Y(0), x1, Y(0), EA.alpha(C.text, 0.45));
      const yT = Y(eyeRef.top);
      const yB = Y(eyeRef.bottom);
      const xl = X(eyeRef.crossHi - 1);
      const xr = X(eyeRef.crossLo);
      EA.draw.arrow(ctx, X(0), Y(0), X(0), yT + 1, C.cyan, 1.5, 7);
      EA.draw.arrow(ctx, X(0), Y(0), X(0), yB - 1, C.cyan, 1.5, 7);
      EA.draw.arrow(ctx, X(0), Y(0), xl + 1, Y(0), C.cyan, 1.5, 7);
      EA.draw.arrow(ctx, X(0), Y(0), xr - 1, Y(0), C.cyan, 1.5, 7);
      EA.draw.text(ctx, g.narrow ? 'verticale' : 'apertura verticale', X(0) + 7, (Y(0) + yT) / 2 + 4, { color: C.cyan, size: 10.5 });
      EA.draw.text(ctx, g.narrow ? 'orizzontale' : 'apertura orizzontale', X(0), Y(0) + 17, { color: C.cyan, size: 10.5, align: 'center' });
      const by = bot + (g.narrow ? 15 : 18);
      EA.draw.text(ctx, '−1 UI', x0, by, { color: C.dim, size: 10.5 });
      EA.draw.text(ctx, '+1 UI', x1, by, { color: C.dim, size: 10.5, align: 'right' });
      EA.draw.text(ctx, g.narrow ? 'campionamento' : 'istante di campionamento', X(0), by, { color: C.dim, size: 10.5, align: 'center' });
      ctx.restore();
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
          bumps = new Set();
          nextTarget = null;
          if (STAGES[stage].key === 'eye' && eyeP) eyeP.d.fill(0);
        }
      }
      const target = LOOKS[STAGES[stage].key];
      const kk = playing ? 1 - Math.exp(-dt * 3.2) : 1;
      LOOK_KEYS.forEach((k) => { look[k] += (target[k] - look[k]) * kk; });
      const g = geometry();
      if (!playing) {
        t = canonical(g);
        if (loopCtl) loopCtl.time = t;
      } else updateBursts(t, g);
      const u0 = t / HERO_TB;
      EA.draw.clear(cv);
      header(g);
      if (look.par > 0.01) field(g, t, playing);
      motor(g, t, playing);
      transmitter(g);
      if (look.se > 0.01) singleEnded(g, u0);
      if (look.par > 0.01) parallel(g, u0, t, playing);
      if (look.pair > 0.01) pair(g, u0);
      if (look.twist > 0.01) twisted(g, u0, t, playing);
      receivers(g);
      box(g.out0, g.panelY0, g.out1 - g.out0, g.panelY1 - g.panelY0, look.eye > 0.5 ? EA.alpha(C.pink, 0.7) : C.grid);
      if (look.eye < 0.99) lanes(g, u0);
      if (look.eye > 0.01) eye(g, playing, dt);
    }

    loopCtl = api.loop(draw);
    api.setStep(0);
    return {
      focus(key, i) {
        stage = EA.clamp(i, 0, STAGES.length - 1);
        stageT = 0;
        bumps = new Set();
        nextTarget = null;
        eyeStatic = false;
        if (STAGES[stage].key === 'eye' && eyeP) eyeP.d.fill(0);
        api.setStep(stage);
        api.announce(STAGES[stage].say);
        api.invalidate();
      },
    };
  }

  /* ---------- laboratorio: diagramma a occhio ---------- */

  const RATES = [1e9, 2.5e9, 5e9, 1e10];
  const VR = 0.5;        // ±0,5 V a tutta altezza: 100 mV per divisione
  const N_STATIC = 640;  // bit del fotogramma fermo
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

  // 1,3·10⁻¹² con esponente in apice.
  function sci(x) {
    if (!(x > 0)) return '0';
    let e = Math.floor(Math.log10(x));
    let m = Math.round((x / Math.pow(10, e)) * 10) / 10;
    if (m >= 10) { m = 1; e += 1; }
    return EA.fmt(m, 1) + '·10' + String(e).split('').map((c) => SUP[c]).join('');
  }

  const cmrrText = (eps) => (eps > 0 ? 'CMRR ' + EA.fmt(imbalanceCmrr(eps), 0) + ' dB' : 'CMRR ∞');

  function mountLab(parts, api) {
    const C = EA.colors;
    const h = EA.h;
    const st = { mode: 'diff', rate: 5e9, f3: 2.5e9, sigma: 0.006, rj: 0.015, cm: 0.12, imb: 0.02, eq: false };
    parts.display.classList.add('diff-lab-display');
    const cv = api.canvas(parts.display, { class: 'ea-canvas diff-lab-canvas', label: 'Diagramma a occhio con persistenza: le finestre di due intervalli unitari del segnale ricevuto si sovrappongono. Frecce azzurre misurano altezza e larghezza dell\'apertura; a destra l\'istogramma dei campioni al centro dell\'occhio; in basso la risposta del canale a un bit isolato.' });
    const ctx = cv.ctx;
    let link = null;
    let feed = null;
    let P = null;
    let acc = newAcc();
    let stats = null;
    let hist = null;
    let dots = [];
    let pulseData = null;
    let statT = 0;
    let staticDirty = true;
    let seed = 1;
    let announcePending = true;

    /* comandi */

    const mode = EA.ui.segmented({
      label: 'Collegamento',
      options: [{ value: 'se', label: 'Filo singolo' }, { value: 'diff', label: 'Differenziale' }],
      value: st.mode, color: C.pink,
      onchange: (v) => { st.mode = v; update(true); },
    });
    const rate = EA.ui.segmented({
      label: 'Velocità (Gbit/s)',
      options: RATES.map((r) => ({ value: r, label: EA.fmt(r / 1e9, 1) })),
      value: st.rate, color: C.pink,
      onchange: (v) => { st.rate = v; jit.set(st.rj * 100, true); update(true); },
    });
    const band = EA.ui.slider({
      label: 'Banda del canale', min: 0.5e9, max: 20e9, log: true, value: st.f3, color: C.pink,
      hint: 'Più è stretta, più ogni bit sbava sui successivi: è l\'interferenza intersimbolica.',
      format: (v) => EA.si(v, 'Hz', 2),
      oninput: (v) => { st.f3 = v; update(); },
    });
    const noise = EA.ui.slider({
      label: 'Rumore casuale', min: 0, max: 40, step: 1, value: st.sigma * 1000, color: C.violet,
      hint: 'Indipendente sui due fili: nel differenziale cresce di √2, il segnale di 2.',
      format: (v) => EA.fmt(v, 0) + ' mV',
      oninput: (v) => { st.sigma = v / 1000; update(); },
    });
    const jit = EA.ui.slider({
      label: 'Jitter casuale', min: 0, max: 8, step: 0.5, value: st.rj * 100, color: C.violet,
      format: (v) => EA.fmt(v, 1) + ' % UI · ' + EA.si(v / 100 / st.rate, 's', 2),
      oninput: (v) => { st.rj = v / 100; update(); },
    });
    const cm = EA.ui.slider({
      label: 'Disturbo di modo comune', min: 0, max: 300, step: 10, value: st.cm * 1000, color: C.orange,
      hint: 'Un disturbo lento che sposta insieme i due fili, come quello di un motore.',
      format: (v) => EA.fmt(v, 0) + ' mV',
      oninput: (v) => { st.cm = v / 1000; update(); },
    });
    const imb = EA.ui.slider({
      label: 'Sbilanciamento', min: 0, max: 20, step: 0.5, value: st.imb * 100, color: C.orange,
      hint: 'Conta solo nel differenziale: è la parte del modo comune che diventa segnale.',
      format: (v) => EA.fmt(v, 1) + ' % · ' + cmrrText(v / 100),
      oninput: (v) => { st.imb = v / 100; update(); },
    });
    const eq = EA.ui.toggle({ label: 'Equalizzazione in trasmissione', checked: st.eq, color: C.cyan, onchange: (v) => { st.eq = v; update(true); } });
    const eqHint = h('small', { class: 'ea-ctl-hint' });
    parts.controls.append(mode.el, rate.el, band.el, noise.el, jit.el, cm.el, imb.el, h('div', { class: 'ea-ctl diff-eq' }, eq.el, eqHint));

    const roH = EA.ui.readout({ label: 'Altezza occhio' });
    const roW = EA.ui.readout({ label: 'Larghezza occhio' });
    const roQ = EA.ui.readout({ label: 'Fattore Q' });
    const roB = EA.ui.readout({ label: 'BER stimato' });
    const roE = EA.ui.readout({ label: 'Bit errati' });
    const roL = EA.ui.readout({ label: 'Perdita a Nyquist' });
    parts.readouts.append(roH.el, roW.el, roQ.el, roB.el, roE.el, roL.el);

    /* simulazione */

    const yOf = (v) => (0.5 - v / (2 * VR)) * (P.ny - 1);

    function histogram(a) {
      const NB = 60;
      const ones = new Float32Array(NB);
      const zeros = new Float32Array(NB);
      for (let i = 0; i < a.val.length; i++) {
        const b = Math.floor((0.5 - a.val[i] / (2 * VR)) * NB);
        if (b >= 0 && b < NB) (a.bit[i] > 0 ? ones : zeros)[b]++;
      }
      let mx = 1;
      for (let i = 0; i < NB; i++) mx = Math.max(mx, ones[i], zeros[i]);
      return { NB, ones, zeros, mx };
    }

    function pulseCurve() {
      const L = link;
      const span = [-0.5, 7.5];
      const pts = [];
      const raw = [];
      for (let u = span[0]; u <= span[1] + 1e-9; u += 1 / 24) {
        pts.push([u, pulse(u * L.T, L.T, L.tau, L.c1)]);
        raw.push([u, pulse(u * L.T, L.T, L.tau, 0)]);
      }
      return { span, pts, raw, s0: L.so / SPU, h: L.cursors.h, isi: L.cursors.isi / L.cursors.main };
    }

    function showReadouts() {
      if (!stats) return;
      const s = stats;
      const amp = 2 * link.amp;
      const open = s.height > 0;
      roH.set(open ? EA.fmt(s.height * 1000, 0) + ' mV' : 'chiuso', open ? (s.height / amp > 0.4 ? 'good' : 'warn') : 'bad');
      roW.set(open ? EA.fmt(s.width * 100, 0) + ' % UI' : 'chiuso', open ? (s.width > 0.6 ? 'good' : 'warn') : 'bad');
      const tone = s.ber <= 1e-12 ? 'good' : s.ber <= 1e-6 ? 'warn' : 'bad';
      roQ.set(s.q > 30 ? '> 30' : EA.fmt(s.q, s.q < 10 ? 1 : 0), tone);
      roB.set(s.ber < 1e-18 ? '< 10⁻¹⁸' : sci(s.ber), tone);
      roE.set(EA.fmt(acc.errors, 0) + ' su ' + EA.fmt(acc.n, 0), acc.errors ? 'bad' : 'good');
      announceStats();
    }

    function trim() {
      if (acc.val.length > 6000) {
        const k = acc.val.length - 3000;
        acc.val.splice(0, k);
        acc.dist.splice(0, k);
        acc.bit.splice(0, k);
      }
      if (acc.cross.length > 3000) acc.cross.splice(0, acc.cross.length - 1500);
    }

    // Fotogramma fermo: un blocco di bit simulato per intero, sempre uguale a parità di comandi.
    function rebuildStatic() {
      P.d.fill(0);
      const f = feeder(createStream(st, 99));
      const a = newAcc();
      const ds = [];
      f.pull(N_STATIC, (v, c, i, k) => {
        persistTrace(P, v, i - SPU, 2 * SPU + 1, yOf);
        const e0 = a.errors;
        measure(v, c, i, f.bit(k), f.bit(k + 1), a);
        if (a.errors > e0 && ds.length < 60) ds.push({ v: v[i], age: 0.4 });
      });
      acc = a;
      dots = ds;
      stats = eyeStats(acc, f.link.sigma);
      hist = histogram(acc);
      showReadouts();
      staticDirty = false;
    }

    function update(big) {
      const s = createStream(st, ++seed);
      feed = feeder(s);
      link = s.link;
      acc = newAcc();
      dots = [];
      if (P) persistDecay(P, big ? 0.05 : 0.3);
      pulseData = pulseCurve();
      staticDirty = true;
      statT = 0.2;
      imb.el.classList.toggle('diff-off', st.mode === 'se');
      const loss = lossDb(st.rate / 2, st.f3);
      roL.set(EA.fmt(loss, loss < 10 ? 1 : 0) + ' dB', loss > 12 ? 'warn' : null);
      if (!st.eq) eqHint.textContent = 'Spenta: i bit ripetuti partono con la stessa ampiezza delle transizioni.';
      else if (link.c1 === 0) eqHint.textContent = 'Presa c₁ = 0: con questo canale la de-enfasi non serve.';
      else eqHint.textContent = 'Presa c₁ = ' + EA.fmt(link.c1, 2) + ': i bit ripetuti scendono di ' + EA.fmt(-deemphasisDb(link.c1), 1) + ' dB (de-enfasi).';
      announcePending = true;
      api.invalidate();
    }

    // Annuncio per i lettori di schermo, appena le misure del nuovo collegamento sono affidabili.
    function announceStats() {
      if (!announcePending || !stats || acc.n < 300) return;
      announcePending = false;
      const name = st.mode === 'diff' ? 'Differenziale' : 'Filo singolo';
      api.announce(name + ' a ' + EA.fmt(st.rate / 1e9, 1) + ' gigabit al secondo: ' + (stats.height > 0
        ? 'occhio aperto, altezza ' + EA.fmt(stats.height * 1000, 0) + ' millivolt, larghezza ' + EA.fmt(stats.width * 100, 0) + ' per cento di un intervallo unitario.'
        : 'occhio chiuso, il ricevitore sbaglia molti bit.'));
    }

    /* disegno */

    function layout() {
      const w = cv.w;
      const hh = cv.h;
      const narrow = w < 520;
      const L = { w, hh, narrow, pad: narrow ? 10 : 16 };
      L.ex0 = L.pad + (narrow ? 32 : 42);
      L.hx1 = w - L.pad;
      L.hx0 = L.hx1 - (narrow ? 40 : 70);
      L.ex1 = L.hx0 - (narrow ? 8 : 14);
      L.ey0 = narrow ? 32 : 40;
      L.pulseH = narrow ? 112 : EA.clamp(hh * 0.24, 130, 175);
      L.py1 = hh - L.pad;
      L.py0 = L.py1 - L.pulseH;
      L.ey1 = L.py0 - (narrow ? 30 : 36);
      return L;
    }

    function ensurePersist(L) {
      const nx = Math.max(60, Math.round((L.ex1 - L.ex0) / 2.5));
      const ny = Math.max(40, Math.round((L.ey1 - L.ey0) / 2.5));
      if (!P || P.nx !== nx || P.ny !== ny) {
        P = persist(nx, ny, C.pink);
        staticDirty = true;
      }
    }

    function step(dt) {
      persistDecay(P, Math.exp(-dt / 0.9));
      const n = EA.clamp(Math.round(dt * 480), 1, 16);
      feed.pull(n, (v, c, i, k) => {
        persistTrace(P, v, i - SPU, 2 * SPU + 1, yOf);
        const e0 = acc.errors;
        measure(v, c, i, feed.bit(k), feed.bit(k + 1), acc);
        if (acc.errors > e0 && dots.length < 60) dots.push({ v: v[i], age: 0 });
      });
      trim();
      dots.forEach((d) => { d.age += dt; });
      dots = dots.filter((d) => d.age < 1.6);
      statT += dt;
      if (statT > 0.3) {
        statT = 0;
        stats = eyeStats(acc, link.sigma);
        hist = histogram(acc);
        showReadouts();
      }
    }

    function draw(t, dt) {
      if (!cv.w || !link) return;
      const playing = dt > 0;
      const L = layout();
      ensurePersist(L);
      if (playing) step(dt);
      else if (staticDirty) rebuildStatic();
      render(L, playing);
    }

    function render(L, playing) {
      const { ex0, ex1, ey0, ey1, narrow } = L;
      const ew = ex1 - ex0;
      const eh = ey1 - ey0;
      const X = (u) => ex0 + ((u + 1) / 2) * ew;
      const Y = (v) => ey0 + (0.5 - v / (2 * VR)) * eh;
      EA.draw.clear(cv);

      // intestazione
      const ty = narrow ? 20 : 24;
      EA.draw.text(ctx, narrow ? 'OCCHIO · 2 UI' : 'DIAGRAMMA A OCCHIO · 2 UI', L.pad, ty, { color: C.ink, size: narrow ? 11 : 12, weight: 700 });
      const desc = (st.mode === 'diff' ? 'differenziale' : 'filo singolo') + (narrow ? '' : ' · ' + EA.fmt(st.rate / 1e9, 1) + ' Gbit/s') + ' · 1 UI = ' + EA.si(1 / st.rate, 's', 3);
      EA.draw.text(ctx, desc, L.w - L.pad, ty, { color: C.text, size: narrow ? 10.5 : 11, align: 'right' });

      // occhio con persistenza
      EA.draw.grid(ctx, ex0, ey0, ew, eh, { cols: 8, rows: 10 });
      persistDraw(P, ctx, ex0, ey0, ew, eh, playing);
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = EA.alpha(C.text, 0.5);
      ctx.beginPath();
      ctx.moveTo(ex0, Y(0)); ctx.lineTo(ex1, Y(0));
      ctx.moveTo(X(0), ey0); ctx.lineTo(X(0), ey1);
      ctx.stroke();
      ctx.restore();
      const marks = narrow ? [0.4, 0, -0.4] : [0.4, 0.2, 0, -0.2, -0.4];
      marks.forEach((v) => EA.draw.text(ctx, (v > 0 ? '+' : v < 0 ? '−' : '') + EA.fmt(Math.abs(v) * 1000, 0), ex0 - 6, Y(v) + 4, { color: C.dim, size: 10.5, align: 'right' }));
      EA.draw.text(ctx, 'mV', ex0 - 6, ey0 + 10, { color: C.dim, size: 10.5, align: 'right' });
      const by = ey1 + 16;
      EA.draw.text(ctx, '−1 UI', ex0, by, { color: C.dim, size: 10.5 });
      EA.draw.text(ctx, '+1 UI', ex1, by, { color: C.dim, size: 10.5, align: 'right' });
      EA.draw.text(ctx, narrow ? 'campionamento' : 'istante di campionamento', X(0), by, { color: C.dim, size: 10.5, align: 'center' });

      // errori: campioni finiti dalla parte sbagliata della soglia
      dots.forEach((d, i) => {
        const a = playing ? 1 - d.age / 1.6 : 0.9;
        ctx.fillStyle = EA.alpha(C.red, Math.max(0, a));
        ctx.beginPath();
        ctx.arc(X(0) + (((i * 37) % 9) - 4) * 1.6, EA.clamp(Y(d.v), ey0 + 2, ey1 - 2), 2.6, 0, TAU);
        ctx.fill();
      });

      // misure dell'apertura
      if (stats) {
        const s = stats;
        if (s.height > 0) {
          const yT = Y(s.top);
          const yB = Y(s.bottom);
          EA.draw.arrow(ctx, X(0), Y(0), X(0), yT + 1, C.cyan, 1.6, 7);
          EA.draw.arrow(ctx, X(0), Y(0), X(0), yB - 1, C.cyan, 1.6, 7);
          const xl = X(s.crossHi - 1);
          const xr = X(s.crossLo);
          if (s.width > 0.02) {
            EA.draw.arrow(ctx, X(0), Y(0), xl + 1, Y(0), C.cyan, 1.6, 7);
            EA.draw.arrow(ctx, X(0), Y(0), xr - 1, Y(0), C.cyan, 1.6, 7);
          }
          const lh = (narrow ? '' : 'altezza ') + EA.fmt(s.height * 1000, 0) + ' mV';
          const lw = (narrow ? '' : 'larghezza ') + EA.fmt(s.width * 100, 0) + ' % UI';
          const midUp = (Y(0) + yT) / 2;
          tag(lh, X(0) + 8, midUp + 4, 'left');
          if (s.width > 0.02) tag(lw, X(0), Y(0) + 18, 'center');
        } else {
          tag('OCCHIO CHIUSO', X(0), Y(0) - 10, 'center', C.red, narrow ? 11 : 13);
        }
      }

      // istogramma dei campioni al centro dell'occhio
      if (hist) {
        const { NB, ones, zeros, mx } = hist;
        const bw = L.hx1 - L.hx0 - 6;
        ctx.save();
        ctx.strokeStyle = C.grid;
        ctx.strokeRect(L.hx0 + 0.5, ey0 + 0.5, L.hx1 - L.hx0 - 1, eh - 1);
        for (let i = 0; i < NB; i++) {
          const y = ey0 + (i * eh) / NB;
          const hh2 = Math.max(1, eh / NB - 0.6);
          if (ones[i]) { ctx.fillStyle = EA.alpha(C.pink, 0.9); ctx.fillRect(L.hx0 + 3, y, Math.max(1, (ones[i] / mx) * bw), hh2); }
          if (zeros[i]) { ctx.fillStyle = EA.alpha(C.violet, 0.9); ctx.fillRect(L.hx0 + 3, y, Math.max(1, (zeros[i] / mx) * bw), hh2); }
        }
        ctx.setLineDash([4, 5]);
        ctx.strokeStyle = EA.alpha(C.text, 0.5);
        ctx.beginPath(); ctx.moveTo(L.hx0, Y(0)); ctx.lineTo(L.hx1, Y(0)); ctx.stroke();
        ctx.restore();
        if (stats) EA.draw.text(ctx, 'Q ' + (stats.q > 30 ? '> 30' : EA.fmt(stats.q, 1)), (L.hx0 + L.hx1) / 2, by, { color: C.text, size: 10.5, align: 'center' });
        if (!narrow) EA.draw.text(ctx, 'campioni', (L.hx0 + L.hx1) / 2, ey0 - 6, { color: C.dim, size: 10.5, align: 'center' });
      }

      // risposta a un bit isolato
      pulsePanel(L);
    }

    // Etichetta con fondo scuro, leggibile sopra le tracce.
    function tag(txt, x, y, align, color, size) {
      const sz = size || 10.5;
      ctx.save();
      ctx.font = '700 ' + sz + 'px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      const tw = ctx.measureText(txt).width;
      const x0 = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
      ctx.fillStyle = EA.alpha(C.bg, 0.78);
      ctx.fillRect(x0 - 4, y - sz, tw + 8, sz + 5);
      ctx.restore();
      EA.draw.text(ctx, txt, x, y, { color: color || C.cyan, size: sz, weight: 700, align });
    }

    function pulsePanel(L) {
      if (!pulseData) return;
      const { pad, py0, py1, narrow } = L;
      const x0 = pad;
      const w = L.w - pad * 2;
      ctx.save();
      ctx.fillStyle = EA.alpha('#060b0a', 0.88);
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x0, py0, w, py1 - py0, 10); else ctx.rect(x0, py0, w, py1 - py0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      const D = pulseData;
      EA.draw.text(ctx, narrow ? 'UN BIT DOPO IL CANALE' : 'UN BIT ISOLATO DOPO IL CANALE', x0 + 12, py0 + 18, { color: C.text, size: 10.5, weight: 700 });
      EA.draw.text(ctx, (narrow ? 'ISI ' : 'interferenza sui bit vicini: ') + EA.fmt(D.isi * 100, 0) + ' %', x0 + w - 12, py0 + 18, { color: D.isi > 0.5 ? C.amber : C.text, size: 10.5, align: 'right' });
      const span = narrow ? [-0.5, 5.5] : D.span;
      const px0 = x0 + 12;
      const px1 = x0 + w - 12;
      const top = py0 + 30;
      const bot = py1 - 10;
      const PX = (u) => px0 + ((u - span[0]) / (span[1] - span[0])) * (px1 - px0);
      const PY = (v) => bot - ((v + 0.3) / 1.4) * (bot - top);
      ctx.save();
      ctx.beginPath();
      ctx.rect(px0, top - 6, px1 - px0, bot - top + 12);
      ctx.clip();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = EA.alpha(C.text, 0.35);
      ctx.beginPath();
      ctx.moveTo(px0, PY(0)); ctx.lineTo(px1, PY(0));
      ctx.stroke();
      ctx.setLineDash([]);
      // il bit trasmesso (con la de-enfasi, se attiva)
      const c0 = 1 - Math.abs(link.c1);
      ctx.strokeStyle = EA.alpha(C.text, 0.4);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(PX(span[0]), PY(0)); ctx.lineTo(PX(0), PY(0)); ctx.lineTo(PX(0), PY(c0)); ctx.lineTo(PX(1), PY(c0));
      ctx.lineTo(PX(1), PY(link.c1)); ctx.lineTo(PX(2), PY(link.c1)); ctx.lineTo(PX(2), PY(0)); ctx.lineTo(PX(span[1]), PY(0));
      ctx.stroke();
      if (link.c1 !== 0) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = EA.alpha(C.pink, 0.45);
        ctx.beginPath();
        D.raw.forEach((p, i) => (i ? ctx.lineTo(PX(p[0]), PY(p[1])) : ctx.moveTo(PX(p[0]), PY(p[1]))));
        ctx.stroke();
        ctx.setLineDash([]);
      }
      EA.draw.line(ctx, D.pts.map((p) => [PX(p[0]), PY(p[1])]), C.pink, 2);
      // cursori: un campione per UI, a partire dall'istante di campionamento del bit
      for (let k = -1; k < D.h.length - 1; k++) {
        const u = D.s0 + k;
        if (u < span[0] || u > span[1]) continue;
        const v = D.h[k + 1];
        ctx.strokeStyle = EA.alpha(C.cyan, 0.25);
        ctx.beginPath(); ctx.moveTo(PX(u), top); ctx.lineTo(PX(u), bot); ctx.stroke();
        EA.draw.dot(ctx, PX(u), PY(v), k === 0 ? 3.6 : 2.6, k === 0 ? C.ink : C.cyan, k === 0);
        if (!narrow && (k === 0 || k === 1)) EA.draw.text(ctx, k === 0 ? 'h₀' : 'h₁', PX(u) + 6, PY(v) - 6, { color: k === 0 ? C.ink : C.cyan, size: 10.5 });
      }
      ctx.restore();
    }

    api.loop(draw);
    update();
    announcePending = false;
  }

  /* ---------- contenuti ---------- */

  EA.register({
    id: 'differenziale',
    intro: [
      'Per portare un segnale elettrico servono due conduttori: uno con la tensione, l\'altro come riferimento. Nel collegamento più semplice, detto <em>single-ended</em> o a filo singolo, il riferimento è la massa comune a tutto il circuito. Funziona finché i fili sono corti e l\'ambiente è tranquillo; ma ogni disturbo che si somma al filo, o che fa oscillare la massa, arriva al ricevitore come se fosse segnale.',
      'La trasmissione <strong>differenziale</strong> usa due fili che portano copie opposte dello stesso segnale: quando D+ sale, D− scende. Il ricevitore non guarda nessuno dei due rispetto alla massa, ma solo la loro <strong>differenza</strong>. Un disturbo che colpisce i due fili allo stesso modo, il <em>modo comune</em>, sparisce nella sottrazione, mentre il segnale raddoppia. Se poi i fili sono intrecciati, anche i campi magnetici fanno molti meno danni.',
      'L\'idea risale ai tempi del telefono, ed è la stessa che oggi porta miliardi di bit al secondo nei cavi di rete, nelle porte USB e dentro i computer. A quelle velocità la qualità di un collegamento si misura con il <strong>diagramma a occhio</strong>, che sovrappone migliaia di bit e mostra a colpo d\'occhio rumore, jitter e interferenza tra un bit e l\'altro. Intorno a tutto questo c\'è la <em>compatibilità elettromagnetica</em> (EMC): ogni apparecchio deve sopportare i disturbi dell\'ambiente senza disturbare a sua volta, grazie a schermature, filtri e norme precise.',
    ],
    steps: [
      { title: 'Un filo e la massa', text: 'Nel collegamento a filo singolo il ricevitore confronta la tensione del filo con una soglia riferita alla massa. Un impulso di disturbo raccolto per strada si somma al segnale: se porta uno 0 sopra la soglia, il ricevitore legge un 1.', focus: 'se' },
      { title: 'Due copie opposte', text: 'La coppia differenziale porta lo stesso segnale due volte, con segno opposto: D+ è alto quando D− è basso. L\'informazione non sta nella tensione di un filo, ma nella differenza tra i due.', focus: 'diff' },
      { title: 'Il disturbo è di modo comune', text: 'I due fili corrono vicini, quindi un disturbo li colpisce quasi allo stesso modo e le due tracce si spostano insieme. Cambia la loro media, la tensione di modo comune, non la distanza tra loro.', focus: 'cm' },
      { title: 'Il ricevitore sottrae', text: 'Il ricevitore calcola <var>V</var><sub>d</sub> = <var>V</var><sub>+</sub> − <var>V</var><sub>−</sub>: il disturbo comune si cancella e il segnale raddoppia. Quanto bene ci riesce lo dice il CMRR, che dipende dalla simmetria dei due percorsi.', focus: 'sub' },
      { title: 'L\'intreccio', text: 'Un campo magnetico che attraversa lo spazio tra due fili paralleli induce una tensione nell\'anello che formano, e questa volta è differenziale. Intrecciando i fili l\'anello si divide in tanti anelli piccoli girati alternativamente: le tensioni indotte si annullano a due a due.', focus: 'twist' },
      { title: 'Il diagramma a occhio', text: 'Sovrapponendo migliaia di bit, due intervalli unitari (UI) alla volta, si forma un occhio. L\'apertura verticale è il margine contro rumore e interferenza tra i bit, quella orizzontale il margine contro il jitter.', focus: 'eye' },
    ],
    formulas: [
      { label: 'Differenza e modo comune', eq: '<var>V</var><sub>d</sub> = <var>V</var><sub>+</sub> − <var>V</var><sub>−</sub><br><var>V</var><sub>cm</sub> = (<var>V</var><sub>+</sub> + <var>V</var><sub>−</sub>) ⁄ 2', text: 'La differenza è il segnale utile; la media dice quanto la coppia «galleggia» rispetto alla massa. Con i livelli tipici di LVDS, 1,375 V e 1,025 V, si ottengono <var>V</var><sub>d</sub> = 350 mV e <var>V</var><sub>cm</sub> = 1,2 V. Un disturbo uguale sui due fili cambia solo <var>V</var><sub>cm</sub>.' },
      { label: 'Reiezione del modo comune', eq: 'CMRR = 20 log(<var>A</var><sub>d</sub> ⁄ <var>A</var><sub>cm</sub>)', text: 'Confronta il guadagno sul segnale differenziale con quello, indesiderato, sul modo comune (logaritmo in base 10, risultato in dB). 80 dB vogliono dire un rapporto di 10 000: 1 V di disturbo comune pesa come 0,1 mV di segnale. Cala con la frequenza e con ogni asimmetria tra i due percorsi.' },
      { label: 'Tasso di errore', eq: 'BER ≈ ½ erfc(<var>Q</var> ⁄ √2)', text: 'Con rumore gaussiano, <var>Q</var> = (<var>μ</var><sub>1</sub> − <var>μ</var><sub>0</sub>) ⁄ (<var>σ</var><sub>1</sub> + <var>σ</var><sub>0</sub>) dice di quante deviazioni standard i livelli 1 e 0 distano dalla soglia. <var>Q</var> = 6 dà circa 10<sup>−9</sup>, <var>Q</var> = 7 circa 10<sup>−12</sup>: basta un po\' di margine in più per ridurre enormemente gli errori.' },
      { label: 'Intervallo unitario', eq: 'UI = 1 ⁄ <var>R</var><br><var>f</var><sub>N</sub> = <var>R</var> ⁄ 2', text: 'È la durata di un simbolo e l\'unità orizzontale dell\'occhio; qui <var>R</var> è il bit rate di un segnale a due livelli. A 10 Gbit/s un UI dura 100 ps e la sequenza più veloce, 1010…, ha la fondamentale alla frequenza di Nyquist <var>f</var><sub>N</sub> = 5 GHz: è lì che si misurano le perdite del canale.' },
    ],
    timeline: [
      { year: 1836, title: 'La stanza schermata di Faraday', who: 'Michael Faraday · Royal Institution, Londra', text: 'Faraday fa costruire un cubo di circa 3,7 m di lato: un telaio di legno rivestito di fili di rame, carta e stagnola. Lo isola e lo carica con una grande macchina elettrostatica, ma all\'interno l\'elettroscopio non rivela alcuna carica, che resta tutta sulla superficie esterna. Il resoconto esce nel 1838: è l\'antenato di ogni schermatura.' },
      { year: 1881, title: 'Il primo brevetto del doppino intrecciato', who: 'Alexander Graham Bell · brevetto US 244,426; John J. Carty · linea Boston–Providence', text: 'Il brevetto «Telephone-Circuit», concesso il 19 luglio, chiede che i due fili di ogni circuito stiano alla stessa distanza da tutti gli altri conduttori del cavo, così che le induzioni dei circuiti vicini si compensino; come forma preferita indica i fili attorcigliati tra loro. Nello stesso anno Carty dimostra che un circuito a due fili elimina i disturbi del ritorno via terra.' },
      { year: 1885, title: 'Le trasposizioni sulle linee aeree', who: 'John J. Carty e AT&T · Stati Uniti', text: 'Per annullare la diafonia tra le linee appese agli stessi pali, i due fili di ogni circuito si scambiano di posto a intervalli regolari: un intreccio su scala gigante. Secondo le fonti AT&T lo prova intorno al 1885 sulla linea New York–Filadelfia e lo generalizza dopo il 1891. Tra il 1890 e il 1910 i circuiti a due fili sostituiscono quasi tutte le linee a filo singolo.' },
      { year: 1936, title: 'L\'amplificatore differenziale', who: 'Alan Blumlein · Regno Unito', text: 'Tra i primi a brevettarla è Blumlein: la «coppia a coda lunga» è uno stadio a valvole che amplifica la differenza tra due ingressi e respinge ciò che hanno in comune, l\'antenato di ogni ricevitore differenziale. La paternità è discussa, perché circuiti simili compaiono tra il 1934 e il 1938 negli strumenti per registrare segnali fisiologici.' },
      { year: 1965, title: 'L\'equalizzatore che si regola da solo', who: 'Robert W. Lucky · Bell Telephone Laboratories', text: 'Nell\'articolo «Automatic Equalization for Digital Communication» Lucky descrive un filtro a linea di ritardo con prese i cui guadagni si regolano da soli fino ad azzerare l\'interferenza intersimbolica. L\'idea porta i modem telefonici oltre i 2400 bit/s ed è l\'antenata dell\'equalizzazione FFE dei collegamenti seriali di oggi.' },
      { year: 1989, title: 'La direttiva europea sulla compatibilità elettromagnetica', who: 'Consiglio delle Comunità europee · direttiva 89/336/CEE', text: 'Dal 3 maggio 1989 ogni apparecchio venduto in Europa deve contenere i disturbi che emette e tollerare quelli dell\'ambiente. Dopo una proroga l\'obbligo, con la marcatura CE, scatta il 1° gennaio 1996. Le norme tecniche discendono in gran parte dal CISPR, il comitato internazionale riunito per la prima volta nel 1934; oggi vale la direttiva 2014/30/UE.' },
      { year: 1995, title: 'LVDS diventa una norma', who: 'National Semiconductor e comitato TIA · Stati Uniti', text: 'Introdotta da National Semiconductor nel 1994, la segnalazione differenziale a bassa tensione diventa la norma TIA/EIA-644 tra la fine del 1995 e il 1996 (le fonti non concordano). Una corrente di circa 3,5 mA produce circa 350 mV su 100 Ω e il ricevitore decide con una soglia di appena ±100 mV: consumi bassi, poche emissioni e centinaia di Mbit/s.' },
      { year: 2002, title: 'PCI Express: il bus diventa seriale', who: 'PCI-SIG · Stati Uniti', text: 'Nel luglio 2002 esce la specifica PCI Express 1.0: al posto del vecchio bus parallelo, corsie fatte di coppie differenziali a 2,5 GT/s. La codifica 8b/10b permette di ricavare il clock dai dati e una de-enfasi fissa di −3,5 dB compensa le perdite delle piste. È l\'esempio da manuale di SerDes.' },
      { year: 2022, title: 'Quattro livelli per simbolo', who: 'PCI-SIG · PCIe 6.0 e 7.0', text: 'Con PCIe 6.0, pubblicata l\'11 gennaio 2022, ogni simbolo porta due bit grazie alla modulazione PAM4: quattro livelli e tre occhi sovrapposti, ciascuno alto un terzo. Si arriva a 64 GT/s per corsia, con una correzione d\'errore leggera che compensa il BER più alto. Nel giugno 2025 PCIe 7.0 raddoppia a 128 GT/s: ogni simbolo dura circa 15,6 ps.' },
    ],
    fun: 'La porta del forno a microonde è una gabbia di Faraday bucata. A 2,45 GHz le microonde hanno una lunghezza d\'onda di circa 12 cm, mentre i fori della griglia misurano circa un millimetro: troppo piccoli per lasciarle uscire, enormi per la luce visibile, che ha lunghezze d\'onda di circa mezzo micrometro. Per questo il cibo si vede, ma le microonde restano dentro.',
    uses: [
      'Cavi di rete Ethernet: quattro doppini con passi di intreccio diversi',
      'USB, HDMI, DisplayPort, SATA e PCI Express',
      'SerDes da 100 Gbit/s e oltre nei data center',
      'Bus dell\'industria e dell\'auto: RS-485 e CAN',
      'Collegamenti LVDS tra scheda e schermo',
      'Audio da studio: cavi bilanciati XLR e alimentazione phantom',
      'Elettrocardiografi e amplificatori da strumentazione',
      'Camere schermate e prove EMC per la marcatura CE',
    ],
    glossary: [
      { term: 'Modo differenziale e modo comune', def: 'Una coppia con tensioni <var>V</var><sub>+</sub> e <var>V</var><sub>−</sub> si descrive con la differenza <var>V</var><sub>d</sub>, il segnale utile, e con la media <var>V</var><sub>cm</sub>, che dice quanto la coppia «galleggia» rispetto alla massa. Un disturbo uguale sui due fili cambia solo la media.' },
      { term: 'CMRR', def: 'Rapporto di reiezione del modo comune: quanto un ricevitore amplifica la differenza rispetto al modo comune, di solito in decibel. 80 dB significano un rapporto di 10 000, non di 80.' },
      { term: 'EMI ed EMC', def: 'L\'EMI (interferenza elettromagnetica) è il disturbo che un apparecchio emette o subisce, lungo i cavi o per irradiazione. L\'EMC (compatibilità elettromagnetica) è la capacità di funzionare nel proprio ambiente senza disturbare gli altri, verificata con prove di emissione e di immunità.' },
      { term: 'Gabbia di Faraday', def: 'Involucro conduttore che blocca i campi elettrici e le onde con lunghezza d\'onda molto maggiore delle sue aperture. Non ferma i campi magnetici lenti: a 50 Hz attraversano un sottile schermo di rame, perché lo spessore pelle del rame è di circa 9 mm.' },
      { term: 'SerDes', def: 'Serializzatore e deserializzatore: trasforma dati paralleli in un unico flusso velocissimo su una coppia differenziale, e viceversa. Il ricevitore ricava il clock dalle transizioni dei dati e compensa le perdite del canale con l\'equalizzazione.' },
      { term: 'Diagramma a occhio e jitter', def: 'Sovrapposizione di molti tratti del segnale ricevuto, lunghi uno o due UI (l\'intervallo unitario, cioè la durata di un simbolo). Il jitter è lo spostamento degli istanti in cui il segnale attraversa la soglia: restringe l\'occhio in orizzontale.' },
      { term: 'ISI ed equalizzazione', def: 'Un canale passa-basso allarga ogni bit, che «sbava» sui successivi: è l\'interferenza intersimbolica (ISI). La pre-enfasi in trasmissione attenua i bit ripetuti rispetto alle transizioni, così che dopo il canale arrivino tutti con ampiezza simile.' },
    ],
    sources: [
      { title: 'A. G. Bell, brevetto US 244,426 «Telephone-circuit» (1881)', url: 'https://patents.google.com/patent/US244426' },
      { title: 'Telephone Transmission (ETHW, IEEE)', url: 'https://ethw.org/Telephone_Transmission' },
      { title: 'M. Faraday, Experimental Researches in Electricity, § 1173 (Project Gutenberg)', url: 'https://gutenberg.org/files/14986/14986-h/14986-h.htm' },
      { title: 'History of CISPR (In Compliance Magazine)', url: 'https://incompliancemag.com/history-of-cispr/' },
      { title: 'LVDS Owner\'s Manual (National Semiconductor)', url: 'https://web.pa.msu.edu/hep/d0/ftp/run2b/l1cal/hardware/component_information/national_lvds_owners_manual.pdf' },
      { title: 'BER: Bit Error Rate or Bit Error Ratio? (Keysight)', url: 'https://www.keysight.com/blogs/en/tech/2019/03/10/ber-is-it-bit-error-rate-or-bit-error-ratio' },
    ],
    // Domande provvisorie: da spostare in quiz.js.
    quiz: [
      { id: 'ea-differenziale-01', chapter: 'differenziale', level: 1, topic: 'Modo comune', q: 'Un disturbo colpisce allo stesso modo i due fili di una coppia differenziale. Che cosa vede il ricevitore?', options: ['Quasi nulla: la differenza tra i fili non cambia', 'Il disturbo raddoppiato, perché i fili sono due', 'Il disturbo intero, come su un filo singolo', 'Solo il disturbo, perché il segnale si cancella'], answer: 0, why: 'Il disturbo sposta la tensione di modo comune, cioè la media dei due fili, ma non la loro differenza. Il ricevitore calcola V+ − V−: il disturbo si cancella e il segnale, anzi, raddoppia.' },
      { id: 'ea-differenziale-02', chapter: 'differenziale', level: 2, topic: 'CMRR in decibel', q: 'Un ricevitore ha un CMRR di 80 dB e ai suoi ingressi arriva un disturbo di modo comune di 1 V. A quale tensione differenziale equivale?', options: ['0,1 mV', '12,5 mV', '10 mV', '80 mV'], answer: 0, why: 'In decibel ogni fattore 10 vale 20 dB, quindi 80 dB corrispondono a un rapporto di 10 000. 1 V diviso 10 000 fa 0,1 mV: molto meno della soglia di ±100 mV di un ricevitore LVDS.' },
      { id: 'ea-differenziale-03', chapter: 'differenziale', level: 2, topic: 'Doppino intrecciato', q: 'Perché si intrecciano i due fili di una coppia differenziale?', options: ['Così gli anelli alterni annullano le tensioni indotte', 'Così il cavo diventa uno schermo contro tutti i campi', 'Così il segnale viaggia più veloce lungo il cavo', 'Così i due fili hanno una resistenza più bassa'], answer: 0, why: 'Un campo magnetico che attraversa lo spazio tra i fili induce una tensione nell\'anello che formano. Con l\'intreccio gli anelli si alternano di verso e le tensioni si annullano a due a due. L\'intreccio non è uno schermo: contro i campi elettrici serve uno schermo collegato a massa.' },
      { id: 'ea-differenziale-04', chapter: 'differenziale', level: 3, topic: 'Fattore Q e BER', q: 'Nel diagramma a occhio i livelli 1 e 0 distano dalla soglia sette deviazioni standard di rumore gaussiano (Q = 7). Quanto vale circa il BER?', options: ['Circa un errore ogni mille miliardi di bit', 'Circa un errore ogni settanta bit trasmessi', 'Circa un errore ogni mille bit trasmessi', 'Nessun errore, mai, qualunque sia il tempo'], answer: 0, why: 'Con BER ≈ ½·erfc(Q/√2), Q = 7 dà circa 1,3·10⁻¹², poco più di un errore ogni mille miliardi di bit. Per dimostrarlo con una misura servono circa 3·10¹² bit senza errori, cioè cinque minuti a 10 Gbit/s.' },
    ],
    hero: {
      caption: 'In giallo il filo singolo, in rosa e viola la coppia D+ e D−. Gli impulsi del motore colpiscono tutti i fili allo stesso modo: solo la differenza tra D+ e D− arriva pulita al ricevitore.',
      label: 'Animazione: filo singolo e coppia differenziale sotto gli impulsi di disturbo di un motore',
      aspect: '16 / 7',
      aspectMobile: '1 / 1',
      mount: mountHero,
    },
    lab: {
      title: 'Diagramma a occhio',
      intro: 'Una sequenza di prova PRBS7 attraversa un canale passa-basso e arriva al ricevitore con rumore, jitter e un disturbo di modo comune. Passa dal differenziale al filo singolo e guarda l\'occhio chiudersi; poi sali a 10 Gbit/s, restringi la banda e accendi l\'equalizzazione. Il BER stimato vale ½·erfc(<var>Q</var>/√2).',
      mount: mountLab,
    },
    model,
  });
})(typeof window !== 'undefined' ? window : globalThis);
