/*
 * Laboratorio «La perforatrice IBM 029» (capitolo 6 · Schede, lotti e terminali).
 *
 * Parte 1: una tastiera vera (un <input>) perfora una scheda IBM a 80 colonne, una colonna per tasto,
 * con il codice Hollerith di js/lib/hollerith.js. La lente mostra i fori della colonna appena perforata.
 * Parte 2: un programma FORTRAN di sei schede con i numeri di sequenza nelle colonne 73–80.
 * Il mazzo cade, si riordina come faceva la selezionatrice (una colonna per passata) e passa nel lettore:
 * un piccolo compilatore FORTRAN simulato stampa il tabulato, con gli errori se le schede sono in disordine.
 *
 * La logica (anatomia dei caratteri, mazzo, selezionatrice, compilatore) è pura ed esportata per i test.
 */
(function (root) {
  'use strict';

  const Hol = root.Hollerith || (typeof require === 'function' ? require('../lib/hollerith.js') : null);

  /* ================= logica pura ================= */

  const COLONNE = 80;
  const RIGHE = [12, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const ZONE = [12, 11, 0];

  // Geometria in centesimi di pollice: la scheda misura 7 3/8 × 3 1/4 pollici (circa 187 × 83 mm).
  // Colonne ogni 0,087", righe ogni 0,25", fori rettangolari di 0,055" × 0,125".
  const CARTA = { larghezza: 737.5, altezza: 325, x1: 25.1, passoX: 8.7, y12: 25, passoY: 25, foroL: 5.5, foroA: 12.5 };
  function xColonna(c) { return CARTA.x1 + (c - 1) * CARTA.passoX; }
  function yRiga(r) { return CARTA.y12 + RIGHE.indexOf(r) * CARTA.passoY; }

  // I campi della scheda FORTRAN.
  const CAMPI = [
    { id: 'numero', da: 1, a: 5, etichetta: 'N.', nome: 'numero dell\'istruzione' },
    { id: 'continuazione', da: 6, a: 6, etichetta: 'C', nome: 'continuazione' },
    { id: 'istruzione', da: 7, a: 72, etichetta: 'Istruzione FORTRAN', nome: 'istruzione FORTRAN' },
    { id: 'identificazione', da: 73, a: 80, etichetta: 'Sequenza', nome: 'identificazione (numero di sequenza)' },
  ];
  function campo(c) { return CAMPI.find((f) => c >= f.da && c <= f.a) || null; }

  // Caratteri delle tastiere di oggi che la 029 conosceva in forma semplice.
  const SOSTITUTI = {
    '’': '\'', '‘': '\'', '“': '"', '”': '"', '«': '"', '»': '"',
    '–': '-', '—': '-', '×': '*',
  };

  // Un tasto premuto: il carattere che la 029 perfora (maiuscolo, senza accenti) o il rifiuto.
  function tasto(ch) {
    const s = String(ch == null ? '' : ch);
    if (!s) return { ok: false, originale: s, motivo: 'vuoto' };
    const sostituito = SOSTITUTI[s] || s;
    const c = Hol.normalizza(sostituito);
    if (c.length !== 1 || Hol.fori(c) == null) return { ok: false, originale: s, motivo: 'sconosciuto' };
    let conversione = null;
    if (sostituito !== s) conversione = 'tipografico';
    else if (c !== s) conversione = s.toUpperCase() === c ? 'maiuscola' : 'accento';
    return { ok: true, originale: s, carattere: c, conversione: conversione };
  }

  // Filtra un testo intero: tiene ciò che la 029 sa perforare, al massimo 80 colonne.
  function filtra(testo) {
    const accettati = [];
    const rifiutati = [];
    const conversioni = [];
    for (const ch of Array.from(String(testo == null ? '' : testo))) {
      const t = tasto(ch);
      if (!t.ok) { if (rifiutati.indexOf(ch) < 0) rifiutati.push(ch); continue; }
      accettati.push(t.carattere);
      if (t.conversione) conversioni.push({ da: ch, a: t.carattere, tipo: t.conversione });
    }
    return { testo: accettati.join('').slice(0, COLONNE), rifiutati: rifiutati, conversioni: conversioni };
  }

  // Anatomia dei fori di un carattere: zona (12, 11 o 0), cifra e foro 8 dei simboli.
  function anatomia(ch) {
    const f = Hol.fori(ch);
    if (f == null) return null;
    const fori = f.slice().sort((a, b) => RIGHE.indexOf(a) - RIGHE.indexOf(b));
    let zona = null;
    let cifre = fori.slice();
    if (fori.length === 1 && (fori[0] === 12 || fori[0] === 11)) { zona = fori[0]; cifre = []; }
    else if (fori.length > 1 && ZONE.indexOf(fori[0]) >= 0) { zona = fori[0]; cifre = fori.slice(1); }
    const otto = cifre.length === 2 && cifre.indexOf(8) >= 0;
    const cifra = otto ? cifre.find((d) => d !== 8) : (cifre.length === 1 ? cifre[0] : null);
    const ruoli = {};
    for (const r of fori) ruoli[r] = r === zona ? 'zona' : (otto && r === 8 ? 'otto' : 'cifra');
    return { carattere: ch, fori: fori, zona: zona, cifra: cifra, otto: otto, ruoli: ruoli };
  }

  function elenco(lista) {
    if (lista.length <= 1) return lista.join('');
    return lista.slice(0, -1).join(', ') + ' e ' + lista[lista.length - 1];
  }

  // «A = fori 12 e 1 (zona 12 + cifra 1)»
  function frase(ch) {
    if (ch === ' ' || ch === '' || ch == null) return 'spazio = nessun foro (la colonna resta intatta)';
    const a = anatomia(ch);
    if (!a) return null;
    return a.carattere + ' = ' + (a.fori.length === 1 ? 'foro ' : 'fori ') + elenco(a.fori.map(String)) + ' (' + spiegazioneFori(a) + ')';
  }
  function spiegazioneFori(a) {
    if (a.zona != null && a.cifra == null) return 'solo la zona ' + a.zona;
    if (a.zona == null && !a.otto) return 'una cifra, un solo foro';
    return [a.zona != null ? 'zona ' + a.zona : null, 'cifra ' + a.cifra, a.otto ? 'foro 8 dei simboli' : null].filter(Boolean).join(' + ');
  }

  /* ---------- il mazzo ---------- */

  // Un programma FORTRAN IV di sei schede: stampa i quadrati dei numeri da 1 a 5.
  // Colonne 1–5 etichetta, 7–72 istruzione, 73–80 numero di sequenza (il compilatore le ignora).
  const MAZZO = [
    { seq: 'QUAD0010', testo: '      DO 10 I = 1, 5' },
    { seq: 'QUAD0020', testo: '      J = I * I' },
    { seq: 'QUAD0030', testo: '   10 WRITE (6,20) I, J' },
    { seq: 'QUAD0040', testo: '   20 FORMAT (1X, I2, 14H AL QUADRATO =, I3)' },
    { seq: 'QUAD0050', testo: '      STOP' },
    { seq: 'QUAD0060', testo: '      END' },
  ];

  // Le 80 colonne di una scheda del mazzo.
  function immagine(scheda) {
    return (scheda.testo + ' '.repeat(72)).slice(0, 72) + (scheda.seq + ' '.repeat(8)).slice(0, 8);
  }

  // Una permutazione casuale di 0..n-1, mai uguale all'ordine di partenza.
  function mescola(n, rnd) {
    const r = typeof rnd === 'function' ? rnd : Math.random;
    for (let tentativo = 0; tentativo < 24; tentativo++) {
      const p = [];
      for (let i = 0; i < n; i++) p.push(i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.min(i, Math.floor(r() * (i + 1)));
        const t = p[i]; p[i] = p[j]; p[j] = t;
      }
      if (p.some((v, i) => v !== i)) return p;
    }
    const p = [];
    for (let i = 0; i < n; i++) p.push(i);
    if (n > 1) { p[0] = 1; p[1] = 0; }
    return p;
  }

  function inOrdine(ordine, mazzo) {
    const m = mazzo || MAZZO;
    for (let k = 1; k < ordine.length; k++) if (m[ordine[k - 1]].seq > m[ordine[k]].seq) return false;
    return true;
  }

  function ordina(ordine, mazzo) {
    const m = mazzo || MAZZO;
    return ordine.slice().sort((a, b) => (m[a].seq < m[b].seq ? -1 : m[a].seq > m[b].seq ? 1 : a - b));
  }

  // Le passate della selezionatrice: una per ogni colonna del numero di sequenza che cambia,
  // dall'ultima a destra verso sinistra. Ogni scheda cade nella casella del suo carattere;
  // raccogliendo le caselle in ordine e ripetendo colonna per colonna, il mazzo torna in sequenza.
  // (La macchina vera faceva due passate per una colonna con le lettere: qui le cifre bastano.)
  function passate(ordine, mazzo) {
    const imm = (mazzo || MAZZO).map(immagine);
    const colonne = [];
    for (let c = 80; c >= 73; c--) {
      if (new Set(imm.map((s) => s[c - 1])).size > 1) colonne.push(c);
    }
    let corrente = ordine.slice();
    return colonne.map((c) => {
      const caselle = {};
      for (const i of corrente) {
        const k = imm[i][c - 1];
        (caselle[k] = caselle[k] || []).push(i);
      }
      corrente = Object.keys(caselle).sort().reduce((acc, k) => acc.concat(caselle[k]), []);
      return { colonna: c, caselle: caselle, ordine: corrente.slice() };
    });
  }

  /* ---------- un piccolo compilatore FORTRAN (simulato) ----------
   * Abbastanza per il mazzo: commenti (C in colonna 1), DO, assegnazioni intere con + - * / e parentesi,
   * WRITE (6,n) con un elenco di variabili, FORMAT con nX, nH… e Iw, STOP, END.
   * I messaggi sono in maiuscolo, come sulle stampanti dell'epoca, ma inventati per la simulazione.
   */

  const NOME = /^[A-Z][A-Z0-9]{0,5}$/;

  function espressione(sorgente) {
    const s = String(sorgente).replace(/ /g, '');
    let i = 0;
    function somma() {
      let n = prodotto();
      while (s[i] === '+' || s[i] === '-') { const op = s[i++]; n = { tipo: 'op', op: op, a: n, b: prodotto() }; }
      return n;
    }
    function prodotto() {
      let n = unario();
      while (s[i] === '*' || s[i] === '/') {
        if (s[i] === '*' && s[i + 1] === '*') throw new Error('POTENZA NON PREVISTA');
        const op = s[i++];
        n = { tipo: 'op', op: op, a: n, b: unario() };
      }
      return n;
    }
    function unario() {
      if (s[i] === '-' || s[i] === '+') { const op = s[i++]; const a = unario(); return op === '-' ? { tipo: 'neg', a: a } : a; }
      return primario();
    }
    function primario() {
      if (s[i] === '(') {
        i++;
        const n = somma();
        if (s[i] !== ')') throw new Error('MANCA UNA PARENTESI CHIUSA');
        i++;
        return n;
      }
      let m = /^\d+/.exec(s.slice(i));
      if (m) { i += m[0].length; return { tipo: 'num', valore: Number(m[0]) }; }
      m = /^[A-Z][A-Z0-9]{0,5}/.exec(s.slice(i));
      if (m) { i += m[0].length; return { tipo: 'var', nome: m[0] }; }
      throw new Error('ESPRESSIONE NON VALIDA');
    }
    if (!s) throw new Error('ESPRESSIONE VUOTA');
    const n = somma();
    if (i !== s.length) throw new Error('ESPRESSIONE NON VALIDA');
    return n;
  }

  // Valore intero di un'espressione; null se usa una variabile che non ha ancora un valore.
  function valuta(nodo, variabili, segna) {
    switch (nodo.tipo) {
      case 'num': return nodo.valore;
      case 'var': {
        if (Object.prototype.hasOwnProperty.call(variabili, nodo.nome) && variabili[nodo.nome] != null) return variabili[nodo.nome];
        if (segna) segna(nodo.nome);
        return null;
      }
      case 'neg': { const a = valuta(nodo.a, variabili, segna); return a == null ? null : -a; }
      case 'op': {
        const a = valuta(nodo.a, variabili, segna);
        const b = valuta(nodo.b, variabili, segna);
        if (a == null || b == null) return null;
        if (nodo.op === '+') return a + b;
        if (nodo.op === '-') return a - b;
        if (nodo.op === '*') return a * b;
        if (b === 0) throw new Error('DIVISIONE PER ZERO');
        return Math.trunc(a / b);
      }
      default: throw new Error('ESPRESSIONE NON VALIDA');
    }
  }

  // Le voci di un FORMAT: nX (spazi), nH seguito da n caratteri di testo, Iw (intero largo w).
  function formato(testo) {
    const inizio = testo.indexOf('(');
    if (inizio < 0) throw new Error('FORMAT SENZA PARENTESI');
    const voci = [];
    let i = inizio + 1;
    for (;;) {
      if (i >= testo.length) throw new Error('MANCA LA PARENTESI CHIUSA');
      const ch = testo[i];
      if (ch === ' ' || ch === ',') { i++; continue; }
      if (ch === ')') break;
      let j = i;
      while (j < testo.length && testo[j] >= '0' && testo[j] <= '9') j++;
      const n = j > i ? Number(testo.slice(i, j)) : null;
      const lettera = testo[j];
      if (lettera === 'X') { voci.push({ tipo: 'X', n: n == null ? 1 : n }); i = j + 1; }
      else if (lettera === 'H') {
        if (!n) throw new Error('CAMPO H SENZA LUNGHEZZA');
        const t = testo.slice(j + 1, j + 1 + n);
        if (t.length < n) throw new Error('CAMPO H TROPPO CORTO');
        voci.push({ tipo: 'H', testo: t });
        i = j + 1 + n;
      } else if (lettera === 'I') {
        let k = j + 1;
        while (k < testo.length && testo[k] >= '0' && testo[k] <= '9') k++;
        if (k === j + 1) throw new Error('CAMPO I SENZA LARGHEZZA');
        const w = Number(testo.slice(j + 1, k));
        for (let r = 0; r < (n || 1); r++) voci.push({ tipo: 'I', w: w });
        i = k;
      } else throw new Error('DESCRITTORE NON PREVISTO');
    }
    return voci;
  }

  function istruzione(testo) {
    const s = testo.replace(/ /g, '');
    if (s === 'STOP') return { tipo: 'stop' };
    if (s === 'END') return { tipo: 'end' };
    let m = /^DO(\d+)([A-Z][A-Z0-9]{0,5})=([^,]+),([^,]+)(?:,([^,]+))?$/.exec(s);
    if (m) {
      return {
        tipo: 'do', fine: Number(m[1]), variabile: m[2],
        da: espressione(m[3]), a: espressione(m[4]), passo: m[5] ? espressione(m[5]) : { tipo: 'num', valore: 1 },
      };
    }
    m = /^WRITE\((\d+),(\d+)\)(.*)$/.exec(s);
    if (m) {
      const lista = m[3] ? m[3].split(',') : [];
      for (const n of lista) if (!NOME.test(n)) throw new Error('ELENCO DI STAMPA NON VALIDO');
      return { tipo: 'write', unita: Number(m[1]), formato: Number(m[2]), lista: lista };
    }
    if (/^FORMAT\(/.test(s)) return { tipo: 'format', voci: formato(testo) };
    m = /^([A-Z][A-Z0-9]{0,5})=(.+)$/.exec(s);
    if (m) return { tipo: 'assegna', variabile: m[1], espressione: espressione(m[2]) };
    throw new Error('ISTRUZIONE SCONOSCIUTA');
  }

  // Una scheda letta: etichetta (colonne 1–5), continuazione (6), istruzione (7–72), sequenza (73–80).
  function leggiScheda(img) {
    const riga = (String(img == null ? '' : img) + ' '.repeat(COLONNE)).slice(0, COLONNE);
    const base = { immagine: riga, seq: riga.slice(72).trim(), etichetta: null, testo: riga.slice(6, 72).trim() };
    if (riga[0] === 'C' || riga[0] === '*') return Object.assign(base, { tipo: 'commento', testo: riga.slice(1, 72).trim() });
    const et = riga.slice(0, 5).trim();
    if (et) {
      if (!/^\d+$/.test(et)) return Object.assign(base, { tipo: 'errore', errore: 'ETICHETTA NON NUMERICA' });
      base.etichetta = Number(et);
    }
    if (riga[5] !== ' ' && riga[5] !== '0') return Object.assign(base, { tipo: 'errore', errore: 'CONTINUAZIONE NON PREVISTA' });
    if (!base.testo) return Object.assign(base, { tipo: 'vuota' });
    try {
      return Object.assign(base, istruzione(riga.slice(6, 72)));
    } catch (err) {
      return Object.assign(base, { tipo: 'errore', errore: err.message });
    }
  }

  const NON_FINALI = ['format', 'stop', 'end', 'do', 'commento', 'vuota', 'errore'];

  // Compila le schede nell'ordine in cui arrivano: il programma finisce alla scheda END.
  function compila(immagini) {
    const schede = immagini.map(leggiScheda);
    const errori = [];
    function errore(i, codice, messaggio, dati) {
      errori.push(Object.assign({ scheda: i, seq: schede[i] ? schede[i].seq : '', codice: codice, messaggio: messaggio }, dati || {}));
    }
    let fine = schede.findIndex((s) => s.tipo === 'end');
    let dopoEnd = 0;
    if (fine < 0) { fine = schede.length - 1; errore(fine, 'senza-end', 'MANCA LA SCHEDA END'); }
    else if (fine < schede.length - 1) {
      dopoEnd = schede.length - 1 - fine;
      errore(fine, 'end', 'END NON IN FONDO AL MAZZO', { dopo: dopoEnd });
    }
    const programma = schede.slice(0, fine + 1);
    programma.forEach((s, i) => { if (s.tipo === 'errore') errore(i, 'sintassi', 'ISTRUZIONE NON VALIDA: ' + s.errore); });
    const etichette = new Map();
    programma.forEach((s, i) => {
      if (s.etichetta == null) return;
      if (etichette.has(s.etichetta)) errore(i, 'etichetta-doppia', 'ETICHETTA ' + s.etichetta + ' USATA DUE VOLTE');
      else etichette.set(s.etichetta, i);
    });
    programma.forEach((s, i) => {
      if (s.tipo === 'do') {
        const j = etichette.get(s.fine);
        if (j == null) errore(i, 'do-manca', 'DO ' + s.fine + ': ISTRUZIONE ' + s.fine + ' NON TROVATA', { etichetta: s.fine });
        else if (j <= i) errore(i, 'do-prima', 'DO ' + s.fine + ': L\'ISTRUZIONE ' + s.fine + ' VIENE PRIMA', { etichetta: s.fine });
        else if (NON_FINALI.indexOf(programma[j].tipo) >= 0) errore(i, 'do-fine', 'DO ' + s.fine + ': ISTRUZIONE FINALE NON VALIDA', { etichetta: s.fine });
        else s.fineIndice = j;
      } else if (s.tipo === 'write') {
        const j = etichette.get(s.formato);
        if (j == null || programma[j].tipo !== 'format') errore(i, 'format-manca', 'FORMAT ' + s.formato + ' NON TROVATO', { etichetta: s.formato });
        else s.formatoIndice = j;
      }
    });
    errori.sort((a, b) => a.scheda - b.scheda);
    return { schede: schede, programma: programma, errori: errori, dopoEnd: dopoEnd };
  }

  // Una riga di stampa: il primo carattere del record comanda la stampante (lo spazio vuol dire
  // «vai a capo e stampa») e non compare sulla carta.
  function stampa(voci, valori) {
    let rec = '';
    let k = 0;
    for (const v of voci) {
      if (v.tipo === 'X') rec += ' '.repeat(v.n);
      else if (v.tipo === 'H') rec += v.testo;
      else if (v.tipo === 'I') {
        if (k >= valori.length) break;
        const x = valori[k++];
        let t;
        if (x == null) t = '?'.repeat(Math.min(3, v.w)).padStart(v.w);
        else {
          t = String(x);
          t = t.length > v.w ? '*'.repeat(v.w) : t.padStart(v.w);
        }
        rec += t;
      }
    }
    return rec.slice(1);
  }

  // Esegue un programma compilato senza errori. Le variabili partono senza valore.
  function esegui(comp, limite) {
    const prog = comp.programma;
    const variabili = {};
    const indefinite = [];
    const segna = (n) => { if (indefinite.indexOf(n) < 0) indefinite.push(n); };
    const righe = [];
    const cicli = [];
    const massimo = limite || 1000;
    let passi = 0;
    let pc = 0;
    let fine = null;
    while (pc < prog.length) {
      if (++passi > massimo) { fine = 'limite'; break; }
      const s = prog[pc];
      if (s.tipo === 'do') {
        const da = valuta(s.da, variabili, segna);
        const a = valuta(s.a, variabili, segna);
        const passo = valuta(s.passo, variabili, segna);
        if (da == null || a == null || passo == null || passo <= 0) { fine = 'do-indefinito'; break; }
        variabili[s.variabile] = da;
        cicli.push({ inizio: pc + 1, fine: s.fineIndice, variabile: s.variabile, a: a, passo: passo });
        pc += 1;
        continue;
      }
      if (s.tipo === 'assegna') variabili[s.variabile] = valuta(s.espressione, variabili, segna);
      else if (s.tipo === 'write') {
        const valori = s.lista.map((n) => {
          const v = Object.prototype.hasOwnProperty.call(variabili, n) ? variabili[n] : null;
          if (v == null) segna(n);
          return v;
        });
        righe.push(stampa(prog[s.formatoIndice].voci, valori));
      } else if (s.tipo === 'stop') { fine = 'stop'; break; }
      else if (s.tipo === 'end') { fine = 'end'; break; }
      let salto = null;
      while (cicli.length && cicli[cicli.length - 1].fine === pc) {
        const c = cicli[cicli.length - 1];
        const v = variabili[c.variabile];
        if (v == null) { fine = 'do-indefinito'; break; }
        variabili[c.variabile] = v + c.passo;
        if (v + c.passo <= c.a) { salto = c.inizio; break; }
        cicli.pop();
      }
      if (fine) break;
      pc = salto != null ? salto : pc + 1;
    }
    return { righe: righe, fine: fine || 'schede-finite', passi: passi, indefinite: indefinite, variabili: variabili };
  }

  let attese = null;
  // Le righe che il mazzo in ordine deve stampare.
  function righeAttese() {
    if (!attese) attese = esegui(compila(MAZZO.map(immagine))).righe;
    return attese.slice();
  }

  // Lettura del mazzo: il tabulato (intestazione, una riga per scheda, esito) e il risultato.
  function leggiMazzo(immagini) {
    const comp = compila(immagini);
    const intestazione = [
      ' LAVORO QUAD          FORTRAN IV (SIMULAZIONE)',
      '',
      '  N.  ' + 'ISTRUZIONE (COLONNE 1-72)'.padEnd(46) + 'SEQUENZA',
    ];
    const schede = comp.schede.map((s, k) => String(k + 1).padStart(4) + '  ' + s.immagine.slice(0, 72).replace(/\s+$/, '').padEnd(46) + s.immagine.slice(72));
    const coda = [{ testo: '', tipo: 'info' }];
    let esecuzione = null;
    let esito;
    if (comp.errori.length) {
      for (const e of comp.errori) coda.push({ testo: ' *** ' + (e.seq || 'SCHEDA ' + (e.scheda + 1)) + '  ' + e.messaggio, tipo: 'errore' });
      coda.push({ testo: ' *** COMPILAZIONE FALLITA: PROGRAMMA NON ESEGUITO', tipo: 'errore' });
      esito = 'errore';
    } else {
      esecuzione = esegui(comp);
      coda.push({ testo: ' COMPILAZIONE SENZA ERRORI', tipo: 'info' }, { testo: '', tipo: 'info' }, { testo: ' USCITA DEL PROGRAMMA', tipo: 'info' });
      if (esecuzione.righe.length) esecuzione.righe.forEach((r) => coda.push({ testo: ' ' + r, tipo: 'uscita' }));
      else coda.push({ testo: ' (NESSUNA RIGA STAMPATA)', tipo: 'avviso' });
      if (esecuzione.indefinite.length) {
        coda.push({ testo: ' *** ATTENZIONE: ' + esecuzione.indefinite.join(', ') + (esecuzione.indefinite.length > 1 ? ' USATE' : ' USATA') + ' SENZA UN VALORE', tipo: 'avviso' });
      }
      if (esecuzione.fine === 'limite') coda.push({ testo: ' *** TEMPO MASSIMO SUPERATO', tipo: 'errore' });
      coda.push({ testo: '', tipo: 'info' }, { testo: ' FINE DEL LAVORO', tipo: 'info' });
      const giuste = righeAttese();
      const uguali = esecuzione.righe.length === giuste.length && esecuzione.righe.every((r, i) => r === giuste[i]);
      esito = uguali && !esecuzione.indefinite.length ? 'ok' : 'diverso';
    }
    return {
      esito: esito,
      errori: comp.errori,
      esecuzione: esecuzione,
      intestazione: intestazione,
      schede: schede,
      coda: coda,
      listato: intestazione.concat(schede, coda.map((r) => r.testo)),
    };
  }

  const Logica = {
    COLONNE: COLONNE, RIGHE: RIGHE, CARTA: CARTA, CAMPI: CAMPI, MAZZO: MAZZO,
    xColonna: xColonna, yRiga: yRiga, campo: campo,
    tasto: tasto, filtra: filtra, anatomia: anatomia, frase: frase,
    immagine: immagine, mescola: mescola, inOrdine: inOrdine, ordina: ordina, passate: passate,
    espressione: espressione, valuta: valuta, formato: formato, leggiScheda: leggiScheda,
    compila: compila, esegui: esegui, stampa: stampa, righeAttese: righeAttese, leggiMazzo: leggiMazzo,
  };

  /* ================= interfaccia ================= */

  const P = 'lab-scheda-perforata-';
  // Riquadro dell'SVG: la scheda (0…737,5 × 0…325) più il margine per le righe a sinistra e la testa in alto.
  const VB = { x: -36, y: -46, l: 737.5 + 36 + 10, a: 325 + 46 + 12 };
  const PASSO = 44;        // distanza verticale tra le schede del mazzo, in px
  const pct = (v, tot) => (v / tot * 100).toFixed(3) + '%';
  const TASTI = '. , ( ) + - * / = $ \' : ; < > % ? ! & # @ " _ |';

  const css = `
.${P}radice { container-type: inline-size; }
.${P}barra { padding-top: 12px; padding-bottom: 12px; }
.${P}modi { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--lab-line); border-radius: 11px; overflow: hidden; background: var(--lab-raised); }
.${P}modo {
  display: inline-flex; align-items: center; gap: 9px; min-height: 42px; padding: 0 16px;
  border: 0; border-right: 1px solid var(--lab-line); background: transparent; color: var(--lab-text);
  font: 700 .93rem var(--font); cursor: pointer;
  transition: background-color var(--pg-dur-veloce) ease, color var(--pg-dur-veloce) ease, box-shadow var(--pg-dur-veloce) ease;
}
.${P}modo:last-child { border-right: 0; }
.${P}modo:hover { color: #fff; }
.${P}modo[aria-selected="true"] { color: #fff; background: color-mix(in srgb, var(--trace-1) 15%, var(--lab-raised)); box-shadow: inset 0 -3px 0 var(--trace-1); }
.${P}modo:focus-visible { outline-offset: -3px; }
.${P}modo-n { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; font: 800 .78rem var(--mono); color: #04150d; background: var(--lab-text); }
.${P}modo[aria-selected="true"] .${P}modo-n { background: var(--trace-1); }
.${P}pannello[hidden] { display: none; }
.${P}radice .pg-btn[aria-disabled="true"] { opacity: .42; cursor: not-allowed; }
.${P}radice .pg-btn[aria-disabled="true"]:hover { color: var(--lab-text); border-color: var(--lab-line); }
.${P}radice .pg-btn--primario[aria-disabled="true"]:hover { color: #04150d; border-color: transparent; filter: none; }

/* tastiera */
.pg-etichetta.${P}tastiera { display: flex; flex: 1 1 320px; min-width: 0; font-weight: 700; font-size: .9rem; color: var(--lab-bright); }
.${P}input { flex: 1 1 auto; min-width: 0; width: 100%; font-size: 1.02rem; letter-spacing: .08em; text-transform: uppercase; }
.${P}input::placeholder { text-transform: none; letter-spacing: 0; color: #5d7d71; font-weight: 500; }
.${P}input[readonly] { opacity: .7; }
.${P}lettura { min-width: 12ch; }

/* la stazione di perforazione */
.${P}banco { padding: 16px 18px 10px; background: linear-gradient(180deg, rgba(255,255,255,.03), transparent 45%), var(--lab-panel); border-bottom: 1px solid var(--lab-line); }
.${P}vetrina { overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain; scrollbar-width: thin; scrollbar-color: var(--lab-line) transparent; padding: 2px 2px 8px; border-radius: 10px; }
.${P}vetrina:focus-visible { outline: 2px solid var(--trace-1); outline-offset: 2px; }
.${P}tavola { position: relative; min-width: 700px; }
.${P}righello { position: relative; height: 54px; }
.${P}banda {
  position: absolute; top: 0; height: 27px; box-sizing: border-box;
  display: flex; align-items: center; justify-content: center; padding: 0 4px;
  border: 1px solid var(--lab-line); border-radius: 6px; background: rgba(255,255,255,.035);
  color: var(--lab-text); font: 700 13px/1 var(--font); white-space: nowrap; overflow: hidden;
  transition: background-color var(--pg-dur-veloce) ease, color var(--pg-dur-veloce) ease, border-color var(--pg-dur-veloce) ease;
}
.${P}banda-continuazione { overflow: visible; padding: 0; }
.${P}banda.${P}attiva { background: color-mix(in srgb, var(--trace-1) 22%, transparent); border-color: var(--trace-1); color: #fff; }
.${P}num { position: absolute; top: 35px; transform: translateX(-50%); font: 600 13px/1 var(--mono); color: #84a094; font-variant-numeric: tabular-nums; }
.${P}lastra { position: relative; }
.${P}svg { display: block; width: 100%; height: auto; cursor: crosshair; -webkit-tap-highlight-color: transparent; }
.${P}righe { position: absolute; top: 0; bottom: 0; left: 0; pointer-events: none; }
.${P}riga { position: absolute; left: 0; right: 0; transform: translateY(-50%); text-align: center; font: 600 13px/1 var(--mono); color: #6f8c80; transition: color var(--pg-dur-veloce) ease; }
.${P}riga.${P}zona { color: var(--trace-2); font-weight: 800; }
.${P}riga.${P}cifra { color: var(--trace-3); font-weight: 800; }
.${P}riga.${P}otto { color: var(--trace-4); font-weight: 800; }

/* la scheda (SVG): cartoncino color crema anche nel tema scuro, è un oggetto */
.${P}sagoma { fill: #f2e6c4; stroke: #c4ae80; stroke-width: 1.1; }
.${P}tinta-numero { fill: rgba(198, 92, 62, .13); }
.${P}tinta-continuazione { fill: rgba(105, 92, 66, .14); }
.${P}tinta-identificazione { fill: rgba(36, 128, 140, .15); }
.${P}sep { stroke: rgba(120, 96, 58, .5); stroke-width: .8; stroke-dasharray: 3 2.4; }
.${P}cifre { font: 600 7.3px var(--mono); fill: #8c7a55; text-anchor: middle; }
.${P}numcol { font: 500 4.1px var(--mono); fill: #a08e64; text-anchor: middle; }
.${P}stampato { font: 700 10.6px var(--mono); fill: #1d1912; text-anchor: middle; }
.${P}foro { fill: #0d1613; }
.${P}evid-col { fill: rgba(62, 224, 143, .1); }
.${P}evid-ombra { fill: none; stroke: #0b1210; stroke-width: 3.6; opacity: .8; }
.${P}evid { fill: none; stroke-width: 1.9; }
.${P}evid.${P}zona { stroke: var(--trace-2); }
.${P}evid.${P}cifra { stroke: var(--trace-3); }
.${P}evid.${P}otto { stroke: var(--trace-4); }
.${P}guida { fill: rgba(62, 224, 143, .09); stroke: rgba(62, 224, 143, .55); stroke-width: 1; }
.${P}punzone { fill: rgba(11, 18, 16, .16); stroke: rgba(62, 224, 143, .36); stroke-width: .7; transform-box: fill-box; transform-origin: center; }
.${P}punzone[data-ruolo="zona"] { --c: var(--trace-2); }
.${P}punzone[data-ruolo="cifra"] { --c: var(--trace-3); }
.${P}punzone[data-ruolo="otto"] { --c: var(--trace-4); }
.${P}battuta { animation: ${P}battuta 210ms var(--pg-ease-sharp); }
@keyframes ${P}battuta { 0% { fill: var(--c); stroke: var(--c); transform: scale(1.3); } 55% { fill: var(--c); stroke: var(--c); transform: scale(.82); } 100% { transform: none; } }
.${P}testa { fill: #15211d; stroke: var(--trace-1); stroke-width: 1.3; }
.${P}spia { fill: #23392f; }
.${P}spia.${P}accesa { animation: ${P}spia 280ms ease-out; }
@keyframes ${P}spia { 0% { fill: var(--trace-1); } 100% { fill: #23392f; } }
.${P}coriandolo { fill: #efdfb8; stroke: #c1aa79; stroke-width: .5; transform-box: fill-box; transform-origin: center; animation: ${P}cade 560ms cubic-bezier(.5, 0, .9, .45) forwards; }
@keyframes ${P}cade { 0% { transform: none; opacity: 1; } 100% { transform: translate(var(--dx), 30px) rotate(var(--rot)) scale(.55); opacity: 0; } }
.${P}nuovo { transform-box: fill-box; transform-origin: center; animation: ${P}stampa 210ms ease-out; }
@keyframes ${P}stampa { from { opacity: 0; transform: translateY(-3px) scale(1.3); } }
.${P}tappa { animation: ${P}tappa 320ms ease forwards; }
@keyframes ${P}tappa { to { opacity: 0; } }

/* lente e spiegazione */
.${P}dettaglio { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 14px 20px; padding: 16px 18px 18px; align-items: start; }
.${P}lente { display: grid; justify-items: center; gap: 8px; padding: 10px 12px 12px; border-radius: 12px; background: var(--lab-panel); border: 1px solid var(--lab-line); }
.${P}lente-testa { display: grid; justify-items: center; gap: 4px; }
.${P}lente-car { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 8px; background: #f2e6c4; color: #1d1912; font: 800 28px/1 var(--mono); box-shadow: inset 0 0 0 1px #c4ae80; }
.${P}lente-col { font: 600 13px/1.2 var(--mono); color: var(--lab-text); white-space: nowrap; }
.${P}lente-righe { list-style: none; margin: 0; padding: 0; display: grid; gap: 3px; }
.${P}lente-riga { display: grid; grid-template-columns: 22px 18px; align-items: center; gap: 7px; }
.${P}lente-n { font: 600 13px/1 var(--mono); color: #6f8c80; text-align: right; transition: color var(--pg-dur-veloce) ease; }
.${P}lente-foro { display: grid; place-items: center; width: 18px; height: 16px; border-radius: 2px; background: #f2e6c4; color: #a08e64; font: 600 10px/1 var(--mono); transition: background-color var(--pg-dur-veloce) ease, box-shadow var(--pg-dur-veloce) ease; }
.${P}lente-riga.${P}zona .${P}lente-n { color: var(--trace-2); font-weight: 800; }
.${P}lente-riga.${P}cifra .${P}lente-n { color: var(--trace-3); font-weight: 800; }
.${P}lente-riga.${P}otto .${P}lente-n { color: var(--trace-4); font-weight: 800; }
.${P}lente-riga.${P}zona .${P}lente-foro, .${P}lente-riga.${P}cifra .${P}lente-foro, .${P}lente-riga.${P}otto .${P}lente-foro { background: #0b1210; color: transparent; }
.${P}lente-riga.${P}zona .${P}lente-foro { box-shadow: 0 0 0 2px var(--trace-2); }
.${P}lente-riga.${P}cifra .${P}lente-foro { box-shadow: 0 0 0 2px var(--trace-3); }
.${P}lente-riga.${P}otto .${P}lente-foro { box-shadow: 0 0 0 2px var(--trace-4); }
.${P}testo { min-width: 0; }
.${P}spiega { font-size: .98rem; line-height: 1.6; min-height: 7.5em; }
.${P}spiega p { margin: 0 0 .55em; }
.${P}principale { font-size: 1.08rem; color: var(--lab-bright); }
.${P}car { display: inline-grid; place-items: center; min-width: 1.75em; height: 1.75em; padding: 0 4px; margin-right: 2px; border-radius: 6px; background: #f2e6c4; color: #1d1912; font: 800 1rem/1 var(--mono); vertical-align: middle; }
.${P}n { font-family: var(--mono); font-weight: 800; padding: 0 3px; border-radius: 4px; }
.${P}n.${P}zona { color: var(--trace-2); background: rgba(255, 192, 77, .13); }
.${P}n.${P}cifra { color: var(--trace-3); background: rgba(92, 200, 255, .13); }
.${P}n.${P}otto { color: var(--trace-4); background: rgba(255, 122, 168, .13); }
.${P}info { color: var(--lab-text); }
.${P}avviso { color: #ffd38a; }
.${P}occhiolino { color: var(--lab-text); font-style: italic; }
.${P}legenda { display: flex; flex-wrap: wrap; gap: 8px 16px; margin: 12px 0 0; font-size: 13px; color: var(--lab-text); }
.${P}chip { display: inline-flex; align-items: center; gap: 7px; }
.${P}chip::before { content: ""; width: 11px; height: 11px; border-radius: 2px; background: #0b1210; box-shadow: 0 0 0 2px var(--c); }
.${P}chip.${P}zona { --c: var(--trace-2); }
.${P}chip.${P}cifra { --c: var(--trace-3); }
.${P}chip.${P}otto { --c: var(--trace-4); }

/* il mazzo */
.${P}sala { display: grid; gap: 16px; padding: 16px 18px 18px; }
.${P}area { position: relative; height: 300px; overflow: hidden; border-radius: 12px; background: radial-gradient(ellipse at 50% 115%, rgba(62, 224, 143, .08), transparent 62%), var(--lab-panel); border: 1px solid var(--lab-line); }
.${P}mazzo { list-style: none; margin: 0; padding: 0; position: absolute; top: 12px; left: 12px; right: 12px; height: 0; }
.${P}carta { position: absolute; top: 0; left: 0; right: 0; height: 52px; will-change: transform; filter: drop-shadow(0 3px 4px rgba(0, 0, 0, .5)); }
.${P}faccia {
  position: relative; height: 100%; box-sizing: border-box; display: flex; align-items: flex-start; gap: 10px;
  padding: 8px 10px 0 16px; background: linear-gradient(180deg, #f5ebcf, #ebddb8); color: #1d1912;
  clip-path: polygon(11px 0, 100% 0, 100% 100%, 0 100%, 0 16px); border-radius: 0 3px 3px 3px;
  font: 700 13px/1.3 var(--mono);
}
.${P}faccia::after { content: ""; position: absolute; left: 16px; right: 10px; top: 30px; bottom: 4px; background-image: radial-gradient(circle, rgba(140, 122, 85, .4) .9px, transparent 1.3px); background-size: 8px 7px; pointer-events: none; }
.${P}carta-testo { flex: 1 1 auto; min-width: 0; white-space: pre; overflow: hidden; text-overflow: ellipsis; }
.${P}carta-seq { flex: none; padding: 1px 6px; border-radius: 3px; background: rgba(36, 128, 140, .18); color: #17474e; }
.${P}c79 { border-radius: 2px; transition: background-color var(--pg-dur-veloce) ease, color var(--pg-dur-veloce) ease, box-shadow var(--pg-dur-veloce) ease; }
.${P}legge .${P}c79 { background: var(--trace-1); color: #04150d; box-shadow: 0 0 0 2px rgba(62, 224, 143, .35); }
.${P}segno { position: absolute; top: 0; height: ${PASSO}px; pointer-events: none; z-index: 1; }
.${P}segno svg { display: block; width: 100%; height: 100%; overflow: visible; }
.${P}segno line { stroke: #c43a2a; stroke-width: 4.5px; stroke-linecap: round; opacity: .88; }
.${P}selez { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px 12px; align-items: end; margin-top: 12px; }
.${P}selez-nome { display: grid; font: 700 13px/1.35 var(--font); color: var(--lab-bright); }
.${P}selez-nome small { font: 600 13px/1.35 var(--mono); color: var(--lab-text); }
.${P}caselle { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 4px; }
.${P}casella {
  height: 46px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 3px; padding-bottom: 4px; box-sizing: border-box;
  border: 1px solid var(--lab-line); border-top: 0; border-radius: 0 0 7px 7px; background: rgba(255, 255, 255, .02);
  font: 700 13px/1 var(--mono); color: var(--lab-text);
  transition: border-color var(--pg-dur-veloce) ease, background-color var(--pg-dur-veloce) ease, color var(--pg-dur-veloce) ease;
}
.${P}casella-pila { width: 70%; height: 24px; transform-origin: 50% 100%; transform: scaleY(calc(var(--n, 0) / 6)); background: repeating-linear-gradient(0deg, #f2e6c4 0 3px, rgba(0, 0, 0, .45) 3px 4px); border-radius: 1px; transition: transform var(--pg-dur-veloce) ease; }
.${P}casella.${P}accesa { border-color: var(--trace-1); background: color-mix(in srgb, var(--trace-1) 15%, transparent); color: #fff; }

/* lettore e tabulato */
.${P}uscita { display: grid; gap: 10px; min-width: 0; align-content: start; }
.${P}lettore { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--lab-line); border-radius: 12px; background: var(--lab-raised); }
.${P}lettore-svg { width: 74px; height: 46px; flex: none; overflow: visible; }
.${P}lettore-nome { margin: 0; font: 700 .92rem/1.3 var(--font); color: var(--lab-bright); }
.${P}lettore-stato { font: 600 13px/1.4 var(--mono); color: var(--trace-2); }
.${P}ls-corpo { fill: #1c2a25; stroke: #3d554c; stroke-width: 1.2; }
.${P}ls-tramoggia { fill: #101a17; stroke: #3d554c; stroke-width: 1.2; }
.${P}ls-scheda { fill: #f2e6c4; stroke: #c4ae80; stroke-width: .8; }
.${P}ls-spia { fill: #23392f; }
.${P}ls-freccia, .${P}ls-carta { fill: none; stroke: var(--lab-text); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.${P}ls-stampante { fill: #1c2a25; stroke: #3d554c; stroke-width: 1.2; }
.${P}in-lettura .${P}ls-scheda { animation: ${P}ingoia 420ms linear infinite; }
@keyframes ${P}ingoia { from { transform: translateY(-5px); opacity: 1; } to { transform: translateY(9px); opacity: 0; } }
.${P}in-lettura .${P}ls-spia { fill: var(--trace-1); }
.${P}foglio {
  position: relative; min-height: 230px; max-height: 360px; overflow: auto; box-sizing: border-box; border-radius: 4px; padding: 10px 30px;
  background-color: #fbfbf2;
  background-image:
    radial-gradient(circle at 12px 10px, var(--lab-bg) 3.4px, transparent 4px),
    radial-gradient(circle at calc(100% - 12px) 10px, var(--lab-bg) 3.4px, transparent 4px),
    repeating-linear-gradient(180deg, transparent 0 40px, rgba(118, 186, 120, .24) 40px 80px);
  background-size: 100% 20px, 100% 20px, 100% 80px;
  background-position: 0 0, 0 0, 0 10px;
  background-attachment: local, local, local;
  color: #22261f; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .15);
  scrollbar-width: thin;
}
.${P}foglio:focus-visible { outline: 2px solid var(--trace-1); outline-offset: 2px; }
.${P}tabulato { font: 500 13px/20px var(--mono); white-space: pre; min-width: max-content; }
.${P}tabulato:empty { display: none; }
.${P}riga-errore { color: #a3241a; font-weight: 800; }
.${P}riga-uscita { color: #0f4a31; font-weight: 800; }
.${P}riga-avviso { color: #8a4600; font-weight: 800; }
.${P}riga-nuova { animation: ${P}riga 170ms var(--pg-ease-smooth); }
@keyframes ${P}riga { from { opacity: 0; transform: translateY(5px); } }
.${P}vuoto { margin: 0; padding: 74px 6px; text-align: center; font: italic 1rem/1.5 var(--pg-serif, Georgia, serif); color: #646b5b; }

@container (min-width: 760px) {
  .${P}sala { grid-template-columns: minmax(0, 1.12fr) minmax(0, 1fr); align-items: start; }
}
@container (max-width: 560px) {
  .${P}banco { padding: 12px 10px 8px; }
  .${P}dettaglio { padding: 14px 12px 16px; gap: 12px 14px; }
  .${P}sala { padding: 12px; }
  .${P}selez { grid-template-columns: minmax(0, 1fr); }
  .${P}modo { padding: 0 12px; }
  .${P}foglio { padding: 10px 26px; }
}
@media (prefers-reduced-motion: reduce) {
  .${P}coriandolo { display: none; }
  .${P}nuovo, .${P}tappa, .${P}battuta, .${P}riga-nuova, .${P}spia.${P}accesa, .${P}in-lettura .${P}ls-scheda { animation: none !important; }
  .${P}banda, .${P}riga, .${P}casella, .${P}casella-pila, .${P}c79, .${P}modo, .${P}lente-n, .${P}lente-foro { transition: none !important; }
}
`;

  function monta(el, ctx) {
    const h = ctx.h;
    const s = ctx.s;
    if (!Hol) {
      el.append(h('div', { class: 'pg-stato pg-stato--errore', role: 'alert' }, h('p', null, 'Manca il codice delle schede perforate: ricarica la pagina per riprovare.')));
      return {};
    }
    const id = ctx.uid('perfora');
    const radice = h('div', { class: P + 'radice' });
    el.append(radice);

    /* ---------- le due parti del laboratorio ---------- */

    const DATI_TAB = [
      { id: id + '-t1', pannello: id + '-p1', n: '1', testo: 'Perfora una scheda' },
      { id: id + '-t2', pannello: id + '-p2', n: '2', testo: 'Il mazzo' },
    ];
    const tabs = DATI_TAB.map((t, i) => h('button', {
      type: 'button', role: 'tab', id: t.id, class: P + 'modo', 'aria-controls': t.pannello,
      'aria-selected': i === 0 ? 'true' : 'false', tabindex: i === 0 ? '0' : '-1',
      onclick: () => scegli(i, false), onkeydown: tastiTab,
    }, h('span', { class: P + 'modo-n', 'aria-hidden': 'true' }, t.n), t.testo));
    const barraModi = h('div', { class: 'pg-strumenti ' + P + 'barra' },
      h('div', { class: P + 'modi', role: 'tablist', 'aria-label': 'Parti del laboratorio' }, tabs));

    /* ---------- parte 1: la perforatrice ---------- */

    const input = h('input', {
      id: id + '-in', class: 'pg-campo ' + P + 'input', type: 'text', maxlength: String(COLONNE),
      autocomplete: 'off', autocapitalize: 'characters', autocorrect: 'off', spellcheck: 'false',
      enterkeyhint: 'done', placeholder: 'Scrivi qui: ogni tasto perfora una colonna', 'aria-describedby': id + '-sp',
    });
    const lettura = h('span', { class: 'pg-lettura ' + P + 'lettura', 'aria-hidden': 'true' }, 'Colonna 1 di 80');
    const bEsempio = h('button', { type: 'button', class: 'pg-btn', onclick: () => esempio() }, 'Perfora un esempio');
    const bNuova = h('button', { type: 'button', class: 'pg-btn', onclick: () => nuovaScheda(true) }, 'Nuova scheda');
    const barra1 = h('div', { class: 'pg-strumenti' },
      h('label', { class: 'pg-etichetta ' + P + 'tastiera', for: input.id }, h('span', null, 'Tastiera'), input),
      lettura, bEsempio, bNuova);

    // La scheda in SVG.
    const svg = s('svg', { class: P + 'svg', viewBox: VB.x + ' ' + VB.y + ' ' + VB.l + ' ' + VB.a, 'aria-hidden': 'true', focusable: 'false' });
    const idOmbra = ctx.uid('ombra');
    svg.append(s('defs', null, s('filter', { id: idOmbra, x: '-4%', y: '-6%', width: '108%', height: '124%' },
      s('feDropShadow', { dx: '0', dy: '6', stdDeviation: '5', 'flood-color': '#000', 'flood-opacity': '0.55' }))));
    const gCarta = s('g', { class: P + 'carta-svg' });
    gCarta.append(s('path', { class: P + 'sagoma', filter: 'url(#' + idOmbra + ')', d: 'M 17 0 H 733.5 Q 737.5 0 737.5 4 V 321 Q 737.5 325 733.5 325 H 4 Q 0 325 0 321 V 30 Z' }));
    for (const f of [CAMPI[0], CAMPI[1], CAMPI[3]]) {
      gCarta.append(s('rect', { class: P + 'tinta-' + f.id, x: (xColonna(f.da) - 4.35).toFixed(2), y: 0.6, width: ((f.a - f.da + 1) * CARTA.passoX).toFixed(2), height: 323.8 }));
    }
    for (const c of [6, 7, 73]) {
      const x = (xColonna(c) - 4.35).toFixed(2);
      gCarta.append(s('line', { class: P + 'sep', x1: x, y1: 2, x2: x, y2: 323 }));
    }
    const xs = [];
    for (let c = 1; c <= COLONNE; c++) xs.push(xColonna(c).toFixed(2));
    for (let r = 0; r <= 9; r++) gCarta.append(s('text', { class: P + 'cifre', x: xs.join(' '), y: (yRiga(r) + 2.6).toFixed(2) }, String(r).repeat(COLONNE)));
    gCarta.append(numeriColonne(yRiga(0) + 10.4), numeriColonne(yRiga(9) + 11.6));
    const gFori = s('g');
    const gEvid = s('g');
    const gStampa = s('g');
    const gCoriandoli = s('g');
    gCarta.append(gFori, gEvid, gStampa, gCoriandoli);

    const gCarrello = s('g', { class: P + 'carrello' });
    const punzoni = {};
    gCarrello.append(s('rect', { class: P + 'guida', x: -6.5, y: -4, width: 13, height: 333, rx: 3.2 }));
    for (const r of RIGHE) {
      punzoni[r] = s('rect', { class: P + 'punzone', x: -3.7, y: (yRiga(r) - 7.3).toFixed(2), width: 7.4, height: 14.6, rx: 1.4 });
      gCarrello.append(punzoni[r]);
    }
    const spia = s('circle', { class: P + 'spia', cx: 0, cy: -31, r: 3.4 });
    gCarrello.append(s('path', { class: P + 'testa', d: 'M -15 -42 H 15 Q 18 -42 18 -39 V -21 L 0 -8 L -18 -21 V -39 Q -18 -42 -15 -42 Z' }), spia);
    svg.append(gCarta, gCarrello);

    function numeriColonne(y) {
      let testo = '';
      const pos = [];
      for (let c = 1; c <= COLONNE; c++) {
        const t = String(c);
        const x = xColonna(c);
        testo += t;
        if (t.length === 1) pos.push(x.toFixed(2));
        else pos.push((x - 1.25).toFixed(2), (x + 1.25).toFixed(2));
      }
      return s('text', { class: P + 'numcol', x: pos.join(' '), y: y.toFixed(2) }, testo);
    }

    // Righello sopra la scheda (campi FORTRAN e numeri di colonna) ed etichette delle righe: in HTML,
    // così restano leggibili anche quando la scheda si rimpicciolisce.
    const righello = h('div', { class: P + 'righello', 'aria-hidden': 'true' });
    const bande = {};
    for (const f of CAMPI) {
      const x0 = xColonna(f.da) - CARTA.passoX / 2 - VB.x;
      const b = h('span', { class: P + 'banda ' + P + 'banda-' + f.id, style: 'left:' + pct(x0, VB.l) + ';width:' + pct((f.a - f.da + 1) * CARTA.passoX, VB.l) }, f.etichetta);
      bande[f.id] = b;
      righello.append(b);
    }
    for (const c of [1, 10, 20, 30, 40, 50, 60, 70, 80]) righello.append(h('span', { class: P + 'num', style: 'left:' + pct(xColonna(c) - VB.x, VB.l) }, String(c)));
    const etichetteRighe = {};
    const colonnaRighe = h('div', { class: P + 'righe', 'aria-hidden': 'true', style: 'width:' + pct(30, VB.l) },
      RIGHE.map((r) => { const e = h('span', { class: P + 'riga', style: 'top:' + pct(yRiga(r) - VB.y, VB.a) }, String(r)); etichetteRighe[r] = e; return e; }));
    const lastra = h('div', { class: P + 'lastra' }, svg, colonnaRighe);
    const tavola = h('div', { class: P + 'tavola' }, righello, lastra);
    const vetrina = h('div', { class: P + 'vetrina', tabindex: '0', role: 'img', 'aria-label': 'Scheda perforata vuota' }, tavola);
    const banco = h('div', { class: P + 'banco' }, vetrina);

    // La lente: la colonna ingrandita, con le righe 12, 11, 0…9.
    const lenteCar = h('span', { class: P + 'lente-car' }, ' ');
    const lenteCol = h('span', { class: P + 'lente-col' }, 'colonna –');
    const lenteCelle = {};
    const lente = h('div', { class: P + 'lente', 'aria-hidden': 'true' },
      h('div', { class: P + 'lente-testa' }, lenteCar, lenteCol),
      h('ol', { class: P + 'lente-righe' }, RIGHE.map((r) => {
        const li = h('li', { class: P + 'lente-riga' }, h('span', { class: P + 'lente-n' }, String(r)), h('span', { class: P + 'lente-foro' }, r >= 0 && r <= 9 ? String(r) : ''));
        lenteCelle[r] = li;
        return li;
      })));
    const spiega1 = h('div', { class: P + 'spiega', id: id + '-sp', 'aria-live': 'polite' });
    const legenda = h('p', { class: P + 'legenda', 'aria-hidden': 'true' },
      h('span', { class: P + 'chip ' + P + 'zona' }, 'zona: 12, 11 o 0'),
      h('span', { class: P + 'chip ' + P + 'cifra' }, 'cifra: da 0 a 9'),
      h('span', { class: P + 'chip ' + P + 'otto' }, 'foro 8 dei simboli'));
    const dettaglio = h('div', { class: P + 'dettaglio' }, lente, h('div', { class: P + 'testo' }, spiega1, legenda));
    const pannello1 = h('div', { role: 'tabpanel', id: DATI_TAB[0].pannello, 'aria-labelledby': DATI_TAB[0].id, class: P + 'pannello' }, barra1, banco, dettaglio);

    /* ---------- parte 2: il mazzo ---------- */

    const bCadi = h('button', { type: 'button', class: 'pg-btn', onclick: () => cadi() }, 'Lascia cadere il mazzo');
    const bRiordina = h('button', { type: 'button', class: 'pg-btn', onclick: () => riordina() }, 'Riordina con i numeri di sequenza');
    const bLeggi = h('button', { type: 'button', class: 'pg-btn pg-btn--primario', onclick: () => leggi() }, 'Leggi il mazzo');
    const barra2 = h('div', { class: 'pg-strumenti' }, bLeggi, bCadi, bRiordina);

    const listaMazzo = h('ol', { class: P + 'mazzo', 'aria-label': 'Il mazzo, dalla prima all\'ultima scheda' });
    const carte = MAZZO.map((sc, i) => {
      const seq = h('span', { class: P + 'carta-seq' }, sc.seq.slice(0, 6), h('span', { class: P + 'c79' }, sc.seq.charAt(6)), sc.seq.slice(7));
      const segno = h('span', { class: P + 'segno', 'aria-hidden': 'true', style: 'left:calc(40% + ' + (i * 40 / MAZZO.length).toFixed(3) + '%);width:' + (40 / MAZZO.length).toFixed(3) + '%' },
        s('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none', focusable: 'false' },
          s('line', { x1: 0, y1: 0, x2: 100, y2: 100, 'vector-effect': 'non-scaling-stroke' })));
      const faccia = h('div', { class: P + 'faccia' }, h('span', { class: P + 'carta-testo' }, sc.testo), seq, segno);
      const li = h('li', { class: P + 'carta' }, faccia);
      listaMazzo.append(li);
      return { el: li, i: i, x: 0, y: 0, r: 0, o: 1 };
    });
    const area = h('div', { class: P + 'area' }, listaMazzo);
    const caselle = {};
    const listaCaselle = h('ol', { class: P + 'caselle' }, '0123456789'.split('').map((d) => {
      const pila = h('span', { class: P + 'casella-pila' });
      const li = h('li', { class: P + 'casella' }, pila, h('b', null, d));
      caselle[d] = { el: li, pila: pila };
      return li;
    }));
    const selez = h('div', { class: P + 'selez', 'aria-hidden': 'true' },
      h('span', { class: P + 'selez-nome' }, 'Selezionatrice', h('small', null, 'colonna 79')), listaCaselle);

    const statoLettore = h('span', { class: P + 'lettore-stato' }, 'Pronto');
    const lettoreSvg = s('svg', { class: P + 'lettore-svg', viewBox: '0 0 74 46', 'aria-hidden': 'true', focusable: 'false' },
      s('rect', { class: P + 'ls-corpo', x: 2, y: 16, width: 42, height: 27, rx: 4 }),
      s('rect', { class: P + 'ls-scheda', x: 12, y: 4, width: 22, height: 8, rx: 1 }),
      s('rect', { class: P + 'ls-tramoggia', x: 9, y: 9, width: 28, height: 9, rx: 1.5 }),
      s('circle', { class: P + 'ls-spia', cx: 36, cy: 31, r: 2.6 }),
      s('path', { class: P + 'ls-freccia', d: 'M 48 30 H 57 M 54 27 L 57 30 L 54 33' }),
      s('rect', { class: P + 'ls-stampante', x: 60, y: 20, width: 12, height: 23, rx: 2 }),
      s('path', { class: P + 'ls-carta', d: 'M 62.5 20 V 8 H 69.5 V 20 M 64 12 H 68 M 64 15 H 68' }));
    const lettore = h('div', { class: P + 'lettore' }, lettoreSvg,
      h('div', null, h('p', { class: P + 'lettore-nome' }, 'Lettore di schede e stampante'), statoLettore));
    const tabulato = h('div', { class: P + 'tabulato' });
    const vuoto = h('p', { class: P + 'vuoto' }, 'Qui uscirà il tabulato. Premi «Leggi il mazzo».');
    const foglio = h('div', { class: P + 'foglio', tabindex: '0', role: 'region', 'aria-label': 'Tabulato della stampante' }, vuoto, tabulato);
    const sala = h('div', { class: P + 'sala' },
      h('div', { class: P + 'colonna-mazzo' }, area, selez),
      h('div', { class: P + 'uscita' }, lettore, foglio));
    const spiega2 = h('div', { class: 'pg-spiega', 'aria-live': 'polite' });
    const pannello2 = h('div', { role: 'tabpanel', id: DATI_TAB[1].pannello, 'aria-labelledby': DATI_TAB[1].id, class: P + 'pannello', hidden: true }, barra2, sala, spiega2);
    const pannelli = [pannello1, pannello2];

    radice.append(barraModi, pannello1, pannello2);

    function scegli(i, conFuoco) {
      tabs.forEach((t, k) => {
        t.setAttribute('aria-selected', k === i ? 'true' : 'false');
        t.tabIndex = k === i ? 0 : -1;
      });
      pannelli.forEach((p, k) => { p.hidden = k !== i; });
      if (conFuoco) tabs[i].focus();
      if (i === 0) seguiCarrello(Math.min(st.testo.length + 1, COLONNE), true);
    }
    function tastiTab(e) {
      const i = tabs.indexOf(e.currentTarget);
      let j = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = tabs.length - 1;
      if (j == null) return;
      e.preventDefault();
      scegli(j, true);
    }

    /* ---------- perforare ---------- */

    const st = { testo: '', pieno: false, auto: 0, cambio: false, notaMaiuscole: false };
    const colonneFori = [];
    const testiStampa = [];
    let carX = xColonna(1);
    let carMeta = carX;
    let fermaCarrello = null;

    function disegnaCarrello() { gCarrello.setAttribute('transform', 'translate(' + carX.toFixed(2) + ' 0)'); }

    // Il carrello insegue la colonna di destinazione con un moto smorzato: si ferma appena arriva.
    function muoviCarrello(col, subito) {
      carMeta = xColonna(col);
      for (const f of CAMPI) bande[f.id].classList.toggle(P + 'attiva', col >= f.da && col <= f.a);
      seguiCarrello(col, subito);
      if (subito || ctx.riduci) {
        carX = carMeta;
        disegnaCarrello();
        if (fermaCarrello) { fermaCarrello(); fermaCarrello = null; }
        return;
      }
      if (fermaCarrello) return;
      fermaCarrello = ctx.ciclo((dt) => {
        carX += (carMeta - carX) * (1 - Math.exp(-dt / 60));
        if (Math.abs(carMeta - carX) < 0.04) {
          carX = carMeta;
          fermaCarrello();
          fermaCarrello = null;
        }
        disegnaCarrello();
      });
    }

    // Sugli schermi stretti la scheda scorre dentro la sua vetrina: tiene in vista il carrello.
    function seguiCarrello(col, subito) {
      if (pannello1.hidden || vetrina.scrollWidth <= vetrina.clientWidth + 1) return;
      const x = (xColonna(col) - VB.x) * tavola.clientWidth / VB.l;
      const margine = Math.min(90, vetrina.clientWidth * 0.25);
      let meta = null;
      if (x < vetrina.scrollLeft + margine) meta = x - margine;
      else if (x > vetrina.scrollLeft + vetrina.clientWidth - margine) meta = x - vetrina.clientWidth + margine;
      if (meta == null) return;
      vetrina.scrollTo({ left: Math.max(0, meta), behavior: subito || ctx.riduci ? 'auto' : 'smooth' });
    }

    function perfora(col, ch, anima) {
      const a = ch === ' ' ? null : anatomia(ch);
      const g = s('g');
      if (a) {
        for (const r of a.fori) {
          g.append(s('rect', { class: P + 'foro', x: (xColonna(col) - CARTA.foroL / 2).toFixed(2), y: (yRiga(r) - CARTA.foroA / 2).toFixed(2), width: CARTA.foroL, height: CARTA.foroA, rx: 0.8 }));
        }
      }
      gFori.append(g);
      colonneFori[col] = g;
      if (ch !== ' ') {
        const t = s('text', { class: P + 'stampato' + (anima && !ctx.riduci ? ' ' + P + 'nuovo' : ''), x: xColonna(col).toFixed(2), y: 13.6 }, ch);
        gStampa.append(t);
        testiStampa[col] = t;
      }
      if (anima && !ctx.riduci) {
        accendi(spia, P + 'accesa');
        if (a) {
          for (const r of a.fori) {
            punzoni[r].setAttribute('data-ruolo', a.ruoli[r]);
            accendi(punzoni[r], P + 'battuta');
            coriandolo(col, r);
          }
        }
      }
    }

    // Riavvia un'animazione CSS di un elemento (la classe va tolta, il layout ricalcolato, la classe rimessa).
    function accendi(nodo, classe) {
      nodo.classList.remove(classe);
      void nodo.getBoundingClientRect();
      nodo.classList.add(classe);
    }

    // Il «coriandolo»: il pezzetto di cartoncino che il punzone spinge fuori dal foro.
    function coriandolo(col, r) {
      const dx = (Math.random() * 8 - 4).toFixed(1);
      const rot = Math.round(Math.random() * 280 - 140);
      const c = s('rect', {
        class: P + 'coriandolo', x: (xColonna(col) - CARTA.foroL / 2).toFixed(2), y: (yRiga(r) - CARTA.foroA / 2).toFixed(2),
        width: CARTA.foroL, height: CARTA.foroA, rx: 0.8, style: '--dx:' + dx + 'px;--rot:' + rot + 'deg',
      });
      gCoriandoli.append(c);
      const via = () => c.remove();
      c.addEventListener('animationend', via, { once: true });
      setTimeout(via, 1600);
    }

    function sperfora(col, anima) {
      const nodi = [colonneFori[col], testiStampa[col]];
      colonneFori[col] = null;
      testiStampa[col] = null;
      for (const n of nodi) {
        if (!n) continue;
        if (anima && !ctx.riduci) {
          n.classList.add(P + 'tappa');
          setTimeout(() => n.remove(), 360);
        } else n.remove();
      }
    }

    // La lente, le etichette delle righe e il riquadro sulla scheda mostrano una colonna.
    function mostraColonna(col) {
      const ch = col ? (st.testo[col - 1] || ' ') : null;
      const a = ch && ch !== ' ' ? anatomia(ch) : null;
      lenteCar.textContent = ch && ch !== ' ' ? ch : ' ';
      lenteCol.textContent = col ? 'colonna ' + col : 'colonna –';
      for (const r of RIGHE) {
        const ruolo = a && a.ruoli[r] ? P + a.ruoli[r] : '';
        lenteCelle[r].className = P + 'lente-riga' + (ruolo ? ' ' + ruolo : '');
        etichetteRighe[r].className = P + 'riga' + (ruolo ? ' ' + ruolo : '');
      }
      gEvid.replaceChildren();
      if (!col) return;
      gEvid.append(s('rect', { class: P + 'evid-col', x: (xColonna(col) - CARTA.passoX / 2).toFixed(2), y: 0.6, width: CARTA.passoX, height: 323.8 }));
      if (!a) return;
      for (const r of a.fori) {
        const attr = { x: (xColonna(col) - 3.9).toFixed(2), y: (yRiga(r) - 7.4).toFixed(2), width: 7.8, height: 14.8, rx: 1.6 };
        gEvid.append(s('rect', Object.assign({ class: P + 'evid-ombra' }, attr)), s('rect', Object.assign({ class: P + 'evid ' + P + a.ruoli[r] }, attr)));
      }
    }

    function intervallo(f) { return f.da === f.a ? '' : ' (colonne ' + f.da + '–' + f.a + ')'; }

    // «A = fori 12 e 1 (zona 12 + cifra 1)» con i numeri colorati come sulla lente.
    function nodiCodice(ch) {
      const a = anatomia(ch);
      const out = [h('span', { class: P + 'car' }, ch), ' = ', a.fori.length === 1 ? 'foro ' : 'fori '];
      a.fori.forEach((r, k) => {
        if (k > 0) out.push(k === a.fori.length - 1 ? ' e ' : ', ');
        out.push(h('b', { class: P + 'n ' + P + a.ruoli[r] }, String(r)));
      });
      out.push(' (' + spiegazioneFori(a) + ')');
      return out;
    }

    function rigaColonna(col, ch) {
      if (ch === ' ') return h('p', { class: P + 'principale' }, h('strong', null, 'Spazio'), ': nessun foro, la colonna resta intatta.');
      return h('p', { class: P + 'principale' }, nodiCodice(ch));
    }
    function rigaCampo(col) {
      const f = campo(col);
      return h('p', { class: P + 'info' }, 'Colonna ' + col + ', nel campo «' + f.nome + '»' + intervallo(f) + '.');
    }

    function note(info) {
      const out = [];
      const conv = info.conversioni || [];
      const maiuscole = conv.filter((c) => c.tipo === 'maiuscola');
      const accenti = conv.filter((c) => c.tipo === 'accento');
      const tipografici = conv.filter((c) => c.tipo === 'tipografico');
      if (maiuscole.length && !st.notaMaiuscole) {
        st.notaMaiuscole = true;
        out.push(h('p', { class: P + 'info' }, 'La 029 scriveva solo in maiuscolo: «' + maiuscole[0].da + '» diventa «' + maiuscole[0].a + '».'));
      }
      if (accenti.length) out.push(h('p', { class: P + 'info' }, 'La 029 non aveva lettere accentate: «' + accenti[0].da + '» diventa «' + accenti[0].a + '».'));
      if (tipografici.length) out.push(h('p', { class: P + 'info' }, 'Virgolette e trattini tipografici diventano quelli semplici della 029: «' + tipografici[0].da + '» diventa «' + tipografici[0].a + '».'));
      if (info.rifiutati && info.rifiutati.length) {
        const tasti = info.rifiutati.slice(0, 3).map((c) => '«' + c + '»').join(', ');
        out.push(h('p', { class: P + 'avviso', role: 'note' }, (info.rifiutati.length > 1 ? 'La 029 non ha i tasti ' : 'La 029 non ha il tasto ') + tasti +
          '. Usa lettere, cifre, lo spazio e questi simboli: ' + TASTI + '.'));
      }
      return out;
    }

    function aggiornaStato() {
      const n = st.testo.length;
      lettura.textContent = n >= COLONNE ? 'Scheda piena' : 'Colonna ' + (n + 1) + ' di 80';
      const vis = st.testo.replace(/\s+$/, '');
      vetrina.setAttribute('aria-label', n ? 'Scheda perforata, ' + n + (n === 1 ? ' colonna' : ' colonne') + ' su 80: ' + vis : 'Scheda perforata vuota');
    }

    // Allinea la scheda al testo del campo: perfora le colonne nuove, toglie quelle cancellate.
    function applica(nuovo, info, opz) {
      const vecchio = st.testo;
      let p = 0;
      while (p < vecchio.length && p < nuovo.length && vecchio[p] === nuovo[p]) p++;
      const aggiunti = [];
      const tolti = [];
      for (let i = p; i < Math.max(vecchio.length, nuovo.length); i++) {
        if ((vecchio[i] || '') === (nuovo[i] || '')) continue;
        if (vecchio[i]) tolti.push(i + 1);
        if (nuovo[i]) aggiunti.push(i + 1);
      }
      const anima = aggiunti.length <= 2 && !opz.subito;
      for (const c of tolti) sperfora(c, anima && aggiunti.indexOf(c) < 0);
      st.testo = nuovo;
      for (const c of aggiunti) perfora(c, nuovo[c - 1], anima);
      const extra = note(info);
      if (aggiunti.length) {
        const ultimo = aggiunti[aggiunti.length - 1];
        mostraColonna(ultimo);
        const righe = [];
        if (opz.salto) {
          righe.push(h('p', { class: P + 'principale' }, 'Salto di campo fino alla colonna 73.'),
            h('p', { class: P + 'info' }, 'Le colonne vuote non hanno fori. Sulla 029 il salto lo faceva da sola una scheda programma avvolta su un tamburo: bastava un tasto per arrivare al campo successivo.'));
        } else {
          if (aggiunti.length > 1) righe.push(h('p', { class: P + 'info' }, aggiunti.length + ' colonne perforate in un colpo solo. L\'ultima:'));
          righe.push(rigaColonna(ultimo, nuovo[ultimo - 1]), rigaCampo(ultimo));
        }
        spiega1.replaceChildren(...righe, ...extra);
      } else if (tolti.length) {
        mostraColonna(nuovo.length || null);
        const prima = tolti[0];
        spiega1.replaceChildren(
          h('p', { class: P + 'principale' }, tolti.length > 1 ? 'Hai tolto le colonne dalla ' + prima + ' alla ' + tolti[tolti.length - 1] + '.' : 'Hai tolto la colonna ' + prima + '.'),
          h('p', { class: P + 'occhiolino' }, 'Su una scheda vera non si poteva: un foro è per sempre. Si prendeva una scheda nuova, si copiavano le colonne giuste con il tasto di duplicazione e si riscriveva il resto. Qui, per una volta, chiudiamo un occhio.'),
          ...extra);
      } else if (extra.length) spiega1.replaceChildren(...extra);
      aggiornaStato();
      muoviCarrello(Math.min(nuovo.length + 1, COLONNE), opz.subito);
      if (nuovo.length === COLONNE && !st.pieno) {
        st.pieno = true;
        ctx.completa();
        spiega1.append(h('p', { class: P + 'avviso' }, 'Scheda piena: 80 colonne su 80. In un centro di calcolo finiva nel mazzo con le altre; premi «Nuova scheda» per perforarne un\'altra.'));
        ctx.annuncia('Scheda piena: 80 colonne perforate.');
      } else if (nuovo.length < COLONNE) st.pieno = false;
    }

    function daInput(opz) {
      if (st.cambio) { input.value = st.testo; return; }
      const grezzo = input.value;
      const f = filtra(grezzo);
      if (f.testo !== grezzo) {
        const cursore = input.selectionStart == null ? grezzo.length : input.selectionStart;
        const pos = Math.min(filtra(grezzo.slice(0, cursore)).testo.length, f.testo.length);
        input.value = f.testo;
        if (document.activeElement === input) {
          try { input.setSelectionRange(pos, pos); } catch (err) { /* campo non selezionabile */ }
        }
      }
      applica(f.testo, f, opz || {});
    }

    input.addEventListener('input', (e) => {
      if (e.isTrusted) annullaAuto();
      daInput();
    });

    // Un clic (o un tocco) sulla scheda mostra il codice di quella colonna.
    svg.addEventListener('click', (e) => {
      const r = svg.getBoundingClientRect();
      if (!r.width) return;
      const x = VB.x + (e.clientX - r.left) / r.width * VB.l;
      const col = Math.round((x - CARTA.x1) / CARTA.passoX) + 1;
      if (col < 1 || col > COLONNE) return;
      mostraColonna(col);
      const ch = st.testo[col - 1];
      if (ch == null) spiega1.replaceChildren(h('p', { class: P + 'principale' }, 'Colonna ' + col + ': ancora da perforare.'), rigaCampo(col));
      else spiega1.replaceChildren(rigaColonna(col, ch), rigaCampo(col));
    });

    function annullaAuto() {
      st.auto += 1;
      bEsempio.removeAttribute('aria-disabled');
    }

    function svuota() {
      for (let c = 1; c <= COLONNE; c++) sperfora(c, false);
      gCoriandoli.replaceChildren();
      st.testo = '';
      st.pieno = false;
      input.value = '';
      mostraColonna(null);
      aggiornaStato();
    }

    async function nuovaScheda(conAnimazione) {
      if (st.cambio) return;
      annullaAuto();
      const piena = st.testo.length > 0;
      st.cambio = true;
      input.readOnly = true;
      try {
        if (piena && conAnimazione && !ctx.riduci) {
          // La scheda perforata esce verso il raccoglitore, una nuova arriva dal caricatore.
          await ctx.anima({ durata: ctx.DURATA.normale, easing: 'sharp', aggiorna: (t) => {
            gCarta.setAttribute('transform', 'translate(' + (-820 * t).toFixed(1) + ' 0)');
            gCarta.style.opacity = String(1 - t);
          } });
        }
        svuota();
        muoviCarrello(1, !conAnimazione);
        if (piena && conAnimazione && !ctx.riduci) {
          await ctx.anima({ durata: ctx.DURATA.normale, easing: 'smooth', aggiorna: (t) => {
            gCarta.setAttribute('transform', 'translate(' + (820 * (1 - t)).toFixed(1) + ' 0)');
            gCarta.style.opacity = String(t);
          } });
        }
      } catch (err) {
        if (!ctx.annullato(err)) throw err;
      } finally {
        gCarta.removeAttribute('transform');
        gCarta.style.opacity = '';
        st.cambio = false;
        input.readOnly = false;
      }
      if (conAnimazione) {
        spiega1.replaceChildren(h('p', { class: P + 'principale' }, 'Scheda nuova sotto i punzoni.'), h('p', { class: P + 'info' }, 'Scrivi una riga: una scheda, una riga di programma.'));
        ctx.annuncia('Scheda nuova pronta.');
      }
    }

    // «Perfora un esempio»: la seconda scheda del «Ciao, mondo» in FORTRAN, fino al numero di sequenza.
    async function esempio() {
      if (bEsempio.getAttribute('aria-disabled') === 'true' || st.cambio) return;
      const riga = '   10 FORMAT (12H CIAO, MONDO)';
      const seq = 'CIAO0020';
      await nuovaScheda(st.testo.length > 0);
      const tok = ++st.auto;
      bEsempio.setAttribute('aria-disabled', 'true');
      try {
        if (ctx.riduci) {
          input.value = riga.padEnd(72) + seq;
          daInput();
          spiega1.prepend(h('p', { class: P + 'info' }, 'La scheda del «Ciao, mondo» in FORTRAN: colonne 1–5 l\'etichetta 10, dalla 7 l\'istruzione, nelle colonne 73–80 il numero di sequenza.'));
          return;
        }
        for (const ch of riga) {
          if (tok !== st.auto) return;
          input.value += ch;
          daInput();
          await ctx.attendi(ch === ' ' ? 70 : 125);
        }
        if (tok !== st.auto) return;
        await ctx.attendi(300);
        if (tok !== st.auto) return;
        input.value = input.value.padEnd(72);
        daInput({ salto: true });
        await ctx.attendi(900);
        for (const ch of seq) {
          if (tok !== st.auto) return;
          input.value += ch;
          daInput();
          await ctx.attendi(125);
        }
      } catch (err) {
        if (!ctx.annullato(err)) throw err;
      } finally {
        if (tok === st.auto) bEsempio.removeAttribute('aria-disabled');
      }
    }

    /* ---------- il mazzo ---------- */

    const dk = { ordine: MAZZO.map((_, i) => i), occupato: false, caduto: false, letto: false };

    function posa(c, x, y, r, o) {
      c.x = x; c.y = y; c.r = r; c.o = o;
      c.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + r.toFixed(2) + 'deg)';
      c.el.style.opacity = o >= 0.999 ? '' : o.toFixed(3);
    }
    function inPila(k) { return { x: 0, y: k * PASSO, r: 0, o: 1 }; }
    function impila() {
      dk.ordine.forEach((i, k) => {
        const p = inPila(k);
        posa(carte[i], p.x, p.y, p.r, p.o);
        carte[i].el.style.zIndex = String(k + 1);
        listaMazzo.append(carte[i].el);   // l'ordine nel DOM segue quello del mazzo, per chi usa un lettore di schermo
      });
    }
    function dove(c) { return { x: c.x, y: c.y, r: c.r, o: c.o }; }
    const tra = (a, b, t) => a + (b - a) * t;

    // Anima più schede insieme, ognuna con il suo ritardo (k × sfasamento).
    function animaCarte(voci, durata, curva, sfasamento, ogni) {
      const passo = durata * (sfasamento || 0);
      const kMax = voci.reduce((m, v) => Math.max(m, v.k || 0), 0);
      const totale = durata + passo * kMax;
      return ctx.anima({ durata: totale, easing: 'linear', aggiorna: (t) => {
        const tempo = t * totale;
        for (const v of voci) {
          const u = Math.min(1, Math.max(0, (tempo - (v.k || 0) * passo) / durata));
          const e = curva(u);
          const a = v.a;
          const d = v.da;
          posa(v.c, tra(d.x, a.x, e), tra(d.y, a.y, e), tra(d.r, a.r, e), tra(d.o == null ? 1 : d.o, a.o == null ? 1 : a.o, e));
          if (ogni) ogni(v, u);
        }
      } });
    }

    function blocca(on) {
      dk.occupato = on;
      area.setAttribute('aria-busy', on ? 'true' : 'false');
      aggiornaBottoni();
    }
    function aggiornaBottoni() {
      const ordinato = inOrdine(dk.ordine);
      for (const b of [bCadi, bLeggi]) {
        if (dk.occupato) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
      }
      if (dk.occupato || ordinato) bRiordina.setAttribute('aria-disabled', 'true'); else bRiordina.removeAttribute('aria-disabled');
    }
    function suggerisci(b) { for (const x of [bCadi, bRiordina, bLeggi]) x.classList.toggle('pg-btn--primario', x === b); }
    function narra2(...nodi) { spiega2.replaceChildren(...nodi.map((n) => (typeof n === 'string' ? h('p', null, ctx.inline(n)) : n))); }
    function seqBreve(i) { return MAZZO[i].seq.slice(4); }

    function mostraCaselle(conteggi, accesa) {
      for (const d of Object.keys(caselle)) {
        const n = conteggi[d] || 0;
        caselle[d].pila.style.setProperty('--n', String(n));
        caselle[d].el.classList.toggle(P + 'accesa', d === accesa);
      }
    }

    async function cadi() {
      if (dk.occupato) return;
      blocca(true);
      const nuovo = mescola(carte.length).map((k) => dk.ordine[k]);
      try {
        if (!ctx.riduci) {
          const larghezza = listaMazzo.clientWidth;
          const fondo = area.clientHeight - 24 - 52;
          const terra = carte.map(() => ({ x: (Math.random() - 0.5) * larghezza * 0.34, y: fondo - Math.random() * 66, r: (Math.random() - 0.5) * 52, o: 1 }));
          carte.forEach((c) => { c.el.style.zIndex = String(1 + Math.floor(Math.random() * carte.length)); });
          // la caduta accelera, come sotto la gravità
          await animaCarte(carte.map((c, i) => ({ c: c, da: dove(c), a: terra[i], k: dk.ordine.indexOf(i) })), 520, (u) => u * u, 0.07);
          // un piccolo rimbalzo sul pavimento
          await ctx.anima({ durata: 200, easing: 'linear', aggiorna: (t) => {
            const b = Math.sin(Math.PI * t);
            carte.forEach((c, i) => posa(c, terra[i].x, terra[i].y - 7 * b, terra[i].r + 2 * b, 1));
          } });
          await ctx.attendi(380);
          // si raccolgono le schede, in un ordine qualsiasi
          nuovo.forEach((i, k) => { carte[i].el.style.zIndex = String(k + 1); });
          await animaCarte(nuovo.map((i, k) => ({ c: carte[i], da: dove(carte[i]), a: inPila(k), k: k })), 480, ctx.EASING.smooth, 0.12);
        }
        dk.ordine = nuovo;
        dk.caduto = true;
        impila();
        suggerisci(bLeggi);
        narra2('**Patatrac.** Le schede sono di nuovo in pila, ma in disordine: guarda i numeri di sequenza e la riga a pennarello, ora spezzata. Che cosa succede se mandi il mazzo così al lettore?');
        ctx.annuncia('Il mazzo è caduto. Nuovo ordine dei numeri di sequenza: ' + dk.ordine.map(seqBreve).join(', ') + '.');
      } catch (err) {
        if (!ctx.annullato(err)) throw err;
        impila();
      } finally {
        blocca(false);
      }
    }

    async function riordina() {
      if (dk.occupato) return;
      if (inOrdine(dk.ordine)) {
        narra2('Il mazzo è già in ordine: i numeri di sequenza crescono dalla prima all\'ultima scheda. Prova prima a lasciarlo cadere.');
        return;
      }
      blocca(true);
      try {
        const giri = passate(dk.ordine, MAZZO);
        area.classList.add(P + 'legge');
        for (const giro of giri) {
          const conteggi = {};
          Object.keys(giro.caselle).forEach((k) => { conteggi[k] = giro.caselle[k].length; });
          mostraCaselle(conteggi, null);
          narra2('La selezionatrice legge la **colonna ' + giro.colonna + '** di ogni scheda e la lascia cadere nella casella della sua cifra. Poi l\'operatore raccoglie le caselle in ordine: 1, 2, 3…');
          if (!ctx.riduci) await ctx.attendi(900);
          const colonna = giro.colonna;
          const cifra = (i) => immagine(MAZZO[i])[colonna - 1];
          giro.ordine.forEach((i, k) => { carte[i].el.style.zIndex = String(k + 1); });
          const fatte = new Set();
          await animaCarte(giro.ordine.map((i, k) => ({ c: carte[i], da: dove(carte[i]), a: inPila(k), k: k, i: i })), 420, ctx.EASING.smooth, 0.55, (v, u) => {
            if (u > 0 && u < 1) mostraCaselle(conteggi, cifra(v.i));
            if (u >= 1 && !fatte.has(v.i)) {
              fatte.add(v.i);
              conteggi[cifra(v.i)] -= 1;
              mostraCaselle(conteggi, null);
            }
          });
          dk.ordine = giro.ordine.slice();
        }
        dk.ordine = ordina(dk.ordine);
        impila();
        mostraCaselle({}, null);
        if (!ctx.riduci) await ctx.attendi(250);
        area.classList.remove(P + 'legge');
        ctx.completa();
        suggerisci(bLeggi);
        narra2('Fatto: è bastata **una sola passata**, sulla colonna 79, perché è l\'unica cifra che cambia da una scheda all\'altra. Con mazzi lunghi si faceva una passata per colonna, partendo dall\'ultima cifra a destra. Anche la riga a pennarello è tornata dritta.');
        ctx.annuncia('Mazzo riordinato con i numeri di sequenza.');
      } catch (err) {
        if (!ctx.annullato(err)) throw err;
        impila();
      } finally {
        area.classList.remove(P + 'legge');
        mostraCaselle({}, null);
        blocca(false);
      }
    }

    async function stampaRiga(testo, tipo) {
      const classi = [P + 'riga-t'];
      if (tipo && tipo !== 'info') classi.push(P + 'riga-' + tipo);
      if (!ctx.riduci) classi.push(P + 'riga-nuova');
      tabulato.append(h('div', { class: classi.join(' ') }, testo || ' '));
      foglio.scrollTop = foglio.scrollHeight;
      if (!ctx.riduci) await ctx.attendi(testo ? 75 : 30);
    }

    async function leggi() {
      if (dk.occupato) return;
      blocca(true);
      const ris = leggiMazzo(dk.ordine.map((i) => immagine(MAZZO[i])));
      try {
        vuoto.hidden = true;
        tabulato.replaceChildren();
        foglio.scrollTop = 0;
        statoLettore.textContent = 'Lettura in corso…';
        lettore.classList.add(P + 'in-lettura');
        for (const r of ris.intestazione) await stampaRiga(r);
        for (let k = 0; k < dk.ordine.length; k++) {
          const c = carte[dk.ordine[k]];
          if (!ctx.riduci) await animaCarte([{ c: c, da: dove(c), a: { x: listaMazzo.clientWidth * 0.55, y: c.y, r: 0, o: 0 }, k: 0 }], 230, ctx.EASING.sharp, 0);
          await stampaRiga(ris.schede[k]);
        }
        statoLettore.textContent = 'Compilazione ed esecuzione…';
        for (const r of ris.coda) await stampaRiga(r.testo, r.tipo);
        if (!ctx.riduci) {
          // il mazzo torna dal raccoglitore del lettore
          await animaCarte(dk.ordine.map((i, k) => ({ c: carte[i], da: { x: -28, y: k * PASSO, r: 0, o: 0 }, a: inPila(k), k: k })), 300, ctx.EASING.smooth, 0.1);
        }
        impila();
        dk.letto = true;
        statoLettore.textContent = ris.esito === 'ok' ? 'Lavoro concluso' : ris.esito === 'errore' ? 'Lavoro fallito' : 'Concluso, ma il risultato è sbagliato';
        raccontaEsito(ris);
      } catch (err) {
        if (!ctx.annullato(err)) throw err;
        impila();
      } finally {
        lettore.classList.remove(P + 'in-lettura');
        blocca(false);
      }
    }

    function raccontaEsito(ris) {
      const ordinato = inOrdine(dk.ordine);
      if (ris.esito === 'ok') {
        if (ordinato) {
          suggerisci(bCadi);
          narra2('Il compilatore ha tradotto le sei schede e il programma ha stampato i quadrati da 1 a 5. Nella realtà questo tabulato arrivava ore dopo la consegna allo sportello. Ora prova a lasciar cadere il mazzo.');
        } else {
          suggerisci(bRiordina);
          narra2('Curioso: il mazzo non è in ordine, eppure il programma funziona. La scheda `FORMAT` non si esegue, descrive soltanto come stampare, e può stare ovunque prima di `END`. Le altre no: prova a farlo cadere di nuovo, o riordinalo.');
        }
        ctx.annuncia('Lettura conclusa: il programma ha stampato i quadrati da 1 a 5.');
        return;
      }
      suggerisci(ordinato ? bCadi : bRiordina);
      if (ris.esito === 'errore') {
        const codici = ris.errori.map((e) => e.codice);
        const motivi = [];
        if (codici.indexOf('end') >= 0) motivi.push('la scheda `END` non è più in fondo: il compilatore si ferma lì e le schede che seguono restano fuori dal programma');
        if (codici.indexOf('do-prima') >= 0) motivi.push('la scheda del ciclo `DO 10` è finita dopo l\'istruzione 10, quella che chiude il ciclo');
        if (codici.indexOf('do-manca') >= 0) motivi.push('l\'istruzione 10, che chiude il ciclo, è rimasta dopo `END`');
        if (codici.indexOf('format-manca') >= 0) motivi.push('la scheda `FORMAT 20`, che descrive la riga da stampare, è rimasta dopo `END`');
        const testo = motivi.length ? motivi.slice(0, 2).join('; inoltre ') : 'le istruzioni sono in un ordine che il compilatore non accetta';
        narra2('Errore di compilazione: ' + testo + '. Il programma non è stato eseguito. Nel 1965 avresti perso una giornata: riordina il mazzo con i numeri di sequenza e rileggilo.');
        ctx.annuncia('Lettura conclusa con errori: il programma non è stato eseguito.');
        return;
      }
      const es = ris.esecuzione;
      let testo;
      if (es.indefinite.length) {
        testo = 'Il programma ha girato, ma ' + es.indefinite.join(' e ') + (es.indefinite.length > 1 ? ' sono stati usati' : ' è stato usato') + ' prima di ricevere un valore. Una macchina vera avrebbe stampato un numero qualsiasi, quello rimasto in memoria, senza nessun messaggio d\'errore: lo sbaglio più insidioso.';
      } else if (!es.righe.length) {
        testo = 'Il programma ha girato, ma è arrivato a `STOP` prima di stampare qualsiasi cosa.';
      } else if (es.righe.length < righeAttese().length && es.fine === 'stop') {
        testo = 'Il programma si è fermato a `STOP` prima di finire il ciclo: le righe stampate sono meno di cinque.';
      } else {
        testo = 'Il programma ha girato, ma il risultato è diverso da quello atteso: in un programma l\'ordine delle istruzioni conta.';
      }
      narra2(testo + ' Riordina il mazzo e rileggilo.');
      ctx.annuncia('Lettura conclusa: il risultato è sbagliato.');
    }

    /* ---------- avvio ---------- */

    impila();
    aggiornaBottoni();
    mostraCaselle({}, null);
    disegnaCarrello();
    muoviCarrello(1, true);
    aggiornaStato();
    spiega1.replaceChildren(
      h('p', { class: P + 'principale' }, 'Scrivi nella tastiera: ogni tasto perfora la colonna successiva.'),
      h('p', { class: P + 'info' }, 'Prova con il tuo nome, oppure premi «Perfora un esempio». La lente a sinistra mostra quali fori compongono ogni carattere.'));
    narra2('Un programma FORTRAN di sei schede che stampa i quadrati dei numeri da 1 a 5. Nelle colonne 73–80 ogni scheda porta il suo numero di sequenza, da `QUAD0010` a `QUAD0060`, e sul fianco del mazzo c\'è la classica riga diagonale a pennarello. Leggi il mazzo, poi prova a farlo cadere.');

    return {
      pausa() {},
      riprendi() {},
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('scheda-perforata', { titolo: 'La perforatrice IBM 029', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
