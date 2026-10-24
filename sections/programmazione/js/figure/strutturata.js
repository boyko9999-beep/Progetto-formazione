/*
 * Illustrazioni del capitolo 7 · La crisi del software.
 *   apollo-dsky        il DSKY dell'Apollo con la spia PROG accesa e l'allarme 1202 sul display
 *   listati-hamilton   la pila di listati alta quanto una persona (ricostruzione della foto del 1969)
 *   memoria-a-fili     la memoria a fili intrecciati: dentro l'anello 1, intorno 0
 * Disegni a tratto in SVG 800 × 500 con la tavolozza --fig-* (si adattano al tema scuro).
 * Nessun accesso al DOM al caricamento: disegna() restituisce solo una stringa.
 */
(function (root) {
  'use strict';

  const f = (x) => String(Math.round(x * 100) / 100);
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ---------------- DSKY ---------------- */

  // Cifra a sette segmenti: i segmenti spenti restano appena visibili, come sul display elettroluminescente.
  const SEGMENTI = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  function cifra(c, x, y, w, hgt, classe) {
    const t = 3.4;
    const m = hgt / 2;
    const vh = m - t * 1.1;
    const pezzi = {
      a: [x + t * 0.7, y, w - t * 1.4, t],
      g: [x + t * 0.7, y + m - t / 2, w - t * 1.4, t],
      d: [x + t * 0.7, y + hgt - t, w - t * 1.4, t],
      f: [x, y + t * 0.8, t, vh],
      b: [x + w - t, y + t * 0.8, t, vh],
      e: [x, y + m + t * 0.3, t, vh],
      c: [x + w - t, y + m + t * 0.3, t, vh],
    };
    const accesi = c === ' ' ? '' : (SEGMENTI[c] || '');
    return Object.keys(pezzi).map((k) => {
      const [px, py, pw, ph] = pezzi[k];
      return '<rect class="' + (accesi.includes(k) ? classe : 'fig-apollo-dsky-spento') + '" x="' + f(px) + '" y="' + f(py) + '" width="' + f(pw) + '" height="' + f(ph) + '" rx="1.4"/>';
    }).join('');
  }
  function numero(testo, x, y, w, hgt, passo, classe) {
    return [...testo].map((c, i) => cifra(c, x + i * passo, y, w, hgt, classe)).join('');
  }

  function spia(x, y, righe, accesa) {
    const testo = righe.map((r, i) => '<text class="fig-apollo-dsky-spia-t' + (accesa ? ' is-accesa' : '') + '" x="' + (x + 32) + '" y="' + f(y + (righe.length === 1 ? 14 : 9.5 + i * 9)) + '">' + r + '</text>').join('');
    return '<rect class="' + (accesa ? 'fig-apollo-dsky-prog' : 'fig-apollo-dsky-spia') + '" x="' + x + '" y="' + y + '" width="64" height="21" rx="3"/>' + testo;
  }

  function tasto(x, y, etichetta) {
    const parole = etichetta.split(' ');
    const grande = /^[0-9+−]$/.test(etichetta);
    const testo = grande
      ? '<text class="fig-apollo-dsky-tasto-n" x="' + (x + 20) + '" y="' + (y + 27) + '">' + etichetta + '</text>'
      : parole.map((p, i) => '<text class="fig-apollo-dsky-tasto-t" x="' + (x + 20) + '" y="' + f(y + (parole.length === 1 ? 24 : 19 + i * 11)) + '">' + p + '</text>').join('');
    return '<rect class="fig-apollo-dsky-ombra" x="' + x + '" y="' + (y + 3) + '" width="40" height="40" rx="6"/>' +
      '<rect class="fig-apollo-dsky-tasto" x="' + x + '" y="' + y + '" width="40" height="40" rx="6"/>' + testo;
  }

  function richiamo(x1, y1, punti, titolo, sotto, tx, ty, ancora) {
    const linea = '<polyline class="fig-apollo-dsky-filo" points="' + [[x1, y1]].concat(punti).map((p) => p.join(',')).join(' ') + '"/>';
    const fine = punti[punti.length - 1];
    return linea + '<circle class="fig-apollo-dsky-punto" cx="' + fine[0] + '" cy="' + fine[1] + '" r="4"/>' +
      '<text class="fig-apollo-dsky-titolo" x="' + tx + '" y="' + ty + '" text-anchor="' + ancora + '">' + esc(titolo) + '</text>' +
      '<text class="fig-apollo-dsky-sotto" x="' + tx + '" y="' + (ty + 21) + '" text-anchor="' + ancora + '">' + esc(sotto) + '</text>';
  }

  function dsky() {
    const out = [];
    // la scatola
    out.push('<rect class="fig-apollo-dsky-cassa" x="210" y="26" width="380" height="448" rx="16"/>');
    out.push('<rect class="fig-apollo-dsky-bordo" x="220" y="36" width="360" height="428" rx="10"/>');
    for (const [x, y] of [[229, 45], [571, 45], [229, 455], [571, 455]]) {
      out.push('<circle class="fig-apollo-dsky-vite" cx="' + x + '" cy="' + y + '" r="5"/><path class="fig-apollo-dsky-taglio" d="M' + (x - 3) + ' ' + (y + 3) + 'L' + (x + 3) + ' ' + (y - 3) + '"/>');
    }
    // le spie (modulo lunare): due colonne da sette
    out.push('<rect class="fig-apollo-dsky-pannello" x="232" y="52" width="152" height="200" rx="5"/>');
    const sinistra = [['UPLINK', 'ACTY'], ['NO ATT'], ['STBY'], ['KEY REL'], ['OPR ERR'], [], []];
    const destra = [['TEMP'], ['GIMBAL', 'LOCK'], ['PROG'], ['RESTART'], ['TRACKER'], ['ALT'], ['VEL']];
    for (let i = 0; i < 7; i++) {
      const y = 60 + i * 27;
      out.push(spia(240, y, sinistra[i], false));
      out.push(spia(312, y, destra[i], i === 2));
    }
    out.push('<rect class="fig-apollo-dsky-alone" x="306" y="108" width="76" height="33" rx="8"/>');
    // il display elettroluminescente
    out.push('<rect class="fig-apollo-dsky-el" x="396" y="52" width="182" height="200" rx="5"/>');
    out.push('<rect class="fig-apollo-dsky-attivita" x="404" y="60" width="48" height="36" rx="3"/>');
    out.push('<text class="fig-apollo-dsky-el-scuro" x="428" y="75">COMP</text><text class="fig-apollo-dsky-el-scuro" x="428" y="87">ACTY</text>');
    const targhetta = (x, y, t) => '<rect class="fig-apollo-dsky-acceso" x="' + x + '" y="' + y + '" width="50" height="12" rx="2"/><text class="fig-apollo-dsky-el-scuro" x="' + (x + 25) + '" y="' + (y + 9.5) + '">' + t + '</text>';
    out.push(targhetta(518, 60, 'PROG'), numero('63', 520, 76, 19, 24, 26, 'fig-apollo-dsky-acceso'));
    out.push(targhetta(404, 104, 'VERB'), numero('05', 406, 120, 19, 24, 26, 'fig-apollo-dsky-acceso'));
    out.push(targhetta(518, 104, 'NOUN'), numero('09', 520, 120, 19, 24, 26, 'fig-apollo-dsky-acceso'));
    for (const y of [151, 184, 216]) out.push('<line class="fig-apollo-dsky-riga" x1="404" y1="' + y + '" x2="570" y2="' + y + '"/>');
    out.push('<g class="fig-apollo-dsky-r1">' + numero('01202', 428, 156, 19, 24, 27, 'fig-apollo-dsky-acceso') + '</g>');
    out.push(numero('00000', 428, 189, 19, 24, 27, 'fig-apollo-dsky-acceso'));
    out.push(numero('01202', 428, 221, 19, 24, 27, 'fig-apollo-dsky-acceso'));
    // la tastiera: VERB e NOUN a sinistra, ENTR e RSET a destra, 15 tasti in mezzo
    out.push('<rect class="fig-apollo-dsky-pannello" x="228" y="268" width="344" height="172" rx="8"/>');
    const colonne = [236, 284, 332, 380, 428, 476, 524];
    const righe = [['+', '7', '8', '9', 'CLR'], ['−', '4', '5', '6', 'PRO'], ['0', '1', '2', '3', 'KEY REL']];
    righe.forEach((r, i) => r.forEach((t, j) => out.push(tasto(colonne[j + 1], 280 + i * 52, t))));
    out.push(tasto(colonne[0], 306, 'VERB'), tasto(colonne[0], 358, 'NOUN'), tasto(colonne[6], 306, 'ENTR'), tasto(colonne[6], 358, 'RSET'));
    // i richiami
    out.push(richiamo(200, 104, [[300, 111], [318, 118]], 'Spia PROG', 'allarme di programma', 196, 98, 'end'));
    out.push(richiamo(200, 333, [[236, 326]], 'Tastiera', 'comandi verbo + nome', 196, 327, 'end'));
    out.push(richiamo(608, 112, [[572, 126]], 'VERB 05 NOUN 09', '«mostra gli allarmi»', 612, 106, 'start'));
    out.push(richiamo(608, 170, [[566, 168]], 'R1: 1202', 'esecutivo sovraccarico', 612, 172, 'start'));
    return '<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' + out.join('') + '</svg>';
  }

  const cssDsky = `
    .fig-apollo-dsky-cassa { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-apollo-dsky-bordo { fill: none; stroke: var(--fig-metal-2); stroke-width: 1.5; }
    .fig-apollo-dsky-vite { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-apollo-dsky-taglio { stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-apollo-dsky-pannello { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-apollo-dsky-spia { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 1.2; }
    .fig-apollo-dsky-prog { fill: var(--fig-warm); stroke: var(--fig-ink); stroke-width: 1.2; animation: fig-apollo-dsky-spia 1.4s ease-in-out infinite alternate; }
    .fig-apollo-dsky-alone { fill: var(--fig-warm); opacity: .32; animation: fig-apollo-dsky-spia 1.4s ease-in-out infinite alternate; }
    .fig-apollo-dsky-spia-t { font: 700 8.5px var(--font); fill: var(--fig-ink); opacity: .7; text-anchor: middle; letter-spacing: .03em; }
    .fig-apollo-dsky-spia-t.is-accesa { fill: #2a1a00; opacity: 1; font-size: 10px; }
    .fig-apollo-dsky-el { fill: #0e1712; stroke: var(--fig-ink); stroke-width: 2; }
    .fig-apollo-dsky-acceso { fill: var(--fig-glow); }
    .fig-apollo-dsky-spento { fill: var(--fig-glow); opacity: .1; }
    .fig-apollo-dsky-attivita { fill: var(--fig-glow); animation: fig-apollo-dsky-calcola 2.6s steps(1, end) infinite; }
    .fig-apollo-dsky-el-scuro { font: 800 8.5px var(--font); fill: #04150d; text-anchor: middle; letter-spacing: .04em; }
    .fig-apollo-dsky-riga { stroke: var(--fig-glow); stroke-width: 1.5; opacity: .55; }
    .fig-apollo-dsky-r1 { animation: fig-apollo-dsky-pulsa 2.8s ease-in-out infinite alternate; }
    .fig-apollo-dsky-ombra { fill: var(--fig-ink); opacity: .28; }
    .fig-apollo-dsky-tasto { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-apollo-dsky-tasto-n { font: 800 19px var(--font); fill: var(--fig-ink); text-anchor: middle; }
    .fig-apollo-dsky-tasto-t { font: 800 10px var(--font); fill: var(--fig-ink); text-anchor: middle; letter-spacing: .03em; }
    .fig-apollo-dsky-filo { fill: none; stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-apollo-dsky-punto { fill: var(--cap); stroke: var(--fig-paper); stroke-width: 1.5; }
    .fig-apollo-dsky-titolo { font: 800 19px var(--font); fill: var(--fig-ink); }
    .fig-apollo-dsky-sotto { font: 500 15px var(--font); fill: var(--fig-ink); opacity: .75; }
    @keyframes fig-apollo-dsky-spia { from { opacity: 1; } to { opacity: .45; } }
    @keyframes fig-apollo-dsky-pulsa { from { opacity: 1; } to { opacity: .6; } }
    @keyframes fig-apollo-dsky-calcola { 0% { opacity: 1; } 14% { opacity: .15; } 22% { opacity: 1; } 47% { opacity: .15; } 53% { opacity: 1; } 71% { opacity: .15; } 86% { opacity: 1; } }
    .fig-apollo-dsky-alone { animation-name: fig-apollo-dsky-alone; }
    @keyframes fig-apollo-dsky-alone { from { opacity: .32; } to { opacity: .08; } }
    @media (prefers-reduced-motion: reduce) {
      .fig-apollo-dsky-prog, .fig-apollo-dsky-alone, .fig-apollo-dsky-attivita, .fig-apollo-dsky-r1 { animation: none; }
    }
  `;

  /* ---------------- la pila di listati ---------------- */

  function listati() {
    const out = [];
    out.push('<rect class="fig-listati-hamilton-fondo" x="104" y="44" width="592" height="418" rx="18"/>');
    out.push('<ellipse class="fig-listati-hamilton-ombra" cx="272" cy="463" rx="70" ry="7"/><ellipse class="fig-listati-hamilton-ombra" cx="420" cy="463" rx="78" ry="7"/>');
    out.push('<line class="fig-listati-hamilton-pavimento" x1="60" y1="462" x2="740" y2="462"/>');
    // la pila: fascicoli di modulo continuo con il dorso colorato
    const alte = [24, 19, 22, 20, 26, 18, 21, 19, 23, 18, 22, 20, 24, 19, 21, 17, 17];
    const spost = [0, 4, -3, 2, -2, 5, -4, 1, 3, -5, 2, -1, 4, -3, 1, -2, 2];
    const dorsi = ['fig-listati-hamilton-d1', 'fig-listati-hamilton-d2', 'fig-listati-hamilton-d3', 'fig-listati-hamilton-d4'];
    let y = 462;
    alte.forEach((hh, i) => {
      y -= hh;
      const x = 360 + spost[i];
      out.push('<rect class="fig-listati-hamilton-pacco" x="' + x + '" y="' + y + '" width="120" height="' + hh + '"/>');
      out.push('<rect class="' + dorsi[i % 4] + '" x="' + x + '" y="' + y + '" width="11" height="' + hh + '"/>');
      for (const q of [0.36, 0.68]) out.push('<line class="fig-listati-hamilton-pagine" x1="' + (x + 17) + '" y1="' + f(y + hh * q) + '" x2="' + (x + 113) + '" y2="' + f(y + hh * q) + '"/>');
      for (let k = 0; k < 3; k++) out.push('<path class="fig-listati-hamilton-piega" d="M' + (x + 120) + ' ' + f(y + 2 + k * (hh - 4) / 3) + 'l4 ' + f((hh - 4) / 6) + 'l-4 ' + f((hh - 4) / 6) + '"/>');
    });
    // un foglio sciolto in cima che si solleva appena
    out.push('<g class="fig-listati-hamilton-foglio"><path class="fig-listati-hamilton-carta" d="M364 112 L478 108 L486 98 L372 101 Z"/><path class="fig-listati-hamilton-pagine" d="M384 106 L462 103"/></g>');
    // la persona: una sagoma stilizzata, senza volto
    out.push('<g class="fig-listati-hamilton-sagoma">' +
      '<path d="M249 152 C247 126 260 112 271 112 C283 112 296 124 294 152 C296 166 291 176 285 179 L257 179 C251 175 247 166 249 152 Z"/>' +
      '<rect x="264" y="168" width="14" height="20" rx="4"/>' +
      '<path d="M240 198 C243 188 255 183 271 183 C287 183 299 188 302 198 L306 268 L236 268 Z"/>' +
      '<path d="M238 262 L304 262 L322 372 L220 372 Z"/>' +
      '<rect x="252" y="368" width="11" height="88" rx="4"/><rect x="279" y="368" width="11" height="88" rx="4"/>' +
      '<ellipse cx="255" cy="458" rx="12" ry="5"/><ellipse cx="288" cy="458" rx="12" ry="5"/>' +
      '<path d="M243 197 C232 224 229 254 231 291 L241 291 C242 257 246 229 253 207 Z"/><ellipse cx="236" cy="297" rx="6" ry="8"/>' +
      '<path d="M297 195 C313 211 322 229 328 245 L352 257 L348 268 L319 255 C311 239 302 223 292 207 Z"/><ellipse cx="355" cy="262" rx="7" ry="6"/>' +
      '</g>');
    // il metro
    out.push('<rect class="fig-listati-hamilton-metro" x="530" y="96" width="26" height="366" rx="3"/>');
    for (let k = 0; k <= 36; k++) {
      const yy = 462 - k * 10;
      const lungo = k % 5 === 0;
      out.push('<line class="fig-listati-hamilton-tacca" x1="530" y1="' + yy + '" x2="' + (530 + (lungo ? 13 : 7)) + '" y2="' + yy + '"/>');
    }
    // la stessa altezza
    out.push('<line class="fig-listati-hamilton-misura" x1="244" y1="112" x2="556" y2="112"/>');
    out.push('<line class="fig-listati-hamilton-fine" x1="244" y1="104" x2="244" y2="120"/><line class="fig-listati-hamilton-fine" x1="556" y1="104" x2="556" y2="120"/>');
    out.push('<text class="fig-listati-hamilton-titolo" x="572" y="118">alta quanto lei</text>');
    out.push('<text class="fig-listati-hamilton-sotto" x="572" y="142">listati del software</text><text class="fig-listati-hamilton-sotto" x="572" y="162">di bordo, 1969</text>');
    out.push('<text class="fig-listati-hamilton-sotto" x="572" y="300">un fascicolo:</text><text class="fig-listati-hamilton-sotto" x="572" y="320">centinaia di pagine</text>');
    out.push('<polyline class="fig-listati-hamilton-filo" points="566,306 500,306 484,300"/>');
    return '<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' + out.join('') + '</svg>';
  }

  const cssListati = `
    .fig-listati-hamilton-fondo { fill: var(--fig-1); }
    .fig-listati-hamilton-ombra { fill: var(--fig-ink); opacity: .12; }
    .fig-listati-hamilton-pavimento { stroke: var(--fig-ink); stroke-width: 2; }
    .fig-listati-hamilton-pacco, .fig-listati-hamilton-carta { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.6; }
    .fig-listati-hamilton-pagine { stroke: var(--fig-line); stroke-width: 1.2; fill: none; }
    .fig-listati-hamilton-piega { fill: none; stroke: var(--fig-line); stroke-width: 1.2; }
    .fig-listati-hamilton-d1 { fill: var(--cap); }
    .fig-listati-hamilton-d2 { fill: var(--fig-cool); }
    .fig-listati-hamilton-d3 { fill: var(--fig-3); }
    .fig-listati-hamilton-d4 { fill: var(--fig-warm); }
    .fig-listati-hamilton-sagoma { fill: var(--fig-ink); opacity: .88; }
    .fig-listati-hamilton-metro { fill: var(--fig-2); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-listati-hamilton-tacca { stroke: var(--fig-ink); stroke-width: 1.4; }
    .fig-listati-hamilton-misura { stroke: var(--cap); stroke-width: 2.4; stroke-dasharray: 7 6; animation: fig-listati-hamilton-formiche 2.6s linear infinite; }
    .fig-listati-hamilton-fine { stroke: var(--cap); stroke-width: 2.4; }
    .fig-listati-hamilton-titolo { font: 800 21px var(--font); fill: var(--cap); }
    .fig-listati-hamilton-sotto { font: 500 16px var(--font); fill: var(--fig-ink); opacity: .78; }
    .fig-listati-hamilton-filo { fill: none; stroke: var(--fig-ink); stroke-width: 1.5; opacity: .7; }
    .fig-listati-hamilton-foglio { transform-box: fill-box; transform-origin: 0% 100%; animation: fig-listati-hamilton-solleva 4.5s ease-in-out infinite alternate; }
    @keyframes fig-listati-hamilton-formiche { to { stroke-dashoffset: -26; } }
    @keyframes fig-listati-hamilton-solleva { from { transform: rotate(0deg); } to { transform: rotate(-4deg); } }
    @media (prefers-reduced-motion: reduce) {
      .fig-listati-hamilton-misura, .fig-listati-hamilton-foglio { animation: none; }
    }
  `;

  /* ---------------- la memoria a fili intrecciati ---------------- */

  const ANELLI = [170, 270, 370, 470, 570, 670];
  const CY = 230;
  const FILI_Y = [214, 225, 236, 247];
  // 1 = il filo attraversa l'anello, 0 = gli gira intorno
  const TRAMA = [
    [1, 0, 1, 1, 0, 1],
    [0, 1, 1, 0, 1, 0],
    [1, 1, 0, 0, 1, 1],
    [0, 0, 1, 1, 0, 1],
  ];
  const SCELTO = 2;
  const USCITE_Y = [168, 212, 256, 300];
  const GIRO_Y = [158, 172, 290, 304];

  function percorsoFilo(w) {
    const y = FILI_Y[w];
    let d = 'M92 ' + y;
    ANELLI.forEach((cx, c) => {
      if (TRAMA[w][c]) return;
      const gy = GIRO_Y[w];
      d += ' L' + (cx - 48) + ' ' + y + ' C' + (cx - 30) + ' ' + y + ' ' + (cx - 32) + ' ' + gy + ' ' + cx + ' ' + gy +
        ' C' + (cx + 32) + ' ' + gy + ' ' + (cx + 30) + ' ' + y + ' ' + (cx + 48) + ' ' + y;
    });
    const yu = USCITE_Y[w];
    return d + ' L708 ' + y + ' C722 ' + y + ' 718 ' + yu + ' 734 ' + yu;
  }

  function anello(cx, intero) {
    const ro = [22, 44];
    const ri = [9, 21];
    if (intero) {
      return '<ellipse class="fig-memoria-a-fili-ferrite" cx="' + cx + '" cy="' + CY + '" rx="' + ro[0] + '" ry="' + ro[1] + '"/>' +
        '<ellipse class="fig-memoria-a-fili-foro" cx="' + cx + '" cy="' + CY + '" rx="' + ri[0] + '" ry="' + ri[1] + '"/>';
    }
    // metà davanti dell'anello: copre i fili che passano nel foro
    return '<path class="fig-memoria-a-fili-ferrite" d="M' + cx + ' ' + (CY - ro[1]) + ' A' + ro[0] + ' ' + ro[1] + ' 0 0 0 ' + cx + ' ' + (CY + ro[1]) +
      ' L' + cx + ' ' + (CY + ri[1]) + ' A' + ri[0] + ' ' + ri[1] + ' 0 0 1 ' + cx + ' ' + (CY - ri[1]) + ' Z"/>';
  }

  function memoria() {
    const out = [];
    const cxS = ANELLI[SCELTO];
    out.push('<ellipse class="fig-memoria-a-fili-alone" cx="' + cxS + '" cy="' + CY + '" rx="40" ry="62"/>');
    ANELLI.forEach((cx) => out.push(anello(cx, true)));
    const fili = TRAMA.map((_, w) => percorsoFilo(w));
    fili.forEach((d) => out.push('<path class="fig-memoria-a-fili-rame" d="' + d + '"/>'));
    ANELLI.forEach((cx) => out.push(anello(cx, false)));
    out.push('<ellipse class="fig-memoria-a-fili-scelto" cx="' + cxS + '" cy="' + CY + '" rx="22" ry="44"/>');
    // l'impulso corre sui fili che attraversano l'anello selezionato
    TRAMA.forEach((riga, w) => {
      if (!riga[SCELTO]) return;
      const y = FILI_Y[w];
      const d = 'M' + (cxS + 12) + ' ' + y + percorsoFilo(w).split('L').slice(1).map((p) => 'L' + p).join('').replace(/^.*?(?=L\d)/, '');
      out.push('<path class="fig-memoria-a-fili-impulso fig-memoria-a-fili-i' + w + '" d="' + d + '"/>');
    });
    // i punti di partenza e le etichette dei fili
    FILI_Y.forEach((y, w) => {
      out.push('<circle class="fig-memoria-a-fili-capo" cx="92" cy="' + y + '" r="3.2"/>');
    });
    out.push('<text class="fig-memoria-a-fili-testo" x="84" y="200" text-anchor="end">4 fili</text><text class="fig-memoria-a-fili-testo" x="84" y="220" text-anchor="end">di lettura</text>');
    out.push('<text class="fig-memoria-a-fili-testo" x="84" y="256" text-anchor="end">uno per bit</text>');
    // la parola letta
    out.push('<text class="fig-memoria-a-fili-titolo" x="757" y="140" text-anchor="middle">parola</text><text class="fig-memoria-a-fili-titolo" x="757" y="158" text-anchor="middle">letta</text>');
    TRAMA.forEach((riga, w) => {
      const bit = riga[SCELTO];
      out.push('<rect class="fig-memoria-a-fili-bit' + (bit ? ' is-uno' : '') + '" x="736" y="' + (USCITE_Y[w] - 17) + '" width="42" height="34" rx="6"/>' +
        '<text class="fig-memoria-a-fili-cifra' + (bit ? ' is-uno' : '') + '" x="757" y="' + (USCITE_Y[w] + 8) + '" text-anchor="middle">' + bit + '</text>');
    });
    // etichette
    out.push('<text class="fig-memoria-a-fili-titolo is-cap" x="' + cxS + '" y="146" text-anchor="middle">anello selezionato</text>');
    out.push('<line class="fig-memoria-a-fili-filo" x1="670" y1="344" x2="670" y2="280"/><text class="fig-memoria-a-fili-testo" x="670" y="364" text-anchor="middle">anello di ferrite</text>');
    // legenda: dentro = 1, intorno = 0
    out.push('<g transform="translate(120 410)">' +
      '<ellipse class="fig-memoria-a-fili-ferrite" cx="0" cy="0" rx="11" ry="22"/><ellipse class="fig-memoria-a-fili-foro" cx="0" cy="0" rx="4.5" ry="10.5"/>' +
      '<path class="fig-memoria-a-fili-rame" d="M-34 0 H34"/>' +
      '<path class="fig-memoria-a-fili-ferrite" d="M0 -22 A11 22 0 0 0 0 22 L0 10.5 A4.5 10.5 0 0 1 0 -10.5 Z"/>' +
      '<text class="fig-memoria-a-fili-testo" x="48" y="6">il filo passa dentro l\'anello: <tspan class="fig-memoria-a-fili-forte">1</tspan></text></g>');
    out.push('<g transform="translate(470 410)">' +
      '<ellipse class="fig-memoria-a-fili-ferrite" cx="0" cy="0" rx="11" ry="22"/><ellipse class="fig-memoria-a-fili-foro" cx="0" cy="0" rx="4.5" ry="10.5"/>' +
      '<path class="fig-memoria-a-fili-rame" d="M-34 0 L-22 0 C-14 0 -16 -32 0 -32 C16 -32 14 0 22 0 L34 0"/>' +
      '<text class="fig-memoria-a-fili-testo" x="48" y="6">il filo gira intorno: <tspan class="fig-memoria-a-fili-forte">0</tspan></text></g>');
    // l'ago: la memoria si intrecciava a mano, filo per filo
    out.push('<g class="fig-memoria-a-fili-ago-g"><path class="fig-memoria-a-fili-ago" d="M96 96 L196 58 L199 62 L100 100 Z"/>' +
      '<ellipse class="fig-memoria-a-fili-cruna" cx="190" cy="61.5" rx="4" ry="1.6" transform="rotate(-21 190 61.5)"/>' +
      '<path class="fig-memoria-a-fili-rame" d="M190 61 C214 52 226 74 212 86 C200 96 214 110 236 104"/></g>');
    out.push('<text class="fig-memoria-a-fili-titolo" x="252" y="78">intrecciata a mano,</text><text class="fig-memoria-a-fili-titolo" x="252" y="100">filo per filo</text>');
    return '<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' + out.join('') + '</svg>';
  }

  const cssMemoria = `
    .fig-memoria-a-fili-ferrite { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-memoria-a-fili-foro { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.6; }
    .fig-memoria-a-fili-rame { fill: none; stroke: var(--fig-3); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
    .fig-memoria-a-fili-scelto { fill: none; stroke: var(--cap); stroke-width: 3.5; }
    .fig-memoria-a-fili-alone { fill: var(--cap); opacity: .16; animation: fig-memoria-a-fili-pulsa 2.4s ease-in-out infinite alternate; }
    .fig-memoria-a-fili-impulso { fill: none; stroke: var(--fig-glow); stroke-width: 5; stroke-linecap: round; stroke-dasharray: 28 900; stroke-dashoffset: 28; animation: fig-memoria-a-fili-corre 2.4s linear infinite; }
    .fig-memoria-a-fili-i1 { animation-delay: .12s; }
    .fig-memoria-a-fili-i3 { animation-delay: .24s; }
    .fig-memoria-a-fili-capo { fill: var(--fig-3); stroke: var(--fig-ink); stroke-width: 1.2; }
    .fig-memoria-a-fili-bit { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.8; }
    .fig-memoria-a-fili-bit.is-uno { fill: color-mix(in srgb, var(--fig-glow) 22%, var(--fig-paper)); stroke: var(--fig-glow); stroke-width: 2.4; }
    .fig-memoria-a-fili-cifra { font: 800 22px var(--mono); fill: var(--fig-ink); opacity: .6; }
    .fig-memoria-a-fili-cifra.is-uno { opacity: 1; }
    .fig-memoria-a-fili-testo { font: 500 16px var(--font); fill: var(--fig-ink); opacity: .8; }
    .fig-memoria-a-fili-titolo { font: 800 18px var(--font); fill: var(--fig-ink); }
    .fig-memoria-a-fili-titolo.is-cap { fill: var(--cap); }
    .fig-memoria-a-fili-forte { font-weight: 800; fill: var(--cap); }
    .fig-memoria-a-fili-filo { stroke: var(--fig-ink); stroke-width: 1.5; opacity: .7; }
    .fig-memoria-a-fili-ago { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-memoria-a-fili-cruna { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1; }
    @keyframes fig-memoria-a-fili-pulsa { from { opacity: .08; } to { opacity: .3; } }
    @keyframes fig-memoria-a-fili-corre { from { stroke-dashoffset: 28; } to { stroke-dashoffset: -520; } }
    @media (prefers-reduced-motion: reduce) {
      .fig-memoria-a-fili-alone, .fig-memoria-a-fili-impulso { animation: none; }
      .fig-memoria-a-fili-impulso { opacity: 0; }
    }
  `;

  const Figure = { dsky: dsky, listati: listati, memoria: memoria, cifra: cifra, percorsoFilo: percorsoFilo, TRAMA: TRAMA };

  if (typeof module !== 'undefined' && module.exports) module.exports = Figure;
  if (!root.ProgStoria) return;

  root.ProgStoria.figura('apollo-dsky', {
    alt: 'Il DSKY, la tastiera con display del computer di bordo dell\'Apollo. A sinistra quattordici spie: la spia PROG è accesa in ambra e lampeggia. ' +
      'A destra il display verde: programma 63, verbo 05, nome 09 e nel primo registro il codice 01202, l\'allarme 1202. ' +
      'Sotto, i diciannove tasti: VERB e NOUN, i numeri da 0 a 9, più e meno, CLR, PRO, KEY REL, ENTR e RSET.',
    css: cssDsky,
    disegna: dsky,
  });

  root.ProgStoria.figura('listati-hamilton', {
    alt: 'Una figura stilizzata di donna, senza volto, in piedi accanto a una pila di fascicoli di listati alta quanto lei, con una mano appoggiata alla pila. ' +
      'Un metro e una linea tratteggiata mostrano che la pila arriva all\'altezza della sua testa.',
    css: cssListati,
    disegna: listati,
  });

  root.ProgStoria.figura('memoria-a-fili', {
    alt: 'Schema della memoria a fili intrecciati: sei anelli di ferrite in fila e quattro fili di rame. Ogni filo passa dentro alcuni anelli e gira intorno ad altri. ' +
      'Il terzo anello è selezionato: i fili che lo attraversano portano un impulso fino all\'uscita, dove si legge la parola 1 1 0 1. ' +
      'In alto un ago ricorda che la memoria si intrecciava a mano, filo per filo.',
    css: cssMemoria,
    disegna: memoria,
  });
})(typeof window !== 'undefined' ? window : globalThis);
