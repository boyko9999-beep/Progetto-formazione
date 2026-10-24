/*
 * Capitolo 8 · Verso i 16 bit e oltre: logica pura del laboratorio «Da 4 a 32 bit» (senza DOM).
 *
 * - CHIPS: i chip della sezione con anno, produttore, larghezza dei registri e numero di transistor
 *   (valori come li riportano produttori, musei e analisi del silicio: le note dicono dove le fonti divergono);
 * - scale del grafico (anni in orizzontale, transistor su scala logaritmica);
 * - bus: in quanti passaggi una CPU a 4, 8, 16 o 32 bit sposta o somma un numero a 32 bit;
 * - 8086: indirizzo fisico = segmento × 16 + offset, con le colonne della somma e le sfide.
 *
 * Esportata come window.SediciBitCore (e module.exports per i test con node --test).
 */
(function (root) {
  'use strict';

  /* ---------- dati del grafico ---------- */

  const MAKERS = [
    { id: 'intel', name: 'Intel' },
    { id: 'motorola', name: 'Motorola' },
    { id: 'zilog', name: 'Zilog' },
    { id: 'mos', name: 'MOS', full: 'MOS Technology' },
    { id: 'acorn', name: 'Acorn' },
    { id: 'univ', name: 'Università', full: 'Università (Berkeley, Stanford)' },
  ];

  // bits: larghezza dei registri; bus: larghezza del bus dati esterno (null se non la indichiamo).
  const CHIPS = [
    { id: '4004', name: 'Intel 4004', short: '4004', maker: 'intel', year: 1971, bits: 4, bus: 4, transistors: 2300,
      note: 'Il primo microprocessore in commercio, pensato per le calcolatrici.', chapter: 'intel-4004' },
    { id: '8008', name: 'Intel 8008', short: '8008', maker: 'intel', year: 1972, bits: 8, bus: 8, transistors: 3500,
      note: 'Il primo processore a 8 bit di Intel.', chapter: 'otto-bit' },
    { id: '8080', name: 'Intel 8080', short: '8080', maker: 'intel', year: 1974, bits: 8, bus: 8, transistors: 6000,
      note: 'Il cuore dell\'Altair 8800. Il Computer History Museum indica 6.000 transistor, altre fonti 4.500.', chapter: 'otto-bit' },
    { id: '6800', name: 'Motorola 6800', short: '6800', maker: 'motorola', year: 1974, bits: 8, bus: 8, transistors: 4100,
      note: 'Il primo 8 bit di Motorola, con una sola alimentazione a 5 V.', chapter: 'otto-bit' },
    { id: '6502', name: 'MOS 6502', short: '6502', maker: 'mos', year: 1975, bits: 8, bus: 8, transistors: 3510,
      note: 'Venduto a 25 dollari. 3.510 sono i transistor attivi contati sul silicio; con i carichi si arriva a circa 4.500.', chapter: 'otto-bit' },
    { id: 'z80', name: 'Zilog Z80', short: 'Z80', maker: 'zilog', year: 1976, bits: 8, bus: 8, transistors: 8500,
      note: 'Di Federico Faggin e Masatoshi Shima: esegue anche i programmi dell\'8080.', chapter: 'otto-bit' },
    { id: '8086', name: 'Intel 8086', short: '8086', maker: 'intel', year: 1978, bits: 16, bus: 16, transistors: 29000,
      note: '16 bit e 1 MB di memoria con segmento:offset. La cifra conta anche le caselle vuote delle tabelle interne: i transistor presenti sono circa 20.000.', chapter: 'sedici-bit' },
    { id: '8088', name: 'Intel 8088', short: '8088', maker: 'intel', year: 1979, bits: 16, bus: 8, transistors: 29000,
      note: 'Un 8086 con il bus dati esterno a 8 bit: IBM lo sceglie per il suo PC.', chapter: 'sedici-bit' },
    { id: 'z8000', name: 'Zilog Z8000', short: 'Z8000', maker: 'zilog', year: 1979, bits: 16, bus: 16, transistors: 17500,
      note: 'La risposta di Zilog ai 16 bit: non eseguiva i programmi dello Z80 e vendette poco.', chapter: 'sedici-bit' },
    { id: '68000', name: 'Motorola 68000', short: '68000', maker: 'motorola', year: 1979, bits: 32, bus: 16, transistors: 68000,
      note: 'Registri a 32 bit, bus dati a 16 e indirizzi a 24 bit: 16 MB di memoria senza segmenti.', chapter: 'sedici-bit' },
    { id: 'risc1', name: 'Berkeley RISC-I', short: 'RISC-I', maker: 'univ', year: 1982, bits: 32, bus: null, transistors: 44420,
      note: 'Il prototipo dell\'Università di Berkeley che ha dato il nome all\'idea RISC.', chapter: 'sedici-bit' },
    { id: 'mips', name: 'Stanford MIPS', short: 'MIPS', maker: 'univ', year: 1983, bits: 32, bus: null, transistors: 25000,
      note: 'Il prototipo RISC dell\'Università di Stanford, nel gruppo di John Hennessy.', chapter: 'sedici-bit' },
    { id: 'arm1', name: 'Acorn ARM1', short: 'ARM1', maker: 'acorn', year: 1985, bits: 32, bus: 32, transistors: 25000,
      note: '32 bit con meno transistor dell\'8086 (24.800 secondo alcune fonti): funzionò al primo tentativo.', chapter: 'sedici-bit' },
  ];

  const WIDTHS = [4, 8, 16, 32];

  function chip(id) { return CHIPS.find((c) => c.id === id) || null; }
  function maker(id) { return MAKERS.find((m) => m.id === id) || null; }
  /** Chip di un produttore ('all' = tutti), in ordine di tempo. */
  function chipsBy(makerId) {
    return CHIPS.filter((c) => !makerId || makerId === 'all' || c.maker === makerId);
  }

  /* ---------- scale del grafico ---------- */

  /** Funzione lineare dal dominio [d0, d1] all'intervallo [r0, r1]. */
  function linear(d0, d1, r0, r1) {
    const k = (r1 - r0) / (d1 - d0);
    return (v) => r0 + (v - d0) * k;
  }

  /** Scala logaritmica in base 10: v in [d0, d1] (positivi) → [r0, r1]. */
  function log10Scale(d0, d1, r0, r1) {
    const a = Math.log10(d0);
    const f = linear(a, Math.log10(d1), r0, r1);
    return (v) => f(Math.log10(Math.max(v, 1e-9)));
  }

  /** Tacche di una scala logaritmica: potenze di 10 (major) e multipli 2, 3, 5 (minor). */
  function logTicks(min, max) {
    const major = [];
    const minor = [];
    for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) {
      const p = Math.pow(10, e);
      if (p >= min && p <= max) major.push(p);
      [2, 3, 5].forEach((m) => { const v = m * p; if (v > min && v < max) minor.push(v); });
    }
    return { major: major, minor: minor };
  }

  /** Quante volte il secondo chip ha più transistor del primo (arrotondato a una cifra decimale). */
  function ratio(idA, idB) {
    const a = chip(idA);
    const b = chip(idB);
    if (!a || !b) return null;
    return Math.round((b.transistors / a.transistors) * 10) / 10;
  }

  /* ---------- bus: passaggi per un numero a N bit ---------- */

  function checkWidth(width) {
    if (!WIDTHS.includes(width)) throw new RangeError('Larghezza non prevista: ' + width);
  }

  /** Passaggi necessari per trattare totalBits bit con una CPU (o un bus) larga width bit. */
  function passes(totalBits, width) {
    if (!(width > 0)) throw new RangeError('Larghezza non valida');
    return Math.ceil(totalBits / width);
  }

  const pow2 = (n) => Math.pow(2, n);
  /** Resto positivo di v modulo 2^bits, senza problemi di segno (valori fino a 2^53). */
  function mod2(v, bits) { const m = pow2(bits); return ((v % m) + m) % m; }

  /** Divide value (totalBits bit) in pezzi da width bit, dal meno significativo. */
  function split(value, width, totalBits) {
    totalBits = totalBits || 32;
    checkWidth(width);
    const v = mod2(value, totalBits);
    const n = passes(totalBits, width);
    const out = [];
    for (let i = 0; i < n; i++) {
      const shift = i * width;
      out.push({ index: i, shift: shift, width: width, value: Math.floor(v / pow2(shift)) % pow2(width) });
    }
    return out;
  }

  /** Copia di value (memoria → registro) a pezzi: dopo ogni passaggio il registro contiene i pezzi arrivati. */
  function copySteps(value, width, totalBits) {
    totalBits = totalBits || 32;
    let reg = 0;
    const steps = split(value, width, totalBits).map((c) => {
      reg += c.value * pow2(c.shift);
      return { index: c.index, shift: c.shift, width: width, value: c.value, register: reg };
    });
    return { steps: steps, result: reg, passes: steps.length };
  }

  /**
   * Somma a + b a pezzi da width bit, con il riporto che passa da un pezzo al successivo
   * (come le istruzioni «somma con riporto» delle CPU a 8 bit).
   */
  function addSteps(a, b, width, totalBits) {
    totalBits = totalBits || 32;
    const A = split(a, width, totalBits);
    const B = split(b, width, totalBits);
    const base = pow2(width);
    let carry = 0;
    let reg = 0;
    const steps = A.map((ca, i) => {
      const cb = B[i];
      const raw = ca.value + cb.value + carry;
      const sum = raw % base;
      const step = { index: i, shift: ca.shift, width: width, a: ca.value, b: cb.value, carryIn: carry, raw: raw, sum: sum, carryOut: raw >= base ? 1 : 0 };
      carry = step.carryOut;
      reg += sum * pow2(ca.shift);
      step.register = reg;
      return step;
    });
    return { steps: steps, result: reg, carry: carry, passes: steps.length };
  }

  /* ---------- 8086: segmento e offset ---------- */

  const ADDR_BITS = 20;
  const ADDR_MAX = pow2(ADDR_BITS) - 1; // 0xFFFFF
  const SEG_MAX = 0xFFFF;

  /** Converte un testo esadecimale ("1A2b", "0x1A2B", "1A2Bh") in numero; null se non valido o troppo lungo. */
  function parseHex(text, maxDigits) {
    if (text == null) return null;
    let t = String(text).trim().replace(/\s+/g, '');
    if (/^0x/i.test(t)) t = t.slice(2);
    if (/h$/i.test(t)) t = t.slice(0, -1);
    if (!t || !/^[0-9a-f]+$/i.test(t)) return null;
    t = t.replace(/^0+(?=.)/, '');
    if (maxDigits && t.length > maxDigits) return null;
    return parseInt(t, 16);
  }

  /** Esadecimale maiuscolo con almeno digits cifre. */
  function hex(n, digits) { return Math.max(0, Math.floor(n)).toString(16).toUpperCase().padStart(digits || 1, '0'); }

  /** "1234:0010" */
  function formatSegOff(seg, off) { return hex(seg, 4) + ':' + hex(off, 4); }

  /**
   * Indirizzo fisico dell'8086: segmento × 16 + offset.
   * L'8086 ha 20 fili di indirizzo: oltre FFFFF il riporto si perde e si riparte da 00000.
   */
  function physical(seg, off) {
    if (!(seg >= 0 && seg <= SEG_MAX && off >= 0 && off <= SEG_MAX)) throw new RangeError('Segmento e offset vanno da 0000 a FFFF');
    const shifted = seg * 16;
    const sum = shifted + off;
    return { seg: seg, off: off, shifted: shifted, sum: sum, address: sum & ADDR_MAX, wrapped: sum > ADDR_MAX };
  }

  /** Finestra di 64 KB che si apre a partire dal segmento: [inizio, fine] (la fine può superare FFFFF). */
  function segmentWindow(seg) {
    const start = seg * 16;
    return { start: start, end: start + 0xFFFF, wraps: start + 0xFFFF > ADDR_MAX };
  }

  /**
   * Colonne della somma esadecimale x + y su digits cifre, da destra (pos 0 = cifra delle unità).
   * Ogni colonna: { pos, a, b, carryIn, digit, carryOut }. carry = riporto oltre l'ultima colonna.
   */
  function addColumns(x, y, digits) {
    digits = digits || 5;
    const cols = [];
    let carry = 0;
    for (let pos = 0; pos < digits; pos++) {
      const a = Math.floor(x / pow2(4 * pos)) % 16;
      const b = Math.floor(y / pow2(4 * pos)) % 16;
      const raw = a + b + carry;
      cols.push({ pos: pos, a: a, b: b, carryIn: carry, digit: raw % 16, carryOut: raw >= 16 ? 1 : 0 });
      carry = raw >= 16 ? 1 : 0;
    }
    return { cols: cols, carry: carry };
  }

  /** Quante coppie segmento:offset puntano allo stesso indirizzo fisico (senza contare il giro oltre 1 MB). */
  function aliases(address) {
    // segmento s valido se 0 <= address - 16·s <= FFFF
    const sMax = Math.min(SEG_MAX, Math.floor(address / 16));
    const sMin = Math.max(0, Math.ceil((address - 0xFFFF) / 16));
    return Math.max(0, sMax - sMin + 1);
  }

  /** Somma cifra per cifra senza riporti (per riconoscere l'errore «ho dimenticato il riporto»). */
  function sumWithoutCarry(x, y, digits) {
    let out = 0;
    for (let pos = 0; pos < digits; pos++) {
      const a = Math.floor(x / pow2(4 * pos)) % 16;
      const b = Math.floor(y / pow2(4 * pos)) % 16;
      out += ((a + b) % 16) * pow2(4 * pos);
    }
    return out;
  }

  /**
   * Controlla la risposta a una sfida. reason:
   *  'ok' | 'empty' | 'invalid' | 'no-shift' (segmento non moltiplicato per 16) |
   *  'shift-offset' (moltiplicato l'offset invece del segmento) | 'carry' (riporto dimenticato) |
   *  'wrap' (risposta oltre FFFFF) | 'wrong'
   */
  function checkAnswer(text, seg, off) {
    const p = physical(seg, off);
    if (text == null || String(text).trim() === '') return { ok: false, reason: 'empty', expected: p.address };
    const v = parseHex(text, 6);
    if (v == null) return { ok: false, reason: 'invalid', expected: p.address };
    if (v === p.address) return { ok: true, reason: 'ok', value: v, expected: p.address };
    let reason = 'wrong';
    if (v > ADDR_MAX) reason = 'wrap';
    else if (v === seg + off) reason = 'no-shift';
    else if (v === ((off * 16 + seg) & ADDR_MAX)) reason = 'shift-offset';
    else if (v === sumWithoutCarry(p.shifted, off, 5)) reason = 'carry';
    return { ok: false, reason: reason, value: v, expected: p.address };
  }

  // Sfide in ordine di difficoltà: niente riporti, poi riporti, poi cifre ovunque.
  const CHALLENGES = [
    [0x2000, 0x0345],
    [0x3A00, 0x0BCD],
    [0x0FF0, 0x0100],
    [0x1A2B, 0x3C4D],
    [0xABCD, 0xEF01],
  ];

  /** i-esima sfida (ciclica): { seg, off, text, answer }. */
  function challenge(i) {
    const n = CHALLENGES.length;
    const [seg, off] = CHALLENGES[((i % n) + n) % n];
    return { index: ((i % n) + n) % n, seg: seg, off: off, text: formatSegOff(seg, off), answer: physical(seg, off).address };
  }

  // Esempi pronti del calcolatore.
  const PRESETS = [
    { id: 'esempio', seg: 0x1234, off: 0x0010, label: '1234:0010', title: 'Un esempio qualsiasi' },
    { id: 'alias', seg: 0x1235, off: 0x0000, label: '1235:0000', title: 'Un altro nome per lo stesso byte' },
    { id: 'avvio', seg: 0xFFFF, off: 0x0000, label: 'FFFF:0000', title: 'Dove riparte l\'8086 dopo il reset' },
    { id: 'giro', seg: 0xFFFF, off: 0x0010, label: 'FFFF:0010', title: 'Oltre 1 MB: si riparte da zero' },
  ];

  /** Bit di n (bits cifre binarie), dal più significativo. */
  function bitsOf(n, bits) {
    const out = [];
    for (let i = bits - 1; i >= 0; i--) out.push(Math.floor(n / pow2(i)) % 2);
    return out;
  }

  /**
   * Numero all'italiana con il punto delle migliaia anche a 4 cifre (2.300, 29.000, 1,5).
   * Intl con 'it-IT' scrive 2300 ma 29.000: su un asse o in una tabella i due stili insieme confondono.
   */
  function num(n, digits) {
    const d = digits == null ? 0 : digits;
    const parts = Math.abs(n).toFixed(d).split('.');
    const int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (n < 0 ? '−' : '') + int + (parts[1] ? ',' + parts[1] : '');
  }

  const api = {
    MAKERS: MAKERS,
    CHIPS: CHIPS,
    WIDTHS: WIDTHS,
    chip: chip,
    maker: maker,
    chipsBy: chipsBy,
    linear: linear,
    log10Scale: log10Scale,
    logTicks: logTicks,
    ratio: ratio,
    passes: passes,
    split: split,
    copySteps: copySteps,
    addSteps: addSteps,
    ADDR_BITS: ADDR_BITS,
    ADDR_MAX: ADDR_MAX,
    parseHex: parseHex,
    hex: hex,
    formatSegOff: formatSegOff,
    physical: physical,
    segmentWindow: segmentWindow,
    addColumns: addColumns,
    aliases: aliases,
    checkAnswer: checkAnswer,
    CHALLENGES: CHALLENGES,
    challenge: challenge,
    PRESETS: PRESETS,
    bitsOf: bitsOf,
    num: num,
  };

  root.SediciBitCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
