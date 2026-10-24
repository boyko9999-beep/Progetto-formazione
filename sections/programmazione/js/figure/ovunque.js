/*
 * Illustrazioni del capitolo 12 · Software ovunque.
 *   smartphone-app  davanti: schermo a sfioramento con la griglia delle app; un dito tocca «Meteo» e l'app si apre con uno zoom.
 *                   dentro: system-on-chip ARM, memoria, modem e una batteria che occupa quasi tutto lo spazio
 *   cloud           dentro la «nuvola»: una gru porta un container dal registro a un server del rack; raffreddamento,
 *                   alimentazione, e telefoni e portatili che chiedono dati alle API
 * Colori dalla tavolozza --fig-* e --cap, così il disegno segue il tema chiaro o scuro.
 */
(function (root) {
  'use strict';
  if (!root.ProgStoria) return;

  const f1 = (n) => Math.round(n * 100) / 100;

  /* ===================== smartphone-app ===================== */

  const cssPhone = `
    .fig-smartphone-app-sfondo { fill: var(--fig-paper); }
    .fig-smartphone-app-cornice { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-smartphone-app-telaio { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-smartphone-app-tasto { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.2; }
    .fig-smartphone-app-schermo { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-smartphone-app-inchiostro { fill: var(--fig-ink); }
    .fig-smartphone-app-tenue { fill: var(--fig-line); }
    .fig-smartphone-app-icona { stroke: var(--fig-ink); stroke-width: 1.4; }
    .fig-smartphone-app-g { fill: var(--fig-paper); }
    .fig-smartphone-app-gs { fill: none; stroke: var(--fig-paper); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .fig-smartphone-app-gi { fill: none; stroke: var(--c); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .fig-smartphone-app-i { fill: var(--c); }
    .fig-smartphone-app-vano { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-smartphone-app-piastra { fill: var(--fig-metal-2); opacity: .16; }
    .fig-smartphone-app-scheda { fill: var(--fig-glow); opacity: .2; }
    .fig-smartphone-app-bordo { fill: none; stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-smartphone-app-pista { fill: none; stroke: var(--fig-glow); stroke-width: 1.6; opacity: .9; }
    .fig-smartphone-app-soc { fill: var(--cap); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-smartphone-app-blocco { fill: var(--fig-paper); opacity: .32; }
    .fig-smartphone-app-memoria { fill: var(--fig-cool); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-smartphone-app-modem { fill: var(--fig-warm); stroke: var(--fig-ink); stroke-width: 1.5; }
    .fig-smartphone-app-metallo { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 1.4; }
    .fig-smartphone-app-lente { fill: var(--fig-ink); stroke: var(--fig-metal); stroke-width: 2; }
    .fig-smartphone-app-batteria { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-smartphone-app-batteria-t { font: 800 21px var(--font, sans-serif); fill: var(--fig-paper); letter-spacing: .02em; }
    .fig-smartphone-app-dito { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .fig-smartphone-app-unghia { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.3; opacity: .85; }
    .fig-smartphone-app-piega { fill: none; stroke: var(--fig-ink); stroke-width: 1.3; stroke-linecap: round; opacity: .55; }
    .fig-smartphone-app-onda { fill: none; stroke: var(--cap); stroke-width: 3; }
    .fig-smartphone-app-app-fondo { fill: var(--fig-cool); }
    .fig-smartphone-app-app-t { fill: var(--fig-paper); font-family: var(--font, sans-serif); }
    .fig-smartphone-app-guida { fill: none; stroke: var(--fig-ink); stroke-width: 1.4; }
    .fig-smartphone-app-punto { fill: var(--fig-ink); }
    .fig-smartphone-app-t { font: 700 18px var(--font, sans-serif); fill: var(--fig-ink); }
    .fig-smartphone-app-t17 { font-size: 17px; }
    .fig-smartphone-app-ora { font: 700 14px var(--font, sans-serif); fill: var(--fig-ink); }
    .fig-smartphone-app-tit { font: 800 16px var(--mono, monospace); fill: var(--fig-ink); letter-spacing: .14em; }

    .fig-smartphone-app-mano, .fig-smartphone-app-onda, .fig-smartphone-app-app, .fig-smartphone-app-contenuto {
      animation-duration: 8s; animation-iteration-count: infinite;
    }
    .fig-smartphone-app-mano { transform: translate(14px, 26px); animation-name: fig-smartphone-app-tocca; animation-timing-function: ease-in-out; }
    .fig-smartphone-app-onda { transform-box: fill-box; transform-origin: 50% 50%; opacity: 0; animation-name: fig-smartphone-app-onda; animation-timing-function: ease-out; }
    .fig-smartphone-app-app { transform-box: view-box; transform-origin: 0 0; opacity: 0; animation-name: fig-smartphone-app-zoom; animation-timing-function: cubic-bezier(.3, .7, .2, 1); }
    .fig-smartphone-app-contenuto { opacity: 0; animation-name: fig-smartphone-app-mostra; animation-timing-function: linear; }
    @keyframes fig-smartphone-app-tocca {
      0% { transform: translate(14px, 26px); }
      8%, 11% { transform: translate(0px, 0px); }
      20%, 100% { transform: translate(14px, 26px); }
    }
    @keyframes fig-smartphone-app-onda {
      0%, 8% { opacity: 0; transform: scale(.45); }
      9% { opacity: .95; transform: scale(.55); }
      19%, 100% { opacity: 0; transform: scale(1.6); }
    }
    @keyframes fig-smartphone-app-zoom {
      0%, 11.5% { opacity: 0; transform: translate(ZOOM_TX, ZOOM_TY) scale(ZOOM_SX, ZOOM_SY); }
      12% { opacity: 1; transform: translate(ZOOM_TX, ZOOM_TY) scale(ZOOM_SX, ZOOM_SY); }
      20%, 67% { opacity: 1; transform: translate(0px, 0px) scale(1, 1); }
      75% { opacity: 1; transform: translate(ZOOM_TX, ZOOM_TY) scale(ZOOM_SX, ZOOM_SY); }
      76%, 100% { opacity: 0; transform: translate(ZOOM_TX, ZOOM_TY) scale(ZOOM_SX, ZOOM_SY); }
    }
    @keyframes fig-smartphone-app-mostra { 0%, 18% { opacity: 0; } 24%, 63% { opacity: 1; } 67%, 100% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      .fig-smartphone-app-mano, .fig-smartphone-app-onda, .fig-smartphone-app-app, .fig-smartphone-app-contenuto { animation: none; }
      .fig-smartphone-app-mano { transform: none; }
      .fig-smartphone-app-onda { opacity: .7; transform: none; }
    }
  `;

  // Glifi delle icone, centrati in (0, 0) e larghi una ventina di unità.
  const GLIFI = {
    telefono: '<path class="fig-smartphone-app-g" d="M-7.5-8.5c1.6-1 3-.6 3.8.8l1.4 2.8c.5 1-.1 2-1 2.6 1 2.4 2.7 4.2 5.2 5.4.6-.9 1.6-1.4 2.6-1l2.9 1.3c1.4.7 1.8 2.2.8 3.7-1.2 1.8-3.4 2.4-5.6 1.6C-3 10.8-7.7 6-9.7-.4c-.7-2.4-.1-4.6 1.4-6.2Z"/>',
    messaggi: '<path class="fig-smartphone-app-g" d="M-8-8h16a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H-1l-5.5 4.5V6H-8a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3Z"/>',
    fotocamera: '<path class="fig-smartphone-app-g" d="M-10-5h4l2-3.5h8L6-5h4V7h-20Z"/><circle class="fig-smartphone-app-i" cx="0" cy="1" r="4.2"/>',
    mappe: '<path class="fig-smartphone-app-g" d="M0 10C-5.5 3.5-8 0-8-3.5a8 8 0 0 1 16 0C8 0 5.5 3.5 0 10Z"/><circle class="fig-smartphone-app-i" cx="0" cy="-3.5" r="3"/>',
    meteo: '<circle class="fig-smartphone-app-g" cx="-3" cy="-3" r="5"/><path class="fig-smartphone-app-gs" d="M-3-12.5v2.5M-12.5-3H-10M-9.7-9.7l1.8 1.8M3.7-9.7 1.9-7.9"/><path class="fig-smartphone-app-g" d="M-4 9.5a4 4 0 0 1 .4-8 5.6 5.6 0 0 1 10.6 1.6 3.3 3.3 0 0 1 0 6.4Z" style="stroke: var(--c); stroke-width: 1.6"/>',
    musica: '<path class="fig-smartphone-app-g" d="M-2 5.5a3.2 3.2 0 1 1-1.6-2.8V-8l11-2.5v12a3.2 3.2 0 1 1-1.6-2.8v-6.3l-7.8 1.8Z"/>',
    orologio: '<circle r="8.5" class="fig-smartphone-app-gs" style="stroke-width:2.2"/><path class="fig-smartphone-app-gs" d="M0-5V0l4 2.5" style="stroke-width:2.2"/>',
    calcolatrice: '<rect x="-8.5" y="-8.5" width="7.5" height="7.5" rx="1.5" class="fig-smartphone-app-g"/><rect x="1" y="-8.5" width="7.5" height="7.5" rx="1.5" class="fig-smartphone-app-g"/><rect x="-8.5" y="1" width="7.5" height="7.5" rx="1.5" class="fig-smartphone-app-g"/><rect x="1" y="1" width="7.5" height="7.5" rx="1.5" class="fig-smartphone-app-g" opacity=".6"/>',
    posta: '<rect x="-10" y="-7" width="20" height="14" rx="2" class="fig-smartphone-app-g"/><path class="fig-smartphone-app-gi" d="M-8.5-5 0 1.5 8.5-5"/>',
    foto: '<rect x="-10" y="-7.5" width="20" height="15" rx="2" class="fig-smartphone-app-gs"/><path class="fig-smartphone-app-g" d="M-8 6l5-6 3.5 4 2.5-2.5L8 6Z"/><circle class="fig-smartphone-app-g" cx="4.5" cy="-3" r="2"/>',
    impostazioni: '<circle r="7.2" class="fig-smartphone-app-gs" style="stroke-width:4;stroke-dasharray:3.1 2.55;stroke-linecap:butt"/><circle r="5.4" class="fig-smartphone-app-g"/><circle r="2.3" class="fig-smartphone-app-i"/>',
    calendario: '<rect x="-9" y="-8.5" width="18" height="17" rx="2.5" class="fig-smartphone-app-g"/><path class="fig-smartphone-app-i" d="M-9-3.5h18v-2.5a2.5 2.5 0 0 0-2.5-2.5h-13A2.5 2.5 0 0 0-9-6Z" opacity=".55"/><path class="fig-smartphone-app-i" d="M-6-1h3v3h-3zM-1.5-1h3v3h-3zM3-1h3v3H3zM-6 4h3v3h-3zM-1.5 4h3v3h-3z"/>',
    browser: '<circle r="8.5" class="fig-smartphone-app-gs"/><path class="fig-smartphone-app-gs" d="M-8.5 0h17M0-8.5c-4 4-4 13 0 17M0-8.5c4 4 4 13 0 17" style="stroke-width:1.6"/>',
    note: '<rect x="-8" y="-9" width="16" height="18" rx="2" class="fig-smartphone-app-g"/><path class="fig-smartphone-app-gi" d="M-4.5-4h9M-4.5 0h9M-4.5 4h6"/>',
    salute: '<path class="fig-smartphone-app-g" d="M0 8.5C-6 4-9.5.5-9.5-3.5a4.8 4.8 0 0 1 9.5-1.5 4.8 4.8 0 0 1 9.5 1.5C9.5.5 6 4 0 8.5Z"/>',
    video: '<path class="fig-smartphone-app-g" d="M-5-8.5 8.5 0-5 8.5Z"/>',
    cartella: '<path class="fig-smartphone-app-g" d="M-10-7h7l2 2.5h11V8h-20Z"/>',
    libri: '<path class="fig-smartphone-app-g" d="M-9.5-7c3-1 6-1 8.5 1v13c-2.5-2-5.5-2-8.5-1Zm19 0c-3-1-6-1-8.5 1v13c2.5-2 5.5-2 8.5-1Z"/>',
    negozio: '<path class="fig-smartphone-app-g" d="M-8.5-3h17l-1.5 11.5h-14Z"/><path class="fig-smartphone-app-gs" d="M-4-3v-2a4 4 0 0 1 8 0v2"/>',
    giochi: '<path class="fig-smartphone-app-g" d="M0-9.5 2.8-3.2 9.5-2.6 4.4 1.9 6 8.6 0 5.1-6 8.6-4.4 1.9-9.5-2.6-2.8-3.2Z"/>',
    microfono: '<rect x="-3.5" y="-9.5" width="7" height="12" rx="3.5" class="fig-smartphone-app-g"/><path class="fig-smartphone-app-gs" d="M-6.5-1.5a6.5 6.5 0 0 0 13 0M0 5v4"/>',
    casa: '<path class="fig-smartphone-app-g" d="M-9.5 0 0-8.5 9.5 0H6.5v8.5h-13V0Z"/>',
    scudo: '<path class="fig-smartphone-app-g" d="M0-9.5 8-6.5v5c0 5-3.5 8.5-8 10.5-4.5-2-8-5.5-8-10.5v-5Z"/>',
  };
  const C = { cool: 'var(--fig-cool)', glow: 'var(--fig-glow)', warm: 'var(--fig-warm)', red: 'var(--fig-red)', cap: 'var(--cap)', m2: 'var(--fig-metal-2)', f3: 'var(--fig-3)', f4: 'var(--fig-4)' };
  const GRIGLIA = [
    ['posta', 'cool'], ['calendario', 'red'], ['foto', 'warm'], ['fotocamera', 'm2'],
    ['mappe', 'glow'], ['orologio', 'f4'], ['note', 'warm'], ['impostazioni', 'm2'],
    ['musica', 'red'], ['libri', 'f3'], ['meteo', 'cool'], ['negozio', 'glow'],
    ['video', 'cap'], ['cartella', 'cool'], ['calcolatrice', 'f4'], ['salute', 'red'],
    ['giochi', 'warm'], ['microfono', 'cap'], ['casa', 'glow'], ['scudo', 'm2'],
  ];
  const DOCK = [['telefono', 'glow'], ['messaggi', 'cap'], ['browser', 'cool'], ['musica', 'red']];
  const COLONNE = [167, 208, 250, 291];
  const RIGHE = [106, 156, 206, 256, 306];
  const LATO = 32;
  // lo schermo del telefono davanti e l'icona toccata (Meteo, riga 3 colonna 3)
  const SCHERMO = { x: 158, y: 70, w: 174, h: 374 };
  const TOCCO = { x: COLONNE[2], y: RIGHE[2] };
  const ZOOM = {
    sx: LATO / SCHERMO.w, sy: LATO / SCHERMO.h,
    tx: TOCCO.x - SCHERMO.x * (LATO / SCHERMO.w), ty: TOCCO.y - SCHERMO.y * (LATO / SCHERMO.h),
  };
  const cssPhoneFinale = cssPhone
    .split('ZOOM_TX').join(f1(ZOOM.tx) + 'px').split('ZOOM_TY').join(f1(ZOOM.ty) + 'px')
    .split('ZOOM_SX').join(ZOOM.sx.toFixed(4)).split('ZOOM_SY').join(ZOOM.sy.toFixed(4));

  function icona(x, y, nome, colore) {
    return '<g style="--c: ' + C[colore] + '">' +
      '<rect class="fig-smartphone-app-icona" x="' + x + '" y="' + y + '" width="' + LATO + '" height="' + LATO + '" rx="8" fill="' + C[colore] + '"/>' +
      '<g transform="translate(' + (x + LATO / 2) + ' ' + (y + LATO / 2) + ')">' + GLIFI[nome] + '</g></g>';
  }

  // sole con nuvola per l'app Meteo, centrato in (cx, cy) con raggio r
  function soleNuvola(cx, cy, r) {
    const raggi = [];
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      raggi.push('M' + f1(cx + Math.cos(a) * r * 1.3) + ' ' + f1(cy + Math.sin(a) * r * 1.3) + 'L' + f1(cx + Math.cos(a) * r * 1.65) + ' ' + f1(cy + Math.sin(a) * r * 1.65));
    }
    const k = r / 24;
    return '<path d="' + raggi.join('') + '" fill="none" stroke="var(--fig-warm)" stroke-width="' + f1(3.5 * k + 1) + '" stroke-linecap="round"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="var(--fig-warm)" stroke="var(--fig-ink)" stroke-width="' + f1(1.6 * k + .6) + '"/>' +
      '<path transform="translate(' + f1(cx + r * .2) + ' ' + f1(cy + r * .55) + ') scale(' + f1(k) + ')" d="M-16 16a12 12 0 0 1 1-24 17 17 0 0 1 32 4 10 10 0 0 1 1 20Z" fill="var(--fig-paper)" stroke="var(--fig-ink)" stroke-width="2"/>';
  }

  function svgPhone(ctx) {
    const id = ctx && ctx.uid ? ctx.uid('fig-smartphone-app') : 'fig-smartphone-app-1';
    const clip = id + '-s';
    const S = SCHERMO;

    let griglia = '';
    GRIGLIA.forEach(([nome, colore], i) => { griglia += icona(COLONNE[i % 4], RIGHE[Math.floor(i / 4)], nome, colore); });
    let dock = '<rect x="163" y="372" width="164" height="52" rx="18" fill="var(--fig-metal)" opacity=".4"/>';
    DOCK.forEach(([nome, colore], i) => { dock += icona(COLONNE[i], 382, nome, colore); });

    // l'app Meteo a tutto schermo: lo sfondo parte dall'icona e si allarga, poi compare il contenuto
    const giorni = [['lun', '22°'], ['mar', '19°'], ['mer', '18°'], ['gio', '23°']];
    let previsioni = '<rect x="170" y="322" width="150" height="92" rx="12" fill="var(--fig-paper)" opacity=".18"/>';
    giorni.forEach(([g, t], i) => {
      const cx = 189 + i * 37.5;
      previsioni += '<text class="fig-smartphone-app-app-t" x="' + cx + '" y="344" text-anchor="middle" font-size="14" font-weight="700">' + g + '</text>' +
        (i === 1 || i === 2
          ? '<path transform="translate(' + cx + ' 366) scale(.5)" d="M-16 16a12 12 0 0 1 1-24 17 17 0 0 1 32 4 10 10 0 0 1 1 20Z" fill="var(--fig-paper)"/>'
          : '<circle cx="' + cx + '" cy="368" r="7" fill="var(--fig-warm)" stroke="var(--fig-paper)" stroke-width="1.5"/>') +
        '<text class="fig-smartphone-app-app-t" x="' + cx + '" y="402" text-anchor="middle" font-size="15" font-weight="700">' + t + '</text>';
    });
    const app =
      '<g class="fig-smartphone-app-app">' +
        '<rect class="fig-smartphone-app-app-fondo" x="' + S.x + '" y="' + S.y + '" width="' + S.w + '" height="' + S.h + '" rx="23"/>' +
        '<g class="fig-smartphone-app-contenuto">' +
          '<text class="fig-smartphone-app-app-t" x="176" y="112" font-size="15" font-weight="800" letter-spacing=".12em">METEO</text>' +
          soleNuvola(226, 176, 26) +
          '<text class="fig-smartphone-app-app-t" x="174" y="270" font-size="56" font-weight="800">21°</text>' +
          '<text class="fig-smartphone-app-app-t" x="177" y="298" font-size="16" font-weight="600">poco nuvoloso</text>' +
          previsioni +
        '</g>' +
      '</g>';

    // il dito: una sagoma stilizzata che punta in alto a sinistra; la punta è sul punto toccato
    const tx = TOCCO.x + LATO / 2, ty = TOCCO.y + LATO / 2;
    const dito =
      '<g class="fig-smartphone-app-mano"><g transform="translate(' + tx + ' ' + (ty + 2) + ') rotate(-27)">' +
        '<path class="fig-smartphone-app-dito" d="M-18 34C-18 9-10 0 0 0S18 9 18 34V340H-18Z"/>' +
        '<path class="fig-smartphone-app-unghia" d="M-10.5 27C-10.5 13-6 7.5 0 7.5S10.5 13 10.5 27V36C4 39.5-4 39.5-10.5 36Z"/>' +
        '<path class="fig-smartphone-app-piega" d="M-12 100q12 5 24 0M-12 108q12 5 24 0M-12 214q12 5 24 0"/>' +
      '</g></g>';

    return '<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><clipPath id="' + clip + '"><rect x="' + S.x + '" y="' + S.y + '" width="' + S.w + '" height="' + S.h + '" rx="23"/></clipPath></defs>' +
      '<rect class="fig-smartphone-app-sfondo" width="800" height="500"/>' +
      '<text class="fig-smartphone-app-tit" x="245" y="44" text-anchor="middle">DAVANTI</text>' +
      '<text class="fig-smartphone-app-tit" x="545" y="44" text-anchor="middle">DENTRO</text>' +

      // --- davanti ---
      '<rect class="fig-smartphone-app-tasto" x="146" y="132" width="5" height="30" rx="2"/>' +
      '<rect class="fig-smartphone-app-tasto" x="146" y="170" width="5" height="30" rx="2"/>' +
      '<rect class="fig-smartphone-app-tasto" x="339" y="150" width="5" height="46" rx="2"/>' +
      '<rect class="fig-smartphone-app-cornice" x="150" y="62" width="190" height="390" rx="30"/>' +
      '<rect class="fig-smartphone-app-schermo" x="' + S.x + '" y="' + S.y + '" width="' + S.w + '" height="' + S.h + '" rx="23"/>' +
      '<g clip-path="url(#' + clip + ')">' +
        '<circle cx="186" cy="150" r="92" fill="var(--cap)" opacity=".1"/>' +
        '<circle cx="330" cy="400" r="120" fill="var(--fig-glow)" opacity=".1"/>' +
        '<text class="fig-smartphone-app-ora" x="174" y="92">12:30</text>' +
        '<path class="fig-smartphone-app-inchiostro" d="M290 92h2.6v-3H290ZM294 92h2.6v-5.5H294ZM298 92h2.6v-8H298Z"/>' +
        '<rect x="305" y="84" width="17" height="8.5" rx="2" fill="none" stroke="var(--fig-ink)" stroke-width="1.3"/>' +
        '<rect class="fig-smartphone-app-inchiostro" x="307" y="86" width="10" height="4.5" rx="1"/><rect class="fig-smartphone-app-inchiostro" x="322.5" y="86.5" width="1.6" height="3.5"/>' +
        griglia +
        '<circle class="fig-smartphone-app-inchiostro" cx="237" cy="356" r="2.6"/><circle class="fig-smartphone-app-tenue" cx="245" cy="356" r="2.6"/><circle class="fig-smartphone-app-tenue" cx="253" cy="356" r="2.6"/>' +
        dock +
        '<rect class="fig-smartphone-app-inchiostro" x="215" y="432" width="60" height="4" rx="2"/>' +
        '<circle class="fig-smartphone-app-onda" cx="' + tx + '" cy="' + ty + '" r="24"/>' +
        app +
      '</g>' +
      '<circle class="fig-smartphone-app-inchiostro" cx="245" cy="86" r="5.5"/>' +

      // --- dentro ---
      '<rect class="fig-smartphone-app-tasto" x="446" y="132" width="5" height="30" rx="2"/>' +
      '<rect class="fig-smartphone-app-tasto" x="446" y="170" width="5" height="30" rx="2"/>' +
      '<rect class="fig-smartphone-app-tasto" x="639" y="150" width="5" height="46" rx="2"/>' +
      '<rect class="fig-smartphone-app-telaio" x="450" y="62" width="190" height="390" rx="30"/>' +
      '<rect class="fig-smartphone-app-vano" x="459" y="71" width="172" height="372" rx="22"/>' +
      '<rect class="fig-smartphone-app-piastra" x="459" y="71" width="172" height="372" rx="22"/>' +
      // scheda logica
      '<rect x="466" y="80" width="158" height="112" rx="8" fill="var(--fig-paper)"/>' +
      '<rect class="fig-smartphone-app-scheda" x="466" y="80" width="158" height="112" rx="8"/>' +
      '<rect class="fig-smartphone-app-bordo" x="466" y="80" width="158" height="112" rx="8"/>' +
      '<path class="fig-smartphone-app-pista" d="M578 112H588M578 128H584V150H588M552 146V178M540 146V170H512M500 154V170M512 98H526M608 128V136M520 186H604"/>' +
      '<rect class="fig-smartphone-app-metallo" x="472" y="88" width="40" height="66" rx="10"/>' +
      '<circle class="fig-smartphone-app-lente" cx="492" cy="106" r="11"/><circle cx="488.5" cy="102.5" r="3" fill="var(--fig-paper)" opacity=".5"/>' +
      '<circle class="fig-smartphone-app-lente" cx="492" cy="136" r="11"/><circle cx="488.5" cy="132.5" r="3" fill="var(--fig-paper)" opacity=".5"/>' +
      '<rect class="fig-smartphone-app-soc" x="526" y="94" width="52" height="52" rx="4"/>' +
      '<rect class="fig-smartphone-app-blocco" x="531" y="99" width="20" height="20" rx="1.5"/><rect class="fig-smartphone-app-blocco" x="555" y="99" width="18" height="20" rx="1.5"/>' +
      '<rect class="fig-smartphone-app-blocco" x="531" y="123" width="20" height="18" rx="1.5"/><rect class="fig-smartphone-app-blocco" x="555" y="123" width="18" height="18" rx="1.5"/>' +
      '<rect class="fig-smartphone-app-memoria" x="588" y="100" width="30" height="28" rx="2"/>' +
      '<rect class="fig-smartphone-app-modem" x="588" y="136" width="30" height="26" rx="2"/>' +
      '<path class="fig-smartphone-app-inchiostro" d="M520 156h5v2.5h-5ZM530 156h5v2.5h-5ZM566 156h5v2.5h-5ZM596 170h5v2.5h-5ZM606 170h5v2.5h-5ZM480 166h2.5v5H480ZM600 86h5v2.5h-5Z" opacity=".55"/>' +
      '<rect class="fig-smartphone-app-metallo" x="530" y="174" width="34" height="11" rx="2"/>' +
      // batteria
      '<rect class="fig-smartphone-app-batteria" x="468" y="200" width="154" height="216" rx="10"/>' +
      '<path d="M552 248 532 286H548L540 318 562 276H546Z" fill="var(--fig-paper)" opacity=".9"/>' +
      '<text class="fig-smartphone-app-batteria-t" x="545" y="352" text-anchor="middle">batteria</text>' +
      // altoparlante, connettore, microfono
      '<path class="fig-smartphone-app-inchiostro" d="' + [482, 490, 498, 506, 514].map((x) => 'M' + x + ' 430a2 2 0 1 0 .01 0Z').join('') + '"/>' +
      '<rect x="529" y="425" width="34" height="10" rx="5" fill="var(--fig-paper)" stroke="var(--fig-ink)" stroke-width="1.5"/>' +
      '<path class="fig-smartphone-app-inchiostro" d="' + [578, 586, 594, 602].map((x) => 'M' + x + ' 430a2 2 0 1 0 .01 0Z').join('') + '"/>' +

      // il dito che tocca l'icona Meteo (sopra a tutto)
      dito +

      // didascalie
      '<text class="fig-smartphone-app-t" x="14" y="136">schermo a</text>' +
      '<text class="fig-smartphone-app-t" x="14" y="158">sfioramento</text>' +
      '<path class="fig-smartphone-app-guida" d="M120 150H136L162 140"/><circle class="fig-smartphone-app-punto" cx="162" cy="140" r="3"/>' +
      '<text class="fig-smartphone-app-t" x="14" y="262">icone</text>' +
      '<text class="fig-smartphone-app-t" x="14" y="284">delle app</text>' +
      '<path class="fig-smartphone-app-guida" d="M100 276H118L167 272"/><circle class="fig-smartphone-app-punto" cx="167" cy="272" r="3"/>' +
      '<text class="fig-smartphone-app-t fig-smartphone-app-t17" x="349" y="300">un tocco</text>' +
      '<text class="fig-smartphone-app-t fig-smartphone-app-t17" x="349" y="322">avvia l\'app</text>' +
      '<path class="fig-smartphone-app-guida" d="M378 330L360 396"/><circle class="fig-smartphone-app-punto" cx="360" cy="396" r="3"/>' +
      '<text class="fig-smartphone-app-t fig-smartphone-app-t17" x="348" y="104">fotocamera</text>' +
      '<path class="fig-smartphone-app-guida" d="M444 110L474 114"/><circle class="fig-smartphone-app-punto" cx="474" cy="114" r="3"/>' +
      '<text class="fig-smartphone-app-t" x="652" y="78">system-on-chip</text>' +
      '<text class="fig-smartphone-app-t" x="652" y="100">ARM</text>' +
      '<path class="fig-smartphone-app-guida" d="M648 86H604L574 98"/><circle class="fig-smartphone-app-punto" cx="574" cy="98" r="3"/>' +
      '<text class="fig-smartphone-app-t" x="652" y="132">memoria</text>' +
      '<path class="fig-smartphone-app-guida" d="M648 126L616 116"/><circle class="fig-smartphone-app-punto" cx="616" cy="116" r="3"/>' +
      '<text class="fig-smartphone-app-t" x="652" y="168">modem</text>' +
      '<path class="fig-smartphone-app-guida" d="M648 162L616 152"/><circle class="fig-smartphone-app-punto" cx="616" cy="152" r="3"/>' +
      '</svg>';
  }

  root.ProgStoria.figura('smartphone-app', {
    alt: 'Due viste dello stesso smartphone. Davanti: lo schermo a sfioramento con una griglia di venti icone colorate e, in basso, una barra con altre quattro; un dito stilizzato tocca l\'icona Meteo e l\'app si apre allargandosi fino a riempire lo schermo, con un sole, la temperatura di 21 gradi e le previsioni per quattro giorni, poi si richiude. Dentro, senza il retro: in alto la scheda logica con la fotocamera, il system-on-chip ARM, la memoria e il modem; sotto, la batteria occupa quasi tutto lo spazio.',
    css: cssPhoneFinale,
    disegna(ctx) { return svgPhone(ctx); },
  });

  /* ===================== cloud ===================== */

  // Geometria della sala (x 160..640, y 90..300; pavimento flottante da y 278).
  const SALA = { x: 160, y: 90, w: 480, h: 210, pavimento: 278 };
  const RACK = [234, 342, 450];
  const RACK_W = 96;
  const UNITA = [141, 168, 195, 222, 249];
  const CONT = { w: 32, h: 16 };
  const REGISTRO = { x: 560, righe: [260, 242, 224, 206] };
  // la gru prende il container in cima al registro (560, 206) e lo posa nel rack centrale, unità in alto, secondo posto
  const PRESA = { x: 560, y: 206 };
  const POSA = { x: RACK[1] + 46, y: UNITA[0] + 4 };
  const CARRELLO_Y = 114; // fondo del carrello
  const DX = POSA.x - PRESA.x;
  const SU = 116 - PRESA.y; // spostamento verticale in cima alla corsa
  const GIU = POSA.y - PRESA.y;
  const CAVO_L = PRESA.y - CARRELLO_Y;
  const scalaCavo = (topY) => f1(Math.max(2, topY - CARRELLO_Y) / CAVO_L);
  const DISPOSITIVI = [180, 317, 487, 620];
  const RETE_Y0 = 390, RETE_Y1 = 306;

  const cssCloud = `
    .fig-cloud-sfondo { fill: var(--fig-paper); }
    .fig-cloud-nuvola-bordo { fill: none; stroke: var(--fig-line); stroke-width: 5; }
    .fig-cloud-nuvola { fill: var(--fig-1); }
    .fig-cloud-sala { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-cloud-plenum { fill: var(--fig-metal); opacity: .35; }
    .fig-cloud-linea { fill: none; stroke: var(--fig-ink); stroke-width: 2; }
    .fig-cloud-sottile { fill: none; stroke: var(--fig-ink); stroke-width: 1; opacity: .45; }
    .fig-cloud-metallo { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 1.4; }
    .fig-cloud-metallo-2 { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-cloud-rack { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-cloud-unita { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 1.2; }
    .fig-cloud-vuoto { fill: none; stroke: var(--fig-ink); stroke-width: 1.2; stroke-dasharray: 3 2.5; opacity: .7; }
    .fig-cloud-cont { stroke: var(--fig-ink); stroke-width: 1.4; }
    .fig-cloud-onda { fill: none; stroke: var(--fig-ink); stroke-width: .9; opacity: .45; }
    .fig-cloud-led { fill: var(--fig-glow); stroke: var(--fig-ink); stroke-width: .8; }
    .fig-cloud-led-spento { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: .8; }
    .fig-cloud-freddo { fill: none; stroke: var(--fig-cool); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
    .fig-cloud-freddo-p { fill: var(--fig-cool); }
    .fig-cloud-caldo { fill: none; stroke: var(--fig-red); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
    .fig-cloud-caldo-p { fill: var(--fig-red); }
    .fig-cloud-corrente { fill: none; stroke: var(--fig-warm); stroke-width: 3; stroke-linecap: round; }
    .fig-cloud-fulmine { fill: var(--fig-warm); stroke: var(--fig-ink); stroke-width: 1.4; stroke-linejoin: round; }
    .fig-cloud-ventola { fill: none; stroke: var(--fig-ink); stroke-width: 1.6; }
    .fig-cloud-cavo { fill: var(--fig-ink); }
    .fig-cloud-rete { fill: none; stroke: var(--fig-line); stroke-width: 2; stroke-dasharray: 5 5; }
    .fig-cloud-dispositivo { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .fig-cloud-display { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.2; }
    .fig-cloud-base { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .fig-cloud-riga { fill: var(--fig-line); }
    .fig-cloud-richiesta { fill: var(--fig-warm); stroke: var(--fig-ink); stroke-width: 1.4; }
    .fig-cloud-risposta { fill: var(--cap); stroke: var(--fig-ink); stroke-width: 1.4; }
    .fig-cloud-t { font: 700 18px var(--font, sans-serif); fill: var(--fig-ink); paint-order: stroke; stroke: var(--fig-paper); stroke-width: 5px; stroke-linejoin: round; }
    .fig-cloud-titolo { font: 800 21px var(--font, sans-serif); fill: var(--cap); paint-order: stroke; stroke: var(--fig-paper); stroke-width: 5px; stroke-linejoin: round; }
    .fig-cloud-guida { fill: none; stroke: var(--fig-ink); stroke-width: 1.4; }
    .fig-cloud-punto { fill: var(--fig-ink); }

    .fig-cloud-carrello, .fig-cloud-cavo-g, .fig-cloud-viaggio, .fig-cloud-posato, .fig-cloud-acceso { animation-duration: 10s; animation-iteration-count: infinite; }
    .fig-cloud-carrello { animation-name: fig-cloud-carrello; animation-timing-function: ease-in-out; }
    .fig-cloud-cavo-g { transform-box: fill-box; transform-origin: 50% 0; animation-name: fig-cloud-cavo; animation-timing-function: ease-in-out; }
    .fig-cloud-viaggio { animation-name: fig-cloud-viaggio; animation-timing-function: ease-in-out; }
    .fig-cloud-posato { opacity: 0; animation-name: fig-cloud-posato; animation-timing-function: linear; }
    .fig-cloud-acceso { opacity: 0; animation-name: fig-cloud-posato; animation-timing-function: linear; }
    @keyframes fig-cloud-carrello {
      0%, 18% { transform: translate(0px, 0px); }
      42%, 58% { transform: translate(${DX}px, 0px); }
      80%, 100% { transform: translate(0px, 0px); }
    }
    @keyframes fig-cloud-cavo {
      0%, 6% { transform: scaleY(1); }
      18%, 42% { transform: scaleY(${scalaCavo(116)}); }
      54% { transform: scaleY(${scalaCavo(POSA.y)}); }
      60%, 82% { transform: scaleY(${scalaCavo(116)}); }
      94%, 100% { transform: scaleY(1); }
    }
    @keyframes fig-cloud-viaggio {
      0%, 6% { transform: translate(0px, 0px); opacity: 1; }
      18% { transform: translate(0px, ${SU}px); opacity: 1; }
      42% { transform: translate(${DX}px, ${SU}px); opacity: 1; }
      54% { transform: translate(${DX}px, ${GIU}px); opacity: 1; }
      54.5% { transform: translate(${DX}px, ${GIU}px); opacity: 0; }
      55%, 88% { transform: translate(0px, 0px); opacity: 0; }
      96%, 100% { transform: translate(0px, 0px); opacity: 1; }
    }
    @keyframes fig-cloud-posato { 0%, 54% { opacity: 0; } 54.5%, 90% { opacity: 1; } 97%, 100% { opacity: 0; } }

    .fig-cloud-pacchetto { animation: fig-cloud-sale 3.2s ease-in-out infinite; }
    .fig-cloud-pacchetto.fig-cloud-risposta { animation-name: fig-cloud-scende; }
    @keyframes fig-cloud-sale {
      0% { transform: translateY(${RETE_Y0}px); opacity: 0; }
      8% { opacity: 1; }
      42% { transform: translateY(${RETE_Y1}px); opacity: 1; }
      48%, 100% { transform: translateY(${RETE_Y1}px); opacity: 0; }
    }
    @keyframes fig-cloud-scende {
      0%, 50% { transform: translateY(${RETE_Y1}px); opacity: 0; }
      58% { opacity: 1; }
      92% { transform: translateY(${RETE_Y0}px); opacity: 1; }
      98%, 100% { transform: translateY(${RETE_Y0}px); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .fig-cloud-carrello, .fig-cloud-cavo-g, .fig-cloud-viaggio, .fig-cloud-posato, .fig-cloud-acceso, .fig-cloud-pacchetto { animation: none; }
      .fig-cloud-posato, .fig-cloud-acceso { opacity: 1; }
      .fig-cloud-pacchetto.fig-cloud-richiesta { transform: translateY(364px); }
      .fig-cloud-pacchetto.fig-cloud-risposta { transform: translateY(328px); }
    }
  `;

  // Un container da nave in miniatura: fiancata ondulata e porte sul lato destro.
  function container(x, y, colore, extra) {
    let onde = '';
    for (let i = 4; i < 26; i += 3.6) onde += 'M' + f1(x + i) + ' ' + (y + 2.5) + 'V' + (y + CONT.h - 2.5);
    return '<g' + (extra || '') + '>' +
      '<rect class="fig-cloud-cont" x="' + x + '" y="' + y + '" width="' + CONT.w + '" height="' + CONT.h + '" rx="1.5" fill="' + colore + '"/>' +
      '<path class="fig-cloud-onda" d="' + onde + '"/>' +
      '<path d="M' + (x + 27) + ' ' + (y + 1) + 'V' + (y + CONT.h - 1) + '" stroke="var(--fig-ink)" stroke-width="1.2"/>' +
      '</g>';
  }
  const COLORI = ['var(--fig-cool)', 'var(--fig-warm)', 'var(--fig-red)', 'var(--cap)', 'var(--fig-glow)', 'var(--fig-3)'];

  function rack(x, r) {
    let out = '<rect class="fig-cloud-rack" x="' + x + '" y="134" width="' + RACK_W + '" height="' + (SALA.pavimento - 134) + '" rx="3"/>' +
      '<rect x="' + (x + 4) + '" y="137" width="' + (RACK_W - 8) + '" height="4" fill="var(--fig-paper)" opacity=".25"/>';
    UNITA.forEach((y, u) => {
      out += '<rect class="fig-cloud-unita" x="' + (x + 6) + '" y="' + y + '" width="84" height="24" rx="2"/>';
      [0, 1].forEach((s) => {
        const cx = x + 10 + s * 36;
        const n = r * 10 + u * 2 + s;
        const bersaglio = r === 1 && u === 0 && s === 1;
        const vuoto = bersaglio || n === 7 || n === 22 || n === 15;
        out += vuoto
          ? '<rect class="fig-cloud-vuoto" x="' + cx + '" y="' + (y + 4) + '" width="' + CONT.w + '" height="' + CONT.h + '" rx="1.5"/>'
          : container(cx, y + 4, COLORI[(n * 5 + r) % COLORI.length]);
      });
      const target = r === 1 && u === 0;
      out += '<circle class="' + (target ? 'fig-cloud-led-spento' : 'fig-cloud-led') + '" cx="' + (x + 84) + '" cy="' + (y + 12) + '" r="2.8"/>';
      if (target) out += '<circle class="fig-cloud-led fig-cloud-acceso" cx="' + (x + 84) + '" cy="' + (y + 12) + '" r="2.8"/>';
    });
    return out;
  }

  function freccia(x1, y1, x2, y2, cls) {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
    const bx = x2 - ux * 8, by = y2 - uy * 8;
    return '<path class="fig-cloud-' + cls + '" d="M' + x1 + ' ' + y1 + 'L' + f1(bx) + ' ' + f1(by) + '"/>' +
      '<path class="fig-cloud-' + cls + '-p" d="M' + x2 + ' ' + y2 + 'L' + f1(bx - uy * 5) + ' ' + f1(by + ux * 5) + 'L' + f1(bx + uy * 5) + ' ' + f1(by - ux * 5) + 'Z"/>';
  }

  function portatile(cx) {
    return '<rect class="fig-cloud-dispositivo" x="' + (cx - 48) + '" y="396" width="96" height="56" rx="5"/>' +
      '<rect class="fig-cloud-display" x="' + (cx - 42) + '" y="402" width="84" height="44" rx="2"/>' +
      '<rect class="fig-cloud-riga" x="' + (cx - 34) + '" y="410" width="40" height="4" rx="1"/>' +
      '<rect class="fig-cloud-riga" x="' + (cx - 34) + '" y="419" width="60" height="3" rx="1"/>' +
      '<rect class="fig-cloud-riga" x="' + (cx - 34) + '" y="426" width="52" height="3" rx="1"/>' +
      '<rect x="' + (cx - 34) + '" y="434" width="24" height="6" rx="1" fill="var(--cap)"/>' +
      '<path class="fig-cloud-base" d="M' + (cx - 60) + ' 452H' + (cx + 60) + 'L' + (cx + 68) + ' 464H' + (cx - 68) + 'Z"/>';
  }
  function telefono(cx) {
    return '<rect class="fig-cloud-dispositivo" x="' + (cx - 15) + '" y="396" width="30" height="58" rx="6"/>' +
      '<rect class="fig-cloud-display" x="' + (cx - 11.5) + '" y="402" width="23" height="44" rx="2"/>' +
      '<rect x="' + (cx - 8) + '" y="408" width="7" height="7" rx="2" fill="var(--fig-cool)"/><rect x="' + (cx + 1) + '" y="408" width="7" height="7" rx="2" fill="var(--fig-warm)"/>' +
      '<rect x="' + (cx - 8) + '" y="418" width="7" height="7" rx="2" fill="var(--fig-glow)"/><rect x="' + (cx + 1) + '" y="418" width="7" height="7" rx="2" fill="var(--cap)"/>';
  }

  function svgCloud() {
    // la nuvola: unione di cerchi e di un rettangolo (contorno disegnato sotto il riempimento)
    const forme = [
      '<rect x="150" y="128" width="500" height="210" rx="30"/>',
      '<circle cx="235" cy="128" r="92"/>', '<circle cx="380" cy="100" r="88"/>', '<circle cx="530" cy="108" r="86"/>',
      '<circle cx="622" cy="128" r="62"/>', '<circle cx="644" cy="200" r="72"/>', '<circle cx="652" cy="282" r="60"/>',
      '<circle cx="156" cy="244" r="70"/>', '<circle cx="168" cy="300" r="42"/>',
    ].join('');
    const S = SALA;

    let registro = '';
    REGISTRO.righe.forEach((y, i) => {
      [0, 1].forEach((c) => {
        if (i === 3 && c === 0) return; // posto del container che parte
        registro += container(REGISTRO.x + c * 36, y, COLORI[(i * 2 + c + 3) % COLORI.length]);
      });
    });

    let piastrelle = '';
    for (let x = S.x + 40; x < S.x + S.w; x += 40) piastrelle += 'M' + x + ' ' + S.pavimento + 'V' + (S.y + S.h);

    let rete = '';
    DISPOSITIVI.forEach((x, i) => {
      rete += '<path class="fig-cloud-rete" d="M' + x + ' 394V' + (S.y + S.h) + '"/>' +
        '<circle class="fig-cloud-pacchetto fig-cloud-richiesta" cx="' + x + '" cy="0" r="5.5" style="animation-delay: -' + f1(i * 0.8) + 's"/>' +
        '<circle class="fig-cloud-pacchetto fig-cloud-risposta" cx="' + x + '" cy="0" r="5.5" style="animation-delay: -' + f1(i * 0.8) + 's"/>';
    });

    const caldo = RACK.map((x) => {
      const c = x + RACK_W / 2;
      return '<path class="fig-cloud-caldo" d="M' + c + ' 130c-4-3 4-6 0-9s4-6 0-8"/><path class="fig-cloud-caldo-p" d="M' + c + ' 106l-4.5 7h9Z"/>';
    }).join('');

    return '<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="fig-cloud-sfondo" width="800" height="500"/>' +
      '<g class="fig-cloud-nuvola-bordo">' + forme + '</g>' +
      '<g class="fig-cloud-nuvola">' + forme + '</g>' +

      // rete verso telefoni e portatili (sotto la sala)
      rete +

      // la sala del data center
      '<rect class="fig-cloud-sala" x="' + S.x + '" y="' + S.y + '" width="' + S.w + '" height="' + S.h + '"/>' +
      '<rect class="fig-cloud-plenum" x="' + S.x + '" y="' + S.pavimento + '" width="' + S.w + '" height="' + (S.y + S.h - S.pavimento) + '"/>' +
      '<path class="fig-cloud-sottile" d="' + piastrelle + '"/>' +
      '<path class="fig-cloud-linea" d="M' + S.x + ' ' + S.pavimento + 'H' + (S.x + S.w) + '"/>' +
      // aria fredda: dal condizionatore sotto il pavimento, poi su fra gli armadi; aria calda sopra gli armadi
      '<path class="fig-cloud-freddo" d="M195 279V286"/>' +
      freccia(195, 286, 556, 286, 'freddo') +
      [227, 336, 444, 553].map((x) => freccia(x, 274, x, 244, 'freddo')).join('') +
      caldo +
      freccia(195, 96, 195, 116, 'caldo') +
      // corrente sotto il pavimento, con le risalite negli armadi
      '<path class="fig-cloud-corrente" d="M150 295H' + (RACK[2] + RACK_W / 2) + RACK.map((x) => 'M' + (x + RACK_W / 2) + ' 295V' + (S.pavimento + 1)).join('') + '"/>' +
      '<circle cx="150" cy="295" r="10" fill="var(--fig-paper)" stroke="var(--fig-ink)" stroke-width="1.6"/>' +
      '<path class="fig-cloud-fulmine" d="M152 286 145 296h5l-3 8 8-11h-5l3-7Z"/>' +
      // condizionatore di precisione
      '<rect class="fig-cloud-metallo-2" x="170" y="118" width="50" height="' + (S.pavimento - 118) + '" rx="3"/>' +
      '<circle cx="195" cy="146" r="16" fill="var(--fig-paper)" stroke="var(--fig-ink)" stroke-width="1.6"/>' +
      '<path class="fig-cloud-ventola" d="M195 146c-2-6 1-11 6-12M195 146c6-1 10 2 10 7M195 146c-1 6-6 9-11 7M195 146c-6-2-7-7-5-11"/>' +
      '<path d="M178 176H212M178 186H212M178 196H212M178 206H212M178 216H212M178 226H212" stroke="var(--fig-paper)" stroke-width="2" opacity=".5"/>' +
      '<path d="M188 246l14 14M202 246l-14 14M195 243v20M185 253h20" stroke="var(--fig-cool)" stroke-width="2.4" stroke-linecap="round"/>' +
      // armadi con i server
      RACK.map((x, r) => rack(x, r)).join('') +
      // il container posato nel server di destinazione
      container(POSA.x, POSA.y, 'var(--fig-glow)', ' class="fig-cloud-posato"') +
      // registro dei container
      registro +
      // la gru: rotaia, carrello, cavo e container in viaggio
      '<rect class="fig-cloud-metallo" x="230" y="98" width="404" height="6" rx="1"/>' +
      '<path class="fig-cloud-linea" d="M240 90V98M624 90V98"/>' +
      '<g class="fig-cloud-carrello">' +
        '<rect class="fig-cloud-metallo-2" x="' + (PRESA.x + 2) + '" y="104" width="28" height="10" rx="2"/>' +
        '<circle cx="' + (PRESA.x + 9) + '" cy="104" r="3" fill="var(--fig-metal)" stroke="var(--fig-ink)" stroke-width="1.2"/>' +
        '<circle cx="' + (PRESA.x + 23) + '" cy="104" r="3" fill="var(--fig-metal)" stroke="var(--fig-ink)" stroke-width="1.2"/>' +
        '<rect class="fig-cloud-cavo fig-cloud-cavo-g" x="' + (PRESA.x + CONT.w / 2 - 1) + '" y="' + CARRELLO_Y + '" width="2" height="' + CAVO_L + '"/>' +
      '</g>' +
      container(PRESA.x, PRESA.y, 'var(--fig-glow)', ' class="fig-cloud-viaggio"') +

      // dispositivi
      portatile(DISPOSITIVI[0]) + telefono(DISPOSITIVI[1]) + telefono(DISPOSITIVI[2]) + portatile(DISPOSITIVI[3]) +

      // didascalie
      '<text class="fig-cloud-titolo" x="18" y="48">la «nuvola»</text>' +
      '<path class="fig-cloud-guida" d="M134 54L166 70"/><circle class="fig-cloud-punto" cx="166" cy="70" r="3"/>' +
      '<text class="fig-cloud-t" x="250" y="72">server nei rack</text>' +
      '<path class="fig-cloud-guida" d="M300 78V150"/><circle class="fig-cloud-punto" cx="300" cy="150" r="3"/>' +
      '<text class="fig-cloud-t" x="12" y="190">raffreddamento</text>' +
      '<path class="fig-cloud-guida" d="M138 184L172 196"/><circle class="fig-cloud-punto" cx="172" cy="196" r="3"/>' +
      '<text class="fig-cloud-t" x="12" y="336">alimentazione</text>' +
      '<path class="fig-cloud-guida" d="M132 328L146 306"/><circle class="fig-cloud-punto" cx="146" cy="306" r="3"/>' +
      '<text class="fig-cloud-t" x="790" y="212" text-anchor="end">registro</text>' +
      '<text class="fig-cloud-t" x="790" y="234" text-anchor="end">dei container</text>' +
      '<path class="fig-cloud-guida" d="M670 226L630 236"/><circle class="fig-cloud-punto" cx="630" cy="236" r="3"/>' +
      '<text class="fig-cloud-t" x="402" y="424" text-anchor="middle">richieste</text>' +
      '<text class="fig-cloud-t" x="402" y="446" text-anchor="middle">alle API</text>' +
      '</svg>';
  }

  root.ProgStoria.figura('cloud', {
    alt: 'Una grande nuvola disegnata a contorno contiene la sezione di un data center. A sinistra un condizionatore spinge aria fredda sotto il pavimento flottante, che risale fra gli armadi; sopra gli armadi sale aria calda. Sotto il pavimento corre anche la linea dell\'alimentazione. Tre armadi (rack) contengono server, e ogni server ospita piccoli container colorati simili a quelli delle navi. A destra c\'è il registro, una pila di container. Una gru scorre su una rotaia: solleva un container dal registro, lo porta sopra l\'armadio centrale e lo cala in un posto libero di un server, che si accende. In basso, due portatili e due telefoni sono collegati alla nuvola da linee tratteggiate su cui salgono richieste e scendono risposte: sono le chiamate alle API.',
    css: cssCloud,
    disegna() { return svgCloud(); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
