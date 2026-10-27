/*
 * Capitolo 1 · Un chip, mille programmi: logica pura del laboratorio «Stesso hardware, programmi diversi».
 * Nessun accesso al DOM: la usano js/idea.js (nel browser) e test/idea.test.js (con node --test).
 *
 * - un piccolo insieme di istruzioni didattiche da 8 bit: 4 bit di codice operativo e 4 di dato, come nel 4004;
 * - quattro programmi da 16 righe: calcolatrice, semaforo, insegna scorrevole, dado elettronico;
 * - la macchina: esegue un passo alla volta i byte della ROM (step) e dice che cosa ha fatto;
 * - il display: una matrice di LED bicolore da 29 × 7 punti (frame), con caratteri da 5 × 7;
 * - la logica cablata: per ogni funzione un circuito diverso di porte e flip-flop (wired), con fili e chip contati.
 */
(function (root) {
  'use strict';

  const ROWS = 16;      // righe della ROM mostrate nel laboratorio (una 4001 vera ne ha 256)
  const COLS = 29;      // colonne del display: 5 caratteri larghi 5 punti, con 1 colonna vuota tra l'uno e l'altro
  const LINES = 7;      // righe del display
  const RAM_CELLS = 4;  // celle da 4 bit della RAM mostrate
  const WAIT_UNIT = 5;  // passi di macchina per ogni «tempo» dell'istruzione ASP
  const OFF = 0, RED = 1, AMBER = 2, GREEN = 3;

  /* ---------- istruzioni ---------- */

  const OPS = {
    NOP: { code: 0x0, arg: false, name: 'riga vuota: nessuna operazione' },
    TXT: { code: 0x1, arg: true, name: 'manda al display il testo che parte dalla riga n' },
    SCO: { code: 0x2, arg: false, name: "fa scorrere l'insegna di una colonna" },
    LEG: { code: 0x3, arg: true, name: "legge la cifra scritta nella riga n e la mette nell'accumulatore" },
    SOM: { code: 0x4, arg: true, name: 'somma la cifra della riga n, in decimale e con il riporto' },
    SCR: { code: 0x5, arg: true, name: "scrive l'accumulatore nella cella n della RAM" },
    VIS: { code: 0x6, arg: false, name: 'manda al display il numero scritto nella RAM' },
    LUC: { code: 0x7, arg: true, name: 'accende la luce n del semaforo (1 rossa, 2 gialla, 3 verde)' },
    ASP: { code: 0x8, arg: true, name: 'aspetta n tempi' },
    CON: { code: 0x9, arg: true, name: 'conta: aggiunge 1 e, dopo n, torna a 1' },
    DAD: { code: 0xA, arg: false, name: "manda al display la faccia del dado che vale quanto l'accumulatore" },
    ATT: { code: 0xB, arg: false, name: 'aspetta che premi il tasto' },
    TAS: { code: 0xC, arg: true, name: 'se hai premuto il tasto salta alla riga n, altrimenti prosegue' },
    SAL: { code: 0xD, arg: true, name: 'salta alla riga n' },
  };
  const BY_CODE = [];
  Object.keys(OPS).forEach((k) => { BY_CODE[OPS[k].code] = k; });

  const hex1 = (n) => (n & 15).toString(16).toUpperCase();
  const hex2 = (n) => (n & 255).toString(16).toUpperCase().padStart(2, '0');
  const LAMP_NAMES = ['nessuna', 'rossa', 'gialla', 'verde'];

  /* ---------- i quattro programmi ---------- */

  // Ogni riga: [sigla, n] per un'istruzione, ['DATO', carattere] per un dato. Le righe mancanti restano vuote (00).
  const PROGRAMS = {
    calcolatrice: {
      id: 'calcolatrice', name: 'Calcolatrice', key: '«=»', keyLong: 'il tasto «=»',
      what: 'mostra 27+15 e, quando premi «=», somma cifra per cifra, in decimale, come la 141-PF di Busicom',
      rows: [
        ['TXT', 0xB], ['ATT'], ['LEG', 0xC], ['SOM', 0xF], ['SCR', 3], ['LEG', 0xB], ['SOM', 0xE], ['SCR', 2],
        ['VIS'], ['ATT'], ['SAL', 0],
        ['DATO', '2'], ['DATO', '7'], ['DATO', '+'], ['DATO', '1'], ['DATO', '5'],
      ],
    },
    semaforo: {
      id: 'semaforo', name: 'Semaforo', key: 'pedoni', keyLong: 'la chiamata dei pedoni',
      what: 'alterna rosso, verde e giallo; se premi il tasto durante il verde, il verde dura meno',
      rows: [['LUC', 1], ['ASP', 9], ['LUC', 3], ['ASP', 5], ['TAS', 6], ['ASP', 5], ['LUC', 2], ['ASP', 3], ['SAL', 0]],
    },
    insegna: {
      id: 'insegna', name: 'Insegna', key: 'pausa', keyLong: 'la pausa',
      what: "fa scorrere la scritta BUSICOM, presa dalle righe 6–D della ROM; il tasto la ferma e la fa ripartire",
      rows: [
        ['TXT', 6], ['SCO'], ['TAS', 4], ['SAL', 1], ['ATT'], ['SAL', 1],
        ['DATO', 'B'], ['DATO', 'U'], ['DATO', 'S'], ['DATO', 'I'], ['DATO', 'C'], ['DATO', 'O'], ['DATO', 'M'], ['DATO', ' '],
      ],
    },
    dado: {
      id: 'dado', name: 'Dado', key: 'lancia', keyLong: 'il lancio',
      what: 'conta velocissimo da 1 a 6 e, quando premi il tasto, mostra il numero a cui era arrivato',
      rows: [['CON', 6], ['TAS', 3], ['SAL', 0], ['DAD'], ['SAL', 0]],
    },
  };
  const ORDER = ['calcolatrice', 'semaforo', 'insegna', 'dado'];

  function charName(ch) { return ch === ' ' ? 'spazio' : '«' + ch + '»'; }

  /** Traduce un programma in 16 byte e descrive ogni riga (sigla breve per il palco, frase per la spiegazione). */
  function assemble(id) {
    const p = PROGRAMS[id];
    if (!p) throw new Error('Programma sconosciuto: ' + id);
    const bytes = new Array(ROWS).fill(0);
    const rows = [];
    for (let r = 0; r < ROWS; r++) {
      const src = p.rows[r];
      if (!src) { rows.push({ kind: 'empty', byte: 0, label: '—', text: 'riga vuota' }); continue; }
      if (src[0] === 'DATO') {
        const v = typeof src[1] === 'string' ? src[1].charCodeAt(0) : src[1];
        bytes[r] = v & 255;
        rows.push({
          kind: 'data', byte: bytes[r], char: typeof src[1] === 'string' ? src[1] : null,
          label: typeof src[1] === 'string' ? 'dato ' + charName(src[1]) : 'dato ' + hex2(v),
          text: typeof src[1] === 'string' ? 'un dato, non un\'istruzione: il carattere ' + charName(src[1]) + ', codice ' + hex2(v) : 'un dato: ' + hex2(v),
        });
        continue;
      }
      const op = OPS[src[0]];
      if (!op) throw new Error('Istruzione sconosciuta: ' + src[0]);
      const n = op.arg ? (src[1] & 15) : 0;
      bytes[r] = (op.code << 4) | n;
      rows.push({
        kind: 'code', byte: bytes[r], op: src[0], n: n,
        label: src[0] + (op.arg ? ' ' + hex1(n) : ''),
        text: op.name.replace('riga n', 'riga ' + hex1(n)).replace('cella n', 'cella ' + n).replace(/\bn tempi\b/, n + ' tempi').replace('dopo n', 'dopo ' + n).replace('luce n', 'luce ' + n),
      });
    }
    return { id: id, bytes: bytes, rows: rows };
  }

  /** Quanti bit cambiano passando dalla ROM a alla ROM b. */
  function bitDiff(a, b) {
    let d = 0;
    for (let r = 0; r < ROWS; r++) {
      let x = ((a[r] || 0) ^ (b[r] || 0)) & 255;
      while (x) { d += x & 1; x >>= 1; }
    }
    return d;
  }

  /* ---------- la macchina ---------- */

  function createMachine() {
    return { pc: 0, a: 0, c: 0, ram: new Array(RAM_CELLS).fill(0), key: false, wait: 0, out: { mode: 'off' }, ticks: 0, steps: 0 };
  }

  /** Testo scritto nella ROM a partire dalla riga start, fino a un byte 00 o alla fine. */
  function readText(rom, start) {
    let t = '';
    for (let r = start; r < ROWS; r++) {
      const b = rom[r] & 255;
      if (b === 0) break;
      t += (b >= 32 && b < 127) ? String.fromCharCode(b) : '?';
    }
    return t;
  }

  /**
   * Un passo di macchina: se sta aspettando consuma un tempo, altrimenti legge la riga indicata dal contatore
   * di programma (PC) e la esegue. Modifica m e restituisce un evento che dice che cosa è successo.
   */
  function step(m, rom) {
    m.ticks++;
    if (m.wait > 0) {
      m.wait--;
      const ev = { type: 'wait', pc: m.pc, left: m.wait, done: m.wait === 0 };
      if (m.wait === 0) m.pc = (m.pc + 1) % ROWS;
      return ev;
    }
    const pc = m.pc;
    const byte = rom[pc] & 255;
    const n = byte & 15;
    const op = BY_CODE[byte >> 4] || 'NOP';
    const ev = { type: 'exec', pc: pc, byte: byte, op: op, n: n, next: 0, reads: null, ram: null, out: false, key: null, a0: m.a, c0: m.c };
    let next = (pc + 1) % ROWS;
    switch (op) {
      case 'TXT': m.out = { mode: 'text', start: n, offset: 0 }; ev.out = true; ev.reads = n; break;
      case 'SCO':
        if (m.out.mode === 'text') { m.out = { mode: 'text', start: m.out.start, offset: m.out.offset + 1 }; ev.out = true; }
        break;
      case 'LEG': m.a = rom[n] & 15; ev.reads = n; break;
      case 'SOM': {
        const d = rom[n] & 15;
        const v = m.a + d + m.c;
        m.a = v % 10;
        m.c = v >= 10 ? 1 : 0;
        ev.reads = n; ev.d = d; ev.sum = v;
        break;
      }
      case 'SCR': ev.ram = n % RAM_CELLS; m.ram[ev.ram] = m.a; break;
      case 'VIS': m.out = { mode: 'num', digits: m.ram.slice() }; ev.out = true; break;
      case 'LUC': m.out = { mode: 'lamp', lit: n }; ev.out = true; break;
      case 'ASP': if (n > 0) { m.wait = n * WAIT_UNIT; next = pc; } break;
      case 'CON': { let v = m.a + 1; if (v > n || v < 1) v = 1; m.a = v & 15; break; }
      case 'DAD': m.out = { mode: 'dice', face: m.a }; ev.out = true; break;
      case 'ATT':
        if (m.key) { m.key = false; ev.key = 'used'; } else { next = pc; ev.key = 'waiting'; }
        break;
      case 'TAS':
        if (m.key) { m.key = false; ev.key = 'used'; next = n; } else ev.key = 'none';
        break;
      case 'SAL': next = n; break;
      default: break;
    }
    m.pc = next;
    m.steps++;
    ev.next = next;
    ev.jump = op === 'SAL' || (op === 'TAS' && ev.key === 'used');
    return ev;
  }

  /** Frase che racconta un evento della macchina (per il pannello di spiegazione). */
  function explain(ev, m, rom) {
    const row = 'Riga ' + hex1(ev.pc) + ' · ';
    if (ev.type === 'wait') return row + (ev.done ? 'il tempo è finito: si passa alla riga dopo.' : 'la CPU aspetta: mancano ' + ev.left + ' passi.');
    const sig = ev.op + (OPS[ev.op] && OPS[ev.op].arg ? ' ' + hex1(ev.n) : '');
    const head = row + sig + ': ';
    switch (ev.op) {
      case 'TXT': return head + 'il display mostra il testo scritto dalla riga ' + hex1(ev.n) + ' in poi, «' + readText(rom, ev.n).trim() + '».';
      case 'SCO': return head + "l'insegna scorre di una colonna verso sinistra.";
      case 'LEG': return head + 'la CPU legge la cifra ' + m.a + ' dalla riga ' + hex1(ev.n) + " e la mette nell'accumulatore.";
      case 'SOM': return head + ev.a0 + ' + ' + ev.d + (ev.c0 ? ' + 1 di riporto' : '') + ' = ' + ev.sum + ': tiene ' + m.a + (m.c ? ' e riporta 1.' : ', senza riporto.');
      case 'SCR': return head + 'il ' + m.ram[ev.ram] + ' va nella cella ' + ev.ram + ' della RAM.';
      case 'VIS': return head + 'il numero della RAM va sul display: ' + numText(m.ram).trim() + '.';
      case 'LUC': return head + 'si accende la luce ' + (LAMP_NAMES[ev.n] || ev.n) + '.';
      case 'ASP': return head + 'la CPU aspetta ' + ev.n + ' tempi prima di andare avanti.';
      case 'CON': return head + "conta: l'accumulatore ora vale " + m.a + '.';
      case 'DAD': return head + 'il display mostra la faccia ' + m.a + ' del dado.';
      case 'ATT': return head + (ev.key === 'used' ? 'hai premuto il tasto: si va avanti.' : 'la CPU controlla il tasto e, finché non lo premi, rilegge questa riga.');
      case 'TAS': return head + (ev.key === 'used' ? 'hai premuto il tasto: salta alla riga ' + hex1(ev.n) + '.' : 'nessun tasto premuto: prosegue.');
      case 'SAL': return head + 'salta alla riga ' + hex1(ev.n) + '.';
      default: return row + 'riga vuota, nessuna operazione.';
    }
  }

  /* ---------- il display ---------- */

  const FONT = {
    ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
    '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
    '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
    '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
    '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
    '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
    'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    'D': ['###..', '#..#.', '#...#', '#...#', '#...#', '#..#.', '###..'],
    'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    'I': ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    'N': ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
    'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  };
  const DISC = ['.###.', '#####', '#####', '#####', '#####', '#####', '.###.'];
  const RING = ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'];
  const PIPS = {
    1: [[3, 3]],
    2: [[1, 5], [5, 1]],
    3: [[1, 5], [3, 3], [5, 1]],
    4: [[1, 1], [1, 5], [5, 1], [5, 5]],
    5: [[1, 1], [1, 5], [3, 3], [5, 1], [5, 5]],
    6: [[1, 1], [3, 1], [5, 1], [1, 5], [3, 5], [5, 5]],
  };

  function glyph(ch) { return FONT[ch] || FONT[String(ch).toUpperCase()] || FONT['?']; }

  /** Colonne di punti di un testo: per ogni carattere 5 colonne e una vuota. Ogni colonna è un array di 7 bit. */
  function textColumns(text) {
    const cols = [];
    for (const ch of String(text)) {
      const g = glyph(ch);
      for (let x = 0; x < 5; x++) cols.push(g.map((row) => (row[x] === '#' ? 1 : 0)));
      cols.push(new Array(LINES).fill(0));
    }
    return cols;
  }

  /** Il numero nella RAM come testo di 5 caratteri allineato a destra, senza zeri davanti. */
  function numText(digits) {
    let i = 0;
    while (i < digits.length - 1 && digits[i] === 0) i++;
    const s = digits.slice(i).map((d) => (d >= 0 && d <= 9 ? String(d) : '?')).join('');
    return s.padStart(5, ' ').slice(-5);
  }

  function paintGlyph(px, rows, x0, color) {
    for (let y = 0; y < LINES; y++) {
      for (let x = 0; x < 5; x++) {
        if (rows[y][x] === '#' && x0 + x >= 0 && x0 + x < COLS) px[y][x0 + x] = color;
      }
    }
  }

  /** Matrice LINES × COLS di colori (0 spento, 1 rosso, 2 giallo, 3 verde) per lo stato d'uscita out. */
  function frame(out, rom) {
    const px = Array.from({ length: LINES }, () => new Array(COLS).fill(OFF));
    if (!out || out.mode === 'off') return px;
    if (out.mode === 'text') {
      const cols = textColumns(readText(rom, out.start));
      const W = cols.length;
      const L = Math.max(W, COLS + 1);
      for (let j = 0; j < COLS; j++) {
        const k = (out.offset + j) % L;
        if (k < W) for (let y = 0; y < LINES; y++) if (cols[k][y]) px[y][j] = AMBER;
      }
    } else if (out.mode === 'num') {
      const t = numText(out.digits);
      for (let i = 0; i < 5; i++) paintGlyph(px, glyph(t[i]), i * 6, AMBER);
    } else if (out.mode === 'lamp') {
      [RED, AMBER, GREEN].forEach((color, i) => paintGlyph(px, out.lit === i + 1 ? DISC : RING, i * 12, color));
    } else if (out.mode === 'dice') {
      const pips = PIPS[out.face];
      if (pips) {
        pips.forEach(([y, x]) => { px[y][4 + x] = RED; });
        paintGlyph(px, glyph(String(out.face)), 18, AMBER);
      }
    }
    return px;
  }

  /** Che cosa mostra il display, a parole (per chi non vede i LED). */
  function describe(out, rom) {
    if (!out || out.mode === 'off') return 'spento';
    if (out.mode === 'text') {
      const t = readText(rom, out.start).trim();
      return out.offset > 0 ? 'la scritta «' + t + '» che scorre' : '«' + t + '»';
    }
    if (out.mode === 'num') return '«' + numText(out.digits).trim() + '»';
    if (out.mode === 'lamp') return out.lit >= 1 && out.lit <= 3 ? 'luce ' + LAMP_NAMES[out.lit] : 'luci spente';
    if (out.mode === 'dice') return PIPS[out.face] ? 'dado: ' + out.face : 'dado senza numero';
    return 'spento';
  }

  /* ---------- la logica cablata ---------- */

  // Un circuito diverso per ogni funzione: colonne di porte (flusso del segnale da sinistra a destra).
  const RECIPES = {
    calcolatrice: [['ff', 'ff', 'ff', 'ff'], ['xor', 'and', 'xor', 'and', 'or'], ['and', 'or', 'and', 'or'], ['not', 'and', 'not']],
    semaforo: [['ff', 'ff'], ['and', 'and', 'or'], ['not', 'and', 'and']],
    insegna: [['ff', 'ff', 'ff', 'ff'], ['and', 'or', 'and'], ['or', 'and', 'or', 'not']],
    dado: [['ff', 'ff', 'ff'], ['and', 'or', 'and', 'and'], ['or', 'not', 'or']],
  };
  const SYM = { ff: 'FF', and: '&', or: '≥1', xor: '=1', not: '1' };
  const GATE_NAMES = { ff: 'flip-flop', and: 'porta AND', or: 'porta OR', xor: 'porta XOR', not: 'porta NOT' };
  const INPUTS = { ff: 1, and: 2, or: 2, xor: 2, not: 1 };

  function hash(str) {
    let x = 2166136261;
    for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  function prng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const r1 = (v) => Math.round(v * 10) / 10;

  /**
   * Disegno del circuito cablato di una funzione dentro un riquadro.
   * geo: { orient: 'h' (segnale da sinistra a destra) | 'v' (dall'alto in basso), x, y, w, h,
   *        feed, out (distanza delle linee d'ingresso e d'uscita dai bordi), padFlow, padTop, padBot,
   *        bu (lato del blocco lungo il flusso), bv (lato di traverso), gapMax }
   * Restituisce blocchi, fili (con path SVG e lunghezza), chip (riquadri) e conteggi.
   */
  function wired(id, geo) {
    const recipe = RECIPES[id];
    if (!recipe) throw new Error('Funzione sconosciuta: ' + id);
    const g = Object.assign({ orient: 'h', x: 0, y: 0, w: 728, h: 340, feed: 28, out: 26, padFlow: 70, padTop: 34, padBot: 14, bu: 66, bv: 36, gapMax: 26 }, geo || {});
    const H = g.orient !== 'v';
    const U0 = H ? g.x : g.y, UL = H ? g.w : g.h;
    const V0 = H ? g.y : g.x, VL = H ? g.h : g.w;
    const map = (u, v) => (H ? [u, v] : [v, u]);
    const toPath = (pts) => 'M' + pts.map((p) => map(p[0], p[1]).map(r1).join(' ')).join(' L');
    const C = recipe.length;
    const uFirst = U0 + g.padFlow;
    const uLast = U0 + UL - g.padFlow - g.bu;
    const stepU = C > 1 ? (uLast - uFirst) / (C - 1) : 0;
    const rnd = prng(hash(id));

    const cols = recipe.map((types, ci) => {
      const n = types.length;
      const avail = VL - g.padTop - g.padBot;
      const gap = n > 1 ? Math.max(4, Math.min(g.gapMax, (avail - n * g.bv) / (n - 1))) : 0;
      const total = n * g.bv + (n - 1) * gap;
      const vTop = V0 + g.padTop + (avail - total) / 2;
      const u = uFirst + ci * stepU;
      return { u: u, vTop: vTop, total: total, items: types.map((t, ri) => ({ id: 'b' + ci + '-' + ri, type: t, col: ci, row: ri, u: u, v: vTop + ri * (g.bv + gap) })) };
    });

    const blocks = [];
    cols.forEach((c) => c.items.forEach((b) => {
      const xy = map(b.u, b.v);
      blocks.push({ id: b.id, type: b.type, sym: SYM[b.type], name: GATE_NAMES[b.type], col: b.col, row: b.row, x: r1(xy[0]), y: r1(xy[1]), w: H ? g.bu : g.bv, h: H ? g.bv : g.bu });
    }));

    const wires = [];
    const addWire = (from, to, pts, kind) => {
      let len = 0;
      for (let i = 1; i < pts.length; i++) len += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
      wires.push({ id: 'w' + wires.length, from: from, to: to, kind: kind, d: toPath(pts), len: r1(len) });
    };
    const inPoints = (b) => (INPUTS[b.type] === 1 ? [b.v + g.bv / 2] : [b.v + g.bv * 0.3, b.v + g.bv * 0.7]);

    // ingressi della prima colonna, dalla linea degli ingressi (tasto e clock)
    const feedU = U0 + g.feed;
    cols[0].items.forEach((b) => inPoints(b).forEach((v) => addWire('in', b.id, [[feedU, v], [b.u, v]], 'in')));

    // collegamenti tra una colonna e la successiva, ognuno con il suo tratto verticale nel canale
    for (let ci = 1; ci < C; ci++) {
      const prev = cols[ci - 1].items;
      const P = prev.length;
      const cur = cols[ci].items;
      const links = [];
      cur.forEach((b, ri) => {
        const vs = inPoints(b);
        const first = Math.min(P - 1, Math.round((ri * (P - 1)) / Math.max(1, cur.length - 1)));
        const srcs = [first];
        if (vs.length > 1) {
          let other = Math.floor(rnd() * P);
          if (other === first) other = (first + 1 + Math.floor(rnd() * (P - 1))) % P;
          srcs.push(other);
        }
        vs.forEach((v, k) => links.push({ src: prev[srcs[k]], dst: b, v: v }));
      });
      links.sort((p, q) => (p.src.v - q.src.v) || (p.v - q.v));
      const chanStart = cols[ci - 1].u + g.bu;
      const chanW = stepU - g.bu;
      links.forEach((l, j) => {
        const um = chanStart + ((j + 1) * chanW) / (links.length + 1);
        const sv = l.src.v + g.bv / 2;
        addWire(l.src.id, l.dst.id, [[l.src.u + g.bu, sv], [um, sv], [um, l.v], [l.dst.u, l.v]], 'link');
      });
    }

    // uscite dell'ultima colonna, verso la linea delle uscite
    const outU = U0 + UL - g.out;
    cols[C - 1].items.forEach((b) => { const v = b.v + g.bv / 2; addWire(b.id, 'out', [[b.u + g.bu, v], [outU, v]], 'out'); });

    const vMin = Math.min.apply(null, cols.map((c) => c.vTop));
    const vMax = Math.max.apply(null, cols.map((c) => c.vTop + c.total));
    const chips = cols.map((c, ci) => {
      const u0 = c.u - 10, du = g.bu + 20, v0 = c.vTop - 12, dv = c.total + 24;
      const xy = map(u0, v0);
      return { id: 'c' + ci, n: ci + 1, x: r1(xy[0]), y: r1(xy[1]), w: H ? du : dv, h: H ? dv : du, gates: c.items.length };
    });
    const feed = toPath([[feedU, vMin - 6], [feedU, vMax + 6]]);
    const collect = toPath([[outU, vMin - 6], [outU, V0 + VL]]);
    const collectEnd = map(outU, V0 + VL).map(r1);

    return {
      id: id, orient: H ? 'h' : 'v', blocks: blocks, wires: wires, chips: chips, feed: feed, collect: collect, collectEnd: collectEnd,
      counts: { chips: chips.length, gates: blocks.length, wires: wires.length },
      signature: recipe.map((c) => c.join(',')).join('|'),
    };
  }

  /* ---------- obiettivo ---------- */

  const GOAL = 3;
  function goalReached(tried) {
    const set = tried instanceof Set ? tried : new Set(tried || []);
    return ORDER.filter((id) => set.has(id)).length >= GOAL;
  }

  const api = {
    ROWS: ROWS, COLS: COLS, LINES: LINES, RAM_CELLS: RAM_CELLS, WAIT_UNIT: WAIT_UNIT, GOAL: GOAL,
    OFF: OFF, RED: RED, AMBER: AMBER, GREEN: GREEN,
    OPS: OPS, PROGRAMS: PROGRAMS, ORDER: ORDER, RECIPES: RECIPES, SYM: SYM, INPUTS: INPUTS,
    hex1: hex1, hex2: hex2,
    assemble: assemble, bitDiff: bitDiff, createMachine: createMachine, step: step, explain: explain,
    readText: readText, textColumns: textColumns, numText: numText, frame: frame, describe: describe,
    wired: wired, goalReached: goalReached,
  };

  root.IdeaCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
