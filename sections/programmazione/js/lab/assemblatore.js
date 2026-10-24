/*
 * Laboratorio «L'assemblatore» (capitolo 4 · Dai numeri alle parole).
 *
 * A sinistra il sorgente in assembly della CPU giocattolo (js/lib/cpu-giocattolo.js), la tabella dei simboli
 * e la tabella dei codici operativi; a destra il banco dell'assemblatore e le 32 celle di memoria.
 * «Assembla» mette in scena le due passate (con Pausa, Passo e Fino in fondo):
 *   1. la prima legge le righe una per una, conta le celle (contatore di posizione)
 *      e annota le etichette nella tabella dei simboli (ogni etichetta vola nella tabella);
 *   2. la seconda traduce ogni riga sul banco: il mnemonico diventa 3 bit di codice operativo,
 *      l'operando (numero o etichetta, preso dalla tabella) 5 bit di indirizzo, e la parola vola nella sua cella.
 * Righe e celle sono collegate (puntatore o fuoco). Gli errori compaiono accanto alla riga, con un consiglio.
 * «Esegui» fa girare il programma in fretta (PC, accumulatore, uscita). In fondo la sfida «Traduci a mano».
 * Colori, uguali ovunque: codice operativo ambra (--trace-2), indirizzi azzurro (--trace-3),
 * etichette rosa (--trace-4), dati verde (--trace-1).
 *
 * La logica pura (copione delle passate, consigli sugli errori, mappa righe↔celle, esecuzione, sfida)
 * non tocca il DOM ed è esportata per i test (test/assemblatore.test.js).
 */
