/*
 * Capitolo 8 · Dentro il chip (1959 – oggi).
 * Uno zoom dal contenitore agli atomi, il MOSFET e i suoi inventori, le celle standard e la progettazione automatica,
 * il grattacielo dei collegamenti di rame, la pianta di un chip moderno, il transistor diventato tridimensionale.
 * Laboratori: lo zoom in sei livelli, il transistor MOS, una porta NAND dal disegno al silicio,
 * gli strati dei collegamenti, dal transistor piatto ai nanosheet.
 * Figura: la pianta di un system on a chip.
 */
(function () {
  'use strict';

  const { h, s, ui } = PL;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /* passaggio morbido da 0 a 1 mentre t va da a a b */
  const ramp = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const f3 = (v) => Math.round(v * 1000) / 1000;

  /* Numeri pseudocasuali con seme: lo stesso disegno a ogni visita. */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Una lunghezza in metri, con l'unità adatta: 0,0018 → "1,8 mm", 2e-9 → "2 nm". */
  function len(m) {
    const [k, u] = m >= 1e-3 ? [1e3, 'mm'] : m >= 1e-6 ? [1e6, 'µm'] : [1e9, 'nm'];
    const v = m * k;
    return (v >= 10 ? PL.fmt(Math.round(v)) : PL.fmt(Math.round(v * 10) / 10)) + ' ' + u;
  }

  /* ---------- la pianta del chip immaginario ---------- */
  // Coordinate del livello «chip» dello zoom: il die è largo 533 e alto 352, e rappresenta 12 × 7,9 mm.
  // La stessa pianta serve allo zoom e alla figura della sezione «La pianta di un chip».

  const DIE = { x: 53.5, y: 24, w: 533, h: 352 };
  const FLOOR = [
    { id: 'p', kind: 'pcore', name: 'Core ad alte prestazioni', rects: [[72, 42, 96, 64], [172, 42, 96, 64], [72, 110, 96, 64], [172, 110, 96, 64]],
      text: 'Quattro core grandi e veloci, per i programmi più pesanti. Consumano molto, quindi si accendono solo quando servono.' },
    { id: 'e', kind: 'ecore', name: 'Core a basso consumo', rects: [[276, 42, 40, 34], [320, 42, 40, 34], [276, 80, 40, 34], [320, 80, 40, 34]],
      text: 'Quattro core piccoli ed efficienti: fanno i lavori leggeri e quelli in sottofondo con pochissima energia, e fanno durare di più la batteria.' },
    { id: 'l2', kind: 'sram', name: 'Cache L2', rects: [[72, 178, 196, 44], [276, 118, 84, 22]],
      text: 'Le cache di secondo livello, condivise dai core di ogni gruppo: qualche megabyte di memoria velocissima, fatta di celle da sei transistor per ogni bit.' },
    { id: 'npu', kind: 'npu', name: 'Unità per l\'intelligenza artificiale (NPU)', rects: [[276, 144, 84, 78]],
      text: 'Una griglia di piccoli moltiplicatori che lavorano tutti insieme: esegue in fretta, e con pochi watt, i calcoli delle reti neurali.' },
    { id: 'gpu', kind: 'gpu', name: 'Unità grafica (GPU)', rects: [[368, 42, 200, 180]],
      text: 'Otto blocchi con centinaia di piccole unità di calcolo che lavorano in parallelo: perfette per le immagini e per tutti i calcoli che si ripetono uguali su moltissimi dati.' },
    { id: 'slc', kind: 'sram', name: 'Cache di sistema', rects: [[72, 226, 496, 50]],
      text: 'Una grande cache condivisa da tutte le unità del chip: core, grafica e NPU vi trovano i dati usati di recente senza dover andare fino alla memoria esterna.' },
    { id: 'mem', kind: 'phy', name: 'Controllori della memoria', rects: [[72, 280, 132, 78], [420, 280, 148, 78]],
      text: 'Dialogano con i chip di memoria che stanno accanto al processore, spostando decine di miliardi di byte al secondo.' },
    { id: 'media', kind: 'logic', name: 'Motori video', rects: [[208, 280, 100, 78]],
      text: 'Circuiti dedicati che comprimono e decomprimono i filmati: lo fanno consumando molto meno di un core.' },
    { id: 'io', kind: 'logic2', name: 'Ingressi e uscite', rects: [[312, 280, 104, 78]],
      text: 'I circuiti per lo schermo, la fotocamera, le prese USB e gli altri collegamenti con il resto del dispositivo.' },
  ];

  // Le unità di un core (coordinate del livello «core» dello zoom: il core è largo 555, cioè circa 1,6 mm).
  const CORE = { x: 42.5, y: 18.5, w: 555, h: 363 };
  const UNITS = [
    { kind: 'sram', name: 'cache L1 istruzioni', r: [50.5, 26.5, 150, 120] },
    { kind: 'sram2', name: 'previsione dei salti', r: [208.5, 26.5, 110, 120] },
    { kind: 'logic', name: 'decodifica', r: [326.5, 26.5, 263, 120] },
    { kind: 'reg', name: 'registri', r: [50.5, 154.5, 150, 116] },
    { kind: 'logic', name: 'unità di calcolo', r: [208.5, 154.5, 200, 116] },
    { kind: 'logic', name: 'unità vettoriale', r: [416.5, 154.5, 173, 116] },
    { kind: 'sram', name: 'cache L1 dati', r: [50.5, 278.5, 270, 95] },
    { kind: 'logic', name: 'lettura e scrittura', r: [328.5, 278.5, 261, 95] },
  ];

  /* Trame ripetute (memorie, logica, griglie) per un <svg>: restituisce gli id da usare come riempimento. */
  function textures(defs, prefix) {
    const id = (k) => prefix + '-' + k;
    const pat = (k, w, hh, attrs, ...kids) => s('pattern', Object.assign({ id: id(k), width: w, height: hh, patternUnits: 'userSpaceOnUse' }, attrs || {}), ...kids);
    defs.append(
      pat('sram', 8, 8, null, s('rect', { class: 'zt-sram-bg', width: 8, height: 8 }),
        s('rect', { class: 'zt-sram', x: 0.6, y: 0.6, width: 3, height: 3 }), s('rect', { class: 'zt-sram', x: 4.4, y: 0.6, width: 3, height: 3 }),
        s('rect', { class: 'zt-sram', x: 0.6, y: 4.4, width: 3, height: 3 }), s('rect', { class: 'zt-sram', x: 4.4, y: 4.4, width: 3, height: 3 })),
      pat('sram2', 6, 6, null, s('rect', { class: 'zt-sram2-bg', width: 6, height: 6 }), s('rect', { class: 'zt-sram2', x: 0.5, y: 0.5, width: 5, height: 2.2 })),
      pat('reg', 5, 12, null, s('rect', { class: 'zt-reg-bg', width: 5, height: 12 }), s('rect', { class: 'zt-reg', x: 0.6, y: 0.6, width: 1.6, height: 10.8 })),
      // le righe della logica hanno il passo delle file di celle viste da lontano (6,25 = 50 / 8)
      pat('logic', 24, 6.25, { y: 187.5 }, s('rect', { class: 'zt-logic-bg', width: 24, height: 6.25 }),
        s('rect', { class: 'zt-logic', y: 0.7, width: 24, height: 4.85 }),
        s('rect', { class: 'zt-logic-cut', x: 7, y: 0.7, width: 0.8, height: 4.85 }), s('rect', { class: 'zt-logic-cut', x: 17.5, y: 0.7, width: 0.8, height: 4.85 })),
      pat('logic2', 18, 6.25, null, s('rect', { class: 'zt-logic2-bg', width: 18, height: 6.25 }),
        s('rect', { class: 'zt-logic2', y: 0.7, width: 18, height: 4.85 }), s('rect', { class: 'zt-logic-cut', x: 11, y: 0.7, width: 0.8, height: 4.85 })),
      pat('phy', 14, 5, null, s('rect', { class: 'zt-phy-bg', width: 14, height: 5 }), s('rect', { class: 'zt-phy', y: 1.6, width: 14, height: 1.8 })),
      pat('npu', 9, 9, null, s('rect', { class: 'zt-npu-bg', width: 9, height: 9 }), s('rect', { class: 'zt-npu', x: 1, y: 1, width: 7, height: 7, rx: 1 })));
    return { sram: id('sram'), sram2: id('sram2'), reg: id('reg'), logic: id('logic'), logic2: id('logic2'), phy: id('phy'), npu: id('npu') };
  }

  /* Le unità di un core, in piccolo dentro il blocco di un core: stessa disposizione del livello «core». */
  function miniCore(cx, cy, k, tex) {
    return s('g', { class: 'z-mini', transform: `translate(${cx} ${cy}) scale(${k}) translate(-320 -200)` },
      s('rect', { class: 'zf-core', x: CORE.x, y: CORE.y, width: CORE.w, height: CORE.h }),
      UNITS.map((u) => s('rect', { x: u.r[0], y: u.r[1], width: u.r[2], height: u.r[3], fill: `url(#${tex[u.kind]})` })));
  }

  /* Disegna i blocchi della pianta: con le trame (detail) o solo colorati (per il die visto da lontano). */
  function drawFloor(tex, detail) {
    const g = s('g', { class: 'zf' });
    for (const b of FLOOR) {
      const bg = s('g', { class: 'zf-blk is-' + b.kind, 'data-blk': b.id });
      for (const [x, y, w, hh] of b.rects) {
        bg.append(s('rect', { class: 'zf-base', x, y, width: w, height: hh }));
        if (!detail) continue;
        const cx = x + w / 2;
        const cy = y + hh / 2;
        if (b.kind === 'pcore') bg.append(miniCore(cx, cy, 0.125, tex));
        else if (b.kind === 'ecore') {
          bg.append(s('rect', { class: 'zf-ecore', x: x + 4, y: y + 4, width: w - 8, height: hh - 8 }),
            s('rect', { x: x + 6, y: y + 6, width: 12, height: hh - 12, fill: `url(#${tex.sram})` }),
            s('rect', { x: x + 20, y: y + 6, width: w - 26, height: hh - 12, fill: `url(#${tex.logic})` }));
        } else if (b.kind === 'gpu') {
          for (let i = 0; i < 8; i++) {
            const gx = x + 6 + (i % 4) * 48;
            const gy = y + 6 + Math.floor(i / 4) * 106;
            bg.append(s('rect', { class: 'zf-gcore', x: gx, y: gy, width: 44, height: 62 }),
              s('rect', { x: gx + 3, y: gy + 3, width: 38, height: 38, fill: `url(#${tex.logic2})` }),
              s('rect', { x: gx + 3, y: gy + 44, width: 38, height: 15, fill: `url(#${tex.sram})` }));
          }
          bg.append(s('rect', { x: x + 6, y: y + 72, width: w - 12, height: 30, fill: `url(#${tex.sram})` }));
        } else {
          const t = { sram: tex.sram, npu: tex.npu, phy: tex.phy, logic: tex.logic, logic2: tex.logic2 }[b.kind];
          bg.append(s('rect', { x: x + 3, y: y + 3, width: w - 6, height: hh - 6, fill: `url(#${t})` }));
        }
      }
      g.append(bg);
    }
    return g;
  }

  /* I contatti lungo il bordo del die. */
  function padRing() {
    const g = s('g', { class: 'zf-pads' });
    const step = 17.6;
    for (let x = DIE.x + 12; x < DIE.x + DIE.w - 8; x += step) {
      g.append(s('rect', { x: x - 3.5, y: DIE.y + 3.5, width: 7, height: 7 }), s('rect', { x: x - 3.5, y: DIE.y + DIE.h - 10.5, width: 7, height: 7 }));
    }
    for (let y = DIE.y + 28; y < DIE.y + DIE.h - 20; y += step) {
      g.append(s('rect', { x: DIE.x + 3.5, y: y - 3.5, width: 7, height: 7 }), s('rect', { x: DIE.x + DIE.w - 10.5, y: y - 3.5, width: 7, height: 7 }));
    }
    return g;
  }

  /* ---------- laboratorio: dal contenitore agli atomi ---------- */

  function labZoom() {
    // Sei livelli; per ogni livello la finestra (centro) che diventa il livello successivo e l'ingrandimento del passo.
    // Il campo è la larghezza reale che corrisponde ai 640 punti del disegno.
    const LV = [
      { name: 'Scheda', field: 72e-3, vz: 5, win: [320, 200], view: 'vista dall\'alto' },
      { name: 'Chip', field: 14.4e-3, vz: 8, win: [120, 74], view: 'vista dall\'alto' },
      { name: 'Core', field: 1.8e-3, vz: 8, win: [308.5, 212.5], view: 'vista dall\'alto' },
      { name: 'Celle', field: 2e-6, vz: 25, win: [330.24, 236], view: 'vista dall\'alto' },
      { name: 'Transistor', field: 80e-9, vz: 40, win: [328, 180], view: 'vista in sezione' },
      { name: 'Atomi', field: 2e-9, view: 'vista in sezione' },
    ];
    const TEXT = [
      'Il contenitore del processore sulla scheda di un portatile, largo circa 3,5 cm, con accanto due chip di memoria. Qui lo vediamo senza coperchio: al centro c\'è il chip vero e proprio, il [[Die|die]], un rettangolo di silicio di 12 × 8 millimetri.',
      'Il die. Contiene una ventina di miliardi di transistor, e ogni zona ha un compito: i [[Core|core]] che eseguono i programmi, l\'unità grafica, quella per l\'intelligenza artificiale, le memorie [[Cache|cache]], i controllori della memoria e, lungo il bordo, i contatti. È la sua pianta, il [[Floorplan|floorplan]].',
      'Un core ad alte prestazioni, largo un millimetro e mezzo. Le cache hanno una trama regolare a quadretti; le zone a righe fitte sono logica, milioni di porte che decodificano le istruzioni ed eseguono i calcoli. Il riquadro tratteggiato segna il prossimo passo: un salto di 900 volte.',
      'Il campo ora è largo appena 2 micrometri. Le porte logiche sono [[Cella standard|celle standard]], tutte alte uguali e messe in fila come libri su uno scaffale, tra un binario di metallo che porta l\'alimentazione e uno collegato a massa. Le righe rosse verticali sono i [[Gate|gate]] dei transistor.',
      'Cambiamo punto di vista: tagliamo il chip lungo la riga tratteggiata e guardiamo un solo transistor di lato. Il [[Canale|canale]] è fatto di tre fogli di silicio spessi 5 nanometri, e il gate li avvolge da ogni parte: è un transistor [[GAA]], con un gate lungo circa 14 nanometri.',
      'Gli atomi di silicio di uno dei fogli del canale, visti lungo una direzione in cui si allineano a coppie. Il disegno del cristallo si ripete ogni 0,543 nanometri: lo spessore del foglio, 5 nanometri, corrisponde a meno di quaranta strati di atomi.',
    ];
    const W = 640;
    const H = 400;
    const pre = PL.uid('z1');
    const st = { z: 0, lvl: -1, wpx: 640 };

    const defs = s('defs', null, s('clipPath', { id: pre + '-clip' }, s('rect', { width: W, height: H })),
      s('linearGradient', { id: pre + '-si', x1: 0, y1: 0, x2: 1, y2: 1 },
        s('stop', { offset: 0, 'stop-color': '#2c4352' }), s('stop', { offset: 0.5, 'stop-color': '#3c5868' }), s('stop', { offset: 1, 'stop-color': '#22343f' })),
      s('linearGradient', { id: pre + '-gloss', x1: 0, y1: 0, x2: 0, y2: 1 },
        s('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0.16 }), s('stop', { offset: 0.45, 'stop-color': '#fff', 'stop-opacity': 0 })),
      s('radialGradient', { id: pre + '-atom', cx: 0.38, cy: 0.34, r: 0.7 },
        s('stop', { offset: 0, 'stop-color': '#f2f7fa' }), s('stop', { offset: 0.45, 'stop-color': '#9fb4c2' }), s('stop', { offset: 1, 'stop-color': '#3b4f5c' })),
      s('linearGradient', { id: pre + '-metal', x1: 0, y1: 0, x2: 1, y2: 0 },
        s('stop', { offset: 0, 'stop-color': '#7d8791' }), s('stop', { offset: 0.5, 'stop-color': '#c3cbd2' }), s('stop', { offset: 1, 'stop-color': '#7d8791' })));
    const tex = textures(defs, pre);
    const art = PL.svg('0 0 640 400', { class: 'pl-svg z1-art', role: 'img' }, defs);

    // la finestra tratteggiata che diventerà il livello successivo
    const win = (k) => {
      const L = LV[k];
      const ww = W / L.vz;
      const wh = H / L.vz;
      return s('rect', { class: 'z1-win ns', x: L.win[0] - ww / 2, y: L.win[1] - wh / 2, width: ww, height: wh });
    };

    /* livello 0: la scheda (72 mm di campo, 8,9 punti per millimetro) */
    function lvBoard() {
      const r = rng(72);
      const g = s('g');
      g.append(s('rect', { class: 'z0-pcb', width: W, height: H }));
      const tr = s('g', { class: 'z0-traces' });
      for (let i = 0; i < 12; i++) {
        const x = 176 + i * 26 + r() * 6;
        const jog = (r() - 0.5) * 60;
        tr.append(s('path', { class: 'ns', d: `M${x} 84V${48 + r() * 10}L${x + jog} ${18 + r() * 8}V-5` }));
        tr.append(s('path', { class: 'ns', d: `M${x} 316V${350 - r() * 10}L${x - jog} ${380 - r() * 8}V405` }));
      }
      for (let i = 0; i < 7; i++) {
        const y = 108 + i * 30 + r() * 5;
        tr.append(s('path', { class: 'ns', d: `M160 ${y}H${120 - r() * 20}L${88 - r() * 20} ${y + (r() - 0.5) * 40}H-5` }));
        tr.append(s('path', { class: 'ns', d: `M480 ${y}H${520 + r() * 20}L${552 + r() * 20} ${y + (r() - 0.5) * 40}H645` }));
      }
      g.append(tr);
      // altri componenti sulla scheda
      g.append(
        s('rect', { class: 'z0-ic', x: 18, y: 16, width: 96, height: 66, rx: 3 }),
        s('rect', { class: 'z0-ind', x: 124, y: 18, width: 26, height: 26, rx: 4 }), s('rect', { class: 'z0-ind', x: 124, y: 52, width: 26, height: 26, rx: 4 }),
        s('rect', { class: 'z0-xtal', x: 556, y: 22, width: 52, height: 26, rx: 12 }),
        s('rect', { class: 'z0-conn', x: 508, y: 348, width: 116, height: 40, rx: 3 }));
      for (let i = 0; i < 9; i++) g.append(s('rect', { class: 'z0-gold', x: 514 + i * 12, y: 356, width: 7, height: 24 }));
      // il contenitore: substrato, memorie, condensatori, die
      g.append(s('rect', { class: 'z0-sub', x: 160, y: 84.5, width: 320, height: 231, rx: 8 }));
      g.append(s('rect', { class: 'z0-mem', x: 174, y: 130, width: 72, height: 140, rx: 3 }), s('rect', { class: 'z0-mem', x: 394, y: 130, width: 72, height: 140, rx: 3 }));
      const caps = s('g', { class: 'z0-caps' });
      for (let x = 268; x < 372; x += 12) caps.append(s('rect', { x, y: 148, width: 7, height: 3.5 }), s('rect', { x, y: 248.5, width: 7, height: 3.5 }));
      for (let y = 140; y < 262; y += 13) caps.append(s('rect', { x: 165, y, width: 3.5, height: 7 }), s('rect', { x: 471.5, y, width: 3.5, height: 7 }));
      for (let i = 0; i < 26; i++) caps.append(s('rect', { x: 16 + r() * 600, y: (i % 2 ? 330 : 92) + r() * 50, width: 7, height: 3.5 }));
      g.append(caps);
      g.append(s('rect', { class: 'z0-die', x: 266.7, y: 164.8, width: 106.6, height: 70.4, fill: `url(#${pre}-si)` }),
        s('g', { transform: 'translate(320 200) scale(0.2) translate(-320 -200)', opacity: 0.8 }, drawFloor(tex, false)),
        s('rect', { x: 266.7, y: 164.8, width: 106.6, height: 70.4, fill: `url(#${pre}-gloss)` }));
      return g;
    }

    /* livello 1: il die (14,4 mm di campo) */
    function lvDie() {
      return s('g', null,
        s('rect', { class: 'z0-sub', width: W, height: H }),
        s('rect', { class: 'z1-fillet', x: DIE.x - 5, y: DIE.y - 5, width: DIE.w + 10, height: DIE.h + 10, rx: 4 }),
        s('rect', { class: 'z1-die', x: DIE.x, y: DIE.y, width: DIE.w, height: DIE.h }),
        padRing(), drawFloor(tex, true));
    }

    /* livello 2: un core (1,8 mm di campo) */
    function lvCore() {
      return s('g', null,
        s('rect', { width: W, height: H, fill: `url(#${tex.logic})` }),
        s('rect', { class: 'zf-core', x: CORE.x, y: CORE.y, width: CORE.w, height: CORE.h }),
        UNITS.map((u) => s('g', null,
          s('rect', { x: u.r[0], y: u.r[1], width: u.r[2], height: u.r[3], fill: `url(#${tex[u.kind]})` }),
          s('rect', { class: 'z2-unit ns', x: u.r[0], y: u.r[1], width: u.r[2], height: u.r[3] }))));
    }

    /* livello 3: le celle standard (2 µm di campo, 1 punto = 3,125 nm) */
    const marks = {};
    function lvCells() {
      const r = rng(2025);
      const SITE = 15.36; // passo dei gate: 48 nm
      const g = s('g');
      g.append(s('rect', { class: 'z3-bg', width: W, height: H }));
      const wells = s('g', { class: 'z3-well' });
      const act = s('g', { class: 'z3-act' });
      const cont = s('g', { class: 'z3-ct' });
      const m1 = s('g', { class: 'z3-m1' });
      const bounds = s('g', { class: 'z3-bound' });
      // larghezze delle celle tra due siti, che sommano esattamente
      const split = (a, b) => {
        const out = [];
        let x = a;
        while (x < b) {
          let w = 2 + Math.floor(r() * 5);
          if (b - x - w === 1) w += 1;
          if (x + w > b) w = b - x;
          out.push([x, x + w]);
          x += w;
        }
        return out;
      };
      for (let row = 0; row < 8; row++) {
        const y0 = row * 50;
        const even = row % 2 === 0;
        const pY = even ? y0 + 8 : y0 + 30;
        const nY = even ? y0 + 30 : y0 + 8;
        const vddY = even ? y0 + 3 : y0 + 47;
        const vssY = even ? y0 + 47 : y0 + 3;
        wells.append(s('rect', { x: 0, y: even ? y0 : y0 + 25, width: W, height: 25 }));
        const cells = row === 4 ? split(0, 19).concat([[19, 24]], split(24, 42)) : split(0, 42);
        for (const [a, b] of cells) {
          const x0 = a * SITE;
          const x1 = b * SITE;
          const special = row === 4 && a === 19;
          act.append(s('rect', { class: 'is-p', x: x0 + 3, y: pY, width: x1 - x0 - 6, height: 12 }), s('rect', { class: 'is-n', x: x0 + 3, y: nY, width: x1 - x0 - 6, height: 12 }));
          bounds.append(s('rect', { x: x0 - 0.6, y: y0 + 6, width: 1.2, height: 38 }));
          if (row === 2 && !marks.cell && x0 > 440 && x0 < 560) marks.cell = [(x0 + x1) / 2, y0 + 14];
          const inner = [];
          for (let k = a + 1; k < b; k++) inner.push(k);
          if (!inner.length) continue;
          const out = special ? 22 : inner[Math.floor(r() * inner.length)];
          for (const k of inner) {
            const x = k * SITE;
            const pc = k === out || r() < 0.5;
            const nc = k === out || (special && k === 21) || (!special && r() < 0.5);
            if (pc) cont.append(s('rect', { x: x - 2.5, y: pY + 3.5, width: 5, height: 5 }));
            if (nc) cont.append(s('rect', { x: x - 2.5, y: nY + 3.5, width: 5, height: 5 }));
            if (k === out) {
              m1.append(s('rect', { x: x - 2.3, y: Math.min(pY, nY) + 6, width: 4.6, height: 22 }));
              if (row === 5 && !marks.m1 && x > 380 && x < 520) marks.m1 = [x, y0 + 25];
            }
            else {
              if (pc && r() < 0.6) m1.append(s('rect', { x: x - 2.3, y: Math.min(pY + 6, vddY), width: 4.6, height: Math.abs(pY + 6 - vddY) }));
              if (nc && (special || r() < 0.6)) m1.append(s('rect', { x: x - 2.3, y: Math.min(nY + 6, vssY), width: 4.6, height: Math.abs(nY + 6 - vssY) }));
            }
          }
          // un piedino d'ingresso sul gate, tra le due zone attive
          if (b - a >= 3 && !special) {
            const k = a + Math.floor(r() * (b - a - 1));
            m1.append(s('rect', { class: 'is-pin', x: k * SITE + 4, y: y0 + 22.7, width: SITE + 7, height: 4.6 }));
          }
        }
      }
      g.append(wells, act, s('rect', { width: W, height: H, fill: `url(#${pre}-poly)` }), cont, m1, bounds);
      // binari di alimentazione condivisi da due file
      const rails = s('g', { class: 'z3-rail' });
      for (let k = 0; k <= 8; k++) rails.append(s('rect', { x: 0, y: k * 50 - 3.5, width: W, height: 7 }));
      g.append(rails);
      // qualche collegamento verticale sul secondo strato di metallo, con le sue «via»
      const m2 = s('g', { class: 'z3-m2' });
      for (let i = 0; i < 16; i++) {
        const x = 12 + Math.floor(r() * 60) * 10.24;
        const ya = 25 + Math.floor(r() * 6) * 50;
        const yb = ya + 50 * (1 + Math.floor(r() * 3));
        m2.append(s('rect', { x: x - 2, y: ya - 2, width: 4, height: Math.min(yb, 375) - ya + 4 }),
          s('rect', { class: 'is-via', x: x - 2, y: ya - 2, width: 4, height: 4 }), s('rect', { class: 'is-via', x: x - 2, y: Math.min(yb, 375) - 2, width: 4, height: 4 }));
      }
      g.append(m2);
      // la riga del taglio per la vista in sezione
      g.append(s('line', { class: 'z3-cut ns', x1: 300, y1: 236, x2: 360, y2: 236 }));
      return g;
    }
    defs.append(s('pattern', { id: pre + '-poly', width: 15.36, height: 50, patternUnits: 'userSpaceOnUse' },
      s('rect', { class: 'z3-poly', x: 5.43, y: 5, width: 4.5, height: 40 })));

    /* livello 4: un transistor gate-all-around in sezione (80 nm di campo, 8 punti per nanometro) */
    const SHEETS = [64, 160, 256];
    function lvGaa() {
      const g = s('g');
      g.append(s('rect', { class: 'z4-ild', width: W, height: H }),
        s('rect', { class: 'z4-sub', x: 0, y: 330, width: W, height: 70 }),
        s('path', { class: 'z4-epi', d: 'M-10 330V60L40 44H200L224 64V330Z' }),
        s('path', { class: 'z4-epi', d: 'M416 330V64L440 44H600L650 60V330Z' }),
        s('rect', { class: 'z4-gate', x: 264, y: 24, width: 112, height: 306 }),
        s('rect', { class: 'z4-cap', x: 256, y: -10, width: 128, height: 34 }),
        s('rect', { class: 'z4-spacer', x: 224, y: -10, width: 40, height: 74 }), s('rect', { class: 'z4-spacer', x: 376, y: -10, width: 40, height: 74 }));
      for (const y of [104, 200, 296]) {
        const hh = y === 296 ? 34 : 56;
        g.append(s('rect', { class: 'z4-spacer', x: 224, y, width: 40, height: hh }), s('rect', { class: 'z4-spacer', x: 376, y, width: 40, height: hh }));
      }
      for (const y of SHEETS) {
        g.append(s('rect', { class: 'z4-hk', x: 264, y: y - 8, width: 112, height: 56 }),
          s('rect', { class: 'z4-sheet', x: 224, y, width: 192, height: 40 }),
          s('rect', { x: 224, y, width: 192, height: 40, fill: `url(#${pre}-lat)` }));
      }
      // elettroni che corrono nei fogli quando si guarda il transistor da vicino
      const el = s('g', { class: 'z4-el' });
      SHEETS.forEach((y, j) => {
        for (let i = 0; i < 5; i++) el.append(s('circle', { class: 'z1-e', cx: 0, cy: y + 12 + ((i * 7) % 17), r: 3.2, style: `animation-delay:${-(i * 0.42 + j * 0.23).toFixed(2)}s` }));
      });
      g.append(el);
      for (const x of [72, 456]) {
        g.append(s('rect', { class: 'z4-ct', x, y: -10, width: 112, height: 80, fill: `url(#${pre}-metal)` }),
          s('rect', { class: 'z4-sil', x, y: 62, width: 112, height: 8 }));
      }
      return g;
    }

    /* livello 5: gli atomi (2 nm di campo, 320 punti per nanometro): il cristallo di silicio visto lungo [110] */
    const A = 173.8; // costante reticolare, 0,543 nm
    const DX = A / (2 * Math.SQRT2);
    const DV = A / 4;
    const V0 = 200 + DV / 2;
    // lo sfondo scuro degli atomi arriva solo alla fine: prima si vede il grigio del foglio di silicio
    const z5dark = s('rect', { class: 'z5-bg', width: W, height: H });
    function lvAtoms() {
      const pts = [];
      for (let j = -2; j <= 2; j++) {
        for (let i = -4; i <= 4; i++) {
          const u = 320 + i * 2 * DX;
          const v = V0 + j * A;
          pts.push([u, v], [u, v - DV], [u + DX, v + A / 2], [u + DX, v + A / 2 - DV]);
        }
      }
      const P = pts.filter(([u, v]) => u > -60 && u < 700 && v > -60 && v < 460);
      const g = s('g', { class: 'z5' });
      g.append(s('rect', { class: 'z4-sheet', width: W, height: H }), z5dark);
      const bonds = s('g', { class: 'z5-bonds' });
      const BL = Math.hypot(DX, DV);
      for (let i = 0; i < P.length; i++) {
        for (let j = i + 1; j < P.length; j++) {
          const d = Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]);
          if (Math.abs(d - DV) < 1 || Math.abs(d - BL) < 1) bonds.append(s('line', { x1: f3(P[i][0]), y1: f3(P[i][1]), x2: f3(P[j][0]), y2: f3(P[j][1]) }));
        }
      }
      g.append(bonds, s('g', null, P.map(([u, v]) => s('circle', { cx: f3(u), cy: f3(v), r: 16, fill: `url(#${pre}-atom)` }))));
      return g;
    }
    // gli stessi atomi, piccolissimi, come trama dei fogli di silicio del livello 4
    (() => {
      const k = 1 / 40;
      const tw = 2 * DX * k;
      const th = A * k;
      const ox = tw / 4;
      const oy = th * 0.375;
      const at = (x, y) => s('circle', { class: 'z4-atom', cx: f3(x), cy: f3(y), r: 0.4 });
      defs.append(s('pattern', { id: pre + '-lat', width: f3(tw), height: f3(th), patternUnits: 'userSpaceOnUse', x: f3(LV[4].win[0] - ox), y: f3(LV[4].win[1] + (V0 - 200) * k - oy) },
        at(ox, oy), at(ox, oy - DV * k), at(ox + DX * k, oy + th / 2), at(ox + DX * k, oy + th / 2 - DV * k)));
    })();

    const builders = [lvBoard, lvDie, lvCore, lvCells, lvGaa, lvAtoms];
    const levels = builders.map((b, i) => {
      const inner = s('g', { 'clip-path': `url(#${pre}-clip)` }, b());
      if (i < 5) inner.append(win(i));
      return s('g', { class: 'z1-lv', 'data-lv': i }, inner);
    });
    const wins = levels.map((g) => g.querySelector('.z1-win'));
    art.append(...levels);

    /* etichette, fuori dallo zoom: compaiono quando il livello è fermo */
    marks.cell = marks.cell || [500, 114];
    marks.m1 = marks.m1 || [440, 275];
    const LBL = [
      [['il chip (die)', 392, 118, 352, 170], ['memoria', 210, 64, 210, 130], ['contenitore', 520, 70, 470, 92, 'is-small'], ['condensatori', 300, 296, 314, 252, 'is-small']],
      [['core ad alte prestazioni', 160, 15, 170, 42], ['core a basso consumo', 330, 15, 318, 42, 'is-small'], ['GPU', 468, 136], ['NPU', 318, 190, null, null, 'is-small'], ['cache', 320, 256], ['memoria', 138, 324], ['contatti', 600, 395, 584, 372, 'is-small', 'end']],
      [['cache L1 istruzioni', 125, 90], ['previsione dei salti', 263, 90, null, null, 'is-small'], ['decodifica', 458, 90], ['registri', 125, 216], ['unità vettoriale', 503, 216, null, null, 'is-small'], ['cache L1 dati', 185, 330], ['lettura e scrittura', 458, 330], ['salto ×900', 360, 182, 349, 192, 'is-hop', 'start']],
      [['binario di alimentazione', 112, 166, 112, 199], ['gate', 214, 86, 222.72, 129, 'is-small'], ['una cella', marks.cell[0], 76, marks.cell[0], marks.cell[1]], ['collegamento in metallo', marks.m1[0], 330, marks.m1[0], marks.m1[1] + 8, 'is-small'], ['taglio', 372, 226, 361, 236, 'is-small', 'start']],
      [['source', 96, 222], ['drain', 544, 222], ['gate', 320, 137], ['canale: tre fogli di silicio', 320, 362, 320, 296], ['contatto', 128, 40, null, null, 'is-small'], ['isolante sottilissimo', 470, 120, 376, 152, 'is-small', 'start']],
      [['atomi di silicio', 112, 128, 197.1, 178.3]],
    ];
    const over = s('g', { class: 'z1-over', 'aria-hidden': 'true' });
    const labelSets = LBL.map((list) => {
      const g = s('g', { class: 'z1-lbls' });
      for (const [t, x, y, tx, ty, cls, anchor] of list) {
        const l = s('g', { class: 'z1-l ' + (cls || '') });
        if (tx != null) l.append(s('line', { class: 'z1-lead', x1: f3(x), y1: y + (ty > y ? 5 : -12), x2: f3(tx), y2: f3(ty) }), s('circle', { class: 'z1-dot', cx: f3(tx), cy: f3(ty), r: 2.6 }));
        l.append(s('text', { class: 'z1-t', x: f3(x), y, 'text-anchor': anchor || 'middle' }, t));
        g.append(l);
      }
      return g;
    });
    // la quota del cristallo: due coppie di atomi uguali, una sopra l'altra
    const qx = 320 + 4 * DX;
    labelSets[5].append(s('g', { class: 'z1-l' },
      s('path', { class: 'z1-quota', d: `M${f3(qx + 22)} ${f3(V0 - A)}h12M${f3(qx + 22)} ${f3(V0)}h12M${f3(qx + 28)} ${f3(V0 - A)}V${f3(V0)}` }),
      s('text', { class: 'z1-t', transform: `translate(${f3(qx + 50)} ${f3(V0 - A / 2)}) rotate(-90)`, 'text-anchor': 'middle' }, '0,543 nm')));
    const bar = s('path', { class: 'z1-bar' });
    const barT = s('text', { class: 'z1-t is-bar', x: 24, y: 362 });
    over.append(...labelSets, s('g', { class: 'z1-scale' }, bar, barT));
    art.append(over);

    const hudName = h('b');
    const hudView = h('span');
    const hudField = h('span', { class: 'pl-mono' });
    const hud = h('div', { class: 'z1-hud', 'aria-hidden': 'true' }, h('p', null, hudName, ' · ', hudView), h('p', null, hudField));
    const readout = h('p');

    function transform(k, t) {
      const L = LV[k];
      const Z = Math.pow(L.vz, t);
      const px = (L.win[0] - 320 / L.vz) / (1 - 1 / L.vz);
      const py = (L.win[1] - 200 / L.vz) / (1 - 1 / L.vz);
      return `translate(${f3(px)} ${f3(py)}) scale(${f3(Z)}) translate(${f3(-px)} ${f3(-py)})`;
    }
    const child = (k) => `translate(${LV[k].win[0]} ${LV[k].win[1]}) scale(${1 / LV[k].vz}) translate(-320 -200)`;

    function setZ(z) {
      st.z = clamp(z, 0, 5);
      const k = Math.min(4, Math.floor(st.z));
      const t = st.z - k;
      levels.forEach((g, i) => {
        let show = false;
        if (i === k) { g.setAttribute('transform', transform(k, t)); g.style.opacity = f3(1 - ramp(0.5, 0.92, t)); show = t < 0.92; }
        else if (i === k + 1) { g.setAttribute('transform', transform(k, t) + ' ' + child(k)); g.style.opacity = f3(ramp(0.42, 0.85, t)); show = t > 0.42; }
        g.style.display = show ? '' : 'none';
      });
      wins.forEach((w, i) => { if (w) w.style.opacity = i === k ? f3(1 - ramp(0.2, 0.6, t)) : 1; });
      z5dark.style.opacity = k === 4 ? f3(ramp(0.55, 0.97, t)) : 1;
      labelSets.forEach((g, i) => {
        const o = i === k ? 1 - ramp(0.02, 0.25, t) : i === k + 1 ? ramp(0.9, 1, t) : 0;
        g.style.opacity = f3(o);
        g.style.visibility = o > 0.01 ? 'visible' : 'hidden';
      });
      // campo inquadrato, scala e ingrandimento sullo schermo
      const F = LV[k].field * Math.pow(LV[k + 1].field / LV[k].field, t);
      const raw = (F * 120) / W;
      const p10 = Math.pow(10, Math.floor(Math.log10(raw)));
      const m = raw / p10 >= 5 ? 5 : raw / p10 >= 2 ? 2 : 1;
      const L = (m * p10 * W) / F;
      bar.setAttribute('d', `M24 372v8M24 376H${f3(24 + L)}M${f3(24 + L)} 372v8`);
      barT.textContent = len(m * p10);
      const rect = art.getBoundingClientRect();
      if (rect.width) st.wpx = rect.width;
      const N = (st.wpx * 0.0002646) / F;
      const e = Math.floor(Math.log10(N));
      const shown = N < 10 ? PL.fmt(Math.round(N * 10) / 10) : PL.fmt(Math.round(N / Math.pow(10, e - 1)) * Math.pow(10, e - 1));
      hudField.textContent = 'campo ' + len(F) + ' · ingrandimento ×' + shown;
      const lvl = Math.round(st.z);
      if (lvl !== st.lvl) {
        st.lvl = lvl;
        hudName.textContent = LV[lvl].name;
        hudView.textContent = LV[lvl].view;
        readout.replaceChildren(PL.rich(TEXT[lvl]));
        art.setAttribute('aria-label', 'Zoom dentro un chip, livello «' + LV[lvl].name + '»: ' + TEXT[lvl].replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (x, a, b) => b || a));
        art.classList.toggle('is-live', lvl === 4);
        seg.set(lvl, true);
      }
    }

    let anim = null;
    let auto = false;
    let autoTimer = 0;
    const ease = PL.motion.ease.inOut;
    const follow = (v) => { setZ(v); slider.set(Math.round(v * 100), true); };
    function goTo(target, dur, done) {
      if (anim) anim.cancel();
      anim = PL.tween({ from: st.z, to: target, duration: dur, ease, onUpdate: follow, onDone: () => { anim = null; if (done) done(); } });
    }
    function autoStep() {
      if (!auto) return;
      const next = Math.floor(st.z + 1e-6) + 1;
      if (next > 5) { stopAuto(); return; }
      goTo(next, 2200, () => { autoTimer = PL.timeout(autoStep, 1500); });
    }
    function startAuto() {
      auto = true;
      autoBtn.firstChild.textContent = '❚❚';
      autoBtn.lastChild.textContent = 'Ferma lo zoom';
      if (st.z > 4.99) goTo(0, 1600, () => { autoTimer = PL.timeout(autoStep, 700); });
      else autoStep();
    }
    function stopAuto() {
      auto = false;
      clearTimeout(autoTimer);
      autoBtn.firstChild.textContent = '▶';
      autoBtn.lastChild.textContent = st.z > 4.99 ? 'Rifai lo zoom' : 'Zoom automatico';
    }

    const seg = ui.segmented({ label: 'Livello di ingrandimento', value: 0, options: LV.map((L, i) => ({ value: i, label: L.name })),
      onChange: (v) => { stopAuto(); goTo(+v, Math.min(3200, 700 + Math.abs(+v - st.z) * 700)); } });
    const slider = ui.slider({ label: 'Zoom', min: 0, max: 500, step: 1, value: 0,
      format: (v) => { const k = Math.min(4, Math.floor(v / 100)); const t = v / 100 - k; return len(LV[k].field * Math.pow(LV[k + 1].field / LV[k].field, t)); },
      onInput: (v) => { stopAuto(); if (anim) anim.cancel(); setZ(v / 100); } });
    const autoBtn = ui.btn({ label: 'Zoom automatico', icon: '▶', kind: 'lab', onClick: () => (auto ? stopAuto() : startAuto()) });
    PL.onCleanup(() => clearTimeout(autoTimer));

    setZ(0);
    PL.onVisible(art, () => setZ(st.z));
    PL.listen(window, 'resize', () => setZ(st.z));

    return ui.lab({
      title: 'Dal contenitore agli atomi',
      intro: 'Sei livelli di ingrandimento, dalla scheda di un portatile agli atomi di un transistor. Scegli un livello, trascina il cursore o fai partire lo zoom automatico.',
      controls: [seg.el, slider.el, autoBtn],
      stage: h('div', { class: 'z1-wrap' }, art, hud),
      readout,
      caption: 'Un chip immaginario per portatili, con le misure tipiche dei processi più avanzati, disegnato in scala dove possibile. Tra il core e le celle l\'ingrandimento sale di 900 volte in un solo passo, e nella vista degli atomi questi sono disegnati più piccoli del vero, per lasciar vedere i legami. L\'ingrandimento indicato vale per lo schermo che stai usando.',
      class: 'z1-lab',
    });
  }

  /* ---------- laboratorio: il transistor MOS ---------- */

  function labMos() {
    const VT = 0.35;
    const st = { vg: 0.2, vd: 0.7, speed: 0 };
    const art = PL.svg('0 0 560 330', { class: 'pl-svg z2-art', role: 'img', 'aria-label': 'Sezione di un transistor nMOS: due zone di silicio di tipo n, il source e il drain, separate da silicio di tipo p; sopra, isolato da un sottile strato di ossido, il gate. Con una tensione sul gate sopra la soglia si forma un canale di elettroni tra source e drain.' });
    const r = rng(1960);
    const dep = s('rect', { class: 'z2-dep', x: 196, y: 150, width: 168, height: 10, rx: 6 });
    const ch = s('rect', { class: 'z2-ch', x: 196, y: 150, width: 168, height: 7 });
    const holes = [];
    const holeG = s('g', { class: 'z2-holes' });
    const hole = (x, y) => {
      const p = s('path', { d: `M${f3(x - 4)} ${f3(y)}h8M${f3(x)} ${f3(y - 4)}v8` });
      holes.push({ el: p, x, y });
      holeG.append(p);
    };
    // alcune lacune proprio sotto il gate: sono quelle che il gate respinge per prime
    for (let i = 0; i < 7; i++) hole(212 + i * 23 + r() * 8, 160 + r() * 22);
    for (let i = 0; i < 40; i++) {
      const x = 32 + r() * 496;
      const y = 168 + r() * 130;
      if ((x > 52 && x < 208 && y < 216) || (x > 352 && x < 508 && y < 216)) continue;
      hole(x, y);
    }
    const sdE = s('g', { class: 'z2-e' });
    for (const x0 of [64, 364]) {
      for (let i = 0; i < 9; i++) sdE.append(s('circle', { cx: f3(x0 + 10 + r() * 112), cy: f3(158 + r() * 38), r: 2.6 }));
    }
    const flow = [];
    const flowG = s('g', { class: 'z2-flow' });
    for (let i = 0; i < 12; i++) {
      const c = s('circle', { cx: 196 + i * 14, cy: 153.5, r: 2.6 });
      flow.push({ el: c, x: 196 + i * 14 });
      flowG.append(c);
    }
    const term = (x, name) => s('g', { class: 'z2-term' }, s('line', { x1: x, y1: 52, x2: x, y2: x === 280 ? 76 : 112 }), s('circle', { cx: x, cy: 46, r: 6 }),
      s('text', { class: 'z2-t', x, y: 26, 'text-anchor': 'middle' }, name));
    const vsT = s('text', { class: 'z2-v', x: 144, y: 50 }, '0 V');
    const vgT = s('text', { class: 'z2-v', x: 294, y: 50 });
    const vdT = s('text', { class: 'z2-v', x: 444, y: 50 });
    art.append(
      s('rect', { class: 'z2-p', x: 20, y: 150, width: 520, height: 160, rx: 4 }),
      holeG, dep,
      s('path', { class: 'z2-n', d: 'M60 150V184Q60 206 82 206H178Q200 206 200 184V150Z' }),
      s('path', { class: 'z2-n', d: 'M360 150V184Q360 206 382 206H478Q500 206 500 184V150Z' }),
      sdE, ch, flowG,
      s('rect', { class: 'z2-fox', x: 20, y: 140, width: 70, height: 10 }), s('rect', { class: 'z2-fox', x: 170, y: 140, width: 26, height: 10 }),
      s('rect', { class: 'z2-fox', x: 364, y: 140, width: 26, height: 10 }), s('rect', { class: 'z2-fox', x: 470, y: 140, width: 70, height: 10 }),
      s('rect', { class: 'z2-ox', x: 196, y: 140, width: 168, height: 10 }),
      s('rect', { class: 'z2-gate', x: 196, y: 96, width: 168, height: 44, rx: 2 }),
      s('rect', { class: 'z2-metal', x: 90, y: 112, width: 80, height: 38, rx: 2 }), s('rect', { class: 'z2-metal', x: 390, y: 112, width: 80, height: 38, rx: 2 }),
      s('rect', { class: 'z2-metal', x: 250, y: 76, width: 60, height: 20, rx: 2 }),
      term(130, 'source'), term(280, 'gate'), term(430, 'drain'), vsT, vgT, vdT,
      s('text', { class: 'z2-lbl', x: 130, y: 226, 'text-anchor': 'middle' }, 'n'), s('text', { class: 'z2-lbl', x: 430, y: 226, 'text-anchor': 'middle' }, 'n'),
      s('text', { class: 'z2-lbl is-small', x: 34, y: 298 }, 'silicio di tipo p'),
      s('text', { class: 'z2-lbl is-small', x: 280, y: 125, 'text-anchor': 'middle' }, 'gate'),
      s('text', { class: 'z2-lbl is-small is-ox', x: 372, y: 136 }, 'ossido'));
    const chLbl = s('text', { class: 'z2-lbl is-ch', x: 280, y: 176, 'text-anchor': 'middle' }, 'canale di elettroni');
    art.append(chLbl);

    const vgEl = h('dd', { class: 'pl-mono' });
    const chEl = h('dd');
    const swEl = h('dd');
    const meter = h('span');
    const meterT = h('small');
    const panel = h('div', { class: 'pl-lab-panel z2-panel' },
      h('h4', null, 'Il transistor'),
      h('dl', { class: 'z2-dl' }, h('dt', null, 'Tensione sul gate'), vgEl, h('dt', null, 'Tensione di soglia'), h('dd', { class: 'pl-mono' }, '0,35 V'),
        h('dt', null, 'Canale'), chEl, h('dt', null, 'Come interruttore'), swEl),
      h('p', { class: 'z2-kick' }, 'Corrente tra source e drain'), h('div', { class: 'z2-meter' }, meter), meterT);
    const readout = h('p');

    function update() {
      const on = st.vg >= VT;
      const over = Math.max(0, st.vg - VT) / (1 - VT);
      const d = 10 + (24 * Math.min(st.vg, VT)) / VT;
      dep.setAttribute('height', f3(d));
      ch.style.opacity = on ? f3(0.3 + 0.7 * Math.min(1, over * 1.6)) : 0;
      chLbl.style.opacity = on ? 1 : 0;
      holes.forEach((p) => { p.el.style.opacity = p.x > 190 && p.x < 370 && p.y < 150 + d + 6 ? 0 : 1; });
      const I = st.vd > 0 && on ? Math.pow(over, 1.3) : 0;
      st.speed = I;
      flowG.style.opacity = on ? 1 : 0;
      meter.style.width = (st.vd > 0 ? (on ? Math.max(4, I * 100) : 0.8) : 0) + '%';
      meterT.textContent = st.vd === 0 ? 'nessuna: manca la tensione tra source e drain' : !on ? 'quasi nulla: solo una piccolissima perdita' : I < 0.35 ? 'debole' : I < 0.7 ? 'media' : 'forte';
      vgEl.textContent = PL.fmt(st.vg, 2) + ' V';
      vgT.textContent = PL.fmt(st.vg, 2) + ' V';
      vdT.textContent = PL.fmt(st.vd, 1) + ' V';
      chEl.textContent = on ? 'formato' : 'assente';
      swEl.textContent = on ? 'chiuso: acceso' : 'aperto: spento';
      art.classList.toggle('is-on', on);
      let text;
      if (!on && st.vg <= 0.05) text = 'Senza tensione sul gate, tra source e drain c\'è solo silicio di tipo p: la corrente non passa. Il transistor è spento, come un interruttore aperto.';
      else if (!on) text = 'Con ' + PL.fmt(st.vg, 2) + ' V il gate respinge le cariche positive del silicio di tipo p e svuota la zona sotto l\'ossido, ma è ancora sotto la [[Tensione di soglia|soglia]] di 0,35 V: il canale non c\'è e la corrente non passa. Il transistor è spento.';
      else if (st.vd === 0) text = 'Sopra la soglia il gate richiama sotto l\'ossido uno strato sottilissimo di elettroni: il [[Canale|canale]] si è formato. Ma senza una tensione tra source e drain gli elettroni non hanno motivo di muoversi.';
      else text = 'Il canale è aperto e gli elettroni corrono dal source al drain: il transistor è acceso, come un interruttore chiuso. Più alta è la tensione sul gate, più elettroni ci sono nel canale e più forte è la corrente.';
      readout.replaceChildren(PL.rich(text));
      if (PL.reduced()) flow.forEach((f, i) => f.el.setAttribute('cx', 200 + i * 14));
    }
    if (!PL.reduced()) {
      PL.loop((dt) => {
        if (!st.speed) return;
        for (const f of flow) {
          f.x += dt * (30 + 170 * st.speed);
          if (f.x > 364) f.x -= 168;
          f.el.setAttribute('cx', f3(f.x));
        }
      }, { el: art });
    }
    const slider = ui.slider({ label: 'Tensione sul gate', min: 0, max: 1, step: 0.01, value: st.vg, format: (v) => PL.fmt(v, 2) + ' V', onInput: (v) => { st.vg = v; update(); } });
    const seg = ui.segmented({ label: 'Tensione tra source e drain', value: 0.7, options: [{ value: 0, label: 'drain a 0 V' }, { value: 0.7, label: 'drain a 0,7 V' }], onChange: (v) => { st.vd = v; update(); } });
    update();

    return ui.lab({
      title: 'Un interruttore comandato dalla tensione',
      intro: 'Un transistor nMOS tagliato a metà. Alza la tensione sul gate e guarda quando si forma il canale; poi togli la tensione tra source e drain.',
      controls: [slider.el, seg.el],
      stage: h('div', { class: 'pl-lab-grid z2-grid' }, h('div', { class: 'z2-wrap' }, art), panel),
      readout,
      caption: 'Modello semplificato di un transistor nMOS piatto, come quelli dei chip fino ai primi anni Duemila: gli spessori non sono in scala e la corrente è solo indicativa. In realtà anche sotto la soglia passa sempre una corrente piccolissima: è una delle perdite che scaldano i chip.',
      class: 'z2-lab',
    });
  }

  /* ---------- laboratorio: una porta NAND, dal disegno al silicio ---------- */

  function labCell() {
    const st = { a: 0, b: 0 };
    // il disegno della cella, visto dall'alto (300 × 340)
    const lay = PL.svg('0 0 300 340', { class: 'pl-svg z3c-lay', role: 'img', 'aria-label': 'Disegno di una cella standard NAND vista dall\'alto: in alto il binario di alimentazione, in basso quello di massa; due strisce di gate verticali, A e B, attraversano una zona attiva di tipo p in alto e una di tipo n in basso; i collegamenti di metallo uniscono i contatti fino all\'uscita Y.' });
    const layer = (name, ...kids) => s('g', { class: 'z3c-layer is-' + name }, ...kids);
    const ct = (x, y) => s('rect', { x: x - 6, y: y - 6, width: 12, height: 12 });
    const L = {
      well: layer('well', s('rect', { x: 10, y: 10, width: 280, height: 160, rx: 6 })),
      act: layer('act', s('rect', { class: 'is-p', x: 50, y: 70, width: 200, height: 60 }), s('rect', { class: 'is-n', x: 50, y: 210, width: 200, height: 60 })),
      poly: layer('poly', s('rect', { x: 110, y: 56, width: 16, height: 228 }), s('rect', { x: 174, y: 56, width: 16, height: 228 }),
        s('rect', { x: 104, y: 172, width: 28, height: 26 }), s('rect', { x: 168, y: 172, width: 28, height: 26 })),
      m1: layer('m1',
        s('rect', { class: 'is-rail', x: 10, y: 20, width: 280, height: 24 }), s('rect', { class: 'is-rail', x: 10, y: 296, width: 280, height: 24 }),
        s('rect', { x: 72, y: 40, width: 16, height: 68 }), s('rect', { x: 212, y: 40, width: 16, height: 68 }), s('rect', { x: 72, y: 232, width: 16, height: 68 }),
        s('rect', { class: 'is-in', x: 100, y: 170, width: 36, height: 30 }), s('rect', { class: 'is-in', x: 164, y: 170, width: 36, height: 30 }),
        s('path', { class: 'is-out', d: 'M142 92H158V140H244V248H212V232H228V156H142Z' })),
      ct: layer('ct', ct(80, 100), ct(150, 100), ct(220, 100), ct(80, 240), ct(220, 240), ct(118, 185), ct(182, 185)),
    };
    // le quattro intersezioni gate-zona attiva sono i quattro transistor
    const TR = [
      { id: 'pA', p: true, input: 'a', rect: [110, 70], name: 'pMOS comandato da A', sch: [80, 70] },
      { id: 'pB', p: true, input: 'b', rect: [174, 70], name: 'pMOS comandato da B', sch: [180, 70] },
      { id: 'nA', p: false, input: 'a', rect: [110, 210], name: 'nMOS comandato da A', sch: [130, 170] },
      { id: 'nB', p: false, input: 'b', rect: [174, 210], name: 'nMOS comandato da B', sch: [130, 250] },
    ];
    const trLay = TR.map((t) => s('rect', { class: 'z3c-tr', x: t.rect[0] - 3, y: t.rect[1], width: 22, height: 60, rx: 3, tabindex: 0, role: 'img', 'aria-label': t.name }));
    lay.append(L.well, L.act, L.poly, L.m1, L.ct, ...trLay,
      s('text', { class: 'z3c-t', x: 18, y: 36 }, 'VDD'), s('text', { class: 'z3c-t', x: 18, y: 312 }, 'VSS'),
      s('text', { class: 'z3c-t is-in', x: 118, y: 166, 'text-anchor': 'middle' }, 'A'), s('text', { class: 'z3c-t is-in', x: 182, y: 166, 'text-anchor': 'middle' }, 'B'),
      s('text', { class: 'z3c-t is-out', x: 262, y: 200, 'text-anchor': 'middle' }, 'Y'));

    // lo schema elettrico (260 × 340)
    const sch = PL.svg('0 0 260 340', { class: 'pl-svg z3c-sch', role: 'img', 'aria-label': 'Schema della porta NAND CMOS: due pMOS in parallelo tra l\'alimentazione e l\'uscita Y, due nMOS in serie tra l\'uscita e la massa.' });
    const trSch = TR.map((t) => {
      const [x, y] = t.sch;
      const left = t.id !== 'pB';
      const gx = left ? x - 12 : x + 12;
      const lead = left ? 30 : 230;
      const top = t.p ? 30 : t.id === 'nA' ? 150 : 230;
      const bot = t.p ? 150 : t.id === 'nA' ? 230 : 310;
      const bub = t.p ? (left ? gx - 5 : gx + 5) : null;
      return s('g', { class: 'z3c-str', tabindex: 0, role: 'img', 'aria-label': t.name },
        s('path', { class: 'z3c-w', d: `M${x} ${top}V${y}M${x} ${y + 40}V${bot}` }),
        s('line', { class: 'z3c-chan', x1: x, y1: y, x2: x, y2: y + 40 }),
        s('line', { class: 'z3c-g', x1: gx, y1: y + 2, x2: gx, y2: y + 38 }),
        bub ? s('circle', { class: 'z3c-bub', cx: bub, cy: y + 20, r: 4.5 }) : null,
        s('line', { class: 'z3c-w', x1: bub ? (left ? bub - 4.5 : bub + 4.5) : gx, y1: y + 20, x2: lead, y2: y + 20 }),
        s('text', { class: 'z3c-t is-in', x: left ? 18 : 242, y: y + 25, 'text-anchor': 'middle' }, t.input.toUpperCase()));
    });
    const yNode = s('path', { class: 'z3c-w z3c-ynode', d: 'M80 150H232' });
    sch.append(
      s('path', { class: 'z3c-w is-vdd', d: 'M66 30H194' }), s('text', { class: 'z3c-t', x: 130, y: 20, 'text-anchor': 'middle' }, 'VDD'),
      s('path', { class: 'z3c-w', d: 'M112 310H148M118 317H142M124 324H136' }), s('text', { class: 'z3c-t', x: 160, y: 322 }, 'VSS'),
      yNode, s('circle', { class: 'z3c-node', cx: 130, cy: 150, r: 3.5 }), s('circle', { class: 'z3c-out', cx: 238, cy: 150, r: 6 }),
      s('text', { class: 'z3c-t is-out', x: 238, y: 136, 'text-anchor': 'middle' }, 'Y'),
      ...trSch);

    // collegamento tra disegno e schema: lo stesso transistor si illumina in tutti e due
    const hint = h('p', { class: 'z3c-hint' }, 'Passa sopra un transistor, nel disegno o nello schema, per ritrovarlo nell\'altro.');
    TR.forEach((t, i) => {
      const hot = (on) => {
        trLay[i].classList.toggle('is-hot', on);
        trSch[i].classList.toggle('is-hot', on);
        if (on) hint.textContent = t.name + ': conduce quando ' + t.input.toUpperCase() + ' vale ' + (t.p ? '0' : '1') + '.';
      };
      for (const el of [trLay[i], trSch[i]]) {
        el.addEventListener('pointerenter', () => hot(true));
        el.addEventListener('pointerleave', () => hot(false));
        el.addEventListener('focus', () => hot(true));
        el.addEventListener('blur', () => hot(false));
      }
    });

    const led = ui.led(true, 'Uscita Y');
    const readout = h('p');
    const TEXT = {
      '00': 'A\u00a0=\u00a00 e B\u00a0=\u00a00: tutti e due i pMOS conducono e collegano l\'uscita all\'alimentazione, mentre i due nMOS in serie sono aperti. Y\u00a0=\u00a01.',
      '10': 'A\u00a0=\u00a01 e B\u00a0=\u00a00: il pMOS comandato da B conduce e collega l\'uscita all\'alimentazione; dei due nMOS in serie conduce solo quello di A, quindi la strada verso massa resta interrotta. Y\u00a0=\u00a01.',
      '01': 'A\u00a0=\u00a00 e B\u00a0=\u00a01: il pMOS comandato da A conduce e collega l\'uscita all\'alimentazione; dei due nMOS in serie conduce solo quello di B. Y\u00a0=\u00a01.',
      '11': 'A\u00a0=\u00a01 e B\u00a0=\u00a01: i due pMOS sono aperti, e i due nMOS in serie conducono entrambi, collegando l\'uscita a massa. Y\u00a0=\u00a00: proprio come una porta NAND.',
    };
    function update() {
      const y = st.a && st.b ? 0 : 1;
      TR.forEach((t, i) => {
        const v = st[t.input];
        const on = t.p ? v === 0 : v === 1;
        trLay[i].classList.toggle('is-on', on);
        trSch[i].classList.toggle('is-on', on);
      });
      L.m1.classList.toggle('is-y1', y === 1);
      sch.classList.toggle('is-y1', y === 1);
      led.set(y);
      readout.replaceChildren(PL.rich(TEXT['' + st.a + st.b]));
    }
    const ta = ui.toggle({ label: 'A', value: 0, onChange: (v) => { st.a = v; update(); } });
    const tb = ui.toggle({ label: 'B', value: 0, onChange: (v) => { st.b = v; update(); } });
    const LAYERS = [['well', 'pozzo n'], ['act', 'zone attive'], ['poly', 'gate'], ['ct', 'contatti'], ['m1', 'metallo']];
    const layerBtns = h('div', { class: 'z3c-layers', role: 'group', 'aria-label': 'Strati del disegno' }, LAYERS.map(([k, name]) => {
      const b = h('button', { type: 'button', class: 'z3c-lb is-' + k, 'aria-pressed': 'true' }, h('span', { class: 'z3c-sw', 'aria-hidden': 'true' }), name);
      b.addEventListener('click', () => {
        const on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        L[k].classList.toggle('is-off', !on);
      });
      return b;
    }));

    /* «Mettila in fila»: il programma di piazzamento mette in fila le celle e poi le collega */
    const place = PL.svg('0 0 600 176', { class: 'pl-svg z3c-place', role: 'img', 'aria-label': 'Una cinquantina di celle sparse vengono messe in fila su quattro righe, tutte alte uguali, e poi collegate da fili che corrono sopra di loro, su strati di metallo più alti.' });
    const r = rng(1984);
    const KINDS = [['INV', 22, 1], ['NAND', 32, 2], ['NOR', 32, 2], ['AOI', 44, 3], ['BUF', 26, 1], ['DFF', 74, 5]];
    const cells = [];
    for (let row = 0; row < 4; row++) {
      let x = 34;
      let n = 0;
      for (;;) {
        const ours = row === 1 && n === 3;
        const kd = ours ? KINDS[1] : KINDS[Math.floor(r() * KINDS.length)];
        if (x + kd[1] > 566) break;
        cells.push({ w: kd[1], stripes: kd[2], x, y: 18 + row * 36, sx: 14 + r() * 540, sy: 6 + r() * 136, rot: (r() - 0.5) * 70, ours });
        n++;
        x += kd[1] + 2 + (!ours && r() < 0.12 ? 10 + Math.round(r() * 14) : 0);
      }
    }
    // l'ordine di arrivo è casuale, ma sempre lo stesso
    const arrive = cells.map((c, i) => ({ c, k: r() })).sort((a, b) => a.k - b.k);
    arrive.forEach((a, i) => { a.c.i = i; });
    const delay = 0.6 / cells.length;
    const railG = s('g', { class: 'z3c-prail' });
    for (let k = 0; k <= 4; k++) railG.append(s('rect', { x: 30, y: 16 + k * 36, width: 540, height: 4 }));
    place.append(railG);
    for (const c of cells) {
      const g = s('g', { class: 'z3c-pc' + (c.ours ? ' is-ours' : '') });
      g.append(s('rect', { class: 'z3c-pcb', x: 0, y: 0, width: c.w, height: 32, rx: 2 }));
      for (let k = 0; k < c.stripes; k++) g.append(s('rect', { class: 'z3c-pcs', x: ((k + 1) * c.w) / (c.stripes + 1) - 1.5, y: 4, width: 3, height: 24 }));
      c.el = g;
      place.append(g);
    }
    // i fili corrono sopra le celle, su strati di metallo più alti, e scendono nelle celle attraverso i via
    const wires = s('g', { class: 'z3c-wires' });
    const WIRES = [[[60, 34], [60, 70], [180, 70], [180, 106]], [[120, 70], [120, 142], [330, 142]], [[210, 34], [400, 34], [400, 106]],
      [[300, 106], [300, 142], [480, 142]], [[450, 34], [450, 70], [540, 70]], [[90, 142], [90, 106], [250, 106]], [[520, 106], [520, 142]]];
    const wireEls = WIRES.map((pts) => s('path', { d: 'M' + pts.map((p) => p.join(' ')).join('L'), pathLength: 100 }));
    const viaEls = WIRES.map((pts) => s('g', { class: 'z3c-via' }, [pts[0], pts[pts.length - 1]].map(([x, y]) => s('rect', { x: x - 3, y: y - 3, width: 6, height: 6 }))));
    wires.append(...wireEls, ...viaEls);
    place.append(wires);
    const oursLbl = s('text', { class: 'z3c-t is-ours', x: 0, y: 0, 'text-anchor': 'middle' }, 'la nostra NAND');
    place.append(oursLbl);
    function placeAt(t) {
      for (const c of cells) {
        const p = PL.motion.ease.inOut(clamp((t - c.i * delay) / 0.38, 0, 1));
        const x = c.sx + (c.x - c.sx) * p;
        const y = c.sy + (c.y - c.sy) * p;
        c.el.setAttribute('transform', `translate(${f3(x)} ${f3(y)}) rotate(${f3(c.rot * (1 - p))} ${c.w / 2} 16)`);
      }
      const wt = ramp(0.72, 1, t);
      wireEls.forEach((w, i) => {
        const k = clamp(wt * 1.3 - i * 0.05, 0, 1);
        w.style.strokeDashoffset = f3(100 - k * 100);
        viaEls[i].style.opacity = k > 0.02 ? 1 : 0;
      });
      railG.style.opacity = f3(ramp(0.45, 0.8, t));
      const ours = cells.find((c) => c.ours);
      oursLbl.setAttribute('x', f3(ours.x + ours.w / 2));
      oursLbl.setAttribute('y', f3(ours.y - 3));
      oursLbl.style.opacity = f3(ramp(0.85, 1, t));
    }
    let placing = null;
    function runPlace() {
      if (placing) placing.cancel();
      placing = PL.tween({ from: 0, to: 1, duration: 3200, ease: PL.motion.ease.linear, onUpdate: placeAt, onDone: () => { placing = null; } });
    }
    placeAt(PL.reduced() ? 1 : 0);
    PL.onVisible(place, () => runPlace(), { threshold: 0.5 });
    const placeBtn = ui.btn({ label: 'Mettila in fila', icon: '↻', kind: 'lab', onClick: runPlace });

    update();
    return ui.lab({
      title: 'Una porta NAND, dal disegno al silicio',
      intro: 'A sinistra la cella vista dall\'alto, come la disegnano i progettisti; a destra lo stesso circuito come schema. Cambia gli ingressi, accendi e spegni gli strati, e guarda come una cella va in fila con le altre.',
      controls: [ta, tb, h('span', { class: 'z3c-y' }, 'Y', led), layerBtns],
      stage: h('div', { class: 'z3c-stage' },
        h('div', { class: 'z3c-grid' }, h('div', { class: 'z3c-pane' }, h('p', { class: 'z3c-pt' }, 'Il disegno'), lay), h('div', { class: 'z3c-pane' }, h('p', { class: 'z3c-pt' }, 'Lo schema'), sch)),
        hint,
        h('div', { class: 'z3c-pl' }, h('div', { class: 'z3c-plh' }, h('p', { class: 'z3c-pt' }, 'Celle in fila'), placeBtn), place)),
      readout,
      caption: 'Disegno semplificato di una cella standard NAND a due ingressi: verde le zone attive, rosso i gate, azzurro il primo strato di metallo, quadratini chiari i contatti, in trasparenza il pozzo n che ospita i pMOS. Nelle celle vere le misure sono di poche decine di nanometri e i transistor sono FinFET o nanosheet.',
      class: 'z3c-lab',
    });
  }


  /* ---------- laboratorio: il grattacielo dei collegamenti ---------- */

  function labStack() {
    // Vista isometrica: u va verso destra in basso, v verso sinistra in basso, z verso l'alto.
    const W = 300, D = 190, T = 9, GAP = 26;
    const X0 = 166, Y0 = 232;
    const P = (u, v, z) => [f3(X0 + (u - v) * 0.779), f3(Y0 + (u + v) * 0.45 - (z || 0))];
    const pt = (p) => p[0] + ' ' + p[1];
    const quad = (pts) => 'M' + pts.map(pt).join('L') + 'Z';
    const rect = (u0, v0, u1, v1) => quad([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)]);

    const LAYERS = [
      { id: 'retro', name: 'Retro', tag: 'l\'alimentazione dal retro',
        text: 'La rete di alimentazione sul retro: si capovolge il wafer, lo si assottiglia e si costruiscono qui le linee che portano la corrente, a ridosso dei transistor. La strada dell\'energia è molto più corta, e i livelli sul davanti restano liberi per i segnali.' },
      { id: 'si', name: 'Silicio', tag: 'i transistor',
        text: 'Il pianterreno: il silicio con i transistor, messi in file di [[Cella standard|celle standard]]. Tutto quello che sta sopra serve soltanto a collegarli tra loro e con il mondo esterno.' },
      { id: 'm0', name: 'M0–M1', tag: 'i fili più fitti', dir: 'v', pitch: 6, w: 2.2,
        text: 'I fili più fitti, a pochi nanometri dai transistor, collegano i transistor dentro ogni cella. Nei processi più avanzati hanno un passo, cioè larghezza del filo più spazio, tra circa 23 e 32 nanometri.' },
      { id: 'm2', name: 'M2–M3', tag: 'tra celle vicine', dir: 'u', pitch: 9, w: 3.4,
        text: 'Questi livelli collegano tra loro le celle vicine, con fili di poche decine di nanometri: è qui che tante porte logiche diventano un circuito.' },
      { id: 'm4', name: 'M4–M7', tag: 'dentro i blocchi', dir: 'v', pitch: 14, w: 5.6,
        text: 'I livelli intermedi collegano gruppi di celle dentro lo stesso blocco. I fili di un livello corrono tutti nella stessa direzione e quelli del livello sopra di traverso: così si incrociano senza mai toccarsi.' },
      { id: 'm8', name: 'M8–M11', tag: 'da un blocco all\'altro', dir: 'u', pitch: 24, w: 10,
        text: 'Fili più larghi e più radi per i collegamenti lunghi, da un blocco all\'altro del chip, anche per millimetri: un filo più largo oppone meno resistenza, e il segnale arriva prima.' },
      { id: 'm12', name: 'M12–M15', tag: 'alimentazione e clock', tagBack: 'clock e segnali lunghi', dir: 'v', pitch: 42, w: 22,
        text: 'Gli ultimi livelli hanno i fili più spessi e larghi, di dimensioni vicine al micrometro: distribuiscono l\'alimentazione e il clock su tutto il chip, perdendo per strada meno tensione possibile.',
        textBack: 'Con l\'alimentazione dal retro, i livelli più alti non devono più portare tutta la corrente verso il basso: restano liberi per il clock e per i segnali che attraversano il chip.' },
      { id: 'bump', name: 'Contatti', tag: 'verso il contenitore',
        text: 'In cima ci sono i contatti: piazzole e sferette di saldatura che collegano il chip al suo contenitore. Da qui entra la corrente di alimentazione e passano i segnali da e verso il resto del computer.' },
    ];
    const OVERVIEW = 'Sopra i transistor si alzano sedici livelli di fili di rame, separati da strati isolanti e collegati da pilastrini verticali, i [[Via|via]]. In verde un segnale che sale ai livelli alti, corre lontano e riscende; in giallo la corrente di alimentazione, che scende dai contatti fino ai transistor. Scegli un livello per sapere a che cosa serve.';
    const OVERVIEW_BACK = 'Con l\'alimentazione dal retro la corrente non attraversa più tutto il grattacielo: arriva da sotto, a pochi passi dai transistor. Il segnale, in verde, fa la stessa strada di prima. Scegli un livello per sapere a che cosa serve.';

    const st = { e: PL.reduced() ? 1 : 0.12, back: false, sel: null };
    const art = PL.svg('0 0 620 500', { class: 'pl-svg z5-art', role: 'img', 'aria-label': 'Vista esplosa dei livelli di un chip: in basso il silicio con i transistor, sopra cinque gruppi di livelli di fili di rame, sempre più larghi e radi salendo, e in cima i contatti verso il contenitore. Un segnale sale dai transistor ai livelli alti, corre lontano e riscende; la corrente di alimentazione scende dai contatti ai transistor.' });
    const r = rng(1997);
    const SIG = [46, 178], SIG2 = [244, 178], POW = [288, 178];
    const vlines = [];
    const tagEls = {};
    const pad = (p, cls) => s('path', { class: 'z5-pad ' + cls, d: rect(p[0] - 4.5, p[1] - 4.5, p[0] + 4.5, p[1] + 4.5) });
    // un tratto verticale da questo livello a quello sopra: la lunghezza cambia quando i livelli si separano
    const vline = (p, cls, down) => {
      const x = P(p[0], p[1])[0];
      const el = s('line', { class: cls, x1: x, x2: x });
      vlines.push({ el, p, down });
      return el;
    };

    const groups = LAYERS.map((L, idx) => {
      const k = idx - 1;
      const g = s('g', { class: 'z5-layer is-' + L.id });
      g.append(s('g', { class: 'z5-slab' },
        s('path', { class: 'z5-side is-l', d: quad([P(0, D), P(W, D), P(W, D, -T), P(0, D, -T)]) }),
        s('path', { class: 'z5-side is-r', d: quad([P(W, 0), P(W, D), P(W, D, -T), P(W, 0, -T)]) }),
        s('path', { class: 'z5-top', d: rect(0, 0, W, D) })));
      if (L.dir) {
        let d = '';
        const across = L.dir === 'u' ? D : W;
        const along = L.dir === 'u' ? W : D;
        for (let c = L.pitch / 2 + 3; c < across - 3; c += L.pitch) {
          let a = 5;
          while (a < along - 5) {
            const b = L.pitch > 30 ? along - 5 : Math.min(along - 5, a + 20 + r() * 90);
            d += L.dir === 'u' ? rect(a, c - L.w / 2, b, c + L.w / 2) : rect(c - L.w / 2, a, c + L.w / 2, b);
            a = b + 4 + r() * 14;
          }
        }
        g.append(s('path', { class: 'z5-wires', d }));
      } else if (L.id === 'si') {
        let act = '';
        let gates = '';
        for (let v = 8; v + 12 < D; v += 18) {
          let u = 6;
          for (;;) {
            const w = 10 + Math.round(r() * 20);
            if (u + w > W - 6) break;
            act += rect(u, v, u + w, v + 11);
            const n = Math.max(1, Math.round(w / 9));
            for (let i = 1; i <= n; i++) { const gu = u + (i * w) / (n + 1); gates += rect(gu - 1, v - 2, gu + 1, v + 13); }
            u += w + 3;
          }
        }
        g.append(s('path', { class: 'z5-act', d: act }), s('path', { class: 'z5-gates', d: gates }),
          s('path', { class: 'z5-tr', d: rect(SIG[0] - 8, SIG[1] - 7, SIG[0] + 8, SIG[1] + 7) }),
          s('path', { class: 'z5-tr', d: rect(SIG2[0] - 8, SIG2[1] - 7, SIG2[0] + 8, SIG2[1] + 7) }));
      } else if (L.id === 'bump') {
        for (let u = 24; u < W; u += 44) {
          for (let v = 22; v < D; v += 39) {
            const b = P(u, v);
            const c = P(u, v, 3.5);
            g.append(s('ellipse', { class: 'z5-bump-base', cx: b[0], cy: b[1], rx: 9.9, ry: 5.7 }), s('circle', { class: 'z5-bump', cx: c[0], cy: c[1], r: 7.2 }));
          }
        }
      } else if (L.id === 'retro') {
        let d = '';
        for (let u = 20; u < W; u += 40) d += rect(u - 7, 6, u + 7, D - 6);
        g.append(s('path', { class: 'z5-wires is-power', d }));
      }
      // il segnale: sale dal transistor A fino a M8, corre su M8 e riscende al transistor B
      if (k >= 0 && k <= 4) {
        if (k > 0) g.append(pad(SIG, 'is-sig'), pad(SIG2, 'is-sig'));
        if (k < 4) g.append(vline(SIG, 'z5-sig', false), vline(SIG2, 'z5-sig', true));
        if (k === 4) g.append(s('path', { class: 'z5-sig is-run', d: 'M' + pt(P(SIG[0], SIG[1])) + 'L' + pt(P(SIG2[0], SIG2[1])) }));
      }
      // l'alimentazione: dall'alto attraversa tutti i livelli; dal retro sale per un tratto solo
      if (k === -1) g.append(pad(POW, 'is-pow is-back'), vline(POW, 'z5-pow is-back', false));
      if (k === 0) g.append(pad(POW, 'is-pow'));
      if (k >= 1 && k <= 5) g.append(pad(POW, 'is-pow is-front'));
      if (k >= 0 && k <= 5) g.append(vline(POW, 'z5-pow is-front', true));
      // l'etichetta, a destra del livello
      const [lx, ly] = P(W, 0);
      tagEls[L.id] = s('text', { class: 'z5-t is-tag', x: lx + 24, y: ly + T / 2 + 13 }, L.tag);
      g.append(s('g', { class: 'z5-lbl' },
        s('line', { class: 'z5-lead', x1: lx + 4, y1: ly + T / 2, x2: lx + 19, y2: ly + T / 2 }),
        s('text', { class: 'z5-t', x: lx + 24, y: ly + T / 2 + 1 }, L.name), tagEls[L.id]));
      g.addEventListener('click', () => select(st.sel === L.id ? null : L.id));
      return g;
    });
    art.append(...groups);

    const btns = {};
    const list = h('div', { class: 'z5-list', role: 'group', 'aria-label': 'Livelli del chip, dall\'alto in basso' });
    LAYERS.slice().reverse().forEach((L) => {
      const b = h('button', { type: 'button', class: 'z5-lb is-' + L.id, 'aria-pressed': 'false' }, h('b', null, L.name), h('span', null, L.tag));
      b.addEventListener('click', () => select(st.sel === L.id ? null : L.id));
      btns[L.id] = b;
      list.append(b);
    });
    btns.retro.hidden = true;
    const panel = h('div', { class: 'pl-lab-panel z5-panel' }, h('h4', null, 'I livelli'), list,
      h('p', { class: 'z5-key' }, h('span', { class: 'z5-key-sig', 'aria-hidden': 'true' }), 'segnale', h('span', { class: 'z5-key-pow', 'aria-hidden': 'true' }), 'alimentazione'));
    const readout = h('p');

    function say() {
      const L = LAYERS.find((x) => x.id === st.sel);
      readout.replaceChildren(PL.rich(L ? (st.back && L.textBack ? L.textBack : L.text) : st.back ? OVERVIEW_BACK : OVERVIEW));
    }
    function select(id) {
      st.sel = id;
      groups.forEach((g, i) => {
        const on = LAYERS[i].id === id;
        g.classList.toggle('is-sel', on);
        g.classList.toggle('is-dim', !!id && !on);
      });
      for (const [k, b] of Object.entries(btns)) b.setAttribute('aria-pressed', k === id ? 'true' : 'false');
      say();
    }
    function setE(e) {
      st.e = e;
      const gap = T + GAP * e;
      groups.forEach((g, idx) => g.setAttribute('transform', 'translate(0 ' + f3(-(idx - 1) * gap) + ')'));
      for (const l of vlines) {
        const y0 = P(l.p[0], l.p[1])[1];
        const y1 = P(l.p[0], l.p[1], gap)[1];
        l.el.setAttribute('y1', l.down ? y1 : y0);
        l.el.setAttribute('y2', l.down ? y0 : y1);
      }
      art.style.setProperty('--z5-lbl', f3(ramp(0.55, 0.9, e)));
    }
    function setBack(back) {
      st.back = back;
      art.classList.toggle('is-back', back);
      btns.retro.hidden = !back;
      tagEls.m12.textContent = back ? LAYERS[6].tagBack : LAYERS[6].tag;
      btns.m12.lastChild.textContent = tagEls.m12.textContent;
      if (!back && st.sel === 'retro') select(null);
      else say();
    }

    let anim = null;
    const slider = ui.slider({ label: 'Distanza tra i livelli', min: 0, max: 100, step: 1, value: Math.round(st.e * 100), format: (v) => (v === 0 ? 'compatti' : PL.fmt(v) + '%'),
      onInput: (v) => { if (anim) anim.cancel(); setE(v / 100); } });
    const seg = ui.segmented({ label: 'Alimentazione', value: 'top', options: [{ value: 'top', label: 'dall\'alto' }, { value: 'back', label: 'dal retro' }], onChange: (v) => setBack(v === 'back') });
    setE(st.e);
    select(null);
    // sul telefono le etichette accanto ai livelli spariscono: il disegno può occupare tutta la larghezza
    const narrow = window.matchMedia('(max-width: 640px)');
    const fit = () => art.setAttribute('viewBox', narrow.matches ? '8 0 404 500' : '0 0 620 500');
    fit();
    PL.listen(narrow, 'change', fit);
    PL.onVisible(art, () => {
      if (PL.reduced() || st.e > 0.9) return;
      anim = PL.tween({ from: st.e, to: 1, duration: 1500, ease: PL.motion.ease.inOut, onUpdate: (v) => { setE(v); slider.set(Math.round(v * 100), true); }, onDone: () => { anim = null; } });
    }, { threshold: 0.35 });

    return ui.lab({
      title: 'Il grattacielo dei collegamenti',
      intro: 'I livelli di un chip moderno, separati come i piani di un grattacielo smontato. Avvicinali o allontanali, scegli un livello per sapere a che cosa serve, e prova a portare l\'alimentazione dal retro.',
      controls: [slider.el, seg.el],
      stage: h('div', { class: 'pl-lab-grid z5-grid' }, h('div', { class: 'z5-wrap' }, art), panel),
      readout,
      caption: 'Schema non in scala: in un chip vero i livelli sono strati di rame immersi nell\'isolante, uno sopra l\'altro senza spazi, e lo spessore di tutto il grattacielo è di pochi micrometri. Il numero di livelli cambia da chip a chip: nel processo Intel 18A, per esempio, sono da 11 a 16 sul davanti, più 3 sul retro.',
      class: 'z5-lab',
    });
  }

  /* ---------- laboratorio: dal transistor piatto ai nanosheet ---------- */

  function labFins() {
    // Vista isometrica del transistor: x lungo il canale (dal source al drain), y lungo la larghezza, z verso l'alto.
    const S = 2, OX = 160, OY = 98;
    const Q = (x, y, z) => [f3(OX + (x - y) * 0.866 * S), f3(OY + (x + y) * 0.5 * S - z * S)];
    const face = (pts, cls) => s('path', { class: 'z6-f ' + cls, d: 'M' + pts.map((p) => p.join(' ')).join('L') + 'Z' });
    // un parallelepipedo: si vedono la faccia di sopra e le due davanti
    const box = (x, y, z, dx, dy, dz, m) => s('g', { class: 'z6-box is-' + m },
      face([Q(x, y + dy, z + dz), Q(x + dx, y + dy, z + dz), Q(x + dx, y + dy, z), Q(x, y + dy, z)], 'is-l'),
      face([Q(x + dx, y, z + dz), Q(x + dx, y + dy, z + dz), Q(x + dx, y + dy, z), Q(x + dx, y, z)], 'is-r'),
      face([Q(x, y, z + dz), Q(x + dx, y, z + dz), Q(x + dx, y + dy, z + dz), Q(x, y + dy, z + dz)], 'is-t'));
    const gate = (...kids) => s('g', { class: 'z6-gate' }, ...kids);
    const label = (x, y, z, text, dy, cls) => {
      const [px, py] = Q(x, y, z);
      if (cls) return s('g', { class: 'z6-lbl ' + cls }, s('line', { x1: px + 2, y1: py, x2: px + 16, y2: py }), s('text', { x: px + 20, y: py + 4 }, text));
      return s('g', { class: 'z6-lbl' }, s('line', { x1: px, y1: py - 3, x2: px, y2: py + dy + 4 }), s('text', { x: px, y: py + dy, 'text-anchor': 'middle' }, text));
    };
    const base = (fin) => (fin ? [box(0, 0, -34, 120, 80, 24, 'si'), box(0, 0, -10, 120, 80, 10, 'sti')] : [box(0, 0, -34, 120, 80, 34, 'si')]);

    const scenes3d = {
      planar: [...base(false), box(4, 10, 0, 34, 60, 3, 'sd'), box(44, 6, 0, 32, 68, 2.5, 'ox'), gate(box(46, 4, 2.5, 28, 72, 18, 'gate')), box(82, 10, 0, 34, 60, 3, 'sd'),
        label(21, 40, 3, 'source', -30), label(60, 40, 20.5, 'gate', -24), label(99, 40, 3, 'drain', -30)],
      fin: [...base(true),
        ...[20, 48].flatMap((y) => [box(2, y, 0, 30, 12, 34, 'sd'), box(32, y, 0, 12, 12, 34, 'ch')]),
        gate(box(44, 10, 0, 32, 60, 46, 'gate')),
        ...[20, 48].flatMap((y) => [box(76, y, 0, 12, 12, 34, 'ch'), box(88, y, 0, 30, 12, 34, 'sd')]),
        label(16, 54, 34, 'source', -26), label(60, 40, 46, 'gate', -22), label(104, 54, 34, 'drain', -26), label(103, 26, 34, 'pinne', -44)],
      gaa: [...base(true), box(0, 16, 0, 24, 48, 50, 'sd'),
        ...[8, 22, 36].map((z) => box(24, 22, z, 20, 36, 6, 'ch')),
        gate(box(44, 10, 0, 32, 60, 54, 'gate')),
        ...[8, 22, 36].map((z) => box(76, 22, z, 20, 36, 6, 'ch')),
        box(96, 16, 0, 24, 48, 50, 'sd'),
        label(12, 40, 50, 'source', -24), label(60, 40, 54, 'gate', -22), label(108, 40, 50, 'drain', -24)],
      cfet: [...base(true), box(0, 16, 0, 24, 48, 28, 'sdp'), box(0, 16, 31, 24, 48, 30, 'sd'),
        ...[6, 18].map((z) => box(24, 22, z, 20, 36, 6, 'chp')), ...[38, 50].map((z) => box(24, 22, z, 20, 36, 6, 'ch')),
        gate(box(44, 10, 0, 32, 60, 64, 'gate')),
        ...[6, 18].map((z) => box(76, 22, z, 20, 36, 6, 'chp')), ...[38, 50].map((z) => box(76, 22, z, 20, 36, 6, 'ch')),
        box(96, 16, 0, 24, 48, 28, 'sdp'), box(96, 16, 31, 24, 48, 30, 'sd'),
        label(12, 40, 61, 'source', -22), label(60, 40, 64, 'gate', -20), label(108, 40, 61, 'drain', -22),
        label(116, 64, 15, 'p', 0, 'is-side'), label(116, 64, 47, 'n', 0, 'is-side')],
    };

    // la sezione dentro il gate: da qui si vede da quanti lati il gate tocca il canale
    const R = (x, y, w, hh, cls, rx) => s('rect', { class: cls, x, y, width: w, height: hh, rx: rx || 0 });
    const arrow = (x, y, dir) => {
      const d = { down: [0, 1], up: [0, -1], right: [1, 0], left: [-1, 0] }[dir];
      const [x2, y2] = [x + d[0] * 13, y + d[1] * 13];
      return s('g', { class: 'z6-ar' }, s('line', { x1: x, y1: y, x2, y2 }),
        s('path', { d: `M${x2 + d[0] * 5} ${y2 + d[1] * 5}L${x2 - d[1] * 4} ${y2 + d[0] * 4}L${x2 + d[1] * 4} ${y2 - d[0] * 4}Z` }));
    };
    const sheet = (x, y, w, cls) => [R(x - 2, y - 2, w + 4, 14, 'z6-s-hk', 3), R(x, y, w, 10, cls, 2)];
    const sections = {
      planar: [R(10, 112, 180, 70, 'z6-s-si'), R(40, 112, 120, 5, 'z6-s-ch'), R(40, 105, 120, 7, 'z6-s-ox'), R(40, 58, 120, 47, 'z6-s-gate'),
        arrow(70, 96, 'down'), arrow(100, 96, 'down'), arrow(130, 96, 'down')],
      fin: [R(10, 150, 180, 32, 'z6-s-si'), R(10, 132, 180, 18, 'z6-s-sti'), R(30, 26, 140, 106, 'z6-s-gate'),
        R(56, 50, 28, 82, 'z6-s-hk', 3), R(59, 53, 22, 79, 'z6-s-ch2', 2), R(116, 50, 28, 82, 'z6-s-hk', 3), R(119, 53, 22, 79, 'z6-s-ch2', 2),
        R(59, 132, 22, 18, 'z6-s-si'), R(119, 132, 22, 18, 'z6-s-si'),
        arrow(38, 92, 'right'), arrow(104, 92, 'left'), arrow(70, 32, 'down')],
      gaa: [R(10, 150, 180, 32, 'z6-s-si'), R(10, 132, 180, 18, 'z6-s-sti'), R(30, 22, 140, 110, 'z6-s-gate'),
        ...sheet(52, 40, 96, 'z6-s-ch2'), ...sheet(52, 70, 96, 'z6-s-ch2'), ...sheet(52, 100, 96, 'z6-s-ch2'),
        arrow(100, 27, 'down'), arrow(100, 67, 'up'), arrow(38, 45, 'right'), arrow(162, 45, 'left')],
      cfet: [R(10, 158, 180, 24, 'z6-s-si'), R(10, 144, 180, 14, 'z6-s-sti'), R(30, 10, 140, 134, 'z6-s-gate'),
        ...sheet(52, 24, 96, 'z6-s-ch2'), ...sheet(52, 48, 96, 'z6-s-ch2'), R(46, 74, 108, 6, 'z6-s-iso', 2), ...sheet(52, 94, 96, 'z6-s-chp'), ...sheet(52, 118, 96, 'z6-s-chp'),
        s('text', { class: 'z6-s-t', x: 160, y: 46 }, 'n'), s('text', { class: 'z6-s-t', x: 160, y: 116 }, 'p')],
    };

    const MODES = [
      { id: 'planar', label: 'Piatto', sides: '1, solo da sopra', when: 'nei chip di punta fino al 2011; ancora oggi in quelli più semplici', leak: 0.88, leakT: 'alte, con un canale cortissimo',
        text: 'Nel transistor piatto il gate sta sopra il canale e lo controlla da un lato solo, come un dito che preme su un tubo dell\'acqua da una parte. Finché il canale era lungo bastava; quando è sceso a poche decine di nanometri, un po\' di corrente passava lo stesso, anche a transistor spento.' },
      { id: 'fin', label: 'FinFET', sides: '3, sopra e sui fianchi', when: 'dal 2011 con Intel, dal 2015 nelle fonderie', leak: 0.42, leakT: 'molto più basse',
        text: 'Nel [[FinFET]] il canale si alza in una pinna sottile e il gate la abbraccia su tre lati, sopra e sui due fianchi: il controllo è molto migliore. Per avere più corrente si mettono più pinne una accanto all\'altra, sotto lo stesso gate, come qui.' },
      { id: 'gaa', label: 'Nanosheet', sides: '4, tutto intorno', when: 'dal 2022 con Samsung, dalla fine del 2025 con TSMC e Intel', leak: 0.2, leakT: 'ancora più basse',
        text: 'Nel transistor [[GAA|gate-all-around]] il canale è diviso in fogli sottili sovrapposti, i nanosheet, e il gate li avvolge da tutti e quattro i lati: è la mano che stringe il tubo tutto intorno. In più i fogli si possono fare più o meno larghi, per dare a ogni transistor la corrente che serve.' },
      { id: 'cfet', label: 'CFET', sides: '4, per due transistor impilati', when: 'per ora solo prototipi, dal 2023; produzione non prima degli anni Trenta', leak: 0.2, leakT: 'come nei nanosheet',
        text: 'Il passo successivo, ancora in laboratorio: il CFET impila un transistor n, in alto, sopra un transistor p, in basso. Una porta CMOS, che ha bisogno di tutti e due, occuperebbe così circa metà dello spazio.' },
    ];

    const art = PL.svg('0 0 380 380', { class: 'pl-svg z6-art', role: 'img' });
    const sec = PL.svg('0 0 200 190', { class: 'pl-svg z6-sec', role: 'img' });
    const g3 = {};
    const gs = {};
    for (const m of MODES) {
      g3[m.id] = s('g', { class: 'z6-scene' }, ...scenes3d[m.id]);
      gs[m.id] = s('g', { class: 'z6-scene' }, ...sections[m.id]);
      art.append(g3[m.id]);
      sec.append(gs[m.id]);
    }
    const sidesEl = h('dd');
    const whenEl = h('dd');
    const meter = h('span');
    const meterT = h('small');
    const panel = h('div', { class: 'pl-lab-panel z6-panel' },
      h('p', { class: 'z6-pt' }, 'Sezione dentro il gate'), sec,
      h('dl', { class: 'z6-dl' }, h('dt', null, 'Lati controllati dal gate'), sidesEl, h('dt', null, 'In produzione'), whenEl),
      h('p', { class: 'z6-kick' }, 'Perdite a transistor spento'), h('div', { class: 'z6-meter' }, meter), meterT);
    const readout = h('p');
    function show(id) {
      const m = MODES.find((x) => x.id === id);
      for (const x of MODES) {
        g3[x.id].classList.toggle('is-on', x.id === id);
        gs[x.id].classList.toggle('is-on', x.id === id);
      }
      art.setAttribute('aria-label', 'Disegno in prospettiva di un transistor ' + m.label + ' con source, gate e drain. ' + m.text.replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (x, a, b) => b || a));
      sec.setAttribute('aria-label', 'Sezione del transistor ' + m.label + ' tagliato dentro il gate: il gate tocca il canale da ' + m.sides + '.');
      sidesEl.textContent = m.sides;
      whenEl.textContent = m.when;
      meter.style.width = m.leak * 100 + '%';
      meterT.textContent = m.leakT + ' (indicativo)';
      readout.replaceChildren(PL.rich(m.text));
    }
    const seg = ui.segmented({ label: 'Tipo di transistor', value: 'planar', options: MODES.map((m) => ({ value: m.id, label: m.label })), onChange: show });
    show('planar');

    return ui.lab({
      title: 'Dal transistor piatto ai nanosheet',
      intro: 'Quattro generazioni di transistor, viste in prospettiva e tagliate dentro il gate. Guarda da quanti lati il gate abbraccia il canale.',
      controls: [seg.el],
      stage: h('div', { class: 'pl-lab-grid z6-grid' }, h('div', { class: 'z6-wrap' }, art), panel),
      readout,
      caption: 'Disegni schematici e non in scala: il gate in giallo, il silicio del canale in grigio chiaro, source e drain in blu (in rosa quelli del transistor p nel CFET), l\'isolante in azzurro. Le perdite sono solo indicative: dipendono da molti altri fattori, dalla tensione alla temperatura.',
      class: 'z6-lab',
    });
  }

  /* ---------- figura: la pianta di un system on a chip ---------- */

  function figFloor() {
    const art = PL.svg('0 0 640 400', { class: 'pl-svg z7-art', role: 'group', 'aria-label': 'Pianta di un system on a chip immaginario: scegli un blocco per sapere che cosa fa.' });
    const defs = s('defs');
    const tex = textures(defs, PL.uid('z7'));
    const floor = drawFloor(tex, true);
    art.append(defs, s('rect', { class: 'z1-die', x: DIE.x, y: DIE.y, width: DIE.w, height: DIE.h, rx: 3 }), padRing(), floor);
    const SHORT = { p: [[170, 108, '4 core P']], e: [[318, 78, '4 core E']], l2: [[170, 200, 'cache L2']], npu: [[318, 183, 'NPU']], gpu: [[468, 132, 'GPU']],
      slc: [[320, 251, 'cache di sistema']], mem: [[138, 319, 'memoria'], [494, 319, 'memoria']], media: [[258, 319, 'video']], io: [[364, 319, 'I/O']] };
    const name = h('strong', null, 'Scegli un blocco');
    const text = h('span', null, 'Passa sopra un blocco della pianta, o toccalo, per sapere che cosa fa. Le zone a quadretti regolari sono memorie, quelle a righe fitte sono logica.');
    const info = h('p', { class: 'z7-info', 'aria-live': 'polite' }, name, ' ', text);
    const blocks = [...floor.querySelectorAll('.zf-blk')];
    function pick(el) {
      blocks.forEach((b) => b.classList.toggle('is-sel', b === el));
      art.classList.toggle('has-sel', !!el);
      const b = el && FLOOR.find((f) => f.id === el.getAttribute('data-blk'));
      if (!b) return;
      name.textContent = b.name + '.';
      text.textContent = b.text;
    }
    for (const el of blocks) {
      const b = FLOOR.find((f) => f.id === el.getAttribute('data-blk'));
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', b.name);
      el.addEventListener('pointerenter', () => pick(el));
      el.addEventListener('focus', () => pick(el));
      el.addEventListener('click', () => pick(el));
      for (const [x, y, t] of SHORT[b.id]) el.append(s('text', { class: 'z7-t', x, y: y + 4, 'text-anchor': 'middle' }, t));
    }
    return ui.figure({
      art: [art, info],
      dark: true,
      wide: true,
      class: 'z7-fig',
      caption: 'La pianta, o [[Floorplan|floorplan]], del chip immaginario dello zoom all\'inizio del capitolo, simile a quella di molti processori per portatili di oggi: circa 12 × 8 millimetri, con una ventina di miliardi di transistor. Lungo il bordo corrono i contatti verso il contenitore.',
    });
  }

  /* ---------- il capitolo ---------- */

  PL.chapter({
    id: 'struttura',
    num: 8,
    title: 'Dentro il chip',
    short: 'Struttura',
    era: '1959 – oggi',
    minutes: 25,
    labs: 5,
    kicker: 'Decine di miliardi di interruttori in un rettangolo di silicio grande come un francobollo: come sono fatti, chi li ha inventati, come si mettono in fila e si collegano, e perché il transistor, dopo quarant\'anni, è diventato tridimensionale.',
    summary: 'Uno zoom dal contenitore agli atomi, il MOSFET di Atalla e Kahng, le celle standard e la progettazione automatica, il grattacielo dei collegamenti di rame, la pianta di un system on a chip e il passaggio dal transistor piatto al FinFET e ai nanosheet.',
    timeline: [
      { year: 1925, title: 'Un brevetto in anticipo', text: 'Julius Lilienfeld chiede in Canada il brevetto di un transistor a effetto di campo: per oltre trent\'anni nessuno riuscirà a farne uno che funzioni.' },
      { year: 1960, title: 'Il primo MOSFET', text: 'Mohamed Atalla e Dawon Kahng, ai Bell Labs, presentano il primo transistor MOS funzionante, costruito tra il 1959 e il 1960.', key: true },
      { year: 1967, title: 'Il gate flottante', text: 'Kahng e Simon Sze propongono un transistor che conserva una carica elettrica anche a corrente staccata: è il principio delle future memorie flash.' },
      { year: 1968, title: 'Il gate di silicio', text: 'Alla Fairchild Federico Faggin mette a punto la tecnologia a gate di silicio, che userà poi alla Intel per progettare il 4004.' },
      { year: 1980, title: 'Progettare si impara', text: 'Esce «Introduction to VLSI Systems» di Carver Mead e Lynn Conway: progettare chip diventa una materia universitaria.' },
      { year: 1989, title: 'Il DELTA di Hitachi', text: 'Digh Hisamoto e i suoi colleghi presentano il primo transistor «a pinna», con un canale verticale controllato dal gate su più lati.' },
      { year: 1997, title: 'Fili di rame', text: 'IBM annuncia il primo processo per chip con i collegamenti di rame al posto dell\'alluminio.' },
      { year: 2007, title: 'Torna il gate di metallo', text: 'Intel annuncia transistor con il gate di metallo e un isolante a base di afnio, che perde molta meno corrente.' },
      { year: 2011, title: 'Il transistor si alza in piedi', text: 'Intel annuncia i transistor «Tri-Gate» a 22 nanometri, i primi FinFET prodotti in grandi volumi.', key: true },
      { year: 2022, title: 'Il gate tutto intorno', text: 'Samsung avvia, prima al mondo, la produzione di chip a 3 nanometri con transistor gate-all-around.', key: true },
      { year: 2025, title: 'Nanosheet per tutti', text: 'TSMC e Intel avviano la produzione in volume dei loro primi transistor a nanosheet, con i processi N2 e 18A.' },
    ],
    glossary: [
      { term: 'MOSFET', def: 'Transistor a effetto di campo metallo-ossido-semiconduttore: un interruttore in cui la tensione sul gate, isolato da un sottile strato di ossido, apre o chiude un canale tra source e drain. È il dispositivo più fabbricato della storia.' },
      { term: 'Gate', def: 'L\'elettrodo di comando di un MOSFET, separato dal canale da un isolante sottilissimo: la sua tensione decide se il transistor conduce. In italiano si direbbe porta, ma nei chip si usa quasi sempre la parola inglese.' },
      { term: 'Source', def: 'Una delle due zone drogate alle estremità del canale di un MOSFET: quella da cui partono le cariche che lo attraversano. In italiano si dice anche sorgente.' },
      { term: 'Drain', def: 'La zona drogata del MOSFET verso cui scorrono le cariche dopo aver attraversato il canale. In italiano si dice anche pozzo.' },
      { term: 'Canale', def: 'Lo strato sottilissimo di cariche che il gate richiama sotto l\'ossido, tra source e drain, quando la sua tensione supera la soglia: è la strada della corrente.' },
      { term: 'Ossido di gate', def: 'Lo strato isolante tra il gate e il canale. In origine era biossido di silicio; dal 2007, nei chip più avanzati, è un ossido a base di afnio con alta costante dielettrica, detto high-k.' },
      { term: 'Tensione di soglia', def: 'La tensione tra gate e source oltre la quale si forma il canale e il MOSFET comincia a condurre. Nei chip di oggi è di qualche decimo di volt, all\'incirca tra 0,2 e 0,5 V.' },
      { term: 'Cella standard', def: 'Una porta logica o un piccolo circuito, come una NAND o un flip-flop, disegnato una volta sola con un\'altezza fissa e raccolto in una libreria: i programmi di progetto lo piazzano in file, in milioni di copie.' },
      { term: 'Metallizzazione', def: 'L\'insieme dei livelli di fili metallici costruiti sopra i transistor per collegarli tra loro: nei chip più avanzati sono da una dozzina a una ventina, separati da strati isolanti.' },
      { term: 'Via', def: 'Un minuscolo pilastro verticale di metallo che collega un filo di un livello della metallizzazione a un filo del livello sopra o sotto.' },
      { term: 'FinFET', def: 'Transistor in cui il canale è una pinna sottile di silicio che si alza dal piano, avvolta dal gate su tre lati. È stato il transistor dei chip più avanzati dal 2011 fino alla metà degli anni Venti.' },
      { term: 'GAA', def: 'Gate-all-around: transistor in cui il canale è fatto di fogli sottili sovrapposti, i nanosheet, avvolti dal gate su tutti e quattro i lati. È in produzione dal 2022.' },
      { term: 'Floorplan', def: 'La pianta di un chip: la disposizione dei grandi blocchi, come core, grafica, cache e interfacce, decisa all\'inizio del progetto.' },
      { term: 'Cache', def: 'Piccola memoria velocissima, vicina ai core, che conserva i dati e le istruzioni usati di recente. È fatta di celle SRAM, di solito con 6 transistor per ogni bit.' },
      { term: 'Core', def: 'Un\'unità di elaborazione completa dentro un processore, capace di eseguire da sola un programma. I processori di oggi ne hanno da pochi a decine, spesso di tipi diversi.' },
    ],
    render(root) {
      root.append(
        ui.section({ id: 'zoom', title: 'Uno zoom di trentasei milioni di volte', kicker: 'Dal contenitore agli atomi', lead: 'Un processore moderno contiene decine di miliardi di transistor in un rettangolo di silicio grande come un francobollo. Per capire come è fatto dentro, facciamo un viaggio di ingrandimento: dalla scheda di un portatile fino agli atomi.' },
          ui.prose(
            'Nel capitolo precedente abbiamo visto come si fabbrica un chip; ora entriamo dentro. Il rettangolo nero che si vede sulla scheda di un computer, il [[Package|contenitore]], è solo l\'involucro: protegge il chip vero e proprio, il [[Die|die]], un rettangolo di silicio che misura da qualche decina a qualche centinaio di millimetri quadrati. Quello di uno smartphone è di circa 100 mm²; i grandi chip per l\'intelligenza artificiale superano gli 800 mm², vicino al limite di circa 858 mm² che uno scanner litografico può stampare in un colpo solo.',
            'Dentro il die ci sono decine di miliardi di transistor. L\'A17 Pro dell\'iPhone 15 Pro, del 2023, ne ha 19 miliardi; l\'Apple M3 Max, dello stesso anno, 92 miliardi in un solo die; la GPU B200 di NVIDIA ne mette insieme 208 miliardi, divisi su due die. Numeri così sono impossibili da immaginare. Il modo migliore per farsene un\'idea è ingrandire un passo alla volta.'),
          labZoom(),
          ui.cols(
            ui.callout({
              kind: 'fun',
              title: 'Se il chip fosse un campo da calcio',
              body: 'Ingrandiamo il die del nostro chip, largo 12 millimetri, fino a farlo lungo come un campo da calcio di 105 metri. Un core diventerebbe largo come una piscina da 13 metri, una cella standard alta poco più di un millimetro e il gate di un transistor spesso più o meno come un capello. Gli atomi di silicio resterebbero comunque invisibili: grandi un paio di millesimi di millimetro.',
            }),
            ui.callout({
              kind: 'note',
              title: 'Quanto è piccolo un nanometro',
              body: 'Un [[Nanometro|nanometro]] è un milionesimo di millimetro: un capello è spesso circa 70.000 nanometri. Il gate dei transistor più avanzati è lungo una quindicina di nanometri, e lungo quel tratto stanno in fila solo qualche decina di atomi di silicio.',
            }))),

        ui.section({ id: 'mosfet', title: 'L\'interruttore di silicio', kicker: 'Bell Labs, 1959 – 1960 · Atalla e Kahng', lead: 'Quasi tutti quei miliardi di transistor sono dello stesso tipo: il MOSFET, il transistor a effetto di campo metallo-ossido-semiconduttore. L\'idea era vecchia di trent\'anni, ma per farla funzionare mancava un ingrediente: una superficie di silicio pulita.' },
          ui.prose(
            'L\'idea di comandare una corrente con un campo elettrico era stata brevettata già nel 1925-1926 dal fisico Julius Lilienfeld, e poi nel 1934-1935 dal tedesco Oskar Heil. Ma per oltre trent\'anni nessuno riuscì a costruire un transistor così che funzionasse davvero: ci provò anche William Shockley ai Bell Labs, dal 1945, senza successo. Il problema era la superficie del semiconduttore, piena di difetti che intrappolavano le cariche elettriche e schermavano il campo.',
            'La soluzione arrivò proprio dai Bell Labs. Dal 1957 Mohamed Atalla studiava come proteggere il silicio facendovi crescere sopra, in un forno, un sottile strato di biossido di silicio: l\'ossido eliminava gran parte di quei difetti. Pubblicò i risultati nel 1959. Con il collega Dawon Kahng ebbe allora l\'idea decisiva: usare proprio quello strato come isolante tra il silicio e un elettrodo di metallo, il [[Gate|gate]]. Tra il 1959 e il 1960 costruirono il primo [[MOSFET]] funzionante e lo presentarono nel giugno 1960 a una conferenza a Pittsburgh.',
            'Il nome dice com\'è fatto, dall\'alto in basso: metallo, ossido, semiconduttore. Nel silicio ci sono due zone drogate, il [[Source|source]] e il [[Drain|drain]]; tra loro, sopra il silicio, c\'è il gate, separato da uno strato sottilissimo di isolante, l\'[[Ossido di gate|ossido di gate]]. Il gate non tocca mai il silicio: agisce a distanza, con il campo elettrico. Quando la sua tensione supera la [[Tensione di soglia|tensione di soglia]], richiama sotto l\'ossido uno strato sottilissimo di elettroni, il [[Canale|canale]], e tra source e drain la corrente può passare.'),
          labMos(),
          ui.prose(
            'Il gate isolato è il segreto del MOSFET: per tenere acceso il transistor non serve quasi corrente, basta una tensione, e per questo se ne possono mettere miliardi su un chip. Il MOSFET esiste poi in due versioni speculari, [[nMOS]] e [[pMOS]]: insieme formano la logica [[CMOS]], che consuma quasi solo quando cambia stato, come racconta il <a href="#famiglie">capitolo 5</a>.',
            'All\'inizio il MOSFET era più lento dei transistor bipolari, e pochi ci credevano. Ma era semplice da fabbricare e si poteva fare piccolissimo. Nel 1968, alla Fairchild, Federico Faggin mise a punto la prima tecnologia industriale a gate di silicio, che rendeva i MOSFET più veloci, affidabili e fitti; passato alla Intel, la usò per progettare il 4004, il primo microprocessore in commercio, del 1971. La sua storia è nella <a href="../chip-programmabili/index.html#intel-4004">sezione sui primi chip programmabili</a>.',
            'Il gate di silicio è rimasto per quasi quarant\'anni. Poi l\'ossido sotto di lui era diventato così sottile, circa 1,2 nanometri, appena cinque strati di atomi, che gli elettroni lo attraversavano per effetto tunnel. Nel gennaio 2007 Intel annunciò il ritorno al gate di metallo, con un isolante a base di afnio ad alta costante dielettrica (high-k), che dà lo stesso effetto elettrico con uno strato più spesso e perde molta meno corrente. I primi processori così, a 45 nanometri, uscirono a novembre.'),
          ui.stats([
            { value: '1,3·10²²', label: 'MOSFET fabbricati fino al 2018', note: 'stima del Computer History Museum: tredicimila miliardi di miliardi' },
            { value: '1960', label: 'la presentazione del primo MOSFET', note: 'a Pittsburgh, a giugno' },
            { value: '0,2–0,5', unit: 'V', label: 'la tensione di soglia', note: 'all\'incirca, nei chip di oggi' },
            { value: '1,2', unit: 'nm', label: 'l\'ossido prima del 2007', note: 'circa cinque strati di atomi' },
          ]),
          ui.cols(
            ui.person({
              name: 'Mohamed Atalla', years: '1924 – 2009', role: 'ingegnere',
              body: [
                'Nato a Port Said, in Egitto, studiò all\'Università del Cairo e prese il dottorato alla Purdue University, negli Stati Uniti. Ai Bell Labs dal 1949, scoprì come proteggere il silicio con l\'ossido e, con Kahng, costruì il primo MOSFET.',
                'All\'inizio degli anni Sessanta passò alla Hewlett-Packard. Nel 1972 fondò una sua azienda, che proteggeva con la crittografia i codici segreti dei bancomat: per questo è talvolta chiamato «padre del PIN», anche se l\'idea del codice era nata pochi anni prima nel Regno Unito.',
              ],
            }),
            ui.person({
              name: 'Dawon Kahng', years: '1931 – 1992', role: 'fisico',
              body: [
                'Nato a Seul, si laureò in fisica all\'Università Nazionale di Seul e prese il dottorato alla Ohio State University. Ai Bell Labs, con Atalla, costruì il primo MOSFET.',
                'Nel 1967, con Simon Sze, propose il transistor a gate flottante, che intrappola una carica elettrica e la conserva anche a corrente staccata: è il principio delle memorie EPROM e flash. Nel 1988 divenne il primo presidente del NEC Research Institute di Princeton.',
              ],
            })),
          ui.callout({
            kind: 'link',
            title: 'Il MOSFET con un po\' più di fisica',
            body: 'Drogaggio, giunzioni, curve caratteristiche: come funziona un MOSFET visto da vicino lo spiega la <a href="../elettronica-intermedia/index.html#mosfet">sezione sull\'elettronica intermedia</a>.',
          })),

        ui.section({ id: 'celle', title: 'Miliardi di porte, un mattone alla volta', kicker: 'Dal rubylith ai linguaggi di progetto', lead: 'Nessuno disegna a mano miliardi di transistor. I progettisti descrivono che cosa deve fare il chip, e dei programmi lo costruiscono con mattoni già pronti: le celle standard.' },
          ui.prose(
            'Fino agli anni Settanta i chip si disegnavano davvero a mano. Gli ingegneri tracciavano gli strati su grandi fogli, e i disegnatori li riportavano sul rubylith, una pellicola rossa su un supporto trasparente: con un taglierino incidevano i contorni e staccavano a mano le parti da togliere. Il disegno, centinaia di volte più grande del chip, veniva poi fotografato e rimpicciolito per fare le maschere. Per un chip con qualche migliaio di transistor si poteva ancora fare; per milioni, no.',
            'La svolta fu un metodo. Alla fine degli anni Settanta Carver Mead, del Caltech, e Lynn Conway, dello Xerox PARC, proposero regole di disegno semplici, valide anche quando i transistor si rimpiccioliscono, e un modo ordinato di progettare che separava il progetto dalla fabbricazione. Il loro manuale, «Introduction to VLSI Systems», uscito tra il 1979 e il 1980, diventò il testo di riferimento in moltissime università: per progettare un chip non bisognava più lavorare in una fabbrica.',
            'Intanto si affermava un\'idea nata già alla fine degli anni Sessanta: le [[Cella standard|celle standard]]. Ogni porta logica, dall\'invertitore alla NAND al flip-flop, viene disegnata una volta sola, con cura, come un mattone di altezza fissa. Le celle si mettono in file, una accanto all\'altra, tra due binari di metallo che portano l\'alimentazione e la massa, e una libreria ne contiene da qualche centinaio a qualche migliaio di tipi diversi.',
            'Poi arrivarono i linguaggi. Tra la fine del 1983 e il 1984 Phil Moorby ideò il Verilog in una piccola azienda americana che poco dopo prese il nome di Gateway Design Automation; negli stessi anni il Dipartimento della Difesa degli Stati Uniti promosse il VHDL, che diventò uno standard nel 1987. Con questi linguaggi il progettista scrive che cosa deve fare il circuito, quasi come in un programma. Dal 1987 un programma di sintesi logica, il Design Compiler della Synopsys, sapeva tradurre quella descrizione in una rete di porte prese dalla libreria; altri programmi decidono dove mettere ogni cella e disegnano i fili che le collegano.'),
          labCell(),
          ui.prose('Oggi è tutto automatico, ma non per questo facile. Secondo NVIDIA, le sue GPU più grandi contengono miliardi di celle standard, e per sistemarle si usano perfino altre GPU: un blocco da dieci milioni di celle si piazza in pochi minuti. Le librerie le preparano le fonderie e aziende specializzate, cella per cella. E progettare costa: secondo le stime della società di analisi IBS, molto discusse perché ritenute alte, un chip complesso a 3 nanometri progettato da zero costa intorno ai 590 milioni di dollari, tra software, verifiche e prototipi.'),
          ui.callout({
            kind: 'key',
            title: 'Quattro transistor per una NAND',
            body: 'Nella logica CMOS una porta NAND a due ingressi usa 4 transistor: due pMOS in parallelo verso l\'alimentazione e due nMOS in serie verso massa. Un invertitore ne usa 2, un flip-flop circa 24. La NAND è piccola, veloce e con lei si può costruire qualunque altra porta: è una [[Porta universale|porta universale]], come racconta il <a href="#porte">capitolo 2</a>.',
          }),
          ui.cols(
            ui.person({
              name: 'Carver Mead', years: 'nato nel 1934', role: 'ingegnere e fisico',
              body: [
                'Professore al Caltech per tutta la carriera, fu tra i primi a capire, già negli anni Sessanta, quanto si potessero rimpicciolire i transistor.',
                'Fu lui a rendere popolare, negli anni Settanta, il nome «legge di Moore». Con Lynn Conway scrisse il manuale che ha insegnato a progettare chip a generazioni di studenti.',
              ],
            }),
            ui.person({
              name: 'Lynn Conway', years: '1938 – 2024', role: 'informatica e ingegnera',
              body: [
                'All\'IBM lavorò ai calcolatori più veloci dell\'epoca; nel 1968 fu licenziata perché aveva cominciato la transizione di genere, e ricostruì la carriera da capo.',
                'Allo Xerox PARC, con Mead, inventò il metodo di progetto e il corso universitario da cui nacque il manuale. Nel 2020 l\'IBM le ha chiesto pubblicamente scusa.',
              ],
            }))),

        ui.section({ id: 'grattacielo', title: 'Un grattacielo di fili', kicker: 'Rame, via e livelli di metallo · 1997 – oggi', lead: 'I transistor occupano solo il pianterreno del chip. Sopra di loro si alza un grattacielo di fili su più di dieci piani, che li collega tra loro e con il mondo esterno.' },
          ui.prose(
            'Transistor e celle stanno tutti in un unico strato, sulla superficie del silicio. Per collegarli servono fili, tantissimi, e non c\'è posto per farli correre tutti sullo stesso piano: per questo sopra i transistor si costruiscono molti livelli di fili, separati da strati di isolante. È la [[Metallizzazione|metallizzazione]]. Un chip logico di punta ha in genere da una dozzina a una ventina di livelli di metallo sovrapposti. I fili di un livello corrono tutti nella stessa direzione, quelli del livello sopra di traverso, e tra un livello e l\'altro passano minuscoli pilastri verticali di metallo, i [[Via|via]].',
            'In basso, accanto ai transistor, i fili sono sottilissimi e fittissimi: nel processo a 3 nanometri di TSMC i più fitti hanno un passo, cioè larghezza del filo più spazio, di circa 23 nanometri. Salendo diventano sempre più spessi e larghi, fino agli ultimi livelli, che portano l\'alimentazione, il clock e i segnali da un capo all\'altro del chip. In tutto è un intreccio lunghissimo: secondo IBM, nel suo processore Telum II, del 2024, corrono circa 39 chilometri di fili.'),
          labStack(),
          ui.prose(
            'Per quasi quarant\'anni i fili dei chip sono stati di alluminio. Il 22 settembre 1997 IBM annunciò il primo processo che usava il rame: il rame conduce meglio, con una resistenza più bassa di circa il 40%, e soffre molto meno di elettromigrazione, il lento spostamento degli atomi del metallo spinti dal flusso degli elettroni, che col tempo può assottigliare e interrompere un filo. I primi microprocessori con i fili di rame, i PowerPC 740 e 750 a 400 MHz, arrivarono nel settembre 1998.',
            'Il rame, però, non si lascia incidere con i plasmi come l\'alluminio. Per questo si usa il processo damasceno, che prende il nome da un\'antica tecnica di decorazione dei metalli legata a Damasco: invece di depositare il metallo e poi ritagliare i fili, si scavano solchi e fori nell\'isolante, si riempiono di rame per via elettrolitica e una lucidatura chimico-meccanica porta via il rame in eccesso, lasciando una superficie piatta per il livello successivo.',
            'Oggi il grattacielo cambia forma. Far scendere la corrente di alimentazione dall\'alto, attraverso tutti i piani, ruba spazio ai segnali e fa perdere tensione per strada. Così si capovolge il wafer, lo si assottiglia e si costruisce la rete di alimentazione sul retro, a ridosso dei transistor. Il primo chip in commercio fatto così è Panther Lake di Intel, prodotto con il processo 18A e presentato a gennaio 2026; TSMC adotterà l\'alimentazione dal retro con il processo A16, la cui produzione in volume è prevista per la seconda metà del 2026.'),
          ui.callout({
            kind: 'note',
            title: 'Quando il rame non basta più',
            body: 'Nei fili più sottili, larghi poche decine di nanometri, anche il rame comincia a soffrire: gli elettroni urtano contro le pareti del filo e la resistenza sale. Nel processo a 10 nanometri, presentato nel 2017, Intel usò il cobalto nei due livelli più bassi, e per le generazioni future si sperimentano altri metalli, come il rutenio.',
          })),

        ui.section({ id: 'floorplan', title: 'La pianta di un chip', kicker: 'System on a chip · core, grafica, cache', lead: 'Visto dall\'alto, un chip moderno sembra la pianta di una città: quartieri diversi, ognuno con il suo compito, collegati da strade di metallo.' },
          ui.prose(
            'Un tempo il processore era un chip e tutto il resto stava fuori, sulla scheda. Oggi un solo die riunisce quasi un intero computer: è un system on a chip, un sistema su un chip. L\'Apple M4, del 2024, contiene 28 miliardi di transistor: 4 core ad alte prestazioni e 6 ad alta efficienza, una grafica da 10 core, un\'unità da 16 core per l\'intelligenza artificiale, una cache di sistema condivisa, i controllori della memoria, i motori video e le interfacce con il resto del dispositivo.',
            'La pianta, il [[Floorplan|floorplan]], si decide all\'inizio del progetto. I [[Core|core]] sono raggruppati insieme alla loro [[Cache|cache]] di secondo livello; la grafica è spesso il blocco più esteso; le interfacce verso la memoria e verso l\'esterno corrono di solito lungo i bordi, vicino ai contatti. Ogni scelta conta: i blocchi che si scambiano molti dati devono stare vicini, perché un segnale che attraversa il chip impiega più tempo e consuma più energia.'),
          figFloor(),
          ui.prose(
            'Una parte sorprendente del die non calcola niente: ricorda. Le cache sono piccole memorie velocissime, accanto ai core, dove restano i dati usati di recente. Ogni bit è conservato in una cella SRAM a 6 transistor: quattro formano due invertitori collegati ad anello, che si tengono il valore a vicenda, e due collegano la cella alle linee di lettura e scrittura. In un chiplet di CPU AMD Zen 4, di circa 70 mm², i soli 32 MB di cache di terzo livello occupano circa un terzo dell\'area, secondo un\'analisi delle foto del die.',
            'E le cache sono diventate un problema: dai 5 nanometri in poi la SRAM si rimpicciolisce molto meno della logica. Nel primo processo a 3 nanometri di TSMC una cella SRAM occupa circa 0,0199 µm², appena il 5% in meno che a 5 nanometri; con il 2 nanometri e i suoi nanosheet scende a circa 0,0175 µm². Per questo c\'è chi costruisce la cache in un chip a parte, impilato sopra o sotto quello dei core: lo racconta il <a href="#moore">capitolo 9</a>.'),
          ui.cols(
            ui.callout({
              kind: 'link',
              title: 'Registri, cache, RAM, disco',
              body: 'Perché un computer ha bisogno di tante memorie diverse, dalle più piccole e veloci alle più grandi e lente? Lo spiega la <a href="../storia-pc/index.html#memoria">sezione sulla storia dei PC</a>.',
            }),
            ui.callout({
              kind: 'link',
              title: 'I chip dei computer di oggi',
              body: 'Core di tipi diversi, grafica integrata, unità per l\'intelligenza artificiale: come sono fatti i PC e i portatili di oggi lo racconta la <a href="../storia-pc/index.html#oggi">sezione sulla storia dei PC</a>.',
            }))),

        ui.section({ id: 'pinne', title: 'Il transistor diventa tridimensionale', kicker: '1989 – oggi · FinFET, nanosheet e oltre', lead: 'Per quarant\'anni il transistor è stato piatto. Poi è diventato così piccolo che il gate non riusciva più a spegnerlo del tutto, e l\'unica via d\'uscita è stata alzarsi in piedi.' },
          ui.prose(
            'Più il canale si accorcia, più il gate fatica a controllarlo: source e drain sono così vicini che una parte della corrente passa lo stesso, anche a transistor spento. Sono le [[Corrente di dispersione|correnti di dispersione]], che scaldano il chip e scaricano la batteria senza fare niente di utile. Nel transistor piatto il gate agisce soltanto dall\'alto; la soluzione era circondare il canale.',
            'La prima idea venne dal Giappone. Nel 1989 Digh Hisamoto e i suoi colleghi dei laboratori Hitachi presentarono il DELTA, un transistor con un canale di silicio verticale e sottilissimo, controllato dal gate su più lati. Alla fine degli anni Novanta, all\'Università della California a Berkeley, il gruppo di Chenming Hu, Tsu-Jae King e Jeffrey Bokor sviluppò con fondi della DARPA, l\'agenzia di ricerca della Difesa americana, il [[FinFET]]: il canale diventa una pinna sottile che si alza dal silicio, e il gate la abbraccia. Il nome viene da fin, pinna in inglese. Nel gruppo c\'era anche Hisamoto, arrivato da Hitachi come ricercatore ospite.',
            'Ci vollero più di dieci anni per portarlo in fabbrica. Il 4 maggio 2011 Intel annunciò i transistor «Tri-Gate» a 22 nanometri, chiamati così perché il gate avvolge la pinna su tre lati: erano i primi FinFET prodotti in grandi volumi, e arrivarono nei processori Ivy Bridge nell\'aprile 2012. Samsung e TSMC seguirono nel 2015, a 14 e a 16 nanometri.'),
          labFins(),
          ui.prose(
            'Dopo dieci anni di FinFET anche le pinne erano diventate strette e alte al limite del possibile. Il passo successivo è il transistor [[GAA|gate-all-around]]: il canale è diviso in fogli sottili sovrapposti, i nanosheet, e il gate li avvolge da tutti e quattro i lati. Samsung lo ha portato per prima in produzione, il 30 giugno 2022, a 3 nanometri; TSMC e Intel hanno cominciato alla fine del 2025, con i processi N2 e 18A.',
            'E dopo? Nei laboratori si prova a impilare un transistor n sopra un transistor p: è il CFET, il FET complementare. Una porta CMOS occuperebbe circa metà dello spazio. Intel, TSMC e Samsung ne hanno mostrato i primi prototipi nel 2023, ma la produzione non è attesa prima degli anni Trenta.'),
          ui.cols(
            ui.person({
              name: 'Chenming Hu', years: 'nato nel 1947', role: 'ingegnere',
              body: [
                'Nato a Pechino e cresciuto a Taiwan, si laureò alla National Taiwan University e prese il dottorato a Berkeley, dove ha insegnato per gran parte della carriera. Con i suoi studenti creò anche il primo modello matematico dei transistor adottato come standard dall\'industria per progettare i circuiti.',
                'Dal 2001 al 2004 fu direttore tecnico della TSMC. Nel 2016 il presidente Obama gli ha consegnato la National Medal of Technology and Innovation, e nel 2020 ha ricevuto la IEEE Medal of Honor.',
              ],
            }),
            ui.callout({
              kind: 'fun',
              title: 'Come strozzare un tubo',
              body: 'Pensa al canale come a un tubo dell\'acqua e al gate come alla mano che lo strozza. Premere con un dito da una parte sola, come nel transistor piatto, lascia passare qualche goccia; stringere con tre dita, come la pinna, funziona molto meglio; chiudere tutta la mano intorno, come nel gate-all-around, lo chiude davvero.',
            })),
          ui.keyIdea('Dentro un chip ci sono decine di miliardi di MOSFET, interruttori comandati da una tensione, raggruppati in celle standard messe in fila e collegati da un grattacielo di fili di rame. Per continuare a rimpicciolirli, il transistor è diventato tridimensionale: prima la pinna, poi i fogli avvolti dal gate, domani forse un transistor sopra l\'altro.'),
          ui.crossLink({ href: '#moore', kicker: 'Capitolo 9', title: 'La legge di Moore e oltre', text: 'Perché i transistor raddoppiano da sessant\'anni, che cosa vogliono dire davvero i «nanometri» e che cosa succede ora che rimpicciolirli è sempre più difficile.' })));
    },
  });
})();
