/*
 * Laboratorio «GOTO contro programmazione strutturata» (capitolo 7, la crisi del software).
 *
 * Lo stesso algoritmo, il massimo comune divisore di Euclide per sottrazioni, in due versioni
 * affiancate: BASIC con i numeri di riga e i GOTO, Pascal a blocchi annidati.
 * Un piccolo interprete per ciascuna versione produce la traccia dell'esecuzione (logica pura,
 * esportata per i test); l'interfaccia la anima: un gettone verde segue le istruzioni, ogni salto
 * lascia una scia gialla che si accumula come un piatto di spaghetti, mentre a destra i tre
 * blocchi di Böhm e Jacopini (sequenza, selezione, iterazione) si accendono uno dentro l'altro.
 */
(function (root) {
  'use strict';

  /* ======================= logica pura: niente DOM ======================= */

  const BASIC = [
    '10 IF A = B THEN GOTO 70',
    '20 IF A > B THEN GOTO 50',
    '30 B = B - A',
    '40 GOTO 10',
    '50 A = A - B',
    '60 GOTO 10',
    '70 PRINT A',
  ].join('\n');

  const PASCAL = [
    'while a <> b do',
    '  if a > b then',
    '    a := a - b',
    '  else',
    '    b := b - a;',
    'writeln(a)',
  ].join('\n');

  // La versione strutturata come albero: ogni nodo sa in quali righe del listato si trova.
  const PROGRAMMA = {
    tipo: 'sequenza', id: 'programma', corpo: [
      {
        tipo: 'mentre', id: 'mentre', righe: [1], cond: { sx: 'a', op: '<>', dx: 'b' },
        corpo: {
          tipo: 'se', id: 'se', righe: [2], cond: { sx: 'a', op: '>', dx: 'b' },
          allora: { tipo: 'assegna', id: 'allora', righe: [3], var: 'a', espr: { sx: 'a', op: '-', dx: 'b' } },
          altrimenti: { tipo: 'assegna', id: 'altrimenti', righe: [4, 5], var: 'b', espr: { sx: 'b', op: '-', dx: 'a' } },
        },
      },
      { tipo: 'scrivi', id: 'scrivi', righe: [6], espr: 'a' },
    ],
  };

  const LIMITE = 5000; // passi massimi: con uno zero la sottrazione non finirebbe mai

  const REL = {
    '=': (x, y) => x === y,
    '<>': (x, y) => x !== y,
    '<': (x, y) => x < y,
    '>': (x, y) => x > y,
    '<=': (x, y) => x <= y,
    '>=': (x, y) => x >= y,
  };

  const copia = (o) => Object.assign({}, o);

  // Espressione BASIC: termini (variabili di una lettera o numeri) uniti da + e -.
  function analizzaEspr(testo) {
    const t = String(testo == null ? '' : testo).trim();
    if (!/^([A-Z]|\d+)(\s*[+-]\s*([A-Z]|\d+))*$/.test(t)) return null;
    const termini = [];
    let segno = 1;
    for (const p of t.match(/[+-]|[A-Z]|\d+/g)) {
      if (p === '+') segno = 1;
      else if (p === '-') segno = -1;
      else { termini.push({ segno: segno, x: /^\d+$/.test(p) ? Number(p) : p }); segno = 1; }
    }
    return termini;
  }

  function valutaTermini(termini, valori) {
    return termini.reduce((s, t) => s + t.segno * (typeof t.x === 'number' ? t.x : (valori[t.x] || 0)), 0);
  }

  // Un'espressione scritta con i valori al posto delle variabili: "B - A" -> "18 − 12".
  function conValori(termini, valori) {
    return termini.map((t, i) => (i ? (t.segno < 0 ? ' − ' : ' + ') : (t.segno < 0 ? '−' : '')) +
      (typeof t.x === 'number' ? t.x : valori[t.x])).join('');
  }
  function testoTermini(termini) {
    return termini.map((t, i) => (i ? (t.segno < 0 ? ' − ' : ' + ') : (t.segno < 0 ? '−' : '')) + t.x).join('');
  }

  function analizzaIstruzione(t) {
    let m = t.match(/^IF\s+(.+?)\s*(<>|<=|>=|=|<|>)\s*(.+?)\s+THEN\s+(?:GOTO\s+)?(\d+)$/);
    if (m) {
      const sx = analizzaEspr(m[1]);
      const dx = analizzaEspr(m[3]);
      if (!sx || !dx) return null;
      return { tipo: 'se', sx: sx, op: m[2], dx: dx, verso: Number(m[4]) };
    }
    if ((m = t.match(/^GOTO\s+(\d+)$/))) return { tipo: 'vai', verso: Number(m[1]) };
    if ((m = t.match(/^PRINT\s+(.+)$/))) {
      const e = analizzaEspr(m[1]);
      return e ? { tipo: 'stampa', espr: e } : null;
    }
    if ((m = t.match(/^(?:LET\s+)?([A-Z])\s*=\s*(.+)$/))) {
      const e = analizzaEspr(m[2]);
      return e ? { tipo: 'assegna', var: m[1], espr: e } : null;
    }
    if (/^END$/.test(t)) return { tipo: 'fine' };
    return null;
  }

  // Analizza un listato BASIC con i numeri di riga. Restituisce le righe in ordine e gli errori.
  function analizzaBasic(sorgente) {
    const righe = [];
    const errori = [];
    String(sorgente == null ? '' : sorgente).split('\n').forEach((testo, i) => {
      const t = testo.trim().toUpperCase();
      if (!t) return;
      const m = t.match(/^(\d+)\s+(.+)$/);
      if (!m) { errori.push({ riga: i + 1, messaggio: 'manca il numero di riga' }); return; }
      const istr = analizzaIstruzione(m[2].trim());
      if (!istr) { errori.push({ riga: i + 1, numero: Number(m[1]), messaggio: 'istruzione sconosciuta: ' + m[2].trim() }); return; }
      righe.push({ numero: Number(m[1]), testo: m[2].trim(), istr: istr, sorgente: i + 1 });
    });
    righe.sort((a, b) => a.numero - b.numero);
    const numeri = new Set();
    for (const r of righe) {
      if (numeri.has(r.numero)) errori.push({ riga: r.sorgente, numero: r.numero, messaggio: 'il numero di riga ' + r.numero + ' è ripetuto' });
      numeri.add(r.numero);
    }
    for (const r of righe) {
      if (r.istr.verso != null && !numeri.has(r.istr.verso)) {
        errori.push({ riga: r.sorgente, numero: r.numero, messaggio: 'la riga ' + r.istr.verso + ' non esiste' });
      }
    }
    errori.sort((a, b) => a.riga - b.riga);
    return { righe: righe, errori: errori, ok: errori.length === 0 };
  }

  // Esegue un programma BASIC analizzato e registra un evento per ogni istruzione eseguita.
  // Un "salto" è ogni passaggio a una riga diversa da quella che segue nel listato.
  function eseguiBasic(programma, iniziali, limite) {
    const max = limite || LIMITE;
    const righe = programma.righe;
    const pos = new Map(righe.map((r, i) => [r.numero, i]));
    const v = copia(iniziali);
    const passi = [];
    const uscita = [];
    let salti = 0;
    let i = 0;
    while (i < righe.length && passi.length < max) {
      const r = righe[i];
      const istr = r.istr;
      const prima = copia(v);
      let prossima = i + 1;
      const ev = { indice: passi.length, numero: r.numero, pos: i, tipo: istr.tipo, testo: r.testo, prima: prima };
      if (istr.tipo === 'se') {
        const x = valutaTermini(istr.sx, v);
        const y = valutaTermini(istr.dx, v);
        ev.esito = REL[istr.op](x, y);
        ev.cond = testoTermini(istr.sx) + ' ' + istr.op + ' ' + testoTermini(istr.dx);
        ev.condValori = conValori(istr.sx, v) + ' ' + istr.op + ' ' + conValori(istr.dx, v);
        ev.verso = istr.verso;
        if (ev.esito) prossima = pos.get(istr.verso);
      } else if (istr.tipo === 'vai') {
        ev.verso = istr.verso;
        prossima = pos.get(istr.verso);
      } else if (istr.tipo === 'assegna') {
        ev.espr = testoTermini(istr.espr);
        ev.esprValori = conValori(istr.espr, v);
        v[istr.var] = valutaTermini(istr.espr, v);
        ev.cambiata = istr.var;
      } else if (istr.tipo === 'stampa') {
        ev.uscita = String(valutaTermini(istr.espr, v));
        uscita.push(ev.uscita);
      } else if (istr.tipo === 'fine') {
        prossima = righe.length;
      }
      ev.dopo = copia(v);
      ev.salto = prossima !== i + 1 && prossima < righe.length;
      ev.prossimo = prossima < righe.length ? righe[prossima].numero : null;
      if (ev.salto) salti += 1;
      passi.push(ev);
      i = prossima;
    }
    return { passi: passi, uscita: uscita, istruzioni: passi.length, salti: salti, finito: i >= righe.length, valori: v };
  }

  function confronta(cond, v) { return REL[cond.op](v[cond.sx], v[cond.dx]); }
  function calcola(espr, v) {
    if (typeof espr === 'string') return v[espr];
    return espr.op === '-' ? v[espr.sx] - v[espr.dx] : v[espr.sx] + v[espr.dx];
  }
  const NOME_STRUTTURA = { sequenza: 'sequenza', mentre: 'iterazione', se: 'selezione' };

  // Per ogni nodo eseguibile, le strutture che lo contengono (dalla più esterna alla più interna).
  function mappaStrutture(prog) {
    const mappa = {};
    (function visita(n, fuori) {
      const dentro = NOME_STRUTTURA[n.tipo] ? fuori.concat(NOME_STRUTTURA[n.tipo]) : fuori;
      if (n.tipo !== 'sequenza') mappa[n.id] = n.tipo === 'mentre' || n.tipo === 'se' ? dentro : fuori;
      if (n.tipo === 'sequenza') n.corpo.forEach((x) => visita(x, dentro));
      else if (n.tipo === 'mentre') visita(n.corpo, dentro);
      else if (n.tipo === 'se') { visita(n.allora, dentro); visita(n.altrimenti, dentro); }
    })(prog || PROGRAMMA, []);
    mappa.fine = [];
    return mappa;
  }

  // Esegue la versione strutturata: un evento per ogni test o istruzione, nessun GOTO.
  function eseguiStrutturato(prog, iniziali, limite) {
    const max = limite || LIMITE;
    const albero = prog || PROGRAMMA;
    const strutture = mappaStrutture(albero);
    const v = copia(iniziali);
    const passi = [];
    const uscita = [];
    let giri = 0;
    let troppo = false;

    function registra(nodo, extra) {
      if (passi.length >= max) { troppo = true; return false; }
      passi.push(Object.assign({ indice: passi.length, nodo: nodo.id, tipo: nodo.tipo, righe: nodo.righe, strutture: strutture[nodo.id].slice() }, extra));
      return true;
    }
    function esegui(nodo) {
      switch (nodo.tipo) {
        case 'sequenza':
          for (const x of nodo.corpo) if (!esegui(x)) return false;
          return true;
        case 'mentre':
          for (;;) {
            const prima = copia(v);
            const esito = confronta(nodo.cond, v);
            if (esito) giri += 1;
            if (!registra(nodo, { esito: esito, giro: giri, prima: prima, dopo: copia(v) })) return false;
            if (!esito) return true;
            if (!esegui(nodo.corpo)) return false;
          }
        case 'se': {
          const esito = confronta(nodo.cond, v);
          if (!registra(nodo, { esito: esito, prima: copia(v), dopo: copia(v) })) return false;
          return esegui(esito ? nodo.allora : nodo.altrimenti);
        }
        case 'assegna': {
          const prima = copia(v);
          v[nodo.var] = calcola(nodo.espr, v);
          return registra(nodo, { prima: prima, dopo: copia(v), cambiata: nodo.var, espr: nodo.espr });
        }
        case 'scrivi': {
          const val = String(calcola(nodo.espr, v));
          uscita.push(val);
          return registra(nodo, { prima: copia(v), dopo: copia(v), uscita: val });
        }
        default:
          return true;
      }
    }
    esegui(albero);
    for (let k = 0; k < passi.length; k++) {
      const p = passi[k];
      p.prossimo = k + 1 < passi.length ? passi[k + 1].nodo : (troppo ? null : 'fine');
      p.ritorno = p.tipo === 'assegna' && p.prossimo === 'mentre';
    }
    return { passi: passi, uscita: uscita, istruzioni: passi.length, salti: 0, giri: giri, finito: !troppo, valori: v };
  }

  const PROGRAMMA_BASIC = analizzaBasic(BASIC);
  function tracciaBasic(a, b, limite) { return eseguiBasic(PROGRAMMA_BASIC, { A: a, B: b }, limite); }
  function tracciaPascal(a, b, limite) { return eseguiStrutturato(PROGRAMMA, { a: a, b: b }, limite); }

  // Massimo comune divisore di riferimento (Euclide con il resto), per i controlli.
  function mcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) { const r = x % y; x = y; y = r; }
    return x;
  }

  // Controlla un valore scritto nel campo A o B: un intero da 1 a 99.
  function valida(testo, nome) {
    const t = String(testo == null ? '' : testo).trim();
    const n = nome || 'Il valore';
    if (t === '') return { ok: false, errore: 'Scrivi un valore per ' + n + ': un numero intero da 1 a 99.' };
    if (!/^[+-]?\d+$/.test(t)) return { ok: false, errore: n + ' deve essere un numero intero, senza virgola né lettere: da 1 a 99.' };
    const v = Number(t);
    if (v === 0) return { ok: false, errore: 'Con ' + n + ' = 0 le sottrazioni non finirebbero mai: scegli un numero da 1 a 99.' };
    if (v < 0) return { ok: false, errore: n + ' deve essere positivo: scegli un numero da 1 a 99.' };
    if (v > 99) return { ok: false, errore: n + ' può arrivare al massimo a 99: con numeri più grandi l\'esecuzione durerebbe troppo.' };
    return { ok: true, valore: v };
  }

  // Geometria delle frecce: lunghezza di una spezzata e punto a una frazione t del percorso.
  function lunghezza(punti) {
    let L = 0;
    for (let i = 1; i < punti.length; i++) L += Math.hypot(punti[i][0] - punti[i - 1][0], punti[i][1] - punti[i - 1][1]);
    return L;
  }
  function puntoA(punti, t) {
    const u = Math.max(0, Math.min(1, t));
    let d = u * lunghezza(punti);
    for (let i = 1; i < punti.length; i++) {
      const [x0, y0] = punti[i - 1];
      const [x1, y1] = punti[i];
      const seg = Math.hypot(x1 - x0, y1 - y0);
      if (d <= seg || i === punti.length - 1) {
        const f = seg ? Math.min(1, d / seg) : 1;
        return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f];
      }
      d -= seg;
    }
    return punti[punti.length - 1].slice();
  }
  const fmt = (x) => String(Math.round(x * 100) / 100);
  // Percorso SVG di una spezzata con gli angoli arrotondati (raggio r); accorcia la fine di "taglio".
  function percorso(punti, r, taglio) {
    const p = punti.map((q) => q.slice());
    if (taglio) {
      const a = p[p.length - 2];
      const b = p[p.length - 1];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      b[0] -= (b[0] - a[0]) / L * taglio;
      b[1] -= (b[1] - a[1]) / L * taglio;
    }
    let d = 'M' + fmt(p[0][0]) + ' ' + fmt(p[0][1]);
    for (let i = 1; i < p.length - 1; i++) {
      const [x0, y0] = p[i - 1];
      const [x1, y1] = p[i];
      const [x2, y2] = p[i + 1];
      const l1 = Math.hypot(x1 - x0, y1 - y0) || 1;
      const l2 = Math.hypot(x2 - x1, y2 - y1) || 1;
      const rr = Math.min(r, l1 / 2, l2 / 2);
      d += ' L' + fmt(x1 - (x1 - x0) / l1 * rr) + ' ' + fmt(y1 - (y1 - y0) / l1 * rr) +
        ' Q' + fmt(x1) + ' ' + fmt(y1) + ' ' + fmt(x1 + (x2 - x1) / l2 * rr) + ' ' + fmt(y1 + (y2 - y1) / l2 * rr);
    }
    const u = p[p.length - 1];
    return d + ' L' + fmt(u[0]) + ' ' + fmt(u[1]);
  }

  /* ======================= disegno: costanti dei diagrammi ======================= */

  // Diagramma di flusso della versione BASIC (viewBox 400 × 476): un nodo per riga, in ordine di listato.
  const CX = 168;
  const NODI = {
    10: { forma: 'rombo', cy: 70, hw: 72, hh: 24, testo: 'A = B ?' },
    20: { forma: 'rombo', cy: 142, hw: 72, hh: 24, testo: 'A > B ?' },
    30: { forma: 'box', cy: 206, hw: 68, hh: 16, testo: 'B = B − A' },
    40: { forma: 'salto', cy: 258, hw: 54, hh: 14, testo: 'GOTO 10' },
    50: { forma: 'box', cy: 308, hw: 68, hh: 16, testo: 'A = A − B' },
    60: { forma: 'salto', cy: 360, hw: 54, hh: 14, testo: 'GOTO 10' },
    70: { forma: 'io', cy: 410, hw: 68, hh: 16, testo: 'PRINT A' },
    fine: { forma: 'fine', cy: 456, hw: 36, hh: 12, testo: 'FINE' },
  };
  // Frecce: chiave "da>a". Le quattro frecce dei salti girano sul lato destro e si incrociano.
  const ARCHI = {
    'inizio>10': [[CX, 0], [CX, 46]],
    '10>20': [[CX, 94], [CX, 118]],
    '20>30': [[CX, 166], [CX, 190]],
    '30>40': [[CX, 222], [CX, 244]],
    '50>60': [[CX, 324], [CX, 346]],
    '70>fine': [[CX, 426], [CX, 444]],
    '10>70': [[240, 70], [376, 70], [376, 410], [236, 410]],
    '20>50': [[240, 142], [304, 142], [304, 308], [236, 308]],
    '40>10': [[222, 258], [328, 258], [328, 28], [CX, 28], [CX, 46]],
    '60>10': [[222, 360], [352, 360], [352, 16], [CX, 16], [CX, 46]],
  };
  // Le stesse frecce con un po' di disordine: ogni salto lascia un "filo" leggermente diverso.
  const FILI = {
    '10>70': (j) => [[240, 70 + j.a], [376 + j.d, 70 + j.a], [376 + j.d, 410 + j.b], [236, 410 + j.b]],
    '20>50': (j) => [[240, 142 + j.a], [304 + j.d, 142 + j.a], [304 + j.d, 308 + j.b], [236, 308 + j.b]],
    '40>10': (j) => [[222, 258 + j.a], [328 + j.d, 258 + j.a], [328 + j.d, 28 + j.b], [CX + j.c, 28 + j.b], [CX + j.c, 46]],
    '60>10': (j) => [[222, 360 + j.a], [352 + j.d, 360 + j.a], [352 + j.d, 16 + j.b], [CX + j.c, 16 + j.b], [CX + j.c, 46]],
  };
  const ETICHETTE = [
    { id: '10-si', x: 250, y: 62, testo: 'sì' },
    { id: '10-no', x: 178, y: 113, testo: 'no' },
    { id: '20-si', x: 250, y: 134, testo: 'sì' },
    { id: '20-no', x: 178, y: 185, testo: 'no' },
  ];

  // Diagramma a blocchi (Nassi–Shneiderman) della versione Pascal (viewBox 400 × 292).
  const RETT = {
    mentre: [13, 13, 374, 40],
    se: [47, 59, 340, 68],
    allora: [47, 133, 167, 56],
    altrimenti: [220, 133, 167, 56],
    scrivi: [13, 195, 374, 42],
    fine: [164, 256, 72, 24],
  };
  const RIGHE_PASCAL = { mentre: [0], se: [1], allora: [2], altrimenti: [3, 4], scrivi: [5], fine: [] };

  const MATTONI = [
    { id: 'sequenza', nome: 'Sequenza', sotto: 'un passo dopo l\'altro' },
    { id: 'selezione', nome: 'Selezione', sotto: 'se… altrimenti…' },
    { id: 'iterazione', nome: 'Iterazione', sotto: 'finché… ripeti' },
  ];

  const ESEMPI = [[48, 18], [21, 34], [7, 7]];
  const MAX_FILI = 120;
  const LH = 24; // altezza di una riga nei listati (px)

  /* ======================= stile ======================= */

  const css = `
    .lab-spaghetti { container: lab-spaghetti / inline-size; }
    .lab-spaghetti-dati .pg-etichetta { font-weight: 700; color: var(--lab-bright); }
    .lab-spaghetti-numero { width: 3.6em; text-align: center; font-size: 1.05rem; color: var(--trace-3); }
    .lab-spaghetti-numero[aria-invalid="true"] { border-color: #ff8a7a; color: #ffb4a8; }
    .lab-spaghetti-aiuto { font-size: 13px; color: var(--lab-text); opacity: .85; }
    .lab-spaghetti-gruppo { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .lab-spaghetti-gruppo > span { font-size: 13px; color: var(--lab-text); }
    .lab-spaghetti-errore { margin: 0; padding: 10px 18px; border-bottom: 1px solid var(--lab-line); background: rgba(255, 120, 100, .08); color: #ffc2b8; font-size: .92rem; }
    .lab-spaghetti-errore[hidden] { display: none; }

    .lab-spaghetti-arena { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; padding: 16px; }
    .lab-spaghetti-pannello { container: lab-spaghetti-p / inline-size; min-width: 0; display: grid; gap: 12px; align-content: start; padding: 14px; background: var(--lab-panel); border: 1px solid var(--lab-line); border-radius: 12px; transition: opacity var(--pg-dur-normale) ease; }
    .lab-spaghetti-pannello.is-spento { opacity: .45; }
    .lab-spaghetti-nome { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; margin: 0; }
    .lab-spaghetti-tag { font: 800 13px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; padding: 5px 9px 4px; border-radius: 999px; }
    .lab-spaghetti-pannello.is-basic .lab-spaghetti-tag { background: var(--trace-2); color: #221500; }
    .lab-spaghetti-pannello.is-pascal .lab-spaghetti-tag { background: var(--trace-4); color: #2b0716; }
    .lab-spaghetti-titolo { font-size: 1rem; font-weight: 700; color: var(--lab-bright); }
    .lab-spaghetti-codice { position: relative; list-style: none; margin: 0; padding: 8px 0; background: #000; border: 1px solid var(--lab-line); border-radius: 9px; font: 14px/${LH}px var(--mono); overflow: hidden; }
    .lab-spaghetti-codice li { position: relative; z-index: 1; padding: 0 12px; white-space: pre; color: var(--lab-text); }
    .lab-spaghetti-codice li[aria-current] { color: var(--lab-bright); }
    .lab-spaghetti-codice .k { color: var(--lab-bright); font-weight: 700; }
    .lab-spaghetti-codice .n { color: var(--lab-text); opacity: .7; }
    .lab-spaghetti-codice .g { color: var(--trace-2); font-weight: 700; }
    .lab-spaghetti-codice .s { color: var(--trace-4); font-weight: 700; }
    .lab-spaghetti-barra { position: absolute; z-index: 0; left: 0; right: 0; top: 8px; height: ${LH}px; background: color-mix(in srgb, var(--trace-1) 17%, transparent); box-shadow: inset 3px 0 0 var(--trace-1); transition-property: transform, opacity; transition-timing-function: var(--pg-ease-sharp); transition-duration: var(--pg-dur-normale); will-change: transform; }
    .lab-spaghetti-barra.is-via { opacity: 0; }

    .lab-spaghetti-stato { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; margin: 0; }
    .lab-spaghetti-stato > div { grid-column: span 2; display: grid; gap: 1px; padding: 5px 8px 6px; background: var(--lab-bg); border: 1px solid var(--lab-line); border-radius: 8px; min-width: 0; }
    .lab-spaghetti-stato > .is-conta, .lab-spaghetti-stato > .is-salti { grid-column: span 3; }
    .lab-spaghetti-stato dt { font: 600 13px var(--font); color: var(--lab-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .lab-spaghetti-stato dd { margin: 0; overflow: hidden; font: 700 1.2rem/1.3 var(--mono); color: var(--trace-3); font-variant-numeric: tabular-nums; }
    .lab-spaghetti-stato .is-conta dd { color: var(--lab-bright); }
    .lab-spaghetti-stato .is-salti dd { color: var(--trace-2); }
    .lab-spaghetti-stato .is-uscita { border-color: color-mix(in srgb, var(--trace-3) 40%, var(--lab-line)); }
    .lab-spaghetti-val { display: inline-block; }
    .lab-spaghetti-val.is-cambia { animation: lab-spaghetti-tic var(--pg-dur-normale) var(--pg-ease-smooth); }
    @keyframes lab-spaghetti-tic { from { opacity: .2; transform: translateY(-55%); } to { opacity: 1; transform: none; } }

    .lab-spaghetti-schema { overflow-x: auto; background: var(--lab-bg); border: 1px solid var(--lab-line); border-radius: 10px; scrollbar-width: thin; }
    .lab-spaghetti-svg { display: block; width: 100%; min-width: 306px; max-width: 460px; height: auto; margin: 0 auto; }
    .lab-spaghetti-svg text { font-family: var(--mono); font-size: 17px; fill: var(--lab-bright); }
    .lab-spaghetti-num { fill: var(--lab-text) !important; opacity: .7; font-weight: 600; }
    .lab-spaghetti-piccolo { fill: var(--lab-text) !important; opacity: .8; }
    .lab-spaghetti-arco { fill: none; stroke: color-mix(in srgb, var(--lab-text) 55%, transparent); stroke-width: 1.6; }
    .lab-spaghetti-punta { fill: color-mix(in srgb, var(--lab-text) 70%, transparent); }
    .lab-spaghetti-arco.is-salto { stroke: color-mix(in srgb, var(--trace-2) 55%, transparent); stroke-dasharray: 5 4; }
    .lab-spaghetti-punta.is-salto { fill: color-mix(in srgb, var(--trace-2) 75%, transparent); }
    .lab-spaghetti-giunto { fill: color-mix(in srgb, var(--lab-text) 70%, transparent); }
    .lab-spaghetti-forma { fill: var(--lab-raised); stroke: color-mix(in srgb, var(--lab-text) 60%, transparent); stroke-width: 1.6; transition: stroke var(--pg-dur-veloce) ease; }
    .lab-spaghetti-nodo.is-salto .lab-spaghetti-forma { stroke: color-mix(in srgb, var(--trace-2) 70%, transparent); }
    .lab-spaghetti-nodo.is-salto text { fill: var(--trace-2); font-weight: 700; }
    .lab-spaghetti-nodo.is-prossimo .lab-spaghetti-forma { stroke: var(--trace-1); stroke-width: 2.6; }
    .lab-spaghetti-lampo { fill: var(--trace-1); opacity: 0; pointer-events: none; }
    .lab-spaghetti-nodo.is-esegue .lab-spaghetti-lampo { animation: lab-spaghetti-lampo 520ms ease-out; }
    @keyframes lab-spaghetti-lampo { from { opacity: .5; } to { opacity: 0; } }
    .lab-spaghetti-esito { fill: var(--lab-text) !important; opacity: .75; transition: opacity var(--pg-dur-veloce) ease; }
    .lab-spaghetti-esito.is-preso { fill: var(--trace-1) !important; opacity: 1; font-weight: 800; }
    .lab-spaghetti-fili path { fill: none; stroke: var(--trace-2); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
    .lab-spaghetti-fili path.is-posato { animation: lab-spaghetti-posa 1400ms var(--pg-ease-smooth) forwards; }
    @keyframes lab-spaghetti-posa { from { opacity: 1; } to { opacity: .34; } }
    .lab-spaghetti-gettone .alone { fill: var(--trace-1); opacity: .22; transform-box: fill-box; transform-origin: center; animation: lab-spaghetti-respiro 1.8s ease-in-out infinite alternate; }
    .lab-spaghetti-gettone .nucleo { fill: var(--trace-1); stroke: #04150d; stroke-width: 2; }
    @keyframes lab-spaghetti-respiro { from { transform: scale(.8); } to { transform: scale(1.15); } }

    .lab-spaghetti-ns-forma { fill: var(--lab-raised); stroke: color-mix(in srgb, var(--lab-text) 60%, transparent); stroke-width: 1.6; }
    .lab-spaghetti-ns-linea { fill: none; stroke: color-mix(in srgb, var(--lab-text) 60%, transparent); stroke-width: 1.6; }
    .lab-spaghetti-tinta { fill: var(--trace-4); opacity: 0; transition: opacity var(--pg-dur-normale) ease; pointer-events: none; }
    .lab-spaghetti-tinta.is-attiva { opacity: .09; }
    .lab-spaghetti-tinta.is-interna { opacity: .2; }
    .lab-spaghetti-contorno { fill: none; stroke: var(--trace-4); stroke-width: 2; opacity: 0; transition: opacity var(--pg-dur-normale) ease; }
    .lab-spaghetti-contorno.is-attiva { opacity: .55; }
    .lab-spaghetti-contorno.is-interna { opacity: 1; }
    .lab-spaghetti-cornice { fill: color-mix(in srgb, var(--trace-1) 13%, transparent); stroke: var(--trace-1); stroke-width: 2.6; }
    .lab-spaghetti-ritorno { fill: none; stroke: var(--trace-4); stroke-width: 2; opacity: .4; transition: opacity var(--pg-dur-veloce) ease; }
    .lab-spaghetti-ritorno-punta { fill: var(--trace-4); opacity: .4; transition: opacity var(--pg-dur-veloce) ease; }
    .lab-spaghetti-ritorno.is-acceso, .lab-spaghetti-ritorno-punta.is-acceso { opacity: 1; }
    .lab-spaghetti-impulso { fill: var(--trace-4); stroke: #2b0716; stroke-width: 1.5; opacity: 0; }

    .lab-spaghetti-mattoni { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; list-style: none; margin: 0; padding: 0; }
    .lab-spaghetti-mattone { display: grid; justify-items: center; align-content: start; gap: 3px; padding: 9px 6px 10px; text-align: center; background: var(--lab-bg); border: 1px solid var(--lab-line); border-radius: 10px; opacity: .55; transition: opacity var(--pg-dur-normale) ease, border-color var(--pg-dur-normale) ease, background-color var(--pg-dur-normale) ease; }
    .lab-spaghetti-mattone svg { width: 40px; height: 40px; fill: none; stroke: var(--lab-text); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: stroke var(--pg-dur-normale) ease; }
    .lab-spaghetti-mattone b { font-size: 14px; color: var(--lab-bright); }
    .lab-spaghetti-mattone small { font-size: 13px; line-height: 1.3; color: var(--lab-text); }
    .lab-spaghetti-mattone.is-attivo { opacity: 1; border-color: color-mix(in srgb, var(--trace-4) 55%, var(--lab-line)); }
    .lab-spaghetti-mattone.is-attivo svg { stroke: var(--trace-4); }
    .lab-spaghetti-mattone.is-interno { background: color-mix(in srgb, var(--trace-4) 15%, var(--lab-bg)); border-color: var(--trace-4); }

    .lab-spaghetti-spiega { display: grid; gap: 8px; }
    .lab-spaghetti-msg { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: baseline; margin: 0 !important; }
    .lab-spaghetti-msg .lab-spaghetti-tag { justify-self: start; }
    .lab-spaghetti-msg.is-basic .lab-spaghetti-tag { background: var(--trace-2); color: #221500; }
    .lab-spaghetti-msg.is-pascal .lab-spaghetti-tag { background: var(--trace-4); color: #2b0716; }
    .lab-spaghetti-esito-finale { margin: 4px 0 0 !important; padding: 10px 12px; border-radius: 10px; background: color-mix(in srgb, var(--trace-1) 9%, transparent); border: 1px solid color-mix(in srgb, var(--trace-1) 35%, transparent); }
    .lab-spaghetti-esito-finale[hidden] { display: none; }

    @container lab-spaghetti (min-width: 780px) {
      .lab-spaghetti-arena { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @container lab-spaghetti-p (min-width: 396px) {
      .lab-spaghetti-stato { grid-template-columns: repeat(5, minmax(0, 1fr)); }
      .lab-spaghetti-stato > div, .lab-spaghetti-stato > .is-conta, .lab-spaghetti-stato > .is-salti { grid-column: auto; }
    }
    @container lab-spaghetti (max-width: 480px) {
      .lab-spaghetti-arena { padding: 10px; gap: 10px; }
      .lab-spaghetti-pannello { padding: 10px; }
    }
    @container lab-spaghetti-p (max-width: 300px) {
      .lab-spaghetti-mattone small { display: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      .lab-spaghetti-barra, .lab-spaghetti-pannello, .lab-spaghetti-mattone, .lab-spaghetti-tinta, .lab-spaghetti-contorno { transition: none; }
      .lab-spaghetti-val.is-cambia, .lab-spaghetti-nodo.is-esegue .lab-spaghetti-lampo, .lab-spaghetti-gettone .alone { animation: none; }
      .lab-spaghetti-fili path.is-posato { animation: none; opacity: .34; }
    }
  `;

  /* ======================= interfaccia ======================= */

  function monta(el, ctx) {
    const { h, s } = ctx;
    const id = ctx.uid('spaghetti');
    const stato = { a: 48, b: 18, versione: 'entrambe', velocita: 'media', inCorsa: false, epoca: 0, animazioni: 0, fatti: { basic: false, pascal: false }, completato: false, valido: true };
    const V = { basic: null, pascal: null };
    let coda = Promise.resolve();

    const silenzia = (err) => { if (!ctx.annullato(err)) throw err; };
    const vel = () => {
      const D = ctx.DURATA;
      if (stato.velocita === 'lenta') return { esec: D.normale, viaggio: D.narrativa, sosta: D.lenta };
      if (stato.velocita === 'veloce') return { esec: D.istante, viaggio: D.veloce, sosta: D.istante };
      return { esec: D.veloce, viaggio: D.lenta, sosta: D.veloce };
    };
    const selezionate = () => (stato.versione === 'entrambe' ? ['basic', 'pascal'] : [stato.versione]);
    const meno = (t) => String(t).replace(/-/g, '−');

    /* ---------- barra 1: i dati ---------- */

    function campo(nome, valore) {
      const inp = h('input', {
        class: 'pg-campo lab-spaghetti-numero', id: id + '-' + nome.toLowerCase(), type: 'text', inputmode: 'numeric',
        maxlength: '3', value: String(valore), autocomplete: 'off', spellcheck: 'false', 'aria-describedby': id + '-aiuto',
      });
      inp.addEventListener('input', leggiCampi);
      inp.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        const r = Logica.valida(inp.value, nome);
        const base = r.ok ? r.valore : (e.key === 'ArrowUp' ? 0 : 100);
        const nuovo = Math.max(1, Math.min(99, base + (e.key === 'ArrowUp' ? 1 : -1)));
        inp.value = String(nuovo);
        e.preventDefault();
        leggiCampi();
      });
      return inp;
    }
    const campoA = campo('A', stato.a);
    const campoB = campo('B', stato.b);
    const bottoniEsempio = ESEMPI.map(([a, b]) => h('button', {
      type: 'button', class: 'pg-btn', 'aria-pressed': 'false', onclick: () => impostaValori(a, b),
    }, a + ' e ' + b));
    const errore = h('p', { class: 'lab-spaghetti-errore', id: id + '-err', role: 'alert', hidden: true });

    const barraDati = h('div', { class: 'pg-strumenti lab-spaghetti-dati' },
      h('label', { class: 'pg-etichetta', for: campoA.id }, 'A', campoA),
      h('label', { class: 'pg-etichetta', for: campoB.id }, 'B', campoB),
      h('span', { class: 'lab-spaghetti-aiuto', id: id + '-aiuto' }, 'interi da 1 a 99'),
      h('span', { class: 'pg-spazio' }),
      h('span', { class: 'lab-spaghetti-gruppo' }, h('span', { id: id + '-es' }, 'Esempi'),
        h('span', { class: 'pg-gruppo', role: 'group', 'aria-labelledby': id + '-es' }, bottoniEsempio)));

    /* ---------- barra 2: i comandi ---------- */

    const btnEsegui = h('button', { type: 'button', class: 'pg-btn pg-btn--primario', onclick: () => esegui() }, '▶︎ Esegui');
    const btnPasso = h('button', { type: 'button', class: 'pg-btn', onclick: () => passoManuale() }, 'Passo ›');
    const btnDaCapo = h('button', { type: 'button', class: 'pg-btn', onclick: () => { azzera(); ctx.annuncia('Si ricomincia da capo.'); } }, '↺ Da capo');
    const opzVersione = [['entrambe', 'Entrambe'], ['basic', 'Solo GOTO'], ['pascal', 'Solo strutturata']].map(([v, t]) => h('button', {
      type: 'button', class: 'pg-btn', 'aria-pressed': String(v === stato.versione), 'data-v': v, onclick: () => scegliVersione(v),
    }, t));
    const opzVelocita = [['lenta', 'Lenta'], ['media', 'Media'], ['veloce', 'Veloce']].map(([v, t]) => h('button', {
      type: 'button', class: 'pg-btn', 'aria-pressed': String(v === stato.velocita), 'data-v': v, onclick: () => scegliVelocita(v),
    }, t));
    const barraComandi = h('div', { class: 'pg-strumenti lab-spaghetti-comandi' },
      btnEsegui, btnPasso, btnDaCapo,
      h('span', { class: 'pg-spazio' }),
      h('span', { class: 'lab-spaghetti-gruppo' }, h('span', { id: id + '-ver' }, 'Versione'),
        h('span', { class: 'pg-gruppo', role: 'group', 'aria-labelledby': id + '-ver' }, opzVersione)),
      h('span', { class: 'lab-spaghetti-gruppo' }, h('span', { id: id + '-vel' }, 'Velocità'),
        h('span', { class: 'pg-gruppo', role: 'group', 'aria-labelledby': id + '-vel' }, opzVelocita)));

    /* ---------- pannelli: listato, registri, contatori ---------- */

    function rigaBasic(testo) {
      const m = testo.match(/^(\d+) (.*)$/);
      const corpo = m[2];
      const parti = [h('span', { class: 'n' }, m[1] + ' ')];
      const re = /(GOTO \d+)|\b(IF|THEN|PRINT)\b/g;
      let ultimo = 0;
      let x;
      while ((x = re.exec(corpo))) {
        if (x.index > ultimo) parti.push(corpo.slice(ultimo, x.index));
        parti.push(h('span', { class: x[1] ? 'g' : 'k' }, x[0]));
        ultimo = re.lastIndex;
      }
      if (ultimo < corpo.length) parti.push(corpo.slice(ultimo));
      return parti;
    }
    function rigaPascal(testo) {
      const parti = [];
      const re = /\b(while|do|if|then|else)\b|\b(writeln)\b/g;
      let ultimo = 0;
      let x;
      while ((x = re.exec(testo))) {
        if (x.index > ultimo) parti.push(testo.slice(ultimo, x.index));
        parti.push(h('span', { class: x[1] ? 's' : 'k' }, x[0]));
        ultimo = re.lastIndex;
      }
      if (ultimo < testo.length) parti.push(testo.slice(ultimo));
      return parti;
    }

    function creaPannello(v) {
      const basic = v === 'basic';
      const righe = (basic ? BASIC : PASCAL).split('\n');
      const barra = h('div', { class: 'lab-spaghetti-barra', 'aria-hidden': 'true' });
      const voci = righe.map((r) => h('li', null, basic ? rigaBasic(r) : rigaPascal(r)));
      const listato = h('ol', { class: 'lab-spaghetti-codice', 'aria-label': basic ? 'Listato BASIC' : 'Listato Pascal' }, barra, voci);
      const val = () => h('span', { class: 'lab-spaghetti-val' }, '—');
      const valA = val();
      const valB = val();
      const valU = val();
      const nIstr = h('span', { class: 'lab-spaghetti-val' }, '0');
      const nSalti = h('span', { class: 'lab-spaghetti-val' }, '0');
      const quadro = h('dl', { class: 'lab-spaghetti-stato', 'aria-label': 'Variabili e contatori' },
        h('div', null, h('dt', null, basic ? 'A' : 'a'), h('dd', null, valA)),
        h('div', null, h('dt', null, basic ? 'B' : 'b'), h('dd', null, valB)),
        h('div', { class: 'is-uscita' }, h('dt', null, 'Uscita'), h('dd', null, valU)),
        h('div', { class: 'is-conta' }, h('dt', null, 'Istruzioni'), h('dd', null, nIstr)),
        h('div', { class: 'is-salti' }, h('dt', null, 'GOTO'), h('dd', null, nSalti)));
      const schema = basic ? creaFlusso() : creaBlocchi();
      const box = h('section', { class: 'lab-spaghetti-pannello is-' + v, 'aria-label': basic ? 'Versione con GOTO, in BASIC' : 'Versione strutturata, in Pascal' },
        h('p', { class: 'lab-spaghetti-nome' },
          h('span', { class: 'lab-spaghetti-tag' }, basic ? 'GOTO' : 'Strutturata'),
          h('span', { class: 'lab-spaghetti-titolo' }, basic ? 'BASIC con i numeri di riga' : 'Pascal a blocchi')),
        listato,
        quadro,
        h('div', { class: 'lab-spaghetti-schema' }, schema.svg),
        basic ? null : schema.mattoni);
      return { box, barra, voci, valA, valB, valU, nIstr, nSalti, schema };
    }

    /* ---------- diagramma di flusso della versione BASIC ---------- */

    function forma(n, extra) {
      const d = NODI[n];
      const { cy, hw, hh } = d;
      const cls = 'lab-spaghetti-forma' + (extra ? ' ' + extra : '');
      if (d.forma === 'rombo') return s('polygon', { class: cls, points: [CX, cy - hh, CX + hw, cy, CX, cy + hh, CX - hw, cy].join(' ') });
      if (d.forma === 'io') return s('polygon', { class: cls, points: [CX - hw + 8, cy - hh, CX + hw + 8, cy - hh, CX + hw - 8, cy + hh, CX - hw - 8, cy + hh].join(' ') });
      const rx = d.forma === 'box' ? 4 : hh;
      return s('rect', { class: cls, x: CX - hw, y: cy - hh, width: 2 * hw, height: 2 * hh, rx: rx });
    }
    function punta(punti, salto) {
      const [x0, y0] = punti[punti.length - 2];
      const [x1, y1] = punti[punti.length - 1];
      const L = Math.hypot(x1 - x0, y1 - y0) || 1;
      const ux = (x1 - x0) / L;
      const uy = (y1 - y0) / L;
      const a = 8;
      const b = 4.5;
      const pts = [x1, y1, x1 - ux * a - uy * b, y1 - uy * a + ux * b, x1 - ux * a + uy * b, y1 - uy * a - ux * b].map(fmt).join(' ');
      return s('polygon', { class: 'lab-spaghetti-punta' + (salto ? ' is-salto' : ''), points: pts });
    }

    function creaFlusso() {
      const svg = s('svg', {
        class: 'lab-spaghetti-svg', viewBox: '0 0 400 476', role: 'img',
        'aria-label': 'Diagramma di flusso della versione con GOTO: una casella per ogni riga del listato, nello stesso ordine. ' +
          'Le quattro frecce dei salti girano sul lato destro e si incrociano; tra le righe 40 e 50 e tra 60 e 70 non c\'è nessuna freccia.',
      });
      const archi = s('g');
      for (const k of Object.keys(ARCHI)) {
        const salto = !!FILI[k];
        archi.append(s('path', { class: 'lab-spaghetti-arco' + (salto ? ' is-salto' : ''), d: percorso(ARCHI[k], 10, 6) }), punta(ARCHI[k], salto));
      }
      archi.append(s('circle', { class: 'lab-spaghetti-giunto', cx: CX, cy: 16, r: 3 }), s('circle', { class: 'lab-spaghetti-giunto', cx: CX, cy: 28, r: 3 }));
      const etichette = {};
      const testi = s('g');
      testi.append(s('text', { class: 'lab-spaghetti-piccolo', x: 156, y: 22, 'text-anchor': 'end' }, 'inizio'));
      for (const e of ETICHETTE) {
        etichette[e.id] = s('text', { class: 'lab-spaghetti-esito', x: e.x, y: e.y }, e.testo);
        testi.append(etichette[e.id]);
      }
      const fili = s('g', { class: 'lab-spaghetti-fili' });
      const nodiG = s('g');
      const nodi = {};
      for (const n of Object.keys(NODI)) {
        const d = NODI[n];
        const g = s('g', { class: 'lab-spaghetti-nodo' + (d.forma === 'salto' ? ' is-salto' : '') });
        g.append(forma(n), forma(n, 'lab-spaghetti-lampo'));
        g.append(s('text', { x: CX, y: d.cy + 6, 'text-anchor': 'middle' }, d.testo));
        if (n !== 'fine') g.append(s('text', { class: 'lab-spaghetti-num', x: 30, y: d.cy + 6 }, n));
        nodi[n] = g;
        nodiG.append(g);
      }
      const alone = s('circle', { class: 'alone', r: 13 });
      const gettone = s('g', { class: 'lab-spaghetti-gettone' }, alone, s('circle', { class: 'nucleo', r: 6.5 }));
      svg.append(archi, fili, nodiG, testi, gettone);
      return { svg, fili, nodi, etichette, gettone };
    }

    /* ---------- diagramma a blocchi della versione Pascal ---------- */

    function icona(tipo) {
      const g = s('svg', { viewBox: '0 0 40 40', 'aria-hidden': 'true', focusable: 'false' });
      if (tipo === 'sequenza') g.append(s('rect', { x: 9, y: 3, width: 22, height: 11, rx: 2 }), s('path', { d: 'M20 14v8m-3-3 3 3 3-3' }), s('rect', { x: 9, y: 25, width: 22, height: 11, rx: 2 }));
      else if (tipo === 'selezione') g.append(s('path', { d: 'M20 3l12 9-12 9-12-9z' }), s('path', { d: 'M8 12H4v12m28-12h4v12' }), s('rect', { x: 1, y: 26, width: 13, height: 10, rx: 2 }), s('rect', { x: 26, y: 26, width: 13, height: 10, rx: 2 }));
      else g.append(s('rect', { x: 12, y: 12, width: 22, height: 14, rx: 2 }), s('path', { d: 'M12 19H5V5h18v7m-3-3 3 3 3-3' }), s('path', { d: 'M23 26v9' }));
      return g;
    }

    function creaBlocchi() {
      const svg = s('svg', {
        class: 'lab-spaghetti-svg', viewBox: '0 0 400 292', role: 'img',
        'aria-label': 'Diagramma a blocchi della versione strutturata: un ciclo while che contiene una selezione if con i due rami, ' +
          'seguito dall\'istruzione writeln. Si legge dall\'alto in basso, senza frecce di salto.',
      });
      const tinte = {
        iterazione: s('path', { class: 'lab-spaghetti-tinta', d: 'M10 10H390V56H44V192H10Z' }),
        selezione: s('rect', { class: 'lab-spaghetti-tinta', x: 44, y: 56, width: 346, height: 136 }),
        sequenza: s('rect', { class: 'lab-spaghetti-contorno', x: 6, y: 6, width: 388, height: 238, rx: 6 }),
      };
      const forme = s('g', null,
        s('rect', { class: 'lab-spaghetti-ns-forma', x: 10, y: 10, width: 380, height: 230 }),
        s('path', { class: 'lab-spaghetti-ns-linea', d: 'M10 56H390M44 56V192M44 130H390M217 130V192M10 192H390M44 56L217 130L390 56' }),
        s('rect', { class: 'lab-spaghetti-ns-forma', x: 164, y: 256, width: 72, height: 24, rx: 12 }));
      const ritorno = s('path', { class: 'lab-spaghetti-ritorno', d: 'M27 182V70' });
      const ritornoPunta = s('polygon', { class: 'lab-spaghetti-ritorno-punta', points: '27,62 22,72 32,72' });
      const testi = s('g', null,
        s('text', { x: 54, y: 39 }, 'while a ≠ b'),
        s('text', { x: 217, y: 92, 'text-anchor': 'middle' }, 'a > b ?'),
        s('text', { class: 'lab-spaghetti-piccolo', x: 54, y: 122 }, 'sì'),
        s('text', { class: 'lab-spaghetti-piccolo', x: 380, y: 122, 'text-anchor': 'end' }, 'no'),
        s('text', { x: 130.5, y: 167, 'text-anchor': 'middle' }, 'a := a − b'),
        s('text', { x: 303.5, y: 167, 'text-anchor': 'middle' }, 'b := b − a'),
        s('text', { x: 54, y: 222 }, 'writeln(a)'),
        s('text', { x: 200, y: 274, 'text-anchor': 'middle' }, 'FINE'));
      const cornice = s('rect', { class: 'lab-spaghetti-cornice', rx: 6 });
      const impulso = s('circle', { class: 'lab-spaghetti-impulso', r: 6, cx: 27, cy: 182 });
      svg.append(tinte.iterazione, tinte.selezione, forme, tinte.sequenza, ritorno, ritornoPunta, testi, cornice, impulso);
      const voci = {};
      const mattoni = h('ul', { class: 'lab-spaghetti-mattoni', 'aria-label': 'I tre blocchi di Böhm e Jacopini' },
        MATTONI.map((m) => {
          const stato2 = h('span', { class: 'pg-sr' }, '');
          voci[m.id] = { li: null, stato: stato2 };
          const li = h('li', { class: 'lab-spaghetti-mattone' }, icona(m.id), h('b', null, m.nome), h('small', null, m.sotto), stato2);
          voci[m.id].li = li;
          return li;
        }));
      return { svg, tinte, cornice, impulso, ritorno, ritornoPunta, mattoni, voci };
    }

    const P = { basic: creaPannello('basic'), pascal: creaPannello('pascal') };

    /* ---------- spiegazione ---------- */

    const msgBasic = h('span');
    const msgPascal = h('span');
    const rigaMsgBasic = h('p', { class: 'lab-spaghetti-msg is-basic' }, h('span', { class: 'lab-spaghetti-tag' }, 'GOTO'), msgBasic);
    const rigaMsgPascal = h('p', { class: 'lab-spaghetti-msg is-pascal' }, h('span', { class: 'lab-spaghetti-tag' }, 'Strutturata'), msgPascal);
    const intro = h('p', { class: 'lab-spaghetti-intro' });
    const esito = h('p', { class: 'lab-spaghetti-esito-finale', hidden: true });
    const spiega = h('div', { class: 'pg-spiega lab-spaghetti-spiega' }, intro, rigaMsgBasic, rigaMsgPascal, esito);

    el.append(h('div', { class: 'lab-spaghetti' },
      barraDati, barraComandi, errore,
      h('div', { class: 'lab-spaghetti-arena' }, P.basic.box, P.pascal.box),
      spiega));

    /* ---------- disegno dello stato ---------- */

    function scrivi(nodo, testo) { nodo.replaceChildren(ctx.inline(testo)); }

    function valore(span, testo, anima) {
      if (span.textContent === testo) return;
      span.textContent = testo;
      if (anima && !ctx.riduci) {
        span.classList.remove('is-cambia');
        void span.offsetWidth;
        span.classList.add('is-cambia');
      }
    }

    function spostaBarra(v, indici, durata) {
      const p = P[v];
      p.voci.forEach((li, i) => { if (indici.includes(i)) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
      p.barra.style.transitionDuration = (ctx.riduci ? 0 : Math.round(durata || 0)) + 'ms';
      if (!indici.length) { p.barra.classList.add('is-via'); return; }
      p.barra.classList.remove('is-via');
      p.barra.style.height = (indici.length * LH) + 'px';
      p.barra.style.transform = 'translateY(' + (indici[0] * LH) + 'px)';
    }

    function posizionaGettone(x, y) { P.basic.schema.gettone.setAttribute('transform', 'translate(' + fmt(x) + ' ' + fmt(y) + ')'); }
    function posizionaCornice(r) {
      const c = P.pascal.schema.cornice;
      c.setAttribute('x', fmt(r[0])); c.setAttribute('y', fmt(r[1])); c.setAttribute('width', fmt(r[2])); c.setAttribute('height', fmt(r[3]));
    }

    function segnaProssimo(n) {
      const nodi = P.basic.schema.nodi;
      for (const k of Object.keys(nodi)) nodi[k].classList.toggle('is-prossimo', String(k) === String(n));
    }

    function mostraStrutture(pc) {
      const lista = mappa[pc] || [];
      const interna = lista[lista.length - 1];
      const sc = P.pascal.schema;
      for (const m of MATTONI) {
        const attivo = lista.includes(m.id);
        const v = sc.voci[m.id];
        v.li.classList.toggle('is-attivo', attivo);
        v.li.classList.toggle('is-interno', attivo && m.id === interna);
        v.stato.textContent = attivo ? (m.id === interna ? ' (attivo, il più interno)' : ' (attivo)') : '';
        const t = sc.tinte[m.id];
        t.classList.toggle('is-attiva', attivo);
        t.classList.toggle('is-interna', attivo && m.id === interna);
      }
    }

    function aggiornaPannello(v) {
      const st = V[v];
      const p = P[v];
      valore(p.nIstr, String(st.istr), false);
      valore(p.nSalti, String(st.salti), st.salti > 0);
    }

    const mappa = Logica.mappaStrutture(PROGRAMMA);

    /* ---------- un passo ---------- */

    // Esegue l'istruzione corrente di una versione: aggiorna subito stato e disegno, poi restituisce l'evento.
    function avanza(v) {
      const st = V[v];
      const ev = st.traccia.passi[st.k];
      st.k += 1;
      st.istr += 1;
      if (ev.salto) st.salti += 1;
      if (st.k >= st.traccia.passi.length) st.finito = true;
      const p = P[v];
      if (v === 'basic') {
        st.pc = ev.prossimo == null ? 'fine' : ev.prossimo;
        const g = p.schema.nodi[ev.numero];
        g.classList.remove('is-esegue');
        void g.getBoundingClientRect();
        g.classList.add('is-esegue');
        for (const k of Object.keys(p.schema.etichette)) p.schema.etichette[k].classList.remove('is-preso');
        if (ev.tipo === 'se') {
          const e = p.schema.etichette[ev.numero + (ev.esito ? '-si' : '-no')];
          if (e) e.classList.add('is-preso');
        }
        if (ev.salto) st.frecce.add(ev.numero + '>' + ev.prossimo);
        valore(p.valA, String(ev.dopo.A), ev.cambiata === 'A');
        valore(p.valB, String(ev.dopo.B), ev.cambiata === 'B');
        if (ev.uscita != null) valore(p.valU, ev.uscita, true);
        st.messaggio = testoBasic(ev);
        scrivi(msgBasic, st.messaggio);
      } else {
        st.pc = ev.prossimo || 'fine';
        valore(p.valA, String(ev.dopo.a), ev.cambiata === 'a');
        valore(p.valB, String(ev.dopo.b), ev.cambiata === 'b');
        if (ev.uscita != null) valore(p.valU, ev.uscita, true);
        st.messaggio = testoPascal(ev);
        scrivi(msgPascal, st.messaggio);
      }
      aggiornaPannello(v);
      return { v: v, ev: ev, st: st };
    }

    // Anima lo spostamento verso l'istruzione successiva; se viene annullato, salta allo stato finale.
    async function anima(x) {
      const ep = stato.epoca;
      const t = vel();
      const viaggio = x.v === 'basic' && !x.ev.salto ? t.viaggio * 0.7 : t.viaggio;
      let filo = null;
      try {
        await ctx.attendi(t.esec);
        if (ep !== stato.epoca) return;
        if (x.v === 'basic') {
          const chiave = x.ev.numero + '>' + (x.ev.prossimo == null ? 'fine' : x.ev.prossimo);
          const punti = ARCHI[chiave];
          if (x.ev.salto) filo = nuovoFilo(chiave);
          const L = filo ? filo.getTotalLength() : 0;
          if (filo) { filo.style.strokeDasharray = fmt(L) + ' ' + fmt(L + 2); filo.style.strokeDashoffset = fmt(L); }
          spostaBarra('basic', x.st.pc === 'fine' ? [] : [NUMERI.indexOf(x.st.pc)], viaggio);
          segnaProssimo(null);
          await ctx.anima({
            durata: viaggio, easing: 'sharp',
            aggiorna(f) {
              if (ep !== stato.epoca) return;
              const q = puntoA(punti, f);
              posizionaGettone(q[0], q[1]);
              if (filo) filo.style.strokeDashoffset = fmt(L * (1 - f));
            },
          });
        } else {
          const sc = P.pascal.schema;
          const da = RETT[x.ev.nodo];
          const a = RETT[x.st.pc];
          spostaBarra('pascal', RIGHE_PASCAL[x.st.pc], viaggio);
          if (x.ev.ritorno) { sc.ritorno.classList.add('is-acceso'); sc.ritornoPunta.classList.add('is-acceso'); }
          const giri = [ctx.anima({
            durata: viaggio, easing: 'sharp',
            aggiorna(f) {
              if (ep !== stato.epoca) return;
              posizionaCornice(da.map((d, i) => d + (a[i] - d) * f));
            },
          })];
          if (x.ev.ritorno && !ctx.riduci) {
            giri.push(ctx.anima({
              durata: viaggio, easing: 'sharp',
              aggiorna(f) {
                if (ep !== stato.epoca) return;
                sc.impulso.setAttribute('cy', fmt(182 - (182 - 34) * f));
                sc.impulso.style.opacity = f < 0.96 ? '1' : '0';
              },
            }));
          }
          await Promise.all(giri);
        }
      } finally {
        if (ep === stato.epoca) chiudi(x, filo);
      }
    }

    // Porta il disegno allo stato finale del passo (anche quando l'animazione è stata interrotta).
    function chiudi(x, filo) {
      if (x.v === 'basic') {
        const chiave = x.ev.numero + '>' + (x.ev.prossimo == null ? 'fine' : x.ev.prossimo);
        const punti = ARCHI[chiave];
        const q = punti[punti.length - 1];
        posizionaGettone(q[0], q[1]);
        if (filo) { filo.style.strokeDasharray = ''; filo.style.strokeDashoffset = ''; filo.classList.add('is-posato'); }
        spostaBarra('basic', x.st.pc === 'fine' ? [] : [NUMERI.indexOf(x.st.pc)], 0);
        segnaProssimo(x.st.pc);
      } else {
        const sc = P.pascal.schema;
        posizionaCornice(RETT[x.st.pc]);
        sc.impulso.style.opacity = '0';
        sc.ritorno.classList.remove('is-acceso');
        sc.ritornoPunta.classList.remove('is-acceso');
        spostaBarra('pascal', RIGHE_PASCAL[x.st.pc], 0);
        mostraStrutture(x.st.pc);
      }
    }

    function casuale(min, max) { return min + Math.random() * (max - min); }
    function nuovoFilo(chiave) {
      const g = P.basic.schema.fili;
      const punti = FILI[chiave]({ a: casuale(-3.5, 3.5), b: casuale(-3.5, 3.5), c: casuale(-3, 3), d: casuale(-7, 7) });
      const p = s('path', { d: percorso(punti, casuale(7, 14)) });
      g.append(p);
      while (g.childElementCount > MAX_FILI) g.firstChild.remove();
      return p;
    }

    const NUMERI = PROGRAMMA_BASIC.righe.map((r) => r.numero);

    /* ---------- testi della spiegazione ---------- */

    function testoBasic(ev) {
      const n = ev.numero;
      if (ev.tipo === 'se') {
        if (!ev.esito) return 'Riga ' + n + ': `' + ev.cond + '`? ' + meno(ev.condValori) + ' è falso, si passa alla riga ' + ev.prossimo + '.';
        return 'Riga ' + n + ': `' + ev.cond + '`? ' + meno(ev.condValori) + ' è vero: `GOTO ' + ev.verso + '`, salto ' + (ev.verso > n ? 'in avanti' : 'all\'indietro') + '.';
      }
      if (ev.tipo === 'vai') return 'Riga ' + n + ': `GOTO ' + ev.verso + '`, salto ' + (ev.verso > n ? 'in avanti' : 'all\'indietro') + ' alla riga ' + ev.verso + '.';
      if (ev.tipo === 'assegna') return 'Riga ' + n + ': `' + ev.cambiata + ' = ' + ev.espr + '`, cioè ' + meno(ev.esprValori) + ': ora ' + ev.cambiata + ' vale **' + ev.dopo[ev.cambiata] + '**.';
      if (ev.tipo === 'stampa') return 'Riga ' + n + ': `PRINT A` stampa **' + ev.uscita + '**. Fine del programma.';
      return 'Riga ' + n + '.';
    }

    function testoPascal(ev) {
      const p = ev.prima;
      if (ev.tipo === 'mentre') {
        return ev.esito
          ? 'Iterazione, `while a <> b`: ' + p.a + ' ≠ ' + p.b + ', si entra nel ciclo (giro ' + ev.giro + ').'
          : 'Iterazione, `while a <> b`: ' + p.a + ' = ' + p.b + ', il ciclo finisce e si passa al blocco successivo.';
      }
      if (ev.tipo === 'se') {
        return ev.esito
          ? 'Selezione, `if a > b`: ' + p.a + ' > ' + p.b + ', si esegue il ramo `then`.'
          : 'Selezione, `if a > b`: ' + p.a + ' ≤ ' + p.b + ', si esegue il ramo `else`.';
      }
      if (ev.tipo === 'assegna') {
        const e = ev.espr;
        return '`' + ev.cambiata + ' := ' + e.sx + ' - ' + e.dx + '`, cioè ' + p[e.sx] + ' − ' + p[e.dx] + ': ora ' + ev.cambiata + ' vale **' + ev.dopo[ev.cambiata] + '**. Il blocco finisce e il ciclo torna da solo al suo test.';
      }
      if (ev.tipo === 'scrivi') return '`writeln(a)` stampa **' + ev.uscita + '**. Fine del programma.';
      return '';
    }

    function testoEsito() {
      const b = V.basic;
      const p = V.pascal;
      const m = 'MCD(' + stato.a + ', ' + stato.b + ') = ' + b.traccia.uscita[0];
      const frecce = b.frecce.size === 1 ? 'una sola freccia' : b.frecce.size + ' frecce diverse';
      if (b.finito && p.finito) {
        return '**Stesso risultato: ' + m + '.** Con i GOTO: ' + b.istr + ' istruzioni e ' + b.salti + ' salti, avanti e indietro su ' + frecce + '. ' +
          'Strutturata: ' + p.istr + ' istruzioni e nessun GOTO: si legge dall\'alto in basso, un blocco dentro l\'altro. ' +
          'Il compilatore Pascal i salti li genera comunque, ma li gestisce lui: chi legge non deve inseguirli.';
      }
      if (b.finito) return '**Versione con GOTO finita: ' + m + '**, dopo ' + b.istr + ' istruzioni e ' + b.salti + ' salti. Ora prova quella strutturata.';
      if (p.finito) return '**Versione strutturata finita: ' + m + '**, dopo ' + p.istr + ' istruzioni e nessun GOTO. Ora prova quella con i GOTO.';
      return '';
    }

    function controllaFine() {
      let nuovo = false;
      for (const v of ['basic', 'pascal']) {
        if (V[v].finito && !V[v].annunciato) { V[v].annunciato = true; stato.fatti[v] = true; nuovo = true; }
      }
      if (!nuovo) return;
      const t = testoEsito();
      esito.hidden = !t;
      scrivi(esito, t);
      if (stato.fatti.basic && stato.fatti.pascal && !stato.completato) { stato.completato = true; ctx.completa(); }
      return t;
    }

    // Un passo delle versioni scelte. Le animazioni non rifiutano mai: se vengono annullate
    // ognuna porta il proprio disegno allo stato finale, poi il passo è comunque concluso.
    function passo() {
      const chi = selezionate().filter((v) => !V[v].finito);
      if (!chi.length) return Promise.resolve(null);
      const mosse = chi.map(avanza);
      intro.hidden = true;
      const fine = controllaFine();
      aggiornaComandi();
      stato.animazioni += 1;
      const ep = stato.epoca;
      return Promise.allSettled(mosse.map(anima)).then((esiti) => {
        if (ep === stato.epoca) stato.animazioni -= 1;
        for (const e of esiti) if (e.status === 'rejected' && !ctx.annullato(e.reason)) console.error(e.reason);
        return fine;
      });
    }

    function passoManuale() {
      if (stato.inCorsa || !stato.valido) return coda;
      if (stato.animazioni) ctx.annulla();
      const ep = stato.epoca;
      coda = coda.then(() => {
        if (ep !== stato.epoca) return null;
        const chi = selezionate().filter((v) => !V[v].finito);
        if (!chi.length) return null;
        const p = passo();
        const frasi = chi.map((v) => V[v].messaggio.replace(/[`*]/g, ''));
        return p.then((fine) => { if (ep === stato.epoca) ctx.annuncia(frasi.join(' ') + (fine ? ' ' + fine.replace(/[`*]/g, '') : '')); });
      }).catch((err) => { if (!ctx.annullato(err)) console.error(err); });
      return coda;
    }

    async function esegui() {
      if (!stato.valido) { campoA.focus(); return; }
      if (stato.inCorsa) { ferma(); ctx.annuncia('Esecuzione in pausa.'); return; }
      if (selezionate().every((v) => V[v].finito)) azzera();
      if (stato.animazioni) ctx.annulla();
      stato.inCorsa = true;
      const ep = stato.epoca;
      aggiornaComandi();
      ctx.annuncia('Esecuzione avviata.');
      try {
        await coda;
        let fine = null;
        while (stato.inCorsa && ep === stato.epoca && selezionate().some((v) => !V[v].finito)) {
          fine = (await passo()) || fine;
          if (!stato.inCorsa || ep !== stato.epoca || selezionate().every((v) => V[v].finito)) break;
          await ctx.attendi(vel().sosta);
        }
        if (fine && ep === stato.epoca) ctx.annuncia(fine.replace(/[`*]/g, ''));
      } catch (err) {
        silenzia(err);
      } finally {
        if (ep === stato.epoca) { stato.inCorsa = false; aggiornaComandi(); }
      }
    }

    function ferma() {
      stato.inCorsa = false;
      ctx.annulla();
      aggiornaComandi();
    }

    /* ---------- comandi e dati ---------- */

    function aggiornaComandi() {
      const finite = selezionate().every((v) => V[v] && V[v].finito);
      btnEsegui.textContent = stato.inCorsa ? '❚❚ Pausa' : (finite ? '↺ Esegui di nuovo' : '▶︎ Esegui');
      btnEsegui.disabled = !stato.valido;
      btnPasso.disabled = !stato.valido || stato.inCorsa || finite;
      btnDaCapo.disabled = !stato.valido;
      opzVersione.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === stato.versione)));
      opzVelocita.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === stato.velocita)));
      bottoniEsempio.forEach((b, i) => b.setAttribute('aria-pressed', String(stato.valido && ESEMPI[i][0] === stato.a && ESEMPI[i][1] === stato.b)));
      P.basic.box.classList.toggle('is-spento', stato.versione === 'pascal');
      P.pascal.box.classList.toggle('is-spento', stato.versione === 'basic');
    }

    function scegliVersione(v) {
      if (stato.versione === v) return;
      if (stato.inCorsa) ferma();
      stato.versione = v;
      aggiornaComandi();
      ctx.annuncia(v === 'entrambe' ? 'Corrono entrambe le versioni.' : (v === 'basic' ? 'Corre solo la versione con GOTO.' : 'Corre solo la versione strutturata.'));
    }

    function scegliVelocita(v) {
      stato.velocita = v;
      aggiornaComandi();
    }

    function impostaValori(a, b) {
      campoA.value = String(a);
      campoB.value = String(b);
      leggiCampi();
      ctx.annuncia('A = ' + a + ', B = ' + b + '. Premi Esegui.');
    }

    function leggiCampi() {
      const ra = Logica.valida(campoA.value, 'A');
      const rb = Logica.valida(campoB.value, 'B');
      campoA.setAttribute('aria-invalid', String(!ra.ok));
      campoB.setAttribute('aria-invalid', String(!rb.ok));
      campoA.setAttribute('aria-describedby', id + '-aiuto' + (ra.ok ? '' : ' ' + id + '-err'));
      campoB.setAttribute('aria-describedby', id + '-aiuto' + (rb.ok ? '' : ' ' + id + '-err'));
      const msg = [ra, rb].filter((r) => !r.ok).map((r) => r.errore).join(' ');
      errore.textContent = msg;
      errore.hidden = !msg;
      if (!ra.ok || !rb.ok) {
        if (stato.inCorsa) ferma();
        stato.valido = false;
        aggiornaComandi();
        return;
      }
      const cambiati = !stato.valido || ra.valore !== stato.a || rb.valore !== stato.b;
      stato.valido = true;
      stato.a = ra.valore;
      stato.b = rb.valore;
      if (cambiati) azzera(); else aggiornaComandi();
    }

    /* ---------- da capo ---------- */

    function azzera() {
      stato.epoca += 1;
      stato.inCorsa = false;
      stato.animazioni = 0;
      ctx.annulla();
      coda = Promise.resolve();
      V.basic = { traccia: Logica.tracciaBasic(stato.a, stato.b), k: 0, pc: NUMERI[0], finito: false, istr: 0, salti: 0, frecce: new Set(), messaggio: '' };
      V.pascal = { traccia: Logica.tracciaPascal(stato.a, stato.b), k: 0, pc: 'mentre', finito: false, istr: 0, salti: 0, messaggio: '' };
      const pb = P.basic;
      const pp = P.pascal;
      pb.schema.fili.replaceChildren();
      for (const k of Object.keys(pb.schema.nodi)) pb.schema.nodi[k].classList.remove('is-esegue');
      for (const k of Object.keys(pb.schema.etichette)) pb.schema.etichette[k].classList.remove('is-preso');
      const inizio = ARCHI['inizio>10'];
      posizionaGettone(inizio[1][0], inizio[1][1]);
      segnaProssimo(NUMERI[0]);
      spostaBarra('basic', [0], 0);
      posizionaCornice(RETT.mentre);
      pp.schema.impulso.style.opacity = '0';
      pp.schema.ritorno.classList.remove('is-acceso');
      pp.schema.ritornoPunta.classList.remove('is-acceso');
      spostaBarra('pascal', RIGHE_PASCAL.mentre, 0);
      mostraStrutture('mentre');
      for (const v of ['basic', 'pascal']) {
        const p = P[v];
        valore(p.valA, String(stato.a), false);
        valore(p.valB, String(stato.b), false);
        valore(p.valU, '—', false);
        aggiornaPannello(v);
      }
      intro.hidden = false;
      scrivi(intro, 'Premi **▶︎ Esegui** oppure **Passo**. Il punto e la riga verdi indicano l\'istruzione che sta per essere eseguita; a sinistra ogni `GOTO` lascia una scia gialla.');
      scrivi(msgBasic, 'Pronta alla riga 10, con A = ' + stato.a + ' e B = ' + stato.b + '.');
      scrivi(msgPascal, 'Pronta al `while`, con a = ' + stato.a + ' e b = ' + stato.b + '.');
      esito.hidden = true;
      esito.replaceChildren();
      aggiornaComandi();
    }

    azzera();
    return {};
  }

  /* ======================= esportazione e registrazione ======================= */

  const Logica = {
    BASIC: BASIC,
    PASCAL: PASCAL,
    PROGRAMMA: PROGRAMMA,
    LIMITE: LIMITE,
    ARCHI: ARCHI,
    analizzaBasic: analizzaBasic,
    eseguiBasic: eseguiBasic,
    eseguiStrutturato: eseguiStrutturato,
    tracciaBasic: tracciaBasic,
    tracciaPascal: tracciaPascal,
    mappaStrutture: mappaStrutture,
    mcd: mcd,
    valida: valida,
    lunghezza: lunghezza,
    puntoA: puntoA,
    percorso: percorso,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('spaghetti', { titolo: 'GOTO contro programmazione strutturata', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
