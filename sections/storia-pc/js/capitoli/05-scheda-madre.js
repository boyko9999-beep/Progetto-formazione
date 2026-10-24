/*
 * Storia del PC · capitolo 5: Com'è fatto un PC: scheda madre, chipset e bus.
 * Testi, due illustrazioni (una scheda ATX di oggi e una Baby AT di metà anni '90) e il
 * laboratorio «Quattro epoche di schede madri». Dati, bande e geometria dello schema sono nel
 * modello js/modelli/05-scheda-madre.js. Il file non tocca il DOM al caricamento: il DOM si usa
 * solo dentro le funzioni svg() delle figure e dentro lab.crea().
 */
(function (root) {
  'use strict';
  const P = root.StoriaPC;
  const M = (root.StoriaPCModelli || {})['scheda-madre'];

  /* ======================================================================
   * Figure
   * ====================================================================== */

  // Le due figure sono disegnate in millimetri (1 unità = 1 mm della scheda) e in verticale:
  // così i numeri dei richiami restano leggibili sia sul telefono sia sul monitor.
  const n2 = (v) => String(Math.round(v * 100) / 100);
  function R(x, y, w, h, cls, extra) {
    return '<rect x="' + n2(x) + '" y="' + n2(y) + '" width="' + n2(w) + '" height="' + n2(h) + '"' + (cls ? ' class="' + cls + '"' : '') + (extra || '') + '/>';
  }
  function C(cx, cy, r, cls) { return '<circle cx="' + n2(cx) + '" cy="' + n2(cy) + '" r="' + n2(r) + '"' + (cls ? ' class="' + cls + '"' : '') + '/>'; }
  function Pth(d, cls) { return '<path d="' + d + '"' + (cls ? ' class="' + cls + '"' : '') + '/>'; }

  // Richiamo numerato, con una lineetta facoltativa verso il componente.
  function richiamo(n, x, y, verso) {
    return '<g class="sm-num">' +
      (verso ? Pth('M' + n2(x) + ' ' + n2(y) + 'L' + n2(verso[0]) + ' ' + n2(verso[1]), 'sm-num-linea') : '') +
      C(x, y, 8.6, 'sm-num-disco') +
      '<text x="' + n2(x) + '" y="' + n2(y) + '" dy=".36em" text-anchor="middle"' + (n > 9 ? ' class="due"' : '') + '>' + n + '</text></g>';
  }

  // Generatore pseudocasuale con seme: i piccoli componenti cadono sempre negli stessi posti.
  function caso(seme) {
    let s = seme >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // Chip con piedini sui quattro lati (QFP) o su due lati (DIP, SOIC).
  function chip(x, y, w, h, lati, passo, cls) {
    const o = [R(x, y, w, h, cls || 'sm-chip', ' rx="0.8"')];
    const p = passo || 1.6;
    const gambe = [];
    if (lati === 4 || lati === 'oriz') {
      for (let t = x + p; t < x + w - p / 2; t += p) gambe.push('M' + n2(t) + ' ' + n2(y - 1.4) + 'v1.4M' + n2(t) + ' ' + n2(y + h) + 'v1.4');
    }
    if (lati === 4 || lati === 'vert') {
      for (let t = y + p; t < y + h - p / 2; t += p) gambe.push('M' + n2(x - 1.4) + ' ' + n2(t) + 'h1.4M' + n2(x + w) + ' ' + n2(t) + 'h1.4');
    }
    if (gambe.length) o.push(Pth(gambe.join(''), 'sm-piedino'));
    return o.join('');
  }

  // Fila di contatti di un connettore a piedini (header) su due righe.
  function header(x, y, colonne, righe, cls) {
    const o = [R(x, y, colonne * 2.54 + 1, righe * 2.54 + 1, cls || 'sm-header', ' rx="0.5"')];
    const pin = [];
    for (let i = 0; i < colonne; i++) for (let j = 0; j < righe; j++) pin.push(R(x + 0.9 + i * 2.54, y + 0.9 + j * 2.54, 1.2, 1.2));
    o.push('<g class="sm-pin">' + pin.join('') + '</g>');
    return o.join('');
  }

  function figuraATX(P) {
    const idLga = P && P.uid ? P.uid('sm-lga') : 'sm-lga';
    const rnd = caso(1995);
    const o = [];
    o.push('<svg class="sm-fig sm-atx" viewBox="-14 -12 272 330" xmlns="http://www.w3.org/2000/svg">');
    o.push('<defs><pattern id="' + idLga + '" width="1.5" height="1.5" patternUnits="userSpaceOnUse">' + R(0.3, 0.3, 0.9, 0.9, 'sm-lga-pad') + '</pattern></defs>');

    // circuito stampato
    o.push(R(0, 0, 244, 305, 'sm-pcb-moderna', ' rx="3"'), R(1, 1, 242, 303, 'sm-bordo', ' rx="2.4"'));

    // piste: processore-memoria, processore-PCIe, PCH-SATA, processore-PCH (DMI), zona audio
    const piste = [];
    for (let i = 0; i < 9; i++) piste.push('M140 ' + (52 + i * 5.5) + 'H160');
    for (let i = 0; i < 7; i++) piste.push('M' + (74 + i * 4.5) + ' 106V171');
    for (let i = 0; i < 4; i++) piste.push('M197 ' + (200.5 + i * 11) + 'H228');
    for (let i = 0; i < 4; i++) piste.push('M' + (128 + i * 3) + ' 106V' + (190 - i * 3) + 'H' + (150 + i * 0) + '');
    for (let i = 0; i < 5; i++) piste.push('M26 ' + (126 + i * 4) + 'H34');
    for (let i = 0; i < 4; i++) piste.push('M196 ' + (214 + i * 6) + 'H214V' + (258 + i * 4) + 'H186');
    o.push(Pth(piste.join(''), 'sm-pista'));
    o.push(Pth('M2 266H44V303', 'sm-audio-linea'));

    // fori di fissaggio
    [[29, 9], [150, 9], [237, 9], [33, 124], [150, 124], [237, 124], [31, 296], [150, 296], [237, 296]]
      .forEach(([x, y]) => o.push(C(x, y, 3.2, 'sm-foro-anello'), C(x, y, 1.7, 'sm-foro-fondo')));

    // pannello posteriore (12): copertura metallica e porte che sporgono dal bordo
    o.push(Pth('M-6 12H22L27 17V116L23 120H-6Z', 'sm-metallo'));
    o.push(Pth('M-1 24H20M-1 46H20M-1 70H20M-1 94H20', 'sm-scanalatura'));
    o.push(R(-6, 123, 26, 43, 'sm-plastica', ' rx="1.5"'));
    [['sm-usb3', 16], ['sm-usb3', 24], ['sm-usb2', 34], ['sm-usb2', 42], ['sm-hdmi', 52], ['sm-usb3', 62], ['sm-usb3', 70], ['sm-lan', 79], ['sm-usbc', 96], ['sm-usbc', 104]]
      .forEach(([cls, y]) => o.push(R(-8.5, y, 3, cls === 'sm-lan' ? 13 : 6, cls, ' rx="0.6"')));
    [['sm-jack-v', 129], ['sm-jack-r', 140], ['sm-jack-b', 151]].forEach(([cls, y]) => o.push(C(-6, y + 4, 3, cls)));
    o.push(chip(34, 127, 8, 8, 4, 1.4));

    // VRM (2): dissipatori, induttori e condensatori
    o.push(R(27, 30, 14, 88, 'sm-dissipatore', ' rx="1.5"'));
    const alette = [];
    for (let y = 34; y < 116; y += 4) alette.push('M29 ' + y + 'H39');
    for (let x = 60; x < 145; x += 4) alette.push('M' + x + ' 5V18');
    o.push(R(56, 3, 90, 17, 'sm-dissipatore', ' rx="1.5"'));
    o.push(Pth(alette.join(''), 'sm-aletta'));
    for (let i = 0; i < 8; i++) o.push(R(60 + i * 10.5, 22, 7.4, 7.4, 'sm-induttore', ' rx="0.8"'), R(62 + i * 10.5, 25.2, 3.4, 1, 'sm-marchio'));
    for (let i = 0; i < 7; i++) o.push(R(43, 38 + i * 10.5, 7.4, 7.4, 'sm-induttore', ' rx="0.8"'), R(45, 41.2 + i * 10.5, 3.4, 1, 'sm-marchio'));
    for (let i = 0; i < 8; i++) o.push(C(82 + i * 7.6, 34, 2.3, 'sm-condensatore'), C(82 + i * 7.6, 34, 0.9, 'sm-condensatore-in'));
    for (let i = 0; i < 7; i++) o.push(C(55, 48 + i * 7.8, 2.3, 'sm-condensatore'), C(55, 48 + i * 7.8, 0.9, 'sm-condensatore-in'));

    // connettore a 8 poli per il processore (EPS) e connettore della ventola
    o.push(R(36, 2, 17.5, 9, 'sm-connettore', ' rx="0.8"'));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) o.push(R(37.4 + i * 4.2, 3.3 + j * 3.9, 2.8, 2.6, 'sm-foro-quadro'));
    o.push(R(156, 3, 10.5, 5.5, 'sm-connettore', ' rx="0.6"'));

    // zoccolo LGA (1): telaio, campo di contatti dorati, leva e fori del dissipatore
    [[72, 36], [150, 36], [72, 114], [150, 114]].forEach(([x, y]) => o.push(C(x, y, 2.4, 'sm-foro-anello'), C(x, y, 1.2, 'sm-foro-fondo')));
    o.push(R(82, 44, 58, 62, 'sm-metallo-chiaro', ' rx="3"'));
    o.push(R(88, 50, 46, 50, 'sm-zoccolo', ' rx="1.5"'));
    o.push(R(90, 52.5, 42, 45, null, ' fill="url(#' + idLga + ')"'));
    o.push(R(104, 66, 14, 17, 'sm-zoccolo'));
    [[85, 47], [137, 47], [85, 103], [137, 103]].forEach(([x, y]) => o.push(C(x, y, 1.6, 'sm-vite')));
    o.push(Pth('M143.5 49V104.5Q143.5 108 147 108H149', 'sm-leva'));

    // slot della memoria (3): due canali, due slot per canale
    [160, 168, 178.5, 186.5].forEach((x, i) => {
      o.push(R(x, 16, 6, 148, i % 2 ? 'sm-slot sm-slot-b' : 'sm-slot', ' rx="1"'));
      o.push(R(x + 2.4, 20, 1.2, 140, 'sm-slot-solco'));
      o.push(R(x + 1.6, 85, 2.8, 2, 'sm-slot-chiave'));
      o.push(R(x - 0.5, 11, 7, 6.5, 'sm-gancio', ' rx="1"'), R(x - 0.5, 163.5, 7, 6.5, 'sm-gancio', ' rx="1"'));
    });

    // connettore di alimentazione ATX a 24 poli (4)
    o.push(R(230, 58, 11, 52, 'sm-connettore', ' rx="1"'), R(241, 79, 2, 10, 'sm-connettore'));
    for (let j = 0; j < 12; j++) for (let i = 0; i < 2; i++) o.push(R(231.5 + i * 4.4, 59.6 + j * 4.2, 3.2, 3, 'sm-foro-quadro'));

    // slot M.2 con un SSD montato (6)
    o.push(R(37, 141, 7, 24, 'sm-slot', ' rx="0.8"'));
    o.push(R(44, 142.5, 80, 21, 'sm-ssd', ' rx="1"'), R(50, 145.5, 40, 15, 'sm-etichetta', ' rx="0.6"'));
    o.push(Pth('M54 150H82M54 154H76', 'sm-etichetta-righe'));
    o.push(chip(95, 147, 10, 11, null), R(108, 146, 13, 14, 'sm-chip', ' rx="0.6"'));
    o.push(C(124, 153, 2.6, 'sm-vite'), Pth('M122.6 153h2.8M124 151.6v2.8', 'sm-vite-croce'));

    // slot PCI Express: x16 rinforzato (5), x1, x16 con 4 corsie, x1
    o.push(R(17, 169.5, 95, 12, 'sm-metallo-chiaro', ' rx="1.2"'));
    o.push(R(19, 172, 90, 7, 'sm-slot', ' rx="0.8"'), R(21, 175, 86, 1, 'sm-slot-solco'), R(30.5, 172, 1.2, 7, 'sm-slot-chiave'));
    o.push(R(108.5, 170.5, 6, 10, 'sm-gancio', ' rx="1"'));
    o.push(R(19, 196, 25, 6.5, 'sm-slot', ' rx="0.8"'), R(21, 198.8, 21, 1, 'sm-slot-solco'), R(30.5, 196, 1.2, 6.5, 'sm-slot-chiave'));
    o.push(R(19, 236, 90, 7, 'sm-slot', ' rx="0.8"'), R(21, 239, 86, 1, 'sm-slot-solco'), R(30.5, 236, 1.2, 7, 'sm-slot-chiave'), R(108.5, 235, 5, 9, 'sm-gancio', ' rx="1"'));
    o.push(R(19, 257.5, 25, 6.5, 'sm-slot', ' rx="0.8"'), R(21, 260.3, 21, 1, 'sm-slot-solco'), R(30.5, 257.5, 1.2, 6.5, 'sm-slot-chiave'));

    // batteria CR2032 (10)
    o.push(C(125, 214, 11.6, 'sm-portapila'), C(125, 214, 10, 'sm-pila'), C(125, 214, 7.4, 'sm-pila-in'));

    // zona audio: codec, condensatori, connettore frontale
    o.push(chip(9, 276, 9, 9, 4, 1.3));
    [[26, 273], [33, 273], [26, 281], [33, 281], [40, 273]].forEach(([x, y]) => o.push(C(x, y, 2.7, 'sm-cond-audio'), C(x, y, 1, 'sm-condensatore-in')));
    o.push(header(5, 296, 5, 2));

    // PCH sotto il dissipatore (7)
    o.push(Pth('M150 200H190L197 207V246H157L150 239Z', 'sm-dissipatore'));
    o.push(Pth('M154 204H188L193 209V242H159L154 237Z', 'sm-dissipatore-luce'));
    o.push(Pth('M160 214H187M160 220H187M160 226H187M160 232H187', 'sm-aletta'));

    // porte SATA (8)
    for (let i = 0; i < 4; i++) {
      const y = 196 + i * 11;
      o.push(R(228, y, 14, 9, 'sm-sata', ' rx="0.8"'), Pth('M231 ' + (y + 2.6) + 'h8.5v2.2h-6.2v2h-2.3z', 'sm-sata-l'));
    }

    // Super I/O, chip del firmware (9) con la sua serigrafia, piccoli componenti
    o.push(chip(158, 262, 12, 12, 4, 1.2));
    o.push(R(183.5, 263.5, 11, 11, 'sm-serigrafia', ' rx="0.8"'), chip(186, 266, 6, 6, 'vert', 1.5));
    for (let i = 0; i < 26; i++) {
      const zona = i < 14 ? [86, 108, 50, 26] : [152, 248, 40, 10];
      const x = zona[0] + rnd() * zona[2];
      const y = zona[1] + rnd() * zona[3];
      o.push(R(x, y, rnd() < 0.5 ? 1.6 : 0.9, rnd() < 0.5 ? 0.9 : 1.6, 'sm-smd'));
    }

    // connettori lungo il bordo (11): pannello frontale, USB interne, ventola
    o.push(header(204, 294, 5, 2), header(168, 294, 5, 2), R(132, 295, 10.5, 5.5, 'sm-connettore', ' rx="0.6"'));
    o.push(R(233, 255, 8.5, 27, 'sm-header-blu', ' rx="0.8"'));
    const pinUsb3 = [];
    for (let j = 0; j < 9; j++) pinUsb3.push(R(234.6, 257 + j * 2.6, 1.2, 1.2), R(238.2, 257 + j * 2.6, 1.2, 1.2));
    o.push('<g class="sm-pin">' + pinUsb3.join('') + '</g>');

    // richiami numerati
    o.push(
      richiamo(1, 111, 75), richiamo(2, 101, 11.5), richiamo(3, 205, 50, [192.5, 50]), richiamo(4, 220, 84),
      richiamo(5, 124, 175.5), richiamo(6, 137, 153), richiamo(7, 173.5, 223), richiamo(8, 215, 218),
      richiamo(9, 189, 254.5, [189, 263.5]), richiamo(10, 139.5, 228.5), richiamo(11, 213, 284.5), richiamo(12, 10, 66));
    o.push('</svg>');
    return o.join('');
  }

  function figuraBabyAT(P) {
    const idZif = P && P.uid ? P.uid('sm-zif') : 'sm-zif';
    const o = [];
    o.push('<svg class="sm-fig sm-babyat" viewBox="-10 -12 236 352" xmlns="http://www.w3.org/2000/svg">');
    o.push('<defs><pattern id="' + idZif + '" width="2.54" height="2.54" patternUnits="userSpaceOnUse">' + C(1.27, 1.27, 0.55, 'sm-zif-foro') + '</pattern></defs>');

    // circuito stampato verde, bordo posteriore in alto
    o.push(R(0, 0, 216, 330, 'sm-pcb-verde', ' rx="2.5"'), R(1, 1, 214, 328, 'sm-bordo', ' rx="2"'));

    // piste: il bus ISA unisce gli stessi contatti di tutti gli slot
    const piste = [];
    for (let y = 22; y < 148; y += 7) piste.push('M21.5 ' + y + 'H74.5');
    for (let y = 30; y < 106; y += 9) piste.push('M101.5 ' + y + 'H134.5');
    for (let i = 0; i < 6; i++) piste.push('M' + (150 + i * 4) + ' 201V246');
    for (let i = 0; i < 5; i++) piste.push('M150 ' + (252 + i * 5) + 'H122');
    for (let i = 0; i < 4; i++) piste.push('M88 ' + (182 + i * 5) + 'H106');
    for (let i = 0; i < 4; i++) piste.push('M' + (64 + i * 6) + ' 205V252');
    o.push(Pth(piste.join(''), 'sm-pista-verde'));

    // fori di fissaggio
    [[9, 10], [9, 164], [9, 300], [96, 160], [207, 112], [207, 238], [124, 300]]
      .forEach(([x, y]) => o.push(C(x, y, 3.2, 'sm-foro-anello'), C(x, y, 1.7, 'sm-foro-fondo')));

    // slot ISA a 16 bit (1): parte a 8 bit, tacca, prolunga a 16 bit
    [18, 38, 58, 78].forEach((x) => {
      o.push(R(x - 3.5, 14, 7, 85, 'sm-slot', ' rx="0.8"'), R(x - 3.5, 102, 7, 48, 'sm-slot', ' rx="0.8"'));
      o.push(R(x - 0.6, 17, 1.2, 79, 'sm-slot-solco'), R(x - 0.6, 105, 1.2, 42, 'sm-slot-solco'));
    });

    // slot PCI bianchi (2)
    [98, 118, 138].forEach((x) => {
      o.push(R(x - 3.5, 22, 7, 85, 'sm-slot-bianco', ' rx="0.8"'), R(x - 0.6, 25, 1.2, 79, 'sm-slot-solco-chiaro'), R(x - 3.5, 33, 7, 1.4, 'sm-slot-chiave-chiara'));
    });

    // connettore della tastiera DIN (10), alimentazione AT P8 e P9 (11), batteria (9)
    o.push(R(187, -3, 18, 18, 'sm-plastica', ' rx="1.5"'), C(196, 4, 7, 'sm-metallo-chiaro'), C(196, 4, 4.4, 'sm-zoccolo'));
    [[196, 1.6], [193.4, 3.2], [198.6, 3.2], [194.2, 6], [197.8, 6]].forEach(([x, y]) => o.push(C(x, y, 0.6, 'sm-din-pin')));
    o.push(R(128, 4, 48, 9, 'sm-connettore', ' rx="0.8"'), Pth('M152 4V13', 'sm-divisore'));
    for (let i = 0; i < 12; i++) o.push(R(129.3 + i * 3.96, 6, 2.6, 5, 'sm-foro-quadro'));
    o.push(C(204, 60, 10.6, 'sm-portapila'), C(204, 60, 9, 'sm-pila'), C(204, 60, 6.6, 'sm-pila-in'));

    // controller della tastiera (DIP a 40 piedini) vicino al suo connettore
    o.push(chip(146, 84, 52, 15, 'oriz', 2.54));

    // regolatore di tensione del processore con aletta di alluminio
    o.push(R(160, 116, 22, 22, 'sm-dissipatore-alu', ' rx="1"'));
    o.push(Pth('M163 118V136M167 118V136M171 118V136M175 118V136M179 118V136', 'sm-aletta-alu'));
    [[188, 122], [188, 132], [196, 127]].forEach(([x, y]) => o.push(C(x, y, 3.6, 'sm-elettrolitico'), Pth('M' + (x - 2) + ' ' + y + 'h4M' + x + ' ' + (y - 2) + 'v4', 'sm-elettrolitico-croce')));

    // zoccolo ZIF Socket 7 (3) con la leva
    o.push(R(150, 150, 50, 50, 'sm-zif', ' rx="1.2"'), R(153, 153, 44, 44, null, ' fill="url(#' + idZif + ')"'), R(166, 166, 18, 18, 'sm-zif'));
    o.push(Pth('M146 151V205Q146 208 149 208H156', 'sm-leva'));

    // cache di secondo livello (4): due SRAM e la TAG RAM
    o.push(chip(150, 212, 14, 20, 'vert', 1.4), chip(168, 212, 14, 20, 'vert', 1.4), chip(187, 210, 7, 24, 'vert', 2.54));

    // ponticelli di configurazione
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) o.push(R(128 + j * 6, 214 + i * 8, 4.4, 6, j ? 'sm-ponticello-b' : 'sm-ponticello-a', ' rx="0.8"'));

    // northbridge (6) e southbridge (7), quarzo, chip del BIOS (8)
    o.push(chip(150, 248, 28, 28, 4, 1.4), chip(60, 176, 28, 28, 4, 1.4));
    o.push(R(90, 222, 11, 4.6, 'sm-quarzo', ' rx="2.3"'));
    // Super I/O: dischetto, porte seriali e parallela, vicino ai loro connettori
    o.push(chip(20, 214, 24, 24, 4, 1.4));
    o.push(chip(108, 168, 14, 42, 'vert', 2.54), R(109.5, 172, 11, 34, 'sm-etichetta', ' rx="0.6"'), Pth('M111.5 180h7M111.5 184h7M111.5 188h5', 'sm-etichetta-righe'));

    // slot SIMM per la memoria (5)
    [256, 266, 276, 286].forEach((y) => {
      o.push(R(12, y, 108, 6, 'sm-slot-bianco', ' rx="0.8"'), R(15, y + 2.4, 102, 1.2, 'sm-slot-solco-chiaro'));
      o.push(R(9.5, y - 0.5, 4, 7, 'sm-gancio-metallo', ' rx="0.6"'), R(118.5, y - 0.5, 4, 7, 'sm-gancio-metallo', ' rx="0.6"'));
    });

    // connettori a piedini lungo il bordo inferiore: seriali, parallela, dischetto, IDE (12), USB
    o.push(header(18, 306, 5, 2), header(18, 316, 5, 2), header(36, 306, 13, 2), header(76, 316, 17, 2));
    o.push(R(129, 305, 52.5, 7.5, 'sm-header-scatola', ' rx="0.8"'), header(130, 305.3, 20, 2));
    o.push(R(129, 315, 52.5, 7.5, 'sm-header-scatola', ' rx="0.8"'), header(130, 315.3, 20, 2));
    o.push(header(190, 306, 5, 2));

    // richiami numerati
    o.push(
      richiamo(1, 48, 124), richiamo(2, 128, 64), richiamo(3, 175, 175), richiamo(4, 166, 222),
      richiamo(5, 66, 271), richiamo(6, 164, 262), richiamo(7, 74, 190), richiamo(8, 115, 196),
      richiamo(9, 183, 62), richiamo(10, 196, 26), richiamo(11, 152, 24), richiamo(12, 156, 296));
    o.push('</svg>');
    return o.join('');
  }

  /* ======================================================================
   * Laboratorio
   * ====================================================================== */

  // Nomi delle lezioni di BusLab collegate dalle schede dei collegamenti.
  const NOMI_BUSLAB = { isa: 'ISA', pci: 'PCI', pcie: 'PCI Express', sata: 'SATA', usb: 'USB', rs232: 'RS-232', thunderbolt: 'Thunderbolt' };
  // Collegamento scelto all'arrivo in un'epoca, se quello di prima non esiste più.
  const PRIMA_SCELTA = { 1981: 'bus', 1998: 'hub', 2010: 'hub', 2020: 'mem' };
  // Scala dei tempi delle barre di confronto: da 1 ms a circa 46 giorni.
  const T_MIN = 1e-3;
  const T_MAX = 4e6;

  function creaLab(el, ctx) {
    const h = ctx.h;
    const s = ctx.s;
    if (!M) {
      el.append(h('p', { class: 'lab-errore' }, 'Il modello del laboratorio non è stato caricato.'));
      return {};
    }
    const G = M.geometria;
    const EP = M.EPOCHE.map((e) => e.id);
    const DURATA = Math.round(ctx.motion.dur.crawl * 1.25);

    const stato = { epoca: '1981', layout: 'larga', flusso: 'disco', dim: 'film', scelto: 'bus', pausa: false, passo: null };
    const dimensione = () => M.DIMENSIONI.find((d) => d.id === stato.dim);
    const flussoDi = (id) => M.FLUSSI.find((f) => f.id === id);
    const nomeNodo = (epId, id) => { const n = M.epoca(epId).nodi[id]; return n ? n.nome : id; };

    let visibile = false;
    let morph = null;          // animazione di passaggio fra due epoche
    let linkCorr = {};         // collegamenti disegnati: id -> elementi
    let decoCorr = null;       // decorazioni dell'epoca (core, slot PCI)
    let mostrati = {};         // riquadri dei nodi come sono ora sullo schermo
    let rotte = {};            // percorsi dei pacchetti per flusso
    let pacchetti = [];
    let gettoni = {};          // strade condivise occupate: chiave -> pacchetto
    let prossimo = {};         // prossima partenza per flusso
    let orologio = 0;
    let passoTween = null;
    let passoDopo = false; // passo passo chiesto mentre lo schema si trasforma: parte alla fine
    let fsCorr = 12;          // corpo del testo dello schema, in unità del disegno
    const caso = (() => { let x = 7; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; })();

    /* ---------- struttura ---------- */

    const radice = h('div', { class: 'sm-lab' });

    const segEpoca = h('div', { class: 'lab-seg sm-seg-epoca', role: 'group', 'aria-label': 'Epoca della scheda madre' });
    const btnEpoca = {};
    M.EPOCHE.forEach((e) => {
      const b = h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => vaiA(e.id) },
        h('span', { class: 'sm-seg-anno' }, e.id), h('span', { class: 'sm-seg-sotto' }, e.breve));
      btnEpoca[e.id] = b;
      segEpoca.append(b);
    });
    const btnAvanti = h('button', { type: 'button', class: 'lab-btn primary sm-avanti', onclick: () => vaiA(EP[(EP.indexOf(stato.epoca) + 1) % EP.length]) }, 'Avanti nel tempo');
    const btnPausa = h('button', { type: 'button', class: 'lab-btn sm-pausa', 'aria-pressed': 'false', onclick: () => impostaPausa(!stato.pausa) });
    const barra = h('div', { class: 'lab-controls sm-barra' }, segEpoca, btnAvanti, h('span', { class: 'sm-spazio' }), btnPausa);

    const idPunti = ctx.uid('sm-punti');
    const svg = s('svg', { class: 'lab-svg sm-svg', role: 'group' });
    const defs = s('defs', null, s('pattern', { id: idPunti, width: 16, height: 16, patternUnits: 'userSpaceOnUse' }, s('circle', { cx: 1, cy: 1, r: 1, class: 'sm-punto' })));
    const fondo = s('rect', { class: 'sm-fondo', fill: 'url(#' + idPunti + ')' });
    const annoFondo = s('text', { class: 'sm-anno-fondo', 'aria-hidden': 'true' });
    const gCont = s('g', { 'aria-hidden': 'true' });
    const gDeco = s('g', { 'aria-hidden': 'true' });
    const gLink = s('g', { class: 'sm-links' });
    const gPac = s('g', { class: 'sm-pacchetti', 'aria-hidden': 'true' });
    const gNodi = s('g', { 'aria-hidden': 'true' });
    const gEt = s('g', { class: 'sm-etichette', 'aria-hidden': 'true' });
    const gPasso = s('g', { class: 'sm-passo-g', 'aria-hidden': 'true' });
    svg.append(defs, fondo, annoFondo, gCont, gDeco, gLink, gPac, gNodi, gEt, gPasso);
    const scena = h('div', { class: 'sm-scena' }, svg);

    const nota = h('p', { class: 'lab-note sm-nota', 'aria-live': 'polite' });

    // scheda del collegamento scelto
    const cTit = h('h4', { class: 'sm-card-tit' });
    const cTag = h('p', { class: 'sm-card-tag' });
    const cBanda = h('p', { class: 'sm-card-banda lab-mono' });
    const cFormula = h('p', { class: 'sm-card-formula lab-mono' });
    const cTesto = h('p', { class: 'sm-card-testo' });
    const cTempo = h('p', { class: 'sm-card-tempo' });
    const cBuslab = h('a', { class: 'lab-btn sm-card-buslab' });
    const btnLinkPrec = h('button', { type: 'button', class: 'lab-btn', 'aria-label': 'Collegamento precedente', onclick: () => scorriLink(-1) }, '‹');
    const btnLinkSucc = h('button', { type: 'button', class: 'lab-btn', 'aria-label': 'Collegamento successivo', onclick: () => scorriLink(1) }, '›');
    const card = h('section', { class: 'lab-panel sm-card', 'aria-label': 'Scheda del collegamento scelto' },
      h('div', { class: 'sm-card-testa' }, h('p', { class: 'sm-pannello-tit' }, 'Collegamento'), h('div', { class: 'sm-card-nav' }, btnLinkPrec, btnLinkSucc)),
      cTit, cTag, cBanda, cFormula, cTesto, cTempo, cBuslab);

    // viaggio di un file: flusso, dimensione, collo di bottiglia, confronto fra epoche
    const segFlusso = h('div', { class: 'lab-seg sm-seg-flusso', role: 'group', 'aria-label': 'Che cosa copiare' });
    const btnFlusso = {};
    M.FLUSSI.forEach((f) => {
      const b = h('button', { type: 'button', class: 'sm-c-' + f.id, 'aria-pressed': 'false', onclick: () => sceltaFlusso(f.id) }, h('span', { class: 'sm-pallino', 'aria-hidden': 'true' }), f.nome);
      btnFlusso[f.id] = b;
      segFlusso.append(b);
    });
    const segDim = h('div', { class: 'lab-seg sm-seg-dim', role: 'group', 'aria-label': 'Dimensione del file' });
    const btnDim = {};
    M.DIMENSIONI.forEach((d) => {
      const b = h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => sceltaDim(d.id) }, d.nome + ' ' + M.formattaByte(d.byte));
      btnDim[d.id] = b;
      segDim.append(b);
    });
    const vPercorso = h('dd', null);
    const vCollo = h('dd', null);
    const vTempo = h('dd', { class: 'sm-tempo-grande' });
    const kv = h('dl', { class: 'lab-kv sm-kv' },
      h('div', { class: 'sm-kv-largo' }, h('dt', null, 'Percorso'), vPercorso),
      h('div', null, h('dt', null, 'Tratto più lento'), vCollo),
      h('div', null, h('dt', null, 'Tempo'), vTempo));
    const righeConf = {};
    const listaConf = h('div', { class: 'sm-conf', role: 'group', 'aria-label': 'Lo stesso file nelle quattro epoche' });
    M.EPOCHE.forEach((e) => {
      const barraConf = h('span', { class: 'sm-conf-barra' }, h('i'));
      const tempo = h('span', { class: 'sm-conf-tempo lab-mono' });
      const b = h('button', { type: 'button', class: 'sm-conf-riga', 'aria-pressed': 'false', onclick: () => vaiA(e.id) },
        h('span', { class: 'sm-conf-anno lab-mono' }, e.id), barraConf, tempo);
      righeConf[e.id] = { b: b, i: barraConf.firstChild, tempo: tempo };
      listaConf.append(b);
    });
    const btnPasso = h('button', { type: 'button', class: 'lab-btn primary sm-passo-avvia', onclick: () => avviaPasso() }, 'Segui un dato, passo passo');
    const btnIndietro = h('button', { type: 'button', class: 'lab-btn', onclick: () => passo(-1) }, '‹ Indietro');
    const btnSucc = h('button', { type: 'button', class: 'lab-btn primary', onclick: () => passo(1) }, 'Avanti ›');
    const btnEsci = h('button', { type: 'button', class: 'lab-btn', onclick: () => esciPasso() }, 'Esci');
    const ctrlPasso = h('div', { class: 'lab-controls sm-passo-ctrl' }, btnPasso, btnIndietro, btnSucc, btnEsci);
    const viaggio = h('section', { class: 'lab-panel sm-viaggio', 'aria-label': 'Quanto tempo per copiare un file' },
      h('p', { class: 'sm-pannello-tit' }, 'Quanto tempo per copiare…'),
      h('div', { class: 'sm-viaggio-scelte' }, segFlusso, segDim),
      kv,
      h('p', { class: 'sm-conf-tit' }, 'Lo stesso file nelle quattro epoche'),
      listaConf,
      h('p', { class: 'sm-conf-nota' }, 'Nel 1981 un file così era fantascienza (un dischetto conteneva 160 KB): il conto serve solo a confrontare le strade. Conta il tratto più lento del percorso.'),
      ctrlPasso);

    radice.append(barra, scena, nota, h('div', { class: 'sm-pannelli' }, card, viaggio));
    el.append(radice);

    /* ---------- nodi ---------- */

    const nodi = {};
    M.NODI.forEach((id) => {
      if (id === 'bus') return;
      const r = s('rect', { class: 'sm-nodo-box', rx: id === 'pkg' ? 16 : 10 });
      const g = s('g', { class: 'sm-nodo sm-n-' + id }, r);
      (id === 'pkg' || id === 'cpu' ? gCont : gNodi).append(g);
      const t1 = s('tspan', { class: 'sm-tit' });
      const t2 = s('tspan', { class: 'sm-sot' });
      const testo = s('text', { class: 'sm-nodo-et sm-n-' + id, 'text-anchor': 'middle' }, t1, t2);
      gEt.append(testo);
      nodi[id] = { g: g, r: r, testo: testo, t1: t1, t2: t2, chiave: '' };
    });

    function testiNodo(id, epId) {
      const n = M.epoca(epId).nodi[id];
      if (!n) return null;
      const stretta = stato.layout === 'stretta';
      return {
        tit: (stretta && n.nomeBreve) || n.nome,
        sot: id === 'pkg' ? '' : ((stretta && n.sottoBreve) || n.sotto || ''),
        cont: !!n.contenitore,
        sx: M.disposizione(stato.layout, epId).titoli[id] === 'sx',
      };
    }

    function posaNodo(id, b, testi, alfaTesto) {
      const n = nodi[id];
      if (!n) return;
      n.r.setAttribute('x', b.x.toFixed(2));
      n.r.setAttribute('y', b.y.toFixed(2));
      n.r.setAttribute('width', Math.max(0, b.w).toFixed(2));
      n.r.setAttribute('height', Math.max(0, b.h).toFixed(2));
      n.g.style.opacity = b.o.toFixed(3);
      n.g.style.visibility = b.o < 0.01 ? 'hidden' : 'visible';
      if (!testi) { n.testo.style.opacity = '0'; return; }
      const chiave = testi.tit + '|' + testi.sot + '|' + testi.cont;
      if (chiave !== n.chiave) {
        n.chiave = chiave;
        n.t1.textContent = testi.tit;
        n.t2.textContent = testi.sot ? (testi.cont ? '\u00a0· ' + testi.sot : testi.sot) : '';
      }
      const cx = b.x + b.w / 2;
      if (id === 'pkg') {
        // in basso a sinistra; nello schema stretto al centro, fra i due collegamenti che escono
        const centro = stato.layout === 'stretta';
        n.testo.setAttribute('text-anchor', centro ? 'middle' : 'start');
        n.t1.setAttribute('x', (centro ? cx : b.x + 14).toFixed(2));
        n.t1.setAttribute('y', (b.y + b.h - 10).toFixed(2));
      } else if (testi.cont) {
        // contenitore: nome e sigla su una riga, in alto (al centro o a sinistra)
        n.testo.setAttribute('text-anchor', testi.sx ? 'start' : 'middle');
        n.t1.setAttribute('x', (testi.sx ? b.x + 14 : cx).toFixed(2));
        n.t1.setAttribute('y', (b.y + 22).toFixed(2));
        n.t2.removeAttribute('x');
        n.t2.setAttribute('dy', '0');
      } else {
        n.testo.setAttribute('text-anchor', 'middle');
        n.t1.setAttribute('x', cx.toFixed(2));
        n.t1.setAttribute('y', (b.y + b.h / 2 + (testi.sot ? -3 : 5)).toFixed(2));
        n.t2.setAttribute('x', cx.toFixed(2));
        n.t2.setAttribute('dy', '1.3em');
      }
      n.testo.style.opacity = (b.o * alfaTesto).toFixed(3);
    }

    /* ---------- collegamenti ---------- */

    function geometriaLink(epId, l, boxes, disp) {
      if (l.bus) {
        const bb = boxes.bus;
        return bb.h < bb.w ? [{ x: bb.x, y: bb.y }, { x: bb.x + bb.w, y: bb.y }] : [{ x: bb.x, y: bb.y }, { x: bb.x, y: bb.y + bb.h }];
      }
      const spec = disp.link[l.id];
      const A = G.ancora(boxes[l.da], spec.da);
      const B = G.ancora(boxes[l.a], spec.a, A);
      return G.instrada(A, B, spec.mid);
    }

    function creaLinks(epId) {
      const e = M.epoca(epId);
      const mappa = {};
      e.collegamenti.forEach((l0) => {
        const l = M.collegamento(epId, l0.id);
        const muto = l.interno && !l.banda;          // tratto dentro il chip, senza banda propria
        const gruppo = !!l0.gruppo;                   // tratto del bus del 1981
        const flussi = M.flussiDi(epId, gruppo ? l0.gruppo : l0.id);
        const colore = muto ? 'sm-c-interno' : (flussi.length === 1 ? 'sm-c-' + flussi[0] : 'sm-c-misto');
        const largh = muto ? 2 : M.spessore(l.banda);
        const attrs = { class: 'sm-link ' + colore + (muto ? ' sm-muto' : '') };
        const selezione = gruppo ? 'bus' : l0.id;
        if (!muto && !gruppo) {
          attrs.tabindex = '0';
          attrs.role = 'button';
          attrs['aria-label'] = l.sigla + ', ' + (l.zeroCopia ? 'nessuna copia' : (l.stima ? 'circa ' : '') + M.formattaBanda(l.banda)) + ': apri la scheda';
        }
        const hit = s('path', { class: 'sm-link-hit' });
        const alone = s('path', { class: 'sm-link-alone', 'stroke-width': (largh + 12).toFixed(1) });
        const casing = s('path', { class: 'sm-link-casing', 'stroke-width': (largh + 3.5).toFixed(1) });
        const filo = s('path', { class: 'sm-link-filo', 'stroke-width': largh.toFixed(1) });
        const luce = s('path', { class: 'sm-link-luce', 'stroke-width': Math.max(0.8, largh * 0.28).toFixed(1) });
        const g = s('g', attrs, hit, alone, casing, filo, luce);
        if (!muto) {
          g.addEventListener('click', () => scegliLink(selezione, true));
          if (!gruppo) {
            g.addEventListener('keydown', (ev) => {
              if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); scegliLink(selezione, true); }
            });
          }
        }
        gLink.append(g);
        let et = null;
        if (!muto && !gruppo) {
          const r1 = s('tspan', { class: 'sm-et-1' });
          const r2 = s('tspan', { class: 'sm-et-2' });
          et = s('text', { class: 'sm-link-et ' + colore }, r1, r2);
          gEt.append(et);
          const banda = l.zeroCopia ? 'nessuna copia' : (l.stima ? '≈ ' : '') + M.formattaBanda(l.banda);
          et.__righe = [l.sigla, banda];
        }
        mappa[l0.id] = { id: l0.id, sel: selezione, dati: l0, info: l, g: g, paths: [hit, alone, casing, filo, luce], disegnabili: [casing, filo, luce], et: et, largh: largh, muto: muto, gruppo: gruppo, poly: null };
      });
      return mappa;
    }

    // Etichette dei collegamenti: sui tratti orizzontali la sigla sta sopra e la banda sotto,
    // sui tratti verticali stanno di lato; la memoria unificata ha la scritta dentro la barra.
    function posaEtichetta(L, poly, spec, alfa) {
      if (!L.et) return;
      L.spec = spec;
      const stretta = stato.layout === 'stretta';
      const [r1, r2] = L.et.childNodes;
      const [sigla, banda] = L.et.__righe;
      let modo;
      let x;
      let y;
      let y2 = 0;
      let anchor = 'middle';
      if (spec && spec.et) {
        x = spec.et.x; y = spec.et.y; anchor = spec.et.a || 'middle';
        modo = stretta && !spec.et.riga ? 'pila' : 'riga';
      } else {
        const t = G.trattoPiuLungo(poly);
        const off = L.largh / 2 + 6;
        if (L.info.zeroCopia && !t.verticale) {
          modo = 'dentro'; x = t.mx; y = t.my + fsCorr * 0.36;
        } else if (t.verticale) {
          modo = stretta ? 'pila' : 'riga'; x = t.mx + off + 1; y = t.my + (modo === 'pila' ? -3 : 4); anchor = 'start';
        } else {
          modo = 'sopra-sotto'; x = t.mx; y = t.my - off - 1; y2 = t.my + off + fsCorr * 0.8;
        }
      }
      L.et.setAttribute('text-anchor', anchor);
      L.et.classList.toggle('sm-et-dentro', modo === 'dentro');
      r1.setAttribute('x', x.toFixed(1));
      r1.setAttribute('y', y.toFixed(1));
      if (modo === 'dentro') {
        r1.textContent = banda;
        r2.textContent = '';
      } else if (modo === 'riga') {
        r1.textContent = sigla + ' · ';
        r2.textContent = banda;
        r2.removeAttribute('x');
        r2.removeAttribute('y');
        r2.setAttribute('dy', '0');
      } else {
        r1.textContent = sigla;
        r2.textContent = banda;
        r2.setAttribute('x', x.toFixed(1));
        if (modo === 'pila') { r2.removeAttribute('y'); r2.setAttribute('dy', '1.2em'); } else { r2.setAttribute('y', y2.toFixed(1)); r2.setAttribute('dy', '0'); }
      }
      L.et.style.opacity = alfa.toFixed(3);
    }

    function posaLink(L, poly, alfa, disegno, etAlfa, spec) {
      L.poly = poly;
      const d = G.percorsoSvg(poly);
      L.paths.forEach((p) => p.setAttribute('d', d));
      if (!L.muto && disegno != null && disegno < 1) {
        const len = G.lunghezza(poly) + 1;
        L.disegnabili.forEach((p) => { p.setAttribute('stroke-dasharray', len.toFixed(1) + ' ' + len.toFixed(1)); p.setAttribute('stroke-dashoffset', (len * (1 - disegno)).toFixed(1)); });
        L.tratteggio = true;
      } else if (L.tratteggio) {
        L.disegnabili.forEach((p) => { p.removeAttribute('stroke-dasharray'); p.removeAttribute('stroke-dashoffset'); });
        L.tratteggio = false;
      }
      L.g.style.opacity = alfa.toFixed(3);
      L.g.style.pointerEvents = alfa > 0.5 ? '' : 'none';
      posaEtichetta(L, poly, spec, etAlfa == null ? alfa : etAlfa);
    }

    /* ---------- decorazioni: core e slot PCI ---------- */

    function creaDeco(epId) {
      const d = M.disposizione(stato.layout, epId).deco;
      const g = s('g', { class: 'sm-deco' });
      if (d.core) {
        const c = d.core;
        if (c.tipo === '4') {
          const gap = 6;
          const w = (c.w - gap * 3) / 4;
          for (let i = 0; i < 4; i++) {
            g.append(s('rect', { class: 'sm-core', x: c.x + i * (w + gap), y: c.y, width: w, height: c.h, rx: 4 }));
            g.append(s('text', { class: 'sm-core-et', x: c.x + i * (w + gap) + w / 2, y: c.y + c.h / 2 + 4, 'text-anchor': 'middle' }, 'core'));
          }
        } else {
          const gap = 4;
          const lato = (c.h - gap) / 2;
          const piccolo = lato * 0.72;
          for (let i = 0; i < 4; i++) {
            g.append(s('rect', { class: 'sm-core', x: c.x + (i % 2) * (lato + gap), y: c.y + Math.floor(i / 2) * (lato + gap), width: lato, height: lato, rx: 4 }));
          }
          const x0 = c.x + 2 * (lato + gap) + gap * 2;
          for (let i = 0; i < 4; i++) {
            g.append(s('rect', { class: 'sm-core sm-core-e', x: x0 + (i % 2) * (piccolo + gap), y: c.y + (c.h - 2 * piccolo - gap) / 2 + Math.floor(i / 2) * (piccolo + gap), width: piccolo, height: piccolo, rx: 3 }));
          }
        }
      }
      if (d.slot) {
        const sl = d.slot;
        sl.ys.forEach((y) => {
          g.append(s('path', { class: 'sm-slot-filo', d: 'M' + (sl.x - 10) + ' ' + y + 'H' + sl.x }));
          g.append(s('rect', { class: 'sm-slot-pci', x: sl.x - 36, y: y - 4.5, width: 26, height: 9, rx: 2 }));
        });
        g.append(s('text', { class: 'sm-slot-et', x: sl.x - 42, y: sl.ys[1] + 4, 'text-anchor': 'end' }, 'slot PCI'));
      }
      gDeco.append(g);
      return { g: g, cpu: M.disposizione(stato.layout, epId).nodi.cpu };
    }

    function posaDeco(D, alfa, boxCpu) {
      if (!D) return;
      D.g.style.opacity = alfa.toFixed(3);
      if (boxCpu) D.g.setAttribute('transform', 'translate(' + (boxCpu.x - D.cpu.x).toFixed(2) + ' ' + (boxCpu.y - D.cpu.y).toFixed(2) + ')');
      else D.g.removeAttribute('transform');
    }

    /* ---------- scena ferma ---------- */

    function dimensioniSvg() {
      const d = M.DISPOSIZIONI[stato.layout];
      svg.setAttribute('viewBox', '0 0 ' + d.w + ' ' + d.h);
      fondo.setAttribute('width', d.w);
      fondo.setAttribute('height', d.h);
      annoFondo.setAttribute('x', d.w - 14);
      annoFondo.setAttribute('y', stato.layout === 'stretta' ? d.h - 12 : d.h - 14);
      annoFondo.setAttribute('text-anchor', 'end');
      adattaTesto();
    }

    // Il testo dello schema non deve scendere sotto circa 11 pixel effettivi.
    function adattaTesto() {
      const larg = svg.getBoundingClientRect().width || 600;
      const scala = larg / M.DISPOSIZIONI[stato.layout].w;
      const fs = ctx.clamp(11.6 / scala, 11, 14.5);
      fsCorr = fs;
      svg.style.setProperty('--sm-fs', fs.toFixed(2) + 'px');
      svg.style.setProperty('--sm-ft', (fs * 1.16).toFixed(2) + 'px');
      // area sensibile dei collegamenti: almeno 42 px sullo schermo, se c'è spazio
      svg.style.setProperty('--sm-hit', ctx.clamp(42 / scala, 26, 48).toFixed(1) + 'px');
    }

    function aggiornaArie(epId) {
      const e = M.epoca(epId);
      const nomi = Object.keys(e.nodi).filter((k) => k !== 'bus' && k !== 'pkg').map((k) => e.nodi[k].nome);
      const links = M.collegamentiVisibili(epId).map((l) => l.sigla + ' ' + (l.zeroCopia ? 'senza copie' : M.formattaBanda(l.banda)));
      svg.setAttribute('aria-label', 'Schema a blocchi del ' + epId + ' (' + e.esempio + '). Blocchi: ' + nomi.join(', ') + '. Collegamenti: ' + links.join('; ') + '.');
    }

    function impostaScena(epId) {
      if (morph) { morph.cancel(); morph = null; }
      Object.values(linkCorr).forEach((L) => { L.g.remove(); if (L.et) L.et.remove(); });
      if (decoCorr) decoCorr.g.remove();
      dimensioniSvg();
      const disp = M.disposizione(stato.layout, epId);
      mostrati = {};
      M.NODI.forEach((id) => { mostrati[id] = Object.assign({}, disp.nodi[id]); posaNodo(id, mostrati[id], testiNodo(id, epId), 1); });
      linkCorr = creaLinks(epId);
      Object.values(linkCorr).forEach((L) => posaLink(L, geometriaLink(epId, L.dati, mostrati, disp), 1, 1, 1, disp.link[L.id]));
      decoCorr = creaDeco(epId);
      posaDeco(decoCorr, 1, null);
      annoFondo.textContent = epId;
      annoFondo.style.opacity = '1';
      aggiornaArie(epId);
      evidenzia();
      preparaTraffico();
    }

    /* ---------- passaggio animato fra due epoche ---------- */

    function vaiA(epId) {
      if (epId === stato.epoca) return;
      const da = stato.epoca;
      chiudiPasso();
      stato.epoca = epId;
      if (!M.epoca(epId).collegamenti.some((l) => l.id === stato.scelto && !l.gruppo && !(l.interno && !l.banda))) stato.scelto = PRIMA_SCELTA[epId];
      aggiornaControlli();
      aggiornaPannelli();
      nota.innerHTML = M.epoca(epId).racconto;
      if (ctx.ridotto() || !visibile) { impostaScena(epId); return; }
      animaVerso(da, epId);
    }

    function animaVerso(daId, aId) {
      // Se un passaggio è già in corso si riparte da dove sono ora i riquadri.
      if (morph) {
        morph.cancel();
        morph = null;
        Object.values(linkCorr).forEach((L) => { L.g.remove(); if (L.et) L.et.remove(); });
        linkCorr = {};
        if (decoCorr) { decoCorr.g.remove(); decoCorr = null; }
      }
      svuotaTraffico();
      const dispDa = M.disposizione(stato.layout, daId);
      const dispA = M.disposizione(stato.layout, aId);
      const partenza = {};
      M.NODI.forEach((id) => { partenza[id] = Object.assign({}, mostrati[id] || dispDa.nodi[id]); });
      const vecchi = linkCorr;
      const decoV = decoCorr;
      const nuovi = creaLinks(aId);
      const decoN = creaDeco(aId);
      Object.values(nuovi).forEach((L) => { L.g.style.opacity = '0'; if (L.et) L.et.style.opacity = '0'; });
      posaDeco(decoN, 0, null);
      linkCorr = nuovi;
      decoCorr = decoN;
      const tDa = {};
      const tA = {};
      M.NODI.forEach((id) => { tDa[id] = testiNodo(id, daId); tA[id] = testiNodo(id, aId); });
      const vecchioAnno = annoFondo.textContent;
      const sm = ctx.curve.smooth;
      const fra = (k, a, b) => ctx.clamp((k - a) / (b - a), 0, 1);

      morph = ctx.tween({
        from: 0, to: 1, dur: DURATA, ease: 'linear',
        update: (k) => {
          const em = ctx.curve.inOut(fra(k, 0.12, 0.88));
          // nodi: si spostano, crescono, compaiono o si fondono nella CPU
          M.NODI.forEach((id) => {
            const b = G.interpolaBox(partenza[id], dispA.nodi[id], em);
            mostrati[id] = b;
            const prima = tDa[id];
            const dopo = tA[id];
            let testi = k < 0.5 ? (prima || dopo) : (dopo || prima);
            let alfa = 1;
            if (prima && dopo && (prima.tit !== dopo.tit || prima.sot !== dopo.sot || prima.cont !== dopo.cont)) alfa = Math.abs(1 - 2 * fra(k, 0.2, 0.8));
            if (!testi) testi = null;
            posaNodo(id, b, testi, alfa);
          });
          // vecchi collegamenti: si spengono seguendo i riquadri
          const av = 1 - sm(fra(k, 0, 0.3));
          Object.values(vecchi).forEach((L) => posaLink(L, geometriaLink(daId, L.dati, mostrati, dispDa), av, 1, av * (1 - fra(k, 0, 0.15)), dispDa.link[L.id]));
          // nuovi collegamenti: si ridisegnano dalla sorgente alla destinazione
          const dis = sm(fra(k, 0.5, 1));
          Object.values(nuovi).forEach((L) => posaLink(L, geometriaLink(aId, L.dati, mostrati, dispA), L.muto ? dis : (dis > 0 ? 1 : 0), dis, fra(k, 0.82, 1), dispA.link[L.id]));
          posaDeco(decoV, 1 - fra(k, 0, 0.3), mostrati.cpu);
          posaDeco(decoN, fra(k, 0.7, 1), mostrati.cpu);
          if (k >= 0.5 && annoFondo.textContent !== aId) annoFondo.textContent = aId;
          annoFondo.style.opacity = (k < 0.5 ? 1 - fra(k, 0.25, 0.5) : fra(k, 0.5, 0.75)).toFixed(3);
          if (vecchioAnno === aId) annoFondo.style.opacity = '1';
        },
        done: () => {
          Object.values(vecchi).forEach((L) => { L.g.remove(); if (L.et) L.et.remove(); });
          if (decoV) decoV.g.remove();
          posaDeco(decoN, 1, null);
          Object.values(nuovi).forEach((L) => posaLink(L, geometriaLink(aId, L.dati, mostrati, dispA), 1, 1, 1, dispA.link[L.id]));
          morph = null;
          aggiornaArie(aId);
          evidenzia();
          preparaTraffico();
          if (passoDopo) avviaPasso();
        },
      });
    }

    /* ---------- selezione del collegamento e del flusso ---------- */

    function evidenzia() {
      const ids = new Set(M.epoca(stato.epoca).percorsi[stato.flusso] || []);
      const busNelPercorso = [...ids].some((id) => linkCorr[id] && linkCorr[id].gruppo);
      Object.values(linkCorr).forEach((L) => {
        L.g.classList.toggle('scelto', L.sel === stato.scelto);
        const inRotta = ids.has(L.id) || (L.id === 'bus' && busNelPercorso);
        L.g.classList.toggle('sm-rotta', inRotta);
        L.g.classList.toggle('sm-fuori', !inRotta && !L.muto);
        if (L.et) L.et.classList.toggle('sm-fuori', !inRotta);
      });
    }

    function scegliLink(id, daUtente) {
      if (stato.scelto === id && !daUtente) return;
      stato.scelto = id;
      evidenzia();
      aggiornaCard();
      if (daUtente) {
        const l = M.collegamento(stato.epoca, id);
        const d = dimensione();
        nota.innerHTML = '<strong>' + l.nome + '</strong>: ' + (l.zeroCopia
          ? 'qui non si copia niente, la GPU legge la stessa memoria della CPU.'
          : (l.stima ? 'circa ' : '') + M.formattaBanda(l.banda) + '; per ' + d.testo + ' servirebbero ' + M.formattaTempo(M.tempo(d.byte, l.banda)) + '.');
      }
    }

    function scorriLink(verso) {
      const lista = M.collegamentiVisibili(stato.epoca).map((l) => l.id);
      const i = lista.indexOf(stato.scelto);
      scegliLink(lista[(i + verso + lista.length) % lista.length], true);
    }

    function sceltaFlusso(id) {
      stato.flusso = id;
      chiudiPasso();
      aggiornaControlli();
      aggiornaPannelli();
      evidenzia();
      dimensionaPacchetti();
      if (visibile && !stato.pausa && !ctx.ridotto() && !morph) ciclo.start();
      notaViaggio();
    }

    function sceltaDim(id) {
      stato.dim = id;
      aggiornaControlli();
      aggiornaPannelli();
      notaViaggio();
    }

    // Riassunto del viaggio scelto (flusso + dimensione), sempre coerente con il pannello.
    function notaViaggio() {
      const d = dimensione();
      const t = M.tempoPercorso(stato.epoca, stato.flusso, d.byte);
      const f = flussoDi(stato.flusso);
      nota.innerHTML = 'Verso ' + f.verso + ' nel ' + stato.epoca + ', con ' + d.testo + ': ' + (t.zeroCopia
        ? 'nessuna copia, CPU e GPU usano la stessa memoria.'
        : 'il tratto più lento è <strong>' + t.collo.sigla + '</strong> (' + (t.collo.stima ? 'circa ' : '') + M.formattaBanda(t.collo.banda) + '), e decide il tempo: ' + M.formattaTempo(t.secondi) + '.');
    }

    /* ---------- pannelli ---------- */

    function aggiornaControlli() {
      EP.forEach((id) => btnEpoca[id].setAttribute('aria-pressed', String(id === stato.epoca)));
      M.FLUSSI.forEach((f) => btnFlusso[f.id].setAttribute('aria-pressed', String(f.id === stato.flusso)));
      M.DIMENSIONI.forEach((d) => btnDim[d.id].setAttribute('aria-pressed', String(d.id === stato.dim)));
      btnAvanti.textContent = stato.epoca === EP[EP.length - 1] ? 'Torna al ' + EP[0] : 'Avanti nel tempo ›';
      const ridotto = ctx.ridotto();
      btnPausa.hidden = ridotto;
      btnPausa.setAttribute('aria-pressed', String(stato.pausa));
      btnPausa.textContent = stato.pausa ? 'Riprendi il traffico' : 'Ferma il traffico';
      const inPasso = !!stato.passo;
      btnPasso.hidden = inPasso;
      btnIndietro.hidden = !inPasso;
      btnSucc.hidden = !inPasso;
      btnEsci.hidden = !inPasso;
      if (inPasso) {
        btnIndietro.disabled = stato.passo.i <= 0;
        btnSucc.disabled = stato.passo.i >= stato.passo.n;
      }
    }

    function aggiornaCard() {
      const l = M.collegamento(stato.epoca, stato.scelto);
      if (!l) return;
      const d = dimensione();
      cTit.textContent = l.nome;
      const tag = ['dal ' + l.anno];
      if (l.condiviso) tag.push('strada condivisa');
      if (l.stima) tag.push('valore stimato');
      if (l.interno) tag.push('dentro il chip');
      cTag.textContent = tag.join(' · ');
      cBanda.textContent = l.zeroCopia ? 'stessa memoria: ' + M.formattaBanda(l.banda) : (l.stima ? 'circa ' : '') + M.formattaBanda(l.banda) + (l.massimo ? ' (al massimo ' + M.formattaBanda(l.massimo) + ')' : '') + (/PCI Express|DMI/.test(l.nome) ? ' per direzione' : '');
      cFormula.textContent = l.formula;
      cTesto.textContent = l.testo;
      cTempo.innerHTML = l.zeroCopia
        ? 'Copiare ' + d.testo + ' fra CPU e GPU: <strong>nessuna copia</strong>, i dati sono già lì.'
        : 'Copiare ' + d.testo + ' su questo collegamento: <strong>' + M.formattaTempo(M.tempo(d.byte, l.banda)) + '</strong>' + (l.condiviso ? ', se nessun altro lo usa' : '') + '.';
      if (l.buslab && NOMI_BUSLAB[l.buslab]) {
        cBuslab.hidden = false;
        cBuslab.href = '../../index.html#/bus/' + l.buslab;
        cBuslab.textContent = 'Lezione su BusLab: ' + NOMI_BUSLAB[l.buslab] + ' ›';
      } else {
        cBuslab.hidden = true;
        cBuslab.removeAttribute('href');
      }
    }

    function aggiornaPannelli() {
      aggiornaCard();
      const d = dimensione();
      const t = M.tempoPercorso(stato.epoca, stato.flusso, d.byte);
      const passi = M.percorso(stato.epoca, stato.flusso);
      vPercorso.textContent = [nomeNodo(stato.epoca, 'cpu')].concat(passi.map((p) => nomeNodo(stato.epoca, p.aNodo))).join(' → ');
      vCollo.textContent = t.zeroCopia ? 'nessuno: memoria unificata' : t.collo.sigla + ' · ' + (t.collo.stima ? '≈ ' : '') + M.formattaBanda(t.collo.banda);
      vTempo.textContent = t.zeroCopia ? 'nessuna copia' : M.formattaTempo(t.secondi);
      const lg = Math.log10;
      listaConf.setAttribute('class', 'sm-conf sm-c-' + stato.flusso);
      M.confronto(stato.flusso, d.byte).forEach((r) => {
        const riga = righeConf[r.epoca.id];
        const fr = r.zeroCopia ? 0 : ctx.clamp((lg(Math.max(r.secondi, T_MIN)) - lg(T_MIN)) / (lg(T_MAX) - lg(T_MIN)), 0.015, 1);
        riga.i.style.transform = 'scaleX(' + fr.toFixed(4) + ')';
        riga.tempo.textContent = r.zeroCopia ? 'nessuna copia' : M.formattaTempo(r.secondi);
        riga.b.setAttribute('aria-pressed', String(r.epoca.id === stato.epoca));
        riga.b.setAttribute('aria-label', r.epoca.id + ': ' + riga.tempo.textContent + '. Vai a quest\'epoca');
      });
    }

    /* ---------- traffico di pacchetti ---------- */

    // Percorso di un flusso: tratti con la loro velocità; fra un collegamento e l'altro il pacchetto
    // attraversa il nodo (nascosto sotto il riquadro) o corre lungo il bus.
    function costruisciRotta(flussoId) {
      const disp = M.disposizione(stato.layout, stato.epoca);
      const tratti = [];
      let ultimo = null;
      M.percorso(stato.epoca, flussoId).forEach((p, indice) => {
        const L = linkCorr[p.link.id];
        if (!L || !L.poly) return;
        const poly = L.poly.slice();
        if (p.verso === -1) poly.reverse();
        const vel = M.velocita(p.link.banda || 1e11);
        if (ultimo && Math.hypot(ultimo.x - poly[0].x, ultimo.y - poly[0].y) > 0.5) {
          let ponte;
          let chiave = null;
          let velPonte = M.SCALA.velMax * 1.2;
          if (p.daNodo === 'bus') {
            // da una presa all'altra lungo il bus condiviso del 1981
            const bus = M.collegamento(stato.epoca, 'bus');
            ponte = [ultimo, poly[0]];
            chiave = bus.condiviso || null;
            velPonte = M.velocita(bus.banda);
          } else {
            const b = disp.nodi[p.daNodo];
            ponte = [ultimo, { x: b.x + b.w / 2, y: b.y + b.h / 2 }, poly[0]];
          }
          tratti.push({ poly: ponte, len: G.lunghezza(ponte), vel: velPonte, chiave: chiave, passo: indice });
        }
        tratti.push({ poly: poly, len: G.lunghezza(poly), vel: vel, chiave: p.link.condiviso || null, passo: indice, link: p.link });
        ultimo = poly[poly.length - 1];
      });
      return tratti;
    }

    function intervallo(flussoId) {
      const t = M.tempoPercorso(stato.epoca, flussoId, 1e9);
      const b = t.zeroCopia ? 68e9 : t.collo.banda;
      return ctx.lerp(2.5, 0.34, M.frazioneLog(b));
    }

    function svuotaTraffico() {
      pacchetti.forEach((p) => p.el.remove());
      pacchetti = [];
      gettoni = {};
      gPac.replaceChildren();
    }

    function preparaTraffico() {
      svuotaTraffico();
      rotte = {};
      M.FLUSSI.forEach((f, i) => { rotte[f.id] = costruisciRotta(f.id); prossimo[f.id] = orologio + 0.15 + i * 0.35; });
      if (ctx.ridotto()) pacchettiFermi();
      else if (visibile && !stato.pausa && !stato.passo) ciclo.start();
    }

    function creaPacchetto(flussoId) {
      const coda = s('line', { class: 'sm-pac-coda' });
      const testa = s('circle', { class: 'sm-pac-testa' });
      const el = s('g', { class: 'sm-pac sm-c-' + flussoId }, coda, testa);
      gPac.append(el);
      const p = { f: flussoId, rotta: rotte[flussoId], i: 0, d: 0, el: el, coda: coda, testa: testa, tiene: null, attesa: false };
      raggio(p);
      return p;
    }

    function raggio(p) {
      const scelto = p.f === stato.flusso;
      p.testa.setAttribute('r', scelto ? 5.2 : 3.8);
      p.el.classList.toggle('scelto', scelto);
    }

    function dimensionaPacchetti() { pacchetti.forEach(raggio); }

    // Con il movimento ridotto: tre pacchetti fermi lungo ogni percorso, solo per indicare i flussi.
    function pacchettiFermi() {
      M.FLUSSI.forEach((f) => {
        const rotta = rotte[f.id].filter((t) => t.link);
        const tot = rotta.reduce((a, t) => a + t.len, 0);
        [0.3, 0.55, 0.8].forEach((fr) => {
          let d = tot * fr;
          let k = 0;
          while (k < rotta.length - 1 && d > rotta[k].len) { d -= rotta[k].len; k++; }
          const p = creaPacchetto(f.id);
          const pt = G.puntoSu(rotta[k].poly, d);
          p.testa.setAttribute('cx', pt.x.toFixed(1));
          p.testa.setAttribute('cy', pt.y.toFixed(1));
          p.coda.style.display = 'none';
          pacchetti.push(p);
        });
      });
    }

    function emetti() {
      M.FLUSSI.forEach((f) => {
        if (orologio < prossimo[f.id]) return;
        const miei = pacchetti.filter((p) => p.f === f.id);
        if (miei.length < 9 && !miei.some((p) => p.attesa && p.i === 0)) {
          if (rotte[f.id] && rotte[f.id].length) pacchetti.push(creaPacchetto(f.id));
        }
        prossimo[f.id] = orologio + intervallo(f.id) * (0.8 + 0.4 * caso());
      });
    }

    function libera(p) {
      if (p.tiene && gettoni[p.tiene] === p) delete gettoni[p.tiene];
      p.tiene = null;
    }

    function avanza(dt) {
      const arrivati = [];
      pacchetti.forEach((p) => {
        let t = p.rotta[p.i];
        if (!t) { arrivati.push(p); return; }
        if (p.d === 0 && t.chiave && p.tiene !== t.chiave) {
          if (gettoni[t.chiave] && gettoni[t.chiave] !== p) { p.attesa = true; return; }
          gettoni[t.chiave] = p;
          p.tiene = t.chiave;
        }
        p.attesa = false;
        p.d += t.vel * dt;
        while (p.d >= t.len) {
          p.d -= t.len;
          p.i += 1;
          const nt = p.rotta[p.i];
          if (!nt) { arrivati.push(p); break; }
          if (p.tiene && nt.chiave !== p.tiene) libera(p);
          if (nt.chiave && p.tiene !== nt.chiave) {
            if (gettoni[nt.chiave]) { p.d = 0; p.attesa = true; break; }
            gettoni[nt.chiave] = p;
            p.tiene = nt.chiave;
          }
          p.d = p.d * nt.vel / Math.max(1, t.vel);
          t = nt;
        }
      });
      arrivati.forEach((p) => { libera(p); p.el.remove(); });
      if (arrivati.length) pacchetti = pacchetti.filter((p) => arrivati.indexOf(p) < 0);
    }

    function disegnaPacchetti() {
      const code = {};
      pacchetti.forEach((p) => {
        const t = p.rotta[p.i];
        if (!t) return;
        let pt;
        let pc;
        if (p.attesa) {
          // in coda all'ingresso della strada condivisa, di lato, come auto a un incrocio
          const k = t.chiave || 'x';
          code[k] = (code[k] || 0) + 1;
          const a = t.poly[0];
          const b = t.poly[1] || a;
          const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          const nx = -(b.y - a.y) / l;
          const ny = (b.x - a.x) / l;
          const off = 9 + code[k] * 10;
          pt = { x: a.x + nx * off, y: a.y + ny * off };
          pc = pt;
        } else {
          pt = G.puntoSu(t.poly, p.d);
          pc = G.puntoSu(t.poly, Math.max(p.d - 9, -2));
        }
        p.testa.setAttribute('cx', pt.x.toFixed(1));
        p.testa.setAttribute('cy', pt.y.toFixed(1));
        p.coda.setAttribute('x1', pc.x.toFixed(1));
        p.coda.setAttribute('y1', pc.y.toFixed(1));
        p.coda.setAttribute('x2', pt.x.toFixed(1));
        p.coda.setAttribute('y2', pt.y.toFixed(1));
        p.el.classList.toggle('sm-attesa', p.attesa);
      });
    }

    const ciclo = ctx.loop((dt) => {
      if (morph || stato.passo || stato.pausa) return;
      orologio += dt;
      emetti();
      avanza(dt);
      disegnaPacchetti();
    });

    function impostaPausa(v) {
      stato.pausa = v;
      aggiornaControlli();
      if (v) ciclo.stop();
      else if (visibile && !ctx.ridotto() && !stato.passo) ciclo.start();
      nota.textContent = v ? 'Traffico fermo: puoi guardare i pacchetti dove sono. Le strade condivise hanno i pacchetti in coda di lato.' : 'Il traffico riparte.';
    }

    /* ---------- modalità passo passo: segui un dato ---------- */

    const pallaAlone = s('circle', { class: 'sm-palla-alone', r: 13 });
    const palla = s('circle', { class: 'sm-palla', r: 7.5 });
    gPasso.append(pallaAlone, palla);
    gPasso.style.display = 'none';

    function tappePasso() {
      // una tappa per collegamento del percorso: insieme dei tratti che lo compongono
      const rotta = costruisciRotta(stato.flusso);
      const tappe = [];
      rotta.forEach((t) => {
        if (!tappe[t.passo]) tappe[t.passo] = { tratti: [], link: null };
        tappe[t.passo].tratti.push(t);
        if (t.link) tappe[t.passo].link = t.link;
      });
      return tappe.filter(Boolean);
    }

    function polyTappa(tappa) {
      const pts = [];
      tappa.tratti.forEach((t) => t.poly.forEach((q) => pts.push(q)));
      return pts;
    }

    function posaPalla(pt) {
      [palla, pallaAlone].forEach((c) => { c.setAttribute('cx', pt.x.toFixed(1)); c.setAttribute('cy', pt.y.toFixed(1)); });
    }

    function avviaPasso() {
      if (morph) {
        passoDopo = true;
        nota.textContent = 'Un attimo: lo schema sta cambiando epoca, poi il dato parte.';
        return;
      }
      passoDopo = false;
      ciclo.stop();
      const tappe = tappePasso();
      stato.passo = { i: 0, n: tappe.length, tappe: tappe };
      gPac.classList.add('sm-spento');
      gPasso.style.display = '';
      gPasso.setAttribute('class', 'sm-passo-g sm-c-' + stato.flusso);
      posaPalla(polyTappa(tappe[0])[0]);
      aggiornaControlli();
      const f = flussoDi(stato.flusso);
      nota.innerHTML = '<strong>Pronti.</strong> Un dato parte dalla CPU verso ' + f.verso + ': premi <strong>Avanti</strong> per farlo passare su ogni collegamento, uno alla volta (' + tappe.length + (tappe.length === 1 ? ' tappa' : ' tappe') + ').';
      btnSucc.focus();
    }

    function passo(verso) {
      const P0 = stato.passo;
      if (!P0) return;
      const j = P0.i + verso;
      if (j < 0 || j > P0.n) return;
      if (passoTween) { passoTween.cancel(); passoTween = null; }
      const tappa = P0.tappe[verso > 0 ? P0.i : j];
      const poly = polyTappa(tappa);
      const lung = G.lunghezza(poly);
      P0.i = j;
      aggiornaControlli();
      Object.values(linkCorr).forEach((L) => L.g.classList.toggle('sm-attivo', !!tappa.link && L.id === tappa.link.id));
      const da = verso > 0 ? 0 : lung;
      const a = verso > 0 ? lung : 0;
      passoTween = ctx.tween({
        from: da, to: a, dur: ctx.clamp(380 + lung * 2.2, 500, 1200), ease: 'smooth',
        update: (v) => posaPalla(G.puntoSu(poly, v)),
        done: () => { passoTween = null; },
      });
      raccontaTappa(tappa, j, verso);
    }

    function raccontaTappa(tappa, j, verso) {
      const P0 = stato.passo;
      const l = tappa.link;
      const d = dimensione();
      const t = M.tempoPercorso(stato.epoca, stato.flusso, d.byte);
      if (verso < 0) {
        nota.innerHTML = j === 0 ? 'Di nuovo alla partenza, nella CPU.' : 'Indietro di una tappa: ora sei alla tappa ' + j + ' di ' + P0.n + '.';
        return;
      }
      const passi = M.percorso(stato.epoca, stato.flusso);
      const pz = passi[j - 1];
      const daN = nomeNodo(stato.epoca, pz.daNodo);
      const aN = pz.aNodo === 'bus' ? 'il bus' : nomeNodo(stato.epoca, pz.aNodo);
      let frase = 'Tappa ' + j + ' di ' + P0.n + ' · <strong>' + l.nome + '</strong>: da ' + daN + ' a ' + aN + '. ';
      if (l.interno && !l.banda) frase += l.testo;
      else if (l.zeroCopia) frase += 'La GPU legge direttamente la memoria unificata: nessuna copia.';
      else {
        frase += (l.stima ? 'Circa ' : '') + M.formattaBanda(l.banda) + '.';
        if (l.condiviso) frase += ' La strada è condivisa: se è occupata, il dato aspetta il suo turno.';
        if (!t.zeroCopia && t.collo && t.collo.sigla === l.sigla && t.collo.banda === l.banda) frase += ' È il tratto più lento: decide il tempo di tutto il viaggio.';
      }
      if (j === P0.n) {
        frase += t.zeroCopia
          ? ' <strong>Arrivato.</strong> Nessuna copia: i dati erano già nella memoria comune.'
          : ' <strong>Arrivato.</strong> Per ' + d.testo + ' servono ' + M.formattaTempo(t.secondi) + '.';
      }
      nota.innerHTML = frase;
    }

    function chiudiPasso() {
      passoDopo = false;
      if (!stato.passo) return;
      if (passoTween) { passoTween.cancel(); passoTween = null; }
      stato.passo = null;
      gPasso.style.display = 'none';
      gPac.classList.remove('sm-spento');
      Object.values(linkCorr).forEach((L) => L.g.classList.remove('sm-attivo'));
      aggiornaControlli();
    }

    function esciPasso() {
      chiudiPasso();
      btnPasso.focus();
      nota.innerHTML = M.epoca(stato.epoca).racconto;
      if (visibile && !stato.pausa && !ctx.ridotto() && !morph) ciclo.start();
    }

    /* ---------- disposizione larga o stretta ---------- */

    function scegliDisposizione() {
      const larg = scena.getBoundingClientRect().width;
      const voluta = larg && larg < 600 ? 'stretta' : 'larga';
      if (voluta !== stato.layout) {
        stato.layout = voluta;
        chiudiPasso();
        impostaScena(stato.epoca);
      } else {
        const prima = fsCorr;
        adattaTesto();
        if (Math.abs(prima - fsCorr) > 0.05 && !morph) {
          Object.values(linkCorr).forEach((L) => { if (L.et && L.poly) posaEtichetta(L, L.poly, L.spec, Number(L.et.style.opacity || 1)); });
        }
      }
    }
    const osservatore = 'ResizeObserver' in window ? new ResizeObserver(() => scegliDisposizione()) : null;
    if (osservatore) osservatore.observe(scena);

    /* ---------- avvio ---------- */

    stato.layout = (scena.getBoundingClientRect().width || 700) < 600 ? 'stretta' : 'larga';
    aggiornaControlli();
    aggiornaPannelli();
    impostaScena(stato.epoca);
    nota.innerHTML = M.epoca(stato.epoca).racconto;

    return {
      attiva() {
        visibile = true;
        if (!ctx.ridotto() && !stato.pausa && !stato.passo && !morph) ciclo.start();
      },
      sospendi() {
        visibile = false;
        ciclo.stop();
      },
      distruggi() {
        ciclo.stop();
        if (morph) morph.cancel();
        if (passoTween) passoTween.cancel();
        if (osservatore) osservatore.disconnect();
        svuotaTraffico();
      },
    };
  }

  /* ======================================================================
   * Capitolo
   * ====================================================================== */

  const LEGENDA_ATX = [
    'Zoccolo del processore (LGA)',
    'VRM: regolatori di tensione sotto i dissipatori',
    'Slot DIMM per la memoria (due canali)',
    'Connettore di alimentazione ATX a 24 poli',
    'Slot PCI Express x16 per la scheda video',
    'Slot M.2 per gli SSD NVMe',
    'PCH, il chipset, sotto il dissipatore',
    'Porte SATA',
    'Chip del firmware (memoria flash SPI)',
    'Batteria a bottone CR2032',
    'Connettori del pannello frontale e delle ventole',
    'Pannello I/O posteriore',
  ];

  const LEGENDA_BABYAT = [
    'Slot ISA a 16 bit',
    'Slot PCI',
    'Zoccolo ZIF del Pentium (Socket 7)',
    'Cache di secondo livello (SRAM)',
    'Slot SIMM per la memoria (<em>single in-line memory module</em>)',
    'Northbridge',
    'Southbridge',
    'Chip del BIOS, con l\'etichetta',
    'Batteria dell\'orologio',
    'Connettore della tastiera (DIN)',
    'Alimentazione AT (connettori P8 e P9)',
    'Connettori dei dischi IDE e del dischetto',
  ];

  P.registra({
    numero: 5,
    id: 'scheda-madre',
    titolo: 'Com\'è fatto un PC: scheda madre, chipset e bus',
    breve: 'Scheda madre',
    periodo: '1981–oggi',
    colore: 'var(--era-5)',
    sommario: 'La scheda madre e i suoi bus: dal bus unico dell\'IBM PC al northbridge, al PCH, fino al chip unico.',
    intro: 'Togli il pannello laterale di un PC e la vedi subito: una grande lastra piena di zoccoli, slot e connettori. È la <strong>scheda madre</strong> (in inglese <em>motherboard</em>), la città in cui abitano il processore e la memoria; le sue strade sono i <strong>bus</strong>, i fasci di collegamenti su cui viaggiano i dati. In quarant\'anni la città è stata ridisegnata più volte: un\'unica strada condivisa nel 1981, due grandi incroci negli anni \'90, poi gli incroci sono entrati nel processore, e oggi quasi tutto sta in un solo chip.',
    blocchi: [
      {
        tipo: 'testo',
        titolo: 'Una città su un circuito stampato',
        paragrafi: [
          'Una scheda madre è un <strong>circuito stampato</strong> (PCB, <em>printed circuit board</em>): una lastra di vetronite, cioè fibra di vetro e resina, con più strati di piste di rame sovrapposti, di solito da sei a otto nelle schede di oggi. Le piste sono le strade, i componenti saldati o infilati negli zoccoli sono gli edifici. Dal 1981 a oggi i quartieri sono sempre gli stessi; cambiano posizione e grandezza.',
          'Il <strong>processore</strong> (CPU, <em>central processing unit</em>) è il municipio, dove si decide e si calcola. La <strong>memoria</strong> di lavoro (RAM, <em>random access memory</em>) è il magazzino accanto, da cui il processore prende istruzioni e dati. Il <strong>chipset</strong> è il centro di smistamento: uno o più chip che collegano processore, memoria e periferiche e fanno da vigili agli incroci. I <strong>bus</strong> sono le strade, ognuna con la sua larghezza (quanti bit passano insieme) e la sua velocità.',
          'Poi ci sono i servizi. Il <strong>VRM</strong> (<em>voltage regulator module</em>, modulo regolatore di tensione) è la centrale elettrica: trasforma i 12 volt dell\'alimentatore nella tensione di circa un volt che chiede il processore. Il <strong>firmware</strong> è il regolamento comunale: un programma conservato in una memoria che non si cancella (il BIOS, <em>basic input/output system</em>, oggi UEFI, <em>unified extensible firmware interface</em>) che all\'accensione sveglia i componenti e poi passa la mano al sistema operativo.',
          'Anche la pianta della città è standard. Il <strong>fattore di forma</strong> fissa le misure, la posizione dei fori di fissaggio e del pannello posteriore, così che una scheda entri in qualunque <em>case</em> (il contenitore) dello stesso tipo. La scheda <strong>AT</strong> dell\'IBM PC AT (1984) misurava circa 30 × 35 cm; la <strong>Baby AT</strong>, più piccola (circa 22 × 33 cm), dominò fino a metà degli anni \'90. Nel luglio 1995 Intel pubblicò l\'<strong>ATX</strong> (30,5 × 24,4 cm), che mise i connettori esterni direttamente sulla scheda, raccolti in un pannello posteriore. Poi vennero il <strong>microATX</strong> (24,4 × 24,4 cm, intorno al 1997) e il <strong>Mini-ITX</strong> di VIA (17 × 17 cm, 2001).',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraATX,
        larga: true,
        alt: 'Disegno di una scheda madre ATX di oggi vista dall\'alto, con dodici numeri: zoccolo del processore, VRM con i dissipatori, quattro slot per la memoria, connettore di alimentazione a 24 poli, slot PCI Express x16, slot M.2, chipset con dissipatore, porte SATA, chip del firmware, batteria a bottone, connettori del pannello frontale e pannello posteriore con le porte.',
        didascalia: '<strong>Una scheda madre ATX di oggi</strong> vista dall\'alto (30,5 × 24,4 cm; disegno, non un modello preciso). Il pannello delle porte è in alto a sinistra, verso il retro del PC.<ol class="sm-legenda">' + LEGENDA_ATX.map((t) => '<li><span>' + t + '</span></li>').join('') + '</ol>',
      },
      {
        tipo: 'testo',
        titolo: 'Giro guidato di una scheda madre di oggi',
        paragrafi: [
          'Seguiamo i numeri del disegno. Al centro c\'è lo <strong>zoccolo</strong> del processore (1), il <em>socket</em>. Negli zoccoli LGA (<em>land grid array</em>) i contatti a molla sono sulla scheda e il processore ha solo piazzole piatte: quelli Intel del 2021 ne hanno 1.700. Nei PGA (<em>pin grid array</em>) è il contrario, i piedini sono sul processore. Intorno, sotto i dissipatori, c\'è il <strong>VRM</strong> (2): induttori, condensatori e transistor MOSFET divisi in più fasi, che lavorano a turno per dare al processore una corrente grande e pulita.',
          'Accanto allo zoccolo ci sono gli <strong>slot DIMM</strong> (3, <em>dual in-line memory module</em>) per i moduli di memoria: quattro slot per due canali, ed è per questo che i moduli si montano a coppie. Su ogni modulo un piccolo chip, lo SPD (<em>serial presence detect</em>), comunica al firmware velocità e tempi attraverso il bus SMBus. Sul bordo destro, il <strong>connettore ATX a 24 poli</strong> (4) porta l\'alimentazione principale; un connettore a 8 poli vicino al VRM porta i 12 volt riservati al processore.',
          'Più in basso c\'è lo slot <strong>PCI Express x16</strong> (5) per la scheda video, con 16 corsie che arrivano direttamente dal processore, e accanto uno o più slot <strong>M.2</strong> (6) per gli SSD, con quattro corsie ciascuno. Il <strong>PCH</strong> (7), cioè il chipset, sta sotto un dissipatore piatto: da lui partono le porte <strong>SATA</strong> (8) per dischi e lettori, le USB, la rete e l\'audio.',
          'Più piccoli, ma indispensabili: il <strong>chip del firmware</strong> (9), una memoria flash con 8 piedini collegata con il bus SPI (<em>serial peripheral interface</em>); la <strong>batteria</strong> a bottone CR2032 da 3 volt (10), che tiene in funzione l\'orologio quando il PC è staccato dalla corrente; i <strong>connettori</strong> per il pannello frontale, le porte USB interne e le ventole (11). Sul retro, infine, il <strong>pannello I/O</strong> (12): USB, rete, audio e uscite video, tutti saldati sulla scheda come prevede l\'ATX.',
        ],
      },
      {
        tipo: 'testo',
        titolo: '1981: una sola strada per tutti',
        paragrafi: [
          'L\'IBM PC 5150, presentato nell\'agosto 1981, aveva una scheda madre facile da descrivere: un processore Intel 8088 a 4,77 MHz (il chip è raccontato nella sezione 5), da 16 a 64 KB di memoria, la ROM con il BIOS e il BASIC, cinque slot di espansione. Tutto era collegato a un unico bus, che IBM chiamava <em>I/O channel</em>: un connettore a 62 contatti, con 8 linee di dati e 20 di indirizzo, ripetuto in ogni slot.',
          'Sullo stesso bus stavano le schede di memoria aggiuntiva, la scheda video, il controller dei dischetti, le porte seriale e parallela. Era una strada unica e condivisa: in ogni istante poteva parlare un solo dispositivo, e gli altri aspettavano. Intorno al processore c\'erano decine di chip di supporto: il generatore di clock, il controllore del bus, quello delle interruzioni, il timer, il DMA (<em>direct memory access</em>) per spostare dati senza impegnare il processore, più tanti piccoli chip di logica TTL (<em>transistor-transistor logic</em>).',
          'Quanto correva quella strada? L\'8088 impiega almeno 4 cicli di clock per ogni accesso al bus, quindi il massimo teorico è 4,77 MHz ÷ 4, circa 1,19 milioni di byte al secondo. In pratica era meno: le schede lente aggiungevano cicli di attesa e il DMA occupava il bus a intervalli regolari per rinfrescare la memoria dinamica. Una stima prudente è <strong>circa 1 MB/s</strong>, da dividere fra tutti.',
          'Nel 1984 il PC AT, con l\'80286, allargò il bus a 16 bit con un secondo connettore in fila al primo: le vecchie schede a 8 bit entravano ancora. Quando nel 1987 IBM lanciò con i PS/2 un bus nuovo e incompatibile, il Micro Channel, i costruttori di compatibili diedero al vecchio bus un nome: <strong>ISA</strong> (<em>Industry Standard Architecture</em>). Resterà sulle schede madri fino ai primi anni 2000.',
          'Intanto era arrivata una svolta economica. Nel 1985 una giovane azienda californiana, <strong>Chips and Technologies</strong>, mise in vendita il CS8220: cinque chip che riassumevano 63 dei 94 circuiti logici della scheda madre del PC AT. Con un <strong>chipset</strong> così chiunque poteva costruire schede compatibili più piccole, economiche e veloci; nel 2009 la rivista IEEE Spectrum lo ha messo fra i «25 microchip che hanno scosso il mondo». Da allora ogni scheda madre ha il suo chipset.',
        ],
      },
      {
        tipo: 'italia',
        titolo: 'L\'M24 di Ivrea, più veloce dell\'originale',
        paragrafi: [
          'Nel 1983 l\'Olivetti di Ivrea presentò l\'<strong>M24</strong>, un compatibile IBM costruito attorno a una scelta di scheda madre: invece dell\'8088 a 4,77 MHz montava l\'<strong>8086 a 8 MHz</strong>, un processore gemello ma con il bus dati a 16 bit, che a ogni accesso porta dalla memoria il doppio dei bit. Più clock e bus più largo: a parità di programma, l\'M24 era sensibilmente più veloce del PC IBM.',
          'I sette slot di espansione accettavano le schede dei compatibili, e la scheda madre faceva da traduttrice fra i 16 bit del processore e gli 8 delle schede: in piccolo, il lavoro che anni dopo avrebbero fatto i ponti dei chipset. Negli Stati Uniti l\'M24 fu venduto anche da AT&amp;T, dal 1984, come PC 6300. La sua storia di compatibile è nel <a href="#ibm-pc">capitolo 4</a>.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Anni \'90: due ponti, nord e sud',
        paragrafi: [
          'Nei primi anni \'90 un PC con il 486 e Windows doveva spostare immagini intere verso la scheda video, e l\'ISA, a 16 bit e 8 MHz, non ce la faceva più. La prima risposta fu il <strong>VESA Local Bus</strong> (VLB, 1992, dal consorzio VESA, <em>Video Electronics Standards Association</em>): slot collegati direttamente ai fili del 486, a 32 bit e 33 MHz. Era veloce ma legato a quel processore, e tramontò con lui.',
          'La soluzione duratura venne da Intel: il <strong>PCI</strong> (<em>Peripheral Component Interconnect</em>), con la specifica 1.0 del giugno 1992 e gli slot dalla versione 2.0 del 1993. Anche il PCI viaggia a 32 bit e 33 MHz (133 MB/s), ma non è attaccato al processore: in mezzo c\'è un <strong>ponte</strong> (<em>bridge</em>), un chip che traduce fra il bus della CPU e quello delle periferiche. Per questo è sopravvissuto a molte generazioni di processori. Nel 1997 la grafica ebbe una strada riservata, l\'<strong>AGP</strong> (<em>Accelerated Graphics Port</em>): un PCI dedicato a 66 MHz, da 266 MB/s fino a oltre 2 GB/s nelle versioni 2x, 4x e 8x.',
          'Nacque così l\'architettura a due ponti. Nei disegni il processore stava in alto, e i due chip del chipset presero il nome dai punti cardinali. Il <strong>northbridge</strong> (ponte nord) serviva le strade veloci: il <strong>front side bus</strong> (FSB) verso il processore, il controller della memoria e la porta della grafica. Il <strong>southbridge</strong> (ponte sud) raccoglieva quelle lente: i dischi IDE (<em>integrated drive electronics</em>, poi chiamato ATA), l\'USB (<em>Universal Serial Bus</em>, nato nel 1996) e il vecchio ISA, su cui stavano il chip del BIOS e il <strong>Super I/O</strong>, il chip delle porte per dischetti, seriali, parallela, tastiera e mouse.',
          'Due chipset Intel fanno da esempio. Il <strong>430FX «Triton»</strong> (gennaio 1995), per il Pentium, aveva tre chip a nord e uno a sud, il PIIX (<em>PCI-ISA-IDE Xcelerator</em>), con i dischi IDE e il ponte verso l\'ISA. Il <strong>440BX</strong> (aprile 1998), per il Pentium II, metteva nel northbridge FSB a 100 MHz e 64 bit (800 MB/s), memoria SDRAM (RAM dinamica sincrona) PC100 a 800 MB/s e AGP 2x a 533 MB/s; nel southbridge PIIX4 dischi Ultra DMA/33, due porte USB e ISA. Fra i due ponti, però, c\'era ancora il bus PCI, condiviso con le schede negli slot.',
          'Nel 1999, con il chipset 810, Intel tolse anche quel collo di bottiglia: nella <strong>Intel Hub Architecture</strong> il northbridge diventò MCH (<em>memory controller hub</em>) e il southbridge ICH (<em>I/O controller hub</em>), uniti da un collegamento riservato da 266 MB/s, il doppio del PCI. Il chip del BIOS e il Super I/O passarono a un bus a pochi fili, l\'LPC (<em>low pin count</em>), e l\'ISA uscì di scena.',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraBabyAT,
        larga: true,
        alt: 'Disegno di una scheda madre Baby AT di metà anni Novanta vista dall\'alto, con slot ISA neri e slot PCI bianchi, zoccolo ZIF per il Pentium, chip della cache, moduli di memoria SIMM, due chip del chipset, chip del BIOS con l\'etichetta, batteria, connettore della tastiera e file di piedini per dischi e porte.',
        didascalia: '<strong>Una scheda Baby AT di metà anni \'90</strong> per Pentium (circa 22 × 33 cm; disegno, il bordo posteriore è in alto). Sul retro c\'è solo il connettore della tastiera: porte seriali, parallela e USB arrivavano con cavi piatti a file di piedini, e le prese stavano su staffe metalliche. Le piste orizzontali che uniscono gli slot ISA sono il bus: ogni scheda vede gli stessi fili. Lo zoccolo ZIF (<em>zero insertion force</em>) si apre con una leva; i ponticelli colorati impostano tensione e frequenza del processore.<ol class="sm-legenda">' + LEGENDA_BABYAT.map((t) => '<li><span>' + t + '</span></li>').join('') + '</ol>',
      },
      {
        tipo: 'testo',
        titolo: 'Il ponte nord entra nel processore',
        paragrafi: [
          'Con due ponti ogni dato chiesto alla memoria faceva due salti: dalla CPU al northbridge sul front side bus, poi dal northbridge ai moduli. Il viaggio costava tempo (la <em>latenza</em>), e la banda dell\'FSB era divisa fra tutto il traffico. Nel 2003 AMD portò il <strong>controller della memoria</strong> dentro il processore, ad aprile nell\'Opteron per i server e a settembre nell\'<strong>Athlon 64</strong>; per il resto del sistema usò un collegamento punto a punto, l\'<strong>HyperTransport</strong>.',
          'Intel seguì con l\'architettura <strong>Nehalem</strong>: il Core i7 del novembre 2008 aveva il controller della memoria a bordo e parlava con il chipset attraverso il QPI (<em>QuickPath Interconnect</em>). Nel 2009 i Core i5 e i7 «Lynnfield» inglobarono anche le 16 corsie per la scheda video: del northbridge non restava nulla fuori dal processore. Sulla scheda rimase un solo chip, il <strong>PCH</strong> (<em>Platform Controller Hub</em>; il primo fu il P55), collegato alla CPU dal <strong>DMI</strong> (<em>Direct Media Interface</em>): quattro corsie e 1 GB/s per direzione, diventate otto e circa 16 GB/s nella versione del 2021.',
          'Intanto le strade cambiavano forma: dai bus <strong>paralleli</strong>, con un filo per ogni bit, ai collegamenti <strong>seriali</strong>, che spediscono i bit uno dopo l\'altro. Sembra un passo indietro, ma a frequenze alte i segnali di tanti fili paralleli non arrivano più insieme, perché basta una piccola differenza di lunghezza per sfasarli, e i fili vicini si disturbano a vicenda. Una coppia di fili <strong>differenziale</strong>, con il clock nascosto nei dati stessi, può invece correre a miliardi di bit al secondo.',
          'Così il <strong>PCI Express</strong> (PCIe: specifica del 2002, nei PC dal 2004), fatto di corsie punto a punto che si sommano (x1, x4, x16), ha preso il posto di PCI e AGP; il <strong>SATA</strong> (<em>Serial ATA</em>, nei chipset dal 2003), con un cavo sottile a 7 fili, quello della piattina a 40 o 80 fili; l\'USB 2.0 (2000) è salito a 480 Mbit/s. Nel 2011 la specifica <strong>NVMe</strong> (<em>Non-Volatile Memory Express</em>) ha fatto parlare gli SSD (<em>solid-state drive</em>, dischi a stato solido) direttamente sulle corsie PCIe, spesso da uno slot <strong>M.2</strong> grande come una gomma da masticare.',
        ],
      },
      {
        tipo: 'nota',
        testo: 'Il vecchio PCI vive ancora dentro ogni PC. Per restare compatibile con i sistemi operativi, il PCI Express presenta ogni dispositivo con lo stesso «spazio di configurazione» inventato per il PCI nel 1992: per questo un SSD NVMe o una scheda video di oggi compaiono negli elenchi dell\'hardware come dispositivi PCI, con un numero di bus, di dispositivo e di funzione, come trent\'anni fa.',
      },
      {
        tipo: 'confronto',
        titolo: 'Quanto corrono le strade dei dati (banda massima teorica in una direzione; GT/s = miliardi di trasferimenti al secondo)',
        colonne: ['Collegamento', 'Nei PC dal', 'Com\'è fatto', 'Banda'],
        righe: [
          ['Bus dell\'IBM PC (poi ISA a 8 bit)', '1981', '8 bit a 4,77 MHz, condiviso', 'circa 1 MB/s (1,19 al massimo)'],
          ['VESA Local Bus', '1992', '32 bit a 33 MHz, legato al 486', '133 MB/s'],
          ['PCI', '1993', '32 bit a 33 MHz, condiviso', '133 MB/s'],
          ['AGP, da 1x a 8x', '1997', '32 bit a 66 MHz, solo per la grafica', 'da 266 MB/s a 2,1 GB/s'],
          ['Front side bus del 440BX', '1998', '64 bit a 100 MHz', '800 MB/s'],
          ['Hub link (Intel 810)', '1999', '8 bit, 266 milioni di trasferimenti al secondo', '266 MB/s'],
          ['DMI 1.0', '2004', '4 corsie come PCIe 1.0', '1 GB/s'],
          ['PCI Express 2.0 x16', '2007', '16 corsie a 5 GT/s', '8 GB/s'],
          ['PCI Express 4.0 x16', '2019', '16 corsie a 16 GT/s', '31,5 GB/s'],
          ['PCI Express 5.0 x16', '2021', '16 corsie a 32 GT/s', '63 GB/s'],
          ['Memoria DDR4 (qui DDR4-3200)', '2014', '2 canali da 64 bit', '51,2 GB/s'],
          ['Memoria DDR5 (qui DDR5-6400)', '2021', '2 canali da 64 bit', '102,4 GB/s'],
          ['Memoria unificata dell\'Apple M1', '2020', '128 bit, LPDDR4X-4266', '68,3 GB/s'],
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Chiplet e SoC: quasi tutto in un chip',
        paragrafi: [
          'Più componenti si mettono su un solo pezzo di silicio, più il chip diventa grande, costoso e a rischio di difetti. Nel 2019 AMD ha scelto un\'altra strada con i Ryzen di architettura <strong>Zen 2</strong>: i <strong>chiplet</strong>, piccoli chip separati montati sullo stesso supporto. In un Ryzen 3000 (luglio 2019) ci sono uno o due chiplet da otto core, prodotti a 7 nanometri, e un chiplet di I/O a 12 nanometri con il controller della memoria e le corsie PCIe: in pratica un northbridge tornato accanto ai core, nel <em>package</em>, cioè nel contenitore del processore.',
          'L\'<strong>Apple M1</strong> (novembre 2020) porta l\'idea all\'estremo opposto: è un <strong>SoC</strong> (<em>system on a chip</em>, sistema su un chip) di 16 miliardi di transistor con CPU (quattro core veloci e quattro efficienti), GPU (<em>graphics processing unit</em>), Neural Engine per l\'intelligenza artificiale e i controller di memoria, SSD e porte Thunderbolt. La memoria LPDDR4X sta nello stesso package, a pochi millimetri, ed è <strong>unificata</strong>: CPU e GPU leggono gli stessi byte a circa 68 GB/s, senza copiarli da una memoria all\'altra.',
          'Che cosa resta allora sulla scheda madre? Più di quanto sembri. Il VRM di un processore di fascia alta deve fornire anche più di 200 ampere a poco più di un volt; restano gli slot, i connettori, il firmware, i chip di rete e audio. E restano le piste: una corsia PCIe 5.0 corre a 32 miliardi di trasferimenti al secondo, e a quelle frequenze ogni pista va progettata come una linea di trasmissione. La scheda madre di oggi è soprattutto una rete elettrica e un cablaggio ad altissima velocità.',
        ],
      },
      { tipo: 'lab' },
      {
        tipo: 'numeri',
        items: [
          { prefisso: '×', valore: 57000, etichetta: 'la banda verso la memoria, dal bus dell\'IBM PC (1,19 MB/s) alla memoria unificata dell\'Apple M1 (68 GB/s)' },
          { valore: 63, unita: 'su 94', etichetta: 'i circuiti logici della scheda madre del PC AT riassunti nel 1985 nei 5 chip del CS8220' },
          { valore: 1700, unita: 'contatti', etichetta: 'nello zoccolo LGA 1700 dei processori Intel del 2021; l\'8088 del 1981 aveva 40 piedini' },
          { prefisso: 'oltre', valore: 200, unita: 'A', etichetta: 'la corrente che il VRM può fornire a un processore di fascia alta, a poco più di un volt' },
        ],
      },
      {
        tipo: 'schede',
        titolo: 'Le tappe della scheda madre',
        items: [
          { anno: 1981, nome: 'IBM PC 5150', luogo: 'IBM, Boca Raton (Florida)', testo: 'Scheda madre con l\'8088 a 4,77 MHz e cinque slot su un unico bus a 8 bit, l\'<em>I/O channel</em>: è l\'antenata di tutte le schede dei PC.' },
          { anno: 1984, nome: 'IBM PC AT', luogo: 'IBM, Boca Raton (Florida)', testo: 'Con l\'80286 il bus passa a 16 bit grazie a un secondo connettore in fila al primo: sarà chiamato ISA. Le misure della sua scheda diventano il fattore di forma AT.' },
          { anno: 1985, nome: 'Chipset CS8220', luogo: 'Chips and Technologies (California)', testo: 'Cinque chip al posto di 63 dei 94 circuiti logici della scheda del PC AT: le schede compatibili diventano più piccole ed economiche.' },
          { anno: 1992, nome: 'Bus PCI', luogo: 'Intel', testo: 'Specifica 1.0 a giugno, slot dalla versione 2.0 del 1993: 32 bit a 33 MHz, separato dal processore da un ponte e configurabile senza ponticelli.' },
          { anno: 1995, nome: 'Fattore di forma ATX', luogo: 'Intel', testo: 'Pubblicato a luglio: connettori esterni saldati sulla scheda in un unico pannello e alimentatore che si accende e si spegne da software.' },
          { anno: 1998, nome: 'Chipset Intel 440BX', luogo: 'Intel', testo: 'Northbridge con FSB a 100 MHz, SDRAM e AGP 2x, southbridge PIIX4 con dischi IDE, USB e ISA: il modello classico a due ponti.' },
          { anno: 1999, nome: 'Intel Hub Architecture', luogo: 'Intel, chipset 810', testo: 'Northbridge e southbridge diventano MCH e ICH, uniti da un collegamento riservato da 266 MB/s; BIOS e Super I/O passano al bus LPC.' },
          { anno: 2003, nome: 'AMD Athlon 64', luogo: 'AMD, Sunnyvale (California)', testo: 'Dopo l\'Opteron per i server, anche il processore per i PC ha il controller della memoria a bordo; il resto del sistema è collegato con l\'HyperTransport.' },
          { anno: 2004, nome: 'PCI Express nei PC', luogo: 'Intel, chipset 915 e 925', testo: 'Le corsie seriali punto a punto sostituiscono AGP e PCI; con gli stessi chipset arriva il DMI fra northbridge e southbridge.' },
          { anno: 2009, nome: 'Intel P55, il primo PCH', luogo: 'Intel', testo: 'Con i Core «Lynnfield» memoria e grafica passano nel processore: sulla scheda resta un solo chip, collegato con il DMI.' },
          { anno: 2019, nome: 'AMD Ryzen 3000 (Zen 2)', luogo: 'AMD, Santa Clara (California)', testo: 'Chiplet: uno o due chip con i core a 7 nm e un chip di I/O a 12 nm con memoria e PCIe 4.0, tutti nello stesso package.' },
          { anno: 2020, nome: 'Apple M1', luogo: 'Apple, Cupertino (California)', testo: 'Un SoC con CPU, GPU e Neural Engine; la memoria unificata sta nello stesso package e la usano tutti, a circa 68 GB/s.' },
        ],
      },
    ],
    lab: {
      titolo: 'Quattro epoche di schede madri',
      sottotitolo: 'Scegli un\'epoca e guarda lo schema trasformarsi; tocca un collegamento per leggerne la scheda.',
      crea: creaLab,
    },
    punti: [
      'La scheda madre collega processore, memoria, chipset e periferiche con i <strong>bus</strong>, porta l\'alimentazione (VRM) e custodisce il firmware; il fattore di forma (AT, ATX, microATX, Mini-ITX) ne fissa misure e fori.',
      'Nel 1981 un solo bus condiviso a 8 bit, circa 1 MB/s, univa tutto; dal 1985 i <strong>chipset</strong> hanno riassunto decine di chip di supporto in pochi.',
      'Negli anni \'90 il bus si è diviso in due ponti: il <strong>northbridge</strong> per processore, memoria e grafica (FSB, AGP), il <strong>southbridge</strong> per dischi, USB, PCI e ISA.',
      'Il controller della memoria è entrato nel processore (AMD nel 2003, Intel nel 2008); dal 2009 sulla scheda resta un solo chip, il <strong>PCH</strong>, collegato con il DMI.',
      'I collegamenti <strong>seriali</strong> (PCI Express, SATA, USB, NVMe) hanno sostituito quelli paralleli perché ad alta frequenza tanti fili affiancati non restano sincronizzati.',
      'Oggi <strong>chiplet</strong> e <strong>SoC</strong> portano quasi tutto nel package del processore; sulla scheda restano alimentazione, slot, connettori e piste ad altissima velocità.',
    ],
    collegamenti: [
      { testo: 'Bus ISA', href: '../../index.html#/bus/isa', tipo: 'buslab' },
      { testo: 'Bus PCI', href: '../../index.html#/bus/pci', tipo: 'buslab' },
      { testo: 'PCI Express', href: '../../index.html#/bus/pcie', tipo: 'buslab' },
      { testo: 'SATA', href: '../../index.html#/bus/sata', tipo: 'buslab' },
      { testo: 'USB', href: '../../index.html#/bus/usb', tipo: 'buslab' },
      { testo: 'SPI, il bus del chip del firmware', href: '../../index.html#/bus/spi', tipo: 'buslab' },
      { testo: 'SMBus, il bus dello SPD', href: '../../index.html#/bus/smbus', tipo: 'buslab' },
      { testo: 'Sezione 5 · I processori a 16 bit', href: '../chip-programmabili/index.html#sedici-bit', tipo: 'sezione' },
      { testo: 'Sezione 3 · Segnali differenziali', href: '../elettronica-avanzata/index.html#differenziale', tipo: 'sezione' },
      { testo: 'Sezione 3 · Linee di trasmissione', href: '../elettronica-avanzata/index.html#linee', tipo: 'sezione' },
      { testo: 'Capitolo 6 · La gerarchia della memoria', href: '#memoria', tipo: 'sezione' },
      { testo: 'Capitolo 7 · Accendere un PC', href: '#avvio', tipo: 'sezione' },
      { testo: 'Capitolo 10 · Il PC di oggi', href: '#oggi', tipo: 'sezione' },
      { testo: 'Quiz del capitolo', href: '../quiz/index.html#storia-pc/scheda-madre', tipo: 'sezione' },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
