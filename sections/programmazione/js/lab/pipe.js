/*
 * Laboratorio «Le pipe di Unix» (capitolo 8, Unix, C e i piccoli strumenti).
 *
 * Una catena di piccoli programmi collegati da pipe: ognuno fa una cosa sola, legge righe
 * dall'entrata e scrive righe in uscita, e il simbolo | porta l'uscita di uno nell'entrata del
 * successivo. Il file è inferno.txt, le prime tre terzine dell'Inferno di Dante.
 * La logica pura (gli strumenti come funzioni su array di righe, la riga di comando, i controlli
 * e l'esecuzione della catena) è esportata per i test; l'interfaccia fa scorrere le righe come
 * pacchetti dentro i tubi, da un processo all'altro, fino al terminale a fosfori verdi.
 */
(function (root) {
  'use strict';

  /* ======================= logica pura: niente DOM ======================= */

  const FILE = 'inferno.txt';

  // Inferno, canto I, versi 1-9 (pubblico dominio), con una riga vuota tra le terzine.
  const TESTO = [
    'Nel mezzo del cammin di nostra vita',
    'mi ritrovai per una selva oscura,',
    'ché la diritta via era smarrita.',
    '',
    'Ahi quanto a dir qual era è cosa dura',
    'esta selva selvaggia e aspra e forte',
    'che nel pensier rinova la paura!',
    '',
    'Tant’ è amara che poco è più morte;',
    'ma per trattar del ben ch’i’ vi trovai,',
    'dirò de l’altre cose ch’i’ v’ho scorte.',
  ];

  const MAX_STADI = 10;
  const MAX_PAROLA = 24;
  const MAX_RIGHE = 99;

  // Un flusso di testo diventa un array di righe: ogni riga finisce con un a capo.
  function inRighe(flusso) {
    if (!flusso) return [];
    const parti = flusso.split('\n');
    if (parti[parti.length - 1] === '') parti.pop();
    return parti;
  }
  function inFlusso(righe) { return righe.map((r) => r + '\n').join(''); }

  // cat inferno.txt: legge il file. Come il vero cat con un nome di file, ignora l'entrata.
  function cat() { return TESTO.slice(); }

  // tr -cs '[:alpha:]' '\n': tutto ciò che non è una lettera (spazi, punteggiatura, apostrofi,
  // a capo) diventa un a capo, e gli a capo ripetuti si fondono in uno. Le lettere accentate
  // restano lettere: «ché», «è», «più» e «dirò» non si spezzano; «ch’i’» diventa «ch» e «i».
  // Così fa un tr che conosce l'UTF-8 (per esempio quello di BSD e macOS); GNU tr lavora a byte
  // e spezzerebbe le lettere accentate: «ché» diventerebbe «ch».
  function trParole(righe) {
    return inRighe(inFlusso(righe).replace(/[^\p{L}]+/gu, '\n'));
  }

  // tr A-Z a-z: solo le maiuscole dell'alfabeto inglese diventano minuscole, come nel vero tr.
  function trMinuscole(righe) {
    return righe.map((r) => r.replace(/[A-Z]/g, (c) => c.toLowerCase()));
  }

  // Ordine alfabetico «all'italiana»: prima senza accenti né maiuscole, poi carattere per carattere.
  function chiave(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function confronta(a, b) {
    const ka = chiave(a);
    const kb = chiave(b);
    if (ka !== kb) return ka < kb ? -1 : 1;
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }

  // sort: mette le righe in ordine alfabetico, così le righe uguali finiscono vicine.
  function ordina(righe) { return righe.slice().sort(confronta); }

  // uniq -c: fonde le righe uguali VICINE e scrive quante erano (conteggio su 7 colonne, come GNU uniq).
  function uniqC(righe) {
    const out = [];
    let i = 0;
    while (i < righe.length) {
      let j = i + 1;
      while (j < righe.length && righe[j] === righe[i]) j++;
      out.push(String(j - i).padStart(7) + ' ' + righe[i]);
      i = j;
    }
    return out;
  }

  // Il numero all'inizio di una riga (spazi iniziali ignorati); 0 se non c'è, come fa sort -n.
  function numeroIniziale(riga) {
    const m = /^\s*(-?\d+(?:\.\d+)?)/.exec(riga);
    return m ? Number(m[1]) : 0;
  }

  // sort -rn: ordina per numero, dal più grande. A parità di numero decide il confronto
  // dell'intera riga, rovesciato anch'esso da -r (così fa GNU sort).
  function ordinaNumeri(righe) {
    return righe.slice().sort((a, b) => {
      const d = numeroIniziale(b) - numeroIniziale(a);
      return d || -confronta(a, b);
    });
  }

  // head -n N: tiene le prime N righe.
  function testa(righe, n) { return righe.slice(0, Math.max(0, n)); }

  // grep parola: tiene le righe che contengono la parola (anche dentro un'altra parola).
  function cerca(righe, parola) { return parola ? righe.filter((r) => r.includes(parola)) : []; }

  // wc -l: conta le righe e scrive un solo numero.
  function contaRighe(righe) { return [String(righe.length)]; }

  // Il numero di head, se il testo è valido; altrimenti null.
  function leggiNumero(testo) {
    const t = String(testo == null ? '' : testo).trim();
    if (!/^\d{1,3}$/.test(t)) return null;
    const n = Number(t);
    return n >= 1 && n <= MAX_RIGHE ? n : null;
  }
  function pulisciParola(testo) { return String(testo == null ? '' : testo).trim(); }

  /* ---------- gli strumenti della tavolozza ---------- */

  const STRUMENTI = {
    cat: {
      nome: 'cat', descrizione: 'legge il file e lo manda nella pipe',
      comando: () => 'cat ' + FILE,
      fai: () => cat(),
    },
    parole: {
      nome: 'tr', descrizione: 'spezza il testo: una parola per riga',
      comando: () => "tr -cs '[:alpha:]' '\\n'",
      fai: (r) => trParole(r),
    },
    minuscole: {
      nome: 'tr', descrizione: 'cambia le maiuscole in minuscole',
      comando: () => 'tr A-Z a-z',
      fai: (r) => trMinuscole(r),
    },
    sort: {
      nome: 'sort', descrizione: 'mette le righe in ordine alfabetico',
      comando: () => 'sort',
      fai: (r) => ordina(r),
    },
    uniq: {
      nome: 'uniq', descrizione: 'fonde le righe uguali vicine e le conta',
      comando: () => 'uniq -c',
      fai: (r) => uniqC(r),
    },
    sortrn: {
      nome: 'sort', descrizione: 'ordina per numero, dal più grande',
      comando: () => 'sort -rn',
      fai: (r) => ordinaNumeri(r),
    },
    head: {
      nome: 'head', descrizione: 'tiene solo le prime righe',
      param: 'n', base: 'head -n', predefinito: '5',
      comando: (s) => 'head -n ' + valoreParam(s, 'n', '5'),
      fai: (r, s) => testa(r, leggiNumero(s.n)),
    },
    grep: {
      nome: 'grep', descrizione: 'tiene le righe che contengono la parola',
      param: 'parola', base: 'grep', predefinito: 'selva',
      comando: (s) => 'grep ' + valoreParam(s, 'parola', 'selva'),
      fai: (r, s) => cerca(r, pulisciParola(s.parola)),
    },
    wc: {
      nome: 'wc', descrizione: 'conta le righe',
      comando: () => 'wc -l',
      fai: (r) => contaRighe(r),
    },
  };
  const ORDINE = ['cat', 'parole', 'minuscole', 'sort', 'uniq', 'sortrn', 'head', 'grep', 'wc'];

  function valoreParam(s, nome, predefinito) {
    const v = s && s[nome] != null ? String(s[nome]).trim() : predefinito;
    return v === '' ? '…' : v;
  }

  // Un nuovo stadio con i parametri predefiniti.
  function stadio(id, param) {
    const def = STRUMENTI[id];
    if (!def) throw new Error('strumento sconosciuto: ' + id);
    const s = { id: id };
    if (def.param) s[def.param] = param != null ? String(param) : def.predefinito;
    return s;
  }

  function comando(s) {
    const def = s && STRUMENTI[s.id];
    return def ? def.comando(s) : '?';
  }
  function rigaComando(catena) { return catena.map(comando).join(' | '); }

  const PRESET = [
    { id: 'frequenti', nome: 'Parole più frequenti', catena: () => ['cat', 'parole', 'minuscole', 'sort', 'uniq', 'sortrn', 'head'].map((x) => stadio(x)) },
    { id: 'righe', nome: 'Quante righe?', catena: () => ['cat', 'wc'].map((x) => stadio(x)) },
    { id: 'selva', nome: 'Cerca «selva»', catena: () => [stadio('cat'), stadio('grep', 'selva')] },
  ];
  function preset(id) {
    const p = PRESET.find((x) => x.id === id);
    return p ? p.catena() : null;
  }

  /* ---------- controlli: ogni errore dice come rimediare ---------- */

  function valida(catena) {
    const errori = [];
    const avvisi = [];
    if (!Array.isArray(catena) || !catena.length) {
      errori.push({ indice: -1, tipo: 'vuota', testo: 'La catena è vuota: aggiungi `cat ' + FILE + '` dalla tavolozza, poi gli altri comandi.' });
      return { ok: false, errori: errori, avvisi: avvisi };
    }
    if (catena.length > MAX_STADI) {
      errori.push({ indice: -1, tipo: 'lunga', testo: 'Al massimo ' + MAX_STADI + ' comandi: togline qualcuno con ✕.' });
    }
    catena.forEach((s, i) => {
      const def = s && STRUMENTI[s.id];
      if (!def) { errori.push({ indice: i, tipo: 'sconosciuto', testo: 'Comando sconosciuto al passo ' + (i + 1) + ': toglilo con ✕.' }); return; }
      if (i === 0 && s.id !== 'cat') {
        errori.push({ indice: 0, tipo: 'sorgente', testo: 'Il primo comando, `' + comando(s) + '`, non ha niente da leggere: in un vero terminale aspetterebbe che tu scriva dalla tastiera. Metti `cat ' + FILE + '` in cima alla catena.' });
      }
      if (i > 0 && s.id === 'cat') {
        avvisi.push({ indice: i, tipo: 'cat', testo: '`cat ' + FILE + '` al passo ' + (i + 1) + ' ignora le righe che gli arrivano dalla pipe e ricomincia a leggere il file.' });
      }
      if (s.id === 'grep') {
        const p = pulisciParola(s.parola);
        if (!p) errori.push({ indice: i, tipo: 'parola', campo: 'parola', testo: '`grep` ha bisogno di una parola da cercare: scrivila nel suo riquadro (per esempio selva).' });
        else if (p.length > MAX_PAROLA) errori.push({ indice: i, tipo: 'parola', campo: 'parola', testo: 'La parola per `grep` è troppo lunga: bastano ' + MAX_PAROLA + ' lettere.' });
        else if (!/^\p{L}+$/u.test(p)) errori.push({ indice: i, tipo: 'parola', campo: 'parola', testo: 'Per `grep` scrivi una parola sola, fatta di lettere: niente spazi, numeri o simboli (per esempio selva).' });
      }
      if (s.id === 'head' && leggiNumero(s.n) == null) {
        errori.push({ indice: i, tipo: 'numero', campo: 'n', testo: 'Per `head -n` scrivi un numero intero da 1 a ' + MAX_RIGHE + '.' });
      }
    });
    return { ok: errori.length === 0, errori: errori, avvisi: avvisi };
  }

  // Esegue la catena: per ogni stadio, quante righe entrano e quali escono.
  function esegui(catena) {
    const v = valida(catena);
    if (!v.ok) return { ok: false, errori: v.errori, avvisi: v.avvisi, stadi: [], uscita: [] };
    let flusso = [];
    const stadi = catena.map((s, i) => {
      const entrata = flusso;
      const uscita = STRUMENTI[s.id].fai(entrata, s);
      flusso = uscita;
      return { indice: i, id: s.id, stadio: s, comando: comando(s), entrata: entrata, uscita: uscita };
    });
    return { ok: true, errori: [], avvisi: v.avvisi, stadi: stadi, uscita: flusso };
  }

  /* ---------- parole per la spiegazione ---------- */

  function righe(n) { return n === 1 ? '1 riga' : n + ' righe'; }
  function parolaDi(riga) { return riga.replace(/^\s*\d+\s/, ''); }
  // Come chiamare la parola di una riga di uniq -c: la riga vuota non ha parole da mettere tra caporali.
  function nomeRiga(riga) { const p = parolaDi(riga); return p === '' ? 'la riga vuota' : '«' + p + '»'; }
  const PAROLA = /^\p{L}+$/u;
  const soloParole = (r) => r.length > 0 && r.every((x) => PAROLA.test(x));

  // Che cosa ha fatto uno stadio, in una frase (con il mini-markup `codice` e **grassetto**).
  function descrivi(st) {
    const n = st.uscita.length;
    const e = st.entrata.length;
    const cmd = '`' + st.comando + '`';
    if (!e && st.indice > 0 && st.id !== 'cat' && st.id !== 'wc') {
      return cmd + ' non riceve nessuna riga dalla pipe: non ha niente da fare, e non manda niente.';
    }
    switch (st.id) {
      case 'cat':
        if (st.indice === 0) return cmd + ' legge il file e manda nella pipe le sue **' + righe(n) + '**.';
        if (!e) return cmd + ' rilegge il file e manda nella pipe le sue **' + righe(n) + '**.';
        return cmd + ' ignora ' + (e === 1 ? 'la riga che gli arriva' : 'le ' + righe(e) + ' che gli arrivano') + ' e rimanda le **' + righe(n) + '** del file.';
      case 'parole': {
        // con -s gli a capo non si ripetono: una riga vuota può restare solo in cima
        const np = st.uscita.filter((r) => r !== '').length;
        return cmd + ' spezza ' + righe(e) + ' in **' + (np === 1 ? '1 parola' : np + ' parole') + '**, una per riga: spazi, punteggiatura e apostrofi diventano a capo.' +
          (np < n ? ' La prima riga resta vuota, perché il testo cominciava con un separatore.' : '');
      }
      case 'minuscole': {
        const cambiate = st.entrata.filter((r, i) => r !== st.uscita[i]).length;
        return cmd + ' trasforma le maiuscole in minuscole: ' + (cambiate === 1 ? 'cambia **1 riga**' : 'cambiano **' + righe(cambiate) + '**') + ' su ' + e + '.';
      }
      case 'sort':
        return cmd + ' mette in ordine ' + righe(n) + ': le righe uguali adesso sono **vicine**.';
      case 'uniq':
        return cmd + ' fonde le righe uguali vicine: da ' + e + ' a **' + righe(n) + '**, ognuna con il suo conteggio davanti.';
      case 'sortrn':
        if (!st.entrata.some((r) => /^\s*-?\d/.test(r))) {
          return cmd + ' cerca un numero all\'inizio di ogni riga, ma qui non ce n\'è nessuno: valgono tutte 0, e l\'ordine lo decide l\'alfabeto, **al contrario**.';
        }
        return cmd + ' guarda il numero all\'inizio di ogni riga e mette in cima **i più grandi**.';
      case 'head':
        return cmd + ' tiene ' + (n === 1 ? 'la **prima riga**' : 'le prime **' + righe(n) + '**') +
          (e > n ? ' e scarta ' + (e - n === 1 ? 'l\'ultima.' : 'le altre ' + (e - n) + '.') : ': non c\'era altro da scartare.');
      case 'grep': {
        const p = '«' + pulisciParola(st.stadio && st.stadio.parola) + '»';
        if (!n) return cmd + ' non trova ' + p + ' ' + (e === 1 ? 'nell\'unica riga che gli arriva' : 'in nessuna delle ' + e + ' righe') + ': non esce niente.';
        return cmd + ' tiene **' + righe(n) + '** su ' + e + ': ' + (n === 1 ? 'la sola che contiene ' : 'quelle che contengono ') + p + '.';
      }
      case 'wc':
        return cmd + ' conta le righe che gli arrivano: **' + (st.uscita[0] || '0') + '**.';
      default:
        return cmd + ': ' + righe(n) + '.';
    }
  }

  // C'è una riga uguale a un'altra ma non vicina? Allora uniq non le può fondere.
  function ripetizioniSparse(r) {
    const viste = new Set();
    for (let i = 0; i < r.length; i++) {
      if (i > 0 && r[i] === r[i - 1]) continue;
      if (viste.has(r[i])) return true;
      viste.add(r[i]);
    }
    return false;
  }

  // Una parola che compare due volte, una con la maiuscola e una senza (come «Nel» e «nel»)?
  function coppiaMaiuscola(r) {
    const tutte = new Set(r);
    for (const x of tutte) if (x !== x.toLowerCase() && tutte.has(x.toLowerCase())) return [x, x.toLowerCase()];
    return null;
  }
  function notaMaiuscole(r) {
    const c = coppiaMaiuscola(r);
    return c ? ' Senza `tr A-Z a-z`, però, «' + c[0] + '» e «' + c[1] + '» contano come due parole diverse.' : '';
  }

  // Un consiglio alla fine dell'esecuzione: cosa si è visto e cosa provare.
  // Guarda i dati che sono passati davvero nella catena, non solo i nomi dei comandi.
  function consiglio(ris) {
    if (!ris || !ris.ok || !ris.stadi.length) return '';
    const st = ris.stadi;
    const ids = st.map((s) => s.id);
    const ultimo = st[st.length - 1];
    const u = ris.uscita;
    const uniqSparso = st.find((s) => s.id === 'uniq' && ripetizioniSparse(s.entrata));
    if (uniqSparso) {
      return '`uniq -c` fonde solo le righe uguali **vicine**: qui le ripetizioni erano sparse e sono rimaste separate. Metti `sort` subito prima di `uniq -c`.';
    }
    const filtri = ids.includes('grep') || ids.includes('head');
    const iUniq = ids.lastIndexOf('uniq');
    const uniqDiParole = iUniq >= 0 && soloParole(st[iUniq].entrata);
    if (ultimo.id === 'wc') {
      const solo = ids.length === 2 && ids[0] === 'cat';
      if (solo) return '**' + righe(Number(u[0])) + '**: i 9 versi più le 2 righe vuote tra le terzine. Metti `tr -cs \'[:alpha:]\' \'\\n\'` prima di `wc -l` e conterai le parole.';
      const ent = ultimo.entrata;
      if (!filtri && soloParole(ent)) return 'Per la catena le terzine contengono **' + u[0] + ' parole** (gli apostrofi dividono: «ch’i’» vale due parole). `wc -l` conta le righe, e `tr` ha messo una parola per riga.';
      if (!filtri && uniqDiParole && ent.every((r) => /^\s*\d+ \p{L}+$/u.test(r))) return 'Le parole diverse sono **' + u[0] + '**: `uniq -c` ha lasciato una riga per ogni parola.' + notaMaiuscole(st[iUniq].entrata);
      return '`wc -l` non sa nulla di versi o parole: conta le righe che la pipe gli porta. Qui sono **' + u[0] + '**.';
    }
    const iRn = ids.lastIndexOf('sortrn');
    if (iUniq >= 0 && iRn > iUniq && u.length && u.every((r) => /^\s*\d+ /.test(r))) {
      const primo = u[0];
      const nPrimo = numeroIniziale(primo);
      const altre = u.slice(1, 3).map(nomeRiga);
      const cima = 'In cima c\'è **' + nomeRiga(primo) + '**, ' + (nPrimo === 1 ? 'una volta' : nPrimo + ' volte') + (altre.length ? '; poi ' + altre.join(' e ') : '') + '.';
      if (!uniqDiParole) return cima + ' Qui `uniq -c` ha contato righe intere, non parole: metti `tr -cs \'[:alpha:]\' \'\\n\'` subito dopo `cat ' + FILE + '`.';
      return cima + ' Nessun programma, da solo, sa fare questa classifica: ci riesce la catena.' + notaMaiuscole(st[iUniq].entrata);
    }
    if (ultimo.id === 'grep') {
      const p = pulisciParola(ultimo.stadio && ultimo.stadio.parola);
      const ent = ultimo.entrata;
      if (!u.length) {
        // la parola c'è, ma con altre maiuscole? grep le distingue
        const pl = p.toLowerCase();
        const trovata = ent.find((r) => r.toLowerCase().includes(pl));
        if (trovata) {
          const k = trovata.toLowerCase().indexOf(pl);
          const forma = trovata.slice(k, k + p.length);
          return 'Nessuna riga contiene «' + p + '»: `grep` distingue maiuscole e minuscole, e nel testo c\'è «' + forma + '». Prova a cercare quella' +
            (ent.some((r) => /[A-Z]/.test(r)) ? ', oppure metti `tr A-Z a-z` prima di `grep` e scrivi la parola in minuscolo.' : '.');
        }
        return 'Nessuna riga contiene «' + p + '»: nel testo non c\'è. Prova un\'altra parola, per esempio «selva», «via» o «paura».';
      }
      if (soloParole(ent) && u.some((r) => r !== p)) return '`grep` cerca pezzi di testo, non parole intere: con «' + p + '» trova anche ' + u.filter((r) => r !== p).map((r) => '«' + r + '»').slice(0, 3).join(', ') + '.';
      return '**' + righe(u.length) + '** ' + (u.length === 1 ? 'contiene' : 'contengono') + ' «' + p + '». Prova a mettere `tr -cs \'[:alpha:]\' \'\\n\'` prima di `grep`: vedrai le singole parole.';
    }
    if (!u.length) return 'Alla fine non è uscita nessuna riga: prova a togliere un filtro con ✕.';
    return 'Ogni programma ha fatto una cosa sola; la pipe ha portato le sue righe al successivo. Prova a spostare un comando con ▲ ▼ e guarda cosa cambia.';
  }

  const Logica = {
    FILE: FILE, TESTO: TESTO, MAX_STADI: MAX_STADI, STRUMENTI: STRUMENTI, ORDINE: ORDINE, PRESET: PRESET,
    inRighe: inRighe, inFlusso: inFlusso,
    cat: cat, trParole: trParole, trMinuscole: trMinuscole, ordina: ordina, uniqC: uniqC,
    ordinaNumeri: ordinaNumeri, testa: testa, cerca: cerca, contaRighe: contaRighe,
    confronta: confronta, numeroIniziale: numeroIniziale, leggiNumero: leggiNumero,
    stadio: stadio, comando: comando, rigaComando: rigaComando, preset: preset,
    valida: valida, esegui: esegui, descrivi: descrivi, consiglio: consiglio, righe: righe,
  };

  /* ======================= stile ======================= */

  const css = `
    .lab-pipe { container-type: inline-size; --lab-pipe-file: var(--trace-2); --lab-pipe-tubo: var(--trace-3); --lab-pipe-arg: var(--trace-4); --lab-pipe-vivo: var(--trace-1); --lab-pipe-ko: #ff8a7a; }
    .lab-pipe-file { color: var(--lab-pipe-file); }
    .lab-pipe-arg { color: var(--lab-pipe-arg); }
    .lab-pipe-barra { justify-content: space-between; }
    .lab-pipe-esempi { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; min-width: 0; }
    .lab-pipe-esempi > span { font-size: 13px; color: var(--lab-text); }
    .lab-pipe-esempi .pg-btn { flex: 1 1 auto; }
    .lab-pipe-azioni { display: flex; flex-wrap: wrap; gap: 8px; }

    .lab-pipe-riga { display: flex; gap: 10px; align-items: baseline; margin: 0; padding: 12px 18px; border-bottom: 1px solid var(--lab-line); background: #000; font: 600 14px/1.7 var(--mono); color: var(--lab-bright); }
    .lab-pipe-prompt { color: var(--lab-pipe-vivo); flex: none; }
    .lab-pipe-riga .lab-pipe-cmd { min-width: 0; overflow-wrap: anywhere; background: none; border: 0; padding: 0; font: inherit; color: inherit; }
    .lab-pipe-seg { white-space: nowrap; padding: 1px 3px; border-radius: 5px; transition: background-color var(--pg-dur-veloce) ease, color var(--pg-dur-veloce) ease; }
    .lab-pipe-seg.is-sopra { background: rgba(255, 255, 255, .09); }
    .lab-pipe-seg.is-attivo { background: color-mix(in srgb, var(--lab-pipe-vivo) 22%, transparent); box-shadow: inset 0 -2px 0 var(--lab-pipe-vivo); }
    .lab-pipe-seg.is-errore { background: rgba(255, 120, 100, .14); box-shadow: inset 0 -2px 0 var(--lab-pipe-ko); }
    .lab-pipe-seg.is-nuovo { animation: lab-pipe-nuovo var(--pg-dur-lenta) ease; }
    @keyframes lab-pipe-nuovo { from { background-color: color-mix(in srgb, var(--lab-pipe-vivo) 35%, transparent); } }
    .lab-pipe-bar { color: var(--lab-pipe-tubo); font-weight: 800; padding: 0 2px; }
    .lab-pipe-niente { color: var(--lab-text); font-weight: 500; font-style: italic; }

    .lab-pipe-avviso { margin: 0; padding: 10px 18px; border-bottom: 1px solid var(--lab-line); font-size: .92rem; line-height: 1.5; }
    .lab-pipe-avviso[hidden] { display: none; }
    .lab-pipe-avviso.is-errore { background: rgba(255, 120, 100, .09); color: #ffc2b8; }
    .lab-pipe-avviso.is-attenzione { background: color-mix(in srgb, var(--trace-2) 9%, transparent); color: #ffe2a8; }
    .lab-pipe-avviso code { color: inherit; }
    /* il codice nel testo resta leggibile anche nei riquadri a 14 px (il .9em comune darebbe 12,6 px) */
    .lab-pipe .lab-pipe-dettaglio code, .lab-pipe .lab-pipe-vuota code, .lab-pipe .lab-pipe-avviso code, .lab-pipe .lab-pipe-spiega code { font-size: max(13px, .9em); }

    .lab-pipe-arena { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; padding: 16px; }
    .lab-pipe-colonna { display: grid; gap: 16px; align-content: start; min-width: 0; }
    .lab-pipe-titoletto { margin: 0 0 8px; font: 800 13px/1.2 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--lab-text); }
    .lab-pipe-titoletto small { font: 600 13px var(--font); letter-spacing: 0; text-transform: none; opacity: .85; }

    .lab-pipe-lista { list-style: none; margin: 0; padding: 0; }
    .lab-pipe-stadio { position: relative; }
    .lab-pipe-tubo { position: relative; height: 44px; }
    .lab-pipe-stadio.is-primo .lab-pipe-tubo { display: none; }
    .lab-pipe-tubo::before { content: ""; box-sizing: border-box; position: absolute; left: 12px; width: 26px; top: 3px; bottom: 3px; border-left: 2px solid color-mix(in srgb, var(--lab-pipe-tubo) 62%, transparent); border-right: 2px solid color-mix(in srgb, var(--lab-pipe-tubo) 62%, transparent); background: linear-gradient(90deg, color-mix(in srgb, var(--lab-pipe-tubo) 24%, transparent), color-mix(in srgb, var(--lab-pipe-tubo) 4%, transparent) 38% 62%, color-mix(in srgb, var(--lab-pipe-tubo) 24%, transparent)); transition: border-color var(--pg-dur-normale) ease; }
    .lab-pipe-tubo::after { content: ""; position: absolute; left: 8px; width: 34px; top: 0; bottom: 0; border-radius: 2px; background: linear-gradient(var(--lab-pipe-tubo), var(--lab-pipe-tubo)) top / 100% 4px no-repeat, linear-gradient(var(--lab-pipe-tubo), var(--lab-pipe-tubo)) bottom / 100% 4px no-repeat; opacity: .55; transition: opacity var(--pg-dur-normale) ease; }
    .lab-pipe-tubo.is-scorre::before { border-color: var(--lab-pipe-tubo); }
    .lab-pipe-tubo.is-scorre::after { opacity: 1; }
    .lab-pipe-tubo-segno { position: absolute; left: 52px; top: 50%; transform: translateY(-50%); display: flex; align-items: baseline; gap: 6px; white-space: nowrap; font: 800 16px/1 var(--mono); color: var(--lab-pipe-tubo); }
    .lab-pipe-tubo-segno small { font: 600 13px var(--font); color: var(--lab-text); }
    .lab-pipe-pacchetto { position: absolute; z-index: 3; left: 25px; top: -6px; height: 6px; border-radius: 3px; background: var(--lab-pipe-tubo); box-shadow: 0 0 8px color-mix(in srgb, var(--lab-pipe-tubo) 70%, transparent); opacity: 0; will-change: transform, opacity; pointer-events: none; }

    /* l'ultimo tubo è verde come il terminale: porta le righe sullo schermo, non a un altro programma */
    .lab-pipe-uscita { --lab-pipe-tubo: var(--lab-pipe-vivo); padding-bottom: 2px; }
    .lab-pipe-uscita[hidden] { display: none; }
    .lab-pipe-tubo--uscita::before { border-color: color-mix(in srgb, var(--lab-pipe-tubo) 45%, transparent); }
    .lab-pipe-tubo--uscita .lab-pipe-tubo-segno { gap: 8px; }
    .lab-pipe-tubo--uscita .lab-pipe-tubo-segno small { font-weight: 600; transition: color var(--pg-dur-normale) ease; }
    .lab-pipe-verso::before { content: "↓"; font: 800 15px/1 var(--font); color: var(--lab-pipe-vivo); }
    .lab-pipe-video { display: block; position: relative; box-sizing: border-box; width: 34px; height: 24px; margin-left: 8px; border: 2px solid color-mix(in srgb, var(--lab-pipe-vivo) 45%, var(--lab-line)); border-radius: 5px; background: #020b06; transition: border-color var(--pg-dur-normale) ease, box-shadow var(--pg-dur-normale) ease; }
    .lab-pipe-video::before { content: ""; position: absolute; left: 4px; right: 9px; top: 4px; height: 2px; border-radius: 1px; background: var(--lab-pipe-vivo); box-shadow: 0 4px 0 var(--lab-pipe-vivo); opacity: 0; transition: opacity var(--pg-dur-normale) ease; }
    .lab-pipe-video::after { content: ""; position: absolute; left: 4px; bottom: 3px; width: 6px; height: 3px; background: var(--lab-pipe-vivo); opacity: .45; }
    .lab-pipe-uscita.is-acceso .lab-pipe-video { border-color: var(--lab-pipe-vivo); box-shadow: 0 0 12px -2px var(--lab-pipe-vivo); }
    .lab-pipe-uscita.is-acceso .lab-pipe-video::before { opacity: .9; }
    .lab-pipe-uscita.is-acceso .lab-pipe-video::after { opacity: 1; }
    .lab-pipe-uscita.is-acceso .lab-pipe-tubo-segno small { color: var(--lab-bright); }

    .lab-pipe-box { position: relative; display: grid; gap: 2px; padding: 10px 10px 10px 12px; background: var(--lab-panel); border: 1px solid var(--lab-line); border-radius: 12px; transition: border-color var(--pg-dur-veloce) ease; }
    .lab-pipe-box::before { content: ""; position: absolute; inset: -1px; border-radius: 12px; border: 2px solid var(--lab-pipe-vivo); box-shadow: 0 0 18px -4px var(--lab-pipe-vivo); opacity: 0; pointer-events: none; transition: opacity var(--pg-dur-normale) ease; }
    .lab-pipe-box:hover { border-color: color-mix(in srgb, var(--lab-text) 45%, var(--lab-line)); }
    .lab-pipe-apri:focus-visible { outline: 3px solid var(--trace-1); outline-offset: 2px; border-radius: 4px; }
    @supports selector(:has(*)) {
      .lab-pipe-box:has(.lab-pipe-apri:focus-visible) { outline: 3px solid var(--trace-1); outline-offset: 2px; }
      .lab-pipe-box .lab-pipe-apri:focus-visible { outline: none; }
    }
    .lab-pipe-stadio.is-attivo .lab-pipe-box::before { opacity: 1; animation: lab-pipe-pulsa 900ms ease-in-out infinite alternate; }
    @keyframes lab-pipe-pulsa { from { opacity: 1; } to { opacity: .45; } }
    .lab-pipe-stadio.is-errore .lab-pipe-box { border-color: var(--lab-pipe-ko); background: color-mix(in srgb, var(--lab-pipe-ko) 6%, var(--lab-panel)); }
    .lab-pipe-stadio.is-attenzione .lab-pipe-box { border-color: color-mix(in srgb, var(--trace-2) 70%, var(--lab-line)); }
    .lab-pipe-stadio.is-entra { animation: lab-pipe-entra var(--pg-dur-normale) var(--pg-ease-smooth); }
    @keyframes lab-pipe-entra { from { opacity: 0; transform: translateY(-8px); } }

    .lab-pipe-testa { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; min-width: 0; }
    .lab-pipe-num { flex: none; width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--lab-text) 55%, transparent); font: 800 13px/1 var(--mono); color: var(--lab-text); transition: background-color var(--pg-dur-normale) ease, color var(--pg-dur-normale) ease, border-color var(--pg-dur-normale) ease; }
    .lab-pipe-stadio.is-fatto .lab-pipe-num, .lab-pipe-stadio.is-attivo .lab-pipe-num { background: var(--lab-pipe-vivo); border-color: var(--lab-pipe-vivo); color: #04150d; }
    .lab-pipe-stadio.is-errore .lab-pipe-num { border-color: var(--lab-pipe-ko); color: #ffc2b8; }
    .lab-pipe-comando { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; flex: 1 1 11em; min-width: 0; }
    .lab-pipe-apri { all: unset; box-sizing: border-box; cursor: pointer; min-height: 40px; display: inline-flex; align-items: center; gap: 8px; font: 700 15px/1.3 var(--mono); color: var(--lab-bright); overflow-wrap: anywhere; }
    .lab-pipe-apri::after { content: ""; position: absolute; inset: 0; z-index: 1; border-radius: 12px; }
    .lab-pipe-freccia { flex: none; font-size: 13px; color: var(--lab-text); transition: transform var(--pg-dur-veloce) ease; }
    .lab-pipe-apri[aria-expanded="true"] .lab-pipe-freccia { transform: rotate(90deg); }
    .lab-pipe-campo { position: relative; z-index: 2; color: var(--lab-pipe-arg); padding: 6px 8px; font-size: 15px; }
    .lab-pipe-campo.is-parola { width: 8.5em; }
    .lab-pipe-campo.is-numero { width: 3.4em; text-align: center; }
    .lab-pipe-campo[aria-invalid="true"] { border-color: var(--lab-pipe-ko); color: #ffc2b8; }
    .lab-pipe-campo:focus-visible { outline: 3px solid var(--trace-1); outline-offset: 1px; }
    .lab-pipe-conta { margin-left: auto; font: 700 13px/1 var(--mono); color: var(--lab-text); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .lab-pipe-stadio.is-fatto .lab-pipe-conta, .lab-pipe-stadio.is-attivo .lab-pipe-conta { color: var(--lab-bright); }
    .lab-pipe-ctrl { position: relative; z-index: 2; display: flex; gap: 4px; }
    .lab-pipe-ctrl .pg-btn { min-width: 40px; padding: 0; font-size: 15px; background: transparent; border-color: transparent; color: var(--lab-text); }
    .lab-pipe-ctrl .pg-btn:hover:not(:disabled) { background: var(--lab-raised); border-color: var(--lab-line); color: #fff; }
    .lab-pipe-ctrl .lab-pipe-togli:hover:not(:disabled) { border-color: var(--lab-pipe-ko); color: #ffc2b8; }

    .lab-pipe-nastro { position: relative; margin-left: 34px; height: 22px; overflow: hidden; white-space: nowrap; font: 500 13px/22px var(--mono); color: var(--lab-text); -webkit-mask-image: linear-gradient(90deg, #000 82%, transparent); mask-image: linear-gradient(90deg, #000 82%, transparent); }
    .lab-pipe-stadio.is-fatto .lab-pipe-nastro { color: #d8e7e0; }
    .lab-pipe-acapo { color: var(--lab-pipe-tubo); opacity: .6; padding: 0 3px; }
    .lab-pipe-attesa { color: var(--lab-text); opacity: .7; font-style: italic; font-family: var(--font); }
    .lab-pipe-nastro .lab-pipe-n { display: inline-block; }
    .lab-pipe-nastro.is-arriva .lab-pipe-n, .lab-pipe-nastro.is-arriva .lab-pipe-acapo { animation: lab-pipe-arriva var(--pg-dur-normale) var(--pg-ease-smooth) backwards; }
    @keyframes lab-pipe-arriva { from { opacity: 0; transform: translateY(-6px); } }

    .lab-pipe-dettaglio { position: relative; z-index: 2; margin-left: 34px; padding: 10px 12px; background: var(--lab-bg); border: 1px solid var(--lab-line); border-radius: 9px; font-size: 14px; line-height: 1.5; }
    .lab-pipe-dettaglio[hidden] { display: none; }
    .lab-pipe-dettaglio p { margin: 0 0 6px; }
    .lab-pipe-dettaglio strong { color: var(--lab-bright); }
    .lab-pipe-righe { margin: 6px 0 0; padding: 0; list-style: none; counter-reset: lab-pipe-r; font: 500 13px/1.55 var(--mono); color: #d8e7e0; overflow-x: auto; }
    .lab-pipe-righe li { counter-increment: lab-pipe-r; white-space: pre; }
    .lab-pipe-righe li::before { content: counter(lab-pipe-r); display: inline-block; width: 2.4em; margin-right: 8px; text-align: right; color: var(--lab-text); opacity: .6; }
    .lab-pipe-vuota-riga { color: var(--lab-text); font-style: italic; opacity: .8; }
    .lab-pipe-altre { margin: 4px 0 0 !important; font-size: 13px; color: var(--lab-text); }

    .lab-pipe-vuota { display: grid; gap: 6px; justify-items: start; padding: 18px; border: 1.5px dashed var(--lab-line); border-radius: 12px; color: var(--lab-text); }
    .lab-pipe-vuota[hidden] { display: none; }
    .lab-pipe-vuota p { margin: 0; }
    .lab-pipe-vuota strong { color: var(--lab-bright); }

    .lab-pipe-tavolozza-griglia { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
    .lab-pipe-pezzo { display: grid; justify-items: start; justify-content: stretch; align-content: center; gap: 2px; min-height: 52px; height: auto; padding: 7px 10px; white-space: normal; text-align: left; line-height: 1.25; }
    .lab-pipe-pezzo code { all: unset; font: 700 14px/1.3 var(--mono); color: var(--lab-bright); overflow-wrap: anywhere; }
    .lab-pipe-pezzo code::before { content: "+ "; color: var(--lab-pipe-vivo); }
    .lab-pipe-pezzo small { font-size: 13px; color: var(--lab-text); font-weight: 500; }
    .lab-pipe-pieno { margin: 8px 0 0; font-size: 13px; color: #ffe2a8; }
    .lab-pipe-pieno[hidden] { display: none; }

    .lab-pipe-terminale { border-radius: 12px; overflow: hidden; border: 1px solid #1f3a2c; background: #020b06; box-shadow: inset 0 0 0 1px rgba(62, 224, 143, .06), 0 18px 40px -30px rgba(62, 224, 143, .5); }
    .lab-pipe-t-testa { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid #1f3a2c; background: #06140d; font: 700 13px/1.3 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--lab-text); }
    .lab-pipe-led { width: 9px; height: 9px; border-radius: 50%; background: #23402f; transition: background-color var(--pg-dur-normale) ease, box-shadow var(--pg-dur-normale) ease; }
    .lab-pipe-terminale.is-corsa .lab-pipe-led, .lab-pipe-terminale.is-fatto .lab-pipe-led { background: var(--lab-pipe-vivo); box-shadow: 0 0 8px var(--lab-pipe-vivo); }
    .lab-pipe-terminale.is-errore .lab-pipe-led { background: var(--lab-pipe-ko); box-shadow: 0 0 8px var(--lab-pipe-ko); }
    .lab-pipe-t-stato { margin-left: auto; letter-spacing: .04em; text-transform: none; font-weight: 600; font-size: 13px; }
    .lab-pipe-schermo { position: relative; margin: 0; min-height: 210px; max-height: 360px; overflow: auto; padding: 12px 14px 14px; font: 500 14px/1.55 var(--mono); color: var(--trace-1); text-shadow: 0 0 6px rgba(62, 224, 143, .45); white-space: pre-wrap; overflow-wrap: anywhere; scrollbar-width: thin; scrollbar-color: #1f3a2c transparent; background: radial-gradient(ellipse at 50% 40%, rgba(62, 224, 143, .07), transparent 70%), repeating-linear-gradient(180deg, rgba(255, 255, 255, .025) 0 1px, transparent 1px 3px); }
    .lab-pipe-schermo:focus-visible { outline: 3px solid var(--trace-1); outline-offset: -3px; }
    .lab-pipe-t-cmd { color: #b9f7d4; }
    .lab-pipe-t-cmd b, .lab-pipe-t-prompt { color: var(--lab-pipe-vivo); font-weight: 800; }
    .lab-pipe-t-riga { display: block; min-height: 1.55em; }
    .lab-pipe-t-riga.is-nuova { animation: lab-pipe-accendi var(--pg-dur-veloce) ease-out backwards; }
    @keyframes lab-pipe-accendi { from { opacity: 0; } }
    .lab-pipe-t-err { color: #ffb4a8; text-shadow: none; }
    .lab-pipe-t-nota { color: var(--lab-text); text-shadow: none; font-style: italic; }
    .lab-pipe-cursore { display: inline-block; width: .6em; height: 1.15em; margin-left: 2px; vertical-align: -.2em; background: var(--trace-1); box-shadow: 0 0 6px rgba(62, 224, 143, .6); animation: lab-pipe-cursore 1.1s steps(1) infinite; }
    @keyframes lab-pipe-cursore { 50% { opacity: 0; } }
    .lab-pipe-terminale.is-arrivo .lab-pipe-schermo { animation: lab-pipe-lampo var(--pg-dur-lenta) ease-out; }
    @keyframes lab-pipe-lampo { from { box-shadow: inset 0 0 40px rgba(62, 224, 143, .25); } to { box-shadow: inset 0 0 0 transparent; } }

    .lab-pipe-spiega p { margin: 0 0 .4em; }
    .lab-pipe-spiega .lab-pipe-passo-n { font: 800 13px var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--lab-pipe-vivo); margin-right: 8px; }

    @container (min-width: 760px) {
      .lab-pipe-arena { grid-template-columns: minmax(0, 1.25fr) minmax(300px, 1fr); gap: 20px; padding: 18px; }
      .lab-pipe-verso::before { content: "↗"; } /* il terminale è nella colonna a destra, più in alto */
    }
    @container (max-width: 520px) {
      .lab-pipe-arena { padding: 12px 10px; gap: 14px; }
      .lab-pipe-riga { padding: 10px 12px; font-size: 13px; }
      .lab-pipe-avviso { padding: 10px 12px; }
      .lab-pipe-nastro, .lab-pipe-dettaglio { margin-left: 0; }
      .lab-pipe-box { padding: 8px 8px 9px 10px; }
      .lab-pipe-apri { font-size: 14px; }
      .lab-pipe-ctrl { margin-left: auto; }
    }
    @container (max-width: 360px) {
      .lab-pipe-tavolozza-griglia { grid-template-columns: minmax(0, 1fr); }
      .lab-pipe-pezzo { min-height: 46px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .lab-pipe-seg, .lab-pipe-box, .lab-pipe-box::before, .lab-pipe-num, .lab-pipe-tubo::before, .lab-pipe-freccia, .lab-pipe-led,
      .lab-pipe-video, .lab-pipe-video::before, .lab-pipe-tubo--uscita .lab-pipe-tubo-segno small { transition: none; }
      .lab-pipe-seg.is-nuovo, .lab-pipe-stadio.is-entra, .lab-pipe-nastro.is-arriva .lab-pipe-n, .lab-pipe-nastro.is-arriva .lab-pipe-acapo,
      .lab-pipe-t-riga.is-nuova, .lab-pipe-terminale.is-arrivo .lab-pipe-schermo { animation: none; }
      .lab-pipe-stadio.is-attivo .lab-pipe-box::before { animation: none; opacity: 1; }
      .lab-pipe-cursore { animation: none; }
    }
  `;

  /* ======================= interfaccia ======================= */

  const MAX_NASTRO = 40;   // righe mostrate nel nastro di ogni riquadro
  const MAX_ELENCO = 12;   // righe nell'elenco aperto
  const PACCHETTI = 8;     // pacchetti che attraversano un tubo
  const testoPiano = (t) => String(t).replace(/[`*]/g, '');

  function campiona(righe, m) {
    if (righe.length <= m) return righe.slice();
    const out = [];
    for (let i = 0; i < m; i++) out.push(righe[Math.round(i * (righe.length - 1) / (m - 1))]);
    return out;
  }
  function larghezza(riga) {
    const n = riga.trim().length;
    return n === 0 ? 4 : Math.round(Math.min(22, 5 + n * 0.5));
  }

  function monta(el, ctx) {
    const { h } = ctx;
    let seq = 0;
    const nuovo = (id, param) => Object.assign(Logica.stadio(id, param), { chiave: 'p' + (++seq) });
    const conChiavi = (catena) => catena.map((s) => Object.assign(s, { chiave: 'p' + (++seq) }));

    const stato = {
      catena: conChiavi(Logica.preset('frequenti')),
      ris: null,          // risultato calcolato all'avvio
      fatti: 0,           // stadi già mostrati
      epoca: 0,           // cambia quando i risultati non valgono più
      inCorsa: false,     // esecuzione automatica in corso
      passoAttivo: null,  // promessa del passo singolo in corso
      terminale: 'pronto',
      completato: false,
    };
    const vista = new Map();

    /* ---------- struttura ---------- */

    const bottoniPreset = Logica.PRESET.map((p) => h('button', {
      type: 'button', class: 'pg-btn', 'aria-pressed': 'false', 'data-preset': p.id,
      onclick: () => scegliPreset(p.id),
    }, p.nome));
    const btnEsegui = h('button', { type: 'button', class: 'pg-btn pg-btn--primario lab-pipe-esegui', onclick: () => esegui() }, '▶ Esegui');
    const btnPasso = h('button', { type: 'button', class: 'pg-btn lab-pipe-passo', onclick: () => passo(), title: 'Un comando alla volta' }, '⏭ Passo');
    const btnDaCapo = h('button', {
      type: 'button', class: 'pg-btn lab-pipe-dacapo',
      onclick: () => {
        azzera();
        spiega(introduzione());
        ctx.annuncia('Risultati cancellati: la catena è pronta.');
        btnEsegui.focus(); // «Da capo» ora è spento: il focus non deve perdersi
      },
    }, '↺ Da capo');

    const cmd = h('code', { class: 'lab-pipe-cmd' });
    const riga = h('p', { class: 'lab-pipe-riga' },
      h('span', { class: 'pg-sr' }, 'Riga di comando: '),
      h('span', { class: 'lab-pipe-prompt', 'aria-hidden': 'true' }, '$'), cmd);
    const avviso = h('p', { class: 'lab-pipe-avviso', hidden: true });

    const lista = h('ol', { class: 'lab-pipe-lista', 'aria-label': 'Catena di comandi, dall\'alto in basso' });
    const vuota = h('div', { class: 'lab-pipe-vuota', hidden: true },
      h('p', null, h('strong', null, 'La catena è vuota.')),
      h('p', null, ctx.inline('Comincia da `cat inferno.txt` nella tavolozza: legge il file e lo manda nella prima pipe.')));
    // l'uscita dell'ultimo comando non va in un'altra pipe: va sullo schermo del terminale
    const uscitaTubo = h('div', { class: 'lab-pipe-tubo lab-pipe-tubo--uscita' },
      h('span', { class: 'lab-pipe-tubo-segno' }, h('small', null, 'uscita sul terminale'), h('span', { class: 'lab-pipe-verso' })));
    const uscita = h('div', { class: 'lab-pipe-uscita', 'aria-hidden': 'true' }, uscitaTubo, h('span', { class: 'lab-pipe-video' }));

    const pezzi = Logica.ORDINE.map((id) => {
      const def = Logica.STRUMENTI[id];
      return h('button', { type: 'button', class: 'pg-btn lab-pipe-pezzo', 'data-strumento': id, onclick: () => aggiungi(id) },
        h('code', null, comandoColorato(Logica.stadio(id))),
        h('small', null, def.descrizione));
    });
    const pieno = h('p', { class: 'lab-pipe-pieno', hidden: true }, 'La catena è piena: al massimo ' + Logica.MAX_STADI + ' comandi.');
    const tavolozza = h('section', { class: 'lab-pipe-tavolozza', 'aria-labelledby': ctx.uid('lab-pipe-tav') });
    const titTav = h('h4', { class: 'lab-pipe-titoletto', id: tavolozza.getAttribute('aria-labelledby') }, 'Aggiungi un comando ', h('small', null, '(va in fondo alla catena)'));
    tavolozza.append(titTav, h('div', { class: 'lab-pipe-tavolozza-griglia' }, pezzi), pieno);

    const led = h('span', { class: 'lab-pipe-led', 'aria-hidden': 'true' });
    const tStato = h('span', { class: 'lab-pipe-t-stato' }, 'pronto');
    const schermo = h('pre', { class: 'lab-pipe-schermo', tabindex: '0', 'aria-label': 'Terminale: l\'uscita dell\'ultimo comando' });
    const terminale = h('section', { class: 'lab-pipe-terminale', 'aria-label': 'Terminale' },
      h('div', { class: 'lab-pipe-t-testa' }, led, h('span', null, 'terminale'), tStato), schermo);

    const testo = h('div', { class: 'pg-spiega lab-pipe-spiega' });

    el.append(h('div', { class: 'lab-pipe' },
      h('div', { class: 'pg-strumenti lab-pipe-barra' },
        h('div', { class: 'lab-pipe-esempi' }, h('span', null, 'Esempi'), h('div', { class: 'pg-gruppo', role: 'group', 'aria-label': 'Catene di esempio' }, bottoniPreset)),
        h('div', { class: 'lab-pipe-azioni' }, btnEsegui, btnPasso, btnDaCapo)),
      riga, avviso,
      h('div', { class: 'lab-pipe-arena' },
        h('div', { class: 'lab-pipe-colonna lab-pipe-catena' }, h('div', null, lista, uscita, vuota)),
        h('div', { class: 'lab-pipe-colonna lab-pipe-lato' }, terminale, tavolozza)),
      testo));

    /* ---------- pezzi di disegno ---------- */

    function comandoColorato(s) {
      const c = Logica.comando(s);
      if (s.id === 'cat') return ['cat ', h('span', { class: 'lab-pipe-file' }, Logica.FILE)];
      if (s.id === 'grep') return ['grep ', h('span', { class: 'lab-pipe-arg' }, c.slice(5))];
      if (s.id === 'head') return ['head -n ', h('span', { class: 'lab-pipe-arg' }, c.slice(8))];
      return c;
    }

    function creaVista(s) {
      const def = Logica.STRUMENTI[s.id];
      const idDett = ctx.uid('lab-pipe-d');
      const v = { chiave: s.chiave };
      v.num = h('span', { class: 'lab-pipe-num', 'aria-hidden': 'true' }, '1');
      v.posizione = h('span', { class: 'pg-sr' }, '');
      v.nome = h('span', null, def.param ? def.base : Logica.comando(s));
      v.apri = h('button', {
        type: 'button', class: 'lab-pipe-apri', 'aria-expanded': 'false', 'aria-controls': idDett,
        'aria-keyshortcuts': 'Alt+ArrowUp Alt+ArrowDown',
        onclick: () => apriChiudi(v),
        onkeydown: (e) => {
          if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
          e.preventDefault();
          sposta(v.chiave, e.key === 'ArrowUp' ? -1 : 1, 'apri');
        },
      }, v.posizione, s.id === 'cat' ? ['cat ', h('span', { class: 'lab-pipe-file' }, Logica.FILE)] : v.nome,
      h('span', { class: 'pg-sr' }, ': mostra le righe in uscita'),
      h('span', { class: 'lab-pipe-freccia', 'aria-hidden': 'true' }, '▸'));
      const comando = h('div', { class: 'lab-pipe-comando' }, v.apri);
      if (def.param === 'parola') {
        v.campo = h('input', {
          class: 'pg-campo lab-pipe-campo is-parola', type: 'text', value: s.parola, maxlength: '24',
          autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Parola da cercare con grep',
          oninput: () => cambiaParam(v.chiave, 'parola', v.campo.value),
          onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); esegui(); } },
        });
        comando.append(v.campo);
      } else if (def.param === 'n') {
        v.campo = h('input', {
          class: 'pg-campo lab-pipe-campo is-numero', type: 'text', inputmode: 'numeric', value: s.n, maxlength: '2',
          autocomplete: 'off', 'aria-label': 'Quante righe tiene head',
          oninput: () => cambiaParam(v.chiave, 'n', v.campo.value),
          onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); esegui(); } },
        });
        comando.append(v.campo);
      }
      v.conta = h('span', { class: 'lab-pipe-conta' }, '—');
      v.su = h('button', { type: 'button', class: 'pg-btn lab-pipe-su', onclick: () => sposta(v.chiave, -1, 'su') }, h('span', { 'aria-hidden': 'true' }, '▲'));
      v.giu = h('button', { type: 'button', class: 'pg-btn lab-pipe-giu', onclick: () => sposta(v.chiave, 1, 'giu') }, h('span', { 'aria-hidden': 'true' }, '▼'));
      v.togli = h('button', { type: 'button', class: 'pg-btn lab-pipe-togli', onclick: () => togli(v.chiave) }, h('span', { 'aria-hidden': 'true' }, '✕'));
      v.nastro = h('div', { class: 'lab-pipe-nastro', 'aria-hidden': 'true' });
      v.cosa = h('p', null);
      v.io = h('p', null);
      v.righe = h('ol', { class: 'lab-pipe-righe' });
      v.altre = h('p', { class: 'lab-pipe-altre', hidden: true });
      v.dettaglio = h('div', { class: 'lab-pipe-dettaglio', id: idDett, hidden: true }, v.cosa, v.io, v.righe, v.altre);
      v.box = h('div', { class: 'lab-pipe-box' },
        h('div', { class: 'lab-pipe-testa' }, v.num, comando, v.conta, h('div', { class: 'lab-pipe-ctrl' }, v.su, v.giu, v.togli)),
        v.nastro, v.dettaglio);
      v.tubo = h('div', { class: 'lab-pipe-tubo', 'aria-hidden': 'true' },
        h('span', { class: 'lab-pipe-tubo-segno' }, '|', h('small', null, 'pipe')));
      v.li = h('li', { class: 'lab-pipe-stadio', 'data-chiave': s.chiave,
        onmouseenter: () => evidenzia(v.chiave, true), onmouseleave: () => evidenzia(v.chiave, false),
        onfocusin: () => evidenzia(v.chiave, true), onfocusout: () => evidenzia(v.chiave, false),
      }, v.tubo, v.box);
      return v;
    }

    function aggiornaVista(v, s, i, n) {
      const c = Logica.comando(s);
      v.indice = i;
      v.num.textContent = String(i + 1);
      v.posizione.textContent = 'Passo ' + (i + 1) + ' di ' + n + ': ';
      v.li.classList.toggle('is-primo', i === 0);
      v.su.disabled = i === 0;
      v.giu.disabled = i === n - 1;
      v.su.setAttribute('aria-label', 'Sposta su: ' + c);
      v.giu.setAttribute('aria-label', 'Sposta giù: ' + c);
      v.togli.setAttribute('aria-label', 'Togli: ' + c);
      v.su.title = 'Sposta su';
      v.giu.title = 'Sposta giù';
      v.togli.title = 'Togli dalla catena';
    }

    function disegnaCatena(focus) {
      const prima = fotografa();
      const chiavi = new Set(stato.catena.map((s) => s.chiave));
      for (const [k, v] of vista) if (!chiavi.has(k)) { v.li.remove(); vista.delete(k); }
      const n = stato.catena.length;
      stato.catena.forEach((s, i) => {
        let v = vista.get(s.chiave);
        if (!v) { v = creaVista(s); vista.set(s.chiave, v); v.nuova = true; }
        const qui = lista.children[i];
        if (qui !== v.li) lista.insertBefore(v.li, qui || null);
        aggiornaVista(v, s, i, n);
      });
      vuota.hidden = n > 0;
      uscita.hidden = n === 0;
      const piena = n >= Logica.MAX_STADI;
      pezzi.forEach((b) => { b.disabled = piena; });
      pieno.hidden = !piena;
      disegnaRiga();
      controllaDalVivo();
      aggiornaPreset();
      mostraRisultati();
      flip(prima);
      if (focus) rimettiFocus(focus);
    }

    function fotografa() {
      const m = new Map();
      for (const [k, v] of vista) if (v.li.isConnected) m.set(k, v.li.getBoundingClientRect().top);
      return m;
    }

    function flip(prima) {
      for (const [k, v] of vista) {
        const nuova = v.nuova;
        v.nuova = false;
        if (ctx.riduci) continue;
        if (nuova) {
          v.li.classList.remove('is-entra');
          void v.li.offsetWidth;
          v.li.classList.add('is-entra');
          continue;
        }
        const t0 = prima.get(k);
        if (t0 == null) continue;
        const dy = t0 - v.li.getBoundingClientRect().top;
        if (Math.abs(dy) < 1) continue;
        const giro = (v.giro || 0) + 1;
        v.giro = giro;
        v.li.style.transform = 'translateY(' + dy.toFixed(1) + 'px)';
        ctx.anima({ durata: ctx.DURATA.normale, easing: 'smooth', aggiorna: (p) => { if (v.giro === giro) v.li.style.transform = p >= 1 ? '' : 'translateY(' + ((1 - p) * dy).toFixed(1) + 'px)'; } })
          .catch(() => { if (v.giro === giro) v.li.style.transform = ''; });
      }
    }

    function rimettiFocus(f) {
      const v = vista.get(f.chiave);
      if (!v) { (f.altrimenti || btnEsegui).focus(); return; }
      let bersaglio = v[f.ruolo] || v.apri;
      if (bersaglio.disabled) bersaglio = f.ruolo === 'su' ? v.giu : f.ruolo === 'giu' ? v.su : v.apri;
      if (bersaglio.disabled) bersaglio = v.apri;
      bersaglio.focus();
    }

    function disegnaRiga() {
      cmd.replaceChildren();
      if (!stato.catena.length) { cmd.append(h('span', { class: 'lab-pipe-niente' }, 'nessun comando')); return; }
      stato.catena.forEach((s, i) => {
        if (i) cmd.append(h('span', { class: 'lab-pipe-bar' }, ' | '));
        const seg = h('span', { class: 'lab-pipe-seg', 'data-chiave': s.chiave }, comandoColorato(s));
        const v = vista.get(s.chiave);
        if (v && v.segNuovo) { seg.classList.add('is-nuovo'); v.segNuovo = false; }
        cmd.append(seg);
      });
    }
    function segmento(chiave) { return cmd.querySelector('[data-chiave="' + chiave + '"]'); }
    function evidenzia(chiave, si) { const seg = segmento(chiave); if (seg) seg.classList.toggle('is-sopra', si); }

    /* ---------- controlli dal vivo ---------- */

    function controllaDalVivo() {
      const v = Logica.valida(stato.catena);
      for (const w of vista.values()) {
        w.li.classList.remove('is-errore', 'is-attenzione');
        if (w.campo) w.campo.removeAttribute('aria-invalid');
      }
      cmd.querySelectorAll('.lab-pipe-seg').forEach((s) => s.classList.remove('is-errore'));
      for (const e of v.errori) {
        const s = stato.catena[e.indice];
        if (!s) continue;
        const w = vista.get(s.chiave);
        if (w) { w.li.classList.add('is-errore'); if (e.campo && w.campo) w.campo.setAttribute('aria-invalid', 'true'); }
        const seg = segmento(s.chiave);
        if (seg) seg.classList.add('is-errore');
      }
      for (const a of v.avvisi) {
        const s = stato.catena[a.indice];
        const w = s && vista.get(s.chiave);
        if (w) w.li.classList.add('is-attenzione');
      }
      const err = v.errori.find((e) => e.tipo !== 'vuota');
      const msg = err || (v.errori.length ? null : v.avvisi[0]);
      if (msg) {
        avviso.hidden = false;
        avviso.className = 'lab-pipe-avviso ' + (err ? 'is-errore' : 'is-attenzione');
        avviso.replaceChildren(ctx.inline((err ? '✗ ' : '⚠ ') + msg.testo));
      } else {
        avviso.hidden = true;
        avviso.replaceChildren();
      }
      return v;
    }

    function aggiornaPreset() {
      const riga = Logica.rigaComando(stato.catena);
      bottoniPreset.forEach((b) => {
        const p = Logica.preset(b.dataset.preset);
        b.setAttribute('aria-pressed', String(Logica.rigaComando(p) === riga));
      });
    }

    function aggiornaComandi() {
      const n = stato.catena.length;
      btnEsegui.textContent = stato.inCorsa ? '■ Ferma' : (stato.ris && stato.fatti > 0 && stato.fatti < n ? '▶ Continua' : '▶ Esegui');
      btnEsegui.setAttribute('aria-label', stato.inCorsa ? 'Ferma l\'esecuzione' : (stato.ris && stato.fatti > 0 && stato.fatti < n ? 'Continua l\'esecuzione' : 'Esegui la catena'));
      btnPasso.disabled = stato.inCorsa || n === 0;
      btnDaCapo.disabled = !stato.ris && !stato.inCorsa;
    }

    /* ---------- risultati ---------- */

    function mostraRisultati() {
      stato.catena.forEach((s, i) => {
        const v = vista.get(s.chiave);
        const st = stato.ris && i < stato.fatti ? stato.ris.stadi[i] : null;
        disegnaUscita(v, s, st, false);
        v.li.classList.toggle('is-fatto', !!st);
        v.li.classList.remove('is-attivo');
      });
      disegnaTerminale();
      aggiornaComandi();
    }

    function disegnaUscita(v, s, st, arriva) {
      const def = Logica.STRUMENTI[s.id];
      v.conta.textContent = st ? Logica.righe(st.uscita.length) : '—';
      v.nastro.classList.toggle('is-arriva', !!arriva && !ctx.riduci);
      v.nastro.replaceChildren();
      if (!st) {
        v.nastro.append(h('span', { class: 'lab-pipe-attesa' }, '· · · in attesa'));
      } else if (!st.uscita.length) {
        v.nastro.append(h('span', { class: 'lab-pipe-attesa' }, 'nessuna riga in uscita'));
      } else {
        const max = Math.min(st.uscita.length, MAX_NASTRO);
        for (let i = 0; i < max; i++) {
          const ritardo = arriva ? { style: 'animation-delay:' + Math.min(i, 10) * 30 + 'ms' } : null;
          v.nastro.append(h('span', Object.assign({ class: 'lab-pipe-n' }, ritardo), st.uscita[i].replace(/^\s+/, '')),
            h('span', Object.assign({ class: 'lab-pipe-acapo' }, ritardo), '↵'));
        }
      }
      v.cosa.replaceChildren(ctx.inline('`' + Logica.comando(s) + '` ' + def.descrizione + '.'));
      if (!st) {
        v.io.replaceChildren('Non è ancora partito: premi ▶ Esegui, o ⏭ Passo per un comando alla volta.');
        v.righe.replaceChildren();
        v.altre.hidden = true;
        return;
      }
      v.io.replaceChildren(ctx.inline(st.indice === 0 ? 'Legge il file: escono **' + Logica.righe(st.uscita.length) + '**.' : 'Entrano **' + Logica.righe(st.entrata.length) + '**, escono **' + Logica.righe(st.uscita.length) + '**.'));
      v.righe.replaceChildren(...st.uscita.slice(0, MAX_ELENCO).map((r) => (r === '' ? h('li', null, h('span', { class: 'lab-pipe-vuota-riga' }, '(riga vuota)')) : h('li', null, r))));
      const resto = st.uscita.length - MAX_ELENCO;
      v.altre.hidden = resto <= 0;
      v.altre.textContent = resto <= 0 ? '' : resto === 1 ? '… e un\'altra riga.' : '… e altre ' + resto + ' righe.';
    }

    function apriChiudi(v) {
      const aperto = v.apri.getAttribute('aria-expanded') === 'true';
      v.apri.setAttribute('aria-expanded', String(!aperto));
      v.dettaglio.hidden = aperto;
    }

    function disegnaTerminale(nuove) {
      const n = stato.catena.length;
      const fine = stato.ris && stato.fatti >= n && stato.terminale === 'fatto';
      terminale.classList.toggle('is-corsa', stato.inCorsa || (!!stato.ris && !fine && stato.fatti > 0));
      terminale.classList.toggle('is-fatto', !!fine);
      terminale.classList.toggle('is-errore', stato.terminale === 'errore');
      uscita.classList.toggle('is-acceso', !!fine);
      schermo.replaceChildren();
      const riga = Logica.rigaComando(stato.catena);
      const prompt = h('span', { class: 'lab-pipe-t-riga lab-pipe-t-cmd' }, h('b', null, '$ '), riga);
      schermo.append(prompt);
      if (stato.terminale === 'errore' && stato.errore) {
        schermo.append(h('span', { class: 'lab-pipe-t-riga lab-pipe-t-err' }, '✗ ' + testoPiano(stato.errore)));
        schermo.append(h('span', { class: 'lab-pipe-t-riga' }, h('b', null, '$ '), h('span', { class: 'lab-pipe-cursore' })));
        tStato.textContent = 'errore';
        return;
      }
      if (!n) { prompt.append(h('span', { class: 'lab-pipe-cursore' })); tStato.textContent = 'in attesa'; return; }
      if (!stato.ris || stato.fatti === 0) {
        prompt.append(h('span', { class: 'lab-pipe-cursore' }));
        schermo.append(h('span', { class: 'lab-pipe-t-riga lab-pipe-t-nota' }, 'premi ▶ Esegui: la catena parte'));
        tStato.textContent = 'pronto';
        return;
      }
      if (!fine) {
        schermo.append(h('span', { class: 'lab-pipe-t-riga lab-pipe-t-nota' }, 'le righe scorrono nella catena… (' + stato.fatti + ' di ' + n + ')'));
        tStato.textContent = stato.inCorsa ? 'in esecuzione' : 'in pausa';
        return;
      }
      const u = stato.ris.uscita;
      const quante = nuove == null ? u.length : nuove;
      for (let i = 0; i < quante; i++) {
        schermo.append(h('span', { class: 'lab-pipe-t-riga' + (nuove != null && i === quante - 1 ? ' is-nuova' : '') }, u[i]));
      }
      if (quante >= u.length) {
        if (!u.length) schermo.append(h('span', { class: 'lab-pipe-t-riga lab-pipe-t-nota' }, '(nessuna riga)'));
        schermo.append(h('span', { class: 'lab-pipe-t-riga' }, h('b', { class: 'lab-pipe-t-prompt' }, '$ '), h('span', { class: 'lab-pipe-cursore' })));
        tStato.textContent = 'fatto: ' + Logica.righe(u.length);
      } else {
        tStato.textContent = 'scrive…';
      }
      schermo.scrollTop = schermo.scrollHeight;
    }

    /* ---------- modifiche alla catena ---------- */

    function cambiato() {
      if (stato.ris || stato.inCorsa || stato.terminale === 'errore') azzera();
    }

    function azzera() {
      stato.epoca += 1;
      stato.inCorsa = false;
      stato.passoAttivo = null;
      ctx.annulla();
      stato.ris = null;
      stato.fatti = 0;
      stato.terminale = 'pronto';
      stato.errore = null;
      el.querySelectorAll('.lab-pipe-pacchetto').forEach((p) => p.remove());
      el.querySelectorAll('.lab-pipe-tubo.is-scorre').forEach((t) => t.classList.remove('is-scorre'));
      cmd.querySelectorAll('.is-attivo').forEach((s) => s.classList.remove('is-attivo'));
      mostraRisultati();
    }

    function aggiungi(id) {
      if (stato.catena.length >= Logica.MAX_STADI) return;
      const daPezzo = pezzi.includes(document.activeElement);
      cambiato();
      const s = nuovo(id);
      stato.catena.push(s);
      // con la catena piena i pezzi si spengono: il focus passa al comando appena aggiunto
      disegnaCatena(daPezzo && stato.catena.length >= Logica.MAX_STADI ? { chiave: s.chiave, ruolo: 'apri' } : null);
      const v = vista.get(s.chiave);
      if (v) v.segNuovo = false;
      const seg = segmento(s.chiave);
      if (seg && !ctx.riduci) seg.classList.add('is-nuovo');
      const pos = stato.catena.length;
      const testoAgg = 'Aggiunto `' + Logica.comando(s) + '` in fondo alla catena (passo ' + pos + ').';
      spiega(testoAgg + (pos === 1 && id !== 'cat' ? ' Ma il primo comando deve leggere il file: comincia da `cat inferno.txt`.' : ' Premi ▶ Esegui per vedere cosa cambia.'));
      ctx.annuncia(testoPiano(testoAgg));
    }

    function togli(chiave) {
      const i = stato.catena.findIndex((s) => s.chiave === chiave);
      if (i < 0) return;
      cambiato();
      const [s] = stato.catena.splice(i, 1);
      const dopo = stato.catena[i] || stato.catena[i - 1];
      disegnaCatena(dopo ? { chiave: dopo.chiave, ruolo: 'apri' } : { chiave: null, altrimenti: pezzi[0] });
      const t = 'Tolto `' + Logica.comando(s) + '`.' + (stato.catena.length ? '' : ' La catena è vuota.');
      spiega(t + (stato.catena.length ? ' Premi ▶ Esegui per provare la nuova catena.' : ' Comincia da `cat inferno.txt` nella tavolozza.'));
      ctx.annuncia(testoPiano(t));
    }

    function sposta(chiave, d, ruolo) {
      const i = stato.catena.findIndex((s) => s.chiave === chiave);
      const j = i + d;
      if (i < 0 || j < 0 || j >= stato.catena.length) return;
      cambiato();
      const s = stato.catena[i];
      stato.catena[i] = stato.catena[j];
      stato.catena[j] = s;
      disegnaCatena({ chiave: chiave, ruolo: ruolo });
      const t = '`' + Logica.comando(s) + '` ora è al passo ' + (j + 1) + ' di ' + stato.catena.length + '.';
      spiega(t + ' Premi ▶ Esegui: l\'ordine conta.');
      ctx.annuncia(testoPiano(t));
    }

    function cambiaParam(chiave, nome, valore) {
      const s = stato.catena.find((x) => x.chiave === chiave);
      if (!s) return;
      s[nome] = valore;
      cambiato();
      const seg = segmento(chiave);
      if (seg) seg.replaceChildren(...[].concat(comandoColorato(s)));
      const v = vista.get(chiave);
      if (v) aggiornaVista(v, s, v.indice, stato.catena.length);
      const val = controllaDalVivo();
      aggiornaPreset();
      disegnaTerminale();
      // la spiegazione segue quello che scrivi: o come correggere, o come provare
      const e = val.errori.find((x) => stato.catena[x.indice] === s);
      spiega(e ? e.testo : 'Ora il comando è `' + Logica.comando(s) + '`: premi **Invio** o **▶ Esegui** per provarlo.');
    }

    function scegliPreset(id) {
      azzera();
      for (const v of vista.values()) v.li.remove();
      vista.clear();
      stato.catena = conChiavi(Logica.preset(id));
      disegnaCatena();
      const p = Logica.PRESET.find((x) => x.id === id);
      ctx.annuncia('Esempio: ' + p.nome + '.');
      esegui();
    }

    /* ---------- esecuzione animata ---------- */

    function spiega(t, passoN) {
      testo.replaceChildren(h('p', null, passoN ? h('span', { class: 'lab-pipe-passo-n' }, passoN) : null, ctx.inline(t)));
    }
    function introduzione() {
      return 'Ogni riquadro è un programma che fa **una cosa sola**: legge righe, le trasforma, le passa avanti. Il tubo `|` porta l\'uscita di un programma nell\'entrata del successivo. Premi **▶ Esegui** e guarda scorrere i versi di Dante.';
    }

    function controlla() {
      const v = controllaDalVivo();
      if (v.ok) return true;
      const e = v.errori[0];
      stato.terminale = 'errore';
      stato.errore = e.testo;
      disegnaTerminale();
      spiega(e.testo);
      ctx.annuncia(testoPiano(e.testo));
      const s = stato.catena[e.indice];
      const w = s && vista.get(s.chiave);
      if (w && e.campo && w.campo) w.campo.focus();
      else if (w) w.apri.focus();
      return false;
    }

    function prepara() {
      stato.epoca += 1;
      stato.ris = Logica.esegui(stato.catena);
      stato.fatti = 0;
      stato.terminale = 'pronto';
      stato.errore = null;
      mostraRisultati();
    }

    async function esegui() {
      if (stato.inCorsa) { ferma(); return; }
      if (!controlla()) return;
      // «▶ Continua» riprende la corsa interrotta; altrimenti si riparte da capo
      const continua = !!stato.ris && stato.fatti < stato.catena.length;
      stato.inCorsa = true;
      stato.fermata = false;
      aggiornaComandi();
      if (stato.passoAttivo) { ctx.annulla(); try { await stato.passoAttivo; } catch (e) { /* già gestito */ } }
      if (!stato.inCorsa) { stato.fermata = false; aggiornaComandi(); return; }
      if (!stato.ris || (!continua && stato.fatti >= stato.catena.length)) prepara();
      const ep = stato.epoca;
      const animato = !ctx.riduci;
      stato.inCorsa = true;
      aggiornaComandi();
      disegnaTerminale();
      if (stato.fatti === 0) ctx.annuncia('Esecuzione avviata.');
      else if (stato.fatti < stato.catena.length) {
        spiega('La catena riparte dal passo ' + (stato.fatti + 1) + ' di ' + stato.catena.length + '.', 'Via');
        ctx.annuncia('Esecuzione ripresa dal passo ' + (stato.fatti + 1) + '.');
      }
      try {
        while (stato.inCorsa && ep === stato.epoca && stato.fatti < stato.catena.length) {
          await rivela(stato.fatti, ep, animato);
          if (animato && stato.inCorsa && stato.fatti < stato.catena.length) await ctx.attendi(ctx.DURATA.veloce);
        }
        if (ep === stato.epoca && stato.fatti >= stato.catena.length && stato.terminale !== 'fatto') await finale(ep, animato);
      } catch (err) {
        if (!ctx.annullato(err)) throw err;
      } finally {
        if (ep === stato.epoca) {
          stato.inCorsa = false;
          aggiornaComandi();
          disegnaTerminaleSeServe();
          // fermata a metà: il passo che stava lavorando è stato completato, ora lo si dice
          const n = stato.catena.length;
          if (stato.fermata && stato.fatti < n) {
            const ultimo = stato.fatti > 0 && stato.ris ? Logica.descrivi(stato.ris.stadi[stato.fatti - 1]) + ' ' : '';
            spiega(ultimo + 'La catena è in pausa dopo il passo ' + stato.fatti + ' di ' + n + ': premi **▶ Continua** per ripartire o **⏭ Passo** per un comando alla volta.', 'Pausa');
            ctx.annuncia('Esecuzione in pausa dopo il passo ' + stato.fatti + ' di ' + n + '.');
          } else if (stato.fermata && n && stato.fatti >= n && stato.terminale !== 'fatto') {
            finale(ep, false).catch(() => {}); // fermata durante l'ultimo comando: l'uscita va comunque sullo schermo
          }
        }
        stato.fermata = false;
      }
    }

    function disegnaTerminaleSeServe() { if (stato.terminale !== 'fatto') disegnaTerminale(); }

    // ■ Ferma: le attese si interrompono; il passo in corso si chiude e il messaggio arriva nel finally di esegui.
    function ferma() {
      stato.inCorsa = false;
      stato.fermata = true;
      ctx.annulla();
      aggiornaComandi();
    }

    function passo() {
      if (stato.inCorsa || !stato.catena.length) return;
      if (stato.passoAttivo) { ctx.annulla(); return; } // un secondo clic chiude subito il passo in corso
      if (!controlla()) return;
      if (!stato.ris || (stato.fatti >= stato.catena.length && stato.terminale === 'fatto')) prepara();
      const ep = stato.epoca;
      const animato = !ctx.riduci;
      const k = stato.fatti;
      const p = (async () => {
        try {
          if (k < stato.catena.length) await rivela(k, ep, animato);
          if (ep === stato.epoca && stato.fatti >= stato.catena.length && stato.terminale !== 'fatto') await finale(ep, animato);
        } catch (err) {
          if (!ctx.annullato(err)) throw err;
          // secondo clic su ⏭ Passo durante l'ultimo comando: anche lo schermo si riempie subito
          // (se invece è ▶ Esegui a prendere il comando, sarà lui a mostrare il finale)
          if (!stato.inCorsa && ep === stato.epoca && stato.fatti >= stato.catena.length && stato.terminale !== 'fatto') await finale(ep, false);
        }
      })();
      stato.passoAttivo = p;
      p.finally(() => { if (stato.passoAttivo === p) stato.passoAttivo = null; if (ep === stato.epoca) { aggiornaComandi(); disegnaTerminaleSeServe(); } })
        .catch((err) => { if (!ctx.annullato(err)) console.error(err); });
    }

    // Mostra lo stadio k: i pacchetti attraversano il tubo, poi il programma lavora e scrive.
    async function rivela(k, ep, animato) {
      const s = stato.catena[k];
      const v = vista.get(s.chiave);
      const st = stato.ris.stadi[k];
      const seg = segmento(s.chiave);
      v.li.classList.add('is-attivo');
      if (seg) seg.classList.add('is-attivo');
      try {
        if (animato) {
          // il programma comincia a scrivere mentre le ultime righe stanno ancora arrivando
          const conta = () => ctx.anima({ durata: ctx.DURATA.normale, easing: 'smooth', aggiorna: (p) => { v.conta.textContent = Logica.righe(Math.round(p * st.uscita.length)); } });
          if (k > 0) {
            const entrata = stato.ris.stadi[k - 1].uscita;
            await Promise.all([scorre(v, entrata), ctx.attendi(durataFlusso(entrata.length) * 0.6).then(conta)]);
          } else {
            await conta();
          }
        }
      } finally {
        if (ep === stato.epoca) {
          v.li.classList.remove('is-attivo');
          if (seg) seg.classList.remove('is-attivo');
          v.li.classList.add('is-fatto');
          stato.fatti = Math.max(stato.fatti, k + 1);
          disegnaUscita(v, s, st, animato);
          const frase = Logica.descrivi(st);
          spiega(frase, 'Passo ' + (k + 1) + ' di ' + stato.catena.length);
          ctx.annuncia('Passo ' + (k + 1) + ': ' + testoPiano(frase));
          disegnaTerminale();
          aggiornaComandi();
        }
      }
    }

    const INTERVALLO = 55;
    const VIAGGIO = 460;
    function durataFlusso(n) { return n ? (Math.min(n, PACCHETTI) - 1) * INTERVALLO + VIAGGIO : ctx.DURATA.normale; }

    // I pacchetti scendono nel tubo; nel tubo d'uscita si fermano in fondo, dove comincia lo schermo.
    function scorre(v, righe, ultimo) {
      if (!righe.length) return ctx.attendi(ctx.DURATA.normale);
      const corsa = v.tubo.clientHeight + (ultimo ? -2 : 14);
      const pacchetti = campiona(righe, PACCHETTI).map((r) => {
        const w = larghezza(r);
        const p = h('span', { class: 'lab-pipe-pacchetto', style: 'width:' + w + 'px;margin-left:' + (-w / 2) + 'px' });
        v.tubo.append(p);
        return p;
      });
      v.tubo.classList.add('is-scorre');
      const intervallo = INTERVALLO;
      const viaggio = VIAGGIO;
      const durata = durataFlusso(righe.length);
      const curva = ctx.EASING.sharp;
      const fine = () => { pacchetti.forEach((p) => p.remove()); v.tubo.classList.remove('is-scorre'); };
      return ctx.anima({
        durata: durata, easing: 'linear',
        aggiorna: (q) => {
          const t = q * durata;
          pacchetti.forEach((p, i) => {
            const x = Math.min(1, Math.max(0, (t - i * intervallo) / viaggio));
            p.style.transform = 'translateY(' + (curva(x) * corsa).toFixed(1) + 'px)';
            p.style.opacity = x <= 0 || x >= 1 ? '0' : String(Math.min(1, x / 0.15, (1 - x) / 0.15));
          });
        },
      }).then(fine, (err) => { fine(); throw err; });
    }

    // L'uscita dell'ultimo comando arriva sullo schermo, una riga dopo l'altra.
    async function finale(ep, animato) {
      const u = stato.ris.uscita;
      try {
        // le righe escono dall'ultimo programma e scendono nel tubo verde verso lo schermo
        if (animato && u.length) await scorre({ tubo: uscitaTubo }, u, true);
        if (ep !== stato.epoca) return;
        stato.terminale = 'fatto';
        if (animato && u.length) {
          terminale.classList.remove('is-arrivo');
          void terminale.offsetWidth;
          terminale.classList.add('is-arrivo');
          const passo = Math.max(14, Math.min(45, Math.round(900 / u.length)));
          for (let i = 1; i < u.length; i++) {
            disegnaTerminale(i);
            await ctx.attendi(passo);
            if (ep !== stato.epoca) return;
          }
        }
      } finally {
        if (ep === stato.epoca) {
          stato.terminale = 'fatto';
          disegnaTerminale();
          const c = Logica.consiglio(stato.ris);
          spiega(c || 'Fatto.', 'Fatto');
          ctx.annuncia('Sullo schermo: ' + (!u.length ? 'nessuna riga' : u.length === 1 ? u[0].trim() : Logica.righe(u.length)) + '. ' + testoPiano(c));
          if (!stato.completato) { stato.completato = true; ctx.completa(); }
        }
      }
    }

    /* ---------- avvio ---------- */

    disegnaCatena();
    spiega(introduzione());
    return {};
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('pipe', { titolo: 'Le pipe di Unix', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
