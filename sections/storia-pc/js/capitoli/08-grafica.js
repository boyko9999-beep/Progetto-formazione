/*
 * Storia del PC · capitolo 8: Pixel, finestre e multimedia.
 * Testi, due illustrazioni (il Macintosh del 1984, una scheda VGA per bus ISA)
 * e il laboratorio «Lo stesso disegno in cinque epoche».
 * Il file non tocca il DOM al caricamento: il DOM si usa solo dentro le figure
 * e dentro lab.crea(), così i test in Node possono caricarlo.
 */
(function (root) {
  'use strict';
  const P = root.StoriaPC;
  const M = (root.StoriaPCModelli || {}).grafica;
  const X = '&nbsp;×&nbsp;'; // segno di moltiplicazione che non va a capo, nei testi HTML

  /* =====================================================================
   * Illustrazioni (SVG originali, stile tecnico piatto della sezione)
   * ===================================================================== */

  // Il Macintosh del 1984 visto di fronte, con una finestra e il mouse;
  // nel cerchio, l'angolo della finestra ingrandito fino ai singoli pixel.
  function figuraMacintosh() {
    const x0 = 148, y0 = 89; // angolo in alto a sinistra dell'area attiva (512 × 342 in scala)
    // 12 × 12 pixel ingranditi: scacchiera della scrivania, bordo, righe del titolo, casella di chiusura
    const pix = [];
    for (let r = 0; r < 12; r++) {
      for (let c = 0; c < 12; c++) {
        let nero;
        if (c < 2 || r < 2) nero = (r + c) % 2 === 0;
        else if (c === 2 || r === 2) nero = true;
        else if (c === 3 || r === 3) nero = false;
        else if (c >= 4 && c <= 10 && r >= 4 && r <= 10) {
          const dentro = c >= 5 && c <= 9 && r >= 5 && r <= 9;
          nero = dentro && (c === 5 || c === 9 || r === 5 || r === 9);
        } else nero = r % 2 === 0;
        if (nero) pix.push('<rect x="' + (426 + c * 14) + '" y="' + (66 + r * 14) + '" width="14" height="14"/>');
      }
    }
    const righeGriglia = [];
    for (let k = 1; k < 12; k++) {
      righeGriglia.push('<path d="M' + (426 + k * 14) + ' 66V234M426 ' + (66 + k * 14) + 'H594"/>');
    }
    const strisce = [];
    for (let k = 0; k < 4; k++) strisce.push('<path d="M' + (x0 + 16) + ' ' + (y0 + 17.6 + k * 1.6) + 'H' + (x0 + 108) + '"/>');
    return '<svg class="gfx-fig" viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<pattern id="gfx-retino" width="2" height="2" patternUnits="userSpaceOnUse"><rect class="nero" width="1" height="1"/><rect class="nero" x="1" y="1" width="1" height="1"/></pattern>' +
        '<pattern id="gfx-retino-rado" width="4" height="4" patternUnits="userSpaceOnUse"><rect class="nero" width="1" height="1"/></pattern>' +
        '<clipPath id="gfx-lente-mac"><circle cx="510" cy="150" r="96"/></clipPath>' +
      '</defs>' +
      // ombra a terra
      '<ellipse class="ombra" cx="236" cy="366" rx="168" ry="11"/>' +
      // corpo
      '<g class="l">' +
        '<rect class="be" x="110" y="36" width="220" height="322" rx="16"/>' +
        '<rect class="be2" x="126" y="54" width="188" height="168" rx="10"/>' +
        '<rect class="sch" x="138" y="64" width="164" height="146" rx="14"/>' +
      '</g>' +
      // schermo: area attiva 512 × 342 in scala
      '<rect class="carta" x="' + x0 + '" y="' + y0 + '" width="144" height="96"/>' +
      '<rect fill="url(#gfx-retino)" x="' + x0 + '" y="' + (y0 + 8) + '" width="144" height="88"/>' +
      '<g class="nero">' +
        '<rect x="' + x0 + '" y="' + (y0 + 8) + '" width="144" height="0.8"/>' +
        '<rect x="' + (x0 + 8) + '" y="' + (y0 + 2.6) + '" width="5" height="3"/>' +
        '<rect x="' + (x0 + 20) + '" y="' + (y0 + 3) + '" width="10" height="2.2"/>' +
        '<rect x="' + (x0 + 36) + '" y="' + (y0 + 3) + '" width="10" height="2.2"/>' +
        '<rect x="' + (x0 + 52) + '" y="' + (y0 + 3) + '" width="12" height="2.2"/>' +
        '<rect x="' + (x0 + 70) + '" y="' + (y0 + 3) + '" width="15" height="2.2"/>' +
        // ombra della finestra
        '<rect x="' + (x0 + 16) + '" y="' + (y0 + 18) + '" width="96" height="64"/>' +
      '</g>' +
      // finestra
      '<rect class="carta tratto-nero" x="' + (x0 + 14) + '" y="' + (y0 + 16) + '" width="96" height="64"/>' +
      '<g class="tratto-nero sottile">' + strisce.join('') + '</g>' +
      '<rect class="carta" x="' + (x0 + 46) + '" y="' + (y0 + 16.8) + '" width="32" height="6.6"/>' +
      '<rect class="nero" x="' + (x0 + 50) + '" y="' + (y0 + 19) + '" width="24" height="2.2"/>' +
      '<rect class="carta tratto-nero sottile" x="' + (x0 + 19) + '" y="' + (y0 + 17.4) + '" width="5" height="5"/>' +
      '<path class="tratto-nero sottile" d="M' + (x0 + 14) + ' ' + (y0 + 24.4) + 'H' + (x0 + 110) + 'M' + (x0 + 102) + ' ' + (y0 + 24.4) + 'V' + (y0 + 80) + '"/>' +
      // dentro la finestra: un piccolo paesaggio a 1 bit
      '<rect fill="url(#gfx-retino-rado)" x="' + (x0 + 14.5) + '" y="' + (y0 + 25) + '" width="87" height="54.5"/>' +
      '<circle class="carta tratto-nero sottile" cx="' + (x0 + 42) + '" cy="' + (y0 + 46) + '" r="8"/>' +
      '<path class="nero" d="M' + (x0 + 14.5) + ' ' + (y0 + 79.5) + 'L' + (x0 + 28) + ' ' + (y0 + 60) + 'L' + (x0 + 40) + ' ' + (y0 + 70) + 'L' + (x0 + 58) + ' ' + (y0 + 51) + 'L' + (x0 + 76) + ' ' + (y0 + 68) + 'L' + (x0 + 90) + ' ' + (y0 + 58) + 'L' + (x0 + 101.5) + ' ' + (y0 + 66) + 'V' + (y0 + 79.5) + 'Z"/>' +
      '<rect class="carta tratto-nero sottile" x="' + (x0 + 103.5) + '" y="' + (y0 + 40) + '" width="5" height="7"/>' +
      // icone: dischetto e cestino
      '<rect class="carta tratto-nero sottile" x="' + (x0 + 121) + '" y="' + (y0 + 14) + '" width="13" height="14"/>' +
      '<rect class="nero" x="' + (x0 + 124) + '" y="' + (y0 + 14) + '" width="7" height="4"/>' +
      '<rect class="carta" x="' + (x0 + 119) + '" y="' + (y0 + 30) + '" width="17" height="4"/>' +
      '<path class="carta tratto-nero sottile" d="M' + (x0 + 122) + ' ' + (y0 + 70) + 'h11l-1.4 14h-8.2z"/>' +
      '<path class="tratto-nero sottile" d="M' + (x0 + 121) + ' ' + (y0 + 70) + 'h13M' + (x0 + 126) + ' ' + (y0 + 68) + 'h3"/>' +
      // vetro: leggero riflesso
      '<path class="riflesso" d="M146 72q-3 30 2 58l6-1q-4-26 0-55z"/>' +
      // fessura del dischetto, incavo, solco e base
      '<g class="l">' +
        '<rect class="sc" x="232" y="262" width="66" height="7" rx="3.5"/>' +
        '<rect class="be2 sottile" x="136" y="298" width="16" height="19" rx="4"/>' +
        '<rect class="be2" x="118" y="338" width="204" height="14" rx="4"/>' +
      '</g>' +
      '<path class="solco" d="M120 330H320"/>' +
      // mouse a un tasto, con il filo che passa dietro il computer
      '<path class="filo" d="M357 312C357 294 346 286 331 292"/>' +
      '<g class="l">' +
        '<rect class="be" x="342" y="312" width="30" height="46" rx="7"/>' +
        '<rect class="be2" x="346" y="316" width="22" height="13" rx="3"/>' +
      '</g>' +
      // ingrandimento
      '<rect class="evidenzia" x="' + (x0 + 12) + '" y="' + (y0 + 14) + '" width="10" height="10"/>' +
      '<path class="guida" d="M' + (x0 + 22) + ' ' + (y0 + 14) + 'L433 92M' + (x0 + 22) + ' ' + (y0 + 24) + 'L433 208"/>' +
      '<circle class="carta" cx="510" cy="150" r="96"/>' +
      '<g clip-path="url(#gfx-lente-mac)">' +
        '<g class="nero">' + pix.join('') + '</g>' +
        '<g class="griglia">' + righeGriglia.join('') + '</g>' +
      '</g>' +
      '<circle class="anello" cx="510" cy="150" r="96"/>' +
      '<text class="t" x="510" y="284" text-anchor="middle">512 × 342 pixel</text>' +
      '<text class="t2" x="510" y="314" text-anchor="middle">1 bit: nero o bianco</text>' +
      '<text class="t3" x="510" y="346" text-anchor="middle">21.888 byte</text>' +
    '</svg>';
  }

  // Una scheda VGA per bus ISA; nel cerchio, il connettore a 15 poli visto di fronte.
  function figuraVGA() {
    const parti = [];
    // contatti dorati: sezione a 8 bit (31) e prolunga a 16 bit (18), separate dalla tacca
    const dita = [];
    for (let i = 0; i < 31; i++) dita.push('<rect x="' + (305 + i * 5.3).toFixed(1) + '" y="258" width="3.4" height="19" rx="1"/>');
    for (let i = 0; i < 18; i++) dita.push('<rect x="' + (494 + i * 5.3).toFixed(1) + '" y="258" width="3.4" height="19" rx="1"/>');
    // piedini del chip VGA (14 per lato)
    const piedini = [];
    for (let i = 0; i < 14; i++) {
      const t = 336 + i * 5.6;
      piedini.push('<path d="M' + t.toFixed(1) + ' 86v6M' + t.toFixed(1) + ' 178v6M324 ' + (t - 238).toFixed(1) + 'h6M416 ' + (t - 238).toFixed(1) + 'h6"/>');
    }
    // memoria video: 8 chip
    const memorie = [];
    [210, 262].forEach((x) => [74, 114, 154, 194].forEach((y) => {
      memorie.push('<rect class="chip" x="' + x + '" y="' + y + '" width="44" height="28" rx="2"/>');
      for (let k = 0; k < 6; k++) memorie.push('<path class="piedino" d="M' + (x + 5 + k * 7) + ' ' + (y - 3) + 'v3M' + (x + 5 + k * 7) + ' ' + (y + 28) + 'v3"/>');
    }));
    // connettore per le espansioni (feature connector): 2 file di 13 contatti
    const feature = [];
    for (let i = 0; i < 13; i++) {
      feature.push('<rect x="' + (470 + i * 9) + '" y="56" width="5" height="5"/><rect x="' + (470 + i * 9) + '" y="64" width="5" height="5"/>');
    }
    // fori del connettore (vista frontale, lato scheda): fila alta 5-4-3-2-1, centrale 10…6, bassa 15…11
    const passo = 12.5, cx = 78, cy = 152;
    const foro = (x, y, cls) => '<circle class="' + cls + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4"/>';
    const fori = [];
    const classeFila1 = ['foro', 'foro', 'pin-b', 'pin-g', 'pin-r'];   // pin 5, 4, 3, 2, 1
    const classeFila3 = ['pin-ddc', 'pin-sync', 'pin-sync', 'pin-ddc', 'foro']; // pin 15, 14, 13, 12, 11
    for (let i = 0; i < 5; i++) {
      fori.push(foro(cx - 2 * passo + i * passo + 3, cy - 13, classeFila1[i]));
      fori.push(foro(cx - 2 * passo + i * passo - 3.25, cy, 'foro'));
      fori.push(foro(cx - 2 * passo + i * passo + 3, cy + 13, classeFila3[i]));
    }
    parti.push(
      '<svg class="gfx-fig" viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">',
      '<defs><clipPath id="gfx-lente-vga"><circle cx="78" cy="152" r="68"/></clipPath></defs>',
      // staffa metallica con il connettore visto di lato
      '<g class="l">',
        '<path class="gr" d="M174 28h50v10h-36v244l-4 24h-6l-4-24z"/>',
        '<rect class="gr2" x="156" y="124" width="18" height="56" rx="3"/>',
        '<rect class="gr" x="158" y="110" width="14" height="12" rx="2"/>',
        '<rect class="gr" x="158" y="182" width="14" height="12" rx="2"/>',
      '</g>',
      // circuito stampato con la linguetta dei contatti
      '<g class="l">',
        '<path class="pcb" d="M188 48h436v206H596v26H492v-26h-4v26H300v-26H188z"/>',
      '</g>',
      '<g class="oro">', dita.join(''), '</g>',
      // piste di rame
      '<g class="pista">',
        '<path d="M254 88h20M254 128h20M254 168h20M254 208h20"/>',
        '<path d="M306 88h18M306 120h18M306 150h18M306 176h18"/>',
        '<path d="M422 112h18M422 124h18M422 136h18"/>',
        '<path d="M440 132H418V200H390M376 200V238"/>',
        '<path d="M504 112h22v-30M504 124h30v-42"/>',
        '<path d="M188 140h-4M300 254V230h50M330 254V234M360 254V238M480 254V214h20M520 254V222M560 254V200"/>',
        '<path d="M232 230V246H318M244 230V250"/>',
      '</g>',
      // componenti
      '<g class="l">', memorie.join(''), '</g>',
      '<g class="piedino">', piedini.join(''), '</g>',
      '<g class="l">',
        '<rect class="chip" x="330" y="92" width="86" height="86" rx="4"/>',
        '<rect class="chip" x="440" y="100" width="64" height="42" rx="3"/>',
        '<rect class="chip" x="440" y="170" width="96" height="32" rx="2"/>',
        '<rect class="gr" x="330" y="200" width="34" height="20" rx="5"/>',
        '<rect class="gr" x="374" y="200" width="34" height="20" rx="5"/>',
        '<circle class="blu" cx="560" cy="114" r="10"/>',
        '<circle class="blu" cx="590" cy="114" r="10"/>',
        '<circle class="blu" cx="575" cy="146" r="10"/>',
      '</g>',
      '<rect class="etichetta-bios" x="452" y="176" width="44" height="20" rx="1"/>',
      '<path class="lucido" d="M335 205h24M379 205h24"/>',
      '<g class="piccoli">',
        '<rect x="548" y="176" width="22" height="8" rx="2"/><rect x="548" y="192" width="22" height="8" rx="2"/>',
        '<rect x="580" y="176" width="22" height="8" rx="2"/><rect x="580" y="192" width="22" height="8" rx="2"/>',
        '<rect x="200" y="232" width="8" height="18" rx="2"/><rect x="214" y="232" width="8" height="18" rx="2"/>',
      '</g>',
      '<g class="oro">', feature.join(''), '</g>',
      '<text class="chipt" x="373" y="143" text-anchor="middle">VGA</text>',
      '<text class="chipt piccolo" x="472" y="128" text-anchor="middle">DAC</text>',
      // ingrandimento del connettore
      '<path class="guida" d="M156 126L130 108M156 178L130 196"/>',
      '<circle class="tela" cx="78" cy="152" r="68"/>',
      '<g clip-path="url(#gfx-lente-vga)">',
        '<path class="gr l" d="M14 112h128l-10 82H24z"/>',
        '<path class="sc l" d="M24 121h108l-8 63H32z"/>',
        fori.join(''),
      '</g>',
      '<circle class="anello" cx="78" cy="152" r="68"/>',
      // legenda
      '<g class="legenda">',
        '<circle class="pin-r" cx="26" cy="326" r="7"/><circle class="pin-g" cx="44" cy="326" r="7"/><circle class="pin-b" cx="62" cy="326" r="7"/>',
        '<text class="t2" x="76" y="334">rosso, verde, blu</text>',
        '<g class="leg2"><circle class="pin-sync" cx="300" cy="326" r="7"/>',
        '<text class="t2" x="314" y="334">sincronismi</text></g>',
        '<g class="leg3"><circle class="pin-ddc" cx="478" cy="326" r="7"/>',
        '<text class="t2" x="492" y="334">DDC (I²C)</text></g>',
      '</g>',
      '</svg>');
    return parti.join('');
  }

  /* =====================================================================
   * Laboratorio: lo stesso disegno in cinque epoche
   * ===================================================================== */

  const NOMI_RETINATURA = { nessuna: 'Nessuna', fs: 'Floyd–Steinberg', atkinson: 'Atkinson' };

  const NOTE = {
    fhd: '<strong>Full HD, oggi.</strong> 1920' + X + '1080 pixel e 24 bit per pixel: 8 per il rosso, 8 per il verde e 8 per il blu, cioè 16.777.216 colori possibili. Non servono né tavolozza né retinatura: ogni pixel porta con sé il suo colore. Questo è il disegno originale; scegli un\'epoca per vedere come l\'avrebbe mostrato un computer di quegli anni.',
    cga: '<strong>CGA, 1981.</strong> 320' + X + '200 pixel e 4 colori, sempre gli stessi: nero, ciano, magenta e bianco. Con 2 bit per pixel l\'immagine occupa 16.000 byte, quasi tutti i 16 KB della scheda. Rossi e arancioni non esistono: il tramonto diventa un mosaico di puntini.',
    mac: '<strong>Macintosh, 1984.</strong> 512' + X + '342 pixel quadrati, ma un solo bit per pixel: bianco o nero. Le sfumature si imitano alternando punti bianchi e neri. Lo schermo occupa 21.888 byte, presi dai 128 KB di memoria del computer.',
    ega: '<strong>EGA, 1984.</strong> 640' + X + '350 pixel e 16 colori, qui i 16 predefiniti scelti fra 64 possibili. Con 4 bit per pixel servono 112.000 byte, più dei 64 KB montati di serie: per avere i 16 colori a questa risoluzione serviva l\'espansione di memoria.',
    vga: '<strong>VGA, modalità 13h, 1987.</strong> Di nuovo 320' + X + '200 pixel, ma con 256 colori scelti dal programma fra 262.144. Qui li sceglie l\'algoritmo <em>median cut</em>: divide i colori del disegno in 256 gruppi e usa la media di ciascuno. Un byte per pixel: 64.000 byte.',
  };

  const NOTE_RETINATURA = {
    nessuna: 'Senza retinatura ogni pixel prende il colore più vicino della tavolozza e le sfumature si spezzano in bande.',
    fs: 'Retinatura di Floyd e Steinberg (1976): la differenza fra il colore voluto e quello disponibile, l\'«errore», passa ai pixel vicini non ancora disegnati, nelle proporzioni 7/16, 3/16, 5/16 e 1/16.',
    atkinson: 'Retinatura di Bill Atkinson, usata sui primi Macintosh: l\'errore va per un ottavo a sei vicini e i due ottavi restanti si perdono. Più contrasto, ma luci e ombre «bruciate».',
  };

  const TAVOLOZZA_INFO = {
    cga: { conta: '4 fissi su 16', dida: 'La «tavolozza 1»: i 12 colori spenti non si possono usare insieme a questi quattro.' },
    mac: { conta: '2 colori', dida: 'Ogni pixel è un bit: 0 bianco, 1 nero.' },
    ega: { conta: '16 su 64', dida: 'Accesi i 16 colori predefiniti; un programma poteva sceglierne altri fra i 64.' },
    vga: { conta: '256 su 262.144', dida: 'I 256 colori scelti dal median cut per questo disegno, dal più scuro al più chiaro.' },
    fhd: { conta: '16.777.216', dida: 'Nessuna tavolozza: 256 livelli di rosso, 256 di verde e 256 di blu per ogni pixel.' },
  };

  const FORMA = { cga: 'più alti del 20%', mac: 'quadrati', ega: 'più alti del 37%', vga: 'più alti del 20%', fhd: 'quadrati' };

  // Melodia di prova per l'ascolto: «Fra Martino» (nota MIDI, durata in battiti).
  const MELODIA = [[60, 1], [62, 1], [64, 1], [60, 1], [60, 1], [62, 1], [64, 1], [60, 1], [64, 1], [65, 1], [67, 2], [64, 1], [65, 1], [67, 2]];

  function strisciaEpoca(id) {
    const fissa = (colori) => 'linear-gradient(90deg,' + colori.map((c, i) => c + ' ' + (i * 100 / colori.length).toFixed(2) + '% ' + ((i + 1) * 100 / colori.length).toFixed(2) + '%').join(',') + ')';
    if (id === 'cga') return fissa(M.TAVOLOZZE.cga.map(M.esadecimale));
    if (id === 'mac') return fissa(['#ffffff', '#000000']);
    if (id === 'ega') return fissa(M.TAVOLOZZE.ega.map(M.esadecimale));
    if (id === 'vga') return 'linear-gradient(90deg,#0d1238,#55327f,#a2427f,#e05d6f,#f99157,#ffd98c)';
    return 'linear-gradient(90deg,#ff3b3b,#ffd93b,#3bff6b,#3bd8ff,#4a5bff,#ff3bd8)';
  }

  // Il tramonto, disegnato a 1920 × 1080 su una tela fuori schermo, un pezzo alla volta.
  // Colori ricchi e sfumature continue: così si vede bene che cosa perde ogni epoca.
  function* scenaTramonto(g, W, H) {
    const orizzonte = Math.round(H * 0.6);
    const caso = M.rng(1984);

    // cielo
    const cielo = g.createLinearGradient(0, 0, 0, orizzonte);
    [[0, '#0d1238'], [0.22, '#232566'], [0.42, '#55327f'], [0.6, '#a2427f'], [0.75, '#e05d6f'], [0.87, '#f99157'], [0.95, '#ffbf6b'], [1, '#ffd98c']]
      .forEach((s) => cielo.addColorStop(s[0], s[1]));
    g.fillStyle = cielo;
    g.fillRect(0, 0, W, orizzonte + 20);
    yield 0.06;

    // stelle, più fitte e luminose in alto
    for (let i = 0; i < 240; i++) {
      const x = caso() * W, t = caso(), y = t * t * orizzonte * 0.5;
      const a = (1 - y / (orizzonte * 0.5)) * (0.35 + 0.65 * caso());
      const r = 0.8 + caso() * (caso() < 0.08 ? 2.6 : 1.4);
      g.fillStyle = 'rgba(255, 246, 228, ' + a.toFixed(3) + ')';
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    yield 0.12;

    // sole con il suo alone
    const sx = W * 0.46, sy = orizzonte - H * 0.075, sr = H * 0.1;
    const alone = g.createRadialGradient(sx, sy, sr * 0.5, sx, sy, H * 0.62);
    alone.addColorStop(0, 'rgba(255, 214, 140, 0.75)');
    alone.addColorStop(0.25, 'rgba(255, 160, 100, 0.35)');
    alone.addColorStop(1, 'rgba(255, 120, 110, 0)');
    g.fillStyle = alone;
    g.fillRect(0, 0, W, orizzonte + 20);
    const disco = g.createRadialGradient(sx, sy - sr * 0.3, sr * 0.1, sx, sy, sr);
    disco.addColorStop(0, '#fffdf0');
    disco.addColorStop(0.6, '#ffe9a8');
    disco.addColorStop(1, '#ffc56e');
    g.fillStyle = disco;
    g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();
    yield 0.18;

    // nuvole sottili, illuminate da sotto
    [[0.30, 0.43, 0.20, 0.012], [0.52, 0.47, 0.26, 0.010], [0.47, 0.515, 0.18, 0.008], [0.72, 0.36, 0.16, 0.014], [0.18, 0.30, 0.13, 0.011], [0.86, 0.50, 0.14, 0.009]]
      .forEach((n) => {
        const x = n[0] * W, y = n[1] * H, ax = n[2] * W, ay = Math.max(6, n[3] * H);
        const gr = g.createLinearGradient(0, y - ay * 2, 0, y + ay);
        gr.addColorStop(0, 'rgba(120, 60, 130, 0.7)');
        gr.addColorStop(1, 'rgba(255, 150, 120, 0.9)');
        g.fillStyle = gr;
        g.beginPath(); g.ellipse(x, y, ax, ay, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(x + ax * 0.3, y - ay * 0.9, ax * 0.45, ay * 0.9, 0, 0, Math.PI * 2); g.fill();
      });
    yield 0.26;

    // tre catene di montagne, dalle più lontane (velate) alle più vicine (scure)
    const strati = [
      { seme: 11, base: orizzonte + 6, alt: H * 0.24, alto: '#c0739f', basso: '#e09a9a', luce: 'rgba(255, 205, 160, 0.6)', esp: 1.3 },
      { seme: 23, base: orizzonte + 8, alt: H * 0.16, alto: '#7d4585', basso: '#9a5a8c', luce: 'rgba(255, 170, 150, 0.35)', esp: 1.15 },
      { seme: 37, base: orizzonte + 10, alt: H * 0.10, alto: '#3f2a5e', basso: '#52346c', luce: null, esp: 1 },
    ];
    const profili = [];
    // una valle dove tramonta il sole, così il disco resta in vista
    const valle = (x) => 1 - 0.8 * Math.exp(-Math.pow((x / W - 0.46) / 0.11, 2));
    for (const s of strati) {
      const prof = M.crinale(s.seme, 161, 6, 0.52);
      const punti = Array.from(prof, (v, i) => {
        const x = i / 160 * W;
        return [x, s.base - Math.pow(Math.min(1, Math.max(0, (v - 0.22) / 0.6)), s.esp) * s.alt * valle(x)];
      });
      g.beginPath(); g.moveTo(0, H);
      punti.forEach((p) => g.lineTo(p[0], p[1]));
      g.lineTo(W, H); g.closePath();
      const gr = g.createLinearGradient(0, s.base - s.alt, 0, s.base);
      gr.addColorStop(0, s.alto);
      gr.addColorStop(1, s.basso);
      g.fillStyle = gr;
      g.fill();
      if (s.luce) {
        g.strokeStyle = s.luce; g.lineWidth = 3; g.lineJoin = 'round';
        g.beginPath();
        punti.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
        g.stroke();
      }
      profili.push({ punti: punti, s: s });
      yield 0.3 + 0.08 * profili.length;
    }

    // lago: riflesso del cielo, delle montagne e del sole
    const lagoAlto = orizzonte + 10, lagoBasso = Math.round(H * 0.87);
    const acqua = g.createLinearGradient(0, lagoAlto, 0, lagoBasso);
    acqua.addColorStop(0, '#f2a46e');
    acqua.addColorStop(0.25, '#c9607a');
    acqua.addColorStop(0.6, '#6b3a78');
    acqua.addColorStop(1, '#2c2152');
    g.fillStyle = acqua;
    g.fillRect(0, lagoAlto, W, lagoBasso - lagoAlto + 2);
    g.save();
    g.beginPath(); g.rect(0, lagoAlto, W, lagoBasso - lagoAlto); g.clip();
    profili.forEach((pr) => {
      g.beginPath(); g.moveTo(0, lagoAlto);
      pr.punti.forEach((p) => g.lineTo(p[0], lagoAlto + (pr.s.base - p[1]) * 0.55));
      g.lineTo(W, lagoAlto); g.closePath();
      g.globalAlpha = 0.45; g.fillStyle = pr.s.alto; g.fill(); g.globalAlpha = 1;
    });
    const caso2 = M.rng(7);
    for (let y = lagoAlto + 2; y < lagoBasso; y += 5 + caso2() * 5) {
      const t = (y - lagoAlto) / (lagoBasso - lagoAlto);
      const larga = sr * (0.9 + t * 1.6) * (0.4 + caso2() * 0.8);
      g.fillStyle = 'rgba(255, 228, 160, ' + (0.75 * (1 - t) + 0.05).toFixed(3) + ')';
      g.fillRect(sx - larga / 2 + (caso2() - 0.5) * sr * 0.6, y, larga, 1.5 + caso2() * 2.5);
    }
    g.fillStyle = 'rgba(40, 20, 60, 0.18)';
    for (let i = 0; i < 70; i++) g.fillRect(caso2() * W, lagoAlto + caso2() * (lagoBasso - lagoAlto), 40 + caso2() * 160, 1.5);
    g.restore();
    yield 0.6;

    // riva in controluce con i fili d'erba
    const riva = M.crinale(53, 81, 4, 0.5);
    const yRiva = (x) => {
      const f = x / W * 80, i = Math.min(79, Math.floor(f)), t = f - i;
      return H * 0.845 + ((riva[i] * (1 - t) + riva[i + 1] * t) - 0.5) * H * 0.05 + (x / W) * H * 0.02;
    };
    g.beginPath(); g.moveTo(0, H);
    for (let i = 0; i <= 80; i++) g.lineTo(i / 80 * W, yRiva(i / 80 * W));
    g.lineTo(W, H); g.closePath();
    const terra = g.createLinearGradient(0, H * 0.82, 0, H);
    terra.addColorStop(0, '#2a1b3f');
    terra.addColorStop(1, '#120c20');
    g.fillStyle = terra;
    g.fill();
    g.strokeStyle = 'rgba(255, 170, 130, 0.35)'; g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= 80; i++) { const x = i / 80 * W; if (i) g.lineTo(x, yRiva(x)); else g.moveTo(x, yRiva(x)); }
    g.stroke();
    g.strokeStyle = 'rgba(20, 12, 30, 0.95)'; g.lineWidth = 2.2; g.lineCap = 'round';
    for (let i = 0; i < 280; i++) {
      const x = caso2() * W, base = yRiva(x) + 8, alto = 10 + caso2() * 36;
      g.beginPath(); g.moveTo(x, base);
      g.quadraticCurveTo(x + (caso2() - 0.5) * 10, base - alto * 0.6, x + (caso2() - 0.5) * 18, base - alto);
      g.stroke();
    }
    yield 0.7;

    // un tavolino con un piccolo computer degli anni Ottanta
    const tx = W * 0.64, ty = H * 0.8, tw = W * 0.21;
    g.fillStyle = 'rgba(5, 2, 10, 0.4)';
    g.beginPath(); g.ellipse(tx + tw / 2, H * 0.95, tw * 0.62, 18, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3b2414';
    g.fillRect(tx + 22, ty + 20, 14, H * 0.14);
    g.fillRect(tx + tw - 36, ty + 20, 14, H * 0.14);
    g.fillStyle = '#8a5432'; g.fillRect(tx, ty, tw, 16);
    g.fillStyle = '#5e361f'; g.fillRect(tx, ty + 16, tw, 10);
    g.fillStyle = '#d2915a'; g.fillRect(tx, ty, tw, 3);

    const cx0 = tx + tw * 0.3, cw = W * 0.082, ch = H * 0.2, cy0 = ty - ch;
    const rett = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    g.fillStyle = 'rgba(10, 5, 15, 0.45)'; g.fillRect(cx0 - 4, ty - 4, cw + 16, 6);
    g.fillStyle = '#e8dcc0'; rett(cx0, cy0, cw, ch, 10); g.fill();
    g.fillStyle = '#c7b996'; g.fillRect(cx0 + cw - 14, cy0 + 6, 10, ch - 12);
    g.fillStyle = '#ffc896'; g.fillRect(cx0 + 2, cy0 + 10, 5, ch - 20);
    g.fillStyle = '#bfb394'; rett(cx0 + 14, cy0 + 16, cw - 30, ch * 0.54, 8); g.fill();
    const vx = cx0 + 22, vy = cy0 + 24, vw = cw - 46, vh = ch * 0.54 - 16;
    g.fillStyle = '#0b1a13'; rett(vx, vy, vw, vh, 10); g.fill();
    g.save();
    g.globalCompositeOperation = 'lighter';
    const bagliore = g.createRadialGradient(vx + vw / 2, vy + vh / 2, 4, vx + vw / 2, vy + vh / 2, vw * 1.1);
    bagliore.addColorStop(0, 'rgba(90, 255, 170, 0.3)');
    bagliore.addColorStop(1, 'rgba(90, 255, 170, 0)');
    g.fillStyle = bagliore;
    g.fillRect(vx - vw, vy - vh, vw * 3, vh * 3);
    g.restore();
    g.fillStyle = '#7dffb8';
    g.font = 'bold 15px monospace';
    g.fillText('READY.', vx + 9, vy + 22);
    g.fillText('10 PRINT', vx + 9, vy + 42);
    g.fillRect(vx + 9, vy + 52, 9, 13);
    g.fillStyle = '#3a332a'; g.fillRect(cx0 + cw * 0.5, cy0 + ch * 0.76, cw * 0.34, 6);
    g.fillStyle = '#ddd0b2';
    g.beginPath(); g.moveTo(cx0 - 26, ty); g.lineTo(cx0 + cw + 34, ty); g.lineTo(cx0 + cw + 22, ty - 20); g.lineTo(cx0 - 14, ty - 20); g.closePath(); g.fill();
    g.fillStyle = '#b8ab8c';
    for (let r = 0; r < 3; r++) for (let k = 0; k < 13; k++) g.fillRect(cx0 - 10 + k * 13 - r * 3, ty - 17 + r * 6, 9, 3.5);
    g.strokeStyle = '#2b2230'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx0 + cw, ty - 40); g.bezierCurveTo(cx0 + cw + 40, ty - 30, cx0 + cw + 50, ty - 10, cx0 + cw + 62, ty - 9); g.stroke();
    g.fillStyle = '#ddd0b2';
    g.beginPath(); g.ellipse(cx0 + cw + 74, ty - 7, 15, 9, 0, 0, Math.PI * 2); g.fill();
    g.save();
    g.globalCompositeOperation = 'lighter';
    const luceTavolo = g.createRadialGradient(vx + vw / 2, ty + 6, 4, vx + vw / 2, ty + 6, tw * 0.5);
    luceTavolo.addColorStop(0, 'rgba(110, 255, 190, 0.14)');
    luceTavolo.addColorStop(1, 'rgba(110, 255, 190, 0)');
    g.fillStyle = luceTavolo;
    g.fillRect(tx - 20, ty - 30, tw + 40, 70);
    g.restore();
    yield 0.85;

    // uccelli lontani: linee sottilissime che le basse risoluzioni perdono
    g.strokeStyle = 'rgba(35, 18, 45, 0.85)'; g.lineWidth = 3; g.lineCap = 'round';
    [[0.6, 0.33, 16], [0.63, 0.31, 12], [0.655, 0.345, 10], [0.36, 0.25, 13], [0.39, 0.235, 9]].forEach((u) => {
      const x = u[0] * W, y = u[1] * H, s = u[2];
      g.beginPath(); g.moveTo(x - s, y - s * 0.35);
      g.quadraticCurveTo(x - s * 0.45, y - s * 0.6, x, y);
      g.quadraticCurveTo(x + s * 0.45, y - s * 0.6, x + s, y - s * 0.35);
      g.stroke();
    });
    yield 0.95;
    return g.getImageData(0, 0, W, H).data;
  }

  function creaLaboratorio(el, ctx) {
    const h = ctx.h;
    if (!M) throw new Error('Manca il modello del capitolo 8 (js/modelli/08-grafica.js).');
    const W = 1920, H = 1080;
    const lista = M.MODALITA;
    const stato = {
      id: 'fhd',
      retinatura: {},
      lente: true,
      X: W * 0.2, // punto della scena osservato dalla lente: una nuvola sottile nel cielo a sinistra
      Y: H * 0.31,
      dito: false,
      attivo: false,
      daMostrare: false,
    };
    lista.forEach((m) => { stato.retinatura[m.id] = m.retinatura; });

    const colore = (nome, riserva) => (ctx.cssVar(nome, el) || riserva);
    const ACCENTI = {
      cga: colore('--trace-3', '#5cc8ff'),
      mac: '#ecebe4',
      ega: colore('--trace-2', '#ffc04d'),
      vga: colore('--trace-4', '#ff7aa8'),
      fhd: colore('--trace-1', '#3ee08f'),
    };

    /* ---------- struttura ---------- */

    const idAiuto = ctx.uid('gfx-aiuto');
    const annunci = h('p', { class: 'gfx-sr', 'aria-live': 'polite' });

    const pillola = h('span', { class: 'gfx-pillola', 'aria-hidden': 'true' });
    const bottoniEpoca = lista.map((m) => h('button', {
      type: 'button', class: 'gfx-epoca', 'aria-pressed': 'false', 'data-id': m.id,
      'aria-label': m.nome + ', ' + m.etichetta,
      onclick: () => scegli(m.id),
    },
    h('span', { class: 'gfx-epoca-anno' }, m.etichetta),
    h('span', { class: 'gfx-epoca-nome' }, h('span', { class: 'gfx-lungo' }, m.nome), h('span', { class: 'gfx-corto' }, m.breve)),
    h('span', { class: 'gfx-epoca-tav', style: 'background:' + strisciaEpoca(m.id) })));
    const epoche = h('div', { class: 'gfx-epoche', role: 'group', 'aria-label': 'Scegli l\'epoca' }, pillola, bottoniEpoca);

    const tela = h('canvas', { class: 'gfx-tela', 'aria-hidden': 'true' });
    const telaLente = h('canvas', { 'aria-hidden': 'true' });
    const lente = h('div', { class: 'gfx-lente', 'aria-hidden': 'true' }, telaLente);
    const osd = h('div', { class: 'gfx-osd', 'aria-hidden': 'true' });
    const barraCarico = h('i');
    const testoCarico = h('span', null, 'Disegno il tramonto…');
    const carico = h('div', { class: 'gfx-carico', 'aria-hidden': 'true' }, testoCarico, h('span', { class: 'gfx-carico-barra' }, barraCarico));
    const schermo = h('div', { class: 'gfx-schermo', tabindex: '0', role: 'img', 'aria-describedby': idAiuto }, tela, lente, osd, carico);

    const campione = h('span', { class: 'gfx-campione', 'aria-hidden': 'true' });
    const testoPixel = h('span', { class: 'gfx-pixel-testo' }, 'Preparo il disegno…');
    const btnLente = h('button', { type: 'button', class: 'lab-btn gfx-btn-lente', 'aria-pressed': 'true', onclick: () => impostaLente(!stato.lente) }, 'Lente');
    const infoPixel = h('div', { class: 'gfx-pixel' }, campione, h('p', { class: 'lab-mono' }, testoPixel), btnLente);
    const aiuto = h('p', { class: 'gfx-aiuto', id: idAiuto }, 'Passa sopra l\'immagine, oppure toccala e trascina, per muovere la lente. Da tastiera: frecce, con Maiusc per passi lunghi.');

    const letture = {};
    const voce = (k, nome) => { letture[k] = h('dd', null, '—'); return h('div', null, h('dt', null, nome), letture[k]); };
    const kv = h('dl', { class: 'lab-kv gfx-kv' }, voce('ris', 'Risoluzione'), voce('col', 'Colori'), voce('bpp', 'Bit per pixel'), voce('forma', 'Pixel'));

    const contaTav = h('span', { class: 'gfx-mini-dx' });
    const telaTav = h('canvas', { class: 'gfx-tav', 'aria-hidden': 'true' });
    const didaTav = h('p', { class: 'gfx-dida' });
    const pannelloTav = h('div', { class: 'gfx-pannello' }, h('p', { class: 'gfx-mini-tit' }, h('span', null, 'Tavolozza'), contaTav), telaTav, didaTav);

    const numMem = h('span', { class: 'gfx-mem-num' }, '0');
    const formulaMem = h('p', { class: 'gfx-mem-formula lab-mono' });
    const telaGriglia = h('canvas', { class: 'gfx-griglia', 'aria-hidden': 'true' });
    const didaMem = h('p', { class: 'gfx-dida' });
    const pannelloMem = h('div', { class: 'gfx-pannello' },
      h('p', { class: 'gfx-mini-tit' }, h('span', null, 'Memoria video'), h('span', { class: 'gfx-mini-dx' }, 'una schermata')),
      h('p', { class: 'gfx-mem' }, numMem, h('span', { class: 'gfx-mem-unita' }, 'byte')),
      formulaMem, telaGriglia, didaMem);

    const btnPrima = h('button', { type: 'button', class: 'lab-btn gfx-freccia', 'aria-label': 'Epoca precedente', title: 'Epoca precedente', onclick: () => sposta(-1) }, h('span', { 'aria-hidden': 'true' }, '←'));
    const btnDopo = h('button', { type: 'button', class: 'lab-btn gfx-freccia', 'aria-label': 'Epoca successiva', title: 'Epoca successiva', onclick: () => sposta(1) }, h('span', { 'aria-hidden': 'true' }, '→'));
    const idRet = ctx.uid('gfx-ret');
    const bottoniRet = M.RETINATURE.map((r) => h('button', { type: 'button', 'aria-pressed': 'false', 'data-ret': r, onclick: () => scegliRetinatura(r) }, NOMI_RETINATURA[r]));
    const segRet = h('div', { class: 'lab-seg gfx-seg', role: 'group', 'aria-labelledby': idRet }, bottoniRet);
    const controlli = h('div', { class: 'lab-controls gfx-controlli' },
      h('div', { class: 'gfx-gruppo' }, btnPrima, btnDopo),
      h('div', { class: 'gfx-gruppo gfx-gruppo-ret' }, h('span', { class: 'gfx-etichetta', id: idRet }, 'Retinatura'), segRet));

    const nota = h('p', { class: 'lab-note gfx-nota', 'aria-live': 'polite' });

    // ascolto: onda quadra dell'altoparlante e sintesi FM
    const btnQuadra = h('button', { type: 'button', class: 'lab-btn gfx-btn-audio', 'aria-pressed': 'false', onclick: () => suona('quadra') }, h('span', { 'aria-hidden': 'true' }, '♪'), 'Altoparlante del PC');
    const btnFM = h('button', { type: 'button', class: 'lab-btn gfx-btn-audio', 'aria-pressed': 'false', onclick: () => suona('fm') }, h('span', { 'aria-hidden': 'true' }, '♪'), 'Sintesi FM (AdLib)');
    const telaOnda = h('canvas', { class: 'gfx-onda', 'aria-hidden': 'true' });
    const audio = h('div', { class: 'gfx-audio' },
      h('div', { class: 'gfx-audio-testa' },
        h('p', { class: 'gfx-mini-tit' }, h('span', null, 'Ascolta il suono delle epoche')),
        h('div', { class: 'lab-controls' }, btnQuadra, btnFM)),
      telaOnda);

    el.append(h('div', { class: 'gfx' },
      epoche,
      h('div', { class: 'gfx-corpo' },
        h('div', { class: 'gfx-monitor' }, schermo, infoPixel, aiuto, controlli, nota),
        h('div', { class: 'gfx-lato' }, kv, pannelloTav, pannelloMem)),
      audio,
      annunci));

    /* ---------- calcolo a pezzi, un poco per fotogramma ---------- */

    const scena = document.createElement('canvas');
    scena.width = W; scena.height = H;
    const sorgente = { larghezza: W, altezza: H, dati: null };
    const cacheModello = {};
    const risultati = new Map();
    const coda = [];
    let rafPompa = 0, inPausa = false, distrutto = false, attesa = null, attesaDa = 0;

    function chiave(id, ret) { return id === 'fhd' ? 'fhd' : id + ':' + ret; }
    function chiaveCorrente() { return chiave(stato.id, stato.retinatura[stato.id]); }
    function risultatoCorrente() { return risultati.get(chiaveCorrente()); }
    function modCorrente() { return M.perId(stato.id); }

    function accoda(k, crea, davanti) {
      if (risultati.has(k)) return;
      const i = coda.findIndex((j) => j.chiave === k);
      const inizio = coda.length && coda[0].chiave === 'scena' ? 1 : 0;
      if (i >= 0) {
        if (davanti && i > inizio) coda.splice(inizio, 0, coda.splice(i, 1)[0]);
      } else {
        const lavoro = { chiave: k, crea: crea, gen: null, progresso: 0 };
        if (davanti) coda.splice(inizio, 0, lavoro); else coda.push(lavoro);
      }
      avviaPompa();
    }

    function accodaModalita(id, ret, davanti) {
      accoda(chiave(id, ret), () => M.elabora(id, sorgente, ret, cacheModello), davanti);
    }

    function avviaPompa() {
      if (!rafPompa && !inPausa && !distrutto && coda.length) rafPompa = requestAnimationFrame(pompa);
    }

    function pompa() {
      rafPompa = 0;
      const t0 = performance.now();
      const budget = attesa ? 14 : 7;
      while (coda.length && performance.now() - t0 < budget) {
        const lavoro = coda[0];
        let r;
        try {
          if (!lavoro.gen) lavoro.gen = lavoro.crea();
          r = lavoro.gen.next();
        } catch (err) {
          console.error('Laboratorio grafica:', err);
          coda.shift();
          continue;
        }
        if (r.done) { coda.shift(); completa(lavoro.chiave, r.value); }
        else if (typeof r.value === 'number') lavoro.progresso = r.value;
      }
      aggiornaCarico();
      avviaPompa();
    }

    function completa(k, valore) {
      if (k === 'scena') {
        sorgente.dati = valore;
        risultati.set('fhd', { modalita: M.perId('fhd'), larghezza: W, altezza: H, rgba: valore, indici: null, tavolozza: null, tela: scena });
        // le altre epoche si preparano in sottofondo, nell'ordine dei pulsanti
        lista.forEach((m) => { if (m.id !== 'fhd') accodaModalita(m.id, m.retinatura, false); });
        k = 'fhd';
      } else {
        const piccola = document.createElement('canvas');
        piccola.width = valore.larghezza; piccola.height = valore.altezza;
        piccola.getContext('2d').putImageData(new ImageData(valore.rgba, valore.larghezza, valore.altezza), 0, 0);
        valore.tela = piccola;
        risultati.set(k, valore);
      }
      if (k === chiaveCorrente()) {
        attesa = null;
        if (stato.attivo || visibile) mostra(true);
        else stato.daMostrare = true;
      }
    }

    function aggiornaCarico() {
      const aspetta = attesa && !risultati.has(attesa);
      const lavoro = aspetta ? coda.find((j) => j.chiave === attesa || j.chiave === 'scena') : null;
      if (lavoro) {
        const scenaPrima = lavoro.chiave === 'scena';
        testoCarico.textContent = scenaPrima ? 'Disegno il tramonto…' : 'Riduco i colori…';
        barraCarico.style.transform = 'scaleX(' + (scenaPrima && attesa !== 'fhd' ? 0 : lavoro.progresso).toFixed(3) + ')';
      }
      carico.classList.toggle('on', !!aspetta && performance.now() - attesaDa > 120);
    }

    /* ---------- disegno sullo schermo ---------- */

    let visibile = null; // fotogramma (tela fuori schermo) mostrato ora
    let anim = null;
    let timerOsd = 0;

    function dpr() { return Math.min(2, window.devicePixelRatio || 1); }

    // Rettangolo occupato dall'immagine dentro uno schermo largo w e alto hh (proporzioni corrette).
    function rettangolo(m, w, hh) {
      let rw = w, rh = w / m.aspetto;
      if (rh > hh) { rh = hh; rw = hh * m.aspetto; }
      return { x: (w - rw) / 2, y: (hh - rh) / 2, w: rw, h: rh };
    }

    function nuovaTela(w, hh) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, w); c.height = Math.max(1, hh);
      return c;
    }

    // Prepara il fotogramma di un'epoca alla risoluzione dello schermo. I pixel restano netti:
    // prima si ingrandisce di un fattore intero senza sfumare (imageSmoothingEnabled = false),
    // poi si adatta al rettangolo finale con un passaggio minimo, così i pixel hanno tutti la stessa
    // grandezza anche quando lo schermo non è un multiplo esatto della risoluzione.
    function componi(res) {
      const c = nuovaTela(tela.width, tela.height);
      const g = c.getContext('2d');
      g.fillStyle = '#000';
      g.fillRect(0, 0, c.width, c.height);
      if (!res) return c;
      const m = res.modalita;
      const R = rettangolo(m, c.width, c.height);
      const x = Math.round(R.x), y = Math.round(R.y), w = Math.round(R.w), hh = Math.round(R.h);
      if (m.id === 'fhd' || w < res.larghezza) {
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(res.tela, 0, 0, res.larghezza, res.altezza, x, y, w, hh);
      } else {
        const kx = Math.max(1, Math.ceil(w / res.larghezza)), ky = Math.max(1, Math.ceil(hh / res.altezza));
        const inter = nuovaTela(res.larghezza * kx, res.altezza * ky);
        const gi = inter.getContext('2d');
        gi.imageSmoothingEnabled = false;
        gi.drawImage(res.tela, 0, 0, inter.width, inter.height);
        g.imageSmoothingEnabled = inter.width !== w || inter.height !== hh;
        g.imageSmoothingQuality = 'low';
        g.drawImage(inter, x, y, w, hh);
      }
      return c;
    }

    function copiaTela() {
      const c = nuovaTela(tela.width, tela.height);
      c.getContext('2d').drawImage(tela, 0, 0);
      return c;
    }

    // Tendina di scansione: il nuovo fotogramma scende riga dopo riga dietro un fascio luminoso,
    // come il pennello di elettroni di un tubo catodico.
    function scansione(g, da, a, v) {
      const w = tela.width, hh = tela.height;
      const y = Math.round(v * hh);
      g.globalCompositeOperation = 'source-over';
      g.drawImage(da, 0, 0);
      if (y > 0) g.drawImage(a, 0, 0, w, y, 0, 0, w, y);
      g.globalCompositeOperation = 'lighter';
      const scia = Math.round(hh * 0.14);
      const gr = g.createLinearGradient(0, y - scia, 0, y);
      gr.addColorStop(0, 'rgba(110, 255, 190, 0)');
      gr.addColorStop(1, 'rgba(110, 255, 190, 0.16)');
      g.fillStyle = gr;
      g.fillRect(0, y - scia, w, scia);
      const s = Math.max(2, Math.round(hh / 240));
      const alone = g.createLinearGradient(0, y - s * 7, 0, y + s * 4);
      alone.addColorStop(0, 'rgba(120, 255, 200, 0)');
      alone.addColorStop(0.65, 'rgba(120, 255, 200, 0.4)');
      alone.addColorStop(1, 'rgba(120, 255, 200, 0)');
      g.fillStyle = alone;
      g.fillRect(0, y - s * 7, w, s * 11);
      g.fillStyle = 'rgba(232, 255, 244, 0.95)';
      g.fillRect(0, y - s, w, s);
      g.globalCompositeOperation = 'source-over';
    }

    function transizione(nuovo, animato) {
      const g = tela.getContext('2d');
      if (anim) { anim.cancel(); anim = null; visibile = copiaTela(); }
      if (!visibile || !animato || ctx.ridotto()) {
        g.drawImage(nuovo, 0, 0);
        visibile = nuovo;
        mostraOsd();
        return;
      }
      const da = visibile;
      anim = ctx.tween({
        from: 0, to: 1, dur: ctx.motion.dur.slow + 250, ease: 'sharp',
        update: (v) => scansione(g, da, nuovo, v),
        done: () => { anim = null; visibile = nuovo; g.drawImage(nuovo, 0, 0); mostraOsd(); },
      });
    }

    function mostra(animato) {
      const res = risultatoCorrente();
      if (!res) return;
      stato.daMostrare = false;
      transizione(componi(res), animato);
      aggiornaLente();
      disegnaTavolozza();
    }

    function mostraOsd() {
      const m = modCorrente();
      osd.textContent = m.nome + ' · ' + m.larghezza + '×' + m.altezza + ' · ' + (m.id === 'fhd' ? '16,7 milioni di colori' : m.colori + ' colori');
      osd.classList.add('on');
      clearTimeout(timerOsd);
      timerOsd = setTimeout(() => osd.classList.remove('on'), 2400);
    }

    /* ---------- lente d'ingrandimento ---------- */

    const PIXEL_LENTE = 11; // pixel mostrati in larghezza dentro la lente

    function latoLente() { return schermo.clientWidth < 420 ? 96 : 124; }

    // Pixel dell'epoca corrente che corrisponde al punto della scena osservato.
    function pixelCorrente(m) {
      m = m || modCorrente();
      const rit = M.ritaglio(m.aspetto, W, H);
      const u = ctx.clamp((stato.X - rit.x) / rit.w, 0, 0.99999);
      const v = ctx.clamp((stato.Y - rit.y) / rit.h, 0, 0.99999);
      return { sx: Math.floor(u * m.larghezza), sy: Math.floor(v * m.altezza) };
    }

    function puntaPixel(m, sx, sy) {
      const rit = M.ritaglio(m.aspetto, W, H);
      stato.X = rit.x + (sx + 0.5) / m.larghezza * rit.w;
      stato.Y = rit.y + (sy + 0.5) / m.altezza * rit.h;
    }

    function posizionaLente() {
      const m = modCorrente();
      const cw = schermo.clientWidth, chh = schermo.clientHeight;
      const R = rettangolo(m, cw, chh);
      const p = pixelCorrente(m);
      const px = R.x + (p.sx + 0.5) / m.larghezza * R.w;
      const py = R.y + (p.sy + 0.5) / m.altezza * R.h;
      const L = latoLente();
      let cx = px, cy = py;
      if (stato.dito) { // col dito la lente sta sopra il punto, per non essere coperta
        cy = py - L * 0.85;
        if (cy - L / 2 < 0) cy = py + L * 0.85;
      }
      cx = ctx.clamp(cx, L / 2, Math.max(L / 2, cw - L / 2));
      cy = ctx.clamp(cy, L / 2, Math.max(L / 2, chh - L / 2));
      lente.style.transform = 'translate3d(' + (cx - L / 2).toFixed(1) + 'px,' + (cy - L / 2).toFixed(1) + 'px,0)';
    }

    function coloreDi(res, sx, sy) {
      const o = (sy * res.larghezza + sx) * 4;
      return [res.rgba[o], res.rgba[o + 1], res.rgba[o + 2]];
    }

    function disegnaLente() {
      const res = risultatoCorrente();
      const L = latoLente();
      const S = Math.round(L * dpr());
      if (telaLente.width !== S) { telaLente.width = S; telaLente.height = S; }
      const g = telaLente.getContext('2d');
      g.fillStyle = '#000';
      g.fillRect(0, 0, S, S);
      if (!res) return;
      const m = res.modalita;
      const p = pixelCorrente(m);
      const z = S / PIXEL_LENTE;                 // lato orizzontale di un pixel nella lente
      const zh = z / M.formaPixel(m);            // altezza: i pixel CGA, EGA e VGA sono più alti
      const metaX = Math.ceil(PIXEL_LENTE / 2) + 1;
      const metaY = Math.ceil(S / zh / 2) + 1;
      const x0 = S / 2 - (metaX + 0.5) * z, y0 = S / 2 - (metaY + 0.5) * zh;
      g.imageSmoothingEnabled = false;           // pixel netti, nessuna sfumatura
      const sx0 = p.sx - metaX, sy0 = p.sy - metaY;
      const cs = Math.max(0, sx0), rs = Math.max(0, sy0);
      const ce = Math.min(res.larghezza, p.sx + metaX + 1), re = Math.min(res.altezza, p.sy + metaY + 1);
      if (ce > cs && re > rs) {
        g.drawImage(res.tela, cs, rs, ce - cs, re - rs, x0 + (cs - sx0) * z, y0 + (rs - sy0) * zh, (ce - cs) * z, (re - rs) * zh);
      }
      // griglia fra i pixel
      g.strokeStyle = 'rgba(0, 0, 0, 0.32)';
      g.lineWidth = Math.max(1, dpr() * 0.75);
      g.beginPath();
      for (let k = 0; k <= metaX * 2 + 1; k++) { const x = Math.round(x0 + k * z) + 0.5; g.moveTo(x, 0); g.lineTo(x, S); }
      for (let k = 0; k <= metaY * 2 + 1; k++) { const y = Math.round(y0 + k * zh) + 0.5; g.moveTo(0, y); g.lineTo(S, y); }
      g.stroke();
      // il pixel osservato
      const cx = S / 2 - z / 2, cy = S / 2 - zh / 2;
      g.lineWidth = 3 * dpr();
      g.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      g.strokeRect(cx - 1.5 * dpr(), cy - 1.5 * dpr(), z + 3 * dpr(), zh + 3 * dpr());
      g.lineWidth = 1.5 * dpr();
      g.strokeStyle = '#fff';
      g.strokeRect(cx, cy, z, zh);
    }

    function testoDelPixel(res, p) {
      const m = res.modalita;
      const c = coloreDi(res, p.sx, p.sy);
      const hex = M.esadecimale(c);
      const dove = 'x ' + p.sx + ' · y ' + p.sy + ' → ';
      if (!res.indici) return { colore: hex, testo: dove + hex + ' · R ' + c[0] + ' G ' + c[1] + ' B ' + c[2] };
      const i = res.indici[p.sy * res.larghezza + p.sx];
      if (m.id === 'mac') return { colore: hex, testo: dove + 'bit ' + i + ' = ' + M.nomeColore('mac', i), indice: i };
      const nome = M.nomeColore(m.id, i);
      return { colore: hex, testo: dove + 'colore ' + i + ' di ' + res.tavolozza.length + ' (bit ' + M.bit(i, m.bpp) + ') · ' + hex + (nome ? ' ' + nome : ''), indice: i };
    }

    let timerAnnuncio = 0;
    let indiceLente = -1;

    function aggiornaPixel(annuncia) {
      const res = risultatoCorrente();
      if (!res) { testoPixel.textContent = 'Calcolo in corso…'; campione.style.background = 'transparent'; return; }
      const info = testoDelPixel(res, pixelCorrente(res.modalita));
      testoPixel.textContent = info.testo;
      campione.style.background = info.colore;
      if (info.indice !== indiceLente) { indiceLente = info.indice == null ? -1 : info.indice; disegnaTavolozza(); }
      if (annuncia) {
        clearTimeout(timerAnnuncio);
        timerAnnuncio = setTimeout(() => ctx.annuncia(annunci, info.testo.replace('→', ':')), 260);
      }
    }

    function aggiornaLente(annuncia) {
      lente.classList.toggle('on', stato.lente && !!risultatoCorrente());
      posizionaLente();
      disegnaLente();
      aggiornaPixel(annuncia);
    }

    function impostaLente(on) {
      stato.lente = on;
      btnLente.setAttribute('aria-pressed', String(on));
      schermo.classList.toggle('senza-lente', !on);
      aggiornaLente(false);
    }

    let tocco = null, puntatore = null, rafLente = 0;
    function applicaPuntatore() {
      rafLente = 0;
      if (!puntatore || distrutto) return;
      const e = puntatore;
      puntatore = null;
      const r = schermo.getBoundingClientRect();
      const m = modCorrente();
      const R = rettangolo(m, r.width, r.height);
      const u = ctx.clamp((e.x - r.left - R.x) / R.w, 0, 0.99999);
      const v = ctx.clamp((e.y - r.top - R.y) / R.h, 0, 0.99999);
      const rit = M.ritaglio(m.aspetto, W, H);
      stato.X = rit.x + u * rit.w;
      stato.Y = rit.y + v * rit.h;
      stato.dito = e.dito;
      aggiornaLente(false);
    }
    function daEvento(e, subito) {
      puntatore = { x: e.clientX, y: e.clientY, dito: e.pointerType !== 'mouse' };
      if (subito) { if (rafLente) { cancelAnimationFrame(rafLente); rafLente = 0; } applicaPuntatore(); }
      else if (!rafLente) rafLente = requestAnimationFrame(applicaPuntatore);
    }
    schermo.addEventListener('pointermove', (e) => {
      if (!stato.lente) return;
      if (e.pointerType === 'mouse' || tocco === e.pointerId) daEvento(e);
    });
    schermo.addEventListener('pointerdown', (e) => {
      if (!stato.lente) return;
      if (e.pointerType !== 'mouse') {
        tocco = e.pointerId;
        try { schermo.setPointerCapture(e.pointerId); } catch (err) { /* puntatore già rilasciato */ }
      }
      daEvento(e, true);
    });
    const fineTocco = (e) => { if (tocco === e.pointerId) tocco = null; };
    schermo.addEventListener('pointerup', fineTocco);
    schermo.addEventListener('pointercancel', fineTocco);
    schermo.addEventListener('keydown', (e) => {
      const passi = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const d = passi[e.key];
      if (!d) return;
      e.preventDefault();
      if (!stato.lente) impostaLente(true);
      const m = modCorrente();
      const p = pixelCorrente(m);
      const k = e.shiftKey ? Math.max(10, Math.round(m.larghezza / 32)) : 1;
      puntaPixel(m, ctx.clamp(p.sx + d[0] * k, 0, m.larghezza - 1), ctx.clamp(p.sy + d[1] * k, 0, m.altezza - 1));
      stato.dito = false;
      aggiornaLente(true);
    });

    /* ---------- tavolozza e memoria ---------- */

    function preparaTela(c, altezzaCss) {
      const w = Math.max(10, Math.round(c.clientWidth || c.parentNode.clientWidth || 240));
      const d = dpr();
      c.style.height = altezzaCss + 'px';
      const W2 = Math.round(w * d), H2 = Math.round(altezzaCss * d);
      if (c.width !== W2 || c.height !== H2) { c.width = W2; c.height = H2; }
      const g = c.getContext('2d');
      g.setTransform(d, 0, 0, d, 0, 0);
      return { g: g, w: w, h: altezzaCss };
    }

    let pianoColori = null; // immagine tinta × luminosità per il Full HD, calcolata una volta

    function disegnaTavolozza() {
      const m = modCorrente();
      const res = risultatoCorrente();
      const info = TAVOLOZZA_INFO[m.id];
      contaTav.textContent = info.conta;
      didaTav.textContent = info.dida;
      const t = preparaTela(telaTav, 64);
      const g = t.g;
      g.clearRect(0, 0, t.w, t.h);
      const cella = (x, y, w, hh, c, attivo, scelto) => {
        if (attivo) {
          g.fillStyle = c; g.fillRect(x + 1, y + 1, w - 2, hh - 2);
        } else {
          const s = Math.min(w, hh) * 0.36;
          g.globalAlpha = 0.4; g.fillStyle = c; g.fillRect(x + (w - s) / 2, y + (hh - s) / 2, s, s); g.globalAlpha = 1;
        }
        if (scelto) {
          g.lineWidth = 2; g.strokeStyle = '#fff'; g.strokeRect(x + 1, y + 1, w - 2, hh - 2);
          g.lineWidth = 1; g.strokeStyle = '#000'; g.strokeRect(x + 2.5, y + 2.5, w - 5, hh - 5);
        }
      };
      if (m.id === 'mac') {
        cella(0, 0, t.w / 2, t.h, '#ffffff', true, indiceLente === 0);
        cella(t.w / 2, 0, t.w / 2, t.h, '#000000', true, indiceLente === 1);
        g.font = '700 11px ' + (ctx.cssVar('--mono', el) || 'monospace');
        g.textAlign = 'center';
        g.fillStyle = '#000'; g.fillText('bit 0', t.w / 4, t.h / 2 + 4);
        g.fillStyle = '#fff'; g.fillText('bit 1', t.w * 0.75, t.h / 2 + 4);
      } else if (m.id === 'cga') {
        const w = t.w / 8, hh = t.h / 2;
        M.CGA16.forEach((c, k) => {
          const pos = M.CGA_TAVOLOZZA_1_ALTA.indexOf(k);
          cella((k % 8) * w, Math.floor(k / 8) * hh, w, hh, M.esadecimale(c.rgb), pos >= 0, pos >= 0 && pos === indiceLente);
        });
      } else if (m.id === 'ega') {
        const w = t.w / 16, hh = t.h / 4;
        M.EGA64.forEach((c, k) => {
          const pos = M.EGA_PREDEFINITA.indexOf(k);
          cella((k % 16) * w, Math.floor(k / 16) * hh, w, hh, M.esadecimale(c), pos >= 0, pos >= 0 && pos === indiceLente);
        });
      } else if (m.id === 'vga') {
        const w = t.w / 32, hh = t.h / 8;
        if (!res) {
          g.fillStyle = '#1a2622'; g.fillRect(0, 0, t.w, t.h);
        } else {
          res.tavolozza.forEach((c, k) => cella((k % 32) * w, Math.floor(k / 32) * hh, w, hh, M.esadecimale(c), true, k === indiceLente));
        }
      } else {
        if (!pianoColori || pianoColori.width !== telaTav.width) {
          pianoColori = nuovaTela(telaTav.width, telaTav.height);
          const gp = pianoColori.getContext('2d');
          const img = gp.createImageData(pianoColori.width, pianoColori.height);
          for (let y = 0; y < img.height; y++) {
            for (let x = 0; x < img.width; x++) {
              const hue = x / img.width * 360, l = 1 - y / (img.height - 1);
              const k = (n) => (n + hue / 30) % 12;
              const a = Math.min(l, 1 - l);
              const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
              const o = (y * img.width + x) * 4;
              img.data[o] = f(0) * 255; img.data[o + 1] = f(8) * 255; img.data[o + 2] = f(4) * 255; img.data[o + 3] = 255;
            }
          }
          gp.putImageData(img, 0, 0);
        }
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.drawImage(pianoColori, 0, 0);
        g.setTransform(dpr(), 0, 0, dpr(), 0, 0);
        if (res) {
          const c = coloreDi(res, pixelCorrente(res.modalita).sx, pixelCorrente(res.modalita).sy);
          const tt = M.tinta(c[0], c[1], c[2]);
          const x = tt.h / 360 * t.w, y = (1 - tt.l) * t.h;
          g.lineWidth = 2; g.strokeStyle = '#fff';
          g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.stroke();
          g.lineWidth = 1; g.strokeStyle = '#000';
          g.beginPath(); g.arc(x, y, 7.5, 0, Math.PI * 2); g.stroke();
        }
      }
    }

    const TOTALE_CELLE = Math.ceil(M.schermateCGA(M.perId('fhd').memoria)); // 389
    const griglia = { valore: 0, anim: null, colore: ACCENTI.fhd };

    function disegnaGriglia() {
      const lato = 7, spazio = 2;
      const w = Math.max(60, telaGriglia.clientWidth || 240);
      const colonne = Math.max(10, Math.floor((w + spazio) / (lato + spazio)));
      const righe = Math.ceil(TOTALE_CELLE / colonne);
      const t = preparaTela(telaGriglia, righe * (lato + spazio) - spazio);
      const g = t.g;
      g.clearRect(0, 0, t.w, t.h);
      const pieni = Math.floor(griglia.valore), parte = griglia.valore - pieni;
      for (let i = 0; i < TOTALE_CELLE; i++) {
        const x = (i % colonne) * (lato + spazio), y = Math.floor(i / colonne) * (lato + spazio);
        g.fillStyle = '#18251f';
        g.fillRect(x, y, lato, lato);
        if (i < pieni) { g.fillStyle = griglia.colore; g.fillRect(x, y, lato, lato); }
        else if (i === pieni && parte > 0.001) { g.fillStyle = griglia.colore; g.fillRect(x, y, lato * parte, lato); }
      }
    }

    function aggiornaMemoria(animato) {
      const m = modCorrente();
      const da = griglia.valore;
      const a = M.schermateCGA(m.memoria);
      griglia.colore = ACCENTI[m.id];
      formulaMem.textContent = m.larghezza + ' × ' + m.altezza + ' pixel × ' + m.bpp + ' bit ÷ 8';
      const fhd = ctx.formato(M.schermateCGA(M.perId('fhd').memoria), 1);
      didaMem.textContent = 'Ogni quadratino vale 16.000 byte, cioè ' + (m.id === 'cga'
        ? 'proprio una schermata CGA. Un fotogramma Full HD ne riempie ' + fhd + '.'
        : m.id === 'fhd'
          ? 'una schermata CGA: un fotogramma Full HD ne riempie ' + fhd + ', quasi tutta la griglia.'
          : 'una schermata CGA: questa ne occupa ' + ctx.formato(a, a % 1 ? 1 : 0) + '. Un fotogramma Full HD ne riempie ' + fhd + '.');
      if (griglia.anim) griglia.anim.cancel();
      const numDa = Number(numMem.dataset.v || 0), numA = m.memoria;
      numMem.dataset.v = String(numA);
      griglia.anim = ctx.tween({
        from: 0, to: 1, dur: animato ? ctx.motion.dur.crawl : 0, ease: 'smooth',
        update: (k) => {
          griglia.valore = da + (a - da) * k;
          numMem.textContent = ctx.formato(Math.round(numDa + (numA - numDa) * k));
          disegnaGriglia();
        },
        done: () => { griglia.anim = null; },
      });
    }

    /* ---------- scelte ---------- */

    function aggiornaControlli() {
      const i = lista.findIndex((m) => m.id === stato.id);
      bottoniEpoca.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
      pillola.style.setProperty('--i', String(i));
      pillola.style.setProperty('--acc', ACCENTI[stato.id]);
      btnPrima.disabled = i === 0;
      btnDopo.disabled = i === lista.length - 1;
      const fhd = stato.id === 'fhd';
      bottoniRet.forEach((b) => {
        b.setAttribute('aria-pressed', String(!fhd && b.dataset.ret === stato.retinatura[stato.id]));
        b.disabled = fhd;
      });
      segRet.classList.toggle('spento', fhd);
    }

    function aggiornaLetture(animato) {
      const m = modCorrente();
      letture.ris.textContent = m.larghezza + ' × ' + m.altezza;
      letture.col.textContent = ctx.formato(m.colori);
      letture.bpp.textContent = m.bpp + (m.id === 'fhd' ? ' (3 × 8)' : '');
      letture.forma.textContent = FORMA[m.id];
      schermo.setAttribute('aria-label', 'Il tramonto come lo mostra ' + (m.id === 'fhd' ? 'uno schermo Full HD di oggi' : 'la modalità ' + m.nome + ' (' + m.etichetta + ')') + ': ' + m.larghezza + ' per ' + m.altezza + ' pixel, ' + ctx.formato(m.colori) + ' colori.');
      aggiornaMemoria(animato);
    }

    function aggiornaNota() {
      nota.innerHTML = NOTE[stato.id] + (stato.id === 'fhd' ? '' : ' ' + NOTE_RETINATURA[stato.retinatura[stato.id]]);
    }

    function richiedi() {
      const k = chiaveCorrente();
      if (risultati.has(k)) { attesa = null; mostra(true); return; }
      attesa = k;
      attesaDa = performance.now();
      if (k !== 'fhd') accodaModalita(stato.id, stato.retinatura[stato.id], true);
      aggiornaLente(false);
      disegnaTavolozza();
      avviaPompa();
    }

    function scegli(id) {
      if (id === stato.id) return;
      stato.id = id;
      indiceLente = -1;
      aggiornaControlli();
      aggiornaLetture(true);
      aggiornaNota();
      richiedi();
    }

    function sposta(d) {
      const i = lista.findIndex((m) => m.id === stato.id);
      const j = ctx.clamp(i + d, 0, lista.length - 1);
      if (j !== i) scegli(lista[j].id);
    }

    function scegliRetinatura(r) {
      if (stato.id === 'fhd' || stato.retinatura[stato.id] === r) return;
      stato.retinatura[stato.id] = r;
      aggiornaControlli();
      aggiornaNota();
      richiedi();
    }

    /* ---------- ascolto (Web Audio, solo dopo un clic) ---------- */

    let contestoAudio = null, suono = null, cicloOnda = null;
    const NOTE_AUDIO = {
      quadra: '<strong>Altoparlante del PC.</strong> Un\'onda quadra: il segnale salta fra due soli livelli, come un pixel acceso o spento. Una voce sola e un timbro sempre uguale; cambia solo l\'altezza della nota.',
      fm: '<strong>Sintesi FM, come sulla AdLib.</strong> Un\'onda «modulante» fa oscillare la frequenza dell\'onda «portante» e il timbro cambia mentre la nota suona. Qui le voci sono due, melodia e basso; il chip Yamaha YM3812 ne aveva nove.',
    };
    const frequenza = (n) => 440 * Math.pow(2, (n - 69) / 12);

    function voceFM(f, t, durata, volume, uscita, nodi) {
      const ac = contestoAudio;
      const portante = ac.createOscillator();
      const modulante = ac.createOscillator();
      const profondita = ac.createGain();
      const inviluppo = ac.createGain();
      portante.frequency.value = f;
      modulante.frequency.value = f * 2;
      profondita.gain.setValueAtTime(f * 2.6, t);
      profondita.gain.exponentialRampToValueAtTime(f * 0.3, t + durata);
      inviluppo.gain.setValueAtTime(0.0001, t);
      inviluppo.gain.exponentialRampToValueAtTime(volume, t + 0.012);
      inviluppo.gain.exponentialRampToValueAtTime(volume * 0.35, t + durata * 0.5);
      inviluppo.gain.exponentialRampToValueAtTime(0.0001, t + durata);
      modulante.connect(profondita);
      profondita.connect(portante.frequency);
      portante.connect(inviluppo);
      inviluppo.connect(uscita);
      modulante.start(t); portante.start(t);
      modulante.stop(t + durata + 0.03); portante.stop(t + durata + 0.03);
      nodi.push(portante, modulante, profondita, inviluppo);
    }

    function disegnaOnda(dati) {
      const t = preparaTela(telaOnda, 56);
      const g = t.g;
      g.clearRect(0, 0, t.w, t.h);
      g.strokeStyle = '#1d2b27'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, t.h / 2 + 0.5); g.lineTo(t.w, t.h / 2 + 0.5); g.stroke();
      if (!dati) {
        g.font = '700 10px ' + (ctx.cssVar('--mono', el) || 'monospace');
        g.fillStyle = '#4d655d';
        g.fillText('OSCILLOSCOPIO', 8, 14);
        return;
      }
      g.strokeStyle = suono && suono.tipo === 'fm' ? ACCENTI.vga : ACCENTI.fhd;
      g.lineWidth = 2; g.lineJoin = 'round';
      g.beginPath();
      for (let i = 0; i < dati.length; i++) {
        const x = i / (dati.length - 1) * t.w;
        const y = t.h / 2 - dati[i] * (t.h / 2 - 4);
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    }

    // Con il movimento ridotto l'oscilloscopio mostra una forma d'onda ferma, calcolata.
    function ondaIdeale(tipo) {
      const n = 240, out = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const fase = i / n * 3 * Math.PI * 2;
        out[i] = tipo === 'quadra' ? (Math.sin(fase) >= 0 ? 0.8 : -0.8) : 0.8 * Math.sin(fase + 2.2 * Math.sin(2 * fase));
      }
      return out;
    }

    function fermaAudio() {
      if (cicloOnda) { cicloOnda.stop(); cicloOnda = null; }
      if (suono) {
        suono.nodi.forEach((n) => {
          try { if (typeof n.stop === 'function') n.stop(); } catch (err) { /* già fermo */ }
          try { n.disconnect(); } catch (err) { /* già scollegato */ }
        });
        suono = null;
      }
      btnQuadra.setAttribute('aria-pressed', 'false');
      btnFM.setAttribute('aria-pressed', 'false');
      disegnaOnda(null);
    }

    function suona(tipo) {
      fermaAudio();
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { nota.textContent = 'Questo browser non permette di generare suoni.'; return; }
      try {
        if (!contestoAudio) contestoAudio = new AC();
        if (contestoAudio.state === 'suspended') contestoAudio.resume();
      } catch (err) {
        nota.textContent = 'Il suono non è disponibile in questo momento.';
        return;
      }
      const ac = contestoAudio;
      const t0 = ac.currentTime + 0.06, battito = 0.26;
      const uscita = ac.createGain();
      uscita.gain.value = tipo === 'quadra' ? 0.05 : 0.14;
      const analisi = ac.createAnalyser();
      analisi.fftSize = 2048;
      uscita.connect(analisi);
      analisi.connect(ac.destination);
      const nodi = [uscita, analisi];
      let t = t0;
      if (tipo === 'quadra') {
        const osc = ac.createOscillator();
        const porta = ac.createGain();
        osc.type = 'square';
        porta.gain.value = 0;
        osc.connect(porta);
        porta.connect(uscita);
        MELODIA.forEach((nn) => {
          osc.frequency.setValueAtTime(frequenza(nn[0]), t);
          porta.gain.setValueAtTime(1, t);
          porta.gain.setValueAtTime(0, t + nn[1] * battito * 0.85);
          t += nn[1] * battito;
        });
        osc.start(t0);
        osc.stop(t + 0.05);
        nodi.push(osc, porta);
      } else {
        MELODIA.forEach((nn, i) => {
          voceFM(frequenza(nn[0]), t, nn[1] * battito * 0.95, 0.5, uscita, nodi);
          if (i % 2 === 0) voceFM(frequenza(nn[0] - 24), t, battito * 1.9, 0.35, uscita, nodi);
          t += nn[1] * battito;
        });
      }
      suono = { tipo: tipo, nodi: nodi, fine: t + 0.1 };
      (tipo === 'quadra' ? btnQuadra : btnFM).setAttribute('aria-pressed', 'true');
      nota.innerHTML = NOTE_AUDIO[tipo];
      if (ctx.ridotto()) {
        disegnaOnda(ondaIdeale(tipo));
        const fine = suono;
        setTimeout(() => { if (suono === fine) fermaAudio(); }, (suono.fine - ac.currentTime) * 1000);
        return;
      }
      const buf = new Float32Array(analisi.fftSize);
      const passo = Math.round(ac.sampleRate / 220 * 3); // circa tre periodi di una nota media
      cicloOnda = ctx.loop(() => {
        if (!suono || ac.currentTime > suono.fine) { fermaAudio(); return false; }
        analisi.getFloatTimeDomainData(buf);
        let inizio = 0; // aggancio: parte da un passaggio per lo zero in salita, come un oscilloscopio
        for (let i = 1; i < buf.length - passo; i++) { if (buf[i - 1] < 0 && buf[i] >= 0) { inizio = i; break; } }
        const pezzo = buf.subarray(inizio, Math.min(buf.length, inizio + passo));
        let max = 0.0001;
        for (let i = 0; i < pezzo.length; i++) max = Math.max(max, Math.abs(pezzo[i]));
        const norm = new Float32Array(pezzo.length);
        for (let i = 0; i < pezzo.length; i++) norm[i] = pezzo[i] / max * 0.85;
        disegnaOnda(norm);
        return true;
      });
      cicloOnda.start();
    }

    /* ---------- dimensioni ---------- */

    let rafMisura = 0;
    function misura() {
      rafMisura = 0;
      if (distrutto) return;
      const d = dpr();
      const r = schermo.getBoundingClientRect();
      const w = Math.max(2, Math.round(r.width * d)), hh = Math.max(2, Math.round(r.height * d));
      if (w !== tela.width || hh !== tela.height) {
        tela.width = w; tela.height = hh;
        if (anim) { anim.cancel(); anim = null; }
        const res = risultatoCorrente();
        visibile = componi(stato.daMostrare ? null : res);
        tela.getContext('2d').drawImage(visibile, 0, 0);
      }
      const L = latoLente();
      lente.style.width = L + 'px';
      lente.style.height = L + 'px';
      aggiornaLente(false);
      disegnaTavolozza();
      disegnaGriglia();
      disegnaOnda(null);
    }
    const osservatore = 'ResizeObserver' in window ? new ResizeObserver(() => { if (!rafMisura) rafMisura = requestAnimationFrame(misura); }) : null;
    if (osservatore) osservatore.observe(el);

    /* ---------- avvio ---------- */

    aggiornaControlli();
    aggiornaLetture(false);
    aggiornaNota();
    attesa = 'fhd';
    attesaDa = performance.now();
    accoda('scena', () => scenaTramonto(scena.getContext('2d'), W, H), true);
    misura();

    function attiva() {
      stato.attivo = true;
      inPausa = false;
      avviaPompa();
      if (stato.daMostrare && risultatoCorrente()) mostra(true);
    }

    function sospendi() {
      stato.attivo = false;
      inPausa = true;
      if (rafPompa) { cancelAnimationFrame(rafPompa); rafPompa = 0; }
      fermaAudio();
    }

    function distruggi() {
      sospendi();
      distrutto = true;
      if (osservatore) osservatore.disconnect();
      if (rafMisura) cancelAnimationFrame(rafMisura);
      if (rafLente) cancelAnimationFrame(rafLente);
      if (anim) anim.cancel();
      if (griglia.anim) griglia.anim.cancel();
      clearTimeout(timerOsd);
      clearTimeout(timerAnnuncio);
      if (contestoAudio) { try { contestoAudio.close(); } catch (err) { /* già chiuso */ } contestoAudio = null; }
    }

    return { attiva: attiva, sospendi: sospendi, distruggi: distruggi };
  }

  /* =====================================================================
   * Capitolo
   * ===================================================================== */

  P.registra({
    numero: 8,
    id: 'grafica',
    titolo: 'Pixel, finestre e multimedia',
    breve: 'Grafica e suono',
    periodo: '1968–oggi',
    colore: 'var(--era-8)',
    sommario: 'Dal terminale a caratteri allo schermo a pixel, dal mouse di Engelbart alle finestre, dalle schede CGA, EGA e VGA alla GPU, dall\'altoparlante del PC alla Sound Blaster.',
    intro: 'Per decenni i computer hanno parlato con le persone a righe di testo, prima su carta e poi su uno schermo. Poi lo schermo si è riempito di pixel: sono arrivati il mouse, le finestre, i colori, il suono e infine la GPU, il chip che oggi muove i videogiochi e addestra l\'intelligenza artificiale. Nel laboratorio vedrai lo stesso disegno come l\'avrebbero mostrato cinque computer di epoche diverse.',
    blocchi: [
      {
        tipo: 'testo',
        titolo: 'Dalla telescrivente allo schermo a pixel',
        paragrafi: [
          'Negli anni Sessanta con un computer si dialogava soprattutto attraverso la <strong>telescrivente</strong> (in inglese <em>teletype</em>): una macchina da scrivere elettrica collegata al computer, che stampava su un rotolo di carta le domande dell\'operatore e le risposte della macchina. La Teletype Model 33, del 1963, costava relativamente poco e divenne il terminale di migliaia di minicomputer. Negli anni Settanta la carta lasciò il posto al vetro: i <strong>terminali video</strong>, come il VT100 della Digital Equipment Corporation (1978), mostravano 24 righe di 80 caratteri su un tubo catodico. Sapevano scrivere lettere, numeri e simboli, ma non disegnare.',
          'Un terminale a caratteri tiene in memoria soltanto il codice di ogni lettera. Mentre il fascio di elettroni percorre lo schermo, un <strong>generatore di caratteri</strong>, cioè una piccola memoria a sola lettura (ROM) che contiene il disegno di ogni simbolo, trasforma i codici in puntini luminosi. È un trucco che fa risparmiare moltissima memoria: una pagina di 80' + X + '25 caratteri occupa 4.000 byte (due per carattere: il codice e un byte di attributi, come il colore o la sottolineatura), mentre la stessa pagina disegnata punto per punto, a 720' + X + '350, ne richiede 31.500.',
          'Lo schermo <strong>a mappa di bit</strong> (<em>bitmap</em>) fa il contrario: a ogni punto dell\'immagine, il <strong>pixel</strong> (da <em>picture element</em>, elemento d\'immagine), corrispondono uno o più bit in una zona di memoria chiamata <strong>memoria video</strong> (<em>framebuffer</em>). Il circuito video la rilegge da capo decine di volte al secondo e la trasforma nel segnale per lo schermo. Così si può disegnare qualsiasi cosa: linee, icone, lettere di ogni forma e grandezza, fotografie. Il prezzo è la memoria, che negli anni Settanta costava carissima: per questo i primi schermi a pixel nacquero nei laboratori di ricerca.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Il mouse, le finestre e la scrivania',
        paragrafi: [
          'Il 9 dicembre 1968, a San Francisco, Douglas Engelbart dello Stanford Research Institute (SRI) salì sul palco di un congresso di informatica e per circa 90 minuti mostrò a un migliaio di persone il suo NLS (<em>oN-Line System</em>), collegato al computer del suo laboratorio a una cinquantina di chilometri di distanza. Con una mano usava la tastiera, con l\'altra una scatoletta di legno con due rotelle e un filo come coda: il <strong>mouse</strong>, costruito nel 1964 dall\'ingegnere Bill English sulla base dei suoi schizzi. In quella che fu poi chiamata «la madre di tutte le demo» comparvero anche testi con collegamenti ipertestuali, lo schermo diviso in finestre, una videochiamata e un documento modificato in due a distanza.',
          'Molte di quelle idee maturarono allo <strong>Xerox PARC</strong> (Palo Alto Research Center), in California. Lì nel 1973 nacque lo <strong>Xerox Alto</strong>, con uno schermo verticale di 606' + X + '808 pixel in bianco e nero, il mouse e la rete Ethernet; con il linguaggio Smalltalk, sviluppato dal gruppo di Alan Kay, arrivarono le finestre sovrapposte e i menu. L\'Alto non fu mai messo in vendita: ne furono costruiti circa 2.000, usati nei laboratori Xerox e in alcune università. Il suo erede commerciale, lo <strong>Xerox Star</strong> del 1981, introdusse la «scrivania» con le icone di documenti e cartelle, ma costava 16.595 dollari a postazione e vendette poco.',
          'Nel dicembre 1979 un gruppo di Apple guidato da Steve Jobs visitò il PARC, grazie a un accordo che permetteva alla Xerox di comprare azioni Apple prima della quotazione in Borsa. Non fu un semplice furto di idee: Apple aveva già avviato il progetto Lisa, e i suoi tecnici inventarono molto di nuovo, come la barra dei menu a tendina, il trascinamento delle icone e il cestino. Il primo frutto fu l\'<strong>Apple Lisa</strong> (1983), potente ma carissima: 9.995 dollari. Il secondo fu il <strong>Macintosh</strong>, presentato il 24 gennaio 1984: schermo da 9 pollici di 512' + X + '342 pixel in bianco e nero, 128 KB di memoria, 2.495 dollari. A disegnare tutto, a grande velocità, era QuickDraw, scritto da Bill Atkinson.',
          'Nel 1985 arrivarono macchine a colori più economiche. L\'<strong>Amiga 1000</strong> di Commodore, presentato a luglio, aveva chip dedicati alla grafica e al suono: mostrava 32 colori scelti fra 4.096 e, con un trucco chiamato HAM (<em>Hold-And-Modify</em>), perfino tutti i 4.096 insieme. L\'<strong>Atari 520ST</strong> offriva 16 colori fra 512 e due prese MIDI incorporate, che lo resero amatissimo dai musicisti. Nel mondo dei PC IBM l\'interfaccia grafica arrivò con <strong>Windows</strong>: la versione 1.0 (1985) ebbe poco successo, la 3.0 (1990) si diffuse ovunque, Windows 95 (1995) introdusse il menu Start e la barra delle applicazioni. La storia di questi programmi è raccontata nella sezione 7.',
        ],
      },
      {
        tipo: 'citazione',
        testo: 'Se nel vostro ufficio voi, lavoratori intellettuali, aveste uno schermo collegato a un computer acceso per voi tutto il giorno e pronto a rispondere all\'istante a ogni vostra azione, quanto valore potreste ricavarne?',
        autore: 'Douglas Engelbart',
        fonte: 'apertura della dimostrazione del 9 dicembre 1968 (traduzione)',
      },
      {
        tipo: 'figura',
        svg: figuraMacintosh,
        alt: 'Disegno di un Macintosh del 1984 visto di fronte, con una finestra sullo schermo e il mouse a un tasto; un cerchio ingrandisce l\'angolo della finestra e mostra i singoli pixel, bianchi o neri.',
        didascalia: '<strong>Il Macintosh del 1984</strong>, più tardi chiamato Macintosh 128K: schermo da 9 pollici, unità per dischetti da 3,5 pollici sotto lo schermo e mouse a un solo tasto. Nel cerchio, l\'angolo di una finestra visto da vicino: ogni quadratino è un pixel, bianco o nero, e il grigio della scrivania è una scacchiera di punti.',
      },
      {
        tipo: 'testo',
        titolo: 'Le schede video del PC: da MDA a VGA',
        paragrafi: [
          'L\'IBM PC del 1981 non aveva un circuito video sulla scheda madre: il monitor si collegava a una scheda inserita in uno degli slot di espansione (il bus che più tardi sarà chiamato ISA). Chi lo comprava sceglieva fra due schede. La <strong>MDA</strong> (<em>Monochrome Display Adapter</em>) mostrava solo testo, 80' + X + '25 caratteri molto nitidi su un monitor monocromatico, e aveva appena 4 KB di memoria. La <strong>CGA</strong> (<em>Color Graphics Adapter</em>) aveva 16 KB e sapeva disegnare: 320' + X + '200 pixel a 4 colori oppure 640' + X + '200 a 2 colori. I quattro colori venivano da tavolozze fisse: la più famosa era nero, ciano, magenta e bianco.',
          'I vuoti lasciati da IBM furono riempiti da altri. Nel 1982 la scheda <strong>Hercules</strong>, progettata da Van Suwannukul per scrivere al computer la sua tesi di dottorato in thailandese, aggiunse alla compatibilità con la MDA una grafica monocromatica di 720' + X + '348 pixel e divenne uno standard di fatto. Nel 1984 IBM rispose con la <strong>EGA</strong> (<em>Enhanced Graphics Adapter</em>): 640' + X + '350 pixel con 16 colori scelti fra 64. Per avere davvero i 16 colori a quella risoluzione servivano però 112.000 byte, più dei 64 KB montati di serie: bisognava comprare l\'espansione di memoria.',
          'La svolta arrivò nell\'aprile 1987 con la <strong>VGA</strong> (<em>Video Graphics Array</em>), presentata insieme ai nuovi PS/2 di IBM: 640' + X + '480 pixel a 16 colori e, nella <strong>modalità 13h</strong> amata dai programmatori di videogiochi, 320' + X + '200 pixel con 256 colori scelti fra 262.144. In quella modalità ogni pixel occupa esattamente un byte e una schermata (64.000 byte) sta tutta in un segmento di memoria da 64 KB: disegnare diventava semplicissimo. La VGA portò anche un connettore a 15 poli su tre file, che trasporta i segnali del rosso, del verde e del blu come tensioni variabili, cioè in forma <strong>analogica</strong>: è rimasto su PC e proiettori per quasi trent\'anni.',
          'Dopo la VGA ogni costruttore aggiunse modalità proprie, a 800' + X + '600 pixel e oltre, chiamate genericamente <strong>SVGA</strong> (<em>Super VGA</em>) ma diverse da una marca all\'altra: ogni programma doveva conoscere ogni scheda. Per mettere ordine nacque la <strong>VESA</strong> (<em>Video Electronics Standards Association</em>), annunciata alla fine del 1988, che nel 1989 pubblicò le VESA BIOS Extensions, un modo comune per chiedere alla scheda le modalità avanzate. A metà degli anni Novanta il connettore VGA guadagnò anche due fili per il DDC (<em>Display Data Channel</em>): un piccolo bus I²C attraverso il quale il computer legge dal monitor quali risoluzioni sa mostrare.',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraVGA,
        larga: true,
        alt: 'Disegno di una scheda video VGA per bus ISA, con chip grafico, memoria video, DAC, BIOS e oscillatori; un cerchio mostra di fronte il connettore a 15 poli su tre file, con evidenziati i pin dei colori, dei sincronismi e del DDC.',
        didascalia: '<strong>Una scheda VGA per il bus ISA</strong>, come quelle dei compatibili di fine anni Ottanta: il chip grafico (VGA), la memoria video (otto chip), il convertitore digitale-analogico con la tavolozza (DAC), il BIOS video con l\'etichetta e due oscillatori al quarzo, che danno le frequenze dei pixel della VGA (25,175 e 28,322 MHz). Nel cerchio, il connettore a 15 poli visto di fronte, sul lato della scheda: i tre colori, i due sincronismi e i due fili del DDC.',
      },
      {
        tipo: 'numeri',
        items: [
          { valore: 90, unita: 'minuti', etichetta: 'la dimostrazione di Engelbart del 9 dicembre 1968, con il primo mouse in pubblico' },
          { valore: 21888, unita: 'byte', etichetta: 'la memoria video del primo Macintosh (512' + X + '342 pixel a 1 bit): un sesto dei suoi 128 KB' },
          { valore: 262144, unita: 'colori', etichetta: 'la tavolozza della VGA (64' + X + '64' + X + '64), da cui un programma ne sceglie 256' },
          { valore: 6220800, unita: 'byte', etichetta: 'un solo fotogramma Full HD a 24 bit: quanto 389 schermate CGA' },
        ],
      },
      {
        tipo: 'nota',
        paragrafi: [
          'I pixel non sono sempre quadrati. Su un monitor 4:3 i 320' + X + '200 pixel della CGA e della modalità 13h della VGA erano più alti che larghi del 20%, quelli della EGA a 640' + X + '350 di circa il 37%: per ottenere un cerchio sullo schermo bisognava disegnare, in pixel, un\'ellisse più larga che alta. Il Macintosh scelse pixel quadrati, circa 72 per pollice, tanti quanti i punti tipografici in un pollice: un carattere da 12 punti occupava 12 pixel e quello che si vedeva sullo schermo corrispondeva alla stampa. Nel laboratorio la lente lo mostra bene.',
        ],
      },
      { tipo: 'lab' },
      {
        tipo: 'testo',
        titolo: 'Dall\'acceleratore alla GPU',
        paragrafi: [
          'Con Windows lo schermo diventò un lavoro pesante: trascinare una finestra significa ricopiare centinaia di migliaia di byte di memoria video, e il processore ci perdeva molto tempo. All\'inizio degli anni Novanta si diffusero gli <strong>acceleratori grafici</strong> 2D, come l\'S3 86C911 del 1991, che facevano da soli le operazioni più comuni: copiare blocchi di pixel, riempire rettangoli, tracciare linee, disegnare il puntatore del mouse.',
          'Poi arrivò il 3D. Nel 1996 la 3dfx mise in commercio la <strong>Voodoo Graphics</strong>, una scheda che sapeva fare solo grafica tridimensionale e si collegava con un cavetto alla scheda video normale. Disegnava triangoli ricoperti di <em>texture</em> (immagini «incollate» sulle superfici) e le sfumava per non far vedere i quadretti, con una velocità mai vista nei videogiochi per PC. Nel 1999 NVIDIA presentò la <strong>GeForce 256</strong> come «la prima GPU» (<em>Graphics Processing Unit</em>, unità di elaborazione grafica), perché calcolava da sola anche la posizione e l\'illuminazione dei triangoli, un lavoro che prima toccava al processore. Era soprattutto uno slogan pubblicitario: il termine circolava già, per esempio per il chip grafico della PlayStation di Sony del 1994. Ma da allora è rimasto.',
          'Nel 2001, con la GeForce 3 e la libreria DirectX 8 di Microsoft, le GPU diventarono <strong>programmabili</strong>: piccoli programmi chiamati <em>shader</em> decidono come spostare ogni vertice e di che colore dipingere ogni pixel. Una GPU contiene centinaia, oggi migliaia, di unità di calcolo semplici che eseguono la stessa operazione su tanti dati insieme. Qualcuno capì che quella potenza poteva servire anche ad altro, e nacque il <strong>GPGPU</strong> (<em>General-Purpose computing on GPU</em>), il calcolo di uso generale sulle GPU. Fra il 2006 e il 2007 NVIDIA presentò <strong>CUDA</strong>, che permetteva di programmarle con un linguaggio derivato dal C.',
          'Nel 2012 la rete neurale <strong>AlexNet</strong>, addestrata in cinque o sei giorni su due schede GeForce GTX 580 da videogiochi, vinse la gara di riconoscimento di immagini ImageNet: sbagliava il 15,3% delle volte (contando come giusta la risposta corretta fra le sue prime cinque ipotesi), contro il 26,2% del secondo classificato. Da quel momento le GPU sono diventate il motore dell\'intelligenza artificiale: i grandi modelli di oggi si addestrano su migliaia di GPU che lavorano insieme.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Dal tubo catodico ai cristalli liquidi',
        paragrafi: [
          'Intanto cambiavano anche gli schermi. Il <strong>tubo catodico</strong> (CRT, <em>Cathode Ray Tube</em>) disegna l\'immagine con un fascio di elettroni che percorre lo schermo riga per riga, dall\'alto in basso, decine di volte al secondo, e accende puntini di fosforo rossi, verdi e blu. Per questo la memoria video viene letta nello stesso ordine, una riga dopo l\'altra: la tendina che nel laboratorio cambia l\'immagine imita proprio quel fascio.',
          'Lo schermo a <strong>cristalli liquidi</strong> (LCD, <em>Liquid Crystal Display</em>) ha invece una griglia fissa di pixel, ciascuno formato da tre <strong>subpixel</strong>, rosso, verde e blu, che lasciano passare più o meno la luce di una lampada posta dietro lo schermo. È sottile, leggero e consuma meno: intorno al 2004 i monitor LCD hanno superato i CRT nelle vendite. Anche il segnale è diventato digitale: prima il DVI (1999), poi HDMI e DisplayPort, che oggi viaggiano anche attraverso la porta USB-C.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Il computer impara a suonare',
        paragrafi: [
          'Il PC IBM aveva un solo altoparlante, pensato per i segnali acustici. Lo comandava un contatore programmabile (il chip Intel 8253) che produceva un\'<strong>onda quadra</strong>: il segnale aveva solo due livelli, acceso o spento, proprio come un pixel in bianco e nero. Bastava per i bip e per melodie a una voce sola; con trucchi di programmazione molto ingegnosi, alcuni giochi riuscirono perfino a fargli pronunciare qualche parola.',
          'Nel 1987 la canadese Ad Lib mise in vendita la <strong>AdLib Music Synthesizer Card</strong>, con il chip Yamaha YM3812 (detto OPL2) a <strong>sintesi FM</strong>: invece di riprodurre suoni registrati, li costruisce facendo variare la frequenza di un\'onda con un\'altra onda (FM sta per <em>Frequency Modulation</em>, modulazione di frequenza), con nove voci contemporanee. Nel 1989 la Creative di Singapore lanciò la <strong>Sound Blaster</strong>: stesso chip, quindi compatibile con i giochi per AdLib, più un convertitore per registrare e riprodurre suoni digitali a 8 bit e una porta per il joystick. Divenne lo standard di fatto: per anni le schede audio di ogni marca si dichiararono «compatibili Sound Blaster». Nel 1992 la Sound Blaster 16 portò l\'audio a 16 bit, con la qualità di un CD.',
          'L\'ultimo tassello fu il <strong>CD-ROM</strong>. Nel 1983 Sony e Philips avevano stabilito come registrare dati su un compact disc: circa 650 MB, quanto più di 450 dischetti da 1,44 MB. Alla fine del 1990 Microsoft e altre aziende annunciarono lo standard <strong>MPC</strong> (<em>Multimedia PC</em>), e dal 1991 comparvero i computer con il suo marchio: lettore di CD-ROM, scheda audio, grafica VGA e Windows con le estensioni multimediali. Enciclopedie con filmati e suoni, giochi con musiche registrate e voci di attori: il PC era diventato <strong>multimediale</strong>.',
        ],
      },
      {
        tipo: 'italia',
        titolo: 'Dal mouse all\'MP3',
        paragrafi: [
          'Tra i fondatori della Logitech, nata il 2 ottobre 1981 ad Apples, in Svizzera, ci sono due italiani: Pierluigi Zappacosta, nato a Chieti, e Giacomo Marini, abruzzese anche lui ed ex ingegnere della Olivetti. Il loro primo prodotto, il mouse P4 del 1982, veniva da un progetto del Politecnico federale di Losanna; oggi Logitech è uno dei maggiori produttori di mouse al mondo. E nel 1983 l\'Olivetti M24, un compatibile IBM progettato in Italia, offriva una grafica di 640' + X + '400 pixel, il doppio delle righe della CGA.',
          'Il legame più forte con il multimediale passa però da Torino. Leonardo Chiariglione, ingegnere del CSELT (Centro Studi e Laboratori Telecomunicazioni, il centro di ricerca del gruppo pubblico dei telefoni), nel 1988 fondò con il giapponese Hiroshi Yasuda il gruppo <strong>MPEG</strong> (<em>Moving Picture Experts Group</em>) e lo guidò fino al 2020. Dagli standard MPEG vengono il Video CD, l\'MP3 (<em>MPEG-1 Audio Layer III</em>), i DVD, la televisione digitale e buona parte dei video che guardiamo in rete.',
        ],
      },
      {
        tipo: 'schede',
        titolo: 'Macchine, schede e date da ricordare',
        items: [
          { anno: 1968, nome: 'La «madre di tutte le demo»', luogo: 'San Francisco (Stati Uniti)', testo: 'Douglas Engelbart mostra in pubblico il mouse, l\'ipertesto, le finestre e la videochiamata, in 90 minuti dal vivo.' },
          { anno: 1973, nome: 'Xerox Alto', luogo: 'Xerox PARC, Palo Alto (Stati Uniti)', testo: 'Schermo a pixel di 606' + X + '808 punti, mouse, rete Ethernet e finestre sovrapposte. Non fu mai venduto: circa 2.000 esemplari per la ricerca.' },
          { anno: 1981, nome: 'Schede MDA e CGA', luogo: 'IBM, Boca Raton (Stati Uniti)', testo: 'Le due schede video del primo PC IBM: testo nitido in monocromia (MDA) oppure grafica a colori con 16 KB di memoria (CGA).' },
          { anno: 1984, nome: 'Apple Macintosh', luogo: 'Apple, Cupertino (Stati Uniti)', testo: 'Presentato il 24 gennaio: 512' + X + '342 pixel quadrati in bianco e nero, mouse e interfaccia grafica per 2.495 dollari.' },
          { anno: 1985, nome: 'Amiga 1000', luogo: 'Commodore-Amiga, Los Gatos (Stati Uniti)', testo: 'Chip dedicati a grafica e suono: 4.096 colori possibili, animazioni fluide e quattro canali di suono campionato.' },
          { anno: 1987, nome: 'VGA', luogo: 'IBM (Stati Uniti)', testo: 'Arriva con i PS/2: 640' + X + '480 a 16 colori, oppure 320' + X + '200 con 256 colori fra 262.144. Il suo connettore a 15 poli resterà in uso per decenni.' },
          { anno: 1987, nome: 'AdLib Music Synthesizer Card', luogo: 'Ad Lib, Québec (Canada)', testo: 'La prima scheda musicale di successo per i PC: sintesi FM con il chip Yamaha YM3812 e nove voci.' },
          { anno: 1988, nome: 'Nasce il gruppo MPEG', luogo: 'Leonardo Chiariglione, CSELT di Torino', testo: 'Chiariglione fonda con Hiroshi Yasuda il gruppo che scriverà gli standard di video e audio digitali: Video CD, MP3, DVD, televisione digitale.', italia: true },
          { anno: 1989, nome: 'Sound Blaster', luogo: 'Creative Technology, Singapore', testo: 'Compatibile con la AdLib e capace di registrare e riprodurre suoni digitali: diventa lo standard dell\'audio per PC.' },
          { anno: 1996, nome: '3dfx Voodoo Graphics', luogo: '3dfx Interactive, San Jose (Stati Uniti)', testo: 'Una scheda solo per il 3D, da affiancare a quella normale: porta nei videogiochi per PC texture sfumate e grafica fluida.' },
          { anno: 1999, nome: 'NVIDIA GeForce 256', luogo: 'NVIDIA, Santa Clara (Stati Uniti)', testo: 'Presentata come «la prima GPU»: calcola da sola posizione e illuminazione dei triangoli, togliendo lavoro al processore.' },
          { anno: 2012, nome: 'AlexNet', luogo: 'Università di Toronto (Canada)', testo: 'Una rete neurale addestrata su due GPU da videogiochi stravince la gara ImageNet: comincia l\'era delle GPU per l\'intelligenza artificiale.' },
        ],
      },
    ],
    lab: {
      titolo: 'Lo stesso disegno in cinque epoche',
      sottotitolo: 'Scegli un\'epoca e guarda il tramonto come l\'avrebbe mostrato un computer di quegli anni; avvicina la lente per vedere i pixel uno per uno.',
      crea: creaLaboratorio,
    },
    punti: [
      'Un terminale a caratteri tiene in memoria solo i codici delle lettere; uno schermo a pixel tiene uno o più bit per ogni punto: può disegnare qualsiasi cosa, ma chiede molta più memoria.',
      'Mouse, finestre e icone nascono nella ricerca (Engelbart nel 1968, lo Xerox PARC negli anni Settanta) e arrivano al grande pubblico con il Macintosh (1984), l\'Amiga, l\'Atari ST e poi Windows.',
      'Le schede video del PC crescono a gradini: MDA e CGA (1981), Hercules (1982), EGA (1984), VGA (1987), poi SVGA e VESA. Colori e risoluzione salgono insieme alla memoria video.',
      'Con <em>n</em> bit per pixel si hanno 2<sup><em>n</em></sup> colori; una schermata occupa larghezza' + X + 'altezza' + X + 'bit per pixel ÷ 8 byte. Quando i colori sono pochi, la retinatura li alterna per imitare quelli che mancano.',
      'La GPU nasce per accelerare la grafica 3D; diventata programmabile, oggi fa anche calcolo scientifico e intelligenza artificiale.',
      'Il suono passa dall\'onda quadra dell\'altoparlante alla sintesi FM della AdLib, ai suoni digitali della Sound Blaster e al CD-ROM del PC multimediale.',
    ],
    collegamenti: [
      { testo: 'Bus ISA: dove si inserivano CGA, EGA e VGA', href: '../../index.html#/bus/isa', tipo: 'buslab' },
      { testo: 'PCI Express: lo slot delle GPU di oggi', href: '../../index.html#/bus/pcie', tipo: 'buslab' },
      { testo: 'I²C: il DDC del connettore VGA', href: '../../index.html#/bus/i2c', tipo: 'buslab' },
      { testo: 'MIDI: musica fra strumenti e computer', href: '../../index.html#/bus/midi', tipo: 'buslab' },
      { testo: 'I²S: l\'audio digitale fra i chip', href: '../../index.html#/bus/i2s', tipo: 'buslab' },
      { testo: 'Sezione 5 · I 16 bit: il 68000 di Macintosh, Amiga e Atari ST', href: '../chip-programmabili/index.html#sedici-bit', tipo: 'sezione' },
      { testo: 'Sezione 7 · La storia del software, da Windows ai videogiochi', href: '../programmazione/index.html', tipo: 'sezione' },
      { testo: 'Capitolo 6 · La memoria', href: '#memoria' },
      { testo: 'Capitolo 9 · Prestazioni', href: '#prestazioni' },
      { testo: 'Capitolo 10 · Il PC di oggi', href: '#oggi' },
      { testo: 'Quiz sul capitolo', href: '../quiz/index.html#storia-pc/grafica', tipo: 'sezione' },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
