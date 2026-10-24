// Test del capitolo 8 (grafica): node --test tests/storia-pc-08-grafica.test.js
const test = require('node:test');
const assert = require('node:assert');
const G = require('../sections/storia-pc/js/modelli/08-grafica.js');

/* ---------- aiuti ---------- */

// Immagine RGB w×h con un colore calcolato da f(x, y) -> [r, g, b].
function immagine(w, h, f) {
  const out = new Uint8ClampedArray(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = f(x, y);
      const o = (y * w + x) * 3;
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2];
    }
  }
  return out;
}

// Come sopra ma RGBA (4 valori per pixel), come i dati di una tela.
function immagineRGBA(w, h, f) {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = f(x, y);
      const o = (y * w + x) * 4;
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
    }
  }
  return out;
}

function lumMedia(dati, canali) {
  let s = 0, n = 0;
  for (let q = 0; q < dati.length; q += canali) { s += G.luminanza(dati[q], dati[q + 1], dati[q + 2]); n++; }
  return s / n;
}

function mediaCanali(dati, canali) {
  const s = [0, 0, 0];
  let n = 0;
  for (let q = 0; q < dati.length; q += canali) { s[0] += dati[q]; s[1] += dati[q + 1]; s[2] += dati[q + 2]; n++; }
  return s.map((v) => v / n);
}

function hex(c) { return G.esadecimale(c); }

// Una piccola «scena» con sfumature di colore, simile al tramonto del laboratorio.
function scenaSintetica(w, h) {
  return immagineRGBA(w, h, (x, y) => {
    const t = y / (h - 1), u = x / (w - 1);
    if (t > 0.7) return [40 + 30 * u, 25, 60 + 40 * u];        // riva scura
    return [60 + 190 * t, 30 + 120 * t * t, 120 - 60 * t + 40 * u]; // cielo dal viola all'arancio
  });
}

/* ---------- dati delle epoche ---------- */

test('le epoche sono in ordine cronologico e finiscono con il Full HD di oggi', () => {
  const anni = G.MODALITA.filter((m) => m.anno != null).map((m) => m.anno);
  assert.deepStrictEqual(anni, anni.slice().sort((a, b) => a - b));
  assert.deepStrictEqual(G.MODALITA.map((m) => m.id), ['cga', 'mac', 'ega', 'vga', 'fhd']);
  assert.strictEqual(G.MODALITA[G.MODALITA.length - 1].etichetta, 'oggi');
});

test('risoluzioni e colori a schermo: con n bit per pixel si hanno 2^n colori', () => {
  const atteso = {
    cga: [320, 200, 2, 4], mac: [512, 342, 1, 2], ega: [640, 350, 4, 16], vga: [320, 200, 8, 256], fhd: [1920, 1080, 24, 16777216],
  };
  for (const m of G.MODALITA) {
    assert.deepStrictEqual([m.larghezza, m.altezza, m.bpp, m.colori], atteso[m.id], m.id);
    assert.ok(m.possibili >= m.colori, m.id + ': i colori a schermo vengono da una tavolozza più grande o uguale');
  }
  assert.strictEqual(G.perId('vga').possibili, 262144);
  assert.strictEqual(G.perId('ega').possibili, 64);
});

test('memoria video: larghezza × altezza × bit per pixel ÷ 8', () => {
  assert.strictEqual(G.memoriaVideo(320, 200, 2), 16000);   // CGA 320×200 a 4 colori
  assert.strictEqual(G.memoriaVideo(512, 342, 1), 21888);   // Macintosh 128K
  assert.strictEqual(G.memoriaVideo(640, 350, 4), 112000);  // EGA a 16 colori: più dei 64 KB di serie
  assert.strictEqual(G.memoriaVideo(320, 200, 8), 64000);   // VGA modalità 13h: sta in 64 KB
  assert.strictEqual(G.memoriaVideo(1920, 1080, 24), 6220800);
  assert.strictEqual(G.memoriaVideo(80 * 9, 25 * 14, 1), 31500); // MDA disegnata punto per punto
  for (const m of G.MODALITA) assert.strictEqual(m.memoria, G.memoriaVideo(m.larghezza, m.altezza, m.bpp));
  assert.ok(G.perId('ega').memoria > 64 * 1024);
  assert.ok(G.perId('vga').memoria <= 64 * 1024);
  assert.ok(G.perId('cga').memoria <= 16 * 1024);
  assert.strictEqual(G.SCHERMATA_CGA, 16000);
  assert.ok(Math.abs(G.schermateCGA(6220800) - 388.8) < 1e-9);
  // un sesto della memoria del primo Macintosh (128 KB) serviva allo schermo
  assert.ok(Math.abs(21888 / (128 * 1024) - 1 / 6) < 0.001);
});

