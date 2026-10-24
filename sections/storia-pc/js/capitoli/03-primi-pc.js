/*
 * Storia del PC · capitolo 3: I primi personal computer (1965–1980).
 * Testi, due illustrazioni (la Olivetti Programma 101, un Apple II con i lettori
 * Disk II) e il laboratorio «Il pannello dell'Altair 8800».
 * Il file non tocca il DOM al caricamento: il DOM si usa solo dentro le figure
 * e dentro lab.crea(), così i test in Node possono caricarlo.
 * Dati e logica del laboratorio (l'Intel 8080, il pannello, le missioni) stanno
 * nel modello js/modelli/03-primi-pc.js.
 */
(function (root) {
  'use strict';
  const P = root.StoriaPC;

  /* =====================================================================
   * Illustrazioni (SVG originali, stile tecnico piatto della sezione)
   * ===================================================================== */

  function n(v) { return Math.round(v * 10) / 10; }

  // Un tasto visto dall'alto: piano superiore e bordo frontale più scuro.
  function tasto(x, y, w, hgt, classe) {
    return '<rect class="' + classe + '-o" x="' + n(x) + '" y="' + n(y + 2.5) + '" width="' + n(w) + '" height="' + n(hgt) + '" rx="2.5"/>' +
      '<rect class="' + classe + '" x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(hgt - 1) + '" rx="2.5"/>';
  }

  // Numero di richiamo con la sua linea guida (spiegato nella didascalia).
  function richiamo(num, cx, cy, x1, y1, x2, y2) {
    return '<path class="pc3-guida" d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '"/>' +
      '<circle class="pc3-guida-punto" cx="' + x2 + '" cy="' + y2 + '" r="3.5"/>' +
      '<g class="pc3-richiamo"><circle cx="' + cx + '" cy="' + cy + '" r="17"/>' +
      '<text x="' + cx + '" y="' + (cy + 8) + '">' + num + '</text></g>';
  }

  // La Olivetti Programma 101 vista di fronte e un po' dall'alto: stampante con il
  // nastro di carta, scheda magnetica, tastiera, lampade e selettore dei decimali.
  function figuraProgramma101() {
    const tasti = [];
    for (let k = 0; k < 4; k++) {
      const y = 176 + k * 17;
      const sx = 164 - k * 7, dx = 476 + k * 7, passo = (dx - sx) / 13;
      for (let c = 0; c < 13; c++) {
        if (c === 3 || c === 7 || c === 11) continue; // spazi fra i gruppi di tasti
        const classe = c >= 4 && c <= 6 ? 'tc' : c === 12 ? 'tm' : 'ts';
        tasti.push(tasto(sx + c * passo + 2, y, passo - 4, 11, classe));
      }
    }
    // cifre stampate sul nastro, allineate a destra come sulla vera stampante
    const stampa = [];
    [6, 4, 7, 5, 3, 6, 4, 5].forEach((len, i) => {
      const y = 126 - i * 9;
      stampa.push('<rect class="pc3-stampa" x="' + (223 - len * 4) + '" y="' + y + '" width="' + (len * 4 - 1) + '" height="3"/>');
      if (i % 3 === 1) stampa.push('<rect class="pc3-stampa" x="189" y="' + y + '" width="4" height="3"/>');
    });
    const tacche = [];
    for (let i = 0; i <= 10; i++) {
      const a = (-210 + i * 24) * Math.PI / 180;
      tacche.push('<path d="M' + n(482 + Math.cos(a) * 16) + ' ' + n(146 + Math.sin(a) * 16) + 'L' + n(482 + Math.cos(a) * 19.5) + ' ' + n(146 + Math.sin(a) * 19.5) + '"/>');
    }
    return '<svg class="pc3-fig" viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse class="pc3-ombra" cx="320" cy="312" rx="262" ry="11"/>' +
      // corpo: sagoma (fianco e fronte) e piano superiore
      '<path class="be3 l" d="M116 114Q124 92 150 92L490 92Q516 92 524 114L566 236Q574 258 566 280Q556 304 530 304L110 304Q84 304 74 280Q66 258 74 236Z"/>' +
      '<path class="be2" d="M76 262L564 262Q566 284 552 294Q540 300 526 300L114 300Q100 300 88 294Q74 284 76 262Z"/>' +
      '<path class="be l" d="M150 92L490 92Q516 92 524 114L566 236Q572 256 552 258L88 258Q68 256 74 236L116 114Q124 92 150 92Z"/>' +
      '<path class="pc3-riflesso" d="M154 100L486 100"/>' +
      '<path class="pc3-solco" d="M92 276L548 276"/>' +
      '<rect class="be3" x="100" y="282" width="86" height="7" rx="3.5"/>' +
      // stampante: vano, rotolo, barra di strappo
      '<rect class="sc l1" x="146" y="104" width="118" height="44" rx="10"/>' +
      '<rect class="pc3-carta l1" x="158" y="110" width="94" height="18" rx="9"/>' +
      '<path class="pc3-solco-carta" d="M176 111V127M196 111V127M216 111V127M236 111V127"/>' +
      '<rect class="gr l1" x="152" y="133" width="106" height="7" rx="3.5"/>' +
      // nastro di carta stampato che esce dall'alto e si arriccia
      '<path class="pc3-carta l1" d="M183 138L227 138L229 52Q230 34 211 32L199 32Q182 34 182 52Z"/>' +
      '<path class="be2" d="M185 46Q205 27 226 46L226 52Q205 38 185 52Z"/>' +
      stampa.join('') +
      // fessura e scheda magnetica
      '<rect class="pc3-fessura" x="300" y="111" width="128" height="9" rx="3"/>' +
      '<rect class="pc3-carta l1" x="316" y="117" width="96" height="48" rx="3"/>' +
      '<rect class="pc3-magnetica" x="317" y="148" width="94" height="12"/>' +
      '<path class="pc3-righe" d="M326 126H372M326 134H396M326 141H360"/>' +
      '<rect class="pc3-intestazione" x="384" y="122" width="20" height="8" rx="1.5"/>' +
      // lampade e selettore dei decimali
      '<circle class="pc3-bagliore-verde" cx="470" cy="116" r="10"/>' +
      '<circle class="pc3-lampada-verde l1" cx="470" cy="116" r="5"/>' +
      '<circle class="pc3-lampada-rossa l1" cx="494" cy="116" r="5"/>' +
      '<g class="pc3-tacche">' + tacche.join('') + '</g>' +
      '<circle class="gr l1" cx="482" cy="146" r="13"/>' +
      '<circle class="gr2" cx="482" cy="146" r="5"/>' +
      '<path class="pc3-indice" d="M482 146L492 138"/>' +
      // tastiera
      '<path class="sc l" d="M160 172L480 172Q488 172 490 180L508 236Q510 244 502 244L138 244Q130 244 132 236L150 180Q152 172 160 172Z"/>' +
      tasti.join('') +
      // richiami (spiegati nella didascalia)
      richiamo(1, 128, 46, 145, 46, 181, 62) +
      richiamo(2, 372, 50, 372, 67, 372, 116) +
      richiamo(3, 604, 212, 587, 212, 506, 214) +
      richiamo(4, 566, 70, 551, 77, 499, 112) +
      '</svg>';
  }

  // Scena a blocchi colorati come la grafica a bassa risoluzione dell'Apple II
  // (righe di blocchi dello stesso colore unite in un solo rettangolo).
  function scenaBlocchi(x0, y0, d, C, R) {
    const montagna = (c) => Math.max(0, 6.5 - Math.abs(c - 8) * 0.8, 5.5 - Math.abs(c - 19) * 0.75);
    const tipo = (c, r) => {
      if (r >= R - 3) return (c + r) % 7 === 0 ? 'px-prato2' : 'px-prato';
      const dx = c - 23, dy = r - 2.6;
      if (dx * dx + dy * dy <= 4.8) return 'px-sole';
      const m = montagna(c);
      if (r >= R - 3 - m) return r < R - 3 - m + 1.3 && m > 4 ? 'px-neve' : 'px-monte';
      return 'px-cielo';
    };
    let out = '';
    for (let r = 0; r < R; r++) {
      let inizio = 0;
      for (let c = 1; c <= C; c++) {
        if (c === C || tipo(c, r) !== tipo(inizio, r)) {
          out += '<rect class="' + tipo(inizio, r) + '" x="' + (x0 + inizio * d) + '" y="' + (y0 + r * d) + '" width="' + ((c - inizio) * d) + '" height="' + d + '"/>';
          inizio = c;
        }
      }
    }
    return out;
  }

  // Un Apple II con il monitor sopra, due lettori Disk II e un dischetto da 5¼ pollici.
  function figuraAppleII() {
    const tasti = [];
    for (let k = 0; k < 4; k++) {
      const y = 267 + k * 12.5, sx = 150 - k * 5, dx = 470 + k * 5;
      const quanti = Math.floor((dx - sx) / 23);
      const passo = (dx - sx) / quanti;
      for (let c = 0; c < quanti; c++) tasti.push(tasto(sx + c * passo + 1.5, y, passo - 3, 9, 'tk'));
    }
    tasti.push(tasto(484, 267, 20, 9, 'tk'));                  // RESET, in alto a destra
    tasti.push(tasto(232, 317, 168, 9, 'tk'));                 // barra spaziatrice
    tasti.push(tasto(140, 317, 40, 9, 'tk'), tasto(186, 317, 40, 9, 'tk'), tasto(406, 317, 40, 9, 'tk'), tasto(452, 317, 40, 9, 'tk'));
    const righeTesto = [']LIST', '10 GR', '20 COLOR=13', ']'];
    let testo = '';
    righeTesto.forEach((riga, i) => {
      for (let k = 0; k < riga.length; k++) {
        if (riga[k] !== ' ') testo += '<rect class="px-testo" x="' + (194 + k * 6) + '" y="' + (177 + i * 7) + '" width="4" height="5"/>';
      }
    });
    testo += '<rect class="px-testo" x="200" y="198" width="5" height="6"/>'; // cursore
    const arcobaleno = (x, y) => ['ab1', 'ab2', 'ab3', 'ab4', 'ab5', 'ab6']
      .map((c, i) => '<rect class="' + c + '" x="' + x + '" y="' + (y + i * 2) + '" width="10" height="2"/>').join('');
    const disk = (y, acceso) =>
      '<rect class="be2 l" x="398" y="' + y + '" width="104" height="40" rx="3"/>' +
      '<rect class="sc l1" x="414" y="' + (y + 12) + '" width="76" height="10" rx="2"/>' +
      '<rect class="be3 l1" x="446" y="' + (y + 8) + '" width="14" height="18" rx="2.5"/>' +
      (acceso ? '<circle class="pc3-bagliore-rosso" cx="410" cy="' + (y + 31) + '" r="7"/>' : '') +
      '<circle class="' + (acceso ? 'pc3-led' : 'pc3-led-spento') + '" cx="410" cy="' + (y + 31) + '" r="2.8"/>' +
      '<path class="pc3-solco" d="M420 ' + (y + 31) + 'H492"/>';
    return '<svg class="pc3-fig" viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse class="pc3-ombra" cx="330" cy="366" rx="250" ry="10"/>' +
      '<ellipse class="pc3-ombra" cx="584" cy="352" rx="44" ry="6"/>' +
      // mobile dell'Apple II: coperchio, tastiera inclinata, fronte
      '<path class="be l" d="M140 236L500 236Q506 236 508 241L516 262L124 262L132 241Q134 236 140 236Z"/>' +
      '<path class="be2 l" d="M124 262L516 262L534 330L106 330Z"/>' +
      '<path class="be3 l" d="M106 330L534 330L534 350Q534 358 526 358L114 358Q106 358 106 350Z"/>' +
      '<path class="pc3-riflesso" d="M128 263L512 263"/>' +
      arcobaleno(146, 243) +
      tasti.join('') +
      // monitor appoggiato sul coperchio
      '<ellipse class="pc3-ombra" cx="276" cy="243" rx="112" ry="4"/>' +
      '<path class="gr2 l" d="M172 56L380 56L388 68L164 68Z"/>' +
      '<rect class="sc2 l" x="164" y="68" width="224" height="174" rx="10"/>' +
      '<rect class="pc3-schermo l1" x="184" y="86" width="184" height="126" rx="18"/>' +
      scenaBlocchi(192, 94, 6, 28, 13) +
      testo +
      '<rect class="pc3-vetro" x="190" y="90" width="64" height="40" rx="14"/>' +
      '<circle class="gr l1" cx="350" cy="228" r="4.5"/><circle class="gr l1" cx="366" cy="228" r="4.5"/>' +
      // due lettori Disk II impilati
      '<ellipse class="pc3-ombra" cx="450" cy="242" rx="56" ry="3.5"/>' +
      '<path class="be l" d="M404 150L496 150L502 158L398 158Z"/>' +
      disk(158, true) + disk(198, false) +
      // dischetto da 5¼ pollici appoggiato al mobile
      '<g transform="rotate(-8 576 302)">' +
        '<rect class="pc3-busta l" x="540" y="266" width="72" height="72" rx="3"/>' +
        '<rect class="pc3-carta l1" x="548" y="271" width="56" height="15" rx="1.5"/>' +
        '<path class="pc3-righe" d="M553 277H590M553 282H578"/>' +
        '<circle class="gr2 l1" cx="576" cy="304" r="12"/>' +
        '<circle class="pc3-foro" cx="576" cy="304" r="6"/>' +
        '<rect class="pc3-magnetica l1" x="572" y="320" width="8" height="15" rx="4"/>' +
        '<circle class="pc3-magnetica" cx="591" cy="306" r="2.2"/>' +
        '<rect class="pc3-foro" x="609" y="279" width="4" height="9"/>' +
      '</g>' +
      richiamo(1, 100, 110, 117, 110, 166, 126) +
      richiamo(2, 566, 116, 552, 126, 503, 166) +
      richiamo(3, 64, 296, 81, 296, 128, 292) +
      richiamo(4, 614, 222, 608, 239, 592, 266) +
      '</svg>';
  }

  /* =====================================================================
   * Laboratorio: il pannello dell'Altair 8800
   * ===================================================================== */

  // LED di stato nell'ordine del pannello: i primi dieci in alto, WAIT e HLDA sotto.
  const LED_STATO = ['INTE', 'PROT', 'MEMR', 'INP', 'M1', 'OUT', 'HLTA', 'STACK', 'WO', 'INT', 'WAIT', 'HLDA'];
  // Bit della parola di stato dell'8080 (vedi M.ST) per ciascun LED.
  const BIT_STATO = { MEMR: 7, INP: 6, M1: 5, OUT: 4, HLTA: 3, STACK: 2, WO: 1, INT: 0 };

  // Le levette di funzione, da sinistra a destra come sul pannello vero.
  // "su" e "giu" sono le due posizioni (a molla: tornano al centro da sole).
  const FUNZIONI = [
    { id: 'power', su: { nome: 'OFF' }, giu: { nome: 'ON' } },
    { id: 'run', su: { nome: 'STOP', az: 'stop', aiuto: 'ferma la CPU' }, giu: { nome: 'RUN', az: 'run', aiuto: 'fa partire il programma' } },
    { id: 'step', su: { nome: 'SINGLE STEP', az: 'singleStep', aiuto: 'fa avanzare la CPU di un ciclo macchina' }, giu: null },
    { id: 'examine', su: { nome: 'EXAMINE', az: 'examine', aiuto: 'mostra la cella scelta con le levette' }, giu: { nome: 'EXAMINE NEXT', az: 'examineNext', aiuto: 'mostra la cella successiva' } },
    { id: 'deposit', su: { nome: 'DEPOSIT', az: 'deposit', aiuto: 'scrive le levette 7–0 nella cella mostrata' }, giu: { nome: 'DEPOSIT NEXT', az: 'depositNext', aiuto: 'passa alla cella successiva e ci scrive le levette 7–0' } },
    { id: 'reset', su: { nome: 'RESET', az: 'reset', aiuto: 'riporta il contatore di programma a 000' }, giu: { nome: 'CLR', az: 'clr', aiuto: 'azzera le schede di ingresso e uscita' } },
    { id: 'protect', su: { nome: 'PROTECT', az: 'protect', aiuto: 'protegge la memoria dalle scritture' }, giu: { nome: 'UNPROTECT', az: 'unprotect', aiuto: 'toglie la protezione' } },
    { id: 'aux1', su: { nome: 'AUX', az: 'aux', aiuto: 'levetta di riserva' }, giu: { nome: 'AUX', az: 'aux', aiuto: 'levetta di riserva' } },
    { id: 'aux2', su: { nome: 'AUX', az: 'aux', aiuto: 'levetta di riserva' }, giu: { nome: 'AUX', az: 'aux', aiuto: 'levetta di riserva' } },
  ];
  const FN = {};
  FUNZIONI.forEach((f) => { FN[f.id] = f; });

  // Pannello largo (da 870 px in su): come l'originale, levette 15–0 in una fila,
  // raggruppate a tre da destra (15 | 14 13 12 | 11 10 9 | 8 7 6 | 5 4 3 | 2 1 0).
  function geometriaLarga() {
    const gruppo = (b) => (b === 15 ? 0 : b >= 12 ? 1 : b >= 9 ? 2 : b >= 6 ? 3 : b >= 3 ? 4 : 5);
    const xb = (b) => 230 + (15 - b) * 46 + gruppo(b) * 8;
    const g = {
      nome: 'largo', W: 1000, H: 458, rLed: 6.5, leva: { L: 26, dado: 10, punta: 6 },
      fLed: 13, fFn: 13, fSez: 12.5, fCifra: 15, fascia: { h: 54, x: 30, y: 37, size: 24 },
      testi: [], led: [], sw: [], fn: [], cifre: [], linee: [], viti: true,
    };
    g.testi.push({ x: 32, y: 76, t: 'STATUS', c: 'sez' }, { x: xb(7) - 12, y: 76, t: 'DATA', c: 'sez' }, { x: xb(15) - 12, y: 144, t: 'ADDRESS', c: 'sez' });
    LED_STATO.slice(0, 10).forEach((id, i) => g.led.push({ tipo: 'stato', id: id, x: 46 + i * 50, y: 110, e: id, ey: 94 }));
    ['WAIT', 'HLDA'].forEach((id, i) => g.led.push({ tipo: 'stato', id: id, x: 46 + i * 50, y: 178, e: id, ey: 162 }));
    for (let b = 7; b >= 0; b--) g.led.push({ tipo: 'dato', bit: b, x: xb(b), y: 110, e: 'D' + b, ey: 94 });
    for (let b = 15; b >= 0; b--) g.led.push({ tipo: 'ind', bit: b, x: xb(b), y: 178, e: 'A' + b, ey: 162 });
    for (let b = 15; b >= 0; b--) g.sw.push({ bit: b, x: xb(b), y: 242, hit: { x: xb(b) - 23, y: 198, w: 46, h: 90 } });
    [[15], [14, 13, 12], [11, 10, 9], [8, 7, 6], [5, 4, 3], [2, 1, 0]].forEach((bits) => {
      const a = xb(bits[0]), z = xb(bits[bits.length - 1]);
      g.cifre.push({ bits: bits, x: (a + z) / 2, y: 314, x1: a - 17, x2: z + 17, yl: 294 });
    });
    // separatori delle terne dei LED dati (D7 D6 | D5 D4 D3 | D2 D1 D0) e indirizzo
    [[6, 5], [3, 2]].forEach(([a, z]) => g.linee.push({ x: (xb(a) + xb(z)) / 2, y1: 84, y2: 120 }));
    [[15, 14], [12, 11], [9, 8], [6, 5], [3, 2]].forEach(([a, z]) => g.linee.push({ x: (xb(a) + xb(z)) / 2, y1: 152, y2: 188 }));
    g.testi.push({ x: xb(15) - 30, y: 314, t: 'in ottale', c: 'nota', ancora: 'end' });
    // sotto le levette: «SENSE SW.» per 15–8 e «DATA» per 7–0, con una riga che abbraccia il gruppo
    [[15, 8, 'SENSE SW.', 50], [7, 0, 'DATA', 28]].forEach(([a, z, t, mezzo]) => {
      const cx = (xb(a) + xb(z)) / 2;
      g.testi.push({ x: cx, y: 336, t: t, c: 'piccolo', ancora: 'middle' });
      g.linee.push({ x1: xb(a) - 17, x2: cx - mezzo, y: 331.5 }, { x1: cx + mezzo, x2: xb(z) + 17, y: 331.5 });
    });
    const xs = [62, 172, 283, 394, 505, 616, 727, 838, 949];
    FUNZIONI.forEach((f, i) => g.fn.push({
      f: f, x: xs[i], y: 398, ySu: 358, yGiu: 446,
      su: { x: xs[i] - 50, y: 348, w: 100, h: 50 }, giu: { x: xs[i] - 50, y: 398, w: 100, h: 56 },
    }));
    return g;
  }

  // Pannello stretto (telefono e schermi medi): status su due righe, un byte di
  // levette per riga (ogni levetta larga almeno 40 px), funzioni su due righe di quattro.
  function geometriaStretta() {
    const W = 326, passo = W / 8, cella = W / 4;
    const xk = (k) => passo / 2 + k * passo;
    const g = {
      nome: 'stretto', W: W, H: 702, rLed: 6, leva: { L: 21, dado: 9, punta: 5.5 },
      fLed: 11, fFn: 11, fSez: 11, fCifra: 13, fascia: { h: 32, x: 14, y: 22, size: 15 },
      testi: [], led: [], sw: [], fn: [], cifre: [], linee: [], viti: false,
    };
    LED_STATO.forEach((id, i) => {
      const riga = i < 6 ? 0 : 1, col = i % 6;
      g.led.push({ tipo: 'stato', id: id, x: W / 12 + col * (W / 6), y: 72 + riga * 38, e: id, ey: 58 + riga * 38 });
    });
    g.linee.push({ x1: 12, x2: W - 12, y: 130 });
    g.testi.push({ x: 12, y: 148, t: 'ADDRESS A15–A8 · SENSE SW.', c: 'sez' });
    for (let k = 0; k < 8; k++) {
      const b = 15 - k;
      g.led.push({ tipo: 'ind', bit: b, x: xk(k), y: 176, e: 'A' + b, ey: 162 });
      g.sw.push({ bit: b, x: xk(k), y: 222, hit: { x: k * passo, y: 188, w: passo, h: 68 } });
    }
    g.testi.push({ x: 12, y: 300, t: 'DATA D7–D0 · ADDRESS A7–A0', c: 'sez' });
    for (let k = 0; k < 8; k++) {
      const b = 7 - k;
      g.led.push({ tipo: 'dato', bit: b, x: xk(k), y: 328, e: 'D' + b, ey: 314 });
      g.led.push({ tipo: 'ind', bit: b, x: xk(k), y: 362, e: 'A' + b, ey: 348 });
      g.sw.push({ bit: b, x: xk(k), y: 408, hit: { x: k * passo, y: 374, w: passo, h: 68 } });
    }
    // un byte per riga: le cifre ottali sono 2 + 3 + 3 bit
    [[[15, 14], 0, 1], [[13, 12, 11], 2, 4], [[10, 9, 8], 5, 7]].forEach(([bits, a, z]) => {
      g.cifre.push({ bits: bits, x: (xk(a) + xk(z)) / 2, y: 274, x1: xk(a) - 15, x2: xk(z) + 15, yl: 258 });
    });
    [[[7, 6], 0, 1], [[5, 4, 3], 2, 4], [[2, 1, 0], 5, 7]].forEach(([bits, a, z]) => {
      g.cifre.push({ bits: bits, x: (xk(a) + xk(z)) / 2, y: 460, x1: xk(a) - 15, x2: xk(z) + 15, yl: 444 });
    });
    [2, 5].forEach((k) => {
      g.linee.push({ x: k * passo, y1: 154, y2: 186 });
      g.linee.push({ x: k * passo, y1: 306, y2: 372 });
    });
    g.linee.push({ x1: 12, x2: W - 12, y: 474 });
    FUNZIONI.slice(0, 8).forEach((f, i) => {
      const riga = Math.floor(i / 4), col = i % 4, x = cella / 2 + col * cella, y0 = 482 + riga * 108;
      g.fn.push({
        f: f, x: x, y: y0 + 54, ySu: y0 + 21, yGiu: y0 + 96,
        su: { x: col * cella + 2, y: y0, w: cella - 4, h: 54 }, giu: { x: col * cella + 2, y: y0 + 54, w: cella - 4, h: 54 },
      });
    });
    // separa le due file di levette di funzione, così le scritte non si confondono
    g.linee.push({ x1: 12, x2: W - 12, y: 590 });
    return g;
  }

  function esagono(x, y, r) {
    const p = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + i * Math.PI / 3;
      p.push(n(x + r * Math.cos(a)) + ',' + n(y + r * Math.sin(a)));
    }
    return p.join(' ');
  }

  function creaLaboratorio(el, ctx) {
    const M = (root.StoriaPCModelli || {})['primi-pc'];
    const h = ctx.h, s = ctx.s;
    const ridotto = ctx.ridotto();
    const alt = M.creaAltair();
    alt.accendi(Math.random);
    const acc = M.creaAccumulatore();
    const idAlone = ctx.uid('altair-alone');
    const timer = new Set();
    const PASSO_LENTO = 0.55; // secondi per ciclo macchina al rallentatore
    const o3 = (v) => M.ottale(v, 3);

    const st = {
      layout: null, tipo: 'somma', mis: M.creaMissione('somma'), velocita: 'reale', velKill: 0o016,
      auto: null, attivo: false, primoPasso: true, haltDetto: false, focusSw: 7,
      tick: 0, lento: 0, consiglio: '', prossimo: -2, listatoToccato: false,
    };

    // Valori a 16 bit: nel pannello largo le levette sono raggruppate a tre su tutti i 16 bit
    // (ottale puro, 177777); nel pannello stretto c'è un byte per riga, quindi si scrive
    // byte per byte (377 377), come le cifre sotto le levette.
    const oi = (a) => (a > 255 && st.layout === 'stretto' ? o3((a >> 8) & 255) + ' ' + o3(a & 255) : M.ottaleIndirizzo(a));
    const dec16 = (v) => (v > 255 && st.layout === 'stretto' ? 'byte alto e byte basso · ' : '') + v + ' in decimale';

    // Luminosità dei 36 LED (12 di stato, 8 dati, 16 indirizzo): attuale e bersaglio.
    const LED_N = 36;
    const lum = new Float32Array(LED_N), bers = new Float32Array(LED_N);
    const iDato = (b) => 12 + b, iInd = (b) => 20 + b;
    let ledRef = [], levaSw = {}, levaFn = {}, tastiSw = {}, tastoPower = null, cifre = [];

    /* ---------- struttura HTML ---------- */

    function segmentato(etichetta, opzioni, valore, quando) {
      const gruppo = h('div', { class: 'lab-seg', role: 'group', 'aria-label': etichetta });
      const bottoni = opzioni.map(([v, t]) => h('button', {
        type: 'button', 'aria-pressed': String(v === valore),
        onclick: () => { imposta(v); quando(v); },
      }, t));
      function imposta(v) { bottoni.forEach((b, i) => b.setAttribute('aria-pressed', String(opzioni[i][0] === v))); }
      gruppo.append(...bottoni);
      return { el: gruppo, imposta: imposta };
    }

    const pannello = h('div', { class: 'altair-pannello' });
    const banco = h('div', { class: 'altair-banco' }, pannello);

    const segVel = segmentato('Velocità della CPU', [['reale', '2 MHz, vera'], ['lento', 'Rallentatore']], 'reale', cambiaVelocita);
    const letture = h('dl', { class: 'lab-kv altair-letture' });
    const kv = {};
    [['ind', 'Indirizzo · LED A15–A0'], ['dato', 'Dato · LED D7–D0'], ['sw', 'Levette'], ['cpu', 'CPU'], ['ist', 'Istruzioni eseguite']].forEach(([k, t]) => {
      kv[k] = h('dd');
      letture.append(h('div', { class: 'altair-kv-' + k }, h('dt', null, t), kv[k]));
    });
    const cicliTit = h('p', { class: 'altair-cicli-tit' });
    const cicliLista = h('ol', { class: 'altair-pastiglie', 'aria-label': 'Cicli macchina dell\'istruzione' });
    const nota = h('p', { class: 'lab-note altair-nota', 'aria-live': 'polite' });
    const info = h('div', { class: 'altair-info' },
      h('div', { class: 'lab-controls' }, h('span', { class: 'altair-etichetta' }, 'Velocità'), segVel.el),
      nota,
      letture,
      h('div', { class: 'altair-cicli lab-panel' }, cicliTit, cicliLista));

    const segMis = segmentato('Missione', [['somma', 'Somma del manuale'], ['killbit', 'Kill the Bit']], 'somma', cambiaMissione);
    const misTit = h('h4', { class: 'altair-mis-tit' });
    const misFonte = h('p', { class: 'altair-mis-fonte' });
    const passi = h('ol', { class: 'altair-passi' });
    const consiglio = h('p', { class: 'altair-consiglio' });
    const barraRiempi = h('i');
    const barra = h('div', { class: 'altair-barra', role: 'progressbar', 'aria-label': 'Byte del programma inseriti', 'aria-valuemin': '0' }, barraRiempi);
    const barraTesto = h('span', { class: 'altair-barra-testo lab-mono' });
    const btnAuto = h('button', { type: 'button', class: 'lab-btn primary altair-auto', onclick: () => (st.auto ? interrompiAuto() : inserisciPerMe()) }, 'Inserisci il programma per me');
    const btnDaCapo = h('button', { type: 'button', class: 'lab-btn', onclick: ricomincia }, 'Ricomincia');
    const segKill = segmentato('Velocità della luce', [['14', 'Originale (016)'], ['4', 'Lenta (004)']], '14', (v) => cambiaVelKill(Number(v)));
    const rigaKill = h('div', { class: 'lab-controls altair-kill' }, h('span', { class: 'altair-etichetta' }, 'Velocità della luce'), segKill.el);
    const corpoListato = h('tbody');
    const scatolaListato = h('div', { class: 'altair-listato-box' }, h('table', { class: 'altair-listato-tab' },
      h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, 'Ind.'), h('th', { scope: 'col' }, 'Byte'),
        h('th', { scope: 'col', class: 'altair-col-bin' }, 'Binario'), h('th', { scope: 'col' }, 'Istruzione'))),
      corpoListato));
    const titoloListato = h('summary', null);
    const listato = h('details', { class: 'altair-listato' }, titoloListato, scatolaListato);
    listato.addEventListener('toggle', () => { st.listatoToccato = true; st.prossimo = -2; aggiornaMissione(); });
    const missione = h('section', { class: 'altair-missione lab-panel', 'aria-label': 'Missione guidata' },
      segMis.el, misTit, misFonte, passi, consiglio,
      h('div', { class: 'altair-progresso' }, barra, barraTesto),
      rigaKill,
      h('div', { class: 'lab-controls' }, btnAuto, btnDaCapo),
      listato);

    const radice = h('div', { class: 'altair' }, banco, h('div', { class: 'altair-lati' }, info, missione));
    el.append(radice);

    /* ---------- il pannello disegnato in SVG ---------- */

    function disegnaLeva(gr, x, y, m) {
      const g = s('g', { class: 'alt-leva' });
      g.append(
        s('circle', { class: 'alt-leva-rondella', cx: x, cy: y, r: m.dado + 3.5 }),
        s('polygon', { class: 'alt-leva-dado', points: esagono(x, y, m.dado) }),
        s('circle', { class: 'alt-leva-foro', cx: x, cy: y, r: n(m.dado * 0.5) }));
      const asta = s('path', { class: 'alt-leva-asta', d: 'M-3.4 0L-2.4 ' + (-m.L) + 'L2.4 ' + (-m.L) + 'L3.4 0Z' });
      const punta = s('circle', { class: 'alt-leva-punta', cx: x, cy: y, r: m.punta });
      g.append(asta, punta);
      gr.append(g);
      return { g: g, asta: asta, punta: punta, x: x, y: y, L: m.L, rp: m.punta, p: 0, tw: null, seq: 0 };
    }

    // p = +1 levetta in su, -1 in giù, 0 al centro (punta verso chi guarda).
    function posaLeva(lv, p) {
      lv.p = p;
      lv.asta.setAttribute('transform', 'translate(' + lv.x + ' ' + lv.y + ') scale(1 ' + p.toFixed(3) + ')');
      lv.punta.setAttribute('cy', n(lv.y - lv.L * p));
      lv.punta.setAttribute('r', n(lv.rp + 1.4 * (1 - Math.min(1, Math.abs(p)))));
    }

    function testo(gr, x, y, t, classe, size, ancora) {
      gr.append(s('text', { class: 'alt-t ' + (classe || ''), x: n(x), y: n(y), 'font-size': size, 'text-anchor': ancora || null }, t));
    }

    // Etichetta di una levetta di funzione; nel pannello stretto le parole lunghe vanno a capo.
    function etichettaFn(gr, g, x, y, t, sopra) {
      const parole = t.split(' ');
      if (g.nome === 'stretto' && parole.length > 1) {
        const dy = g.fFn + 1.5;
        testo(gr, x, sopra ? y - dy / 2 : y - dy / 2, parole[0], 'alt-fn', g.fFn, 'middle');
        testo(gr, x, sopra ? y + dy / 2 : y + dy / 2, parole.slice(1).join(' '), 'alt-fn', g.fFn, 'middle');
      } else testo(gr, x, y, t, 'alt-fn', g.fFn, 'middle');
    }

    function costruisci() {
      const g = st.layout === 'largo' ? geometriaLarga() : geometriaStretta();
      const fuoco = document.activeElement && pannello.contains(document.activeElement) ? document.activeElement.dataset.tasto : null;
      const svg = s('svg', { class: 'altair-svg', viewBox: '0 0 ' + g.W + ' ' + g.H, 'aria-hidden': 'true', focusable: 'false' });
      svg.append(s('defs', null, s('radialGradient', { id: idAlone },
        s('stop', { offset: '0', 'stop-color': '#ff7a55', 'stop-opacity': '.85' }),
        s('stop', { offset: '.42', 'stop-color': '#ff3d26', 'stop-opacity': '.3' }),
        s('stop', { offset: '1', 'stop-color': '#ff2a1a', 'stop-opacity': '0' }))));
      svg.append(
        s('rect', { class: 'alt-fondo', width: g.W, height: g.H }),
        s('rect', { class: 'alt-fascia', width: g.W, height: g.fascia.h }),
        s('path', { class: 'alt-filo', d: 'M0 ' + (g.fascia.h + 0.5) + 'H' + g.W }));
      testo(svg, g.fascia.x, g.fascia.y, 'ALTAIR 8800', 'alt-logo', g.fascia.size);
      if (g.viti) {
        [[16, g.fascia.h / 2], [g.W - 16, g.fascia.h / 2], [16, g.H - 16], [g.W - 16, g.H - 16]].forEach(([x, y]) => {
          svg.append(s('circle', { class: 'alt-vite', cx: x, cy: y, r: 5.5 }), s('path', { class: 'alt-vite-taglio', d: 'M' + (x - 3.5) + ' ' + (y + 1.5) + 'L' + (x + 3.5) + ' ' + (y - 1.5) }));
        });
      }
      g.testi.forEach((t) => testo(svg, t.x, t.y, t.t, t.c, g.fSez, t.ancora));
      g.linee.forEach((l) => svg.append(s('path', {
        class: 'alt-linea',
        d: l.y != null ? 'M' + l.x1 + ' ' + l.y + 'H' + l.x2 : 'M' + n(l.x) + ' ' + l.y1 + 'V' + l.y2,
      })));

      // LED: etichetta, ghiera, corpo spento, luce accesa, riflesso; il bagliore sta sopra a tutti
      const corpi = s('g'), aloni = s('g', { class: 'alt-aloni' });
      ledRef = new Array(LED_N).fill(null);
      g.led.forEach((d) => {
        const i = d.tipo === 'stato' ? LED_STATO.indexOf(d.id) : d.tipo === 'dato' ? iDato(d.bit) : iInd(d.bit);
        const r = g.rLed;
        testo(corpi, d.x, d.ey, d.e, 'alt-led-nome', g.fLed, 'middle');
        const on = s('circle', { class: 'alt-led-acceso', cx: d.x, cy: d.y, r: r, opacity: 0 });
        corpi.append(
          s('circle', { class: 'alt-led-ghiera', cx: d.x, cy: d.y, r: r + 2.2 }),
          s('circle', { class: 'alt-led-spento', cx: d.x, cy: d.y, r: r }),
          on,
          s('circle', { class: 'alt-led-riflesso', cx: n(d.x - r * 0.35), cy: n(d.y - r * 0.4), r: n(r * 0.3) }));
        const alone = s('circle', { cx: d.x, cy: d.y, r: n(r * 2.9), fill: 'url(#' + idAlone + ')', opacity: 0 });
        aloni.append(alone);
        ledRef[i] = { on: on, alone: alone, v: -1 };
      });
      svg.append(corpi, aloni);

      // cifre ottali sotto le terne di levette
      cifre = g.cifre.map((c) => {
        svg.append(s('path', { class: 'alt-terna', d: 'M' + n(c.x1) + ' ' + (c.yl - 5) + 'V' + c.yl + 'H' + n(c.x2) + 'V' + (c.yl - 5) }));
        const t = s('text', { class: 'alt-cifra', x: n(c.x), y: c.y, 'font-size': g.fCifra, 'text-anchor': 'middle' }, '0');
        svg.append(t);
        return { bits: c.bits, t: t, v: -1 };
      });

      const leve = s('g');
      levaSw = {};
      g.sw.forEach((d) => { levaSw[d.bit] = disegnaLeva(leve, d.x, d.y, g.leva); });
      levaFn = {};
      g.fn.forEach((d) => {
        levaFn[d.f.id] = disegnaLeva(leve, d.x, d.y, g.leva);
        etichettaFn(svg, g, d.x, d.ySu, d.f.su.nome, true);
        if (d.f.giu) etichettaFn(svg, g, d.x, d.yGiu, d.f.giu.nome, false);
      });
      svg.append(leve);

      // tasti HTML trasparenti sopra il disegno: tastiera, lettori di schermo, tocco
      const strato = h('div', { class: 'altair-tasti' });
      const pos = (r) => ({ left: (100 * r.x / g.W) + '%', top: (100 * r.y / g.H) + '%', width: (100 * r.w / g.W) + '%', height: (100 * r.h / g.H) + '%' });
      const sopra = (btn, lv) => {
        btn.addEventListener('pointerenter', () => lv.g.classList.add('alt-sopra'));
        btn.addEventListener('pointerleave', () => lv.g.classList.remove('alt-sopra'));
        btn.addEventListener('focus', () => lv.g.classList.add('alt-sopra'));
        btn.addEventListener('blur', () => lv.g.classList.remove('alt-sopra'));
      };
      const gruppoSw = h('div', { role: 'group', 'aria-label': 'Levette di indirizzo e dati, da 15 a 0 (frecce per spostarsi, su e giù per alzare e abbassare)' });
      tastiSw = {};
      g.sw.forEach((d) => {
        const b = d.bit;
        const btn = h('button', {
          type: 'button', class: 'altair-tasto', 'data-tasto': 'sw-' + b, style: pos(d.hit),
          tabindex: b === st.focusSw ? '0' : '-1',
          'aria-label': 'Levetta ' + b + (b < 8 ? ' (indirizzo A' + b + ' e dato D' + b + ')' : ' (indirizzo A' + b + ')'),
          'aria-pressed': String(!!((alt.interruttori >> b) & 1)),
          onclick: () => premiLevetta(b),
          onkeydown: (e) => tastieraSw(e, b),
        });
        sopra(btn, levaSw[b]);
        tastiSw[b] = btn;
        gruppoSw.append(btn);
      });
      strato.append(gruppoSw);
      g.fn.forEach((d) => {
        const f = d.f, lv = levaFn[f.id];
        const unione = { x: d.su.x, y: d.su.y, w: d.su.w, h: d.su.h + d.giu.h };
        if (f.id === 'power') {
          tastoPower = h('button', {
            type: 'button', class: 'altair-tasto', 'data-tasto': 'fn-power', style: pos(unione),
            'aria-label': 'Interruttore di accensione (OFF in su, ON in giù)', 'aria-pressed': String(alt.acceso),
            onclick: () => premiFunzione(f, alt.acceso ? 1 : -1),
          });
          sopra(tastoPower, lv);
          strato.append(tastoPower);
          return;
        }
        const lati = f.giu ? [['su', 1, d.su], ['giu', -1, d.giu]] : [['su', 1, unione]];
        lati.forEach(([lato, verso, r]) => {
          const info = f[lato];
          const btn = h('button', {
            type: 'button', class: 'altair-tasto', 'data-tasto': 'fn-' + f.id + '-' + lato, style: pos(r),
            'aria-label': info.nome + (f.id.startsWith('aux') ? (lato === 'su' ? ' (in su)' : ' (in giù)') : ''),
            title: info.nome + ': ' + info.aiuto,
            onclick: () => premiFunzione(f, verso),
          });
          sopra(btn, lv);
          strato.append(btn);
        });
      });

      pannello.replaceChildren(svg, strato);
      radice.dataset.pannello = g.nome;
      posaLeve(false);
      for (let i = 0; i < LED_N; i++) posaLed(i, lum[i]);
      aggiornaCifre();
      if (fuoco) {
        const b = strato.querySelector('[data-tasto="' + fuoco + '"]');
        if (b) b.focus();
      }
    }

    function posaLed(i, v) {
      const r = ledRef[i];
      if (!r || Math.abs(r.v - v) < 0.004) return;
      r.v = v;
      r.on.setAttribute('opacity', v.toFixed(3));
      r.alone.setAttribute('opacity', (v * v).toFixed(3));
    }

    function posaLeve(anima) {
      for (let b = 0; b < 16; b++) {
        const lv = levaSw[b];
        if (!lv) continue;
        const a = (alt.interruttori >> b) & 1 ? 1 : -1;
        if (anima) muovi(lv, a, ctx.motion.dur.fast, 'bounce'); else posaLeva(lv, a);
      }
      Object.keys(levaFn).forEach((id) => posaLeva(levaFn[id], id === 'power' ? (alt.acceso ? -1 : 1) : 0));
    }

    function aggiornaCifre() {
      const sw = alt.interruttori;
      cifre.forEach((c) => {
        const v = c.bits.reduce((a, b) => a * 2 + ((sw >> b) & 1), 0);
        if (v !== c.v) { c.v = v; c.t.textContent = String(v); }
      });
    }

    /* ---------- movimento delle levette ---------- */

    function attesa(ms) {
      return new Promise((ok) => {
        if (!ms || ridotto) { ok(); return; }
        const t = setTimeout(() => { timer.delete(t); ok(); }, ms);
        timer.add(t);
      });
    }

    function muovi(lv, a, dur, ease) {
      if (lv.tw) lv.tw.cancel();
      const tw = ctx.tween({ from: lv.p, to: a, dur: dur, ease: ease, update: (v) => posaLeva(lv, v) });
      lv.tw = tw;
      return tw.finito.then(() => { if (lv.tw === tw) lv.tw = null; });
    }

    // Levetta a molla: scatta, resta un attimo, torna al centro con un piccolo rimbalzo.
    function scatto(lv, verso) {
      const mio = ++lv.seq;
      return muovi(lv, verso, ctx.motion.dur.instant, 'sharp')
        .then(() => attesa(70))
        .then(() => (lv.seq === mio ? muovi(lv, 0, ctx.motion.dur.normal, 'bounce') : null));
    }

    /* ---------- comandi ---------- */

    function bloccato(daAuto) { return !!st.auto && !daAuto; }

    function premiLevetta(bit, su, daAuto) {
      if (bloccato(daAuto)) return Promise.resolve();
      const v = su === undefined ? !((alt.interruttori >> bit) & 1) : !!su;
      alt.interruttore(bit, v);
      if (tastiSw[bit]) tastiSw[bit].setAttribute('aria-pressed', String(v));
      aggiornaCifre();
      if (!daAuto) { aggiornaLetture(); aggiornaMissione(); }
      return levaSw[bit] ? muovi(levaSw[bit], v ? 1 : -1, ctx.motion.dur.fast, 'bounce') : Promise.resolve();
    }

    function tastieraSw(e, bit) {
      let nuovo = null;
      if (e.key === 'ArrowLeft') nuovo = Math.min(15, bit + 1);
      else if (e.key === 'ArrowRight') nuovo = Math.max(0, bit - 1);
      else if (e.key === 'Home') nuovo = 15;
      else if (e.key === 'End') nuovo = 0;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); premiLevetta(bit, e.key === 'ArrowUp'); return; }
      else return;
      e.preventDefault();
      st.focusSw = nuovo;
      Object.keys(tastiSw).forEach((b) => { tastiSw[b].tabIndex = Number(b) === nuovo ? 0 : -1; });
      tastiSw[nuovo].focus();
    }

    function premiFunzione(f, verso, daAuto) {
      if (bloccato(daAuto)) return Promise.resolve();
      const lv = levaFn[f.id];
      if (f.id === 'power') {
        if (st.auto && !daAuto) return Promise.resolve();
        const ev = verso > 0 ? alt.spegni() : alt.accendi(Math.random);
        if (ev.azione === 'accendi') { lum.fill(0); st.primoPasso = true; }
        if (tastoPower) tastoPower.setAttribute('aria-pressed', String(alt.acceso));
        dopoEvento(ev, { muto: daAuto });
        return lv ? muovi(lv, alt.acceso ? -1 : 1, ctx.motion.dur.fast, 'bounce') : Promise.resolve();
      }
      const lato = verso > 0 ? f.su : f.giu;
      if (!lato) return Promise.resolve();
      const ev = alt[lato.az]();
      dopoEvento(ev, { muto: daAuto });
      return lv ? scatto(lv, verso) : Promise.resolve();
    }

    function racconto(html) {
      if (nota.innerHTML === html) nota.innerHTML = '';
      nota.innerHTML = html;
    }

    function dopoEvento(ev, opz) {
      const o = opz || {};
      if (ev.ok && (ev.azione === 'reset' || ev.azione === 'run' || ev.azione === 'accendi')) st.haltDetto = false;
      if (ev.ok && ev.azione === 'run') { st.lento = 0; st.tick = 0; }
      const nuovi = st.mis.aggiorna(ev, alt);
      if (!o.muto) {
        let t = M.racconta(ev, alt, { primoPasso: ev.azione === 'singleStep' && ev.ok && st.primoPasso, lento: st.velocita === 'lento', indirizzo: oi });
        if (ev.azione === 'singleStep' && ev.ok) st.primoPasso = false;
        racconto(t + testoPassi(nuovi));
      }
      aggiornaTutto();
      festeggia(nuovi);
      sveglia();
    }

    function testoPassi(nuovi) {
      if (!nuovi.length) return '';
      const titoli = nuovi.map((id) => st.mis.passi.find((p) => p.id === id).titolo.toLowerCase());
      return ' <span class="altair-fatto">Fatto: ' + titoli.join(', ') + '.' + (st.mis.completata() ? ' <strong>Missione compiuta!</strong>' : '') + '</span>';
    }

    function festeggia(nuovi) {
      if (!nuovi.length) return;
      nuovi.forEach((id) => {
        const li = passi.querySelector('[data-passo="' + id + '"]');
        if (li) { li.classList.remove('appena'); void li.offsetWidth; li.classList.add('appena'); }
      });
      if (st.mis.completata()) { missione.classList.remove('festa'); void missione.offsetWidth; missione.classList.add('festa'); }
    }

    /* ---------- inserimento automatico ---------- */

    async function impostaLevette(valore, auto) {
      for (let b = 15; b >= 0; b--) {
        const su = !!((valore >> b) & 1);
        if (!!((alt.interruttori >> b) & 1) !== su) {
          premiLevetta(b, su, true);
          await attesa(38);
          if (auto.annullato) return;
        }
      }
      await attesa(130);
    }

    async function inserisciPerMe() {
      if (st.auto) return;
      const auto = { annullato: false };
      st.auto = auto;
      radice.classList.add('altair--auto');
      btnAuto.textContent = 'Interrompi l\'inserimento';
      if (!alt.acceso) await premiFunzione(FN.power, -1, true);
      if (alt.inEsecuzione) await premiFunzione(FN.run, 1, true);
      const sost = st.tipo === 'killbit' ? { 6: st.velKill } : null;
      const seq = M.sequenzaInserimento(st.mis.programma, sost);
      racconto('Inserisco il programma come si faceva nel 1975: per ogni byte imposto le levette 7–0 e premo <strong>DEPOSIT</strong> (la prima volta) o <strong>DEPOSIT NEXT</strong> (tutte le altre).');
      for (const passo of seq) {
        if (auto.annullato) break;
        if (passo.op === 'interruttori') await impostaLevette(passo.valore, auto);
        else {
          await premiFunzione(passo.op === 'reset' ? FN.reset : FN.deposit, passo.op === 'depositNext' ? -1 : 1, true);
          await attesa(90);
        }
      }
      st.auto = null;
      radice.classList.remove('altair--auto');
      btnAuto.textContent = 'Inserisci il programma per me';
      const pr = st.mis.progresso(alt);
      racconto(auto.annullato
        ? 'Inserimento interrotto: ' + pr.giusti + ' byte su ' + pr.totale + ' sono al loro posto. Puoi continuare a mano.'
        : 'Fatto: ' + pr.totale + ' byte depositati uno per uno con DEPOSIT e DEPOSIT NEXT, come si faceva a mano. Ora tocca a te: ' + st.mis.suggerimento(alt));
      aggiornaTutto();
      sveglia();
    }

    function interrompiAuto() { if (st.auto) st.auto.annullato = true; }

    /* ---------- missioni e impostazioni ---------- */

    function costruisciMissione() {
      const m = st.mis;
      passi.replaceChildren(...m.passi.map((p) => h('li', { class: 'altair-passo', 'data-passo': p.id },
        h('span', { class: 'altair-spunta', 'aria-hidden': 'true' }),
        h('span', { class: 'altair-passo-testo' },
          h('strong', null, p.titolo),
          h('span', { class: 'altair-sr' }, ''),
          h('span', { class: 'altair-passo-desc' }, p.testo)))));
      const righe = m.righe(alt);
      corpoListato.replaceChildren(...righe.map((r) => h('tr', null,
        h('td', { class: 'm' }, oi(r.indirizzo)),
        h('td', { class: 'm byte' }, o3(r.byte)),
        h('td', { class: 'm altair-col-bin' }, M.binario(r.byte)),
        h('td', { class: 'ist' }, r.testo ? h('strong', null, r.testo) : null, r.testo ? ' ' : null, r.spiegazione))));
      titoloListato.textContent = 'Il listato del manuale · ' + righe.length + ' byte';
      if (m.tipo === 'killbit') titoloListato.textContent = 'Il listato del gioco · ' + righe.length + ' byte';
      misTit.textContent = m.programma.nome;
      const f = m.programma.fonte;
      misFonte.textContent = f.charAt(0).toUpperCase() + f.slice(1);
      rigaKill.hidden = m.tipo !== 'killbit';
      st.consiglio = '';
      st.prossimo = -2;
    }

    function cambiaMissione(tipo) {
      interrompiAuto();
      st.tipo = tipo;
      st.mis = M.creaMissione(tipo);
      if (tipo === 'killbit') st.mis.sost[6] = st.velKill;
      st.mis.aggiorna({ azione: 'cambio', ok: true }, alt);
      costruisciMissione();
      racconto(tipo === 'killbit'
        ? 'Missione «Kill the Bit», il gioco che Dean McDaniel scrisse per l\'Altair nel 1975: una luce corre sui LED A15–A8 e va spenta alzando la levetta giusta nel momento giusto. Le levette 15–8 il programma le legge con l\'istruzione IN 377.'
        : 'Missione «Somma del manuale», il primo esempio del manuale dell\'Altair: il programma somma i numeri delle celle 200 e 201 e scrive il risultato nella cella 202 (128, 129 e 130 in decimale).');
      aggiornaTutto();
    }

    function cambiaVelKill(v) {
      st.velKill = v;
      st.mis.sost[6] = v;
      if (M.programmaPresente(alt, M.PROGRAMMA_KILLBIT) && !alt.inEsecuzione && alt.acceso) {
        alt.mem[6] = v;
        alt.prepara();
        racconto('La velocità è il byte della cella 006, il passo del contatore: ora vale <strong>' + o3(v) + '</strong>. Conta dal prossimo RESET e RUN.');
      } else if (alt.inEsecuzione) {
        racconto('La velocità è il byte della cella 006: per cambiarla ferma la CPU con STOP, poi scegli di nuovo.');
        segKill.imposta(String(alt.leggi(6) === 4 ? 4 : 14));
        st.velKill = alt.leggi(6) === 4 ? 4 : 14;
        st.mis.sost[6] = st.velKill;
      } else {
        racconto('La velocità è il byte della cella 006 del programma: «Inserisci il programma per me» userà <strong>' + o3(v) + '</strong>' + (v === 4 ? ', che fa correre la luce 3,5 volte più piano.' : ', il valore originale del 1975.'));
      }
      aggiornaMissione();
    }

    function cambiaVelocita(v) {
      st.velocita = v;
      st.lento = 0;
      racconto(v === 'lento'
        ? 'Rallentatore: quando premi RUN la CPU fa un ciclo macchina ogni mezzo secondo circa, e i LED mostrano ogni indirizzo e ogni dato che passano sul bus.'
        : 'Velocità vera: 2 milioni di stati di clock al secondo. In RUN i LED sembrano accesi a metà, perché l\'occhio vede la media.');
      aggiornaTutto();
      sveglia();
    }

    function ricomincia() {
      interrompiAuto();
      alt.spegni();
      alt.accendi(Math.random);
      alt.impostaInterruttori(0);
      st.mis = M.creaMissione(st.tipo);
      if (st.tipo === 'killbit') st.mis.sost[6] = st.velKill;
      st.primoPasso = true;
      st.haltDetto = false;
      Object.keys(tastiSw).forEach((b) => tastiSw[b].setAttribute('aria-pressed', 'false'));
      if (tastoPower) tastoPower.setAttribute('aria-pressed', 'true');
      posaLeve(true);
      costruisciMissione();
      racconto('Da capo: l\'Altair è stato spento e riacceso, quindi la RAM contiene di nuovo <strong>valori casuali</strong>. La CPU aspetta all\'indirizzo 000 (spia WAIT accesa).');
      aggiornaTutto();
      sveglia();
    }

    /* ---------- letture ---------- */

    function inCorsaVeloce() { return alt.acceso && alt.inEsecuzione && st.velocita === 'reale' && !alt.r.halt; }

    function statoCpu() {
      if (!alt.acceso) return 'spenta';
      if (alt.inEsecuzione) return alt.r.halt ? 'arresto (HLT), pannello in RUN' : st.velocita === 'reale' ? 'in esecuzione a 2 MHz' : 'in esecuzione al rallentatore';
      return alt.r.halt ? 'arresto (HLT)' : 'ferma, in attesa (WAIT)';
    }

    function valore(dd, grande, piccolo) {
      dd.replaceChildren(grande, piccolo ? h('small', null, piccolo) : null);
    }

    function aggiornaLetture() {
      const sw = alt.interruttori;
      if (sw > 255) valore(kv.sw, oi(sw), dec16(sw));
      else valore(kv.sw, o3(sw), M.binario(sw) + ' · ' + sw);
      kv.cpu.textContent = statoCpu();
      kv.ist.textContent = ctx.formato(alt.istruzioni);
      if (!alt.acceso) { valore(kv.ind, '—'); valore(kv.dato, '—'); return; }
      if (inCorsaVeloce()) {
        valore(kv.ind, 'in corsa', 'i LED mostrano la media');
        valore(kv.dato, 'in corsa', 'i LED mostrano la media');
        return;
      }
      const l = alt.luci();
      valore(kv.ind, oi(l.indirizzo), dec16(l.indirizzo));
      valore(kv.dato, o3(l.dati), M.binario(l.dati) + ' · ' + l.dati);
    }

    function aggiornaCicli() {
      if (!alt.acceso) { cicliTit.textContent = 'L\'Altair è spento.'; cicliLista.replaceChildren(); return; }
      if (inCorsaVeloce()) {
        cicliTit.innerHTML = 'In esecuzione: <strong>centinaia di migliaia</strong> di istruzioni al secondo, troppe per seguirle a occhio. Prova il rallentatore.';
        cicliLista.replaceChildren();
        return;
      }
      const lista = alt.cicliIstruzione();
      const c0 = alt.cicloMostrato();
      if (alt.r.halt) {
        cicliTit.innerHTML = 'Arresto: la CPU ha eseguito <strong class="lab-mono">HLT</strong> e non fa più cicli sul bus fino al prossimo RESET.';
      } else {
        const d = alt.istruzioneA(c0.pc0);
        cicliTit.innerHTML = 'Istruzione in <span class="lab-mono">' + oi(c0.pc0) + '</span>: <strong class="lab-mono">' + d.testo + '</strong>, ' + d.spiegazione +
          ' · ' + lista.length + (lista.length === 1 ? ' ciclo macchina' : ' cicli macchina');
      }
      cicliLista.replaceChildren(...lista.map((c) => {
        const scrive = c.tipo === 'scrittura' || c.tipo === 'pilaScrittura' || c.tipo === 'uscita';
        return h('li', { class: c.attivo ? 'attivo' : c.fatto ? 'fatto' : null, 'aria-current': c.attivo ? 'step' : null },
          h('b', null, String(c.n)),
          h('span', null, c.descrizione),
          h('span', { class: 'lab-mono' }, oi(c.indirizzo) + (scrive ? ' ← ' : ' → ') + o3(c.dato)));
      }));
    }

    function aggiornaMissione() {
      const m = st.mis;
      const corrente = m.corrente();
      passi.querySelectorAll('.altair-passo').forEach((li) => {
        const id = li.dataset.passo, fatto = m.fatti.has(id);
        li.classList.toggle('fatto', fatto);
        li.classList.toggle('corrente', id === corrente);
        if (id === corrente) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
        li.querySelector('.altair-sr').textContent = fatto ? ' (fatto)' : '';
      });
      const c = m.suggerimento(alt);
      if (c !== st.consiglio) { st.consiglio = c; consiglio.innerHTML = c; }
      const pr = m.progresso(alt);
      barraRiempi.style.transform = 'scaleX(' + (pr.giusti / pr.totale).toFixed(3) + ')';
      barra.setAttribute('aria-valuemax', String(pr.totale));
      barra.setAttribute('aria-valuenow', String(pr.giusti));
      barraTesto.textContent = pr.giusti + ' / ' + pr.totale + ' byte';
      const righe = m.righe(alt);
      let prossimo = -1;
      righe.forEach((r, i) => {
        const tr = corpoListato.children[i];
        if (!tr) return;
        tr.className = 'r-' + r.stato + (r.inizio ? ' inizio' : '');
        if (r.stato === 'prossimo') prossimo = i;
        if (r.libero) {
          const v = r.stato === 'ok' ? r.valore : r.byte;
          tr.children[1].textContent = o3(v);
          tr.children[2].textContent = M.binario(v);
        }
      });
      if (prossimo !== st.prossimo) {
        st.prossimo = prossimo;
        if (prossimo >= 0 && listato.open) {
          const tr = corpoListato.children[prossimo];
          const alto = Math.max(0, tr.offsetTop - scatolaListato.clientHeight / 2 + tr.offsetHeight);
          scatolaListato.scrollTo({ top: alto, behavior: ridotto ? 'auto' : 'smooth' });
        }
      }
      btnAuto.disabled = !st.auto && M.programmaPresente(alt, m.programma) && alt.acceso;
      missione.classList.toggle('altair-missione--compiuta', m.completata());
    }

    function aggiornaTutto() {
      aggiornaLetture();
      aggiornaCicli();
      aggiornaMissione();
      aggiornaCifre();
    }

    /* ---------- LED e ciclo di animazione ---------- */

    function bersagliFermi() {
      const l = alt.luci();
      LED_STATO.forEach((k, i) => { bers[i] = l.stato[k] ? 1 : 0; });
      for (let b = 0; b < 8; b++) bers[iDato(b)] = (l.dati >> b) & 1;
      for (let b = 0; b < 16; b++) bers[iInd(b)] = (l.indirizzo >> b) & 1;
    }

    // In RUN ogni LED brilla in proporzione al tempo in cui la sua linea è accesa
    // (con una curva che imita la sensibilità dell'occhio alle luci deboli).
    function bersagliMedi(r) {
      const luce = (f) => (f <= 0 ? 0 : Math.pow(f, 0.55));
      LED_STATO.forEach((k, i) => {
        if (k in BIT_STATO) bers[i] = luce(r.stato[BIT_STATO[k]]);
        else if (k === 'INTE') bers[i] = alt.r.inte ? 1 : 0;
        else if (k === 'PROT') bers[i] = alt.protetta ? 1 : 0;
        else bers[i] = 0; // WAIT e HLDA spenti mentre la CPU lavora
      });
      for (let b = 0; b < 8; b++) bers[iDato(b)] = luce(r.dati[b]);
      for (let b = 0; b < 16; b++) bers[iInd(b)] = luce(r.indirizzo[b]);
    }

    function avvicinaLed(dt, tau) {
      const k = ridotto ? 1 : 1 - Math.exp(-Math.max(dt, 1 / 60) / tau);
      let ancora = false;
      for (let i = 0; i < LED_N; i++) {
        const d = bers[i] - lum[i];
        if (Math.abs(d) < 0.003) lum[i] = bers[i];
        else { lum[i] += d * k; ancora = true; }
        posaLed(i, lum[i]);
      }
      return ancora;
    }

    function tick() {
      const nuovi = st.mis.aggiorna({ azione: 'tick', ok: true }, alt);
      aggiornaLetture();
      aggiornaMissione();
      if (alt.r.halt && !st.haltDetto) {
        st.haltDetto = true;
        aggiornaCicli();
        racconto('La CPU ha incontrato il codice <strong>166</strong>, cioè l\'istruzione <strong>HLT</strong>, e si è arrestata: spia <strong>HLTA</strong> accesa. Succede spesso facendo girare la memoria casuale. Premi <strong>RESET</strong>.');
      } else if (nuovi.length) racconto(testoPassi(nuovi).replace(/^ /, ''));
      festeggia(nuovi);
    }

    const ciclo = ctx.loop((dt) => {
      const corre = alt.acceso && alt.inEsecuzione;
      let ancora = false;
      if (corre) {
        ancora = true;
        if (alt.r.halt) bersagliFermi();
        else if (st.velocita === 'reale') {
          const budget = Math.round(Math.min(dt, 0.05) * M.FREQUENZA);
          if (budget > 0) {
            alt.esegui(budget, acc);
            const r = acc.risolvi();
            if (alt.r.halt) bersagliFermi(); else if (r.stati > 0) bersagliMedi(r);
          }
        } else {
          st.lento += dt;
          if (st.lento >= PASSO_LENTO) { st.lento = 0; alt.cicloLento(); aggiornaCicli(); }
          bersagliFermi();
        }
        st.tick += dt;
        if (st.tick >= 0.12) { st.tick = 0; tick(); }
      } else bersagliFermi();
      ancora = avvicinaLed(dt, corre && st.velocita === 'reale' ? 0.06 : 0.035) || ancora;
      return ancora ? undefined : false;
    });

    function sveglia() { if (st.attivo) ciclo.start(); }

    /* ---------- disposizione: pannello largo o stretto ---------- */

    function disponi(larghezza) {
      const layout = larghezza >= 870 ? 'largo' : 'stretto';
      const affianca = layout === 'stretto' && larghezza >= 640;
      radice.classList.toggle('altair--largo', layout === 'largo');
      radice.classList.toggle('altair--affianca', affianca);
      radice.classList.toggle('altair--solo', layout === 'stretto' && !affianca);
      if (layout !== st.layout) {
        st.layout = layout;
        costruisci();
        aggiornaLetture();
        aggiornaCicli();
        if (!st.listatoToccato) listato.open = layout === 'largo';
      }
    }

    function larghezzaUtile() {
      const cs = getComputedStyle(el);
      return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    }

    let ro = null;
    const suResize = () => disponi(larghezzaUtile());
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver((voci) => disponi(voci[0].contentRect.width));
      ro.observe(el);
    } else window.addEventListener('resize', suResize);
    disponi(larghezzaUtile());

    costruisciMissione();
    st.mis.aggiorna({ azione: 'inizio', ok: true }, alt);
    racconto('L\'Altair è acceso e la CPU aspetta all\'indirizzo 000 (spia <strong>WAIT</strong>). La RAM contiene <strong>valori casuali</strong>, come ogni memoria appena alimentata. Segui la missione: si comincia da <strong>RESET</strong>.');
    aggiornaTutto();
    bersagliFermi();

    return {
      attiva() { st.attivo = true; radice.classList.add('altair--attivo'); sveglia(); },
      sospendi() { st.attivo = false; radice.classList.remove('altair--attivo'); ciclo.stop(); },
      distruggi() {
        st.attivo = false;
        radice.classList.remove('altair--attivo');
        ciclo.stop();
        interrompiAuto();
        timer.forEach((t) => clearTimeout(t));
        timer.clear();
        Object.keys(levaSw).forEach((b) => { if (levaSw[b].tw) levaSw[b].tw.cancel(); });
        Object.keys(levaFn).forEach((id) => { if (levaFn[id].tw) levaFn[id].tw.cancel(); });
        if (ro) ro.disconnect(); else window.removeEventListener('resize', suResize);
      },
    };
  }

  /* =====================================================================
   * Il capitolo
   * ===================================================================== */

  P.registra({
    numero: 3,
    id: 'primi-pc',
    titolo: 'I primi personal computer',
    breve: 'Primi personal',
    periodo: '1965–1980',
    colore: 'var(--era-3)',
    sommario: 'Dalla Programma 101 all\'Altair 8800, dall\'Apple II a VisiCalc: come il computer arriva sulla scrivania di una persona sola, fra il 1965 e il 1980.',
    intro: 'Negli anni Sessanta un computer riempiva una stanza e serviva un\'intera organizzazione. In quindici anni diventa un oggetto da scrivania che una persona sola può comprare, accendere e programmare. Questo capitolo segue la strada: da una macchina da calcolo italiana del 1965 ai kit per appassionati con levette e lampadine, fino ai primi computer pronti all\'uso e al programma che fece vendere i computer da solo.',
    blocchi: [
      {
        tipo: 'testo',
        titolo: 'Una persona, una macchina',
        paragrafi: [
          'Fino alla metà degli anni Sessanta il calcolatore era una risorsa collettiva. Un grande sistema centrale (in inglese <em>mainframe</em>) costava milioni di dollari, occupava una sala climatizzata ed era affidato a operatori specializzati: chi voleva usarlo consegnava il proprio programma e tornava ore o giorni dopo a ritirare i risultati. Anche i minicomputer, più piccoli ed economici, erano condivisi da un laboratorio o da un reparto.',
          'L\'idea di <strong>personal computer</strong> capovolge questo rapporto: una persona, una macchina, sulla scrivania. Per arrivarci servono tre ingredienti. Il primo è un prezzo alla portata di un privato o di un piccolo ufficio; il secondo è una macchina abbastanza piccola e robusta da non chiedere una sala apposita; il terzo è un modo di usarla senza essere specialisti.',
          'La tecnologia arriva per gradi. I circuiti integrati riducono un armadio di componenti a poche schede; nel 1971 il <a href="../chip-programmabili/index.html#intel-4004">microprocessore</a> porta l\'intera unità centrale di elaborazione (CPU, <em>Central Processing Unit</em>) in un solo chip. Le memorie a semiconduttore prendono il posto dei nuclei di ferrite e costano ogni anno meno. Il resto lo fanno le persone: ingegneri visionari, piccole aziende e migliaia di appassionati.',
          'L\'espressione «personal computer» circola già negli anni Sessanta, ma diventa d\'uso comune solo alla fine degli anni Settanta. Per questo non esiste un «primo PC» indiscusso: a seconda di che cosa si considera essenziale (il microprocessore, il prezzo, la tastiera e lo schermo) il titolo va a macchine diverse. Qui le mettiamo in fila, partendo da Ivrea.',
        ],
      },
      {
        tipo: 'italia',
        titolo: 'Olivetti Programma 101, la «Perottina» (1965)',
        paragrafi: [
          'Nell\'ottobre 1965 la Olivetti presenta a New York, alla fiera del BEMA (<em>Business Equipment Manufacturers Association</em>), la <strong>Programma 101</strong>. L\'ha progettata a Ivrea un piccolo gruppo guidato da Pier Giorgio Perotto, con Giovanni De Sandre e Gastone Garziera; la carrozzeria, morbida e compatta, è di Mario Bellini. È una macchina da tavolo che si programma: una sequenza di fino a 120 istruzioni si registra su una scheda magnetica, si conserva in un cassetto e si ricarica in pochi secondi.',
          'Tecnicamente è una calcolatrice programmabile. La memoria, 240 byte in tutto, è una linea di ritardo magnetostrittiva: i bit viaggiano come impulsi meccanici lungo un filo metallico e vengono riletti all\'arrivo. I numeri, fino a 22 cifre, stanno in dieci registri e i risultati escono su un rotolo di carta. Ma c\'è già l\'idea essenziale del personal: una persona sola la usa, la programma e la tiene sulla scrivania. Costa circa 3.200 dollari e se ne vendono circa 44.000, soprattutto negli Stati Uniti.',
          'La NASA ne acquista una decina; secondo le testimonianze dei suoi ingegneri, furono usate anche nei calcoli di pianificazione della missione Apollo 11. Hewlett-Packard finì invece per riconoscere a Olivetti circa 900.000 dollari di royalty: la sua calcolatrice HP 9100A, del 1968, riprendeva soluzioni coperte dai brevetti della Programma 101, a cominciare dalla scheda magnetica.',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraProgramma101,
        alt: 'Disegno della Olivetti Programma 101 vista di fronte e dall\'alto: corpo chiaro dalle linee morbide, stampante con il rotolo di carta, fessura con una scheda magnetica inserita, tastiera numerica e lampade di segnalazione.',
        didascalia: '<strong>Olivetti Programma 101 (1965).</strong> 1 stampante con il rotolo di carta; 2 scheda magnetica nella sua fessura, con il programma registrato sulla striscia scura; 3 tastiera dei numeri e delle operazioni; 4 lampade di segnalazione e selettore dei decimali. Disegno schematico: la macchina vera pesava circa 35&nbsp;kg.',
      },
      {
        tipo: 'testo',
        titolo: 'Prima e dopo il microprocessore',
        paragrafi: [
          'Nel 1971 John Blankenbaker mette in vendita il <strong>Kenbak-1</strong>, costruito con circuiti integrati semplici della famiglia TTL (logica transistor-transistor), senza microprocessore. Ha 256 byte di memoria e nessuno schermo né tastiera: si programma con una fila di pulsanti e le risposte si leggono su una fila di lampadine. Costa 750 dollari, ma ne vengono costruiti meno di cinquanta prima che l\'azienda chiuda, nel 1973. Nel 1986 una giuria del Computer Museum di Boston lo ha premiato come primo personal computer della storia.',
          'La strada che porta ai PC di oggi passa però dal microprocessore. Nel 1973 la piccola azienda francese R2E (<em>Réalisation d\'Études Électroniques</em>) di André Truong Trong Thi consegna il <strong>Micral N</strong>, progettato da François Gernelle intorno all\'Intel 8008. Nasce per l\'istituto nazionale di ricerca agronomica (INRA), che cercava una macchina economica per automatizzare misure sull\'umidità delle coltivazioni. È considerato il primo microcomputer commerciale venduto già montato, non in scatola di montaggio.',
          'Nello stesso 1973, nel centro di ricerca di Xerox a Palo Alto (PARC, <em>Palo Alto Research Center</em>), entra in funzione lo <strong>Xerox Alto</strong>. È un\'altra idea di personal, molto più ambiziosa: uno schermo verticale a mappa di bit (606&nbsp;×&nbsp;808 punti, ognuno acceso o spento dal programma), un mouse, finestre e icone, il collegamento in rete Ethernet con le stampanti laser. L\'Alto non fu mai messo in vendita: ne furono costruiti fra 1.500 e 2.000 esemplari, usati per la ricerca dentro Xerox e in alcune università. Le sue idee torneranno nel Macintosh e in Windows, come racconta il capitolo <a href="#grafica">Pixel, finestre e multimedia</a>.',
          'Tutte queste macchine si reggono su chip sempre più capaci: l\'Intel 4004 del 1971, l\'8008 del 1972, l\'8080 del 1974. Che cosa succede dentro quei chip lo racconta la <a href="../chip-programmabili/index.html#otto-bit">sezione 5</a>; qui ci interessa che cosa si costruì intorno a loro.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Gennaio 1975: l\'Altair 8800',
        paragrafi: [
          'La svolta arriva da Albuquerque, nel Nuovo Messico. La MITS (<em>Micro Instrumentation and Telemetry Systems</em>) di Ed Roberts, una piccola ditta di kit elettronici in difficoltà, costruisce un computer intorno al nuovo Intel 8080 e lo propone alla rivista <em>Popular Electronics</em>, che lo mette in copertina nel numero di gennaio 1975. L\'<strong>Altair 8800</strong> costa 439 dollari in scatola di montaggio e 621 già montato: poco più del prezzo di listino del solo Intel 8080, che era di 360 dollari. Alla MITS arrivano migliaia di ordini nei primi mesi.',
          'Chi lo comprava riceveva una scatola metallica senza tastiera e senza schermo. Sul pannello frontale c\'erano 25 levette e 36 LED (diodi luminosi): con le levette si sceglievano un indirizzo di memoria e il byte da scriverci, un bit per levetta, mentre i LED mostravano indirizzo, dato e stato del processore. La versione base aveva 256 byte di RAM (la memoria di lavoro, che si cancella allo spegnimento) e un processore a 2&nbsp;MHz, cioè due milioni di impulsi di clock al secondo. Per non sbagliare, i bit si leggevano a gruppi di tre, in notazione ottale: è quello che si prova nel laboratorio qui sotto.',
          'Dentro, la scheda madre era quasi vuota: una fila di connettori a 100 contatti in cui si infilavano la scheda del processore, quella della memoria e poi, a poco a poco, schede per la telescrivente, il registratore a cassette e altra memoria. Presto altre aziende produssero schede compatibili e quel connettore divenne uno standard di fatto, il <a href="../../index.html#/bus/s100">bus S-100</a>, ufficializzato nel 1983 come norma IEEE 696. Il personal nasceva come piattaforma aperta, da espandere.',
          'Da solo l\'Altair sapeva fare ben poco, e questo creò un mercato. Bill Gates, studente a Harvard, e Paul Allen scrissero per lui un interprete del BASIC (<em>Beginner\'s All-purpose Symbolic Instruction Code</em>), il linguaggio semplice nato nel 1964 al Dartmouth College: non lo inventarono loro, ma riuscirono a farlo stare in 4&nbsp;KB di memoria. Non avevano un Altair, così lo provarono su un simulatore dell\'8080 che girava su un computer PDP-10 di Harvard. Poche settimane dopo Allen lo caricò ad Albuquerque da un nastro di carta perforata e funzionò al primo tentativo. Il 4 aprile 1975 i due fondarono la Micro-Soft, che sarebbe diventata Microsoft.',
          'Intorno all\'Altair nacquero anche i club. Il 5 marzo 1975, nel garage di Gordon French a Menlo Park, in California, si riunì per la prima volta l\'<strong>Homebrew Computer Club</strong>, il «club del computer fatto in casa»: una trentina di persone, molte idee e un Altair da guardare da vicino. Fra i frequentatori c\'era Steve Wozniak. Il 16 aprile Steve Dompier fece suonare al suo Altair <em>The Fool on the Hill</em> dei Beatles su una radio AM appoggiata accanto, sfruttando i disturbi elettromagnetici dei circuiti.',
        ],
      },
      {
        tipo: 'nota',
        testo: 'L\'Altair della copertina di <em>Popular Electronics</em> era una scatola vuota. L\'unico prototipo, spedito da Albuquerque alla redazione di New York, era stato smarrito dalla compagnia di trasporti; per la fotografia la MITS preparò in fretta un mobile con il solo pannello frontale, levette e LED compresi. La rivista pubblicò l\'articolo sulla fiducia, senza aver mai visto la macchina funzionare.',
      },
      { tipo: 'lab' },
      {
        tipo: 'numeri',
        items: [
          { valore: 44000, unita: 'esemplari', etichetta: 'Programma 101 vendute, soprattutto negli Stati Uniti (stima)' },
          { valore: 256, unita: 'byte', etichetta: 'la memoria RAM dell\'Altair 8800 nella versione base' },
          { valore: 439, unita: 'dollari', etichetta: 'l\'Altair 8800 in scatola di montaggio, nel 1975 (621 già montato)' },
          { valore: 666.66, decimali: 2, unita: 'dollari', etichetta: 'il prezzo dell\'Apple I, nel 1976' },
        ],
      },
      {
        tipo: 'testo',
        titolo: '1976–1977: computer pronti all\'uso',
        paragrafi: [
          'All\'Homebrew Computer Club Steve Wozniak mostrò, nel 1976, la scheda che aveva progettato intorno al MOS 6502, un processore che costava una frazione dell\'8080. Con Steve Jobs fondò la Apple Computer, che la mise in vendita come <strong>Apple I</strong> al prezzo di 666,66 dollari; il primo ordine, cinquanta pezzi, arrivò dal negozio Byte Shop di Paul Terrell. Rispetto all\'Altair era un bel passo avanti, perché si collegava a una tastiera e a un televisore. Ma si comprava come scheda nuda, senza mobile né alimentatore, e ne furono costruiti circa duecento.',
          'Il salto vero arrivò nel 1977, l\'anno che le riviste avrebbero poi chiamato della «trinità». In aprile la Apple presentò alla prima West Coast Computer Faire di San Francisco l\'<strong>Apple II</strong>: un mobile di plastica beige con la tastiera incorporata, il BASIC pronto in memoria all\'accensione, la grafica a colori su un normale televisore e otto connettori di espansione (<em>slot</em>) per aggiungere schede. Costava 1.298 dollari con 4&nbsp;KB di memoria, cioè 4.096 byte: una cifra importante, ma alla portata di una famiglia o di un piccolo ufficio.',
          'Gli altri due membri della trinità puntavano sulla semplicità. Il <strong>Commodore PET 2001</strong> (<em>Personal Electronic Transactor</em>), progettato da Chuck Peddle e mostrato al pubblico in gennaio, era tutto in un pezzo: tastiera, monitor e registratore a cassette per i programmi stavano nello stesso mobile di metallo. Il <strong>TRS-80 Model I</strong> della Tandy, presentato in agosto, si comprava nei negozi RadioShack di tutti gli Stati Uniti e con monitor e registratore costava circa 600 dollari: il computer arrivava sugli scaffali di migliaia di negozi, accanto alle radio e ai giradischi.',
          'Le tre macchine usavano processori a 8 bit: il MOS 6502 a circa 1&nbsp;MHz per Apple II e PET, lo Zilog Z80 a 1,77&nbsp;MHz per il TRS-80. Ma la vera novità era un\'altra: si toglievano dalla scatola, si accendevano e rispondevano con un cursore lampeggiante, pronte a ricevere comandi in BASIC. Niente saldatore, niente levette, niente ottale: il computer era diventato un elettrodomestico.',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraAppleII,
        alt: 'Disegno di un Apple II con il monitor appoggiato sopra, due lettori di dischetti Disk II impilati accanto, la tastiera incorporata nel mobile beige e un dischetto da 5 pollici e un quarto appoggiato di lato.',
        didascalia: '<strong>Apple II con due lettori Disk II</strong>, la configurazione tipica intorno al 1979 (disegno schematico). 1 monitor con un\'immagine a blocchi colorati e quattro righe di testo; 2 lettori di dischetti da 5¼ pollici; 3 tastiera incorporata nel mobile; 4 dischetto. Sotto il coperchio ci sono gli otto slot di espansione, dove si infilava anche la scheda di controllo dei dischi.',
      },
      {
        tipo: 'testo',
        titolo: '1978–1980: dischetti, sistemi operativi e il primo programma «killer»',
        paragrafi: [
          'Il registratore a cassette era lento e capriccioso: caricare un programma poteva richiedere minuti, e un errore di lettura costringeva a ricominciare. Nel 1978 la Apple mise in vendita il <strong>Disk II</strong>, un lettore di dischetti flessibili (<em>floppy disk</em>) da 5¼ pollici con una scheda di controllo progettata da Wozniak usando pochissimi chip. Un dischetto conteneva circa 113&nbsp;KB, poi 140&nbsp;KB, e un programma si caricava in pochi secondi: il personal diventava uno strumento con il suo archivio.',
          'Sulle macchine con processore 8080 o Z80, molte delle quali usavano il bus S-100, si diffuse invece il <strong>CP/M</strong> (<em>Control Program for Microcomputers</em>), il sistema operativo che Gary Kildall aveva scritto nel 1974. Il CP/M teneva separata la piccola parte che dipende dall\'hardware da quella che offre i comandi e gestisce i file: bastava riscrivere la prima per portare lo stesso sistema, e gli stessi programmi, su computer di marche diverse. È l\'idea di piattaforma comune che pochi anni dopo il <a href="#ibm-pc">PC IBM</a> porterà al trionfo.',
          'Il programma che cambiò tutto uscì nell\'ottobre 1979. Dan Bricklin e Bob Frankston scrissero per l\'Apple II <strong>VisiCalc</strong>, il primo foglio elettronico: una griglia di righe e colonne in cui ogni casella può contenere un numero o una formula, e basta cambiare un dato perché tutti i conti si aggiornino da soli. Contabili e piccoli imprenditori compravano un Apple II solo per usare VisiCalc. È l\'esempio classico di quella che in inglese si chiama <em>killer application</em>: un programma così utile da giustificare da solo l\'acquisto della macchina.',
          'Intanto il personal entrava in casa. Nel 1979 Atari presentò i modelli 400 e 800, con chip dedicati alla grafica e al suono che li rendevano perfetti per i videogiochi; nel 1980, in Gran Bretagna, Sinclair lanciò lo ZX80, venduto a meno di 100 sterline e da collegare al televisore. Il passo successivo lo fece un gigante: nel 1981 IBM entrò nel mercato con il suo <a href="#ibm-pc">Personal Computer</a>, e da lì comincia il prossimo capitolo.',
        ],
      },
      {
        tipo: 'schede',
        titolo: 'Macchine, persone e idee',
        items: [
          { anno: 1965, nome: 'Olivetti Programma 101', luogo: 'Olivetti, Ivrea', italia: true, testo: 'Calcolatrice da tavolo programmabile con scheda magnetica, progettata dal gruppo di Pier Giorgio Perotto e disegnata da Mario Bellini. Presentata a New York nell\'ottobre 1965, ne furono vendute circa 44.000.' },
          { anno: 1971, nome: 'Kenbak-1', luogo: 'Kenbak Corporation (Stati Uniti)', testo: 'Progettato da John Blankenbaker con circuiti TTL, senza microprocessore: 256 byte di memoria, pulsanti e lampadine. Costava 750 dollari; ne furono costruiti meno di cinquanta.' },
          { anno: 1973, nome: 'Micral N', luogo: 'R2E (Francia)', testo: 'Progettato da François Gernelle intorno all\'Intel 8008 per l\'istituto di ricerca agronomica INRA: il primo microcomputer commerciale venduto già montato.' },
          { anno: 1975, nome: 'MITS Altair 8800', luogo: 'MITS, Albuquerque (Stati Uniti)', testo: 'Kit da 439 dollari con Intel 8080 a 2&nbsp;MHz e 256 byte di RAM, in copertina su <em>Popular Electronics</em> nel gennaio 1975. Il suo bus diventò lo standard S-100.' },
          { anno: 1975, nome: 'Homebrew Computer Club', luogo: 'Menlo Park, California (Stati Uniti)', testo: 'Prima riunione il 5 marzo 1975 nel garage di Gordon French: il club di appassionati frequentato, fra gli altri, da Steve Wozniak.' },
          { anno: 1975, nome: 'Altair BASIC e Micro-Soft', luogo: 'Albuquerque (Stati Uniti)', testo: 'Bill Gates e Paul Allen scrivono un interprete BASIC da 4&nbsp;KB per l\'Altair e il 4 aprile 1975 fondano la Micro-Soft, poi Microsoft.' },
          { anno: 1976, nome: 'Apple I', luogo: 'Apple Computer, Los Altos (Stati Uniti)', testo: 'Scheda progettata da Steve Wozniak intorno al MOS 6502, venduta senza mobile a 666,66 dollari. Ne furono costruite circa duecento.' },
          { anno: 1977, nome: 'Apple II', luogo: 'Apple Computer, Cupertino (Stati Uniti)', testo: 'Mobile di plastica, tastiera, BASIC all\'accensione, grafica a colori e otto slot di espansione. Costava 1.298 dollari con 4&nbsp;KB di memoria.' },
          { anno: 1977, nome: 'Commodore PET 2001', luogo: 'Commodore (Stati Uniti)', testo: 'Progettato da Chuck Peddle: tastiera, monitor e registratore a cassette in un unico mobile, con il MOS 6502 a 1&nbsp;MHz.' },
          { anno: 1977, nome: 'TRS-80 Model I', luogo: 'Tandy RadioShack, Fort Worth (Stati Uniti)', testo: 'Zilog Z80 a 1,77&nbsp;MHz, venduto con monitor e registratore a circa 600 dollari nei negozi RadioShack di tutti gli Stati Uniti.' },
          { anno: 1979, nome: 'VisiCalc', luogo: 'Software Arts (Stati Uniti)', testo: 'Il primo foglio elettronico, di Dan Bricklin e Bob Frankston, per l\'Apple II: la prima <em>killer application</em> della storia del personal.' },
          { anno: 1980, nome: 'Sinclair ZX80', luogo: 'Sinclair, Cambridge (Regno Unito)', testo: 'Piccolo computer da collegare al televisore, venduto a meno di 100 sterline: il personal entra nelle case europee.' },
        ],
      },
    ],
    lab: {
      titolo: 'Il pannello dell\'Altair 8800',
      sottotitolo: 'Alza le levette, deposita i byte in ottale e fai sommare due numeri all\'Intel 8080, come nel 1975.',
      crea: creaLaboratorio,
    },
    punti: [
      'Il <strong>personal computer</strong> è un\'idea prima che una macchina: una persona, un computer, sulla scrivania, a un prezzo alla portata di un privato o di un piccolo ufficio.',
      'La <strong>Programma 101</strong> di Olivetti (1965) anticipò l\'idea con una macchina da tavolo programmabile su scheda magnetica: ne furono vendute circa 44.000.',
      'Il microprocessore rese possibile l\'<strong>Altair 8800</strong> (1975): un kit da 439 dollari che si programmava in ottale con levette e LED, e il cui bus divenne lo standard S-100.',
      'Dall\'Altair nacquero la Micro-Soft di Gates e Allen e una comunità di appassionati, come l\'Homebrew Computer Club, frequentato anche dai fondatori di Apple.',
      'Nel 1977 <strong>Apple II, Commodore PET e TRS-80</strong> portarono computer già pronti, con tastiera, schermo e BASIC all\'accensione.',
      'Dischetti, sistemi operativi come il CP/M e programmi come <strong>VisiCalc</strong> (1979) trasformarono il personal da hobby a strumento di lavoro.',
    ],
    collegamenti: [
      { testo: 'Bus S-100: il bus dell\'Altair 8800', href: '../../index.html#/bus/s100', tipo: 'buslab' },
      { testo: 'RS-232: la porta seriale della telescrivente', href: '../../index.html#/bus/rs232', tipo: 'buslab' },
      { testo: 'Sezione 5 · La corsa agli 8 bit (8080, 6502, Z80)', href: '../chip-programmabili/index.html#otto-bit', tipo: 'sezione' },
      { testo: 'Sezione 5 · Intel 4004, il primo microprocessore', href: '../chip-programmabili/index.html#intel-4004', tipo: 'sezione' },
      { testo: 'Sezione 7 · Il BASIC e il software dei personal', href: '../programmazione/index.html#personal', tipo: 'sezione' },
      { testo: 'Capitolo 4 · Il PC IBM', href: '#ibm-pc', tipo: 'sezione' },
      { testo: 'Capitolo 8 · Xerox Alto, finestre e mouse', href: '#grafica', tipo: 'sezione' },
      { testo: 'Quiz sul capitolo', href: '../quiz/index.html#storia-pc/primi-pc', tipo: 'sezione' },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
