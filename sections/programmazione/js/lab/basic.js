/*
 * Laboratorio «Un BASIC dell'epoca» (capitolo 9 · Il software per tutti).
 *
 * Un piccolo interprete BASIC nello stile degli home computer dei primi anni Ottanta, su uno
 * schermo di 40 colonne per 25 righe. Righe numerate e comandi RUN, LIST, NEW, CLS; istruzioni
 * PRINT, LET, INPUT, GOTO, IF…THEN, FOR…TO…STEP / NEXT, GOSUB / RETURN, END, STOP, REM, più
 * istruzioni sulla stessa riga separate da «:»; variabili numeriche e di testo (A$); le funzioni
 * RND, INT, ABS, LEN, CHR$ e qualche altra; i messaggi d'errore dell'epoca («?SYNTAX ERROR IN 20»),
 * spiegati in italiano sotto lo schermo.
 *
 * La logica (tokenizzatore, espressioni, istruzioni, schermo) non tocca il DOM e si prova in Node:
 *   const Basic = require('./basic.js');
 *   Basic.esegui('10 PRINT "CIAO"').righe        // ['CIAO', 'READY.']
 * L'esecuzione procede a fette (macchina.passi(n)): un ciclo infinito non blocca mai la pagina.
 * Lo schermo è un canvas con un carattere bitmap 8×8 disegnato per questo laboratorio.
 */
