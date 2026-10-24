/*
 * Laboratorio «Il telaio Jacquard» (capitolo 1, Le schede che comandano).
 *
 * Una catena di schede da 16 posizioni comanda 16 fili d'ordito. Dove la scheda ha un foro
 * l'ago passa, il suo uncino resta sulla barra che sale e il filo d'ordito si alza: la navetta
 * passa sotto quel filo e la cella del tessuto prende il colore dell'ordito (oro). Dove la
 * scheda è piena l'ago si ferma, l'uncino viene spinto via e resta in vista la trama (azzurro).
 *
 * Colori fissi in tutto il laboratorio: oro = foro = filo d'ordito alzato; azzurro = trama e
 * navetta; verde = scheda e riga in lavorazione; rosa = ago bloccato.
 *
 * La logica (disegni, lettura delle schede, tessitura) è pura ed è provata in Node:
 *   node --test sections/programmazione/test/jacquard.test.js
 */
(function (root) {
  'use strict';

  const COLONNE = 16;

  /* Disegni come appaiono sul tessuto finito, dalla riga in alto a quella in basso.
     '#' = foro nella scheda = filo d'ordito alzato = cella color oro. */
  const DISEGNI = {
    ciao: {
      nome: 'CIAO',
      righe: [
        '################',
        '................',
        '.###.###..#..###',
        '.#....#..#.#.#.#',
        '.#....#..###.#.#',
        '.#....#..#.#.#.#',
        '.###.###.#.#.###',
        '................',
        '################',
      ],
    },
    rombo: {
      nome: 'Rombo',
      righe: [
        '.......##.......',
        '......####......',
        '.....##..##.....',
        '....##....##....',
        '...##..##..##...',
        '..##..####..##..',
        '..##..####..##..',
        '...##..##..##...',
        '....##....##....',
        '.....##..##.....',
        '......####......',
        '.......##.......',
      ],
    },
    scacchiera: {
      nome: 'Scacchiera',
      righe: [
        '##..##..##..##..',
        '##..##..##..##..',
        '..##..##..##..##',
        '..##..##..##..##',
        '##..##..##..##..',
        '##..##..##..##..',
        '..##..##..##..##',
        '..##..##..##..##',
        '##..##..##..##..',
        '##..##..##..##..',
        '..##..##..##..##',
        '..##..##..##..##',
      ],
    },
    onde: {
      nome: 'Onde',
      righe: [
        '......#.......#.',
        '.....###.....###',
        '#...##.##...##.#',
        '##.##...##.##...',
        '.###.....###....',
        '..#.......#.....',
        '......#.......#.',
        '.....###.....###',
        '#...##.##...##.#',
        '##.##...##.##...',
        '.###.....###....',
        '..#.......#.....',
      ],
    },
  };
  const ORDINE = ['ciao', 'rombo', 'scacchiera', 'onde'];

  /* ---------- logica pura ---------- */

  function daTesto(riga) {
    const s = String(riga || '');
    const out = [];
    for (let c = 0; c < COLONNE; c++) out.push(s[c] === '#');
    return out;
  }

  function inTesto(scheda) {
    return scheda.map((f) => (f ? '#' : '.')).join('');
  }

  // Il mazzo nell'ordine in cui il telaio lo legge. Il tessuto cresce dal basso:
  // la prima scheda tessuta diventa la riga più in basso del disegno.
  function mazzo(id) {
    const d = DISEGNI[id];
    if (!d) return null;
    return d.righe.slice().reverse().map(daTesto);
  }

  // Che cosa succede, colonna per colonna, quando il telaio legge una scheda.
  function leggi(scheda) {
    return scheda.map((foro) => ({
      foro: !!foro,
      ago: foro ? 'passa' : 'bloccato',
      uncino: foro ? 'alzato' : 'fermo',
      cella: foro ? 'ordito' : 'trama',
    }));
  }

  function riga(scheda) {
    return scheda.map((f) => (f ? 'ordito' : 'trama'));
  }

  function nuovoTelaio(schede) {
    return { schede: schede.map((s) => s.slice()), prossima: 0, tessuto: [] };
  }

  function finito(stato) {
    return stato.prossima >= stato.schede.length;
  }

  // Un colpo di telaio: legge la prossima scheda e aggiunge una riga al tessuto.
  function passo(stato) {
    if (finito(stato)) return stato;
    return {
      schede: stato.schede,
      prossima: stato.prossima + 1,
      tessuto: stato.tessuto.concat([riga(stato.schede[stato.prossima])]),
    };
  }

  function tessiTutto(schede) {
    let st = nuovoTelaio(schede);
    while (!finito(st)) st = passo(st);
    return st.tessuto;
  }

  // Il tessuto come lo vedi, dalla riga in alto a quella in basso.
  function disegno(tessuto) {
    return tessuto.slice().reverse().map((r) => r.map((c) => (c === 'ordito' ? '#' : '.')).join(''));
  }

  function inverti(scheda) {
    return scheda.map((f) => !f);
  }

  function conta(scheda) {
    return scheda.filter(Boolean).length;
  }

  function colonneForate(scheda) {
    const out = [];
    scheda.forEach((f, i) => { if (f) out.push(i + 1); });
    return out;
  }

  function elenco(lista) {
    if (lista.length <= 1) return lista.join('');
    return lista.slice(0, -1).join(', ') + ' e ' + lista[lista.length - 1];
  }

  // Frase in italiano sui fori di una scheda (singolare e plurale corretti).
  function descrivi(scheda) {
    const n = conta(scheda);
    if (n === 0) return 'Nessun foro: nessun filo d\'ordito si alzerà.';
    if (n === COLONNE) return 'Tutti i 16 fori sono aperti: si alzeranno tutti i fili d\'ordito.';
    const col = colonneForate(scheda);
    return (n === 1 ? 'Un foro, nella colonna ' : n + ' fori, nelle colonne ') + elenco(col) + '.';
  }

  const Logica = {
    COLONNE: COLONNE,
    DISEGNI: DISEGNI,
    ORDINE: ORDINE,
    daTesto: daTesto,
    inTesto: inTesto,
    mazzo: mazzo,
    leggi: leggi,
    riga: riga,
    nuovoTelaio: nuovoTelaio,
    finito: finito,
    passo: passo,
    tessiTutto: tessiTutto,
    disegno: disegno,
    inverti: inverti,
    conta: conta,
    colonneForate: colonneForate,
    descrivi: descrivi,
  };

  /* ---------- aspetto ---------- */

  const css = `
.lab-jacquard { display: grid; }
.lab-jacquard-barra .pg-btn[aria-pressed="true"] {
  background: color-mix(in srgb, var(--lab-bright) 14%, var(--lab-raised)); color: #fff; box-shadow: inset 0 -3px 0 var(--lab-bright);
}
.lab-jacquard-contatore {
  margin: 0; padding: 7px 12px; border-radius: 8px; border: 1px solid var(--lab-line); background: var(--lab-panel);
  font: 700 .9rem var(--mono); color: var(--lab-bright); font-variant-numeric: tabular-nums; white-space: nowrap;
}
.lab-jacquard-contatore b { color: var(--trace-1); font-weight: 800; }
.lab-jacquard .pg-btn[aria-disabled="true"] { opacity: .42; cursor: not-allowed; }
.lab-jacquard .pg-btn[aria-disabled="true"]:hover { color: var(--lab-text); border-color: var(--lab-line); }
.lab-jacquard .pg-btn--primario[aria-disabled="true"]:hover { color: #04150d; border-color: transparent; filter: none; }
.lab-jacquard .pg-btn[aria-disabled="true"]:active { transform: none; }

.lab-jacquard-vetrina {
  position: relative; padding: 14px 18px 12px; border-bottom: 1px solid var(--lab-line);
  background: radial-gradient(120% 70% at 55% -12%, rgba(255, 214, 150, .09), transparent 62%), var(--lab-bg);
}
.lab-jacquard-svg { display: block; width: 100%; height: auto; max-height: 560px; margin: 0 auto; }

.lab-jacquard-cassa { fill: #0e1714; stroke: #2c3d37; stroke-width: 1.5; }
.lab-jacquard-tavola { stroke: #3a4f48; stroke-width: 3; stroke-linecap: round; }
.lab-jacquard-slot { fill: rgba(255, 255, 255, .015); stroke: #3a4f48; stroke-width: 1.2; stroke-dasharray: 4 4; }
.lab-jacquard-carta { fill: #efe3c4; stroke: #a48d5c; stroke-width: 1; }
.lab-jacquard-foro { fill: var(--trace-2); stroke: #4d3511; stroke-width: 1; }
.lab-jacquard-segno { fill: #bba77a; }
.lab-jacquard-carta-catena.is-letta { opacity: .34; }
.lab-jacquard-lacci { stroke: #8e7d55; stroke-width: 1.4; }
.lab-jacquard-ago { fill: #8f9ca4; transition: fill var(--pg-dur-veloce) ease; }
.lab-jacquard-ago.is-passa { fill: var(--trace-2); }
.lab-jacquard-ago.is-bloccato { fill: var(--trace-4); }
.lab-jacquard-uncino-ferro { fill: none; stroke: #b8c3c9; stroke-width: 2; stroke-linecap: round; transition: stroke var(--pg-dur-veloce) ease; }
.lab-jacquard-uncino.is-alzato .lab-jacquard-uncino-ferro { stroke: var(--trace-2); }
.lab-jacquard-uncino.is-spinto { opacity: .5; }
.lab-jacquard-corda { stroke: #66757c; stroke-width: 1; }
.lab-jacquard-occhio { fill: var(--lab-bg); stroke: #a3afb6; stroke-width: 1.3; }
.lab-jacquard-uncino.is-alzato .lab-jacquard-occhio { stroke: var(--trace-2); }
.lab-jacquard-barra-ottone { stroke: #6e4f1c; stroke-width: 1; }
.lab-jacquard-filo { stroke: color-mix(in srgb, var(--trace-2) 46%, transparent); stroke-width: 2; transition: stroke var(--pg-dur-veloce) ease; }
.lab-jacquard-filo.is-alzato { stroke: var(--trace-2); stroke-width: 3; }
.lab-jacquard-area { fill: rgba(255, 255, 255, .012); stroke: #24332e; stroke-width: 1; stroke-dasharray: 2 5; }
.lab-jacquard-cella { opacity: 0; stroke: rgba(0, 0, 0, .28); stroke-width: .6; transition: opacity var(--pg-dur-veloce) ease; }
.lab-jacquard-cella.is-tessuta { opacity: 1; }
.lab-jacquard-pt-oro { fill: var(--trace-2); }
.lab-jacquard-pt-oro-filo { fill: rgba(110, 62, 0, .3); }
.lab-jacquard-pt-blu { fill: #1d4c6a; }
.lab-jacquard-pt-blu-filo { fill: rgba(150, 215, 255, .22); }
.lab-jacquard-trama { stroke: var(--trace-3); stroke-width: 3; stroke-linecap: round; }
.lab-jacquard-navetta-corpo { fill: #c99a5b; stroke: #3b2610; stroke-width: 1.5; }
.lab-jacquard-navetta-spola { fill: var(--trace-3); }
.lab-jacquard-evidenza { fill: none; stroke: var(--trace-1); stroke-width: 2; }
.lab-jacquard-ponte { stroke: var(--trace-1); stroke-width: 1.5; stroke-dasharray: 3 4; }
.lab-jacquard-fantasma .lab-jacquard-carta { stroke: var(--trace-1); stroke-width: 2; vector-effect: non-scaling-stroke; }
.lab-jacquard-riflesso { fill: #fff; opacity: .022; }
.lab-jacquard-etichetta {
  fill: var(--lab-text); font-family: var(--font); font-weight: 600; font-size: var(--lab-jacquard-fs, 14px);
  paint-order: stroke; stroke: var(--lab-bg); stroke-width: 4px; stroke-linejoin: round;
}
.lab-jacquard-guida { stroke: #3c524a; stroke-width: 1; }

.lab-jacquard-fasi {
  list-style: none; margin: 12px auto 2px; padding: 0; max-width: 560px;
  display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));
}
.lab-jacquard-fasi li {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 5px; text-align: center;
  font-size: .8125rem; font-weight: 600; color: var(--lab-text); opacity: .7;
  transition: opacity var(--pg-dur-veloce) ease, color var(--pg-dur-veloce) ease;
}
.lab-jacquard-fasi li + li::before {
  content: ""; position: absolute; top: 11px; right: calc(50% + 16px); width: calc(100% - 32px); height: 2px;
  border-radius: 1px; background: var(--lab-line); transition: background-color var(--pg-dur-normale) ease;
}
.lab-jacquard-fasi li.is-fatta + li::before { background: color-mix(in srgb, var(--trace-1) 70%, transparent); }
.lab-jacquard-fase-num {
  width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center;
  font: 800 .8125rem/1 var(--mono); border: 1.5px solid var(--lab-line); background: var(--lab-panel); color: var(--lab-text);
  transition: background-color var(--pg-dur-veloce) ease, color var(--pg-dur-veloce) ease, border-color var(--pg-dur-veloce) ease, box-shadow var(--pg-dur-veloce) ease;
}
.lab-jacquard-fasi li.is-fatta { opacity: .9; }
.lab-jacquard-fasi li.is-fatta .lab-jacquard-fase-num { border-color: var(--trace-1); color: var(--trace-1); }
.lab-jacquard-fasi li[aria-current="step"] { opacity: 1; color: var(--lab-bright); }
.lab-jacquard-fasi li[aria-current="step"] .lab-jacquard-fase-num {
  background: var(--trace-1); border-color: transparent; color: #04150d;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--trace-1) 22%, transparent);
}

.lab-jacquard-azioni { border-bottom: 1px solid var(--lab-line); }

.lab-jacquard-editor { display: grid; gap: 10px; padding: 14px 18px 16px; }
.lab-jacquard-ed-testa { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 14px; }
.lab-jacquard-ed-titolo { margin: 0; font-weight: 700; color: var(--lab-bright); font-size: 1rem; }
.lab-jacquard-ed-titolo span { font: 600 .8125rem var(--mono); color: var(--trace-1); margin-left: 8px; }
.lab-jacquard-scheda {
  overflow-x: auto; padding: 8px; border-radius: 10px;
  background: linear-gradient(180deg, #f2e8cc, #e4d4aa);
  box-shadow: inset 0 0 0 1px rgba(80, 60, 20, .35), 0 12px 26px -16px rgba(0, 0, 0, .9);
}
.lab-jacquard-fori { display: grid; grid-template-columns: repeat(16, minmax(40px, 1fr)); gap: 2px; }
.lab-jacquard-foro-btn {
  min-width: 40px; min-height: 54px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  padding: 4px 0; margin: 0; border: 0; border-radius: 8px; background: transparent; cursor: pointer;
  color: #5a4823; font: 700 .8125rem/1 var(--mono);
}
.lab-jacquard-foro-btn:hover { background: rgba(92, 70, 30, .08); }
.lab-jacquard-foro-btn:focus-visible { outline: 3px solid #0b7a4e; outline-offset: 0; }
.lab-jacquard-buco {
  width: 26px; height: 26px; border-radius: 50%; border: 2px dashed rgba(92, 72, 35, .6); background: rgba(255, 255, 255, .28);
  transition: background-color var(--pg-dur-veloce) ease, border-color var(--pg-dur-veloce) ease, box-shadow var(--pg-dur-veloce) ease, transform var(--pg-dur-veloce) var(--pg-ease-bounce);
}
.lab-jacquard-foro-btn[aria-pressed="true"] .lab-jacquard-buco {
  border: 2px solid #3d2a0a;
  background: radial-gradient(circle at 50% 42%, #fff4c9 0, var(--trace-2) 46%, #b47a17 100%);
  box-shadow: inset 0 2px 3px rgba(0, 0, 0, .45), 0 0 12px rgba(255, 192, 77, .55);
}
.lab-jacquard-foro-btn:active .lab-jacquard-buco { transform: scale(.88); }
.lab-jacquard-foro-btn[aria-disabled="true"] { cursor: not-allowed; }
.lab-jacquard-foro-btn[aria-disabled="true"] .lab-jacquard-buco { opacity: .6; }
.lab-jacquard-aiuto { margin: 0; font-size: .875rem; line-height: 1.5; color: var(--lab-text); }
.lab-jacquard-aiuto strong { color: var(--lab-bright); }
.lab-jacquard-oro { color: var(--trace-2); font-weight: 700; }
.lab-jacquard-blu { color: var(--trace-3); font-weight: 700; }
.lab-jacquard-fine {
  margin: 0; padding: 14px 16px; border-radius: 10px; border: 1px dashed color-mix(in srgb, var(--trace-1) 55%, transparent);
  background: color-mix(in srgb, var(--trace-1) 6%, transparent); color: var(--lab-text); line-height: 1.55;
}
.lab-jacquard-fine strong { color: var(--lab-bright); }
.lab-jacquard-spiega { min-height: 7.6em; }
.lab-jacquard-spiega .lab-jacquard-nota { font-size: .875rem; opacity: .82; margin-top: .5em; }

@media (max-width: 640px) {
  .lab-jacquard-vetrina { padding: 10px 10px 10px; }
  .lab-jacquard-editor { padding: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .lab-jacquard *, .lab-jacquard *::before { transition: none !important; }
}
`;

  /* ---------- scena ---------- */

  const FASI = [
    { id: 'scheda', nome: 'Scheda' },
    { id: 'aghi', nome: 'Aghi' },
    { id: 'uncini', nome: 'Uncini' },
    { id: 'navetta', nome: 'Navetta' },
    { id: 'riga', nome: 'Riga' },
  ];

  const SOLLEVA = 14;   // di quanto sale la barra (e con lei gli uncini agganciati)
  const AGO_PASSA = 20; // corsa dell'ago che trova il foro: la punta entra nella scheda
  const AGO_FERMO = 9;  // corsa dell'ago che trova la scheda piena: si ferma contro la carta

  // Due impaginazioni dello stesso telaio: larga (sopra i 560 px) e stretta (telefoni).
  function geometria(largo) {
    const g = largo
      ? { largo: true, W: 880, x0: 248, cw: 30, catX: 20, catW: 172, rowH: 24, navL: 22, navA: 7, spinta: 8, rForo: 7 }
      : { largo: false, W: 400, x0: 118, cw: 15.5, catX: 6, catW: 80, rowH: 18, navL: 14, navA: 5, spinta: 5, rForo: 4.2 };
    g.righe = 12;
    g.testaY = 10; g.testaH = 140;
    g.schedaY = 20; g.schedaH = 22;
    g.agoY = 52; g.agoH = 28;
    g.uncY = 86; g.uncH = 40;
    g.barraY = 112;
    g.occhioY = 166;
    g.yT = 190;
    g.x1 = g.x0 + COLONNE * g.cw;
    g.yB = g.yT + g.righe * g.rowH;
    g.H = g.yB + 14;
    g.parcheggio = [g.x0 - (largo ? 26 : 16), g.x1 + (largo ? 26 : 16)];
    g.etX = g.x0 - (largo ? 28 : 26);
    return g;
  }
  const xc = (g, c) => g.x0 + g.cw * (c + 0.5);
  const rigaY = (g, r) => g.yB - (r + 1) * g.rowH;
  const fra = (a, b, t) => a + (b - a) * t;
  const limita = (v) => Math.max(0, Math.min(1, v));
  const r2 = (v) => Math.round(v * 100) / 100;

  function monta(el, ctx) {
    const { h, s } = ctx;
    const ns = ctx.uid('jq');
    const D = ctx.DURATA;

    /* ---------- stato ---------- */
    let disegnoId = 'ciao';
    let st = nuovoTelaio(mazzo(disegnoId));
    let modificate = new Set();
    let occupato = false;      // un'animazione è in corso
    let inCorsa = false;       // «Tessi tutto» attivo
    let fermaRichiesta = false;
    let gen = 0;               // cresce a ogni nuovo mazzo o tessuto: le animazioni vecchie non toccano il nuovo stato
    let layout = null;
    let G = null;
    let scena = null;
    let colonneEd = 0;
    let faseAttiva = null;

    /* ---------- struttura ---------- */
    const idEt = ctx.uid('jq-et');
    const idAiuto = ctx.uid('jq-aiuto');
    const presetBtn = ORDINE.map((id) => h('button', {
      type: 'button', class: 'pg-btn', 'data-disegno': id, 'aria-pressed': id === disegnoId ? 'true' : 'false',
      onclick: () => scegli(id),
    }, DISEGNI[id].nome));
    const contatore = h('p', { class: 'lab-jacquard-contatore', 'aria-live': 'off' });
    const barra = h('div', { class: 'pg-strumenti lab-jacquard-barra' },
      h('span', { class: 'pg-etichetta', id: idEt }, 'Disegno'),
      h('div', { class: 'pg-gruppo', role: 'group', 'aria-labelledby': idEt }, presetBtn),
      h('span', { class: 'pg-spazio' }),
      contatore);

    const svg = s('svg', { class: 'lab-jacquard-svg', role: 'img' });
    const fasiLi = FASI.map((f, i) => h('li', { 'data-fase': f.id },
      h('span', { class: 'lab-jacquard-fase-num', 'aria-hidden': 'true' }, String(i + 1)),
      h('span', null, f.nome)));
    const fasi = h('ol', { class: 'lab-jacquard-fasi', 'aria-label': 'Le cinque fasi di un colpo di telaio' }, fasiLi);
    const vetrina = h('div', { class: 'lab-jacquard-vetrina' }, svg, fasi);

    const bRiga = h('button', { type: 'button', class: 'pg-btn pg-btn--primario', onclick: () => { if (!disattivo(bRiga)) esegui(false); } }, 'Tessi una riga');
    const bTutto = h('button', { type: 'button', class: 'pg-btn', onclick: clicTutto }, '▶ Tessi tutto');
    const bNuovo = h('button', { type: 'button', class: 'pg-btn', onclick: () => { if (!disattivo(bNuovo)) nuovoTessuto(); } }, '↺ Nuovo tessuto');
    const azioni = h('div', { class: 'pg-strumenti lab-jacquard-azioni' }, bRiga, bTutto, bNuovo);

    const fori = [];
    for (let c = 0; c < COLONNE; c++) {
      fori.push(h('button', {
        type: 'button', class: 'lab-jacquard-foro-btn', 'data-col': String(c), 'aria-pressed': 'false',
        'aria-label': 'Foro ' + (c + 1), tabindex: c === 0 ? '0' : '-1',
        onclick: () => cambiaForo(c),
        onfocus: () => scegliTab(c),
      }, h('span', { class: 'lab-jacquard-buco', 'aria-hidden': 'true' }), h('span', { 'aria-hidden': 'true' }, String(c + 1))));
    }
    const griglia = h('div', { class: 'lab-jacquard-fori', role: 'toolbar', 'aria-label': 'Fori della prossima scheda', 'aria-describedby': idAiuto }, fori);
    griglia.addEventListener('keydown', tastiFori);
    const cartoncino = h('div', { class: 'lab-jacquard-scheda' }, griglia);
    const titoloEd = h('p', { class: 'lab-jacquard-ed-titolo' });
    const bInverti = h('button', { type: 'button', class: 'pg-btn', onclick: () => { if (!disattivo(bInverti)) invertiScheda(); } }, '⇄ Inverti i fori');
    const aiuto = h('p', { class: 'lab-jacquard-aiuto', id: idAiuto },
      'Tocca un foro per aprirlo o chiuderlo. Ogni foro alza il filo d\'ordito della sua colonna: lì il tessuto sarà ',
      h('span', { class: 'lab-jacquard-oro' }, 'oro'), '; dove la scheda è piena resta in vista la trama, ',
      h('span', { class: 'lab-jacquard-blu' }, 'azzurra'), '. Da tastiera: frecce per spostarti, Invio o Spazio per forare.');
    const fine = h('p', { class: 'lab-jacquard-fine', hidden: true });
    const editor = h('div', { class: 'lab-jacquard-editor' },
      h('div', { class: 'lab-jacquard-ed-testa' }, titoloEd, bInverti),
      cartoncino, aiuto, fine);

    const spiega = h('div', { class: 'pg-spiega lab-jacquard-spiega' });

    el.append(h('div', { class: 'lab-jacquard' }, barra, vetrina, azioni, editor, spiega));

    /* ---------- testo ---------- */

    function racconta(...paragrafi) {
      spiega.replaceChildren(...paragrafi.filter(Boolean).map((p) => (typeof p === 'string' ? h('p', null, ctx.inline(p)) : p)));
    }
    function nota(testo) {
      return h('p', { class: 'lab-jacquard-nota' }, ctx.inline(testo));
    }
    function nomeMazzo() {
      return '«' + DISEGNI[disegnoId].nome + '»';
    }
    function benvenuto() {
      const N = st.schede.length;
      racconta('**Mazzo ' + nomeMazzo() + ': ' + N + ' schede, una per ogni riga del tessuto.** Ogni foro alza il filo d\'ordito della sua colonna. Premi **Tessi una riga** e guarda il telaio leggere la scheda 1.',
        nota('È uno schema: nel telaio vero gli aghi sono orizzontali e il tessuto finito si avvolge su un rullo. Qui il tessuto cresce verso l\'alto, così ogni riga resta accanto alla sua scheda.'));
    }

    /* ---------- costruzione della scena SVG ---------- */

    function costruisci() {
      const g = geometria(layout === 'largo');
      G = g;
      const N = st.schede.length;
      const id = (n) => ns + '-' + n;
      svg.replaceChildren();
      svg.setAttribute('viewBox', '0 0 ' + g.W + ' ' + g.H);
      svg.setAttribute('width', String(g.W));
      svg.setAttribute('height', String(g.H));

      svg.append(s('defs', null,
        s('radialGradient', { id: id('luce'), cx: '0.56', cy: '-0.06', r: '0.95' },
          s('stop', { offset: '0', 'stop-color': '#ffd99a', 'stop-opacity': '0.2' }),
          s('stop', { offset: '0.55', 'stop-color': '#ffd99a', 'stop-opacity': '0.05' }),
          s('stop', { offset: '1', 'stop-color': '#ffd99a', 'stop-opacity': '0' })),
        s('linearGradient', { id: id('ottone'), x1: '0', y1: '0', x2: '0', y2: '1' },
          s('stop', { offset: '0', 'stop-color': '#f6d987' }),
          s('stop', { offset: '1', 'stop-color': '#a8782c' })),
        s('linearGradient', { id: id('legno'), x1: '0', y1: '0', x2: '1', y2: '0' },
          s('stop', { offset: '0', 'stop-color': '#6b4526' }),
          s('stop', { offset: '0.5', 'stop-color': '#45291a' }),
          s('stop', { offset: '1', 'stop-color': '#6b4526' })),
        s('pattern', { id: id('oro'), width: '5', height: '5', patternUnits: 'userSpaceOnUse' },
          s('rect', { width: '5', height: '5', class: 'lab-jacquard-pt-oro' }),
          s('rect', { x: '4', width: '1', height: '5', class: 'lab-jacquard-pt-oro-filo' })),
        s('pattern', { id: id('blu'), width: '5', height: '4', patternUnits: 'userSpaceOnUse' },
          s('rect', { width: '5', height: '4', class: 'lab-jacquard-pt-blu' }),
          s('rect', { y: '3', width: '5', height: '1', class: 'lab-jacquard-pt-blu-filo' }))));

      // luce da vetrina e riflesso sul vetro
      svg.append(s('rect', { x: 0, y: 0, width: g.W, height: g.H, fill: 'url(#' + id('luce') + ')' }),
        s('path', { d: 'M0 0H' + r2(g.W * 0.3) + 'L0 ' + r2(g.H * 0.55) + 'Z', class: 'lab-jacquard-riflesso' }));

      // montanti e subbio del telaio
      const legno = 'url(#' + id('legno') + ')';
      const yPalo = g.testaY + g.testaH - 4;
      svg.append(s('g', null,
        s('rect', { x: g.x0 - 22, y: yPalo, width: 8, height: g.H - yPalo - 8, rx: 2, fill: legno }),
        s('rect', { x: g.x1 + 14, y: yPalo, width: 8, height: g.H - yPalo - 8, rx: 2, fill: legno }),
        s('rect', { x: g.x0 - 28, y: g.H - 12, width: g.x1 - g.x0 + 56, height: 8, rx: 4, fill: legno })));

      // zona del tessuto (vuota finché non si tesse)
      svg.append(s('rect', { x: g.x0, y: g.yT, width: g.x1 - g.x0, height: g.yB - g.yT, class: 'lab-jacquard-area' }));

      // catena delle schede, allineata alle righe del tessuto
      const catena = s('g', null);
      const p = g.catW / COLONNE;
      const lacciY1 = rigaY(g, N - 1) + 3, lacciY2 = rigaY(g, 0) + g.rowH - 3;
      catena.append(
        s('line', { x1: g.catX + 7, y1: lacciY1, x2: g.catX + 7, y2: lacciY2, class: 'lab-jacquard-lacci' }),
        s('line', { x1: g.catX + g.catW - 7, y1: lacciY1, x2: g.catX + g.catW - 7, y2: lacciY2, class: 'lab-jacquard-lacci' }));
      const carte = [];
      for (let k = 0; k < g.righe; k++) {
        const y = rigaY(g, k) + 3, hh = g.rowH - 6;
        const gr = s('g', { class: 'lab-jacquard-carta-catena' });
        gr.append(s('rect', { x: g.catX, y: y, width: g.catW, height: hh, rx: 2, class: 'lab-jacquard-carta' }));
        const fk = [];
        for (let c = 0; c < COLONNE; c++) {
          const f = s('circle', { cx: r2(g.catX + p * (c + 0.5)), cy: r2(y + hh / 2), r: r2(Math.min(p * 0.33, hh * 0.32)), class: 'lab-jacquard-foro' });
          fk.push(f);
          gr.append(f);
        }
        catena.append(gr);
        carte.push({ g: gr, fori: fk });
      }
      svg.append(catena);

      // celle del tessuto
      const tessuto = s('g', null);
      const celle = [];
      for (let r = 0; r < g.righe; r++) {
        const fila = [];
        for (let c = 0; c < COLONNE; c++) {
          const cella = s('rect', { x: r2(g.x0 + c * g.cw), y: rigaY(g, r), width: g.cw, height: g.rowH, class: 'lab-jacquard-cella' });
          fila.push(cella);
          tessuto.append(cella);
        }
        celle.push(fila);
      }
      svg.append(tessuto);

      // ordito: sotto la navetta i fili abbassati, sopra quelli alzati
      const sotto = s('g', null);
      const sopra = s('g', null);
      const fili = [];
      for (let c = 0; c < COLONNE; c++) {
        const filo = s('line', { x1: r2(xc(g, c)), x2: r2(xc(g, c)), y1: g.occhioY + 5, y2: g.yB, class: 'lab-jacquard-filo' });
        fili.push(filo);
        sotto.append(filo);
      }
      const trama = s('line', { x1: 0, y1: 0, x2: 0, y2: 0, class: 'lab-jacquard-trama', opacity: '0' });
      const L = g.navL, A = g.navA;
      const navetta = s('g', null,
        s('path', { d: 'M' + -L + ' 0C' + r2(-L * 0.55) + ' ' + r2(-A * 1.4) + ' ' + r2(L * 0.55) + ' ' + r2(-A * 1.4) + ' ' + L + ' 0C' + r2(L * 0.55) + ' ' + r2(A * 1.4) + ' ' + r2(-L * 0.55) + ' ' + r2(A * 1.4) + ' ' + -L + ' 0Z', class: 'lab-jacquard-navetta-corpo' }),
        s('rect', { x: r2(-L * 0.36), y: r2(-A * 0.42), width: r2(L * 0.72), height: r2(A * 0.84), rx: r2(A * 0.42), class: 'lab-jacquard-navetta-spola' }));
      svg.append(sotto, trama, navetta, sopra);

      // testa Jacquard: scheda, aghi, uncini e barra che solleva
      const testa = s('g', null,
        s('rect', { x: g.x0 - 16, y: g.testaY, width: g.x1 - g.x0 + 32, height: g.testaH, rx: 10, class: 'lab-jacquard-cassa' }),
        s('line', { x1: g.x0 - 10, y1: g.testaY + g.testaH, x2: g.x1 + 10, y2: g.testaY + g.testaH, class: 'lab-jacquard-tavola' }),
        s('rect', { x: g.x0, y: g.schedaY, width: g.x1 - g.x0, height: g.schedaH, rx: 3, class: 'lab-jacquard-slot' }));
      const schedaTesta = s('g', { opacity: '0' });
      schedaTesta.append(s('rect', { x: g.x0, y: g.schedaY, width: g.x1 - g.x0, height: g.schedaH, rx: 3, class: 'lab-jacquard-carta' }));
      const foriTesta = [];
      for (let c = 0; c < COLONNE; c++) {
        schedaTesta.append(s('circle', { cx: r2(xc(g, c)), cy: g.schedaY + g.schedaH / 2, r: 1.6, class: 'lab-jacquard-segno' }));
        const f = s('circle', { cx: r2(xc(g, c)), cy: g.schedaY + g.schedaH / 2, r: g.rForo, class: 'lab-jacquard-foro' });
        foriTesta.push(f);
        schedaTesta.append(f);
      }
      testa.append(schedaTesta);
      const aghi = [];
      for (let c = 0; c < COLONNE; c++) {
        const ago = s('rect', { x: r2(xc(g, c) - 2), y: g.agoY, width: 4, height: g.agoH, rx: 2, class: 'lab-jacquard-ago' });
        aghi.push(ago);
        testa.append(ago);
      }
      const uncini = [];
      const labbro = g.largo ? 7 : 5;
      for (let c = 0; c < COLONNE; c++) {
        const x = r2(xc(g, c));
        const u = s('g', { class: 'lab-jacquard-uncino' },
          s('path', { d: 'M' + (x - 4) + ' ' + (g.uncY + 2) + 'Q' + x + ' ' + (g.uncY - 4) + ' ' + x + ' ' + (g.uncY + 4) + 'V' + (g.uncY + g.uncH) + 'M' + x + ' ' + (g.barraY - 2) + 'h' + -labbro, class: 'lab-jacquard-uncino-ferro' }),
          s('line', { x1: x, y1: g.uncY + g.uncH, x2: x, y2: g.occhioY - 5, class: 'lab-jacquard-corda' }),
          s('ellipse', { cx: x, cy: g.occhioY, rx: 2.6, ry: 4.5, class: 'lab-jacquard-occhio' }));
        uncini.push(u);
        testa.append(u);
      }
      const barraEl = s('rect', { x: g.x0 - 10, y: g.barraY, width: g.x1 - g.x0 + 20, height: 6, rx: 2, fill: 'url(#' + id('ottone') + ')', class: 'lab-jacquard-barra-ottone' });
      testa.append(barraEl);
      svg.append(testa);

      // evidenza della scheda e della riga in lavorazione, con il «ponte» che le collega
      const evidenze = s('g', null,
        s('rect', { x: g.catX - 3, y: 1, width: g.catW + 6, height: g.rowH - 2, rx: 4, class: 'lab-jacquard-evidenza' }),
        s('line', { x1: g.catX + g.catW + 5, y1: g.rowH / 2, x2: g.x0 - 5, y2: g.rowH / 2, class: 'lab-jacquard-ponte' }),
        s('rect', { x: g.x0 - 3, y: -1, width: g.x1 - g.x0 + 6, height: g.rowH + 2, rx: 4, class: 'lab-jacquard-evidenza' }));
      svg.append(evidenze);

      // etichette (decorative: lo stato è descritto a parole sotto)
      const et = s('g', { 'aria-hidden': 'true' });
      const voce = (testo, y, x2, y2) => {
        et.append(s('line', { x1: g.etX + 5, y1: y - 5, x2: x2, y2: y2, class: 'lab-jacquard-guida' }),
          s('text', { x: g.etX, y: y, 'text-anchor': 'end', class: 'lab-jacquard-etichetta' }, testo));
      };
      voce('scheda', 36, g.x0 - 2, 31);
      voce('aghi', 71, xc(g, 0) - 3, 66);
      voce('uncini', 103, xc(g, 0) - 6, 98);
      voce(g.largo ? 'barra che solleva' : 'barra', 126, g.x0 - 10, 115);
      if (g.largo) voce('ordito', 181, xc(g, 0) - 2, 178);
      et.append(s('text', { x: g.catX, y: rigaY(g, N - 1) - 8, class: 'lab-jacquard-etichetta' }, g.largo ? 'catena di schede' : 'schede'));
      svg.append(et);

      const fantasma = s('g', null);
      svg.append(fantasma);

      scena = { carte, celle, fili, sotto, sopra, trama, navetta, schedaTesta, foriTesta, aghi, uncini, barra: barraEl, evidenze, fantasma };
    }

    /* ---------- disegno dello stato (senza animazioni) ---------- */

    function impostaFori(cerchi, scheda) {
      cerchi.forEach((f, c) => { if (scheda[c]) f.removeAttribute('display'); else f.setAttribute('display', 'none'); });
    }
    function tessiCella(r, c, oro) {
      const cella = scena.celle[r][c];
      cella.setAttribute('fill', 'url(#' + ns + '-' + (oro ? 'oro' : 'blu') + ')');
      cella.classList.add('is-tessuta');
    }
    function latoNavetta() {
      return st.tessuto.length % 2;
    }

    function ridisegna() {
      const g = G;
      const N = st.schede.length;
      const fatte = st.tessuto.length;
      scena.carte.forEach((carta, k) => {
        if (k >= N) { carta.g.setAttribute('display', 'none'); return; }
        carta.g.removeAttribute('display');
        impostaFori(carta.fori, st.schede[k]);
        carta.g.classList.toggle('is-letta', k < fatte);
      });
      scena.celle.forEach((fila, r) => fila.forEach((cella, c) => {
        if (r < fatte) tessiCella(r, c, st.tessuto[r][c] === 'ordito');
        else { cella.classList.remove('is-tessuta'); cella.removeAttribute('fill'); }
      }));
      scena.fili.forEach((filo) => {
        filo.classList.remove('is-alzato');
        scena.sotto.append(filo);
        filo.setAttribute('y1', String(g.occhioY + 5));
        filo.setAttribute('y2', String(g.yB - fatte * g.rowH));
      });
      scena.aghi.forEach((ago) => { ago.removeAttribute('transform'); ago.classList.remove('is-passa', 'is-bloccato'); });
      scena.uncini.forEach((u) => { u.removeAttribute('transform'); u.classList.remove('is-alzato', 'is-spinto'); });
      scena.barra.removeAttribute('transform');
      scena.schedaTesta.setAttribute('opacity', '0');
      scena.schedaTesta.removeAttribute('transform');
      scena.fantasma.replaceChildren();
      scena.trama.setAttribute('opacity', '0');
      const kk = Math.min(st.prossima, N - 1);
      scena.navetta.setAttribute('transform', 'translate(' + g.parcheggio[latoNavetta()] + ' ' + r2(rigaY(g, kk) + g.rowH / 2) + ')');
      if (finito(st)) scena.evidenze.setAttribute('display', 'none');
      else {
        scena.evidenze.removeAttribute('display');
        scena.evidenze.setAttribute('transform', 'translate(0 ' + rigaY(g, st.prossima) + ')');
      }
      aggiornaTesti();
    }

    function aggiornaTesti() {
      const N = st.schede.length;
      const fatte = st.tessuto.length;
      const k = st.prossima;
      if (finito(st)) contatore.replaceChildren('tessuto finito · ' + N + ' righe');
      else contatore.replaceChildren('scheda ', h('b', null, String(k + 1)), ' di ' + N);
      svg.setAttribute('aria-label', 'Telaio Jacquard con il mazzo ' + nomeMazzo() + ': ' +
        (fatte === 0 ? 'nessuna riga tessuta' : fatte === 1 ? 'una riga tessuta' : fatte + ' righe tessute') + ' su ' + N + '.' +
        (finito(st) ? '' : ' Prossima scheda: ' + (k + 1) + '. ' + descrivi(st.schede[k])));

      // editor della prossima scheda
      const chiuso = finito(st);
      cartoncino.hidden = chiuso;
      aiuto.hidden = chiuso;
      fine.hidden = !chiuso;
      if (chiuso) {
        titoloEd.replaceChildren('Mazzo finito');
        fine.replaceChildren(ctx.inline('Tutte le **' + N + ' schede** sono state tessute. Premi **↺ Nuovo tessuto** per ritessere lo stesso mazzo (con le tue modifiche), oppure scegli un altro disegno in alto.'));
      } else {
        titoloEd.replaceChildren('Prossima scheda: ' + (k + 1) + ' di ' + N, h('span', null, modificate.has(k) ? 'modificata da te' : 'pronta da tessere'));
        fori.forEach((b, c) => b.setAttribute('aria-pressed', st.schede[k][c] ? 'true' : 'false'));
        griglia.setAttribute('aria-label', 'Fori della scheda ' + (k + 1));
      }
      aggiornaControlli();
    }

    function segnaDisattivo(b, no) {
      if (no) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
    }
    function disattivo(b) {
      return b.getAttribute('aria-disabled') === 'true';
    }
    function aggiornaControlli() {
      const chiuso = finito(st);
      segnaDisattivo(bRiga, occupato || chiuso);
      if (inCorsa) {
        bTutto.textContent = '⏸ Pausa';
        segnaDisattivo(bTutto, false);
      } else {
        bTutto.textContent = '▶ Tessi tutto';
        segnaDisattivo(bTutto, occupato || chiuso);
      }
      segnaDisattivo(bNuovo, !occupato && st.tessuto.length === 0);
      segnaDisattivo(bInverti, occupato || chiuso);
      fori.forEach((b) => segnaDisattivo(b, occupato || chiuso));
    }

    function fase(idFase) {
      faseAttiva = idFase;
      const i = FASI.findIndex((f) => f.id === idFase);
      fasiLi.forEach((li, j) => {
        if (j === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
        li.classList.toggle('is-fatta', i >= 0 && j < i);
      });
    }

    /* ---------- un colpo di telaio, animato ---------- */

    function anima(durata, aggiorna, easing) {
      return ctx.anima({ durata: durata, easing: easing || 'smooth', aggiorna: aggiorna });
    }

    async function unaRiga(f, rapido) {
      const g = G;
      const k = st.prossima;
      const N = st.schede.length;
      const scheda = st.schede[k].slice();
      const n = conta(scheda);
      const myGen = gen;
      const dur = (ms) => Math.max(70, Math.round(ms * f));
      const pausa = () => ctx.attendi(ctx.riduci ? Math.round(480 * f) : dur(150));
      const lato = latoNavetta();
      try {
        // 1 · la scheda arriva sotto gli aghi
        fase('scheda');
        racconta('**Scheda ' + (k + 1) + ' di ' + N + '.** La catena porta la scheda sotto gli aghi. ' + descrivi(scheda));
        impostaFori(scena.foriTesta, scheda);
        scena.schedaTesta.removeAttribute('transform');
        scena.schedaTesta.setAttribute('opacity', '0');
        const carta = scena.carte[k];
        const fant = carta.g.cloneNode(true);
        fant.setAttribute('class', 'lab-jacquard-fantasma');
        scena.fantasma.replaceChildren(fant);
        const y0 = rigaY(g, k) + 3, h0 = g.rowH - 6;
        const sx = (g.x1 - g.x0) / g.catW, sy = g.schedaH / h0;
        const tx = g.x0 - sx * g.catX, ty = g.schedaY - sy * y0;
        await anima(dur(D.lenta), (t) => {
          fant.setAttribute('transform', 'translate(' + r2(tx * t) + ' ' + r2(ty * t) + ') scale(' + r2(fra(1, sx, t)) + ' ' + r2(fra(1, sy, t)) + ')');
          const arrivo = limita((t - 0.72) / 0.28);
          fant.setAttribute('opacity', String(r2(1 - arrivo)));
          scena.schedaTesta.setAttribute('opacity', String(r2(arrivo)));
        });
        scena.schedaTesta.setAttribute('opacity', '1');
        scena.fantasma.replaceChildren();
        await pausa();

        // 2 · gli aghi tastano la scheda
        fase('aghi');
        if (!rapido) racconta('Gli aghi premono contro la scheda. Dove trovano un foro passano (**oro**); dove la scheda è piena si fermano (**rosa**) e spingono via il loro uncino.');
        await anima(dur(D.normale), (t) => {
          for (let c = 0; c < COLONNE; c++) {
            const corsa = AGO_PASSA * t;
            if (scheda[c]) scena.aghi[c].setAttribute('transform', 'translate(0 ' + r2(-corsa) + ')');
            else {
              scena.aghi[c].setAttribute('transform', 'translate(0 ' + r2(-Math.min(corsa, AGO_FERMO)) + ')');
              const spinta = limita((corsa - AGO_FERMO) / (AGO_PASSA - AGO_FERMO));
              scena.uncini[c].setAttribute('transform', 'translate(' + r2(g.spinta * spinta) + ' 0)');
            }
          }
        }, 'sharp');
        for (let c = 0; c < COLONNE; c++) {
          scena.aghi[c].classList.add(scheda[c] ? 'is-passa' : 'is-bloccato');
          if (!scheda[c]) scena.uncini[c].classList.add('is-spinto');
        }
        await pausa();

        // 3 · la barra sale con gli uncini agganciati: si apre il passo
        fase('uncini');
        if (!rapido) {
          if (n === 0) racconta('Nessun uncino è rimasto agganciato: la barra sale a vuoto e **tutti i fili d\'ordito restano giù**.');
          else if (n === COLONNE) racconta('Tutti gli uncini sono agganciati: la barra sale e **si alzano tutti i 16 fili d\'ordito**.');
          else racconta('La barra sale e trascina solo gli uncini rimasti agganciati: **' + (n === 1 ? 'si alza 1 filo' : 'si alzano ' + n + ' fili') + ' d\'ordito**, ' + (COLONNE - n) + ' restano giù. Fra le due file si apre il **passo**, il varco per la navetta.');
        }
        for (let c = 0; c < COLONNE; c++) {
          if (!scheda[c]) continue;
          scena.fili[c].classList.add('is-alzato');
          scena.sopra.append(scena.fili[c]);
          scena.uncini[c].classList.add('is-alzato');
        }
        await anima(dur(D.normale), (t) => {
          const dy = -SOLLEVA * t;
          scena.barra.setAttribute('transform', 'translate(0 ' + r2(dy) + ')');
          for (let c = 0; c < COLONNE; c++) {
            if (!scheda[c]) continue;
            scena.uncini[c].setAttribute('transform', 'translate(0 ' + r2(dy) + ')');
            scena.fili[c].setAttribute('y1', String(r2(g.occhioY + 5 + dy)));
          }
        });
        await pausa();

        // 4 · la navetta attraversa il passo e stende la trama
        fase('navetta');
        if (!rapido) racconta('La navetta attraversa il passo e stende il filo di **trama** (azzurro): passa sotto i fili alzati e sopra quelli rimasti giù.');
        const xa = g.parcheggio[lato], xb = g.parcheggio[1 - lato];
        const y = r2(rigaY(g, k) + g.rowH / 2);
        const fatte = new Array(COLONNE).fill(false);
        scena.trama.setAttribute('x1', String(xa));
        scena.trama.setAttribute('x2', String(xa));
        scena.trama.setAttribute('y1', String(y));
        scena.trama.setAttribute('y2', String(y));
        scena.trama.setAttribute('opacity', '1');
        await anima(dur(D.narrativa), (t) => {
          const x = fra(xa, xb, t);
          scena.navetta.setAttribute('transform', 'translate(' + r2(x) + ' ' + y + ')');
          scena.trama.setAttribute('x2', String(r2(x)));
          for (let c = 0; c < COLONNE; c++) {
            if (fatte[c]) continue;
            const cx = xc(g, c);
            if ((xb > xa && x >= cx) || (xb < xa && x <= cx)) { fatte[c] = true; tessiCella(k, c, scheda[c]); }
          }
        }, 'sharp');
        for (let c = 0; c < COLONNE; c++) if (!fatte[c]) tessiCella(k, c, scheda[c]);

        // 5 · il passo si chiude, la riga è fatta, la scheda esce
        st = passo(st);
        const ultima = finito(st);
        fase('riga');
        racconta('**Riga ' + (k + 1) + ' fatta.** Dove la scheda aveva un foro vedi l\'oro dell\'ordito, altrove l\'azzurro della trama.' + (ultima ? '' : ' La scheda esce e la catena prepara la prossima.'));
        const corse = scheda.map((foro) => (foro ? AGO_PASSA : AGO_FERMO));
        await anima(dur(D.normale), (t) => {
          const u = 1 - t;
          scena.barra.setAttribute('transform', 'translate(0 ' + r2(-SOLLEVA * u) + ')');
          for (let c = 0; c < COLONNE; c++) {
            scena.aghi[c].setAttribute('transform', 'translate(0 ' + r2(-corse[c] * u) + ')');
            if (scheda[c]) {
              scena.uncini[c].setAttribute('transform', 'translate(0 ' + r2(-SOLLEVA * u) + ')');
              scena.fili[c].setAttribute('y1', String(r2(g.occhioY + 5 - SOLLEVA * u)));
            } else scena.uncini[c].setAttribute('transform', 'translate(' + r2(g.spinta * u) + ' 0)');
          }
          scena.trama.setAttribute('opacity', String(r2(u)));
          scena.schedaTesta.setAttribute('opacity', String(r2(u)));
          scena.schedaTesta.setAttribute('transform', 'translate(0 ' + r2(-8 * t) + ')');
        });
        scena.fili.forEach((filo) => {
          filo.classList.remove('is-alzato');
          scena.sotto.append(filo);
          filo.setAttribute('y2', String(g.yB - st.tessuto.length * g.rowH));
        });
        scena.aghi.forEach((a) => a.classList.remove('is-passa', 'is-bloccato'));
        scena.uncini.forEach((u) => u.classList.remove('is-alzato', 'is-spinto'));
        scena.carte[k].g.classList.add('is-letta');
        aggiornaTesti();
        ctx.annuncia('Riga ' + (k + 1) + ' di ' + N + ' tessuta. ' + (n === 0 ? 'Nessun filo alzato.' : n === COLONNE ? 'Tutti i fili alzati.' : 'Fili alzati nelle colonne ' + elenco(colonneForate(scheda)) + '.'));
        if (!ultima) {
          // l'evidenza e la navetta salgono alla riga successiva
          const da = rigaY(g, k), a = rigaY(g, k + 1);
          await anima(dur(D.normale), (t) => {
            scena.evidenze.setAttribute('transform', 'translate(0 ' + r2(fra(da, a, t)) + ')');
            scena.navetta.setAttribute('transform', 'translate(' + xb + ' ' + r2(fra(da, a, t) + g.rowH / 2) + ')');
          });
        } else scena.evidenze.setAttribute('display', 'none');
      } catch (err) {
        // interrotto (pausa o nuovo formato dello schermo): la riga in corso si completa subito
        if (ctx.annullato(err) && myGen === gen) {
          if (st.prossima === k) st = passo(st);
          ridisegna();
        }
        throw err;
      }
    }

    async function esegui(tutte) {
      if (occupato || finito(st)) return;
      occupato = true;
      inCorsa = tutte;
      fermaRichiesta = false;
      const myGen = gen;
      aggiornaControlli();
      if (tutte) racconta('**Tessi tutto:** il telaio legge le schede una dopo l\'altra, sempre più in fretta, come in una bottega di Lione.');
      let i = 0;
      try {
        while (!finito(st)) {
          if (tutte && ctx.riduci) {
            const k = st.prossima;
            fase('riga');
            st = passo(st);
            ridisegna();
            racconta('**Riga ' + (k + 1) + ' di ' + st.schede.length + '.** ' + descrivi(st.schede[k]));
            await ctx.attendi(260);
          } else {
            const f = !tutte || i === 0 ? 1 : Math.max(0.34, 0.62 - 0.05 * i);
            await unaRiga(f, tutte && i > 0);
          }
          i++;
          if (!tutte || fermaRichiesta) break;
        }
      } catch (err) {
        if (!ctx.annullato(err)) console.error(err);
      }
      if (myGen !== gen) return;
      occupato = false;
      inCorsa = false;
      const inPausa = fermaRichiesta;
      fermaRichiesta = false;
      fase(null);
      if (finito(st)) concludi();
      else if (inPausa) {
        racconta('**In pausa** dopo la riga ' + st.tessuto.length + '. Premi **▶ Tessi tutto** per continuare o **Tessi una riga** per andare avanti una scheda alla volta.');
        ctx.annuncia('In pausa dopo la riga ' + st.tessuto.length + '.');
      }
      aggiornaTesti();
    }

    function clicTutto() {
      if (inCorsa) {
        fermaRichiesta = true;
        ctx.annulla();
        return;
      }
      if (!disattivo(bTutto)) esegui(true);
    }

    function concludi() {
      const N = st.schede.length;
      racconta('**Tessuto finito: ' + N + ' schede, ' + N + ' righe.** Il disegno ' + nomeMazzo() + ' non stava nel telaio ma nelle schede: cambia qualche foro e tessi di nuovo, oppure scegli un altro disegno.',
        nota('Babbage userà la stessa idea per dare istruzioni alla sua macchina analitica: cambiare le schede per cambiare il calcolo.'));
      ctx.annuncia('Tessuto finito: ' + N + ' righe.');
      ctx.completa();
    }

    /* ---------- comandi ---------- */

    function interrompi() {
      gen += 1;
      ctx.annulla();
      occupato = false;
      inCorsa = false;
      fermaRichiesta = false;
      fase(null);
    }

    function scegli(id) {
      interrompi();
      disegnoId = id;
      st = nuovoTelaio(mazzo(id));
      modificate = new Set();
      presetBtn.forEach((b) => b.setAttribute('aria-pressed', b.dataset.disegno === id ? 'true' : 'false'));
      costruisci();
      ridisegna();
      benvenuto();
      ctx.annuncia('Mazzo ' + nomeMazzo() + ': ' + st.schede.length + ' schede.');
    }

    function nuovoTessuto() {
      interrompi();
      st = nuovoTelaio(st.schede);
      ridisegna();
      racconta('**Telaio pulito.** Le schede sono le stesse' + (modificate.size ? ', comprese le tue modifiche' : '') + ': premi **Tessi una riga** per ricominciare dalla scheda 1.');
      ctx.annuncia('Telaio pulito: si riparte dalla scheda 1.');
    }

    function cambiaForo(c) {
      if (occupato || finito(st)) return;
      const k = st.prossima;
      st.schede[k][c] = !st.schede[k][c];
      modificate.add(k);
      impostaFori(scena.carte[k].fori, st.schede[k]);
      aggiornaTesti();
      const aperto = st.schede[k][c];
      racconta(aperto
        ? '**Foro ' + (c + 1) + ' aperto** nella scheda ' + (k + 1) + ': quando la tesserai l\'ago ' + (c + 1) + ' passerà, il filo ' + (c + 1) + ' si alzerà e quella cella sarà **oro**.'
        : '**Foro ' + (c + 1) + ' chiuso** nella scheda ' + (k + 1) + ': l\'ago ' + (c + 1) + ' si fermerà contro la carta e in quella cella resterà la trama **azzurra**.');
    }

    function invertiScheda() {
      if (occupato || finito(st)) return;
      const k = st.prossima;
      st.schede[k] = inverti(st.schede[k]);
      modificate.add(k);
      impostaFori(scena.carte[k].fori, st.schede[k]);
      aggiornaTesti();
      racconta('**Fori invertiti** nella scheda ' + (k + 1) + ': dove c\'era un foro ora la scheda è piena, e viceversa. Quella riga verrà al negativo. ' + descrivi(st.schede[k]));
      ctx.annuncia('Fori invertiti. ' + descrivi(st.schede[k]));
    }

    // tastiera sulla fila dei fori: una sola fermata di tabulazione, frecce per muoversi
    function scegliTab(c) {
      fori.forEach((b, i) => b.setAttribute('tabindex', i === c ? '0' : '-1'));
    }
    function tastiFori(e) {
      const i = fori.indexOf(document.activeElement);
      if (i < 0) return;
      let j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % COLONNE;
      else if (e.key === 'ArrowLeft') j = (i - 1 + COLONNE) % COLONNE;
      else if (e.key === 'ArrowDown') j = Math.min(COLONNE - 1, i + (colonneEd || COLONNE));
      else if (e.key === 'ArrowUp') j = Math.max(0, i - (colonneEd || COLONNE));
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = COLONNE - 1;
      if (j == null) return;
      e.preventDefault();
      scegliTab(j);
      fori[j].focus();
    }

    /* ---------- adattamento alla larghezza ---------- */

    function adatta() {
      const largo = (vetrina.clientWidth || 800) >= 560;
      const nuovo = largo ? 'largo' : 'stretto';
      if (nuovo !== layout) {
        if (occupato) {
          fermaRichiesta = true;
          ctx.annulla();
        }
        layout = nuovo;
        costruisci();
        ridisegna();
      }
      const r = svg.getBoundingClientRect();
      const scala = r.width && r.height ? Math.min(r.width / G.W, r.height / G.H) : 1;
      const fs = Math.max(11, Math.min(24, 13.5 / (scala || 1)));
      svg.style.setProperty('--lab-jacquard-fs', fs.toFixed(2) + 'px');
      // la fila dei fori: 16, 8 o 4 per riga, sempre con bersagli di almeno 40 px
      const stile = getComputedStyle(editor);
      const larghezza = editor.clientWidth - parseFloat(stile.paddingLeft) - parseFloat(stile.paddingRight) - 16;
      const n = larghezza >= COLONNE * 40 + 15 * 2 ? 16 : larghezza >= 8 * 40 + 7 * 2 ? 8 : 4;
      if (n !== colonneEd) {
        colonneEd = n;
        griglia.style.gridTemplateColumns = 'repeat(' + n + ', minmax(40px, 1fr))';
      }
    }

    adatta();
    ridisegna();
    benvenuto();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => adatta());
      ro.observe(vetrina);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('resize', adatta);
    }

    return {};
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('jacquard', { titolo: 'Il telaio Jacquard', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