(function (root) {
  'use strict';

  const P = 'lab-assemblatore';
  const LIMITE_PASSI = 500; // istruzioni massime di un'esecuzione: un ciclo senza uscita si ferma qui

  function cpu() {
    if (root.CpuGiocattolo) return root.CpuGiocattolo;
    if (typeof require === 'function') return require('../lib/cpu-giocattolo.js');
    throw new Error('CpuGiocattolo non è stata caricata');
  }

  const ETICHETTA = /^([A-Za-z_][\w]*)\s*:\s*(.*)$/;

  // Stessa lettura dei numeri della CPU giocattolo: decimali, 0b… e 0x….
  function numero(testo) {
    const t = String(testo == null ? '' : testo);
    if (/^-?\d+$/.test(t)) return parseInt(t, 10);
    if (/^0b[01]+$/i.test(t)) return parseInt(t.slice(2), 2);
    if (/^0x[0-9a-f]+$/i.test(t)) return parseInt(t.slice(2), 16);
    return null;
  }

  function nomiIsa() {
    return cpu().ISA.map((i) => i.nome);
  }

  // Descrizioni brevi per il prontuario dei codici operativi.
  const BREVE = {
    HALT: 'Ferma la macchina',
    LOAD: 'Copia la cella nell\'accumulatore',
    STORE: 'Copia l\'accumulatore nella cella (31 = uscita)',
    ADD: 'Somma la cella all\'accumulatore',
    SUB: 'Sottrae la cella dall\'accumulatore',
    MUL: 'Moltiplica l\'accumulatore per la cella',
    JUMP: 'Salta all\'istruzione nella cella',
    JZ: 'Salta lì solo se l\'accumulatore vale zero',
  };

  // Un esempio d'uso per ogni istruzione (nei consigli sugli errori).
  const ESEMPIO_USO = { LOAD: 'LOAD n', STORE: 'STORE OUT', ADD: 'ADD n', SUB: 'SUB uno', MUL: 'MUL c', JUMP: 'JUMP ciclo', JZ: 'JZ fine' };

  function prontuario() {
    return cpu().ISA.map((i) => ({
      codice: i.codice, bits: cpu().bin(i.codice, 3), nome: i.nome, operando: i.operando,
      breve: BREVE[i.nome] || i.descrizione, descrizione: i.descrizione,
    }));
  }

  /*
   * Divide una riga in pezzi colorabili senza perdere nemmeno uno spazio:
   * etichetta, istruzione (dati per DATA, ignoto se sconosciuta), operando (numero),
   * simbolo (etichetta usata come operando), numero (valore di DATA), extra, commento, spazio.
   */
  function dividiRiga(testo) {
    const t = String(testo == null ? '' : testo);
    const pv = t.indexOf(';');
    const corpo = pv >= 0 ? t.slice(0, pv) : t;
    const nomi = nomiIsa();
    const out = [];
    const re = /(\s+)|([A-Za-z_]\w*\s*:)|(,)|([^\s,]+)/g;
    let m;
    let primo = true;
    let fase = 0;
    let dati = false;
    while ((m = re.exec(corpo))) {
      if (m[1]) { out.push({ tipo: 'spazio', testo: m[1] }); continue; }
      if (m[2] && primo) { out.push({ tipo: 'etichetta', testo: m[2] }); primo = false; continue; }
      primo = false;
      if (m[3]) { out.push({ tipo: 'spazio', testo: m[3] }); continue; }
      const parola = m[2] || m[4];
      if (fase === 0) {
        const su = parola.toUpperCase();
        dati = su === 'DATA';
        out.push({ tipo: dati ? 'dati' : (nomi.includes(su) ? 'istruzione' : 'ignoto'), testo: parola });
        fase = 1;
      } else if (fase === 1) {
        const n = numero(parola);
        out.push({ tipo: dati ? 'numero' : (n == null ? 'simbolo' : 'operando'), testo: parola });
        fase = 2;
      } else out.push({ tipo: 'extra', testo: parola });
    }
    if (pv >= 0) out.push({ tipo: 'commento', testo: t.slice(pv) });
    return out;
  }

  /*
   * Il piano delle due passate, ricavato da CpuGiocattolo.assembla():
   * passata1: una voce per ogni riga del sorgente (tipo, etichetta, cella assegnata, contatore dopo la riga);
   * passata2: una voce per ogni riga da codificare (codice operativo, valore dell'operando, parola).
   * Un errore della prima passata (etichetta doppia o riservata, istruzione sconosciuta, troppi operandi,
   * programma troppo lungo) toglie la riga dalla seconda.
   */
  function piano(sorgente) {
    const C = cpu();
    const ris = C.assembla(sorgente);
    const nomi = new Set(nomiIsa());
    const visti = { out: C.OUT };
    const passata1 = [];
    const inPrima = new Set();
    let pc = 0;
    for (const r of ris.righe) {
      let t = r.testo;
      const pv = t.indexOf(';');
      if (pv >= 0) t = t.slice(0, pv);
      t = t.trim();
      let sbaglia = false;
      let etichetta = null;
      let valore = null;
      const m = t.match(ETICHETTA);
      if (m) {
        etichetta = m[1];
        const k = m[1].toLowerCase();
        if (k === 'out' || k === 'data' || nomi.has(m[1].toUpperCase())) sbaglia = true;
        else if (k in visti) sbaglia = true;
        else { visti[k] = pc; valore = pc; }
        t = m[2].trim();
      }
      let indirizzo = null;
      let istruzione = null;
      if (t) {
        const parti = t.split(/[\s,]+/).filter(Boolean);
        istruzione = parti[0].toUpperCase();
        if (parti.length > 2) sbaglia = true;
        if (istruzione !== 'DATA' && !nomi.has(istruzione)) sbaglia = true;
        if (pc >= C.OUT) sbaglia = true;
        indirizzo = pc;
        pc += 1;
      }
      let tipo;
      if (etichetta != null) tipo = indirizzo != null ? 'etichetta-istruzione' : 'etichetta';
      else if (indirizzo != null) tipo = 'istruzione';
      else tipo = r.testo.trim() ? 'commento' : 'vuota';
      const errore = sbaglia && r.errore ? r.errore : null;
      if (errore) inPrima.add(r.n);
      passata1.push({
        riga: r.n, tipo: tipo, etichetta: etichetta, valore: valore, indirizzo: indirizzo,
        dato: istruzione === 'DATA', contatore: pc, errore: errore,
      });
    }

    const passata2 = [];
    for (const r of ris.righe) {
      if (r.istruzione == null || inPrima.has(r.n)) continue;
      const dato = r.istruzione === 'DATA';
      const istr = dato ? null : C.ISA.find((i) => i.nome === r.istruzione);
      let valore = null;
      let simbolo = null;
      if (r.operando != null) {
        const n = numero(r.operando);
        if (n != null) valore = n;
        else {
          simbolo = r.operando;
          const k = simbolo.toLowerCase();
          if (Object.prototype.hasOwnProperty.call(ris.simboli, k)) valore = ris.simboli[k];
        }
      }
      passata2.push({
        riga: r.n, indirizzo: r.indirizzo, istruzione: r.istruzione, operando: r.operando,
        simbolo: dato ? null : simbolo, valore: valore, dato: dato,
        codice: istr ? istr.codice : null, conOperando: istr ? istr.operando : true,
        parola: r.parola, errore: r.errore || null,
      });
    }

    const e1 = passata1.find((p) => p.errore);
    const e2 = passata2.find((p) => p.errore);
    const errore = e1 ? { passata: 1, riga: e1.riga, messaggio: e1.errore }
      : e2 ? { passata: 2, riga: e2.riga, messaggio: e2.errore } : null;
    return { ris: ris, passata1: passata1, passata2: passata2, errore: errore };
  }

  /*
   * Il copione dell'animazione: tutte le righe della prima passata, poi le righe da codificare.
   * Si ferma al primo errore che l'assemblatore incontra (gli altri si vedono comunque nell'elenco).
   */
  function copione(sorgente) {
    const p = piano(sorgente);
    const passi = [];
    let errore = null;
    for (const e of p.passata1) {
      passi.push(Object.assign({ fase: 1 }, e));
      if (e.errore) { errore = { passata: 1, riga: e.riga, messaggio: e.errore }; break; }
    }
    if (!errore) {
      for (const e of p.passata2) {
        passi.push(Object.assign({ fase: 2 }, e));
        if (e.errore) { errore = { passata: 2, riga: e.riga, messaggio: e.errore }; break; }
      }
    }
    const etichette = Object.keys(p.ris.simboli).filter((k) => k !== 'out').length;
    const dati = p.passata2.filter((x) => x.dato).length;
    return {
      piano: p, ris: p.ris, passi: passi, errore: errore,
      vuoto: p.ris.lunghezza === 0 && p.ris.errori.length === 0,
      riassunto: { righe: p.ris.righe.length, parole: p.ris.lunghezza, etichette: etichette, dati: dati },
    };
  }

  // Corrispondenza tra righe del sorgente e celle di memoria (solo le righe che producono una parola).
  function mappa(ris) {
    const cellaPerRiga = {};
    const rigaPerCella = {};
    for (const r of (ris && ris.righe) || []) {
      if (r.parola != null && r.indirizzo != null) {
        cellaPerRiga[r.n] = r.indirizzo;
        rigaPerCella[r.indirizzo] = r.n;
      }
    }
    return { cellaPerRiga: cellaPerRiga, rigaPerCella: rigaPerCella };
  }

  /* ---------- errori: messaggi in buon italiano e consigli ---------- */

  // Le virgolette dritte dei messaggi della CPU diventano caporali.
  function italiano(msg) {
    return String(msg || '').replace(/"([^"]*)"/g, '«$1»');
  }

  // Minuscola iniziale dopo i due punti («Riga 2: istruzione sconosciuta»), ma non per sigle e mnemonici (DATA, HALT).
  function minuscola(testo) {
    const t = String(testo || '');
    return /^[A-ZÀ-Ý][a-zà-ÿ']/.test(t) ? t[0].toLowerCase() + t.slice(1) : t;
  }

  // Distanza di modifica (Damerau-Levenshtein ridotta): quante lettere cambiare per passare da a a b.
  function distanza(a, b) {
    a = String(a); b = String(b);
    const d = [];
    for (let i = 0; i <= a.length; i++) d.push([i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const costo = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[a.length][b.length];
  }

  // La parola più simile tra i candidati, se è abbastanza vicina (parole di almeno 3 lettere).
  function suggerisci(parola, candidati) {
    const p = String(parola || '').toLowerCase();
    if (p.length < 3) return null;
    const massimo = p.length <= 4 ? 1 : 2;
    let meglio = null;
    let dm = massimo + 1;
    for (const c of candidati || []) {
      const dd = distanza(p, String(c).toLowerCase());
      if (dd > 0 && dd < dm) { dm = dd; meglio = c; }
    }
    return meglio;
  }

  // Parole che vengono in mente al posto dei mnemonici della CPU giocattolo.
  const SINONIMI = {
    ADD: ['SOMMA', 'AGGIUNGI', 'ADDIZIONA', 'PIU', 'PIÙ'],
    SUB: ['SOTTRAI', 'TOGLI', 'MENO', 'SOTTRAZIONE'],
    MUL: ['MOLTIPLICA', 'MULT', 'MOLT', 'PER', 'MULTIPLY'],
    LOAD: ['CARICA', 'LEGGI', 'PRENDI', 'LD', 'LDA'],
    STORE: ['SALVA', 'MEMORIZZA', 'METTI', 'ST', 'STA'],
    JUMP: ['SALTA', 'VAI', 'GOTO', 'JMP', 'J', 'B', 'BR'],
    JZ: ['SALTASEZERO', 'JE', 'JEQ', 'BEQ', 'BZ'],
    HALT: ['FERMA', 'FERMATI', 'STOP', 'FINE', 'END', 'HLT', 'ALT'],
    DATA: ['DATO', 'DATI', 'NUMERO', 'DB', 'DW', 'WORD', 'BYTE', 'DEF'],
  };
  const STAMPA = ['STAMPA', 'PRINT', 'OUT', 'SCRIVI', 'MOSTRA', 'OUTPUT'];
  const SALTO_SE_NON_ZERO = ['JNZ', 'JNE', 'BNE', 'BNZ'];

  function sinonimo(parola) {
    const p = String(parola || '').toUpperCase();
    for (const k of Object.keys(SINONIMI)) if (SINONIMI[k].includes(p)) return k;
    return null;
  }

  // Un consiglio pratico per correggere l'errore segnalato dall'assemblatore.
  // riga (facoltativa) è la riga di CpuGiocattolo.assembla(), per consigli più precisi.
  function consiglio(messaggio, ris, riga) {
    const msg = String(messaggio || '');
    const testo = riga ? String(riga.testo || '').split(';')[0].trim() : '';
    const parti = testo.replace(ETICHETTA, '$2').split(/[\s,]+/).filter(Boolean);
    let m;
    if ((m = /^Istruzione sconosciuta: "(.*)"/.exec(msg))) {
      const parola = m[1].toUpperCase();
      if (STAMPA.includes(parola)) return 'Per stampare un numero si scrive nella cella dell\'uscita: STORE OUT.';
      if (SALTO_SE_NON_ZERO.includes(parola)) return 'Questa CPU ha solo JZ, «salta se zero»: per saltare quando non è zero, metti un JZ che scavalca un JUMP.';
      if (parti.length === 2 && nomiIsa().concat('DATA').includes(String(parti[1]).toUpperCase())) {
        return 'Se «' + m[1] + '» è un\'etichetta, aggiungi i due punti: ' + m[1] + ': ' + parti[1] + '.';
      }
      const s = sinonimo(parola) || suggerisci(parola, nomiIsa().concat('DATA'));
      if (s) return 'Forse intendevi ' + s + '? Le istruzioni sono ' + nomiIsa().join(', ') + '; per un numero si usa DATA.';
      return 'Le istruzioni sono ' + nomiIsa().join(', ') + '; per mettere un numero in una cella si usa DATA.';
    }
    if ((m = /^Etichetta sconosciuta: "(.*)"/.exec(msg))) {
      const nomi = Object.keys((ris && ris.simboli) || {}).filter((k) => k !== 'out');
      const s = suggerisci(m[1], nomi.concat('out'));
      const base = 'Un\'etichetta si crea scrivendola a inizio riga, seguita dai due punti: per esempio fine: HALT.';
      return s ? 'Forse intendevi ' + (s === 'out' ? 'OUT' : s) + '? ' + base : base;
    }
    if ((m = /^(\w+) vuole l'indirizzo/.exec(msg))) {
      return 'Dopo ' + m[1] + ' scrivi un numero da 0 a 31 o il nome di un\'etichetta, per esempio ' + (ESEMPIO_USO[m[1]] || 'ADD n') + '.';
    }
    if ((m = /^(\w+) non vuole operandi/.exec(msg))) return 'Cancella quello che segue ' + m[1] + ': questa istruzione lavora da sola.';
    if (/Gli indirizzi vanno/.test(msg)) return 'La memoria ha 32 celle, numerate da 0 a 31; la 31 è l\'uscita, OUT.';
    if (/Troppi operandi/.test(msg)) {
      if (parti.length > 2 && nomiIsa().concat('DATA').includes(String(parti[1]).toUpperCase())) {
        return 'Se «' + parti[0] + '» è un\'etichetta, aggiungi i due punti: ' + parti[0] + ': ' + parti.slice(1).join(' ') + '.';
      }
      return 'Una sola istruzione per riga, con al massimo un operando; i commenti cominciano con il punto e virgola.';
    }
    if (/già usata/.test(msg)) return 'Ogni etichetta indica una sola cella: dai un nome diverso alla seconda.';
    if (/troppo lungo/.test(msg)) return 'Istruzioni e dati devono stare nelle celle da 0 a 30: togli qualche riga.';
    if (/parola riservata/.test(msg)) return 'I nomi delle istruzioni, DATA e OUT sono già presi: scegli un altro nome, per esempio «totale».';
    return '';
  }

  /* ---------- testi del copione, con un piccolo markup per i colori ----------
   * [o:…] codice operativo (ambra) · [a:…] indirizzo (azzurro) · [e:…] etichetta (rosa)
   * [d:…] dato (verde) · [w:…] parola di 8 bit (3 bit ambra + 5 azzurri)
   */

  function due(n) { return String(n).padStart(2, '0'); }

  function narra(passo) {
    const C = cpu();
    const p = passo;
    const R = 'Riga ' + p.riga + ': ';
    if (p.fase === 1) {
      if (p.errore) return R + minuscola(italiano(p.errore));
      if (p.tipo === 'vuota') return R + 'vuota, si va avanti.';
      if (p.tipo === 'commento') return R + 'solo un commento, non occupa celle.';
      if (p.tipo === 'etichetta') return R + 'l\'etichetta [e:' + p.etichetta + '] indica la prossima cella libera, la [a:' + p.valore + ']. Va nella tabella dei simboli.';
      if (p.tipo === 'etichetta-istruzione') {
        return R + 'l\'etichetta [e:' + p.etichetta + '] indica la cella [a:' + p.valore + ']' + (p.dato ? ', dove andrà un dato' : '') + '. Va nella tabella dei simboli; il contatore passa a [a:' + p.contatore + '].';
      }
      return R + (p.dato ? 'un dato' : 'un\'istruzione') + ', occuperà la cella [a:' + p.indirizzo + ']. Il contatore passa a [a:' + p.contatore + '].';
    }
    if (p.errore) return R + minuscola(italiano(p.errore));
    const w = C.bin(p.parola, 8);
    if (p.dato) return R + 'DATA non è un\'istruzione: il numero [d:' + p.operando + '] va così com\'è, [d:' + w + '], nella cella [a:' + p.indirizzo + '].';
    const op = '[o:' + p.istruzione + '] diventa [o:' + C.bin(p.codice, 3) + ']';
    let ind;
    if (!p.conOperando) ind = 'non ha indirizzo, i 5 bit restano [a:00000]';
    else if (p.simbolo != null) ind = 'la tabella dei simboli dice che [e:' + p.simbolo + '] è la cella [a:' + p.valore + '], cioè [a:' + C.bin(p.valore, 5) + ']';
    else ind = 'il numero [a:' + p.valore + '] diventa [a:' + C.bin(p.valore, 5) + ']';
    return R + op + '; ' + ind + '. La parola [w:' + w + '] va nella cella [a:' + p.indirizzo + '].';
  }

  // Lo stesso testo senza markup, per i lettori di schermo.
  function semplice(testo) {
    return String(testo || '').replace(/\[[oaedw]:([^\]]*)\]/g, (x, v) => v);
  }

  /* ---------- esecuzione veloce ---------- */

  function esegui(ris, limite) {
    const C = cpu();
    const max = limite || LIMITE_PASSI;
    const st = C.crea(ris.parole);
    const celleDati = new Set();
    for (const r of ris.righe) if (r.istruzione === 'DATA' && r.indirizzo != null) celleDati.add(r.indirizzo);
    const eventi = [];
    const datiEseguiti = [];
    const vuoteEseguite = [];
    while (!st.fermo && eventi.length < max) {
      const ev = C.passo(st);
      if (celleDati.has(ev.indirizzo) && !datiEseguiti.includes(ev.indirizzo)) datiEseguiti.push(ev.indirizzo);
      if (ev.indirizzo >= ris.lunghezza && !vuoteEseguite.includes(ev.indirizzo)) vuoteEseguite.push(ev.indirizzo);
      eventi.push(ev);
    }
    return {
      eventi: eventi, uscita: st.uscita.slice(), fermo: st.fermo, passi: st.passi, acc: st.acc, pc: st.pc,
      memoria: st.mem.slice(), limite: !st.fermo, datiEseguiti: datiEseguiti, vuoteEseguite: vuoteEseguite,
    };
  }

  // Il bilancio di un'esecuzione, in parole.
  function bilancio(esito) {
    const e = esito;
    const usc = e.uscita.length ? 'l\'uscita è ' + e.uscita.join(', ') : 'non ha stampato niente (manca uno STORE OUT?)';
    if (e.limite) {
      return 'Dopo ' + e.passi + ' istruzioni la macchina non si è ancora fermata: forse un ciclo senza uscita. Controlla il JZ che dovrebbe interromperlo, e che ci sia un HALT.';
    }
    let t = 'Fermo dopo ' + e.passi + (e.passi === 1 ? ' istruzione' : ' istruzioni') + ': ' + usc + '.';
    if (e.datiEseguiti.length) {
      t += ' Attenzione: la CPU ha eseguito la cella ' + e.datiEseguiti[0] + ', che contiene un dato, come se fosse un\'istruzione. Programma e dati stanno nella stessa memoria: manca un HALT prima dei dati?';
    } else if (e.vuoteEseguite.length) {
      t += ' Si è fermata su una cella vuota (00000000 vale HALT): manca un HALT alla fine?';
    }
    return t;
  }

  /* ---------- la sfida «Traduci a mano» ---------- */

  const SFIDE_BASE = [['LOAD', 9], ['ADD', 10], ['STORE', 'OUT']];

  function sfida(istruzione, operando) {
    const C = cpu();
    const istr = C.ISA.find((i) => i.nome === String(istruzione).toUpperCase());
    if (!istr || !istr.operando) throw new Error('Istruzione non adatta alla sfida: ' + istruzione);
    const out = String(operando).toUpperCase() === 'OUT';
    const indirizzo = out ? C.OUT : Number(operando);
    if (!Number.isInteger(indirizzo) || indirizzo < 0 || indirizzo > 31) throw new Error('Indirizzo fuori dalla memoria: ' + operando);
    const parola = C.codifica(istr.codice, indirizzo);
    return {
      testo: istr.nome + ' ' + (out ? 'OUT' : indirizzo),
      istruzione: istr.nome, codice: istr.codice, indirizzo: indirizzo, out: out, parola: parola, bits: C.bin(parola, 8),
    };
  }

  // Generatore pseudocasuale ripetibile (mulberry32).
  function casuale(seme) {
    let a = seme >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Tre istruzioni da tradurre: senza seme le tre di partenza, con un seme tre a caso (tutte diverse).
  function sfide(seme) {
    if (seme == null) return SFIDE_BASE.map((x) => sfida(x[0], x[1]));
    const rnd = casuale(seme);
    const nomi = cpu().ISA.filter((i) => i.operando).map((i) => i.nome);
    const scelte = [];
    let giri = 0;
    while (scelte.length < 3 && giri < 200) {
      giri += 1;
      const n = nomi[Math.floor(rnd() * nomi.length)];
      if (scelte.some((s) => s.istruzione === n)) continue;
      const ind = n === 'STORE' && rnd() < 0.4 ? 'OUT' : 1 + Math.floor(rnd() * 30);
      scelte.push(sfida(n, ind));
    }
    return scelte;
  }

  // bits: stringa di 8 cifre o elenco di 8 valori, il primo è il bit più significativo.
  function normalizzaBits(bits) {
    return (Array.isArray(bits) ? bits.map((x) => (x && x !== '0' ? '1' : '0')).join('') : String(bits || '')).replace(/[^01]/g, '');
  }

  function controlla(s, bits) {
    const b = normalizzaBits(bits);
    const ok8 = b.length === 8;
    const codiceOk = ok8 && b.slice(0, 3) === s.bits.slice(0, 3);
    const indirizzoOk = ok8 && b.slice(3) === s.bits.slice(3);
    return { ok: codiceOk && indirizzoOk, codiceOk: codiceOk, indirizzoOk: indirizzoOk, atteso: s.bits, dato: b };
  }

  // Che cosa significano gli 8 bit scritti finora (la lettura dal vivo sotto i bit).
  function leggiBits(bits) {
    const C = cpu();
    const b = normalizzaBits(bits).padEnd(8, '0').slice(0, 8);
    const codice = parseInt(b.slice(0, 3), 2);
    const indirizzo = parseInt(b.slice(3), 2);
    const istr = C.ISA[codice];
    return { codice: codice, nome: istr.nome, indirizzo: indirizzo, operando: istr.operando, testo: istr.operando ? istr.nome + ' ' + indirizzo : istr.nome };
  }

  function spiegaSfida(s, esito) {
    const C = cpu();
    const cella = (x) => (x.out ? 'OUT, la cella 31,' : 'la cella ' + x.indirizzo);
    if (esito.ok) return 'Giusto: ' + s.istruzione + ' è ' + s.bits.slice(0, 3) + ' e ' + cella(s) + ' è ' + s.bits.slice(3) + '.';
    const parti = [];
    if (!esito.codiceOk) parti.push('il codice operativo di ' + s.istruzione + ' è ' + C.bin(s.codice, 3) + ' (guarda il prontuario)');
    if (!esito.indirizzoOk) parti.push(cella(s) + ' in binario a 5 bit si scrive ' + C.bin(s.indirizzo, 5));
    return 'Non ancora: ' + parti.join('; ') + '.';
  }

  // Durata in parole: «48 secondi», «1 minuto e 5 secondi».
  function durataItaliana(ms) {
    const sec = Math.max(1, Math.round(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const ps = s + (s === 1 ? ' secondo' : ' secondi');
    if (!m) return ps;
    const pm = m + (m === 1 ? ' minuto' : ' minuti');
    return s ? pm + ' e ' + ps : pm;
  }

  /* ---------- piccoli aiuti per l'interfaccia (puri, provati nei test) ---------- */

  // Un'etichetta corta per l'errore, da scrivere accanto alla riga sbagliata.
  function breve(messaggio) {
    const m = String(messaggio || '');
    if (/^Istruzione sconosciuta/.test(m)) return 'istruzione sconosciuta';
    if (/^Etichetta sconosciuta/.test(m)) return 'etichetta sconosciuta';
    if (/vuole l'indirizzo/.test(m)) return 'manca l\'indirizzo';
    if (/non vuole operandi/.test(m)) return 'qui niente operando';
    if (/Gli indirizzi vanno/.test(m)) return 'indirizzo oltre 31';
    if (/Troppi operandi/.test(m)) return 'troppi operandi';
    if (/già usata/.test(m)) return 'etichetta già usata';
    if (/troppo lungo/.test(m)) return 'memoria finita';
    if (/parola riservata/.test(m)) return 'nome riservato';
    if (/DATA vuole un numero/.test(m)) return 'serve un numero';
    if (/Una cella da 8 bit/.test(m)) return 'numero troppo grande';
    return 'errore';
  }

  // Il numero della riga (da 1) in cui cade la posizione pos del testo (per esempio il cursore).
  function rigaDi(testo, pos) {
    const t = String(testo == null ? '' : testo);
    const p = Math.max(0, Math.min(t.length, Math.floor(Number(pos) || 0)));
    let n = 1;
    for (let i = 0; i < p; i++) if (t.charCodeAt(i) === 10) n += 1;
    return n;
  }

  // Le etichette che indicano ogni cella, con le maiuscole del sorgente: { 0: ['ciclo'], 31: ['OUT'] }.
  function etichettePerCella(ris) {
    const out = {};
    const simboli = (ris && ris.simboli) || {};
    const righe = (ris && ris.righe) || [];
    for (const k of Object.keys(simboli)) {
      const r = righe.find((x) => x.etichetta && x.etichetta.toLowerCase() === k);
      const nome = r ? r.etichetta : (k === 'out' ? 'OUT' : k);
      (out[simboli[k]] = out[simboli[k]] || []).push(nome);
    }
    return out;
  }

  // Che cosa c'è in una cella, in una frase (per i lettori di schermo e per la spiegazione).
  function descriviCella(ris, indirizzo) {
    const C = cpu();
    const i = Math.floor(Number(indirizzo) || 0);
    const base = 'Cella ' + i;
    if (i === C.OUT) return base + ': l\'uscita, OUT. Un numero scritto qui viene stampato.';
    const n = mappa(ris).rigaPerCella[i];
    const r = n != null ? ris.righe[n - 1] : null;
    if (!r) return base + ': vuota, 00000000 (la CPU la leggerebbe come HALT).';
    const parola = ris.parole[i];
    const testo = String(r.testo).split(';')[0].trim().replace(/\s+/g, ' ');
    if (r.istruzione === 'DATA') {
      return base + ': il dato ' + numero(r.operando) + ', in binario ' + C.bin(parola, 8) + ', dalla riga ' + n + ' («' + testo + '»).';
    }
    return base + ': ' + C.bin(parola, 8) + ', cioè ' + C.disassembla(parola) + ', dalla riga ' + n + ' («' + testo + '»).';
  }

  // I tempi dell'animazione per ogni velocità, ricavati dalle durate del motore (ctx.DURATA).
  function tempi(velocita, D) {
    const d = D || { istante: 80, veloce: 180, normale: 350, lenta: 600, narrativa: 1000 };
    const f = velocita === 'lenta' ? 1.8 : velocita === 'veloce' ? 0.45 : 1;
    const t = (ms) => Math.round(ms * f);
    return {
      fattore: f,
      riga: t(d.normale), // prima passata: una riga che occupa una cella
      breve: t(d.veloce), // commenti e righe vuote
      volo: t(d.lenta * 0.85), // la parola vola nella sua cella
      voloBreve: t(d.normale * 1.1), // etichetta → tabella dei simboli, indirizzo ← tabella
      bit: t(d.istante * 0.6), // ritardo tra un bit e il successivo
      campo: t(d.normale), // il tempo per leggere un campo (codice operativo o indirizzo)
      sosta: t(d.normale), // pausa dopo ogni parola
      esegui: t(d.veloce), // un'istruzione in esecuzione
    };
  }

  const Logica = {
    LIMITE_PASSI: LIMITE_PASSI,
    breve: breve,
    rigaDi: rigaDi,
    etichettePerCella: etichettePerCella,
    descriviCella: descriviCella,
    tempi: tempi,
    numero: numero,
    prontuario: prontuario,
    dividiRiga: dividiRiga,
    piano: piano,
    copione: copione,
    mappa: mappa,
    italiano: italiano,
    minuscola: minuscola,
    distanza: distanza,
    suggerisci: suggerisci,
    sinonimo: sinonimo,
    consiglio: consiglio,
    narra: narra,
    semplice: semplice,
    esegui: esegui,
    bilancio: bilancio,
    sfida: sfida,
    sfide: sfide,
    controlla: controlla,
    leggiBits: leggiBits,
    spiegaSfida: spiegaSfida,
    durataItaliana: durataItaliana,
    due: due,
  };

  /* ======================= interfaccia ======================= */

  const LH = 22; // altezza di una riga dell'editor, in pixel
  const PAD = 10; // margine interno verticale dell'editor
  const MAX_ANIMATI = 90; // istruzioni mostrate una per una in esecuzione; le altre in un lampo

  const css = `
    .${P} { container: ${P} / inline-size; --asm-op: var(--trace-2); --asm-ind: var(--trace-3); --asm-eti: var(--trace-4); --asm-dato: var(--trace-1); --asm-err: #ff8f80; --asm-v: 1; }
    .${P}-gr { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; min-width: 0; }
    .${P}-gr-et { font-size: 13px; color: var(--lab-text); }
    .${P}-primario { min-width: 8.8em; }
    .${P}-ico { flex: none; }
    .${P}-legenda { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 0; font-size: 13px; color: var(--lab-text); }
    .${P}-leg { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
    .${P}-leg::before { content: ""; width: 10px; height: 10px; border-radius: 3px; background: var(--c); box-shadow: 0 0 6px color-mix(in srgb, var(--c) 55%, transparent); }
    .${P}-leg--op { --c: var(--asm-op); } .${P}-leg--ind { --c: var(--asm-ind); } .${P}-leg--eti { --c: var(--asm-eti); } .${P}-leg--dato { --c: var(--asm-dato); }

    .${P}-k-o { color: var(--asm-op); } .${P}-k-a { color: var(--asm-ind); } .${P}-k-e { color: var(--asm-eti); } .${P}-k-d { color: var(--asm-dato); } .${P}-k-err { color: var(--asm-err); }
    .${P}-k-o, .${P}-k-a, .${P}-k-e, .${P}-k-d, .${P}-w { font-family: var(--mono); font-weight: 700; font-size: max(13px, .95em); }
    .${P}-w { white-space: nowrap; }
    .${P}-w .${P}-k-o { margin-right: .35ch; font-size: 1em; }
    .${P}-w .${P}-k-a, .${P}-w .${P}-k-d { font-size: 1em; }

    .${P}-arena { position: relative; display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; padding: 14px; }
    .${P}-col { display: contents; }
    .${P}-sorgente { order: 1; } .${P}-simboli-pan { order: 2; } .${P}-banco { order: 3; } .${P}-memoria { order: 4; } .${P}-esec { order: 5; } .${P}-codici { order: 6; }
    .${P}-pan { min-width: 0; padding: 12px; background: var(--lab-panel); border: 1px solid var(--lab-line); border-radius: 12px; }
    .${P}-tit { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 2px 10px; margin: 0 0 10px; font: 800 13px var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--lab-bright); }
    .${P}-tit small { font: 500 13px var(--font); letter-spacing: 0; text-transform: none; color: var(--lab-text); }
    .${P}-nota { margin: 8px 0 0; font-size: 13px; line-height: 1.45; color: var(--lab-text); }

    /* editor: un velo colorato sotto un textarea trasparente */
    .${P}-editor { position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr); height: ${12 * LH + 2 * PAD}px; background: #000; border: 1px solid var(--lab-line); border-radius: 9px; overflow: hidden; transition: border-color var(--pg-dur-veloce) ease; }
    .${P}-editor:focus-within { border-color: var(--trace-1); box-shadow: 0 0 0 2px color-mix(in srgb, var(--trace-1) 45%, transparent); }
    .${P}-num { position: relative; overflow: hidden; min-width: 2.7em; background: #050a08; border-right: 1px solid var(--lab-line); }
    .${P}-num-in { padding: ${PAD}px 0; will-change: transform; }
    .${P}-n { position: relative; height: ${LH}px; padding: 0 8px 0 9px; font: 500 13px/${LH}px var(--mono); text-align: right; color: color-mix(in srgb, var(--lab-text) 62%, transparent); font-variant-numeric: tabular-nums; }
    .${P}-n.is-attiva { color: var(--lab-bright); }
    .${P}-n.is-errore, .${P}-n.is-altro { color: var(--asm-err); font-weight: 700; }
    .${P}-n.is-errore::before, .${P}-n.is-altro::before { content: ""; position: absolute; left: 0; top: 3px; bottom: 3px; width: 3px; border-radius: 0 3px 3px 0; background: var(--asm-err); }
    .${P}-n.is-altro::before { opacity: .55; }
    .${P}-area { position: relative; min-width: 0; }
    .${P}-velo { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
    .${P}-velo-in { position: absolute; left: 0; top: 0; min-width: 100%; padding: ${PAD}px 0; will-change: transform; }
    .${P}-linee { position: relative; }
    .${P}-r { position: relative; height: ${LH}px; padding: 0 12px; white-space: pre; font: 500 14px/${LH}px var(--mono); color: var(--lab-text); }
    .${P}-r.is-errore { background: color-mix(in srgb, var(--asm-err) 13%, transparent); }
    .${P}-r-nota { font: 600 13px/${LH}px var(--font); color: var(--asm-err); }
    .${P} .${P}-ta { position: absolute; inset: 0; z-index: 1; display: block; width: 100%; height: 100%; min-height: 0; margin: 0; padding: ${PAD}px 12px; border: 0; border-radius: 0; background: transparent; color: transparent; -webkit-text-fill-color: transparent; caret-color: var(--lab-bright); font: 500 14px/${LH}px var(--mono); letter-spacing: 0; white-space: pre; overflow: auto; resize: none; tab-size: 8; scrollbar-width: thin; scrollbar-color: var(--lab-line) transparent; }
    .${P} .${P}-ta:focus-visible { outline: none; }
    .${P}-ta::placeholder { color: color-mix(in srgb, var(--lab-text) 70%, transparent); -webkit-text-fill-color: color-mix(in srgb, var(--lab-text) 70%, transparent); }
    .${P}-ta::selection { background: color-mix(in srgb, var(--trace-3) 34%, transparent); }
    .${P}-t-etichetta, .${P}-t-simbolo { color: var(--asm-eti); }
    .${P}-t-istruzione { color: var(--asm-op); }
    .${P}-t-operando { color: var(--asm-ind); }
    .${P}-t-dati, .${P}-t-numero { color: var(--asm-dato); }
    .${P}-t-ignoto, .${P}-t-extra { color: var(--asm-err); text-decoration: underline wavy color-mix(in srgb, var(--asm-err) 75%, transparent); text-underline-offset: 4px; }
    .${P}-t-commento { color: color-mix(in srgb, var(--lab-text) 66%, transparent); }
    .${P}-barra-riga, .${P}-barra-link { position: absolute; left: 0; right: 0; top: 0; height: ${LH}px; pointer-events: none; opacity: 0; transition: transform calc(var(--pg-dur-normale) * var(--asm-v)) var(--pg-ease-smooth), opacity var(--pg-dur-veloce) ease; }
    .${P}-barra-riga { background: color-mix(in srgb, var(--trace-1) 15%, transparent); box-shadow: inset 3px 0 0 var(--trace-1); }
    .${P}-barra-riga.is-esec { background: color-mix(in srgb, var(--asm-ind) 15%, transparent); box-shadow: inset 3px 0 0 var(--asm-ind); }
    .${P}-barra-link { background: rgba(255, 255, 255, .07); box-shadow: inset 3px 0 0 rgba(255, 255, 255, .55); transition: opacity var(--pg-dur-veloce) ease; }
    .${P}-barra-riga.is-visibile, .${P}-barra-link.is-visibile { opacity: 1; }
    .${P}-subito { transition: none !important; }
    .${P}-sint { margin: 8px 0 0; font-size: 13px; color: var(--lab-text); line-height: 1.5; }
    .${P}-sint code { font-size: 13px; white-space: normal; -webkit-box-decoration-break: clone; box-decoration-break: clone; }

    .${P}-err { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; margin-top: 10px; padding: 10px 12px; border-radius: 10px; border: 1px solid color-mix(in srgb, var(--asm-err) 55%, transparent); background: color-mix(in srgb, var(--asm-err) 9%, var(--lab-panel)); animation: ${P}-entra var(--pg-dur-normale) var(--pg-ease-smooth); }
    .${P}-err[hidden] { display: none; }
    .${P}-err-ico { width: 24px; height: 24px; border-radius: 50%; background: var(--asm-err); color: #2a0703; font: 900 15px/24px var(--font); text-align: center; }
    .${P}-err p { margin: 0; }
    .${P}-err-tit { font: 700 13px var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--asm-err); }
    .${P}-err-msg { margin-top: 3px !important; color: var(--lab-bright); font-weight: 700; }
    .${P}-err-cons { margin-top: 4px !important; font-size: 14px; line-height: 1.5; }
    .${P}-err-altri { margin-top: 4px !important; font-size: 13px; }
    .${P}-err-altri:empty { display: none; }
    .${P}-err .pg-btn { margin-top: 8px; }

    .${P}-simboli { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(146px, 1fr)); gap: 6px; }
    .${P}-sim { display: flex; align-items: baseline; gap: 7px; min-width: 0; padding: 7px 10px; border-radius: 8px; background: var(--lab-bg); border: 1px solid var(--lab-line); font: 500 14px var(--mono); transition: border-color var(--pg-dur-veloce) ease, box-shadow var(--pg-dur-veloce) ease, opacity var(--pg-dur-veloce) ease; }
    .${P}-sim-nome { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--asm-eti); font-weight: 700; }
    .${P}-sim-fr { color: var(--lab-text); }
    .${P}-sim-val { color: var(--asm-ind); font-weight: 700; }
    .${P}-sim-bit { margin-left: auto; font-size: 13px; color: color-mix(in srgb, var(--asm-ind) 72%, var(--lab-text)); }
    .${P}-sim.is-pred { border-style: dashed; }
    .${P}-sim.is-attesa { opacity: 0; }
    .${P}-sim.is-nuovo { animation: ${P}-entra calc(var(--pg-dur-normale) * var(--asm-v)) var(--pg-ease-bounce) both; }
    .${P}-sim.is-cerca { border-color: var(--asm-eti); box-shadow: 0 0 0 1px var(--asm-eti), 0 0 16px color-mix(in srgb, var(--asm-eti) 35%, transparent); }

    .${P}-prontuario { width: 100%; min-width: 0; border-collapse: collapse; font-size: 14px; }
    .${P}-prontuario th, .${P}-prontuario td { padding: 5px 8px; text-align: left; vertical-align: baseline; border: 0; border-top: 1px solid var(--lab-line); transition: background-color var(--pg-dur-veloce) ease, box-shadow var(--pg-dur-veloce) ease; }
    .${P}-prontuario thead th { position: static; border-top: 0; padding-top: 0; background: transparent; font: 600 13px var(--font); letter-spacing: 0; text-transform: none; color: var(--lab-text); }
    .${P}-prontuario tbody tr:hover { background: color-mix(in srgb, var(--asm-op) 6%, transparent); }
    .${P}-pr-bit, .${P}-pr-nome { font: 700 14px var(--mono); color: var(--asm-op); white-space: nowrap; }
    .${P}-pr-desc { font-size: 13px; line-height: 1.4; color: var(--lab-text); }
    .${P}-prontuario tr.is-cerca > * { background: color-mix(in srgb, var(--asm-op) 15%, transparent); }
    .${P}-prontuario tr.is-cerca > :first-child { box-shadow: inset 3px 0 0 var(--asm-op); }

    .${P}-banco { container: ${P}-banco / inline-size; display: grid; gap: 10px; align-content: start; }
    .${P}-banco-testa { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 2px 12px; }
    .${P}-banco-fase { font: 800 13px var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--lab-bright); }
    .${P}-banco-fase::before { content: ""; display: inline-block; width: 9px; height: 9px; margin-right: 8px; border-radius: 50%; background: var(--fase); vertical-align: 0; box-shadow: 0 0 8px color-mix(in srgb, var(--fase) 70%, transparent); }
    .${P}-banco { --fase: var(--lab-line); }
    .${P}-banco[data-fase="1"] { --fase: var(--asm-eti); } .${P}-banco[data-fase="2"] { --fase: var(--asm-op); } .${P}-banco[data-fase="esec"] { --fase: var(--asm-ind); }
    .${P}-banco[data-fase="fatto"] { --fase: var(--trace-1); } .${P}-banco[data-fase="errore"] { --fase: var(--asm-err); }
    .${P}-banco-dove { font: 600 13px var(--mono); color: var(--lab-text); font-variant-numeric: tabular-nums; }
    .${P}-prog { height: 3px; border-radius: 2px; background: var(--lab-line); overflow: hidden; }
    .${P}-prog i { display: block; height: 100%; background: var(--fase); transform-origin: 0 50%; transform: scaleX(0); transition: transform var(--pg-dur-normale) var(--pg-ease-smooth); }
    .${P}-banco-riga { display: flex; align-items: baseline; gap: 10px; min-height: 32px; margin: 0; padding: 4px 10px; border-radius: 8px; background: #000; border: 1px solid var(--lab-line); font: 500 14px/22px var(--mono); white-space: pre; overflow-x: auto; scrollbar-width: thin; }
    .${P}-rn { flex: none; font: 600 13px var(--font); color: var(--lab-text); }
    .${P}-banco-riga code { font: inherit; background: none; border: 0; padding: 0; color: var(--lab-text); }
    .${P}-banco-corpo { min-height: 138px; display: grid; align-content: center; gap: 10px; }
    .${P}-riposo { margin: 0; font-size: 14px; line-height: 1.5; color: var(--lab-text); }
    .${P}-campi { display: grid; grid-template-columns: auto auto minmax(0, 1fr); grid-template-rows: repeat(4, auto); column-gap: 6px; row-gap: 4px; align-items: center; }
    .${P}-campi > .c1 { grid-column: 1; justify-self: end; text-align: right; }
    .${P}-campi > .c2 { grid-column: 2; justify-self: start; }
    .${P}-campi > .c12 { grid-column: 1 / 3; justify-self: start; }
    .${P}-campi > .c3 { grid-column: 3; grid-row: 1 / 5; align-self: center; justify-self: start; padding-left: 16px; }
    .${P}-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 30px; padding: 3px 10px; border-radius: 8px; border: 1px solid var(--c); color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); font: 700 15px var(--mono); white-space: nowrap; transition: opacity var(--pg-dur-veloce) ease; }
    .${P}-chip--op { --c: var(--asm-op); } .${P}-chip--ind { --c: var(--asm-ind); } .${P}-chip--eti { --c: var(--asm-eti); } .${P}-chip--dato { --c: var(--asm-dato); }
    .${P}-chip--nulla { --c: color-mix(in srgb, var(--lab-text) 70%, transparent); font: 600 13px var(--font); border-style: dashed; }
    .${P}-chip.is-attesa { opacity: 0; }
    .${P}-uguale { color: var(--lab-text); font: 600 14px var(--mono); }
    .${P}-fr { font-size: 13px; color: var(--lab-text); white-space: nowrap; }
    .${P}-bits { display: inline-flex; gap: 3px; }
    .${P}-bit { --c: var(--asm-ind); width: 24px; height: 32px; display: grid; place-items: center; border-radius: 6px; border: 1px solid color-mix(in srgb, var(--c) 45%, var(--lab-line)); background: #000; color: var(--c); font: 700 17px var(--mono); }
    .${P}-bit--op { --c: var(--asm-op); } .${P}-bit--dato { --c: var(--asm-dato); }
    .${P}-bit.is-1 { background: color-mix(in srgb, var(--c) 22%, #000); box-shadow: 0 0 9px color-mix(in srgb, var(--c) 38%, transparent); }
    .${P}-bit.is-spento { color: transparent; background: #000; box-shadow: none; }
    .${P}-bit.is-pop { animation: ${P}-pop calc(var(--pg-dur-veloce) * var(--asm-v)) var(--pg-ease-bounce) both; }
    .${P}-bit.is-vago { color: color-mix(in srgb, var(--c) 45%, transparent); }
    .${P}-didas { font-size: 13px; color: var(--lab-text); }
    .${P}-dest { display: grid; gap: 1px; font-size: 13px; color: var(--lab-text); }
    .${P}-dest b { font: 800 22px/1.1 var(--mono); color: var(--asm-ind); }
    .${P}-azione { margin: 0; font-size: 14px; line-height: 1.45; color: var(--lab-text); }
    .${P}-contatore { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
    .${P}-contatore-et { display: grid; font-size: 13px; color: var(--lab-text); line-height: 1.35; }
    .${P}-contatore-et b { font-weight: 700; color: var(--lab-bright); }
    .${P}-cifre { display: inline-flex; gap: 3px; }
    .${P}-cifra { width: 30px; height: 42px; overflow: hidden; border-radius: 6px; background: #000; border: 1px solid color-mix(in srgb, var(--asm-ind) 45%, var(--lab-line)); font: 800 25px/42px var(--mono); color: var(--asm-ind); text-align: center; box-shadow: inset 0 9px 10px -8px rgba(255, 255, 255, .18), inset 0 -9px 10px -8px rgba(0, 0, 0, .9); }
    .${P}-cifra span { display: block; }
    .${P}-cifra.is-gira span { animation: ${P}-gira calc(var(--pg-dur-normale) * var(--asm-v)) var(--pg-ease-smooth); }
    .${P}-fatti { display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 6px; margin: 0; }
    .${P}-fatti > div { display: grid; gap: 1px; padding: 7px 10px; border-radius: 8px; background: var(--lab-bg); border: 1px solid var(--lab-line); }
    .${P}-fatti dt { font-size: 13px; color: var(--lab-text); }
    .${P}-fatti dd { margin: 0; font: 800 18px var(--mono); color: var(--lab-bright); }
    @container ${P}-banco (max-width: 390px) {
      .${P}-campi { grid-template-columns: auto auto; grid-template-rows: none; }
      .${P}-campi > .c3 { grid-column: 1 / -1; grid-row: auto; justify-self: start; padding: 6px 0 0; }
      .${P}-dest { grid-auto-flow: column; align-items: baseline; gap: 8px; }
    }

    .${P}-memoria { container: ${P}-mem / inline-size; }
    .${P}-mem-wrap { position: relative; }
    .${P}-griglia { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
    .${P}-griglia > li { min-width: 0; }
    @container ${P}-mem (max-width: 335px) { .${P}-griglia { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    .${P}-cella { position: relative; display: grid; gap: 3px; width: 100%; min-height: 48px; padding: 5px 5px 6px; border-radius: 8px; border: 1px solid var(--lab-line); background: var(--lab-bg); color: var(--lab-text); font: 500 13px/1.25 var(--mono); text-align: left; cursor: pointer; transition: border-color var(--pg-dur-veloce) ease, background-color var(--pg-dur-veloce) ease, opacity var(--pg-dur-normale) ease, box-shadow var(--pg-dur-veloce) ease; }
    .${P}-cella:hover { border-color: color-mix(in srgb, var(--lab-bright) 40%, var(--lab-line)); }
    .${P}-cella-top { display: flex; justify-content: space-between; gap: 4px; min-width: 0; }
    .${P}-cella-ind { flex: none; color: var(--asm-ind); }
    .${P}-cella-eti { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--asm-eti); }
    .${P}-cella-bit { white-space: nowrap; overflow: hidden; }
    .${P}-cella-bit .o { color: var(--asm-op); margin-right: 3px; } .${P}-cella-bit .a { color: var(--asm-ind); } .${P}-cella-bit .d { color: var(--asm-dato); } .${P}-cella-bit .u { color: var(--asm-eti); }
    .${P}-cella.is-vuota .${P}-cella-bit { color: color-mix(in srgb, var(--lab-text) 40%, transparent); }
    .${P}-cella.is-vuota .${P}-cella-ind { opacity: .7; }
    .${P}-cella.is-riservata { border-style: dashed; border-color: color-mix(in srgb, var(--lab-bright) 50%, var(--lab-line)); }
    .${P}-cella.is-riservata .${P}-cella-bit { color: var(--lab-bright); font-family: var(--font); font-weight: 600; }
    .${P}-cella.is-errore { border-style: dashed; border-color: var(--asm-err); background: color-mix(in srgb, var(--asm-err) 10%, var(--lab-bg)); }
    .${P}-cella.is-errore .${P}-cella-bit { color: var(--asm-err); font-family: var(--font); font-weight: 700; }
    .${P}-cella.is-out { border-color: color-mix(in srgb, var(--asm-eti) 55%, var(--lab-line)); }
    .${P}-cella.is-out .${P}-cella-bit { color: var(--asm-eti); }
    .${P}-cella.is-vecchia { opacity: .42; }
    .${P}-cella.is-collegata { border-color: var(--lab-bright); box-shadow: 0 0 0 1px var(--lab-bright), 0 0 14px rgba(255, 255, 255, .14); }
    .${P}-cella::after { content: ""; position: absolute; inset: -3px; border-radius: 10px; border: 2px solid var(--lampo, var(--trace-1)); opacity: 0; pointer-events: none; }
    .${P}-cella.is-lampo::after { animation: ${P}-lampo calc(var(--pg-dur-lenta) * var(--asm-v)) ease-out; }
    .${P}-cursore { position: absolute; left: 0; top: 0; z-index: 2; border-radius: 10px; pointer-events: none; opacity: 0; transition: transform calc(var(--pg-dur-normale) * var(--asm-v)) var(--pg-ease-smooth), opacity var(--pg-dur-veloce) ease; }
    .${P}-cursore.is-visibile { opacity: 1; }
    .${P}-cursore.is-conta { border: 2px dashed var(--asm-ind); }
    .${P}-cursore.is-scrive { border: 2px solid var(--trace-1); box-shadow: 0 0 16px color-mix(in srgb, var(--trace-1) 40%, transparent); }
    .${P}-cursore.is-pc { border: 2px solid var(--asm-ind); box-shadow: 0 0 0 3px color-mix(in srgb, var(--asm-ind) 22%, transparent), 0 0 16px color-mix(in srgb, var(--asm-ind) 40%, transparent); transition-duration: calc(var(--pg-dur-veloce) * var(--asm-v)), var(--pg-dur-veloce); }
    .${P}-mem-info { min-height: 2.9em; margin: 10px 0 0; font-size: 13px; line-height: 1.45; color: var(--lab-text); }
    .${P}-mem-nota { color: var(--trace-2); }

    .${P}-letture { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 0 0 10px; }
    .${P}-letture > div { display: grid; gap: 1px; min-width: 0; padding: 6px 9px; border-radius: 8px; background: var(--lab-bg); border: 1px solid var(--lab-line); }
    .${P}-letture dt { font: 600 13px var(--font); color: var(--lab-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .${P}-letture dd { margin: 0; font: 700 21px/1.25 var(--mono); font-variant-numeric: tabular-nums; color: var(--lab-bright); }
    .${P}-letture .is-pc dd { color: var(--asm-ind); } .${P}-letture .is-acc dd { color: var(--asm-dato); }
    .${P}-val { display: inline-block; }
    .${P}-val.is-cambia { animation: ${P}-tic var(--pg-dur-veloce) var(--pg-ease-smooth); }
    .${P}-uscita { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
    .${P}-uscita-et { font-size: 13px; color: var(--lab-text); }
    .${P}-nastro { flex: 1 1 160px; min-width: 0; min-height: 42px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; list-style: none; margin: 0; padding: 4px 6px; border-radius: 8px; background: #000; border: 1px solid color-mix(in srgb, var(--asm-eti) 35%, var(--lab-line)); }
    .${P}-nastro li { padding: 3px 9px; border-radius: 6px; font: 700 16px var(--mono); color: var(--asm-eti); background: color-mix(in srgb, var(--asm-eti) 12%, transparent); border: 1px solid color-mix(in srgb, var(--asm-eti) 45%, transparent); }
    .${P}-nastro li.is-nuovo { animation: ${P}-entra var(--pg-dur-normale) var(--pg-ease-bounce) both; }
    .${P}-nastro li.${P}-nastro-vuoto { padding: 0 4px; border: 0; background: none; font: 500 13px var(--font); color: var(--lab-text); }

    .${P}-narra { margin: 0; }
    .${P}-narra-sub { margin: 6px 0 0 !important; font-size: 14px; color: var(--lab-text); }
    .${P}-volo { position: absolute; z-index: 5; display: flex; align-items: center; justify-content: center; pointer-events: none; will-change: transform, opacity; }
    .${P}-volo .${P}-bits { gap: 3px; }
    .${P}-volo-num { font: 800 15px var(--mono); color: var(--asm-ind); padding: 3px 8px; border-radius: 7px; border: 1px solid var(--asm-ind); background: color-mix(in srgb, var(--asm-ind) 18%, #000); }
    .${P}-volo .${P}-chip { background: color-mix(in srgb, var(--c) 18%, #000); box-shadow: 0 6px 18px rgba(0, 0, 0, .45); }

    .${P}-sfida { padding: 16px 18px 18px; border-top: 1px solid var(--lab-line); background: linear-gradient(180deg, rgba(255, 255, 255, .03), transparent 140px); }
    .${P}-sfida-testa { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; }
    .${P}-sfida h4 { margin: 0; font: 800 13px var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--trace-1); }
    .${P}-sfida-intro { margin: 8px 0 10px; max-width: 72ch; font-size: 15px; line-height: 1.55; }
    .${P}-mini { display: flex; flex-wrap: wrap; gap: 5px 6px; list-style: none; margin: 0 0 14px; padding: 0; }
    .${P}-mini li { padding: 3px 8px; border-radius: 6px; background: var(--lab-bg); border: 1px solid var(--lab-line); font: 600 13px var(--mono); color: var(--lab-text); }
    .${P}-mini b { color: var(--asm-op); }
    .${P}-sfide { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .${P}-sf { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; padding: 12px; border-radius: 12px; background: var(--lab-panel); border: 1px solid var(--lab-line); transition: border-color var(--pg-dur-normale) ease; }
    .${P}-sf.is-ok { border-color: color-mix(in srgb, var(--trace-1) 65%, var(--lab-line)); }
    .${P}-sf-testa { display: grid; gap: 3px; align-content: start; }
    .${P}-sf-istr { font: 700 20px var(--mono); color: var(--lab-bright); }
    .${P}-sf-istr small { font: 600 13px var(--font); color: var(--lab-text); margin-right: 8px; }
    .${P}-sf-lettura { margin: 0; font-size: 13px; color: var(--lab-text); }
    .${P}-sf-bits { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px 14px; }
    .${P}-sf-gr { --c: var(--asm-ind); display: grid; gap: 3px; }
    .${P}-sf-gr--op { --c: var(--asm-op); }
    .${P}-sf-pesi, .${P}-sf-tasti { display: flex; gap: 4px; }
    .${P}-sf-pesi span { width: 40px; text-align: center; font: 600 13px var(--mono); color: color-mix(in srgb, var(--c) 60%, var(--lab-text)); }
    .${P}-tasto { width: 40px; height: 44px; padding: 0; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--c) 40%, var(--lab-line)); background: #000; color: color-mix(in srgb, var(--c) 50%, var(--lab-text)); font: 800 19px var(--mono); cursor: pointer; transition: background-color var(--pg-dur-veloce) ease, box-shadow var(--pg-dur-veloce) ease, border-color var(--pg-dur-veloce) ease, transform var(--pg-dur-istante) ease; }
    .${P}-tasto:hover { border-color: var(--c); }
    .${P}-tasto:active { transform: scale(.94); }
    .${P}-tasto[aria-pressed="true"] { background: color-mix(in srgb, var(--c) 30%, #000); border-color: var(--c); color: #fff; box-shadow: 0 0 12px color-mix(in srgb, var(--c) 45%, transparent); }
    .${P}-sf-gr-et { font-size: 13px; color: var(--lab-text); }
    .${P}-sf-gr.is-giusto .${P}-sf-gr-et { color: var(--trace-1); font-weight: 700; }
    .${P}-sf-gr.is-sbagliato .${P}-sf-gr-et { color: var(--asm-err); font-weight: 700; }
    .${P}-sf-gr.is-sbagliato .${P}-tasto { border-color: color-mix(in srgb, var(--asm-err) 70%, var(--lab-line)); }
    .${P}-sf-azioni { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
    .${P}-sf-esito { flex: 1 1 200px; margin: 0; font-size: 14px; line-height: 1.45; }
    .${P}-sf-esito.is-ok { color: var(--trace-1); }
    .${P}-sf-esito.is-no { color: #ffc2b8; }
    .${P}-sfida-fine { margin: 14px 0 0; padding: 12px 14px; border-radius: 10px; background: color-mix(in srgb, var(--trace-1) 9%, transparent); border: 1px solid color-mix(in srgb, var(--trace-1) 35%, transparent); font-size: 15px; line-height: 1.55; animation: ${P}-entra var(--pg-dur-normale) var(--pg-ease-smooth); }
    .${P}-sfida-fine[hidden] { display: none; }

    @keyframes ${P}-entra { from { opacity: 0; transform: translateY(6px) scale(.94); } to { opacity: 1; transform: none; } }
    @keyframes ${P}-pop { from { opacity: 0; transform: translateY(-9px) scale(.55); } to { opacity: 1; transform: none; } }
    @keyframes ${P}-lampo { from { opacity: 1; transform: scale(1.07); } to { opacity: 0; transform: none; } }
    @keyframes ${P}-gira { from { opacity: 0; transform: translateY(-70%); } to { opacity: 1; transform: none; } }
    @keyframes ${P}-tic { from { opacity: .25; transform: translateY(-45%); } to { opacity: 1; transform: none; } }

    @container ${P} (min-width: 760px) {
      .${P}-arena { grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr); align-items: start; gap: 14px; padding: 16px; }
      .${P}-col { display: grid; gap: 14px; align-content: start; min-width: 0; }
      .${P}-sf { grid-template-columns: 9.5em auto minmax(0, 1fr); align-items: center; }
    }
    @container ${P} (max-width: 480px) {
      .${P}-arena { padding: 10px; gap: 10px; }
      .${P}-pan { padding: 10px; }
      .${P}-sfida { padding: 14px 12px 16px; }
      .${P}-sf { padding: 10px; }
    }
    @media (pointer: coarse) {
      .${P}-r, .${P} .${P}-ta { font-size: 16px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .${P}-barra-riga, .${P}-barra-link, .${P}-cursore, .${P}-prog i, .${P}-cella, .${P}-sim, .${P}-chip, .${P}-tasto, .${P}-editor, .${P}-sf { transition: none; }
      .${P}-sim.is-nuovo, .${P}-bit.is-pop, .${P}-cella.is-lampo::after, .${P}-cifra.is-gira span, .${P}-nastro li.is-nuovo, .${P}-val.is-cambia, .${P}-err, .${P}-sfida-fine { animation: none; }
    }
  `;

  function monta(el, ctx) {
    const { h } = ctx;
    const C = cpu();
    const id = ctx.uid('asm');
    const N_ESEMPI = [['somma', 'Somma'], ['conto', 'Conto'], ['formula', 'Formula']];
    const stato = {
      velocita: 'media', modo: 'pronto', epoca: 0,
      cop: null, sorgenteCop: null, indice: 0, intermezzo: false,
      vecchia: false, esito: null,
      errRiga: null, hoverRiga: null, cursore: null,
    };
    const modello = [];
    const T = () => tempi(stato.velocita, ctx.DURATA);
    const silenzia = (err) => { if (!ctx.annullato(err)) throw err; };
    const d2 = (n) => String(n).padStart(2, '0');

    /* ---------- piccoli costruttori ---------- */

    function colora(testo) {
      const out = [];
      const s = String(testo || '');
      const re = /\[([oaedw]):([^\]]*)\]/g;
      let ultimo = 0;
      let m;
      while ((m = re.exec(s))) {
        if (m.index > ultimo) out.push(s.slice(ultimo, m.index));
        out.push(m[1] === 'w' ? parola(m[2]) : h('span', { class: P + '-k-' + m[1] }, m[2]));
        ultimo = re.lastIndex;
      }
      if (ultimo < s.length) out.push(s.slice(ultimo));
      return out;
    }
    function parola(bits, dato) {
      if (dato) return h('span', { class: P + '-w' }, h('span', { class: P + '-k-d' }, bits));
      return h('span', { class: P + '-w' }, h('span', { class: P + '-k-o' }, bits.slice(0, 3)), h('span', { class: P + '-k-a' }, bits.slice(3)));
    }
    function pezzi(testo) {
      return dividiRiga(testo).map((t) => (t.tipo === 'spazio' ? t.testo : h('span', { class: P + '-t-' + t.tipo }, t.testo)));
    }
    function chip(testo, tipo, extra) {
      return h('span', { class: P + '-chip ' + P + '-chip--' + tipo + (extra ? ' ' + extra : '') }, testo);
    }
    // Icone disegnate (i caratteri ⏸ e ⏭ mancano in molti font).
    function icona(tipo) {
      const d = { pausa: 'M3 2h3.5v12H3zM9.5 2H13v12H9.5z', play: 'M4 2l10 6-10 6z', fine: 'M2 2l7 6-7 6zM8 2l6 6-6 6zM13.4 2H15v12h-1.6z' }[tipo];
      return ctx.s('svg', { viewBox: '0 0 16 16', width: '14', height: '14', 'aria-hidden': 'true', focusable: 'false', class: P + '-ico' }, ctx.s('path', { d: d, fill: 'currentColor' }));
    }
    function bitBox(b, tipo, spento) {
      return h('span', { class: P + '-bit ' + P + '-bit--' + tipo + (b === '1' ? ' is-1' : '') + (spento ? ' is-spento' : '') }, b);
    }

    /* ---------- barra degli esempi e dei comandi ---------- */

    const bEsempi = N_ESEMPI.map(([k, t]) => h('button', {
      type: 'button', class: 'pg-btn', 'aria-pressed': String(k === 'somma'), 'data-k': k, onclick: () => caricaEsempio(k),
    }, t));
    const bVel = [['lenta', 'Lenta'], ['media', 'Media'], ['veloce', 'Veloce']].map(([k, t]) => h('button', {
      type: 'button', class: 'pg-btn', 'aria-pressed': String(k === stato.velocita), 'data-k': k, onclick: () => scegliVelocita(k),
    }, t));
    const btnAssembla = h('button', { type: 'button', class: 'pg-btn pg-btn--primario ' + P + '-primario', onclick: () => premiAssembla() }, 'Assembla');
    const btnPasso = h('button', { type: 'button', class: 'pg-btn', onclick: () => comando(passoManuale) }, 'Passo ›');
    const btnFine = h('button', { type: 'button', class: 'pg-btn', onclick: () => comando(finoInFondo) }, icona('fine'), 'Fino in fondo');
    const btnEsegui = h('button', { type: 'button', class: 'pg-btn', onclick: () => comando(eseguiProgramma) }, icona('play'), 'Esegui');
    const barra1 = h('div', { class: 'pg-strumenti' },
      h('span', { class: P + '-gr' }, h('span', { class: P + '-gr-et', id: id + '-es' }, 'Esempi'),
        h('span', { class: 'pg-gruppo', role: 'group', 'aria-labelledby': id + '-es' }, bEsempi)),
      h('span', { class: 'pg-spazio' }),
      h('span', { class: P + '-gr' }, h('span', { class: P + '-gr-et', id: id + '-vel' }, 'Velocità'),
        h('span', { class: 'pg-gruppo', role: 'group', 'aria-labelledby': id + '-vel' }, bVel)));
    const barra2 = h('div', { class: 'pg-strumenti' }, btnAssembla, btnPasso, btnFine, btnEsegui,
      h('span', { class: 'pg-spazio' }),
      h('p', { class: P + '-legenda', 'aria-hidden': 'true' },
        h('span', { class: P + '-leg ' + P + '-leg--op' }, 'codice operativo'),
        h('span', { class: P + '-leg ' + P + '-leg--ind' }, 'indirizzo'),
        h('span', { class: P + '-leg ' + P + '-leg--eti' }, 'etichetta'),
        h('span', { class: P + '-leg ' + P + '-leg--dato' }, 'dato')));

    /* ---------- sorgente ---------- */

    const ta = h('textarea', {
      class: 'pg-campo ' + P + '-ta', id: id + '-src', wrap: 'off', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off',
      autocorrect: 'off', 'aria-label': 'Sorgente in assembly, una istruzione per riga', 'aria-describedby': id + '-sint',
      placeholder: 'Una istruzione per riga, per esempio:\n        LOAD n\n        STORE OUT\n        HALT\nn:      DATA 7',
    });
    ta.value = C.ESEMPI.somma;
    const numeri = h('div', { class: P + '-num-in' });
    const linee = h('div');
    const barraRiga = h('div', { class: P + '-barra-riga' });
    const barraLink = h('div', { class: P + '-barra-link' });
    const lineeBox = h('div', { class: P + '-linee' }, barraLink, barraRiga, linee);
    const veloIn = h('div', { class: P + '-velo-in' }, lineeBox);
    const area = h('div', { class: P + '-area' }, h('div', { class: P + '-velo', 'aria-hidden': 'true' }, veloIn), ta);
    const editor = h('div', { class: P + '-editor' }, h('div', { class: P + '-num', 'aria-hidden': 'true' }, numeri), area);
    const errTit = h('p', { class: P + '-err-tit' });
    const errMsg = h('p', { class: P + '-err-msg' });
    const errCons = h('p', { class: P + '-err-cons' });
    const errAltri = h('p', { class: P + '-err-altri' });
    const btnVai = h('button', { type: 'button', class: 'pg-btn', onclick: () => vaiAllaRiga(stato.errRiga) }, 'Vai alla riga');
    const boxErr = h('div', { class: P + '-err', hidden: true },
      h('span', { class: P + '-err-ico', 'aria-hidden': 'true' }, '!'),
      h('div', null, errTit, errMsg, errCons, errAltri, btnVai));
    const pSorgente = h('section', { class: P + '-pan ' + P + '-sorgente', 'aria-labelledby': id + '-t-src' },
      h('h4', { class: P + '-tit', id: id + '-t-src' }, 'Sorgente', h('small', null, 'l\'assembly della CPU giocattolo')),
      editor,
      h('p', { class: P + '-sint', id: id + '-sint' }, 'Una riga: ',
        h('code', null, h('span', { class: P + '-t-etichetta' }, 'etichetta:'), ' ', h('span', { class: P + '-t-istruzione' }, 'ISTRUZIONE'), ' ',
          h('span', { class: P + '-t-operando' }, 'operando'), ' ', h('span', { class: P + '-t-commento' }, '; commento')),
        '. L\'operando è una cella da 0 a 31 o un\'etichetta; OUT è la cella 31.'),
      boxErr);

    /* ---------- tabella dei simboli e tabella dei codici ---------- */

    const listaSimboli = h('ul', { class: P + '-simboli', 'aria-label': 'Etichette e celle' });
    const pSimboli = h('section', { class: P + '-pan ' + P + '-simboli-pan', 'aria-labelledby': id + '-t-sim' },
      h('h4', { class: P + '-tit', id: id + '-t-sim' }, 'Tabella dei simboli', h('small', null, 'etichetta → cella')),
      listaSimboli,
      h('p', { class: P + '-nota' }, 'OUT c\'è fin dall\'inizio: è il nome della cella 31. Le altre etichette le annota la prima passata.'));
    const righeCodici = prontuario().map((x) => h('tr', { 'data-c': String(x.codice) },
      h('td', { class: P + '-pr-bit' }, x.bits), h('th', { scope: 'row', class: P + '-pr-nome' }, x.nome), h('td', { class: P + '-pr-desc' }, x.breve)));
    const pCodici = h('section', { class: P + '-pan ' + P + '-codici', 'aria-labelledby': id + '-t-cod' },
      h('h4', { class: P + '-tit', id: id + '-t-cod' }, 'Tabella dei codici operativi', h('small', null, '3 bit per 8 istruzioni')),
      h('table', { class: P + '-prontuario' },
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Bit'), h('th', { scope: 'col' }, 'Istruzione'), h('th', { scope: 'col' }, 'Che cosa fa'))),
        h('tbody', null, righeCodici)),
      h('p', { class: P + '-nota' }, h('span', { class: P + '-k-d' }, 'DATA'), ' non è un\'istruzione: mette un numero in una cella, così com\'è.'));

    /* ---------- banco dell'assemblatore ---------- */

    const bancoFase = h('span', { class: P + '-banco-fase' }, 'Pronto');
    const bancoDove = h('span', { class: P + '-banco-dove' });
    const prog = h('i');
    const bancoRiga = h('p', { class: P + '-banco-riga' });
    const bancoCorpo = h('div', { class: P + '-banco-corpo' });
    const pBanco = h('section', { class: P + '-pan ' + P + '-banco', 'aria-label': 'Banco dell\'assemblatore', 'data-fase': 'pronto' },
      h('div', { class: P + '-banco-testa' }, bancoFase, bancoDove),
      h('div', { class: P + '-prog', 'aria-hidden': 'true' }, prog),
      bancoRiga, bancoCorpo);
    const cifre = [0, 1].map(() => {
      const c = h('span', { class: P + '-cifra' }, h('span', null, '0'));
      c.addEventListener('animationend', () => c.classList.remove('is-gira'));
      return c;
    });
    const contaBox = h('div', { class: P + '-contatore' },
      h('span', { class: P + '-cifre', 'aria-hidden': 'true' }, cifre),
      h('span', { class: P + '-contatore-et' }, h('b', null, 'Contatore di posizione'), 'la prossima cella libera'));

    /* ---------- memoria ---------- */

    const griglia = h('ol', { class: P + '-griglia', 'aria-label': 'Le 32 celle della memoria' });
    const cursore = h('div', { class: P + '-cursore', 'aria-hidden': 'true' });
    const memNota = h('small', { class: P + '-mem-nota' });
    const memInfo = h('p', { class: P + '-mem-info' });
    const celle = [];
    for (let i = 0; i < C.CELLE; i++) {
      const ind = h('span', { class: P + '-cella-ind' }, d2(i));
      const eti = h('span', { class: P + '-cella-eti' });
      const bit = h('span', { class: P + '-cella-bit' });
      const btn = h('button', { type: 'button', class: P + '-cella is-vuota', tabindex: i === 0 ? '0' : '-1' },
        h('span', { class: P + '-cella-top' }, ind, eti), bit);
      btn.addEventListener('mouseenter', () => puntaCella(i));
      btn.addEventListener('mouseleave', () => puntaCella(null));
      btn.addEventListener('focus', () => puntaCella(i));
      btn.addEventListener('blur', () => puntaCella(null));
      btn.addEventListener('click', () => puntaCella(i));
      btn.addEventListener('keydown', (e) => navigaCelle(e, i));
      griglia.append(h('li', null, btn));
      celle.push({ btn: btn, eti: eti, bit: bit });
      modello.push(null);
    }
    const pMemoria = h('section', { class: P + '-pan ' + P + '-memoria', 'aria-labelledby': id + '-t-mem' },
      h('h4', { class: P + '-tit', id: id + '-t-mem' }, 'Memoria', h('small', null, '32 celle da 8 bit', memNota)),
      h('div', { class: P + '-mem-wrap' }, griglia, cursore),
      memInfo);

    /* ---------- esecuzione ---------- */

    const vPC = h('span', { class: P + '-val' }, '00');
    const vACC = h('span', { class: P + '-val' }, '0');
    const vPassi = h('span', { class: P + '-val' }, '0');
    const nastro = h('ol', { class: P + '-nastro', 'aria-label': 'Numeri stampati' });
    const esecEsito = h('p', { class: P + '-nota' });
    const pEsec = h('section', { class: P + '-pan ' + P + '-esec', 'aria-labelledby': id + '-t-esec' },
      h('h4', { class: P + '-tit', id: id + '-t-esec' }, 'Esecuzione', h('small', null, 'un giro veloce del programma')),
      h('dl', { class: P + '-letture' },
        h('div', { class: 'is-pc' }, h('dt', null, 'PC'), h('dd', null, vPC)),
        h('div', { class: 'is-acc' }, h('dt', null, 'Accumulatore'), h('dd', null, vACC)),
        h('div', null, h('dt', null, 'Istruzioni'), h('dd', null, vPassi))),
      h('div', { class: P + '-uscita' }, h('span', { class: P + '-uscita-et' }, 'Uscita (cella 31)'), nastro),
      esecEsito);

    /* ---------- spiegazione e sfida ---------- */

    const narrazione = h('p', { class: P + '-narra' });
    const sottoNarra = h('p', { class: P + '-narra-sub' });
    const spiega = h('div', { class: 'pg-spiega' }, narrazione, sottoNarra);
    const arena = h('div', { class: P + '-arena' },
      h('div', { class: P + '-col' }, pSorgente, pSimboli, pCodici),
      h('div', { class: P + '-col' }, pBanco, pMemoria, pEsec));
    const radice = h('div', { class: P }, barra1, barra2, arena, spiega);
    el.append(radice);

    /* ======================= editor ======================= */

    const errori = { riga: null, nota: null, altre: new Set() };
    let numAttivo = null;

    function disegnaEditor() {
      const righe = ta.value.split('\n');
      const frL = document.createDocumentFragment();
      const frN = document.createDocumentFragment();
      righe.forEach((testo, i) => {
        const n = i + 1;
        const err = errori.riga === n;
        const r = h('div', { class: P + '-r' + (err ? ' is-errore' : '') }, pezzi(testo));
        if (err && errori.nota) r.append(h('span', { class: P + '-r-nota' }, '   ⚠ ' + errori.nota));
        frL.append(r);
        frN.append(h('div', { class: P + '-n' + (err ? ' is-errore' : (errori.altre.has(n) ? ' is-altro' : '')) }, String(n)));
      });
      linee.replaceChildren(frL);
      numeri.replaceChildren(frN);
      numAttivo = null;
      adattaAltezza(righe.length);
    }
    function adattaAltezza(n) {
      const largo = radice.clientWidth >= 760;
      const vis = Math.max(largo ? 13 : 9, Math.min(n + 1, largo ? 20 : 13));
      const alt = vis * LH + 2 * PAD;
      if (editor.dataset.alt !== String(alt)) { editor.dataset.alt = String(alt); editor.style.height = alt + 'px'; }
    }
    function sincronizza() {
      veloIn.style.transform = 'translate(' + (-ta.scrollLeft) + 'px, ' + (-ta.scrollTop) + 'px)';
      numeri.style.transform = 'translateY(' + (-ta.scrollTop) + 'px)';
    }
    function mostraRigaInVista(n) {
      const y0 = PAD + (n - 1) * LH;
      const y1 = y0 + LH;
      if (y0 < ta.scrollTop) ta.scrollTop = Math.max(0, y0 - LH);
      else if (y1 > ta.scrollTop + ta.clientHeight) ta.scrollTop = y1 + LH - ta.clientHeight;
      sincronizza();
    }
    function attivaNumero(n) {
      if (numAttivo) numAttivo.classList.remove('is-attiva');
      numAttivo = n != null ? numeri.children[n - 1] || null : null;
      if (numAttivo) numAttivo.classList.add('is-attiva');
    }
    function posaBarra(barra, n) {
      const prima = !barra.classList.contains('is-visibile');
      if (prima) barra.classList.add(P + '-subito');
      barra.style.transform = 'translateY(' + ((n - 1) * LH) + 'px)';
      if (prima) { void barra.offsetWidth; barra.classList.remove(P + '-subito'); }
      barra.classList.add('is-visibile');
    }
    function barraA(n, tipo) {
      if (n == null) { barraRiga.classList.remove('is-visibile'); attivaNumero(null); return; }
      barraRiga.classList.toggle('is-esec', tipo === 'esec');
      posaBarra(barraRiga, n);
      attivaNumero(n);
      mostraRigaInVista(n);
    }
    function rettangolo(x) {
      const r = x.getBoundingClientRect();
      const b = arena.getBoundingClientRect();
      return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
    }
    // Dove si vede (nell'editor) il pezzo di riga che serve per un volo; null se è fuori vista.
    function rettangoloPezzo(n, classe) {
      const riga = linee.children[n - 1];
      const pezzo = riga && (riga.querySelector('.' + P + '-t-' + classe) || riga);
      if (!pezzo) return null;
      const r = pezzo.getBoundingClientRect();
      const e = ta.getBoundingClientRect();
      if (r.bottom <= e.top || r.top >= e.bottom || r.right <= e.left || r.left >= e.right) return null;
      return rettangolo(pezzo);
    }

    ta.addEventListener('scroll', sincronizza, { passive: true });
    ta.addEventListener('input', () => {
      errori.riga = null; errori.nota = null; errori.altre.clear();
      disegnaEditor();
      sincronizza();
      comando(sorgenteCambiato);
    });
    ta.addEventListener('mousemove', (e) => {
      if (!collegabile()) return;
      const r = ta.getBoundingClientRect();
      const n = Math.floor((e.clientY - r.top + ta.scrollTop - PAD) / LH) + 1;
      if (n === stato.hoverRiga) return;
      stato.hoverRiga = n;
      collegaRiga(n);
    });
    ta.addEventListener('mouseleave', () => { stato.hoverRiga = null; if (document.activeElement === ta) seguiCursore(); else collega(null, null); });
    for (const ev of ['keyup', 'click', 'focus']) ta.addEventListener(ev, seguiCursore);
    ta.addEventListener('blur', () => { if (stato.hoverRiga == null) collega(null, null); });

    /* ======================= collegamenti righe ↔ celle ======================= */

    let cellaLink = null;
    function collegabile() { return !stato.vecchia && stato.cop && stato.sorgenteCop === ta.value; }
    function collega(riga, cella) {
      if (riga == null) barraLink.classList.remove('is-visibile'); else posaBarra(barraLink, riga);
      if (cellaLink != null) celle[cellaLink].btn.classList.remove('is-collegata');
      cellaLink = cella;
      if (cella != null) celle[cella].btn.classList.add('is-collegata');
    }
    function collegaRiga(n) {
      const i = cellaDiRiga(n);
      collega(i != null ? n : null, i);
      if (i != null) memInfo.replaceChildren(...descrizioneRicca(i));
      else rimettiInfo();
    }
    function cellaDiRiga(n) {
      for (let i = 0; i < C.OUT; i++) if (modello[i].riga === n && modello[i].stato !== 'vuota') return i;
      return null;
    }
    function seguiCursore() {
      if (!collegabile() || document.activeElement !== ta) return;
      if (stato.hoverRiga != null) return;
      collegaRiga(rigaDi(ta.value, ta.selectionStart));
    }
    function puntaCella(i) {
      if (i == null) { collega(null, null); rimettiInfo(); return; }
      const m = modello[i];
      const riga = collegabile() && m.riga != null ? m.riga : null;
      collega(riga, i);
      if (riga != null) mostraRigaInVista(riga);
      memInfo.replaceChildren(...descrizioneRicca(i));
    }
    function rimettiInfo() {
      memInfo.replaceChildren(stato.vecchia
        ? 'Il sorgente è cambiato dopo l\'ultimo assemblaggio: premi Assembla per aggiornare la memoria.'
        : 'Punta o tocca una cella per sapere che cosa contiene e da quale riga viene.');
    }
    function navigaCelle(e, i) {
      const col = getComputedStyle(griglia).gridTemplateColumns.split(' ').filter(Boolean).length || 4;
      const mosse = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: col, ArrowUp: -col };
      let j = null;
      if (e.key in mosse) j = i + mosse[e.key];
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = C.CELLE - 1;
      if (j == null) return;
      e.preventDefault();
      j = Math.max(0, Math.min(C.CELLE - 1, j));
      celle[i].btn.tabIndex = -1;
      celle[j].btn.tabIndex = 0;
      celle[j].btn.focus();
    }

    /* ======================= memoria ======================= */

    function cellaVuota(i) {
      return i === C.OUT
        ? { stato: 'out', parola: 0, riga: null, dato: false, eti: ['OUT'], uscita: null }
        : { stato: 'vuota', parola: 0, riga: null, dato: false, eti: [] };
    }
    function azzeraMemoria() {
      for (let i = 0; i < C.CELLE; i++) { modello[i] = cellaVuota(i); disegnaCella(i); }
      stato.vecchia = false;
      memNota.textContent = '';
      posizionaCursore(null);
      collega(null, null);
      rimettiInfo();
    }
    function bitsCella(m, i) {
      const b = C.bin(m.parola, 8);
      if (i === C.OUT) return m.uscita == null ? [h('span', { class: 'u' }, 'uscita')] : [h('span', { class: 'u' }, b)];
      if (m.stato === 'riservata') return ['riga ' + m.riga];
      if (m.stato === 'errore') return ['⚠ riga ' + m.riga];
      if (m.stato === 'vuota') return [b];
      if (m.dato) return [h('span', { class: 'd' }, b)];
      return [h('span', { class: 'o' }, b.slice(0, 3)), h('span', { class: 'a' }, b.slice(3))];
    }
    function disegnaCella(i) {
      const m = modello[i];
      const c = celle[i];
      const b = c.btn;
      for (const s of ['vuota', 'riservata', 'piena', 'errore']) b.classList.toggle('is-' + s, m.stato === s);
      b.classList.toggle('is-out', i === C.OUT);
      b.classList.toggle('is-vecchia', stato.vecchia && m.stato !== 'vuota' && i !== C.OUT);
      c.eti.textContent = m.eti.join(' ');
      c.bit.replaceChildren(...bitsCella(m, i));
      b.setAttribute('aria-label', descrizione(i));
    }
    function descrizione(i) {
      const m = modello[i];
      if (i === C.OUT) return 'Cella 31: l\'uscita, OUT' + (m.uscita != null ? '; ultimo numero stampato: ' + m.uscita : '') + '.';
      const eti = m.eti.length ? ', etichetta ' + m.eti.join(', ') : '';
      if (m.stato === 'vuota') return 'Cella ' + i + ': vuota' + eti + '.';
      if (m.stato === 'riservata') return 'Cella ' + i + ': riservata alla riga ' + m.riga + eti + '.';
      if (m.stato === 'errore') return 'Cella ' + i + ': la riga ' + m.riga + ' ha un errore.';
      const cosa = m.dato ? 'il dato ' + m.parola : C.disassembla(m.parola);
      return 'Cella ' + i + ': ' + C.bin(m.parola, 8) + ', ' + cosa + (m.riga ? ', dalla riga ' + m.riga : '') + eti + '.';
    }
    function descrizioneRicca(i) {
      const m = modello[i];
      const testa = h('b', { class: P + '-k-a' }, 'Cella ' + d2(i));
      if (i === C.OUT) return [testa, ': l\'uscita. Un numero scritto qui con ', h('span', { class: P + '-k-o' }, 'STORE'), ' ', h('span', { class: P + '-k-e' }, 'OUT'), ' viene stampato' + (m.uscita != null ? ' (l\'ultimo: ' + m.uscita + ').' : '.')];
      if (m.stato === 'vuota') return [testa, ': vuota. Vale 00000000, che la CPU leggerebbe come HALT.'];
      if (m.stato === 'riservata') return [testa, ': riservata alla riga ' + m.riga + '. La riempirà la seconda passata.'];
      if (m.stato === 'errore') return [testa, ': qui doveva andare la riga ' + m.riga + ', che ha un errore.'];
      const b = C.bin(m.parola, 8);
      const da = m.riga ? ', dalla riga ' + m.riga + '.' : '.';
      if (m.dato) return [testa, ' contiene il dato ', h('span', { class: P + '-k-d' }, String(m.parola)), ' = ', parola(b, true), da];
      const d = C.decodifica(m.parola);
      return [testa, ' contiene ', parola(b), ' = ', h('span', { class: P + '-k-o' }, d.istruzione.nome),
        d.istruzione.operando ? ' ' : '', d.istruzione.operando ? h('span', { class: P + '-k-a' }, String(d.arg)) : '', da];
    }
    function lampo(i, colore) {
      if (ctx.riduci) return;
      const b = celle[i].btn;
      b.style.setProperty('--lampo', colore || 'var(--trace-1)');
      b.classList.remove('is-lampo');
      void b.offsetWidth;
      b.classList.add('is-lampo');
    }
    // Il riquadro che si sposta sulle celle: tratteggiato per il contatore di posizione, verde per la cella
    // che si sta scrivendo, azzurro per il PC. A capo di una riga salta senza attraversare la griglia,
    // tranne il PC, il cui salto all'indietro (JUMP) è proprio quello che si vuole vedere.
    function posizionaCursore(i, tipo) {
      const vecchio = stato.cursore;
      stato.cursore = i == null ? null : { i: i, tipo: tipo };
      if (i == null) { cursore.classList.remove('is-visibile'); return; }
      const c = celle[i].btn;
      const prima = !cursore.classList.contains('is-visibile') ||
        (tipo !== 'pc' && !!vecchio && celle[vecchio.i].btn.offsetTop !== c.offsetTop);
      cursore.className = P + '-cursore is-' + tipo + (prima ? ' ' + P + '-subito' : '');
      cursore.style.width = (c.offsetWidth + 6) + 'px';
      cursore.style.height = (c.offsetHeight + 6) + 'px';
      cursore.style.transform = 'translate(' + (c.offsetLeft - 3) + 'px, ' + (c.offsetTop - 3) + 'px)';
      if (prima) void cursore.offsetWidth;
      cursore.classList.remove(P + '-subito');
      cursore.classList.add('is-visibile');
    }
    function segnaVecchia() {
      const piena = modello.some((m, i) => i !== C.OUT && m.stato !== 'vuota');
      stato.vecchia = piena;
      memNota.textContent = piena ? ' · da riassemblare' : '';
      for (let i = 0; i < C.CELLE; i++) disegnaCella(i);
    }

    /* ======================= tabelle ======================= */

    const simEl = new Map();
    function azzeraSimboli() {
      listaSimboli.replaceChildren();
      simEl.clear();
      aggiungiSimbolo('OUT', C.OUT, true);
    }
    function aggiungiSimbolo(nome, valore, predefinito) {
      const k = nome.toLowerCase();
      if (simEl.has(k)) return simEl.get(k);
      const li = h('li', { class: P + '-sim' + (predefinito ? ' is-pred' : '') },
        h('span', { class: P + '-sim-nome' }, nome),
        h('span', { class: P + '-sim-fr', 'aria-hidden': 'true' }, '→'),
        h('span', { class: 'pg-sr' }, ' indica la cella '),
        h('span', { class: P + '-sim-val' }, d2(valore)),
        h('span', { class: P + '-sim-bit' }, C.bin(valore, 5)));
      listaSimboli.append(li);
      simEl.set(k, li);
      return li;
    }
    function cercaSimbolo(nome) {
      for (const li of simEl.values()) li.classList.remove('is-cerca');
      const li = nome != null ? simEl.get(String(nome).toLowerCase()) : null;
      if (li) li.classList.add('is-cerca');
      return li;
    }
    function cercaCodice(codice) {
      righeCodici.forEach((tr, k) => tr.classList.toggle('is-cerca', k === codice));
    }

    /* ======================= banco ======================= */

    const FASI = { pronto: 'Pronto', 1: 'Prima passata', 2: 'Seconda passata', esec: 'Esecuzione', fatto: 'Assemblato', errore: 'Fermo: c\'è un errore', vuoto: 'Niente da assemblare' };
    function bancoStato(fase, dove, frazione) {
      pBanco.dataset.fase = String(fase);
      bancoFase.textContent = FASI[fase];
      bancoDove.textContent = dove || '';
      prog.style.transform = 'scaleX(' + Math.max(0, Math.min(1, frazione || 0)) + ')';
    }
    function bancoMostraRiga(n) {
      if (n == null) { bancoRiga.replaceChildren(h('span', { class: P + '-rn' }, 'Nessuna riga in lavorazione')); return; }
      const testo = (ta.value.split('\n')[n - 1] || '');
      const corpo = testo.trim() ? pezzi(testo.replace(/^\s+/, '')) : [h('span', { class: P + '-t-commento' }, '(riga vuota)')];
      bancoRiga.replaceChildren(h('span', { class: P + '-rn' }, 'riga ' + n), h('code', null, corpo));
    }
    function bancoRiposo(messaggio) {
      bancoStato(messaggio === 'vuoto' ? 'vuoto' : 'pronto', '', 0);
      bancoMostraRiga(null);
      const op = '000'.split('').map(() => bitBox('·', 'op', false));
      const ind = '00000'.split('').map(() => bitBox('·', 'ind', false));
      for (const b of op.concat(ind)) b.classList.add('is-vago');
      bancoCorpo.replaceChildren(
        h('div', { class: P + '-campi' },
          h('span', { class: 'c1' }, chip('ISTRUZIONE', 'op')), h('span', { class: 'c2' }, chip('operando', 'ind')),
          h('span', { class: P + '-fr c1' }, 'tabella dei codici ↓'), h('span', { class: P + '-fr c2' }, '↓ in binario'),
          h('span', { class: P + '-bits c1' }, op), h('span', { class: P + '-bits c2' }, ind),
          h('span', { class: P + '-didas c1' }, 'codice operativo'), h('span', { class: P + '-didas c2' }, 'indirizzo'),
          h('span', { class: P + '-dest c3' }, 'in tutto', h('b', null, '8 bit'))),
        h('p', { class: P + '-riposo' }, messaggio === 'vuoto'
          ? 'Il sorgente non contiene istruzioni: scrivine almeno una, per esempio HALT, oppure scegli un esempio.'
          : (messaggio === 'cambiato' ? 'Il sorgente è cambiato: premi Assembla per tradurlo di nuovo.'
            : 'Qui l\'assemblatore lavora una riga alla volta: ogni istruzione diventa una parola di 8 bit, 3 di codice operativo e 5 di indirizzo.')));
    }
    function impostaContatore(v, anima) {
      const s = d2(Math.min(99, v));
      cifre.forEach((c, k) => {
        const span = c.firstChild;
        if (span.textContent === s[k]) return;
        span.textContent = s[k];
        if (anima && !ctx.riduci) { c.classList.remove('is-gira'); void c.offsetWidth; c.classList.add('is-gira'); }
      });
    }
    function contiPassate() {
      const passi = stato.cop ? stato.cop.passi : [];
      return { p1: stato.cop ? stato.cop.ris.righe.length : passi.length, p2: stato.cop ? stato.cop.piano.passata2.length : 0 };
    }
    function corpoPrima(p) {
      const r = stato.cop.ris.righe[p.riga - 1];
      const info = [];
      if (p.errore) info.push(h('span', { class: P + '-k-err' }, '⚠ ' + breve(p.errore)), ': la prima passata si ferma qui.');
      else {
        if (p.valore != null) info.push(chip(p.etichetta, 'eti'), ' indica la cella ', h('b', { class: P + '-k-a' }, d2(p.valore)), ': va nella tabella dei simboli. ');
        if (p.indirizzo != null) info.push(chip(r.istruzione, p.dato ? 'dato' : 'op'), ' occuperà la cella ', h('b', { class: P + '-k-a' }, d2(p.indirizzo)), '.');
        if (!info.length) info.push(p.tipo === 'commento' ? 'Solo un commento: non occupa celle.' : 'Riga vuota: non occupa celle.');
      }
      mostraConta(h('p', { class: P + '-azione' }, info));
    }
    // Il contatore resta nel banco da un passo all'altro (rimetterlo farebbe ripartire le sue animazioni).
    function mostraConta(sotto) {
      if (bancoCorpo.firstChild === contaBox) {
        while (contaBox.nextSibling) contaBox.nextSibling.remove();
        bancoCorpo.append(sotto);
      } else bancoCorpo.replaceChildren(contaBox, sotto);
    }
    // Il banco della seconda passata: chip, bit (spenti finché non si animano) e cella di arrivo.
    function corpoSeconda(p, nascosti) {
      const bits = C.bin(p.parola == null ? 0 : p.parola, 8);
      const v = { passo: p, op: [], ind: [], gruppi: [], chipNum: null };
      const dest = h('span', { class: P + '-dest c3' }, '→ cella', h('b', null, d2(p.indirizzo)));
      if (p.errore) {
        bancoCorpo.replaceChildren(h('p', { class: P + '-azione' }, h('span', { class: P + '-k-err' }, '⚠ ' + breve(p.errore)), ': ' + italiano(p.errore)));
        return v;
      }
      if (p.dato) {
        v.ind = bits.split('').map((b) => bitBox(b, 'dato', nascosti));
        const g = h('span', { class: P + '-bits c12' }, v.ind);
        v.gruppi = [g];
        bancoCorpo.replaceChildren(h('div', { class: P + '-campi' },
          h('span', { class: 'c12' }, chip('DATA', 'dato'), ' ', chip(p.operando, 'dato')),
          h('span', { class: P + '-fr c12' }, '↓ in binario, così com\'è'),
          g,
          h('span', { class: P + '-didas c12' }, 'un dato: niente codice operativo'),
          dest));
        return v;
      }
      v.op = bits.slice(0, 3).split('').map((b) => bitBox(b, 'op', nascosti));
      v.ind = bits.slice(3).split('').map((b) => bitBox(b, 'ind', nascosti));
      const gOp = h('span', { class: P + '-bits c1' }, v.op);
      const gInd = h('span', { class: P + '-bits c2' }, v.ind);
      v.gruppi = [gOp, gInd];
      let operando;
      if (!p.conOperando) operando = chip('nessun operando', 'nulla');
      else if (p.simbolo != null) {
        v.chipNum = chip(d2(p.valore), 'ind', nascosti ? 'is-attesa' : '');
        operando = h('span', null, chip(p.simbolo, 'eti'), h('span', { class: P + '-uguale' }, ' = '), v.chipNum);
      } else operando = chip(String(p.valore), 'ind');
      bancoCorpo.replaceChildren(h('div', { class: P + '-campi' },
        h('span', { class: 'c1' }, chip(p.istruzione, 'op')), h('span', { class: 'c2' }, operando),
        h('span', { class: P + '-fr c1' }, 'tabella dei codici ↓'),
        h('span', { class: P + '-fr c2' }, p.simbolo != null ? '↓ tabella dei simboli' : (p.conOperando ? '↓ in binario' : '↓ restano a zero')),
        gOp, gInd,
        h('span', { class: P + '-didas c1' }, 'codice operativo'), h('span', { class: P + '-didas c2' }, 'indirizzo'),
        dest));
      return v;
    }
    function accendi(lista, t) {
      lista.forEach((b, k) => {
        b.classList.remove('is-spento');
        if (ctx.riduci) return;
        b.style.animationDelay = (k * t.bit) + 'ms';
        b.classList.add('is-pop');
      });
    }
    function corpoFatto() {
      const cop = stato.cop;
      const r = cop.riassunto;
      bancoStato('fatto', r.parole + (r.parole === 1 ? ' parola' : ' parole'), 1);
      bancoMostraRiga(null);
      const f = (dt, dd) => h('div', null, h('dt', null, dt), h('dd', null, dd));
      bancoCorpo.replaceChildren(
        h('dl', { class: P + '-fatti' },
          f('righe di sorgente', String(r.righe)),
          f('parole in memoria', String(r.parole)),
          f('istruzioni · dati', (r.parole - r.dati) + ' · ' + r.dati),
          f('etichette', String(r.etichette))),
        h('p', { class: P + '-riposo' }, 'Ogni riga ha la sua cella: punta una riga del sorgente o una cella per vederle collegate. Poi premi ', h('b', null, 'Esegui'), '.'));
    }
    function corpoErrore(e) {
      bancoStato('errore', 'riga ' + e.riga, stato.indice / Math.max(1, stato.cop.passi.length));
      bancoMostraRiga(e.riga);
      bancoCorpo.replaceChildren(h('p', { class: P + '-azione' },
        h('span', { class: P + '-k-err' }, '⚠ ' + breve(e.messaggio)), ' nella ' + (e.passata === 1 ? 'prima' : 'seconda') + ' passata. ',
        e.passata === 1 ? 'L\'assemblatore non sa ancora quanto è lungo il programma, quindi non può tradurre niente.' : 'Le parole già scritte restano, ma il programma non è completo.'),
      h('p', { class: P + '-riposo' }, 'Correggi la riga e premi di nuovo Assembla.'));
    }
    function corpoEsecuzione(ev) {
      const bits = C.bin(ev.parola, 8);
      const testo = C.fasi(ev)[2].testo;
      const nome = ev.nome;
      const conArg = C.ISA[ev.op].operando;
      bancoCorpo.replaceChildren(
        h('div', { class: P + '-campi' },
          h('span', { class: 'c1' }, chip(nome, 'op')), h('span', { class: 'c2' }, conArg ? chip(String(ev.arg), 'ind') : chip('nessun operando', 'nulla')),
          h('span', { class: P + '-fr c1' }, 'decodifica ↑'), h('span', { class: P + '-fr c2' }, conArg ? '↑ cella da usare' : '↑ non servono'),
          h('span', { class: P + '-bits c1' }, bits.slice(0, 3).split('').map((b) => bitBox(b, 'op'))),
          h('span', { class: P + '-bits c2' }, bits.slice(3).split('').map((b) => bitBox(b, 'ind'))),
          h('span', { class: P + '-didas c1' }, 'codice operativo'), h('span', { class: P + '-didas c2' }, 'indirizzo'),
          h('span', { class: P + '-dest c3' }, 'letta dalla cella', h('b', null, d2(ev.indirizzo)))),
        h('p', { class: P + '-azione' }, 'La CPU decodifica gli stessi bit scritti dall\'assemblatore. ', testo));
    }

    /* ======================= voli ======================= */

    // Un oggetto vola da un punto all'altro dello strumento (solo transform e opacity), poi sparisce.
    // scala: true per rimpicciolirlo fino alla larghezza dell'arrivo (la parola che entra nella cella).
    async function vola(da, a, contenuto, durata, scala) {
      if (ctx.riduci || !da || !a || !(durata > 0)) return;
      const r0 = da.nodeType ? rettangolo(da) : da;
      const r1 = rettangolo(a);
      if (!r0.w || !r1.w) return;
      const v = h('div', { class: P + '-volo', 'aria-hidden': 'true' }, contenuto);
      Object.assign(v.style, { left: r0.x + 'px', top: r0.y + 'px', width: r0.w + 'px', height: r0.h + 'px' });
      arena.append(v);
      const dx = r1.x + r1.w / 2 - (r0.x + r0.w / 2);
      const dy = r1.y + r1.h / 2 - (r0.y + r0.h / 2);
      const s = scala ? Math.max(0.3, Math.min(1.6, r1.w / r0.w)) : 1;
      const alza = Math.min(70, Math.hypot(dx, dy) * 0.2);
      try {
        await ctx.anima({
          durata: durata, easing: 'smooth',
          aggiorna(t) {
            const k = 1 + (s - 1) * t;
            v.style.transform = 'translate(' + (dx * t) + 'px, ' + (dy * t - Math.sin(Math.PI * t) * alza) + 'px) scale(' + k + ')';
            v.style.opacity = String(t < 0.82 ? 1 : Math.max(0, (1 - t) / 0.18));
          },
        });
      } finally {
        v.remove();
      }
    }
    function unione(lista) {
      const rs = lista.map(rettangolo);
      const x = Math.min(...rs.map((r) => r.x));
      const y = Math.min(...rs.map((r) => r.y));
      const x1 = Math.max(...rs.map((r) => r.x + r.w));
      const y1 = Math.max(...rs.map((r) => r.y + r.h));
      return { x: x, y: y, w: x1 - x, h: y1 - y };
    }

    /* ======================= i passi delle due passate ======================= */

    let vistaSeconda = null;

    async function anima1(p, ep, t) {
      bancoStato('1', 'riga ' + p.riga + ' di ' + contiPassate().p1, (stato.indice - 1) / stato.cop.passi.length);
      barraA(p.riga);
      bancoMostraRiga(p.riga);
      corpoPrima(p);
      if (!p.errore) narraPasso(p);
      if (p.valore != null && !p.errore) {
        const li = aggiungiSimbolo(p.etichetta, p.valore, false);
        li.classList.add('is-attesa');
        const da = rettangoloPezzo(p.riga, 'etichetta');
        await vola(da, li, chip(p.etichetta + ' = ' + d2(p.valore), 'eti'), t.voloBreve);
        li.classList.remove('is-attesa');
        li.classList.add('is-nuovo');
      }
      if (ep !== stato.epoca) return;
      const occupa = p.indirizzo != null || p.valore != null;
      if (occupa && p.indirizzo != null && !p.errore && p.indirizzo < C.OUT) {
        Object.assign(modello[p.indirizzo], { stato: 'riservata', riga: p.riga, dato: p.dato });
        disegnaCella(p.indirizzo);
        lampo(p.indirizzo, 'var(--asm-ind)');
        impostaContatore(p.contatore, true);
        if (p.contatore < C.OUT) posizionaCursore(p.contatore, 'conta');
      }
      await ctx.attendi(occupa ? t.riga : t.breve);
    }
    function applica1(p, leggero) {
      if (p.valore != null && !p.errore) {
        const li = aggiungiSimbolo(p.etichetta, p.valore, false);
        li.classList.remove('is-attesa');
        if (p.valore < C.CELLE && !modello[p.valore].eti.includes(p.etichetta)) {
          modello[p.valore].eti.push(p.etichetta);
          disegnaCella(p.valore);
        }
      }
      if (p.indirizzo != null && p.indirizzo < C.OUT) {
        Object.assign(modello[p.indirizzo], { stato: p.errore ? 'errore' : 'riservata', riga: p.riga, dato: p.dato });
        disegnaCella(p.indirizzo);
      }
      impostaContatore(p.contatore, false);
      if (leggero) return;
      const c = contiPassate();
      bancoStato('1', 'riga ' + p.riga + ' di ' + c.p1, stato.indice / stato.cop.passi.length);
      bancoMostraRiga(p.riga);
      corpoPrima(p);
      barraA(p.riga);
      if (p.contatore < C.OUT) posizionaCursore(p.contatore, 'conta'); else posizionaCursore(null);
      if (p.errore) mostraErrore({ passata: 1, riga: p.riga, messaggio: p.errore });
      else narraPasso(p);
    }
    async function anima2(p, ep, t) {
      if (p.errore) return;
      const v = vistaSeconda;
      if (!p.dato) {
        cercaCodice(p.codice);
        accendi(v.op, t);
        await ctx.attendi(t.campo);
        if (ep !== stato.epoca) return;
        if (p.simbolo != null) {
          const li = cercaSimbolo(p.simbolo);
          const val = li && li.querySelector('.' + P + '-sim-val');
          await vola(val, v.chipNum, h('span', { class: P + '-volo-num' }, d2(p.valore)), t.voloBreve);
          if (v.chipNum) v.chipNum.classList.remove('is-attesa');
        }
      }
      accendi(v.ind, t);
      await ctx.attendi(t.campo);
      if (ep !== stato.epoca) return;
      const cella = celle[p.indirizzo].btn;
      const copia = h('span', { class: P + '-bits' }, v.op.concat(v.ind).map((b) => {
        const x = b.cloneNode(true);
        x.classList.remove('is-pop');
        return x;
      }));
      await vola(unione(v.gruppi), cella, copia, t.volo, true);
    }
    function applica2(p, leggero) {
      if (p.errore) {
        if (p.indirizzo != null && p.indirizzo < C.OUT) {
          Object.assign(modello[p.indirizzo], { stato: 'errore', riga: p.riga });
          disegnaCella(p.indirizzo);
        }
        if (!leggero) {
          barraA(p.riga);
          bancoMostraRiga(p.riga);
          corpoSeconda(p, false);
        }
        mostraErrore({ passata: 2, riga: p.riga, messaggio: p.errore });
        return;
      }
      Object.assign(modello[p.indirizzo], { stato: 'piena', parola: p.parola, dato: p.dato, riga: p.riga });
      disegnaCella(p.indirizzo);
      if (leggero) return;
      const c = contiPassate();
      const k = stato.cop.piano.passata2.findIndex((x) => x.riga === p.riga) + 1;
      bancoStato('2', 'parola ' + k + ' di ' + c.p2, stato.indice / stato.cop.passi.length);
      if (!vistaSeconda || vistaSeconda.passo !== p) {
        bancoMostraRiga(p.riga);
        vistaSeconda = corpoSeconda(p, false);
      } else {
        for (const b of vistaSeconda.op.concat(vistaSeconda.ind)) b.classList.remove('is-spento');
        if (vistaSeconda.chipNum) vistaSeconda.chipNum.classList.remove('is-attesa');
      }
      if (!p.dato) cercaCodice(p.codice);
      if (p.simbolo != null) cercaSimbolo(p.simbolo);
      barraA(p.riga);
      posizionaCursore(p.indirizzo, 'scrive');
      lampo(p.indirizzo, p.dato ? 'var(--asm-dato)' : 'var(--asm-op)');
      narraPasso(p);
    }
    function preparaSeconda(p) {
      cercaCodice(null);
      cercaSimbolo(null);
      const c = contiPassate();
      const k = stato.cop.piano.passata2.findIndex((x) => x.riga === p.riga) + 1;
      bancoStato('2', 'parola ' + k + ' di ' + c.p2, (stato.indice - 1) / stato.cop.passi.length);
      bancoMostraRiga(p.riga);
      barraA(p.riga);
      posizionaCursore(p.indirizzo, 'scrive');
      vistaSeconda = corpoSeconda(p, true);
      narraPasso(p);
    }

    // Un passo del copione. Se l'animazione viene interrotta, lo stato finale del passo si applica comunque.
    async function faiPasso(p, animato, ep) {
      const t = T();
      try {
        if (animato && !ctx.riduci) {
          if (p.fase === 1) await anima1(p, ep, t);
          else { preparaSeconda(p); await anima2(p, ep, t); }
        }
      } finally {
        if (p.fase === 1) applica1(p, false); else applica2(p, false);
      }
    }
    function sostaRidotta(p, t) {
      if (p.fase === 1) return p.indirizzo != null || p.valore != null ? t.riga : t.breve;
      return 2 * t.campo + t.sosta;
    }
    // Il prossimo passo è il primo della seconda passata (e la pausa tra le due non si è ancora vista)?
    function tocca2() {
      const passi = stato.cop.passi;
      const p = passi[stato.indice];
      return !stato.intermezzo && !!p && p.fase === 2 && (stato.indice === 0 || passi[stato.indice - 1].fase === 1);
    }
    // Tra le due passate: la tabella dei simboli è completa, ogni etichetta ha il suo numero.
    function intermezzo() {
      stato.intermezzo = true;
      const n = stato.cop.riassunto.etichette;
      const celleUsate = stato.cop.ris.lunghezza;
      cercaCodice(null);
      cercaSimbolo(null);
      posizionaCursore(null);
      barraA(null);
      bancoStato('2', 'si comincia', stato.indice / stato.cop.passi.length);
      bancoMostraRiga(null);
      mostraConta(h('p', { class: P + '-azione' },
        'Prima passata finita: il programma occupa ' + celleUsate + (celleUsate === 1 ? ' cella' : ' celle') + ' e la tabella dei simboli è completa' +
        (n ? ' (' + n + (n === 1 ? ' etichetta' : ' etichette') + ' più OUT)' : '') + '. Ora ogni etichetta ha un numero: si può tradurre.'));
      narraTesto('Fine della prima passata. Nella seconda l\'assemblatore riparte dalla riga 1 e traduce ogni istruzione in 8 bit: il mnemonico con la tabella dei codici, l\'etichetta con la tabella dei simboli.');
      ctx.annuncia('Prima passata finita: ' + n + (n === 1 ? ' etichetta' : ' etichette') + ' nella tabella dei simboli. Comincia la seconda passata.');
    }

    /* ======================= comandi ======================= */

    let coda = Promise.resolve();
    // Ogni comando interrompe quello in corso (che si chiude applicando il suo stato finale) e si mette in coda.
    function comando(fn) {
      const ep = ++stato.epoca;
      ctx.annulla();
      coda = coda.then(() => fn(ep)).catch((err) => { if (!ctx.annullato(err)) console.error(err); });
      return coda;
    }
    function copioneValido() { return !!stato.cop && stato.sorgenteCop === ta.value; }
    function restanti() { return copioneValido() ? stato.cop.passi.length - stato.indice : 0; }

    function nuovoCopione() {
      const cop = copione(ta.value);
      stato.cop = cop;
      stato.sorgenteCop = ta.value;
      stato.indice = 0;
      stato.intermezzo = false;
      stato.esito = null;
      vistaSeconda = null;
      azzeraErrori();
      azzeraMemoria();
      azzeraSimboli();
      azzeraEsecuzione();
      impostaContatore(0, false);
      cercaCodice(null);
      return cop;
    }
    // Un copione pronto per il sorgente attuale (nuovo se serve); false se il sorgente non ha istruzioni.
    function preparaCopione(nuovo) {
      if (nuovo || !copioneValido()) nuovoCopione();
      if (stato.cop.vuoto) { mostraVuoto(); return false; }
      return true;
    }
    function premiAssembla() {
      if (stato.modo === 'corsa') { comando(mettiInPausa); return; }
      if (stato.modo === 'passo' && restanti() > 0) { comando((ep) => corri(ep)); return; }
      comando((ep) => (preparaCopione(true) ? corri(ep) : null));
    }
    function mettiInPausa() {
      stato.modo = 'passo';
      aggiornaBottoni();
      ctx.annuncia('In pausa. Passo avanza di una riga, Continua riprende.');
    }
    async function corri(ep) {
      stato.modo = 'corsa';
      aggiornaBottoni();
      if (stato.indice === 0) {
        narraTesto('Prima passata: l\'assemblatore legge le righe dall\'alto, conta le celle con il contatore di posizione e annota ogni etichetta nella tabella dei simboli.');
        ctx.annuncia('Assemblaggio avviato: prima passata.');
      }
      try {
        while (stato.indice < stato.cop.passi.length) {
          if (tocca2()) {
            intermezzo();
            await ctx.attendi(T().sosta * 3);
            if (ep !== stato.epoca) return;
          }
          const p = stato.cop.passi[stato.indice];
          stato.indice += 1;
          await faiPasso(p, ep === stato.epoca, ep);
          if (ep !== stato.epoca) return;
          const t = T();
          const sosta = ctx.riduci ? sostaRidotta(p, t) : (p.fase === 2 ? t.sosta : 0);
          if (sosta > 0 && stato.indice < stato.cop.passi.length) await ctx.attendi(sosta);
          if (ep !== stato.epoca) return;
        }
      } catch (err) {
        silenzia(err);
        return;
      }
      if (ep === stato.epoca) concludi(false);
    }
    async function passoManuale(ep) {
      const continua = copioneValido() && (stato.modo === 'corsa' || stato.modo === 'passo') && restanti() > 0;
      if (!preparaCopione(!continua)) return;
      stato.modo = 'passo';
      if (tocca2()) {
        intermezzo();
        aggiornaBottoni();
        return;
      }
      const p = stato.cop.passi[stato.indice];
      stato.indice += 1;
      aggiornaBottoni();
      try {
        await faiPasso(p, ep === stato.epoca, ep);
      } catch (err) {
        silenzia(err);
      }
      if (stato.indice >= stato.cop.passi.length) concludi(ep !== stato.epoca);
      else if (ep === stato.epoca) {
        aggiornaBottoni();
        ctx.annuncia(semplice(narra(p)));
      }
    }
    function finoInFondo() {
      if (stato.modo === 'esegue' && stato.esito) { concludiEsecuzione(stato.esito); return; }
      if (!preparaCopione(restanti() === 0)) return;
      while (stato.indice < stato.cop.passi.length) {
        const p = stato.cop.passi[stato.indice];
        stato.indice += 1;
        if (p.fase === 1) applica1(p, true); else applica2(p, true);
      }
      concludi(false);
    }
    function mostraVuoto() {
      stato.modo = 'pronto';
      bancoRiposo('vuoto');
      narraTesto('Non c\'è niente da assemblare: il sorgente non contiene istruzioni. Scrivine almeno una, per esempio HALT, oppure scegli un esempio.');
      ctx.annuncia('Il sorgente non contiene istruzioni.');
      aggiornaBottoni();
    }
    function concludi(silenzioso) {
      const cop = stato.cop;
      cercaCodice(null);
      cercaSimbolo(null);
      vistaSeconda = null;
      if (cop.errore) {
        stato.modo = 'errore';
        posizionaCursore(null);
        mostraErrore(cop.errore);
        corpoErrore(cop.errore);
        barraA(null);
        const testo = 'Riga ' + cop.errore.riga + ': ' + minuscola(italiano(cop.errore.messaggio));
        narraTesto(testo, consiglio(cop.errore.messaggio, cop.ris, cop.ris.righe[cop.errore.riga - 1]));
        if (!silenzioso) ctx.annuncia('Assemblaggio fermo alla riga ' + cop.errore.riga + '. ' + italiano(cop.errore.messaggio));
      } else {
        stato.modo = 'fatto';
        posizionaCursore(null);
        barraA(null);
        corpoFatto();
        const r = cop.riassunto;
        narraTesto('Assemblato: ' + r.righe + (r.righe === 1 ? ' riga è diventata ' : ' righe sono diventate ') + r.parole + (r.parole === 1 ? ' parola' : ' parole') + ' di 8 bit, scritte nelle celle da [a:00] a [a:' + d2(r.parole - 1) + ']. Premi Esegui per farle girare.');
        if (!silenzioso) ctx.annuncia('Assemblaggio finito: ' + r.parole + ' parole in memoria. Premi Esegui.');
      }
      aggiornaBottoni();
    }

    /* ======================= esecuzione ======================= */

    function assicuraAssemblato() {
      if (!preparaCopione(false)) return false;
      if (stato.indice < stato.cop.passi.length || (stato.modo !== 'fatto' && stato.modo !== 'esegue')) {
        while (stato.indice < stato.cop.passi.length) {
          const p = stato.cop.passi[stato.indice];
          stato.indice += 1;
          if (p.fase === 1) applica1(p, true); else applica2(p, true);
        }
        concludi(true);
      }
      if (stato.cop.errore) {
        narraTesto('Prima di eseguire bisogna correggere la riga ' + stato.cop.errore.riga + ': ' + minuscola(italiano(stato.cop.errore.messaggio)), consiglio(stato.cop.errore.messaggio, stato.cop.ris, stato.cop.ris.righe[stato.cop.errore.riga - 1]));
        ctx.annuncia('Il programma ha un errore alla riga ' + stato.cop.errore.riga + ': correggilo prima di eseguire.');
        return false;
      }
      return true;
    }
    function azzeraEsecuzione() {
      impostaValore(vPC, '00', false);
      impostaValore(vACC, '0', false);
      impostaValore(vPassi, '0', false);
      nastro.replaceChildren(h('li', { class: P + '-nastro-vuoto' }, 'ancora niente'));
      esecEsito.textContent = 'Il PC indica la cella da eseguire, l\'accumulatore tiene il risultato dei calcoli.';
    }
    function impostaValore(nodo, testo, anima) {
      if (nodo.textContent === testo) return;
      nodo.textContent = testo;
      if (anima && !ctx.riduci) { nodo.classList.remove('is-cambia'); void nodo.offsetWidth; nodo.classList.add('is-cambia'); }
    }
    function ricaricaProgramma() {
      const ris = stato.cop.ris;
      for (let i = 0; i < C.OUT; i++) {
        const m = modello[i];
        if (m.riga == null && m.stato !== 'vuota') {
          const eti = m.eti;
          modello[i] = cellaVuota(i);
          modello[i].eti = eti;
          disegnaCella(i);
        } else if (m.stato === 'piena' && m.parola !== ris.parole[i]) { m.parola = ris.parole[i]; disegnaCella(i); }
      }
      modello[C.OUT].uscita = null;
      modello[C.OUT].parola = 0;
      disegnaCella(C.OUT);
    }
    function stampa(valore, anima) {
      if (nastro.firstChild && nastro.firstChild.classList.contains(P + '-nastro-vuoto')) nastro.replaceChildren();
      nastro.append(h('li', { class: anima && !ctx.riduci ? 'is-nuovo' : null }, String(valore)));
    }
    function mostraEvento(ev, k) {
      posizionaCursore(ev.indirizzo, 'pc');
      const m = modello[ev.indirizzo];
      const riga = m && m.riga != null && m.stato === 'piena' ? m.riga : null;
      barraA(riga, 'esec');
      bancoMostraRiga(riga);
      impostaValore(vPC, d2(ev.pcDopo), true);
      impostaValore(vACC, String(ev.accDopo), true);
      impostaValore(vPassi, String(k + 1), false);
      if (ev.letto != null) lampo(ev.letto, 'var(--asm-dato)');
      if (ev.scritto != null) scrivi(ev.scritto, ev.accDopo, true);
      corpoEsecuzione(ev);
      bancoStato('esec', 'istruzione ' + (k + 1), (k + 1) / Math.max(1, stato.esito.eventi.length));
    }
    function scrivi(i, valore, anima) {
      const m = modello[i];
      if (i === C.OUT) {
        m.uscita = valore;
        m.parola = valore;
        stampa(valore, anima);
        disegnaCella(i);
        if (anima) lampo(i, 'var(--asm-eti)');
        return;
      }
      if (m.stato === 'vuota') { m.stato = 'piena'; m.dato = true; }
      m.parola = valore;
      disegnaCella(i);
      if (anima) lampo(i, 'var(--asm-dato)');
    }
    async function eseguiProgramma(ep) {
      if (!assicuraAssemblato()) return;
      const esito = esegui(stato.cop.ris);
      stato.esito = esito;
      stato.modo = 'esegue';
      aggiornaBottoni();
      ricaricaProgramma();
      azzeraEsecuzione();
      bancoStato('esec', '', 0);
      bancoMostraRiga(null);
      narraTesto('La CPU esegue il programma: a ogni giro legge la cella indicata dal PC, ne decodifica gli 8 bit e fa quello che dicono.');
      ctx.annuncia('Esecuzione avviata.');
      if (!ctx.riduci) {
        const n = Math.min(esito.eventi.length, MAX_ANIMATI);
        try {
          for (let k = 0; k < n; k++) {
            mostraEvento(esito.eventi[k], k);
            await ctx.attendi(T().esegui);
            if (ep !== stato.epoca) return;
          }
        } catch (err) {
          silenzia(err);
          return;
        }
      }
      if (ep === stato.epoca) concludiEsecuzione(esito);
    }
    function concludiEsecuzione(esito) {
      nastro.replaceChildren();
      for (let i = 0; i < C.OUT; i++) {
        const m = modello[i];
        if (m.parola !== esito.memoria[i]) {
          if (m.stato === 'vuota') { m.stato = 'piena'; m.dato = true; }
          m.parola = esito.memoria[i];
          disegnaCella(i);
        }
      }
      modello[C.OUT].uscita = esito.uscita.length ? esito.uscita[esito.uscita.length - 1] : null;
      modello[C.OUT].parola = modello[C.OUT].uscita || 0;
      disegnaCella(C.OUT);
      if (esito.uscita.length) esito.uscita.forEach((x) => stampa(x, false));
      else nastro.replaceChildren(h('li', { class: P + '-nastro-vuoto' }, 'niente'));
      const ultimo = esito.eventi[esito.eventi.length - 1];
      impostaValore(vPC, d2(esito.pc), false);
      impostaValore(vACC, String(esito.acc), false);
      impostaValore(vPassi, String(esito.passi), false);
      if (ultimo) {
        posizionaCursore(ultimo.indirizzo, 'pc');
        corpoEsecuzione(ultimo);
        const m = modello[ultimo.indirizzo];
        bancoMostraRiga(m && m.riga != null ? m.riga : null);
      }
      barraA(null);
      bancoStato('esec', esito.limite ? 'interrotta' : 'ferma', 1);
      const testo = bilancio(esito);
      esecEsito.textContent = testo;
      stato.modo = 'fatto';
      narraTesto(testo, esito.fermo && !esito.limite ? 'Prova a cambiare un numero dopo DATA, o a togliere un HALT, e riassembla.' : '');
      ctx.annuncia(testo);
      if (esito.fermo) ctx.completa();
      aggiornaBottoni();
    }

    /* ======================= errori ======================= */

    function azzeraErrori() {
      errori.riga = null;
      errori.nota = null;
      errori.altre.clear();
      stato.errRiga = null;
      boxErr.hidden = true;
      disegnaEditor();
      sincronizza();
    }
    function mostraErrore(e) {
      const cop = stato.cop;
      errori.riga = e.riga;
      errori.nota = breve(e.messaggio);
      errori.altre = new Set(cop.ris.errori.map((x) => x.riga).filter((n) => n !== e.riga));
      disegnaEditor();
      sincronizza();
      stato.errRiga = e.riga;
      errTit.textContent = 'Riga ' + e.riga + ' · ' + (e.passata === 1 ? 'prima' : 'seconda') + ' passata';
      errMsg.textContent = italiano(e.messaggio);
      errCons.textContent = consiglio(e.messaggio, cop.ris, cop.ris.righe[e.riga - 1]);
      const altre = [...errori.altre];
      errAltri.textContent = altre.length ? (altre.length === 1 ? 'Anche la riga ' + altre[0] + ' ha un errore.' : 'Anche le righe ' + altre.slice(0, -1).join(', ') + ' e ' + altre[altre.length - 1] + ' hanno un errore.') : '';
      btnVai.textContent = 'Vai alla riga ' + e.riga;
      boxErr.hidden = false;
    }
    function vaiAllaRiga(n) {
      if (n == null) return;
      const righe = ta.value.split('\n');
      let pos = 0;
      for (let i = 0; i < n - 1 && i < righe.length; i++) pos += righe[i].length + 1;
      const fine = pos + (righe[n - 1] || '').length;
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(pos, fine);
      mostraRigaInVista(n);
      editor.scrollIntoView({ block: 'nearest', behavior: ctx.riduci ? 'auto' : 'smooth' });
    }

    /* ======================= sorgente, esempi, velocità ======================= */

    function sorgenteCambiato() {
      if (stato.modo === 'esegue') stato.modo = 'fatto';
      if (copioneValido()) {
        if (stato.modo === 'errore' && stato.cop.errore) mostraErrore(stato.cop.errore);
        aggiornaEsempi();
        return;
      }
      stato.modo = 'pronto';
      vistaSeconda = null;
      azzeraErrori();
      cercaCodice(null);
      cercaSimbolo(null);
      barraA(null);
      posizionaCursore(null);
      collega(null, null);
      segnaVecchia();
      rimettiInfo();
      bancoRiposo('cambiato');
      aggiornaEsempi();
      aggiornaBottoni();
    }
    function caricaEsempio(k) {
      ta.value = C.ESEMPI[k];
      ta.scrollTop = 0;
      ta.scrollLeft = 0;
      comando(() => {
        stato.cop = null;
        stato.sorgenteCop = null;
        stato.indice = 0;
        stato.modo = 'pronto';
        azzeraErrori();
        azzeraMemoria();
        azzeraSimboli();
        azzeraEsecuzione();
        impostaContatore(0, false);
        cercaCodice(null);
        barraA(null);
        bancoRiposo();
        aggiornaEsempi();
        aggiornaBottoni();
        const nome = N_ESEMPI.find((x) => x[0] === k)[1];
        narraTesto('Caricato l\'esempio «' + nome + '». Premi Assembla per vedere le due passate, o Passo › per andare una riga alla volta.');
        ctx.annuncia('Caricato l\'esempio ' + nome + '.');
      });
    }
    function aggiornaEsempi() {
      for (const b of bEsempi) b.setAttribute('aria-pressed', String(C.ESEMPI[b.dataset.k] === ta.value));
    }
    function scegliVelocita(k) {
      stato.velocita = k;
      for (const b of bVel) b.setAttribute('aria-pressed', String(b.dataset.k === k));
      radice.style.setProperty('--asm-v', String(tempi(k).fattore));
      ctx.annuncia('Velocità ' + k + '.');
    }
    function aggiornaBottoni() {
      const m = stato.modo;
      const etichetta = m === 'corsa' ? 'pausa' : (m === 'passo' && restanti() > 0 ? 'continua' : 'assembla');
      if (btnAssembla.dataset.e !== etichetta) {
        btnAssembla.dataset.e = etichetta;
        if (etichetta === 'pausa') btnAssembla.replaceChildren(icona('pausa'), 'Pausa');
        else if (etichetta === 'continua') btnAssembla.replaceChildren(icona('play'), 'Continua');
        else btnAssembla.replaceChildren('Assembla');
      }
      btnFine.disabled = !(m === 'esegue' || m === 'corsa' || m === 'passo' || m === 'pronto');
      radice.dataset.modo = m;
    }

    /* ======================= spiegazione ======================= */

    function narraTesto(testo, sotto) {
      narrazione.replaceChildren(...colora(testo));
      sottoNarra.textContent = sotto || '';
      sottoNarra.hidden = !sotto;
    }
    function narraPasso(p) {
      const t = narra(p);
      if (p.errore) narraTesto(t, consiglio(p.errore, stato.cop.ris, stato.cop.ris.righe[p.riga - 1]));
      else narraTesto(t);
    }

    /* ======================= la sfida «Traduci a mano» ======================= */

    const sf = { lista: sfide(), righe: [], inizio: null, finita: false };
    const listaSfide = h('ol', { class: P + '-sfide' });
    const sfidaFine = h('div', { class: P + '-sfida-fine', hidden: true });
    const btnNuove = h('button', { type: 'button', class: 'pg-btn', onclick: () => nuoveSfide() }, '↻ Altre tre');
    const PESI_OP = [4, 2, 1];
    const PESI_IND = [16, 8, 4, 2, 1];
    const sezSfida = h('section', { class: P + '-sfida', 'aria-labelledby': id + '-t-sf' },
      h('div', { class: P + '-sfida-testa' }, h('h4', { id: id + '-t-sf' }, 'Sfida · Traduci a mano'), btnNuove),
      h('p', { class: P + '-sfida-intro' }, 'Adesso l\'assemblatore sei tu. Accendi i bit giusti per ogni istruzione: i primi 3 sono il ',
        h('span', { class: P + '-k-o' }, 'codice operativo'), ' (cercalo qui sotto), gli altri 5 l\'', h('span', { class: P + '-k-a' }, 'indirizzo'),
        ' in binario (sopra ogni bit c\'è il suo valore). ', h('span', { class: P + '-k-e' }, 'OUT'), ' è la cella 31.'),
      h('ul', { class: P + '-mini', 'aria-label': 'Codici operativi' }, prontuario().map((x) => h('li', null, h('b', null, x.bits), ' ' + x.nome))),
      listaSfide, sfidaFine);
    radice.append(sezSfida);

    function etichettaBit(j) {
      return j < 3 ? 'Bit ' + (j + 1) + ' di 3 del codice operativo, vale ' + PESI_OP[j] : 'Bit ' + (j - 2) + ' di 5 dell\'indirizzo, vale ' + PESI_IND[j - 3];
    }
    function costruisciSfide() {
      listaSfide.replaceChildren();
      sfidaFine.hidden = true;
      sf.finita = false;
      sf.inizio = null;
      sf.righe = sf.lista.map((s, k) => {
        const bits = [0, 0, 0, 0, 0, 0, 0, 0];
        const tasti = bits.map((x, j) => {
          const b = h('button', { type: 'button', class: P + '-tasto', 'aria-pressed': 'false', tabindex: j === 0 ? '0' : '-1', 'aria-label': etichettaBit(j) }, '0');
          b.addEventListener('click', () => impostaBit(k, j));
          b.addEventListener('keydown', (e) => tastiBit(e, k, j));
          return b;
        });
        const grOp = h('div', { class: P + '-sf-gr ' + P + '-sf-gr--op' },
          h('span', { class: P + '-sf-pesi', 'aria-hidden': 'true' }, PESI_OP.map((v) => h('span', null, String(v)))),
          h('span', { class: P + '-sf-tasti' }, tasti.slice(0, 3)),
          h('span', { class: P + '-sf-gr-et' }, 'codice operativo'));
        const grInd = h('div', { class: P + '-sf-gr ' + P + '-sf-gr--ind' },
          h('span', { class: P + '-sf-pesi', 'aria-hidden': 'true' }, PESI_IND.map((v) => h('span', null, String(v)))),
          h('span', { class: P + '-sf-tasti' }, tasti.slice(3)),
          h('span', { class: P + '-sf-gr-et' }, 'indirizzo'));
        const lettura = h('p', { class: P + '-sf-lettura' });
        const esito = h('p', { class: P + '-sf-esito', role: 'status' });
        const btn = h('button', { type: 'button', class: 'pg-btn', onclick: () => controllaSfida(k) }, 'Controlla');
        const li = h('li', { class: P + '-sf' },
          h('div', { class: P + '-sf-testa' },
            h('span', { class: P + '-sf-istr' }, h('small', null, (k + 1) + '.'), h('span', { class: P + '-k-o' }, s.istruzione), ' ',
              h('span', { class: s.out ? P + '-k-e' : P + '-k-a' }, s.out ? 'OUT' : String(s.indirizzo))),
            lettura),
          h('div', { class: P + '-sf-bits', role: 'group', 'aria-label': 'Gli 8 bit di ' + s.testo }, grOp, grInd),
          h('div', { class: P + '-sf-azioni' }, btn, esito));
        listaSfide.append(li);
        const riga = { bits: bits, tasti: tasti, grOp: grOp, grInd: grInd, lettura: lettura, esito: esito, li: li, ok: false };
        leggiRiga(riga);
        return riga;
      });
    }
    function leggiRiga(riga) {
      const l = leggiBits(riga.bits);
      riga.lettura.replaceChildren('Si legge: ', h('span', { class: P + '-k-o' }, l.nome), l.operando ? ' ' : '', l.operando ? h('span', { class: P + '-k-a' }, String(l.indirizzo)) : '');
    }
    function impostaBit(k, j, valore) {
      const riga = sf.righe[k];
      if (sf.inizio == null) sf.inizio = performance.now();
      riga.bits[j] = valore == null ? 1 - riga.bits[j] : valore;
      riga.tasti[j].setAttribute('aria-pressed', String(riga.bits[j] === 1));
      riga.tasti[j].textContent = String(riga.bits[j]);
      riga.grOp.classList.remove('is-giusto', 'is-sbagliato');
      riga.grInd.classList.remove('is-giusto', 'is-sbagliato');
      riga.li.classList.remove('is-ok');
      riga.esito.textContent = '';
      riga.esito.className = P + '-sf-esito';
      riga.ok = false;
      leggiRiga(riga);
    }
    function tastiBit(e, k, j) {
      let dove = null;
      if (e.key === 'ArrowRight') dove = j + 1;
      else if (e.key === 'ArrowLeft') dove = j - 1;
      else if (e.key === 'Home') dove = 0;
      else if (e.key === 'End') dove = 7;
      else if (e.key === '0' || e.key === '1') { impostaBit(k, j, Number(e.key)); dove = j + 1; }
      else return;
      e.preventDefault();
      dove = Math.max(0, Math.min(7, dove));
      const tasti = sf.righe[k].tasti;
      tasti.forEach((b, x) => { b.tabIndex = x === dove ? 0 : -1; });
      tasti[dove].focus();
    }
    function controllaSfida(k) {
      const riga = sf.righe[k];
      const s = sf.lista[k];
      const e = controlla(s, riga.bits);
      riga.grOp.classList.toggle('is-giusto', e.codiceOk);
      riga.grOp.classList.toggle('is-sbagliato', !e.codiceOk);
      riga.grInd.classList.toggle('is-giusto', e.indirizzoOk);
      riga.grInd.classList.toggle('is-sbagliato', !e.indirizzoOk);
      riga.ok = e.ok;
      riga.li.classList.toggle('is-ok', e.ok);
      riga.esito.textContent = spiegaSfida(s, e);
      riga.esito.className = P + '-sf-esito ' + (e.ok ? 'is-ok' : 'is-no');
      if (sf.righe.every((x) => x.ok)) finisciSfida();
    }
    function finisciSfida() {
      if (sf.finita) return;
      sf.finita = true;
      const ms = performance.now() - (sf.inizio == null ? performance.now() : sf.inizio);
      const t0 = performance.now();
      for (let i = 0; i < 20; i++) C.assembla(C.ESEMPI.somma);
      const dt = (performance.now() - t0) / 20;
      const quanto = dt < 1 ? 'in meno di un millesimo di secondo' : 'in circa ' + Math.round(dt) + ' millesimi di secondo';
      sfidaFine.replaceChildren(
        h('b', null, 'Tre istruzioni tradotte a mano in ' + durataItaliana(ms) + '. '),
        'L\'assemblatore di questa pagina traduce le 14 parole del programma «somma» ' + quanto + ', senza sbagliare un bit. ',
        'Per questo, già nel 1949, gli ordini iniziali scritti da David Wheeler per l\'EDSAC di Cambridge leggevano dal nastro ordini fatti di lettere e numeri decimali e li traducevano in binario mentre li caricavano.');
      sfidaFine.hidden = false;
      ctx.annuncia('Sfida completata in ' + durataItaliana(ms) + '.');
    }
    function nuoveSfide() {
      sf.lista = sfide(1 + Math.floor(Math.random() * 1e6));
      costruisciSfide();
      ctx.annuncia('Tre nuove istruzioni: ' + sf.lista.map((s) => s.testo).join(', ') + '.');
    }

    /* ======================= avvio ======================= */

    azzeraMemoria();
    azzeraSimboli();
    azzeraEsecuzione();
    disegnaEditor();
    sincronizza();
    bancoRiposo();
    aggiornaBottoni();
    costruisciSfide();
    narraTesto('Nel sorgente c\'è il programma «somma». Premi Assembla e guarda le due passate, oppure Passo › per andare una riga alla volta.');

    if (typeof ResizeObserver === 'function') {
      let largo = radice.clientWidth;
      new ResizeObserver(() => {
        if (radice.clientWidth === largo) return;
        largo = radice.clientWidth;
        adattaAltezza(ta.value.split('\n').length);
        if (stato.cursore) posizionaCursore(stato.cursore.i, stato.cursore.tipo);
      }).observe(radice);
    }

    return {};
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('assemblatore', { titolo: 'L\'assemblatore', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
