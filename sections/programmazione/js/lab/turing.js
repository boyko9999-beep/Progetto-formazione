/*
 * Laboratorio «La macchina di Turing» (capitolo 2, la logica diventa macchina).
 *
 * Un nastro di caselle, una testina che legge un simbolo alla volta e una tavola di regole:
 * «se sono nello stato S e leggo X, allora scrivo Y, mi sposto e passo allo stato T».
 * La logica pura (il motore e i programmi) è esportata per i test; l'interfaccia la anima:
 * la testina scivola sul nastro, il simbolo scritto si gira, la regola usata si accende.
 */
(function (root) {
  'use strict';

  /* ======================= logica pura: niente DOM ======================= */

  const VUOTO = '□';          // casella vuota del nastro
  const ALT = 'ALT';          // stato di arresto
  const MOSSE = { S: -1, D: 1, F: 0 };
  const LIMITE = 100;         // passi di una corsa prima della pausa automatica
  const MAX_CIFRE = 10;

  // Un programma è una tavola di regole: { stato, legge, scrive, muove, nuovo }.
  // scrive: null = non scrive niente; muove: S sinistra, D destra, F resta ferma.
  const PROGRAMMI = [
    {
      id: 'somma',
      nome: 'Somma 1',
      descrizione: 'Aggiunge 1 a un numero binario, come in colonna. In **q0** la testina corre a destra fino alla fine del numero; in **q1** torna indietro: ogni 1 diventa 0 con il riporto, il primo 0 (o la prima casella vuota) diventa 1.',
      vuoto: VUOTO,
      simboli: ['0', '1', VUOTO],
      stati: [{ id: 'q0', nota: 'cerca la fine' }, { id: 'q1', nota: 'riporto' }],
      iniziale: 'q0',
      ingresso: { predefinito: '1011', esempi: ['1011', '111', '10011'] },
      partenza: 'inizio',
      regole: [
        { stato: 'q0', legge: '0', scrive: null, muove: 'D', nuovo: 'q0' },
        { stato: 'q0', legge: '1', scrive: null, muove: 'D', nuovo: 'q0' },
        { stato: 'q0', legge: VUOTO, scrive: null, muove: 'S', nuovo: 'q1' },
        { stato: 'q1', legge: '1', scrive: '0', muove: 'S', nuovo: 'q1' },
        { stato: 'q1', legge: '0', scrive: '1', muove: 'F', nuovo: ALT },
        { stato: 'q1', legge: VUOTO, scrive: '1', muove: 'F', nuovo: ALT },
      ],
    },
    {
      id: 'ciao',
      nome: 'Scrivi CIAO',
      descrizione: 'Il nastro è vuoto. Quattro stati, uno per lettera: ognuno scrive la sua, sposta la testina a destra e passa il comando allo stato successivo. L\'ultimo scrive O e si ferma.',
      vuoto: VUOTO,
      simboli: [VUOTO, 'C', 'I', 'A', 'O'],
      stati: [{ id: 'q0', nota: 'scrive C' }, { id: 'q1', nota: 'scrive I' }, { id: 'q2', nota: 'scrive A' }, { id: 'q3', nota: 'scrive O' }],
      iniziale: 'q0',
      ingresso: null,
      partenza: 'inizio',
      regole: [
        { stato: 'q0', legge: VUOTO, scrive: 'C', muove: 'D', nuovo: 'q1' },
        { stato: 'q1', legge: VUOTO, scrive: 'I', muove: 'D', nuovo: 'q2' },
        { stato: 'q2', legge: VUOTO, scrive: 'A', muove: 'D', nuovo: 'q3' },
        { stato: 'q3', legge: VUOTO, scrive: 'O', muove: 'F', nuovo: ALT },
      ],
    },
    {
      id: 'castoro',
      nome: 'Castoro indaffarato',
      descrizione: 'Il «castoro indaffarato» con 2 stati e 2 simboli: parte da un nastro pieno di 0 e scrive più 1 che può, ma alla fine deve fermarsi. La gara l\'ha inventata Tibor Radó nel 1962.',
      vuoto: '0',
      simboli: ['0', '1'],
      stati: [{ id: 'q0', nota: 'primo stato' }, { id: 'q1', nota: 'secondo stato' }],
      iniziale: 'q0',
      ingresso: null,
      partenza: 'inizio',
      record: { uni: 4, passi: 6 },
      regole: [
        { stato: 'q0', legge: '0', scrive: '1', muove: 'D', nuovo: 'q1' },
        { stato: 'q0', legge: '1', scrive: '1', muove: 'S', nuovo: 'q1' },
        { stato: 'q1', legge: '0', scrive: '1', muove: 'S', nuovo: 'q0' },
        { stato: 'q1', legge: '1', scrive: '1', muove: 'D', nuovo: ALT },
      ],
    },
    {
      id: 'inverti',
      nome: 'Inverti i bit',
      descrizione: 'Scorre il numero da sinistra a destra e scambia ogni 0 con 1 e ogni 1 con 0. Alla prima casella vuota si ferma.',
      vuoto: VUOTO,
      simboli: ['0', '1', VUOTO],
      stati: [{ id: 'q0', nota: 'inverte' }],
      iniziale: 'q0',
      ingresso: { predefinito: '1011', esempi: ['1011', '0110', '11111'] },
      partenza: 'inizio',
      regole: [
        { stato: 'q0', legge: '0', scrive: '1', muove: 'D', nuovo: 'q0' },
        { stato: 'q0', legge: '1', scrive: '0', muove: 'D', nuovo: 'q0' },
        { stato: 'q0', legge: VUOTO, scrive: null, muove: 'F', nuovo: ALT },
      ],
    },
    {
      id: 'turing36',
      nome: 'Turing 1936',
      descrizione: 'La prima macchina dell\'articolo di Turing, con i suoi nomi per gli stati: b, c, e, f. Stampa 0 e 1 su caselle alterne e non si ferma mai: per Turing era giusto così, perché una macchina che calcola un numero continua a scriverne le cifre.',
      vuoto: VUOTO,
      simboli: [VUOTO, '0', '1'],
      stati: [{ id: 'b', nota: 'stampa 0' }, { id: 'c', nota: 'salta' }, { id: 'e', nota: 'stampa 1' }, { id: 'f', nota: 'salta' }],
      iniziale: 'b',
      ingresso: null,
      partenza: 'inizio',
      limite: 40,
      regole: [
        { stato: 'b', legge: VUOTO, scrive: '0', muove: 'D', nuovo: 'c' },
        { stato: 'c', legge: VUOTO, scrive: null, muove: 'D', nuovo: 'e' },
        { stato: 'e', legge: VUOTO, scrive: '1', muove: 'D', nuovo: 'f' },
        { stato: 'f', legge: VUOTO, scrive: null, muove: 'D', nuovo: 'b' },
      ],
    },
  ];

  function programma(id) {
    return PROGRAMMI.find((p) => p.id === id) || null;
  }

  function copiaRegole(regole) {
    return regole.map((r) => Object.assign({}, r));
  }

  function stesseRegole(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    return a.every((r, i) => r.stato === b[i].stato && r.legge === b[i].legge && r.scrive === b[i].scrive && r.muove === b[i].muove && r.nuovo === b[i].nuovo);
  }

  // Controlla il numero binario scritto nel campo del nastro.
  function valida(testo, max) {
    const lim = max || MAX_CIFRE;
    const t = String(testo == null ? '' : testo).replace(/\s+/g, '');
    if (!t) return { ok: false, errore: 'Il nastro è vuoto: scrivi un numero binario, per esempio 1011.' };
    const sbagliato = t.match(/[^01]/);
    if (sbagliato) return { ok: false, errore: 'Sul nastro vanno solo le cifre 0 e 1: togli «' + sbagliato[0] + '».' };
    if (t.length > lim) return { ok: false, errore: 'Al massimo ' + lim + ' cifre, così il nastro resta leggibile (ne hai scritte ' + t.length + ').' };
    return { ok: true, valore: t };
  }

  // Configurazione iniziale: il nastro con l'ingresso dalla casella 0, la testina sulla prima cifra.
  function crea(prog, ingresso) {
    const celle = {};
    const simboli = String(ingresso || '').split('');
    simboli.forEach((x, i) => { if (x !== prog.vuoto) celle[i] = x; });
    const testina = prog.partenza === 'fine' ? Math.max(0, simboli.length - 1) : 0;
    return { celle: celle, testina: testina, stato: prog.iniziale, passi: 0, fermo: false, motivo: null };
  }

  function leggi(m, pos, vuoto) {
    const x = m.celle[pos];
    return x == null ? vuoto : x;
  }

  function trovaRegola(regole, stato, simbolo) {
    for (let i = 0; i < regole.length; i++) {
      if (regole[i].stato === stato && regole[i].legge === simbolo) return { regola: regole[i], indice: i };
    }
    return null;
  }

  // Un passo: legge, trova la regola, scrive, si sposta, cambia stato. Non modifica m.
  // Restituisce null se la macchina è già ferma.
  function passo(prog, m, regole) {
    if (m.fermo) return null;
    const tavola = regole || prog.regole;
    const letto = leggi(m, m.testina, prog.vuoto);
    const trovata = trovaRegola(tavola, m.stato, letto);
    if (!trovata) {
      return {
        macchina: Object.assign({}, m, { celle: Object.assign({}, m.celle), fermo: true, motivo: 'nessuna-regola' }),
        regola: null, indice: -1, letto: letto, scritto: letto, da: m.testina, a: m.testina,
        statoPrima: m.stato, statoDopo: m.stato, fermo: true, motivo: 'nessuna-regola',
      };
    }
    const r = trovata.regola;
    const scritto = r.scrive == null ? letto : r.scrive;
    const celle = Object.assign({}, m.celle);
    if (scritto === prog.vuoto) delete celle[m.testina]; else celle[m.testina] = scritto;
    const a = m.testina + (MOSSE[r.muove] || 0);
    const fermo = r.nuovo === ALT;
    const macchina = { celle: celle, testina: a, stato: r.nuovo, passi: m.passi + 1, fermo: fermo, motivo: fermo ? 'alt' : null };
    return {
      macchina: macchina, regola: r, indice: trovata.indice, letto: letto, scritto: scritto, da: m.testina, a: a,
      statoPrima: m.stato, statoDopo: r.nuovo, fermo: fermo, motivo: macchina.motivo,
    };
  }

  // Esegue fino all'arresto o al limite di passi (il ciclo è sempre limitato).
  function esegui(prog, ingresso, limite, regole) {
    let m = crea(prog, ingresso);
    const max = limite == null ? 1000 : limite;
    for (let i = 0; i < max && !m.fermo; i++) {
      const p = passo(prog, m, regole);
      if (!p) break;
      m = p.macchina;
    }
    return m;
  }

  function estremi(m) {
    const pos = Object.keys(m.celle).map(Number);
    if (!pos.length) return null;
    return { min: Math.min.apply(null, pos), max: Math.max.apply(null, pos) };
  }

  // Il contenuto del nastro tra il primo e l'ultimo simbolo non vuoto.
  function contenuto(m, vuoto) {
    const e = estremi(m);
    if (!e) return '';
    let s = '';
    for (let p = e.min; p <= e.max; p++) s += leggi(m, p, vuoto);
    return s;
  }

  function conta(m, simbolo) {
    return Object.keys(m.celle).filter((k) => m.celle[k] === simbolo).length;
  }

  /* ---------- il racconto di un passo ---------- */

  function detto(simbolo, prog) {
    return simbolo === VUOTO && prog.vuoto === VUOTO ? 'una casella vuota' : simbolo;
  }

  // Il passo in parti colorabili: { t: testo, k: tipo } con k = stato, legge, scrive, muove, alt.
  function raccontoParti(info, prog) {
    const parti = [{ t: 'Nello stato ' }, { t: info.statoPrima, k: 'stato' }, { t: ' leggo ' }, { t: detto(info.letto, prog), k: 'legge' }];
    if (!info.regola) {
      parti.push({ t: ': nessuna regola dice che cosa fare, quindi la macchina si blocca.' });
      return parti;
    }
    const r = info.regola;
    parti.push({ t: ': ' });
    if (r.scrive == null) parti.push({ t: 'non scrivo niente', k: 'scrive' });
    else if (r.scrive === VUOTO && info.letto === VUOTO) parti.push({ t: 'lascio la casella vuota', k: 'scrive' });
    else if (r.scrive === VUOTO) parti.push({ t: 'cancello ' + info.letto, k: 'scrive' });
    else parti.push({ t: 'scrivo ' + r.scrive, k: 'scrive' });
    parti.push({ t: ', ' });
    parti.push({ t: r.muove === 'S' ? 'vado a sinistra' : (r.muove === 'D' ? 'vado a destra' : 'non mi sposto'), k: 'muove' });
    parti.push({ t: ', ' });
    if (r.nuovo === ALT) parti.push({ t: 'passo in ' }, { t: ALT, k: 'alt' }, { t: ': mi fermo.' });
    else if (r.nuovo === info.statoPrima) parti.push({ t: 'resto in ' }, { t: r.nuovo, k: 'stato' }, { t: '.' });
    else parti.push({ t: 'passo in ' }, { t: r.nuovo, k: 'stato' }, { t: '.' });
    return parti;
  }

  function racconta(info, prog) {
    return raccontoParti(info, prog).map((p) => p.t).join('');
  }

  /* ---------- il risultato quando la macchina si ferma ---------- */

  function decimale(bin) {
    return /^[01]+$/.test(bin) ? parseInt(bin, 2) : null;
  }

  function mostraNastro(s) {
    return s || 'niente';
  }

  // Frase sul risultato: { titolo, testo } secondo il motivo dell'arresto.
  function esito(prog, ingresso, m, regole) {
    const modificata = regole ? !stesseRegole(regole, prog.regole) : false;
    const nastro = contenuto(m, prog.vuoto);
    if (m.motivo === 'nessuna-regola') {
      return {
        titolo: 'Bloccata',
        testo: 'Nello stato ' + m.stato + ' la testina legge ' + detto(leggi(m, m.testina, prog.vuoto), prog) + ' e nessuna regola dice che cosa fare. Sul nastro: ' + mostraNastro(nastro) + '.',
      };
    }
    if (!m.fermo) {
      const lim = prog.limite || LIMITE;
      if (prog.id === 'turing36' && !modificata) {
        return {
          titolo: 'Pausa',
          testo: 'Dopo ' + m.passi + ' passi questa macchina non si è fermata e non lo farà mai: stamperebbe 0 e 1 per sempre. Premi ▶ per farla continuare.',
        };
      }
      return {
        titolo: 'Pausa',
        testo: 'Ogni ' + lim + ' passi senza ALT il laboratorio fa una pausa. Questa macchina si fermerà mai? In generale nessun programma può prevederlo per tutte le macchine: è il problema della fermata. Premi ▶ per continuare.',
      };
    }
    const passi = m.passi + (m.passi === 1 ? ' passo' : ' passi');
    if (prog.id === 'somma') {
      const a = decimale(ingresso);
      const b = decimale(nastro);
      return { titolo: ALT, testo: 'Fatto in ' + passi + '. Partita da ' + ingresso + ' (' + a + ' in decimale), sul nastro ora c\'è ' + (nastro || 'niente') + (b == null ? '' : ' (' + b + ')') + '.' };
    }
    if (prog.id === 'inverti') {
      return { titolo: ALT, testo: 'Fatto in ' + passi + '. Partita da ' + ingresso + ', sul nastro ora c\'è ' + (nastro || 'niente') + '.' };
    }
    if (prog.id === 'castoro') {
      const uni = conta(m, '1');
      if (!modificata) {
        return { titolo: ALT, testo: uni + ' uni in ' + passi + ': con 2 stati e 2 simboli nessuna macchina che si ferma fa di meglio. Prova a cambiare la tavola: riesci a pareggiare il record?' };
      }
      const rec = prog.record;
      const pari = uni === rec.uni;
      return { titolo: ALT, testo: 'La tua tavola: ' + uni + (uni === 1 ? ' uno' : ' uni') + ' in ' + passi + '. ' + (pari ? 'Hai pareggiato il record: più di ' + rec.uni + ' uni, con 2 stati, non si può.' : 'Il record con 2 stati è ' + rec.uni + ' uni in ' + rec.passi + ' passi.') };
    }
    if (prog.id === 'ciao' && nastro === 'CIAO') {
      return { titolo: ALT, testo: 'Fatto in ' + passi + ': sul nastro c\'è scritto CIAO. Una regola per lettera, ognuna in uno stato diverso.' };
    }
    return { titolo: ALT, testo: 'Fatto in ' + passi + '. Sul nastro: ' + mostraNastro(nastro) + '.' };
  }

  // Valori tra cui scegliere quando si modifica una regola.
  function opzioni(prog, campo) {
    if (campo === 'scrive') return [null].concat(prog.simboli);
    if (campo === 'muove') return ['S', 'D', 'F'];
    if (campo === 'nuovo') return prog.stati.map((s) => s.id).concat(ALT);
    return [];
  }

  function prossimo(lista, valore, verso) {
    const i = lista.indexOf(valore);
    const n = lista.length;
    return lista[((i < 0 ? 0 : i + (verso < 0 ? -1 : 1)) + n) % n];
  }

  const Logica = {
    VUOTO: VUOTO,
    ALT: ALT,
    MOSSE: MOSSE,
    LIMITE: LIMITE,
    MAX_CIFRE: MAX_CIFRE,
    PROGRAMMI: PROGRAMMI,
    programma: programma,
    copiaRegole: copiaRegole,
    stesseRegole: stesseRegole,
    valida: valida,
    crea: crea,
    leggi: leggi,
    trovaRegola: trovaRegola,
    passo: passo,
    esegui: esegui,
    estremi: estremi,
    contenuto: contenuto,
    conta: conta,
    raccontoParti: raccontoParti,
    racconta: racconta,
    decimale: decimale,
    esito: esito,
    opzioni: opzioni,
    prossimo: prossimo,
  };

  /* ======================= interfaccia ======================= */

  // Colori fissi: verde = testina e regola in uso, ambra = simbolo scritto,
  // azzurro = stato, rosa = ALT. Il nastro è una striscia di carta dentro lo strumento scuro.
  const css = `
    .lab-turing { container-type: inline-size; }
    .lab-turing [hidden] { display: none !important; }
    .lab-turing .pg-etichetta { font-size: 13.5px; }
    .lab-turing-forte { font-weight: 700; color: var(--lab-bright); }
    .lab-turing-scelte { display: flex; flex-wrap: wrap; gap: 6px; }
    .lab-turing-scelte .pg-btn { min-height: 40px; }

    .lab-turing-scheda { display: grid; gap: 10px; padding: 12px 18px 14px; border-bottom: 1px solid var(--lab-line); background: var(--lab-panel); }
    .lab-turing-descr { margin: 0; max-width: 80ch; font-size: .95rem; line-height: 1.55; color: var(--lab-text); text-wrap: pretty; }
    .lab-turing-descr strong { font: 700 .98em var(--mono); color: var(--trace-3); }
    .lab-turing-ingresso { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
    .lab-turing-ingresso[hidden] { display: none; }
    .lab-turing-campo { width: 8.6em; font-size: 1.05rem; letter-spacing: .14em; }
    .lab-turing-campo[aria-invalid="true"] { border-color: #ff8a7a; color: #ffb4a8; }
    .lab-turing-aiuto { font-size: 13px; color: var(--lab-text); }
    .lab-turing-esempi { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 13px; color: var(--lab-text); }
    .lab-turing-esempi .pg-btn { font-family: var(--mono); letter-spacing: .08em; padding: 0 10px; }
    .lab-turing-errore { margin: 0; padding: 8px 12px; border-radius: 8px; background: rgba(255, 120, 100, .1); border: 1px solid rgba(255, 138, 122, .4); color: #ffc7bd; font-size: .92rem; }
    .lab-turing-errore[hidden] { display: none; }

    .lab-turing-velocita { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .lab-turing-velocita .pg-cursore { width: 110px; min-height: 40px; margin: 0; cursor: pointer; }
    .lab-turing-velocita .pg-lettura { min-width: 7.6em; font-size: 13.5px; }
    .lab-turing-contatore { display: inline-flex; align-items: baseline; gap: 7px; font-size: 13.5px; color: var(--lab-text); }
    .lab-turing-contatore strong { min-width: 2.4ch; font: 800 1.2rem var(--mono); color: var(--lab-bright); font-variant-numeric: tabular-nums; }

    .lab-turing-palco { position: relative; padding: 16px 0 4px; background: radial-gradient(70% 110% at 50% 0%, rgba(62, 224, 143, .07), transparent 72%); transition: opacity var(--pg-dur-normale) ease; }
    .lab-turing.is-invalido .lab-turing-palco, .lab-turing.is-invalido .lab-turing-sotto { opacity: .42; }
    .lab-turing-finestra {
      --c: clamp(38px, calc((100cqw - 40px) / 15), 58px);
      --testa-h: 70px;
      --hx: 0; --cam: 0;
      position: relative; height: calc(var(--testa-h) + var(--c) + 26px); overflow: hidden;
      -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 9%, #000 91%, transparent 100%);
      mask-image: linear-gradient(90deg, transparent 0, #000 9%, #000 91%, transparent 100%);
    }
    .lab-turing-finestra::before {
      content: ""; position: absolute; left: 0; right: 0; top: var(--testa-h); height: var(--c);
      background: #efe7d3; box-shadow: inset 0 2px 0 #c9ba96, inset 0 -2px 0 #c9ba96, 0 14px 26px -14px #000;
    }
    .lab-turing-striscia { position: absolute; left: 50%; top: var(--testa-h); width: 0; height: var(--c); transform: translateX(calc((var(--cam) * -1 - .5) * var(--c))); }
    .lab-turing-cella { position: absolute; left: 0; top: 0; width: var(--c); height: var(--c); display: grid; place-items: center; transform: translateX(calc(var(--p) * var(--c))); box-shadow: inset 1px 0 0 rgba(84, 68, 38, .32); perspective: 260px; }
    .lab-turing-cella::before { content: ""; position: absolute; inset: 2px 1px; background: #ffc35a; opacity: var(--lampo, 0); }
    .lab-turing-cella::after { content: ""; position: absolute; left: 6px; right: 6px; bottom: 5px; height: 3px; border-radius: 2px; background: #c98000; opacity: 0; transition: opacity var(--pg-dur-veloce) ease; }
    .lab-turing-cella.is-ultima::after { opacity: 1; }
    .lab-turing-simbolo { position: relative; z-index: 1; display: block; font: 800 calc(var(--c) * .52)/1 var(--mono); color: #1d1912; backface-visibility: hidden; }
    .lab-turing-cella.is-vuoto .lab-turing-simbolo { color: #8f8160; font-weight: 600; }

    .lab-turing-testina { position: absolute; z-index: 2; left: 50%; top: 0; width: var(--c); height: calc(var(--testa-h) + var(--c)); transform: translateX(calc((var(--hx) - var(--cam) - .5) * var(--c))); pointer-events: none; }
    .lab-turing-braccio { position: absolute; inset: 0; }
    .lab-turing-carrello {
      position: absolute; left: 50%; top: 2px; transform: translateX(-50%); box-sizing: border-box; min-width: 70px; height: 50px; padding: 4px 12px;
      display: grid; justify-items: center; align-content: center; gap: 1px; border-radius: 11px; border: 2px solid var(--trace-1);
      background: linear-gradient(180deg, #1c2b26, #0e1714); box-shadow: 0 0 0 4px rgba(62, 224, 143, .1), 0 12px 22px -12px #000;
    }
    .lab-turing-carrello-eti { font: 700 13px/1 var(--font); color: var(--lab-text); }
    .lab-turing-carrello-fin { display: block; height: 22px; overflow: hidden; }
    .lab-turing-carrello-val { display: block; font: 800 19px/22px var(--mono); color: var(--trace-3); }
    .lab-turing-punta { position: absolute; left: 50%; top: 52px; width: 16px; height: 11px; margin-left: -8px; background: var(--trace-1); clip-path: polygon(0 0, 100% 0, 50% 100%); }
    .lab-turing-occhio { position: absolute; left: -5px; right: -5px; top: calc(var(--testa-h) - 5px); height: calc(var(--c) + 10px); box-sizing: border-box; border: 3px solid var(--trace-1); border-radius: 10px; box-shadow: 0 0 16px rgba(62, 224, 143, .5), inset 0 0 10px rgba(62, 224, 143, .28); overflow: hidden; }
    .lab-turing-scansione { position: absolute; left: 0; right: 0; top: 0; height: 4px; background: linear-gradient(90deg, transparent, rgba(30, 170, 100, .95), transparent); opacity: 0; }
    .lab-turing-testina.is-alt .lab-turing-carrello { border-color: var(--trace-4); box-shadow: 0 0 0 4px rgba(255, 122, 168, .12), 0 12px 22px -12px #000; }
    .lab-turing-testina.is-alt .lab-turing-carrello-val { color: var(--trace-4); }
    .lab-turing-testina.is-alt .lab-turing-punta { background: var(--trace-4); }
    .lab-turing-testina.is-alt .lab-turing-occhio { border-color: var(--trace-4); box-shadow: 0 0 16px rgba(255, 122, 168, .45), inset 0 0 10px rgba(255, 122, 168, .25); }

    .lab-turing-spiega { display: grid; gap: 10px; border-top: 0; padding-top: 4px; min-height: 0; }
    .lab-turing-racconto { margin: 0 !important; min-height: 3.2em; font-size: 1.02rem; line-height: 1.6; color: var(--lab-text); text-wrap: pretty; }
    .lab-turing-k-stato { font: 700 .98em var(--mono); color: var(--trace-3); }
    .lab-turing-k-legge { font-weight: 700; color: var(--lab-bright); }
    .lab-turing-k-scrive { font-weight: 700; color: var(--trace-2); }
    .lab-turing-k-muove { font-weight: 700; color: var(--trace-1); }
    .lab-turing-k-alt { font: 800 .98em var(--mono); color: var(--trace-4); }
    .lab-turing-avviso { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 12px; align-items: baseline; padding: 10px 14px; border-radius: 10px; background: color-mix(in srgb, var(--trace-4) 10%, var(--lab-panel)); border: 1px solid color-mix(in srgb, var(--trace-4) 48%, transparent); animation: lab-turing-entra var(--pg-dur-normale) var(--pg-ease-smooth); }
    .lab-turing-avviso[hidden] { display: none; }
    .lab-turing-avviso-t { font: 800 .9rem/1.2 var(--mono); letter-spacing: .08em; color: #2b0716; background: var(--trace-4); padding: 3px 8px 2px; border-radius: 6px; }
    .lab-turing-avviso p { margin: 0 !important; color: var(--lab-bright); line-height: 1.5; }
    .lab-turing-avviso.is-pausa { background: color-mix(in srgb, var(--trace-2) 9%, var(--lab-panel)); border-color: color-mix(in srgb, var(--trace-2) 45%, transparent); }
    .lab-turing-avviso.is-pausa .lab-turing-avviso-t { background: var(--trace-2); color: #221500; }
    @keyframes lab-turing-entra { from { opacity: 0; transform: translateY(6px); } }

    .lab-turing-sotto { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; padding: 4px 18px 18px; transition: opacity var(--pg-dur-normale) ease; }
    .lab-turing-titoletto { margin: 0; font: 800 13px/1.3 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--lab-text); }
    .lab-turing-tavola-testa { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
    .lab-turing-azioni { display: inline-flex; flex-wrap: wrap; gap: 6px; }
    .lab-turing-aiuto-mod { margin: 0 0 8px; font-size: 13px; color: var(--trace-2); }
    .lab-turing-aiuto-mod[hidden] { display: none; }
    .lab-turing-wrap { position: relative; overflow-x: auto; scrollbar-width: thin; }
    .lab-turing-barra { position: absolute; left: 0; right: 0; top: 0; height: 40px; border-radius: 8px; background: color-mix(in srgb, var(--trace-1) 15%, transparent); box-shadow: inset 4px 0 0 var(--trace-1); opacity: 0; pointer-events: none; will-change: transform; }
    .lab-turing-barra::after { content: ""; position: absolute; inset: 0; border-radius: inherit; border: 2px solid var(--trace-1); opacity: 0; }
    .lab-turing-barra.is-impulso::after { animation: lab-turing-impulso var(--pg-dur-lenta) ease-out; }
    @keyframes lab-turing-impulso { from { opacity: .95; transform: scale(1); } to { opacity: 0; transform: scale(1.03, 1.3); } }
    .lab-turing-tab { position: relative; z-index: 1; width: 100%; min-width: 0; border-collapse: separate; border-spacing: 0; font: 700 15px var(--mono); color: var(--lab-bright); }
    .lab-turing-tab th, .lab-turing-tab td { position: static; height: 40px; padding: 0 6px; text-align: center; vertical-align: middle; border-bottom: 1px solid var(--lab-line); background: transparent; }
    .lab-turing-tab thead th { height: auto; padding: 4px 6px 7px; font: 700 13px/1.25 var(--font); letter-spacing: 0; text-transform: none; color: var(--lab-text); }
    .lab-turing-tab thead .lab-turing-gruppi th { padding: 0 6px 2px; border-bottom: 0; font: 800 13px var(--mono); letter-spacing: .14em; text-transform: uppercase; }
    .lab-turing-gruppi .is-se { color: var(--lab-bright); }
    .lab-turing-gruppi .is-allora { color: var(--trace-2); }
    .lab-turing-tab tbody tr:hover { background: transparent; }
    .lab-turing-tab tbody tr:last-child td { border-bottom: 0; }
    .lab-turing-tab td:nth-child(2), .lab-turing-tab thead tr:last-child th:nth-child(2) { border-right: 1px dashed color-mix(in srgb, var(--lab-text) 35%, transparent); }
    .lab-turing-tab td > span, .lab-turing-valore > span { display: inline-block; transition: transform var(--pg-dur-veloce) var(--pg-ease-bounce); }
    .lab-turing-tab td.is-acceso > span, .lab-turing-tab td.is-acceso .lab-turing-valore > span { transform: scale(1.22); text-shadow: 0 0 12px currentColor; }
    td.lab-turing-stato, td.lab-turing-nuovo { color: var(--trace-3); }
    td.lab-turing-scrive { color: var(--trace-2); }
    td.lab-turing-muove { font-size: 20px; }
    td.lab-turing-nuovo.is-alt { color: var(--trace-4); }
    .lab-turing-tab tbody tr.is-prossima td:first-child { position: relative; }
    .lab-turing-tab tbody tr.is-prossima td:first-child::before { content: "▸"; position: absolute; left: 2px; top: 50%; transform: translateY(-52%); color: var(--trace-1); font-size: 15px; }
    .lab-turing-valore { min-width: 46px; min-height: 40px; margin: 2px 0; padding: 0 8px; border-radius: 8px; border: 1px dashed color-mix(in srgb, currentColor 60%, transparent); background: rgba(255, 255, 255, .04); color: inherit; font: inherit; cursor: pointer; }
    .lab-turing-valore:hover { background: rgba(255, 255, 255, .1); border-style: solid; }
    .lab-turing-legenda { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 10px 0 0; font-size: 13px; color: var(--lab-text); }
    .lab-turing-legenda b { font-family: var(--mono); color: var(--lab-bright); }

    .lab-turing-quadro { display: grid; gap: 10px; align-content: start; }
    .lab-turing-stati { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
    .lab-turing-stati li { display: inline-flex; align-items: baseline; gap: 7px; padding: 7px 10px; border-radius: 9px; border: 1px solid var(--lab-line); background: var(--lab-bg); font-size: 13px; color: var(--lab-text); transition: border-color var(--pg-dur-veloce) ease, background-color var(--pg-dur-veloce) ease, color var(--pg-dur-veloce) ease; }
    .lab-turing-stati b { font: 800 15px var(--mono); color: var(--trace-3); }
    .lab-turing-stati li.is-alt b { color: var(--trace-4); }
    .lab-turing-stati li[aria-current] { border-color: var(--trace-3); background: color-mix(in srgb, var(--trace-3) 16%, var(--lab-bg)); color: var(--lab-bright); }
    .lab-turing-stati li.is-alt[aria-current] { border-color: var(--trace-4); background: color-mix(in srgb, var(--trace-4) 16%, var(--lab-bg)); }
    .lab-turing-nastro-testo { margin: 0; min-height: 1.4em; font: 700 1.25rem/1.4 var(--mono); letter-spacing: .1em; color: var(--lab-bright); word-break: break-all; }
    .lab-turing-nota { margin: 0; font-size: 13px; line-height: 1.5; color: var(--lab-text); }

    @container (min-width: 760px) {
      .lab-turing-sotto { grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); align-items: start; }
    }
    @container (max-width: 560px) {
      .lab-turing-scelte { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; }
      .lab-turing-scelte .pg-btn { white-space: normal; line-height: 1.2; padding: 4px 10px; }
      .lab-turing-scheda { padding: 10px 12px 12px; }
      .lab-turing-sotto { padding: 4px 10px 12px; gap: 10px; }
      .lab-turing-sotto .pg-pannello { padding: 10px; }
      .lab-turing-finestra { --testa-h: 66px; }
      .lab-turing-tab th, .lab-turing-tab td { padding: 0 3px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .lab-turing-palco, .lab-turing-sotto, .lab-turing-cella::after, .lab-turing-stati li, .lab-turing-tab td > span, .lab-turing-valore > span { transition: none; }
      .lab-turing-avviso, .lab-turing-barra.is-impulso::after { animation: none; }
    }
  `;

  /* ======================= interfaccia ======================= */

  function monta(el, ctx) {
    const { h } = ctx;
    const D = ctx.DURATA;
    const E = ctx.EASING;
    const id = ctx.uid('turing');
    const R = 13; // caselle disegnate a destra e a sinistra della testina
    const VEL = [null,
      { nome: 'molto lenta', leggi: D.lenta, scrivi: D.lenta, muovi: D.narrativa, sosta: D.lenta },
      { nome: 'lenta', leggi: D.normale, scrivi: D.normale, muovi: D.lenta, sosta: D.normale },
      { nome: 'media', leggi: D.veloce, scrivi: D.normale, muovi: D.normale, sosta: D.veloce },
      { nome: 'veloce', leggi: D.istante, scrivi: D.veloce, muovi: D.veloce, sosta: D.istante },
      { nome: 'velocissima', leggi: 0, scrivi: D.istante, muovi: D.istante, sosta: 0 },
    ];
    const S = {
      prog: PROGRAMMI[0], ingressi: {}, regolePer: {}, regole: null, ingresso: '',
      m: null, ultimo: null, valido: true, inCorsa: false, pausaLimite: false,
      epoca: 0, velocita: 3, modifica: false,
    };
    PROGRAMMI.forEach((p) => { if (p.ingresso) S.ingressi[p.id] = p.ingresso.predefinito; });
    S.regole = copiaRegole(S.prog.regole);

    let coda = Promise.resolve();
    let seq = 0;
    let animando = false;
    let barraY = null;
    let righe = [];
    const celle = new Map();
    const silenzia = (err) => { if (!ctx.annullato(err)) console.error(err); };
    const piano = (t) => String(t).replace(/\*\*/g, '');
    const anima = (durata, aggiorna, easing) => ctx.anima({ durata: durata, easing: easing || 'linear', aggiorna: aggiorna });

    /* ---------- barra 1: il programma ---------- */

    const bottoniProg = PROGRAMMI.map((p) => h('button', {
      type: 'button', class: 'pg-btn', 'aria-pressed': String(p === S.prog), 'data-p': p.id, onclick: () => scegliProgramma(p.id),
    }, p.nome));
    const barraProg = h('div', { class: 'pg-strumenti lab-turing-programmi' },
      h('span', { class: 'pg-etichetta lab-turing-forte', id: id + '-prog' }, 'Programma'),
      h('div', { class: 'lab-turing-scelte', role: 'group', 'aria-labelledby': id + '-prog' }, bottoniProg));

    const descr = h('p', { class: 'lab-turing-descr', id: id + '-descr' });
    const campo = h('input', {
      class: 'pg-campo lab-turing-campo', id: id + '-campo', type: 'text', inputmode: 'numeric', maxlength: '14',
      autocomplete: 'off', spellcheck: 'false', 'aria-describedby': id + '-aiuto', value: S.ingressi.somma,
    });
    const errore = h('p', { class: 'lab-turing-errore', id: id + '-err', role: 'alert', hidden: true });
    const esempi = h('span', { class: 'lab-turing-esempi', role: 'group', 'aria-labelledby': id + '-es' });
    const rigaIngresso = h('div', { class: 'lab-turing-ingresso' },
      h('label', { class: 'pg-etichetta lab-turing-forte', for: campo.id }, 'Numero sul nastro', campo),
      h('span', { class: 'lab-turing-aiuto', id: id + '-aiuto' }, 'solo 0 e 1, fino a ' + MAX_CIFRE + ' cifre'),
      esempi);
    const scheda = h('div', { class: 'lab-turing-scheda' }, descr, rigaIngresso, errore);

    /* ---------- barra 2: i comandi ---------- */

    const btnEsegui = h('button', { type: 'button', class: 'pg-btn pg-btn--primario', onclick: () => esegui() }, '▶︎ Esegui');
    const btnPasso = h('button', { type: 'button', class: 'pg-btn', onclick: () => passoManuale() }, 'Passo ›');
    const btnDaCapo = h('button', { type: 'button', class: 'pg-btn', onclick: () => { ricomincia(); ctx.annuncia('Da capo: nastro e testina come all\'inizio.'); } }, '↺ Da capo');
    const cursore = h('input', {
      class: 'pg-cursore', id: id + '-vel', type: 'range', min: '1', max: '5', step: '1', value: String(S.velocita),
      'aria-valuetext': VEL[S.velocita].nome,
    });
    const letturaVel = h('span', { class: 'pg-lettura', 'aria-hidden': 'true' }, VEL[S.velocita].nome);
    const nPassi = h('strong', null, '0');
    const barraComandi = h('div', { class: 'pg-strumenti lab-turing-comandi' },
      btnEsegui, btnPasso, btnDaCapo,
      h('span', { class: 'pg-spazio' }),
      h('span', { class: 'lab-turing-velocita' }, h('label', { class: 'pg-etichetta', for: cursore.id }, 'Velocità'), cursore, letturaVel),
      h('span', { class: 'lab-turing-contatore' }, 'Passi', nPassi));

    /* ---------- il palco: nastro e testina ---------- */

    const striscia = h('div', { class: 'lab-turing-striscia' });
    const valStato = h('span', { class: 'lab-turing-carrello-val' }, S.prog.iniziale);
    const carrello = h('div', { class: 'lab-turing-carrello' },
      h('span', { class: 'lab-turing-carrello-eti' }, 'stato'),
      h('span', { class: 'lab-turing-carrello-fin' }, valStato));
    const braccio = h('div', { class: 'lab-turing-braccio' }, carrello, h('div', { class: 'lab-turing-punta' }));
    const scansione = h('div', { class: 'lab-turing-scansione' });
    const occhio = h('div', { class: 'lab-turing-occhio' }, scansione);
    const testina = h('div', { class: 'lab-turing-testina', 'aria-hidden': 'true' }, braccio, occhio);
    const finestra = h('div', { class: 'lab-turing-finestra', role: 'img', 'aria-label': 'Nastro' }, striscia, testina);
    const palco = h('div', { class: 'lab-turing-palco' }, finestra);

    const racconto = h('p', { class: 'lab-turing-racconto' });
    const avvisoT = h('span', { class: 'lab-turing-avviso-t' }, ALT);
    const avvisoP = h('p');
    const avviso = h('div', { class: 'lab-turing-avviso', hidden: true }, avvisoT, avvisoP);
    const spiega = h('div', { class: 'pg-spiega lab-turing-spiega' }, racconto, avviso);

    /* ---------- tavola delle regole e stati ---------- */

    const btnModifica = h('button', { type: 'button', class: 'pg-btn', 'aria-pressed': 'false', onclick: () => alternaModifica() }, '✎ Modifica');
    const btnRipristina = h('button', { type: 'button', class: 'pg-btn', hidden: true, onclick: () => ripristina() }, 'Ripristina');
    const aiutoMod = h('p', { class: 'lab-turing-aiuto-mod', hidden: true }, 'Premi un valore di Scrive, Muove o Nuovo stato per cambiarlo: la macchina riparte da capo con la tua tavola.');
    const barra = h('div', { class: 'lab-turing-barra', 'aria-hidden': 'true' });
    const corpoTab = h('tbody');
    const didascalia = h('caption', { class: 'pg-sr' });
    const tabella = h('table', { class: 'lab-turing-tab' },
      didascalia,
      h('thead', null,
        h('tr', { class: 'lab-turing-gruppi' },
          h('th', { scope: 'colgroup', colspan: '2', class: 'is-se' }, 'se'),
          h('th', { scope: 'colgroup', colspan: '3', class: 'is-allora' }, 'allora')),
        h('tr', null, ['Stato', 'Legge', 'Scrive', 'Muove', 'Nuovo stato'].map((t) => h('th', { scope: 'col' }, t)))),
      corpoTab);
    const wrap = h('div', { class: 'lab-turing-wrap' }, barra, tabella);
    const legenda = h('p', { class: 'lab-turing-legenda' });
    const tavola = h('section', { class: 'pg-pannello lab-turing-tavola', 'aria-labelledby': id + '-tav' },
      h('div', { class: 'lab-turing-tavola-testa' },
        h('h4', { class: 'lab-turing-titoletto', id: id + '-tav' }, 'Tavola delle regole'),
        h('span', { class: 'lab-turing-azioni' }, btnModifica, btnRipristina)),
      aiutoMod, wrap, legenda);

    const listaStati = h('ul', { class: 'lab-turing-stati', 'aria-label': 'Stati della macchina' });
    const nastroTesto = h('p', { class: 'lab-turing-nastro-testo' });
    const quadro = h('section', { class: 'pg-pannello lab-turing-quadro', 'aria-labelledby': id + '-st' },
      h('h4', { class: 'lab-turing-titoletto', id: id + '-st' }, 'Stati'),
      listaStati,
      h('p', { class: 'lab-turing-nota' }, 'Gli stati sono pochi e fissati in partenza: tutto il resto la macchina lo ricorda sul nastro.'),
      h('h4', { class: 'lab-turing-titoletto' }, 'Sul nastro'),
      nastroTesto);

    const sotto = h('div', { class: 'lab-turing-sotto' }, tavola, quadro);
    const radice = h('div', { class: 'lab-turing' }, barraProg, scheda, barraComandi, palco, spiega, sotto);
    el.append(radice);

    /* ---------- disegno del nastro ---------- */

    function posa(hx, cam) {
      finestra.style.setProperty('--hx', hx.toFixed(4));
      finestra.style.setProperty('--cam', cam.toFixed(4));
    }

    function simbolo(c, x) {
      c.firstChild.textContent = x === VUOTO ? '' : x;
      c.classList.toggle('is-vuoto', x === S.prog.vuoto);
    }

    function cella(pos) {
      let c = celle.get(pos);
      if (!c) {
        c = h('div', { class: 'lab-turing-cella' }, h('span', { class: 'lab-turing-simbolo' }));
        c.style.setProperty('--p', String(pos));
        celle.set(pos, c);
        striscia.append(c);
        simbolo(c, leggi(S.m, pos, S.prog.vuoto));
      }
      return c;
    }

    function preparaCelle(centro) {
      for (let p = centro - R; p <= centro + R; p++) cella(p);
    }

    function svuotaNastro() {
      for (const c of celle.values()) c.remove();
      celle.clear();
    }

    function descriviNastro() {
      const m = S.m;
      const testo = contenuto(m, S.prog.vuoto);
      const letto = leggi(m, m.testina, S.prog.vuoto);
      finestra.setAttribute('aria-label', 'Nastro: ' + (testo || 'vuoto') + '. ' + (m.fermo
        ? 'La macchina è ferma.'
        : 'La testina, nello stato ' + m.stato + ', legge ' + (letto === VUOTO ? 'una casella vuota' : letto) + '.'));
    }

    /* ---------- tavola ---------- */

    function testoValore(campoR, v) {
      if (campoR === 'scrive') return v == null ? '—' : v;
      if (campoR === 'muove') return v === 'S' ? '←' : (v === 'D' ? '→' : '•');
      return v;
    }
    function parolaValore(campoR, v) {
      if (campoR === 'scrive') return v == null ? 'non scrive' : (v === VUOTO ? 'casella vuota' : v);
      if (campoR === 'muove') return v === 'S' ? 'sinistra' : (v === 'D' ? 'destra' : 'resta ferma');
      if (campoR === 'legge') return v === VUOTO ? 'casella vuota' : v;
      return v;
    }
    const NOMI = { scrive: 'Scrive', muove: 'Muove', nuovo: 'Nuovo stato' };

    // Il contenuto di una casella della tavola: testo visibile e, se serve, parola per i lettori di schermo.
    function valore(campoR, v) {
      const vis = testoValore(campoR, v);
      const parola = parolaValore(campoR, v);
      return parola === vis ? [h('span', null, vis)] : [h('span', { 'aria-hidden': 'true' }, vis), h('span', { class: 'pg-sr' }, parola)];
    }

    function riempi(td, r, i, campoR) {
      td.classList.toggle('is-alt', campoR === 'nuovo' && r.nuovo === ALT);
      if (S.modifica && NOMI[campoR]) {
        const b = h('button', {
          type: 'button', class: 'lab-turing-valore',
          'aria-label': NOMI[campoR] + ': ' + parolaValore(campoR, r[campoR]) + '. Regola ' + r.stato + ' con ' + parolaValore('legge', r.legge) + '. Premi per cambiare.',
          onclick: () => cambia(i, campoR, 1),
          onkeydown: (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); cambia(i, campoR, e.key === 'ArrowUp' ? -1 : 1); }
          },
        }, h('span', { 'aria-hidden': 'true' }, testoValore(campoR, r[campoR])));
        td.replaceChildren(b);
      } else {
        td.replaceChildren(...valore(campoR, r[campoR]));
      }
    }

    function costruisciTavola() {
      righe = S.regole.map((r, i) => {
        const tr = h('tr', null);
        for (const campoR of ['stato', 'legge', 'scrive', 'muove', 'nuovo']) {
          const td = h('td', { class: 'lab-turing-' + campoR });
          riempi(td, r, i, campoR);
          tr.append(td);
        }
        return tr;
      });
      corpoTab.replaceChildren(...righe);
      didascalia.textContent = 'Tavola delle regole di «' + S.prog.nome + '»: per ogni stato e simbolo letto, che cosa scrivere, dove spostarsi e in quale stato passare.';
      barraY = null;
      barra.style.opacity = '0';
      aggiornaLegenda();
    }

    function aggiornaLegenda() {
      const voci = [];
      if (S.prog.vuoto === VUOTO) voci.push([VUOTO, 'casella vuota']);
      else voci.push([S.prog.vuoto, 'è il simbolo del nastro vuoto']);
      if (S.modifica || S.regole.some((r) => r.scrive == null)) voci.push(['—', 'non scrive']);
      voci.push(['← →', 'sposta la testina'], ['•', 'resta ferma'], ['▸', 'prossima regola']);
      legenda.replaceChildren(...voci.map(([k, t]) => h('span', null, h('b', null, k), ' ' + t)));
    }

    function misuraRiga(i) {
      const tr = righe[i];
      const rw = wrap.getBoundingClientRect();
      const rr = tr.getBoundingClientRect();
      return { y: rr.top - rw.top + wrap.scrollTop, alt: rr.height };
    }

    function segnaAttiva(i) {
      righe.forEach((tr, j) => { if (j === i) tr.setAttribute('aria-current', 'true'); else tr.removeAttribute('aria-current'); });
    }

    function mettiBarra(i) {
      if (!righe[i]) return;
      const t = misuraRiga(i);
      barraY = t.y;
      barra.style.height = t.alt + 'px';
      barra.style.transform = 'translateY(' + t.y + 'px)';
      barra.style.opacity = '1';
      segnaAttiva(i);
    }

    function nascondiBarra() {
      barraY = null;
      barra.style.opacity = '0';
      segnaAttiva(-1);
    }

    function barraVerso(i, durata) {
      const t = misuraRiga(i);
      barra.style.height = t.alt + 'px';
      segnaAttiva(i);
      if (barraY == null) {
        barraY = t.y;
        barra.style.transform = 'translateY(' + t.y + 'px)';
        return anima(durata, (k) => { barra.style.opacity = String(k); });
      }
      const da = barraY;
      barraY = t.y;
      barra.style.opacity = '1';
      return anima(durata, (k) => { barra.style.transform = 'translateY(' + (da + (t.y - da) * k).toFixed(2) + 'px)'; }, 'smooth');
    }

    function impulso() {
      barra.classList.remove('is-impulso');
      void barra.offsetWidth;
      barra.classList.add('is-impulso');
    }

    function accendi(i, campi) {
      righe.forEach((tr, j) => {
        for (const td of tr.children) td.classList.toggle('is-acceso', j === i && campi.some((c) => td.classList.contains('lab-turing-' + c)));
      });
    }

    function segnaProssima() {
      const t = S.m.fermo ? null : trovaRegola(S.regole, S.m.stato, leggi(S.m, S.m.testina, S.prog.vuoto));
      righe.forEach((tr, j) => tr.classList.toggle('is-prossima', !!t && t.indice === j));
    }

    /* ---------- stati, letture, avviso ---------- */

    function costruisciStati() {
      const voci = S.prog.stati.map((s) => h('li', { 'data-s': s.id }, h('b', null, s.id), s.nota));
      voci.push(h('li', { 'data-s': ALT, class: 'is-alt' }, h('b', null, ALT), 'fine'));
      listaStati.replaceChildren(...voci);
    }

    function segnaStato(stato) {
      for (const li of listaStati.children) {
        if (li.dataset.s === stato) li.setAttribute('aria-current', 'true'); else li.removeAttribute('aria-current');
      }
    }

    function aggiornaAvviso() {
      const mostra = S.m.fermo || (S.pausaLimite && !S.inCorsa);
      if (!mostra) { avviso.hidden = true; return; }
      const e = esito(S.prog, S.ingresso, S.m, S.regole);
      avvisoT.textContent = e.titolo;
      avvisoP.textContent = e.testo;
      avviso.classList.toggle('is-pausa', !S.m.fermo);
      avviso.hidden = false;
    }

    function aggiornaComandi() {
      const fermo = S.m.fermo;
      btnEsegui.textContent = S.inCorsa ? '⏸︎ Pausa' : (fermo ? '▶︎ Esegui di nuovo' : (S.m.passi > 0 ? '▶︎ Continua' : '▶︎ Esegui'));
      btnEsegui.disabled = !S.valido;
      const focoPasso = document.activeElement === btnPasso;
      btnPasso.disabled = !S.valido || S.inCorsa || fermo;
      if (focoPasso && btnPasso.disabled) btnDaCapo.focus();
      bottoniProg.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.p === S.prog.id)));
      btnModifica.setAttribute('aria-pressed', String(S.modifica));
      const modificata = !stesseRegole(S.regole, S.prog.regole);
      btnRipristina.hidden = !modificata;
      for (const b of esempi.querySelectorAll('button')) b.setAttribute('aria-pressed', String(S.valido && b.dataset.v === S.ingressi[S.prog.id]));
    }

    function disegna() {
      const m = S.m;
      preparaCelle(m.testina);
      const scritta = S.ultimo && S.ultimo.regola && S.ultimo.regola.scrive != null ? S.ultimo.da : null;
      for (const [p, c] of celle) {
        if (Math.abs(p - m.testina) > 2 * R) { c.remove(); celle.delete(p); continue; }
        simbolo(c, leggi(m, p, S.prog.vuoto));
        c.firstChild.style.transform = '';
        c.style.removeProperty('--lampo');
        c.classList.toggle('is-ultima', p === scritta);
      }
      posa(m.testina, m.testina);
      braccio.style.transform = '';
      scansione.style.opacity = '0';
      valStato.textContent = m.stato;
      valStato.style.transform = '';
      valStato.style.opacity = '';
      testina.classList.toggle('is-alt', m.fermo);
      accendi(-1, []);
      segnaProssima();
      if (S.ultimo && S.ultimo.indice >= 0) mettiBarra(S.ultimo.indice); else nascondiBarra();
      segnaStato(m.stato);
      nPassi.textContent = String(m.passi);
      nastroTesto.textContent = contenuto(m, S.prog.vuoto) || '(vuoto)';
      aggiornaAvviso();
      aggiornaComandi();
      descriviNastro();
    }

    /* ---------- racconto ---------- */

    function scriviRacconto(parti) {
      racconto.replaceChildren(...parti.map((p) => (p.k ? h('span', { class: 'lab-turing-k-' + p.k }, p.t) : p.t)));
    }

    function mostraPronta() {
      const letto = leggi(S.m, S.m.testina, S.prog.vuoto);
      scriviRacconto([
        { t: 'Pronta. Nello stato ' }, { t: S.m.stato, k: 'stato' }, { t: ' la testina legge ' },
        { t: letto === VUOTO && S.prog.vuoto === VUOTO ? 'una casella vuota' : letto, k: 'legge' },
        { t: ': la regola segnata con ▸ nella tavola dice che cosa farà. Premi Passo per un passo alla volta, oppure ▶ Esegui.' },
      ]);
    }

    /* ---------- animazione di un passo ---------- */

    function scorriLettura(durata) {
      if (!durata) return Promise.resolve();
      const alt = occhio.clientHeight;
      return anima(durata, (k) => {
        scansione.style.transform = 'translateY(' + (k * Math.max(0, alt - 8)).toFixed(1) + 'px)';
        scansione.style.opacity = String(Math.sin(Math.PI * k).toFixed(3));
      });
    }

    function colpo(durata) {
      return anima(durata, (k) => { braccio.style.transform = 'translateY(' + (Math.sin(Math.PI * k) * 7).toFixed(2) + 'px)'; });
    }

    function gira(c, nuovo, durata) {
      const span = c.firstChild;
      let girato = false;
      return anima(durata, (k) => {
        if (k < 0.5) {
          span.style.transform = 'rotateX(' + (E.sharp(k * 2) * 90).toFixed(1) + 'deg)';
        } else {
          if (!girato) { girato = true; simbolo(c, nuovo); }
          span.style.transform = 'rotateX(' + (-90 * (1 - E.smooth((k - 0.5) * 2))).toFixed(1) + 'deg)';
        }
        c.style.setProperty('--lampo', (Math.sin(Math.PI * k) * 0.75).toFixed(3));
      });
    }

    function scivola(da, a, durata) {
      if (da === a) return colpo(durata * 0.6);
      return anima(durata, (k) => {
        const th = E.smooth(k);
        const tc = E.smooth(Math.max(0, (k - 0.2) / 0.8));
        posa(da + (a - da) * th, da + (a - da) * tc);
      });
    }

    function cambiaStato(nuovo, durata) {
      if (valStato.textContent === nuovo) return Promise.resolve();
      let fatto = false;
      return anima(durata, (k) => {
        if (k < 0.5) {
          const q = k * 2;
          valStato.style.transform = 'translateY(' + (-q * 70).toFixed(1) + '%)';
          valStato.style.opacity = String(1 - q);
        } else {
          if (!fatto) {
            fatto = true;
            valStato.textContent = nuovo;
            testina.classList.toggle('is-alt', nuovo === ALT);
            segnaStato(nuovo);
          }
          const q = (k - 0.5) * 2;
          valStato.style.transform = 'translateY(' + ((1 - q) * 70).toFixed(1) + '%)';
          valStato.style.opacity = String(q);
        }
      });
    }

    async function animaPasso(info, d) {
      const r = info.regola;
      const c = cella(info.da);
      for (const x of celle.values()) x.classList.remove('is-ultima');
      righe.forEach((tr) => tr.classList.remove('is-prossima'));
      // 1. leggo: la luce passa sulla casella, la regola giusta si accende
      accendi(info.indice, ['stato', 'legge']);
      await Promise.all([scorriLettura(d.leggi), barraVerso(info.indice, Math.max(d.leggi, Math.min(D.veloce, d.scrivi)))]);
      impulso();
      // 2. scrivo: la testina batte sul nastro e il simbolo si gira
      accendi(info.indice, ['scrive']);
      if (r.scrive != null) {
        await Promise.all([colpo(d.scrivi), gira(c, info.scritto, d.scrivi)]);
        c.classList.add('is-ultima');
      } else {
        await anima(Math.round(d.scrivi / 2), () => {});
      }
      // 3. mi sposto e cambio stato
      accendi(info.indice, ['muove', 'nuovo']);
      preparaCelle(info.a);
      await Promise.all([scivola(info.da, info.a, d.muovi), cambiaStato(info.statoDopo, d.muovi)]);
    }

    // All'arresto i simboli del risultato si sollevano uno dopo l'altro: l'occhio va al nastro.
    function onda() {
      const e = estremi(S.m);
      if (!e || ctx.riduci) return;
      const lista = [];
      for (let p = e.min; p <= e.max; p++) { const c = celle.get(p); if (c) lista.push(c.firstChild); }
      const ritardo = 0.45 / Math.max(1, lista.length - 1);
      anima(D.narrativa, (k) => {
        lista.forEach((span, i) => {
          const q = Math.min(1, Math.max(0, (k - i * ritardo) / 0.55));
          span.style.transform = q > 0 && q < 1 ? 'translateY(' + (-Math.sin(Math.PI * q) * 7).toFixed(2) + 'px)' : '';
        });
      }).catch(silenzia);
    }

    // Senza una regola adatta la testina fa «no» con un piccolo scuotimento.
    function scuoti() {
      anima(D.lenta, (k) => {
        braccio.style.transform = k < 1 ? 'translateX(' + (Math.sin(k * Math.PI * 6) * (1 - k) * 5).toFixed(2) + 'px)' : '';
      }).catch(silenzia);
    }

    function dopoArresto() {
      if (S.m.motivo === 'alt') onda();
      else if (S.m.motivo === 'nessuna-regola') scuoti();
    }

    async function mostraPasso(info, d) {
      const mio = ++seq;
      animando = true;
      scriviRacconto(raccontoParti(info, S.prog));
      try {
        if (info.regola) await animaPasso(info, d);
      } catch (err) {
        silenzia(err);
      }
      if (mio === seq) { animando = false; disegna(); }
    }

    function avanza() {
      const info = passo(S.prog, S.m, S.regole);
      if (!info) return null;
      S.m = info.macchina;
      S.ultimo = info;
      return info;
    }

    // Frase finale per i lettori di schermo; segna il laboratorio come esplorato quando si arriva ad ALT.
    function concludi() {
      const e = esito(S.prog, S.ingresso, S.m, S.regole);
      if (S.m.motivo === 'alt') ctx.completa();
      return e.titolo + '. ' + e.testo;
    }

    /* ---------- comandi ---------- */

    function passoManuale() {
      if (S.inCorsa || !S.valido || S.m.fermo) return;
      if (animando) ctx.annulla();
      S.pausaLimite = false;
      const ep = S.epoca;
      coda = coda.then(async () => {
        if (ep !== S.epoca || S.inCorsa || S.m.fermo) return;
        const info = avanza();
        if (!info) return;
        aggiornaComandi();
        avviso.hidden = true;
        const testo = racconta(info, S.prog);
        await mostraPasso(info, VEL[Math.min(S.velocita, 3)]);
        if (ep !== S.epoca) return;
        if (S.m.fermo) dopoArresto();
        ctx.annuncia(testo + (S.m.fermo ? ' ' + concludi() : ''));
      }).catch(silenzia);
    }

    async function esegui() {
      if (!S.valido) { campo.focus(); return; }
      if (S.inCorsa) {
        ferma();
        ctx.annuncia('In pausa dopo ' + S.m.passi + (S.m.passi === 1 ? ' passo.' : ' passi.'));
        return;
      }
      if (S.m.fermo) ricomincia();
      if (animando) ctx.annulla();
      S.inCorsa = true;
      S.pausaLimite = false;
      const ep = S.epoca;
      const lim = S.prog.limite || LIMITE;
      let fatti = 0;
      aggiornaComandi();
      avviso.hidden = true;
      ctx.annuncia('Esecuzione avviata.');
      try {
        await coda;
        while (S.inCorsa && ep === S.epoca && !S.m.fermo) {
          if (fatti >= lim) { S.pausaLimite = true; break; }
          const d = VEL[S.velocita];
          const info = avanza();
          if (!info) break;
          fatti += 1;
          await mostraPasso(info, d);
          if (ep !== S.epoca || !S.inCorsa || S.m.fermo) break;
          await ctx.attendi(ctx.riduci ? d.leggi + d.scrivi + d.muovi + d.sosta : d.sosta);
        }
      } catch (err) {
        silenzia(err);
      }
      if (ep !== S.epoca) return;
      const finita = S.m.fermo || S.pausaLimite;
      S.inCorsa = false;
      aggiornaComandi();
      aggiornaAvviso();
      if (S.m.fermo) dopoArresto();
      if (finita) ctx.annuncia(concludi());
    }

    function ferma() {
      S.inCorsa = false;
      ctx.annulla();
      aggiornaComandi();
    }

    function ricomincia() {
      S.epoca += 1;
      seq += 1;
      animando = false;
      S.inCorsa = false;
      S.pausaLimite = false;
      ctx.annulla();
      coda = Promise.resolve();
      S.ingresso = S.prog.ingresso ? S.ingressi[S.prog.id] : '';
      S.m = crea(S.prog, S.ingresso);
      S.ultimo = null;
      svuotaNastro();
      disegna();
      mostraPronta();
    }

    function aggiornaScheda() {
      descr.replaceChildren(ctx.inline(S.prog.descrizione));
      const ing = S.prog.ingresso;
      rigaIngresso.hidden = !ing;
      errore.hidden = true;
      errore.textContent = '';
      campo.removeAttribute('aria-invalid');
      campo.setAttribute('aria-describedby', id + '-aiuto');
      S.valido = true;
      radice.classList.remove('is-invalido');
      if (!ing) { esempi.replaceChildren(); return; }
      campo.value = S.ingressi[S.prog.id];
      esempi.replaceChildren(h('span', { id: id + '-es' }, 'Prova'),
        ...ing.esempi.map((v) => h('button', { type: 'button', class: 'pg-btn', 'data-v': v, 'aria-pressed': 'false', onclick: () => usaEsempio(v) }, v)));
    }

    function scegliProgramma(pid) {
      if (pid === S.prog.id) return;
      S.prog = programma(pid);
      S.regole = S.regolePer[pid] || copiaRegole(S.prog.regole);
      aggiornaScheda();
      costruisciTavola();
      costruisciStati();
      ricomincia();
      ctx.annuncia('Programma «' + S.prog.nome + '». ' + piano(S.prog.descrizione));
    }

    function leggiCampo() {
      const r = valida(campo.value);
      campo.setAttribute('aria-invalid', String(!r.ok));
      campo.setAttribute('aria-describedby', id + '-aiuto' + (r.ok ? '' : ' ' + id + '-err'));
      errore.textContent = r.ok ? '' : r.errore;
      errore.hidden = r.ok;
      if (!r.ok) {
        if (S.inCorsa) ferma(); else if (animando) ctx.annulla();
        S.valido = false;
        radice.classList.add('is-invalido');
        aggiornaComandi();
        return false;
      }
      const cambiato = r.valore !== S.ingressi[S.prog.id];
      S.valido = true;
      radice.classList.remove('is-invalido');
      S.ingressi[S.prog.id] = r.valore;
      if (cambiato || r.valore !== S.ingresso) ricomincia(); else aggiornaComandi();
      return true;
    }

    function usaEsempio(v) {
      campo.value = v;
      if (leggiCampo()) ctx.annuncia('Sul nastro: ' + v + '. Premi Passo oppure Esegui.');
    }

    function alternaModifica() {
      if (S.inCorsa) ferma();
      S.modifica = !S.modifica;
      aiutoMod.hidden = !S.modifica;
      costruisciTavola();
      disegna();
      ctx.annuncia(S.modifica
        ? 'Modifica attiva: ogni valore di Scrive, Muove e Nuovo stato è un bottone. Premilo per cambiarlo.'
        : 'Modifica chiusa.');
    }

    function cambia(i, campoR, verso) {
      if (S.inCorsa) ferma();
      const r = S.regole[i];
      r[campoR] = prossimo(opzioni(S.prog, campoR), r[campoR], verso);
      S.regolePer[S.prog.id] = S.regole;
      const td = righe[i].querySelector('.lab-turing-' + campoR);
      const focus = document.activeElement && td.contains(document.activeElement);
      riempi(td, r, i, campoR);
      if (focus) td.querySelector('button').focus();
      aggiornaLegenda();
      ricomincia();
      ctx.annuncia('Regola ' + r.stato + ' con ' + parolaValore('legge', r.legge) + ': ' + NOMI[campoR].toLowerCase() + ' ' + parolaValore(campoR, r[campoR]) + '. La macchina riparte da capo.');
    }

    function ripristina() {
      if (S.inCorsa) ferma();
      S.regole = copiaRegole(S.prog.regole);
      delete S.regolePer[S.prog.id];
      costruisciTavola();
      ricomincia();
      btnModifica.focus();
      ctx.annuncia('Tavola originale di «' + S.prog.nome + '» ripristinata.');
    }

    /* ---------- eventi ---------- */

    campo.addEventListener('input', leggiCampo);
    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (leggiCampo()) esegui(); } });
    cursore.addEventListener('input', () => {
      S.velocita = Math.max(1, Math.min(5, Number(cursore.value) || 3));
      letturaVel.textContent = VEL[S.velocita].nome;
      cursore.setAttribute('aria-valuetext', VEL[S.velocita].nome);
    });
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => { if (!animando && S.ultimo && S.ultimo.indice >= 0) mettiBarra(S.ultimo.indice); }).observe(wrap);
    }

    aggiornaScheda();
    costruisciTavola();
    costruisciStati();
    ricomincia();
    return {};
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('turing', { titolo: 'La macchina di Turing', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
