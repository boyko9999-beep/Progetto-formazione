/*
 * Laboratorio «L'assemblatore» (capitolo 4 · Dai numeri alle parole).
 *
 * A sinistra il sorgente in assembly della CPU giocattolo (js/lib/cpu-giocattolo.js),
 * a destra le 32 celle di memoria. «Assembla» mette in scena le due passate:
 *   1. la prima legge le righe una per una, conta le celle (contatore di posizione)
 *      e annota le etichette nella tabella dei simboli;
 *   2. la seconda traduce ogni riga: il mnemonico diventa 3 bit di codice operativo,
 *      l'operando (numero o etichetta) 5 bit di indirizzo, e la parola vola nella sua cella.
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
      if (p.errore) return R + italiano(p.errore);
      if (p.tipo === 'vuota') return R + 'vuota, si va avanti.';
      if (p.tipo === 'commento') return R + 'solo un commento, non occupa celle.';
      if (p.tipo === 'etichetta') return R + 'l\'etichetta [e:' + p.etichetta + '] indica la prossima cella libera, la [a:' + p.valore + ']. Va nella tabella dei simboli.';
      if (p.tipo === 'etichetta-istruzione') {
        return R + 'l\'etichetta [e:' + p.etichetta + '] indica la cella [a:' + p.valore + ']' + (p.dato ? ', dove andrà un dato' : '') + '. Va nella tabella dei simboli; il contatore passa a [a:' + p.contatore + '].';
      }
      return R + (p.dato ? 'un dato' : 'un\'istruzione') + ', occuperà la cella [a:' + p.indirizzo + ']. Il contatore passa a [a:' + p.contatore + '].';
    }
    if (p.errore) return R + italiano(p.errore);
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

  const Logica = {
    LIMITE_PASSI: LIMITE_PASSI,
    numero: numero,
    prontuario: prontuario,
    dividiRiga: dividiRiga,
    piano: piano,
    copione: copione,
    mappa: mappa,
    italiano: italiano,
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

  /* ======================= interfaccia (in costruzione) ======================= */

  const css = `
    .${P} { container-type: inline-size; }
  `;

  function monta(el, ctx) {
    el.append(ctx.h('div', { class: 'pg-stato pg-stato--vuoto' }, ctx.h('p', null, 'Laboratorio in costruzione.')));
    return {};
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('assemblatore', { titolo: 'L\'assemblatore', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
