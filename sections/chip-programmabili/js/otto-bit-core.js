/*
 * Capitolo 5 · "La corsa agli 8 bit": logica pura del laboratorio (niente DOM).
 *
 * - CHIPS: schede tecniche verificate dei cinque chip (8008, 8080, 6800, 6502, Z80);
 * - registri di ogni chip, disposizione sul palco (larga e stretta) e differenze tra due chip;
 * - prezzi verificati sulla linea del tempo 1974-1976;
 * - la sfida: lo stesso compito in assembly vero di 8080, 6502 e Z80, con byte e cicli
 *   presi dai manuali originali, e un piccolo simulatore che esegue l'ordine scelto da chi impara.
 *
 * Esportata come window.OttoBit (browser) e module.exports (node --test).
 */
(function (root) {
  'use strict';

  /* ---------- formati all'italiana ---------- */

  function num(n) {
    const neg = n < 0;
    const parts = String(Math.abs(n)).split('.');
    const int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '−' : '') + int + (parts[1] ? ',' + parts[1] : '');
  }
  function dec(n, digits) {
    const f = Math.pow(10, digits == null ? 1 : digits);
    const v = Math.round(n * f) / f;
    return num(v);
  }
  function hex(n, d) { return (n >>> 0).toString(16).toUpperCase().padStart(d || 2, '0'); }

  /* ---------- i cinque chip ---------- */

  // Fonti nel frammento HTML del capitolo. "circa" dove le fonti arrotondano o non concordano.
  const RAILS = [
    { k: '+12', label: '+12 V' },
    { k: '+5', label: '+5 V' },
    { k: '-5', label: '−5 V' },
    { k: '-9', label: '−9 V' },
  ];

  const CHIPS = [
    {
      id: '8008', name: 'Intel 8008', short: '8008', maker: 'Intel', year: 1972, when: 'aprile 1972',
      dip: { pins: 18, label: 'C8008', top: 'intel', body: 'ceramic' },
      people: 'Hal Feeney e Federico Faggin; istruzioni del Datapoint 2200 di CTC',
      tech: 'PMOS', transistors: 3500, transistorsText: 'circa 3.500',
      clock: 0.5, clockText: '0,5 MHz (0,8 nell’8008-1)',
      pins: 18, supplies: ['+5', '-9'], memKB: 16, memText: '16 KB (indirizzi a 14 bit)',
      price: 120, priceApprox: false, priceText: '120 dollari',
      modes: 'registro, immediato e memoria solo tramite H e L',
      blurb: 'Nato per il terminale Datapoint 2200, che alla fine non lo usò. Con 18 piedini gli stessi 8 fili portano a turno due pezzi d’indirizzo e il dato.',
      where: 'i primi microcomputer, come il Micral N e il Mark-8; le sue istruzioni, via 8080 e 8086, arrivano fino all’x86.',
    },
    {
      id: '8080', name: 'Intel 8080', short: '8080', maker: 'Intel', year: 1974, when: 'aprile 1974',
      dip: { pins: 40, label: 'C8080A', top: 'intel', body: 'violet', lid: true },
      people: 'Federico Faggin (idea e guida) e Masatoshi Shima (progetto dettagliato)',
      tech: 'NMOS', transistors: 6000, transistorsMin: 4500, transistorsText: 'tra 4.500 e 6.000, a seconda delle fonti',
      clock: 2, clockText: '2 MHz',
      pins: 40, supplies: ['+12', '+5', '-5'], memKB: 64, memText: '64 KB (indirizzi a 16 bit)',
      price: 360, priceApprox: false, priceText: '360 dollari',
      modes: 'registro, immediato, diretto e indiretto tramite le coppie di registri',
      blurb: 'Dieci volte più veloce dell’8008, con indirizzi e dati su piedini separati e la pila spostata in memoria. Il prezzo: tre tensioni di alimentazione.',
      where: 'l’Altair 8800 e tanti sistemi industriali; poi l’8085 e l’8086.',
    },
    {
      id: '6800', name: 'Motorola 6800', short: '6800', maker: 'Motorola', year: 1974, when: 'marzo 1974 (annuncio)',
      dip: { pins: 40, label: 'MC6800', top: 'MOTOROLA', body: 'ceramic' },
      people: 'il gruppo Motorola guidato dall’architetto Tom Bennett',
      tech: 'NMOS', transistors: 4100, transistorsText: 'circa 4.100',
      clock: 1, clockText: '1 MHz',
      pins: 40, supplies: ['+5'], memKB: 64, memText: '64 KB (indirizzi a 16 bit)',
      price: 360, priceApprox: true, priceText: 'circa 360 dollari',
      modes: '7: tra questi diretto, esteso e indicizzato con X',
      blurb: 'Una sola alimentazione da +5 V, come i normali chip logici: alimentatore e scheda diventano più semplici. Due accumulatori e un indice da 16 bit.',
      where: 'il kit SWTPC 6800, l’Altair 680, periferiche e strumenti di misura.',
    },
    {
      id: '6502', name: 'MOS 6502', short: '6502', maker: 'MOS Technology', year: 1975, when: 'settembre 1975',
      dip: { pins: 40, label: 'MCS6502', top: 'MOS', body: 'plastic' },
      people: 'Chuck Peddle, Bill Mensch, Rod Orgill e altri ex Motorola',
      tech: 'NMOS', transistors: 3510, transistorsText: '3.510',
      clock: 1, clockText: '1 MHz',
      pins: 40, supplies: ['+5'], memKB: 64, memText: '64 KB (indirizzi a 16 bit)',
      price: 25, priceApprox: false, priceText: '25 dollari (il 6501: 20)',
      modes: '13, tra cui la pagina zero e gli indiretti indicizzati',
      blurb: 'Pochi registri e una scorciatoia: la pagina zero, i primi 256 byte di memoria raggiunti con indirizzi di un byte solo. Chip piccolo, resa alta, prezzo stracciato.',
      where: 'Apple II, Commodore PET e, con le varianti 6510 e 2A03, Commodore 64 e NES.',
    },
    {
      id: 'z80', name: 'Zilog Z80', short: 'Z80', maker: 'Zilog', year: 1976, when: 'luglio 1976',
      dip: { pins: 40, label: 'Z80 CPU', top: 'ZILOG', body: 'plastic' },
      people: 'Federico Faggin (idea e architettura) e Masatoshi Shima (microarchitettura, logica e circuiti)',
      tech: 'NMOS', transistors: 8500, transistorsText: 'circa 8.500',
      clock: 2.5, clockText: '2,5 MHz (Z80A: 4 MHz)',
      pins: 40, supplies: ['+5'], memKB: 64, memText: '64 KB, con il refresh delle DRAM',
      price: null, priceApprox: false, priceText: 'le fonti non concordano',
      modes: 'quelli dell’8080 più indicizzato con IX e IY, relativo e sui bit',
      blurb: 'Esegue quasi tutti i programmi dell’8080 byte per byte e aggiunge un set di registri di riserva, IX e IY, istruzioni sui bit e il rinfresco automatico delle DRAM.',
      where: 'TRS-80, Osborne 1, computer MSX; un parente Sharp nel Game Boy.',
    },
  ];
  const CHIP = {};
  CHIPS.forEach((c) => { CHIP[c.id] = c; });

  function railsText(chip) {
    const list = chip.supplies.map((k) => RAILS.find((r) => r.k === k).label);
    if (list.length === 1) return 'solo ' + list[0];
    return list.slice(0, -1).join(', ') + ' e ' + list[list.length - 1];
  }

  /* ---------- registri ---------- */

  // role: acc (accumulatore), gpr (generale), ptr (puntatore), idx (indice), flag, alt (set alternativo),
  // sys (speciali dello Z80), stack (pila interna dell'8008), ghost (byte fisso), zp (pagina zero: memoria)
  const R8 = (k, role, extra) => Object.assign({ k: k, label: k, bits: 8, role: role }, extra || {});
  const GPR = ['B', 'C', 'D', 'E', 'H', 'L'].map((k) => R8(k, 'gpr'));
  const ALT = ['A', 'F', 'B', 'C', 'D', 'E', 'H', 'L'].map((k) => R8(k + "'", 'alt', { label: k + '′' }));

  const REGS = {
    '8008': [
      R8('A', 'acc'),
      { k: 'F', label: 'flag', bits: 4, role: 'flag', flags: 'C Z S P' },
    ].concat(GPR, [
      { k: 'PC', label: 'PC', bits: 14, role: 'ptr' },
      { k: 'stack', label: 'pila interna', bits: 14, role: 'stack', levels: 7 },
    ]),
    '8080': [
      R8('A', 'acc'),
      { k: 'F', label: 'F', bits: 8, role: 'flag', flags: 'S Z AC P CY' },
    ].concat(GPR, [
      { k: 'SP', label: 'SP', bits: 16, role: 'ptr' },
      { k: 'PC', label: 'PC', bits: 16, role: 'ptr' },
    ]),
    '6800': [
      R8('A', 'acc'),
      { k: 'F', label: 'CCR', bits: 8, role: 'flag', flags: 'H I N Z V C' },
      R8('B', 'acc'),
      { k: 'X', label: 'X', bits: 16, role: 'idx' },
      { k: 'SP', label: 'SP', bits: 16, role: 'ptr' },
      { k: 'PC', label: 'PC', bits: 16, role: 'ptr' },
    ],
    '6502': [
      R8('A', 'acc'),
      { k: 'F', label: 'P', bits: 8, role: 'flag', flags: 'N V B D I Z C' },
      R8('X', 'idx'),
      R8('Y', 'idx'),
      { k: 'SP', label: 'S', bits: 8, role: 'ptr' },
      { k: 'Shi', label: '01', bits: 8, role: 'ghost' },
      { k: 'PC', label: 'PC', bits: 16, role: 'ptr' },
      { k: 'zp', label: 'pagina zero', bits: 16, role: 'zp' },
    ],
    'z80': [
      R8('A', 'acc'),
      { k: 'F', label: 'F', bits: 8, role: 'flag', flags: 'S Z H P/V N C' },
    ].concat(GPR, ALT, [
      { k: 'IX', label: 'IX', bits: 16, role: 'idx' },
      { k: 'IY', label: 'IY', bits: 16, role: 'idx' },
      { k: 'SP', label: 'SP', bits: 16, role: 'ptr' },
      { k: 'PC', label: 'PC', bits: 16, role: 'ptr' },
      R8('I', 'sys'),
      R8('R', 'sys'),
    ]),
  };

  const ROLE_NAMES = {
    acc: 'accumulatore', gpr: 'registro generale', ptr: 'puntatore', idx: 'registro indice',
    flag: 'registro dei flag', alt: 'set alternativo', sys: 'registro speciale', stack: 'pila interna',
    ghost: 'byte fisso', zp: 'memoria veloce',
  };

  // Che cosa fa ogni registro: prima la voce specifica del chip, poi quella generica.
  const REG_TEXT = {
    'A': 'Accumulatore: il registro in cui nascono i risultati di somme, sottrazioni e operazioni logiche.',
    '8008/F': 'Quattro flag (riporto C, zero Z, segno S, parità P): bit che ricordano com’è andata l’ultima operazione e decidono i salti.',
    '8080/F': 'Flag: segno S, zero Z, riporto ausiliario AC, parità P e riporto CY. Con A forma la parola PSW, che si salva sulla pila in un colpo.',
    '6800/F': 'Codici di condizione (CCR): mezzo riporto H, maschera delle interruzioni I, negativo N, zero Z, traboccamento V e riporto C.',
    '6502/F': 'Registro di stato P: negativo N, traboccamento V, break B, modo decimale D, interruzioni I, zero Z e riporto C.',
    'z80/F': 'Flag: segno S, zero Z, mezzo riporto H, parità o traboccamento P/V, sottrazione N e riporto C.',
    'B': 'Registro generale da 8 bit. A coppie (BC, DE, HL) i registri diventano da 16 bit e possono contenere un indirizzo.',
    'C': 'Registro generale da 8 bit; con B forma la coppia BC, spesso usata come contatore.',
    'D': 'Registro generale da 8 bit; con E forma la coppia DE.',
    'E': 'Registro generale da 8 bit; con D forma la coppia DE.',
    'H': 'Con L forma HL, il puntatore alla memoria: istruzioni come MOV A,M leggono il byte all’indirizzo scritto in HL. H è il byte alto (high).',
    'L': 'Con H forma HL, il puntatore alla memoria. L è il byte basso (low).',
    '6800/B': 'Secondo accumulatore: il 6800 tiene due risultati intermedi senza passare dalla memoria, e ha istruzioni che lavorano tra A e B.',
    '6800/X': 'Registro indice da 16 bit: un indirizzo di partenza a cui l’istruzione aggiunge uno scostamento da 0 a 255. Comodo per scorrere tabelle.',
    '6502/X': 'Registro indice da 8 bit: si somma a un indirizzo scritto nell’istruzione, così si scorrono tabelle fino a 256 elementi.',
    '6502/Y': 'Secondo indice da 8 bit. Con X permette di copiare da una tabella all’altra, ed è l’unico che funziona con l’indirizzamento indiretto (zp),Y.',
    'SP': 'Stack pointer da 16 bit: indica la cima della pila, che sta in memoria. Ci finiscono gli indirizzi di ritorno dei sottoprogrammi e i registri salvati.',
    '6502/SP': 'Puntatore della pila da 8 bit: la pila sta sempre nella pagina 1, da 0100h a 01FFh. Il byte alto è fisso a 01, quindi bastano 8 bit.',
    '6502/Shi': 'Byte alto fisso dell’indirizzo della pila: vale sempre 01. Il 6502 risparmia così 8 bit di registro, ma la pila non può superare i 256 byte.',
    '8008/PC': 'Contatore di programma da 14 bit: l’indirizzo della prossima istruzione, fino a 16.384 byte di memoria.',
    'PC': 'Contatore di programma da 16 bit: l’indirizzo della prossima istruzione, fino a 65.536 byte di memoria.',
    '8008/stack': 'Pila interna: 7 registri da 14 bit dentro il chip, dove finiscono gli indirizzi di ritorno. Si possono annidare al massimo 7 sottoprogrammi, poi la pila trabocca.',
    'alt': 'Set alternativo: una copia di A, F, B, C, D, E, H e L. Le istruzioni EX AF,AF′ ed EXX lo scambiano con il principale in un colpo, per esempio per servire un’interruzione senza salvare nulla.',
    'IX': 'Registro indice da 16 bit: l’istruzione aggiunge uno scostamento, come in LD A,(IX+5). Utilissimo per i campi di una struttura in memoria.',
    'IY': 'Secondo registro indice da 16 bit, identico a IX.',
    'I': 'Registro I: la parte alta dell’indirizzo della tabella delle interruzioni (modo 2): ogni periferica può avere la sua routine.',
    'R': 'Registro di refresh: cresce da solo a ogni istruzione e il suo valore esce sul bus degli indirizzi per rinfrescare le DRAM, le memorie dinamiche che altrimenti dimenticano.',
    '6502/zp': 'Pagina zero: i primi 256 byte di memoria (0000h–00FFh). Non è un registro, ma le istruzioni che la usano hanno un indirizzo di 1 byte invece di 2: più corte e più veloci, quasi registri in più.',
  };

  function regsOf(chipId) { return (REGS[chipId] || []).slice(); }

  function regText(chipId, key) {
    const reg = (REGS[chipId] || []).find((r) => r.k === key);
    if (!reg) return '';
    return REG_TEXT[chipId + '/' + key] || (reg.role === 'alt' ? REG_TEXT.alt : REG_TEXT[key]) || '';
  }

  const CHIP_REG_NOTE = {
    '8008': 'Sette registri da 8 bit e una pila di 7 livelli dentro il chip: niente stack pointer. Per leggere la memoria bisogna prima scrivere l’indirizzo in H e L.',
    '8080': 'Gli stessi sette registri dell’8008, ma la pila esce dal chip: un puntatore SP da 16 bit la tiene in memoria, grande quanto serve.',
    '6800': 'Meno registri ma più “larghi”: due accumulatori A e B e un indice X da 16 bit. Il resto si fa con la memoria.',
    '6502': 'Il minimo indispensabile: A, X e Y da 8 bit, una pila corta. In cambio la pagina zero fa da magazzino veloce di 256 byte.',
    'z80': 'Tutti i registri dell’8080 più un secondo set da scambiare in un colpo, due indici da 16 bit e i registri I e R.',
  };

  /* Disposizione dei registri sul palco.
     mode 'wide': tre colonne (principali, alternativi o pagina zero, indirizzi e speciali);
     mode 'narrow': due colonne, con indirizzi e speciali sotto. Ogni chiave occupa sempre lo stesso posto,
     così passando da un chip all'altro le caselle comuni restano ferme o scivolano di poco. */
  const GEOM = {
    wide: { W: 640, U: 10, BH: 36, RG: 16, Y0: 62, X0: 30, X1: 238, X2: 446, H: 322 },
    // nella disposizione stretta i registri d'indirizzo vanno sotto: GAP lascia posto alla loro intestazione
    narrow: { W: 340, U: 8, BH: 32, RG: 14, Y0: 58, X0: 20, X1: 182, GAP: 26, H: 406 },
  };

  function layoutRegs(chipId, mode) {
    const narrow = mode === 'narrow';
    const g = GEOM[narrow ? 'narrow' : 'wide'];
    const U = g.U;
    const B8 = 8 * U;
    const row = (r) => g.Y0 + r * (g.BH + g.RG) + (narrow && r >= 4 ? g.GAP : 0);
    const items = {};
    const regs = REGS[chipId] || [];
    const has = (k) => regs.some((r) => r.k === k);
    // posto (colonna, riga, metà) per ogni chiave
    const c2x = narrow ? null : g.X2;
    function place(reg) {
      const w = reg.role === 'zp' ? 2 * B8 : reg.bits * U;
      let x = 0;
      let y = 0;
      let h = g.BH;
      switch (reg.k) {
        case 'A': x = g.X0; y = row(0); break;
        case 'F': x = g.X0 + B8; y = row(0); break;
        case 'B': x = g.X0; y = row(1); break;
        case 'C': x = g.X0 + B8; y = row(1); break;
        case 'D': x = g.X0; y = row(2); break;
        case 'E': x = g.X0 + B8; y = row(2); break;
        case 'H': x = g.X0; y = row(3); break;
        case 'L': x = g.X0 + B8; y = row(3); break;
        case 'X': x = g.X0; y = row(2); break;
        case 'Y': x = g.X0 + B8; y = row(2); break;
        case 'IX': x = narrow ? g.X0 : c2x; y = narrow ? row(4) : row(0); break;
        case 'IY': x = narrow ? g.X1 : c2x; y = narrow ? row(4) : row(1); break;
        case 'SP':
          if (reg.bits === 8) { x = (narrow ? g.X0 : c2x) + B8; } else { x = narrow ? g.X0 : c2x; }
          y = narrow ? row(5) : row(2);
          break;
        case 'Shi': x = narrow ? g.X0 : c2x; y = narrow ? row(5) : row(2); break;
        case 'PC': x = narrow ? g.X1 : c2x; y = narrow ? row(5) : row(3); break;
        case 'I': x = narrow ? g.X1 : c2x; y = narrow ? row(6) : row(4); break;
        case 'R': x = (narrow ? g.X1 : c2x) + B8; y = narrow ? row(6) : row(4); break;
        case 'stack':
          // 7 livelli impilati: occupa il posto di IX e IY (wide) o di IX e SP (narrow), che l'8008 non ha
          x = narrow ? g.X0 : c2x; y = narrow ? row(4) : row(0); h = 2 * g.BH + g.RG; break;
        case 'zp':
          x = g.X1; y = row(0); h = 2 * g.BH + g.RG; break;
        default:
          if (reg.role === 'alt') {
            const base = reg.k.replace("'", '');
            const pos = { A: [0, 0], F: [1, 0], B: [0, 1], C: [1, 1], D: [0, 2], E: [1, 2], H: [0, 3], L: [1, 3] }[base];
            x = g.X1 + pos[0] * B8; y = row(pos[1]);
          }
      }
      return { x: x, y: y, w: w, h: h };
    }
    regs.forEach((reg) => { items[reg.k] = Object.assign({ k: reg.k, label: reg.label, bits: reg.bits, role: reg.role, flags: reg.flags || '', levels: reg.levels || 0 }, place(reg)); });

    // intestazioni delle colonne
    const heads = [{ id: 'main', text: 'registri principali', x: g.X0, y: g.Y0 - 14 }];
    if (has("A'")) heads.push({ id: 'c1', text: 'set alternativo', x: g.X1, y: g.Y0 - 14 });
    if (has('zp')) heads.push({ id: 'c1', text: 'memoria veloce', x: g.X1, y: g.Y0 - 14 });
    const c2Items = ['IX', 'IY', 'SP', 'PC', 'I', 'R', 'stack', 'Shi'].filter(has);
    if (c2Items.length) {
      if (narrow) {
        const top = has('IX') || has('stack') ? 4 : 5;
        heads.push({ id: 'c2', text: 'indirizzi e registri speciali', x: g.X0, y: row(top) - 14 });
      } else {
        heads.push({ id: 'c2', text: 'indirizzi e registri speciali', x: g.X2, y: g.Y0 - 14 });
      }
    }
    return { width: g.W, height: g.H, unit: g.U, items: items, heads: heads };
  }

  /* Differenze tra due chip, in parole. */
  function diffRegs(fromId, toId) {
    const a = {};
    const b = {};
    (REGS[fromId] || []).forEach((r) => { a[r.k] = r; });
    (REGS[toId] || []).forEach((r) => { b[r.k] = r; });
    const added = Object.keys(b).filter((k) => !a[k]);
    const removed = Object.keys(a).filter((k) => !b[k]);
    const kept = Object.keys(b).filter((k) => a[k]);
    const resized = kept.filter((k) => a[k].bits !== b[k].bits).map((k) => ({ k: k, from: a[k].bits, to: b[k].bits }));
    const renamed = kept.filter((k) => a[k].label !== b[k].label).map((k) => ({ k: k, from: a[k].label, to: b[k].label }));
    const roled = kept.filter((k) => a[k].role !== b[k].role).map((k) => ({ k: k, from: a[k].role, to: b[k].role }));
    return { added: added, removed: removed, kept: kept, resized: resized, renamed: renamed, roled: roled };
  }

  function listIt(arr) {
    if (arr.length <= 1) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1];
  }

  const ROLE_PLURAL = {
    acc: 'accumulatori', gpr: 'registri generali', ptr: 'puntatori', idx: 'registri indice',
    sys: 'registri speciali', flag: 'registri dei flag',
  };

  // Raggruppa le chiavi per ruolo e numero di bit: [[reg, reg], [reg]] nell'ordine in cui compaiono.
  function groupRegs(keys, map) {
    const groups = [];
    keys.forEach((k) => {
      const r = map[k];
      const g = groups.find((x) => x[0].role === r.role && x[0].bits === r.bits);
      if (g) g.push(r); else groups.push([r]);
    });
    return groups;
  }

  // nome del ruolo di un gruppo di registri; SP da solo è «il puntatore della pila»
  function roleName(g) {
    if (g.length > 1) return ROLE_PLURAL[g[0].role];
    return g[0].k === 'SP' ? 'puntatore della pila' : ROLE_NAMES[g[0].role];
  }

  /** Frasi brevi che spiegano che cosa cambia passando da un chip all'altro: [{ kind: 'add'|'del'|'mod', text }]. */
  function describeDiff(fromId, toId) {
    if (fromId === toId) return [];
    const d = diffRegs(fromId, toId);
    const A = {};
    const B = {};
    (REGS[fromId] || []).forEach((r) => { A[r.k] = r; });
    (REGS[toId] || []).forEach((r) => { B[r.k] = r; });
    const out = [];
    const special = { zp: true, stack: true, ghost: true, alt: true };

    // aggiunte
    const alt = d.added.filter((k) => B[k].role === 'alt');
    if (alt.length) out.push({ kind: 'add', text: 'set alternativo di ' + alt.length + ' registri: ' + listIt(alt.map((k) => B[k].label)) });
    groupRegs(d.added.filter((k) => !special[B[k].role]), B).forEach((g) => {
      const names = listIt(g.map((r) => r.label));
      out.push({ kind: 'add', text: names + ': ' + roleName(g) + ' da ' + g[0].bits + ' bit' });
    });
    if (d.added.indexOf('zp') >= 0) out.push({ kind: 'add', text: 'pagina zero: 256 byte di memoria raggiunti con indirizzi da 1 byte' });
    if (d.added.indexOf('stack') >= 0) out.push({ kind: 'add', text: 'pila interna di 7 livelli, dentro il chip' });

    // eliminazioni
    const altGone = d.removed.filter((k) => A[k].role === 'alt');
    if (altGone.length) out.push({ kind: 'del', text: 'il set alternativo (' + altGone.length + ' registri)' });
    groupRegs(d.removed.filter((k) => !special[A[k].role]), A).forEach((g) => {
      const names = listIt(g.map((r) => r.label));
      out.push({ kind: 'del', text: names + ' (' + roleName(g) + ')' });
    });
    if (d.removed.indexOf('zp') >= 0) out.push({ kind: 'del', text: 'la pagina zero come scorciatoia' });
    if (d.removed.indexOf('stack') >= 0) out.push({ kind: 'del', text: 'la pila interna: ora la pila sta in memoria, indicata da SP' });

    // cambiamenti
    d.roled.forEach((c) => {
      if (c.k === 'B' && c.to === 'acc') out.push({ kind: 'mod', text: 'B diventa un secondo accumulatore' });
      else if (c.k === 'B' && c.from === 'acc') out.push({ kind: 'mod', text: 'B torna un registro generale' });
    });
    d.resized.forEach((c) => {
      if (c.k === 'F') return; // i flag cambiano numero di bit insieme al nome: vedi sotto
      if (c.k === 'SP' && c.to === 8) out.push({ kind: 'mod', text: 'la pila si accorcia: S ha 8 bit e il byte alto è fisso a 01' });
      else if (c.k === 'SP') out.push({ kind: 'mod', text: 'SP torna a 16 bit: la pila può stare ovunque in memoria' });
      else if (c.k === 'PC') out.push({ kind: 'mod', text: 'PC passa da ' + c.from + ' a ' + c.to + ' bit: la memoria va da ' + (c.from === 14 ? '16 a 64' : '64 a 16') + ' KB' });
      else out.push({ kind: 'mod', text: B[c.k].label + ' passa da ' + c.from + ' a ' + c.to + ' bit' });
    });
    const fl = d.renamed.find((c) => c.k === 'F');
    if (fl) out.push({ kind: 'mod', text: 'i flag stanno in ' + (fl.to === 'flag' ? '4 bit' : fl.to) + ': ' + B.F.flags });
    else if (A.F && B.F && A.F.flags !== B.F.flags) out.push({ kind: 'mod', text: 'flag diversi: ' + B.F.flags });
    return out;
  }

  /* ---------- la guerra dei prezzi (solo prezzi verificati) ---------- */

  // Mesi da gennaio 1974 (0) a dicembre 1976 (35).
  const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const T_MAX = 35;
  function monthLabel(t) {
    const m = Math.max(0, Math.min(T_MAX, Math.round(t)));
    return MONTHS[m % 12] + ' ' + (1974 + Math.floor(m / 12));
  }

  // Punti verificati: 8080 a 360 $ (aprile 1974, Intel); 6800 a circa 360 $ (1974); alla WESCON di settembre 1975
  // il 6502 a 25 $ (6501 a 20) mentre 8080 e 6800 costano "quasi 200 dollari" (IEEE Spectrum).
  const PRICE_SERIES = {
    '8080': [{ t: 3, p: 360, approx: false }, { t: 20, p: 200, approx: true }],
    '6800': [{ t: 2, p: 360, approx: true }, { t: 20, p: 200, approx: true }],
    '6502': [{ t: 20, p: 25, approx: false }],
  };

  const PRICE_EVENTS = [
    { t: 2, id: 'm6800', title: 'Arriva il Motorola 6800', text: 'Marzo 1974: Motorola annuncia il 6800, con una sola alimentazione da +5 V. Il prezzo di lancio è di circa 360 dollari.', say: 'Primavera 1974: il Motorola 6800 costa circa 360 dollari.' },
    { t: 3, id: 'i8080', title: 'Intel lancia l’8080', text: 'Aprile 1974: l’8080 costa 360 dollari. Due anni prima l’8008 ne costava 120: il chip migliore ha un listino più alto.', say: 'Aprile 1974: l’Intel 8080 costa 360 dollari.' },
    { t: 20, id: 'm6502', title: 'Il 6502 a 25 dollari', text: 'Settembre 1975, fiera WESCON: MOS vende il 6502 a 25 dollari e il 6501 a 20. Intanto 8080 e 6800 sono scesi a quasi 200 dollari, ma costano ancora otto volte tanto. Motorola risponde tagliando il prezzo del 6800 e facendo causa a MOS per il 6501.', say: 'Settembre 1975: il 6502 costa 25 dollari, otto volte meno di 8080 e 6800.' },
    { t: 30, id: 'z80', title: 'Arriva lo Z80', text: 'Luglio 1976: Zilog lancia lo Z80, compatibile con l’8080 e con una sola alimentazione. I listini continuano a scendere, ma per i prezzi di questi mesi le fonti danno cifre diverse: qui non le riportiamo.', say: 'Luglio 1976: arriva lo Z80. I prezzi continuano a scendere.' },
  ];

  /** Il prezzo noto di un chip al mese t: { p, approx, since } oppure null se non è ancora in vendita. */
  function priceAt(chipId, t) {
    const s = PRICE_SERIES[chipId];
    if (!s) return null;
    let last = null;
    s.forEach((pt) => { if (t >= pt.t) last = pt; });
    return last ? { p: last.p, approx: last.approx, since: last.t } : null;
  }

  /** L'ultimo evento avvenuto al mese t (o null) e l'indice del prossimo. */
  function eventAt(t) {
    let idx = -1;
    PRICE_EVENTS.forEach((e, i) => { if (t >= e.t) idx = i; });
    return { index: idx, event: idx >= 0 ? PRICE_EVENTS[idx] : null, next: idx + 1 < PRICE_EVENTS.length ? PRICE_EVENTS[idx + 1] : null };
  }

  /* ---------- la sfida: somma due byte in memoria ---------- */

  const ADDR = { zp: 0x0080, abs: 0x1200 };
  const START = { a: 23, b: 19 };
  const CLOCK = { '8080': 2, '6502': 1, 'z80': 2.5 };
  const CYCLE_WORD = { '8080': 'stati', '6502': 'cicli', 'z80': 'T-state' };

  // Byte e cicli dai manuali originali (Intel 8080 Microcomputer Systems User's Manual, MCS6500 Programming Manual,
  // Zilog Z80 CPU User Manual).
  function program(chipId, variant) {
    const base = ADDR[variant === 'abs' ? 'abs' : 'zp'];
    const lo = base & 0xFF;
    const hi = base >> 8;
    const h4 = hex(base, 4) + 'h';
    if (chipId === '8080') {
      return [
        { op: 'lxi', asm: 'LXI H,' + h4, bytes: [0x21, lo, hi], cycles: 10, note: 'HL punta al primo numero' },
        { op: 'movam', asm: 'MOV A,M', bytes: [0x7E], cycles: 7, note: 'copia in A il byte puntato da HL' },
        { op: 'inx', asm: 'INX H', bytes: [0x23], cycles: 5, note: 'HL passa al byte dopo' },
        { op: 'add', asm: 'ADD M', bytes: [0x86], cycles: 7, note: 'somma ad A il byte puntato da HL' },
        { op: 'inx', asm: 'INX H', bytes: [0x23], cycles: 5, note: 'HL passa al byte dopo' },
        { op: 'movma', asm: 'MOV M,A', bytes: [0x77], cycles: 7, note: 'scrive A nel byte puntato da HL' },
      ];
    }
    if (chipId === 'z80') {
      return [
        { op: 'lxi', asm: 'LD HL,' + h4, bytes: [0x21, lo, hi], cycles: 10, note: 'HL punta al primo numero' },
        { op: 'movam', asm: 'LD A,(HL)', bytes: [0x7E], cycles: 7, note: 'copia in A il byte puntato da HL' },
        { op: 'inx', asm: 'INC HL', bytes: [0x23], cycles: 6, note: 'HL passa al byte dopo' },
        { op: 'add', asm: 'ADD A,(HL)', bytes: [0x86], cycles: 7, note: 'somma ad A il byte puntato da HL' },
        { op: 'inx', asm: 'INC HL', bytes: [0x23], cycles: 6, note: 'HL passa al byte dopo' },
        { op: 'movma', asm: 'LD (HL),A', bytes: [0x77], cycles: 7, note: 'scrive A nel byte puntato da HL' },
      ];
    }
    if (chipId === '6502') {
      const zp = variant !== 'abs';
      const opnd = (off) => (zp ? '$' + hex(lo + off, 2) : '$' + hex(base + off, 4));
      const b = (opZp, opAbs, off) => (zp ? [opZp, lo + off] : [opAbs, (base + off) & 0xFF, (base + off) >> 8]);
      return [
        { op: 'clc', asm: 'CLC', bytes: [0x18], cycles: 2, note: 'azzera il riporto C' },
        { op: 'lda', asm: 'LDA ' + opnd(0), bytes: b(0xA5, 0xAD, 0), cycles: zp ? 3 : 4, note: 'carica in A il primo numero' },
        { op: 'adc', asm: 'ADC ' + opnd(1), bytes: b(0x65, 0x6D, 1), cycles: zp ? 3 : 4, note: 'somma ad A il secondo numero e il riporto' },
        { op: 'sta', asm: 'STA ' + opnd(2), bytes: b(0x85, 0x8D, 2), cycles: zp ? 3 : 4, note: 'scrive A dopo i due numeri' },
      ];
    }
    return [];
  }

  function totals(chipId, variant) {
    const p = program(chipId, variant);
    const bytes = p.reduce((a, i) => a + i.bytes.length, 0);
    const cycles = p.reduce((a, i) => a + i.cycles, 0);
    const mhz = CLOCK[chipId];
    return { bytes: bytes, cycles: cycles, mhz: mhz, us: cycles / mhz };
  }

  // Generatore pseudo-casuale con seme (stesso mescolamento a parità di seme).
  function rng(seed) {
    let x = (seed >>> 0) || 1;
    return function () {
      x ^= x << 13; x >>>= 0;
      x ^= x >>> 17;
      x ^= x << 5; x >>>= 0;
      return x / 4294967296;
    };
  }

  /** Mescola le istruzioni di un chip: restituisce gli indici (0..n-1) in un ordine che NON risolve il compito. */
  function shuffled(chipId, seed) {
    const n = program(chipId, 'zp').length;
    const rand = rng(seed == null ? 7 : seed);
    for (let attempt = 0; attempt < 50; attempt++) {
      const idx = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
      }
      if (!run(chipId, idx).ok) return idx;
    }
    return Array.from({ length: n }, (_, i) => n - 1 - i);
  }

  function hl(s) { return (s.H << 8) | s.L; }

  /**
   * Esegue l'ordine scelto (indici nel programma del chip).
   * Restituisce { ok, expected, result, steps: [{ i, op, asm, bytes, cycles, before, after, reads, writes }], bytes, cycles, mem }.
   */
  function run(chipId, order, variant) {
    const prog = program(chipId, variant);
    const base = ADDR[variant === 'abs' ? 'abs' : 'zp'];
    const mem = {};
    mem[base] = START.a;
    mem[base + 1] = START.b;
    mem[base + 2] = 0;
    // C = 1: un riporto rimasto acceso da un calcolo precedente (per questo il 6502 vuole CLC)
    const s = { A: 0, H: 0, L: 0, C: 1 };
    const rd = (addr) => (mem[addr] == null ? 0 : mem[addr]);
    const steps = [];
    let bytes = 0;
    let cycles = 0;
    order.forEach((pi) => {
      const ins = prog[pi];
      if (!ins) return;
      const before = Object.assign({}, s);
      const reads = [];
      const writes = [];
      switch (ins.op) {
        case 'lxi': s.H = base >> 8; s.L = base & 0xFF; break;
        case 'movam': { const a = hl(s); const v = rd(a); reads.push({ addr: a, val: v }); s.A = v; break; }
        case 'inx': { const a = (hl(s) + 1) & 0xFFFF; s.H = a >> 8; s.L = a & 0xFF; break; }
        case 'add': { const a = hl(s); const v = rd(a); reads.push({ addr: a, val: v }); const r = s.A + v; s.A = r & 0xFF; s.C = r > 0xFF ? 1 : 0; break; }
        case 'movma': { const a = hl(s); mem[a] = s.A; writes.push({ addr: a, val: s.A }); break; }
        case 'clc': s.C = 0; break;
        case 'lda': { const a = base; const v = rd(a); reads.push({ addr: a, val: v }); s.A = v; break; }
        case 'adc': { const a = base + 1; const v = rd(a); reads.push({ addr: a, val: v }); const r = s.A + v + s.C; s.A = r & 0xFF; s.C = r > 0xFF ? 1 : 0; break; }
        case 'sta': { const a = base + 2; mem[a] = s.A; writes.push({ addr: a, val: s.A }); break; }
        default: break;
      }
      bytes += ins.bytes.length;
      cycles += ins.cycles;
      steps.push({ i: pi, op: ins.op, asm: ins.asm, bytes: ins.bytes, cycles: ins.cycles, before: before, after: Object.assign({}, s), reads: reads, writes: writes });
    });
    const expected = (START.a + START.b) & 0xFF;
    const result = rd(base + 2);
    const complete = order.length === prog.length && new Set(order).size === prog.length;
    return { ok: complete && result === expected, complete: complete, expected: expected, result: result, steps: steps, bytes: bytes, cycles: cycles, mem: mem, base: base };
  }

  function addrText(chipId, a) { return chipId === '6502' ? '$' + hex(a, 4) : hex(a, 4) + 'h'; }

  /** Perché un ordine non funziona, in una frase: { code, text }. ok:true se funziona. */
  function diagnose(chipId, order, variant) {
    const r = run(chipId, order, variant);
    if (r.ok) return { ok: true, code: 'ok', text: '' };
    const base = r.base;
    const at = (a) => addrText(chipId, a);
    const ops = r.steps.map((st) => st.op);
    const first = (op) => ops.indexOf(op);
    if (chipId === '6502') {
      if (first('sta') < first('adc')) return { ok: false, code: 'store-early', text: 'STA ha scritto A in ' + at(base + 2) + ' prima della somma: ci è finito ' + r.result + ', non ' + r.expected + '.' };
      if (first('lda') > first('adc')) return { ok: false, code: 'load-late', text: 'ADC ha sommato a un A ancora vuoto, poi LDA ha sovrascritto tutto: il risultato è andato perso.' };
      if (first('clc') > first('adc')) return { ok: false, code: 'carry', text: 'ADC ha sommato anche il riporto C, che era ancora a 1: in ' + at(base + 2) + ' c’è ' + r.result + ' invece di ' + r.expected + '. CLC deve venire prima di ADC.' };
      return { ok: false, code: 'other', text: 'Il risultato in ' + at(base + 2) + ' è ' + r.result + ' invece di ' + r.expected + '.' };
    }
    // 8080 e Z80: tutto passa da HL
    const name = (op) => program(chipId, variant).find((i) => i.op === op).asm;
    if (ops[0] !== 'lxi') {
      const st = r.steps[0];
      return { ok: false, code: 'no-pointer', text: name(st.op) + ' è partita con HL ancora a 0000h: prima di tutto ' + name('lxi') + ' deve far puntare HL ai numeri.' };
    }
    const load = r.steps.find((st) => st.op === 'movam');
    const add = r.steps.find((st) => st.op === 'add');
    const store = r.steps.find((st) => st.op === 'movma');
    if (first('movma') < first('add')) {
      const w = store.writes[0];
      const lost = w.addr === base ? ': ha cancellato il primo numero' : w.addr === base + 1 ? ': ha cancellato il secondo numero' : '';
      return { ok: false, code: 'store-early', text: name('movma') + ' ha scritto ' + w.val + ' in ' + at(w.addr) + ' prima della somma' + lost + '. La scrittura va per ultima.' };
    }
    if (first('add') < first('movam')) return { ok: false, code: 'load-late', text: name('add') + ' ha sommato a un A ancora vuoto, poi ' + name('movam') + ' l’ha sovrascritto.' };
    if (load && load.reads[0].addr !== base) return { ok: false, code: 'bad-load', text: name('movam') + ' ha letto ' + at(load.reads[0].addr) + ' invece di ' + at(base) + ': HL era già andato avanti.' };
    if (add && add.reads[0].addr !== base + 1) return { ok: false, code: 'bad-add', text: name('add') + ' ha sommato il byte in ' + at(add.reads[0].addr) + ' invece di quello in ' + at(base + 1) + ': controlla dove metti ' + name('inx') + '.' };
    if (store && store.writes[0].addr !== base + 2) return { ok: false, code: 'bad-store', text: name('movma') + ' ha scritto in ' + at(store.writes[0].addr) + ' invece che in ' + at(base + 2) + ': HL deve avanzare due volte.' };
    return { ok: false, code: 'other', text: 'Il risultato in ' + at(base + 2) + ' è ' + r.result + ' invece di ' + r.expected + '.' };
  }

  /** Racconto di un passo eseguito, per il pannello di spiegazione. */
  function narrate(chipId, step, variant) {
    const at = (a) => addrText(chipId, a);
    const unit = CYCLE_WORD[chipId];
    const tail = ' ' + step.bytes.length + (step.bytes.length === 1 ? ' byte, ' : ' byte, ') + step.cycles + ' ' + unit + '.';
    const a = step.after;
    const b = step.before;
    const base = ADDR[variant === 'abs' ? 'abs' : 'zp'];
    switch (step.op) {
      case 'lxi': return step.asm + ' carica in HL l’indirizzo ' + at(base) + ': ora HL punta al primo numero.' + tail;
      case 'movam': return step.asm + ' legge la cella ' + at(step.reads[0].addr) + ', indicata da HL, e copia ' + step.reads[0].val + ' in A.' + tail;
      case 'inx': return step.asm + ' aggiunge 1 a HL: ora punta a ' + at((a.H << 8) | a.L) + '.' + (chipId === 'z80' ? ' Sullo Z80 costa un T-state in più che sull’8080.' : '') + tail;
      case 'add': return step.asm + ' somma ad A il byte in ' + at(step.reads[0].addr) + ': ' + b.A + ' + ' + step.reads[0].val + ' = ' + a.A + '.' + tail;
      case 'movma': return step.asm + ' scrive ' + a.A + ' nella cella ' + at(step.writes[0].addr) + ', quella indicata da HL.' + tail;
      case 'clc': return 'CLC azzera il riporto C (era ' + b.C + '): ADC somma sempre anche C, quindi va spento prima.' + tail;
      case 'lda': return step.asm + ' carica in A il byte in ' + at(step.reads[0].addr) + ': ' + step.reads[0].val + '.' + (variant === 'abs' ? '' : ' Siamo in pagina zero: l’indirizzo occupa un byte solo.') + tail;
      case 'adc': return step.asm + ' somma ad A il byte in ' + at(step.reads[0].addr) + ' e il riporto: ' + b.A + ' + ' + step.reads[0].val + ' + ' + b.C + ' = ' + a.A + '.' + tail;
      case 'sta': return step.asm + ' scrive ' + a.A + ' nella cella ' + at(step.writes[0].addr) + '.' + tail;
      default: return step.asm + '.' + tail;
    }
  }

  /** Il chip migliore per una misura ('bytes', 'cycles', 'us') tra quelli dati (in caso di parità: tutti i migliori). */
  function best(measure, variant, chips) {
    const ids = chips || ['8080', '6502', 'z80'];
    let min = Infinity;
    ids.forEach((id) => { min = Math.min(min, totals(id, variant)[measure]); });
    return ids.filter((id) => Math.abs(totals(id, variant)[measure] - min) < 1e-9);
  }

  const api = {
    num: num, dec: dec, hex: hex,
    RAILS: RAILS, CHIPS: CHIPS, CHIP: CHIP, railsText: railsText,
    REGS: REGS, ROLE_NAMES: ROLE_NAMES, regsOf: regsOf, regText: regText, CHIP_REG_NOTE: CHIP_REG_NOTE,
    GEOM: GEOM, layoutRegs: layoutRegs, diffRegs: diffRegs, describeDiff: describeDiff,
    T_MAX: T_MAX, monthLabel: monthLabel, PRICE_SERIES: PRICE_SERIES, PRICE_EVENTS: PRICE_EVENTS, priceAt: priceAt, eventAt: eventAt,
    ADDR: ADDR, START: START, CLOCK: CLOCK, CYCLE_WORD: CYCLE_WORD,
    program: program, totals: totals, shuffled: shuffled, run: run, diagnose: diagnose, narrate: narrate, best: best, addrText: addrText,
  };

  root.OttoBit = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
