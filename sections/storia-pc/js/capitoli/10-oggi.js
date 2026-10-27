/*
 * Storia del PC · capitolo 10: Portatili, ARM e chip unico: il PC di oggi (1981–oggi).
 * Testi, due illustrazioni (tre computer chiusi in scala; la scheda Arduino Uno) e il
 * laboratorio «Dal PC a un solo chip», con la seconda scheda «In valigia o in tasca».
 * Il file non tocca il DOM al caricamento: il DOM si usa solo dentro le figure e
 * dentro lab.crea(), così i test in Node possono caricarlo.
 * Dati e logica del laboratorio stanno nel modello js/modelli/10-oggi.js.
 */
(function (root) {
  'use strict';
  const P = root.StoriaPC;
  const M = (root.StoriaPCModelli || {}).oggi;

  /* =====================================================================
   * Illustrazioni (SVG originali, stile tecnico piatto della sezione)
   * ===================================================================== */

  function n(v) { return Math.round(v * 10) / 10; }
  function percorso(lista) { return lista.map((p) => n(p[0]) + ' ' + n(p[1])).join('L'); }
  function poligono(cls, lista) { return '<path class="' + cls + '" d="M' + percorso(lista) + 'Z"/>'; }
  function rett(cls, x, y, w, hh, rx) {
    return '<rect class="' + cls + '" x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(hh) + '"' + (rx ? ' rx="' + rx + '"' : '') + '/>';
  }
  function testo(cls, x, y, t, extra) {
    return '<text class="' + cls + '" x="' + n(x) + '" y="' + n(y) + '"' + (extra || '') + '>' + t + '</text>';
  }

  // Tre computer chiusi nella stessa scala (4,6 px per centimetro), in proiezione
  // obliqua: la profondità corre in diagonale, accorciata della metà.
  // Misure: Osborne 1 52 x 23 x 33 cm; MacBook Air 32,5 x 22,7 cm, da 0,4 a 1,94 cm;
  // smartphone 7,06 x 14,66 x 0,825 cm.
  function figuraInScala() {
    const S = 4.6, G = 200, KX = 0.433, KY = 0.25;
    const ob = (x, y, z) => [x + z * KX, y - z * KY];
    let o = '<svg class="oggi-fig" viewBox="0 0 640 252" xmlns="http://www.w3.org/2000/svg">';

    // righello sul pavimento: una tacca ogni 10 cm
    const R0 = 24;
    o += '<path class="oggi-pavimento" d="M12 ' + (G + 0.5) + 'H628"/>';
    let tacche = '';
    for (let cm = 0; cm <= 130; cm += 10) {
      const x = R0 + cm * S, lunga = cm % 50 === 0;
      tacche += 'M' + n(x) + ' ' + (G + 12) + 'V' + (G + (lunga ? 24 : 18));
    }
    o += '<path class="oggi-righello" d="M' + R0 + ' ' + (G + 12) + 'H' + n(R0 + 130 * S) + tacche + '"/>';
    o += testo('oggi-fig-misura', R0, G + 44, '0', ' text-anchor="start"');
    o += testo('oggi-fig-misura', R0 + 50 * S, G + 44, '50 cm');
    o += testo('oggi-fig-misura', R0 + 100 * S, G + 44, '1 m');

    // Osborne 1 chiuso: la tastiera fa da coperchio sul davanti, la maniglia sopra
    const X0 = 24, W0 = 52 * S, H0 = 22.9 * S, D0 = 33 * S, T0 = G - H0;
    o += '<ellipse class="oggi-ombra" cx="' + n(X0 + W0 / 2 + 34) + '" cy="' + (G + 1) + '" rx="' + n(W0 / 2 + 46) + '" ry="7"/>';
    o += poligono('be3 l', [[X0 + W0, T0], ob(X0 + W0, T0, D0), ob(X0 + W0, G, D0), [X0 + W0, G]]);
    o += poligono('be l', [[X0, T0], [X0 + W0, T0], ob(X0 + W0, T0, D0), ob(X0, T0, D0)]);
    for (let i = 0; i < 6; i++) {
      const y = T0 + 22 + i * 11;
      o += '<path class="oggi-fessura" d="M' + percorso([ob(X0 + W0, y, D0 * 0.22), ob(X0 + W0, y, D0 * 0.78)]) + '"/>';
    }
    o += rett('be2 l', X0, T0, W0, H0, 4);
    o += rett('be l1', X0 + 8, T0 + 8, W0 - 16, H0 - 16, 6);
    o += '<path class="oggi-solco" d="M' + n(X0 + 18) + ' ' + n(T0 + 24) + 'H' + n(X0 + W0 - 18) + '"/>';
    [[X0 + 26, T0 + 13], [X0 + W0 - 46, T0 + 13], [X0 + 26, G - 18], [X0 + W0 - 46, G - 18]].forEach((p) => { o += rett('sc', p[0], p[1], 20, 5, 2); });
    o += rett('be3', X0 + W0 / 2 - 30, G - 30, 60, 9, 2);
    o += rett('gr2 l1', X0 + 1, T0 + H0 / 2 - 13, 9, 26, 2) + rett('gr2 l1', X0 + W0 - 10, T0 + H0 / 2 - 13, 9, 26, 2);
    const zc = D0 * 0.42, m1 = ob(X0 + W0 * 0.34, T0, zc), m2 = ob(X0 + W0 * 0.66, T0, zc);
    o += '<path class="oggi-maniglia" d="M' + percorso([m1, [m1[0] + 4, m1[1] - 15], [m2[0] - 4, m2[1] - 15], m2]) + '"/>';
    o += '<path class="oggi-maniglia-luce" d="M' + n(m1[0] + 8) + ' ' + n(m1[1] - 16.5) + 'H' + n(m2[0] - 8) + '"/>';
    o += testo('oggi-fig-anno', X0 + (W0 + D0 * KX) / 2, m1[1] - 28, '1981');

    // portatile sottile del 2008, chiuso: un cuneo di alluminio
    const X1 = X0 + W0 + D0 * KX + 30, W1 = 32.5 * S, D1 = 22.7 * S, t0 = 0.4 * S, t1 = 1.94 * S;
    const FL = [X1, G], FR = [X1 + W1, G], FLt = [X1, G - t0], FRt = [X1 + W1, G - t0];
    const BLt = ob(X1, G - t1, D1), BRt = ob(X1 + W1, G - t1, D1), BR = ob(X1 + W1, G, D1);
    o += '<ellipse class="oggi-ombra" cx="' + n(X1 + W1 / 2 + 24) + '" cy="' + (G + 1) + '" rx="' + n(W1 / 2 + 30) + '" ry="5"/>';
    o += poligono('al2 l1', [FR, FRt, BRt, BR]);
    o += poligono('al l1', [FLt, FRt, BRt, BLt]);
    o += poligono('al3 l1', [FL, FR, FRt, FLt]);
    o += '<path class="oggi-giunto" d="M' + percorso([[X1 + W1, G - 1.1], ob(X1 + W1, G - t1 + 2.6, D1)]) + '"/>';
    o += '<path class="oggi-riflesso" d="M' + percorso([ob(X1 + 18, G - t0 - 0.6, D1 * 0.18), ob(X1 + W1 * 0.55, G - t0 - 0.6, D1 * 0.18)]) + '"/>';
    o += testo('oggi-fig-anno', X1 + (W1 + D1 * KX) / 2, BLt[1] - 14, '2008');

    // smartphone del 2023, in piedi
    const X2 = X1 + W1 + D1 * KX + 26, W2 = 7.06 * S, H2 = 14.66 * S, T2 = G - H2;
    o += '<ellipse class="oggi-ombra" cx="' + n(X2 + W2 / 2 + 2) + '" cy="' + (G + 1) + '" rx="' + n(W2 / 2 + 8) + '" ry="3.5"/>';
    o += rett('sc2', X2 + 1.6, T2 - 1, W2, H2, 5);
    o += rett('sc l1', X2, T2, W2, H2, 5);
    o += rett('oggi-schermo', X2 + 2, T2 + 2, W2 - 4, H2 - 4, 4);
    o += rett('oggi-schermo-luce', X2 + 2, T2 + 2, W2 - 4, H2 - 4, 4);
    const app = ['t1', 't3', 't2', 't4'];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 4; c++) o += rett('oggi-app ' + app[(r + c) % 4], X2 + 5 + c * 6.2, T2 + 11 + r * 8.6, 4.4, 4.4, 1.2);
    }
    o += rett('oggi-app t3', X2 + 5, G - 12, 22.6, 5, 2.5);
    o += rett('sc', X2 + W2 / 2 - 5, T2 + 4.2, 10, 2.8, 1.4);
    o += testo('oggi-fig-anno', X2 + W2 / 2, T2 - 14, '2023');
    return o + '</svg>';
  }

  // Numero di richiamo con la sua linea guida (spiegato nella didascalia).
  function richiamo(num, cx, cy, x2, y2) {
    return '<path class="oggi-guida" d="M' + cx + ' ' + cy + 'L' + x2 + ' ' + y2 + '"/>' +
      '<circle class="oggi-guida-punto" cx="' + x2 + '" cy="' + y2 + '" r="3.5"/>' +
      '<g class="oggi-richiamo"><circle cx="' + cx + '" cy="' + cy + '" r="17"/>' +
      '<text x="' + cx + '" y="' + (cy + 8) + '">' + num + '</text></g>';
  }

  // Scheda Arduino Uno vista dall'alto, 7 px per millimetro (68,6 x 53,3 mm).
  function figuraArduino() {
    const X = 104, Y = 50, K = 7;
    const px = (mm) => X + mm * K, py = (mm) => Y + mm * K;
    const R = (cls, x, y, w, hh, rx) => rett(cls, px(x), py(y), w * K, hh * K, rx);
    let o = '<svg class="oggi-fig" viewBox="0 0 640 440" xmlns="http://www.w3.org/2000/svg">';
    o += '<rect class="oggi-ombra" x="' + (px(0) + 6) + '" y="' + (py(0) + 8) + '" width="' + (68.58 * K) + '" height="' + n(53.34 * K) + '" rx="12"/>';
    // circuito stampato con gli angoli smussati a destra
    o += '<path class="ard-pcb l" d="M' + percorso([[px(1.6), py(0)], [px(66), py(0)], [px(68.58), py(2.6)], [px(68.58), py(50.74)], [px(66), py(53.34)], [px(1.6), py(53.34)]]) +
      'Q' + px(0) + ' ' + n(py(53.34)) + ' ' + px(0) + ' ' + n(py(51.74)) + 'L' + px(0) + ' ' + py(1.6) + 'Q' + px(0) + ' ' + py(0) + ' ' + px(1.6) + ' ' + py(0) + 'Z"/>';
    // piste di rame (decorative)
    const piste = [
      [[24.5, 15], [27, 15], [27, 9.2], [28.6, 9.2]],
      [[22, 17.5], [22, 24]],
      [[24.5, 16.5], [33, 16.5], [33, 6], [36, 3.8]],
      [[15, 34.5], [22, 34.5], [26, 38.5], [26, 49.4]],
      [[30.4, 36.4], [30.4, 30], [46, 30], [46, 4]],
      [[40.6, 36.4], [40.6, 33], [52, 33], [52, 4]],
      [[56, 45.4], [56, 48], [52.1, 49.4]],
      [[60.5, 36.4], [60.5, 32], [62.4, 31]],
      [[9.6, 15], [14, 15], [19.5, 15]],
    ];
    piste.forEach((p) => { o += '<path class="ard-pista" d="M' + percorso(p.map((q) => [px(q[0]), py(q[1])])) + '"/>'; });
    // fori di fissaggio
    [[15.24, 2.54], [66.04, 17.78], [66.04, 45.72], [13.97, 50.8]].forEach((f) => {
      o += '<circle class="ard-foro" cx="' + n(px(f[0])) + '" cy="' + n(py(f[1])) + '" r="' + n(1.6 * K) + '"/>';
    });
    // file di pin: digitali in alto, alimentazione e analogici in basso
    const fila = (x0, y0, nn, passo) => {
      let s = R('ard-serigrafia-fondo', x0 - 1.27 - 0.3, y0 - 1.27 - 0.3, nn * passo + 0.6, 2.54 + 0.6, 2) + R('ard-header', x0 - 1.27, y0 - 1.27, nn * passo, 2.54, 2);
      for (let i = 0; i < nn; i++) s += R('ard-pin', x0 + i * passo - 0.5, y0 - 0.5, 1, 1);
      return s;
    };
    o += fila(18.17, 2.54, 10, 2.54) + fila(45.09, 2.54, 8, 2.54);
    o += fila(27.94, 50.8, 8, 2.54) + fila(50.8, 50.8, 6, 2.54);
    // connettore ICSP del microcontrollore
    o += R('ard-header', 62.1, 23.4, 5.1, 7.6, 2);
    [24.67, 27.21, 29.75].forEach((y) => { o += R('ard-pin', 63.37 - 0.5, y - 0.5, 1, 1) + R('ard-pin', 65.91 - 0.5, y - 0.5, 1, 1); });
    // presa USB tipo B e presa di alimentazione
    o += R('ard-metallo l1', -6.3, 9.2, 16.2, 12, 2);
    o += R('sc', -6.3, 10.6, 2.2, 9.2, 1);
    o += '<path class="ard-costola" d="M' + n(px(-1)) + ' ' + n(py(9.8)) + 'V' + n(py(20.6)) + 'M' + n(px(3)) + ' ' + n(py(9.8)) + 'V' + n(py(20.6)) + 'M' + n(px(7)) + ' ' + n(py(9.8)) + 'V' + n(py(20.6)) + '"/>';
    o += R('sc l1', -1.8, 41.3, 14.2, 8.9, 2);
    o += R('sc2', -1.8, 42.4, 2.4, 6.7, 1);
    o += '<path class="ard-costola" d="M' + n(px(4)) + ' ' + n(py(41.9)) + 'V' + n(py(49.6)) + 'M' + n(px(8.5)) + ' ' + n(py(41.9)) + 'V' + n(py(49.6)) + '"/>';
    // regolatore di tensione e due condensatori elettrolitici
    o += R('ard-metallo', 8.6, 31.4, 6.4, 1.4) + R('sc l1', 8.6, 32.6, 6.4, 4.2, 2);
    [[17.4, 40.4], [17.4, 46.9]].forEach((c) => {
      o += '<circle class="ard-metallo l1" cx="' + n(px(c[0])) + '" cy="' + n(py(c[1])) + '" r="' + n(3 * K) + '"/>' +
        '<path class="ard-polo" d="M' + n(px(c[0] - 2.1)) + ' ' + n(py(c[1] - 2.1)) + 'A' + n(3 * K) + ' ' + n(3 * K) + ' 0 0 1 ' + n(px(c[0] + 2.1)) + ' ' + n(py(c[1] - 2.1)) + 'Z"/>' +
        '<path class="ard-croce" d="M' + n(px(c[0] - 1.1)) + ' ' + n(py(c[1] + 0.6)) + 'H' + n(px(c[0] + 1.1)) + 'M' + n(px(c[0])) + ' ' + n(py(c[1] - 0.5)) + 'V' + n(py(c[1] + 1.7)) + '"/>';
    });
    // quarzo, ATmega16U2, pulsante di reset
    o += R('ard-metallo l1', 11.5, 26, 11, 4.6, 16);
    o += '<path class="oggi-riflesso" d="M' + n(px(13.6)) + ' ' + n(py(27.1)) + 'H' + n(px(20.2)) + '"/>';
    o += R('ard-chip l1', 19.5, 12.5, 5, 5, 1.5);
    let piedini = '';
    for (let i = 0; i < 5; i++) {
      const t = 0.6 + i * 0.95;
      piedini += 'M' + n(px(19.5 + t)) + ' ' + n(py(11.9)) + 'V' + n(py(12.5)) + 'M' + n(px(19.5 + t)) + ' ' + n(py(17.5)) + 'V' + n(py(18.1)) +
        'M' + n(px(18.9)) + ' ' + n(py(12.5 + t)) + 'H' + n(px(19.5)) + 'M' + n(px(24.5)) + ' ' + n(py(12.5 + t)) + 'H' + n(px(25.1));
    }
    o += '<path class="ard-piedino-qfn" d="' + piedini + '"/>';
    o += R('gr2 l1', 3.4, 1.4, 6.2, 6.2, 3) + '<circle class="ard-pulsante l1" cx="' + n(px(6.5)) + '" cy="' + n(py(4.5)) + '" r="' + n(1.8 * K) + '"/>';
    // LED: L (pin 13), TX, RX e ON
    [[29.5, 8.6], [29.5, 11.8], [29.5, 14.6]].forEach((l, i) => {
      if (i === 0) o += '<circle class="ard-bagliore-ambra" cx="' + n(px(l[0])) + '" cy="' + n(py(l[1])) + '" r="12"/>';
      o += R('ard-led-ambra l1', l[0] - 1, l[1] - 0.6, 2, 1.2, 1);
    });
    o += '<circle class="ard-bagliore-verde" cx="' + n(px(60.5)) + '" cy="' + n(py(22.1)) + '" r="12"/>' + R('ard-led-verde l1', 59.5, 21.5, 2, 1.2, 1);
    // il microcontrollore ATmega328P nel suo zoccolo
    o += R('ard-zoccolo l1', 27.6, 36.6, 36, 9.6, 3);
    let gambe = '';
    for (let i = 0; i < 14; i++) {
      const x = 29.4 + i * 2.54;
      gambe += R('ard-gamba', x - 0.45, 36.5, 0.9, 1.3) + R('ard-gamba', x - 0.45, 45.2, 0.9, 1.3);
    }
    o += gambe + R('ard-chip l1', 28.3, 37.6, 34.6, 7.6, 3);
    o += '<path class="ard-tacca" d="M' + n(px(28.3)) + ' ' + n(py(40.2)) + 'A' + n(1.2 * K) + ' ' + n(1.2 * K) + ' 0 0 1 ' + n(px(28.3)) + ' ' + n(py(42.6)) + 'Z"/>';
    o += '<circle class="ard-punto" cx="' + n(px(30.4)) + '" cy="' + n(py(43.6)) + '" r="3"/>';
    // richiami (spiegati nella didascalia)
    o += richiamo(1, 30, 156, 60, 156);
    o += richiamo(2, 362, 200, 277, 166);
    o += richiamo(3, 150, 24, 150, 59);
    o += richiamo(4, 612, 68, 554, 68);
    o += richiamo(5, 430, 270, 430, 306);
    o += richiamo(6, 612, 405, 558, 405);
    o += richiamo(7, 52, 371, 91, 371);
    return o + '</svg>';
  }

  /* =====================================================================
   * Laboratorio: «Un solo chip» e «In valigia o in tasca»
   * ===================================================================== */

  // Due impaginazioni della scheda madre: «largo» quando c'è spazio, «stretto» sui telefoni.
  // Per ogni pezzo: c = centro sulla scheda, w e h = misure, strada = pista fino al pezzo da
  // cui passa per arrivare al processore (il campo «via» del modello), dita = lato del
  // connettore delle schede di espansione. Il package del processore sta in pkg, ingrandito di k.
  const LAB_SCHEDE = {
    largo: {
      w: 640, h: 380, k: 1, pkg: [236, 196], etichetta: [236, 288],
      pezzi: {
        fpu: { c: [236, 64], w: 52, h: 52, strada: [[236, 64], [236, 196]] },
        cache: { c: [76, 196], w: 104, h: 68, strada: [[76, 188], [236, 188]] },
        nord: { c: [420, 150], w: 64, h: 64, strada: [[420, 150], [236, 150]] },
        ram: { c: [420, 50], w: 150, h: 44, strada: [[420, 50], [420, 150]] },
        sud: { c: [420, 290], w: 58, h: 58, strada: [[420, 290], [420, 150]] },
        video: { c: [566, 74], w: 104, h: 50, dita: 'sinistra', strada: [[566, 74], [480, 74], [480, 150], [420, 150]] },
        audio: { c: [566, 162], w: 104, h: 50, dita: 'sinistra', strada: [[566, 162], [492, 162], [492, 290], [420, 290]] },
        rete: { c: [566, 250], w: 104, h: 50, dita: 'sinistra', strada: [[566, 250], [492, 250], [492, 290], [420, 290]] },
        modem: { c: [566, 338], w: 104, h: 50, dita: 'sinistra', strada: [[566, 338], [492, 338], [492, 290], [420, 290]] },
      },
    },
    stretto: {
      w: 360, h: 556, k: 1.15, pkg: [180, 176], etichetta: [180, 270],
      pezzi: {
        fpu: { c: [124, 46], w: 52, h: 52, strada: [[124, 46], [124, 176]] },
        cache: { c: [256, 46], w: 104, h: 68, strada: [[256, 38], [214, 38], [214, 176]] },
        nord: { c: [180, 312], w: 64, h: 64, strada: [[180, 312], [180, 176]] },
        ram: { c: [70, 312], w: 112, h: 44, strada: [[70, 312], [180, 312]] },
        video: { c: [292, 312], w: 100, h: 46, dita: 'sinistra', strada: [[292, 312], [180, 312]] },
        sud: { c: [180, 410], w: 58, h: 58, strada: [[180, 410], [180, 312]] },
        audio: { c: [64, 500], w: 100, h: 46, dita: 'sopra', strada: [[64, 500], [64, 458], [180, 458], [180, 410]] },
        rete: { c: [180, 500], w: 100, h: 46, dita: 'sopra', strada: [[180, 500], [180, 410]] },
        modem: { c: [296, 500], w: 100, h: 46, dita: 'sopra', strada: [[296, 500], [296, 458], [180, 458], [180, 410]] },
      },
    },
  };

  const LAB_PEZZI = ['fpu', 'cache', 'nord', 'ram', 'sud', 'video', 'audio', 'rete', 'modem'];
  const LAB_TILE = ['cpu', 'fpu', 'cache', 'nord', 'video', 'sud', 'npu', 'ram'];
  const LAB_ASSORBITI = ['audio', 'rete', 'modem'];
  const LAB_ETICHETTE = { fpu: 'FPU', cache: 'Cache', nord: 'Nord', sud: 'Sud', ram: 'RAM', video: 'Video', audio: 'Audio', rete: 'Rete', modem: 'Modem' };
  // Come si dividono il die le funzioni integrate (frazioni del die: x, y, larghezza, altezza).
  const LAB_DISPOSIZIONI = {
    1: [[0, 0, 1, 1]],
    2: [[0, 0, 1, 0.62], [0, 0.62, 1, 0.38]],
    3: [[0, 0, 1, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
    4: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
    5: [[0, 0, 0.6, 0.5], [0.6, 0, 0.4, 0.5], [0, 0.5, 1 / 3, 0.5], [1 / 3, 0.5, 1 / 3, 0.5], [2 / 3, 0.5, 1 / 3, 0.5]],
    7: [[0, 0, 2 / 3, 1 / 3], [2 / 3, 0, 1 / 3, 1 / 3], [0, 1 / 3, 1 / 3, 1 / 3], [1 / 3, 1 / 3, 1 / 3, 1 / 3], [2 / 3, 1 / 3, 1 / 3, 1 / 3], [0, 2 / 3, 0.5, 1 / 3], [0.5, 2 / 3, 0.5, 1 / 3]],
  };
  const LAB_VELOCITA = 150;   // passo degli impulsi di dati, in unità della scheda al secondo

  function labDisposizione(n) {
    if (LAB_DISPOSIZIONI[n]) return LAB_DISPOSIZIONI[n];
    const col = Math.ceil(Math.sqrt(n)), righe = Math.ceil(n / col), out = [];
    for (let i = 0; i < n; i++) out.push([(i % col) / col, Math.floor(i / col) / righe, 1 / col, 1 / righe]);
    return out;
  }

  // Dove stanno il die e i pezzi integrati, in coordinate del package (centro in 0,0).
  function labGeometria(pos) {
    const nelDie = ['cpu', 'fpu', 'cache', 'nord', 'video', 'sud', 'npu'].filter((id) => id === 'cpu' || pos[id] === 'die');
    const nelPkg = ['cache', 'video', 'sud', 'ram'].filter((id) => pos[id] === 'package');
    const die = nelPkg.length ? { x: -70, y: -48, w: 96, h: 96 } : { x: -48, y: -48, w: 96, h: 96 };
    const tile = {};
    labDisposizione(nelDie.length).forEach((f, i) => {
      tile[nelDie[i]] = { x: die.x + f[0] * die.w + 2, y: die.y + f[1] * die.h + 2, w: f[2] * die.w - 4, h: f[3] * die.h - 4 };
    });
    // Pezzi di silicio separati nello stesso package: in una striscia accanto al die.
    if (nelPkg.length === 1 && nelPkg[0] !== 'ram') tile[nelPkg[0]] = { x: 34, y: -32, w: 36, h: 64 };
    else {
      const hh = (96 - 4 * (nelPkg.length - 1)) / Math.max(1, nelPkg.length);
      nelPkg.forEach((id, i) => { tile[id] = { x: 34, y: -48 + i * (hh + 4), w: 36, h: hh }; });
    }
    return { die: die, tile: tile };
  }

  function labLunghezza(pt) {
    let l = 0;
    for (let i = 1; i < pt.length; i++) l += Math.hypot(pt[i][0] - pt[i - 1][0], pt[i][1] - pt[i - 1][1]);
    return l;
  }

  function labPunto(pt, d) {
    for (let i = 1; i < pt.length; i++) {
      const l = Math.hypot(pt[i][0] - pt[i - 1][0], pt[i][1] - pt[i - 1][1]);
      if (d <= l || i === pt.length - 1) {
        const t = l ? Math.min(1, d / l) : 0;
        return [pt[i - 1][0] + (pt[i][0] - pt[i - 1][0]) * t, pt[i - 1][1] + (pt[i][1] - pt[i - 1][1]) * t];
      }
      d -= l;
    }
    return pt[0];
  }

  function labD(pt) { return 'M' + pt.map((p) => n(p[0]) + ' ' + n(p[1])).join('L'); }

  /* ---------- aspetto dei pezzi sulla scheda (disegnati attorno a 0,0) ---------- */

  function labChip(w, hh, sigla, quattro) {
    let o = rett('ogl-chip', -w / 2, -hh / 2, w, hh, 3);
    let d = '';
    const nv = Math.max(2, Math.floor((hh - 8) / 8));
    for (let i = 0; i < nv; i++) {
      const y = n(-hh / 2 + 6 + i * (hh - 12) / (nv - 1) - 1.5);
      d += 'M' + n(-w / 2 - 4) + ' ' + y + 'h4v3h-4z M' + n(w / 2) + ' ' + y + 'h4v3h-4z';
    }
    if (quattro) {
      const no = Math.max(2, Math.floor((w - 8) / 8));
      for (let i = 0; i < no; i++) {
        const x = n(-w / 2 + 6 + i * (w - 12) / (no - 1) - 1.5);
        d += 'M' + x + ' ' + n(-hh / 2 - 4) + 'h3v4h-3z M' + x + ' ' + n(hh / 2) + 'h3v4h-3z';
      }
    }
    o += '<path class="ogl-pin" d="' + d + '"/>';
    o += '<circle class="ogl-tacca" cx="' + n(-w / 2 + 7) + '" cy="' + n(-hh / 2 + 7) + '" r="2.2"/>';
    if (sigla) o += '<text class="ogl-sigla" y="5">' + sigla + '</text>';
    return o;
  }

  function labAspetto(id, p) {
    const w = p.w, hh = p.h;
    let o = rett('ogl-alone', -w / 2 - 7, -hh / 2 - 7, w + 14, hh + 14, 8);
    if (id === 'fpu') {
      o += rett('ogl-zoccolo', -w / 2 - 4, -hh / 2 - 4, w + 8, hh + 8, 4);
      o += rett('ogl-chip', -w / 2 + 3, -hh / 2 + 3, w - 6, hh - 6, 3);
      o += '<text class="ogl-sigla" y="5">FPU</text>';
    } else if (id === 'cache') {
      let pin = '';
      [-39, -13, 13, 39].forEach((x) => {
        o += rett('ogl-chip', x - 10, -28, 20, 40, 2);
        for (let i = 0; i < 5; i++) pin += 'M' + (x - 13) + ' ' + (-24 + i * 8) + 'h3v3h-3z M' + (x + 10) + ' ' + (-24 + i * 8) + 'h3v3h-3z';
      });
      o += '<path class="ogl-pin" d="' + pin + '"/>';
      o += '<text class="ogl-etichetta" y="31">Cache</text>';
    } else if (id === 'ram') {
      [-12, 12].forEach((m, k) => {
        o += rett('ogl-modulo', -w / 2, m - 10, w, 20, 2) + rett('ogl-oro', -w / 2 + 4, m + 6.5, w - 8, 2.5, 1);
        for (let x = -w / 2 + 6; x + 13 <= -19; x += 17) o += rett('ogl-chip', x, m - 7, 13, 10, 1) + rett('ogl-chip', -x - 13, m - 7, 13, 10, 1);
        if (k === 0) o += '<text class="ogl-sigla piccola" y="' + (m + 4.5) + '">RAM</text>';
      });
    } else if (id === 'nord' || id === 'sud') {
      o += labChip(w, hh, '', true);
      o += '<text class="ogl-sigla" y="' + (id === 'sud' ? 2 : 5) + '">' + LAB_ETICHETTE[id] + '</text>';
      if (id === 'sud') LAB_ASSORBITI.forEach((a, i) => { o += '<rect class="ogl-assorbito ogl-c-' + a + '" x="' + (-14.5 + i * 11) + '" y="9" width="7" height="7" rx="1.5" opacity="0"/>'; });
    } else {
      // scheda di espansione con il pettine di contatti dorati
      o += rett('ogl-carta', -w / 2, -hh / 2, w, hh, 4);
      let dita = '';
      if (p.dita === 'sopra') for (let x = -w / 2 + 8; x < w / 2 - 8; x += 7) dita += 'M' + n(x) + ' ' + (-hh / 2) + 'h4v5h-4z';
      else for (let y = -hh / 2 + 6; y < hh / 2 - 6; y += 7) dita += 'M' + (-w / 2) + ' ' + n(y) + 'h5v4h-5z';
      o += '<path class="ogl-oro" d="' + dita + '"/>';
      o += rett('ogl-chip', w / 2 - 25, p.dita === 'sopra' ? -4 : -9, 16, 16, 2);
      o += '<text class="ogl-sigla" x="-9" y="' + (p.dita === 'sopra' ? 10 : 5) + '">' + LAB_ETICHETTE[id] + '</text>';
    }
    return o;
  }

  /* ---------- prima scheda: dalla scheda madre al chip unico ---------- */

  function labIntegrazione(radice, ctx) {
    const { h, s } = ctx;
    const rid = ctx.ridotto();
    const D = ctx.motion.dur;
    const maxStrada = M.statoAnno(M.ANNO_MIN).stradaMedia;
    const timer = new Set();
    let L = null, nomeLayout = '', refs = null, stato = null, anno = M.ANNO_MIN, gioco = 0, attivo = false;

    function dopo(ms, fn) { const t = setTimeout(() => { timer.delete(t); fn(); }, ms); timer.add(t); return t; }

    /* animazioni interrompibili: ogni chiave riparte dal valore attuale */
    const animi = new Map();
    let raf = 0;
    function frame(now) {
      raf = 0;
      animi.forEach((a, k) => {
        const t = now - a.t0 - a.ritardo;
        if (t < 0) return;
        const p = Math.min(1, t / a.dur);
        a.aggiorna(a.ease(p), p);
        if (p >= 1) animi.delete(k);
      });
      if (animi.size) raf = requestAnimationFrame(frame);
    }
    function anima(chiave, dur, ritardo, ease, aggiorna) {
      if (rid || !dur) { animi.delete(chiave); aggiorna(1, 1); return; }
      animi.set(chiave, { t0: performance.now(), dur: dur, ritardo: ritardo || 0, ease: ctx.curve[ease] || ctx.curve.smooth, aggiorna: aggiorna });
      if (!raf) raf = requestAnimationFrame(frame);
    }

    /* ---- parti fisse: lato, comandi, elenco ---- */
    const tela = h('div', { class: 'ogl-tela' });
    const tappaAnno = h('span', { class: 'ogl-tappa-anno lab-mono' });
    const tappaTit = h('strong', { class: 'ogl-tappa-tit' });
    const tappaEs = h('p', { class: 'ogl-esempio' });
    const nota = h('p', { class: 'lab-note ogl-nota', 'aria-live': 'polite' });
    const numChip = h('span', { class: 'ogl-num lab-mono' });
    const pallini = h('span', { class: 'ogl-pallini', 'aria-hidden': 'true' }, Array.from({ length: 10 }, () => h('i')));
    const numStrada = h('span', { class: 'ogl-num lab-mono' });
    const barra = h('span', { class: 'ogl-barra', 'aria-hidden': 'true' }, h('i'));
    const numInt = h('span', { class: 'ogl-num lab-mono' });
    const letture = h('dl', { class: 'ogl-letture' },
      h('div', null, h('dt', null, 'Chip principali sulla scheda'), h('dd', null, numChip, pallini)),
      h('div', null, h('dt', null, 'Strada media dei dati'), h('dd', null, numStrada, barra)),
      h('div', null, h('dt', null, 'Funzioni dentro il processore'), h('dd', null, numInt)));
    const lato = h('div', { class: 'ogl-lato' },
      h('div', { class: 'ogl-tappa' }, h('p', { class: 'ogl-tappa-testa' }, tappaAnno, tappaTit), tappaEs), nota, letture);

    const idCur = ctx.uid('ogl-anno');
    const uscita = h('output', { class: 'ogl-anno lab-mono', for: idCur }, String(anno));
    const cursore = h('input', { class: 'ogl-cursore', type: 'range', id: idCur, min: M.ANNO_MIN, max: M.ANNO_MAX, step: 1, value: anno });
    const tacche = h('span', { class: 'ogl-tacche', 'aria-hidden': 'true' },
      M.TAPPE.map((t) => h('i', { style: 'left:' + n(100 * (t.anno - M.ANNO_MIN) / (M.ANNO_MAX - M.ANNO_MIN)) + '%' })));
    const btnPrec = h('button', { type: 'button', class: 'lab-btn', 'aria-label': 'Tappa precedente' }, h('span', { 'aria-hidden': 'true' }, '◀'), ' Tappa');
    const btnSucc = h('button', { type: 'button', class: 'lab-btn', 'aria-label': 'Tappa successiva' }, 'Tappa ', h('span', { 'aria-hidden': 'true' }, '▶'));
    // l'etichetta cambia (Riproduci / Pausa): niente aria-pressed, che con un'etichetta variabile confonde i lettori di schermo
    const btnGioca = h('button', { type: 'button', class: 'lab-btn primary ogl-gioca' }, 'Riproduci');
    const comandi = h('div', { class: 'ogl-comandi' },
      h('div', { class: 'ogl-anni' },
        h('label', { class: 'spc-sr-only', for: idCur }, 'Anno'),
        uscita,
        h('span', { class: 'ogl-pista-anni' }, cursore, tacche,
          h('span', { class: 'ogl-estremi', 'aria-hidden': 'true' }, h('span', null, String(M.ANNO_MIN)), h('span', null, String(M.ANNO_MAX))))),
      h('div', { class: 'lab-controls ogl-bottoni' }, btnPrec, btnGioca, btnSucc));

    const voci = {};
    const lista = h('ul', { class: 'ogl-dove-lista' }, ['cpu'].concat(LAB_PEZZI, ['npu']).map((id) => {
      const dove = h('span', { class: 'ogl-dove-dove' });
      const strada = h('span', { class: 'ogl-dove-strada lab-mono' });
      const li = h('li', { class: 'ogl-c-' + id }, h('span', { class: 'ogl-dove-pallino', 'aria-hidden': 'true' }),
        h('span', { class: 'ogl-dove-nome' }, M.componente(id).nome), dove, strada);
      voci[id] = { li: li, dove: dove, strada: strada };
      return li;
    }));
    const elenco = h('details', { class: 'ogl-dove' }, h('summary', null, 'Dove sta ogni pezzo, anno per anno'), lista);

    radice.append(h('div', { class: 'ogl-corpo' }, tela, comandi, lato), elenco);

    /* ---- la scheda madre in SVG ---- */
    function costruisci(nome) {
      nomeLayout = nome;
      L = LAB_SCHEDE[nome];
      const idPat = ctx.uid('ogl-punti');
      const svg = s('svg', { class: 'ogl-svg', viewBox: '0 0 ' + L.w + ' ' + L.h, role: 'img', 'aria-label': 'Scheda madre' });
      const fori = [[24, 24], [L.w - 24, 24], [24, L.h - 24], [L.w - 24, L.h - 24]].map((f) => '<circle class="ogl-foro" cx="' + f[0] + '" cy="' + f[1] + '" r="6"/>').join('');
      svg.append(s('g', {
        'aria-hidden': 'true',
        html: '<defs><pattern id="' + idPat + '" width="16" height="16" patternUnits="userSpaceOnUse"><circle class="ogl-punto" cx="8" cy="8" r="1"/></pattern></defs>' +
          rett('ogl-pcb', 4, 4, L.w - 8, L.h - 8, 14) + '<rect x="4" y="4" width="' + (L.w - 8) + '" height="' + (L.h - 8) + '" rx="14" fill="url(#' + idPat + ')"/>' + fori,
      }));
      const gPiste = s('g', { 'aria-hidden': 'true' });
      const gImpulsi = s('g', { class: 'ogl-impulsi', 'aria-hidden': 'true' });
      const gImpronte = s('g', { 'aria-hidden': 'true' });
      const gPkg = s('g', { transform: 'translate(' + L.pkg[0] + ' ' + L.pkg[1] + ') scale(' + L.k + ')', 'aria-hidden': 'true' });
      const gPezzi = s('g', { 'aria-hidden': 'true' });
      const pezzi = {};
      LAB_PEZZI.forEach((id) => {
        const p = L.pezzi[id];
        const pista = s('path', { class: 'ogl-pista ogl-c-' + id, d: labD(p.strada) });
        gPiste.append(pista);
        let impronta = rett('ogl-impronta', p.c[0] - p.w / 2 - 5, p.c[1] - p.h / 2 - 5, p.w + 10, p.h + 10, 6);
        if (p.dita === 'sinistra') impronta += rett('ogl-slot', p.c[0] - p.w / 2 - 11, p.c[1] - p.h / 2 - 7, 10, p.h + 14, 2);
        if (p.dita === 'sopra') impronta += rett('ogl-slot', p.c[0] - p.w / 2 + 2, p.c[1] - p.h / 2 - 11, p.w - 4, 10, 2);
        gImpronte.append(s('g', { html: impronta }));
        const g = s('g', { class: 'ogl-pezzo ogl-c-' + id, html: labAspetto(id, p) });
        gPezzi.append(g);
        const imp = s('g', { class: 'ogl-impulso ogl-c-' + id, html: '<circle r="7" class="ogl-impulso-alone"/><circle r="3"/>' });
        gImpulsi.append(imp);
        pezzi[id] = { g: g, pista: pista, impulso: imp, punti: null, lung: 0, fase: (LAB_PEZZI.indexOf(id) * 131) % 400, vis: { x: p.c[0], y: p.c[1], s: 1, o: 1 } };
      });
      // il package del processore, con il die e i pezzi che vi entrano
      let pad = '';
      for (let i = -70; i <= 70; i += 10) pad += 'M' + i + ' -63h3v3h-3z M' + i + ' 60h3v3h-3z';
      for (let i = -58; i <= 58; i += 10) pad += 'M-75 ' + i + 'h3v3h-3z M72 ' + i + 'h3v3h-3z';
      gPkg.append(s('g', { html: rett('ogl-pkg', -78, -66, 156, 132, 8) + '<path class="ogl-pkg-pad" d="' + pad + '"/>' }));
      const die = s('rect', { class: 'ogl-die', rx: 4 });
      gPkg.append(die);
      const tiles = {};
      LAB_TILE.forEach((id) => {
        const g = s('g', { class: 'ogl-tile ogl-c-' + id, opacity: 0 });
        const t = { g: g, alone: s('rect', { class: 'ogl-alone', rx: 5 }), r: s('rect', { class: 'ogl-tile-r', rx: 3 }), testo: s('text', { class: 'ogl-tile-t', 'font-size': 13 }, M.componente(id).sigla), vis: { x: 0, y: 0, w: 0, h: 0, o: 0, k: 1 } };
        g.append(t.alone, t.r);
        if (id === 'ram') { t.r2 = s('rect', { class: 'ogl-tile-r', rx: 3 }); t.testo2 = s('text', { class: 'ogl-tile-t', 'font-size': 13 }, 'RAM'); g.append(t.r2, t.testo2); }
        g.append(t.testo);
        if (id === 'sud') { t.punti = LAB_ASSORBITI.map((a) => s('rect', { class: 'ogl-assorbito ogl-c-' + a, width: 5, height: 5, rx: 1, opacity: 0 })); g.append(...t.punti); }
        gPkg.append(g);
        tiles[id] = t;
      });
      const etichetta = s('text', { class: 'ogl-etichetta ogl-etichetta-cpu', x: L.etichetta[0], y: L.etichetta[1], 'aria-hidden': 'true' }, 'Processore');
      svg.append(gPiste, gImpulsi, gImpronte, gPkg, etichetta, gPezzi);
      tela.replaceChildren(svg);
      refs = { svg: svg, pezzi: pezzi, tiles: tiles, die: die, dieVis: { x: -48, y: -48, w: 96, h: 96 }, gPezzi: gPezzi };
      animi.clear();
    }

    /* ---- disegno di un singolo elemento ---- */
    function disegnaPezzo(id) {
      const P = refs.pezzi[id], v = P.vis;
      P.g.setAttribute('transform', 'translate(' + n(v.x) + ' ' + n(v.y) + ') scale(' + v.s.toFixed(3) + ')');
      P.g.setAttribute('opacity', v.o.toFixed(3));
      P.g.style.visibility = v.o < 0.01 ? 'hidden' : '';
    }
    function disegnaDie() {
      const v = refs.dieVis;
      refs.die.setAttribute('x', n(v.x)); refs.die.setAttribute('y', n(v.y));
      refs.die.setAttribute('width', n(v.w)); refs.die.setAttribute('height', n(v.h));
    }
    function poni(el, x, y, w, hh) {
      el.setAttribute('x', n(x)); el.setAttribute('y', n(y));
      el.setAttribute('width', n(Math.max(0, w))); el.setAttribute('height', n(Math.max(0, hh)));
    }
    function disegnaTile(id) {
      const T = refs.tiles[id], v = T.vis;
      const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
      T.g.setAttribute('opacity', v.o.toFixed(3));
      T.g.style.visibility = v.o < 0.01 ? 'hidden' : '';
      T.g.setAttribute('transform', Math.abs(v.k - 1) < 0.001 ? '' : 'translate(' + n(cx) + ' ' + n(cy) + ') scale(' + v.k.toFixed(3) + ') translate(' + n(-cx) + ' ' + n(-cy) + ')');
      poni(T.alone, v.x - 3, v.y - 3, v.w + 6, v.h + 6);
      if (T.r2) {
        const hh = (v.h - 4) / 2;
        poni(T.r, v.x, v.y, v.w, hh); poni(T.r2, v.x, v.y + hh + 4, v.w, hh);
        T.testo.setAttribute('x', n(cx)); T.testo.setAttribute('y', n(v.y + hh / 2 + 4.5));
        T.testo2.setAttribute('x', n(cx)); T.testo2.setAttribute('y', n(v.y + hh * 1.5 + 8.5));
        return;
      }
      poni(T.r, v.x, v.y, v.w, v.h);
      const grande = id === 'cpu' && v.w > 60 && v.h > 50;
      T.testo.setAttribute('font-size', grande ? 18 : 13);
      T.testo.setAttribute('x', n(cx));
      T.testo.setAttribute('y', n(cy + (grande ? 6 : 4.5) - (T.punti ? 3 : 0)));
      if (T.punti) T.punti.forEach((r, i) => { r.setAttribute('x', n(cx - 9.5 + i * 7)); r.setAttribute('y', n(cy + 4)); });
    }

    function centroTile(geo, id) {
      const t = geo.tile[id];
      return [L.pkg[0] + L.k * (t.x + t.w / 2), L.pkg[1] + L.k * (t.y + t.h / 2)];
    }
    // Dove deve stare (e quanto grande) il disegno di un pezzo sulla scheda in un certo stato.
    function bersaglio(st, geo, id) {
      const dove = st.posizioni[id], p = L.pezzi[id];
      if (dove === 'scheda') return { x: p.c[0], y: p.c[1], s: 1, o: 1 };
      if (dove === 'sud') {
        const c = st.posizioni.sud === 'scheda' ? L.pezzi.sud.c : centroTile(geo, 'sud');
        return { x: c[0], y: c[1], s: 0.22, o: 0 };
      }
      if ((dove === 'package' || dove === 'die') && geo.tile[id]) {
        const t = geo.tile[id], c = centroTile(geo, id);
        return { x: c[0], y: c[1], s: Math.min(t.w * L.k / p.w, t.h * L.k / p.h), o: 0 };
      }
      return { x: p.c[0], y: p.c[1], s: 1, o: 0 };
    }
    // Pista completa dal processore a un pezzo, passando dai ponti.
    function catena(id) {
      let pt = L.pezzi[id].strada.slice();
      let via = M.componente(id).via;
      while (via && via !== 'cpu') { pt = pt.concat(L.pezzi[via].strada.slice(1)); via = M.componente(via).via; }
      return pt.reverse();
    }

    function nomeMinuscolo(id) {
      const b = M.componente(id).breve;
      return /^[A-Z]{2,}/.test(b) ? b : b.charAt(0).toLowerCase() + b.slice(1);
    }
    function riassunto(st) {
      const elenca = (ids) => ids.map(nomeMinuscolo).join(', ');
      const fuori = st.separati.filter((id) => id !== 'cpu');
      return 'Scheda madre nel ' + st.anno + ': ' + (st.pezziScheda === 1 ? 'sulla scheda resta solo il processore' :
        st.pezziScheda + ' pezzi principali sulla scheda, il processore e ' + elenca(fuori)) +
        (st.integrati.length ? '. Dentro il processore: ' + elenca(st.integrati) : '') + '.';
    }
    function doveTesto(st, id) {
      if (id === 'cpu') return 'il punto di partenza dei dati';
      const p = st.posizioni[id];
      if (p === 'assente') return 'non esiste ancora';
      if (p === 'scheda') return 'sulla scheda madre';
      if (p === 'package') return 'nel package del processore';
      if (p === 'die') return 'sul die del processore';
      const nome = st.nomeSud === 'PCH' ? 'dentro il PCH' : 'dentro il ponte sud';
      const e = st.effettive[id];
      return e === 'die' ? 'nella parte I/O del die' : e === 'package' ? nome + ', nel package' : nome;
    }
    function cm(v) { return v == null ? '–' : ctx.formato(v, v < 10 && v % 1 ? 1 : 0) + ' cm'; }

    function contaA(el, a, dec, suffisso) {
      const da = Number(el.dataset.v || 0);
      el.dataset.v = a;
      anima('num-' + (el.dataset.k || (el.dataset.k = ctx.uid('k'))), D.slow, 0, 'smooth', (e) => {
        el.textContent = ctx.formato(da + (a - da) * e, dec) + (suffisso || '');
      });
    }

    /* ---- applica uno stato del modello: è il cuore del laboratorio ---- */
    function applica(nuovo, animato) {
      const vecchio = stato;
      stato = nuovo;
      const anim = !!(animato && vecchio && !rid);
      const geo = labGeometria(nuovo.posizioni);
      const geoV = vecchio ? labGeometria(vecchio.posizioni) : geo;

      // il die si sposta per fare posto ai pezzi di silicio separati
      const dv = refs.dieVis, dDa = Object.assign({}, dv);
      anima('die', anim ? D.slow : 0, 0, 'smooth', (e) => {
        dv.x = ctx.lerp(dDa.x, geo.die.x, e); dv.y = ctx.lerp(dDa.y, geo.die.y, e);
        dv.w = ctx.lerp(dDa.w, geo.die.w, e); dv.h = ctx.lerp(dDa.h, geo.die.h, e);
        disegnaDie();
      });

      // i blocchi dentro il package
      LAB_TILE.forEach((id) => {
        const T = refs.tiles[id], v = T.vis, t = geo.tile[id];
        const prima = !!(vecchio && geoV.tile[id]);
        if (t && prima && anim) {
          const da = { x: v.x, y: v.y, w: v.w, h: v.h };
          anima('tg-' + id, D.slow, 0, 'smooth', (e) => {
            v.x = ctx.lerp(da.x, t.x, e); v.y = ctx.lerp(da.y, t.y, e); v.w = ctx.lerp(da.w, t.w, e); v.h = ctx.lerp(da.h, t.h, e);
            disegnaTile(id);
          });
        } else if (t && anim) {
          // arriva: compare dove atterra il pezzo che vola dalla scheda
          animi.delete('tg-' + id);
          Object.assign(v, { x: t.x, y: t.y, w: t.w, h: t.h, o: 0, k: 0.55 });
          disegnaTile(id);
          anima('to-' + id, D.normal + 150, id === 'npu' ? D.normal : D.crawl * 0.55, 'bounce', (e, p) => {
            v.o = Math.min(1, p * 1.8); v.k = ctx.lerp(0.55, 1, e); disegnaTile(id);
          });
        } else if (t) {
          animi.delete('tg-' + id); animi.delete('to-' + id);
          Object.assign(v, { x: t.x, y: t.y, w: t.w, h: t.h, o: 1, k: 1 });
          disegnaTile(id);
        } else if (v.o > 0) {
          const o0 = v.o;
          anima('to-' + id, anim ? D.fast + 60 : 0, 0, 'sharp', (e) => { v.o = ctx.lerp(o0, 0, e); v.k = 1; disegnaTile(id); });
        }
      });

      // i pezzi sulla scheda: volano verso il processore (o dentro il ponte sud) e tornano indietro
      LAB_PEZZI.forEach((id) => {
        const P = refs.pezzi[id], v = P.vis, b = bersaglio(nuovo, geo, id);
        const eraSu = !vecchio || vecchio.posizioni[id] === 'scheda';
        const oraSu = nuovo.posizioni[id] === 'scheda';
        if (!anim) { animi.delete('bg-' + id); Object.assign(v, b); disegnaPezzo(id); return; }
        if (eraSu && !oraSu) {
          const da = Object.assign({}, v);
          refs.gPezzi.appendChild(P.g);   // in cima: vola sopra gli altri pezzi
          anima('bg-' + id, D.crawl, 0, 'smooth', (e, p) => {
            v.x = ctx.lerp(da.x, b.x, e); v.y = ctx.lerp(da.y, b.y, e); v.s = ctx.lerp(da.s, b.s, e);
            v.o = da.o * (1 - ctx.clamp((p - 0.5) / 0.45, 0, 1));
            disegnaPezzo(id);
          });
        } else if (!eraSu && oraSu) {
          const da = Object.assign({}, v);
          anima('bg-' + id, D.crawl * 0.85, 0, 'smooth', (e, p) => {
            v.x = ctx.lerp(da.x, b.x, e); v.y = ctx.lerp(da.y, b.y, e); v.s = ctx.lerp(da.s, b.s, e);
            v.o = ctx.lerp(da.o, 1, ctx.clamp(p / 0.35, 0, 1));
            disegnaPezzo(id);
          });
        } else if (!oraSu && !animi.has('bg-' + id)) { Object.assign(v, b); disegnaPezzo(id); }
      });

      // audio, rete e modem dentro il ponte sud: tre quadratini colorati
      const sudG = refs.pezzi.sud.g;
      LAB_ASSORBITI.forEach((a, i) => {
        const dentro = nuovo.posizioni[a] === 'sud';
        const era = !!(vecchio && vecchio.posizioni[a] === 'sud');
        const els = [sudG.querySelectorAll('.ogl-assorbito')[i], refs.tiles.sud.punti[i]];
        if (dentro && !era && anim) {
          els.forEach((el) => el.setAttribute('opacity', 0));
          anima('ass-' + a, D.normal, D.crawl * 0.8, 'smooth', (e) => els.forEach((el) => el.setAttribute('opacity', e.toFixed(3))));
        } else { animi.delete('ass-' + a); els.forEach((el) => el.setAttribute('opacity', dentro ? 1 : 0)); }
      });
      sudG.querySelector('.ogl-sigla').textContent = nuovo.nomeSud === 'PCH' ? 'PCH' : 'Sud';
      refs.tiles.sud.testo.textContent = nuovo.posizioni.sud === 'package' ? 'PCH' : 'I/O';

      // piste: accese quelle che portano a un pezzo rimasto sulla scheda
      const usate = new Set();
      LAB_PEZZI.forEach((id) => {
        if (nuovo.posizioni[id] !== 'scheda') return;
        for (let x = id; x && x !== 'cpu'; x = M.componente(x).via) usate.add(x);
      });
      LAB_PEZZI.forEach((id) => {
        const P = refs.pezzi[id];
        const su = nuovo.posizioni[id] === 'scheda';
        P.pista.classList.toggle('on', su);
        P.pista.classList.toggle('via', !su && usate.has(id));
        P.punti = su ? catena(id) : null;
        P.lung = su ? labLunghezza(P.punti) : 0;
        if (su) posaImpulso(P, performance.now() / 1000);
        P.impulso.style.display = su && attivo && !rid ? '' : 'none';
      });

      // letture
      contaA(numChip, nuovo.pezziScheda, 0);
      [...pallini.children].forEach((p, i) => p.classList.toggle('on', i < nuovo.pezziScheda));
      contaA(numStrada, nuovo.stradaMedia, 1, ' cm');
      barra.firstChild.style.transform = 'scaleX(' + (nuovo.stradaMedia / maxStrada).toFixed(4) + ')';
      contaA(numInt, nuovo.integrati.length, 0);
      refs.svg.setAttribute('aria-label', riassunto(nuovo));

      // elenco dei pezzi
      ['cpu'].concat(LAB_PEZZI, ['npu']).forEach((id) => {
        const vv = voci[id];
        const dove = doveTesto(nuovo, id);
        const strada = id === 'cpu' ? cm(0) : id === 'npu' ? (nuovo.posizioni.npu === 'die' ? cm(M.STRADA_DIE) : '–') : cm(nuovo.strade[id]);
        if (vv.dove.textContent !== dove) {
          vv.dove.textContent = dove;
          if (vecchio && !rid) { vv.li.classList.remove('lab-flash'); void vv.li.offsetWidth; vv.li.classList.add('lab-flash'); }
        }
        vv.strada.textContent = strada;
        vv.li.classList.toggle('dentro', /package|die|I\/O/.test(dove) || (id !== 'cpu' && nuovo.integrati.includes(id)));
      });

      // la tappa: titolo, esempio, spiegazione, pezzi da guardare
      if (!vecchio || vecchio.tappa.id !== nuovo.tappa.id) {
        const tp = nuovo.tappa;
        tappaAnno.textContent = String(tp.anno);
        tappaTit.textContent = tp.titolo;
        tappaEs.textContent = 'Esempio: ' + tp.esempio;
        ctx.annuncia(nota, tp.testo);
        if (vecchio) evidenzia(tp.evidenzia, anim ? D.crawl : 0);
      }
    }

    function evidenzia(ids, ritardo) {
      if (rid) return;
      dopo(ritardo + 60, () => ids.forEach((id) => {
        const dove = stato.posizioni[id];
        let el = null;
        if (dove === 'scheda' && refs.pezzi[id]) el = refs.pezzi[id].g;
        else if (refs.tiles[id] && (dove === 'die' || dove === 'package' || id === 'cpu')) el = refs.tiles[id].g;
        else if (dove === 'sud') el = stato.posizioni.sud === 'scheda' ? refs.pezzi.sud.g : refs.tiles.sud.g;
        if (!el) return;
        el.classList.remove('ogl-acceso'); void el.getBoundingClientRect(); el.classList.add('ogl-acceso');
        dopo(1900, () => el.classList.remove('ogl-acceso'));
      }));
    }

    /* ---- impulsi di dati che viaggiano sulle piste (solo con il laboratorio in vista) ---- */
    // Ogni impulso va dal processore al pezzo e torna indietro: più lunga la pista, più lungo il viaggio.
    function posaImpulso(P, sec) {
      const giro = 2 * P.lung + 60;
      let d = (sec * LAB_VELOCITA + P.fase) % giro;
      d = d <= P.lung ? d : d <= P.lung + 30 ? P.lung : Math.max(0, 2 * P.lung + 30 - d);
      const q = labPunto(P.punti, d);
      P.impulso.setAttribute('transform', 'translate(' + n(q[0]) + ' ' + n(q[1]) + ')');
    }
    const ciclo = ctx.loop((dt, t) => {
      if (!refs) return;
      LAB_PEZZI.forEach((id) => { const P = refs.pezzi[id]; if (P.punti) posaImpulso(P, t / 1000); });
    });
    function mostraImpulsi() {
      if (!refs) return;
      LAB_PEZZI.forEach((id) => { refs.pezzi[id].impulso.style.display = refs.pezzi[id].punti && attivo && !rid ? '' : 'none'; });
    }

    /* ---- comandi ---- */
    function vaiA(a, animato) {
      anno = M.limitaAnno(a);
      cursore.value = String(anno);
      uscita.textContent = String(anno);
      const nuovo = M.statoAnno(anno);
      cursore.setAttribute('aria-valuetext', anno + ': ' + nuovo.tappa.titolo);
      if (!stato || nuovo.tappa.id !== stato.tappa.id || nuovo.nomeSud !== stato.nomeSud) applica(nuovo, animato);
      btnPrec.disabled = !M.tappaPrecedente(anno);
      btnSucc.disabled = !M.tappaSuccessiva(anno);
    }
    function ferma() {
      if (gioco) { clearTimeout(gioco); timer.delete(gioco); gioco = 0; }
      btnGioca.classList.remove('ogl-in-corso');
      btnGioca.textContent = 'Riproduci';
    }
    function suona() {
      if (gioco) { ferma(); return; }
      if (anno >= M.ANNO_MAX) vaiA(M.ANNO_MIN, true);
      btnGioca.classList.add('ogl-in-corso');
      btnGioca.textContent = 'Pausa';
      const passo = () => {
        const t = M.tappaSuccessiva(anno);
        if (!t) { ferma(); return; }
        vaiA(t.anno, true);
        if (!M.tappaSuccessiva(anno)) { ferma(); return; }
        gioco = dopo(rid ? 4200 : 3600, passo);
      };
      gioco = dopo(anno === M.ANNO_MIN ? 700 : 250, passo);
    }
    cursore.addEventListener('input', () => { ferma(); vaiA(Number(cursore.value), true); });
    btnPrec.addEventListener('click', () => { ferma(); const t = M.tappaPrecedente(anno); if (t) vaiA(t.anno, true); });
    btnSucc.addEventListener('click', () => { ferma(); const t = M.tappaSuccessiva(anno); if (t) vaiA(t.anno, true); });
    btnGioca.addEventListener('click', suona);

    /* ---- impaginazione: larga o stretta secondo lo spazio ---- */
    function ricostruisci(nome) {
      costruisci(nome);
      const st = stato || M.statoAnno(anno);
      stato = null;
      applica(st, false);
      mostraImpulsi();
    }
    // sotto i 540 px la scheda larga scenderebbe sotto gli 11 px di testo: si passa a quella verticale
    const scegli = (w) => (w > 0 && w < 540 ? 'stretto' : 'largo');
    ricostruisci(scegli(tela.clientWidth));
    vaiA(anno, false);
    let ro = null;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver((e) => {
        const w = e[0].contentRect.width;
        if (w && scegli(w) !== nomeLayout) ricostruisci(scegli(w));
      });
      ro.observe(tela);
    }

    return {
      attiva() { attivo = true; mostraImpulsi(); if (!rid) ciclo.start(); },
      sospendi() { attivo = false; ciclo.stop(); ferma(); mostraImpulsi(); },
      distruggi() {
        attivo = false; ciclo.stop(); ferma();
        timer.forEach((t) => clearTimeout(t)); timer.clear();
        if (raf) cancelAnimationFrame(raf);
        animi.clear();
        if (ro) ro.disconnect();
      },
    };
  }

  /* ---------- seconda scheda: in valigia o in tasca ---------- */

  const LAB_ICONE = {
    osborne: '<svg viewBox="0 0 56 40"><path class="ogl-ic-maniglia" d="M20 9V5h16v4"/><rect class="ogl-ic-beige" x="4" y="9" width="48" height="27" rx="3"/><rect class="ogl-ic-beige2" x="8" y="13" width="40" height="19" rx="2"/><path class="ogl-ic-riga" d="M12 18h32M12 23h32M12 28h22"/></svg>',
    air: '<svg viewBox="0 0 56 40"><path class="ogl-ic-al" d="M6 27L50 27L47 31L9 31Z"/><path class="ogl-ic-al2" d="M11 8h34v19H11z"/><rect class="ogl-ic-schermo" x="14" y="11" width="28" height="14" rx="1"/></svg>',
    telefono: '<svg viewBox="0 0 56 40"><rect class="ogl-ic-scuro" x="19" y="3" width="18" height="34" rx="4"/><rect class="ogl-ic-schermo" x="21" y="6" width="14" height="28" rx="2"/><rect class="ogl-ic-app" x="23" y="9" width="4" height="4" rx="1"/><rect class="ogl-ic-app b" x="29" y="9" width="4" height="4" rx="1"/><rect class="ogl-ic-app c" x="23" y="15" width="4" height="4" rx="1"/></svg>',
  };

  const LAB_TACCHE = {
    massa: [[0, '0'], [5, '5 kg'], [10, '10 kg']],
    spessore: [[0, '0'], [10, '10 cm'], [20, '20 cm']],
    autonomia: [[0, '0'], [8, '8 ore'], [16, '16 ore'], [24, '24 ore']],
    transistor: [[1e3, 'mille'], [1e6, '1 milione'], [1e9, '1 miliardo']],
  };

  function labValore(m, v, f) {
    if (m.id === 'massa') return v >= 1 ? f(v, v < 10 ? 2 : 1) + ' kg' : f(v * 1000, 0) + ' g';
    if (m.id === 'spessore') return v >= 1 ? f(v, v < 10 ? 2 : 1) + ' cm' : f(v * 10, 2) + ' mm';
    if (m.id === 'autonomia') return f(v, 0) + ' ore';
    if (v >= 1e9) return f(v / 1e9, 0) + ' miliardi';
    if (v >= 1e6) return f(v / 1e6, 0) + ' milioni';
    return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');   // 8.500, con il punto anche sotto le 10.000
  }

  function labValigia(radice, ctx) {
    const { h } = ctx;
    const f = ctx.formato;
    let metrica = 'massa', primaVolta = true;
    const bottoni = M.METRICHE.map((m) => h('button', { type: 'button', 'aria-pressed': String(m.id === metrica), onclick: () => scegli(m.id) }, m.nome));
    const righe = M.PORTATILI.map((p) => {
      const r = {
        valore: h('span', { class: 'ogl-valore lab-mono' }),
        riempi: h('i'),
        dettaglio: h('span', { class: 'ogl-dettaglio' }),
      };
      r.el = h('div', { class: 'ogl-riga ogl-d-' + p.id },
        h('span', { class: 'ogl-icona', 'aria-hidden': 'true', html: LAB_ICONE[p.id] }),
        h('div', { class: 'ogl-riga-corpo' },
          h('p', { class: 'ogl-riga-testa' }, h('strong', null, p.nome), h('span', { class: 'ogl-riga-anno lab-mono' }, String(p.anno)), r.valore),
          h('span', { class: 'ogl-traccia', 'aria-hidden': 'true' }, r.riempi),
          r.dettaglio));
      return r;
    });
    const asse = h('div', { class: 'ogl-asse', 'aria-hidden': 'true' });
    const fNum = h('p', { class: 'ogl-fattore-num lab-mono' });
    const fTxt = h('p', { class: 'ogl-fattore-txt' });
    const pitto = h('div', { class: 'ogl-pitto', 'aria-hidden': 'true' });
    const nota = h('p', { class: 'lab-note', 'aria-live': 'polite' });
    radice.append(
      h('div', { class: 'lab-seg ogl-metriche', role: 'group', 'aria-label': 'Che cosa confrontare' }, bottoni),
      h('div', { class: 'ogl-val-corpo' },
        h('div', { class: 'ogl-righe' }, righe.map((r) => r.el), asse),
        h('div', { class: 'ogl-val-lato' }, h('div', { class: 'ogl-fattore' }, fNum, fTxt), pitto)),
      nota);

    function fattore(m) {
      const r = (a, b) => M.rapporto(a, b, m.id);
      if (m.id === 'massa') {
        fNum.textContent = f(Math.round(r('osborne', 'telefono')), 0) + '×';
        fTxt.textContent = 'Un Osborne 1 pesa quanto ' + f(Math.round(r('osborne', 'telefono')), 0) + ' iPhone 15 Pro, o quanto ' + f(Math.round(r('osborne', 'air')), 0) + ' MacBook Air del 2008.';
      } else if (m.id === 'spessore') {
        fNum.textContent = f(Math.round(r('osborne', 'telefono')), 0) + '×';
        fTxt.textContent = 'Una pila di ' + f(Math.round(r('osborne', 'telefono')), 0) + ' telefoni è alta quanto un Osborne 1 chiuso. Il MacBook Air, nel punto più spesso, vale poco più di due telefoni.';
      } else if (m.id === 'autonomia') {
        fNum.textContent = f(M.PORTATILI[2].autonomiaOre, 0) + ' ore';
        fTxt.textContent = 'Quasi un giorno intero di video per il telefono, 5 ore di lavoro senza fili per il MacBook Air. L\'Osborne 1 viveva attaccato alla presa: un pacco di batterie venduto a parte dava circa un\'ora.';
      } else {
        fNum.textContent = f(r('telefono', 'osborne') / 1e6, 1) + ' milioni×';
        fTxt.textContent = 'Per ogni transistor dello Z80 dell\'Osborne 1, l\'A17 Pro dell\'iPhone ne ha più di due milioni. Il Core 2 Duo del MacBook Air ne aveva già circa ' + f(Math.round(r('air', 'osborne') / 1000) * 1000, 0) + ' volte tanti.';
      }
    }

    function disegnaPitto(m) {
      let o = '';
      if (m.id === 'massa') {
        const quanti = Math.round(M.rapporto('osborne', 'telefono', 'massa'));
        o = '<svg viewBox="0 0 320 112" class="ogl-pitto-svg">' + LAB_ICONE.osborne.replace('<svg viewBox="0 0 56 40">', '<g transform="translate(0 30) scale(1.25)">').replace('</svg>', '</g>') +
          '<text class="ogl-pitto-t" x="38" y="100">1 Osborne 1</text><text class="ogl-pitto-uguale" x="84" y="66">=</text>';
        for (let i = 0; i < quanti; i++) {
          const c = i % 15, r = Math.floor(i / 15);
          o += '<rect class="ogl-pitto-tel" style="--i:' + i + '" x="' + (104 + c * 14) + '" y="' + (12 + r * 21) + '" width="9" height="16" rx="2"/>';
        }
        o += '<text class="ogl-pitto-t" x="205" y="106">' + quanti + ' iPhone 15 Pro</text></svg>';
      } else if (m.id === 'spessore') {
        const K = 3.6, base = 90;
        const os = M.PORTATILI[0], tel = M.PORTATILI[2];
        const hO = os.spessoreCm * K, hT = tel.spessoreCm * K, quanti = Math.round(os.spessoreCm / tel.spessoreCm);
        o = '<svg viewBox="0 0 320 112" class="ogl-pitto-svg">' +
          '<path class="ogl-pitto-base" d="M4 ' + base + 'H316"/>' +
          rett('ogl-ic-beige', 8, base - hO, 33 * K, hO, 3) + '<path class="ogl-ic-maniglia" d="M' + n(8 + 33 * K * 0.35) + ' ' + n(base - hO) + 'v-6h' + n(33 * K * 0.3) + 'v6"/>' +
          '<path class="ogl-ic-al" d="M140 ' + base + 'L' + n(140 + 22.7 * K) + ' ' + base + 'L' + n(140 + 22.7 * K) + ' ' + n(base - 1.94 * K) + 'L140 ' + n(base - 0.4 * K) + 'Z"/>';
        for (let i = 0; i < quanti; i++) o += '<rect class="ogl-pitto-pila" style="--i:' + i + '" x="244" y="' + n(base - (i + 1) * hT) + '" width="' + n(14.66 * K) + '" height="' + n(hT - 0.7) + '" rx="1"/>';
        o += '<text class="ogl-pitto-t" x="67" y="106">Osborne 1</text><text class="ogl-pitto-t" x="181" y="106">MacBook Air</text><text class="ogl-pitto-t" x="270" y="106">' + quanti + ' telefoni</text></svg>';
      }
      pitto.hidden = !o;
      pitto.innerHTML = o;
    }

    function disegnaAsse(m) {
      // le scritte agli estremi si allineano al bordo, le altre si centrano sulla tacca
      asse.replaceChildren(...LAB_TACCHE[m.id].map((t) => {
        const fr = M.frazione(m, t[0]);
        return h('span', { class: fr < 0.02 ? 'primo' : fr > 0.98 ? 'ultimo' : '', style: 'left:' + n(100 * fr) + '%' }, t[1]);
      }));
    }

    function scegli(id) {
      metrica = id;
      const m = M.metrica(id);
      bottoni.forEach((b, i) => b.setAttribute('aria-pressed', String(M.METRICHE[i].id === id)));
      M.confronto(id).forEach((d, i) => {
        const r = righe[i];
        r.riempi.style.transform = 'scaleX(' + (d.valore > 0 ? Math.max(0.015, d.frazione) : 0).toFixed(4) + ')';
        r.valore.textContent = labValore(m, d.valore, f);
        r.dettaglio.textContent = d.dettaglio;
        r.el.classList.toggle('zero', !(d.valore > 0));
      });
      disegnaAsse(m);
      fattore(m);
      disegnaPitto(m);
      ctx.annuncia(nota, m.spiega);
    }

    return {
      mostra() {
        if (primaVolta) {
          primaVolta = false;
          righe.forEach((r) => { r.riempi.style.transform = 'scaleX(0)'; });
          void radice.offsetWidth;
          requestAnimationFrame(() => scegli(metrica));
        }
      },
      sospendi() {},
      distruggi() {},
    };
  }

  function creaLab(el, ctx) {
    const { h } = ctx;
    const idInt = ctx.uid('ogl-int'), idVal = ctx.uid('ogl-val');
    const btnInt = h('button', { type: 'button', 'aria-pressed': 'true', 'aria-controls': idInt }, 'Un solo chip');
    const btnVal = h('button', { type: 'button', 'aria-pressed': 'false', 'aria-controls': idVal }, 'In valigia o in tasca');
    const panInt = h('div', { class: 'ogl-pan', id: idInt });
    const panVal = h('div', { class: 'ogl-pan', id: idVal, hidden: true });
    el.append(h('div', { class: 'ogl' }, h('div', { class: 'lab-seg ogl-schede', role: 'group', 'aria-label': 'Scegli l\'esperimento' }, btnInt, btnVal), panInt, panVal));
    const integ = labIntegrazione(panInt, ctx);
    const valig = labValigia(panVal, ctx);
    let scheda = 'int', visibile = false;
    function scegli(q) {
      if (q === scheda) return;
      scheda = q;
      btnInt.setAttribute('aria-pressed', String(q === 'int'));
      btnVal.setAttribute('aria-pressed', String(q === 'val'));
      panInt.hidden = q !== 'int';
      panVal.hidden = q !== 'val';
      if (q === 'int') { if (visibile) integ.attiva(); } else { integ.sospendi(); valig.mostra(); }
    }
    btnInt.addEventListener('click', () => scegli('int'));
    btnVal.addEventListener('click', () => scegli('val'));
    return {
      attiva() { visibile = true; if (scheda === 'int') integ.attiva(); },
      sospendi() { visibile = false; integ.sospendi(); valig.sospendi(); },
      distruggi() { integ.distruggi(); valig.distruggi(); },
    };
  }

  /* =====================================================================
   * Capitolo
   * ===================================================================== */

  P.registra({
    numero: 10,
    id: 'oggi',
    titolo: 'Portatili, ARM e chip unico: il PC di oggi',
    breve: 'Il PC di oggi',
    periodo: '1981–oggi',
    colore: 'var(--era-10)',
    sommario: 'Dall\'Osborne 1 da 11 kg allo smartphone: i portatili, i processori ARM, il chip unico che ha inghiottito la scheda madre, l\'efficienza come nuova misura e Arduino, nato a Ivrea.',
    intro: 'Nel 1981 un computer «portatile» pesava 11 chili e si portava come una valigia. Oggi un telefono da meno di 200 grammi ha nel processore oltre due milioni di volte i transistor di quello dell\'Osborne 1. In mezzo ci sono quarant\'anni di portatili, batterie e schermi piatti, i processori ARM nati per consumare poco e un lungo lavoro di integrazione che ha portato quasi tutta la scheda madre dentro un solo chip. È anche la storia di un cambio di misura: la domanda non è più soltanto «quanto è veloce?», ma «quanto lavoro fa con ogni watt?».',
    blocchi: [
      {
        tipo: 'testo',
        titolo: 'Il computer con la maniglia (1981–1985)',
        paragrafi: [
          'Il primo portatile di successo arriva nell\'aprile del 1981. L\'<strong>Osborne 1</strong>, voluto dall\'editore Adam Osborne e progettato da Lee Felsenstein, è una valigia di plastica di 52 × 23 × 33 centimetri che pesa 11,1 chili. La tastiera fa da coperchio; dentro ci sono uno schermo a tubo catodico da 5 pollici (52 colonne per 24 righe), due unità per dischetti, un processore Z80 a 4 MHz e 64 KB di memoria. Non ha una batteria interna: si porta da una presa all\'altra (un pacco esterno, venduto a parte, dava circa un\'ora di autonomia).',
          'Il colpo di genio è il prezzo: 1.795 dollari, con un pacchetto di programmi incluso, fra cui il sistema operativo CP/M, il programma di scrittura WordStar e il foglio di calcolo SuperCalc. Un computer completo, programmi compresi, sta in una valigia che entra sotto il sedile di un aereo. Il successo è immediato, ma nel settembre 1983 l\'azienda fallisce. Si racconta spesso che l\'abbia affondata l\'annuncio troppo anticipato dei modelli nuovi, che bloccò le vendite di quello in commercio (il cosiddetto «effetto Osborne»); in realtà pesarono anche una gestione disordinata, la concorrenza del Kaypro II, con uno schermo molto più grande, e l\'avanzata dei computer compatibili con il <a href="#ibm-pc">PC IBM</a>.',
          'Nello stesso anno si vede anche l\'altra strada. L\'<strong>Epson HX-20</strong>, presentato nel novembre 1981 e venduto dal 1982, pesa circa 1,6 chili e va a batterie ricaricabili: ha uno schermo a cristalli liquidi di quattro righe da venti caratteri, una piccola stampante e, a richiesta, un registratore a microcassette. Anche Olivetti ha il suo portatile a pile, l\'<strong>M10</strong> del 1983, progettato dalla giapponese Kyocera come il TRS-80 Model 100 della Tandy: meno di 2 chili, uno schermo inclinabile di 8 righe da 40 caratteri e una ventina di ore di autonomia con quattro pile stilo.',
          'Il <strong>GRiD Compass</strong> (1982), disegnato da Bill Moggridge, introduce la forma a conchiglia (<em>clamshell</em>): lo schermo si ripiega sulla tastiera, come in tutti i portatili di oggi. È in lega di magnesio, pesa circa 5 chili e costa più di 8.000 dollari; lo comprano soprattutto i militari e la NASA, che lo porta sullo Space Shuttle. Il <strong>Compaq Portable</strong> (in vendita dal 1983, circa 13 chili) ha successo perché fa funzionare quasi tutti i programmi del PC IBM. Nel 1985 il <strong>Toshiba T1100</strong> mette insieme le due idee: compatibile con il PC IBM, 4,1 chili, schermo a cristalli liquidi da 80 colonne per 25 righe, dischetti da 3,5 pollici e una batteria da circa otto ore. Toshiba lo presenta come il primo portatile per il grande pubblico.',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraInScala,
        alt: 'Disegno in scala di tre computer chiusi, posati sulla stessa linea: a sinistra l\'Osborne 1 del 1981, una valigia beige larga 52 centimetri e alta 23 con la maniglia in cima; al centro un portatile sottile del 2008, una lastra di alluminio spessa meno di 2 centimetri; a destra uno smartphone del 2023 in piedi, alto meno di 15 centimetri.',
        didascalia: '<strong>Dalla valigia alla tasca, in scala.</strong> L\'Osborne 1 (1981, 11,1 kg), un MacBook Air (2008, 1,36 kg, al massimo 1,94 cm di spessore) e uno smartphone (2023, 187 g, 8,25 mm). Il righello ha una tacca ogni 10 centimetri. Disegno schematico.',
        larga: true,
      },
      {
        tipo: 'testo',
        titolo: 'Il portatile prende la forma di oggi (1991–2011)',
        paragrafi: [
          'Negli anni Novanta il portatile diventa il <em>notebook</em> che conosciamo. Nell\'ottobre 1991 i primi <strong>PowerBook</strong> di Apple spostano la tastiera verso lo schermo e lasciano davanti un poggiapolsi con la trackball al centro: è la disposizione che hanno ancora quasi tutti i portatili. Nell\'ottobre 1992 l\'<strong>IBM ThinkPad 700C</strong> porta uno schermo a colori a matrice attiva (TFT, <em>thin-film transistor</em>) da 10,4 pollici, il più grande dell\'epoca su un portatile, e il <strong>TrackPoint</strong>, il bottoncino rosso fra i tasti G, H e B che si spinge come una piccola leva, ideato da Ted Selker nei laboratori di ricerca IBM. La scatola nera del ThinkPad è di Richard Sapper, designer tedesco che lavorava a Milano, ispirato dalle scatole giapponesi per il pranzo, i <em>bentō</em>.',
          'Intanto cambiano le batterie. Nel 1991 Sony mette in commercio la prima batteria agli ioni di litio, che a parità di peso immagazzina molta più energia di quelle al nichel-cadmio; in pochi anni arriva nei portatili e nei telefoni cellulari. Nel marzo 2003 Intel lancia <strong>Centrino</strong>: un processore progettato per consumare poco, il Pentium M, un chipset e una scheda Wi-Fi (per la rete locale senza fili) venduti insieme con un solo marchio. In pochi anni un portatile senza Wi-Fi diventa impensabile, e intorno al 2008, secondo le società di analisi, nel mondo si vendono per la prima volta più portatili che computer da scrivania.',
          'Poi il portatile prende due direzioni. Nell\'ottobre 2007 l\'<strong>Asus Eee PC</strong> inaugura i <em>netbook</em>: schermo da 7 pollici, memoria flash al posto del disco rigido, sistema operativo Linux, meno di un chilo e un prezzo bassissimo. Nel gennaio 2008 Steve Jobs estrae da una busta per documenti il <strong>MacBook Air</strong>: 1,36 chili e 1,94 centimetri nel punto più spesso. I netbook spariscono in pochi anni, schiacciati dai tablet; il portatile sottile e leggero diventa invece la norma. Nel giugno 2011 arrivano i <strong>Chromebook</strong>, portatili semplici ed economici con il sistema operativo Chrome OS di Google, che usano soprattutto programmi e documenti in rete (nel <em>cloud</em>): oggi sono molto diffusi nelle scuole.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Il computer in tasca',
        paragrafi: [
          'Il 9 gennaio 2007 Apple presenta l\'<strong>iPhone</strong>, in vendita dal 29 giugno: un telefono senza tastiera, con uno schermo che sente il tocco di più dita insieme (<em>multi-touch</em>) e un sistema operativo derivato da quello dei Mac. L\'anno dopo nascono l\'App Store e il primo telefono Android, e lo smartphone diventa un computer in cui ognuno installa i programmi che vuole, le <em>app</em>. Nell\'aprile 2010 l\'<strong>iPad</strong> porta la stessa idea su uno schermo da quasi 10 pollici.',
          'Per miliardi di persone lo smartphone è oggi il primo, e spesso l\'unico, personal computer: ogni anno se ne vendono più di un miliardo, contro circa 250 milioni di PC. Dentro c\'è tutto ciò che questa sezione ha raccontato finora, stretto in pochi centimetri quadrati: un processore con più <em>core</em> (unità di calcolo che lavorano in parallelo), una GPU (<em>graphics processing unit</em>), la memoria, il modem per la rete telefonica, il Wi-Fi, i sensori e, dal 2017, anche un\'unità per l\'intelligenza artificiale.',
          'Quasi tutti questi telefoni hanno un processore della stessa famiglia, ARM. Non è un caso: in un oggetto che deve stare in tasca e durare un giorno intero con una piccola batteria, conta soprattutto quanta energia serve per ogni operazione.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'ARM e RISC-V: i processori che consumano poco',
        paragrafi: [
          'L\'architettura ARM nasce nel 1985 a Cambridge, in Inghilterra, nella ditta di computer Acorn: un processore RISC (<em>reduced instruction set computer</em>, con un insieme ridotto di istruzioni semplici) che usa pochi transistor e quindi poca energia (la sua nascita è raccontata nella <a href="../chip-programmabili/index.html#sedici-bit">sezione 5</a>). Nel 1990 Acorn, Apple e VLSI Technology fondano ARM Ltd, che fa una scelta insolita: non fabbrica chip, ma vende il progetto del processore, e la licenza per usarlo, alle aziende che li producono.',
          'Il primo cliente importante è il palmare Newton di Apple (1993). Poi arrivano i cellulari: nel 1997 Nokia presenta il 6110, uno dei primi telefoni GSM di massa con un processore ARM, un ARM7TDMI dentro un chip di Texas Instruments. Da lì ARM conquista quasi tutti i telefoni e i tablet e una miriade di altri oggetti, dalle automobili agli elettrodomestici: nel 2021 i chip con un processore ARM prodotti in tutto il mondo avevano già superato i 200 miliardi.',
          'I PC, intanto, restano fedeli all\'architettura x86 di Intel e AMD, erede dell\'8086 del 1978. Il primo tentativo di portare su ARM il Windows dei PC, Windows RT con il tablet Surface RT (2012), è un insuccesso: non fa funzionare i normali programmi per Windows. Dal 2017 Windows 10 torna su ARM e impara a tradurre al volo i programmi per x86, ma resta una nicchia.',
          'La svolta arriva nel novembre 2020, quando Apple comincia a lasciare Intel e mette nei Mac l\'<strong>M1</strong>, un sistema su chip ARM progettato in casa, con la memoria nello stesso contenitore: il MacBook Air con M1 è più veloce del modello precedente e non ha più bisogno della ventola. Nel giugno 2024 arrivano i primi <strong>Copilot+ PC</strong>, portatili Windows con processori ARM Snapdragon X di Qualcomm. Hanno un\'NPU (<em>neural processing unit</em>, unità per le reti neurali) da almeno 40 TOPS (<em>tera operations per second</em>), cioè 40 mila miliardi di operazioni al secondo. Intel e AMD rispondono pochi mesi dopo con processori x86 che hanno anche loro un\'NPU di quella potenza.',
          'Nel frattempo cresce un\'altra architettura, <strong>RISC-V</strong>, nata nel 2010 all\'Università della California a Berkeley da un progetto di Krste Asanović, Yunsup Lee e Andrew Waterman con David Patterson. È un insieme di istruzioni aperto: chiunque può progettare e vendere un processore RISC-V senza pagare licenze. Oggi si trova soprattutto nei microcontrollori e nei chip che lavorano nascosti dentro altri dispositivi, come dischi e schede di rete. Intanto, nel febbraio 2012, la fondazione Raspberry Pi di Cambridge mette in vendita a 35 dollari il <strong>Raspberry Pi</strong>, un computer con chip ARM grande come una carta di credito, pensato per insegnare a programmare: è diventato il computer britannico più venduto di sempre.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Il calore è il vero limite',
        paragrafi: [
          'Ogni operazione di un chip consuma energia, e quasi tutta quell\'energia diventa calore. Un processore da scrivania può dissipare più di 100 watt, con un dissipatore e una ventola grandi come un pugno; un portatile sottile deve cavarsela con qualche decina di watt, un telefono, che si tiene in mano e non ha ventole, con pochi watt. Per questo oggi si misurano le <strong>prestazioni per watt</strong>: quanto lavoro si fa con ogni joule di energia. Più efficienza vuol dire batterie che durano di più, apparecchi più sottili e silenziosi, centri di calcolo che consumano meno.',
          'Da dove viene il consumo? In un chip CMOS (<em>complementary metal-oxide-semiconductor</em>, la tecnologia di quasi tutti i chip digitali) l\'energia si spende soprattutto per caricare e scaricare le minuscole capacità dei transistor e dei fili: la potenza è circa P = C · V² · f, cioè cresce con la frequenza f e con il quadrato della tensione V. Fino a metà degli anni Duemila ogni generazione di transistor, più piccoli, lavorava anche a tensione più bassa e il conto tornava; poi la tensione ha smesso di scendere e i processori hanno sbattuto contro il <a href="#prestazioni">muro della potenza</a>. Da allora, per fare di più, bisogna sprecare di meno.',
          'Una delle voci più care è spostare i dati. Secondo le stime di Mark Horowitz (Università di Stanford, 2014), in un chip a 45 nanometri una somma fra due numeri a 32 bit costa circa 0,1 picojoule; andare a prendere quei 32 bit nella memoria DRAM, fuori dal chip, costa da diverse centinaia a oltre mille picojoule, migliaia di volte di più. Accorciare le strade, cioè <strong>integrare</strong>, fa risparmiare energia: per questo la memoria è entrata nel package del processore e la scheda madre si è ridotta a pochi chip. Il laboratorio qui sotto mostra come è andata, tappa per tappa.',
          'Conta anche la specializzazione: un circuito progettato per un solo compito, come decodificare un video o fare i calcoli di una rete neurale, lo svolge con molta meno energia di un processore generico. Un SoC (<em>system on a chip</em>, sistema su chip) moderno è una piccola città di unità diverse: core veloci e core efficienti (l\'idea big.LITTLE, presentata da ARM nel 2011), una GPU, un\'NPU, i circuiti per foto e video. Ognuna si accende solo quando serve.',
        ],
      },
      { tipo: 'lab' },
      {
        tipo: 'numeri',
        items: [
          { valore: 11.1, decimali: 1, unita: 'kg', etichetta: 'il peso dell\'Osborne 1 (1981): quanto una sessantina di smartphone di oggi' },
          { valore: 200, prefisso: 'oltre', unita: 'miliardi', etichetta: 'i chip con un processore ARM prodotti fino al 2021' },
          { valore: 40, unita: 'TOPS', etichetta: 'l\'NPU minima di un Copilot+ PC (2024): 40 mila miliardi di operazioni al secondo' },
          { valore: 35, unita: 'dollari', etichetta: 'il prezzo del primo Raspberry Pi (2012), grande come una carta di credito' },
        ],
      },
      {
        tipo: 'nota',
        titolo: 'Lo sapevi? Il portatile ha molti padri',
        paragrafi: [
          'Chi ha inventato il computer portatile? Dipende da che cosa si intende. Nel 1972 Alan Kay, ricercatore dello Xerox PARC, descrive il <em>Dynabook</em>, un computer personale grande come un libro, ma resta un\'idea. L\'IBM 5100 del 1975 si chiamava «portatile», però pesava circa 25 chili. L\'Osborne 1 (1981) è il primo portatile venduto in grandi quantità, l\'Epson HX-20 il primo grande come un quaderno e a batterie, il GRiD Compass (1982) è considerato il primo a conchiglia. Più che un inventore, il portatile ha avuto una lunga fila di genitori.',
        ],
      },
      {
        tipo: 'italia',
        titolo: 'Arduino: da Ivrea al mondo',
        paragrafi: [
          'Nel 2005, all\'Interaction Design Institute Ivrea (IDII), una scuola di design dell\'interazione aperta nel 2001 da Olivetti e Telecom Italia, un gruppo di docenti e studenti crea <strong>Arduino</strong>: una piccola scheda con un microcontrollore, economica e facile da programmare, pensata per chi vuole costruire oggetti che reagiscono all\'ambiente senza essere un ingegnere elettronico. I fondatori sono Massimo Banzi, David Cuartielles, Tom Igoe, Gianluca Martino e David Mellis; l\'ambiente di programmazione deriva da Wiring, il progetto di tesi di Hernando Barragán all\'IDII (2003).',
          'Il nome viene dal bar di Ivrea dove il gruppo si ritrovava, intitolato ad Arduino d\'Ivrea, re d\'Italia dal 1002. Gli schemi della scheda sono pubblici (hardware libero, <em>open source</em>): chiunque può studiarli, copiarli e migliorarli. Così Arduino è diventato lo strumento con cui milioni di studenti, artisti e appassionati in tutto il mondo imparano l\'elettronica; la scheda più famosa, l\'Arduino Uno, è del 2010.',
          'È un cerchio che si chiude. Ivrea è la città della Olivetti, l\'azienda che costruì l\'Elea 9003, uno dei primi grandi calcolatori a transistor (<a href="#giganti">capitolo 1</a>), e la Programma 101, antenata dei personal computer (<a href="#primi-pc">capitolo 3</a>). Mezzo secolo dopo, dalla stessa città è partita una scheda minuscola che ha messo l\'elettronica nelle mani di tutti.',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraArduino,
        alt: 'Disegno schematico di una scheda Arduino Uno vista dall\'alto: circuito stampato verde acqua con, a sinistra, la presa USB e la presa di alimentazione; in alto la fila dei pin digitali, in basso quelle dei pin di alimentazione e analogici; il microcontrollore ATmega328P lungo e nero in basso a destra; piccoli LED e il pulsante di reset. Sette numeri indicano le parti, spiegate nella didascalia.',
        didascalia: '<strong>La scheda Arduino Uno (2010)</strong>, lunga 6,9 cm e larga 5,3, qui ingrandita. <strong>1</strong> Presa USB, per programmarla e alimentarla. <strong>2</strong> Chip ATmega16U2 (ATmega8U2 nelle prime versioni), che traduce la USB in una porta seriale. <strong>3</strong> Pulsante di reset. <strong>4</strong> Pin digitali da 0 a 13. <strong>5</strong> Il microcontrollore ATmega328P: 16 MHz, 32 KB di memoria flash per il programma e 2 KB di RAM. <strong>6</strong> Pin di alimentazione e pin analogici da A0 ad A5. <strong>7</strong> Presa per un alimentatore esterno. Il piccolo LED «L», a destra del chip 2, è collegato al pin 13: è quello che lampeggia nel primo programma di quasi tutti.',
      },
      {
        tipo: 'testo',
        titolo: 'Uno sguardo avanti',
        paragrafi: [
          'Che cosa succederà adesso? Le previsioni sui computer si sbagliano spesso, ma alcune tendenze sono già visibili. La prima sono i <strong>chiplet</strong>: invece di un unico chip enorme, più chip piccoli, più facili da produrre senza difetti, montati vicinissimi sullo stesso supporto, a volte uno sopra l\'altro. Nei processori per PC AMD li usa dal 2019 (lo racconta il <a href="#scheda-madre">capitolo 5</a>), e dal 2022 lo standard UCIe cerca di far parlare fra loro chiplet di aziende diverse.',
          'La seconda sono gli <strong>acceleratori</strong> per l\'intelligenza artificiale: le NPU nei portatili e nei telefoni, le GPU nei centri di calcolo. La terza è il <strong>cloud</strong>: una parte del lavoro non avviene più nel nostro computer ma in grandi centri di calcolo raggiunti attraverso la rete, come già succede con la posta, i documenti condivisi e gli assistenti basati sull\'intelligenza artificiale. Il personal computer non sparisce: diventa la finestra, sempre più efficiente, su una potenza di calcolo divisa fra la scrivania, la tasca e la rete.',
          'Quello che resta, dagli anni Quaranta a oggi, è l\'idea di fondo: un processore che esegue istruzioni prese dalla memoria, come nella <a href="#von-neumann">macchina di von Neumann</a>. È cambiato tutto il resto: le dimensioni, i consumi, il prezzo e il numero di persone che ne portano uno in tasca.',
        ],
      },
      {
        tipo: 'schede',
        titolo: 'Macchine e tappe',
        items: [
          { anno: 1981, nome: 'Osborne 1', luogo: 'Hayward (California), Osborne Computer Corporation', testo: 'Il primo portatile di successo: una valigia da 11,1 kg con schermo da 5 pollici, due unità per dischetti e i programmi compresi nel prezzo di 1.795 dollari.' },
          { anno: 1982, nome: 'GRiD Compass', luogo: 'Mountain View (California), GRiD Systems', testo: 'Considerato il primo portatile a conchiglia: lo schermo si ripiega sulla tastiera, la scocca è di magnesio. Costava più di 8.000 dollari e volò sullo Space Shuttle.' },
          { anno: 1983, nome: 'Olivetti M10', luogo: 'Olivetti, Ivrea (progettato da Kyocera, Giappone)', italia: true, testo: 'Un portatile a pile di meno di 2 kg, con schermo a cristalli liquidi inclinabile di 8 righe da 40 caratteri; fratello del TRS-80 Model 100 della Tandy.' },
          { anno: 1985, nome: 'Toshiba T1100', luogo: 'Giappone, Toshiba', testo: 'Compatibile con il PC IBM: 4,1 kg, schermo a cristalli liquidi, dischetti da 3,5 pollici e circa 8 ore di batteria. Per Toshiba è il primo portatile per il grande pubblico.' },
          { anno: 1991, nome: 'Apple PowerBook', luogo: 'Cupertino (California), Apple', testo: 'Tastiera spostata indietro, poggiapolsi e trackball al centro: la disposizione che adottano quasi tutti i portatili successivi.' },
          { anno: 1992, nome: 'IBM ThinkPad 700C', luogo: 'IBM; design di Richard Sapper', testo: 'Schermo a colori TFT da 10,4 pollici e TrackPoint, il bottoncino rosso in mezzo alla tastiera. Lo disegnò Richard Sapper, tedesco di casa a Milano.' },
          { anno: 2003, nome: 'Intel Centrino', luogo: 'Santa Clara (California) e Haifa (Israele), Intel', testo: 'Il processore a basso consumo Pentium M, un chipset e il Wi-Fi sotto un solo marchio: la rete senza fili diventa di serie sui portatili.' },
          { anno: 2007, nome: 'iPhone', luogo: 'Cupertino (California), Apple', testo: 'Presentato il 9 gennaio, in vendita dal 29 giugno: un computer tascabile con schermo multi-touch e processore ARM.' },
          { anno: 2008, nome: 'MacBook Air', luogo: 'Cupertino (California), Apple', testo: '1,36 kg e 1,94 cm nel punto più spesso, senza lettore di dischi ottici: il modello dei portatili sottili e leggeri.' },
          { anno: 2010, nome: 'RISC-V', luogo: 'Berkeley (California), Università della California', testo: 'Un insieme di istruzioni aperto e senza licenze, nato da un progetto di ricerca; oggi lo usano molte aziende per microcontrollori e chip specializzati.' },
          { anno: 2012, nome: 'Raspberry Pi', luogo: 'Cambridge (Regno Unito), Raspberry Pi Foundation', testo: 'Un computer con chip ARM grande come una carta di credito, venduto a 35 dollari per insegnare a programmare.' },
          { anno: 2024, nome: 'Copilot+ PC', luogo: 'Microsoft, Qualcomm e i costruttori di PC', testo: 'Portatili Windows con processori ARM Snapdragon X e un\'NPU da almeno 40 TOPS; pochi mesi dopo anche con processori x86 di Intel e AMD.' },
        ],
      },
    ],
    lab: {
      titolo: 'Dal PC a un solo chip',
      sottotitolo: 'Fai scorrere gli anni e guarda i pezzi della scheda madre entrare nel processore; poi confronta una valigia del 1981 con un telefono di oggi.',
      crea: creaLab,
    },
    punti: [
      'Dall\'Osborne 1 (1981, 11,1 kg) al MacBook Air (2008, 1,36 kg) fino allo smartphone (meno di 200 g): il personal computer è diventato portatile, poi tascabile.',
      'La forma del portatile moderno nasce fra il 1982 e il 1992: la conchiglia del GRiD Compass, il poggiapolsi del PowerBook, il TrackPoint del ThinkPad; poi arrivano le batterie agli ioni di litio e il Wi-Fi.',
      'ARM non fabbrica chip ma vende progetti di processori efficienti: è in quasi tutti i telefoni e, dal 2020, anche in molti computer. RISC-V è un\'alternativa aperta e senza licenze.',
      'Il calore è il vero limite: conta quanto lavoro si fa con ogni watt, e spostare un dato costa molta più energia che fare un calcolo.',
      'Coprocessore, cache, controller della memoria, grafica, chipset e memoria sono entrati uno dopo l\'altro nel package del processore: dal 1988 al 2020 i pezzi principali della scheda passano da dieci a uno.',
      'Arduino, nato a Ivrea nel 2005, ha messo i microcontrollori nelle mani di studenti, artisti e appassionati di tutto il mondo.',
    ],
    collegamenti: [
      { testo: 'Bus USB', href: '../../index.html#/bus/usb', tipo: 'buslab' },
      { testo: 'Thunderbolt', href: '../../index.html#/bus/thunderbolt', tipo: 'buslab' },
      { testo: 'PCI Express', href: '../../index.html#/bus/pcie', tipo: 'buslab' },
      { testo: 'I²C, il bus dei sensori di Arduino', href: '../../index.html#/bus/i2c', tipo: 'buslab' },
      { testo: 'UART, la porta seriale di Arduino', href: '../../index.html#/bus/uart', tipo: 'buslab' },
      { testo: 'Sezione 1 · La potenza elettrica', href: '../elettronica-base/index.html#potenza', tipo: 'sezione' },
      { testo: 'Sezione 4 · La legge di Moore', href: '../porte-logiche/index.html#moore', tipo: 'sezione' },
      { testo: 'Sezione 5 · I processori a 16 bit e la nascita di ARM', href: '../chip-programmabili/index.html#sedici-bit', tipo: 'sezione' },
      { testo: 'Sezione 5 · I microcontrollori', href: '../chip-programmabili/index.html#microcontrollori', tipo: 'sezione' },
      { testo: 'Sezione 7 · Il computer ovunque', href: '../programmazione/index.html#ovunque', tipo: 'sezione' },
      { testo: 'Sezione 7 · L\'intelligenza artificiale', href: '../programmazione/index.html#ia', tipo: 'sezione' },
      { testo: 'Capitolo 5 · Scheda madre e chipset', href: '#scheda-madre', tipo: 'sezione' },
      { testo: 'Capitolo 9 · Il muro della potenza', href: '#prestazioni', tipo: 'sezione' },
      { testo: 'Quiz sul capitolo', href: '../quiz/index.html#storia-pc/oggi', tipo: 'sezione' },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
