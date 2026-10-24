/*
 * Figure del quiz: disegni SVG generati dal codice (simboli elettrici, resistori,
 * porte e circuiti logici, forme d'onda, circuiti, chip, codice, schede perforate,
 * schemi a blocchi). Nessuna immagine esterna; i colori vengono dal tema.
 * Le descrizioni per i lettori di schermo dicono cosa si vede senza dare la risposta.
 */
(function (root) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const Core = root.QuizCore;

  function s(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // Id unici per ogni disegno: due figure uguali sulla pagina (per esempio mentre una domanda
  // lascia il posto alla successiva) non devono contendersi gradienti, ritagli e motivi.
  let idSeq = 0;
  const uniq = (name) => name + '-' + (++idSeq);

  function text(parent, x, y, str, attrs) {
    const t = s('text', Object.assign({ x: x, y: y }, attrs || {}), parent);
    t.textContent = str;
    return t;
  }

  function svgRoot(w, h, label, cls) {
    const el = s('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'img', 'aria-label': label, class: 'qz-svg ' + (cls || '') });
    el.style.setProperty('--w', w);
    return el;
  }

  function wrap(kind, child, caption) {
    const fig = document.createElement('figure');
    fig.className = 'qz-fig qz-fig-' + kind;
    fig.append(child);
    if (caption) {
      const c = document.createElement('figcaption');
      c.textContent = caption;
      fig.append(c);
    }
    return fig;
  }

  const r1 = (x) => Math.round(x * 10) / 10;

  /* ---------- simboli: corpi a due terminali, centrati in (0,0) e orizzontali ---------- */

  // half: mezza lunghezza del corpo, i fili arrivano fino a ±half.
  const BODIES = {
    resistor: { half: 24, draw: (g) => s('rect', { x: -24, y: -8, width: 48, height: 16 }, g) },
    potentiometer: {
      half: 24,
      draw: (g) => {
        s('rect', { x: -24, y: -8, width: 48, height: 16 }, g);
        s('path', { d: 'M0 -27 V-10', class: 'qz-lead' }, g);
        s('path', { d: 'M-4 -15 L0 -9 L4 -15 Z', class: 'qz-fill' }, g);
      },
    },
    capacitor: { half: 6, draw: (g) => s('path', { d: 'M-6 -15 V15 M6 -15 V15', class: 'qz-thick' }, g) },
    electrolytic: {
      half: 8,
      draw: (g) => {
        s('rect', { x: -9, y: -15, width: 6, height: 30 }, g);
        s('rect', { x: 3, y: -15, width: 6, height: 30, class: 'qz-fill' }, g);
        text(g, -17, -14, '+', { class: 'qz-sym-t' });
      },
    },
    inductor: { half: 26, draw: (g) => s('path', { d: 'M-26 0 a6.5 6.5 0 0 1 13 0 a6.5 6.5 0 0 1 13 0 a6.5 6.5 0 0 1 13 0 a6.5 6.5 0 0 1 13 0' }, g) },
    diode: { half: 12, draw: (g) => diodeBody(g) },
    led: {
      half: 12,
      draw: (g) => {
        diodeBody(g);
        arrow(g, -1, -15, 8, -26);
        arrow(g, 7, -12, 16, -23);
      },
    },
    photodiode: {
      half: 12,
      draw: (g) => {
        diodeBody(g);
        arrow(g, 9, -28, 1, -17);
        arrow(g, 17, -25, 9, -14);
      },
    },
    zener: {
      half: 12,
      draw: (g) => {
        s('path', { d: 'M-12 -13 L-12 13 L12 0 Z', class: 'qz-tint' }, g);
        s('path', { d: 'M6 -17 L12 -13 V13 L18 17' }, g);
      },
    },
    battery: {
      half: 10,
      draw: (g) => {
        s('path', { d: 'M-10 -16 V16 M4 -16 V16' }, g);
        s('path', { d: 'M-3 -8 V8 M11 -8 V8', class: 'qz-thick' }, g);
        text(g, -17, -14, '+', { class: 'qz-sym-t' });
      },
    },
    'ac-source': {
      half: 15,
      draw: (g) => {
        s('circle', { cx: 0, cy: 0, r: 15 }, g);
        s('path', { d: 'M-9 0 C-6 -10 -3 -10 0 0 S6 10 9 0' }, g);
      },
    },
    switch: {
      half: 16,
      draw: (g, o) => {
        s('circle', { cx: -16, cy: 0, r: 2.6, class: 'qz-fill' }, g);
        s('circle', { cx: 16, cy: 0, r: 2.6, class: 'qz-fill' }, g);
        s('path', { d: o && o.closed ? 'M-16 0 L16 0' : 'M-16 0 L13 -15', class: 'qz-blade' }, g);
      },
    },
    pushbutton: {
      half: 16,
      draw: (g) => {
        s('circle', { cx: -16, cy: 0, r: 2.6, class: 'qz-fill' }, g);
        s('circle', { cx: 16, cy: 0, r: 2.6, class: 'qz-fill' }, g);
        s('path', { d: 'M-19 -9 H19 M0 -9 V-21 M-7 -21 H7' }, g);
      },
    },
    lamp: {
      half: 14,
      draw: (g) => {
        s('circle', { cx: 0, cy: 0, r: 14, class: 'qz-lamp' }, g);
        s('path', { d: 'M-9.9 -9.9 L9.9 9.9 M-9.9 9.9 L9.9 -9.9' }, g);
      },
    },
    fuse: {
      half: 18,
      draw: (g) => {
        s('rect', { x: -18, y: -7, width: 36, height: 14 }, g);
        s('path', { d: 'M-18 0 H18' }, g);
      },
    },
    crystal: {
      half: 11,
      draw: (g) => {
        s('path', { d: 'M-11 -14 V14 M11 -14 V14' }, g);
        s('rect', { x: -6, y: -11, width: 12, height: 22 }, g);
      },
    },
    motor: { half: 15, draw: (g) => letterCircle(g, 'M') },
    voltmeter: { half: 15, draw: (g) => letterCircle(g, 'V') },
    ammeter: { half: 15, draw: (g) => letterCircle(g, 'A') },
  };

  function diodeBody(g) {
    s('path', { d: 'M-12 -13 L-12 13 L12 0 Z', class: 'qz-tint' }, g);
    s('path', { d: 'M12 -13 V13' }, g);
  }

  function letterCircle(g, letter) {
    s('circle', { cx: 0, cy: 0, r: 15 }, g);
    text(g, 0, 5.5, letter, { class: 'qz-sym-t qz-sym-big', 'text-anchor': 'middle' });
  }

  function arrow(g, x1, y1, x2, y2) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const h = 5;
    const p1 = [x2 - h * Math.cos(a - 0.45), y2 - h * Math.sin(a - 0.45)];
    const p2 = [x2 - h * Math.cos(a + 0.45), y2 - h * Math.sin(a + 0.45)];
    s('path', { d: 'M' + r1(x1) + ' ' + r1(y1) + ' L' + r1(x2) + ' ' + r1(y2), class: 'qz-thin' }, g);
    s('path', { d: 'M' + r1(x2) + ' ' + r1(y2) + ' L' + r1(p1[0]) + ' ' + r1(p1[1]) + ' L' + r1(p2[0]) + ' ' + r1(p2[1]) + ' Z', class: 'qz-fill' }, g);
  }

  // Disegna un componente a due terminali tra due punti, con i fili fino al corpo.
  function place(g, kind, x1, y1, x2, y2, opts) {
    const b = BODIES[kind];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    s('path', { d: 'M' + r1(x1) + ' ' + r1(y1) + ' L' + r1(mx - ux * b.half) + ' ' + r1(my - uy * b.half) + ' M' + r1(mx + ux * b.half) + ' ' + r1(my + uy * b.half) + ' L' + r1(x2) + ' ' + r1(y2) }, g);
    const body = s('g', { transform: 'translate(' + r1(mx) + ' ' + r1(my) + ') rotate(' + r1(Math.atan2(uy, ux) * 180 / Math.PI) + ')' }, g);
    b.draw(body, opts);
    return body;
  }

  /* ---------- simboli a più terminali, in una cornice 120×60 ---------- */

  const MULTI = {
    npn: (g) => bjt(g, true),
    pnp: (g) => bjt(g, false),
    nmos: (g) => mos(g, true),
    pmos: (g) => mos(g, false),
    opamp: (g) => {
      s('path', { d: 'M38 6 L38 54 L86 30 Z', class: 'qz-tint' }, g);
      s('path', { d: 'M8 18 H38 M8 42 H38 M86 30 H112' }, g);
      text(g, 44, 22, '−', { class: 'qz-sym-t' });
      text(g, 44, 46, '+', { class: 'qz-sym-t' });
    },
    transformer: (g) => {
      s('path', { d: 'M28 4 H44 a5.5 5.5 0 0 1 0 11 a5.5 5.5 0 0 1 0 11 a5.5 5.5 0 0 1 0 11 a5.5 5.5 0 0 1 0 11 H28' }, g);
      s('path', { d: 'M92 4 H76 a5.5 5.5 0 0 0 0 11 a5.5 5.5 0 0 0 0 11 a5.5 5.5 0 0 0 0 11 a5.5 5.5 0 0 0 0 11 H92' }, g);
      s('path', { d: 'M57 4 V56 M63 4 V56' }, g);
    },
    relay: (g) => {
      s('rect', { x: 18, y: 20, width: 26, height: 20 }, g);
      s('path', { d: 'M31 2 V20 M31 40 V58' }, g);
      s('path', { d: 'M86 58 V44 M86 16 V2' }, g);
      s('circle', { cx: 86, cy: 44, r: 2.6, class: 'qz-fill' }, g);
      s('circle', { cx: 86, cy: 16, r: 2.6, class: 'qz-fill' }, g);
      s('path', { d: 'M86 44 L99 19', class: 'qz-blade' }, g);
      s('path', { d: 'M44 30 H92', class: 'qz-dash' }, g);
    },
    ground: (g) => {
      s('path', { d: 'M60 4 V30 M42 30 H78 M49 38 H71 M56 46 H64' }, g);
    },
    antenna: (g) => {
      s('path', { d: 'M60 58 V8 M44 8 L60 30 L76 8' }, g);
    },
    speaker: (g) => {
      s('path', { d: 'M8 25 H44 M8 35 H44' }, g);
      s('rect', { x: 44, y: 20, width: 12, height: 20 }, g);
      s('path', { d: 'M56 20 L74 6 V54 L56 40', class: 'qz-tint' }, g);
    },
  };

  function bjt(g, npn) {
    s('circle', { cx: 66, cy: 30, r: 22 }, g);
    s('path', { d: 'M8 30 H56 M56 16 V44', class: 'qz-thickish' }, g);
    s('path', { d: 'M56 22 L76 10 V2 M56 38 L76 50 V58' }, g);
    if (npn) arrowHead(g, 56, 38, 76, 50, 0.72);
    else arrowHead(g, 76, 50, 56, 38, 0.6);
    text(g, 14, 25, 'B', { class: 'qz-sym-s' });
    text(g, 82, 10, 'C', { class: 'qz-sym-s' });
    text(g, 82, 56, 'E', { class: 'qz-sym-s' });
  }

  function mos(g, nch) {
    s('path', { d: 'M8 44 H46 M46 18 V44', class: 'qz-thickish' }, g);
    s('path', { d: 'M54 14 V22 M54 26 V34 M54 38 V46', class: 'qz-thickish' }, g);
    s('path', { d: 'M54 18 H76 V2 M54 42 H76 V58 M54 30 H76 V42' }, g);
    if (nch) arrowHead(g, 76, 30, 54, 30, 0.75);
    else arrowHead(g, 54, 30, 76, 30, 0.75);
    text(g, 12, 39, 'G', { class: 'qz-sym-s' });
    text(g, 82, 10, 'D', { class: 'qz-sym-s' });
    text(g, 82, 56, 'S', { class: 'qz-sym-s' });
  }

  // Punta di freccia piena sul segmento (x1,y1)→(x2,y2), alla frazione at.
  function arrowHead(g, x1, y1, x2, y2, at) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const tx = x1 + (x2 - x1) * at;
    const ty = y1 + (y2 - y1) * at;
    const h = 8;
    const p1 = [tx - h * Math.cos(a - 0.42), ty - h * Math.sin(a - 0.42)];
    const p2 = [tx - h * Math.cos(a + 0.42), ty - h * Math.sin(a + 0.42)];
    s('path', { d: 'M' + r1(tx) + ' ' + r1(ty) + ' L' + r1(p1[0]) + ' ' + r1(p1[1]) + ' L' + r1(p2[0]) + ' ' + r1(p2[1]) + ' Z', class: 'qz-fill' }, g);
  }

  const SYMBOL_TEXT = {
    resistor: 'un rettangolo allungato tra due fili',
    potentiometer: 'un rettangolo tra due fili, con una freccia che lo tocca dall\'alto',
    capacitor: 'due piastre parallele uguali separate da uno spazio',
    electrolytic: 'due piastre parallele, una vuota e una piena, con il segno + vicino alla piastra vuota',
    inductor: 'una fila di archi, come una molla vista di lato',
    diode: 'un triangolo che punta verso una barretta',
    led: 'un triangolo che punta verso una barretta, con due frecce che escono verso l\'esterno',
    photodiode: 'un triangolo che punta verso una barretta, con due frecce che entrano verso il simbolo',
    zener: 'un triangolo che punta verso una barretta con le estremità piegate',
    battery: 'due coppie di piastre, ognuna con una piastra lunga e sottile e una corta e spessa; il segno + è accanto a una piastra lunga',
    'ac-source': 'un cerchio con dentro un\'onda',
    ground: 'un filo verticale che termina con tre linee orizzontali sempre più corte',
    switch: 'un filo interrotto da una lamella sollevata',
    pushbutton: 'due contatti con sopra una barretta collegata a un tasto',
    lamp: 'un cerchio con una X dentro',
    fuse: 'un rettangolo attraversato per il lungo da un filo',
    npn: 'un cerchio con tre terminali B, C, E; la freccia sul terminale E punta verso l\'esterno',
    pnp: 'un cerchio con tre terminali B, C, E; la freccia sul terminale E punta verso l\'interno',
    nmos: 'tre terminali G, D, S; il canale è spezzato in tre tratti e la freccia punta verso il canale',
    pmos: 'tre terminali G, D, S; il canale è spezzato in tre tratti e la freccia si allontana dal canale',
    opamp: 'un triangolo con due ingressi a sinistra, segnati − e +, e un\'uscita a destra',
    transformer: 'due avvolgimenti affiancati separati da due linee parallele',
    crystal: 'un rettangolino tra due piastre parallele',
    speaker: 'un piccolo rettangolo da cui si allarga un cono',
    motor: 'un cerchio con dentro la lettera M',
    voltmeter: 'un cerchio con dentro la lettera V',
    ammeter: 'un cerchio con dentro la lettera A',
    relay: 'un rettangolo collegato con una linea tratteggiata a un interruttore',
    antenna: 'un filo verticale che termina con un triangolo aperto verso l\'alto',
  };

  function symbolFigure(f) {
    const svg = svgRoot(120, 60, 'Simbolo elettrico: ' + (SYMBOL_TEXT[f.name] || f.name), 'qz-ink qz-symbol');
    const g = s('g', { class: 'qz-draw' }, svg);
    if (BODIES[f.name]) {
      place(g, f.name, 6, 32, 114, 32);
    } else if (MULTI[f.name]) {
      MULTI[f.name](g);
    }
    return wrap('symbol', svg, f.caption);
  }

  /* ---------- resistore con le bande colorate ---------- */

  const BAND_RGB = {
    nero: '#151515', marrone: '#7a4526', rosso: '#d12f2a', arancione: '#f07e22', giallo: '#f3cd22', verde: '#23944a',
    blu: '#2a62cf', viola: '#8a4bc4', grigio: '#8b8e92', bianco: '#fbfbf8', oro: '#c9a23a', argento: '#b9bec4',
  };

  function resistorFigure(f) {
    const bands = f.bands;
    const svg = svgRoot(260, 84, 'Resistore con ' + bands.length + ' bande colorate, da sinistra: ' + bands.join(', '), 'qz-resistor');
    const defs = s('defs', null, svg);
    const grad = (id, stops) => {
      const lg = s('linearGradient', { id: id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      stops.forEach(([o, c]) => s('stop', { offset: o, 'stop-color': c }, lg));
    };
    const id = { oro: uniq('qz-gold'), argento: uniq('qz-silver'), body: uniq('qz-body'), clip: uniq('qz-rclip') };
    grad(id.oro, [[0, '#f6e08a'], [0.45, '#c9a23a'], [1, '#8c6a14']]);
    grad(id.argento, [[0, '#f4f6f8'], [0.45, '#b9bec4'], [1, '#80868d']]);
    grad(id.body, [[0, 'rgba(255,255,255,.55)'], [0.35, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.22)']]);
    const clip = s('clipPath', { id: id.clip }, defs);
    const bodyPath = 'M60 26 C60 14 82 14 86 22 H174 C178 14 200 14 200 26 V58 C200 70 178 70 174 62 H86 C82 70 60 70 60 58 Z';
    s('path', { d: bodyPath }, clip);
    s('rect', { x: 0, y: 0, width: 260, height: 84, rx: 12, class: 'qz-plate' }, svg);
    s('path', { d: 'M8 42 H62 M198 42 H252', class: 'qz-wire-metal' }, svg);
    const five = bands.length === 5;
    s('path', { d: bodyPath, fill: five ? '#7fa8d6' : '#d8c08f' }, svg);
    const g = s('g', { 'clip-path': 'url(#' + id.clip + ')' }, svg);
    const xs = five ? [80, 99, 118, 137, 172] : [84, 106, 128, 172];
    bands.forEach((c, i) => {
      s('rect', { x: xs[i], y: 10, width: 11, height: 64, fill: id[c] ? 'url(#' + id[c] + ')' : BAND_RGB[c], class: c === 'bianco' ? 'qz-band-white' : '' }, g);
    });
    s('path', { d: bodyPath, fill: 'url(#' + id.body + ')' }, svg);
    s('path', { d: bodyPath, class: 'qz-resistor-edge' }, svg);
    return wrap('resistor', svg, f.caption);
  }

  /* ---------- porte logiche ---------- */

  const INVERTED = { NAND: 1, NOR: 1, XNOR: 1, NOT: 1 };
  const OR_LIKE = { OR: 1, NOR: 1, XOR: 1, XNOR: 1 };
  const XOR_LIKE = { XOR: 1, XNOR: 1 };

  // Disegna il corpo di una porta con il retro in x0, alta h, centrata in yc; restituisce le x dei pin.
  function gateShape(g, type, x0, yc, w, h) {
    const y0 = yc - h / 2;
    const y1 = yc + h / 2;
    const bubble = INVERTED[type] ? 5 : 0;
    const bodyW = w - bubble * 2;
    let d;
    if (type === 'NOT' || type === 'BUF') {
      d = 'M' + x0 + ' ' + y0 + ' L' + (x0 + bodyW) + ' ' + yc + ' L' + x0 + ' ' + y1 + ' Z';
    } else if (OR_LIKE[type]) {
      d = 'M' + x0 + ' ' + y0 + ' Q' + r1(x0 + bodyW * 0.62) + ' ' + y0 + ' ' + (x0 + bodyW) + ' ' + yc +
        ' Q' + r1(x0 + bodyW * 0.62) + ' ' + y1 + ' ' + x0 + ' ' + y1 + ' Q' + r1(x0 + bodyW * 0.28) + ' ' + yc + ' ' + x0 + ' ' + y0 + ' Z';
    } else {
      d = 'M' + x0 + ' ' + y0 + ' H' + r1(x0 + bodyW / 2) + ' A' + r1(bodyW / 2) + ' ' + r1(h / 2) + ' 0 0 1 ' + r1(x0 + bodyW / 2) + ' ' + y1 + ' H' + x0 + ' Z';
    }
    s('path', { d: d, class: 'qz-gate-body' }, g);
    if (XOR_LIKE[type]) {
      s('path', { d: 'M' + (x0 - 7) + ' ' + y0 + ' Q' + r1(x0 - 7 + bodyW * 0.28) + ' ' + yc + ' ' + (x0 - 7) + ' ' + y1, class: 'qz-gate-line' }, g);
    }
    if (bubble) s('circle', { cx: x0 + bodyW + bubble, cy: yc, r: bubble, class: 'qz-gate-body' }, g);
    // x del punto in cui un filo d'ingresso tocca il retro, alla quota y
    const back = (y) => {
      if (!OR_LIKE[type]) return x0;
      const t = (y - y0) / h;
      return r1((XOR_LIKE[type] ? x0 - 7 : x0) + 2 * (1 - t) * t * bodyW * 0.28);
    };
    return { back: back, out: x0 + w };
  }

  const GATE_TEXT = {
    AND: 'corpo a forma di D', NAND: 'corpo a forma di D con un cerchietto all\'uscita',
    OR: 'corpo a punta con il retro incurvato', NOR: 'corpo a punta con il retro incurvato e un cerchietto all\'uscita',
    XOR: 'corpo a punta con il retro incurvato e un secondo arco staccato dietro',
    XNOR: 'corpo a punta con il retro incurvato, un secondo arco dietro e un cerchietto all\'uscita',
    NOT: 'triangolo con un cerchietto all\'uscita', BUF: 'triangolo senza cerchietto',
  };

  function gateFigure(f) {
    const one = f.gate === 'NOT' || f.gate === 'BUF';
    const svg = svgRoot(180, 96, 'Porta logica: ' + GATE_TEXT[f.gate] + (one ? ', un ingresso A e un\'uscita Y' : ', ingressi A e B, uscita Y'), 'qz-scope qz-gate');
    const g = s('g', { class: 'qz-draw' }, svg);
    const pin = gateShape(g, f.gate, 62, 48, 62, 54);
    const ins = one ? [48] : [36, 60];
    ins.forEach((y, i) => {
      s('path', { d: 'M22 ' + y + ' H' + pin.back(y), class: 'qz-gate-line' }, g);
      text(g, 12, y + 4, one ? 'A' : 'AB'[i], { class: 'qz-gate-t' });
    });
    s('path', { d: 'M' + pin.out + ' 48 H156', class: 'qz-gate-line' }, g);
    text(g, 162, 52, 'Y', { class: 'qz-gate-t' });
    return wrap('gate', svg, f.caption);
  }

  /* ---------- circuiti logici da un'espressione, con i fili che si accendono ---------- */

  function logicDiagram(expr, opts) {
    const tree = Core.parseExpr(expr);
    const leaves = [];
    const gates = [];
    (function walk(node, depth) {
      node.depth = depth;
      if (node.input) { node.row = leaves.length; leaves.push(node); return; }
      gates.push(node);
      node.args.forEach((a) => walk(a, depth + 1));
    })(tree, 0);
    const maxDepth = Math.max(0, ...gates.map((gt) => gt.depth));
    const ROW = 46;
    const COL = 104;
    const GW = 58;
    const X_IN = 14;
    const X_G0 = X_IN + 64;
    const H = Math.max(2, leaves.length) * ROW + 24;
    const xOf = (node) => X_G0 + (maxDepth - node.depth) * COL;
    const outX = (tree.input ? X_IN + 70 : xOf(tree) + GW) + 34;
    const W = outX + 46;
    (function place(node) {
      if (node.input) { node.y = 12 + node.row * ROW + ROW / 2; return node.y; }
      const ys = node.args.map(place);
      node.y = (Math.min(...ys) + Math.max(...ys)) / 2;
      return node.y;
    })(tree);

    const names = Core.exprInputs(tree);
    const label = (opts && opts.label) || ('Circuito logico con ' + gates.length + (gates.length === 1 ? ' porta' : ' porte') + ', ingressi ' + names.join(', ') + ' e un\'uscita');
    const svg = svgRoot(W, H, label, 'qz-scope qz-logic');
    const wires = s('g', { class: 'qz-wires' }, svg);
    const bodies = s('g', { class: 'qz-draw' }, svg);
    const wireEls = [];

    // Ritardo di propagazione, in passi: i fili degli ingressi subito, poi una colonna di porte alla volta.
    const stepOf = (node) => (node.input ? 0 : maxDepth - node.depth + 1);
    function wire(from, d) {
      const p = s('path', { d: d, class: 'qz-wire' }, wires);
      p.style.setProperty('--d', stepOf(from));
      wireEls.push({ node: from, el: p });
    }

    const termEls = [];
    leaves.forEach((leaf) => {
      const t = s('g', { class: 'qz-term', 'data-input': leaf.input }, svg);
      s('rect', { x: X_IN, y: leaf.y - 13, width: 44, height: 26, rx: 7 }, t);
      text(t, X_IN + 13, leaf.y + 5, leaf.input, { class: 'qz-term-name', 'text-anchor': 'middle' });
      const v = text(t, X_IN + 33, leaf.y + 5, '0', { class: 'qz-term-val', 'text-anchor': 'middle' });
      termEls.push({ node: leaf, el: t, val: v });
    });

    gates.forEach((gt) => {
      const k = gt.args.length;
      const h = Math.max(38, k * 16 + 10);
      const x = xOf(gt);
      const pin = gateShape(bodies, gt.gate, x, gt.y, GW, h);
      gt.out = pin.out;
      gt.args.forEach((child, j) => {
        const py = gt.y + (j - (k - 1) / 2) * 16;
        const sx = child.input ? X_IN + 44 : xOf(child) + GW;
        const ex = pin.back(py);
        const mx = ex - 14;
        const d = Math.abs(child.y - py) < 0.5
          ? 'M' + sx + ' ' + child.y + ' H' + ex
          : 'M' + sx + ' ' + child.y + ' H' + mx + ' V' + r1(py) + ' H' + ex;
        wire(child, d);
      });
    });
    const outStart = tree.input ? X_IN + 44 : tree.out;
    wire(tree, 'M' + outStart + ' ' + tree.y + ' H' + (outX - 14));
    const led = s('g', { class: 'qz-led' }, svg);
    const steps = stepOf(tree) + 0.6;
    led.style.setProperty('--d', steps);
    s('circle', { cx: outX, cy: tree.y, r: 13, class: 'qz-led-glow' }, led);
    s('circle', { cx: outX, cy: tree.y, r: 9, class: 'qz-led-core' }, led);
    text(svg, outX, tree.y + 30, 'Y', { class: 'qz-gate-t', 'text-anchor': 'middle' });

    function update(env) {
      const val = (node) => Core.evalExpr(node, env);
      wireEls.forEach((w) => w.el.classList.toggle('on', val(w.node) === 1));
      termEls.forEach((t) => {
        const v = val(t.node);
        t.el.classList.toggle('on', v === 1);
        t.val.textContent = String(v);
      });
      led.classList.toggle('on', val(tree) === 1);
      return val(tree);
    }
    update({});
    return { el: svg, update: update, names: names, terminals: termEls, steps: steps };
  }

  function logicFigure(f) {
    const d = logicDiagram(f.expr);
    d.update({});
    return wrap('logic', d.el, f.caption);
  }

  /* ---------- forme d'onda sullo schermo dell'oscilloscopio ---------- */

  const WAVE_TEXT = {
    sine: 'un segnale che sale e scende in modo morbido e regolare',
    square: 'un segnale che salta tra due livelli, alto e basso per tempi uguali',
    triangle: 'un segnale che sale e scende in linea retta, a zig-zag',
    sawtooth: 'un segnale che sale in linea retta e poi crolla di colpo',
    pwm: 'un segnale rettangolare che resta alto per una parte del periodo',
    dc: 'una linea piatta sopra la linea tratteggiata dello zero',
    'half-wave': 'gobbe arrotondate separate da tratti piatti sullo zero',
    'full-wave': 'gobbe arrotondate una dopo l\'altra, tutte sopra lo zero',
    sampled: 'una curva morbida con dei punti presi a intervalli regolari',
    am: 'un\'oscillazione veloce la cui ampiezza cresce e cala lentamente',
    fm: 'un\'oscillazione di ampiezza costante che si fa più fitta e più rada',
    'clock-data': 'due tracce: CLK, un\'onda quadra regolare, e DATA, che cambia livello in corrispondenza del clock',
    differential: 'due tracce speculari D+ e D−: quando una sale l\'altra scende',
  };

  function waveFigure(f) {
    const W = 320;
    const H = 150;
    const shape = f.shape;
    const cycles = f.cycles || (shape === 'am' || shape === 'fm' ? 2 : 3);
    const desc = 'Oscilloscopio: ' + WAVE_TEXT[shape] + (shape === 'pwm' ? ', alto per ' + Math.round((f.duty || 0.25) * 100) + '% del periodo' : '') + (f.label ? ' (' + f.label + ')' : '');
    const svg = svgRoot(W, H, desc, 'qz-scope qz-wave');
    const grid = s('g', { class: 'qz-grid' }, svg);
    for (let x = 0; x <= W; x += 32) s('path', { d: 'M' + x + ' 0 V' + H }, grid);
    for (let y = 15; y <= H; y += 30) s('path', { d: 'M0 ' + y + ' H' + W, class: y === 75 ? 'mid' : '' }, grid);
    const two = shape === 'clock-data' || shape === 'differential';
    const x0 = two ? 50 : 14;
    const x1 = W - 14;
    const w = x1 - x0;
    const mid = 75;
    const amp = 46;
    const frac = (v) => v - Math.floor(v);
    const traces = [];

    function curve(fn, steps) {
      let d = '';
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        d += (i ? ' L' : 'M') + r1(x0 + t * w) + ' ' + r1(fn(t));
      }
      return d;
    }
    function rect(duty, n, hi, lo) {
      let d = 'M' + x0 + ' ' + hi;
      for (let k = 0; k < n; k++) {
        const xa = r1(x0 + (k + duty) * w / n);
        const xb = r1(x0 + (k + 1) * w / n);
        d += ' L' + xa + ' ' + hi + ' L' + xa + ' ' + lo + ' L' + xb + ' ' + lo;
        if (k < n - 1) d += ' L' + xb + ' ' + hi;
      }
      return d;
    }
    function bitsPath(bits, hi, lo) {
      const n = bits.length;
      let d = '';
      bits.forEach((b, k) => {
        const y = b ? hi : lo;
        const xa = r1(x0 + k * w / n);
        const xb = r1(x0 + (k + 1) * w / n);
        d += (k ? ' L' + xa + ' ' + y : 'M' + xa + ' ' + y) + ' L' + xb + ' ' + y;
      });
      return d;
    }
    const zero = (y) => s('path', { d: 'M' + x0 + ' ' + y + ' H' + x1, class: 'qz-zero' }, svg);

    switch (shape) {
      case 'sine': traces.push(curve((t) => mid - amp * Math.sin(2 * Math.PI * cycles * t), 240)); break;
      case 'square': traces.push(rect(0.5, cycles, mid - amp, mid + amp)); break;
      case 'pwm': traces.push(rect(f.duty || 0.25, cycles, mid - amp, mid + amp)); break;
      case 'triangle': traces.push(curve((t) => { const p = frac(cycles * t); return mid - amp * (p < 0.5 ? 4 * p - 1 : 3 - 4 * p); }, cycles * 40)); break;
      case 'sawtooth': {
        let d = 'M' + x0 + ' ' + (mid + amp);
        for (let k = 0; k < cycles; k++) {
          const xb = r1(x0 + (k + 1) * w / cycles);
          d += ' L' + xb + ' ' + (mid - amp);
          if (k < cycles - 1) d += ' L' + xb + ' ' + (mid + amp);
        }
        traces.push(d);
        break;
      }
      case 'dc': zero(mid + amp); traces.push('M' + x0 + ' ' + (mid - 20) + ' H' + x1); break;
      case 'half-wave': zero(120); traces.push(curve((t) => 120 - 92 * Math.max(0, Math.sin(2 * Math.PI * cycles * t)), 300)); break;
      case 'full-wave': zero(120); traces.push(curve((t) => 120 - 92 * Math.abs(Math.sin(2 * Math.PI * cycles * t)), 300)); break;
      case 'sampled': {
        s('path', { d: curve((t) => mid - amp * Math.sin(2 * Math.PI * cycles * t), 240), class: 'qz-trace dim' }, svg);
        const n = cycles * 8;
        const g = s('g', { class: 'qz-samples' }, svg);
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          const x = r1(x0 + t * w);
          const y = r1(mid - amp * Math.sin(2 * Math.PI * cycles * t));
          s('path', { d: 'M' + x + ' ' + mid + ' V' + y }, g);
          s('circle', { cx: x, cy: y, r: 3.2, style: '--i:' + i }, g);
        }
        break;
      }
      case 'am': {
        const env = (t) => 0.55 + 0.4 * Math.sin(2 * Math.PI * cycles * t);
        s('path', { d: curve((t) => mid - amp * env(t), 200) + ' M' + x0 + ' ' + r1(mid + amp * env(0)) + curve((t) => mid + amp * env(t), 200).replace(/^M[^L]*/, ''), class: 'qz-trace env' }, svg);
        traces.push(curve((t) => mid - amp * env(t) * Math.sin(2 * Math.PI * cycles * 9 * t), 700));
        break;
      }
      case 'fm': traces.push(curve((t) => mid - amp * Math.sin(2 * Math.PI * cycles * 5 * t + 3.4 * Math.sin(2 * Math.PI * cycles * t)), 800)); break;
      case 'clock-data': {
        traces.push({ d: rect(0.5, 8, 22, 50), cls: 'ch3' });
        traces.push({ d: bitsPath([1, 0, 1, 1, 0, 0, 1, 0], 98, 126), cls: '' });
        text(svg, 8, 41, 'CLK', { class: 'qz-ch' });
        text(svg, 8, 117, 'DATA', { class: 'qz-ch' });
        break;
      }
      case 'differential': {
        const bits = [1, 0, 0, 1, 0, 1, 1, 0];
        traces.push({ d: bitsPath(bits, 52, 98), cls: '' });
        traces.push({ d: bitsPath(bits.map((b) => 1 - b), 52, 98), cls: 'ch2' });
        text(svg, 8, 56, 'D+', { class: 'qz-ch' });
        text(svg, 8, 102, 'D−', { class: 'qz-ch ch2' });
        break;
      }
      default: break;
    }
    traces.forEach((t) => {
      const tr = typeof t === 'string' ? { d: t, cls: '' } : t;
      s('path', { d: tr.d, class: 'qz-trace qz-draw-path ' + tr.cls, pathLength: 1 }, svg);
    });
    if (f.label) text(svg, W - 10, 14, f.label, { class: 'qz-ch', 'text-anchor': 'end' });
    s('rect', { x: 0, y: 0, width: 3, height: H, class: 'qz-sweep' }, svg);
    return wrap('wave', svg, f.caption);
  }

  /* ---------- circuiti con componenti ---------- */

  function label(g, x, y, str, anchor) {
    return text(g, x, y, str, { class: 'qz-cl', 'text-anchor': anchor || 'middle' });
  }
  function terminal(g, x, y, name, below) {
    s('circle', { cx: x, cy: y, r: 4.5, class: 'qz-terminal' }, g);
    if (name) label(g, x, below ? y + 20 : y - 10, name);
  }
  function wireLine(g, d) { s('path', { d: d }, g); }
  function dot(g, x, y) { s('circle', { cx: x, cy: y, r: 3, class: 'qz-fill' }, g); }

  const CIRCUIT_TEXT = {
    series: (f) => 'Circuito: tra i morsetti A e B ci sono ' + f.values.length + ' resistori uno dopo l\'altro: ' + f.values.join(', '),
    parallel: (f) => 'Circuito: tra i morsetti A e B ci sono ' + f.values.length + ' resistori affiancati, collegati agli stessi due punti: ' + f.values.join(', '),
    divider: (f) => 'Circuito: generatore da ' + f.vin + ' collegato a due resistori in fila, R1 da ' + f.r1 + ' in alto e R2 da ' + f.r2 + ' in basso; Vout si misura ai capi di R2',
    led: (f) => 'Circuito: batteria da ' + f.v + ', un resistore da ' + f.r + ' e un LED collegati in un unico anello',
    rc: (f) => 'Circuito: batteria da ' + f.v + ', un interruttore, un resistore da ' + f.r + ' e un condensatore da ' + f.c + ' in un unico anello',
    'switches-series': () => 'Circuito: batteria, due interruttori A e B uno dopo l\'altro sullo stesso filo e una lampadina',
    'switches-parallel': () => 'Circuito: batteria, due interruttori A e B su due rami affiancati e una lampadina',
  };

  function circuitFigure(f) {
    const svg = svgRoot(300, 170, CIRCUIT_TEXT[f.topo](f), 'qz-ink qz-circuit');
    const g = s('g', { class: 'qz-draw' }, svg);
    switch (f.topo) {
      case 'series': {
        const n = f.values.length;
        const seg = 248 / n;
        terminal(g, 22, 85, 'A', true);
        terminal(g, 278, 85, 'B', true);
        for (let i = 0; i < n; i++) {
          const xa = 26 + i * seg;
          place(g, 'resistor', xa, 85, xa + seg, 85);
          label(g, xa + seg / 2, 66, 'R' + (i + 1));
          label(g, xa + seg / 2, 112, f.values[i]);
        }
        break;
      }
      case 'parallel': {
        const n = f.values.length;
        const ys = n === 2 ? [50, 120] : [30, 85, 140];
        terminal(g, 22, 85, 'A', true);
        terminal(g, 278, 85, 'B', true);
        wireLine(g, 'M26 85 H80 M220 85 H274 M80 ' + ys[0] + ' V' + ys[n - 1] + ' M220 ' + ys[0] + ' V' + ys[n - 1]);
        ys.forEach((y, i) => {
          place(g, 'resistor', 80, y, 220, y);
          label(g, 150, y - 13, 'R' + (i + 1) + ' = ' + f.values[i]);
          if (i > 0 && i < n - 1) { dot(g, 80, y); dot(g, 220, y); }
        });
        dot(g, 80, 85);
        dot(g, 220, 85);
        break;
      }
      case 'divider': {
        place(g, 'battery', 40, 30, 40, 140);
        label(g, 24, 90, f.vin, 'end');
        wireLine(g, 'M40 30 H180 M40 140 H180 M180 85 H250 M180 140 H250');
        place(g, 'resistor', 180, 30, 180, 85);
        place(g, 'resistor', 180, 85, 180, 140);
        label(g, 166, 61, 'R1 = ' + f.r1, 'end');
        label(g, 166, 116, 'R2 = ' + f.r2, 'end');
        dot(g, 180, 85);
        dot(g, 180, 140);
        terminal(g, 254, 85);
        terminal(g, 254, 140);
        s('path', { d: 'M266 92 V133' }, g);
        arrowHead(g, 266, 133, 266, 92, 1);
        arrowHead(g, 266, 92, 266, 133, 1);
        label(g, 282, 117, 'Vout');
        break;
      }
      case 'led': {
        place(g, 'battery', 40, 40, 40, 130);
        label(g, 24, 90, f.v, 'end');
        place(g, 'resistor', 40, 40, 260, 40);
        label(g, 150, 24, 'R = ' + f.r);
        place(g, 'led', 260, 40, 260, 130);
        wireLine(g, 'M260 130 H40');
        break;
      }
      case 'rc': {
        place(g, 'battery', 36, 40, 36, 130);
        label(g, 20, 90, f.v, 'end');
        place(g, 'switch', 36, 40, 130, 40);
        place(g, 'resistor', 130, 40, 260, 40);
        label(g, 195, 24, 'R = ' + f.r);
        place(g, 'capacitor', 260, 40, 260, 130);
        label(g, 236, 90, 'C = ' + f.c, 'end');
        wireLine(g, 'M260 130 H36');
        break;
      }
      case 'switches-series': {
        place(g, 'battery', 36, 40, 36, 135);
        place(g, 'switch', 36, 40, 150, 40);
        place(g, 'switch', 150, 40, 260, 40);
        label(g, 93, 18, 'A');
        label(g, 205, 18, 'B');
        place(g, 'lamp', 260, 40, 260, 135);
        wireLine(g, 'M260 135 H36');
        break;
      }
      case 'switches-parallel': {
        place(g, 'battery', 30, 60, 30, 150);
        wireLine(g, 'M30 60 H80 M80 28 V92 M210 28 V92 M210 60 H262 M262 150 H30');
        place(g, 'switch', 80, 28, 210, 28);
        place(g, 'switch', 80, 92, 210, 92);
        label(g, 145, 12, 'A');
        label(g, 145, 76, 'B');
        dot(g, 80, 60);
        dot(g, 210, 60);
        place(g, 'lamp', 262, 60, 262, 150);
        break;
      }
      default: break;
    }
    return wrap('circuit', svg, f.caption);
  }

  /* ---------- chip ---------- */

  function chipFigure(f) {
    const n = f.pins;
    if (f.package === 'qfp' && n % 4 === 0) return qfpFigure(f);
    const side = n / 2;
    const pitch = 16;
    const bodyW = side * pitch + 22;
    const W = bodyW + 36;
    const H = 132;
    const bx = 18;
    const by = 32;
    const bh = 68;
    const svg = svgRoot(W, H, 'Chip in contenitore DIP con ' + n + ' piedini, ' + side + ' per lato; sopra c\'è scritto ' + f.label + (f.note ? ' ' + f.note : ''), 'qz-chip');
    const defs = s('defs', null, svg);
    const bodyId = uniq('qz-chipbody');
    const lg = s('linearGradient', { id: bodyId, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    s('stop', { offset: 0, 'stop-color': '#3a3f45' }, lg);
    s('stop', { offset: 1, 'stop-color': '#16191c' }, lg);
    for (let i = 0; i < side; i++) {
      const x = bx + 11 + i * pitch + pitch / 2 - 3.5;
      s('rect', { x: x, y: by - 16, width: 7, height: 17, rx: 1.5, class: 'qz-pin' }, svg);
      s('rect', { x: x, y: by + bh - 1, width: 7, height: 17, rx: 1.5, class: 'qz-pin' }, svg);
    }
    s('rect', { x: bx, y: by, width: bodyW, height: bh, rx: 5, fill: 'url(#' + bodyId + ')' }, svg);
    s('path', { d: 'M' + bx + ' ' + (by + bh / 2 - 9) + ' a9 9 0 0 1 0 18', class: 'qz-notch' }, svg);
    s('circle', { cx: bx + 17, cy: by + bh - 13, r: 4, class: 'qz-notch' }, svg);
    text(svg, bx + bodyW / 2, by + bh / 2 + (f.note ? 1 : 6), f.label, { class: 'qz-chip-t', 'text-anchor': 'middle' });
    if (f.note) text(svg, bx + bodyW / 2, by + bh / 2 + 19, f.note, { class: 'qz-chip-s', 'text-anchor': 'middle' });
    text(svg, bx + 11 + pitch / 2, by + bh + 30, '1', { class: 'qz-chip-n', 'text-anchor': 'middle' });
    text(svg, bx + 11 + pitch / 2, by - 21, String(n), { class: 'qz-chip-n', 'text-anchor': 'middle' });
    return wrap('chip', svg, f.caption);
  }

  function qfpFigure(f) {
    const n = f.pins;
    const side = n / 4;
    const pitch = 10;
    const body = side * pitch + 18;
    const W = body + 64;
    const svg = svgRoot(W, W, 'Chip in contenitore quadrato QFP con ' + n + ' piedini, ' + side + ' per lato; sopra c\'è scritto ' + f.label, 'qz-chip');
    const o = 32;
    for (let i = 0; i < side; i++) {
      const p = o + 9 + i * pitch + pitch / 2 - 2.5;
      s('rect', { x: p, y: o - 14, width: 5, height: 15, class: 'qz-pin' }, svg);
      s('rect', { x: p, y: o + body - 1, width: 5, height: 15, class: 'qz-pin' }, svg);
      s('rect', { x: o - 14, y: p, width: 15, height: 5, class: 'qz-pin' }, svg);
      s('rect', { x: o + body - 1, y: p, width: 15, height: 5, class: 'qz-pin' }, svg);
    }
    s('rect', { x: o, y: o, width: body, height: body, rx: 4, fill: '#1f2327' }, svg);
    s('circle', { cx: o + 12, cy: o + 12, r: 4, class: 'qz-notch' }, svg);
    text(svg, o + body / 2, o + body / 2 + 5, f.label, { class: 'qz-chip-t', 'text-anchor': 'middle' });
    if (f.note) text(svg, o + body / 2, o + body / 2 + 23, f.note, { class: 'qz-chip-s', 'text-anchor': 'middle' });
    return wrap('chip', svg, f.caption);
  }

  /* ---------- codice ---------- */

  const KEYWORDS = new Set(('PRINT GOTO GOSUB RETURN IF THEN ELSE FOR TO STEP NEXT END LET DIM INPUT REM WHILE WEND DO LOOP UNTIL ' +
    'def return for in while if elif else print import from class self None True False and or not range lambda ' +
    'int char void float double long unsigned include define printf scanf main struct switch case break continue sizeof ' +
    'function var let const console log new this null undefined true false typeof ' +
    'program begin end writeln readln procedure integer real ' +
    'PROGRAM INTEGER REAL WRITE FORMAT CONTINUE DIMENSION CALL SUBROUTINE STOP ' +
    'IDENTIFICATION DIVISION PROCEDURE DISPLAY STOP RUN MOVE ADD PERFORM ' +
    'defun setq car cdr cons ' +
    'public static System out println String ' +
    'MOV ADD SUB INC DEC JMP JZ JNZ CMP CALL RET LD LDA STA ADC SBC BEQ BNE JSR RTS NOP HLT PUSH POP AND ORA EOR').split(' '));

  function highlight(line, codeEl) {
    const re = /("[^"]*"?|'[^']*'?)|(\b\d+(\.\d+)?\b|#?\$[0-9A-Fa-f]+\b|\b0x[0-9A-Fa-f]+\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)/g;
    const comment = /^(\s*)(REM\b.*|;.*|\/\/.*|#(?!include|define).*|\*>.*|C\s.*)$/;
    const cm = comment.exec(line);
    let body = line;
    let tail = '';
    if (cm) { body = cm[1]; tail = cm[2]; }
    let last = 0;
    let m;
    while ((m = re.exec(body))) {
      if (m.index > last) codeEl.append(body.slice(last, m.index));
      const span = document.createElement('span');
      if (m[1]) span.className = 'tk-s';
      else if (m[2]) span.className = 'tk-n';
      else span.className = KEYWORDS.has(m[4]) ? 'tk-k' : '';
      span.textContent = m[0];
      codeEl.append(span.className ? span : m[0]);
      last = m.index + m[0].length;
    }
    if (last < body.length) codeEl.append(body.slice(last));
    if (tail) {
      const c = document.createElement('span');
      c.className = 'tk-c';
      c.textContent = tail;
      codeEl.append(c);
    }
  }

  function codeFigure(f) {
    const box = document.createElement('div');
    box.className = 'qz-code';
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', 'Programma in ' + f.lang + ': ' + f.text.replace(/\n/g, ' ⏎ '));
    const bar = document.createElement('div');
    bar.className = 'qz-code-bar';
    bar.innerHTML = '<i></i><i></i><i></i>';
    const lang = document.createElement('span');
    lang.textContent = f.lang;
    bar.append(lang);
    const pre = document.createElement('pre');
    pre.setAttribute('aria-hidden', 'true');
    f.text.split('\n').forEach((line) => {
      const code = document.createElement('code');
      highlight(line, code);
      if (!line) code.append('​');
      pre.append(code);
    });
    box.append(bar, pre);
    return wrap('code', box, f.caption);
  }

  /* ---------- bit come LED ---------- */

  function bitsFigure(f) {
    const n = f.width;
    // 16 bit: due righe da 8, il byte più pesante sopra, così i pesi restano leggibili.
    const perRow = Math.min(n, 8);
    const rows = n / perRow;
    const cell = 32;
    const gap = 6;
    const nib = 10;
    const rowH = 74;
    const W = 20 + perRow * cell + (perRow - 1) * gap + Math.floor((perRow - 1) / 4) * nib;
    const H = rows * rowH + 4;
    const bits = Core.toBinary(f.value, n).split('');
    const svg = svgRoot(W, H, n + ' bit, da sinistra (il più pesante) a destra: ' + bits.join(' '), 'qz-scope qz-bits');
    bits.forEach((b, i) => {
      const k = i % perRow;
      const x = 10 + k * (cell + gap) + Math.floor(k / 4) * nib;
      const y = Math.floor(i / perRow) * rowH;
      text(svg, x + cell / 2, y + 18, String(Math.pow(2, n - 1 - i)), { class: 'qz-weight', 'text-anchor': 'middle' });
      const g = s('g', { class: 'qz-bitcell' + (b === '1' ? ' on' : ''), style: '--i:' + i }, svg);
      s('rect', { x: x, y: y + 26, width: cell, height: cell + 8, rx: 6 }, g);
      text(g, x + cell / 2, y + 26 + (cell + 8) / 2 + 6, b, { 'text-anchor': 'middle' });
    });
    return wrap('bits', svg, f.caption);
  }

  /* ---------- scheda perforata IBM a 80 colonne (codice Hollerith) ---------- */

  const ROWS = ['12', '11', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  function hollerith(ch) {
    if (ch === ' ') return [];
    if (/[0-9]/.test(ch)) return [ch];
    const c = ch.charCodeAt(0) - 65;
    if (c < 9) return ['12', String(c + 1)];
    if (c < 18) return ['11', String(c - 8)];
    return ['0', String(c - 16)];
  }

  function cardFigure(f) {
    const W = 480;
    const H = 214;
    const cols = 80;
    const left = 14;
    const pitch = (W - 2 * left) / cols;
    const top = 36;
    const rowH = 14.4;
    const punched = f.text.split('').map(hollerith);
    const desc = 'Scheda perforata a 80 colonne. Fori, colonna per colonna: ' +
      punched.map((p, i) => 'colonna ' + (i + 1) + (p.length ? ' righe ' + p.join(' e ') : ' nessun foro')).join('; ');
    const svg = svgRoot(W, H, desc, 'qz-punch');
    const defs = s('defs', null, svg);
    const colId = uniq('qz-cardcol');
    const pat = s('pattern', { id: colId, x: left, y: 0, width: pitch, height: H, patternUnits: 'userSpaceOnUse' }, defs);
    for (let r = 0; r < 10; r++) text(pat, pitch / 2, top + (r + 2) * rowH + 4, String(r), { class: 'qz-card-digit', 'text-anchor': 'middle' });
    s('path', { d: 'M14 0 H' + (W - 6) + ' Q' + W + ' 0 ' + W + ' 6 V' + (H - 6) + ' Q' + W + ' ' + H + ' ' + (W - 6) + ' ' + H + ' H6 Q0 ' + H + ' 0 ' + (H - 6) + ' V14 Z', class: 'qz-card-paper' }, svg);
    s('rect', { x: left, y: 0, width: W - 2 * left, height: H, fill: 'url(#' + colId + ')' }, svg);
    s('path', { d: 'M' + left + ' ' + (top + 2 * rowH - 6) + ' H' + (W - left), class: 'qz-card-line' }, svg);
    for (let c = 0; c < cols; c += 10) {
      text(svg, left + c * pitch + pitch / 2, H - 6, String(c + 1), { class: 'qz-card-num', 'text-anchor': 'middle' });
    }
    const holes = s('g', { class: 'qz-holes' }, svg);
    punched.forEach((rows, c) => {
      rows.forEach((row) => {
        const r = ROWS.indexOf(row);
        s('rect', { x: r1(left + c * pitch + pitch / 2 - 1.9), y: r1(top + r * rowH - 5), width: 3.8, height: 10, rx: 0.8, style: '--i:' + c }, holes);
      });
    });
    text(svg, W - 18, 20, 'IBM', { class: 'qz-card-brand', 'text-anchor': 'end' });
    return wrap('card', svg, f.caption);
  }

  /* ---------- schemi a blocchi ---------- */

  function box(g, x, y, w, h, title, cls) {
    s('rect', { x: x, y: y, width: w, height: h, rx: 8, class: 'qz-box ' + (cls || '') }, g);
    if (title) {
      const lines = title.split('\n');
      lines.forEach((l, i) => text(g, x + w / 2, y + h / 2 + 5 + (i - (lines.length - 1) / 2) * 15, l, { class: 'qz-box-t', 'text-anchor': 'middle' }));
    }
  }
  function link(g, x1, y1, x2, y2, both) {
    s('path', { d: 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2, class: 'qz-link' }, g);
    arrowHead(g, x1, y1, x2, y2, 1);
    if (both) arrowHead(g, x2, y2, x1, y1, 1);
  }

  const BLOCK_TEXT = {
    'von-neumann': 'Schema a blocchi: una CPU con unità di controllo, ALU e registri, collegata da un solo bus a un\'unica memoria e ai dispositivi di ingresso e uscita',
    harvard: 'Schema a blocchi: una CPU al centro, collegata con due collegamenti separati a due memorie distinte, una per il programma e una per i dati',
    'fetch-cycle': 'Schema a ciclo: tre fasi collegate da frecce in cerchio: prelievo, decodifica, esecuzione',
    'memory-pyramid': 'Piramide della memoria, dall\'alto in basso: registri, cache, RAM, SSD, dischi e nastri; in alto è più veloce, in basso più capiente',
    cpu: 'Schema dell\'interno di una CPU: contatore di programma, registro istruzioni, unità di controllo, registri e ALU, con i bus degli indirizzi e dei dati',
  };

  function blockFigure(f) {
    const svg = svgRoot(360, 210, BLOCK_TEXT[f.name], 'qz-ink qz-block');
    const g = s('g', { class: 'qz-draw' }, svg);
    switch (f.name) {
      case 'von-neumann':
        s('rect', { x: 14, y: 14, width: 158, height: 132, rx: 10, class: 'qz-box qz-box-cpu' }, g);
        text(g, 93, 34, 'CPU', { class: 'qz-box-h', 'text-anchor': 'middle' });
        box(g, 26, 44, 134, 32, 'Unità di controllo');
        box(g, 26, 86, 60, 46, 'ALU', 'qz-box-alu');
        box(g, 96, 86, 64, 46, 'Registri');
        box(g, 228, 14, 118, 132, '', 'qz-box-mem');
        text(g, 287, 34, 'Memoria', { class: 'qz-box-h', 'text-anchor': 'middle' });
        for (let i = 0; i < 6; i++) s('rect', { x: 244, y: 46 + i * 15, width: 86, height: 11, rx: 2, class: 'qz-cell' }, g);
        link(g, 174, 80, 226, 80, true);
        text(g, 200, 72, 'bus', { class: 'qz-cl', 'text-anchor': 'middle' });
        s('path', { d: 'M200 80 V164', class: 'qz-link' }, g);
        arrowHead(g, 200, 120, 200, 164, 1);
        box(g, 120, 166, 160, 34, 'Ingresso / Uscita');
        break;
      case 'harvard':
        box(g, 132, 62, 96, 86, 'CPU', 'qz-box-cpu');
        box(g, 10, 62, 94, 86, 'Memoria\nprogramma', 'qz-box-mem');
        box(g, 256, 62, 94, 86, 'Memoria\ndati', 'qz-box-mem');
        link(g, 106, 105, 130, 105);
        link(g, 230, 105, 254, 105, true);
        text(g, 118, 92, 'istruzioni', { class: 'qz-cl qz-cl-s', 'text-anchor': 'middle' });
        text(g, 242, 92, 'dati', { class: 'qz-cl qz-cl-s', 'text-anchor': 'middle' });
        break;
      case 'fetch-cycle': {
        const cx = 180;
        const cy = 108;
        const R = 70;
        const pts = [-90, 30, 150].map((a) => [cx + R * Math.cos(a * Math.PI / 180), cy + R * Math.sin(a * Math.PI / 180)]);
        const names = ['Prelievo\n(fetch)', 'Decodifica\n(decode)', 'Esecuzione\n(execute)'];
        for (let i = 0; i < 3; i++) {
          const a0 = (-90 + i * 120 + 32) * Math.PI / 180;
          const a1 = (-90 + (i + 1) * 120 - 32) * Math.PI / 180;
          const p0 = [cx + R * Math.cos(a0), cy + R * Math.sin(a0)];
          const p1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1)];
          s('path', { d: 'M' + r1(p0[0]) + ' ' + r1(p0[1]) + ' A' + R + ' ' + R + ' 0 0 1 ' + r1(p1[0]) + ' ' + r1(p1[1]), class: 'qz-link' }, g);
          const back = (-90 + (i + 1) * 120 - 40) * Math.PI / 180;
          arrowHead(g, cx + R * Math.cos(back), cy + R * Math.sin(back), p1[0], p1[1], 1);
        }
        pts.forEach((p, i) => box(g, r1(p[0] - 58), r1(p[1] - 21), 116, 42, names[i], i === 2 ? 'qz-box-alu' : ''));
        text(g, cx, cy + 5, 'clock', { class: 'qz-cl qz-cl-s', 'text-anchor': 'middle' });
        break;
      }
      case 'memory-pyramid': {
        const levels = ['Registri', 'Cache', 'RAM', 'SSD', 'Dischi e nastri'];
        const top = 14;
        const hgt = 36;
        levels.forEach((name, i) => {
          const y0 = top + i * hgt;
          const y1 = y0 + hgt - 4;
          const half0 = 20 + i * 26;
          const half1 = 20 + (i + 1) * 26 - 4;
          s('path', { d: 'M' + (180 - half0) + ' ' + y0 + ' H' + (180 + half0) + ' L' + (180 + half1) + ' ' + y1 + ' H' + (180 - half1) + ' Z', class: 'qz-box qz-tier', style: '--l:' + i }, g);
          text(g, 180, y0 + hgt / 2 + 3, name, { class: 'qz-box-t', 'text-anchor': 'middle' });
        });
        link(g, 30, 184, 30, 20);
        text(g, 40, 108, 'più veloce', { class: 'qz-cl qz-cl-s', transform: 'rotate(-90 40 108)', 'text-anchor': 'middle' });
        link(g, 330, 20, 330, 184);
        text(g, 320, 108, 'più capiente', { class: 'qz-cl qz-cl-s', transform: 'rotate(90 320 108)', 'text-anchor': 'middle' });
        break;
      }
      case 'cpu':
        s('rect', { x: 10, y: 10, width: 262, height: 190, rx: 12, class: 'qz-box qz-box-cpu' }, g);
        text(g, 26, 30, 'CPU', { class: 'qz-box-h' });
        box(g, 24, 42, 78, 34, 'PC');
        box(g, 24, 92, 78, 34, 'IR');
        box(g, 120, 42, 138, 34, 'Unità di controllo');
        box(g, 120, 104, 62, 82, 'Registri');
        box(g, 196, 104, 62, 82, 'ALU', 'qz-box-alu');
        link(g, 102, 109, 118, 70);
        link(g, 182, 145, 194, 145, true);
        link(g, 189, 78, 189, 102);
        s('path', { d: 'M63 76 V90', class: 'qz-link' }, g);
        link(g, 272, 59, 348, 59);
        link(g, 272, 160, 348, 160, true);
        text(g, 310, 50, 'indirizzi', { class: 'qz-cl qz-cl-s', 'text-anchor': 'middle' });
        text(g, 310, 151, 'dati', { class: 'qz-cl qz-cl-s', 'text-anchor': 'middle' });
        break;
      default: break;
    }
    return wrap('block', svg, f.caption);
  }

  /* ---------- ingresso unico ---------- */

  const RENDER = {
    symbol: symbolFigure,
    resistor: resistorFigure,
    gate: gateFigure,
    logic: logicFigure,
    wave: waveFigure,
    circuit: circuitFigure,
    chip: chipFigure,
    code: codeFigure,
    bits: bitsFigure,
    card: cardFigure,
    block: blockFigure,
  };

  function render(spec) {
    const fn = RENDER[spec && spec.kind];
    if (!fn) return null;
    try {
      return fn(spec);
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[quiz] figura non disegnata', spec, e);
      return null;
    }
  }

  root.QuizFigures = {
    render: render,
    logicDiagram: logicDiagram,
    kinds: Object.keys(RENDER),
    hollerith: hollerith,
  };
})(typeof window !== 'undefined' ? window : globalThis);
