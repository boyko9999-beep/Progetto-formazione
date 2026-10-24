/*
 * Laboratorio «Il compilatore al lavoro» (capitolo 5, i primi linguaggi ad alto livello).
 *
 * Un'assegnazione in stile FORTRAN, per esempio Y = A + B * C, attraversa le quattro fasi di un
 * compilatore: l'analisi lessicale la spezza in token, l'analisi sintattica costruisce l'albero
 * (la precedenza degli operatori diventa la sua forma), la generazione del codice visita l'albero
 * in ordine posticipato e scrive le istruzioni per la CPU giocattolo condivisa (js/lib/cpu-giocattolo.js),
 * infine l'assemblatore e la CPU eseguono il programma e stampano il risultato.
 * La logica pura (lexer, parser, generatore, esecuzione e passi dell'animazione) è esportata per i test.
 */
(function (root) {
  'use strict';

  /* ======================= logica pura: niente DOM ======================= */

  const MEMORIA = 31;          // celle 0–30 per programma e dati: la 31 è l'uscita
  const MAX_CARATTERI = 60;
  const MAX_VALORE = 255;
  const PRESET = ['Y = A + B * C', 'Y = (A + B) * C', 'Y = A * A - B'];
  const FASI = [
    { nome: 'Analisi lessicale', sotto: 'caratteri → token' },
    { nome: 'Analisi sintattica', sotto: 'token → albero' },
    { nome: 'Generazione del codice', sotto: 'albero → istruzioni' },
    { nome: 'Esecuzione', sotto: 'la CPU calcola' },
  ];
  const OP_CPU = { '+': 'ADD', '-': 'SUB', '*': 'MUL' };
  const NOME_OP = { '+': 'addizione', '-': 'sottrazione', '*': 'moltiplicazione' };
  const LA = { '+': 'l\'addizione', '-': 'la sottrazione', '*': 'la moltiplicazione' };
  const SULLA = { '+': 'sull\'addizione', '-': 'sulla sottrazione', '*': 'sulla moltiplicazione' };
  const SEGNO = { '+': '+', '-': '−', '*': '×' };
  const PRECEDENZA = { '+': 1, '-': 1, '*': 2 };

  function cpu() {
    if (root.CpuGiocattolo) return root.CpuGiocattolo;
    if (typeof require === 'function') {
      try { return require('../lib/cpu-giocattolo.js'); } catch (e) { /* non disponibile */ }
    }
    return null;
  }

  // A = 2, B = 3, C = 4… come nell'esempio del capitolo.
  function valorePredefinito(lettera) { return lettera.charCodeAt(0) - 63; }

  function valida(testo, nome) {
    const t = String(testo == null ? '' : testo).trim();
    if (t === '') return { ok: false, errore: 'Scrivi un valore per ' + nome + ': un numero intero da 0 a 255.' };
    if (!/^\d+$/.test(t)) return { ok: false, errore: nome + ' deve essere un numero intero da 0 a 255, senza segno, virgola o lettere.' };
    const v = parseInt(t, 10);
    if (v > MAX_VALORE) return { ok: false, errore: nome + ' = ' + v + ' non entra in una cella da 8 bit: scegli un numero da 0 a 255.' };
    return { ok: true, valore: v };
  }

  function errore(fase, messaggio, inizio, fine) {
    return { fase: fase, tipo: ['', 'lessicale', 'sintassi', 'memoria', 'esecuzione'][fase], messaggio: messaggio, inizio: inizio == null ? null : inizio, fine: fine == null ? null : fine };
  }

  /* ---------- 1. analisi lessicale ---------- */

  const SIMBOLI = { '+': '+', '-': '-', '−': '-', '–': '-', '*': '*', '×': '*', '·': '*' };

  // Solo le lettere a–z diventano maiuscole: così le posizioni restano quelle del testo scritto.
  function normalizza(sorgente) {
    return String(sorgente == null ? '' : sorgente).replace(/[a-z]/g, (c) => c.toUpperCase());
  }

  function lessico(sorgente) {
    const testo = normalizza(sorgente);
    const token = [];
    const ko = (msg, i, j) => ({ ok: false, testo: testo, token: token, errore: errore(1, msg, i, j) });
    if (!testo.trim()) return ko('Scrivi un\'assegnazione, per esempio Y = A + B * C.');
    if (testo.length > MAX_CARATTERI) return ko('L\'istruzione è troppo lunga: al massimo ' + MAX_CARATTERI + ' caratteri.', MAX_CARATTERI, testo.length);
    let i = 0;
    while (i < testo.length) {
      const c = testo[i];
      if (/\s/.test(c)) { i += 1; continue; }
      if (c >= 'A' && c <= 'Z') {
        let j = i + 1;
        while (j < testo.length && /[A-Z0-9]/.test(testo[j])) j += 1;
        if (j - i > 1) {
          const parola = testo.slice(i, j);
          const consiglio = /^[A-Z]{2,3}$/.test(parola) ? ' Per moltiplicarle scrivi ' + parola.split('').join(' * ') + '.' : '';
          return ko('«' + parola + '»: qui ogni variabile è una sola lettera, da A a Z.' + consiglio, i, j);
        }
        token.push({ tipo: 'variabile', testo: c, inizio: i, fine: i + 1 });
        i = j;
        continue;
      }
      if (c >= '0' && c <= '9') {
        let j = i + 1;
        while (j < testo.length && testo[j] >= '0' && testo[j] <= '9') j += 1;
        if ((testo[j] === '.' || testo[j] === ',') && /[0-9]/.test(testo[j + 1] || '')) {
          let k = j + 1;
          while (k < testo.length && /[0-9]/.test(testo[k])) k += 1;
          return ko('«' + testo.slice(i, k) + '»: la CPU giocattolo conosce solo numeri interi, da 0 a 255.', i, k);
        }
        const cifre = testo.slice(i, j);
        const valore = parseInt(cifre, 10);
        if (valore > MAX_VALORE) return ko('«' + cifre + '» non entra in una cella da 8 bit: i numeri vanno da 0 a 255.', i, j);
        token.push({ tipo: 'numero', testo: cifre, valore: valore, inizio: i, fine: j });
        i = j;
        continue;
      }
      if (c in SIMBOLI) {
        if (SIMBOLI[c] === '*' && testo[i + 1] === '*') return ko('«**» è l\'elevamento a potenza del FORTRAN, ma la CPU giocattolo non lo conosce: per il quadrato scrivi A * A.', i, i + 2);
        token.push({ tipo: 'operatore', testo: SIMBOLI[c], inizio: i, fine: i + 1 });
        i += 1;
        continue;
      }
      if (c === '=') { token.push({ tipo: 'uguale', testo: '=', inizio: i, fine: i + 1 }); i += 1; continue; }
      if (c === '(' || c === ')') { token.push({ tipo: 'parentesi', testo: c, inizio: i, fine: i + 1 }); i += 1; continue; }
      if (c === '/' || c === ':' || c === '÷') return ko('La divisione non c\'è: la CPU giocattolo sa solo sommare, sottrarre e moltiplicare (non ha un\'istruzione per dividere).', i, i + 1);
      if (c === '^') return ko('«^» non fa parte del linguaggio: per il quadrato scrivi A * A.', i, i + 1);
      if (c === '.' || c === ',') return ko('«' + c + '»: qui i numeri sono interi, senza virgola, e ogni istruzione sta su una riga.', i, i + 1);
      return ko('Il simbolo «' + c + '» non fa parte del linguaggio: usa lettere, numeri da 0 a 255, + − *, = e parentesi.', i, i + 1);
    }
    return { ok: true, testo: testo, token: token, errore: null };
  }

  /* ---------- 2. analisi sintattica ----------
   * istruzione  := VARIABILE '=' espressione
   * espressione := termine (('+' | '-') termine)*
   * termine     := fattore ('*' fattore)*
   * fattore     := VARIABILE | NUMERO | '(' espressione ')'
   */

  function analizza(token) {
    const nodi = [];
    const ordine = [];
    let p = 0;

    function nodo(def) {
      def.id = 'n' + nodi.length;
      def.parentesi = def.parentesi || [];
      nodi.push(def);
      return def;
    }
    function sbaglia(msg, da, a) {
      const t1 = token[da] || token[token.length - 1];
      const t2 = token[a == null ? da : a] || t1;
      const e = new Error(msg);
      e.sintassi = errore(2, msg, t1 ? t1.inizio : null, t2 ? t2.fine : null);
      throw e;
    }
    const fra = (t) => '«' + t.testo + '»';

    // Che cosa manca quando ci si aspetta un valore (variabile, numero o parentesi aperta).
    function mancaValore() {
      const t = token[p];
      const prima = token[p - 1];
      if (!t) {
        if (prima.tipo === 'uguale') sbaglia('Dopo il segno = manca la formula: per esempio Y = A + B.', p - 1);
        if (prima.testo === '(') sbaglia('La parentesi è rimasta aperta e vuota: scrivi un\'espressione e chiudila, per esempio (A + B).', p - 1);
        sbaglia('L\'espressione finisce con ' + fra(prima) + ': dopo un operatore ci vuole ancora un valore.', p - 1);
      }
      if (t.tipo === 'operatore') {
        if (t.testo === '-' && (!prima || prima.tipo !== 'variabile')) sbaglia('Il meno davanti a un valore non è previsto: invece di −A scrivi 0 - A.', p);
        sbaglia('Dopo ' + fra(prima) + ' ci vuole una variabile, un numero o una «(», non ' + fra(t) + '.', p);
      }
      if (t.testo === ')') {
        if (prima && prima.testo === '(') sbaglia('Le parentesi sono vuote: scrivici dentro un\'espressione, per esempio (A + B).', p - 1, p);
        sbaglia('Prima di questa «)» manca un valore: dopo ' + fra(prima) + ' scrivi una variabile o un numero.', p);
      }
      if (t.tipo === 'uguale') sbaglia('C\'è un secondo segno =: un\'assegnazione ne ha uno solo.', p);
      sbaglia('Qui ci vuole una variabile, un numero o una «(».', p);
    }

    // Un valore completo è seguito da qualcosa che non c'entra.
    function seguitoStrano(dentroParentesi) {
      const t = token[p];
      const prima = token[p - 1];
      if (!t) sbaglia('Manca la parentesi chiusa: questa «(» non viene mai chiusa.', dentroParentesi);
      if (t.testo === ')') sbaglia('C\'è una parentesi chiusa di troppo: togli questa «)» o aggiungi la «(» che manca.', p);
      if (t.tipo === 'uguale') sbaglia('C\'è un secondo segno =: un\'assegnazione ne ha uno solo.', p);
      sbaglia('Manca un operatore fra ' + fra(prima) + ' e ' + fra(t) + ': per moltiplicare scrivi ' + prima.testo + ' * ' + t.testo + '.', p - 1, p);
    }

    function fattore() {
      const t = token[p];
      if (t && (t.tipo === 'variabile' || t.tipo === 'numero')) {
        p += 1;
        return nodo({ tipo: t.tipo, testo: t.testo, valore: t.valore, token: p - 1 });
      }
      if (t && t.testo === '(') {
        const aperta = p;
        p += 1;
        const e = espressione();
        if (!token[p] || token[p].testo !== ')') seguitoStrano(aperta);
        e.parentesi.push(aperta, p);
        p += 1;
        return e;
      }
      return mancaValore();
    }

    function termine() {
      let sx = fattore();
      while (token[p] && token[p].testo === '*') {
        const k = p;
        p += 1;
        const dx = fattore();
        sx = nodo({ tipo: 'operatore', op: '*', testo: '*', token: k, sx: sx, dx: dx });
        ordine.push(sx.id);
      }
      return sx;
    }

    function espressione() {
      let sx = termine();
      while (token[p] && (token[p].testo === '+' || token[p].testo === '-')) {
        const k = p;
        const op = token[p].testo;
        p += 1;
        const dx = termine();
        sx = nodo({ tipo: 'operatore', op: op, testo: op, token: k, sx: sx, dx: dx });
        ordine.push(sx.id);
      }
      return sx;
    }

    try {
      if (!token.length) sbaglia('Scrivi un\'assegnazione, per esempio Y = A + B * C.', 0);
      const uguale = token.findIndex((t) => t.tipo === 'uguale');
      if (uguale < 0) sbaglia('Manca il segno =: scrivi la variabile che riceve il risultato, poi = e la formula, per esempio Y = A + B.', 0, token.length - 1);
      if (token[0].tipo !== 'variabile') {
        if (uguale === 0) sbaglia('Prima del segno = manca la variabile che riceve il risultato, per esempio Y.', 0);
        if (token[0].tipo === 'numero' && uguale === 1) sbaglia('A sinistra del segno = ci va la variabile che riceve il risultato, non un numero.', 0);
        sbaglia('A sinistra del segno = ci va una sola variabile, per esempio Y.', 0, uguale - 1);
      }
      if (uguale !== 1) sbaglia('A sinistra del segno = ci va soltanto la variabile che riceve il risultato, per esempio Y.', 0, uguale - 1);
      const bersaglio = nodo({ tipo: 'variabile', testo: token[0].testo, token: 0, bersaglio: true });
      p = 2;
      const formula = espressione();
      if (p < token.length) seguitoStrano(null);
      const radice = nodo({ tipo: 'assegna', testo: '=', token: 1, sx: bersaglio, dx: formula });
      ordine.push(radice.id);
      (function livelli(n, l) { n.livello = l; if (n.sx) { livelli(n.sx, l + 1); livelli(n.dx, l + 1); } })(radice, 0);
      return { ok: true, albero: radice, nodi: nodi, ordine: ordine, profondita: Math.max(...nodi.map((n) => n.livello)), errore: null };
    } catch (e) {
      if (!e.sintassi) throw e;
      return { ok: false, albero: null, nodi: nodi, ordine: ordine, errore: e.sintassi };
    }
  }

  const foglia = (n) => !n.sx;

  // La formula scritta di nuovo a partire dall'albero, con le parentesi strettamente necessarie.
  function testoDi(n, valori, segni) {
    if (n.tipo === 'assegna') return testoDi(n.sx, null, segni) + ' = ' + testoDi(n.dx, valori, segni);
    if (foglia(n)) return valori && n.tipo === 'variabile' && valori[n.testo] != null ? String(valori[n.testo]) : n.testo;
    const pezzo = (f, destra) => {
      const t = testoDi(f, valori, segni);
      if (foglia(f)) return t;
      const pf = PRECEDENZA[f.op];
      const pn = PRECEDENZA[n.op];
      return pf < pn || (destra && pf === pn) ? '(' + t + ')' : t;
    };
    return pezzo(n.sx, false) + ' ' + (segni ? SEGNO[n.op] : n.op) + ' ' + pezzo(n.dx, true);
  }

  function postordine(n, out) {
    out = out || [];
    if (n.sx) { postordine(n.sx, out); postordine(n.dx, out); }
    out.push(n);
    return out;
  }

  // Il valore esatto della formula, con numeri interi senza limiti (BigInt).
  function valuta(n, valori) {
    if (n.tipo === 'assegna') return valuta(n.dx, valori);
    if (n.tipo === 'numero') return BigInt(n.valore);
    if (n.tipo === 'variabile') return BigInt(valori[n.testo] == null ? valorePredefinito(n.testo) : valori[n.testo]);
    const a = valuta(n.sx, valori);
    const b = valuta(n.dx, valori);
    return n.op === '+' ? a + b : (n.op === '-' ? a - b : a * b);
  }

  const modulo256 = (v) => Number(((v % 256n) + 256n) % 256n);

  // Che cosa racconta la costruzione di un nodo dell'albero.
  function spiegaNodo(n, padre) {
    if (n.tipo === 'assegna') {
      return 'In cima va l\'assegnazione: a sinistra `' + n.sx.testo + '`, che riceverà il risultato, a destra la formula. L\'albero è completo: ogni operatore sta sopra i suoi due operandi.';
    }
    const t = '`' + testoDi(n) + '`';
    const parentesi = n.parentesi.length ? ' Le parentesi hanno fatto il loro lavoro e spariscono: ora l\'ordine è scritto nella forma dell\'albero.' : '';
    if (padre && padre.tipo === 'operatore' && PRECEDENZA[n.op] > PRECEDENZA[padre.op] && padre.dx === n) {
      return t + ' diventa un ramo: ' + LA[n.op] + ' ha la precedenza ' + SULLA[padre.op] + ' che la precede, quindi sta più in basso e sarà calcolata prima.' + parentesi;
    }
    if (padre && padre.tipo === 'operatore' && PRECEDENZA[n.op] < PRECEDENZA[padre.op]) {
      return t + ' diventa un ramo sotto ' + LA[padre.op] + ': senza parentesi ' + LA[padre.op] + ' verrebbe prima, così invece si calcola prima `' + testoDi(n) + '`.' + parentesi;
    }
    if (padre && padre.tipo === 'operatore' && padre.sx === n && PRECEDENZA[n.op] === PRECEDENZA[padre.op]) {
      return t + ' diventa un ramo: operatori dello stesso livello si leggono da sinistra a destra, quindi questo viene prima.' + parentesi;
    }
    if (padre && padre.tipo === 'operatore' && padre.dx === n && PRECEDENZA[n.op] === PRECEDENZA[padre.op]) {
      return t + ' diventa un ramo a destra: le parentesi lo fanno calcolare prima del resto.' + parentesi;
    }
    return 'Il nodo `' + n.testo + '` unisce i suoi operandi: ' + t + '.' + parentesi;
  }

  /* ---------- 3. generazione del codice ----------
   * Visita in ordine posticipato: prima i figli, poi il padre. Ogni foglia ha già la sua cella
   * (le costanti ne ricevono una: la CPU giocattolo non ha istruzioni con il numero dentro).
   * Con l'ottimizzazione il risultato parziale resta nell'accumulatore finché serve; senza,
   * ogni risultato passa da una cella temporanea (STORE e poi LOAD), come in una traduzione parola per parola.
   */

  function genera(albero, valori, opzioni) {
    const ottimizza = !opzioni || opzioni.ottimizza !== false;
    const righe = [];
    const dati = [];
    const visite = [];
    const celle = new Map();      // etichetta -> indice in dati
    const pos = {};                // id del nodo -> etichetta della cella con il suo valore
    const consumati = new Set();
    const liberi = [];
    let ultimaTemp = 0;
    let acc = null;                // id del nodo il cui valore è nell'accumulatore
    let visita = null;

    function dato(etichetta, valore, tipo, nodo) {
      if (celle.has(etichetta)) return false;
      celle.set(etichetta, dati.length);
      dati.push({ etichetta: etichetta, valore: valore, tipo: tipo, nodo: nodo == null ? null : nodo });
      visita.dati.push(dati.length - 1);
      return true;
    }
    function emetti(op, arg, nodo) {
      const tipo = arg == null ? null : (arg === 'OUT' ? 'uscita' : (celle.has(arg) ? dati[celle.get(arg)].tipo : 'variabile'));
      righe.push({ op: op, arg: arg == null ? null : arg, tipo: tipo, nodo: nodo });
      visita.righe.push(righe.length - 1);
    }
    function temporanea() {
      let k;
      if (ottimizza && liberi.length) { liberi.sort((a, b) => a - b); k = liberi.shift(); } else { ultimaTemp += 1; k = ultimaTemp; }
      const et = 'T' + k;
      dato(et, 0, 'temporanea', null);
      return et;
    }
    function usa(n) {
      consumati.add(n.id);
      const l = pos[n.id];
      if (ottimizza && /^T\d+$/.test(l)) liberi.push(Number(l.slice(1)));
    }
    function salvaAcc() {
      const t = temporanea();
      emetti('STORE', t, acc);
      pos[acc] = t;
      return t;
    }
    const cod = (x) => '`' + x + '`';

    for (const n of postordine(albero)) {
      visita = { nodo: n.id, righe: [], dati: [], testo: '', breve: false };
      if (n.tipo === 'variabile' && n.bersaglio) {
        const usata = postordine(albero.dx).some((f) => f.tipo === 'variabile' && f.testo === n.testo);
        const v = usata ? valori[n.testo] : 0;
        dato(n.testo, v, 'risultato', n.id);
        pos[n.id] = n.testo;
        visita.breve = true;
        visita.testo = '`' + n.testo + '` riceverà il risultato: il compilatore le riserva una cella, ' + cod(n.testo + ': DATA ' + v) + (usata ? ' (compare anche nella formula, quindi parte dal suo valore).' : '.');
      } else if (n.tipo === 'variabile') {
        const nuova = dato(n.testo, valori[n.testo], 'variabile', n.id);
        pos[n.id] = n.testo;
        visita.breve = true;
        visita.testo = nuova
          ? 'Foglia `' + n.testo + '`: una variabile. Il suo valore starà nella cella ' + n.testo + ': ' + cod(n.testo + ': DATA ' + valori[n.testo]) + '.'
          : 'Foglia `' + n.testo + '`: la cella ' + n.testo + ' esiste già, non serve altro.';
      } else if (n.tipo === 'numero') {
        const et = 'K' + n.valore;
        const nuova = dato(et, n.valore, 'costante', n.id);
        pos[n.id] = et;
        visita.breve = true;
        visita.testo = nuova
          ? 'Foglia `' + n.testo + '`: una costante. La CPU giocattolo non ha istruzioni con il numero dentro, quindi anche ' + n.valore + ' va in una cella: ' + cod(et + ': DATA ' + n.valore) + '.'
          : 'Foglia `' + n.testo + '`: la costante ' + n.valore + ' ha già la sua cella ' + et + '.';
      } else if (n.tipo === 'operatore') {
        const L = n.sx;
        const R = n.dx;
        const istr = OP_CPU[n.op];
        const nome = 'Nodo `' + n.testo + '` (' + NOME_OP[n.op] + ')';
        if (!ottimizza) {
          emetti('LOAD', pos[L.id], n.id);
          emetti(istr, pos[R.id], n.id);
          usa(L); usa(R);
          const t = temporanea();
          emetti('STORE', t, n.id);
          pos[n.id] = t;
          acc = null;
          visita.testo = nome + ': carica ' + pos[L.id] + ', ' + (n.op === '+' ? 'somma' : n.op === '-' ? 'sottrae' : 'moltiplica per') + ' ' + pos[R.id] + ' e salva il risultato in ' + t + '. Senza ottimizzazione ogni risultato passa dalla memoria.';
        } else if (acc === L.id) {
          emetti(istr, pos[R.id], n.id);
          usa(L); usa(R);
          visita.testo = nome + ': il primo operando è già nell\'accumulatore, basta ' + cod(istr + ' ' + pos[R.id]) + '.';
        } else if (acc === R.id && n.op !== '-') {
          emetti(istr, pos[L.id], n.id);
          usa(L); usa(R);
          visita.testo = nome + ': il secondo operando è già nell\'accumulatore e ' + LA[n.op] + ' si può scambiare, quindi basta ' + cod(istr + ' ' + pos[L.id]) + '.';
        } else if (acc === R.id) {
          const t = salvaAcc();
          emetti('LOAD', pos[L.id], n.id);
          emetti(istr, t, n.id);
          usa(L); usa(R);
          visita.testo = nome + ': il secondo operando è nell\'accumulatore, ma la sottrazione non si può scambiare. Lo mette da parte in ' + t + ', carica ' + pos[L.id] + ' e sottrae ' + t + '.';
        } else {
          let prima = '';
          if (acc !== null) {
            const t = salvaAcc();
            prima = 'l\'accumulatore contiene un risultato che servirà più tardi: lo salva nella temporanea ' + t + ' (' + cod('STORE ' + t) + '). Poi ';
          }
          emetti('LOAD', pos[L.id], n.id);
          emetti(istr, pos[R.id], n.id);
          usa(L); usa(R);
          visita.testo = nome + ': ' + prima + 'carica ' + pos[L.id] + ' nell\'accumulatore e ' + (n.op === '+' ? 'somma' : n.op === '-' ? 'sottrae' : 'moltiplica per') + ' ' + pos[R.id] + '.';
        }
        if (ottimizza) { acc = n.id; pos[n.id] = 'ACC'; }
      } else {
        const E = n.dx;
        const b = n.sx.testo;
        if (acc !== E.id) emetti('LOAD', pos[E.id], n.id);
        usa(E);
        emetti('STORE', b, n.id);
        emetti('STORE', 'OUT', n.id);
        emetti('HALT', null, n.id);
        acc = null;
        pos[n.id] = b;
        const carica = foglia(E) ? 'carica ' + pos[E.id] + ' nell\'accumulatore, poi '
          : (!ottimizza ? 'ricarica il risultato da ' + pos[E.id] + ' (appena salvato e subito riletto: lavoro sprecato), poi ' : 'il risultato è già nell\'accumulatore: ');
        visita.testo = 'Radice `=`: ' + carica + cod('STORE ' + b) + ' lo scrive nella cella ' + b + ', ' + cod('STORE OUT') + ' lo stampa (la cella 31 è l\'uscita) e ' + cod('HALT') + ' ferma la macchina.';
      }
      visita.posizioni = Object.assign({}, pos);
      visita.consumati = [...consumati];
      visita.acc = acc;
      visite.push(visita);
    }

    const istruzioni = righe.length;
    const totale = istruzioni + dati.length;
    const sorgente = righe.map((r) => '        ' + r.op + (r.arg ? ' ' + r.arg : ''))
      .concat(dati.map((d) => (d.etichetta + ':').padEnd(8) + 'DATA ' + d.valore)).join('\n');
    const ris = { ok: true, ottimizza: ottimizza, righe: righe, dati: dati, visite: visite, sorgente: sorgente, istruzioni: istruzioni, celle: totale, bersaglio: albero.sx.testo, errore: null };
    if (totale > MEMORIA) {
      ris.ok = false;
      ris.errore = errore(3, 'Il programma occupa ' + totale + ' celle (' + istruzioni + ' istruzioni e ' + dati.length + ' dati), ma la memoria ne ha 31: la 32ª è l\'uscita. '
        + (ottimizza ? 'Accorcia la formula o riusa le stesse variabili.' : 'Riattiva l\'ottimizzazione o accorcia la formula.'));
    }
    return ris;
  }

  /* ---------- 4. assemblaggio ed esecuzione ---------- */

  function esegui(codice) {
    const C = cpu();
    if (!C) return { ok: false, errore: errore(4, 'La CPU giocattolo non è disponibile.') };
    const asm = C.assembla(codice.sorgente);
    if (!asm.ok) return { ok: false, asm: asm, errore: errore(4, 'L\'assemblatore ha trovato un errore: ' + asm.errori[0].messaggio) };
    const st = C.crea(asm.parole);
    const eventi = [];
    while (!st.fermo && eventi.length < 200) {
      const d = C.decodifica(st.mem[st.pc]);
      const operando = d.istruzione.operando ? st.mem[d.arg] : null;
      const ev = C.passo(st);
      ev.operando = operando;
      ev.riga = ev.indirizzo;
      eventi.push(ev);
    }
    const nomi = {};
    codice.dati.forEach((d, j) => { nomi[codice.istruzioni + j] = d.etichetta; });
    nomi[C.OUT] = 'OUT';
    const indirizzoY = asm.simboli[codice.bersaglio.toLowerCase()];
    return { ok: st.fermo, asm: asm, eventi: eventi, uscita: st.uscita.slice(), valore: st.mem[indirizzoY], indirizzoY: indirizzoY, nomi: nomi, errore: null };
  }

  const meno = (v) => String(v).replace('-', '−');

  function spiegaEvento(ev, codice, esecuzione) {
    const nome = (a) => esecuzione.nomi[a] || ('cella ' + a);
    const n = nome(ev.arg);
    const cod = '`' + ev.nome + (ev.nome === 'HALT' ? '' : ' ' + n) + '`';
    const trabocca = (vero) => (vero === ev.accDopo ? '' : (vero > 255
      ? ' Il conto vero fa ' + vero + ', ma una cella da 8 bit arriva solo a 255: la macchina tiene il resto della divisione per 256, cioè ' + ev.accDopo + '.'
      : ' Il conto vero fa ' + meno(vero) + ', ma una cella da 8 bit non ha numeri negativi: si riparte da 255 all\'indietro, quindi ' + meno(vero) + ' diventa ' + ev.accDopo + ' (' + meno(vero) + ' + 256).'));
    switch (ev.nome) {
      case 'LOAD': return cod + ': l\'accumulatore copia il contenuto della cella ' + n + ': ' + ev.accDopo + '.';
      case 'ADD': return cod + ': ' + ev.accPrima + ' + ' + ev.operando + ' = ' + ev.accDopo + '.' + trabocca(ev.accPrima + ev.operando);
      case 'SUB': return cod + ': ' + ev.accPrima + ' − ' + ev.operando + ' = ' + ev.accDopo + '.' + trabocca(ev.accPrima - ev.operando);
      case 'MUL': return cod + ': ' + ev.accPrima + ' × ' + ev.operando + ' = ' + ev.accDopo + '.' + trabocca(ev.accPrima * ev.operando);
      case 'STORE':
        if (ev.uscita != null) return cod + ': ' + ev.accDopo + ' va nella cella 31, l\'uscita: la macchina lo stampa.';
        if (n === codice.bersaglio) return cod + ': ' + ev.accDopo + ' viene scritto nella cella ' + n + '. L\'assegnazione è fatta.';
        return cod + ': il risultato parziale (' + ev.accDopo + ') va nella temporanea ' + n + ', in attesa di servire.';
      case 'HALT': return cod + ': la macchina si ferma.';
      default: return cod + '.';
    }
  }

  /* ---------- tutto insieme ---------- */

  function variabiliDi(token) {
    const out = [];
    const destra = token.length > 1 && token[1].tipo === 'uguale' ? token.slice(2) : token.slice(1);
    for (const t of destra) if (t.tipo === 'variabile' && out.indexOf(t.testo) < 0) out.push(t.testo);
    return out;
  }

  function passiDi(ris) {
    const out = [];
    ris.token.forEach((t, i) => out.push({ fase: 1, token: i }));
    const mostrati = new Set();
    const per = (id) => ris.nodi[Number(id.slice(1))];
    for (const id of ris.ordine) {
      const n = per(id);
      const nuovi = [];
      for (const f of [n.sx, n.dx]) if (foglia(f) && !mostrati.has(f.id)) { nuovi.push(f.id); mostrati.add(f.id); }
      nuovi.push(id);
      mostrati.add(id);
      const parentesi = [];
      for (const k of nuovi) for (const t of per(k).parentesi) parentesi.push(t);
      out.push({ fase: 2, nodo: id, nuovi: nuovi, parentesi: parentesi });
    }
    ris.codice.visite.forEach((v, k) => out.push({ fase: 3, visita: k }));
    out.push({ fase: 4, assembla: true });
    ris.esecuzione.eventi.forEach((e, k) => out.push({ fase: 4, evento: k }));
    return out;
  }

  function compila(sorgente, valori, opzioni) {
    const ott = !opzioni || opzioni.ottimizza !== false;
    const ris = { sorgente: sorgente, testo: '', token: [], variabili: [], valori: {}, albero: null, nodi: [], ordine: [], codice: null, alternativa: null, esecuzione: null, passi: [], inizioFase: [0, 0, 0, 0, 0], errore: null };
    const lex = lessico(sorgente);
    ris.testo = lex.testo;
    ris.token = lex.token;
    ris.variabili = variabiliDi(lex.token);
    const v = {};
    for (const t of lex.token) if (t.tipo === 'variabile') {
      const dato = valori && valori[t.testo];
      v[t.testo] = Number.isInteger(dato) && dato >= 0 && dato <= MAX_VALORE ? dato : valorePredefinito(t.testo);
    }
    ris.valori = v;
    if (!lex.ok) { ris.errore = lex.errore; return ris; }
    const sin = analizza(lex.token);
    ris.nodi = sin.nodi;
    if (!sin.ok) { ris.errore = sin.errore; return ris; }
    ris.albero = sin.albero;
    ris.ordine = sin.ordine;
    ris.profondita = sin.profondita;
    ris.codice = genera(sin.albero, v, { ottimizza: ott });
    ris.alternativa = genera(sin.albero, v, { ottimizza: !ott });
    if (!ris.codice.ok) { ris.errore = ris.codice.errore; return ris; }
    ris.esecuzione = esegui(ris.codice);
    if (!ris.esecuzione.ok) { ris.errore = ris.esecuzione.errore; return ris; }
    ris.atteso = valuta(sin.albero, v);
    ris.attesoMacchina = modulo256(ris.atteso);
    ris.passi = passiDi(ris);
    for (let f = 4; f >= 1; f -= 1) {
      const k = ris.passi.findIndex((x) => x.fase === f);
      ris.inizioFase[f] = k < 0 ? ris.passi.length : k;
    }
    return ris;
  }

  function spiegaToken(t, i, ris) {
    const prima = i > 0 ? ris.token[i - 1] : null;
    const spazi = (prima ? ris.testo.slice(prima.fine, t.inizio) : ris.testo.slice(0, t.inizio)).length > 0;
    const salto = spazi && i === ris.token.findIndex((x, k) => k > 0 && ris.testo.slice(ris.token[k - 1].fine, x.inizio).length > 0) ? ' Lo spazio prima non conta: il lexer lo salta.' : '';
    let s;
    if (t.tipo === 'variabile') s = '`' + t.testo + '` è una lettera sola: un token *variabile*.';
    else if (t.tipo === 'numero') s = t.testo.length > 1 ? '`' + t.testo + '`: ' + t.testo.length + ' cifre, ma un solo token *numero* (vale ' + t.valore + ').' : '`' + t.testo + '` è una cifra: un token *numero*.';
    else if (t.tipo === 'operatore') s = '`' + t.testo + '` è un *operatore*: ' + LA[t.testo] + '.';
    else if (t.tipo === 'uguale') s = '`=` è il segno di *assegnazione*: il risultato andrà nella variabile a sinistra.';
    else s = '`' + t.testo + '` è una *parentesi*: ' + (t.testo === '(' ? 'apre un gruppo da calcolare per primo.' : 'chiude il gruppo.');
    if (i === ris.token.length - 1) s += ' Fine della riga: ' + ris.testo.trim().length + ' caratteri sono diventati ' + ris.token.length + ' token.';
    return s + salto;
  }

  function spiegaFinale(ris) {
    const y = ris.codice.bersaglio;
    const valore = ris.esecuzione.valore;
    const formula = testoDi(ris.albero.dx, ris.valori, true);
    const vero = ris.atteso;
    let s = '**' + y + ' = ' + valore + '**. ';
    if (BigInt(valore) === vero) s += 'Controllo: ' + formula + ' = ' + vero + ', proprio come ha calcolato la macchina.';
    else {
      const cifre = vero.toString();
      const mostra = cifre.length > 14 ? 'un numero di ' + cifre.replace('-', '').length + ' cifre' : meno(cifre);
      s += vero < 0n
        ? 'Il conto vero (' + formula + ') fa ' + mostra + ', ma le celle da 8 bit non hanno numeri negativi: la macchina aggiunge 256 finché il numero torna fra 0 e 255, e scrive ' + valore + '.'
        : 'Il conto vero (' + formula + ') fa ' + mostra + ', ma le celle hanno 8 bit: la macchina tiene solo il resto della divisione per 256, cioè ' + valore + '.';
    }
    return s;
  }

  const Logica = {
    MEMORIA: MEMORIA,
    MAX_CARATTERI: MAX_CARATTERI,
    PRESET: PRESET,
    FASI: FASI,
    valorePredefinito: valorePredefinito,
    valida: valida,
    lessico: lessico,
    analizza: analizza,
    testoDi: testoDi,
    postordine: postordine,
    valuta: valuta,
    modulo256: modulo256,
    genera: genera,
    esegui: esegui,
    compila: compila,
    variabiliDi: variabiliDi,
    spiegaToken: spiegaToken,
    spiegaNodo: spiegaNodo,
    spiegaEvento: spiegaEvento,
    spiegaFinale: spiegaFinale,
  };

  /* ======================= interfaccia ======================= */

  const BREVE = ['', 'Lessico', 'Sintassi', 'Codice', 'Esecuzione'];
  const INTRO = [
    'Premi **▶ Compila ed esegui** e segui l\'istruzione attraverso le quattro fasi del compilatore, oppure usa **Passo** per andare avanti con calma.',
    'Il **lexer** legge i caratteri da sinistra a destra e li raggruppa in **token**, le parole del linguaggio. Come nel FORTRAN, gli spazi non contano.',
    'Il **parser** controlla la grammatica e sistema i token in un **albero sintattico**: gli operatori che vanno calcolati prima finiscono più in basso.',
    'Il **generatore di codice** visita l\'albero in ordine posticipato, prima i figli e poi il padre, e scrive le istruzioni per la CPU giocattolo.',
    'L\'**assemblatore** traduce ogni riga in una parola da 8 bit; poi la **CPU** esegue il programma un\'istruzione alla volta.',
  ];
  const LEGENDA = [['variabile', 'variabile'], ['numero', 'numero'], ['operatore', 'operatore'], ['uguale', 'assegnazione'], ['parentesi', 'parentesi'], ['temporanea', 'temporanea'], ['ora', 'adesso: accumulatore, passo in corso']];

  const css = `
    .lab-compilatore { container: lab-compilatore / inline-size; --lc-var: var(--trace-3); --lc-num: var(--trace-2); --lc-op: var(--trace-4); --lc-ug: var(--trace-1); --lc-par: #c5d3cc; --lc-tmp: #c9a9ff; --lc-ora: #f2fbf7; --lc-err: #ff8f80; --lc-nero: #050a08; }
    .lab-compilatore [hidden] { display: none !important; }
    .lab-compilatore .is-variabile, .lab-compilatore .is-risultato { --k: var(--lc-var); }
    .lab-compilatore .is-numero, .lab-compilatore .is-costante { --k: var(--lc-num); }
    .lab-compilatore .is-operatore { --k: var(--lc-op); }
    .lab-compilatore .is-uguale, .lab-compilatore .is-uscita { --k: var(--lc-ug); }
    .lab-compilatore .is-parentesi { --k: var(--lc-par); }
    .lab-compilatore .is-temporanea { --k: var(--lc-tmp); }
    .lab-compilatore .is-ora { --k: var(--lc-ora); }

    .lab-compilatore-barra { align-items: flex-end; gap: 12px 18px; }
    .lab-compilatore-scrivi { display: grid; gap: 6px; flex: 1 1 280px; min-width: 0; }
    .lab-compilatore-tit { font: 700 13px var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--lab-text); }
    .lab-compilatore-campo { width: 100%; min-height: 46px; font-size: 1.15rem; letter-spacing: .05em; color: var(--lab-bright); }
    .lab-compilatore-campo[aria-invalid="true"], .lab-compilatore-num[aria-invalid="true"] { border-color: var(--lc-err); color: #ffc9c0; }
    .lab-compilatore-aiuto { margin: 0; font-size: 13px; line-height: 1.45; color: var(--lab-text); opacity: .9; }
    .lab-compilatore-esempi { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .lab-compilatore-esempi .lab-compilatore-tit { flex-basis: 100%; }
    .lab-compilatore-preset { font: 700 14px var(--mono); letter-spacing: .02em; }
    .lab-compilatore-barra-valori { gap: 8px 14px; }
    .lab-compilatore-valori { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
    .lab-compilatore-var { display: inline-flex; align-items: center; gap: 7px; font: 800 15px var(--mono); color: var(--lc-var); }
    .lab-compilatore-num { width: 3.6em; text-align: center; font-size: 1.02rem; color: var(--lc-var); }
    .lab-compilatore-errore { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; margin: 0; padding: 11px 18px; border-bottom: 1px solid var(--lab-line); background: rgba(255, 120, 100, .09); color: #ffd2ca; font-size: .95rem; line-height: 1.5; }
    .lab-compilatore-errore b { font: 800 13px var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--lc-err); }

    .lab-compilatore-fasi { list-style: none; margin: 0; padding: 14px 16px 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    .lab-compilatore-fase { position: relative; width: 100%; min-height: 58px; display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 0 10px; padding: 8px 10px 11px; text-align: left; border-radius: 10px; border: 1px solid var(--lab-line); background: var(--lab-panel); color: var(--lab-text); font: inherit; cursor: pointer; overflow: hidden; transition: border-color var(--pg-dur-veloce) ease, background-color var(--pg-dur-veloce) ease; }
    .lab-compilatore-fase:hover:not(:disabled) { border-color: color-mix(in srgb, var(--lc-ora) 50%, var(--lab-line)); }
    .lab-compilatore-fase:disabled { cursor: not-allowed; opacity: .5; }
    .lab-compilatore-fase-num { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid currentColor; font: 800 14px/1 var(--mono); }
    .lab-compilatore-fase-testo { display: grid; min-width: 0; }
    .lab-compilatore-fase b { font-size: 14px; line-height: 1.25; color: var(--lab-bright); }
    .lab-compilatore-fase small { font-size: 13px; line-height: 1.3; color: var(--lab-text); }
    .lab-compilatore-fase[aria-current="step"] { border-color: var(--lc-ora); background: color-mix(in srgb, var(--lc-ora) 7%, var(--lab-panel)); }
    .lab-compilatore-fase[aria-current="step"] .lab-compilatore-fase-num { color: var(--lc-ora); }
    .lab-compilatore-fase.is-fatta .lab-compilatore-fase-num { background: var(--lc-ug); border-color: transparent; color: #04150d; }
    .lab-compilatore-fase-prog { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; }
    .lab-compilatore-fase-prog i { display: block; height: 100%; background: var(--lc-ora); transform: scaleX(0); transform-origin: left center; transition: transform var(--pg-dur-normale) var(--pg-ease-smooth); }
    .lab-compilatore-fase.is-fatta .lab-compilatore-fase-prog i { background: var(--lc-ug); }

    .lab-compilatore-banco { display: grid; gap: 12px; padding: 14px 16px 16px; grid-template-columns: minmax(0, 1fr); }
    .lab-compilatore-colonna { display: contents; }
    .lab-compilatore-pannello { min-width: 0; padding: 10px 12px 12px; background: var(--lab-panel); border: 1px solid var(--lab-line); border-radius: 12px; transition: border-color var(--pg-dur-normale) ease; }
    .lab-compilatore-pannello.is-attivo { border-color: color-mix(in srgb, var(--lc-ora) 42%, var(--lab-line)); }
    .lab-compilatore-ptit { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; margin: 0 0 9px; font: 800 13px var(--mono); letter-spacing: .09em; text-transform: uppercase; color: var(--lab-bright); }
    .lab-compilatore-ptit small { font: 500 13px var(--font); letter-spacing: 0; text-transform: none; color: var(--lab-text); }

    .lab-compilatore-scorri { overflow-x: auto; scrollbar-width: thin; padding-bottom: 2px; }
    .lab-compilatore-caratteri { display: inline-flex; vertical-align: top; border: 1px solid var(--lab-line); border-radius: 6px; overflow: hidden; background: var(--lc-nero); }
    .lab-compilatore-car { display: grid; place-items: center; width: 24px; height: 36px; font: 700 17px/1 var(--mono); color: color-mix(in srgb, var(--lab-bright) 88%, transparent); border-right: 1px solid color-mix(in srgb, var(--lab-line) 75%, transparent); transition: background-color var(--pg-dur-veloce) ease, color var(--pg-dur-veloce) ease; }
    .lab-compilatore-car:last-child { border-right: 0; }
    .lab-compilatore-car.is-spazio { background: repeating-linear-gradient(135deg, transparent 0 4px, rgba(255, 255, 255, .025) 4px 6px); }
    .lab-compilatore-car.is-letto { color: var(--k); background: color-mix(in srgb, var(--k) 13%, var(--lc-nero)); }
    .lab-compilatore-car.is-ora { color: var(--lc-nero); background: var(--k); }
    .lab-compilatore-car.is-saltato { opacity: .45; }
    .lab-compilatore-car.is-errore { color: #ffe3de; background: rgba(255, 120, 100, .32); box-shadow: inset 0 -3px 0 var(--lc-err); }

    .lab-compilatore-lavagna { position: relative; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; background: var(--lc-nero); border: 1px solid var(--lab-line); border-radius: 9px; }
    .lab-compilatore-tela { position: relative; width: 100%; margin: 0 auto; }
    .lab-compilatore-rami { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
    .lab-compilatore-rami line { stroke: color-mix(in srgb, var(--lab-text) 55%, transparent); stroke-width: 2; stroke-linecap: round; opacity: 0; }
    .lab-compilatore-rami line.is-visibile { opacity: 1; }
    .lab-compilatore-fila { position: absolute; left: 10px; right: 10px; top: 56px; border-top: 1px dashed color-mix(in srgb, var(--lab-text) 26%, transparent); }
    .lab-compilatore-chip, .lab-compilatore-fantasma { position: absolute; translate: -50% -50%; min-width: 30px; height: 32px; padding: 0 7px; border-radius: 8px; }
    .lab-compilatore-chip { z-index: 2; display: inline-flex; align-items: center; justify-content: center; font: 800 16px/1 var(--mono); white-space: nowrap; color: var(--k); background: color-mix(in srgb, var(--k) 15%, #070d0b); border: 1.5px solid color-mix(in srgb, var(--k) 72%, transparent); opacity: 0; will-change: transform; transition: box-shadow var(--pg-dur-veloce) ease, background-color var(--pg-dur-veloce) ease; }
    .lab-compilatore-chip.is-visibile { opacity: 1; }
    .lab-compilatore-chip.is-nuovo { box-shadow: 0 0 0 3px color-mix(in srgb, var(--k) 35%, transparent); }
    .lab-compilatore-chip.is-visitato { background: color-mix(in srgb, var(--k) 30%, #070d0b); }
    .lab-compilatore-chip.is-usato { background: color-mix(in srgb, var(--k) 8%, #070d0b); border-style: dashed; }
    .lab-compilatore-chip.is-esegue { box-shadow: 0 0 0 3px var(--lc-ora), 0 0 20px color-mix(in srgb, var(--lc-ora) 45%, transparent); }
    .lab-compilatore-chip.is-errore { border-color: var(--lc-err); box-shadow: 0 0 0 3px rgba(255, 120, 100, .35); }
    .lab-compilatore-fantasma { z-index: 1; border: 1.5px dashed color-mix(in srgb, var(--lab-text) 30%, transparent); opacity: 0; transition: opacity var(--pg-dur-normale) ease; }
    .lab-compilatore-fantasma.is-visibile { opacity: 1; }
    .lab-compilatore-badge { position: absolute; z-index: 3; translate: -50% 0; padding: 3px 6px; border-radius: 6px; font: 700 13px/1 var(--mono); white-space: nowrap; color: var(--k, var(--lab-text)); background: #070d0b; border: 1px solid color-mix(in srgb, var(--k, var(--lab-text)) 55%, transparent); opacity: 0; transition: opacity var(--pg-dur-veloce) ease; }
    .lab-compilatore-badge.is-visibile { opacity: 1; }
    .lab-compilatore-badge.is-ora { color: #06100c; background: var(--lc-ora); border-color: transparent; }
    .lab-compilatore-badge.is-pop { animation: lab-compilatore-pop var(--pg-dur-normale) var(--pg-ease-bounce); }
    @keyframes lab-compilatore-pop { from { transform: scale(.4); } to { transform: none; } }
    .lab-compilatore-anello { position: absolute; z-index: 1; width: 48px; height: 48px; translate: -50% -50%; border-radius: 50%; border: 2.5px solid var(--lc-ora); box-shadow: 0 0 18px color-mix(in srgb, var(--lc-ora) 38%, transparent); opacity: 0; pointer-events: none; will-change: transform; }
    .lab-compilatore-anello.is-visibile { opacity: 1; }
    .lab-compilatore-vuoto { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; padding: 16px; text-align: center; font-size: 14px; line-height: 1.5; color: var(--lab-text); }
    .lab-compilatore-legenda { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 10px 0 0; padding: 0; list-style: none; font-size: 13px; color: var(--lab-text); }
    .lab-compilatore-legenda li { display: inline-flex; align-items: center; gap: 6px; }
    .lab-compilatore-legenda i { width: 12px; height: 12px; border-radius: 3px; background: color-mix(in srgb, var(--k) 28%, transparent); border: 1.5px solid var(--k); }

    .lab-compilatore-phead { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; margin-bottom: 9px; }
    .lab-compilatore-phead .lab-compilatore-ptit { margin: 0; }
    .lab-compilatore-ott { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--lab-text); }
    .lab-compilatore-ott .pg-btn { min-width: 52px; }
    .lab-compilatore-memoria { display: grid; gap: 6px; margin: 0 0 10px; }
    .lab-compilatore-segmenti { display: grid; grid-template-columns: repeat(31, minmax(0, 1fr)); gap: 2px; height: 10px; }
    .lab-compilatore-segmenti i { border-radius: 2px; background: color-mix(in srgb, var(--lab-text) 14%, transparent); transition: background-color var(--pg-dur-veloce) ease; }
    .lab-compilatore-segmenti i.is-istr { background: color-mix(in srgb, var(--lab-bright) 72%, transparent); }
    .lab-compilatore-segmenti i.is-dato { background: var(--k); }
    .lab-compilatore-segmenti i.is-troppo { background: var(--lc-err); }
    .lab-compilatore-memoria-testo { font: 600 13px var(--mono); color: var(--lab-text); }
    .lab-compilatore-memoria.is-piena .lab-compilatore-memoria-testo { color: var(--lc-err); }
    .lab-compilatore-listato { position: relative; overflow-x: auto; scrollbar-width: thin; padding: 6px 0; min-height: 120px; background: var(--lc-nero); border: 1px solid var(--lab-line); border-radius: 9px; }
    .lab-compilatore-righe { list-style: none; margin: 0; padding: 0; font: 14px/28px var(--mono); }
    .lab-compilatore-riga { position: relative; z-index: 1; display: grid; grid-template-columns: 2.2ch 9.2ch 4ch 5.6ch 4ch minmax(0, 1fr); column-gap: 9px; padding: 0 12px; white-space: nowrap; color: var(--lab-bright); }
    .lab-compilatore-ind, .lab-compilatore-bin { color: var(--lab-text); opacity: .45; }
    .lab-compilatore-righe.is-assemblato .lab-compilatore-ind, .lab-compilatore-righe.is-assemblato .lab-compilatore-bin { opacity: .9; }
    .lab-compilatore-eti, .lab-compilatore-arg { color: var(--k, var(--lab-bright)); font-weight: 700; }
    .lab-compilatore-op { font-weight: 700; }
    .lab-compilatore-op.is-operatore { color: var(--lc-op); }
    .lab-compilatore-val { color: var(--lc-ora); font-weight: 700; }
    .lab-compilatore-riga.is-risultato .lab-compilatore-val { color: var(--lc-ug); }
    .lab-compilatore-riga.is-nuova { background: color-mix(in srgb, var(--lc-ora) 7%, transparent); }
    .lab-compilatore-riga.is-entra { animation: lab-compilatore-entra var(--pg-dur-normale) var(--pg-ease-smooth) both; }
    @keyframes lab-compilatore-entra { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: none; } }
    .lab-compilatore-riga.is-assembla .lab-compilatore-ind, .lab-compilatore-riga.is-assembla .lab-compilatore-bin { animation: lab-compilatore-appare var(--pg-dur-normale) ease both; animation-delay: inherit; }
    @keyframes lab-compilatore-appare { from { opacity: 0; } to { opacity: .9; } }
    .lab-compilatore-riga.is-letta { animation: lab-compilatore-letta 800ms ease-out; }
    @keyframes lab-compilatore-letta { from { background-color: color-mix(in srgb, var(--k, var(--lc-ora)) 32%, transparent); } to { background-color: transparent; } }
    .lab-compilatore-riga.is-scritta { animation: lab-compilatore-scritta 900ms ease-out; }
    @keyframes lab-compilatore-scritta { from { background-color: color-mix(in srgb, var(--lc-ug) 38%, transparent); } to { background-color: transparent; } }
    .lab-compilatore-sep { display: flex; align-items: center; gap: 10px; padding: 0 12px; font: 600 13px/26px var(--mono); color: var(--lab-text); }
    .lab-compilatore-sep::after { content: ""; flex: 1; border-top: 1px dashed color-mix(in srgb, var(--lab-text) 30%, transparent); }
    .lab-compilatore-pc { position: absolute; left: 0; right: 0; top: 0; height: 28px; z-index: 0; background: color-mix(in srgb, var(--lc-ora) 15%, transparent); box-shadow: inset 3px 0 0 var(--lc-ora); opacity: 0; pointer-events: none; transition: transform var(--pg-dur-normale) var(--pg-ease-sharp), opacity var(--pg-dur-veloce) ease; will-change: transform; }
    .lab-compilatore-pc.is-visibile { opacity: 1; }
    .lab-compilatore-pc.is-pronto { opacity: .5; }
    .lab-compilatore-vuoto-cod { margin: 0; padding: 26px 16px; text-align: center; font-size: 14px; line-height: 1.5; color: var(--lab-text); }
    .lab-compilatore-confronto { margin: 9px 0 0; font-size: 13px; line-height: 1.5; color: var(--lab-text); }

    .lab-compilatore-pannello.is-cpu { container: lab-compilatore-cpu / inline-size; }
    .lab-compilatore-registri { display: grid; grid-template-columns: auto auto minmax(0, 1fr); gap: 8px; }
    @container lab-compilatore-cpu (max-width: 330px) {
      .lab-compilatore-registri { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .lab-compilatore-reg.is-out { grid-column: 1 / -1; }
    }
    .lab-compilatore-reg { display: grid; gap: 1px; min-width: 64px; padding: 6px 12px 8px; background: var(--lc-nero); border: 1px solid var(--lab-line); border-radius: 9px; }
    .lab-compilatore-reg span { font: 700 13px var(--mono); letter-spacing: .05em; color: var(--lab-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .lab-compilatore-reg b { font: 800 1.4rem/1.25 var(--mono); color: var(--lab-bright); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .lab-compilatore-reg.is-acc { border-color: color-mix(in srgb, var(--lc-ora) 35%, var(--lab-line)); }
    .lab-compilatore-reg.is-acc b { color: var(--lc-ora); }
    .lab-compilatore-reg.is-out { border-color: color-mix(in srgb, var(--lc-ug) 40%, var(--lab-line)); }
    .lab-compilatore-reg.is-out b { color: var(--lc-ug); }
    .lab-compilatore-reg b.is-cambia { animation: lab-compilatore-tic var(--pg-dur-normale) var(--pg-ease-smooth); }
    @keyframes lab-compilatore-tic { from { opacity: .15; transform: translateY(-45%); } to { opacity: 1; transform: none; } }
    .lab-compilatore-cpu-stato { margin: 9px 0 0; font-size: 13px; color: var(--lab-text); }
    .lab-compilatore-esito { display: grid; gap: 2px; margin: 10px 0 0; padding: 10px 13px; border-radius: 10px; font-size: .95rem; line-height: 1.5; color: var(--lab-bright); background: color-mix(in srgb, var(--lc-ug) 10%, transparent); border: 1px solid color-mix(in srgb, var(--lc-ug) 42%, transparent); }
    .lab-compilatore-esito strong { font: 800 1.35rem/1.3 var(--mono); color: var(--lc-ug); }
    .lab-compilatore-esito.is-trabocca strong { color: var(--lc-num); }
    .lab-compilatore-esito.is-trabocca { background: color-mix(in srgb, var(--lc-num) 10%, transparent); border-color: color-mix(in srgb, var(--lc-num) 45%, transparent); }
    .lab-compilatore-esito.is-entra { animation: lab-compilatore-entra var(--pg-dur-lenta) var(--pg-ease-smooth) both; }

    .lab-compilatore-comandi { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
    .lab-compilatore-vai { min-width: 196px; }
    .lab-compilatore-vel { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-left: auto; font-size: 13px; color: var(--lab-text); }
    .lab-compilatore .lab-compilatore-spiega { min-height: 5.4em; margin: 0; padding: 12px 16px; border: 1px solid var(--lab-line); border-radius: 12px; background: var(--lab-panel); }
    .lab-compilatore .lab-compilatore-spiega p { margin: 0; }
    .lab-compilatore-tag { display: inline-block; margin: 0 8px 2px 0; padding: 3px 9px 2px; border-radius: 999px; font: 800 13px/1.3 var(--mono); color: #06100c; background: var(--lc-ora); vertical-align: 1px; }
    .lab-compilatore-tag.is-errore { background: var(--lc-err); }

    @container lab-compilatore (min-width: 700px) {
      .lab-compilatore-banco { grid-template-columns: minmax(0, 1.12fr) minmax(0, 1fr); align-items: start; }
      .lab-compilatore-colonna { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
    }
    @container lab-compilatore (max-width: 760px) {
      .lab-compilatore-fasi { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @container lab-compilatore (max-width: 640px) {
      .lab-compilatore-esempi .lab-compilatore-tit { flex-basis: auto; }
    }
    @container lab-compilatore (max-width: 460px) {
      .lab-compilatore-banco { padding: 12px 10px 14px; gap: 10px; }
      .lab-compilatore-fasi { padding: 12px 10px 0; gap: 6px; }
      .lab-compilatore-fase { padding: 7px 8px 10px; gap: 0 8px; }
      .lab-compilatore-pannello { padding: 9px 9px 10px; }
      .lab-compilatore-car { width: 20px; height: 34px; font-size: 16px; }
      .lab-compilatore-chip, .lab-compilatore-fantasma { min-width: 26px; padding: 0 5px; }
      .lab-compilatore-chip { font-size: 15px; }
      .lab-compilatore-righe { font-size: 13px; line-height: 27px; }
      .lab-compilatore-riga { column-gap: 7px; padding: 0 9px; }
      .lab-compilatore-pc { height: 27px; }
      .lab-compilatore-reg { min-width: 0; padding: 6px 9px 7px; }
      .lab-compilatore-vel { margin-left: 0; }
      .lab-compilatore-vai { min-width: 0; flex: 1 1 100%; }
    }
    @container lab-compilatore (max-width: 400px) {
      .lab-compilatore-car { width: 18px; font-size: 15px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .lab-compilatore-pc, .lab-compilatore-fase-prog i, .lab-compilatore-fantasma, .lab-compilatore-pannello, .lab-compilatore-segmenti i, .lab-compilatore-car, .lab-compilatore-badge, .lab-compilatore-chip { transition: none; }
      .lab-compilatore-riga.is-entra, .lab-compilatore-riga.is-letta, .lab-compilatore-riga.is-scritta, .lab-compilatore-reg b.is-cambia, .lab-compilatore-badge.is-pop, .lab-compilatore-esito.is-entra,
      .lab-compilatore-riga.is-assembla .lab-compilatore-ind, .lab-compilatore-riga.is-assembla .lab-compilatore-bin { animation: none; }
    }
  `;

  function monta(el, ctx) {
    const { h, s } = ctx;
    const D = ctx.DURATA;
    const C = cpu();
    const id = ctx.uid('compilatore');
    const Y_FILA = 28;
    const Y_ALBERO = 102;
    const stato = { sorgente: PRESET[0], valori: {}, testi: {}, ottimizza: true, velocita: 'normale', ris: null, cursore: 0, inCorsa: false, epoca: 0, completato: false, erroreValore: null, timer: 0 };
    let V = null;

    const silenzia = (err) => { if (!ctx.annullato(err)) console.error(err); };
    const fattore = () => ({ lenta: 1.7, normale: 1, veloce: 0.45 })[stato.velocita];
    const semplice = (t) => String(t).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*([^*\s][^*]*?)\*/g, '$1').replace(/`/g, '');
    const due = (n) => String(n).padStart(2, '0');
    const valoreDi = (l) => (stato.valori[l] != null ? stato.valori[l] : valorePredefinito(l));
    const nodo = (nid) => stato.ris.nodi[Number(nid.slice(1))];

    /* ---------- barra della sorgente ---------- */

    const campo = h('input', {
      class: 'pg-campo lab-compilatore-campo', id: id + '-src', type: 'text', value: stato.sorgente, maxlength: String(MAX_CARATTERI),
      spellcheck: 'false', autocomplete: 'off', autocapitalize: 'characters', 'aria-describedby': id + '-aiuto ' + id + '-err',
    });
    campo.addEventListener('input', () => {
      clearTimeout(stato.timer);
      stato.timer = setTimeout(() => cambiaSorgente(campo.value), 300);
    });
    campo.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      clearTimeout(stato.timer);
      if (campo.value !== stato.sorgente) cambiaSorgente(campo.value);
      gioca();
    });
    const bottoniPreset = PRESET.map((p) => h('button', {
      type: 'button', class: 'pg-btn lab-compilatore-preset', 'aria-pressed': 'false',
      onclick: () => { clearTimeout(stato.timer); campo.value = p; cambiaSorgente(p); },
    }, p));
    const barraSorgente = h('div', { class: 'pg-strumenti lab-compilatore-barra' },
      h('div', { class: 'lab-compilatore-scrivi' },
        h('label', { class: 'lab-compilatore-tit', for: campo.id }, 'Istruzione FORTRAN'),
        campo,
        h('p', { class: 'lab-compilatore-aiuto', id: id + '-aiuto' }, 'Variabili di una lettera, numeri da 0 a 255, + − *, = e parentesi. Niente divisione: la CPU giocattolo non sa dividere.')),
      h('div', { class: 'lab-compilatore-esempi', role: 'group', 'aria-labelledby': id + '-es' },
        h('span', { class: 'lab-compilatore-tit', id: id + '-es' }, 'Esempi'), bottoniPreset));

    const valoriBox = h('div', { class: 'lab-compilatore-valori' });
    const barraValori = h('div', { class: 'pg-strumenti lab-compilatore-barra-valori', role: 'group', 'aria-labelledby': id + '-val' },
      h('span', { class: 'lab-compilatore-tit', id: id + '-val' }, 'Valori'), valoriBox,
      h('span', { class: 'lab-compilatore-aiuto', id: id + '-vaiuto' }, 'interi da 0 a 255'));
    const erroreBox = h('p', { class: 'lab-compilatore-errore', id: id + '-err', hidden: true });

    /* ---------- le quattro fasi ---------- */

    const bottoniFase = FASI.map((f, k) => h('button', { type: 'button', class: 'lab-compilatore-fase', onclick: () => vaiAFase(k + 1) },
      h('span', { class: 'lab-compilatore-fase-num', 'aria-hidden': 'true' }, String(k + 1)),
      h('span', { class: 'lab-compilatore-fase-testo' }, h('b', null, f.nome), h('small', null, f.sotto)),
      h('span', { class: 'lab-compilatore-fase-prog', 'aria-hidden': 'true' }, h('i'))));
    const fasi = h('ol', { class: 'lab-compilatore-fasi', 'aria-label': 'Le quattro fasi del compilatore: scegline una per andarci' }, bottoniFase.map((b) => h('li', null, b)));

    /* ---------- banco: sorgente, albero, codice, CPU ---------- */

    const caratteri = h('div', { class: 'lab-compilatore-caratteri', 'aria-hidden': 'true' });
    const pannSorgente = h('section', { class: 'lab-compilatore-pannello is-sorgente', 'aria-labelledby': id + '-p1' },
      h('h4', { class: 'lab-compilatore-ptit', id: id + '-p1' }, 'Sorgente', h('small', null, 'una casella per carattere, come sul modulo di codifica')),
      h('div', { class: 'lab-compilatore-scorri' }, caratteri));

    const rami = s('svg', { class: 'lab-compilatore-rami', 'aria-hidden': 'true' });
    const tela = h('div', { class: 'lab-compilatore-tela' });
    const lavagna = h('div', { class: 'lab-compilatore-lavagna', role: 'img', 'aria-label': '' }, tela);
    const pannAlbero = h('section', { class: 'lab-compilatore-pannello is-albero', 'aria-labelledby': id + '-p2' },
      h('h4', { class: 'lab-compilatore-ptit', id: id + '-p2' }, 'Token e albero sintattico'),
      lavagna,
      h('ul', { class: 'lab-compilatore-legenda', 'aria-label': 'Legenda dei colori' }, LEGENDA.map(([k, t]) => h('li', { class: 'is-' + k }, h('i', { 'aria-hidden': 'true' }), t))));

    const bottoniOtt = [[true, 'Sì'], [false, 'No']].map(([v, t]) => h('button', { type: 'button', class: 'pg-btn', 'aria-pressed': String(v === stato.ottimizza), onclick: () => scegliOttimizza(v) }, t));
    const segmenti = Array.from({ length: MEMORIA }, () => h('i'));
    const memoriaTesto = h('span', { class: 'lab-compilatore-memoria-testo' });
    const memoria = h('div', { class: 'lab-compilatore-memoria' }, h('div', { class: 'lab-compilatore-segmenti', 'aria-hidden': 'true' }, segmenti), memoriaTesto);
    const listaRighe = h('ol', { class: 'lab-compilatore-righe', 'aria-label': 'Programma per la CPU giocattolo' });
    const barraPc = h('div', { class: 'lab-compilatore-pc', 'aria-hidden': 'true' });
    const vuotoCodice = h('p', { class: 'lab-compilatore-vuoto-cod' }, 'Qui comparirà il programma per la CPU giocattolo.');
    const listato = h('div', { class: 'lab-compilatore-listato' }, barraPc, listaRighe, vuotoCodice);
    const confronto = h('p', { class: 'lab-compilatore-confronto' });
    const pannCodice = h('section', { class: 'lab-compilatore-pannello is-codice', 'aria-labelledby': id + '-p3' },
      h('div', { class: 'lab-compilatore-phead' },
        h('h4', { class: 'lab-compilatore-ptit', id: id + '-p3' }, 'Codice per la CPU giocattolo'),
        h('div', { class: 'lab-compilatore-ott', role: 'group', 'aria-labelledby': id + '-ott' }, h('span', { id: id + '-ott' }, 'Ottimizzazione'), h('span', { class: 'pg-gruppo' }, bottoniOtt))),
      memoria, listato, confronto);

    const regPc = h('b', null, '—');
    const regAcc = h('b', null, '—');
    const regOut = h('b', null, '—');
    const cpuStato = h('p', { class: 'lab-compilatore-cpu-stato' }, 'La CPU aspetta il programma.');
    const esito = h('p', { class: 'lab-compilatore-esito', hidden: true });
    const pannCpu = h('section', { class: 'lab-compilatore-pannello is-cpu', 'aria-labelledby': id + '-p4' },
      h('h4', { class: 'lab-compilatore-ptit', id: id + '-p4' }, 'CPU giocattolo', h('small', null, '32 celle da 8 bit')),
      h('div', { class: 'lab-compilatore-registri' },
        h('div', { class: 'lab-compilatore-reg' }, h('span', null, 'PC'), regPc),
        h('div', { class: 'lab-compilatore-reg is-acc' }, h('span', null, 'ACC'), regAcc),
        h('div', { class: 'lab-compilatore-reg is-out' }, h('span', null, 'Uscita · cella 31'), regOut)),
      cpuStato, esito);

    const btnVai = h('button', { type: 'button', class: 'pg-btn pg-btn--primario lab-compilatore-vai', onclick: () => gioca() }, '▶ Compila ed esegui');
    const btnPasso = h('button', { type: 'button', class: 'pg-btn', onclick: () => passoManuale() }, 'Passo ›');
    const btnDaCapo = h('button', { type: 'button', class: 'pg-btn', onclick: () => daCapo() }, '↺ Da capo');
    const bottoniVel = [['lenta', 'Lenta'], ['normale', 'Normale'], ['veloce', 'Veloce']].map(([v, t]) => h('button', {
      type: 'button', class: 'pg-btn', 'aria-pressed': String(v === stato.velocita), onclick: () => scegliVelocita(v),
    }, t));
    const comandi = h('div', { class: 'lab-compilatore-comandi' }, btnVai, btnPasso, btnDaCapo,
      h('div', { class: 'lab-compilatore-vel', role: 'group', 'aria-labelledby': id + '-vel' }, h('span', { id: id + '-vel' }, 'Velocità'), h('span', { class: 'pg-gruppo' }, bottoniVel)));
    const spiega = h('div', { class: 'pg-spiega lab-compilatore-spiega' });

    const banco = h('div', { class: 'lab-compilatore-banco' },
      h('div', { class: 'lab-compilatore-colonna is-sx' }, pannSorgente, pannAlbero, comandi, spiega),
      h('div', { class: 'lab-compilatore-colonna is-dx' }, pannCodice, pannCpu));
    el.append(h('div', { class: 'lab-compilatore' }, barraSorgente, barraValori, erroreBox, fasi, banco));

    /* ---------- valori delle variabili ---------- */

    function renderValori() {
      const lettere = stato.ris ? stato.ris.variabili : [];
      const chiave = lettere.join('');
      if (valoriBox.dataset.chiave === chiave && valoriBox.childNodes.length) return;
      valoriBox.dataset.chiave = chiave;
      valoriBox.replaceChildren();
      if (!lettere.length) {
        valoriBox.append(h('span', { class: 'lab-compilatore-aiuto' }, stato.ris && stato.ris.token.length ? 'nessuna variabile nella formula: solo numeri' : '—'));
        return;
      }
      for (const l of lettere) {
        const inp = h('input', {
          class: 'pg-campo lab-compilatore-num', id: id + '-v-' + l, type: 'text', inputmode: 'numeric', maxlength: '3',
          autocomplete: 'off', spellcheck: 'false', value: stato.testi[l] != null ? stato.testi[l] : String(valoreDi(l)), 'aria-describedby': id + '-vaiuto',
        });
        inp.addEventListener('input', () => cambiaValore(l, inp));
        inp.addEventListener('keydown', (e) => {
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
          e.preventDefault();
          const r = valida(inp.value, l);
          const base = r.ok ? r.valore : valoreDi(l);
          inp.value = String(Math.max(0, Math.min(MAX_VALORE, base + (e.key === 'ArrowUp' ? 1 : -1))));
          cambiaValore(l, inp);
        });
        valoriBox.append(h('label', { class: 'lab-compilatore-var', for: inp.id }, l + ' =', inp));
      }
    }

    function controllaValori() {
      for (const l of stato.ris ? stato.ris.variabili : []) {
        const t = stato.testi[l];
        if (t == null) continue;
        const r = valida(t, l);
        if (!r.ok) return r.errore;
      }
      return null;
    }

    function cambiaValore(l, inp) {
      stato.testi[l] = inp.value;
      const r = valida(inp.value, l);
      inp.setAttribute('aria-invalid', String(!r.ok));
      if (r.ok) stato.valori[l] = r.valore;
      const prima = stato.erroreValore;
      stato.erroreValore = controllaValori();
      ricompila({ cursore: stato.cursore });
      if (stato.erroreValore) { if (stato.erroreValore !== prima) narraErrore(); }
      else if (prima) scrivi(0, 'Valori a posto. ' + INTRO[0]);
      else if (stato.cursore > 0) scrivi(0, 'Nuovo valore: **' + l + ' = ' + r.valore + '**. Cambiano solo le celle dei dati, il programma resta lo stesso.');
    }

    /* ---------- costruzione della vista ---------- */

    function costruisci() {
      const R = stato.ris;
      V = { celle: [], chip: [], fantasmi: [], nodoDiToken: {}, pos: {}, padre: {}, rami: {}, badge: {}, righe: [], dati: [], anello: null, vuoto: null };
      // sorgente: una casella per carattere
      for (let i = 0; i < R.testo.length; i++) {
        const ch = R.testo[i];
        const sp = /\s/.test(ch);
        V.celle.push(h('span', { class: 'lab-compilatore-car' + (sp ? ' is-spazio' : '') }, sp ? ' ' : ch));
      }
      R.token.forEach((t, i) => { for (let k = t.inizio; k < t.fine; k++) { V.celle[k].dataset.token = String(i); V.celle[k].classList.add('is-' + t.tipo); } });
      caratteri.replaceChildren(...V.celle);
      if (!V.celle.length) caratteri.append(h('span', { class: 'lab-compilatore-car is-spazio' }, ' '));

      // lavagna: i token in fila e, sotto, l'albero; ogni nodo sta nella colonna del suo token
      rami.replaceChildren();
      tela.replaceChildren(rami);
      const n = R.token.length;
      const conAlbero = !!R.albero;
      const prof = conAlbero ? R.profondita : 0;
      const lh = prof ? Math.max(50, Math.min(64, Math.round(260 / prof))) : 0;
      const colMin = Math.max(30, ...R.token.map((t) => t.testo.length * 10 + 18));
      tela.style.height = (conAlbero ? Y_ALBERO + prof * lh + 46 : 150) + 'px';
      tela.style.minWidth = Math.max(n, 1) * colMin + 'px';
      tela.style.maxWidth = Math.max(n * 86, 280) + 'px';
      const x = (i) => ((i + 0.5) / Math.max(n, 1)) * 100;
      if (n) tela.append(h('span', { class: 'lab-compilatore-fila', 'aria-hidden': 'true' }));
      R.token.forEach((t, i) => {
        const pos = 'left:' + x(i) + '%;top:' + Y_FILA + 'px';
        const f = h('span', { class: 'lab-compilatore-fantasma', style: pos, 'aria-hidden': 'true' });
        const c = h('span', { class: 'lab-compilatore-chip is-' + t.tipo, style: pos, 'aria-hidden': 'true' }, t.testo);
        V.fantasmi.push(f);
        V.chip.push(c);
        tela.append(f);
      });
      if (conAlbero) {
        for (const nd of R.nodi) {
          const y = Y_ALBERO + nd.livello * lh;
          V.pos[nd.id] = { x: x(nd.token), y: y, dy: y - Y_FILA };
          V.nodoDiToken[nd.token] = nd;
          if (nd.sx) { V.padre[nd.sx.id] = nd; V.padre[nd.dx.id] = nd; }
        }
        for (const nd of R.nodi) {
          const p = V.padre[nd.id];
          if (!p) continue;
          const a = V.pos[p.id];
          const b = V.pos[nd.id];
          V.rami[nd.id] = s('line', { x1: a.x + '%', y1: a.y, x2: b.x + '%', y2: b.y });
          rami.append(V.rami[nd.id]);
        }
      }
      V.anello = h('span', { class: 'lab-compilatore-anello', 'aria-hidden': 'true' });
      tela.append(V.anello, ...V.chip);
      if (conAlbero) {
        for (const nd of R.nodi) {
          V.badge[nd.id] = h('span', { class: 'lab-compilatore-badge', style: 'left:' + V.pos[nd.id].x + '%;top:' + (V.pos[nd.id].y + 21) + 'px', 'aria-hidden': 'true' });
          tela.append(V.badge[nd.id]);
        }
      }
      V.vuoto = h('p', { class: 'lab-compilatore-vuoto' }, 'Qui il lexer metterà i token; poi il parser li sistemerà in un albero.');
      tela.append(V.vuoto);

      // listato: istruzioni, poi i dati
      listaRighe.replaceChildren();
      const K = R.codice;
      if (K) {
        const parole = R.esecuzione && R.esecuzione.asm ? R.esecuzione.asm.parole : null;
        K.righe.forEach((r, i) => {
          const parola = parole ? parole[i] : 0;
          const bin = C ? C.bin(parola) : '00000000';
          const li = h('li', { class: 'lab-compilatore-riga is-codice' },
            h('span', { class: 'lab-compilatore-ind', 'data-vero': due(i) }, '··'),
            h('span', { class: 'lab-compilatore-bin', 'data-vero': bin.slice(0, 3) + ' ' + bin.slice(3) }, '··· ·····'),
            h('span', { class: 'lab-compilatore-eti' }),
            h('span', { class: 'lab-compilatore-op' + (/^(ADD|SUB|MUL)$/.test(r.op) ? ' is-operatore' : '') }, r.op),
            h('span', { class: 'lab-compilatore-arg' + (r.tipo ? ' is-' + r.tipo : '') }, r.arg || ''),
            h('span', { class: 'lab-compilatore-val' }));
          V.righe.push(li);
        });
        K.dati.forEach((d, j) => {
          const ind = K.istruzioni + j;
          const bin = C ? C.bin(d.valore) : '00000000';
          const li = h('li', { class: 'lab-compilatore-riga is-dato is-' + d.tipo },
            h('span', { class: 'lab-compilatore-ind', 'data-vero': due(ind) }, '··'),
            h('span', { class: 'lab-compilatore-bin', 'data-vero': bin }, '········'),
            h('span', { class: 'lab-compilatore-eti' }, d.etichetta + ':'),
            h('span', { class: 'lab-compilatore-op' }, 'DATA'),
            h('span', { class: 'lab-compilatore-arg is-numero-dato' }, String(d.valore)),
            h('span', { class: 'lab-compilatore-val' }));
          V.dati.push(li);
        });
        V.sep = h('li', { class: 'lab-compilatore-sep', 'aria-hidden': 'true' }, 'dati');
        listaRighe.append(...V.righe, V.sep, ...V.dati);
      }
    }

    /* ---------- disegno di uno stato (cursore = passi già fatti) ---------- */

    function conta(c) {
      const P = stato.ris.passi;
      const st = { nTok: 0, creati: new Set(), svanite: new Set(), visite: 0, assemblato: false, eventi: 0, ultimo: c > 0 ? P[c - 1] : null };
      for (let k = 0; k < c; k++) {
        const p = P[k];
        if (p.fase === 1) st.nTok += 1;
        else if (p.fase === 2) { for (const q of p.nuovi) st.creati.add(q); for (const t of p.parentesi) st.svanite.add(t); }
        else if (p.fase === 3) st.visite += 1;
        else if (p.assembla) st.assemblato = true;
        else st.eventi += 1;
      }
      return st;
    }

    function pieno(n) { return n.sx ? '(' + pieno(n.sx) + ' ' + n.testo + ' ' + pieno(n.dx) + ')' : n.testo; }

    function applica(c) {
      const R = stato.ris;
      if (!R || !V) return;
      if (R.errore || stato.erroreValore) { applicaErrore(); return; }
      const P = R.passi;
      const st = conta(c);
      const fase = c < P.length ? P[c].fase : 5;
      const K = R.codice;
      const ultimo = st.ultimo;

      // sorgente
      const tokOra = ultimo && ultimo.fase === 1 && c <= R.inizioFase[2] ? ultimo.token : -1;
      const finoA = st.nTok > 0 ? R.token[st.nTok - 1].fine : 0;
      V.celle.forEach((cella, k) => {
        const t = cella.dataset.token == null ? -1 : Number(cella.dataset.token);
        cella.classList.toggle('is-letto', t >= 0 && t < st.nTok);
        cella.classList.toggle('is-ora', t >= 0 && t === tokOra);
        cella.classList.toggle('is-saltato', t < 0 && k < finoA);
        cella.classList.remove('is-errore');
      });

      // token e albero
      const visita = st.visite > 0 ? K.visite[st.visite - 1] : null;
      const visitati = new Set(K.visite.slice(0, st.visite).map((v) => v.nodo));
      const usati = new Set(visita ? visita.consumati : []);
      const righeEv = st.eventi > 0 ? R.esecuzione.eventi[st.eventi - 1] : null;
      const nodoEsegue = righeEv && K.righe[righeEv.indirizzo] ? K.righe[righeEv.indirizzo].nodo : null;
      const nuovi = new Set(ultimo && ultimo.fase === 2 ? ultimo.nuovi : []);
      R.token.forEach((t, i) => {
        const ch = V.chip[i];
        const nd = V.nodoDiToken[i];
        const inAlbero = !!(nd && st.creati.has(nd.id));
        const visibile = i < st.nTok && !st.svanite.has(i);
        ch.classList.toggle('is-visibile', visibile);
        ch.style.opacity = '';
        ch.style.transform = inAlbero ? 'translateY(' + V.pos[nd.id].dy + 'px)' : '';
        ch.classList.remove('is-errore');
        ch.classList.toggle('is-nuovo', !!(nd && nuovi.has(nd.id)) || (ultimo && ultimo.fase === 1 && ultimo.token === i));
        ch.classList.toggle('is-visitato', !!(nd && visitati.has(nd.id)) && fase <= 3);
        ch.classList.toggle('is-usato', !!(nd && usati.has(nd.id)) && fase <= 3);
        ch.classList.toggle('is-esegue', !!(nd && nd.id === nodoEsegue));
        V.fantasmi[i].classList.toggle('is-visibile', i < st.nTok && (inAlbero || st.svanite.has(i)));
      });
      for (const nid in V.rami) {
        const linea = V.rami[nid];
        const p = V.padre[nid];
        const b = V.pos[nid];
        linea.classList.toggle('is-visibile', st.creati.has(p.id));
        linea.style.opacity = '';
        linea.setAttribute('x2', b.x + '%');
        linea.setAttribute('y2', b.y);
      }
      for (const nid in V.badge) {
        const b = V.badge[nid];
        const dove = visita && fase <= 3 ? visita.posizioni[nid] : null;
        const nd = nodo(nid);
        const mostra = dove && nd.tipo !== 'variabile' && nd.tipo !== 'assegna' && !usati.has(nid);
        b.classList.remove('is-pop');
        b.classList.toggle('is-visibile', !!mostra);
        b.className = b.className.replace(/\bis-(ora|temporanea|costante)\b/g, '').trim();
        if (mostra) {
          b.textContent = dove;
          b.classList.add(dove === 'ACC' ? 'is-ora' : (/^T\d/.test(dove) ? 'is-temporanea' : 'is-costante'));
        }
      }
      const a = V.anello;
      a.style.transform = '';
      a.style.opacity = '';
      if (visita && ultimo.fase === 3) {
        a.style.left = V.pos[visita.nodo].x + '%';
        a.style.top = V.pos[visita.nodo].y + 'px';
        a.classList.add('is-visibile');
      } else a.classList.remove('is-visibile');
      V.vuoto.hidden = st.nTok > 0;
      const tokTesto = R.token.slice(0, st.nTok).map((t) => t.testo).join(' ');
      lavagna.setAttribute('aria-label', !st.nTok ? 'Lavagna vuota: i token non sono ancora stati riconosciuti.'
        : (st.creati.size === R.nodi.length ? 'Albero sintattico completo: ' + pieno(R.albero) + '.' : 'Token riconosciuti: ' + tokTesto + (st.creati.size ? '. Albero in costruzione: ' + st.creati.size + ' nodi su ' + R.nodi.length + '.' : '.')));

      // listato
      const emesse = new Set();
      const create = new Set();
      K.visite.slice(0, st.visite).forEach((v) => { v.righe.forEach((i) => emesse.add(i)); v.dati.forEach((j) => create.add(j)); });
      const ultimeRighe = new Set(ultimo && ultimo.fase === 3 ? visita.righe : []);
      const ultimiDati = new Set(ultimo && ultimo.fase === 3 ? visita.dati : []);
      let sim = null;
      if (st.assemblato) {
        sim = C.crea(R.esecuzione.asm.parole);
        for (let k = 0; k < st.eventi; k++) C.passo(sim);
      }
      listaRighe.classList.toggle('is-assemblato', st.assemblato);
      const tutte = V.righe.concat(V.dati);
      tutte.forEach((li, i) => {
        const dato = i >= V.righe.length;
        const j = i - V.righe.length;
        li.hidden = dato ? !create.has(j) : !emesse.has(i);
        li.classList.remove('is-entra', 'is-letta', 'is-scritta', 'is-assembla');
        li.style.animationDelay = '';
        li.classList.toggle('is-nuova', dato ? ultimiDati.has(j) : ultimeRighe.has(i));
        const ind = li.children[0];
        const bin = li.children[1];
        ind.textContent = st.assemblato ? ind.dataset.vero : '··';
        bin.textContent = st.assemblato ? bin.dataset.vero : (dato ? '········' : '··· ·····');
        const val = li.children[5];
        if (dato && sim) {
          const v = sim.mem[K.istruzioni + j];
          val.textContent = v !== K.dati[j].valore ? '→ ' + v : '';
        } else val.textContent = '';
      });
      V.sep.hidden = create.size === 0;
      vuotoCodice.hidden = emesse.size + create.size > 0;
      vuotoCodice.textContent = fase <= 2 ? 'Qui comparirà il programma per la CPU giocattolo, quando l\'albero sarà pronto.' : 'Il generatore sta per partire dalla prima foglia.';
      // barra del contatore di programma
      if (st.assemblato) {
        const riga = righeEv ? righeEv.indirizzo : 0;
        const li = V.righe[riga];
        barraPc.style.transform = 'translateY(' + (li ? li.offsetTop : 0) + 'px)';
        barraPc.classList.add('is-visibile');
        barraPc.classList.toggle('is-pronto', !righeEv);
      } else barraPc.classList.remove('is-visibile', 'is-pronto');
      disegnaMemoria(emesse, create);
      disegnaConfronto(fase);

      // CPU
      regPc.classList.remove('is-cambia');
      regAcc.classList.remove('is-cambia');
      regOut.classList.remove('is-cambia');
      regPc.textContent = sim ? due(sim.pc) : '—';
      regAcc.textContent = sim ? String(sim.acc) : '—';
      regOut.textContent = sim && sim.uscita.length ? sim.uscita.join(' ') : '—';
      cpuStato.textContent = !st.assemblato ? 'La CPU aspetta il programma.'
        : (sim.fermo ? 'Macchina ferma (HALT) dopo ' + sim.passi + ' istruzioni.' : (st.eventi ? 'Istruzioni eseguite: ' + st.eventi + '.' : 'Programma in memoria: la CPU parte dalla cella 00.'));
      const finito = c === P.length;
      esito.hidden = !finito;
      esito.classList.remove('is-entra');
      if (finito) {
        const y = R.codice.bersaglio;
        esito.replaceChildren(h('strong', null, y + ' = ' + R.esecuzione.valore), h('span', null, ctx.inline(spiegaFinale(R).replace(/^\*\*[^*]+\*\*\.\s*/, ''))));
        esito.classList.toggle('is-trabocca', BigInt(R.esecuzione.valore) !== R.atteso);
      }

      // pannelli attivi, fasi e comandi
      pannSorgente.classList.toggle('is-attivo', fase === 1);
      pannAlbero.classList.toggle('is-attivo', fase === 1 || fase === 2 || fase === 3);
      pannCodice.classList.toggle('is-attivo', fase === 3 || fase === 4);
      pannCpu.classList.toggle('is-attivo', fase === 4);
      erroreBox.hidden = true;
      erroreBox.replaceChildren();
      campo.removeAttribute('aria-invalid');
      aggiornaFasi(c);
      aggiornaComandi();
    }

    function disegnaMemoria(emesse, create, troppo) {
      const K = stato.ris.codice;
      const nIstr = emesse.size;
      const datiVisibili = K ? K.dati.filter((d, j) => create.has(j)) : [];
      const totale = nIstr + datiVisibili.length;
      segmenti.forEach((sg, k) => {
        sg.className = '';
        if (troppo) sg.className = 'is-troppo';
        else if (k < nIstr) sg.className = 'is-istr';
        else if (k < totale) sg.className = 'is-dato is-' + datiVisibili[k - nIstr].tipo;
      });
      memoria.classList.toggle('is-piena', !!troppo);
      memoriaTesto.textContent = troppo
        ? K.celle + ' celle su 31: ' + (K.celle - MEMORIA) + ' di troppo'
        : (totale ? nIstr + ' istruzion' + (nIstr === 1 ? 'e' : 'i') + ' + ' + datiVisibili.length + ' dat' + (datiVisibili.length === 1 ? 'o' : 'i') + ' = ' + totale + ' celle su 31' : 'Memoria: 31 celle libere (la 32ª è l\'uscita)');
    }

    function disegnaConfronto(fase) {
      const R = stato.ris;
      const A = R.alternativa;
      if (!R.codice || !A || fase < 3) { confronto.textContent = ''; confronto.hidden = true; return; }
      confronto.hidden = false;
      confronto.textContent = stato.ottimizza
        ? 'Senza ottimizzazione servirebbero ' + A.istruzioni + ' istruzioni e ' + A.celle + ' celle' + (A.celle > MEMORIA ? ': troppe per la memoria.' : '.')
        : 'Con l\'ottimizzazione bastano ' + A.istruzioni + ' istruzioni e ' + A.celle + ' celle.';
    }

    function applicaErrore() {
      const R = stato.ris;
      const E = R.errore;
      const fase = E ? E.fase : 0;
      // caselle della sorgente
      V.celle.forEach((cella, k) => {
        const t = cella.dataset.token == null ? -1 : Number(cella.dataset.token);
        cella.classList.toggle('is-letto', fase >= 2 && t >= 0);
        cella.classList.remove('is-ora', 'is-saltato');
        cella.classList.toggle('is-errore', !!(E && E.inizio != null && k >= E.inizio && k < E.fine));
      });
      R.token.forEach((t, i) => {
        const ch = V.chip[i];
        const nd = V.nodoDiToken[i];
        const inAlbero = fase >= 3 && !!nd;
        ch.classList.toggle('is-visibile', fase >= 2 && (!inAlbero ? t.tipo !== 'parentesi' || fase === 2 : true) && !(fase >= 3 && t.tipo === 'parentesi'));
        ch.style.opacity = '';
        ch.style.transform = inAlbero ? 'translateY(' + V.pos[nd.id].dy + 'px)' : '';
        ch.classList.remove('is-nuovo', 'is-visitato', 'is-usato', 'is-esegue');
        ch.classList.toggle('is-errore', !!(E && fase === 2 && E.inizio != null && t.inizio < E.fine && t.fine > E.inizio));
        V.fantasmi[i].classList.toggle('is-visibile', fase >= 3);
      });
      for (const nid in V.rami) { V.rami[nid].classList.toggle('is-visibile', fase >= 3); V.rami[nid].style.opacity = ''; }
      for (const nid in V.badge) V.badge[nid].classList.remove('is-visibile');
      V.anello.classList.remove('is-visibile');
      V.vuoto.hidden = fase >= 2;
      V.vuoto.textContent = 'Qui il lexer metterà i token; poi il parser li sistemerà in un albero.';
      lavagna.setAttribute('aria-label', fase >= 2 ? 'Token riconosciuti: ' + R.token.map((t) => t.testo).join(' ') + '.' : 'Lavagna vuota.');
      // listato
      const K = R.codice;
      const tutti = new Set(K ? K.righe.map((_, i) => i) : []);
      const tuttiDati = new Set(K ? K.dati.map((_, j) => j) : []);
      V.righe.concat(V.dati).forEach((li) => {
        li.hidden = fase !== 3;
        li.classList.remove('is-entra', 'is-letta', 'is-scritta', 'is-assembla', 'is-nuova');
        li.children[0].textContent = '··';
        li.children[1].textContent = li.classList.contains('is-dato') ? '········' : '··· ·····';
        li.children[5].textContent = '';
      });
      if (V.sep) V.sep.hidden = fase !== 3;
      vuotoCodice.hidden = fase === 3;
      vuotoCodice.textContent = 'Il compilatore si è fermato prima di scrivere il programma.';
      barraPc.classList.remove('is-visibile', 'is-pronto');
      if (fase === 3) disegnaMemoria(tutti, tuttiDati, true);
      else disegnaMemoria(new Set(), new Set());
      disegnaConfronto(fase === 3 ? 3 : 0);
      regPc.textContent = '—';
      regAcc.textContent = '—';
      regOut.textContent = '—';
      cpuStato.textContent = 'La CPU aspetta un programma corretto.';
      esito.hidden = true;
      [pannSorgente, pannAlbero, pannCodice, pannCpu].forEach((p) => p.classList.remove('is-attivo'));
      if (fase === 1) pannSorgente.classList.add('is-attivo');
      if (fase === 2) pannAlbero.classList.add('is-attivo');
      if (fase === 3) pannCodice.classList.add('is-attivo');
      // messaggio
      const msg = stato.erroreValore || (E && E.messaggio) || '';
      const titolo = stato.erroreValore ? 'Valore non valido' : ['', 'Errore lessicale', 'Errore di sintassi', 'Memoria piena', 'Errore'][fase];
      erroreBox.replaceChildren(h('b', null, titolo), h('span', null, msg));
      erroreBox.hidden = false;
      campo.setAttribute('aria-invalid', String(!stato.erroreValore && fase > 0 && fase <= 2));
      aggiornaFasi(0);
      aggiornaComandi();
    }

    function aggiornaFasi(c) {
      const R = stato.ris;
      const ko = !!(R.errore || stato.erroreValore);
      const N = R.passi.length;
      const fase = !ko && c < N ? R.passi[c].fase : (ko ? 0 : 5);
      bottoniFase.forEach((b, k) => {
        const f = k + 1;
        const ini = R.inizioFase[f];
        const fin = f < 4 ? R.inizioFase[f + 1] : N;
        const fatta = !ko && c >= fin && fin > ini;
        b.disabled = ko;
        b.classList.toggle('is-fatta', fatta);
        if (fase === f) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
        const prog = ko || fin <= ini ? 0 : Math.max(0, Math.min(1, (c - ini) / (fin - ini)));
        b.lastChild.firstChild.style.transform = 'scaleX(' + prog + ')';
        b.setAttribute('aria-label', 'Fase ' + f + ': ' + FASI[k].nome + (fatta ? ', completata' : (fase === f ? ', in corso' : '')));
      });
    }

    function aggiornaComandi() {
      const R = stato.ris;
      const ko = !R || !!(R.errore || stato.erroreValore);
      const N = ko ? 0 : R.passi.length;
      const c = stato.cursore;
      btnVai.disabled = ko;
      btnPasso.disabled = ko || c >= N;
      btnDaCapo.disabled = ko || (c === 0 && !stato.inCorsa);
      btnVai.textContent = stato.inCorsa ? '❚❚ Pausa' : (c === 0 ? '▶ Compila ed esegui' : (c >= N ? '↻ Di nuovo' : '▶ Continua'));
      btnVai.setAttribute('aria-pressed', String(stato.inCorsa));
    }

    function aggiornaPreset() {
      const norm = (t) => normalizza(t).replace(/\s+/g, '');
      bottoniPreset.forEach((b, k) => b.setAttribute('aria-pressed', String(norm(PRESET[k]) === norm(stato.sorgente))));
    }

    /* ---------- spiegazioni ---------- */

    function scrivi(fase, testo, errore) {
      const tag = errore ? h('span', { class: 'lab-compilatore-tag is-errore' }, 'Fermo') : (fase ? h('span', { class: 'lab-compilatore-tag' }, fase + ' · ' + BREVE[fase]) : null);
      spiega.replaceChildren(h('p', null, tag, ctx.inline(testo)));
    }

    function testoPasso(p) {
      const R = stato.ris;
      if (p.fase === 1) return spiegaToken(R.token[p.token], p.token, R);
      if (p.fase === 2) { const n = nodo(p.nodo); return spiegaNodo(n, V.padre[n.id] || null); }
      if (p.fase === 3) return R.codice.visite[p.visita].testo;
      if (p.assembla) {
        return 'L\'**assemblatore** traduce ogni riga in una parola da 8 bit (3 bit per l\'istruzione, 5 per l\'indirizzo) e assegna le celle: istruzioni da 00 a ' + due(R.codice.istruzioni - 1)
          + ', dati da ' + due(R.codice.istruzioni) + ' a ' + due(R.codice.celle - 1) + '. Il contatore di programma parte da 00.';
      }
      const ev = R.esecuzione.eventi[p.evento];
      let t = spiegaEvento(ev, R.codice, R.esecuzione);
      if (p.evento === R.esecuzione.eventi.length - 1) t += ' ' + spiegaFinale(R);
      return t;
    }

    function narra(p, k, auto) {
      const R = stato.ris;
      const testo = testoPasso(p);
      scrivi(p.fase, testo);
      const inizio = k === R.inizioFase[p.fase];
      const ultimo = k === R.passi.length - 1;
      if (!auto || inizio || ultimo) ctx.annuncia((inizio ? 'Fase ' + p.fase + ', ' + FASI[p.fase - 1].nome + '. ' : '') + semplice(testo));
    }

    function narraErrore() {
      const R = stato.ris;
      if (stato.erroreValore) { scrivi(0, 'Correggi il valore qui sopra: poi il compilatore riparte da dove era arrivato.', true); ctx.annuncia(stato.erroreValore); return; }
      const f = R.errore.fase;
      const dove = ['', 'già nell\'**analisi lessicale**: c\'è un carattere o una parola che il lexer non conosce', 'nell\'**analisi sintattica**: i token sono validi, ma non formano una frase corretta del linguaggio', 'nella **generazione del codice**: il programma non entra in memoria', 'durante l\'esecuzione'][f];
      scrivi(0, 'Il compilatore si ferma ' + dove + '. Correggi l\'istruzione: il messaggio qui sopra spiega come.', true);
      ctx.annuncia(semplice(R.errore.messaggio));
    }

    /* ---------- animazioni di un passo ---------- */

    function misura() {
      const a = V.anello;
      const b = {};
      for (const nid in V.badge) b[nid] = V.badge[nid].classList.contains('is-visibile') ? V.badge[nid].textContent : '';
      return { anello: { visibile: a.classList.contains('is-visibile'), left: a.offsetLeft, top: a.offsetTop }, badge: b };
    }

    function scendi(nid, durata) {
      const ch = V.chip[nodo(nid).token];
      const dy = V.pos[nid].dy;
      return ctx.anima({ durata: durata, easing: 'smooth', aggiorna: (t) => { ch.style.transform = 'translateY(' + (dy * t) + 'px)'; } });
    }

    function riavvia(elm, classe) {
      elm.classList.remove(classe);
      void elm.offsetWidth;
      elm.classList.add(classe);
    }

    function entrata(elementi, ritardo, f) {
      elementi.forEach((elm, i) => {
        elm.style.animationDelay = Math.round(ritardo + i * 110 * f) + 'ms';
        riavvia(elm, 'is-entra');
      });
    }

    async function animaPasso(p, prima) {
      const R = stato.ris;
      const f = fattore();
      if (p.fase === 1) {
        const ch = V.chip[p.token];
        await ctx.anima({
          durata: D.normale * f, easing: 'smooth',
          aggiorna: (t) => { ch.style.opacity = String(t); ch.style.transform = 'translateY(' + (-18 * (1 - t)) + 'px) scale(' + (0.7 + 0.3 * t) + ')'; },
        });
        ch.style.opacity = '';
        ch.style.transform = '';
      } else if (p.fase === 2) {
        const padre = nodo(p.nodo);
        const foglie = p.nuovi.slice(0, -1);
        const figli = [padre.sx, padre.dx];
        const a = V.pos[padre.id];
        V.chip[padre.token].style.transform = 'translateY(0px)';
        for (const nid of foglie) V.chip[nodo(nid).token].style.transform = 'translateY(0px)';
        for (const fg of figli) {
          const l = V.rami[fg.id];
          l.style.opacity = '0';
          l.setAttribute('x2', a.x + '%');
          l.setAttribute('y2', a.y);
        }
        for (const t of p.parentesi) { V.chip[t].style.opacity = '1'; V.chip[t].style.transform = ''; }
        const lavori = foglie.map((nid) => scendi(nid, D.lenta * f));
        if (p.parentesi.length) {
          lavori.push(ctx.anima({
            durata: D.lenta * f,
            aggiorna: (t) => { for (const k of p.parentesi) { V.chip[k].style.opacity = String(1 - t); V.chip[k].style.transform = 'scale(' + (1 - 0.5 * t) + ')'; } },
          }));
        }
        await Promise.all(lavori);
        await scendi(padre.id, D.normale * f);
        await ctx.anima({
          durata: D.normale * f, easing: 'smooth',
          aggiorna: (t) => {
            for (const fg of figli) {
              const l = V.rami[fg.id];
              const b = V.pos[fg.id];
              l.style.opacity = '1';
              l.setAttribute('x2', (a.x + (b.x - a.x) * t) + '%');
              l.setAttribute('y2', a.y + (b.y - a.y) * t);
            }
          },
        });
        for (const k of p.parentesi) { V.chip[k].style.opacity = ''; V.chip[k].style.transform = ''; }
        for (const fg of figli) V.rami[fg.id].style.opacity = '';
      } else if (p.fase === 3) {
        const v = R.codice.visite[p.visita];
        const an = V.anello;
        const durata = D.normale * f;
        for (const nid in V.badge) {
          const b = V.badge[nid];
          if (b.classList.contains('is-visibile') && b.textContent !== prima.badge[nid]) riavvia(b, 'is-pop');
        }
        entrata(v.righe.map((i) => V.righe[i]).concat(v.dati.map((j) => V.dati[j])), durata * 0.6, f);
        if (prima.anello.visibile) {
          const dx = prima.anello.left - an.offsetLeft;
          const dy = prima.anello.top - an.offsetTop;
          await ctx.anima({ durata: durata, easing: 'smooth', aggiorna: (t) => { an.style.transform = 'translate(' + (dx * (1 - t)) + 'px,' + (dy * (1 - t)) + 'px)'; } });
        } else {
          await ctx.anima({ durata: durata, easing: 'smooth', aggiorna: (t) => { an.style.opacity = String(t); an.style.transform = 'scale(' + (1.6 - 0.6 * t) + ')'; } });
        }
        an.style.transform = '';
        an.style.opacity = '';
        await ctx.attendi((v.righe.length + v.dati.length) * 110 * f + D.veloce);
      } else if (p.assembla) {
        const righe = V.righe.concat(V.dati);
        righe.forEach((li, i) => { li.style.animationDelay = Math.round(i * 45 * f) + 'ms'; riavvia(li, 'is-assembla'); });
        await ctx.attendi(righe.length * 45 * f + D.normale);
      } else {
        const ev = R.esecuzione.eventi[p.evento];
        const K = R.codice;
        const riga = (ind) => (ind < K.istruzioni ? V.righe[ind] : V.dati[ind - K.istruzioni]);
        if (ev.letto != null && riga(ev.letto)) riavvia(riga(ev.letto), 'is-letta');
        if (ev.scritto != null && ev.scritto !== 31 && riga(ev.scritto)) riavvia(riga(ev.scritto), 'is-scritta');
        riavvia(regPc, 'is-cambia');
        if (ev.accDopo !== ev.accPrima) riavvia(regAcc, 'is-cambia');
        if (ev.uscita != null) riavvia(regOut, 'is-cambia');
        if (p.evento === R.esecuzione.eventi.length - 1) riavvia(esito, 'is-entra');
        await ctx.attendi(D.normale * f);
      }
    }

    /* ---------- comandi ---------- */

    function pronto() { return stato.ris && !stato.ris.errore && !stato.erroreValore; }

    function interrompi() {
      ctx.annulla();
      stato.epoca += 1;
      stato.inCorsa = false;
    }

    function fine() {
      if (stato.completato) return;
      stato.completato = true;
      ctx.completa();
    }

    async function avanza(auto) {
      const R = stato.ris;
      const k = stato.cursore;
      if (k >= R.passi.length) return;
      const p = R.passi[k];
      const prima = misura();
      stato.cursore = k + 1;
      applica(stato.cursore);
      narra(p, k, auto);
      if (stato.cursore === R.passi.length) {
        fine();
        if (document.activeElement === btnPasso) btnVai.focus();
      }
      if (!ctx.riduci) await animaPasso(p, prima);
    }

    function pausaDopo(p) {
      const f = fattore();
      if (p.fase === 1) return 260 * f;
      if (p.fase === 2) return 650 * f;
      if (p.fase === 3) return (stato.ris.codice.visite[p.visita].righe.length ? 700 : 380) * f;
      return (p.assembla ? 800 : 520) * f;
    }

    async function gioca() {
      if (stato.inCorsa) {
        interrompi();
        applica(stato.cursore);
        scrivi(0, 'In pausa. Premi **▶ Continua** per riprendere o **Passo** per andare avanti di uno.');
        ctx.annuncia('In pausa.');
        return;
      }
      if (!pronto()) return;
      interrompi();
      if (stato.cursore >= stato.ris.passi.length) stato.cursore = 0;
      applica(stato.cursore);
      stato.inCorsa = true;
      const ep = stato.epoca;
      aggiornaComandi();
      try {
        while (ep === stato.epoca && stato.cursore < stato.ris.passi.length) {
          await avanza(true);
          if (ep !== stato.epoca) return;
          if (stato.cursore < stato.ris.passi.length) await ctx.attendi(pausaDopo(stato.ris.passi[stato.cursore - 1]));
        }
      } catch (err) {
        silenzia(err);
        return;
      }
      if (ep === stato.epoca) {
        stato.inCorsa = false;
        aggiornaComandi();
      }
    }

    function passoManuale() {
      if (!pronto()) return;
      interrompi();
      applica(stato.cursore);
      if (stato.cursore >= stato.ris.passi.length) return;
      avanza(false).catch(silenzia);
    }

    function daCapo() {
      if (!pronto()) return;
      interrompi();
      stato.cursore = 0;
      applica(0);
      scrivi(0, INTRO[0]);
      ctx.annuncia('Da capo: nessuna fase ancora eseguita.');
      btnVai.focus();
    }

    function vaiAFase(f) {
      if (!pronto()) return;
      interrompi();
      stato.cursore = stato.ris.inizioFase[f];
      applica(stato.cursore);
      scrivi(f, INTRO[f]);
      ctx.annuncia('Fase ' + f + ', ' + FASI[f - 1].nome + '. ' + semplice(INTRO[f]));
    }

    function scegliVelocita(v) {
      stato.velocita = v;
      bottoniVel.forEach((b, k) => b.setAttribute('aria-pressed', String(['lenta', 'normale', 'veloce'][k] === v)));
    }

    function ricompila(opz) {
      interrompi();
      stato.ris = compila(stato.sorgente, stato.valori, { ottimizza: stato.ottimizza });
      stato.erroreValore = controllaValori();
      renderValori();
      costruisci();
      const N = stato.ris.passi.length;
      stato.cursore = opz && opz.cursore != null ? Math.max(0, Math.min(opz.cursore, N)) : 0;
      if (!pronto()) stato.cursore = 0;
      applica(stato.cursore);
      aggiornaPreset();
    }

    function cambiaSorgente(testo) {
      if (testo === stato.sorgente && stato.ris) return;
      stato.sorgente = testo;
      ricompila();
      if (!pronto()) narraErrore();
      else scrivi(0, 'Istruzione pronta: ' + stato.ris.token.length + ' token da scoprire. ' + INTRO[0]);
    }

    function scegliOttimizza(v) {
      if (stato.ottimizza === v) return;
      const R = stato.ris;
      const c = stato.cursore;
      const oltre = pronto() && c > R.inizioFase[3];
      stato.ottimizza = v;
      bottoniOtt.forEach((b, k) => b.setAttribute('aria-pressed', String((k === 0) === v)));
      ricompila({ cursore: oltre ? 0 : c });
      if (!pronto()) { narraErrore(); return; }
      if (oltre) { stato.cursore = stato.ris.inizioFase[4]; applica(stato.cursore); }
      const K = stato.ris.codice;
      const A = stato.ris.alternativa;
      const testo = v
        ? 'Con l\'ottimizzazione il risultato parziale resta nell\'accumulatore finché serve: ' + K.istruzioni + ' istruzioni invece di ' + A.istruzioni + '. Era la scommessa del primo compilatore FORTRAN (IBM 704, aprile 1957): scrivere da solo programmi quasi efficienti come quelli fatti a mano.'
        : 'Senza ottimizzazione ogni risultato passa dalla memoria con una STORE e poi una LOAD: ' + K.istruzioni + ' istruzioni invece di ' + A.istruzioni + ', e più celle occupate.';
      scrivi(3, testo);
      ctx.annuncia(semplice(testo));
    }

    /* ---------- avvio ---------- */

    ricompila();
    scrivi(0, INTRO[0]);

    return {};
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('compilatore', { titolo: 'Il compilatore al lavoro', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
