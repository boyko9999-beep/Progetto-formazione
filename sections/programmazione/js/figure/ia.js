/*
 * Illustrazioni del capitolo 13 · Quando il software impara.
 *   rete-neurale  una rete a quattro strati che riconosce una cifra scritta a mano, con i segnali che la attraversano
 *   attenzione    gli archi dell'attenzione in una frase italiana: «era» guarda soprattutto «gatto»
 * Disegni a tratto sulla tavolozza --fig-* e --cap; le animazioni (impulsi, archi che si tracciano)
 * partono solo senza «movimento ridotto» e si fermano fuori vista (classe .pg-fermo del motore).
 */
(function (root) {
  'use strict';

  function f1(v) { return Math.round(v * 10) / 10; }

  /* ---------- rete neurale ---------- */

  const CIFRA = [
    '.####..',
    '#....#.',
    '.....#.',
    '..###..',
    '.....#.',
    '#....#.',
    '.####..',
  ];

  // Strati: x, ordinate dei neuroni, raggio. Gli ingressi sono 49 (uno per pixel): se ne disegnano sei.
  const STRATI = [
    { x: 262, y: [92, 152, 212, 292, 352, 412], r: 15 },
    { x: 420, y: [110, 180, 250, 320, 390], r: 17 },
    { x: 566, y: [110, 180, 250, 320, 390], r: 17 },
    { x: 708, y: [170, 250, 330], r: 19 },
  ];
  // Collegamenti forti (strato, da, a): i segnali che portano alla risposta «3».
  const FORTI = [
    [0, 0, 1], [0, 1, 1], [0, 3, 2], [0, 4, 3], [0, 5, 3], [0, 2, 0],
    [1, 1, 2], [1, 2, 2], [1, 3, 3], [1, 0, 1],
    [2, 2, 2], [2, 3, 2], [2, 1, 1],
  ];
  const ACCESI = [[0, 1, 3, 4, 5], [1, 2, 3], [2, 3], [2]];
  const USCITE = [{ cifra: '1', p: '0,03' }, { cifra: '2', p: '0,05' }, { cifra: '3', p: '0,92' }];

  const cssRete = `
.fig-rete-neurale-filo { stroke: var(--fig-line); stroke-width: 1.3; opacity: .55; }
.fig-rete-neurale-forte { stroke: var(--cap); stroke-width: 2.6; opacity: .8; }
.fig-rete-neurale-pixel { fill: var(--fig-paper); stroke: var(--fig-line); stroke-width: 1; }
.fig-rete-neurale-pixel.on { fill: var(--fig-ink); stroke: var(--fig-ink); }
.fig-rete-neurale-cornice { fill: none; stroke: var(--fig-ink); stroke-width: 2; }
.fig-rete-neurale-raggio { stroke: var(--fig-line); stroke-width: 1.2; stroke-dasharray: 3 4; opacity: .8; }
.fig-rete-neurale-nodo { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; }
.fig-rete-neurale-ingresso { fill: var(--fig-2); }
.fig-rete-neurale-luce { fill: var(--cap); opacity: .82; }
.fig-rete-neurale-impulso { fill: none; stroke: var(--cap); stroke-width: 5; stroke-linecap: round; opacity: 0; }
.fig-rete-neurale-testo { font: 600 20px var(--font, sans-serif); fill: var(--fig-ink); }
.fig-rete-neurale-piccolo { font: 500 18px var(--font, sans-serif); fill: var(--fig-ink); opacity: .78; }
.fig-rete-neurale-cifra { font: 800 19px var(--mono, monospace); fill: var(--fig-ink); }
.fig-rete-neurale-cifra.su { fill: var(--fig-paper); }
.fig-rete-neurale-prob { font: 700 19px var(--mono, monospace); fill: var(--fig-ink); opacity: .7; }
.fig-rete-neurale-prob.su { fill: var(--cap); opacity: 1; }
.fig-rete-neurale-guida { stroke: var(--fig-ink); stroke-width: 1.5; fill: none; opacity: .7; }
.fig-rete-neurale-punti { font: 800 26px var(--mono, monospace); fill: var(--fig-line); }
@media (prefers-reduced-motion: no-preference) {
  .fig-rete-neurale-impulso { animation: fig-rete-neurale-corri 4.8s linear infinite; }
  .fig-rete-neurale-luce { animation: fig-rete-neurale-accendi 4.8s ease-in-out infinite; }
  .fig-rete-neurale-luce.fine { animation-name: fig-rete-neurale-tieni; }
}
@keyframes fig-rete-neurale-corri {
  0% { stroke-dashoffset: 8; opacity: 0; }
  2% { opacity: 1; }
  17% { stroke-dashoffset: -100; opacity: 1; }
  19%, 100% { stroke-dashoffset: -100; opacity: 0; }
}
@keyframes fig-rete-neurale-accendi {
  0% { opacity: .08; }
  6%, 34% { opacity: .82; }
  50%, 100% { opacity: .08; }
}
@keyframes fig-rete-neurale-tieni {
  0% { opacity: .1; }
  6%, 38% { opacity: .9; }
  48%, 100% { opacity: .1; }
}
`;

  function disegnaRete() {
    const out = [];
    out.push('<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">');

    // La cifra 3 su una griglia di 7 × 7 pixel.
    const gx = 40;
    const gy = 190;
    const c = 17;
    CIFRA.forEach((riga, r) => {
      for (let k = 0; k < riga.length; k++) {
        out.push('<rect class="fig-rete-neurale-pixel' + (riga[k] === '#' ? ' on' : '') + '" x="' + (gx + k * c) + '" y="' + (gy + r * c) + '" width="' + c + '" height="' + c + '"/>');
      }
    });
    out.push('<rect class="fig-rete-neurale-cornice" x="' + gx + '" y="' + gy + '" width="' + 7 * c + '" height="' + 7 * c + '" rx="2"/>');
    out.push('<text class="fig-rete-neurale-piccolo" x="' + (gx + 3.5 * c) + '" y="' + (gy + 7 * c + 30) + '" text-anchor="middle">7 × 7 pixel</text>');
    // Raggi dai pixel agli ingressi.
    STRATI[0].y.forEach((y) => {
      out.push('<line class="fig-rete-neurale-raggio" x1="' + (gx + 7 * c + 6) + '" y1="' + f1(gy + 3.5 * c) + '" x2="' + (STRATI[0].x - STRATI[0].r - 4) + '" y2="' + y + '"/>');
    });

    // Collegamenti: tutti sottili, poi quelli forti sopra.
    const forti = new Set(FORTI.map((f) => f.join('-')));
    const linee = [];
    for (let l = 0; l < STRATI.length - 1; l++) {
      const A = STRATI[l];
      const B = STRATI[l + 1];
      A.y.forEach((ya, i) => {
        B.y.forEach((yb, j) => {
          const forte = forti.has(l + '-' + i + '-' + j);
          linee.push({ forte: forte, l: l, d: 'M' + (A.x + A.r) + ' ' + ya + ' L' + (B.x - B.r) + ' ' + yb });
        });
      });
    }
    linee.filter((q) => !q.forte).forEach((q) => out.push('<path class="fig-rete-neurale-filo" d="' + q.d + '"/>'));
    linee.filter((q) => q.forte).forEach((q) => out.push('<path class="fig-rete-neurale-forte" d="' + q.d + '"/>'));
    // Impulsi lungo i collegamenti forti, uno strato dopo l'altro.
    linee.filter((q) => q.forte).forEach((q) => {
      out.push('<path class="fig-rete-neurale-impulso" d="' + q.d + '" pathLength="100" stroke-dasharray="8 200" style="animation-delay:' + (q.l * 0.9).toFixed(1) + 's"/>');
    });

    // Neuroni.
    STRATI.forEach((S, l) => {
      S.y.forEach((y, i) => {
        const acceso = ACCESI[l].indexOf(i) >= 0;
        out.push('<circle class="fig-rete-neurale-nodo' + (l === 0 && acceso ? ' fig-rete-neurale-ingresso' : '') + '" cx="' + S.x + '" cy="' + y + '" r="' + S.r + '"/>');
        if (l > 0 && acceso) {
          const fine = l === STRATI.length - 1;
          out.push('<circle class="fig-rete-neurale-luce' + (fine ? ' fine' : '') + '" cx="' + S.x + '" cy="' + y + '" r="' + (S.r - 3) + '" style="animation-delay:' + (0.75 + (l - 1) * 0.9).toFixed(2) + 's"/>');
        }
      });
    });
    out.push('<text class="fig-rete-neurale-punti" x="' + STRATI[0].x + '" y="262" text-anchor="middle">⋮</text>');

    // Uscite: una per cifra, con la probabilità.
    const L3 = STRATI[3];
    USCITE.forEach((u, i) => {
      const su = i === 2;
      out.push('<text class="fig-rete-neurale-cifra' + (su ? ' su' : '') + '" x="' + L3.x + '" y="' + (L3.y[i] + 7) + '" text-anchor="middle">' + u.cifra + '</text>');
      out.push('<text class="fig-rete-neurale-prob' + (su ? ' su' : '') + '" x="' + (L3.x + 30) + '" y="' + (L3.y[i] + 7) + '">' + u.p + '</text>');
    });

    // Didascalie interne.
    out.push('<path class="fig-rete-neurale-guida" d="M362 58 Q404 66 412 92"/>');
    out.push('<text class="fig-rete-neurale-testo" x="352" y="50" text-anchor="end">un neurone: somma pesata e soglia</text>');
    out.push('<path class="fig-rete-neurale-guida" d="M600 58 Q560 84 516 132"/>');
    out.push('<text class="fig-rete-neurale-testo" x="606" y="50">una linea: un peso</text>');
    out.push('<text class="fig-rete-neurale-testo" x="' + STRATI[0].x + '" y="470" text-anchor="middle">49 ingressi</text>');
    out.push('<text class="fig-rete-neurale-testo" x="' + (STRATI[1].x + STRATI[2].x) / 2 + '" y="470" text-anchor="middle">due strati nascosti</text>');
    out.push('<text class="fig-rete-neurale-testo" x="' + L3.x + '" y="470" text-anchor="middle">uscita</text>');
    out.push('</svg>');
    return out.join('');
  }

  /* ---------- attenzione ---------- */

  // Pesi indicativi dell'attenzione di «era» sulle parole della frase (somma 1).
  const FRASE = [
    ['Il', 0.02], ['gatto', 0.58], ['non', 0.03], ['ha', 0.02], ['attraversato', 0.06], ['la', 0.01],
    ['strada', 0.09], ['perché', 0.04], ['era', 0.08], ['troppo', 0.03], ['stanco', 0.04],
  ];
  const QUERY = 8;   // «era»
  const CHIAVE = 1;  // «gatto»

  // Larghezza stimata di una parola (sans-serif), in unità del disegno.
  function larghezza(parola, corpo) {
    let w = 0;
    for (const ch of parola) {
      if ('iljtfr'.indexOf(ch) >= 0) w += 0.33;
      else if ('mw'.indexOf(ch) >= 0) w += 0.86;
      else if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) w += 0.62;
      else w += 0.56;
    }
    return w * corpo;
  }

  const cssAttenzione = `
.fig-attenzione-parola { font: 500 22px var(--font, sans-serif); fill: var(--fig-ink); }
.fig-attenzione-parola.chiave, .fig-attenzione-parola.query { font-weight: 800; }
.fig-attenzione-box { fill: none; stroke: var(--cap); stroke-width: 2.5; }
.fig-attenzione-box.chiave { fill: var(--cap); fill-opacity: .14; }
.fig-attenzione-arco { fill: none; stroke: var(--fig-line); stroke-linecap: round; opacity: .75; }
.fig-attenzione-arco.chiave { stroke: var(--cap); opacity: .9; }
.fig-attenzione-impulso { fill: none; stroke: var(--fig-paper); stroke-width: 5; stroke-linecap: round; opacity: 0; }
.fig-attenzione-barra { fill: var(--fig-line); opacity: .6; }
.fig-attenzione-barra.chiave { fill: var(--cap); opacity: .9; }
.fig-attenzione-base { stroke: var(--fig-ink); stroke-width: 1.5; opacity: .35; }
.fig-attenzione-peso { font: 800 22px var(--mono, monospace); fill: var(--cap); }
.fig-attenzione-valore { font: 700 17px var(--mono, monospace); fill: var(--fig-ink); opacity: .75; }
.fig-attenzione-titolo { font: 800 21px var(--font, sans-serif); fill: var(--fig-ink); }
.fig-attenzione-nota { font: 500 18px var(--font, sans-serif); fill: var(--fig-ink); opacity: .72; }
.fig-attenzione-freccia { fill: var(--cap); }
@media (prefers-reduced-motion: no-preference) {
  .fig-attenzione-arco { stroke-dasharray: 100 100; animation: fig-attenzione-traccia 1.4s var(--pg-ease-smooth, ease-out) both; }
  .fig-attenzione-impulso { animation: fig-attenzione-corri 4s ease-in-out 2s infinite; }
}
@keyframes fig-attenzione-traccia { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
@keyframes fig-attenzione-corri {
  0% { stroke-dashoffset: 6; opacity: 0; }
  5% { opacity: .95; }
  45% { stroke-dashoffset: -100; opacity: .95; }
  50%, 100% { stroke-dashoffset: -100; opacity: 0; }
}
`;

  function disegnaAttenzione() {
    const corpo = 22;
    const spazio = 15;
    const larghe = FRASE.map(([p]) => larghezza(p, corpo));
    const totale = larghe.reduce((a, b) => a + b, 0) + spazio * (FRASE.length - 1);
    let x = (800 - totale) / 2;
    const centri = larghe.map((w) => { const cx = x + w / 2; x += w + spazio; return cx; });
    const yTesto = 384;
    const yArco = 360;
    const out = [];
    out.push('<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">');
    out.push('<text class="fig-attenzione-titolo" x="776" y="44" text-anchor="end">Dove guarda la parola «era»</text>');
    out.push('<text class="fig-attenzione-nota" x="776" y="72" text-anchor="end">lo spessore dell\'arco è il peso dell\'attenzione</text>');

    // Archi da «era» verso tutte le altre parole: i più leggeri prima, il più pesante sopra.
    const qx = centri[QUERY];
    const ordine = FRASE.map((v, i) => i).filter((i) => i !== QUERY).sort((a, b) => FRASE[a][1] - FRASE[b][1]);
    let picco = null;
    ordine.forEach((i, n) => {
      const tx = centri[i];
      const d = Math.abs(tx - qx);
      const alt = Math.min(300, 34 + d * 0.62);
      const cy = yArco - alt / 0.75;
      const chiave = i === CHIAVE;
      const spessore = 1.6 + FRASE[i][1] * 22;
      const path = 'M' + f1(qx) + ' ' + yArco + ' C' + f1(qx) + ' ' + f1(cy) + ' ' + f1(tx) + ' ' + f1(cy) + ' ' + f1(tx) + ' ' + yArco;
      out.push('<path class="fig-attenzione-arco' + (chiave ? ' chiave' : '') + '" d="' + path + '" pathLength="100" stroke-width="' + f1(spessore) + '" style="animation-delay:' + (0.15 + n * 0.12).toFixed(2) + 's"/>');
      if (chiave) {
        picco = { x: (qx + tx) / 2, y: yArco - alt };
        out.push('<path class="fig-attenzione-impulso" d="' + path + '" pathLength="100" stroke-dasharray="6 200"/>');
        // Punta di freccia sull'arrivo, verso «gatto».
        out.push('<path class="fig-attenzione-freccia" d="M' + f1(tx - 10) + ' ' + (yArco - 16) + ' L' + f1(tx + 10) + ' ' + (yArco - 16) + ' L' + f1(tx) + ' ' + (yArco + 2) + ' Z"/>');
      }
    });
    if (picco) out.push('<text class="fig-attenzione-peso" x="' + f1(picco.x) + '" y="' + f1(picco.y - 16) + '" text-anchor="middle">0,58</text>');

    // Le parole, con «era» e «gatto» evidenziate.
    FRASE.forEach(([p], i) => {
      const w = larghe[i];
      if (i === QUERY || i === CHIAVE) {
        out.push('<rect class="fig-attenzione-box' + (i === CHIAVE ? ' chiave' : '') + '" x="' + f1(centri[i] - w / 2 - 9) + '" y="' + (yTesto - 25) + '" width="' + f1(w + 18) + '" height="36" rx="8"/>');
      }
      out.push('<text class="fig-attenzione-parola' + (i === QUERY ? ' query' : '') + (i === CHIAVE ? ' chiave' : '') + '" x="' + f1(centri[i]) + '" y="' + yTesto + '" text-anchor="middle">' + p + '</text>');
    });

    // Barre dei pesi sotto le parole.
    const yBase = 414;
    out.push('<line class="fig-attenzione-base" x1="' + f1(centri[0] - 30) + '" y1="' + yBase + '" x2="' + f1(centri[centri.length - 1] + 30) + '" y2="' + yBase + '"/>');
    FRASE.forEach(([, peso], i) => {
      const hgt = Math.max(2, peso * 90);
      out.push('<rect class="fig-attenzione-barra' + (i === CHIAVE ? ' chiave' : '') + '" x="' + f1(centri[i] - 13) + '" y="' + yBase + '" width="26" height="' + f1(hgt) + '" rx="3"/>');
      if (peso >= 0.06) out.push('<text class="fig-attenzione-valore" x="' + f1(centri[i]) + '" y="' + f1(yBase + hgt + 20) + '" text-anchor="middle">' + String(peso).replace('.', ',') + '</text>');
    });
    out.push('</svg>');
    return out.join('');
  }

  const Figure = { larghezza: larghezza, FRASE: FRASE, disegnaRete: disegnaRete, disegnaAttenzione: disegnaAttenzione };

  if (typeof module !== 'undefined' && module.exports) module.exports = Figure;
  if (root.ProgStoria) {
    root.ProgStoria.figura('rete-neurale', {
      alt: 'Schema di una rete neurale: a sinistra una cifra 3 disegnata su una griglia di 7 per 7 pixel entra nello strato degli ingressi, attraversa due strati nascosti di cinque neuroni collegati da linee di spessore diverso, e a destra si accende il neurone di uscita della cifra 3, con probabilità 0,92.',
      css: cssRete,
      disegna: disegnaRete,
    });
    root.ProgStoria.figura('attenzione', {
      alt: 'La frase «Il gatto non ha attraversato la strada perché era troppo stanco» con archi che partono dalla parola «era» verso tutte le altre: l\'arco più spesso arriva a «gatto», con peso 0,58; molto più sottili quelli verso «strada» e le altre parole.',
      css: cssAttenzione,
      disegna: disegnaAttenzione,
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
