/*
 * Laboratorio «Il prossimo token».
 *
 * Un modello linguistico vero, ma minuscolo, costruito nel browser:
 *  - un tokenizzatore BPE (Byte Pair Encoding) addestrato sul corpus: unisce, una alla volta,
 *    la coppia di simboli più frequente, finché ogni parola del corpus è diventata un token;
 *    le parole mai viste si spezzano in pezzi già noti;
 *  - un modello a n-grammi: per ogni gruppo di 1, 2 o 3 token del corpus conta che cosa è
 *    venuto dopo; se il contesto non compare mai, lo accorcia (backoff) fino a uno già visto;
 *  - un campionatore con temperatura e seme, così ogni corsa si può ripetere identica.
 * L'interfaccia mostra il ciclo di ogni modello linguistico: guarda il contesto, trasforma i
 * conteggi in probabilità, sceglie un token, lo aggiunge al testo e ricomincia.
 */
(function (root) {
  'use strict';

  /* ---------- il corpus: un piccolo file di esempi in Python ---------- */

  const ESEMPI = [
    ['print("Ciao, mondo!")'],
    ['# saluta una persona', 'def saluta(nome):', '    print("Ciao, " + nome + "!")', 'saluta("Ada")', 'saluta("Alan")'],
    ['# conta da 1 a 5', 'for i in range(1, 6):', '    print(i)'],
    ['for i in range(3):', '    print("Ciao!")'],
    ['nomi = ["Ada", "Alan", "Grace"]', 'for nome in nomi:', '    print("Ciao, " + nome + "!")'],
    ['def conta(fino):', '    for i in range(fino):', '        print(i + 1)', '    print("Fatto!")', 'conta(3)'],
    ['# conto alla rovescia', 'for i in range(3, 0, -1):', '    print(i)', 'print("Via!")'],
    ['ora = 9', 'if ora < 12:', '    print("Buongiorno!")', 'else:', '    print("Buonasera!")'],
    ['def saluta(nome, volte):', '    for i in range(volte):', '        print("Ciao, " + nome + "!")', 'saluta("Grace", 2)'],
    ['# somma i numeri da 1 a 10', 'totale = 0', 'for i in range(1, 11):', '    totale = totale + i', 'print("Totale:", totale)'],
    ['nome = input("Come ti chiami? ")', 'print("Piacere, " + nome + "!")'],
    ['def saluta(nome):', '    return "Ciao, " + nome + "!"', 'print(saluta("mondo"))'],
    ['conta = 0', 'while conta < 3:', '    print("Ciao!")', '    conta = conta + 1'],
  ];

  // Il corpus è un solo file: gli esempi uno dopo l'altro, separati da una riga vuota.
  const CORPUS = [ESEMPI.map((righe) => righe.join('\n')).join('\n\n') + '\n'];

  const INIZIO = '⟨inizio⟩';
  const FINE = '⟨fine⟩';
  const ID_INIZIO = 0;
  const ID_FINE = 1;
  const ORDINE = 3; // contesto massimo: 3 token
  const OPERATORI = ['==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '**', '//', '->'];
  const LETTERA = /[A-Za-z_À-ÖØ-öø-ÿ]/;
  const CIFRA = /[0-9]/;
  const SEP = '\u0000';

  function caratteri(str) { return Array.from(str); }

  /* ---------- pre-divisione: righe, rientri, parole, numeri, simboli ---------- */

  // Un pezzo senza spazi che comincia in s[i]: parola, numero, operatore o simbolo singolo.
  function leggiPezzo(s, i) {
    const ch = s[i];
    if (LETTERA.test(ch)) {
      let j = i + 1;
      while (j < s.length && (LETTERA.test(s[j]) || CIFRA.test(s[j]))) j++;
      return { testo: s.slice(i, j), tipo: 'parola' };
    }
    if (CIFRA.test(ch)) {
      let j = i + 1;
      while (j < s.length && CIFRA.test(s[j])) j++;
      return { testo: s.slice(i, j), tipo: 'numero' };
    }
    for (const op of OPERATORI) if (s.startsWith(op, i)) return { testo: op, tipo: 'simbolo' };
    return { testo: String.fromCodePoint(s.codePointAt(i)), tipo: 'simbolo' };
  }

  // Come nei tokenizzatori veri, lo spazio prima di una parola resta attaccato alla parola:
  // « nome» e «nome» sono due pezzi diversi. Ogni 4 spazi a inizio riga formano un rientro.
  function preDividi(testo) {
    const s = String(testo == null ? '' : testo);
    const out = [];
    let i = 0;
    let inizioRiga = true;
    while (i < s.length) {
      const ch = s[i];
      if (ch === '\n') { out.push({ testo: '\n', tipo: 'a-capo' }); i++; inizioRiga = true; continue; }
      if (inizioRiga && s.startsWith('    ', i)) { out.push({ testo: '    ', tipo: 'rientro' }); i += 4; continue; }
      inizioRiga = false;
      if (ch === ' ') {
        let j = i;
        while (s[j] === ' ') j++;
        const dopo = s[j];
        const attacca = dopo !== undefined && !/\s/.test(dopo);
        const soli = attacca ? j - i - 1 : j - i;
        for (let k = 0; k < soli; k++) out.push({ testo: ' ', tipo: 'spazio' });
        i += soli;
        if (attacca) {
          const p = leggiPezzo(s, j);
          out.push({ testo: ' ' + p.testo, tipo: p.tipo });
          i = j + p.testo.length;
        }
        continue;
      }
      if (/\s/.test(ch)) { out.push({ testo: ch, tipo: 'spazio' }); i++; continue; }
      const p = leggiPezzo(s, i);
      out.push(p);
      i += p.testo.length;
    }
    return out;
  }

  /* ---------- Byte Pair Encoding in miniatura ---------- */

  // Unisce, una alla volta, la coppia di simboli più frequente nei pezzi del corpus
  // (a parità, quella che viene prima in ordine alfabetico: così il risultato non cambia mai).
  function addestraBPE(testi, opz) {
    const minimo = (opz && opz.minimo) || 1;
    const massimo = (opz && opz.massimo) || 2000;
    const conta = new Map();
    for (const testo of testi) for (const p of preDividi(testo)) conta.set(p.testo, (conta.get(p.testo) || 0) + 1);
    const parole = [...conta.keys()].sort().map((t) => ({ simboli: caratteri(t), n: conta.get(t) }));
    const unioni = [];
    while (unioni.length < massimo) {
      const coppie = new Map();
      for (const w of parole) {
        for (let k = 0; k < w.simboli.length - 1; k++) {
          const chiave = w.simboli[k] + SEP + w.simboli[k + 1];
          coppie.set(chiave, (coppie.get(chiave) || 0) + w.n);
        }
      }
      let migliore = null;
      let nMigliore = 0;
      for (const [chiave, n] of coppie) {
        if (n > nMigliore || (n === nMigliore && chiave < migliore)) { migliore = chiave; nMigliore = n; }
      }
      if (!migliore || nMigliore < minimo) break;
      const [a, b] = migliore.split(SEP);
      unioni.push([a, b]);
      for (const w of parole) {
        const nuovi = [];
        for (let k = 0; k < w.simboli.length; k++) {
          if (k < w.simboli.length - 1 && w.simboli[k] === a && w.simboli[k + 1] === b) { nuovi.push(a + b); k++; } else nuovi.push(w.simboli[k]);
        }
        w.simboli = nuovi;
      }
    }
    return unioni;
  }

  function tipoDi(testo) {
    if (testo === '\n') return 'a-capo';
    if (testo === '    ') return 'rientro';
    if (/^\s+$/.test(testo)) return 'spazio';
    if (/^ ?[0-9]+$/.test(testo)) return 'numero';
    if (/^ ?[A-Za-z_À-ÿ]/.test(testo)) return 'parola';
    return 'simbolo';
  }

  function creaTokenizzatore(testi) {
    const unioni = addestraBPE(testi);
    const rango = new Map(unioni.map(([a, b], i) => [a + SEP + b, i]));
    // Vocabolario: i due segni speciali, i caratteri singoli (così ogni testo si può scrivere),
    // poi i pezzi nati dalle unioni, nell'ordine in cui sono nati.
    const base = new Set(['\n', '\t']);
    for (let c = 32; c < 127; c++) base.add(String.fromCharCode(c));
    for (const c of 'àèéìòùÀÈÉÌÒÙ') base.add(c);
    for (const testo of testi) for (const c of caratteri(testo)) base.add(c);
    const lista = [INIZIO, FINE].concat([...base].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)));
    const vocab = new Map(lista.map((t, i) => [t, i]));
    for (const [a, b] of unioni) if (!vocab.has(a + b)) { vocab.set(a + b, lista.length); lista.push(a + b); }

    function codificaPezzo(testo) {
      let simboli = caratteri(testo);
      while (simboli.length > 1) {
        let k = -1;
        let r = Infinity;
        for (let j = 0; j < simboli.length - 1; j++) {
          const rr = rango.get(simboli[j] + SEP + simboli[j + 1]);
          if (rr !== undefined && rr < r) { r = rr; k = j; }
        }
        if (k < 0) break;
        simboli = simboli.slice(0, k).concat([simboli[k] + simboli[k + 1]], simboli.slice(k + 2));
      }
      return simboli;
    }

    // Testo → token { id, testo, tipo, parte }. id -1: carattere fuori dal vocabolario.
    function dividi(testo) {
      const out = [];
      for (const p of preDividi(testo)) {
        const pezzi = codificaPezzo(p.testo);
        pezzi.forEach((t, j) => {
          const id = vocab.has(t) ? vocab.get(t) : -1;
          out.push({ id: id, testo: t, tipo: id < 0 ? 'sconosciuto' : p.tipo, parte: pezzi.length > 1 ? (j === 0 ? 'inizio' : 'seguito') : null });
        });
      }
      return out;
    }
    function unisci(tokens) { return tokens.map((t) => (t.id === ID_INIZIO || t.id === ID_FINE ? '' : t.testo)).join(''); }
    function codifica(testo) { return dividi(testo).map((t) => t.id); }
    function decodifica(ids) { return ids.map((id) => (id === ID_INIZIO || id === ID_FINE || !lista[id] ? '' : lista[id])).join(''); }
    function token(id) {
      const testo = lista[id];
      return { id: id, testo: testo, tipo: id === ID_INIZIO || id === ID_FINE ? 'speciale' : tipoDi(testo), parte: null };
    }
    return { unioni: unioni, lista: lista, vocab: vocab, dividi: dividi, unisci: unisci, codifica: codifica, decodifica: decodifica, token: token, codificaPezzo: codificaPezzo };
  }

  /* ---------- il modello a n-grammi ---------- */

  // Per ogni posizione del corpus conta il token che segue i 0, 1, 2 e 3 token precedenti.
  function creaModello(testi, opz) {
    const ordine = (opz && opz.ordine) || ORDINE;
    const tok = creaTokenizzatore(testi);
    const tabelle = [];
    for (let k = 0; k <= ordine; k++) tabelle.push(new Map());
    const sequenze = testi.map((testo) => [ID_INIZIO].concat(tok.codifica(testo), [ID_FINE]));
    let numeri = 0;
    for (const seq of sequenze) {
      for (let i = 1; i < seq.length; i++) {
        for (let k = 0; k <= ordine && k <= i; k++) {
          const chiave = seq.slice(i - k, i).join(',');
          let voce = tabelle[k].get(chiave);
          if (!voce) { voce = { totale: 0, prossimi: new Map() }; tabelle[k].set(chiave, voce); }
          voce.totale++;
          if (!voce.prossimi.has(seq[i])) numeri++;
          voce.prossimi.set(seq[i], (voce.prossimi.get(seq[i]) || 0) + 1);
        }
      }
    }
    const righe = new Set();
    for (const testo of testi) for (const r of testo.split('\n')) if (r.trim()) righe.add(r);
    const nRighe = testi.reduce((n, t) => n + t.split('\n').length - (t.endsWith('\n') ? 1 : 0), 0);
    return { ordine: ordine, tok: tok, tabelle: tabelle, sequenze: sequenze, numeri: numeri, righe: righe, nRighe: nRighe, testi: testi };
  }

  let modelloPronto = null;
  function modello() {
    if (!modelloPronto) modelloPronto = creaModello(CORPUS);
    return modelloPronto;
  }

  // Distribuzione del prossimo token. Si prova il contesto più lungo permesso dalla memoria;
  // se nel corpus non compare mai, si accorcia di un token alla volta (al limite 0: frequenze generali).
  // Le probabilità sono conteggi divisi per il totale: sommano sempre a 1.
  function prossimo(mod, ids, memoria) {
    const m = Math.max(0, Math.min(memoria == null ? mod.ordine : memoria, mod.ordine));
    const seq = [ID_INIZIO].concat(ids);
    const tentativi = [];
    for (let k = Math.min(m, seq.length); k >= 0; k--) {
      const contesto = seq.slice(seq.length - k);
      const voce = mod.tabelle[k].get(contesto.join(','));
      tentativi.push({ k: k, contesto: contesto, visto: !!voce, totale: voce ? voce.totale : 0 });
      if (!voce) continue;
      let ordineVisto = 0;
      const grezzi = [...voce.prossimi.entries()].map(([id, n]) => ({ id: id, n: n, prima: ordineVisto++ }));
      // dal più frequente al meno frequente; a parità, quello visto per primo nel corpus
      grezzi.sort((a, b) => b.n - a.n || a.prima - b.prima);
      const candidati = grezzi.map((c) => Object.assign(mod.tok.token(c.id), { conteggio: c.n, p: c.n / voce.totale }));
      return { k: k, contesto: contesto, totale: voce.totale, tentativi: tentativi, candidati: candidati };
    }
    return { k: 0, contesto: [], totale: 0, tentativi: tentativi, candidati: [] };
  }

  /* ---------- temperatura e sorteggio ---------- */

  // q ∝ conteggio^(1/T): T = 1 lascia i conteggi come sono, T < 1 premia i più frequenti,
  // T > 1 avvicina tra loro le probabilità. T = 0 vuol dire «sempre il più probabile».
  function conTemperatura(candidati, t) {
    if (!candidati.length) return [];
    if (!(t > 0)) return candidati.map((c, i) => Object.assign({}, c, { q: i === 0 ? 1 : 0 }));
    const max = Math.log(candidati[0].conteggio);
    const pesi = candidati.map((c) => Math.exp((Math.log(c.conteggio) - max) / t));
    const somma = pesi.reduce((a, b) => a + b, 0);
    return candidati.map((c, i) => Object.assign({}, c, { q: pesi[i] / somma }));
  }

  // Generatore pseudo-casuale con seme (mulberry32): lo stesso seme dà sempre gli stessi numeri.
  function generatore(seme) {
    let a = (Number(seme) >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Sceglie un candidato: con T = 0 il primo, altrimenti estrae u in [0, 1) e prende la fascia in cui cade.
  function scegli(candidati, t, casuale) {
    const adattati = conTemperatura(candidati, t);
    if (!adattati.length) return { indice: -1, u: null, adattati: adattati };
    if (!(t > 0)) return { indice: 0, u: null, adattati: adattati };
    const u = casuale();
    let somma = 0;
    let ultimo = 0;
    for (let i = 0; i < adattati.length; i++) {
      if (adattati[i].q <= 0) continue;
      ultimo = i;
      somma += adattati[i].q;
      if (u < somma) return { indice: i, u: u, adattati: adattati };
    }
    return { indice: ultimo, u: u, adattati: adattati };
  }

  /* ---------- generazione: un token alla volta ---------- */

  function nuovoStato(mod, inizio, opz) {
    const o = opz || {};
    const seme = o.seme == null ? 1 : o.seme;
    return {
      modello: mod,
      inizio: mod.tok.dividi(inizio || ''),
      generati: [],
      memoria: o.memoria == null ? mod.ordine : o.memoria,
      temperatura: o.temperatura == null ? 1 : o.temperatura,
      seme: seme,
      casuale: generatore(seme),
      finito: false,
    };
  }

  function idsDi(stato) { return stato.inizio.concat(stato.generati).map((t) => t.id); }

  // Un passo del ciclo: contesto → probabilità → scelta → il token si aggiunge al testo.
  // sceltaManuale (facoltativa) è l'indice del candidato scelto da chi usa il laboratorio.
  function passo(stato, sceltaManuale) {
    const dist = prossimo(stato.modello, idsDi(stato), stato.memoria);
    let indice;
    let u = null;
    if (sceltaManuale != null) indice = sceltaManuale;
    else {
      const s = scegli(dist.candidati, stato.temperatura, stato.casuale);
      indice = s.indice;
      u = s.u;
    }
    const scelto = dist.candidati[indice];
    if (!scelto) { stato.finito = true; return { dist: dist, indice: -1, u: u, token: null, fine: true }; }
    const token = Object.assign(stato.modello.tok.token(scelto.id), { generato: true });
    stato.generati.push(token);
    if (token.id === ID_FINE) stato.finito = true;
    return { dist: dist, indice: indice, u: u, token: token, fine: token.id === ID_FINE };
  }

  // Genera fino a maxRighe a capo, fino a ⟨fine⟩ o fino a maxToken token.
  function genera(mod, inizio, opz) {
    const o = Object.assign({ maxRighe: 4, maxToken: 80 }, opz);
    const stato = nuovoStato(mod, inizio, o);
    let righe = 0;
    let motivo = 'limite';
    while (stato.generati.length < o.maxToken) {
      const ev = passo(stato);
      if (ev.fine) { motivo = 'fine'; break; }
      if (ev.token.tipo === 'a-capo' && ++righe >= o.maxRighe) { motivo = 'righe'; break; }
    }
    return { testo: mod.tok.unisci(stato.generati), tokens: stato.generati, motivo: motivo };
  }

  function migliaia(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  const Logica = {
    ESEMPI: ESEMPI,
    CORPUS: CORPUS,
    INIZIO: INIZIO,
    FINE: FINE,
    ID_INIZIO: ID_INIZIO,
    ID_FINE: ID_FINE,
    preDividi: preDividi,
    addestraBPE: addestraBPE,
    creaTokenizzatore: creaTokenizzatore,
    creaModello: creaModello,
    modello: modello,
    prossimo: prossimo,
    conTemperatura: conTemperatura,
    generatore: generatore,
    scegli: scegli,
    nuovoStato: nuovoStato,
    passo: passo,
    genera: genera,
    migliaia: migliaia,
  };

  /* ---------- interfaccia ---------- */

  const P = 'lab-prossimo-token';

  const css = `
    .lab-prossimo-token { position: relative; container-type: inline-size; }
    .lab-prossimo-token-griglia { display: grid; gap: 14px; padding: 14px 12px; }
    .lab-prossimo-token-pannello { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
    .lab-prossimo-token-titolo { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 2px 10px; margin: 0; font: 800 .8125rem/1.3 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--lab-bright); }
    .lab-prossimo-token-titolo small { font: 600 .8125rem var(--font); letter-spacing: 0; text-transform: none; color: var(--lab-text); }

    /* l'inizio scritto da chi usa il laboratorio */
    .lab-prossimo-token-inizio { display: grid; gap: 8px; }
    .lab-prossimo-token-campo { width: 100%; font-size: 1rem; color: var(--lab-bright); }
    .lab-prossimo-token-campo::placeholder { color: #6f8a80; }
    .lab-prossimo-token-esempi { display: flex; flex-wrap: wrap; gap: 6px; }
    .lab-prossimo-token-esempio { font: 600 .8125rem var(--mono); padding: 0 9px; }
    .lab-prossimo-token-esempio[aria-pressed="true"] { background: color-mix(in srgb, var(--lab-bright) 10%, var(--lab-raised)); border-color: var(--lab-bright); color: #fff; }

    /* il testo: righe numerate, i token del tuo inizio in bianco, quelli del modello in verde */
    .lab-prossimo-token-editor {
      position: relative; flex: none; min-height: 9.6em; max-height: 19em; overflow: auto;
      padding: 10px 0; border-radius: 10px; border: 1px solid var(--lab-line);
      background: #050a09; font: 500 .9375rem/1.7 var(--mono); color: var(--lab-bright);
      scrollbar-width: thin; overscroll-behavior: contain;
    }
    .lab-prossimo-token-riga { display: grid; grid-template-columns: 2.6em minmax(0, 1fr); }
    .lab-prossimo-token-num { text-align: right; padding-right: 12px; color: #55706a; font-size: .8125rem; user-select: none; font-variant-numeric: tabular-nums; }
    .lab-prossimo-token-cod { white-space: pre; padding-right: 14px; min-height: 1.7em; }
    .lab-prossimo-token-t { border-radius: 4px; transition: background-color var(--pg-dur-veloce) ease, box-shadow var(--pg-dur-veloce) ease; }
    .lab-prossimo-token-t--tu { color: var(--lab-bright); }
    .lab-prossimo-token-t--modello { color: var(--trace-1); }
    .lab-prossimo-token-t--ignoto { color: var(--trace-4); text-decoration: underline wavy color-mix(in srgb, var(--trace-4) 70%, transparent); text-underline-offset: 3px; }
    .lab-prossimo-token-acapo { color: #4d6a62; font-size: .8125rem; padding: 0 2px; user-select: none; }
    .lab-prossimo-token-t--ctx { background: color-mix(in srgb, var(--trace-2) 20%, transparent); box-shadow: inset 0 -2px 0 var(--trace-2); }
    .lab-prossimo-token-t--ctx .lab-prossimo-token-acapo { color: var(--trace-2); }
    .lab-prossimo-token-t--nuovo { animation: lab-prossimo-token-atterra var(--pg-dur-lenta) var(--pg-ease-smooth); }
    @keyframes lab-prossimo-token-atterra { from { background-color: color-mix(in srgb, var(--trace-1) 42%, transparent); } }
    .lab-prossimo-token-fine { display: inline-block; margin-left: 2px; padding: 0 8px; border-radius: 999px; font: 700 .8125rem/1.6 var(--font); color: var(--lab-bg); background: var(--trace-1); }
    .lab-prossimo-token-caret { display: inline-block; width: .55em; height: 1.2em; margin-left: 1px; vertical-align: -.22em; border-radius: 2px; background: var(--trace-1); animation: lab-prossimo-token-lampeggia 1.1s steps(1) infinite; }
    .lab-prossimo-token-caret[hidden] { display: none; }
    @keyframes lab-prossimo-token-lampeggia { 50% { opacity: 0; } }

    /* «Come è diviso il testo»: ogni token è un tassello con il suo numero */
    .lab-prossimo-token-editor--chip .lab-prossimo-token-cod { white-space: normal; display: flex; flex-wrap: wrap; align-items: flex-start; gap: 6px 4px; padding: 3px 12px 5px 0; }
    .lab-prossimo-token-editor--chip .lab-prossimo-token-t {
      display: inline-grid; justify-items: center; min-width: 1.9em; padding: 1px 6px 2px;
      border: 1px solid var(--lab-line); background: var(--lab-raised); border-radius: 7px; line-height: 1.4; white-space: pre;
    }
    .lab-prossimo-token-editor--chip .lab-prossimo-token-t--modello { border-color: color-mix(in srgb, var(--trace-1) 45%, var(--lab-line)); background: color-mix(in srgb, var(--trace-1) 8%, var(--lab-raised)); }
    .lab-prossimo-token-editor--chip .lab-prossimo-token-t--ignoto { border-style: dashed; border-color: var(--trace-4); text-decoration: none; }
    .lab-prossimo-token-editor--chip .lab-prossimo-token-t--seguito { margin-left: -3px; border-left-style: dashed; }
    .lab-prossimo-token-editor--chip .lab-prossimo-token-t--ctx { border-color: var(--trace-2); box-shadow: none; }
    .lab-prossimo-token-editor--chip .lab-prossimo-token-caret { align-self: center; }
    .lab-prossimo-token-id { font: 600 .8125rem/1.2 var(--mono); color: #8fb0a5; font-variant-numeric: tabular-nums; }
    .lab-prossimo-token-t--ignoto .lab-prossimo-token-id { color: var(--trace-4); }
    .lab-prossimo-token-sp { opacity: .5; }
    .lab-prossimo-token-legenda { margin: 0; font-size: .875rem; line-height: 1.55; color: var(--lab-text); }
    .lab-prossimo-token-legenda[hidden] { display: none; }
    .lab-prossimo-token-legenda .pg-term { color: var(--lab-bright); }
    .lab-prossimo-token-conta { margin: 0; display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: .875rem; color: var(--lab-text); font-variant-numeric: tabular-nums; }
    .lab-prossimo-token-conta span::before { content: ""; display: inline-block; width: 9px; height: 9px; margin-right: 7px; border-radius: 2px; background: var(--lab-bright); vertical-align: 0; }
    .lab-prossimo-token-conta .lab-prossimo-token-conta-ia::before { background: var(--trace-1); }

    /* i tasselli dei token nel pannello e nella spiegazione */
    .lab-prossimo-token-chip {
      display: inline-block; vertical-align: baseline;
      padding: 0 7px; border-radius: 6px; border: 1px solid var(--lab-line); background: var(--lab-raised);
      font: 600 .9375rem/1.55 var(--mono); color: var(--lab-bright); white-space: pre;
    }
    .lab-prossimo-token-chip--ctx { color: var(--trace-2); border-color: color-mix(in srgb, var(--trace-2) 55%, transparent); background: color-mix(in srgb, var(--trace-2) 12%, var(--lab-raised)); }
    .lab-prossimo-token-chip--mai { color: var(--trace-4); border-style: dashed; border-color: color-mix(in srgb, var(--trace-4) 60%, transparent); background: transparent; text-decoration: line-through; text-decoration-thickness: 1px; }
    .lab-prossimo-token-chip--ia { color: var(--trace-1); border-color: color-mix(in srgb, var(--trace-1) 60%, transparent); background: color-mix(in srgb, var(--trace-1) 12%, var(--lab-raised)); }
    .lab-prossimo-token-chip--speciale { font-family: var(--font); font-weight: 700; color: var(--trace-3); }
    .lab-prossimo-token-spiega-chip { font-size: .875rem; }
    .lab-prossimo-token-spiega-chip + .lab-prossimo-token-spiega-chip { margin-left: 3px; }

    /* il contesto: che cosa guarda il modello, e se l'ha mai visto */
    .lab-prossimo-token-scala { display: grid; gap: 6px; min-height: 2.2em; align-content: start; }
    .lab-prossimo-token-gradino { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 6px; margin: 0; font-size: .875rem; color: var(--lab-text); }
    .lab-prossimo-token-gradino-esito { margin-left: auto; padding-left: 8px; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .lab-prossimo-token-gradino--usato .lab-prossimo-token-gradino-esito { color: var(--trace-2); font-weight: 700; }
    .lab-prossimo-token-gradino--mai .lab-prossimo-token-gradino-esito { color: var(--trace-4); }
    .lab-prossimo-token-nessuno { font-style: italic; color: var(--lab-text); }

    /* i candidati: barre delle probabilità (azzurro), il prescelto in verde */
    .lab-prossimo-token-candidati { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
    .lab-prossimo-token-cand {
      display: grid; grid-template-columns: minmax(3.6em, 7em) minmax(48px, 1fr) auto 3.3em;
      align-items: center; column-gap: 10px; width: 100%; min-height: 42px; margin: 0; padding: 4px 8px;
      border: 1px solid transparent; border-radius: 9px; background: transparent; color: var(--lab-text);
      font: inherit; text-align: left; cursor: pointer;
      transition: background-color var(--pg-dur-veloce) ease, border-color var(--pg-dur-veloce) ease, opacity var(--pg-dur-veloce) ease;
    }
    .lab-prossimo-token-cand:hover:not(:disabled) { background: rgba(255, 255, 255, .035); border-color: var(--lab-line); }
    .lab-prossimo-token-cand:disabled { cursor: default; }
    .lab-prossimo-token-cand-tok { justify-self: start; min-width: 0; max-width: 100%; display: flex; }
    .lab-prossimo-token-cand-tok .lab-prossimo-token-chip { overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .lab-prossimo-token-barra { height: 10px; border-radius: 5px; overflow: hidden; background: rgba(255, 255, 255, .07); }
    .lab-prossimo-token-riemp { display: block; height: 100%; width: 100%; border-radius: 5px; background: var(--trace-3); transform-origin: left center; transform: scaleX(0); transition: transform var(--pg-dur-normale) var(--pg-ease-smooth), background-color var(--pg-dur-veloce) ease; will-change: transform; }
    .lab-prossimo-token-cnt { min-width: 4.4em; text-align: right; font-size: .8125rem; color: var(--lab-text); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .lab-prossimo-token-pct { text-align: right; font: 700 .9375rem var(--mono); color: var(--lab-bright); font-variant-numeric: tabular-nums; }
    .lab-prossimo-token-altri { font: italic 600 .875rem var(--font); color: var(--lab-text); white-space: nowrap; }
    .lab-prossimo-token-cand--altri .lab-prossimo-token-riemp { background: color-mix(in srgb, var(--trace-3) 45%, var(--lab-raised)); }
    .lab-prossimo-token-cand--vuoto { opacity: .26; }
    .lab-prossimo-token-cand--vuoto .lab-prossimo-token-barra { background: none; border: 1px dashed var(--lab-line); }
    .lab-prossimo-token-cand--scelto { border-color: var(--trace-1); background: color-mix(in srgb, var(--trace-1) 11%, transparent); }
    .lab-prossimo-token-cand--scelto .lab-prossimo-token-riemp { background: var(--trace-1); }
    .lab-prossimo-token-cand--scelto .lab-prossimo-token-chip { color: var(--trace-1); border-color: color-mix(in srgb, var(--trace-1) 60%, transparent); }

    /* il sorteggio: una striscia divisa in fasce larghe quanto le probabilità */
    .lab-prossimo-token-sorteggio { display: grid; gap: 7px; }
    .lab-prossimo-token-ruota-box { position: relative; }
    .lab-prossimo-token-ruota { display: flex; height: 28px; overflow: hidden; border-radius: 7px; border: 1px solid var(--lab-line); background: rgba(255, 255, 255, .04); }
    .lab-prossimo-token-seg { flex: none; display: flex; align-items: center; justify-content: center; min-width: 0; overflow: hidden; height: 100%; border-right: 1px solid var(--lab-bg); font: 700 .8125rem var(--mono); color: #031018; white-space: pre; background: color-mix(in srgb, var(--trace-3) 82%, #000); transition: background-color var(--pg-dur-veloce) ease; }
    .lab-prossimo-token-seg:nth-child(even) { background: color-mix(in srgb, var(--trace-3) 52%, #000); color: #e8f6ff; }
    .lab-prossimo-token-seg:last-child { border-right: 0; }
    .lab-prossimo-token-seg--altri { background: rgba(255, 255, 255, .12) !important; color: var(--lab-bright) !important; }
    .lab-prossimo-token-seg--scelto { background: var(--trace-1) !important; color: #04150d !important; }
    .lab-prossimo-token-ago { position: absolute; left: 0; top: -6px; bottom: -6px; width: 3px; margin-left: -1px; border-radius: 2px; background: #fff; box-shadow: 0 0 10px rgba(255, 255, 255, .75); opacity: 0; transition: opacity var(--pg-dur-veloce) ease; pointer-events: none; }
    .lab-prossimo-token-ago::before { content: ""; position: absolute; left: 50%; top: -1px; width: 0; height: 0; margin-left: -6px; border: 6px solid transparent; border-top-color: #fff; }
    .lab-prossimo-token-ago--su { opacity: 1; }
    .lab-prossimo-token-sorteggio-t { margin: 0; min-height: 3.1em; font-size: .875rem; line-height: 1.5; color: var(--lab-text); }
    .lab-prossimo-token-sorteggio-t strong { color: var(--lab-bright); }

    /* le manopole */
    .lab-prossimo-token-regola { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 14px 26px; padding: 14px 12px 16px; border-top: 1px solid var(--lab-line); }
    .lab-prossimo-token-manopola { display: grid; gap: 4px; align-content: start; min-width: 0; }
    .lab-prossimo-token-manopola-testa { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; min-height: 22px; }
    .lab-prossimo-token-manopola-riga { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
    .lab-prossimo-token-nome { font-weight: 700; font-size: .875rem; color: var(--lab-bright); }
    .lab-prossimo-token-cursore { display: block; width: 100%; height: 40px; margin: 0; }
    .lab-prossimo-token .pg-lettura { color: var(--lab-bright); font-size: .9375rem; }
    .lab-prossimo-token-memoria { justify-self: start; }
    .lab-prossimo-token-aiuto { margin: 0; font-size: .8125rem; line-height: 1.45; color: var(--lab-text); }
    .lab-prossimo-token-seme { width: 5.2em; text-align: center; color: var(--lab-bright); }
    .lab-prossimo-token-seme[aria-invalid="true"] { border-color: var(--trace-4); color: var(--trace-4); }
    .lab-prossimo-token-errore { margin: 0; font-size: .875rem; color: var(--trace-4); font-weight: 600; }
    .lab-prossimo-token-errore[hidden] { display: none; }

    /* la spiegazione, il corpus e la nota finale */
    .lab-prossimo-token .pg-spiega p { margin: 0 0 .45em; }
    .lab-prossimo-token .pg-spiega p:last-child { margin-bottom: 0; }
    .lab-prossimo-token-corpus { border-top: 1px solid var(--lab-line); }
    .lab-prossimo-token-corpus > summary { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; min-height: 48px; padding: 12px 16px; cursor: pointer; font-weight: 700; color: var(--lab-bright); list-style: none; }
    .lab-prossimo-token-corpus > summary::-webkit-details-marker { display: none; }
    .lab-prossimo-token-corpus > summary::before { content: "▸"; display: inline-block; color: var(--trace-2); transition: transform var(--pg-dur-veloce) ease; }
    .lab-prossimo-token-corpus[open] > summary::before { transform: rotate(90deg); }
    .lab-prossimo-token-corpus > summary small { font-weight: 500; color: var(--lab-text); font-size: .875rem; }
    .lab-prossimo-token-corpus-info { margin: 0 16px 10px; font-size: .875rem; line-height: 1.5; color: var(--lab-text); }
    .lab-prossimo-token-corpus-corpo { position: relative; margin: 0 16px 18px; max-height: 330px; overflow: auto; padding: 10px 0; border-radius: 10px; border: 1px solid var(--lab-line); background: #050a09; font: 500 .875rem/1.65 var(--mono); color: #c9dbd4; scrollbar-width: thin; overscroll-behavior: contain; }
    .lab-prossimo-token-corpus-corpo .lab-prossimo-token-t--dopo { color: var(--trace-3); box-shadow: inset 0 -2px 0 var(--trace-3); }
    .lab-prossimo-token-nota { padding: 16px 16px 20px; border-top: 1px solid var(--lab-line); background: rgba(255, 255, 255, .02); }
    .lab-prossimo-token-nota-t { margin: 0 0 8px; font: 800 .8125rem var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--trace-2); }
    .lab-prossimo-token-nota p:not(.lab-prossimo-token-nota-t) { margin: 0 0 .6em; max-width: 78ch; font-size: .9375rem; line-height: 1.62; color: var(--lab-text); }
    .lab-prossimo-token-nota p:last-child { margin-bottom: 0; }
    .lab-prossimo-token-nota strong { color: var(--lab-bright); }
    .lab-prossimo-token a { color: var(--trace-3); }
    .lab-prossimo-token .pg-term { text-decoration-color: color-mix(in srgb, var(--trace-3) 75%, transparent); }
    .lab-prossimo-token .pg-term:hover, .lab-prossimo-token .pg-term[aria-expanded="true"] { color: var(--trace-3); }

    /* il token che vola dal pannello al testo */
    .lab-prossimo-token-strato { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 2; }
    .lab-prossimo-token-volo { position: absolute; left: 0; top: 0; will-change: transform; box-shadow: 0 10px 24px -8px rgba(0, 0, 0, .8), 0 0 0 1px color-mix(in srgb, var(--trace-1) 70%, transparent), 0 0 18px color-mix(in srgb, var(--trace-1) 35%, transparent); }

    @container (max-width: 400px) {
      .lab-prossimo-token-cand { grid-template-columns: minmax(3.4em, 6.4em) minmax(36px, 1fr) auto 2.9em; column-gap: 7px; padding: 4px 6px; }
      .lab-prossimo-token-cnt { min-width: 0; }
      .lab-prossimo-token-chip { padding: 0 5px; }
    }
    @container (min-width: 520px) {
      .lab-prossimo-token-griglia { padding: 16px 18px; }
      .lab-prossimo-token-regola { padding: 14px 18px 16px; }
      .lab-prossimo-token-corpus > summary { padding: 12px 20px; }
      .lab-prossimo-token-corpus-info { margin: 0 20px 10px; }
      .lab-prossimo-token-corpus-corpo { margin: 0 20px 18px; }
      .lab-prossimo-token-nota { padding: 16px 20px 20px; }
    }
    @container (min-width: 780px) {
      .lab-prossimo-token-griglia { grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr); gap: 16px; }
      .lab-prossimo-token-pannello--testo .lab-prossimo-token-editor { flex: 1 1 0; min-height: 12em; max-height: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      .lab-prossimo-token-riemp, .lab-prossimo-token-t, .lab-prossimo-token-cand, .lab-prossimo-token-ago, .lab-prossimo-token-seg { transition: none; }
      .lab-prossimo-token-t--nuovo { animation: none; }
      .lab-prossimo-token-caret { animation: none; }
    }
  `;

  function monta(el, ctx) {
    const h = ctx.h;
    const M = modello();
    const tok = M.tok;
    const ESEMPI_INIZIO = ['for i in range(', 'def saluta(nome):', 'print(', '#'];
    const RIGHE_PER_GIRO = 3;
    const MAX_GENERATI = 160;
    const N_RIGHE = 6; // 5 candidati + «altri»

    const st = nuovoStato(M, ESEMPI_INIZIO[0], { memoria: 3, temperatura: 1, seme: 1948 });
    let dist = null;
    let adattati = [];
    let modoChip = false;
    let inGenerazione = false;
    let versione = 0;
    let spans = [];
    let spansCtx = [];
    let rigaCod = null;
    let nRighe = 0;
    let corpusSpans = null;
    let corpusEvid = [];
    let annuncioTemp = 0;
    let completato = false;

    /* ----- costruzione ----- */

    const bUno = h('button', { type: 'button', class: 'pg-btn pg-btn--primario', onclick: () => unToken() }, 'Un token');
    const bGenera = h('button', { type: 'button', class: 'pg-btn', onclick: () => alternaGenera() }, '▶ Genera');
    const bDaCapo = h('button', { type: 'button', class: 'pg-btn', onclick: () => ricomincia(), title: 'Ricomincia dall\'inizio, con lo stesso seme' }, '↺ Ricomincia');
    const bChip = h('button', { type: 'button', class: 'pg-btn', 'aria-pressed': 'false', onclick: () => alternaChip() }, 'Come è diviso il testo');

    const idCampo = ctx.uid('pt-inizio');
    const campo = h('input', {
      id: idCampo, type: 'text', class: 'pg-campo ' + P + '-campo', value: ESEMPI_INIZIO[0], maxlength: '80',
      spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', placeholder: 'Scrivi l\'inizio di un programma',
    });
    campo.addEventListener('input', () => nuovoInizio(campo.value));
    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); unToken(); } });
    const bEsempi = ESEMPI_INIZIO.map((testo) => h('button', {
      type: 'button', class: 'pg-btn ' + P + '-esempio', 'aria-pressed': 'false',
      title: testo === '#' ? 'Un commento: il modello deve scrivere in italiano' : null,
      onclick: () => { campo.value = testo; nuovoInizio(testo); },
    }, testo));

    const editor = h('div', { class: P + '-editor', tabindex: '0', role: 'region', 'aria-label': 'Il testo: il tuo inizio e i token aggiunti dal modello' });
    const caret = h('span', { class: P + '-caret', 'aria-hidden': 'true' });
    const conta = h('p', { class: P + '-conta' });
    const legenda = h('p', { class: P + '-legenda', hidden: true });
    legenda.append(
      ctx.inline('Ogni tassello è un token, con il suo numero nel vocabolario: **·** è lo spazio attaccato alla parola, **⇥** un rientro di 4 spazi, **⏎** un a capo. Come l\'{{analisi lessicale}} di un compilatore ([capitolo 5](#fortran)), il tokenizzatore taglia il testo; qui però i pezzi li ha scelti la statistica, unendo una alla volta le coppie di caratteri più frequenti (Byte Pair Encoding, lo stesso metodo di GPT-2). '),
      'Il vocabolario di questo giocattolo ha ' + tok.lista.length + ' token, quello di GPT-2 ne aveva 50.257. Il modello non vede lettere: vede soltanto i numeri. Prova a scrivere una parola che non ha mai letto, come «Martina»: verrà spezzata in pezzi conosciuti.');

    const pannelloTesto = h('section', { class: 'pg-pannello ' + P + '-pannello ' + P + '-pannello--testo', 'aria-label': 'Il testo' },
      h('div', { class: P + '-inizio' },
        h('label', { class: P + '-titolo', for: idCampo }, 'Il tuo inizio', h('small', null, 'scrivi o scegli')),
        campo,
        h('div', { class: P + '-esempi', role: 'group', 'aria-label': 'Inizi pronti' }, bEsempi)),
      h('p', { class: P + '-titolo' }, 'Il testo', h('small', null, 'bianco: tu · verde: il modello')),
      editor, legenda, conta);

    const scala = h('div', { class: P + '-scala' });
    const righe = [];
    const lista = h('ol', { class: P + '-candidati', 'aria-label': 'Candidati per il prossimo token' });
    for (let i = 0; i < N_RIGHE; i++) {
      const r = {
        tok: h('span', { class: P + '-cand-tok' }),
        fill: h('span', { class: P + '-riemp' }),
        cnt: h('span', { class: P + '-cnt' }),
        pct: h('span', { class: P + '-pct' }),
      };
      r.btn = h('button', { type: 'button', class: P + '-cand' + (i === N_RIGHE - 1 ? ' ' + P + '-cand--altri' : ''), onclick: () => sceltaTua(i) },
        r.tok, h('span', { class: P + '-barra', 'aria-hidden': 'true' }, r.fill), r.cnt, r.pct);
      lista.append(h('li', null, r.btn));
      righe.push(r);
    }
    const ruota = h('div', { class: P + '-ruota' });
    const ago = h('span', { class: P + '-ago' });
    const sorteggioT = h('p', { class: P + '-sorteggio-t' });

    const idTemp = ctx.uid('pt-temp');
    const temp = h('input', { id: idTemp, type: 'range', class: 'pg-cursore ' + P + '-cursore', min: '0', max: '2', step: '0.1', value: String(st.temperatura), 'aria-describedby': idTemp + '-aiuto' });
    const lettura = h('output', { class: 'pg-lettura', for: idTemp });
    temp.addEventListener('input', () => cambiaTemperatura(Number(temp.value), false));
    temp.addEventListener('change', () => cambiaTemperatura(Number(temp.value), true));
    const bMemoria = [1, 2, 3].map((k) => h('button', { type: 'button', class: 'pg-btn', 'aria-pressed': String(k === st.memoria), onclick: () => cambiaMemoria(k) }, k === 1 ? '1 token' : k + ' token'));
    const idSeme = ctx.uid('pt-seme');
    const semeCampo = h('input', { id: idSeme, type: 'text', inputmode: 'numeric', class: 'pg-campo ' + P + '-seme', value: String(st.seme), maxlength: '4', 'aria-describedby': idSeme + '-err' });
    const erroreSeme = h('p', { id: idSeme + '-err', class: P + '-errore', hidden: true });
    semeCampo.addEventListener('change', () => impostaSeme(semeCampo.value));
    semeCampo.addEventListener('keydown', (e) => { if (e.key === 'Enter') impostaSeme(semeCampo.value); });
    semeCampo.addEventListener('input', () => { if (semeValido(semeCampo.value) != null) mostraErroreSeme(''); });
    const bSeme = h('button', { type: 'button', class: 'pg-btn', onclick: () => nuovoSeme() }, 'Nuovo seme');

    const pannelloProssimo = h('section', { class: 'pg-pannello ' + P + '-pannello', 'aria-label': 'Il prossimo token' },
      h('p', { class: P + '-titolo' }, 'Il prossimo token', h('small', null, 'contesto → probabilità → scelta')),
      scala,
      lista,
      h('div', { class: P + '-sorteggio' }, h('div', { class: P + '-ruota-box', 'aria-hidden': 'true' }, ruota, ago), sorteggioT));

    const manopole = h('div', { class: P + '-regola' },
      h('div', { class: P + '-manopola' },
        h('div', { class: P + '-manopola-testa' }, h('label', { class: P + '-nome', for: idTemp }, 'Temperatura'), lettura),
        temp,
        h('p', { class: P + '-aiuto', id: idTemp + '-aiuto' }, '0: sempre il più probabile · 1: le probabilità del corpus · 2: molta varietà')),
      h('div', { class: P + '-manopola' },
        h('div', { class: P + '-manopola-testa' }, h('span', { class: P + '-nome', id: idTemp + '-mem' }, 'Memoria')),
        h('div', { class: 'pg-gruppo ' + P + '-memoria', role: 'group', 'aria-labelledby': idTemp + '-mem' }, bMemoria),
        h('p', { class: P + '-aiuto' }, 'Quanti token guarda all\'indietro. GPT-3 ne guardava fino a 2.048.')),
      h('div', { class: P + '-manopola' },
        h('div', { class: P + '-manopola-testa' }, h('label', { class: P + '-nome', for: idSeme }, 'Seme')),
        h('div', { class: P + '-manopola-riga' }, semeCampo, bSeme),
        h('p', { class: P + '-aiuto' }, 'Lo stesso seme ripete gli stessi sorteggi.'),
        erroreSeme));

    const spiega = h('div', { class: 'pg-spiega' });
    const corpusInfo = h('p', { class: P + '-corpus-info' });
    const corpusCorpo = h('div', { class: P + '-corpus-corpo', tabindex: '0', role: 'region', 'aria-label': 'Il corpus' });
    const dettagli = h('details', { class: P + '-corpus' },
      h('summary', null, 'Che cosa ha letto il modello', h('small', null, 'un file di ' + M.nRighe + ' righe')),
      corpusInfo, corpusCorpo);
    dettagli.addEventListener('toggle', () => { if (dettagli.open) { costruisciCorpus(); evidenziaCorpus(true); } });

    const milioni = 175e9 / M.numeri / 1e6;
    const volteTxt = milioni >= 100 ? Math.round(milioni / 10) * 10 : Math.round(milioni);
    const nota = h('div', { class: P + '-nota' },
      h('p', { class: P + '-nota-t' }, 'Un giocattolo onesto'),
      h('p', null, ctx.inline('Questo è un {{modello linguistico}} vero, ma minuscolo: ha letto un file di ' + M.nRighe + ' righe, conosce ' + tok.lista.length + ' token e tutto ciò che ha imparato sta in **' + migliaia(M.numeri) + ' numeri**, i conteggi di che cosa viene dopo ogni gruppo di 1, 2 o 3 token.')),
      h('p', null, ctx.inline('I modelli che oggi scrivono codice sono reti {{Transformer}} con miliardi di {{peso|pesi}}: GPT-3, nel 2020, aveva 175 miliardi di parametri, circa ' + volteTxt + ' milioni di volte i numeri di questo giocattolo, e guardava indietro fino a 2.048 token invece di 3. Il ciclo però è lo stesso: **indovina il prossimo {{token di un modello linguistico|token}}, aggiungilo, ripeti.**')),
      h('p', null, ctx.inline('Le probabilità vengono soltanto da ciò che il modello ha letto. Non controlla se il programma funziona: propone con sicurezza ciò che nel corpus era frequente, anche dove qui è sbagliato. È uno dei motivi per cui anche i modelli veri possono scrivere cose sbagliate con grande sicurezza, le cosiddette {{allucinazione|allucinazioni}}.')),
      h('p', null, ctx.inline('L\'idea è più vecchia dei computer: nel 1913 Andrej Markov contò come si alternano vocali e consonanti in 20.000 lettere dell\'*Evgenij Onegin* di Puškin; nel 1948 Claude Shannon, lo stesso dei circuiti a relè del [capitolo 2](#logica), costruì frasi «quasi inglesi» scegliendo ogni lettera, e poi ogni parola, in base a quelle che la precedevano.')));

    const strato = h('div', { class: P + '-strato', 'aria-hidden': 'true' });
    const radice = h('div', { class: P },
      h('div', { class: 'pg-strumenti' }, bUno, bGenera, bDaCapo, h('span', { class: 'pg-spazio' }), bChip),
      h('div', { class: P + '-griglia' }, pannelloTesto, pannelloProssimo),
      manopole, spiega, dettagli, nota, strato);
    el.append(radice);

    /* ----- utilità per i token ----- */

    function tutti() { return st.inizio.concat(st.generati); }
    function esaurito() { return st.finito || st.generati.length >= MAX_GENERATI; }

    // Il token come si vede su un tassello: gli spazi e gli a capo diventano visibili.
    function vedi(t) {
      if (t.id === ID_INIZIO) return INIZIO;
      if (t.id === ID_FINE) return FINE;
      const s = t.testo;
      if (s === '\n') return '⏎';
      if (s === '    ' || s === '\t') return '⇥';
      return s;
    }
    function vediCorto(t) {
      const s = vedi(t);
      return s.length > 1 && s[0] === ' ' ? '·' + s.slice(1) : s === ' ' ? '·' : s;
    }
    function testoChip(t) {
      const s = vedi(t);
      if (s.length > 1 && s[0] === ' ') return [h('span', { class: P + '-sp' }, '·'), s.slice(1)];
      if (s === ' ') return h('span', { class: P + '-sp' }, '·');
      return s;
    }
    // Il token detto a parole, per i lettori di schermo.
    function parlato(t) {
      if (t.id === ID_INIZIO) return 'inizio del file';
      if (t.id === ID_FINE) return 'fine del file';
      const s = t.testo;
      if (s === '\n') return 'a capo';
      if (s === '    ') return 'rientro';
      if (s === ' ') return 'spazio';
      if (s === '\t') return 'tabulazione';
      if (s[0] === ' ') return 'spazio ' + s.slice(1);
      return s;
    }
    function chip(t, variante) {
      const speciale = t.id === ID_INIZIO || t.id === ID_FINE;
      return h('span', { class: P + '-chip' + (variante ? ' ' + P + '-chip--' + variante : '') + (speciale ? ' ' + P + '-chip--speciale' : ''), title: parlato(t) }, testoChip(t));
    }
    function catena(ids, variante) {
      if (!ids.length) return [h('span', { class: P + '-nessuno' }, 'nessun contesto')];
      return ids.map((id) => chip(id < 0 ? { id: -1, testo: '?' } : tok.token(id), variante));
    }
    function citazione(ids) { return ids.map((id) => parlato(id < 0 ? { id: -1, testo: '?' } : tok.token(id))).join(' '); }
    function volte(n) { return n === 1 ? '1 volta' : migliaia(n) + ' volte'; }
    function pct(q) {
      if (q >= 1) return '100%';
      if (q <= 0) return '0%';
      const r = Math.round(q * 100);
      if (r >= 100) return '>99%';
      if (r < 1) return '<1%';
      return r + '%';
    }
    function decimale(x, cifre) { return x.toFixed(cifre).replace('.', ','); }
    function idsVisti(ids) { return ids.map((id) => (id < 0 ? -1 : id)); }

    /* ----- il testo ----- */

    function nuovaRiga() {
      nRighe++;
      rigaCod = h('span', { class: P + '-cod' });
      editor.append(h('div', { class: P + '-riga' }, h('span', { class: P + '-num', 'aria-hidden': 'true' }, String(nRighe)), rigaCod));
    }

    function spanDi(t) {
      const classi = [P + '-t', t.generato ? P + '-t--modello' : P + '-t--tu'];
      if (t.tipo === 'sconosciuto') classi.push(P + '-t--ignoto');
      if (t.parte === 'seguito') classi.push(P + '-t--seguito');
      if (t.id === ID_FINE) return h('span', { class: classi.join(' ') }, h('span', { class: P + '-fine' }, 'fine del file'));
      if (modoChip) {
        return h('span', { class: classi.join(' '), title: parlato(t) + (t.id >= 0 ? ', numero ' + t.id : ', fuori dal vocabolario') },
          h('span', null, testoChip(t)), h('span', { class: P + '-id' }, t.id < 0 ? '?' : String(t.id)));
      }
      if (t.tipo === 'a-capo') return h('span', { class: classi.join(' ') }, h('span', { class: P + '-acapo', 'aria-hidden': 'true' }, '⏎'));
      return h('span', { class: classi.join(' ') }, t.testo);
    }

    function aggiungiSpan(t, nuovo) {
      const sp = spanDi(t);
      if (nuovo && !ctx.riduci) sp.classList.add(P + '-t--nuovo');
      rigaCod.insertBefore(sp, caret.parentNode === rigaCod ? caret : null);
      spans.push(sp);
      if (t.tipo === 'a-capo') { nuovaRiga(); rigaCod.append(caret); }
    }

    function disegnaTesto() {
      editor.replaceChildren();
      editor.classList.toggle(P + '-editor--chip', modoChip);
      spans = [];
      spansCtx = [];
      nRighe = 0;
      nuovaRiga();
      rigaCod.append(caret);
      for (const t of tutti()) aggiungiSpan(t, false);
      caret.hidden = st.finito;
      scorriInFondo();
    }

    function scorriInFondo() {
      editor.scrollTop = editor.scrollHeight;
      const destra = caret.offsetLeft + caret.offsetWidth + 24;
      if (destra > editor.scrollLeft + editor.clientWidth) editor.scrollLeft = destra - editor.clientWidth;
      else if (caret.offsetLeft < editor.scrollLeft) editor.scrollLeft = 0;
    }

    function evidenziaContesto() {
      spansCtx.forEach((s) => s.classList.remove(P + '-t--ctx'));
      spansCtx = [];
      if (!dist || st.finito) return;
      const k = dist.contesto.filter((id) => id !== ID_INIZIO).length;
      for (let i = spans.length - k; i < spans.length; i++) {
        if (i >= 0 && spans[i]) { spans[i].classList.add(P + '-t--ctx'); spansCtx.push(spans[i]); }
      }
    }

    function disegnaConteggi() {
      const nIa = st.generati.filter((t) => t.id !== ID_FINE).length;
      const righeIa = st.generati.filter((t) => t.tipo === 'a-capo').length;
      conta.replaceChildren(
        h('span', null, 'Il tuo inizio: ' + (st.inizio.length === 1 ? '1 token' : st.inizio.length + ' token')),
        h('span', { class: P + '-conta-ia' }, 'Il modello: ' + (nIa === 1 ? '1 token' : nIa + ' token') + (righeIa ? ', ' + (righeIa === 1 ? '1 a capo' : righeIa + ' a capo') : '')));
    }

    /* ----- il pannello del prossimo token ----- */

    function calcola() {
      dist = prossimo(M, idsVisti(tutti().map((t) => t.id)), st.memoria);
      adattati = conTemperatura(dist.candidati, st.temperatura);
    }

    function disegnaScala() {
      const out = [];
      for (const t of dist.tentativi) {
        const usato = t.visto;
        const ids = t.contesto;
        out.push(h('p', { class: P + '-gradino ' + P + (usato ? '-gradino--usato' : '-gradino--mai') },
          catena(ids, usato ? 'ctx' : 'mai'),
          h('span', { class: P + '-gradino-esito' }, usato ? (t.k ? 'visto ' + volte(t.totale) : 'tutti i ' + migliaia(t.totale) + ' token') : 'mai visto')));
      }
      scala.replaceChildren(...out);
    }

    function qDi(i) {
      if (i < N_RIGHE - 1) return adattati[i] ? adattati[i].q : 0;
      return adattati.slice(N_RIGHE - 1).reduce((s, c) => s + c.q, 0);
    }

    function disegnaCandidati(cresci) {
      const fermo = esaurito();
      const resto = adattati.slice(N_RIGHE - 1);
      righe.forEach((r, i) => {
        r.btn.classList.remove(P + '-cand--scelto');
        let vuoto;
        if (i < N_RIGHE - 1) {
          const c = adattati[i];
          vuoto = !c;
          if (c) {
            r.tok.replaceChildren(chip(c));
            r.cnt.textContent = c.conteggio + ' su ' + dist.totale;
            r.btn.setAttribute('aria-label', 'Scegli tu ' + parlato(c) + ': ' + pct(c.q) + ', visto ' + volte(c.conteggio) + ' su ' + dist.totale);
          }
          r.btn.disabled = vuoto || fermo;
        } else {
          vuoto = !resto.length;
          if (!vuoto) {
            r.tok.replaceChildren(h('span', { class: P + '-altri' }, resto.length === 1 ? 'un altro' : 'altri ' + resto.length));
            const n = resto.reduce((s, c) => s + c.conteggio, 0);
            r.cnt.textContent = n + ' su ' + dist.totale;
            r.btn.setAttribute('aria-label', (resto.length === 1 ? 'Un altro candidato' : 'Altri ' + resto.length + ' candidati') + ': ' + pct(qDi(i)) + ' in tutto');
          }
          r.btn.disabled = true;
        }
        r.btn.classList.toggle(P + '-cand--vuoto', vuoto);
        if (vuoto) {
          r.btn.removeAttribute('aria-label');
          r.tok.replaceChildren();
          r.cnt.textContent = '';
        }
      });
      aggiornaBarre(cresci);
    }

    function aggiornaBarre(cresci) {
      if (cresci && !ctx.riduci) {
        righe.forEach((r) => { r.fill.style.transition = 'none'; r.fill.style.transform = 'scaleX(0)'; });
        void lista.offsetWidth;
        righe.forEach((r) => { r.fill.style.transition = ''; });
      }
      righe.forEach((r, i) => {
        const q = qDi(i);
        r.fill.style.transitionDelay = cresci && !ctx.riduci ? (i * 40) + 'ms' : '0ms';
        r.fill.style.transform = 'scaleX(' + q.toFixed(4) + ')';
        r.pct.textContent = r.btn.classList.contains(P + '-cand--vuoto') ? '' : pct(q);
      });
      disegnaRuota();
    }

    function disegnaRuota() {
      const segmenti = [];
      for (let i = 0; i < N_RIGHE; i++) {
        const q = qDi(i);
        if (q <= 0) continue;
        const altri = i === N_RIGHE - 1;
        const etichetta = q >= 0.12 ? (altri ? 'altri' : vediCorto(adattati[i])) : '';
        segmenti.push(h('span', { class: P + '-seg' + (altri ? ' ' + P + '-seg--altri' : ''), 'data-i': String(i), style: 'width:' + (q * 100).toFixed(3) + '%' }, etichetta.length > 9 ? etichetta.slice(0, 8) + '…' : etichetta));
      }
      ruota.replaceChildren(...segmenti);
      ago.classList.remove(P + '-ago--su');
      ago.style.transform = 'translateX(0px)';
      descriviSorteggio();
    }

    function descriviSorteggio() {
      if (esaurito()) {
        sorteggioT.replaceChildren(st.finito ? 'Il programma è finito: premi ↺ Ricomincia per scrivere un altro testo.' : 'Basta così: questo giocattolo si ferma a ' + MAX_GENERATI + ' token.');
        return;
      }
      if (!(st.temperatura > 0)) {
        sorteggioT.replaceChildren(h('strong', null, 'Temperatura 0: '), 'niente sorteggio, vince sempre il più probabile.');
      } else if (adattati.length === 1) {
        sorteggioT.replaceChildren('Un solo candidato: il sorteggio può cadere soltanto lì.');
      } else {
        sorteggioT.replaceChildren('Il modello estrae un numero a caso tra 0 e 1: la fascia in cui cade decide il token. Fasce larghe, più probabilità.');
      }
    }

    function disegnaPannello(cresci) {
      disegnaScala();
      disegnaCandidati(cresci);
      evidenziaCorpus(false);
    }

    function aggiornaControlli() {
      const fermo = esaurito();
      bUno.disabled = fermo;
      bGenera.disabled = fermo && !inGenerazione;
      bGenera.textContent = inGenerazione ? '❚❚ Ferma' : '▶ Genera';
      bGenera.classList.toggle('pg-btn--primario', inGenerazione);
      bEsempi.forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === campo.value)));
      bMemoria.forEach((b, i) => b.setAttribute('aria-pressed', String(i + 1 === st.memoria)));
      lettura.textContent = decimale(st.temperatura, 1);
      temp.setAttribute('aria-valuetext', decimale(st.temperatura, 1));
    }

    function tutto(cresci) {
      if (spans.length !== tutti().length || editor.classList.contains(P + '-editor--chip') !== modoChip) disegnaTesto();
      caret.hidden = st.finito;
      calcola();
      disegnaPannello(cresci);
      evidenziaContesto();
      disegnaConteggi();
      aggiornaControlli();
    }

    /* ----- la spiegazione ----- */

    function racconta(...paragrafi) {
      spiega.replaceChildren(...paragrafi.filter((p) => p && (!Array.isArray(p) || p.length)).map((p) => h('p', null, p)));
    }
    function chipSp(t, variante) { const c = chip(t, variante); c.classList.add(P + '-spiega-chip'); return c; }
    function catenaSp(ids, variante) { return catena(ids, variante).map((c) => { c.classList.add(P + '-spiega-chip'); return c; }); }

    // Che cosa guarda il modello adesso (e se ha dovuto accorciare il contesto).
    function fraseContesto() {
      if (esaurito()) return [];
      const falliti = dist.tentativi.filter((t) => !t.visto);
      const parti = [];
      if (falliti.length) {
        const f = falliti[0];
        parti.push(...catenaSp(f.contesto, 'mai'), ' non compare mai nel corpus: il modello accorcia il contesto');
        if (dist.k) parti.push(' a ', ...catenaSp(dist.contesto, 'ctx'), ', che ha visto ' + volte(dist.totale) + '.');
        else parti.push(' fino a zero e usa le frequenze generali di tutti i ' + migliaia(dist.totale) + ' token.');
      } else {
        parti.push('Il modello guarda ', ...catenaSp(dist.contesto, 'ctx'), ': nel corpus compare ' + volte(dist.totale) + '.');
      }
      const primo = adattati[0];
      if (primo) {
        if (adattati.length === 1) parti.push(' Dopo viene sempre ', chipSp(primo), '.');
        else parti.push(' Il più probabile è ', chipSp(primo), ' (' + pct(primo.q) + ').');
      }
      return parti;
    }

    function suggerimenti() {
      const ultimo = st.inizio[st.inizio.length - 1];
      const out = [];
      if (st.inizio.some((t) => t.id < 0)) out.push(['Alcuni caratteri del tuo inizio non sono nel vocabolario (sono segnati in rosa, con il numero «?»): per il modello sono pezzi mai visti.']);
      if (!st.generati.length && ultimo && ultimo.tipo === 'spazio') out.push([h('strong', null, 'Il tuo inizio finisce con uno spazio. '), 'Nel corpus lo spazio sta sempre attaccato alla parola che segue, quindi da solo il modello non l\'ha mai visto: toglilo e le previsioni tornano sensate.']);
      else if (!st.generati.length && ultimo && ultimo.parte) {
        const pezzi = [];
        for (let i = st.inizio.length - 1; i >= 0; i--) { pezzi.unshift(st.inizio[i]); if (st.inizio[i].parte !== 'seguito') break; }
        out.push(['L\'ultima parola non è nel vocabolario: il tokenizzatore l\'ha spezzata in ', ...pezzi.map((t) => chipSp(t)), ' e il modello vede soltanto i pezzi.']);
      }
      return out;
    }

    function raccontaInizio() {
      const n = st.inizio.length;
      const prima = n ? ['Il tuo inizio diventa ' + (n === 1 ? '1 token. ' : n + ' token. ')] : [h('strong', null, 'Inizio vuoto: '), 'il modello parte dal segno ', chipSp(tok.token(ID_INIZIO)), ', l\'inizio del file. '];
      racconta([...prima, ...fraseContesto()], ...suggerimenti());
    }

    /* ----- un passo animato ----- */

    function interrompi() {
      versione++;
      ctx.annulla();
      strato.replaceChildren();
      inGenerazione = false;
    }

    async function giraAgo(u, durata) {
      const w = ruota.clientWidth;
      ago.classList.add(P + '-ago--su');
      if (ctx.riduci) { ago.style.transform = 'translateX(' + (u * w).toFixed(1) + 'px)'; return; }
      await ctx.anima({
        durata: durata,
        easing: 'smooth',
        aggiorna(p) { ago.style.transform = 'translateX(' + (u * w * p).toFixed(1) + 'px)'; },
      });
    }

    function mostraScelta(ev) {
      const i = Math.min(ev.indice, N_RIGHE - 1);
      righe[i].btn.classList.add(P + '-cand--scelto');
      const seg = ruota.querySelector('[data-i="' + i + '"]');
      if (seg) seg.classList.add(P + '-seg--scelto');
      if (ev.u != null) {
        sorteggioT.replaceChildren('Estratto ', h('strong', null, decimale(ev.u, 2)), ': cade nella fascia di ', chipSp(ev.token, 'ia'), '.');
      } else if (ev.manuale) {
        sorteggioT.replaceChildren('Niente sorteggio: hai scelto tu ', chipSp(ev.token, 'ia'), '.');
      } else {
        sorteggioT.replaceChildren(h('strong', null, 'Temperatura 0: '), 'vince il più probabile, ', chipSp(ev.token, 'ia'), '.');
      }
    }

    async function vola(daEl, t, durata) {
      if (ctx.riduci || !daEl || !caret.isConnected || caret.hidden) return;
      scorriInFondo();
      const r0 = radice.getBoundingClientRect();
      const a = daEl.getBoundingClientRect();
      const b = caret.getBoundingClientRect();
      if (!a.width || !b.height) return;
      const volante = chip(t, 'ia');
      volante.classList.add(P + '-volo');
      strato.append(volante);
      const x0 = a.left - r0.left;
      const y0 = a.top - r0.top;
      const x1 = b.left - r0.left;
      const y1 = b.top - r0.top + (b.height - a.height) / 2;
      const arco = Math.min(80, 24 + Math.abs(x1 - x0) * 0.18);
      try {
        await ctx.anima({
          durata: durata,
          easing: 'smooth',
          aggiorna(p) {
            const x = x0 + (x1 - x0) * p;
            const y = y0 + (y1 - y0) * p - Math.sin(Math.PI * p) * arco;
            volante.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + (1 + 0.08 * Math.sin(Math.PI * p)).toFixed(3) + ')';
          },
        });
      } finally {
        volante.remove();
      }
    }

    // Passo singolo: ritmo lento, da guardare. Con ▶ Genera (veloce) il ritmo accelera dopo i primi
    // token, come un flusso; i token obbligati (un solo candidato) non hanno sorteggio e volano più svelti.
    async function mostraPasso(ev, veloce, n) {
      if (!ev.token) return;
      const i = Math.min(ev.indice, N_RIGHE - 1);
      const unico = adattati.length === 1;
      const ritmo = veloce ? Math.max(0.42, 1 - (n || 0) * 0.1) : 1;
      if (ev.u != null && !unico) await giraAgo(ev.u, veloce ? Math.round(260 * ritmo) : 720);
      mostraScelta(ev);
      await ctx.attendi(veloce ? 40 : 280);
      await vola(righe[i].tok.firstChild || righe[i].tok, ev.token, veloce ? Math.round((unico ? 190 : 320) * ritmo) : 600);
    }

    // Il token atterra nel testo e il pannello si prepara al passo successivo.
    function dopoPasso(ev, veloce) {
      if (spans.length === tutti().length - 1 && editor.classList.contains(P + '-editor--chip') === modoChip) {
        aggiungiSpan(ev.token, true);
        caret.hidden = st.finito;
        scorriInFondo();
      } else disegnaTesto();
      calcola();
      disegnaPannello(!veloce);
      evidenziaContesto();
      disegnaConteggi();
      aggiornaControlli();
      const riga = rigaCompletata(ev);
      if (riga && !completato) { completato = true; ctx.completa(); }
      if (veloce) return riga;
      raccontaPasso(ev, riga);
      annunciaPasso(ev);
      return riga;
    }

    // Se il token è un a capo, restituisce la riga appena chiusa (con almeno un pezzo scritto dal modello).
    function rigaCompletata(ev) {
      if (!ev.token || ev.token.tipo !== 'a-capo') return null;
      const ts = tutti();
      let i = ts.length - 2;
      while (i >= 0 && ts[i].tipo !== 'a-capo') i--;
      const pezzi = ts.slice(i + 1, ts.length - 1);
      if (!pezzi.some((t) => t.generato && t.tipo !== 'spazio' && t.tipo !== 'rientro')) return null;
      const testo = pezzi.map((t) => t.testo).join('');
      return { testo: testo, nota: M.righe.has(testo) };
    }

    function fraseRiga(riga) {
      if (!riga) return null;
      const codice = h('code', null, riga.testo.trim());
      if (riga.nota) return [h('strong', null, 'Riga finita: '), codice, ' è identica a una riga del corpus' + (st.memoria === 3 ? ': con 3 token di contesto il modello tende a ricopiare.' : '.')];
      return [h('strong', null, 'Riga finita: '), codice, ' non compare nel corpus: il modello l\'ha composta unendo pezzi di righe diverse. Funzionerebbe? Il modello non lo sa.'];
    }

    // Il testo dall'inizio della riga che contiene il token numero «indice» fino in fondo.
    function testoDaRiga(indice) {
      const ts = tutti();
      let i = Math.min(indice, ts.length) - 1;
      while (i >= 0 && ts[i].tipo !== 'a-capo') i--;
      return tok.unisci(ts.slice(i + 1));
    }

    // Vero se quelle righe compaiono, una dopo l'altra e dall'inizio di una riga, nel corpus.
    function righeInFila(testo) { return ('\n' + CORPUS[0]).indexOf('\n' + testo) !== -1; }

    // Bilancio di un giro di ▶ Genera: quante righe sono copie del corpus e quante sono nuove.
    function fraseGiro(righeGiro, testoGiro) {
      if (!righeGiro.length) return null;
      const nuove = righeGiro.filter((r) => !r.nota);
      const n = righeGiro.length;
      const parti = [n === 1 ? 'Il modello ha completato 1 riga: ' : 'Il modello ha completato ' + n + ' righe: '];
      if (!nuove.length) parti.push(n === 1 ? 'è identica a una riga del corpus.' : 'sono tutte identiche a righe del corpus.');
      else if (nuove.length === n) parti.push(n === 1 ? 'non compare nel corpus.' : 'nessuna compare nel corpus.');
      else parti.push((n - nuove.length) + ' identiche a righe del corpus, ' + nuove.length + (nuove.length === 1 ? ' nuova.' : ' nuove.'));
      if (nuove.length) parti.push(' Una riga nuova, come ', h('code', null, nuove[0].testo.trim()), ', è un collage di pezzi visti altrove: il modello non sa se funziona.');
      else if (n > 1 && !righeInFila(testoGiro)) parti.push(' Però l\'insieme è nuovo: righe vere, cucite in un ordine che nel corpus non c\'è. Il modello non controlla se il programma ha senso.');
      else if (st.memoria === 3) parti.push(' Con 3 token di contesto il modello tende a ricopiare: prova la memoria 2 o una temperatura più alta.');
      return parti;
    }

    function raccontaPasso(ev, riga) {
      let prima;
      if (ev.token.id === ID_FINE) {
        racconta([h('strong', null, 'Fine. '), 'Il modello ha scelto ', chipSp(ev.token, 'ia'), ': nel corpus, a questo punto, il file finiva. Premi ↺ Ricomincia per scrivere un altro testo.']);
        return;
      }
      const c = ev.dist.candidati[ev.indice];
      const q = conTemperatura(ev.dist.candidati, st.temperatura)[ev.indice];
      if (ev.manuale) prima = ['Hai scelto tu ', chipSp(ev.token, 'ia'), ' (nel corpus ' + volte(c.conteggio) + ' su ' + ev.dist.totale + '). Anche un token poco probabile, una volta scritto, diventa contesto per i successivi.'];
      else if (ev.u == null) {
        const pari = ev.dist.candidati.filter((x) => x.conteggio === c.conteggio).length > 1;
        prima = ['Temperatura 0: il modello scrive il più probabile, ', chipSp(ev.token, 'ia'), ' (' + volte(c.conteggio) + ' su ' + ev.dist.totale + ')' + (pari ? ', a pari merito con altri: a parità vince quello visto per primo nel corpus.' : '.')];
      } else if (ev.dist.candidati.length === 1) prima = ['Dopo quel contesto, nel corpus viene sempre ', chipSp(ev.token, 'ia'), ': probabilità 100%, il sorteggio non può dare altro.'];
      else prima = ['Estratto ' + decimale(ev.u, 2) + ': cade nella fascia di ', chipSp(ev.token, 'ia'), ', che aveva il ' + pct(q.q) + ' di probabilità (' + volte(c.conteggio) + ' su ' + ev.dist.totale + ').'];
      const fr = fraseRiga(riga);
      if (st.generati.length >= MAX_GENERATI) racconta(prima, fr, ['Basta così: questo giocattolo si ferma a ' + MAX_GENERATI + ' token. Premi ↺ Ricomincia.']);
      else racconta(prima, fr || fraseContesto());
    }

    function annunciaPasso(ev) {
      if (ev.token.id === ID_FINE) { ctx.annuncia('Il modello ha scelto la fine del file.'); return; }
      const c = ev.dist.candidati[ev.indice];
      const q = conTemperatura(ev.dist.candidati, st.temperatura)[ev.indice];
      const quanto = ev.manuale ? 'scelto da te, nel corpus ' + volte(c.conteggio) + ' su ' + ev.dist.totale : 'probabilità ' + pct(q.q).replace('%', ' per cento');
      ctx.annuncia('Aggiunto ' + parlato(ev.token) + ', ' + quanto + '.' + (adattati[0] ? ' Ora il più probabile è ' + parlato(adattati[0]) + '.' : ''));
    }

    async function esegui(ev, veloce, v) {
      try {
        await mostraPasso(ev, veloce);
      } catch (err) {
        if (!ctx.annullato(err)) throw err;
        return;
      }
      if (v === versione) dopoPasso(ev, veloce);
    }

    function unToken() {
      if (esaurito()) return;
      interrompi();
      tutto(false);
      const v = versione;
      const ev = passo(st);
      return esegui(ev, false, v);
    }

    function sceltaTua(i) {
      if (esaurito() || i >= N_RIGHE - 1 || !adattati[i]) return;
      interrompi();
      tutto(false);
      const v = versione;
      const ev = passo(st, i);
      ev.manuale = true;
      return esegui(ev, false, v);
    }

    async function alternaGenera() {
      if (inGenerazione) {
        interrompi();
        tutto(false);
        racconta(['Generazione fermata. ', h('strong', null, 'Un token'), ' procede a un passo alla volta; ', h('strong', null, '▶ Genera'), ' riprende.'], fraseContesto());
        ctx.annuncia('Generazione fermata.');
        return;
      }
      if (esaurito()) return;
      interrompi();
      tutto(false);
      inGenerazione = true;
      aggiornaControlli();
      const v = versione;
      let aCapo = 0;
      const righeGiro = [];
      const primoDelGiro = tutti().length;
      racconta(['Il modello scrive un token alla volta: guarda il contesto, sorteggia, aggiunge e ricomincia. Si ferma dopo ' + RIGHE_PER_GIRO + ' a capo.']);
      try {
        for (let n = 0; !esaurito(); n++) {
          const ev = passo(st);
          await mostraPasso(ev, true, n);
          if (v !== versione) return;
          const riga = dopoPasso(ev, true);
          if (riga) righeGiro.push(riga);
          if (ev.token && ev.token.tipo === 'a-capo' && ++aCapo >= RIGHE_PER_GIRO) break;
          await ctx.attendi(ctx.riduci ? 200 : 40);
        }
      } catch (err) {
        if (!ctx.annullato(err)) throw err;
        return;
      }
      if (v !== versione) return;
      inGenerazione = false;
      aggiornaControlli();
      const fine = st.finito
        ? [h('strong', null, 'Fine. '), 'Il modello ha scelto ', chipSp(tok.token(ID_FINE), 'ia'), ': nel corpus, a quel punto, il file finiva.']
        : st.generati.length >= MAX_GENERATI
          ? ['Basta così: questo giocattolo si ferma a ' + MAX_GENERATI + ' token.']
          : [h('strong', null, 'Fatto, un token alla volta. '), h('strong', null, '▶ Genera'), ' continua; ', h('strong', null, '↺ Ricomincia'), ' riparte con lo stesso seme e riscrive lo stesso testo.'];
      racconta(fine, fraseGiro(righeGiro, testoDaRiga(primoDelGiro)));
      ctx.annuncia(st.finito ? 'Il modello ha scelto la fine del file.' : 'Generazione finita: ' + tok.unisci(st.generati).split('\n').filter((r) => r.trim()).length + ' righe scritte dal modello.');
    }

    function ricomincia(silenzioso) {
      interrompi();
      st.generati = [];
      st.finito = false;
      st.casuale = generatore(st.seme);
      disegnaTesto();
      tutto(true);
      if (!silenzioso) {
        racconta(['Si ricomincia dal tuo inizio, con il seme ' + st.seme + '. Con lo stesso inizio, lo stesso seme e le stesse manopole, i sorteggi danno gli stessi numeri: il testo si ripete identico.'], fraseContesto());
        ctx.annuncia('Si ricomincia dal tuo inizio.');
      }
    }

    function nuovoInizio(testo) {
      st.inizio = tok.dividi(testo);
      ricomincia(true);
      raccontaInizio();
    }

    function cambiaTemperatura(t, annuncia) {
      st.temperatura = Math.round(t * 10) / 10;
      adattati = conTemperatura(dist.candidati, st.temperatura);
      aggiornaBarre(false);
      aggiornaControlli();
      const t1 = decimale(st.temperatura, 1);
      const primo = adattati[0];
      let frase;
      if (!(st.temperatura > 0)) frase = [h('strong', null, 'Temperatura 0: '), 'vince sempre il più probabile. Il testo diventa prevedibile e spesso ripetitivo.'];
      else if (st.temperatura < 1) frase = [h('strong', null, 'Temperatura ' + t1 + ': '), 'i token già probabili lo diventano ancora di più; quelli rari quasi spariscono.'];
      else if (st.temperatura === 1) frase = [h('strong', null, 'Temperatura 1: '), 'le probabilità sono esattamente i conteggi del corpus divisi per il totale.'];
      else frase = [h('strong', null, 'Temperatura ' + t1 + ': '), 'le probabilità si avvicinano tra loro e i token rari escono più spesso. Più varietà, più errori.'];
      if (primo && adattati.length > 1) frase.push(' Ora ', chipSp(primo), ' ha il ' + pct(primo.q) + '.');
      racconta(frase);
      if (annuncia) {
        clearTimeout(annuncioTemp);
        annuncioTemp = setTimeout(() => ctx.annuncia('Temperatura ' + t1 + (primo ? '. ' + parlato(primo) + ' al ' + pct(primo.q).replace('%', ' per cento') : '')), 250);
      }
    }

    function cambiaMemoria(k) {
      if (k === st.memoria) return;
      const eraInCorsa = inGenerazione;
      interrompi();
      st.memoria = k;
      tutto(true);
      const testi = {
        1: 'il modello guarda soltanto l\'ultimo token. Prova ▶ Genera: viene fuori un collage di pezzi, spesso senza senso.',
        2: 'il modello guarda gli ultimi 2 token. Il testo varia di più, ma a volte perde il filo.',
        3: 'il modello guarda gli ultimi 3 token: sembra più bravo, ma spesso ricopia pezzi interi del corpus.',
      };
      racconta([h('strong', null, 'Memoria ' + k + ': '), testi[k]], eraInCorsa ? 'Generazione fermata: premi ▶ Genera per riprendere.' : null, fraseContesto());
      ctx.annuncia('Memoria ' + k + ' token. ' + adattati.length + (adattati.length === 1 ? ' candidato.' : ' candidati.'));
    }

    function semeValido(testo) {
      const s = String(testo).trim();
      if (!/^\d{1,4}$/.test(s)) return null;
      const n = Number(s);
      return n >= 1 && n <= 9999 ? n : null;
    }
    function mostraErroreSeme(msg) {
      erroreSeme.textContent = msg;
      erroreSeme.hidden = !msg;
      if (msg) semeCampo.setAttribute('aria-invalid', 'true'); else semeCampo.removeAttribute('aria-invalid');
    }
    function impostaSeme(testo) {
      const n = semeValido(testo);
      if (n == null) {
        mostraErroreSeme('Il seme è un numero intero da 1 a 9999, per esempio 1948.');
        return;
      }
      mostraErroreSeme('');
      if (n === st.seme && !st.generati.length) return;
      st.seme = n;
      semeCampo.value = String(n);
      ricomincia(true);
      racconta(['Seme ' + n + '. Il seme fissa la sequenza dei numeri estratti: con lo stesso seme, lo stesso inizio e le stesse manopole il testo è sempre identico.'], fraseContesto());
      ctx.annuncia('Seme ' + n + '.');
    }
    function nuovoSeme() {
      let n = st.seme;
      while (n === st.seme) n = 1 + Math.floor(Math.random() * 9999);
      st.seme = n;
      semeCampo.value = String(n);
      mostraErroreSeme('');
      ricomincia(true);
      racconta(['Nuovo seme: ' + n + '. Si riparte dal tuo inizio, con un\'altra sequenza di numeri estratti: premi ', h('strong', null, '▶ Genera'), ' e confronta il testo con quello di prima.'], fraseContesto());
      ctx.annuncia('Nuovo seme ' + n + '.');
    }

    function alternaChip() {
      modoChip = !modoChip;
      bChip.setAttribute('aria-pressed', String(modoChip));
      legenda.hidden = !modoChip;
      disegnaTesto();
      evidenziaContesto();
      racconta(modoChip
        ? ['Ecco i token: ogni tassello ha il suo numero nel vocabolario. Il modello non vede lettere né parole: per lui il tuo inizio è la fila di numeri ', h('code', null, st.inizio.map((t) => (t.id < 0 ? '?' : t.id)).join(' ') || '(vuota)'), '.']
        : ['Di nuovo il testo come lo leggiamo noi. Per il modello, però, resta una fila di numeri.']);
    }

    /* ----- il corpus, con le volte in cui compare il contesto ----- */

    function costruisciCorpus() {
      if (corpusSpans) return;
      corpusSpans = [];
      let n = 0;
      let cod = null;
      const riga = () => {
        n++;
        cod = h('span', { class: P + '-cod' });
        corpusCorpo.append(h('div', { class: P + '-riga' }, h('span', { class: P + '-num', 'aria-hidden': 'true' }, String(n)), cod));
      };
      riga();
      const ts = tok.dividi(CORPUS[0]);
      ts.forEach((t, i) => {
        const sp = t.tipo === 'a-capo'
          ? h('span', { class: P + '-t' }, h('span', { class: P + '-acapo', 'aria-hidden': 'true' }, '⏎'))
          : h('span', { class: P + '-t' }, t.testo);
        cod.append(sp);
        corpusSpans.push(sp);
        if (t.tipo === 'a-capo' && i < ts.length - 1) riga();
      });
    }

    function evidenziaCorpus(scorri) {
      if (!dettagli.open || !corpusSpans || !dist) return;
      corpusEvid.forEach((s) => s.classList.remove(P + '-t--ctx', P + '-t--dopo'));
      corpusEvid = [];
      const c = dist.contesto;
      const k = c.length;
      if (!k) {
        corpusInfo.replaceChildren('Nessun contesto: il modello usa le frequenze di tutti i token del corpus.');
        return;
      }
      const seq = M.sequenze[0];
      let primo = null;
      let n = 0;
      for (let i = k; i < seq.length; i++) {
        let uguale = true;
        for (let j = 0; j < k; j++) if (seq[i - k + j] !== c[j]) { uguale = false; break; }
        if (!uguale) continue;
        n++;
        for (let j = i - k; j < i; j++) {
          const sp = corpusSpans[j - 1];
          if (sp) { sp.classList.add(P + '-t--ctx'); corpusEvid.push(sp); if (!primo) primo = sp; }
        }
        const dopo = corpusSpans[i - 1];
        if (dopo) { dopo.classList.add(P + '-t--dopo'); corpusEvid.push(dopo); }
      }
      corpusInfo.replaceChildren('Il contesto ', ...catenaSp(c, 'ctx'), ' compare ' + volte(n) + ' (in giallo); in azzurro il token che è venuto dopo. Sono proprio i conteggi del pannello.');
      if (scorri !== false && primo) corpusCorpo.scrollTop = Math.max(0, primo.offsetTop - 40);
    }

    /* ----- avvio ----- */

    tutto(true);
    racconta(['Il modello ha letto un file di ' + M.nRighe + ' righe di Python. Per continuare il tuo inizio guarda gli ultimi token, cerca nel corpus che cosa è venuto dopo e trasforma i conteggi in probabilità.'],
      [...fraseContesto(), ' Premi ', h('strong', null, 'Un token'), ' e guarda il ciclo da vicino, oppure scegli tu un candidato.']);

    return {
      pausa() {},
      riprendi() {},
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('prossimo-token', { titolo: 'Il prossimo token', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