test('forma dei pixel: quadrati sul Macintosh e in Full HD, più alti su CGA, EGA e VGA', () => {
  assert.ok(Math.abs(G.formaPixel('mac') - 1) < 1e-9);
  assert.ok(Math.abs(G.formaPixel('fhd') - 1) < 1e-9);
  assert.ok(Math.abs(1 / G.formaPixel('cga') - 1.2) < 1e-9);   // 20% più alti che larghi
  assert.ok(Math.abs(1 / G.formaPixel('vga') - 1.2) < 1e-9);
  assert.ok(Math.abs(1 / G.formaPixel('ega') - 1.3714) < 1e-3); // circa 37% più alti
});

test('ritaglio centrato alle proporzioni dello schermo', () => {
  const r = G.ritaglio(4 / 3, 1920, 1080);
  assert.deepStrictEqual(r, { x: 240, y: 0, w: 1440, h: 1080 });
  const r2 = G.ritaglio(16 / 9, 400, 300);
  assert.strictEqual(r2.x, 0);
  assert.strictEqual(r2.w, 400);
  assert.ok(Math.abs(r2.h - 225) < 1e-9 && Math.abs(r2.y - 37.5) < 1e-9);
});

/* ---------- tavolozze ---------- */

test('CGA: i 16 colori e la tavolozza 1 ad alta intensità (nero, ciano, magenta, bianco)', () => {
  assert.strictEqual(G.CGA16.length, 16);
  const valori = G.CGA16.map((c) => hex(c.rgb));
  assert.deepStrictEqual(valori, [
    '#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
    '#555555', '#5555FF', '#55FF55', '#55FFFF', '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF',
  ]);
  assert.deepStrictEqual(G.TAVOLOZZE.cga.map(hex), ['#000000', '#55FFFF', '#FF55FF', '#FFFFFF']);
  assert.deepStrictEqual(G.CGA_TAVOLOZZA_1_ALTA.map((i) => G.CGA16[i].nome), ['nero', 'ciano chiaro', 'magenta chiaro', 'bianco']);
});

test('EGA: 64 colori con canali a 0x00, 0x55, 0xAA, 0xFF; i 16 predefiniti sono quelli della CGA', () => {
  assert.strictEqual(G.EGA64.length, 64);
  assert.strictEqual(new Set(G.EGA64.map(hex)).size, 64);
  for (const c of G.EGA64) for (const v of c) assert.ok([0x00, 0x55, 0xAA, 0xFF].includes(v));
  assert.deepStrictEqual(G.TAVOLOZZE.ega.map(hex), G.CGA16.map((c) => hex(c.rgb)));
  assert.strictEqual(hex(G.egaColore(0x14)), '#AA5500'); // il marrone
  assert.strictEqual(hex(G.egaColore(0x3F)), '#FFFFFF');
  assert.strictEqual(hex(G.egaColore(0x38)), '#555555');
});

test('VGA: 6 bit per canale, 64 livelli per canale e 262.144 colori', () => {
  assert.strictEqual(G.a6bit(0), 0);
  assert.strictEqual(G.a6bit(255), 63);
  assert.strictEqual(G.da6bit(63), 255);
  assert.strictEqual(G.da6bit(0), 0);
  const livelli = new Set();
  for (let v = 0; v < 256; v++) livelli.add(G.vga(v));
  assert.strictEqual(livelli.size, 64);
  assert.strictEqual(Math.pow(livelli.size, 3), 262144);
  for (const l of livelli) assert.strictEqual(G.vga(l), l, 'un livello VGA resta uguale');
  for (let v = 0; v < 256; v++) assert.ok(Math.abs(G.vga(v) - v) <= 3);
});

