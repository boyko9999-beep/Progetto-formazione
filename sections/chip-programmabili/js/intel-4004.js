/*
 * Capitolo 3 · Laboratorio "Il 4004 al microscopio".
 *
 * Due viste, scelte con un selettore:
 *  1. Esploratore del die: una pianta stilizzata del 4004 (ricostruzione didattica, non una foto)
 *     con le aree funzionali e i 16 piedini; clic o tastiera su un elemento per sapere che cosa fa.
 *  2. Ciclo di istruzione: le 8 fasi A1 A2 A3 M1 M2 X1 X2 X3 sul bus a 4 bit tra il 4004 e una
 *     ROM 4001, con SYNC, CM-ROM e un diagramma temporale che si disegna man mano.
 * La logica (decodifica, esecuzione, fasi) è in js/intel-4004-core.js, provata dai test.
 * Obiettivo: esplorare tutte le 8 aree del die e seguire un'istruzione completa nelle 8 fasi.
 */
(function (root) {
  'use strict';

  const CP = root.CP;
  if (!CP) return;

  /* ---------- dati: aree del die e piedini ---------- */

  // Rettangoli in coordinate del die (u, v da 0 a 1) nella vista orizzontale, piedino 1 in basso a sinistra.
  // Le posizioni sono plausibili ma semplificate: servono a orientarsi, non a ricostruire il layout reale.
  const AREAS = [
    {
      id: 'reg', title: 'Registri indice', lines: ['Registri', 'indice'], sub: '16 × 4 bit', short: ['Registri', 'indice'],
      box: [0.05, 0.10, 0.33, 0.66], tex: 'cells',
      text: '16 registri da 4 bit, da R0 a R15: la memoria di lavoro più veloce del chip. Si possono usare anche a coppie, da P0 a P7, per tenere 8 bit, per esempio un indirizzo. Sono celle dinamiche: il 4004 le rinfresca da solo, di continuo.',
      tie: 'Nel ciclo di istruzione li vedi nella fila R0–R15.',
    },
    {
      id: 'bus', title: 'Buffer del bus dati', lines: ['Buffer', 'bus dati'], short: ['Bus'],
      box: [0.05, 0.70, 0.33, 0.90], tex: 'stripes',
      text: 'Collega il bus interno ai piedini D0–D3 e funziona nei due sensi: in uscita per gli indirizzi, in entrata per istruzioni e dati. Qui avviene la multiplazione: stessi 4 fili, contenuti diversi a seconda della fase.',
      tie: 'È vicino ai piedini 1–4, quelli di D0–D3.',
    },
    {
      id: 'pc', title: 'Contatore di programma e pila', lines: ['Contatore', 'e pila'], sub: '4 × 12 bit', short: ['PC e', 'pila'],
      box: [0.36, 0.10, 0.66, 0.42], tex: 'cells',
      text: 'Quattro registri da 12 bit. Uno è il contatore di programma: l\'indirizzo della prossima istruzione, fra 4.096 possibili. Gli altri tre formano la pila degli indirizzi di ritorno: un sottoprogramma chiamato con JMS può chiamarne un altro, fino a tre livelli, e BBL torna indietro.',
      tie: 'Nel ciclo di istruzione è il PC, che esce sul bus in A1, A2 e A3.',
    },
    {
      id: 'acc', title: 'Accumulatore e registro temporaneo', lines: ['Accumulatore', 'e temporaneo'], short: ['A'],
      box: [0.36, 0.47, 0.66, 0.66], tex: 'stripes',
      text: 'L\'accumulatore (A, 4 bit) è il registro di lavoro: quasi ogni calcolo parte da qui e il risultato torna qui. Accanto ci sono il bit di riporto (CY), che ricorda quando un risultato non sta in 4 bit, e un registro temporaneo che tiene l\'altro operando per l\'ALU.',
      tie: 'Nel ciclo di istruzione guarda A e CY durante ADD.',
    },
    {
      id: 'alu', title: 'ALU, unità aritmetica e logica', lines: ['ALU'], sub: '4 bit', short: ['ALU'],
      box: [0.36, 0.70, 0.66, 0.90], tex: 'stripes',
      text: 'Lavora su 4 bit alla volta: somma con il riporto, sottrae, incrementa, inverte e fa scorrere i bit. Con l\'istruzione DAA corregge un risultato perché resti una cifra decimale da 0 a 9: comodo in una calcolatrice.',
      tie: 'Nel ciclo di istruzione si accende in X2, quando ADD fa la somma.',
    },
    {
      id: 'ir', title: 'Registro e decodificatore d\'istruzione', lines: ['Registro e', 'decodifica'], sub: 'istruzione', short: ['Istru-', 'zione'],
      box: [0.69, 0.10, 0.95, 0.47], tex: 'logic',
      text: 'Riceve l\'istruzione da 8 bit in due metà: OPR, il codice operativo, e OPA, il registro o il dato. Il decodificatore la traduce nei comandi interni: quale registro aprire, che cosa deve fare l\'ALU, se serve un secondo byte.',
      tie: 'Nel ciclo di istruzione è IR, che si riempie in M1 e M2.',
    },
    {
      id: 'ctl', title: 'Temporizzazione e controllo', lines: ['Tempi e', 'controllo'], short: ['Con-', 'trollo'],
      box: [0.69, 0.52, 0.95, 0.90], tex: 'logic',
      text: 'Dal clock a due fasi ricava le 8 fasi del ciclo, da A1 a X3, e genera SYNC. Accende CM-ROM e CM-RAM per scegliere la memoria che deve rispondere, legge il piedino TEST e reagisce a RESET.',
      tie: 'È vicino ai piedini del clock, di SYNC, RESET e TEST.',
    },
    {
      id: 'pad', title: 'Piazzole e fili d\'oro', lines: ['Piazzole', 'e fili d\'oro'], short: ['Piazzole e fili d\'oro'],
      ring: true,
      text: 'Sul bordo del silicio ci sono 16 piazzole metalliche. Fili d\'oro più sottili di un capello, saldati uno per uno, le collegano al contenitore e da lì ai 16 piedini. Nell\'angolo, accanto all\'ultima piazzola, ci sono le iniziali F.F. di Federico Faggin.',
      tie: 'Segui un filo: clicca uno dei piedini.',
    },
  ];

  // Piedinatura della scheda tecnica del 4004 (indice 0 = piedino 1).
  const PINS = [
    { name: 'D0', area: 'bus', kind: 'data', text: 'Bus dati, bit 0 (il meno significativo). Con D1, D2 e D3 forma il bus a 4 bit: a turno porta indirizzi in uscita e istruzioni o dati in entrata.' },
    { name: 'D1', area: 'bus', kind: 'data', text: 'Bus dati, bit 1. Lo stesso filo porta un pezzo di indirizzo nelle fasi A, un pezzo di istruzione nelle fasi M.' },
    { name: 'D2', area: 'bus', kind: 'data', text: 'Bus dati, bit 2. Funziona nei due sensi: il 4004 può pilotarlo oppure ascoltarlo.' },
    { name: 'D3', area: 'bus', kind: 'data', text: 'Bus dati, bit 3, il più significativo del nibble. Con 4 fili passano 16 valori diversi, da 0 a F.' },
    { name: 'VSS', area: 'pad', kind: 'pwr', text: 'Alimentazione: il riferimento positivo del chip. Il 4004 è fatto di transistor PMOS e lavora con tensioni negative rispetto a VSS.' },
    { name: 'Φ1', area: 'ctl', kind: 'clk', text: 'Prima fase del clock. Il 4004 vuole due segnali di clock che non si sovrappongono mai, Φ1 e Φ2, prodotti da un circuito esterno.' },
    { name: 'Φ2', area: 'ctl', kind: 'clk', text: 'Seconda fase del clock. Ogni fase del ciclo (A1, A2 e così via) dura un periodo completo: un impulso Φ1 e uno Φ2.' },
    { name: 'SYNC', area: 'ctl', kind: 'ctrl', text: 'Uscita di sincronismo: il 4004 la attiva in X3 per avvisare ROM e RAM che con la fase seguente comincia un nuovo ciclo, da A1.' },
    { name: 'RESET', area: 'ctl', kind: 'ctrl', text: 'Ingresso di azzeramento, usato all\'accensione: riporta il contatore di programma a 000 e, se resta attivo abbastanza a lungo, azzera anche registri e accumulatore.' },
    { name: 'TEST', area: 'ctl', kind: 'ctrl', text: 'Ingresso che il programma può controllare con il salto condizionato JCN, per esempio per aspettare un tasto o un sensore.' },
    { name: 'CM-ROM', area: 'ctl', kind: 'ctrl', text: 'Uscita di comando per le ROM: si attiva in A3, quando sul bus c\'è la parte alta dell\'indirizzo, cioè il numero della ROM che deve rispondere.' },
    { name: 'VDD', area: 'pad', kind: 'pwr', text: 'Alimentazione principale: −15 V rispetto a VSS.' },
    { name: 'CM-RAM3', area: 'ctl', kind: 'ctrl', text: 'Selezione del banco di RAM numero 3. Le quattro linee CM-RAM scelgono fra quattro banchi, ciascuno con un massimo di quattro RAM 4002.' },
    { name: 'CM-RAM2', area: 'ctl', kind: 'ctrl', text: 'Selezione del banco di RAM numero 2. Il programma sceglie il banco con l\'istruzione DCL.' },
    { name: 'CM-RAM1', area: 'ctl', kind: 'ctrl', text: 'Selezione del banco di RAM numero 1.' },
    { name: 'CM-RAM0', area: 'ctl', kind: 'ctrl', text: 'Selezione del banco di RAM numero 0, quello attivo dopo il RESET.' },
  ];

  const KIND_LABEL = { data: 'dati', pwr: 'alimentazione', clk: 'clock', ctrl: 'controllo' };

  /* ---------- geometria del die nelle due disposizioni ---------- */

  // wide: chip orizzontale (piedino 1 in basso a sinistra); narrow: chip in verticale come nelle schede
  // tecniche (piedino 1 in alto a sinistra), per gli schermi stretti. Le coordinate del die ruotano di 90°.
  const DIE_GEO = {
    wide: {
      vb: [92, 8, 576, 424],
      body: { x: 104, y: 56, w: 552, h: 326 },
      cav: { x: 196, y: 90, w: 368, h: 258 },
      die: { x: 232, y: 111, w: 296, h: 216 },
      map: (d, u, v) => [d.x + u * d.w, d.y + v * d.h],
      pin(n) {
        const bottom = n <= 8;
        const i = bottom ? n - 1 : 16 - n;
        const x = 380 + (i - 3.5) * 62;
        return bottom
          ? { x: x, side: 'bottom', lead: [x - 7, 382, 14, 20], num: [x, 421], name: [x, 373], finger: [214 + i * 47.4, 340] }
          : { x: x, side: 'top', lead: [x - 7, 36, 14, 20], num: [x, 28], name: [x, 76], finger: [214 + i * 47.4, 98] };
      },
      padLabel: { x: 158, y: 214, lines: ['Piazzole', 'e fili d\'oro'], leader: 'M194 220 H231', ok: [158, 196] },
      ff: [507, 320],
      notch: 'M104 205 a14 14 0 0 1 0 28 Z',
      dot: [124, 360],
    },
    narrow: {
      vb: [0, 8, 380, 436],
      body: { x: 34, y: 16, w: 312, h: 420 },
      cav: { x: 94, y: 94, w: 180, h: 270 },
      die: { x: 109, y: 126, w: 150, h: 206 },
      map: (d, u, v) => [d.x + (1 - v) * d.w, d.y + u * d.h],
      pin(n) {
        const left = n <= 8;
        const i = left ? n - 1 : 16 - n;
        const y = 66 + i * 46;
        return left
          ? { y: y, side: 'left', lead: [18, y - 7, 16, 14], num: [14, y + 4], name: [40, y + 4], finger: [100, 116 + i * 32.3] }
          : { y: y, side: 'right', lead: [346, y - 7, 16, 14], num: [366, y + 4], name: [340, y + 4], finger: [268, 116 + i * 32.3] };
      },
      padLabel: { x: 184, y: 66, lines: ['Piazzole e fili d\'oro'], leader: 'M184 72 V125', ok: [252, 66] },
      ff: [125, 322],
      notch: 'M176 16 a14 14 0 0 0 28 0 Z',
      dot: [52, 36],
    },
  };

  // Piazzola k (0-7) del lato di un piedino, in coordinate del die orizzontale.
  function padUV(n) {
    const bottom = n <= 8;
    const k = bottom ? n - 1 : 16 - n;
    return [0.06 + k * 0.114, bottom ? 0.958 : 0.042];
  }

  /* ---------- il laboratorio ---------- */

  CP.lab('intel-4004', function (mount, ctx) {
    const I = root.I4004;
    if (!I) throw new Error('Manca js/intel-4004-core.js');
    const { h, s, ui, fmt } = CP;
    const P = 'intel-4004-';
    const hex = (n, d) => fmt.hex(n, d || 1);
    const bin4 = (n) => fmt.bin(n, 4);

    /** Breve bagliore su un elemento SVG (niente con movimento ridotto). */
    function flash(el, peak) {
      if (!el || ctx.reduced || !el.animate) return;
      el.animate([{ opacity: peak == null ? 0.85 : peak }, { opacity: 0 }], { duration: CP.dur.slow, easing: 'ease-out' });
    }

    /** Elemento SVG attivabile con clic, Invio e Spazio. */
    function hot(g, label, fn) {
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', label);
      g.setAttribute('aria-pressed', 'false');
      g.addEventListener('click', fn);
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); fn(); }
      });
      return g;
    }

    function rectFrom(geo, box) {
      const a = geo.map(geo.die, box[0], box[1]);
      const b = geo.map(geo.die, box[2], box[3]);
      const x = Math.min(a[0], b[0]);
      const y = Math.min(a[1], b[1]);
      return { x: x, y: y, w: Math.abs(a[0] - b[0]), h: Math.abs(a[1] - b[1]) };
    }

    function multiline(x, y, lines, size, gap, attrs) {
      const t = s('text', Object.assign({ x: x, y: y, 'text-anchor': 'middle', 'font-size': size }, attrs || {}));
      lines.forEach((l, i) => t.append(s('tspan', { x: x, dy: i ? gap : 0 }, l)));
      return t;
    }

    /* ================= 1. Esploratore del die ================= */

    const die = { layout: null, svg: null, areas: {}, pins: [], wires: [], reticle: null, centers: {}, sel: null, seen: new Set() };

    function dieDefs(narrow) {
      const line = 'rgba(233, 220, 174, .34)';
      return s('defs', null,
        s('linearGradient', { id: P + 'g-die', x1: 0, y1: 0, x2: 1, y2: 1 },
          s('stop', { offset: '0', 'stop-color': '#5d5b3c' }),
          s('stop', { offset: '.55', 'stop-color': '#3d4a41' }),
          s('stop', { offset: '1', 'stop-color': '#2d3a43' })),
        s('pattern', { id: P + 'p-cells', width: 7, height: 7, patternUnits: 'userSpaceOnUse' },
          s('rect', { x: 1, y: 1, width: 5, height: 5, fill: 'none', stroke: line, 'stroke-width': 0.7 })),
        s('pattern', { id: P + 'p-logic', width: 16, height: 16, patternUnits: 'userSpaceOnUse' },
          s('path', { d: 'M1 4 H7 V10 H13 M3 14 V9 H9 M12 1 V6 H15', fill: 'none', stroke: line, 'stroke-width': 0.8 })),
        s('pattern', { id: P + 'p-stripes', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: narrow ? 'rotate(90)' : null },
          s('line', { x1: 0, y1: 4, x2: 8, y2: 4, stroke: line, 'stroke-width': 1.6 })));
    }

    function buildDie(layout) {
      const geo = DIE_GEO[layout];
      const narrow = layout === 'narrow';
      const D = geo.die;
      die.layout = layout;
      die.areas = {};
      die.pins = [];
      die.wires = [];
      die.centers = {};
      const svg = s('svg', {
        viewBox: geo.vb.join(' '), class: P + 'die-svg', role: 'group',
        'aria-label': 'Pianta stilizzata del 4004 nel suo contenitore: 8 aree funzionali e 16 piedini, ognuno selezionabile.',
      });
      svg.append(dieDefs(narrow));

      // contenitore di ceramica, piste grigie, cavità con l'anello dorato
      const B = geo.body;
      svg.append(s('rect', { x: B.x, y: B.y, width: B.w, height: B.h, rx: 10, fill: 'url(#cp-g-ceramic)', class: P + 'body' }));
      svg.append(s('path', { d: geo.notch, class: P + 'notch' }));
      svg.append(s('circle', { cx: geo.dot[0], cy: geo.dot[1], r: 5, class: P + 'notch' }));
      const traces = s('g', { class: P + 'traces', 'aria-hidden': 'true' });
      for (let n = 1; n <= 16; n++) {
        const p = geo.pin(n);
        const L = p.lead;
        const from = narrow ? [p.side === 'left' ? L[0] + L[2] : L[0], L[1] + L[3] / 2] : [L[0] + L[2] / 2, p.side === 'top' ? L[1] + L[3] : L[1]];
        const f = p.finger;
        const mid = narrow ? [(from[0] + f[0]) / 2, from[1]] : [from[0], (from[1] + f[1]) / 2];
        traces.append(s('path', { d: 'M' + from[0] + ' ' + from[1] + ' L' + mid[0] + ' ' + mid[1] + ' L' + f[0] + ' ' + f[1] }));
      }
      svg.append(traces);
      const C = geo.cav;
      svg.append(s('rect', { x: C.x - 5, y: C.y - 5, width: C.w + 10, height: C.h + 10, rx: 7, class: P + 'seal' }));
      svg.append(s('rect', { x: C.x, y: C.y, width: C.w, height: C.h, rx: 4, class: P + 'cavity' }));
      for (let n = 1; n <= 16; n++) {
        const f = geo.pin(n).finger;
        svg.append(narrow
          ? s('rect', { x: f[0] - 4, y: f[1] - 3.5, width: 8, height: 7, rx: 1, class: P + 'finger' })
          : s('rect', { x: f[0] - 3.5, y: f[1] - 4, width: 7, height: 8, rx: 1, class: P + 'finger' }));
      }

      // il die di silicio
      svg.append(s('rect', { x: D.x, y: D.y, width: D.w, height: D.h, rx: 2, fill: 'url(#' + P + 'g-die)', class: P + 'die' }));
      const channels = [[[0.345, 0.10], [0.345, 0.90]], [[0.675, 0.10], [0.675, 0.90]], [[0.33, 0.445], [0.69, 0.445]], [[0.69, 0.495], [0.95, 0.495]], [[0.05, 0.68], [0.33, 0.68]]];
      const ch = s('g', { class: P + 'channels', 'aria-hidden': 'true' });
      channels.forEach((c) => {
        const a = geo.map(D, c[0][0], c[0][1]);
        const b = geo.map(D, c[1][0], c[1][1]);
        ch.append(s('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }));
      });
      svg.append(ch);

      // aree funzionali
      AREAS.forEach((A, idx) => {
        if (A.ring) return;
        const r = rectFrom(geo, A.box);
        const g = s('g', { class: P + 'area', 'data-id': A.id });
        g.append(
          s('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 2, class: P + 'area-bg' }),
          s('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 2, fill: 'url(#' + P + 'p-' + A.tex + ')', class: P + 'area-tex' }),
          s('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 2, class: P + 'area-flash' }),
          s('rect', { x: r.x - 3, y: r.y - 3, width: r.w + 6, height: r.h + 6, rx: 4, class: P + 'focus' }));
        const lines = narrow ? A.short : A.lines;
        const size = narrow ? 11.5 : 12.5;
        const gap = size * 1.18;
        const showSub = !narrow && A.sub && r.h > 60;
        const total = lines.length * gap + (showSub ? 13 : 0);
        const cx = r.x + r.w / 2;
        const top = r.y + r.h / 2 - total / 2 + size * 0.8;
        g.append(multiline(cx, top, lines, size, gap, { class: P + 'area-lbl' }));
        if (showSub) g.append(s('text', { x: cx, y: top + lines.length * gap + 1, 'text-anchor': 'middle', 'font-size': 10.5, class: P + 'area-sub' }, A.sub));
        g.append(s('text', { x: r.x + r.w - 5, y: r.y + 13, 'text-anchor': 'end', 'font-size': 12, class: P + 'area-ok', 'aria-hidden': 'true' }, '✓'));
        hot(g, A.title, () => selectArea(A.id));
        die.areas[A.id] = g;
        die.centers[A.id] = [cx, r.y + r.h / 2];
        g.dataset.idx = idx;
        svg.append(g);
      });

      // anello delle piazzole: si seleziona cliccando il bordo del die o l'etichetta
      const pad = AREAS.find((A) => A.ring);
      const o = [D.x, D.y, D.w, D.h];
      const inner = rectFrom(geo, [0.04, 0.085, 0.96, 0.915]);
      const ringD = 'M' + o[0] + ' ' + o[1] + 'h' + o[2] + 'v' + o[3] + 'h' + (-o[2]) + 'Z ' +
        'M' + inner.x + ' ' + inner.y + 'h' + inner.w + 'v' + inner.h + 'h' + (-inner.w) + 'Z';
      const pg = s('g', { class: P + 'area ' + P + 'pad', 'data-id': 'pad' });
      pg.append(s('path', { d: ringD, 'fill-rule': 'evenodd', class: P + 'ring-hit' }));
      pg.append(s('path', { d: ringD, 'fill-rule': 'evenodd', class: P + 'area-flash' }));
      pg.append(s('rect', { x: D.x - 4, y: D.y - 4, width: D.w + 8, height: D.h + 8, rx: 4, class: P + 'focus' }));
      const pl = geo.padLabel;
      pg.append(s('path', { d: pl.leader, class: P + 'leader' }));
      pg.append(multiline(pl.x, pl.y, pl.lines, narrow ? 11 : 12, narrow ? 13 : 14.5, { class: P + 'pad-lbl' }));
      pg.append(s('text', { x: pl.ok[0], y: pl.ok[1], 'text-anchor': 'middle', 'font-size': 12, class: P + 'area-ok', 'aria-hidden': 'true' }, '✓'));
      hot(pg, pad.title, () => selectArea('pad'));
      die.areas.pad = pg;
      die.centers.pad = narrow ? [D.x + 12, D.y + D.h * 0.5] : [D.x + D.w * 0.5, D.y + 10];
      svg.append(pg);

      // piazzole, fili d'oro, iniziali
      const wires = s('g', { class: P + 'wires', 'aria-hidden': 'true' });
      for (let n = 1; n <= 16; n++) {
        const uv = padUV(n);
        const pp = geo.map(D, uv[0], uv[1]);
        const f = geo.pin(n).finger;
        wires.append(s('rect', { x: pp[0] - 4.5, y: pp[1] - 4.5, width: 9, height: 9, rx: 1, class: P + 'pad-sq' }));
        const c = narrow ? [(pp[0] + f[0]) / 2, Math.min(pp[1], f[1]) - 6] : [(pp[0] + f[0]) / 2, (pp[1] + f[1]) / 2 + (n <= 8 ? 8 : -8)];
        const w = s('path', { d: 'M' + pp[0] + ' ' + pp[1] + ' Q' + c[0] + ' ' + c[1] + ' ' + f[0] + ' ' + f[1], class: P + 'wire' });
        die.wires[n] = w;
        wires.append(w);
      }
      svg.append(wires);
      svg.append(s('text', { x: geo.ff[0], y: geo.ff[1], 'text-anchor': 'middle', 'font-size': 10.5, class: P + 'ff', 'aria-hidden': 'true' }, 'F.F.'));

      // piedini
      for (let n = 1; n <= 16; n++) {
        const pin = PINS[n - 1];
        const p = geo.pin(n);
        const L = p.lead;
        const g = s('g', { class: P + 'pin ' + P + 'k-' + pin.kind, 'data-n': n });
        let hit;
        if (narrow) hit = p.side === 'left' ? [0, p.y - 19, 92, 38] : [286, p.y - 19, 94, 38];
        else hit = p.side === 'top' ? [p.x - 27, 14, 54, 70] : [p.x - 27, 362, 54, 68];
        g.append(s('rect', { x: hit[0], y: hit[1], width: hit[2], height: hit[3], rx: 6, class: P + 'pin-hit' }));
        g.append(s('rect', { x: L[0], y: L[1], width: L[2], height: L[3], rx: 1.6, fill: 'url(#cp-g-gold)', class: P + 'lead' }));
        g.append(s('text', { x: p.num[0], y: p.num[1], 'text-anchor': narrow ? (p.side === 'left' ? 'end' : 'start') : 'middle', 'font-size': narrow ? 11 : 10.5, class: P + 'pin-num' }, String(n)));
        g.append(s('text', { x: p.name[0], y: p.name[1], 'text-anchor': narrow ? (p.side === 'left' ? 'start' : 'end') : 'middle', 'font-size': narrow ? 11 : 10.5, class: P + 'pin-name' }, pin.name));
        g.append(s('rect', { x: hit[0] + 2, y: hit[1] + 2, width: hit[2] - 4, height: hit[3] - 4, rx: 6, class: P + 'focus' }));
        hot(g, 'Piedino ' + n + ', ' + pin.name.replace('Φ', 'fi ') + ' (' + KIND_LABEL[pin.kind] + ')', () => selectPin(n));
        die.pins[n] = g;
        die.centers['pin' + n] = narrow ? [p.side === 'left' ? 26 : 354, p.y] : [p.x, p.side === 'top' ? 46 : 392];
        svg.append(g);
      }

      // mirino del microscopio: scivola sull'elemento scelto
      const ret = s('g', { class: P + 'reticle', 'aria-hidden': 'true', opacity: 0 });
      ret.append(s('circle', { r: 21 }), s('path', { d: 'M-30 0 H-15 M15 0 H30 M0 -30 V-15 M0 15 V30' }));
      svg.append(ret);
      die.reticle = ret;
      die.retPos = null;
      die.svg = svg;
      return svg;
    }

    let retTween = null;
    function moveReticle(key) {
      const c = die.centers[key];
      if (!c || !die.reticle) return;
      const ret = die.reticle;
      const place = (p) => ret.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')');
      if (retTween) retTween.cancel();
      if (!die.retPos || ctx.reduced) {
        place(c);
        ret.setAttribute('opacity', 1);
        die.retPos = c.slice();
        return;
      }
      retTween = CP.tween({
        from: die.retPos.slice(), to: c.slice(), duration: CP.dur.normal + 100, ease: 'smooth',
        onUpdate: (v) => { die.retPos = v; place(v); },
      });
    }

    function markDie(kind, key) {
      Object.keys(die.areas).forEach((id) => {
        const g = die.areas[id];
        const on = kind === 'area' && id === key;
        g.classList.toggle('is-sel', on);
        g.setAttribute('aria-pressed', String(on));
        g.classList.toggle('is-link', kind === 'pin' && PINS[key - 1].area === id);
        g.classList.toggle('is-seen', die.seen.has(id));
        const A = AREAS.find((x) => x.id === id);
        g.setAttribute('aria-label', A.title + (die.seen.has(id) ? ' (già esplorata)' : ''));
      });
      for (let n = 1; n <= 16; n++) {
        const on = kind === 'pin' && n === key;
        die.pins[n].classList.toggle('is-sel', on);
        die.pins[n].setAttribute('aria-pressed', String(on));
        die.wires[n].classList.toggle('is-on', on || (kind === 'area' && key === 'pad'));
      }
    }

    function selectArea(id, quiet) {
      const A = AREAS.find((x) => x.id === id);
      const first = !die.seen.has(id);
      die.seen.add(id);
      die.sel = { kind: 'area', key: id };
      markDie('area', id);
      moveReticle(id);
      if (!quiet) flash(die.areas[id].querySelector('.' + P + 'area-flash'), 0.55);
      const n = AREAS.indexOf(A) + 1;
      dieInfo.step.textContent = 'Area ' + n + ' di 8' + (first ? '' : ' · già esplorata');
      dieInfo.title.textContent = A.title;
      dieInfo.text.textContent = A.text;
      dieInfo.tie.textContent = A.tie;
      dieInfo.tie.hidden = false;
      updateDieProgress();
      if (!quiet) ctx.say(A.title + '. ' + A.text);
      checkGoal();
    }

    function selectPin(n, quiet) {
      const pin = PINS[n - 1];
      die.sel = { kind: 'pin', key: n };
      markDie('pin', n);
      moveReticle('pin' + n);
      if (!quiet && die.pins[n].animate && !ctx.reduced) {
        die.wires[n].animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: CP.dur.normal, easing: 'ease-out' });
      }
      const area = AREAS.find((x) => x.id === pin.area);
      dieInfo.step.textContent = 'Piedino ' + n + ' di 16 · ' + KIND_LABEL[pin.kind];
      dieInfo.title.textContent = pin.name;
      dieInfo.text.textContent = pin.text;
      dieInfo.tie.textContent = 'Il filo d\'oro lo collega a una piazzola; la parte del chip che lo usa di più è ' + (pin.area === 'pad' ? 'la rete di alimentazione, che parte dalle piazzole' : 'evidenziata: ' + area.title.toLowerCase()) + '.';
      dieInfo.tie.hidden = false;
      if (!quiet) ctx.say('Piedino ' + n + ', ' + pin.name + '. ' + pin.text);
    }

    function updateDieProgress() {
      const k = die.seen.size;
      dieInfo.count.textContent = 'Aree esplorate: ' + k + ' su 8';
      dieInfo.pips.forEach((pip, i) => pip.classList.toggle('on', die.seen.has(AREAS[i].id)));
    }

    const dieInfo = {
      step: h('span', { class: 'step' }, 'Esploratore del die'),
      title: h('h4', null, 'Clicca una parte del chip'),
      text: h('p', null, 'Ogni area colorata è un blocco del processore; i rettangoli dorati in alto e in basso sono i piedini. Usa il mouse, oppure Tab per spostarti e Invio per scegliere.'),
      tie: h('p', { class: P + 'tie', hidden: true }),
      count: h('p', { class: P + 'count' }, 'Aree esplorate: 0 su 8'),
      pips: AREAS.map((A) => h('span', { class: P + 'pip', title: A.title })),
    };

    /* ================= 2. Ciclo di istruzione ================= */

    // Geometria del palco: wide = CPU a sinistra e ROM a destra; narrow = CPU sopra e ROM sotto.
    const CYC_GEO = {
      wide: {
        vb: [720, 330],
        cpu: [10, 10, 290, 310], rom: [450, 10, 260, 310],
        title: [24, 34], romTitle: [462, 34],
        lbl: { pc: [24, 69], ir: [166, 69], acc: [24, 111], cy: [90, 111], sec: [166, 111] },
        box: { pcH: [52, 50], pcM: [82, 50], pcL: [112, 50], opr: [190, 50], opa: [220, 50], acc: [52, 92], cy: [116, 92], s1: [212, 92], s2: [242, 92] },
        secLabel: '2° byte',
        alu: { d: 'M52 136 H128 L140 150 L152 136 H228 L204 196 H76 Z', lbl: [140, 172], f: [140, 189] },
        regs: { head: [24, 216], x: 24, dx: 34, w: 30, rows: [[230, 234], [276, 280]] },
        latch: { lbl: [462, 66], H: [610, 48], M: [640, 48], L: [670, 48] },
        list: { head: 98, y: 106, rh: 23, cols: [462, 502, 540, 616], fs: 12 },
        lines: { x1: 300, x2: 450, ys: [128, 144, 160, 176] },
        dataLbl: [375, 62],
        token: { from: [340, 92], to: [410, 92] },
        dir: [375, 204],
        sync: { d: 'M300 240 H446', lbl: [375, 232] },
        cm: { d: 'M300 278 H446', lbl: [375, 270] },
      },
      narrow: {
        vb: [360, 590],
        cpu: [6, 6, 348, 250], rom: [6, 352, 348, 232],
        title: [18, 28], romTitle: [18, 376],
        lbl: { pc: [18, 59], ir: [148, 59], acc: [18, 99], cy: [80, 99], sec: [246, 59] },
        box: { pcH: [42, 40], pcM: [72, 40], pcL: [102, 40], opr: [170, 40], opa: [200, 40], acc: [42, 80], cy: [106, 80], s1: [270, 40], s2: [300, 40] },
        secLabel: '2°',
        alu: { d: 'M160 76 H238 L250 88 L262 76 H340 L318 120 H182 Z', lbl: [208, 108], f: [292, 108] },
        regs: { head: [18, 142], x: 18, dx: 41, w: 37, rows: [[158, 162], [204, 208]] },
        latch: { lbl: [180, 376], H: [252, 358], M: [282, 358], L: [312, 358] },
        list: { head: 406, y: 412, rh: 19, cols: [18, 58, 98, 212], fs: 11.5 },
        lines: { y1: 256, y2: 352, xs: [64, 80, 96, 112] },
        dataLbl: [56, 300],
        token: { from: [88, 282], to: [88, 326] },
        dir: [134, 308],
        sync: { d: 'M250 276 V348', lbl: [250, 270] },
        cm: { d: 'M310 276 V348', lbl: [310, 270] },
      },
    };

    const cyc = {
      layout: null, svg: null, tsvg: null, boxes: {}, regs: [], rows: [], lines: [], token: null,
      a: CP.store.get('i4004-a', 9), b: CP.store.get('i4004-b', 8),
      prog: null, trace: null, idx: -1, seen: [], instrDone: false, anim: [], running: false, stopRun: null,
      speed: 2, tcycle: -1, revealX: 0,
    };
    if (!(cyc.a >= 0 && cyc.a <= 15)) cyc.a = 9;
    if (!(cyc.b >= 0 && cyc.b <= 15)) cyc.b = 8;

    /** Casella di un nibble: sfondo, bagliore, testo. */
    function nibBox(parent, x, y, w, hgt, cls) {
      const g = s('g', { class: P + 'nib' + (cls ? ' ' + cls : '') });
      const bg = s('rect', { x: x, y: y, width: w, height: hgt, rx: 4, class: P + 'nib-bg' });
      const fl = s('rect', { x: x, y: y, width: w, height: hgt, rx: 4, class: P + 'nib-fl' });
      const t = s('text', { x: x + w / 2, y: y + hgt / 2 + 5, 'text-anchor': 'middle', class: P + 'nib-t mono' }, '0');
      g.append(bg, fl, t);
      parent.append(g);
      const box = { g: g, fl: fl, t: t, c: [x + w / 2, y + hgt / 2], v: null };
      box.set = (v) => { const txt = v == null ? '–' : String(v); if (t.textContent !== txt) t.textContent = txt; box.v = v; g.classList.toggle('is-empty', v == null); };
      return box;
    }

    function buildCycle(layout) {
      const G = CYC_GEO[layout];
      const narrow = layout === 'narrow';
      cyc.layout = layout;
      cyc.boxes = {};
      cyc.regs = [];
      cyc.rows = [];
      cyc.lines = [];
      const svg = s('svg', {
        viewBox: '0 0 ' + G.vb[0] + ' ' + G.vb[1], class: P + 'cyc-svg' + (narrow ? ' is-narrow' : ''), role: 'img',
        'aria-label': 'Il processore 4004 e una ROM 4001 collegati dal bus dati a 4 fili e dalle linee SYNC e CM-ROM. Il pannello accanto descrive la fase in corso.',
      });
      svg.append(s('defs', null,
        s('marker', { id: P + 'm-ctl', viewBox: '0 0 8 8', refX: 6, refY: 4, markerWidth: 3.6, markerHeight: 3.6, orient: 'auto' }, s('path', { d: 'M0 0 L8 4 L0 8 z', class: P + 'm-ctl' }))));

      // blocchi
      const unit = (r, cls) => s('rect', { x: r[0], y: r[1], width: r[2], height: r[3], rx: 12, class: P + 'unit ' + (cls || '') });
      svg.append(unit(G.cpu, P + 'unit-cpu'), unit(G.rom, P + 'unit-rom'));
      svg.append(s('text', { x: G.title[0], y: G.title[1], class: P + 'unit-t' }, '4004 · CPU'));
      cyc.romTitle = s('text', { x: G.romTitle[0], y: G.romTitle[1], class: P + 'unit-t' }, '4001 · ROM n. 0');
      svg.append(cyc.romTitle);

      // etichette e caselle del processore
      const L = G.lbl;
      const lab = (p, t) => svg.append(s('text', { x: p[0], y: p[1], class: P + 'lbl' }, t));
      lab(L.pc, 'PC'); lab(L.ir, 'IR'); lab(L.acc, 'A'); lab(L.cy, 'CY'); lab(L.sec, G.secLabel);
      Object.keys(G.box).forEach((k) => { cyc.boxes[k] = nibBox(svg, G.box[k][0], G.box[k][1], 28, 28, P + 'b-' + k); });

      // ALU
      const alu = s('g', { class: P + 'alu' });
      alu.append(s('path', { d: G.alu.d, class: P + 'alu-bg' }), s('path', { d: G.alu.d, class: P + 'alu-fl' }));
      alu.append(s('text', { x: G.alu.lbl[0], y: G.alu.lbl[1], 'text-anchor': 'middle', class: P + 'alu-t' }, 'ALU'));
      cyc.aluF = s('text', { x: G.alu.f[0], y: G.alu.f[1], 'text-anchor': 'middle', class: P + 'alu-f mono' }, '');
      alu.append(cyc.aluF);
      svg.append(alu);
      cyc.alu = alu;
      cyc.aluC = narrow ? [250, 98] : [140, 166];

      // registri R0-R15
      const R = G.regs;
      svg.append(s('text', { x: R.head[0], y: R.head[1], class: P + 'lbl' }, 'Registri indice R0–R15'));
      for (let i = 0; i < 16; i++) {
        const row = R.rows[i >> 3];
        const x = R.x + (i & 7) * R.dx;
        svg.append(s('text', { x: x + R.w / 2, y: row[0], 'text-anchor': 'middle', class: P + 'reg-n' }, 'R' + i));
        cyc.regs.push(nibBox(svg, x, row[1], R.w, 24, P + 'reg'));
      }

      // bus dati: 4 fili, poi SYNC e CM-ROM
      const LN = G.lines;
      svg.append(s('text', { x: G.dataLbl[0], y: G.dataLbl[1], 'text-anchor': narrow ? 'end' : 'middle', class: P + 'lbl-s' }, narrow ? 'D0–D3' : 'bus dati D0–D3'));
      for (let i = 0; i < 4; i++) {
        const d = narrow ? 'M' + LN.xs[i] + ' ' + LN.y1 + ' V' + LN.y2 : 'M' + LN.x1 + ' ' + LN.ys[i] + ' H' + LN.x2;
        const ln = s('path', { d: d, class: P + 'line', style: { '--d': (i * 70) + 'ms' } });
        cyc.lines.push(ln);
        svg.append(ln);
        if (!narrow) svg.append(s('text', { x: LN.x1 + 6, y: LN.ys[i] - 4, class: P + 'line-n' }, 'D' + i));
      }
      cyc.sync = s('path', { d: G.sync.d, class: P + 'ctl', 'marker-end': 'url(#' + P + 'm-ctl)' });
      cyc.cm = s('path', { d: G.cm.d, class: P + 'ctl', 'marker-end': 'url(#' + P + 'm-ctl)' });
      svg.append(cyc.sync, cyc.cm);
      cyc.syncT = s('text', { x: G.sync.lbl[0], y: G.sync.lbl[1], 'text-anchor': 'middle', class: P + 'ctl-t' }, 'SYNC');
      cyc.cmT = s('text', { x: G.cm.lbl[0], y: G.cm.lbl[1], 'text-anchor': 'middle', class: P + 'ctl-t' }, 'CM-ROM');
      svg.append(cyc.syncT, cyc.cmT);
      cyc.dir = s('text', { x: G.dir[0], y: G.dir[1], 'text-anchor': narrow ? 'start' : 'middle', class: P + 'dir' }, '');
      svg.append(cyc.dir);

      // ROM: registro dell'indirizzo ricevuto e contenuto
      const LA = G.latch;
      svg.append(s('text', { x: LA.lbl[0], y: LA.lbl[1], class: P + 'lbl-s' }, narrow ? 'indirizzo' : 'indirizzo ricevuto'));
      cyc.boxes.latchH = nibBox(svg, LA.H[0], LA.H[1], 28, 28, P + 'latch');
      cyc.boxes.latchM = nibBox(svg, LA.M[0], LA.M[1], 28, 28, P + 'latch');
      cyc.boxes.latchL = nibBox(svg, LA.L[0], LA.L[1], 28, 28, P + 'latch');
      const LS = G.list;
      const heads = ['ind.', 'byte', 'istruzione', 'effetto'];
      heads.forEach((t, i) => svg.append(s('text', { x: LS.cols[i], y: LS.head, class: P + 'lbl-s' }, t)));
      cyc.listG = s('g', { class: P + 'list' });
      svg.append(cyc.listG);
      cyc.listGeo = LS;
      cyc.romX = G.rom;

      // il gettone che viaggia sul bus: valore esadecimale e 4 bit
      const tok = s('g', { class: P + 'token', opacity: 0 });
      tok.append(s('rect', { x: -32, y: -17, width: 64, height: 34, rx: 9, class: P + 'token-bg' }));
      cyc.tokHex = s('text', { x: 0, y: -1, 'text-anchor': 'middle', class: P + 'token-hex mono' }, '0');
      cyc.tokBin = s('text', { x: 0, y: 12, 'text-anchor': 'middle', class: P + 'token-bin mono' }, '0000');
      tok.append(cyc.tokHex, cyc.tokBin);
      svg.append(tok);
      cyc.token = tok;
      cyc.tokGeo = G.token;

      // il valore che vola da un blocco all'altro in X3
      cyc.fly = [0, 1].map(() => {
        const g = s('g', { class: P + 'fly', opacity: 0 });
        g.append(s('rect', { x: -15, y: -13, width: 30, height: 26, rx: 6 }));
        const t = s('text', { x: 0, y: 5, 'text-anchor': 'middle', class: 'mono' }, '0');
        g.append(t);
        g.t = t;
        svg.append(g);
        return g;
      });
      cyc.svg = svg;
      fillRom();
      return svg;
    }

    /** Righe della ROM: indirizzo, byte, istruzione, effetto. */
    function fillRom() {
      const LS = cyc.listGeo;
      const R = cyc.romX;
      cyc.listG.textContent = '';
      cyc.rows = [];
      const rows = [];
      cyc.prog.lines.forEach((l) => {
        rows.push({ addr: l.addr, byte: l.bytes[0], text: l.text, note: l.note });
        if (l.bytes.length > 1) rows.push({ addr: l.addr + 1, byte: l.bytes[1], text: '(2° byte)', note: 'indirizzo basso', second: true });
      });
      rows.forEach((r, k) => {
        const y = LS.y + k * LS.rh;
        const g = s('g', { class: P + 'row' + (r.second ? ' is-second' : '') });
        g.append(s('rect', { x: R[0] + 6, y: y, width: R[2] - 12, height: LS.rh - 2, rx: 5, class: P + 'row-bg' }));
        const fl = s('rect', { x: R[0] + 6, y: y, width: R[2] - 12, height: LS.rh - 2, rx: 5, class: P + 'row-fl' });
        g.append(fl);
        const by = y + LS.rh / 2 + 3.5;
        g.append(s('text', { x: LS.cols[0], y: by, 'font-size': LS.fs, class: P + 'row-a mono' }, fmt.hex(r.addr, 3)));
        g.append(s('text', { x: LS.cols[1], y: by, 'font-size': LS.fs, class: P + 'row-b mono' }, fmt.hex(r.byte, 2)));
        g.append(s('text', { x: LS.cols[2], y: by, 'font-size': LS.fs, class: P + 'row-i mono' }, r.text));
        g.append(s('text', { x: LS.cols[3], y: by, 'font-size': LS.fs - 1.5, class: P + 'row-e' }, r.note));
        g.fl = fl;
        g.c = [LS.cols[1] + 9, y + LS.rh / 2];
        cyc.rows.push(g);
        cyc.listG.append(g);
      });
    }

    /* ----- diagramma temporale ----- */

    const TIM_GEO = {
      wide: { vb: [720, 236], lx: 72, x0: 80, cw: 79, gy: 14, py: 37, y0: 46, rh: 20, fs: 11, groups: ['indirizzo · 12 bit', 'istruzione · 8 bit', 'esecuzione'] },
      narrow: { vb: [360, 252], lx: 52, x0: 56, cw: 38, gy: 13, py: 33, y0: 42, rh: 22, fs: 10.5, groups: ['indirizzo', 'istruzione', 'esecuzione'] },
    };
    const ROWS = ['Φ1', 'Φ2', 'SYNC', 'CM-ROM', 'D0', 'D1', 'D2', 'D3', 'valore'];

    function buildTiming(layout) {
      const T = TIM_GEO[layout];
      const H = T.y0 + ROWS.length * T.rh + 6;
      const svg = s('svg', {
        viewBox: '0 0 ' + T.vb[0] + ' ' + H, class: P + 'tim-svg' + (layout === 'narrow' ? ' is-narrow' : ''), role: 'img',
        'aria-label': 'Diagramma temporale del ciclo in corso: clock a due fasi, SYNC, CM-ROM e i quattro fili del bus dati, fase per fase.',
      });
      const W = T.x0 + 8 * T.cw;
      svg.append(s('defs', null, s('clipPath', { id: P + 'clip' }, cyc.clipR = s('rect', { x: T.x0 - 2, y: 0, width: 0, height: H }))));
      // colonna corrente
      cyc.colHi = s('rect', { x: T.x0, y: T.py - 14, width: T.cw, height: H - T.py + 10, rx: 6, class: P + 't-col', opacity: 0 });
      svg.append(cyc.colHi);
      // griglia
      const grid = s('g', { class: P + 't-grid' });
      for (let j = 0; j <= 8; j++) grid.append(s('line', { x1: T.x0 + j * T.cw, y1: T.py + 6, x2: T.x0 + j * T.cw, y2: H - 4 }));
      ROWS.forEach((r, i) => {
        const y = T.y0 + i * T.rh;
        grid.append(s('line', { x1: T.x0, y1: y + T.rh, x2: W, y2: y + T.rh, class: P + 't-hl' }));
      });
      svg.append(grid);
      // gruppi e nomi delle fasi
      const groups = [[0, 3], [3, 5], [5, 8]];
      groups.forEach((gr, i) => {
        const a = T.x0 + gr[0] * T.cw + 5;
        const b = T.x0 + gr[1] * T.cw - 5;
        svg.append(s('text', { x: (a + b) / 2, y: T.gy, 'text-anchor': 'middle', 'font-size': T.fs - 0.5, class: P + 't-grp ' + P + 'g' + i }, T.groups[i]));
        svg.append(s('path', { d: 'M' + a + ' ' + (T.gy + 6) + ' v-3 H' + b + ' v3', class: P + 't-br ' + P + 'g' + i }));
      });
      cyc.phNames = I.PHASES.map((p, j) => {
        const t = s('text', { x: T.x0 + (j + 0.5) * T.cw, y: T.py, 'text-anchor': 'middle', 'font-size': T.fs + 1.5, class: P + 't-ph mono' }, p);
        svg.append(t);
        return t;
      });
      ROWS.forEach((r, i) => {
        svg.append(s('text', { x: T.lx, y: T.y0 + i * T.rh + T.rh / 2 + 4, 'text-anchor': 'end', 'font-size': T.fs, class: P + 't-row' + (i < 2 ? ' clk' : i < 4 ? ' ctl' : '') }, r));
      });
      cyc.sigG = s('g', { 'clip-path': 'url(#' + P + 'clip)' });
      svg.append(cyc.sigG);
      cyc.pen = s('line', { x1: T.x0, y1: T.py + 6, x2: T.x0, y2: H - 4, class: P + 't-pen', opacity: 0 });
      svg.append(cyc.pen);
      cyc.tim = T;
      cyc.tsvg = svg;
      cyc.tcycle = -1;
      return svg;
    }

    /** Disegna i segnali di un ciclo (poi la maschera li scopre fase per fase). */
    function drawSignals(c) {
      const T = cyc.tim;
      const g = cyc.sigG;
      g.textContent = '';
      cyc.tcycle = c ? c.n : -1;
      if (!c) return;
      const hi = (i) => T.y0 + i * T.rh + 4;
      const lo = (i) => T.y0 + (i + 1) * T.rh - 5;
      const X = (j, f) => T.x0 + (j + f) * T.cw;
      // clock: un impulso Φ1 e uno Φ2 in ogni fase
      [[0, 0.1, 0.4], [1, 0.55, 0.85]].forEach(([row, a, b]) => {
        let d = 'M' + X(0, 0) + ' ' + lo(row);
        for (let j = 0; j < 8; j++) d += ' H' + X(j, a) + ' V' + hi(row) + ' H' + X(j, b) + ' V' + lo(row);
        d += ' H' + X(8, 0);
        g.append(s('path', { d: d, class: P + 's-clk' }));
      });
      // SYNC e CM-ROM: livello attivo disegnato in alto
      [[2, 'sync'], [3, 'cmRom']].forEach(([row, key]) => {
        let d = 'M' + X(0, 0) + ' ' + lo(row);
        let level = false;
        c.phases.forEach((ph, j) => {
          if (ph[key] !== level) { d += ' H' + X(j, 0.04) + ' V' + (ph[key] ? hi(row) : lo(row)); level = ph[key]; }
        });
        d += ' H' + X(8, 0);
        g.append(s('path', { d: d, class: P + 's-ctl' }));
      });
      // D0-D3: colore per tipo (indirizzo, istruzione), bus libero tratteggiato nelle fasi X
      for (let bit = 0; bit < 4; bit++) {
        const row = 4 + bit;
        const segs = { addr: '', data: '', free: '' };
        let prev = null;
        c.phases.forEach((ph, j) => {
          if (ph.bus == null) {
            const y = (hi(row) + lo(row)) / 2;
            segs.free += 'M' + X(j, 0) + ' ' + y + ' H' + X(j + 1, 0) + ' ';
            prev = null;
            return;
          }
          const y = (ph.bus >> bit) & 1 ? hi(row) : lo(row);
          const start = prev == null || prev === y ? 'M' + X(j, 0) + ' ' + y : 'M' + X(j, 0) + ' ' + prev + ' V' + y;
          segs[ph.kind] += start + ' H' + X(j + 1, 0) + ' ';
          prev = y;
        });
        Object.keys(segs).forEach((k) => { if (segs[k]) g.append(s('path', { d: segs[k], class: P + 's-' + k })); });
      }
      // riga dei valori
      const vy = T.y0 + 8 * T.rh + T.rh / 2 + 4;
      c.phases.forEach((ph, j) => {
        g.append(s('text', { x: X(j, 0.5), y: vy, 'text-anchor': 'middle', 'font-size': T.fs + 0.5, class: P + 's-val mono ' + (ph.kind || 'free') }, ph.bus == null ? '·' : fmt.hex(ph.bus, 1)));
      });
    }

    /* ----- stato del ciclo e animazioni ----- */

    function rebuildProgram() {
      cyc.prog = I.program(cyc.a, cyc.b);
      cyc.trace = I.trace(cyc.prog.rom);
      cyc.total = cyc.trace.cycles.length * 8;
      cyc.seen = cyc.trace.cycles.map(() => 0);
    }

    function stepAt(idx) {
      if (idx < 0) return null;
      const c = cyc.trace.cycles[idx >> 3];
      return { c: c, p: idx & 7, ph: c.phases[idx & 7] };
    }

    function interval() { return [1700, 1050, 620, 330][cyc.speed - 1]; }

    function boxOf(k) {
      if (k === 'alu') return null;
      if (/^r\d+$/.test(k)) return cyc.regs[+k.slice(1)];
      return cyc.boxes[k];
    }

    function operands(c) {
      const n = c.instr.opa;
      switch (c.instr.mn) {
        case 'ADD': case 'XCH': return ['acc', 'r' + n];
        case 'LDM': return ['opa'];
        case 'TCC': return ['cy'];
        case 'JUN': return c.word === 2 ? ['opa', 's1', 's2'] : ['opa'];
        default: return [];
      }
    }

    function moves(c) {
      const n = c.instr.opa;
      if (c.word === 1 && c.instr.words === 2) return [];
      switch (c.instr.mn) {
        case 'LDM': return [['opa', 'acc']];
        case 'XCH': return [['acc', 'r' + n], ['r' + n, 'acc']];
        case 'ADD': return [['alu', 'acc']];
        case 'TCC': return [['cy', 'acc']];
        case 'JUN': return [['opa', 'pcH'], ['s1', 'pcM'], ['s2', 'pcL']];
        default: return [];
      }
    }

    function valueOf(st, k) {
      if (k === 'acc') return st.acc;
      if (k === 'cy') return st.cy;
      if (k === 'pcH') return (st.pc >> 8) & 15;
      if (k === 'pcM') return (st.pc >> 4) & 15;
      if (k === 'pcL') return st.pc & 15;
      if (/^r\d+$/.test(k)) return st.r[+k.slice(1)];
      return 0;
    }

    function setReveal(w) {
      const T = cyc.tim;
      cyc.clipR.setAttribute('width', Math.max(0, w).toFixed(1));
      const x = (T.x0 + w - 2).toFixed(1);
      cyc.pen.setAttribute('x1', x);
      cyc.pen.setAttribute('x2', x);
    }

    function applyState(idx) {
      const B = cyc.boxes;
      const v = stepAt(idx);
      const st = v ? v.ph.state : { pc: 0, acc: 0, cy: 0, r: new Array(16).fill(0), ir: { hi: null, lo: null, second: null }, latch: [null, null, null] };
      const hx = (n) => (n == null ? null : fmt.hex(n, 1));
      B.pcH.set(hx((st.pc >> 8) & 15)); B.pcM.set(hx((st.pc >> 4) & 15)); B.pcL.set(hx(st.pc & 15));
      B.opr.set(hx(st.ir.hi)); B.opa.set(hx(st.ir.lo));
      B.s1.set(st.ir.second ? hx(st.ir.second[0]) : null); B.s2.set(st.ir.second ? hx(st.ir.second[1]) : null);
      B.acc.set(hx(st.acc)); B.cy.set(String(st.cy));
      st.r.forEach((x, i) => cyc.regs[i].set(hx(x)));
      B.latchL.set(hx(st.latch[0])); B.latchM.set(hx(st.latch[1])); B.latchH.set(hx(st.latch[2]));
      Object.keys(B).concat(cyc.regs.map((x, i) => 'r' + i)).forEach((k) => {
        const g = boxOf(k).g;
        g.classList.remove('is-addr', 'is-data', 'is-dec', 'is-src', 'is-res');
        g.querySelector('text').removeAttribute('opacity');
      });
      const mark = (k, cls) => { const b = boxOf(k); if (b) b.g.classList.add(cls); };
      let aluOn = false;
      let formula = '';
      if (v) {
        const c = v.c;
        const p = v.p;
        const two = c.word === 2;
        if (p < 3) { mark(['pcL', 'pcM', 'pcH'][p], 'is-addr'); mark(['latchL', 'latchM', 'latchH'][p], 'is-addr'); }
        else if (p < 5) mark(two ? (p === 3 ? 's1' : 's2') : (p === 3 ? 'opr' : 'opa'), 'is-data');
        else if (p === 5) (two ? ['s1', 's2'] : ['opr', 'opa']).forEach((k) => mark(k, 'is-dec'));
        else if (p === 6) operands(c).forEach((k) => mark(k, 'is-src'));
        else c.exec.changed.forEach((k) => (k === 'pc' ? ['pcH', 'pcM', 'pcL'] : [k]).forEach((x) => mark(x, 'is-res')));
        const alu = c.exec.alu;
        aluOn = p === 6 && !!alu;
        if (alu && p >= 6) formula = alu.x + '+' + alu.y + '+' + alu.c + '=' + alu.result;
      }
      cyc.alu.classList.toggle('is-on', aluOn);
      cyc.aluF.textContent = formula;

      // bus, linee di controllo, gettone
      const ph = v ? v.ph : null;
      const busy = !!(ph && ph.bus != null);
      cyc.lines.forEach((ln, i) => {
        ln.classList.toggle('is-busy', busy);
        ln.classList.toggle('is-on', busy && !!((ph.bus >> i) & 1));
        ln.classList.toggle('k-addr', busy && ph.kind === 'addr');
        ln.classList.toggle('k-data', busy && ph.kind === 'data');
      });
      cyc.sync.classList.toggle('is-on', !!(ph && ph.sync));
      cyc.syncT.classList.toggle('is-on', !!(ph && ph.sync));
      cyc.cm.classList.toggle('is-on', !!(ph && ph.cmRom));
      cyc.cmT.classList.toggle('is-on', !!(ph && ph.cmRom));
      const narrow = cyc.layout === 'narrow';
      cyc.dir.textContent = !busy ? 'bus libero' : ph.dir === 'out' ? (narrow ? '↓ CPU → ROM' : 'CPU → ROM') : (narrow ? '↑ ROM → CPU' : 'ROM → CPU');
      cyc.dir.setAttribute('class', P + 'dir' + (busy ? ' k-' + ph.kind : ''));
      const TG = cyc.tokGeo;
      if (busy) {
        const pos = ph.dir === 'out' ? TG.to : TG.from;
        cyc.token.setAttribute('transform', 'translate(' + pos[0] + ' ' + pos[1] + ')');
        cyc.token.setAttribute('opacity', 1);
        cyc.token.setAttribute('class', P + 'token k-' + ph.kind);
        cyc.tokHex.textContent = fmt.hex(ph.bus, 1);
        cyc.tokBin.textContent = bin4(ph.bus);
      } else cyc.token.setAttribute('opacity', 0);
      cyc.fly.forEach((f) => f.setAttribute('opacity', 0));

      // blocchi attivi e riga della ROM
      const p = v ? v.p : -1;
      cyc.svg.querySelector('.' + P + 'unit-cpu').classList.toggle('is-on', p >= 0 && (p < 3 || p > 4));
      cyc.svg.querySelector('.' + P + 'unit-rom').classList.toggle('is-on', p === 3 || p === 4);
      cyc.rows.forEach((r, k) => {
        const cur = !!v && k === v.c.addr && p >= 2;
        r.classList.toggle('is-cur', cur);
        r.classList.toggle('is-read', cur && (p === 3 || p === 4));
        r.classList.toggle('is-done', !!v && (k < v.c.addr || (k === v.c.addr && p === 7)) && !cur);
      });

      // diagramma temporale
      const T = cyc.tim;
      const c0 = v ? v.c : cyc.trace.cycles[0];
      if (cyc.tcycle !== c0.n) drawSignals(c0);
      cyc.revealX = p < 0 ? 0 : (p + 1) * T.cw + 2;
      setReveal(cyc.revealX);
      cyc.pen.setAttribute('opacity', p < 0 ? 0 : 1);
      cyc.colHi.setAttribute('x', T.x0 + Math.max(0, p) * T.cw);
      cyc.colHi.setAttribute('opacity', p < 0 ? 0 : 1);
      cyc.colHi.setAttribute('class', P + 't-col' + (ph && ph.kind ? ' k-' + ph.kind : ''));
      cyc.phNames.forEach((t, j) => { t.classList.toggle('is-cur', j === p); t.classList.toggle('is-past', j < p); });
    }

    function track(tw, fin) {
      const a = { tw: tw, fin: fin, done: false };
      const run = () => { if (!a.done) { a.done = true; fin(); } };
      a.run = run;
      cyc.anim.push(a);
      tw.finished.then((ok) => { if (ok) run(); });
    }

    function finishAnims() {
      const list = cyc.anim;
      cyc.anim = [];
      list.forEach((a) => { a.tw.cancel(); a.run(); });
    }

    /** Anima il passaggio alla fase idx (lo stato finale è già stato applicato). */
    function playStep(idx, prevIdx) {
      const v = stepAt(idx);
      const c = v.c;
      const p = v.p;
      const D = cyc.running ? Math.min(CP.dur.slow, interval() * 0.55) : CP.dur.slow;
      const T = cyc.tim;
      const sameCycle = prevIdx >= 0 && (prevIdx >> 3) === (idx >> 3);
      const fromW = sameCycle ? ((prevIdx & 7) + 1) * T.cw + 2 : 0;
      const toW = cyc.revealX;
      track(CP.tween({ from: fromW, to: toW, duration: D, ease: 'inOut', onUpdate: setReveal }), () => setReveal(toW));

      if (v.ph.bus != null) {
        const G = cyc.tokGeo;
        const a = v.ph.dir === 'out' ? G.from : G.to;
        const b = v.ph.dir === 'out' ? G.to : G.from;
        const destKey = p < 3 ? ['latchL', 'latchM', 'latchH'][p] : c.word === 2 ? (p === 3 ? 's1' : 's2') : (p === 3 ? 'opr' : 'opa');
        const dest = boxOf(destKey);
        if (p < 3) flash(boxOf(['pcL', 'pcM', 'pcH'][p]).fl, 0.7);
        else flash(cyc.rows[c.addr].fl, 0.6);
        dest.t.setAttribute('opacity', 0);
        const tok = cyc.token;
        const place = (q) => tok.setAttribute('transform', 'translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')');
        place(a);
        track(CP.tween({ from: a.slice(), to: b.slice(), duration: D, ease: 'smooth', onUpdate: place }), () => {
          place(b);
          dest.t.removeAttribute('opacity');
          flash(dest.fl, 0.8);
        });
        return;
      }
      if (p === 5) (c.word === 2 ? ['s1', 's2'] : ['opr', 'opa']).forEach((k) => flash(boxOf(k).fl, 0.6));
      if (p === 6) {
        if (c.exec.alu) flash(cyc.alu.querySelector('.' + P + 'alu-fl'), 0.7);
        else operands(c).forEach((k) => flash(boxOf(k).fl, 0.5));
      }
      if (p === 7) {
        const st = v.ph.state;
        moves(c).forEach((m, i) => {
          const chip = cyc.fly[i];
          const dest = boxOf(m[1]);
          const from = m[0] === 'alu' ? cyc.aluC : boxOf(m[0]).c;
          const to = dest.c;
          chip.t.textContent = fmt.hex(valueOf(st, m[1]), 1);
          dest.t.setAttribute('opacity', 0);
          const place = (q) => chip.setAttribute('transform', 'translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')');
          place(from);
          chip.setAttribute('opacity', 1);
          track(CP.tween({ from: from.slice(), to: to.slice(), duration: D, delay: i * 80, ease: 'smooth', onUpdate: place }), () => {
            chip.setAttribute('opacity', 0);
            dest.t.removeAttribute('opacity');
            flash(dest.fl, 0.85);
          });
        });
      }
    }

    /* ----- testi della spiegazione ----- */

    const H3 = (n) => fmt.hex(n, 3);
    const H2 = (n) => fmt.hex(n, 2);

    function opaMeaning(c) {
      const d = c.instr;
      if (d.mn === 'LDM') return 'per LDM è il dato da caricare, ' + d.opa;
      if (d.mn === 'JUN') return 'per JUN sono i 4 bit alti dell\'indirizzo di destinazione';
      if (d.opr === 0xf) return 'nel gruppo 1111 sceglie l\'operazione sull\'accumulatore: ' + bin4(d.opa) + ' è ' + d.mn;
      return 'indica il registro R' + d.opa;
    }

    function decodeText(c) {
      const d = c.instr;
      if (c.word === 2) return 'Il 4004 sa già che sta completando un JUN: gli 8 bit appena arrivati sono un indirizzo, non un\'istruzione.';
      switch (d.mn) {
        case 'LDM': return 'Il decodificatore riconosce LDM: carica nell\'accumulatore il dato scritto dentro l\'istruzione stessa.';
        case 'XCH': return 'Il decodificatore riconosce XCH R' + d.opa + ': scambia il contenuto dell\'accumulatore con quello di un registro.';
        case 'ADD': return 'Il decodificatore riconosce ADD R' + d.opa + ': somma un registro all\'accumulatore, più il riporto.';
        case 'TCC': return 'Il decodificatore riconosce TCC: copia il riporto nell\'accumulatore e poi lo azzera.';
        case 'JUN': return 'Il decodificatore riconosce JUN, un salto. È un\'istruzione da due byte: il prossimo ciclo servirà a prelevare il resto dell\'indirizzo.';
        default: return 'Il decodificatore riconosce ' + d.text + '.';
      }
    }

    function execText(v) {
      const c = v.c;
      const d = c.instr;
      const st = v.ph.state;
      if (c.word === 1 && d.words === 2) return 'Il 4004 tiene da parte i 4 bit alti dell\'indirizzo, ' + fmt.hex(d.opa, 1) + ', e prepara il prelievo del secondo byte.';
      if (c.exec.alu) { const a = c.exec.alu; return 'L\'ALU calcola ' + a.x + ' + ' + a.y + ' + ' + a.c + ' (il riporto) = ' + a.result + '.' + (a.result > 15 ? ' Il risultato non sta in 4 bit.' : ''); }
      switch (d.mn) {
        case 'LDM': return 'Il dato ' + d.opa + ' è già nel registro d\'istruzione: non serve leggere altro dalla memoria.';
        case 'XCH': return 'L\'accumulatore (' + fmt.hex(st.acc, 1) + ') e R' + d.opa + ' (' + fmt.hex(st.r[d.opa], 1) + ') si preparano allo scambio.';
        case 'TCC': return 'Il riporto vale ' + st.cy + ': è questo il valore che finirà nell\'accumulatore.';
        case 'JUN': return 'I 12 bit dell\'indirizzo, ' + H3(c.after.pc) + ', vanno verso il contatore di programma.';
        default: return 'Il 4004 esegue l\'istruzione.';
      }
    }

    function copy(idx) {
      const v = stepAt(idx);
      if (!v) {
        return {
          step: 'Pronto · ' + cyc.trace.cycles.length + ' cicli in programma',
          title: 'Il 4004 è appena stato resettato',
          text: 'Il contatore di programma vale 000 e i registri sono a zero. Nella ROM c\'è un programma di 8 istruzioni che somma i due numeri scelti sopra e mette il risultato in R2 e R1. Premi Passo per la prima fase, oppure Esegui.',
        };
      }
      const c = v.c;
      const p = v.p;
      const n = v.ph.bus;
      const nb = n == null ? '' : fmt.hex(n, 1) + ' (' + bin4(n) + ')';
      const out = { step: 'Ciclo ' + (c.n + 1) + ' di ' + cyc.trace.cycles.length + ' · fase ' + I.PHASES[p] + ' (' + (p + 1) + ' di 8)' };
      switch (p) {
        case 0:
          out.title = 'A1 · esce la parte bassa dell\'indirizzo';
          out.text = 'Il 4004 mette sul bus i 4 bit più bassi del contatore di programma: ' + nb + '. La ROM li conserva. Ogni fase dura un periodo di clock: un impulso Φ1 e uno Φ2.';
          break;
        case 1:
          out.title = 'A2 · poi la parte centrale';
          out.text = 'Escono i bit da 4 a 7 dell\'indirizzo: ' + nb + '. L\'indirizzo ha 12 bit e il bus solo 4 fili: servono tre fasi.';
          break;
        case 2:
          out.title = 'A3 · infine la parte alta, con CM-ROM';
          out.text = 'Gli ultimi 4 bit, ' + nb + ', dicono quale delle 16 ROM possibili deve rispondere: qui la numero ' + n + '. La linea CM-ROM si accende per avvisarle. Ora la ROM conosce l\'indirizzo completo: ' + H3(c.addr) + '.';
          break;
        case 3:
          if (c.word === 2) {
            out.title = 'M1 · rientra il secondo byte di JUN';
            out.text = 'Il byte ' + H2(c.byte) + ' non è un\'istruzione: sono gli 8 bit bassi dell\'indirizzo di destinazione. Prima arriva la metà alta: ' + nb + '.';
          } else {
            out.title = 'M1 · rientra la metà alta dell\'istruzione';
            out.text = 'La ROM risponde: all\'indirizzo ' + H3(c.addr) + ' c\'è il byte ' + H2(c.byte) + '. Prima arriva la metà alta, OPR = ' + nb + ': il codice operativo, che dice di quale istruzione si tratta.';
          }
          break;
        case 4:
          if (c.word === 2) {
            out.title = 'M2 · la metà bassa dell\'indirizzo';
            out.text = 'Arrivano gli ultimi 4 bit: ' + nb + '. Con i 4 bit di OPA del primo byte, l\'indirizzo di destinazione è completo: ' + H3(c.after.pc) + '.';
          } else {
            out.title = 'M2 · poi la metà bassa';
            out.text = 'Arriva OPA = ' + nb + ': ' + opaMeaning(c) + '. Intanto il contatore di programma è già passato a ' + H3(v.ph.state.pc) + '.';
          }
          break;
        case 5:
          out.title = 'X1 · decodifica';
          out.text = decodeText(c) + ' Il bus resta libero.';
          break;
        case 6:
          out.title = 'X2 · esecuzione';
          out.text = execText(v);
          break;
        default:
          out.title = 'X3 · risultato, e SYNC';
          out.text = c.exec.text + ' Il 4004 attiva SYNC: con la fase successiva comincia un nuovo ciclo.';
          if (c.halt) {
            const f = v.ph.state;
            out.text += ' Il programma è finito: JUN 007 salta su se stesso e il 4004 ripeterebbe questa istruzione per sempre.';
            out.result = 'Risultato in R2 R1: ' + fmt.hex(f.r[2], 1) + fmt.hex(f.r[1], 1) + ' in esadecimale, cioè ' + ((f.r[2] << 4) | f.r[1]) + ' = ' + cyc.a + ' + ' + cyc.b + '.';
          }
      }
      return out;
    }

    /* ================= interfaccia ================= */

    // --- vista 1: esploratore ---
    const dieStage = h('div', { class: 'cp-stage ' + P + 'die-stage' });
    const dieExplain = h('div', { class: 'cp-explain ' + P + 'explain' },
      dieInfo.step, dieInfo.title, dieInfo.text, dieInfo.tie,
      h('div', { class: P + 'progress' }, dieInfo.count, h('div', { class: P + 'pips', 'aria-hidden': 'true' }, dieInfo.pips)));
    const dieView = h('div', { class: P + 'view', 'data-view': 'die' },
      h('div', { class: 'cp-lab-grid' }, dieStage, dieExplain),
      h('p', { class: 'cp-hint' }, 'Ricostruzione didattica, non una fotografia: le aree sono al loro posto in modo plausibile ma semplificato, e le piazzole sono disegnate solo su due lati.'));

    // --- vista 2: ciclo di istruzione ---
    const ro = {
      pc: ui.readout('PC', '000'), ir: ui.readout('IR', '––'), acc: ui.readout('A', '0'), cy: ui.readout('CY', '0'),
      r0: ui.readout('R0', '0'), r1: ui.readout('R1', '0'), r2: ui.readout('R2', '0'),
    };
    const cycInfo = {
      step: h('span', { class: 'step' }, ''),
      title: h('h4', null, ''),
      text: h('p', null, ''),
      result: h('p', { class: P + 'result', hidden: true }, ''),
    };
    const cycExplain = h('div', { class: 'cp-explain ' + P + 'explain' },
      cycInfo.step, cycInfo.title, cycInfo.text, cycInfo.result,
      h('div', { class: P + 'readouts' }, Object.keys(ro).map((k) => ro[k])));
    const cycStage = h('div', { class: 'cp-stage ' + P + 'cyc-stage' });
    const timCap = h('span', null, '');
    const timWrap = h('div', { class: P + 'tim-wrap' });
    const timing = h('div', { class: P + 'timing' }, h('p', { class: P + 'timing-h' }, h('b', null, 'Diagramma temporale'), ' ', timCap), timWrap);

    const btnReset = ui.button({ label: 'Da capo', icon: '⏮', onClick: () => { setRunning(false); goTo(-1, false); } });
    const btnBack = ui.button({ label: 'Indietro', icon: '◀', onClick: () => { setRunning(false); step(-1); } });
    const btnStep = ui.button({ label: 'Passo', icon: '▶', primary: true, onClick: () => { setRunning(false); step(1); } });
    const btnNext = ui.button({ label: 'Istruzione', icon: '⏭', title: 'Salta all\'inizio dell\'istruzione successiva', onClick: () => { setRunning(false); nextInstr(); } });
    btnNext.setAttribute('aria-label', 'Istruzione successiva');
    const btnRun = ui.button({ label: 'Esegui', icon: '▶▶', onClick: () => setRunning(!cyc.running) });
    btnRun.setAttribute('aria-pressed', 'false');
    const speed = ui.range({ label: 'Velocità', min: 1, max: 4, value: cyc.speed, format: (x) => ['lenta', 'media', 'veloce', 'turbo'][x - 1], onInput: (x) => { cyc.speed = x; } });
    const inA = ui.range({ label: 'Primo numero', min: 0, max: 15, value: cyc.a, format: (x) => x + ' · ' + bin4(x), onInput: (x) => { cyc.a = x; CP.store.set('i4004-a', x); reprogram(); } });
    const inB = ui.range({ label: 'Secondo numero', min: 0, max: 15, value: cyc.b, format: (x) => x + ' · ' + bin4(x), onInput: (x) => { cyc.b = x; CP.store.set('i4004-b', x); reprogram(); } });

    const cycView = h('div', { class: P + 'view', 'data-view': 'cycle', hidden: true },
      ui.bar(h('div', { class: 'cp-bar-group' }, btnReset, btnBack, btnStep, btnNext, btnRun), speed),
      h('div', { class: 'cp-bar ' + P + 'prog-bar' }, h('span', { class: P + 'prog-lbl' }, 'Programma: somma'), inA, inB),
      h('div', { class: P + 'cyc-grid' }, cycStage, cycExplain, timing),
      ui.legend([['Indirizzo (fasi A)', 'var(--sig-addr)'], ['Istruzione (fasi M)', 'var(--sig-data)'], ['Controllo: SYNC, CM-ROM', 'var(--sig-ctrl)'], ['Risultato scritto (X3)', 'var(--sig-on)']]),
      h('p', { class: 'cp-hint' }, 'Bus, SYNC e CM-ROM seguono la scheda tecnica del 4004; la divisione delle fasi X1, X2 e X3 in decodifica, calcolo e scrittura è una semplificazione del funzionamento interno.'));

    // --- selettore e obiettivo ---
    let mode = CP.store.get('i4004-mode', 'die') === 'cycle' ? 'cycle' : 'die';
    const seg = ui.seg({
      label: 'Vista del laboratorio', value: mode,
      options: [{ value: 'die', label: 'Esploratore del die' }, { value: 'cycle', label: 'Ciclo di istruzione' }],
      onChange: (m) => setMode(m),
    });
    const goalA = h('span', { class: P + 'goal-part' }, '');
    const goalB = h('span', { class: P + 'goal-part' }, '');
    const goal = h('p', { class: 'cp-goal' }, h('span', null, 'Obiettivo: ', goalA, ' e ', goalB, '.'));
    mount.append(ui.bar(seg), dieView, cycView, goal);

    function setMode(m) {
      mode = m;
      dieView.hidden = m !== 'die';
      cycView.hidden = m !== 'cycle';
      if (m !== 'cycle') setRunning(false);
      CP.store.set('i4004-mode', m);
    }

    function updateExplain(idx) {
      const t = copy(idx);
      cycInfo.step.textContent = t.step;
      cycInfo.title.textContent = t.title;
      cycInfo.text.textContent = t.text;
      cycInfo.result.hidden = !t.result;
      cycInfo.result.textContent = t.result || '';
      const v = stepAt(idx);
      const st = v ? v.ph.state : null;
      ro.pc.set(st ? H3(st.pc) : '000');
      ro.ir.set(st && st.ir.hi != null ? fmt.hex(st.ir.hi, 1) + (st.ir.lo == null ? '–' : fmt.hex(st.ir.lo, 1)) : '––');
      ro.acc.set(st ? fmt.hex(st.acc, 1) : '0');
      ro.cy.set(st ? String(st.cy) : '0');
      ro.r0.set(st ? fmt.hex(st.r[0], 1) : '0');
      ro.r1.set(st ? fmt.hex(st.r[1], 1) : '0');
      ro.r2.set(st ? fmt.hex(st.r[2], 1) : '0');
      const c = v ? v.c : cyc.trace.cycles[0];
      timCap.textContent = '· ciclo ' + (c.n + 1) + ' di ' + cyc.trace.cycles.length + ': ' + (c.word === 2 ? c.instr.mn + ', secondo byte' : I.format(c.byte, cyc.prog.rom[c.addr + 1]));
    }

    function updateButtons() {
      btnBack.disabled = cyc.idx < 0;
      btnReset.disabled = cyc.idx < 0;
      btnStep.disabled = cyc.idx >= cyc.total - 1;
      btnNext.disabled = cyc.idx >= cyc.total - 8;
    }

    function popcount(x) { let k = 0; while (x) { k += x & 1; x >>= 1; } return k; }

    function checkGoal() {
      const a = die.seen.size;
      const best = cyc.instrDone ? 8 : Math.max(0, ...cyc.seen.map(popcount));
      goalA.textContent = 'esplora le 8 aree del die (' + (a === 8 ? '✓' : a + ' su 8') + ')';
      goalB.textContent = 'segui un\'istruzione completa nelle sue 8 fasi, da A1 a X3 (' + (cyc.instrDone ? '✓' : best + ' su 8') + ')';
      goalA.classList.toggle('ok', a === 8);
      goalB.classList.toggle('ok', cyc.instrDone);
      if (a === 8 && cyc.instrDone && !ctx.root.classList.contains('is-done')) {
        ctx.done();
        ctx.say('Obiettivo raggiunto: hai esplorato tutto il die e seguito un\'istruzione in tutte le sue 8 fasi.');
      }
    }

    function goTo(idx, anim, auto) {
      finishAnims();
      const prev = cyc.idx;
      cyc.idx = idx;
      applyState(idx);
      if (anim && idx >= 0 && idx === prev + 1 && !ctx.reduced) playStep(idx, prev);
      updateExplain(idx);
      updateButtons();
      const v = stepAt(idx);
      if (v) {
        cyc.seen[v.c.n] |= 1 << v.p;
        if (cyc.seen[v.c.n] === 255) cyc.instrDone = true;
      }
      checkGoal();
      if (!auto && v) ctx.say(cycInfo.title.textContent + '. ' + cycInfo.text.textContent);
      if (auto && v && v.c.halt && v.p === 7) ctx.say('Programma finito. ' + cycInfo.result.textContent);
    }

    function step(delta, auto) {
      const next = cyc.idx + delta;
      if (next < -1 || next > cyc.total - 1) return false;
      goTo(next, delta === 1, auto);
      return next < cyc.total - 1;
    }

    function nextInstr() {
      const next = cyc.idx < 0 ? 0 : Math.min(cyc.total - 8, ((cyc.idx >> 3) + 1) * 8);
      goTo(next, false);
    }

    function setRunning(on) {
      if (on === cyc.running) return;
      cyc.running = on;
      btnRun.setAttribute('aria-pressed', String(on));
      btnRun.querySelector('.cp-ico').textContent = on ? '❚❚' : '▶▶';
      btnRun.querySelector('.cp-ico + span').textContent = on ? 'Pausa' : 'Esegui';
      if (on) {
        if (cyc.idx >= cyc.total - 1) goTo(-1, false);
        let acc = interval();
        cyc.stopRun = ctx.tick((dt) => {
          acc += dt;
          if (acc < interval()) return;
          acc = 0;
          if (!step(1, true)) setRunning(false);
        });
      } else if (cyc.stopRun) {
        cyc.stopRun();
        cyc.stopRun = null;
      }
    }

    function reprogram() {
      setRunning(false);
      finishAnims();
      rebuildProgram();
      fillRom();
      cyc.tcycle = -1;
      cyc.idx = -1;
      goTo(-1, false);
      ctx.say('Programma aggiornato: ' + cyc.a + ' più ' + cyc.b + '.');
    }

    /* ----- disposizione: larga o stretta secondo lo spazio ----- */

    function relayout(width) {
      const L = width < 600 ? 'narrow' : 'wide';
      if (L === die.layout) return;
      finishAnims();
      dieStage.textContent = '';
      dieStage.append(buildDie(L));
      dieStage.classList.toggle('is-narrow', L === 'narrow');
      if (die.sel && die.sel.kind === 'area') selectArea(die.sel.key, true);
      else if (die.sel && die.sel.kind === 'pin') selectPin(die.sel.key, true);
      else markDie(null, null);
      cycStage.textContent = '';
      cycStage.append(buildCycle(L));
      timWrap.textContent = '';
      timWrap.append(buildTiming(L));
      applyState(cyc.idx);
    }

    rebuildProgram();
    relayout(mount.clientWidth || 800);
    if ('ResizeObserver' in root) {
      let lastW = 0;
      new ResizeObserver((entries) => {
        const w = Math.round(entries[0].contentRect.width);
        if (!w || w === lastW) return;
        lastW = w;
        relayout(w);
      }).observe(mount);
    }
    setMode(mode);
    goTo(-1, false);
    updateDieProgress();
    checkGoal();
  });
})(window);
