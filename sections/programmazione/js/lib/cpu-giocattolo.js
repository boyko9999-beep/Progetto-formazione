/*
 * CPU giocattolo: una macchina ad accumulatore con parole di 8 bit, come quelle degli anni '40 e '50.
 * Ogni parola è 3 bit di codice operativo + 5 bit di indirizzo, quindi 32 celle di memoria.
 * La cella 31 è l'uscita: scriverci un numero lo "stampa" (ingresso/uscita mappati in memoria).
 * Programma e dati stanno nella stessa memoria: è l'idea del programma memorizzato.
 *
 * La usano i laboratori "programma memorizzato", "assemblatore" e "compilatore";
 * in Node si carica con require() per i test.
 */
(function (root) {
  'use strict';

  const CELLE = 32;
  const OUT = 31;

  const ISA = [
    { codice: 0, nome: 'HALT', operando: false, descrizione: 'Ferma la macchina.' },
    { codice: 1, nome: 'LOAD', operando: true, descrizione: 'Copia nell\'accumulatore il numero contenuto nella cella indicata.' },
    { codice: 2, nome: 'STORE', operando: true, descrizione: 'Copia l\'accumulatore nella cella indicata (la cella 31 è l\'uscita).' },
    { codice: 3, nome: 'ADD', operando: true, descrizione: 'Somma all\'accumulatore il numero contenuto nella cella indicata.' },
    { codice: 4, nome: 'SUB', operando: true, descrizione: 'Sottrae all\'accumulatore il numero contenuto nella cella indicata.' },
    { codice: 5, nome: 'MUL', operando: true, descrizione: 'Moltiplica l\'accumulatore per il numero contenuto nella cella indicata.' },
    { codice: 6, nome: 'JUMP', operando: true, descrizione: 'Salta all\'istruzione contenuta nella cella indicata.' },
    { codice: 7, nome: 'JZ', operando: true, descrizione: 'Salta alla cella indicata solo se l\'accumulatore vale zero.' },
  ];
  const PER_NOME = Object.fromEntries(ISA.map((i) => [i.nome, i]));

  const ESEMPI = {
    somma: [
      '; Somma i numeri da 5 a 1 e stampa il risultato (15)',
      'ciclo:  LOAD somma',
      '        ADD n',
      '        STORE somma',
      '        LOAD n',
      '        SUB uno',
      '        STORE n',
      '        JZ fine',
      '        JUMP ciclo',
      'fine:   LOAD somma',
      '        STORE OUT',
      '        HALT',
      'n:      DATA 5',
      'uno:    DATA 1',
      'somma:  DATA 0',
    ].join('\n'),
    conto: [
      '; Conto alla rovescia: stampa 3, 2, 1',
      'inizio: LOAD n',
      '        STORE OUT',
      '        SUB uno',
      '        STORE n',
      '        JZ fine',
      '        JUMP inizio',
      'fine:   HALT',
      'n:      DATA 3',
      'uno:    DATA 1',
    ].join('\n'),
    formula: [
      '; Y = A + B * C con A = 2, B = 3, C = 4',
      '        LOAD b',
      '        MUL c',
      '        ADD a',
      '        STORE y',
      '        STORE OUT',
      '        HALT',
      'a:      DATA 2',
      'b:      DATA 3',
      'c:      DATA 4',
      'y:      DATA 0',
    ].join('\n'),
  };

  function bin(n, cifre) {
    return (n >>> 0).toString(2).padStart(cifre || 8, '0').slice(-(cifre || 8));
  }

  function codifica(codice, indirizzo) {
    return ((codice & 7) << 5) | (indirizzo & 31);
  }

  function decodifica(parola) {
    const op = (parola >> 5) & 7;
    return { op: op, arg: parola & 31, istruzione: ISA[op] };
  }

  function disassembla(parola) {
    const d = decodifica(parola);
    return d.istruzione.operando ? d.istruzione.nome + ' ' + d.arg : d.istruzione.nome;
  }

  function numero(testo) {
    if (/^-?\d+$/.test(testo)) return parseInt(testo, 10);
    if (/^0b[01]+$/i.test(testo)) return parseInt(testo.slice(2), 2);
    if (/^0x[0-9a-f]+$/i.test(testo)) return parseInt(testo.slice(2), 16);
    return null;
  }

  /*
   * Assemblatore a due passate.
   * Sintassi di una riga:   [etichetta:] [ISTRUZIONE [operando]] [; commento]
   * L'operando è un numero (0-31) o un'etichetta; OUT vale 31. DATA n mette un numero (da -128 a 255).
   */
  function assembla(sorgente) {
    const righe = String(sorgente || '').split(/\r?\n/).map((testo, i) => ({ n: i + 1, testo: testo, indirizzo: null, parola: null, etichetta: null, istruzione: null, operando: null, commento: null, errore: null }));
    const simboli = { out: OUT };
    const errori = [];
    let pc = 0;

    function errore(r, msg) {
      if (!r.errore) { r.errore = msg; errori.push({ riga: r.n, messaggio: msg }); }
    }

    // prima passata: etichette e indirizzi
    for (const r of righe) {
      let t = r.testo;
      const pv = t.indexOf(';');
      if (pv >= 0) { r.commento = t.slice(pv + 1).trim(); t = t.slice(0, pv); }
      t = t.trim();
      const m = t.match(/^([A-Za-z_][\w]*)\s*:\s*(.*)$/);
      if (m) {
        r.etichetta = m[1];
        const k = m[1].toLowerCase();
        if (k === 'out' || PER_NOME[m[1].toUpperCase()] || k === 'data') errore(r, '"' + m[1] + '" è una parola riservata: scegli un altro nome.');
        else if (k in simboli) errore(r, 'L\'etichetta "' + m[1] + '" è già usata.');
        else simboli[k] = pc;
        t = m[2].trim();
      }
      if (!t) continue;
      const parti = t.split(/[\s,]+/).filter(Boolean);
      r.istruzione = parti[0].toUpperCase();
      r.operando = parti[1] == null ? null : parti[1];
      if (parti.length > 2) errore(r, 'Troppi operandi: ogni istruzione ne ha al massimo uno.');
      if (r.istruzione !== 'DATA' && !PER_NOME[r.istruzione]) errore(r, 'Istruzione sconosciuta: "' + parti[0] + '".');
      if (pc >= OUT) errore(r, 'Il programma è troppo lungo: le celle da 0 a 30 sono finite (la 31 è l\'uscita).');
      r.indirizzo = pc;
      pc += 1;
    }

    // seconda passata: codifica
    for (const r of righe) {
      if (r.istruzione == null || r.errore) continue;
      if (r.istruzione === 'DATA') {
        const v = r.operando == null ? null : numero(r.operando);
        if (v == null) errore(r, 'DATA vuole un numero, per esempio DATA 7.');
        else if (v < -128 || v > 255) errore(r, 'Una cella da 8 bit contiene numeri da 0 a 255 (o da -128 a 127).');
        else r.parola = v & 255;
        continue;
      }
      const istr = PER_NOME[r.istruzione];
      if (!istr.operando) {
        if (r.operando != null) errore(r, istr.nome + ' non vuole operandi.');
        else r.parola = codifica(istr.codice, 0);
        continue;
      }
      if (r.operando == null) { errore(r, istr.nome + ' vuole l\'indirizzo di una cella o un\'etichetta.'); continue; }
      let ind = numero(r.operando);
      if (ind == null) {
        const k = r.operando.toLowerCase();
        if (!(k in simboli)) { errore(r, 'Etichetta sconosciuta: "' + r.operando + '".'); continue; }
        ind = simboli[k];
      }
      if (ind < 0 || ind > 31) { errore(r, 'Gli indirizzi vanno da 0 a 31.'); continue; }
      r.parola = codifica(istr.codice, ind);
    }

    const parole = new Array(CELLE).fill(0);
    for (const r of righe) if (r.parola != null && r.indirizzo != null) parole[r.indirizzo] = r.parola;
    errori.sort((a, b) => a.riga - b.riga);
    return { ok: errori.length === 0, parole: parole, righe: righe, errori: errori, simboli: simboli, lunghezza: pc };
  }

  /* ---------- esecuzione ---------- */

  function crea(parole) {
    const mem = new Array(CELLE).fill(0);
    (parole || []).forEach((p, i) => { if (i < CELLE) mem[i] = p & 255; });
    return { mem: mem, pc: 0, acc: 0, ir: 0, fermo: false, uscita: [], passi: 0 };
  }

  // Esegue una istruzione e descrive che cosa è successo (per le animazioni).
  function passo(st) {
    if (st.fermo) return null;
    const indirizzo = st.pc;
    const parola = st.mem[indirizzo];
    const d = decodifica(parola);
    st.ir = parola;
    st.pc = (st.pc + 1) % CELLE;
    const ev = { indirizzo: indirizzo, parola: parola, op: d.op, arg: d.arg, nome: d.istruzione.nome, accPrima: st.acc, letto: null, scritto: null, saltato: false, uscita: null, fermo: false };
    switch (d.op) {
      case 0: st.fermo = true; ev.fermo = true; break;
      case 1: ev.letto = d.arg; st.acc = st.mem[d.arg]; break;
      case 2:
        ev.scritto = d.arg;
        st.mem[d.arg] = st.acc;
        if (d.arg === OUT) { st.uscita.push(st.acc); ev.uscita = st.acc; }
        break;
      case 3: ev.letto = d.arg; st.acc = (st.acc + st.mem[d.arg]) & 255; break;
      case 4: ev.letto = d.arg; st.acc = (st.acc - st.mem[d.arg]) & 255; break;
      case 5: ev.letto = d.arg; st.acc = (st.acc * st.mem[d.arg]) & 255; break;
      case 6: st.pc = d.arg; ev.saltato = true; break;
      case 7: if (st.acc === 0) { st.pc = d.arg; ev.saltato = true; } break;
      default: break;
    }
    ev.accDopo = st.acc;
    ev.pcDopo = st.pc;
    st.passi += 1;
    return ev;
  }

  function esegui(st, maxPassi) {
    const limite = maxPassi || 1000;
    while (!st.fermo && st.passi < limite) passo(st);
    return st;
  }

  // Le tre fasi del ciclo di istruzione, raccontate a parole.
  function fasi(ev) {
    const out = [
      { fase: 'prelievo', testo: 'Il contatore di programma indica la cella ' + ev.indirizzo + ': la CPU ne copia il contenuto (' + bin(ev.parola) + ') nel registro istruzione.' },
      { fase: 'decodifica', testo: 'I primi 3 bit (' + bin(ev.op, 3) + ') significano ' + ev.nome + (ISA[ev.op].operando ? '; gli altri 5 (' + bin(ev.arg, 5) + ') indicano la cella ' + ev.arg + '.' : '.') },
    ];
    let testo;
    switch (ev.op) {
      case 0: testo = 'La macchina si ferma.'; break;
      case 1: testo = 'Copia ' + ev.accDopo + ' dalla cella ' + ev.arg + ' nell\'accumulatore.'; break;
      case 2: testo = ev.uscita != null ? 'Scrive ' + ev.accDopo + ' nella cella 31: è l\'uscita, il numero viene stampato.' : 'Scrive ' + ev.accDopo + ' nella cella ' + ev.arg + '.'; break;
      case 3: testo = ev.accPrima + ' + ' + ((ev.accDopo - ev.accPrima) & 255) + ' = ' + ev.accDopo + ' nell\'accumulatore.'; break;
      case 4: testo = ev.accPrima + ' − ' + ((ev.accPrima - ev.accDopo) & 255) + ' = ' + ev.accDopo + ' nell\'accumulatore.'; break;
      case 5: testo = 'Moltiplica ' + ev.accPrima + ' per il numero della cella ' + ev.arg + ': ora l\'accumulatore vale ' + ev.accDopo + '.'; break;
      case 6: testo = 'Il contatore di programma salta alla cella ' + ev.arg + '.'; break;
      case 7: testo = ev.saltato ? 'L\'accumulatore vale zero: salta alla cella ' + ev.arg + '.' : 'L\'accumulatore non vale zero: prosegue con la cella ' + ev.pcDopo + '.'; break;
      default: testo = '';
    }
    out.push({ fase: 'esecuzione', testo: testo });
    return out;
  }

  const api = {
    CELLE: CELLE,
    OUT: OUT,
    ISA: ISA,
    ESEMPI: ESEMPI,
    bin: bin,
    codifica: codifica,
    decodifica: decodifica,
    disassembla: disassembla,
    assembla: assembla,
    crea: crea,
    passo: passo,
    esegui: esegui,
    fasi: fasi,
  };
  root.CpuGiocattolo = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
