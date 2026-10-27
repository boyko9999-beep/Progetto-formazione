/*
 * Capitolo 4 · Dentro la CPU: logica pura della CPU didattica "CPU-8" (nessun DOM).
 *
 * Una CPU a 8 bit ispirata al SAP-1 di A. P. Malvino e alla sua versione su breadboard di Ben Eater:
 *   - 16 byte di RAM (indirizzi da 4 bit);
 *   - registri PC (4 bit), MAR (4 bit), IR (8 bit), A e B (8 bit), OUT (8 bit);
 *   - flag Z (zero) e C (riporto), aggiornati solo da ADD e SUB;
 *   - istruzioni da un byte: 4 bit di codice operativo + 4 bit di operando.
 *
 * Ogni istruzione è una "ricetta" di micro-passi, uno per ciclo di clock:
 *   T1 PC → MAR, T2 RAM → IR e PC + 1, T3 decodifica, poi da 0 a 3 passi di esecuzione.
 *
 * API (window.CicloCore nel browser, module.exports in Node):
 *   ISA, SIGNALS, MICRO, EXAMPLES
 *   decode(byte), disassemble(byte), assembleLine(testo), assemble(sorgente)
 *   create(bytes), step(stato), instruction(stato), run(stato, maxCicli), snapshot(stato)
 *   parseNumber(testo), bin(n, bit), cyclesOf(byte), sameOutputs(a, b), loadExample(id)
 */
