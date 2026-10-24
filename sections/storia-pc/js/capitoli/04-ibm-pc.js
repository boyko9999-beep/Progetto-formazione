/*
 * Storia del PC · capitolo 4: IBM PC e l'architettura aperta.
 * Testi, due illustrazioni (il PC IBM 5150 completo, il BIOS come "contratto")
 * e il laboratorio "Dentro l'IBM PC 5150": apri il case / la mappa della memoria.
 * Dati e logica pura stanno in js/modelli/04-ibm-pc.js (StoriaPCModelli['ibm-pc']).
 * Il file non tocca il DOM al caricamento: il DOM si usa solo nelle figure e in lab.crea().
 */
(function (root) {
  'use strict';
  const P = root.StoriaPC;
  const M = (root.StoriaPCModelli || {})['ibm-pc'];

  const n1 = (v) => Math.round(v * 10) / 10;

  /* =====================================================================
   * Figura 1 · IBM PC 5150: unità di sistema, monitor 5151, tastiera Model F
   * Vista frontale con un po' di profondità (proiezione obliqua, verso destra e in alto).
   * ===================================================================== */

  // Tasti della Model F a 83 tasti: [colonna (in unità di tasto), riga (0 = in fondo), larghezza, altezza in righe, classe]
  function tastiModelF() {
    const t = [];
    const riga = (r, x0, larghezze, cls) => { let x = x0; larghezze.forEach((w) => { if (w > 0) t.push([x, r, w, 1, typeof cls === 'function' ? cls(x, w) : cls]); x += Math.abs(w); }); };
    // tasti funzione: due colonne a sinistra
    for (let r = 0; r < 5; r++) { t.push([0, r, 1, 1, 'f']); t.push([1, r, 1, 1, 'f']); }
    const X = 2.5; // inizio del blocco principale
    const mod = (w) => (w > 1 ? 'm' : 'a');
    riga(0, X, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2], (x, w) => (x === X || w > 1 ? 'm' : 'a'));
    riga(1, X, [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], (x, w) => mod(w));
    riga(2, X, [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], (x, w) => mod(w));
    t.push([X + 13.5, 1, 1.5, 2, 'm']); // Invio, alto due righe
    riga(3, X, [1.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75, 1], (x, w) => (w !== 1 || x > X + 13.5 ? 'm' : 'a'));
    riga(4, X, [1.75, 11.5, 1.75], (x, w) => (w > 2 ? 'a' : 'm'));
    // tastierino numerico
    const K = X + 15.5;
    t.push([K, 0, 2, 1, 'm'], [K + 2, 0, 2, 1, 'm']);
    for (let r = 1; r <= 3; r++) for (let c = 0; c < 3; c++) t.push([K + c, r, 1, 1, 'a']);
    t.push([K + 3, 1, 1, 1, 'm'], [K + 3, 2, 1, 3, 'm']);
    t.push([K, 4, 2, 1, 'a'], [K + 2, 4, 1, 1, 'a']);
    return t;
  }

  // Spirale del cavo della tastiera: una trocoide lungo una curva.
  function cavoSpirale(x0, y0, x1, y1, cx, cy, giri, r) {
    const pts = [];
    const N = giri * 14;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const by = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      const a = t * giri * Math.PI * 2;
      pts.push(n1(bx + Math.cos(a) * r) + ' ' + n1(by + Math.sin(a) * r * 0.55));
    }
    return 'M' + pts.join('L');
  }

  function figuraPC5150() {
    // Tastiera: spazio dei tasti (u da 0 a 312, v da 0 = davanti a 60 = dietro) proiettato in obliquo.
    const U = 312 / 24, RIGA = 10.6;
    const tasti = tastiModelF().map(([c, r, w, hr, cls]) => {
      const x = 6 + c * U + 1.2, wpx = w * U - 2.4;
      const v1 = 60 - 5 - r * RIGA, v0 = v1 - (hr * RIGA - 2.2);
      return '<rect class="k' + cls + '" x="' + n1(x) + '" y="' + n1(v0) + '" width="' + n1(wpx) + '" height="' + n1(v1 - v0) + '" rx="1.6"/>';
    }).join('');
    // Righe di testo sullo schermo (barre verdi) e prompt del DOS.
    const righe = [[0, 22], [0, 15], [0, 25], [0, 0], [0, 9], [0, 17], [0, 0], [0, 12]].map(([x, l], i) =>
      l ? '<rect class="ibm-fig-riga" x="' + (156 + x) + '" y="' + (97 + i * 11) + '" width="' + (l * 5.2) + '" height="5" rx="1"/>' : '').join('');
    const fessure = [];
    for (let i = 0; i < 9; i++) {
      const t = 0.42 + i * 0.05;
      fessure.push('<path d="M' + n1(150 + 51 * t) + ' ' + n1(66 - 32 * t) + 'l150 0"/>');
    }
    const drive = (x) => '<g class="ibm-fig-drive">' +
      '<rect class="sc l" x="' + x + '" y="252" width="84" height="54" rx="2"/>' +
      '<rect class="sc2" x="' + (x + 5) + '" y="257" width="74" height="44" rx="1.5"/>' +
      '<rect class="ch" x="' + (x + 10) + '" y="276" width="64" height="6" rx="1"/>' +
      '<rect class="gr l1" x="' + (x + 36) + '" y="266" width="12" height="26" rx="2"/>' +
      '<rect class="ibm-fig-led" x="' + (x + 9) + '" y="261" width="7" height="3" rx="1"/>' +
      '</g>';
    return '<svg class="ibm-fig" viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg">' +
      // ombre sul piano
      '<path class="ibm-fig-ombra" d="M80 330L420 330L500 282L500 294L428 338L80 338Z"/>' +
      '<ellipse class="ibm-fig-ombra" cx="262" cy="398" rx="210" ry="6"/>' +
      // cavo spiralato della tastiera, che sparisce dietro il fianco sinistro
      '<path class="ibm-fig-cavo" d="' + cavoSpirale(150, 352, 96, 300, 60, 352, 9, 6) + '"/>' +
      // unità di sistema: piano, fianco destro, frontale
      '<path class="be l" d="M92 236L412 236L476 196L156 196Z"/>' +
      '<path class="ibm-fig-luce" d="M92 236L412 236L476 196L156 196Z"/>' +
      '<path class="be2 l" d="M412 236L476 196L476 286L412 326Z"/>' +
      '<rect class="be l" x="92" y="236" width="320" height="90"/>' +
      '<path class="ibm-fig-solco" d="M92 318L412 318M412 318L476 278"/>' +
      // fessure di aerazione sul fianco e interruttore rosso
      '<path class="ibm-fig-solco" d="M422 300L466 272M422 308L466 280"/>' +
      '<path class="ibm-fig-interruttore l" d="M461.9 226.8L469.6 222L469.6 240L461.9 244.8Z"/>' +
      // targhetta e unità per dischetti
      '<rect class="sc l1" x="112" y="250" width="66" height="18" rx="2"/>' +
      '<path class="ibm-fig-targa" d="M118 255h22M118 259h22M118 263h22M146 259h26"/>' +
      drive(234) + drive(322) +
      // monitor IBM 5151 appoggiato sull'unità
      '<path class="ibm-fig-ombra" d="M126 232L350 232L404 198L180 198Z"/>' +
      '<path class="be l" d="M124 66L348 66L399 34L175 34Z"/>' +
      '<path class="ibm-fig-luce" d="M124 66L348 66L399 34L175 34Z"/>' +
      '<g class="ibm-fig-fessure">' + fessure.join('') + '</g>' +
      '<path class="be2 l" d="M348 66L399 34L399 199L348 231Z"/>' +
      '<path class="ibm-fig-solco" d="M362 92L390 74M362 210L390 192"/>' +
      '<rect class="be l" x="124" y="66" width="224" height="165" rx="7"/>' +
      '<rect class="be3" x="138" y="80" width="196" height="128" rx="12"/>' +
      '<rect class="ibm-fig-schermo l" x="144" y="85" width="184" height="118" rx="10"/>' +
      '<rect class="ibm-fig-bagliore" x="150" y="90" width="172" height="108" rx="8"/>' +
      righe +
      '<text class="ibm-fig-prompt" x="156" y="190">A&gt;</text>' +
      '<rect class="ibm-fig-cursore" x="177" y="182" width="9" height="9"/>' +
      '<rect class="sc l1" x="140" y="216" width="30" height="8" rx="1.5"/>' +
      '<circle class="sc2 l1" cx="306" cy="220" r="4.5"/>' +
      '<circle class="sc2 l1" cx="322" cy="220" r="4.5"/>' +
      // tastiera Model F: piano dei tasti in obliquo, fronte e fianco
      '<path class="be2 l" d="M70 384L382 384L382 396L70 396Z"/>' +
      '<path class="be3 l" d="M382 384L434 351L434 363L382 396Z"/>' +
      '<g transform="matrix(1 0 0.8667 -0.55 70 384)">' +
      '<rect class="be l" x="0" y="0" width="312" height="60" rx="3"/>' +
      '<rect class="ibm-fig-luce" x="0" y="0" width="312" height="60" rx="3"/>' +
      tasti + '</g>' +
      '</svg>';
  }

  /* =====================================================================
   * Figura 2 · Il BIOS come contratto: stessi programmi e stesso DOS sopra,
   * stesse interruzioni, BIOS e hardware diversi sotto.
   * ===================================================================== */

  function figuraContratto() {
    const colonna = (x, ibm) => {
      const chip = (cx, cy, w, hh) => '<rect class="ch" x="' + cx + '" y="' + cy + '" width="' + w + '" height="' + hh + '" rx="2"/>';
      const scheda = ibm
        ? chip(x + 16, 292, 46, 18) + chip(x + 70, 292, 30, 18) + chip(x + 108, 292, 30, 18) + chip(x + 146, 292, 30, 18) + chip(x + 184, 292, 30, 18) +
          chip(x + 16, 318, 30, 14) + chip(x + 54, 318, 30, 14) + chip(x + 92, 318, 30, 14) + chip(x + 130, 318, 84, 14)
        : chip(x + 16, 292, 70, 40) + chip(x + 96, 292, 50, 18) + chip(x + 154, 292, 60, 18) + chip(x + 96, 318, 118, 14);
      return '<g>' +
        // tre sportelli: le stesse interruzioni da entrambe le parti
        ['10h', '13h', '16h'].map((t, i) => {
          const sx = x + 14 + i * 72;
          return '<path class="ibm-c-sportello l" d="M' + sx + ' 202V178Q' + sx + ' 170 ' + (sx + 8) + ' 170H' + (sx + 54) + 'Q' + (sx + 62) + ' 170 ' + (sx + 62) + ' 178V202Z"/>' +
            '<text class="ibm-c-int" x="' + (sx + 31) + '" y="193">' + t + '</text>';
        }).join('') +
        // il BIOS
        '<rect class="' + (ibm ? 'ibm-c-bios' : 'ibm-c-bios2') + ' l" x="' + x + '" y="202" width="230" height="64" rx="10"/>' +
        '<text class="ibm-c-t ' + (ibm ? 'scuro' : 'scuro') + '" x="' + (x + 115) + '" y="230">' + (ibm ? 'BIOS di IBM' : 'BIOS riscritto') + '</text>' +
        '<text class="ibm-c-s scuro" x="' + (x + 115) + '" y="254">' + (ibm ? '© protetto' : 'in camera bianca') + '</text>' +
        // l'hardware
        '<rect class="ibm-c-pcb l" x="' + x + '" y="280" width="230" height="64" rx="8"/>' + scheda +
        // nome della macchina
        '<text class="ibm-c-t inchiostro" x="' + (x + 115) + '" y="378">' + (ibm ? 'IBM PC' : 'Un compatibile') + '</text>' +
        '</g>';
    };
    return '<svg class="ibm-fig ibm-fig-contratto" viewBox="0 0 560 392" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><marker id="ibm-freccia" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" class="ibm-c-punta"/></marker></defs>' +
      '<rect class="ibm-c-prog l" x="40" y="14" width="480" height="58" rx="12"/>' +
      '<text class="ibm-c-t chiaro" x="280" y="50">Stessi programmi</text>' +
      '<rect class="ibm-c-dos l" x="40" y="84" width="480" height="52" rx="12"/>' +
      '<text class="ibm-c-t chiaro" x="280" y="117">Stesso DOS</text>' +
      '<path class="ibm-c-freccia" d="M155 138V164M425 138V164" marker-end="url(#ibm-freccia)"/>' +
      colonna(40, true) + colonna(290, false) +
      '<text class="ibm-c-uguale inchiostro" x="280" y="242">=</text>' +
      '</svg>';
  }

  /* =====================================================================
   * Laboratorio: "Dentro l'IBM PC 5150"
   * ===================================================================== */

  /* ---------- geometria del case: vista dall'alto, viewBox 680 × 560, 12 unità = 1 cm ----------
   * Il retro è in alto, il frontale in basso; sinistra e destra come guardando il PC di fronte.
   * Il vero 5150 è largo 50 cm e profondo 41: la scheda madre (21,6 × 30,5 cm) sta in fondo a sinistra,
   * l'alimentatore in fondo a destra, le due unità per dischetti davanti a destra, l'altoparlante davanti a sinistra. */
  const VB = { w: 680, h: 560 };
  const bX = (x) => n1(54.4 + 12 * x);   // cm dal bordo sinistro della scheda madre
  const bY = (y) => n1(46 + 12 * y);     // cm dal bordo posteriore della scheda madre

  // Pezzi che si spostano quando il case si apre: [dx, dy, sollevamento]
  const MOBILI = {
    psu: [16, -10, 1], driveB: [12, 16, 0.8], driveA: [-4, 16, 0.8], fdc: [8, -8, 1.6], mda: [-8, -6, 1.6], speaker: [-8, 10, 0.6],
  };
  const ORDINE_MOBILI = ['psu', 'driveB', 'driveA', 'fdc', 'mda', 'speaker'];

  // Riquadro di ogni pezzo (coordinate a case chiuso), pezzo mobile che lo trasporta, posizione del numero.
  const PEZZI = {
    cpu: { box: [90.4, 190, 62.4, 18], marca: [121.6, 199] },
    fpu: { box: [90.4, 226, 62.4, 18], marca: [121.6, 235] },
    bios: { box: [236.8, 257.2, 18, 38.4], marca: [245.8, 276.4] },
    basic: { box: [150.4, 257.2, 82.8, 38.4], marca: [191.8, 276.4] },
    ram: { box: [85.6, 310, 105, 99.6], marca: [138, 360] },
    slot: { box: [71.2, 53.2, 131.5, 106.8], marca: [137, 106] },
    video: { box: [66, 29, 20, 406], mobile: 'mda', marca: [68, 300] },
    fdc: { box: [188, 29, 20, 211], mobile: 'fdc', marca: [206, 92] },
    psu: { box: [383.2, 43.6, 256, 187.2], mobile: 'psu', marca: [520, 128] },
    floppy: { box: [272.8, 275.2, 352.8, 238.8], mobile: ['driveA', 'driveB'], marca: [356, 412] },
    speaker: { box: [96, 432, 68, 68], mobile: 'speaker', marca: [122, 476] },
    pit: { box: [217.6, 223.6, 36, 18], marca: [235.6, 232.6] },
    pic: { box: [217.6, 146.8, 43.2, 18], marca: [239.2, 155.8] },
    dma: { box: [217.6, 185.2, 62.4, 18], marca: [248.8, 194.2] },
    ppi: { box: [222.4, 98.8, 62.4, 36], marca: [253.6, 107.8] },
    din: { box: [220, 43.6, 60, 26.4], marca: [250, 57] },
  };

  // Riquadro di un pezzo a case aperto (con lo spostamento dei pezzi mobili).
  function boxAperto(id) {
    const p = PEZZI[id];
    let [x, y, w, hh] = p.box;
    if (Array.isArray(p.mobile)) {
      // le due unità si allontanano in modo diverso: si prende il riquadro che le contiene entrambe
      const a = MOBILI[p.mobile[0]], b = MOBILI[p.mobile[1]];
      const x0 = x + Math.min(a[0], b[0]), x1 = x + w + Math.max(a[0], b[0]);
      return [x0, y + Math.min(a[1], b[1]), x1 - x0, hh];
    }
    if (p.mobile) { x += MOBILI[p.mobile][0]; y += MOBILI[p.mobile][1]; }
    return [x, y, w, hh];
  }

  function chipSvg(x, y, w, hh, sigla, extra) {
    const orizz = w >= hh;
    const pin = orizz
      ? '<path class="ibm-k-pin" d="M' + n1(x + 2) + ' ' + n1(y - 1.2) + 'H' + n1(x + w - 2) + 'M' + n1(x + 2) + ' ' + n1(y + hh + 1.2) + 'H' + n1(x + w - 2) + '"/>'
      : '<path class="ibm-k-pin" d="M' + n1(x - 1.2) + ' ' + n1(y + 2) + 'V' + n1(y + hh - 2) + 'M' + n1(x + w + 1.2) + ' ' + n1(y + 2) + 'V' + n1(y + hh - 2) + '"/>';
    const tacca = orizz
      ? '<path class="ibm-k-tacca" d="M' + n1(x) + ' ' + n1(y + hh / 2 - 3) + 'a3 3 0 0 1 0 6"/>'
      : '<path class="ibm-k-tacca" d="M' + n1(x + w / 2 - 3) + ' ' + n1(y) + 'a3 3 0 0 0 6 0"/>';
    return pin + '<rect class="ibm-k-chip' + (extra ? ' ' + extra : '') + '" x="' + n1(x) + '" y="' + n1(y) + '" width="' + n1(w) + '" height="' + n1(hh) + '" rx="1.6"/>' + tacca +
      (sigla ? '<text class="ibm-k-sigla" x="' + n1(x + w / 2) + '" y="' + n1(y + hh / 2 + 4.8) + '">' + sigla + '</text>' : '');
  }

  function zoccoloSvg(x, y, w, hh) {
    const fori = [];
    const orizz = w >= hh;
    const nf = Math.round((orizz ? w : hh) / 3.05) - 1;
    for (let i = 0; i < nf; i++) {
      const t = 2.6 + i * 3.05;
      if (orizz) fori.push('M' + n1(x + t) + ' ' + n1(y + 3.4) + 'h0.01M' + n1(x + t) + ' ' + n1(y + hh - 3.4) + 'h0.01');
      else fori.push('M' + n1(x + 3.4) + ' ' + n1(y + t) + 'h0.01M' + n1(x + w - 3.4) + ' ' + n1(y + t) + 'h0.01');
    }
    return '<rect class="ibm-k-zoccolo" x="' + n1(x) + '" y="' + n1(y) + '" width="' + n1(w) + '" height="' + n1(hh) + '" rx="1.6"/>' +
      '<path class="ibm-k-fori" d="' + fori.join('') + '"/>';
  }

  function svgCase(ids) {
    const o = [];
    // telaio di lamiera e fondo
    o.push('<rect class="ibm-k-telaio" x="40" y="34" width="600" height="492" rx="5"/>');
    o.push('<rect class="ibm-k-fondo" x="47" y="41" width="586" height="478" rx="2"/>');
    [[92, 430], [600, 260], [600, 470], [340, 470]].forEach(([x, y]) => o.push('<circle class="ibm-k-borchia" cx="' + x + '" cy="' + y + '" r="4"/>'));

    // scheda madre
    o.push('<rect class="ibm-k-pcb" x="54.4" y="46" width="259.2" height="366" rx="3"/>');
    const piste = [];
    for (let i = 0; i < 11; i++) piste.push('M62 ' + (60 + i * 9) + 'H212');                         // bus che attraversa gli slot
    piste.push('M152 199H164M152 235H164M190 197H217M190 233H217M210 152H217M124 208V226M124 244V256',
      'M140 296V310M160 296V310M200 296V318M246 296V306H262M88 300H300M296 140V250M66 170V420M86 300V306',
      'M222 70V98M262 70V98M300 116V140M232 136V146M232 165V185M252 204V223M200 410V420');
    o.push('<path class="ibm-k-piste" d="' + piste.join('') + '"/>');
    [[60, 52], [306, 52], [60, 406], [306, 250], [176, 406]].forEach(([x, y]) => o.push('<circle class="ibm-k-foro" cx="' + x + '" cy="' + y + '" r="3.4"/>'));

    // cinque slot di espansione (I/O channel, 62 contatti)
    for (let i = 0; i < 5; i++) {
      const x = n1(71.2 + 30.48 * i);
      o.push('<rect class="ibm-k-slot" x="' + x + '" y="53.2" width="9.6" height="106.8" rx="1.5"/>' +
        '<path class="ibm-k-contatti" d="M' + n1(x + 4.8) + ' 57V156"/>');
    }
    // processore, zoccolo del coprocessore, clock, quarzo, controller del bus
    o.push(chipSvg(90.4, 190, 62.4, 18, '8088'));
    o.push(zoccoloSvg(90.4, 226, 62.4, 18));
    o.push(chipSvg(164.8, 192.4, 24, 9.6, ''), '<rect class="ibm-k-quarzo" x="166" y="208.6" width="18" height="6.4" rx="3.2"/>', chipSvg(164.8, 228.4, 24, 9.6, ''));
    // chip di supporto
    o.push(chipSvg(217.6, 146.8, 43.2, 18, '8259'));
    o.push(chipSvg(217.6, 185.2, 62.4, 18, '8237'));
    o.push(chipSvg(217.6, 223.6, 36, 18, '8253'));
    o.push(chipSvg(222.4, 98.8, 62.4, 18, '8255'));
    // interruttori DIP (SW1 e SW2)
    [222.4, 256].forEach((x) => {
      let leve = '';
      for (let k = 0; k < 8; k++) leve += '<rect class="ibm-k-leva" x="' + n1(x + 2.2 + k * 3.35) + '" y="' + (k % 3 === 0 ? 127.4 : 130.4) + '" width="2" height="3"/>';
      o.push('<rect class="ibm-k-dip" x="' + x + '" y="125.2" width="28.8" height="9.6" rx="1"/>' + leve);
    });
    // prese DIN (cassette, tastiera) e connettori dell'alimentazione P8/P9
    [220, 253.6].forEach((x) => o.push('<rect class="ibm-k-din" x="' + x + '" y="43.6" width="26.4" height="26.4" rx="2"/><circle class="ibm-k-din-foro" cx="' + n1(x + 13.2) + '" cy="56.8" r="7.5"/>'));
    o.push('<rect class="ibm-k-connettore" x="289.6" y="74.8" width="16.8" height="40.8" rx="1.5"/>' +
      '<path class="ibm-k-fori" d="M298 80h.01M298 86h.01M298 92h.01M298 98h.01M298 104h.01M298 110h.01"/>');
    // ROM: uno zoccolo libero, quattro ROM del BASIC, la ROM del BIOS
    o.push(zoccoloSvg(128.8, 257.2, 18, 38.4));
    [150.4, 172, 193.6, 215.2].forEach((x) => o.push(chipSvg(x, 257.2, 18, 38.4, '', 'rom')));
    o.push(chipSvg(236.8, 257.2, 18, 38.4, '', 'rom bios'));
    // quattro file di nove chip di RAM (8 bit + parità)
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 9; c++) {
        o.push('<rect class="ibm-k-chip ram' + (c === 8 ? ' parita' : '') + '" x="' + n1(85.6 + 12 * c) + '" y="' + n1(310 + 25.2 * r) + '" width="9" height="22.8" rx="1.2"/>');
      }
    }
    // logica TTL e condensatori, per completare la scheda
    [[90, 172], [118, 172], [146, 172], [204, 314], [232, 314], [204, 344], [232, 344], [204, 374], [232, 374]].forEach(([x, y]) => o.push(chipSvg(x, y, 22.8, 9, '')));
    [[289.6, 142], [289.6, 172], [289.6, 202], [289.6, 232]].forEach(([x, y]) => o.push(chipSvg(x, y, 9, 22.8, '')));
    [[158, 186], [158, 222], [214, 142], [214, 181], [214, 219], [196, 304], [262, 304], [82, 306]].forEach(([x, y]) => o.push('<circle class="ibm-k-cond" cx="' + x + '" cy="' + y + '" r="2.6"/>'));

    // cavi (spariscono quando i pezzi si separano)
    o.push('<g class="ibm-k-cavi" data-ibm="cavi">' +
      '<path class="ibm-k-piattina" d="M206 238C206 262 300 252 306 284"/>' +
      '<path class="ibm-k-piattina-righe" d="M206 238C206 262 300 252 306 284"/>' +
      '<g class="ibm-k-fili"><path class="f1" d="M383 136C350 136 330 100 306 96"/><path class="f2" d="M383 140C348 140 328 104 306 100"/><path class="f3" d="M383 144C346 144 326 108 306 104"/><path class="f4" d="M383 148C344 148 324 112 306 108"/>' +
      '<path class="f4" d="M440 231C440 252 400 252 400 276"/><path class="f3" d="M444 231C444 254 404 254 404 276"/><path class="f1" d="M560 231C560 252 540 252 540 276"/><path class="f4" d="M564 231C564 254 544 254 544 276"/>' +
      '<path class="f2" d="M150 412C150 440 140 446 136 452"/><path class="f3" d="M154 412C154 440 146 446 142 452"/></g>' +
      '</g>');

    // ombre dei pezzi mobili (crescono quando si sollevano)
    const ombre = { psu: [383.2, 43.6, 247.2, 187.2, 4], driveA: [272.8, 275.2, 175.2, 238.8, 3], driveB: [450.4, 275.2, 175.2, 238.8, 3], mda: [70.6, 35.2, 10.8, 399.6, 2], fdc: [192.5, 35.2, 10.8, 204, 2], speaker: [100, 436, 60, 60, 30] };
    o.push('<g class="ibm-k-ombre">' + ORDINE_MOBILI.map((id) => {
      const [x, y, w, hh, r] = ombre[id];
      return '<rect class="ibm-k-ombra" opacity="0" data-ombra="' + id + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" rx="' + r + '"/>';
    }).join('') + '</g>');

    // scheda video MDA (slot 1, lunga) e controller dei dischetti (slot 5, corta), viste di taglio
    const scheda = (id, x, y1) => {
      let comp = '';
      for (let y = 52; y < y1 - 18; y += 34) comp += '<rect class="ibm-k-comp" x="' + n1(x + 4) + '" y="' + y + '" width="6.4" height="' + (id === 'mda' && y > 240 && y < 300 ? 26 : 20) + '" rx="1"/>';
      return '<g data-mobile="' + id + '">' +
        '<rect class="ibm-k-staffa" x="' + n1(x - 2.4) + '" y="29" width="15.6" height="14" rx="1.5"/>' +
        '<rect class="ibm-k-scheda" x="' + x + '" y="35.2" width="10.8" height="' + n1(y1 - 35.2) + '" rx="1.5"/>' +
        '<rect class="ibm-k-scheda-bordo" x="' + x + '" y="35.2" width="3" height="' + n1(y1 - 35.2) + '"/>' + comp + '</g>';
    };
    o.push(scheda('mda', 70.6, 434.8), scheda('fdc', 192.5, 239.2));
    o.push('<rect class="ibm-k-guida" x="58" y="430" width="156" height="12" rx="3"/>');

    // alimentatore da 63,5 W, con l'interruttore rosso che esce dal fianco destro
    let feritoie = '';
    for (let i = 0; i < 12; i++) feritoie += 'M' + (398 + i * 18) + ' 206v14';
    o.push('<g data-mobile="psu">' +
      '<rect class="ibm-k-interruttore" x="630" y="64" width="22" height="34" rx="3"/>' +
      '<rect class="ibm-k-ali" x="383.2" y="43.6" width="247.2" height="187.2" rx="4"/>' +
      '<rect class="ibm-k-ali-piano" x="391" y="51" width="231.6" height="146" rx="3"/>' +
      '<path class="ibm-k-feritoie" d="' + feritoie + '"/>' +
      '<rect class="ibm-k-etichetta" x="430" y="78" width="132" height="76" rx="3"/>' +
      '<path class="ibm-k-etichetta-righe" d="M442 94H530M442 106H550M442 118H512M442 130H544M442 142H500"/>' +
      '<circle class="ibm-k-vite-ali" cx="398" cy="58" r="3.4"/><circle class="ibm-k-vite-ali" cx="615" cy="58" r="3.4"/>' +
      '</g>');

    // due unità per dischetti Tandon da 5,25" (davanti a destra)
    const drive = (id, x) => {
      let ic = '';
      [[x + 26, 300], [x + 70, 300], [x + 114, 300], [x + 26, 344]].forEach(([cx, cy]) => { ic += chipSvg(cx, cy, 30, 11, ''); });
      return '<g data-mobile="' + id + '">' +
        '<rect class="ibm-k-drive" x="' + x + '" y="275.2" width="175.2" height="238.8" rx="3"/>' +
        '<rect class="ibm-k-drive-pcb" x="' + n1(x + 10) + '" y="285" width="155.2" height="118" rx="2"/>' + ic +
        '<rect class="ibm-k-connettore" x="' + n1(x + 120) + '" y="279" width="40" height="7" rx="1"/>' +
        '<circle class="ibm-k-motore" cx="' + n1(x + 87.6) + '" cy="452" r="26"/>' +
        '<circle class="ibm-k-motore-centro" cx="' + n1(x + 87.6) + '" cy="452" r="9"/>' +
        '<rect class="ibm-k-testina" x="' + n1(x + 128) + '" y="420" width="22" height="60" rx="2"/>' +
        '<rect class="ibm-k-frontalino" x="' + x + '" y="503" width="175.2" height="11" rx="1.5"/>' +
        '<rect class="ibm-k-leva-drive" x="' + n1(x + 74) + '" y="505" width="28" height="6" rx="2"/>' +
        '<rect class="ibm-k-led" x="' + n1(x + 12) + '" y="506" width="9" height="4" rx="1"/>' +
        '</g>';
    };
    o.push(drive('driveA', 272.8), drive('driveB', 450.4));

    // altoparlante (davanti a sinistra)
    o.push('<g data-mobile="speaker">' +
      '<rect class="ibm-k-staffa-cassa" x="100" y="454" width="60" height="24" rx="3"/>' +
      '<circle class="ibm-k-cassa" cx="130" cy="466" r="30"/><circle class="ibm-k-cono" cx="130" cy="466" r="23"/>' +
      '<circle class="ibm-k-cono-anello" cx="130" cy="466" r="15"/><circle class="ibm-k-cupola" cx="130" cy="466" r="8"/>' +
      '</g>');

    // riquadro di selezione (si sposta da un pezzo all'altro)
    o.push('<g class="ibm-k-fuoco" data-ibm="fuoco" opacity="0"><rect class="ibm-k-fuoco-alone" rx="9"/><rect class="ibm-k-fuoco-linea" rx="6"/></g>');

    // coperchio con le viti sul retro, e frontale di plastica
    o.push('<g data-ibm="coperchio">' +
      '<rect class="ibm-k-coperchio" x="36" y="30" width="608" height="484" rx="8"/>' +
      '<rect class="ibm-k-coperchio-luce" x="56" y="48" width="568" height="8" rx="4"/>' +
      '<path class="ibm-k-coperchio-piega" d="M40 64H640M40 500H640"/>' +
      [56, 340, 624].map((x, i) => '<g data-vite="' + i + '"><circle class="ibm-k-vite" cx="' + x + '" cy="40" r="6.5"/><path class="ibm-k-vite-taglio" d="M' + (x - 4) + ' 40H' + (x + 4) + 'M' + x + ' 36V44"/></g>').join('') +
      '</g>');
    o.push('<rect class="ibm-k-frontale" x="36" y="512" width="608" height="16" rx="4"/>' +
      '<rect class="ibm-k-frontale-buco" x="273" y="515" width="175" height="10" rx="2"/><rect class="ibm-k-frontale-buco" x="450.6" y="515" width="175" height="10" rx="2"/>');

    return '<svg class="lab-svg ibm-case-svg" viewBox="0 0 ' + VB.w + ' ' + VB.h + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="' + ids.titolo + '">' +
      '<title id="' + ids.titolo + '">Vista dall\'alto dell\'IBM PC 5150: scheda madre, slot, alimentatore, unità per dischetti e altoparlante</title>' +
      o.join('') + '</svg>';
  }

  /* ---------- piccolo motore di animazione a fasi (requestAnimationFrame) ---------- */

  // passi: [{ at, dur, ease, update(k) }]. Con movimento ridotto applica subito lo stato finale.
  function sequenza(ctx, passi, fine) {
    let id = 0, t0 = 0, finita = false;
    const totale = passi.reduce((m, p) => Math.max(m, p.at + p.dur), 0);
    function applica(t) {
      for (const p of passi) {
        const k = ctx.clamp((t - p.at) / (p.dur || 1), 0, 1);
        if (k !== p.k) { p.k = k; p.update((ctx.curve[p.ease] || ctx.curve.smooth)(k), k); }
      }
    }
    function chiudi() { if (finita) return; finita = true; if (fine) fine(); }
    function frame(now) {
      if (finita) return;
      if (!t0) t0 = now;
      applica(now - t0);
      if (now - t0 < totale) id = requestAnimationFrame(frame); else chiudi();
    }
    if (ctx.ridotto() || !totale) { applica(Infinity); chiudi(); return { salta() {}, attiva: () => false }; }
    id = requestAnimationFrame(frame);
    return {
      salta() { if (finita) return; cancelAnimationFrame(id); applica(Infinity); chiudi(); },
      attiva: () => !finita,
    };
  }

  /* =====================================================================
   * Laboratorio: "Dentro l'IBM PC 5150"
   * ===================================================================== */

  function creaLab(el, ctx) {
    const { h, s } = ctx;
    if (!M) { el.append(h('p', { class: 'lab-errore' }, 'I dati del laboratorio non sono stati caricati.')); return {}; }

    const C = M.COMPONENTI;
    const timers = new Set();
    let attivo = false;
    let vista = 'case';
    const dopo = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };

    const radice = h('div', { class: 'ibm-lab' });
    const nota = h('p', { class: 'lab-note ibm-nota', 'aria-live': 'polite' });
    const segVista = h('div', { class: 'lab-seg ibm-viste', role: 'group', 'aria-label': 'Vista del laboratorio' });
    const btnVista = {};
    [['case', 'Apri il case'], ['mappa', 'La mappa della memoria']].forEach(([id, nome]) => {
      const b = h('button', { type: 'button', 'aria-pressed': String(id === vista), onclick: () => mostraVista(id, true) }, nome);
      btnVista[id] = b;
      segVista.append(b);
    });
    const vCase = h('div', { class: 'ibm-vista ibm-vista-case' });
    const vMappa = h('div', { class: 'ibm-vista ibm-vista-mappa', hidden: true });
    radice.append(segVista, vCase, vMappa, nota);
    el.append(radice);

    /* ================= vista 1: apri il case ================= */

    const ids = { titolo: ctx.uid('ibm-case') };
    const svg = ctx.svgDaTesto(svgCase(ids));
    const q = (sel) => svg.querySelector(sel);
    const coperchio = q('[data-ibm="coperchio"]');
    const viti = [0, 1, 2].map((i) => q('[data-vite="' + i + '"]'));
    const cavi = q('[data-ibm="cavi"]');
    const fuoco = q('[data-ibm="fuoco"]');
    const fuocoAlone = fuoco.firstChild, fuocoLinea = fuoco.lastChild;
    const mobili = {};
    ORDINE_MOBILI.forEach((id) => {
      const g = q('[data-mobile="' + id + '"]');
      const bb = { psu: [506.8, 137.2], driveA: [360.4, 394.6], driveB: [538, 394.6], mda: [76, 232], fdc: [198, 134], speaker: [130, 466] }[id];
      mobili[id] = { g: g, ombra: q('[data-ombra="' + id + '"]'), c: bb, v: MOBILI[id] };
    });

    const tavolo = h('div', { class: 'ibm-tavolo' }, svg);
    const marche = C.map((c, i) => {
      const [x, y] = PEZZI[c.id].marca;
      const m = h('span', { class: 'ibm-marca', 'aria-hidden': 'true', style: 'left:' + n1(100 * x / VB.w) + '%;top:' + n1(100 * y / VB.h) + '%' },
        h('span', { class: 'ibm-marca-onda' }), h('span', { class: 'ibm-marca-num' }, String(i + 1)));
      tavolo.append(m);
      return m;
    });
    tavolo.append(h('span', { class: 'ibm-orient ibm-orient-retro', 'aria-hidden': 'true' }, 'retro'),
      h('span', { class: 'ibm-orient ibm-orient-fronte', 'aria-hidden': 'true' }, 'fronte'));

    const btnApri = h('button', { type: 'button', class: 'lab-btn primary ibm-apri', onclick: () => (aperto ? chiudiCase() : apriCase()) }, 'Apri il case');
    const btnPrec = h('button', { type: 'button', class: 'lab-btn ibm-passo', 'aria-label': 'Pezzo precedente', onclick: () => passo(-1) }, h('span', { 'aria-hidden': 'true' }, '◀'));
    const btnSucc = h('button', { type: 'button', class: 'lab-btn ibm-passo', 'aria-label': 'Pezzo successivo', onclick: () => passo(1) }, h('span', { 'aria-hidden': 'true' }, '▶'));
    const contatore = h('span', { class: 'lab-readout ibm-contatore', 'aria-hidden': 'true' }, '– / ' + C.length);
    const btnGiro = h('button', { type: 'button', class: 'lab-btn ibm-giro', 'aria-pressed': 'false', onclick: () => (giro ? fermaGiro(true) : avviaGiro()) }, 'Visita guidata');
    const comandi = h('div', { class: 'lab-controls ibm-comandi' }, btnApri, h('span', { class: 'ibm-passi' }, btnPrec, contatore, btnSucc), btnGiro);

    // scheda informativa del pezzo scelto
    const scNum = h('span', { class: 'ibm-scheda-num', 'aria-hidden': 'true' }, '?');
    const scGruppo = h('p', { class: 'ibm-scheda-gruppo' }, 'Il case è chiuso');
    const scNome = h('h4', { class: 'ibm-scheda-nome' }, 'IBM PC 5150');
    const scTesto = h('p', { class: 'ibm-scheda-testo' }, 'Dentro la scatola beige ci sono la scheda madre con il processore e la memoria, cinque slot per le schede, l\'alimentatore e le unità per dischetti. Apri il case per vederli da vicino.');
    const scDati = h('dl', { class: 'lab-kv ibm-scheda-dati' });
    const btnMappa = h('button', { type: 'button', class: 'lab-btn ibm-vai-mappa', hidden: true, onclick: () => vaiAllaMappa() }, 'Vedi dove sta in memoria →');
    const scCorpo = h('div', { class: 'ibm-scheda-corpo' }, h('div', { class: 'ibm-scheda-testa' }, scNum, h('div', null, scGruppo, scNome)), scTesto, scDati, btnMappa);
    const scheda = h('div', { class: 'lab-panel ibm-scheda' }, scCorpo);

    // legenda: un pulsante per pezzo, con le frecce della tastiera (tabindex mobile)
    const legenda = h('div', { class: 'ibm-legenda', role: 'group', 'aria-label': 'Pezzi dell\'IBM PC 5150 (frecce per scorrere)' });
    const chip = C.map((c, i) => {
      const b = h('button', { type: 'button', class: 'ibm-chip', 'aria-pressed': 'false', tabindex: i === 0 ? '0' : '-1', onclick: () => scegli(i, 'chip') },
        h('span', { class: 'ibm-chip-num', 'aria-hidden': 'true' }, String(i + 1)), h('span', { class: 'ibm-chip-nome' }, c.nome));
      legenda.append(b);
      return b;
    });
    legenda.addEventListener('keydown', (e) => {
      const i = chip.indexOf(document.activeElement);
      if (i < 0) return;
      let j = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % C.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + C.length) % C.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = C.length - 1;
      if (j == null) return;
      e.preventDefault();
      chip[j].focus();
      scegli(j, 'chip');
    });

    vCase.append(comandi,
      h('div', { class: 'ibm-case-griglia' }, h('div', { class: 'ibm-case-sx' }, tavolo, legenda), scheda));

    let aperto = false;
    let animCase = null;
    let sel = -1;
    let inAttesa = null;   // pezzo da scegliere appena il case è aperto
    let giro = null;       // visita guidata
    let giroTimer = 0;
    const box = { x: 0, y: 0, w: 0, h: 0, op: 0 };
    let animBox = null;

    const posa = (g, dx, dy, k, cx, cy) => g.setAttribute('transform',
      'translate(' + n1(dx + cx) + ' ' + n1(dy + cy) + ') scale(' + k.toFixed(4) + ') translate(' + (-cx) + ' ' + (-cy) + ')');

    function statoMobile(id, k) {
      const m = mobili[id];
      const [dx, dy, lift] = m.v;
      posa(m.g, dx * k, dy * k, 1 + 0.022 * lift * k, m.c[0], m.c[1]);
      m.ombra.setAttribute('transform', 'translate(' + n1(dx * k + 4 * lift * k) + ' ' + n1(dy * k + 6 * lift * k) + ')');
      m.ombra.setAttribute('opacity', (0.42 * k).toFixed(3));
    }
    function statoVite(i, k) {
      const x = [56, 340, 624][i];
      viti[i].setAttribute('transform', 'rotate(' + n1(-720 * k) + ' ' + x + ' 40)');
      viti[i].setAttribute('opacity', (1 - ctx.clamp((k - 0.55) / 0.45, 0, 1)).toFixed(3));
    }
    function statoCoperchio(k) {
      coperchio.setAttribute('transform', 'translate(0 ' + n1(84 * k) + ')');
      coperchio.setAttribute('opacity', (1 - k).toFixed(3));
      coperchio.style.visibility = k >= 1 ? 'hidden' : '';
    }
    function statoMarca(i, k) {
      marche[i].style.opacity = String(ctx.clamp(k * 1.6, 0, 1));
      marche[i].style.transform = 'translate(-50%, -50%) scale(' + Math.max(0, k).toFixed(3) + ')';
    }

    // Le fasi dell'apertura; la chiusura le ripercorre al contrario, un po' più in fretta.
    function fasi() {
      const f = [];
      viti.forEach((_, i) => f.push({ at: i * 90, dur: 440, ease: 'inOut', update: (k) => statoVite(i, k) }));
      f.push({ at: 380, dur: 620, ease: 'smooth', update: statoCoperchio });
      f.push({ at: 640, dur: 320, ease: 'linear', update: (k) => cavi.setAttribute('opacity', (1 - k).toFixed(3)) });
      ORDINE_MOBILI.forEach((id, j) => f.push({ at: 780 + j * 80, dur: 640, ease: 'smooth', update: (k) => statoMobile(id, k) }));
      marche.forEach((_, i) => f.push({ at: 1280 + i * 34, dur: 420, ease: 'bounce', update: (k) => statoMarca(i, k) }));
      return f;
    }
    function fasiInverse() {
      const f = fasi();
      const tot = f.reduce((m, p) => Math.max(m, p.at + p.dur), 0);
      return f.map((p) => ({ at: (tot - p.at - p.dur) * 0.7, dur: p.dur * 0.7, ease: p.ease === 'bounce' ? 'sharp' : 'inOut', update: (k) => p.update(1 - k) }));
    }

    function aggiornaBottoni() {
      btnApri.textContent = aperto ? 'Chiudi il case' : 'Apri il case';
      tavolo.classList.toggle('aperto', aperto);
    }

    function apriCase(pezzo) {
      if (pezzo != null) inAttesa = pezzo;
      if (animCase) animCase.salta();
      if (aperto) { if (inAttesa != null) { const p = inAttesa; inAttesa = null; scegli(p, 'auto'); } return; }
      aperto = true;
      aggiornaBottoni();
      ctx.annuncia(nota, ctx.ridotto() ? 'Il case è aperto.' : 'Si svitano le viti sul retro, il coperchio scivola in avanti e i pezzi si separano.');
      animCase = sequenza(ctx, fasi(), () => {
        animCase = null;
        const p = inAttesa != null ? inAttesa : (sel >= 0 ? sel : 0);
        inAttesa = null;
        scegli(p, 'auto');
      });
    }

    function chiudiCase() {
      if (animCase) animCase.salta();
      if (!aperto) return;
      fermaGiro(false);
      aperto = false;
      aggiornaBottoni();
      nascondiFuoco();
      marche.forEach((m) => m.classList.remove('on'));
      sel = -1;
      aggiornaLegenda();
      mostraSchedaChiusa();
      ctx.annuncia(nota, 'I pezzi tornano al loro posto, il coperchio scivola indietro e le viti si riavvitano.');
      animCase = sequenza(ctx, fasiInverse(), () => { animCase = null; });
    }

    function mostraSchedaChiusa() {
      cambiaScheda(() => {
        scNum.textContent = '?';
        scGruppo.textContent = 'Il case è chiuso';
        scNome.textContent = 'IBM PC 5150';
        scTesto.textContent = 'Dentro la scatola beige ci sono la scheda madre con il processore e la memoria, cinque slot per le schede, l\'alimentatore e le unità per dischetti. Apri il case per vederli da vicino.';
        scDati.replaceChildren();
        btnMappa.hidden = true;
        contatore.textContent = '– / ' + C.length;
      });
    }

    function cambiaScheda(riempi) {
      if (ctx.ridotto()) { riempi(); return; }
      scCorpo.classList.add('cambio');
      dopo(140, () => { riempi(); scCorpo.classList.remove('cambio'); });
    }

    function aggiornaLegenda() {
      chip.forEach((b, i) => {
        b.setAttribute('aria-pressed', String(i === sel));
        b.setAttribute('tabindex', i === (sel >= 0 ? sel : 0) ? '0' : '-1');
      });
    }

    function nascondiFuoco() {
      if (animBox) animBox.cancel();
      box.op = 0;
      fuoco.setAttribute('opacity', '0');
    }

    function disegnaFuoco() {
      const pad = 6;
      fuocoLinea.setAttribute('x', n1(box.x - pad)); fuocoLinea.setAttribute('y', n1(box.y - pad));
      fuocoLinea.setAttribute('width', n1(box.w + 2 * pad)); fuocoLinea.setAttribute('height', n1(box.h + 2 * pad));
      fuocoAlone.setAttribute('x', n1(box.x - pad - 3)); fuocoAlone.setAttribute('y', n1(box.y - pad - 3));
      fuocoAlone.setAttribute('width', n1(box.w + 2 * pad + 6)); fuocoAlone.setAttribute('height', n1(box.h + 2 * pad + 6));
      fuoco.setAttribute('opacity', box.op.toFixed(3));
    }

    function spostaFuoco(id) {
      const [x, y, w, hh] = boxAperto(id);
      if (animBox) animBox.cancel();
      const da = box.op > 0.01 ? { x: box.x, y: box.y, w: box.w, h: box.h, op: box.op } : { x: x - 16, y: y - 16, w: w + 32, h: hh + 32, op: 0 };
      animBox = ctx.tween({
        from: 0, to: 1, dur: ctx.motion.dur.normal + 60, ease: 'smooth',
        update: (k) => {
          box.x = ctx.lerp(da.x, x, k); box.y = ctx.lerp(da.y, y, k);
          box.w = ctx.lerp(da.w, w, k); box.h = ctx.lerp(da.h, hh, k);
          box.op = ctx.lerp(da.op, 1, k);
          disegnaFuoco();
        },
      });
    }

    // origine: 'chip', 'passo', 'disegno', 'giro', 'auto'
    function scegli(i, origine) {
      if (origine !== 'giro' && origine !== 'auto') fermaGiro(false);
      if (aperto && animCase && animCase.attiva()) { inAttesa = i; return; }
      if (!aperto) { apriCase(i); return; }
      sel = i;
      const c = C[i];
      aggiornaLegenda();
      marche.forEach((m, j) => m.classList.toggle('on', j === i));
      spostaFuoco(c.id);
      cambiaScheda(() => {
        scNum.textContent = String(i + 1);
        scGruppo.textContent = c.gruppo;
        scNome.textContent = c.nome;
        scTesto.innerHTML = c.testo;
        scDati.replaceChildren(...c.dati.map(([k, v]) => h('div', null, h('dt', null, k), h('dd', null, v))));
        btnMappa.hidden = !c.mappa;
        contatore.textContent = (i + 1) + ' / ' + C.length;
      });
      if (origine !== 'auto' || giro) ctx.annuncia(nota, 'Pezzo ' + (i + 1) + ' di ' + C.length + ': ' + c.nome.replace(/<[^>]+>/g, '') + '. ' + (giro ? 'Visita guidata in corso.' : 'Usa le frecce o tocca il disegno per cambiare pezzo.'));
      else ctx.annuncia(nota, 'Il case è aperto. Tocca un pezzo sul disegno, oppure usa i pulsanti numerati e le frecce.');
      // sul telefono la legenda scorre di lato: porta in vista il pulsante scelto
      const b = chip[i];
      if (legenda.scrollWidth > legenda.clientWidth + 4) {
        const x = b.offsetLeft - (legenda.clientWidth - b.offsetWidth) / 2;
        legenda.scrollTo({ left: Math.max(0, x), behavior: ctx.ridotto() ? 'auto' : 'smooth' });
      }
    }

    function passo(d) {
      if (!aperto) { apriCase(d > 0 ? 0 : C.length - 1); return; }
      const i = sel < 0 ? 0 : (sel + d + C.length) % C.length;
      scegli(i, 'passo');
    }

    function avviaGiro() {
      giro = true;
      btnGiro.setAttribute('aria-pressed', 'true');
      btnGiro.textContent = 'Ferma la visita';
      const avanti = () => {
        if (!giro) return;
        if (!aperto) apriCase(0);
        else scegli(sel < 0 ? 0 : (sel + 1) % C.length, 'giro');
        giroTimer = dopo(4200, avanti);
      };
      if (!aperto) { apriCase(sel < 0 ? 0 : sel); giroTimer = dopo(ctx.ridotto() ? 4200 : 6000, avanti); }
      else { scegli(sel < 0 ? 0 : sel, 'giro'); giroTimer = dopo(4200, avanti); }
    }

    function fermaGiro(annuncio) {
      if (!giro) return;
      giro = null;
      clearTimeout(giroTimer);
      timers.delete(giroTimer);
      btnGiro.setAttribute('aria-pressed', 'false');
      btnGiro.textContent = 'Visita guidata';
      if (annuncio) ctx.annuncia(nota, 'Visita guidata fermata.');
    }

    // Toccare il disegno sceglie il pezzo più vicino (il più piccolo, se il punto cade in più riquadri).
    function puntoSvg(e) {
      const m = svg.getScreenCTM();
      if (!m) return null;
      const p = svg.createSVGPoint();
      p.x = e.clientX; p.y = e.clientY;
      return p.matrixTransform(m.inverse());
    }
    function piuVicino(pt) {
      let best = -1, bd = Infinity, ba = Infinity;
      C.forEach((c, i) => {
        const [x, y, w, hh] = boxAperto(c.id);
        const dx = Math.max(x - pt.x, 0, pt.x - (x + w));
        const dy = Math.max(y - pt.y, 0, pt.y - (y + hh));
        const d = Math.hypot(dx, dy);
        const a = w * hh;
        if (d < bd - 0.5 || (Math.abs(d - bd) <= 0.5 && a < ba)) { best = i; bd = d; ba = a; }
      });
      return bd <= 26 ? best : -1;
    }
    tavolo.addEventListener('click', (e) => {
      if (!aperto) { apriCase(); return; }
      const pt = puntoSvg(e);
      if (!pt) return;
      const i = piuVicino(pt);
      if (i >= 0) scegli(i, 'disegno');
    });
    tavolo.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const pt = aperto ? puntoSvg(e) : null;
      const i = pt ? piuVicino(pt) : -1;
      marche.forEach((m, j) => m.classList.toggle('sopra', j === i));
      tavolo.classList.toggle('punta', !aperto || i >= 0);
    });
    tavolo.addEventListener('pointerleave', () => marche.forEach((m) => m.classList.remove('sopra')));

    /* ================= vista 2: la mappa della memoria ================= */

    const st = { seg: 0xB800, off: 0x0000, a20: false };
    const vis = { base: 0xB8000, off: 0, m: 0xB8000, mOp: 1, mDy: 0 };
    let L = null;
    let animMappa = null;
    let annuncioTimer = 0;
    const idM = { clip: ctx.uid('ibm-clip'), trat: ctx.uid('ibm-trat'), seg: ctx.uid('ibm-seg'), off: ctx.uid('ibm-off'), err: ctx.uid('ibm-err'), tit: ctx.uid('ibm-mtit') };

    const legendaMappa = h('ul', { class: 'ibm-mappa-legenda', 'aria-label': 'Zone della memoria' },
      M.MAPPA.concat([M.OLTRE]).map((z) => h('li', { class: 'c-' + z.colore },
        h('span', { class: 'ibm-sw', 'aria-hidden': 'true' }), h('span', null, z.breve), h('span', { class: 'ibm-kb' }, M.dimensioneKB(z) >= 1 ? Math.round(M.dimensioneKB(z)) + ' KB' : ''))));
    const svgM = s('svg', { class: 'ibm-mappa-svg', role: 'img', 'aria-labelledby': idM.tit });
    const titM = s('title', { id: idM.tit }, 'Mappa della memoria dell\'IBM PC');
    const tela = h('div', { class: 'ibm-mappa-tela' }, svgM);

    // campi segmento e offset (esadecimale) con i cursori
    const campo = (id, nome, valore) => {
      const inp = h('input', {
        id: id, class: 'ibm-esa', type: 'text', inputmode: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false',
        maxlength: '6', value: M.esa(valore, 4), 'aria-describedby': idM.err,
      });
      const range = h('input', { type: 'range', class: 'ibm-range', min: '0', max: '65535', step: '1', value: String(valore), 'aria-label': nome + ' (cursore)' });
      const wrap = h('div', { class: 'ibm-campo' },
        h('label', { for: id }, nome),
        h('div', { class: 'ibm-campo-riga' }, inp, h('span', { class: 'ibm-h', 'aria-hidden': 'true' }, 'h')),
        range);
      return { inp, range, wrap };
    };
    const fSeg = campo(idM.seg, 'Segmento', st.seg);
    const fOff = campo(idM.off, 'Offset', st.off);
    const errore = h('p', { class: 'ibm-errore', id: idM.err }, '');
    const btnA20 = h('button', { type: 'button', class: 'lab-btn ibm-a20', 'aria-pressed': 'false', onclick: () => cambiaA20() }, '');

    // addizione in colonna: 6 cifre esadecimali per riga
    const riga = (etichetta, cls) => {
      const th = h('th', { scope: 'row' }, etichetta);
      const celle = [0, 1, 2, 3, 4, 5].map(() => h('span', { class: 'ibm-cifra' }));
      const td = h('td', null, h('span', { class: 'ibm-cifre' }, celle));
      return { tr: h('tr', { class: cls || '' }, th, td), th, celle };
    };
    const rBase = riga('segmento × 16'), rOff = riga('+ offset'), rSom = riga('= somma', 'tot'), rFin = riga('con 20 linee', 'fin');
    const tabella = h('table', { class: 'ibm-somma' },
      h('caption', { class: 'spc-sr-only' }, 'Calcolo dell\'indirizzo fisico: segmento per 16 più offset'),
      h('tbody', null, rBase.tr, rOff.tr, rSom.tr, rFin.tr));
    const esInd = h('span', { class: 'ibm-esito-ind' }, 'B8000');
    const esDec = h('span', { class: 'ibm-esito-dec' }, '');
    const esDove = h('p', { class: 'ibm-esito-dove' }, '');
    const esTesto = h('p', { class: 'ibm-esito-testo' }, '');
    const esito = h('div', { class: 'ibm-esito' }, h('p', { class: 'ibm-esito-riga' }, esInd, h('span', { class: 'ibm-h' }, 'h'), esDec), esDove, esTesto);
    const esempi = h('div', { class: 'ibm-esempi', role: 'group', 'aria-label': 'Esempi da provare' },
      M.ESEMPI.map((e) => h('button', { type: 'button', class: 'ibm-esempio', onclick: () => vaiA(e.seg, e.off, e) },
        h('span', { class: 'ibm-esempio-nome' }, e.nome), h('span', { class: 'ibm-esempio-cod' }, M.coppia(e.seg, e.off)))));

    const calc = h('div', { class: 'lab-panel ibm-calc' },
      h('div', { class: 'ibm-campi' }, fSeg.wrap, fOff.wrap), errore, btnA20, tabella, esito);
    vMappa.append(legendaMappa,
      h('div', { class: 'ibm-mappa-griglia' }, tela, calc),
      h('p', { class: 'ibm-esempi-tit' }, 'Prova gli esempi'), esempi);

    // --- disegno della mappa: 1 unità dell'SVG = 1 pixel, così i testi restano leggibili a ogni larghezza
    let G = null;

    function calcolaLayout() {
      const W = Math.max(280, Math.round(tela.clientWidth || 320));
      const stretto = W < 440;
      const H = stretto ? 410 : 470;
      const top = 30, fondo = 10;
      const totale = H - top - fondo;
      const barH = totale * 16 / 17;
      const addrW = 46;
      const mainX = addrW + 6, mainW = stretto ? 26 : 34;
      const lensX = mainX + mainW + (stretto ? 24 : 42), lensW = stretto ? 64 : 88;
      const labX = lensX + lensW + 10;
      return {
        W, H, top, totale, barH, ghostH: totale - barH, mainX, mainW, lensX, lensW, labX, labW: W - labX - 4,
        ms: barH / 0x100000, ls: totale / 0x10000, lungo: W - labX - 4 > 190,
      };
    }

    function disegnaMappa() {
      L = calcolaLayout();
      const { W, H, top, totale, barH, mainX, mainW, lensX, lensW, labX, ms, ls } = L;
      svgM.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svgM.setAttribute('width', W);
      svgM.setAttribute('height', H);
      const defs = s('defs', null,
        s('pattern', { id: idM.trat, width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, s('path', { d: 'M0 0V6', class: 'ibm-m-trat-linea' })),
        s('clipPath', { id: idM.clip }, s('rect', { x: lensX, y: top, width: W - lensX, height: totale })));
      const zona = (z) => 'c-' + (M.MAPPA.find((r) => r.id === z.regione) || z).colore;

      // barra dell'intero megabyte
      const barra = s('g', { class: 'ibm-m-barra' });
      M.MAPPA.forEach((z) => barra.append(s('rect', { class: 'ibm-m-z ' + 'c-' + z.colore, x: mainX, y: n1(top + z.da * ms), width: mainW, height: n1((z.a - z.da + 1) * ms) })));
      M.DETTAGLI.forEach((d) => {
        if (!d.usata) barra.append(s('rect', { class: 'ibm-m-libera', x: mainX, y: n1(top + d.da * ms), width: mainW, height: n1((d.a - d.da + 1) * ms), fill: 'url(#' + idM.trat + ')' }));
        else if (d.id !== 'programmi') barra.append(s('rect', { class: 'ibm-m-usata ' + zona(d), x: mainX, y: n1(top + d.da * ms), width: mainW, height: Math.max(1.5, n1((d.a - d.da + 1) * ms)) }));
      });
      barra.append(s('rect', { class: 'ibm-m-oltre', x: mainX, y: n1(top + barH), width: mainW, height: n1(L.ghostH), fill: 'url(#' + idM.trat + ')' }));
      barra.append(s('rect', { class: 'ibm-m-cornice', x: mainX, y: top, width: mainW, height: n1(barH) }));
      [0, 0xA0000, 0xC0000, 0xF0000, 0x100000].forEach((a) => {
        const y = n1(top + a * ms);
        barra.append(s('path', { class: 'ibm-m-tacca', d: 'M' + (mainX - 4) + ' ' + y + 'H' + (mainX + mainW) }),
          s('text', { class: 'ibm-m-ind', x: mainX - 7, y: n1(y + (a ? 4 : 8)) }, M.esa(a, a > 0xFFFFF ? 6 : 5)));
      });
      const tit = [s('text', { class: 'ibm-m-tit', x: n1(mainX + mainW / 2), y: 18, 'text-anchor': 'middle' }, '1 MB'),
        s('text', { class: 'ibm-m-tit', x: lensX, y: 18 }, 'Finestra del segmento: 64 KB')];

      // finestra del segmento sulla barra e "ponte" verso la lente
      const ponte = s('polygon', { class: 'ibm-m-ponte' });
      const bandaA = s('rect', { class: 'ibm-m-banda', x: mainX - 3, width: mainW + 6, rx: 2 });
      const bandaB = s('rect', { class: 'ibm-m-banda copia', x: mainX - 3, width: mainW + 6, rx: 2 });

      // lente: una striscia lunga quanto tutta la memoria, che scorre dentro una finestra ritagliata
      const striscia = s('g', { class: 'ibm-m-striscia' });
      M.DETTAGLI.forEach((d) => {
        const y = n1(top + d.da * ls), hh = Math.max(d.usata ? 2 : 0.5, n1((d.a - d.da + 1) * ls));
        striscia.append(s('rect', { class: 'ibm-m-z ' + zona(d) + (d.usata ? ' usata' : ''), x: lensX, y: y, width: lensW, height: hh }));
        if (!d.usata) striscia.append(s('rect', { class: 'ibm-m-libera', x: lensX, y: y, width: lensW, height: hh, fill: 'url(#' + idM.trat + ')' }));
        striscia.append(s('path', { class: 'ibm-m-confine', d: 'M' + lensX + ' ' + y + 'h' + lensW }));
      });
      const coda = s('g', { class: 'ibm-m-coda' });
      striscia.append(coda);
      const etichette = s('g', { class: 'ibm-m-etichette' });
      const lente = s('g', { 'clip-path': 'url(#' + idM.clip + ')' }, striscia, etichette);
      const cornice = s('rect', { class: 'ibm-m-cornice lente', x: lensX, y: top, width: lensW, height: totale });

      // puntatori: sulla lente (offset) e sulla barra (indirizzo fisico)
      const pill = s('rect', { class: 'ibm-m-pill', x: n1(lensX + lensW / 2 - 27), y: -9, width: 54, height: 18, rx: 9 });
      const pillT = s('text', { class: 'ibm-m-pill-t', x: n1(lensX + lensW / 2), y: 4, 'text-anchor': 'middle' }, '');
      const ptrL = s('g', { class: 'ibm-m-ptr' }, s('path', { class: 'ibm-m-ptr-linea', d: 'M' + (lensX - 7) + ' 0H' + (lensX + lensW + 4) }), pill, pillT);
      const onda = s('circle', { class: 'ibm-m-onda', cx: mainX - 7, cy: 0, r: 5 });
      const ptrM = s('g', { class: 'ibm-m-ptr' }, onda,
        s('path', { class: 'ibm-m-ptr-punta', d: 'M' + (mainX - 12) + ' -5L' + (mainX - 3) + ' 0L' + (mainX - 12) + ' 5Z' }),
        s('path', { class: 'ibm-m-ptr-linea', d: 'M' + (mainX - 3) + ' 0H' + (mainX + mainW + 3) }));

      svgM.replaceChildren(titM, defs, ...tit, barra, ponte, bandaB, bandaA, lente, cornice, ptrL, ptrM);
      G = { ponte, bandaA, bandaB, striscia, coda, etichette, ptrL, ptrM, pillT, onda, voci: [] };
      disegnaCoda();
    }

    // Oltre il megabyte la lente mostra il giro (A20 spenta) oppure la HMA (A20 accesa).
    function disegnaCoda() {
      if (!G) return;
      const { top, lensX, lensW, ls } = L;
      const y0 = top + 0x100000 * ls;
      const pezzi = [];
      G.coda.replaceChildren();
      if (st.a20) {
        pezzi.push({ da: 0x100000, a: M.MAX_SEG_OFF, nome: 'HMA, oltre 1 MB', breve: 'HMA', colore: 'c-grigio', ind: 0x100000, usata: true });
      } else {
        M.DETTAGLI.filter((d) => d.da < 0x10000).forEach((d) => {
          const zona = M.MAPPA.find((z) => z.id === d.regione);
          pezzi.push({ da: 0x100000 + d.da, a: 0x100000 + Math.min(d.a, 0xFFEF), nome: '↺ ' + d.nome, breve: '↺ ' + d.breve, colore: 'c-' + zona.colore, ind: d.da, usata: d.usata });
        });
      }
      pezzi.forEach((p) => {
        G.coda.append(s('rect', { class: 'ibm-m-z ' + p.colore + (p.usata ? ' usata' : '') + (st.a20 ? ' hma' : ' giro'), x: lensX, y: n1(top + p.da * ls), width: lensW, height: Math.max(2, n1((p.a - p.da + 1) * ls)) }));
      });
      G.coda.append(s('path', { class: 'ibm-m-mega', d: 'M' + (lensX - 6) + ' ' + n1(y0) + 'h' + (lensW + 12) }));
      // etichette: tutte quelle del megabyte più quelle della coda
      const voci = M.DETTAGLI.map((d) => ({ da: d.da, a: d.a, nome: d.nome, breve: d.breve, ind: d.da, colore: 'c-' + M.MAPPA.find((z) => z.id === d.regione).colore }))
        .concat(pezzi.map((p) => ({ da: p.da, a: p.a, nome: p.nome, breve: p.breve, ind: p.ind, colore: p.colore })));
      G.etichette.replaceChildren();
      G.voci = voci.map((v) => {
        const g = s('g', { class: 'ibm-m-et ' + v.colore, opacity: '0' },
          s('rect', { class: 'ibm-m-et-sw', x: L.labX, y: -8, width: 8, height: 8, rx: 2 }),
          s('text', { class: 'ibm-m-et-t', x: L.labX + 13, y: 0 },
            s('tspan', { class: 'ibm-m-et-ind' }, M.esa(v.ind, v.ind > 0xFFFFF ? 6 : 5) + ' '),
            s('tspan', { class: 'ibm-m-et-nome' }, L.lungo ? v.nome : v.breve)));
        G.etichette.append(g);
        return Object.assign({ g: g }, v);
      });
    }

    function fisicoVisto() {
      const lin = Math.round(vis.base + vis.off);
      return st.a20 ? lin : (lin & 0xFFFFF);
    }

    function posiziona() {
      if (!G || !L) return;
      const { top, totale, mainX, mainW, lensX, ms, ls } = L;
      const b = vis.base;
      const yb0 = top + b * ms, yb1 = top + (b + 0x10000) * ms;
      G.bandaA.setAttribute('y', n1(yb0));
      G.bandaA.setAttribute('height', n1(yb1 - yb0));
      const sopra = b + 0x10000 - 0x100000;
      if (!st.a20 && sopra > 0) {
        G.bandaB.setAttribute('y', top);
        G.bandaB.setAttribute('height', n1(sopra * ms));
        G.bandaB.style.display = '';
      } else G.bandaB.style.display = 'none';
      G.ponte.setAttribute('points', (mainX + mainW + 3) + ',' + n1(yb0) + ' ' + lensX + ',' + top + ' ' + lensX + ',' + (top + totale) + ' ' + (mainX + mainW + 3) + ',' + n1(yb1));
      G.striscia.setAttribute('transform', 'translate(0 ' + n1(-b * ls) + ')');
      // etichette della lente: visibili solo se il loro pezzo è nella finestra; si spingono per non sovrapporsi
      const vis2 = [];
      G.voci.forEach((v) => {
        const y0 = (v.da - b) * ls, y1 = (v.a + 1 - b) * ls;
        if (y1 <= 0.5 || y0 >= totale - 0.5) { v.g.setAttribute('opacity', '0'); return; }
        const a = Math.max(0, y0), z = Math.min(totale, y1);
        v.y = z - a > 30 ? a + 15 : (a + z) / 2 + 4;
        vis2.push(v);
      });
      vis2.sort((p, q2) => p.y - q2.y);
      for (let i = 1; i < vis2.length; i++) vis2[i].y = Math.max(vis2[i].y, vis2[i - 1].y + 15);
      for (let i = vis2.length - 1; i >= 0; i--) vis2[i].y = Math.min(vis2[i].y, i === vis2.length - 1 ? totale - 4 : vis2[i + 1].y - 15);
      vis2.forEach((v) => { v.g.setAttribute('opacity', '1'); v.g.setAttribute('transform', 'translate(0 ' + n1(top + Math.max(10, v.y)) + ')'); });
      G.ptrL.setAttribute('transform', 'translate(0 ' + n1(top + vis.off * ls) + ')');
      const f = fisicoVisto();
      G.pillT.textContent = M.esa(f, f > 0xFFFFF ? 6 : 5);
      G.ptrM.setAttribute('transform', 'translate(0 ' + n1(top + vis.m * ms + vis.mDy) + ')');
      G.ptrM.setAttribute('opacity', vis.mOp.toFixed(3));
    }

    function aggiornaCampi(daCampo) {
      if (daCampo !== fSeg.inp) fSeg.inp.value = M.esa(st.seg, 4);
      if (daCampo !== fOff.inp) fOff.inp.value = M.esa(st.off, 4);
      fSeg.range.value = String(st.seg);
      fOff.range.value = String(st.off);
      fSeg.range.setAttribute('aria-valuetext', M.esa(st.seg, 4) + ' esadecimale');
      fOff.range.setAttribute('aria-valuetext', M.esa(st.off, 4) + ' esadecimale');
      btnA20.setAttribute('aria-pressed', String(st.a20));
      btnA20.textContent = st.a20 ? 'Linea A20 accesa (PC AT)' : 'Linea A20 spenta (come l\'8088)';
    }

    function scriviCifre(r, testo, classi) {
      const t = String(testo || '');
      r.celle.forEach((c, i) => {
        const ch = t[t.length - 6 + i];
        c.textContent = ch || '';
        c.className = 'ibm-cifra' + (ch ? '' : ' vuota') + (classi && classi[i] ? ' ' + classi[i] : '');
      });
    }

    function aggiornaLettura(esempio, opz) {
      const o = opz || {};
      const r = M.indirizzoFisico(st.seg, st.off, st.a20);
      const col = M.colonne(st.seg, st.off, st.a20);
      rBase.th.textContent = M.esa(st.seg, 4) + ' × 16';
      scriviCifre(rBase, col.base, { 5: 'zero' });
      scriviCifre(rOff, col.offset);
      scriviCifre(rSom, col.somma, r.oltre ? { 0: 'riporto' } : null);
      rFin.tr.hidden = !r.oltre;
      if (r.oltre) {
        rFin.th.textContent = st.a20 ? 'con A20 accesa' : 'con 20 linee';
        scriviCifre(rFin, st.a20 ? col.fisico : '1' + col.fisico, { 0: st.a20 ? 'tenuta' : 'persa' });
      }
      if (o.flash !== false && !ctx.ridotto()) [rBase, rOff, rSom, rFin].forEach((x) => { x.tr.classList.remove('lab-flash'); void x.tr.offsetWidth; x.tr.classList.add('lab-flash'); });
      const f = r.fisico;
      esInd.textContent = M.esa(f, f > 0xFFFFF ? 6 : 5);
      esDec.textContent = ' = ' + ctx.formato(f) + ' in decimale';
      const z = M.regione(f);
      const d = M.dettaglio(f);
      esDove.textContent = d ? z.nome + ' › ' + d.nome : z.nome;
      esTesto.innerHTML = d ? d.testo : z.testo;
      titM.textContent = 'Mappa della memoria: il puntatore è su ' + esInd.textContent + ', ' + esDove.textContent;
      let frase = M.coppia(st.seg, st.off) + ' dà ' + esInd.textContent + ': ';
      if (r.giro) frase += 'la somma fa ' + col.somma + ', che ha bisogno di 21 bit. L\'8088 ha solo 20 linee di indirizzo: la cifra in più si perde e l\'indirizzo fa il giro fino a ' + col.fisico + '.';
      else if (r.oltre) frase += 'con la linea A20 accesa, come su un PC AT, il 286 arriva davvero oltre il megabyte, nella HMA.';
      else frase += (d ? d.nome : z.nome) + '. ' + (esempio ? esempio.testo : 'Il segmento si moltiplica per 16, cioè gli si aggiunge uno zero in esadecimale, e poi si somma l\'offset.');
      if (o.muto) return frase;
      ctx.annuncia(nota, frase);
      return frase;
    }

    // Cambio animato: la finestra scivola sul nuovo segmento, poi il puntatore scende all'offset.
    function vaiA(seg, off, esempio) {
      if (animMappa) animMappa.salta();
      const da = { base: vis.base, off: vis.off, m: vis.m };
      st.seg = seg; st.off = off;
      const r = M.indirizzoFisico(seg, off, st.a20);
      aggiornaCampi();
      aggiornaLettura(esempio);
      errore.textContent = '';
      const passi = [];
      let t = 0;
      if (Math.abs(da.m - (da.base + da.off)) > 0.5) {
        passi.push({ at: 0, dur: 140, ease: 'linear', update: (k) => { vis.mOp = 1 - k; posiziona(); } });
        passi.push({ at: 140, dur: 140, ease: 'linear', update: (k) => { if (k > 0) { vis.m = vis.base + vis.off; vis.mDy = 0; } vis.mOp = k; posiziona(); } });
        t = 280;
      }
      if (r.base !== da.base) {
        const dur = 420 + 380 * Math.min(1, Math.abs(r.base - da.base) / 0x100000);
        passi.push({ at: t, dur: dur, ease: 'inOut', update: (k) => { vis.base = ctx.lerp(da.base, r.base, k); vis.m = vis.base + vis.off; posiziona(); } });
        t += dur;
      }
      const durOff = 300 + 420 * Math.abs(off - da.off) / 0xFFFF;
      passi.push({ at: t, dur: durOff, ease: 'smooth', update: (k) => { vis.base = r.base; vis.off = ctx.lerp(da.off, off, k); vis.m = vis.base + vis.off; posiziona(); } });
      t += durOff;
      if (r.giro) {
        passi.push({ at: t + 120, dur: 160, ease: 'linear', update: (k) => { vis.mOp = 1 - k; posiziona(); } });
        passi.push({ at: t + 280, dur: 460, ease: 'bounce', update: (k, lin) => { if (lin > 0) vis.m = r.fisico; vis.mDy = -16 * (1 - k); vis.mOp = Math.min(1, lin * 2.5); posiziona(); } });
      }
      animMappa = sequenza(ctx, passi, () => { animMappa = null; vis.base = r.base; vis.off = off; vis.m = r.giro ? r.fisico : r.lineare; vis.mOp = 1; vis.mDy = 0; posiziona(); });
    }

    // Cambio immediato (cursori e digitazione): segue la mano senza animazioni.
    function imposta(seg, off, daCampo) {
      if (animMappa) animMappa.salta();
      st.seg = seg; st.off = off;
      const r = M.indirizzoFisico(seg, off, st.a20);
      vis.base = r.base; vis.off = off; vis.m = r.giro ? r.fisico : r.lineare; vis.mOp = 1; vis.mDy = 0;
      aggiornaCampi(daCampo);
      const frase = aggiornaLettura(null, { muto: true, flash: false });
      posiziona();
      clearTimeout(annuncioTimer);
      timers.delete(annuncioTimer);
      annuncioTimer = dopo(700, () => ctx.annuncia(nota, frase));
    }

    function cambiaA20() {
      if (animMappa) animMappa.salta();
      st.a20 = !st.a20;
      disegnaCoda();
      const r = M.indirizzoFisico(st.seg, st.off, st.a20);
      aggiornaCampi();
      if (!r.oltre) {
        posiziona();
        aggiornaLettura(null, { muto: true });
        ctx.annuncia(nota, 'Linea A20 ' + (st.a20 ? 'accesa' : 'spenta') + '. Sotto il megabyte non cambia nulla: ' + M.coppia(st.seg, st.off) + ' resta ' + M.esa(r.fisico, 5) + '. Prova l\'esempio «Oltre 1 MB».');
        return;
      }
      aggiornaLettura(null);
      animMappa = sequenza(ctx, [
        { at: 0, dur: 160, ease: 'linear', update: (k) => { vis.mOp = 1 - k; posiziona(); } },
        { at: 160, dur: 460, ease: 'bounce', update: (k, lin) => { if (lin > 0) vis.m = r.fisico; vis.mDy = -16 * (1 - k); vis.mOp = Math.min(1, lin * 2.5); posiziona(); } },
      ], () => { animMappa = null; vis.m = r.fisico; vis.mOp = 1; vis.mDy = 0; posiziona(); });
    }

    function daCampo(f, quale) {
      f.inp.addEventListener('input', () => {
        const v = M.leggiEsa(f.inp.value);
        if (Number.isNaN(v)) {
          f.inp.setAttribute('aria-invalid', 'true');
          errore.textContent = 'Scrivi da 1 a 4 cifre esadecimali (0–9 e A–F), fino a FFFF.';
          return;
        }
        f.inp.removeAttribute('aria-invalid');
        errore.textContent = '';
        if (quale === 'seg') imposta(v, st.off, f.inp); else imposta(st.seg, v, f.inp);
      });
      f.inp.addEventListener('change', () => { if (!f.inp.hasAttribute('aria-invalid')) f.inp.value = M.esa(quale === 'seg' ? st.seg : st.off, 4); });
      f.inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { f.inp.value = M.esa(quale === 'seg' ? st.seg : st.off, 4); f.inp.select(); } });
      let richiesto = false;
      f.range.addEventListener('input', () => {
        if (richiesto) return;
        richiesto = true;
        requestAnimationFrame(() => {
          richiesto = false;
          const v = Number(f.range.value);
          f.inp.removeAttribute('aria-invalid');
          errore.textContent = '';
          if (quale === 'seg') imposta(v, st.off); else imposta(st.seg, v);
        });
      });
    }
    daCampo(fSeg, 'seg');
    daCampo(fOff, 'off');

    function vaiAllaMappa() {
      const c = C[sel];
      if (!c || !c.mappa) return;
      const e = M.esempio(c.mappa);
      mostraVista('mappa', false);
      btnVista.mappa.focus();
      requestAnimationFrame(() => vaiA(e.seg, e.off, e));
    }

    /* ================= viste, cicli continui, ciclo di vita ================= */

    let ro = null;
    let misura = 0;
    function mostraVista(id, annuncio) {
      vista = id;
      Object.keys(btnVista).forEach((k) => btnVista[k].setAttribute('aria-pressed', String(k === id)));
      vCase.hidden = id !== 'case';
      vMappa.hidden = id !== 'mappa';
      if (id !== 'case') fermaGiro(false);
      if (id === 'mappa') {
        if (!G || Math.round(tela.clientWidth) !== misura) { misura = Math.round(tela.clientWidth); disegnaMappa(); }
        posiziona();
        if (annuncio) aggiornaLettura(null);
      } else if (annuncio) {
        ctx.annuncia(nota, aperto ? 'Vista del case. Scegli un pezzo dalla legenda o dal disegno.' : 'Il PC è chiuso. Premi «Apri il case».');
      }
      sveglia();
    }

    if ('ResizeObserver' in window) {
      let richiesto = false;
      ro = new ResizeObserver(() => {
        if (richiesto) return;
        richiesto = true;
        requestAnimationFrame(() => {
          richiesto = false;
          if (vista !== 'mappa') return;
          const w = Math.round(tela.clientWidth);
          if (w && w !== misura) { misura = w; disegnaMappa(); posiziona(); }
        });
      });
      ro.observe(tela);
    }

    // Unico ciclo continuo: l'onda attorno al numero scelto (case) o al puntatore (mappa).
    const ciclo = ctx.loop((dt, t) => {
      const fase = (t % 1700) / 1700;
      if (vista === 'case' && sel >= 0) {
        const onda = marche[sel].firstChild;
        onda.style.transform = 'scale(' + (1 + 1.3 * fase).toFixed(3) + ')';
        onda.style.opacity = (0.6 * (1 - fase)).toFixed(3);
      } else if (vista === 'mappa' && G) {
        G.onda.setAttribute('r', n1(5 + 9 * fase));
        G.onda.setAttribute('opacity', (0.7 * (1 - fase)).toFixed(3));
      }
    });
    function sveglia() {
      if (attivo && !ctx.ridotto()) ciclo.start(); else ciclo.stop();
    }

    // stato iniziale
    aggiornaBottoni();
    aggiornaCampi();
    aggiornaLettura(null, { muto: true, flash: false });
    marche.forEach((_, i) => statoMarca(i, 0));
    ctx.annuncia(nota, 'Il PC è chiuso, come appena uscito dalla scatola. Premi «Apri il case»: si svitano le viti sul retro, il coperchio scivola in avanti e i pezzi si separano.');

    return {
      attiva() { attivo = true; sveglia(); },
      sospendi() {
        attivo = false;
        ciclo.stop();
        fermaGiro(false);
        if (animCase) animCase.salta();
        if (animMappa) animMappa.salta();
      },
      distruggi() {
        attivo = false;
        ciclo.stop();
        fermaGiro(false);
        if (animCase) animCase.salta();
        if (animMappa) animMappa.salta();
        if (animBox) animBox.cancel();
        timers.forEach((t) => clearTimeout(t));
        timers.clear();
        if (ro) ro.disconnect();
      },
    };
  }

  /* =====================================================================
   * Il capitolo
   * ===================================================================== */

  P.registra({
    numero: 4,
    id: 'ibm-pc',
    titolo: 'IBM PC e l\'architettura aperta',
    breve: 'IBM PC',
    periodo: '1981–1987',
    colore: 'var(--era-4)',
    sommario: 'Il PC IBM 5150, il BIOS, il DOS e i cloni: come nasce lo standard «IBM compatibile» e come IBM ne perde il controllo.',
    intro: 'Nell\'agosto 1981 IBM, la più grande azienda informatica del mondo, entrò sul serio nel mercato dei personal computer, fino ad allora guidato da Apple, Commodore e Tandy. Per fare in fretta costruì il suo PC con pezzi che chiunque poteva comprare, e ne pubblicò gli schemi. Fu la scelta che creò lo standard su cui lavoriamo ancora oggi, e che in pochi anni IBM stessa non riuscì più a controllare.',
    blocchi: [
      {
        tipo: 'testo',
        titolo: 'Un gigante in ritardo',
        paragrafi: [
          'Alla fine degli anni \'70 i personal computer erano ormai un mercato vero: l\'Apple II, il Commodore PET e il TRS-80 di Tandy entravano in case, scuole e uffici (li trovi nel <a href="#primi-pc">capitolo 3</a>). IBM dominava il mondo dei grandi calcolatori aziendali, ma fra i piccoli aveva solo macchine costose, come l\'IBM 5100 del 1975. E al suo interno ogni prodotto nuovo richiedeva anni di progetti, comitati e collaudi: troppi, per un mercato che cambiava ogni pochi mesi.',
          'Nell\'estate del 1980 William Lowe, direttore del laboratorio IBM di Boca Raton, in Florida, propose ai vertici dell\'azienda una strada diversa: un piccolo gruppo indipendente, libero dalle regole interne, che costruisse un personal computer in circa un anno usando componenti già in commercio. Il comitato di direzione disse sì. Il progetto, chiamato in codice «Chess» (scacchi), partì con una dozzina di ingegneri; la guida passò presto a Don Estridge, che lo portò fino al lancio.',
          'Comprare pezzi da altri era una piccola rivoluzione per un\'azienda abituata a fabbricarsi da sé perfino i chip. Il processore arrivò da Intel, le unità per dischetti da Tandon, la stampante da Epson, il sistema operativo e il linguaggio BASIC da Microsoft. Cambiò anche il modo di vendere: il PC non passava solo per i venditori in giacca e cravatta di IBM, ma si comprava nei negozi delle catene ComputerLand e Sears.',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraPC5150,
        alt: 'Disegno dell\'IBM PC 5150: una scatola beige larga e bassa con due unità per dischetti sul lato destro del frontale; sopra, il monitor monocromatico 5151 con il testo verde del DOS sullo schermo; davanti, la tastiera Model F con il cavo a spirale.',
        didascalia: '<strong>IBM Personal Computer 5150 (1981).</strong> L\'unità di sistema con due unità per dischetti da 5,25 pollici, il monitor monocromatico IBM 5151 a fosfori verdi e la tastiera Model F a 83 tasti, con i tasti funzione in due colonne a sinistra. L\'interruttore rosso di accensione è sul fianco destro. Disegno schematico.',
        larga: true,
      },
      {
        tipo: 'testo',
        titolo: 'Il 5150, pezzo per pezzo',
        paragrafi: [
          'Il 12 agosto 1981, a New York, IBM presentò il suo Personal Computer, modello 5150. Il cuore era un Intel 8088 a 4,77 MHz (megahertz, milioni di cicli al secondo): un processore a 16 bit al suo interno, ma con il bus esterno a 8 bit, che permetteva di usare chip di supporto e schede più economici. Il chip in sé è raccontato nella <a href="../chip-programmabili/index.html#sedici-bit">sezione 5</a>.',
          'Anche quella frequenza strana aveva una ragione economica. Sulla scheda madre c\'era un solo quarzo da 14,318 MHz, il quadruplo della frequenza del colore nella televisione americana: diviso per 3 dava il clock del processore, diviso per 4 il segnale del colore per la scheda video. Un componente in meno, qualche dollaro risparmiato su ogni macchina.',
          'La memoria di base era di soli 16 KB (kilobyte: 1 KB = 1.024 byte), espandibile a 64 KB sulla scheda madre e oltre con schede aggiuntive. Per conservare programmi e dati c\'erano due strade: un comune registratore a cassette, collegato a una presa sul retro, oppure una o due unità per dischetti da 5,25 pollici (circa 13 cm), da 160 KB ciascuno. Senza dischetto, all\'accensione partiva il BASIC registrato in una ROM (<em>read-only memory</em>, memoria a sola lettura) della scheda madre.',
          'La scheda madre aveva cinque slot di espansione, connettori in cui infilare schede per il video, i dischetti, la stampante o altra memoria: era il bus che diventerà famoso come ISA (ne parla il <a href="#scheda-madre">capitolo 5</a>). Per il video si sceglieva fra due schede: la MDA (<em>Monochrome Display Adapter</em>), con un testo nitidissimo sul monitor monocromatico a fosfori verdi IBM 5151, e la CGA (<em>Color Graphics Adapter</em>), con grafica a colori anche su un televisore. La tastiera, la Model F a 83 tasti, aveva molle che scattano a ogni pressione e un rumore inconfondibile.',
          'Il prezzo di partenza era di 1.565 dollari, ma comprendeva solo l\'unità centrale con 16 KB di memoria e la tastiera: niente dischetti né monitor, da sostituire con il registratore e il televisore di casa. Con un\'unità per dischetti e il monitor si arrivava a circa 3.000 dollari. Quasi nessuno scelse le cassette: il futuro erano i dischetti.',
        ],
      },
      {
        tipo: 'numeri',
        items: [
          { valore: 4.77, decimali: 2, unita: 'MHz', etichetta: 'il clock dell\'Intel 8088: i 14,318 MHz del quarzo divisi per 3' },
          { valore: 16, unita: 'KB', etichetta: 'la memoria del modello base: 16.384 byte' },
          { valore: 1565, unita: 'dollari', etichetta: 'il prezzo di partenza, senza dischetti né monitor' },
          { valore: 640, unita: 'KB', etichetta: 'la memoria per i programmi: il resto del megabyte era riservato a video e ROM' },
        ],
      },
      { tipo: 'lab' },
      {
        tipo: 'testo',
        titolo: 'L\'architettura aperta',
        paragrafi: [
          'La scelta più importante, però, non stava dentro la scatola ma in un libro. IBM pubblicò il <em>Technical Reference</em>, un manuale con gli schemi elettrici completi della scheda madre e delle schede, la descrizione di ogni segnale del bus e perfino il listato commentato del BIOS. Chi voleva costruire una scheda di espansione o scrivere un programma aveva tutto quello che serviva, senza chiedere il permesso a nessuno. Già nel 1982 decine di aziende vendevano schede di memoria, porte seriali, orologi e schede grafiche per il PC.',
          'Il BIOS (<em>Basic Input/Output System</em>, sistema di base per l\'ingresso e l\'uscita) è un programma di 8 KB registrato in una ROM. All\'accensione controlla la macchina e avvia il sistema operativo; poi resta a disposizione come uno sportello di servizio. Un programma che vuole scrivere un carattere sullo schermo, leggere un tasto o un settore del dischetto lo chiede al BIOS con un\'istruzione di interruzione (INT 10h per lo schermo, INT 13h per i dischi, INT 16h per la tastiera; la «h» indica un numero esadecimale), senza dover conoscere i chip che stanno sotto.',
          'Gli schemi si potevano imitare, perché erano fatti di chip che tutti potevano comprare. Il BIOS no: era protetto dal diritto d\'autore, e nel 1983 la sentenza Apple contro Franklin confermò negli Stati Uniti che anche un programma registrato in una ROM è un\'opera protetta. Il BIOS era quindi l\'unico pezzo davvero proprietario del PC. Chi voleva costruire un clone doveva riscriverlo da capo: un programma che si comportasse esattamente come l\'originale, senza copiarne una riga.',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraContratto,
        alt: 'Schema a strati di due computer affiancati, l\'IBM PC e un compatibile. In alto gli stessi programmi e lo stesso DOS; poi gli stessi tre sportelli, le interruzioni 10h, 13h e 16h; sotto, due BIOS diversi, quello di IBM protetto dal diritto d\'autore e uno riscritto in camera bianca; in fondo, schede con chip diversi.',
        didascalia: '<strong>Il BIOS come contratto.</strong> Programmi e DOS chiedono i servizi al BIOS sempre con le stesse interruzioni. Se un clone ha un BIOS diverso nel codice ma identico nel comportamento, i programmi non si accorgono della differenza, anche se sotto ci sono chip e schede diversi.',
      },
      {
        tipo: 'testo',
        titolo: 'Il DOS, un sistema operativo comprato',
        paragrafi: [
          'Anche il sistema operativo arrivò da fuori. IBM si rivolse a Microsoft, la piccola azienda di Bill Gates e Paul Allen nota per i suoi interpreti BASIC, che però un sistema operativo per l\'8088 non l\'aveva. IBM aveva trattato anche con Digital Research, l\'azienda del CP/M, il sistema più diffuso sui computer a 8 bit, ma l\'accordo non si fece: sul perché, i racconti dei protagonisti non concordano.',
          'Microsoft trovò la soluzione a pochi chilometri da casa. A Seattle Tim Paterson, un programmatore della Seattle Computer Products, aveva scritto nel 1980, in pochi mesi, un sistema operativo per le schede con l\'Intel 8086 della sua ditta, ispirandosi al CP/M. Si chiamava QDOS (<em>Quick and Dirty Operating System</em>, «sistema operativo veloce e sporco»), poi 86-DOS. Microsoft ne comprò prima una licenza e poi, nel luglio 1981, tutti i diritti, e assunse Paterson per adattarlo al PC.',
          'Diventò il PC DOS 1.0 (DOS sta per <em>disk operating system</em>, sistema operativo su disco). E il contratto conteneva il dettaglio che cambiò la storia: IBM pagava le licenze, ma Microsoft restava libera di vendere lo stesso sistema ad altri costruttori, con il nome MS-DOS. Quando arrivarono i cloni, il loro sistema operativo era già pronto, uguale a quello di IBM.',
          'IBM offrì anche altri due sistemi: il CP/M-86 di Digital Research e l\'UCSD p-System, nato all\'Università della California a San Diego. Ma il PC DOS costava 40 dollari, il CP/M-86 240 e arrivò mesi dopo: la scelta del pubblico fu quasi unanime. Negli anni seguenti il DOS diventò il sistema di decine di milioni di PC, e sopra di lui, dal 1985, Microsoft costruì Windows (la storia del software è nella <a href="../programmazione/index.html#personal">sezione 7</a>).',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Arrivano i cloni',
        paragrafi: [
          'Schemi pubblici, chip in commercio, un sistema operativo in vendita: per costruire un computer «IBM compatibile», capace di far girare gli stessi programmi, mancava solo il BIOS. Il primo compatibile in commercio fu l\'MPC 1600 della Columbia Data Products, nel giugno 1982. Ma il caso che fece scuola fu quello di Compaq, fondata a Houston, in Texas, nel 1982 da tre ex dirigenti della Texas Instruments.',
          'Per riscrivere il BIOS Compaq usò il metodo della «camera bianca» (<em>clean room</em>). Un gruppo di tecnici studiò il BIOS di IBM e ne scrisse una descrizione minuziosa: che cosa fa ogni funzione, non come lo fa. Un secondo gruppo, di programmatori che non avevano mai visto il codice originale, scrisse un BIOS nuovo partendo solo da quella descrizione. Così, in caso di causa, si poteva dimostrare di non aver copiato nulla.',
          'Il Compaq Portable, annunciato nel novembre 1982 e in vendita dal marzo 1983 a 2.995 dollari, era una valigia da circa 13 chili con il monitor incorporato, compatibile con quasi tutti i programmi del PC IBM. Nel primo anno di vendite Compaq ne vendette 53.000 e incassò 111 milioni di dollari, un record per un\'azienda americana. La prova del nove, per tutti i compatibili, era far girare due programmi esigenti come il foglio elettronico Lotus 1-2-3 e il Flight Simulator di Microsoft.',
          'Nel 1984 Phoenix Technologies, un\'azienda del Massachusetts, mise in vendita un BIOS compatibile scritto anch\'esso in camera bianca e lo diede in licenza a chiunque. Da quel momento costruire un clone diventò soprattutto un lavoro di assemblaggio: scheda madre, BIOS di Phoenix (o dei concorrenti Award e AMI), MS-DOS. Negli Stati Uniti, in Asia e in Europa nacquero centinaia di marche.',
        ],
      },
      {
        tipo: 'italia',
        titolo: 'Ivrea: dall\'M20 all\'M24',
        paragrafi: [
          'Olivetti, che nel 1965 aveva creato la Programma 101 (vedi il <a href="#primi-pc">capitolo 3</a>), presentò nel 1982 il suo primo personal computer, l\'M20. Era una buona macchina, con un processore Zilog Z8001 a 16 bit, ma usava un sistema operativo proprio, il PCOS, e non poteva far girare i programmi scritti per il PC IBM, che proprio in quei mesi diventava lo standard.',
          'La lezione fu imparata in fretta. L\'M24, presentato all\'inizio del 1984 (alcune fonti dicono già nel 1983), era un compatibile IBM più veloce dell\'originale: un Intel 8086 a 8 MHz, con il bus dati a 16 bit, al posto dell\'8088 a 4,77 MHz, e una grafica fino a 640 × 400 punti. Negli Stati Uniti lo vendette AT&amp;T, dal giugno 1984, con il nome PC 6300. Con l\'M24 Olivetti diventò uno dei maggiori produttori di PC in Europa, e nel 1988 fu tra i nove costruttori che risposero a IBM con il bus EISA.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Dall\'XT al PS/2: lo standard sfugge a IBM',
        paragrafi: [
          'IBM intanto aggiornava il suo PC. Il PC/XT (<em>eXtended Technology</em>, 1983) aggiunse un disco rigido da 10 MB (megabyte, milioni di byte), otto slot e un alimentatore più robusto. Il PC/AT (<em>Advanced Technology</em>, 1984) montava il nuovo Intel 80286 a 6 MHz e allargava il bus a 16 bit con un secondo connettore in fila al primo, così le vecchie schede entravano ancora. Aveva dischetti da 1,2 MB e un orologio che camminava anche a computer spento, insieme a una piccola memoria per le impostazioni: entrambi in un chip CMOS (<em>complementary metal-oxide-semiconductor</em>, una tecnologia che consuma pochissimo) tenuto acceso da una batteria.',
          'Con l\'AT nacque pure una stranezza destinata a durare decenni, la porta A20: un interruttore elettronico, comandato dal controller della tastiera, che può tenere spenta la ventunesima linea di indirizzo per imitare il comportamento dell\'8088 oltre il primo megabyte. La vedi in azione nella mappa della memoria del laboratorio.',
          'Ma ormai il gioco non era più solo di IBM. Nel settembre 1986 Compaq presentò il Deskpro 386, il primo PC con il nuovo Intel 80386 a 32 bit, sette mesi prima di IBM: per la prima volta un costruttore di compatibili batteva sul tempo l\'inventore dello standard. IBM provò a riprendersi il controllo nell\'aprile 1987 con i PS/2 (<em>Personal System/2</em>): grafica VGA, dischetti da 3,5 pollici e, nei modelli maggiori, un bus nuovo, il Micro Channel (MCA), più moderno ma protetto da brevetti e concesso in licenza a caro prezzo. Le vecchie schede non entravano più.',
          'La risposta arrivò nel settembre 1988: nove costruttori di compatibili, la «banda dei nove» (AST, Compaq, Epson, Hewlett-Packard, NEC, Olivetti, Tandy, Wyse e Zenith), annunciarono l\'EISA (<em>Extended ISA</em>), un bus a 32 bit che accettava ancora le vecchie schede. Il mercato seguì i compatibili. Da allora lo standard lo decide l\'industria nel suo insieme: Intel con i processori, Microsoft con il software, i consorzi con i bus, come il PCI e l\'USB. Dire «IBM compatibile» diventò inutile, bastava dire PC; e nel 2005 IBM vendette la sua divisione di personal computer alla cinese Lenovo.',
        ],
      },
      {
        tipo: 'nota',
        paragrafi: [
          '«640K dovrebbero bastare a chiunque» (<em>640K ought to be enough for anybody</em>) è una delle frasi più citate della storia dell\'informatica, attribuita a Bill Gates in un anno imprecisato intorno al 1981. Ma nessuno ha mai trovato una fonte: un articolo, una registrazione, un testimone. Gates ha negato più volte di averla mai pronunciata.',
          'E il limite dei 640 KB non lo decise Microsoft: veniva dalla mappa della memoria disegnata da IBM, che riservava al video e alle ROM i 384 KB più alti del megabyte che l\'8088 poteva indirizzare. Lo vedi nel laboratorio, nella scheda «La mappa della memoria».',
        ],
      },
      {
        tipo: 'schede',
        titolo: 'Macchine e svolte, 1980–1988',
        items: [
          { anno: 1980, nome: 'QDOS, poi 86-DOS', luogo: 'Seattle Computer Products, Seattle (Stati Uniti)', testo: 'Tim Paterson scrive in pochi mesi un sistema operativo per l\'Intel 8086 ispirato al CP/M. Microsoft lo compra nel 1981: diventerà PC DOS per IBM e MS-DOS per tutti gli altri.' },
          { anno: 1981, nome: 'IBM Personal Computer 5150', luogo: 'IBM, Boca Raton (Florida)', testo: 'Presentato il 12 agosto a New York: Intel 8088 a 4,77&nbsp;MHz, da 16&nbsp;KB di memoria, cinque slot, schede video MDA o CGA, da 1.565 dollari. Il manuale tecnico ne pubblica schemi e BIOS.' },
          { anno: 1982, nome: 'Olivetti M20', luogo: 'Olivetti, Ivrea', italia: true, testo: 'Il primo personal computer di Olivetti: Zilog Z8001 a 16 bit e sistema operativo PCOS. Una buona macchina, ma incompatibile con il PC IBM proprio mentre diventava lo standard.' },
          { anno: 1982, nome: 'Columbia Data Products MPC 1600', luogo: 'Columbia Data Products (Stati Uniti)', testo: 'In vendita da giugno: il primo computer in commercio compatibile con il PC IBM. Apre la strada ai cloni.' },
          { anno: 1982, nome: 'Compaq Portable', luogo: 'Compaq, Houston (Texas)', testo: 'Annunciato a novembre, in vendita dal marzo 1983: un compatibile da circa 13&nbsp;kg con monitor incorporato e BIOS riscritto in camera bianca. Nel primo anno ne vende 53.000.' },
          { anno: 1983, nome: 'IBM PC/XT', luogo: 'IBM, Boca Raton (Florida)', testo: 'Disco rigido da 10&nbsp;MB, otto slot, alimentatore da 130&nbsp;W e 128&nbsp;KB di memoria: il PC diventa una macchina da ufficio.' },
          { anno: 1984, nome: 'Olivetti M24', luogo: 'Olivetti, Ivrea', italia: true, testo: 'Un compatibile più veloce dell\'originale, con l\'Intel 8086 a 8&nbsp;MHz. Dal giugno 1984 AT&amp;T lo vende negli Stati Uniti come PC 6300. Alcune fonti datano la presentazione al 1983.' },
          { anno: 1984, nome: 'Il BIOS di Phoenix', luogo: 'Phoenix Technologies (Massachusetts)', testo: 'Un BIOS compatibile scritto in camera bianca e venduto in licenza a tutti: costruire un clone diventa un lavoro di assemblaggio.' },
          { anno: 1984, nome: 'IBM PC/AT', luogo: 'IBM, Boca Raton (Florida)', testo: 'Intel 80286 a 6&nbsp;MHz, bus a 16 bit, orologio e memoria CMOS con batteria, dischetti da 1,2&nbsp;MB. Con lui nasce la porta A20.' },
          { anno: 1986, nome: 'Compaq Deskpro 386', luogo: 'Compaq, Houston (Texas)', testo: 'Presentato a settembre: il primo PC con l\'Intel 80386, sette mesi prima di IBM. Ora è un costruttore di compatibili a guidare lo standard.' },
          { anno: 1987, nome: 'IBM PS/2', luogo: 'IBM (Stati Uniti)', testo: 'Grafica VGA, dischetti da 3,5 pollici e bus Micro Channel, incompatibile con le vecchie schede e coperto da licenze costose: i costruttori di compatibili non lo seguono.' },
          { anno: 1988, nome: 'Bus EISA', luogo: 'Nove costruttori di compatibili', testo: 'AST, Compaq, Epson, Hewlett-Packard, NEC, Olivetti, Tandy, Wyse e Zenith rispondono al Micro Channel con un bus a 32 bit che accetta ancora le schede ISA.' },
        ],
      },
    ],
    lab: {
      titolo: 'Dentro l\'IBM PC 5150',
      sottotitolo: 'Apri il case e scopri i pezzi, poi esplora il megabyte di memoria dell\'8088',
      crea: creaLab,
    },
    punti: [
      'IBM costruì il PC 5150 (1981) in circa un anno con componenti in commercio, come l\'Intel 8088 e il DOS di Microsoft, e ne pubblicò schemi e listato del BIOS: un\'architettura aperta.',
      'L\'8088 a 4,77 MHz indirizza 1 MB con 20 linee: IBM riservò i 384 KB più alti a video e ROM, da cui il limite dei 640 KB.',
      'Il BIOS era l\'unico pezzo protetto: i cloni lo riscrissero in camera bianca, come Compaq nel 1982–1983, o lo comprarono da Phoenix dal 1984.',
      'Microsoft conservò il diritto di vendere MS-DOS a tutti: i compatibili nacquero con lo stesso sistema operativo dell\'originale.',
      'Con l\'AT (1984) arrivano il bus a 16 bit, la memoria CMOS con batteria e la porta A20; con il Deskpro 386 (1986) Compaq batte IBM sul tempo.',
      'Il bus MCA dei PS/2 (1987) non convinse i costruttori, che risposero con l\'EISA (1988): da allora «IBM compatibile» vuol dire semplicemente PC.',
    ],
    collegamenti: [
      { testo: 'Bus ISA', href: '../../index.html#/bus/isa', tipo: 'buslab' },
      { testo: 'Porta parallela Centronics', href: '../../index.html#/bus/centronics', tipo: 'buslab' },
      { testo: 'Porta seriale RS-232', href: '../../index.html#/bus/rs232', tipo: 'buslab' },
      { testo: 'Sezione 5 · L\'8086 e l\'8088', href: '../chip-programmabili/index.html#sedici-bit', tipo: 'sezione' },
      { testo: 'Sezione 7 · Il software dei personal', href: '../programmazione/index.html#personal', tipo: 'sezione' },
      { testo: 'Capitolo 5 · Scheda madre e bus', href: '#scheda-madre', tipo: 'sezione' },
      { testo: 'Capitolo 7 · Dal BIOS all\'UEFI', href: '#avvio', tipo: 'sezione' },
      { testo: 'Capitolo 8 · Le schede video', href: '#grafica', tipo: 'sezione' },
      { testo: 'Quiz del capitolo', href: '../quiz/index.html#storia-pc/ibm-pc', tipo: 'sezione' },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
