/*
 * Storia del PC · capitolo 2: Il programma memorizzato: l'architettura di von Neumann.
 * Testi, due illustrazioni (lo schema a blocchi della macchina di von Neumann e il
 * confronto con l'architettura Harvard) e il laboratorio «Un computer in miniatura».
 * Il file non tocca il DOM al caricamento: il DOM si usa solo dentro le figure e
 * dentro lab.crea(), così i test in Node possono caricarlo.
 */
(function (root) {
  'use strict';
  const P = root.StoriaPC;
  const M = (root.StoriaPCModelli || {})['von-neumann'];

  /* =====================================================================
   * Illustrazioni (SVG originali, stile tecnico piatto della sezione)
   * ===================================================================== */

  // Lo schema a blocchi del «First Draft»: CPU (unità di controllo, ALU, registri),
  // memoria con istruzioni e dati mescolati, ingresso e uscita, tutti sullo stesso bus.
  function figuraSchema() {
    const ruoli = ['i', 'i', 'i', 'i', 'i', 'i', 'i', 'i', 'd', 'i', 'v', 'v', 'v', 'v', 'd', 'd', 'd', 'd'];
    let celle = '';
    ruoli.forEach((r, k) => {
      const x = 372 + (k % 6) * 38;
      const y = 70 + Math.floor(k / 6) * 32;
      celle += '<rect class="cella-' + r + '" x="' + x + '" y="' + y + '" width="33" height="24" rx="4"/>';
      if (r !== 'v') {
        celle += '<path class="bit" d="M' + (x + 7) + ' ' + (y + 12) + 'h' + (r === 'i' ? 7 : 4) +
          'M' + (x + (r === 'i' ? 19 : 16)) + ' ' + (y + 12) + 'h' + (r === 'i' ? 7 : 10) + '"/>';
      }
    });
    let dita = '';
    for (let k = 0; k < 17; k++) dita += '<rect class="oro" x="' + (373 + k * 13) + '" y="178" width="8" height="10" rx="1.5"/>';
    // nastro perforato: due piste di fori e i fori di trascinamento
    const pistaA = [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0];
    const pistaB = [0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1];
    let fori = '';
    for (let k = 0; k < 19; k++) {
      const x = 30 + k * 14;
      if (x > 104 && x < 232) continue; // dentro il lettore
      fori += '<circle class="foro" cx="' + x + '" cy="308.5" r="1.4"/>';
      if (pistaA[k]) fori += '<circle class="foro" cx="' + x + '" cy="303.5" r="3"/>';
      if (pistaB[k]) fori += '<circle class="foro" cx="' + x + '" cy="313.5" r="3"/>';
    }
    return '<svg class="vn-fig" viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg">' +
      // bus e collegamenti
      '<rect class="rame l" x="24" y="212" width="592" height="28" rx="7"/>' +
      '<path class="fili" d="M36 220H604M36 226H604M36 232H604"/>' +
      '<rect class="rame ls" x="194" y="186" width="12" height="28"/>' +
      '<rect class="rame ls" x="434" y="176" width="12" height="38"/>' +
      '<rect class="rame ls" x="162" y="238" width="12" height="46"/>' +
      '<rect class="rame ls" x="494" y="238" width="12" height="26"/>' +
      '<path class="freccia" d="M168 243l8 11h-16z"/>' +
      '<path class="freccia" d="M500 263l-8-11h16z"/>' +
      // CPU
      '<rect class="ombra" x="38" y="32" width="276" height="164" rx="14"/>' +
      '<rect class="scuro l" x="32" y="24" width="276" height="164" rx="14"/>' +
      '<text class="tl" x="50" y="56">CPU</text>' +
      '<rect class="scuro2 ls" x="48" y="68" width="244" height="46" rx="8"/>' +
      '<text class="tl" x="170" y="99" text-anchor="middle">Unità di controllo</text>' +
      '<polygon class="ambra l" points="48,126 94,126 102,139 110,126 156,126 140,172 64,172"/>' +
      '<text class="td" x="102" y="164" text-anchor="middle">ALU</text>' +
      '<rect class="schermo ls" x="170" y="126" width="38" height="46" rx="6"/><text class="tf" x="189" y="157" text-anchor="middle">PC</text>' +
      '<rect class="schermo ls" x="214" y="126" width="38" height="46" rx="6"/><text class="tf" x="233" y="157" text-anchor="middle">IR</text>' +
      '<rect class="schermo ls" x="258" y="126" width="34" height="46" rx="6"/><text class="tf" x="275" y="157" text-anchor="middle">A</text>' +
      // memoria (un modulo con i contatti dorati)
      '<rect class="ombra" x="362" y="32" width="252" height="156" rx="12"/>' +
      '<rect class="pcb l" x="356" y="24" width="252" height="154" rx="10"/>' +
      '<text class="tl" x="372" y="56">Memoria</text>' + celle + dita +
      // ingresso: lettore di nastro perforato
      '<rect class="beige ls" x="22" y="298" width="280" height="21"/>' + fori +
      '<rect class="ombra" x="118" y="290" width="112" height="60" rx="8"/>' +
      '<rect class="beige2 l" x="112" y="282" width="112" height="60" rx="8"/>' +
      '<rect class="scuro2" x="112" y="297" width="6" height="23"/><rect class="scuro2" x="218" y="297" width="6" height="23"/>' +
      '<path class="fili" d="M126 332h40"/>' +
      '<circle class="led" cx="208" cy="332" r="4"/>' +
      '<text class="t" x="168" y="388" text-anchor="middle">Ingresso</text>' +
      // uscita: uno schermo che mostra il risultato
      '<rect class="ombra" x="430" y="270" width="152" height="84" rx="10"/>' +
      '<rect class="beige l" x="424" y="262" width="152" height="84" rx="10"/>' +
      '<rect class="schermo l" x="438" y="274" width="124" height="56" rx="8"/>' +
      '<rect class="bagliore" x="438" y="274" width="124" height="56" rx="8"/>' +
      '<text class="tf tf-grande" x="500" y="315" text-anchor="middle">12</text>' +
      '<circle class="beige3" cx="560" cy="338" r="3.5"/>' +
      '<rect class="beige2 ls" x="488" y="346" width="24" height="10"/>' +
      '<rect class="beige2 l" x="460" y="355" width="80" height="10" rx="4"/>' +
      '<text class="t" x="500" y="392" text-anchor="middle">Uscita</text>' +
      // etichetta del bus
      '<rect class="tela2 ls" x="284" y="210" width="72" height="32" rx="8"/>' +
      '<text class="t" x="320" y="234" text-anchor="middle">bus</text>' +
      '</svg>';
  }

  // Von Neumann (una memoria, un bus: istruzioni e dati in fila) contro Harvard
  // (due memorie e due bus percorsi nello stesso momento).
  function figuraConfronto() {
    function cpu(x, w) {
      let pin = '';
      for (let k = 0; k < 4; k++) {
        pin += '<rect class="oro" x="' + (x - 8) + '" y="' + (68 + k * 13) + '" width="8" height="5" rx="1"/>';
        pin += '<rect class="oro" x="' + (x + w) + '" y="' + (68 + k * 13) + '" width="8" height="5" rx="1"/>';
      }
      return pin + '<rect class="ombra" x="' + (x + 6) + '" y="66" width="' + w + '" height="62" rx="10"/>' +
        '<rect class="chip l" x="' + x + '" y="58" width="' + w + '" height="62" rx="10"/>' +
        '<text class="tl" x="' + (x + w / 2) + '" y="97" text-anchor="middle">CPU</text>';
    }
    function memoria(x, w, ruoli, colonne) {
      let c = '<rect class="ombra" x="' + (x + 6) + '" y="240" width="' + w + '" height="74" rx="10"/>' +
        '<rect class="pcb l" x="' + x + '" y="232" width="' + w + '" height="74" rx="10"/>';
      const cw = colonne === 7 ? 26 : 24;
      const x0 = x + (w - (colonne * (cw + 6) - 6)) / 2;
      ruoli.forEach((r, k) => {
        c += '<rect class="cella-' + r + '" x="' + (x0 + (k % colonne) * (cw + 6)) + '" y="' + (246 + Math.floor(k / colonne) * 28) + '" width="' + cw + '" height="20" rx="4"/>';
      });
      return c;
    }
    function gettone(x, y, r) { return '<rect class="cella-' + r + '" x="' + x + '" y="' + y + '" width="16" height="13" rx="4"/>'; }
    return '<svg class="vn-fig" viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">' +
      '<path class="divisore" d="M320 18V342"/>' +
      '<text class="t" x="160" y="40" text-anchor="middle">von Neumann</text>' +
      '<text class="t" x="480" y="40" text-anchor="middle">Harvard</text>' +
      // von Neumann: un bus, istruzioni e dati in fila indiana
      '<rect class="rame l" x="144" y="118" width="32" height="116"/>' +
      gettone(152, 128, 'i') + gettone(152, 149, 'd') + gettone(152, 170, 'i') + gettone(152, 191, 'i') + gettone(152, 212, 'd') +
      cpu(100, 120) +
      memoria(40, 240, ['i', 'i', 'd', 'i', 'i', 'd', 'i', 'i', 'i', 'd', 'v', 'd', 'i', 'v'], 7) +
      '<text class="t2" x="160" y="336" text-anchor="middle">istruzioni e dati</text>' +
      // Harvard: due bus, si viaggia in parallelo
      '<rect class="rame l" x="418" y="118" width="28" height="116"/>' +
      '<rect class="rame l" x="514" y="118" width="28" height="116"/>' +
      gettone(424, 132, 'i') + gettone(424, 162, 'i') + gettone(424, 192, 'i') +
      gettone(520, 132, 'd') + gettone(520, 162, 'd') + gettone(520, 192, 'd') +
      cpu(400, 160) +
      memoria(340, 130, ['i', 'i', 'i', 'i', 'i', 'i', 'i', 'v'], 4) +
      memoria(490, 130, ['d', 'd', 'd', 'v', 'd', 'd', 'v', 'v'], 4) +
      '<text class="t2" x="405" y="336" text-anchor="middle">istruzioni</text>' +
      '<text class="t2" x="555" y="336" text-anchor="middle">dati</text>' +
      '</svg>';
  }

  /* =====================================================================
   * Laboratorio «Un computer in miniatura»
   * ===================================================================== */

  const PROG_BREVI = { somma: '7 + 5', conto: 'Da 5 a 0', molt: '3 × 4', auto: 'Si modifica', vuota: 'Vuota' };
  const VELOCITA = [
    null,
    { nome: 'molto lenta', k: 1.8 },
    { nome: 'lenta', k: 1.2 },
    { nome: 'media', k: 0.75 },
    { nome: 'veloce', k: 0.4 },
    { nome: 'turbo', k: 0 },
  ];
  // Segmenti accesi per ogni cifra del display (a in alto, poi in senso orario, g al centro).
  const SEGMENTI = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
  const LIMITE_GIRI = 150;    // istruzioni dopo le quali un programma che non si ferma viene messo in pausa
  const SOGLIA_LARGO = 800;   // larghezza minima (px) per lo schema orizzontale
  const SOGLIA_MEDIO = 660;   // da qui lo schema verticale ha accanto spiegazione e comandi
  const MAX_CICLI_GRAFICO = 120;

  // Le ultime uscite, divise in righe che non superano «limite» caratteri (le più recenti in fondo).
  function righeUscite(valori, nRighe, limite) {
    const righe = [];
    let i = valori.length - 1;
    while (righe.length < nRighe && i >= 0) {
      const riga = [];
      let lun = 0;
      while (i >= 0) {
        const t = String(valori[i]);
        const nuova = lun + t.length + (riga.length ? 1 : 0);
        if (nuova > limite && riga.length) break;
        riga.unshift(t);
        lun = nuova;
        i -= 1;
      }
      righe.unshift(riga.join(' '));
    }
    return righe;
  }

  function r1(v) { return Math.round(v * 10) / 10; }
  function dPath(punti) { return punti.map((p, i) => (i ? 'L' : 'M') + r1(p[0]) + ' ' + r1(p[1])).join(''); }
  function lunghezze(punti) {
    const l = [0];
    for (let i = 1; i < punti.length; i++) l.push(l[i - 1] + Math.hypot(punti[i][0] - punti[i - 1][0], punti[i][1] - punti[i - 1][1]));
    return l;
  }
  function puntoLungo(punti, l, t) {
    const d = t * l[l.length - 1];
    let i = 1;
    while (i < l.length - 1 && l[i] < d) i++;
    const k = Math.max(0, Math.min(1, (d - l[i - 1]) / ((l[i] - l[i - 1]) || 1)));
    return [punti[i - 1][0] + (punti[i][0] - punti[i - 1][0]) * k, punti[i - 1][1] + (punti[i][1] - punti[i - 1][1]) * k];
  }

  // Coordinate di tutto lo schema per i due formati (largo: 960 di base; stretto: 320,
  // per i telefoni) e le due architetture. Nessun DOM: solo numeri.
  function geometria(layout, modo) {
    const H = modo === 'harvard';
    const largo = layout === 'largo';
    const g = { layout: layout, modo: modo, H: H, largo: largo };
    if (largo) {
      Object.assign(g, {
        W: 960, hh: 40,
        fs: { etich: 14, picc: 15, val: 17, reg: 22, gett: 15 },
        cpu: { x: 8, y: 8, w: 784, h: 292 }, cpuTesto: [22, 27],
        cu: { x: 20, y: 34, w: 760, h: 92 }, cuTitolo: [34, 55],
        clock: [764, 50],
        pillole: { x: 34, y: 64, w: 118, h: 26, gap: 8 },
        mnem: [424, 87], rtl: [560, 87],
        chip: { x: 34, y: 100, w: 60, h: 20, gap: 4 },
        pc: { x: 20, y: 146, w: 100, h: 52 },
        ir: { x: 140, y: 146, w: 280, h: 52 },
        a: { x: 584, y: 146, w: 176, h: 52 },
        alu: { x: 584, y: 216, w: 176, h: 50 },
        aluTesto: [594, 246], aluOp: [690, 247],
        flag: [{ id: 'z', led: [606, 282], lettera: [618, 287] }, { id: 'c', led: [678, 282], lettera: [690, 287] }],
        spina: { x: 552, y: 172 },
        out: { x: 808, y: 40, w: 112, h: 196 }, outTesto: [820, 62],
        cifra: { x: 815, y: 76, w: 28, h: 48, gap: 7 },
        storia: { x: 820, righe: [180, 202], etich: [820, 158], limite: 11 },
        pannello: null,
        cpuBasso: 300, memY: 332,
        ctrl: { leggi: [[700, 34], [700, 16], [938, 16]], scrivi: [[712, 34], [712, 24], [930, 24]] },
        ctrlTesto: [922, 357],
        p: {
          aluA: [[760, 241], [776, 241], [776, 182], [760, 182]],
          aAlu: [[672, 198], [672, 216]],
          aOut: [[760, 160], [808, 160]],
          irA: [[420, 172], [552, 172], [584, 172]],
          irPc: [[350, 146], [350, 136], [70, 136], [70, 146]],
        },
        pcBasso: [70, 198], opBasso: [350, 198],
        dentro: { ir: [[552, 172], [420, 172]], a: [[552, 172], [584, 172]], alu: [[552, 241], [584, 241]], irI: [[210, 198]] },
        nodi: [[552, 172], [552, 241]],
        prese: [[[420, 172], [584, 172]], [[552, 241], [584, 241]]],
        mux: H ? null : { x: 200, y: 284, h: 16, wTop: 36, wBot: 20, inL: 190, inR: 210, yIn: 276 },
        viaOpH: [[350, 198], [350, 280], [500, 280]],
        piu: [114, 164],
        etichetteBus: H
          ? [['indirizzi', 78, 322, 'start'], ['istruzioni', 218, 322, 'start'], ['indirizzi', 492, 322, 'end'], ['dati', 560, 322, 'start'], ['controllo', 922, 322, 'end']]
          : [['bus indirizzi', 208, 322, 'start'], ['bus dati', 560, 322, 'start'], ['controllo', 922, 322, 'end']],
      });
      g.blocchi = H ? [
        { id: 'I', x: 8, w: 448, dec: 70, porta: 210, ctrl: false, titolo: 'MEMORIA ISTRUZIONI', titoloX: 226, col: 4, cw: 95, ch: 54, gx: 12, gy: 10 },
        { id: 'D', x: 472, w: 480, dec: 500, porta: 552, ctrl: true, titolo: 'MEMORIA DATI', titoloX: 570, col: 4, cw: 95, ch: 54, gx: 12, gy: 10 },
      ] : [
        { id: 'U', x: 8, w: 944, dec: 200, porta: 552, ctrl: true, titolo: 'MEMORIA', titoloX: 20, sotto: 'istruzioni e dati, 16 celle da 8 bit', sottoX: 240, col: 8, cw: 104, ch: 64, gx: 11.4, gy: 12 },
      ];
    } else {
      Object.assign(g, {
        W: 320, hh: 26,
        fs: { etich: 11.5, picc: 12, val: 12, reg: 15, gett: 12 },
        cpu: { x: 6, y: 76, w: 308, h: 320 }, cpuTesto: [20, 92],
        cu: { x: 22, y: 98, w: 274, h: 88 }, cuTitolo: [30, 114],
        clock: null,
        pillole: { x: 30, y: 122, w: 84, h: 22, gap: 3 },
        mnem: [30, 173], rtl: [124, 173],
        chip: null,
        a: { x: 48, y: 198, w: 234, h: 40 },
        alu: { x: 48, y: 250, w: 234, h: 40 },
        aluTesto: [56, 274], aluOp: [140, 275],
        flag: [{ id: 'z', led: [228, 270], lettera: [219, 274.5], fine: true }, { id: 'c', led: [268, 270], lettera: [259, 274.5], fine: true }],
        pc: { x: 20, y: 306, w: 70, h: 40 },
        ir: { x: 100, y: 306, w: 182, h: 40 },
        spina: { x: 292, y: 218 },
        out: { x: 6, y: 6, w: 150, h: 62 }, outTesto: [14, 22],
        cifra: { x: 72, y: 13, w: 22, h: 36, gap: 5 },
        storia: { x: 14, righe: [62], etich: null, limite: 13 },
        pannello: { x: 164, y: 6, w: 150, h: 62 },
        cpuBasso: 396, memY: 436,
        ctrl: { leggi: [[296, 134], [304, 134]], scrivi: [[296, 146], [311, 146]] },
        ctrlTesto: null,
        p: {
          aluA: [[48, 270], [36, 270], [36, 226], [48, 226]],
          aAlu: [[165, 238], [165, 250]],
          aOut: [[48, 208], [12, 208], [12, 68]],
          irA: [[282, 326], [292, 326], [292, 218], [282, 218]],
          irPc: [[236, 306], [236, 298], [55, 298], [55, 306]],
        },
        pcBasso: [55, 346], opBasso: [236, 346],
        dentro: { ir: [[292, 326], [282, 326]], a: [[292, 218], [282, 218]], alu: [[292, 270], [282, 270]], irI: [[150, 346]] },
        nodi: [[292, 218], [292, 270], [292, 326]],
        prese: [[[282, 218], [292, 218]], [[282, 270], [292, 270]], [[282, 326], [292, 326]]],
        mux: H ? null : { x: 150, y: 372, h: 16, wTop: 30, wBot: 18, inL: 142, inR: 158, yIn: 364 },
        viaOpH: [[236, 346]],
        piu: [86, 319],
        etichetteBus: [],
      });
      g.blocchi = H ? [
        { id: 'I', x: 6, w: 150, dec: 55, porta: 150, ctrl: false, titolo: 'ISTRUZIONI', titoloX: 76, col: 2, cw: 65, ch: 40, gx: 6, gy: 4 },
        { id: 'D', x: 164, w: 150, dec: 236, porta: 292, ctrl: true, titolo: 'DATI', titoloX: 172, col: 2, cw: 65, ch: 40, gx: 6, gy: 4 },
      ] : [
        { id: 'U', x: 6, w: 308, dec: 150, porta: 292, ctrl: true, titolo: 'MEMORIA', titoloX: 14, col: 4, cw: 68.5, ch: 48, gx: 6, gy: 6 },
      ];
    }
    g.blocchi.forEach((b) => {
      b.y = g.memY;
      b.hh = g.hh;
      b.righe = 16 / b.col;
      b.x0 = b.x + (b.w - (b.col * b.cw + (b.col - 1) * b.gx)) / 2;
      b.yInt = b.y + b.hh + 6;
      const y0 = b.y + b.hh + 12;
      b.celle = [];
      for (let i = 0; i < 16; i++) {
        const c = i % b.col;
        const r = Math.floor(i / b.col);
        b.celle.push({ x: b.x0 + c * (b.cw + b.gx), y: y0 + r * (b.ch + b.gy), w: b.cw, h: b.ch });
      }
      b.h = y0 + b.righe * b.ch + (b.righe - 1) * b.gy + (largo ? 14 : 8) - b.y;
      const dw = largo ? 48 : 34;
      const dh = largo ? 26 : 18;
      b.decBox = { x: b.dec - dw / 2, y: b.y + (b.hh - dh) / 2, w: dw, h: dh };
      b.decCentro = [b.dec, b.y + b.hh / 2];
    });
    g.Ht = Math.max.apply(null, g.blocchi.map((b) => b.y + b.h)) + 6;
    g.blocco = (id) => g.blocchi.find((b) => b.id === id) || g.blocchi[0];

    // Percorsi dei gettoni: indirizzo dal PC, indirizzo dall'operando, dati da una cella a un registro.
    g.viaPC = function (id) {
      const b = g.blocco(id);
      if (g.mux) return [g.pcBasso, [g.pcBasso[0], g.mux.yIn], [g.mux.inL, g.mux.yIn], [g.mux.x, g.mux.y + g.mux.h * 0.6], b.decCentro];
      return [g.pcBasso, [g.pcBasso[0], b.decCentro[1]]];
    };
    g.viaOp = function (id) {
      const b = g.blocco(id);
      if (g.mux) return [g.opBasso, [g.opBasso[0], g.mux.yIn], [g.mux.inR, g.mux.yIn], [g.mux.x, g.mux.y + g.mux.h * 0.6], b.decCentro];
      return g.viaOpH.concat([[b.dec, b.decCentro[1]]]);
    };
    g.viaDati = function (id, i, verso) {
      const b = g.blocco(id);
      const c = b.celle[i];
      const xc = c.x - b.gx / 2;
      const yc = c.y + c.h / 2;
      const punti = [[c.x + c.w / 2, yc], [xc, yc], [xc, b.yInt], [b.porta, b.yInt], [b.porta, g.cpuBasso]];
      return punti.concat(id === 'I' ? g.dentro.irI : g.dentro[verso]);
    };
    return g;
  }

  function creaLaboratorio(el, ctx) {
    const h = ctx.h;
    const s = ctx.s;
    if (!M) {
      el.append(h('p', { class: 'lab-errore' }, 'Il modello del computer in miniatura non è stato caricato.'));
      return {};
    }

    const PROGRAMMI = M.PROGRAMMI.map((p) => ({ id: p.id, nome: p.nome, descrizione: p.descrizione, memoria: p.memoria.slice(), ruoli: p.ruoli.slice() }));
    PROGRAMMI.push({
      id: 'vuota',
      nome: 'Memoria vuota',
      descrizione: 'Tutte le celle valgono 0, cioè NOP. Tocca una cella per scriverci un\'istruzione o un numero e costruisci il tuo programma. Ricordati di finire con HLT, altrimenti il PC fa il giro delle 16 celle all\'infinito.',
      memoria: new Array(16).fill(0),
      ruoli: new Array(16).fill(null),
    });

    const ui = {
      prog: 'somma', modo: 'vn', base: 'bin', velocita: 2, layout: null,
      immagine: null, ruoli: null, stato: null,
      ultimo: null, prima: null, decod: null, aluTesto: '',
      epoca: 0, corsa: false, occupato: false, salto: false, saltaIstr: false, inIstruzione: false,
      riprendi: false, avvisato: false, fuoco: {}, traffico: null,
      prossimo: null, giro: 0, icona: null,
    };
    const ed = { aperto: false, blocco: null, i: 0, modo: 'istruzione', opTipo: undefined };
    let TR = null;         // caselle del diagramma del traffico
    let G = null;          // geometria corrente
    let R = null;          // riferimenti agli elementi dello schema
    const attivi = [];     // animazioni in corso (si possono annullare)
    const tracce = [];     // scie dei gettoni del micro-passo corrente
    const idl = ctx.uid('vn');

    /* ---------- piccoli aiuti per l'SVG ---------- */

    function add(par, tag, attrs) { const n = s(tag, attrs); par.append(n); return n; }
    function rett(par, b, cls, rx) { return add(par, 'rect', { x: r1(b.x), y: r1(b.y), width: r1(b.w), height: r1(b.h), rx: rx == null ? 8 : rx, class: cls }); }
    function txt(par, x, y, testo, cls, extra) {
      const t = add(par, 'text', Object.assign({ x: r1(x), y: r1(y), class: cls }, extra || {}));
      t.textContent = testo;
      return t;
    }
    function linea(par, punti, cls) { return add(par, 'path', { d: dPath(punti), class: cls }); }
    function cambia(el, testo, anima) {
      if (el.textContent === testo) return false;
      el.textContent = testo;
      if (anima) riavvia(el, 'vn-nuovo');
      return true;
    }
    function riavvia(el, cls) {
      if (!el) return;
      el.classList.remove(cls);
      void el.getBoundingClientRect();
      el.classList.add(cls);
    }
    function fmt(v, bit) { return M.formatta(v, ui.base, bit || 8); }
    function pct(v, tot) { return (100 * v / tot) + '%'; }

    /* ---------- struttura della pagina del laboratorio ---------- */

    function segmentato(etichetta, voci, scelta) {
      const idE = idl + '-' + voci[0].v + '-lab';
      const gruppo = h('div', { class: 'lab-seg', role: 'group', 'aria-labelledby': idE });
      const pulsanti = voci.map((v) => h('button', { type: 'button', 'aria-pressed': 'false', 'aria-label': v.nome || null, title: v.titolo || null, onclick: () => scelta(v.v) },
        v.t, v.sr ? h('span', { class: 'vn-sr' }, ' ' + v.sr) : null));
      pulsanti.forEach((b) => gruppo.append(b));
      return {
        radice: h('div', { class: 'vn-gruppo' }, h('span', { class: 'vn-etichetta', id: idE }, etichetta), gruppo),
        imposta(val) { pulsanti.forEach((b, i) => b.setAttribute('aria-pressed', String(voci[i].v === val))); },
      };
    }

    function icona(nome) {
      const D = {
        reset: ['M3.2 8.2a4.8 4.8 0 1 0 1.5-3.6', 'M3 2.6v3.3h3.3'],
        passo: ['M3.5 3.2l6.5 4.8-6.5 4.8z', 'M12.4 3.2v9.6'],
        istr: ['M2 3.2l5.6 4.8L2 12.8z', 'M8.2 3.2l5.6 4.8-5.6 4.8z'],
        play: ['M4.2 2.6l9.2 5.4-9.2 5.4z'],
        pausa: ['M4 2.8h2.8v10.4H4z', 'M9.2 2.8H12v10.4H9.2z'],
      }[nome];
      const svg = s('svg', { viewBox: '0 0 16 16', class: 'vn-icona' + (nome === 'reset' ? ' tratto' : ''), 'aria-hidden': 'true', focusable: 'false' });
      D.forEach((d) => svg.append(s('path', { d: d })));
      return svg;
    }

    const segProg = segmentato('Programma', PROGRAMMI.map((p) => ({ v: p.id, t: PROG_BREVI[p.id], nome: p.nome, titolo: p.nome })), (v) => caricaProgramma(v));
    const segModo = segmentato('Architettura', [
      { v: 'vn', t: 'Von Neumann · 1 bus' },
      { v: 'harvard', t: 'Harvard · 2 bus' },
    ], (v) => cambiaModo(v));
    const segBase = segmentato('Numeri in', [
      { v: 'bin', t: 'BIN', sr: 'binario', titolo: 'binario' },
      { v: 'hex', t: 'HEX', sr: 'esadecimale', titolo: 'esadecimale' },
      { v: 'dec', t: 'DEC', sr: 'decimale', titolo: 'decimale' },
    ], (v) => cambiaBase(v));

    const descr = h('p', { class: 'vn-descr' });
    const overlay = h('div', { class: 'vn-celle' });
    const macchina = h('div', { class: 'vn-macchina' });
    const voceLeg = (cls, t) => h('li', { class: 'vn-leg-' + cls }, h('i', { 'aria-hidden': 'true' }), t);
    const legenda = h('ul', { class: 'vn-legenda', 'aria-label': 'Legenda dei colori' },
      voceLeg('indirizzo', 'indirizzi'), voceLeg('istruzione', 'istruzioni'), voceLeg('dato', 'dati'),
      voceLeg('leggi', 'linea LEGGI'), voceLeg('scrivi', 'linea SCRIVI'), voceLeg('pc', 'cella indicata dal PC'),
      voceLeg('uso', 'cella già usata come istruzione o come dato'));

    const fase = h('p', { class: 'vn-fase', 'aria-hidden': 'true' }, 'Pronto');
    const nota = h('p', { class: 'lab-note vn-nota', 'aria-live': 'polite' });

    const bReset = h('button', { type: 'button', class: 'lab-btn', onclick: () => ricomincia() }, icona('reset'), 'Ricomincia');
    const bMicro = h('button', { type: 'button', class: 'lab-btn', onclick: () => passoManuale() }, icona('passo'), 'Micro-passo');
    const bIstr = h('button', { type: 'button', class: 'lab-btn', onclick: () => istruzioneManuale() }, icona('istr'), 'Istruzione');
    const corriIcona = h('span', { class: 'vn-corri-icona' }, icona('play'));
    const corriTesto = h('span', null, 'Esegui');
    const bCorri = h('button', { type: 'button', class: 'lab-btn primary vn-corri', onclick: () => alternaCorsa() }, corriIcona, corriTesto);
    const vel = h('input', { type: 'range', min: '1', max: '5', step: '1', value: String(ui.velocita), 'aria-valuetext': VELOCITA[ui.velocita].nome });
    const velTesto = h('span', { class: 'vn-vel-testo', 'aria-hidden': 'true' }, VELOCITA[ui.velocita].nome);
    vel.addEventListener('input', () => {
      ui.velocita = Number(vel.value);
      vel.setAttribute('aria-valuetext', VELOCITA[ui.velocita].nome);
      velTesto.textContent = VELOCITA[ui.velocita].nome;
    });
    const conta = h('span', { class: 'lab-readout vn-conta' });
    const trasporto = h('div', { class: 'lab-controls vn-trasporto' },
      fase, bReset, bMicro, bIstr, bCorri,
      h('label', { class: 'lab-range vn-vel' }, 'Velocità', vel, velTesto),
      conta);

    // editor della memoria
    const edTit = h('h4', { class: 'vn-pan-tit', id: idl + '-ed-tit' }, 'Modifica la memoria');
    const edAiuto = h('p', { class: 'vn-aiuto' }, 'Tocca una cella della memoria per cambiarne il contenuto, un\'istruzione o un numero: è così che si caricava un programma sui primi computer, cella per cella, dal pannello.');
    const segEd = segmentato('Contenuto', [{ v: 'istruzione', t: 'Istruzione' }, { v: 'numero', t: 'Numero' }], (v) => { ed.modo = v; aggiornaEditor(); });
    const selIstr = h('select', { id: idl + '-istr' }, M.ISTRUZIONI.map((i) => h('option', { value: String(i.codice) }, i.nome + ' · ' + i.breve)));
    const selOp = h('select', { id: idl + '-op' });
    const inNum = h('input', { type: 'number', id: idl + '-num', min: '0', max: '255', step: '1', inputmode: 'numeric' });
    const campiIstr = h('div', { class: 'vn-campi' }, h('label', { for: selIstr.id }, 'Istruzione'), selIstr, h('label', { for: selOp.id }, 'Operando'), selOp);
    const campiNum = h('div', { class: 'vn-campi' }, h('label', { for: inNum.id }, 'Valore (0–255)'), inNum);
    const anteprima = h('p', { class: 'vn-anteprima lab-mono', 'aria-live': 'polite' });
    const bScrivi = h('button', { type: 'button', class: 'lab-btn primary', onclick: () => scriviDaEditor() }, 'Scrivi nella cella');
    const bChiudi = h('button', { type: 'button', class: 'lab-btn', onclick: () => chiudiEditor(true) }, 'Chiudi');
    const edForm = h('div', { class: 'vn-ed-form', hidden: true }, segEd.radice, campiIstr, campiNum, anteprima, h('div', { class: 'vn-ed-azioni' }, bScrivi, bChiudi));
    [selIstr, selOp].forEach((n) => n.addEventListener('change', aggiornaEditor));
    inNum.addEventListener('input', aggiornaEditor);
    inNum.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); scriviDaEditor(); } });
    edForm.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); chiudiEditor(true); } });
    const pEditor = h('section', { class: 'lab-panel vn-editor', 'aria-labelledby': edTit.id }, edTit, edAiuto, edForm);

    // traffico sui bus, ciclo per ciclo
    const trTit = h('h4', { class: 'vn-pan-tit', id: idl + '-tr-tit' }, 'Che cosa passa sui bus, ciclo per ciclo');
    const trRighe = h('div', { class: 'vn-tr-righe' });
    const trSintesi = h('p', { class: 'vn-tr-sintesi' });
    const trLeg = h('ul', { class: 'vn-legenda vn-tr-leg', 'aria-label': 'Legenda del diagramma' },
      voceLeg('istruzione', 'prelievo di un\'istruzione'), voceLeg('dato', 'lettura o scrittura di un dato'), voceLeg('libero', 'bus libero'));
    const pTraffico = h('section', { class: 'lab-panel vn-traffico', 'aria-labelledby': trTit.id }, trTit, trRighe, trLeg, trSintesi);

    const srStato = h('p', { class: 'vn-sr' });

    // .vn-lato raccoglie legenda, spiegazione e comandi: nel formato medio diventa una colonna
    // accanto allo schema; negli altri formati è «display: contents» e non cambia nulla.
    const radice = h('div', { class: 'vn-lab' },
      h('div', { class: 'vn-barra' }, segProg.radice, segModo.radice, segBase.radice),
      descr, macchina,
      h('div', { class: 'vn-lato' }, legenda, h('div', { class: 'vn-stato' }, nota), trasporto),
      h('div', { class: 'vn-sotto' }, pEditor, pTraffico),
      srStato);
    el.append(radice);

    /* ---------- disegno dello schema ---------- */

    function costruisci() {
      G = geometria(ui.layout, ui.modo);
      const svg = s('svg', {
        class: 'lab-svg vn-svg', viewBox: '0 0 ' + G.W + ' ' + r1(G.Ht), role: 'img',
        'aria-label': 'Schema del computer in miniatura (' + (G.H ? 'architettura Harvard: memoria delle istruzioni e memoria dei dati, con due bus' : 'architettura di von Neumann: una sola memoria e un solo bus') + '). La CPU contiene unità di controllo, contatore di programma, registro istruzione, accumulatore e ALU; l\'uscita è un display a tre cifre. Lo stato è descritto anche nel testo qui sotto.',
      });
      R = { svg: svg, strati: {}, celle: {}, dec: {}, ctrl: {}, flag: {}, chip: {} };
      ['fondo', 'piste', 'scie', 'unita', 'gettoni'].forEach((k) => { R.strati[k] = add(svg, 'g', { class: 'vn-strato-' + k }); });
      disegnaFondo();
      disegnaPiste();
      disegnaUnita();
      G.blocchi.forEach(disegnaBlocco);
      disegnaUscita();
      macchina.replaceChildren(svg, overlay);
      costruisciPulsanti();
      radice.classList.toggle('vn-largo', G.largo);
      radice.classList.toggle('vn-stretto', !G.largo);
      radice.dataset.modo = ui.modo;
      tracce.length = 0;
    }

    function disegnaFondo() {
      const F = R.strati.fondo;
      rett(F, G.cpu, 'vn-cpu', 14);
      txt(F, G.cpuTesto[0], G.cpuTesto[1], 'CPU', 'vn-etich vn-cpu-tit');
      rett(F, G.out, 'vn-uscita-box', 10);
      if (G.pannello) rett(F, G.pannello, 'vn-info-box', 10);
      G.blocchi.forEach((b) => {
        rett(F, b, 'vn-mem', 12);
        linea(F, [[b.x, b.y + b.hh], [b.x + b.w, b.y + b.hh]], 'vn-mem-riga');
        txt(F, b.titoloX, b.y + b.hh / 2 + G.fs.etich * 0.36, b.titolo, 'vn-etich vn-mem-tit');
        if (b.sotto) txt(F, b.sottoX, b.y + b.hh / 2 + G.fs.etich * 0.36, b.sotto, 'vn-mem-sotto');
      });
      if (G.ctrlTesto) txt(F, G.ctrlTesto[0], G.ctrlTesto[1], 'LEGGI · SCRIVI', 'vn-mem-sotto', { 'text-anchor': 'end' });
      G.etichetteBus.forEach((e) => txt(F, e[1], e[2], e[0], 'vn-bus-tit', { 'text-anchor': e[3] }));
    }

    function disegnaPiste() {
      const L = R.strati.piste;
      const U = G.blocco(G.H ? 'D' : 'U');
      // bus indirizzi
      if (G.mux) {
        const m = G.mux;
        linea(L, [G.pcBasso, [G.pcBasso[0], m.yIn], [m.inL, m.yIn], [m.inL, m.y]], 'vn-pista indirizzo');
        linea(L, [G.opBasso, [G.opBasso[0], m.yIn], [m.inR, m.yIn], [m.inR, m.y]], 'vn-pista indirizzo');
        linea(L, [[m.x, m.y + m.h], [m.x, U.decBox.y]], 'vn-pista indirizzo');
      } else {
        const I = G.blocco('I');
        linea(L, [G.pcBasso, [G.pcBasso[0], I.decBox.y]], 'vn-pista indirizzo');
        linea(L, G.viaOpH.concat([[U.dec, U.decBox.y]]), 'vn-pista indirizzo');
        linea(L, [G.dentro.irI[0], [I.porta, I.y + I.hh]], 'vn-pista dati istr');
      }
      // bus dati: il tratto interno alla CPU continua fino alla memoria
      linea(L, [[G.spina.x, G.spina.y], [G.spina.x, U.y + U.hh]], 'vn-pista dati');
      G.prese.forEach((p) => linea(L, p, 'vn-pista dati'));
      G.nodi.forEach((n) => add(L, 'circle', { cx: n[0], cy: n[1], r: G.largo ? 5 : 3.5, class: 'vn-nodo' }));
      // collegamenti interni alla CPU
      ['aluA', 'aAlu', 'aOut', 'irPc'].forEach((k) => linea(L, G.p[k], 'vn-pista interno'));
      // dentro le memorie: la linea comune e i canali verso le celle
      G.blocchi.forEach((b) => {
        const canali = [];
        for (let c = 0; c < b.col; c++) canali.push(b.x0 + c * (b.cw + b.gx) - b.gx / 2);
        const ultimaRiga = b.celle[16 - 1];
        canali.forEach((xc) => linea(L, [[xc, b.yInt], [xc, ultimaRiga.y + ultimaRiga.h / 2]], 'vn-pista mem'));
        linea(L, [[Math.min(canali[0], b.porta), b.yInt], [Math.max(canali[canali.length - 1], b.porta), b.yInt]], 'vn-pista mem');
        linea(L, [[b.porta, b.y + b.hh], [b.porta, b.yInt]], 'vn-pista mem');
        b.celle.forEach((c) => linea(L, [[c.x - b.gx / 2, c.y + c.h / 2], [c.x, c.y + c.h / 2]], 'vn-pista mem'));
      });
      // linee di controllo LEGGI e SCRIVI
      const Bc = G.blocchi.find((b) => b.ctrl);
      ['leggi', 'scrivi'].forEach((k) => {
        const punti = G.ctrl[k].slice();
        const ultimo = punti[punti.length - 1];
        punti.push([ultimo[0], Bc.y + Math.min(14, Bc.hh - 6)]);
        R.ctrl[k] = add(L, 'g', { class: 'vn-ctrl ' + k });
        linea(R.ctrl[k], punti, 'vn-ctrl-linea');
        const fine = punti[punti.length - 1];
        add(R.ctrl[k], 'circle', { cx: fine[0], cy: fine[1], r: G.largo ? 3.5 : 2.5, class: 'vn-ctrl-fine' });
      });
    }

    function registro(b, nome) {
      const g = add(R.strati.unita, 'g', { class: 'vn-reg' });
      rett(g, b, 'vn-box', 8);
      add(g, 'rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 8, class: 'vn-alone' });
      txt(g, b.x + (G.largo ? 10 : 7), b.y + G.fs.etich + (G.largo ? 6 : 2), nome, 'vn-etich');
      return g;
    }

    function disegnaUnita() {
      const U = R.strati.unita;
      const fs = G.fs;
      // unità di controllo
      const cu = add(U, 'g', { class: 'vn-cu' });
      rett(cu, G.cu, 'vn-box vn-cu-box', 10);
      txt(cu, G.cuTitolo[0], G.cuTitolo[1], 'UNITÀ DI CONTROLLO', 'vn-etich');
      R.pillole = ['PRELIEVO', 'DECODIFICA', 'ESECUZIONE'].map((t, i) => {
        const pl = G.pillole;
        const b = { x: pl.x + i * (pl.w + pl.gap), y: pl.y, w: pl.w, h: pl.h };
        const gp = add(cu, 'g', { class: 'vn-pillola' });
        rett(gp, b, 'vn-pillola-fondo', b.h / 2);
        txt(gp, b.x + b.w / 2, b.y + b.h / 2 + fs.etich * 0.36, t, 'vn-pillola-testo', { 'text-anchor': 'middle' });
        return gp;
      });
      R.mnem = txt(cu, G.mnem[0], G.mnem[1], '', 'vn-mnem');
      R.rtl = txt(cu, G.rtl[0], G.rtl[1], '', 'vn-rtl');
      if (G.chip) {
        M.ISTRUZIONI.forEach((istr, i) => {
          const c = G.chip;
          const b = { x: c.x + i * (c.w + c.gap), y: c.y, w: c.w, h: c.h };
          const gc = add(cu, 'g', { class: 'vn-chip' });
          rett(gc, b, 'vn-chip-fondo', 5);
          txt(gc, b.x + b.w / 2, b.y + b.h / 2 + 5, istr.codice.toString(16).toUpperCase() + ' ' + istr.nome, 'vn-chip-testo', { 'text-anchor': 'middle' });
          R.chip[istr.codice] = gc;
        });
      }
      if (G.clock) {
        txt(cu, G.clock[0] - 12, G.clock[1] + 5, 'clock', 'vn-etich', { 'text-anchor': 'end' });
        R.clock = add(cu, 'circle', { cx: G.clock[0], cy: G.clock[1], r: 6, class: 'vn-clock' });
      }
      // registri
      R.pc = registro(G.pc, 'PC');
      R.pcVal = txt(R.pc, G.pc.x + G.pc.w / 2, G.pc.y + G.pc.h - (G.largo ? 12 : 7), '', 'vn-reg-val', { 'text-anchor': 'middle' });
      R.piu = txt(R.pc, G.piu[0], G.piu[1], '+1', 'vn-piu', { 'text-anchor': 'end' });

      R.ir = registro(G.ir, 'IR');
      const metà = G.ir.w / 2;
      const campo = (k) => ({ x: G.ir.x + k * metà + 3, y: G.ir.y + 3, w: metà - 6, h: G.ir.h - 6 });
      R.irCod = add(R.ir, 'g', { class: 'vn-ir-cod' });
      rett(R.irCod, campo(0), 'vn-ir-campo', 6);
      R.irOpG = add(R.ir, 'g', { class: 'vn-ir-op' });
      rett(R.irOpG, campo(1), 'vn-ir-campo', 6);
      const yCap = G.ir.y + G.fs.etich + (G.largo ? 6 : 2);
      txt(R.ir, G.ir.x + metà * 0.5 + (G.largo ? 4 : 6), yCap, 'codice', 'vn-cap', { 'text-anchor': 'middle' });
      txt(R.ir, G.ir.x + metà * 1.5, yCap, 'operando', 'vn-cap', { 'text-anchor': 'middle' });
      txt(R.ir, G.ir.x + (G.largo ? 10 : 7), yCap, 'IR', 'vn-etich');
      const yVal = G.ir.y + G.ir.h - (G.largo ? 12 : 7);
      R.irCodVal = txt(R.irCod, G.ir.x + metà * 0.5, yVal, '', 'vn-reg-val vn-ir-cod-val', { 'text-anchor': 'middle' });
      R.irOpVal = txt(R.irOpG, G.ir.x + metà * 1.5, yVal, '', 'vn-reg-val', { 'text-anchor': 'middle' });

      R.a = registro(G.a, 'A');
      if (G.largo) {
        R.aVal = txt(R.a, G.a.x + G.a.w / 2 + 10, G.a.y + G.a.h - 12, '', 'vn-reg-val', { 'text-anchor': 'middle' });
        R.aDec = txt(R.a, G.a.x + G.a.w - 10, G.a.y + 20, '', 'vn-reg-dec', { 'text-anchor': 'end' });
      } else {
        R.aVal = txt(R.a, G.a.x + 102, G.a.y + G.a.h / 2 + 5, '', 'vn-reg-val', { 'text-anchor': 'middle' });
        R.aDec = txt(R.a, G.a.x + G.a.w - 8, G.a.y + G.a.h / 2 + 4.5, '', 'vn-reg-dec', { 'text-anchor': 'end' });
      }

      R.alu = add(U, 'g', { class: 'vn-reg vn-alu' });
      rett(R.alu, G.alu, 'vn-box vn-alu-box', 8);
      add(R.alu, 'rect', { x: G.alu.x, y: G.alu.y, width: G.alu.w, height: G.alu.h, rx: 8, class: 'vn-alone' });
      txt(R.alu, G.aluTesto[0], G.aluTesto[1], 'ALU', 'vn-etich vn-alu-tit');
      R.aluOp = txt(R.alu, G.aluOp[0], G.aluOp[1], '', 'vn-alu-op', { 'text-anchor': 'middle' });
      G.flag.forEach((f) => {
        const gf = add(U, 'g', { class: 'vn-flag' });
        add(gf, 'circle', { cx: f.led[0], cy: f.led[1], r: G.largo ? 6 : 5 });
        txt(gf, f.lettera[0], f.lettera[1], f.id.toUpperCase(), 'vn-flag-lettera', { 'text-anchor': f.fine ? 'end' : 'start' });
        R.flag[f.id] = gf;
      });

      if (G.mux) {
        const m = G.mux;
        add(U, 'polygon', {
          class: 'vn-mux',
          points: [[m.x - m.wTop / 2, m.y], [m.x + m.wTop / 2, m.y], [m.x + m.wBot / 2, m.y + m.h], [m.x - m.wBot / 2, m.y + m.h]].map((p) => p.join(',')).join(' '),
        });
      }
      G.blocchi.forEach((b) => {
        const gd = add(U, 'g', { class: 'vn-dec' });
        rett(gd, b.decBox, '', 5);
        txt(gd, b.dec, b.decBox.y + b.decBox.h / 2 + G.fs.etich * 0.36, 'DEC', '', { 'text-anchor': 'middle' });
        R.dec[b.id] = gd;
      });

      if (G.pannello) {
        const pn = G.pannello;
        R.clock = add(U, 'circle', { cx: pn.x + 16, cy: pn.y + 19, r: 5, class: 'vn-clock' });
        txt(U, pn.x + 28, pn.y + 23, 'CLOCK', 'vn-etich');
        R.infoCicli = txt(U, pn.x + 12, pn.y + 50, '', 'vn-info');
        R.infoIstr = txt(U, pn.x + pn.w - 10, pn.y + 50, '', 'vn-info', { 'text-anchor': 'end' });
      }
    }

    function disegnaBlocco(b) {
      const U = R.strati.unita;
      const alto = b.ch >= 50;
      R.celle[b.id] = b.celle.map((c) => {
        const g = add(U, 'g', { class: 'vn-cella' });
        rett(g, c, 'vn-cella-fondo', 6);
        add(g, 'rect', { x: r1(c.x), y: r1(c.y + 4), width: 3, height: r1(c.h - 8), rx: 1.5, class: 'vn-pc-segno' });
        const cella = { g: g };
        if (alto) {
          cella.ind = txt(g, c.x + 8, c.y + 19, '', 'vn-ind');
          cella.int = txt(g, c.x + 30, c.y + 19, '', 'vn-int');
          cella.val = txt(g, c.x + c.w / 2, c.y + c.h - (c.h > 58 ? 15 : 11), '', 'vn-val', { 'text-anchor': 'middle' });
          cella.usoI = add(g, 'circle', { cx: r1(c.x + c.w - 17), cy: r1(c.y + 14), r: 3.2, class: 'vn-uso i' });
          cella.usoD = add(g, 'circle', { cx: r1(c.x + c.w - 8), cy: r1(c.y + 14), r: 3.2, class: 'vn-uso d' });
        } else {
          cella.val = txt(g, c.x + c.w / 2, c.y + 17, '', 'vn-val', { 'text-anchor': 'middle' });
          cella.ind = txt(g, c.x + 6, c.y + c.h - 7, '', 'vn-ind');
          cella.int = txt(g, c.x + c.w - 5, c.y + c.h - 7, '', 'vn-int', { 'text-anchor': 'end' });
          cella.usoI = add(g, 'circle', { cx: r1(c.x + c.w - 6), cy: r1(c.y + 5.5), r: 2.4, class: 'vn-uso i' });
          cella.usoD = add(g, 'circle', { cx: r1(c.x + c.w - 13), cy: r1(c.y + 5.5), r: 2.4, class: 'vn-uso d' });
        }
        cella.tsA = add(cella.val, 'tspan', {});
        cella.tsB = add(cella.val, 'tspan', { class: 'vn-nib2' });
        return cella;
      });
    }

    function cifra7(par, x, y, w, hh) {
      const t = w * 0.2;
      const q = t * 0.3;
      const m = y + hh / 2;
      const S = {
        a: [[x + q, y], [x + w - q, y], [x + w - q - t, y + t], [x + q + t, y + t]],
        b: [[x + w, y + q], [x + w, m - q], [x + w - t, m - q - t / 2], [x + w - t, y + q + t]],
        c: [[x + w, m + q], [x + w, y + hh - q], [x + w - t, y + hh - q - t], [x + w - t, m + q + t / 2]],
        d: [[x + q + t, y + hh - t], [x + w - q - t, y + hh - t], [x + w - q, y + hh], [x + q, y + hh]],
        e: [[x, m + q], [x + t, m + q + t / 2], [x + t, y + hh - q - t], [x, y + hh - q]],
        f: [[x, y + q], [x + t, y + q + t], [x + t, m - q - t / 2], [x, m - q]],
        g: [[x + q + t / 2, m], [x + q + t, m - t / 2], [x + w - q - t, m - t / 2], [x + w - q - t / 2, m], [x + w - q - t, m + t / 2], [x + q + t, m + t / 2]],
      };
      const gd = add(par, 'g', { class: 'vn-cifra' });
      const segs = {};
      Object.keys(S).forEach((k) => { segs[k] = add(gd, 'polygon', { class: 'vn-seg', points: S[k].map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ') }); });
      return segs;
    }

    function disegnaUscita() {
      const U = R.strati.unita;
      txt(U, G.outTesto[0], G.outTesto[1], 'USCITA', 'vn-etich');
      const c = G.cifra;
      R.display = add(U, 'g', { class: 'vn-display' });
      R.cifre = [0, 1, 2].map((k) => cifra7(R.display, c.x + k * (c.w + c.gap), c.y, c.w, c.h));
      if (G.storia.etich) txt(U, G.storia.etich[0], G.storia.etich[1], 'ultime uscite', 'vn-mem-sotto');
      R.storia = G.storia.righe.map((y) => txt(U, G.storia.x, y, '', 'vn-storia'));
    }

    function costruisciPulsanti() {
      overlay.replaceChildren();
      R.btn = {};
      G.blocchi.forEach((b) => {
        if (ui.fuoco[b.id] == null) ui.fuoco[b.id] = 0;
        R.btn[b.id] = b.celle.map((c, i) => {
          const bt = h('button', {
            type: 'button', class: 'vn-cella-btn', tabindex: i === ui.fuoco[b.id] ? '0' : '-1',
            style: { left: pct(c.x - 1, G.W), top: pct(c.y - b.gy / 2, G.Ht), width: pct(c.w + 2, G.W), height: pct(c.h + b.gy, G.Ht) },
            onclick: () => apriEditor(b.id, i),
            onkeydown: (e) => naviga(e, b, i),
            onfocus: () => { ui.fuoco[b.id] = i; R.btn[b.id].forEach((x, j) => x.setAttribute('tabindex', j === i ? '0' : '-1')); },
          });
          overlay.append(bt);
          return bt;
        });
      });
    }

    function naviga(e, b, i) {
      const col = b.col;
      let j = null;
      if (e.key === 'ArrowRight') j = Math.min(15, i + 1);
      else if (e.key === 'ArrowLeft') j = Math.max(0, i - 1);
      else if (e.key === 'ArrowDown') j = Math.min(15, i + col);
      else if (e.key === 'ArrowUp') j = Math.max(0, i - col);
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = 15;
      if (j == null) return;
      e.preventDefault();
      R.btn[b.id][j].focus();
    }

    /* ---------- stato sullo schermo ---------- */

    function interpretazione(v, ruolo) {
      if (ruolo === 'dato') return ui.base === 'dec' ? 'dato' : '= ' + v;
      if (ruolo === 'istruzione') return M.disassembla(v);
      return v === 0 ? '' : '= ' + v;
    }

    // Il valore di una cella in due metà (codice e operando) in binario ed esadecimale.
    function scriviValore(c, v) {
      const testo = ui.base === 'dec' ? String(v) : M.formatta(v, ui.base, 8).replace(' ', '');
      const metà = ui.base === 'dec' ? testo.length : testo.length / 2;
      c.tsA.textContent = testo.slice(0, metà);
      c.tsB.textContent = testo.slice(metà);
      if (ui.base === 'bin') c.tsB.setAttribute('dx', G.largo ? '6' : '3');
      else c.tsB.removeAttribute('dx');
      c.val.classList.toggle('diviso', ui.base !== 'dec');
    }

    function render(prima) {
      if (!R || !ui.stato) return;
      const st = ui.stato;
      const anima = !!prima && !ctx.ridotto();
      // registri
      cambia(R.pcVal, fmt(st.pc, 4), anima);
      const d = M.decodifica(st.ir);
      cambia(R.irCodVal, fmt(d.codice, 4), anima);
      cambia(R.irOpVal, fmt(d.operando, 4), anima);
      cambia(R.aVal, fmt(st.a, 8), anima);
      R.aDec.textContent = ui.base === 'dec' ? '' : '= ' + st.a;
      R.flag.z.classList.toggle('on', st.z === 1);
      R.flag.c.classList.toggle('on', st.c === 1);
      R.aluOp.textContent = ui.aluTesto;
      // memorie
      const fetchId = G.H ? 'I' : 'U';
      G.blocchi.forEach((b) => {
        const mem = b.id === 'I' ? st.memI : st.mem;
        const memPrima = prima ? (b.id === 'I' ? prima.memI : prima.mem) : null;
        R.celle[b.id].forEach((c, i) => {
          const v = mem[i];
          const ruolo = ui.ruoli[i];
          scriviValore(c, v);
          c.ind.textContent = String(i);
          c.int.textContent = interpretazione(v, ruolo);
          c.g.classList.toggle('istruzione', ruolo === 'istruzione');
          c.g.classList.toggle('dato', ruolo === 'dato' || (ruolo == null && v !== 0));
          c.g.classList.toggle('vuota', ruolo == null && v === 0);
          c.g.classList.toggle('pc', b.id === fetchId && i === st.pc && !st.fermo);
          c.g.classList.toggle('corrente', b.id === fetchId && i === st.indIstr);
          c.g.classList.toggle('scelta', ed.aperto && ed.i === i);
          c.usoI.classList.toggle('on', b.id !== 'D' && !!((st.eseguite >> i) & 1));
          c.usoD.classList.toggle('on', b.id !== 'I' && !!((st.datiToccati >> i) & 1));
          if (memPrima && memPrima[i] !== v) riavvia(c.g, 'scritta');
          const nomeMem = b.id === 'I' ? ' della memoria istruzioni' : (b.id === 'D' ? ' della memoria dati' : '');
          const lettura = c.int.textContent;
          R.btn[b.id][i].setAttribute('aria-label', 'Cella ' + i + nomeMem + ': ' + M.nelTesto(v, ui.base, 8) +
            (lettura ? ', ' + (lettura.startsWith('= ') ? 'numero ' + v : lettura) : '') +
            (b.id === fetchId && i === st.pc ? ', indicata dal PC' : '') + '. Modifica');
        });
      });
      // uscita
      mostraUscita(st.uscita);
      const righe = righeUscite(st.uscite, R.storia.length, G.storia.limite);
      R.storia.forEach((t, k) => {
        const riga = righe[k] || '';
        if (G.largo) t.textContent = k === 0 && !righe.length ? '—' : riga;
        else t.textContent = 'uscite: ' + (riga || '—');
      });
      if (prima && prima.uscita !== st.uscita && anima) riavvia(R.display, 'vn-nuovo');
      // unità di controllo
      aggiornaFasi();
      aggiornaDecodifica();
      if (R.clock) R.clock.classList.toggle('fermo', st.fermo);
      if (R.infoCicli) { R.infoCicli.textContent = 'cicli ' + st.cicli; R.infoIstr.textContent = 'istr. ' + st.istruzioni; }
      conta.textContent = 'Cicli ' + st.cicli + ' · Istruzioni ' + st.istruzioni;
      if (prima) {
        if (prima.pc !== st.pc) riavvia(R.pc, 'lampo');
        if (prima.ir !== st.ir) riavvia(R.ir, 'lampo');
        if (prima.a !== st.a) riavvia(R.a, 'lampo');
        if (prima.cicli !== st.cicli && R.clock) riavvia(R.clock, 'lampo');
      }
      srStato.textContent = 'Stato: PC ' + st.pc + ', IR ' + M.disassembla(st.ir) + ', accumulatore ' + st.a + ', Z ' + st.z + ', C ' + st.c +
        ', uscita ' + (st.uscita == null ? 'vuota' : st.uscita) + ', ' + st.cicli + ' cicli, ' + st.istruzioni + ' istruzioni' + (st.fermo ? ', CPU ferma.' : '.');
      aggiornaPulsanti();
      aggiornaCursore();
    }

    function mostraUscita(v) {
      const testo = v == null ? '   ' : String(v).padStart(3, ' ');
      R.cifre.forEach((segs, k) => {
        const ch = testo[k];
        const accesi = ch === ' ' ? '' : SEGMENTI[Number(ch)];
        Object.keys(segs).forEach((sg) => segs[sg].classList.toggle('on', accesi.indexOf(sg) >= 0));
      });
    }

    function aggiornaFasi() {
      const p = ui.ultimo;
      const id = p ? p.id : null;
      const anticipo = !!p && p.eventi.some((e) => e.anticipo);
      const on = [id === 'P1' || id === 'P2' || anticipo, id === 'D', id === 'E1' || id === 'E2' || id === 'E'];
      R.pillole.forEach((pl, i) => pl.classList.toggle('on', on[i]));
      R.ir.classList.toggle('decod', id === 'D');
    }

    function aggiornaDecodifica() {
      const d = ui.decod;
      if (!d) {
        R.mnem.textContent = ui.stato.fermo ? 'FERMO' : '';
        R.rtl.textContent = ui.stato.fermo ? '' : (ui.ultimo && ui.ultimo.id === 'P2' ? 'da decodificare' : '');
      } else {
        R.mnem.textContent = d.definita ? M.disassembla(d.valore) : '???';
        R.rtl.textContent = M.rtl(d.valore);
      }
      Object.keys(R.chip).forEach((k) => R.chip[k].classList.toggle('on', !!d && d.definita && Number(k) === d.codice));
    }

    function aggiornaPulsanti() {
      const st = ui.stato;
      const fermo = !st || st.fermo;
      bMicro.disabled = fermo && !ui.occupato;
      bIstr.disabled = fermo && !ui.occupato;
      corriTesto.textContent = ui.corsa ? 'Pausa' : (fermo ? 'Da capo' : 'Esegui');
      const ic = ui.corsa ? 'pausa' : (fermo ? 'reset' : 'play');
      if (ic !== ui.icona) { ui.icona = ic; corriIcona.replaceChildren(icona(ic)); }
      nota.setAttribute('aria-live', ui.corsa ? 'off' : 'polite');
    }

    /* ---------- animazioni dei micro-passi ---------- */

    function T(ms) {
      if (ui.salto || ui.saltaIstr || ctx.ridotto()) return 0;
      const k = VELOCITA[ui.velocita].k;
      return k ? Math.round(ms * k) : 0;
    }

    function togli(tw) { const i = attivi.indexOf(tw); if (i >= 0) attivi.splice(i, 1); }

    // Un'attesa che si può saltare (salta) o annullare (annulla). Usa un timer e non tween():
    // con il movimento ridotto tween() finisce subito, mentre l'attesa tra i passi deve restare.
    function pausa(ms, ep) {
      if (ep !== ui.epoca) return Promise.resolve(false);
      if (!ms) return Promise.resolve(true);
      return new Promise((risolvi) => {
        let id = 0;
        const voce = {
          cancel() { clearTimeout(id); togli(voce); risolvi(ep === ui.epoca); },
        };
        id = setTimeout(() => { togli(voce); risolvi(ep === ui.epoca); }, ms);
        attivi.push(voce);
      });
    }

    function gettone(tipo, etichetta) {
      const fs = G.fs.gett;
      const w = Math.max(fs * 1.7, etichetta.length * fs * 0.62 + fs * 0.9);
      const hg = fs * 1.5;
      const g = s('g', { class: 'vn-gettone ' + tipo });
      g.append(s('rect', { x: r1(-w / 2), y: r1(-hg / 2), width: r1(w), height: r1(hg), rx: r1(hg / 2) }));
      const t = s('text', { x: 0, y: r1(fs * 0.36), 'text-anchor': 'middle' });
      t.textContent = etichetta;
      g.append(t);
      return g;
    }

    // Un gettone che viaggia lungo un percorso, lasciando dietro di sé la scia accesa.
    function viaggio(punti, tipo, etichetta, dur, ep) {
      if (ep !== ui.epoca) return Promise.resolve(false);
      const lun = lunghezze(punti);
      const L = lun[lun.length - 1] || 1;
      const d = dPath(punti);
      const alone = add(R.strati.scie, 'path', { d: d, class: 'vn-scia-alone ' + tipo });
      const scia = add(R.strati.scie, 'path', { d: d, class: 'vn-scia ' + tipo });
      tracce.push(alone, scia);
      if (!dur) {
        alone.classList.add('resto');
        scia.classList.add('resto');
        return Promise.resolve(ep === ui.epoca);
      }
      [alone, scia].forEach((p) => { p.style.strokeDasharray = L + ' ' + L; p.style.strokeDashoffset = String(L); });
      const tok = gettone(tipo, etichetta);
      tok.setAttribute('transform', 'translate(' + r1(punti[0][0]) + ' ' + r1(punti[0][1]) + ')');
      R.strati.gettoni.append(tok);
      const tw = ctx.tween({
        from: 0, to: 1, dur: dur, ease: 'inOut',
        update: (v) => {
          const p = puntoLungo(punti, lun, v);
          tok.setAttribute('transform', 'translate(' + r1(p[0]) + ' ' + r1(p[1]) + ')');
          const off = String(r1(L * (1 - v)));
          alone.style.strokeDashoffset = off;
          scia.style.strokeDashoffset = off;
        },
      });
      attivi.push(tw);
      return tw.finito.then((completo) => {
        togli(tw);
        [alone, scia].forEach((p) => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; p.classList.add('resto'); });
        if (completo && ep === ui.epoca) {
          const fine = ctx.tween({ from: 1, to: 0, dur: ctx.motion.dur.fast, update: (v) => { tok.style.opacity = String(v); }, done: () => tok.remove() });
          fine.finito.then((ok) => { if (!ok) tok.remove(); });
        } else tok.remove();
        return ep === ui.epoca;
      });
    }

    function salta() {
      ui.salto = true;
      attivi.slice().forEach((tw) => tw.cancel());
      attivi.length = 0;
    }

    function annulla() {
      ui.epoca += 1;
      salta();
      ui.salto = false;
      ui.saltaIstr = false;
      ui.occupato = false;
      pulisciEvidenze();
    }

    function pulisciEvidenze() {
      tracce.forEach((n) => n.remove());
      tracce.length = 0;
      if (!R) return;
      R.strati.gettoni.replaceChildren();
      Object.keys(R.dec).forEach((k) => R.dec[k].classList.remove('on'));
      Object.keys(R.ctrl).forEach((k) => R.ctrl[k].classList.remove('on'));
      G.blocchi.forEach((b) => R.celle[b.id].forEach((c) => c.g.classList.remove('sel', 'letta-istruzione', 'letta-dato')));
      ui.aluTesto = '';
      R.aluOp.textContent = '';
    }

    function lineaControllo(passo) {
      const c = passo.eventi.find((e) => e.tipo === 'controllo');
      if (c) return c.linea;
      if (passo.id === 'P2' && ui.modo === 'vn') return 'leggi';
      if (passo.id === 'E2') return passo.eventi.some((e) => e.tipo === 'scrivi') ? 'scrivi' : 'leggi';
      return null;
    }

    function cellaG(id, i) { return R.celle[id] && R.celle[id][i] ? R.celle[id][i].g : null; }
    function blocco(bus) { return bus === 'I' ? 'I' : (bus === 'D' ? 'D' : 'U'); }

    async function animaPasso(passo, ep) {
      pulisciEvidenze();
      const ev = (t) => passo.eventi.filter((e) => e.tipo === t);
      const lc = lineaControllo(passo);
      if (lc) R.ctrl[lc].classList.add('on');
      if (passo.id === 'P2') ui.decod = null;
      aggiornaFasi();
      aggiornaDecodifica();
      let ok = true;
      switch (passo.id) {
        case 'P1':
        case 'E1': {
          const viaggi = ev('indirizzo').map((e) => {
            const id = blocco(e.bus);
            const via = e.da === 'pc' ? G.viaPC(id) : G.viaOp(id);
            return viaggio(via, 'indirizzo', fmt(e.valore, 4), T(760), ep).then((arrivato) => {
              if (arrivato) {
                R.dec[id].classList.add('on');
                const c = cellaG(id, e.valore);
                if (c) c.classList.add('sel');
              }
              return arrivato;
            });
          });
          ok = (await Promise.all(viaggi)).every(Boolean);
          break;
        }
        case 'P2':
        case 'E2': {
          const viaggi = [];
          ev('leggi').forEach((e) => {
            const id = blocco(e.mem);
            const c = cellaG(id, e.indirizzo);
            if (c) c.classList.add('sel', 'letta-' + e.genere);
            viaggi.push(viaggio(G.viaDati(id, e.indirizzo, e.verso), e.genere, fmt(e.valore), T(e.anticipo ? 980 : 900), ep));
          });
          ev('scrivi').forEach((e) => {
            const id = blocco(e.mem);
            const c = cellaG(id, e.indirizzo);
            if (c) c.classList.add('sel');
            viaggi.push(viaggio(G.viaDati(id, e.indirizzo, 'a').slice().reverse(), 'dato', fmt(e.valore), T(900), ep));
          });
          const alu = ev('alu')[0];
          if (alu) viaggi.push(viaggio(G.p.aAlu, 'interno', fmt(alu.x), T(520), ep));
          ok = (await Promise.all(viaggi)).every(Boolean);
          if (ok && alu) {
            ui.aluTesto = alu.x + ' ' + alu.op + ' ' + alu.y + ' = ' + alu.risultato;
            R.aluOp.textContent = ui.aluTesto;
            riavvia(R.alu, 'lampo');
            ok = await pausa(T(420), ep);
            if (ok) ok = await viaggio(G.p.aluA, 'dato', fmt(alu.risultato), T(480), ep);
          }
          break;
        }
        case 'D': {
          const e = ev('decodifica')[0];
          ui.decod = { definita: e.definita, codice: e.codice, operando: e.operando, valore: (e.codice << 4) | e.operando };
          aggiornaDecodifica();
          if (R.chip[e.codice]) riavvia(R.chip[e.codice], 'lampo');
          ok = await pausa(T(560), ep);
          break;
        }
        case 'E': {
          const a = ev('a')[0];
          const salto = ev('salto')[0];
          const usc = ev('uscita')[0];
          if (a) ok = await viaggio(G.p.irA, 'interno', fmt(a.valore), T(640), ep);
          else if (salto) {
            if (salto.condizione) riavvia(R.flag[salto.condizione.toLowerCase()], 'lampo');
            ok = salto.preso ? await viaggio(G.p.irPc, 'indirizzo', fmt(salto.verso, 4), T(640), ep) : await pausa(T(520), ep);
          } else if (usc) ok = await viaggio(G.p.aOut, 'dato', fmt(usc.valore), T(640), ep);
          else ok = await pausa(T(420), ep);
          break;
        }
        default:
          ok = await pausa(T(200), ep);
      }
      if (ok && passo.eventi.some((e) => e.tipo === 'pc' && e.motivo === 'incremento')) riavvia(R.piu, 'lampo');
      return ok;
    }

    /* ---------- spiegazioni ---------- */

    function programmaCorrente() { return PROGRAMMI.find((p) => p.id === ui.prog) || PROGRAMMI[0]; }

    function testoPasso(passo) {
      let t = passo.testo;
      if (passo.eventi.some((e) => e.tipo === 'ferma') && ui.traffico && ui.traffico.vn.fermo && ui.traffico.h.fermo) {
        const vn = ui.traffico.vn.cicli;
        const hv = ui.traffico.h.cicli;
        if (ui.modo === 'vn') t += vn > hv ? ' Con l\'architettura Harvard lo stesso programma finirebbe in ' + hv + ' cicli: guarda il diagramma del bus qui sotto.' : ' In Harvard servirebbero gli stessi cicli: questo programma non legge né scrive dati in memoria.';
        else t += vn > hv ? ' Con un solo bus, in von Neumann, ne servirebbero ' + vn + '.' : '';
      }
      return t;
    }

    function mostraIntro() {
      const p = programmaCorrente();
      let t = '<strong>Pronto.</strong> ';
      t += ui.prog === 'vuota' ? 'La memoria è vuota: tocca una cella per scriverci un\'istruzione o un numero.' : 'Il programma «' + p.nome + '» è in memoria.';
      t += ' Il contatore di programma vale 0: la prima istruzione arriverà dalla cella 0. Premi «Micro-passo» per seguire il ciclo un passo alla volta, «Istruzione» per un\'istruzione intera, oppure «Esegui».';
      if (ui.modo === 'harvard') t += ' In modalità Harvard il programma è stato copiato in due memorie: le istruzioni si prelevano da una, i dati si leggono e scrivono nell\'altra.';
      nota.innerHTML = t;
      fase.textContent = 'Pronto · PC = 0';
    }

    /* ---------- comandi ---------- */

    async function eseguiMicro() {
      if (!ui.stato || ui.stato.fermo || ui.occupato) return false;
      const ep = ui.epoca;
      ui.occupato = true;
      aggiornaPulsanti();
      const prima = ui.stato;
      const r = M.microPasso(prima, { base: ui.base });
      ui.prima = prima;
      ui.ultimo = r.passo;
      ui.prossimo = r.stato;
      nota.innerHTML = testoPasso(r.passo);
      fase.textContent = M.riassunto(r.passo);
      const ok = await animaPasso(r.passo, ep);
      if (ep !== ui.epoca) return false;
      ui.stato = ui.prossimo;
      ui.prossimo = null;
      ui.occupato = false;
      ui.salto = false;
      render(prima);
      return ok;
    }

    function passoManuale() {
      if (ui.corsa) { ui.corsa = false; aggiornaPulsanti(); return; }
      if (ui.occupato) { salta(); return; }
      eseguiMicro();
    }

    async function istruzioneManuale() {
      if (ui.corsa) { ui.corsa = false; aggiornaPulsanti(); return; }
      if (ui.occupato) { ui.saltaIstr = ui.inIstruzione; salta(); return; }
      ui.inIstruzione = true;
      const ep = ui.epoca;
      let ok = true;
      do { ok = await eseguiMicro(); } while (ok && ep === ui.epoca && !ui.corsa && ui.ultimo && !ui.ultimo.fineIstruzione && !ui.stato.fermo);
      ui.inIstruzione = false;
      ui.saltaIstr = false;
    }

    function pausaTra() {
      const k = VELOCITA[ui.velocita].k;
      if (!k) return 16;
      // senza animazioni ogni micro-passo resta fermo sullo schermo un po' più a lungo
      return ctx.ridotto() ? Math.round(650 * k) + 120 : Math.round(240 * k);
    }

    async function corri() {
      if (ui.corsa || !ui.stato || ui.stato.fermo) return;
      ui.corsa = true;
      const giro = ++ui.giro;
      aggiornaPulsanti();
      while (ui.corsa && giro === ui.giro && !ui.stato.fermo) {
        const ep = ui.epoca;
        if (ui.occupato) { await pausa(60, ep); if (ep !== ui.epoca) break; continue; }
        const ok = await eseguiMicro();
        if (!ok || ep !== ui.epoca) break;
        if (ui.ultimo.fineIstruzione && controllaGiro()) break;
        // in «turbo» un'istruzione intera per fotogramma: i micro-passi non hanno animazioni
        if (!VELOCITA[ui.velocita].k && !ui.ultimo.fineIstruzione) continue;
        if (!(await pausa(pausaTra(), ep))) break;
      }
      if (giro !== ui.giro) return;
      ui.corsa = false;
      aggiornaPulsanti();
      if (ui.stato.fermo && ui.ultimo) nota.innerHTML = testoPasso(ui.ultimo);
    }

    function controllaGiro() {
      if (ui.avvisato || ui.stato.istruzioni < LIMITE_GIRI) return false;
      ui.avvisato = true;
      ui.corsa = false;
      let t = '<strong>Pausa automatica.</strong> Dopo ' + LIMITE_GIRI + ' istruzioni il programma non ha ancora incontrato HLT: sta girando in tondo.';
      if (ui.prog === 'auto' && ui.modo === 'harvard') t += ' In Harvard l\'istruzione STA 0 scrive nella memoria dei dati, non in quella delle istruzioni: la prima istruzione resta LDA 12 e il programma somma 7 all\'infinito. È il prezzo della separazione.';
      else t += ' Puoi farlo ripartire con «Esegui», cambiare la memoria o ricominciare.';
      nota.innerHTML = t;
      fase.textContent = 'Pausa · il programma non si ferma';
      return true;
    }

    function alternaCorsa() {
      if (ui.corsa) { ui.corsa = false; aggiornaPulsanti(); return; }
      if (ui.stato.fermo) ricomincia();
      corri();
    }

    function ricomincia() {
      annulla();
      ui.corsa = false;
      ui.avvisato = false;
      ui.stato = M.nuovoStato(ui.immagine, ui.modo);
      ui.ultimo = null;
      ui.prima = null;
      ui.decod = null;
      render();
      mostraIntro();
    }

    function caricaProgramma(id) {
      const p = PROGRAMMI.find((x) => x.id === id) || PROGRAMMI[0];
      ui.prog = p.id;
      ui.immagine = p.memoria.slice();
      ui.ruoli = p.ruoli.slice();
      segProg.imposta(p.id);
      descr.innerHTML = '<strong>' + p.nome + '.</strong> ' + p.descrizione;
      chiudiEditor(false);
      calcolaTraffico();
      ricomincia();
    }

    function cambiaModo(m) {
      if (m === ui.modo) return;
      ui.modo = m;
      segModo.imposta(m);
      annulla();
      costruisci();
      disegnaTraffico();
      ricomincia();
    }

    function cambiaBase(b) {
      ui.base = b;
      segBase.imposta(b);
      render();
      if (ui.prima && ui.ultimo) nota.innerHTML = testoPasso(M.microPasso(ui.prima, { base: b }).passo);
      else if (!ui.ultimo) mostraIntro();
      if (ed.aperto) aggiornaEditor();
    }

    /* ---------- editor della memoria ---------- */

    function apriEditor(id, i) {
      if (ui.corsa) { ui.corsa = false; aggiornaPulsanti(); }
      const mem = id === 'I' ? ui.stato.memI : ui.stato.mem;
      const v = mem[i];
      ed.aperto = true;
      ed.blocco = id;
      ed.i = i;
      const d = M.decodifica(v);
      ed.modo = ui.ruoli[i] === 'dato' || (ui.ruoli[i] == null && v !== 0) || !d.definita ? 'numero' : 'istruzione';
      selIstr.value = String(d.definita ? d.codice : 0);
      inNum.value = String(v);
      riempiOperandi(d.definita ? d.istr : M.PER_CODICE[0]);
      selOp.value = String(d.operando);
      edTit.textContent = 'Cella ' + i + (G.H ? ' (in tutte e due le memorie)' : '');
      edAiuto.hidden = true;
      edForm.hidden = false;
      aggiornaEditor();
      render();
      (ed.modo === 'istruzione' ? selIstr : inNum).focus();
    }

    function chiudiEditor(ritorna) {
      const eraAperto = ed.aperto;
      ed.aperto = false;
      edForm.hidden = true;
      edAiuto.hidden = false;
      edTit.textContent = 'Modifica la memoria';
      if (!eraAperto) return;
      render();
      if (ritorna && R.btn[ed.blocco] && R.btn[ed.blocco][ed.i]) R.btn[ed.blocco][ed.i].focus();
    }

    function riempiOperandi(istr) {
      const prima = selOp.value;
      ed.opTipo = istr && istr.operando ? istr.operando : null;
      selOp.replaceChildren();
      if (!istr || !istr.operando) {
        selOp.append(h('option', { value: '0' }, '— (nessun operando)'));
        selOp.disabled = true;
        return;
      }
      selOp.disabled = false;
      for (let n = 0; n < 16; n++) selOp.append(h('option', { value: String(n) }, istr.operando === 'indirizzo' ? 'cella ' + n : 'numero ' + n));
      if (prima) selOp.value = prima;
    }

    function valoreEditor() {
      if (ed.modo === 'numero') {
        const n = Math.round(Number(inNum.value));
        return Number.isFinite(n) && n >= 0 && n <= 255 ? n : null;
      }
      const istr = M.PER_CODICE[Number(selIstr.value)];
      return M.codifica(istr.nome, istr.operando ? Number(selOp.value) || 0 : 0);
    }

    function aggiornaEditor() {
      segEd.imposta(ed.modo);
      campiIstr.hidden = ed.modo !== 'istruzione';
      campiNum.hidden = ed.modo !== 'numero';
      const istr = M.PER_CODICE[Number(selIstr.value)];
      if (ed.modo === 'istruzione' && ed.opTipo !== (istr.operando || null)) riempiOperandi(istr);
      const v = valoreEditor();
      bScrivi.disabled = v == null;
      if (v == null) { anteprima.textContent = 'Scrivi un numero intero da 0 a 255.'; return; }
      const d = M.disassembla(v);
      anteprima.textContent = 'Diventa ' + M.bin(v, 8) + ' · 0x' + M.hex(v) + ' · ' + v + (ed.modo === 'istruzione' ? ' → ' + d + ' (' + M.rtl(v) + ')' : (d !== '—' ? ' · come istruzione sarebbe ' + d : ''));
    }

    function scriviDaEditor() {
      const v = valoreEditor();
      if (v == null || !ed.aperto) return;
      const i = ed.i;
      ui.immagine[i] = v;
      ui.ruoli[i] = ed.modo === 'istruzione' ? 'istruzione' : 'dato';
      [ui.stato, ui.prossimo].forEach((st) => {
        if (!st) return;
        st.mem[i] = v;
        if (st.memI) st.memI[i] = v;
      });
      calcolaTraffico();
      render();
      const leggibile = ed.modo === 'istruzione' ? '«' + M.disassembla(v) + '» (' + M.bin(v, 8) + ')' : 'il numero ' + v + ' (' + M.bin(v, 8) + ')';
      nota.innerHTML = '<strong>Cella ' + i + '.</strong> Ora contiene ' + leggibile + '.' +
        (ui.stato.cicli > 0 ? ' La CPU riparte da dove si era fermata; premi «Ricomincia» per eseguire il programma dall\'inizio.' : ' Premi «Micro-passo» o «Esegui» per provarlo.');
      anteprima.textContent = 'Scritto. ' + anteprima.textContent.replace(/^Diventa /, 'Ora vale ');
    }

    /* ---------- traffico sui bus ---------- */

    function calcolaTraffico() {
      ui.traffico = {
        vn: M.traffico(ui.immagine, 'vn', { maxCicli: MAX_CICLI_GRAFICO }),
        h: M.traffico(ui.immagine, 'harvard', { maxCicli: MAX_CICLI_GRAFICO }),
      };
      disegnaTraffico();
    }

    function disegnaTraffico() {
      const t = ui.traffico;
      if (!t) return;
      const N = Math.max(t.vn.cicli, t.h.cicli, 1);
      const righe = [
        { modo: 'vn', nome: 'Von Neumann', sotto: 'il solo bus', dati: t.vn.bus.U, tot: t.vn },
        { modo: 'harvard', nome: 'Harvard', sotto: 'bus delle istruzioni', dati: t.h.bus.I, tot: t.h },
        { modo: 'harvard', nome: '', sotto: 'bus dei dati', dati: t.h.bus.D, tot: null },
      ];
      TR = { vn: [], harvard: [] };
      trRighe.replaceChildren.apply(trRighe, righe.map((r) => {
        const barra = h('div', { class: 'vn-tr-barra', style: { gridTemplateColumns: 'repeat(' + N + ', minmax(0, 1fr))' }, 'aria-hidden': 'true' });
        const slot = [];
        for (let i = 0; i < N; i++) {
          const v = r.dati[i];
          const sp = h('span', { class: i < r.dati.length ? (v || 'libero') : 'vuoto' });
          barra.append(sp);
          slot.push(sp);
        }
        TR[r.modo].push(slot);
        const tot = r.tot ? (r.tot.fermo ? ctx.formato(r.tot.cicli) + ' cicli' : 'non finisce') : '';
        return h('div', { class: 'vn-tr-riga', 'data-modo': r.modo },
          h('span', { class: 'vn-tr-nome' }, r.nome ? h('b', null, r.nome) : null, r.sotto),
          barra,
          h('span', { class: 'vn-tr-tot' }, tot));
      }));
      let sintesi;
      if (t.vn.fermo && t.h.fermo) {
        const diff = t.vn.cicli - t.h.cicli;
        sintesi = '<strong>Von Neumann ' + t.vn.cicli + ' cicli, Harvard ' + t.h.cicli + '.</strong> ' + (diff > 0
          ? 'Con un solo bus ogni lettura o scrittura di un dato ferma il prelievo delle istruzioni; con due bus ' + diff + ' prelievi avvengono mentre si lavora sui dati: il ' + Math.round(100 * diff / t.vn.cicli) + '% del tempo in meno.'
          : 'Questo programma non legge né scrive dati in memoria, quindi le due architetture impiegano lo stesso tempo.');
      } else if (t.vn.fermo) {
        sintesi = '<strong>In von Neumann il programma finisce in ' + t.vn.cicli + ' cicli; in Harvard non finisce mai.</strong> Il programma cambia una delle proprie istruzioni, ma in Harvard può scrivere solo nella memoria dei dati.';
      } else {
        sintesi = '<strong>Il programma non arriva mai a HLT.</strong> Il diagramma mostra soltanto i primi ' + MAX_CICLI_GRAFICO + ' cicli.';
      }
      trSintesi.innerHTML = sintesi;
      aggiornaCursore();
    }

    function aggiornaCursore() {
      if (!TR || !ui.stato) return;
      const c = ui.stato.cicli;
      trRighe.querySelectorAll('.vn-tr-riga').forEach((r) => r.classList.toggle('attiva', r.dataset.modo === ui.modo));
      ['vn', 'harvard'].forEach((m) => TR[m].forEach((slot) => slot.forEach((sp, i) => sp.classList.toggle('fatto', m === ui.modo && i < c))));
    }

    /* ---------- formato dello schema e ciclo di vita ---------- */

    function scegliFormato() {
      const w = el.clientWidth || (el.getBoundingClientRect ? el.getBoundingClientRect().width : 0) || 960;
      radice.classList.toggle('vn-medio', w >= SOGLIA_MEDIO && w < SOGLIA_LARGO);
      const formato = w >= SOGLIA_LARGO ? 'largo' : 'stretto';
      if (formato === ui.layout) return false;
      ui.layout = formato;
      return true;
    }

    let ro = null;
    let rafFormato = 0;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => {
        cancelAnimationFrame(rafFormato);
        rafFormato = requestAnimationFrame(() => {
          if (!scegliFormato()) return;
          if (ui.occupato) salta();
          costruisci();
          render();
        });
      });
    }

    scegliFormato();
    costruisci();
    segModo.imposta(ui.modo);
    segBase.imposta(ui.base);
    caricaProgramma('somma');
    if (ro) ro.observe(el);

    return {
      attiva() { if (ui.riprendi) { ui.riprendi = false; corri(); } },
      sospendi() { if (ui.corsa) { ui.riprendi = true; ui.corsa = false; aggiornaPulsanti(); } },
      distruggi() {
        ui.corsa = false;
        annulla();
        cancelAnimationFrame(rafFormato);
        if (ro) ro.disconnect();
      },
    };
  }

  /* =====================================================================
   * Il capitolo
   * ===================================================================== */

  P.registra({
    numero: 2,
    id: 'von-neumann',
    titolo: 'Il programma memorizzato: l\'architettura di von Neumann',
    breve: 'Von Neumann',
    periodo: '1945–oggi',
    colore: 'var(--era-2)',
    sommario: 'L\'idea che regge quasi tutti i computer: programma e dati nella stessa memoria, come numeri, e una CPU che ripete il ciclo prendi-decodifica-esegui.',
    intro: 'Nel 1945 una bozza di un centinaio di pagine propose un\'idea semplice e potentissima: mettere il programma nella stessa memoria dei dati, sotto forma di numeri. Da allora quasi ogni computer, dal gigante a valvole allo smartphone, funziona così: preleva un\'istruzione, la decodifica, la esegue e ricomincia. Vediamo da dove viene l\'idea, chi la mise in pratica per primo e quale prezzo si paga ancora oggi.',
    blocchi: [
      {
        tipo: 'testo',
        titolo: 'Il problema: un computer da ricablare',
        paragrafi: [
          'L\'ENIAC (Electronic Numerical Integrator and Computer), completato a Filadelfia alla fine del 1945, era velocissimo per l\'epoca: circa 5.000 somme al secondo. Ma per fargli cambiare lavoro bisognava ricollegare a mano decine di cavi e girare centinaia di commutatori, seguendo schemi preparati su carta. Il programma non era scritto da nessuna parte dentro la macchina: era la forma stessa dei collegamenti. Preparare e controllare un nuovo problema poteva richiedere giorni, mentre il calcolo durava minuti.',
          'Il limite era chiaro anche ai suoi progettisti, J. Presper Eckert e John Mauchly, e al gruppo della Moore School dell\'Università della Pennsylvania. L\'ENIAC aveva pochissima memoria: venti accumulatori, ciascuno capace di tenere un numero di dieci cifre. Non c\'era posto per le istruzioni, e leggerle da un nastro di carta avrebbe costretto le valvole, rapidissime, ad aspettare un meccanismo lento. Già nel 1944, con l\'ENIAC ancora in costruzione, il gruppo progettava il successore: l\'EDVAC (Electronic Discrete Variable Automatic Computer).',
          'Sul piano teorico la risposta esisteva dal 1936. In un articolo sui limiti della matematica, il giovane inglese Alan Turing aveva descritto una macchina immaginaria che legge e scrive simboli su un nastro, seguendo una tabella di regole. Poi aveva dimostrato che esiste una macchina <strong>universale</strong>: se sul suo nastro scrivi la descrizione di un\'altra macchina, lei ne imita il lavoro. Le istruzioni, dunque, possono stare sullo stesso nastro dei dati ed essere lette come dati. Dieci anni dopo quell\'idea sarebbe diventata il computer a programma memorizzato.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Il «First Draft»: le istruzioni diventano numeri',
        paragrafi: [
          'Nell\'estate del 1944 il matematico ungherese-americano John von Neumann, consulente del progetto della bomba atomica a Los Alamos, si unì alle discussioni della Moore School. Il 30 giugno 1945 Herman Goldstine, l\'ufficiale che seguiva il progetto per l\'esercito, fece circolare un suo dattiloscritto di 101 pagine, rimasto incompiuto: il <em>First Draft of a Report on the EDVAC</em>, la prima bozza di una relazione sull\'EDVAC. Descriveva la macchina in modo astratto, senza parlare di valvole o di fili, come un insieme di organi con compiti precisi.',
          'Gli organi erano cinque: un\'<strong>unità aritmetica</strong> che esegue i calcoli, un\'<strong>unità di controllo</strong> che fa eseguire le istruzioni nell\'ordine giusto, una <strong>memoria</strong>, un organo di <strong>ingresso</strong> e uno di <strong>uscita</strong> per comunicare con il mondo esterno. Il punto decisivo stava nella memoria: avrebbe contenuto sia i numeri su cui lavorare sia le istruzioni, codificate anch\'esse come numeri binari. Per la macchina un\'istruzione è un numero come gli altri; diventa un ordine solo quando l\'unità di controllo la preleva per eseguirla.',
          'Le conseguenze sono enormi. Cambiare programma significa scrivere altri numeri in memoria, senza toccare un cavo. Un programma può produrre un altro programma, come fanno oggi i compilatori, o caricarlo da un disco, come fa il sistema operativo quando apri un\'applicazione. Può persino modificare le proprie istruzioni mentre lavora: i primi programmatori lo facevano spesso, per esempio per scorrere una tabella cambiando l\'indirizzo scritto dentro un\'istruzione.',
          'Il documento portava solo il nome di von Neumann, ed è per questo che si parla di <strong>architettura di von Neumann</strong>. Eckert e Mauchly, che da tempo pensavano di conservare il programma in memoria, se ne sentirono derubati; per di più la bozza, diffusa liberamente, fu considerata una pubblicazione e l\'idea non si poté più brevettare. Oggi gli storici la vedono come il frutto di un lavoro di gruppo, con Goldstine, Arthur Burks e altri, e ricordano che in Inghilterra anche Turing progettò fra il 1945 e il 1946 una macchina a programma memorizzato, l\'ACE (Automatic Computing Engine). Molti preferiscono quindi dire semplicemente «architettura a programma memorizzato».',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraSchema,
        alt: 'Schema a blocchi della macchina di von Neumann: la CPU, con unità di controllo, unità aritmetica e logica e registri, e la memoria, che contiene istruzioni e dati mescolati, sono collegate a un unico bus; allo stesso bus si collegano un lettore di nastro perforato per l\'ingresso e uno schermo per l\'uscita.',
        didascalia: '<strong>La macchina di von Neumann.</strong> I cinque organi del <em>First Draft</em>: unità di controllo e unità aritmetica e logica (che insieme formano la CPU), memoria, ingresso e uscita, collegati da un bus. In memoria le istruzioni (in azzurro) e i dati (in verde) sono numeri dello stesso tipo, in celle dello stesso tipo.',
        larga: true,
      },
      {
        tipo: 'testo',
        titolo: '1948–1951: dalla carta alle macchine',
        paragrafi: [
          'Il primo computer a eseguire un programma conservato nella propria memoria elettronica nacque all\'Università di Manchester, costruito da Frederic Williams e Tom Kilburn con Geoff Tootill. La Small-Scale Experimental Machine (SSEM), soprannominata <strong>Baby</strong>, doveva soprattutto collaudare una memoria nuova: il tubo di Williams, un tubo a raggi catodici che conservava i bit come puntini di carica elettrica sullo schermo. Il 21 giugno 1948 eseguì il suo primo programma, scritto da Kilburn: 17 istruzioni che cercavano il più grande divisore proprio di 2<sup>18</sup> (262.144), provando tutti i numeri a scendere. Dopo 52 minuti e circa 3,5 milioni di operazioni trovò la risposta giusta: 131.072.',
          'Il Baby era un banco di prova, con 32 parole di memoria e appena sette istruzioni. La prima macchina pensata per lavorare davvero fu l\'<strong>EDSAC</strong> (Electronic Delay Storage Automatic Calculator) dell\'Università di Cambridge, guidata da Maurice Wilkes, che nell\'estate del 1946 aveva seguito a Filadelfia le lezioni della Moore School. Il 6 maggio 1949 l\'EDSAC calcolò una tabella dei quadrati; presto offrì un servizio di calcolo regolare agli scienziati dell\'università, primo computer a programma memorizzato a farlo. La sua memoria erano linee di ritardo a mercurio: tubi in cui i bit viaggiavano in circolo come impulsi sonori.',
          'A Cambridge nacque anche il mestiere del programmatore. David Wheeler inventò un modo per usare lo stesso pezzo di programma da più punti e poi tornare indietro: la <strong>subroutine</strong> (sottoprogramma). Le subroutine più utili, per le radici quadrate o per stampare i numeri, finirono in una biblioteca su nastro perforato, e nel 1951 Wilkes, Wheeler e Stanley Gill le descrissero in quello che è considerato il primo manuale di programmazione. Una subroutine ha senso solo con il programma memorizzato: funziona perché il programma può saltare da un punto all\'altro della memoria e ricordarsi dove tornare.',
          'E l\'EDVAC? Nel 1946 Eckert e Mauchly avevano lasciato la Moore School per fondare la loro azienda, e la macchina fu consegnata al poligono dell\'esercito di Aberdeen, nel Maryland, solo nel 1949. Lavorò regolarmente dal 1951, quando ormai altre l\'avevano superata. Intanto von Neumann guidava a Princeton la costruzione della macchina dell\'IAS (Institute for Advanced Study), i cui progetti, distribuiti a università e laboratori, diedero vita a una famiglia di «cugine» in mezzo mondo.',
        ],
      },
      {
        tipo: 'numeri',
        items: [
          { valore: 101, unita: 'pagine', etichetta: 'il <em>First Draft</em> del 30 giugno 1945, rimasto una bozza incompiuta' },
          { valore: 1024, unita: 'bit', etichetta: 'tutta la memoria del Manchester Baby: 32 parole da 32 bit su un tubo a raggi catodici' },
          { valore: 7, unita: 'istruzioni', etichetta: 'il repertorio completo del Baby: sapeva sottrarre, ma non sommare' },
          { valore: 52, unita: 'minuti', etichetta: 'la durata del primo programma memorizzato, il 21 giugno 1948' },
        ],
      },
      {
        tipo: 'nota',
        testo: 'Sul Manchester Baby la memoria si poteva guardare. Ogni bit era un puntino o un trattino di carica elettrica sullo schermo di un tubo a raggi catodici, simile a quello dei vecchi televisori, e un tubo di controllo sul pannello ne mostrava l\'immagine. Gli operatori leggevano il contenuto della memoria a occhio, riga per riga, e vedevano il programma cambiare mentre lavorava.',
      },
      {
        tipo: 'testo',
        titolo: 'Prendi, decodifica, esegui',
        paragrafi: [
          'Dentro una macchina di von Neumann il lavoro si ripete sempre uguale, al ritmo di un orologio elettronico, il <strong>clock</strong>. Un registro speciale, il <strong>contatore di programma</strong> (PC, <em>program counter</em>), contiene l\'indirizzo della prossima istruzione. Nella fase di <strong>prelievo</strong> (<em>fetch</em>) quel numero viaggia sul bus indirizzi, un fascio di fili che collega la CPU alla memoria; la memoria risponde mettendo il contenuto della cella sul bus dati, e l\'istruzione entra nel <strong>registro istruzione</strong> (IR, <em>instruction register</em>). Il PC aumenta di uno e punta già all\'istruzione successiva.',
          'Poi viene la <strong>decodifica</strong> (<em>decode</em>): l\'unità di controllo guarda i bit dell\'istruzione e riconosce che cosa chiedono, per esempio «somma all\'accumulatore il numero della cella 15». L\'<strong>accumulatore</strong> è il registro in cui l\'unità aritmetica e logica (ALU, <em>arithmetic logic unit</em>) tiene il risultato dei calcoli. Infine c\'è l\'<strong>esecuzione</strong> (<em>execute</em>): i dati si spostano, l\'ALU calcola, un risultato finisce in un registro o in memoria. E il ciclo ricomincia, miliardi di volte al secondo in un processore di oggi.',
          'Alcune istruzioni scrivono un nuovo indirizzo nel contatore di programma: sono i <strong>salti</strong>. Con un salto il programma può tornare indietro e ripetere un gruppo di istruzioni, cioè fare un ciclo, oppure scegliere fra due strade, per esempio saltando solo se l\'ultimo risultato era zero. Con questi pochi ingredienti, dato abbastanza tempo e abbastanza memoria, si può calcolare tutto ciò che è calcolabile.',
          'Viste da vicino, le istruzioni sono soltanto numeri: il <strong>linguaggio macchina</strong>. Nel computer in miniatura del laboratorio qui sotto ogni istruzione occupa 8 bit, 4 per il codice dell\'operazione e 4 per l\'operando, e il numero 0010 1111 significa «ADD 15». Scrivere programmi in binario era faticoso e pieno di errori, così presto arrivarono sigle facili da ricordare, come LDA o ADD, e programmi che le traducono in numeri: il linguaggio <strong>assembly</strong>, primo gradino della storia del software raccontata nella sezione 7.',
        ],
      },
      { tipo: 'lab' },
      {
        tipo: 'testo',
        titolo: 'Una memoria o due? Von Neumann e Harvard',
        paragrafi: [
          'C\'era anche un\'altra strada. L\'Harvard Mark I, il grande calcolatore elettromeccanico costruito da IBM su progetto di Howard Aiken e messo in funzione all\'Università di Harvard nel 1944, leggeva le istruzioni da un nastro di carta perforata, mentre i numeri stavano in registri meccanici separati. Istruzioni e dati viaggiavano su strade diverse e non potevano mescolarsi. Da qui il nome di <strong>architettura Harvard</strong> per ogni macchina con una memoria per il programma e una per i dati, ciascuna con il proprio bus.',
          'Il vantaggio è la velocità: con due bus la CPU può prelevare l\'istruzione successiva mentre legge o scrive un dato. Lo svantaggio è la rigidità: lo spazio per il programma e quello per i dati sono fissati in partenza, e in una macchina Harvard «pura» un programma non può scrivere nella memoria delle istruzioni. Per questo l\'architettura Harvard vive soprattutto dove il programma cambia di rado, come nei microcontrollori: l\'ATmega328P della scheda Arduino Uno tiene il programma in 32 kilobyte di memoria flash, che non si cancella togliendo la corrente, e i dati in 2 kilobyte di RAM (memoria ad accesso casuale), su bus separati.',
          'I PC hanno trovato un compromesso. Verso l\'esterno sono macchine di von Neumann: una sola memoria principale, dove il sistema operativo carica programmi e dati come vuole. Dentro il processore, invece, la memoria più vicina e più veloce, la <strong>cache</strong> di primo livello, è divisa in due parti, una per le istruzioni e una per i dati. Nei processori Intel per PC la divisione arrivò con il Pentium del 1993: 8 kilobyte per le istruzioni e 8 per i dati. È la cosiddetta architettura <strong>Harvard modificata</strong>, che prende il meglio dei due mondi.',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraConfronto,
        alt: 'Confronto fra due schemi. A sinistra, von Neumann: una CPU collegata a un\'unica memoria da un solo bus, su cui istruzioni e dati fanno la fila. A destra, Harvard: la CPU è collegata a una memoria per le istruzioni e a una per i dati con due bus separati, percorsi nello stesso momento.',
        didascalia: '<strong>Una strada o due.</strong> Con un solo bus (a sinistra) istruzioni e dati si alternano, e chi arriva dopo aspetta: è il collo di bottiglia di von Neumann. Con due memorie e due bus (a destra) la CPU può prelevare un\'istruzione mentre legge un dato, ma lo spazio per il programma e quello per i dati restano separati.',
      },
      {
        tipo: 'testo',
        titolo: 'Il collo di bottiglia',
        paragrafi: [
          'In una macchina di von Neumann tutto passa per lo stesso canale: ogni istruzione e ogni dato devono attraversare il collegamento fra processore e memoria, e mentre il canale porta un\'istruzione i dati aspettano, e viceversa. Nel 1977 John Backus, che negli anni Cinquanta aveva guidato la creazione del linguaggio FORTRAN, ricevette il premio Turing e nella sua lezione chiamò quel canale <strong>collo di bottiglia di von Neumann</strong>. Per lui il limite era tecnico ma anche mentale: costringeva i programmatori a pensare una parola alla volta.',
          'Con gli anni il problema è peggiorato. I processori sono diventati migliaia di volte più veloci, mentre il tempo per leggere una cella della memoria principale si è ridotto molto meno: oggi una lettura dalla RAM può costare al processore centinaia di cicli di clock di attesa. Gli ingegneri lo chiamano «muro della memoria» (<em>memory wall</em>).',
          'Quasi ogni trucco dei computer moderni serve ad allargare il collo di bottiglia o ad aggirarlo: le cache, che tengono vicino al processore i dati usati da poco; i bus più larghi, che portano molti byte per volta; il prelievo anticipato delle istruzioni; la pipeline, che lavora su più istruzioni insieme. Li incontrerai nei capitoli sulla memoria e sulle prestazioni. Eppure nessuno ha abbandonato l\'idea del 1945: avere programmi che sono dati, da caricare, copiare e creare al volo, vale molto più dei cicli che costa.',
        ],
      },
      {
        tipo: 'citazione',
        testo: 'Di sicuro deve esistere un modo meno primitivo di fare grandi cambiamenti nella memoria che spingere avanti e indietro enormi quantità di parole attraverso il collo di bottiglia di von Neumann.',
        autore: 'John Backus',
        fonte: 'lezione per il premio Turing, 1977 (pubblicata nel 1978; traduzione)',
      },
      {
        tipo: 'italia',
        titolo: 'Da Milano a Pisa, e fino a Ivrea',
        paragrafi: [
          'Il programma memorizzato arrivò in Italia nel 1954, quando il Politecnico di Milano installò un calcolatore americano CRC 102A, comprato con i fondi del piano Marshall. Il giovane ingegnere Luigi Dadda era andato in California a seguirne la costruzione e il collaudo: programma e dati stavano sullo stesso tamburo magnetico, 1.024 parole da 42 bit. Fu il primo calcolatore elettronico in funzione nel nostro Paese.',
          'Pochi anni dopo l\'Italia costruì i suoi: a Pisa, su consiglio di Enrico Fermi, nacque la Calcolatrice Elettronica Pisana (CEP), mentre a Ivrea l\'Olivetti presentò nel 1959 l\'Elea 9003, progettata dal gruppo di Mario Tchou. E proprio da Ivrea, nel 2005, è partita la scheda Arduino: il suo microcontrollore segue l\'architettura Harvard, con programma e dati in memorie separate.',
        ],
      },
      {
        tipo: 'schede',
        titolo: 'Date, macchine, persone',
        items: [
          { anno: 1936, nome: 'La macchina universale di Turing', luogo: 'Cambridge, Regno Unito', testo: 'Alan Turing descrive una macchina teorica che, leggendo dal nastro la descrizione di un\'altra macchina, ne imita il lavoro: istruzioni e dati sullo stesso nastro.' },
          { anno: 1944, nome: 'Harvard Mark I', luogo: 'Università di Harvard, Stati Uniti', testo: 'Il calcolatore elettromeccanico di Howard Aiken e IBM legge le istruzioni da un nastro perforato e tiene i numeri altrove: darà il nome all\'architettura Harvard.' },
          { anno: 1945, nome: 'First Draft of a Report on the EDVAC', luogo: 'Moore School, Filadelfia', testo: 'Il 30 giugno circola la bozza di John von Neumann: cinque organi e una sola memoria per istruzioni e dati.' },
          { anno: 1946, nome: 'Le lezioni della Moore School', luogo: 'Filadelfia, Stati Uniti', testo: 'In estate un corso di otto settimane spiega a studiosi americani e inglesi come si costruisce un calcolatore elettronico. Fra gli ascoltatori c\'è Maurice Wilkes.' },
          { anno: 1948, nome: 'Manchester Baby', luogo: 'Università di Manchester, Regno Unito', testo: 'Il 21 giugno la SSEM di Williams e Kilburn esegue il primo programma conservato in una memoria elettronica: 52 minuti per trovare il più grande divisore proprio di 2<sup>18</sup>.' },
          { anno: 1949, nome: 'EDSAC', luogo: 'Università di Cambridge, Regno Unito', testo: 'Il 6 maggio la macchina di Maurice Wilkes calcola una tabella dei quadrati. È il primo computer a programma memorizzato a offrire un servizio regolare; qui nascono le subroutine.' },
          { anno: 1951, nome: 'L\'EDVAC al lavoro', luogo: 'Aberdeen, Maryland, Stati Uniti', testo: 'Consegnata all\'esercito nel 1949, la macchina che aveva dato il nome alla bozza di von Neumann comincia a lavorare regolarmente.' },
          { anno: 1954, nome: 'Il CRC 102A al Politecnico di Milano', luogo: 'Milano', italia: true, testo: 'Arriva il primo calcolatore elettronico in funzione in Italia, con programma e dati sullo stesso tamburo magnetico. Luigi Dadda ne aveva seguito la costruzione in California.' },
          { anno: 1977, nome: 'Il «collo di bottiglia di von Neumann»', luogo: 'Premio Turing, Stati Uniti', testo: 'John Backus dà un nome al limite del canale fra processore e memoria, e propone uno stile di programmazione che lo eviti.' },
          { anno: 1993, nome: 'Pentium: la cache si divide in due', luogo: 'Intel, Stati Uniti', testo: 'La cache di primo livello ha 8 kilobyte per le istruzioni e 8 per i dati: dentro il processore il PC diventa un po\' Harvard.' },
          { anno: 2005, nome: 'Arduino', luogo: 'Ivrea', italia: true, testo: 'Nasce una scheda didattica con un microcontrollore ad architettura Harvard: il programma sta nella memoria flash, i dati in una piccola RAM separata.' },
        ],
      },
    ],
    lab: {
      titolo: 'Un computer in miniatura',
      sottotitolo: '16 celle di memoria, un accumulatore e il ciclo prendi-decodifica-esegui, un micro-passo alla volta',
      crea: creaLaboratorio,
    },
    punti: [
      'Un computer a programma memorizzato tiene istruzioni e dati nella stessa memoria, entrambi come numeri: per cambiare programma si scrivono altri numeri, non si ricollegano cavi.',
      'Il <em>First Draft</em> di von Neumann (30 giugno 1945) descrisse cinque organi: unità aritmetica, unità di controllo, memoria, ingresso e uscita. L\'idea nacque però da un lavoro di gruppo.',
      'Il primo programma memorizzato girò sul Manchester Baby il 21 giugno 1948; l\'EDSAC di Cambridge, dal 6 maggio 1949, fu il primo a offrire un servizio regolare.',
      'La CPU ripete il ciclo prendi-decodifica-esegui: il contatore di programma indica l\'istruzione, il registro istruzione la conserva, l\'ALU calcola, i salti cambiano strada.',
      'L\'architettura Harvard separa memoria e bus delle istruzioni da quelli dei dati: è più veloce ma più rigida, e vive nei microcontrollori e nelle cache di primo livello dei processori.',
      'Il collo di bottiglia di von Neumann, il canale unico fra processore e memoria, è il motivo per cui esistono cache, prelievo anticipato e bus sempre più larghi.',
    ],
    collegamenti: [
      { testo: 'UNIBUS: un solo bus per memoria e periferiche', href: '../../index.html#/bus/unibus', tipo: 'buslab' },
      { testo: 'Bus S-100: linee di indirizzo, di dati e di controllo', href: '../../index.html#/bus/s100', tipo: 'buslab' },
      { testo: 'AXI: canali separati per indirizzi e dati dentro i chip', href: '../../index.html#/bus/axi', tipo: 'buslab' },
      { testo: 'Capitolo 1 · I giganti e i loro cavi', href: '#giganti', tipo: 'sezione' },
      { testo: 'Capitolo 6 · La memoria', href: '#memoria', tipo: 'sezione' },
      { testo: 'Capitolo 9 · Le prestazioni', href: '#prestazioni', tipo: 'sezione' },
      { testo: 'Sezione 5 · Il ciclo di istruzione in un microprocessore vero', href: '../chip-programmabili/index.html#ciclo', tipo: 'sezione' },
      { testo: 'Sezione 5 · I microcontrollori', href: '../chip-programmabili/index.html#microcontrollori', tipo: 'sezione' },
      { testo: 'Sezione 4 · I circuiti che calcolano', href: '../porte-logiche/index.html#calcolo', tipo: 'sezione' },
      { testo: 'Sezione 7 · Programmare con i cavi', href: '../programmazione/index.html#cavi', tipo: 'sezione' },
      { testo: 'Sezione 7 · Il linguaggio assembly', href: '../programmazione/index.html#assembly', tipo: 'sezione' },
      { testo: 'Elettronica avanzata · Il clock', href: '../elettronica-avanzata/index.html#clock', tipo: 'sezione' },
      { testo: 'Quiz sul capitolo', href: '../quiz/index.html#storia-pc/von-neumann', tipo: 'sezione' },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
