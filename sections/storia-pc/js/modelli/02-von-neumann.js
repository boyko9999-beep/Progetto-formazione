/*
 * Storia del PC · capitolo 2 (von-neumann): dati e logica pura, senza DOM.
 *
 * Un computer in miniatura a programma memorizzato, usato dal laboratorio
 * «Un computer in miniatura» e verificato dai test:
 *  - memoria di 16 celle da 8 bit (indirizzi 0–15);
 *  - istruzioni di 8 bit: 4 bit di codice + 4 bit di operando;
 *  - registri: PC (4 bit, dopo 15 torna a 0), IR (8 bit), accumulatore A
 *    (8 bit), flag Z (zero) e C (riporto o prestito);
 *  - aritmetica a 8 bit modulo 256.
 *
 * La CPU avanza per micro-passi:
 *   P1  prelievo, il PC va sul bus indirizzi           (mezzo ciclo)
 *   P2  prelievo, la cella arriva all'IR, PC + 1       (fine del ciclo)
 *   D   decodifica                                     (nessun ciclo in più)
 *   E1  esecuzione, l'operando va sul bus indirizzi    (mezzo ciclo)
 *   E2  esecuzione, il dato viaggia sul bus dati       (fine del ciclo)
 *   E   esecuzione senza accesso alla memoria          (un ciclo)
 * Ogni micro-passo elenca negli «eventi» che cosa viaggia sui bus, così il
 * laboratorio può animarlo, e porta con sé una copia dello stato successivo.
 *
 * REGOLA DEI CICLI DI CLOCK (la stessa nel laboratorio e nei test)
 *  1. Ogni istruzione ha un prelievo (1 ciclo) e un'esecuzione (1 ciclo).
 *     La decodifica avviene alla fine del ciclo di prelievo: 0 cicli.
 *  2. Von Neumann (una sola memoria, un solo bus): una cosa alla volta,
 *     quindi ogni istruzione costa esattamente 2 cicli.
 *  3. Harvard (memoria istruzioni e memoria dati, due bus): se l'istruzione
 *     legge o scrive un dato (LDA, ADD, SUB, STA), nello stesso ciclo
 *     dell'accesso al dato la CPU preleva l'istruzione successiva sul bus
 *     delle istruzioni, e quel prelievo non costa cicli.
 *     Cicli = 2 × istruzioni − prelievi sovrapposti (per un programma che
 *     finisce con HLT; in generale: istruzioni + prelievi non sovrapposti).
 *  Per lo stesso programma i cicli Harvard non superano mai quelli von
 *  Neumann: la differenza è il traffico dei dati che, con un solo bus, deve
 *  fare la fila con le istruzioni (il collo di bottiglia di von Neumann).
 *  Nota: in modalità Harvard l'immagine di 16 celle viene caricata in tutte e
 *  due le memorie; STA scrive solo nella memoria dati, quindi un programma
 *  non può modificare le proprie istruzioni.
 */