test('Macintosh: due colori, il bit 1 è nero', () => {
  assert.deepStrictEqual(G.TAVOLOZZE.mac, [[255, 255, 255], [0, 0, 0]]);
  assert.strictEqual(G.nomeColore('mac', 1), 'nero');
  assert.strictEqual(G.nomeColore('mac', 0), 'bianco');
  assert.strictEqual(G.nomeColore('cga', 2), 'magenta chiaro');
  assert.strictEqual(G.nomeColore('ega', 6), 'marrone');
});

/* ---------- colore più vicino ---------- */

test('colore più vicino: ogni colore della tavolozza trova sé stesso', () => {
  for (const tav of [G.TAVOLOZZE.cga, G.TAVOLOZZE.ega, G.EGA64]) {
    tav.forEach((c, i) => assert.strictEqual(G.vicino(tav, c[0], c[1], c[2]), i));
  }
});

test('colore più vicino: coincide con la ricerca esaustiva', () => {
  const caso = G.rng(42);
  const tav = G.TAVOLOZZE.ega;
  for (let k = 0; k < 500; k++) {
    const r = Math.floor(caso() * 256), g = Math.floor(caso() * 256), b = Math.floor(caso() * 256);
    const i = G.vicino(tav, r, g, b);
    const d = G.distanza2(r, g, b, tav[i]);
    for (const c of tav) assert.ok(d <= G.distanza2(r, g, b, c));
  }
});

test('ricerca veloce a 6 bit: risposta esatta o quasi per una tavolozza di 256 colori', () => {
  const caso = G.rng(7);
  const tav = Array.from({ length: 256 }, () => [caso() * 255, caso() * 255, caso() * 255].map(G.vga));
  const trova = G.cercatore(tav);
  let peggio = 0;
  for (let k = 0; k < 2000; k++) {
    const r = Math.floor(caso() * 256), g = Math.floor(caso() * 256), b = Math.floor(caso() * 256);
    const veloce = G.distanza2(r, g, b, tav[trova(r, g, b)]);
    const esatta = G.distanza2(r, g, b, tav[G.vicino(tav, r, g, b)]);
    peggio = Math.max(peggio, Math.sqrt(veloce / 9) - Math.sqrt(esatta / 9));
  }
  assert.ok(peggio < 6, 'scarto massimo ' + peggio.toFixed(2));
  // al centro di un «cassetto» la risposta è esatta
  assert.strictEqual(trova(130, 66, 2), G.vicino(tav, 130, 66, 2));
});

/* ---------- retinatura ---------- */

test('senza retinatura ogni pixel prende il colore più vicino (bande nette)', () => {
  const w = 16, h = 4;
  const grigio = immagine(w, h, () => [100, 100, 100]);
  const ind = G.diffondi(grigio, w, h, G.TAVOLOZZE.mac, 'nessuna');
  assert.strictEqual(ind.length, w * h);
  assert.ok(ind.every((i) => i === 1), 'un grigio scuro diventa tutto nero');
  const chiaro = G.diffondi(immagine(w, h, () => [180, 180, 180]), w, h, G.TAVOLOZZE.mac, 'nessuna');
  assert.ok(chiaro.every((i) => i === 0), 'un grigio chiaro diventa tutto bianco');
});

test('Floyd–Steinberg conserva la luminosità media di una sfumatura', () => {
  const w = 96, h = 64;
  const sfumatura = immagine(w, h, (x) => { const v = Math.round(255 * x / (w - 1)); return [v, v, v]; });
  const ind = G.diffondi(sfumatura, w, h, G.TAVOLOZZE.mac, 'fs');
  const rgba = G.rgbaDaIndici(ind, G.TAVOLOZZE.mac);
  const prima = lumMedia(sfumatura, 3), dopo = lumMedia(rgba, 4);
  assert.ok(Math.abs(prima - dopo) < 255 * 0.02, prima.toFixed(1) + ' contro ' + dopo.toFixed(1));
  // grigio medio uniforme: circa metà pixel neri
  const medio = G.diffondi(immagine(64, 64, () => [128, 128, 128]), 64, 64, G.TAVOLOZZE.mac, 'fs');
  const neri = medio.reduce((s, i) => s + i, 0) / medio.length;
  assert.ok(Math.abs(neri - 0.5) < 0.03, 'neri: ' + neri);
});

