/*
 * Storia del PC · capitolo 8 (grafica): dati e logica pura, senza DOM.
 *
 * Tavolozze storiche (CGA, EGA, Macintosh, DAC della VGA), colore più vicino,
 * retinatura a diffusione dell'errore (Floyd–Steinberg, Atkinson),
 * quantizzazione median cut, ridimensionamento per media d'area, memoria video
 * e un piccolo rumore frattale per i crinali delle montagne del laboratorio.
 *
 * Le elaborazioni lunghe sono generatori (function*): il laboratorio le spezza
 * in tanti pezzi da pochi millisecondi, uno per fotogramma, così la pagina non
 * si blocca; i test invece le eseguono tutte d'un fiato con esegui().
 * Formato delle immagini: Uint8ClampedArray con 3 valori (R, G, B) per pixel,
 * oppure 4 (R, G, B, A) per i dati che arrivano da una tela (canvas).
 */
(function (root) {
  'use strict';

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* ---------- tavolozze ---------- */

  // I 16 colori della CGA, che sono anche i 16 colori predefiniti della EGA.
  const CGA16 = [
    { rgb: [0x00, 0x00, 0x00], nome: 'nero' },
    { rgb: [0x00, 0x00, 0xAA], nome: 'blu' },
    { rgb: [0x00, 0xAA, 0x00], nome: 'verde' },
    { rgb: [0x00, 0xAA, 0xAA], nome: 'ciano' },
    { rgb: [0xAA, 0x00, 0x00], nome: 'rosso' },
    { rgb: [0xAA, 0x00, 0xAA], nome: 'magenta' },
    { rgb: [0xAA, 0x55, 0x00], nome: 'marrone' },
    { rgb: [0xAA, 0xAA, 0xAA], nome: 'grigio chiaro' },
    { rgb: [0x55, 0x55, 0x55], nome: 'grigio scuro' },
    { rgb: [0x55, 0x55, 0xFF], nome: 'blu chiaro' },
    { rgb: [0x55, 0xFF, 0x55], nome: 'verde chiaro' },
    { rgb: [0x55, 0xFF, 0xFF], nome: 'ciano chiaro' },
    { rgb: [0xFF, 0x55, 0x55], nome: 'rosso chiaro' },
    { rgb: [0xFF, 0x55, 0xFF], nome: 'magenta chiaro' },
    { rgb: [0xFF, 0xFF, 0x55], nome: 'giallo' },
    { rgb: [0xFF, 0xFF, 0xFF], nome: 'bianco' },
  ];

  // Modalità CGA 320×200, «tavolozza 1» ad alta intensità: sfondo (nero), ciano, magenta, bianco.
  const CGA_TAVOLOZZA_1_ALTA = [0, 11, 13, 15];

  // EGA: 64 colori con 2 bit per canale. I bit 0, 1, 2 accendono blu, verde e rosso
  // «forti» (0xAA), i bit 3, 4, 5 blu, verde e rosso «deboli» (0x55):
  // ogni canale vale quindi 0x00, 0x55, 0xAA oppure 0xFF.
  function egaColore(n) {
    const c = (forte, debole) => 0xAA * ((n >> forte) & 1) + 0x55 * ((n >> debole) & 1);
    return [c(2, 5), c(1, 4), c(0, 3)];
  }
  const EGA64 = Array.from({ length: 64 }, (_, n) => egaColore(n));

  // Registri della tavolozza all'accensione nelle modalità a 16 colori:
  // scelgono fra i 64 proprio i colori della CGA (il 6, 0x14, è il marrone).
  const EGA_PREDEFINITA = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x14, 0x07, 0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x3F];

  // Il DAC della VGA ha 6 bit per canale (0-63): 64 × 64 × 64 = 262.144 colori possibili.
  function a6bit(v) { return Math.round(clamp(v, 0, 255) * 63 / 255); }
  function da6bit(v6) { return (v6 << 2) | (v6 >> 4); }
  function vga(v) { return da6bit(a6bit(v)); }

  const TAVOLOZZE = {
    cga: CGA_TAVOLOZZA_1_ALTA.map((i) => CGA16[i].rgb.slice()),
    ega: EGA_PREDEFINITA.map((n) => EGA64[n].slice()),
    // Macintosh: nella memoria video un bit a 1 è un pixel nero, a 0 bianco.
    mac: [[255, 255, 255], [0, 0, 0]],
  };

  /* ---------- le cinque epoche del laboratorio ---------- */

  // aspetto = proporzioni dell'immagine sullo schermo (larghezza / altezza).
  const MODALITA = [
    { id: 'cga', nome: 'CGA', breve: 'CGA', anno: 1981, etichetta: '1981', larghezza: 320, altezza: 200, bpp: 2, possibili: 16, aspetto: 4 / 3, retinatura: 'fs' },
    { id: 'mac', nome: 'Macintosh', breve: 'Mac', anno: 1984, etichetta: '1984', larghezza: 512, altezza: 342, bpp: 1, possibili: 2, aspetto: 512 / 342, retinatura: 'atkinson' },
    { id: 'ega', nome: 'EGA', breve: 'EGA', anno: 1984, etichetta: '1984', larghezza: 640, altezza: 350, bpp: 4, possibili: 64, aspetto: 4 / 3, retinatura: 'fs' },
    { id: 'vga', nome: 'VGA 13h', breve: 'VGA', anno: 1987, etichetta: '1987', larghezza: 320, altezza: 200, bpp: 8, possibili: 262144, aspetto: 4 / 3, retinatura: 'fs' },
    { id: 'fhd', nome: 'Full HD', breve: 'Full HD', anno: null, etichetta: 'oggi', larghezza: 1920, altezza: 1080, bpp: 24, possibili: 16777216, aspetto: 16 / 9, retinatura: 'nessuna' },
  ];
  MODALITA.forEach((m) => { m.colori = Math.pow(2, m.bpp); m.memoria = memoriaVideo(m.larghezza, m.altezza, m.bpp); });

  function perId(id) {
    const m = typeof id === 'string' ? MODALITA.find((x) => x.id === id) : id;
    if (!m) throw new Error('Modalità sconosciuta: ' + id);
    return m;
  }

  // Byte di memoria video per una schermata: larghezza × altezza × bit per pixel ÷ 8.
  function memoriaVideo(larghezza, altezza, bpp) { return larghezza * altezza * bpp / 8; }
  const SCHERMATA_CGA = memoriaVideo(320, 200, 2); // 16.000 byte
  function schermateCGA(byte) { return byte / SCHERMATA_CGA; }

  // Forma del pixel (larghezza / altezza) quando l'immagine riempie lo schermo:
  // 1 = quadrato; sotto 1 il pixel è più alto che largo.
  function formaPixel(m) { m = perId(m); return m.aspetto * m.altezza / m.larghezza; }

  // Rettangolo da ritagliare al centro di un'immagine W×H per avere le proporzioni volute.
  function ritaglio(aspetto, W, H) {
    if (W / H > aspetto) { const w = H * aspetto; return { x: (W - w) / 2, y: 0, w: w, h: H }; }
    const h = W / aspetto;
    return { x: 0, y: (H - h) / 2, w: W, h: h };
  }

  /* ---------- colori: luminanza, distanza, colore più vicino ---------- */

  // Luminanza (luma) con i pesi della televisione a colori (Rec. 601).
  function luminanza(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }

  // Distanza «percepita» fra due colori: l'occhio è più sensibile al verde.
  const PESI = [2, 4, 3];
  function distanza2(r, g, b, c) {
    const dr = r - c[0], dg = g - c[1], db = b - c[2];
    return PESI[0] * dr * dr + PESI[1] * dg * dg + PESI[2] * db * db;
  }

  // Indice del colore della tavolozza più vicino a (r, g, b).
  function vicino(tavolozza, r, g, b) {
    let migliore = 0, dMin = Infinity;
    for (let i = 0; i < tavolozza.length; i++) {
      const d = distanza2(r, g, b, tavolozza[i]);
      if (d < dMin) { dMin = d; migliore = i; }
    }
    return migliore;
  }

  // Ricerca veloce per tavolozze grandi: la risposta viene ricordata per ogni
  // «cassetto» di colori a 6 bit per canale (la stessa precisione del DAC VGA).
  function cercatore(tavolozza) {
    if (tavolozza.length <= 16) return (r, g, b) => vicino(tavolozza, r, g, b);
    const memo = new Int16Array(1 << 18).fill(-1);
    return function (r, g, b) {
      const k = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
      let i = memo[k];
      if (i < 0) { i = vicino(tavolozza, (r & 252) + 2, (g & 252) + 2, (b & 252) + 2); memo[k] = i; }
      return i;
    };
  }

  function esadecimale(c) {
    return '#' + c.slice(0, 3).map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  function bit(indice, bpp) { return Math.max(0, indice).toString(2).padStart(bpp, '0'); }

  // Tinta (0-360°), saturazione e luminosità (0-1) di un colore, come nel modello HSL.
  function tinta(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    if (!d) return { h: 0, s: 0, l: l };
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = max === r ? ((g - b) / d) % 6 : (max === g ? (b - r) / d + 2 : (r - g) / d + 4);
    h *= 60;
    if (h < 0) h += 360;
    return { h: h, s: s, l: l };
  }

  function nomeColore(id, indice) {
    if (id === 'cga') return CGA16[CGA_TAVOLOZZA_1_ALTA[indice]].nome;
    if (id === 'ega') return CGA16[indice] ? CGA16[indice].nome : '';
    if (id === 'mac') return indice ? 'nero' : 'bianco';
    return '';
  }

  /* ---------- esecuzione dei generatori ---------- */

  // Esegue un generatore fino alla fine e restituisce il suo risultato.
  function esegui(gen) {
    let r = gen.next();
    while (!r.done) r = gen.next();
    return r.value;
  }

  // Riporta l'avanzamento (0-1) di un generatore dentro l'intervallo [a, b].
  function* tratto(gen, a, b) {
    let r = gen.next();
    while (!r.done) { yield a + (b - a) * (typeof r.value === 'number' ? r.value : 0); r = gen.next(); }
    return r.value;
  }

  /* ---------- ridimensionamento per media d'area ---------- */

  // Per ogni pixel di arrivo: da quale pixel di partenza comincia e con che peso
  // contribuisce ciascuno (frazione di area coperta). Vale sia per ridurre sia per ingrandire.
  function pesi1D(inizio, lunghezza, n, max) {
    const passo = lunghezza / n;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const x0 = inizio + i * passo, x1 = x0 + passo;
      const a = clamp(Math.floor(x0), 0, max - 1);
      const b = clamp(Math.ceil(x1) - 1, a, max - 1);
      const w = new Float32Array(b - a + 1);
      let tot = 0;
      for (let k = a; k <= b; k++) {
        const copre = Math.min(x1, k + 1) - Math.max(x0, k);
        w[k - a] = copre > 0 ? copre : 0;
        tot += w[k - a];
      }
      if (tot > 0) for (let k = 0; k < w.length; k++) w[k] /= tot;
      else w[0] = 1;
      out[i] = { da: a, w: w };
    }
    return out;
  }

  // Ritaglia il rettangolo rit di un'immagine sw×sh e lo porta a dw×dh pixel facendo
  // la media dei colori coperti (prima per righe, poi per colonne). Restituisce RGB.
  function* ridimensionaPasso(src, sw, sh, rit, dw, dh, canali) {
    canali = canali || 4;
    rit = rit || { x: 0, y: 0, w: sw, h: sh };
    const px = pesi1D(rit.x, rit.w, dw, sw);
    const py = pesi1D(rit.y, rit.h, dh, sh);
    const y0 = py[0].da;
    const y1 = py[dh - 1].da + py[dh - 1].w.length - 1;
    const righe = y1 - y0 + 1;
    const tmp = new Float32Array(righe * dw * 3);
    for (let y = y0; y <= y1; y++) {
      const base = y * sw * canali;
      const t = (y - y0) * dw * 3;
      for (let i = 0; i < dw; i++) {
        const p = px[i], w = p.w;
        let r = 0, g = 0, b = 0;
        for (let k = 0, q = base + p.da * canali; k < w.length; k++, q += canali) {
          const f = w[k];
          r += src[q] * f; g += src[q + 1] * f; b += src[q + 2] * f;
        }
        const o = t + i * 3;
        tmp[o] = r; tmp[o + 1] = g; tmp[o + 2] = b;
      }
      if ((y - y0) % 16 === 15) yield 0.6 * (y - y0 + 1) / righe;
    }
    const out = new Uint8ClampedArray(dw * dh * 3);
    for (let j = 0; j < dh; j++) {
      const p = py[j], w = p.w;
      for (let i = 0; i < dw; i++) {
        let r = 0, g = 0, b = 0;
        for (let k = 0; k < w.length; k++) {
          const t = ((p.da - y0 + k) * dw + i) * 3, f = w[k];
          r += tmp[t] * f; g += tmp[t + 1] * f; b += tmp[t + 2] * f;
        }
        const o = (j * dw + i) * 3;
        out[o] = r; out[o + 1] = g; out[o + 2] = b;
      }
      if (j % 16 === 15) yield 0.6 + 0.4 * (j + 1) / dh;
    }
    return out;
  }

  function ridimensiona(src, sw, sh, rit, dw, dh, canali) {
    return esegui(ridimensionaPasso(src, sw, sh, rit, dw, dh, canali));
  }

  // Trasforma un'immagine RGB in grigi (stesso valore nei tre canali), sul posto.
  function inGrigio(rgb) {
    for (let q = 0; q < rgb.length; q += 3) {
      const v = luminanza(rgb[q], rgb[q + 1], rgb[q + 2]);
      rgb[q] = v; rgb[q + 1] = v; rgb[q + 2] = v;
    }
    return rgb;
  }

  /* ---------- retinatura a diffusione dell'errore ---------- */

  // Dove finisce l'errore di un pixel: [dx, dy, peso]; il totale dei pesi diviso per div
  // è 1 per Floyd–Steinberg (16/16) e 3/4 per Atkinson (6/8: due ottavi si perdono).
  const NUCLEI = {
    fs: { div: 16, punti: [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]] },
    atkinson: { div: 8, punti: [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]] },
  };
  const RETINATURE = ['nessuna', 'fs', 'atkinson'];

  // Sceglie per ogni pixel un colore della tavolozza. Con 'nessuna' prende il più vicino;
  // con 'fs' o 'atkinson' passa ai vicini non ancora disegnati l'errore commesso
  // (colore voluto meno colore scelto). Restituisce gli indici, una riga alla volta.
  function* diffondiPasso(rgb, w, h, tavolozza, tipo) {
    const n = w * h;
    const out = new Uint8Array(n);
    const trova = cercatore(tavolozza);
    const nucleo = NUCLEI[tipo] || null;
    const buf = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) buf[i] = rgb[i];
    const ddx = nucleo ? nucleo.punti.map((p) => p[0]) : [];
    const ddy = nucleo ? nucleo.punti.map((p) => p[1]) : [];
    const pk = nucleo ? nucleo.punti.map((p) => p[2] / nucleo.div) : [];
    const np = ddx.length;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x, q = p * 3;
        let r = buf[q], g = buf[q + 1], b = buf[q + 2];
        r = r < 0 ? 0 : (r > 255 ? 255 : r);
        g = g < 0 ? 0 : (g > 255 ? 255 : g);
        b = b < 0 ? 0 : (b > 255 ? 255 : b);
        const i = trova(Math.round(r), Math.round(g), Math.round(b));
        out[p] = i;
        if (np) {
          const c = tavolozza[i];
          const er = r - c[0], eg = g - c[1], eb = b - c[2];
          for (let k = 0; k < np; k++) {
            const xx = x + ddx[k], yy = y + ddy[k];
            if (xx < 0 || xx >= w || yy >= h) continue;
            const qq = (yy * w + xx) * 3, f = pk[k];
            buf[qq] += er * f; buf[qq + 1] += eg * f; buf[qq + 2] += eb * f;
          }
        }
      }
      yield (y + 1) / h;
    }
    return out;
  }

  function diffondi(rgb, w, h, tavolozza, tipo) { return esegui(diffondiPasso(rgb, w, h, tavolozza, tipo)); }

  function rgbaDaIndici(indici, tavolozza) {
    const out = new Uint8ClampedArray(indici.length * 4);
    for (let p = 0, o = 0; p < indici.length; p++, o += 4) {
      const c = tavolozza[indici[p]];
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
    }
    return out;
  }

  /* ---------- quantizzazione: median cut ---------- */

  // Median cut (Paul Heckbert, 1982): si mettono tutti i colori dell'immagine in una
  // «scatola» nello spazio RGB, la si taglia a metà (alla mediana) lungo il lato più
  // lungo, e si ripete sulla scatola più affollata finché le scatole sono n.
  // Il colore di ogni scatola è la media dei suoi pixel. Per velocità i colori sono
  // contati in un istogramma a 5 bit per canale; nell'ultimo quarto dei tagli si
  // preferiscono le scatole grandi oltre che affollate (variante MMCQ).
  // opzioni.bit = 6 arrotonda il risultato ai 262.144 colori del DAC della VGA.
  function medianCut(rgb, n, opzioni) {
    const bitCanale = (opzioni && opzioni.bit) || 8;
    const canali = (opzioni && opzioni.canali) || 3;
    const N = 1 << 15;
    const conta = new Uint32Array(N);
    const sr = new Float64Array(N), sg = new Float64Array(N), sb = new Float64Array(N);
    for (let q = 0; q + 2 < rgb.length; q += canali) {
      const r = rgb[q], g = rgb[q + 1], b = rgb[q + 2];
      const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      conta[k]++; sr[k] += r; sg[k] += g; sb[k] += b;
    }
    const celle = [];
    for (let k = 0; k < N; k++) if (conta[k]) celle.push(k);
    if (!celle.length || n < 1) return [];

    const R = (k) => k >> 10, G = (k) => (k >> 5) & 31, B = (k) => k & 31;
    function scatola(da, a) {
      const s = { da: da, a: a, conta: 0, rm: 31, rM: 0, gm: 31, gM: 0, bm: 31, bM: 0 };
      for (let i = da; i < a; i++) {
        const k = celle[i], r = R(k), g = G(k), b = B(k);
        s.conta += conta[k];
        if (r < s.rm) s.rm = r; if (r > s.rM) s.rM = r;
        if (g < s.gm) s.gm = g; if (g > s.gM) s.gM = g;
        if (b < s.bm) s.bm = b; if (b > s.bM) s.bM = b;
      }
      return s;
    }

    const scatole = [scatola(0, celle.length)];
    const soglia = Math.round(n * 0.75);
    while (scatole.length < n) {
      const primaFase = scatole.length < soglia;
      let scelta = -1, punteggio = -1;
      for (let i = 0; i < scatole.length; i++) {
        const s = scatole[i];
        if (s.a - s.da < 2) continue;
        const volume = (s.rM - s.rm + 1) * (s.gM - s.gm + 1) * (s.bM - s.bm + 1);
        const p = primaFase ? s.conta : s.conta * volume;
        if (p > punteggio) { punteggio = p; scelta = i; }
      }
      if (scelta < 0) break; // ogni scatola contiene ormai un solo colore
      const s = scatole[scelta];
      const lr = s.rM - s.rm, lg = s.gM - s.gm, lb = s.bM - s.bm;
      const asse = (lg >= lr && lg >= lb) ? G : (lr >= lb ? R : B);
      const parte = celle.slice(s.da, s.a).sort((x, y) => asse(x) - asse(y));
      for (let i = 0; i < parte.length; i++) celle[s.da + i] = parte[i];
      // taglio alla mediana, pesata con il numero di pixel di ogni cella
      const meta = s.conta / 2;
      let acc = 0, taglio = s.a - 1;
      for (let i = s.da; i < s.a - 1; i++) {
        acc += conta[celle[i]];
        if (acc >= meta) { taglio = i + 1; break; }
      }
      scatole.splice(scelta, 1, scatola(s.da, taglio), scatola(taglio, s.a));
    }

    return scatole.map((s) => {
      let c = 0, r = 0, g = 0, b = 0;
      for (let i = s.da; i < s.a; i++) { const k = celle[i]; c += conta[k]; r += sr[k]; g += sg[k]; b += sb[k]; }
      const media = [r / c, g / c, b / c];
      return media.map((v) => (bitCanale === 6 ? vga(v) : Math.round(clamp(v, 0, 255))));
    });
  }

  function ordinaPerLuminanza(tavolozza) {
    return tavolozza.slice().sort((a, b) => luminanza(a[0], a[1], a[2]) - luminanza(b[0], b[1], b[2]));
  }

  /* ---------- il percorso completo di una modalità ---------- */

  // Dall'immagine originale (sorgente: { larghezza, altezza, dati RGBA }) all'immagine
  // di un'epoca: ritaglio alle proporzioni dello schermo, riduzione alla risoluzione,
  // scelta della tavolozza (fissa, oppure median cut per la VGA), retinatura.
  // cache (facoltativa) conserva la riduzione e la tavolozza per i passaggi successivi.
  function* elabora(id, sorgente, retinatura, cache) {
    const m = perId(id);
    cache = cache || {};
    if (m.id === 'fhd') {
      return { modalita: m, larghezza: sorgente.larghezza, altezza: sorgente.altezza, indici: null, tavolozza: null, rgba: sorgente.dati, retinatura: 'nessuna' };
    }
    const tipo = RETINATURE.indexOf(retinatura) >= 0 ? retinatura : m.retinatura;
    let rgb = cache['rgb:' + m.id];
    if (!rgb) {
      const rit = ritaglio(m.aspetto, sorgente.larghezza, sorgente.altezza);
      rgb = yield* tratto(ridimensionaPasso(sorgente.dati, sorgente.larghezza, sorgente.altezza, rit, m.larghezza, m.altezza, 4), 0, 0.5);
      if (m.id === 'mac') inGrigio(rgb);
      cache['rgb:' + m.id] = rgb;
    }
    let tavolozza = TAVOLOZZE[m.id];
    if (m.id === 'vga') {
      tavolozza = cache['tav:vga'];
      if (!tavolozza) {
        yield 0.5;
        tavolozza = ordinaPerLuminanza(medianCut(rgb, 256, { bit: 6 }));
        cache['tav:vga'] = tavolozza;
      }
    }
    yield 0.55;
    const indici = yield* tratto(diffondiPasso(rgb, m.larghezza, m.altezza, tavolozza, tipo), 0.55, 1);
    return { modalita: m, larghezza: m.larghezza, altezza: m.altezza, indici: indici, tavolozza: tavolozza, rgba: rgbaDaIndici(indici, tavolozza), retinatura: tipo };
  }

  /* ---------- caso ripetibile e crinali ---------- */

  // Generatore pseudo-casuale con seme (mulberry32): stessi numeri a ogni avvio.
  function rng(seme) {
    let a = seme >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Profilo di un crinale: somma di «ottave» di rumore sempre più fitte e più deboli.
  // Restituisce punti valori fra 0 e 1.
  function crinale(seme, punti, ottave, persistenza) {
    const caso = rng(seme);
    const out = new Float32Array(punti);
    let amp = 1, somma = 0;
    for (let o = 0; o < ottave; o++) {
      const seg = 2 << o;
      const nodi = new Float32Array(seg + 1);
      for (let i = 0; i <= seg; i++) nodi[i] = caso();
      for (let i = 0; i < punti; i++) {
        const t = (i / Math.max(1, punti - 1)) * seg;
        const k = Math.min(seg - 1, Math.floor(t));
        const f = t - k;
        const s = (1 - Math.cos(Math.PI * f)) / 2;
        out[i] += (nodi[k] * (1 - s) + nodi[k + 1] * s) * amp;
      }
      somma += amp;
      amp *= persistenza;
    }
    for (let i = 0; i < punti; i++) out[i] /= somma;
    return out;
  }

  const api = {
    CGA16: CGA16,
    CGA_TAVOLOZZA_1_ALTA: CGA_TAVOLOZZA_1_ALTA,
    EGA64: EGA64,
    EGA_PREDEFINITA: EGA_PREDEFINITA,
    TAVOLOZZE: TAVOLOZZE,
    MODALITA: MODALITA,
    NUCLEI: NUCLEI,
    RETINATURE: RETINATURE,
    PESI: PESI,
    SCHERMATA_CGA: SCHERMATA_CGA,
    egaColore: egaColore,
    a6bit: a6bit,
    da6bit: da6bit,
    vga: vga,
    perId: perId,
    memoriaVideo: memoriaVideo,
    schermateCGA: schermateCGA,
    formaPixel: formaPixel,
    ritaglio: ritaglio,
    luminanza: luminanza,
    distanza2: distanza2,
    vicino: vicino,
    cercatore: cercatore,
    esadecimale: esadecimale,
    bit: bit,
    tinta: tinta,
    nomeColore: nomeColore,
    esegui: esegui,
    tratto: tratto,
    pesi1D: pesi1D,
    ridimensionaPasso: ridimensionaPasso,
    ridimensiona: ridimensiona,
    inGrigio: inGrigio,
    diffondiPasso: diffondiPasso,
    diffondi: diffondi,
    rgbaDaIndici: rgbaDaIndici,
    medianCut: medianCut,
    ordinaPerLuminanza: ordinaPerLuminanza,
    elabora: elabora,
    rng: rng,
    crinale: crinale,
  };

  (root.StoriaPCModelli = root.StoriaPCModelli || {})['grafica'] = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
