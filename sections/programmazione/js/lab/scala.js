/*
 * Laboratorio «La scala dell'astrazione» (apertura della sezione, #inizio).
 *
 * La stessa somma, x = a + b con a = 2 e b = 3, su sette gradini: dalla frase
 * in italiano fino alle porte logiche dentro l'ALU. Il codice assembly è
 * l'uscita reale di GCC 13 con -O2 (sintassi Intel) per
 *   int a = 2, b = 3, x;  void somma(void) { x = a + b; }
 * e i byte del codice macchina sono calcolati qui sotto su un layout di esempio
 * (codice a 0x1000, variabili a 0x4010, 0x4014, 0x4018), lo stesso che si ottiene
 * con l'assemblatore GNU: as + ld -Ttext=0x1000 -Tdata=0x4010, poi objdump -d.
 *
 * La logica pura (codifica, binario, sommatore a propagazione del riporto) è
 * esportata per i test: node --test sections/programmazione/test/scala.test.js
 */
(function (root) {
  'use strict';

  /* ================= logica pura: niente DOM ================= */

  const LAYOUT = Object.freeze({ codice: 0x1000, a: 0x4010, b: 0x4014, x: 0x4018 });
  const VALORI = Object.freeze({ a: 2, b: 3 });
  const LUNGHEZZA = 6;      // codice operativo + ModRM + 4 byte di spostamento
  const MODRM_RIP = 0x05;   // mod 00, reg 000 (EAX), r/m 101: a 64 bit vuol dire [RIP + spostamento a 32 bit]

  // Le tre istruzioni di GCC 13 -O2 per «x = a + b;»: carica prima b (la somma è commutativa).
  const ISTRUZIONI = Object.freeze([
    { mnemonico: 'mov', operandi: 'eax, DWORD PTR b[rip]', breve: 'mov eax, [b]', codiceOp: 0x8B, dato: 'b', nota: 'copia b nel registro EAX' },
    { mnemonico: 'add', operandi: 'eax, DWORD PTR a[rip]', breve: 'add eax, [a]', codiceOp: 0x03, dato: 'a', nota: 'aggiunge a' },
    { mnemonico: 'mov', operandi: 'DWORD PTR x[rip], eax', breve: 'mov [x], eax', codiceOp: 0x89, dato: 'x', nota: 'scrive il risultato in x' },
  ]);

  // Un intero a 32 bit come 4 byte, dal meno significativo (little-endian).
  function le32(n) {
    const v = n >>> 0;
    return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
  }
  function daLe32(byte) {
    return (byte[0] | (byte[1] << 8) | (byte[2] << 16) | (byte[3] << 24)) | 0;
  }
  function modrm(byte) {
    return { mod: (byte >> 6) & 3, reg: (byte >> 3) & 7, rm: byte & 7 };
  }
  // Istruzione con operando in memoria relativo a RIP: lo spostamento si conta dalla fine dell'istruzione.
  function codifica(codiceOp, indirizzo, bersaglio) {
    const spostamento = bersaglio - (indirizzo + LUNGHEZZA);
    return { byte: [codiceOp, MODRM_RIP].concat(le32(spostamento)), spostamento: spostamento };
  }
  function programma(layout) {
    const L = layout || LAYOUT;
    let indirizzo = L.codice;
    return ISTRUZIONI.map((ist) => {
      const c = codifica(ist.codiceOp, indirizzo, L[ist.dato]);
      const riga = Object.assign({}, ist, {
        indirizzo: indirizzo,
        prossima: indirizzo + LUNGHEZZA,
        bersaglio: L[ist.dato],
        byte: c.byte,
        spostamento: c.spostamento,
      });
      indirizzo += LUNGHEZZA;
      return riga;
    });
  }

  function hex(n, cifre) { return n.toString(16).toUpperCase().padStart(cifre || 2, '0'); }
  function binario(n, cifre) { return n.toString(2).padStart(cifre || 8, '0'); }
  function rigaHex(byte) { return byte.map((b) => hex(b)).join(' '); }
  function rigaBinaria(byte) { return byte.map((b) => binario(b)).join(' '); }
  function campi(byte) {
    return byte.map((b, i) => ({ byte: b, hex: hex(b), bit: binario(b), campo: i === 0 ? 'op' : (i === 1 ? 'modrm' : 'spost') }));
  }
  function migliaia(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  // Sommatore completo: 2 porte XOR, 2 AND e 1 OR.
  const PORTE = Object.freeze({ XOR: 2, AND: 2, OR: 1 });
  function sommatoreCompleto(a, b, cin) {
    const x1 = a ^ b;        // XOR
    const s = x1 ^ cin;      // XOR
    const g = a & b;         // AND
    const p = x1 & cin;      // AND
    return { s: s, cout: g | p };   // OR
  }

  // Sommatore a propagazione del riporto (ripple-carry): n sommatori completi in fila.
  function sommaRipple(a, b, n) {
    const bit = n || 4;
    const max = (1 << bit) - 1;
    for (const v of [a, b]) {
      if (!Number.isInteger(v) || v < 0 || v > max) throw new RangeError('Servono numeri interi da 0 a ' + max + ' (' + bit + ' bit).');
    }
    const riporti = [0];
    const passi = [];
    let somma = 0;
    for (let i = 0; i < bit; i++) {
      const ai = (a >> i) & 1;
      const bi = (b >> i) & 1;
      const cin = riporti[i];
      const fa = sommatoreCompleto(ai, bi, cin);
      somma |= fa.s << i;
      riporti.push(fa.cout);
      passi.push({ bit: i, a: ai, b: bi, cin: cin, s: fa.s, cout: fa.cout, totale: ai + bi + cin });
    }
    return {
      a: a, b: b, n: bit, somma: somma, riporti: riporti, passi: passi,
      overflow: riporti[bit] === 1,
      bitA: binario(a, bit), bitB: binario(b, bit), bitS: binario(somma, bit),
    };
  }

  function descriviPasso(p, n) {
    const bit = n || 4;
    let testo = 'Bit ' + p.bit + ': ' + p.a + ' + ' + p.b + (p.cin ? ' + 1 di riporto' : '') +
      ' = ' + p.totale.toString(2) + (p.totale > 1 ? ' in binario' : '') + '. Scrivo ' + p.s;
    if (p.cout) testo += p.bit < bit - 1 ? ' e porto 1 al bit ' + (p.bit + 1) : ' e il riporto esce dal sommatore';
    return testo + '.';
  }

  function elenco(voci) {
    return voci.length < 2 ? voci.join('') : voci.slice(0, -1).join(', ') + ' e ' + voci[voci.length - 1];
  }

  function riepilogo(r) {
    let testo = r.bitA + ' + ' + r.bitB + ' = ' + r.bitS + ', cioè ' + r.a + ' + ' + r.b + ' = ' + (r.a + r.b) + '.';
    const nati = r.passi.filter((p) => p.cout && p.bit < r.n - 1).map((p) => p.bit);
    if (nati.length === 1) testo += ' Il riporto nasce al bit ' + nati[0] + ' e passa al bit ' + (nati[0] + 1) + '.';
    else if (nati.length > 1) testo += ' I riporti nascono ai bit ' + elenco(nati.map(String)) + ' e passano al bit successivo.';
    else if (!r.overflow) testo += ' Nessun riporto.';
    if (r.overflow) testo += ' L\'ultimo riporto non sta in ' + r.n + ' bit: è un traboccamento (overflow).';
    return testo;
  }

  // Dal caldo dell'italiano al verde elettrico delle porte.
  const TINTE = Object.freeze(['#ff9a76', '#ffb15e', '#ffcb52', '#e3d95a', '#b7e35f', '#84e472', '#3ee08f']);
  const PROGRAMMA = programma();
  const SOMMA = sommaRipple(VALORI.a, VALORI.b, 4);

  const LIVELLI = Object.freeze([
    {
      id: 'naturale', nome: 'Linguaggio naturale', anno: 'anni 2020',
      anteprima: '«Somma a e b e metti il risultato in x.»',
      epoca: 'Modelli linguistici che scrivono codice · [capitolo 13](#ia)',
      spiega: 'Chiara per noi, ambigua per una macchina: a e b sono numeri? E x dove sta? Oggi i {{modello linguistico|modelli linguistici}} traducono frasi così in codice, da rileggere e provare sempre.',
      verso: { chi: 'persona o IA', testo: 'La riscrive in codice una persona, o un modello linguistico.' },
    },
    {
      id: 'python', nome: 'Python', anno: '1991',
      anteprima: '>>> x = a + b',
      epoca: 'Guido van Rossum, CWI di Amsterdam · [capitolo 11](#web)',
      spiega: 'Niente tipi da dichiarare: che a e b siano interi, Python lo scopre mentre il programma gira. E non si trasforma nel C qui sotto: scendendo, i gradini sono linguaggi sempre più vicini alla macchina.',
      verso: { chi: 'interprete', testo: 'L\'{{interprete}} CPython, scritto in C e già compilato, traduce la riga in {{bytecode}} e lo esegue.' },
    },
    {
      id: 'c', nome: 'C', anno: '1972',
      anteprima: 'x = a + b;',
      epoca: 'Dennis Ritchie, Bell Labs · [capitolo 8](#unix)',
      spiega: 'In C ogni variabile ha un tipo: `int` vuol dire numero intero, da 32 bit sui PC di oggi. Così il compilatore sa quanta memoria riservare e quali istruzioni usare.',
      verso: { chi: 'compilatore', testo: 'Il {{compilatore}} (qui GCC) traduce tutto il programma prima di eseguirlo.' },
    },
    {
      id: 'assembly', nome: 'Assembly x86-64', anno: '1978',
      anteprima: ISTRUZIONI[1].mnemonico + ' ' + ISTRUZIONI[1].operandi,
      epoca: 'Intel 8086; 64 bit dal 2003, con l\'AMD Opteron · [capitolo 4](#assembly)',
      spiega: 'L\'uscita vera di GCC 13 con l\'opzione -O2: carica, somma, salva. EAX è un {{registro}} del processore. Sorpresa: carica prima b, tanto a + b = b + a.',
      verso: { chi: 'assemblatore', testo: 'L\'{{assemblatore}} trasforma ogni istruzione nei suoi byte.' },
    },
    {
      id: 'macchina', nome: 'Codice macchina', anno: '1948',
      anteprima: rigaHex(PROGRAMMA[0].byte) + '  ' + rigaHex(PROGRAMMA[1].byte) + ' …',
      epoca: 'La «Baby» di Manchester esegue il suo primo programma · [capitolo 3](#cavi)',
      spiega: 'Diciotto {{byte}} in esadecimale. Il primo di ogni riga dice che cosa fare (8B carica, 03 somma, 89 salva: codici nati con l\'Intel 8086 del 1978), gli altri dove sono i dati.',
      verso: { chi: 'decodificatore', testo: 'L\'esadecimale serve a noi: il decodificatore della CPU vede bit.' },
    },
    {
      id: 'binario', nome: 'Binario', anno: '1703',
      anteprima: rigaBinaria(PROGRAMMA[1].byte.slice(0, 3)) + ' …',
      epoca: 'Leibniz pubblica l\'aritmetica binaria · [capitolo 2](#logica)',
      spiega: 'L\'istruzione add in base 2: 48 {{bit}}, ognuno un filo a tensione alta (1) o bassa (0). «Da qui» è la fine dell\'istruzione: 100C + 3004 = 4010, l\'indirizzo di a.',
      verso: { chi: 'ALU', testo: 'I bit decodificati dicono all\'unità aritmetica e logica (ALU) di sommare.' },
    },
    {
      id: 'porte', nome: 'Porte logiche', anno: '1937',
      anteprima: SOMMA.bitA + ' + ' + SOMMA.bitB + ' = ' + SOMMA.bitS,
      epoca: 'George Stibitz somma due bit con i relè, in cucina · [capitolo 2](#logica)',
      spiega: 'Dentro l\'ALU 2 + 3 diventa 0010 + 0011. Quattro sommatori completi, ognuno fatto di 2 porte XOR, 2 AND e 1 OR, sommano una colonna di bit a testa e si passano il riporto, come nelle addizioni in colonna.',
      fondo: 'Qui bastano 4 bit: l\'istruzione add ne somma 32 e i processori veri calcolano i riporti in anticipo, ma il principio è questo. Sotto le porte ci sono i transistor, interruttori comandati da una tensione di circa 1 volt che scattano miliardi di volte al secondo. Per scendere ancora: [porte logiche](../porte-logiche/index.html) ed [elettronica di base](../elettronica-base/index.html).',
    },
  ].map((liv, i) => Object.assign(liv, { tinta: TINTE[i] })));

  const Logica = {
    LAYOUT: LAYOUT, VALORI: VALORI, LUNGHEZZA: LUNGHEZZA, MODRM_RIP: MODRM_RIP,
    ISTRUZIONI: ISTRUZIONI, LIVELLI: LIVELLI, TINTE: TINTE, PORTE: PORTE,
    le32: le32, daLe32: daLe32, modrm: modrm, codifica: codifica, programma: programma,
    hex: hex, binario: binario, rigaHex: rigaHex, rigaBinaria: rigaBinaria, campi: campi, migliaia: migliaia,
    sommatoreCompleto: sommatoreCompleto, sommaRipple: sommaRipple, descriviPasso: descriviPasso, riepilogo: riepilogo,
  };

  /* ================= aspetto ================= */

  const css = `
    .lab-scala-radice { container: scala / inline-size; --ls-muto: #8ea59b; --f-op: var(--trace-3); --f-reg: var(--trace-4); --f-mem: var(--trace-2); }

    .lab-scala-comandi .pg-btn[aria-disabled="true"] { opacity: .42; cursor: not-allowed; }
    .lab-scala-comandi .pg-btn[aria-disabled="true"]:hover { color: var(--lab-text); border-color: var(--lab-line); }
    .lab-scala-comandi .pg-btn[aria-disabled="true"]:active { transform: none; }
    .lab-scala-auto { min-width: 16.5em; }
    .lab-scala-passi .pg-btn:focus-visible { outline-offset: -4px; }

    .lab-scala-scala {
      --ls-rail: 46px; --ls-x: 23px; --ls-y: 20px;
      position: relative; padding: 4px 0 8px;
      background: linear-gradient(180deg, color-mix(in srgb, #ff9a76 4%, transparent), transparent 38%, color-mix(in srgb, #3ee08f 6%, transparent));
    }
    .lab-scala-lista { list-style: none; margin: 0; padding: 0; }
    .lab-scala-gradino { position: relative; }
    .lab-scala-gradino + .lab-scala-gradino::before { content: ""; position: absolute; top: 0; left: var(--ls-rail); right: 14px; height: 1px; background: var(--lab-line); }
    .lab-scala-gradino--attivo {
      background: linear-gradient(90deg, color-mix(in srgb, var(--tinta) 12%, transparent), color-mix(in srgb, var(--tinta) 4%, transparent) 55%, transparent);
    }

    /* binario a sinistra: un tratto per gradino, dal suo nodo a quello sotto */
    .lab-scala-tratto, .lab-scala-luce { position: absolute; top: var(--ls-y); height: 100%; transform-origin: 50% 0; pointer-events: none; }
    .lab-scala-tratto { left: calc(var(--ls-x) - 1px); width: 2px; background: linear-gradient(var(--tinta), var(--tinta-dopo)); opacity: .3; }
    .lab-scala-luce {
      left: calc(var(--ls-x) - 1.5px); width: 3px; border-radius: 2px; transform: scaleY(0);
      background: linear-gradient(var(--tinta), var(--tinta-dopo));
      box-shadow: 0 0 9px color-mix(in srgb, var(--tinta) 65%, transparent);
    }
    .lab-scala-gradino:last-child > .lab-scala-tratto, .lab-scala-gradino:last-child > .lab-scala-luce { display: none; }
    .lab-scala-gradino:last-child.lab-scala-gradino--attivo::after {
      content: ""; position: absolute; left: calc(var(--ls-x) - 1px); top: calc(var(--ls-y) + 18px); bottom: 24px; width: 2px;
      background: repeating-linear-gradient(180deg, var(--tinta) 0 4px, transparent 4px 10px); opacity: .45;
      -webkit-mask: linear-gradient(#000, transparent); mask: linear-gradient(#000, transparent);
    }

    .lab-scala-nodo {
      position: absolute; z-index: 1; left: calc(var(--ls-x) - 13px); top: calc(var(--ls-y) - 13px);
      width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
      font: 700 13px/1 var(--mono); color: var(--tinta); background: var(--lab-bg);
      border: 2px solid color-mix(in srgb, var(--tinta) 70%, transparent);
      transition: background-color var(--pg-dur-normale) ease, color var(--pg-dur-normale) ease, box-shadow var(--pg-dur-normale) ease;
    }
    .lab-scala-nodo--percorso { background: var(--tinta); border-color: var(--tinta); color: #0b1210; }
    .lab-scala-gradino--attivo .lab-scala-nodo {
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--tinta) 24%, transparent), 0 0 18px 2px color-mix(in srgb, var(--tinta) 50%, transparent);
    }
    .lab-scala-anello { position: absolute; inset: -4px; border-radius: 50%; border: 2px solid var(--tinta); opacity: 0; pointer-events: none; }

    .lab-scala-impulso {
      position: absolute; z-index: 3; left: calc(var(--ls-x) - 7px); top: 0; width: 14px; height: 14px; border-radius: 50%;
      pointer-events: none; opacity: 0; will-change: transform, opacity;
      background: radial-gradient(circle, #fff 0 28%, var(--ls-imp, var(--trace-1)) 56%, transparent 72%);
      box-shadow: 0 0 14px 5px color-mix(in srgb, var(--ls-imp, var(--trace-1)) 55%, transparent);
    }
    .lab-scala-impulso::before {
      content: ""; position: absolute; left: 50%; bottom: 55%; width: 4px; height: 46px; border-radius: 2px;
      transform: translateX(-50%); opacity: .75; background: linear-gradient(transparent, var(--ls-imp, var(--trace-1)));
    }

    /* testata del gradino: è il bottone */
    .lab-scala-testa {
      position: relative; display: grid; grid-template-columns: minmax(0, max-content) auto minmax(0, 1fr);
      align-items: baseline; column-gap: 12px; width: 100%; min-height: 40px; margin: 0;
      padding: 9px 14px 9px var(--ls-rail); border: 0; border-radius: 0; background: none;
      color: inherit; font: inherit; text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent;
    }
    .lab-scala-testa:focus-visible { outline-offset: -3px; border-radius: 10px; }
    .lab-scala-nome { min-width: 0; font: 600 15px/22px var(--font); color: var(--lab-text); transition: color var(--pg-dur-veloce) ease; }
    .lab-scala-testa:hover .lab-scala-nome { color: var(--lab-bright); }
    .lab-scala-anno { font: 600 13px/22px var(--mono); color: var(--tinta); white-space: nowrap; font-variant-numeric: tabular-nums; }
    .lab-scala-anteprima { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 13px/22px var(--mono); color: var(--ls-muto); }
    .lab-scala-gradino--attivo .lab-scala-testa { cursor: default; padding-bottom: 2px; }
    .lab-scala-gradino--attivo .lab-scala-nome { color: var(--lab-bright); font-size: 17px; font-weight: 750; letter-spacing: -0.01em; }
    .lab-scala-gradino--attivo .lab-scala-anno {
      padding: 0 9px; border-radius: 999px; line-height: 20px;
      border: 1px solid color-mix(in srgb, var(--tinta) 55%, transparent); background: color-mix(in srgb, var(--tinta) 14%, transparent);
    }
    .lab-scala-gradino--attivo .lab-scala-anteprima { display: none; }

    /* contenuto del gradino aperto */
    .lab-scala-dettaglio { display: grid; gap: 8px; padding: 0 16px 14px var(--ls-rail); }
    .lab-scala-dettaglio[hidden] { display: none; }
    .lab-scala-dettaglio > * { min-width: 0; }
    .lab-scala-epoca { margin: 0; font: 13px/1.5 var(--mono); color: var(--ls-muto); text-wrap: pretty; }
    .lab-scala-radice a { color: var(--trace-3); text-underline-offset: 3px; }
    .lab-scala-epoca a { color: var(--tinta); font-weight: 700; white-space: nowrap; }
    .lab-scala-spiega { margin: 0; font-size: 15px; line-height: 1.6; color: var(--lab-text); max-width: 66ch; text-wrap: pretty; }
    .lab-scala-radice .pg-term { text-decoration-color: color-mix(in srgb, var(--trace-1) 70%, transparent); }
    .lab-scala-radice .pg-term:hover, .lab-scala-radice .pg-term[aria-expanded="true"] { color: var(--trace-1); }
    .lab-scala-verso { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 10px; }
    .lab-scala-verso p { flex: 1 1 250px; margin: 0; font-size: 14px; line-height: 1.55; color: var(--ls-muto); text-wrap: pretty; }
    .lab-scala-chip {
      position: relative; flex: none; display: inline-flex; gap: 6px; padding: 1px 10px; border-radius: 999px;
      font: 700 13px/20px var(--mono); color: var(--tinta-dopo);
      border: 1px solid color-mix(in srgb, var(--tinta-dopo) 45%, transparent); background: color-mix(in srgb, var(--tinta-dopo) 9%, transparent);
    }
    .lab-scala-chip::after {
      content: ""; position: absolute; inset: -1px; border-radius: inherit; opacity: 0; transition: opacity var(--pg-dur-veloce) ease;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--tinta-dopo) 30%, transparent), 0 0 18px color-mix(in srgb, var(--tinta-dopo) 65%, transparent);
    }
    .lab-scala-chip--acceso::after { opacity: 1; }
    .lab-scala-fondo { margin: 2px 0 0; padding-top: 10px; border-top: 1px dashed var(--lab-line); font-size: 14px; line-height: 1.6; color: var(--lab-text); text-wrap: pretty; }

    /* schermi d'epoca */
    .lab-scala-schermo { margin: 0; border-radius: 10px; font: 14px/1.55 var(--mono); max-width: 100%; overflow-x: auto; }
    .lab-scala-radice .lab-scala-schermo code { background: none; border: 0; padding: 0; border-radius: 0; color: inherit; font: inherit; }
    .lab-scala-op { color: var(--f-op); font-weight: 700; }
    .lab-scala-reg { color: var(--f-reg); font-weight: 700; }
    .lab-scala-mem { color: var(--f-mem); font-weight: 700; }
    .lab-scala-riga { display: flex; flex-wrap: wrap; column-gap: 2ch; margin: 0; }
    .lab-scala-istr { white-space: pre; }
    .lab-scala-nota { white-space: nowrap; }

    .lab-scala-chat {
      justify-self: start; max-width: min(100%, 430px); padding: 8px 16px;
      border-radius: 18px 18px 18px 5px; background: #1c2a33; border: 1px solid #2d3e4a;
      color: var(--lab-bright); font: 500 15.5px/1.5 var(--font);
    }
    .lab-scala-chat p { margin: 0; }

    .lab-scala-repl { padding: 8px 14px; background: #0d1117; border: 1px solid #262d37; color: #e6edf3; }
    .lab-scala-prompt { color: #7d8590; }
    .lab-scala-uscita { color: var(--trace-1); }

    .lab-scala-carta {
      justify-self: start; padding: 9px 30px; border-radius: 3px; color: #2a2418; background-color: #f3ead3;
      background-image:
        radial-gradient(circle, var(--lab-bg) 0 3px, transparent 3.6px),
        radial-gradient(circle, var(--lab-bg) 0 3px, transparent 3.6px),
        linear-gradient(90deg, #e7dcbd 0 15px, transparent 15px calc(100% - 15px), #e7dcbd calc(100% - 15px));
      background-size: 15px 16px, 15px 16px, 100% 100%;
      background-position: 0 3px, 100% 3px, 0 0;
      background-repeat: repeat-y, repeat-y, no-repeat;
      box-shadow: 0 10px 22px -16px rgba(0, 0, 0, .8);
    }
    .lab-scala-carta .lab-scala-op { color: #1d5f99; text-decoration: underline 2px; text-underline-offset: 3px; }

    .lab-scala-crt {
      position: relative; padding: 8px 14px; color: #46f08b; text-shadow: 0 0 6px rgba(70, 240, 139, .45);
      background: radial-gradient(ellipse at 50% 35%, #072512, #020b05 85%); border: 1px solid #143520;
    }
    .lab-scala-crt::after {
      content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
      background: repeating-linear-gradient(180deg, rgba(0, 0, 0, .24) 0 1px, transparent 1px 3px);
    }
    .lab-scala-crt .lab-scala-nota { color: #33b56c; }
    .lab-scala-crt .lab-scala-op { text-shadow: 0 0 7px color-mix(in srgb, var(--f-op) 55%, transparent); }
    .lab-scala-crt .lab-scala-reg { text-shadow: 0 0 7px color-mix(in srgb, var(--f-reg) 55%, transparent); }
    .lab-scala-crt .lab-scala-mem { text-shadow: 0 0 7px color-mix(in srgb, var(--f-mem) 55%, transparent); }

    .lab-scala-dump { padding: 8px 14px; color: #e4ecef; background: #0a0d0f; border: 1px solid #263038; text-shadow: 0 0 5px rgba(228, 236, 239, .22); }
    .lab-scala-dump .lab-scala-nota, .lab-scala-ind { color: #87959c; }
    .lab-scala-memoria { display: flex; flex-wrap: wrap; gap: 2px 18px; margin: 6px 0 0; padding-top: 6px; border-top: 1px dashed #2c3840; color: #c3cfd4; }
    .lab-scala-esempio { color: #87959c; font-family: var(--font); font-style: italic; }

    .lab-scala-pannello { display: grid; gap: 10px; padding: 10px 14px; background: linear-gradient(180deg, #141b1f, #0d1215); border: 1px solid #2a343a; }
    .lab-scala-byte-fila { display: flex; flex-wrap: wrap; gap: 10px 16px; }
    .lab-scala-byte { display: grid; justify-items: center; gap: 4px; }
    .lab-scala-bits { display: flex; gap: 3px; }
    .lab-scala-bit { display: grid; justify-items: center; gap: 4px; width: 14px; }
    .lab-scala-bit--stacco { margin-right: 6px; }
    .lab-scala-lampada { width: 12px; height: 12px; border-radius: 50%; background: #1d262b; box-shadow: inset 0 1px 2px rgba(0, 0, 0, .7); }
    .lab-scala-bit--1 .lab-scala-lampada { background: var(--campo); box-shadow: 0 0 8px var(--campo), inset 0 -1px 2px rgba(0, 0, 0, .3); }
    .lab-scala-cifra-bit { font: 600 13px/1 var(--mono); color: #7f958c; }
    .lab-scala-bit--1 .lab-scala-cifra-bit { color: var(--campo); }
    .lab-scala-byte-hex { font: 700 13px/1 var(--mono); color: var(--campo); padding-top: 2px; border-top: 1px solid color-mix(in srgb, var(--campo) 40%, transparent); align-self: stretch; text-align: center; }
    .lab-scala-campo--op { --campo: var(--f-op); }
    .lab-scala-campo--modrm { --campo: var(--f-reg); }
    .lab-scala-campo--spost { --campo: var(--f-mem); }
    .lab-scala-legenda { list-style: none; margin: 0; padding: 0; display: grid; gap: 5px; font: 13.5px/1.45 var(--font); color: var(--lab-text); }
    .lab-scala-legenda li { display: grid; grid-template-columns: 10px minmax(0, 1fr); column-gap: 9px; align-items: baseline; text-wrap: pretty; }
    .lab-scala-legenda li::before { content: ""; width: 10px; height: 10px; border-radius: 3px; background: var(--campo); }
    .lab-scala-legenda b { font-family: var(--mono); color: var(--campo); margin-right: 4px; }

    /* il sommatore */
    .lab-scala-sommatore { display: grid; gap: 8px; }
    .lab-scala-operandi { display: flex; flex-wrap: wrap; gap: 2px 22px; margin: 0; font: 600 14px/1.5 var(--mono); color: var(--lab-text); }
    .lab-scala-operandi b { color: var(--lab-bright); letter-spacing: .06em; }
    .lab-scala-svg { display: block; width: 100%; max-width: 470px; height: auto; }
    .lab-scala-svg text { font-family: var(--mono); text-anchor: middle; }
    .lab-scala-etic { font-size: 17.5px; font-weight: 600; fill: var(--ls-muto); }
    .lab-scala-cifra { font-size: 24px; font-weight: 800; fill: #5f726b; }
    .lab-scala-cifra--1 { fill: var(--trace-1); }
    .lab-scala-somma { opacity: 0; transform-box: fill-box; transform-origin: 50% 50%; }
    .lab-scala-sc { fill: #101a17; stroke: color-mix(in srgb, var(--f-op) 45%, #24332e); stroke-width: 2; }
    .lab-scala-sc-luce { fill: color-mix(in srgb, var(--f-op) 16%, transparent); stroke: var(--f-op); stroke-width: 2.5; opacity: 0; }
    .lab-scala-piu { font-size: 26px; font-weight: 800; fill: var(--f-op); }
    .lab-scala-filo { stroke: #2c3b36; stroke-width: 2.5; fill: none; stroke-linecap: round; }
    .lab-scala-filo-luce { stroke: var(--trace-1); stroke-width: 3; fill: none; stroke-linecap: round; opacity: 0; transition: opacity var(--pg-dur-veloce) ease; filter: drop-shadow(0 0 3px rgba(62, 224, 143, .8)); }
    .lab-scala-freccia { fill: #2c3b36; transition: fill var(--pg-dur-veloce) ease; }
    .lab-scala-freccia--1 { fill: var(--trace-1); }
    .lab-scala-rip { font-size: 22px; font-weight: 800; fill: var(--ls-muto); opacity: 0; }
    .lab-scala-rip--1 { fill: var(--trace-1); }
    .lab-scala-punto { fill: #0b1210; stroke: var(--ls-muto); stroke-width: 2.5; opacity: 0; }
    .lab-scala-punto--1 { fill: var(--trace-1); stroke: #d9ffe9; filter: drop-shadow(0 0 5px var(--trace-1)); }
    .lab-scala-passo { margin: 0; min-height: 3.2em; font-size: 14.5px; line-height: 1.6; color: var(--lab-bright); text-wrap: pretty; }
    .lab-scala-esito { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; }
    .lab-scala-risultato { margin: 0; font: 800 22px/1.2 var(--mono); color: var(--trace-1); text-shadow: 0 0 12px rgba(62, 224, 143, .35); opacity: 0; }
    .lab-scala-risultato span { margin-right: 10px; font: 700 12.5px/1 var(--font); letter-spacing: .12em; text-transform: uppercase; color: var(--ls-muto); text-shadow: none; }

    @container scala (max-width: 520px) {
      .lab-scala-scala { --ls-rail: 42px; --ls-x: 21px; --ls-y: 22px; }
      .lab-scala-auto { flex: 1 1 100%; min-width: 0; }
      .lab-scala-comandi .pg-btn { padding: 0 11px; }
      .lab-scala-testa { min-height: 44px; padding: 11px 12px 11px var(--ls-rail); column-gap: 10px; }
      .lab-scala-gradino--attivo .lab-scala-testa { padding-bottom: 4px; }
      .lab-scala-dettaglio { padding-right: 12px; }
      .lab-scala-gradino + .lab-scala-gradino::before { right: 12px; }
      .lab-scala-schermo { font-size: 13.5px; }
      .lab-scala-repl, .lab-scala-crt, .lab-scala-dump { padding: 8px 11px; }
      .lab-scala-carta { padding: 9px 26px; }
      .lab-scala-pannello { padding: 11px 10px; }
      .lab-scala-byte-fila { gap: 10px 12px; }
    }
    @container scala (max-width: 380px) {
      .lab-scala-etic { display: none; }
    }
    /* abbastanza largo perché ogni didascalia del sommatore stia su una riga */
    @container scala (min-width: 600px) {
      .lab-scala-passo { min-height: 1.6em; }
    }
  `;

  /* ================= interfaccia ================= */

  function monta(el, ctx) {
    const h = ctx.h;
    const s = ctx.s;
    const DURATA = ctx.DURATA;
    const N = LIVELLI.length;
    const ULTIMO = N - 1;
    const PAUSA = 3000;      // sosta su ogni gradino durante la discesa automatica
    const stato = { livello: 0, auto: false };
    const acceso = new Array(N).fill(0);   // quanto è illuminato il tratto sotto ogni nodo (0–1)
    let gen = 0;                           // ogni comando nuovo invalida le animazioni in corso

    const muto = (glifo) => h('span', { 'aria-hidden': 'true' }, glifo);
    const op = (t) => h('span', { class: 'lab-scala-op' }, t);
    const reg = (t) => h('span', { class: 'lab-scala-reg' }, t);
    const mem = (t) => h('span', { class: 'lab-scala-mem' }, t);

    /* ----- comandi ----- */
    const btnAuto = h('button', { type: 'button', class: 'pg-btn pg-btn--primario lab-scala-auto', onclick: discesaAutomatica });
    const btnSali = h('button', { type: 'button', class: 'pg-btn', onclick: () => vai(stato.livello - 1) }, muto('▲'), ' Sali');
    const btnScendi = h('button', { type: 'button', class: 'pg-btn', onclick: () => vai(stato.livello + 1) }, muto('▼'), ' Scendi');
    const btnDaCapo = h('button', { type: 'button', class: 'pg-btn', onclick: ricomincia }, muto('↺'), ' Ricomincia');
    const comandi = h('div', { class: 'pg-strumenti lab-scala-comandi' },
      btnAuto,
      h('div', { class: 'pg-gruppo lab-scala-passi', role: 'group', 'aria-label': 'Un livello alla volta' }, btnSali, btnScendi),
      btnDaCapo);

    /* ----- il sommatore del gradino 7 ----- */
    const sommatore = creaSommatore();

    /* ----- i sette gradini ----- */
    const gradini = LIVELLI.map(creaGradino);
    const lista = h('ol', { class: 'lab-scala-lista', 'aria-label': 'Sette livelli, dal più vicino a noi al più vicino agli elettroni' }, gradini.map((g) => g.li));
    const impulso = h('span', { class: 'lab-scala-impulso', 'aria-hidden': 'true' });
    const scala = h('div', { class: 'lab-scala-scala' }, lista, impulso);
    el.append(h('div', { class: 'lab-scala-radice' }, comandi, scala));

    lista.addEventListener('keydown', (e) => {
      const i = gradini.findIndex((g) => g.btn === e.target);
      if (i < 0) return;
      let dest = null;
      if (e.key === 'ArrowDown') dest = i + 1;
      else if (e.key === 'ArrowUp') dest = i - 1;
      else if (e.key === 'Home') dest = 0;
      else if (e.key === 'End') dest = ULTIMO;
      if (dest == null) return;
      e.preventDefault();
      if (dest < 0 || dest > ULTIMO) return;
      vai(dest, { fuoco: true });
    });

    aggiornaAuto();
    aggiornaControlli();
    sommatore.azzera();
    assesta();

    function creaGradino(liv, i) {
      const idDet = ctx.uid('lab-scala-det');
      const anello = h('span', { class: 'lab-scala-anello' });
      const nodo = h('span', { class: 'lab-scala-nodo', 'aria-hidden': 'true' }, anello, String(i + 1));
      const btn = h('button', {
        type: 'button', class: 'lab-scala-testa', tabindex: '-1',
        'aria-expanded': 'false', 'aria-controls': idDet,
        'aria-label': 'Livello ' + (i + 1) + ' di ' + N + ': ' + liv.nome + ', ' + liv.anno,
        onclick: () => vai(i),
      },
      nodo,
      h('span', { class: 'lab-scala-nome' }, liv.nome),
      h('span', { class: 'lab-scala-anno' }, liv.anno),
      h('span', { class: 'lab-scala-anteprima' }, liv.anteprima));

      let chip = null;
      const parti = [
        h('p', { class: 'lab-scala-epoca' }, ctx.inline(liv.epoca)),
        schermo(liv.id),
        h('p', { class: 'lab-scala-spiega' }, ctx.inline(liv.spiega)),
      ];
      if (liv.verso) {
        chip = h('span', { class: 'lab-scala-chip' }, muto('↓'), liv.verso.chi);
        parti.push(h('div', { class: 'lab-scala-verso' },
          h('span', { class: 'pg-sr' }, 'Verso il livello ' + (i + 2) + ': '),
          chip,
          h('p', null, ctx.inline(liv.verso.testo))));
      }
      if (liv.fondo) parti.push(h('p', { class: 'lab-scala-fondo' }, ctx.inline(liv.fondo)));
      const det = h('div', { class: 'lab-scala-dettaglio', id: idDet, hidden: true }, parti);

      const tratto = h('span', { class: 'lab-scala-tratto', 'aria-hidden': 'true' });
      const luce = h('span', { class: 'lab-scala-luce', 'aria-hidden': 'true' });
      const dopo = LIVELLI[i + 1] || liv;
      const li = h('li', { class: 'lab-scala-gradino', style: '--tinta:' + liv.tinta + ';--tinta-dopo:' + dopo.tinta }, tratto, luce, btn, det);
      return { li: li, btn: btn, det: det, nodo: nodo, anello: anello, tratto: tratto, luce: luce, chip: chip };
    }

    /* ----- uno schermo per epoca ----- */
    function schermo(id) {
      if (id === 'naturale') {
        return h('div', { class: 'lab-scala-schermo lab-scala-chat' }, h('p', null, op('Somma'), ' a e b e metti il risultato in x.'));
      }
      if (id === 'python') {
        const p = () => h('span', { class: 'lab-scala-prompt' }, '>>> ');
        return h('pre', { class: 'lab-scala-schermo lab-scala-repl' }, h('code', null,
          p(), 'a, b = 2, 3\n', p(), 'x = a ', op('+'), ' b\n', p(), 'x\n', h('span', { class: 'lab-scala-uscita' }, '5')));
      }
      if (id === 'c') {
        return h('pre', { class: 'lab-scala-schermo lab-scala-carta' }, h('code', null,
          'int a = 2, b = 3, x;\nvoid somma(void) { x = a ', op('+'), ' b; }'));
      }
      if (id === 'assembly') {
        return h('div', { class: 'lab-scala-schermo lab-scala-crt' }, PROGRAMMA.map((r) => h('p', { class: 'lab-scala-riga' },
          h('code', { class: 'lab-scala-istr' }, r.codiceOp === 0x03
            ? [op(r.mnemonico.padEnd(5)), reg('eax'), ', ', mem('DWORD PTR a[rip]')]
            : r.mnemonico.padEnd(5) + r.operandi),
          h('span', { class: 'lab-scala-nota' }, '; ' + r.nota))));
      }
      if (id === 'macchina') {
        return h('div', { class: 'lab-scala-schermo lab-scala-dump' },
          PROGRAMMA.map((r) => h('p', { class: 'lab-scala-riga' },
            h('code', { class: 'lab-scala-istr' },
              h('span', { class: 'lab-scala-ind' }, hex(r.indirizzo, 4) + '  '),
              r.codiceOp === 0x03 ? [op(hex(r.byte[0])), ' ', reg(hex(r.byte[1])), ' ', mem(rigaHex(r.byte.slice(2)))] : rigaHex(r.byte)),
            h('span', { class: 'lab-scala-nota' }, r.breve))),
          h('p', { class: 'lab-scala-memoria' },
            ['a', 'b', 'x'].map((v) => h('span', null, h('span', { class: 'lab-scala-ind' }, hex(LAYOUT[v], 4)), ' ' + v + (VALORI[v] != null ? ' = ' + VALORI[v] : ''))),
            h('span', { class: 'lab-scala-esempio' }, 'indirizzi di esempio')));
      }
      if (id === 'binario') return pannelloBit();
      if (id === 'porte') return sommatore.el;
      return h('div');
    }

    function pannelloBit() {
      const add = PROGRAMMA[1];
      const mr = modrm(add.byte[1]);
      const gruppi = campi(add.byte).map((c) => h('div', { class: 'lab-scala-byte lab-scala-campo--' + c.campo },
        h('span', { class: 'lab-scala-bits' }, c.bit.split('').map((b, k) => h('span', {
          class: 'lab-scala-bit' + (b === '1' ? ' lab-scala-bit--1' : '') + (c.campo === 'modrm' && (k === 1 || k === 4) ? ' lab-scala-bit--stacco' : ''),
        }, h('span', { class: 'lab-scala-lampada' }), h('span', { class: 'lab-scala-cifra-bit' }, b)))),
        h('span', { class: 'lab-scala-byte-hex' }, c.hex)));
      return h('div', { class: 'lab-scala-schermo lab-scala-pannello' },
        h('p', { class: 'pg-sr' }, 'In binario: ' + rigaBinaria(add.byte) + '.'),
        h('div', { class: 'lab-scala-byte-fila', 'aria-hidden': 'true' }, gruppi),
        h('ul', { class: 'lab-scala-legenda' },
          h('li', { class: 'lab-scala-campo--op' }, h('span', null, h('b', null, hex(add.byte[0])), 'codice operativo: ADD, «somma a un registro un dato in memoria»')),
          h('li', { class: 'lab-scala-campo--modrm' }, h('span', null, h('b', null, hex(add.byte[1])),
            'ModRM: reg ' + binario(mr.reg, 3) + ' = EAX; mod ' + binario(mr.mod, 2) + ' e r/m ' + binario(mr.rm, 3) + ' = «in memoria, a N byte da qui»')),
          h('li', { class: 'lab-scala-campo--spost' }, h('span', null, h('b', null, rigaHex(add.byte.slice(2))),
            'spostamento: N = 0x' + hex(add.spostamento, 4) + ' = ' + migliaia(add.spostamento) + ' byte, dal byte meno significativo'))));
    }

    /* ----- sommatore a propagazione del riporto (SVG) ----- */
    function creaSommatore() {
      const cx = (bit) => 356 - 92 * bit;   // bit 3 a sinistra, bit 0 a destra, come si scrivono i numeri
      const Y = 117;                        // quota dei fili del riporto
      const idT = ctx.uid('lab-scala-svg');
      const fili = s('g');
      const scatole = s('g');
      const testi = s('g');
      const filo = (x1, y1, x2, y2) => {
        const f = { base: s('line', { x1: x1, y1: y1, x2: x2, y2: y2, class: 'lab-scala-filo' }), luce: s('line', { x1: x1, y1: y1, x2: x2, y2: y2, class: 'lab-scala-filo-luce' }) };
        fili.append(f.base, f.luce);
        return f;
      };
      const cifra = (x, y, v, extra) => s('text', { x: x, y: y, class: 'lab-scala-cifra' + (v ? ' lab-scala-cifra--1' : '') + (extra ? ' ' + extra : '') }, String(v));
      const etic = (x, y, t) => s('text', { x: x, y: y, class: 'lab-scala-etic' }, t);

      const colonne = SOMMA.passi.map((p) => {
        const x = cx(p.bit);
        const fa = filo(x - 14, 62, x - 14, 92);
        const fb = filo(x + 14, 62, x + 14, 92);
        const fs = filo(x, 142, x, 168);
        const scatolaLuce = s('rect', { x: x - 30, y: 92, width: 60, height: 50, rx: 9, class: 'lab-scala-sc-luce' });
        scatole.append(s('rect', { x: x - 30, y: 92, width: 60, height: 50, rx: 9, class: 'lab-scala-sc' }), scatolaLuce, s('text', { x: x, y: 126, class: 'lab-scala-piu' }, '+'));
        const somma = cifra(x, 196, p.s, 'lab-scala-somma');
        testi.append(etic(x - 14, 20, 'a' + p.bit), etic(x + 14, 20, 'b' + p.bit), cifra(x - 14, 52, p.a), cifra(x + 14, 52, p.b), somma, etic(x, 228, 's' + p.bit));
        return { p: p, fa: fa, fb: fb, fs: fs, scatolaLuce: scatolaLuce, somma: somma };
      });
      const riporti = SOMMA.riporti.map((v, k) => {
        const x1 = k === 0 ? 428 : cx(k - 1) - 30;
        const x2 = k === 4 ? 12 : cx(k) + 30;
        const f = filo(x1, Y, x2 + 6, Y);
        const punta = s('path', { d: 'M' + x2 + ' ' + Y + 'l8 -5.5v11z', class: 'lab-scala-freccia' });
        fili.append(punta);
        const val = s('text', { x: (x1 + x2) / 2, y: 106, class: 'lab-scala-rip' + (v ? ' lab-scala-rip--1' : '') }, String(v));
        testi.append(val);
        return { v: v, x1: x1, x2: x2, f: f, punta: punta, val: val };
      });
      const punto = s('circle', { cx: 0, cy: Y, r: 7, class: 'lab-scala-punto' });
      const svg = s('svg', { viewBox: '0 0 440 236', class: 'lab-scala-svg', role: 'img', 'aria-labelledby': idT },
        s('title', { id: idT }, 'Sommatore a 4 bit: quattro sommatori completi in fila calcolano ' + SOMMA.bitA + ' + ' + SOMMA.bitB + ' = ' + SOMMA.bitS + '; il riporto passa da destra a sinistra.'),
        fili, scatole, testi, punto);

      const didascalia = h('p', { class: 'lab-scala-passo' });
      const risultato = h('p', { class: 'lab-scala-risultato' }, h('span', null, 'risultato'), SOMMA.bitS + ' = ' + SOMMA.somma);
      const elSomma = h('div', { class: 'lab-scala-sommatore' },
        h('p', { class: 'lab-scala-operandi' },
          h('span', null, 'a = ' + SOMMA.a + ' = ', h('b', null, SOMMA.bitA)),
          h('span', null, 'b = ' + SOMMA.b + ' = ', h('b', null, SOMMA.bitB))),
        svg,
        didascalia,
        h('div', { class: 'lab-scala-esito' },
          risultato,
          h('button', { type: 'button', class: 'pg-btn', onclick: rivediSomma }, muto('↻'), ' Rivedi la somma')));

      let completo = false;
      const luce = (f, on) => { f.luce.style.opacity = on ? '1' : '0'; };
      const mostraRiporto = (r, on) => {
        r.val.style.opacity = on ? '1' : '0';
        luce(r.f, on && r.v);
        r.punta.classList.toggle('lab-scala-freccia--1', !!(on && r.v));
      };

      function azzera() {
        completo = false;
        colonne.forEach((c) => {
          luce(c.fa, false); luce(c.fb, false); luce(c.fs, false);
          c.scatolaLuce.style.opacity = '0';
          c.somma.style.opacity = '0';
          c.somma.style.transform = '';
        });
        riporti.forEach((r, k) => mostraRiporto(r, k === 0));
        punto.style.opacity = '0';
        risultato.style.opacity = '0';
        risultato.style.transform = '';
        didascalia.textContent = 'Il riporto entra da destra e all\'inizio vale 0.';
      }

      function finale() {
        colonne.forEach((c) => {
          luce(c.fa, c.p.a); luce(c.fb, c.p.b); luce(c.fs, c.p.s);
          c.scatolaLuce.style.opacity = '.35';
          c.somma.style.opacity = '1';
          c.somma.style.transform = '';
        });
        riporti.forEach((r) => mostraRiporto(r, true));
        punto.style.opacity = '0';
        risultato.style.opacity = '1';
        risultato.style.transform = '';
        didascalia.textContent = riepilogo(SOMMA);
        completo = true;
      }

      // Il riporto viaggia da destra a sinistra; con il movimento ridotto gli stati cambiano senza spostamenti.
      async function anima(g) {
        const fermo = ctx.riduci;
        azzera();
        await ctx.attendi(fermo ? 700 : 400);
        if (g !== gen) return;
        for (let k = 0; k < riporti.length; k++) {
          const r = riporti[k];
          if (!fermo) {
            punto.classList.toggle('lab-scala-punto--1', !!r.v);
            await ctx.anima({
              durata: 380, easing: 'sharp',
              aggiorna: (t) => {
                punto.style.opacity = String(Math.min(1, t * 6));
                punto.style.transform = 'translate(' + (r.x1 + (r.x2 - r.x1) * t).toFixed(1) + 'px,0)';
              },
            });
            if (g !== gen) return;
            punto.style.opacity = '0';
          }
          mostraRiporto(r, true);
          if (k === colonne.length) break;
          const c = colonne[k];
          didascalia.textContent = descriviPasso(c.p, SOMMA.n);
          luce(c.fa, c.p.a); luce(c.fb, c.p.b);
          await ctx.anima({ durata: DURATA.veloce, aggiorna: (t) => { c.scatolaLuce.style.opacity = t.toFixed(3); } });
          if (g !== gen) return;
          await ctx.anima({
            durata: 260, easing: 'bounce',
            aggiorna: (t) => {
              c.somma.style.opacity = String(Math.min(1, t * 1.6));
              c.somma.style.transform = 'scale(' + (0.55 + 0.45 * t).toFixed(3) + ')';
            },
          });
          if (g !== gen) return;
          luce(c.fs, c.p.s);
          await ctx.attendi((fermo ? 1300 : 700) + (c.p.cout ? 700 : 0));
          if (g !== gen) return;
          c.scatolaLuce.style.opacity = '.35';
        }
        await ctx.anima({
          durata: DURATA.normale,
          aggiorna: (t) => {
            risultato.style.opacity = t.toFixed(3);
            risultato.style.transform = 'translateY(' + (6 * (1 - t)).toFixed(2) + 'px)';
          },
        });
        if (g !== gen) return;
        finale();
        ctx.annuncia('Somma completata. ' + riepilogo(SOMMA));
      }

      return { el: elSomma, azzera: azzera, finale: finale, anima: anima, get completo() { return completo; } };
    }

    /* ----- stato e disegno ----- */

    function impostaAperto(a) {
      gradini.forEach((g, i) => {
        const aperto = i === a;
        g.li.classList.toggle('lab-scala-gradino--attivo', aperto);
        g.det.hidden = !aperto;
        g.btn.setAttribute('aria-expanded', aperto ? 'true' : 'false');
        g.nodo.classList.toggle('lab-scala-nodo--percorso', i <= a);
      });
    }

    // Porta subito il disegno allo stato logico: nessuna trasformazione a metà.
    function assesta(opz) {
      const a = stato.livello;
      impostaAperto(a);
      impulso.style.opacity = '0';
      impulso.style.transform = '';
      gradini.forEach((g, i) => {
        g.li.style.transform = '';
        g.det.style.opacity = '';
        g.det.style.transform = '';
        g.tratto.style.transform = '';
        acceso[i] = i < a ? 1 : 0;
        g.luce.style.transform = 'scaleY(' + acceso[i] + ')';
        g.anello.style.opacity = '0';
        g.anello.style.transform = '';
        if (g.chip) g.chip.classList.remove('lab-scala-chip--acceso');
      });
      if (!(opz && opz.lasciaSomma) && a === ULTIMO && !sommatore.completo) sommatore.finale();
    }

    function aggiornaControlli() {
      const a = stato.livello;
      gradini.forEach((g, i) => {
        if (i === a) g.btn.setAttribute('aria-current', 'step'); else g.btn.removeAttribute('aria-current');
        g.btn.tabIndex = i === a ? 0 : -1;
      });
      spento(btnSali, a === 0);
      spento(btnScendi, a === ULTIMO);
    }
    function spento(btn, si) {
      if (si) btn.setAttribute('aria-disabled', 'true'); else btn.removeAttribute('aria-disabled');
    }
    function aggiornaAuto() {
      btnAuto.replaceChildren(muto(stato.auto ? '■' : '▶'), stato.auto ? ' Ferma la discesa' : ' Scendi fino agli elettroni');
    }

    function errore(err) { if (!ctx.annullato(err)) console.error(err); }

    // Ferma tutto ciò che si sta muovendo e restituisce il numero del nuovo comando.
    function interrompi() {
      gen += 1;
      ctx.annulla();
      if (stato.auto) { stato.auto = false; aggiornaAuto(); }
      assesta();
      return gen;
    }

    function vai(dest, opz) {
      if (dest < 0 || dest > ULTIMO) return;
      if (dest === stato.livello && !stato.auto) {
        if (opz && opz.fuoco) gradini[dest].btn.focus();
        return;
      }
      const g = interrompi();
      transizione(g, dest, opz || {}).catch(errore);
    }

    async function transizione(g, dest, opz) {
      const da = stato.livello;
      if (dest === da) return;
      stato.livello = dest;
      aggiornaControlli();
      if (opz.fuoco) gradini[dest].btn.focus({ preventScroll: true });
      const liv = LIVELLI[dest];
      ctx.annuncia('Livello ' + (dest + 1) + ' di ' + N + ': ' + liv.nome + ', ' + liv.anno + '.');
      if (dest === ULTIMO) { ctx.completa(); sommatore.azzera(); }
      if (ctx.riduci) {
        assesta();
        if (opz.mostra) mostra(gradini[dest].li);
        return;
      }
      if (dest > da) await discesa(g, da, dest); else await salita(g, da, dest);
      if (g !== gen) return;
      assesta({ lasciaSomma: true });
      if (opz.mostra) mostra(gradini[dest].li);
      if (dest === ULTIMO) await sommatore.anima(g);
    }

    // Centro del nodo rispetto alla cima del gradino: lo stesso valore di --ls-y nel CSS.
    function quotaNodo() { return parseFloat(getComputedStyle(scala).getPropertyValue('--ls-y')) || 20; }
    function yNodo(i, q) { return gradini[i].li.offsetTop + (q == null ? quotaNodo() : q); }
    function centroY(nodoDom) {
      return nodoDom.getBoundingClientRect().top - scala.getBoundingClientRect().top + nodoDom.offsetHeight / 2;
    }

    // Scendendo, l'impulso corre lungo il binario, accende il traduttore e i nodi che attraversa.
    async function discesa(g, da, a) {
      const q = quotaNodo();
      const quote = [];
      for (let i = da; i <= a; i++) quote.push(yNodo(i, q));
      const y0 = quote[0];
      const y1 = quote[quote.length - 1];
      const chip = gradini[da].chip;
      const yChip = chip ? centroY(chip) : Infinity;
      impulso.style.setProperty('--ls-imp', LIVELLI[a].tinta);
      const durata = Math.round(Math.min(DURATA.narrativa, Math.max(DURATA.normale + 100, (y1 - y0) * 1.9)));
      await ctx.anima({
        durata: durata, easing: 'sharp',
        aggiorna: (t) => {
          const y = y0 + (y1 - y0) * t;
          impulso.style.transform = 'translateY(' + (y - 7).toFixed(1) + 'px)';
          impulso.style.opacity = String(Math.min(1, t * 8));
          for (let i = da; i < a; i++) {
            const ya = quote[i - da];
            const yb = quote[i - da + 1];
            const f = Math.max(0, Math.min(1, (y - ya) / (yb - ya)));
            acceso[i] = f;
            gradini[i].luce.style.transform = 'scaleY(' + f.toFixed(4) + ')';
          }
          for (let j = da + 1; j <= a; j++) gradini[j].nodo.classList.toggle('lab-scala-nodo--percorso', y >= quote[j - da] - 1);
          if (chip) chip.classList.toggle('lab-scala-chip--acceso', y >= yChip - 10);
        },
      });
      if (g !== gen) return;
      const arrivo = gradini[a];
      const anello = ctx.anima({
        durata: DURATA.lenta, easing: 'smooth',
        aggiorna: (t) => {
          arrivo.anello.style.opacity = (0.9 * (1 - t)).toFixed(3);
          arrivo.anello.style.transform = 'scale(' + (1 + 1.2 * t).toFixed(3) + ')';
          impulso.style.opacity = (1 - Math.min(1, t * 2.5)).toFixed(3);
        },
      }).catch(errore);
      await ctx.anima({ durata: DURATA.veloce, easing: 'sharp', aggiorna: (t) => { gradini[da].det.style.opacity = (1 - t).toFixed(3); } });
      if (g !== gen) return;
      if (chip) chip.classList.remove('lab-scala-chip--acceso');
      await scambia(a);
      await anello;
    }

    async function salita(g, da, a) {
      await ctx.anima({ durata: DURATA.veloce, easing: 'sharp', aggiorna: (t) => { gradini[da].det.style.opacity = (1 - t).toFixed(3); } });
      if (g !== gen) return;
      await scambia(a);
    }

    // Apre il gradino a e fa scivolare gli altri dal vecchio posto al nuovo (FLIP), binario compreso.
    async function scambia(a) {
      const prima = gradini.map((x) => x.li.offsetTop);
      impostaAperto(a);
      const det = gradini[a].det;
      det.style.opacity = '0';
      const dopo = gradini.map((x) => x.li.offsetTop);
      const alt = gradini.map((x) => x.li.offsetHeight);
      const delta = prima.map((p, i) => p - dopo[i]);
      const da = acceso.slice();
      const verso = gradini.map((_, i) => (i < a ? 1 : 0));
      await ctx.anima({
        durata: DURATA.normale + 70, easing: 'smooth',
        aggiorna: (t) => {
          const r = 1 - t;
          for (let i = 0; i < N; i++) {
            const x = gradini[i];
            x.li.style.transform = delta[i] ? 'translateY(' + (delta[i] * r).toFixed(2) + 'px)' : '';
            if (i < ULTIMO) {
              const k = Math.max(0, (alt[i] + (delta[i + 1] - delta[i]) * r) / alt[i]);
              acceso[i] = da[i] + (verso[i] - da[i]) * t;
              x.tratto.style.transform = 'scaleY(' + k.toFixed(4) + ')';
              x.luce.style.transform = 'scaleY(' + (k * acceso[i]).toFixed(4) + ')';
            }
          }
          det.style.opacity = t.toFixed(3);
          det.style.transform = 'translateY(' + (10 * r).toFixed(2) + 'px)';
        },
      });
    }

    // Durante la discesa automatica tiene in vista il gradino aperto.
    function mostra(nodoDom) {
      const r = nodoDom.getBoundingClientRect();
      const cima = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pg-top')) || 58) + 12;
      const fondo = window.innerHeight - 24;
      if (r.top >= cima && r.top + Math.min(r.height, fondo - cima) <= fondo) return;
      window.scrollBy({ top: r.top - cima - 8, behavior: ctx.riduci ? 'auto' : 'smooth' });
    }

    async function discesaAutomatica() {
      if (stato.auto) {
        interrompi();
        ctx.annuncia('Discesa fermata al livello ' + (stato.livello + 1) + '.');
        return;
      }
      const g = interrompi();
      stato.auto = true;
      aggiornaAuto();
      try {
        if (stato.livello === ULTIMO) {
          await transizione(g, 0, { mostra: true });
          if (g !== gen) return;
          await ctx.attendi(DURATA.lenta);
        }
        while (g === gen && stato.livello < ULTIMO) {
          await transizione(g, stato.livello + 1, { mostra: true });
          if (g !== gen) return;
          if (stato.livello < ULTIMO) await ctx.attendi(PAUSA);
        }
      } catch (err) {
        errore(err);
      } finally {
        if (g === gen && stato.auto) { stato.auto = false; aggiornaAuto(); }
      }
    }

    function ricomincia() {
      if (stato.livello === 0 && !stato.auto) {
        ctx.annuncia('Sei già in cima: livello 1, linguaggio naturale.');
        return;
      }
      const g = interrompi();
      transizione(g, 0, {}).catch(errore);
    }

    function rivediSomma() {
      if (stato.livello !== ULTIMO) return;
      const g = interrompi();
      sommatore.anima(g).catch(errore);
    }

    return {};
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('scala', { titolo: 'La scala dell\'astrazione', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
