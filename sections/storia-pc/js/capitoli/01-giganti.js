/*
 * Storia del PC · capitolo 1: I giganti: dai relè ai transistor (1937–1965).
 * Testi, due illustrazioni (la sala dell'ENIAC, una sala con l'Olivetti Elea 9003)
 * e il laboratorio «Il computer che si rimpicciolisce».
 * Il file non tocca il DOM al caricamento: il DOM si usa solo dentro le figure
 * e dentro lab.crea(), così i test in Node possono caricarlo.
 * Dati e logica del laboratorio (misure delle macchine, confronti, telecamera)
 * stanno nel modello js/modelli/01-giganti.js.
 */
(function (root) {
  'use strict';
  const P = root.StoriaPC;

  /* =====================================================================
   * Illustrazioni (SVG originali, stile tecnico piatto della sezione)
   * ===================================================================== */

  function n(v) { return Math.round(v * 10) / 10; }
  function pt(p) { return n(p[0]) + ' ' + n(p[1]); }
  function poligono(punti, classe) { return '<path class="' + classe + '" d="M' + punti.map(pt).join('L') + 'Z"/>'; }

  // Pittogramma di una persona alta 1,75 m vista di fronte, in metri (y verso l'alto è negativo).
  // Serve sia nelle figure (scalato) sia nel laboratorio (dove il mondo è in metri).
  const PERSONA_D = 'M-0.2 -1.43Q-0.2 -1.52 -0.11 -1.52L0.11 -1.52Q0.2 -1.52 0.2 -1.43L0.245 -0.86Q0.247 -0.8 0.205 -0.8' +
    'Q0.17 -0.8 0.168 -0.86L0.145 -1.2L0.15 -0.9L0.138 -0.03Q0.137 0 0.105 0L0.035 0Q0.012 0 0.011 -0.03L0 -0.8L-0.011 -0.03' +
    'Q-0.012 0 -0.035 0L-0.105 0Q-0.137 0 -0.138 -0.03L-0.15 -0.9L-0.145 -1.2L-0.168 -0.86Q-0.17 -0.8 -0.205 -0.8' +
    'Q-0.247 -0.8 -0.245 -0.86Z';

  function personaFigura(x, y, scala, linea) {
    return '<g transform="translate(' + n(x) + ' ' + n(y) + ') scale(' + n(scala) + ')">' +
      '<ellipse class="gig-ombra" cx="0" cy="0" rx="0.34" ry="0.05"/>' +
      '<path class="gig-persona" d="' + PERSONA_D + '" stroke-width="' + (linea / scala).toFixed(4) + '"/>' +
      '<circle class="gig-persona-testa" cx="0" cy="-1.645" r="0.105" stroke-width="' + (linea / scala).toFixed(4) + '"/></g>';
  }

  // Cavo che pende tra due prese.
  function cavo(x1, y1, x2, y2, giu, classe) {
    return '<path class="gig-cavo ' + classe + '" d="M' + n(x1) + ' ' + n(y1) + 'C' + n(x1) + ' ' + n(y1 + giu) + ' ' + n(x2) + ' ' + n(y2 + giu) + ' ' + n(x2) + ' ' + n(y2) + '"/>';
  }

  // La sala dell'ENIAC in prospettiva centrale: i pannelli corrono a U su tre pareti.
  // Mondo in metri: occhio a 1,6 m, pareti laterali a ±2,44 m, pannelli larghi 0,61 m e alti 2,4 m.
  function figuraEniac() {
    const VX = 320, VY = 124, F = 764, OCCHIO = 1.6, MEZZA = 2.44, ZB = F / 67.5, PASSO = 0.61, ALTO = 2.4;
    const sx = (X, z) => VX + X * F / z;
    const sy = (Y, z) => VY + (OCCHIO - Y) * F / z;
    // dove le linee di fuga del soffitto e del pavimento escono dal disegno
    const cielo = (X) => VX + (0 - VY) / ((sy(3.2, ZB) - VY) / (sx(X, ZB) - VX));
    const terra = (X) => VY + (X < 0 ? -VX : 640 - VX) * ((sy(0, ZB) - VY) / (sx(X, ZB) - VX));
    const bl = sx(-MEZZA, ZB), br = sx(MEZZA, ZB), bt = sy(3.2, ZB), bf = sy(0, ZB);
    const o = [];

    // stanza: soffitto, pareti, pavimento con le piastrelle
    o.push(poligono([[cielo(-MEZZA), 0], [cielo(MEZZA), 0], [br, bt], [bl, bt]], 'gig-soffitto'));
    o.push(poligono([[bl, bt], [cielo(-MEZZA), 0], [0, 0], [0, terra(-MEZZA)], [bl, bf]], 'gig-muro'));
    o.push(poligono([[br, bt], [cielo(MEZZA), 0], [640, 0], [640, terra(MEZZA)], [br, bf]], 'gig-muro'));
    o.push('<rect class="gig-muro-fondo" x="' + n(bl) + '" y="' + n(bt) + '" width="' + n(br - bl) + '" height="' + n(bf - bt) + '"/>');
    o.push(poligono([[bl, bf], [br, bf], [640, terra(MEZZA)], [640, 360], [0, 360], [0, terra(-MEZZA)]], 'gig-pavimento'));
    const righe = [];
    for (let X = -MEZZA + PASSO; X < MEZZA - 0.01; X += PASSO) righe.push('M' + n(sx(X, ZB)) + ' ' + n(bf) + 'L' + n(sx(X, 3.2)) + ' ' + n(sy(0, 3.2)));
    for (let z = ZB - 1.1; z > 3.5; z -= 1.1) righe.push('M' + n(sx(-MEZZA, z)) + ' ' + n(sy(0, z)) + 'L' + n(sx(MEZZA, z)) + ' ' + n(sy(0, z)));
    o.push('<path class="gig-piastrelle" d="' + righe.join('') + '"/>');
    // lampade al soffitto
    [-1.1, 1.1].forEach((X) => {
      const d = 'M' + n(sx(X, 7.2)) + ' ' + n(sy(3.2, 7.2)) + 'L' + n(sx(X, 10.6)) + ' ' + n(sy(3.2, 10.6));
      o.push('<path class="gig-lampada-alone" d="' + d + '"/><path class="gig-lampada" d="' + d + '"/>');
    });

    // pareti laterali: pannelli in prospettiva (i dettagli seguono le linee di fuga)
    function lato(X, classe) {
      const out = [];
      for (let k = 0; k < 11; k++) {
        const za = ZB - k * PASSO, zb = za - PASSO;
        if (zb < 3) break;
        const xa = sx(X, za), xb = sx(X, zb);
        const q = (Y1, Y2, c) => poligono([[xa, sy(Y2, za)], [xb, sy(Y2, zb)], [xb, sy(Y1, zb)], [xa, sy(Y1, za)]], c);
        const riga = (Y, c, rientro) => {
          const r = rientro == null ? 0.12 : rientro;
          const ta = (xb - xa) * r;
          return '<path class="' + c + '" d="M' + n(xa + ta) + ' ' + n(sy(Y, za) + (sy(Y, zb) - sy(Y, za)) * r) + 'L' + n(xb - ta) + ' ' + n(sy(Y, zb) - (sy(Y, zb) - sy(Y, za)) * r) + '"/>';
        };
        out.push(q(0, ALTO, classe + ' gig-l'));
        out.push(q(0, 0.1, 'gig-zoccolo'));
        out.push(riga(2.26, 'gig-riga-neon'), riga(2.14, 'gig-riga-neon'));
        [1.9, 1.72, 1.54, 1.36].forEach((Y) => out.push(riga(Y, 'gig-riga-valvole')));
        out.push(riga(0.98, 'gig-riga-comm'), riga(0.74, 'gig-riga-comm'));
        out.push(riga(0.52, 'gig-riga-prese', 0.2));
        if (k % 2 === 0) {
          const xm1 = xa + (xb - xa) * 0.3, xm2 = xa + (xb - xa) * 1.3;
          const y1 = sy(0.52, za + (zb - za) * 0.3), y2 = sy(0.52, za + (zb - za) * 1.3);
          out.push(cavo(xm1, y1, xm2, y2, 26 * F / za / 67.5, k % 4 ? 'gig-c2' : 'gig-c1'));
        }
      }
      return out.join('');
    }
    o.push(lato(-MEZZA, 'gig-pannello2'), lato(MEZZA, 'gig-pannello'));

    // parete di fondo: otto pannelli visti di fronte, con tutti i dettagli
    const s0 = F / ZB, pw = PASSO * s0, top = sy(ALTO, ZB);
    for (let k = 0; k < 8; k++) {
      const x = bl + k * pw;
      o.push('<rect class="gig-pannello gig-l" x="' + n(x + 1) + '" y="' + n(top) + '" width="' + n(pw - 2) + '" height="' + n(bf - top) + '"/>');
      o.push('<rect class="gig-zoccolo" x="' + n(x + 1) + '" y="' + n(bf - 9) + '" width="' + n(pw - 2) + '" height="9"/>');
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 6; c++) {
          const acceso = (k * 7 + r * 5 + c * 3) % 4 !== 0;
          o.push('<circle class="' + (acceso ? 'gig-neon' : 'gig-neon-spento') + '" cx="' + n(x + 7 + c * (pw - 14) / 5) + '" cy="' + n(top + 7 + r * 6) + '" r="1.7"/>');
        }
      }
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 6; c++) {
          const vx = x + 5.5 + c * (pw - 11) / 5.2, vy = top + 22 + r * 13;
          o.push('<rect class="gig-vetro" x="' + n(vx) + '" y="' + n(vy) + '" width="3.4" height="9.5" rx="1.7"/><circle class="gig-filamento" cx="' + n(vx + 1.7) + '" cy="' + n(vy + 2.6) + '" r="1.2"/>');
        }
      }
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          const cx = x + pw * (0.22 + c * 0.28), cy = top + 82 + r * 15;
          o.push('<circle class="gig-manopola gig-l1" cx="' + n(cx) + '" cy="' + n(cy) + '" r="4.2"/><path class="gig-indice" d="M' + n(cx) + ' ' + n(cy) + 'l' + ((k + c + r) % 2 ? '2.6 -2.6' : '-2.6 -2.6') + '"/>');
        }
      }
      for (let c = 0; c < 6; c++) o.push('<circle class="gig-presa" cx="' + n(x + 6 + c * (pw - 12) / 5) + '" cy="' + n(top + 118) + '" r="1.6"/>');
      if (k < 7) o.push(cavo(x + pw * 0.62, top + 118, x + pw * 1.25, top + 118, 22, ['gig-c1', 'gig-c2', 'gig-c3', 'gig-c4'][k % 4]));
      if (k % 3 === 1) o.push(cavo(x + 6, top + 118, x + pw * 0.38, top + 118, 13, 'gig-c3'));
    }

    // la persona: in piedi a 9 m dall'occhio, quindi alla scala di quella profondità
    o.push(personaFigura(sx(-0.25, 9), sy(0, 9), F / 9, 1.6));

    return '<svg class="gig-fig" viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">' + o.join('') + '</svg>';
  }

  // Una sala con l'Elea 9003, vista di fronte (100 px = 1 m, pavimento a y = 300).
  function figuraElea() {
    const Y0 = 300, o = [];
    o.push('<rect class="gig-muro-fondo" x="0" y="0" width="640" height="' + Y0 + '"/>');
    o.push('<rect class="gig-pavimento" x="0" y="' + Y0 + '" width="640" height="60"/>');
    o.push('<path class="gig-battiscopa" d="M0 ' + Y0 + 'H640"/>');
    o.push('<ellipse class="gig-ombra" cx="430" cy="' + (Y0 + 4) + '" rx="210" ry="9"/><ellipse class="gig-ombra" cx="108" cy="' + (Y0 + 4) + '" rx="96" ry="7"/>');

    // condotti sospesi per i cavi, con le discese verso ogni armadio e verso la console
    const armadi = [250, 325, 400, 475, 550];
    o.push('<rect class="gig-condotto gig-l" x="96" y="62" width="530" height="18" rx="2"/>');
    for (let x = 140; x < 620; x += 80) o.push('<path class="gig-giunto" d="M' + x + ' 63V79"/>');
    o.push('<rect class="gig-condotto gig-l" x="100" y="80" width="13" height="99"/>');
    armadi.forEach((x) => o.push('<rect class="gig-condotto gig-l" x="' + (x + 30) + '" y="80" width="12" height="60"/>'));

    // armadi modulari: tre di logica e memoria, due unità a nastro
    const strisce = ['gig-s1', 'gig-s2', 'gig-s3', 'gig-s4', 'gig-s4'];
    armadi.forEach((x, i) => {
      o.push('<rect class="gig-armadio gig-l2" x="' + x + '" y="140" width="72" height="160" rx="2"/>');
      o.push('<rect class="gig-armadio-cima" x="' + (x + 1) + '" y="141" width="70" height="6"/>');
      o.push('<rect class="' + strisce[i] + '" x="' + (x + 6) + '" y="152" width="60" height="9" rx="1.5"/>');
      o.push('<rect class="gig-zoccolo" x="' + (x + 3) + '" y="291" width="66" height="9"/>');
      if (i < 3) {
        o.push('<rect class="gig-armadio-fronte gig-l1" x="' + (x + 6) + '" y="167" width="60" height="118" rx="1.5"/>');
        const griglia = [];
        for (let y = 178; y <= 202; y += 4) griglia.push('M' + (x + 13) + ' ' + y + 'H' + (x + 59));
        o.push('<path class="gig-griglia-aria" d="' + griglia.join('') + '"/>');
        for (let c = 0; c < 4; c++) o.push('<circle class="' + ((i + c) % 3 ? 'gig-spia-v' : 'gig-spia-a') + '" cx="' + (x + 18 + c * 12) + '" cy="216" r="2.6"/>');
        o.push('<rect class="gig-maniglia" x="' + (x + 55) + '" y="232" width="3.5" height="26" rx="1.5"/>');
      } else {
        o.push('<rect class="gig-vetro-scuro gig-l1" x="' + (x + 7) + '" y="167" width="58" height="104" rx="2"/>');
        [194, 244].forEach((cy, j) => {
          const cx = x + 32;
          o.push('<circle class="gig-bobina gig-l1" cx="' + cx + '" cy="' + cy + '" r="18"/><circle class="gig-bobina-nastro" cx="' + cx + '" cy="' + cy + '" r="' + (j ? 9.5 : 13) + '"/><circle class="gig-mozzo" cx="' + cx + '" cy="' + cy + '" r="4.5"/>');
          for (let a = 0; a < 3; a++) {
            const ang = (a * 120 + j * 40) * Math.PI / 180;
            o.push('<circle class="gig-foro" cx="' + n(cx + Math.cos(ang) * 13.5) + '" cy="' + n(cy + Math.sin(ang) * 13.5) + '" r="2.4"/>');
          }
        });
        o.push('<path class="gig-nastro" d="M' + (x + 50) + ' 194V244"/><rect class="gig-testina" x="' + (x + 47) + '" y="213" width="9" height="12" rx="1"/>');
        o.push('<rect class="gig-armadio-fronte gig-l1" x="' + (x + 7) + '" y="276" width="58" height="12" rx="1.5"/>');
      }
    });

    // console di comando: scrivania con pannello inclinato di spie e tasti
    o.push('<rect class="gig-console gig-l2" x="24" y="226" width="168" height="74"/>');
    o.push('<rect class="gig-console-ombra" x="96" y="244" width="64" height="56"/>');
    o.push('<rect class="gig-piano gig-l1" x="18" y="219" width="180" height="8" rx="1.5"/>');
    o.push(poligono([[38, 219], [178, 219], [170, 178], [46, 178]], 'gig-pannello-console gig-l2'));
    const spie = ['gig-spia-a', 'gig-spia-v', 'gig-spia-r', 'gig-spia-b'];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 12; c++) {
        const x = 56 + c * 9.4 - r * 1.7 + (r === 2 ? 0 : 0), y = 187 + r * 10;
        o.push('<circle class="' + spie[(c + r * 2) % 4] + '" cx="' + n(x) + '" cy="' + y + '" r="2.1"/>');
      }
    }
    for (let c = 0; c < 15; c++) o.push('<rect class="gig-tasto" x="' + (34 + c * 10) + '" y="221" width="7" height="4" rx="1"/>');

    // la persona, in scala: gli armadi le arrivano poco sotto la testa
    o.push(personaFigura(222, Y0, 100, 1.6));

    return '<svg class="gig-fig" viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">' + o.join('') + '</svg>';
  }

  /* =====================================================================
   * Laboratorio: il computer che si rimpicciolisce
   * Il mondo è disegnato in metri (x verso destra, y verso l'alto, convertito in
   * coordinate SVG con y negativa); la telecamera è una trasformazione sul gruppo
   * del mondo, ricalcolata a ogni fotogramma durante i movimenti.
   * ===================================================================== */

  // Piccoli aiuti per disegnare in metri: y è l'altezza dal pavimento.
  function f3(v) { return Math.round(v * 1000) / 1000; }
  function R(x, y, w, hh, classe, extra) {
    return '<rect class="' + classe + '" x="' + f3(x) + '" y="' + f3(-(y + hh)) + '" width="' + f3(w) + '" height="' + f3(hh) + '"' + (extra || '') + '/>';
  }
  function C(cx, cy, r, classe) { return '<circle class="' + classe + '" cx="' + f3(cx) + '" cy="' + f3(-cy) + '" r="' + f3(r) + '"/>'; }
  function Q(punti, classe) { return '<path class="' + classe + '" d="M' + punti.map((p) => f3(p[0]) + ' ' + f3(-p[1])).join('L') + 'Z"/>'; }
  function cavoM(x1, y1, x2, y2, giu, classe) {
    return '<path class="gw-cavo ' + classe + '" d="M' + f3(x1) + ' ' + f3(-y1) + 'C' + f3(x1) + ' ' + f3(-(y1 - giu)) + ' ' + f3(x2) + ' ' + f3(-(y2 - giu)) + ' ' + f3(x2) + ' ' + f3(-y2) + '"/>';
  }

  function motivi(id) {
    return '<pattern id="' + id + '-valv" patternUnits="userSpaceOnUse" width="0.087" height="0.137">' +
        '<rect width="0.087" height="0.137" class="gw-pat-fondo"/><rect x="0.022" y="0.026" width="0.043" height="0.092" rx="0.02" class="gw-pat-vetro"/>' +
        '<circle cx="0.0435" cy="0.05" r="0.012" class="gw-pat-filamento"/></pattern>' +
      '<pattern id="' + id + '-comm" patternUnits="userSpaceOnUse" width="0.122" height="0.12">' +
        '<rect width="0.122" height="0.12" class="gw-pat-fondo2"/><circle cx="0.061" cy="0.06" r="0.034" class="gw-pat-manopola"/>' +
        '<rect x="0.058" y="0.03" width="0.006" height="0.03" class="gw-pat-indice"/><circle cx="0.012" cy="0.012" r="0.007" class="gw-pat-presa"/></pattern>' +
      '<pattern id="' + id + '-luci" patternUnits="userSpaceOnUse" width="0.06" height="0.055">' +
        '<rect width="0.06" height="0.055" class="gw-pat-fondo"/><circle cx="0.03" cy="0.027" r="0.012" class="gw-pat-luce"/></pattern>' +
      '<pattern id="' + id + '-schede" patternUnits="userSpaceOnUse" x="0.04" y="-1.05" width="0.034" height="0.46">' +
        '<rect width="0.034" height="0.46" class="gw-pat-fume"/><rect x="0.006" y="0.03" width="0.022" height="0.4" class="gw-pat-scheda"/></pattern>';
  }

  function personaMondo() {
    return '<path class="gw-persona" d="' + PERSONA_D + '"/><circle class="gw-persona" cx="0" cy="-1.645" r="0.105"/>';
  }

  function scrivaniaMondo(S) {
    const x0 = S.x, w = S.larghezza, a = S.altezza;
    return R(x0, a - 0.035, w, 0.035, 'gw-legno gw-l') + R(x0 + 0.04, 0, 0.05, a - 0.035, 'gw-legno2 gw-l') +
      R(x0 + w - 0.09, 0, 0.05, a - 0.035, 'gw-legno2 gw-l') + R(x0 + 0.09, a - 0.09, w - 0.18, 0.055, 'gw-legno2 gw-l');
  }

  const DISEGNI = {
    // 40 pannelli in fila (0,75 m l'uno, compresi i montanti): circa 30 m.
    eniac(id) {
      const o = [];
      const colori = ['gw-c1', 'gw-c2', 'gw-c3'];
      for (let k = 0; k < 40; k++) {
        const x = k * 0.75;
        o.push(R(x + 0.02, 0, 0.71, 2.4, 'gw-telaio gw-l'));
        o.push(R(x + 0.07, 1.18, 0.61, 0.84, 'gw-valvole', ' fill="url(#' + id + '-valv)"'));
        o.push(R(x + 0.07, 0.34, 0.61, 0.72, 'gw-comm', ' fill="url(#' + id + '-comm)"'));
        o.push(R(x + 0.06, 2.1, 0.63, 0.22, 'gw-testata'));
        for (let j = 0; j < 8; j++) o.push(C(x + 0.13 + j * 0.07, 2.21, 0.021, 'gw-neon' + ((k * 3 + j * 5) % 7 < 3 ? ' on' : '')));
        o.push(R(x + 0.02, 0, 0.71, 0.08, 'gw-zoccolo'));
        if (k < 39 && k % 2 === 0) o.push(cavoM(x + 0.5, 0.86, x + 1.0, 0.62, 0.3, colori[(k / 2) % 3]));
      }
      return o.join('');
    },

    // Unità centrale in scala (4,3 × 2,6 m); console e unità a nastro indicative.
    univac(id) {
      const o = [];
      o.push(R(0, 0, 1.6, 0.74, 'gw-crema gw-l'), Q([[0.04, 0.74], [1.56, 0.74], [1.44, 1.18], [0.16, 1.18]], 'gw-crema2 gw-l'));
      o.push(R(0.24, 0.84, 1.12, 0.24, 'gw-luci', ' fill="url(#' + id + '-luci)"'));
      o.push(R(2.0, 0, 4.3, 2.6, 'gw-grigio gw-l'), R(2.0, 2.36, 4.3, 0.24, 'gw-grigio2 gw-l'));
      for (let k = 0; k < 6; k++) {
        const x = 2.1 + k * 0.7;
        o.push(R(x, 0.16, 0.64, 2.1, 'gw-anta gw-l'));
        o.push(R(x + 0.09, 1.12, 0.46, 0.9, 'gw-finestra gw-l', ' fill="url(#' + id + '-valv)"'));
        o.push(R(x + 0.52, 0.7, 0.04, 0.2, 'gw-maniglia'));
      }
      o.push(R(2.0, 0, 4.3, 0.1, 'gw-zoccolo'));
      o.push(R(6.7, 0, 0.8, 1.65, 'gw-grigio gw-l'), R(6.76, 0.48, 0.68, 1.08, 'gw-vetro gw-l'));
      [1.3, 0.78].forEach((cy, j) => {
        o.push('<g class="gw-bobina" data-cx="7.1" data-cy="' + cy + '">' + C(7.1, cy, 0.2, 'gw-bobina-disco gw-l') + C(7.1, cy, j ? 0.1 : 0.14, 'gw-bobina-nastro') +
          C(7.1, cy, 0.05, 'gw-mozzo') + [0, 120, 240].map((a) => C(7.1 + Math.cos(a * Math.PI / 180) * 0.14, cy + Math.sin(a * Math.PI / 180) * 0.14, 0.028, 'gw-foro')).join('') + '</g>');
      });
      o.push(R(7.29, 0.78, 0.012, 0.52, 'gw-nastro'), R(6.7, 0, 0.8, 0.08, 'gw-zoccolo'));
      return o.join('');
    },

    // Lettore e perforatore di schede 1402, unità centrale 1401, stampante 1403 (sagome approssimate).
    ibm1401() {
      const o = [];
      o.push(R(0, 0, 1.3, 1.0, 'gw-ibm gw-l'), R(0.12, 1.0, 0.3, 0.2, 'gw-ibm2 gw-l'), R(0.88, 1.0, 0.3, 0.2, 'gw-ibm2 gw-l'));
      for (let k = 0; k < 5; k++) o.push(R(0.1 + k * 0.23, 0.6, 0.18, 0.07, 'gw-scuro'));
      o.push(R(0.08, 0.12, 1.14, 0.38, 'gw-ibm-blu gw-l'), R(0, 0, 1.3, 0.06, 'gw-zoccolo'));
      o.push(R(1.5, 0, 1.4, 1.4, 'gw-ibm gw-l'), R(1.58, 1.0, 1.24, 0.32, 'gw-pannello gw-l'));
      for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) o.push(R(1.66 + c * 0.112, 1.07 + r * 0.08, 0.05, 0.035, 'gw-luce' + ((r * 4 + c * 3) % 5 < 2 ? ' on' : '')));
      o.push(R(1.6, 0.1, 0.56, 0.84, 'gw-ibm-blu gw-l'), R(2.24, 0.1, 0.56, 0.84, 'gw-ibm-blu gw-l'), R(1.5, 0, 1.4, 0.06, 'gw-zoccolo'));
      o.push(R(3.1, 0, 1.3, 0.98, 'gw-ibm gw-l'), Q([[3.1, 0.98], [4.4, 0.98], [4.3, 1.25], [3.2, 1.25]], 'gw-ibm2 gw-l'));
      o.push(R(3.3, 1.25, 0.9, 0.025, 'gw-carta'), R(3.28, 0.07, 0.94, 0.34, 'gw-carta gw-l'));
      for (let k = 1; k < 5; k++) o.push(R(3.28, 0.07 + k * 0.068, 0.94, 0.006, 'gw-righe-carta'));
      o.push(R(3.1, 0, 1.3, 0.06, 'gw-zoccolo'));
      return o.join('');
    },

    // Armadio di 61 × 157 cm: porta fumé con le schedine, pannello con 24 lampadine e 12 interruttori.
    pdp8(id) {
      const o = [];
      o.push(R(0, 0, 0.61, 0.08, 'gw-zoccolo'), R(0, 0.08, 0.61, 1.42, 'gw-dec gw-l'));
      o.push(R(0.04, 0.13, 0.53, 0.92, 'gw-fume gw-l', ' fill="url(#' + id + '-schede)"'));
      o.push(R(0.03, 1.1, 0.55, 0.36, 'gw-console gw-l'));
      for (let j = 0; j < 12; j++) {
        o.push(C(0.085 + j * 0.04, 1.39, 0.011, 'gw-led gw-led-ind'));
        o.push(C(0.085 + j * 0.04, 1.31, 0.011, 'gw-led gw-led-acc'));
        o.push(R(0.077 + j * 0.04, 1.15, 0.016, 0.07, (Math.floor(j / 3) % 2 ? 'gw-sw2' : 'gw-sw1')));
      }
      o.push(R(0, 1.5, 0.61, 0.07, 'gw-dec2 gw-l'));
      return o.join('');
    },

    // Unità centrale con due floppy, monitor a fosfori verdi e tastiera, sulla scrivania.
    ibmpc() {
      const b = 0.75, o = [];
      o.push(R(0.33, b, 0.508, 0.14, 'gw-beige gw-l'));
      o.push(R(0.56, b + 0.022, 0.13, 0.09, 'gw-beige2 gw-l'), R(0.7, b + 0.022, 0.13, 0.09, 'gw-beige2 gw-l'));
      o.push(R(0.57, b + 0.07, 0.11, 0.008, 'gw-scuro'), R(0.71, b + 0.07, 0.11, 0.008, 'gw-scuro'));
      o.push(R(0.36, b + 0.104, 0.05, 0.016, 'gw-scuro'));
      o.push(R(0.395, b + 0.14, 0.39, 0.3, 'gw-beige gw-l'), R(0.418, b + 0.165, 0.344, 0.252, 'gw-cornice'));
      o.push(R(0.432, b + 0.18, 0.316, 0.222, 'gw-schermo'));
      [0.2, 0.14, 0.24, 0.1, 0.18, 0.12].forEach((w, k) => o.push(R(0.45, b + 0.37 - k * 0.028, w, 0.01, 'gw-fosforo')));
      o.push(R(0.45, b + 0.37 - 6 * 0.028, 0.012, 0.014, 'gw-fosforo gw-cursore'));
      o.push(R(0.36, b, 0.46, 0.038, 'gw-beige2 gw-l'), R(0.38, b + 0.026, 0.42, 0.006, 'gw-tasti'));
      return o.join('');
    },

    // Portatile aperto, largo 30 cm.
    portatile() {
      const b = 0.75, o = [];
      o.push(R(0.5, b, 0.3, 0.012, 'gw-alluminio gw-l'), R(0.507, b + 0.012, 0.286, 0.198, 'gw-alluminio2 gw-l'));
      o.push(R(0.515, b + 0.022, 0.27, 0.178, 'gw-schermo2'));
      o.push(R(0.515, b + 0.19, 0.27, 0.01, 'gw-ui-barra'));
      o.push(R(0.53, b + 0.075, 0.115, 0.095, 'gw-ui-fin1'), R(0.6, b + 0.04, 0.165, 0.11, 'gw-ui-fin2'));
      o.push(R(0.615, b + 0.07, 0.135, 0.01, 'gw-ui-traccia'), R(0.615, b + 0.07, 0.081, 0.01, 'gw-ui-progresso'));
      o.push(R(0.615, b + 0.1, 0.1, 0.008, 'gw-ui-testo'), R(0.615, b + 0.115, 0.07, 0.008, 'gw-ui-testo'));
      return o.join('');
    },

    // Smartphone in piedi su un supporto: 15 × 7,2 cm.
    smartphone() {
      const b = 0.75, o = [];
      o.push(Q([[0.583, b], [0.689, b], [0.68, b + 0.014], [0.592, b + 0.014]], 'gw-supporto gw-l'));
      o.push(R(0.6, b + 0.012, 0.072, 0.15, 'gw-telefono gw-l', ' rx="0.009"'));
      o.push(R(0.6035, b + 0.0155, 0.065, 0.143, 'gw-schermo2', ' rx="0.0065"'));
      const colori = ['gw-ic1', 'gw-ic2', 'gw-ic3', 'gw-ic4', 'gw-ic5', 'gw-ic6'];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) o.push(R(0.609 + c * 0.0148, b + 0.13 - r * 0.02, 0.0105, 0.0105, colori[(r * 4 + c) % 6], ' rx="0.0028"'));
      o.push(R(0.627, b + 0.152, 0.018, 0.0045, 'gw-scuro', ' rx="0.0022"'));
      o.push(C(0.6545, b + 0.1405, 0.004, 'gw-ping'));
      return o.join('');
    },
  };

  function creaLaboratorio(el, ctx) {
    const M = (root.StoriaPCModelli || {}).giganti;
    if (!M) throw new Error('Modello del capitolo 1 non caricato');
    const h = ctx.h, s = ctx.s;
    const N = M.MACCHINE.length;
    const id = ctx.uid('gig');
    const SOSTA = 4200;   // ms di sosta su ogni macchina durante il viaggio nel tempo

    const st = {
      i: 0, modo: 'largo', W: 0, H: 0,
      cam: null, mov: null, coda: [], attesaFino: 0,
      attivo: false, primaVolta: true, tour: false, timer: 0,
      ultimo: 0, contatore: 0, angolo: 0,
    };

    /* ----- comandi ----- */

    const bottoni = M.MACCHINE.map((m, i) => h('button', { type: 'button', class: 'gig-epoca', 'aria-pressed': 'false', onclick: () => { fermaTour(); scegli(i); } },
      h('span', { class: 'gig-epoca-anno' }, m.epoca), ' ', h('span', { class: 'gig-epoca-nome' }, m.nome)));
    const epoche = h('div', { class: 'lab-seg gig-epoche', role: 'group', 'aria-label': 'Scegli la macchina' }, bottoni);
    // aria-label: sui telefoni la scritta «Epoca» dell'etichetta è nascosta
    const cursore = h('input', { type: 'range', min: '0', max: String(N - 1), step: '1', value: '0', id: id + '-cursore', 'aria-label': 'Epoca',
      oninput: (e) => { fermaTour(); scegli(Number(e.target.value)); } });
    const prec = h('button', { type: 'button', class: 'lab-btn gig-freccia', 'aria-label': 'Macchina precedente', onclick: () => { if (st.i > 0) { fermaTour(); scegli(st.i - 1); } } }, '←');
    const succ = h('button', { type: 'button', class: 'lab-btn gig-freccia', 'aria-label': 'Macchina successiva', onclick: () => { if (st.i < N - 1) { fermaTour(); scegli(st.i + 1); } } }, '→');
    // pulsante avvia/ferma: cambia la scritta (non è un interruttore con aria-pressed); l'icona è decorativa
    const tour = h('button', { type: 'button', class: 'lab-btn primary gig-tour', onclick: () => (st.tour ? fermaTour() : avviaTour()) });
    function scrittaTour(inCorso) {
      tour.classList.toggle('in-corso', inCorso);
      tour.replaceChildren(h('span', { class: 'gig-tour-icona', 'aria-hidden': 'true' }, inCorso ? '❚❚' : '▶'), inCorso ? 'Ferma il viaggio' : 'Viaggio nel tempo');
    }
    scrittaTour(false);
    const btnLargo = h('button', { type: 'button', 'aria-pressed': 'true', onclick: () => { fermaTour(); inquadra('largo'); } }, 'Con la persona');
    const btnVicino = h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => { fermaTour(); inquadra('vicino'); } }, 'Da vicino');

    /* ----- palco ----- */

    const svg = s('svg', { class: 'gig-palco', viewBox: '0 0 800 370', role: 'img', 'aria-label': 'Scena in scala' });
    const defs = s('defs');
    defs.innerHTML = motivi(id);
    const sfondo = s('rect', { class: 'gig-sfondo', x: 0, y: 0, width: 800, height: 370 });
    const grFine = s('path', { class: 'gig-griglia' });
    const grGrossa = s('path', { class: 'gig-griglia' });
    const anno = s('text', { class: 'gig-anno', 'text-anchor': 'end' }, '1946');
    const terra = s('rect', { class: 'gig-terra', x: 0, y: 300, width: 800, height: 70 });
    const lineaTerra = s('path', { class: 'gig-linea-terra' });
    const mondo = s('g', { class: 'gig-mondo' });
    const gScrivania = s('g', { class: 'gig-oggetto' });
    gScrivania.innerHTML = scrivaniaMondo(M.SCRIVANIA);
    const gMacchine = M.MACCHINE.map((m) => {
      const g = s('g', { class: 'gig-oggetto gig-m-' + m.id });
      g.innerHTML = DISEGNI[m.id](id);
      return g;
    });
    const gPersona = s('g', { class: 'gig-persona-mondo' });
    gPersona.innerHTML = personaMondo();
    mondo.append(gScrivania, ...gMacchine, gPersona);

    const quotaLinea = s('path', { class: 'gig-quota-linea' });
    const quotaTesto = s('text', { class: 'gig-quota-testo' }, '1,75 m');
    const quota = s('g', { class: 'gig-quota' }, quotaLinea, quotaTesto);
    // quota orizzontale sul pavimento: quanto è larga la macchina (ENIAC, UNIVAC I, PDP-8)
    const larghLinea = s('path', { class: 'gig-largh-linea' });
    const larghTesto = s('text', { class: 'gig-largh-testo', 'text-anchor': 'middle' });
    const larghezza = s('g', { class: 'gig-quota' }, larghLinea, larghTesto);
    const etNome = s('text', { class: 'gig-et-nome', 'text-anchor': 'middle' });
    const etMisura = s('text', { class: 'gig-et-misura', 'text-anchor': 'middle' });
    const etLinea = s('path', { class: 'gig-et-linea' });
    const etichetta = s('g', { class: 'gig-etichetta' }, etLinea, etNome, etMisura);
    const scalaBarra = s('path', { class: 'gig-scala-barra' });
    const scalaTesto = s('text', { class: 'gig-scala-testo' });
    const campo = s('text', { class: 'gig-campo' });
    svg.append(defs, sfondo, grFine, grGrossa, anno, terra, lineaTerra, mondo, quota, larghezza, etichetta, s('g', null, scalaBarra, scalaTesto), campo);
    // sugli schermi stretti nome e misura della macchina stanno in una riga sotto la scena
    const didascalia = h('p', { class: 'gig-didascalia', 'aria-hidden': 'true' });
    const palco = h('div', { class: 'gig-palco-box' }, svg, didascalia);

    // elementi animati delle singole macchine
    const neon = [...gMacchine[0].querySelectorAll('.gw-neon')];
    const bobine = [...gMacchine[1].querySelectorAll('.gw-bobina')];
    const luci1401 = [...gMacchine[2].querySelectorAll('.gw-luce')];
    const ledInd = [...gMacchine[3].querySelectorAll('.gw-led-ind')];
    const ledAcc = [...gMacchine[3].querySelectorAll('.gw-led-acc')];
    const cursorePc = gMacchine[4].querySelector('.gw-cursore');
    const progresso = gMacchine[5].querySelector('.gw-ui-progresso');
    const ping = gMacchine[6].querySelector('.gw-ping');

    /* ----- letture: barre logaritmiche e schede ----- */

    const barre = M.CHIAVI.map((k) => {
      const g = M.GRANDEZZE[k];
      const r = {
        k: k,
        val: h('span', { class: 'gig-barra-val' }),
        pieno: h('span', { class: 'gig-barra-pieno' }),
        fascia: h('span', { class: 'gig-barra-fascia' }),
        rif: h('span', { class: 'gig-barra-rif' }),
        frase: h('span', { class: 'gig-barra-frase' }),
      };
      const tacche = h('span', { class: 'gig-barra-tacche' });
      tacche.style.setProperty('--decadi', String(Math.round(Math.log10(g.scala[1] / g.scala[0]))));
      r.riga = h('div', { class: 'gig-barra' },
        h('div', { class: 'gig-barra-testa' }, h('span', { class: 'gig-barra-nome' }, g.nome), r.val),
        h('div', { class: 'gig-barra-binario', 'aria-hidden': 'true' }, tacche, r.fascia, r.pieno, r.rif),
        r.frase);
      r.rif.style.left = (100 * M.confronto(M.RIFERIMENTO, k).rif).toFixed(2) + '%';
      return r;
    });
    const confronto = h('section', { class: 'lab-panel gig-confronto', 'aria-label': 'Confronto con l\'ENIAC' },
      h('div', { class: 'gig-confronto-testa' },
        h('span', null, 'Rispetto all\'ENIAC'),
        h('span', { class: 'gig-legenda' }, h('span', null, h('i', { class: 'gig-leg-macchina' }), 'macchina scelta'), h('span', null, h('i', { class: 'gig-leg-rif' }), 'ENIAC'))),
      barre.map((b) => b.riga),
      h('p', { class: 'gig-piede' }, 'Scala logaritmica: ogni tacca vale 10 volte la precedente. Le operazioni al secondo sono ordini di grandezza: per le macchine antiche si contano le addizioni, per quelle di oggi è una stima.'));

    const kv = {};
    const schedaKv = h('dl', { class: 'lab-kv gig-kv' }, [['anno', 'Anno'], ['tecnologia', 'Tecnologia'], ['prezzo', 'Prezzo dell\'epoca'], ['diffusione', 'Quanti']].map((c) => {
      kv[c[0]] = h('dd');
      return h('div', null, h('dt', null, c[1]), kv[c[0]]);
    }));
    const nota = h('p', { class: 'lab-note gig-nota', 'aria-live': 'polite' });

    el.classList.add('gig-lab');
    el.append(
      h('div', { class: 'gig-comandi' }, epoche,
        h('div', { class: 'gig-riga-comandi' }, prec, h('label', { class: 'lab-range gig-cursore', for: id + '-cursore' }, h('span', null, 'Epoca'), cursore), succ, tour)),
      palco,
      h('div', { class: 'gig-sotto' }, h('div', { class: 'lab-seg gig-modo', role: 'group', 'aria-label': 'Inquadratura della telecamera' }, btnLargo, btnVicino),
        h('p', { class: 'gig-suggerimento' }, 'La persona è alta 1,75 m. La griglia cambia passo a ogni potenza di dieci.')),
      h('div', { class: 'gig-pannelli' }, h('div', { class: 'gig-colonna' }, nota, schedaKv), confronto));

    /* ----- disegno ----- */

    function r2(v) { return Math.round(v * 100) / 100; }

    // Un metro del mondo, in pixel, con l'inquadratura attuale.
    function pxm() { return st.W / st.cam.larghezza; }
    function aSchermo(x, y) {
      const z = pxm();
      return [st.W / 2 + (x - st.cam.cx) * z, st.H / 2 - (y - st.cam.cy) * z];
    }

    function linee(passo, yTerra) {
      const c = st.cam, z = pxm(), d = [];
      const x0 = c.cx - c.larghezza / 2, x1 = c.cx + c.larghezza / 2;
      const alto = st.H / z, y0 = c.cy - alto / 2, y1 = c.cy + alto / 2;
      const fondo = Math.min(st.H, yTerra);
      if (fondo <= 0) return '';
      let k0 = Math.ceil(x0 / passo), k1 = Math.floor(x1 / passo);
      if (k1 - k0 > 400) return '';
      for (let k = k0; k <= k1; k++) d.push('M' + r2(st.W / 2 + (k * passo - c.cx) * z) + ' 0V' + r2(fondo));
      k0 = Math.max(0, Math.ceil(y0 / passo));
      k1 = Math.floor(y1 / passo);
      for (let k = k0; k <= k1 && k - k0 < 400; k++) d.push('M0 ' + r2(st.H / 2 - (k * passo - c.cy) * z) + 'H' + st.W);
      return d.join('');
    }

    function disegna() {
      const c = st.cam, W = st.W, H = st.H, z = pxm();
      const m = M.MACCHINE[st.i];
      mondo.setAttribute('transform', 'translate(' + r2(W / 2 - c.cx * z) + ' ' + r2(H / 2 + c.cy * z) + ') scale(' + (Math.round(z * 1e4) / 1e4) + ')');
      const yTerra = H / 2 + c.cy * z;
      const yt = ctx.clamp(yTerra, -2, H + 2);
      terra.setAttribute('y', r2(yt));
      terra.setAttribute('height', r2(Math.max(0, H - yt)));
      lineaTerra.setAttribute('d', yTerra > -2 && yTerra < H + 2 ? 'M0 ' + r2(yTerra) + 'H' + W : '');
      const g = M.griglia(z);
      grFine.setAttribute('d', linee(g.fine, yTerra));
      grFine.setAttribute('opacity', g.alfaFine.toFixed(3));
      grGrossa.setAttribute('d', linee(g.grossa, yTerra));

      // quota della persona: una linea dai piedi alla testa, se la persona si vede abbastanza
      // la linea sta a sinistra della persona (a destra se manca posto), la scritta sopra la testa
      let lx = aSchermo(m.scena.personaX - M.LARGHEZZA_PERSONA / 2 - 0.08, 0)[0];
      if (lx < 26) lx = aSchermo(m.scena.personaX + M.LARGHEZZA_PERSONA / 2 + 0.08, 0)[0];
      const piediY = aSchermo(0, 0)[1], testaY = aSchermo(0, M.ALTEZZA_PERSONA)[1];
      const vede = piediY - testaY > 34 && testaY > 60 && piediY < H + 2 && lx > 4 && lx < W - 4;
      quota.setAttribute('opacity', vede ? '1' : '0');
      if (vede) {
        const x = r2(lx);
        quotaLinea.setAttribute('d', 'M' + x + ' ' + r2(piediY) + 'V' + r2(testaY) + 'M' + (x - 4) + ' ' + r2(piediY) + 'h8M' + (x - 4) + ' ' + r2(testaY) + 'h8');
        quotaTesto.setAttribute('x', r2(ctx.clamp(lx, 26, W - 26)));
        quotaTesto.setAttribute('y', r2(testaY - 8));
      }

      // larghezza della macchina, misurata nella fascia del pavimento (se c'è posto)
      const qm = m.scena.quota;
      const fascia = H - yTerra;
      let vedeL = false;
      if (qm && fascia >= 20) {
        const xa = aSchermo(qm.x, 0)[0], xb = aSchermo(qm.x + qm.w, 0)[0];
        const vuoto = (st.qW || 40) / 2 + 6;
        vedeL = xb - xa >= 2 * vuoto + 24 && xa > -1 && xb < W + 1;
        if (vedeL) {
          const yq = r2(yTerra + Math.min(14, fascia / 2)), xm = (xa + xb) / 2;
          larghLinea.setAttribute('d', 'M' + r2(xa) + ' ' + r2(yq - 5) + 'V' + r2(yq + 5) + 'M' + r2(xb) + ' ' + r2(yq - 5) + 'V' + r2(yq + 5) +
            'M' + r2(xa) + ' ' + yq + 'H' + r2(xm - vuoto) + 'M' + r2(xm + vuoto) + ' ' + yq + 'H' + r2(xb));
          larghTesto.setAttribute('x', r2(xm));
          larghTesto.setAttribute('y', r2(yq + 4));
        }
      }
      larghezza.setAttribute('opacity', vedeL ? '1' : '0');

      // etichetta della macchina, sopra la sua sagoma (tenuta dentro il quadro)
      const b = m.scena.scatola;
      const a1 = aSchermo(b.x, b.y + b.h), a2 = aSchermo(b.x + b.w, b.y + b.h);
      const meta = (st.etW || 180) / 2 + 10;
      let ex = ctx.clamp((Math.max(a1[0], 0) + Math.min(a2[0], W)) / 2, meta, W - meta);
      let ey = a1[1] - 12;
      let ancora = 'middle';
      let visibile = W >= 520;
      if (ey < 74 && Math.abs(ex - W / 2) < W / 2 - 230) ey = Math.max(ey, 44);
      else if (ey < 74) {
        // niente posto sopra la sagoma: di fianco, se a destra c'è spazio; altrimenti l'etichetta si nasconde
        if (W - (a2[0] + 14) > (st.etW || 180) + 12 && a1[1] + 34 < H - 30) { ex = a2[0] + 14; ey = Math.max(a1[1], 60) + 34; ancora = 'start'; }
        else visibile = false;
      }
      ey = Math.min(ey, H - 40);
      etichetta.setAttribute('opacity', visibile ? '1' : '0');
      etNome.setAttribute('x', r2(ex));
      etNome.setAttribute('y', r2(ey - 16));
      etMisura.setAttribute('x', r2(ex));
      etMisura.setAttribute('y', r2(ey));
      etNome.style.textAnchor = ancora;
      etMisura.style.textAnchor = ancora;
      etLinea.setAttribute('d', ancora === 'middle' && a1[1] - 8 > ey + 4 ? 'M' + r2(ex) + ' ' + r2(ey + 5) + 'V' + r2(a1[1] - 4) : '');

      // barra della scala e larghezza dell'inquadratura
      const sb = M.barraScala(z, 56, 140);
      scalaBarra.setAttribute('d', 'M14 35V41H' + r2(14 + sb.px) + 'V35');
      scalaTesto.setAttribute('x', r2(22 + sb.px));
      scalaTesto.setAttribute('y', 45);
      scalaTesto.textContent = sb.testo;
      const l = c.larghezza;
      campo.textContent = 'inquadratura: ' + (l >= 1 ? M.breve(l) + ' m' : M.breve(l * 100) + ' cm');
    }

    function dimensiona() {
      const W = Math.max(280, Math.round(palco.clientWidth || 800));
      const H = Math.round(ctx.clamp(W * 0.46, 250, 390));
      if (W === st.W && H === st.H && st.cam) return;
      st.W = W;
      st.H = H;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      sfondo.setAttribute('width', W);
      sfondo.setAttribute('height', H);
      terra.setAttribute('width', W);
      const piccolo = W < 520;
      anno.setAttribute('x', W - 14);
      anno.setAttribute('y', piccolo ? 40 : 58);
      anno.setAttribute('font-size', piccolo ? 28 : 54);
      campo.setAttribute('x', 14);
      campo.setAttribute('y', 22);
      palco.classList.toggle('gig-stretto', W < 520);
      // il formato è cambiato: niente movimenti a metà, la telecamera torna all'inquadratura giusta
      st.coda = [];
      st.mov = null;
      st.cam = finale(st.modo);
      aggiornaEtichetta();
      disegna();
    }

    function aspetto() { return st.W / st.H; }
    function finale(modo) {
      const m = M.MACCHINE[st.i];
      return modo === 'vicino' ? M.inquadraturaVicina(m, aspetto()) : M.inquadraturaLarga(m, aspetto());
    }

    function aggiornaEtichetta() {
      const m = M.MACCHINE[st.i];
      const nome = m.nome + (m.epoca === 'oggi' ? ', oggi' : ' · ' + m.anno);
      const misura = m.scena.misura + (m.scena.indicativa ? ' (' + m.scena.indicativa + ')' : '');
      larghTesto.textContent = m.scena.quota ? m.scena.quota.testo : '';
      etNome.textContent = nome;
      etMisura.textContent = st.W >= 640 ? misura : m.scena.misura;
      didascalia.replaceChildren(h('strong', null, nome), ' · ' + misura);
      anno.textContent = m.epoca;
      // larghezza vera delle scritte, per tenerle dentro il quadro
      let w = 0;
      try { w = Math.max(etNome.getComputedTextLength(), etMisura.getComputedTextLength()); } catch (e) { w = 0; }
      try { st.qW = m.scena.quota ? larghTesto.getComputedTextLength() || 0 : 0; } catch (e) { st.qW = 0; }
      st.etW = w || Math.max(nome.length * 8, etMisura.textContent.length * 7.3);
    }

    function descrivi() {
      const m = M.MACCHINE[st.i];
      const l = st.cam.larghezza;
      svg.setAttribute('aria-label', 'Scena in scala: ' + m.nome + ', ' + m.scena.misura + ', accanto a una persona alta 1,75 m. ' +
        (st.modo === 'vicino' ? 'Inquadratura da vicino' : 'Inquadratura con la persona') + ', larga ' + (l >= 1 ? M.breve(l) + ' metri.' : M.breve(l * 100) + ' centimetri.'));
    }

    /* ----- stato ----- */

    function impostaModo(modo) {
      st.modo = modo;
      btnLargo.setAttribute('aria-pressed', String(modo === 'largo'));
      btnVicino.setAttribute('aria-pressed', String(modo === 'vicino'));
    }

    function aggiornaLetture(m) {
      barre.forEach((b) => {
        const c = M.confronto(m, b.k);
        b.riga.classList.toggle('manca', c.manca);
        if (c.manca) {
          b.val.textContent = 'dato omesso';
          b.frase.textContent = 'Le fonti non concordano: meglio nessun numero che uno inventato.';
          b.pieno.style.transform = 'scaleX(0)';
          b.fascia.style.transform = 'translateX(0) scaleX(0)';
          return;
        }
        b.val.textContent = '≈ ' + c.valore + (b.k === 'ops' ? ' al secondo' : '');
        b.val.title = c.testo;
        b.frase.textContent = c.frase.charAt(0).toUpperCase() + c.frase.slice(1);
        b.pieno.style.transform = 'scaleX(' + c.da.toFixed(4) + ')';
        b.fascia.style.transform = 'translateX(' + (c.da * 100).toFixed(2) + '%) scaleX(' + Math.max(0, c.a - c.da).toFixed(4) + ')';
      });
      kv.anno.textContent = m.epoca === 'oggi' ? 'oggi' : String(m.anno);
      kv.tecnologia.textContent = m.tecnologia;
      kv.prezzo.textContent = m.prezzo;
      kv.diffusione.textContent = m.diffusione;
      nota.innerHTML = m.racconto;
    }

    function aggiornaOggetti() {
      const m = M.MACCHINE[st.i];
      gMacchine.forEach((g, j) => g.classList.toggle('on', j === st.i));
      gScrivania.classList.toggle('on', !!m.scena.scrivania);
      gPersona.setAttribute('transform', 'translate(' + m.scena.personaX + ' 0)');
    }

    function aggiornaComandi() {
      const m = M.MACCHINE[st.i];
      bottoni.forEach((b, k) => b.setAttribute('aria-pressed', String(k === st.i)));
      cursore.value = String(st.i);
      cursore.setAttribute('aria-valuetext', m.epoca + ', ' + m.nome);
      prec.setAttribute('aria-disabled', String(st.i === 0));
      succ.setAttribute('aria-disabled', String(st.i === N - 1));
    }

    // Sceglie una macchina; scegliere di nuovo la stessa ripete il movimento della telecamera.
    function scegli(i) {
      const j = ctx.clamp(Math.round(i), 0, N - 1);
      const cambia = j !== st.i;
      st.i = j;
      const m = M.MACCHINE[j];
      aggiornaComandi();
      if (cambia) {
        aggiornaOggetti();
        aggiornaEtichetta();
        aggiornaLetture(m);
      }
      const passi = M.percorso(m, aspetto());
      if (ctx.ridotto()) {
        // movimento ridotto: nessun volo della telecamera, subito la scena con la persona
        st.coda = [];
        st.mov = null;
        impostaModo('largo');
        st.cam = finale('largo');
        disegna();
        descrivi();
      } else if (!st.attivo) {
        st.coda = [];
        st.mov = null;
        const ultimo = passi[passi.length - 1];
        impostaModo(ultimo.modo);
        st.cam = ultimo.cam;
        disegna();
        descrivi();
      } else {
        st.mov = null;
        st.attesaFino = 0;
        st.coda = passi.slice();
        ciclo.start();
      }
    }

    function inquadra(modo) {
      impostaModo(modo);
      const dest = finale(modo);
      if (ctx.ridotto() || !st.attivo) {
        st.coda = [];
        st.mov = null;
        st.cam = dest;
        disegna();
        descrivi();
        return;
      }
      st.mov = null;
      st.attesaFino = 0;
      st.coda = [{ cam: dest, attesa: 0, modo: modo }];
      ciclo.start();
    }

    /* ----- animazione: telecamera e piccoli segni di vita delle macchine ----- */

    function avviaPasso(p, t) {
      st.mov = { da: st.cam, a: p.cam, t0: t, dur: M.durataMovimento(st.cam, p.cam, st.W), attesa: p.attesa };
      impostaModo(p.modo);
    }

    function vivi(t, dt) {
      if (ctx.ridotto()) return;
      const m = M.MACCHINE[st.i];
      if (m.id === 'univac') {
        st.angolo = (st.angolo + dt * 140) % 360;
        bobine.forEach((g, k) => g.setAttribute('transform', 'rotate(' + (k ? -st.angolo * 1.4 : st.angolo).toFixed(1) + ' ' + g.dataset.cx + ' ' + (-Number(g.dataset.cy)) + ')'));
      }
      if (m.id === 'portatile') {
        const k = (t % 2600) / 2600;
        progresso.setAttribute('width', (0.135 * ctx.curve.smooth(Math.min(1, k * 1.25))).toFixed(4));
      }
      if (m.id === 'smartphone') {
        const k = (t % 1800) / 1800;
        ping.setAttribute('r', (0.004 + 0.006 * k).toFixed(4));
        ping.setAttribute('opacity', (1 - k).toFixed(3));
      }
      if (t - st.ultimo < 110) return;
      st.ultimo = t;
      st.contatore++;
      if (m.id === 'eniac') {
        for (let k = 0; k < 18; k++) {
          const e = neon[Math.floor(Math.random() * neon.length)];
          e.classList.toggle('on', Math.random() < 0.45);
        }
      } else if (m.id === 'ibm1401') {
        for (let k = 0; k < 4; k++) luci1401[Math.floor(Math.random() * luci1401.length)].classList.toggle('on');
      } else if (m.id === 'pdp8') {
        const acc = (st.contatore * 37) & 4095, ind = (200 + st.contatore) & 4095;
        ledAcc.forEach((e, k) => e.classList.toggle('on', !!(acc & (1 << (11 - k)))));
        ledInd.forEach((e, k) => e.classList.toggle('on', !!(ind & (1 << (11 - k)))));
      } else if (m.id === 'ibmpc') {
        cursorePc.classList.toggle('spento', Math.floor(t / 530) % 2 === 1);
      }
    }

    const ciclo = ctx.loop((dt, t) => {
      if (!st.mov && st.coda.length && t >= st.attesaFino) avviaPasso(st.coda.shift(), t);
      if (st.mov) {
        const k = Math.min(1, (t - st.mov.t0) / st.mov.dur);
        st.cam = M.telecamera(st.mov.da, st.mov.a, ctx.curve.inOut(k));
        if (k >= 1) {
          st.cam = st.mov.a;
          st.attesaFino = t + st.mov.attesa;
          st.mov = null;
          if (!st.coda.length) descrivi();
        }
        disegna();
      }
      vivi(t, dt);
      // con il movimento ridotto il ciclo serve solo finché c'è un movimento in corso
      return !ctx.ridotto() || !!st.mov || st.coda.length > 0;
    });

    /* ----- viaggio nel tempo: una macchina dopo l'altra ----- */

    function avviaTour() {
      st.tour = true;
      scrittaTour(true);
      scegli(st.i >= N - 1 ? 0 : st.i + 1);
      prossimaTappa();
    }

    function prossimaTappa() {
      clearTimeout(st.timer);
      st.timer = setTimeout(function attendi() {
        if (!st.tour) return;
        if (st.mov || st.coda.length) { st.timer = setTimeout(attendi, 250); return; }
        st.timer = setTimeout(() => {
          if (!st.tour) return;
          if (st.i >= N - 1) { fermaTour(); return; }
          scegli(st.i + 1);
          prossimaTappa();
        }, SOSTA);
      }, 300);
    }

    function fermaTour() {
      clearTimeout(st.timer);
      if (!st.tour) return;
      st.tour = false;
      scrittaTour(false);
    }

    /* ----- avvio ----- */

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => dimensiona()) : null;
    if (ro) ro.observe(palco);
    else window.addEventListener('resize', dimensiona);

    // Prima inquadratura: la persona all'inizio della parete dell'ENIAC (o tutta la scena, con il movimento ridotto).
    st.i = 0;
    aggiornaComandi();
    aggiornaOggetti();
    aggiornaLetture(M.MACCHINE[0]);
    dimensiona();
    if (!ctx.ridotto()) {
      st.cam = M.percorso(M.MACCHINE[0], aspetto())[0].cam;
      disegna();
    }
    descrivi();

    return {
      attiva() {
        st.attivo = true;
        if (ctx.ridotto()) return;
        if (st.primaVolta && st.i === 0) st.coda = M.percorso(M.MACCHINE[0], aspetto()).slice(1);
        st.primaVolta = false;
        ciclo.start();
      },
      sospendi() {
        st.attivo = false;
        ciclo.stop();
        fermaTour();
        if (st.mov || st.coda.length) {
          const ultimo = st.coda.length ? st.coda[st.coda.length - 1] : { cam: st.mov.a, modo: st.modo };
          st.coda = [];
          st.mov = null;
          impostaModo(ultimo.modo);
          st.cam = ultimo.cam;
          disegna();
          descrivi();
        }
      },
      distruggi() {
        ciclo.stop();
        clearTimeout(st.timer);
        if (ro) ro.disconnect();
        else window.removeEventListener('resize', dimensiona);
      },
    };
  }

  /* =====================================================================
   * Il capitolo
   * ===================================================================== */

  P.registra({
    numero: 1,
    id: 'giganti',
    titolo: 'I giganti: dai relè ai transistor',
    breve: 'I giganti',
    periodo: '1937–1965',
    colore: 'var(--era-1)',
    sommario: 'Dai calcolatori umani alle macchine a relè, a valvole e a transistor: Zuse Z3, Colossus, ENIAC, UNIVAC I, IBM 1401, System/360, PDP-8, e il filo italiano della CEP e dell\'Elea 9003.',
    intro: 'Prima di stare su una scrivania, il computer occupava una stanza intera. Tra la fine degli anni Trenta e la metà degli anni Sessanta passò dai relè, interruttori elettromeccanici che impiegano qualche millesimo di secondo a scattare, alle valvole termoioniche, migliaia di volte più rapide, e infine ai transistor. In meno di trent\'anni smise di essere un esperimento unico, costruito per la guerra o per la scienza, e diventò un prodotto che aziende, banche e università potevano comprare o noleggiare.',
    blocchi: [
      {
        tipo: 'testo',
        titolo: 'Quando i computer erano persone',
        paragrafi: [
          'Per secoli la parola inglese <em>computer</em> ha indicato una persona: chi faceva calcoli di mestiere. Osservatori astronomici, uffici di statistica ed eserciti impiegavano squadre di calcolatori, e molto spesso di calcolatrici, che con carta, matita, tavole dei logaritmi e macchine da calcolo meccaniche compilavano lunghe tabelle di numeri. Durante la Seconda guerra mondiale, all\'Università della Pennsylvania, decine di giovani donne calcolavano a mano le traiettorie dei proiettili d\'artiglieria: per una sola traiettoria servivano decine di ore di lavoro.',
          'L\'idea di una macchina che eseguisse da sola una sequenza di calcoli è però più antica. Nel 1834 l\'inglese Charles Babbage cominciò a progettare la sua <strong>macchina analitica</strong>: un «mulino» per fare le operazioni, un «magazzino» per conservare i numeri e schede perforate, prese in prestito dai telai Jacquard, per darle le istruzioni. Non fu mai costruita, ma nel 1840 Babbage la presentò a Torino, e nel 1842 l\'ingegnere militare Luigi Federico Menabrea, futuro presidente del Consiglio, ne pubblicò una descrizione in francese.',
          'Nel 1843 <strong>Ada Lovelace</strong> tradusse quell\'articolo in inglese e lo arricchì di note più lunghe del testo stesso. In una spiegava passo per passo come la macchina avrebbe calcolato i numeri di Bernoulli, ed è per questo che viene spesso considerata la prima programmatrice; in un\'altra intuiva che una macchina simile avrebbe potuto trattare non solo numeri ma qualunque simbolo, perfino le note musicali. Dopo Babbage passò quasi un secolo di calcolatrici meccaniche e di macchine a <a href="../programmazione/index.html#schede">schede perforate</a> per i censimenti, finché alla fine degli anni Trenta ingegneri di Paesi diversi, quasi sempre senza sapere gli uni degli altri, cominciarono a costruire calcolatori automatici con componenti elettrici.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Il tempo dei relè',
        paragrafi: [
          'Il <a href="../elettronica-base/index.html#rele">relè</a> è un interruttore comandato da un elettromagnete: quando la corrente passa nella bobina, una lamella metallica viene attirata e chiude, o apre, un contatto. Collegando migliaia di relè si costruiscono circuiti che contano e confrontano numeri. Il limite è la velocità: una lamella impiega qualche millesimo di secondo per muoversi, e una macchina a relè fa al massimo qualche operazione al secondo.',
          'A Berlino il giovane ingegnere Konrad Zuse aveva costruito una prima macchina, meccanica, nel soggiorno dei genitori: la Z1, del 1938. Il 12 maggio 1941 presentò lo <strong>Z3</strong>: circa 2.600 relè, aritmetica binaria in virgola mobile (il modo di rappresentare numeri molto grandi e molto piccoli che usano anche i computer di oggi) e un programma letto da una pellicola cinematografica perforata. Faceva un\'addizione in meno di un secondo e una moltiplicazione in circa tre.',
          'Lo Z3 è considerato il primo calcolatore programmabile e completamente automatico a entrare davvero in funzione, anche se non sapeva fare salti condizionati, cioè scegliere da solo che cosa fare in base a un risultato. Andò distrutto in un bombardamento nel 1943; una copia costruita all\'inizio degli anni Sessanta dall\'azienda di Zuse è al Deutsches Museum di Monaco di Baviera.',
          'Negli Stati Uniti Howard Aiken, dell\'Università di Harvard, convinse l\'IBM a costruire l\'<strong>Harvard Mark I</strong>, che per l\'IBM si chiamava ASCC (<em>Automatic Sequence Controlled Calculator</em>). Entrato in servizio nel 1944, era lungo circa 15 metri, aveva 765.000 componenti e centinaia di chilometri di fili, e faceva circa tre addizioni al secondo seguendo le istruzioni di un nastro di carta perforato; lavorò per quindici anni.',
          'Qualche anno prima, tra il 1939 e il 1942, all\'Iowa State College John Atanasoff e Clifford Berry avevano costruito l\'<strong>ABC</strong> (<em>Atanasoff-Berry Computer</em>): usava già circa 300 valvole e i numeri binari, ma risolveva un solo tipo di problema, i sistemi di equazioni lineari, e non era programmabile.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Valvole: la velocità elettronica',
        paragrafi: [
          'Una valvola termoionica è un tubo di vetro sotto vuoto: un filamento caldo emette elettroni e una griglia, con una piccola tensione, decide se lasciarli passare. Non ha parti in movimento e può commutare in un milionesimo di secondo, migliaia di volte più in fretta di un relè. In compenso scalda, consuma molta corrente e prima o poi si brucia, come una lampadina.',
          'La prima grande macchina a valvole nacque in segreto. Nel 1943 Tommy Flowers, ingegnere delle poste britanniche, progettò il <strong>Colossus</strong> per aiutare i crittoanalisti di Bletchley Park a forzare il cifrario Lorenz, usato dall\'alto comando tedesco. Il primo esemplare, con circa 1.600 valvole, lavorava già all\'inizio del 1944; il secondo, con 2.400, entrò in servizio il 1º giugno 1944, pochi giorni prima dello sbarco in Normandia. Leggeva un nastro perforato a 5.000 caratteri al secondo e si configurava con spine e interruttori, ma sapeva fare solo il suo lavoro di decrittazione. Alla fine della guerra ce n\'erano dieci; quasi tutti furono smontati e la loro esistenza restò segreta fino alla metà degli anni Settanta.',
          'Negli Stati Uniti l\'esercito aveva bisogno di tavole di tiro. Alla Moore School of Electrical Engineering dell\'Università della Pennsylvania, a Filadelfia, John Mauchly e J. Presper Eckert proposero un calcolatore elettronico e nel 1943 ottennero il contratto. L\'<strong>ENIAC</strong> (<em>Electronic Numerical Integrator and Computer</em>) fu completato alla fine del 1945 e presentato al pubblico nel febbraio 1946. Aveva circa 17.468 valvole, pesava circa 27 tonnellate, assorbiva circa 150 kilowatt (kW) e riempiva una sala di circa 9 × 15 metri con 40 pannelli disposti a U lungo tre pareti. Faceva circa 5.000 addizioni al secondo: alla dimostrazione per la stampa calcolò la traiettoria di un proiettile in meno tempo di quanto il proiettile impiegasse a volare.',
          'L\'ENIAC però non conservava il programma in memoria. Per fargli cambiare problema bisognava ricollegare a mano centinaia di cavi e regolare migliaia di commutatori seguendo schemi su carta: un lavoro che richiedeva giorni. Lo fecero sei giovani donne scelte tra le calcolatrici umane: Kay McNulty, Betty Jennings, Betty Snyder, Marlyn Wescoff, Fran Bilas e Ruth Lichterman. Senza manuali, studiando gli schemi elettrici, impararono a scomporre i problemi in passi che la macchina potesse eseguire, ma alla dimostrazione del 1946 nessuno le presentò alla stampa: il loro ruolo è stato riconosciuto solo decenni dopo. Il passo successivo, mettere le istruzioni nella memoria insieme ai dati, è la storia del <a href="#von-neumann">capitolo 2</a>.',
        ],
      },
      {
        tipo: 'figura',
        larga: true,
        svg: figuraEniac,
        alt: 'Disegno di una sala con i pannelli dell\'ENIAC disposti a U su tre pareti, pieni di valvole, luci, commutatori e cavi colorati; al centro una persona stilizzata, più bassa dei pannelli.',
        didascalia: '<strong>La sala dell\'ENIAC</strong> alla Moore School (ricostruzione schematica). I 40 pannelli, alti circa 2,4 m, correvano a U lungo tre pareti di una sala di circa 9 × 15 m: in alto le luci al neon che mostravano i numeri, al centro le file di valvole, in basso i commutatori e le prese dove si inserivano i cavi del «programma». La persona, alta 1,75 m, dà la scala.',
      },
      {
        tipo: 'numeri',
        items: [
          { valore: 17468, unita: 'valvole', etichetta: 'nell\'ENIAC, accese tutte insieme come lampadine' },
          { valore: 27, unita: 't', etichetta: 'il peso dell\'ENIAC, quanto quattro o cinque elefanti' },
          { valore: 12000, prefisso: 'oltre', unita: 'esemplari', etichetta: 'di IBM 1401 prodotti dal 1959: il computer più diffuso della sua epoca' },
          { valore: 40, prefisso: 'circa', unita: 'Elea 9003', etichetta: 'installati dall\'Olivetti in aziende, banche, università ed enti pubblici' },
        ],
      },
      {
        tipo: 'nota',
        paragrafi: [
          'Il 9 settembre 1947 i tecnici dell\'Harvard Mark II, il successore del Mark I, trovarono una falena incastrata in un relè. La attaccarono con il nastro adesivo sul registro della macchina, con la scritta «First actual case of bug being found», cioè «primo caso reale di <em>bug</em> trovato». La battuta funziona proprio perché <em>bug</em>, «insetto», indicava già da decenni i difetti delle macchine: lo usava Thomas Edison nell\'Ottocento. Grace Hopper, che lavorava in quel gruppo, amava raccontare l\'episodio; la pagina con la falena è conservata allo Smithsonian di Washington.',
          'Un\'altra leggenda racconta che, quando accendevano l\'ENIAC, le luci di Filadelfia si abbassavano. Lo stesso Eckert la definì un\'invenzione giornalistica: 150 kW sono tantissimi per una macchina, ma una goccia nei consumi di una grande città.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Il computer diventa un prodotto',
        paragrafi: [
          'All\'inizio degli anni Cinquanta il calcolatore diventò qualcosa da vendere. Le nuove macchine avevano il programma in memoria e memorie più capienti, come le linee di ritardo a mercurio e i tubi di Williams (le racconta il <a href="#memoria">capitolo 6</a>). Nel febbraio 1951 la britannica Ferranti consegnò all\'Università di Manchester il <strong>Ferranti Mark 1</strong>, considerato il primo computer elettronico per usi generali messo in vendita. Una versione migliorata arrivò nel 1955 a Roma, all\'Istituto Nazionale per le Applicazioni del Calcolo, dove fu battezzata FINAC.',
          'Negli Stati Uniti Eckert e Mauchly avevano fondato una loro azienda, poi comprata dalla Remington Rand. Il 31 marzo 1951 il Census Bureau, l\'ufficio del censimento americano, accettò il primo <strong>UNIVAC I</strong> (<em>Universal Automatic Computer</em>): circa 5.200 valvole, una memoria di 1.000 parole e, novità decisiva, nastri magnetici per leggere e scrivere i dati; ne furono costruiti 46. La sera delle elezioni presidenziali del 4 novembre 1952 la rete televisiva CBS lo usò per prevedere il risultato. Con appena una piccola parte dei voti scrutinati, l\'UNIVAC indicò una vittoria schiacciante di Dwight Eisenhower, 438 grandi elettori contro 93: i responsabili della trasmissione, increduli, all\'inizio non diedero la notizia. Eisenhower ne ottenne 442.',
          'Nello stesso 1951 un\'azienda inglese di sale da tè e prodotti alimentari, la J. Lyons &amp; Co., costruì un computer tutto suo, il <strong>LEO I</strong> (<em>Lyons Electronic Office</em>), ispirato all\'EDSAC di Cambridge. In novembre eseguì il primo lavoro d\'ufficio di routine della storia, i conti della produzione delle panetterie, e poi passò alle buste paga. L\'IBM, che dominava il mercato delle macchine a schede perforate, rispose nel 1952 con l\'<strong>IBM 701</strong>, il suo primo computer elettronico commerciale: ne costruì 19, quasi tutti noleggiati a laboratori governativi e industrie aeronautiche. Era l\'inizio di un predominio che sarebbe durato decenni.',
        ],
      },
      { tipo: 'lab' },
      {
        tipo: 'testo',
        titolo: 'Il transistor cambia tutto',
        paragrafi: [
          'Nel dicembre 1947, ai Bell Labs, John Bardeen e Walter Brattain fecero funzionare il primo transistor, e William Shockley ne inventò presto una versione più pratica. È un interruttore a semiconduttore, senza filamento e senza vuoto: piccolo, freddo, robusto e parco di corrente (come funziona lo racconta la <a href="../porte-logiche/index.html#interruttori">sezione 4</a>). I primi transistor però erano costosi e capricciosi, e per qualche anno le valvole restarono la scelta più sicura.',
          'Un prototipo di computer a transistor funzionò all\'Università di Manchester già nel 1953. Nel 1956 al MIT (Massachusetts Institute of Technology) entrò in funzione il <strong>TX-0</strong>, con circa 3.600 transistor, una memoria a nuclei di ferrite e uno schermo su cui si poteva disegnare con una penna luminosa; passato agli studenti, diventò il terreno di gioco dei primi <em>hacker</em>. Le memorie a nuclei, minuscoli anelli magnetici attraversati da fili, intanto sostituivano tubi e linee di ritardo: ogni anello ricordava un bit anche a corrente spenta.',
          'Alla fine degli anni Cinquanta i transistor arrivarono nei grandi computer commerciali. L\'<strong>IBM 7090</strong>, consegnato dal 1959 come versione a transistor di una macchina a valvole, calcolò le orbite delle capsule spaziali del programma Mercury. Il vero successo però fu l\'<strong>IBM 1401</strong>, annunciato nel 1959 per le aziende: con il suo lettore di schede e una stampante da 600 righe al minuto si noleggiava da 2.500 dollari al mese, e a metà degli anni Sessanta ne erano installati più di 10.000. Nelle somme non era più veloce dell\'ENIAC, ma era affidabile, compatto ed economico, e migliaia di aziende passarono dalle macchine a schede al computer.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Una famiglia di computer e i primi minicomputer',
        paragrafi: [
          'All\'inizio degli anni Sessanta ogni modello di computer aveva istruzioni sue: chi passava a una macchina più grande doveva riscrivere tutti i programmi. Il 7 aprile 1964 l\'IBM annunciò il <strong>System/360</strong>, una famiglia di modelli, dal più piccolo ed economico al più potente, che eseguivano tutti gli stessi programmi. Fu una scommessa enorme: si parlò di circa 5 miliardi di dollari di investimenti, più di quanto l\'azienda incassasse in un anno.',
          'Per riuscirci i progettisti Gene Amdahl, Gerrit Blaauw e Fred Brooks separarono due cose: l\'<strong>architettura</strong>, cioè quello che il programmatore vede (istruzioni, registri, formati dei dati), e la realizzazione, cioè i circuiti che la eseguono più o meno in fretta. Da allora «architettura del computer» è il nome di questo patto tra hardware e software, e i mainframe IBM di oggi eseguono ancora programmi scritti per il System/360. Il System/360 impose anche il <strong>byte</strong> di 8 bit come unità della memoria, quando molte macchine usavano caratteri di 6 bit e parole di 12, 18 o 36.',
          'Mentre l\'IBM puntava sui grandi sistemi, una piccola azienda di Maynard, nel Massachusetts, la Digital Equipment Corporation (DEC), prese la strada opposta. Nel 1965 lanciò il <strong>PDP-8</strong>: un computer a transistor grande come un piccolo frigorifero, a circa 18.000 dollari. Un laboratorio o una fabbrica potevano averne uno tutto per sé, collegarlo ai propri strumenti e usarlo direttamente, senza fare la fila al centro di calcolo. Fu il primo minicomputer di successo: della famiglia PDP-8 si vendettero più di 50.000 esemplari.',
          'Nel 1970 la DEC presentò il PDP-11, in cui processore, memoria e periferiche dialogavano su un unico bus, l\'<a href="../../index.html#/bus/unibus">Unibus</a>: un\'idea che ritroveremo nei personal computer. Nel 1965 un computer costava ancora quanto una casa e serviva personale esperto per usarlo, ma la strada era segnata: componenti sempre più piccoli, presto i circuiti integrati e poi il microprocessore, lo avrebbero portato sulle scrivanie. È la storia del <a href="#primi-pc">capitolo 3</a>.',
        ],
      },
      {
        tipo: 'citazione',
        testo: 'Il termine architettura è usato qui per descrivere gli attributi di un sistema come li vede il programmatore, cioè la struttura concettuale e il comportamento funzionale, distinti dall\'organizzazione dei flussi di dati e dei controlli, dal progetto logico e dalla realizzazione fisica.',
        autore: 'Gene Amdahl, Gerrit Blaauw e Fred Brooks',
        fonte: '«Architecture of the IBM System/360», IBM Journal of Research and Development, 1964 (traduzione)',
      },
      {
        tipo: 'italia',
        titolo: 'Pisa e Ivrea: la CEP e l\'Elea 9003',
        paragrafi: [
          'Nel 1954 l\'Università di Pisa poteva contare su 150 milioni di lire, stanziati dagli enti locali per un acceleratore di particelle che alla fine fu costruito a Frascati. Enrico Fermi, in Italia quell\'estate, consigliò in una lettera al rettore di usarli per una calcolatrice elettronica, utile a tutta la ricerca italiana. Nacque così la <strong>CEP, Calcolatrice Elettronica Pisana</strong>. Un primo prototipo, la «macchina ridotta», funzionò nel 1957: fu il primo calcolatore elettronico progettato e costruito in Italia. La CEP completa, a valvole e transistor, fu inaugurata nel 1961 dal presidente della Repubblica Giovanni Gronchi e lavorò fino al 1969.',
          'Al progetto pisano collaborava l\'Olivetti di Adriano Olivetti, che nel 1955 aprì a Barbaricina, vicino a Pisa, un laboratorio di ricerche elettroniche guidato da Mario Tchou, ingegnere romano di famiglia cinese che aveva insegnato alla Columbia University di New York. Il gruppo si trasferì poi a Borgolombardo, alle porte di Milano, e nel 1959 presentò alla Fiera di Milano l\'<strong>Elea 9003</strong>, tra i primi grandi calcolatori commerciali al mondo interamente a transistor. Il primo esemplare fu installato nel 1960 alla Marzotto di Valdagno; in tutto ne entrarono in funzione una quarantina.',
          'Ettore Sottsass disegnò armadi modulari a misura d\'uomo, invece dei soliti armadi dal pavimento al soffitto, con strisce colorate che indicavano il contenuto di ciascuno, e fece correre i cavi in alto, dentro condotti sospesi, anziché sotto il pavimento: il progetto gli valse il Compasso d\'Oro. Poi la storia si interruppe. Adriano Olivetti morì il 27 febbraio 1960, Mario Tchou il 9 novembre 1961 in un incidente stradale, a 37 anni, e nel 1964 la divisione elettronica fu ceduta all\'americana General Electric. Dal piccolo gruppo rimasto a Ivrea nacque l\'anno dopo la Programma 101, raccontata nel <a href="#primi-pc">capitolo 3</a>.',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraElea,
        alt: 'Disegno di una sala con l\'Olivetti Elea 9003: armadi grigi alti poco meno di una persona, ognuno con una striscia colorata, collegati in alto da condotti per i cavi; a sinistra una grande console di comando, a destra due unità a nastro con le bobine.',
        didascalia: '<strong>Una sala con l\'Elea 9003</strong> (disegno schematico). Gli armadi modulari di Ettore Sottsass sono a misura d\'uomo e una striscia colorata ne indica il contenuto; i cavi corrono in alto, dentro condotti sospesi. A sinistra la console di comando, a destra le unità a nastro magnetico.',
      },
      {
        tipo: 'schede',
        titolo: 'Macchine, persone, date',
        items: [
          { anno: 1843, nome: 'Le note di Ada Lovelace', luogo: 'Londra, Regno Unito', testo: 'Traducendo l\'articolo di Luigi Federico Menabrea sulla macchina analitica di Babbage, Ada Lovelace descrive passo per passo il calcolo dei numeri di Bernoulli.' },
          { anno: 1941, nome: 'Zuse Z3', luogo: 'Berlino, Germania', testo: 'Circa 2.600 relè, aritmetica binaria in virgola mobile e programma su pellicola perforata: è considerato il primo calcolatore programmabile completamente automatico. Distrutto in un bombardamento nel 1943.' },
          { anno: 1944, nome: 'Colossus', luogo: 'Bletchley Park, Regno Unito', testo: 'Le valvole di Tommy Flowers aiutano a decrittare il cifrario Lorenz dell\'alto comando tedesco. La sua esistenza resta segreta per trent\'anni.' },
          { anno: 1946, nome: 'ENIAC', luogo: 'Filadelfia, Stati Uniti', testo: 'Presentato in febbraio: 17.468 valvole, circa 27 tonnellate, 5.000 addizioni al secondo. Si programma ricollegando cavi e commutatori.' },
          { anno: 1951, nome: 'Ferranti Mark 1', luogo: 'Manchester, Regno Unito', testo: 'Consegnato in febbraio all\'Università di Manchester: il primo computer elettronico per usi generali messo in vendita.' },
          { anno: 1951, nome: 'UNIVAC I', luogo: 'Stati Uniti', testo: 'Il primo esemplare va all\'ufficio del censimento americano. Legge e scrive i dati su nastro magnetico; nel 1952 prevede in televisione la vittoria di Eisenhower.' },
          { anno: 1951, nome: 'LEO I', luogo: 'Londra, Regno Unito', testo: 'Il computer della catena di sale da tè J. Lyons &amp; Co. esegue il primo lavoro d\'ufficio di routine: i conti delle panetterie.' },
          { anno: 1959, nome: 'IBM 1401', luogo: 'Stati Uniti', testo: 'Computer a transistor per le aziende, in affitto da 2.500 dollari al mese: a metà degli anni Sessanta ne sono installati più di 10.000.' },
          { anno: 1959, nome: 'Olivetti Elea 9003', luogo: 'Borgolombardo, Milano', italia: true, testo: 'Presentato alla Fiera di Milano: tra i primi grandi calcolatori commerciali interamente a transistor, con il design di Ettore Sottsass.' },
          { anno: 1961, nome: 'CEP, Calcolatrice Elettronica Pisana', luogo: 'Pisa', italia: true, testo: 'Nata da un consiglio di Enrico Fermi del 1954, è inaugurata dal presidente della Repubblica Giovanni Gronchi.' },
          { anno: 1964, nome: 'IBM System/360', luogo: 'Stati Uniti', testo: 'Annunciato il 7 aprile: una famiglia di modelli che eseguono gli stessi programmi. Nasce l\'idea di architettura e si afferma il byte di 8 bit.' },
          { anno: 1965, nome: 'DEC PDP-8', luogo: 'Maynard, Massachusetts, Stati Uniti', testo: 'Il primo minicomputer di successo: a transistor, grande come un piccolo frigorifero, costa circa 18.000 dollari.' },
        ],
      },
    ],
    lab: {
      titolo: 'Il computer che si rimpicciolisce',
      sottotitolo: 'Sette macchine in scala accanto a una persona alta 1,75 m, dal 1946 a oggi',
      crea: creaLaboratorio,
    },
    punti: [
      '<em>Computer</em> era un mestiere: persone che calcolavano a mano. Le prime macchine nacquero per sostituirle nei calcoli lunghi e ripetitivi, come tavole di tiro, censimenti e cifrari.',
      'I relè (Z3, Harvard Mark I) facevano poche operazioni al secondo; le valvole (Colossus, ENIAC) migliaia, in cambio di macchine enormi, assetate di corrente e programmate a mano con cavi e interruttori.',
      'Dal 1951 il computer esce dai laboratori: si vende (Ferranti Mark 1, UNIVAC I, IBM 701) e lavora negli uffici (LEO I), con il programma in memoria e i primi nastri magnetici.',
      'Il transistor rende i computer più piccoli, affidabili ed economici: l\'IBM 1401 entra in migliaia di aziende; in Italia, accanto alla CEP di Pisa, l\'Olivetti costruisce l\'Elea 9003, tutto a transistor.',
      'Con il System/360 (1964) nasce l\'idea di architettura, una famiglia di modelli diversi che esegue gli stessi programmi, e si afferma il byte di 8 bit; il PDP-8 (1965) apre l\'era dei minicomputer.',
    ],
    collegamenti: [
      { testo: 'Unibus: il bus del PDP-11', href: '../../index.html#/bus/unibus', tipo: 'buslab' },
      { testo: 'Sezione 1 · Il relè', href: '../elettronica-base/index.html#rele', tipo: 'sezione' },
      { testo: 'Sezione 4 · Relè, valvole e transistor come interruttori', href: '../porte-logiche/index.html#interruttori', tipo: 'sezione' },
      { testo: 'Sezione 7 · Programmare con i cavi', href: '../programmazione/index.html#cavi', tipo: 'sezione' },
      { testo: 'Sezione 7 · Le schede perforate', href: '../programmazione/index.html#schede', tipo: 'sezione' },
      { testo: 'Capitolo 2 · Il programma memorizzato', href: '#von-neumann', tipo: 'sezione' },
      { testo: 'Capitolo 6 · Nuclei di ferrite e altre memorie', href: '#memoria', tipo: 'sezione' },
      { testo: 'Quiz sul capitolo', href: '../quiz/index.html#storia-pc/giganti', tipo: 'sezione' },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