(function (root) {
  'use strict';

  const CELLE = 16;

  /* ---------- insieme di istruzioni ---------- */

  // operando: 'indirizzo' (una cella), 'numero' (0–15) o null.
  // accesso: 'leggi' o 'scrivi' se l'esecuzione usa la memoria dei dati.
  const ISTRUZIONI = [
    { codice: 0x0, nome: 'NOP', operando: null, accesso: null, breve: 'nessuna operazione', rtl: '—' },
    { codice: 0x1, nome: 'LDA', operando: 'indirizzo', accesso: 'leggi', breve: 'carica in A il contenuto di una cella', rtl: 'A ← M[x]' },
    { codice: 0x2, nome: 'ADD', operando: 'indirizzo', accesso: 'leggi', breve: 'somma ad A il contenuto di una cella', rtl: 'A ← A + M[x]' },
    { codice: 0x3, nome: 'SUB', operando: 'indirizzo', accesso: 'leggi', breve: 'sottrae ad A il contenuto di una cella', rtl: 'A ← A − M[x]' },
    { codice: 0x4, nome: 'STA', operando: 'indirizzo', accesso: 'scrivi', breve: 'scrive A in una cella', rtl: 'M[x] ← A' },
    { codice: 0x5, nome: 'LDI', operando: 'numero', accesso: null, breve: 'carica in A un numero da 0 a 15', rtl: 'A ← n' },
    { codice: 0x6, nome: 'JMP', operando: 'indirizzo', accesso: null, breve: 'salta alla cella indicata', rtl: 'PC ← x' },
    { codice: 0x7, nome: 'JZ', operando: 'indirizzo', accesso: null, breve: 'salta se l\'ultimo risultato era zero', rtl: 'se Z = 1: PC ← x' },
    { codice: 0x8, nome: 'JC', operando: 'indirizzo', accesso: null, breve: 'salta se c\'è stato un riporto', rtl: 'se C = 1: PC ← x' },
    { codice: 0xE, nome: 'OUT', operando: null, accesso: null, breve: 'copia A sul display', rtl: 'uscita ← A' },
    { codice: 0xF, nome: 'HLT', operando: null, accesso: null, breve: 'ferma il clock', rtl: 'stop' },
  ];
  const PER_CODICE = {};
  const PER_NOME = {};
  ISTRUZIONI.forEach((i) => { PER_CODICE[i.codice] = i; PER_NOME[i.nome] = i; });

  /* ---------- numeri e formati ---------- */

  function byte(v) { return ((Number(v) % 256) + 256) % 256; }

  function bin(v, bit) {
    const n = bit || 8;
    const s = (v >>> 0).toString(2).padStart(n, '0').slice(-n);
    return n === 8 ? s.slice(0, 4) + ' ' + s.slice(4) : s;
  }

  function hex(v, cifre) {
    const n = cifre || 2;
    return (v >>> 0).toString(16).toUpperCase().padStart(n, '0').slice(-n);
  }

  // Valore come appare nelle celle e nei registri: 'bin', 'hex' o 'dec'.
  function formatta(v, base, bit) {
    const b = bit || 8;
    if (base === 'bin') return bin(v, b);
    if (base === 'hex') return hex(v, b === 4 ? 1 : 2);
    return String(v);
  }

  // Valore dentro una frase: con il decimale tra parentesi se la base non è 10.
  function nelTesto(v, base, bit) {
    const b = bit || 8;
    if (base === 'bin') return bin(v, b) + ' (' + v + ')';
    if (base === 'hex') return '0x' + hex(v, b === 4 ? 1 : 2) + ' (' + v + ')';
    return String(v);
  }

  // Indirizzo dentro una frase: sempre in decimale, in binario anche i 4 bit.
  function indirizzoNelTesto(n, base) {
    return base === 'bin' ? n + ' (' + bin(n, 4) + ')' : String(n);
  }

  /* ---------- codifica, decodifica, disassemblatore ---------- */

  function codifica(nome, operando) {
    const istr = typeof nome === 'number' ? PER_CODICE[nome] : PER_NOME[String(nome).toUpperCase()];
    if (!istr) throw new Error('Istruzione sconosciuta: ' + nome);
    const op = istr.operando ? (Number(operando) || 0) : 0;
    if (op < 0 || op > 15 || !Number.isInteger(op)) throw new Error('Operando fuori intervallo (0–15): ' + operando);
    return (istr.codice << 4) | op;
  }

  function decodifica(v) {
    const b = byte(v);
    const codice = b >> 4;
    const operando = b & 15;
    const istr = PER_CODICE[codice] || null;
    return { valore: b, codice: codice, operando: operando, istr: istr, nome: istr ? istr.nome : null, definita: !!istr };
  }

  // 'LDA 14', 'OUT', oppure '—' se il codice non è un'istruzione.
  function disassembla(v) {
    const d = decodifica(v);
    if (!d.istr) return '—';
    return d.istr.operando ? d.istr.nome + ' ' + d.operando : d.istr.nome;
  }

  /* ---------- assemblatore ---------- */

  function numero(t) {
    const s = String(t).trim().toLowerCase();
    if (/^0x[0-9a-f]+$/.test(s)) return parseInt(s.slice(2), 16);
    if (/^0b[01]+$/.test(s)) return parseInt(s.slice(2), 2);
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    return NaN;
  }

  // Una riga per cella, in ordine: «LDA 14», «OUT», «7», «0x1E», «0b00011110».
  // «13: 7» mette il valore nella cella 13. Dopo «;» c'è un commento.
  function assembla(sorgente) {
    const righe = Array.isArray(sorgente) ? sorgente : String(sorgente).split(/\r?\n/);
    const memoria = new Array(CELLE).fill(0);
    const commenti = new Array(CELLE).fill('');
    const ruoli = new Array(CELLE).fill(null);   // 'istruzione' o 'dato', come scritto nel sorgente
    const errori = [];
    let ind = 0;
    righe.forEach((riga, i) => {
      const pezzi = String(riga).split(';');
      const commento = pezzi.slice(1).join(';').trim();
      let t = pezzi[0].trim();
      if (!t) return;
      const etichetta = t.match(/^([0-9a-fx]+)\s*:\s*(.*)$/i);
      if (etichetta) {
        const n = numero(etichetta[1]);
        if (isNaN(n) || n < 0 || n >= CELLE) { errori.push({ riga: i + 1, messaggio: 'indirizzo non valido: ' + etichetta[1] }); return; }
        ind = n;
        t = etichetta[2].trim();
        if (!t) return;
      }
      if (ind >= CELLE) { errori.push({ riga: i + 1, messaggio: 'la memoria ha solo 16 celle' }); return; }
      const parti = t.split(/[\s,]+/).filter(Boolean);
      const nome = parti[0].toUpperCase();
      const istr = PER_NOME[nome];
      let valore;
      if (istr) {
        if (istr.operando) {
          if (parti.length < 2) { errori.push({ riga: i + 1, messaggio: nome + ' vuole un operando' }); return; }
          const op = numero(parti[1]);
          if (isNaN(op) || op < 0 || op > 15) { errori.push({ riga: i + 1, messaggio: 'operando fuori intervallo (0–15): ' + parti[1] }); return; }
          valore = (istr.codice << 4) | op;
        } else {
          if (parti.length > 1) { errori.push({ riga: i + 1, messaggio: nome + ' non vuole operandi' }); return; }
          valore = istr.codice << 4;
        }
      } else {
        const n = numero(parti[0]);
        if (isNaN(n) || n < 0 || n > 255 || parti.length > 1) { errori.push({ riga: i + 1, messaggio: 'istruzione o numero non valido: ' + t }); return; }
        valore = n;
      }
      memoria[ind] = valore;
      commenti[ind] = commento;
      ruoli[ind] = istr ? 'istruzione' : 'dato';
      ind += 1;
    });
    return { memoria: memoria, commenti: commenti, ruoli: ruoli, errori: errori };
  }

  /* ---------- stato della macchina ---------- */

  function normalizza(memoria) {
    const m = new Array(CELLE).fill(0);
    for (let i = 0; i < CELLE; i++) m[i] = byte((memoria && memoria[i]) || 0);
    return m;
  }

  function nuovoStato(memoria, modo) {
    const img = normalizza(memoria);
    const harvard = modo === 'harvard';
    return {
      modo: harvard ? 'harvard' : 'vn',
      mem: img.slice(),                     // von Neumann: l'unica memoria; Harvard: la memoria dati
      memI: harvard ? img.slice() : null,   // Harvard: la memoria istruzioni
      pc: 0, ir: 0, a: 0, z: 0, c: 0,
      indIstr: null,      // cella da cui viene l'istruzione che sta nell'IR
      fase: 'P1',         // prossimo micro-passo
      indirizzo: null,    // indirizzo del dato tra E1 ed E2
      uscita: null,
      uscite: [],
      cicli: 0, istruzioni: 0, prelievi: 0, accessiDati: 0, sovrapposti: 0,
      eseguite: 0,        // maschera di bit: celle prelevate come istruzioni
      datiToccati: 0,     // maschera di bit: celle lette o scritte come dati
      fermo: false,
    };
  }

  function copia(s) {
    const c = Object.assign({}, s);
    c.mem = s.mem.slice();
    c.memI = s.memI ? s.memI.slice() : null;
    c.uscite = s.uscite.slice();
    return c;
  }

  /* ---------- la CPU: un micro-passo alla volta ---------- */

  function testoZ(v) {
    return v === 0 ? 'È zero: il flag Z vale 1.' : 'Non è zero: il flag Z vale 0.';
  }

  function microPasso(s0, opz) {
    const o = opz || {};
    const base = o.base || 'dec';
    const testi = o.testi !== false;
    const s = copia(s0);
    const H = s.modo === 'harvard';
    const busI = H ? 'I' : 'U';
    const busD = H ? 'D' : 'U';
    const memI = H ? s.memI : s.mem;
    const val = (v) => nelTesto(v, base, 8);
    const ind = (n) => indirizzoNelTesto(n, base);
    const ev = [];
    let testo = '';
    let cicli = 0;
    let fine = false;
    let fase = '';
    const id = s.fermo ? 'FERMO' : s.fase;

    if (s.fermo) {
      return {
        passo: {
          id: 'FERMO', fase: 'fermo', cicli: 0, eventi: [], fineIstruzione: true,
          testo: testi ? 'La CPU è ferma. Premi «Ricomincia» per eseguire di nuovo il programma, oppure scegline un altro.' : '',
          dopo: copia(s),
        },
        stato: s,
      };
    }

    const d = decodifica(s.ir);
    const istr = d.istr;

    switch (s.fase) {
      case 'P1': {
        fase = 'prelievo';
        ev.push({ tipo: 'indirizzo', bus: busI, da: 'pc', valore: s.pc });
        if (!H) ev.push({ tipo: 'controllo', bus: 'U', linea: 'leggi' });
        if (testi) {
          testo = H
            ? '<strong>Prelievo.</strong> Il contatore di programma (PC) vale ' + ind(s.pc) + ': il suo valore va sul bus indirizzi delle istruzioni e la memoria istruzioni seleziona la cella ' + s.pc + '.'
            : '<strong>Prelievo.</strong> Il contatore di programma (PC) vale ' + ind(s.pc) + ': il suo valore va sul bus indirizzi e l\'unità di controllo accende la linea LEGGI. La memoria seleziona la cella ' + s.pc + '.';
        }
        s.fase = 'P2';
        break;
      }

      case 'P2': {
        fase = 'prelievo';
        const v = memI[s.pc];
        const prima = s.pc;
        ev.push({ tipo: 'leggi', bus: busI, mem: busI, indirizzo: prima, valore: v, verso: 'ir', genere: 'istruzione' });
        s.ir = v;
        s.indIstr = prima;
        s.pc = (prima + 1) & 15;
        s.eseguite |= (1 << prima);
        s.prelievi += 1;
        ev.push({ tipo: 'pc', prima: prima, valore: s.pc, motivo: 'incremento' });
        cicli = 1;
        if (testi) {
          testo = 'Il contenuto della cella ' + prima + ', ' + val(v) + ', viaggia sul bus ' + (H ? 'delle istruzioni' : 'dati') +
            ' fino al registro istruzione (IR). Il PC aumenta di uno e ora vale ' + s.pc +
            (prima === 15 ? ': con soli 4 bit, dopo 15 ricomincia da 0' : ': indica già la prossima istruzione') + '.';
        }
        s.fase = 'D';
        break;
      }

      case 'D': {
        fase = 'decodifica';
        ev.push({ tipo: 'decodifica', codice: d.codice, operando: d.operando, nome: d.nome, definita: d.definita });
        if (testi) {
          if (!istr) {
            testo = '<strong>Decodifica.</strong> I primi 4 bit dell\'IR, ' + bin(d.codice, 4) + ', non corrispondono a nessuna istruzione: la CPU non farà niente e passerà alla successiva.';
          } else {
            testo = '<strong>Decodifica.</strong> L\'unità di controllo legge i primi 4 bit dell\'IR, ' + bin(d.codice, 4) +
              ': è il codice di <strong>' + istr.nome + '</strong>, «' + istr.breve + '».';
            if (istr.operando === 'indirizzo') testo += ' Gli altri 4 bit, ' + bin(d.operando, 4) + ', indicano la cella ' + d.operando + '.';
            else if (istr.operando === 'numero') testo += ' Gli altri 4 bit, ' + bin(d.operando, 4) + ', sono il numero ' + d.operando + '.';
            else testo += ' Gli altri 4 bit qui non servono.';
          }
        }
        s.fase = istr && istr.accesso ? 'E1' : 'E';
        break;
      }

      case 'E1': {
        fase = 'esecuzione';
        const x = d.operando;
        const scrive = istr.accesso === 'scrivi';
        ev.push({ tipo: 'indirizzo', bus: busD, da: 'ir', valore: x });
        ev.push({ tipo: 'controllo', bus: busD, linea: scrive ? 'scrivi' : 'leggi' });
        if (H) ev.push({ tipo: 'indirizzo', bus: 'I', da: 'pc', valore: s.pc, anticipo: true });
        s.indirizzo = x;
        if (testi) {
          if (H) {
            testo = '<strong>Esecuzione.</strong> L\'operando, ' + ind(x) + ', va sul bus indirizzi dei dati con la linea ' +
              (scrive ? 'SCRIVI: la memoria dati si prepara a ricevere un dato nella cella ' : 'LEGGI: la memoria dati seleziona la cella ') + x +
              '. Intanto, sull\'altro bus, il PC (' + s.pc + ') chiede alla memoria istruzioni la prossima istruzione.';
          } else if (scrive) {
            testo = '<strong>Esecuzione.</strong> Ora sul bus indirizzi va l\'operando, ' + ind(x) + ', e questa volta si accende la linea SCRIVI: la memoria si prepara a ricevere un dato nella cella ' + x + '.';
          } else {
            testo = '<strong>Esecuzione.</strong> Ora sul bus indirizzi va l\'operando, ' + ind(x) + ', e si accende di nuovo la linea LEGGI: la memoria seleziona la cella ' + x +
              '. È lo stesso bus delle istruzioni: il prelievo della prossima dovrà aspettare.';
          }
        }
        s.fase = 'E2';
        break;
      }

      case 'E2': {
        fase = 'esecuzione';
        const x = s.indirizzo;
        const a0 = s.a;
        if (istr.accesso === 'scrivi') {
          const prima = s.mem[x];
          s.mem[x] = a0;
          ev.push({ tipo: 'scrivi', bus: busD, mem: busD, indirizzo: x, valore: a0, prima: prima, da: 'a' });
          if (testi) {
            testo = 'Il valore di A, ' + val(a0) + ', viaggia sul bus dati dalla CPU alla memoria' + (H ? ' dei dati' : '') + ' ed è scritto nella cella ' + x + '.';
            const eraIstruzione = (s.eseguite >> x) & 1;
            if (eraIstruzione && !H) {
              testo += ' Attenzione: in quella cella c\'era un\'istruzione del programma, che ora è diventata <strong>' + disassembla(a0) + '</strong>. Il programma ha modificato se stesso!';
            } else if (eraIstruzione && H) {
              testo += ' Ma l\'istruzione nella cella ' + x + ' della memoria istruzioni resta <strong>' + disassembla(s.memI[x]) + '</strong>: in Harvard un programma non può modificare se stesso.';
            }
          }
        } else {
          const v = s.mem[x];
          if (istr.nome === 'LDA') {
            s.a = v;
            s.z = v === 0 ? 1 : 0;
            ev.push({ tipo: 'leggi', bus: busD, mem: busD, indirizzo: x, valore: v, verso: 'a', genere: 'dato' });
            ev.push({ tipo: 'a', prima: a0, valore: s.a, da: 'mem' });
            if (testi) testo = 'Il contenuto della cella ' + x + ', ' + val(v) + ', viaggia sul bus dati ed entra nell\'accumulatore A. ' + testoZ(v);
          } else {
            const somma = istr.nome === 'ADD';
            const grezzo = somma ? a0 + v : a0 - v;
            const r = byte(grezzo);
            s.a = r;
            s.z = r === 0 ? 1 : 0;
            s.c = somma ? (grezzo > 255 ? 1 : 0) : (grezzo < 0 ? 1 : 0);
            ev.push({ tipo: 'leggi', bus: busD, mem: busD, indirizzo: x, valore: v, verso: 'alu', genere: 'dato' });
            ev.push({ tipo: 'alu', op: somma ? '+' : '−', x: a0, y: v, risultato: r, z: s.z, c: s.c });
            ev.push({ tipo: 'a', prima: a0, valore: r, da: 'alu' });
            if (testi) {
              testo = 'Il contenuto della cella ' + x + ', ' + val(v) + ', arriva all\'unità aritmetica e logica (ALU), che calcola ' +
                a0 + (somma ? ' + ' : ' − ') + v + ' = ' + grezzo;
              if (somma && grezzo > 255) testo += ': oltre 255 non si va, il risultato riparte da zero e diventa ' + r + ', e il flag C segnala il riporto.';
              else if (!somma && grezzo < 0) testo += ': sotto zero il risultato fa il giro e diventa ' + r + ' (cioè 256 ' + grezzo.toString().replace('-', '− ') + '), e il flag C segnala il prestito.';
              else testo += '.';
              testo += ' Il risultato torna in A. ' + testoZ(r);
            }
          }
        }
        s.datiToccati |= (1 << x);
        s.accessiDati += 1;
        s.istruzioni += 1;
        s.indirizzo = null;
        cicli = 1;
        fine = true;
        if (H) {
          // Prelievo sovrapposto: nello stesso ciclo arriva la prossima istruzione.
          const p = s.pc;
          const vi = s.memI[p];
          ev.push({ tipo: 'leggi', bus: 'I', mem: 'I', indirizzo: p, valore: vi, verso: 'ir', genere: 'istruzione', anticipo: true });
          s.ir = vi;
          s.indIstr = p;
          s.pc = (p + 1) & 15;
          s.eseguite |= (1 << p);
          s.prelievi += 1;
          s.sovrapposti += 1;
          ev.push({ tipo: 'pc', prima: p, valore: s.pc, motivo: 'incremento', anticipo: true });
          if (testi) testo += ' Nello stesso ciclo, sull\'altro bus, l\'istruzione della cella ' + p + ' arriva all\'IR: un prelievo che non costa tempo.';
          s.fase = 'D';
        } else {
          s.fase = 'P1';
        }
        break;
      }

      case 'E': {
        fase = 'esecuzione';
        const x = d.operando;
        const nome = istr ? istr.nome : null;
        cicli = 1;
        fine = true;
        s.istruzioni += 1;
        s.fase = 'P1';
        if (nome === 'LDI') {
          const a0 = s.a;
          s.a = x;
          s.z = x === 0 ? 1 : 0;
          ev.push({ tipo: 'a', prima: a0, valore: x, da: 'ir' });
          if (testi) testo = '<strong>Esecuzione.</strong> L\'operando, ' + x + ', qui non è un indirizzo ma il numero stesso: passa dall\'IR all\'accumulatore senza usare il bus. A = ' + val(x) + '. ' + testoZ(x);
        } else if (nome === 'JMP' || nome === 'JZ' || nome === 'JC') {
          const cond = nome === 'JMP' ? null : (nome === 'JZ' ? 'Z' : 'C');
          const preso = cond === null || (cond === 'Z' ? s.z === 1 : s.c === 1);
          ev.push({ tipo: 'salto', condizione: cond, preso: preso, verso: x });
          if (preso) {
            const prima = s.pc;
            s.pc = x;
            ev.push({ tipo: 'pc', prima: prima, valore: x, motivo: 'salto' });
          }
          if (testi) {
            if (!cond) testo = '<strong>Esecuzione.</strong> Salto: l\'operando, ' + x + ', entra nel contatore di programma. La prossima istruzione verrà prelevata dalla cella ' + x + '.';
            else if (cond === 'Z') testo = preso
              ? '<strong>Esecuzione.</strong> Il flag Z vale 1, cioè l\'ultimo risultato era zero: il salto avviene e il PC diventa ' + x + '.'
              : '<strong>Esecuzione.</strong> Il flag Z vale 0, cioè l\'ultimo risultato non era zero: niente salto, il programma prosegue dalla cella ' + s.pc + '.';
            else testo = preso
              ? '<strong>Esecuzione.</strong> Il flag C vale 1 (c\'è stato un riporto o un prestito): il salto avviene e il PC diventa ' + x + '.'
              : '<strong>Esecuzione.</strong> Il flag C vale 0: niente salto, il programma prosegue dalla cella ' + s.pc + '.';
          }
        } else if (nome === 'OUT') {
          s.uscita = s.a;
          s.uscite.push(s.a);
          ev.push({ tipo: 'uscita', valore: s.a });
          if (testi) testo = '<strong>Esecuzione.</strong> Il valore di A, ' + val(s.a) + ', viene copiato nel registro di uscita: il display mostra ' + s.a + '.';
        } else if (nome === 'HLT') {
          s.fermo = true;
          s.fase = 'FERMO';
          ev.push({ tipo: 'ferma' });
          if (testi) testo = '<strong>Esecuzione.</strong> HLT: il clock si ferma. Programma finito dopo ' + s.istruzioni + ' istruzioni e ' + (s.cicli + 1) + ' cicli di clock.';
        } else {
          ev.push({ tipo: 'nulla' });
          if (testi) testo = nome === 'NOP'
            ? '<strong>Esecuzione.</strong> NOP: nessuna operazione. Passa solo un ciclo di clock.'
            : '<strong>Esecuzione.</strong> Codice sconosciuto: la CPU non fa niente, come per NOP.';
        }
        break;
      }

      default:
        throw new Error('Fase sconosciuta: ' + s.fase);
    }

    s.cicli += cicli;
    return {
      passo: { id: id, fase: fase, cicli: cicli, eventi: ev, testo: testo, fineIstruzione: fine, dopo: copia(s) },
      stato: s,
    };
  }

  // Tutti i micro-passi di una istruzione (fino alla fine della sua esecuzione).
  function istruzione(s0, opz) {
    let s = s0;
    const passi = [];
    let guardia = 0;
    do {
      const r = microPasso(s, opz);
      passi.push(r.passo);
      s = r.stato;
      guardia += 1;
      if (r.passo.id === 'FERMO') break;
    } while (!passi[passi.length - 1].fineIstruzione && guardia < 8);
    return { passi: passi, stato: s };
  }

  // Esegue fino a HLT (o fino al limite di istruzioni).
  function esegui(memoria, modo, opz) {
    const o = Object.assign({ testi: false }, opz || {});
    const max = o.maxIstruzioni || 1000;
    let s = nuovoStato(memoria, modo);
    const passi = o.passi ? [] : null;
    let guardia = 0;
    while (!s.fermo && s.istruzioni < max && guardia < max * 6) {
      const r = microPasso(s, o);
      if (passi) passi.push(r.passo);
      s = r.stato;
      guardia += 1;
    }
    return {
      stato: s, fermo: s.fermo, uscite: s.uscite.slice(),
      cicli: s.cicli, istruzioni: s.istruzioni, prelievi: s.prelievi,
      accessiDati: s.accessiDati, sovrapposti: s.sovrapposti,
      eseguite: s.eseguite, datiToccati: s.datiToccati, passi: passi,
    };
  }

  // Lo stesso programma nelle due architetture.
  function confronta(memoria, opz) {
    const vn = esegui(memoria, 'vn', opz);
    const harvard = esegui(memoria, 'harvard', opz);
    return {
      vn: vn,
      harvard: harvard,
      risparmio: vn.fermo && harvard.fermo ? vn.cicli - harvard.cicli : null,
    };
  }

  // Per ogni cella: 'istruzione', 'dato', 'entrambi' o null (mai usata).
  function usoCelle(memoria, modo, opz) {
    const r = esegui(memoria, modo, Object.assign({ maxIstruzioni: 300 }, opz || {}));
    const uso = [];
    for (let i = 0; i < CELLE; i++) {
      const istr = (r.eseguite >> i) & 1;
      const dato = (r.datiToccati >> i) & 1;
      uso.push(istr && dato ? 'entrambi' : istr ? 'istruzione' : dato ? 'dato' : null);
    }
    return { uso: uso, eseguite: r.eseguite, datiToccati: r.datiToccati, fermo: r.fermo };
  }

  /* ---------- descrizioni brevi e traffico sui bus (per il laboratorio) ---------- */

  // L'istruzione in notazione «da registro a registro», con l'operando vero: 'A ← A + M[15]'.
  function rtl(v) {
    const d = decodifica(v);
    if (!d.istr) return 'codice sconosciuto: come NOP';
    return d.istr.rtl.replace(/\bx\b/g, String(d.operando)).replace(/\bn\b/g, String(d.operando));
  }

  // Una riga che riassume il micro-passo (per la barra di stato del laboratorio).
  function riassunto(passo) {
    const ev = (t) => passo.eventi.find((e) => e.tipo === t);
    const anticipo = passo.eventi.some((e) => e.anticipo && e.tipo === 'leggi');
    switch (passo.id) {
      case 'P1': return 'Prelievo · il PC va sul bus indirizzi';
      case 'P2': return 'Prelievo · l\'istruzione entra nell\'IR';
      case 'D': {
        const d = ev('decodifica');
        return 'Decodifica · ' + (d && d.nome ? d.nome : 'codice sconosciuto');
      }
      case 'E1': return 'Esecuzione · l\'operando va sul bus indirizzi' + (passo.eventi.some((e) => e.anticipo) ? ' (e il PC sull\'altro bus)' : '');
      case 'E2': {
        const base = ev('scrivi') ? 'Esecuzione · A viene scritto in memoria' : (ev('alu') ? 'Esecuzione · l\'ALU calcola' : 'Esecuzione · il dato entra in A');
        return base + (anticipo ? ', e intanto arriva la prossima istruzione' : '');
      }
      case 'E': {
        if (ev('ferma')) return 'Esecuzione · HLT, il clock si ferma';
        if (ev('uscita')) return 'Esecuzione · A va sul display';
        const salto = ev('salto');
        if (salto) return 'Esecuzione · ' + (salto.preso ? 'salto alla cella ' + salto.verso : 'niente salto');
        if (ev('a')) return 'Esecuzione · il numero entra in A';
        return 'Esecuzione · nessuna operazione';
      }
      default: return 'CPU ferma';
    }
  }

  // Che cosa passa sui bus in ogni ciclo di clock, dall'inizio alla fine del programma.
  // Von Neumann: bus.U; Harvard: bus.I (istruzioni) e bus.D (dati).
  // Ogni voce è 'istruzione', 'dato' oppure null (bus libero in quel ciclo).
  function traffico(memoria, modo, opz) {
    const o = Object.assign({ maxCicli: 160 }, opz || {});
    let s = nuovoStato(memoria, modo);
    const H = s.modo === 'harvard';
    const bus = H ? { I: [], D: [] } : { U: [] };
    let guardia = 0;
    while (!s.fermo && s.cicli < o.maxCicli && guardia < o.maxCicli * 8) {
      const r = microPasso(s, { testi: false });
      const p = r.passo;
      if (p.cicli) {
        const istr = p.eventi.some((e) => e.tipo === 'leggi' && e.genere === 'istruzione');
        const dato = p.eventi.some((e) => (e.tipo === 'leggi' && e.genere === 'dato') || e.tipo === 'scrivi');
        if (H) { bus.I.push(istr ? 'istruzione' : null); bus.D.push(dato ? 'dato' : null); }
        else bus.U.push(istr ? 'istruzione' : (dato ? 'dato' : null));
      }
      s = r.stato;
      guardia += 1;
    }
    return { modo: s.modo, cicli: s.cicli, istruzioni: s.istruzioni, fermo: s.fermo, bus: bus };
  }

  /* ---------- programmi pronti ---------- */

  const PROGRAMMI = [
    {
      id: 'somma',
      nome: 'Somma 7 + 5',
      breve: '7 + 5',
      descrizione: 'Carica 7 nell\'accumulatore, gli somma 5, mostra il risultato e lo salva nella cella 13. Conta quante volte il bus serve per i dati.',
      sorgente: [
        'LDA 14    ; A ← 7, il numero della cella 14',
        'ADD 15    ; A ← A + 5',
        'OUT       ; mostra A sul display',
        'STA 13    ; salva il risultato nella cella 13',
        'HLT       ; fine',
        '13: 0     ; qui finirà il risultato',
        '14: 7     ; primo numero',
        '15: 5     ; secondo numero',
      ],
      atteso: { uscite: [12], celle: { 13: 12 } },
    },
    {
      id: 'conto',
      nome: 'Conto alla rovescia da 5 a 0',
      breve: 'Conto alla rovescia',
      descrizione: 'Parte da 5 e mostra ogni numero fino a 0. JZ controlla se si è arrivati a zero, JMP torna indietro: è un ciclo, il modo in cui un computer ripete un lavoro.',
      sorgente: [
        'LDI 5     ; A ← 5',
        'OUT       ; mostra A',
        'JZ 6      ; se A vale 0, salta alla fine',
        'SUB 15    ; A ← A − 1',
        'JMP 1     ; torna a mostrare A',
        'NOP       ; cella libera',
        'HLT       ; fine',
        '15: 1     ; la costante 1',
      ],
      atteso: { uscite: [5, 4, 3, 2, 1, 0] },
    },
    {
      id: 'molt',
      nome: 'Moltiplica 3 × 4',
      breve: '3 × 4',
      descrizione: 'La CPU non sa moltiplicare: somma 3 per quattro volte. Il contatore nella cella 12 dice quanti giri mancano; il display mostra le somme parziali.',
      sorgente: [
        'LDA 13    ; A ← prodotto parziale',
        'ADD 14    ; A ← A + 3',
        'STA 13    ; salva il prodotto parziale',
        'OUT       ; e lo mostra',
        'LDA 12    ; A ← contatore',
        'SUB 15    ; A ← A − 1',
        'STA 12    ; salva il contatore',
        'JZ 9      ; contatore a zero? Fine',
        'JMP 0     ; altrimenti un altro giro',
        'HLT       ; fine',
        '12: 4     ; contatore: quante volte sommare',
        '13: 0     ; prodotto, all\'inizio 0',
        '14: 3     ; il numero da sommare',
        '15: 1     ; la costante 1',
      ],
      atteso: { uscite: [3, 6, 9, 12], celle: { 12: 0, 13: 12 } },
    },
    {
      id: 'auto',
      nome: 'Il programma che si modifica',
      breve: 'Si modifica da solo',
      descrizione: 'Somma i numeri delle celle 12, 13 e 14, fino allo 0 della cella 15. Per passare al numero successivo aumenta di uno l\'indirizzo scritto dentro la propria prima istruzione: si può fare solo perché istruzioni e dati stanno nella stessa memoria. Prova anche in modalità Harvard.',
      sorgente: [
        'LDA 12    ; A ← un numero della lista (questo indirizzo cambierà)',
        'JZ 9      ; numero zero? La lista è finita',
        'ADD 10    ; A ← A + somma',
        'STA 10    ; salva la somma',
        'OUT       ; mostra la somma parziale',
        'LDA 0     ; A ← la prima istruzione, letta come un numero',
        'ADD 11    ; + 1: ora indica la cella successiva',
        'STA 0     ; riscrive la prima istruzione',
        'JMP 0     ; e ricomincia',
        'HLT       ; fine',
        '10: 0     ; somma',
        '11: 1     ; la costante 1',
        '12: 7     ; la lista: 7, 5, 9',
        '13: 5',
        '14: 9',
        '15: 0     ; fine della lista',
      ],
      atteso: { uscite: [7, 12, 21], celle: { 0: 0x1F, 10: 21 } },
    },
  ];

  PROGRAMMI.forEach((p) => {
    const r = assembla(p.sorgente);
    p.memoria = r.memoria;
    p.commenti = r.commenti;
    p.ruoli = r.ruoli;
    p.errori = r.errori;
  });

  function programma(id) {
    return PROGRAMMI.find((p) => p.id === id) || null;
  }

  const api = {
    CELLE: CELLE,
    ISTRUZIONI: ISTRUZIONI,
    PER_CODICE: PER_CODICE,
    PER_NOME: PER_NOME,
    PROGRAMMI: PROGRAMMI,
    programma: programma,
    byte: byte,
    bin: bin,
    hex: hex,
    formatta: formatta,
    nelTesto: nelTesto,
    codifica: codifica,
    decodifica: decodifica,
    disassembla: disassembla,
    assembla: assembla,
    normalizza: normalizza,
    nuovoStato: nuovoStato,
    copia: copia,
    microPasso: microPasso,
    istruzione: istruzione,
    esegui: esegui,
    confronta: confronta,
    usoCelle: usoCelle,
    rtl: rtl,
    riassunto: riassunto,
    traffico: traffico,
  };

  (root.StoriaPCModelli = root.StoriaPCModelli || {})['von-neumann'] = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
