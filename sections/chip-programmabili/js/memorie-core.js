/*
 * Capitolo 2 · Memorie che si programmano: logica pura del laboratorio «Scrivi e cancella la memoria».
 * Nessun accesso al DOM: la usano js/memorie.js e i test (test/memorie.test.js).
 *
 * Il modello è una memoria didattica di 8 parole da 8 bit (64 bit) in cinque tecnologie, con le regole fisiche
 * di ciascuna. Convenzioni verificate sui datasheet:
 *   - PROM bipolari (per esempio Signetics 82S123, PROM a fusibili TI): escono dalla fabbrica con tutti i bit a 0;
 *     bruciare un fusibile scrive un 1 per sempre.
 *   - EPROM a canale n (per esempio Intel 2716), EEPROM e Flash: la cella cancellata vale 1 (byte FF);
 *     programmare porta i bit a 0. (La prima Intel 1702, a canale p, usava la convenzione opposta.)
 *   - ROM a maschera: un 1 è un collegamento (un diodo) disegnato in fabbrica.
 * Bit 7 = colonna a sinistra, come nella griglia del laboratorio.
 */
(function (root) {
  'use strict';

  const WORDS = 8;
  const BITS = 8;
  const BLOCK = 4; // byte per blocco nella Flash del laboratorio (2 blocchi)

  const TECHS = ['rom', 'prom', 'eprom', 'eeprom', 'flash'];

  // blank: valore di un bit vergine o cancellato; program: valore che la scrittura dà al bit; erase: che cosa si cancella.
  const INFO = {
    rom: { blank: null, program: null, erase: 'none' },
    prom: { blank: 0, program: 1, erase: 'none' },
    eprom: { blank: 1, program: 0, erase: 'chip' },
    eeprom: { blank: 1, program: 0, erase: 'byte' },
    flash: { blank: 1, program: 0, erase: 'block' },
  };

  // Motivi 8 x 8: un 1 è un pixel "scritto", cioè una cella programmata (o un diodo presente nella ROM).
  const MOTIFS = {
    sorriso: [0x3c, 0x42, 0xa5, 0x81, 0xa5, 0x99, 0x42, 0x3c],
    cuore: [0x66, 0xff, 0xff, 0xff, 0x7e, 0x3c, 0x18, 0x00],
    freccia: [0x18, 0x3c, 0x7e, 0xdb, 0x18, 0x18, 0x18, 0x18],
  };

  // Il pixel di troppo nel sorriso delle prove EEPROM e Flash: indirizzo 05, bit 6.
  const ERRORE = { addr: 5, bit: 6 };

  // Quanti passi ha la prova di ciascuna tecnologia.
  const STEPS = { rom: 2, prom: 2, eprom: 3, eeprom: 2, flash: 2 };
  const MIN_BITS = 4; // bit da scrivere per contare come "un motivo"

  function checkTech(tech) {
    if (!INFO[tech]) throw new Error('Tecnologia sconosciuta: ' + tech);
  }
  function checkCell(addr, b) {
    if (!(addr >= 0 && addr < WORDS && b >= 0 && b < BITS) || addr % 1 || b % 1) throw new Error('Cella fuori dalla memoria: ' + addr + ', ' + b);
  }

  function bit(byte, b) { return (byte >> b) & 1; }
  function setBit(byte, b, v) { return (v ? byte | (1 << b) : byte & ~(1 << b)) & 0xff; }
  function blockOf(addr) { return Math.floor(addr / BLOCK); }
  function blockRange(block) { return [block * BLOCK, block * BLOCK + BLOCK - 1]; }

  /** Byte vergine o cancellato: 00 per la PROM, FF per EPROM, EEPROM e Flash (e 00 per la ROM, che non ne ha uno). */
  function blankByte(tech) {
    checkTech(tech);
    return INFO[tech].blank === 1 ? 0xff : 0x00;
  }

  /** Pixel del motivo (1 = cella scritta) → valori dei byte nella tecnologia data. */
  function toBytes(tech, pixels) {
    checkTech(tech);
    const invert = INFO[tech].program === 0;
    return pixels.map((p) => (invert ? ~p & 0xff : p & 0xff));
  }
  /** Valori dei byte → pixel (la trasformazione è la stessa: inverte o no). */
  function toPixels(tech, bytes) { return toBytes(tech, bytes); }

  /** true se il bit è nello stato "scritto" (diodo presente, fusibile bruciato, elettroni sul gate flottante). */
  function isProgrammed(tech, byte, b) {
    checkTech(tech);
    const p = INFO[tech].program;
    return bit(byte, b) === (p == null ? 1 : p);
  }

  function withError(tech) {
    const px = MOTIFS.sorriso.slice();
    px[ERRORE.addr] = setBit(px[ERRORE.addr], ERRORE.bit, 1);
    return toBytes(tech, px);
  }

  /** Contenuto con cui parte ogni chip del laboratorio. */
  function initialMemory(tech) {
    checkTech(tech);
    if (tech === 'rom') return toBytes('rom', MOTIFS.sorriso);
    if (tech === 'eeprom' || tech === 'flash') return withError(tech);
    return new Array(WORDS).fill(blankByte(tech));
  }

  /** Contenuto giusto da raggiungere nelle prove EEPROM e Flash (null per le altre). */
  function targetMemory(tech) {
    checkTech(tech);
    return tech === 'eeprom' || tech === 'flash' ? toBytes(tech, MOTIFS.sorriso) : null;
  }

  function createChip(tech) {
    checkTech(tech);
    return { tech: tech, mem: initialMemory(tech), stats: { masks: 0, uv: 0, bytes: 0, blocks: 0 } };
  }
  function cloneChip(c) { return { tech: c.tech, mem: c.mem.slice(), stats: Object.assign({}, c.stats) }; }

  function equals(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if ((a[i] & 0xff) !== (b[i] & 0xff)) return false;
    return true;
  }

  function countProgrammed(chip) {
    let n = 0;
    for (let a = 0; a < WORDS; a++) for (let b = 0; b < BITS; b++) if (isProgrammed(chip.tech, chip.mem[a], b)) n++;
    return n;
  }

  function result(kind, chip, extra) {
    return Object.assign({ kind: kind, chip: chip, changes: [], blocked: [], rewritten: [] }, extra || {});
  }

  /*
   * EEPROM: riscrive un byte. Se qualche bit deve tornare a 1 serve prima la cancellazione del byte
   * (tutti i bit a 1), poi si riprogrammano i bit che devono valere 0. Modifica chip.mem.
   */
  function rewriteByte(chip, addr, want) {
    const old = chip.mem[addr];
    const changes = [];
    const needsErase = (~old & want & 0xff) !== 0; // bit a 0 che devono diventare 1
    let cur = old;
    if (needsErase) {
      for (let b = BITS - 1; b >= 0; b--) {
        if (bit(cur, b) === 0) changes.push({ addr: addr, bit: b, from: 0, to: 1, phase: 'erase' });
      }
      cur = 0xff;
    }
    for (let b = BITS - 1; b >= 0; b--) {
      if (bit(want, b) === 0 && bit(cur, b) === 1) changes.push({ addr: addr, bit: b, from: 1, to: 0, phase: 'program' });
    }
    chip.mem[addr] = want & 0xff;
    if (needsErase) chip.stats.bytes++;
    return { erased: needsErase, changes: changes };
  }

  /**
   * Chi impara clicca una cella: vuole cambiare quel bit. Restituisce che cosa permette la fisica.
   * kind: 'locked' (ROM) · 'burn' (PROM, 0 → 1) · 'fuse-blown' (PROM, già 1) · 'program' (1 → 0)
   *       'needs-uv' (EPROM, il bit è 0) · 'byte-rewrite' (EEPROM, il bit è 0) · 'needs-block-erase' (Flash, il bit è 0)
   */
  function click(chip, addr, b) {
    checkCell(addr, b);
    const t = chip.tech;
    const info = INFO[t];
    const next = cloneChip(chip);
    const extra = { addr: addr, bit: b };
    if (t === 'rom') return result('locked', next, extra);
    const v = bit(chip.mem[addr], b);
    if (v === info.blank) {
      next.mem[addr] = setBit(next.mem[addr], b, info.program);
      const r = result(t === 'prom' ? 'burn' : 'program', next, extra);
      r.changes.push({ addr: addr, bit: b, from: v, to: info.program, phase: 'program' });
      return r;
    }
    if (t === 'prom') return result('fuse-blown', next, extra);
    if (t === 'eprom') return result('needs-uv', next, extra);
    if (t === 'flash') return result('needs-block-erase', next, Object.assign(extra, { block: blockOf(addr) }));
    // EEPROM: si cancella il solo byte e si riscrivono gli altri bit che erano a 0
    const rw = rewriteByte(next, addr, setBit(chip.mem[addr], b, 1));
    return result('byte-rewrite', next, Object.assign(extra, { changes: rw.changes, rewritten: [addr] }));
  }

  /**
   * Il programmatore scrive un motivo (pixel: 1 = cella da scrivere), riga per riga.
   * PROM, EPROM e Flash possono solo programmare: i bit che dovrebbero tornare vergini finiscono in blocked.
   * La EEPROM riscrive da sola (cancella e riprogramma) i byte diversi, elencati in rewritten.
   */
  function writeMotif(chip, pixels) {
    const t = chip.tech;
    const info = INFO[t];
    const next = cloneChip(chip);
    if (t === 'rom') return result('locked', next);
    if (!Array.isArray(pixels) || pixels.length !== WORDS) throw new Error('Il motivo deve avere ' + WORDS + ' righe');
    const want = toBytes(t, pixels);
    const r = result('write', next);
    for (let a = 0; a < WORDS; a++) {
      if (next.mem[a] === want[a]) continue;
      if (t === 'eeprom') {
        const rw = rewriteByte(next, a, want[a]);
        r.changes.push(...rw.changes);
        r.rewritten.push(a);
        continue;
      }
      for (let b = BITS - 1; b >= 0; b--) {
        const w = bit(want[a], b);
        const o = bit(next.mem[a], b);
        if (w === o) continue;
        if (o === info.blank) {
          next.mem[a] = setBit(next.mem[a], b, info.program);
          r.changes.push({ addr: a, bit: b, from: o, to: info.program, phase: 'program' });
        } else {
          r.blocked.push({ addr: a, bit: b });
        }
      }
    }
    r.same = r.changes.length === 0 && r.blocked.length === 0;
    return r;
  }

  function eraseRows(chip, from, to, kind, extra) {
    const next = cloneChip(chip);
    const r = result(kind, next, extra);
    for (let a = from; a <= to; a++) {
      for (let b = BITS - 1; b >= 0; b--) {
        if (bit(next.mem[a], b) === 0) r.changes.push({ addr: a, bit: b, from: 0, to: 1, phase: 'erase' });
      }
      next.mem[a] = 0xff;
    }
    return r;
  }

  /** EPROM: la lampada UV cancella tutto il chip. */
  function eraseAll(chip) {
    if (chip.tech !== 'eprom') throw new Error('Solo la EPROM si cancella con la luce ultravioletta');
    const r = eraseRows(chip, 0, WORDS - 1, 'uv');
    r.chip.stats.uv++;
    return r;
  }

  /** EEPROM: cancella un solo byte. */
  function eraseByte(chip, addr) {
    if (chip.tech !== 'eeprom') throw new Error('Solo la EEPROM cancella un byte alla volta');
    checkCell(addr, 0);
    const r = eraseRows(chip, addr, addr, 'byte-erase', { addr: addr });
    if (r.changes.length) r.chip.stats.bytes++;
    return r;
  }

  /** Flash: cancella un blocco intero. */
  function eraseBlock(chip, block) {
    if (chip.tech !== 'flash') throw new Error('Solo la Flash si cancella a blocchi');
    if (!(block >= 0 && block < WORDS / BLOCK) || block % 1) throw new Error('Blocco inesistente: ' + block);
    const [from, to] = blockRange(block);
    const r = eraseRows(chip, from, to, 'block-erase', { block: block });
    r.chip.stats.blocks++;
    return r;
  }

  /** ROM: una maschera nuova, cioè un chip nuovo con un altro contenuto. */
  function newMask(chip, pixels) {
    if (chip.tech !== 'rom') throw new Error('Solo la ROM a maschera si cambia con una maschera nuova');
    const next = cloneChip(chip);
    const want = toBytes('rom', pixels);
    const r = result('mask', next);
    for (let a = 0; a < WORDS; a++) {
      for (let b = BITS - 1; b >= 0; b--) {
        const o = bit(next.mem[a], b);
        const w = bit(want[a], b);
        if (o !== w) r.changes.push({ addr: a, bit: b, from: o, to: w, phase: 'mask' });
      }
    }
    next.mem = want;
    next.stats.masks++;
    return r;
  }

  /** Un chip nuovo della stessa tecnologia (PROM nuova, prova da rifare). */
  function resetChip(chip) {
    const next = createChip(chip.tech);
    next.stats = Object.assign({}, chip.stats);
    return result('reset', next);
  }

  /* ---------- prove ---------- */

  function newProgress() {
    const p = {};
    TECHS.forEach((t) => { p[t] = { steps: new Array(STEPS[t]).fill(false), done: false, count: 0 }; });
    return p;
  }

  /** Ricostruisce un avanzamento salvato, scartando ciò che non torna. */
  function normalizeProgress(raw) {
    const p = newProgress();
    if (!raw || typeof raw !== 'object') return p;
    TECHS.forEach((t) => {
      const r = raw[t];
      if (!r || !Array.isArray(r.steps) || r.steps.length !== STEPS[t]) return;
      p[t].steps = r.steps.map(Boolean);
      p[t].done = p[t].steps.every(Boolean);
    });
    return p;
  }

  function cloneProgress(p) {
    const q = {};
    TECHS.forEach((t) => { q[t] = { steps: p[t].steps.slice(), done: p[t].done, count: p[t].count || 0 }; });
    return q;
  }

  /**
   * Aggiorna le prove dopo un'operazione (il risultato di click, writeMotif, erase..., newMask).
   * Restituisce { progress, completed: tecnologia appena completata o null, all: tutte completate }.
   */
  function track(progress, res) {
    const t = res.chip.tech;
    const p = cloneProgress(progress);
    const s = p[t];
    const was = s.done;
    const programmed = res.changes.filter((c) => c.phase === 'program').length;
    switch (t) {
      case 'rom':
        if (res.kind === 'locked') s.steps[0] = true;
        if (res.kind === 'mask') s.steps[1] = true;
        break;
      case 'prom':
        s.count += programmed;
        if (s.count >= MIN_BITS) s.steps[0] = true;
        if (res.kind === 'fuse-blown' || (res.kind === 'write' && res.blocked.length)) s.steps[1] = true;
        break;
      case 'eprom':
        if (res.kind === 'uv') {
          if (s.steps[0]) s.steps[1] = true;
          s.count = 0;
        } else if (programmed) {
          s.count += programmed;
          if (s.count >= MIN_BITS) {
            if (!s.steps[0]) s.steps[0] = true;
            else if (s.steps[1]) s.steps[2] = true;
          }
        }
        break;
      case 'eeprom':
        if (res.changes.some((c) => c.addr === ERRORE.addr && c.phase === 'erase')) s.steps[0] = true;
        if (s.steps[0] && equals(res.chip.mem, targetMemory('eeprom'))) s.steps[1] = true;
        break;
      case 'flash':
        if (res.kind === 'block-erase' && res.block === blockOf(ERRORE.addr)) s.steps[0] = true;
        if (s.steps[0] && equals(res.chip.mem, targetMemory('flash'))) s.steps[1] = true;
        break;
    }
    s.done = s.steps.every(Boolean);
    return { progress: p, completed: !was && s.done ? t : null, all: TECHS.every((k) => p[k].done) };
  }

  function doneCount(progress) { return TECHS.filter((t) => progress[t] && progress[t].done).length; }

  const api = {
    WORDS: WORDS,
    BITS: BITS,
    BLOCK: BLOCK,
    TECHS: TECHS,
    INFO: INFO,
    MOTIFS: MOTIFS,
    ERRORE: ERRORE,
    STEPS: STEPS,
    MIN_BITS: MIN_BITS,
    bit: bit,
    setBit: setBit,
    blockOf: blockOf,
    blockRange: blockRange,
    blankByte: blankByte,
    toBytes: toBytes,
    toPixels: toPixels,
    isProgrammed: isProgrammed,
    initialMemory: initialMemory,
    targetMemory: targetMemory,
    createChip: createChip,
    cloneChip: cloneChip,
    equals: equals,
    countProgrammed: countProgrammed,
    click: click,
    writeMotif: writeMotif,
    eraseAll: eraseAll,
    eraseByte: eraseByte,
    eraseBlock: eraseBlock,
    newMask: newMask,
    resetChip: resetChip,
    newProgress: newProgress,
    normalizeProgress: normalizeProgress,
    track: track,
    doneCount: doneCount,
  };
  root.MemorieCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
