/*
 * Laboratorio «Dal pannello di cavi al programma memorizzato» (capitolo 3).
 *
 * Due modi, scelti con un controllo a segmenti:
 *   A) ENIAC: il programma è nei cavi. Un pannello stilizzato con cinque unità:
 *      per cambiare problema si staccano e si ricollegano i cavi e si girano le manopole.
 *   B) Von Neumann: il programma è nella memoria. La CPU giocattolo (js/lib/cpu-giocattolo.js)
 *      esegue il ciclo prelievo, decodifica, esecuzione; le parole viaggiano sul bus.
 *      Basta un clic su una cella per cambiare il programma.
 *
 * La logica pura qui sotto non tocca il DOM: la provano i test in Node
 * (test/programma-memorizzato.test.js).
 */
(function (root) {
  'use strict';

  const P = 'lab-programma-memorizzato';

  function cpu() {
    if (root.CpuGiocattolo) return root.CpuGiocattolo;
    if (typeof require === 'function') return require('../lib/cpu-giocattolo.js');
    return null;
  }

  /* =====================================================================
   * A) ENIAC: unità, cavi, manopole, esecuzione
   * ===================================================================== */

  // Le cinque unità del pannello, da sinistra a destra (o dall'alto in basso).
  // prese: 'p' = cavo di programma (impulsi di controllo), 'd' = cavo dei dati (numeri).
  const UNITA = [
    { id: 'pp', sigla: 'PP', nome: 'Programmatore principale', prese: ['p'], manopola: 'ripetizioni', posizioni: ['1 volta', '5 volte'] },
    { id: 'tf', sigla: 'TF', nome: 'Tavola delle funzioni', prese: ['p', 'd'], manopola: 'valore', posizioni: ['spenta', 'dà 1'] },
    { id: 'a1', sigla: 'A1', nome: 'Accumulatore 1', prese: ['p', 'd'], manopola: 'operazione', posizioni: ['spento', 'riceve', 'trasmette', 'riceve e trasmette', 'azzera e riceve'] },
    { id: 'mol', sigla: 'M', nome: 'Moltiplicatore', prese: ['p', 'd'], manopola: 'operazione', posizioni: ['spento', 'quadrato'] },
    { id: 'a2', sigla: 'A2', nome: 'Accumulatore 2', prese: ['p', 'd'], manopola: 'operazione', posizioni: ['spento', 'riceve', 'trasmette', 'riceve e trasmette', 'azzera e riceve'] },
  ];
  const PER_ID = Object.fromEntries(UNITA.map((u) => [u.id, u]));

  const PROBLEMI = {
    somma: {
      id: 'somma',
      nome: 'Somma',
      dettaglio: '2 + 3',
      manopole: { pp: 0, tf: 0, a1: 2, mol: 0, a2: 1 },
      valori: { pp: 0, tf: null, a1: 2, mol: null, a2: 3 },
      cavi: [
        { tipo: 'p', da: 'pp', a: 'a1' },
        { tipo: 'p', da: 'a1', a: 'a2' },
        { tipo: 'd', da: 'a1', a: 'a2' },
        { tipo: 'p', da: 'a2', a: 'pp' },
      ],
    },
    quadrati: {
      id: 'quadrati',
      nome: 'Quadrati',
      dettaglio: 'da 1 a 5',
      manopole: { pp: 1, tf: 1, a1: 3, mol: 1, a2: 4 },
      valori: { pp: 0, tf: 1, a1: 0, mol: 0, a2: 0 },
      cavi: [
        { tipo: 'p', da: 'pp', a: 'tf' },
        { tipo: 'p', da: 'tf', a: 'a1' },
        { tipo: 'd', da: 'tf', a: 'a1' },
        { tipo: 'p', da: 'a1', a: 'mol' },
        { tipo: 'd', da: 'a1', a: 'mol' },
        { tipo: 'p', da: 'mol', a: 'a2' },
        { tipo: 'd', da: 'mol', a: 'a2' },
        { tipo: 'p', da: 'a2', a: 'pp' },
      ],
    },
  };

  function chiaveCavo(c) { return c.tipo + ':' + c.da + '>' + c.a; }

  // Che cosa cambia passando da un cablaggio all'altro: cavi da staccare, da lasciare, da collegare.
  function differenzaCavi(prima, dopo) {
    const kDopo = new Set(dopo.map(chiaveCavo));
    const kPrima = new Set(prima.map(chiaveCavo));
    return {
      togli: prima.filter((c) => !kDopo.has(chiaveCavo(c))),
      tieni: prima.filter((c) => kDopo.has(chiaveCavo(c))),
      metti: dopo.filter((c) => !kPrima.has(chiaveCavo(c))),
    };
  }

  // Le manopole da girare (solo quelle che cambiano posizione).
  function differenzaManopole(prima, dopo) {
    return UNITA.filter((u) => (prima[u.id] || 0) !== (dopo[u.id] || 0))
      .map((u) => ({ unita: u.id, da: prima[u.id] || 0, a: dopo[u.id] || 0 }));
  }

  // La sequenza di impulsi e numeri che percorre i cavi quando si avvia il calcolo.
  // Ogni passo: il cavo percorso, l'unità che agisce, i valori mostrati dopo il passo, l'eventuale numero perforato.
  function passiEniac(id) {
    const passi = [];
    if (id === 'somma') {
      passi.push({ cavo: 'p:pp>a1', unita: 'a1', valori: {}, testo: 'Il programmatore principale manda l\'impulso di partenza all\'accumulatore 1.' });
      passi.push({ cavo: 'p:a1>a2', unita: 'a2', valori: {}, testo: 'L\'accumulatore 1 passa l\'impulso all\'accumulatore 2: «preparati a ricevere».' });
      passi.push({ cavo: 'd:a1>a2', unita: 'a2', numero: 2, valori: { a2: 5 }, testo: 'Sul cavo dei dati viaggia il 2: l\'accumulatore 2 lo somma al suo 3 e ottiene 5.' });
      passi.push({ cavo: 'p:a2>pp', unita: 'pp', valori: { pp: 1 }, uscita: 5, testo: 'L\'impulso torna al programmatore principale: 1 ripetizione su 1, il calcolo è finito. Il risultato, 5, viene perforato su una scheda.' });
      return passi;
    }
    if (id === 'quadrati') {
      for (let k = 1; k <= 5; k++) {
        const q = k * k;
        passi.push({ cavo: 'p:pp>tf', unita: 'tf', giro: k, valori: {}, testo: 'Giro ' + k + ' di 5: il programmatore principale avvia la tavola delle funzioni.' });
        passi.push({ cavo: 'p:tf>a1', unita: 'a1', giro: k, valori: {}, testo: 'La tavola passa l\'impulso all\'accumulatore 1.' });
        passi.push({ cavo: 'd:tf>a1', unita: 'a1', giro: k, numero: 1, valori: { a1: k }, testo: 'La tavola trasmette un 1: l\'accumulatore 1 passa da ' + (k - 1) + ' a ' + k + '.' });
        passi.push({ cavo: 'p:a1>mol', unita: 'mol', giro: k, valori: {}, testo: 'L\'accumulatore 1 avvia il moltiplicatore.' });
        passi.push({ cavo: 'd:a1>mol', unita: 'mol', giro: k, numero: k, valori: { mol: q }, testo: 'Il ' + k + ' viaggia verso il moltiplicatore: ' + k + ' × ' + k + ' = ' + q + '.' });
        passi.push({ cavo: 'p:mol>a2', unita: 'a2', giro: k, valori: {}, testo: 'Il moltiplicatore passa l\'impulso all\'accumulatore 2.' });
        passi.push({ cavo: 'd:mol>a2', unita: 'a2', giro: k, numero: q, valori: { a2: q }, uscita: q, testo: 'L\'accumulatore 2 si azzera e riceve ' + q + ', che viene perforato su una scheda.' });
        passi.push({ cavo: 'p:a2>pp', unita: 'pp', giro: k, valori: { pp: k }, testo: 'L\'impulso torna al programmatore principale: ' + k + (k === 1 ? ' ripetizione' : ' ripetizioni') + ' su 5.' + (k < 5 ? ' Si ricomincia.' : ' Fine.') });
      }
      return passi;
    }
    return passi;
  }

  /* ---------- geometria dei cavi (curve di Bézier cubiche) ---------- */

  // verso 'giu': il cavo pende sotto le unità (pannelli affiancati);
  // verso 'destra': il cavo fa un'ansa a destra (pannelli impilati, schermi stretti).
  function controlliCavo(a, b, opz) {
    const o = opz || {};
    const max = o.max == null ? 120 : o.max;
    const extra = o.scarto || 0;
    if (o.verso === 'destra') {
      const s = Math.min(max, 26 + 0.2 * Math.abs(b.y - a.y)) + extra;
      return [a, { x: a.x + s, y: a.y }, { x: b.x + s, y: b.y }, b];
    }
    const s = Math.min(max, 34 + 0.17 * Math.abs(b.x - a.x)) + extra;
    return [a, { x: a.x, y: a.y + s }, { x: b.x, y: b.y + s }, b];
  }

  function puntoBezier(c, t) {
    const u = 1 - t;
    const k0 = u * u * u, k1 = 3 * u * u * t, k2 = 3 * u * t * t, k3 = t * t * t;
    return {
      x: k0 * c[0].x + k1 * c[1].x + k2 * c[2].x + k3 * c[3].x,
      y: k0 * c[0].y + k1 * c[1].y + k2 * c[2].y + k3 * c[3].y,
    };
  }

  function arrotonda(n) { return Math.round(n * 10) / 10; }

  function percorsoCavo(a, b, opz) {
    const c = controlliCavo(a, b, opz);
    return 'M' + arrotonda(c[0].x) + ' ' + arrotonda(c[0].y) +
      ' C' + arrotonda(c[1].x) + ' ' + arrotonda(c[1].y) + ' ' + arrotonda(c[2].x) + ' ' + arrotonda(c[2].y) +
      ' ' + arrotonda(c[3].x) + ' ' + arrotonda(c[3].y);
  }

  // Lunghezza approssimata di una curva (spezzata con n segmenti): serve al tratteggio animato.
  function lunghezzaBezier(c, n) {
    const passi = n || 24;
    let l = 0;
    let p = c[0];
    for (let i = 1; i <= passi; i++) {
      const q = puntoBezier(c, i / passi);
      l += Math.hypot(q.x - p.x, q.y - p.y);
      p = q;
    }
    return l;
  }

  /* =====================================================================
   * B) Von Neumann: bus, fasi, racconto
   * ===================================================================== */

  // Percorso di una parola sul bus: dalla sorgente si raggiunge la corsia del bus,
  // la si percorre e si esce verso la destinazione (come le piste di un circuito stampato).
  function percorsoBus(a, b, asse, orientamento) {
    if (orientamento === 'verticale') return [a, { x: asse, y: a.y }, { x: asse, y: b.y }, b];
    return [a, { x: a.x, y: asse }, { x: b.x, y: asse }, b];
  }

  function lunghezzaPercorso(punti) {
    let l = 0;
    for (let i = 1; i < punti.length; i++) l += Math.hypot(punti[i].x - punti[i - 1].x, punti[i].y - punti[i - 1].y);
    return l;
  }

  // Punto alla frazione t (0..1) della lunghezza di una spezzata, a velocità costante.
  function puntoSuPercorso(punti, t) {
    if (!punti.length) return { x: 0, y: 0 };
    const totale = lunghezzaPercorso(punti);
    if (totale === 0 || t <= 0) return { x: punti[0].x, y: punti[0].y };
    if (t >= 1) { const u = punti[punti.length - 1]; return { x: u.x, y: u.y }; }
    let resto = t * totale;
    for (let i = 1; i < punti.length; i++) {
      const a = punti[i - 1], b = punti[i];
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      if (l === 0) continue;
      if (resto <= l) { const f = resto / l; return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }; }
      resto -= l;
    }
    const u = punti[punti.length - 1];
    return { x: u.x, y: u.y };
  }

  function bin(n, cifre) { return (n >>> 0).toString(2).padStart(cifre, '0').slice(-cifre); }

  // Che cosa fa ogni codice operativo e che cosa indicano i 5 bit dell'indirizzo (per la decodifica).
  const AZIONI = [
    { nome: 'HALT', cosa: 'fermati', arg: '' },
    { nome: 'LOAD', cosa: 'copia nell\'accumulatore un numero preso dalla memoria', arg: 'la cella da leggere' },
    { nome: 'STORE', cosa: 'scrivi l\'accumulatore in una cella', arg: 'la cella da scrivere' },
    { nome: 'ADD', cosa: 'somma all\'accumulatore un numero della memoria', arg: 'la cella del numero da sommare' },
    { nome: 'SUB', cosa: 'sottrai all\'accumulatore un numero della memoria', arg: 'la cella del numero da sottrarre' },
    { nome: 'MUL', cosa: 'moltiplica l\'accumulatore per un numero della memoria', arg: 'la cella del moltiplicatore' },
    { nome: 'JUMP', cosa: 'salta a un\'altra istruzione', arg: 'la cella da cui continuare' },
    { nome: 'JZ', cosa: 'salta, ma solo se l\'accumulatore vale zero', arg: 'la cella da cui continuare in quel caso' },
  ];

  // Il racconto di una fase, con parole nostre (mini-markup: **grassetto**, `codice`).
  function racconta(ev, fase, memPrima) {
    const op = ev.op;
    const arg = ev.arg;
    const mem = memPrima || [];
    if (fase === 'prelievo') {
      return '**Prelievo.** Il contatore di programma vale ' + ev.indirizzo + ': l\'indirizzo ' + ev.indirizzo +
        ' viaggia sul bus fino alla memoria, che risponde con il contenuto della cella, `' + bin(ev.parola, 8) +
        '`. La parola entra nel registro istruzione e il contatore avanza a ' + ((ev.indirizzo + 1) % 32) + '.';
    }
    if (fase === 'decodifica') {
      if (op === 0) return '**Decodifica.** I primi 3 bit, `000`, sono il codice di **HALT**: fermati. Gli altri 5 bit qui non contano.';
      const az = AZIONI[op];
      return '**Decodifica.** I primi 3 bit, `' + bin(op, 3) + '`, sono il codice di **' + az.nome + '**: ' + az.cosa +
        '. Gli altri 5, `' + bin(arg, 5) + '`, valgono ' + arg + ': ' + az.arg + (op === 2 && arg === 31 ? ', cioè l\'uscita.' : '.');
    }
    const a = ev.accPrima;
    const r = ev.accDopo;
    const v = mem[arg] == null ? null : mem[arg];
    switch (op) {
      case 0: return '**Esecuzione.** La macchina si ferma: il programma è finito.';
      case 1: return '**Esecuzione.** La CPU chiede la cella ' + arg + ': il numero ' + r + ' viaggia sul bus e finisce nell\'accumulatore.';
      case 2:
        if (arg === 31) return '**Esecuzione.** L\'accumulatore, ' + r + ', viaggia sul bus fino alla cella 31: è l\'uscita, e il numero viene stampato.';
        return '**Esecuzione.** L\'accumulatore, ' + r + ', viaggia sul bus e viene scritto nella cella ' + arg + ': il numero che c\'era prima è perso.';
      case 3: {
        const x = v == null ? (r - a) & 255 : v;
        return '**Esecuzione.** Dalla cella ' + arg + ' arriva ' + x + ': l\'accumulatore fa ' + a + ' + ' + x + ' = ' + r + '.' +
          (a + x > 255 ? ' Con 8 bit, dopo 255 si riparte da zero.' : '');
      }
      case 4: {
        const x = v == null ? (a - r) & 255 : v;
        return '**Esecuzione.** Dalla cella ' + arg + ' arriva ' + x + ': l\'accumulatore fa ' + a + ' − ' + x + ' = ' + r + '.' +
          (a < x ? ' Sotto lo zero, con 8 bit, si riparte da 255.' : '');
      }
      case 5: {
        const x = v == null ? 0 : v;
        return '**Esecuzione.** Dalla cella ' + arg + ' arriva ' + x + ': l\'accumulatore fa ' + a + ' × ' + x + ' = ' + r + '.' +
          (a * x > 255 ? ' Il risultato vero, ' + (a * x) + ', non sta in 8 bit: restano solo gli ultimi 8.' : '');
      }
      case 6: return '**Esecuzione.** Il contatore di programma diventa ' + arg + ': la prossima istruzione sarà quella della cella ' + arg + '.';
      case 7:
        if (ev.saltato) return '**Esecuzione.** L\'accumulatore vale 0, quindi si salta: il contatore di programma diventa ' + arg + '.';
        return '**Esecuzione.** L\'accumulatore vale ' + r + ', non 0: niente salto, si prosegue con la cella ' + ev.pcDopo + '.';
      default: return '';
    }
  }

  // Le tre fasi di un'istruzione già eseguita da CpuGiocattolo.passo(), con i movimenti sul bus.
  // memPrima è la memoria com'era prima dell'istruzione (serve per sapere che cosa si è letto).
  function fasiIstruzione(ev, memPrima) {
    const mem = memPrima || [];
    const esecuzione = [];
    const letto = mem[ev.arg] == null ? null : mem[ev.arg];
    if (ev.op === 1 || ev.op === 3 || ev.op === 4 || ev.op === 5) {
      esecuzione.push({ tipo: 'indirizzo', da: 'ir', a: 'cella', cella: ev.arg, valore: ev.arg });
      esecuzione.push({ tipo: 'dato', da: 'cella', a: 'acc', cella: ev.arg, valore: ev.op === 1 ? ev.accDopo : letto });
    } else if (ev.op === 2) {
      esecuzione.push({ tipo: 'indirizzo', da: 'ir', a: 'cella', cella: ev.arg, valore: ev.arg });
      esecuzione.push({ tipo: 'dato', da: 'acc', a: 'cella', cella: ev.arg, valore: ev.accDopo });
    } else if (ev.op === 6 || (ev.op === 7 && ev.saltato)) {
      esecuzione.push({ tipo: 'indirizzo', da: 'ir', a: 'pc', valore: ev.arg });
    }
    return [
      {
        fase: 'prelievo',
        movimenti: [
          { tipo: 'indirizzo', da: 'pc', a: 'cella', cella: ev.indirizzo, valore: ev.indirizzo },
          { tipo: 'istruzione', da: 'cella', a: 'ir', cella: ev.indirizzo, valore: ev.parola },
        ],
        testo: racconta(ev, 'prelievo', mem),
      },
      { fase: 'decodifica', movimenti: [], testo: racconta(ev, 'decodifica', mem) },
      { fase: 'esecuzione', movimenti: esecuzione, testo: racconta(ev, 'esecuzione', mem) },
    ];
  }

  // Come mostrare ogni cella: istruzione, dato, vuota o uscita (dipende solo da come è stato scritto il programma:
  // per la memoria sono tutti numeri).
  function ruoliCelle(assemblato) {
    const ruoli = new Array(32).fill('vuota');
    for (const r of (assemblato && assemblato.righe) || []) {
      if (r.indirizzo == null || r.istruzione == null) continue;
      ruoli[r.indirizzo] = r.istruzione === 'DATA' ? 'dato' : 'codice';
    }
    ruoli[31] = 'uscita';
    return ruoli;
  }

  // I nomi del programma (etichette dell'assemblatore) per ogni cella: '' se la cella non ne ha.
  function etichetteCelle(assemblato) {
    const nomi = new Array(32).fill('');
    for (const r of (assemblato && assemblato.righe) || []) {
      if (r.etichetta && r.indirizzo != null && !nomi[r.indirizzo]) nomi[r.indirizzo] = r.etichetta;
    }
    return nomi;
  }

  function disassembla(parola) {
    const op = (parola >> 5) & 7;
    return op === 0 ? 'HALT' : AZIONI[op].nome + ' ' + (parola & 31);
  }

  // Il testo nella cella: per la memoria sono tutti numeri, ma il programmatore sa che cosa ha messo dove.
  function testoCella(parola, ruolo) {
    return ruolo === 'codice' ? disassembla(parola) : String(parola & 255);
  }

  // Descrizione completa di una cella per i lettori di schermo.
  function descriviCella(i, parola, ruolo, etichetta) {
    const nome = 'Cella ' + i + (i === 31 ? ', uscita' : etichetta ? ', ' + etichetta : '');
    let cosa;
    if (ruolo === 'codice') cosa = 'istruzione ' + disassembla(parola);
    else if (ruolo === 'vuota' && !parola) cosa = 'vuota';
    else cosa = 'numero ' + (parola & 255);
    return nome + ': ' + cosa + ' (' + bin(parola, 8) + ')';
  }

  // Come raggruppare gli 8 bit nell'editor: codice operativo e indirizzo per un'istruzione, un solo numero per un dato.
  function gruppiBit(ruolo) {
    if (ruolo === 'codice') {
      return [
        { tipo: 'op', nome: 'codice operativo', da: 0, a: 3 },
        { tipo: 'ind', nome: 'indirizzo', da: 3, a: 8 },
      ];
    }
    return [{ tipo: ruolo === 'uscita' ? 'out' : 'dato', nome: 'numero', da: 0, a: 8 }];
  }

  // Quanto vale il bit i (0 = il più a sinistra) dentro il suo gruppo: in un indirizzo il bit più a destra vale 1.
  function pesoBit(i, gruppo) { return 1 << (gruppo.a - 1 - i); }

  // Accende o spegne un bit; i = 0 è il bit più a sinistra (il più pesante).
  function attivaBit(parola, i) { return (parola ^ (1 << (7 - i))) & 255; }

  // Il bit spento più leggero: accenderlo dà il cambiamento più piccolo (5 diventa 7, 3 diventa 7).
  function suggerisci(parola) {
    const v = parola & 255;
    for (let i = 7; i >= 0; i--) {
      if (!((v >> (7 - i)) & 1)) return { bit: i, peso: 1 << (7 - i), nuovo: v | (1 << (7 - i)) };
    }
    return null;
  }

  // Un elenco di celle detto a parole: «da 0 a 10», «11, 12 e 13», «7 e 8».
  function elencoCelle(lista) {
    const l = (lista || []).slice().sort((a, b) => a - b);
    if (!l.length) return '';
    if (l.length === 1) return String(l[0]);
    const consecutive = l.every((n, i) => i === 0 || n === l[i - 1] + 1);
    if (consecutive && l.length > 3) return 'da ' + l[0] + ' a ' + l[l.length - 1];
    return l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1];
  }

  // Le celle cambiate rispetto al programma originale.
  function celleDiverse(a, b) {
    const out = [];
    for (let i = 0; i < 32; i++) if (((a && a[i]) || 0) !== ((b && b[i]) || 0)) out.push(i);
    return out;
  }

  function formattaSecondi(ms) {
    const s = Math.max(0, Math.round(ms / 100) / 10);
    return s.toFixed(1).replace('.', ',') + ' s';
  }

  // Velocità di «▶ Esegui»: 1 = molto lenta … 5 = turbo (niente voli sul bus: gli stati cambiano e basta).
  const NOMI_VELOCITA = ['', 'molto lenta', 'lenta', 'media', 'veloce', 'turbo'];
  function livello(velocita) {
    const v = Math.round(Number(velocita));
    return Number.isFinite(v) ? Math.min(5, Math.max(1, v)) : 3;
  }
  function nomeVelocita(velocita) { return NOMI_VELOCITA[livello(velocita)]; }
  // Le durate sono quelle dei token --pg-dur-*: in pagina arrivano da ctx.DURATA (stessi valori), qui sotto il riserva per i test.
  const DURATE = { istante: 80, veloce: 180, normale: 350, lenta: 600, narrativa: 1000 };
  // Durata di un volo sul bus (0 = nessun volo).
  function durataVolo(velocita, D) { const d = D || DURATE; return [0, d.narrativa, d.lenta, d.normale, d.veloce, 0][livello(velocita)]; }
  // Sosta dopo ogni fase, perché si veda che cosa è cambiato.
  function pausaFasi(velocita, D) { const d = D || DURATE; return [0, d.narrativa, d.lenta, d.normale, d.veloce, 0][livello(velocita)]; }
  // Sosta dopo ogni istruzione completa: con «turbo» è il solo ritmo, circa 12 istruzioni al secondo.
  function pausaIstruzione(velocita, D) { const d = D || DURATE; return [0, d.lenta, d.normale, d.veloce, d.istante, d.istante][livello(velocita)]; }

  // Dopo tante istruzioni senza HALT, «▶ Esegui» si mette in pausa: un programma cambiato può girare in tondo.
  const LIMITE_ISTRUZIONI = 300;

  const Logica = {
    UNITA: UNITA,
    PROBLEMI: PROBLEMI,
    chiaveCavo: chiaveCavo,
    differenzaCavi: differenzaCavi,
    differenzaManopole: differenzaManopole,
    passiEniac: passiEniac,
    controlliCavo: controlliCavo,
    puntoBezier: puntoBezier,
    percorsoCavo: percorsoCavo,
    lunghezzaBezier: lunghezzaBezier,
    percorsoBus: percorsoBus,
    lunghezzaPercorso: lunghezzaPercorso,
    puntoSuPercorso: puntoSuPercorso,
    racconta: racconta,
    fasiIstruzione: fasiIstruzione,
    ruoliCelle: ruoliCelle,
    etichetteCelle: etichetteCelle,
    disassembla: disassembla,
    testoCella: testoCella,
    descriviCella: descriviCella,
    gruppiBit: gruppiBit,
    pesoBit: pesoBit,
    attivaBit: attivaBit,
    suggerisci: suggerisci,
    elencoCelle: elencoCelle,
    celleDiverse: celleDiverse,
    formattaSecondi: formattaSecondi,
    livello: livello,
    nomeVelocita: nomeVelocita,
    durataVolo: durataVolo,
    pausaFasi: pausaFasi,
    pausaIstruzione: pausaIstruzione,
    LIMITE_ISTRUZIONI: LIMITE_ISTRUZIONI,
  };

  /* =====================================================================
   * Stile (tutte le classi iniziano con lab-programma-memorizzato-)
   * Colori fissi in tutto il laboratorio: ambra = che cosa fare (codice operativo, impulsi di programma),
   * azzurro = indirizzi, verde = numeri (dati), rosa = uscita.
   * ===================================================================== */
  const css = `
.${P} { container: pm / inline-size; font-size: 14px; color: var(--lab-text); }
.${P} *, .${P} *::before, .${P} *::after { box-sizing: border-box; }
.${P} [hidden] { display: none !important; }
.${P}-modi { padding: 14px 18px; }
.${P}-modi .pg-gruppo { display: flex; width: 100%; }
.${P}-modi .pg-btn { flex: 1 1 220px; display: grid; gap: 1px; align-content: center; justify-content: start; text-align: left; white-space: normal; min-height: 58px; padding: 9px 16px; }
.${P}-modo-num { font: 800 13px var(--mono); letter-spacing: .08em; color: var(--trace-2); }
.${P}-modo-tit { font-weight: 700; font-size: 14px; color: var(--lab-bright); }
.${P}-btn-dett { font: 600 13px var(--mono); color: var(--lab-text); }
.${P}-modo .pg-strumenti > .pg-gruppo .pg-btn { flex: 1 1 auto; }
.${P} .pg-btn[aria-pressed="true"] .${P}-btn-dett { color: #d9f3ff; }
.${P}-leg { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 13px; }
.${P}-leg span { display: inline-flex; align-items: center; gap: 7px; }
.${P}-leg i { width: 12px; height: 12px; border-radius: 3px; background: var(--c); box-shadow: 0 0 8px color-mix(in srgb, var(--c) 55%, transparent); }
.${P}-c-op { --c: var(--trace-2); } .${P}-c-ind { --c: var(--trace-3); } .${P}-c-dato { --c: var(--trace-1); } .${P}-c-out { --c: var(--trace-4); }
.${P}-spiega { min-height: 6.4em; }
.${P}-spiega code { white-space: nowrap; }
.${P}-spiega .pg-btn { margin-top: 6px; }

/* ---------- A) il pannello dell'ENIAC ---------- */
.${P}-quadro { position: relative; margin: 16px 18px 4px; padding: 12px 74px 12px 12px; border-radius: 14px; background: linear-gradient(180deg, #0e1715, #090f0e); border: 1px solid var(--lab-line); }
.${P}-unita-lista { position: relative; display: grid; gap: 10px; }
.${P}-unita { position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; grid-template-areas: "testa testa prese" "neon man prese"; align-items: center; gap: 8px 12px; padding: 10px 12px; border-radius: 10px; background: linear-gradient(180deg, #18241f, #121b18); border: 1px solid #263631; }
.${P}-unita::after { content: ""; position: absolute; inset: -1px; border-radius: 10px; border: 2px solid var(--trace-2); opacity: 0; pointer-events: none; }
.${P}-unita.is-attiva::after { animation: ${P}-lampo var(--pg-dur-lenta) ease-out; }
.${P}-unita-testa { grid-area: testa; min-width: 0; }
.${P}-unita-sigla { display: block; font: 800 15px var(--mono); color: var(--lab-bright); letter-spacing: .04em; }
.${P}-unita-nome { display: block; font-size: 13px; line-height: 1.3; color: var(--lab-text); }
.${P}-neon { grid-area: neon; justify-self: start; min-width: 3.4ch; padding: 5px 8px; border-radius: 6px; background: #040907; border: 1px solid #22332d; font: 700 20px/1 var(--mono); text-align: center; font-variant-numeric: tabular-nums; color: var(--trace-1); text-shadow: 0 0 9px color-mix(in srgb, var(--trace-1) 70%, transparent); }
.${P}-neon.is-spento { color: color-mix(in srgb, var(--trace-1) 22%, transparent); text-shadow: none; }
.${P}-manopola { grid-area: man; display: flex; align-items: center; gap: 8px; min-width: 0; }
.${P}-disco { position: relative; flex: none; width: 32px; height: 32px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #44544e, #111917 72%); border: 2px solid #2f403a; transform: rotate(var(--angolo, -120deg)); transition: transform var(--pg-dur-normale) var(--pg-ease-bounce); }
.${P}-disco::after { content: ""; position: absolute; left: 50%; top: 2px; width: 3px; height: 11px; margin-left: -1.5px; border-radius: 2px; background: var(--trace-2); }
.${P}-manopola-testo { font-size: 13px; line-height: 1.2; text-align: left; color: var(--lab-bright); }
.${P}-prese { grid-area: prese; display: flex; flex-direction: column; gap: 8px; }
.${P}-presa-box { display: grid; justify-items: center; gap: 2px; font-size: 13px; line-height: 1; }
.${P}-presa { width: 22px; height: 22px; border-radius: 50%; background: #020504; border: 3px solid var(--c); box-shadow: inset 0 0 0 3px #1a2622; transition: box-shadow var(--pg-dur-veloce) ease; }
.${P}-presa.is-collegata { box-shadow: inset 0 0 0 3px #1a2622, 0 0 10px var(--c); }
.${P}-presa--p { --c: var(--trace-2); } .${P}-presa--d { --c: var(--trace-1); }
.${P}-presa-vuota { width: 22px; height: 22px; }
.${P}-cavi { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.${P}-cavo-ombra { fill: none; stroke: rgba(0, 0, 0, .6); stroke-width: 8; stroke-linecap: round; }
.${P}-cavo-filo { fill: none; stroke: var(--c); stroke-width: 4; stroke-linecap: round; }
.${P}-cavo--p { --c: var(--trace-2); } .${P}-cavo--d { --c: var(--trace-1); }
.${P}-cavo.is-tenuto .${P}-cavo-filo { stroke-dasharray: 2 7; }
.${P}-spina { fill: var(--c); stroke: #050807; stroke-width: 2; transform-box: fill-box; transform-origin: center; }
.${P}-spina.is-innesto { animation: ${P}-innesto var(--pg-dur-normale) var(--pg-ease-bounce); }
.${P}-impulso { fill: #fff8e6; stroke: var(--trace-2); stroke-width: 3; }
.${P}-numero rect { fill: #04120b; stroke: var(--trace-1); stroke-width: 2; }
.${P}-numero text { fill: var(--trace-1); font: 700 13px var(--mono); }
.${P}-conti { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; padding: 12px 18px 16px; }
.${P}-conto { padding: 10px 12px; border-radius: 12px; background: var(--lab-panel); border: 1px solid var(--lab-line); min-width: 0; }
.${P}-conto-t { margin: 0 0 6px; font: 800 13px var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--lab-text); }
.${P}-conto-v { margin: 0; font: 700 15px/1.45 var(--mono); color: var(--lab-bright); font-variant-numeric: tabular-nums; }
.${P}-tempi { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; align-items: center; }
.${P}-cal { position: relative; width: 46px; height: 46px; border-radius: 7px; background: #f3efe4; color: #2a2621; display: grid; place-items: center; font: 800 13px var(--mono); overflow: hidden; perspective: 200px; }
.${P}-cal::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 9px; background: var(--trace-4); }
.${P}-cal span { padding-top: 7px; }
.${P}-cal span.is-giro { animation: ${P}-sfoglia var(--pg-dur-normale) var(--pg-ease-smooth); }
.${P}-qui { font: 700 20px var(--mono); color: var(--trace-1); font-variant-numeric: tabular-nums; }
.${P}-schede { display: flex; flex-wrap: wrap; gap: 6px; min-height: 32px; align-items: center; }
.${P}-num-out { font: 700 16px var(--mono); color: var(--trace-4); padding: 3px 9px; border-radius: 7px; border: 1px solid color-mix(in srgb, var(--trace-4) 55%, transparent); background: color-mix(in srgb, var(--trace-4) 10%, transparent); animation: ${P}-entra var(--pg-dur-normale) var(--pg-ease-smooth); }
.${P}-vuoto { font-size: 13px; color: color-mix(in srgb, var(--lab-text) 80%, transparent); }
@container pm (max-width: 419px) {
  .${P}-quadro { padding-right: 62px; }
  .${P}-unita { grid-template-areas: "testa testa prese" "neon disco prese" "mtesto mtesto prese"; gap: 6px 10px; }
  .${P}-manopola { display: contents; }
  .${P}-disco { grid-area: disco; justify-self: start; }
  .${P}-manopola-testo { grid-area: mtesto; }
}
@container pm (min-width: 620px) {
  .${P}-quadro { padding: 14px 14px 120px; }
  .${P}-unita-lista { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .${P}-unita { grid-template-columns: 1fr; grid-template-areas: "testa" "neon" "man" "prese"; justify-items: center; align-content: start; text-align: center; gap: 10px; padding: 12px 8px 12px; min-height: 236px; }
  .${P}-neon { justify-self: center; }
  .${P}-manopola { display: grid; justify-items: center; gap: 3px; min-width: 74px; }
  .${P}-manopola-testo { text-align: center; }
  .${P}-unita-nome { min-height: 2.6em; }
  .${P}-prese { flex-direction: row; gap: 14px; margin-top: 4px; }
}

/* ---------- B) la macchina di von Neumann ---------- */
.${P}-vel { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
.${P}-vel .pg-cursore { height: 40px; margin: 0; cursor: pointer; }
.${P}-vel .pg-lettura { min-width: 10ch; }
.${P}-banco { position: relative; display: grid; gap: 12px; padding: 16px 18px 18px; grid-template-columns: minmax(0, 1fr); grid-template-areas: "cpu" "bus" "mem" "out"; }
.${P}-sez-t { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 2px 10px; margin: 0 0 8px; font: 800 13px var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--lab-bright); }
.${P}-sez-t small { font: 500 13px var(--font); letter-spacing: 0; text-transform: none; color: var(--lab-text); }
.${P}-mem { grid-area: mem; min-width: 0; }
.${P}-mem-area { position: relative; }
.${P}-griglia { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.${P}-griglia > li { min-width: 0; container: pmc / inline-size; }
.${P}-griglia > li.${P}-editor-li { grid-column: 1 / -1; container-type: normal; }
.${P}-cella { position: relative; width: 100%; min-height: 44px; display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-areas: "ind eti" "dec dec" "bit bit"; gap: 3px 6px; align-items: center; padding: 6px 7px 7px; border-radius: 8px; border: 1px solid var(--lab-line); background: var(--lab-panel); color: var(--lab-text); font: 13px/1.25 var(--mono); text-align: left; cursor: pointer; transition: border-color var(--pg-dur-veloce) ease, background-color var(--pg-dur-veloce) ease, box-shadow var(--pg-dur-veloce) ease; }
.${P}-cella:hover { border-color: color-mix(in srgb, var(--lab-bright) 45%, var(--lab-line)); }
.${P}-cella::before { content: ""; position: absolute; left: -1px; top: 7px; bottom: 7px; width: 3px; border-radius: 0 3px 3px 0; background: var(--lab-bright); opacity: 0; transition: opacity var(--pg-dur-veloce) ease; }
.${P}-cella.is-cambiata::before { opacity: 1; }
.${P}-cella::after { content: ""; position: absolute; inset: -2px; border-radius: 9px; border: 2px solid var(--lampo, var(--trace-1)); opacity: 0; pointer-events: none; }
.${P}-cella.is-lampo::after, .${P}-reg.is-lampo::after { animation: ${P}-lampo var(--pg-dur-lenta) ease-out; }
.${P}-cella.is-sorgente, .${P}-reg.is-sorgente { border-color: var(--evid, var(--trace-1)); box-shadow: 0 0 0 1px var(--evid, var(--trace-1)), 0 0 14px color-mix(in srgb, var(--evid, var(--trace-1)) 28%, transparent); }
.${P}-cella.is-aperta { border-color: var(--lab-bright); background: color-mix(in srgb, var(--lab-bright) 9%, var(--lab-panel)); }
.${P}-cella-ind { grid-area: ind; color: var(--trace-3); }
.${P}-cella-eti { grid-area: eti; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; color: color-mix(in srgb, var(--lab-text) 90%, transparent); }
.${P}-cella-dec { grid-area: dec; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; color: var(--lab-bright); }
.${P}-cella--vuota .${P}-cella-dec { font-weight: 400; color: color-mix(in srgb, var(--lab-text) 72%, transparent); }
.${P}-cella--dato .${P}-cella-dec { color: var(--trace-1); }
.${P}-cella--uscita { border-color: color-mix(in srgb, var(--trace-4) 50%, var(--lab-line)); }
.${P}-cella--uscita .${P}-cella-dec, .${P}-cella--uscita .${P}-cella-eti { color: var(--trace-4); font-weight: 700; }
.${P}-cella-bit { grid-area: bit; display: flex; gap: 2px; padding-top: 1px; }
.${P}-b { flex: 1 1 0; max-width: 10px; aspect-ratio: 1; border-radius: 2px; background: #1b2824; --c: var(--trace-3); }
.${P}-cella--codice .${P}-b:nth-child(-n+3) { --c: var(--trace-2); }
.${P}-cella--codice .${P}-b:nth-child(3) { margin-right: 4px; }
.${P}-cella--dato .${P}-b, .${P}-cella--vuota .${P}-b { --c: var(--trace-1); }
.${P}-cella--uscita .${P}-b { --c: var(--trace-4); }
.${P}-b.is-1 { background: var(--c); box-shadow: 0 0 5px color-mix(in srgb, var(--c) 65%, transparent); }
@container pmc (min-width: 150px) {
  .${P}-cella { grid-template-columns: auto auto minmax(0, 1fr); grid-template-areas: "ind dec eti" "bit bit bit"; column-gap: 8px; }
}
.${P}-cursore { position: absolute; left: 0; top: 0; width: 0; height: 0; border: 2px solid var(--trace-3); border-radius: 11px; pointer-events: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--trace-3) 22%, transparent), 0 0 18px color-mix(in srgb, var(--trace-3) 40%, transparent); transition: transform var(--pg-dur-normale) var(--pg-ease-smooth); }
.${P}-bus { grid-area: bus; position: relative; min-height: 46px; }
.${P}-attacchi { position: absolute; left: 0; top: 0; pointer-events: none; overflow: visible; }
.${P}-attacco { stroke-width: 2; stroke-linecap: round; opacity: .55; }
.${P}-attacco-nodo { stroke: var(--lab-bg); stroke-width: 2; }
.${P}-corsia { position: absolute; left: 0; right: 0; height: 6px; border-radius: 3px; background: color-mix(in srgb, var(--c) 24%, #0b1411); }
.${P}-corsia::after { content: ""; position: absolute; inset: -2px; border-radius: 4px; background: var(--c); box-shadow: 0 0 12px var(--c); opacity: 0; transition: opacity var(--pg-dur-veloce) ease; }
.${P}-corsia.is-attiva::after { opacity: .85; }
.${P}-corsia--ind { --c: var(--trace-3); top: 8px; } .${P}-corsia--dati { --c: var(--trace-1); top: 32px; }
.${P}-corsia-t { position: absolute; z-index: 1; right: 0; top: 3px; transform: translateY(-50%); padding: 2px 0 2px 8px; font: 600 13px/1 var(--mono); color: var(--c); background: var(--lab-bg); }
.${P}-cpu { grid-area: cpu; display: grid; gap: 10px; align-content: start; padding: 12px; border-radius: 14px; background: var(--lab-panel); border: 1px solid var(--lab-line); min-width: 0; }
.${P}-cpu .${P}-sez-t, .${P}-out .${P}-sez-t { margin: 0; }
.${P}-regs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.${P}-reg { position: relative; display: grid; grid-template-areas: "nome" "desc" "val" "sub"; align-content: start; gap: 2px; padding: 8px 10px; border-radius: 10px; background: #060c0a; border: 1px solid var(--lab-line); min-width: 0; --lampo: var(--c); --evid: var(--c); transition: border-color var(--pg-dur-veloce) ease, box-shadow var(--pg-dur-veloce) ease; }
.${P}-reg::after { content: ""; position: absolute; inset: -2px; border-radius: 11px; border: 2px solid var(--c); opacity: 0; pointer-events: none; }
.${P}-reg--pc { --c: var(--trace-3); } .${P}-reg--ir { --c: var(--trace-2); } .${P}-reg--acc { --c: var(--trace-1); }
.${P}-reg-nome { grid-area: nome; font: 800 14px var(--mono); color: var(--c); }
.${P}-reg-desc { grid-area: desc; font-size: 13px; line-height: 1.25; color: var(--lab-text); }
.${P}-reg-val { grid-area: val; justify-self: start; font: 700 20px/1.25 var(--mono); color: var(--lab-bright); font-variant-numeric: tabular-nums; white-space: nowrap; }
.${P}-reg--ir .${P}-reg-val { font-size: 16px; letter-spacing: .02em; }
.${P}-reg-sub { grid-area: sub; min-width: 0; font: 13px var(--mono); color: var(--lab-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.${P}-op { color: var(--trace-2); transition: text-shadow var(--pg-dur-veloce) ease; } .${P}-arg { color: var(--trace-3); transition: text-shadow var(--pg-dur-veloce) ease; }
.${P}-reg-sub .${P}-op, .${P}-reg-sub .${P}-arg { font-weight: 700; }
.${P}-reg--ir.is-decodifica .${P}-op { text-shadow: 0 0 10px var(--trace-2); }
.${P}-reg--ir.is-decodifica .${P}-arg { text-shadow: 0 0 10px var(--trace-3); }
.${P}-fasi { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.${P}-fase { position: relative; padding: 7px 4px; border-radius: 8px; border: 1px solid var(--lab-line); text-align: center; font-size: 13px; line-height: 1.2; color: var(--lab-text); transition: background-color var(--pg-dur-veloce) ease, color var(--pg-dur-veloce) ease, border-color var(--pg-dur-veloce) ease; }
.${P}-fase.is-attiva { background: var(--lab-bright); color: #06120d; border-color: var(--lab-bright); font-weight: 700; }
.${P}-fase.is-fatta { color: var(--lab-bright); border-color: color-mix(in srgb, var(--lab-bright) 35%, var(--lab-line)); }
.${P}-fase.is-fatta::after { content: ""; position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; border-radius: 50%; background: var(--trace-1); box-shadow: 0 0 6px var(--trace-1); }
.${P}-out { grid-area: out; display: grid; gap: 8px; align-content: start; padding: 12px; border-radius: 14px; background: var(--lab-panel); border: 1px solid color-mix(in srgb, var(--trace-4) 35%, var(--lab-line)); min-width: 0; }
.${P}-out p { margin: 0; }
.${P}-prima { font: 13px var(--mono); color: var(--lab-text); }
.${P}-prima b { color: var(--trace-4); }
.${P}-stato { font: 700 13px/1.35 var(--mono); color: var(--lab-text); }
.${P}-stato.is-fermo { color: var(--trace-4); }
.${P}-tempo { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 3px 12px; align-items: baseline; padding: 9px 11px; border-radius: 10px; background: #060c0a; border: 1px solid var(--lab-line); font-size: 13px; }
.${P}-tempo-t { grid-column: 1 / -1; margin-bottom: 2px; font: 800 13px var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--lab-text); }
.${P}-tempo b { color: var(--lab-bright); }
.${P}-tempo strong { font: 700 16px var(--mono); color: var(--trace-1); font-variant-numeric: tabular-nums; }
.${P}-pacchetto { position: absolute; left: 0; top: 0; z-index: 3; pointer-events: none; padding: 3px 8px; border-radius: 7px; border: 2px solid var(--c); background: #03100b; color: var(--c); font: 700 13px/1.3 var(--mono); white-space: nowrap; box-shadow: 0 0 16px color-mix(in srgb, var(--c) 55%, transparent); }
.${P}-pacchetto--indirizzo { --c: var(--trace-3); } .${P}-pacchetto--dato { --c: var(--trace-1); } .${P}-pacchetto--istruzione { --c: var(--trace-2); } .${P}-pacchetto--uscita { --c: var(--trace-4); }
.${P}-editor { margin: 4px 0 6px; padding: 12px 14px; border-radius: 12px; background: var(--lab-raised); border: 1px solid color-mix(in srgb, var(--lab-bright) 34%, var(--lab-line)); display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; animation: ${P}-entra var(--pg-dur-normale) var(--pg-ease-smooth); }
.${P}-editor-t { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; margin: 0; font-weight: 700; color: var(--lab-bright); }
.${P}-editor-t small { font-size: 13px; font-weight: 400; color: var(--lab-text); }
.${P}-ebits { display: flex; flex-wrap: wrap; gap: 10px 20px; }
.${P}-ecampo { display: grid; gap: 4px; align-content: start; --c: var(--trace-1); }
.${P}-ecampo--op { --c: var(--trace-2); } .${P}-ecampo--ind { --c: var(--trace-3); } .${P}-ecampo--out { --c: var(--trace-4); }
.${P}-ecampo-t { font-size: 13px; font-weight: 700; color: var(--c); }
.${P}-ecampo-b { display: grid; grid-auto-flow: column; grid-auto-columns: 40px; gap: 4px; }
.${P}-ebit-box { display: grid; justify-items: center; gap: 2px; }
.${P}-ebit { width: 40px; min-width: 40px; padding: 0; font: 700 16px var(--mono); }
.${P} .${P}-ebit[aria-pressed="true"] { background: color-mix(in srgb, var(--c) 30%, var(--lab-raised)); border-color: var(--c); color: #fff; }
.${P} .${P}-ebit[aria-pressed="false"] { background: #070d0b; color: color-mix(in srgb, var(--lab-text) 80%, transparent); }
.${P}-ebit-peso { font: 13px var(--mono); color: color-mix(in srgb, var(--lab-text) 85%, transparent); }
.${P}-eletture { display: flex; flex-wrap: wrap; gap: 4px 18px; margin: 0; font: 13px var(--mono); color: var(--lab-text); }
.${P}-eletture b { color: var(--lab-bright); }
.${P}-ecodici { display: flex; flex-wrap: wrap; gap: 2px 14px; margin: 0; font: 13px/1.5 var(--mono); color: var(--lab-text); }
.${P}-ecodici span { white-space: nowrap; }
.${P}-ecodici b { color: var(--trace-2); font-weight: 700; }
.${P}-ecomandi { display: flex; flex-wrap: wrap; gap: 8px; }
.${P}-spiega p + p { margin-top: .5em; }
@container pm (max-width: 559px) {
  .${P}-banco { padding: 14px 14px 16px; gap: 10px; }
  .${P}-cella { padding: 5px 6px 6px; }
  .${P}-editor { padding: 12px; }
}
@container pm (max-width: 459px) {
  .${P}-ecampo--dato .${P}-ecampo-b, .${P}-ecampo--out .${P}-ecampo-b { grid-auto-flow: row; grid-template-columns: repeat(4, 40px); }
}
@container pm (max-width: 379px) {
  .${P}-griglia { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .${P}-regs { grid-template-columns: 1fr 1fr; }
  .${P}-reg--ir { grid-column: 1 / -1; order: -1; }
}
@container pm (min-width: 820px) {
  .${P}-banco { grid-template-columns: minmax(0, 1.9fr) 64px minmax(0, 1fr); grid-template-areas: "mem bus cpu" "mem bus out"; grid-template-rows: auto 1fr; align-items: start; column-gap: 10px; }
  .${P}-bus { min-height: 0; align-self: stretch; margin-top: 30px; }
  .${P}-corsia { left: auto; right: auto; top: 0; bottom: 0; width: 6px; height: auto; }
  .${P}-corsia--ind { left: 16px; } .${P}-corsia--dati { left: 42px; }
  .${P}-corsia-t { right: auto; top: 50%; left: 50%; padding: 8px 0; writing-mode: vertical-rl; transform: translate(-50%, -50%); }
  .${P}-regs { grid-template-columns: 1fr; }
  .${P}-reg { grid-template-columns: auto minmax(0, 1fr) auto; grid-template-areas: "nome desc desc" "nome val sub"; column-gap: 12px; align-items: center; }
  .${P}-reg-nome { font-size: 16px; min-width: 3ch; }
  .${P}-reg-sub { text-align: right; }
}
@keyframes ${P}-lampo { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.06); } }
@keyframes ${P}-innesto { 0% { transform: scale(1.8); } 100% { transform: scale(1); } }
@keyframes ${P}-entra { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes ${P}-sfoglia { from { opacity: 0; transform: rotateX(-80deg); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .${P} *, .${P} *::before, .${P} *::after { transition-duration: 1ms !important; animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
}
`;

  /* =====================================================================
   * Interfaccia
   * ===================================================================== */

  const GIORNI = ['LUN', 'MAR', 'MER'];

  function testoSemplice(t) { return String(t || '').replace(/\*\*/g, '').replace(/`/g, ''); }

  function angoloManopola(i, n) { return n <= 1 ? 0 : -120 + i * 240 / (n - 1); }

  function monta(el, ctx) {
    const { h } = ctx;
    const radice = h('div', { class: P });
    el.append(radice);

    // Un solo flusso animato alla volta: un'azione nuova interrompe quella in corso.
    // fn riceve vivo(): diventa falso appena un'altra azione prende il suo posto.
    let coda = Promise.resolve();
    let gen = 0;
    function esclusivo(fn) {
      const mio = ++gen;
      ctx.annulla();
      coda = coda.then(async () => {
        if (mio !== gen) return;
        try { await fn(() => mio === gen); } catch (err) { if (!ctx.annullato(err)) console.error(err); }
      });
      return coda;
    }

    const modi = [
      { id: 'eniac', num: 'A · ENIAC 1946', tit: 'Il programma è nei cavi' },
      { id: 'vn', num: 'B · Von Neumann 1945', tit: 'Il programma è nella memoria' },
    ];
    const bottoni = {};
    const gruppo = h('div', { class: 'pg-gruppo', role: 'group', 'aria-label': 'Scegli la macchina' }, modi.map((m) => {
      bottoni[m.id] = h('button', { type: 'button', class: 'pg-btn', 'aria-pressed': 'false', onclick: () => vai(m.id) },
        h('span', { class: P + '-modo-num' }, m.num), h('span', { class: P + '-modo-tit' }, m.tit));
      return bottoni[m.id];
    }));
    radice.append(h('div', { class: 'pg-strumenti ' + P + '-modi' }, gruppo));

    let modo = null;
    const eniac = creaEniac(ctx, { esclusivo: esclusivo, vai: (id) => { vai(id); bottoni[id].focus(); } });
    const vn = creaVonNeumann(ctx, { esclusivo: esclusivo });
    radice.append(eniac.el, vn.el);

    function vai(id) {
      if (modo === id) return;
      const vecchio = modo === 'eniac' ? eniac : modo === 'vn' ? vn : null;
      if (vecchio) vecchio.nascondi();
      esclusivo(async () => {});
      modo = id;
      for (const m of modi) bottoni[m.id].setAttribute('aria-pressed', String(m.id === id));
      eniac.el.hidden = id !== 'eniac';
      vn.el.hidden = id !== 'vn';
      (id === 'eniac' ? eniac : vn).mostra();
      ctx.annuncia(id === 'eniac' ? 'ENIAC: il programma è nei cavi.' : 'Macchina di von Neumann: il programma è nella memoria.');
    }
    vai('eniac');

    return {
      pausa() { /* il motore ferma già attese e animazioni */ },
      riprendi() { eniac.misura(); vn.misura(); },
    };
  }

  /* ---------- A) ENIAC: il programma è nei cavi ---------- */

  function creaEniac(ctx, api) {
    const { h, s } = ctx;
    let attuale = 'somma';
    let valori = Object.assign({}, PROBLEMI.somma.valori);
    let manopole = Object.assign({}, PROBLEMI.somma.manopole);
    let caviAttivi = PROBLEMI.somma.cavi.map((c) => Object.assign({}, c));
    let uscite = [];
    let verso = 'giu';
    let visibile = false;
    const unitaEl = {};
    const caviEl = {};

    const idEt = ctx.uid(P + '-prob');
    const btn = {};
    for (const id of Object.keys(PROBLEMI)) {
      const pb = PROBLEMI[id];
      btn[id] = h('button', { type: 'button', class: 'pg-btn', 'aria-pressed': String(id === attuale), onclick: () => scegli(id) },
        h('span', null, pb.nome), h('span', { class: P + '-btn-dett' }, pb.dettaglio));
    }
    const bAvvia = h('button', { type: 'button', class: 'pg-btn pg-btn--primario', onclick: () => api.esclusivo((vivo) => calcola(vivo)) }, '▶ Avvia il calcolo');
    const barra = h('div', { class: 'pg-strumenti' },
      h('span', { class: 'pg-etichetta', id: idEt }, 'Problema'),
      h('div', { class: 'pg-gruppo', role: 'group', 'aria-labelledby': idEt }, btn.somma, btn.quadrati),
      h('span', { class: 'pg-spazio' }),
      bAvvia);
    const legenda = h('div', { class: 'pg-strumenti ' + P + '-leg' },
      h('span', { class: P + '-c-op' }, h('i'), 'cavo di programma: quale unità deve agire'),
      h('span', { class: P + '-c-dato' }, h('i'), 'cavo dei dati: porta i numeri'),
      h('span', { class: P + '-c-out' }, h('i'), 'risultato perforato'));

    function creaUnita(u) {
      const neon = h('span', { class: P + '-neon', 'aria-hidden': 'true' });
      const disco = h('span', { class: P + '-disco', 'aria-hidden': 'true' });
      const testoMan = h('span', { class: P + '-manopola-testo' });
      const prese = {};
      const preseBox = h('div', { class: P + '-prese' }, ['p', 'd'].map((t) => {
        if (!u.prese.includes(t)) return h('span', { class: P + '-presa-box', 'aria-hidden': 'true' }, h('span', null, ''), h('span', { class: P + '-presa-vuota' }));
        prese[t] = h('span', { class: P + '-presa ' + P + '-presa--' + t });
        return h('span', { class: P + '-presa-box' }, h('span', null, t === 'p' ? 'prog.' : 'dati'), prese[t]);
      }));
      const box = h('div', { class: P + '-unita', 'data-u': u.id },
        h('div', { class: P + '-unita-testa' }, h('span', { class: P + '-unita-sigla' }, u.sigla), h('span', { class: P + '-unita-nome' }, u.nome)),
        neon,
        h('div', { class: P + '-manopola', title: u.manopola }, disco, testoMan),
        preseBox);
      unitaEl[u.id] = { box: box, neon: neon, disco: disco, testoMan: testoMan, prese: prese };
      return box;
    }

    const svg = s('svg', { class: P + '-cavi', 'aria-hidden': 'true', focusable: 'false' });
    const gCavi = s('g');
    const gMoto = s('g');
    svg.append(gCavi, gMoto);
    const descr = h('p', { class: 'pg-sr' });
    const quadro = h('div', { class: P + '-quadro' }, h('div', { class: P + '-unita-lista' }, UNITA.map(creaUnita)), svg, descr);

    const vLavoro = h('p', { class: P + '-conto-v' }, 'Il pannello è cablato per la somma.');
    const cal = h('span', { class: P + '-cal', 'aria-hidden': 'true' }, h('span', null, GIORNI[0]));
    const qui = h('span', { class: P + '-qui' }, '0,0 s');
    const schede = h('div', { class: P + '-schede', 'aria-live': 'off' });
    const conti = h('div', { class: P + '-conti' },
      h('div', { class: P + '-conto' }, h('p', { class: P + '-conto-t' }, 'Ricablaggio'), vLavoro),
      h('div', { class: P + '-conto' }, h('p', { class: P + '-conto-t' }, 'Per cambiare problema'),
        h('div', { class: P + '-tempi' },
          cal, h('p', { class: P + '-conto-v' }, 'ENIAC vero: ', h('strong', null, 'giorni')),
          h('span', { class: P + '-conto-v' }, 'Qui:'), qui)),
      h('div', { class: P + '-conto' }, h('p', { class: P + '-conto-t' }, 'Schede perforate'), schede));
    const spiega = h('div', { class: 'pg-spiega ' + P + '-spiega' });
    const el = h('div', { class: P + '-modo', 'data-modo': 'eniac', hidden: true }, barra, legenda, quadro, conti, spiega);

    function racconto(testo, extra) {
      spiega.replaceChildren(...[h('p', null, ctx.inline(testo)), extra].filter(Boolean));
    }
    const nomeU = (id) => PER_ID[id].nome.toLowerCase();

    function testoNeon(id, v) {
      if (v == null) return '––';
      if (id === 'pp') return v + '/' + (manopole.pp ? 5 : 1);
      return String(v).padStart(2, '0');
    }

    function aggiornaPrese() {
      for (const u of UNITA) {
        for (const t of Object.keys(unitaEl[u.id].prese)) {
          unitaEl[u.id].prese[t].classList.toggle('is-collegata', caviAttivi.some((c) => c.tipo === t && (c.da === u.id || c.a === u.id)));
        }
      }
      descr.textContent = 'Collegamenti del pannello: ' + caviAttivi.map((c) => 'da ' + nomeU(c.da) + ' a ' + nomeU(c.a) + ' (' + (c.tipo === 'p' ? 'programma' : 'dati') + ')').join('; ') + '.';
    }

    function disegnaStato() {
      for (const u of UNITA) {
        const e = unitaEl[u.id];
        const v = valori[u.id];
        e.neon.textContent = testoNeon(u.id, v);
        e.neon.classList.toggle('is-spento', v == null);
        const i = manopole[u.id] || 0;
        e.disco.style.setProperty('--angolo', angoloManopola(i, u.posizioni.length) + 'deg');
        e.testoMan.textContent = u.posizioni[i];
      }
      aggiornaPrese();
    }

    function disegnaSchede(nuova) {
      if (!uscite.length) { schede.replaceChildren(h('span', { class: P + '-vuoto' }, 'Nessuna scheda, per ora.')); return; }
      schede.replaceChildren(...uscite.map((n, i) => h('span', { class: P + '-num-out', style: nuova && i === uscite.length - 1 ? null : 'animation: none' }, String(n))));
    }

    function lampo(nodo) {
      nodo.classList.remove('is-attiva');
      requestAnimationFrame(() => nodo.classList.add('is-attiva'));
      setTimeout(() => nodo.classList.remove('is-attiva'), ctx.DURATA.lenta + 50);
    }

    /* geometria dei cavi */
    function centroPresa(uid, tipo) {
      const presa = unitaEl[uid].prese[tipo];
      const r = presa.getBoundingClientRect();
      const q = quadro.getBoundingClientRect();
      return { x: r.left + r.width / 2 - q.left - quadro.clientLeft, y: r.top + r.height / 2 - q.top - quadro.clientTop };
    }

    function geometriaCavo(rec) {
      const a = centroPresa(rec.c.da, rec.c.tipo);
      const b = centroPresa(rec.c.a, rec.c.tipo);
      const opz = { verso: verso, max: verso === 'giu' ? 118 : 72, scarto: rec.c.tipo === 'd' ? 9 : 0 };
      rec.ctrl = controlliCavo(a, b, opz);
      const d = percorsoCavo(a, b, opz);
      rec.ombra.setAttribute('d', d);
      rec.filo.setAttribute('d', d);
      rec.L = typeof rec.filo.getTotalLength === 'function' ? rec.filo.getTotalLength() : lunghezzaBezier(rec.ctrl);
      rec.spinaA.setAttribute('cx', a.x);
      rec.spinaA.setAttribute('cy', a.y);
      if (!rec.inMoto) { rec.spinaB.setAttribute('cx', b.x); rec.spinaB.setAttribute('cy', b.y); }
    }

    function punto(rec, l) {
      const x = Math.max(0, Math.min(rec.L, l));
      if (typeof rec.filo.getPointAtLength === 'function') { const p = rec.filo.getPointAtLength(x); return { x: p.x, y: p.y }; }
      return puntoBezier(rec.ctrl, rec.L ? x / rec.L : 0);
    }

    function creaCavo(c) {
      const k = chiaveCavo(c);
      const rec = {
        c: c, k: k, inMoto: false, L: 0, ctrl: null,
        ombra: s('path', { class: P + '-cavo-ombra' }),
        filo: s('path', { class: P + '-cavo-filo' }),
        spinaA: s('circle', { class: P + '-spina', r: 6 }),
        spinaB: s('circle', { class: P + '-spina', r: 6 }),
      };
      rec.g = s('g', { class: P + '-cavo ' + P + '-cavo--' + c.tipo, 'data-k': k }, rec.ombra, rec.filo, rec.spinaA, rec.spinaB);
      gCavi.append(rec.g);
      caviEl[k] = rec;
      if (visibile) geometriaCavo(rec);
      return rec;
    }

    function tratteggio(rec, off) {
      const v = off == null ? '' : rec.L + ' ' + (rec.L + 4);
      rec.filo.style.strokeDasharray = v;
      rec.ombra.style.strokeDasharray = v;
      rec.filo.style.strokeDashoffset = off == null ? '' : off;
      rec.ombra.style.strokeDashoffset = off == null ? '' : off;
    }

    // Riporta i cavi disegnati allo stato di caviAttivi (dopo un'interruzione o al primo disegno).
    function allineaCavi() {
      const voluti = new Set(caviAttivi.map(chiaveCavo));
      for (const k of Object.keys(caviEl)) if (!voluti.has(k)) { caviEl[k].g.remove(); delete caviEl[k]; }
      for (const c of caviAttivi) if (!caviEl[chiaveCavo(c)]) creaCavo(c);
      for (const k of Object.keys(caviEl)) {
        const rec = caviEl[k];
        rec.inMoto = false;
        tratteggio(rec, null);
        rec.spinaA.style.opacity = '';
        if (visibile) geometriaCavo(rec);
      }
      aggiornaPrese();
    }

    function misura() {
      if (!visibile || !quadro.isConnected || !quadro.clientWidth) return;
      const r0 = unitaEl.pp.box.getBoundingClientRect();
      const r1 = unitaEl.tf.box.getBoundingClientRect();
      verso = Math.abs(r0.top - r1.top) < 4 ? 'giu' : 'destra';
      svg.setAttribute('viewBox', '0 0 ' + quadro.clientWidth + ' ' + quadro.clientHeight);
      for (const k of Object.keys(caviEl)) geometriaCavo(caviEl[k]);
    }
    let rafMisura = 0;
    const pianifica = () => { if (!rafMisura) rafMisura = requestAnimationFrame(() => { rafMisura = 0; misura(); }); };
    if (typeof ResizeObserver === 'function') new ResizeObserver(pianifica).observe(quadro);
    else window.addEventListener('resize', pianifica);

    /* ricablaggio animato */
    async function stacca(c) {
      const rec = caviEl[chiaveCavo(c)];
      if (!rec) return;
      if (!ctx.riduci && rec.L) {
        rec.inMoto = true;
        tratteggio(rec, 0);
        await ctx.anima({
          durata: ctx.DURATA.normale,
          easing: 'sharp',
          aggiorna(t) {
            const off = rec.L * t;
            rec.filo.style.strokeDashoffset = off;
            rec.ombra.style.strokeDashoffset = off;
            const p = punto(rec, rec.L * (1 - t));
            rec.spinaB.setAttribute('cx', p.x);
            rec.spinaB.setAttribute('cy', p.y);
            rec.spinaA.style.opacity = t > 0.85 ? String(Math.max(0, (1 - t) / 0.15)) : '';
          },
        });
      }
      rec.g.remove();
      delete caviEl[rec.k];
      caviAttivi = caviAttivi.filter((x) => chiaveCavo(x) !== rec.k);
      aggiornaPrese();
    }

    async function collega(c) {
      caviAttivi.push(Object.assign({}, c));
      const rec = creaCavo(c);
      if (!ctx.riduci && rec.L) {
        rec.inMoto = true;
        tratteggio(rec, rec.L);
        await ctx.anima({
          durata: ctx.DURATA.normale,
          easing: 'smooth',
          aggiorna(t) {
            const off = rec.L * (1 - t);
            rec.filo.style.strokeDashoffset = off;
            rec.ombra.style.strokeDashoffset = off;
            const p = punto(rec, rec.L * t);
            rec.spinaB.setAttribute('cx', p.x);
            rec.spinaB.setAttribute('cy', p.y);
          },
        });
        rec.inMoto = false;
        tratteggio(rec, null);
        geometriaCavo(rec);
        rec.spinaB.classList.remove('is-innesto');
        requestAnimationFrame(() => rec.spinaB.classList.add('is-innesto'));
      }
      aggiornaPrese();
    }

    function sfoglia(i) {
      cal.replaceChildren(h('span', { class: ctx.riduci ? null : 'is-giro' }, GIORNI[i]));
    }

    function scegli(id) {
      if (id === attuale) return;
      api.esclusivo((vivo) => ricabla(id, vivo));
    }

    async function ricabla(id, vivo) {
      const a = PROBLEMI[id];
      const diff = differenzaCavi(caviAttivi, a.cavi);
      const man = differenzaManopole(manopole, a.manopole);
      const riass = diff.togli.length + ' cavi staccati, ' + diff.metti.length + ' collegati, ' + man.length + ' manopole girate';
      attuale = id;
      for (const k of Object.keys(btn)) btn[k].setAttribute('aria-pressed', String(k === id));
      bAvvia.disabled = true;
      uscite = [];
      disegnaSchede();
      valori = {};
      disegnaStato();
      sfoglia(0);
      vLavoro.textContent = 'Ricablaggio in corso…';
      racconto('Ricablaggio per **' + a.nome + '** (' + a.dettaglio + '): ' + diff.togli.length + ' cavi da staccare, ' +
        man.length + ' manopole da girare, ' + diff.metti.length + ' cavi da collegare.');
      let tempo = 0;
      const fermaTempo = ctx.ciclo((dt) => { tempo += dt; qui.textContent = formattaSecondi(tempo); });
      const totale = diff.togli.length + man.length + diff.metti.length;
      let fatti = 0;
      let giorno = 0;
      const avanza = () => {
        fatti += 1;
        const g = Math.min(GIORNI.length - 1, Math.floor(GIORNI.length * fatti / Math.max(1, totale)));
        if (g !== giorno) { giorno = g; sfoglia(g); }
      };
      try {
        for (const c of diff.togli) { if (!vivo()) return; await stacca(c); avanza(); }
        for (const m of man) { manopole[m.unita] = m.a; avanza(); }
        disegnaStato();
        if (!ctx.riduci) await ctx.attendi(ctx.DURATA.lenta);
        for (const c of diff.metti) { if (!vivo()) return; await collega(c); avanza(); }
      } finally {
        fermaTempo();
        caviAttivi = a.cavi.map((c) => Object.assign({}, c));
        manopole = Object.assign({}, a.manopole);
        valori = Object.assign({}, a.valori);
        allineaCavi();
        disegnaStato();
        bAvvia.disabled = false;
        vLavoro.textContent = riass.charAt(0).toUpperCase() + riass.slice(1) + '.';
      }
      if (ctx.riduci) qui.textContent = 'un clic';
      const quanto = ctx.riduci ? 'con un clic' : 'in ' + formattaSecondi(tempo);
      racconto('Fatto: ' + riass + ', ' + quanto + '. Su un ENIAC vero preparare un nuovo calcolo richiedeva **giorni**: per cambiare programma bisognava cambiare i collegamenti della macchina. Ora premi **▶ Avvia il calcolo**.');
      ctx.annuncia('Pannello ricablato per ' + a.nome + ': ' + riass + '.');
    }

    /* esecuzione: gli impulsi seguono i cavi */
    async function viaggia(p, durata) {
      const rec = caviEl[p.cavo];
      if (!rec || ctx.riduci || !rec.L) return;
      let nodo;
      if (p.numero != null) {
        const w = 14 + String(p.numero).length * 8;
        nodo = s('g', { class: P + '-numero' }, s('rect', { x: -w / 2, y: -10, width: w, height: 20, rx: 6 }), s('text', { x: 0, y: 4.5, 'text-anchor': 'middle' }, String(p.numero)));
      } else {
        nodo = s('circle', { class: P + '-impulso', r: 6 });
      }
      gMoto.append(nodo);
      try {
        await ctx.anima({
          durata: durata,
          easing: 'sharp',
          aggiorna(t) { const q = punto(rec, rec.L * t); nodo.setAttribute('transform', 'translate(' + q.x.toFixed(1) + ' ' + q.y.toFixed(1) + ')'); },
        });
      } finally {
        nodo.remove();
      }
    }

    function applica(p, nuova) {
      Object.assign(valori, p.valori);
      if (p.uscita != null) uscite.push(p.uscita);
      disegnaStato();
      if (p.uscita != null) disegnaSchede(nuova);
      if (nuova) lampo(unitaEl[p.unita].box);
    }

    async function calcola(vivo) {
      const pb = PROBLEMI[attuale];
      const passi = passiEniac(attuale);
      valori = Object.assign({}, pb.valori);
      uscite = [];
      disegnaStato();
      disegnaSchede();
      bAvvia.disabled = true;
      ctx.annuncia('Calcolo avviato: ' + pb.nome + '.');
      let i = 0;
      try {
        for (const p of passi) {
          if (!vivo()) return;
          const veloce = (p.giro || 1) > 1;
          racconto(p.testo);
          await viaggia(p, veloce ? ctx.DURATA.veloce : ctx.DURATA.lenta);
          applica(p, true);
          i += 1;
          await ctx.attendi(ctx.riduci ? (veloce ? ctx.DURATA.veloce : ctx.DURATA.narrativa) : (veloce ? ctx.DURATA.istante : ctx.DURATA.normale));
        }
      } finally {
        for (; i < passi.length; i++) applica(passi[i], false);
        disegnaSchede();
        bAvvia.disabled = false;
      }
      const vaiB = h('button', { type: 'button', class: 'pg-btn', onclick: () => api.vai('vn') }, 'Prova il programma memorizzato →');
      if (attuale === 'somma') {
        racconto('Risultato perforato: **5**. L\'ordine delle operazioni l\'hanno deciso i cavi: l\'impulso è passato dal programmatore principale all\'accumulatore 1 e poi al 2, e il numero ha seguito il cavo dei dati. Per un altro calcolo bisogna ricablare: prova **Quadrati**.', vaiB);
      } else {
        racconto('Schede perforate: **1, 4, 9, 16, 25**, mostrate al rallentatore: l\'ENIAC vero eseguiva 5.000 somme al secondo. Il programma era il cablaggio, e per cambiarlo servivano mani esperte e giorni di lavoro. L\'idea del programma memorizzato, descritta nel 1945 nel rapporto firmato da von Neumann: mettere il programma in memoria, come i numeri.', vaiB);
      }
      ctx.annuncia('Calcolo finito. Risultati: ' + uscite.join(', ') + '.');
    }

    disegnaStato();
    disegnaSchede();
    caviAttivi.forEach(creaCavo);
    racconto('Il pannello è cablato per la **Somma** (2 + 3): i cavi ambra portano gli impulsi di programma, quelli verdi i numeri. Premi **▶ Avvia il calcolo**, poi scegli **Quadrati** e guarda quanto lavoro serve per cambiare problema.');

    return {
      el: el,
      misura: misura,
      mostra() { visibile = true; requestAnimationFrame(() => { misura(); allineaCavi(); }); },
      nascondi() { visibile = false; },
    };
  }

  /* ---------- B) Von Neumann: il programma è nella memoria ---------- */

  const PROGRAMMI_VN = [
    { id: 'somma', nome: 'Somma', dettaglio: '5 + 4 + 3 + 2 + 1' },
    { id: 'conto', nome: 'Conto alla rovescia', dettaglio: '3, 2, 1' },
  ];
  const NOMI_FASI = ['Prelievo', 'Decodifica', 'Esecuzione'];
  const NOMI_RUOLI = { codice: 'istruzione', dato: 'dato', vuota: 'cella libera', uscita: 'uscita' };
  // Lo stesso colore per lo stesso concetto, in tutto il laboratorio.
  const COLORE = { indirizzo: 'var(--trace-3)', istruzione: 'var(--trace-2)', dato: 'var(--trace-1)', uscita: 'var(--trace-4)' };

  function adesso() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

  function creaVonNeumann(ctx, api) {
    const { h, s } = ctx;
    const C = cpu();
    if (!C) {
      const vuoto = h('div', { class: P + '-modo', 'data-modo': 'vn', hidden: true },
        h('div', { class: 'pg-stato pg-stato--errore', role: 'alert' }, h('p', null, 'Manca la CPU giocattolo (js/lib/cpu-giocattolo.js): ricarica la pagina.')));
      return { el: vuoto, misura() {}, mostra() {}, nascondi() {} };
    }

    const S = {
      programma: 'somma', originale: [], immagine: [], ruoli: [], etichette: [],
      st: null, vista: null, corrente: null,
      inCorsa: false, finito: false, istruzioni: 0, dallaPartenza: 0,
      ultima: null, precedente: null,
      aperta: null, tempoModifiche: 0,
      velocita: 4, completato: false, visibile: false,
    };

    /* ----- comandi ----- */
    const idProg = ctx.uid(P + '-vnp');
    const btnProg = {};
    for (const p of PROGRAMMI_VN) {
      btnProg[p.id] = h('button', { type: 'button', class: 'pg-btn', 'aria-pressed': 'false', onclick: () => scegliProgramma(p.id) },
        h('span', null, p.nome), h('span', { class: P + '-btn-dett' }, p.dettaglio));
    }
    const bOriginale = h('button', { type: 'button', class: 'pg-btn', hidden: true, onclick: () => scegliProgramma(S.programma) },
      h('span', { 'aria-hidden': 'true' }, '↶'), 'Programma originale');
    const barraProg = h('div', { class: 'pg-strumenti' },
      h('span', { class: 'pg-etichetta', id: idProg }, 'Programma'),
      h('div', { class: 'pg-gruppo', role: 'group', 'aria-labelledby': idProg }, PROGRAMMI_VN.map((p) => btnProg[p.id])),
      h('span', { class: 'pg-spazio' }), bOriginale);

    const bFase = h('button', { type: 'button', class: 'pg-btn', title: 'Una sola fase: prelievo, decodifica o esecuzione', onclick: () => comando('fase') }, 'Fase');
    const bIstr = h('button', { type: 'button', class: 'pg-btn', title: 'Un\'istruzione intera: le tre fasi di fila', onclick: () => comando('istruzione') }, 'Istruzione');
    const bEsegui = h('button', { type: 'button', class: 'pg-btn pg-btn--primario', onclick: () => comando('esegui') });
    const bDaCapo = h('button', { type: 'button', class: 'pg-btn', title: 'Ricarica il programma in memoria e azzera la CPU', onclick: () => comando('dacapo') },
      h('span', { 'aria-hidden': 'true' }, '↺'), 'Da capo');
    const idVel = ctx.uid(P + '-vel');
    const cursoreVel = h('input', { type: 'range', class: 'pg-cursore', id: idVel, min: '1', max: '5', step: '1', value: String(S.velocita), 'aria-valuetext': nomeVelocita(S.velocita), oninput: cambiaVelocita });
    const letturaVel = h('output', { class: 'pg-lettura', for: idVel }, nomeVelocita(S.velocita));
    const barraCmd = h('div', { class: 'pg-strumenti' }, bFase, bIstr, bEsegui, bDaCapo, h('span', { class: 'pg-spazio' }),
      h('span', { class: P + '-vel' }, h('label', { class: 'pg-etichetta', for: idVel }, 'Velocità'), cursoreVel, letturaVel));
    const legenda = h('div', { class: 'pg-strumenti ' + P + '-leg' },
      h('span', { class: P + '-c-op' }, h('i'), 'codice operativo: che cosa fare'),
      h('span', { class: P + '-c-ind' }, h('i'), 'indirizzo: quale cella'),
      h('span', { class: P + '-c-dato' }, h('i'), 'numero'),
      h('span', { class: P + '-c-out' }, h('i'), 'uscita'));

    /* ----- memoria ----- */
    const celle = [];
    const griglia = h('ol', { class: P + '-griglia', 'aria-label': 'Memoria: 32 celle da 8 bit. Frecce per spostarsi, Invio per cambiare i bit di una cella.', onkeydown: tastiGriglia });
    for (let i = 0; i < 32; i++) {
      const c = {
        ind: h('span', { class: P + '-cella-ind', 'aria-hidden': 'true' }, String(i).padStart(2, '0')),
        eti: h('span', { class: P + '-cella-eti', 'aria-hidden': 'true' }),
        dec: h('span', { class: P + '-cella-dec', 'aria-hidden': 'true' }),
        bits: Array.from({ length: 8 }, () => h('span', { class: P + '-b' })),
        ruolo: '',
      };
      c.btn = h('button', { type: 'button', class: P + '-cella', tabindex: i === 0 ? '0' : '-1', 'data-i': String(i), onclick: () => apriEditor(i) },
        c.ind, c.eti, c.dec, h('span', { class: P + '-cella-bit', 'aria-hidden': 'true' }, c.bits));
      celle.push(c);
      griglia.append(h('li', null, c.btn));
    }
    const cursore = h('span', { class: P + '-cursore', 'aria-hidden': 'true' });
    const editorLi = h('li', { class: P + '-editor-li' });
    const memBox = h('section', { class: P + '-mem', 'aria-label': 'Memoria' },
      h('h4', { class: P + '-sez-t' }, 'Memoria · 32 celle', h('small', null, 'programma e dati insieme: clicca una cella')),
      h('div', { class: P + '-mem-area' }, griglia, cursore));

    /* ----- bus ----- */
    const corsiaInd = h('div', { class: P + '-corsia ' + P + '-corsia--ind' }, h('span', { class: P + '-corsia-t' }, 'indirizzi'));
    const corsiaDati = h('div', { class: P + '-corsia ' + P + '-corsia--dati' }, h('span', { class: P + '-corsia-t' }, 'dati'));
    const bus = h('div', { class: P + '-bus', 'aria-hidden': 'true' }, corsiaInd, corsiaDati);

    /* ----- CPU ----- */
    function registro(id, nome, desc) {
      const r = { val: h('span', { class: P + '-reg-val' }), sub: h('span', { class: P + '-reg-sub' }) };
      r.box = h('div', { class: P + '-reg ' + P + '-reg--' + id }, h('span', { class: P + '-reg-nome' }, nome), h('span', { class: P + '-reg-desc' }, desc), r.val, r.sub);
      return r;
    }
    const rPC = registro('pc', 'PC', 'contatore di programma');
    const rIR = registro('ir', 'IR', 'registro istruzione');
    const rACC = registro('acc', 'ACC', 'accumulatore');
    const fasiEl = NOMI_FASI.map((n) => h('li', { class: P + '-fase' }, n));
    const cpuBox = h('section', { class: P + '-cpu', 'aria-label': 'CPU' },
      h('h4', { class: P + '-sez-t' }, 'CPU', h('small', null, 'ciclo di istruzione')),
      h('div', { class: P + '-regs' }, rPC.box, rIR.box, rACC.box),
      h('ol', { class: P + '-fasi', 'aria-label': 'Fasi del ciclo di istruzione' }, fasiEl));

    /* ----- uscita ----- */
    const uscitaEl = h('div', { class: P + '-schede' });
    const primaEl = h('p', { class: P + '-prima', hidden: true });
    const statoEl = h('p', { class: P + '-stato' });
    const tempoQui = h('strong');
    const tempoEl = h('div', { class: P + '-tempo', hidden: true },
      h('span', { class: P + '-tempo-t' }, 'Per cambiare il programma'),
      h('span', null, 'ENIAC'), h('span', null, h('b', null, 'giorni'), ' di cavi e manopole'),
      h('span', null, 'Qui'), tempoQui);
    const outBox = h('section', { class: P + '-out', 'aria-label': 'Uscita' },
      h('h4', { class: P + '-sez-t' }, 'Uscita · cella 31', h('small', null, 'i numeri stampati')),
      uscitaEl, primaEl, statoEl, tempoEl);

    const pacchetto = h('span', { class: P + '-pacchetto', 'aria-hidden': 'true', hidden: true });
    const attacchi = s('svg', { class: P + '-attacchi', 'aria-hidden': 'true', focusable: 'false' });
    const banco = h('div', { class: P + '-banco' }, attacchi, memBox, bus, cpuBox, outBox, pacchetto);
    const spiega = h('div', { class: 'pg-spiega ' + P + '-spiega' });
    const el = h('div', { class: P + '-modo', 'data-modo': 'vn', hidden: true }, barraProg, barraCmd, legenda, banco, spiega);

    /* ----- disegno ----- */

    function racconto(testo, extra, aggiungi) {
      const nodi = [h('p', null, ctx.inline(testo)), extra].filter(Boolean);
      if (aggiungi) spiega.append(...nodi); else spiega.replaceChildren(...nodi);
    }

    function lampo(nodo, colore) {
      if (colore) nodo.style.setProperty('--lampo', colore);
      nodo.classList.remove('is-lampo');
      void nodo.offsetWidth;
      nodo.classList.add('is-lampo');
      clearTimeout(nodo._pmLampo);
      nodo._pmLampo = setTimeout(() => nodo.classList.remove('is-lampo'), ctx.DURATA.lenta + 60);
    }

    const evidenziati = new Set();
    function evidenzia(nodo, colore) {
      if (colore) nodo.style.setProperty('--evid', colore);
      nodo.classList.add('is-sorgente');
      evidenziati.add(nodo);
    }
    function pulisciEvidenze() {
      for (const n of evidenziati) n.classList.remove('is-sorgente');
      evidenziati.clear();
    }

    function impostaRuolo(i) {
      const c = celle[i];
      const r = S.ruoli[i];
      if (c.ruolo) c.btn.classList.remove(P + '-cella--' + c.ruolo);
      c.btn.classList.add(P + '-cella--' + r);
      c.ruolo = r;
      c.eti.textContent = i === 31 ? 'USCITA' : S.etichette[i];
    }

    function disegnaCella(i) {
      const c = celle[i];
      const v = S.vista.mem[i];
      c.dec.textContent = testoCella(v, S.ruoli[i]);
      for (let b = 0; b < 8; b++) c.bits[b].classList.toggle('is-1', ((v >> (7 - b)) & 1) === 1);
      const cambiata = S.immagine[i] !== S.originale[i];
      c.btn.classList.toggle('is-cambiata', cambiata);
      c.btn.setAttribute('aria-label', descriviCella(i, v, S.ruoli[i], S.etichette[i]) + (cambiata ? ', cambiata da te' : '') +
        (S.vista.pc === i ? ', indicata dal contatore di programma' : ''));
    }

    function disegnaRegistri() {
      const v = S.vista;
      rPC.val.textContent = String(v.pc).padStart(2, '0');
      rPC.sub.textContent = 'cella ' + v.pc;
      rIR.val.replaceChildren(h('span', { class: P + '-op' }, bin(v.ir >> 5, 3)), ' ', h('span', { class: P + '-arg' }, bin(v.ir & 31, 5)));
      if (v.irStato === 'decodificato') {
        const op = (v.ir >> 5) & 7;
        rIR.sub.replaceChildren(...[h('span', { class: P + '-op' }, AZIONI[op].nome)].concat(op ? [' ', h('span', { class: P + '-arg' }, String(v.ir & 31))] : []));
      } else {
        rIR.sub.textContent = v.irStato === 'caricato' ? 'da decodificare' : 'vuoto';
      }
      rACC.val.textContent = String(v.acc);
      rACC.sub.textContent = bin(v.acc, 8);
    }

    function disegnaFasi(attiva) {
      fasiEl.forEach((li, k) => {
        li.classList.toggle('is-attiva', k === attiva);
        li.classList.toggle('is-fatta', attiva >= 0 && k < attiva);
        if (k === attiva) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
    }

    function disegnaUscita(nuova) {
      const u = S.vista.uscita;
      if (!u.length) uscitaEl.replaceChildren(h('span', { class: P + '-vuoto' }, 'Ancora niente: la cella 31 non è stata scritta.'));
      else uscitaEl.replaceChildren(...u.map((n, k) => h('span', { class: P + '-num-out', style: nuova && k === u.length - 1 ? null : 'animation: none' }, String(n))));
      primaEl.hidden = !S.precedente;
      if (S.precedente) primaEl.replaceChildren('Esecuzione precedente: ', h('b', null, S.precedente.length ? S.precedente.join(', ') : 'niente'));
    }

    function disegnaStato() {
      let t;
      if (S.finito) t = 'Ferma: HALT dopo ' + S.istruzioni + (S.istruzioni === 1 ? ' istruzione.' : ' istruzioni.');
      else if (S.inCorsa) t = 'In esecuzione: ' + S.istruzioni + (S.istruzioni === 1 ? ' istruzione' : ' istruzioni') + ' finora.';
      else if (S.istruzioni || S.corrente) t = 'In pausa dopo ' + S.istruzioni + (S.istruzioni === 1 ? ' istruzione.' : ' istruzioni.');
      else t = 'Pronta: il PC indica la cella 0.';
      statoEl.textContent = t;
      statoEl.classList.toggle('is-fermo', S.finito);
    }

    function etichettaEsegui() {
      if (S.inCorsa) return [h('span', { 'aria-hidden': 'true' }, '❚❚'), 'Pausa'];
      if (S.finito) return [h('span', { 'aria-hidden': 'true' }, '▶'), 'Esegui di nuovo'];
      if (S.istruzioni || S.corrente) return [h('span', { 'aria-hidden': 'true' }, '▶'), 'Continua'];
      return [h('span', { 'aria-hidden': 'true' }, '▶'), 'Esegui'];
    }
    function aggiornaComandi() { bEsegui.replaceChildren(...etichettaEsegui()); }

    function tempoTotale() {
      const a = S.aperta;
      const live = a && a.ultimo && S.vista.mem[a.i] !== a.inizialeMem ? a.ultimo - a.t0 : 0;
      return S.tempoModifiche + live;
    }

    function aggiornaModifiche() {
      const diverse = celleDiverse(S.immagine, S.originale);
      if (!diverse.length) S.tempoModifiche = 0;
      bOriginale.hidden = !diverse.length;
      tempoEl.hidden = !diverse.length;
      tempoQui.textContent = formattaSecondi(tempoTotale()) + ' · ' + diverse.length + (diverse.length === 1 ? ' cella' : ' celle');
      return diverse;
    }

    // Il riquadro azzurro del contatore di programma, sopra la cella che sta per essere prelevata.
    function posizionaCursore() {
      if (!S.visibile || !griglia.clientWidth) return;
      const c = celle[S.vista.pc].btn;
      const m = cursore.parentNode.getBoundingClientRect();
      const r = c.getBoundingClientRect();
      cursore.style.width = (r.width + 6) + 'px';
      cursore.style.height = (r.height + 6) + 'px';
      cursore.style.transform = 'translate(' + (r.left - m.left - 3).toFixed(1) + 'px, ' + (r.top - m.top - 3).toFixed(1) + 'px)';
    }

    function disegnaTutto() {
      for (let i = 0; i < 32; i++) disegnaCella(i);
      disegnaRegistri();
      disegnaUscita();
      disegnaStato();
      aggiornaComandi();
      aggiornaModifiche();
      posizionaCursore();
    }

    /* ----- voli sul bus ----- */

    // Il punto di aggancio di un registro è il suo valore; per l'IR che manda un indirizzo, i suoi 5 bit azzurri.
    function aggancio(nodo, indirizzo) {
      const r = nodo === rPC.box ? rPC : nodo === rIR.box ? rIR : nodo === rACC.box ? rACC : null;
      if (!r) return nodo;
      if (indirizzo && r === rIR) return rIR.val.querySelector('.' + P + '-arg') || rIR.val;
      return r.val;
    }

    function centro(nodo) {
      const r = nodo.getBoundingClientRect();
      const b = banco.getBoundingClientRect();
      return { x: r.left + r.width / 2 - b.left - banco.clientLeft, y: r.top + r.height / 2 - b.top - banco.clientTop };
    }

    function geometria(da, a, corsia, indirizzo) {
      const p0 = centro(aggancio(da, indirizzo));
      const p1 = centro(aggancio(a, false));
      if (!corsia) return [p0, p1];
      const lane = corsia === 'ind' ? corsiaInd : corsiaDati;
      const rl = lane.getBoundingClientRect();
      const b = banco.getBoundingClientRect();
      const verticale = rl.height > rl.width;
      const asse = verticale ? rl.left + rl.width / 2 - b.left - banco.clientLeft : rl.top + rl.height / 2 - b.top - banco.clientTop;
      return percorsoBus(p0, p1, asse, verticale ? 'verticale' : 'orizzontale');
    }

    async function volo(v, durata) {
      if (ctx.riduci || durata <= 0 || !S.visibile) return;
      const punti = geometria(v.da, v.a, v.corsia, v.tipo === 'indirizzo');
      pacchetto.className = P + '-pacchetto ' + P + '-pacchetto--' + v.tipo;
      pacchetto.textContent = v.testo;
      pacchetto.style.opacity = '0';
      pacchetto.hidden = false;
      const w = pacchetto.offsetWidth;
      const hh = pacchetto.offsetHeight;
      const lane = v.corsia === 'ind' ? corsiaInd : v.corsia === 'dati' ? corsiaDati : null;
      if (lane) lane.classList.add('is-attiva');
      try {
        await ctx.anima({
          durata: durata,
          easing: 'sharp',
          aggiorna(t) {
            const p = puntoSuPercorso(punti, t);
            pacchetto.style.transform = 'translate(' + (p.x - w / 2).toFixed(1) + 'px, ' + (p.y - hh / 2).toFixed(1) + 'px)';
            pacchetto.style.opacity = String(Math.min(1, t * 10, (1 - t) * 14 + 0.2));
          },
        });
      } finally {
        pacchetto.hidden = true;
        if (lane) lane.classList.remove('is-attiva');
      }
    }

    /* ----- il ciclo di istruzione, una fase alla volta ----- */

    function avviaIstruzione() {
      if (S.st.fermo) return false;
      const memPrima = S.st.mem.slice();
      const ev = C.passo(S.st);
      S.corrente = { ev: ev, fasi: fasiIstruzione(ev, memPrima), i: 0, testi: [] };
      return true;
    }

    // Ogni fase è una lista di micro-passi: un eventuale volo sul bus, poi il cambiamento di stato.
    // Se un'altra azione interrompe il volo, i cambiamenti rimasti si applicano subito: lo stato resta coerente.
    function microPassi(k, ev, movimenti) {
      const cella = (i) => celle[i].btn;
      const out = [];
      if (k === 0) {
        out.push({
          volo: { tipo: 'indirizzo', testo: String(ev.indirizzo), da: rPC.box, a: cella(ev.indirizzo), corsia: 'ind' },
          applica() { lampo(cella(ev.indirizzo), COLORE.istruzione); },
        });
        out.push({
          volo: { tipo: 'istruzione', testo: bin(ev.parola, 8), da: cella(ev.indirizzo), a: rIR.box, corsia: 'dati' },
          applica() { S.vista.ir = ev.parola; S.vista.irStato = 'caricato'; disegnaRegistri(); lampo(rIR.box); },
        });
        out.push({
          applica() { S.vista.pc = (ev.indirizzo + 1) % 32; disegnaRegistri(); lampo(rPC.box); posizionaCursore(); },
        });
        return out;
      }
      if (k === 1) {
        out.push({ applica() { S.vista.irStato = 'decodificato'; disegnaRegistri(); } });
        return out;
      }
      for (const m of movimenti) {
        if (m.tipo === 'indirizzo' && m.a === 'cella') {
          out.push({
            volo: { tipo: 'indirizzo', testo: String(m.valore), da: rIR.box, a: cella(m.cella), corsia: 'ind' },
            applica() { lampo(cella(m.cella), COLORE.indirizzo); },
          });
        } else if (m.tipo === 'dato' && m.a === 'acc') {
          out.push({
            volo: { tipo: 'dato', testo: String(m.valore), da: cella(m.cella), a: rACC.box, corsia: 'dati' },
            applica() { S.vista.acc = ev.accDopo; disegnaRegistri(); lampo(rACC.box); },
          });
        } else if (m.tipo === 'dato' && m.a === 'cella') {
          const out31 = m.cella === 31;
          out.push({
            volo: { tipo: out31 ? 'uscita' : 'dato', testo: String(m.valore), da: rACC.box, a: cella(m.cella), corsia: 'dati' },
            applica() {
              S.vista.mem[m.cella] = m.valore;
              disegnaCella(m.cella);
              lampo(cella(m.cella), out31 ? COLORE.uscita : COLORE.dato);
              if (out31) { S.vista.uscita.push(m.valore); disegnaUscita(true); }
            },
          });
        } else if (m.a === 'pc') {
          out.push({
            volo: { tipo: 'indirizzo', testo: String(m.valore), da: rIR.box, a: rPC.box, corsia: null },
            applica() { S.vista.pc = m.valore; disegnaRegistri(); lampo(rPC.box); posizionaCursore(); },
          });
        }
      }
      out.push({
        applica() {
          if (ev.op === 7 && !ev.saltato) lampo(rACC.box);
          if (ev.op === 0) lampo(rIR.box);
        },
      });
      return out;
    }

    // Che cosa illuminare durante una fase (serve anche con il movimento ridotto, quando nulla vola).
    function evidenzePer(k, ev) {
      pulisciEvidenze();
      const cella = (i) => celle[i].btn;
      if (k === 0) { evidenzia(rPC.box); evidenzia(cella(ev.indirizzo), COLORE.istruzione); evidenzia(rIR.box); return; }
      evidenzia(rIR.box);
      const usaCella = ev.op >= 1 && ev.op <= 5;
      if (k === 1) { if (usaCella || ev.op >= 6) evidenzia(cella(ev.arg), COLORE.indirizzo); return; }
      if (usaCella) {
        evidenzia(cella(ev.arg), ev.op === 2 && ev.arg === 31 ? COLORE.uscita : COLORE.dato);
        evidenzia(rACC.box);
      } else if (ev.op === 6 || ev.op === 7) {
        evidenzia(rPC.box);
        if (ev.op === 7) evidenzia(rACC.box);
      }
    }

    // modo: 'fase' e 'istruzione' (a mano: si racconta tutto), 'esegui' (si racconta in breve se si va veloci)
    async function eseguiFase(vivo, modo) {
      if (S.finito) ricarica();
      if (!S.corrente && !avviaIstruzione()) return false;
      const cor = S.corrente;
      const k = cor.i;
      cor.i += 1;
      const f = cor.fasi[k];
      if (k === 0) rIR.box.classList.remove('is-decodifica');
      if (k >= 1) rIR.box.classList.add('is-decodifica');
      disegnaFasi(k);
      evidenzePer(k, cor.ev);
      cor.testi.push(testoSemplice(f.testo));
      if (modo !== 'esegui' || S.velocita <= 2) racconto(f.testo, null, k > 0 && spiega.dataset.istr === String(S.istruzioni));
      else if (k === 0) racconto('**In esecuzione** · istruzione ' + (S.istruzioni + 1) + ': cella ' + cor.ev.indirizzo + ', `' + disassembla(cor.ev.parola) +
        '`. Per leggere ogni passaggio premi **❚❚ Pausa** e poi **Fase**; per arrivare subito alla fine porta la velocità su **turbo**.');
      spiega.dataset.istr = String(S.istruzioni);
      if (modo === 'fase') ctx.annuncia(NOMI_FASI[k] + '. ' + testoSemplice(f.testo).replace(/^\w+\.\s*/, ''));
      const passi = microPassi(k, cor.ev, f.movimenti);
      const vel = modo === 'esegui' ? S.velocita : Math.min(S.velocita, 3);
      let fatti = 0;
      try {
        for (const m of passi) {
          if (m.volo) await volo(m.volo, durataVolo(vel, ctx.DURATA));
          m.applica();
          fatti += 1;
        }
      } catch (err) {
        if (!ctx.annullato(err)) throw err;
      } finally {
        for (; fatti < passi.length; fatti++) passi[fatti].applica();
        if (cor.i >= 3 && S.corrente === cor) fineIstruzione(cor, modo);
      }
      return vivo();
    }

    function completaIstruzione() {
      const cor = S.corrente;
      if (!cor) return;
      while (cor.i < 3) {
        const k = cor.i;
        cor.i += 1;
        for (const m of microPassi(k, cor.ev, cor.fasi[k].movimenti)) m.applica();
      }
      fineIstruzione(cor, 'zitto');
      disegnaFasi(2);
    }

    function fineIstruzione(cor, modo) {
      S.corrente = null;
      S.istruzioni += 1;
      // la vista raggiunge lo stato vero della CPU
      S.vista.pc = S.st.pc;
      S.vista.acc = S.st.acc;
      S.vista.ir = S.st.ir;
      for (let i = 0; i < 32; i++) if (S.vista.mem[i] !== S.st.mem[i]) { S.vista.mem[i] = S.st.mem[i]; disegnaCella(i); }
      if (S.vista.uscita.length !== S.st.uscita.length) { S.vista.uscita = S.st.uscita.slice(); disegnaUscita(); }
      disegnaRegistri();
      disegnaCella(cor.ev.indirizzo);
      disegnaCella(S.vista.pc);
      posizionaCursore();
      if (modo === 'istruzione') ctx.annuncia(cor.testi.join(' '));
      if (cor.ev.fermo) fermata(modo);
      disegnaStato();
      aggiornaComandi();
    }

    function fermata(modo) {
      S.finito = true;
      S.inCorsa = false;
      const out = S.vista.uscita.slice();
      const diverse = celleDiverse(S.immagine, S.originale);
      const stampato = out.length ? out.join(', ') : null;
      let testo;
      let extra = null;
      if (!diverse.length) {
        const n = S.etichette.indexOf('n');
        const v = n >= 0 ? S.immagine[n] : null;
        const sug = v == null ? null : suggerisci(v);
        testo = (stampato ? '**Fatto: la macchina ha stampato ' + stampato + '**' : '**La macchina si è fermata** senza stampare niente') +
          ' in ' + S.istruzioni + ' istruzioni, poi ha trovato `HALT`.';
        if (sug) {
          testo += ' Ora cambia il programma: nella **cella ' + n + '** c\'è il dato `n`, che vale ' + v + '. Aprila, accendi il bit che vale ' + sug.peso +
            ' e il ' + v + ' diventa ' + sug.nuovo + '; poi premi di nuovo **▶ Esegui**.';
          extra = h('button', { type: 'button', class: 'pg-btn', onclick: () => apriEditor(n) }, 'Apri la cella ' + n);
        }
      } else {
        const prima = S.precedente && S.precedente.length ? ' (prima: ' + S.precedente.join(', ') + ')' : '';
        testo = (stampato ? '**Fatto: ora la macchina stampa ' + stampato + '**' + prima : '**La macchina si è fermata** senza stampare niente' + prima) +
          ', in ' + S.istruzioni + ' istruzioni. Hai cambiato il programma in **' + formattaSecondi(tempoTotale()) + '**, toccando qualche bit in memoria: ' +
          'nessun cavo da staccare. Sull\'ENIAC servivano **giorni**. È l\'idea del programma memorizzato: le istruzioni sono numeri, nella stessa memoria dei dati, e si cambiano come i dati.';
      }
      racconto(testo, extra);
      if (modo !== 'zitto') ctx.annuncia(testoSemplice(testo));
      S.ultima = out;
      if (!S.completato) { S.completato = true; ctx.completa(); }
    }

    function ricarica() {
      if (S.finito && S.ultima) S.precedente = S.ultima;
      S.st = C.crea(S.immagine);
      S.vista = { pc: 0, ir: 0, irStato: 'vuoto', acc: 0, mem: S.st.mem.slice(), uscita: [] };
      S.corrente = null;
      S.finito = false;
      S.istruzioni = 0;
      delete spiega.dataset.istr;
      pulisciEvidenze();
      rIR.box.classList.remove('is-decodifica');
      disegnaFasi(-1);
      disegnaTutto();
    }

    function introduzione() {
      const codice = [];
      const dati = [];
      S.ruoli.forEach((r, i) => { if (r === 'codice') codice.push(i); else if (r === 'dato') dati.push(i); });
      return 'Qui il programma sta **nella memoria**, insieme ai numeri: le celle ' + elencoCelle(codice) + ' contengono istruzioni, le celle ' +
        elencoCelle(dati) + ' i dati. Premi **Fase** per seguire la CPU un passo alla volta (prelievo, decodifica, esecuzione), oppure **▶ Esegui**.';
    }

    function caricaProgramma(id) {
      const a = C.assembla(C.ESEMPI[id]);
      S.programma = id;
      S.originale = a.parole.slice();
      S.immagine = a.parole.slice();
      S.ruoli = ruoliCelle(a);
      S.etichette = etichetteCelle(a);
      S.ultima = null;
      S.precedente = null;
      S.tempoModifiche = 0;
      S.inCorsa = false;
      S.finito = false;
      chiudiEditor(false);
      for (let i = 0; i < 32; i++) impostaRuolo(i);
      for (const p of PROGRAMMI_VN) btnProg[p.id].setAttribute('aria-pressed', String(p.id === id));
      ricarica();
      racconto(introduzione());
    }

    function scegliProgramma(id) {
      api.esclusivo(async () => {
        caricaProgramma(id);
        const p = PROGRAMMI_VN.find((x) => x.id === id);
        ctx.annuncia('Programma «' + p.nome + '» caricato in memoria. Il contatore di programma indica la cella 0.');
      });
    }

    /* ----- comandi ----- */

    function comando(c) {
      if (c === 'esegui' && S.inCorsa) {
        S.inCorsa = false;
        api.esclusivo(async () => {
          disegnaStato();
          aggiornaComandi();
          racconto('In pausa dopo ' + S.istruzioni + (S.istruzioni === 1 ? ' istruzione' : ' istruzioni') + '. Premi **Fase** per avanzare a piccoli passi, **▶ Continua** per ripartire.');
          ctx.annuncia('Esecuzione in pausa.');
        });
        return;
      }
      api.esclusivo(async (vivo) => {
        S.inCorsa = false;
        chiudiEditor(false);
        if (c === 'fase') await eseguiFase(vivo, 'fase');
        else if (c === 'istruzione') await eseguiIstruzione(vivo);
        else if (c === 'esegui') await esegui(vivo);
        else if (c === 'dacapo') {
          ricarica();
          const cambiate = celleDiverse(S.immagine, S.originale).length;
          racconto('**Da capo.** La memoria contiene di nuovo il programma' + (cambiate ? ', con le tue modifiche' : '') +
            '; il contatore di programma torna alla cella 0 e l\'accumulatore a 0. Premi **Fase** o **▶ Esegui**.');
          ctx.annuncia('Da capo: programma ricaricato, contatore di programma a 0.');
        }
        disegnaStato();
        aggiornaComandi();
      });
    }

    async function eseguiIstruzione(vivo) {
      if (S.finito) ricarica();
      do {
        if (!(await eseguiFase(vivo, 'istruzione'))) return;
        if (S.corrente) await ctx.attendi(pausaFasi(Math.min(S.velocita, 3), ctx.DURATA));
      } while (S.corrente && vivo());
    }

    async function esegui(vivo) {
      if (S.finito) ricarica();
      S.inCorsa = true;
      S.dallaPartenza = 0;
      aggiornaComandi();
      disegnaStato();
      ctx.annuncia(S.istruzioni || S.corrente ? 'Esecuzione ripresa.' : 'Esecuzione avviata.');
      try {
        while (vivo() && S.inCorsa && !S.finito) {
          const prima = S.istruzioni;
          if (!(await eseguiFase(vivo, 'esegui')) || S.finito || !S.inCorsa) break;
          if (S.istruzioni > prima) {
            S.dallaPartenza += 1;
            disegnaStato();
            if (S.dallaPartenza >= LIMITE_ISTRUZIONI) {
              racconto('**Già ' + LIMITE_ISTRUZIONI + ' istruzioni senza `HALT`**: forse ora il programma gira in tondo, succede quando si cambiano le istruzioni. ' +
                'Premi **▶ Continua** per andare avanti, **↺ Da capo** per ricominciare o **↶ Programma originale** per tornare al programma di partenza.');
              ctx.annuncia('Pausa automatica dopo ' + LIMITE_ISTRUZIONI + ' istruzioni senza HALT.');
              break;
            }
            await ctx.attendi(pausaIstruzione(S.velocita, ctx.DURATA));
          } else {
            const p = pausaFasi(S.velocita, ctx.DURATA);
            if (p) await ctx.attendi(p);
          }
        }
      } catch (err) {
        if (!ctx.annullato(err)) throw err;
      } finally {
        S.inCorsa = false;
        aggiornaComandi();
        disegnaStato();
      }
    }

    function cambiaVelocita() {
      S.velocita = livello(cursoreVel.value);
      const nome = nomeVelocita(S.velocita);
      cursoreVel.setAttribute('aria-valuetext', nome);
      letturaVel.textContent = nome;
    }

    /* ----- editor dei bit ----- */

    function colonne() {
      const t = getComputedStyle(griglia).gridTemplateColumns;
      return Math.max(1, t.split(' ').filter(Boolean).length || 4);
    }

    // L'editor si apre subito sotto la riga della cella, a tutta larghezza.
    function collocaEditor() {
      if (!S.aperta) return;
      const col = colonne();
      const ultima = Math.min(31, Math.floor(S.aperta.i / col) * col + col - 1);
      const dopo = celle[ultima].btn.parentNode;
      if (dopo.nextSibling !== editorLi) griglia.insertBefore(editorLi, dopo.nextSibling);
    }

    function apriEditor(i) {
      api.esclusivo(async () => {
        S.inCorsa = false;
        if (S.aperta && S.aperta.i === i) { chiudiEditor(true); return; }
        chiudiEditor(false);
        completaIstruzione();
        let ricaricata = false;
        if (S.finito) { ricarica(); ricaricata = true; }
        disegnaStato();
        aggiornaComandi();
        S.aperta = { i: i, inizialeMem: S.st.mem[i], inizialeImm: S.immagine[i], t0: adesso(), ultimo: 0 };
        costruisciEditor();
        celle[i].btn.classList.add('is-aperta');
        roving(i);
        collocaEditor();
        const v = S.vista.mem[i];
        const nome = S.etichette[i] ? ' · `' + S.etichette[i] + '`' : '';
        let testo = (ricaricata ? 'Ho ricaricato il programma in memoria, così la cella torna com\'era prima dell\'esecuzione. ' : '') +
          '**Cella ' + i + '**' + nome + ': contiene `' + bin(v, 8) + '`. ';
        if (S.ruoli[i] === 'codice') testo += 'Per la CPU è l\'istruzione **' + disassembla(v) + '**: i primi 3 bit scelgono l\'operazione, gli altri 5 la cella.';
        else testo += 'È il numero **' + v + '**. Accendi o spegni i bit: il valore cambia subito, nella memoria.';
        testo += ' Poi premi **▶ ' + (S.istruzioni ? 'Continua' : 'Esegui') + '**.';
        racconto(testo);
        ctx.annuncia('Cella ' + i + ' aperta: ' + descriviCella(i, v, S.ruoli[i], S.etichette[i]) + '. Esc per chiudere.');
        const primo = editorLi.querySelector('.' + P + '-ebit');
        if (primo) primo.focus({ preventScroll: true });
        requestAnimationFrame(() => {
          posizionaCursore();
          if (editorLi.isConnected && typeof editorLi.scrollIntoView === 'function') editorLi.scrollIntoView({ block: 'nearest', behavior: ctx.riduci ? 'auto' : 'smooth' });
        });
      });
    }

    let editorBit = [];
    let editorLetture = null;
    function costruisciEditor() {
      const a = S.aperta;
      const i = a.i;
      const ruolo = S.ruoli[i];
      const idT = ctx.uid(P + '-ed');
      editorBit = [];
      const campi = gruppiBit(ruolo).map((g) => {
        const bottoni = [];
        for (let b = g.da; b < g.a; b++) {
          const peso = pesoBit(b, g);
          const btn = h('button', { type: 'button', class: 'pg-btn ' + P + '-ebit', 'aria-pressed': 'false', 'aria-label': 'bit da ' + peso + ', ' + g.nome, onclick: () => cambiaBit(b) }, '0');
          editorBit[b] = btn;
          bottoni.push(h('span', { class: P + '-ebit-box' }, btn, h('span', { class: P + '-ebit-peso', 'aria-hidden': 'true' }, String(peso))));
        }
        return h('div', { class: P + '-ecampo ' + P + '-ecampo--' + g.tipo }, h('span', { class: P + '-ecampo-t', 'aria-hidden': 'true' }, g.nome), h('div', { class: P + '-ecampo-b' }, bottoni));
      });
      editorLetture = h('p', { class: P + '-eletture', 'aria-hidden': 'true' });
      const codici = ruolo === 'codice'
        ? h('p', { class: P + '-ecodici' }, AZIONI.map((z, k) => h('span', null, h('b', null, bin(k, 3)), ' ' + z.nome)))
        : null;
      const titolo = h('p', { class: P + '-editor-t', id: idT }, 'Cella ' + i + (S.etichette[i] ? ' · ' + S.etichette[i] : '') + (i === 31 ? ' · uscita' : ''),
        h('small', null, NOMI_RUOLI[ruolo] + ' · 8 bit: tocca un bit per accenderlo o spegnerlo'));
      const editor = h('div', { class: P + '-editor', role: 'group', 'aria-labelledby': idT, onkeydown: (e) => { if (e.key === 'Escape') { e.preventDefault(); chiudiEditor(true); } } },
        titolo, h('div', { class: P + '-ebits' }, campi), editorLetture, codici,
        h('div', { class: P + '-ecomandi' },
          h('button', { type: 'button', class: 'pg-btn', onclick: annullaCella }, 'Annulla le modifiche'),
          h('button', { type: 'button', class: 'pg-btn pg-btn--primario', onclick: () => chiudiEditor(true) }, 'Fatto')));
      editorLi.replaceChildren(editor);
      aggiornaEditor();
    }

    function aggiornaEditor() {
      const a = S.aperta;
      if (!a) return;
      const v = S.vista.mem[a.i];
      for (let b = 0; b < 8; b++) {
        const on = ((v >> (7 - b)) & 1) === 1;
        editorBit[b].setAttribute('aria-pressed', String(on));
        editorBit[b].textContent = on ? '1' : '0';
      }
      const istr = disassembla(v);
      const parti = S.ruoli[a.i] === 'codice'
        ? [['come istruzione', istr], ['come numero', String(v)]]
        : [['come numero', String(v)], ['come istruzione', istr]];
      editorLetture.replaceChildren(h('span', null, 'binario ', h('b', null, bin(v, 8))), ...parti.map((p) => h('span', null, p[0] + ': ', h('b', null, p[1]))));
    }

    function cambiaBit(b) {
      const a = S.aperta;
      if (!a || S.corrente) return;
      const i = a.i;
      const v = attivaBit(S.vista.mem[i], b);
      S.vista.mem[i] = v;
      S.st.mem[i] = v;
      S.immagine[i] = v;
      a.ultimo = adesso();
      disegnaCella(i);
      aggiornaEditor();
      aggiornaModifiche();
      lampo(celle[i].btn, S.ruoli[i] === 'codice' ? (b < 3 ? COLORE.istruzione : COLORE.indirizzo) : S.ruoli[i] === 'uscita' ? COLORE.uscita : COLORE.dato);
      ctx.annuncia('Cella ' + i + ': ' + (S.ruoli[i] === 'codice' ? 'istruzione ' + disassembla(v) : 'numero ' + v) + ', ' + bin(v, 8) + '.');
    }

    function annullaCella() {
      const a = S.aperta;
      if (!a) return;
      S.vista.mem[a.i] = a.inizialeMem;
      S.st.mem[a.i] = a.inizialeMem;
      S.immagine[a.i] = a.inizialeImm;
      a.ultimo = 0;
      disegnaCella(a.i);
      aggiornaModifiche();
      ctx.annuncia('Modifiche annullate: la cella ' + a.i + ' torna a ' + a.inizialeMem + '.');
      chiudiEditor(true);
    }

    function chiudiEditor(rifocalizza) {
      const a = S.aperta;
      if (!a) return;
      if (a.ultimo && S.vista.mem[a.i] !== a.inizialeMem) S.tempoModifiche += a.ultimo - a.t0;
      S.aperta = null;
      editorLi.remove();
      editorLi.replaceChildren();
      editorBit = [];
      celle[a.i].btn.classList.remove('is-aperta');
      aggiornaModifiche();
      if (rifocalizza) celle[a.i].btn.focus();
      requestAnimationFrame(posizionaCursore);
    }

    /* ----- tastiera sulla griglia ----- */

    function roving(j) {
      celle.forEach((c, k) => { c.btn.tabIndex = k === j ? 0 : -1; });
    }

    function tastiGriglia(e) {
      const t = e.target;
      if (!t.classList || !t.classList.contains(P + '-cella')) return;
      const i = Number(t.dataset.i);
      const col = colonne();
      let j = null;
      if (e.key === 'ArrowRight') j = Math.min(31, i + 1);
      else if (e.key === 'ArrowLeft') j = Math.max(0, i - 1);
      else if (e.key === 'ArrowDown') j = i + col <= 31 ? i + col : i;
      else if (e.key === 'ArrowUp') j = i - col >= 0 ? i - col : i;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = 31;
      else if (e.key === 'Escape' && S.aperta) { e.preventDefault(); chiudiEditor(true); return; }
      if (j == null) return;
      e.preventDefault();
      roving(j);
      celle[j].btn.focus();
    }

    /* ----- misure ----- */

    // Gli attacchi al bus, come in uno schema: PC e campo indirizzo dell'IR sulla corsia degli indirizzi,
    // IR e ACC su quella dei dati, la memoria su tutte e due.
    function disegnaAttacchi() {
      const b = banco.getBoundingClientRect();
      const rel = (nodo) => {
        const r = nodo.getBoundingClientRect();
        const x0 = b.left + banco.clientLeft;
        const y0 = b.top + banco.clientTop;
        return { l: r.left - x0, t: r.top - y0, r: r.right - x0, b: r.bottom - y0, cx: r.left + r.width / 2 - x0, cy: r.top + r.height / 2 - y0 };
      };
      const li = rel(corsiaInd);
      const ld = rel(corsiaDati);
      const cpu = rel(cpuBox);
      const mem = rel(memBox);
      const pc = rel(rPC.box);
      const ir = rel(rIR.box);
      const acc = rel(rACC.box);
      const linee = [];
      const A = 'var(--trace-3)';
      const D = 'var(--trace-1)';
      if (li.b - li.t > li.r - li.l) {
        const xi = li.cx;
        const xd = ld.cx;
        const ym = mem.t + Math.min(160, (mem.b - mem.t) / 3);
        // [colore, x1, y1, x2, y2]: il primo punto è sempre l'innesto sulla corsia
        linee.push([A, xi, ym - 6, mem.r, ym - 6], [D, xd, ym + 6, mem.r, ym + 6],
          [A, xi, pc.cy, cpu.l, pc.cy], [A, xi, ir.cy - 5, cpu.l, ir.cy - 5], [D, xd, ir.cy + 5, cpu.l, ir.cy + 5], [D, xd, acc.cy, cpu.l, acc.cy]);
      } else {
        const yi = li.cy;
        const yd = ld.cy;
        const xm = mem.l + (mem.r - mem.l) * 0.5;
        linee.push([A, pc.cx, yi, pc.cx, cpu.b], [A, ir.cx - 5, yi, ir.cx - 5, cpu.b], [D, ir.cx + 5, yd, ir.cx + 5, cpu.b], [D, acc.cx, yd, acc.cx, cpu.b],
          [A, xm - 6, yi, xm - 6, mem.t], [D, xm + 6, yd, xm + 6, mem.t]);
      }
      attacchi.setAttribute('width', banco.clientWidth);
      attacchi.setAttribute('height', banco.clientHeight);
      attacchi.setAttribute('viewBox', '0 0 ' + banco.clientWidth + ' ' + banco.clientHeight);
      const r1 = (n) => Math.round(n * 10) / 10;
      attacchi.replaceChildren(...linee.map(([c, x1, y1, x2, y2]) => s('g', { style: 'color: ' + c },
        s('line', { class: P + '-attacco', x1: r1(x1), y1: r1(y1), x2: r1(x2), y2: r1(y2), stroke: 'currentColor' }),
        s('circle', { class: P + '-attacco-nodo', cx: r1(x1), cy: r1(y1), r: 3.5, fill: 'currentColor' }))));
    }

    function misura() {
      if (!S.visibile || !banco.isConnected || !banco.clientWidth) return;
      collocaEditor();
      posizionaCursore();
      disegnaAttacchi();
    }
    let rafMisura = 0;
    const pianifica = () => { if (!rafMisura) rafMisura = requestAnimationFrame(() => { rafMisura = 0; misura(); }); };
    if (typeof ResizeObserver === 'function') new ResizeObserver(pianifica).observe(banco);
    else window.addEventListener('resize', pianifica);

    caricaProgramma('somma');

    return {
      el: el,
      misura: misura,
      mostra() { S.visibile = true; requestAnimationFrame(misura); },
      nascondi() { S.visibile = false; },
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('programma-memorizzato', { titolo: 'Dal pannello di cavi al programma memorizzato', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
