/*
 * Capitolo 7 · Hardware che si riprogramma: logica pura del laboratorio (nessun DOM).
 *
 * - PAL: matrice AND programmabile a fusibili e porta OR fissa
 *   (3 ingressi A, B, C con le loro negazioni, 4 termini prodotto);
 * - sfide della PAL e verifica automatica sulla tabella di verità;
 * - LUT: tabella di verità a 4 ingressi (16 bit) letta da un albero di multiplexer 2:1;
 * - bitstream: una piccola FPGA didattica (6 blocchi logici con LUT a 3 ingressi
 *   e 16 collegamenti programmabili) che si configura con 64 bit.
 *
 * Esportata come window.LogicaProgrammabile e, per i test con node, come module.exports.
 */
(function (root) {
  'use strict';

  /* ---------- PAL ---------- */

  const PAL_INPUTS = ['A', 'B', 'C'];
  const PAL_ROWS = 4;
  const PAL_COLS = PAL_INPUTS.length * 2;

  /**
   * Colonna della matrice AND: 0 A, 1 non A, 2 B, 3 non B, 4 C, 5 non C.
   * Restituisce { input, neg, name }.
   */
  function colInfo(c) {
    return { input: c >> 1, neg: (c & 1) === 1, name: PAL_INPUTS[c >> 1] };
  }

  /** PAL vergine: tutti i fusibili intatti (true = intatto, cioè collegato). */
  function blankPal(rows, cols) {
    const R = rows || PAL_ROWS;
    const C = cols || PAL_COLS;
    const out = [];
    for (let r = 0; r < R; r++) {
      const row = [];
      for (let c = 0; c < C; c++) row.push(true);
      out.push(row);
    }
    return out;
  }

  function clonePal(fuses) {
    return fuses.map((row) => row.slice());
  }

  /** Valore portato dalla colonna c con gli ingressi dati (array di 0/1). */
  function literal(c, inputs) {
    const v = inputs[c >> 1] ? 1 : 0;
    return (c & 1) ? 1 - v : v;
  }

  /** Termine prodotto: AND di tutte le colonne con il fusibile intatto (riga senza fusibili = 1). */
  function productValue(row, inputs) {
    for (let c = 0; c < row.length; c++) {
      if (row[c] && !literal(c, inputs)) return 0;
    }
    return 1;
  }

  /** Valuta la PAL: { products: [0/1 per riga], out: OR dei prodotti }. */
  function palEval(fuses, inputs) {
    const products = fuses.map((row) => productValue(row, inputs));
    return { products: products, out: products.some((p) => p === 1) ? 1 : 0 };
  }

  /**
   * Ingressi della combinazione i letta come numero binario, primo ingresso più significativo:
   * comboInputs(6, 3) → [1, 1, 0] (A=1, B=1, C=0).
   */
  function comboInputs(i, n) {
    const N = n || PAL_INPUTS.length;
    const out = [];
    for (let k = 0; k < N; k++) out.push((i >> (N - 1 - k)) & 1);
    return out;
  }

  /** Indice della combinazione (inverso di comboInputs). */
  function comboIndex(inputs) {
    let i = 0;
    for (let k = 0; k < inputs.length; k++) i = (i << 1) | (inputs[k] ? 1 : 0);
    return i;
  }

  /** Tabella di verità della PAL: array di 2^n uscite nell'ordine di comboInputs. */
  function palTable(fuses) {
    const n = fuses[0].length / 2;
    const out = [];
    for (let i = 0; i < (1 << n); i++) out.push(palEval(fuses, comboInputs(i, n)).out);
    return out;
  }

  /**
   * Descrive una riga: { kind: 'zero' | 'one' | 'product', literals: [{ name, neg }], conflict }.
   * 'zero': c'è un ingresso collegato insieme alla sua negazione (A·Ā = 0, come in una riga vergine);
   * 'one': tutti i fusibili bruciati (prodotto vuoto = 1).
   */
  function termInfo(row) {
    const literals = [];
    for (let i = 0; i < row.length / 2; i++) {
      const t = row[2 * i];
      const f = row[2 * i + 1];
      if (t && f) return { kind: 'zero', literals: [], conflict: PAL_INPUTS[i] };
      if (t) literals.push({ name: PAL_INPUTS[i], neg: false });
      if (f) literals.push({ name: PAL_INPUTS[i], neg: true });
    }
    if (!literals.length) return { kind: 'one', literals: [], conflict: null };
    return { kind: 'product', literals: literals, conflict: null };
  }

  /** Equazione nello stile di PALASM: "/" è NON, "*" è AND, "+" è OR. */
  function palasm(fuses, outName) {
    const name = outName || 'USCITA';
    const terms = [];
    for (const row of fuses) {
      const t = termInfo(row);
      if (t.kind === 'one') return name + ' = 1';
      if (t.kind === 'product') terms.push(t.literals.map((l) => (l.neg ? '/' : '') + l.name).join(' * '));
    }
    return name + ' = ' + (terms.length ? terms.join(' + ') : '0');
  }

  /**
   * Costruisce una PAL da termini scritti come in PALASM, una riga per termine:
   * palFromTerms(['A * /B', '/A * B']). Le righe in più restano vergini (valgono 0).
   */
  function palFromTerms(terms, rows) {
    const fuses = blankPal(rows || PAL_ROWS);
    terms.forEach((term, r) => {
      if (r >= fuses.length) throw new Error('Troppi termini per ' + fuses.length + ' righe');
      for (let c = 0; c < fuses[r].length; c++) fuses[r][c] = false;
      const parts = String(term).split('*').map((p) => p.trim()).filter(Boolean);
      for (const p of parts) {
        const neg = p.charAt(0) === '/';
        const nm = neg ? p.slice(1).trim() : p;
        const i = PAL_INPUTS.indexOf(nm.toUpperCase());
        if (i < 0) throw new Error('Ingresso sconosciuto: ' + p);
        fuses[r][2 * i + (neg ? 1 : 0)] = true;
      }
    });
    return fuses;
  }

  /** Quanti fusibili sono bruciati. */
  function burntCount(fuses) {
    let n = 0;
    for (const row of fuses) for (const f of row) if (!f) n++;
    return n;
  }

  // Le sfide del laboratorio. fn riceve gli ingressi (0/1) e restituisce l'uscita voluta;
  // rows è il numero minimo di termini prodotto che servono.
  const challenges = [
    { id: 'allarme', rows: 1, fn: (a, b) => a & b },
    { id: 'xor', rows: 2, fn: (a, b) => a ^ b },
    { id: 'maggioranza', rows: 3, fn: (a, b, c) => (a + b + c >= 2 ? 1 : 0) },
    { id: 'parita', rows: 4, fn: (a, b, c) => a ^ b ^ c },
  ];

  /** Tabella di verità di una funzione di n ingressi, nello stesso ordine di palTable. */
  function fnTable(fn, n) {
    const N = n || PAL_INPUTS.length;
    const out = [];
    for (let i = 0; i < (1 << N); i++) out.push(fn.apply(null, comboInputs(i, N)) ? 1 : 0);
    return out;
  }

  function findChallenge(ch) {
    if (typeof ch === 'string') {
      const found = challenges.find((c) => c.id === ch);
      if (!found) throw new Error('Sfida sconosciuta: ' + ch);
      return found;
    }
    return ch;
  }

  /** Verifica una sfida: { ok, got, want, mismatches: [indici delle combinazioni sbagliate], right }. */
  function checkPal(fuses, challenge) {
    const ch = findChallenge(challenge);
    const got = palTable(fuses);
    const want = fnTable(ch.fn, PAL_INPUTS.length);
    const mismatches = [];
    for (let i = 0; i < want.length; i++) if (got[i] !== want[i]) mismatches.push(i);
    return { ok: mismatches.length === 0, got: got, want: want, mismatches: mismatches, right: want.length - mismatches.length };
  }

  /** Soluzione di riferimento con i mintermini (un termine per ogni 1 della tabella). */
  function mintermSolution(fn, rows) {
    const terms = [];
    fnTable(fn, PAL_INPUTS.length).forEach((v, i) => {
      if (!v) return;
      const ins = comboInputs(i, PAL_INPUTS.length);
      terms.push(ins.map((x, k) => (x ? '' : '/') + PAL_INPUTS[k]).join(' * '));
    });
    return palFromTerms(terms, rows);
  }

  /* ---------- LUT a 4 ingressi ---------- */

  const LUT_INPUTS = ['A', 'B', 'C', 'D'];
  const LUT_SIZE = 16;

  /** Indirizzo della LUT: D C B A letti come numero binario (A è il bit meno significativo). */
  function lutIndex(inputs) {
    return (inputs[0] ? 1 : 0) | (inputs[1] ? 2 : 0) | (inputs[2] ? 4 : 0) | (inputs[3] ? 8 : 0);
  }

  /** Ingressi [A, B, C, D] dell'indirizzo i. */
  function lutInputs(i) {
    return [i & 1, (i >> 1) & 1, (i >> 2) & 1, (i >> 3) & 1];
  }

  function lutRead(bits, inputs) {
    return bits[lutIndex(inputs)] ? 1 : 0;
  }

  /** Riempie i 16 bit con una funzione fn(a, b, c, d). */
  function lutFromFn(fn) {
    const out = [];
    for (let i = 0; i < LUT_SIZE; i++) {
      const x = lutInputs(i);
      out.push(fn(x[0], x[1], x[2], x[3]) ? 1 : 0);
    }
    return out;
  }

  const lutPresets = {
    and: lutFromFn((a, b, c, d) => a & b & c & d),
    or: lutFromFn((a, b, c, d) => a | b | c | d),
    xor: lutFromFn((a, b, c, d) => a ^ b ^ c ^ d),
    maggioranza: lutFromFn((a, b, c, d) => (a + b + c + d >= 3 ? 1 : 0)),
  };

  /** Nome del preset uguale ai bit dati, oppure null. */
  function lutPresetName(bits) {
    for (const k in lutPresets) if (sameBits(lutPresets[k], bits)) return k;
    return null;
  }

  function sameBits(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if ((a[i] ? 1 : 0) !== (b[i] ? 1 : 0)) return false;
    return true;
  }

  /**
   * Percorso del bit nell'albero di multiplexer: per ogni livello (1 = selezione A … 4 = selezione D)
   * quale multiplexer attraversa e da quale lato entra (0 = ingresso pari, 1 = dispari).
   */
  function lutPath(index) {
    const path = [];
    for (let level = 1; level <= 4; level++) {
      path.push({ level: level, mux: index >> level, side: (index >> (level - 1)) & 1 });
    }
    return path;
  }

  /**
   * Uscite di tutti i multiplexer: levels[0] sono i 16 bit, levels[1] gli 8 mux scelti da A, …,
   * levels[4][0] è l'uscita della LUT.
   */
  function muxLevels(bits, inputs) {
    let cur = bits.map((b) => (b ? 1 : 0));
    const levels = [cur];
    for (let l = 0; l < 4; l++) {
      const sel = inputs[l] ? 1 : 0;
      const next = [];
      for (let k = 0; k < cur.length / 2; k++) next.push(cur[2 * k + sel]);
      levels.push(next);
      cur = next;
    }
    return levels;
  }

  // Sfide della LUT: le stesse idee della PAL scritte come tabella.
  const lutTargets = [
    { id: 'chiavi', fn: (a, b) => a & b },
    { id: 'maggioranza3', fn: (a, b, c) => (a + b + c >= 2 ? 1 : 0) },
    { id: 'parita4', fn: (a, b, c, d) => a ^ b ^ c ^ d },
  ];

  function checkLut(bits, target) {
    const t = typeof target === 'string' ? lutTargets.find((x) => x.id === target) : target;
    if (!t) throw new Error('Obiettivo LUT sconosciuto: ' + target);
    const want = lutFromFn(t.fn);
    const mismatches = [];
    for (let i = 0; i < LUT_SIZE; i++) if ((bits[i] ? 1 : 0) !== want[i]) mismatches.push(i);
    return { ok: mismatches.length === 0, want: want, mismatches: mismatches, right: LUT_SIZE - mismatches.length };
  }

  /** Copia la funzione della PAL (A, B, C) nella LUT: D non conta, la tabella si ripete due volte. */
  function palToLut(fuses) {
    return lutFromFn((a, b, c) => palEval(fuses, [a, b, c]).out);
  }

  /* ---------- bitstream: una FPGA didattica ---------- */

  // 6 blocchi logici (CLB) in 2 righe e 3 colonne: indice = riga * 3 + colonna.
  // Ogni CLB ha una LUT a 3 ingressi (8 bit, indice = i0 + 2·i1 + 4·i2) e un'uscita.
  // links: i collegamenti programmabili, uno per bit; from è un piedino d'ingresso (A, B, C)
  // o l'uscita di un blocco ('clbN'), to è un ingresso di blocco ('clbN.k') o un'uscita (O1, O2).
  const FABRIC = {
    clbs: 6,
    cols: 3,
    rows: 2,
    lutBits: 8,
    inputs: ['A', 'B', 'C'],
    outputs: ['O1', 'O2'],
    links: [
      { from: 'A', to: 'clb0.0' },     // 0
      { from: 'B', to: 'clb0.1' },     // 1
      { from: 'C', to: 'clb0.2' },     // 2
      { from: 'A', to: 'clb3.0' },     // 3
      { from: 'B', to: 'clb3.1' },     // 4
      { from: 'C', to: 'clb3.2' },     // 5
      { from: 'clb0', to: 'O1' },      // 6
      { from: 'clb3', to: 'O2' },      // 7
      { from: 'A', to: 'clb1.0' },     // 8
      { from: 'B', to: 'clb1.1' },     // 9
      { from: 'C', to: 'clb2.1' },     // 10
      { from: 'clb1', to: 'clb2.0' },  // 11
      { from: 'clb2', to: 'O1' },      // 12
      { from: 'B', to: 'clb4.0' },     // 13
      { from: 'clb4', to: 'O2' },      // 14
      { from: 'C', to: 'clb5.0' },     // 15: c'è nel tessuto, nessun progetto lo usa
    ],
  };
  const BITSTREAM_LENGTH = FABRIC.clbs * FABRIC.lutBits + FABRIC.links.length;

  function lut3(fn) {
    const out = [];
    for (let i = 0; i < 8; i++) out.push(fn(i & 1, (i >> 1) & 1, (i >> 2) & 1) ? 1 : 0);
    return out;
  }

  const LUT3 = {
    xor3: lut3((a, b, c) => a ^ b ^ c),
    maj3: lut3((a, b, c) => (a + b + c >= 2 ? 1 : 0)),
    and2: lut3((a, b) => a & b),
    or2: lut3((a, b) => a | b),
    not1: lut3((a) => 1 - a),
  };

  function lut3Name(bits) {
    for (const k in LUT3) if (sameBits(LUT3[k], bits)) return k;
    return bits.some((b) => b) ? 'custom' : null;
  }

  // Due progetti per lo stesso chip.
  const designs = {
    sommatore: { luts: { 0: 'xor3', 3: 'maj3' }, links: [0, 1, 2, 3, 4, 5, 6, 7] },
    allarme: { luts: { 1: 'and2', 2: 'or2', 4: 'not1' }, links: [8, 9, 10, 11, 12, 13, 14] },
  };

  /** Bitstream di un progetto: 8 bit per ogni CLB (in ordine), poi un bit per collegamento. */
  function buildBitstream(design) {
    const d = typeof design === 'string' ? designs[design] : design;
    if (!d) throw new Error('Progetto sconosciuto: ' + design);
    const bits = [];
    for (let k = 0; k < FABRIC.clbs; k++) {
      const name = d.luts[k];
      const lut = name ? LUT3[name] : null;
      for (let b = 0; b < FABRIC.lutBits; b++) bits.push(lut ? lut[b] : 0);
    }
    for (let i = 0; i < FABRIC.links.length; i++) bits.push(d.links.indexOf(i) >= 0 ? 1 : 0);
    return bits;
  }

  /** Che cosa configura il bit i: { kind: 'lut', clb, bit } oppure { kind: 'link', link }. */
  function bitTarget(i) {
    const lutTotal = FABRIC.clbs * FABRIC.lutBits;
    if (i < lutTotal) return { kind: 'lut', clb: Math.floor(i / FABRIC.lutBits), bit: i % FABRIC.lutBits };
    return { kind: 'link', link: i - lutTotal };
  }

  /**
   * Legge un bitstream (anche parziale: i bit null o mancanti valgono 0).
   * Restituisce { luts: [[8 bit] × 6], links: [bool × 16] }.
   */
  function parseBitstream(bits) {
    const luts = [];
    for (let k = 0; k < FABRIC.clbs; k++) {
      const lut = [];
      for (let b = 0; b < FABRIC.lutBits; b++) lut.push(bits && bits[k * FABRIC.lutBits + b] ? 1 : 0);
      luts.push(lut);
    }
    const base = FABRIC.clbs * FABRIC.lutBits;
    const links = FABRIC.links.map((_, i) => !!(bits && bits[base + i]));
    return { luts: luts, links: links };
  }

  /** Nome del progetto che corrisponde alla configurazione, oppure null. */
  function identifyDesign(config) {
    for (const name in designs) {
      const ref = parseBitstream(buildBitstream(name));
      let same = true;
      for (let k = 0; k < FABRIC.clbs && same; k++) same = sameBits(ref.luts[k], config.luts[k]);
      for (let i = 0; i < FABRIC.links.length && same; i++) same = ref.links[i] === config.links[i];
      if (same) return name;
    }
    return null;
  }

  /**
   * Simula la FPGA configurata. inputs: { A, B, C } (0/1).
   * Restituisce { clbIn: [[i0,i1,i2] × 6], clbOut: [6 valori], used: [bool × 6],
   *               links: [valore portato da ogni collegamento], outputs: { O1, O2 } (null se nessuno li pilota) }.
   */
  function simulate(config, inputs) {
    const ins = inputs || {};
    const clbOut = new Array(FABRIC.clbs).fill(0);
    let clbIn = [];
    function value(src) {
      if (src.slice(0, 3) === 'clb') return clbOut[+src.slice(3)];
      return ins[src] ? 1 : 0;
    }
    // Niente anelli nei progetti: bastano tante passate quanti sono i blocchi.
    for (let pass = 0; pass <= FABRIC.clbs; pass++) {
      clbIn = [];
      for (let k = 0; k < FABRIC.clbs; k++) clbIn.push([0, 0, 0]);
      FABRIC.links.forEach((lk, i) => {
        if (!config.links[i]) return;
        const m = /^clb(\d+)\.(\d)$/.exec(lk.to);
        if (m) clbIn[+m[1]][+m[2]] = value(lk.from);
      });
      for (let k = 0; k < FABRIC.clbs; k++) {
        const x = clbIn[k];
        clbOut[k] = config.luts[k][x[0] + 2 * x[1] + 4 * x[2]] ? 1 : 0;
      }
    }
    const outputs = {};
    FABRIC.outputs.forEach((o) => { outputs[o] = null; });
    const used = new Array(FABRIC.clbs).fill(false);
    FABRIC.links.forEach((lk, i) => {
      if (!config.links[i]) return;
      if (outputs.hasOwnProperty(lk.to)) outputs[lk.to] = value(lk.from);
      const a = /^clb(\d+)/.exec(lk.from);
      const b = /^clb(\d+)/.exec(lk.to);
      if (a) used[+a[1]] = true;
      if (b) used[+b[1]] = true;
    });
    for (let k = 0; k < FABRIC.clbs; k++) if (config.luts[k].some((v) => v)) used[k] = true;
    const links = FABRIC.links.map((lk) => value(lk.from));
    return { clbIn: clbIn, clbOut: clbOut.slice(), used: used, links: links, outputs: outputs };
  }

  const api = {
    // PAL
    PAL_INPUTS: PAL_INPUTS,
    PAL_ROWS: PAL_ROWS,
    PAL_COLS: PAL_COLS,
    colInfo: colInfo,
    blankPal: blankPal,
    clonePal: clonePal,
    literal: literal,
    productValue: productValue,
    palEval: palEval,
    comboInputs: comboInputs,
    comboIndex: comboIndex,
    palTable: palTable,
    termInfo: termInfo,
    palasm: palasm,
    palFromTerms: palFromTerms,
    burntCount: burntCount,
    challenges: challenges,
    fnTable: fnTable,
    checkPal: checkPal,
    mintermSolution: mintermSolution,
    // LUT
    LUT_INPUTS: LUT_INPUTS,
    LUT_SIZE: LUT_SIZE,
    lutIndex: lutIndex,
    lutInputs: lutInputs,
    lutRead: lutRead,
    lutFromFn: lutFromFn,
    lutPresets: lutPresets,
    lutPresetName: lutPresetName,
    sameBits: sameBits,
    lutPath: lutPath,
    muxLevels: muxLevels,
    lutTargets: lutTargets,
    checkLut: checkLut,
    palToLut: palToLut,
    // bitstream
    FABRIC: FABRIC,
    BITSTREAM_LENGTH: BITSTREAM_LENGTH,
    LUT3: LUT3,
    lut3Name: lut3Name,
    designs: designs,
    buildBitstream: buildBitstream,
    bitTarget: bitTarget,
    parseBitstream: parseBitstream,
    identifyDesign: identifyDesign,
    simulate: simulate,
  };

  root.LogicaProgrammabile = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
