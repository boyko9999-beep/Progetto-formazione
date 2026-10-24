/*
 * Quiz dell'enciclopedia: logica pura, senza DOM.
 * Registro delle banche di domande (QuizBank), verifica delle risposte,
 * scelta delle domande e validazione usata da test e strumenti.
 * Il formato delle domande è descritto in sections/quiz/README.md.
 */
(function (root) {
  'use strict';

  const TYPES = ['choice', 'truefalse', 'order', 'match', 'number', 'bits', 'truth', 'logic'];
  const LEVELS = { 1: 'Base', 2: 'Medio', 3: 'Esperto' };

  /* ---------- casualità ---------- */

  // Generatore riproducibile (mulberry32): i test passano un seme, l'app usa Math.random.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rand) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Mescola garantendo un ordine diverso da quello di partenza (per riordinare e abbinare).
  function scramble(list, rand) {
    if (list.length < 2) return list.slice();
    for (let k = 0; k < 20; k++) {
      const a = shuffle(list, rand);
      if (a.some((x, i) => x !== list[i])) return a;
    }
    return list.slice(1).concat(list[0]);
  }

  /* ---------- espressioni logiche: AND(A,OR(B,NOT(C))) ---------- */

  const count1 = (v) => v.filter((x) => x === 1).length;
  const GATES = {
    AND: { min: 2, max: 4, fn: (v) => count1(v) === v.length },
    OR: { min: 2, max: 4, fn: (v) => count1(v) > 0 },
    NAND: { min: 2, max: 4, fn: (v) => count1(v) !== v.length },
    NOR: { min: 2, max: 4, fn: (v) => count1(v) === 0 },
    XOR: { min: 2, max: 4, fn: (v) => count1(v) % 2 === 1 },
    XNOR: { min: 2, max: 4, fn: (v) => count1(v) % 2 === 0 },
    NOT: { min: 1, max: 1, fn: (v) => v[0] === 0 },
    BUF: { min: 1, max: 1, fn: (v) => v[0] === 1 },
  };

  function parseExpr(src) {
    const s = String(src == null ? '' : src).replace(/\s+/g, '').toUpperCase();
    let i = 0;
    function fail(msg) { throw new Error('espressione "' + src + '": ' + msg); }
    function node() {
      const m = /^[A-Z]+/.exec(s.slice(i));
      if (!m) fail('atteso un nome in posizione ' + (i + 1));
      const name = m[0];
      i += name.length;
      if (s[i] === '(') {
        const g = GATES[name];
        if (!g) fail('porta sconosciuta ' + name);
        i++;
        const args = [node()];
        while (s[i] === ',') { i++; args.push(node()); }
        if (s[i] !== ')') fail('manca ")" in posizione ' + (i + 1));
        i++;
        if (args.length < g.min || args.length > g.max) fail(name + ' accetta da ' + g.min + ' a ' + g.max + ' ingressi');
        return { gate: name, args: args };
      }
      if (!/^[A-D]$/.test(name)) fail('ingresso non valido ' + name + ' (usa A, B, C o D)');
      return { input: name };
    }
    const tree = node();
    if (i !== s.length) fail('caratteri in più in posizione ' + (i + 1));
    return tree;
  }

  function evalExpr(tree, env) {
    if (tree.input) return env[tree.input] ? 1 : 0;
    return GATES[tree.gate].fn(tree.args.map((a) => evalExpr(a, env))) ? 1 : 0;
  }

  function exprInputs(tree) {
    const acc = new Set();
    (function walk(t) { if (t.input) acc.add(t.input); else t.args.forEach(walk); })(tree);
    return [...acc].sort();
  }

  // Tabella di verità nell'ordine binario dei libri: il primo ingresso è il bit più significativo.
  function truthRows(expr) {
    const tree = typeof expr === 'string' ? parseExpr(expr) : expr;
    const names = exprInputs(tree);
    const rows = [];
    for (let k = 0; k < 1 << names.length; k++) {
      const env = {};
      names.forEach((n, j) => { env[n] = (k >> (names.length - 1 - j)) & 1; });
      rows.push({ inputs: env, out: evalExpr(tree, env) });
    }
    return { names: names, rows: rows };
  }

  /* ---------- codice colori dei resistori ---------- */

  const DIGIT_COLORS = ['nero', 'marrone', 'rosso', 'arancione', 'giallo', 'verde', 'blu', 'viola', 'grigio', 'bianco'];
  const MULTIPLIER = { nero: 1, marrone: 10, rosso: 100, arancione: 1e3, giallo: 1e4, verde: 1e5, blu: 1e6, viola: 1e7, grigio: 1e8, bianco: 1e9, oro: 0.1, argento: 0.01 };
  const TOLERANCE = { marrone: 1, rosso: 2, verde: 0.5, blu: 0.25, viola: 0.1, grigio: 0.05, oro: 5, argento: 10 };

  function resistorValue(bands) {
    if (!Array.isArray(bands) || (bands.length !== 4 && bands.length !== 5)) return null;
    let v = 0;
    for (const c of bands.slice(0, bands.length - 2)) {
      const d = DIGIT_COLORS.indexOf(c);
      if (d < 0) return null;
      v = v * 10 + d;
    }
    const m = MULTIPLIER[bands[bands.length - 2]];
    const t = TOLERANCE[bands[bands.length - 1]];
    if (m == null || t == null) return null;
    return { ohms: Math.round(v * m * 1000) / 1000, tolerance: t };
  }

  /* ---------- numeri all'italiana ---------- */

  function formatNumber(x) {
    if (!Number.isFinite(x)) return String(x);
    const r = Math.round(x * 1e6) / 1e6;
    return String(r).replace('.', ',');
  }

  function formatOhms(ohms) {
    const units = [[1e9, 'GΩ'], [1e6, 'MΩ'], [1e3, 'kΩ'], [1, 'Ω']];
    for (const [f, u] of units) {
      if (ohms >= f || f === 1) return formatNumber(Math.round((ohms / f) * 100) / 100) + ' ' + u;
    }
    return '';
  }

  // Accetta "0,02", "0.02", "1.500,5", "20 mA" (l'unità scritta dopo il numero viene ignorata).
  function parseNumber(text) {
    let t = String(text == null ? '' : text).replace(/\s+/g, '').replace(/[−–]/g, '-');
    if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(',', '.');
    const m = /^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?/i.exec(t);
    return m ? parseFloat(m[0]) : NaN;
  }

  function toleranceOf(q) {
    return q.tolerance != null ? q.tolerance : Math.max(Math.abs(q.value) * 0.02, 1e-9);
  }

  function toBinary(value, width) {
    return value.toString(2).padStart(width, '0');
  }

  /* ---------- verifica delle risposte ---------- */

  // r è la risposta data: indice (choice), booleano (truefalse), elenco ordinato (order),
  // mappa sinistra→destra (match), testo (number), intero (bits), uscite (truth), ingressi (logic).
  function check(q, r) {
    switch (q.type || 'choice') {
      case 'choice': return r === q.answer;
      case 'truefalse': return r === q.answer;
      case 'order': return Array.isArray(r) && r.length === q.items.length && r.every((x, i) => x === q.items[i]);
      case 'match': return !!r && q.pairs.every((p) => r[p[0]] === p[1]);
      case 'number': {
        const v = typeof r === 'number' ? r : parseNumber(r);
        return Number.isFinite(v) && Math.abs(v - q.value) <= toleranceOf(q) + 1e-12;
      }
      case 'bits': return r === q.value;
      case 'truth': {
        const t = truthRows(q.expr);
        return Array.isArray(r) && r.length === t.rows.length && t.rows.every((row, i) => r[i] === row.out);
      }
      case 'logic': return !!r && evalExpr(parseExpr(q.expr), r) === q.target;
      default: return false;
    }
  }

  // La risposta giusta in parole, per il riepilogo finale.
  function answerText(q) {
    switch (q.type || 'choice') {
      case 'choice': return q.options[q.answer];
      case 'truefalse': return q.answer ? 'Vero' : 'Falso';
      case 'order': return q.items.join(' → ');
      case 'match': return q.pairs.map((p) => p[0] + ' → ' + p[1]).join(' · ');
      case 'number': return formatNumber(q.value) + (q.unit ? ' ' + q.unit : '');
      case 'bits': return toBinary(q.value, q.width) + ' (' + q.value + ')';
      case 'truth': return truthRows(q.expr).rows.map((r) => r.out).join(' ');
      case 'logic': {
        const t = truthRows(q.expr);
        const row = t.rows.find((r) => r.out === q.target);
        return row ? t.names.map((n) => n + ' = ' + row.inputs[n]).join(', ') : '';
      }
      default: return '';
    }
  }

  /* ---------- scelta delle domande ---------- */

  // Sceglie count domande bilanciando i livelli (40% base, 40% medio, 20% esperto),
  // preferendo quelle non viste di recente, e le ordina per difficoltà crescente
  // evitando, se possibile, due domande dello stesso tipo una dopo l'altra.
  function pick(questions, count, rand, opts) {
    const seen = (opts && opts.seen) || new Set();
    const n = Math.min(count, questions.length);
    const pool = shuffle(questions, rand);
    const fresh = pool.filter((q) => !seen.has(q.id));
    const old = pool.filter((q) => seen.has(q.id));
    const want = { 1: Math.round(n * 0.4), 3: Math.round(n * 0.2) };
    want[2] = n - want[1] - want[3];
    const chosen = [];
    const take = (list, byLevel) => {
      for (const q of list) {
        if (chosen.length >= n) return;
        const lv = q.level || 2;
        if (chosen.includes(q) || (byLevel && want[lv] <= 0)) continue;
        chosen.push(q);
        want[lv]--;
      }
    };
    // Prima le domande mai viste, rispettando i livelli; poi le altre mai viste; poi quelle già viste.
    take(fresh, true);
    take(fresh, false);
    take(old, true);
    take(old, false);
    chosen.sort((a, b) => (a.level || 2) - (b.level || 2));
    for (let i = 1; i < chosen.length; i++) {
      if ((chosen[i].type || 'choice') !== (chosen[i - 1].type || 'choice')) continue;
      for (let j = i + 1; j < chosen.length && (chosen[j].level || 2) === (chosen[i].level || 2); j++) {
        if ((chosen[j].type || 'choice') !== (chosen[i - 1].type || 'choice')) {
          [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
          break;
        }
      }
    }
    return chosen;
  }

  // Esame misto: lo stesso numero di domande da ogni banca, poi difficoltà crescente.
  function pickMixed(banks, count, rand, opts) {
    const per = Math.max(1, Math.floor(count / banks.length));
    let out = [];
    banks.forEach((b) => { out = out.concat(pick(b.questions, per, rand, opts)); });
    const rest = shuffle(banks.flatMap((b) => b.questions).filter((q) => !out.includes(q)), rand);
    out = out.concat(rest.slice(0, Math.max(0, count - out.length)));
    return shuffle(out, rand).sort((a, b) => (a.level || 2) - (b.level || 2));
  }

  function medal(pct) {
    if (pct >= 90) return 'oro';
    if (pct >= 75) return 'argento';
    if (pct >= 50) return 'bronzo';
    return null;
  }

  /* ---------- figure: tipi e parametri ammessi ---------- */

  const SYMBOLS = ['resistor', 'potentiometer', 'capacitor', 'electrolytic', 'inductor', 'diode', 'led', 'zener', 'photodiode',
    'battery', 'ac-source', 'ground', 'switch', 'pushbutton', 'lamp', 'fuse', 'npn', 'pnp', 'nmos', 'pmos', 'opamp',
    'transformer', 'crystal', 'speaker', 'motor', 'voltmeter', 'ammeter', 'relay', 'antenna'];
  const WAVES = ['sine', 'square', 'triangle', 'sawtooth', 'pwm', 'dc', 'half-wave', 'full-wave', 'sampled', 'am', 'fm', 'clock-data', 'differential'];
  const CIRCUITS = ['series', 'parallel', 'divider', 'led', 'rc', 'switches-series', 'switches-parallel'];
  const BLOCKS = ['von-neumann', 'harvard', 'fetch-cycle', 'memory-pyramid', 'cpu'];
  const BAND_COLORS = DIGIT_COLORS.concat(['oro', 'argento']);

  const isText = (s, max) => typeof s === 'string' && s.trim().length > 0 && (!max || s.length <= max);
  const isInt = (n) => Number.isInteger(n);

  function validateFigure(f, where) {
    const e = [];
    const err = (m) => e.push(where + ': figura ' + m);
    if (!f || typeof f !== 'object') return [where + ': figura non valida'];
    if (f.caption != null && !isText(f.caption, 120)) err('caption troppo lunga o vuota (max 120)');
    switch (f.kind) {
      case 'symbol':
        if (!SYMBOLS.includes(f.name)) err('symbol: nome sconosciuto ' + f.name + ' (ammessi: ' + SYMBOLS.join(', ') + ')');
        break;
      case 'resistor':
        if (!Array.isArray(f.bands) || (f.bands.length !== 4 && f.bands.length !== 5)) err('resistor: servono 4 o 5 bande');
        else if (!f.bands.every((c) => BAND_COLORS.includes(c))) err('resistor: colori ammessi ' + BAND_COLORS.join(', '));
        else if (!resistorValue(f.bands)) err('resistor: combinazione di bande non valida');
        break;
      case 'gate':
        if (!GATES[f.gate]) err('gate: porta sconosciuta ' + f.gate);
        break;
      case 'logic':
        try { parseExpr(f.expr); } catch (x) { err('logic: ' + x.message); }
        break;
      case 'wave':
        if (!WAVES.includes(f.shape)) err('wave: forma sconosciuta ' + f.shape + ' (ammesse: ' + WAVES.join(', ') + ')');
        if (f.cycles != null && !(isInt(f.cycles) && f.cycles >= 1 && f.cycles <= 8)) err('wave: cycles da 1 a 8');
        if (f.duty != null && !(f.duty >= 0.05 && f.duty <= 0.95)) err('wave: duty da 0.05 a 0.95');
        if (f.label != null && !isText(f.label, 40)) err('wave: label max 40 caratteri');
        break;
      case 'circuit':
        if (!CIRCUITS.includes(f.topo)) err('circuit: topologia sconosciuta ' + f.topo + ' (ammesse: ' + CIRCUITS.join(', ') + ')');
        if ((f.topo === 'series' || f.topo === 'parallel') && !(Array.isArray(f.values) && f.values.length >= 2 && f.values.length <= (f.topo === 'series' ? 4 : 3) && f.values.every((v) => isText(v, 12)))) err('circuit: values deve elencare 2-4 (serie) o 2-3 (parallelo) etichette brevi');
        if (f.topo === 'divider' && !(isText(f.vin, 12) && isText(f.r1, 12) && isText(f.r2, 12))) err('circuit divider: servono vin, r1, r2');
        if (f.topo === 'led' && !(isText(f.v, 12) && isText(f.r, 12))) err('circuit led: servono v, r');
        if (f.topo === 'rc' && !(isText(f.v, 12) && isText(f.r, 12) && isText(f.c, 12))) err('circuit rc: servono v, r, c');
        break;
      case 'chip':
        if (!(isInt(f.pins) && f.pins >= 8 && f.pins <= 64 && f.pins % 2 === 0)) err('chip: pins pari da 8 a 64');
        if (!isText(f.label, 24)) err('chip: label obbligatoria (max 24)');
        if (f.note != null && !isText(f.note, 24)) err('chip: note max 24');
        if (f.package != null && !['dip', 'qfp'].includes(f.package)) err('chip: package dip o qfp');
        break;
      case 'code': {
        if (!isText(f.lang, 16)) err('code: lang obbligatorio (max 16)');
        if (!isText(f.text)) err('code: text obbligatorio');
        else {
          const lines = f.text.split('\n');
          if (lines.length > 14) err('code: massimo 14 righe');
          if (lines.some((l) => l.length > 56)) err('code: righe di massimo 56 caratteri');
        }
        break;
      }
      case 'bits':
        if (![4, 8, 16].includes(f.width)) err('bits: width 4, 8 o 16');
        else if (!(isInt(f.value) && f.value >= 0 && f.value < Math.pow(2, f.width))) err('bits: value fuori intervallo');
        break;
      case 'card':
        if (!(typeof f.text === 'string' && /^[A-Z0-9 ]{1,24}$/.test(f.text))) err('card: text di 1-24 caratteri tra A-Z, 0-9 e spazio');
        break;
      case 'block':
        if (!BLOCKS.includes(f.name)) err('block: schema sconosciuto ' + f.name + ' (ammessi: ' + BLOCKS.join(', ') + ')');
        break;
      default:
        err('kind sconosciuto ' + f.kind);
    }
    return e;
  }

  /* ---------- validazione delle domande ---------- */

  // strict: le banche del quiz devono avere id, level e topic; le domande di BusLab no.
  function validateQuestion(q, where, strict) {
    const e = [];
    const err = (m) => e.push(where + ': ' + m);
    if (!q || typeof q !== 'object') return [where + ': domanda mancante'];
    const type = q.type || 'choice';
    if (!TYPES.includes(type)) err('tipo sconosciuto ' + type + ' (ammessi: ' + TYPES.join(', ') + ')');
    if (!isText(q.q, 320)) err('testo della domanda (q) mancante o oltre 320 caratteri');
    if (!isText(q.why, 600)) err('spiegazione (why) mancante o oltre 600 caratteri');
    if (strict || q.id != null) { if (!(typeof q.id === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(q.id))) err('id mancante o non valido (minuscole, cifre e trattini)'); }
    if (strict || q.level != null) { if (![1, 2, 3].includes(q.level)) err('level deve essere 1, 2 o 3'); }
    if (strict || q.topic != null) { if (!isText(q.topic, 32)) err('topic mancante o oltre 32 caratteri'); }
    if (q.chapter != null && !(typeof q.chapter === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(q.chapter))) err('chapter non valido');
    switch (type) {
      case 'choice':
        if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 5) err('options: da 2 a 5 opzioni');
        else {
          if (!q.options.every((o) => isText(o, 140))) err('options: testi vuoti o oltre 140 caratteri');
          if (new Set(q.options.map((o) => String(o).trim().toLowerCase())).size !== q.options.length) err('options: opzioni ripetute');
          if (!(isInt(q.answer) && q.answer >= 0 && q.answer < q.options.length)) err('answer: indice fuori intervallo');
        }
        break;
      case 'truefalse':
        if (typeof q.answer !== 'boolean') err('answer deve essere true o false');
        break;
      case 'order':
        if (!Array.isArray(q.items) || q.items.length < 3 || q.items.length > 6) err('items: da 3 a 6 elementi');
        else {
          if (!q.items.every((x) => isText(x, 70))) err('items: testi vuoti o oltre 70 caratteri');
          if (new Set(q.items).size !== q.items.length) err('items: elementi ripetuti');
        }
        if (q.ends != null && !(Array.isArray(q.ends) && q.ends.length === 2 && q.ends.every((x) => isText(x, 24)))) err('ends: due etichette brevi');
        break;
      case 'match':
        if (!Array.isArray(q.pairs) || q.pairs.length < 3 || q.pairs.length > 5) err('pairs: da 3 a 5 coppie');
        else {
          if (!q.pairs.every((p) => Array.isArray(p) && p.length === 2 && isText(p[0], 50) && isText(p[1], 70))) err('pairs: coppie [sinistra (max 50), destra (max 70)]');
          else {
            if (new Set(q.pairs.map((p) => p[0])).size !== q.pairs.length) err('pairs: elementi di sinistra ripetuti');
            if (new Set(q.pairs.map((p) => p[1])).size !== q.pairs.length) err('pairs: elementi di destra ripetuti');
          }
        }
        break;
      case 'number':
        if (!Number.isFinite(q.value)) err('value deve essere un numero');
        else if (Math.abs(q.value) >= 1000) err('value sotto 1000 (usa i prefissi k, M, m, µ nell\'unità)');
        if (q.tolerance != null && !(Number.isFinite(q.tolerance) && q.tolerance >= 0)) err('tolerance deve essere un numero >= 0');
        if (q.unit != null && !isText(q.unit, 12)) err('unit max 12 caratteri');
        break;
      case 'bits':
        if (![4, 8].includes(q.width)) err('width deve essere 4 o 8');
        else if (!(isInt(q.value) && q.value >= 0 && q.value < Math.pow(2, q.width))) err('value fuori intervallo per ' + q.width + ' bit');
        break;
      case 'truth':
        try {
          const n = exprInputs(parseExpr(q.expr)).length;
          if (n < 1 || n > 3) err('truth: da 1 a 3 ingressi');
        } catch (x) { err(x.message); }
        break;
      case 'logic':
        try {
          const t = truthRows(q.expr);
          if (t.names.length < 1 || t.names.length > 4) err('logic: da 1 a 4 ingressi');
          if (q.target !== 0 && q.target !== 1) err('logic: target deve essere 0 o 1');
          const ok = t.rows.filter((r) => r.out === q.target).length;
          if (ok === 0) err('logic: nessuna combinazione di ingressi dà ' + q.target);
          if (ok === t.rows.length) err('logic: qualsiasi combinazione dà ' + q.target + ', la domanda è banale');
        } catch (x) { err(x.message); }
        break;
      default:
        break;
    }
    if (q.figure != null) e.push(...validateFigure(q.figure, where));
    return e;
  }

  // Avvisi di qualità: non bloccano, ma il revisore deve guardarli.
  function lintQuestion(q, where) {
    const w = [];
    const type = q.type || 'choice';
    const text = [q.q].concat(q.options || []).join(' ').toLowerCase();
    if (/tutte le precedenti|nessuna delle precedenti|entrambe le precedenti/.test(text)) w.push(where + ': evita "tutte/nessuna delle precedenti"');
    if (type === 'choice' && Array.isArray(q.options)) {
      if (q.answer !== 0) w.push(where + ': per convenzione la risposta giusta va per prima (answer: 0)');
      const len = q.options.map((o) => String(o).length);
      const right = len[q.answer];
      const others = len.filter((l, i) => i !== q.answer);
      if (others.length && right > 1.6 * Math.max(...others) && right - Math.max(...others) > 12) w.push(where + ': la risposta giusta è molto più lunga delle altre (si indovina)');
      if (q.options.length < 3) w.push(where + ': meglio 3 o 4 opzioni');
      // L'etichetta si legge prima di rispondere: non deve nominare la risposta giusta.
      const stems = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .split(/[^a-z0-9]+/).filter((x) => x.length > 3).map((x) => x.slice(0, 7));
      const inRight = new Set(stems(q.options[q.answer]));
      const known = new Set(stems(q.q).concat(q.options.filter((o, i) => i !== q.answer).flatMap(stems)));
      if (isText(q.topic) && stems(q.topic).some((s) => inRight.has(s) && !known.has(s))) w.push(where + ': l\'etichetta (topic) rivela la risposta giusta');
    }
    if (isText(q.why) && q.why.trim().length < 25) w.push(where + ': spiegazione troppo corta');
    return w;
  }

  function validateBank(bank, strict) {
    const e = [];
    if (!bank || typeof bank !== 'object') return ['banca non valida'];
    const where = 'banca ' + (bank.slug || '?');
    if (!(typeof bank.slug === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(bank.slug))) e.push(where + ': slug non valido');
    if (!isText(bank.title, 60)) e.push(where + ': title mancante');
    if (!Array.isArray(bank.questions)) return e.concat(where + ': questions deve essere un elenco');
    const ids = new Set();
    bank.questions.forEach((q, i) => {
      const w = where + ' #' + (i + 1) + (q && q.id ? ' (' + q.id + ')' : '');
      e.push(...validateQuestion(q, w, strict));
      if (q && q.id) {
        if (ids.has(q.id)) e.push(w + ': id ripetuto');
        ids.add(q.id);
      }
    });
    return e;
  }

  /* ---------- registro delle banche ---------- */

  const banks = new Map();
  const pending = new Map();

  function normalize(slug, q, i) {
    return Object.assign({}, q, {
      id: q.id || slug + '-' + (i + 1),
      type: q.type || 'choice',
      level: q.level || 2,
      section: slug,
    });
  }

  // Le domande non valide vengono scartate con un avviso: una domanda rotta non deve fermare la pagina.
  function keepValid(slug, list, strict) {
    return list.filter((q, i) => {
      const errs = validateQuestion(q, slug + ' #' + (i + 1), strict);
      if (errs.length && typeof console !== 'undefined') console.warn('[quiz] domanda scartata', errs);
      return errs.length === 0;
    });
  }

  // Una domanda aggiunta da una sezione con lo stesso id sostituisce quella della banca:
  // i testi della sezione hanno la precedenza.
  function merge(slug, base, extra) {
    const list = base.slice();
    const at = new Map(list.map((q, i) => [q.id, i]));
    extra.forEach((q) => {
      const n = normalize(slug, q, list.length);
      if (at.has(n.id)) list[at.get(n.id)] = n;
      else { at.set(n.id, list.length); list.push(n); }
    });
    return list;
  }

  const QuizBank = {
    // bank: { slug, number, title, subtitle, color?, chapters?, questions: [...] }
    register(bank) {
      const extra = pending.get(bank.slug) || [];
      pending.delete(bank.slug);
      const own = keepValid(bank.slug, bank.questions || [], false).map((q, i) => normalize(bank.slug, q, i));
      const b = Object.assign({}, bank, { questions: merge(bank.slug, own, extra) });
      banks.set(bank.slug, b);
      return b;
    },
    // Aggiunge domande alla banca di una sezione; funziona anche prima di register.
    extend(slug, questions) {
      const list = keepValid(slug, questions || [], false);
      const b = banks.get(slug);
      if (!b) { pending.set(slug, (pending.get(slug) || []).concat(list)); return; }
      b.questions = merge(slug, b.questions, list);
    },
    get(slug) { return banks.get(slug) || null; },
    list() { return [...banks.values()].sort((a, b) => (a.number || 99) - (b.number || 99)); },
    clear() { banks.clear(); pending.clear(); },
  };

  const api = {
    TYPES: TYPES,
    LEVELS: LEVELS,
    GATES: Object.keys(GATES),
    SYMBOLS: SYMBOLS,
    WAVES: WAVES,
    CIRCUITS: CIRCUITS,
    BLOCKS: BLOCKS,
    BAND_COLORS: BAND_COLORS,
    rng: rng,
    shuffle: shuffle,
    scramble: scramble,
    parseExpr: parseExpr,
    evalExpr: evalExpr,
    exprInputs: exprInputs,
    truthRows: truthRows,
    resistorValue: resistorValue,
    formatNumber: formatNumber,
    formatOhms: formatOhms,
    parseNumber: parseNumber,
    toleranceOf: toleranceOf,
    toBinary: toBinary,
    check: check,
    answerText: answerText,
    pick: pick,
    pickMixed: pickMixed,
    medal: medal,
    validateFigure: validateFigure,
    validateQuestion: validateQuestion,
    validateBank: validateBank,
    lintQuestion: lintQuestion,
    QuizBank: QuizBank,
  };
  root.QuizCore = api;
  root.QuizBank = QuizBank;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