test('Floyd–Steinberg a colori: la media resta vicina all\'originale per i colori ottenibili mescolando la tavolozza', () => {
  // La retinatura può imitare solo i colori «dentro» la tavolozza: con nero, ciano, magenta
  // e bianco nessuna miscela ha più rosso che blu. Qui ogni zona è una miscela di colori della tavolozza.
  const w = 80, h = 50;
  for (const id of ['cga', 'ega']) {
    const tav = G.TAVOLOZZE[id];
    const caso = G.rng(id === 'cga' ? 5 : 9);
    const miscele = Array.from({ length: 8 }, () => {
      const pesi = tav.map(() => caso());
      const tot = pesi.reduce((s, v) => s + v, 0);
      return [0, 1, 2].map((c) => tav.reduce((s, col, i) => s + col[c] * pesi[i] / tot, 0));
    });
    const img = immagine(w, h, (x, y) => miscele[Math.floor(x / 20) + 4 * Math.floor(y / 25)]);
    const rgba = G.rgbaDaIndici(G.diffondi(img, w, h, tav, 'fs'), tav);
    const a = mediaCanali(img, 3), b = mediaCanali(rgba, 4);
    for (let c = 0; c < 3; c++) assert.ok(Math.abs(a[c] - b[c]) < 255 * 0.03, id + ' canale ' + c + ': ' + a[c].toFixed(1) + ' / ' + b[c].toFixed(1));
  }
  // fuori dalla tavolozza no: un rosso pieno in CGA non si può imitare
  const rosso = immagine(20, 20, () => [255, 0, 0]);
  const media = mediaCanali(G.rgbaDaIndici(G.diffondi(rosso, 20, 20, G.TAVOLOZZE.cga, 'fs'), G.TAVOLOZZE.cga), 4);
  assert.ok(media[2] >= media[0] - 1, 'in CGA il blu non scende mai sotto il rosso');
});

test('Atkinson: i grigi medi si conservano, i quasi bianchi e i quasi neri si «bruciano»', () => {
  const n = 64;
  const conta = (v, tipo) => {
    const ind = G.diffondi(immagine(n, n, () => [v, v, v]), n, n, G.TAVOLOZZE.mac, tipo);
    return ind.reduce((s, i) => s + i, 0) / ind.length; // frazione di pixel neri
  };
  assert.ok(Math.abs(conta(128, 'atkinson') - 0.5) < 0.06);
  // un grigio molto chiaro: Floyd–Steinberg mette qualche puntino nero, Atkinson quasi nessuno
  assert.ok(conta(235, 'atkinson') < conta(235, 'fs'));
  assert.ok(conta(20, 'atkinson') > conta(20, 'fs'), 'e il quasi nero diventa più nero');
  // la diffusione di Atkinson distribuisce 6/8 dell'errore, Floyd–Steinberg 16/16
  const totale = (k) => k.punti.reduce((s, p) => s + p[2], 0) / k.div;
  assert.strictEqual(totale(G.NUCLEI.atkinson), 0.75);
  assert.strictEqual(totale(G.NUCLEI.fs), 1);
});

test('la retinatura restituisce indici validi, una riga alla volta', () => {
  const w = 20, h = 7;
  const img = immagine(w, h, (x, y) => [x * 12, y * 30, 128]);
  const gen = G.diffondiPasso(img, w, h, G.TAVOLOZZE.ega, 'atkinson');
  let passi = 0, r = gen.next();
  while (!r.done) { passi++; assert.ok(r.value > 0 && r.value <= 1); r = gen.next(); }
  assert.strictEqual(passi, h);
  assert.ok(r.value.every((i) => i >= 0 && i < 16));
});

/* ---------- ridimensionamento ---------- */

test('ridimensionamento per media d\'area: blocchi 2×2 e colori uniformi', () => {
  const src = immagineRGBA(4, 4, (x, y) => [x < 2 ? 0 : 200, y < 2 ? 40 : 120, 255]);
  const out = G.ridimensiona(src, 4, 4, null, 2, 2, 4);
  assert.deepStrictEqual(Array.from(out), [0, 40, 255, 200, 40, 255, 0, 120, 255, 200, 120, 255]);
  const uniforme = G.ridimensiona(immagineRGBA(37, 23, () => [10, 200, 90]), 37, 23, null, 11, 5, 4);
  for (let q = 0; q < uniforme.length; q += 3) assert.deepStrictEqual(Array.from(uniforme.slice(q, q + 3)), [10, 200, 90]);
});

