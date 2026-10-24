/*
 * Storia del PC · capitolo 3 (primi-pc): dati e logica pura, senza DOM.
 *
 * Contiene:
 *  - un Intel 8080 che lavora a cicli macchina, così come lo vedeva il pannello
 *    frontale dell'Altair 8800 (indirizzo, dato e parola di stato di ogni ciclo);
 *  - la logica degli interruttori del pannello (EXAMINE, DEPOSIT, RESET, RUN,
 *    STOP, SINGLE STEP, PROTECT...) su una memoria di 256 byte;
 *  - i programmi d'esempio (la somma del manuale MITS e Kill the Bit, 1975);
 *  - le missioni guidate del laboratorio e i testi che raccontano ogni azione;
 *  - le funzioni di formattazione in ottale, binario e decimale.
 */
(function (root) {
  'use strict';

  const DIM_MEMORIA = 256;          // l'Altair di base aveva 256 byte di RAM
  const FREQUENZA = 2000000;        // l'Intel 8080 dell'Altair andava a 2 MHz
  const PORTA_INTERRUTTORI = 0o377; // IN 377 legge gli interruttori 15-8 ("sense switches")
  const VUOTO = 0o377;              // dove non c'è memoria il bus si legge come 377

  /* ---------- numeri: ottale, binario, decimale ---------- */

  // 58 -> "072"
  function ottale(n, cifre) {
    const c = cifre || 3;
    const s = (Number(n) >>> 0).toString(8);
    return s.length >= c ? s : '0'.repeat(c - s.length) + s;
  }

  // Indirizzo in ottale: tre cifre nel primo blocco di 256 byte, sei cifre oltre.
  function ottaleIndirizzo(a) {
    const v = Number(a) & 0xffff;
    return v < 256 ? ottale(v, 3) : ottale(v, 6);
  }

  // Binario raggruppato a tre bit da destra, come le cifre ottali: 58 -> "00 111 010".
  function binario(n, bit) {
    const b = bit || 8;
    let s = '';
    for (let i = b - 1; i >= 0; i--) {
      s += (n >> i) & 1;
      if (i > 0 && i % 3 === 0) s += ' ';
    }
    return s;
  }

  // "072" -> 58; NaN se il testo contiene cifre che in ottale non esistono (8 e 9).
  function daOttale(testo) {
    const t = String(testo).replace(/\s+/g, '');
    if (!/^[0-7]+$/.test(t)) return NaN;
    return parseInt(t, 8);
  }

  function contaBit(v) {
    let n = 0;
    for (let x = v; x; x >>= 1) n += x & 1;
    return n;
  }

  /* ---------- l'Intel 8080 ---------- */

  // Parità pari: 1 se il byte ha un numero pari di bit a 1 (bandiera P dell'8080).
  const PARITA = new Uint8Array(256);
  for (let i = 0; i < 256; i++) PARITA[i] = contaBit(i) % 2 === 0 ? 1 : 0;

  // Bit della parola di stato che l'8080 mette sul bus all'inizio di ogni ciclo
  // macchina: il pannello dell'Altair la mostra con i LED di stato.
  const ST = { INT: 1, WO: 2, STACK: 4, HLTA: 8, OUT: 16, M1: 32, INP: 64, MEMR: 128 };
  const STATO_CICLO = {
    codice: ST.MEMR | ST.M1 | ST.WO,    // lettura del codice operativo (ciclo M1)
    lettura: ST.MEMR | ST.WO,           // lettura dalla memoria
    scrittura: 0,                       // scrittura in memoria (WO è attivo basso: LED spento)
    pilaLettura: ST.MEMR | ST.STACK | ST.WO,
    pilaScrittura: ST.STACK,
    ingresso: ST.INP | ST.WO,
    uscita: ST.OUT,
    halt: ST.MEMR | ST.HLTA | ST.WO,    // riconoscimento di HLT
  };
  const LED_STATO = ['INTE', 'PROT', 'MEMR', 'INP', 'M1', 'OUT', 'HLTA', 'STACK', 'WO', 'INT', 'WAIT', 'HLDA'];

  function registri() {
    return { a: 0, b: 0, c: 0, d: 0, e: 0, h: 0, l: 0, sp: 0, pc: 0, s: 0, z: 0, ac: 0, p: 0, cy: 0, inte: 0, halt: 0 };
  }

  function zsp(r, v) { r.z = v === 0 ? 1 : 0; r.s = v >> 7; r.p = PARITA[v]; }
  function inc16(v) { return (v + 1) & 0xffff; }
  function dec16(v) { return (v - 1) & 0xffff; }
  function hl(r) { return (r.h << 8) | r.l; }

  // Registri a 8 bit nell'ordine della codifica dell'8080: B C D E H L M A (M = memoria in HL).
  function leggiReg(r, i, bus) {
    switch (i) {
      case 0: return r.b;
      case 1: return r.c;
      case 2: return r.d;
      case 3: return r.e;
      case 4: return r.h;
      case 5: return r.l;
      case 6: return bus.leggi(hl(r), 'mem');
      default: return r.a;
    }
  }

  function scriviReg(r, i, v, bus) {
    switch (i) {
      case 0: r.b = v; break;
      case 1: r.c = v; break;
      case 2: r.d = v; break;
      case 3: r.e = v; break;
      case 4: r.h = v; break;
      case 5: r.l = v; break;
      case 6: bus.scrivi(hl(r), v, 'mem'); break;
      default: r.a = v;
    }
  }

  // Coppie: 0 = BC, 1 = DE, 2 = HL, 3 = SP (oppure PSW per PUSH e POP).
  function coppia(r, i, psw) {
    switch (i) {
      case 0: return (r.b << 8) | r.c;
      case 1: return (r.d << 8) | r.e;
      case 2: return (r.h << 8) | r.l;
      default: return psw ? ((r.a << 8) | parolaStato(r)) : r.sp;
    }
  }

  function impostaCoppia(r, i, v, psw) {
    const hi = (v >> 8) & 255, lo = v & 255;
    switch (i) {
      case 0: r.b = hi; r.c = lo; break;
      case 1: r.d = hi; r.e = lo; break;
      case 2: r.h = hi; r.l = lo; break;
      default:
        if (psw) {
          r.a = hi;
          r.s = (lo >> 7) & 1; r.z = (lo >> 6) & 1; r.ac = (lo >> 4) & 1; r.p = (lo >> 2) & 1; r.cy = lo & 1;
        } else r.sp = v & 0xffff;
    }
  }

  // Byte delle bandiere come lo salva PUSH PSW: S Z 0 AC 0 P 1 CY.
  function parolaStato(r) { return (r.s << 7) | (r.z << 6) | (r.ac << 4) | (r.p << 2) | 2 | r.cy; }

  function condizione(r, y) {
    switch (y) {
      case 0: return !r.z;   // NZ
      case 1: return !!r.z;  // Z
      case 2: return !r.cy;  // NC
      case 3: return !!r.cy; // C
      case 4: return !r.p;   // PO
      case 5: return !!r.p;  // PE
      case 6: return !r.s;   // P
      default: return !!r.s; // M
    }
  }

  // Le otto operazioni aritmetiche e logiche: ADD ADC SUB SBB ANA XRA ORA CMP.
  function alu(r, op, v) {
    const a = r.a;
    switch (op) {
      case 0: case 1: {
        const c = op === 1 ? r.cy : 0;
        const ris = a + v + c;
        r.ac = ((a & 15) + (v & 15) + c) > 15 ? 1 : 0;
        r.cy = ris > 255 ? 1 : 0;
        r.a = ris & 255;
        zsp(r, r.a);
        return;
      }
      case 2: case 3: case 7: {
        // L'8080 sottrae sommando il complemento: CY alla fine indica il prestito.
        const c = op === 3 ? r.cy : 0;
        const nv = (~v) & 255;
        const ris = a + nv + (1 - c);
        r.ac = ((a & 15) + (nv & 15) + (1 - c)) > 15 ? 1 : 0;
        r.cy = ris > 255 ? 0 : 1;
        const v8 = ris & 255;
        zsp(r, v8);
        if (op !== 7) r.a = v8;
        return;
      }
      case 4: r.ac = ((a | v) & 8) ? 1 : 0; r.a = a & v; r.cy = 0; zsp(r, r.a); return;
      case 5: r.a = a ^ v; r.cy = 0; r.ac = 0; zsp(r, r.a); return;
      default: r.a = a | v; r.cy = 0; r.ac = 0; zsp(r, r.a);
    }
  }

  function indirizzo16(r, bus) {
    const lo = bus.leggi(r.pc, 'basso');
    r.pc = inc16(r.pc);
    const hi = bus.leggi(r.pc, 'alto');
    r.pc = inc16(r.pc);
    return (hi << 8) | lo;
  }

  function chiama(r, bus, a) {
    r.sp = dec16(r.sp); bus.pilaScrivi(r.sp, r.pc >> 8);
    r.sp = dec16(r.sp); bus.pilaScrivi(r.sp, r.pc & 255);
    r.pc = a;
  }

  function ritorna(r, bus) {
    const lo = bus.pilaLeggi(r.sp); r.sp = inc16(r.sp);
    const hi = bus.pilaLeggi(r.sp); r.sp = inc16(r.sp);
    r.pc = (hi << 8) | lo;
  }

  /*
   * Esegue un'istruzione. Ogni accesso al bus passa da "bus", che decide se
   * eseguire davvero (corsa veloce) o solo registrare i cicli (passo singolo):
   *   codice(a)  ciclo M1, 4 stati      leggi(a)/scrivi(a,v)     3 stati
   *   pilaLeggi / pilaScrivi            ingresso(p) / uscita(p,v)
   *   halt(a)    riconoscimento HLT     extra(n)  stati interni in più
   * I tempi sono quelli della documentazione Intel (per esempio LDA = 13 stati).
   */
  function istruzione(r, bus) {
    const op = bus.codice(r.pc);
    r.pc = inc16(r.pc);
    const x = op >> 6, y = (op >> 3) & 7, z = op & 7;

    if (x === 1) {
      if (op === 0o166) { r.halt = 1; bus.halt(r.pc); return; }               // HLT
      if (z === 6) { scriviReg(r, y, bus.leggi(hl(r), 'mem'), bus); return; } // MOV r,M
      if (y === 6) { bus.scrivi(hl(r), leggiReg(r, z, bus), 'mem'); return; } // MOV M,r
      bus.extra(1);                                                           // MOV r,r (5 stati)
      scriviReg(r, y, leggiReg(r, z, bus), bus);
      return;
    }

    if (x === 2) { alu(r, y, leggiReg(r, z, bus)); return; }

    if (x === 0) {
      switch (z) {
        case 0: return; // NOP (010...070 sono NOP non documentati)
        case 1:
          if (y & 1) { // DAD: HL = HL + coppia
            const v = hl(r) + coppia(r, y >> 1);
            r.cy = v > 0xffff ? 1 : 0;
            impostaCoppia(r, 2, v & 0xffff);
            bus.extra(6);
          } else { // LXI
            impostaCoppia(r, y >> 1, indirizzo16(r, bus));
          }
          return;
        case 2:
          switch (y) {
            case 0: bus.scrivi((r.b << 8) | r.c, r.a, 'mem'); return; // STAX B
            case 1: r.a = bus.leggi((r.b << 8) | r.c, 'mem'); return; // LDAX B
            case 2: bus.scrivi((r.d << 8) | r.e, r.a, 'mem'); return; // STAX D
            case 3: r.a = bus.leggi((r.d << 8) | r.e, 'mem'); return; // LDAX D
            case 4: { const a = indirizzo16(r, bus); bus.scrivi(a, r.l, 'mem'); bus.scrivi(inc16(a), r.h, 'mem'); return; } // SHLD
            case 5: { const a = indirizzo16(r, bus); r.l = bus.leggi(a, 'mem'); r.h = bus.leggi(inc16(a), 'mem'); return; } // LHLD
            case 6: { const a = indirizzo16(r, bus); bus.scrivi(a, r.a, 'mem'); return; } // STA
            default: { const a = indirizzo16(r, bus); r.a = bus.leggi(a, 'mem'); return; } // LDA
          }
        case 3: // INX / DCX
          bus.extra(1);
          impostaCoppia(r, y >> 1, (coppia(r, y >> 1) + ((y & 1) ? 0xffff : 1)) & 0xffff);
          return;
        case 4: case 5: { // INR / DCR (CY non cambia)
          let v;
          if (y === 6) v = bus.leggi(hl(r), 'mem');
          else { v = leggiReg(r, y, bus); bus.extra(1); }
          let ris;
          if (z === 4) { ris = (v + 1) & 255; r.ac = (v & 15) === 15 ? 1 : 0; }
          else { ris = (v - 1) & 255; r.ac = (v & 15) !== 0 ? 1 : 0; }
          zsp(r, ris);
          scriviReg(r, y, ris, bus);
          return;
        }
        case 6: { // MVI
          const v = bus.leggi(r.pc, 'imm');
          r.pc = inc16(r.pc);
          scriviReg(r, y, v, bus);
          return;
        }
        default:
          switch (y) {
            case 0: r.cy = r.a >> 7; r.a = ((r.a << 1) | r.cy) & 255; return;          // RLC
            case 1: r.cy = r.a & 1; r.a = (r.a >> 1) | (r.cy << 7); return;            // RRC
            case 2: { const c = r.cy; r.cy = r.a >> 7; r.a = ((r.a << 1) | c) & 255; return; } // RAL
            case 3: { const c = r.cy; r.cy = r.a & 1; r.a = (r.a >> 1) | (c << 7); return; }   // RAR
            case 4: { // DAA: corregge A dopo una somma in decimale codificato in binario
              const a = r.a, basso = a & 15, alto = a >> 4;
              let corr = 0, cy = r.cy;
              if (r.ac || basso > 9) corr |= 0x06;
              if (r.cy || alto > 9 || (alto >= 9 && basso > 9)) { corr |= 0x60; cy = 1; }
              r.ac = ((a & 15) + (corr & 15)) > 15 ? 1 : 0;
              r.a = (a + corr) & 255;
              r.cy = cy;
              zsp(r, r.a);
              return;
            }
            case 5: r.a = (~r.a) & 255; return; // CMA
            case 6: r.cy = 1; return;           // STC
            default: r.cy ^= 1;                 // CMC
          }
          return;
      }
    }

    // x === 3
    switch (z) {
      case 0: // Rcc: ritorno condizionato
        bus.extra(1);
        if (condizione(r, y)) ritorna(r, bus);
        return;
      case 1:
        if (!(y & 1)) { // POP
          const lo = bus.pilaLeggi(r.sp); r.sp = inc16(r.sp);
          const hi = bus.pilaLeggi(r.sp); r.sp = inc16(r.sp);
          impostaCoppia(r, y >> 1, (hi << 8) | lo, true);
          return;
        }
        if (y === 1 || y === 3) { ritorna(r, bus); return; } // RET
        bus.extra(1);
        if (y === 5) r.pc = hl(r); // PCHL
        else r.sp = hl(r);         // SPHL
        return;
      case 2: { const a = indirizzo16(r, bus); if (condizione(r, y)) r.pc = a; return; } // Jcc
      case 3:
        switch (y) {
          case 0: case 1: r.pc = indirizzo16(r, bus); return; // JMP
          case 2: { const p = bus.leggi(r.pc, 'porta'); r.pc = inc16(r.pc); bus.uscita(p, r.a); return; } // OUT
          case 3: { const p = bus.leggi(r.pc, 'porta'); r.pc = inc16(r.pc); r.a = bus.ingresso(p); return; } // IN
          case 4: { // XTHL
            const lo = bus.pilaLeggi(r.sp), hi = bus.pilaLeggi(inc16(r.sp));
            bus.pilaScrivi(inc16(r.sp), r.h);
            bus.pilaScrivi(r.sp, r.l);
            bus.extra(2);
            r.l = lo; r.h = hi;
            return;
          }
          case 5: { const d = r.d, e = r.e; r.d = r.h; r.e = r.l; r.h = d; r.l = e; return; } // XCHG
          case 6: r.inte = 0; return; // DI
          default: r.inte = 1; return; // EI
        }
      case 4: { // Ccc: chiamata condizionata
        bus.extra(1);
        const a = indirizzo16(r, bus);
        if (condizione(r, y)) chiama(r, bus, a);
        return;
      }
      case 5:
        bus.extra(1);
        if (!(y & 1)) { // PUSH
          const v = coppia(r, y >> 1, true);
          r.sp = dec16(r.sp); bus.pilaScrivi(r.sp, v >> 8);
          r.sp = dec16(r.sp); bus.pilaScrivi(r.sp, v & 255);
          return;
        }
        chiama(r, bus, indirizzo16(r, bus)); // CALL
        return;
      case 6: { const v = bus.leggi(r.pc, 'imm'); r.pc = inc16(r.pc); alu(r, y, v); return; } // ADI ... CPI
      default: bus.extra(1); chiama(r, bus, y << 3); // RST
    }
  }

  /* ---------- disassemblatore (con le spiegazioni in italiano) ---------- */

  const REG = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
  const COPPIE = ['B', 'D', 'H', 'SP'];
  const COPPIE_PILA = ['B', 'D', 'H', 'PSW'];
  const ALU_NOMI = ['ADD', 'ADC', 'SUB', 'SBB', 'ANA', 'XRA', 'ORA', 'CMP'];
  const ALU_IMM = ['ADI', 'ACI', 'SUI', 'SBI', 'ANI', 'XRI', 'ORI', 'CPI'];
  const COND = ['NZ', 'Z', 'NC', 'C', 'PO', 'PE', 'P', 'M'];
  const COND_TESTO = ['se il risultato non è zero', 'se il risultato è zero', 'se non c\'è riporto', 'se c\'è riporto',
    'se la parità è dispari', 'se la parità è pari', 'se il risultato è positivo', 'se il risultato è negativo'];
  const ALU_TESTO = ['somma {r} ad A', 'somma {r} e il riporto ad A', 'sottrae {r} da A', 'sottrae {r} e il prestito da A',
    'AND bit a bit fra A e {r}', 'OR esclusivo fra A e {r}', 'OR bit a bit fra A e {r}', 'confronta A con {r} (senza cambiare A)'];

  function nomeReg(i) { return i === 6 ? 'la memoria puntata da HL' : i === 7 ? 'A' : REG[i]; }

  // Restituisce { testo, lunghezza, spiegazione } per l'istruzione all'indirizzo "ind".
  // "leggi" è una funzione indirizzo -> byte.
  function disassembla(leggi, ind) {
    const op = leggi(ind & 0xffff);
    const b1 = leggi((ind + 1) & 0xffff), b2 = leggi((ind + 2) & 0xffff);
    const a16 = (b2 << 8) | b1;
    const A = ottaleIndirizzo(a16), D = ottale(b1, 3);
    const x = op >> 6, y = (op >> 3) & 7, z = op & 7;
    const ris = (testo, lunghezza, spiegazione) => ({ op: op, testo: testo, lunghezza: lunghezza, spiegazione: spiegazione });

    if (op === 0o166) return ris('HLT', 1, 'ferma il processore');
    if (x === 1) {
      return ris('MOV ' + REG[y] + ',' + REG[z], 1, 'copia ' + nomeReg(z) + ' in ' + nomeReg(y));
    }
    if (x === 2) return ris(ALU_NOMI[y] + ' ' + REG[z], 1, ALU_TESTO[y].replace('{r}', nomeReg(z)));
    if (x === 0) {
      switch (z) {
        case 0: return ris(y ? 'NOP*' : 'NOP', 1, y ? 'non fa nulla (codice non documentato, uguale a NOP)' : 'non fa nulla per un ciclo');
        case 1: return y & 1
          ? ris('DAD ' + COPPIE[y >> 1], 1, 'somma la coppia ' + COPPIE[y >> 1] + ' a HL (il riporto va in CY)')
          : ris('LXI ' + COPPIE[y >> 1] + ',' + A, 3, 'mette ' + A + ' nella coppia ' + COPPIE[y >> 1]);
        case 2:
          switch (y) {
            case 0: return ris('STAX B', 1, 'scrive A all\'indirizzo contenuto in BC');
            case 1: return ris('LDAX B', 1, 'carica in A il byte all\'indirizzo contenuto in BC');
            case 2: return ris('STAX D', 1, 'scrive A all\'indirizzo contenuto in DE');
            case 3: return ris('LDAX D', 1, 'carica in A il byte all\'indirizzo contenuto in DE');
            case 4: return ris('SHLD ' + A, 3, 'scrive L e H nelle celle ' + A + ' e seguente');
            case 5: return ris('LHLD ' + A, 3, 'carica L e H dalle celle ' + A + ' e seguente');
            case 6: return ris('STA ' + A, 3, 'scrive A nella cella ' + A);
            default: return ris('LDA ' + A, 3, 'carica in A il byte della cella ' + A);
          }
        case 3: return ris((y & 1 ? 'DCX ' : 'INX ') + COPPIE[y >> 1], 1, (y & 1 ? 'toglie 1 alla' : 'aggiunge 1 alla') + ' coppia ' + COPPIE[y >> 1]);
        case 4: return ris('INR ' + REG[y], 1, 'aggiunge 1 a ' + nomeReg(y));
        case 5: return ris('DCR ' + REG[y], 1, 'toglie 1 a ' + nomeReg(y));
        case 6: return ris('MVI ' + REG[y] + ',' + D, 2, 'mette ' + D + ' in ' + nomeReg(y));
        default:
          return [
            ris('RLC', 1, 'ruota A di un bit verso sinistra'),
            ris('RRC', 1, 'ruota A di un bit verso destra'),
            ris('RAL', 1, 'ruota A a sinistra passando dal riporto'),
            ris('RAR', 1, 'ruota A a destra passando dal riporto'),
            ris('DAA', 1, 'corregge A per i calcoli in decimale (BCD)'),
            ris('CMA', 1, 'inverte tutti i bit di A'),
            ris('STC', 1, 'accende il riporto CY'),
            ris('CMC', 1, 'inverte il riporto CY'),
          ][y];
      }
    }
    switch (z) {
      case 0: return ris('R' + COND[y], 1, 'torna dal sottoprogramma ' + COND_TESTO[y]);
      case 1:
        if (!(y & 1)) return ris('POP ' + COPPIE_PILA[y >> 1], 1, 'riprende dalla pila la coppia ' + COPPIE_PILA[y >> 1]);
        if (y === 1 || y === 3) return ris('RET', 1, 'torna dal sottoprogramma (indirizzo preso dalla pila)');
        return y === 5 ? ris('PCHL', 1, 'salta all\'indirizzo contenuto in HL') : ris('SPHL', 1, 'copia HL nel puntatore alla pila');
      case 2: return ris('J' + COND[y] + ' ' + A, 3, 'salta a ' + A + ' ' + COND_TESTO[y]);
      case 3:
        switch (y) {
          case 0: case 1: return ris('JMP ' + A, 3, 'salta all\'indirizzo ' + A);
          case 2: return ris('OUT ' + D, 2, 'manda A alla porta ' + D);
          case 3: return ris('IN ' + D, 2, b1 === PORTA_INTERRUTTORI ? 'legge gli interruttori 15–8 del pannello' : 'legge la porta ' + D);
          case 4: return ris('XTHL', 1, 'scambia HL con la cima della pila');
          case 5: return ris('XCHG', 1, 'scambia DE con HL');
          case 6: return ris('DI', 1, 'disabilita le interruzioni');
          default: return ris('EI', 1, 'abilita le interruzioni');
        }
      case 4: return ris('C' + COND[y] + ' ' + A, 3, 'chiama il sottoprogramma a ' + A + ' ' + COND_TESTO[y]);
      case 5:
        if (!(y & 1)) return ris('PUSH ' + COPPIE_PILA[y >> 1], 1, 'salva nella pila la coppia ' + COPPIE_PILA[y >> 1]);
        return ris('CALL ' + A, 3, 'chiama il sottoprogramma a ' + A + ' (il ritorno va nella pila)');
      case 6: return ris(ALU_IMM[y] + ' ' + D, 2, ALU_TESTO[y].replace('{r}', D));
      default: return ris('RST ' + y, 1, 'chiama il sottoprogramma all\'indirizzo ' + ottale(y << 3, 3));
    }
  }

  /* ---------- i bus: corsa veloce e registrazione dei cicli ---------- */

  // Cosa fa ogni ciclo, raccontato nelle "pastiglie" del laboratorio.
  const RUOLI = {
    codice: 'codice operativo',
    basso: 'byte basso dell\'indirizzo',
    alto: 'byte alto dell\'indirizzo',
    imm: 'dato immediato',
    porta: 'numero della porta',
    mem: 'dato in memoria',
    pila: 'pila',
    ingresso: 'dato dalla porta',
    uscita: 'dato verso la porta',
    halt: 'arresto (HLT)',
  };

  // Accumula, ciclo per ciclo, per quanti stati di clock ogni linea è rimasta accesa:
  // durante RUN i LED mostrano proprio questa media, come sul vero pannello.
  function creaAccumulatore() {
    const mappa = new Map();
    let totale = 0;
    let ultima = -1;
    return {
      aggiungi(ind, dato, stato, stati) {
        const k = ind * 65536 + dato * 256 + stato;
        mappa.set(k, (mappa.get(k) || 0) + stati);
        totale += stati;
        ultima = k;
      },
      estendi(stati) {
        if (ultima < 0) return;
        mappa.set(ultima, (mappa.get(ultima) || 0) + stati);
        totale += stati;
      },
      get stati() { return totale; },
      // Frazioni di tempo (0-1) per ogni bit di indirizzo, dati e stato; poi riparte da zero.
      risolvi() {
        const indirizzo = new Array(16).fill(0), dati = new Array(8).fill(0), stato = new Array(8).fill(0);
        if (totale > 0) {
          mappa.forEach((n, k) => {
            const ind = Math.floor(k / 65536), dato = (k >> 8) & 255, st = k & 255;
            for (let i = 0; i < 16; i++) if ((ind >> i) & 1) indirizzo[i] += n;
            for (let i = 0; i < 8; i++) {
              if ((dato >> i) & 1) dati[i] += n;
              if ((st >> i) & 1) stato[i] += n;
            }
          });
          for (let i = 0; i < 16; i++) indirizzo[i] /= totale;
          for (let i = 0; i < 8; i++) { dati[i] /= totale; stato[i] /= totale; }
        }
        const ris = { stati: totale, indirizzo: indirizzo, dati: dati, stato: stato };
        mappa.clear();
        totale = 0;
        ultima = -1;
        return ris;
      },
    };
  }

  /* ---------- l'Altair 8800: CPU, memoria e pannello ---------- */

  function creaAltair(opzioni) {
    const o = opzioni || {};
    const DIM = o.memoria || DIM_MEMORIA;
    const alt = {
      DIM: DIM,
      mem: new Uint8Array(DIM),
      r: registri(),
      acceso: true,
      inEsecuzione: false, // pannello in RUN
      protetta: false,     // PROTECT
      interruttori: 0,     // i 16 interruttori indirizzo/dati
      pendente: null,      // istruzione in corso, ciclo per ciclo (quando la CPU è ferma)
      istruzioni: 0,       // istruzioni completate
      stati: 0,            // stati di clock trascorsi
      scrittureCpu: new Uint32Array(DIM), // quante volte il programma ha scritto in ogni cella
      ingressi: 0,         // quante volte il programma ha letto gli interruttori (IN 377)
      fuoriMemoria: 0,     // letture di codici oltre l'ultima cella
      partenza: 0,         // indirizzo da cui è partito l'ultimo RUN
    };

    function leggiMem(a) { return a < DIM ? alt.mem[a] : VUOTO; }
    function scriviCpu(a, v) {
      if (a >= DIM || alt.protetta) return false;
      alt.mem[a] = v & 255;
      alt.scrittureCpu[a] += 1;
      return true;
    }
    function portaIngresso(p) { return p === PORTA_INTERRUTTORI ? (alt.interruttori >> 8) & 255 : VUOTO; }

    // Bus della corsa veloce: esegue davvero e accumula i cicli per i LED.
    let acc = null;
    let statiBus = 0;
    function conta(ind, dato, stato, n) { statiBus += n; if (acc) acc.aggiungi(ind, dato, stato, n); }
    const busVeloce = {
      codice(a) { const v = leggiMem(a); if (a >= DIM) alt.fuoriMemoria += 1; conta(a, v, STATO_CICLO.codice, 4); return v; },
      leggi(a) { const v = leggiMem(a); conta(a, v, STATO_CICLO.lettura, 3); return v; },
      scrivi(a, v) { scriviCpu(a, v); conta(a, v, STATO_CICLO.scrittura, 3); },
      pilaLeggi(a) { const v = leggiMem(a); conta(a, v, STATO_CICLO.pilaLettura, 3); return v; },
      pilaScrivi(a, v) { scriviCpu(a, v); conta(a, v, STATO_CICLO.pilaScrittura, 3); },
      ingresso(p) { const v = portaIngresso(p); alt.ingressi += 1; conta(p * 257, v, STATO_CICLO.ingresso, 3); return v; },
      uscita(p, v) { conta(p * 257, v, STATO_CICLO.uscita, 3); },
      halt(a) { conta(a, leggiMem(a), STATO_CICLO.halt, 3); },
      extra(n) { statiBus += n; if (acc) acc.estendi(n); },
    };

    // Bus del passo singolo: registra i cicli e le scritture senza applicarle.
    function busRegistratore() {
      const cicli = [];
      const scritture = [];
      const ciclo = (tipo, ruolo, ind, dato, stati) => {
        cicli.push({ tipo: tipo, ruolo: ruolo, indirizzo: ind, dato: dato, stato: STATO_CICLO[tipo], stati: stati });
      };
      return {
        cicli: cicli,
        scritture: scritture,
        codice(a) { const v = leggiMem(a); ciclo('codice', 'codice', a, v, 4); return v; },
        leggi(a, ruolo) { const v = leggiMem(a); ciclo('lettura', ruolo || 'mem', a, v, 3); return v; },
        scrivi(a, v) { scritture.push({ indirizzo: a, valore: v }); ciclo('scrittura', 'mem', a, v, 3); },
        pilaLeggi(a) { const v = leggiMem(a); ciclo('pilaLettura', 'pila', a, v, 3); return v; },
        pilaScrivi(a, v) { scritture.push({ indirizzo: a, valore: v }); ciclo('pilaScrittura', 'pila', a, v, 3); },
        ingresso(p) { const v = portaIngresso(p); ciclo('ingresso', 'ingresso', p * 257, v, 3); return v; },
        uscita(p, v) { ciclo('uscita', 'uscita', p * 257, v, 3); },
        halt(a) { ciclo('halt', 'halt', a, leggiMem(a), 3); },
        extra(n) { cicli[cicli.length - 1].stati += n; },
      };
    }

    // Prepara l'istruzione all'indirizzo PC: la esegue "per finta" su una copia dei
    // registri per sapere quali cicli farà; i risultati si applicano all'ultimo ciclo.
    function prepara() {
      const r = alt.r;
      if (r.halt) { alt.pendente = pendenteHalt(); return alt.pendente; }
      const bus = busRegistratore();
      const dopo = Object.assign({}, r);
      istruzione(dopo, bus);
      alt.pendente = { pc0: r.pc, op: bus.cicli[0].dato, cicli: bus.cicli, scritture: bus.scritture, dopo: dopo, indice: 0 };
      return alt.pendente;
    }

    // Dopo HLT la CPU resta nel ciclo di riconoscimento dell'arresto.
    function pendenteHalt() {
      const r = alt.r;
      const ind = dec16(r.pc);
      return {
        pc0: ind,
        op: leggiMem(ind),
        cicli: [
          { tipo: 'codice', ruolo: 'codice', indirizzo: ind, dato: leggiMem(ind), stato: STATO_CICLO.codice, stati: 4 },
          { tipo: 'halt', ruolo: 'halt', indirizzo: r.pc, dato: leggiMem(r.pc), stato: STATO_CICLO.halt, stati: 3 },
        ],
        scritture: [],
        dopo: Object.assign({}, r),
        indice: 1,
      };
    }

    function completa() {
      const p = alt.pendente;
      Object.assign(alt.r, p.dopo);
      p.scritture.forEach((w) => scriviCpu(w.indirizzo, w.valore));
      p.cicli.forEach((c) => {
        if (c.tipo === 'ingresso') alt.ingressi += 1;
      });
      if (p.pc0 >= DIM) alt.fuoriMemoria += 1;
      alt.istruzioni += 1;
      alt.pendente = null;
    }

    // Completa il ciclo mostrato e passa al successivo.
    function avanzaCiclo() {
      const p = alt.pendente || prepara();
      if (alt.r.halt) return { completata: false, halt: true };
      alt.stati += p.cicli[p.indice].stati;
      p.indice += 1;
      if (p.indice < p.cicli.length) {
        if (p.cicli[p.indice].tipo === 'halt') {
          completa();
          alt.pendente = pendenteHalt();
          return { completata: true, halt: true, pc0: p.pc0 };
        }
        return { completata: false };
      }
      completa();
      prepara();
      return { completata: true, pc0: p.pc0 };
    }

    function cicloMostrato() {
      if (!alt.acceso) return null;
      const p = alt.pendente || prepara();
      return Object.assign({ n: p.indice + 1, totale: p.cicli.length, pc0: p.pc0, op: p.op }, p.cicli[p.indice]);
    }

    function indirizzoMostrato() {
      const c = cicloMostrato();
      return c ? c.indirizzo : alt.r.pc;
    }

    // I comandi del pannello agiscono solo a CPU accesa, ferma e non in HLT.
    function blocco(azione, anchePerHalt) {
      if (!alt.acceso) return { azione: azione, ok: false, motivo: 'spento' };
      if (alt.inEsecuzione) return { azione: azione, ok: false, motivo: 'in-esecuzione' };
      if (anchePerHalt !== false && alt.r.halt) return { azione: azione, ok: false, motivo: 'halt' };
      return null;
    }

    function vaiA(ind) {
      alt.r.pc = ind & 0xffff;
      prepara();
    }

    function deposita(azione, ind) {
      const v = alt.interruttori & 255;
      const prima = leggiMem(ind);
      let scritto = false, motivo = null;
      if (ind >= DIM) motivo = 'fuori-memoria';
      else if (alt.protetta) motivo = 'protetta';
      else { alt.mem[ind] = v; scritto = true; }
      vaiA(ind);
      return { azione: azione, ok: true, scritto: scritto, motivo: motivo, indirizzo: ind, valore: v, prima: prima };
    }

    const api = {
      // --- interruttori ---
      impostaInterruttori(v) { alt.interruttori = v & 0xffff; return alt.interruttori; },
      interruttore(bit, su) {
        const m = 1 << bit;
        alt.interruttori = su ? (alt.interruttori | m) : (alt.interruttori & ~m);
        alt.interruttori &= 0xffff;
        return alt.interruttori;
      },

      // --- comandi del pannello ---
      examine() {
        const no = blocco('examine'); if (no) return no;
        vaiA(alt.interruttori);
        return { azione: 'examine', ok: true, indirizzo: alt.r.pc, dato: leggiMem(alt.r.pc) };
      },
      examineNext() {
        const no = blocco('examineNext'); if (no) return no;
        vaiA(indirizzoMostrato() + 1);
        return { azione: 'examineNext', ok: true, indirizzo: alt.r.pc, dato: leggiMem(alt.r.pc) };
      },
      deposit() {
        const no = blocco('deposit'); if (no) return no;
        return deposita('deposit', indirizzoMostrato());
      },
      depositNext() {
        const no = blocco('depositNext'); if (no) return no;
        return deposita('depositNext', (indirizzoMostrato() + 1) & 0xffff);
      },
      reset() {
        if (!alt.acceso) return { azione: 'reset', ok: false, motivo: 'spento' };
        const eraHalt = !!alt.r.halt;
        alt.r.pc = 0;
        alt.r.inte = 0;
        alt.r.halt = 0;
        if (alt.inEsecuzione) { alt.pendente = null; alt.partenza = 0; } else prepara();
        return { azione: 'reset', ok: true, inEsecuzione: alt.inEsecuzione, eraHalt: eraHalt, indirizzo: 0 };
      },
      clr() {
        if (!alt.acceso) return { azione: 'clr', ok: false, motivo: 'spento' };
        return { azione: 'clr', ok: true };
      },
      run() {
        if (!alt.acceso) return { azione: 'run', ok: false, motivo: 'spento' };
        if (alt.inEsecuzione) return { azione: 'run', ok: false, motivo: 'gia-in-esecuzione' };
        alt.inEsecuzione = true;
        alt.partenza = alt.pendente ? alt.pendente.cicli[alt.pendente.indice].indirizzo : alt.r.pc;
        return { azione: 'run', ok: true, indirizzo: alt.partenza, halt: !!alt.r.halt };
      },
      stop() {
        if (!alt.acceso) return { azione: 'stop', ok: false, motivo: 'spento' };
        if (!alt.inEsecuzione) return { azione: 'stop', ok: false, motivo: 'gia-ferma' };
        alt.inEsecuzione = false;
        if (!alt.pendente) prepara();
        return { azione: 'stop', ok: true, ciclo: cicloMostrato() };
      },
      singleStep() {
        const no = blocco('singleStep'); if (no) return no;
        const prima = cicloMostrato();
        const esito = avanzaCiclo();
        return { azione: 'singleStep', ok: true, prima: prima, ciclo: cicloMostrato(), completata: esito.completata, halt: !!esito.halt, pc0: esito.pc0 };
      },
      protect() {
        if (!alt.acceso) return { azione: 'protect', ok: false, motivo: 'spento' };
        alt.protetta = true;
        return { azione: 'protect', ok: true };
      },
      unprotect() {
        if (!alt.acceso) return { azione: 'unprotect', ok: false, motivo: 'spento' };
        alt.protetta = false;
        return { azione: 'unprotect', ok: true };
      },
      aux() { return { azione: 'aux', ok: alt.acceso, motivo: alt.acceso ? null : 'spento' }; },
      spegni() {
        alt.acceso = false;
        alt.inEsecuzione = false;
        alt.protetta = false;
        alt.pendente = null;
        return { azione: 'spegni', ok: true };
      },
      // All'accensione la RAM statica contiene valori casuali; la CPU parte ferma da 000.
      accendi(casuale) {
        const rnd = typeof casuale === 'function' ? casuale : Math.random;
        const byte = () => Math.floor(rnd() * 256) & 255;
        for (let i = 0; i < DIM; i++) alt.mem[i] = byte();
        const r = alt.r;
        ['a', 'b', 'c', 'd', 'e', 'h', 'l'].forEach((k) => { r[k] = byte(); });
        r.sp = (byte() << 8) | byte();
        r.pc = 0; r.inte = 0; r.halt = 0;
        alt.acceso = true;
        alt.inEsecuzione = false;
        alt.scrittureCpu.fill(0);
        prepara();
        return { azione: 'accendi', ok: true };
      },

      // --- esecuzione ---
      // Corsa veloce per "budget" stati di clock (2 MHz = 2.000.000 stati al secondo).
      esegui(budget, accumulatore) {
        if (!alt.acceso || !alt.inEsecuzione || alt.r.halt) return { stati: 0, halt: !!alt.r.halt };
        acc = accumulatore || null;
        let usati = 0;
        const p = alt.pendente;
        if (p && p.indice > 0) {
          // Finisce l'istruzione lasciata a metà dal passo singolo.
          for (let i = p.indice; i < p.cicli.length; i++) {
            const c = p.cicli[i];
            usati += c.stati;
            if (acc) acc.aggiungi(c.indirizzo, c.dato, c.stato, c.stati);
          }
          completa();
        }
        alt.pendente = null;
        const r = alt.r;
        if (!r.halt) {
          while (usati < budget) {
            statiBus = 0;
            istruzione(r, busVeloce);
            usati += statiBus;
            alt.istruzioni += 1;
            if (r.halt) break;
          }
        }
        if (r.halt) alt.pendente = pendenteHalt();
        alt.stati += usati;
        acc = null;
        return { stati: usati, halt: !!r.halt };
      },
      // Al rallentatore: un ciclo macchina alla volta, con il pannello in RUN.
      cicloLento() {
        if (!alt.acceso || !alt.inEsecuzione || alt.r.halt) return { completata: false, halt: !!alt.r.halt };
        return avanzaCiclo();
      },

      // --- letture ---
      leggi: leggiMem,
      cicloMostrato: cicloMostrato,
      indirizzoMostrato: indirizzoMostrato,
      prepara: prepara,
      // Cicli dell'istruzione in corso, per le "pastiglie" del laboratorio.
      cicliIstruzione() {
        if (!alt.acceso) return [];
        const p = alt.pendente || prepara();
        return p.cicli.map((c, i) => Object.assign({ n: i + 1, attivo: i === p.indice, fatto: i < p.indice, descrizione: RUOLI[c.ruolo] || c.ruolo }, c));
      },
      // LED quando la CPU è ferma (o al rallentatore): valori pieni, accesi o spenti.
      luci() {
        const spente = { indirizzo: 0, dati: 0, stato: {} };
        LED_STATO.forEach((k) => { spente.stato[k] = 0; });
        if (!alt.acceso) return spente;
        const c = cicloMostrato();
        const st = c.stato;
        return {
          indirizzo: c.indirizzo,
          dati: c.dato,
          stato: {
            INTE: alt.r.inte ? 1 : 0,
            PROT: alt.protetta ? 1 : 0,
            MEMR: (st >> 7) & 1,
            INP: (st >> 6) & 1,
            M1: (st >> 5) & 1,
            OUT: (st >> 4) & 1,
            HLTA: (st >> 3) & 1,
            STACK: (st >> 2) & 1,
            WO: (st >> 1) & 1,
            INT: st & 1,
            WAIT: alt.inEsecuzione ? 0 : 1,
            HLDA: 0,
          },
        };
      },
      // Istruzione all'indirizzo dato (per il listato e le letture).
      istruzioneA(ind) { return disassembla(leggiMem, ind); },
    };

    Object.assign(alt, api);
    prepara();
    return alt;
  }

  /* ---------- i programmi ---------- */

  // Il primo esempio del manuale dell'Altair 8800: somma i numeri delle celle
  // 200 e 201 (128 e 129 in decimale) e scrive il risultato nella cella 202 (130).
  const PROGRAMMA_SOMMA = {
    id: 'somma',
    nome: 'Somma di due numeri',
    fonte: 'primo esempio del manuale operativo dell\'Altair 8800 (MITS, 1975)',
    istruzioni: [
      { indirizzo: 0o000, byte: [0o072, 0o200, 0o000], testo: 'LDA 200', spiegazione: 'carica in A il primo numero (cella 200)' },
      { indirizzo: 0o003, byte: [0o107], testo: 'MOV B,A', spiegazione: 'copia A nel registro B' },
      { indirizzo: 0o004, byte: [0o072, 0o201, 0o000], testo: 'LDA 201', spiegazione: 'carica in A il secondo numero (cella 201)' },
      { indirizzo: 0o007, byte: [0o200], testo: 'ADD B', spiegazione: 'somma B ad A' },
      { indirizzo: 0o010, byte: [0o062, 0o202, 0o000], testo: 'STA 202', spiegazione: 'scrive la somma nella cella 202' },
      { indirizzo: 0o013, byte: [0o303, 0o000, 0o000], testo: 'JMP 000', spiegazione: 'torna all\'inizio e ricomincia' },
    ],
    dati: { primo: 0o200, secondo: 0o201, risultato: 0o202 },
  };

  // Kill the Bit, il gioco scritto da Dean McDaniel per l'Altair (15 maggio 1975).
  const PROGRAMMA_KILLBIT = {
    id: 'killbit',
    nome: 'Kill the Bit',
    fonte: 'gioco di Dean McDaniel, 15 maggio 1975',
    istruzioni: [
      { indirizzo: 0o000, byte: [0o041, 0o000, 0o000], testo: 'LXI H,000', spiegazione: 'azzera il contatore HL' },
      { indirizzo: 0o003, byte: [0o026, 0o200], testo: 'MVI D,200', spiegazione: 'D = 10 000 000: una luce a sinistra' },
      { indirizzo: 0o005, byte: [0o001, 0o016, 0o000], testo: 'LXI B,016', spiegazione: 'passo del contatore: più alto, più veloce' },
      { indirizzo: 0o010, byte: [0o032], testo: 'LDAX D', spiegazione: 'legge all\'indirizzo DE: D compare sui LED A15–A8' },
      { indirizzo: 0o011, byte: [0o032], testo: 'LDAX D', spiegazione: 'ancora, per rendere la luce più brillante' },
      { indirizzo: 0o012, byte: [0o032], testo: 'LDAX D', spiegazione: 'ancora' },
      { indirizzo: 0o013, byte: [0o032], testo: 'LDAX D', spiegazione: 'ancora' },
      { indirizzo: 0o014, byte: [0o011], testo: 'DAD B', spiegazione: 'HL = HL + BC: il riporto scatta ogni 4.681 giri' },
      { indirizzo: 0o015, byte: [0o322, 0o010, 0o000], testo: 'JNC 010', spiegazione: 'senza riporto ripete il giro' },
      { indirizzo: 0o020, byte: [0o333, 0o377], testo: 'IN 377', spiegazione: 'legge gli interruttori 15–8' },
      { indirizzo: 0o022, byte: [0o252], testo: 'XRA D', spiegazione: 'inverte i bit di D sotto gli interruttori alzati' },
      { indirizzo: 0o023, byte: [0o017], testo: 'RRC', spiegazione: 'sposta il disegno di un posto a destra' },
      { indirizzo: 0o024, byte: [0o127], testo: 'MOV D,A', spiegazione: 'salva il nuovo disegno in D' },
      { indirizzo: 0o025, byte: [0o303, 0o010, 0o000], testo: 'JMP 010', spiegazione: 'torna al giro che accende le luci' },
    ],
  };

  const PROGRAMMI = { somma: PROGRAMMA_SOMMA, killbit: PROGRAMMA_KILLBIT };

  function byteProgramma(prog) {
    const out = [];
    prog.istruzioni.forEach((i) => i.byte.forEach((b) => out.push(b)));
    return out;
  }

  // Una riga per byte, come il listato del manuale: indirizzo, byte, istruzione.
  function elenco(prog) {
    const righe = [];
    const operando = (ist, k) => {
      if (ist.byte.length === 3) return k === 1 ? 'byte basso' : 'byte alto';
      return ist.byte[0] === 0o333 || ist.byte[0] === 0o323 ? 'numero della porta' : 'dato';
    };
    prog.istruzioni.forEach((ist) => ist.byte.forEach((b, k) => righe.push({
      indirizzo: ist.indirizzo + k,
      byte: b,
      inizio: k === 0,
      testo: k === 0 ? ist.testo : '',
      spiegazione: k === 0 ? ist.spiegazione : operando(ist, k),
    })));
    return righe;
  }

  function programmaPresente(alt, prog) {
    const b = byteProgramma(prog);
    for (let i = 0; i < b.length; i++) if (alt.leggi(i) !== b[i]) return false;
    return true;
  }

  // Il prossimo byte da inserire: il primo sbagliato o non ancora depositato
  // (se "depositati" manca, conta solo il contenuto della memoria).
  function primoByteDiverso(alt, prog, depositati) {
    const righe = elenco(prog);
    for (let i = 0; i < righe.length; i++) {
      const r = righe[i];
      if (alt.leggi(r.indirizzo) !== r.byte || (depositati && !depositati.has(r.indirizzo))) return r;
    }
    return null;
  }

  // Le operazioni che "Inserisci il programma per me" esegue sul pannello.
  function sequenzaInserimento(prog) {
    const seq = [{ op: 'interruttori', valore: 0 }, { op: 'reset' }];
    byteProgramma(prog).forEach((b, i) => {
      seq.push({ op: 'interruttori', valore: b });
      seq.push({ op: i === 0 ? 'deposit' : 'depositNext' });
    });
    seq.push({ op: 'interruttori', valore: 0 });
    seq.push({ op: 'reset' });
    return seq;
  }

  function applica(alt, passo) {
    switch (passo.op) {
      case 'interruttori': return { azione: 'interruttori', ok: true, valore: alt.impostaInterruttori(passo.valore) };
      case 'reset': return alt.reset();
      case 'deposit': return alt.deposit();
      case 'depositNext': return alt.depositNext();
      case 'examine': return alt.examine();
      case 'examineNext': return alt.examineNext();
      case 'run': return alt.run();
      case 'stop': return alt.stop();
      case 'singleStep': return alt.singleStep();
      default: return { azione: passo.op, ok: false, motivo: 'sconosciuta' };
    }
  }

  /* ---------- testi: ottale e binario a portata di mano ---------- */

  function o3(v) { return ottale(v, 3); }
  function oi(a) { return ottaleIndirizzo(a); }
  function bin8(v) { return binario(v, 8); }

  const MOTIVI = {
    'spento': 'L\'Altair è spento: accendilo con la levetta OFF/ON (giù = ON).',
    'in-esecuzione': 'La CPU sta eseguendo il programma: premi prima <strong>STOP</strong>. Mentre gira, il pannello non può toccare la memoria.',
    'halt': 'La CPU ha eseguito <strong>HLT</strong> ed è in arresto (spia HLTA): non fa più cicli sul bus, quindi il pannello non può guidarla. Premi <strong>RESET</strong>.',
    'gia-in-esecuzione': 'La CPU è già in esecuzione.',
    'gia-ferma': 'La CPU è già ferma (spia WAIT accesa).',
  };

  // Racconta in italiano semplice che cosa ha appena fatto un comando del pannello.
  function racconta(ev, alt, opz) {
    const o = opz || {};
    if (!ev) return '';
    if (!ev.ok) return MOTIVI[ev.motivo] || 'Comando non disponibile in questo momento.';
    switch (ev.azione) {
      case 'examine':
        return '<strong>EXAMINE</strong>: il pannello porta la CPU all\'indirizzo <strong>' + oi(ev.indirizzo) + '</strong> (' + ev.indirizzo +
          ' in decimale). I LED D7–D0 mostrano il byte di quella cella: <strong>' + o3(ev.dato) + '</strong>, cioè ' + ev.dato + '.' +
          (ev.indirizzo >= alt.DIM ? ' Ma qui non c\'è memoria: l\'Altair di base aveva solo 256 byte e il bus vuoto si legge come 377.' : '');
      case 'examineNext':
        return '<strong>EXAMINE NEXT</strong>: la cella dopo, <strong>' + oi(ev.indirizzo) + '</strong>, contiene <strong>' + o3(ev.dato) + '</strong> (' + ev.dato + ').';
      case 'deposit':
      case 'depositNext': {
        const nome = ev.azione === 'deposit' ? 'DEPOSIT' : 'DEPOSIT NEXT';
        if (!ev.scritto) {
          return ev.motivo === 'protetta'
            ? 'La memoria è protetta (spia PROT): <strong>' + nome + '</strong> non scrive nulla. Usa <strong>UNPROTECT</strong>.'
            : 'All\'indirizzo ' + oi(ev.indirizzo) + ' non c\'è memoria: il byte va perso.';
        }
        return ev.azione === 'deposit'
          ? '<strong>DEPOSIT</strong>: il byte degli interruttori 7–0, <strong>' + o3(ev.valore) + '</strong> (' + bin8(ev.valore) + '), è scritto nella cella ' + oi(ev.indirizzo) + '. L\'indirizzo non cambia.'
          : '<strong>DEPOSIT NEXT</strong>: la CPU passa alla cella <strong>' + oi(ev.indirizzo) + '</strong> e ci scrive <strong>' + o3(ev.valore) + '</strong> (' + bin8(ev.valore) + ').';
      }
      case 'reset':
        return ev.inEsecuzione
          ? '<strong>RESET</strong>: il programma riparte dall\'indirizzo 000.'
          : '<strong>RESET</strong>: il contatore di programma (PC) torna a <strong>000</strong>. La memoria resta com\'era.' + (ev.eraHalt ? ' La CPU esce dall\'arresto.' : '');
      case 'run':
        if (ev.halt) return '<strong>RUN</strong>: la CPU però è in arresto dopo HLT. Premi <strong>RESET</strong> per ripartire da 000.';
        return o.lento
          ? '<strong>RUN</strong> al rallentatore: la CPU parte da ' + oi(ev.indirizzo) + ' e qui vedi un ciclo macchina alla volta.'
          : '<strong>RUN</strong>: la CPU esegue il programma da ' + oi(ev.indirizzo) + ' a 2 MHz. I LED sembrano accesi a metà: indirizzi e dati cambiano milioni di volte al secondo e l\'occhio vede una media.';
      case 'stop': {
        const c = ev.ciclo;
        return '<strong>STOP</strong>: la CPU si ferma e aspetta (spia WAIT accesa)' + (c ? ' prima del ciclo all\'indirizzo <strong>' + oi(c.indirizzo) + '</strong>.' : '.');
      }
      case 'singleStep': {
        const p = ev.prima, c = ev.ciclo;
        let t = '<strong>SINGLE STEP</strong>: completato il ciclo ' + p.n + ' di ' + p.totale + ' (' + (RUOLI[p.ruolo] || p.ruolo) + ').';
        if (ev.halt) t += ' La CPU ha eseguito HLT e si arresta (spia HLTA).';
        else if (ev.completata) t += ' Istruzione finita: <strong>' + disassembla(alt.leggi, ev.pc0).testo + '</strong>. Ora la CPU legge il codice all\'indirizzo ' + oi(c.indirizzo) + '.';
        else t += ' Ora aspetta il ciclo ' + c.n + ': ' + (RUOLI[c.ruolo] || c.ruolo) + ', indirizzo ' + oi(c.indirizzo) + '.';
        if (o.primoPasso) t += ' Il manuale diceva «un\'istruzione», ma il circuito fa avanzare la CPU di un ciclo macchina alla volta.';
        return t;
      }
      case 'clr':
        return '<strong>CLR</strong> manda un segnale di azzeramento alle schede di ingresso e uscita. Qui non ce ne sono: non succede nulla.';
      case 'protect':
        return '<strong>PROTECT</strong>: memoria protetta (spia PROT). Né DEPOSIT né il programma possono scriverci.';
      case 'unprotect':
        return '<strong>UNPROTECT</strong>: la memoria si può di nuovo scrivere.';
      case 'aux':
        return 'Le levette <strong>AUX</strong> non erano collegate a nulla nell\'Altair di base: erano pronte per schede future.';
      case 'spegni':
        return 'Altair spento. La RAM perde tutto il suo contenuto.';
      case 'accendi':
        return 'Altair acceso: la CPU è ferma all\'indirizzo 000 e la memoria contiene <strong>valori casuali</strong>, come una vera RAM appena alimentata.';
      default:
        return '';
    }
  }

  /* ---------- missioni guidate ---------- */

  const PASSI_SOMMA = [
    { id: 'reset', titolo: 'Premi RESET', testo: 'Leva RESET in su: il contatore di programma torna all\'indirizzo 000.' },
    { id: 'programma', titolo: 'Inserisci i 14 byte del programma', testo: 'Per ogni byte imposta gli interruttori 7–0, poi DEPOSIT per il primo e DEPOSIT NEXT per tutti gli altri.' },
    { id: 'numeri', titolo: 'Scrivi i due numeri', testo: 'Imposta 200 e premi EXAMINE; deposita il primo numero con DEPOSIT e il secondo con DEPOSIT NEXT (per esempio 005 e 010, cioè 5 e 8).' },
    { id: 'esegui', titolo: 'Fai partire il programma', testo: 'RESET per tornare a 000, poi RUN.' },
    { id: 'ferma', titolo: 'Ferma la CPU', testo: 'Leva STOP in su.' },
    { id: 'leggi', titolo: 'Leggi la somma', testo: 'Imposta 202, premi EXAMINE e leggi i LED D7–D0.' },
  ];

  const PASSI_KILLBIT = [
    { id: 'programma', titolo: 'Inserisci i 24 byte del gioco', testo: 'A mano sono tanti: usa pure «Inserisci il programma per me».' },
    { id: 'avvia', titolo: 'RESET e RUN', testo: 'Una luce comincia a correre sui LED A15–A8, da sinistra a destra.' },
    { id: 'uccidi', titolo: 'Spegni la luce', testo: 'Tocca l\'interruttore (15–8) che sta sotto la luce proprio mentre ci passa. Se sbagli il momento, ne nasce un\'altra.' },
  ];

  function creaMissione(tipo) {
    const prog = PROGRAMMI[tipo] || PROGRAMMA_SOMMA;
    const passi = prog === PROGRAMMA_KILLBIT ? PASSI_KILLBIT : PASSI_SOMMA;
    const fatti = new Set();
    const depositi = new Set();
    const st = { ingressiBase: 0, avvisoVecchio: false };

    function sommaGiusta(alt) {
      const d = PROGRAMMA_SOMMA.dati;
      return alt.leggi(d.risultato) === ((alt.leggi(d.primo) + alt.leggi(d.secondo)) & 255);
    }

    function fai(id, nuovi) { if (!fatti.has(id)) { fatti.add(id); nuovi.push(id); } }

    const m = {
      tipo: prog.id,
      programma: prog,
      passi: passi,
      fatti: fatti,
      corrente() {
        const p = passi.find((x) => !fatti.has(x.id));
        return p ? p.id : null;
      },
      completata() { return passi.every((x) => fatti.has(x.id)); },

      // Aggiorna i passi dopo un evento del pannello (o un "tick" mentre il programma gira).
      // Restituisce gli id dei passi appena completati.
      aggiorna(ev, alt) {
        const nuovi = [];
        const ok = ev && ev.ok;
        if (ok && (ev.azione === 'deposit' || ev.azione === 'depositNext') && ev.scritto) depositi.add(ev.indirizzo);
        if (ok && (ev.azione === 'spegni' || ev.azione === 'accendi')) depositi.clear();
        if (prog === PROGRAMMA_SOMMA) {
          const d = PROGRAMMA_SOMMA.dati;
          if (ok && ev.azione === 'reset') fai('reset', nuovi);
          if (ok && (ev.azione === 'deposit' || ev.azione === 'depositNext') && ev.scritto && ev.indirizzo === 0) fai('reset', nuovi);
          if (programmaPresente(alt, prog)) { fai('reset', nuovi); fai('programma', nuovi); }
          if (depositi.has(d.primo) && depositi.has(d.secondo)) fai('numeri', nuovi);
          if (fatti.has('programma') && fatti.has('numeri') && alt.scrittureCpu[d.risultato] > 0 && sommaGiusta(alt) && programmaPresente(alt, prog)) fai('esegui', nuovi);
          if (ok && ev.azione === 'stop' && fatti.has('esegui')) fai('ferma', nuovi);
          if (ok && (ev.azione === 'examine' || ev.azione === 'examineNext') && ev.indirizzo === d.risultato) {
            if (fatti.has('ferma') && sommaGiusta(alt)) fai('leggi', nuovi);
            else st.avvisoVecchio = fatti.has('numeri') && !sommaGiusta(alt);
          }
        } else {
          if (!fatti.has('programma') && programmaPresente(alt, prog)) { fai('programma', nuovi); st.ingressiBase = alt.ingressi; }
          if (fatti.has('programma') && alt.inEsecuzione && alt.ingressi > st.ingressiBase && programmaPresente(alt, prog)) fai('avvia', nuovi);
          if (fatti.has('avvia') && alt.inEsecuzione && alt.r.d === 0 && programmaPresente(alt, prog)) fai('uccidi', nuovi);
        }
        return nuovi;
      },

      // Byte inseriti davvero (depositati e giusti); a programma completo, tutti.
      progresso(alt) {
        const righe = elenco(prog);
        const giusti = programmaPresente(alt, prog) ? righe.length
          : righe.filter((r) => depositi.has(r.indirizzo) && alt.leggi(r.indirizzo) === r.byte).length;
        return { giusti: giusti, totale: righe.length };
      },
      // Stato di ogni riga del listato: 'ok', 'prossimo' o 'da-fare'.
      righe(alt) {
        const prossimo = programmaPresente(alt, prog) ? null : primoByteDiverso(alt, prog, depositi);
        return elenco(prog).map((r) => Object.assign({
          stato: prossimo && r.indirizzo === prossimo.indirizzo ? 'prossimo'
            : (alt.leggi(r.indirizzo) === r.byte && (depositi.has(r.indirizzo) || !prossimo || r.indirizzo < prossimo.indirizzo)) ? 'ok' : 'da-fare',
        }, r));
      },
      prossimoByte(alt) { return programmaPresente(alt, prog) ? null : primoByteDiverso(alt, prog, depositi); },

      // Il risultato della somma, con le tre letture.
      risultato(alt) {
        const d = PROGRAMMA_SOMMA.dati;
        const a = alt.leggi(d.primo), b = alt.leggi(d.secondo), s = alt.leggi(d.risultato);
        return { a: a, b: b, somma: s, giusta: s === ((a + b) & 255), riporto: a + b > 255 };
      },

      // Il prossimo gesto da fare, spiegato in base allo stato reale della macchina.
      suggerimento(alt) {
        const id = m.corrente();
        if (!alt.acceso) return 'Riaccendi l\'Altair (levetta OFF/ON giù).';
        const mostrato = alt.indirizzoMostrato();
        const sw = alt.interruttori & 255;
        if (prog === PROGRAMMA_SOMMA) {
          const d = PROGRAMMA_SOMMA.dati;
          switch (id) {
            case 'reset':
              return 'Alza la leva <strong>RESET</strong>: i LED A15–A0 tornano tutti spenti, cioè all\'indirizzo 000.';
            case 'programma': {
              const t = m.prossimoByte(alt);
              if (!t) return 'Il programma è completo.';
              const ist = disassemblaRiga(t);
              let s = 'Prossimo byte: cella <strong>' + oi(t.indirizzo) + '</strong> ← <strong>' + o3(t.byte) + '</strong>' + ist +
                '. Interruttori 7–0: <strong>' + bin8(t.byte) + '</strong>';
              if (alt.inEsecuzione) return s + '. Prima premi STOP.';
              if (mostrato === t.indirizzo) s += sw === t.byte ? ' (pronti!). Ora <strong>DEPOSIT</strong>.' : ', poi <strong>DEPOSIT</strong>.';
              else if (mostrato === t.indirizzo - 1) s += sw === t.byte ? ' (pronti!). Ora <strong>DEPOSIT NEXT</strong>.' : ', poi <strong>DEPOSIT NEXT</strong>.';
              else if (t.indirizzo === 0) s += '. La CPU è altrove: premi <strong>RESET</strong>, poi DEPOSIT.';
              else s += '. La CPU è all\'indirizzo ' + oi(mostrato) + ': imposta ' + oi(t.indirizzo) + ' e premi <strong>EXAMINE</strong>, poi il byte e DEPOSIT.';
              return s;
            }
            case 'numeri': {
              if (alt.inEsecuzione) return 'Premi STOP, poi imposta <strong>200</strong> (10 000 000) e premi EXAMINE.';
              if (!depositi.has(d.primo)) {
                return mostrato === d.primo
                  ? 'Sei alla cella 200. Imposta il primo numero (per esempio <strong>005</strong> = 00 000 101) e premi <strong>DEPOSIT</strong>.'
                  : 'Imposta <strong>200</strong> sugli interruttori (10 000 000) e premi <strong>EXAMINE</strong>.';
              }
              return mostrato === d.primo
                ? 'Ora il secondo numero (per esempio <strong>010</strong> = 00 001 000, cioè 8) e <strong>DEPOSIT NEXT</strong>: andrà nella cella 201.'
                : 'Manca il secondo numero, nella cella 201: imposta 201, EXAMINE, poi il numero e DEPOSIT.';
            }
            case 'esegui':
              if (alt.inEsecuzione) {
                return alt.partenza !== 0
                  ? 'Il programma è partito da ' + oi(alt.partenza) + ', non da 000: premi STOP, poi <strong>RESET</strong> e di nuovo RUN.'
                  : 'Il programma sta girando…';
              }
              return mostrato === 0 ? 'Tutto pronto: abbassa la leva <strong>RUN</strong>.' : 'Premi <strong>RESET</strong> (la CPU è a ' + oi(mostrato) + ') e poi <strong>RUN</strong>.';
            case 'ferma':
              return 'Il programma gira: rifà la somma circa 34.000 volte al secondo. Alza la leva <strong>STOP</strong>.';
            case 'leggi':
              if (st.avvisoVecchio) return 'Nella cella 202 c\'è un risultato vecchio: i numeri sono cambiati dopo l\'ultimo RUN. Premi RESET, RUN, STOP e di nuovo EXAMINE 202.';
              if (alt.inEsecuzione) return 'Premi prima <strong>STOP</strong>.';
              return 'Imposta <strong>202</strong> sugli interruttori (10 000 010) e premi <strong>EXAMINE</strong>.';
            default: {
              const r = m.risultato(alt);
              return 'Missione compiuta! ' + o3(r.a) + ' + ' + o3(r.b) + ' = <strong>' + o3(r.somma) + '</strong> in ottale, cioè ' + r.a + ' + ' + r.b + ' = ' + r.somma +
                (r.riporto ? ' (la somma vera supera 255: in un byte resta solo il resto della divisione per 256)' : '') + '. Prova con altri numeri!';
            }
          }
        }
        switch (id) {
          case 'programma': {
            const pr = m.progresso(alt);
            return 'Byte giusti: ' + pr.giusti + ' di ' + pr.totale + '. Il pulsante «Inserisci il programma per me» li scrive tutti con DEPOSIT e DEPOSIT NEXT.';
          }
          case 'avvia':
            if (alt.inEsecuzione) return 'Il gioco parte solo da 000: premi STOP, RESET e RUN.';
            return mostrato === 0 ? 'Abbassa la leva <strong>RUN</strong>.' : 'Premi <strong>RESET</strong> e poi <strong>RUN</strong>.';
          case 'uccidi': {
            const n = contaBit(alt.r.d);
            if (!alt.inEsecuzione) return 'Il gioco è fermo: premi RUN.';
            return 'Luci accese: <strong>' + n + '</strong>. Tocca l\'interruttore sotto la luce mentre ci passa sopra.';
          }
          default:
            return 'Hai ucciso il bit! I LED A15–A8 sono tutti spenti. Toccando un interruttore fai nascere una nuova luce: il gioco continua.';
        }
      },
    };
    return m;
  }

  function disassemblaRiga(riga) {
    return riga.testo ? ' (' + riga.testo + ')' : ' (' + riga.spiegazione + ')';
  }

  const api = {
    DIM_MEMORIA: DIM_MEMORIA,
    FREQUENZA: FREQUENZA,
    PORTA_INTERRUTTORI: PORTA_INTERRUTTORI,
    ST: ST,
    STATO_CICLO: STATO_CICLO,
    LED_STATO: LED_STATO,
    RUOLI: RUOLI,
    ottale: ottale,
    ottaleIndirizzo: ottaleIndirizzo,
    binario: binario,
    daOttale: daOttale,
    contaBit: contaBit,
    registri: registri,
    istruzione: istruzione,
    disassembla: disassembla,
    creaAccumulatore: creaAccumulatore,
    creaAltair: creaAltair,
    PROGRAMMI: PROGRAMMI,
    PROGRAMMA_SOMMA: PROGRAMMA_SOMMA,
    PROGRAMMA_KILLBIT: PROGRAMMA_KILLBIT,
    byteProgramma: byteProgramma,
    elenco: elenco,
    programmaPresente: programmaPresente,
    primoByteDiverso: primoByteDiverso,
    sequenzaInserimento: sequenzaInserimento,
    applica: applica,
    racconta: racconta,
    creaMissione: creaMissione,
  };

  (root.StoriaPCModelli = root.StoriaPCModelli || {})['primi-pc'] = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
