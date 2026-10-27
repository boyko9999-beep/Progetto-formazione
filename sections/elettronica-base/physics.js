/*
 * Fisica dei laboratori di Elettronica base: funzioni pure, senza DOM,
 * usate dalle animazioni e verificate dai test (tests/elettronica-base.test.js).
 * Unità SI ovunque: volt, ampere, ohm, watt, farad, secondi, metri.
 */
(function (root) {
  'use strict';

  const K_COULOMB = 8.9875517923e9; // N·m²/C²
  const CARICA_ELEMENTARE = 1.602176634e-19; // C
  const EPS0 = 8.8541878128e-12; // F/m
  const ELETTRONI_RAME = 8.49e28; // elettroni liberi per m³ nel rame

  /* ---------- formattazione all'italiana ---------- */

  const PREFISSI = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
  const NBSP = ' ';

  // Le migliaia si separano con uno spazio indivisibile (12 000), come vuole il SI.
  function migliaia(testo) {
    return testo.replace(/\./g, NBSP);
  }

  function numero(v, decimali) {
    const d = decimali == null ? 2 : decimali;
    return migliaia(Number(v).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }));
  }

  // formatta(0.12, 'A') → "120 mA"; formatta(4700, 'Ω') → "4,7 kΩ".
  function formatta(v, unita, opzioni) {
    const o = opzioni || {};
    const cifre = o.cifre || 3;
    const u = unita ? NBSP + unita : '';
    if (Number.isNaN(v)) return '–' + u;
    if (!Number.isFinite(v)) return (v > 0 ? '∞' : '−∞') + u;
    if (v === 0) return '0' + u;
    const r = Number(v.toPrecision(cifre));
    let scala = 1;
    let pre = '';
    if (o.prefissi !== false) {
      const a = Math.abs(r);
      const scelta = PREFISSI.find(([s]) => a >= s) || PREFISSI[PREFISSI.length - 1];
      scala = scelta[0];
      pre = scelta[1];
    }
    const n = r / scala;
    const testo = n.toLocaleString('it-IT', { maximumSignificantDigits: cifre, useGrouping: o.prefissi === false });
    return migliaia(testo).replace('-', '−') + (unita ? NBSP + pre + unita : '');
  }

  /* ---------- carica e forza di Coulomb ---------- */

  // Forza tra due cariche (C) a distanza r (m). Positiva = repulsione.
  function coulomb(q1, q2, r) {
    return K_COULOMB * q1 * q2 / (r * r);
  }

  // Campo elettrico (in unità arbitrarie, k = 1) generato da cariche puntiformi {x, y, q}.
  function campo(cariche, x, y) {
    let ex = 0;
    let ey = 0;
    for (const c of cariche) {
      const dx = x - c.x;
      const dy = y - c.y;
      const r2 = dx * dx + dy * dy;
      if (r2 < 1e-9) continue;
      const inv = c.q / (r2 * Math.sqrt(r2));
      ex += dx * inv;
      ey += dy * inv;
    }
    return { x: ex, y: ey };
  }

  /* ---------- corrente ---------- */

  // Velocità di deriva degli elettroni (m/s) in un filo di sezione area (m²).
  function velocitaDeriva(corrente, area, densita) {
    return corrente / ((densita || ELETTRONI_RAME) * CARICA_ELEMENTARE * area);
  }

  // Quanti elettroni attraversano una sezione del filo in t secondi.
  function elettroniPerSecondo(corrente) {
    return corrente / CARICA_ELEMENTARE;
  }

  /* ---------- legge di Ohm e potenza ---------- */

  function corrente(v, r) { return v / r; }
  function tensione(i, r) { return i * r; }
  function resistenza(v, i) { return v / i; }
  function potenza(v, i) { return v * i; }
  function potenzaDaCorrente(i, r) { return i * i * r; }
  function potenzaDaTensione(v, r) { return v * v / r; }
  function energiaKWh(watt, ore) { return watt * ore / 1000; }

  // Resistenza di un filo: ρ·L/A. Resistività del rame: 1,68e-8 Ω·m.
  function resistenzaFilo(resistivita, lunghezza, area) {
    return resistivita * lunghezza / area;
  }

  /* ---------- serie, parallelo, Kirchhoff ---------- */

  function serie(resistenze) {
    return resistenze.reduce((s, r) => s + r, 0);
  }

  // Le resistenze infinite (rami aperti) non contano.
  function parallelo(resistenze) {
    const g = resistenze.reduce((s, r) => s + (Number.isFinite(r) ? 1 / r : 0), 0);
    return g === 0 ? Infinity : 1 / g;
  }

  function partitore(v, r1, r2) {
    return v * r2 / (r1 + r2);
  }

  /*
   * Lampadine (resistenze) alimentate da un generatore ideale di tensione v.
   * topologia: 'serie' | 'parallelo'; presenti[i] = false se la lampadina è svitata.
   * Restituisce corrente totale, resistenza equivalente e, per ogni lampadina, I, V e P.
   */
  function risolviLampade(v, resistenze, topologia, presenti) {
    const ok = resistenze.map((r, i) => !presenti || presenti[i] !== false);
    if (topologia === 'serie') {
      const aperto = ok.some((x) => !x);
      const req = aperto ? Infinity : serie(resistenze);
      const i = aperto ? 0 : v / req;
      return {
        req: req,
        corrente: i,
        rami: resistenze.map((r, k) => {
          const vk = aperto ? (ok[k] ? 0 : v) : i * r;
          return { corrente: i, tensione: vk, potenza: ok[k] ? i * i * r : 0, accesa: ok[k] && i > 0 };
        }),
      };
    }
    const rami = resistenze.map((r, k) => {
      const ik = ok[k] ? v / r : 0;
      return { corrente: ik, tensione: v, potenza: ok[k] ? v * ik : 0, accesa: ok[k] && v > 0 };
    });
    const req = parallelo(resistenze.map((r, k) => (ok[k] ? r : Infinity)));
    return { req: req, corrente: rami.reduce((s, x) => s + x.corrente, 0), rami: rami };
  }

  /* ---------- condensatore ---------- */

  // Condensatore a piatti piani: C = ε0·εr·A/d.
  function capacitaPiatti(area, distanza, epsR) {
    return EPS0 * (epsR || 1) * area / distanza;
  }
  function caricaCondensatore(c, v) { return c * v; }
  function energiaCondensatore(c, v) { return 0.5 * c * v * v; }
  function scaricaRC(v0, r, c, t) { return v0 * Math.exp(-t / (r * c)); }
  function caricaRC(v0, r, c, t) { return v0 * (1 - Math.exp(-t / (r * c))); }

  /* ---------- magnetismo e induzione ---------- */

  // Flusso relativo (0–1) di un magnete in asse con una spira di raggio a, a distanza z.
  function flussoRelativo(z, a) {
    const k = z / a;
    return 1 / Math.pow(1 + k * k, 1.5);
  }

  // Forza elettromotrice indotta: −N·ΔΦ/Δt.
  function femIndotta(spire, flussoPrima, flussoDopo, dt) {
    return -spire * (flussoDopo - flussoPrima) / dt;
  }

  // Campo al centro di un solenoide lungo: B = μ0·N·I/L (tesla).
  function campoSolenoide(spire, corrente, lunghezza) {
    return 4e-7 * Math.PI * spire * corrente / lunghezza;
  }

  /* ---------- corrente alternata ---------- */

  function sinusoide(picco, frequenza, t, fase) {
    return picco * Math.sin(2 * Math.PI * frequenza * t + (fase || 0));
  }
  function efficace(picco) { return picco / Math.SQRT2; }
  function piccoDaEfficace(veff) { return veff * Math.SQRT2; }
  function trasformatore(vPrimario, spirePrimario, spireSecondario) {
    return vPrimario * spireSecondario / spirePrimario;
  }
  function correnteSecondario(iPrimario, spirePrimario, spireSecondario) {
    return iPrimario * spirePrimario / spireSecondario;
  }
  // Potenza persa sui cavi per trasportare la potenza p alla tensione v su una linea di resistenza r.
  function perditaLinea(p, v, r) {
    const i = p / v;
    return i * i * r;
  }

  /* ---------- codice colori dei resistori ---------- */

  const COLORI = [
    { nome: 'nero', hex: '#1b1b1b' },
    { nome: 'marrone', hex: '#7a4a24' },
    { nome: 'rosso', hex: '#d0312d' },
    { nome: 'arancione', hex: '#f08a24' },
    { nome: 'giallo', hex: '#f2d43d' },
    { nome: 'verde', hex: '#2f9e44' },
    { nome: 'blu', hex: '#1c64d6' },
    { nome: 'viola', hex: '#8148c6' },
    { nome: 'grigio', hex: '#8d9399' },
    { nome: 'bianco', hex: '#f4f4f0' },
  ];
  const MOLTIPLICATORI = { argento: -2, oro: -1, nero: 0, marrone: 1, rosso: 2, arancione: 3, giallo: 4, verde: 5, blu: 6, viola: 7, grigio: 8, bianco: 9 };
  // Il grigio come tolleranza resta fuori: le fonti non concordano sul suo valore.
  const TOLLERANZE = { marrone: 1, rosso: 2, verde: 0.5, blu: 0.25, viola: 0.1, oro: 5, argento: 10 };
  const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];

  function indiceColore(nome) {
    return COLORI.findIndex((c) => c.nome === nome);
  }

  // Valore in ohm da tre bande (cifra, cifra, moltiplicatore) di un resistore a 4 bande.
  function valoreDaColori(bande) {
    const a = indiceColore(bande[0]);
    const b = indiceColore(bande[1]);
    const m = MOLTIPLICATORI[bande[2]];
    if (a < 0 || b < 0 || m === undefined) return NaN;
    return Number(((a * 10 + b) * Math.pow(10, m)).toPrecision(12));
  }

  // Bande per un valore con due cifre significative (da 0,1 Ω a 99 GΩ).
  function coloriDaValore(ohm) {
    if (!(ohm > 0)) return null;
    let esp = Math.floor(Math.log10(ohm)) - 1;
    let cifre = Math.round(ohm / Math.pow(10, esp));
    if (cifre >= 100) { cifre = Math.round(cifre / 10); esp += 1; }
    if (esp < -2 || esp > 9) return null;
    const nomeMolt = Object.keys(MOLTIPLICATORI).find((k) => MOLTIPLICATORI[k] === esp);
    return [COLORI[Math.floor(cifre / 10)].nome, COLORI[cifre % 10].nome, nomeMolt];
  }

  // Il valore della serie E12 più vicino (in scala logaritmica).
  function arrotondaE12(ohm) {
    const dec = Math.floor(Math.log10(ohm)) - 1;
    let migliore = null;
    for (const d of [dec - 1, dec, dec + 1]) {
      for (const base of E12) {
        const v = Number((base * Math.pow(10, d)).toPrecision(12));
        if (!migliore || Math.abs(Math.log(v / ohm)) < Math.abs(Math.log(migliore / ohm))) migliore = v;
      }
    }
    return migliore;
  }

  const api = {
    K_COULOMB: K_COULOMB,
    CARICA_ELEMENTARE: CARICA_ELEMENTARE,
    EPS0: EPS0,
    ELETTRONI_RAME: ELETTRONI_RAME,
    RESISTIVITA_RAME: 1.68e-8,
    numero: numero,
    formatta: formatta,
    coulomb: coulomb,
    campo: campo,
    velocitaDeriva: velocitaDeriva,
    elettroniPerSecondo: elettroniPerSecondo,
    corrente: corrente,
    tensione: tensione,
    resistenza: resistenza,
    potenza: potenza,
    potenzaDaCorrente: potenzaDaCorrente,
    potenzaDaTensione: potenzaDaTensione,
    energiaKWh: energiaKWh,
    resistenzaFilo: resistenzaFilo,
    serie: serie,
    parallelo: parallelo,
    partitore: partitore,
    risolviLampade: risolviLampade,
    capacitaPiatti: capacitaPiatti,
    caricaCondensatore: caricaCondensatore,
    energiaCondensatore: energiaCondensatore,
    scaricaRC: scaricaRC,
    caricaRC: caricaRC,
    flussoRelativo: flussoRelativo,
    femIndotta: femIndotta,
    campoSolenoide: campoSolenoide,
    sinusoide: sinusoide,
    efficace: efficace,
    piccoDaEfficace: piccoDaEfficace,
    trasformatore: trasformatore,
    correnteSecondario: correnteSecondario,
    perditaLinea: perditaLinea,
    COLORI: COLORI,
    MOLTIPLICATORI: MOLTIPLICATORI,
    TOLLERANZE: TOLLERANZE,
    E12: E12,
    valoreDaColori: valoreDaColori,
    coloriDaValore: coloriDaValore,
    arrotondaE12: arrotondaE12,
  };
  root.EBFisica = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
