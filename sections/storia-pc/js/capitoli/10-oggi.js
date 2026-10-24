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
   * Laboratorio
   * ===================================================================== */

  function creaLab(el, ctx) {
    el.append(ctx.h('p', { class: 'lab-note' }, 'Laboratorio in preparazione.'));
    return {};
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
          'Il primo portatile di successo arriva nell\'aprile del 1981. L\'<strong>Osborne 1</strong>, voluto dall\'editore Adam Osborne e progettato da Lee Felsenstein, è una valigia di plastica di 52 × 23 × 33 centimetri che pesa 11,1 chili. La tastiera fa da coperchio; dentro ci sono uno schermo a tubo catodico da 5 pollici (52 colonne per 24 righe), due unità per dischetti, un processore Z80 a 4 MHz e 64 KB di memoria. Non ha batteria: si porta da una presa all\'altra.',
          'Il colpo di genio è il prezzo: 1.795 dollari, con un pacchetto di programmi incluso, fra cui il sistema operativo CP/M, il programma di scrittura WordStar e il foglio di calcolo SuperCalc. Per la prima volta un computer completo si compra come un elettrodomestico e sta sotto il sedile di un aereo. Il successo è immediato, ma nel 1983 l\'azienda fallisce, travolta da una crescita disordinata e dalla concorrenza dei computer compatibili con il <a href="#ibm-pc">PC IBM</a>.',
          'Nello stesso anno si vede anche l\'altra strada. L\'<strong>Epson HX-20</strong>, presentato nel novembre 1981 e venduto dal 1982, pesa circa 1,6 chili e va a batterie ricaricabili: ha uno schermo a cristalli liquidi di quattro righe da venti caratteri, una piccola stampante e un registratore a microcassette. Anche Olivetti ha il suo portatile a pile, l\'<strong>M10</strong> del 1983, costruito con la giapponese Kyocera come il TRS-80 Model 100: circa 1,5 chili, uno schermo inclinabile di 8 righe da 40 caratteri e una ventina di ore di autonomia con quattro pile stilo.',
          'Il <strong>GRiD Compass</strong> (1982), disegnato da Bill Moggridge, introduce la forma a conchiglia (<em>clamshell</em>): lo schermo si ripiega sulla tastiera, come in tutti i portatili di oggi. È in lega di magnesio, pesa circa 5 chili e costa più di 8.000 dollari; lo comprano soprattutto i militari e la NASA, che lo porta sullo Space Shuttle. Il <strong>Compaq Portable</strong> (1983, circa 13 chili) ha successo perché fa funzionare quasi tutti i programmi del PC IBM. Nel 1985 il <strong>Toshiba T1100</strong> mette insieme le due idee: compatibile con il PC IBM, 4,1 chili, schermo a cristalli liquidi da 80 colonne per 25 righe, dischetti da 3,5 pollici e una batteria da circa otto ore. Toshiba lo presenta come il primo portatile per il grande pubblico.',
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
          'Negli anni Novanta il portatile diventa il <em>notebook</em> che conosciamo. Nell\'ottobre 1991 i primi <strong>PowerBook</strong> di Apple spostano la tastiera verso lo schermo e lasciano davanti un poggiapolsi con la trackball al centro: è la disposizione che hanno ancora quasi tutti i portatili. Nell\'ottobre 1992 l\'<strong>IBM ThinkPad 700C</strong> porta uno schermo a colori a matrice attiva (TFT, <em>thin-film transistor</em>) da 10,4 pollici, il più grande dell\'epoca su un portatile, e il <strong>TrackPoint</strong>, il bottoncino rosso fra i tasti G, H e B che si spinge come una piccola leva. Lo disegna Richard Sapper, designer tedesco che lavorava a Milano, ispirandosi alle scatole giapponesi per il pranzo, i <em>bentō</em>.',
          'Intanto cambiano le batterie. Nel 1991 Sony mette in commercio la prima batteria agli ioni di litio, che a parità di peso immagazzina molta più energia di quelle al nichel-cadmio; in pochi anni arriva nei portatili e poi nei telefoni. Nel marzo 2003 Intel lancia <strong>Centrino</strong>: un processore progettato per consumare poco, il Pentium M, un chipset e una scheda Wi-Fi venduti insieme con un solo marchio. Da allora un portatile senza rete senza fili diventa impensabile, e intorno al 2008, secondo le società di analisi, nel mondo si vendono per la prima volta più portatili che computer da scrivania.',
          'Poi il portatile prende due direzioni. Nell\'ottobre 2007 l\'<strong>Asus Eee PC</strong> inaugura i <em>netbook</em>: schermo da 7 pollici, memoria flash al posto del disco rigido, sistema operativo Linux, meno di un chilo e un prezzo bassissimo. Nel gennaio 2008 Steve Jobs estrae da una busta per documenti il <strong>MacBook Air</strong>: 1,36 chili e 1,94 centimetri nel punto più spesso. I netbook spariscono in pochi anni, schiacciati dai tablet; il portatile sottile e leggero diventa invece la norma. Nel giugno 2011 arrivano i <strong>Chromebook</strong>, portatili semplici ed economici con il sistema operativo Chrome OS di Google, che usano soprattutto programmi e documenti in rete (nel <em>cloud</em>): oggi sono molto diffusi nelle scuole.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Il computer in tasca',
        paragrafi: [
          'Il 9 gennaio 2007 Apple presenta l\'<strong>iPhone</strong>, in vendita dal 29 giugno: un telefono senza tastiera, con uno schermo che sente il tocco di più dita insieme (<em>multi-touch</em>) e un sistema operativo derivato da quello dei Mac. L\'anno dopo nascono l\'App Store e il primo telefono Android, e lo smartphone diventa un computer in cui ognuno installa i programmi che vuole, le <em>app</em>. Nell\'aprile 2010 l\'<strong>iPad</strong> porta la stessa idea su uno schermo da quasi 10 pollici.',
          'Per miliardi di persone lo smartphone è oggi il primo, e spesso l\'unico, personal computer: ogni anno se ne vendono più di un miliardo, contro circa 250 milioni di PC. Dentro c\'è tutto ciò che questa sezione ha raccontato finora, stretto in pochi centimetri quadrati: un processore con più core, una GPU (<em>graphics processing unit</em>), la memoria, il modem per la rete telefonica, il Wi-Fi, i sensori e, dal 2017, anche un\'unità per l\'intelligenza artificiale.',
          'Quasi tutti questi telefoni hanno un processore della stessa famiglia, ARM. Non è un caso: in un oggetto che deve stare in tasca e durare un giorno intero con una piccola batteria, conta soprattutto quanta energia serve per ogni operazione.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'ARM e RISC-V: i processori che consumano poco',
        paragrafi: [
          'L\'architettura ARM nasce nel 1985 a Cambridge, in Inghilterra, nella ditta di computer Acorn: un processore RISC (<em>reduced instruction set computer</em>, con un insieme ridotto di istruzioni semplici) che usa pochi transistor e quindi poca energia (la sua nascita è raccontata nella <a href="../chip-programmabili/index.html#sedici-bit">sezione 5</a>). Nel 1990 Acorn, Apple e VLSI Technology fondano ARM Ltd, che fa una scelta insolita: non fabbrica chip, ma vende il progetto del processore, e la licenza per usarlo, alle aziende che li producono.',
          'Il primo cliente importante è il palmare Newton di Apple (1993). Poi arrivano i cellulari: nel 1997 Nokia presenta il 6110, uno dei primi telefoni GSM di massa con un processore ARM, un ARM7TDMI dentro un chip di Texas Instruments. Da lì ARM conquista quasi tutti i telefoni e i tablet e una miriade di altri oggetti, dalle automobili agli elettrodomestici: nel 2021 i chip con un processore ARM prodotti in tutto il mondo avevano già superato i 200 miliardi.',
          'I PC, intanto, restano fedeli all\'architettura x86 di Intel e AMD, erede dell\'8086 del 1978. Il primo tentativo di Windows su ARM, Windows RT con il tablet Surface RT (2012), è un insuccesso: non fa funzionare i normali programmi per Windows. La svolta arriva nel novembre 2020, quando Apple lascia Intel e mette nei Mac l\'<strong>M1</strong>, un sistema su chip ARM progettato in casa, con la memoria nello stesso contenitore: il MacBook Air con M1 è più veloce del modello precedente e non ha più bisogno della ventola. Nel giugno 2024 arrivano i primi <strong>Copilot+ PC</strong> con Windows e processori ARM Snapdragon X di Qualcomm, che hanno un\'NPU (<em>neural processing unit</em>, unità per le reti neurali) da almeno 40 TOPS, cioè 40 mila miliardi di operazioni al secondo; Intel e AMD rispondono pochi mesi dopo con processori x86 altrettanto parchi.',
          'Nel frattempo cresce un\'altra architettura, <strong>RISC-V</strong>, nata nel 2010 all\'Università della California a Berkeley da un progetto di Krste Asanović, Yunsup Lee e Andrew Waterman con David Patterson. È un insieme di istruzioni aperto: chiunque può progettare e vendere un processore RISC-V senza pagare licenze. Oggi si trova soprattutto nei microcontrollori e nei chip che lavorano nascosti dentro altri dispositivi, come dischi e schede di rete. E nel febbraio 2012 la fondazione Raspberry Pi di Cambridge mette in vendita a 35 dollari il <strong>Raspberry Pi</strong>, un computer con chip ARM grande come una carta di credito, pensato per insegnare a programmare: è diventato il computer britannico più venduto di sempre.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Il calore è il vero limite',
        paragrafi: [
          'Ogni operazione di un chip consuma energia, e quasi tutta quell\'energia diventa calore. Un processore da scrivania può dissipare più di 100 watt, con un dissipatore e una ventola grandi come un pugno; un portatile sottile deve cavarsela con qualche decina di watt, un telefono, che si tiene in mano e non ha ventole, con pochi watt. Per questo oggi si misurano le <strong>prestazioni per watt</strong>: quanto lavoro si fa con ogni joule di energia. Più efficienza vuol dire batterie che durano di più, apparecchi più sottili e silenziosi, centri di calcolo che consumano meno.',
          'Da dove viene il consumo? In un chip CMOS (<em>complementary metal-oxide-semiconductor</em>, la tecnologia di quasi tutti i chip digitali) l\'energia si spende soprattutto per caricare e scaricare le minuscole capacità dei transistor e dei fili: la potenza è circa P = C · V² · f, cioè cresce con la frequenza f e con il quadrato della tensione V. Fino ai primi anni Duemila ogni generazione di transistor, più piccoli, lavorava anche a tensione più bassa e il conto tornava; poi la tensione ha smesso di scendere e i processori hanno sbattuto contro il <a href="#prestazioni">muro della potenza</a>. Da allora, per fare di più, bisogna sprecare di meno.',
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
          'Chi ha inventato il computer portatile? Dipende da che cosa si intende. Nel 1972 Alan Kay, che poi lavorerà allo Xerox PARC, descrive il <em>Dynabook</em>, un computer personale grande come un libro, ma resta un\'idea. L\'IBM 5100 del 1975 si chiamava «portatile», però pesava circa 25 chili. L\'Osborne 1 (1981) è il primo portatile venduto in grandi quantità, l\'Epson HX-20 il primo grande come un quaderno e a batterie, il GRiD Compass (1982) il primo a conchiglia. Più che un inventore, il portatile ha avuto una lunga fila di genitori.',
        ],
      },
      {
        tipo: 'italia',
        titolo: 'Arduino: da Ivrea al mondo',
        paragrafi: [
          'Nel 2005, all\'Interaction Design Institute Ivrea (IDII), una scuola di design dell\'interazione fondata nel 2001 da Olivetti e Telecom Italia, un gruppo di docenti e studenti crea <strong>Arduino</strong>: una piccola scheda con un microcontrollore, economica e facile da programmare, pensata per chi vuole costruire oggetti che reagiscono all\'ambiente senza essere un ingegnere elettronico. I fondatori sono Massimo Banzi, David Cuartielles, Tom Igoe, Gianluca Martino e David Mellis; l\'ambiente di programmazione deriva da Wiring, il progetto di tesi di Hernando Barragán all\'IDII (2003).',
          'Il nome viene dal bar di Ivrea dove il gruppo si ritrovava, intitolato ad Arduino d\'Ivrea, re d\'Italia dal 1002. Gli schemi della scheda sono pubblici (hardware libero, <em>open source</em>): chiunque può studiarli, copiarli e migliorarli. Così Arduino è diventato lo strumento con cui milioni di studenti, artisti e appassionati in tutto il mondo imparano l\'elettronica; la scheda più famosa, l\'Arduino Uno, è del 2010.',
          'È un cerchio che si chiude. Ivrea è la città della Olivetti, l\'azienda che costruì l\'Elea 9003, uno dei primi grandi calcolatori a transistor (<a href="#giganti">capitolo 1</a>), e la Programma 101, antenata dei personal computer (<a href="#primi-pc">capitolo 3</a>). Mezzo secolo dopo, dalla stessa città è partita una scheda minuscola che ha messo l\'elettronica nelle mani di tutti.',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraArduino,
        alt: 'Disegno schematico di una scheda Arduino Uno vista dall\'alto: circuito stampato verde acqua con, a sinistra, la presa USB e la presa di alimentazione; in alto la fila dei pin digitali, in basso quelle dei pin di alimentazione e analogici; il microcontrollore ATmega328P lungo e nero in basso a destra; piccoli LED e il pulsante di reset. Sette numeri indicano le parti, spiegate nella didascalia.',
        didascalia: '<strong>La scheda Arduino Uno (2010)</strong>, lunga 6,9 cm, qui ingrandita circa sette volte. <strong>1</strong> Presa USB, per programmarla e alimentarla. <strong>2</strong> Chip ATmega16U2, che traduce la USB in una porta seriale. <strong>3</strong> Pulsante di reset. <strong>4</strong> Pin digitali da 0 a 13. <strong>5</strong> Il microcontrollore ATmega328P: 16 MHz, 32 KB di memoria flash per il programma e 2 KB di RAM. <strong>6</strong> Pin di alimentazione e pin analogici da A0 ad A5. <strong>7</strong> Presa per un alimentatore esterno. Il piccolo LED «L», a destra del chip 2, è collegato al pin 13: è quello che lampeggia nel primo programma di quasi tutti.',
      },
      {
        tipo: 'testo',
        titolo: 'Uno sguardo avanti',
        paragrafi: [
          'Che cosa succederà adesso? Le previsioni sui computer si sbagliano spesso, ma alcune tendenze sono già visibili. La prima sono i <strong>chiplet</strong>: invece di un unico chip enorme, più chip piccoli, più facili da produrre senza difetti, montati vicinissimi sullo stesso supporto, a volte uno sopra l\'altro. AMD li usa dal 2019 (lo racconta il <a href="#scheda-madre">capitolo 5</a>), e dal 2022 lo standard UCIe cerca di far parlare fra loro chiplet di aziende diverse.',
          'La seconda sono gli <strong>acceleratori</strong> per l\'intelligenza artificiale: le NPU nei portatili e nei telefoni, le GPU nei centri di calcolo. La terza è il <strong>cloud</strong>: una parte del lavoro non avviene più nel nostro computer ma in grandi centri di calcolo raggiunti attraverso la rete, come già succede con la posta, i documenti condivisi e gli assistenti basati sull\'intelligenza artificiale. Il personal computer non sparisce: diventa la finestra, sempre più efficiente, su una potenza di calcolo divisa fra la scrivania, la tasca e la rete.',
          'Quello che resta, dagli anni Quaranta a oggi, è l\'idea di fondo: un processore che esegue istruzioni prese dalla memoria, come nella <a href="#von-neumann">macchina di von Neumann</a>. È cambiato tutto il resto: le dimensioni, i consumi, il prezzo e il numero di persone che ne portano uno in tasca.',
        ],
      },
      {
        tipo: 'schede',
        titolo: 'Macchine e tappe',
        items: [
          { anno: 1981, nome: 'Osborne 1', luogo: 'Hayward (California), Osborne Computer Corporation', testo: 'Il primo portatile di successo: una valigia da 11,1 kg con schermo da 5 pollici, due unità per dischetti e i programmi compresi nel prezzo di 1.795 dollari.' },
          { anno: 1982, nome: 'GRiD Compass', luogo: 'California, GRiD Systems', testo: 'Il primo portatile a conchiglia: lo schermo si ripiega sulla tastiera, la scocca è di magnesio. Costava più di 8.000 dollari e volò sullo Space Shuttle.' },
          { anno: 1983, nome: 'Olivetti M10', luogo: 'Ivrea, Olivetti (costruito con Kyocera)', italia: true, testo: 'Un portatile a pile di circa 1,5 kg, con schermo a cristalli liquidi inclinabile di 8 righe da 40 caratteri; fratello del TRS-80 Model 100.' },
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
      'La forma del portatile moderno nasce fra il 1982 e il 1992: la conchiglia del GRiD Compass, il poggiapolsi del PowerBook, il TrackPoint del ThinkPad; poi arrivano le batterie al litio e il Wi-Fi.',
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