(function (root) {
  'use strict';

  const RAM_SIZE = 16;

  /* ---------- set di istruzioni ---------- */

  // exec: micro-passi di esecuzione (dopo i tre comuni a tutte: pc>mar, ram>ir, decode)
  const ISA = [
    { op: 0x0, mn: 'NOP', arg: null, exec: [], desc: 'non fa nulla' },
    { op: 0x1, mn: 'LDA', arg: 'ind', exec: ['ir>mar', 'ram>a'], desc: 'carica in A il byte della cella ind' },
    { op: 0x2, mn: 'ADD', arg: 'ind', exec: ['ir>mar', 'ram>b', 'add'], desc: 'somma ad A il byte della cella ind; aggiorna Z e C' },
    { op: 0x3, mn: 'SUB', arg: 'ind', exec: ['ir>mar', 'ram>b', 'sub'], desc: 'toglie ad A il byte della cella ind; aggiorna Z e C' },
    { op: 0x4, mn: 'STA', arg: 'ind', exec: ['ir>mar', 'a>ram'], desc: 'scrive A nella cella ind' },
    { op: 0x5, mn: 'LDI', arg: 'val', exec: ['ir>a'], desc: 'carica in A il numero val (da 0 a 15)' },
    { op: 0x6, mn: 'JMP', arg: 'ind', exec: ['jmp'], desc: 'salta alla cella ind' },
    { op: 0x7, mn: 'JC', arg: 'ind', exec: ['jc'], desc: 'salta alla cella ind se C = 1' },
    { op: 0x8, mn: 'JZ', arg: 'ind', exec: ['jz'], desc: 'salta alla cella ind se Z = 1' },
    { op: 0xE, mn: 'OUT', arg: null, exec: ['a>out'], desc: 'copia A nel registro d\'uscita (display)' },
    { op: 0xF, mn: 'HLT', arg: null, exec: ['hlt'], desc: 'ferma il clock: fine del programma' },
  ];
  const BY_OP = Object.create(null);
  const BY_MN = Object.create(null);
  ISA.forEach((d) => { BY_OP[d.op] = d; BY_MN[d.mn] = d; });

  const FETCH = ['pc>mar', 'ram>ir', 'decode'];

  /* ---------- parola di controllo ---------- */

  // Stesse sigle della CPU su breadboard di Ben Eater; block = blocco che riceve il segnale.
  const SIGNALS = [
    { id: 'HLT', block: 'clk', desc: 'ferma il clock' },
    { id: 'MI', block: 'mar', desc: 'il MAR legge l\'indirizzo' },
    { id: 'RI', block: 'ram', desc: 'la RAM scrive il dato nella cella' },
    { id: 'RO', block: 'ram', desc: 'la RAM mette il dato sul bus' },
    { id: 'IO', block: 'ir', desc: 'l\'IR mette l\'operando sul bus' },
    { id: 'II', block: 'ir', desc: 'l\'IR legge dal bus' },
    { id: 'AI', block: 'a', desc: 'A legge dal bus' },
    { id: 'AO', block: 'a', desc: 'A mette il suo valore sul bus' },
    { id: 'EO', block: 'alu', desc: 'la ALU mette il risultato sul bus' },
    { id: 'SU', block: 'alu', desc: 'la ALU sottrae invece di sommare' },
    { id: 'BI', block: 'b', desc: 'B legge dal bus' },
    { id: 'OI', block: 'out', desc: 'il registro d\'uscita legge dal bus' },
    { id: 'CE', block: 'pc', desc: 'il PC avanza di uno' },
    { id: 'CO', block: 'pc', desc: 'il PC mette il suo valore sul bus' },
    { id: 'J', block: 'pc', desc: 'il PC carica un nuovo indirizzo' },
    { id: 'FI', block: 'flags', desc: 'il registro dei flag memorizza Z e C' },
  ];

  // Micro-passi: etichetta breve e segnali di controllo attivi.
  const MICRO = {
    'pc>mar': { label: 'PC → MAR', signals: ['CO', 'MI'] },
    'ram>ir': { label: 'RAM → IR, PC + 1', signals: ['RO', 'II', 'CE'] },
    'decode': { label: 'IR → decodificatore', signals: [] },
    'ir>mar': { label: 'IR → MAR', signals: ['IO', 'MI'] },
    'ram>a': { label: 'RAM → A', signals: ['RO', 'AI'] },
    'ram>b': { label: 'RAM → B', signals: ['RO', 'BI'] },
    'add': { label: 'A + B → A', signals: ['EO', 'AI', 'FI'] },
    'sub': { label: 'A − B → A', signals: ['EO', 'SU', 'AI', 'FI'] },
    'a>ram': { label: 'A → RAM', signals: ['AO', 'RI'] },
    'ir>a': { label: 'IR → A', signals: ['IO', 'AI'] },
    'jmp': { label: 'IR → PC', signals: ['IO', 'J'] },
    'jc': { label: 'se C = 1: IR → PC', signals: ['IO', 'J'] },
    'jz': { label: 'se Z = 1: IR → PC', signals: ['IO', 'J'] },
    'a>out': { label: 'A → OUT', signals: ['AO', 'OI'] },
    'hlt': { label: 'HLT: stop', signals: ['HLT'] },
  };

  /* ---------- numeri ---------- */

  function bin(n, bits) {
    const b = bits || 8;
    return ((n >>> 0) & ((1 << b) - 1)).toString(2).padStart(b, '0');
  }

  /** "14", "0x0E", "0b1110" → numero intero, altrimenti NaN. */
  function parseNumber(text) {
    const t = String(text == null ? '' : text).trim().toLowerCase();
    if (/^[0-9]+$/.test(t)) return parseInt(t, 10);
    if (/^0x[0-9a-f]+$/.test(t)) return parseInt(t.slice(2), 16);
    if (/^0b[01]+$/.test(t)) return parseInt(t.slice(2), 2);
    return NaN;
  }

  /* ---------- decodifica e disassemblatore ---------- */

  /** Il byte letto come istruzione. */
  function decode(byte) {
    const v = byte & 0xff;
    const op = v >> 4;
    const arg = v & 0x0f;
    const d = BY_OP[op];
    if (!d) {
      return { byte: v, op: op, arg: arg, mn: null, defined: false, argKind: null, exec: [], cycles: FETCH.length, text: '—', desc: 'codice non usato: come NOP' };
    }
    return {
      byte: v, op: op, arg: arg, mn: d.mn, defined: true, argKind: d.arg, exec: d.exec,
      cycles: FETCH.length + d.exec.length,
      text: d.arg ? d.mn + ' ' + arg : d.mn,
      desc: d.desc,
    };
  }

  /** Testo assembly di un byte: 0x2F → "ADD 15", 0xE0 → "OUT", 0x90 → "—". */
  function disassemble(byte) { return decode(byte).text; }

  function cyclesOf(byte) { return decode(byte).cycles; }

  /* ---------- assemblatore ---------- */

  const MN_LIST = ISA.map((d) => d.mn).join(', ');

  /**
   * Una riga: "ADD 15", "add 0xF", "OUT", oppure un numero da 0 a 255 (un dato).
   * Restituisce { ok: true, byte, kind: 'instr' | 'data' } oppure { ok: false, error }.
   */
  function assembleLine(text) {
    const t = String(text == null ? '' : text).split(';')[0].trim();
    if (!t) return { ok: false, error: 'Scrivi un\'istruzione, per esempio ADD 15, oppure un numero da 0 a 255.' };
    const asNum = parseNumber(t);
    if (!Number.isNaN(asNum)) {
      if (asNum > 255) return { ok: false, error: 'Un byte arriva al massimo a 255.' };
      return { ok: true, byte: asNum, kind: 'data' };
    }
    const parts = t.split(/[\s,]+/).filter(Boolean);
    const mn = parts[0].toUpperCase();
    const d = BY_MN[mn];
    if (!d) return { ok: false, error: 'Istruzione sconosciuta: «' + parts[0] + '». Quelle valide sono ' + MN_LIST + '.' };
    if (parts.length > 2) return { ok: false, error: mn + ' vuole al massimo un operando.' };
    if (!d.arg) {
      if (parts.length > 1) return { ok: false, error: mn + ' non vuole operandi.' };
      return { ok: true, byte: d.op << 4, kind: 'instr' };
    }
    if (parts.length < 2) {
      return { ok: false, error: mn + ' vuole un operando: ' + (d.arg === 'val' ? 'un numero' : 'l\'indirizzo di una cella') + ' da 0 a 15.' };
    }
    const arg = parseNumber(parts[1]);
    if (Number.isNaN(arg)) return { ok: false, error: 'Non capisco l\'operando «' + parts[1] + '»: scrivi un numero, per esempio 14 o 0xE.' };
    if (arg > 15) return { ok: false, error: 'L\'operando ha solo 4 bit: deve stare fra 0 e 15.' };
    return { ok: true, byte: (d.op << 4) | arg, kind: 'instr' };
  }

  /**
   * Un programma intero, una riga per cella: "[indirizzo:] istruzione o numero [; commento]".
   * Senza indirizzo si prosegue dalla cella successiva.
   * Restituisce { bytes[16], notes[16], used[16], kinds[16] ('instr' | 'data' | null), errors: [{ line, message }] }.
   */
  function assemble(source) {
    const bytes = new Array(RAM_SIZE).fill(0);
    const notes = new Array(RAM_SIZE).fill('');
    const used = new Array(RAM_SIZE).fill(false);
    const kinds = new Array(RAM_SIZE).fill(null);
    const errors = [];
    let loc = 0;
    String(source || '').split(/\r?\n/).forEach((raw, i) => {
      const line = i + 1;
      const cut = raw.indexOf(';');
      const note = cut >= 0 ? raw.slice(cut + 1).trim() : '';
      let body = (cut >= 0 ? raw.slice(0, cut) : raw).trim();
      if (!body) return;
      const m = /^([^:\s]+)\s*:\s*(.*)$/.exec(body);
      if (m) {
        const addr = parseNumber(m[1]);
        if (Number.isNaN(addr) || addr >= RAM_SIZE) { errors.push({ line: line, message: 'Indirizzo non valido: ' + m[1] + ' (le celle vanno da 0 a 15).' }); return; }
        loc = addr;
        body = m[2].trim();
        if (!body) { errors.push({ line: line, message: 'Dopo «' + m[1] + ':» manca il contenuto della cella.' }); return; }
      }
      if (loc >= RAM_SIZE) { errors.push({ line: line, message: 'Il programma non sta in 16 byte.' }); return; }
      const r = assembleLine(body);
      if (!r.ok) { errors.push({ line: line, message: r.error }); return; }
      if (used[loc]) { errors.push({ line: line, message: 'La cella ' + loc + ' è già occupata.' }); return; }
      bytes[loc] = r.byte;
      notes[loc] = note;
      used[loc] = true;
      kinds[loc] = r.kind;
      loc++;
    });
    return { bytes: bytes, notes: notes, used: used, kinds: kinds, errors: errors };
  }

  /* ---------- simulatore a micro-passi ---------- */

  function create(bytes) {
    const ram = new Array(RAM_SIZE).fill(0);
    (bytes || []).slice(0, RAM_SIZE).forEach((b, i) => { ram[i] = b & 0xff; });
    return {
      ram: ram,
      pc: 0, mar: 0, ir: 0, a: 0, b: 0, out: 0, outSet: false,
      z: false, c: false,
      seq: FETCH.slice(), t: 0,
      decoded: null, instrAddr: 0,
      halted: false, cycles: 0, instructions: 0, outputs: [],
    };
  }

  function snapshot(s) {
    return { pc: s.pc, mar: s.mar, ir: s.ir, a: s.a, b: s.b, out: s.out, outSet: s.outSet, z: s.z, c: s.c, ram: s.ram.slice() };
  }

  function phaseOf(t) { return t < 2 ? 'prendi' : (t === 2 ? 'decodifica' : 'esegui'); }

  /**
   * Esegue un micro-passo (un ciclo di clock). Restituisce un evento che descrive che cosa è successo:
   *   { key, t (1…6), phase, label, signals[], moves[{ from, to, bus, value, bits }], prev, next,
   *     instr { addr, byte, text }, alu?, taken?, end (ultima micro-operazione dell'istruzione), halted }
   * Restituisce null se la CPU è ferma (HLT).
   */
  function step(s) {
    if (s.halted) return null;
    const key = s.seq[s.t];
    const prev = snapshot(s);
    const ev = {
      key: key, t: s.t + 1, phase: phaseOf(s.t), label: MICRO[key].label,
      signals: MICRO[key].signals.slice(), moves: [], prev: prev, next: null,
      instr: null, alu: null, taken: null, end: false, halted: false,
    };
    switch (key) {
      case 'pc>mar':
        s.instrAddr = s.pc;
        s.mar = s.pc;
        s.decoded = null;
        ev.moves.push({ from: 'pc', to: 'mar', bus: 'addr', value: s.pc, bits: 4 });
        break;
      case 'ram>ir':
        s.ir = s.ram[s.mar];
        s.pc = (s.pc + 1) % RAM_SIZE;
        s.decoded = null;
        ev.moves.push({ from: 'ram', to: 'ir', bus: 'data', value: s.ir, bits: 8, cell: s.mar });
        break;
      case 'decode':
        s.decoded = decode(s.ir);
        s.seq = FETCH.concat(s.decoded.exec);
        ev.moves.push({ from: 'ir', to: 'ctl', bus: 'op', value: s.ir >> 4, bits: 4 });
        break;
      case 'ir>mar':
        s.mar = s.ir & 0x0f;
        ev.moves.push({ from: 'ir', to: 'mar', bus: 'addr', value: s.mar, bits: 4 });
        break;
      case 'ram>a':
        s.a = s.ram[s.mar];
        ev.moves.push({ from: 'ram', to: 'a', bus: 'data', value: s.a, bits: 8, cell: s.mar });
        break;
      case 'ram>b':
        s.b = s.ram[s.mar];
        ev.moves.push({ from: 'ram', to: 'b', bus: 'data', value: s.b, bits: 8, cell: s.mar });
        break;
      case 'add':
      case 'sub': {
        const sub = key === 'sub';
        // la sottrazione è una somma col complemento a due di B: A + (NOT B) + 1
        const raw = sub ? s.a + ((~s.b) & 0xff) + 1 : s.a + s.b;
        const result = raw & 0xff;
        ev.alu = { op: sub ? '-' : '+', a: s.a, b: s.b, raw: raw, result: result, carry: raw > 0xff, zero: result === 0 };
        s.a = result;
        s.c = raw > 0xff;
        s.z = result === 0;
        ev.moves.push({ from: 'alu', to: 'a', bus: 'data', value: result, bits: 8 });
        break;
      }
      case 'a>ram':
        s.ram[s.mar] = s.a;
        ev.moves.push({ from: 'a', to: 'ram', bus: 'data', value: s.a, bits: 8, cell: s.mar });
        break;
      case 'ir>a':
        s.a = s.ir & 0x0f;
        ev.moves.push({ from: 'ir', to: 'a', bus: 'data', value: s.a, bits: 8 });
        break;
      case 'jmp':
        s.pc = s.ir & 0x0f;
        ev.taken = true;
        ev.moves.push({ from: 'ir', to: 'pc', bus: 'addr', value: s.pc, bits: 4 });
        break;
      case 'jc':
      case 'jz': {
        const flag = key === 'jc' ? s.c : s.z;
        ev.taken = flag;
        if (flag) {
          s.pc = s.ir & 0x0f;
          ev.moves.push({ from: 'ir', to: 'pc', bus: 'addr', value: s.pc, bits: 4 });
        } else {
          ev.signals = [];
        }
        break;
      }
      case 'a>out':
        s.out = s.a;
        s.outSet = true;
        s.outputs.push(s.a);
        ev.moves.push({ from: 'a', to: 'out', bus: 'data', value: s.a, bits: 8 });
        break;
      case 'hlt':
        s.halted = true;
        break;
      default:
        throw new Error('Micro-passo sconosciuto: ' + key);
    }
    s.cycles++;
    s.t++;
    // prima della decodifica la CPU non sa ancora che istruzione ha letto
    ev.instr = { addr: s.instrAddr, byte: s.ir, text: s.decoded ? s.decoded.text : null };
    if (s.halted || s.t >= s.seq.length) {
      ev.end = true;
      s.instructions++;
      s.t = 0;
      s.seq = FETCH.slice();
    }
    ev.halted = s.halted;
    ev.next = snapshot(s);
    return ev;
  }

  /** Esegue i micro-passi fino alla fine dell'istruzione in corso. Restituisce gli eventi. */
  function instruction(s) {
    const out = [];
    while (!s.halted) {
      const ev = step(s);
      out.push(ev);
      if (ev.end) break;
    }
    return out;
  }

  /** Esegue fino a HLT o fino a maxCycles cicli di clock. */
  function run(s, maxCycles) {
    const limit = maxCycles == null ? 100000 : maxCycles;
    while (!s.halted && s.cycles < limit) step(s);
    return { halted: s.halted, outputs: s.outputs.slice(), cycles: s.cycles, instructions: s.instructions };
  }

  function sameOutputs(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  /* ---------- programmi d'esempio ---------- */

  const EXAMPLES = [
    {
      id: 'somma',
      title: 'Somma',
      name: 'Somma di due numeri',
      about: 'Somma i numeri delle celle 14 e 15 e mostra il risultato sul display.',
      tryThis: 'Cambia il numero nella cella 15 e rieseguilo.',
      source: [
        '0: LDA 14  ; A = primo numero',
        '1: ADD 15  ; A = A + secondo numero',
        '2: OUT     ; mostra A sul display',
        '3: HLT     ; fine',
        '14: 28     ; primo numero',
        '15: 14     ; secondo numero',
      ].join('\n'),
    },
    {
      id: 'rovescia',
      title: 'Conto alla rovescia',
      name: 'Conto alla rovescia',
      about: 'Conta da 5 a 0. SUB toglie 1, JZ esce dal ciclo quando A arriva a zero, JMP torna indietro.',
      tryThis: 'Cambia la cella 0 in LDI 9 per partire da 9.',
      source: [
        '0: LDI 5   ; A = 5',
        '1: OUT     ; mostra A',
        '2: SUB 15  ; A = A - 1',
        '3: JZ 5    ; A è zero? esci dal ciclo',
        '4: JMP 1   ; altrimenti ripeti',
        '5: OUT     ; mostra lo zero',
        '6: HLT     ; fine',
        '15: 1      ; la costante 1',
      ].join('\n'),
    },
    {
      id: 'moltiplica',
      title: 'Moltiplica',
      name: 'Moltiplicazione con somme ripetute',
      about: 'Calcola 3 × 13 sommando 13 per tre volte. JC continua finché il contatore non scende sotto zero.',
      tryThis: 'Cambia la cella 14 (quante volte) o la cella 15 (il numero).',
      source: [
        '0: LDA 14  ; A = somme che mancano',
        '1: SUB 12  ; A = A - 1',
        '2: JC 6    ; nessun prestito? continua',
        '3: LDA 13  ; finito: A = prodotto',
        '4: OUT     ; mostra il prodotto',
        '5: HLT     ; fine',
        '6: STA 14  ; salva il contatore',
        '7: LDA 13  ; A = prodotto',
        '8: ADD 15  ; A = A + numero',
        '9: STA 13  ; salva il prodotto',
        '10: JMP 0  ; ricomincia il ciclo',
        '12: 1      ; la costante 1',
        '13: 0      ; prodotto',
        '14: 3      ; quante volte',
        '15: 13     ; numero da sommare',
      ].join('\n'),
    },
    {
      id: 'fibonacci',
      title: 'Fibonacci',
      name: 'Successione di Fibonacci',
      about: 'Ogni numero è la somma dei due precedenti. Quando la somma supera 255 si accende il riporto e JC ferma tutto.',
      tryThis: 'Cambia la cella 0 in LDI 2: la successione parte da un altro seme.',
      source: [
        '0: LDI 1   ; A = 1',
        '1: STA 14  ; x = 1',
        '2: LDI 0   ; A = 0',
        '3: STA 15  ; y = A',
        '4: OUT     ; mostra y',
        '5: LDA 14  ; A = x',
        '6: ADD 15  ; A = x + y',
        '7: STA 14  ; x = A',
        '8: OUT     ; mostra x',
        '9: LDA 15  ; A = y',
        '10: ADD 14 ; A = y + x',
        '11: JC 13  ; oltre 255? fine',
        '12: JMP 3  ; altrimenti continua',
        '13: HLT    ; fine',
        '14: 0      ; x',
        '15: 0      ; y',
      ].join('\n'),
    },
  ];

  /** Programma d'esempio già assemblato e provato: { id, ..., bytes, notes, expected }. */
  function loadExample(id) {
    const ex = EXAMPLES.find((e) => e.id === id) || EXAMPLES[0];
    const asm = assemble(ex.source);
    const result = run(create(asm.bytes));
    return Object.assign({}, ex, { bytes: asm.bytes, notes: asm.notes, kinds: asm.kinds, errors: asm.errors, expected: result.outputs, expectedCycles: result.cycles });
  }

  const api = {
    RAM_SIZE: RAM_SIZE,
    ISA: ISA,
    SIGNALS: SIGNALS,
    MICRO: MICRO,
    FETCH: FETCH,
    EXAMPLES: EXAMPLES,
    bin: bin,
    parseNumber: parseNumber,
    decode: decode,
    disassemble: disassemble,
    cyclesOf: cyclesOf,
    assembleLine: assembleLine,
    assemble: assemble,
    create: create,
    snapshot: snapshot,
    step: step,
    instruction: instruction,
    run: run,
    sameOutputs: sameOutputs,
    loadExample: loadExample,
  };
  root.CicloCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
