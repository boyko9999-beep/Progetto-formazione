/*
 * Illustrazioni del capitolo 11 · Il web e l'open source.
 *   primo-server  la workstation a cubo del CERN (1990): l'etichetta «NON SPEGNERLA!», il primo browser sullo schermo,
 *                 richieste che arrivano dal cavo di rete e pagine che ripartono
 *   ragnatela     pagine su server di città diverse legate da collegamenti; un punto luminoso salta da un collegamento all'altro
 * Colori dalla tavolozza --fig-* e --cap, così il disegno segue il tema chiaro o scuro.
 * Stesso colore, stesso concetto: --cap = collegamento ipertestuale, --fig-warm = ciò che viaggia (richiesta, navigazione).
 */
(function (root) {
  'use strict';
  if (!root.ProgStoria) return;

  const f1 = (n) => Math.round(n * 10) / 10;

  /* ===================== primo-server ===================== */

  const cssServer = `
    .fig-primo-server-sfondo { fill: var(--fig-paper); }
    .fig-primo-server-piano { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-primo-server-fronte-tavolo { fill: var(--fig-2); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-primo-server-venatura { fill: none; stroke: var(--fig-3); stroke-width: 1.5; stroke-linecap: round; opacity: .6; }
    .fig-primo-server-nero { fill: var(--fig-metal-2); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .fig-primo-server-luce { fill: var(--fig-paper); opacity: .22; }
    .fig-primo-server-ombra { fill: var(--fig-ink); opacity: .26; }
    .fig-primo-server-spigolo { fill: none; stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .fig-primo-server-vetro { fill: var(--fig-metal); stroke: var(--fig-ink); stroke-width: 2; }
    .fig-primo-server-carta { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.4; }
    .fig-primo-server-cella { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: .9; }
    .fig-primo-server-barra { fill: var(--fig-ink); }
    .fig-primo-server-riga { fill: var(--fig-line); }
    .fig-primo-server-link { fill: var(--cap); }
    .fig-primo-server-tasti { fill: none; stroke: var(--fig-metal); stroke-width: 3.2; stroke-dasharray: 11 3; }
    .fig-primo-server-cavo { fill: none; stroke: var(--fig-ink); stroke-width: 4; stroke-linecap: round; }
    .fig-primo-server-filo { fill: none; stroke: var(--fig-ink); stroke-width: 2; stroke-linecap: round; }
    .fig-primo-server-etichetta { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 1.2; }
    .fig-primo-server-piega { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1; }
    .fig-primo-server-mano { font-family: "Segoe Print", "Bradley Hand", "Marker Felt", "Comic Sans MS", "Dancing Script", "Comic Neue", var(--font, sans-serif); fill: var(--fig-red); }
    .fig-primo-server-mano-1 { font-size: 17px; font-weight: 700; }
    .fig-primo-server-mano-2 { font-size: 20px; font-weight: 800; }
    .fig-primo-server-sotto { fill: none; stroke: var(--fig-red); stroke-width: 2.2; stroke-linecap: round; }
    .fig-primo-server-guida { fill: none; stroke: var(--fig-ink); stroke-width: 1.4; }
    .fig-primo-server-punto { fill: var(--fig-ink); }
    .fig-primo-server-t { font: 700 18px var(--font, sans-serif); fill: var(--fig-ink); }
    .fig-primo-server-t2 { font: 600 16px var(--font, sans-serif); fill: var(--fig-ink); }
    .fig-primo-server-titolo-pagina { font: 700 17px var(--pg-serif, Georgia, serif); fill: var(--fig-ink); }
    .fig-primo-server-carti-1 { font: 800 16px var(--mono, monospace); fill: var(--fig-ink); letter-spacing: .06em; }
    .fig-primo-server-carti-2 { font: 600 15px var(--font, sans-serif); fill: var(--fig-ink); }
    .fig-primo-server-rq-c { fill: var(--fig-warm); stroke: var(--fig-ink); stroke-width: 1.6; }
    .fig-primo-server-pg-c { fill: var(--fig-paper); stroke: var(--cap); stroke-width: 2; }
    .fig-primo-server-pg-r { stroke: var(--cap); stroke-width: 1.6; }

    .fig-primo-server-rq, .fig-primo-server-pg { animation: 7s ease-in-out infinite; }
    .fig-primo-server-rq { transform: translate(768px, 384px); animation-name: fig-primo-server-arriva; }
    .fig-primo-server-pg { transform: translate(730px, 384px); animation-name: fig-primo-server-parte; }
    @keyframes fig-primo-server-arriva {
      0% { transform: translate(816px, 384px); opacity: 0; }
      3% { opacity: 1; }
      30% { transform: translate(714px, 384px); opacity: 1; }
      34%, 100% { transform: translate(714px, 384px); opacity: 0; }
    }
    @keyframes fig-primo-server-parte {
      0%, 46% { transform: translate(714px, 384px); opacity: 0; }
      50% { opacity: 1; }
      80% { transform: translate(816px, 384px); opacity: 1; }
      81%, 100% { transform: translate(816px, 384px); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .fig-primo-server-rq, .fig-primo-server-pg { animation: none; }
    }
  `;

  // Una riga di testo finto nella pagina del browser: tratti grigi e collegamenti sottolineati nel colore del capitolo.
  function riga(x, y, pezzi) {
    let out = '';
    let cx = x;
    pezzi.forEach((p) => {
      const w = Math.abs(p);
      if (p > 0) out += '<rect class="fig-primo-server-riga" x="' + cx + '" y="' + (y - 3.5) + '" width="' + w + '" height="3.5" rx="1"/>';
      else out += '<rect class="fig-primo-server-link" x="' + cx + '" y="' + (y - 4) + '" width="' + w + '" height="3.5" rx="1"/>' +
        '<rect class="fig-primo-server-link" x="' + cx + '" y="' + (y + 1.2) + '" width="' + w + '" height="1.3"/>';
      cx += w + 4;
    });
    return out;
  }

  function svgServer(ctx) {
    const clip = (ctx && ctx.uid ? ctx.uid('fig-primo-server') : 'fig-primo-server-1') + '-schermo';

    // menu verticale dell'applicazione, in alto a sinistra come in NeXTSTEP
    let menu = '<rect class="fig-primo-server-barra" x="78" y="64" width="62" height="14"/>' +
      '<rect x="82" y="69" width="26" height="4" rx="1" fill="var(--fig-paper)"/>';
    [30, 22, 36, 18, 28, 24, 14].forEach((w, i) => {
      const y = 78 + i * 14;
      menu += '<rect class="fig-primo-server-cella" x="78" y="' + y + '" width="62" height="14"/>' +
        '<rect class="fig-primo-server-riga" x="83" y="' + (y + 5.5) + '" width="' + w + '" height="3.5" rx="1"/>';
      if (i < 4) menu += '<path d="M130 ' + (y + 4) + 'l5 3-5 3Z" class="fig-primo-server-barra"/>';
    });

    // la finestra del browser-editor WorldWideWeb con la prima pagina
    const finestra =
      '<rect x="153" y="73" width="166" height="182" class="fig-primo-server-ombra"/>' +
      '<rect class="fig-primo-server-carta" x="150" y="70" width="166" height="182"/>' +
      '<rect class="fig-primo-server-barra" x="150" y="70" width="166" height="16"/>' +
      '<rect x="154" y="73" width="10" height="10" fill="none" stroke="var(--fig-paper)" stroke-width="1.2"/>' +
      '<rect x="302" y="73" width="10" height="10" fill="none" stroke="var(--fig-paper)" stroke-width="1.2"/>' +
      '<path d="M304.5 75.5l5 5m0-5-5 5" stroke="var(--fig-paper)" stroke-width="1.2"/>' +
      // barra di scorrimento a sinistra, come in NeXTSTEP
      '<rect x="150" y="86" width="12" height="166" fill="var(--fig-metal)" stroke="var(--fig-ink)" stroke-width="1"/>' +
      '<rect x="151.5" y="94" width="9" height="44" rx="1" class="fig-primo-server-cella"/>' +
      '<text class="fig-primo-server-titolo-pagina" x="170" y="108" textLength="130" lengthAdjust="spacingAndGlyphs">World Wide Web</text>' +
      riga(170, 124, [134]) +
      riga(170, 135, [52, -58, 16]) +
      riga(170, 146, [128]) +
      riga(170, 157, [-62, 66]) +
      riga(170, 173, [120]) +
      riga(170, 184, [36, -64, 26]) +
      riga(170, 195, [92]) +
      '<rect class="fig-primo-server-barra" x="172" y="207" width="4" height="4"/>' + riga(182, 212, [-70]) +
      '<rect class="fig-primo-server-barra" x="172" y="220" width="4" height="4"/>' + riga(182, 225, [-52, 30]) +
      '<rect class="fig-primo-server-barra" x="172" y="233" width="4" height="4"/>' + riga(182, 238, [-84]);

    // il dock, la colonna di icone sul bordo destro dello schermo
    const dock =
      '<rect class="fig-primo-server-nero" x="318" y="62" width="20" height="20" style="stroke-width:1"/>' +
      '<circle cx="328" cy="72" r="5" fill="none" stroke="var(--fig-paper)" stroke-width="1.4"/>' +
      '<rect class="fig-primo-server-nero" x="318" y="84" width="20" height="20" style="stroke-width:1"/>' +
      '<circle cx="328" cy="94" r="6" fill="none" stroke="var(--fig-paper)" stroke-width="1.3"/>' +
      '<path d="M322 94h12M328 88c-3 3-3 9 0 12m0-12c3 3 3 9 0 12" fill="none" stroke="var(--fig-paper)" stroke-width="1.1"/>' +
      '<rect class="fig-primo-server-nero" x="318" y="106" width="20" height="20" style="stroke-width:1"/>' +
      '<path d="M323 110h7l3 3v9h-10Z" fill="var(--fig-paper)"/>' +
      '<rect class="fig-primo-server-nero" x="318" y="128" width="20" height="20" style="stroke-width:1"/>' +
      '<path d="M322 134l4 3-4 3M328 141h5" fill="none" stroke="var(--fig-paper)" stroke-width="1.4"/>';

    return '<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><clipPath id="' + clip + '"><rect x="72" y="58" width="268" height="200"/></clipPath></defs>' +
      '<rect class="fig-primo-server-sfondo" width="800" height="500"/>' +

      // scrivania
      '<rect class="fig-primo-server-piano" x="-4" y="352" width="808" height="60"/>' +
      '<rect class="fig-primo-server-fronte-tavolo" x="-4" y="412" width="808" height="92"/>' +
      '<path class="fig-primo-server-venatura" d="M470 432c60-6 120 4 190-2s90 6 140 0M500 470c50 4 110-6 170 0"/>' +

      // monitor in scala di grigi, su piedistallo
      '<path class="fig-primo-server-nero" d="M184 290H228L238 347H174Z"/>' +
      '<ellipse class="fig-primo-server-nero" cx="206" cy="352" rx="86" ry="11"/>' +
      '<rect class="fig-primo-server-nero" x="52" y="40" width="308" height="250" rx="12"/>' +
      '<rect x="64" y="51" width="284" height="214" rx="5" fill="none" stroke="var(--fig-paper)" stroke-width="1.2" opacity=".3"/>' +
      '<rect class="fig-primo-server-vetro" x="72" y="58" width="268" height="200"/>' +
      '<g clip-path="url(#' + clip + ')">' +
        menu + finestra + dock +
        // il puntatore sopra un collegamento
        '<path d="M232 160v15l4-3.6 3 6.6 3-1.4-3-6.4h5.4Z" fill="var(--fig-ink)" stroke="var(--fig-paper)" stroke-width="1.2" stroke-linejoin="round"/>' +
      '</g>' +

      // tastiera e mouse
      '<path class="fig-primo-server-nero" d="M100 375H318L333 404H85Z"/>' +
      '<path class="fig-primo-server-tasti" d="M100 383H318M96 390H322M93 397H326"/>' +
      '<path d="M85 404H333V410H85Z" class="fig-primo-server-nero"/>' +
      '<path class="fig-primo-server-filo" d="M362 381C362 368 344 364 326 377"/>' +
      '<path class="fig-primo-server-nero" d="M350 383Q362 377 374 383L378 402Q362 408 346 402Z"/>' +
      '<path d="M362 380V392" stroke="var(--fig-ink)" stroke-width="1.5"/>' +

      // il cubo
      '<path class="fig-primo-server-nero" d="M446 196H646L690 170H490Z"/>' +
      '<path class="fig-primo-server-luce" d="M446 196H646L690 170H490Z"/>' +
      '<path class="fig-primo-server-nero" d="M646 196L690 170V370L646 396Z"/>' +
      '<path class="fig-primo-server-ombra" d="M646 196L690 170V370L646 396Z"/>' +
      '<rect class="fig-primo-server-nero" x="446" y="196" width="200" height="200"/>' +
      '<path class="fig-primo-server-spigolo" d="M446 196H646L690 170H490ZM646 196L690 170V370L646 396"/>' +
      // vani delle unità a disco, in verticale
      '<rect x="556" y="306" width="30" height="78" rx="2" class="fig-primo-server-ombra" style="opacity:.32"/>' +
      '<rect x="556" y="306" width="30" height="78" rx="2" fill="none" stroke="var(--fig-ink)" stroke-width="1.5"/>' +
      '<rect x="568" y="316" width="6" height="50" rx="2" fill="var(--fig-ink)" opacity=".7"/>' +
      '<circle cx="571" cy="375" r="3" fill="var(--fig-metal)" stroke="var(--fig-ink)" stroke-width="1"/>' +
      '<rect x="598" y="306" width="30" height="78" rx="2" class="fig-primo-server-ombra" style="opacity:.18"/>' +
      '<rect x="598" y="306" width="30" height="78" rx="2" fill="none" stroke="var(--fig-ink)" stroke-width="1.5"/>' +
      // l'etichetta scritta a mano
      '<g transform="rotate(-2.5 546 246)">' +
        '<path class="fig-primo-server-ombra" d="M465 209H633V273L617 289H465Z"/>' +
        '<path class="fig-primo-server-etichetta" d="M462 206H630V270L614 286H462Z"/>' +
        '<path class="fig-primo-server-piega" d="M630 270L614 286L617 273Z"/>' +
        // tre righe inclinate e un po' storte, come scritte di fretta con un pennarello
        '<text class="fig-primo-server-mano fig-primo-server-mano-1" transform="translate(475 230) rotate(-1.2) skewX(-9)" textLength="132" lengthAdjust="spacingAndGlyphs">Questa macchina</text>' +
        '<text class="fig-primo-server-mano fig-primo-server-mano-1" transform="translate(479 252) rotate(.8) skewX(-9)" textLength="98" lengthAdjust="spacingAndGlyphs">è un server:</text>' +
        '<text class="fig-primo-server-mano fig-primo-server-mano-2" transform="translate(474 277) rotate(-1.6) skewX(-9)" textLength="136" lengthAdjust="spacingAndGlyphs">NON SPEGNERLA!</text>' +
        '<path class="fig-primo-server-sotto" d="M472 283q9-3.5 18 0t18 0 18 0 18 0 18 0 18 0 18 .4"/>' +
      '</g>' +

      // cavo di rete: richieste in arrivo, pagine in partenza
      '<path class="fig-primo-server-cavo" d="M676 351C690 360 690 384 712 384H806"/>' +
      '<circle cx="676" cy="351" r="4" fill="var(--fig-metal)" stroke="var(--fig-ink)" stroke-width="1.5"/>' +
      '<g class="fig-primo-server-rq"><circle class="fig-primo-server-rq-c" r="6.5"/></g>' +
      '<g class="fig-primo-server-pg"><path class="fig-primo-server-pg-c" d="M-7-9H3L7-5V9H-7Z"/><path class="fig-primo-server-pg-r" d="M-4-3H4M-4 1H4M-4 5H2"/></g>' +
      '<text class="fig-primo-server-t" x="740" y="372">rete</text>' +

      // didascalie con linee guida
      '<text class="fig-primo-server-t" x="374" y="120">il primo</text>' +
      '<text class="fig-primo-server-t" x="374" y="142">browser</text>' +
      '<path class="fig-primo-server-guida" d="M370 128H344L304 112"/><circle class="fig-primo-server-punto" cx="304" cy="112" r="3"/>' +
      '<text class="fig-primo-server-t" x="406" y="104">etichetta scritta a mano</text>' +
      '<path class="fig-primo-server-guida" d="M470 110L492 205"/><circle class="fig-primo-server-punto" cx="492" cy="205" r="3"/>' +
      '<text class="fig-primo-server-t" x="636" y="58">cubo di magnesio</text>' +
      '<text class="fig-primo-server-t" x="636" y="80">lato 30 cm</text>' +
      '<path class="fig-primo-server-guida" d="M662 88L640 182"/><circle class="fig-primo-server-punto" cx="640" cy="182" r="3"/>' +

      // legenda del cavo
      '<circle class="fig-primo-server-rq-c" cx="616" cy="442" r="6.5"/>' +
      '<text class="fig-primo-server-t2" x="632" y="448">richiesta in arrivo</text>' +
      '<g transform="translate(616 470)"><path class="fig-primo-server-pg-c" d="M-7-9H3L7-5V9H-7Z"/><path class="fig-primo-server-pg-r" d="M-4-3H4M-4 1H4M-4 5H2"/></g>' +
      '<text class="fig-primo-server-t2" x="632" y="476">pagina inviata</text>' +

      // cartiglio
      '<rect x="30" y="428" width="404" height="54" fill="var(--fig-paper)" stroke="var(--fig-ink)" stroke-width="2"/>' +
      '<path d="M30 452H434" stroke="var(--fig-ink)" stroke-width="1.5"/>' +
      '<text class="fig-primo-server-carti-1" x="42" y="446">IL PRIMO SERVER DEL WEB</text>' +
      '<text class="fig-primo-server-carti-2" x="42" y="473">CERN, Ginevra, 1990 · ricostruzione didattica</text>' +
      '</svg>';
  }

  root.ProgStoria.figura('primo-server', {
    alt: 'Disegno di una scrivania del CERN nel 1990. A sinistra un grande monitor in bianco e nero mostra il primo browser: un menu verticale in alto a sinistra, una finestra con il titolo «World Wide Web», righe di testo con alcune parole sottolineate, che sono i collegamenti, e una colonna di icone sul bordo destro. Davanti ci sono la tastiera e il mouse. A destra c\'è il computer, un cubo nero di 30 centimetri di lato, con un\'etichetta scritta a mano in rosso: «Questa macchina è un server: NON SPEGNERLA!». Dal cubo esce il cavo di rete: un pallino, una richiesta, arriva dal cavo e poco dopo una pagina riparte verso il resto del mondo.',
    css: cssServer,
    disegna(ctx) { return svgServer(ctx); },
  });

  /* ===================== ragnatela ===================== */

  // Geometria: una ragnatela ellittica centrata in (400, 240); le pagine stanno sui nodi.
  const CX = 400, CY = 240, RX = 380, RY = 230;
  const polare = (t, gradi) => {
    const a = gradi * Math.PI / 180;
    return { x: f1(CX + t * RX * Math.cos(a)), y: f1(CY - t * RY * Math.sin(a)) };
  };
  const PAGINE = {
    c: Object.assign(polare(0, 0), { tipo: 'testo', citta: 'GINEVRA', dove: 'sotto' }),
    ne: Object.assign(polare(0.5, 45), { tipo: 'immagine' }),
    nw: Object.assign(polare(0.5, 135), { tipo: 'elenco' }),
    sw: Object.assign(polare(0.5, 225), { tipo: 'immagine' }),
    se: Object.assign(polare(0.5, 315), { tipo: 'elenco' }),
    e: Object.assign(polare(0.87, 0), { tipo: 'testo', citta: 'STANFORD', dove: 'sotto' }),
    n: Object.assign(polare(0.87, 90), { tipo: 'testo', citta: 'PISA', dove: 'destra' }),
    w: Object.assign(polare(0.87, 180), { tipo: 'elenco', citta: 'CAGLIARI', dove: 'sotto' }),
    s: Object.assign(polare(0.87, 270), { tipo: 'testo', citta: 'TOKYO', dove: 'destra' }),
  };
  const CARTA = { w: 54, h: 66 };
  // il giro del punto luminoso (ogni passo è un collegamento) e gli altri collegamenti fermi
  const GIRO = ['c', 'ne', 'e', 'se', 's', 'sw', 'n', 'nw', 'c'];
  const ALTRI = [['n', 'ne'], ['sw', 'w'], ['w', 'nw'], ['c', 'sw']];
  const DURATA_GIRO = 11.2; // secondi
  const PASSO = 100 / (GIRO.length - 1); // % di un passo
  const VIAGGIO = PASSO * 0.6; // % in movimento, il resto è sosta sulla pagina

  const pct = (n) => f1(Math.max(0, Math.min(100, n))) + '%';

  // Opacità a gradini: [[percentuale, valore], ...] → regole di keyframes ordinate.
  function gradini(nome, punti) {
    const per = new Map();
    punti.forEach(([p, v]) => { per.set(pct(p), v); });
    const chiavi = Array.from(per.keys()).sort((a, b) => parseFloat(a) - parseFloat(b));
    if (chiavi[0] !== '0%') chiavi.unshift('0%');
    if (chiavi[chiavi.length - 1] !== '100%') chiavi.push('100%');
    const out = chiavi.map((k) => {
      let v = per.get(k);
      if (v === undefined) v = k === '0%' ? punti[0][1] : punti[punti.length - 1][1];
      return k + ' { opacity: ' + v + '; }';
    });
    return '@keyframes ' + nome + ' { ' + out.join(' ') + ' }';
  }

  function cssRagnatela() {
    const salti = GIRO.length - 1;
    // il punto: viaggio verso la pagina successiva, poi sosta
    const naviga = ['0% { transform: translate(' + PAGINE.c.x + 'px, ' + PAGINE.c.y + 'px); }'];
    for (let k = 0; k < salti; k++) {
      const p = PAGINE[GIRO[k + 1]];
      const tr = 'transform: translate(' + p.x + 'px, ' + p.y + 'px);';
      naviga.push(pct(k * PASSO + VIAGGIO) + ' { ' + tr + ' }');
      naviga.push(pct((k + 1) * PASSO) + ' { ' + tr + ' }');
    }
    let css = '@keyframes fig-ragnatela-naviga { ' + naviga.join(' ') + ' }\n';
    // ogni filo del giro si accende mentre il punto lo percorre
    for (let k = 0; k < salti; k++) {
      const a = k * PASSO;
      css += gradini('fig-ragnatela-filo-' + k, [[a, 0], [a + 1, 1], [a + VIAGGIO, 1], [a + VIAGGIO + 3, 0]]) + '\n';
    }
    // ogni pagina si illumina quando il punto ci arriva e finché riparte
    for (let k = 0; k < salti; k++) {
      const arrivo = k * PASSO + VIAGGIO;
      const partenza = (k + 1) * PASSO + 1.5;
      const nome = 'fig-ragnatela-luce-' + GIRO[k + 1];
      if (partenza > 100) {
        // la pagina di partenza: accesa alla fine del giro e all'inizio del successivo
        css += gradini(nome, [[0, 1], [partenza - 100, 1], [partenza - 100 + 2, 0], [arrivo - 1.5, 0], [arrivo, 1], [100, 1]]) + '\n';
      } else {
        css += gradini(nome, [[arrivo - 1.5, 0], [arrivo, 1], [partenza, 1], [partenza + 2, 0]]) + '\n';
      }
    }
    let animazioni = '.fig-ragnatela-punto { transform: translate(' + PAGINE.c.x + 'px, ' + PAGINE.c.y + 'px); animation: fig-ragnatela-naviga ' + DURATA_GIRO + 's ease-in-out infinite; }\n';
    for (let k = 0; k < salti; k++) animazioni += '.fig-ragnatela-filo-' + k + ' { animation: fig-ragnatela-filo-' + k + ' ' + DURATA_GIRO + 's linear infinite; }\n';
    Object.keys(PAGINE).forEach((id) => {
      animazioni += '.fig-ragnatela-luce-' + id + ' { animation: fig-ragnatela-luce-' + id + ' ' + DURATA_GIRO + 's linear infinite; }\n';
    });
    return `
    .fig-ragnatela-sfondo { fill: var(--fig-paper); }
    .fig-ragnatela-tela { fill: none; stroke: var(--fig-line); stroke-width: 1.2; opacity: .5; }
    .fig-ragnatela-link { fill: none; stroke: var(--cap); stroke-width: 2.6; stroke-linecap: round; }
    .fig-ragnatela-freccia { fill: var(--cap); }
    .fig-ragnatela-acceso { fill: none; stroke: var(--fig-warm); stroke-width: 7; stroke-linecap: round; opacity: 0; }
    .fig-ragnatela-carta { fill: var(--fig-paper); stroke: var(--fig-ink); stroke-width: 2; stroke-linejoin: round; }
    .fig-ragnatela-piega { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1.5; stroke-linejoin: round; }
    .fig-ragnatela-titolo { fill: var(--fig-ink); }
    .fig-ragnatela-riga { fill: var(--fig-line); }
    .fig-ragnatela-rimando { fill: var(--cap); }
    .fig-ragnatela-foto { fill: var(--fig-1); stroke: var(--fig-ink); stroke-width: 1.2; }
    .fig-ragnatela-monte { fill: var(--fig-3); }
    .fig-ragnatela-sole { fill: var(--fig-warm); }
    .fig-ragnatela-luce { fill: none; stroke: var(--fig-warm); stroke-width: 4; opacity: 0; }
    .fig-ragnatela-alone { fill: var(--fig-warm); opacity: .3; }
    .fig-ragnatela-nucleo { fill: var(--fig-warm); stroke: var(--fig-paper); stroke-width: 2.5; }
    .fig-ragnatela-citta { font: 800 16px var(--mono, monospace); fill: var(--fig-ink); letter-spacing: .08em; }
    .fig-ragnatela-t { font: 700 18px var(--font, sans-serif); fill: var(--fig-ink); }
    .fig-ragnatela-guida { fill: none; stroke: var(--fig-ink); stroke-width: 1.4; }
    .fig-ragnatela-punto-g { fill: var(--fig-ink); }
    ${css}
    ${animazioni}
    @media (prefers-reduced-motion: reduce) {
      .fig-ragnatela-punto, .fig-ragnatela-acceso, .fig-ragnatela-luce { animation: none !important; }
      .fig-ragnatela-acceso { opacity: .55; }
      .fig-ragnatela-luce-c { opacity: 1; }
    }
  `;
  }

  // La tela di fondo: raggi e giri leggermente incurvati verso il centro, come in una vera ragnatela.
  function tela() {
    const raggi = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
      const p = polare(1.35, i * 360 / n);
      raggi.push('M' + CX + ' ' + CY + 'L' + p.x + ' ' + p.y);
    }
    const giri = [0.18, 0.34, 0.5, 0.68, 0.87, 1.07].map((t) => {
      let d = '';
      for (let i = 0; i <= n; i++) {
        const p = polare(t, i * 360 / n);
        if (i === 0) { d += 'M' + p.x + ' ' + p.y; continue; }
        const m = polare(t * 0.955, (i - 0.5) * 360 / n);
        d += 'Q' + m.x + ' ' + m.y + ' ' + p.x + ' ' + p.y;
      }
      return d;
    });
    return '<path class="fig-ragnatela-tela" d="' + raggi.join('') + giri.join('') + '"/>';
  }

  function carta(id) {
    const p = PAGINE[id];
    const x = p.x - CARTA.w / 2, y = p.y - CARTA.h / 2, w = CARTA.w, h = CARTA.h;
    const r = (cls, rx, ry, rw, rh) => '<rect class="fig-ragnatela-' + cls + '" x="' + f1(x + rx) + '" y="' + f1(y + ry) + '" width="' + rw + '" height="' + rh + '" rx="1"/>';
    let dentro = r('titolo', 7, 9, 26, 4.5);
    if (p.tipo === 'immagine') {
      dentro += '<rect class="fig-ragnatela-foto" x="' + f1(x + 7) + '" y="' + f1(y + 19) + '" width="40" height="22"/>' +
        '<path class="fig-ragnatela-monte" d="M' + f1(x + 8) + ' ' + f1(y + 40) + 'l11-12 7 7 6-5 14 10Z"/>' +
        '<circle class="fig-ragnatela-sole" cx="' + f1(x + 39) + '" cy="' + f1(y + 25) + '" r="3.2"/>' +
        r('riga', 7, 47, 40, 3) + r('rimando', 7, 54, 24, 3.5);
    } else if (p.tipo === 'elenco') {
      dentro += r('riga', 7, 19, 40, 3);
      for (let i = 0; i < 3; i++) dentro += r('titolo', 8, 28 + i * 9, 3.5, 3.5) + r(i === 1 ? 'riga' : 'rimando', 15, 28 + i * 9, [26, 30, 22][i], 3.5);
      dentro += r('riga', 7, 56, 32, 3);
    } else {
      dentro += r('riga', 7, 19, 40, 3) + r('riga', 7, 26, 36, 3) + r('rimando', 7, 33, 22, 3.5) + r('riga', 7, 40, 40, 3) +
        r('riga', 7, 47, 30, 3) + r('rimando', 22, 54, 25, 3.5) + r('riga', 7, 54, 11, 3);
    }
    return '<path class="fig-ragnatela-carta" d="M' + f1(x) + ' ' + f1(y) + 'H' + f1(x + w - 12) + 'L' + f1(x + w) + ' ' + f1(y + 12) + 'V' + f1(y + h) + 'H' + f1(x) + 'Z"/>' +
      '<path class="fig-ragnatela-piega" d="M' + f1(x + w - 12) + ' ' + f1(y) + 'V' + f1(y + 12) + 'H' + f1(x + w) + 'Z"/>' +
      dentro +
      '<rect class="fig-ragnatela-luce fig-ragnatela-luce-' + id + '" x="' + f1(x - 6) + '" y="' + f1(y - 6) + '" width="' + (w + 12) + '" height="' + (h + 12) + '" rx="7"/>';
  }

  // Punta di freccia sul bordo della pagina di arrivo.
  function freccia(da, a) {
    const A = PAGINE[da], B = PAGINE[a];
    const dx = A.x - B.x, dy = A.y - B.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const s = Math.min((CARTA.w / 2 + 6) / Math.abs(dx || 1e-6), (CARTA.h / 2 + 6) / Math.abs(dy || 1e-6));
    const tx = B.x + dx * s, ty = B.y + dy * s;
    const bx = tx + ux * 13, by = ty + uy * 13;
    return '<path class="fig-ragnatela-freccia" d="M' + f1(tx) + ' ' + f1(ty) + 'L' + f1(bx - uy * 6) + ' ' + f1(by + ux * 6) + 'L' + f1(bx + uy * 6) + ' ' + f1(by - ux * 6) + 'Z"/>';
  }

  function svgRagnatela() {
    const collegamenti = [];
    for (let k = 0; k < GIRO.length - 1; k++) collegamenti.push([GIRO[k], GIRO[k + 1]]);
    const tutti = collegamenti.concat(ALTRI);
    const linea = (da, a, cls) => '<path class="' + cls + '" d="M' + PAGINE[da].x + ' ' + PAGINE[da].y + 'L' + PAGINE[a].x + ' ' + PAGINE[a].y + '"/>';
    const citta = Object.keys(PAGINE).filter((id) => PAGINE[id].citta).map((id) => {
      const p = PAGINE[id];
      return p.dove === 'sotto'
        ? '<text class="fig-ragnatela-citta" x="' + p.x + '" y="' + f1(p.y + CARTA.h / 2 + 22) + '" text-anchor="middle">' + p.citta + '</text>'
        : '<text class="fig-ragnatela-citta" x="' + f1(p.x + CARTA.w / 2 + 10) + '" y="' + f1(p.y + 6) + '">' + p.citta + '</text>';
    }).join('');
    // punto d'appoggio della didascalia «collegamento» sul filo e → se
    const E = PAGINE.e, SE = PAGINE.se;
    const ax = 650, ay = f1(E.y + (SE.y - E.y) * (E.x - ax) / (E.x - SE.x));

    return '<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="fig-ragnatela-sfondo" width="800" height="500"/>' +
      tela() +
      tutti.map(([da, a]) => linea(da, a, 'fig-ragnatela-link')).join('') +
      collegamenti.map(([da, a], k) => linea(da, a, 'fig-ragnatela-acceso fig-ragnatela-filo-' + k)).join('') +
      Object.keys(PAGINE).map(carta).join('') +
      tutti.map(([da, a]) => freccia(da, a)).join('') +
      citta +
      // didascalie
      '<text class="fig-ragnatela-t" x="30" y="100">pagina</text>' +
      '<path class="fig-ragnatela-guida" d="M96 106H128L236 150"/><circle class="fig-ragnatela-punto-g" cx="236" cy="150" r="3"/>' +
      '<text class="fig-ragnatela-t" x="604" y="420">collegamento</text>' +
      '<path class="fig-ragnatela-guida" d="M664 402L' + ax + ' ' + f1(ay + 4) + '"/><circle class="fig-ragnatela-punto-g" cx="' + ax + '" cy="' + ay + '" r="3"/>' +
      // il punto luminoso che naviga
      '<g class="fig-ragnatela-punto"><circle class="fig-ragnatela-alone" r="14"/><circle class="fig-ragnatela-nucleo" r="7"/></g>' +
      '</svg>';
  }

  root.ProgStoria.figura('ragnatela', {
    alt: 'Nove pagine disegnate come fogli con l\'angolo piegato, sparse su una ragnatela: una al centro, quattro intorno e quattro più lontane, con i nomi delle città dei loro server (Ginevra, Stanford, Pisa, Cagliari, Tokyo). Frecce colorate, i collegamenti, vanno da una pagina all\'altra, anche fra pagine lontane. Un punto luminoso parte dalla pagina centrale e salta da un collegamento all\'altro, facendo il giro della ragnatela; ogni pagina che raggiunge si illumina.',
    css: cssRagnatela(),
    disegna() { return svgRagnatela(); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
