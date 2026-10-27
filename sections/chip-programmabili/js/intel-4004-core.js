/*
 * Capitolo 3 · Intel 4004: logica pura del laboratorio "Il 4004 al microscopio" (niente DOM).
 *
 * - decode(byte): nome mnemonico e lunghezza delle 46 istruzioni del 4004 (manuale MCS-4, 1973);
 * - program(a, b): un piccolo programma vero che somma due cifre da 4 bit e salva il risultato
 *   (con il riporto) in due registri;
 * - trace(rom): esegue il programma ciclo per ciclo e descrive le 8 fasi di ogni ciclo di
 *   istruzione (A1 A2 A3 M1 M2 X1 X2 X3): che cosa passa sul bus a 4 bit, in che direzione,
 *   quando sono attivi SYNC e CM-ROM, e lo stato visibile del processore in ogni fase.
 *
 * Il modello è didattico: le istruzioni simulate sono quelle che servono al laboratorio più
 * poche altre sicure; le istruzioni di ingresso/uscita e di memoria RAM non sono simulate.
 */
(function (root) {
  'use strict';

  const PHASES = ['A1', 'A2', 'A3', 'M1', 'M2', 'X1', 'X2', 'X3'];

  // Gruppo dell'accumulatore (1111 xxxx) e gruppo di ingresso/uscita e RAM (1110 xxxx).
  const ACC_GROUP = ['CLB', 'CLC', 'IAC', 'CMC', 'CMA', 'RAL', 'RAR', 'TCC', 'DAC', 'TCS', 'STC', 'DAA', 'KBP', 'DCL'];
  const IO_GROUP = ['WRM', 'WMP', 'WRR', 'WPM', 'WR0', 'WR1', 'WR2', 'WR3', 'SBM', 'RDM', 'RDR', 'ADM', 'RD0', 'RD1', 'RD2', 'RD3'];

  function hex(n, digits) {
    return (n >>> 0).toString(16).toUpperCase().padStart(digits || 2, '0');
  }

  /**
   * Decodifica il primo byte di un'istruzione.
   * Restituisce { byte, opr, opa, mn, words, arg, valid, text }:
   *   opr = 4 bit alti (codice operativo), opa = 4 bit bassi (registro, dato o condizione),
   *   mn = nome mnemonico, words = 1 o 2 byte, text = forma leggibile ("ADD R0").
   */
  function decode(b) {
    b &= 0xff;
    const opr = b >> 4;
    const opa = b & 15;
    const d = { byte: b, opr: opr, opa: opa, mn: '', words: 1, arg: '', valid: true };
    switch (opr) {
      case 0x0: if (opa === 0) d.mn = 'NOP'; else d.valid = false; break;
      case 0x1: d.mn = 'JCN'; d.words = 2; d.arg = String(opa); break;
      case 0x2: d.mn = opa & 1 ? 'SRC' : 'FIM'; d.words = opa & 1 ? 1 : 2; d.arg = 'P' + (opa >> 1); break;
      case 0x3: d.mn = opa & 1 ? 'JIN' : 'FIN'; d.arg = 'P' + (opa >> 1); break;
      case 0x4: d.mn = 'JUN'; d.words = 2; break;
      case 0x5: d.mn = 'JMS'; d.words = 2; break;
      case 0x6: d.mn = 'INC'; d.arg = 'R' + opa; break;
      case 0x7: d.mn = 'ISZ'; d.words = 2; d.arg = 'R' + opa; break;
      case 0x8: d.mn = 'ADD'; d.arg = 'R' + opa; break;
      case 0x9: d.mn = 'SUB'; d.arg = 'R' + opa; break;
      case 0xa: d.mn = 'LD'; d.arg = 'R' + opa; break;
      case 0xb: d.mn = 'XCH'; d.arg = 'R' + opa; break;
      case 0xc: d.mn = 'BBL'; d.arg = String(opa); break;
      case 0xd: d.mn = 'LDM'; d.arg = String(opa); break;
      case 0xe: d.mn = IO_GROUP[opa]; break;
      default:
        if (opa < ACC_GROUP.length) d.mn = ACC_GROUP[opa]; else d.valid = false;
    }
    if (!d.valid) d.mn = '???';
    d.text = d.mn + (d.arg ? ' ' + d.arg : '');
    return d;
  }

  /** Tutte le istruzioni distinte del 4004 (46): { mn, words }. */
  function instructionSet() {
    const seen = new Map();
    for (let b = 0; b < 256; b++) {
      const d = decode(b);
      if (d.valid && !seen.has(d.mn)) seen.set(d.mn, d.words);
    }
    return Array.from(seen, ([mn, words]) => ({ mn: mn, words: words }));
  }

  /** Testo leggibile di un'istruzione intera (con il secondo byte, se c'è). */
  function format(b1, b2) {
    const d = decode(b1);
    if (d.words === 1) return d.text;
    if (d.mn === 'JUN' || d.mn === 'JMS') return d.mn + ' ' + hex(((d.opa << 8) | (b2 & 0xff)), 3);
    if (d.mn === 'FIM') return 'FIM ' + d.arg + ', ' + hex(b2 & 0xff, 2);
    return d.text + ', ' + hex(b2 & 0xff, 2);
  }

  /**
   * Il programma del laboratorio: somma due cifre da 4 bit (a + b) e lascia il risultato a 8 bit
   * nella coppia R2 R1 (R2 = riporto, R1 = cifra bassa). Finisce con un salto su se stesso.
   * Restituisce { rom: [byte...], lines: [{ addr, bytes, text, note }] }.
   */
  function program(a, b) {
    a &= 15; b &= 15;
    const lines = [
      { bytes: [0xd0 | a], note: 'A ← ' + a },
      { bytes: [0xb0], note: 'R0 ↔ A' },
      { bytes: [0xd0 | b], note: 'A ← ' + b },
      { bytes: [0x80], note: 'A ← A+R0+CY' },
      { bytes: [0xb1], note: 'R1 ↔ A' },
      { bytes: [0xf7], note: 'A ← CY, CY ← 0' },
      { bytes: [0xb2], note: 'R2 ↔ A' },
      { bytes: [0x40, 0x07], note: 'resta qui: fine' },
    ];
    const rom = [];
    lines.forEach((l) => {
      l.addr = rom.length;
      l.text = format(l.bytes[0], l.bytes[1]);
      rom.push.apply(rom, l.bytes);
    });
    return { rom: rom, lines: lines };
  }

  function initialState() {
    return { pc: 0, acc: 0, cy: 0, r: new Array(16).fill(0), stack: [], test: 0 };
  }

  function clone(st) {
    return { pc: st.pc, acc: st.acc, cy: st.cy, r: st.r.slice(), stack: st.stack.slice(), test: st.test };
  }

  /**
   * Esegue un'istruzione già prelevata. st.pc punta già al byte che segue l'istruzione.
   * Restituisce { st, changed: [...], text, alu, simulated }.
   *   changed: nomi delle parti cambiate ('acc', 'cy', 'r3', 'pc', 'stack');
   *   alu: { op, x, y, c, result } quando lavora l'ALU.
   */
  function execute(stIn, d, b2) {
    const st = clone(stIn);
    const changed = [];
    let text = '';
    let alu = null;
    let simulated = true;
    const n = d.opa;
    const set = (key, v) => {
      if (key === 'acc') { if (st.acc !== v) changed.push('acc'); st.acc = v; }
      else if (key === 'cy') { if (st.cy !== v) changed.push('cy'); st.cy = v; }
      else { const i = +key.slice(1); if (st.r[i] !== v) changed.push(key); st.r[i] = v; }
    };
    switch (d.mn) {
      case 'NOP': text = 'Nessuna operazione.'; break;
      case 'LDM': set('acc', n); text = 'Il dato ' + n + ', scritto dentro l\'istruzione, entra nell\'accumulatore.'; break;
      case 'LD': set('acc', st.r[n]); text = 'Il contenuto di R' + n + ' viene copiato nell\'accumulatore.'; break;
      case 'XCH': {
        const a = st.acc;
        const r = st.r[n];
        set('acc', r); set('r' + n, a);
        text = 'L\'accumulatore e R' + n + ' si scambiano il contenuto: ora R' + n + ' = ' + a + ' e A = ' + r + '.';
        break;
      }
      case 'ADD': {
        const sum = stIn.acc + stIn.r[n] + stIn.cy;
        alu = { op: '+', x: stIn.acc, y: stIn.r[n], c: stIn.cy, result: sum };
        set('acc', sum & 15); set('cy', sum > 15 ? 1 : 0);
        text = 'L\'ALU somma A + R' + n + ' + riporto: ' + stIn.acc + ' + ' + stIn.r[n] + ' + ' + stIn.cy + ' = ' + sum +
          (sum > 15 ? '. Non sta in 4 bit: in A resta ' + (sum & 15) + ' e il riporto CY va a 1.' : '. Sta in 4 bit: il riporto CY resta 0.');
        break;
      }
      case 'INC': set('r' + n, (st.r[n] + 1) & 15); text = 'R' + n + ' aumenta di 1 (il riporto non cambia).'; break;
      case 'IAC': {
        const v = st.acc + 1;
        alu = { op: '+', x: st.acc, y: 1, c: 0, result: v };
        set('acc', v & 15); set('cy', v > 15 ? 1 : 0);
        text = 'L\'accumulatore aumenta di 1.';
        break;
      }
      case 'CLB': set('acc', 0); set('cy', 0); text = 'Accumulatore e riporto vengono azzerati.'; break;
      case 'CLC': set('cy', 0); text = 'Il riporto viene azzerato.'; break;
      case 'STC': set('cy', 1); text = 'Il riporto viene messo a 1.'; break;
      case 'CMC': set('cy', st.cy ^ 1); text = 'Il riporto viene invertito.'; break;
      case 'CMA': set('acc', (~st.acc) & 15); text = 'I 4 bit dell\'accumulatore vengono invertiti.'; break;
      case 'TCC': {
        const c = st.cy;
        set('acc', c); set('cy', 0);
        text = 'Il riporto (' + c + ') passa nell\'accumulatore e CY torna a 0.';
        break;
      }
      case 'FIM': set('r' + (n & 14), (b2 >> 4) & 15); set('r' + ((n & 14) + 1), b2 & 15); text = 'Il dato a 8 bit del secondo byte va nella coppia di registri.'; break;
      case 'JUN': {
        const target = ((n << 8) | (b2 & 0xff)) & 0xfff;
        if (st.pc !== target) changed.push('pc');
        st.pc = target;
        text = 'Il contatore di programma diventa ' + hex(target, 3) + ': la prossima istruzione arriverà da lì.';
        break;
      }
      case 'JMS': {
        const target = ((n << 8) | (b2 & 0xff)) & 0xfff;
        st.stack.unshift(st.pc);
        if (st.stack.length > 3) st.stack.pop(); // la pila ha 3 livelli: il più vecchio si perde
        st.pc = target;
        changed.push('pc', 'stack');
        text = 'Salto al sottoprogramma ' + hex(target, 3) + ': l\'indirizzo di ritorno va nella pila.';
        break;
      }
      case 'BBL': {
        if (st.stack.length) { st.pc = st.stack.shift(); changed.push('pc', 'stack'); }
        set('acc', n);
        text = 'Ritorno dal sottoprogramma, con ' + n + ' nell\'accumulatore.';
        break;
      }
      case 'ISZ': {
        const v = (st.r[n] + 1) & 15;
        set('r' + n, v);
        if (v !== 0) { st.pc = (st.pc & 0xf00) | (b2 & 0xff); changed.push('pc'); }
        text = 'R' + n + ' aumenta di 1; se non è tornato a 0 il programma salta.';
        break;
      }
      case 'JCN': {
        // condizione: bit 3 inverte, bit 2 A = 0, bit 1 CY = 1, bit 0 piedino TEST = 0
        const c = n;
        let ok = ((c & 4) && st.acc === 0) || ((c & 2) && st.cy === 1) || ((c & 1) && st.test === 0);
        ok = !!ok;
        if (c & 8) ok = !ok;
        if (ok) { st.pc = (st.pc & 0xf00) | (b2 & 0xff); changed.push('pc'); }
        text = ok ? 'La condizione è vera: salto.' : 'La condizione è falsa: si prosegue.';
        break;
      }
      default:
        simulated = false;
        text = 'Istruzione non simulata in questo laboratorio.';
    }
    return { st: st, changed: changed, text: text, alu: alu, simulated: simulated };
  }

  /**
   * Esegue il programma un ciclo di istruzione alla volta.
   * Ogni ciclo: { n, addr, byte, word: 1 | 2, instr, second, phases[8], before, after, exec, halt }.
   * Ogni fase: { name, bus (0-15 o null), dir ('out' CPU→ROM | 'in' ROM→CPU | null),
   *              kind ('addr' | 'data' | null), sync, cmRom, state }.
   *   state: stato visibile in quella fase { pc, acc, cy, r, stack, ir: { hi, lo, second }, latch: [l, m, h] }.
   * Si ferma su un salto verso se stesso (il modo classico di "fermare" il 4004) o dopo maxCycles.
   */
  function trace(rom, opts) {
    const max = (opts && opts.maxCycles) || 64;
    let st = initialState();
    const cycles = [];
    let pending = null; // istruzione a due byte di cui si aspetta il secondo
    let halted = false;
    while (!halted && cycles.length < max) {
      const addr = st.pc & 0xfff;
      const byte = rom[addr] == null ? 0 : rom[addr] & 0xff;
      const before = clone(st);
      const word = pending ? 2 : 1;
      const instr = pending ? pending.d : decode(byte);
      const cyc = { n: cycles.length, addr: addr, byte: byte, word: word, instr: instr, first: pending ? pending.byte : byte, before: before, phases: [], exec: null, halt: false };

      // fetch: il contatore di programma avanza al byte successivo
      const fetched = clone(st);
      fetched.pc = (addr + 1) & 0xfff;
      let after = fetched;
      if (instr.words === 2 && word === 1) {
        pending = { d: instr, byte: byte, addr: addr };
        cyc.exec = { text: 'È un\'istruzione da due byte: il 4004 tiene i 4 bit di OPA e al ciclo seguente preleva il secondo byte.', changed: [], alu: null, simulated: true };
      } else {
        const r = execute(fetched, instr, word === 2 ? byte : 0);
        after = r.st;
        cyc.exec = { text: r.text, changed: r.changed, alu: r.alu, simulated: r.simulated };
        if (instr.mn === 'JUN' && pending && after.pc === pending.addr) { halted = true; cyc.halt = true; }
        pending = null;
      }

      const irHi = word === 2 ? (cyc.first >> 4) : byte >> 4;
      const irLo = word === 2 ? (cyc.first & 15) : byte & 15;
      const prevIr = cycles.length ? cycles[cycles.length - 1].phases[7].state.ir : { hi: null, lo: null, second: null };
      for (let i = 0; i < 8; i++) {
        const name = PHASES[i];
        const ph = { name: name, bus: null, dir: null, kind: null, sync: name === 'X3', cmRom: name === 'A3' };
        if (i < 3) { ph.bus = (addr >> (4 * i)) & 15; ph.dir = 'out'; ph.kind = 'addr'; }
        else if (i < 5) { ph.bus = i === 3 ? byte >> 4 : byte & 15; ph.dir = 'in'; ph.kind = 'data'; }
        // istruzioni di ingresso/uscita: le linee CM si attivano anche in M2
        if (name === 'M2' && word === 1 && instr.opr === 0xe) ph.cmRom = true;
        const s = i < 4 ? clone(before) : i < 7 ? clone(fetched) : clone(after);
        // registro d'istruzione: si riempie in M1 (OPR) e M2 (OPA); il secondo byte va a parte
        let ir;
        if (word === 1) {
          ir = i < 3 ? { hi: prevIr.hi, lo: prevIr.lo, second: null }
            : i === 3 ? { hi: irHi, lo: null, second: null }
            : { hi: irHi, lo: irLo, second: null };
        } else {
          ir = { hi: irHi, lo: irLo, second: i < 3 ? null : i === 3 ? [byte >> 4, null] : [byte >> 4, byte & 15] };
        }
        s.ir = ir;
        s.latch = [i >= 0 ? addr & 15 : null, i >= 1 ? (addr >> 4) & 15 : null, i >= 2 ? (addr >> 8) & 15 : null];
        ph.state = s;
        cyc.phases.push(ph);
      }
      cyc.after = after;
      cycles.push(cyc);
      st = after;
    }
    return { cycles: cycles, final: st, halted: halted };
  }

  const api = {
    PHASES: PHASES,
    decode: decode,
    format: format,
    instructionSet: instructionSet,
    program: program,
    execute: execute,
    trace: trace,
    initialState: initialState,
    hex: hex,
  };
  root.I4004 = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
