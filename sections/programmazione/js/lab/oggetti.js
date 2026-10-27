/*
 * Laboratorio «Classi e oggetti» (capitolo 10, Oggetti e finestre).
 *
 * Due classi, Robot e la sottoclasse RobotSaldatore. Una fabbrica crea gli oggetti
 * (il costruttore `new`), un chiamante manda messaggi che volano fino all'oggetto scelto,
 * le schede delle classi mostrano dove viene trovato il metodo (ereditarietà),
 * «Tutti salutano» mostra il polimorfismo e un tentativo di scrivere l'energia
 * dall'esterno mostra l'incapsulamento. Ogni azione scrive la sua riga di pseudo-codice.
 *
 * Logica è pura (niente DOM) e si prova in Node: test/oggetti.test.js.
 */
(function (root) {
  'use strict';

  /* =====================================================================
   * Logica pura
   * ===================================================================== */

  const ENERGIA_MAX = 100;
  const COSTO_PASSO = 10;
  const COSTO_SALDA = 25;
  const PISTA = 8;            // posizioni da 0 a 8 sulla pista di ogni oggetto
  const MAX_OGGETTI = 6;
  const PASSI_MIN = 1;
  const PASSI_MAX = 5;
  const NOME_MAX = 8;
  const RISERVATE = ['new', 'in', 'per', 'ogni', 'robot', 'classe', 'estende', 'privato', 'null', 'this', 'r'];

  const COLORI = [
    { id: 'verde', hex: '#3ee08f' },
    { id: 'ambra', hex: '#ffc04d' },
    { id: 'azzurro', hex: '#5cc8ff' },
    { id: 'rosa', hex: '#ff7aa8' },
    { id: 'viola', hex: '#b9a2ff' },
    { id: 'bianco', hex: '#e9f1ee' },
  ];

  const CLASSI = {
    Robot: {
      nome: 'Robot',
      padre: null,
      prefisso: 'R',
      attributi: ['nome', 'colore', 'energia'],
      metodi: ['saluta', 'muovi', 'ricarica'],
      firme: { saluta: 'saluta()', muovi: 'muovi(passi)', ricarica: 'ricarica()' },
    },
    RobotSaldatore: {
      nome: 'RobotSaldatore',
      padre: 'Robot',
      prefisso: 'S',
      attributi: [],
      metodi: ['salda', 'saluta'],
      firme: { salda: 'salda()', saluta: 'saluta()' },
    },
  };

  // I corpi dei metodi: ricevono l'oggetto (già copiato dallo stato) e lo modificano.
  const CORPI = {
    Robot: {
      saluta(o) { return { ok: true, risposta: 'Ciao, sono ' + o.nome + '!' }; },
      muovi(o, passi) {
        const costo = passi * COSTO_PASSO;
        if (o.energia < costo) return { ok: false, costo: costo };
        const percorso = simulaPassi(o.pos, o.dir, passi);
        const ultimo = percorso[percorso.length - 1];
        o.pos = ultimo.pos;
        o.dir = ultimo.dir;
        o.energia -= costo;
        return { ok: true, costo: costo, percorso: percorso };
      },
      ricarica(o) {
        const gia = o.energia >= ENERGIA_MAX;
        o.energia = ENERGIA_MAX;
        return { ok: true, giaCarico: gia, risposta: gia ? 'Sono già carico!' : 'Energia al massimo!' };
      },
    },
    RobotSaldatore: {
      saluta(o) { return { ok: true, risposta: 'Ciao, sono ' + o.nome + '! Saldo tutto io.' }; },
      salda(o) {
        if (o.energia < COSTO_SALDA) return { ok: false, costo: COSTO_SALDA };
        o.energia -= COSTO_SALDA;
        return { ok: true, costo: COSTO_SALDA, risposta: 'Bzzz! Saldatura fatta.' };
      },
    },
  };

  function copia(o) { return Object.assign({}, o); }

  // La classe e i suoi antenati, dalla più specifica alla più generale.
  function catena(classe) {
    const out = [];
    let c = CLASSI[classe];
    while (c) { out.push(c.nome); c = c.padre ? CLASSI[c.padre] : null; }
    return out;
  }

  // Ricerca dinamica del metodo: prima nella classe dell'oggetto, poi nelle classi madri.
  function cercaMetodo(classe, metodo) {
    const percorso = [];
    for (const nome of catena(classe)) {
      percorso.push(nome);
      if (CLASSI[nome].metodi.indexOf(metodo) >= 0) return { classe: nome, percorso: percorso };
    }
    return null;
  }

  // Tutti i metodi che un oggetto della classe capisce, con la classe che li definisce.
  function metodiDi(classe) {
    const visti = Object.create(null);
    const out = [];
    for (const nome of catena(classe)) {
      for (const m of CLASSI[nome].metodi) {
        if (visti[m]) continue;
        visti[m] = true;
        out.push({ metodo: m, classe: nome });
      }
    }
    return out;
  }

  // Il robot avanza nella sua direzione e, arrivato in fondo alla pista, si gira.
  function simulaPassi(pos, dir, passi) {
    const out = [];
    for (let i = 0; i < passi; i++) {
      let girata = false;
      if (pos + dir > PISTA || pos + dir < 0) { dir = -dir; girata = true; }
      pos += dir;
      out.push({ pos: pos, dir: dir, girata: girata });
    }
    return out;
  }

  function nuovoStato() { return { oggetti: [], prossimo: 1, polimorfismoVisto: false }; }

  function trova(stato, id) {
    for (const o of stato.oggetti) if (o.id === id) return o;
    return null;
  }

  function variabile(nome) { return String(nome == null ? '' : nome).trim().toLowerCase(); }

  // null se il nome va bene, altrimenti una frase che spiega come correggerlo.
  function validaNome(stato, nome) {
    const n = String(nome == null ? '' : nome).trim();
    if (!n) return 'Scrivi un nome per il robot, per esempio «R3».';
    if (n.length > NOME_MAX) return 'Il nome è troppo lungo: al massimo ' + NOME_MAX + ' caratteri.';
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(n)) return 'Usa solo lettere senza accenti e cifre, cominciando con una lettera: per esempio «Robby» o «R3».';
    if (RISERVATE.indexOf(n.toLowerCase()) >= 0) return '«' + n + '» è una parola riservata del linguaggio: scegline un\'altra.';
    if (stato.oggetti.some((o) => o.var === n.toLowerCase())) return 'Esiste già un oggetto chiamato «' + n.toLowerCase() + '»: scegli un altro nome.';
    return null;
  }

  function suggerisciNome(stato, classe) {
    const def = CLASSI[classe] || CLASSI.Robot;
    let n = stato.prossimo;
    while (validaNome(stato, def.prefisso + n)) n += 1;
    return def.prefisso + n;
  }

  function validaPassi(valore) {
    const testo = String(valore == null ? '' : valore).trim();
    const n = Number(testo);
    if (!testo || !Number.isInteger(n) || n < PASSI_MIN || n > PASSI_MAX) {
      return { ok: false, errore: 'I passi devono essere un numero intero da ' + PASSI_MIN + ' a ' + PASSI_MAX + '.' };
    }
    return { ok: true, passi: n };
  }

  function errore(titolo, testo) {
    return { ok: false, tipo: 'errore', concetto: 'Attenzione', titolo: titolo, testo: testo, righe: [] };
  }

  function crea(stato, classe, nome, colore) {
    if (!CLASSI[classe]) return errore('Classe sconosciuta.', 'Scegli Robot oppure RobotSaldatore.');
    if (stato.oggetti.length >= MAX_OGGETTI) {
      return errore('Il palco è pieno.', 'Al massimo ' + MAX_OGGETTI + ' oggetti alla volta: premi **Ricomincia** per svuotare la memoria.');
    }
    const problema = validaNome(stato, nome);
    if (problema) return Object.assign(errore('Nome non valido.', problema), { campo: 'nome' });
    const col = COLORI.some((c) => c.id === colore) ? colore : COLORI[0].id;
    const n = String(nome).trim();
    const primoDellaClasse = !stato.oggetti.some((o) => o.classe === classe);
    const primo = stato.oggetti.length === 0;
    const o = { id: stato.prossimo, var: n.toLowerCase(), nome: n, classe: classe, colore: col, energia: ENERGIA_MAX, pos: 0, dir: 1 };
    stato.prossimo += 1;
    stato.oggetti.push(o);
    const v = '**' + o.var + '**';
    let concetto, titolo, testo;
    if (classe === 'RobotSaldatore' && primoDellaClasse) {
      concetto = 'Ereditarietà';
      titolo = 'Una sottoclasse al lavoro.';
      testo = v + ' è un RobotSaldatore. La sua classe *estende* Robot: eredita nome, colore, energia, `muovi()` e `ricarica()` senza riscriverli, e in più sa saldare e saluta a modo suo.';
    } else if (primo) {
      concetto = 'Oggetto';
      titolo = 'Il primo oggetto è in memoria.';
      testo = v + ' è un oggetto della classe ' + classe + ': la classe era solo il progetto, ' + o.var + ' è un esemplare vero, con il suo nome, il suo colore e ' + ENERGIA_MAX + ' di energia. Creane un altro e confrontali.';
    } else {
      concetto = 'Istanza';
      titolo = 'Un altro esemplare.';
      testo = v + ' nasce dalla stessa classe ' + classe + ': stessi attributi e stessi metodi degli altri, ma valori suoi. Da una classe puoi creare tutti gli oggetti che vuoi.';
    }
    return {
      ok: true,
      tipo: 'crea',
      id: o.id,
      oggetto: copia(o),
      righe: [{ codice: o.var + ' = new ' + classe + '("' + o.nome + '", "' + o.colore + '")', commento: '' }],
      concetto: concetto,
      titolo: titolo,
      testo: testo,
    };
  }

  function invia(stato, id, metodo, arg) {
    const o = trova(stato, id);
    if (!o) return errore('Nessun destinatario.', 'Crea un robot con la fabbrica, poi selezionalo per mandargli un messaggio.');
    const v = '**' + o.var + '**';
    const chiamata = o.var + '.' + metodo + '(' + (arg != null ? arg : '') + ')';
    const trovato = cercaMetodo(o.classe, metodo);
    if (!trovato) {
      return {
        ok: false,
        tipo: 'sconosciuto',
        id: o.id,
        metodo: metodo,
        arg: arg,
        classe: o.classe,
        percorso: catena(o.classe),
        righe: [{ codice: chiamata, commento: '✗ errore: ' + o.classe + ' non ha il metodo ' + metodo + '()' }],
        concetto: 'Messaggio non capito',
        titolo: 'Il messaggio torna indietro.',
        testo: v + ' è un ' + o.classe + ', e nessuna delle sue classi definisce `' + metodo + '()`: esiste solo nella sottoclasse RobotSaldatore. In Smalltalk questo errore si chiama proprio *doesNotUnderstand*, «non capisce».',
      };
    }
    if (metodo === 'muovi') {
      const p = validaPassi(arg);
      if (!p.ok) return Object.assign(errore('Passi non validi.', p.errore), { campo: 'passi' });
      arg = p.passi;
    }
    const prima = copia(o);
    const r = CORPI[trovato.classe][metodo](o, arg);
    const dopo = copia(o);
    const base = {
      id: o.id,
      metodo: metodo,
      arg: arg,
      classe: o.classe,
      definitoIn: trovato.classe,
      percorso: trovato.percorso,
      prima: prima,
      dopo: dopo,
      percorsoPassi: r.percorso || [],
      risposta: r.risposta || '',
    };
    const chiamataOk = o.var + '.' + metodo + '(' + (metodo === 'muovi' ? arg : '') + ')';
    if (!r.ok) {
      return Object.assign(base, {
        ok: false,
        tipo: 'rifiutato',
        risposta: 'Energia insufficiente!',
        righe: [{ codice: chiamataOk, commento: '✗ rifiutato: servono ' + r.costo + ' di energia, ' + o.var + ' ne ha ' + o.energia }],
        concetto: 'Incapsulamento',
        titolo: 'L\'oggetto si rifiuta.',
        testo: v + ' non esegue `' + chiamataOk.slice(o.var.length + 1) + '`: servono ' + r.costo + ' di energia e ne ha ' + o.energia + '. È il metodo stesso a far rispettare le regole dell\'oggetto. Prova `ricarica()`.',
      });
    }
    const ereditato = trovato.classe !== o.classe;
    const res = Object.assign(base, { ok: true, tipo: 'metodo' });
    if (metodo === 'saluta') {
      res.righe = [{ codice: chiamataOk, commento: '«' + r.risposta + '»' }];
      if (trovato.classe === 'RobotSaldatore') {
        res.concetto = 'Metodo ridefinito';
        res.titolo = 'Un saluto tutto suo.';
        res.testo = v + ' ha risposto con il `saluta()` della sua classe, RobotSaldatore, che *ridefinisce* quello ereditato da Robot: stesso messaggio, comportamento più specifico.';
      } else {
        res.concetto = 'Messaggio';
        res.titolo = 'Messaggio ricevuto.';
        res.testo = 'Il chiamante ha mandato a ' + v + ' il messaggio `saluta()`. L\'oggetto ha cercato il metodo nella sua classe, Robot, e ha risposto «' + r.risposta + '».';
      }
    } else if (metodo === 'muovi') {
      res.righe = [{ codice: chiamataOk, commento: 'energia ' + prima.energia + ' → ' + dopo.energia }];
      const girato = r.percorso.some((p) => p.girata) ? ' Arrivato in fondo alla pista, si è girato.' : '';
      if (ereditato) {
        res.concetto = 'Ereditarietà';
        res.titolo = 'Metodo trovato nella classe madre.';
        res.testo = 'RobotSaldatore non definisce `muovi()`: il metodo è stato cercato nella sua classe e poi in Robot, dove c\'è. ' + v + ' ha fatto ' + arg + (arg === 1 ? ' passo' : ' passi') + ' (energia ' + prima.energia + ' → ' + dopo.energia + ').' + girato;
      } else {
        res.concetto = 'Stato';
        res.titolo = 'Ogni oggetto ha il suo stato.';
        res.testo = '`muovi(' + arg + ')` ha spostato ' + v + ' di ' + arg + (arg === 1 ? ' passo' : ' passi') + ' e gli è costato ' + r.costo + ' di energia: ora ne ha ' + dopo.energia + '. Gli altri oggetti non sono cambiati.' + girato;
      }
    } else if (metodo === 'ricarica') {
      res.righe = [{ codice: chiamataOk, commento: r.giaCarico ? 'già carico' : 'energia ' + prima.energia + ' → ' + dopo.energia }];
      res.concetto = 'Metodo';
      res.titolo = r.giaCarico ? 'Già carico.' : 'Batteria piena.';
      res.testo = r.giaCarico
        ? v + ' aveva già ' + ENERGIA_MAX + ' di energia: `ricarica()` non ha cambiato nulla.'
        : '`ricarica()` ha riportato l\'energia di ' + v + ' a ' + ENERGIA_MAX + '. È l\'unico modo per aumentarla, e il metodo non supera mai il massimo.' + (ereditato ? ' Il metodo è ereditato da Robot.' : '');
    } else if (metodo === 'salda') {
      res.righe = [{ codice: chiamataOk, commento: 'energia ' + prima.energia + ' → ' + dopo.energia }];
      res.concetto = 'Sottoclasse';
      res.titolo = 'Un metodo nuovo.';
      res.testo = v + ' salda: `salda()` è definito solo in RobotSaldatore, la sottoclasse. Costa ' + COSTO_SALDA + ' di energia: ora ne ha ' + dopo.energia + '.';
    }
    return res;
  }

  function tuttiSalutano(stato) {
    if (!stato.oggetti.length) return errore('Non c\'è nessuno.', 'Crea almeno un robot con la fabbrica, poi chiedi a tutti di salutare.');
    const risposte = stato.oggetti.map((o) => {
      const t = cercaMetodo(o.classe, 'saluta');
      const r = CORPI[t.classe].saluta(o);
      return { id: o.id, var: o.var, classe: o.classe, definitoIn: t.classe, risposta: r.risposta };
    });
    const classi = new Set(stato.oggetti.map((o) => o.classe));
    const polimorfo = classi.size > 1;
    if (polimorfo) stato.polimorfismoVisto = true;
    const righe = [{ codice: 'per ogni r in [' + stato.oggetti.map((o) => o.var).join(', ') + ']: r.saluta()', commento: '' }]
      .concat(risposte.map((r) => ({ codice: '', commento: r.var + ' (' + r.definitoIn + '): «' + r.risposta + '»' })));
    return {
      ok: true,
      tipo: 'tutti',
      risposte: risposte,
      polimorfo: polimorfo,
      righe: righe,
      concetto: 'Polimorfismo',
      titolo: polimorfo ? 'Stesso messaggio, risposte diverse.' : 'Tutti uguali, per ora.',
      testo: polimorfo
        ? 'Il chiamante ha mandato a tutti lo stesso messaggio, `saluta()`, senza chiedersi di che classe fosse ciascuno. I Robot hanno risposto in un modo, i RobotSaldatore in un altro: ogni oggetto ha usato il metodo della propria classe.'
        : 'Hanno risposto tutti allo stesso modo perché sono tutti ' + (classi.has('Robot') ? 'Robot' : 'RobotSaldatore') + '. Crea un oggetto dell\'altra classe e riprova: lo stesso messaggio avrà due risposte diverse.',
    };
  }

  // L'incapsulamento: dall'esterno un attributo privato non si scrive. Lo stato non cambia.
  function scriviDallEsterno(stato, id, campo, valore) {
    const o = trova(stato, id);
    if (!o) return errore('Nessun destinatario.', 'Crea un robot con la fabbrica e selezionalo.');
    const c = campo || 'energia';
    const val = valore == null ? 1000 : valore;
    return {
      ok: false,
      tipo: 'privato',
      id: o.id,
      campo: c,
      valore: val,
      righe: [{ codice: o.var + '.' + c + ' = ' + val, commento: '✗ errore: ' + c + ' è privata' }],
      concetto: 'Incapsulamento',
      titolo: 'Accesso negato.',
      testo: '`' + c + '` è un attributo *privato* della classe Robot: dall\'esterno non si può scrivere. Può cambiarlo solo un metodo dell\'oggetto, come `ricarica()`, che non supera mai ' + ENERGIA_MAX + '. Così nessuno può portare un robot in uno stato impossibile.',
    };
  }

  function completato(stato) { return !!stato.polimorfismoVisto; }

  const Logica = {
    ENERGIA_MAX: ENERGIA_MAX,
    COSTO_PASSO: COSTO_PASSO,
    COSTO_SALDA: COSTO_SALDA,
    PISTA: PISTA,
    MAX_OGGETTI: MAX_OGGETTI,
    PASSI_MIN: PASSI_MIN,
    PASSI_MAX: PASSI_MAX,
    NOME_MAX: NOME_MAX,
    COLORI: COLORI,
    CLASSI: CLASSI,
    catena: catena,
    cercaMetodo: cercaMetodo,
    metodiDi: metodiDi,
    simulaPassi: simulaPassi,
    nuovoStato: nuovoStato,
    trova: trova,
    variabile: variabile,
    validaNome: validaNome,
    suggerisciNome: suggerisciNome,
    validaPassi: validaPassi,
    crea: crea,
    invia: invia,
    tuttiSalutano: tuttiSalutano,
    scriviDallEsterno: scriviDallEsterno,
    completato: completato,
  };

  /* =====================================================================
   * Interfaccia
   * ===================================================================== */

  const css = `
    .lab-oggetti {
      --lo-cls: var(--trace-3);
      --lo-met: var(--trace-2);
      --lo-dato: var(--trace-1);
      --lo-ogg: var(--lab-bright);
      --lo-err: var(--trace-4);
      --lo-kw: #c2b3ff;
      --lo-muto: #8aa69c;
      --lo-blu: #0a1824;
      --lo-robot-w: 48px;
      --lo-targa-w: clamp(112px, 26%, 158px);
      container-type: inline-size;
      padding: 16px;
    }
    .lab-oggetti-griglia { display: flex; flex-direction: column; gap: 14px; }
    .lab-oggetti-sx, .lab-oggetti-dx { display: contents; }
    .lab-oggetti-classi { order: 1; }
    .lab-oggetti-fabbrica { order: 2; }
    .lab-oggetti-palco { order: 3; }
    .lab-oggetti-messaggi { order: 4; }
    .lab-oggetti-programma { order: 5; }
    @container (min-width: 800px) {
      .lab-oggetti-griglia { display: grid; grid-template-columns: minmax(272px, 0.8fr) minmax(0, 1.2fr); gap: 16px; align-items: start; }
      .lab-oggetti-sx, .lab-oggetti-dx { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
    }

    .lab-oggetti-pannello { background: var(--lab-panel); border: 1px solid var(--lab-line); border-radius: 12px; min-width: 0; }
    .lab-oggetti-testata { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 12px; padding: 10px 14px 9px; border-bottom: 1px solid var(--lab-line); }
    .lab-oggetti-testata h4 { margin: 0; font: 800 13px/1.35 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--lab-bright); }
    .lab-oggetti-testata h4 span { color: var(--lo-ogg); text-transform: none; letter-spacing: 0; }
    .lab-oggetti-nota { font-size: 13px; color: var(--lo-muto); }
    .lab-oggetti-corpo { padding: 12px 14px 14px; display: grid; gap: 12px; }
    .lab-oggetti-riga { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
    .lab-oggetti-errore { margin: 0; color: #ffb6cc; font-size: 13.5px; line-height: 1.45; }
    .lab-oggetti-errore[hidden] { display: none; }

    /* parole del codice: lo stesso colore per lo stesso concetto, ovunque */
    .lab-oggetti-t-cls { color: var(--lo-cls); }
    .lab-oggetti-t-ogg { color: var(--lo-ogg); font-weight: 700; }
    .lab-oggetti-t-met { color: var(--lo-met); }
    .lab-oggetti-t-dato { color: var(--lo-dato); }
    .lab-oggetti-t-kw { color: var(--lo-kw); }

    /* schede delle classi: cianografie */
    .lab-oggetti-classi .lab-oggetti-corpo { gap: 0; }
    .lab-oggetti-classe {
      position: relative; padding: 11px 14px 12px; border-radius: 10px;
      border: 1px solid color-mix(in srgb, var(--lo-cls) 40%, transparent);
      background-color: var(--lo-blu);
      background-image: linear-gradient(rgba(92, 200, 255, .07) 1px, transparent 1px), linear-gradient(90deg, rgba(92, 200, 255, .07) 1px, transparent 1px);
      background-size: 14px 14px;
      font: 13.5px/1.5 var(--mono); color: #cfe6f2;
      transition: border-color var(--pg-dur-veloce) ease, box-shadow var(--pg-dur-veloce) ease;
    }
    .lab-oggetti-classe--scelta { border-color: var(--lo-cls); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--lo-cls) 60%, transparent); }
    .lab-oggetti-classe--cerca { border-style: dashed; border-color: var(--lo-met); box-shadow: 0 0 0 3px color-mix(in srgb, var(--lo-met) 18%, transparent); }
    .lab-oggetti-classe--manca { border-color: var(--lo-err); box-shadow: 0 0 0 3px color-mix(in srgb, var(--lo-err) 25%, transparent); }
    .lab-oggetti-classe-tit { margin: 0 66px 0 0; font-weight: 700; color: var(--lab-bright); overflow-wrap: anywhere; }
    .lab-oggetti-istanze { margin: 0 66px 0 0; font: 600 13px var(--font); color: var(--lo-muto); }
    .lab-oggetti-sez { margin: 8px 0 2px; font: 700 13px var(--font); color: var(--lo-muto); }
    .lab-oggetti-membri { list-style: none; margin: 0; padding: 0; display: grid; gap: 1px; }
    .lab-oggetti-membri li { display: flex; align-items: center; gap: 8px; min-height: 26px; padding: 1px 8px; margin: 0 -8px; border-radius: 6px; transition: background-color var(--pg-dur-veloce) ease, box-shadow var(--pg-dur-veloce) ease; }
    .lab-oggetti-membri li.lab-oggetti-esegue, .lab-oggetti-eredita span.lab-oggetti-esegue { background: color-mix(in srgb, var(--lo-met) 24%, transparent); box-shadow: inset 3px 0 0 var(--lo-met); color: #fff; }
    .lab-oggetti-membri li.lab-oggetti-esegue .lab-oggetti-t-met { color: #ffe2a6; }
    .lab-oggetti-lucchetto { width: 12px; height: 14px; flex: none; color: var(--lo-err); }
    .lab-oggetti-privato { margin-left: auto; font: 600 13px var(--font); color: #ff9dbb; }
    .lab-oggetti-badge { margin-left: auto; padding: 0 8px; border-radius: 999px; font: 700 13px/1.5 var(--font); border: 1px solid currentColor; white-space: nowrap; }
    .lab-oggetti-badge--nuovo { color: var(--lo-dato); }
    .lab-oggetti-badge--ridefinito { color: var(--lo-met); }
    .lab-oggetti-eredita { margin: 6px 0 0; font-size: 13px; color: var(--lo-muto); line-height: 1.7; }
    .lab-oggetti-eredita span { padding: 1px 4px; border-radius: 5px; transition: background-color var(--pg-dur-veloce) ease; }
    .lab-oggetti-progetto { position: absolute; top: 8px; right: 8px; width: 58px; height: 58px; pointer-events: none; }
    .lab-oggetti-estende { display: flex; align-items: center; gap: 10px; height: 38px; padding-left: 22px; font: 700 13px var(--mono); color: var(--lo-kw); }
    .lab-oggetti-estende svg { width: 16px; height: 38px; flex: none; }

    /* fabbrica */
    .lab-oggetti-gruppo .pg-btn { font-family: var(--mono); }
    .lab-oggetti-nome { width: 8.6em; }
    .lab-oggetti-nome[aria-invalid="true"] { border-color: var(--lo-err); color: #ffb6cc; }
    .lab-oggetti-colori { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; }
    .lab-oggetti-colore { position: relative; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 10px; cursor: pointer; }
    .lab-oggetti-colore input { position: absolute; inset: 0; margin: 0; opacity: 0; cursor: pointer; }
    .lab-oggetti-colore i { width: 22px; height: 22px; border-radius: 50%; background: var(--c); box-shadow: 0 0 0 3px var(--lab-panel), 0 0 0 4px rgba(255, 255, 255, .12); transition: box-shadow var(--pg-dur-veloce) ease; }
    .lab-oggetti-colore input:checked + i { box-shadow: 0 0 0 3px var(--lab-panel), 0 0 0 5px var(--c); }
    .lab-oggetti-colore input:focus-visible + i { outline: 3px solid var(--trace-1); outline-offset: 6px; }
    .lab-oggetti-anteprima { flex: 1 1 250px; min-width: 0; padding: 9px 12px; border-radius: 8px; background: #050a09; border: 1px solid var(--lab-line); font: 13.5px/1.5 var(--mono); color: var(--lab-text); overflow-wrap: anywhere; }

    /* palco */
    .lab-oggetti-palco-corpo { position: relative; padding: 4px 0 8px; }
    .lab-oggetti-scena, .lab-oggetti-corsia { display: grid; grid-template-columns: var(--lo-targa-w) minmax(0, 1fr); gap: 10px; padding: 6px 14px; }
    .lab-oggetti-scena { align-items: end; padding-bottom: 8px; }
    .lab-oggetti-scena-leg { font-size: 13px; line-height: 1.4; color: var(--lo-muto); padding: 0 0 6px 8px; }
    .lab-oggetti-scena-pista { display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; min-width: 0; }
    .lab-oggetti-pressa, .lab-oggetti-chiamante { display: grid; justify-items: center; gap: 2px; font: 600 13px var(--font); color: var(--lo-muto); }
    .lab-oggetti-pressa { width: var(--lo-robot-w); overflow: visible; }
    .lab-oggetti-pressa svg { width: 58px; height: 50px; overflow: visible; }
    .lab-oggetti-chiamante svg { width: 54px; height: 46px; }
    .lab-oggetti-pistone { will-change: transform; }
    .lab-oggetti-corsie { list-style: none; margin: 0; padding: 0; }
    .lab-oggetti-corsia { position: relative; align-items: center; border-top: 1px solid color-mix(in srgb, var(--lab-line) 75%, transparent); }
    .lab-oggetti-corsia::before { content: ""; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: transparent; transition: background-color var(--pg-dur-veloce) ease; }
    .lab-oggetti-corsia--scelta { background: linear-gradient(90deg, rgba(238, 246, 242, .06), rgba(238, 246, 242, .01)); }
    .lab-oggetti-corsia--scelta::before { background: var(--lo-ogg); }
    .lab-oggetti-targa {
      display: grid; gap: 3px; align-content: center; min-height: 64px; padding: 6px 8px; margin-left: -4px;
      text-align: left; border-radius: 9px; border: 1px solid transparent; background: none;
      color: var(--lab-text); font: inherit; cursor: pointer;
    }
    .lab-oggetti-targa:hover { border-color: var(--lab-line); }
    .lab-oggetti-targa[aria-pressed="true"] { border-color: color-mix(in srgb, var(--lo-ogg) 30%, transparent); background: rgba(238, 246, 242, .03); }
    .lab-oggetti-targa-nome { display: flex; align-items: center; gap: 7px; font: 800 14px/1.2 var(--mono); color: var(--lo-ogg); }
    .lab-oggetti-pallino { width: 10px; height: 10px; border-radius: 50%; flex: none; box-shadow: 0 0 0 2px rgba(0, 0, 0, .35); }
    .lab-oggetti-targa-cls { font: 600 13px/1.25 var(--mono); color: var(--lo-cls); overflow-wrap: anywhere; }
    .lab-oggetti-energia { display: flex; align-items: center; gap: 6px; }
    .lab-oggetti-barra { flex: 1; min-width: 36px; height: 7px; border-radius: 4px; background: #22322d; overflow: hidden; }
    .lab-oggetti-livello { display: block; height: 100%; background: var(--lo-dato); transform-origin: left center; transition: background-color var(--pg-dur-veloce) ease; }
    .lab-oggetti-livello--basso { background: var(--lo-err); }
    .lab-oggetti-valore { min-width: 3ch; text-align: right; font: 700 13px var(--mono); color: var(--lo-dato); font-variant-numeric: tabular-nums; }
    .lab-oggetti-valore--basso { color: var(--lo-err); }
    .lab-oggetti-fulmine { width: 12px; height: 14px; flex: none; color: var(--lo-dato); opacity: 0; transition: opacity var(--pg-dur-veloce) ease; }
    .lab-oggetti-fulmine--su { opacity: 1; }
    .lab-oggetti-pista { position: relative; height: 66px; min-width: 0; cursor: pointer; }
    .lab-oggetti-binario { position: absolute; left: 0; right: 0; bottom: 3px; height: 2px; border-radius: 1px; background: #2b3e38; }
    .lab-oggetti-tacche { position: absolute; left: calc(var(--lo-robot-w) / 2); right: calc(var(--lo-robot-w) / 2); bottom: 0; height: 8px; display: flex; justify-content: space-between; }
    .lab-oggetti-tacche i { width: 2px; height: 8px; margin-left: -1px; background: #34504a; }
    .lab-oggetti-robot { position: absolute; left: 0; bottom: 4px; width: var(--lo-robot-w); will-change: transform; }
    .lab-oggetti-robot svg { display: block; width: 100%; height: auto; overflow: visible; transform-origin: 50% 100%; }
    .lab-oggetti-corsia--scelta .lab-oggetti-robot::after { content: ""; position: absolute; left: 4%; right: 4%; bottom: -5px; height: 7px; border-radius: 50%; background: radial-gradient(closest-side, rgba(238, 246, 242, .45), transparent); }
    .lab-oggetti-scintille { opacity: 0; transform-box: fill-box; transform-origin: center; }
    .lab-oggetti-robot--salda .lab-oggetti-scintille { animation: lab-oggetti-scintilla 240ms steps(2, end) infinite; }
    @keyframes lab-oggetti-scintilla { 0% { opacity: 1; transform: scale(1); } 50% { opacity: .4; transform: scale(1.4); } 100% { opacity: 1; transform: scale(.8); } }
    .lab-oggetti-scudo { position: absolute; left: 50%; top: 14px; width: 26px; height: 30px; margin-left: -13px; color: var(--lo-err); opacity: 0; transform: scale(.6); transition: opacity var(--pg-dur-veloce) ease, transform var(--pg-dur-normale) var(--pg-ease-bounce); pointer-events: none; filter: drop-shadow(0 0 6px rgba(255, 122, 168, .6)); }
    .lab-oggetti-scudo--su { opacity: 1; transform: none; }
    .lab-oggetti-fumetto {
      position: absolute; left: 0; bottom: 64px; z-index: 3; width: max-content; max-width: min(232px, 100%);
      padding: 6px 10px; border-radius: 10px; background: #f3f8f5; color: #0b1210;
      font: 600 13px/1.35 var(--font); box-shadow: 0 10px 22px -10px rgba(0, 0, 0, .8);
      opacity: 0; transform: translateY(5px) scale(.96); transform-origin: var(--coda, 50%) 100%;
      transition: opacity var(--pg-dur-veloce) ease, transform var(--pg-dur-normale) var(--pg-ease-smooth);
      pointer-events: none;
    }
    .lab-oggetti-fumetto::after { content: ""; position: absolute; top: 100%; left: var(--coda, 50%); margin-left: -6px; border: 6px solid transparent; border-top-color: #f3f8f5; }
    .lab-oggetti-fumetto--su { opacity: 1; transform: none; }
    .lab-oggetti-fumetto--err { background: #ffd8e4; }
    .lab-oggetti-fumetto--err::after { border-top-color: #ffd8e4; }
    .lab-oggetti-vuoto { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 14px; margin: 4px 14px 6px; padding: 14px; border: 1px dashed color-mix(in srgb, var(--lo-cls) 40%, transparent); border-radius: 10px; color: var(--lab-text); font-size: 14px; line-height: 1.5; }
    .lab-oggetti-vuoto[hidden] { display: none; }
    .lab-oggetti-vuoto svg { width: 52px; height: 52px; }
    .lab-oggetti-vuoto p { margin: 0; }
    .lab-oggetti-volo { position: absolute; inset: 0; z-index: 5; pointer-events: none; }
    .lab-oggetti-busta { position: absolute; left: 0; top: 0; display: flex; flex-direction: row-reverse; align-items: center; gap: 5px; will-change: transform; }
    .lab-oggetti-busta svg { width: 28px; height: 20px; flex: none; filter: drop-shadow(0 3px 6px rgba(0, 0, 0, .6)); }
    .lab-oggetti-busta-tag { padding: 1px 7px; border-radius: 6px; background: #211a08; border: 1px solid var(--lo-met); color: var(--lo-met); font: 700 13px/1.4 var(--mono); white-space: nowrap; }
    .lab-oggetti-busta--err .lab-oggetti-busta-tag { color: #ffb6cc; border-color: var(--lo-err); background: #2a0b16; }
    .lab-oggetti-clone { position: absolute; left: 0; top: 0; width: var(--lo-robot-w); will-change: transform; }
    .lab-oggetti-clone svg { display: block; width: 100%; height: auto; overflow: visible; }

    /* messaggi */
    .lab-oggetti-met { font-family: var(--mono); color: var(--lo-met); }
    .lab-oggetti-met:hover:not(:disabled) { color: #ffe2a6; border-color: var(--lo-met); }
    .lab-oggetti-met--estraneo { border-style: dashed; }
    .lab-oggetti-passi { width: 4.4em; }
    .lab-oggetti-passi[aria-invalid="true"] { border-color: var(--lo-err); color: #ffb6cc; }
    .lab-oggetti-forza { color: #ffb6cc; border-color: color-mix(in srgb, var(--lo-err) 45%, var(--lab-line)); }
    .lab-oggetti-forza:hover:not(:disabled) { color: #ffd2df; border-color: var(--lo-err); }
    .lab-oggetti-tutti { color: var(--lab-bright); }
    .lab-oggetti-dest { max-width: 100%; }

    /* programma */
    .lab-oggetti-legenda { display: flex; flex-wrap: wrap; gap: 2px 12px; font: 600 13px var(--font); color: var(--lab-text); }
    .lab-oggetti-legenda span { display: inline-flex; align-items: center; gap: 5px; }
    .lab-oggetti-legenda i { width: 9px; height: 9px; border-radius: 2px; background: var(--c); }
    .lab-oggetti-righe { list-style: none; margin: 0; padding: 8px 0 10px; max-height: 268px; overflow: auto; counter-reset: lab-oggetti-n; font: 13.5px/1.6 var(--mono); }
    .lab-oggetti-righe li { position: relative; display: flex; flex-wrap: wrap; column-gap: 1.1em; padding: 1px 14px 1px 3.4em; }
    .lab-oggetti-righe li::before { counter-increment: lab-oggetti-n; content: counter(lab-oggetti-n); position: absolute; left: 0; width: 2.5em; text-align: right; color: #56756b; }
    .lab-oggetti-righe li.lab-oggetti-cont::before, .lab-oggetti-righe li.lab-oggetti-vuota::before { content: ""; counter-increment: none; }
    .lab-oggetti-righe code.lab-oggetti-codice { background: none; border: 0; padding: 0; font: inherit; color: var(--lab-text); }
    .lab-oggetti-commento { color: var(--lo-muto); font-style: italic; }
    .lab-oggetti-commento--err { color: #ff9dbb; font-style: normal; }
    .lab-oggetti-vuota { color: var(--lo-muto); font-style: italic; }

    /* spiegazione */
    .lab-oggetti-concetto { display: inline-block; margin-right: 8px; padding: 1px 9px; border-radius: 999px; background: var(--lo-cls); color: #04131c; font: 800 13px/1.5 var(--mono); letter-spacing: .04em; vertical-align: 1px; }
    .lab-oggetti-concetto--err { background: var(--lo-err); color: #2b0613; }
    .lab-oggetti-fatto { color: var(--lo-dato); font-weight: 700; }

    @container (max-width: 420px) {
      .lab-oggetti { padding: 12px; --lo-robot-w: 42px; }
      .lab-oggetti-scena, .lab-oggetti-corsia { gap: 8px; padding-left: 10px; padding-right: 10px; }
      .lab-oggetti-corpo { padding: 12px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .lab-oggetti-classe, .lab-oggetti-membri li, .lab-oggetti-colore i, .lab-oggetti-livello, .lab-oggetti-fumetto, .lab-oggetti-scudo, .lab-oggetti-fulmine, .lab-oggetti-corsia::before, .lab-oggetti-eredita span { transition: none; }
      .lab-oggetti-robot--salda .lab-oggetti-scintille { animation: none; opacity: 1; }
    }
  `;

  const NS_COLORI = { cls: '#5cc8ff', ogg: '#eef6f2', met: '#ffc04d', dato: '#3ee08f', err: '#ff7aa8' };

  function monta(el, ctx) {
    const h = ctx.h;
    const s = ctx.s;
    let stato = nuovoStato();
    let selezionato = null;
    let classeScelta = 'Robot';
    let indiceColore = 0;
    let nomeToccato = false;
    let corrente = null;
    let animando = false;
    let completo = false;
    let larghezzaPista = 0;
    let larghezzaRobot = 48;
    const viste = new Map();
    const uid = ctx.uid('lab-oggetti');
    const nulla = () => {};

    /* ---------- piccole icone ---------- */

    function lucchetto(cls) {
      return s('svg', { viewBox: '0 0 12 14', class: cls || 'lab-oggetti-lucchetto', 'aria-hidden': 'true', focusable: 'false' },
        s('path', { d: 'M3 6V4.2a3 3 0 0 1 6 0V6', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6 }),
        s('rect', { x: 1, y: 6, width: 10, height: 7.4, rx: 1.6, fill: 'currentColor' }));
    }
    function scudo() {
      return s('svg', { viewBox: '0 0 26 30', class: 'lab-oggetti-scudo', 'aria-hidden': 'true', focusable: 'false' },
        s('path', { d: 'M13 1.5 24 5.5v8.2c0 7-4.8 12.2-11 14.8C6.8 25.9 2 20.7 2 13.7V5.5Z', fill: '#2a0b16', stroke: 'currentColor', 'stroke-width': 2 }),
        s('path', { d: 'M9.5 13.5v-2a3.5 3.5 0 0 1 7 0v2', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8 }),
        s('rect', { x: 8, y: 13.5, width: 10, height: 7.5, rx: 1.5, fill: 'currentColor' }));
    }
    function fulmine() {
      return s('svg', { viewBox: '0 0 12 14', class: 'lab-oggetti-fulmine', 'aria-hidden': 'true', focusable: 'false' },
        s('path', { d: 'M7.2 0.5 1.5 8h4l-1 5.5L10.5 6h-4Z', fill: 'currentColor' }));
    }
    function svgBusta() {
      return s('svg', { viewBox: '0 0 28 20', 'aria-hidden': 'true', focusable: 'false' },
        s('rect', { x: 1, y: 1, width: 26, height: 18, rx: 2.5, fill: 'currentColor', stroke: '#0b1210', 'stroke-width': 1.6 }),
        s('path', { d: 'M2.5 3 14 11.5 25.5 3', fill: 'none', stroke: '#0b1210', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }));
    }

    /* ---------- il robot: stessa forma per tutti, accessori per la sottoclasse ---------- */

    function spriteRobot(classe, hex) {
      const sald = classe === 'RobotSaldatore';
      const metallo = { fill: '#c9d4d8', stroke: '#0b1210', 'stroke-width': 2 };
      function ruota(cx) {
        return s('g', { class: 'lab-oggetti-ruota' },
          s('circle', { cx: cx, cy: 56, r: 6.5, fill: '#25302f', stroke: '#0b1210', 'stroke-width': 2 }),
          s('path', { d: 'M' + (cx - 4.2) + ' 56H' + (cx + 4.2) + 'M' + cx + ' 51.8V60.2', stroke: '#9fb3b8', 'stroke-width': 1.6, 'stroke-linecap': 'round' }));
      }
      const ruote = [ruota(24), ruota(40)];
      const occhi = sald
        ? s('g', null,
          s('rect', { x: 21, y: 14, width: 23, height: 8.5, rx: 3, fill: '#16262c', stroke: '#0b1210', 'stroke-width': 1.6 }),
          s('path', { d: 'M25 17h9', stroke: '#5cc8ff', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.85 }))
        : s('g', null,
          s('circle', { cx: 29, cy: 18.5, r: 2.9, fill: '#0b1210' }),
          s('circle', { cx: 38, cy: 18.5, r: 2.9, fill: '#0b1210' }),
          s('circle', { cx: 29.9, cy: 17.6, r: 0.9, fill: '#ffffff' }),
          s('circle', { cx: 38.9, cy: 17.6, r: 0.9, fill: '#ffffff' }));
      const braccio = sald
        ? s('g', null,
          s('path', { d: 'M47 36.5 55 42', stroke: '#0b1210', 'stroke-width': 5, 'stroke-linecap': 'round' }),
          s('path', { d: 'M47 36.5 55 42', stroke: '#c9d4d8', 'stroke-width': 2.4, 'stroke-linecap': 'round' }),
          s('rect', { x: 53, y: 40, width: 8, height: 4.5, rx: 1.2, fill: '#6f7f86', stroke: '#0b1210', 'stroke-width': 1.4, transform: 'rotate(34 57 42)' }))
        : s('g', null,
          s('path', { d: 'M47 37q6 1.5 6 8', fill: 'none', stroke: '#0b1210', 'stroke-width': 5, 'stroke-linecap': 'round' }),
          s('path', { d: 'M47 37q6 1.5 6 8', fill: 'none', stroke: '#c9d4d8', 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
      const scintille = sald
        ? s('g', { class: 'lab-oggetti-scintille' },
          s('path', { d: 'M61 47l4 1.5M61 47l2.6 3.6M61 47l-.5 4.4M61 47l3.6-2.6M61 47l-3 3.4', stroke: '#ffc04d', 'stroke-width': 1.6, 'stroke-linecap': 'round' }),
          s('circle', { cx: 61, cy: 47, r: 1.8, fill: '#ffffff' }))
        : null;
      const corpo = s('g', null,
        s('path', { d: 'M32 10V4.5', stroke: '#0b1210', 'stroke-width': 2 }),
        s('circle', { cx: 32, cy: 4, r: 3.1, fill: hex, stroke: '#0b1210', 'stroke-width': 1.6 }),
        s('rect', Object.assign({ x: 19, y: 10, width: 27, height: 18, rx: 6 }, metallo)),
        occhi,
        sald ? null : s('path', { d: 'M30 24.5h7', stroke: '#0b1210', 'stroke-width': 1.6, 'stroke-linecap': 'round' }),
        s('rect', { x: 29, y: 27.5, width: 7, height: 3.5, fill: '#7d8b90', stroke: '#0b1210', 'stroke-width': 1.4 }),
        s('rect', Object.assign({ x: 16, y: 30.5, width: 32, height: 20, rx: 5 }, metallo)),
        s('rect', { x: 23, y: 34.5, width: 18, height: 8, rx: 2, fill: hex, stroke: '#0b1210', 'stroke-width': 1.4 }),
        braccio,
        ruote[0], ruote[1],
        scintille);
      const svg = s('svg', { viewBox: '0 0 64 64', 'aria-hidden': 'true', focusable: 'false' }, corpo);
      return { svg: svg, corpo: corpo, ruote: ruote, centri: [24, 40] };
    }

    // Cianografia del robot per le schede delle classi: i pezzi ereditati sbiaditi, quelli nuovi in evidenza.
    function progetto(classe) {
      const sald = classe === 'RobotSaldatore';
      const tratto = { fill: 'none', stroke: '#5cc8ff', 'stroke-width': 1.5 };
      const base = s('g', { opacity: sald ? 0.38 : 0.9 },
        s('path', Object.assign({ d: 'M32 10V4.5' }, tratto)),
        s('circle', Object.assign({ cx: 32, cy: 4, r: 2.8 }, tratto)),
        s('rect', Object.assign({ x: 19, y: 10, width: 27, height: 18, rx: 6 }, tratto)),
        sald ? null : s('circle', Object.assign({ cx: 29, cy: 18.5, r: 2.6 }, tratto)),
        sald ? null : s('circle', Object.assign({ cx: 38, cy: 18.5, r: 2.6 }, tratto)),
        s('rect', Object.assign({ x: 16, y: 30.5, width: 32, height: 20, rx: 5 }, tratto)),
        s('rect', Object.assign({ x: 23, y: 34.5, width: 18, height: 8, rx: 2 }, tratto)),
        s('circle', Object.assign({ cx: 24, cy: 56, r: 6 }, tratto)),
        s('circle', Object.assign({ cx: 40, cy: 56, r: 6 }, tratto)),
        s('path', { d: 'M8 62.5h48', stroke: '#5cc8ff', 'stroke-width': 1, 'stroke-dasharray': '2 3', fill: 'none' }));
      const nuovi = sald
        ? s('g', null,
          s('rect', Object.assign({ x: 21, y: 14, width: 23, height: 8.5, rx: 3 }, tratto, { 'stroke-width': 1.8, stroke: '#a5e3ff' })),
          s('path', Object.assign({ d: 'M47 36.5 55 42M54 40l6 4' }, tratto, { 'stroke-width': 1.8, stroke: '#a5e3ff' })),
          s('path', { d: 'M56 26v6M53 29h6', stroke: '#3ee08f', 'stroke-width': 1.8, 'stroke-linecap': 'round' }))
        : null;
      return s('svg', { viewBox: '0 0 64 66', class: 'lab-oggetti-progetto', 'aria-hidden': 'true', focusable: 'false' }, base, nuovi);
    }

    /* ---------- schede delle classi ---------- */

    const schede = {};

    function schedaClasse(nomeClasse) {
      const def = CLASSI[nomeClasse];
      const istanze = h('p', { class: 'lab-oggetti-istanze' }, '0 oggetti creati');
      const righeMetodi = {};
      const righeEredita = {};
      const parti = [
        h('p', { class: 'lab-oggetti-classe-tit' },
          h('span', { class: 'lab-oggetti-t-kw' }, 'classe '),
          h('span', { class: 'lab-oggetti-t-cls' }, nomeClasse),
          def.padre ? [h('span', { class: 'lab-oggetti-t-kw' }, ' estende '), h('span', { class: 'lab-oggetti-t-cls' }, def.padre)] : null),
        istanze,
      ];
      if (def.attributi.length) {
        parti.push(h('p', { class: 'lab-oggetti-sez' }, 'attributi'));
        parti.push(h('ul', { class: 'lab-oggetti-membri' }, def.attributi.map((a) => h('li', null,
          lucchetto(),
          h('span', { class: 'lab-oggetti-t-dato' }, a + (a === 'energia' ? ' = ' + ENERGIA_MAX : '')),
          h('span', { class: 'lab-oggetti-privato' }, 'privato')))));
      }
      if (def.padre) {
        const padre = CLASSI[def.padre];
        const ereditati = padre.attributi.map((a) => ({ nome: a, chiave: 'a:' + a, cls: 'lab-oggetti-t-dato' }))
          .concat(padre.metodi.filter((m) => def.metodi.indexOf(m) < 0).map((m) => ({ nome: padre.firme[m], chiave: m, cls: 'lab-oggetti-t-met' })));
        parti.push(h('p', { class: 'lab-oggetti-eredita' },
          'eredita da Robot: ',
          ereditati.map((x, i) => {
            const sp = h('span', { class: x.cls }, x.nome);
            righeEredita[x.chiave] = sp;
            return [sp, i < ereditati.length - 1 ? ', ' : ''];
          })));
      }
      parti.push(h('p', { class: 'lab-oggetti-sez' }, def.padre ? 'metodi aggiunti o ridefiniti' : 'metodi'));
      parti.push(h('ul', { class: 'lab-oggetti-membri' }, def.metodi.map((m) => {
        const padre = def.padre ? CLASSI[def.padre] : null;
        const ridefinito = padre && padre.metodi.indexOf(m) >= 0;
        const li = h('li', null,
          h('span', { class: 'lab-oggetti-t-met' }, def.firme[m]),
          def.padre ? h('span', { class: 'lab-oggetti-badge ' + (ridefinito ? 'lab-oggetti-badge--ridefinito' : 'lab-oggetti-badge--nuovo') }, ridefinito ? 'ridefinito' : 'nuovo') : null);
        righeMetodi[m] = li;
        return li;
      })));
      parti.push(progetto(nomeClasse));
      const art = h('article', { class: 'lab-oggetti-classe', 'aria-label': 'Classe ' + nomeClasse + (def.padre ? ', estende ' + def.padre : '') }, parti);
      schede[nomeClasse] = { art: art, istanze: istanze, metodi: righeMetodi, eredita: righeEredita };
      return art;
    }

    const freccia = s('svg', { viewBox: '0 0 16 38', 'aria-hidden': 'true', focusable: 'false' },
      s('path', { d: 'M8 37V12', stroke: '#c2b3ff', 'stroke-width': 1.6, fill: 'none' }),
      s('path', { d: 'M8 2 14 12H2Z', stroke: '#c2b3ff', 'stroke-width': 1.6, fill: '#0f1916', 'stroke-linejoin': 'round' }));

    const pannelloClassi = h('section', { class: 'lab-oggetti-pannello lab-oggetti-classi', 'aria-labelledby': uid + '-cl' },
      h('header', { class: 'lab-oggetti-testata' },
        h('h4', { id: uid + '-cl' }, 'Le classi'),
        h('span', { class: 'lab-oggetti-nota' }, 'gli stampi, nel codice')),
      h('div', { class: 'lab-oggetti-corpo' },
        schedaClasse('Robot'),
        h('div', { class: 'lab-oggetti-estende', 'aria-hidden': 'true' }, freccia, 'estende'),
        schedaClasse('RobotSaldatore')));

    /* ---------- il programma ---------- */

    const legenda = h('p', { class: 'lab-oggetti-legenda', 'aria-hidden': 'true' },
      [['classe', NS_COLORI.cls], ['oggetto', NS_COLORI.ogg], ['metodo', NS_COLORI.met], ['dato', NS_COLORI.dato], ['errore', NS_COLORI.err]]
        .map((x) => h('span', null, h('i', { style: '--c:' + x[1] }), x[0])));
    const rigaVuota = h('li', { class: 'lab-oggetti-vuota' }, '// il programma è vuoto: ogni azione scriverà qui la sua riga');
    const listaRighe = h('ol', { class: 'lab-oggetti-righe', tabindex: '0', 'aria-label': 'Il programma: le righe scritte finora' }, rigaVuota);
    const pannelloProgramma = h('section', { class: 'lab-oggetti-pannello lab-oggetti-programma', 'aria-labelledby': uid + '-pr' },
      h('header', { class: 'lab-oggetti-testata' }, h('h4', { id: uid + '-pr' }, 'Il programma'), legenda),
      listaRighe);

    /* ---------- la fabbrica ---------- */

    const btnClassi = {};
    const gruppoClassi = h('div', { class: 'pg-gruppo lab-oggetti-gruppo', role: 'group', 'aria-labelledby': uid + '-cc' },
      Object.keys(CLASSI).map((c) => {
        const b = h('button', { type: 'button', class: 'pg-btn', 'aria-pressed': c === classeScelta ? 'true' : 'false', onclick: () => scegliClasse(c) }, c);
        btnClassi[c] = b;
        return b;
      }));
    const campoNome = h('input', {
      class: 'pg-campo lab-oggetti-nome', id: uid + '-nome', type: 'text', maxlength: String(NOME_MAX + 4),
      autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-describedby': uid + '-nerr',
      oninput: () => { nomeToccato = true; aggiornaFabbrica(); },
      onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); creaOggetto(); } },
    });
    const erroreNome = h('p', { class: 'lab-oggetti-errore', id: uid + '-nerr', hidden: true });
    const radioColori = [];
    const gruppoColori = h('div', { class: 'lab-oggetti-colori', role: 'radiogroup', 'aria-labelledby': uid + '-col' },
      COLORI.map((c, i) => {
        const input = h('input', { type: 'radio', name: uid + '-colore', value: c.id, 'aria-label': c.id, onchange: () => { indiceColore = i; aggiornaFabbrica(); } });
        if (i === indiceColore) input.checked = true;
        radioColori.push(input);
        return h('label', { class: 'lab-oggetti-colore', title: c.id }, input, h('i', { style: '--c:' + c.hex }));
      }));
    const anteprima = h('output', { class: 'lab-oggetti-anteprima', 'aria-live': 'off' });
    const btnCrea = h('button', { type: 'button', class: 'pg-btn pg-btn--primario', onclick: () => creaOggetto() }, '▶ Crea');
    const pannelloFabbrica = h('section', { class: 'lab-oggetti-pannello lab-oggetti-fabbrica', 'aria-labelledby': uid + '-fa' },
      h('header', { class: 'lab-oggetti-testata' }, h('h4', { id: uid + '-fa' }, 'La fabbrica'), h('span', { class: 'lab-oggetti-nota' }, 'il costruttore new')),
      h('div', { class: 'lab-oggetti-corpo' },
        h('div', { class: 'lab-oggetti-riga' }, h('span', { class: 'pg-etichetta', id: uid + '-cc' }, 'Classe'), gruppoClassi),
        h('div', { class: 'lab-oggetti-riga' },
          h('label', { class: 'pg-etichetta', for: uid + '-nome' }, 'Nome'), campoNome,
          h('span', { class: 'pg-etichetta', id: uid + '-col' }, 'Colore'), gruppoColori),
        erroreNome,
        h('div', { class: 'lab-oggetti-riga' }, anteprima, btnCrea)));

    /* ---------- il palco ---------- */

    const pistone = s('g', { class: 'lab-oggetti-pistone' },
      s('rect', { x: 26, y: 8, width: 6, height: 11, fill: '#7d8b90', stroke: '#0b1210', 'stroke-width': 1.4 }),
      s('rect', { x: 14, y: 18, width: 30, height: 10, rx: 2, fill: '#0e2a3a', stroke: '#5cc8ff', 'stroke-width': 1.6 }),
      s('path', { d: 'M19 23h20', stroke: '#5cc8ff', 'stroke-width': 1.4, 'stroke-dasharray': '2 3', 'stroke-linecap': 'round' }));
    const svgPressa = s('svg', { viewBox: '0 0 58 50', 'aria-hidden': 'true', focusable: 'false' },
      s('rect', { x: 3, y: 2, width: 5, height: 46, rx: 1.5, fill: '#2e423c', stroke: '#0b1210', 'stroke-width': 1.2 }),
      s('rect', { x: 50, y: 2, width: 5, height: 46, rx: 1.5, fill: '#2e423c', stroke: '#0b1210', 'stroke-width': 1.2 }),
      s('rect', { x: 3, y: 1, width: 52, height: 8, rx: 2, fill: '#3b524b', stroke: '#0b1210', 'stroke-width': 1.2 }),
      pistone,
      s('path', { d: 'M8 47.5h42', stroke: '#3b524b', 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
    const pressa = h('div', { class: 'lab-oggetti-pressa' }, svgPressa, h('span', null, 'fabbrica'));
    const svgChiamante = s('svg', { viewBox: '0 0 54 46', 'aria-hidden': 'true', focusable: 'false' },
      s('rect', { x: 3, y: 2, width: 48, height: 32, rx: 4, fill: '#06100d', stroke: '#3b524b', 'stroke-width': 2 }),
      s('text', { x: 9, y: 24, 'font-size': 13, 'font-family': 'ui-monospace, Menlo, Consolas, monospace', 'font-weight': 700, fill: '#3ee08f' }, '>_'),
      s('path', { d: 'M21 34 19 42h16l-2-8', fill: '#2e423c', stroke: '#0b1210', 'stroke-width': 1.2 }));
    const chiamante = h('div', { class: 'lab-oggetti-chiamante' }, svgChiamante, h('span', null, 'chiamante'));
    const contaOggetti = h('span', { class: 'lab-oggetti-nota' }, '0/' + MAX_OGGETTI + ' oggetti');
    const corsie = h('ul', { class: 'lab-oggetti-corsie', 'aria-label': 'Oggetti in memoria' });
    const ghost = progetto('Robot');
    ghost.setAttribute('class', '');
    const vuoto = h('div', { class: 'lab-oggetti-vuoto' }, ghost,
      h('p', null, 'Nessun oggetto in memoria. Le classi sono solo progetti: scegli una classe nella fabbrica e premi ', h('strong', null, 'Crea'), ' per costruire il primo robot.'));
    const volo = h('div', { class: 'lab-oggetti-volo', 'aria-hidden': 'true' });
    const pannelloPalco = h('section', { class: 'lab-oggetti-pannello lab-oggetti-palco', 'aria-labelledby': uid + '-pa' },
      h('header', { class: 'lab-oggetti-testata' }, h('h4', { id: uid + '-pa' }, 'Il palco'), h('span', { class: 'lab-oggetti-nota' }, 'in memoria · ', contaOggetti)),
      h('div', { class: 'lab-oggetti-palco-corpo' },
        h('div', { class: 'lab-oggetti-scena' },
          h('p', { class: 'lab-oggetti-scena-leg' }, 'nome, classe ed energia di ogni oggetto'),
          h('div', { class: 'lab-oggetti-scena-pista' }, pressa, chiamante)),
        corsie,
        vuoto,
        volo));

    /* ---------- i messaggi ---------- */

    const titoloMsg = h('h4', { id: uid + '-ms' }, 'Manda un messaggio');
    const sceltaDest = h('select', { class: 'pg-campo lab-oggetti-dest', id: uid + '-dest', onchange: () => seleziona(Number(sceltaDest.value)) });
    const campoPassi = h('input', {
      class: 'pg-campo lab-oggetti-passi', id: uid + '-passi', type: 'number', inputmode: 'numeric',
      min: String(PASSI_MIN), max: String(PASSI_MAX), step: '1', value: '3', 'aria-describedby': uid + '-perr',
      oninput: () => aggiornaPassi(false),
      onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); mandaMuovi(); } },
    });
    const errorePassi = h('p', { class: 'lab-oggetti-errore', id: uid + '-perr', hidden: true });
    const argMuovi = h('span', null, '3');
    const btnMetodi = {
      saluta: h('button', { type: 'button', class: 'pg-btn lab-oggetti-met', onclick: () => manda('saluta') }, 'saluta()'),
      muovi: h('button', { type: 'button', class: 'pg-btn lab-oggetti-met', onclick: () => mandaMuovi() }, 'muovi(', argMuovi, ')'),
      ricarica: h('button', { type: 'button', class: 'pg-btn lab-oggetti-met', onclick: () => manda('ricarica') }, 'ricarica()'),
      salda: h('button', { type: 'button', class: 'pg-btn lab-oggetti-met', onclick: () => manda('salda') }, 'salda()'),
    };
    const btnTutti = h('button', { type: 'button', class: 'pg-btn lab-oggetti-tutti', onclick: () => salutanoTutti() }, '✉ Tutti salutano');
    const btnForza = h('button', { type: 'button', class: 'pg-btn lab-oggetti-forza', onclick: () => forza() }, lucchetto(), 'Scrivi energia = 1000 dall\'esterno');
    const btnReset = h('button', { type: 'button', class: 'pg-btn', onclick: () => ricomincia() }, '↺ Ricomincia');
    const pannelloMessaggi = h('section', { class: 'lab-oggetti-pannello lab-oggetti-messaggi', 'aria-labelledby': uid + '-ms' },
      h('header', { class: 'lab-oggetti-testata' }, titoloMsg, h('span', { class: 'lab-oggetti-nota' }, 'dal chiamante all\'oggetto')),
      h('div', { class: 'lab-oggetti-corpo' },
        h('div', { class: 'lab-oggetti-riga' }, h('label', { class: 'pg-etichetta', for: uid + '-dest' }, 'Destinatario'), sceltaDest),
        h('div', { class: 'lab-oggetti-riga' },
          btnMetodi.saluta,
          h('span', { class: 'lab-oggetti-riga' }, btnMetodi.muovi, h('label', { class: 'pg-etichetta', for: uid + '-passi' }, 'passi'), campoPassi),
          btnMetodi.ricarica,
          btnMetodi.salda),
        errorePassi,
        h('div', { class: 'lab-oggetti-riga' }, btnTutti, btnForza, btnReset)));

    /* ---------- spiegazione ---------- */

    const spiega = h('div', { class: 'pg-spiega', 'aria-live': 'polite' });

    el.append(
      h('div', { class: 'lab-oggetti' },
        h('div', { class: 'lab-oggetti-griglia' },
          h('div', { class: 'lab-oggetti-sx' }, pannelloClassi, pannelloProgramma),
          h('div', { class: 'lab-oggetti-dx' }, pannelloFabbrica, pannelloPalco, pannelloMessaggi))),
      spiega);

    /* =================== disegno dello stato =================== */

    function hexDi(colore) {
      for (const c of COLORI) if (c.id === colore) return c.hex;
      return COLORI[0].hex;
    }

    const TOKEN = /("[^"]*")|\b(new|per ogni|in)\b|\b(RobotSaldatore|Robot)\b|(\.)([A-Za-z]\w*)(?=\()|(\.)([A-Za-z]\w*)|\b(\d+)\b|\b([a-z]\w*)\b/g;

    function colora(codice) {
      const frag = document.createDocumentFragment();
      const re = new RegExp(TOKEN.source, 'g');
      let ultimo = 0;
      let m;
      const span = (cls, t) => h('span', { class: cls }, t);
      while ((m = re.exec(codice))) {
        if (m.index > ultimo) frag.append(codice.slice(ultimo, m.index));
        if (m[1] != null) frag.append(span('lab-oggetti-t-dato', m[1]));
        else if (m[2] != null) frag.append(span('lab-oggetti-t-kw', m[2]));
        else if (m[3] != null) frag.append(span('lab-oggetti-t-cls', m[3]));
        else if (m[5] != null) frag.append('.', span('lab-oggetti-t-met', m[5]));
        else if (m[7] != null) frag.append('.', span('lab-oggetti-t-dato', m[7]));
        else if (m[8] != null) frag.append(span('lab-oggetti-t-dato', m[8]));
        else if (m[9] != null) frag.append(span('lab-oggetti-t-ogg', m[9]));
        ultimo = re.lastIndex;
      }
      if (ultimo < codice.length) frag.append(codice.slice(ultimo));
      return frag;
    }

    function aggiornaFabbrica() {
      for (const c in btnClassi) btnClassi[c].setAttribute('aria-pressed', c === classeScelta ? 'true' : 'false');
      if (!nomeToccato) campoNome.value = suggerisciNome(stato, classeScelta);
      const nome = campoNome.value.trim();
      const problema = validaNome(stato, nome);
      // mentre si scrive l'errore compare solo per un nome sbagliato; il campo vuoto si segnala a «Crea»
      mostraErroreNome(problema && nome ? problema : null);
      const v = problema ? (nome || '?').toLowerCase() : nome.toLowerCase();
      anteprima.replaceChildren(colora(v + ' = new ' + classeScelta + '("' + (nome || '?') + '", "' + COLORI[indiceColore].id + '")'));
      for (const c in schede) schede[c].art.classList.toggle('lab-oggetti-classe--scelta', c === classeOggettoScelto());
    }

    function mostraErroreNome(testo) {
      if (testo) {
        erroreNome.textContent = testo;
        erroreNome.hidden = false;
        campoNome.setAttribute('aria-invalid', 'true');
      } else {
        erroreNome.textContent = '';
        erroreNome.hidden = true;
        campoNome.removeAttribute('aria-invalid');
      }
    }

    function aggiornaPassi(forzaMessaggio) {
      const p = validaPassi(campoPassi.value);
      argMuovi.textContent = p.ok ? String(p.passi) : '?';
      if (p.ok || (!forzaMessaggio && campoPassi.value === '')) {
        errorePassi.hidden = true;
        errorePassi.textContent = '';
        if (p.ok) campoPassi.removeAttribute('aria-invalid');
      }
      if (!p.ok && (forzaMessaggio || campoPassi.value !== '')) {
        errorePassi.textContent = p.errore;
        errorePassi.hidden = false;
        campoPassi.setAttribute('aria-invalid', 'true');
      }
      return p;
    }

    function classeOggettoScelto() {
      const o = trova(stato, selezionato);
      return o ? o.classe : classeScelta;
    }

    function creaVista(o) {
      const sp = spriteRobot(o.classe, hexDi(o.colore));
      const scu = scudo();
      const robot = h('div', { class: 'lab-oggetti-robot' }, sp.svg, scu);
      const fumetto = h('div', { class: 'lab-oggetti-fumetto', 'aria-hidden': 'true' });
      const livello = h('span', { class: 'lab-oggetti-livello' });
      const valore = h('span', { class: 'lab-oggetti-valore' }, String(o.energia));
      const ful = fulmine();
      const targa = h('button', { type: 'button', class: 'lab-oggetti-targa', 'aria-pressed': 'false', onclick: () => seleziona(o.id) },
        h('span', { class: 'lab-oggetti-targa-nome' }, h('span', { class: 'lab-oggetti-pallino', style: 'background:' + hexDi(o.colore) }), o.var),
        h('span', { class: 'lab-oggetti-targa-cls' }, o.classe),
        h('span', { class: 'lab-oggetti-energia', 'aria-hidden': 'true' }, h('span', { class: 'lab-oggetti-barra' }, livello), valore, ful));
      const tacche = h('div', { class: 'lab-oggetti-tacche', 'aria-hidden': 'true' });
      for (let i = 0; i <= PISTA; i++) tacche.append(h('i'));
      const pista = h('div', { class: 'lab-oggetti-pista', 'aria-hidden': 'true', onclick: () => seleziona(o.id) },
        h('div', { class: 'lab-oggetti-binario' }), tacche, robot, fumetto);
      const li = h('li', { class: 'lab-oggetti-corsia' }, targa, pista);
      return { id: o.id, li: li, targa: targa, pista: pista, robot: robot, sprite: sp, scudo: scu, fumetto: fumetto, livello: livello, valore: valore, fulmine: ful, angolo: 0, x: 0, dir: 1 };
    }

    function misura() {
      const prima = viste.values().next().value;
      if (!prima) return;
      larghezzaPista = prima.pista.clientWidth;
      larghezzaRobot = prima.robot.offsetWidth || larghezzaRobot;
    }

    function xDi(pos) {
      return Math.round((pos / PISTA) * Math.max(0, larghezzaPista - larghezzaRobot));
    }

    function posiziona(v, x, dy) {
      v.x = x;
      v.robot.style.transform = 'translate(' + x.toFixed(1) + 'px,' + (dy || 0).toFixed(1) + 'px)';
    }

    function orienta(v, dir) {
      v.dir = dir;
      if (dir < 0) v.sprite.corpo.setAttribute('transform', 'translate(64 0) scale(-1 1)');
      else v.sprite.corpo.removeAttribute('transform');
    }

    function giraRuote(v, angolo) {
      v.angolo = angolo;
      v.sprite.ruote.forEach((r, i) => r.setAttribute('transform', 'rotate(' + angolo.toFixed(1) + ' ' + v.sprite.centri[i] + ' 56)'));
    }

    function mostraEnergia(v, valore) {
      const e = Math.max(0, Math.min(ENERGIA_MAX, valore));
      v.livello.style.transform = 'scaleX(' + (e / ENERGIA_MAX).toFixed(3) + ')';
      v.valore.textContent = String(Math.round(e));
      const basso = e < 30;
      v.livello.classList.toggle('lab-oggetti-livello--basso', basso);
      v.valore.classList.toggle('lab-oggetti-valore--basso', basso);
    }

    function etichetta(o) {
      return o.var + ', oggetto della classe ' + o.classe + ', energia ' + o.energia + ' su ' + ENERGIA_MAX + ', posizione ' + o.pos + ' di ' + PISTA;
    }

    function aggiornaPalco() {
      for (const [id, v] of viste) {
        if (!trova(stato, id)) { v.li.remove(); viste.delete(id); }
      }
      for (const o of stato.oggetti) {
        if (!viste.has(o.id)) {
          const v = creaVista(o);
          viste.set(o.id, v);
          corsie.append(v.li);
        }
      }
      misura();
      for (const o of stato.oggetti) {
        const v = viste.get(o.id);
        posiziona(v, xDi(o.pos), 0);
        orienta(v, o.dir);
        mostraEnergia(v, o.energia);
        v.targa.setAttribute('aria-label', etichetta(o));
      }
      vuoto.hidden = stato.oggetti.length > 0;
      contaOggetti.textContent = stato.oggetti.length + '/' + MAX_OGGETTI + ' oggetti';
    }

    function aggiornaSelezione() {
      if (selezionato != null && !trova(stato, selezionato)) selezionato = null;
      if (selezionato == null && stato.oggetti.length) selezionato = stato.oggetti[stato.oggetti.length - 1].id;
      for (const [id, v] of viste) {
        const sc = id === selezionato;
        v.li.classList.toggle('lab-oggetti-corsia--scelta', sc);
        v.targa.setAttribute('aria-pressed', sc ? 'true' : 'false');
      }
      const o = trova(stato, selezionato);
      // menu del destinatario
      const opzioni = stato.oggetti.map((x) => h('option', { value: String(x.id) }, x.var + ' · ' + x.classe));
      if (!opzioni.length) opzioni.push(h('option', { value: '' }, 'nessun oggetto'));
      sceltaDest.replaceChildren(...opzioni);
      sceltaDest.value = o ? String(o.id) : '';
      sceltaDest.disabled = !o;
      titoloMsg.replaceChildren('Messaggio a ', h('span', null, o ? o.var : '…'));
      for (const m in btnMetodi) {
        btnMetodi[m].disabled = !o;
        const estraneo = !!o && !cercaMetodo(o.classe, m);
        btnMetodi[m].classList.toggle('lab-oggetti-met--estraneo', estraneo);
        btnMetodi[m].title = estraneo ? 'Metodo che la classe ' + o.classe + ' non ha: prova a vedere che cosa succede' : '';
      }
      campoPassi.disabled = !o;
      btnForza.disabled = !o;
      btnTutti.disabled = !stato.oggetti.length;
      for (const c in schede) {
        const n = stato.oggetti.filter((x) => x.classe === c).length;
        schede[c].istanze.textContent = n === 1 ? '1 oggetto creato' : n + ' oggetti creati';
        schede[c].art.classList.toggle('lab-oggetti-classe--scelta', c === classeOggettoScelto());
      }
    }

    function disegna() {
      aggiornaPalco();
      aggiornaSelezione();
      aggiornaFabbrica();
    }

    function aggiungiRighe(righe) {
      if (rigaVuota.parentNode) rigaVuota.remove();
      const nuove = [];
      for (const r of righe) {
        const err = /✗/.test(r.commento || '');
        const li = h('li', { class: r.codice ? null : 'lab-oggetti-cont' },
          r.codice ? h('code', { class: 'lab-oggetti-codice' }, colora(r.codice)) : null,
          r.commento ? h('span', { class: 'lab-oggetti-commento' + (err ? ' lab-oggetti-commento--err' : '') }, '// ' + r.commento) : null);
        listaRighe.append(li);
        nuove.push(li);
      }
      while (listaRighe.children.length > 60) listaRighe.firstElementChild.remove();
      listaRighe.scrollTop = listaRighe.scrollHeight;
      if (!ctx.riduci) nuove.forEach((li) => { li.classList.add('pg-flash'); });
    }

    function narra(e, extra) {
      spiega.replaceChildren(
        h('p', null,
          e.concetto ? h('span', { class: 'lab-oggetti-concetto' + (e.ok === false ? ' lab-oggetti-concetto--err' : '') }, e.concetto) : null,
          e.titolo ? h('strong', null, ctx.inline(e.titolo)) : null,
          e.titolo ? ' ' : null,
          ctx.inline(e.testo || '')),
        extra ? h('p', { class: 'lab-oggetti-fatto' }, extra) : null);
    }

    const INIZIO = {
      concetto: 'Classe',
      titolo: 'Una classe è solo un progetto.',
      testo: 'Le due schede blu descrivono che cosa avrà e che cosa saprà fare ogni robot, ma per ora in memoria non c\'è nessun robot. Scegli una classe nella fabbrica, dai un nome e un colore e premi **Crea**.',
    };

    /* =================== animazioni =================== */

    function punto(elem, ax, ay) {
      const r = elem.getBoundingClientRect();
      const o = volo.getBoundingClientRect();
      return { x: r.left - o.left + r.width * ax, y: r.top - o.top + r.height * ay };
    }

    function testaRobot(v) { return punto(v.robot, 0.5, 0.18); }
    function bocca() { return punto(svgChiamante, 0.5, 0.38); }

    // Una busta che vola lungo un arco (curva di Bézier quadratica) da a verso b.
    function vola(nodo, da, a, durata, alzo) {
      const c = { x: (da.x + a.x) / 2, y: Math.min(da.y, a.y) - alzo };
      const dx0 = 14;
      const dy0 = 10;
      const larg = nodo.offsetWidth;
      return ctx.anima({
        durata: durata,
        easing: 'smooth',
        aggiorna(t) {
          const u = 1 - t;
          const x = u * u * da.x + 2 * u * t * c.x + t * t * a.x;
          const y = u * u * da.y + 2 * u * t * c.y + t * t * a.y;
          const vx = 2 * u * (c.x - da.x) + 2 * t * (a.x - c.x);
          const vy = 2 * u * (c.y - da.y) + 2 * t * (a.y - c.y);
          const ang = Math.max(-16, Math.min(16, Math.atan2(vy, Math.abs(vx) + 1) * 18));
          nodo.style.transform = 'translate(' + (x - larg + dx0).toFixed(1) + 'px,' + (y - dy0).toFixed(1) + 'px) rotate(' + ang.toFixed(1) + 'deg)';
        },
      });
    }

    function nuovaBusta(testo, err) {
      const b = h('div', { class: 'lab-oggetti-busta' + (err ? ' lab-oggetti-busta--err' : ''), style: 'color:' + (err ? NS_COLORI.err : NS_COLORI.met) },
        svgBusta(), h('span', { class: 'lab-oggetti-busta-tag' }, testo));
      volo.append(b);
      return b;
    }

    async function svanisci(nodo, durata) {
      const base = nodo.style.transform || '';
      await ctx.anima({
        durata: durata || ctx.DURATA.veloce,
        easing: 'sharp',
        aggiorna(t) { nodo.style.opacity = String(1 - t); nodo.style.transform = base + ' scale(' + (1 + 0.25 * t).toFixed(3) + ')'; },
      });
      nodo.remove();
    }

    // Il messaggio parte dal chiamante e arriva all'oggetto. Con il movimento ridotto non vola.
    async function consegna(testo, v) {
      if (ctx.riduci) return;
      const b = nuovaBusta(testo, false);
      await vola(b, bocca(), testaRobot(v), ctx.DURATA.lenta, 46);
      await svanisci(b);
    }

    async function respinta(testo, v) {
      if (ctx.riduci) return;
      const b = nuovaBusta(testo, false);
      const da = bocca();
      const a = testaRobot(v);
      await vola(b, da, a, ctx.DURATA.lenta, 46);
      b.classList.add('lab-oggetti-busta--err');
      b.style.color = NS_COLORI.err;
      await ctx.attendi(ctx.DURATA.normale);
      await vola(b, a, da, ctx.DURATA.lenta, 30);
      await svanisci(b);
    }

    function fumetto(v, testo, err) {
      v.fumetto.textContent = testo;
      v.fumetto.classList.toggle('lab-oggetti-fumetto--err', !!err);
      const bw = v.fumetto.offsetWidth;
      const centro = v.x + larghezzaRobot / 2;
      const sinistra = Math.max(0, Math.min(larghezzaPista - bw, centro - bw / 2));
      v.fumetto.style.left = sinistra.toFixed(1) + 'px';
      v.fumetto.style.setProperty('--coda', Math.max(10, Math.min(bw - 10, centro - sinistra)).toFixed(1) + 'px');
      v.fumetto.classList.add('lab-oggetti-fumetto--su');
    }

    function pulisciTransitori() {
      volo.replaceChildren();
      for (const v of viste.values()) {
        v.fumetto.classList.remove('lab-oggetti-fumetto--su');
        v.scudo.classList.remove('lab-oggetti-scudo--su');
        v.fulmine.classList.remove('lab-oggetti-fulmine--su');
        v.robot.classList.remove('lab-oggetti-robot--salda');
        v.robot.style.opacity = '';
        v.sprite.svg.style.transform = '';
        v.li.style.opacity = '';
        v.li.style.transform = '';
      }
      pistone.removeAttribute('transform');
      for (const c in schede) {
        schede[c].art.classList.remove('lab-oggetti-classe--cerca', 'lab-oggetti-classe--manca');
        for (const k in schede[c].metodi) schede[c].metodi[k].classList.remove('lab-oggetti-esegue');
        for (const k in schede[c].eredita) schede[c].eredita[k].classList.remove('lab-oggetti-esegue');
      }
    }

    // Mostra nelle schede dove viene cercato e trovato il metodo.
    async function cercaNelleClassi(e) {
      const percorso = e.percorso || [];
      if (!ctx.riduci) {
        for (let i = 0; i < percorso.length; i++) {
          const nome = percorso[i];
          const ultimo = i === percorso.length - 1;
          if (ultimo && e.tipo !== 'sconosciuto') break;
          schede[nome].art.classList.add('lab-oggetti-classe--cerca');
          if (schede[nome].eredita[e.metodo]) schede[nome].eredita[e.metodo].classList.add('lab-oggetti-esegue');
          await ctx.attendi(ctx.DURATA.lenta);
          schede[nome].art.classList.remove('lab-oggetti-classe--cerca');
        }
      }
      if (e.tipo === 'sconosciuto') {
        percorso.forEach((nome) => schede[nome].art.classList.add('lab-oggetti-classe--manca'));
      } else if (e.definitoIn && schede[e.definitoIn].metodi[e.metodo]) {
        schede[e.definitoIn].metodi[e.metodo].classList.add('lab-oggetti-esegue');
      }
    }

    async function animaCrea(e) {
      aggiornaPalco();
      aggiornaSelezione();
      const v = viste.get(e.id);
      if (!v) return;
      if (ctx.riduci) return;
      v.robot.style.opacity = '0';
      v.li.style.opacity = '0';
      v.li.style.transform = 'translateY(6px)';
      const entra = ctx.anima({
        durata: ctx.DURATA.normale,
        aggiorna(t) { v.li.style.opacity = String(t); v.li.style.transform = 'translateY(' + (6 * (1 - t)).toFixed(2) + 'px)'; },
      });
      entra.catch(nulla);
      await ctx.anima({ durata: ctx.DURATA.veloce, easing: 'sharp', aggiorna(t) { pistone.setAttribute('transform', 'translate(0 ' + (13 * t).toFixed(2) + ')'); } });
      const sp = spriteRobot(e.oggetto.classe, hexDi(e.oggetto.colore));
      const clone = h('div', { class: 'lab-oggetti-clone' }, sp.svg);
      volo.append(clone);
      const da = punto(svgPressa, 0.5, 0.94);
      const w = clone.offsetWidth;
      const hh = clone.offsetHeight;
      const su = ctx.anima({ durata: ctx.DURATA.normale, easing: 'bounce', aggiorna(t) { pistone.setAttribute('transform', 'translate(0 ' + (13 * (1 - t)).toFixed(2) + ')'); } });
      su.catch(nulla);
      await entra;
      const arrivo = punto(v.robot, 0.5, 1);
      await ctx.anima({
        durata: ctx.DURATA.lenta,
        easing: (t) => t * t,
        aggiorna(t) {
          const x = da.x + (arrivo.x - da.x) * t;
          const y = da.y + (arrivo.y - da.y) * t;
          const sc = 0.55 + 0.45 * Math.min(1, t * 2.2);
          clone.style.transform = 'translate(' + (x - w / 2).toFixed(1) + 'px,' + (y - hh).toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
          clone.style.transformOrigin = '50% 100%';
        },
      });
      clone.remove();
      v.robot.style.opacity = '';
      await su;
      await ctx.anima({
        durata: ctx.DURATA.normale,
        easing: 'bounce',
        aggiorna(t) {
          const k = 1 - t;
          v.sprite.svg.style.transform = 'scale(' + (1 + 0.14 * k).toFixed(3) + ',' + (1 - 0.14 * k).toFixed(3) + ')';
        },
      });
      v.sprite.svg.style.transform = '';
    }

    async function animaMetodo(e) {
      const v = viste.get(e.id);
      if (!v) return;
      const etich = e.metodo + '(' + (e.metodo === 'muovi' ? e.arg : '') + ')';
      if (e.tipo === 'sconosciuto') {
        const cerca = cercaNelleClassi(e);
        cerca.catch(nulla);
        await respinta(etich, v);
        await cerca;
        fumetto(v, e.metodo + '()? Non capisco.', true);
        await ctx.attendi(1800);
        return;
      }
      await consegna(etich, v);
      await cercaNelleClassi(e);
      if (e.tipo === 'rifiutato') {
        fumetto(v, e.risposta, true);
        if (!ctx.riduci) {
          const x0 = v.x;
          await ctx.anima({ durata: ctx.DURATA.lenta, easing: 'linear', aggiorna(t) { posiziona(v, x0 + Math.sin(t * Math.PI * 6) * 3 * (1 - t), 0); } });
          posiziona(v, x0, 0);
        }
        await ctx.attendi(1600);
        return;
      }
      if (e.metodo === 'saluta') {
        fumetto(v, e.risposta, false);
        await ctx.attendi(2200);
      } else if (e.metodo === 'muovi') {
        let energia = e.prima.energia;
        for (const p of e.percorsoPassi) {
          const x0 = v.x;
          const x1 = xDi(p.pos);
          if (p.girata) orienta(v, p.dir);
          const a0 = v.angolo;
          const giro = (Math.abs(x1 - x0) / (2 * Math.PI * 6.5 * (larghezzaRobot / 64))) * 360;
          const e0 = energia;
          energia -= COSTO_PASSO;
          await ctx.anima({
            durata: ctx.DURATA.normale,
            easing: 'sharp',
            aggiorna(t) {
              posiziona(v, x0 + (x1 - x0) * t, -2.6 * Math.sin(Math.PI * t));
              giraRuote(v, a0 + giro * t);
              mostraEnergia(v, e0 - COSTO_PASSO * t);
            },
          });
        }
      } else if (e.metodo === 'ricarica') {
        v.fulmine.classList.add('lab-oggetti-fulmine--su');
        const e0 = e.prima.energia;
        await ctx.anima({ durata: ctx.DURATA.lenta, aggiorna(t) { mostraEnergia(v, e0 + (ENERGIA_MAX - e0) * t); } });
        fumetto(v, e.risposta, false);
        await ctx.attendi(1500);
      } else if (e.metodo === 'salda') {
        v.robot.classList.add('lab-oggetti-robot--salda');
        const e0 = e.prima.energia;
        await ctx.anima({ durata: 900, easing: 'linear', aggiorna(t) { mostraEnergia(v, e0 - COSTO_SALDA * t); } });
        v.robot.classList.remove('lab-oggetti-robot--salda');
        fumetto(v, e.risposta, false);
        await ctx.attendi(1800);
      }
    }

    async function animaPrivato(e) {
      const v = viste.get(e.id);
      if (!v) return;
      if (ctx.riduci) {
        v.scudo.classList.add('lab-oggetti-scudo--su');
        await ctx.attendi(1800);
        return;
      }
      const b = nuovaBusta(e.campo + ' = ' + e.valore, false);
      const da = bocca();
      const a = testaRobot(v);
      await vola(b, da, a, ctx.DURATA.lenta, 46);
      v.scudo.classList.add('lab-oggetti-scudo--su');
      b.classList.add('lab-oggetti-busta--err');
      b.style.color = NS_COLORI.err;
      await ctx.attendi(ctx.DURATA.normale);
      await vola(b, a, da, ctx.DURATA.lenta, 30);
      await svanisci(b);
      await ctx.attendi(900);
    }

    async function animaTutti(e) {
      await Promise.all(e.risposte.map((r, i) => (async () => {
        const v = viste.get(r.id);
        if (!v) return;
        if (!ctx.riduci) await ctx.attendi(i * 170);
        await consegna('saluta()', v);
        const riga = schede[r.definitoIn].metodi.saluta;
        if (riga) riga.classList.add('lab-oggetti-esegue');
        fumetto(v, r.risposta, false);
      })()));
      await ctx.attendi(2600);
    }

    /* =================== azioni =================== */

    // Ogni azione: ferma l'animazione precedente (che si chiude disegnando lo stato vero),
    // applica la logica, scrive il codice e la spiegazione, poi anima.
    async function esegui(calcola, anima) {
      if (corrente) {
        ctx.annulla();
        await corrente;
      }
      const e = calcola();
      if (!e) return null;
      if (e.righe && e.righe.length) aggiungiRighe(e.righe);
      const finito = !completo && completato(stato);
      narra(e, finito ? '✓ Hai visto classi, oggetti, ereditarietà e polimorfismo: laboratorio esplorato.' : null);
      if (e.tipo === 'errore' || !anima) { disegna(); return e; }
      animando = true;
      const mio = (async () => {
        try { await anima(e); } catch (err) { if (!ctx.annullato(err)) console.error(err); } finally {
          animando = false;
          pulisciTransitori();
          disegna();
        }
      })();
      corrente = mio;
      await mio;
      if (corrente === mio) corrente = null;
      if (finito && !completo) { completo = true; ctx.completa(); }
      return e;
    }

    function creaOggetto() {
      const nome = campoNome.value.trim();
      const problema = validaNome(stato, nome);
      if (problema && stato.oggetti.length < MAX_OGGETTI) {
        mostraErroreNome(problema);
        narra({ ok: false, concetto: 'Attenzione', titolo: 'Nome non valido.', testo: problema });
        campoNome.focus();
        return;
      }
      esegui(() => {
        const e = crea(stato, classeScelta, nome, COLORI[indiceColore].id);
        if (e.ok) {
          selezionato = e.id;
          nomeToccato = false;
          indiceColore = (indiceColore + 1) % COLORI.length;
          radioColori[indiceColore].checked = true;
        }
        return e;
      }, animaCrea);
    }

    function manda(metodo, arg) {
      if (selezionato == null) return;
      const id = selezionato;
      esegui(() => invia(stato, id, metodo, arg), animaMetodo);
    }

    function mandaMuovi() {
      const p = aggiornaPassi(true);
      if (!p.ok) {
        narra({ ok: false, concetto: 'Attenzione', titolo: 'Passi non validi.', testo: p.errore + ' Correggi il numero accanto a `muovi()`.' });
        campoPassi.focus();
        return;
      }
      manda('muovi', p.passi);
    }

    function salutanoTutti() { esegui(() => tuttiSalutano(stato), animaTutti); }

    function forza() {
      if (selezionato == null) return;
      const id = selezionato;
      esegui(() => scriviDallEsterno(stato, id, 'energia', 1000), animaPrivato);
    }

    function seleziona(id) {
      if (!trova(stato, id)) return;
      selezionato = id;
      aggiornaSelezione();
    }

    function scegliClasse(c) {
      classeScelta = c;
      aggiornaFabbrica();
    }

    async function ricomincia() {
      if (corrente) { ctx.annulla(); await corrente; }
      stato = nuovoStato();
      selezionato = null;
      nomeToccato = false;
      listaRighe.replaceChildren(rigaVuota);
      pulisciTransitori();
      disegna();
      narra(INIZIO);
      btnCrea.focus();
    }

    /* =================== avvio =================== */

    disegna();
    aggiornaPassi(false);
    narra(INIZIO);

    let ro = null;
    const suResize = () => {
      if (animando) return;
      const prima = larghezzaPista;
      misura();
      if (prima !== larghezzaPista) aggiornaPalco();
    };
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(suResize);
      ro.observe(corsie);
    } else {
      window.addEventListener('resize', suResize);
    }

    return {
      pausa() {},
      riprendi() { if (!animando) suResize(); },
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('oggetti', { titolo: 'Classi e oggetti', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