test('ridimensionamento con fattore non intero: la media dei colori si conserva', () => {
  const src = immagineRGBA(97, 61, (x, y) => [(x * 7) % 256, (y * 11) % 256, (x * y) % 256]);
  const out = G.ridimensiona(src, 97, 61, null, 30, 20, 4);
  assert.strictEqual(out.length, 30 * 20 * 3);
  const a = mediaCanali(src, 4), b = mediaCanali(out, 3);
  for (let c = 0; c < 3; c++) assert.ok(Math.abs(a[c] - b[c]) < 1.5, 'canale ' + c);
  // anche ingrandire funziona (ogni pixel di arrivo copre una parte di un pixel di partenza)
  const grande = G.ridimensiona(immagineRGBA(2, 1, (x) => (x ? [255, 255, 255] : [0, 0, 0])), 2, 1, null, 8, 2, 4);
  assert.deepStrictEqual(Array.from(grande.slice(0, 3)), [0, 0, 0]);
  assert.deepStrictEqual(Array.from(grande.slice(21, 24)), [255, 255, 255]);
});

test('pesi di copertura: ogni pixel di arrivo somma a 1', () => {
  for (const [inizio, lung, n, max] of [[0, 1920, 320, 1920], [240, 1440, 640, 1920], [151.6, 1616.8, 512, 1920]]) {
    const p = G.pesi1D(inizio, lung, n, max);
    assert.strictEqual(p.length, n);
    for (const { w } of p) assert.ok(Math.abs(w.reduce((s, v) => s + v, 0) - 1) < 1e-5);
  }
});

/* ---------- median cut ---------- */

test('median cut: un\'immagine con 4 colori dà esattamente quei 4 colori', () => {
  const colori = [[200, 30, 30], [20, 160, 60], [30, 40, 220], [250, 240, 200]];
  const img = immagine(40, 40, (x, y) => colori[(x < 20 ? 0 : 1) + (y < 20 ? 0 : 2)]);
  const tav = G.medianCut(img, 4);
  assert.strictEqual(tav.length, 4);
  assert.deepStrictEqual(tav.map(hex).sort(), colori.map(hex).sort());
  const due = G.medianCut(img, 2);
  assert.strictEqual(due.length, 2);
});

test('median cut: non supera mai n colori e con bit 6 usa solo colori VGA', () => {
  const caso = G.rng(3);
  const img = immagine(64, 48, () => [caso() * 255, caso() * 255, caso() * 255]);
  for (const n of [1, 16, 256]) {
    const tav = G.medianCut(img, n, { bit: 6 });
    assert.ok(tav.length <= n && tav.length >= 1);
    for (const c of tav) for (const v of c) assert.strictEqual(G.vga(v), v);
  }
});

test('median cut a 256 colori + Floyd–Steinberg: immagine quasi uguale all\'originale', () => {
  const w = 160, h = 100;
  const sorg = scenaSintetica(w, h);
  const rgb = G.ridimensiona(sorg, w, h, null, w, h, 4);
  const tav = G.medianCut(rgb, 256, { bit: 6 });
  const ind = G.diffondi(rgb, w, h, tav, 'fs');
  const rgba = G.rgbaDaIndici(ind, tav);
  let errore = 0;
  for (let p = 0; p < w * h; p++) {
    for (let c = 0; c < 3; c++) errore += Math.abs(rgb[p * 3 + c] - rgba[p * 4 + c]);
  }
  errore /= w * h * 3;
  assert.ok(errore < 8, 'errore medio per canale: ' + errore.toFixed(2));
  assert.ok(Math.abs(lumMedia(rgb, 3) - lumMedia(rgba, 4)) < 2);
});

test('tavolozza ordinata per luminanza', () => {
  const tav = G.ordinaPerLuminanza([[255, 255, 255], [0, 0, 0], [0, 255, 0], [0, 0, 255]]);
  assert.deepStrictEqual(tav.map(hex), ['#000000', '#0000FF', '#00FF00', '#FFFFFF']);
});

/* ---------- percorso completo ---------- */

