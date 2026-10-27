/*
 * Laboratorio "Il multimetro virtuale" (capitolo 10).
 * Sulla basetta: una pila da 9 V con la sua clip, R1 = 1 kΩ e R2 = 2 kΩ in serie,
 * i punti di prova A, D, B, C e un ponticello tra A e D da togliere per inserire
 * l'amperometro. Il multimetro ha selettore, display e due puntali da trascinare.
 * Le letture escono da un piccolo calcolo ai nodi che comprende lo strumento:
 * 10 MΩ da voltmetro, 1 Ω (con fusibile da 200 mA) da amperometro, 1 mA di prova da ohmmetro.
 */
(function () {
  'use strict';

  const VP = 9;
  const R1 = 1000;
  const R2 = 2000;
  const R_PILA = 1;
  const R_PONTE = 0.01;
  const R_VOLT = 1e7;
  const R_MILLI = 1;
  const I_PROVA = 1e-3;
  const FUSIBILE = 0.2;
  const NODI = { A: 0, D: 1, B: 2 };
  const PUNTI = { A: [200, 70], D: [262, 70], B: [430, 70], C: [200, 262] };
  const POSTI = ['riposo', 'A', 'D', 'B', 'C'];
  const MODI = [
    { id: 'off', nome: 'OFF', ang: -90, q: '', voce: 'nessuna', aria: 'spento' },
    { id: 'v', nome: 'V⎓', ang: -30, q: 'v', voce: 'voltmetro', aria: 'volt in continua' },
    { id: 'ma', nome: 'mA⎓', ang: 30, q: 'i', voce: 'amperometro', aria: 'milliampere in continua' },
    { id: 'ohm', nome: 'Ω', ang: 90, q: 'r', voce: 'ohmmetro', aria: 'ohm' },
  ];
  const FUNZIONE = { off: 'gira il selettore', v: 'in parallelo · 10 MΩ', ma: 'in serie · circa 1 Ω', ohm: 'a pila staccata · 1 mA di prova' };
  const BOCCOLE = { ma: [46, 296], com: [100, 296], vo: [154, 296] };
  const DISPOSIZIONI = {
    largo: { box: '0 0 800 420', basetta: [10, 30], metro: [584, 34], riposo: { rosso: [508, 236], nero: [540, 258] } },
    stretto: { box: '0 0 480 764', basetta: [5, 6], metro: [272, 388], gancio: [244, 700], riposo: { rosso: [96, 446], nero: [146, 470] } },
  };
  const ARCO = 'M200 70 C204 40 258 40 262 70';
  const PERCORSO = 'M150 164 C186 164 200 128 200 92 L200 70 C204 40 258 40 262 70 L430 70 L430 262 L200 262 L200 236 C200 214 186 192 150 192';
  const f1 = (x) => x.toFixed(1);

  // Gauss con pivot parziale: G·x = J.
  function risolvi(G, J) {
    const n = J.length;
    const M = G.map((r, i) => r.concat(J[i]));
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      const t = M[c]; M[c] = M[p]; M[p] = t;
      for (let r = c + 1; r < n; r++) {
        const f = M[r][c] / M[c][c];
        for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
      }
    }
    const x = [];
    for (let r = n - 1; r >= 0; r--) {
      let s = M[r][n];
      for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
      x[r] = s / M[r][r];
    }
    return x;
  }

  // Circuito più strumento: potenziali dei nodi (C = 0 V), correnti nei rami e letture.
  function misura(st) {
    const G = [[1e-12, 0, 0], [0, 1e-12, 0], [0, 0, 1e-12]];
    const J = [0, 0, 0];
    const k = (p) => (p === 'C' ? -1 : NODI[p]);
    const ramo = (a, b, g) => {
      const i = k(a);
      const j = k(b);
      if (i >= 0) G[i][i] += g;
      if (j >= 0) G[j][j] += g;
      if (i >= 0 && j >= 0) { G[i][j] -= g; G[j][i] -= g; }
    };
    const inietta = (a, b, i) => {
      if (k(a) >= 0) J[k(a)] += i;
      if (k(b) >= 0) J[k(b)] -= i;
    };
    if (st.pila) { ramo('A', 'C', 1 / R_PILA); inietta('A', 'C', VP / R_PILA); }
    if (st.ponte) ramo('A', 'D', 1 / R_PONTE);
    ramo('D', 'B', 1 / R1);
    ramo('B', 'C', 1 / R2);
    const su = st.rosso !== 'riposo' && st.nero !== 'riposo';
    const due = su && st.rosso !== st.nero;
    const gm = !due ? 0 : st.modo === 'v' ? 1 / R_VOLT : st.modo === 'ma' && !st.fuso ? 1 / R_MILLI : 0;
    if (gm) ramo(st.rosso, st.nero, gm);
    if (due && st.modo === 'ohm') inietta(st.rosso, st.nero, I_PROVA);
    const x = risolvi(G, J);
    const V = (p) => (p === 'C' ? 0 : x[NODI[p]]);
    const vm = due ? V(st.rosso) - V(st.nero) : 0;
    // Le perdite da 1 pS che tengono risolvibile il sistema non devono apparire come corrente (9 pA a circuito aperto).
    const netta = (i) => (Math.abs(i) < 1e-9 ? 0 : i);
    return {
      V: V, su: su, due: due, vm: vm,
      iPila: netta(st.pila ? (VP - V('A')) / R_PILA : 0),
      iPonte: netta(st.ponte ? (V('A') - V('D')) / R_PONTE : 0),
      iR1: netta((V('D') - V('B')) / R1),
      iR2: netta(V('B') / R2),
      iMetro: netta(vm * gm),
      ohm: due ? vm / I_PROVA : su ? 0 : Infinity,
    };
  }

  EB.laboratorio('misure', {
    monta(ctx) {
      const { h, s, fmt, num, F } = ctx;
      const ridotto = ctx.ridotto;
      const st = { modo: 'off', rosso: 'riposo', nero: 'riposo', pila: true, ponte: true, fuso: false };
      let m = misura(st);
      let disp = DISPOSIZIONI.largo;
      const vis = { clip: 0, ponte: 1, spina: 0, flusso: 1, fase: 0 };
      const lcd = { val: 0, meta: 0, t: 0 };
      let timer = 0;
      let ultimaNota = '';
      let lunghezza = 0;
      const idFori = EB.uid('mis-fori');
      const idVetro = EB.uid('mis-vetro');

      /* --- basetta --- */
      const svg = s('svg', { class: 'mis-svg', viewBox: disp.box, role: 'group' });
      svg.innerHTML = '<defs><pattern id="' + idFori + '" width="12" height="12" patternUnits="userSpaceOnUse"><rect x="4.5" y="4.5" width="3" height="3" rx=".8" class="mis-foro"/></pattern>' +
        '<linearGradient id="' + idVetro + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="mis-vetro-a"/><stop offset="1" class="mis-vetro-b"/></linearGradient></defs>';
      const basetta = s('g', { 'aria-hidden': 'true' });
      basetta.innerHTML = '<rect class="mis-tavola" width="470" height="330" rx="16"/>' +
        '<rect x="12" y="12" width="446" height="306" rx="10" fill="url(#' + idFori + ')"/>' +
        '<path class="mis-filo" d="M262 70 H430 V262 H200"/><path class="mis-filo-rame" d="M262 70 H430 V262 H200"/>' +
        '<path class="mis-ponte-ombra" d="' + ARCO + '"/>' +
        '<rect class="mis-pila" x="22" y="150" width="100" height="56" rx="8"/>' +
        '<path class="mis-pila-fascia" d="M30 150 H58 V206 H30 Q22 206 22 198 V158 Q22 150 30 150 Z"/>' +
        '<text class="mis-pila-t" x="88" y="185" text-anchor="middle">9 V</text>' +
        '<text class="mis-segno pos" x="113" y="169" text-anchor="middle">+</text>' +
        '<text class="mis-segno neg" x="113" y="198" text-anchor="middle">−</text>' +
        '<circle class="mis-morsetto" cx="128" cy="164" r="4.5"/>' +
        '<path class="mis-morsetto" d="M122.5 192 L125.3 187.2 H130.7 L133.5 192 L130.7 196.8 H125.3 Z"/>' +
        '<text class="mis-et mis-et-r1" x="346" y="106" text-anchor="middle">R₁ <tspan class="mis-r">1 kΩ</tspan></text>' +
        '<text class="mis-et mis-et-r2" x="410" y="171" text-anchor="end">R₂ <tspan class="mis-r">2 kΩ</tspan></text>' +
        '<text class="mis-leg" x="456" y="' + (ridotto ? 318 : 302) + '" text-anchor="end"><tspan class="mis-i">' + (ridotto ? '▸' : '●') + '</tspan> corrente, verso convenzionale</text>' +
        (ridotto ? '' : '<text class="mis-leg" x="456" y="318" text-anchor="end">velocità non in scala</text>');
      const hex = (nome) => (nome === 'oro' ? '#c9a227' : F.COLORI.find((c) => c.nome === nome).hex);
      function resistore(x, y, gradi, valore) {
        const g = s('g', { transform: 'translate(' + x + ' ' + y + ') rotate(' + gradi + ')' },
          s('rect', { x: -35, y: -11, width: 70, height: 22, rx: 9, class: 'mis-res-corpo' }));
        F.coloriDaValore(valore).concat('oro').forEach((nome, k) => g.append(s('rect', { x: [-25, -15, -5, 17][k], y: -11, width: 6, height: 22, fill: hex(nome) })));
        return g;
      }
      const cavettoR = s('path', { class: 'mis-cavetto rosso' });
      const cavettoN = s('path', { class: 'mis-cavetto nero' });
      const clip = s('g', { class: 'mis-clip mis-cliccabile' },
        s('rect', { x: 132, y: 150, width: 18, height: 56, rx: 4 }),
        s('circle', { cx: 145, cy: 164, r: 2.6, class: 'mis-clip-r' }),
        s('circle', { cx: 145, cy: 192, r: 2.6, class: 'mis-clip-n' }));
      const ponte = s('g', { class: 'mis-ponte mis-cliccabile' },
        s('path', { d: ARCO, class: 'mis-ponte-presa' }),
        s('path', { d: ARCO, class: 'mis-ponte-filo' }),
        s('rect', { x: 197, y: 62, width: 6, height: 10, rx: 1.5, class: 'mis-ponte-capo' }),
        s('rect', { x: 259, y: 62, width: 6, height: 10, rx: 1.5, class: 'mis-ponte-capo' }));
      const ombraPonte = basetta.querySelector('.mis-ponte-ombra');
      const percorso = s('path', { d: PERCORSO, class: 'mis-percorso' });
      const flusso = s('g');
      const puntini = [];
      if (!ridotto) for (let k = 0; k < 22; k++) { const c = s('circle', { r: 2.8, class: 'mis-punto-i' }); flusso.append(c); puntini.push(c); }
      basetta.append(resistore(346, 70, 0, R1), resistore(430, 166, 90, R2), cavettoR, cavettoN, clip, percorso, flusso);
      const anelli = {};
      Object.keys(PUNTI).forEach((k) => {
        const [x, y] = PUNTI[k];
        const dx = k === 'A' || k === 'C' ? -14 : 14;
        anelli[k] = s('circle', { cx: x, cy: y, r: 13, class: 'mis-anello' });
        basetta.append(anelli[k], s('circle', { cx: x, cy: y, r: 6.5, class: 'mis-pad' }),
          s('text', { x: x + dx, y: y + (k === 'C' ? 24 : -14), 'text-anchor': dx < 0 ? 'end' : 'start', class: 'mis-lettera' }, k));
      });
      basetta.append(ponte);

      /* --- multimetro --- */
      const metro = s('g', { 'aria-hidden': 'true' });
      metro.innerHTML = '<rect class="mis-guscio" width="200" height="340" rx="26"/>' +
        '<rect class="mis-faccia" x="10" y="10" width="180" height="320" rx="18"/>' +
        '<rect class="mis-lcd-cornice" x="22" y="22" width="156" height="78" rx="10"/>' +
        '<rect x="28" y="28" width="144" height="66" rx="6" fill="url(#' + idVetro + ')"/>' +
        '<circle class="mis-ghiera" cx="100" cy="190" r="47"/>' +
        MODI.map((x) => {
          const a = x.ang * Math.PI / 180;
          return '<line class="mis-tacca" x1="' + f1(100 + 49 * Math.sin(a)) + '" y1="' + f1(190 - 49 * Math.cos(a)) + '" x2="' + f1(100 + 55 * Math.sin(a)) + '" y2="' + f1(190 - 55 * Math.cos(a)) + '"/>';
        }).join('') +
        Object.keys(BOCCOLE).map((k) => {
          const [x, y] = BOCCOLE[k];
          return '<circle class="mis-boccola ' + (k === 'com' ? 'nera' : 'rossa') + '" cx="' + x + '" cy="' + y + '" r="12"/><circle class="mis-boccola-foro" cx="' + x + '" cy="' + y + '" r="5"/>' +
            '<text class="mis-boc-t" x="' + x + '" y="326" text-anchor="middle">' + { ma: 'mA', com: 'COM', vo: 'VΩ' }[k] + '</text>';
        }).join('');
      const lcdG = s('g', { class: 'mis-lcd spento' }, s('rect', { x: 28, y: 28, width: 144, height: 66, rx: 6, class: 'mis-lcd-ombra' }));
      const tInd = s('text', { x: 36, y: 44, class: 'mis-lcd-ind' });
      const tAuto = s('text', { x: 164, y: 44, 'text-anchor': 'end', class: 'mis-lcd-ind' });
      const tFant = s('text', { x: 146, y: 84, 'text-anchor': 'end', class: 'mis-lcd-fantasma' });
      const tCifre = s('text', { x: 146, y: 84, 'text-anchor': 'end', class: 'mis-lcd-cifre' });
      const tSegno = s('text', { x: 34, y: 84, class: 'mis-lcd-cifre' });
      const tUnita = s('text', { x: 150, y: 84, class: 'mis-lcd-unita' });
      const lcdTesti = s('g', null, tInd, tAuto, tFant, tCifre, tSegno, tUnita);
      lcdG.append(lcdTesti);
      const etichette = MODI.map((x) => {
        const a = x.ang * Math.PI / 180;
        return s('text', { x: f1(100 + 70 * Math.sin(a)), y: f1(190 - 70 * Math.cos(a)), 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'mis-pos mis-cliccabile' + (x.q ? ' q-' + x.q : ''), 'data-modo': x.id }, x.nome);
      });
      const manopola = s('g', { class: 'mis-manopola' },
        s('circle', { r: 36, class: 'mis-manopola-base' }),
        s('rect', { x: -11, y: -37, width: 22, height: 74, rx: 11, class: 'mis-manopola-presa' }),
        s('path', { d: 'M0 -32 V-16', class: 'mis-manopola-segno' }));
      const perno = s('g', { transform: 'translate(100 190)', class: 'mis-cliccabile' }, manopola);
      const fusibile = s('g', { class: 'mis-fusibile' });
      fusibile.innerHTML = '<rect class="mis-fus-vetro" x="30" y="255" width="34" height="13" rx="6.5"/>' +
        '<rect class="mis-fus-capo" x="26" y="254" width="7" height="15" rx="2"/><rect class="mis-fus-capo" x="61" y="254" width="7" height="15" rx="2"/>' +
        '<path class="mis-fus-filo" d="M33 261.5 C39 256 43 267 47 261.5 S55 256 61 261.5"/>' +
        '<path class="mis-fus-rotto" d="M33 261.5 C36 259 38 263 40 261 M61 261.5 C58 259 56 264 54 262"/><circle class="mis-fus-rotto" cx="47" cy="261.5" r="3.5"/>';
      const scintilla = s('circle', { cx: 47, cy: 261.5, r: 10, class: 'mis-scintilla' });
      const fusT = s('text', { x: 76, y: 265.5, class: 'mis-fus-t' }, 'fusibile 200 mA');
      const spina = (colore) => s('g', { class: 'mis-spina ' + colore }, s('circle', { r: 9 }), s('circle', { r: 3.2, cy: -2, class: 'mis-spina-luce' }));
      const spinaR = spina('rossa');
      const spinaN = spina('nera');
      spinaN.setAttribute('transform', 'translate(' + BOCCOLE.com + ')');
      metro.append(lcdG, ...etichette, perno, fusibile, scintilla, fusT, spinaN, spinaR);

      /* --- puntali e cavi --- */
      const cavi = s('g', { 'aria-hidden': 'true' });
      const sonde = s('g');
      function creaPuntale(colore, nome) {
        const g = s('g', { class: 'mis-puntale ' + colore });
        g.innerHTML = '<rect class="mis-presa" x="-24" y="-14" width="48" height="130" rx="16"/>' +
          '<rect class="mis-fuoco" x="-15" y="-9" width="30" height="120" rx="15"/>' +
          '<path class="mis-punta" d="M0 0 L1.7 5 V21 H-1.7 V5 Z"/>' +
          '<rect class="mis-guardia" x="-9" y="21" width="18" height="6" rx="3"/>' +
          '<rect class="mis-manico" x="-6.5" y="27" width="13" height="62" rx="6.5"/>' +
          '<rect class="mis-riflesso" x="-3.6" y="31" width="2.6" height="52" rx="1.3"/>' +
          '<rect class="mis-coda" x="-4.5" y="88" width="9" height="16" rx="3"/>';
        const cavo = s('path', { class: 'mis-cavo ' + colore });
        cavi.append(cavo);
        sonde.append(g);
        return { colore: colore, nome: nome, g: g, cavo: cavo, posto: 'riposo', pos: [0, 0], vel: [0, 0], ang: 10, presa: false, primo: false, off: [0, 0], scelta: null };
      }
      const rosso = creaPuntale('rosso', 'rosso');
      const nero = creaPuntale('nero', 'nero');
      const puntali = [rosso, nero];
      svg.append(basetta, metro, cavi, sonde);
      ctx.scena.append(h('div', { class: 'mis-scena' }, svg));

      /* --- pannello e comandi --- */
      const lDisplay = ctx.ui.lettura({ etichetta: 'Display' });
      const lFunzione = ctx.ui.lettura({ etichetta: 'Funzione', nota: ' ' });
      const notaFunzione = lFunzione.el.querySelector('.eb-lettura-n');
      const lCorrente = ctx.ui.lettura({ etichetta: 'Corrente nel circuito', grandezza: 'i' });
      const formula = ctx.ui.formulaViva();
      formula.el.classList.add('mis-formula');
      lCorrente.el.classList.add('mis-lettura-i');
      ctx.pannello.append(lDisplay.el, lFunzione.el, lCorrente.el, formula.el);

      const sMod = ctx.ui.scelta({ etichetta: 'Selettore', opzioni: MODI.map((x) => ({ valore: x.id, etichetta: x.nome })), valore: 'off', cambia: cambiaModo });
      const sceltaPuntale = (p, etichetta) => {
        const sc = ctx.ui.scelta({ etichetta: etichetta, opzioni: POSTI.map((x) => ({ valore: x, etichetta: x === 'riposo' ? 'a riposo' : x })), valore: 'riposo', cambia: (v) => collega(p, v, true) });
        sc.el.classList.add('mis-scelta-' + p.colore);
        return sc;
      };
      rosso.scelta = sceltaPuntale(rosso, 'Puntale rosso (boccola VΩ o mA)');
      nero.scelta = sceltaPuntale(nero, 'Puntale nero (boccola COM)');
      const iPila = ctx.ui.interruttore({ etichetta: 'Pila collegata', acceso: true, cambia: (v) => { st.pila = v; dopo('pila'); } });
      const iPonte = ctx.ui.interruttore({ etichetta: 'Ponticello tra A e D', acceso: true, cambia: (v) => { st.ponte = v; dopo('ponte'); } });
      const bFus = ctx.ui.bottone({ etichetta: 'Sostituisci il fusibile', click: ricambio });
      bFus.disabled = true;
      const gStrumento = h('div', { class: 'mis-gruppo mis-strumento', 'data-modo': 'off' }, sMod.el, bFus);
      ctx.comandi.append(gStrumento,
        h('div', { class: 'mis-gruppo mis-sonde' }, rosso.scelta.el, nero.scelta.el),
        h('div', { class: 'mis-gruppo' }, iPila.el, iPonte.el));

      /* --- geometria --- */
      const radice = (k) => [disp.basetta[0] + PUNTI[k][0], disp.basetta[1] + PUNTI[k][1]];
      const meta = (p) => (p.posto === 'riposo' ? disp.riposo[p.colore] : radice(p.posto));
      const angolo = (p) => {
        if (p.presa) return 28;
        if (p.posto === 'riposo') return 10;
        const a = p.colore === 'rosso' ? 34 : 22;
        return disp === DISPOSIZIONI.stretto && p.posto === 'B' ? -a - 18 : a;
      };
      function vicino(x, y) {
        let meglio = null;
        let dmin = 40;
        Object.keys(PUNTI).forEach((k) => {
          const [px, py] = radice(k);
          const d = Math.hypot(px - x, py - y);
          if (d < dmin) { dmin = d; meglio = k; }
        });
        return meglio;
      }
      function allinea() {
        puntali.forEach((p) => { p.pos = meta(p).slice(); p.vel = [0, 0]; p.ang = angolo(p); });
        vis.clip = st.pila ? 0 : 1;
        vis.ponte = st.ponte ? 1 : 0;
        vis.spina = st.modo === 'ma' ? 1 : 0;
      }

      /* --- display --- */
      function display(x) {
        if (st.modo === 'off') return { segno: '', cifre: '', unita: '', testo: 'spento' };
        if (st.modo === 'ma' && st.fuso) return { segno: '', cifre: 'FUSE', unita: '', testo: 'FUSE' };
        let u = st.modo === 'v' ? 'V' : 'mA';
        if (st.modo === 'ma') x *= 1000;
        if (st.modo === 'ohm') {
          if (!Number.isFinite(x) || Math.abs(x) >= 4e7) return { segno: '', cifre: 'OL', unita: 'MΩ', testo: 'OL' };
          const a = Math.abs(x);
          u = a < 1e3 ? 'Ω' : a < 1e6 ? 'kΩ' : 'MΩ';
          x /= a < 1e3 ? 1 : a < 1e6 ? 1e3 : 1e6;
        }
        const a = Math.abs(x);
        const c = num(a, u === 'Ω' ? 1 : a < 9.995 ? 2 : a < 99.95 ? 1 : 0);
        const segno = x < 0 && /[1-9]/.test(c) ? '−' : '';
        return { segno: segno, cifre: c, unita: u, testo: segno + c + ' ' + u };
      }
      function scriviLcd() {
        const d = display(lcd.val);
        tSegno.textContent = d.segno;
        tCifre.textContent = d.cifre;
        tFant.textContent = /\d/.test(d.cifre) ? d.cifre.replace(/\d/g, '8') : '';
        tUnita.textContent = d.unita;
        tInd.textContent = st.modo === 'v' || st.modo === 'ma' ? 'DC' : '';
        tAuto.textContent = st.modo === 'off' ? '' : 'AUTO';
        lcdG.classList.toggle('spento', st.modo === 'off');
      }
      const risoluzione = { v: 1e-3, ma: 1e-6, ohm: 0.02, off: 0 };
      function passoLcd() {
        if (lcd.val === lcd.meta) return;
        lcd.val += (lcd.meta - lcd.val) * 0.7;
        if (Math.abs(lcd.meta - lcd.val) <= Math.abs(lcd.meta) * 0.002 + risoluzione[st.modo]) lcd.val = lcd.meta;
        scriviLcd();
      }

      /* --- disegno --- */
      function disegnaPuntale(p, sp) {
        const a = p.ang * Math.PI / 180;
        const ux = Math.sin(a);
        const uy = Math.cos(a);
        p.g.setAttribute('transform', 'translate(' + f1(p.pos[0]) + ' ' + f1(p.pos[1]) + ') rotate(' + f1(-p.ang) + ')');
        const bx = p.pos[0] + 104 * ux;
        const by = p.pos[1] + 104 * uy;
        const ex = disp.metro[0] + sp[0];
        const ey = disp.metro[1] + sp[1] + 8;
        // Sugli schermi stretti il cavo scende a sinistra del multimetro e risale nella boccola da sotto.
        const g = disp.gancio;
        const via = g ? (g[0] - 44) + ' ' + f1(Math.max(by + 40, g[1] - 220)) + ' ' + g[0] + ' ' + g[1] + ' C' + g[0] + ' ' + (g[1] + 56) + ' ' + f1(ex) + ' ' + f1(ey + 84) : f1(ex) + ' ' + f1(ey + 40);
        p.cavo.setAttribute('d', 'M' + f1(bx) + ' ' + f1(by) + ' C' + f1(bx + 34 * ux) + ' ' + f1(by + 34 * uy) + ' ' + via + ' ' + f1(ex) + ' ' + f1(ey));
      }
      function tratto(x, y) {
        if (y < 69.5 && x > 201 && x < 261) return 'ponte';
        if (y < 70.5 && x >= 261) return 'r1';
        if ((x > 429.5 && y > 70.5) || (y > 261.5 && x > 200.5)) return 'r2';
        return 'filo';
      }
      function quote() {
        const I = Math.abs(m.iPila);
        const q = (i) => (I > 1e-9 ? EB.clamp(Math.abs(i) / I, 0, 1) : 0);
        return { ponte: q(m.iPonte), r1: q(m.iR1), r2: q(m.iR2), filo: I > 1e-9 ? 1 : 0 };
      }
      function disponiPuntini() {
        if (!lunghezza) lunghezza = percorso.getTotalLength();
        const fr = quote();
        puntini.forEach((c, k) => {
          const pt = percorso.getPointAtLength((k * lunghezza / puntini.length + vis.fase) % lunghezza);
          c.setAttribute('cx', f1(pt.x));
          c.setAttribute('cy', f1(pt.y));
          c.setAttribute('opacity', (vis.flusso * fr[tratto(pt.x, pt.y)]).toFixed(2));
        });
      }
      // Con il movimento ridotto: frecce ferme lungo il circuito.
      const frecce = [];
      function aggiornaFrecce() {
        if (!lunghezza) {
          lunghezza = percorso.getTotalLength();
          [0.06, 0.2, 0.31, 0.45, 0.6, 0.76, 0.93].forEach((f) => {
            const a = percorso.getPointAtLength(f * lunghezza);
            const b = percorso.getPointAtLength(f * lunghezza + 1);
            const el = s('path', { d: 'M-5 -4.5 L5 0 L-5 4.5 Z', class: 'mis-freccia-i', transform: 'translate(' + f1(a.x) + ' ' + f1(a.y) + ') rotate(' + f1(Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI) + ')' });
            flusso.append(el);
            frecce.push({ el: el, t: tratto(a.x, a.y) });
          });
        }
        const fr = quote();
        frecce.forEach((x) => x.el.setAttribute('opacity', fr[x.t] > 0.5 ? 1 : 0));
      }
      function disegna() {
        const dx = 20 * vis.clip;
        const x0 = 150 + dx;
        clip.setAttribute('transform', 'translate(' + f1(dx) + ' 0)');
        cavettoR.setAttribute('d', 'M' + f1(x0) + ' 164 C' + f1(x0 + 36) + ' 164 200 128 200 92 L200 70');
        cavettoN.setAttribute('d', 'M' + f1(x0) + ' 192 C' + f1(x0 + 36) + ' 192 200 214 200 236 L200 262');
        const u = 1 - vis.ponte;
        ponte.setAttribute('transform', 'translate(' + f1(-138 * u) + ' ' + f1(-34 * u) + ')');
        ombraPonte.setAttribute('opacity', u.toFixed(3));
        const t = vis.spina;
        const sp = [EB.lerp(BOCCOLE.vo[0], BOCCOLE.ma[0], t), BOCCOLE.vo[1] - 28 * Math.sin(Math.PI * EB.clamp(t, 0, 1))];
        spinaR.setAttribute('transform', 'translate(' + f1(sp[0]) + ' ' + f1(sp[1]) + ')');
        disegnaPuntale(rosso, sp);
        disegnaPuntale(nero, BOCCOLE.com);
        if (!ridotto) disponiPuntini();
      }

      /* --- movimento --- */
      function molla(p, dt) {
        p.ang += (angolo(p) - p.ang) * (1 - Math.exp(-dt * 10));
        if (p.presa) return;
        const t = meta(p);
        for (let i = 0; i < 2; i++) {
          p.vel[i] += ((t[i] - p.pos[i]) * 240 - p.vel[i] * 24) * dt;
          p.pos[i] += p.vel[i] * dt;
        }
      }
      function fermo() {
        const vicini = (a, b, e) => Math.abs(a - b) < e;
        const sonde = puntali.every((p) => {
          const t = meta(p);
          return !p.presa && Math.hypot(t[0] - p.pos[0], t[1] - p.pos[1]) < 0.05 && Math.hypot(p.vel[0], p.vel[1]) < 0.05 && vicini(p.ang, angolo(p), 0.05);
        });
        return sonde && vicini(vis.clip, st.pila ? 0 : 1, 0.002) && vicini(vis.ponte, st.ponte ? 1 : 0, 0.002) &&
          vicini(vis.spina, st.modo === 'ma' ? 1 : 0, 0.002) && vis.flusso < 0.002 && lcd.val === lcd.meta;
      }
      const ciclo = ctx.ciclo((dt) => {
        const e = (r) => 1 - Math.exp(-dt * r);
        vis.clip += ((st.pila ? 0 : 1) - vis.clip) * e(9);
        vis.ponte += ((st.ponte ? 1 : 0) - vis.ponte) * e(8);
        vis.spina += ((st.modo === 'ma' ? 1 : 0) - vis.spina) * e(8);
        vis.flusso += ((Math.abs(m.iPila) > 1e-6 ? 1 : 0) - vis.flusso) * e(5);
        vis.fase = (vis.fase + dt * Math.min(220, 60 * Math.sqrt(Math.abs(m.iPila) / 0.003))) % 1e6;
        puntali.forEach((p) => molla(p, dt));
        lcd.t += dt;
        if (lcd.t >= 0.12) { lcd.t = 0; passoLcd(); }
        disegna();
        if (fermo()) { allinea(); disegna(); ciclo.ferma(); }
      });

      /* --- spiegazioni --- */
      function notaVolt(tra, lett, coppia) {
        if (!st.pila) return 'Voltmetro ' + tra + ': ' + lett + '. Senza pila non c\'è nessuna spinta da misurare.';
        if (Math.abs(m.vm) < 0.005) {
          return 'Voltmetro ' + tra + ': ' + lett + '. ' + (coppia === 'AD' ? 'A e D sono uniti dal ponticello, un filo: tra i suoi capi la tensione è praticamente zero.' : 'Il circuito è aperto e non passa corrente: senza corrente, sui resistori non cade tensione.');
        }
        const cosa = !st.ponte && coppia !== 'AC' && coppia.includes('A') ? 'con il circuito aperto, tutta la tensione della pila si ritrova ai capi dell\'interruzione.' : {
          BC: 'la tensione ai capi di **R₂**: 2 kΩ × 3 mA = 6 V.',
          AB: 'la tensione ai capi di **R₁**: 1 kΩ × 3 mA = 3 V.',
          BD: 'la tensione ai capi di **R₁**: 1 kΩ × 3 mA = 3 V.',
          AC: 'la tensione della pila' + (st.ponte ? ': 3 V su R₁ più 6 V su R₂.' : '.'),
          CD: 'la tensione su R₁ e R₂ insieme: 3 V + 6 V.',
        }[coppia];
        return 'Voltmetro ' + tra + ': ' + lett + ', ' + cosa + (m.vm < 0 ? ' Il segno meno vuol dire che il rosso tocca il punto a potenziale più basso: scambia i puntali.' : ' Il voltmetro sta **in parallelo** e, con 10 MΩ, quasi non ruba corrente al circuito.');
      }
      function notaMilli(tra, lett, coppia) {
        if (st.fuso) return 'Il fusibile è bruciato: su mA lo strumento non misura più finché non lo sostituisci. Volt e ohm funzionano ancora, perché non passano dal fusibile.';
        if (!st.pila) return 'Amperometro ' + tra + ': ' + lett + '. Senza pila non passa corrente.';
        if (coppia === 'AD') {
          if (!st.ponte) return 'Amperometro **in serie**, al posto del ponticello: tutta la corrente del circuito lo attraversa e leggi ' + lett + ', cioè 9 V / 3 kΩ. Con circa 1 Ω di resistenza, lo strumento non cambia quasi nulla.' + (m.iMetro < 0 ? ' Il segno meno vuol dire che la corrente entra dal puntale nero.' : '');
          return 'Il ponticello è ancora al suo posto: la corrente preferisce il filo e lo strumento ne vede solo ' + lett + '. Togli il ponticello e fai passare tutta la corrente dentro l\'amperometro.';
        }
        if (Math.abs(m.iMetro) < 1e-6) return 'Amperometro ' + tra + ': ' + lett + '. Il circuito è aperto e non passa corrente: chiudilo con lo strumento, tra **A** e **D**.';
        return 'Amperometro **in parallelo** a ' + (coppia === 'BC' ? 'R₂' : 'R₁') + ' (' + lett + '): con la sua resistenza minuscola la mette in cortocircuito. Ora nel circuito passano **' + fmt(m.iPila, 'A') + '** invece di 3 mA: stai misurando un circuito diverso da quello di partenza.';
      }
      function notaOhm(tra, lett) {
        if (st.pila) return '**Attenzione**: la pila è collegata. L\'ohmmetro manda una sua piccola corrente (1 mA) e misura la tensione che ne risulta, ma la pila ci aggiunge la sua: la lettura, ' + lett + ', non ha senso. Stacca la pila prima di misurare una resistenza.';
        const r = m.ohm;
        let cosa = '.';
        if (!(r < 4e7)) cosa = ': **circuito aperto**, la corrente di prova non trova una strada tra i puntali.';
        else if (r < 1) cosa = ': tra i due punti c\'è solo un filo.';
        else if (Math.abs(r - 3000) < 60) cosa = ', cioè R₁ + R₂ = 1 kΩ + 2 kΩ. Lo strumento manda 1 mA e misura 3 V: `R = V / I`.';
        else if (Math.abs(r - 2000) < 40) cosa = ', la resistenza di **R₂**.';
        else if (Math.abs(r - 1000) < 20) cosa = ', la resistenza di **R₁**.';
        return 'Ohmmetro ' + tra + ': ' + lett + cosa;
      }
      function spiega(motivo) {
        const r = st.rosso;
        const n = st.nero;
        const lett = '**' + display(lcd.meta).testo + '**';
        const tra = 'tra **' + r + '** (rosso) e **' + n + '** (nero)';
        const coppia = [r, n].sort().join('');
        let t = {
          pila: !st.pila ? 'Pila staccata: il circuito non è più alimentato. ' : m.iPila ? 'Pila collegata: nel circuito passano **' + fmt(m.iPila, 'A') + '**. ' : 'Pila collegata, ma il circuito è aperto: non passa corrente. ',
          ponte: st.ponte ? 'Ponticello rimesso: il circuito è di nuovo chiuso. ' : 'Ponticello tolto: il circuito è **aperto** e la corrente si ferma. ',
          ricambio: 'Fusibile nuovo da 200 mA. Per cambiarlo hai spento lo strumento e staccato i puntali, come si fa davvero. ',
        }[motivo] || '';
        if (motivo === 'fuso') {
          t = '**Fusibile bruciato.** Con i puntali ' + tra + ', l\'amperometro (circa 1 Ω) si è trovato **in parallelo alla pila**: avrebbe assorbito diversi ampere, oltre dieci volte i 200 mA del fusibile, che si è fuso in un istante e ha salvato lo strumento. Ecco perché l\'amperometro non va mai messo in parallelo.';
        } else if (st.modo === 'off') {
          t += motivo === 'ricambio' ? 'Riaccendilo con il selettore.' : 'Il multimetro è spento: gira il selettore su **V⎓**, **mA⎓** o **Ω**.';
        } else if (st.modo === 'ma' && st.fuso) {
          t += notaMilli(tra, lett, coppia);
        } else if (!m.su) {
          t += {
            v: 'Il voltmetro misura la differenza di potenziale tra **due** punti: appoggia entrambi i puntali.',
            ma: 'L\'amperometro misura la corrente che lo attraversa: deve diventare un pezzo del circuito, **in serie**.',
            ohm: '**OL**: tra i puntali c\'è aria, una resistenza enorme. Appoggiali ai capi di ciò che vuoi misurare.',
          }[st.modo];
        } else if (r === n) {
          t += lett + ': i due puntali toccano lo stesso punto, quindi tra loro non c\'è nulla da misurare.';
        } else {
          t += st.modo === 'v' ? notaVolt(tra, lett, coppia) : st.modo === 'ma' ? notaMilli(tra, lett, coppia) : notaOhm(tra, lett);
        }
        if (t === ultimaNota) return;
        ultimaNota = t;
        ctx.nota(t);
      }
      function controlla() {
        const coppia = [st.rosso, st.nero].sort().join('');
        if (st.modo === 'v' && st.pila && coppia === 'BC' && Math.abs(Math.abs(m.vm) - 6) < 0.12) ctx.completa('tensione-r2');
        if (st.modo === 'ma' && !st.fuso && !st.ponte && coppia === 'AD' && Math.abs(Math.abs(m.iMetro) - 0.003) < 6e-5) ctx.completa('corrente');
        if (st.modo === 'ohm' && !st.pila && Math.abs(m.ohm - 3000) < 60) ctx.completa('resistenza');
      }

      /* --- stato --- */
      function aggiornaFormula() {
        if (st.modo === 'v' && m.due) {
          formula.imposta([['V', 'v'], ' = ', ['V(' + st.rosso + ')', 'v'], ' − ', ['V(' + st.nero + ')', 'v'], ' = ', [fmt(m.V(st.rosso), 'V'), 'v'], ' − ', [fmt(m.V(st.nero), 'V'), 'v'], ' = ', [display(m.vm).testo, 'v']]);
        } else if (st.modo === 'ohm' && m.due) {
          formula.imposta(m.ohm < 4e7 ? [['R', 'r'], ' = ', ['V', 'v'], ' / ', ['I', 'i'], ' = ', [fmt(m.vm, 'V'), 'v'], ' / ', [fmt(I_PROVA, 'A'), 'i'], ' = ', [display(m.ohm).testo, 'r']] : [['R', 'r'], ' = ', ['V', 'v'], ' / ', ['I', 'i'], ' → ', ['OL', 'r']]);
        } else if (!st.pila) {
          formula.imposta([['V', 'v'], ' = ', ['0 V', 'v'], ' → ', ['I', 'i'], ' = ', ['0 A', 'i']]);
        } else {
          const req = Math.abs(m.iPila) > 1e-9 ? VP / m.iPila - R_PILA : Infinity;
          formula.imposta([['I', 'i'], ' = ', ['V', 'v'], ' / ', ['R', 'r'], ' = ', [fmt(VP, 'V'), 'v'], ' / ', [fmt(req, 'Ω'), 'r'], ' = ', [fmt(m.iPila, 'A'), 'i']]);
        }
      }
      const dove = (p) => (p === 'riposo' ? 'a riposo' : 'sul punto ' + p);
      function descrivi() {
        const modo = MODI.find((x) => x.id === st.modo);
        svg.setAttribute('aria-label', 'Basetta con una pila da 9 V ' + (st.pila ? 'collegata' : 'staccata') + ', R₁ da 1 kΩ e R₂ da 2 kΩ in serie, ponticello tra A e D ' + (st.ponte ? 'inserito' : 'tolto') +
          '. Multimetro ' + (st.modo === 'off' ? 'spento' : 'su ' + modo.aria) + ', puntale rosso ' + dove(st.rosso) + ', puntale nero ' + dove(st.nero) +
          '. Display: ' + display(lcd.meta).testo + (st.fuso ? '. Fusibile bruciato.' : '.'));
        puntali.forEach((p) => p.g.setAttribute('aria-label', 'Puntale ' + p.nome + ', ' + dove(p.posto) + '. Frecce: punto successivo o precedente.'));
      }
      function dopo(motivo) {
        m = misura(st);
        if (st.modo === 'ma' && !st.fuso && Math.abs(m.iMetro) > FUSIBILE) {
          st.fuso = true;
          m = misura(st);
          motivo = 'fuso';
          fusibile.classList.add('rotto');
          fusT.textContent = '200 mA: bruciato';
          fusT.classList.add('rotto');
          bFus.disabled = false;
          if (!ridotto) {
            [scintilla, lcdTesti].forEach((el, k) => { el.classList.remove(k ? 'mis-buio' : 'mis-lampo'); void el.getBoundingClientRect(); el.classList.add(k ? 'mis-buio' : 'mis-lampo'); });
          }
        }
        lcd.meta = st.modo === 'v' ? m.vm : st.modo === 'ma' ? m.iMetro : st.modo === 'ohm' ? m.ohm : 0;
        if (ridotto || !Number.isFinite(lcd.meta) || !Number.isFinite(lcd.val)) lcd.val = lcd.meta;
        const modo = MODI.find((x) => x.id === st.modo);
        lDisplay.el.className = 'eb-lettura' + (modo.q ? ' q-' + modo.q : '');
        lDisplay.imposta(display(lcd.meta).testo);
        lFunzione.imposta(modo.voce);
        notaFunzione.textContent = st.modo === 'ma' && st.fuso ? 'fusibile bruciato: sostituiscilo' : FUNZIONE[st.modo];
        lCorrente.imposta(fmt(m.iPila, 'A'));
        aggiornaFormula();
        Object.keys(anelli).forEach((k) => {
          anelli[k].classList.toggle('rosso', st.rosso === k);
          anelli[k].classList.toggle('nero', st.nero === k && st.rosso !== k);
        });
        descrivi();
        scriviLcd();
        if (ridotto) { allinea(); disegna(); aggiornaFrecce(); } else ciclo.avvia();
        clearTimeout(timer);
        if (motivo === 'fuso') { spiega('fuso'); ctx.completa('fusibile'); }
        else timer = setTimeout(() => { spiega(motivo); controlla(); }, 320);
      }
      function cambiaModo(v) {
        if (v === st.modo) return;
        st.modo = v;
        lcd.val = 0;
        manopola.style.transform = 'rotate(' + MODI.find((x) => x.id === v).ang + 'deg)';
        etichette.forEach((t) => t.classList.toggle('attiva', t.dataset.modo === v));
        gStrumento.dataset.modo = v;
        dopo('modo');
      }
      function collega(p, posto, daScelta) {
        p.posto = posto;
        st[p.colore] = posto;
        if (!daScelta) p.scelta.imposta(posto, true);
        dopo('puntale');
      }
      function ricambio() {
        st.fuso = false;
        fusibile.classList.remove('rotto');
        fusT.textContent = 'fusibile 200 mA';
        fusT.classList.remove('rotto');
        bFus.disabled = true;
        puntali.forEach((p) => { p.posto = 'riposo'; st[p.colore] = 'riposo'; p.scelta.imposta('riposo', true); });
        sMod.imposta('off', true);
        cambiaModo('off');
        dopo('ricambio');
        const radio = sMod.el.querySelector('input:checked');
        if (radio) radio.focus();
      }

      /* --- interazione nella scena --- */
      // Chrome ignora touch-action dentro l'SVG: senza questo il dito farebbe scorrere la pagina.
      const blocca = (e) => e.preventDefault();
      puntali.forEach((p) => {
        ctx.su(p.g, 'touchstart', blocca, { passive: false });
        ctx.su(p.g, 'touchmove', blocca, { passive: false });
        ctx.pulizia(EB.trascina(p.g, {
          svg: svg,
          inizio() { p.presa = true; p.primo = true; },
          muovi(x, y) {
            if (p.primo) { p.off = [p.pos[0] - x, p.pos[1] - y]; p.primo = false; }
            p.pos = [x + p.off[0], y + p.off[1]];
            p.vel = [0, 0];
            const k = vicino(p.pos[0], p.pos[1]);
            Object.keys(anelli).forEach((q) => anelli[q].classList.toggle('mira', q === k));
            if (ridotto) disegna(); else ciclo.avvia();
          },
          sposta(dx, dy) {
            const i = POSTI.indexOf(p.posto);
            collega(p, POSTI[(i + (dx + dy > 0 ? 1 : POSTI.length - 1)) % POSTI.length]);
          },
          fine() {
            if (!p.presa) return;
            p.presa = false;
            Object.keys(anelli).forEach((q) => anelli[q].classList.remove('mira'));
            collega(p, vicino(p.pos[0], p.pos[1]) || 'riposo');
          },
        }));
      });
      ctx.su(perno, 'click', () => {
        const i = MODI.findIndex((x) => x.id === st.modo);
        sMod.imposta(MODI[(i + 1) % MODI.length].id);
      });
      etichette.forEach((t) => ctx.su(t, 'click', () => sMod.imposta(t.dataset.modo)));
      ctx.su(ponte, 'click', () => iPonte.imposta(!st.ponte));
      ctx.su(clip, 'click', () => iPila.imposta(!st.pila));

      /* --- impaginazione: metro accanto alla basetta, o sotto sugli schermi stretti --- */
      function impagina() {
        const w = ctx.scena.clientWidth;
        const nuova = w && w < 560 ? DISPOSIZIONI.stretto : DISPOSIZIONI.largo;
        if (nuova === disp && svg.getAttribute('data-disp')) return;
        disp = nuova;
        svg.setAttribute('data-disp', disp === DISPOSIZIONI.stretto ? 'stretto' : 'largo');
        svg.setAttribute('viewBox', disp.box);
        basetta.setAttribute('transform', 'translate(' + disp.basetta.join(' ') + ')');
        metro.setAttribute('transform', 'translate(' + disp.metro.join(' ') + ')');
        allinea();
        disegna();
      }
      if ('ResizeObserver' in window) {
        const ro = new ResizeObserver(impagina);
        ro.observe(ctx.scena);
        ctx.pulizia(() => ro.disconnect());
      }
      ctx.pulizia(() => clearTimeout(timer));

      impagina();
      m = misura(st);
      scriviLcd();
      dopo('avvio');
      clearTimeout(timer);
      etichette[0].classList.add('attiva');
      ultimaNota = 'Una pila da **9 V** spinge **' + fmt(F.corrente(VP, F.serie([R1, R2])), 'A') + '** attraverso R₁ e R₂. Il multimetro è spento: gira il selettore su **V⎓** e appoggia i puntali sui punti A, B, C o D. Puoi trascinarli, spostarli con le frecce o sceglierli qui sotto.';
      ctx.nota(ultimaNota);
    },
  });
})();
