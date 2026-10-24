/*
 * Laboratorio «Git, la macchina del tempo del codice» · capitolo 12, Software ovunque.
 *
 * Un piccolo Git simulato in memoria: commit, branch, switch, merge (fast-forward oppure
 * con un commit a due genitori), annulla, viaggio nel tempo fra le versioni di ricetta.txt
 * e la storia guidata «Due persone, un progetto».
 *
 * I conflitti di merge qui non si trattano, e il laboratorio fa in modo che non capitino mai:
 * la ricetta è divisa in zone separate da intestazioni che nessun commit tocca, e ogni zona
 * cambia lungo una sola linea di discendenza. Il vero git unisce senza conflitti due modifiche
 * separate da almeno una riga invariata: test/git.test.js lo verifica rifacendo le stesse
 * operazioni con git e confrontando il file riga per riga.
 *
 * La logica (Logica) è pura, senza DOM: si prova in Node.
 */
(function (root) {
  'use strict';

  /* ======================= Modello ======================= */

  const MAX_COMMIT = 24;
  const MAX_BRANCH = 4;
  const MAX_ANNULLA = 60;
  const MAX_LOG = 80;

  // Le righe possibili di ricetta.txt, nell'ordine del file. Senza `zona`: intestazione fissa.
  const RIGHE = [
    { id: 'titolo', zona: 'T' },
    { id: 'nota-titolo', zona: 'T' },
    { id: 'dosi', zona: 'T' },
    { id: 'h-impasto' },
    { id: 'farina', zona: 'I' },
    { id: 'sale', zona: 'I' },
    { id: 'riposo', zona: 'I' },
    { id: 'stesura', zona: 'I' },
    { id: 'h-salsa' },
    { id: 'pomodoro', zona: 'S' },
    { id: 'origano', zona: 'S' },
    { id: 'olio-salsa', zona: 'S' },
    { id: 'sale-salsa', zona: 'S' },
    { id: 'h-sopra' },
    { id: 'mozzarella', zona: 'C' },
    { id: 'basilico', zona: 'C' },
    { id: 'olio-crudo', zona: 'C' },
    { id: 'grana', zona: 'C' },
    { id: 'h-cottura' },
    { id: 'preriscalda', zona: 'K' },
    { id: 'forno', zona: 'K' },
    { id: 'pala', zona: 'K' },
    { id: 'servire', zona: 'K' },
  ];

  // I due commit con cui comincia il repository.
  const INIZIALI = [
    {
      autore: 'Anna',
      messaggio: 'Prima versione della ricetta',
      righe: {
        titolo: 'PIZZA MARGHERITA',
        dosi: 'Per 2 pizze',
        'h-impasto': 'IMPASTO',
        farina: '300 g di farina, 180 ml di acqua',
        sale: '6 g di sale, 2 g di lievito di birra',
        'h-salsa': 'SALSA',
        pomodoro: '200 g di passata di pomodoro',
        'olio-salsa': 'un filo d\'olio',
        'h-sopra': 'SOPRA',
        mozzarella: '250 g di mozzarella',
      },
    },
    {
      autore: 'Luca',
      messaggio: 'Aggiunge basilico e cottura',
      righe: { basilico: 'basilico fresco', 'h-cottura': 'COTTURA', forno: '10 minuti nel forno a 250 °C' },
    },
  ];

  // Le piccole modifiche dei commit automatici: ognuna cambia o aggiunge una riga.
  const MODIFICHE = [
    { id: 'k-pietra', riga: 'forno', t: '8 minuti sulla pietra refrattaria a 250 °C', msg: 'Cottura sulla pietra' },
    { id: 'k-scalda', riga: 'preriscalda', t: 'scalda il forno per 30 minuti', msg: 'Ricorda di scaldare il forno' },
    { id: 'k-pala', riga: 'pala', t: 'inforna con la pala, con un colpo secco', msg: 'Come infornare' },
    { id: 'k-servi', riga: 'servire', t: 'servi subito, tagliata in 6 spicchi', msg: 'Come servire' },
    { id: 't-dosi', riga: 'dosi', t: 'Per 4 pizze (raddoppia le dosi)', msg: 'Dosi per 4 pizze' },
    { id: 't-titolo', riga: 'titolo', t: 'PIZZA MARGHERITA DI CASA', msg: 'Titolo più caldo' },
    { id: 't-nota', riga: 'nota-titolo', t: 'ricetta di Anna e Luca', msg: 'Firma sotto il titolo' },
    { id: 'i-acqua', riga: 'farina', t: '300 g di farina, 195 ml di acqua', msg: 'Impasto più idratato' },
    { id: 'i-riposo', riga: 'riposo', t: 'riposo: 8 ore in frigo, poi 2 a temperatura ambiente', msg: 'Aggiunge il riposo dell\'impasto' },
    { id: 'i-lievito', riga: 'sale', t: '6 g di sale, 1 g di lievito di birra', msg: 'Meno lievito, riposo più lungo' },
    { id: 'i-stesura', riga: 'stesura', t: 'stendi a mano, senza mattarello', msg: 'Stesura a mano' },
    { id: 's-pomodoro', riga: 'pomodoro', t: '200 g di pelati San Marzano, schiacciati a mano', msg: 'Salsa con pelati San Marzano' },
    { id: 's-origano', riga: 'origano', t: 'un pizzico di origano', msg: 'Aggiunge l\'origano' },
    { id: 's-sale', riga: 'sale-salsa', t: 'un pizzico di sale', msg: 'Sala la salsa' },
    { id: 's-olio', riga: 'olio-salsa', t: 'un cucchiaio d\'olio extravergine', msg: 'Più olio nella salsa' },
    { id: 'c-fiordilatte', riga: 'mozzarella', t: '250 g di fiordilatte a cubetti, ben scolato', msg: 'Fiordilatte ben scolato' },
    { id: 'c-basilico', riga: 'basilico', t: 'basilico fresco, solo dopo la cottura', msg: 'Basilico dopo la cottura' },
    { id: 'c-olio', riga: 'olio-crudo', t: 'un filo d\'olio extravergine a crudo', msg: 'Olio a crudo' },
    { id: 'c-grana', riga: 'grana', t: 'una spolverata di grana (facoltativa)', msg: 'Grana facoltativo' },
  ];

  const ZONE = ['T', 'I', 'S', 'C', 'K'];
  const SULLA_ZONA = { T: 'sul titolo', I: 'sull\'impasto', S: 'sulla salsa', C: 'sul condimento', K: 'sulla cottura' };
  // Zone preferite da ogni corsia: branch diversi cambiano di solito parti diverse della ricetta.
  const PREFERENZE = [
    ['K', 'T', 'I', 'C', 'S'],
    ['S', 'C', 'T', 'K', 'I'],
    ['C', 'I', 'K', 'S', 'T'],
    ['T', 'K', 'S', 'I', 'C'],
  ];
  const NOMI_SUGGERITI = ['nuova-salsa', 'extra-mozzarella', 'nuovo-titolo', 'forno-a-legna', 'impasto-integrale', 'pizza-bianca'];
  const SPUNTI = [
    'assaggia e annota com\'è venuta',
    'cambia una cosa sola per volta',
    'segna il tempo esatto di cottura',
    'chiedi un parere a chi la mangia',
    'confronta con la versione precedente',
    'fotografala prima di tagliarla',
  ];

  // La storia guidata «Due persone, un progetto» (i testi sono nell'interfaccia).
  const STORIA = [
    { azione: { tipo: 'reset' } },
    { azione: { tipo: 'branch', nome: 'nuova-salsa', autore: 'Anna' } },
    { azione: { tipo: 'commit', modifica: 's-pomodoro', autore: 'Anna' } },
    { azione: { tipo: 'commit', modifica: 's-origano', autore: 'Anna' } },
    { azione: { tipo: 'switch', nome: 'main', autore: 'Luca' } },
    { azione: { tipo: 'commit', modifica: 'i-acqua', autore: 'Luca' } },
    { azione: { tipo: 'merge', nome: 'nuova-salsa', autore: 'Luca' } },
    { azione: null },
  ];

  const POSIZIONE = new Map(RIGHE.map((r, i) => [r.id, i]));
  const ZONA_RIGA = new Map(RIGHE.filter((r) => r.zona).map((r) => [r.id, r.zona]));
  const FINE_ZONA = {};
  RIGHE.forEach((r, i) => { if (r.zona) FINE_ZONA[r.zona] = i; });
  const NOTA = /^nota-([A-Z])-(\d+)$/;

  function zonaDi(idRiga) {
    if (ZONA_RIGA.has(idRiga)) return ZONA_RIGA.get(idRiga);
    const m = NOTA.exec(idRiga);
    return m ? m[1] : null;
  }

  // Posizione di una riga nel file: gli appunti generati stanno in fondo alla loro zona.
  function chiave(idRiga) {
    if (POSIZIONE.has(idRiga)) return POSIZIONE.get(idRiga);
    const m = NOTA.exec(idRiga);
    if (m && m[1] in FINE_ZONA) return FINE_ZONA[m[1]] + Number(m[2]) / 1000;
    return 1e6;
  }

  // Impronta di 7 cifre esadecimali (git usa SHA-1 su 40 cifre: qui basta una versione corta).
  function impronta(testo) {
    let a = 0x811c9dc5;
    let b = 0x9e3779b9;
    for (let i = 0; i < testo.length; i++) {
      const c = testo.charCodeAt(i);
      a = Math.imul(a ^ c, 0x01000193);
      b = Math.imul(b ^ c, 0x85ebca6b);
      b ^= b >>> 13;
    }
    a ^= a >>> 16; a = Math.imul(a, 0x7feb352d);
    a ^= a >>> 15; a = Math.imul(a, 0x846ca68b);
    a ^= a >>> 16;
    return ((a ^ (b >>> 3)) >>> 0).toString(16).padStart(8, '0').slice(0, 7);
  }

  function congela(snap) {
    for (const k of Object.keys(snap)) Object.freeze(snap[k]);
    return Object.freeze(snap);
  }

  // Una fotografia del file: { idRiga: { t: testo o null, v: indice del commit che l'ha scritta } }.
  function righe(snap) {
    snap = snap || {};
    return Object.keys(snap)
      .filter((k) => snap[k] && snap[k].t != null)
      .sort((x, y) => chiave(x) - chiave(y))
      .map((k) => ({ id: k, t: snap[k].t }));
  }

  function testo(snap) {
    return righe(snap).map((r) => r.t + '\n').join('');
  }

  // Differenze riga per riga, nell'ordine del file: ' ' uguale, '-' tolta, '+' aggiunta.
  function differenze(prima, dopo) {
    prima = prima || {};
    dopo = dopo || {};
    const ids = [...new Set([...Object.keys(prima), ...Object.keys(dopo)])].sort((x, y) => chiave(x) - chiave(y));
    const out = [];
    let num = 0;
    for (const id of ids) {
      const a = prima[id] && prima[id].t != null ? prima[id].t : null;
      const b = dopo[id] && dopo[id].t != null ? dopo[id].t : null;
      if (a == null && b == null) continue;
      if (a === b) { out.push({ segno: ' ', id: id, t: b, num: ++num }); continue; }
      if (a != null) out.push({ segno: '-', id: id, t: a, num: null });
      if (b != null) out.push({ segno: '+', id: id, t: b, num: ++num });
    }
    return out;
  }

  function conta(diff) {
    return { piu: diff.filter((d) => d.segno === '+').length, meno: diff.filter((d) => d.segno === '-').length };
  }

  function descriviConta(st) {
    const parti = [];
    if (st.piu) parti.push(st.piu + (st.piu === 1 ? ' riga aggiunta' : ' righe aggiunte'));
    if (st.meno) parti.push(st.meno + (parti.length ? (st.meno === 1 ? ' tolta' : ' tolte') : (st.meno === 1 ? ' riga tolta' : ' righe tolte')));
    return 'ricetta.txt: ' + (parti.join(', ') || 'nessuna differenza');
  }

  /* ---------- il grafo dei commit ---------- */

  function tip(repo, ramo) { return repo.branch[ramo || repo.head]; }

  function antenati(repo, id) {
    const visti = new Set();
    const coda = [id];
    while (coda.length) {
      const x = coda.pop();
      if (!x || visti.has(x)) continue;
      visti.add(x);
      const c = repo.commit[x];
      if (c) for (const g of c.genitori) coda.push(g);
    }
    return visti;
  }

  // Vero se `a` è antenato di `b` (o è lo stesso commit).
  function eAntenato(repo, a, b) { return antenati(repo, b).has(a); }

  function antenatiComuni(repo, a, b) {
    const A = antenati(repo, a);
    return [...antenati(repo, b)].filter((x) => A.has(x));
  }

  // Gli antenati comuni migliori: quelli che non sono antenati di un altro antenato comune.
  function basiMigliori(repo, a, b) {
    const comuni = antenatiComuni(repo, a, b);
    return comuni.filter((x) => !comuni.some((y) => y !== x && eAntenato(repo, x, y)));
  }

  // La base del merge: fra le basi migliori, la più recente.
  function baseDiMerge(repo, a, b) {
    let best = null;
    for (const x of basiMigliori(repo, a, b)) if (best == null || repo.commit[x].indice > repo.commit[best].indice) best = x;
    return best;
  }

  function aggiungiCommit(repo, dati) {
    const indice = repo.ordine.length;
    const corpo = [dati.genitori.join(','), dati.autore, dati.messaggio, indice, testo(dati.snapshot)].join('\n');
    let id = impronta(corpo);
    let sale = 0;
    while (repo.commit[id]) id = impronta(corpo + '#' + (++sale));
    const c = Object.freeze({
      id: id,
      genitori: Object.freeze(dati.genitori.slice()),
      messaggio: dati.messaggio,
      autore: dati.autore,
      ramo: repo.head,
      corsia: repo.corsie[repo.head],
      indice: indice,
      snapshot: dati.snapshot,
      modifica: dati.modifica || null,
      tipo: dati.tipo,
    });
    return {
      c: c,
      repo: Object.assign({}, repo, {
        commit: Object.assign({}, repo.commit, { [id]: c }),
        ordine: repo.ordine.concat(id),
        branch: Object.assign({}, repo.branch, { [repo.head]: id }),
      }),
    };
  }

  function crea() {
    let repo = { commit: {}, ordine: [], branch: {}, ordineBranch: ['main'], corsie: { main: 0 }, head: 'main', tocchi: {}, usate: [], note: 0 };
    let snap = {};
    INIZIALI.forEach((ini, i) => {
      snap = Object.assign({}, snap);
      for (const k of Object.keys(ini.righe)) snap[k] = { t: ini.righe[k], v: i };
      const r = aggiungiCommit(repo, { genitori: i ? [repo.branch.main] : [], autore: ini.autore, messaggio: ini.messaggio, snapshot: congela(snap), tipo: 'iniziale' });
      repo = r.repo;
    });
    return repo;
  }

  // Una zona si può cambiare da HEAD se l'ultimo commit che l'ha toccata è un suo antenato.
  function zonaLibera(repo, zona, H) {
    const t = repo.tocchi[zona];
    return !t || eAntenato(repo, t, H || tip(repo));
  }

  // Sceglie la modifica del prossimo commit automatico. Prima le zone che solo questa linea ha
  // già toccato (cambiarle non toglie nulla agli altri branch), poi quelle intatte, infine
  // quelle condivise con altri branch; a parità, l'ordine preferito dalla corsia.
  function prossimaModifica(repo) {
    const H = tip(repo);
    const pref = PREFERENZE[(repo.corsie[repo.head] || 0) % PREFERENZE.length];
    const altri = repo.ordineBranch.filter((b) => b !== repo.head).map((b) => repo.branch[b]);
    const livello = (z) => {
      const t = repo.tocchi[z];
      if (!t) return 1;
      return altri.some((x) => eAntenato(repo, t, x)) ? 2 : 0;
    };
    const libere = pref.filter((z) => zonaLibera(repo, z, H)).sort((a, b) => livello(a) - livello(b));
    for (const z of libere) {
      const m = MODIFICHE.find((x) => zonaDi(x.riga) === z && repo.usate.indexOf(x.id) < 0);
      if (m) return m;
    }
    if (!libere.length) return null;
    const n = repo.note + 1;
    const z = libere[0];
    return { id: 'nota-' + n, riga: 'nota-' + z + '-' + n, t: 'appunto ' + n + ': ' + SPUNTI[(n - 1) % SPUNTI.length], msg: 'Appunto ' + n + ' ' + SULLA_ZONA[z], generata: true };
  }

  function limiteCommit(repo) {
    return repo.ordine.length >= MAX_COMMIT
      ? 'Hai raggiunto il limite di ' + MAX_COMMIT + ' commit di questo laboratorio: premi «Da capo» per ricominciare.'
      : null;
  }

  function commit(repo, opz) {
    opz = opz || {};
    const lim = limiteCommit(repo);
    if (lim) return { repo: repo, errore: lim };
    const H = tip(repo);
    let m;
    if (opz.modifica) {
      m = MODIFICHE.find((x) => x.id === opz.modifica);
      if (!m) return { repo: repo, errore: 'Modifica sconosciuta: ' + opz.modifica + '.' };
      if (repo.usate.indexOf(m.id) >= 0) return { repo: repo, errore: 'Questa modifica è già nella storia.' };
      if (!zonaLibera(repo, zonaDi(m.riga), H)) return { repo: repo, errore: 'Questa parte della ricetta è già cambiata su un altro branch: prima fai un merge.' };
    } else {
      m = prossimaModifica(repo);
    }
    if (!m) {
      return { repo: repo, errore: 'Su questo branch ogni parte della ricetta è già cambiata su un altro branch non ancora unito. Per evitare conflitti, che qui non trattiamo, fai prima un merge.' };
    }
    const prima = repo.commit[H].snapshot;
    const indice = repo.ordine.length;
    const snap = congela(Object.assign({}, prima, { [m.riga]: { t: m.t, v: indice } }));
    const r = aggiungiCommit(repo, { genitori: [H], autore: opz.autore || 'Tu', messaggio: m.msg, snapshot: snap, modifica: m.id, tipo: 'commit' });
    const zona = zonaDi(m.riga);
    const nuovo = Object.assign({}, r.repo, {
      tocchi: Object.assign({}, repo.tocchi, { [zona]: r.c.id }),
      usate: m.generata ? repo.usate : repo.usate.concat(m.id),
      note: m.generata ? repo.note + 1 : repo.note,
    });
    const st = conta(differenze(prima, snap));
    return {
      repo: nuovo,
      tipo: 'commit',
      commit: r.c,
      ramo: repo.head,
      zona: zona,
      stat: st,
      comandi: [
        { cmd: 'git add ricetta.txt' },
        { cmd: 'git commit -m "' + m.msg + '"', uscita: ['[' + repo.head + ' ' + r.c.id + '] ' + m.msg], nota: descriviConta(st) },
      ],
    };
  }

  // Le regole di git sui nomi dei branch, più una semplificazione del laboratorio (minuscole senza accenti).
  function validaNomeBranch(repo, nome) {
    const n = String(nome == null ? '' : nome).trim();
    if (repo.ordineBranch.length >= MAX_BRANCH) return 'Questo laboratorio tiene al massimo ' + MAX_BRANCH + ' branch: per provarne altri premi «Da capo».';
    if (!n) return 'Scrivi un nome per il branch, per esempio salsa-piccante.';
    if (/\s/.test(n)) return 'Git non accetta spazi nei nomi dei branch: usa il trattino, per esempio salsa-piccante.';
    if (n.length > 24) return 'Nome troppo lungo: al massimo 24 caratteri.';
    if (/^[-.]/.test(n)) return 'Git non accetta nomi che cominciano con un trattino o con un punto.';
    if (n.indexOf('..') >= 0 || n.indexOf('//') >= 0 || n.indexOf('/.') >= 0 || /[./]$/.test(n) || /\.lock$/.test(n)) {
      return 'Git non accetta nomi con due punti di fila o due barre, né nomi che finiscono con un punto, una barra o .lock.';
    }
    if (!/^[a-z0-9][a-z0-9._/-]*$/.test(n)) return 'In questo laboratorio usa solo lettere minuscole senza accenti, cifre e trattini, per esempio forno-a-legna.';
    if (repo.branch[n]) return 'Esiste già un branch chiamato «' + n + '»: scegli un altro nome.';
    return null;
  }

  function nomeSuggerito(repo) {
    for (const n of NOMI_SUGGERITI) if (!repo.branch[n]) return n;
    let i = 2;
    while (repo.branch['prova-' + i]) i++;
    return 'prova-' + i;
  }

  function nuovoBranch(repo, nome) {
    const n = String(nome == null ? '' : nome).trim();
    const err = validaNomeBranch(repo, n);
    if (err) return { repo: repo, errore: err };
    const da = repo.head;
    const id = tip(repo);
    const nuovo = Object.assign({}, repo, {
      branch: Object.assign({}, repo.branch, { [n]: id }),
      ordineBranch: repo.ordineBranch.concat(n),
      corsie: Object.assign({}, repo.corsie, { [n]: repo.ordineBranch.length }),
      head: n,
    });
    return { repo: nuovo, tipo: 'branch', nome: n, da: da, commit: id, comandi: [{ cmd: 'git switch -c ' + n, nota: 'nuovo branch ' + n + ' sullo stesso commit di ' + da + ' (' + id + ')' }] };
  }

  function cambiaBranch(repo, nome) {
    if (!repo.branch[nome]) return { repo: repo, errore: 'Il branch «' + nome + '» non esiste.' };
    if (nome === repo.head) return { repo: repo, nulla: true, tipo: 'switch', nome: nome, avviso: 'Sei già su ' + nome + '.' };
    const nuovo = Object.assign({}, repo, { head: nome });
    return { repo: nuovo, tipo: 'switch', nome: nome, da: repo.head, commit: repo.branch[nome], comandi: [{ cmd: 'git switch ' + nome, nota: 'HEAD ora indica ' + nome + ': ricetta.txt torna come nel commit ' + repo.branch[nome] }] };
  }

  function analizzaMerge(repo, nome) {
    if (!repo.branch[nome]) return { tipo: 'errore', errore: 'Il branch «' + nome + '» non esiste.' };
    if (nome === repo.head) return { tipo: 'errore', errore: 'Non si può unire un branch con se stesso: scegli un altro branch.' };
    const a = tip(repo);
    const b = repo.branch[nome];
    if (eAntenato(repo, b, a)) return { tipo: 'aggiornato', a: a, b: b };
    if (eAntenato(repo, a, b)) return { tipo: 'ff', a: a, b: b, base: a };
    return { tipo: 'merge', a: a, b: b, base: baseDiMerge(repo, a, b) };
  }

  // Unione delle due fotografie: per ogni riga vince la versione scritta più di recente.
  // Funziona perché ogni zona cambia lungo una sola linea di discendenza (vedi zonaLibera).
  function unisci(s1, s2) {
    const out = {};
    for (const k of new Set([...Object.keys(s1), ...Object.keys(s2)])) {
      const x = s1[k];
      const y = s2[k];
      out[k] = !x ? y : !y ? x : (y.v > x.v ? y : x);
    }
    return Object.freeze(out);
  }

  // Le righe che un merge a tre vie riga per riga non saprebbe risolvere (sempre nessuna, qui).
  function conflitti(repo, a, b) {
    const base = baseDiMerge(repo, a, b);
    const s0 = base ? repo.commit[base].snapshot : {};
    const s1 = repo.commit[a].snapshot;
    const s2 = repo.commit[b].snapshot;
    const val = (x) => (x && x.t != null ? x.t : null);
    const out = [];
    for (const k of new Set([...Object.keys(s0), ...Object.keys(s1), ...Object.keys(s2)])) {
      const t0 = val(s0[k]);
      const t1 = val(s1[k]);
      const t2 = val(s2[k]);
      if (t1 !== t2 && t1 !== t0 && t2 !== t0) out.push(k);
    }
    return out;
  }

  function merge(repo, nome, opz) {
    const an = analizzaMerge(repo, nome);
    if (an.tipo === 'errore') return { repo: repo, errore: an.errore };
    const cmd = 'git merge ' + nome;
    if (an.tipo === 'aggiornato') {
      return { repo: repo, tipo: 'aggiornato', nome: nome, comandi: [{ cmd: cmd, nota: 'già aggiornato: tutto ciò che c\'è in ' + nome + ' è già in ' + repo.head }] };
    }
    if (an.tipo === 'ff') {
      const nuovo = Object.assign({}, repo, { branch: Object.assign({}, repo.branch, { [repo.head]: an.b }) });
      return { repo: nuovo, tipo: 'ff', nome: nome, da: an.a, a: an.b, base: an.a, comandi: [{ cmd: cmd, nota: 'fast-forward: ' + repo.head + ' avanza da ' + an.a + ' a ' + an.b + ', senza commit nuovi' }] };
    }
    const lim = limiteCommit(repo);
    if (lim) return { repo: repo, errore: lim };
    const snap = unisci(repo.commit[an.a].snapshot, repo.commit[an.b].snapshot);
    const msg = repo.head === 'main' ? 'Merge branch \'' + nome + '\'' : 'Merge branch \'' + nome + '\' into ' + repo.head;
    const r = aggiungiCommit(repo, { genitori: [an.a, an.b], autore: (opz && opz.autore) || 'Tu', messaggio: msg, snapshot: snap, tipo: 'merge' });
    return { repo: r.repo, tipo: 'merge', nome: nome, commit: r.c, base: an.base, comandi: [{ cmd: cmd, nota: 'merge a tre vie dalla base ' + an.base + ': nuovo commit ' + r.c.id + ' con due genitori' }] };
  }

  /* ---------- sessione: azioni, registro dei comandi e annulla ---------- */

  function logIniziale(repo) {
    return [{ ramo: 'main', cmd: 'git log --oneline', uscita: repo.ordine.slice().reverse().map((id) => id + ' ' + repo.commit[id].messaggio) }];
  }

  function nuovaSessione() {
    const repo = crea();
    return { repo: repo, log: logIniziale(repo), passato: [] };
  }

  function esegui(repo, a) {
    switch (a && a.tipo) {
      case 'commit': return commit(repo, a);
      case 'branch': return nuovoBranch(repo, a.nome);
      case 'switch': return cambiaBranch(repo, a.nome);
      case 'merge': return merge(repo, a.nome, a);
      case 'reset': return { repo: crea(), tipo: 'reset' };
      default: return { repo: repo, errore: 'Azione sconosciuta.' };
    }
  }

  function applica(sess, a) {
    const es = esegui(sess.repo, a);
    if (es.errore || es.nulla) return { sess: sess, esito: es };
    const ramo = sess.repo.head;
    const log = es.tipo === 'reset'
      ? logIniziale(es.repo)
      : sess.log.concat((es.comandi || []).map((c) => Object.assign({ ramo: ramo }, c))).slice(-MAX_LOG);
    const passato = sess.passato.concat([{ repo: sess.repo, log: sess.log, azione: a, tipo: es.tipo, comandi: es.comandi || null }]).slice(-MAX_ANNULLA);
    return { sess: { repo: es.repo, log: log, passato: passato }, esito: es };
  }

  function annulla(sess) {
    if (!sess.passato.length) return { sess: sess, esito: null };
    const p = sess.passato[sess.passato.length - 1];
    return { sess: { repo: p.repo, log: p.log, passato: sess.passato.slice(0, -1) }, esito: { tipo: 'annulla', annullata: p } };
  }

  const Logica = {
    MAX_COMMIT, MAX_BRANCH, RIGHE, INIZIALI, MODIFICHE, ZONE, STORIA, NOMI_SUGGERITI,
    impronta, righe, testo, differenze, conta, descriviConta, zonaDi, chiave,
    tip, antenati, eAntenato, antenatiComuni, basiMigliori, baseDiMerge,
    crea, zonaLibera, prossimaModifica, commit, validaNomeBranch, nomeSuggerito, nuovoBranch, cambiaBranch,
    analizzaMerge, unisci, conflitti, merge, logIniziale, nuovaSessione, esegui, applica, annulla,
  };

  /* ======================= Interfaccia ======================= */

  const css = `
.lab-git { --g0: var(--trace-3); --g1: var(--trace-2); --g2: #c3a6ff; --g3: var(--trace-4); --g-piu: var(--trace-1); --g-meno: #ff8f80; }
.lab-git-k0 { --c: var(--g0); }
.lab-git-k1 { --c: var(--g1); }
.lab-git-k2 { --c: var(--g2); }
.lab-git-k3 { --c: var(--g3); }
.lab-git .pg-term { text-decoration-color: color-mix(in srgb, var(--trace-1) 80%, transparent); }
.lab-git .pg-term:hover, .lab-git .pg-term[aria-expanded="true"] { color: var(--lab-bright); }
.lab-git-passo { min-width: 7.5em; font-size: 13px; }
.lab-git-azioni { gap: 10px 22px; }
.lab-git-gruppo { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.lab-git-gruppo .pg-etichetta { font-size: 14px; }
.lab-git-gruppo .pg-etichetta b { color: var(--lab-bright); font: 700 14px var(--mono); }
.lab-git select.pg-campo { max-width: 13em; }
.lab-git-nome { width: 12.5em; }
.lab-git-nome[aria-invalid="true"] { border-color: #ff8f80; }
.lab-git-commit { border-color: color-mix(in srgb, var(--trace-1) 55%, var(--lab-line)); color: var(--lab-bright); }
.lab-git-info { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 18px; margin: 0; padding: 9px 18px 0; font-size: 13px; line-height: 1.5; color: var(--lab-text); }
.lab-git-info q { color: var(--lab-bright); quotes: "«" "»"; }
.lab-git-errore { color: #ffb4a8; font-weight: 700; }
.lab-git-errore:empty { display: none; }
.lab-git-palco { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 14px; padding: 12px 18px 16px; align-items: stretch; }
.lab-git--colonna .lab-git-palco { grid-template-columns: minmax(0, 1fr); }
.lab-git-pann { padding: 0; min-width: 0; overflow: hidden; display: flex; flex-direction: column; }
.lab-git-testa { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 2px 12px; padding: 9px 14px 8px; border-bottom: 1px solid var(--lab-line); }
.lab-git-testa h4 { margin: 0; font: 700 13px var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--lab-bright); }
.lab-git-testa h4 code { text-transform: none; letter-spacing: 0; }
.lab-git-legenda { font: 13px var(--font); color: var(--lab-text); }
.lab-git-scorri { position: relative; height: 290px; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--lab-line) transparent; }
.lab-git--stretta .lab-git-scorri { height: 318px; }
.lab-git-tela { position: relative; }
.lab-git-selbar { position: absolute; left: 4px; right: 4px; top: 0; height: var(--rh); border-radius: 8px; pointer-events: none;
  background: color-mix(in srgb, var(--lab-bright) 9%, transparent); box-shadow: inset 3px 0 0 var(--lab-bright); }
.lab-git-svg { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
.lab-git-righe { position: absolute; inset: 0; }
.lab-git-riga { position: absolute; left: 0; right: 0; top: 0; height: var(--rh); box-sizing: border-box; display: flex; align-items: center; gap: 8px;
  padding: 0 10px 0 var(--gw); border-radius: 8px; cursor: pointer; will-change: transform; }
.lab-git-riga:hover { background: rgba(255, 255, 255, .035); }
.lab-git-riga:focus { outline: none; }
.lab-git-riga:focus-visible { outline: 2px solid var(--trace-1); outline-offset: -2px; }
.lab-git-hash { flex: none; font: 600 13px var(--mono); color: var(--lab-text); font-variant-numeric: tabular-nums; }
.lab-git-chips { flex: none; display: inline-flex; gap: 4px; }
.lab-git-chips:empty { display: none; }
.lab-git-chip { display: inline-flex; align-items: center; height: 24px; box-sizing: border-box; padding: 0 7px; border-radius: 6px; white-space: nowrap;
  font: 700 13px var(--mono); color: var(--c); border: 1.5px solid var(--c); background: color-mix(in srgb, var(--c) 14%, var(--lab-panel)); transform-origin: 0 50%; }
.lab-git-chip--attivo { background: var(--c); color: #06140e; }
.lab-git-chip--head { --c: var(--lab-bright); background: var(--lab-bright); color: #06140e; }
.lab-git-chip--base { --c: var(--lab-bright); background: transparent; border-style: dashed; color: var(--lab-bright); font-weight: 600; }
.lab-git-msg { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; color: #dbe9e2; }
.lab-git-autore { flex: none; font-size: 13px; color: var(--lab-text); }
.lab-git--stretta .lab-git-riga { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; grid-template-areas: "h c c" "m m a"; align-content: center; gap: 3px 8px; }
.lab-git--stretta .lab-git-hash { grid-area: h; }
.lab-git--stretta .lab-git-chips { grid-area: c; overflow: hidden; }
.lab-git--stretta .lab-git-msg { grid-area: m; }
.lab-git--stretta .lab-git-autore { grid-area: a; }
.lab-git-vuoto { position: absolute; left: 0; right: 0; margin: 0; padding: 4px 14px 0 var(--gw); font-size: 13px; line-height: 1.5; color: var(--lab-text); }
.lab-git-arco { fill: none; stroke: var(--c); stroke-width: 2.5; stroke-linecap: round; }
.lab-git-nodo-c { fill: var(--c); stroke: var(--lab-panel); stroke-width: 2.5; }
.lab-git-nodo-anello { fill: none; stroke: var(--c); stroke-width: 2; }
.lab-git-nodo-t { font: 800 13px var(--font); fill: #06140e; }
.lab-git-alone { fill: none; stroke: var(--lab-bright); stroke-width: 2; }
.lab-git-base { fill: none; stroke: var(--lab-bright); stroke-width: 1.6; stroke-dasharray: 3 3.5; }
.lab-git-file-testa { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
.lab-git-hashsel { font: 700 13px var(--mono); color: var(--c); border: 1.5px solid var(--c); border-radius: 6px; padding: 1px 7px; }
.lab-git-dett { display: grid; gap: 3px; padding: 10px 14px 6px; font-size: 13px; line-height: 1.5; color: var(--lab-text); }
.lab-git-dett-msg { font-size: 15px; font-weight: 700; color: var(--lab-bright); overflow-wrap: anywhere; }
.lab-git-dett code { font-size: 12.5px; }
.lab-git-viaggio { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-top: 6px; padding: 8px 10px; border-radius: 9px;
  border: 1px solid color-mix(in srgb, var(--trace-2) 55%, transparent); background: color-mix(in srgb, var(--trace-2) 10%, transparent); color: var(--lab-bright); }
.lab-git-viaggio[hidden] { display: none; }
.lab-git-viaggio p { margin: 0; flex: 1 1 14em; }
.lab-git-file { list-style: none; margin: 4px 0 0; padding: 2px 0 10px; font: 13.5px/1.55 var(--mono); flex: 1 1 auto; overflow-y: auto; min-height: 0; }
.lab-git--colonna .lab-git-file { max-height: 420px; }
.lab-git-l { display: grid; grid-template-columns: 20px 24px minmax(0, 1fr); align-items: baseline; padding: 1px 12px 1px 6px; }
.lab-git-l-segno { text-align: center; font-weight: 800; color: var(--lab-text); }
.lab-git-l-num { text-align: right; padding-right: 8px; font-size: 13px; color: #81998f; font-variant-numeric: tabular-nums; }
.lab-git-l-t { white-space: pre-wrap; overflow-wrap: anywhere; color: #d4e3dc; }
.lab-git-l--testa .lab-git-l-t { color: var(--lab-bright); font-weight: 700; letter-spacing: .04em; }
.lab-git-l--piu { background: color-mix(in srgb, var(--g-piu) 14%, transparent); box-shadow: inset 3px 0 0 var(--g-piu); }
.lab-git-l--piu .lab-git-l-segno, .lab-git-l--piu .lab-git-l-t { color: #8ff0bc; }
.lab-git-l--meno { background: color-mix(in srgb, var(--g-meno) 14%, transparent); box-shadow: inset 3px 0 0 var(--g-meno); }
.lab-git-l--meno .lab-git-l-segno, .lab-git-l--meno .lab-git-l-t { color: #ffb3a9; }
.lab-git-l--entra { animation: lab-git-entra var(--pg-dur-lenta) var(--pg-ease-smooth) both; }
@keyframes lab-git-entra { from { opacity: 0; transform: translateX(-10px); } }
.lab-git-mostra { margin: 0; padding: 8px 14px 10px; border-top: 1px solid var(--lab-line); font-size: 13px; color: var(--lab-text); }
.lab-git-legenda-diff { display: inline-flex; gap: 12px; }
.lab-git-legenda-diff .piu { color: #8ff0bc; }
.lab-git-legenda-diff .meno { color: #ffb3a9; }
.lab-git-spiega { border-bottom: 1px solid var(--lab-line); }
.lab-git-terminale { margin: 14px 18px 18px; border: 1px solid var(--lab-line); border-radius: 12px; background: #040807; overflow: hidden; }
.lab-git-term-testa { display: flex; align-items: center; gap: 7px; padding: 8px 12px; border-bottom: 1px solid var(--lab-line); font: 700 13px var(--mono); color: var(--lab-text); }
.lab-git-term-testa i { width: 9px; height: 9px; border-radius: 50%; background: var(--lab-line); }
.lab-git-term-testa span { margin-left: 6px; }
.lab-git-term { max-height: 196px; overflow-y: auto; padding: 10px 14px 12px; font: 13px/1.6 var(--mono); scrollbar-width: thin; scrollbar-color: var(--lab-line) transparent; }
.lab-git-t-voce { padding: 1px 4px; border-radius: 6px; }
.lab-git-t-cmd { color: var(--lab-bright); white-space: pre-wrap; overflow-wrap: anywhere; }
.lab-git-t-prompt { color: #8fa89e; }
.lab-git-t-ramo { color: var(--c); }
.lab-git-t-out { color: #b9cdc5; white-space: pre-wrap; overflow-wrap: anywhere; }
.lab-git-t-nota { color: #8fa89e; font-style: italic; white-space: pre-wrap; overflow-wrap: anywhere; }
@media (prefers-reduced-motion: reduce) {
  .lab-git-l--entra { animation: none; }
}
@media (max-width: 640px) {
  .lab-git-palco { padding: 10px 12px 14px; }
  .lab-git-info { padding: 8px 12px 0; }
  .lab-git-terminale { margin: 12px 12px 14px; }
}
`;

  // Testi della storia guidata, uno per passo di Logica.STORIA.
  const TESTI_STORIA = [
    () => 'Anna e Luca scrivono insieme la ricetta della pizza e la tengono in un {{repository}} Git chiamato `ricetta`. Ci sono già due {{commit}} sul branch `main`: ogni pallino è una versione salvata del file, legata a quella precedente.',
    () => 'Anna vuole provare una salsa nuova senza toccare la ricetta che funziona. Crea un {{branch}}, `nuova-salsa`: per ora è solo una seconda etichetta sullo stesso commit, e `HEAD`, che segna dove sta lavorando, ora indica quella.',
    () => 'Anna cambia la salsa e salva con un commit. Il pallino nuovo nasce sulla corsia di `nuova-salsa` e l\'etichetta avanza con lui; `main` resta dov\'era.',
    () => 'Un secondo commit sullo stesso branch: l\'esperimento cresce, mentre la ricetta su `main` non è cambiata di una virgola.',
    () => 'Intanto Luca lavora su `main`. Qui i due condividono un solo repository, quindi ci spostiamo con `git switch main`; nella realtà Luca avrebbe sul suo computer una copia completa del repository, e i due si scambierebbero i commit con `git push` e `git pull`.',
    () => 'Luca corregge l\'impasto, che veniva troppo duro. Ora le due linee si sono separate: ciascuna ha un commit che l\'altra non ha.',
    (es) => 'Luca unisce il lavoro di Anna con un {{merge}}. Git risale all\'antenato comune, `' + es.base + '` (il cerchio tratteggiato), guarda che cosa è cambiato da lì su ciascuna linea e combina le due modifiche: nasce `' + es.commit.id + '`, un commit con **due genitori**.',
    () => 'Fatto: la ricetta ha la salsa di Anna e l\'impasto di Luca, e nessuna versione è andata persa. Tocca un pallino qualsiasi per tornare indietro nel tempo, oppure continua tu: un branch, qualche commit, un merge.',
  ];

  function monta(el, ctx) {
    const { h, s } = ctx;
    const pre = ctx.uid('lab-git');
    let sess = Logica.nuovaSessione();
    let sel = Logica.tip(sess.repo);   // il commit mostrato nel pannello del file
    let base = null;                    // base dell'ultimo merge a tre vie, da evidenziare
    let completato = false;
    let commitFatti = 0;
    let nomeToccato = false;
    const storia = { indice: -1, suona: false };

    /* ---------- struttura ---------- */

    const btnStoria = h('button', { type: 'button', class: 'pg-btn pg-btn--primario', onclick: () => suonaStoria() }, '▶ Racconta: due persone, un progetto');
    const btnPasso = h('button', { type: 'button', class: 'pg-btn', onclick: () => passoStoria() }, 'Passo ›');
    const lettPasso = h('span', { class: 'pg-lettura lab-git-passo' });
    const btnAnnulla = h('button', { type: 'button', class: 'pg-btn', onclick: () => annullaUltima() }, '↶ Annulla');
    const btnDaCapo = h('button', { type: 'button', class: 'pg-btn', onclick: () => azione({ tipo: 'reset' }) }, '↺ Da capo');

    const selBranch = h('select', { class: 'pg-campo', id: pre + '-br', 'aria-describedby': pre + '-br-d', onchange: () => azione({ tipo: 'switch', nome: selBranch.value }) });
    const btnCommit = h('button', { type: 'button', class: 'pg-btn lab-git-commit', 'aria-describedby': pre + '-pr', onclick: () => azione({ tipo: 'commit' }) }, '+ Commit');
    const inNome = h('input', {
      class: 'pg-campo lab-git-nome', id: pre + '-nm', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', maxlength: '30',
      'aria-describedby': pre + '-err',
      oninput: () => { nomeToccato = true; if (inNome.getAttribute('aria-invalid')) mostraErrore(''); },
      onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); creaBranch(); } },
    });
    const btnBranch = h('button', { type: 'button', class: 'pg-btn', onclick: () => creaBranch() }, 'Nuovo branch');
    const selMerge = h('select', { class: 'pg-campo', id: pre + '-mg' });
    const nomeHead = h('b');
    const btnMerge = h('button', { type: 'button', class: 'pg-btn', onclick: () => azione({ tipo: 'merge', nome: selMerge.value }) }, 'Merge');
    const prossimo = h('span', { id: pre + '-pr' });
    const errore = h('span', { class: 'lab-git-errore', id: pre + '-err', role: 'alert' });

    const barraStoria = h('div', { class: 'pg-strumenti', role: 'group', 'aria-label': 'Storia guidata e annulla' },
      btnStoria, btnPasso, lettPasso, h('span', { class: 'pg-spazio' }), btnAnnulla, btnDaCapo);
    const barraGit = h('div', { class: 'pg-strumenti lab-git-azioni', role: 'group', 'aria-label': 'Comandi Git' },
      h('div', { class: 'lab-git-gruppo' },
        h('label', { class: 'pg-etichetta', for: pre + '-br' }, 'Sei su'), selBranch,
        h('span', { class: 'pg-sr', id: pre + '-br-d' }, 'Scegli un altro branch per passarci, come con git switch.'),
        btnCommit),
      h('div', { class: 'lab-git-gruppo' },
        h('label', { class: 'pg-sr', for: pre + '-nm' }, 'Nome del nuovo branch'), inNome, btnBranch),
      h('div', { class: 'lab-git-gruppo' },
        h('label', { class: 'pg-etichetta', for: pre + '-mg' }, 'Unisci in ', nomeHead), selMerge, btnMerge));
    const info = h('p', { class: 'lab-git-info' }, prossimo, errore);

    // grafo
    const idGrafo = pre + '-gt';
    const selbar = h('div', { class: 'lab-git-selbar', 'aria-hidden': 'true' });
    const svg = s('svg', { class: 'lab-git-svg', 'aria-hidden': 'true', focusable: 'false' });
    const gArchi = s('g');
    const gAnelli = s('g');
    const gNodi = s('g');
    const alone = s('circle', { class: 'lab-git-alone', r: 17 });
    const anelloBase = s('circle', { class: 'lab-git-base', r: 17 });
    gAnelli.append(anelloBase, alone);
    svg.append(gArchi, gAnelli, gNodi);
    const righeBox = h('div', { class: 'lab-git-righe' });
    const vuoto = h('p', { class: 'lab-git-vuoto', 'aria-hidden': 'true' }, 'Ogni pallino è una versione salvata di ricetta.txt: toccane uno per vederla com\'era. La più recente è in alto.');
    const tela = h('div', { class: 'lab-git-tela' }, selbar, svg, righeBox, vuoto);
    const scorri = h('div', { class: 'lab-git-scorri', role: 'listbox', 'aria-labelledby': idGrafo, onkeydown: tastiGrafo }, tela);
    const pannGrafo = h('section', { class: 'pg-pannello lab-git-pann', 'aria-labelledby': idGrafo },
      h('header', { class: 'lab-git-testa' },
        h('h4', { id: idGrafo }, 'Storia di ', h('code', null, 'ricetta')),
        h('span', { class: 'lab-git-legenda' }, '↑ più recente · tocca un pallino')),
      scorri);

    // file
    const idFile = pre + '-ft';
    const hashSel = h('span', { class: 'lab-git-hashsel' });
    const dettMsg = h('span', { class: 'lab-git-dett-msg' });
    const dettMeta = h('span');
    const dettGen = h('span');
    const viaggioTesto = h('p');
    const btnPresente = h('button', { type: 'button', class: 'pg-btn', onclick: () => seleziona(Logica.tip(sess.repo), false) }, 'Torna a HEAD');
    const viaggio = h('div', { class: 'lab-git-viaggio', hidden: true }, viaggioTesto, btnPresente);
    const lista = h('ol', { class: 'lab-git-file', 'aria-label': 'Righe di ricetta.txt nel commit scelto' });
    const cmdShow = h('code');
    const pannFile = h('section', { class: 'pg-pannello lab-git-pann', 'aria-labelledby': idFile },
      h('header', { class: 'lab-git-testa' },
        h('span', { class: 'lab-git-file-testa' }, h('h4', { id: idFile }, h('code', null, 'ricetta.txt')), hashSel),
        h('span', { class: 'lab-git-legenda lab-git-legenda-diff', 'aria-hidden': 'true' }, h('span', { class: 'piu' }, '+ aggiunta'), h('span', { class: 'meno' }, '− tolta'))),
      h('div', { class: 'lab-git-dett' }, dettMsg, dettMeta, dettGen, viaggio),
      lista,
      h('p', { class: 'lab-git-mostra' }, 'Per vederlo con git: ', cmdShow));

    const spiega = h('div', { class: 'pg-spiega lab-git-spiega', 'aria-live': 'polite' });
    const term = h('div', { class: 'lab-git-term', tabindex: '0', role: 'region', 'aria-label': 'Terminale con i comandi git equivalenti' });
    const terminale = h('section', { class: 'lab-git-terminale' },
      h('div', { class: 'lab-git-term-testa', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('span', null, 'Terminale · i comandi git equivalenti')),
      term);

    const radice = h('div', { class: 'lab-git' }, barraStoria, barraGit, info, h('div', { class: 'lab-git-palco' }, pannGrafo, pannFile), spiega, terminale);
    el.append(radice);

    /* ---------- animazione: un'unica interpolazione, ripresa da dove si trova ---------- */

    const voci = new Set();
    const tw = { t: 1, durata: 1, stop: null };

    function voce(iniziale, applica, ease) {
      const v = { cur: Object.assign({}, iniziale), from: Object.assign({}, iniziale), to: Object.assign({}, iniziale), applica: applica, ease: ease || null, fuori: null };
      voci.add(v);
      applica(v.cur);
      return v;
    }
    function verso(v, to, ease) {
      v.from = Object.assign({}, v.cur);
      v.to = Object.assign({}, v.cur, to);
      v.ease = ease || null;
    }
    function fotogramma(t) {
      for (const v of voci) {
        const e = (v.ease || ctx.EASING.smooth)(t);
        for (const k in v.to) v.cur[k] = v.from[k] + (v.to[k] - v.from[k]) * e;
        v.applica(v.cur);
      }
      disegnaArchi();
    }
    function chiudi() {
      for (const v of [...voci]) {
        v.cur = Object.assign({}, v.to);
        v.from = Object.assign({}, v.to);
        if (v.fuori) { const f = v.fuori; v.fuori = null; voci.delete(v); f(); }
      }
      disegnaArchi();
    }
    function anima(durata) {
      if (ctx.riduci || !durata) {
        if (tw.stop) { tw.stop(); tw.stop = null; }
        fotogramma(1);
        chiudi();
        return;
      }
      tw.t = 0;
      tw.durata = durata;
      if (!tw.stop) {
        tw.stop = ctx.ciclo((dt) => {
          tw.t = Math.min(1, tw.t + dt / tw.durata);
          fotogramma(tw.t);
          if (tw.t >= 1) { tw.stop(); tw.stop = null; chiudi(); }
        });
      }
    }
    const piuSvelto = (t) => Math.min(1, ctx.EASING.smooth(t) * 2.4);

    /* ---------- misure ---------- */

    const M = { colonna: false, stretta: false, rowH: 44, lx: 24, padL: 12, padTop: 8, r: 11 };
    function misura() {
      const w = radice.clientWidth || 900;
      const colonna = w < 760;
      const largGrafo = colonna ? w - 36 : (w - 50) * 1.25 / 2.25;
      const stretta = largGrafo < 470;
      const cambiato = colonna !== M.colonna || stretta !== M.stretta;
      M.colonna = colonna;
      M.stretta = stretta;
      M.rowH = stretta ? 56 : 44;
      M.lx = stretta ? 20 : 24;
      M.r = stretta ? 10 : 11;
      radice.classList.toggle('lab-git--colonna', colonna);
      radice.classList.toggle('lab-git--stretta', stretta);
      return cambiato;
    }

    /* ---------- grafo: righe, etichette, nodi e archi ---------- */

    const righeMap = new Map();  // id commit -> { el, hash, chipsEl, msg, aut, v, vh, vm }
    const chips = new Map();     // chiave -> { el, riga, v }
    const nodi = new Map();      // id commit -> { g, v }
    const archi = new Map();     // 'figlio>genitore' -> { path, figlio, genitore, secondo, diretto, v }
    let vSel = null;
    let vAlone = null;
    let vBase = null;

    function iniziale(nome) { return String(nome || '?').charAt(0).toUpperCase(); }

    function layout(repo) {
      const n = repo.ordine.length;
      const corsie = Math.max(2, ...repo.ordineBranch.map((b) => repo.corsie[b] + 1));
      const gw = M.padL * 2 + corsie * M.lx;
      const pos = new Map();
      repo.ordine.forEach((id, i) => {
        const riga = n - 1 - i;
        const c = repo.commit[id];
        pos.set(id, { riga: riga, x: M.padL + c.corsia * M.lx + M.lx / 2, y: M.padTop + riga * M.rowH + M.rowH / 2 });
      });
      return { pos: pos, gw: gw, altezza: M.padTop * 2 + n * M.rowH };
    }

    function etichetteVolute(repo) {
      const per = new Map();
      const metti = (id, item) => { if (!per.has(id)) per.set(id, []); per.get(id).push(item); };
      const idHead = repo.branch[repo.head];
      metti(idHead, { k: 'HEAD', testo: 'HEAD →', classe: 'lab-git-chip--head', nome: 'HEAD' });
      metti(idHead, { k: 'b:' + repo.head, testo: repo.head, classe: 'lab-git-chip--attivo lab-git-k' + (repo.corsie[repo.head] % 4), nome: 'branch ' + repo.head });
      for (const b of repo.ordineBranch) {
        if (b !== repo.head) metti(repo.branch[b], { k: 'b:' + b, testo: b, classe: 'lab-git-k' + (repo.corsie[b] % 4), nome: 'branch ' + b });
      }
      if (base && repo.commit[base]) metti(base, { k: 'base', testo: 'base', classe: 'lab-git-chip--base', nome: 'base del merge' });
      return per;
    }

    function applicaRiga(elRiga) { return (c) => { elRiga.style.transform = 'translateY(' + c.y.toFixed(2) + 'px)'; elRiga.style.opacity = c.o; }; }
    function applicaTx(elX) { return (c) => { elX.style.transform = c.tx ? 'translateX(' + c.tx.toFixed(2) + 'px)' : ''; }; }
    function applicaChip(elC) { return (c) => { elC.style.transform = 'translate(' + c.tx.toFixed(2) + 'px,' + c.ty.toFixed(2) + 'px) scale(' + c.s.toFixed(3) + ')'; elC.style.opacity = c.o; }; }
    function applicaNodo(g) { return (c) => { g.setAttribute('transform', 'translate(' + c.x.toFixed(2) + ' ' + c.y.toFixed(2) + ') scale(' + Math.max(0, c.s).toFixed(3) + ')'); g.style.opacity = c.o; }; }
    function applicaCerchio(cerchio) { return (c) => { cerchio.setAttribute('cx', c.x.toFixed(2)); cerchio.setAttribute('cy', c.y.toFixed(2)); cerchio.style.opacity = c.o; }; }

    function creaRiga(c) {
      const r = {
        el: h('div', { class: 'lab-git-riga', role: 'option', id: pre + '-c-' + c.id, 'data-id': c.id, tabindex: '-1', 'aria-selected': 'false' }),
        hash: h('span', { class: 'lab-git-hash' }, c.id),
        chipsEl: h('span', { class: 'lab-git-chips' }),
        msg: h('span', { class: 'lab-git-msg' }, c.messaggio),
        aut: h('span', { class: 'lab-git-autore' }, c.autore),
      };
      r.el.append(r.hash, r.chipsEl, r.msg, r.aut);
      r.el.addEventListener('click', () => seleziona(c.id, true));
      return r;
    }

    function creaNodo(c) {
      const g = s('g', { class: 'lab-git-nodo lab-git-k' + (c.corsia % 4) });
      if (c.genitori.length > 1) g.append(s('circle', { class: 'lab-git-nodo-anello', r: M.r + 3.5 }));
      g.append(s('circle', { class: 'lab-git-nodo-c', r: M.r }), s('text', { class: 'lab-git-nodo-t', 'text-anchor': 'middle', dy: '0.36em' }, iniziale(c.autore)));
      return g;
    }

    function percorso(cx, cy, px, py, secondo, diretto) {
      const R = M.rowH;
      if (Math.abs(cx - px) < 0.5) return 'M' + cx.toFixed(1) + ' ' + cy.toFixed(1) + 'L' + px.toFixed(1) + ' ' + py.toFixed(1);
      if (diretto || py - cy <= R + 0.5) {
        const my = (cy + py) / 2;
        return 'M' + cx.toFixed(1) + ' ' + cy.toFixed(1) + 'C' + cx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + px.toFixed(1) + ' ' + my.toFixed(1) + ' ' + px.toFixed(1) + ' ' + py.toFixed(1);
      }
      if (secondo) {
        const y1 = cy + R;
        return 'M' + cx.toFixed(1) + ' ' + cy.toFixed(1) + 'C' + cx.toFixed(1) + ' ' + (cy + R / 2).toFixed(1) + ' ' + px.toFixed(1) + ' ' + (cy + R / 2).toFixed(1) + ' ' + px.toFixed(1) + ' ' + y1.toFixed(1) + 'L' + px.toFixed(1) + ' ' + py.toFixed(1);
      }
      const y1 = py - R;
      return 'M' + cx.toFixed(1) + ' ' + cy.toFixed(1) + 'L' + cx.toFixed(1) + ' ' + y1.toFixed(1) + 'C' + cx.toFixed(1) + ' ' + (y1 + R / 2).toFixed(1) + ' ' + px.toFixed(1) + ' ' + (y1 + R / 2).toFixed(1) + ' ' + px.toFixed(1) + ' ' + py.toFixed(1);
    }

    function disegnaArchi() {
      for (const a of archi.values()) {
        const nf = nodi.get(a.figlio);
        const ng = nodi.get(a.genitore);
        if (!nf || !ng) continue;
        const f = nf.v.cur;
        const g = ng.v.cur;
        a.path.setAttribute('d', percorso(f.x, f.y, g.x, g.y, a.secondo, a.diretto));
        const p = Math.max(0, Math.min(1, a.v.cur.p));
        if (p < 0.999) {
          a.path.setAttribute('stroke-dasharray', '1 1');
          a.path.setAttribute('stroke-dashoffset', (1 - p).toFixed(3));
        } else {
          a.path.removeAttribute('stroke-dasharray');
          a.path.removeAttribute('stroke-dashoffset');
        }
        a.path.style.opacity = a.v.cur.o;
      }
    }

    // Un arco che scende lungo una corsia non deve passare sopra un altro pallino di quella corsia.
    function attraversa(repo, L, corsia, rigaDa, rigaA) {
      for (const id of repo.ordine) {
        const c = repo.commit[id];
        if (c.corsia !== corsia) continue;
        const r = L.pos.get(id).riga;
        if (r > rigaDa && r < rigaA) return true;
      }
      return false;
    }

    function svuotaGrafo() {
      if (tw.stop) { tw.stop(); tw.stop = null; }
      voci.clear();
      righeMap.clear();
      chips.clear();
      nodi.clear();
      archi.clear();
      righeBox.replaceChildren();
      gArchi.replaceChildren();
      gNodi.replaceChildren();
      vSel = voce({ y: 0, o: 0 }, (c) => { selbar.style.transform = 'translateY(' + c.y.toFixed(2) + 'px)'; selbar.style.opacity = c.o; });
      vAlone = voce({ x: 0, y: 0, o: 0 }, applicaCerchio(alone));
      vBase = voce({ x: 0, y: 0, o: 0 }, applicaCerchio(anelloBase));
    }

    function render(durata) {
      const repo = sess.repo;
      const L = layout(repo);
      const animato = !!durata && !ctx.riduci;

      // FLIP: dove si vedono adesso etichette, impronte e messaggi
      const prima = new Map();
      if (animato) {
        for (const [k, ch] of chips) {
          const r = righeMap.get(ch.riga);
          if (r) prima.set(k, { x: ch.el.offsetLeft + ch.v.cur.tx, y: r.v.cur.y + ch.el.offsetTop + ch.v.cur.ty });
        }
        for (const [id, r] of righeMap) prima.set('h:' + id, r.hash.offsetLeft + r.vh.cur.tx).set('m:' + id, r.msg.offsetLeft + r.vm.cur.tx);
      }

      tela.style.setProperty('--gw', L.gw + 'px');
      tela.style.setProperty('--rh', M.rowH + 'px');
      tela.style.height = (L.altezza + (repo.ordine.length <= 4 ? 64 : 0)) + 'px';
      vuoto.style.top = L.altezza + 'px';
      vuoto.hidden = repo.ordine.length > 4;

      // righe
      const presenti = new Set(repo.ordine);
      for (const id of repo.ordine) {
        const c = repo.commit[id];
        const yR = L.pos.get(id).y - M.rowH / 2;
        let r = righeMap.get(id);
        if (!r) {
          r = creaRiga(c);
          righeMap.set(id, r);
          righeBox.append(r.el);
          r.v = voce({ y: animato ? yR - 14 : yR, o: animato ? 0 : 1 }, applicaRiga(r.el));
          r.vh = voce({ tx: 0 }, applicaTx(r.hash));
          r.vm = voce({ tx: 0 }, applicaTx(r.msg));
        } else if (r.v.fuori) {
          r.v.fuori = null;
          r.el.setAttribute('role', 'option');
          r.el.removeAttribute('aria-hidden');
        }
        verso(r.v, { y: yR, o: 1 });
      }
      for (const [id, r] of righeMap) {
        if (presenti.has(id) || r.v.fuori) continue;
        verso(r.v, { o: 0 }, piuSvelto);
        r.el.removeAttribute('role');
        r.el.setAttribute('aria-hidden', 'true');
        r.v.fuori = () => { r.el.remove(); righeMap.delete(id); voci.delete(r.vh); voci.delete(r.vm); };
      }

      // etichette (HEAD, branch, base) nelle righe dei loro commit
      const volute = etichetteVolute(repo);
      const chiaviVolute = new Set();
      for (const lst of volute.values()) for (const it of lst) chiaviVolute.add(it.k);
      for (const [k, ch] of chips) if (!chiaviVolute.has(k)) { ch.el.remove(); voci.delete(ch.v); chips.delete(k); }
      const nuove = new Set();
      for (const [id, lst] of volute) {
        const r = righeMap.get(id);
        for (const it of lst) {
          let ch = chips.get(it.k);
          if (!ch) {
            ch = { el: h('span', { 'aria-hidden': 'true' }, it.testo) };
            ch.v = voce({ tx: 0, ty: 0, o: animato ? 0 : 1, s: animato ? 0.6 : 1 }, applicaChip(ch.el));
            chips.set(it.k, ch);
            nuove.add(it.k);
          }
          ch.el.className = 'lab-git-chip ' + it.classe;
          ch.el.textContent = it.testo;
          ch.riga = id;
          r.chipsEl.append(ch.el);
        }
      }
      // nomi accessibili delle righe
      for (const id of repo.ordine) {
        const c = repo.commit[id];
        const r = righeMap.get(id);
        const et = (volute.get(id) || []).map((it) => it.nome);
        r.el.setAttribute('aria-label', c.id + ', «' + c.messaggio + '», di ' + c.autore + (c.genitori.length > 1 ? ', commit di merge con due genitori' : '') + (et.length ? '. Etichette: ' + et.join(', ') : ''));
      }

      // FLIP: dopo l'aggiornamento del DOM, ogni elemento parte da dove si vedeva
      for (const [k, ch] of chips) {
        const r = righeMap.get(ch.riga);
        if (nuove.has(k)) { verso(ch.v, { tx: 0, ty: 0, o: 1, s: 1 }, animato ? ctx.EASING.bounce : null); continue; }
        const p = prima.get(k);
        if (animato && p && r) {
          ch.v.cur = { tx: p.x - ch.el.offsetLeft, ty: p.y - (r.v.from.y + ch.el.offsetTop), o: ch.v.cur.o, s: ch.v.cur.s };
          ch.v.applica(ch.v.cur);
        }
        verso(ch.v, { tx: 0, ty: 0, o: 1, s: 1 });
      }
      for (const [id, r] of righeMap) {
        if (animato && prima.has('h:' + id)) {
          r.vh.cur = { tx: prima.get('h:' + id) - r.hash.offsetLeft };
          r.vm.cur = { tx: prima.get('m:' + id) - r.msg.offsetLeft };
          r.vh.applica(r.vh.cur);
          r.vm.applica(r.vm.cur);
        }
        verso(r.vh, { tx: 0 });
        verso(r.vm, { tx: 0 });
      }

      // nodi
      svg.setAttribute('width', L.gw);
      svg.setAttribute('height', L.altezza);
      for (const id of repo.ordine) {
        const c = repo.commit[id];
        const p = L.pos.get(id);
        let n = nodi.get(id);
        if (!n) {
          n = { g: creaNodo(c) };
          gNodi.append(n.g);
          n.v = voce({ x: p.x, y: p.y, s: animato ? 0 : 1, o: 1 }, applicaNodo(n.g));
          nodi.set(id, n);
          verso(n.v, { s: 1 }, animato ? ctx.EASING.bounce : null);
        } else {
          if (n.v.fuori) n.v.fuori = null;
          verso(n.v, { x: p.x, y: p.y, s: 1, o: 1 });
        }
      }
      for (const [id, n] of nodi) {
        if (presenti.has(id) || n.v.fuori) continue;
        verso(n.v, { s: 0.3, o: 0 }, piuSvelto);
        n.v.fuori = () => { n.g.remove(); nodi.delete(id); };
      }

      // archi: dal commit al genitore; il secondo genitore ha il colore del branch unito
      const voluti = new Set();
      for (const id of repo.ordine) {
        const c = repo.commit[id];
        c.genitori.forEach((g, i) => {
          const k = id + '>' + g;
          voluti.add(k);
          let a = archi.get(k);
          const pf = L.pos.get(id);
          const pg = L.pos.get(g);
          const cg = repo.commit[g];
          const secondo = i > 0;
          const corsia = secondo ? cg.corsia : c.corsia;
          const diretto = cg.corsia !== c.corsia && (secondo
            ? attraversa(repo, L, cg.corsia, pf.riga, pg.riga) || attraversa(repo, L, cg.corsia, pf.riga, pf.riga + 2)
            : attraversa(repo, L, c.corsia, pf.riga, pg.riga));
          if (!a) {
            a = { path: s('path', { pathLength: '1' }), figlio: id, genitore: g, secondo: secondo };
            gArchi.append(a.path);
            a.v = voce({ p: animato ? 0 : 1, o: 1 }, () => {});
            archi.set(k, a);
          } else if (a.v.fuori) {
            a.v.fuori = null;
          }
          a.diretto = diretto;
          a.path.setAttribute('class', 'lab-git-arco lab-git-k' + (corsia % 4));
          verso(a.v, { p: 1, o: 1 });
        });
      }
      for (const [k, a] of archi) {
        if (voluti.has(k) || a.v.fuori) continue;
        verso(a.v, { o: 0 }, piuSvelto);
        a.v.fuori = () => { a.path.remove(); archi.delete(k); };
      }

      // selezione, alone e base del merge
      const pSel = L.pos.get(sel);
      if (pSel) {
        verso(vSel, { y: pSel.y - M.rowH / 2, o: 1 });
        verso(vAlone, { x: pSel.x, y: pSel.y, o: 1 });
      }
      alone.setAttribute('r', M.r + 6);
      anelloBase.setAttribute('r', M.r + 6);
      const pBase = base ? L.pos.get(base) : null;
      if (pBase) {
        // se l'anello era spento, parte dal pallino della base e scivola con lui
        if (vBase.cur.o <= 0.05) { const nb = nodi.get(base); vBase.cur.x = nb.v.cur.x; vBase.cur.y = nb.v.cur.y; }
        verso(vBase, { x: pBase.x, y: pBase.y, o: 1 });
      } else {
        verso(vBase, { o: 0 });
      }

      aggiornaSelezioneRighe();
      anima(durata);
    }

    function aggiornaSelezioneRighe() {
      for (const [id, r] of righeMap) {
        const si = id === sel;
        r.el.setAttribute('aria-selected', si ? 'true' : 'false');
        r.el.tabIndex = si ? 0 : -1;
      }
    }

    function ordineVisivo() { return sess.repo.ordine.slice().reverse(); }

    function assicuraVisibile(id) {
      const L = layout(sess.repo);
      const p = L.pos.get(id);
      if (!p) return;
      const top = p.y - M.rowH / 2 - 6;
      const bottom = p.y + M.rowH / 2 + 6;
      let dest = null;
      if (top < scorri.scrollTop) dest = Math.max(0, top);
      else if (bottom > scorri.scrollTop + scorri.clientHeight) dest = bottom - scorri.clientHeight;
      if (dest != null) {
        if (typeof scorri.scrollTo === 'function') scorri.scrollTo({ top: dest, behavior: ctx.riduci ? 'auto' : 'smooth' });
        else scorri.scrollTop = dest;
      }
    }

    function seleziona(id, fuoco) {
      if (!sess.repo.commit[id]) return;
      const cambiato = id !== sel;
      sel = id;
      const L = layout(sess.repo);
      const p = L.pos.get(id);
      verso(vSel, { y: p.y - M.rowH / 2, o: 1 });
      verso(vAlone, { x: p.x, y: p.y, o: 1 });
      aggiornaSelezioneRighe();
      anima(ctx.DURATA.normale);
      disegnaFile(cambiato);
      assicuraVisibile(id);
      if (fuoco) { const r = righeMap.get(id); if (r) r.el.focus({ preventScroll: true }); }
      if (cambiato) {
        const c = sess.repo.commit[id];
        const g = c.genitori[0] ? sess.repo.commit[c.genitori[0]] : null;
        const st = Logica.conta(Logica.differenze(g ? g.snapshot : null, c.snapshot));
        ctx.annuncia('Commit ' + c.id + ', «' + c.messaggio + '». ' + (g ? st.piu + ' righe aggiunte e ' + st.meno + ' tolte rispetto al genitore.' : 'Primo commit: tutte le righe sono nuove.'));
      }
    }

    function tastiGrafo(e) {
      const ord = ordineVisivo();
      let i = ord.indexOf(sel);
      if (e.key === 'ArrowDown') i = Math.min(ord.length - 1, i + 1);
      else if (e.key === 'ArrowUp') i = Math.max(0, i - 1);
      else if (e.key === 'Home') i = 0;
      else if (e.key === 'End') i = ord.length - 1;
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); return; }
      else return;
      e.preventDefault();
      seleziona(ord[i], true);
    }

    /* ---------- pannello del file ---------- */

    function disegnaFile(animato) {
      const repo = sess.repo;
      const c = repo.commit[sel];
      if (!c) return;
      const g1 = c.genitori[0] ? repo.commit[c.genitori[0]] : null;
      const diff = Logica.differenze(g1 ? g1.snapshot : null, c.snapshot);
      hashSel.textContent = c.id;
      hashSel.className = 'lab-git-hashsel lab-git-k' + (c.corsia % 4);
      dettMsg.textContent = '«' + c.messaggio + '»';
      dettMeta.textContent = 'di ' + c.autore + ' · creato su ' + c.ramo;
      if (!g1) dettGen.replaceChildren('Primo commit: tutte le righe sono nuove.');
      else if (c.genitori.length > 1) dettGen.replaceChildren('Commit di merge: genitori ', h('code', null, c.genitori[0]), ' e ', h('code', null, c.genitori[1]), '. Qui le differenze rispetto al primo.');
      else dettGen.replaceChildren('Differenze rispetto al genitore ', h('code', null, g1.id), '.');
      const idHead = Logica.tip(repo);
      viaggio.hidden = sel === idHead;
      if (sel !== idHead) {
        const passato = Logica.eAntenato(repo, sel, idHead);
        viaggioTesto.replaceChildren(ctx.inline((passato ? 'Stai guardando il passato.' : 'Stai guardando un\'altra linea della storia.') + ' È solo uno sguardo: i prossimi commit partiranno da `HEAD` (`' + repo.head + '`, `' + idHead + '`).'));
      }
      let k = 0;
      const anim = animato && !ctx.riduci;
      lista.replaceChildren(...diff.map((d) => {
        const cl = ['lab-git-l'];
        if (d.segno === '+') cl.push('lab-git-l--piu');
        if (d.segno === '-') cl.push('lab-git-l--meno');
        if (/^h-|^titolo$/.test(d.id)) cl.push('lab-git-l--testa');
        const li = h('li', { class: cl.join(' ') },
          h('span', { class: 'lab-git-l-segno', 'aria-hidden': 'true' }, d.segno === '+' ? '+' : d.segno === '-' ? '−' : ''),
          h('span', { class: 'lab-git-l-num', 'aria-hidden': 'true' }, d.num == null ? '' : String(d.num)),
          h('span', { class: 'lab-git-l-t' }, d.segno === '+' ? h('span', { class: 'pg-sr' }, 'aggiunta: ') : d.segno === '-' ? h('span', { class: 'pg-sr' }, 'tolta: ') : null, d.t));
        if (anim && d.segno !== ' ') {
          li.classList.add('lab-git-l--entra');
          li.style.animationDelay = (k++ * 60) + 'ms';
        }
        return li;
      }));
      cmdShow.textContent = 'git show ' + c.id;
    }

    /* ---------- terminale ---------- */

    const giaMostrate = new WeakSet();
    function disegnaTerminale() {
      const repo = sess.repo;
      const nodiT = sess.log.map((e) => {
        const corsia = repo.corsie[e.ramo];
        const v = h('div', { class: 'lab-git-t-voce' },
          h('div', { class: 'lab-git-t-cmd' },
            h('span', { class: 'lab-git-t-prompt' }, '~/ricetta (', h('span', { class: 'lab-git-t-ramo lab-git-k' + ((corsia == null ? 0 : corsia) % 4) }, e.ramo), ') $ '),
            e.cmd),
          (e.uscita || []).map((u) => h('div', { class: 'lab-git-t-out' }, u)),
          e.nota ? h('div', { class: 'lab-git-t-nota' }, '# ' + e.nota) : null);
        if (!giaMostrate.has(e)) { giaMostrate.add(e); if (!ctx.riduci) v.classList.add('pg-flash'); }
        return v;
      });
      term.replaceChildren(...nodiT);
      term.scrollTop = term.scrollHeight;
    }

    /* ---------- controlli ---------- */

    function opzione(valore, testoOpz, scelta) {
      const o = h('option', { value: valore }, testoOpz);
      if (scelta) o.selected = true;
      return o;
    }

    function aggiornaControlli() {
      const repo = sess.repo;
      selBranch.replaceChildren(...repo.ordineBranch.map((b) => opzione(b, b, b === repo.head)));
      selBranch.value = repo.head;
      const altri = repo.ordineBranch.filter((b) => b !== repo.head);
      const primaMerge = selMerge.value;
      if (altri.length) {
        selMerge.replaceChildren(...altri.map((b) => opzione(b, b, b === primaMerge)));
        if (altri.indexOf(primaMerge) < 0) selMerge.value = altri[altri.length - 1];
      } else {
        selMerge.replaceChildren(opzione('', 'nessun altro branch', true));
      }
      selMerge.disabled = !altri.length;
      btnMerge.disabled = !altri.length;
      nomeHead.textContent = repo.head;
      const m = Logica.prossimaModifica(repo);
      const lim = repo.ordine.length >= Logica.MAX_COMMIT;
      btnCommit.disabled = lim || !m;
      if (lim) prossimo.replaceChildren('Limite di ' + Logica.MAX_COMMIT + ' commit raggiunto: premi «Da capo».');
      else if (!m) prossimo.replaceChildren('Commit non disponibile qui: prima unisci gli altri branch con un merge.');
      else prossimo.replaceChildren('Prossimo commit: ', h('q', null, m.msg));
      const pieni = repo.ordineBranch.length >= Logica.MAX_BRANCH;
      inNome.disabled = pieni;
      btnBranch.disabled = pieni;
      if (pieni) { inNome.value = ''; inNome.placeholder = 'massimo ' + Logica.MAX_BRANCH + ' branch'; }
      else {
        inNome.placeholder = 'nome del branch';
        if (!nomeToccato || !inNome.value.trim()) { inNome.value = Logica.nomeSuggerito(repo); nomeToccato = false; }
      }
      btnAnnulla.disabled = !sess.passato.length;
      aggiornaBottoniStoria();
    }

    function aggiornaBottoniStoria() {
      const ultimo = Logica.STORIA.length - 1;
      if (storia.suona) btnStoria.textContent = '❚❚ Pausa';
      else if (storia.indice >= ultimo) btnStoria.textContent = '▶ Rivedi la storia';
      else if (storia.indice >= 0) btnStoria.textContent = '▶ Riprendi la storia';
      else btnStoria.textContent = '▶ Racconta: due persone, un progetto';
      lettPasso.textContent = storia.indice >= 0 ? 'passo ' + (storia.indice + 1) + ' di ' + (ultimo + 1) : '';
      btnPasso.disabled = storia.indice >= ultimo && !storia.suona;
      if (btnPasso.disabled && document.activeElement === btnPasso) btnStoria.focus();
    }

    function mostraErrore(testoErr) {
      errore.textContent = testoErr || '';
      if (!testoErr) inNome.removeAttribute('aria-invalid');
    }

    function narra(markup) { spiega.replaceChildren(h('p', null, ctx.inline(markup))); }

    /* ---------- azioni ---------- */

    function durataPer(es) {
      if (!es) return ctx.DURATA.lenta;
      if (es.tipo === 'ff') return ctx.DURATA.narrativa;
      if (es.tipo === 'merge') return ctx.DURATA.lenta + 200;
      return ctx.DURATA.lenta;
    }

    function testoEsito(es) {
      const repo = sess.repo;
      switch (es.tipo) {
        case 'commit':
          commitFatti += 1;
          if (commitFatti === 1) {
            return 'Nuovo {{commit}} `' + es.commit.id + '` su `' + es.ramo + '`: «' + es.commit.messaggio + '». Git ha fotografato `ricetta.txt` e ha legato la foto alla precedente, il suo **genitore**; l\'etichetta `' + es.ramo + '` è avanzata sul commit nuovo, e `HEAD` con lei. Nel pannello del file, in verde le righe aggiunte e in rosso quelle tolte.';
          }
          return 'Nuovo commit `' + es.commit.id + '` su `' + es.ramo + '`: «' + es.commit.messaggio + '». L\'etichetta `' + es.ramo + '` avanza con lui.';
        case 'branch':
          return 'Hai creato il {{branch}} `' + es.nome + '` e ci sei passato: per ora è solo una nuova etichetta sullo stesso commit di `' + es.da + '`. I prossimi commit nasceranno sulla sua corsia, senza toccare `' + es.da + '`.';
        case 'switch':
          return 'Sei passato su `' + es.nome + '`: `HEAD` ora indica `' + es.nome + '`, e il file torna com\'era nel suo ultimo commit, `' + es.commit + '`.';
        case 'ff':
          return '**Fast-forward**: `' + repo.head + '` non aveva commit propri, quindi Git ha soltanto spostato l\'etichetta in avanti, da `' + es.da + '` a `' + es.a + '`. Nessun commit nuovo.';
        case 'merge':
          return '{{merge|Merge}} a tre vie: le due linee si erano separate. Git è ripartito dall\'antenato comune, `' + es.base + '` (il cerchio tratteggiato), ha raccolto le modifiche di entrambe e ha creato `' + es.commit.id + '`, un commit con **due genitori**.';
        case 'aggiornato':
          return 'Niente da unire: tutto quello che c\'è in `' + es.nome + '` è già dentro `' + repo.head + '`. Git risponde che è «già aggiornato».';
        case 'reset':
          return 'Si ricomincia: il repository `ricetta` ha di nuovo due commit su `main`.';
        default:
          return '';
      }
    }

    function azione(a, daStoria) {
      if (!daStoria) interrompiStoria();
      const r = Logica.applica(sess, Object.assign({ autore: 'Tu' }, a));
      const es = r.esito;
      if (es.errore) {
        mostraErrore(es.errore);
        if (a.tipo === 'switch') selBranch.value = sess.repo.head;
        return es;
      }
      mostraErrore('');
      if (es.nulla) { if (es.avviso) narra(es.avviso); return es; }
      sess = r.sess;
      sel = Logica.tip(sess.repo);
      base = es.tipo === 'merge' ? es.base : null;
      if (es.tipo === 'reset') { commitFatti = 0; nomeToccato = false; }
      render(durataPer(es));
      disegnaFile(true);
      disegnaTerminale();
      aggiornaControlli();
      if (es.tipo === 'commit' || es.tipo === 'merge' || es.tipo === 'reset') assicuraVisibile(sel);
      if (!daStoria) narra(testoEsito(es));
      if ((es.tipo === 'merge' || es.tipo === 'ff') && !completato) { completato = true; ctx.completa(); }
      return es;
    }

    function creaBranch() {
      const nome = inNome.value;
      const es = azione({ tipo: 'branch', nome: nome });
      if (es && es.errore) {
        inNome.setAttribute('aria-invalid', 'true');
        inNome.focus();
      } else {
        nomeToccato = false;
        aggiornaControlli();
      }
    }

    function annullaUltima() {
      interrompiStoria();
      const r = Logica.annulla(sess);
      if (!r.esito) return;
      sess = r.sess;
      const p = r.esito.annullata;
      sel = Logica.tip(sess.repo);
      base = null;
      mostraErrore('');
      render(ctx.DURATA.lenta);
      disegnaFile(true);
      disegnaTerminale();
      aggiornaControlli();
      assicuraVisibile(sel);
      const cmd = p.comandi && p.comandi.length ? p.comandi[p.comandi.length - 1].cmd : null;
      if (p.tipo === 'reset') narra('Annullato il «Da capo»: il repository è di nuovo com\'era prima.');
      else narra('Annullato: `' + cmd + '`. Il laboratorio è tornato allo stato precedente; in un repository vero si torna indietro con comandi come `git reset` o `git revert`.');
    }

    /* ---------- storia guidata ---------- */

    function tempoLettura(testoS) { return Math.max(3200, Math.min(9000, String(testoS).length * 38)); }

    function faiPasso() {
      const i = storia.indice + 1;
      const passo = Logica.STORIA[i];
      let es = null;
      if (passo.azione) es = azione(passo.azione, true);
      storia.indice = i;
      const t = TESTI_STORIA[i](es || {});
      narra(t);
      if (!passo.azione) seleziona(Logica.tip(sess.repo), false);
      aggiornaBottoniStoria();
      return t;
    }

    async function suonaStoria() {
      if (storia.suona) { pausaStoria(); return; }
      const ultimo = Logica.STORIA.length - 1;
      if (storia.indice >= ultimo) storia.indice = -1;
      storia.suona = true;
      aggiornaBottoniStoria();
      try {
        while (storia.suona && storia.indice < ultimo) {
          const t = faiPasso();
          if (storia.indice < ultimo) await ctx.attendi(tempoLettura(t));
        }
      } catch (err) {
        if (!ctx.annullato(err)) throw err;
      }
      storia.suona = false;
      aggiornaBottoniStoria();
    }

    function pausaStoria() {
      if (!storia.suona) return;
      storia.suona = false;
      ctx.annulla();
      aggiornaBottoniStoria();
    }

    function passoStoria() {
      pausaStoria();
      if (storia.indice >= Logica.STORIA.length - 1) return;
      faiPasso();
    }

    function interrompiStoria() {
      if (storia.suona) { storia.suona = false; ctx.annulla(); }
      if (storia.indice >= 0) { storia.indice = -1; aggiornaBottoniStoria(); }
    }

    /* ---------- avvio ---------- */

    function ricostruisci() {
      svuotaGrafo();
      render(0);
    }

    misura();
    ricostruisci();
    disegnaFile(false);
    disegnaTerminale();
    aggiornaControlli();
    narra('Il repository `ricetta` contiene già due {{commit}} sul branch `main`. Premi ▶ per la storia di Anna e Luca, oppure prova da te: **+ Commit**, poi **Nuovo branch**, qualche commit e un **Merge**.');

    if (typeof ResizeObserver === 'function') {
      let ultimaLarg = radice.clientWidth;
      new ResizeObserver(() => {
        const w = radice.clientWidth;
        if (Math.abs(w - ultimaLarg) < 2) return;
        ultimaLarg = w;
        if (misura()) ricostruisci();
      }).observe(radice);
    }

    return {};
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('git', { titolo: 'Git, la macchina del tempo del codice', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