test('elabora: ogni epoca produce un\'immagine della sua risoluzione con i suoi colori', () => {
  const W = 480, H = 270;
  const sorgente = { larghezza: W, altezza: H, dati: scenaSintetica(W, H) };
  const cache = {};
  for (const m of G.MODALITA) {
    const r = G.esegui(G.elabora(m.id, sorgente, null, cache));
    assert.strictEqual(r.larghezza * r.altezza * 4, r.rgba.length, m.id);
    if (m.id === 'fhd') { assert.strictEqual(r.rgba, sorgente.dati); continue; }
    assert.strictEqual(r.larghezza, m.larghezza);
    assert.strictEqual(r.altezza, m.altezza);
    assert.strictEqual(r.retinatura, m.retinatura);
    assert.ok(r.tavolozza.length <= m.colori, m.id + ': al massimo ' + m.colori + ' colori');
    assert.ok(r.indici.every((i) => i < r.tavolozza.length));
    const usati = new Set(); r.indici.forEach((i) => usati.add(i));
    assert.ok(usati.size > 1, m.id + ': più di un colore');
    // la luminosità media del ritaglio originale si conserva (Atkinson un po' meno)
    const rit = G.ritaglio(m.aspetto, W, H);
    const rif = G.ridimensiona(sorgente.dati, W, H, rit, m.larghezza, m.altezza, 4);
    const tolleranza = m.id === 'mac' ? 0.1 : 0.06;
    assert.ok(Math.abs(lumMedia(rif, 3) - lumMedia(r.rgba, 4)) < 255 * tolleranza, m.id);
  }
  assert.ok(cache['rgb:cga'] && cache['tav:vga'], 'la riduzione e la tavolozza VGA restano in memoria');
});

test('elabora: la retinatura scelta cambia il risultato, la riduzione resta in cache', () => {
  const W = 320, H = 180;
  const sorgente = { larghezza: W, altezza: H, dati: scenaSintetica(W, H) };
  const cache = {};
  const a = G.esegui(G.elabora('cga', sorgente, 'nessuna', cache));
  const rgb = cache['rgb:cga'];
  const b = G.esegui(G.elabora('cga', sorgente, 'atkinson', cache));
  assert.strictEqual(cache['rgb:cga'], rgb);
  assert.strictEqual(a.retinatura, 'nessuna');
  assert.strictEqual(b.retinatura, 'atkinson');
  let diversi = 0;
  for (let p = 0; p < a.indici.length; p++) if (a.indici[p] !== b.indici[p]) diversi++;
  assert.ok(diversi > a.indici.length * 0.05);
  // l'avanzamento cresce da 0 a 1
  const gen = G.elabora('ega', sorgente, 'fs', {});
  let ultimo = 0, r = gen.next();
  while (!r.done) { assert.ok(r.value >= ultimo - 1e-9 && r.value <= 1); ultimo = r.value; r = gen.next(); }
});

/* ---------- utilità ---------- */

test('esadecimale, bit, tinta', () => {
  assert.strictEqual(G.esadecimale([255, 85, 255]), '#FF55FF');
  assert.strictEqual(G.bit(2, 2), '10');
  assert.strictEqual(G.bit(13, 4), '1101');
  assert.strictEqual(G.bit(1, 8), '00000001');
  const rosso = G.tinta(255, 0, 0);
  assert.ok(Math.abs(rosso.h) < 1e-9 && Math.abs(rosso.l - 0.5) < 1e-9 && Math.abs(rosso.s - 1) < 1e-9);
  assert.ok(Math.abs(G.tinta(0, 0, 255).h - 240) < 1e-9);
  assert.strictEqual(G.tinta(128, 128, 128).s, 0);
});

test('rumore dei crinali: ripetibile e sempre fra 0 e 1', () => {
  const a = G.crinale(11, 200, 5, 0.5);
  const b = G.crinale(11, 200, 5, 0.5);
  const c = G.crinale(12, 200, 5, 0.5);
  assert.deepStrictEqual(Array.from(a), Array.from(b));
  assert.notDeepStrictEqual(Array.from(a), Array.from(c));
  for (const v of a) assert.ok(v >= 0 && v <= 1);
  const caso = G.rng(1);
  for (let i = 0; i < 1000; i++) { const v = caso(); assert.ok(v >= 0 && v < 1); }
});