(function (root) {
  'use strict';

  /* ======================= costanti ======================= */

  const COLONNE = 40;
  const RIGHE = 25;
  const ZONA = 10;                // la virgola in PRINT porta alla zona successiva, ogni 10 colonne
  const RIGA_MAX = 63999;         // numero di riga più alto
  const LUNGHEZZA_RIGA = 80;      // una riga logica occupa al massimo due righe di schermo
  const STRINGA_MAX = 255;
  const PILA_MAX = 48;            // FOR e GOSUB aperti uno dentro l'altro
  const VARIABILI_MAX = 300;
  const MEMORIA = 15359;          // byte liberi all'accensione: 16 KB meno lo spazio del BASIC
  const NUMERO_MAX = 1.70141183e38;

  // codice -> [messaggio sullo schermo, spiegazione in italiano]
  const ERRORI = {
    SYNTAX: ['SYNTAX', 'Errore di sintassi: il BASIC non capisce come è scritta l\'istruzione. Controlla parole chiave, virgolette e parentesi.'],
    UNDEF: ['UNDEF\'D STATEMENT', 'Il programma salta a una riga che non esiste: controlla il numero dopo GOTO, GOSUB o THEN.'],
    NEXT: ['NEXT WITHOUT FOR', 'C\'è un NEXT che non corrisponde a nessun FOR ancora aperto.'],
    RETURN: ['RETURN WITHOUT GOSUB', 'Il programma è arrivato a un RETURN senza essere entrato in una subroutine con GOSUB.'],
    TYPE: ['TYPE MISMATCH', 'Tipi incompatibili: stai mescolando numeri e testo. Le variabili di testo finiscono con $, come A$.'],
    DIV0: ['DIVISION BY ZERO', 'Divisione per zero: nessun numero diviso per zero dà un risultato.'],
    QUANTITA: ['ILLEGAL QUANTITY', 'Valore fuori dai limiti: per esempio CHR$ accetta solo numeri da 0 a 255.'],
    OVERFLOW: ['OVERFLOW', 'Numero troppo grande: questo BASIC arriva a circa 1,7 × 10^38.'],
    MEMORIA: ['OUT OF MEMORY', 'Memoria esaurita: il programma è troppo lungo, oppure ci sono troppi GOSUB o FOR uno dentro l\'altro.'],
    STRINGA: ['STRING TOO LONG', 'Testo troppo lungo: una stringa può avere al massimo 255 caratteri.'],
    DIRETTO: ['ILLEGAL DIRECT', 'INPUT funziona solo dentro un programma: mettilo in una riga numerata e poi scrivi RUN.'],
  };

  const ESEMPI = {
    ciao: {
      nome: 'Ciao',
      sorgente: '10 PRINT "CIAO, MONDO"\n20 GOTO 10',
      nota: 'La riga 20 rimanda alla 10, quindi il saluto si ripete senza fine: interrompilo con **STOP**.',
    },
    labirinto: {
      nome: 'Labirinto',
      sorgente: '10 PRINT CHR$(205.5+RND(1)); : GOTO 10',
      nota: '`RND(1)` dà un numero a caso tra 0 e 1, quindi `CHR$` riceve 205 o 206 (i decimali si perdono): una diagonale ╲ oppure una ╱. Il punto e virgola non va a capo e il labirinto cresce da solo.',
    },
    tabellina: {
      nome: 'Tabellina',
      sorgente: '10 REM TABELLINA DEL 7\n20 N=7\n30 FOR I=1 TO 10\n40 PRINT N;"X";I;"=";N*I\n50 NEXT I',
      nota: '`FOR…NEXT` ripete la riga 40 dieci volte, con I che va da 1 a 10. I numeri si stampano con uno spazio davanti, il posto del segno meno.',
    },
    indovina: {
      nome: 'Indovina il numero',
      sorgente: [
        '10 REM INDOVINA IL NUMERO',
        '20 N=INT(RND(1)*100)+1',
        '30 T=0',
        '40 PRINT "PENSO A UN NUMERO DA 1 A 100"',
        '50 INPUT "PROVA";X',
        '60 T=T+1',
        '70 IF X<N THEN PRINT "TROPPO BASSO"',
        '80 IF X>N THEN PRINT "TROPPO ALTO"',
        '90 IF X<>N THEN 50',
        '100 PRINT "BRAVO! IN";T;"TENTATIVI"',
      ].join('\n'),
      nota: '`INPUT` ferma il programma e aspetta la tua risposta; `IF…THEN` decide che cosa rispondere. Il numero segreto lo sceglie `RND`.',
    },
  };

  const PAROLE = new Set(['PRINT', 'LET', 'INPUT', 'GOTO', 'GO', 'GOSUB', 'RETURN', 'IF', 'THEN', 'FOR', 'TO', 'STEP', 'NEXT', 'END', 'STOP', 'REM', 'CLS', 'RUN', 'LIST', 'NEW', 'AND', 'OR', 'NOT']);
  const FUNZIONI = new Set(['RND', 'INT', 'ABS', 'SGN', 'SQR', 'SIN', 'COS', 'TAN', 'ATN', 'LOG', 'EXP', 'LEN', 'ASC', 'VAL', 'CHR$', 'STR$', 'LEFT$', 'RIGHT$', 'MID$', 'SPC', 'TAB']);
  // parole dei BASIC dell'epoca che questo BASIC didattico non conosce: danno un errore spiegato
  const ASSENTI = new Set(['DIM', 'DATA', 'READ', 'RESTORE', 'ON', 'DEF', 'FN', 'POKE', 'PEEK', 'SYS', 'WAIT', 'LOAD', 'SAVE', 'VERIFY', 'CONT', 'GET', 'OPEN', 'CLOSE', 'CMD', 'CLR', 'USR', 'FRE', 'POS']);
  const ISTRUZIONI_NOTE = ['PRINT', 'INPUT', 'GOTO', 'GOSUB', 'RETURN', 'IF', 'FOR', 'NEXT', 'END', 'STOP', 'REM', 'LET', 'CLS', 'RUN', 'LIST', 'NEW'];

  /* ======================= caratteri ======================= */

  // Codici grafici: 205 e 206 sono le due diagonali del labirinto di «10 PRINT».
  const GRAFICA = { 166: '▒', 205: '╲', 206: '╱', 209: '●', 211: '♥', 215: '○' };
  const CODICE_GRAFICA = {};
  Object.keys(GRAFICA).forEach((k) => { CODICE_GRAFICA[GRAFICA[k]] = Number(k); });

  function chr(n) {
    if (n === 13) return '\n';                       // a capo
    if (n === 147) return '\f';                      // cancella lo schermo, come sui Commodore
    if (n >= 32 && n <= 95) return String.fromCharCode(n);
    if (n >= 97 && n <= 122) return String.fromCharCode(n - 32);
    if (GRAFICA[n]) return GRAFICA[n];
    if (n < 32 || (n >= 128 && n < 160)) return '';  // codici di controllo: non si vedono
    return '▚';                                       // altri caratteri grafici: un segno generico
  }

  function asc(c) {
    if (c === '\n') return 13;
    if (c === '\f') return 147;
    if (CODICE_GRAFICA[c]) return CODICE_GRAFICA[c];
    return c.charCodeAt(0);
  }

  /* ======================= numeri ======================= */

  // Come i BASIC Microsoft: 9 cifre significative, niente zero prima della virgola (.5),
  // notazione esponenziale sotto 0,01 e da un miliardo in su (1E+09).
  function formatta(n) {
    if (n === 0) return '0';
    const segno = n < 0 ? '-' : '';
    const a = Math.abs(n);
    let s = a.toPrecision(9);
    if (a < 0.01 || s.indexOf('e') >= 0 || Number(s) >= 1e9) {
      const parti = a.toExponential(8).split('e');
      const mantissa = parti[0].replace(/\.?0+$/, '');
      const esponente = Number(parti[1]);
      return segno + mantissa + 'E' + (esponente < 0 ? '-' : '+') + String(Math.abs(esponente)).padStart(2, '0');
    }
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s.charAt(0) === '0') s = s.slice(1);
    return segno + s;
  }

  // PRINT mette uno spazio al posto del segno e uno dopo il numero; STR$ solo quello del segno.
  function stampaNumero(n) { return (n < 0 ? '' : ' ') + formatta(n) + ' '; }
  function strNumero(n) { return (n < 0 ? '' : ' ') + formatta(n); }

  function val(s) {
    const m = /^\s*([+-]?(\d+\.?\d*|\.\d+)(E[+-]?\d+)?)/i.exec(s);
    if (!m) return 0;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : 0;
  }

  function numeroInput(s) {
    const t = String(s).trim();
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(E[+-]?\d+)?$/i.test(t)) return null;
    const n = Number(t);
    return Number.isFinite(n) && Math.abs(n) <= NUMERO_MAX ? n : null;
  }

  function errore(codice, dettaglio) {
    const e = new Error(codice);
    e.basic = codice;
    if (dettaglio) e.dettaglio = dettaglio;
    return e;
  }

  function distanza(a, b) {
    const d = [];
    for (let i = 0; i <= a.length; i++) d.push([i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[a.length][b.length];
  }

  // Suggerimento per una riga che comincia con un nome sconosciuto (PRNT, PRINTA…).
  function suggerisci(nome) {
    const parola = String(nome).replace(/\$$/, '');
    for (const p of ISTRUZIONI_NOTE) {
      if (parola.length > p.length && parola.indexOf(p) === 0) return 'Manca uno spazio dopo ' + p + '? Prova a scrivere «' + p + ' ' + nome.slice(p.length) + '».';
    }
    for (const p of ISTRUZIONI_NOTE) {
      const d = distanza(parola, p);
      if (d === 1 || (d === 2 && p.length >= 5)) return 'Forse volevi scrivere ' + p + '?';
    }
    return 'Un\'istruzione comincia con una parola chiave (PRINT, GOTO, IF…) oppure è un\'assegnazione, come A = 5.';
  }

  function normalizza(riga) {
    return String(riga == null ? '' : riga).replace(/[\t\r\n]+/g, ' ').toUpperCase().replace(/\s+$/, '').slice(0, LUNGHEZZA_RIGA);
  }

  /* ======================= tokenizzatore ======================= */

  const lettera = (c) => (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');
  const cifra = (c) => c >= '0' && c <= '9';

  // Una parola chiave è riconosciuta solo se è intera: TOTALE resta una variabile, GOTO10 diventa GOTO 10.
  function tokenizza(testo) {
    const s = String(testo == null ? '' : testo);
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === ' ' || c === '\t') { i += 1; continue; }
      if (c === '"') {
        const j = s.indexOf('"', i + 1);
        const fine = j < 0 ? s.length : j;   // una stringa non chiusa finisce con la riga, come allora
        out.push({ t: 'str', v: s.slice(i + 1, fine) });
        i = fine + 1;
        continue;
      }
      if (cifra(c) || (c === '.' && cifra(s[i + 1]))) {
        const m = /^(\d*\.?\d*)(E[+-]?\d+)?/i.exec(s.slice(i));
        out.push({ t: 'num', v: Number(m[0]), testo: m[0] });
        i += m[0].length;
        continue;
      }
      if (lettera(c)) {
        let j = i;
        while (j < s.length && lettera(s[j])) j += 1;
        const parola = s.slice(i, j).toUpperCase();
        if (s[j] === '$' && FUNZIONI.has(parola + '$')) { out.push({ t: 'fn', v: parola + '$' }); i = j + 1; continue; }
        if (PAROLE.has(parola)) {
          if (parola === 'REM') { out.push({ t: 'kw', v: 'REM', resto: s.slice(j) }); return out; }
          out.push({ t: 'kw', v: parola });
          i = j;
          continue;
        }
        if (FUNZIONI.has(parola)) { out.push({ t: 'fn', v: parola }); i = j; continue; }
        if (ASSENTI.has(parola)) { out.push({ t: 'kw', v: parola, assente: true }); i = j; continue; }
        while (j < s.length && (lettera(s[j]) || cifra(s[j]))) j += 1;
        if (s[j] === '$') j += 1;
        out.push({ t: 'id', v: s.slice(i, j).toUpperCase() });
        i = j;
        continue;
      }
      const due = s.substr(i, 2);
      if (due === '<=' || due === '>=' || due === '<>') { out.push({ t: 'op', v: due }); i += 2; continue; }
      if ('+-*/^=<>'.indexOf(c) >= 0) { out.push({ t: 'op', v: c }); i += 1; continue; }
      if ('(),;:'.indexOf(c) >= 0) { out.push({ t: c }); i += 1; continue; }
      if (c === '?') { out.push({ t: 'kw', v: 'PRINT' }); i += 1; continue; }   // ? è l'abbreviazione di PRINT
      throw errore('SYNTAX', 'Il carattere «' + c + '» non fa parte di questo BASIC' +
        (c === '\'' ? ': i testi vanno tra virgolette doppie, come "CIAO".' : '.'));
    }
    return out;
  }

  /* ======================= schermo ======================= */

  function rigaTesto(r) { return r.join('').replace(/\s+$/, ''); }

  // Griglia di caratteri con cursore, a capo automatico e scorrimento verso l'alto.
  // Dopo il quarantesimo carattere il cursore resta «in sospeso»: va a capo solo se arriva un altro carattere.
  function creaSchermo(colonne, righe, opzioni) {
    colonne = colonne || COLONNE;
    righe = righe || RIGHE;
    const registra = !!(opzioni && opzioni.registra);
    const nuova = () => new Array(colonne).fill(' ');
    const s = {
      colonne: colonne,
      righe: righe,
      celle: Array.from({ length: righe }, nuova),
      cx: 0,
      cy: 0,
      scorrimenti: 0,
      versione: 0,                 // cambia a ogni modifica: il disegno si rifà solo se serve
      storia: registra ? [] : null, // righe già lasciate (per i test)
      scrivi(testo) {
        for (const ch of String(testo)) {
          if (ch === '\n' || ch === '\r') s.acapo();
          else if (ch === '\f') s.pulisci();
          else {
            if (s.cx >= colonne) s.acapo();
            s.celle[s.cy][s.cx] = ch;
            s.cx += 1;
          }
        }
        s.versione += 1;
      },
      acapo() {
        if (registra) s.storia.push(rigaTesto(s.celle[s.cy]));
        s.cx = 0;
        if (s.cy < righe - 1) s.cy += 1;
        else { s.celle.push(s.celle.shift().fill(' ')); s.scorrimenti += 1; }
        s.versione += 1;
      },
      pulisci() {
        if (registra && rigaTesto(s.celle[s.cy])) s.storia.push(rigaTesto(s.celle[s.cy]));
        for (const r of s.celle) r.fill(' ');
        s.cx = 0;
        s.cy = 0;
        s.versione += 1;
      },
      vai(riga, colonna) {
        s.cy = Math.max(0, Math.min(righe - 1, riga));
        s.cx = Math.max(0, Math.min(colonne, colonna));
      },
      colonna() { return s.cx; },
      testo() { return s.celle.map(rigaTesto).join('\n'); },
      trascrizione() {
        const t = s.storia ? s.storia.slice() : [];
        const ultima = rigaTesto(s.celle[s.cy]);
        if (ultima) t.push(ultima);
        return t;
      },
    };
    return s;
  }

  /* ======================= macchina ======================= */

  function dividiInput(testo) {
    const parti = [];
    let corrente = '';
    let virgolette = false;
    for (const ch of String(testo)) {
      if (ch === '"') { virgolette = !virgolette; continue; }
      if (ch === ',' && !virgolette) { parti.push(corrente.trim()); corrente = ''; continue; }
      corrente += ch;
    }
    parti.push(corrente.trim());
    return parti;
  }

  function creaMacchina(opzioni) {
    opzioni = opzioni || {};
    const schermo = opzioni.schermo || creaSchermo();
    let casuale = typeof opzioni.casuale === 'function' ? opzioni.casuale : Math.random;
    const programma = new Map();     // numero di riga -> testo
    const variabili = new Map();
    let linee = [];                  // programma ordinato, con i token in cache
    let lineeValide = true;
    let diretta = null;              // riga senza numero in esecuzione
    const pos = { i: -1, p: 0 };     // riga (-1 = riga diretta) e token corrente
    let toks = [];
    let inizio = 0;                  // primo token dell'istruzione in corso
    let pila = [];                   // FOR e GOSUB aperti
    let attesa = null;               // INPUT che aspetta una risposta
    let saltato = false;
    let inProgramma = false;
    let istruzioniRun = 0;
    let ultimoRnd = 0;

    const m = {
      schermo: schermo,
      stato: 'pronto',               // 'pronto' | 'esegue' | 'attesa'
      eventi: [],
      contatore: 0,                  // istruzioni eseguite in tutto
      costo: 0,                      // tempo di macchina simulato (lo scorrimento dello schermo costa)
      get variabili() { return variabili; },
      get righe() { return programma.size; },
      byte() { let n = 0; programma.forEach((t) => { n += t.length + 5; }); return n; },
      liberi() { return MEMORIA - m.byte(); },
      elenco() { return ordinate().map((x) => x[0] + ' ' + x[1]); },
      testoProgramma() { return m.elenco().join('\n'); },
      rigaCorrente() { return pos.i >= 0 && linee[pos.i] ? linee[pos.i].numero : null; },
      attesa() { return attesa ? { prompt: attesa.prompt, voci: attesa.voci.slice(), raccolti: attesa.valori.length } : null; },
      immetti: immetti,
      passi: passi,
      rispondi: rispondi,
      ferma: ferma,
    };

    function ordinate() { return Array.from(programma.entries()).sort((a, b) => a[0] - b[0]); }

    function costruisci() {
      if (lineeValide) return;
      linee = ordinate().map((x) => ({ numero: x[0], testo: x[1], token: null }));
      lineeValide = true;
    }

    function cerca(n) {
      let lo = 0;
      let hi = linee.length - 1;
      while (lo <= hi) {
        const mezzo = (lo + hi) >> 1;
        const v = linee[mezzo].numero;
        if (v === n) return mezzo;
        if (v < n) lo = mezzo + 1; else hi = mezzo - 1;
      }
      return -1;
    }

    /* --- token --- */

    function guarda() { return toks[pos.p]; }
    function prendi() { const k = toks[pos.p]; pos.p += 1; return k; }
    function e(t, v) { const k = toks[pos.p]; return !!k && k.t === t && (v === undefined || k.v === v); }
    function atteso(t, v, dettaglio) {
      if (!e(t, v)) throw errore('SYNTAX', dettaglio);
      return prendi();
    }
    function fineIstruzione() { const k = toks[pos.p]; return !k || k.t === ':'; }

    /* --- valori --- */

    function num(x) { if (typeof x !== 'number') throw errore('TYPE'); return x; }
    function testo(x) { if (typeof x !== 'string') throw errore('TYPE'); return x; }
    function controlla(x) {
      if (!Number.isFinite(x) || Math.abs(x) > NUMERO_MAX) throw errore('OVERFLOW');
      return x;
    }
    function intero(x, min, max) {
      const n = Math.floor(num(x));
      if (n < min || n > max) throw errore('QUANTITA');
      return n;
    }
    function bit(x) {
      const n = Math.trunc(num(x));
      if (n < -32768 || n > 32767) throw errore('QUANTITA', 'AND, OR e NOT lavorano su numeri interi tra -32768 e 32767.');
      return n;
    }
    function leggi(nome) {
      if (variabili.has(nome)) return variabili.get(nome);
      return nome.charAt(nome.length - 1) === '$' ? '' : 0;
    }
    function assegna(nome, valore) {
      const diTesto = nome.charAt(nome.length - 1) === '$';
      if (diTesto !== (typeof valore === 'string')) {
        throw errore('TYPE', diTesto ? nome + ' finisce con $: contiene testo, non numeri.' : nome + ' è una variabile numerica: per il testo usa un nome con $, come ' + nome + '$.');
      }
      if (!variabili.has(nome) && variabili.size >= VARIABILI_MAX) throw errore('MEMORIA');
      variabili.set(nome, valore);
    }

    /* --- espressioni, dalla precedenza più bassa alla più alta: OR, AND, NOT, confronti, + -, * /, segno, ^ --- */

    function espressione() { return oppure(); }
    function oppure() {
      let a = eAnche();
      while (e('kw', 'OR')) { prendi(); const b = eAnche(); a = bit(a) | bit(b); }
      return a;
    }
    function eAnche() {
      let a = non();
      while (e('kw', 'AND')) { prendi(); const b = non(); a = bit(a) & bit(b); }
      return a;
    }
    function non() {
      if (e('kw', 'NOT')) { prendi(); return ~bit(non()); }
      return confronto();
    }
    const CONFRONTI = ['=', '<', '>', '<=', '>=', '<>'];
    function confronto() {
      let a = somma();
      while (guarda() && guarda().t === 'op' && CONFRONTI.indexOf(guarda().v) >= 0) {
        const op = prendi().v;
        const b = somma();
        if (typeof a !== typeof b) throw errore('TYPE', 'Si possono confrontare numeri con numeri e testi con testi, non un numero con un testo.');
        let vero;
        if (op === '=') vero = a === b;
        else if (op === '<>') vero = a !== b;
        else if (op === '<') vero = a < b;
        else if (op === '>') vero = a > b;
        else if (op === '<=') vero = a <= b;
        else vero = a >= b;
        a = vero ? -1 : 0;   // vero vale -1, falso vale 0, come nei BASIC Microsoft
      }
      return a;
    }
    function somma() {
      let a = prodotto();
      for (;;) {
        if (e('op', '+')) {
          prendi();
          const b = prodotto();
          if (typeof a === 'string' && typeof b === 'string') {
            a += b;
            if (a.length > STRINGA_MAX) throw errore('STRINGA');
          } else if (typeof a === 'number' && typeof b === 'number') a = controlla(a + b);
          else throw errore('TYPE', 'Il + unisce due testi oppure somma due numeri, ma non un testo e un numero.');
        } else if (e('op', '-')) {
          prendi();
          const b = prodotto();
          a = controlla(num(a) - num(b));
        } else return a;
      }
    }
    function prodotto() {
      let a = segno();
      for (;;) {
        if (e('op', '*')) { prendi(); const b = segno(); a = controlla(num(a) * num(b)); }
        else if (e('op', '/')) {
          prendi();
          const b = num(segno());
          if (b === 0) throw errore('DIV0');
          a = controlla(num(a) / b);
        } else return a;
      }
    }
    function segno() {
      if (e('op', '-')) { prendi(); return -num(segno()); }
      if (e('op', '+')) { prendi(); return num(segno()); }
      return potenza();
    }
    // ^ lega più del segno (-2^2 = -4) e si calcola da sinistra (2^3^2 = 64), come allora.
    function potenza() {
      let a = atomo();
      while (e('op', '^')) {
        prendi();
        const b = num(esponente());
        const x = num(a);
        if (x === 0 && b < 0) throw errore('DIV0');
        const r = Math.pow(x, b);
        if (Number.isNaN(r)) throw errore('QUANTITA', 'Un numero negativo non si può elevare a una potenza con la virgola.');
        a = controlla(r);
      }
      return a;
    }
    function esponente() {
      if (e('op', '-')) { prendi(); return -num(esponente()); }
      if (e('op', '+')) { prendi(); return num(esponente()); }
      return atomo();
    }
    function atomo() {
      const k = guarda();
      if (!k) throw errore('SYNTAX', 'L\'espressione è incompleta: manca un valore alla fine.');
      if (k.t === 'num') { prendi(); return k.v; }
      if (k.t === 'str') { prendi(); return k.v; }
      if (k.t === 'id') { prendi(); return leggi(k.v); }
      if (k.t === '(') {
        prendi();
        const v = espressione();
        atteso(')', undefined, 'Manca una parentesi chiusa «)».');
        return v;
      }
      if (k.t === 'fn') { prendi(); return funzione(k.v); }
      throw errore('SYNTAX', 'Qui ci vuole un valore: un numero, un testo tra virgolette o una variabile.');
    }

    function argomenti(nome, minimo, massimo) {
      atteso('(', undefined, nome + ' vuole i suoi valori tra parentesi, per esempio ' + nome + '(1).');
      const a = [espressione()];
      while (e(',')) { prendi(); a.push(espressione()); }
      atteso(')', undefined, 'Manca una parentesi chiusa «)».');
      if (a.length < minimo || a.length > massimo) throw errore('SYNTAX', nome + ' vuole ' + (minimo === massimo ? minimo : minimo + ' o ' + massimo) + ' valori tra parentesi.');
      return a;
    }

    function semina(x) {
      let seme = Math.floor(Math.abs(x) * 9301 + 49297) >>> 0;
      casuale = function () {
        seme = (seme + 0x6D2B79F5) >>> 0;
        let t = seme;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function funzione(nome) {
      if (nome === 'SPC' || nome === 'TAB') throw errore('SYNTAX', nome + '( si usa solo dentro PRINT.');
      const quanti = { 'MID$': [2, 3], 'LEFT$': [2, 2], 'RIGHT$': [2, 2] }[nome] || [1, 1];
      const a = argomenti(nome, quanti[0], quanti[1]);
      switch (nome) {
        case 'RND': {
          const x = num(a[0]);
          if (x < 0) { semina(x); ultimoRnd = casuale(); } else if (x > 0) ultimoRnd = casuale();
          return ultimoRnd;
        }
        case 'INT': return Math.floor(num(a[0]));
        case 'ABS': return Math.abs(num(a[0]));
        case 'SGN': return Math.sign(num(a[0]));
        case 'SQR': {
          const x = num(a[0]);
          if (x < 0) throw errore('QUANTITA', 'Non esiste la radice quadrata di un numero negativo.');
          return Math.sqrt(x);
        }
        case 'SIN': return Math.sin(num(a[0]));
        case 'COS': return Math.cos(num(a[0]));
        case 'TAN': return controlla(Math.tan(num(a[0])));
        case 'ATN': return Math.atan(num(a[0]));
        case 'LOG': {
          const x = num(a[0]);
          if (x <= 0) throw errore('QUANTITA', 'Il logaritmo esiste solo per i numeri maggiori di zero.');
          return Math.log(x);
        }
        case 'EXP': return controlla(Math.exp(num(a[0])));
        case 'LEN': return testo(a[0]).length;
        case 'ASC': {
          const s = testo(a[0]);
          if (!s) throw errore('QUANTITA', 'ASC di un testo vuoto non esiste.');
          return asc(s.charAt(0));
        }
        case 'VAL': return val(testo(a[0]));
        case 'CHR$': return chr(intero(a[0], 0, 255));
        case 'STR$': return strNumero(num(a[0]));
        case 'LEFT$': return testo(a[0]).slice(0, intero(a[1], 0, 255));
        case 'RIGHT$': {
          const s = testo(a[0]);
          const n = intero(a[1], 0, 255);
          return n === 0 ? '' : s.slice(-n);
        }
        case 'MID$': {
          const s = testo(a[0]);
          const da = intero(a[1], 1, 255);
          const n = a.length > 2 ? intero(a[2], 0, 255) : 255;
          return s.substr(da - 1, n);
        }
        default: throw errore('SYNTAX');
      }
    }

    /* --- istruzioni --- */

    function numeroRiga(dettaglio) {
      const k = atteso('num', undefined, dettaglio || 'Qui ci vuole un numero di riga.');
      if (!Number.isInteger(k.v) || k.v > RIGA_MAX || /[.E]/i.test(k.testo)) throw errore('SYNTAX', 'I numeri di riga sono interi da 0 a 63999.');
      return k.v;
    }

    function salta(n) {
      costruisci();
      const i = cerca(n);
      if (i < 0) throw errore('UNDEF', 'La riga ' + n + ' non c\'è nel programma.');
      pos.i = i;
      pos.p = 0;
      saltato = true;
      inProgramma = true;
    }

    function spingi(voce) {
      if (pila.length >= PILA_MAX) throw errore('MEMORIA', 'Troppi GOSUB o FOR uno dentro l\'altro: forse una subroutine richiama se stessa senza mai fare RETURN.');
      pila.push(voce);
    }

    function aCapo() { if (schermo.colonna() > 0) schermo.scrivi('\n'); }

    function zona() {
      const c = schermo.colonna();
      const prossima = (Math.floor(c / ZONA) + 1) * ZONA;
      if (prossima >= schermo.colonne) schermo.scrivi('\n');
      else schermo.scrivi(' '.repeat(prossima - c));
    }

    function istrPrint() {
      let acapo = true;
      while (!fineIstruzione()) {
        const k = guarda();
        if (k.t === ';') { prendi(); acapo = false; continue; }
        if (k.t === ',') { prendi(); zona(); acapo = false; continue; }
        if (k.t === 'fn' && (k.v === 'SPC' || k.v === 'TAB')) {
          prendi();
          atteso('(', undefined, k.v + ' vuole il numero tra parentesi, per esempio ' + k.v + '(5).');
          const n = intero(espressione(), 0, 255);
          atteso(')', undefined, 'Manca una parentesi chiusa «)».');
          if (k.v === 'SPC') schermo.scrivi(' '.repeat(n));
          else if (n > schermo.colonna()) schermo.scrivi(' '.repeat(n - schermo.colonna()));
          acapo = true;
          continue;
        }
        const v = espressione();
        schermo.scrivi(typeof v === 'number' ? stampaNumero(v) : v);
        acapo = true;
      }
      if (acapo) schermo.scrivi('\n');
    }

    function assegnazione(nome) {
      if (!e('op', '=')) throw errore('SYNTAX', suggerisci(nome));
      prendi();
      assegna(nome, espressione());
    }

    function istrLet() {
      const k = atteso('id', undefined, 'Dopo LET ci vuole il nome di una variabile, per esempio LET A = 5.');
      assegnazione(k.v);
    }

    function istrInput() {
      if (pos.i < 0) throw errore('DIRETTO');
      let prompt = '';
      if (e('str')) {
        prompt = prendi().v;
        atteso(';', undefined, 'Dopo il messaggio di INPUT ci vuole il punto e virgola, per esempio INPUT "NOME";N$.');
      }
      const voci = [atteso('id', undefined, 'INPUT vuole il nome della variabile in cui mettere la risposta, per esempio INPUT A.').v];
      while (e(',')) { prendi(); voci.push(atteso('id', undefined, 'Dopo la virgola ci vuole un\'altra variabile.').v); }
      if (!fineIstruzione()) throw errore('SYNTAX');
      attesa = { prompt: prompt, voci: voci, valori: [] };
      schermo.scrivi(prompt + '? ');
      m.stato = 'attesa';
      m.eventi.push({ tipo: 'input', prompt: prompt, voci: voci.slice(), riga: m.rigaCorrente() });
    }

    function istrIf() {
      const condizione = espressione();
      if (typeof condizione !== 'number') throw errore('TYPE', 'La condizione di IF deve essere un confronto o un numero.');
      if (e('kw', 'THEN') || e('kw', 'GOTO')) {
        const parola = prendi().v;
        if (condizione === 0) { pos.p = toks.length; saltato = true; return; }   // falso: salta il resto della riga
        if (e('num') || parola === 'GOTO') { salta(numeroRiga('Dopo GOTO ci vuole un numero di riga.')); return; }
        saltato = true;   // vero: esegue le istruzioni dopo THEN
        return;
      }
      throw errore('SYNTAX', 'Dopo la condizione di IF ci vuole THEN, per esempio IF A > 5 THEN 100.');
    }

    function istrFor() {
      const nome = atteso('id', undefined, 'Dopo FOR ci vuole il nome di una variabile, per esempio FOR I = 1 TO 10.').v;
      if (nome.charAt(nome.length - 1) === '$') throw errore('TYPE', 'La variabile di un FOR deve essere numerica.');
      atteso('op', '=', 'In un FOR ci vuole il segno =, per esempio FOR I = 1 TO 10.');
      const da = num(espressione());
      atteso('kw', 'TO', 'Manca TO: per esempio FOR I = 1 TO 10.');
      const limite = num(espressione());
      let passo = 1;
      if (e('kw', 'STEP')) { prendi(); passo = num(espressione()); }
      if (!fineIstruzione()) throw errore('SYNTAX');
      assegna(nome, da);
      // un FOR con la stessa variabile chiude quello vecchio (e i cicli dentro), come nei BASIC Microsoft
      for (let k = pila.length - 1; k >= 0; k--) {
        if (pila[k].tipo === 'gosub') break;
        if (pila[k].nome === nome) { pila.length = k; break; }
      }
      spingi({ tipo: 'for', nome: nome, limite: limite, passo: passo, ritorno: { i: pos.i, p: pos.p } });
    }

    function istrNext() {
      for (;;) {
        let nome = null;
        if (e('id')) nome = prendi().v;
        let k = pila.length - 1;
        while (k >= 0 && pila[k].tipo === 'for' && nome !== null && pila[k].nome !== nome) k -= 1;
        if (k < 0 || pila[k].tipo !== 'for') throw errore('NEXT', nome ? 'Non c\'è un FOR aperto con la variabile ' + nome + '.' : '');
        pila.length = k + 1;
        const voce = pila[k];
        const v = controlla(num(leggi(voce.nome)) + voce.passo);
        assegna(voce.nome, v);
        if (voce.passo >= 0 ? v <= voce.limite : v >= voce.limite) {
          pos.i = voce.ritorno.i;
          pos.p = voce.ritorno.p;
          saltato = true;
          return;
        }
        pila.length = k;   // ciclo finito
        if (!e(',')) return;
        prendi();
        if (!e('id')) throw errore('SYNTAX', 'Dopo la virgola di NEXT ci vuole un\'altra variabile.');
      }
    }

    function istrGosub() {
      const n = numeroRiga('Dopo GOSUB ci vuole il numero della riga dove comincia la subroutine.');
      if (!fineIstruzione()) throw errore('SYNTAX');
      spingi({ tipo: 'gosub', ritorno: { i: pos.i, p: pos.p } });
      salta(n);
    }

    function istrReturn() {
      if (!fineIstruzione()) throw errore('SYNTAX');
      let k = pila.length - 1;
      while (k >= 0 && pila[k].tipo !== 'gosub') k -= 1;
      if (k < 0) throw errore('RETURN');
      const voce = pila[k];
      pila.length = k;
      pos.i = voce.ritorno.i;
      pos.p = voce.ritorno.p;
      saltato = true;
    }

    function istrGo() {
      atteso('kw', 'TO', 'Forse volevi scrivere GOTO?');
      salta(numeroRiga('Dopo GO TO ci vuole un numero di riga.'));
    }

    function istrRun() {
      let da = null;
      if (e('num')) da = numeroRiga();
      if (!fineIstruzione()) throw errore('SYNTAX');
      costruisci();
      variabili.clear();
      pila = [];
      if (!linee.length) { fine('vuoto'); return; }
      istruzioniRun = 0;
      m.eventi.push({ tipo: 'run', righe: linee.length, da: da === null ? linee[0].numero : da });
      if (da === null) {
        pos.i = 0;
        pos.p = 0;
        saltato = true;
        inProgramma = true;
      } else salta(da);
    }

    function istrList() {
      let da = 0;
      let a = RIGA_MAX;
      if (e('num')) {
        da = numeroRiga();
        a = da;
        if (e('op', '-')) { prendi(); a = e('num') ? numeroRiga() : RIGA_MAX; }
      } else if (e('op', '-')) { prendi(); a = numeroRiga(); }
      if (!fineIstruzione()) throw errore('SYNTAX', 'LIST si usa così: LIST, LIST 10, LIST 10-50.');
      for (const x of ordinate()) if (x[0] >= da && x[0] <= a) schermo.scrivi(x[0] + ' ' + x[1] + '\n');
    }

    function istrNew() {
      if (!fineIstruzione()) throw errore('SYNTAX');
      programma.clear();
      lineeValide = false;
      costruisci();
      variabili.clear();
      fine('nuovo');
    }

    function istrEnd() { if (!fineIstruzione()) throw errore('SYNTAX'); fine('fine'); }
    function istrStop() { if (!fineIstruzione()) throw errore('SYNTAX'); fine('break'); }

    const ISTRUZIONI = {
      PRINT: istrPrint,
      LET: istrLet,
      INPUT: istrInput,
      GOTO: () => { salta(numeroRiga('Dopo GOTO ci vuole un numero di riga, per esempio GOTO 10.')); },
      GO: istrGo,
      GOSUB: istrGosub,
      RETURN: istrReturn,
      IF: istrIf,
      FOR: istrFor,
      NEXT: istrNext,
      END: istrEnd,
      STOP: istrStop,
      REM: () => { pos.p = toks.length; },
      CLS: () => { if (!fineIstruzione()) throw errore('SYNTAX'); schermo.pulisci(); },
      RUN: istrRun,
      LIST: istrList,
      NEW: istrNew,
    };

    /* --- esecuzione --- */

    function chiudi() {
      m.stato = 'pronto';
      pila = [];
      attesa = null;
      inProgramma = false;
      diretta = null;
      pos.i = -1;
      pos.p = 0;
      aCapo();
      schermo.scrivi('READY.\n');
    }

    function fine(tipo) {
      const riga = m.rigaCorrente();
      const eraProgramma = inProgramma;
      if (tipo === 'break') {
        aCapo();
        schermo.scrivi('BREAK' + (riga !== null && eraProgramma ? ' IN ' + riga : '') + '\n');
      }
      chiudi();
      m.eventi.push({ tipo: tipo, riga: riga, istruzioni: istruzioniRun, programma: eraProgramma });
    }

    function segnala(err) {
      const codice = err && err.basic && ERRORI[err.basic] ? err.basic : 'SYNTAX';
      const linea = pos.i >= 0 ? linee[pos.i] : null;
      const riga = linea ? linea.numero : null;
      let dettaglio = (err && err.dettaglio) || '';
      if (!dettaglio && codice === 'SYNTAX') {
        const k = toks[inizio];
        if (k && k.t === 'id') dettaglio = suggerisci(k.v);
        else if (k && k.t === 'kw' && !ISTRUZIONI[k.v]) dettaglio = k.v + ' non può cominciare un\'istruzione.';
      }
      const testoRiga = linea ? linea.testo : (diretta ? diretta.testo : '');
      const eraProgramma = inProgramma;
      aCapo();
      schermo.scrivi('?' + ERRORI[codice][0] + ' ERROR' + (riga !== null ? ' IN ' + riga : '') + '\n');
      chiudi();
      m.eventi.push({ tipo: 'errore', codice: codice, riga: riga, testo: testoRiga, dettaglio: dettaglio, programma: eraProgramma, istruzioni: istruzioniRun });
    }

    function avanza() {
      if (pos.i < 0) { fine('diretta'); return; }
      pos.i += 1;
      pos.p = 0;
      if (pos.i >= linee.length) { pos.i = linee.length - 1; fine('fine'); }
    }

    // Esegue un'istruzione (o passa alla riga successiva).
    function passo() {
      const linea = pos.i < 0 ? diretta : linee[pos.i];
      toks = [];
      inizio = 0;
      if (!linea.token) linea.token = tokenizza(linea.testo);
      toks = linea.token;
      if (pos.p >= toks.length) { avanza(); return; }
      if (toks[pos.p].t === ':') { pos.p += 1; return; }
      inizio = pos.p;
      saltato = false;
      m.contatore += 1;
      istruzioniRun += 1;
      m.costo += 1;
      const k = prendi();
      if (k.t === 'kw') {
        if (k.assente) throw errore('SYNTAX', k.v + ' esisteva nei BASIC dell\'epoca, ma questo BASIC didattico non lo conosce.');
        const f = ISTRUZIONI[k.v];
        if (!f) throw errore('SYNTAX');
        f();
      } else if (k.t === 'id') {
        assegnazione(k.v);
      } else {
        throw errore('SYNTAX', k.t === 'num' ? 'Un numero non può cominciare un\'istruzione: il numero di riga va solo all\'inizio della riga.' : '');
      }
      if (m.stato !== 'esegue' || saltato) return;
      if (pos.p < toks.length) {
        if (toks[pos.p].t === ':') pos.p += 1;
        else throw errore('SYNTAX', 'Dopo un\'istruzione completa ci vogliono i due punti «:» oppure la fine della riga.');
      }
    }

    // Esegue al massimo `max` istruzioni e si ferma prima se il costo supera `costoMax`.
    function passi(max, costoMax) {
      const limite = max == null ? 1 : max;
      const tetto = costoMax == null ? Infinity : costoMax;
      let n = 0;
      const c0 = m.costo;
      while (m.stato === 'esegue' && n < limite && m.costo - c0 < tetto) {
        const s0 = schermo.scorrimenti;
        try { passo(); } catch (err) { segnala(err); }
        m.costo += 8 * (schermo.scorrimenti - s0);
        n += 1;
      }
      return n;
    }

    // Una riga scritta dall'utente: con il numero va nel programma, senza si esegue subito.
    // Chi chiama ha già mostrato la riga sullo schermo (eco) e l'ha chiusa con un a capo.
    function immetti(riga) {
      if (m.stato !== 'pronto') return { tipo: 'occupato' };
      const t = normalizza(riga);
      const mm = /^\s*(\d+)\s*(.*)$/.exec(t);
      if (mm) {
        const numero = Number(mm[1]);
        if (mm[1].length > 5 || numero > RIGA_MAX) {
          schermo.scrivi('?SYNTAX ERROR\nREADY.\n');
          const ev = { tipo: 'errore', codice: 'SYNTAX', riga: null, testo: t.trim(), dettaglio: 'I numeri di riga vanno da 0 a 63999.', programma: false, istruzioni: 0 };
          m.eventi.push(ev);
          return ev;
        }
        const resto = mm[2];
        if (!resto) {
          const esisteva = programma.delete(numero);
          lineeValide = false;
          return { tipo: 'cancellata', numero: numero, esisteva: esisteva };
        }
        const esisteva = programma.has(numero);
        const extra = resto.length + 5 - (esisteva ? programma.get(numero).length + 5 : 0);
        if (m.byte() + extra > MEMORIA) {
          schermo.scrivi('?OUT OF MEMORY ERROR\nREADY.\n');
          const ev = { tipo: 'errore', codice: 'MEMORIA', riga: null, testo: t.trim(), dettaglio: 'Il programma ha riempito tutta la memoria libera.', programma: false, istruzioni: 0 };
          m.eventi.push(ev);
          return ev;
        }
        programma.set(numero, resto);
        lineeValide = false;
        return { tipo: 'memorizzata', numero: numero, nuova: !esisteva };
      }
      if (!t.trim()) return { tipo: 'vuota' };
      diretta = { testo: t.trim(), token: null };
      pos.i = -1;
      pos.p = 0;
      pila = [];
      inProgramma = false;
      istruzioniRun = 0;
      toks = [];
      m.stato = 'esegue';
      return { tipo: 'diretta' };
    }

    // La risposta a un INPUT (anche questa già mostrata sullo schermo da chi chiama).
    function rispondi(riga) {
      if (m.stato !== 'attesa' || !attesa) return false;
      const t = String(riga == null ? '' : riga).toUpperCase();
      if (!t.trim() && !attesa.valori.length) {
        schermo.scrivi(attesa.prompt + '? ');
        m.eventi.push({ tipo: 'vuota' });
        return true;
      }
      for (const parte of dividiInput(t)) {
        if (attesa.valori.length >= attesa.voci.length) { schermo.scrivi('?EXTRA IGNORED\n'); break; }
        const nome = attesa.voci[attesa.valori.length];
        if (nome.charAt(nome.length - 1) === '$') attesa.valori.push(parte.slice(0, STRINGA_MAX));
        else {
          const n = numeroInput(parte);
          if (n === null) {
            attesa.valori = [];
            schermo.scrivi('?REDO FROM START\n' + attesa.prompt + '? ');
            m.eventi.push({ tipo: 'redo', testo: parte });
            return true;
          }
          attesa.valori.push(n);
        }
      }
      if (attesa.valori.length < attesa.voci.length) {
        schermo.scrivi('?? ');
        m.eventi.push({ tipo: 'altri', mancano: attesa.voci.length - attesa.valori.length });
        return true;
      }
      attesa.voci.forEach((nome, k) => variabili.set(nome, attesa.valori[k]));
      attesa = null;
      m.stato = 'esegue';
      return true;
    }

    // Il tasto RUN/STOP: interrompe un programma che gira o che aspetta un INPUT.
    function ferma() {
      if (m.stato === 'pronto') return false;
      fine('break');
      return true;
    }

    return m;
  }

  /* ======================= prova rapida (per i test) ======================= */

  // Scrive le righe di `sorgente` come le scriverebbe una persona, poi (se non ci sono comandi) RUN.
  // opzioni.input: un array di risposte oppure una funzione (prompt, variabili) -> risposta | null.
  function esegui(sorgente, opzioni) {
    opzioni = opzioni || {};
    const schermo = creaSchermo(COLONNE, RIGHE, { registra: true });
    const macchina = creaMacchina({ schermo: schermo, casuale: opzioni.casuale });
    const risposte = Array.isArray(opzioni.input) ? opzioni.input.map(String) : [];
    const limite = opzioni.passiMax || 200000;
    const righe = Array.isArray(sorgente) ? sorgente : String(sorgente == null ? '' : sorgente).split('\n');
    const diretti = righe.some((r) => String(r).trim() && !/^\s*\d/.test(r));
    const tutte = righe.concat(opzioni.comandi || (diretti ? [] : ['RUN']));
    let passi = 0;
    for (const riga of tutte) {
      if (!String(riga).trim()) continue;
      if (macchina.stato !== 'pronto') break;
      macchina.immetti(riga);
      while (passi < limite) {
        if (macchina.stato === 'esegue') passi += macchina.passi(Math.min(1000, limite - passi), Infinity);
        else if (macchina.stato === 'attesa') {
          const a = macchina.attesa();
          const r = typeof opzioni.input === 'function' ? opzioni.input(a.prompt, a.voci) : risposte.shift();
          if (r == null) break;
          schermo.scrivi(String(r).toUpperCase() + '\n');
          macchina.rispondi(String(r));
        } else break;
      }
      if (passi >= limite) break;
    }
    const errori = macchina.eventi.filter((ev) => ev.tipo === 'errore');
    return {
      macchina: macchina,
      schermo: schermo,
      righe: schermo.trascrizione(),
      testo: schermo.trascrizione().join('\n'),
      stato: macchina.stato,
      eventi: macchina.eventi.slice(),
      errore: errori.length ? errori[errori.length - 1] : null,
      passi: passi,
    };
  }

  /* ======================= carattere bitmap 8×8 ======================= */

  // Disegnato per questo laboratorio (tratti verticali di 2 pixel); 8 byte per carattere, una riga per byte.
  const CARATTERI = '0123456789 !"#$%&\'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_╲╱●♥○▒▚▯';
  const FONT =
    '3c666e7e76663c001838781818187e003c66060c30607e003c66061c06663c000c1c3c6c7e0c0c007e607c0606663c00' +
    '3c60607c66663c007e060c18181818003c66663c66663c003c66663e060c38000000000000000000181818181800180066' +
    '666600000000006666ff66ff666600187ec07c06fc1800c3c60c183063c300386c3873decc760018183000000000000c18' +
    '303030180c0030180c0c0c18300000663cff3c6600000018187e1818000000000000001818300000007e00000000000000' +
    '000018180003060c183060c000001818001818000000181800181830000c18306030180c0000007e007e00000030180c06' +
    '0c1830003c66060c180018003c666e6a6e603e00183c66667e6666007c66667c66667c003c66606060663c00786c666666' +
    '6c78007e60607c60607e007e60607c606060003c66606e66663e006666667e666666003c18181818183c001e0c0c0c0c6c' +
    '3800666c7870786c66006060606060607e00c3e7ffdbc3c3c300c3e3f3dbcfc7c3003c66666666663c007c66667c606060' +
    '003c6666666e3c06007c66667c786c66003c66603c06663c007e181818181818006666666666663c0066666666663c1800' +
    'c3c3c3dbffe7c30066663c183c6666006666663c181818007e060c1830607e003c30303030303c00c06030180c0603003c' +
    '0c0c0c0c0c3c00183c66000000000000000000000000ffc06030180c06030103060c183060c0803c7effffff7e3c0066ff' +
    'ffff7e3c18003c66c3c3c3663c00cccc3333cccc3333f0f0f0f00f0f0f0f007e424242427e00';
  const BITMAP = [];
  for (let k = 0; k < FONT.length; k += 2) BITMAP.push(parseInt(FONT.substr(k, 2), 16));

  const SIMILI = { '’': '\'', '‘': '\'', '“': '"', '”': '"', '«': '"', '»': '"', '–': '-', '—': '-', '×': '*', '÷': '/', '·': '.', '…': '.' };

  // Indice del disegno per un carattere: le lettere accentate perdono l'accento (come sugli schermi
  // dell'epoca, che non le avevano); ciò che manca diventa un rettangolino vuoto.
  function glifo(ch) {
    let k = CARATTERI.indexOf(ch);
    if (k >= 0 && ch) return k;
    const base = String(ch).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    if (base.length === 1) { k = CARATTERI.indexOf(base); if (k >= 0) return k; }
    if (SIMILI[ch]) return CARATTERI.indexOf(SIMILI[ch]);
    return CARATTERI.length - 1;
  }

  const Logica = {
    COLONNE: COLONNE,
    RIGHE: RIGHE,
    MEMORIA: MEMORIA,
    LUNGHEZZA_RIGA: LUNGHEZZA_RIGA,
    ERRORI: ERRORI,
    ESEMPI: ESEMPI,
    CARATTERI: CARATTERI,
    BITMAP: BITMAP,
    tokenizza: tokenizza,
    formatta: formatta,
    stampaNumero: stampaNumero,
    chr: chr,
    asc: asc,
    val: val,
    glifo: glifo,
    suggerisci: suggerisci,
    normalizza: normalizza,
    creaSchermo: creaSchermo,
    creaMacchina: creaMacchina,
    esegui: esegui,
  };

  /* ======================= interfaccia ======================= */

  const TESTO = '#b0a9ff';          // colore dei caratteri sullo schermo (lo stesso di --lab-basic-testo)
  const RITMO = 1.2;               // velocità «1982»: unità di costo al millisecondo (lo scorrimento costa 8)
  const BATTUTE = 0.16;            // caratteri al millisecondo quando il laboratorio digita un esempio

  const css = `
    .lab-basic { --lab-basic-bordo: #8178e4; --lab-basic-fondo: #2f2690; --lab-basic-testo: ${TESTO}; --lab-basic-bagliore: rgba(176, 169, 255, .62); }
    .lab-basic-esempi { row-gap: 8px; }
    .lab-basic-banco { padding: 22px 22px 12px; background: radial-gradient(120% 90% at 50% 0%, rgba(129, 120, 228, .11), transparent 64%); }
    .lab-basic-monitor {
      max-width: 760px; margin: 0 auto; padding: 16px 16px 10px; border-radius: 22px;
      background: linear-gradient(180deg, #2c3239 0%, #1b1f25 100%); border: 1px solid #3a424c;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08), inset 0 -2px 0 rgba(0, 0, 0, .35), 0 24px 44px -28px rgba(0, 0, 0, .9);
    }
    .lab-basic-cornice {
      position: relative; padding: 6.5% 7.5%; border-radius: 26px / 22px; overflow: hidden;
      background: var(--lab-basic-bordo); box-shadow: inset 0 0 0 3px rgba(0, 0, 0, .4);
    }
    .lab-basic-cornice::after {
      content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
      background: radial-gradient(125% 100% at 50% 50%, transparent 60%, rgba(12, 8, 44, .5) 100%),
        linear-gradient(158deg, rgba(255, 255, 255, .14) 0%, rgba(255, 255, 255, 0) 30%);
    }
    .lab-basic-schermo {
      position: relative; display: block; aspect-ratio: 8 / 5; overflow: hidden; cursor: text;
      background: var(--lab-basic-fondo); border-radius: 3px; outline: none;
    }
    .lab-basic-schermo:focus-visible { box-shadow: 0 0 0 3px var(--trace-1), 0 0 0 7px rgba(62, 224, 143, .28); }
    .lab-basic-canvas {
      position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated;
      filter: drop-shadow(0 0 1.6px var(--lab-basic-bagliore));
    }
    .lab-basic-cursore {
      position: absolute; left: 0; top: 0; width: 2.5%; height: 4%;
      background: var(--lab-basic-testo); box-shadow: 0 0 5px var(--lab-basic-bagliore);
      animation: lab-basic-lampeggia-a 1.06s step-end infinite;
    }
    .lab-basic-cursore.lab-basic-cursore--b { animation-name: lab-basic-lampeggia-b; }
    .lab-basic-cursore[hidden] { display: none; }
    @keyframes lab-basic-lampeggia-a { 50% { opacity: 0; } }
    @keyframes lab-basic-lampeggia-b { 50% { opacity: 0; } }
    .lab-basic-vetro {
      position: absolute; inset: 0; pointer-events: none;
      background: repeating-linear-gradient(180deg, rgba(10, 6, 44, 0) 0, rgba(10, 6, 44, 0) 50%, rgba(10, 6, 44, .2) 50%, rgba(10, 6, 44, .2) 100%);
      background-size: 100% 1%;
      animation: lab-basic-respiro 6s ease-in-out infinite;
    }
    @keyframes lab-basic-respiro { 50% { opacity: .72; } }
    .lab-basic-buio { position: absolute; inset: 0; background: #0b0a1f; pointer-events: none; }
    .lab-basic-accensione {
      position: absolute; inset: 0; pointer-events: none; opacity: 0; transform: scaleY(.01);
      background: linear-gradient(180deg, transparent 0%, rgba(206, 201, 255, .85) 44%, #fff 50%, rgba(206, 201, 255, .85) 56%, transparent 100%);
    }
    .lab-basic-spie { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 18px; padding: 11px 6px 3px; }
    .lab-basic-led, .lab-basic-letture { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 0; font: 700 13px/1.35 var(--mono); }
    .lab-basic-led { letter-spacing: .05em; text-transform: uppercase; color: #8e99a5; }
    .lab-basic-spia { display: inline-flex; align-items: center; gap: 7px; transition: color var(--pg-dur-veloce) ease; }
    .lab-basic-spia::before {
      content: ""; width: 9px; height: 9px; border-radius: 50%; background: #39414a; box-shadow: inset 0 1px 1px rgba(0, 0, 0, .5);
      transition: background-color var(--pg-dur-veloce) ease, box-shadow var(--pg-dur-veloce) ease;
    }
    .lab-basic-spia[data-on="true"] { color: var(--lab-bright); }
    .lab-basic-spia[data-on="true"]::before { background: var(--c); box-shadow: 0 0 8px var(--c), 0 0 2px var(--c); }
    .lab-basic-letture { font-weight: 600; color: var(--lab-text); }
    .lab-basic-letture > span { display: inline-flex; gap: 6px; align-items: baseline; }
    .lab-basic-riga { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 14px 20px 6px; border-top: 1px solid var(--lab-line); }
    .lab-basic-etichetta { font: 700 13px var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--lab-text); }
    .lab-basic-campo {
      flex: 1 1 240px; min-width: 0; font-size: 16px; letter-spacing: .05em; text-transform: uppercase;
      color: var(--lab-basic-testo); background: #0d0b2a; border-color: #3b3880; caret-color: var(--lab-basic-testo);
      transition: border-color var(--pg-dur-veloce) ease, box-shadow var(--pg-dur-veloce) ease;
    }
    .lab-basic-campo::placeholder { color: #8f8acb; opacity: 1; text-transform: none; letter-spacing: 0; }
    .lab-basic-campo[data-attesa="true"] { border-color: var(--trace-3); box-shadow: 0 0 0 3px rgba(92, 200, 255, .24); }
    .lab-basic-stop {
      min-width: 104px; font-weight: 800; letter-spacing: .04em; color: #ffe3ed;
      background: color-mix(in srgb, var(--trace-4) 22%, var(--lab-raised)); border-color: color-mix(in srgb, var(--trace-4) 70%, transparent);
    }
    .lab-basic-stop:hover:not([aria-disabled="true"]) { border-color: var(--trace-4); color: #fff; }
    .lab-basic-stop[aria-disabled="true"] { opacity: .45; cursor: not-allowed; }
    .lab-basic-aiuto { margin: 0; padding: 4px 20px 12px; font-size: 13px; line-height: 1.5; color: #96a7a0; }
    .lab-basic-aiuto kbd { font: 700 12.5px var(--mono); color: var(--lab-bright); background: var(--lab-raised); border: 1px solid var(--lab-line); border-radius: 5px; padding: 0 5px; }
    .lab-basic-comandi .lab-basic-cmd { font-family: var(--mono); letter-spacing: .06em; }
    .lab-basic-spiega code { white-space: pre-wrap; }
    .lab-basic-spiega .lab-basic-errore { color: #ffb3c9; font: 700 .95rem var(--mono); }
    @media (max-width: 640px) {
      .lab-basic-banco { padding: 14px 10px 8px; }
      .lab-basic-monitor { padding: 10px 10px 8px; border-radius: 16px; }
      .lab-basic-cornice { padding: 4.5% 5%; border-radius: 18px / 15px; }
      .lab-basic-riga { padding: 12px 12px 4px; }
      .lab-basic-etichetta { flex-basis: 100%; }
      .lab-basic-riga .pg-btn { flex: 1 1 auto; }
      .lab-basic-aiuto { padding: 4px 12px 10px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .lab-basic-cursore, .lab-basic-vetro { animation: none; }
    }
  `;

  function monta(el, ctx) {
    const h = ctx.h;
    const schermo = creaSchermo(COLONNE, RIGHE);
    const macchina = creaMacchina({ schermo: schermo });
    const st = {
      acceso: false,
      velocita: 'epoca',
      credito: 0,
      tempo: 0,              // millisecondi di esecuzione dall'ultimo RUN
      avvisato: false,
      coda: [],              // righe che il laboratorio «digita» (esempi, testo incollato)
      battitura: null,
      budget: 0,
      velBattitura: BATTUTE,
      esempio: null,         // esempio in corso di battitura
      caricato: null,        // ultimo esempio caricato
      incollato: false,
      storia: [],
      storiaI: 0,
      edit: { riga: 0, col: 0, lunghezza: 0 },
      completato: false,
      ultimoComando: '',
      ultimoMirror: 0,
    };
    let stopCiclo = null;
    let scala = 0;
    let atlante = null;
    let disegnata = -1;
    const cache = new Map();

    /* ----- struttura ----- */

    const idCampo = ctx.uid('lab-basic-campo');
    const idAiuto = ctx.uid('lab-basic-aiuto');
    const idVel = ctx.uid('lab-basic-vel');

    const canvas = h('canvas', { class: 'lab-basic-canvas', width: '320', height: '200', 'aria-hidden': 'true' });
    const g = canvas.getContext('2d');
    const cursore = h('span', { class: 'lab-basic-cursore', 'aria-hidden': 'true', hidden: true });
    const vetro = h('span', { class: 'lab-basic-vetro', 'aria-hidden': 'true' });
    const buio = h('span', { class: 'lab-basic-buio', 'aria-hidden': 'true' });
    const accensione = h('span', { class: 'lab-basic-accensione', 'aria-hidden': 'true' });
    const mirror = h('pre', { class: 'pg-sr' });
    const schermoEl = h('div', {
      class: 'lab-basic-schermo',
      tabindex: '0',
      role: 'region',
      'aria-label': 'Schermo del computer, 40 colonne per 25 righe. Quando è selezionato puoi scriverci direttamente.',
      'aria-describedby': idAiuto,
      onkeydown: tastoSchermo,
      onclick: cliccaSchermo,
    }, canvas, cursore, vetro, buio, accensione, mirror);

    const spia = (testo, colore) => h('span', { class: 'lab-basic-spia', style: '--c: ' + colore, 'data-on': 'false' }, testo);
    const spiaAcceso = spia('Acceso', 'var(--trace-1)');
    const spiaEsegue = spia('In esecuzione', 'var(--trace-2)');
    const spiaInput = spia('Aspetta input', 'var(--trace-3)');
    const letRighe = h('span', { class: 'pg-lettura' }, '0');
    const letByte = h('span', { class: 'pg-lettura' }, MEMORIA.toLocaleString('it-IT'));
    const letIstr = h('span', { class: 'pg-lettura' }, '0');

    const monitor = h('div', { class: 'lab-basic-monitor' },
      h('div', { class: 'lab-basic-cornice' }, schermoEl),
      h('div', { class: 'lab-basic-spie' },
        h('p', { class: 'lab-basic-led' }, spiaAcceso, spiaEsegue, spiaInput),
        h('p', { class: 'lab-basic-letture' },
          h('span', null, 'Righe', letRighe),
          h('span', null, 'Byte liberi', letByte),
          h('span', null, 'Istruzioni eseguite', letIstr))));

    const campo = h('input', {
      id: idCampo,
      class: 'pg-campo lab-basic-campo',
      type: 'text',
      maxlength: String(LUNGHEZZA_RIGA),
      autocomplete: 'off',
      autocapitalize: 'characters',
      autocorrect: 'off',
      spellcheck: 'false',
      enterkeyhint: 'send',
      placeholder: 'per esempio PRINT 2+2',
      'aria-describedby': idAiuto,
      oninput: () => eco(),
      onkeydown: tastoCampo,
      onpaste: incolla,
    });
    const stopBtn = h('button', { type: 'button', class: 'pg-btn lab-basic-stop', 'aria-disabled': 'true', 'aria-keyshortcuts': 'Escape', onclick: () => ferma(true) }, '■ STOP');
    const riga = h('form', { class: 'lab-basic-riga', onsubmit: (ev) => { ev.preventDefault(); invia(false); } },
      h('label', { class: 'lab-basic-etichetta', for: idCampo }, 'Scrivi una riga'),
      campo,
      h('button', { type: 'submit', class: 'pg-btn pg-btn--primario' }, '⏎ Invio'),
      stopBtn);
    const aiuto = h('p', { class: 'lab-basic-aiuto', id: idAiuto },
      h('kbd', null, 'Invio'), ' esegue la riga · ', h('kbd', null, 'Esc'), ' o STOP interrompe il programma · ',
      h('kbd', null, '↑'), ' ', h('kbd', null, '↓'), ' richiamano le righe già scritte');

    const bottoniEsempio = Object.keys(ESEMPI).map((k) => h('button', { type: 'button', class: 'pg-btn', 'data-esempio': k, onclick: () => carica(k) }, ESEMPI[k].nome));
    const esempi = h('div', { class: 'pg-strumenti lab-basic-esempi' },
      h('span', { class: 'pg-etichetta' }, 'Carica un esempio:'), bottoniEsempio);

    const comando = (t) => h('button', { type: 'button', class: 'pg-btn lab-basic-cmd', onclick: () => comandoRapido(t) }, t);
    const velEpoca = h('button', { type: 'button', class: 'pg-btn', 'aria-pressed': 'true', onclick: () => impostaVelocita('epoca') }, '1982');
    const velTurbo = h('button', { type: 'button', class: 'pg-btn', 'aria-pressed': 'false', onclick: () => impostaVelocita('turbo') }, 'Turbo');
    const comandi = h('div', { class: 'pg-strumenti pg-strumenti--sotto lab-basic-comandi' },
      h('span', { class: 'pg-etichetta' }, 'Comandi'),
      h('div', { class: 'pg-gruppo', role: 'group', 'aria-label': 'Comandi rapidi' }, comando('RUN'), comando('LIST'), comando('NEW'), comando('CLS')),
      h('span', { class: 'pg-spazio' }),
      h('span', { class: 'pg-etichetta', id: idVel }, 'Velocità'),
      h('div', { class: 'pg-gruppo', role: 'group', 'aria-labelledby': idVel }, velEpoca, velTurbo));

    const spiegaEl = h('div', { class: 'pg-spiega lab-basic-spiega', 'aria-live': 'polite' });

    el.append(h('div', { class: 'lab-basic' }, esempi, h('div', { class: 'lab-basic-banco' }, monitor), riga, aiuto, comandi, spiegaEl));

    spiega('Questo è un BASIC come quelli degli home computer degli anni Ottanta. Scrivi `PRINT 2+2` e premi **Invio**, oppure carica un esempio e premi **RUN**.',
      'Le righe che cominciano con un numero, come `10 PRINT "CIAO"`, non vengono eseguite subito: restano in memoria e formano il programma.');

    /* ----- disegno ----- */

    function preparaAtlante() {
      const n = CARATTERI.length;
      atlante = document.createElement('canvas');
      atlante.width = n * 8 * scala;
      atlante.height = 8 * scala;
      const c = atlante.getContext('2d');
      c.fillStyle = TESTO;
      for (let k = 0; k < n; k++) {
        for (let y = 0; y < 8; y++) {
          const b = BITMAP[k * 8 + y];
          for (let x = 0; x < 8; x++) if (b & (0x80 >> x)) c.fillRect((k * 8 + x) * scala, y * scala, scala, scala);
        }
      }
    }

    function ridimensiona() {
      const w = schermoEl.clientWidth;
      if (!w) return;
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      const s = Math.max(1, Math.min(4, Math.round(w * dpr / 320)));
      if (s === scala) return;
      scala = s;
      canvas.width = 320 * s;
      canvas.height = 200 * s;
      g.imageSmoothingEnabled = false;
      preparaAtlante();
      disegna(true);
    }

    function disegna(forza) {
      if (scala && (forza || schermo.versione !== disegnata)) {
        disegnata = schermo.versione;
        g.clearRect(0, 0, canvas.width, canvas.height);
        const lato = 8 * scala;
        for (let y = 0; y < RIGHE; y++) {
          const r = schermo.celle[y];
          for (let x = 0; x < COLONNE; x++) {
            const ch = r[x];
            if (ch === ' ') continue;
            let k = cache.get(ch);
            if (k === undefined) { k = glifo(ch); cache.set(ch, k); }
            g.drawImage(atlante, k * lato, 0, lato, lato, x * lato, y * lato, lato, lato);
          }
        }
      }
      const visibile = st.acceso && macchina.stato !== 'esegue';
      cursore.hidden = !visibile;
      if (visibile) {
        const x = Math.min(schermo.cx, COLONNE - 1);
        cursore.style.transform = 'translate(' + (x * 100) + '%, ' + (schermo.cy * 100) + '%)';
      }
    }

    function aggiornaMirror(forza) {
      const ora = Date.now();
      if (!forza && ora - st.ultimoMirror < 900) return;
      st.ultimoMirror = ora;
      mirror.textContent = schermo.testo();
    }

    function aggiornaSpie() {
      const lavora = !!st.battitura || st.coda.length > 0;
      spiaAcceso.setAttribute('data-on', String(st.acceso));
      spiaEsegue.setAttribute('data-on', String(macchina.stato === 'esegue'));
      spiaInput.setAttribute('data-on', String(macchina.stato === 'attesa'));
      stopBtn.setAttribute('aria-disabled', String(!(macchina.stato !== 'pronto' || lavora)));
      campo.setAttribute('data-attesa', String(macchina.stato === 'attesa'));
      const righe = String(macchina.righe);
      const liberi = macchina.liberi().toLocaleString('it-IT');
      const istr = macchina.contatore.toLocaleString('it-IT');
      if (letRighe.textContent !== righe) letRighe.textContent = righe;
      if (letByte.textContent !== liberi) letByte.textContent = liberi;
      if (letIstr.textContent !== istr) letIstr.textContent = istr;
    }

    function riavviaCursore() { cursore.classList.toggle('lab-basic-cursore--b'); }

    function aggiorna() { disegna(); aggiornaSpie(); aggiornaMirror(true); }

    /* ----- spiegazioni ----- */

    function spiega() {
      const parti = Array.prototype.slice.call(arguments).filter(Boolean);
      spiegaEl.replaceChildren.apply(spiegaEl, parti.map((p) => (typeof p === 'string' ? h('p', null, ctx.inline(p)) : p)));
    }

    function plurale(n, uno, molti) { return n.toLocaleString('it-IT') + ' ' + (n === 1 ? uno : molti); }

    function notaEsempio() {
      const es = st.caricato && ESEMPI[st.caricato];
      return es && macchina.testoProgramma() === es.sorgente ? es : null;
    }

    function spiegaEvento(ev) {
      switch (ev.tipo) {
        case 'run': {
          const es = notaEsempio();
          spiega('**RUN**: il BASIC parte dalla riga ' + ev.da + ', esegue un\'istruzione alla volta e segue i salti. Legge e traduce ogni riga mentre la esegue: è un {{interprete}}.',
            es ? es.nota : '');
          break;
        }
        case 'fine':
          if (ev.programma) spiega('Programma terminato dopo ' + plurale(ev.istruzioni, 'istruzione', 'istruzioni') + '. «READY.» vuol dire «pronto»: il computer aspetta il prossimo comando.');
          break;
        case 'diretta': {
          const c = st.ultimoComando;
          if (/^LIST\b/.test(c)) {
            spiega(macchina.righe ? '**LIST** mostra il programma in memoria, in ordine di numero di riga: anche se scrivi le righe in disordine, il BASIC le rimette in fila.' : 'La memoria è vuota: non c\'è nessun programma da elencare. Scrivi una riga con il numero davanti, per esempio `10 PRINT "CIAO"`.');
          } else if (/^CLS\b/.test(c)) {
            spiega('**CLS** pulisce lo schermo; il programma in memoria resta dov\'è (prova `LIST`).');
          } else {
            spiega('Eseguito subito, in **modo diretto**: senza numero di riga il BASIC non conserva l\'istruzione. Con un numero davanti, per esempio `10 ' + c.replace(/`/g, '') + '`, diventerebbe una riga del programma.');
          }
          break;
        }
        case 'nuovo':
          if (!st.esempio && !st.incollato) spiega('**NEW** cancella il programma e le variabili: la memoria torna libera.');
          break;
        case 'vuoto':
          spiega('Non c\'è nessun programma in memoria. Scrivi qualche riga numerata, per esempio `10 PRINT "CIAO"`, oppure carica un esempio.');
          break;
        case 'break':
          spiega('Programma interrotto' + (ev.programma && ev.riga !== null ? ' alla riga ' + ev.riga : '') + ', come con il tasto RUN/STOP dei computer di allora. Scrivi `RUN` per ricominciare da capo.');
          break;
        case 'errore': {
          const parti = [h('p', null, h('span', { class: 'lab-basic-errore' }, '?' + ERRORI[ev.codice][0] + ' ERROR' + (ev.riga !== null ? ' IN ' + ev.riga : '')), ' ', ctx.inline(ERRORI[ev.codice][1]))];
          if (ev.testo) parts(parti, ev);
          if (ev.dettaglio) parti.push(h('p', null, ctx.inline(ev.dettaglio)));
          spiega.apply(null, parti);
          break;
        }
        case 'input':
          spiega('Il programma si è fermato su `INPUT` e aspetta' + (ev.prompt ? ' una risposta alla domanda «' + ev.prompt + '?»' : ' una risposta') + ': scrivi ' +
            (ev.voci.every((v) => /\$$/.test(v)) ? 'un testo' : 'un numero') + ' e premi **Invio**.');
          break;
        case 'redo':
          spiega('Serviva un **numero**: il BASIC risponde «?REDO FROM START», cioè «ricomincia da capo». Scrivi solo cifre e premi Invio.');
          break;
        case 'altri':
          spiega('Mancano dei valori: il doppio punto interrogativo «??» chiede il resto. Puoi anche scriverli tutti insieme, separati da virgole.');
          break;
        case 'vuota':
          spiega('La risposta è vuota: scrivi qualcosa e premi Invio.');
          break;
        default:
      }
    }

    function parts(lista, ev) {
      lista.push(h('p', null, ev.riga !== null ? 'Riga ' + ev.riga + ': ' : 'Hai scritto: ', h('code', null, (ev.riga !== null ? ev.riga + ' ' : '') + ev.testo)));
    }

    function eventi() {
      let pronto = false;
      while (macchina.eventi.length) {
        const ev = macchina.eventi.shift();
        if (ev.tipo === 'run') {
          st.tempo = 0;
          st.avvisato = false;
          st.credito = 0;
          if (!st.completato) { st.completato = true; ctx.completa(); }
        }
        if (ev.tipo === 'input' || ev.tipo === 'redo' || ev.tipo === 'altri' || ev.tipo === 'vuota') pronto = true;
        if (ev.tipo === 'input') focusCampo();
        if (ev.tipo !== 'nuovo' || (!st.esempio && !st.incollato)) spiegaEvento(ev);
      }
      if (pronto || macchina.stato === 'pronto') {
        if (!st.battitura) iniziaEdit();
      }
    }

    /* ----- scrittura sullo schermo (eco) ----- */

    // La riga che si sta scrivendo compare sullo schermo dalla posizione del cursore in poi.
    function iniziaEdit() {
      st.edit = { riga: schermo.cy, col: schermo.cx, lunghezza: 0 };
      if (campo.value) eco();
    }

    function eco() {
      if (macchina.stato === 'esegue' || !st.acceso) return;
      const testo = campo.value.toUpperCase();
      const ed = st.edit;
      const s0 = schermo.scorrimenti;
      schermo.vai(ed.riga, ed.col);
      if (ed.lunghezza) schermo.scrivi(' '.repeat(ed.lunghezza));
      ed.riga = Math.max(0, ed.riga - (schermo.scorrimenti - s0));
      schermo.vai(ed.riga, ed.col);
      const s1 = schermo.scorrimenti;
      schermo.scrivi(testo);
      ed.riga = Math.max(0, ed.riga - (schermo.scorrimenti - s1));
      ed.lunghezza = Array.from(testo).length;
      riavviaCursore();
      disegna();
    }

    /* ----- ciclo di esecuzione ----- */

    function avvia() { if (!stopCiclo) stopCiclo = ctx.ciclo(tick); }

    function tick(dt) {
      if (macchina.stato === 'esegue') {
        if (st.velocita === 'turbo') macchina.passi(300, Infinity);
        else {
          st.credito = Math.min(st.credito + dt * RITMO, 200);
          const prima = macchina.costo;
          macchina.passi(300, st.credito);
          st.credito -= macchina.costo - prima;
        }
        st.tempo += dt;
        if (!st.avvisato && st.tempo > 4000 && macchina.stato === 'esegue') {
          st.avvisato = true;
          const es = notaEsempio();
          spiega(es ? es.nota : '', 'Questo programma non finisce mai: un `GOTO` lo rimanda sempre indietro. Premi **STOP** (o Esc) per interromperlo, come si faceva con il tasto RUN/STOP.');
        }
      } else if (st.battitura || st.coda.length) {
        batti(dt);
      }
      eventi();
      disegna();
      aggiornaMirror(false);
      aggiornaSpie();
      if (macchina.stato !== 'esegue' && !st.battitura && !st.coda.length && stopCiclo) {
        stopCiclo();
        stopCiclo = null;
        aggiornaMirror(true);
      }
    }

    /* ----- invio di una riga ----- */

    function invia(daBattitura) {
      if (!st.acceso) accendi(true);
      if (!daBattitura && (st.battitura || st.coda.length)) completaBattitura();
      if (macchina.stato === 'esegue') {
        spiega('Il programma è in esecuzione: per scrivere un nuovo comando prima fermalo con **STOP** (o con il tasto Esc).');
        stopBtn.classList.remove('pg-flash');
        void stopBtn.offsetWidth;
        stopBtn.classList.add('pg-flash');
        return;
      }
      const testo = campo.value.toUpperCase().slice(0, LUNGHEZZA_RIGA);
      eco();
      campo.value = '';
      st.edit.lunghezza = 0;
      schermo.scrivi('\n');
      if (!daBattitura && testo.trim()) {
        st.storia.push(testo);
        if (st.storia.length > 40) st.storia.shift();
      }
      st.storiaI = st.storia.length;
      if (macchina.stato === 'attesa') {
        macchina.rispondi(testo);
        if (macchina.stato === 'esegue') avvia();
      } else {
        st.ultimoComando = testo.trim();
        const r = macchina.immetti(testo);
        if (r.tipo === 'diretta') avvia();
        else if (r.tipo === 'memorizzata' && !daBattitura) {
          spiega('Riga **' + r.numero + '** ' + (r.nuova ? 'memorizzata' : 'sostituita') + ': non viene eseguita adesso, ma entra nel programma, che ora ha ' + plurale(macchina.righe, 'riga', 'righe') + '. Scrivi `LIST` per vederlo o `RUN` per eseguirlo.');
        } else if (r.tipo === 'cancellata' && !daBattitura) {
          spiega(r.esisteva ? 'Riga **' + r.numero + '** cancellata: un numero da solo toglie quella riga dal programma.' : 'La riga ' + r.numero + ' non c\'era: un numero da solo serve a cancellare una riga.');
        }
      }
      eventi();
      if (macchina.stato !== 'esegue') iniziaEdit();
      aggiorna();
    }

    /* ----- battitura automatica di esempi e testo incollato ----- */

    function prossimaBattuta() {
      st.battitura = { testo: normalizza(st.coda.shift()), i: 0 };
      campo.value = '';
      st.edit = { riga: schermo.cy, col: schermo.cx, lunghezza: 0 };
    }

    function batti(dt) {
      if (ctx.riduci) { completaBattitura(); return; }
      st.budget += dt * st.velBattitura;
      while (st.budget >= 1 && macchina.stato !== 'esegue') {
        if (!st.battitura) {
          if (!st.coda.length) break;
          prossimaBattuta();
        }
        const b = st.battitura;
        if (b.i < b.testo.length) {
          const quanti = Math.min(b.testo.length - b.i, Math.floor(st.budget));
          campo.value += b.testo.substr(b.i, quanti);
          b.i += quanti;
          st.budget -= quanti;
          eco();
        } else {
          st.battitura = null;
          st.budget -= 5;     // una breve pausa prima della riga successiva
          invia(true);
        }
      }
      if (!st.battitura && !st.coda.length) fineBattitura();
    }

    function completaBattitura() {
      let guardia = 0;
      while ((st.battitura || st.coda.length) && guardia < 400) {
        guardia += 1;
        if (macchina.stato === 'esegue') {
          macchina.passi(200, Infinity);
          eventi();
          if (macchina.stato === 'esegue') return;   // un RUN incollato: il resto lo digita il ciclo
        }
        if (!st.battitura) prossimaBattuta();
        campo.value = st.battitura.testo;
        eco();
        st.battitura = null;
        invia(true);
      }
      if (macchina.stato === 'esegue') {
        macchina.passi(200, Infinity);
        eventi();
      }
      fineBattitura();
      aggiorna();
    }

    function fineBattitura() {
      if (st.battitura || st.coda.length) return;
      if (st.esempio) {
        const es = ESEMPI[st.esempio];
        st.caricato = st.esempio;
        st.esempio = null;
        spiega('Ho digitato «' + es.nome + '» riga per riga, come si faceva con i listati delle riviste: il programma è in memoria (' + plurale(macchina.righe, 'riga', 'righe') + '). Premi **RUN** per eseguirlo.', es.nota);
      } else if (st.incollato) {
        st.incollato = false;
        spiega('Ho digitato le righe incollate. Il programma ora ha ' + plurale(macchina.righe, 'riga', 'righe') + ': scrivi `LIST` per rileggerlo o `RUN` per eseguirlo.');
      }
    }

    function interrompiMacchina() {
      if (macchina.stato === 'pronto') return;
      campo.value = '';
      st.edit.lunghezza = 0;
      macchina.ferma();
      macchina.eventi.length = 0;
    }

    function carica(k) {
      const es = ESEMPI[k];
      if (!st.acceso) accendi(true);
      st.coda = [];
      st.battitura = null;
      interrompiMacchina();
      campo.value = '';
      schermo.pulisci();
      st.edit = { riga: 0, col: 0, lunghezza: 0 };
      st.esempio = k;
      st.incollato = false;
      st.coda = ['NEW'].concat(es.sorgente.split('\n'));
      st.budget = 0;
      st.velBattitura = Math.max(BATTUTE, es.sorgente.length / 1500);
      spiega('Scrivo il programma «' + es.nome + '» al posto tuo: prima `NEW`, che svuota la memoria, poi una riga alla volta.');
      if (ctx.riduci) completaBattitura(); else avvia();
      aggiorna();
    }

    function incolla(ev) {
      const dati = ev.clipboardData || (typeof window !== 'undefined' && window.clipboardData);
      const testo = dati ? dati.getData('text') : '';
      if (!/\n/.test(testo)) return;   // una riga sola: la incolla il campo, come sempre
      ev.preventDefault();
      const righe = testo.split(/\r?\n/).map((r) => r.replace(/\s+$/, '')).filter(Boolean).slice(0, 300);
      if (!righe.length) return;
      if (!st.acceso) accendi(true);
      if (macchina.stato === 'attesa') interrompiMacchina();
      campo.value = '';
      eco();
      st.coda = st.coda.concat(righe);
      st.incollato = !st.esempio;
      st.budget = 0;
      st.velBattitura = Math.max(BATTUTE, righe.join('').length / 1500);
      spiega('Incollo ' + plurale(righe.length, 'riga', 'righe') + ' e le digito una alla volta.');
      if (ctx.riduci) completaBattitura(); else avvia();
      aggiorna();
    }

    /* ----- comandi ----- */

    function ferma(daBottone) {
      if (daBottone && stopBtn.getAttribute('aria-disabled') === 'true') return;
      let fatto = false;
      if (st.battitura || st.coda.length) {
        st.coda = [];
        st.battitura = null;
        st.esempio = null;
        st.incollato = false;
        campo.value = '';
        schermo.scrivi('\n');
        st.edit = { riga: schermo.cy, col: schermo.cx, lunghezza: 0 };
        spiega('Ho smesso di digitare. Le righe già scritte sono in memoria: scrivi `LIST` per vederle.');
        fatto = true;
      }
      if (macchina.stato !== 'pronto') {
        campo.value = '';
        st.edit.lunghezza = 0;
        macchina.ferma();
        eventi();
        fatto = true;
      }
      if (fatto) aggiorna();
    }

    function comandoRapido(t) {
      if (!st.acceso) accendi(true);
      if (st.battitura || st.coda.length) completaBattitura();
      if (macchina.stato !== 'pronto') {
        campo.value = '';
        st.edit.lunghezza = 0;
        macchina.ferma();
        macchina.eventi.length = 0;
        iniziaEdit();
      }
      campo.value = t;
      eco();
      invia(false);
    }

    function impostaVelocita(v) {
      st.velocita = v;
      velEpoca.setAttribute('aria-pressed', String(v === 'epoca'));
      velTurbo.setAttribute('aria-pressed', String(v === 'turbo'));
      st.credito = 0;
      spiega(v === 'turbo'
        ? 'Velocità **Turbo**: fino a 300 istruzioni per ogni fotogramma dello schermo. È ciò che farebbe lo stesso BASIC su un processore molto più veloce.'
        : 'Velocità **1982**: il BASIC è rallentato per somigliare a un home computer dell\'epoca, e far scorrere lo schermo costa più tempo di un calcolo.');
    }

    function naviga(d) {
      if (!st.storia.length) return;
      st.storiaI = Math.max(0, Math.min(st.storia.length, st.storiaI + d));
      campo.value = st.storia[st.storiaI] || '';
      eco();
    }

    function focusCampo() {
      const att = typeof document !== 'undefined' ? document.activeElement : null;
      if (att && el.contains(att) && att !== schermoEl && att !== campo) campo.focus({ preventScroll: true });
    }

    function tastoCampo(ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); ferma(false); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); naviga(-1); }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); naviga(1); }
    }

    function tastoSchermo(ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.key === 'Escape') { ev.preventDefault(); ferma(false); return; }
      if (ev.key === 'Enter') { ev.preventDefault(); invia(false); return; }
      if (ev.key === 'Backspace') { ev.preventDefault(); campo.value = campo.value.slice(0, -1); eco(); return; }
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') { ev.preventDefault(); naviga(ev.key === 'ArrowUp' ? -1 : 1); return; }
      if (ev.key.length === 1) {
        ev.preventDefault();
        if (!st.acceso) accendi(true);
        if (campo.value.length < LUNGHEZZA_RIGA) { campo.value += ev.key.toUpperCase(); eco(); }
      }
    }

    function cliccaSchermo() {
      // sui telefoni lo schermo non apre la tastiera: si scrive nel campo sotto
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) campo.focus({ preventScroll: true });
    }

    /* ----- accensione ----- */

    function accendi(subito) {
      if (st.acceso) return;
      st.acceso = true;
      schermo.pulisci();
      schermo.scrivi('\n       **** BASIC DIDATTICO ****\n\n MEMORIA 16K     ' + MEMORIA + ' BYTE LIBERI\n\nREADY.\n');
      iniziaEdit();
      const fine = () => { buio.style.opacity = '0'; accensione.style.opacity = '0'; };
      if (subito || ctx.riduci) fine();
      else {
        ctx.anima({
          durata: ctx.DURATA.lenta,
          easing: 'smooth',
          aggiorna(t) {
            accensione.style.transform = 'scaleY(' + (0.01 + 0.99 * t) + ')';
            accensione.style.opacity = String(t < 0.2 ? t * 5 : Math.max(0, (1 - t) / 0.8));
            buio.style.opacity = String(1 - t);
          },
        }).then(fine, fine);
      }
      aggiorna();
    }

    async function avvio() {
      try {
        await ctx.attendi(300);   // il motore la fa scorrere solo quando il laboratorio è in vista
        accendi(false);
      } catch (err) {
        if (!ctx.annullato(err)) throw err;
      }
    }

    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(ridimensiona).observe(schermoEl);
    else if (typeof window !== 'undefined') window.addEventListener('resize', ridimensiona);
    ridimensiona();
    aggiornaSpie();
    avvio();

    return {
      riprendi() { disegna(true); },
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('basic', { titolo: 'Un BASIC dell\'epoca', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
